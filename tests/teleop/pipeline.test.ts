// The headless cell: the same pipeline the engine runs every 60 Hz step
// (operator command -> CommandBuffer latency link -> driveArm servo and
// gripper -> World physics), without a canvas.
import { describe, expect, it } from "vitest";
import portfolio from "../../data/portfolio.json";
import { Arm, PARK, driveArm } from "../../components/teleop/engine/arm";
import { AutoPilot, binDrop } from "../../components/teleop/engine/autopilot";
import { BELT_STOP, BLOCK_H, World, binRect, buildCatalog, type WorldEvent } from "../../components/teleop/engine/blocks";
import { Player, Recorder, type Command } from "../../components/teleop/engine/episodes";
import { CommandBuffer } from "../../components/teleop/engine/latency";
import { LINK } from "../../lib/teleop/scene";
import { seeded } from "../helpers/rng";

const DT = 1 / 60;
const MS = 1000 / 60;

function cell(seed: number) {
  const world = new World(buildCatalog(), seeded(seed));
  const arm = new Arm(PARK);
  const buffer = new CommandBuffer<Command>(256);
  const op: Command = { x: PARK.x, y: PARK.y, grip: false };
  buffer.reset({ ...op });
  let pushed = { ...op };
  let step = 0;
  const events: WorldEvent[] = [];
  /** One engine step: push a changed command, sample it through the link, drive the arm, step the world. */
  const tick = (latencyMs: number, reduced = false, parked = false) => {
    const now = step++ * MS;
    if (op.x !== pushed.x || op.y !== pushed.y || op.grip !== pushed.grip) {
      pushed = { ...op };
      buffer.push(now, pushed);
    }
    const cmd = buffer.sample(now, latencyMs) ?? op;
    driveArm(arm, world, cmd, DT, { springy: !reduced, reduced, parked });
    const evs = world.step(DT, reduced);
    events.push(...evs);
    return evs;
  };
  return { world, arm, buffer, op, tick, events, now: () => step * MS };
}

describe("auto demo through the full pipeline", () => {
  it.each([
    [0, false],
    [60, false],
    [300, false],
    [120, true],
  ])("sorts 3 blocks with no misroutes at %i ms latency (reduced motion: %s)", (latency, reduced) => {
    const c = cell(0x5eed);
    const pilot = new AutoPilot(3);
    let done = false;
    for (let i = 0; i < 60 * 90 && !done; i++) {
      done = pilot.step(DT, c.op, c.world, c.arm, latency, c.buffer.pending);
      if (!done) c.tick(latency, reduced);
    }
    expect(done).toBe(true);
    expect(c.events.filter((e) => e.type === "sorted")).toHaveLength(3);
    expect(c.events.filter((e) => e.type === "misroute")).toHaveLength(0);
  });
});

describe("manual teleop", () => {
  it("picks from the belt, misroutes into a wrong bin, re-picks from the floor, and sorts", () => {
    const c = cell(0x5eed);
    const target = c.world.blocks.find((b) => b.state === "belt" && b.x + b.w >= BELT_STOP - 0.5)!;
    const run = (cmd: Command, seconds: number) => {
      Object.assign(c.op, cmd);
      const evs: WorldEvent[] = [];
      for (let i = 0; i < seconds * 60; i++) evs.push(...c.tick(0));
      return evs;
    };
    const over = () => ({ x: target.x + target.w / 2, y: target.y + BLOCK_H / 2 });
    run({ ...over(), grip: false }, 2);
    run({ ...over(), grip: true }, 0.5);
    expect(c.arm.held).toBe(target);

    const wrong = binDrop((target.entry.groupIndex + 2) % portfolio.skills.length);
    run({ ...wrong, grip: true }, 2.5);
    const miss = run({ ...wrong, grip: false }, 2);
    expect(miss.some((e) => e.type === "misroute")).toBe(true);
    expect(target.state).toBe("free");

    const back = over();
    run({ ...back, grip: false }, 2.5);
    run({ ...back, grip: true }, 0.5);
    expect(c.arm.held).toBe(target);
    const right = binDrop(target.entry.groupIndex);
    run({ ...right, grip: true }, 2.5);
    const hit = run({ ...right, grip: false }, 2);
    expect(hit.some((e) => e.type === "sorted" && e.entry.skill === target.entry.skill)).toBe(true);
  });

  it("every bin has a reachable drop point inside it", () => {
    for (let i = 0; i < portfolio.skills.length; i++) {
      const d = binDrop(i);
      const r = binRect(i);
      expect(d.x).toBeGreaterThan(r.x);
      expect(d.x).toBeLessThan(r.x + r.w);
      expect(Math.hypot(d.x - LINK.bx, d.y - LINK.by)).toBeLessThanOrEqual(LINK.l1 + LINK.l2);
    }
  });

  it("the commanded wrist position lags the operator by the link latency", () => {
    for (const latency of [0, 120, 300]) {
      const c = cell(1);
      for (let i = 0; i < 120; i++) c.tick(latency); // settle at PARK
      const start = c.arm.wrist;
      c.op.x -= 30;
      let firstMove = -1;
      for (let i = 0; i < 60 && firstMove < 0; i++) {
        c.tick(latency);
        if (Math.hypot(c.arm.wrist.x - start.x, c.arm.wrist.y - start.y) > 1e-6) firstMove = i;
      }
      // Issued on step 0, delivered on the first step at least `latency` ms
      // later (one extra frame allowed for float rounding of the 60 Hz clock).
      const due = Math.max(0, Math.ceil(latency / MS - 1e-9));
      expect(firstMove).toBeGreaterThanOrEqual(due);
      expect(firstMove).toBeLessThanOrEqual(due + 1);
    }
  });
});

