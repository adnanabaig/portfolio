import React, { useRef } from "react";
import Head from "next/head";
import Image from "next/image";
import type { GetStaticPaths, GetStaticProps } from "next";

import Header from "../../components/Header";
import ContentSection from "../../components/ContentSection";
import Footer from "../../components/Footer";
import { getPostBySlug, getAllPosts } from "../../utils/api";
import { useIsomorphicLayoutEffect } from "../../utils";
import { stagger } from "../../animations";
import type { BlogPost, BlogPostPreview } from "../../types/portfolio";

interface BlogPostPageProps {
  post: BlogPost;
}

const BlogPost = ({ post }: BlogPostPageProps) => {
  const textOne = useRef<HTMLHeadingElement | null>(null);
  const textTwo = useRef<HTMLHeadingElement | null>(null);

  useIsomorphicLayoutEffect(() => {
    if (!textOne.current || !textTwo.current) return;
    stagger([textOne.current, textTwo.current], { y: 30 }, { y: 0 });
  }, []);

  return (
    <>
      <Head>
        <title>{`${post.title} — Adnan Baig`}</title>
        <meta name="description" content={post.preview} />
      </Head>
      <div className="container mx-auto mt-10">
        <Header isBlog />
        <div className="mt-10 flex flex-col">
          <div className="relative w-full h-96 rounded-lg shadow-lg overflow-hidden">
            <Image
              src={post.image}
              alt={post.title}
              layout="fill"
              objectFit="cover"
            />
          </div>
          <h1
            ref={textOne}
            className="mt-10 text-4xl mob:text-2xl laptop:text-6xl text-bold"
          >
            {post.title}
          </h1>
          <h2
            ref={textTwo}
            className="mt-2 text-xl max-w-4xl opacity-50"
          >
            {post.tagline}
          </h2>
        </div>
        <ContentSection content={post.content} />
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
