import { useRef } from "react";
import Head from "next/head";
import Image from "next/image";
import Router from "next/router";
import type { GetStaticProps } from "next";

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
    if (!text.current) return;
    stagger([text.current], { y: 30 }, { y: 0 });
  }, []);

  return (
    <>
      <Head>
        <title>{`Blog — Adnan Baig`}</title>
        <meta name="description" content="Writing on robotics, AI, and engineering." />
      </Head>
      <div className="container mx-auto mb-10">
        <Header isBlog />
        <div className="mt-10">
          <h1
            ref={text}
            className="mx-auto mob:p-2 text-bold text-6xl laptop:text-8xl w-full"
          >
            Blog.
          </h1>
          <div className="mt-10 grid grid-cols-1 mob:grid-cols-1 tablet:grid-cols-2 laptop:grid-cols-3 justify-between gap-10">
            {posts?.map((post) => (
              <div
                className="cursor-pointer relative"
                key={post.slug}
                onClick={() => Router.push(`/blog/${post.slug}`)}
              >
                <div className="relative w-full h-60 rounded-lg shadow-lg overflow-hidden">
                  <Image
                    src={post.image}
                    alt={post.title}
                    layout="fill"
                    objectFit="cover"
                  />
                </div>
                <h2 className="mt-5 text-4xl">{post.title}</h2>
                <p className="mt-2 opacity-50 text-lg">{post.preview}</p>
                <span className="text-sm mt-5 opacity-25">
                  {ISOToDate(post.date)}
                </span>
              </div>
            ))}
          </div>
        </div>
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
