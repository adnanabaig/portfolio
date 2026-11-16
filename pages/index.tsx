import Link from "next/link";
import type { GetStaticProps } from "next";

import Header, { CHECKPOINTS } from "../components/Header";
import Footer from "../components/Footer";
import Seo from "../components/Seo";
import WorkCard from "../components/WorkCard";
import DitherBand from "../components/pixel/DitherBand";
import Eyebrow from "../components/pixel/Eyebrow";
import Led from "../components/pixel/Led";
import Sprite from "../components/pixel/Sprite";
import Hero from "../components/sections/Hero";
import Inventory from "../components/sections/Inventory";
import { questLevels, skillCount } from "../lib/facts";
import { buildSkillIndex, skillsByTarget, skillToken } from "../lib/skillIndex";
import { getAllPosts } from "../utils/api";
import { ISOToDate } from "../utils";
import { clientOnly } from "../lib/clientOnly";

import portfolioJson from "../data/portfolio.json";
import type { BlogPostPreview, PortfolioData } from "../types/portfolio";

const data = portfolioJson as PortfolioData;

// Visitor badges are client-only and live apart from the real awards.
const VisitorBadges = clientOnly(() => import("../components/Badges"));

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

const experience = data.experience.filter((job) => !job.hidden);
const levels = new Map(questLevels().map((l) => [l.id, l.level]));
const aboutNotes = data.about.map((text, i) => ({ id: `about-${i + 1}`, text }));
const skillIndex = buildSkillIndex(data.skills, [...data.projects, ...data.engineeringProjects], experience, aboutNotes);
const targetSkills = skillsByTarget(skillIndex);
const tokensFor = (id: string) => (targetSkills[id] ?? []).map(skillToken).join(" ");

function SectionHeading({ id, children }: { id: string; children: string }) {
  return (
    <h2 id={id} className="section-title">
      {children}
    </h2>
  );
}

