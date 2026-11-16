// The real engine (createEngine) with the canvas and the rAF loop stubbed
// out: the test owns the clock and calls the engine's 60 Hz step directly,
// so every safety rule is checked end to end through the public Engine API.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Arm } from "../../components/teleop/engine/arm";
import { PARK } from "../../components/teleop/engine/arm";
import { WATCHDOG_MS } from "../../components/teleop/engine/safety";
import { KEYS, write } from "../../lib/storage";

const h = vi.hoisted(() => ({
  step: null as null | ((dt: number) => void),
  render: null as null | (() => void),
  arm: null as null | { wrist: { x: number; y: number } },
}));

vi.mock("../../components/teleop/engine/loop", () => ({
  STEP: 1 / 60,
  createLoop(step: (dt: number) => void, render: () => void) {
    h.step = step;
    h.render = render;
    return { wake() {}, stop() {}, running: false };
  },
}));

vi.mock("../../components/teleop/engine/render", () => ({
  Screen: class {
    resize() {}
    refreshPalette() {}
    blit() {}
  },
  drawFrame(_screen: unknown, _world: unknown, arm: Arm) {
    h.arm = arm;
  },
}));

import { createEngine, type Snapshot } from "../../components/teleop/engine";

const MS = 1000 / 60;
let clock = 0;

class Noop {
  observe() {}
  disconnect() {}
}
const fakeEl = () =>
  ({
    addEventListener() {},
    removeEventListener() {},
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 320, height: 180 }),
  }) as unknown as HTMLElement & HTMLCanvasElement;

beforeEach(() => {
  clock = 1000;
  vi.spyOn(performance, "now").mockImplementation(() => clock);
  vi.stubGlobal("IntersectionObserver", Noop);
  vi.stubGlobal("ResizeObserver", Noop);
  vi.stubGlobal("MutationObserver", Noop);
  vi.stubGlobal("document", { hidden: false, addEventListener() {}, removeEventListener() {}, documentElement: {} });
  write(KEYS.episodes, null, "session");
});
afterEach(() => {
  vi.unstubAllGlobals();
});

function boot(latency = 0) {
  const snaps: Snapshot[] = [];
  const announced: string[] = [];
  const logs: string[] = [];
  const env = { globalStop: false };
  const engine = createEngine(
    fakeEl(),
    fakeEl(),
    {
      snapshot: (s) => snaps.push(s),
      announce: (m) => announced.push(m),
      log: (l) => logs.push(l),
      sorted() {},
      release() {},
    },
    { reduced: false, latency, isGlobalStop: () => env.globalStop }
  );
  const steps = (n: number) => {
    for (let i = 0; i < n; i++) {
      clock += MS;
      h.step!(1 / 60);
    }
    h.render!();
  };
  const run = (seconds: number) => steps(Math.round(seconds * 60));
  const state = () => {
    h.render!(); // snapshots go out on render, and only when something changed
    return snaps[snaps.length - 1];
  };
  const wrist = () => ({ ...h.arm!.wrist });
  return { engine, env, run, steps, state, wrist, announced, logs };
}

const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);

describe("engine: E-STOP", () => {
  it("latches, freezes the arm, refuses work, and needs an explicit CLEAR", () => {
    const c = boot();
    c.engine.setPad("left", true);
    c.run(0.3);
    c.engine.estop();
    expect(c.state().mode).toBe("STOPPED");
    expect(c.logs).toContain("e-stop latched");

    const frozen = c.wrist();
    c.run(1);
    expect(dist(c.wrist(), frozen)).toBeLessThan(1e-9);

    c.engine.grip();
    expect(c.state().closed).toBe(false);
    expect(c.announced.at(-1)).toBe("Stopped. Clear the stop before using the gripper.");
    c.engine.toggleAuto();
    expect(c.state().mode).toBe("STOPPED");
    c.engine.nudge("up");
    c.run(1);
    expect(dist(c.wrist(), frozen)).toBeLessThan(1e-9);

    c.engine.setPad("left", false);
    c.run(30); // no amount of waiting clears it
    expect(c.state().mode).toBe("STOPPED");

    c.engine.clear();
    expect(c.state().mode).toBe("TELEOP");
    expect(c.logs).toContain("stop cleared, teleop ready");
  });

  it("refuses CLEAR while the site E-STOP is engaged", () => {
    const c = boot();
    c.env.globalStop = true;
    c.engine.globalStopChanged();
    expect(c.state().mode).toBe("STOPPED");
    expect(c.logs).toContain("site e-stop: cell latched");
    c.engine.clear();
    expect(c.state().mode).toBe("STOPPED");
    expect(c.announced.at(-1)).toBe("The site E-STOP is engaged. Release it in the header first.");
    c.env.globalStop = false;
    c.engine.globalStopChanged();
    expect(c.state().mode).toBe("STOPPED");
    c.engine.clear();
    expect(c.state().mode).toBe("TELEOP");
  });

  it("CLEAR on a running cell says there is nothing to clear", () => {
    const c = boot();
    c.engine.clear();
    expect(c.announced.at(-1)).toBe("Nothing to clear. The cell is running.");
  });
});

