// Opt-in chiptune feedback. Reached only through import() from the SND
// toggle (components/ops/SoundToggle.tsx); the AudioContext is created inside
// enable(), which runs from that click (or the first gesture after a saved
// opt-in). Square, triangle, and noise voices, master gain 0.06, original
// 1-4 note blips. No files, no loops, no music. The site E-STOP mutes it.
// Every sound doubles an event that already has a visual or text cue.
import { on } from "./bus";

type Voice = "s" | "t" | "n";
/** [frequency Hz, length ms, voice] */
type Note = [number, number, Voice];

const SFX: Record<string, Note[]> = {
  boot: [[392, 90, "t"], [587, 160, "t"]],
  open: [[349, 60, "t"], [523, 100, "t"]],
  home: [[587, 55, "s"], [740, 55, "s"], [1109, 110, "t"]],
  badge: [[659, 60, "s"], [831, 60, "s"], [988, 60, "s"], [1319, 150, "t"]],
  key: [[0, 14, "n"]],
  deny: [[185, 180, "s"]],
};

export type Sfx = keyof typeof SFX;

const MASTER = 0.06;
let ctx: AudioContext | null = null;
let master: GainNode;
let noise: AudioBuffer;
let enabled = false;
let wired = false;

const stopped = () => document.documentElement.hasAttribute("data-estop");

export function play(name: Sfx) {
  if (!ctx || !enabled || stopped()) return;
  let t = ctx.currentTime + 0.01;
  for (const [freq, ms, voice] of SFX[name]) {
    const len = ms / 1000;
    const env = ctx.createGain();
    const peak = voice === "n" ? 0.5 : voice === "t" ? 0.9 : 0.45;
    env.gain.setValueAtTime(0.0001, t);
    env.gain.linearRampToValueAtTime(peak, t + 0.005);
    env.gain.exponentialRampToValueAtTime(0.0001, t + len);
    env.connect(master);
    let src: AudioScheduledSourceNode;
    if (voice === "n") {
      const b = ctx.createBufferSource();
      b.buffer = noise;
      src = b;
    } else {
      const o = ctx.createOscillator();
      o.type = voice === "s" ? "square" : "triangle";
      o.frequency.setValueAtTime(freq, t);
      src = o;
    }
    src.connect(env);
    src.start(t);
    src.stop(t + len + 0.02);
    t += len;
  }
}

function wire() {
  if (wired) return;
  wired = true;
  on("ab:ops", ({ type }) => play(type === "deny" ? "deny" : type === "open" ? "open" : "key"));
  on("ab:badge", () => play("badge"));
  on("ab:home", () => play("home"));
  on("ab:estop", ({ on: latched }) => {
    if (!ctx) return;
    if (latched) ctx.suspend().catch(() => undefined);
    else if (enabled) ctx.resume().catch(() => undefined);
  });
}

/** Turns sound on. Must run inside a user gesture. `chime` plays the 2-note boot. */
export function enable(chime: boolean) {
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = MASTER;
    master.connect(ctx.destination);
    noise = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.25), ctx.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  enabled = true;
  wire();
  if (!stopped()) ctx.resume().catch(() => undefined);
  if (chime) play("boot");
  return true;
}

export function disable() {
  enabled = false;
  ctx?.suspend().catch(() => undefined);
}
