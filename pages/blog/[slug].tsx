import React, { useRef } from "react";
import Head from "next/head";
import Link from "next/link";
import Image from "next/image";
import type { GetStaticPaths, GetStaticProps } from "next";

import Header from "../../components/Header";
import ContentSection from "../../components/ContentSection";
import Footer from "../../components/Footer";
import { getPostBySlug, getAllPosts } from "../../utils/api";
import { ISOToDate, useIsomorphicLayoutEffect } from "../../utils";
import { stagger } from "../../animations";
import type { BlogPost, BlogPostPreview } from "../../types/portfolio";

interface BlogPostPageProps {
  post: BlogPost;
}

const BlogPost = ({ post }: BlogPostPageProps) => {
  const textOne = useRef<HTMLHeadingElement | null>(null);
  const textTwo = useRef<HTMLHeadingElement | null>(null);

  useIsomorphicLayoutEffect(() => {
    if (!textOne.current || !textTwo.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    stagger([textOne.current, textTwo.current], { y: 30 }, { y: 0 });
  }, []);

  return (
    <>
      <Head>
        <title>{`${post.title} — Adnan Baig`}</title>
        <meta name="description" content={post.preview} />
        <link rel="canonical" href={`https://adnanbaig.com/blog/${post.slug}`} />
      </Head>
      <a href="#article-content" className="skip-link">Skip to article</a>
      <div className="portfolio-content container mx-auto px-4 laptop:px-6">
        <Header isBlog />
        <main id="article-content" className="mx-auto max-w-3xl">
        <Link href="/blog"><a className="mt-10 inline-flex py-3 text-sm text-[#7db6ff]">← All articles</a></Link>
        <article>
        <div className="mt-6 flex flex-col">
          <div className="relative w-full h-52 tablet:h-80 rounded-lg shadow-lg overflow-hidden">
            <Image
              src={post.image}
              alt=""
              sizes="(max-width: 768px) 100vw, 768px"
              priority
              layout="fill"
              objectFit="cover"
            />
          </div>
          <h1
            ref={textOne}
            className="mt-10 text-3xl tablet:text-4xl laptop:text-5xl font-bold leading-tight"
          >
            {post.title}
          </h1>
          <p
            ref={textTwo}
            className="mt-2 text-lg leading-relaxed text-slate-300"
          >
            {post.tagline}
          </p>
          <time dateTime={post.date} className="mt-5 text-sm text-slate-400">{ISOToDate(post.date)}</time>
        </div>
        <ContentSection content={post.content} />
        </article>
        </main>
        <Footer />
      </div>
    </>
  );
};

export const getStaticProps: GetStaticProps<BlogPostPageProps> = ({ params }) => {
  const { slug } = params as { slug: string };

  const postData = getPostBySlug(slug, [
    "date",
    "slug",
    "preview",
    "title",
    "tagline",
    "image",
    "content",
  ]) as unknown as BlogPost;

  return {
    props: {
      post: { ...postData },
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

export default BlogPost;
