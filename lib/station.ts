// Station-wide switches that live on <html> as data attributes, so CSS can
// react before React hydrates (pages/_document applies the saved values
// before first paint). Tiny getters and setters; setters persist and notify.
import { emit } from "./bus";
import { KEYS, write } from "./storage";

const root = () => (typeof document === "undefined" ? null : document.documentElement);

/** Global E-STOP: html[data-estop] freezes every animation, the track, and the 404 level. */
export const isEstop = () => !!root()?.hasAttribute("data-estop");

export function setEstop(on: boolean) {
  const el = root();
  if (!el) return;
  el.toggleAttribute("data-estop", on);
  write(KEYS.estop, on ? "1" : null);
  emit("ab:estop", { on });
}

/** Text Mode: html[data-plain]. */
export const isPlain = () => !!root()?.hasAttribute("data-plain");

export function setPlain(on: boolean) {
  const el = root();
  if (!el) return;
  el.toggleAttribute("data-plain", on);
  write(KEYS.plain, on ? "1" : "0");
}

export type Theme = "default" | "amber" | "mono";

export const getTheme = (): Theme => {
  const t = root()?.getAttribute("data-theme");
  return t === "amber" || t === "mono" ? t : "default";
};

export function setTheme(theme: Theme) {
  const el = root();
  if (!el) return;
  if (theme === "default") el.removeAttribute("data-theme");
  else el.setAttribute("data-theme", theme);
  write(KEYS.theme, theme === "default" ? null : theme);
}

/** CRT scanlines inside bezels: html[data-crt="off"] hides them. */
export const isCrtOn = () => root()?.getAttribute("data-crt") !== "off";

export function setCrt(on: boolean) {
  const el = root();
  if (!el) return;
  if (on) el.removeAttribute("data-crt");
  else el.setAttribute("data-crt", "off");
  write(KEYS.crt, on ? null : "off");
}

const RM_QUERY = "(prefers-reduced-motion: reduce)";

/** The single reduced-motion flag every animated piece reads. */
export const prefersReducedMotion = () =>
  typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia(RM_QUERY).matches;

/** Calls back when the reduced-motion preference changes; returns an unsubscribe. */
export function onReducedMotionChange(cb: (reduced: boolean) => void) {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return () => undefined;
  const mq = window.matchMedia(RM_QUERY);
  const listener = () => cb(mq.matches);
  if (mq.addEventListener) mq.addEventListener("change", listener);
  else mq.addListener(listener);
  return () => {
    if (mq.removeEventListener) mq.removeEventListener("change", listener);
    else mq.removeListener(listener);
  };
}
