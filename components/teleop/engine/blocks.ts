// Skill blocks: the catalog (data-driven, no fact text here) and the little
// physics world they live in. Top view with a z axis: blocks ride the
// conveyor, get carried at a lift height, fall under gravity when released,
// stack on whatever they land on (AABB footprint overlap), and sort into bins.
import portfolio from "../../../data/portfolio.json";
import teleop from "../../../data/teleop.json";
import type { PortfolioData } from "../../../types/portfolio";
import { BIN_H, BIN_W, BIN_Y, CONVEYOR_Y, binX } from "../../../lib/teleop/scene";
import { FONT_ADVANCE } from "../../../lib/pixel/raster";

const data = portfolio as PortfolioData;

export interface CatalogEntry {
  /** Short label drawn on the block (data/teleop.json). */
  label: string;
  /** Exact skill string from data/portfolio.json. */
  skill: string;
  /** Exact group name from data/portfolio.json. */
  group: string;
  groupIndex: number;
}

/** Every skill as a block, in resume order. Throws if the catalog drifts from the data. */
export function buildCatalog(blocks: Record<string, string> = teleop.blocks, groups = data.skills): CatalogEntry[] {
  const bySkill = new Map(Object.entries(blocks).map(([label, skill]) => [skill, label]));
  return groups.flatMap((g, groupIndex) =>
    g.items.map((skill) => {
      const label = bySkill.get(skill);
      if (!label) throw new Error(`data/teleop.json has no block for "${skill}"`);
      return { label, skill, group: g.group, groupIndex };
    })
  );
}

/** The bin index a skill belongs in (its group's position in data.skills), or -1. */
export function binForSkill(skill: string, groups = data.skills) {
  return groups.findIndex((g) => g.items.includes(skill));
}

export const GROUPS = data.skills.map((g) => g.group);
export const SKILL_COUNT = data.skills.reduce((n, g) => n + g.items.length, 0);

// Geometry (logical px).
export const BLOCK_H = 12; // footprint depth
export const BLOCK_T = 4; // thickness for stacking
export const CARRY_Z = 10;
export const BELT_Y = CONVEYOR_Y + 3;
export const BELT_TOP = CONVEYOR_Y;
export const BELT_BOTTOM = CONVEYOR_Y + 18;
export const BELT_STOP = 262; // right end stop; blocks queue against it
export const BELT_MAX = 5;
export const GRAVITY = 520; // px/s^2 in z
export const blockWidth = (label: string) => label.length * FONT_ADVANCE - 1 + 6;

export interface Block {
  id: number;
  entry: CatalogEntry;
  x: number; // footprint top-left
  y: number;
  w: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  state: "queued" | "belt" | "free" | "held" | "air" | "binned";
}

export interface BinState {
  sorted: CatalogEntry[];
  /** Seconds left on the misroute (coral) LED. */
  fault: number;
}

export type WorldEvent =
  | { type: "sorted"; entry: CatalogEntry; bin: number; total: number }
  | { type: "misroute"; entry: CatalogEntry; bin: number }
  | { type: "landed"; entry: CatalogEntry };

export const binRect = (i: number) => ({ x: binX(i), y: BIN_Y, w: BIN_W, h: BIN_H });
const overlap = (a: Block, b: Block) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + BLOCK_H && b.y < a.y + BLOCK_H;

