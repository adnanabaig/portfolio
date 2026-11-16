import Link from "next/link";
import type { GetStaticProps } from "next";

import Footer from "../../components/Footer";
import Header from "../../components/Header";
import Seo from "../../components/Seo";
import { getAllPosts } from "../../utils/api";
import { ISOToDate } from "../../utils";
import portfolio from "../../data/portfolio.json";
import type { BlogPostPreview } from "../../types/portfolio";

interface BlogPageProps {
  posts: BlogPostPreview[];
}

const DESCRIPTION = "Notes on robotics, software, and building things that work in the real world.";

const Blog = ({ posts }: BlogPageProps) => (
  <>
    <Seo title={`Blog | ${portfolio.name}`} description={DESCRIPTION} path="/blog" />
    <a href="#main-content" className="skip-link">
      Skip to content
    </a>
    <Header current="blog" />
    <main id="main-content" tabIndex={-1} className="container mx-auto pt-16 focus:outline-none">
      <h1 className="text-4xl laptop:text-6xl font-semibold tracking-tight">Blog</h1>
      <p className="mt-5 max-w-2xl text-lg leading-relaxed text-slate-300">{DESCRIPTION}</p>
      <ul className="mt-10 grid grid-cols-1 tablet:grid-cols-2 laptop:grid-cols-3 gap-4">
        {posts.map((post) => (
          <li key={post.slug}>
            <article className="relative flex h-full min-w-0 flex-col rounded border border-white/10 bg-white/[0.02] p-5 hover:border-white/30 transition-colors">
              <time dateTime={post.date} className="font-mono text-sm text-slate-400">
                {ISOToDate(post.date)}
              </time>
              <h2 className="mt-3 text-xl font-semibold leading-snug">
                <Link href={`/blog/${post.slug}`}>
                  {/* The stretched link makes the whole card clickable with one tab stop. */}
                  <a className="after:absolute after:inset-0 after:content-['']">{post.title}</a>
                </Link>
              </h2>
              <p className="mt-3 leading-relaxed text-slate-300">{post.preview}</p>
            </article>
          </li>
        ))}
      </ul>
    </main>
    <Footer />
  </>
);

export const getStaticProps: GetStaticProps<BlogPageProps> = () => {
  const posts = getAllPosts(["slug", "title", "tagline", "preview", "date"]) as unknown as BlogPostPreview[];
  return { props: { posts } };
};

export default Blog;
