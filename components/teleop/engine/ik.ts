// Two-link planar arm math. Dependency-free and pure, so the SSR poster, the
// canvas game, and the node self-test all share one implementation.
// Screen coordinates: x right, y down, angles in radians.

export interface Link2 {
  bx: number;
  by: number;
  l1: number;
  l2: number;
}

export interface Joints {
  q1: number;
  q2: number;
}

/**
 * Analytic IK. Always returns the same elbow branch (elbow on the right of
 * the base-to-target line, the "elbow-up" pose for this top view), or null
 * when the target is out of reach.
 */
export function solveIK(link: Link2, tx: number, ty: number, elbowRight = true): Joints | null {
  const dx = tx - link.bx;
  const dy = ty - link.by;
  const d2 = dx * dx + dy * dy;
  const raw = (d2 - link.l1 * link.l1 - link.l2 * link.l2) / (2 * link.l1 * link.l2);
  // A target exactly on a reach circle can land a hair outside [-1, 1] in
  // floating point; treat that as on the circle, not out of reach.
  if (raw < -1 - 1e-9 || raw > 1 + 1e-9) return null;
  const c2 = Math.max(-1, Math.min(1, raw));
  // Screen y points down, so a negative elbow angle puts the elbow on the right.
  const q2 = Math.acos(c2) * (elbowRight ? -1 : 1);
  const q1 = Math.atan2(dy, dx) - Math.atan2(link.l2 * Math.sin(q2), link.l1 + link.l2 * Math.cos(q2));
  return { q1, q2 };
}

export function forwardK(link: Link2, q1: number, q2: number) {
  const ex = link.bx + link.l1 * Math.cos(q1);
  const ey = link.by + link.l1 * Math.sin(q1);
  return { ex, ey, wx: ex + link.l2 * Math.cos(q1 + q2), wy: ey + link.l2 * Math.sin(q1 + q2) };
}

/** Keeps a target inside the reachable annulus and a bounding box. */
export function clampWorkspace(
  link: Link2,
  x: number,
  y: number,
  box: { minR: number; maxR: number; x0: number; y0: number; x1: number; y1: number }
) {
  let cx = Math.min(box.x1, Math.max(box.x0, x));
  let cy = Math.min(box.y1, Math.max(box.y0, y));
  let dx = cx - link.bx;
  let dy = cy - link.by;
  let r = Math.hypot(dx, dy);
  if (r < 1e-9) {
    dx = 1;
    dy = 0;
    r = 1;
  }
  if (r > box.maxR || r < box.minR) {
    const k = (r > box.maxR ? box.maxR : box.minR) / r;
    cx = link.bx + dx * k;
    cy = link.by + dy * k;
  }
  const clamped = Math.abs(cx - x) > 1e-6 || Math.abs(cy - y) > 1e-6;
  return { x: cx, y: cy, clamped };
}

/** The angle equal to `a` (mod 2 pi) that is closest to `ref`. */
export function unwrapNear(a: number, ref: number) {
  const TAU = Math.PI * 2;
  return a + TAU * Math.round((ref - a) / TAU);
}

export interface JointLimits {
  /** Soft limits for q1 (a cable-wrap window) and q2 (never straight, never folded flat). */
  q1: [number, number];
  q2: [number, number];
  /** Velocity clamps, rad/s. */
  v1: number;
  v2: number;
}

export const LIMITS: JointLimits = {
  q1: [-Math.PI * 2, Math.PI * 2],
  q2: [-2.8, -0.08],
  v1: 3.2,
  v2: 4.4,
};

/**
 * The angle equal to `a` (mod 2 pi) inside [lo, hi] that is closest to `a`,
 * or `a` clamped to the window when no equivalent fits (window under 2 pi).
 */
function intoWindow(a: number, lo: number, hi: number) {
  const TAU = Math.PI * 2;
  if (a > hi) a -= TAU * Math.ceil((a - hi) / TAU);
  else if (a < lo) a += TAU * Math.ceil((lo - a) / TAU);
  return Math.min(hi, Math.max(lo, a));
}

/**
 * Desired joint angles for a target: IK, unwrapped next to the current
 * pose, then fitted to the soft limits. Past the q1 cable-wrap window the
 * arm unwinds the long way round to the same heading (a real cell cannot
 * spin through its cable wrap), instead of parking at the limit short of a
 * reachable target. `limited` is true while a limit is shaping the pose.
 */
export function desiredJoints(link: Link2, tx: number, ty: number, current: Joints, limits = LIMITS) {
  const ik = solveIK(link, tx, ty, true);
  if (!ik) return { q1: current.q1, q2: current.q2, limited: true };
  const q1u = unwrapNear(ik.q1, current.q1);
  const q1 = intoWindow(q1u, limits.q1[0], limits.q1[1]);
  const q2 = Math.min(limits.q2[1], Math.max(limits.q2[0], ik.q2));
  return { q1, q2, limited: q1 !== q1u || q2 !== ik.q2 };
}

/**
 * One fixed step of a joint servo with a velocity clamp. `springy` uses a
 * slightly underdamped second-order response (a little settle wobble);
 * otherwise a first-order response that never overshoots (reduced motion).
 * Returns [position, velocity].
 */
export function stepJoint(q: number, v: number, qd: number, dt: number, vmax: number, springy: boolean): [number, number] {
  let nv: number;
  if (springy) {
    const kp = 170;
    const kd = 2 * 0.72 * Math.sqrt(kp);
    nv = v + (kp * (qd - q) - kd * v) * dt;
  } else {
    nv = 14 * (qd - q);
  }
  nv = Math.max(-vmax, Math.min(vmax, nv));
  let nq = q + nv * dt;
  // First-order mode must land exactly, never cross the setpoint.
  if (!springy && (qd - q) * (qd - nq) < 0) {
    nq = qd;
    nv = 0;
  }
  return [nq, nv];
}
