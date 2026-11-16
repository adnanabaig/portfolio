// Real HTML controls under the canvas. Every action the keyboard can do has
// a labeled button here; numbers are game state and tagged SIM / your run.
import portfolio from "../../data/portfolio.json";
import type { PortfolioData } from "../../types/portfolio";
import type { Dir, Snapshot } from "./engine";
import TouchPad from "./TouchPad";

const data = portfolio as PortfolioData;

export interface ControlPanelProps {
  snap: Snapshot;
  log: string[];
  onLatency(ms: number): void;
  onGrip(): void;
  onDeadman(on: boolean): void;
  onRec(): void;
  onReplay(): void;
  onAuto(): void;
  onStop(): void;
  onClear(): void;
  onPad(d: Dir, on: boolean): void;
  onPadHold(on: boolean): void;
  onNudge(d: Dir): void;
}

const pad3 = (n: number) => String(n).padStart(3, "0");
const seconds = (ms: number) => `${(ms / 1000).toFixed(1)} s`;

const ControlPanel = ({ snap, log, ...on }: ControlPanelProps) => {
  const stopped = snap.mode === "STOPPED";
  const last = snap.episodes[snap.episodes.length - 1];
  const gripper = snap.holding ? `holding ${snap.holding}` : snap.closed ? "closed" : "open";

  return (
    <div className="tpanel">
      <dl className="tpanel__status">
        <div>
          <dt>Mode</dt>
          <dd data-mode={snap.mode}>{snap.mode}</dd>
        </div>
        <div>
          <dt>Gripper</dt>
          <dd>{gripper}</dd>
        </div>
        <div>
          <dt>Sorted</dt>
          <dd>
            {snap.sorted}/{snap.total} <span className="tpanel__tag">SIM</span>
          </dd>
        </div>
        {snap.limit && (
          <div>
            <dt>Joint</dt>
            <dd className="tpanel__limit">LIMIT</dd>
          </div>
        )}
      </dl>

      <div className="tpanel__latency">
        <label htmlFor="teleop-latency">Latency</label>
        <input
          id="teleop-latency"
          type="range"
          min={0}
          max={300}
          step={10}
          value={snap.latency}
          aria-valuetext={`${snap.latency} milliseconds, simulated`}
          onChange={(e) => on.onLatency(Number(e.currentTarget.value))}
        />
        <output htmlFor="teleop-latency">
          {snap.latency} ms <span className="tpanel__tag">SIM LINK</span>
        </output>
      </div>

      <div className="tpanel__buttons" role="group" aria-label="Cell controls">
        <button type="button" className="px-btn px-btn--secondary" aria-pressed={snap.closed} onClick={on.onGrip} disabled={stopped}>
          <span>Grip</span>
        </button>
        <button type="button" className="px-btn px-btn--ghost" aria-pressed={snap.deadman} onClick={() => on.onDeadman(!snap.deadman)}>
          <span>Deadman</span>
        </button>
        <button type="button" className="px-btn px-btn--ghost" aria-pressed={snap.recording} onClick={on.onRec}>
          <span>Rec</span>
        </button>
        <button
          type="button"
          className="px-btn px-btn--ghost"
          aria-pressed={snap.mode === "REPLAY"}
          onClick={on.onReplay}
          disabled={!last || stopped}
        >
          <span>Replay</span>
        </button>
        <button
          type="button"
          className="px-btn px-btn--ghost"
          aria-pressed={snap.mode === "AUTO"}
          onClick={on.onAuto}
          disabled={stopped}
          data-autofocus=""
        >
          <span>Auto demo</span>
        </button>
        <button type="button" className="px-btn px-btn--danger" aria-pressed={stopped} onClick={on.onStop}>
          <span>E-stop</span>
        </button>
        <button type="button" className="px-btn px-btn--primary" onClick={on.onClear} disabled={!stopped}>
          <span>Clear</span>
        </button>
      </div>

      <p className="tpanel__episode">
        {snap.recording
          ? `REC EP ${pad3(snap.episodeNo + 1)} · ${seconds(snap.recMs)} · your run`
          : last
          ? `EP ${pad3(last.n)} · ${seconds(last.durationMs)} · your run · ${snap.episodes.length} kept in this tab`
          : "No episodes yet. REC saves your run as a demonstration (last 3 kept in this tab)."}
      </p>

      {snap.complete && (
        <p className="tpanel__done">
          Calibration complete. Every skill is sorted.{" "}
          <a href={data.resumeUrl} className="text-link" target="_blank" rel="noopener noreferrer">
            Open the resume<span className="sr-only"> (PDF, opens in new tab)</span>
          </a>
        </p>
      )}

      {log.length > 0 && (
        <ol className="tpanel__log" aria-label="Cell log">
          {log.map((line, i) => (
            <li key={`${i}-${line}`}>{line}</li>
          ))}
        </ol>
      )}

      <TouchPad hold={snap.hold} onPad={on.onPad} onHold={on.onPadHold} onGrip={on.onGrip} onNudge={on.onNudge} />

      <p id="teleop-help" className="tpanel__hint">
        Arrows or WASD move the target. Space or Enter grips. X stops, C clears, R records. With Deadman on, hold Shift
        to move. Esc lets go of the controls.
      </p>
    </div>
  );
};

export default ControlPanel;
