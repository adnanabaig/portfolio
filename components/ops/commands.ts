// The OPS console's parser and command table. Loaded with the terminal on
// first open. Every fact printed here comes from data/portfolio.json or
// lib/facts.ts; numbers the visitor generates (ping, clock, badge counts,
// latency) are labeled "your link", "your clock", "your run", or SIM.
// DOM side effects go through Ctx, so scripts/check-ops.mjs can run every
// command in node with a stub and check the output against the copy rules.
import portfolio from "../../data/portfolio.json";
import type { PortfolioData } from "../../types/portfolio";
import { issuesResolved, automatedTests, questLevels, robotPrograms, skillCount } from "../../lib/facts";
import { BADGES, discover, earn, earned, type SecretId } from "../../lib/badges";
import { getTheme, isCrtOn, isEstop, setCrt, setEstop, setTheme } from "../../lib/station";
import { tableRows } from "./table";

const data = portfolio as PortfolioData;

/** "row" is a table row from tableRows (help, projects): the console renders it as two cells. */
export type Kind = "in" | "out" | "ok" | "err" | "dim" | "head" | "row";

export interface Line {
  text: string;
  kind: Kind;
  href?: string;
  external?: boolean;
}

export interface Ctx {
  print(text: string, kind?: Kind): void;
  link(text: string, href: string, external?: boolean): void;
  clear(): void;
  /** Close the console without restoring focus (the command moves focus itself). */
  close(): void;
  history(): string[];
  open(url: string): void;
  navigate(path: string): void;
  copy(text: string): Promise<boolean>;
  /** Scroll to, focus, and pulse a project card. False when it is not on this page. */
  focusCard(id: string): boolean;
  /** Focus a section (by id). False when it is not on this page. */
  focusSection(id: string): boolean;
  takeControl(): boolean;
  cellLive(): boolean;
  setLatency(ms: number): void;
  ping(): Promise<number>;
  soundOn(): boolean;
  setSound(on: boolean): void;
  showKeys(): void;
  /** Console latch (rm -rf /): only `clear` releases it. */
  latched: boolean;
}

export interface Command {
  name: string;
  /** Usage hint after the name, e.g. "<id>". */
  usage?: string;
  help: string;
  aliases?: string[];
  /** Hidden from `help` (eggs). */
  secret?: boolean;
  run(args: string[], ctx: Ctx): void | Promise<void>;
}

const projects = [...data.projects, ...data.engineeringProjects];
const jobs = data.experience.filter((j) => !j.hidden);
const levels = new Map(questLevels().map((l) => [l.id, l.level]));
const social = (id: string) => data.socials.find((s) => s.id === id);
const THEMES = ["cyan", "amber", "mono"];
const ONOFF = ["on", "off"];

function found(id: SecretId) {
  discover(id);
}

