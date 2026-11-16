import { describe, expect, it } from "vitest";
import { WATCHDOG_MS, acceptsTeleop, transition, type Mode, type SafetyEvent } from "../../components/teleop/engine/safety";

const MODES: Mode[] = ["TELEOP", "AUTO", "PARKED", "STOPPED", "REPLAY"];
const NON_CLEAR: SafetyEvent[] = [
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
];

describe("E-STOP latch", () => {
  it.each(MODES.filter((m) => m !== "STOPPED"))("ESTOP from %s latches STOPPED with a log line", (m) => {
    expect(transition(m, { type: "ESTOP", source: "cell" })).toEqual({ mode: "STOPPED", log: "e-stop latched" });
    expect(transition(m, { type: "ESTOP", source: "global" })).toEqual({ mode: "STOPPED", log: "site e-stop: cell latched" });
  });

  it("STOPPED ignores every event except CLEAR", () => {
    for (const ev of NON_CLEAR) expect(transition("STOPPED", ev).mode, ev.type).toBe("STOPPED");
  });

  it("holds through any sequence of non-CLEAR events", () => {
    let mode: Mode = "STOPPED";
    for (let i = 0; i < 200; i++) mode = transition(mode, NON_CLEAR[(i * 7) % NON_CLEAR.length]).mode;
    expect(mode).toBe("STOPPED");
  });

  it("CLEAR is refused while the site E-STOP is engaged", () => {
    expect(transition("STOPPED", { type: "CLEAR", globalStop: true })).toEqual({ mode: "STOPPED", log: "clear refused: site e-stop engaged" });
  });

  it("only an explicit CLEAR leaves STOPPED, and it lands in TELEOP", () => {
    expect(transition("STOPPED", { type: "CLEAR", globalStop: false })).toEqual({ mode: "TELEOP", log: "stop cleared, teleop ready" });
  });

  it("CLEAR outside STOPPED is a no-op", () => {
    for (const m of MODES.filter((x) => x !== "STOPPED")) expect(transition(m, { type: "CLEAR", globalStop: false })).toEqual({ mode: m });
  });
});

describe("deadman", () => {
  it("releasing the hold mid-move in TELEOP latches a stop", () => {
    expect(transition("TELEOP", { type: "DEADMAN_RELEASE", moving: true })).toEqual({ mode: "STOPPED", log: "deadman released mid-move: stop latched" });
  });
  it("releasing at rest does nothing", () => {
    expect(transition("TELEOP", { type: "DEADMAN_RELEASE", moving: false }).mode).toBe("TELEOP");
  });
  it("the latched stop then needs CLEAR like any other", () => {
    let mode = transition("TELEOP", { type: "DEADMAN_RELEASE", moving: true }).mode;
    mode = transition(mode, { type: "INPUT" }).mode;
    expect(mode).toBe("STOPPED");
    expect(transition(mode, { type: "CLEAR", globalStop: false }).mode).toBe("TELEOP");
  });
  it("does not apply to scripted modes", () => {
    for (const m of ["AUTO", "REPLAY", "PARKED"] as Mode[]) expect(transition(m, { type: "DEADMAN_RELEASE", moving: true }).mode).toBe(m);
  });
});

describe("watchdog", () => {
  it(`parks the arm at ${WATCHDOG_MS / 1000} s of idle, not before`, () => {
    expect(transition("TELEOP", { type: "WATCHDOG", idleMs: WATCHDOG_MS - 1 }).mode).toBe("TELEOP");
    expect(transition("TELEOP", { type: "WATCHDOG", idleMs: WATCHDOG_MS })).toEqual({ mode: "PARKED", log: "watchdog: no operator input, arm parked" });
  });

  it("fires within one 60 Hz step of the timeout in a simulated idle run", () => {
    let mode: Mode = "TELEOP";
    let idle = 0;
    let parkedAt: number | null = null;
    for (let step = 0; step < 60 * 25 && parkedAt === null; step++) {
      idle += 1000 / 60;
      mode = transition(mode, { type: "WATCHDOG", idleMs: idle }).mode;
      if (mode === "PARKED") parkedAt = idle;
    }
    expect(parkedAt).not.toBeNull();
    expect(parkedAt!).toBeGreaterThanOrEqual(WATCHDOG_MS);
    expect(parkedAt!).toBeLessThan(WATCHDOG_MS + 1000 / 60 + 1e-6);
  });

  it("only watches TELEOP (auto demo and replay are not operator idle)", () => {
    for (const m of ["AUTO", "REPLAY", "PARKED", "STOPPED"] as Mode[]) expect(transition(m, { type: "WATCHDOG", idleMs: 1e9 }).mode).toBe(m);
  });

  it("operator input resumes TELEOP from PARKED", () => {
    expect(transition("PARKED", { type: "INPUT" })).toEqual({ mode: "TELEOP", log: "operator input: teleop resumed" });
  });
});

describe("scripted modes", () => {
  it("operator input takes over AUTO and REPLAY", () => {
    expect(transition("AUTO", { type: "INPUT" }).mode).toBe("TELEOP");
    expect(transition("REPLAY", { type: "INPUT" }).mode).toBe("TELEOP");
  });
  it("AUTO_END and REPLAY_END only end their own mode", () => {
    expect(transition("AUTO", { type: "AUTO_END" }).mode).toBe("TELEOP");
    expect(transition("REPLAY", { type: "AUTO_END" }).mode).toBe("REPLAY");
    expect(transition("REPLAY", { type: "REPLAY_END" }).mode).toBe("TELEOP");
    expect(transition("AUTO", { type: "REPLAY_END" }).mode).toBe("AUTO");
  });
  it("acceptsTeleop is false only when stopped", () => {
    expect(MODES.filter((m) => !acceptsTeleop(m))).toEqual(["STOPPED"]);
  });
});
