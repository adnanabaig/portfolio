import { describe, expect, it } from "vitest";
import { LIMITS, clampWorkspace, desiredJoints, forwardK, solveIK, stepJoint, unwrapNear } from "../../components/teleop/engine/ik";
import { LINK } from "../../lib/teleop/scene";
import { WORKSPACE } from "../../components/teleop/engine/autopilot";
import { seeded } from "../helpers/rng";

const REACH = LINK.l1 + LINK.l2;
const at = (r: number, a: number) => ({ x: LINK.bx + Math.cos(a) * r, y: LINK.by + Math.sin(a) * r });
const wristErr = (q: { q1: number; q2: number }, x: number, y: number) => {
  const f = forwardK(LINK, q.q1, q.q2);
  return Math.hypot(f.wx - x, f.wy - y);
};

describe("solveIK", () => {
  it("round-trips 500 random reachable targets through forward kinematics", () => {
    const rand = seeded(1);
    let worst = 0;
    for (let i = 0; i < 500; i++) {
      const p = at(1 + rand() * (REACH - 2), rand() * Math.PI * 2);
      const q = solveIK(LINK, p.x, p.y);
      expect(q).not.toBeNull();
      worst = Math.max(worst, wristErr(q!, p.x, p.y));
    }
    expect(worst).toBeLessThan(1e-9);
  });

  it("always picks the elbow-right branch (negative q2 in screen coordinates)", () => {
    const rand = seeded(2);
    for (let i = 0; i < 100; i++) {
      const p = at(10 + rand() * (REACH - 20), rand() * Math.PI * 2);
      expect(solveIK(LINK, p.x, p.y)!.q2).toBeLessThan(0);
      expect(solveIK(LINK, p.x, p.y, false)!.q2).toBeGreaterThan(0);
    }
  });

  it("both elbow branches reach the same wrist point", () => {
    const p = at(90, 0.7);
    expect(wristErr(solveIK(LINK, p.x, p.y, true)!, p.x, p.y)).toBeLessThan(1e-9);
    expect(wristErr(solveIK(LINK, p.x, p.y, false)!, p.x, p.y)).toBeLessThan(1e-9);
  });

  it("returns null past full reach and solves the fully stretched pose at the edge", () => {
    expect(solveIK(LINK, LINK.bx + REACH + 0.01, LINK.by)).toBeNull();
    expect(solveIK(LINK, LINK.bx, LINK.by - REACH - 5)).toBeNull();
    expect(solveIK(LINK, LINK.bx + 500, LINK.by + 500)).toBeNull();
    const edge = solveIK(LINK, LINK.bx + REACH, LINK.by);
    expect(edge).not.toBeNull();
    expect(Math.abs(edge!.q2)).toBeLessThan(1e-6);
  });

  it("rejects inner targets when the links differ in length", () => {
    const uneven = { bx: 0, by: 0, l1: 60, l2: 40 };
    expect(solveIK(uneven, 19, 0)).toBeNull();
    expect(solveIK(uneven, 21, 0)).not.toBeNull();
  });
});

describe("desiredJoints (IK + unwrap + soft limits)", () => {
  it("tracks reachable targets inside the workspace from any starting q1", () => {
    const rand = seeded(3);
    for (let i = 0; i < 200; i++) {
      const p = at(WORKSPACE.minR + rand() * (WORKSPACE.maxR - WORKSPACE.minR), rand() * Math.PI * 2);
      const d = desiredJoints(LINK, p.x, p.y, { q1: (rand() - 0.5) * 2 * Math.PI, q2: -1 });
      expect(d.limited).toBe(false);
      expect(wristErr(d, p.x, p.y)).toBeLessThan(1e-9);
    }
  });

  it("unwraps q1 next to the current pose instead of spinning the long way round", () => {
    const p = at(100, -2);
    const fromZero = desiredJoints(LINK, p.x, p.y, { q1: 0, q2: -1 });
    const fromWound = desiredJoints(LINK, p.x, p.y, { q1: 4, q2: -1 });
    expect(fromWound.limited).toBe(false);
    expect(Math.abs(fromWound.q1 - 4)).toBeLessThanOrEqual(Math.PI);
    expect(fromWound.q1 - fromZero.q1).toBeCloseTo(2 * Math.PI, 9);
    expect(wristErr(fromWound, p.x, p.y)).toBeLessThan(1e-9);
  });

  it("clamps q1 at the cable-wrap window and reports LIMIT", () => {
    const d = desiredJoints(LINK, LINK.bx + 98.5, LINK.by - 17.4, { q1: 2 * Math.PI - 0.01, q2: -1 });
    expect(d.limited).toBe(true);
    expect(d.q1).toBeLessThanOrEqual(LIMITS.q1[1]);
  });

  it("never lets the elbow go straight: a full-stretch target clamps q2 and reports LIMIT", () => {
    const d = desiredJoints(LINK, LINK.bx + REACH - 0.01, LINK.by, { q1: 0, q2: -1 });
    expect(d.limited).toBe(true);
    expect(d.q2).toBe(LIMITS.q2[1]);
  });

  it("holds the current pose for an unreachable target", () => {
    const d = desiredJoints(LINK, LINK.bx + 400, LINK.by, { q1: 0.3, q2: -1.2 });
    expect(d).toEqual({ q1: 0.3, q2: -1.2, limited: true });
  });
});

