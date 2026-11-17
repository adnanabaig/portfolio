// The OPS console: a slide-up CRT drawer (native modal <dialog>) with a
// visible "Command" field, Tab completion, an Up/Down history ring, output
// in a polite role=log, quick-command chips, and Esc to close (focus goes
// back to whatever opened it). Lazy: this UI loads on first open, and the
// parser and command table (commands.ts) load with import() as it mounts.
import Router from "next/router";
import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import { emit } from "../../lib/bus";
import { prefersReducedMotion } from "../../lib/station";
import { KEYS, read, write } from "../../lib/storage";
import type { Ctx, Kind, Line } from "./commands";
import { setSound, soundSaved } from "./sound";
import { splitRow } from "./table";
import { useModal } from "./useModal";

export interface TerminalProps {
  onClose(restore: boolean): void;
  /** Swap to the keymap placard (keeps the original opener for focus return). */
  onKeys(): void;
  /** Pre-fills the input (the command palette's ">" hand-off). Never runs on its own. */
  cmd?: string;
}

const BANNER: Line[] = [
  { text: "STATION AB-01 OPS CONSOLE", kind: "head" },
  { text: "Type help for commands. Tab completes. Esc closes.", kind: "dim" },
];
const CHIPS = ["help", "resume", "projects", "contact"];
const HISTORY_MAX = 50;

function loadHistory(): string[] {
  try {
    const h = JSON.parse(read(KEYS.history, "session") || "[]");
    return Array.isArray(h) ? h.filter((x) => typeof x === "string").slice(-HISTORY_MAX) : [];
  } catch {
    return [];
  }
}

/** A table row (help, projects) renders as two cells, so a phone can stack them. */
function renderText(l: Line) {
  const row = l.kind === "row" ? splitRow(l.text) : null;
  if (!row) return l.text;
  return (
    <span className="ops__row-cells" style={{ ["--ops-col" as string]: `${row.col}ch` }}>
      <span className="ops__key">{row.name}</span> <span className="ops__val">{row.description}</span>
    </span>
  );
}

const behavior = (): ScrollBehavior => (prefersReducedMotion() ? "auto" : "smooth");

