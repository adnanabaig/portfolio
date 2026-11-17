// lib/fuzzy.ts: the command palette's subsequence scorer.
import { describe, expect, it } from "vitest";
import { fuzzy, SCORE } from "../lib/fuzzy";

const score = (q: string, t: string) => fuzzy(q, t)?.score ?? null;
const rank = (q: string, list: string[]) =>
  list
    .map((t) => ({ t, s: score(q, t) }))
    .filter((r): r is { t: string; s: number } => r.s !== null)
    .sort((a, b) => b.s - a.s)
    .map((r) => r.t);

describe("fuzzy", () => {
  it("matches an empty query with score 0 and no indices", () => {
    expect(fuzzy("", "Anything")).toEqual({ score: 0, indices: [] });
    expect(fuzzy("   ", "Anything")).toEqual({ score: 0, indices: [] });
  });

  it("returns null when the query is not a subsequence", () => {
    expect(fuzzy("xyz", "Experience")).toBeNull();
    expect(fuzzy("ecnei", "Experience")).toBeNull();
    expect(fuzzy("experiences", "Experience")).toBeNull();
  });

  it("folds case on both sides", () => {
    expect(fuzzy("EXP", "experience")).toEqual(fuzzy("exp", "Experience"));
    expect(fuzzy("rEsUmE", "Open resume PDF")?.indices).toEqual([5, 6, 7, 8, 9, 10]);
  });

  it("scores the prefix, word starts, runs, and gaps as documented", () => {
    // "ab" at the very start, consecutive: (1 + 8) + (1 + 3).
    expect(score("ab", "abc")).toBe(SCORE.char + SCORE.prefix + SCORE.char + SCORE.consecutive);
    // "b" at a word start: 1 + 5.
    expect(score("b", "a b")).toBe(SCORE.char + SCORE.word);
    // "a" then "c" with one skipped character: (1 + 8) + (1 - 1).
    expect(score("ac", "abc")).toBe(SCORE.char + SCORE.prefix + SCORE.char - SCORE.gap);
  });

  it("orders prefix over word start over buried matches", () => {
    // Telemetry: prefix run (13). "the team": word-start run (10). Theme: prefix, then a gap (9). Site: buried run (5).
    expect(rank("te", ["Site stop", "Theme mono", "Telemetry", "Contact the team", "Experience"])).toEqual([
      "Telemetry",
      "Contact the team",
      "Theme mono",
      "Site stop",
    ]);
    expect(rank("wr", ["Writing", "Show keymap", "Selected work"])[0]).toBe("Writing");
  });

  it("prefers the placement on word starts over the leftmost one", () => {
    // Leftmost would take the "sk" inside "Desk" (5); the word start "Sk" scores 10.
    expect(fuzzy("sk", "Desk Skills")?.indices).toEqual([5, 6]);
    expect(fuzzy("sw", "Selected work")?.indices).toEqual([0, 9]);
  });

  it("returns ascending, in-range indices that spell the query", () => {
    for (const [q, t] of [
      ["tele", "Teleoperation cell"],
      ["ops", "Open OPS console"],
      ["mod2", "MOD-02 Fleet operations"],
      ["cpy", "Copy email"],
    ]) {
      const m = fuzzy(q, t);
      expect(m, `${q} in ${t}`).not.toBeNull();
      const idx = m!.indices;
      expect(idx).toHaveLength(q.length);
      idx.forEach((i, k) => {
        expect(i).toBeGreaterThanOrEqual(0);
        expect(i).toBeLessThan(t.length);
        if (k) expect(i).toBeGreaterThan(idx[k - 1]);
        expect(t[i].toLowerCase()).toBe(q[k].toLowerCase());
      });
    }
  });

  it("ignores spaces in the query", () => {
    expect(fuzzy("sel work", "Selected work")?.indices).toEqual(fuzzy("selwork", "Selected work")?.indices);
  });
});
