import Link from "next/link";
import type { GetStaticProps } from "next";

import Header from "../components/Header";
import Footer from "../components/Footer";
import Seo from "../components/Seo";
import Socials from "../components/Socials";
import WorkCard from "../components/WorkCard";
import { getAllPosts } from "../utils/api";
import { ISOToDate } from "../utils";

import portfolioJson from "../data/portfolio.json";
import type { BlogPostPreview, PortfolioData } from "../types/portfolio";

const data = portfolioJson as PortfolioData;

interface HomeProps {
  posts: BlogPostPreview[];
}

const personJsonLd = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: data.name,
  url: data.siteUrl,
  jobTitle: data.title,
  worksFor: { "@type": "Organization", name: "Sigma Design" },
  address: {
    "@type": "PostalAddress",
    addressLocality: "San Jose",
    addressRegion: "CA",
    addressCountry: "US",
  },
  alumniOf: { "@type": "CollegeOrUniversity", name: "California State University, Sacramento" },
  sameAs: data.socials.filter((s) => s.href.startsWith("https:")).map((s) => s.href),
};

const buttonBase =
  "inline-flex min-h-[48px] items-center justify-center gap-2 rounded px-5 py-3 text-sm font-medium transition-colors";

function SectionHeading({ id, children }: { id: string; children: string }) {
  return (
    <h2 id={id} className="text-2xl laptop:text-3xl font-semibold tracking-tight">
      {children}
    </h2>
  );
}

export default function Home({ posts }: HomeProps) {
  const experience = data.experience.filter((job) => !job.hidden);

  return (
    <>
      <Seo
        title={`${data.name} | ${data.title}`}
        description={data.seo.description}
        path="/"
        jsonLd={personJsonLd}
      />

      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <Header current="home" />

      <main id="main-content" tabIndex={-1} className="focus:outline-none">
        {/* Hero */}
        <section
          aria-labelledby="hero-heading"
          className="container mx-auto flex min-h-[calc(100vh-4rem)] min-h-[calc(100svh-4rem)] flex-col justify-center py-16"
        >
          <p className="font-mono text-sm text-slate-400">{data.hero.eyebrow}</p>
          <h1 id="hero-heading" className="mt-4 text-5xl tablet:text-7xl font-semibold tracking-tight">
            {data.name}
          </h1>
          <p className="mt-6 max-w-2xl text-lg tablet:text-xl leading-relaxed text-slate-300">{data.hero.lede}</p>

          <ul className="mt-8 flex flex-wrap gap-2" aria-label="Highlights">
            {data.hero.proof.map((item) => (
              <li key={item} className="rounded border border-white/15 px-3 py-1.5 font-mono text-xs text-slate-300">
                {item}
              </li>
            ))}
          </ul>

          <div className="mt-10 flex flex-wrap gap-3">
            <a href="#work-section" className={`${buttonBase} bg-cyan-300 text-slate-950 hover:bg-cyan-200`}>
              See selected work
            </a>
            <a
              href={data.resumeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`${buttonBase} border border-white/20 hover:border-white/50 hover:bg-white/5`}
            >
              Resume (PDF)
              <span className="sr-only"> (opens in new tab)</span>
            </a>
          </div>
          <Socials className="mt-4" hideEmail />
        </section>

        {/* Selected work */}
        <section id="work-section" aria-labelledby="work-heading" className="container mx-auto py-16">
          <SectionHeading id="work-heading">Selected work</SectionHeading>
          <div className="mt-8 grid grid-cols-1 laptop:grid-cols-2 gap-4">
            {data.projects.map((project) => (
              <WorkCard key={project.id} project={project} />
            ))}
          </div>
        </section>

        {/* Experience */}
        <section id="experience-section" aria-labelledby="experience-heading" className="container mx-auto py-16">
          <SectionHeading id="experience-heading">Experience</SectionHeading>
          <ol className="mt-8 space-y-10">
            {experience.map((job) => (
              <li key={job.id} className="border-l border-white/15 pl-5">
                <h3 className="text-xl font-semibold">{job.org}</h3>
                <p className="mt-1 text-slate-200">{job.role}</p>
                <p className="mt-1 font-mono text-sm text-slate-400">
                  {job.period}
                  {job.location ? ` · ${job.location}` : ""}
                </p>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-slate-300 marker:text-slate-500">
                  {job.highlights.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        </section>

        {/* Independent builds */}
        <section id="engineering-section" aria-labelledby="engineering-heading" className="container mx-auto py-16">
          <SectionHeading id="engineering-heading">Independent builds</SectionHeading>
          <p className="mt-3 max-w-2xl text-slate-300">Research and projects I build on my own time.</p>
          <div className="mt-8 grid grid-cols-1 laptop:grid-cols-2 gap-4">
            {data.engineeringProjects.map((project) => (
              <WorkCard key={project.id} project={project} />
            ))}
          </div>
        </section>

        {/* About and skills */}
        <section id="about-section" aria-labelledby="about-heading" className="container mx-auto py-16">
          <SectionHeading id="about-heading">About</SectionHeading>
          <div className="mt-6 max-w-3xl space-y-4 text-lg leading-relaxed text-slate-300">
            {data.about.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>

          <div className="mt-12 grid grid-cols-1 tablet:grid-cols-2 gap-10">
            <div>
              <h3 className="text-lg font-semibold">Skills</h3>
              <dl className="mt-4 space-y-4">
                {data.skills.map((group) => (
                  <div key={group.group}>
                    <dt className="font-mono text-xs uppercase tracking-wider text-slate-400">{group.group}</dt>
                    <dd className="mt-1 text-slate-200">{group.items.join(", ")}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <div className="space-y-10">
              <div>
                <h3 className="text-lg font-semibold">Education</h3>
                <ul className="mt-4 space-y-2">
                  {data.education.map((item) => (
                    <li key={item.school}>
                      <span className="text-slate-200">{item.degree}</span>
                      <span className="block text-slate-400">
                        {item.school}
                        {item.shortName ? ` (${item.shortName})` : ""}, {item.period}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-semibold">Awards</h3>
                <ul className="mt-4 space-y-2">
                  {data.awards.map((award) => (
                    <li key={award.title}>
                      <span className="text-slate-200">{award.title}</span>
                      {award.detail && <span className="block text-slate-400">{award.detail}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Writing */}
        {data.showBlog && posts.length > 0 && (
          <section id="writing-section" aria-labelledby="writing-heading" className="container mx-auto py-16">
            <SectionHeading id="writing-heading">Writing</SectionHeading>
            <ul className="mt-6 divide-y divide-white/10 border-y border-white/10">
              {posts.map((post) => (
                <li key={post.slug} className="py-5">
                  <time dateTime={post.date} className="font-mono text-sm text-slate-400">
                    {ISOToDate(post.date)}
                  </time>
                  <h3 className="mt-1 text-lg font-semibold">
                    <Link href={`/blog/${post.slug}`}>
                      <a className="hover:underline underline-offset-4">{post.title}</a>
                    </Link>
                  </h3>
                  <p className="mt-1 text-slate-300">{post.tagline}</p>
                </li>
              ))}
            </ul>
            <p className="mt-6">
              <Link href="/blog">
                <a className="inline-flex min-h-[44px] items-center text-sm text-cyan-300 underline underline-offset-4">
                  All posts
                </a>
              </Link>
            </p>
          </section>
        )}
      </main>

      <Footer />
    </>
  );
}

export const getStaticProps: GetStaticProps<HomeProps> = () => {
  const posts = getAllPosts(["slug", "title", "tagline", "preview", "date"]) as unknown as BlogPostPreview[];
  return { props: { posts } };
};
