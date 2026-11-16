// Geometry of the Teleop Cell, shared by the SSR poster and the canvas game.
// Units are logical pixels in a 320x180 frame.
import portfolio from "../../data/portfolio.json";
import type { PortfolioData } from "../../types/portfolio";
import { Raster } from "../pixel/raster";

const data = portfolio as PortfolioData;

export const CELL_W = 320;
export const CELL_H = 180;

export const BASE = { x: 160, y: 100 };
export const LINK1 = 64;
export const LINK2 = 64;
export const CONVEYOR_Y = 20;
export const BIN_Y = 140;
export const BIN_W = 72;
export const BIN_H = 36;
export const binX = (i: number) => 8 + i * 78;

/** Palette keys per skill group: [top face / rim / label, front face]. */
export const GROUP_KEYS: [string, string][] = [
  ["t", "d"],
  ["y", "x"],
  ["g", "e"],
  ["p", "s"],
];

/** Bin label: the group's first word ("Robotics & ML" becomes "ROBOTICS"). */
export const binLabel = (group: string) => group.split(/\s+/)[0].toUpperCase();

/** One short skill per group for the poster's conveyor (real skills only). */
export function posterBlocks() {
  return data.skills.map((group, gi) => {
    const skill = group.items.find((s) => s.length <= 8) ?? group.items[0];
    return { skill, label: skill.toUpperCase(), group: gi };
  });
}

/** Two-link inverse kinematics. Returns joint angles (radians) or null if unreachable. */
export function solveIK(tx: number, ty: number, elbowRight = true) {
  const dx = tx - BASE.x;
  const dy = ty - BASE.y;
  const d2 = dx * dx + dy * dy;
  const c2 = (d2 - LINK1 * LINK1 - LINK2 * LINK2) / (2 * LINK1 * LINK2);
  if (c2 < -1 || c2 > 1) return null;
  // Screen y points down, so a negative elbow angle puts the elbow on the right.
  const q2 = Math.acos(c2) * (elbowRight ? -1 : 1);
  const q1 = Math.atan2(dy, dx) - Math.atan2(LINK2 * Math.sin(q2), LINK1 + LINK2 * Math.cos(q2));
  return { q1, q2 };
}

export function forward(q1: number, q2: number) {
  const ex = BASE.x + LINK1 * Math.cos(q1);
  const ey = BASE.y + LINK1 * Math.sin(q1);
  return { ex, ey, wx: ex + LINK2 * Math.cos(q1 + q2), wy: ey + LINK2 * Math.sin(q1 + q2) };
}

export function drawBlock(r: Raster, label: string, x: number, y: number, group: number) {
  const [top, front] = GROUP_KEYS[group % GROUP_KEYS.length];
  const w = Raster.textWidth(label) + 6;
  r.rect(x - 1, y - 1, w + 2, 14, "o");
  r.rect(x, y, w, 9, top);
  r.rect(x, y + 9, w, 3, front);
  r.text(label, x + 3, y + 1, "k");
  return w;
}

/** The static scene: HUD, floor, conveyor, bins, pedestal. */
export function drawStatic(r: Raster, hudRight = "SIM  STANDBY") {
  // HUD strip
  r.rect(0, 0, CELL_W, 11, "h");
  r.text("CELL AB-01", 4, 2, "m");
  r.text(hudRight, CELL_W - 4 - Raster.textWidth(hudRight), 2, "y");
  // Floor marks
  for (let y = 56; y < 136; y += 32)
    for (let x = 16; x < CELL_W; x += 32) {
      r.rect(x - 1, y, 3, 1, "i");
      r.rect(x, y - 1, 1, 3, "i");
    }
  // Conveyor
  r.rect(0, CONVEYOR_Y, CELL_W, 1, "o");
  r.rect(0, CONVEYOR_Y + 1, CELL_W, 1, "a");
  r.rect(0, CONVEYOR_Y + 2, CELL_W, 12, "k");
  for (let x = 4; x < CELL_W; x += 16) r.rect(x, CONVEYOR_Y + 2, 1, 12, "i");
  r.rect(0, CONVEYOR_Y + 14, CELL_W, 1, "a");
  r.rect(0, CONVEYOR_Y + 15, CELL_W, 3, "s");
  r.rect(0, CONVEYOR_Y + 18, CELL_W, 1, "o");
  for (let x = 12; x < CELL_W; x += 40) r.set(x, CONVEYOR_Y + 16, "y");
  // Safety line above the bins
  for (let x = 4; x < CELL_W - 4; x += 8) r.rect(x, BIN_Y - 6, 4, 1, "y");
  // Bins
  data.skills.forEach((group, i) => {
    const [rim] = GROUP_KEYS[i % GROUP_KEYS.length];
    const x = binX(i);
    r.rect(x, BIN_Y, BIN_W, BIN_H, "o");
    r.rect(x + 1, BIN_Y + 1, BIN_W - 2, 2, rim);
    r.rect(x + 2, BIN_Y + 3, BIN_W - 4, 15, "k");
    r.rect(x + 1, BIN_Y + 18, BIN_W - 2, 1, "m");
    r.rect(x + 1, BIN_Y + 19, BIN_W - 2, BIN_H - 20, "h");
    const label = binLabel(group.group);
    r.text(label, x + Math.round((BIN_W - Raster.textWidth(label)) / 2), BIN_Y + 23, rim);
  });
  // Keep-out ring around the pedestal: short dashes
  for (let a = 0; a < 360; a += 3) {
    if (Math.floor(a / 15) % 2) continue;
    const t = (a * Math.PI) / 180;
    r.set(BASE.x + Math.cos(t) * 30, BASE.y + Math.sin(t) * 30, "y");
  }
  // Pedestal (top view)
  r.disc(BASE.x, BASE.y, 11, "o");
  r.disc(BASE.x, BASE.y, 10, "s");
  r.disc(BASE.x, BASE.y, 8, "a");
}

/** The arm at the given joint angles, with the gripper open or closed. */
export function drawArm(r: Raster, q1: number, q2: number, closed = false) {
  const { ex, ey, wx, wy } = forward(q1, q2);
  r.capsule(BASE.x, BASE.y, ex, ey, 4.5, { outline: "o", body: "s", hi: "a" });
  r.capsule(ex, ey, wx, wy, 3.5, { outline: "o", body: "a", hi: "m" });
  r.disc(BASE.x, BASE.y, 6, "m");
  r.disc(BASE.x, BASE.y, 3, "s");
  r.rect(BASE.x - 1, BASE.y - 1, 2, 2, "t");
  r.disc(ex, ey, 5, "o");
  r.disc(ex, ey, 4, "m");
  r.disc(ex, ey, 1.6, "k");
  r.sprite("gripper", Math.round(wx) - 6, Math.round(wy) - 6, closed ? 1 : 0);
}
