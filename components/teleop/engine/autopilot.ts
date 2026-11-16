// AUTO DEMO: a scripted operator for anyone who cannot use the controls.
// It only moves the operator target and toggles the grip, so its commands go
// through the same latency link, servo limits, and physics as a person's.
import { BIN_W, BIN_Y, CELL_H, CELL_W, LINK, binX } from "../../../lib/teleop/scene";
import { PARK, type Arm } from "./arm";
import { BELT_STOP, BLOCK_H, type Block, type World } from "./blocks";
import type { Command } from "./episodes";
import { clampWorkspace } from "./ik";

export const WORKSPACE = { minR: 26, maxR: 126, x0: 4, y0: 16, x1: CELL_W - 4, y1: CELL_H - 6 };
export const SPEED = 110;
export const AUTO_SPEED = 140;
export const NUDGE = 8;

export const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);

export function moveToward(p: { x: number; y: number }, goal: { x: number; y: number }, step: number) {
  const d = dist(p, goal);
  if (d <= step) {
    p.x = goal.x;
    p.y = goal.y;
  } else {
    p.x += ((goal.x - p.x) / d) * step;
    p.y += ((goal.y - p.y) / d) * step;
  }
}

/** Where the scripted demo drops a block for bin i: the bin's middle, pulled into reach. */
export function binDrop(i: number) {
  const c = clampWorkspace(LINK, binX(i) + BIN_W / 2, BIN_Y + 9, { ...WORKSPACE, maxR: WORKSPACE.maxR - 3 });
  return { x: c.x, y: c.y };
}

/** AUTO DEMO: a scripted operator that sorts a few blocks through the same pipeline. */
export class AutoPilot {
  phase: "pick" | "reach" | "close" | "carry" | "open" = "pick";
  block: Block | null = null;
  goal = { x: PARK.x, y: PARK.y };
  timer = 0;
  waited = 0;
  count = 0;
  constructor(readonly sorts = 3) {}

  private choose(world: World): Block | null {
    const reachable = (b: Block) => {
      const c = { x: b.x + b.w / 2, y: b.y + BLOCK_H / 2 };
      const r = dist(c, { x: LINK.bx, y: LINK.by });
      return r > WORKSPACE.minR + 2 && r < WORKSPACE.maxR - 4;
    };
    // Resting blocks only: the one against the belt stop, or anything on the floor.
    const atStop = world.blocks.find((b) => b.state === "belt" && b.x + b.w >= BELT_STOP - 0.5 && reachable(b));
    if (atStop) return atStop;
    return world.blocks.find((b) => b.state === "free" && b.z === 0 && reachable(b)) ?? null;
  }

  /** Advances the script; returns true when the demo is over. */
  step(dt: number, op: Command, world: World, arm: Arm, latencyMs: number, pending: number): boolean {
    const settledAt = (goal: { x: number; y: number }) => dist(arm.wrist, goal) < 2.5 && dist(op, goal) < 0.01 && pending === 0 && !arm.moving;
    const delay = latencyMs / 1000;
    switch (this.phase) {
      case "pick": {
        const b = this.choose(world);
        if (!b) {
          this.waited += dt;
          return this.waited > 10 || world.remaining === 0;
        }
        this.block = b;
        this.waited = 0;
        this.phase = "reach";
        return false;
      }
      case "reach": {
        const b = this.block;
        if (!b || (b.state !== "belt" && b.state !== "free")) {
          this.phase = "pick";
          return false;
        }
        this.goal = { x: b.x + b.w / 2, y: b.y + BLOCK_H / 2 };
        moveToward(op, this.goal, AUTO_SPEED * dt);
        if (settledAt(this.goal)) {
          op.grip = true;
          this.phase = "close";
          this.timer = 0;
        }
        return false;
      }
      case "close":
        this.timer += dt;
        if (this.timer > delay + 0.25) {
          if (this.block && arm.held === this.block) {
            this.goal = binDrop(this.block.entry.groupIndex);
            this.phase = "carry";
          } else {
            op.grip = false;
            this.phase = "pick";
          }
        }
        return false;
      case "carry":
        moveToward(op, this.goal, AUTO_SPEED * dt);
        if (settledAt(this.goal)) {
          op.grip = false;
          this.phase = "open";
          this.timer = 0;
        }
        return false;
      case "open":
        this.timer += dt;
        if (this.timer > delay + 0.45) {
          this.count++;
          if (this.count >= this.sorts) return true;
          this.phase = "pick";
        }
        return false;
    }
  }
}

