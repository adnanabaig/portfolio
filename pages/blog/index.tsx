import { useRef } from "react";
import Head from "next/head";
import Image from "next/image";
import Link from "next/link";
import type { GetStaticProps } from "next";

import Footer from "../../components/Footer";
import Header from "../../components/Header";
import { getAllPosts } from "../../utils/api";
import { ISOToDate, useIsomorphicLayoutEffect } from "../../utils";
import { stagger } from "../../animations";
import type { BlogPostPreview } from "../../types/portfolio";

interface BlogPageProps {
  posts: BlogPostPreview[];
}

const Blog = ({ posts }: BlogPageProps) => {
  const text = useRef<HTMLHeadingElement | null>(null);

  useIsomorphicLayoutEffect(() => {
    if (!text.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    stagger([text.current], { y: 30 }, { y: 0 });
  }, []);

  return (
    <>
      <Head>
        <title>{`Blog — Adnan Baig`}</title>
        <meta name="description" content="Writing on robotics, AI, and engineering." />
        <link rel="canonical" href="https://adnanbaig.com/blog" />
      </Head>
      <a href="#blog-content" className="skip-link">Skip to content</a>
      <div className="portfolio-content container mx-auto mb-10 px-4 laptop:px-6">
        <Header isBlog />
        <main id="blog-content" className="mt-16">
          <h1
            ref={text}
            className="mx-auto mob:p-2 text-bold text-6xl laptop:text-8xl w-full"
          >
            Blog.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-slate-300">Notes on robotics, software, and building things that work in the real world.</p>
          <div className="mt-10 grid grid-cols-1 mob:grid-cols-1 tablet:grid-cols-2 laptop:grid-cols-3 justify-between gap-10">
            {posts?.map((post) => (
              <Link href={`/blog/${post.slug}`} key={post.slug}>
              <a className="group flex h-full min-w-0 flex-col rounded-2xl border border-white/10 bg-white/5 p-4 hover:border-[#7db6ff]/50 transition-colors">
                <div className="relative w-full h-60 rounded-lg shadow-lg overflow-hidden">
                  <Image
                    src={post.image}
                    alt=""
                    sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    layout="fill"
                    objectFit="cover"
                  />
                </div>
                <h2 className="mt-5 text-2xl font-semibold leading-snug">{post.title}</h2>
                <p className="mt-3 text-slate-300 leading-relaxed">{post.preview}</p>
                <time dateTime={post.date} className="mt-auto pt-6 text-sm text-slate-400">
                  {ISOToDate(post.date)}
                </time>
                <span className="mt-4 text-sm text-[#7db6ff]">Read article <span aria-hidden="true">→</span></span>
              </a>
              </Link>
            ))}
          </div>
        </main>
        <Footer />
      </div>
    </>
  );
};

export const getStaticProps: GetStaticProps<BlogPageProps> = () => {
  const posts = getAllPosts([
    "slug",
    "title",
    "image",
    "preview",
    "author",
    "date",
  ]) as unknown as BlogPostPreview[];

  return {
    props: {
      posts: [...posts],
    },
  };
};

export default Blog;
