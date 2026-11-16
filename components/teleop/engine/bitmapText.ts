// HUD text helpers on top of the 5x7 bitmap font (lib/pixel/font.json).
import { Raster } from "../../../lib/pixel/raster";

export const textWidth = Raster.textWidth;

/** Zero-padded integer: pad(4, 2) is "04". */
export const pad = (n: number, width: number) => String(Math.max(0, Math.round(n))).padStart(width, "0");

/** Signed, zero-padded degrees: "+045", "-090". */
export const deg = (rad: number) => {
  const d = Math.round((rad * 180) / Math.PI);
  return (d < 0 ? "-" : "+") + pad(Math.abs(d), 3);
};

/** Seconds with one decimal: "12.3S". */
export const secs = (ms: number) => `${(Math.max(0, ms) / 1000).toFixed(1)}S`;

export function textRight(r: Raster, s: string, right: number, y: number, key: string) {
  r.text(s, right - textWidth(s), y, key);
  return right - textWidth(s);
}

/** Text on a solid backing so it stays legible over the scene. */
export function label(r: Raster, s: string, x: number, y: number, key: string, bg = "k") {
  r.rect(x - 2, y - 2, textWidth(s) + 4, 11, bg);
  r.text(s, x, y, key);
}
