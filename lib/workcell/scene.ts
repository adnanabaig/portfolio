// The hero CELL VIEW: a static side view of Station AB-01's workcell. AB-01
// stands at its operator desk under a wall monitor; the arm rests in its
// home pose on the pedestal; a stack light shows green; the charging dock waits by the wall. Composed once in a
// Raster, then converted to SVG paths. Server only on first load (CellView
// keeps the server markup through hydration); the browser imports it only
// for a fresh mount, such as after a client-side navigation.
import { fillFor } from "../pixel/spriteData";
import { Raster } from "../pixel/raster";
import { pathsMarkup, rowsToPaths, type PixelPath } from "../pixel/toPaths";
import { VIEW_H, VIEW_W } from "./dims";

/** Top of the floor plane, and the line everything stands on. */
const HORIZON = 124;
const FEET = 140;
/** The vanishing point the floor seams run to. */
const VP = { x: 160, y: 60 };
/** 4x4 ordered-dither thresholds (0 to 15) for the light pools. */
const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

function drawRoom(r: Raster) {
  // HUD strip: the unit name and three status pips (decorative).
  r.rect(0, 0, VIEW_W, 11, "h");
  r.text("CELL AB-01", 4, 2, "m");
  ["g", "s", "s"].forEach((key, i) => r.rect(VIEW_W - 22 + i * 6, 4, 3, 3, key));

  // Back wall: panel seams, a lower wainscot band, and three ceiling lights
  // throwing dithered pools down the wall.
  for (let x = 32; x < VIEW_W; x += 64) r.rect(x, 11, 1, 89, "c");
  r.rect(0, 100, VIEW_W, 1, "h");
  r.rect(0, 101, VIEW_W, HORIZON - 101, "c");
  for (const cx of [86, 212, 294]) {
    for (let y = 14; y < 62; y++) {
      const half = 9 + Math.round((y - 14) * 0.5);
      const fade = (y - 14) / 48;
      for (let x = cx - half; x <= cx + half; x++) {
        const lit = (1 - Math.abs(x - cx) / (half + 1)) * (1 - fade) * 0.7;
        if (lit * 16 > BAYER[y % 4][x % 4]) r.set(x, y, "c");
      }
    }
    r.rect(cx - 12, 11, 24, 2, "s");
    r.rect(cx - 10, 13, 20, 1, "m");
  }

  // Floor: seams running to the vanishing point, and cross seams.
  r.rect(0, HORIZON, VIEW_W, VIEW_H - HORIZON, "c");
  r.rect(0, HORIZON, VIEW_W, 1, "s");
  for (let xb = -200; xb <= VIEW_W + 200; xb += 48) {
    for (let y = HORIZON + 1; y < VIEW_H; y++) {
      r.set(VP.x + ((xb - VP.x) * (y - VP.y)) / (VIEW_H - VP.y), y, "h");
    }
  }
  for (const y of [132, 146, 166]) r.rect(0, y, VIEW_W, 1, "h");
}

/** AB-01 at its operator desk, under a wall monitor showing a trace. */
function drawOperatorStation(r: Raster) {
  // Wall monitor on a bracket.
  const mx = 58;
  const my = 30;
  r.rect(mx + 26, my + 40, 4, 8, "s");
  r.rect(mx, my, 56, 40, "o");
  r.rect(mx + 1, my + 1, 54, 38, "s");
  r.rect(mx + 3, my + 3, 50, 34, "k");
  for (let x = mx + 6; x < mx + 52; x += 8) for (let y = my + 6; y < my + 36; y += 2) r.set(x, y, "i");
  r.rect(mx + 6, my + 6, 18, 1, "a");
  r.rect(mx + 6, my + 9, 12, 1, "i");
  // Two steady traces: a signal and its dimmer reference.
  for (let i = 0; i < 46; i++) {
    const x = mx + 6 + i;
    r.set(x, my + 26 + Math.round(Math.sin(i / 3.2) * 4), "t");
    r.set(x, my + 27 + Math.round(Math.sin(i / 3.2 + 1.4) * 3), "d");
  }
  r.rect(mx + 46, my + 6, 3, 3, "g");

  // Desk with a slanted console on top.
  const dx = 60;
  const top = 118;
  r.rect(dx, top, 54, 1, "o");
  r.rect(dx, top + 1, 54, 2, "a");
  r.rect(dx, top + 3, 54, 3, "s");
  r.rect(dx, top + 6, 54, 1, "o");
  r.rect(dx + 4, top + 7, 3, FEET - top - 7, "s");
  r.rect(dx + 47, top + 7, 3, FEET - top - 7, "s");
  r.rect(dx + 2, FEET, 50, 1, "k");
  // Console: an outlined wedge with a dark face, keys, and three LEDs.
  r.rect(dx + 8, top - 7, 34, 7, "o");
  r.rect(dx + 9, top - 6, 32, 6, "s");
  r.rect(dx + 11, top - 5, 18, 3, "k");
  for (let x = dx + 12; x < dx + 28; x += 3) r.set(x, top - 4, "a");
  r.rect(dx + 32, top - 4, 2, 2, "g");
  r.rect(dx + 35, top - 4, 2, 2, "y");
  r.rect(dx + 38, top - 4, 2, 2, "t");

  // AB-01 at 2x, facing the desk, with a floor shadow.
  r.rect(26, FEET, 30, 1, "k");
  r.sprite("ab01", 24, FEET - 48, 0, false, 2);
}

