import fs from "fs";
import { join } from "path";
import matter from "gray-matter";

const postsDirectory = join(process.cwd(), "_posts");

export function getPostSlugs() {
  return fs.readdirSync(postsDirectory);
}

export function getPostBySlug<TFields extends readonly string[]>(
  slug: string,
  fields: TFields = [] as unknown as TFields
) {
  const realSlug = slug.replace(/\.md$/, "");
  const fullPath = join(postsDirectory, `${realSlug}.md`);
  const fileContents = fs.readFileSync(fullPath, "utf8");
  const { data, content } = matter(fileContents);

  const items: Record<string, unknown> = {};

  fields.forEach((field) => {
    if (field === "slug") items[field] = realSlug;
    if (field === "content") items[field] = content;
    if (typeof (data as Record<string, unknown>)[field] !== "undefined") {
      items[field] = (data as Record<string, unknown>)[field];
    }
  });

  return items as Record<TFields[number], unknown>;
}

export function getAllPosts<TFields extends readonly string[]>(
  fields: TFields = [] as unknown as TFields
) {
  const slugs = getPostSlugs();
  const posts = slugs
    .map((slug) => getPostBySlug(slug, fields))
    .sort((post1, post2) => {
      const d1 = (post1 as Record<string, unknown>).date as string;
      const d2 = (post2 as Record<string, unknown>).date as string;
      return d1 > d2 ? -1 : 1;
    });

  return posts;
}

