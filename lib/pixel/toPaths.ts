// Turns palette-indexed string rows into one SVG path per palette key.
// Horizontal runs of the same key merge into a single rectangle, so a
// 32x32 icon becomes a handful of short paths instead of 1024 rects.
//
// This module is pure and tiny. The sprite sheet itself (sprites.json) lives
// behind lib/pixel/spriteData.ts, which the browser loads only when it has to
// draw a sprite the server did not (see lib/pixel/spriteStore.ts).

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

/** Every sprite name in sprites.json (type only: no JSON reaches the bundle from here). */
export type SpriteName = keyof (typeof import("./sprites.json"))["sprites"];

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

/** SVG markup for a list of paths, one <path> per color. */
export function pathsMarkup(paths: readonly PixelPath[], fill: (key: string) => string): string {
  return paths.map((p) => `<path d="${p.d}" style="fill:${fill(p.key)}"></path>`).join("");
}
