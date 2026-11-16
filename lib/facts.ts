// Numbers and short labels derived from data/portfolio.json.
//
// Nothing here is hand-typed: every value is extracted from a fact string,
// and each extractor throws if its source sentence changes shape, so the
// build fails instead of shipping a stale number.
import portfolio from "../data/portfolio.json";
import type { PortfolioData } from "../types/portfolio";

const data = portfolio as PortfolioData;

function fail(what: string): never {
  throw new Error(`lib/facts: could not derive ${what} from data/portfolio.json. Update the source text or the extractor.`);
}

function match(text: string | undefined, re: RegExp, what: string): RegExpMatchArray {
  const m = text?.match(re);
  if (!m) fail(what);
  return m;
}

const WORD_NUMBERS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
};

/** "500+" from the hero proof line. */
export const issuesResolved = match(
  data.hero.proof.find((line) => /engineering issues/.test(line)),
  /(\d+\+?)\s+engineering issues/,
  "issues resolved"
)[1];

const current = data.experience.find((job) => job.current && !job.hidden);

/** 6, from "across six humanoid and robotic manipulation programs". */
export const robotPrograms = (() => {
  const word = match(
    current?.highlights.find((h) => /programs/.test(h)),
    /across (\w+) humanoid and robotic manipulation programs/,
    "robot program count"
  )[1].toLowerCase();
  const n = WORD_NUMBERS[word] ?? Number(word);
  if (!Number.isFinite(n)) fail("robot program count");
  return n;
})();

/** 296, from the fleet dashboard highlight. */
export const automatedTests = Number(
  match(
    data.projects.find((p) => p.id === "fleet-operations")?.highlights.find((h) => /automated tests/.test(h)),
    /(\d+) automated tests/,
    "automated test count"
  )[1]
);

/** Total number of listed skills (currently 31). */
export const skillCount = data.skills.reduce((sum, group) => sum + group.items.length, 0);

const ncl = data.awards.find((a) => a.title === "National Cyber League");
const nclMatch = match(ncl?.detail, /Global (Top \d+%) \((\d{4})\)/, "NCL award");
/** "Top 5% (2024)" */
export const nclRank = `${nclMatch[1]} (${nclMatch[2]})`;

const acm = data.awards.find((a) => a.title === "ACM AI Hackathon");
/** "2nd" from "2nd place for WRAM". */
export const acmPlace = match(acm?.detail, /^(\d+(?:st|nd|rd|th)) place/, "ACM AI Hackathon place")[1];

const edu = data.education[0] ?? fail("education");
/** "B.S. Computer Science" */
export const degree = edu.degree;
/** "B.S. CS" */
export const degreeShort = match(edu.degree, /^(B\.S\.|B\.A\.|M\.S\.)\s+Computer Science$/, "degree")[1] + " CS";
/** "May 2025" */
export const graduated = edu.period;

/** Level number for each visible experience entry: oldest is LV 1. */
export function questLevels(): { id: string; level: number }[] {
  const visible = data.experience.filter((job) => !job.hidden);
  return visible.map((job, index) => ({ id: job.id, level: visible.length - index }));
}

/** The telemetry row. Labels are framing; values come from the extractors above. */
export const telemetry: { label: string; value: string; accent: "teal" | "amber" | "leaf" | "violet" | "sky" }[] = [
  { label: "Issues resolved", value: issuesResolved, accent: "teal" },
  { label: "Robot programs", value: String(robotPrograms), accent: "amber" },
  { label: "Automated tests", value: String(automatedTests), accent: "leaf" },
  { label: "NCL global", value: nclRank, accent: "sky" },
  { label: "ACM AI Hackathon", value: acmPlace, accent: "violet" },
  { label: degreeShort, value: graduated, accent: "teal" },
];
