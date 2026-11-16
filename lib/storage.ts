// localStorage / sessionStorage with an in-memory fallback (private mode,
// blocked storage, SSR). Only call these from effects or event handlers so
// server and client render the same markup.
type Area = "local" | "session";

const memory: Record<Area, Map<string, string>> = { local: new Map(), session: new Map() };

function area(kind: Area): Storage | null {
  try {
    if (typeof window === "undefined") return null;
    return kind === "local" ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

export function read(key: string, kind: Area = "local"): string | null {
  try {
    const store = area(kind);
    if (store) return store.getItem(key);
  } catch {
    /* fall through to memory */
  }
  return memory[kind].get(key) ?? null;
}

export function write(key: string, value: string | null, kind: Area = "local") {
  if (value === null) memory[kind].delete(key);
  else memory[kind].set(key, value);
  try {
    const store = area(kind);
    if (!store) return;
    if (value === null) store.removeItem(key);
    else store.setItem(key, value);
  } catch {
    /* memory copy already updated */
  }
}

/** Keys used across the site, so features never collide. */
export const KEYS = {
  plain: "ab:plain",
  theme: "ab:theme",
  booted: "ab:booted",
  sound: "ab:sound",
  badges: "ab:badges",
  estop: "ab:estop",
  episodes: "ab:episodes",
  crt: "ab:crt",
  history: "ab:history",
  secrets: "ab:secrets",
} as const;
