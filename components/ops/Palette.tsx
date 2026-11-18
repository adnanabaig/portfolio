// The command palette (Cmd/Ctrl+K, or the search launcher): a native modal
// <dialog> via useModal with an ARIA combobox over a grouped listbox. It
// only finds and triggers things that already exist: the section links,
// every dossier, every post, and the station controls. Each action calls the
// same setter, handler, or bus event as its on-page twin, and nothing here
// prints a number. A leading ">" hands the text to the OPS console (pre-filled,
// never auto-run). Lazy: StationLayer mounts it with clientOnly on first open.
import Router from "next/router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent, MouseEvent, ReactNode } from "react";
import portfolio from "../../data/portfolio.json";
import postsIndex from "../../data/posts-index.json";
import type { PortfolioData } from "../../types/portfolio";
import { emit, on, type BusEvents } from "../../lib/bus";
import { copyEmail } from "../../lib/copy";
import { fuzzy } from "../../lib/fuzzy";
import { PROJECT_ICONS, projectEntries } from "../../lib/projects";
import { getTheme, isCrtOn, isEstop, isPlain, prefersReducedMotion, setCrt, setEstop, setPlain, setTheme, type Theme } from "../../lib/station";
import type { SpriteName } from "../../lib/pixel/toPaths";
import { ISOToDate } from "../../utils";
import Kbd, { type KeyName } from "../pixel/Kbd";
import Sprite from "../pixel/Sprite";
import { setSound, soundSaved } from "./sound";
import { useModal } from "./useModal";

const data = portfolio as PortfolioData;
const posts = postsIndex as { slug: string; title: string; date: string }[];

export interface PaletteProps {
  onClose(restore: boolean): void;
}

type GroupId = "jump" | "dossiers" | "posts" | "actions" | "ops";

const GROUP_TITLES: Record<GroupId, string> = {
  jump: "Jump to",
  dossiers: "Dossiers",
  posts: "Posts",
  actions: "Actions",
  ops: "Console",
};

interface Row {
  id: string;
  group: GroupId;
  title: string;
  meta?: string;
  icon?: SpriteName;
  keys?: KeyName[];
  /** alt: Shift+Enter (or Shift+click). */
  run(alt: boolean): void;
}

interface Hit {
  row: Row;
  score: number;
  /** Matched indices, in the title or (when the title did not match) the meta line. */
  title: number[];
  meta: number[];
}

const SECTIONS: [string, string][] = [
  ["Top", "boot"],
  ["Selected work", "work-section"],
  ["Experience", "experience-section"],
  ["Independent builds", "engineering-section"],
  ["About", "about-section"],
  ["Writing", "writing-section"],
  ["Contact", "contact-section"],
];

const THEMES: [Theme, string][] = [
  ["default", "cyan"],
  ["amber", "amber"],
  ["mono", "mono"],
];

/** Station state the labels depend on. Browser only (the palette never renders on the server). */
const readFlags = () => ({
  estop: isEstop(),
  plain: isPlain(),
  crt: isCrtOn(),
  sound: soundSaved(),
  theme: getTheme(),
  home: window.location.pathname === "/",
});

const behavior = (): ScrollBehavior => (prefersReducedMotion() ? "auto" : "smooth");
const later = (fn: () => void, ms = 0) => window.setTimeout(fn, ms);

/** Toasts boot at idle with StationLayer; wait (briefly) for the region to subscribe. */
function toast(text: string, tone: BusEvents["ab:toast"]["tone"], tries = 0) {
  if (document.querySelector(".toast[data-ready]") || tries > 30) emit("ab:toast", { text, tone });
  else later(() => toast(text, tone, tries + 1), 100);
}

function navigate(path: string) {
  Router.push(path).catch(() => window.location.assign(path));
}

/** Text with each matched run wrapped in <mark> (teal and underlined, so not color alone). */
function marked(text: string, indices: number[]): ReactNode {
  if (!indices.length) return text;
  const out: ReactNode[] = [];
  let i = 0;
  let k = 0;
  while (i < text.length) {
    if (indices[k] === i) {
      let j = i;
      while (indices[k] === j) {
        j++;
        k++;
      }
      out.push(<mark key={i}>{text.slice(i, j)}</mark>);
      i = j;
    } else {
      const next = k < indices.length ? indices[k] : text.length;
      out.push(text.slice(i, next));
      i = next;
    }
  }
  return out;
}

