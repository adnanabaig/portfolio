// Typed window CustomEvents so independent islands (inventory, teleop cell,
// track, terminal, sound) talk without sharing React state.
export interface BusEvents {
  /** A skill block was sorted into its correct bin. */
  "ab:skill": { skill: string; group?: string };
  /** The global E-STOP latched (true) or was cleared (false). */
  "ab:estop": { on: boolean };
  /** Something asked to navigate to a section id. */
  "ab:nav": { section: string };
  /** A visitor badge was earned. */
  "ab:badge": { id: string };
  /** Sound was turned on or off. */
  "ab:sound": { on: boolean };
  /** Teleop Cell moments (sound, badges). Emitted by the lazy engine. */
  "ab:cell": { type: CellEvent };
  /** Requests to the live cell (from the OPS console). */
  "ab:cmd": { type: "latency"; ms: number };
  /** OPS console moments (sound, badges). */
  "ab:ops": { type: "open" | "key" | "run" | "deny" };
  /** Open a station dialog; the opener is remembered for focus return. */
  "ab:open": { what: "ops" | "keys"; from?: HTMLElement | null };
  /** Puppet AB-01 on the track (window.ab01, the head logo). */
  "ab:bot": { act: "wave" | "dance" | "color"; color?: string };
  /** The 404 micro-level was finished. */
  "ab:home": Record<string, never>;
}

export type CellEvent = "grip" | "drop" | "sort" | "misroute" | "stop" | "clear" | "rec" | "saved" | "replay" | "complete";

export type BusEvent = keyof BusEvents;

export function emit<K extends BusEvent>(type: K, detail: BusEvents[K]) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(type, { detail }));
}

/** Subscribes and returns an unsubscribe function (handy as an effect cleanup). */
export function on<K extends BusEvent>(type: K, handler: (detail: BusEvents[K]) => void) {
  if (typeof window === "undefined") return () => undefined;
  const listener = (event: Event) => handler((event as CustomEvent<BusEvents[K]>).detail);
  window.addEventListener(type, listener);
  return () => window.removeEventListener(type, listener);
}
