// Mounted once by the Header. Owns the global shortcuts (Cmd/Ctrl+K for the
// command palette, "/" or "`" for the OPS console, "?" for the keymap), the
// three dialogs (each lazy-loaded on first open), and the idle boot: badge toast + rules, the console greeting,
// AB-01 puppetry, the inspection lamp, and a saved sound opt-in. Renders
// nothing on the server.
import { useCallback, useEffect, useRef, useState } from "react";
import { emit, on } from "../../lib/bus";
import { clientOnly } from "../../lib/clientOnly";
import { isEstop, isPlain, prefersReducedMotion } from "../../lib/station";
import { resumeSavedSound } from "./sound";

const Terminal = clientOnly(() => import("./Terminal"));
const Keymap = clientOnly(() => import("./Keymap"));
const Palette = clientOnly(() => import("./Palette"));
const Toast = clientOnly(() => import("../Toast"));

/** True for text fields and editable regions, where shortcuts must not fire. */
export function isTypingTarget(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  if (!el || typeof el.tagName !== "string") return false;
  return /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el.isContentEditable;
}

type Which = "ops" | "keys" | "palette";

/** The Cmd/Ctrl+K chord (Shift allowed, Alt not). */
export const isPaletteChord = (e: KeyboardEvent) => (e.metaKey || e.ctrlKey) && !e.altKey && (e.key || "").toLowerCase() === "k";

export default function StationLayer() {
  const [open, setOpen] = useState<Which | null>(null);
  const [cmd, setCmd] = useState("");
  const [booted, setBooted] = useState(false);
  const opener = useRef<HTMLElement | null>(null);
  const openRef = useRef<Which | null>(null);
  openRef.current = open;

  const show = useCallback((what: Which, from?: HTMLElement | null, text?: string) => {
    // A hand-off from the palette (to the console or keymap) keeps the palette's
    // opener, so focus still returns to where the visitor started.
    if (from || openRef.current !== "palette") opener.current = from ?? (document.activeElement as HTMLElement | null);
    setCmd(text ?? "");
    setOpen(what);
  }, []);

  const close = useCallback((restore: boolean) => {
    setOpen(null);
    if (!restore) return;
    const el = opener.current;
    window.setTimeout(() => {
      // The opener may sit in a menu that has since closed; fall back to the menu button.
      const target = el && el.isConnected && el.getClientRects().length ? el : document.querySelector<HTMLElement>(".menu-button");
      target?.focus();
    }, 0);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // The one chord shortcut, checked before the chord filter below. It works
      // from text fields too (devtool convention), but never inside the 404
      // level, and never over another open dialog. Pressed again, it closes.
      if (isPaletteChord(e)) {
        if ((e.target as Element | null)?.closest?.(".lost__level")) return;
        e.preventDefault();
        if (openRef.current === "palette") close(true);
        else if (!document.querySelector("dialog[open]")) emit("ab:open", { what: "palette" });
        return;
      }
      if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey || isTypingTarget(e.target)) return;
      if (document.querySelector("dialog[open]")) return;
      if (e.key === "/" || e.key === "`") {
        e.preventDefault();
        show("ops");
      } else if (e.key === "?") {
        e.preventDefault();
        show("keys");
      }
    };
    document.addEventListener("keydown", onKey);
    const offOpen = on("ab:open", ({ what, from, cmd: text }) => show(what, from, text));

    let done = false;
    const boot = () => {
      if (done) return;
      done = true;
      window.removeEventListener("pointerdown", boot, true);
      window.removeEventListener("keydown", boot, true);
      setBooted(true);
      import("../../lib/hello").then((m) => m.hello()).catch(() => undefined);
      import("../../lib/puppet").then((m) => m.start()).catch(() => undefined);
      // The inspection lamp: only for a hovering fine pointer, motion allowed, no E-STOP or Text Mode.
      if (window.matchMedia?.("(hover: hover) and (pointer: fine)").matches && !prefersReducedMotion() && !isEstop() && !isPlain()) {
        import("../../lib/lamp").then((m) => m.start()).catch(() => undefined);
      }
    };
    resumeSavedSound();
    window.addEventListener("pointerdown", boot, true);
    window.addEventListener("keydown", boot, true);
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
    const idle = w.requestIdleCallback ? w.requestIdleCallback(boot, { timeout: 2000 }) : window.setTimeout(boot, 1200);
    return () => {
      document.removeEventListener("keydown", onKey);
      offOpen();
      window.removeEventListener("pointerdown", boot, true);
      window.removeEventListener("keydown", boot, true);
      const c = window as Window & { cancelIdleCallback?: (id: number) => void };
      if (c.cancelIdleCallback) c.cancelIdleCallback(idle);
      else window.clearTimeout(idle);
    };
  }, [show, close]);

  return (
    <>
      {booted && <Toast />}
      {open === "palette" && <Palette onClose={close} />}
      {open === "ops" && <Terminal onClose={close} onKeys={() => setOpen("keys")} cmd={cmd} />}
      {open === "keys" && <Keymap onClose={close} />}
    </>
  );
}
