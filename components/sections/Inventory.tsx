// INVENTORY: every skill from the resume as a toggle chip. Pressing one
// lights up each card and role that mentions it (see lib/skillIndex.ts) and
// dims the rest.
import { useEffect, useState } from "react";
import { groupAccent } from "../../lib/pixel/groups";
import { skillToken, type SkillHits } from "../../lib/skillIndex";
import type { SkillGroup } from "../../types/portfolio";

export interface InventoryProps {
  skills: SkillGroup[];
  index: Record<string, SkillHits>;
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

export function describeHits(skill: string, hits: SkillHits | undefined) {
  const p = hits?.projects.length ?? 0;
  const r = hits?.roles.length ?? 0;
  if (p && r) return `${skill}: used in ${plural(p, "project")} and ${plural(r, "role")}`;
  if (p) return `${skill}: used in ${plural(p, "project")}`;
  if (r) return `${skill}: used in ${plural(r, "role")}`;
  if (hits?.notes.length) return `${skill}: mentioned in About`;
  return `${skill}: listed on the resume`;
}

const HL_ROOT = "data-hl-active";

const Inventory = ({ skills, index }: InventoryProps) => {
  const [selected, setSelected] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  // Mirror the selection onto the page: matching targets get data-hl.
  useEffect(() => {
    const root = document.documentElement;
    const lit: Element[] = [];
    if (selected) {
      const token = skillToken(selected);
      document.querySelectorAll(`[data-skills~="${token}"]`).forEach((el) => {
        el.setAttribute("data-hl", "");
        lit.push(el);
      });
      root.setAttribute(HL_ROOT, "");
    }
    return () => {
      lit.forEach((el) => el.removeAttribute("data-hl"));
      root.removeAttribute(HL_ROOT);
    };
  }, [selected]);

  const toggle = (skill: string) => {
    const next = selected === skill ? null : skill;
    setSelected(next);
    setMessage(next ? describeHits(next, index[next]) : "Highlights cleared");
  };

  const clear = () => {
    setSelected(null);
    setMessage("Highlights cleared");
  };

  return (
    <div className="inventory">
      <div className="inventory__shelves">
        {skills.map((group, gi) => (
          <div key={group.group} className="shelf px-frame px-frame--inset" data-accent={groupAccent(gi)}>
            <h4 className="shelf__label">{group.group}</h4>
            <ul className="shelf__chips" aria-label={group.group}>
              {group.items.map((skill) => (
                <li key={skill}>
                  <button
                    type="button"
                    className="chip chip--skill"
                    aria-pressed={selected === skill}
                    onClick={() => toggle(skill)}
                  >
                    {skill}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="inventory__readout">
        <p className="inventory__status" role="status" aria-live="polite">
          {message}
        </p>
        <button type="button" className="px-btn px-btn--ghost" onClick={clear} disabled={!selected}>
          <span>Clear</span>
        </button>
      </div>
    </div>
  );
};

export default Inventory;
