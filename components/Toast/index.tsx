// Badge toast: one role=status region, mounted once at idle by the station
// layer. It never takes focus; each message stays 4 s, queued if several
// arrive together. Mounting also starts the badge rules (lib/badges listen).
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

  return (
    <div className="toast" role="status" aria-live="polite">
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
