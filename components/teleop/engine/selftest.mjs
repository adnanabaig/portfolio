// Engine self-test: `npm run test:teleop`.
// Compiles the engine's pure modules with the repo's TypeScript into a temp
// dir (CommonJS), then exercises them in plain node: IK round-trips, the
// latency ring buffer, the safety state machine (latched stop, deadman,
// watchdog), skill-to-bin mapping, and a sort/misroute through the world.
import fs from "fs";
import os from "os";
import path from "path";
import { execFileSync } from "child_process";
import { createRequire } from "module";
import { fileURLToPath } from "url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../../..");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "teleop-selftest-"));
const tsc = path.join(root, "node_modules/.bin/tsc");
const entries = ["ik.ts", "latency.ts", "safety.ts", "blocks.ts", "episodes.ts", "arm.ts", "autopilot.ts"].map((f) => path.join(here, f));

let failed = 0;
const ok = (cond, label) => {
  console.log(`  ${cond ? "ok  " : "FAIL"} ${label}`);
  if (!cond) failed++;
};

try {
  execFileSync(
    tsc,
    [
      "--outDir", tmp,
      "--rootDir", root,
      "--module", "commonjs",
      "--target", "es2020",
      "--moduleResolution", "node",
      "--resolveJsonModule",
      "--esModuleInterop",
      "--skipLibCheck",
      "--strict",
      "--types", "node",
      ...entries,
    ],
    { stdio: "inherit" }
  );
  const req = createRequire(path.join(tmp, "index.js"));
  const mod = (f) => req(path.join(tmp, path.relative(root, path.join(here, f))).replace(/\.ts$/, ".js"));
  const ik = mod("ik.ts");
  const latency = mod("latency.ts");
  const safety = mod("safety.ts");
  const blocks = mod("blocks.ts");
  const episodes = mod("episodes.ts");
  const armMod = mod("arm.ts");
  const autopilot = mod("autopilot.ts");
  const scene = req(path.join(tmp, "lib/teleop/scene.js"));
  const data = JSON.parse(fs.readFileSync(path.join(root, "data/portfolio.json"), "utf8"));

  // Deterministic PRNG so the run is reproducible.
  let seed = 0x5eed;
  const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);

  console.log("IK");
  {
    const L = scene.LINK;
    let worst = 0;
    let worstLimited = 0;
    for (let i = 0; i < 100; i++) {
      const r = 26 + rand() * (126 - 26);
      const a = rand() * Math.PI * 2;
      const tx = L.bx + Math.cos(a) * r;
      const ty = L.by + Math.sin(a) * r;
      const q = ik.solveIK(L, tx, ty);
      const f = ik.forwardK(L, q.q1, q.q2);
      worst = Math.max(worst, Math.hypot(f.wx - tx, f.wy - ty));
      // Through the servo path too: unwrapped next to a random pose, soft limits applied.
      const d = ik.desiredJoints(L, tx, ty, { q1: (rand() - 0.5) * 2 * Math.PI, q2: -1 });
      const g = ik.forwardK(L, d.q1, d.q2);
      worstLimited = Math.max(worstLimited, Math.hypot(g.wx - tx, g.wy - ty));
    }
    ok(worst < 1, `100 random reachable targets round-trip, worst error ${worst.toExponential(2)} px (< 1)`);
    ok(worstLimited < 1, `same targets via desiredJoints (unwrap + soft limits), worst ${worstLimited.toExponential(2)} px`);
    ok(ik.solveIK(L, L.bx + 200, L.by) === null, "unreachable target returns null");
    const wrapped = ik.desiredJoints(L, L.bx + 98.5, L.by - 17.4, { q1: 2 * Math.PI - 0.01, q2: -1 });
    ok(wrapped.limited && wrapped.q1 <= ik.LIMITS.q1[1], "past the cable-wrap window, q1 clamps and reports LIMIT");
    const c = ik.clampWorkspace(L, L.bx + 300, L.by, { minR: 26, maxR: 126, x0: 0, y0: 0, x1: 320, y1: 180 });
    ok(c.clamped && Math.abs(Math.hypot(c.x - L.bx, c.y - L.by) - 126) < 1e-9, "out-of-reach target clamps to the workspace edge");
  }

  console.log("Latency buffer");
  {
    const b = new latency.CommandBuffer(8);
    b.reset("start");
    for (let t = 0; t <= 300; t += 50) b.push(t, `cmd@${t}`);
    ok(b.sample(100, 120) === "start", "nothing older than 120 ms at t=100: holds the last delivered command");
    ok(b.sample(220, 120) === "cmd@100", "at t=220 with 120 ms delay delivers the command issued at t=100");
    ok(b.sample(1000, 120) === "cmd@300" && b.pending === 0, "eventually drains to the newest command");
    const full = new latency.CommandBuffer(4);
    for (let t = 0; t < 10; t++) full.push(t, t);
    ok(full.pending === 4 && full.sample(100, 0) === 9, "full ring drops oldest, keeps newest");
  }

  console.log("Safety FSM");
  {
    const { transition, WATCHDOG_MS } = safety;
    const others = [
      { type: "INPUT" },
      { type: "ESTOP", source: "cell" },
      { type: "ESTOP", source: "global" },
      { type: "DEADMAN_RELEASE", moving: true },
      { type: "DEADMAN_RELEASE", moving: false },
      { type: "WATCHDOG", idleMs: 1e9 },
      { type: "AUTO_START" },
      { type: "AUTO_END" },
      { type: "REPLAY_START" },
      { type: "REPLAY_END" },
      { type: "CLEAR", globalStop: true },
    ];
    ok(others.every((ev) => transition("STOPPED", ev).mode === "STOPPED"), `STOPPED holds against all ${others.length} non-CLEAR events (and CLEAR during a site e-stop)`);
    ok(transition("STOPPED", { type: "CLEAR", globalStop: false }).mode === "TELEOP", "STOPPED leaves only via CLEAR, to TELEOP");
    for (const m of ["TELEOP", "AUTO", "PARKED", "REPLAY"]) {
      ok(transition(m, { type: "ESTOP", source: "cell" }).mode === "STOPPED", `ESTOP from ${m} latches STOPPED`);
    }
    ok(transition("TELEOP", { type: "DEADMAN_RELEASE", moving: true }).mode === "STOPPED", "deadman release while moving yields STOPPED");
    ok(transition("TELEOP", { type: "DEADMAN_RELEASE", moving: false }).mode === "TELEOP", "deadman release at rest stays TELEOP");

    // Watchdog: 60 Hz steps with no operator input.
    let mode = "TELEOP";
    let idle = 0;
    let parkedAt = null;
    let log = "";
    for (let step = 0; step < 60 * 25; step++) {
      idle += 1000 / 60;
      const t = transition(mode, { type: "WATCHDOG", idleMs: idle });
      if (t.mode === "PARKED" && mode !== "PARKED") {
        parkedAt = idle;
        log = t.log;
      }
      mode = t.mode;
    }
    ok(parkedAt !== null && parkedAt >= WATCHDOG_MS && parkedAt < WATCHDOG_MS + 20, `watchdog parks the arm after ${(parkedAt / 1000).toFixed(2)} s simulated idle`);
    ok(log === "watchdog: no operator input, arm parked", `watchdog log line: "${log}"`);
    ok(transition("PARKED", { type: "INPUT" }).mode === "TELEOP", "operator input resumes TELEOP from PARKED");
  }

  console.log("Skill-to-bin mapping");
  {
    const catalog = blocks.buildCatalog();
    const skills = data.skills.flatMap((g) => g.items);
    ok(catalog.length === skills.length, `catalog has ${catalog.length} blocks for ${skills.length} skills`);
    ok(new Set(catalog.map((c) => c.skill)).size === skills.length, "each skill appears exactly once");
    ok(
      catalog.every((c) => blocks.binForSkill(c.skill) === c.groupIndex && data.skills[c.groupIndex].group === c.group),
      "every block maps to its own group's bin, with the exact group name"
    );
    ok(catalog.every((c) => skills.includes(c.skill)), "every block's skill string is verbatim from portfolio.json");
  }

  console.log("World: sort and misroute");
  {
    const w = new blocks.World(blocks.buildCatalog(), rand);
    const drop = (b, bin) => {
      const r = blocks.binRect(bin);
      w.hold(b);
      b.x = r.x + r.w / 2 - b.w / 2;
      b.y = r.y + 4;
      b.z = blocks.CARRY_Z;
      w.release(b);
      const events = [];
      for (let i = 0; i < 240 && (b.state === "air" || events.length === 0); i++) events.push(...w.step(1 / 60, true));
      return events;
    };
    const first = w.blocks.find((b) => b.state === "belt");
    const ev1 = drop(first, first.entry.groupIndex);
    ok(ev1.some((e) => e.type === "sorted" && e.entry.skill === first.entry.skill) && w.sortedCount === 1, `correct bin sorts "${first.entry.skill}" (1/${blocks.SKILL_COUNT})`);
    const second = w.blocks.find((b) => b.state === "belt");
    const wrong = (second.entry.groupIndex + 1) % data.skills.length;
    const ev2 = drop(second, wrong);
    ok(ev2.some((e) => e.type === "misroute") && second.state === "free" && w.sortedCount === 1, "wrong bin bounces the block back onto the floor");
    const third = w.blocks.find((b) => b.state === "belt");
    w.hold(third);
    third.x = second.x;
    third.y = second.y;
    third.z = blocks.CARRY_Z;
    w.release(third);
    for (let i = 0; i < 120; i++) w.step(1 / 60, true);
    ok(third.state === "free" && Math.abs(third.z - blocks.BLOCK_T) < 1e-6, "a block dropped on another stacks on top (AABB)");
  }

  console.log("Episodes");
  {
    const rec = new episodes.Recorder();
    rec.start(0);
    for (let t = 0; t <= 2000; t += 1000 / 60) rec.sample(t, { x: 100 + t / 100, y: 50, grip: t > 1000 });
    const ep = rec.stop(2000, 1);
    ok(ep && Math.abs(ep.frames.length - 61) <= 1, `2 s at 60 Hz input records ${ep.frames.length} frames (30 Hz)`);
    const p = new episodes.Player(ep);
    p.start(0);
    const mid = p.next(1500);
    ok(mid && mid.grip === true && Math.abs(mid.x - 115) < 1, "replay returns the command due at that time");
    ok(p.next(2500) === null, "replay ends after the episode duration");
    let list = [];
    for (let n = 1; n <= 5; n++) list = episodes.keepLatest(list, { ...ep, n });
    ok(list.length === 3 && list[0].n === 3, "keeps only the last 3 episodes");
    const capped = new episodes.Recorder();
    capped.start(0);
    ok(capped.sample(59000, { x: 0, y: 0, grip: false }) && !capped.sample(60000, { x: 0, y: 0, grip: false }), "recording stops at the 60 s cap");
  }

  console.log("Headless cell: the same pipeline as the engine (latency link, servo, gripper, physics)");
  {
    // Runs the auto demo through CommandBuffer -> driveArm -> World.step at 60 Hz.
    const simulate = (latencyMs, reduced) => {
      const world = new blocks.World(blocks.buildCatalog(), rand);
      const arm = new armMod.Arm(armMod.PARK);
      const buffer = new latency.CommandBuffer(256);
      const op = { x: armMod.PARK.x, y: armMod.PARK.y, grip: false };
      buffer.reset({ ...op });
      let pushed = { ...op };
      const pilot = new autopilot.AutoPilot(3);
      const sorted = [];
      let misroutes = 0;
      for (let i = 0; i < 60 * 90; i++) {
        const now = i * (1000 / 60);
        const done = pilot.step(1 / 60, op, world, arm, latencyMs, buffer.pending);
        if (done) return { sorted, misroutes, seconds: now / 1000 };
        if (op.x !== pushed.x || op.y !== pushed.y || op.grip !== pushed.grip) {
          pushed = { ...op };
          buffer.push(now, pushed);
        }
        const cmd = buffer.sample(now, latencyMs) ?? op;
        armMod.driveArm(arm, world, cmd, 1 / 60, { springy: !reduced, reduced, parked: false });
        for (const ev of world.step(1 / 60, reduced)) {
          if (ev.type === "sorted") sorted.push(ev.entry.skill);
          if (ev.type === "misroute") misroutes++;
        }
      }
      return { sorted, misroutes, seconds: Infinity };
    };
    for (const [ms, reduced] of [[0, false], [60, false], [300, false], [120, true]]) {
      const r = simulate(ms, reduced);
      ok(
        r.sorted.length === 3 && r.misroutes === 0,
        `auto demo at ${ms} ms latency${reduced ? ", reduced motion" : ""}: sorted ${r.sorted.length} (${r.sorted.join(", ")}) in ${r.seconds.toFixed(1)} s, ${r.misroutes} misroutes`
      );
    }

    // Manual teleop: aim at the block resting at the belt stop, grip, carry to the wrong bin, then the right one.
    const world = new blocks.World(blocks.buildCatalog(), rand);
    const arm = new armMod.Arm(armMod.PARK);
    const target = world.blocks.find((b) => b.state === "belt" && b.x + b.w >= blocks.BELT_STOP - 0.5);
    const run = (cmd, seconds) => {
      const evs = [];
      for (let i = 0; i < seconds * 60; i++) {
        armMod.driveArm(arm, world, cmd, 1 / 60, { springy: true, reduced: false, parked: false });
        evs.push(...world.step(1 / 60, false));
      }
      return evs;
    };
    const over = { x: target.x + target.w / 2, y: target.y + blocks.BLOCK_H / 2 };
    run({ ...over, grip: false }, 2);
    run({ ...over, grip: true }, 0.5);
    ok(arm.held === target, `teleop grip picks "${target.entry.skill}" from the belt`);
    const wrongBin = (target.entry.groupIndex + 2) % data.skills.length;
    const wd = autopilot.binDrop(wrongBin);
    run({ ...wd, grip: true }, 2.5);
    const wrongEvents = run({ ...wd, grip: false }, 2);
    ok(wrongEvents.some((e) => e.type === "misroute") && target.state === "free", "dropping in the wrong bin bounces it out");
    const back = { x: target.x + target.w / 2, y: target.y + blocks.BLOCK_H / 2 };
    run({ ...back, grip: false }, 2.5);
    run({ ...back, grip: true }, 0.5);
    const rd = autopilot.binDrop(target.entry.groupIndex);
    run({ ...rd, grip: true }, 2.5);
    const rightEvents = run({ ...rd, grip: false }, 2);
    ok(rightEvents.some((e) => e.type === "sorted" && e.entry.skill === target.entry.skill), "re-picked from the floor and sorted into the right bin");
    ok(
      [0, 1, 2, 3].every((i) => {
        const d = autopilot.binDrop(i);
        const r = blocks.binRect(i);
        return d.x > r.x && d.x < r.x + r.w && Math.hypot(d.x - scene.LINK.bx, d.y - scene.LINK.by) <= 126;
      }),
      "every bin has a reachable drop point inside it"
    );
  }
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}

if (failed) {
  console.error(`teleop selftest: ${failed} failure(s)`);
  process.exit(1);
}
console.log("teleop selftest: ok");
