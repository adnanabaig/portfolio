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