function shuffle<T>(list: T[], rand: () => number) {
  const out = list.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export class World {
  blocks: Block[] = [];
  bins: BinState[] = GROUPS.map(() => ({ sorted: [], fault: 0 }));
  sortedCount = 0;
  beltOffset = 0;
  /** True while anything is still moving on its own. */
  busy = false;

  constructor(catalog: CatalogEntry[], rand: () => number = Math.random, readonly beltSpeed = 18) {
    // Interleave groups so the first few blocks are varied.
    this.blocks = shuffle(catalog, rand).map((entry, id) => ({
      id,
      entry,
      x: -100,
      y: BELT_Y,
      w: blockWidth(entry.label),
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      state: "queued" as const,
    }));
    this.packBelt(true);
  }

  belt() {
    return this.blocks.filter((b) => b.state === "belt").sort((a, b) => b.x - a.x);
  }

  /** Snaps belt blocks against the stop (static shelf) and fills free slots. */
  packBelt(fill: boolean) {
    let edge = BELT_STOP;
    for (const b of this.belt()) {
      b.x = edge - b.w;
      edge = b.x - 4;
    }
    if (!fill) return;
    let count = this.belt().length;
    for (const b of this.blocks) {
      if (count >= BELT_MAX) break;
      if (b.state !== "queued") continue;
      if (edge - b.w < 0) break;
      b.state = "belt";
      b.x = edge - b.w;
      b.y = BELT_Y;
      edge = b.x - 4;
      count++;
    }
  }

  /** The topmost resting block whose footprint contains (x, y), if any. */
  pickAt(x: number, y: number, slop = 3): Block | null {
    let best: Block | null = null;
    for (const b of this.blocks) {
      if (b.state !== "belt" && b.state !== "free") continue;
      if (x < b.x - slop || x > b.x + b.w + slop || y < b.y - slop || y > b.y + BLOCK_H + slop) continue;
      if (!best || b.z > best.z) best = b;
    }
    return best;
  }

  /** Height of the highest block under `b`'s footprint at or below `maxZ`. */
  private supportUnder(b: Block, maxZ: number) {
    let top = 0;
    for (const o of this.blocks) {
      if (o === b || (o.state !== "free" && o.state !== "belt")) continue;
      const t = o.z + BLOCK_T;
      if (t <= maxZ + 0.01 && t > top && overlap(b, o)) top = t;
    }
    return top;
  }

  hold(b: Block) {
    b.state = "held";
    b.vx = b.vy = b.vz = 0;
  }

  release(b: Block) {
    b.state = "air";
    b.vz = 0;
  }

  step(dt: number, reduced: boolean): WorldEvent[] {
    const events: WorldEvent[] = [];
    let busy = false;

    // Conveyor: belt blocks drift right and queue against the stop.
    if (reduced) {
      this.packBelt(true);
    } else {
      const belt = this.belt();
      let edge = BELT_STOP;
      let moved = false;
      for (const b of belt) {
        const nx = Math.min(b.x + this.beltSpeed * dt, edge - b.w);
        if (nx > b.x + 1e-3) moved = true;
        b.x = Math.max(b.x, nx);
        edge = b.x - 4;
      }
      const left = belt.length ? belt[belt.length - 1].x : BELT_STOP;
      if (belt.length < BELT_MAX && left > 4) {
        const next = this.blocks.find((b) => b.state === "queued");
        if (next) {
          next.state = "belt";
          next.x = Math.min(-next.w, left - 4 - next.w);
          next.y = BELT_Y;
          moved = true;
        }
      }
      if (moved) {
        this.beltOffset = (this.beltOffset + this.beltSpeed * dt) % 16;
        busy = true;
      }
    }

    for (const b of this.blocks) {
      if (b.state === "free" && b.z > 0) {
        // Lost its support (the block below rode away): fall.
        if (this.supportUnder(b, b.z) < b.z - 0.01) b.state = "air";
      }
      if (b.state !== "air") continue;
      busy = true;
      const prevZ = b.z;
      b.vz -= GRAVITY * dt;
      b.z += b.vz * dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      const floor = this.supportUnder(b, prevZ);
      if (b.z > floor) continue;
      b.z = floor;
      b.vz = b.vx = b.vy = 0;
      if (floor > 0) {
        b.state = "free";
        events.push({ type: "landed", entry: b.entry });
        continue;
      }
      const cx = b.x + b.w / 2;
      const cy = b.y + BLOCK_H / 2;
      const bin = this.bins.findIndex((_, i) => {
        const r = binRect(i);
        return cx >= r.x && cx <= r.x + r.w && cy >= r.y - 6 && cy <= r.y + r.h;
      });
      if (bin >= 0) {
        if (bin === b.entry.groupIndex) {
          b.state = "binned";
          this.bins[bin].sorted.push(b.entry);
          this.sortedCount++;
          events.push({ type: "sorted", entry: b.entry, bin, total: this.sortedCount });
        } else {
          // Bounce back out over the safety line onto the floor.
          this.bins[bin].fault = 1;
          events.push({ type: "misroute", entry: b.entry, bin });
          if (reduced) {
            // No arc under reduced motion: it cuts straight to the floor above the bins.
            b.x = Math.min(300, Math.max(20, b.x));
            b.y = BIN_Y - 24;
            b.z = this.supportUnder(b, Infinity);
            b.state = "free";
            continue;
          }
          b.state = "air";
          b.z = 1;
          b.vz = 150;
          const t = (2 * 150) / GRAVITY;
          b.vy = (BIN_Y - 24 - b.y) / t;
          b.vx = (Math.min(300, Math.max(20, b.x)) - b.x) / t;
        }
      } else if (cy >= BELT_TOP && cy <= BELT_BOTTOM) {
        b.state = "belt";
        b.y = BELT_Y;
      } else {
        b.state = "free";
        events.push({ type: "landed", entry: b.entry });
      }
    }

    for (const bin of this.bins) {
      if (bin.fault > 0) {
        bin.fault = Math.max(0, bin.fault - dt);
        busy = true;
      }
    }
    this.busy = busy;
    return events;
  }

  get remaining() {
    return this.blocks.filter((b) => b.state !== "binned").length;
  }
}
