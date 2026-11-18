// Toasts: one role=status region, mounted once at idle by the station layer,
// for visitor badges (ab:badge) and short action confirmations (ab:toast,
// from the command palette, COPY ADDRESS, and the OPS theme, crt, and sound
// commands). It never takes focus; each message stays 4 s, queued if several
// arrive together, and an action toast shows a drain bar for that time
// (static under E-STOP and reduced motion). Mounting also starts the badge
// rules (lib/badges listen) and marks the region data-ready.
// The region is a manual popover, so a showing toast sits in the top layer
// above an open modal dialog (the OPS console earns "Root access" as it
// opens) instead of under its backdrop. Closed, it stays in normal flow
// (CSS keeps it displayed), so the live region always exists.
import { useEffect, useRef, useState } from "react";
import { on, type BusEvents } from "../../lib/bus";
import { badgeTitle, listen } from "../../lib/badges";
import Sprite from "../pixel/Sprite";
// Lazy chunk: register the sprite sheet so the medal draws on mount.
import "../../lib/pixel/spriteData";

const SHOW_MS = 4000;

type Message = ({ kind: "badge"; text: string } | ({ kind: "action" } & BusEvents["ab:toast"])) & { seq: number };

export default function Toast() {
  const [current, setCurrent] = useState<Message | null>(null);
  const queue = useRef<Message[]>([]);
  const seq = useRef(0);
  const timer = useRef<number>();
  const region = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const next = () => {
      const m = queue.current.shift() ?? null;
      setCurrent(m);
      timer.current = m ? window.setTimeout(next, SHOW_MS) : 0;
    };
    const push = (m: Message) => {
      queue.current.push(m);
      if (!timer.current) next();
    };
    const offs = [
      on("ab:badge", ({ id }) => push({ kind: "badge", text: badgeTitle(id), seq: ++seq.current })),
      on("ab:toast", ({ text, tone }) => push({ kind: "action", text, tone, seq: ++seq.current })),
    ];
    listen();
    region.current?.setAttribute("data-ready", "");
    return () => {
      offs.forEach((off) => off());
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
      {current?.kind === "badge" && (
        <p key={current.seq} className="toast__card px-frame" data-accent="amber">
          <Sprite name="glyph-badge" scale={2} />
          <span>
            <span className="toast__kicker">Visitor badge</span> {current.text}
          </span>
        </p>
      )}
      {current?.kind === "action" && (
        <p key={current.seq} className="toast__card toast__card--action px-frame" data-tone={current.tone}>
          <span className="toast__rail" aria-hidden="true" />
          <span>{current.text}</span>
          <span className="toast__drain" aria-hidden="true" />
        </p>
      )}
    </div>
  );
}
