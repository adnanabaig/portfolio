// Touch controls: a D-pad, GRIP, and HOLD (the deadman), each 56px or more.
// Pointer Events tracked by pointerId so multi-touch works (hold + move).
// touch-action: none sits on the pads only, so the page still scrolls.
import { useRef } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import type { Dir } from "./engine";

export interface TouchPadProps {
  hold: boolean;
  onPad(d: Dir, on: boolean): void;
  onHold(on: boolean): void;
  onGrip(): void;
  onNudge(d: Dir): void;
}

const DIRS: { d: Dir; label: string; path: string }[] = [
  { d: "up", label: "Move up", path: "M3 0h2v1h1v1h1v1H5v4H3V3H1V2h1V1h1z" },
  { d: "left", label: "Move left", path: "M0 3h1V2h1V1h1v2h4v2H3v2H2V6H1V5H0z" },
  { d: "right", label: "Move right", path: "M8 3H7V2H6V1H5v2H1v2h4v2h1V6h1V5h1z" },
  { d: "down", label: "Move down", path: "M3 8h2V7h1V6h1V5H5V1H3v4H1v1h1v1h1z" },
];

const TouchPad = ({ hold, onPad, onHold, onGrip, onNudge }: TouchPadProps) => {
  const active = useRef(new Map<number, Dir | "hold">());

  const press = (e: ReactPointerEvent<HTMLButtonElement>, what: Dir | "hold") => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.preventDefault();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* not capturable */
    }
    active.current.set(e.pointerId, what);
    if (what === "hold") onHold(true);
    else onPad(what, true);
  };

  const lift = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const what = active.current.get(e.pointerId);
    if (what === undefined) return;
    active.current.delete(e.pointerId);
    const still = [...active.current.values()].includes(what);
    if (still) return;
    if (what === "hold") onHold(false);
    else onPad(what, false);
  };

  const handlers = (what: Dir | "hold") => ({
    onPointerDown: (e: ReactPointerEvent<HTMLButtonElement>) => press(e, what),
    onPointerUp: lift,
    onPointerCancel: lift,
    onLostPointerCapture: lift,
    onContextMenu: (e: { preventDefault(): void }) => e.preventDefault(),
  });

  return (
    <div className="tpad" role="group" aria-label="Touch controls">
      <div className="tpad__dpad">
        {DIRS.map(({ d, label, path }) => (
          <button
            key={d}
            type="button"
            className={`tpad__btn tpad__btn--${d}`}
            aria-label={label}
            {...handlers(d)}
            // Keyboard or switch activation (no pointer): one nudge per press.
            onClick={(e) => {
              if (e.detail === 0) onNudge(d);
            }}
          >
            <svg viewBox="0 0 8 8" width="24" height="24" shapeRendering="crispEdges" aria-hidden="true" focusable="false">
              <path d={path} fill="currentColor" />
            </svg>
          </button>
        ))}
      </div>
      <button type="button" className="tpad__btn tpad__btn--grip" onClick={onGrip}>
        Grip
      </button>
      <button type="button" className="tpad__btn tpad__btn--hold" aria-pressed={hold} {...handlers("hold")}>
        Hold
      </button>
    </div>
  );
};

export default TouchPad;
