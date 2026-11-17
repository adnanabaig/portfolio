// Visitor badges: small rewards for exploring, earned in this browser only.
// They are not achievements on the resume, carry no points, and render in a
// clearly labeled row apart from the real awards. Stored in localStorage with
// the in-memory fallback from lib/storage; read in effects and handlers only.
import portfolio from "../data/portfolio.json";
import { emit, on } from "./bus";
import { KEYS, read, write } from "./storage";

export type BadgeId = "root" | "signal" | "night" | "manual";

export interface Badge {
  id: BadgeId;
  title: string;
  /** Shown while locked: how to earn it. */
  hint: string;
}

export const BADGES: Badge[] = [
  { id: "root", title: "Root access", hint: "Open the OPS console." },
  { id: "signal", title: "Signal found", hint: "Drive AB-01 home from the 404 page." },
  { id: "night", title: "Night shift", hint: "Visit between 22:00 and 05:00 your time." },
  { id: "manual", title: "Read the manual", hint: "Open the resume." },
];

const IDS = new Set<string>(BADGES.map((b) => b.id));

export const badgeTitle = (id: string) => BADGES.find((b) => b.id === id)?.title ?? id;

/** Badges earned in this browser. */
export function earned(): Set<BadgeId> {
  try {
    const list = JSON.parse(read(KEYS.badges) || "[]");
    return new Set((Array.isArray(list) ? list : []).filter((id): id is BadgeId => IDS.has(id)));
  } catch {
    return new Set();
  }
}

/** Marks a badge as earned. Returns true (and announces it) only the first time. */
export function earn(id: BadgeId): boolean {
  const have = earned();
  if (have.has(id)) return false;
  have.add(id);
  write(KEYS.badges, JSON.stringify([...have]));
  emit("ab:badge", { id });
  return true;
}

const isNight = (d: Date) => d.getHours() >= 22 || d.getHours() < 5;

let listening = false;

/** Subscribes the earning rules to the bus. Safe to call more than once. */
export function listen() {
  if (listening || typeof window === "undefined") return;
  listening = true;
  on("ab:ops", ({ type }) => {
    if (type === "open") earn("root");
  });
  on("ab:home", () => earn("signal"));
  if (isNight(new Date())) earn("night");
  // Any resume link, anywhere (status bar, hero, footer, console).
  document.addEventListener(
    "click",
    (e) => {
      const a = (e.target as Element | null)?.closest?.("a[href]");
      if (a && a.getAttribute("href") === portfolio.resumeUrl) earn("manual");
    },
    true
  );
}

// Secrets: easter eggs the keymap placard lists only after you find them.
export type SecretId = "hire" | "rm" | "ab01" | "wave" | "theme";

export const SECRETS: { id: SecretId; how: string }[] = [
  { id: "hire", how: "sudo hire adnan (OPS console)" },
  { id: "rm", how: "rm -rf / (OPS console, fails closed)" },
  { id: "theme", how: "theme amber or theme mono (OPS console)" },
  { id: "ab01", how: "window.ab01 in the browser console" },
  { id: "wave", how: "Triple-click the AB-01 head in the status bar" },
];

export function discovered(): Set<SecretId> {
  try {
    const list = JSON.parse(read(KEYS.secrets) || "[]");
    return new Set(Array.isArray(list) ? list : []);
  } catch {
    return new Set();
  }
}

export function discover(id: SecretId) {
  const have = discovered();
  if (have.has(id)) return;
  have.add(id);
  write(KEYS.secrets, JSON.stringify([...have]));
}
