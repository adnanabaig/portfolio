// The SND switch's state, shared by the header toggle and the OPS console.
// lib/audio (the synth, with the only AudioContext) is reached solely
// through the import() calls here, and only after an opt-in: the SND click,
// `sound on`, or the first gesture of a visit after a saved opt-in.
import { emit } from "../../lib/bus";
import { KEYS, read, write } from "../../lib/storage";

type Synth = typeof import("../../lib/audio");
let synth: Synth | null = null;

/** Warm the synth chunk (hover or focus on the toggle) so the click can start audio synchronously. */
export const loadSynth = () =>
  import("../../lib/audio").then((m) => {
    synth = m;
    return m;
  });

export const soundSaved = () => read(KEYS.sound) === "1";

export function setSound(on: boolean) {
  write(KEYS.sound, on ? "1" : null);
  emit("ab:sound", { on });
  if (!on) synth?.disable();
  else if (synth) synth.enable(true);
  else loadSynth().then((m) => m.enable(true));
}

/** After a saved opt-in, browsers still need a gesture: start on the first one. */
export function resumeSavedSound() {
  if (!soundSaved()) return;
  const start = () => {
    window.removeEventListener("pointerdown", start, true);
    window.removeEventListener("keydown", start, true);
    if (soundSaved()) loadSynth().then((m) => m.enable(false));
  };
  window.addEventListener("pointerdown", start, true);
  window.addEventListener("keydown", start, true);
}
