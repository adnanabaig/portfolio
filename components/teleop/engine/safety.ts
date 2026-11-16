// The cell's safety state machine. Pure: (mode, event) -> next mode plus an
// optional log line. The rules mirror a real teleop cell:
// - STOPPED is latched. Only an explicit CLEAR leaves it, and only when the
//   site-wide E-STOP is not also engaged.
// - With DEADMAN on, letting go of the hold while the arm is moving latches a stop.
// - 20 s without operator input in TELEOP parks the arm.

export type Mode = "TELEOP" | "AUTO" | "PARKED" | "STOPPED" | "REPLAY";

export type SafetyEvent =
  | { type: "INPUT" }
  | { type: "ESTOP"; source: "cell" | "global" }
  | { type: "CLEAR"; globalStop: boolean }
  | { type: "DEADMAN_RELEASE"; moving: boolean }
  | { type: "WATCHDOG"; idleMs: number }
  | { type: "AUTO_START" }
  | { type: "AUTO_END" }
  | { type: "REPLAY_START" }
  | { type: "REPLAY_END" };

export const WATCHDOG_MS = 20000;

export interface Transition {
  mode: Mode;
  log?: string;
}

export function transition(mode: Mode, ev: SafetyEvent): Transition {
  if (mode === "STOPPED") {
    if (ev.type !== "CLEAR") return { mode };
    if (ev.globalStop) return { mode, log: "clear refused: site e-stop engaged" };
    return { mode: "TELEOP", log: "stop cleared, teleop ready" };
  }
  switch (ev.type) {
    case "ESTOP":
      return { mode: "STOPPED", log: ev.source === "global" ? "site e-stop: cell latched" : "e-stop latched" };
    case "CLEAR":
      return { mode };
    case "DEADMAN_RELEASE":
      if (mode === "TELEOP" && ev.moving) return { mode: "STOPPED", log: "deadman released mid-move: stop latched" };
      return { mode };
    case "WATCHDOG":
      if (mode === "TELEOP" && ev.idleMs >= WATCHDOG_MS) return { mode: "PARKED", log: "watchdog: no operator input, arm parked" };
      return { mode };
    case "INPUT":
      if (mode === "PARKED") return { mode: "TELEOP", log: "operator input: teleop resumed" };
      if (mode === "AUTO" || mode === "REPLAY") return { mode: "TELEOP", log: "operator took over" };
      return { mode };
    case "AUTO_START":
      return { mode: "AUTO", log: "auto demo started" };
    case "AUTO_END":
      return mode === "AUTO" ? { mode: "TELEOP", log: "auto demo finished" } : { mode };
    case "REPLAY_START":
      return { mode: "REPLAY", log: "replaying episode" };
    case "REPLAY_END":
      return mode === "REPLAY" ? { mode: "TELEOP", log: "replay finished" } : { mode };
  }
}

/** True when operator motion commands are accepted in this mode. */
export const acceptsTeleop = (mode: Mode) => mode === "TELEOP" || mode === "PARKED" || mode === "AUTO" || mode === "REPLAY";
