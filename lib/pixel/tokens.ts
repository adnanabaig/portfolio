// The "Station 16" palette. styles/globals.css holds the live values as CSS
// custom properties; this list mirrors them so /lab can compute contrast and
// flag drift. `text: true` means the token is allowed as a text color.
export interface Token {
  name: string;
  hex: string;
  text: boolean;
  role: string;
}

export const TOKENS: Token[] = [
  { name: "--ink", hex: "#0B0E14", text: false, role: "Page background" },
  { name: "--panel", hex: "#121826", text: false, role: "Cards and bezels" },
  { name: "--panel-hi", hex: "#1A2233", text: false, role: "Title bars, hover" },
  { name: "--grid", hex: "#26314A", text: false, role: "2px borders and rules" },
  { name: "--steel", hex: "#3A4660", text: false, role: "Dark bevel, sprite shadow" },
  { name: "--alloy", hex: "#6B7A96", text: false, role: "Sprite mid-tone" },
  { name: "--mist", hex: "#9AA7BD", text: true, role: "Muted text" },
  { name: "--paper", hex: "#E8ECF2", text: true, role: "Body text" },
  { name: "--teal", hex: "#2EE6C5", text: true, role: "Primary accent, links, focus" },
  { name: "--teal-ink", hex: "#04110F", text: false, role: "Text on teal buttons" },
  { name: "--teal-deep", hex: "#157A69", text: false, role: "Hard shadows" },
  { name: "--amber", hex: "#FFB547", text: true, role: "In progress, caution" },
  { name: "--coral", hex: "#FF5D6C", text: true, role: "E-STOP and faults" },
  { name: "--leaf", hex: "#7BE07B", text: true, role: "OK LEDs" },
  { name: "--violet", hex: "#A98BFF", text: true, role: "Writing accent" },
  { name: "--sky", hex: "#5AB8FF", text: true, role: "Secondary accent" },
  { name: "--rust", hex: "#C2643A", text: false, role: "Sprite and terrain only" },
  { name: "--sand", hex: "#E9C58F", text: false, role: "Sprite and terrain only" },
  { name: "--moss", hex: "#3E7A5A", text: false, role: "Sprite and terrain only" },
];

