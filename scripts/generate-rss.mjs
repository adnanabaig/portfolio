// Writes public/rss.xml (RSS 2.0) from _posts/*.md: title, link, guid,
// pubDate, and the preview as the description. Runs as `prebuild`. The output
// depends only on the posts, so rebuilding without a new post changes nothing.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import matter from "gray-matter";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const portfolio = JSON.parse(fs.readFileSync(path.join(root, "data/portfolio.json"), "utf8"));
const siteUrl = portfolio.siteUrl.replace(/\/$/, "");
const postsDir = path.join(root, "_posts");
const out = path.join(root, "public/rss.xml");

const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
const squash = (s) => String(s ?? "").replace(/\s+/g, " ").trim();

if (!portfolio.showBlog) {
  if (fs.existsSync(out)) fs.rmSync(out);
  console.log("rss: blog is off, no feed written");
  process.exit(0);
}

const posts = fs
  .readdirSync(postsDir)
  .filter((file) => file.endsWith(".md"))
  .map((file) => {
    const { data } = matter(fs.readFileSync(path.join(postsDir, file), "utf8"));
    const date = new Date(data.date);
    if (Number.isNaN(date.getTime())) throw new Error(`rss: ${file} has no valid date`);
    if (!data.title) throw new Error(`rss: ${file} has no title`);
    return { slug: file.replace(/\.md$/, ""), title: squash(data.title), description: squash(data.preview || data.tagline), date };
  })
  .sort((a, b) => b.date - a.date);

const link = `${siteUrl}/blog`;
const xml = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
  "  <channel>",
  `    <title>${esc(`${portfolio.name} | Blog`)}</title>`,
  `    <link>${link}</link>`,
  `    <description>${esc("Notes on robotics, software, and building things that work in the real world.")}</description>`,
  "    <language>en-us</language>",
  `    <atom:link href="${siteUrl}/rss.xml" rel="self" type="application/rss+xml"/>`,
  ...(posts.length ? [`    <lastBuildDate>${posts[0].date.toUTCString()}</lastBuildDate>`] : []),
  ...posts.map((p) =>
    [
      "    <item>",
      `      <title>${esc(p.title)}</title>`,
      `      <link>${siteUrl}/blog/${p.slug}</link>`,
      `      <guid isPermaLink="true">${siteUrl}/blog/${p.slug}</guid>`,
      `      <pubDate>${p.date.toUTCString()}</pubDate>`,
      `      <description>${esc(p.description)}</description>`,
      "    </item>",
    ].join("\n")
  ),
  "  </channel>",
  "</rss>",
  "",
].join("\n");

fs.writeFileSync(out, xml);
console.log(`rss: wrote ${posts.length} posts to public/rss.xml`);