/** A stack light on its pole: red and amber off, green on. */
function drawStackLight(r: Raster) {
  const x = 156;
  r.rect(x + 2, 92, 2, FEET - 92, "s");
  r.rect(x - 1, FEET - 2, 8, 2, "s");
  r.rect(x - 1, FEET, 8, 1, "k");
  r.rect(x - 1, 70, 8, 22, "o");
  r.rect(x, 71, 6, 6, "s");
  r.rect(x, 78, 6, 6, "s");
  r.rect(x, 85, 6, 6, "g");
  r.rect(x + 1, 86, 2, 1, "w");
  r.rect(x - 1, 69, 8, 1, "a");
}

/** The arm in its home pose on the pedestal, gripper open. */
function drawArm(r: Raster) {
  const pedX = 188;
  r.rect(pedX + 2, FEET, 44, 1, "k");
  r.sprite("arm-pedestal", pedX, FEET - 40, 0, false, 2);
  const shoulder = { x: pedX + 24, y: FEET - 32 };
  const elbow = { x: shoulder.x + 18, y: shoulder.y - 40 };
  const wrist = { x: elbow.x + 26, y: elbow.y + 12 };
  r.capsule(shoulder.x, shoulder.y, elbow.x, elbow.y, 4.5, { outline: "o", body: "s", hi: "a" });
  r.capsule(elbow.x, elbow.y, wrist.x, wrist.y, 3.5, { outline: "o", body: "a", hi: "m" });
  r.disc(shoulder.x, shoulder.y, 5, "o");
  r.disc(shoulder.x, shoulder.y, 4, "m");
  r.rect(shoulder.x - 1, shoulder.y - 1, 2, 2, "t");
  r.disc(elbow.x, elbow.y, 5, "o");
  r.disc(elbow.x, elbow.y, 4, "m");
  r.disc(elbow.x, elbow.y, 1.6, "k");
  r.sprite("gripper", Math.round(wrist.x) - 6, Math.round(wrist.y) - 2, 0);
  // Keep-out line on the floor in front of the arm.
  for (let x = 172; x < VIEW_W - 4; x += 8) r.rect(x, 152, 4, 1, "y");
}

/** AB-01's charging dock against the right wall. */
function drawDock(r: Raster) {
  r.rect(288, FEET, 26, 1, "k");
  r.sprite("dock", 289, FEET - 32);
}

let cached: PixelPath[] | null = null;

/** The scene as palette-keyed paths (memoized). */
export function scenePaths(): PixelPath[] {
  if (cached) return cached;
  const r = new Raster(VIEW_W, VIEW_H);
  drawRoom(r);
  drawOperatorStation(r);
  drawStackLight(r);
  drawDock(r);
  drawArm(r);
  cached = rowsToPaths(r.rows());
  return cached;
}

let markup: string | null = null;

/** Inner SVG markup of the view: an ink backdrop plus one path per color. */
export function sceneMarkup(): string {
  if (markup === null) {
    markup = `<rect width="${VIEW_W}" height="${VIEW_H}" style="fill:var(--ink)"></rect>${pathsMarkup(scenePaths(), fillFor)}`;
  }
  return markup;
}
