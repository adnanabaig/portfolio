// The Teleop Cell engine: wires input, the latency link, the safety state
// machine, the arm, the block world, episodes, and the renderer into one
// imperative object the React layer drives. Loaded only on intent.
import { BIN_W, BIN_Y, CELL_H, CELL_W, LINK, binX } from "../../../lib/teleop/scene";
import { read, write, KEYS } from "../../../lib/storage";
import { emit, on as onBus, type CellEvent } from "../../../lib/bus";
import { Arm, PARK, driveArm } from "./arm";
import { AutoPilot, NUDGE, SPEED, WORKSPACE } from "./autopilot";
import { CARRY_Z, SKILL_COUNT, World, buildCatalog, type CatalogEntry } from "./blocks";
import { Player, Recorder, keepLatest, parseEpisodes, type Command, type Episode } from "./episodes";
import { clampWorkspace } from "./ik";
import { Controls, type Dir } from "./input";
import { CommandBuffer, RttTrace } from "./latency";
import { createLoop } from "./loop";
import { Screen, drawFrame, type Particle } from "./render";
import { WATCHDOG_MS, transition, type Mode, type SafetyEvent } from "./safety";

export type { Mode } from "./safety";
export type { Dir } from "./input";

export interface Snapshot {
  mode: Mode;
  closed: boolean;
  /** Exact skill string of the block in the gripper. */
  holding: string | null;
  sorted: number;
  total: number;
  recording: boolean;
  /** Current recording length (ms, 100 ms steps). */
  recMs: number;
  episodeNo: number;
  episodes: { n: number; durationMs: number }[];
  deadman: boolean;
  hold: boolean;
  latency: number;
  limit: boolean;
  complete: boolean;
}

export interface EngineCallbacks {
  snapshot(s: Snapshot): void;
  /** One polite live-region message. */
  announce(message: string): void;
  log(line: string): void;
  /** A correct sort (the React layer turns this into the "ab:skill" bus event). */
  sorted(entry: CatalogEntry): void;
  /** Esc: hand focus back to TAKE CONTROL. */
  release(): void;
}

export interface EngineOptions {
  reduced: boolean;
  latency: number;
  isGlobalStop(): boolean;
}

export interface Engine {
  grip(): void;
  estop(): void;
  clear(): void;
  toggleRec(): void;
  toggleReplay(): void;
  toggleAuto(): void;
  setLatency(ms: number): void;
  setDeadman(on: boolean): void;
  setPad(d: Dir, on: boolean): void;
  setPadHold(on: boolean): void;
  nudge(d: Dir): void;
  setReduced(on: boolean): void;
  globalStopChanged(): void;
  refresh(): void;
  destroy(): void;
}

