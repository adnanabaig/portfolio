import Link from "next/link";
import type { GetStaticPaths, GetStaticProps } from "next";

import Header from "../../components/Header";
import Footer from "../../components/Footer";
import Seo from "../../components/Seo";
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
      <main id="main-content" tabIndex={-1} className="container mx-auto focus:outline-none">
        <div className="mx-auto max-w-3xl">
          <Link href="/blog">
            <a className="mt-8 inline-flex min-h-[44px] items-center text-sm text-cyan-300">
              <span aria-hidden="true">&larr;&nbsp;</span>All posts
            </a>
          </Link>
          <article aria-labelledby="post-title">
            <header className="mt-6">
              <h1 id="post-title" className="text-3xl tablet:text-4xl laptop:text-5xl font-semibold leading-tight">
                {post.title}
              </h1>
              <p className="mt-3 text-lg leading-relaxed text-slate-300">{post.tagline}</p>
              <p className="mt-5 font-mono text-sm text-slate-400">
                <time dateTime={post.date}>{ISOToDate(post.date)}</time> · {post.readingMinutes} min read
              </p>
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
