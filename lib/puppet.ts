// AB-01 puppetry on the track, loaded at idle by components/ops/StationLayer.
// "ab:bot" (window.ab01, or a triple-click on the head logo) plays a wave or
// a dance, or recolors the visor. After 20 s with no input AB-01 sits and its
// visor dims; any input wakes it. Acts step at 4 fps; reduced motion holds a
// single pose instead and skips the idle sit; the site E-STOP freezes it.
// Works on data attributes of .track__walker; CSS swaps in the frame groups
// that components/ScrollTrack renders (track__a-w1, -w2, -sit).
import { on } from "./bus";
import { isEstop, prefersReducedMotion } from "./station";

const IDLE_MS = 20000;
const STEP_MS = 250;

interface Pose {
  af: string;
  flip?: boolean;
  hop?: boolean;
}

let started = false;

export function start() {
  if (started || typeof window === "undefined") return;
  started = true;
  let stepTimer = 0;
  let endTimer = 0;
  let idleTimer = 0;
  let lastInput = performance.now();
  const walker = () => document.querySelector<HTMLElement>(".track__walker");

  const end = () => {
    window.clearInterval(stepTimer);
    window.clearTimeout(endTimer);
    const w = walker();
    if (!w) return;
    delete w.dataset.act;
    delete w.dataset.af;
    delete w.dataset.flip;
    delete w.dataset.hop;
  };

  const perform = (act: string, poses: Pose[], ms: number) => {
    const w = walker();
    if (!w || isEstop()) return;
    end();
    w.dataset.act = act;
    const show = (p: Pose) => {
      w.dataset.af = p.af;
      w.toggleAttribute("data-flip", !!p.flip);
      w.toggleAttribute("data-hop", !!p.hop);
    };
    show(poses[0]);
    if (!prefersReducedMotion() && poses.length > 1) {
      let i = 1;
      stepTimer = window.setInterval(() => {
        if (!isEstop()) show(poses[i++ % poses.length]);
      }, STEP_MS);
    }
    if (ms > 0) endTimer = window.setTimeout(end, ms);
  };

  on("ab:bot", ({ act, color }) => {
    if (act === "color") {
      const w = walker();
      if (!w) return;
      if (!color || color === "teal") w.style.removeProperty("--teal");
      else w.style.setProperty("--teal", `var(--${color})`);
      return;
    }
    if (act === "wave") perform("wave", [{ af: "w1" }, { af: "w2" }], 2000);
    else perform("dance", [{ af: "w1", hop: true }, { af: "w2", flip: true }, { af: "w1", flip: true, hop: true }, { af: "w2" }], 3000);
  });

  const scheduleIdle = (wait: number) => {
    window.clearTimeout(idleTimer);
    idleTimer = window.setTimeout(() => {
      idleTimer = 0;
      const left = lastInput + IDLE_MS - performance.now();
      if (left > 50) {
        scheduleIdle(left);
        return;
      }
      if (!walker()?.dataset.act && !prefersReducedMotion() && !isEstop() && !document.hidden) perform("sit", [{ af: "sit" }], 0);
    }, wait);
  };
  const onInput = () => {
    lastInput = performance.now();
    if (walker()?.dataset.act === "sit") end();
    if (!idleTimer) scheduleIdle(IDLE_MS);
  };
  for (const k of ["pointermove", "pointerdown", "keydown", "scroll", "wheel", "touchstart"]) window.addEventListener(k, onInput, { passive: true });
  on("ab:estop", ({ on: latched }) => {
    if (latched) window.clearInterval(stepTimer);
  });
  scheduleIdle(IDLE_MS);
}