const COMMANDS: Command[] = [
  {
    name: "help",
    help: "List commands.",
    run(_a, c) {
      c.print("Commands", "head");
      const rows = COMMANDS.filter((cmd) => !cmd.secret).map((cmd): [string, string] => [
        [cmd.name, ...(cmd.aliases ?? [])].join(", ") + (cmd.usage ? ` ${cmd.usage}` : ""),
        cmd.help,
      ]);
      for (const row of tableRows(rows)) c.print(row, "row");
      c.print("Tab completes. Up and Down walk history. Esc closes.", "dim");
    },
  },
  {
    name: "whoami",
    help: "Name, role, and base.",
    run(_a, c) {
      c.print(data.name, "head");
      c.print(data.hero.eyebrow);
      c.print(data.hero.lede);
    },
  },
  {
    name: "status",
    help: "Station status and telemetry.",
    run(_a, c) {
      const job = jobs.find((j) => j.current);
      c.print("Station AB-01", "head");
      if (job) c.print(`Current: ${job.role}, ${job.org} (${job.period})`, "ok");
      c.print(`Issues resolved: ${issuesResolved}`);
      c.print(`Robot programs: ${robotPrograms}`);
      c.print(`Automated tests: ${automatedTests}`);
      c.print(`Skills listed: ${skillCount}`);
      c.print(`Site E-STOP: ${isEstop() ? "engaged" : "clear"}`, isEstop() ? "err" : "ok");
      c.print(`Theme: ${getTheme() === "default" ? "cyan" : getTheme()}. Sound: ${c.soundOn() ? "on" : "off"}. CRT: ${isCrtOn() ? "on" : "off"}.`, "dim");
      c.print(`Visitor badges: ${earned().size} of ${BADGES.length} (your run, this browser)`, "dim");
    },
  },
  {
    name: "resume",
    help: "Open the resume PDF.",
    run(_a, c) {
      earn("manual");
      c.link("Resume (PDF)", data.resumeUrl, true);
      c.open(data.resumeUrl);
    },
  },
  {
    name: "projects",
    aliases: ["ls"],
    help: "List project ids.",
    run(_a, c) {
      c.print("Selected work", "head");
      // One width for both tables, so the two lists line up.
      const rows = tableRows(projects.map((p): [string, string] => [p.id, p.title]));
      rows.slice(0, data.projects.length).forEach((row) => c.print(row, "row"));
      c.print("Independent builds", "head");
      rows.slice(data.projects.length).forEach((row) => c.print(row, "row"));
      c.print("Type open <id> to jump to a card, or dossier <id> for its full page.", "dim");
    },
  },
  {
    name: "open",
    usage: "<id>",
    help: "Jump to a project card.",
    run(args, c) {
      const id = args[0];
      const p = projects.find((x) => x.id === id);
      if (!p) {
        c.print(id ? `No module named ${id}. Type projects for the list.` : "Usage: open <id>. Type projects for the list.", "err");
        return;
      }
      c.print(`Opening ${p.title}.`, "ok");
      c.print(`For the full page, type dossier ${p.id}.`, "dim");
      if (!c.focusCard(p.id)) c.navigate(`/#card-${p.id}`);
    },
  },
  {
    name: "dossier",
    usage: "<id>",
    help: "Open a project's full page.",
    run(args, c) {
      const id = args[0];
      const p = projects.find((x) => x.id === id);
      if (!p) {
        c.print(id ? `No module named ${id}. Type projects for the list.` : "Usage: dossier <id>. Type projects for the list.", "err");
        return;
      }
      c.print(`Opening the ${p.title} dossier.`, "ok");
      c.navigate(`/work/${p.id}`);
    },
  },
  {
    name: "experience",
    help: "The service log, newest first.",
    run(_a, c) {
      for (const j of jobs) {
        c.print(`LV ${levels.get(j.id)}  ${j.org}`, "head");
        c.print(`${j.role} · ${j.period}${j.location ? ` · ${j.location}` : ""}`);
        for (const h of j.highlights) c.print(`[OK] ${h}`);
      }
    },
  },
  {
    name: "skills",
    help: "Every skill, by group.",
    run(_a, c) {
      for (const g of data.skills) {
        c.print(g.group, "head");
        c.print(g.items.join(", "));
      }
    },
  },
  {
    name: "education",
    help: "Degree and school.",
    run(_a, c) {
      for (const e of data.education) c.print(`${e.degree}, ${e.school}${e.shortName ? ` (${e.shortName})` : ""}, ${e.period}`);
    },
  },
  {
    name: "awards",
    help: "Trophies.",
    run(_a, c) {
      for (const a of data.awards) c.print(`${a.title}: ${a.detail ?? ""}`.replace(/: $/, ""));
    },
  },
  {
    name: "contact",
    help: "Ways to reach Adnan.",
    run(_a, c) {
      c.print(data.contact.lede);
      for (const s of data.socials) c.link(s.id === "email" ? data.email : s.title, s.href, s.id !== "email");
      c.print("Type email to copy the address.", "dim");
    },
  },
  {
    name: "email",
    help: "Copy the email address.",
    async run(_a, c) {
      const ok = await c.copy(data.email);
      c.print(ok ? `Copied ${data.email}` : `Could not copy. The address is ${data.email}`, ok ? "ok" : "err");
    },
  },
  {
    name: "github",
    help: "Open GitHub.",
    run(_a, c) {
      const s = social("github");
      if (s) {
        c.link(s.title, s.href, true);
        c.open(s.href);
      }
    },
  },
  {
    name: "linkedin",
    help: "Open LinkedIn.",
    run(_a, c) {
      const s = social("linkedin");
      if (s) {
        c.link(s.title, s.href, true);
        c.open(s.href);
      }
    },
  },
  {
    name: "blog",
    help: "Go to the blog.",
    run(_a, c) {
      if (!data.showBlog) {
        c.print("The blog is offline.", "err");
        return;
      }
      c.close();
      c.navigate("/blog");
    },
  },
  {
    name: "teleop",
    help: "Take control of the Teleop Cell.",
    run(_a, c) {
      c.close();
      if (!c.takeControl()) c.navigate("/#boot");
    },
  },
  {
    name: "latency",
    usage: "<ms>",
    help: "Set the cell link latency, 0 to 300 (SIM).",
    run(args, c) {
      const ms = Number(args[0]);
      if (!args[0] || !Number.isInteger(ms) || ms < 0 || ms > 300) {
        c.print("Usage: latency <ms>, a whole number from 0 to 300 (SIM).", "err");
        return;
      }
      if (!c.cellLive()) {
        c.print("The cell is offline. Type teleop to take control first.", "err");
        return;
      }
      c.setLatency(ms);
      c.print(`SIM link latency set to ${ms} ms (your run).`, "ok");
    },
  },
  {
    name: "estop",
    help: "Toggle the site E-STOP (freezes all motion).",
    run(_a, c) {
      const next = !isEstop();
      setEstop(next);
      c.print(next ? "E-STOP engaged. All motion frozen. Type estop again to release." : "E-STOP released. Motion resumed.", next ? "err" : "ok");
    },
  },
  {
    name: "keys",
    help: "Show the keyboard placard.",
    run(_a, c) {
      c.showKeys();
    },
  },
  {
    name: "badges",
    help: "Visitor badges earned in this browser.",
    run(_a, c) {
      const have = earned();
      c.print(`Visitor badges (your run, this browser): ${have.size} of ${BADGES.length}`, "head");
      for (const b of BADGES) c.print(have.has(b.id) ? `[OK] ${b.title}` : `[ ] ${b.title}: ${b.hint}`, have.has(b.id) ? "ok" : "dim");
    },
  },
  {
    name: "clear",
    help: "Clear the screen.",
    run(_a, c) {
      c.latched = false;
      c.clear();
    },
  },
  {
    name: "theme",
    usage: "cyan|amber|mono",
    help: "Recolor the station. Mono is high contrast.",
    run(args, c) {
      const t = args[0];
      if (!t || !THEMES.includes(t)) {
        c.print(`Usage: theme ${THEMES.join("|")}. Now: ${getTheme() === "default" ? "cyan" : getTheme()}.`, "err");
        return;
      }
      setTheme(t === "cyan" ? "default" : (t as "amber" | "mono"));
      if (t !== "cyan") found("theme");
      c.print(`Theme set to ${t}.`, "ok");
    },
  },
  {
    name: "sound",
    usage: "on|off",
    help: "Opt-in chiptune feedback.",
    run(args, c) {
      if (!ONOFF.includes(args[0])) {
        c.print(`Usage: sound on|off. Now: ${c.soundOn() ? "on" : "off"}.`, "err");
        return;
      }
      c.setSound(args[0] === "on");
      c.print(`Sound ${args[0]}.`, "ok");
    },
  },
  {
    name: "crt",
    usage: "on|off",
    help: "Scanlines inside the monitors.",
    run(args, c) {
      if (!ONOFF.includes(args[0])) {
        c.print(`Usage: crt on|off. Now: ${isCrtOn() ? "on" : "off"}.`, "err");
        return;
      }
      setCrt(args[0] === "on");
      c.print(`CRT scanlines ${args[0]}.`, "ok");
    },
  },
  {
    name: "ping",
    help: "Round trip to this site (your link).",
    async run(_a, c) {
      c.print("Pinging this site...", "dim");
      try {
        const ms = await c.ping();
        c.print(`Reply in ${Math.round(ms)} ms (your link).`, "ok");
      } catch {
        c.print("No reply. Your link may be offline.", "err");
      }
    },
  },
  {
    name: "history",
    help: "Commands you ran (your run).",
    run(_a, c) {
      const h = c.history();
      if (!h.length) c.print("No history yet.", "dim");
      for (const line of h) c.print(line);
    },
  },
  {
    name: "date",
    help: "Your local clock.",
    run(_a, c) {
      c.print(`Your clock: ${new Date().toString()}`);
    },
  },
  {
    name: "exit",
    help: "Close the console.",
    run(_a, c) {
      c.close();
    },
  },
  {
    name: "sudo",
    secret: true,
    help: "",
    async run(args, c) {
      if (args.join(" ").toLowerCase() === "hire adnan") {
        found("hire");
        c.print("Access granted. Opening a channel.", "ok");
        c.link(data.email, `mailto:${data.email}`);
        c.print("Type email to copy the address.", "dim");
        c.focusSection("contact-section");
        return;
      }
      c.print("sudo: that request needs a human. Type contact.", "err");
    },
  },
  {
    name: "rm",
    secret: true,
    help: "",
    run(args, c) {
      if (args.includes("/") && args.some((a) => /^-\w*r/.test(a))) {
        found("rm");
        c.latched = true;
        c.print("Fail-closed. Request denied and latched. Type clear to resume.", "err");
        return;
      }
      c.print("rm: nothing here is yours to remove.", "err");
    },
  },
];

