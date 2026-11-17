// Mounted once by the Header. Owns the global shortcuts ("/" or "`" for the
// OPS console, "?" for the keymap), the two dialogs (each lazy-loaded on
// first open), and the idle boot: badge toast + rules, the console greeting,
// AB-01 puppetry, the inspection lamp, and a saved sound opt-in. Renders
// nothing on the server.
import { useCallback, useEffect, useRef, useState } from "react";
import { on } from "../../lib/bus";
import { clientOnly } from "../../lib/clientOnly";
import { isEstop, isPlain, prefersReducedMotion } from "../../lib/station";
import { resumeSavedSound } from "./sound";

const Terminal = clientOnly(() => import("./Terminal"));
const Keymap = clientOnly(() => import("./Keymap"));
const Toast = clientOnly(() => import("../Toast"));

/** True for text fields and editable regions, where shortcuts must not fire. */
export function isTypingTarget(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  if (!el || typeof el.tagName !== "string") return false;
  return /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el.isContentEditable;
}

type Which = "ops" | "keys";

export default function StationLayer() {
  const [open, setOpen] = useState<Which | null>(null);
  const [booted, setBooted] = useState(false);
  const opener = useRef<HTMLElement | null>(null);

  const show = useCallback((what: Which, from?: HTMLElement | null) => {
    opener.current = from ?? (document.activeElement as HTMLElement | null);
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
    const offOpen = on("ab:open", ({ what, from }) => show(what, from));

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
  }, [show]);

  return (
    <>
      {booted && <Toast />}
      {open === "ops" && <Terminal onClose={close} onKeys={() => setOpen("keys")} />}
      {open === "keys" && <Keymap onClose={close} />}
    </>
  );
}
