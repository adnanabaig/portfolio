// The live Teleop Cell: canvas, control panel, touch pads, and narration.
// Loaded with clientOnly (lib/clientOnly) only on intent (TAKE CONTROL, AUTO DEMO, or an
// idle prefetch), so none of this is in the first-load bundle.
import { useCallback, useEffect, useRef, useState } from "react";
import type { MutableRefObject } from "react";
import { createPortal } from "react-dom";
import { emit, on } from "../../lib/bus";
import { isEstop, onReducedMotionChange, prefersReducedMotion } from "../../lib/station";
import { createEngine, type Dir, type Engine, type Snapshot } from "./engine";
import ControlPanel from "./ControlPanel";

export interface TeleopLiveHandle {
  focus(): void;
}

export interface TeleopLiveProps {
  start: "teleop" | "auto";
  /** Filled with an imperative handle (the lazy wrapper does not forward refs). */
  handleRef: MutableRefObject<TeleopLiveHandle | null>;
  panelHost: HTMLElement | null;
  onFocusChange(focused: boolean): void;
  onRelease(): void;
}

const INITIAL_LATENCY = 60;

export default function TeleopLive({ start, handleRef, panelHost, onFocusChange, onRelease }: TeleopLiveProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<Engine | null>(null);
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [message, setMessage] = useState("");
  const [log, setLog] = useState<string[]>([]);
  const releaseRef = useRef(onRelease);
  releaseRef.current = onRelease;

  useEffect(() => {
    handleRef.current = { focus: () => wrapperRef.current?.focus() };
    return () => {
      handleRef.current = null;
    };
  }, [handleRef]);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    const canvas = canvasRef.current;
    if (!wrapper || !canvas) return;
    const engine = createEngine(
      wrapper,
      canvas,
      {
        snapshot: setSnap,
        // A trailing space forces a re-announce when the same message repeats.
        announce: (m) => setMessage((prev) => (prev === m ? `${m} ` : m)),
        log: (line) => setLog((prev) => [...prev.slice(-3), line]),
        sorted: (entry) => emit("ab:skill", { skill: entry.skill, group: entry.group }),
        release: () => releaseRef.current(),
      },
      { reduced: prefersReducedMotion(), latency: INITIAL_LATENCY, isGlobalStop: isEstop }
    );
    engineRef.current = engine;
    if (start === "auto") engine.toggleAuto();
    else wrapper.focus();
    const offMotion = onReducedMotionChange((r) => engine.setReduced(r));
    const offStop = on("ab:estop", () => engine.globalStopChanged());
    return () => {
      offMotion();
      offStop();
      engine.destroy();
      engineRef.current = null;
    };
  }, [start]);

  // AUTO DEMO path: once the panel exists, put focus on its AUTO DEMO button.
  useEffect(() => {
    if (start !== "auto" || !panelHost || !snap) return;
    const btn = panelHost.querySelector<HTMLButtonElement>("[data-autofocus]");
    if (btn && !panelHost.contains(document.activeElement)) btn.focus();
    // Only on the first snapshot.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [start, panelHost, snap !== null]);

  const call = useCallback(<K extends keyof Engine>(name: K, ...args: Parameters<Engine[K]>) => {
    const fn = engineRef.current?.[name] as ((...a: Parameters<Engine[K]>) => void) | undefined;
    fn?.(...args);
  }, []);

  const stopped = snap?.mode === "STOPPED";

  return (
    <>
      <div
        ref={wrapperRef}
        className="teleop"
        role="application"
        aria-label="Robot arm teleop"
        aria-describedby="teleop-help"
        tabIndex={0}
        onFocus={() => onFocusChange(true)}
        onBlur={() => onFocusChange(false)}
      >
        <canvas ref={canvasRef} width={320} height={180} aria-hidden="true" />
        {stopped && (
          <p className="teleop__banner" aria-hidden="true">
            STOPPED. CLEAR TO RESUME
          </p>
        )}
      </div>
      <p className="sr-only" role="status" aria-live="polite">
        {message}
      </p>
      {panelHost &&
        snap &&
        createPortal(
          <ControlPanel
            snap={snap}
            log={log}
            onLatency={(ms) => call("setLatency", ms)}
            onGrip={() => call("grip")}
            onDeadman={(v) => call("setDeadman", v)}
            onRec={() => call("toggleRec")}
            onReplay={() => call("toggleReplay")}
            onAuto={() => call("toggleAuto")}
            onStop={() => call("estop")}
            onClear={() => call("clear")}
            onPad={(d: Dir, v: boolean) => call("setPad", d, v)}
            onPadHold={(v) => call("setPadHold", v)}
            onNudge={(d: Dir) => call("nudge", d)}
          />,
          panelHost
        )}
    </>
  );
}
