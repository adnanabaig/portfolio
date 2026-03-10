export interface SocialLink {
  id?: string;
  title: string;
  link: string;
}

export interface Project {
  id: string;
  title: string;
  description: string;
  category:
    | "Robotics Teleoperation"
    | "Cinematic Videography"
    | "Web Engineering"
    | "Blockchain & Web3"
    | "Computer Vision & ML"
    | "AI Safety & Detection";
  organization?: string;
  imageSrc: string;
  url: string;
}

export interface PortfolioData {
  name: string;
  headerTaglineOne: string;
  headerTaglineTwo: string;
  headerTaglineThree: string;
  headerTaglineFour: string;
  showBlog: boolean;
  socials: SocialLink[];
  projects: Project[];
  engineeringProjects: Project[];
  aboutpara: string;
}

export interface BlogPostFrontmatter {
  date: string;
  title: string;
  tagline: string;
  preview: string;
  image: string;
}

export interface BlogPostPreview extends BlogPostFrontmatter {
  slug: string;
  author?: string;
}

export interface BlogPost extends BlogPostPreview {
  content: string;
}
