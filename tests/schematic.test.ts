// The dossier sketch renderer (lib/schematic.ts): arrowheads that share a box
// face are spread apart, and every tip stops short of the box border.
import { describe, expect, it } from "vitest";
import schematics from "../data/schematics.json";
import { TIP_GAP, renderSchematic, type SketchLayout } from "../lib/schematic";
import type { Schematic } from "../types/portfolio";

const sketches = Object.entries(schematics).filter(([k]) => !k.startsWith("_")) as [string, Schematic][];

function heads(svg: string) {
  return [...svg.matchAll(/class="sk-head[^"]*" transform="translate\(([-\d.]+) ([-\d.]+)\) rotate\(([-\d.]+)\)"/g)].map((m) => ({
    x: Number(m[1]),
    y: Number(m[2]),
    angle: Number(m[3]),
  }));
}

// Layout constants from lib/schematic.ts: boxes are 188 x 60 with 64 between
// flow steps, starting at a 16-unit margin.
const FLOW_PERIOD = 188 + 64;
const MARGIN = 16;

describe.each(["wide", "narrow"] as SketchLayout[])("%s layout", (layout) => {
  it.each(sketches)("%s: arrowheads on one face are at least 16 units apart", (id, spec) => {
    const hs = heads(renderSchematic(spec, layout, id).svg);
    for (const [i, p] of hs.entries())
      for (const q of hs.slice(i + 1)) {
        if (p.angle !== q.angle) continue;
        const sameFace = p.angle === 0 || p.angle === 180 ? p.x === q.x : p.y === q.y;
        if (!sameFace) continue;
        const apart = p.angle === 0 || p.angle === 180 ? Math.abs(p.y - q.y) : Math.abs(p.x - q.x);
        expect(apart, `${id} heads at ${p.x},${p.y} and ${q.x},${q.y}`).toBeGreaterThanOrEqual(16);
      }
  });

  it.each(sketches)("%s: flow arrow tips stop short of the box", (id, spec) => {
    const flowAngle = layout === "wide" ? 0 : 90;
    for (const h of heads(renderSchematic(spec, layout, id).svg).filter((h) => h.angle === flowAngle)) {
      const along = layout === "wide" ? h.x : h.y;
      // Box faces on the flow axis sit at MARGIN + k * period (wide); the tip is TIP_GAP before one.
      if (layout === "wide") expect((along + TIP_GAP - MARGIN) % FLOW_PERIOD).toBe(0);
      else expect(along + TIP_GAP - MARGIN).toBeGreaterThan(0);
    }
  });
});

it("operator-hmi: the control app wire and the hardware-checks gate enter DEMONSTRATION RECORDING at separate ports", () => {
  const spec = (schematics as unknown as Record<string, Schematic>)["operator-hmi"];
  const hs = heads(renderSchematic(spec, "wide", "t").svg).filter((h) => h.angle === 0);
  const byX = new Map<number, number[]>();
  for (const h of hs) byX.set(h.x, [...(byX.get(h.x) ?? []), h.y]);
  expect([...byX.values()].some((ys) => ys.length === 2 && Math.abs(ys[0] - ys[1]) >= 24)).toBe(true);
});