export function createEngine(wrapper: HTMLElement, canvas: HTMLCanvasElement, cb: EngineCallbacks, opts: EngineOptions): Engine {
  const screen = new Screen(canvas);
  const world = new World(buildCatalog());
  const arm = new Arm(PARK);
  const controls = new Controls();
  const buffer = new CommandBuffer<Command>(256);
  const rtt = new RttTrace(40);
  const recorder = new Recorder();

  let episodes: Episode[] = parseEpisodes(read(KEYS.episodes, "session"));
  let episodeNo = episodes.length ? episodes[episodes.length - 1].n : 0;
  let lastEpisodeMs = episodes.length ? episodes[episodes.length - 1].durationMs : 0;
  let player: Player | null = null;
  let auto: AutoPilot | null = null;

  let mode: Mode = "TELEOP";
  let latency = opts.latency;
  let deadman = false;
  let reduced = opts.reduced;
  const op: Command = { x: PARK.x, y: PARK.y, grip: false };
  let pushed: Command = { ...op };
  buffer.reset({ ...op });

  let lastInput = performance.now();
  let opLimited = false;
  let prevHold = false;
  let deadmanWaiting = false;
  let deadmanHintAt = -Infinity;
  let particles: Particle[] = [];
  let shake = 0;
  let rttClock = 0;
  let complete = false;
  let visible = true;
  let watchdogTimer: ReturnType<typeof setTimeout> | undefined;
  let lastSnap = "";

  for (let i = 0; i < 40; i++) rtt.add(latency, Math.random());

  // Cell moments go out on the bus for sound and visitor badges.
  const moment = (type: CellEvent) => emit("ab:cell", { type });

  // --- safety -------------------------------------------------------------
  function resyncCommand() {
    const w = arm.wrist;
    op.x = w.x;
    op.y = w.y;
    pushed = { ...op };
    buffer.reset({ ...op });
  }

  function fire(ev: SafetyEvent) {
    const prev = mode;
    const t = transition(mode, ev);
    mode = t.mode;
    if (t.log) cb.log(t.log);
    if (prev === mode) return t;
    if (mode === "TELEOP") lastInput = performance.now();
    if (mode === "STOPPED") {
      arm.freeze();
      auto = null;
      player = null;
      cb.announce("Stopped. Press C or CLEAR to resume.");
      moment("stop");
    } else if (prev === "STOPPED") {
      arm.freeze();
      resyncCommand();
      cb.announce("Stop cleared. Teleop ready.");
      moment("clear");
    } else if (mode === "PARKED") {
      cb.announce("Watchdog: no operator input. Arm parked.");
    } else if (prev === "PARKED" && mode === "TELEOP") {
      resyncCommand();
    }
    if (prev === "AUTO") auto = null;
    if (prev === "REPLAY") player = null;
    if (mode === "TELEOP" && (prev === "AUTO" || prev === "REPLAY") && t.log) cb.announce(t.log.replace(/^./, (c) => c.toUpperCase()) + ".");
    return t;
  }

  // --- episodes -----------------------------------------------------------
  function stopRec(now: number) {
    const ep = recorder.stop(now, episodeNo + 1);
    if (!ep) {
      cb.announce("Recording discarded: too short.");
      return;
    }
    episodeNo = ep.n;
    lastEpisodeMs = ep.durationMs;
    episodes = keepLatest(episodes, ep);
    write(KEYS.episodes, JSON.stringify(episodes), "session");
    const seconds = (ep.durationMs / 1000).toFixed(1);
    cb.log(`episode ${ep.n} saved, ${seconds} s`);
    cb.announce(`Saved episode ${ep.n}, ${seconds} seconds. Your run, kept in this tab.`);
    moment("saved");
  }

  // --- simulation step ----------------------------------------------------
  function step(dt: number) {
    const now = performance.now();
    if (opts.isGlobalStop() && mode !== "STOPPED") fire({ type: "ESTOP", source: "global" });

    const hold = controls.hold;
    if (deadman && prevHold && !hold) {
      fire({ type: "DEADMAN_RELEASE", moving: controls.anyDir || !!controls.pointer || arm.moving || buffer.pending > 0 });
    }
    prevHold = hold;

    const wantsMotion = controls.anyDir || !!controls.pointer;
    deadmanWaiting = false;
    opLimited = false;
    if (wantsMotion && mode !== "STOPPED") {
      if (deadman && !hold) {
        deadmanWaiting = true;
        if (now - deadmanHintAt > 6000) {
          deadmanHintAt = now;
          cb.announce("Deadman is on. Hold Shift or HOLD to move.");
        }
      } else {
        if (mode !== "TELEOP") fire({ type: "INPUT" });
        if (mode === "TELEOP") {
          if (controls.pointer) {
            op.x = controls.pointer.x;
            op.y = controls.pointer.y;
          }
          let dx = (controls.dir("right") ? 1 : 0) - (controls.dir("left") ? 1 : 0);
          let dy = (controls.dir("down") ? 1 : 0) - (controls.dir("up") ? 1 : 0);
          if (dx && dy) {
            dx *= Math.SQRT1_2;
            dy *= Math.SQRT1_2;
          }
          op.x += dx * SPEED * dt;
          op.y += dy * SPEED * dt;
          const c = clampWorkspace(LINK, op.x, op.y, WORKSPACE);
          op.x = c.x;
          op.y = c.y;
          opLimited = c.clamped;
        }
      }
    }

    if (mode === "AUTO" && auto) {
      if (auto.step(dt, op, world, arm, latency, buffer.pending)) fire({ type: "AUTO_END" });
    } else if (mode === "REPLAY" && player) {
      const cmd = player.next(now);
      if (!cmd) fire({ type: "REPLAY_END" });
      else {
        op.x = cmd.x;
        op.y = cmd.y;
        op.grip = cmd.grip;
      }
    }

    if (op.x !== pushed.x || op.y !== pushed.y || op.grip !== pushed.grip) {
      pushed = { ...op };
      buffer.push(now, pushed);
    }
    if (recorder.active && !recorder.sample(now, op)) stopRec(now);

    if (mode === "STOPPED") {
      arm.freeze();
    } else {
      const cmd = buffer.sample(now, latency) ?? op;
      const gripped = driveArm(arm, world, cmd, dt, { springy: !reduced, reduced, parked: mode === "PARKED" });
      if (gripped) {
        cb.announce(`Gripped ${gripped.entry.skill}`);
        moment("grip");
      }
    }

    for (const ev of world.step(dt, reduced)) {
      if (ev.type === "sorted") {
        cb.sorted(ev.entry);
        let msg = `Sorted: ${ev.entry.skill} to ${ev.entry.group}`;
        const done = ev.total === SKILL_COUNT && !complete;
        if (done) {
          complete = true;
          msg += `. Calibration complete. ${ev.total} of ${SKILL_COUNT} skills sorted.`;
          cb.log("calibration complete");
        }
        cb.announce(msg);
        moment(done ? "complete" : "sort");
        if (!reduced) {
          const cx = binX(ev.bin) + BIN_W / 2;
          for (let i = 0; i < 12; i++) {
            const a = -Math.PI * (0.15 + 0.7 * Math.random());
            const v = 40 + Math.random() * 50;
            particles.push({ x: cx, y: BIN_Y + 4, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.5, key: i % 3 ? "g" : "w" });
          }
        }
      } else if (ev.type === "misroute") {
        cb.announce(`Wrong bin: ${ev.entry.skill} belongs in ${ev.entry.group}`);
        cb.log(`misroute: ${ev.entry.label} bounced`);
        moment("misroute");
        if (!reduced) shake = 0.12;
      }
    }

    if (particles.length) {
      for (const p of particles) {
        p.vy += 160 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= dt;
      }
      particles = reduced ? [] : particles.filter((p) => p.life > 0);
    }
    if (shake > 0) shake = reduced ? 0 : Math.max(0, shake - dt);

    if (mode === "TELEOP") fire({ type: "WATCHDOG", idleMs: now - lastInput });

    rttClock += dt;
    if (rttClock >= 0.1) {
      rttClock = 0;
      rtt.add(latency, Math.random());
    }
  }

  // --- render -------------------------------------------------------------
  function snapshot(): Snapshot {
    const now = performance.now();
    return {
      mode,
      closed: arm.closed,
      holding: arm.held ? arm.held.entry.skill : null,
      sorted: world.sortedCount,
      total: SKILL_COUNT,
      recording: recorder.active,
      recMs: Math.floor(recorder.elapsed(now) / 100) * 100,
      episodeNo,
      episodes: episodes.map((e) => ({ n: e.n, durationMs: e.durationMs })),
      deadman,
      hold: controls.hold,
      latency,
      limit: opLimited || arm.limited,
      complete,
    };
  }

  function render() {
    const now = performance.now();
    drawFrame(
      screen,
      world,
      arm,
      {
        mode,
        latency,
        rtt: rtt.ordered(),
        episode: recorder.active ? episodeNo + 1 : episodeNo,
        episodeMs: recorder.active ? recorder.elapsed(now) : player ? player.progress(now) * player.episode.durationMs : lastEpisodeMs,
        recording: recorder.active,
        replaying: !!player,
        operator: { x: op.x, y: op.y },
        limit: opLimited || arm.limited,
        deadmanWaiting,
      },
      particles
    );
    const s = shake > 0 ? (Math.random() < 0.5 ? -2 : 2) : 0;
    screen.blit(s, shake > 0 ? (Math.random() < 0.5 ? -1 : 1) : 0);
    const snap = snapshot();
    const key = JSON.stringify(snap);
    if (key !== lastSnap) {
      lastSnap = key;
      cb.snapshot(snap);
    }
  }

  // --- loop ---------------------------------------------------------------
  const settled = () =>
    mode !== "AUTO" &&
    mode !== "REPLAY" &&
    !recorder.active &&
    !controls.anyDir &&
    !controls.pointer &&
    buffer.pending === 0 &&
    arm.settled &&
    !world.busy &&
    particles.length === 0 &&
    shake <= 0 &&
    (!arm.held || arm.held.z === CARRY_Z);

  function scheduleWatchdog() {
    clearTimeout(watchdogTimer);
    if (mode !== "TELEOP" || !visible || document.hidden) return;
    const wait = Math.max(0, lastInput + WATCHDOG_MS - performance.now()) + 30;
    watchdogTimer = setTimeout(() => loop.wake(), wait);
  }

  const loop = createLoop(step, render, () => {
    const run = visible && !document.hidden && !opts.isGlobalStop() && !settled();
    if (!run) scheduleWatchdog();
    return run;
  });

  const wake = () => {
    if (visible && !document.hidden && !opts.isGlobalStop()) loop.wake();
  };
  const activity = () => {
    lastInput = performance.now();
    wake();
  };

  const detach = controls.attach(wrapper, canvas, CELL_W, CELL_H, {
    grip: () => api.grip(),
    estop: () => api.estop(),
    clear: () => api.clear(),
    rec: () => api.toggleRec(),
    release: () => {
      controls.releaseAll();
      cb.release();
    },
    activity,
  });

  const io = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) wake();
    else loop.stop();
  });
  io.observe(wrapper);
  const onVisibility = () => {
    if (document.hidden) loop.stop();
    else wake();
  };
  document.addEventListener("visibilitychange", onVisibility);
  const ro = new ResizeObserver(() => {
    screen.resize();
    render();
  });
  ro.observe(canvas);
  const themeWatch = new MutationObserver(() => {
    screen.refreshPalette();
    render();
  });
  themeWatch.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  // The OPS console can turn the latency knob: `latency <ms>`.
  const offCmd = onBus("ab:cmd", (c) => {
    if (c.type === "latency") api.setLatency(c.ms);
  });

  const requireLive = (what: string) => {
    if (mode !== "STOPPED") return true;
    cb.announce(`Stopped. Clear the stop before ${what}.`);
    return false;
  };

  const api: Engine = {
    grip() {
      if (!requireLive("using the gripper")) return;
      if (mode !== "TELEOP") fire({ type: "INPUT" });
      op.grip = !op.grip;
      activity();
    },
    estop() {
      fire({ type: "ESTOP", source: "cell" });
      render();
      activity();
    },
    clear() {
      if (mode !== "STOPPED") {
        cb.announce("Nothing to clear. The cell is running.");
        return;
      }
      const t = fire({ type: "CLEAR", globalStop: opts.isGlobalStop() });
      if (t.mode === "STOPPED") cb.announce("The site E-STOP is engaged. Release it in the header first.");
      render();
      activity();
    },
    toggleRec() {
      const now = performance.now();
      if (recorder.active) stopRec(now);
      else {
        recorder.start(now);
        cb.log(`recording episode ${episodeNo + 1}`);
        cb.announce(`Recording episode ${episodeNo + 1}. Press R again to stop.`);
        moment("rec");
      }
      activity();
    },
    toggleReplay() {
      if (mode === "REPLAY") {
        fire({ type: "REPLAY_END" });
        activity();
        return;
      }
      if (!requireLive("replaying")) return;
      const now = performance.now();
      if (recorder.active) stopRec(now);
      const ep = episodes[episodes.length - 1];
      if (!ep) {
        cb.announce("No episodes yet. Press R to record one.");
        return;
      }
      player = new Player(ep);
      player.start(now);
      fire({ type: "REPLAY_START" });
      cb.announce(`Replaying episode ${ep.n}.`);
      moment("replay");
      activity();
    },
    toggleAuto() {
      if (mode === "AUTO") {
        fire({ type: "AUTO_END" });
        activity();
        return;
      }
      if (!requireLive("starting the demo")) return;
      auto = new AutoPilot(3);
      fire({ type: "AUTO_START" });
      cb.announce("Auto demo: sorting three blocks. Press any move key to take over.");
      activity();
    },
    setLatency(ms) {
      latency = Math.max(0, Math.min(300, ms));
      activity();
    },
    setDeadman(on) {
      deadman = on;
      prevHold = controls.hold;
      cb.log(on ? "deadman enabled" : "deadman disabled");
      cb.announce(on ? "Deadman on. Hold Shift or HOLD to move. Letting go mid-move latches a stop." : "Deadman off.");
      activity();
    },
    setPad(d, on) {
      controls.setPad(d, on);
      activity();
    },
    setPadHold(on) {
      controls.padHold = on;
      activity();
    },
    nudge(d) {
      if (mode === "STOPPED") return;
      if (deadman && !controls.hold) {
        cb.announce("Deadman is on. Hold Shift or HOLD to move.");
        return;
      }
      if (mode !== "TELEOP") fire({ type: "INPUT" });
      if (mode !== "TELEOP") return;
      op.x += d === "left" ? -NUDGE : d === "right" ? NUDGE : 0;
      op.y += d === "up" ? -NUDGE : d === "down" ? NUDGE : 0;
      const c = clampWorkspace(LINK, op.x, op.y, WORKSPACE);
      op.x = c.x;
      op.y = c.y;
      activity();
    },
    setReduced(on) {
      reduced = on;
      if (on) {
        particles = [];
        shake = 0;
      }
      activity();
    },
    globalStopChanged() {
      if (opts.isGlobalStop()) {
        controls.releaseAll();
        if (mode !== "STOPPED") fire({ type: "ESTOP", source: "global" });
        loop.stop();
        render();
      } else {
        render();
        wake();
      }
    },
    refresh() {
      screen.resize();
      render();
    },
    destroy() {
      loop.stop();
      clearTimeout(watchdogTimer);
      detach();
      io.disconnect();
      ro.disconnect();
      themeWatch.disconnect();
      offCmd();
      document.removeEventListener("visibilitychange", onVisibility);
    },
  };

  if (opts.isGlobalStop()) fire({ type: "ESTOP", source: "global" });
  render();
  wake();
  return api;
}
