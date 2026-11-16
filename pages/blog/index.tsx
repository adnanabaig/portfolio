import Link from "next/link";
import type { GetStaticProps } from "next";

import Footer from "../../components/Footer";
import Header from "../../components/Header";
import Seo from "../../components/Seo";
import Eyebrow from "../../components/pixel/Eyebrow";
import { getAllPosts, getPostBySlug } from "../../utils/api";
import { readingMinutes } from "../../utils/markdownToHtml";
import { ISOToDate } from "../../utils";
import portfolio from "../../data/portfolio.json";
import type { BlogPostPreview } from "../../types/portfolio";

type PostCard = BlogPostPreview & { readingMinutes: number };

interface BlogPageProps {
  posts: PostCard[];
}

const DESCRIPTION = "Notes on robotics, software, and building things that work in the real world.";

const Blog = ({ posts }: BlogPageProps) => (
  <>
    <Seo title={`Blog | ${portfolio.name}`} description={DESCRIPTION} path="/blog" />
    <a href="#main-content" className="skip-link">
      Skip to content
    </a>
    <Header current="blog" />
    <main id="main-content" tabIndex={-1} className="container mx-auto page-main focus:outline-none" data-bay="5">
      <header className="page-head">
        <Eyebrow bay={5} label="Transmissions" />
        <h1 className="page-title">Blog</h1>
        <p className="page-lede">{DESCRIPTION}</p>
        <p className="blog-feed">
          <a href="/rss.xml" className="text-link" type="application/rss+xml">
            RSS feed
          </a>
        </p>
      </header>
      <ul className="post-grid layout-grid">
        {posts.map((post) => (
          <li key={post.slug}>
            <article className="post-card px-frame" data-accent="violet">
              <div className="px-titlebar">
                <span className="px-titlebar__label">Log entry · {post.readingMinutes} min</span>
              </div>
              <div className="px-body">
                <time dateTime={post.date} className="post-card__date">
                  {ISOToDate(post.date)}
                </time>
                <h2 className="post-card__title">
                  <Link href={`/blog/${post.slug}`}>
                    {/* The stretched link makes the whole card clickable with one tab stop. */}
                    <a className="stretched">{post.title}</a>
                  </Link>
                </h2>
                <p className="post-card__preview">{post.preview}</p>
              </div>
            </article>
          </li>
        ))}
      </ul>
    </main>
    <Footer />
  </>
);

export const getStaticProps: GetStaticProps<BlogPageProps> = () => {
  const posts = (getAllPosts(["slug", "title", "tagline", "preview", "date"]) as unknown as BlogPostPreview[]).map(
    (post) => ({
      ...post,
      readingMinutes: readingMinutes((getPostBySlug(post.slug, ["content"]) as { content: string }).content),
    })
  );
  return { props: { posts } };
};

export default Blog;