describe("clampWorkspace", () => {
  const box = { minR: 26, maxR: 126, x0: 0, y0: 0, x1: 320, y1: 180 };
  it("pulls far targets onto the outer edge along the same ray", () => {
    const c = clampWorkspace(LINK, LINK.bx + 300, LINK.by, box);
    expect(c.clamped).toBe(true);
    expect(Math.hypot(c.x - LINK.bx, c.y - LINK.by)).toBeCloseTo(126, 9);
    expect(c.y).toBeCloseTo(LINK.by, 9);
  });
  it("pushes targets out of the dead zone around the base", () => {
    const c = clampWorkspace(LINK, LINK.bx + 5, LINK.by, box);
    expect(c.clamped).toBe(true);
    expect(Math.hypot(c.x - LINK.bx, c.y - LINK.by)).toBeCloseTo(26, 9);
    const centre = clampWorkspace(LINK, LINK.bx, LINK.by, box);
    expect(Math.hypot(centre.x - LINK.bx, centre.y - LINK.by)).toBeCloseTo(26, 9);
  });
  it("leaves targets inside the annulus and box alone", () => {
    expect(clampWorkspace(LINK, LINK.bx + 60, LINK.by + 20, box)).toEqual({ x: LINK.bx + 60, y: LINK.by + 20, clamped: false });
  });
  it("keeps every clamped point reachable by IK", () => {
    const rand = seeded(4);
    for (let i = 0; i < 200; i++) {
      const c = clampWorkspace(LINK, rand() * 400 - 40, rand() * 260 - 40, WORKSPACE);
      expect(solveIK(LINK, c.x, c.y)).not.toBeNull();
      expect(c.x).toBeGreaterThanOrEqual(WORKSPACE.x0 - 1e-9);
      expect(c.x).toBeLessThanOrEqual(WORKSPACE.x1 + 1e-9);
    }
  });
});

describe("unwrapNear and stepJoint", () => {
  it("unwrapNear returns the equivalent angle closest to the reference", () => {
    expect(unwrapNear(0.1, 2 * Math.PI)).toBeCloseTo(2 * Math.PI + 0.1, 12);
    expect(unwrapNear(3, -3)).toBeCloseTo(3 - 2 * Math.PI, 12);
  });
  it("first-order servo lands exactly on the setpoint without overshoot", () => {
    let q = 0;
    let v = 0;
    for (let i = 0; i < 600; i++) {
      [q, v] = stepJoint(q, v, 1, 1 / 60, LIMITS.v1, false);
      expect(q).toBeLessThanOrEqual(1);
    }
    expect(q).toBeCloseTo(1, 6);
  });
  it("respects the velocity clamp in both modes", () => {
    for (const springy of [true, false]) {
      const [, v] = stepJoint(0, 0, 100, 1 / 60, LIMITS.v2, springy);
      expect(Math.abs(v)).toBeLessThanOrEqual(LIMITS.v2);
    }
  });
  it("springy servo settles within 2 s", () => {
    let q = 0;
    let v = 0;
    for (let i = 0; i < 120; i++) [q, v] = stepJoint(q, v, 1, 1 / 60, LIMITS.v1, true);
    expect(Math.abs(q - 1)).toBeLessThan(1e-3);
  });
});
