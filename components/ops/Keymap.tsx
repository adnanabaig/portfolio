// "?" opens this: a laminated control-panel placard listing every shortcut
// (page, console). Secrets appear only once found in this browser.
import { useEffect, useRef, useState } from "react";
import { SECRETS, discovered, type SecretId } from "../../lib/badges";
import Kbd, { type KeyName } from "../pixel/Kbd";
import { useModal } from "./useModal";

export interface KeymapProps {
  onClose(restore: boolean): void;
}

// Each row: the alternatives (each a key combo), then what it does.
const GROUPS: { title: string; keys: [KeyName[][], string][] }[] = [
  {
    title: "Page",
    keys: [
      [[["mod", "K"]], "Open the command palette"],
      [[["/"], ["`"]], "Open the OPS console"],
      [[["?"]], "Open this placard"],
      [[["Tab"]], "Move between controls"],
      [[["Esc"]], "Close a dialog"],
    ],
  },
  {
    title: "Command palette",
    keys: [
      [[["up"], ["down"]], "Move through results"],
      [[["enter"]], "Open the result"],
      [[["Shift", "enter"]], "Jump to the card instead (home page)"],
      [[[">"]], "Type a console command"],
    ],
  },
  {
    title: "OPS console",
    keys: [
      [[["enter"]], "Run the command"],
      [[["Tab"]], "Complete a command or project id"],
      [[["up"], ["down"]], "Walk command history"],
      [[["Esc"]], "Close the console"],
    ],
  },
];

export default function Keymap({ onClose }: KeymapProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [found, setFound] = useState<Set<SecretId>>(() => new Set());
  useModal(ref, onClose, closeRef);

  useEffect(() => setFound(discovered()), []);

  return (
    <dialog ref={ref} className="placard-dialog" aria-labelledby="keymap-title">
      <div className="placard">
        <div className="placard__head">
          <h2 id="keymap-title" className="placard__title">
            Station <span className="whitespace-nowrap">AB-01</span> controls
          </h2>
          <button ref={closeRef} type="button" className="px-btn px-btn--ghost px-btn--compact" onClick={() => onClose(true)}>
            <span>Close</span>
          </button>
        </div>
        <div className="placard__grid">
          {GROUPS.map((g) => (
            <section key={g.title} className="placard__group" aria-label={g.title}>
              <h3 className="placard__group-title">{g.title}</h3>
              <dl>
                {g.keys.map(([alts, what]) => (
                  <div key={what} className="placard__row">
                    <dt>
                      {alts.map((keys, i) => (
                        <span key={keys.join("+")}>
                          {i > 0 && <span className="placard__or"> or </span>}
                          <Kbd keys={keys} />
                        </span>
                      ))}
                    </dt>
                    <dd>{what}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
          <section className="placard__group" aria-label="Secrets found">
            <h3 className="placard__group-title">Secrets found</h3>
            {found.size === 0 ? (
              <p className="placard__note">None yet. Curious engineers find them.</p>
            ) : (
              <ul className="placard__secrets">
                {SECRETS.filter((s) => found.has(s.id)).map((s) => (
                  <li key={s.id}>{s.how}</li>
                ))}
              </ul>
            )}
            <p className="placard__note">
              Found: {found.size} of {SECRETS.length} (your run).
            </p>
          </section>
        </div>
        <p className="placard__foot">Nothing here is required to read the site.</p>
      </div>
    </dialog>
  );
}