describe("watchdog park", () => {
  it("a parked arm returns to PARK and ignores grip commands", () => {
    const c = cell(2);
    Object.assign(c.op, { x: 120, y: 60, grip: false });
    for (let i = 0; i < 180; i++) c.tick(0);
    expect(Math.hypot(c.arm.wrist.x - 120, c.arm.wrist.y - 60)).toBeLessThan(0.5);
    c.op.grip = true;
    for (let i = 0; i < 240; i++) c.tick(0, false, true);
    expect(Math.hypot(c.arm.wrist.x - PARK.x, c.arm.wrist.y - PARK.y)).toBeLessThan(0.5);
    expect(c.arm.closed).toBe(false);
  });
});

describe("episode record and replay", () => {
  it("replaying an episode is deterministic: same commands, same arm path, same world events", () => {
    // Record an operator path at 60 Hz.
    const rec = new Recorder();
    rec.start(0);
    const target = new World(buildCatalog(), seeded(3)).blocks.find((b) => b.state === "belt" && b.x + b.w >= BELT_STOP - 0.5)!;
    const pick = { x: target.x + target.w / 2, y: target.y + BLOCK_H / 2 };
    const drop = binDrop(target.entry.groupIndex);
    const opAt = (t: number): Command => {
      if (t < 2000) return { x: PARK.x + ((pick.x - PARK.x) * t) / 2000, y: PARK.y + ((pick.y - PARK.y) * t) / 2000, grip: false };
      if (t < 2600) return { ...pick, grip: t > 2200 };
      if (t < 5000) return { x: pick.x + ((drop.x - pick.x) * (t - 2600)) / 2400, y: pick.y + ((drop.y - pick.y) * (t - 2600)) / 2400, grip: true };
      return { ...drop, grip: false };
    };
    for (let t = 0; t <= 7000; t += MS) rec.sample(t, opAt(t));
    const episode = rec.stop(7000, 1)!;
    expect(episode).not.toBeNull();

    const replay = (latency: number) => {
      const c = cell(3);
      const p = new Player(episode);
      p.start(0);
      const wrist: [number, number][] = [];
      for (;;) {
        const cmd = p.next(c.now());
        if (!cmd) break;
        Object.assign(c.op, cmd);
        c.tick(latency);
        wrist.push([c.arm.wrist.x, c.arm.wrist.y]);
      }
      for (let i = 0; i < 120; i++) c.tick(latency);
      return { wrist, events: c.events.map((e) => `${e.type}:${e.entry.skill}`), sorted: c.world.sortedCount };
    };
    const a = replay(60);
    const b = replay(60);
    expect(a.wrist.length).toBeGreaterThan(400);
    expect(b).toEqual(a);
    expect(a.events).toContain(`sorted:${target.entry.skill}`);
    expect(a.sorted).toBe(1);
  });
});
