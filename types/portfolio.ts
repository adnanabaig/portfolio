// Content model for data/portfolio.json.
//
// Facts come from Adnan's resume (public/Adnan_Baig_Resume.pdf) or from copy
// that was already on the site. `_todo` holds open questions for Adnan and is
// never rendered.

export interface SocialLink {
  id: "github" | "linkedin" | "email";
  title: string;
  href: string;
}

export interface ProjectLink {
  label: string;
  href: string;
}

export type ProjectCategory =
  | "Operator Interfaces"
  | "Robotics Operations"
  | "Robotics Teleoperation"
  | "Robotics Research"
  | "Computer Vision & ML"
  | "Computer Vision"
  | "Blockchain & Web3";

export interface Project {
  id: string;
  title: string;
  org?: string;
  role?: string;
  period?: string;
  category: ProjectCategory;
  status?: "in-progress";
  summary: string;
  /** At most four. */
  highlights: string[];
  stack: string[];
  links?: ProjectLink[];
}

export interface Experience {
  id: string;
  org: string;
  role: string;
  location?: string;
  period: string;
  /** Set when the role is current. */
  current?: boolean;
  highlights: string[];
  /** Kept in the data but not rendered. See _todo. */
  hidden?: boolean;
}

export interface Education {
  school: string;
  shortName?: string;
  degree: string;
  period: string;
}

export interface Award {
  title: string;
  detail?: string;
}

export interface SkillGroup {
  group: string;
  items: string[];
}

export interface PortfolioData {
  name: string;
  title: string;
  location: string;
  email: string;
  siteUrl: string;
  resumeUrl: string;
  seo: { description: string };
  hero: { eyebrow: string; lede: string; proof: string[] };
  showBlog: boolean;
  socials: SocialLink[];
  projects: Project[];
  engineeringProjects: Project[];
  experience: Experience[];
  education: Education[];
  awards: Award[];
  skills: SkillGroup[];
  about: string[];
  contact: { lede: string };
  _todo: string[];
}

export interface BlogPostFrontmatter {
  date: string;
  title: string;
  tagline: string;
  preview: string;
}

export interface BlogPostPreview extends BlogPostFrontmatter {
  slug: string;
}

export interface BlogPost extends BlogPostPreview {
  /** Rendered at build time from markdown. */
  html: string;
  readingMinutes: number;
}

/** System sketch for /work/<id> (data/schematics.json). Illustrative only. */
export type SchematicKind = "hw" | "sw" | "data" | "check";

export interface SchematicNode {
  id: string;
  /** One or two lines, each at most 13 characters the bitmap font can draw. */
  label: string[];
  kind: SchematicKind;
  /** Grid cell: col 0 to 3, row 0 to 1. Flow runs left to right. */
  col: number;
  row: number;
}

export interface SchematicEdge {
  from: string;
  to: string;
  /** flow: arrow (default). link: dashed, no arrow. gate: coral arrow. */
  kind?: "flow" | "link" | "gate";
  /** Words from the project's own copy, shown in the netlist. */
  note?: string;
}

export interface Schematic {
  nodes: SchematicNode[];
  edges: SchematicEdge[];
}
