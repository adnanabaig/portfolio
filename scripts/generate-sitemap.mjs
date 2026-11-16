// Writes public/sitemap.xml from the routes and _posts/*.md. Runs as `prebuild`.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import matter from "gray-matter";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const portfolio = JSON.parse(fs.readFileSync(path.join(root, "data/portfolio.json"), "utf8"));
const siteUrl = portfolio.siteUrl.replace(/\/$/, "");
const postsDir = path.join(root, "_posts");

const isoDate = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString().slice(0, 10);
};

const posts = fs
  .readdirSync(postsDir)
  .filter((file) => file.endsWith(".md"))
  .map((file) => {
    const { data } = matter(fs.readFileSync(path.join(postsDir, file), "utf8"));
    return { loc: `/blog/${file.replace(/\.md$/, "")}`, lastmod: isoDate(data.date) };
  })
  .sort((a, b) => (a.loc < b.loc ? -1 : 1));

const latestPost = posts.map((p) => p.lastmod).filter(Boolean).sort().pop();
const entries = [{ loc: "/" }, ...(portfolio.showBlog ? [{ loc: "/blog", lastmod: latestPost }, ...posts] : [])];

const xml = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...entries.map(({ loc, lastmod }) =>
    [
      "  <url>",
      `    <loc>${siteUrl}${loc === "/" ? "/" : loc}</loc>`,
      ...(lastmod ? [`    <lastmod>${lastmod}</lastmod>`] : []),
      "  </url>",
    ].join("\n")
  ),
  "</urlset>",
  "",
].join("\n");

fs.writeFileSync(path.join(root, "public/sitemap.xml"), xml);
console.log(`sitemap: wrote ${entries.length} URLs to public/sitemap.xml`);
