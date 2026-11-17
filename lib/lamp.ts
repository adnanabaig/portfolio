// The inspection lamp: a hand-held light under a fine pointer. Over a lit
// frame (LAMP_SELECTOR) it rings the 2px border with light and washes the
// face (both capped in CSS: see "Lighting" in CLAUDE.md). Loaded at idle by
// components/ops/StationLayer only for a hovering fine pointer, with motion
// allowed, no E-STOP, and no Text Mode.
//
// Contract: one passive pointermove that stores x and y and schedules one
// rAF; no layout reads in pointermove. The hovered frame's rect is read once
// on enter (in the next rAF) and again only after a scroll or resize marks
// it stale. Each frame makes one style write: the --lamp position on the
// hovered element. E-STOP, reduced motion, and Text Mode detach it and clear
// every trace; releasing them re-attaches it.
import { on } from "./bus";
import { isEstop, isPlain, onReducedMotionChange, prefersReducedMotion } from "./station";

/** Frames that take the lamp. Wells, bezels, dialogs, and the toast do not. */
export const LAMP_SELECTOR =
  ".px-frame:not(.px-frame--inset):not(.px-frame--crt):not(.toast__card), .telemetry__item, .dossier__spec";

const FINE_HOVER = "(hover: hover) and (pointer: fine)";

/** True when the lamp may run: a hovering fine pointer, motion allowed, no E-STOP, no Text Mode. */
export function lampAllowed() {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia(FINE_HOVER).matches &&
    !prefersReducedMotion() &&
    !isEstop() &&
    !isPlain()
  );
}

let started = false;

export function start() {
  if (started || typeof window === "undefined") return;
  started = true;
  const root = document.documentElement;
  let attached = false;
  let hot: HTMLElement | null = null;
  let next: HTMLElement | null = null;
  let rect: DOMRect | null = null;
  let x = 0;
  let y = 0;
  let frame = 0;

  const schedule = () => {
    if (!frame) frame = window.requestAnimationFrame(paint);
  };

  function paint() {
    frame = 0;
    if (next !== hot) {
      hot?.classList.remove("is-lit");
      hot?.style.removeProperty("--lamp");
      hot = next;
      rect = null;
      hot?.classList.add("is-lit");
    }
    if (!hot) return;
    if (!rect) rect = hot.getBoundingClientRect();
    hot.style.setProperty("--lamp", `${Math.round(x - rect.left)}px ${Math.round(y - rect.top)}px`);
  }

  const onMove = (e: PointerEvent) => {
    x = e.clientX;
    y = e.clientY;
    if (hot || next) schedule();
  };
  const onOver = (e: PointerEvent) => {
    const target = e.target as Element | null;
    const el = target && typeof target.closest === "function" ? target.closest<HTMLElement>(LAMP_SELECTOR) : null;
    next = el && !el.closest("dialog") ? el : null;
    x = e.clientX;
    y = e.clientY;
    if (next !== hot) schedule();
  };
  const onOut = (e: PointerEvent) => {
    // Left the window.
    if (!e.relatedTarget) {
      next = null;
      schedule();
    }
  };
  const onStale = () => {
    rect = null;
    if (hot) schedule();
  };

  const attach = () => {
    if (attached || !lampAllowed()) return;
    attached = true;
    document.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerover", onOver, { passive: true });
    document.addEventListener("pointerout", onOut, { passive: true });
    window.addEventListener("scroll", onStale, { passive: true });
    window.addEventListener("resize", onStale, { passive: true });
    root.classList.add("lamp-on");
  };

  const detach = () => {
    if (!attached) return;
    attached = false;
    document.removeEventListener("pointermove", onMove);
    document.removeEventListener("pointerover", onOver);
    document.removeEventListener("pointerout", onOut);
    window.removeEventListener("scroll", onStale);
    window.removeEventListener("resize", onStale);
    if (frame) window.cancelAnimationFrame(frame);
    frame = 0;
    hot?.classList.remove("is-lit");
    hot?.style.removeProperty("--lamp");
    hot = next = null;
    rect = null;
    root.classList.remove("lamp-on");
  };

  const sync = () => (lampAllowed() ? attach() : detach());

  on("ab:estop", ({ on: stopped }) => (stopped ? detach() : sync()));
  onReducedMotionChange((reduced) => (reduced ? detach() : sync()));
  new MutationObserver(sync).observe(root, { attributes: true, attributeFilter: ["data-plain"] });
  attach();
}
