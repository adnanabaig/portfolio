// A tiny palette-indexed bitmap. The SSR cell view is composed here and then
// converted to SVG paths with rowsToPaths, so it is pixel-exact and needs no
// image request. The 404 level draws into the same structure every frame
// and blits it to its canvas.
//
// Pixels are palette indexes in a Uint8Array (0 = transparent), which keeps
// per-frame redraws cheap.
import fontData from "./font.json";
import { palette, sprites } from "./spriteData";
import type { SpriteName } from "./toPaths";

const glyphs = fontData.glyphs as Record<string, string[]>;
export const FONT_ADVANCE = fontData.advance;

/** Palette keys by index; index 0 is transparent ("."). */
export const PALETTE_KEYS: string[] = [".", ...Object.keys(palette)];
const INDEX: Record<string, number> = Object.fromEntries(PALETTE_KEYS.map((k, i) => [k, i]));

export class Raster {
  readonly w: number;
  readonly h: number;
  readonly px: Uint8Array;

  constructor(w: number, h: number) {
    this.w = w;
    this.h = h;
    this.px = new Uint8Array(w * h);
  }

  clear() {
    this.px.fill(0);
  }

  set(x: number, y: number, key: string) {
    x = Math.round(x);
    y = Math.round(y);
    if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.px[y * this.w + x] = INDEX[key] ?? 0;
  }

  rect(x: number, y: number, w: number, h: number, key: string) {
    const v = INDEX[key] ?? 0;
    const x0 = Math.max(0, Math.round(x));
    const y0 = Math.max(0, Math.round(y));
    const x1 = Math.min(this.w, Math.round(x) + w);
    const y1 = Math.min(this.h, Math.round(y) + h);
    for (let j = y0; j < y1; j++) this.px.fill(v, j * this.w + x0, j * this.w + Math.max(x0, x1));
  }

  /** Paints a sprite frame; "." stays transparent. `flip` mirrors it, `scale` repeats pixels. */
  sprite(name: SpriteName, x: number, y: number, frame = 0, flip = false, scale = 1) {
    const def = sprites[name];
    const rows = def.frames[Math.min(frame, def.frames.length - 1)];
    rows.forEach((row, j) => {
      for (let i = 0; i < row.length; i++) {
        const key = row[i];
        if (key === ".") continue;
        const sx = x + (flip ? def.w - 1 - i : i) * scale;
        this.rect(sx, y + j * scale, scale, scale, key);
      }
    });
  }

  /** Filled disc. */
  disc(cx: number, cy: number, r: number, key: string) {
    for (let j = Math.floor(cy - r); j <= Math.ceil(cy + r); j++)
      for (let i = Math.floor(cx - r); i <= Math.ceil(cx + r); i++)
        if ((i + 0.5 - cx) ** 2 + (j + 0.5 - cy) ** 2 <= r * r) this.set(i, j, key);
  }

  /** A rounded bar between two points: outline, body, and a highlight line. */
  capsule(x0: number, y0: number, x1: number, y1: number, r: number, keys: { outline: string; body: string; hi?: string }) {
    const minX = Math.floor(Math.min(x0, x1) - r - 2);
    const maxX = Math.ceil(Math.max(x0, x1) + r + 2);
    const minY = Math.floor(Math.min(y0, y1) - r - 2);
    const maxY = Math.ceil(Math.max(y0, y1) + r + 2);
    const dx = x1 - x0;
    const dy = y1 - y0;
    const len2 = dx * dx + dy * dy || 1;
    for (let j = minY; j <= maxY; j++) {
      for (let i = minX; i <= maxX; i++) {
        const px = i + 0.5;
        const py = j + 0.5;
        const t = Math.max(0, Math.min(1, ((px - x0) * dx + (py - y0) * dy) / len2));
        const ex = x0 + t * dx - px;
        const ey = y0 + t * dy - py;
        const d = Math.sqrt(ex * ex + ey * ey);
        // Signed side of the bar, so the highlight sits on one edge only.
        const side = (dx * (py - y0) - dy * (px - x0)) / Math.sqrt(len2);
        if (d <= r - 1.2 && keys.hi && side < -r * 0.25) this.set(i, j, keys.hi);
        else if (d <= r) this.set(i, j, keys.body);
        else if (d <= r + 1) this.set(i, j, keys.outline);
      }
    }
  }

  /** Width in pixels of a string in the 5x7 font. */
  static textWidth(text: string) {
    return text.length ? text.length * FONT_ADVANCE - 1 : 0;
  }

  text(text: string, x: number, y: number, key: string) {
    let cx = x;
    for (const ch of text.toUpperCase()) {
      const g = glyphs[ch] ?? glyphs["?"];
      g.forEach((row, j) => {
        for (let i = 0; i < row.length; i++) if (row[i] === "#") this.set(cx + i, y + j, key);
      });
      cx += FONT_ADVANCE;
    }
  }

  rows(): string[] {
    const out: string[] = [];
    for (let j = 0; j < this.h; j++) {
      let row = "";
      for (let i = 0; i < this.w; i++) row += PALETTE_KEYS[this.px[j * this.w + i]];
      out.push(row);
    }
    return out;
  }
}
