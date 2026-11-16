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
