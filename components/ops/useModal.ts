// Shared modal behavior for the OPS console and the keymap placard: native
// <dialog> showModal (the page behind goes inert), an explicit Tab wrap,
// Esc and backdrop clicks close, and the caller restores focus.
import { useEffect, type RefObject } from "react";

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

export function useModal(ref: RefObject<HTMLDialogElement>, onClose: (restore: boolean) => void, initial?: RefObject<HTMLElement>) {
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (!d.open) {
      try {
        d.showModal();
      } catch {
        d.setAttribute("open", "");
      }
    }
    (initial?.current ?? d.querySelector<HTMLElement>(FOCUSABLE))?.focus();
    const onCancel = (e: Event) => {
      e.preventDefault();
      onClose(true);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onClose(true);
        return;
      }
      if (e.key !== "Tab" || e.defaultPrevented) return;
      const items = Array.from(d.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.getClientRects().length > 0);
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    const onClick = (e: MouseEvent) => {
      if (e.target === d) onClose(true);
    };
    d.addEventListener("cancel", onCancel);
    d.addEventListener("keydown", onKey);
    d.addEventListener("click", onClick);
    return () => {
      d.removeEventListener("cancel", onCancel);
      d.removeEventListener("keydown", onKey);
      d.removeEventListener("click", onClick);
      if (d.open) d.close();
    };
    // Runs once per mount; onClose is stable (useCallback in StationLayer).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
