// Content invariants for data/portfolio.json and the published posts: the
// shape every page relies on, the private-data strip, and the copy rules.
import fs from "fs";
import path from "path";
import { createRequire } from "module";
import { describe, expect, it } from "vitest";
import portfolio from "../data/portfolio.json";
import schematics from "../data/schematics.json";
import teleop from "../data/teleop.json";
import { copyProblems } from "../scripts/copy-rules.mjs";
import type { PortfolioData, Project, ProjectCategory } from "../types/portfolio";

const root = path.resolve(__dirname, "..");
const data = portfolio as PortfolioData;
const projects: Project[] = [...data.projects, ...data.engineeringProjects];
const raw = fs.readFileSync(path.join(root, "data/portfolio.json"), "utf8");
const stripPrivate = createRequire(import.meta.url)("../scripts/strip-private-loader.cjs") as (src: string) => string;

const CATEGORIES: ProjectCategory[] = [
  "Operator Interfaces",
  "Robotics Operations",
  "Robotics Teleoperation",
  "Robotics Research",
  "Computer Vision & ML",
  "Computer Vision",
  "Blockchain & Web3",
];
const nonEmpty = (s: unknown) => typeof s === "string" && s.trim().length > 0;

/** Every string in a JSON value, with its path. */
function strings(value: unknown, at = "$"): [string, string][] {
  if (typeof value === "string") return [[at, value]];
  if (Array.isArray(value)) return value.flatMap((v, i) => strings(v, `${at}[${i}]`));
  if (value && typeof value === "object") return Object.entries(value).flatMap(([k, v]) => strings(v, `${at}.${k}`));
  return [];
}

describe("projects", () => {
  it.each(projects.map((p) => [p.id, p] as const))("%s has every required field", (_id, p) => {
    expect(p.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    expect(nonEmpty(p.title)).toBe(true);
    expect(CATEGORIES).toContain(p.category);
    expect(nonEmpty(p.summary)).toBe(true);
    expect(Array.isArray(p.highlights)).toBe(true);
    expect(p.highlights.length).toBeLessThanOrEqual(4);
    expect(p.highlights.every(nonEmpty)).toBe(true);
    expect(p.stack.length).toBeGreaterThan(0);
    expect(p.stack.every(nonEmpty)).toBe(true);
    for (const key of ["org", "role", "period"] as const) if (key in p) expect(nonEmpty(p[key])).toBe(true);
    for (const link of p.links ?? []) {
      expect(nonEmpty(link.label)).toBe(true);
      expect(link.href).toMatch(/^https:\/\//);
    }
  });

  it("ids are unique across Selected work and Independent builds", () => {
    const ids = projects.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every project has a system sketch, and no sketch is orphaned", () => {
    const sketched = Object.keys(schematics).filter((k) => !k.startsWith("_"));
    expect(sketched.sort()).toEqual(projects.map((p) => p.id).sort());
  });
});

describe("experience, skills, and links", () => {
  it("jobs have unique ids and the fields the service log renders", () => {
    const ids = data.experience.map((j) => j.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const j of data.experience) {
      expect(nonEmpty(j.org) && nonEmpty(j.role) && nonEmpty(j.period)).toBe(true);
      expect(j.highlights.every(nonEmpty)).toBe(true);
    }
  });

  it("exactly one visible job is current", () => {
    expect(data.experience.filter((j) => j.current && !j.hidden)).toHaveLength(1);
  });

  it("skills are unique and each has exactly one teleop block", () => {
    const skills = data.skills.flatMap((g) => g.items);
    expect(new Set(skills).size).toBe(skills.length);
    const mapped = Object.values(teleop.blocks);
    for (const s of skills) expect(mapped.filter((m) => m === s)).toHaveLength(1);
  });

  it("socials and the resume point somewhere real", () => {
    for (const s of data.socials) expect(s.href).toMatch(/^(https:\/\/|mailto:)/);
    expect(fs.existsSync(path.join(root, "public", data.resumeUrl))).toBe(true);
    expect(data.siteUrl).toMatch(/^https:\/\/[^/]+$/);
  });
});

describe("private data never ships", () => {
  const stripped = JSON.parse(stripPrivate(raw));
  const hidden = data.experience.filter((j) => j.hidden);

  it("the bundle loader drops the private notes and hidden jobs", () => {
    expect(stripped).not.toHaveProperty("_todo");
    expect(stripped.experience.some((j: { hidden?: boolean }) => j.hidden)).toBe(false);
    expect(stripped.experience).toHaveLength(data.experience.length - hidden.length);
    const text = JSON.stringify(stripped);
    for (const note of data._todo ?? []) expect(text).not.toContain(note);
    for (const j of hidden) expect(text).not.toContain(j.org);
  });

  it("keeps everything else unchanged", () => {
    const { _todo, ...rest } = data;
    void _todo;
    expect(stripped).toEqual({ ...rest, experience: data.experience.filter((j) => !j.hidden) });
  });

  it("no rendered source reads the private notes", () => {
    const walk = (dir: string): string[] =>
      fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
        const full = path.join(dir, e.name);
        return e.isDirectory() ? walk(full) : /\.(tsx?|mjs|json)$/.test(e.name) ? [full] : [];
      });
    const offenders = ["components", "pages", "lib", "hooks", "utils"]
      .flatMap((d) => walk(path.join(root, d)))
      .filter((f) => fs.readFileSync(f, "utf8").includes("_todo"));
    expect(offenders).toEqual([]);
  });
});

describe("copy rules on published content", () => {
  it("no em dash, emoji, or internal term in any published string of portfolio.json", () => {
    const { _todo, ...published } = data;
    void _todo;
    const problems = strings(published).flatMap(([at, s]) => copyProblems(s).map((p) => `${at}: ${p}`));
    expect(problems).toEqual([]);
  });

  it("the same holds for teleop.json, schematics.json, and every post", () => {
    const sources: [string, string][] = [
      ...strings(teleop, "teleop"),
      ...strings(schematics, "schematics"),
      ...fs
        .readdirSync(path.join(root, "_posts"))
        .filter((f) => f.endsWith(".md"))
        .map((f) => [`_posts/${f}`, fs.readFileSync(path.join(root, "_posts", f), "utf8")] as [string, string]),
    ];
    expect(sources.flatMap(([at, s]) => copyProblems(s).map((p) => `${at}: ${p}`))).toEqual([]);
  });

  it("the rule itself catches an em dash, an emoji, and an internal term", () => {
    expect(copyProblems("fast \u2014 and loud")).toEqual(["em dash"]);
    expect(copyProblems("ship it \u{1F680}")[0]).toMatch(/^emoji/);
    expect(copyProblems("built on Phabricator")).toEqual(['forbidden term "Phabricator"']);
    expect(copyProblems("Plain copy, no tricks.")).toEqual([]);
  });
});
