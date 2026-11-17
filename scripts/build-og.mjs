// `npm run og`: renders the social card and icons from the same pixel data
// the site uses (lib/pixel/sprites.json, lib/pixel/font.json) and the facts
// in data/portfolio.json. Dependency-free: a tiny palette raster plus a PNG
// encoder (scripts/png.mjs). Outputs are committed:
//   public/og.png             1200x630 social card
//   public/icon-32.png        32x32 AB-01 head
//   public/apple-touch-icon.png 180x180 AB-01 head
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { png } from "./png.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const readJson = (f) => JSON.parse(fs.readFileSync(path.join(root, f), "utf8"));
const { palette, sprites } = readJson("lib/pixel/sprites.json");
const font = readJson("lib/pixel/font.json");
const data = readJson("data/portfolio.json");

const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const COLORS = Object.fromEntries(Object.entries(palette).map(([k, v]) => [k, hex(v.hex)]));

// --- raster -----------------------------------------------------------------
class Raster {
  constructor(w, h, bg = "k") {
    this.w = w;
    this.h = h;
    this.px = new Array(w * h).fill(bg);
  }
  set(x, y, key) {
    x = Math.round(x);
    y = Math.round(y);
    if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.px[y * this.w + x] = key;
  }
  rect(x, y, w, h, key) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, key);
  }
  sprite(name, x, y, { frame = 0, scale = 1, flip = false } = {}) {
    const def = sprites[name];
    const rows = def.frames[frame];
    rows.forEach((row, j) => {
      for (let i = 0; i < row.length; i++) {
        if (row[i] === ".") continue;
        const sx = flip ? def.w - 1 - i : i;
        this.rect(x + sx * scale, y + j * scale, scale, scale, row[i]);
      }
    });
  }
  text(s, x, y, key, scale = 1) {
    let cx = x;
    for (const ch of s.toUpperCase()) {
      const g = font.glyphs[ch] ?? font.glyphs["?"];
      g.forEach((row, j) => {
        for (let i = 0; i < row.length; i++) if (row[i] === "#") this.rect(cx + i * scale, y + j * scale, scale, scale, key);
      });
      cx += font.advance * scale;
    }
  }
  static textWidth(s, scale = 1) {
    return s.length ? (s.length * font.advance - 1) * scale : 0;
  }
  disc(cx, cy, r, key) {
    for (let j = Math.floor(cy - r); j <= Math.ceil(cy + r); j++)
      for (let i = Math.floor(cx - r); i <= Math.ceil(cx + r); i++) if ((i + 0.5 - cx) ** 2 + (j + 0.5 - cy) ** 2 <= r * r) this.set(i, j, key);
  }
  /** Same look as lib/pixel/raster.ts capsule: outline, body, one highlight edge. */
  capsule(x0, y0, x1, y1, r, k) {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const len2 = dx * dx + dy * dy || 1;
    for (let j = Math.floor(Math.min(y0, y1) - r - 2); j <= Math.ceil(Math.max(y0, y1) + r + 2); j++)
      for (let i = Math.floor(Math.min(x0, x1) - r - 2); i <= Math.ceil(Math.max(x0, x1) + r + 2); i++) {
        const px = i + 0.5;
        const py = j + 0.5;
        const t = Math.max(0, Math.min(1, ((px - x0) * dx + (py - y0) * dy) / len2));
        const d = Math.hypot(x0 + t * dx - px, y0 + t * dy - py);
        const side = (dx * (py - y0) - dy * (px - x0)) / Math.sqrt(len2);
        if (d <= r - 1.2 && k.hi && side < -r * 0.25) this.set(i, j, k.hi);
        else if (d <= r) this.set(i, j, k.body);
        else if (d <= r + 1) this.set(i, j, k.outline);
      }
  }
  /** Nearest-neighbor upscale into RGB bytes. */
  rgb(scale = 1, crop = { w: this.w * scale, h: this.h * scale }) {
    const out = Buffer.alloc(crop.w * crop.h * 3);
    for (let y = 0; y < crop.h; y++)
      for (let x = 0; x < crop.w; x++) {
        const c = COLORS[this.px[Math.floor(y / scale) * this.w + Math.floor(x / scale)]] ?? COLORS.k;
        out.set(c, (y * crop.w + x) * 3);
      }
    return { w: crop.w, h: crop.h, data: out };
  }
}

