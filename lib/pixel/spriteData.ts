// The sprite sheet: sprites.json plus the helpers that draw from it.
//
// The server always has it. In the browser it is a lazy chunk: SSR already
// painted every sprite on the page, so the main bundle carries no art. It
// loads only when something must draw a sprite the server did not (a client
// side navigation, a live frame change such as the SND speaker) or when a
// lazy chunk that draws sprites (teleop engine, 404 level, badges, toast,
// /lab) imports it directly. Importing this module registers the sheet with
// lib/pixel/spriteStore, so <Sprite> can then draw synchronously.
import spriteJson from "./sprites.json";
import { pathsMarkup, rowsToPaths, type PaletteEntry, type PixelPath, type SpriteDef, type SpriteName } from "./toPaths";
import { provideSheet, type SpriteSheet } from "./spriteStore";

export const palette = spriteJson.palette as Record<string, PaletteEntry>;
export const sprites = spriteJson.sprites as Record<SpriteName, SpriteDef>;

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

/** Inner SVG markup for one frame; mono paints every pixel in currentColor. */
export function spriteMarkup(name: SpriteName, frame = 0, mono = false): string {
  return pathsMarkup(spritePaths(name, frame), mono ? () => "currentColor" : fillFor);
}

export const sheet: SpriteSheet = { sprites, spriteMarkup };
provideSheet(sheet);
