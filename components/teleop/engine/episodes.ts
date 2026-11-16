// Demonstration episodes: the operator's command stream recorded at 30 Hz,
// capped at 60 s, the last three kept in sessionStorage. Replays feed the
// same command pipeline (latency included) as a live operator.

export interface Command {
  x: number;
  y: number;
  grip: boolean;
}

/** One frame: [ms since start, x, y, grip 0|1]. Compact for storage. */
export type Frame = [number, number, number, number];

export interface Episode {
  n: number;
  durationMs: number;
  frames: Frame[];
}

export const REC_HZ = 30;
export const REC_MAX_MS = 60000;
export const KEEP = 3;

export class Recorder {
  private frames: Frame[] = [];
  private t0 = 0;
  private last = -Infinity;
  active = false;

  start(now: number) {
    this.frames = [];
    this.t0 = now;
    this.last = -Infinity;
    this.active = true;
  }

  elapsed(now: number) {
    return this.active ? Math.min(REC_MAX_MS, now - this.t0) : 0;
  }

  /** Samples at 30 Hz. Returns false once the 60 s cap is hit (caller stops). */
  sample(now: number, cmd: Command): boolean {
    if (!this.active) return false;
    const t = now - this.t0;
    if (t >= REC_MAX_MS) return false;
    if (t - this.last >= 1000 / REC_HZ - 0.5) {
      this.frames.push([Math.round(t), Math.round(cmd.x * 10) / 10, Math.round(cmd.y * 10) / 10, cmd.grip ? 1 : 0]);
      this.last = t;
    }
    return true;
  }

  stop(now: number, n: number): Episode | null {
    if (!this.active) return null;
    this.active = false;
    if (this.frames.length < 2) return null;
    return { n, durationMs: Math.min(REC_MAX_MS, Math.round(now - this.t0)), frames: this.frames };
  }
}

export class Player {
  private i = 0;
  private t0 = 0;
  constructor(readonly episode: Episode) {}

  start(now: number) {
    this.i = 0;
    this.t0 = now;
  }

  /** The command due at `now`, or null when the episode is over. */
  next(now: number): Command | null {
    const t = now - this.t0;
    const f = this.episode.frames;
    if (t > this.episode.durationMs || this.i >= f.length) return null;
    while (this.i + 1 < f.length && f[this.i + 1][0] <= t) this.i++;
    const [, x, y, g] = f[this.i];
    return { x, y, grip: g === 1 };
  }

  progress(now: number) {
    return Math.min(1, (now - this.t0) / Math.max(1, this.episode.durationMs));
  }
}

const isFrame = (f: unknown): f is Frame => Array.isArray(f) && f.length === 4 && f.every((v) => typeof v === "number" && Number.isFinite(v));

/**
 * Parses stored episodes defensively: an episode survives only if every
 * frame is four finite numbers (the shape Recorder writes), so a replay can
 * never feed NaN into the arm. Bad data yields an empty list.
 */
export function parseEpisodes(raw: string | null): Episode[] {
  if (!raw) return [];
  try {
    const list = JSON.parse(raw);
    if (!Array.isArray(list)) return [];
    return list
      .filter(
        (e) =>
          e &&
          Number.isFinite(e.n) &&
          Number.isFinite(e.durationMs) &&
          e.durationMs >= 0 &&
          Array.isArray(e.frames) &&
          e.frames.length >= 2 &&
          e.frames.every(isFrame)
      )
      .slice(-KEEP);
  } catch {
    return [];
  }
}

export const keepLatest = (list: Episode[], ep: Episode) => [...list, ep].slice(-KEEP);