// --- social card: 300x158 logical at 4x, cropped to 1200x630 --------------
const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];
function card() {
  const r = new Raster(300, 158, "k");
  const HORIZON = 100;
  const FLOOR = 110;
  // Dither horizon: teal fading up into ink, then the floor.
  for (let y = HORIZON; y < FLOOR; y++)
    for (let x = 0; x < r.w; x++) if (BAYER[y % 4][x % 4] < ((y - HORIZON + 1) / (FLOOR - HORIZON)) * 16) r.set(x, y, "d");
  r.rect(0, FLOOR, r.w, r.h - FLOOR, "c");
  r.rect(0, FLOOR, r.w, 1, "i");
  for (let x = 6; x < r.w; x += 16) r.rect(x, FLOOR + 1, 1, r.h - FLOOR, "h");

  // Name, title, address.
  r.text(data.name, 18, 18, "d", 3);
  r.text(data.name, 17, 17, "w", 3);
  r.text(data.title, 17, 48, "t");
  r.text(data.location, 17, 60, "m");
  r.text(new URL(data.siteUrl).host, 17, 140, "y");

  // AB-01 at 2x logical (8x on the card), standing on the floor.
  const botX = 136;
  const feet = FLOOR + 22;
  r.sprite("ab01", botX, feet - 48, { scale: 2 });

  // The workcell arm (side view): pedestal, two links, gripper, and a block
  // labeled with a real skill (the first six letters of "Teleoperation").
  const pedX = 194;
  r.sprite("arm-pedestal", pedX, feet - 40, { scale: 2 });
  const shoulder = { x: pedX + 24, y: feet - 32 };
  const elbow = { x: shoulder.x + 22, y: shoulder.y - 36 };
  const wrist = { x: elbow.x + 18, y: elbow.y + 14 };
  r.capsule(shoulder.x, shoulder.y, elbow.x, elbow.y, 4.5, { outline: "o", body: "s", hi: "a" });
  r.capsule(elbow.x, elbow.y, wrist.x, wrist.y, 3.5, { outline: "o", body: "a", hi: "m" });
  r.disc(shoulder.x, shoulder.y, 5, "o");
  r.disc(shoulder.x, shoulder.y, 4, "m");
  r.rect(shoulder.x - 1, shoulder.y - 1, 2, 2, "t");
  r.disc(elbow.x, elbow.y, 5, "o");
  r.disc(elbow.x, elbow.y, 4, "m");
  r.disc(elbow.x, elbow.y, 1.6, "k");
  r.sprite("gripper", Math.round(wrist.x) - 6, Math.round(wrist.y), { frame: 1 });
  const skill = data.skills.flatMap((g) => g.items).find((s) => s === "Teleoperation");
  if (!skill) throw new Error("build-og: the Teleoperation skill is missing from data/portfolio.json");
  const label = skill.slice(0, 6).toUpperCase();
  const bw = Raster.textWidth(label) + 6;
  const bx = Math.round(wrist.x) - Math.round(bw / 2);
  const by = Math.round(wrist.y) + 12;
  r.rect(bx - 1, by - 1, bw + 2, 14, "o");
  r.rect(bx, by, bw, 9, "y");
  r.rect(bx, by + 9, bw, 3, "x");
  r.text(label, bx + 3, by + 1, "k");

  // Unit plate, bottom right: framing only.
  const plate = "STATION AB-01";
  r.text(plate, r.w - 17 - Raster.textWidth(plate), 140, "m");
  r.rect(r.w - 17 - Raster.textWidth(plate) - 8, 141, 4, 4, "g");
  return r.rgb(4, { w: 1200, h: 630 });
}

function icon(size, scale) {
  const head = sprites["ab01-head"];
  const r = new Raster(size, size, "k");
  const x = Math.floor((size - head.w * scale) / 2);
  const y = Math.floor((size - head.h * scale) / 2);
  r.sprite("ab01-head", x, y, { scale });
  return r.rgb(1);
}

const outputs = [
  ["public/og.png", card()],
  ["public/icon-32.png", icon(32, 2)],
  ["public/apple-touch-icon.png", icon(180, 10)],
];
for (const [file, img] of outputs) {
  const buf = png(img);
  fs.writeFileSync(path.join(root, file), buf);
  console.log(`og: wrote ${file} (${img.w}x${img.h}, ${buf.length} bytes)`);
}
