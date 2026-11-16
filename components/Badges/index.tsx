// "Visitor badges (earned in this browser)": client-only (next/dynamic with
// ssr: false), so the server HTML never contains it and it can never be
// confused with the real awards above it. Locked badges show a text hint.
import { useEffect, useState } from "react";
import { on } from "../../lib/bus";
import { BADGES, earned, type BadgeId } from "../../lib/badges";
import Sprite from "../pixel/Sprite";

export default function VisitorBadges() {
  const [have, setHave] = useState<Set<BadgeId> | null>(null);

  useEffect(() => {
    setHave(earned());
    return on("ab:badge", () => setHave(earned()));
  }, []);

  if (!have) return null;

  return (
    <section className="visitor-badges" aria-labelledby="visitor-badges-heading">
      <h3 id="visitor-badges-heading" className="sub-title">
        Visitor badges <span className="sub-title__count">(earned in this browser)</span>
      </h3>
      <p className="section-sub">
        Small rewards for exploring this site. They are not awards and are stored only on this device. Your run: {have.size} of{" "}
        {BADGES.length}.
      </p>
      <ul className="visitor-badges__list">
        {BADGES.map((b) => {
          const got = have.has(b.id);
          return (
            <li key={b.id} className="vbadge px-frame px-frame--inset" data-earned={got ? "" : undefined}>
              <Sprite name="glyph-badge" scale={3} mono={!got} className="vbadge__icon" />
              <div>
                <p className="vbadge__title">{b.title}</p>
                <p className="vbadge__state">{got ? "Earned" : `Locked. ${b.hint}`}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
