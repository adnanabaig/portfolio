// Where <Sprite> finds the sprite sheet. Tiny, so it can live in the main
// bundle while the sheet (lib/pixel/spriteData.ts) stays out of it.
//
// Server: the sheet is required synchronously, so SSR paints every sprite.
// Browser: nothing until spriteData is imported, either statically by a lazy
// chunk that draws sprites or through loadSheet() when a component has to
// draw something the server did not paint.
import type { SpriteDef, SpriteName } from "./toPaths";

export interface SpriteSheet {
  sprites: Record<SpriteName, SpriteDef>;
  spriteMarkup(name: SpriteName, frame?: number, mono?: boolean): string;
}

let sheet: SpriteSheet | null = null;
let pending: Promise<SpriteSheet> | null = null;

/** Called by spriteData when it is evaluated. */
export function provideSheet(s: SpriteSheet) {
  sheet = s;
}

/** The sheet if it is already here (always on the server), else null. */
export function getSheet(): SpriteSheet | null {
  return sheet;
}

/** Loads the sheet chunk once; later calls share the same promise. */
export function loadSheet(): Promise<SpriteSheet> {
  if (sheet) return Promise.resolve(sheet);
  if (!pending) {
    pending = import("./spriteData").then(
      (m) => m.sheet,
      (err) => {
        pending = null;
        throw err;
      }
    );
  }
  return pending;
}

// The server build keeps this branch; the browser build drops it (Next
// compiles `typeof window` to a constant), so the sheet never lands in the
// main bundle.
if (typeof window === "undefined") {
  require("./spriteData");
}
