// Drawing: the scene goes into a palette-indexed Raster (the same one the SSR
// poster uses), then one putImageData + an integer-scaled drawImage puts it
// on screen. Colors come from the live CSS custom properties, so the amber
// and mono themes recolor the canvas too.
import { PALETTE_KEYS, Raster } from "../../../lib/pixel/raster";
import { palette } from "../../../lib/pixel/spriteData";
import {
  BIN_W,
  BIN_Y,
  CELL_H,
  CELL_W,
  CONVEYOR_Y,
  GROUP_KEYS,
  binX,
  drawArm,
  drawBlock,
  drawGripper,
  drawStatic,
} from "../../../lib/teleop/scene";
import { BELT_STOP, BLOCK_H, SKILL_COUNT, type Block, type World } from "./blocks";
import type { Arm } from "./arm";
import type { Mode } from "./safety";
import { deg, label, pad, secs, textRight } from "./bitmapText";

export interface HudState {
  mode: Mode;
  latency: number;
  rtt: number[];
  episode: number;
  episodeMs: number;
  recording: boolean;
  replaying: boolean;
  operator: { x: number; y: number } | null;
  limit: boolean;
  deadmanWaiting: boolean;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  key: string;
}

function parseColor(value: string, fallback: string) {
  const v = value.trim() || fallback;
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(v);
  if (!m) return parseColor(fallback, "#000000");
  const hex = m[1].length === 3 ? m[1].replace(/./g, (c) => c + c) : m[1];
  const n = parseInt(hex, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export class Screen {
  readonly frame = new Raster(CELL_W, CELL_H);
  private base = new Raster(CELL_W, CELL_H);
  private lut = new Uint32Array(PALETTE_KEYS.length);
  private image: ImageData;
  private buf: HTMLCanvasElement;
  private bctx: CanvasRenderingContext2D;
  private ctx: CanvasRenderingContext2D;
  private scale = 1;

  constructor(private canvas: HTMLCanvasElement) {
    this.buf = document.createElement("canvas");
    this.buf.width = CELL_W;
    this.buf.height = CELL_H;
    this.bctx = this.buf.getContext("2d") as CanvasRenderingContext2D;
    this.ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
    this.image = this.bctx.createImageData(CELL_W, CELL_H);
    drawStatic(this.base, "");
    this.refreshPalette();
    this.resize();
  }

  /** Re-reads the theme colors from CSS. */
  refreshPalette() {
    const css = getComputedStyle(document.documentElement);
    const little = new Uint8Array(new Uint32Array([1]).buffer)[0] === 1;
    PALETTE_KEYS.forEach((key, i) => {
      const entry = i === 0 ? { var: "--ink", hex: "#0B0E14" } : palette[key];
      const [r, g, b] = parseColor(css.getPropertyValue(entry.var), entry.hex);
      this.lut[i] = little ? (255 << 24) | (b << 16) | (g << 8) | r : (r << 24) | (g << 16) | (b << 8) | 255;
    });
    this.lut[0] = this.lut[PALETTE_KEYS.indexOf("k")];
  }

  /** Largest integer scale that fits the box, DPR-aware, capped at 4. */
  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const s = Math.max(1, Math.min(4, Math.floor((rect.width * dpr) / CELL_W) || 1));
    if (s !== this.scale || this.canvas.width !== CELL_W * s) {
      this.scale = s;
      this.canvas.width = CELL_W * s;
      this.canvas.height = CELL_H * s;
    }
  }

  begin() {
    this.frame.copyFrom(this.base);
  }

  blit(shakeX = 0, shakeY = 0) {
    const px = this.frame.px;
    const out = new Uint32Array(this.image.data.buffer);
    for (let i = 0; i < px.length; i++) out[i] = this.lut[px[i]];
    this.bctx.putImageData(this.image, 0, 0);
    const ctx = this.ctx;
    ctx.imageSmoothingEnabled = false;
    if (shakeX || shakeY) {
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
    ctx.drawImage(this.buf, shakeX * this.scale, shakeY * this.scale, CELL_W * this.scale, CELL_H * this.scale);
  }
}

const MODE_KEY: Record<Mode, string> = { TELEOP: "t", AUTO: "b", PARKED: "y", STOPPED: "r", REPLAY: "p" };

function drawBelt(r: Raster, offset: number) {
  r.rect(0, CONVEYOR_Y + 2, CELL_W, 12, "k");
  for (let x = 4 + Math.floor(offset) - 16; x < CELL_W; x += 16) r.rect(x, CONVEYOR_Y + 2, 1, 12, "i");
  // End stop the queue rests against.
  r.rect(BELT_STOP + 1, CONVEYOR_Y + 1, 3, 16, "o");
  r.rect(BELT_STOP + 2, CONVEYOR_Y + 2, 1, 14, "y");
}

function drawBlockAt(r: Raster, b: Block) {
  if (b.z > 0.5) {
    // Shadow on the ground, block lifted by its height.
    r.rect(Math.round(b.x) + 1, Math.round(b.y) + 2, b.w, BLOCK_H - 1, "o");
  }
  drawBlock(r, b.entry.label, Math.round(b.x), Math.round(b.y - b.z), b.entry.groupIndex);
}

function drawBins(r: Raster, world: World) {
  world.bins.forEach((bin, i) => {
    const x = binX(i);
    const [top, front] = GROUP_KEYS[i % GROUP_KEYS.length];
    // Pile of sorted bricks, bottom row first.
    bin.sorted.forEach((_, k) => {
      const col = k % 7;
      const row = Math.floor(k / 7);
      const bx = x + 3 + col * 9;
      const by = BIN_Y + 13 - row * 4;
      if (by < BIN_Y + 3) return;
      r.rect(bx, by, 8, 2, top);
      r.rect(bx, by + 2, 8, 1, front);
    });
    // Status LED on the rim: coral after a misroute, leaf once the bin has a correct sort.
    const led = bin.fault > 0 ? "r" : bin.sorted.length ? "g" : "s";
    r.rect(x + BIN_W - 9, BIN_Y, 7, 3, "o");
    r.rect(x + BIN_W - 8, BIN_Y + 1, 5, 1, led);
  });
}

function drawCrosshair(r: Raster, x: number, y: number, key: string) {
  const cx = Math.round(x);
  const cy = Math.round(y);
  r.rect(cx - 5, cy, 3, 1, key);
  r.rect(cx + 3, cy, 3, 1, key);
  r.rect(cx, cy - 5, 1, 3, key);
  r.rect(cx, cy + 3, 1, 3, key);
}

function drawSpark(r: Raster, samples: number[], x: number, y: number, w: number, h: number) {
  r.rect(x, y + h - 1, w, 1, "i");
  const max = Math.max(80, ...samples);
  const start = w - samples.length;
  samples.forEach((s, i) => {
    const v = Math.round((s / max) * (h - 1));
    r.set(x + start + i, y + h - 1 - v, "t");
  });
}

export function drawFrame(
  screen: Screen,
  world: World,
  arm: Arm,
  hud: HudState,
  particles: Particle[]
) {
  const r = screen.frame;
  screen.begin();
  drawBelt(r, world.beltOffset);
  drawBins(r, world);

  const ground = world.blocks.filter((b) => b.state === "belt" || b.state === "free");
  ground.sort((a, b) => a.z - b.z || a.y - b.y);
  for (const b of ground) drawBlockAt(r, b);
  for (const b of world.blocks) if (b.state === "air") drawBlockAt(r, b);

  drawArm(r, arm.q1, arm.q2, arm.closed, false);
  const w = arm.wrist;
  if (arm.held) drawBlockAt(r, arm.held);
  drawGripper(r, w.x, w.y, arm.closed);

  for (const p of particles) r.set(p.x, p.y, p.key);

  if (hud.operator && hud.mode !== "STOPPED" && hud.mode !== "PARKED") {
    drawCrosshair(r, hud.operator.x, hud.operator.y, hud.mode === "TELEOP" ? "t" : "b");
  }
  if (hud.limit) {
    const lx = Math.min(CELL_W - 36, Math.max(4, Math.round(w.x) + 8));
    const ly = Math.min(CELL_H - 12, Math.max(24, Math.round(w.y) - 14));
    label(r, "LIMIT", lx, ly, "y");
  }
  if (hud.deadmanWaiting) label(r, "HOLD TO MOVE", 6, CELL_H - 50, "y");

  // HUD row 1: mode, joints, gripper.
  r.rect(0, 0, CELL_W, 11, "h");
  r.text("SIM", 4, 2, "m");
  r.text(hud.mode, 28, 2, MODE_KEY[hud.mode]);
  r.text(`Q1 ${deg(arm.q1)} Q2 ${deg(arm.q2)}`, 106, 2, "m");
  textRight(r, arm.closed ? (arm.held ? "GRIP LOAD" : "GRIP SHUT") : "GRIP OPEN", CELL_W - 4, 2, arm.closed ? "y" : "t");

  // HUD row 2: link, episode, progress.
  r.text(`LAT ${pad(hud.latency, 3)}MS`, 4, 12, "m");
  drawSpark(r, hud.rtt, 68, 12, 40, 7);
  if (hud.episode > 0 || hud.recording) {
    r.text(`EP ${pad(hud.episode, 3)} ${secs(hud.episodeMs)}`, 116, 12, "m");
    if (hud.recording) r.text("REC", 194, 12, "r");
    else if (hud.replaying) r.text("PLAY", 194, 12, "p");
  }
  textRight(r, `SORTED ${pad(world.sortedCount, 2)}/${SKILL_COUNT}`, CELL_W - 4, 12, world.sortedCount === SKILL_COUNT ? "g" : "m");

  if (hud.mode === "STOPPED") {
    r.rect(0, 11, CELL_W, 1, "r");
    r.rect(0, CELL_H - 2, CELL_W, 2, "r");
    r.rect(0, 11, 2, CELL_H - 11, "r");
    r.rect(CELL_W - 2, 11, 2, CELL_H - 11, "r");
  }
}
