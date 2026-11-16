import { describe, expect, it } from "vitest";
import portfolio from "../../data/portfolio.json";
import teleop from "../../data/teleop.json";
import {
  BLOCK_T,
  CARRY_Z,
  SKILL_COUNT,
  World,
  binForSkill,
  binRect,
  buildCatalog,
  type Block,
  type WorldEvent,
} from "../../components/teleop/engine/blocks";
import { skillCount } from "../../lib/facts";
import { seeded } from "../helpers/rng";

const skills = portfolio.skills.flatMap((g) => g.items);

describe("skill catalog", () => {
  it("has one block per listed skill, each mapped to its own group's bin", () => {
    const catalog = buildCatalog();
    expect(catalog).toHaveLength(skills.length);
    expect(SKILL_COUNT).toBe(skillCount);
    expect(new Set(catalog.map((c) => c.skill)).size).toBe(skills.length);
    for (const c of catalog) {
      expect(skills).toContain(c.skill);
      expect(binForSkill(c.skill)).toBe(c.groupIndex);
      expect(portfolio.skills[c.groupIndex].group).toBe(c.group);
    }
  });

  it("throws when a skill has no block label", () => {
    const blocks: Record<string, string> = { ...teleop.blocks };
    const [label] = Object.entries(blocks).find(([, skill]) => skill === skills[0])!;
    delete blocks[label];
    expect(() => buildCatalog(blocks)).toThrow(/has no block for/);
  });

  it("binForSkill is -1 for an unknown skill", () => {
    expect(binForSkill("Not a skill")).toBe(-1);
  });
});

describe("bin sorting", () => {
  /** Drops `b` from carry height over the middle of `bin` and steps until it lands. */
  const drop = (w: World, b: Block, bin: number, reduced: boolean) => {
    const r = binRect(bin);
    w.hold(b);
    b.x = r.x + r.w / 2 - b.w / 2;
    b.y = r.y + 4;
    b.z = CARRY_Z;
    w.release(b);
    const events: WorldEvent[] = [];
    for (let i = 0; i < 240 && (b.state === "air" || events.length === 0); i++) events.push(...w.step(1 / 60, reduced));
    return events;
  };

  for (const reduced of [false, true]) {
    describe(reduced ? "reduced motion" : "full motion", () => {
      it("the right bin sorts the block and counts it", () => {
        const w = new World(buildCatalog(), seeded(7));
        const b = w.blocks.find((x) => x.state === "belt")!;
        const events = drop(w, b, b.entry.groupIndex, reduced);
        expect(events).toContainEqual({ type: "sorted", entry: b.entry, bin: b.entry.groupIndex, total: 1 });
        expect(b.state).toBe("binned");
        expect(w.sortedCount).toBe(1);
        expect(w.bins[b.entry.groupIndex].sorted).toEqual([b.entry]);
      });

      it("every wrong bin bounces the block out onto the floor, uncounted", () => {
        const w = new World(buildCatalog(), seeded(8));
        const b = w.blocks.find((x) => x.state === "belt")!;
        for (let k = 1; k < portfolio.skills.length; k++) {
          const wrong = (b.entry.groupIndex + k) % portfolio.skills.length;
          const events = drop(w, b, wrong, reduced);
          for (let i = 0; i < 120 && b.state === "air"; i++) w.step(1 / 60, reduced);
          expect(events.some((e) => e.type === "misroute" && e.bin === wrong)).toBe(true);
          expect(b.state).toBe("free");
          expect(b.y + 12).toBeLessThan(binRect(wrong).y);
          expect(w.bins[wrong].fault).toBeGreaterThan(0);
        }
        expect(w.sortedCount).toBe(0);
      });
    });
  }

  it("sorting all 31 blocks fills every bin with exactly its group", () => {
    const w = new World(buildCatalog(), seeded(9));
    for (const b of w.blocks) drop(w, b, b.entry.groupIndex, true);
    expect(w.sortedCount).toBe(SKILL_COUNT);
    expect(w.remaining).toBe(0);
    w.bins.forEach((bin, i) => {
      expect(bin.sorted.map((e) => e.skill).sort()).toEqual([...portfolio.skills[i].items].sort());
    });
  });

  it("a block dropped on another stacks on top", () => {
    const w = new World(buildCatalog(), seeded(10));
    const [a, b] = w.blocks.filter((x) => x.state === "belt");
    for (const blk of [a, b]) {
      w.hold(blk);
      blk.x = 120;
      blk.y = 80;
      blk.z = CARRY_Z;
      w.release(blk);
      for (let i = 0; i < 120; i++) w.step(1 / 60, true);
    }
    expect(a.state).toBe("free");
    expect(a.z).toBe(0);
    expect(b.state).toBe("free");
    expect(b.z).toBeCloseTo(BLOCK_T, 6);
  });

  it("the same seed shuffles the belt the same way", () => {
    const order = (seed: number) => new World(buildCatalog(), seeded(seed)).blocks.map((b) => b.entry.skill);
    expect(order(42)).toEqual(order(42));
    expect(order(42)).not.toEqual(order(43));
  });
});
