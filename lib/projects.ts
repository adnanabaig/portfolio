// One ordered list of every project (Selected work, then Independent builds)
// with its unit plate, for the cards, the /work/<id> dossiers, the sitemap,
// and prev/next navigation. Pure: pass the data in.
import type { PortfolioData, Project } from "../types/portfolio";
import type { SpriteName } from "./pixel/toPaths";

/** Original 32x32 art per project. Unknown ids fall back to a skill block. */
export const PROJECT_ICONS: Record<string, SpriteName> = {
  "operator-hmi": "icon-hmi",
  "fleet-operations": "icon-fleet",
  "figure-humanoid": "icon-humanoid",
  "so101-research": "icon-arm",
  wram: "icon-satellite",
  sentrysight: "icon-eye",
  "blockchain-dapp": "icon-chain",
};

export type ProjectKind = "module" | "bench";

/** "MOD-01" for Selected work, "RIG-01" for Independent builds. */
export const unitLabel = (kind: ProjectKind, index: number) => `${kind === "bench" ? "RIG" : "MOD"}-${String(index).padStart(2, "0")}`;

export const dossierHref = (id: string) => `/work/${id}`;

export interface ProjectEntry {
  project: Project;
  kind: ProjectKind;
  /** 1-based position within its bay. */
  index: number;
  unit: string;
  /** 1-based position across every project (the FIG. number). */
  order: number;
}

// No array or object spread here: the command palette's lazy chunk imports
// this, and the transpiled spread helpers would roughly double its size.
export function projectEntries(data: Pick<PortfolioData, "projects" | "engineeringProjects">): ProjectEntry[] {
  const entry = (kind: ProjectKind) => (project: Project, i: number) => ({ project, kind, index: i + 1 });
  return data.projects
    .map(entry("module"))
    .concat(data.engineeringProjects.map(entry("bench")))
    .map((e, i) => ({ project: e.project, kind: e.kind, index: e.index, unit: unitLabel(e.kind, e.index), order: i + 1 }));
}
