// Maps each skill in data.skills to the project cards (and experience
// entries) whose stack or highlights mention it. Pure and deterministic, so
// the server and client agree and a node one-liner can audit it.
import type { Experience, Project, SkillGroup } from "../types/portfolio";

/**
 * Extra phrases that count as a mention of a skill. Keep these honest: an
 * alias must describe the same thing, not something adjacent.
 */
export const SKILL_ALIASES: Record<string, string[]> = {
  "Next.js": ["nextjs", "next"],
  Teleoperation: ["teleop", "teleoperated", "leader-follower"],
  "imitation learning": ["behavior-cloning", "behavior cloning"],
  "HIL testing": ["HIL"],
  "certificate authentication": ["certificate-authenticated"],
  "actuator diagnostics and calibration": ["actuator health"],
  "NVIDIA Jetson AGX Thor/Orin": ["Jetson"],
  "GMSL/Argus": ["GMSL"],
  "protobuf/ConnectRPC": ["protobuf", "ConnectRPC"],
};

export interface SkillHits {
  projects: string[];
  roles: string[];
  /** Other highlightable text blocks (About paragraphs), by id. */
  notes: string[];
}

export interface NoteTarget {
  id: string;
  text: string;
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Acronyms (ACT, SQL, MCAP) match case-sensitively; words match case-insensitively. */
function phraseRegex(phrase: string) {
  const acronym = /^[A-Z0-9-]{2,}$/.test(phrase);
  return new RegExp(`(^|[^A-Za-z0-9])${escape(phrase)}(?![A-Za-z0-9])`, acronym ? "" : "i");
}

export function skillMatchers(skill: string): RegExp[] {
  return [skill, ...(SKILL_ALIASES[skill] ?? [])].map(phraseRegex);
}

function mentions(matchers: RegExp[], texts: string[]) {
  return texts.some((text) => matchers.some((re) => re.test(text)));
}

export function buildSkillIndex(
  skills: SkillGroup[],
  projects: Project[],
  experience: Experience[] = [],
  notes: NoteTarget[] = []
): Record<string, SkillHits> {
  const index: Record<string, SkillHits> = {};
  for (const group of skills) {
    for (const skill of group.items) {
      const matchers = skillMatchers(skill);
      index[skill] = {
        projects: projects.filter((p) => mentions(matchers, [...p.stack, ...p.highlights])).map((p) => p.id),
        roles: experience.filter((e) => !e.hidden && mentions(matchers, e.highlights)).map((e) => e.id),
        notes: notes.filter((n) => mentions(matchers, [n.text])).map((n) => n.id),
      };
    }
  }
  return index;
}

/** Inverse view: the skills each target id mentions, for data-skills attributes. */
export function skillsByTarget(index: Record<string, SkillHits>): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const [skill, hits] of Object.entries(index)) {
    for (const id of [...hits.projects, ...hits.roles, ...hits.notes]) (out[id] ??= []).push(skill);
  }
  return out;
}

/** Stable token for a skill, safe inside a space-separated attribute. */
export const skillToken = (skill: string) => skill.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