describe("engine: watchdog", () => {
  it(`parks the arm after ${WATCHDOG_MS / 1000} s without input, and input resumes teleop`, () => {
    const c = boot();
    c.engine.setPad("left", true);
    c.run(0.6);
    c.engine.setPad("left", false); // last input
    c.run(WATCHDOG_MS / 1000 - 0.5);
    expect(c.state().mode).toBe("TELEOP");
    expect(dist(c.wrist(), PARK)).toBeGreaterThan(20);

    c.run(1);
    expect(c.state().mode).toBe("PARKED");
    expect(c.logs).toContain("watchdog: no operator input, arm parked");
    c.run(3);
    expect(dist(c.wrist(), PARK)).toBeLessThan(0.5);

    c.engine.setPad("down", true);
    c.steps(1);
    expect(c.state().mode).toBe("TELEOP");
    expect(c.logs).toContain("operator input: teleop resumed");
  });
});

describe("engine: deadman", () => {
  it("blocks motion until HOLD, and letting go mid-move latches a stop", () => {
    const c = boot();
    c.engine.setDeadman(true);
    const start = c.wrist();
    c.engine.setPad("left", true);
    c.run(0.5);
    expect(dist(c.wrist(), start)).toBeLessThan(1e-6);
    expect(c.announced).toContain("Deadman is on. Hold Shift or HOLD to move.");

    c.engine.setPadHold(true);
    c.run(0.3);
    expect(dist(c.wrist(), start)).toBeGreaterThan(5);

    c.engine.setPadHold(false); // still pressing left
    c.steps(1);
    expect(c.state().mode).toBe("STOPPED");
    expect(c.logs).toContain("deadman released mid-move: stop latched");
    c.engine.setPad("left", false);
    c.run(5);
    expect(c.state().mode).toBe("STOPPED");
    c.engine.clear();
    expect(c.state().mode).toBe("TELEOP");
  });

  it("letting go at rest does not stop the cell", () => {
    const c = boot();
    c.engine.setDeadman(true);
    c.engine.setPadHold(true);
    c.run(1);
    c.engine.setPadHold(false);
    c.run(0.5);
    expect(c.state().mode).toBe("TELEOP");
  });
});

describe("engine: latency link", () => {
  it.each([0, 120, 300])("a nudge reaches the arm after %i ms (SIM)", (ms) => {
    const c = boot(ms);
    c.run(1);
    const start = c.wrist();
    c.engine.nudge("left");
    let moved = -1;
    for (let i = 0; i < 40 && moved < 0; i++) {
      c.steps(1);
      if (dist(c.wrist(), start) > 1e-6) moved = i;
    }
    const due = Math.max(0, Math.ceil(ms / MS - 1e-9));
    expect(moved).toBeGreaterThanOrEqual(due);
    expect(moved).toBeLessThanOrEqual(due + 1);
  });

  it("clamps the knob to 0..300 ms", () => {
    const c = boot();
    c.engine.setLatency(999);
    c.steps(1);
    expect(c.state().latency).toBe(300);
    c.engine.setLatency(-20);
    c.steps(1);
    expect(c.state().latency).toBe(0);
  });
});

describe("engine: episodes", () => {
  it("operator input takes over a replay", () => {
    const c = boot();
    c.engine.toggleRec();
    c.engine.setPad("left", true);
    c.run(1);
    c.engine.setPad("left", false);
    c.engine.toggleRec();
    c.engine.toggleReplay();
    c.steps(5);
    c.engine.setPad("up", true);
    c.steps(1);
    expect(c.state().mode).toBe("TELEOP");
    expect(c.logs).toContain("operator took over");
  });

  it("replay with nothing recorded says so", () => {
    const c = boot();
    c.engine.toggleReplay();
    expect(c.state().mode).toBe("TELEOP");
    expect(c.announced.at(-1)).toBe("No episodes yet. Press R to record one.");
  });
});
