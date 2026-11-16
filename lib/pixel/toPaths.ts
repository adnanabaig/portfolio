// Turns palette-indexed string rows into one SVG path per palette key.
// Horizontal runs of the same key merge into a single rectangle, so a
// 32x32 icon becomes a handful of short paths instead of 1024 rects.
import spriteData from "./sprites.json";

export interface PaletteEntry {
  var: string;
  hex: string;
}

export interface PixelPath {
  key: string;
  d: string;
}

export interface SpriteDef {
  w: number;
  h: number;
  frames: string[][];
}

export const palette = spriteData.palette as Record<string, PaletteEntry>;
export const sprites = spriteData.sprites as Record<string, SpriteDef>;
export type SpriteName = keyof typeof spriteData.sprites;

/**
 * Pure: rows in, paths out, in order of each key's first appearance.
 * Horizontal runs merge first; a run repeated at the same x and width on the
 * next row extends the same rectangle downward.
 */
export function rowsToPaths(rows: readonly string[], transparent = "."): PixelPath[] {
  const order: string[] = [];
  const parts: Record<string, string[]> = {};
  // Open rectangles from the previous row, keyed by "key:x:w".
  let open = new Map<string, { key: string; x: number; y: number; w: number; h: number }>();
  const close = (r: { key: string; x: number; y: number; w: number; h: number }) => {
    if (!parts[r.key]) {
      parts[r.key] = [];
      order.push(r.key);
    }
    parts[r.key].push(`M${r.x} ${r.y}h${r.w}v${r.h}h${-r.w}z`);
  };
  rows.forEach((row, y) => {
    const next = new Map<string, { key: string; x: number; y: number; w: number; h: number }>();
    let x = 0;
    while (x < row.length) {
      const key = row[x];
      let end = x + 1;
      while (end < row.length && row[end] === key) end++;
      if (key !== transparent && key !== " ") {
        const id = `${key}:${x}:${end - x}`;
        const prev = open.get(id);
        if (prev) {
          prev.h += 1;
          open.delete(id);
          next.set(id, prev);
        } else {
          next.set(id, { key, x, y, w: end - x, h: 1 });
        }
      }
      x = end;
    }
    open.forEach(close);
    open = next;
  });
  open.forEach(close);
  // Group paths by first appearance in reading order of their top-left corner.
  return order.map((key) => ({ key, d: parts[key].join("") }));
}

const cache = new Map<string, PixelPath[]>();

/** Memoized paths for one frame of a named sprite. */
export function spritePaths(name: SpriteName, frame = 0): PixelPath[] {
  const id = `${name}:${frame}`;
  const hit = cache.get(id);
  if (hit) return hit;
  const def = sprites[name];
  const rows = def.frames[Math.min(frame, def.frames.length - 1)];
  const paths = rowsToPaths(rows);
  cache.set(id, paths);
  return paths;
}

/** CSS fill for a palette key: the theme variable, with the hex as fallback. */
export function fillFor(key: string): string {
  const entry = palette[key];
  return entry ? `var(${entry.var}, ${entry.hex})` : "currentColor";
}
