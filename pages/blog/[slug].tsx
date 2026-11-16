import Link from "next/link";
import type { GetStaticPaths, GetStaticProps } from "next";

import Header from "../../components/Header";
import Footer from "../../components/Footer";
import Seo from "../../components/Seo";
import Sprite from "../../components/pixel/Sprite";
import { getPostBySlug, getAllPosts } from "../../utils/api";
import markdownToHtml, { readingMinutes } from "../../utils/markdownToHtml";
import { ISOToDate } from "../../utils";
import portfolio from "../../data/portfolio.json";
import type { BlogPost, BlogPostPreview } from "../../types/portfolio";

interface BlogPostPageProps {
  post: BlogPost;
}

const BlogPostPage = ({ post }: BlogPostPageProps) => {
  const path = `/blog/${post.slug}`;
  const postJsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.preview,
    datePublished: post.date,
    url: `${portfolio.siteUrl}${path}`,
    mainEntityOfPage: `${portfolio.siteUrl}${path}`,
    author: { "@type": "Person", name: portfolio.name, url: portfolio.siteUrl },
  };

  return (
    <>
      <Seo
        title={`${post.title} | ${portfolio.name}`}
        description={post.preview}
        path={path}
        type="article"
        publishedTime={post.date}
        jsonLd={postJsonLd}
      />
      <a href="#main-content" className="skip-link">
        Skip to article
      </a>
      <Header current="blog" />
      <main id="main-content" tabIndex={-1} className="container mx-auto page-main focus:outline-none" data-bay="5">
        <div className="reading">
          <Link href="/blog">
            <a className="back-link">
              <Sprite name="glyph-arrow" scale={2} mono />
              All posts
            </a>
          </Link>
          <article aria-labelledby="post-title">
            <header className="post-head px-frame" data-accent="violet">
              <div className="px-titlebar">
                <span className="px-titlebar__label">Log entry · {post.readingMinutes} min</span>
              </div>
              <div className="px-body">
                <h1 id="post-title" className="post-title">
                  {post.title}
                </h1>
                <p className="post-tagline">{post.tagline}</p>
                <p className="post-meta">
                  <time dateTime={post.date}>{ISOToDate(post.date)}</time> · {post.readingMinutes} min read
                </p>
              </div>
            </header>
            <div className="markdown-class" dangerouslySetInnerHTML={{ __html: post.html }} />
          </article>
        </div>
      </main>
      <Footer />
    </>
  );
};

export const getStaticProps: GetStaticProps<BlogPostPageProps> = async ({ params }) => {
  const { slug } = params as { slug: string };
  const raw = getPostBySlug(slug, ["date", "slug", "preview", "title", "tagline", "content"]) as unknown as BlogPostPreview & {
    content: string;
  };
  const { content, ...meta } = raw;

  return {
    props: {
      post: {
        ...meta,
        html: await markdownToHtml(content),
        readingMinutes: readingMinutes(content),
      },
    },
  };
};

export const getStaticPaths: GetStaticPaths = () => {
  const posts = getAllPosts(["slug"]) as Pick<BlogPostPreview, "slug">[];
  return {
    paths: posts.map((post) => ({ params: { slug: post.slug } })),
    fallback: false,
  };
};

export default BlogPostPage;
