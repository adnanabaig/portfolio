// The Teleop Cell shell (main bundle, kept tiny). SSR renders the static
// CellPoster plus a visible "Skip teleop" link and the TAKE CONTROL button;
// the engine loads only on intent and swaps a canvas into the same 16:9 box,
// so nothing shifts. Esc inside the cell hands focus back to TAKE CONTROL.
import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import Led from "../pixel/Led";
import CellPoster from "./CellPoster";
import type { TeleopLiveHandle, TeleopLiveProps } from "./TeleopLive";

const load = () => import("./TeleopLive");
const TeleopLive = dynamic<TeleopLiveProps>(load, {
  ssr: false,
  loading: () => <CellPoster />,
});

const ARROWS = new Set(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]);

const TeleopCell = () => {
  const [start, setStart] = useState<"teleop" | "auto" | null>(null);
  const [focused, setFocused] = useState(false);
  const [panelHost, setPanelHost] = useState<HTMLDivElement | null>(null);
  const takeRef = useRef<HTMLButtonElement | null>(null);
  const liveRef = useRef<TeleopLiveHandle | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const prefetched = useRef(false);

  const prefetch = useCallback(() => {
    if (prefetched.current) return;
    prefetched.current = true;
    load().catch(() => {
      prefetched.current = false;
    });
  }, []);

  // Prefetch at idle once the cell is at least half visible (skipped on Save-Data).
  useEffect(() => {
    const el = frameRef.current;
    const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    if (!el || conn?.saveData || typeof IntersectionObserver === "undefined") return;
    let idle = 0;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
        idle = w.requestIdleCallback ? w.requestIdleCallback(prefetch, { timeout: 4000 }) : window.setTimeout(prefetch, 2000);
      },
      { threshold: 0.5 }
    );
    io.observe(el);
    return () => {
      io.disconnect();
      const w = window as Window & { cancelIdleCallback?: (id: number) => void };
      if (w.cancelIdleCallback) w.cancelIdleCallback(idle);
      else clearTimeout(idle);
    };
  }, [prefetch]);

  const takeControl = useCallback(() => {
    if (start) liveRef.current?.focus();
    else setStart("teleop");
  }, [start]);

  const onTakeKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (!ARROWS.has(e.key)) return;
    e.preventDefault();
    takeControl();
  };

  const release = useCallback(() => {
    takeRef.current?.focus();
  }, []);

  return (
    <>
      <a href="#cell-after" className="skip-teleop">
        Skip teleop
      </a>
      <div className="px-frame px-frame--crt cell" data-marker="cell" ref={frameRef} onPointerEnter={prefetch}>
        <div className="px-titlebar">
          <span className="px-titlebar__label">CELL VIEW / AB-01</span>
          <span className="px-titlebar__right">
            <Led color={start ? "leaf" : "amber"} />
            <span>SIM</span>
          </span>
        </div>
        <div className="crt-screen cell__screen" id="cell-screen" data-live={start ? "" : undefined}>
          <div className="cell__overlay" data-hide={focused ? "" : undefined}>
            <button
              ref={takeRef}
              type="button"
              className="px-btn px-btn--primary"
              onClick={takeControl}
              onKeyDown={onTakeKey}
              onFocus={prefetch}
            >
              <span>Take control</span>
            </button>
            {!start && (
              <button type="button" className="px-btn px-btn--secondary" onClick={() => setStart("auto")}>
                <span>Auto demo</span>
              </button>
            )}
          </div>
          {start ? (
            <TeleopLive handleRef={liveRef} start={start} panelHost={panelHost} onFocusChange={setFocused} onRelease={release} />
          ) : (
            <CellPoster />
          )}
        </div>
        <div className="cell__controls" ref={setPanelHost} />
      </div>
      <span id="cell-after" tabIndex={-1} className="cell__after" />
    </>
  );
};

export default TeleopCell;
