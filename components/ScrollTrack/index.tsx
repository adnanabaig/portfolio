// The AB-01 track under the status bar. AB-01 walks to whichever section you
// are reading: x is a piecewise-linear map of the reading line between
// section tops, chased at up to 600px/s with a 4-frame walk at 8 fps. Long
// jumps (more than two checkpoints) use a short stepped "beam" instead.
// Reduced motion: AB-01 cuts between checkpoints, no walk frames, no beam.
// E-STOP: the loop stops where it is. The strip is decorative (aria-hidden);
// its checkpoint links duplicate the nav for pointer users only.
// The extra frame groups (wave, sit) are driven by lib/puppet.ts, loaded at
// idle: window.ab01, the head-logo triple-click, and the 20 s idle sit.
import { useEffect, useRef } from "react";
import { onReducedMotionChange, prefersReducedMotion, isEstop } from "../../lib/station";
import { on as onBus } from "../../lib/bus";
import { fillFor, spritePaths } from "../../lib/pixel/toPaths";
import type { Sections } from "../../hooks/useSections";

export interface Checkpoint {
  id: string;
  title: string;
}

export interface ScrollTrackProps {
  checkpoints: Checkpoint[];
  sections: Sections;
}

const FRAMES = [0, 1, 2, 3, 4];
const MAX_SPEED = 600; // px/s
const WALK_FPS = 8;
const BEAM_MS = 300;
// Battery cells on AB-01's back pack, bottom cell first (sprite pixels).
const CELLS = [16, 15, 14, 13, 12];

const ACT_FRAMES: { cls: string; name: "ab01-wave" | "ab01-sit"; frame: number }[] = [
  { cls: "w1", name: "ab01-wave", frame: 0 },
  { cls: "w2", name: "ab01-wave", frame: 1 },
  { cls: "sit", name: "ab01-sit", frame: 0 },
];

const paths = (name: "ab01" | "ab01-wave" | "ab01-sit", frame: number) =>
  spritePaths(name, frame).map((p) => <path key={p.key} d={p.d} style={{ fill: fillFor(p.key) }} />);

function walkerFrames() {
  return [
    ...FRAMES.map((f) => (
      <g key={f} className={`track__f track__f${f}`}>
        {paths("ab01", f)}
      </g>
    )),
    ...ACT_FRAMES.map((a) => (
      <g key={a.cls} className={`track__a track__a-${a.cls}`}>
        {paths(a.name, a.frame)}
      </g>
    )),
  ];
}

