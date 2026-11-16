// The arm: joint state, servo stepping, and the gripper.
import { LINK } from "../../../lib/teleop/scene";
import { LIMITS, desiredJoints, forwardK, solveIK, stepJoint } from "./ik";
import { BLOCK_H, CARRY_Z, type Block, type World } from "./blocks";

/** Park pose: folded up and to the right of the pedestal, clear of the belt and bins. */
export const PARK = { x: 196, y: 56 };

export class Arm {
  q1: number;
  q2: number;
  v1 = 0;
  v2 = 0;
  q1d: number;
  q2d: number;
  closed = false;
  held: Block | null = null;
  /** True while a soft joint limit is clipping the commanded pose. */
  limited = false;

  constructor(start = PARK) {
    const ik = solveIK(LINK, start.x, start.y) ?? { q1: -1, q2: -1.5 };
    this.q1 = this.q1d = ik.q1;
    this.q2 = this.q2d = ik.q2;
  }

  /** One fixed step toward a Cartesian target. */
  update(dt: number, tx: number, ty: number, springy: boolean) {
    const d = desiredJoints(LINK, tx, ty, { q1: this.q1, q2: this.q2 });
    this.q1d = d.q1;
    this.q2d = d.q2;
    this.limited = d.limited;
    [this.q1, this.v1] = stepJoint(this.q1, this.v1, d.q1, dt, LIMITS.v1, springy);
    [this.q2, this.v2] = stepJoint(this.q2, this.v2, d.q2, dt, LIMITS.v2, springy);
  }

  /** Holds position (E-STOP): velocities drop to zero, the setpoint becomes the pose. */
  freeze() {
    this.v1 = this.v2 = 0;
    this.q1d = this.q1;
    this.q2d = this.q2;
  }

  get wrist() {
    const f = forwardK(LINK, this.q1, this.q2);
    return { x: f.wx, y: f.wy };
  }

  get moving() {
    return Math.abs(this.v1) + Math.abs(this.v2) > 0.03;
  }

  get settled() {
    return (
      Math.abs(this.v1) < 1e-3 &&
      Math.abs(this.v2) < 1e-3 &&
      Math.abs(this.q1d - this.q1) < 1e-3 &&
      Math.abs(this.q2d - this.q2) < 1e-3
    );
  }
}

/**
 * One step of the arm against the world for a delivered command: servo toward
 * the target, actuate the gripper on a change (picking the topmost block
 * under the fingers, or releasing the payload to fall), and carry the payload.
 * Shared by the engine and the node self-test. Returns the block just gripped.
 */
export function driveArm(
  arm: Arm,
  world: World,
  cmd: { x: number; y: number; grip: boolean },
  dt: number,
  opts: { springy: boolean; reduced: boolean; parked: boolean }
): Block | null {
  let gripped: Block | null = null;
  const target = opts.parked ? PARK : cmd;
  arm.update(dt, target.x, target.y, opts.springy);
  if (!opts.parked && cmd.grip !== arm.closed) {
    arm.closed = cmd.grip;
    if (cmd.grip && !arm.held) {
      const w = arm.wrist;
      const b = world.pickAt(w.x, w.y);
      if (b) {
        world.hold(b);
        arm.held = b;
        gripped = b;
      }
    } else if (!cmd.grip && arm.held) {
      world.release(arm.held);
      arm.held = null;
    }
  }
  if (arm.held) {
    const w = arm.wrist;
    const b = arm.held;
    b.x = w.x - b.w / 2;
    b.y = w.y - BLOCK_H / 2;
    b.z = opts.reduced ? CARRY_Z : b.z + (CARRY_Z - b.z) * Math.min(1, dt * 14);
    if (Math.abs(CARRY_Z - b.z) < 0.05) b.z = CARRY_Z;
  }
  return gripped;
}
