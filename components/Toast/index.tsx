// Badge toast: one role=status region, mounted once at idle by the station
// layer. It never takes focus; each message stays 4 s, queued if several
// arrive together. Mounting also starts the badge rules (lib/badges listen).
// The region is a manual popover, so a showing toast sits in the top layer
// above an open modal dialog (the OPS console earns "Root access" as it
// opens) instead of under its backdrop. Closed, it stays in normal flow
// (CSS keeps it displayed), so the live region always exists.
import { useEffect, useRef, useState } from "react";
import { on } from "../../lib/bus";
import { badgeTitle, listen } from "../../lib/badges";
import Sprite from "../pixel/Sprite";
// Lazy chunk: register the sprite sheet so the medal draws on mount.
import "../../lib/pixel/spriteData";

const SHOW_MS = 4000;

export default function Toast() {
  const [current, setCurrent] = useState<string | null>(null);
  const queue = useRef<string[]>([]);
  const timer = useRef<number>();
  const region = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const next = () => {
      const title = queue.current.shift() ?? null;
      setCurrent(title);
      timer.current = title ? window.setTimeout(next, SHOW_MS) : 0;
    };
    const off = on("ab:badge", ({ id }) => {
      queue.current.push(badgeTitle(id));
      if (!timer.current) next();
    });
    listen();
    return () => {
      off();
      window.clearTimeout(timer.current);
    };
  }, []);

  // Top layer: (re)show the popover for each message, and again whenever a
  // dialog opens while it is up, so it is always the topmost layer.
  useEffect(() => {
    const el = region.current;
    if (!el || typeof el.showPopover !== "function") return;
    if (!el.hasAttribute("popover")) el.setAttribute("popover", "manual");
    const raise = () => {
      try {
        if (el.matches(":popover-open")) el.hidePopover();
        if (current) el.showPopover();
      } catch {
        // A detached or already-closing node: the toast still shows in flow.
      }
    };
    raise();
    if (!current) return;
    const watch = new MutationObserver((records) => {
      if (records.some((r) => r.target instanceof HTMLDialogElement && r.target.open)) raise();
    });
    watch.observe(document.body, { subtree: true, attributes: true, attributeFilter: ["open"] });
    return () => watch.disconnect();
  }, [current]);

  return (
    <div ref={region} className="toast" role="status" aria-live="polite">
      {current && (
        <p className="toast__card px-frame" data-accent="amber">
          <Sprite name="glyph-badge" scale={2} />
          <span>
            <span className="toast__kicker">Visitor badge</span> {current}
          </span>
        </p>
      )}
    </div>
  );
}
