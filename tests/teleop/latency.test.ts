import { describe, expect, it } from "vitest";
import { CommandBuffer, RttTrace } from "../../components/teleop/engine/latency";
import { CommandLink } from "../../components/teleop/engine/link";

describe("CommandBuffer (simulated link latency)", () => {
  it("holds the last delivered command until a newer one is old enough", () => {
    const b = new CommandBuffer<string>(8);
    b.reset("start");
    for (let t = 0; t <= 300; t += 50) b.push(t, `cmd@${t}`);
    expect(b.sample(100, 120)).toBe("start");
    expect(b.sample(220, 120)).toBe("cmd@100");
    expect(b.sample(1000, 120)).toBe("cmd@300");
    expect(b.pending).toBe(0);
  });

  it.each([0, 16, 60, 120, 300])("delays a 60 Hz command stream by exactly %i ms", (delay) => {
    const b = new CommandBuffer<number>(256);
    b.reset(-1);
    const dt = 1000 / 60;
    for (let i = 0; i < 600; i++) {
      const now = i * dt;
      b.push(now, now); // the payload is its own issue time
      const got = b.sample(now, delay)!;
      if (now < delay) {
        expect(got).toBe(-1);
      } else {
        // The newest command issued at or before now - delay.
        expect(got).toBeLessThanOrEqual(now - delay + 1e-9);
        expect(now - delay - got).toBeLessThan(dt);
      }
    }
  });

  it("delivers immediately at zero latency", () => {
    const b = new CommandBuffer<string>();
    b.push(10, "a");
    expect(b.sample(10, 0)).toBe("a");
  });

  it("a full ring drops its oldest entry and keeps the newest", () => {
    const full = new CommandBuffer<number>(4);
    for (let t = 0; t < 10; t++) full.push(t, t);
    expect(full.pending).toBe(4);
    expect(full.sample(100, 0)).toBe(9);
  });

  it("reset drops in-flight commands", () => {
    const b = new CommandBuffer<string>();
    b.push(0, "a");
    b.push(10, "b");
    b.reset("here");
    expect(b.pending).toBe(0);
    expect(b.sample(1000, 0)).toBe("here");
  });

  it("returns undefined before anything is delivered", () => {
    const b = new CommandBuffer<string>();
    b.push(100, "late");
    expect(b.sample(50, 0)).toBeUndefined();
  });
});

describe("RttTrace", () => {
  it("keeps the last N samples oldest first, at about twice the one-way delay", () => {
    const r = new RttTrace(5);
    for (let i = 0; i < 8; i++) r.add(100, 0.5);
    expect(r.ordered()).toEqual([200, 200, 200, 200, 200]);
    const fresh = new RttTrace(5);
    fresh.add(10, 0.5);
    fresh.add(20, 0.5);
    expect(fresh.ordered()).toEqual([20, 40]);
  });
  it("never reports a negative round trip", () => {
    const r = new RttTrace(3);
    r.add(0, 0);
    expect(r.ordered()[0]).toBeGreaterThanOrEqual(0);
  });
});

describe("CommandLink", () => {
  it("sends only changed commands and hands the arm the live command until one is due", () => {
    const op = { x: 10, y: 20, grip: false };
    const link = new CommandLink(op);
    link.offer(0, op);
    expect(link.pending).toBe(0);
    op.x = 11;
    link.offer(0, op);
    link.offer(5, op);
    expect(link.pending).toBe(1);
    const live = { x: 99, y: 99, grip: true };
    expect(link.sample(0, 100, live)).toEqual({ x: 10, y: 20, grip: false });
    expect(link.sample(100, 100, live)).toEqual({ x: 11, y: 20, grip: false });
    link.reset({ x: 1, y: 2, grip: false });
    expect(link.pending).toBe(0);
  });
});