function channel(c: number) {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

export function luminance(hex: string) {
  const m = hex.trim().replace("#", "");
  const full = m.length === 3 ? m.split("").map((c) => c + c).join("") : m;
  const n = parseInt(full, 16);
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
}

/** WCAG 2 contrast ratio between two hex colors. */
export function contrast(a: string, b: string) {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

// Skill-group colors live in ./groups (kept apart so the home page does not
// ship this palette table, which only /lab needs).
export { GROUP_ACCENTS, groupAccent, type GroupAccent } from "./groups";

// ---------------------------------------------------------------------------
// Lighting. Mirrors the "Lighting" tokens in styles/globals.css. Every light
// alpha there is multiplied by --lit (0 is the flat site); these are the
// values at full light.
// ---------------------------------------------------------------------------
export const LIGHTING = {
  glowRgb: "#2EE6C5", // --glow-rgb (amber theme: #FFB547)
  rimRgb: "#A98BFF", // --rim-rgb
  bounceRgb: "#5AB8FF", // --bounce-rgb
  faultRgb: "#FF5D6C", // --fault-rgb
  hi: 0.03, // --hi: frame face top sheen (white)
  edge: 0.06, // --edge: 2px lit top inner edge (white)
  washMax: 0.05, // --wash-max: lamp face wash (accent)
  rowMix: 0.1, // --row-mix: palette active row (accent into --panel-hi)
  grainMax: 8 / 255, // public/tex/grain.png: brightest speck (white)
  auroraMax: 0.1, // hottest hero light (key .09, rounded up)
  livePill: 0.1, // LIVE eyebrow pill (leaf over the chip's --panel)
  titlebarTop: "#202A3E", // --titlebar-top
} as const;

const hexOf = (name: string) => {
  const t = TOKENS.find((x) => x.name === name);
  if (!t) throw new Error(`unknown token ${name}`);
  return t.hex;
};

function rgbOf(hex: string): [number, number, number] {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Source-over composite of `top` at `alpha` on an opaque `base`, in sRGB (what the browser paints). */
export function over(base: string, top: string, alpha: number) {
  const b = rgbOf(base);
  const t = rgbOf(top);
  const c = b.map((v, i) => Math.round(v * (1 - alpha) + t[i] * alpha));
  return `#${c.map((v) => v.toString(16).padStart(2, "0")).join("").toUpperCase()}`;
}

export interface LitSurface {
  name: string;
  /** How the worst case is built, layer by layer. */
  recipe: string;
  /** Composite background at full light. */
  hex: string;
  /** Text tokens (or literal colors, for themes) that sit on it. */
  text: { name: string; hex: string }[];
}

const TEXT = ["--paper", "--mist", "--teal", "--amber", "--coral", "--leaf", "--violet", "--sky"].map((name) => ({
  name,
  hex: hexOf(name),
}));
const ACCENTS = ["--teal", "--amber", "--coral", "--leaf", "--violet", "--sky"];
const WHITE = "#FFFFFF";

/** A lit frame face at its brightest: panel + top sheen + full lamp wash + the brightest grain speck. */
const litFace = (accent: string) => over(over(over(hexOf("--panel"), WHITE, LIGHTING.hi), hexOf(accent), LIGHTING.washMax), WHITE, LIGHTING.grainMax);

/**
 * The worst case for each new lit surface. /lab renders these with live
 * ratios and tests/lighting.test.ts fails if any text on them drops below
 * 4.5:1 (WCAG AA for body text).
 */
export const litSurfaces: LitSurface[] = [
  ...ACCENTS.map((accent) => ({
    name: `Frame face, ${accent.slice(2)} lamp`,
    recipe: `panel + ${LIGHTING.hi * 100}% sheen + ${LIGHTING.washMax * 100}% ${accent} wash + grain 8/255`,
    hex: litFace(accent),
    text: TEXT,
  })),
  {
    name: "Title bar top",
    recipe: "--titlebar-top (gradient to --panel-hi) + grain-free",
    hex: LIGHTING.titlebarTop,
    text: TEXT,
  },
  ...ACCENTS.map((accent) => ({
    name: `Palette row, ${accent.slice(2)}`,
    recipe: `panel-hi + ${LIGHTING.rowMix * 100}% ${accent}`,
    hex: over(hexOf("--panel-hi"), hexOf(accent), LIGHTING.rowMix),
    text: [TEXT[0], TEXT[1], { name: accent, hex: hexOf(accent) }],
  })),
  {
    name: "Hero light, hottest point",
    recipe: `ink + ${LIGHTING.auroraMax * 100}% key (teal) + grain 8/255`,
    hex: over(over(hexOf("--ink"), LIGHTING.glowRgb, LIGHTING.auroraMax), WHITE, LIGHTING.grainMax),
    text: TEXT,
  },
  {
    name: "LIVE pill",
    recipe: `panel + ${LIGHTING.livePill * 100}% leaf`,
    hex: over(hexOf("--panel"), hexOf("--leaf"), LIGHTING.livePill),
    text: [TEXT[0], TEXT[1], { name: "--leaf", hex: hexOf("--leaf") }],
  },
  {
    name: "Palette row, amber theme",
    recipe: `panel-hi + ${LIGHTING.rowMix * 100}% amber (theme mist #C9A878, paper #FFE2B0)`,
    hex: over(hexOf("--panel-hi"), "#FFB547", LIGHTING.rowMix),
    text: [
      { name: "--paper (amber)", hex: "#FFE2B0" },
      { name: "--mist (amber)", hex: "#C9A878" },
      { name: "--teal (amber)", hex: "#FFB547" },
    ],
  },
];

/** The lowest text contrast on a lit surface, and which token it is. */
export function worstOn(surface: LitSurface) {
  return surface.text
    .map((t) => ({ ...t, ratio: contrast(t.hex, surface.hex) }))
    .reduce((a, b) => (b.ratio < a.ratio ? b : a));
}