export default function Home({ posts }: HomeProps) {
  const showWriting = data.showBlog && posts.length > 0;

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
      <Header
        current="home"
        checkpoints={showWriting ? CHECKPOINTS : CHECKPOINTS.filter((id) => id !== "writing-section")}
      />

      <main id="main-content" tabIndex={-1} className="focus:outline-none">
        <Hero />

        <DitherBand from="teal" to="teal" />

        {/* BAY 01: Selected work */}
        <section id="work-section" aria-labelledby="work-heading" className="bay" data-bay="1">
          <div className="container mx-auto">
            <Eyebrow bay={1} label="Deployed" />
            <SectionHeading id="work-heading">Selected work</SectionHeading>
            <div className="card-grid layout-grid">
              {data.projects.map((project, i) => (
                <WorkCard key={project.id} project={project} index={i + 1} skills={tokensFor(project.id)} />
              ))}
            </div>
          </div>
        </section>

        <DitherBand from="teal" to="amber" />

        {/* BAY 02: Experience */}
        <section id="experience-section" aria-labelledby="experience-heading" className="bay" data-bay="2">
          <div className="container mx-auto">
            <Eyebrow bay={2} label="Service log" />
            <SectionHeading id="experience-heading">Experience</SectionHeading>
            <ol className="quest">
              {experience.map((job) => (
                <li key={job.id} className="quest__entry" data-skills={tokensFor(job.id)} data-current={job.current ? "" : undefined}>
                  <div className="quest__node" aria-hidden="true">
                    <span>LV</span>
                    <span className="quest__level">{levels.get(job.id)}</span>
                  </div>
                  <div className="quest__card px-frame" data-accent={job.current ? "teal" : "amber"}>
                    <div className="px-body">
                      <div className="quest__head">
                        <h3 className="quest__org">{job.org}</h3>
                        {job.current && (
                          <span className="badge badge--current">
                            <Led color="teal" blink />
                            Current
                          </span>
                        )}
                      </div>
                      <p className="quest__role">{job.role}</p>
                      <p className="quest__meta">
                        {job.period}
                        {job.location ? ` · ${job.location}` : ""}
                      </p>
                      <ul className="checklist">
                        {job.highlights.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <DitherBand from="amber" to="leaf" />

        {/* BAY 03: Independent builds */}
        <section id="engineering-section" aria-labelledby="engineering-heading" className="bay" data-bay="3">
          <div className="container mx-auto">
            <Eyebrow bay={3} label="R&D bench" />
            <SectionHeading id="engineering-heading">Independent builds</SectionHeading>
            <p className="section-sub">Research and projects I build on my own time.</p>
            <div className="card-grid layout-grid">
              {data.engineeringProjects.map((project, i) => (
                <WorkCard
                  key={project.id}
                  project={project}
                  index={i + 1}
                  kind="bench"
                  skills={tokensFor(project.id)}
                />
              ))}
            </div>
          </div>
        </section>

        <DitherBand from="leaf" to="violet" />

        {/* BAY 04: About */}
        <section id="about-section" aria-labelledby="about-heading" className="bay" data-bay="4">
          <div className="container mx-auto">
            <Eyebrow bay={4} label="Operator file" />
            <SectionHeading id="about-heading">About</SectionHeading>

            <div className="about__grid layout-grid">
              <div className="about__text">
                {aboutNotes.map((note) => (
                  <p key={note.id} data-skills={tokensFor(note.id)}>
                    {note.text}
                  </p>
                ))}
              </div>
              <figure className="portrait px-frame px-frame--crt">
                <div className="px-titlebar">
                  <span className="px-titlebar__label">UNIT AB-01</span>
                </div>
                <div className="crt-screen portrait__screen">
                  <Sprite name="ab01" scale={6} className="portrait__bot" />
                </div>
                <figcaption className="portrait__caption">
                  <span className="sr-only">AB-01, the site&apos;s robot mascot. </span>
                  <dl>
                    <div>
                      <dt>Operator</dt>
                      <dd>{data.name}</dd>
                    </div>
                    <div>
                      <dt>Role</dt>
                      <dd>{data.title}</dd>
                    </div>
                    <div>
                      <dt>Base</dt>
                      <dd>{data.location}</dd>
                    </div>
                  </dl>
                </figcaption>
              </figure>
            </div>

            <div className="about__sub">
              <h3 className="sub-title">
                Inventory <span className="sub-title__count">{skillCount} skills</span>
              </h3>
              <p className="section-sub">Pick a skill to light up every card and role that uses it.</p>
              <Inventory skills={data.skills} index={skillIndex} />
            </div>

            <div className="about__awards layout-grid">
              <div>
                <h3 className="sub-title">Diploma</h3>
                <ul className="plaques">
                  {data.education.map((item) => (
                    <li key={item.school} className="plaque px-frame">
                      <div className="px-body plaque__body">
                        <Sprite name="diploma" scale={3} className="plaque__icon" />
                        <div>
                          <p className="plaque__title">{item.degree}</p>
                          <p className="plaque__detail">
                            {item.school}
                            {item.shortName ? ` (${item.shortName})` : ""}, {item.period}
                          </p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="sub-title">Trophies</h3>
                <ul className="plaques">
                  {data.awards.map((award, i) => (
                    <li key={award.title} className="plaque px-frame">
                      <div className="px-body plaque__body">
                        <Sprite name={i === 0 ? "trophy-shield" : "trophy-medal"} scale={3} className="plaque__icon" />
                        <div>
                          <p className="plaque__title">{award.title}</p>
                          {award.detail && <p className="plaque__detail">{award.detail}</p>}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="about__badges">
              <VisitorBadges />
            </div>
          </div>
        </section>

        {showWriting && (
          <>
            <DitherBand from="violet" to="violet" />
            {/* BAY 05: Writing */}
            <section id="writing-section" aria-labelledby="writing-heading" className="bay" data-bay="5">
              <div className="container mx-auto">
                <Eyebrow bay={5} label="Transmissions" />
                <SectionHeading id="writing-heading">Writing</SectionHeading>
                <div className="px-frame terminal" data-accent="violet">
                  <div className="px-titlebar">
                    <span className="px-titlebar__label">TRANSMISSIONS.LOG</span>
                  </div>
                  <ul className="px-body terminal__list">
                    {posts.map((post) => (
                      <li key={post.slug} className="terminal__entry">
                        <time dateTime={post.date} className="terminal__date">
                          {ISOToDate(post.date)}
                        </time>
                        <h3 className="terminal__title">
                          <Link href={`/blog/${post.slug}`}>
                            <a>{post.title}</a>
                          </Link>
                        </h3>
                        <p className="terminal__tagline">{post.tagline}</p>
                      </li>
                    ))}
                  </ul>
                </div>
                <p className="mt-6">
                  <Link href="/blog">
                    <a className="text-link">All posts</a>
                  </Link>
                </p>
              </div>
            </section>
          </>
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
