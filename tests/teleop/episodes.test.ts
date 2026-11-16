import { describe, expect, it } from "vitest";
import { KEEP, Player, REC_MAX_MS, Recorder, keepLatest, parseEpisodes, type Command, type Episode } from "../../components/teleop/engine/episodes";

const record = (ms: number, cmdAt: (t: number) => Command) => {
  const rec = new Recorder();
  rec.start(0);
  for (let t = 0; t <= ms; t += 1000 / 60) rec.sample(t, cmdAt(t));
  return rec.stop(ms, 1)!;
};
const path = (t: number): Command => ({ x: 100 + t / 100, y: 50 + Math.sin(t / 300) * 10, grip: t > 1000 });

describe("Recorder", () => {
  it("downsamples 60 Hz input to 30 Hz frames", () => {
    const ep = record(2000, path);
    expect(Math.abs(ep.frames.length - 61)).toBeLessThanOrEqual(1);
    for (let i = 1; i < ep.frames.length; i++) expect(ep.frames[i][0] - ep.frames[i - 1][0]).toBeGreaterThanOrEqual(32);
  });
  it("stops at the 60 s cap", () => {
    const rec = new Recorder();
    rec.start(0);
    expect(rec.sample(REC_MAX_MS - 1000, { x: 0, y: 0, grip: false })).toBe(true);
    expect(rec.sample(REC_MAX_MS, { x: 0, y: 0, grip: false })).toBe(false);
    expect(rec.elapsed(REC_MAX_MS + 5000)).toBe(REC_MAX_MS);
  });
  it("discards a recording shorter than two frames", () => {
    const rec = new Recorder();
    rec.start(0);
    rec.sample(0, { x: 1, y: 1, grip: false });
    expect(rec.stop(10, 1)).toBeNull();
  });
  it("is inactive until started and after stopping", () => {
    const rec = new Recorder();
    expect(rec.sample(0, { x: 0, y: 0, grip: false })).toBe(false);
    expect(rec.stop(0, 1)).toBeNull();
  });
});

describe("Player", () => {
  it("returns the command due at each time and ends after the duration", () => {
    const ep = record(2000, path);
    const p = new Player(ep);
    p.start(0);
    const mid = p.next(1500)!;
    expect(mid.grip).toBe(true);
    expect(mid.x).toBeCloseTo(115, 0);
    expect(p.next(2500)).toBeNull();
  });

  it("replays the recorded stream exactly at the frame times (record/replay round trip)", () => {
    const ep = record(3000, path);
    const p = new Player(ep);
    p.start(1000);
    for (const [t, x, y, g] of ep.frames) expect(p.next(1000 + t)).toEqual({ x, y, grip: g === 1 });
  });

  it("two players over one episode produce identical streams (deterministic)", () => {
    const ep = record(3000, path);
    const run = () => {
      const p = new Player(ep);
      p.start(0);
      const out: (Command | null)[] = [];
      for (let t = 0; t <= 3100; t += 1000 / 60) out.push(p.next(t));
      return out;
    };
    expect(run()).toEqual(run());
  });

  it("reports progress from 0 to 1", () => {
    const ep = record(1000, path);
    const p = new Player(ep);
    p.start(0);
    expect(p.progress(0)).toBe(0);
    expect(p.progress(500)).toBeCloseTo(0.5, 2);
    expect(p.progress(5000)).toBe(1);
  });
});

describe("storage", () => {
  const ep = (n: number): Episode => ({ n, durationMs: 1000, frames: [[0, 1, 2, 0], [33, 1, 2, 1]] });

  it(`keeps only the latest ${KEEP} episodes`, () => {
    let list: Episode[] = [];
    for (let n = 1; n <= 5; n++) list = keepLatest(list, ep(n));
    expect(list.map((e) => e.n)).toEqual([3, 4, 5]);
  });

  it("round-trips through JSON", () => {
    const list = [ep(1), ep(2)];
    expect(parseEpisodes(JSON.stringify(list))).toEqual(list);
  });

  it.each([null, "", "not json", "{}", '"str"', "[1,2]", '[{"n":"x","durationMs":1,"frames":[]}]'])("bad data %j yields an empty list", (raw) => {
    expect(parseEpisodes(raw)).toEqual([]);
  });
});