export default function Terminal({ onClose, onKeys, cmd = "" }: TerminalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const [lines, setLines] = useState<Line[]>(BANNER);
  const [value, setValue] = useState(cmd);
  const hist = useRef<string[]>([]);
  const cursor = useRef(-1);
  const latched = useRef(false);
  const lastKey = useRef(0);
  const parser = useRef<Promise<typeof import("./commands")> | null>(null);
  const table = useRef<typeof import("./commands") | null>(null);

  useModal(dialogRef, onClose, inputRef);

  useEffect(() => {
    hist.current = loadHistory();
    emit("ab:ops", { type: "open" });
    parser.current = import("./commands").then((m) => (table.current = m));
  }, []);

  useEffect(() => {
    const log = logRef.current;
    if (log) log.scrollTop = log.scrollHeight;
  }, [lines]);

  const push = useCallback((line: Line) => setLines((prev) => [...prev, line].slice(-200)), []);

  const exec = useCallback(
    async (input: string) => {
      push({ text: `ab01:~$ ${input}`, kind: "in" });
      const trimmed = input.trim();
      if (!trimmed) return;
      const h = hist.current;
      if (h[h.length - 1] !== trimmed) h.push(trimmed);
      hist.current = h.slice(-HISTORY_MAX);
      write(KEYS.history, JSON.stringify(hist.current), "session");
      cursor.current = -1;
      emit("ab:ops", { type: "run" });

      const later = (fn: () => void, ms = 0) => window.setTimeout(fn, ms);
      const ctx: Ctx = {
        latched: latched.current,
        print: (text: string, kind: Kind = "out") => push({ text, kind }),
        link: (text, href, external) => push({ text, kind: "out", href, external }),
        clear: () => setLines([]),
        close: () => onClose(false),
        history: () => hist.current.slice(),
        open: (url) => {
          window.open(url, "_blank", "noopener,noreferrer");
        },
        navigate: (path) => {
          onClose(false);
          Router.push(path).catch(() => window.location.assign(path));
        },
        copy: async (text) => {
          try {
            await navigator.clipboard.writeText(text);
            return true;
          } catch {
            return false;
          }
        },
        focusCard: (id) => {
          const card = document.getElementById(`project-${id}`)?.closest("article");
          if (!card) return false;
          onClose(false);
          later(() => {
            card.setAttribute("tabindex", "-1");
            card.scrollIntoView({ block: "start", behavior: behavior() });
            card.focus({ preventScroll: true });
            card.setAttribute("data-pulse", "");
            later(() => card.removeAttribute("data-pulse"), 700);
          });
          return true;
        },
        focusSection: (id) => {
          const section = document.getElementById(id);
          if (!section) return false;
          // Let the reply show for a beat, then hand over to the page.
          later(() => {
            onClose(false);
            later(() => {
              section.scrollIntoView({ block: "start", behavior: behavior() });
              const target = section.querySelector<HTMLElement>("button") ?? section;
              if (target === section) section.setAttribute("tabindex", "-1");
              target.focus({ preventScroll: true });
            });
          }, 900);
          return true;
        },
        ping: async () => {
          const t = performance.now();
          const res = await fetch("/robots.txt", { cache: "no-store" });
          await res.text();
          return performance.now() - t;
        },
        soundOn: soundSaved,
        setSound,
        showKeys: onKeys,
      };
      const ops = table.current ?? (await (parser.current ?? import("./commands")));
      const result = await ops.run(trimmed, ctx);
      latched.current = ctx.latched;
      if (result === "deny") emit("ab:ops", { type: "deny" });
    },
    [onClose, onKeys, push]
  );

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const input = value;
    setValue("");
    void exec(input);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    const h = hist.current;
    if (e.key === "ArrowUp" && h.length) {
      e.preventDefault();
      cursor.current = cursor.current < 0 ? h.length - 1 : Math.max(0, cursor.current - 1);
      setValue(h[cursor.current]);
    } else if (e.key === "ArrowDown" && cursor.current >= 0) {
      e.preventDefault();
      cursor.current += 1;
      if (cursor.current >= h.length) {
        cursor.current = -1;
        setValue("");
      } else setValue(h[cursor.current]);
    } else if (e.key === "Tab" && !e.shiftKey && value.trim()) {
      // Complete when there is something to complete; otherwise Tab moves focus as usual.
      const r = table.current?.complete(value);
      if (!r) return;
      if (!r.value && r.options.length < 2) return;
      e.preventDefault();
      if (r.value) setValue(r.value);
      if (r.options.length > 1) push({ text: r.options.join("  "), kind: "dim" });
    }
  };

  return (
    <dialog ref={dialogRef} className="ops" aria-labelledby="ops-title">
      <div className="px-frame px-frame--crt ops__frame">
        <div className="px-titlebar">
          <h2 id="ops-title" className="px-titlebar__label ops__title">
            OPS console / AB-01
          </h2>
          <button type="button" className="px-btn px-btn--ghost px-btn--compact" onClick={() => onClose(true)}>
            <span>Close</span>
          </button>
        </div>
        <div className="crt-screen ops__screen">
          <div ref={logRef} className="ops__log" role="log" aria-live="polite" aria-label="Console output">
            {lines.map((l, i) => (
              <p key={i} className={`ops__line ops__line--${l.kind}`}>
                {l.href ? (
                  <a href={l.href} {...(l.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
                    {l.text}
                    {l.external && <span className="sr-only"> (opens in new tab)</span>}
                  </a>
                ) : (
                  renderText(l)
                )}
              </p>
            ))}
          </div>
          <form className="ops__form" onSubmit={submit}>
            <label htmlFor="ops-input" className="ops__label">
              Command
            </label>
            <div className="ops__row">
              <span className="ops__prompt" aria-hidden="true">
                ab01:~$
              </span>
              <input
                id="ops-input"
                ref={inputRef}
                className="ops__input"
                value={value}
                onChange={(e) => {
                  setValue(e.target.value);
                  const now = performance.now();
                  if (now - lastKey.current > 45) {
                    lastKey.current = now;
                    emit("ab:ops", { type: "key" });
                  }
                }}
                onKeyDown={onKeyDown}
                autoComplete="off"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="go"
                aria-describedby="ops-hint"
              />
              <button type="submit" className="px-btn px-btn--primary px-btn--compact">
                <span>Run</span>
              </button>
            </div>
            <p id="ops-hint" className="sr-only">
              Type help and press Enter. Tab completes commands and project ids. Up and Down recall history.
            </p>
          </form>
        </div>
        <div className="ops__chips">
          <span className="ops__chips-label">Quick</span>
          <div className="ops__chips-group">
            {CHIPS.map((c) => (
              <button key={c} type="button" className="chip chip--skill" onClick={() => void exec(c)}>
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>
    </dialog>
  );
}