export default function Palette({ onClose }: PaletteProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [live, setLive] = useState("");
  // Station state for labels like "Release E-STOP". Client-only component, so reading on init is safe.
  const [flags, setFlags] = useState(readFlags);

  useModal(dialogRef, onClose, inputRef);

  useEffect(() => {
    const read = () => setFlags(readFlags());
    const offs = [on("ab:estop", read), on("ab:sound", read), on("ab:plain", read)];
    return () => offs.forEach((off) => off());
  }, []);

  /** Opens a link through a real anchor inside the dialog, so the site's link handlers (Read the manual) see it. */
  const openLink = useCallback(
    (href: string) => {
      const a = document.createElement("a");
      a.href = href;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.hidden = true;
      dialogRef.current?.appendChild(a);
      a.click();
      a.remove();
      onClose(true);
    },
    [onClose]
  );

  const rows = useMemo<Row[]>(() => {
    const home = flags.home;
    const jump = (id: string) => {
      if (!home) {
        onClose(false);
        navigate(`/#${id}`);
        return;
      }
      const el = document.getElementById(id);
      if (!el) return;
      onClose(false);
      later(() => {
        if (window.location.hash !== `#${id}`) window.history.pushState(window.history.state, "", `#${id}`);
        el.scrollIntoView({ block: "start", behavior: behavior() });
        if (!el.hasAttribute("tabindex")) el.setAttribute("tabindex", "-1");
        el.focus({ preventScroll: true });
      });
    };
    const focusCard = (id: string) => {
      const card = document.getElementById(`card-${id}`);
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
    };
    const act = (fn: () => void) => () => {
      fn();
      onClose(true);
    };

    const list: Row[] = [];
    const writing = data.showBlog && posts.length > 0;
    SECTIONS.forEach(([title, id], bay) => {
      if (home ? !document.getElementById(id) : id === "writing-section" && !writing) return;
      list.push({ id: `jump-${id}`, group: "jump", title, meta: `Bay ${String(bay).padStart(2, "0")}${home ? "" : ", home page"}`, run: () => jump(id) });
    });
    projectEntries(data).forEach((e) => {
      const id = e.project.id;
      list.push({
        id: `dossier-${id}`,
        group: "dossiers",
        title: e.project.title,
        meta: `${e.unit} · ${e.project.category}`,
        icon: PROJECT_ICONS[id] ?? "skill-block",
        run: (alt) => {
          if (alt && home && focusCard(id)) return;
          onClose(false);
          navigate(`/work/${id}`);
        },
      });
    });
    if (data.showBlog) {
      posts.forEach((p) => {
        list.push({
          id: `post-${p.slug}`,
          group: "posts",
          title: p.title,
          meta: `Post · ${ISOToDate(p.date) ?? ""}`,
          run: () => {
            onClose(false);
            navigate(`/blog/${p.slug}`);
          },
        });
      });
    }
    const social = (id: string) => data.socials.find((s) => s.id === id);
    list.push(
      { id: "act-resume", group: "actions", title: "Open resume PDF", meta: "Opens in a new tab", run: () => openLink(data.resumeUrl) },
      {
        id: "act-email",
        group: "actions",
        title: "Copy email",
        meta: data.email,
        run: act(() => {
          void copyEmail().then((ok) => toast(ok ? "Email copied" : "Address selected. Press Ctrl+C or Cmd+C to copy.", ok ? "teal" : "amber"));
        }),
      },
      {
        id: "act-plain",
        group: "actions",
        title: flags.plain ? "Leave Text mode" : "Text mode",
        meta: "Plain text, one column",
        run: act(() => {
          const next = !isPlain();
          setPlain(next);
          toast(next ? "Text mode on" : "Text mode off", "teal");
        }),
      },
      {
        id: "act-estop",
        group: "actions",
        title: flags.estop ? "Release E-STOP" : "E-STOP",
        meta: flags.estop ? "Resume motion" : "Freeze all motion",
        run: act(() => {
          const next = !isEstop();
          setEstop(next);
          toast(next ? "Site stop on" : "Site stop off", next ? "coral" : "teal");
        }),
      }
    );
    // No spread or for...of in this file: their transpiled helpers would cost the lazy chunk about 1 kB.
    THEMES.forEach(([theme, name]) =>
      list.push({
        id: `act-theme-${name}`,
        group: "actions",
        title: `Theme ${name}`,
        meta: flags.theme === theme ? "Current theme" : name === "mono" ? "High contrast" : "Recolor the station",
        run: act(() => {
          setTheme(theme);
          toast(`Theme ${name}`, "amber");
        }),
      })
    );
    list.push(
      {
        id: "act-crt",
        group: "actions",
        title: flags.crt ? "CRT scanlines off" : "CRT scanlines on",
        meta: "Inside the monitors",
        run: act(() => {
          const next = !isCrtOn();
          setCrt(next);
          toast(next ? "CRT scanlines on" : "CRT scanlines off", "teal");
        }),
      },
      {
        id: "act-sound",
        group: "actions",
        title: flags.sound ? "Sound off" : "Sound on",
        meta: "Opt-in chiptune feedback",
        run: act(() => {
          const next = !soundSaved();
          setSound(next);
          toast(next ? "Sound on" : "Sound off", "teal");
        }),
      },
      { id: "act-ops", group: "actions", title: "Open OPS console", meta: "Type commands", keys: ["/"], run: () => emit("ab:open", { what: "ops" }) },
      { id: "act-keys", group: "actions", title: "Show keymap", meta: "Every shortcut", keys: ["?"], run: () => emit("ab:open", { what: "keys" }) }
    );
    ["github", "linkedin"].forEach((id) => {
      const s = social(id);
      if (s) list.push({ id: `act-${id}`, group: "actions", title: s.title, meta: "Opens in a new tab", run: () => openLink(s.href) });
    });
    return list;
  }, [flags, onClose, openLink]);

  const opsMode = query.trimStart().startsWith(">");

  const { groups, flat, empty } = useMemo(() => {
    const toConsole = (cmd: string): Row => ({
      id: "ops-run",
      group: "ops",
      title: cmd ? `Run in console: ${cmd}` : "Open the console",
      meta: "Opens it pre-filled. Enter there runs it.",
      keys: ["/"],
      run: () => emit("ab:open", { what: "ops", cmd }),
    });
    let hits: Hit[];
    let none = false;
    if (opsMode) {
      hits = [{ row: toConsole(query.trimStart().slice(1).trim()), score: 0, title: [], meta: [] }];
    } else {
      hits = [];
      rows.forEach((row) => {
        const t = fuzzy(query, row.title);
        // Meta matches (unit, category, date, address) rank below title matches.
        const m = t || !row.meta ? null : fuzzy(query, row.meta);
        if (t) hits.push({ row, score: t.score, title: t.indices, meta: [] });
        else if (m) hits.push({ row, score: m.score - 20, title: [], meta: m.indices });
      });
      if (!hits.length) {
        none = true;
        hits = [{ row: toConsole(query.trim()), score: 0, title: [], meta: [] }];
      }
    }
    const order: GroupId[] = ["jump", "dossiers", "posts", "actions", "ops"];
    const byGroup = order
      .map((id) => ({ id, hits: hits.filter((h) => h.row.group === id) }))
      .filter((g) => g.hits.length);
    if (query.trim() && !opsMode) {
      byGroup.forEach((g) => g.hits.sort((a, b) => b.score - a.score));
      // Groups follow their best match, so Enter takes the best hit overall.
      byGroup.sort((a, b) => b.hits[0].score - a.hits[0].score);
    }
    return { groups: byGroup, flat: byGroup.flatMap((g) => g.hits), empty: none };
  }, [rows, query, opsMode]);

  // A new query starts at the top.
  useEffect(() => setActive(0), [query]);

  const current = flat[Math.min(active, flat.length - 1)];
  const optId = (h: Hit) => `palette-opt-${h.row.id}`;

  useEffect(() => {
    if (!current) return;
    document.getElementById(optId(current))?.scrollIntoView({ block: "nearest" });
  }, [current]);

  // Polite result count, debounced so typing does not chatter.
  useEffect(() => {
    if (!query.trim()) {
      setLive("");
      return;
    }
    const t = window.setTimeout(() => setLive(empty ? "No match" : opsMode ? "Console command" : `${flat.length} ${flat.length === 1 ? "result" : "results"}`), 250);
    return () => window.clearTimeout(t);
  }, [query, flat.length, empty, opsMode]);

  const activate = (h: Hit | undefined, alt: boolean) => {
    if (h) h.row.run(alt);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.nativeEvent.isComposing) return;
    const n = flat.length;
    if (!n) return;
    const go = (i: number) => {
      e.preventDefault();
      setActive(i);
    };
    const a = Math.min(active, n - 1);
    if (e.key === "ArrowDown") go((a + 1) % n);
    else if (e.key === "ArrowUp") go((a - 1 + n) % n);
    else if (e.key === "Home") go(0);
    else if (e.key === "End") go(n - 1);
    else if (e.key === "PageDown") go(Math.min(n - 1, a + 5));
    else if (e.key === "PageUp") go(Math.max(0, a - 5));
    else if (e.key === "Enter") {
      e.preventDefault();
      activate(current, e.shiftKey);
    }
  };

  const keepFocus = (e: MouseEvent) => e.preventDefault();
  let index = -1;

  return (
    <dialog ref={dialogRef} className="palette" aria-labelledby="palette-title">
      <div className="px-frame palette__frame">
        <div className="px-titlebar">
          <h2 id="palette-title" className="px-titlebar__label palette__title">
            Command / AB-01
          </h2>
          <button type="button" className="px-btn px-btn--ghost px-btn--compact" onClick={() => onClose(true)}>
            <span>Close</span>
          </button>
        </div>
        <div className="palette__field">
          <svg className="palette__glass" width="16" height="16" viewBox="0 0 8 8" shapeRendering="crispEdges" aria-hidden="true" focusable="false">
            <path d="M2 0h3v1H2zM1 1h1v1H1zM5 1h1v1H5zM0 2h1v3H0zM6 2h1v3H6zM1 5h1v1H1zM5 5h1v1H5zM2 6h3v1H2zM6 6h1v1H6zM7 7h1v1H7z" fill="currentColor" />
          </svg>
          <input
            ref={inputRef}
            id="palette-input"
            className="palette__input"
            type="text"
            role="combobox"
            aria-expanded="true"
            aria-controls="palette-list"
            aria-autocomplete="list"
            aria-activedescendant={current ? optId(current) : undefined}
            aria-label="Search the station"
            aria-describedby="palette-hint"
            placeholder="Search, or type > for the console"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            autoComplete="off"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="go"
          />
        </div>
        <p id="palette-hint" className="sr-only">
          Up and Down move through results. Enter opens. Shift Enter jumps to a project card instead. Start with a greater-than sign to run a console command.
        </p>
        {empty && <p className="palette__empty">No match. Try the full console.</p>}
        <div id="palette-list" className="palette__list" role="listbox" aria-label="Results">
          {groups.map((g) => (
            <div key={g.id} className="palette__group" role="presentation">
              <div id={`palette-group-${g.id}`} className="palette__heading" aria-hidden="true">
                {GROUP_TITLES[g.id]}
              </div>
              <div role="group" aria-labelledby={`palette-group-${g.id}`}>
                {g.hits.map((h) => {
                  index += 1;
                  const i = index;
                  const selected = h === current;
                  return (
                    <div
                      key={h.row.id}
                      id={optId(h)}
                      role="option"
                      aria-selected={selected}
                      className="palette__row"
                      onPointerMove={() => i !== active && setActive(i)}
                      onMouseDown={keepFocus}
                      onClick={(e) => activate(h, e.shiftKey)}
                    >
                      {h.row.icon && (
                        <span className="palette__icon">
                          <Sprite name={h.row.icon} scale={1} />
                        </span>
                      )}
                      <span className="palette__text">
                        <span className="palette__name">{marked(h.row.title, h.title)}</span>
                        {h.row.meta && <span className="palette__meta">{marked(h.row.meta, h.meta)}</span>}
                      </span>
                      {(h.row.keys || selected) && (
                        <span className="palette__kbd" aria-hidden="true">
                          <Kbd keys={h.row.keys ?? ["enter"]} />
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <p className="palette__foot" aria-hidden="true">
          <span>
            <Kbd keys={["up"]} /> <Kbd keys={["down"]} /> move
          </span>
          <span>
            <Kbd keys={["enter"]} /> open
          </span>
          <span>
            <Kbd keys={["Shift", "enter"]} /> card
          </span>
          <span>
            <Kbd keys={[">"]} /> console
          </span>
          <span>
            <Kbd keys={["Esc"]} /> close
          </span>
        </p>
        <p className="sr-only" role="status" aria-live="polite">
          {live}
        </p>
      </div>
    </dialog>
  );
}
