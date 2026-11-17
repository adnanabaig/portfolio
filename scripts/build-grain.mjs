// `npm run grain`: writes public/tex/grain.png, the film-grain tile behind
// the lit frame faces and the hero light (see "Lighting" in CLAUDE.md).
// 96x96, white specks at alpha 0 to 8/255, from a seeded PRNG so the output
// is reproducible. CSS draws it at 192px with image-rendering: pixelated, so
// each speck is a 2x2 CSS px block on the pixel grid. Commit the output.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { pngIndexed } from "./png.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const SIZE = 96;
const LEVELS = 8; // alpha 1/255 to 8/255
const DENSITY = 0.16; // share of pixels that carry a speck

// mulberry32: small, fast, and deterministic for a fixed seed.
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(0xab01);
const data = Buffer.alloc(SIZE * SIZE);
for (let i = 0; i < data.length; i++) {
  if (rand() < DENSITY) data[i] = 1 + Math.floor(rand() * LEVELS);
}
// Palette index n is white at alpha n/255 (index 0 is fully transparent).
const palette = Array.from({ length: LEVELS + 1 }, (_, n) => [255, 255, 255, n]);
const buf = pngIndexed({ w: SIZE, h: SIZE, data, palette });
const out = path.join(root, "public/tex/grain.png");
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, buf);
console.log(`grain: wrote public/tex/grain.png (${SIZE}x${SIZE}, ${buf.length} bytes)`);
