// lib/facts.ts derives every number the site shows from a sentence in
// data/portfolio.json. These tests check each value against its source
// sentence, and that rewording a source sentence fails loudly (the build
// would fail the same way) instead of shipping a stale number.
import { afterEach, describe, expect, it, vi } from "vitest";
import portfolio from "../data/portfolio.json";
import * as facts from "../lib/facts";
import type { PortfolioData } from "../types/portfolio";

const data = portfolio as PortfolioData;
const current = data.experience.find((j) => j.current && !j.hidden)!;
const programsLine = current.highlights.find((h) => /programs/.test(h))!;
const testsLine = data.projects.find((p) => p.id === "fleet-operations")!.highlights.find((h) => /automated tests/.test(h))!;
const WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];

describe("derived numbers match their source sentences", () => {
  it("issuesResolved comes from the hero proof line", () => {
    expect(data.hero.proof.some((line) => line.includes(`${facts.issuesResolved} engineering issues`))).toBe(true);
    expect(facts.issuesResolved).toMatch(/^\d+\+?$/);
  });

  it("robotPrograms is the word number in the current role's highlight", () => {
    expect(programsLine).toContain(`across ${WORDS[facts.robotPrograms]} humanoid and robotic manipulation programs`);
  });

  it("automatedTests comes from the fleet dashboard highlight", () => {
    expect(testsLine).toContain(`${facts.automatedTests} automated tests`);
  });

  it("skillCount is the number of listed skills", () => {
    expect(facts.skillCount).toBe(data.skills.flatMap((g) => g.items).length);
  });

  it("nclRank and acmPlace come from the award details", () => {
    const ncl = data.awards.find((a) => a.title === "National Cyber League")!.detail!;
    const [rank, year] = facts.nclRank.match(/^(Top \d+%) \((\d{4})\)$/)!.slice(1);
    expect(ncl).toContain(`Global ${rank} (${year})`);
    expect([facts.nclTop, facts.nclYear]).toEqual([rank, year]);
    expect(data.awards.find((a) => a.title === "ACM AI Hackathon")!.detail).toMatch(new RegExp(`^${facts.acmPlace} place`));
  });

  it("degree fields come from education", () => {
    expect(facts.degree).toBe(data.education[0].degree);
    expect(facts.degreeShort).toBe("B.S. CS");
    expect(facts.graduated).toBe(data.education[0].period);
  });

  it("the telemetry row uses only the derived values", () => {
    expect(facts.telemetry.map((t) => t.value)).toEqual([
      facts.issuesResolved,
      String(facts.robotPrograms),
      String(facts.automatedTests),
      facts.nclTop,
      facts.acmPlace,
      facts.graduated,
    ]);
    expect(facts.telemetry[3].label).toBe(`NCL global ${facts.nclYear}`);
  });

  it("LV numbers count visible jobs from the oldest (LV 1), skipping hidden ones", () => {
    const visible = data.experience.filter((j) => !j.hidden);
    const levels = facts.questLevels();
    expect(levels.map((l) => l.id)).toEqual(visible.map((j) => j.id));
    expect(levels.map((l) => l.level)).toEqual(visible.map((_, i) => visible.length - i));
    for (const hidden of data.experience.filter((j) => j.hidden)) expect(levels.some((l) => l.id === hidden.id)).toBe(false);
  });
});

describe("extractors throw when a source sentence changes shape", () => {
  afterEach(() => {
    vi.doUnmock("../data/portfolio.json");
    vi.resetModules();
  });

  /** Re-imports lib/facts against an edited copy of portfolio.json. */
  async function factsWith(edit: (d: PortfolioData) => void) {
    const copy = structuredClone(data);
    edit(copy);
    vi.resetModules();
    vi.doMock("../data/portfolio.json", () => ({ default: copy }));
    return import("../lib/facts");
  }
  const replaceIn = (list: string[], from: string | RegExp, to: string) => list.map((s) => s.replace(from, to));

  it.each<[string, (d: PortfolioData) => void, RegExp]>([
    ["hero issues line loses its number", (d) => (d.hero.proof = replaceIn(d.hero.proof, /\d+\+? engineering issues/, "many engineering issues")), /issues resolved/],
    ["hero issues line is removed", (d) => (d.hero.proof = d.hero.proof.filter((l) => !/engineering issues/.test(l))), /issues resolved/],
    [
      "program count becomes vague",
      (d) => {
        const job = d.experience.find((j) => j.current)!;
        job.highlights = replaceIn(job.highlights, /across \w+ humanoid/, "across several humanoid");
      },
      /robot program count/,
    ],
    [
      "program sentence is reworded",
      (d) => {
        const job = d.experience.find((j) => j.current)!;
        job.highlights = replaceIn(job.highlights, "humanoid and robotic manipulation programs", "robot programs");
      },
      /robot program count/,
    ],
    [
      "test count is dropped",
      (d) => {
        const p = d.projects.find((x) => x.id === "fleet-operations")!;
        p.highlights = replaceIn(p.highlights, /\d+ automated tests/, "hundreds of automated tests");
      },
      /automated test count/,
    ],
    ["fleet project is renamed", (d) => (d.projects.find((x) => x.id === "fleet-operations")!.id = "fleet"), /automated test count/],
    ["NCL detail is reworded", (d) => (d.awards.find((a) => a.title === "National Cyber League")!.detail = "Top 5 percent, 2024"), /NCL award/],
    ["ACM place is spelled out", (d) => (d.awards.find((a) => a.title === "ACM AI Hackathon")!.detail = "Second place for WRAM"), /ACM AI Hackathon place/],
    ["degree is renamed", (d) => (d.education[0].degree = "Bachelor of Science in Computer Science"), /degree/],
  ])("%s", async (_label, edit, what) => {
    await expect(factsWith(edit)).rejects.toThrow(what);
    await expect(factsWith(edit)).rejects.toThrow(/could not derive .* from data\/portfolio\.json/);
  });

  it("a changed number in the same sentence flows through (no hand-typed copy)", async () => {
    const f = await factsWith((d) => {
      const p = d.projects.find((x) => x.id === "fleet-operations")!;
      p.highlights = replaceIn(p.highlights, /\d+ automated tests/, "412 automated tests");
      d.hero.proof = replaceIn(d.hero.proof, /\d+\+? engineering issues/, "700+ engineering issues");
      const job = d.experience.find((j) => j.current)!;
      job.highlights = replaceIn(job.highlights, /across \w+ humanoid/, "across seven humanoid");
    });
    expect(f.automatedTests).toBe(412);
    expect(f.issuesResolved).toBe("700+");
    expect(f.robotPrograms).toBe(7);
  });
});