const ScrollTrack = ({ checkpoints, sections }: ScrollTrackProps) => {
  const railRef = useRef<HTMLDivElement | null>(null);
  const walkerRef = useRef<HTMLDivElement | null>(null);
  const trailRef = useRef<HTMLDivElement | null>(null);
  const cellsRef = useRef<(SVGRectElement | null)[]>([]);
  const activeRef = useRef(sections.activeIndex);
  activeRef.current = sections.activeIndex;
  const wakeRef = useRef<() => void>(() => undefined);
  const n = checkpoints.length;

  useEffect(() => {
    const rail = railRef.current;
    const walker = walkerRef.current;
    const trail = trailRef.current;
    if (!rail || !walker || !trail) return;
    const st = sections.state;
    let reduced = prefersReducedMotion();
    let width = rail.clientWidth - 16;
    let x = -1;
    let raf = 0;
    let last = 0;
    let walkClock = 0;
    let frame = -1;
    let facingLeft = false;
    let battery = -1;
    let beam: { t: number; to: number; jumped: boolean } | null = null;
    let blinkTimer: ReturnType<typeof setTimeout> | undefined;
    let lidTimer: ReturnType<typeof setTimeout> | undefined;
    let placed = st.ready;

    const fracFor = () => {
      if (reduced) return n > 1 ? activeRef.current / (n - 1) : 0;
      const s = st.stops;
      const line = st.line;
      if (n < 2 || line <= s[0]) return 0;
      if (line >= s[n - 1]) return 1;
      for (let i = 0; i < n - 1; i++) {
        if (line < s[i + 1]) {
          const span = s[i + 1] - s[i];
          const f = span > 0 ? (line - s[i]) / span : 1;
          return (i + f) / (n - 1);
        }
      }
      return 1;
    };

    const setFrame = (f: number) => {
      if (f === frame) return;
      frame = f;
      walker.dataset.frame = String(f);
    };

    const apply = () => {
      walker.style.transform = `translate3d(${Math.round(x)}px,0,0)`;
      trail.style.transform = `scaleX(${width > 0 ? Math.max(0, Math.min(1, x / width)) : 0})`;
      walker.classList.toggle("track__walker--left", facingLeft);
      const level = Math.round(st.progress * CELLS.length);
      if (level !== battery) {
        battery = level;
        cellsRef.current.forEach((cell, i) => cell?.setAttribute("data-on", i < level ? "1" : "0"));
      }
    };

    const tick = (t: number) => {
      raf = 0;
      if (isEstop()) return;
      const dt = Math.min(0.05, Math.max(0, (t - last) / 1000));
      last = t;
      const target = fracFor() * width;
      if (!placed && st.ready) {
        // First real measurement: appear at the right checkpoint, no walk-in.
        placed = true;
        x = target;
      }
      const d = target - x;
      const spacing = n > 1 ? width / (n - 1) : width;
      let moving = false;

      if (reduced) {
        x = target;
        beam = null;
        setFrame(0);
      } else if (beam || Math.abs(d) > spacing * 2 + 1) {
        if (!beam) beam = { t: 0, to: target, jumped: false };
        beam.t += dt * 1000;
        beam.to = target;
        const k = Math.min(1, beam.t / BEAM_MS);
        // Out for the first half, in for the second, in 4 hard steps each.
        const phase = k < 0.5 ? 1 - Math.ceil(k * 8) / 4 : Math.floor((k - 0.5) * 8) / 4 + 0.25;
        if (k >= 0.5 && !beam.jumped) {
          facingLeft = beam.to < x;
          x = beam.to;
          beam.jumped = true;
        }
        walker.style.setProperty("--beam", String(Math.min(1, phase)));
        walker.dataset.beam = "";
        setFrame(0);
        moving = true;
        if (k >= 1) {
          beam = null;
          delete walker.dataset.beam;
          walker.style.removeProperty("--beam");
        }
      } else {
        // Ease out, capped at 600px/s.
        let step = d * (1 - Math.exp(-dt * 7));
        const cap = MAX_SPEED * dt;
        step = Math.max(-cap, Math.min(cap, step));
        if (Math.abs(d) < 0.3) step = d;
        x += step;
        const speed = dt > 0 ? Math.abs(step) / dt : 0;
        moving = Math.abs(target - x) > 0.3;
        if (speed > 8) {
          facingLeft = step < 0;
          walkClock += dt;
          setFrame(1 + (Math.floor(walkClock * WALK_FPS) % 4));
        } else {
          walkClock = 0;
          setFrame(0);
        }
      }
      apply();
      if (moving) raf = requestAnimationFrame(tick);
      else setFrame(0);
    };

    const wake = () => {
      if (raf || isEstop() || document.hidden) return;
      last = performance.now();
      raf = requestAnimationFrame(tick);
    };
    wakeRef.current = wake;

    // Idle blink every 3 to 5 s (motion only, never faster than that).
    const scheduleBlink = () => {
      blinkTimer = setTimeout(() => {
        if (!reduced && !isEstop() && !document.hidden && frame === 0) {
          walker.dataset.blink = "";
          lidTimer = setTimeout(() => delete walker.dataset.blink, 160);
        }
        scheduleBlink();
      }, 3000 + Math.random() * 2000);
    };

    // First placement: no walk from the left edge.
    x = fracFor() * width;
    setFrame(0);
    apply();
    scheduleBlink();

    const unsub = sections.subscribe(wake);
    const ro = new ResizeObserver(() => {
      const ratio = width > 0 ? x / width : 0;
      width = rail.clientWidth - 16;
      x = ratio * width;
      apply();
      wake();
    });
    ro.observe(rail);
    const offMotion = onReducedMotionChange((r) => {
      reduced = r;
      wake();
    });
    const offStop = onBus("ab:estop", ({ on }) => {
      if (on && raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      } else if (!on) wake();
    });
    const onVis = () => {
      if (!document.hidden) wake();
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      if (raf) cancelAnimationFrame(raf);
      clearTimeout(blinkTimer);
      clearTimeout(lidTimer);
      unsub();
      ro.disconnect();
      offMotion();
      offStop();
      document.removeEventListener("visibilitychange", onVis);
    };
    // sections.state and subscribe are stable for a given checkpoint list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n]);

  // Reduced motion cuts on section change; make sure the loop sees it.
  useEffect(() => {
    wakeRef.current();
  }, [sections.activeIndex]);

  return (
    <div className="track" aria-hidden="true" data-slot="track">
      <div className="container mx-auto">
        <div className="track__rail" ref={railRef}>
          <div className="track__trail" ref={trailRef} />
          <ol className="track__marks">
            {checkpoints.map((cp, i) => (
              <li
                key={cp.id}
                className="track__mark"
                data-on={i <= sections.activeIndex ? "" : undefined}
                style={{ left: `${n > 1 ? (i / (n - 1)) * 100 : 0}%` }}
              >
                <a href={`#${cp.id}`} tabIndex={-1} title={cp.title} className="track__hit">
                  <span className="sr-only">{cp.title}</span>
                </a>
              </li>
            ))}
          </ol>
          <div className="track__walker" ref={walkerRef} data-frame="0">
            <span className="track__beam" />
            <svg viewBox="0 0 16 24" shapeRendering="crispEdges" className="track__bot" focusable="false">
              {walkerFrames()}
              <g className="track__over">
                {CELLS.map((y, i) => (
                  <rect
                    key={y}
                    ref={(el) => {
                      cellsRef.current[i] = el;
                    }}
                    x={2}
                    y={y}
                    width={2}
                    height={1}
                    className="track__cell"
                    data-on="0"
                  />
                ))}
                <rect x={6} y={0} width={1} height={1} className="track__led" />
                <rect x={8} y={6} width={2} height={2} className="track__lid" />
                <rect x={11} y={6} width={2} height={2} className="track__lid" />
              </g>
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScrollTrack;
