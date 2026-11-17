// The hero cell view's scene (lib/workcell/scene.ts): a static render that
// fills its 320x180 frame with palette colors only and draws nothing from
// the old teleop game.
import { describe, expect, it } from "vitest";
import spriteJson from "../lib/pixel/sprites.json";
import { VIEW_H, VIEW_W } from "../lib/workcell/dims";
import { sceneMarkup, scenePaths } from "../lib/workcell/scene";

const rects = (d: string) =>
  [...d.matchAll(/M(\d+) (\d+)h(\d+)v(\d+)/g)].map((m) => ({ x: +m[1], y: +m[2], w: +m[3], h: +m[4] }));

describe("cell view scene", () => {
  it("stays inside its frame and uses only palette keys", () => {
    const paths = scenePaths();
    expect(paths.length).toBeGreaterThan(5);
    for (const p of paths) {
      expect(Object.keys(spriteJson.palette)).toContain(p.key);
      for (const r of rects(p.d)) {
        expect(r.x + r.w).toBeLessThanOrEqual(VIEW_W);
        expect(r.y + r.h).toBeLessThanOrEqual(VIEW_H);
      }
    }
  });

  it("is memoized and themeable: an ink backdrop, then CSS variable fills", () => {
    const markup = sceneMarkup();
    expect(sceneMarkup()).toBe(markup);
    expect(markup.startsWith(`<rect width="${VIEW_W}" height="${VIEW_H}" style="fill:var(--ink)">`)).toBe(true);
    expect(markup).toMatch(/style="fill:var\(--teal, #/);
  });

  it("the game sprites are gone from the sheet", () => {
    expect(Object.keys(spriteJson.sprites)).not.toEqual(expect.arrayContaining(["bin"]));
    expect(Object.keys(spriteJson.sprites)).not.toEqual(expect.arrayContaining(["conveyor"]));
  });
});