const BY_NAME = new Map<string, Command>();
for (const cmd of COMMANDS) for (const n of [cmd.name, ...(cmd.aliases ?? [])]) BY_NAME.set(n, cmd);

export const commandNames = () => COMMANDS.filter((c) => !c.secret).flatMap((c) => [c.name, ...(c.aliases ?? [])]);

/** Exposed for scripts/check-ops.mjs. */
export const allCommands = () => COMMANDS;

/** Runs one input line. Returns "deny" when the console is latched or the command is unknown. */
export async function run(input: string, c: Ctx): Promise<"ok" | "deny"> {
  const parts = input.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "ok";
  const [head, ...args] = parts;
  const cmd = BY_NAME.get(head.toLowerCase());
  if (c.latched && cmd?.name !== "clear") {
    c.print("Latched. Type clear to resume.", "err");
    return "deny";
  }
  if (!cmd) {
    c.print(`${head}: command not found. Type help.`, "err");
    return "deny";
  }
  await cmd.run(args, c);
  return "ok";
}

const ARG_OPTIONS: Record<string, string[]> = {
  open: projects.map((p) => p.id),
  dossier: projects.map((p) => p.id),
  theme: THEMES,
  sound: ONOFF,
  crt: ONOFF,
};

/** Tab completion: the completed input (when unique or a longer common prefix exists) and all matches. */
export function complete(input: string): { value: string | null; options: string[] } {
  const m = /^(\s*)(\S*)(\s+)?(\S*)$/.exec(input);
  if (!m) return { value: null, options: [] };
  const [, lead, head, space, arg] = m;
  const pool = space ? ARG_OPTIONS[head.toLowerCase()] ?? [] : commandNames();
  const word = space ? arg : head;
  const options = pool.filter((o) => o.startsWith(word.toLowerCase()));
  if (!options.length) return { value: null, options };
  let common = options[0];
  for (const o of options) while (!o.startsWith(common)) common = common.slice(0, -1);
  const done = options.length === 1 ? `${common} ` : common;
  if (done === word) return { value: null, options };
  return { value: space ? `${lead}${head} ${done}` : `${lead}${done}`, options };
}
