// Pure builders for public/sitemap.xml, public/rss.xml, and
// data/posts-index.json (the command palette's POSTS group). The prebuild
// scripts (generate-sitemap.mjs, generate-rss.mjs) read the files and write
// the output; these functions only turn data into text, so tests can call
// them with fixtures.
import fs from "fs";
import path from "path";
import matter from "gray-matter";

export const RSS_DESCRIPTION = "Notes on robotics, software, and building things that work in the real world.";

const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
const squash = (s) => String(s ?? "").replace(/\s+/g, " ").trim();
const base = (portfolio) => portfolio.siteUrl.replace(/\/$/, "");

const isoDate = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString().slice(0, 10);
};

/** Every _posts/*.md as { slug, data } (front matter only), sorted by slug. Never reads _drafts/. */
export function readPosts(postsDir) {
  return fs
    .readdirSync(postsDir)
    .filter((file) => file.endsWith(".md"))
    .sort()
    .map((file) => ({ slug: file.replace(/\.md$/, ""), data: matter(fs.readFileSync(path.join(postsDir, file), "utf8")).data }));
}

/** The sitemap: home, every project dossier, then the blog and its posts when the blog is on. */
export function buildSitemap(portfolio, posts) {
  const siteUrl = base(portfolio);
  const postEntries = posts
    .map((p) => ({ loc: `/blog/${p.slug}`, lastmod: isoDate(p.data.date) }))
    .sort((a, b) => (a.loc < b.loc ? -1 : 1));
  const latestPost = postEntries.map((p) => p.lastmod).filter(Boolean).sort().pop();
  const dossiers = [...portfolio.projects, ...portfolio.engineeringProjects].map((p) => ({ loc: `/work/${p.id}` }));
  const entries = [{ loc: "/" }, ...dossiers, ...(portfolio.showBlog ? [{ loc: "/blog", lastmod: latestPost }, ...postEntries] : [])];
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
  return { xml, count: entries.length };
}

/**
 * RSS 2.0, newest first: title, link, guid, pubDate, and the preview as the
 * description. Null when the blog is off. Throws on a post with no title or
 * no valid date, so a bad post fails the build. Output depends only on the
 * posts, so rebuilding without a new post changes nothing.
 */
export function buildRss(portfolio, posts) {
  if (!portfolio.showBlog) return null;
  const siteUrl = base(portfolio);
  const items = posts
    .map(({ slug, data }) => {
      const date = new Date(data.date);
      if (Number.isNaN(date.getTime())) throw new Error(`rss: ${slug}.md has no valid date`);
      if (!data.title) throw new Error(`rss: ${slug}.md has no title`);
      return { slug, title: squash(data.title), description: squash(data.preview || data.tagline), date };
    })
    .sort((a, b) => b.date - a.date);
  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    "  <channel>",
    `    <title>${esc(`${portfolio.name} | Blog`)}</title>`,
    `    <link>${siteUrl}/blog</link>`,
    `    <description>${esc(RSS_DESCRIPTION)}</description>`,
    "    <language>en-us</language>",
    `    <atom:link href="${siteUrl}/rss.xml" rel="self" type="application/rss+xml"/>`,
    ...(items.length ? [`    <lastBuildDate>${items[0].date.toUTCString()}</lastBuildDate>`] : []),
    ...items.map((p) =>
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
  return { xml, count: items.length };
}

/**
 * The command palette's post list: slug, title, and ISO timestamp (shown
 * with the same ISOToDate as the Writing section), newest first,
 * as stable JSON. Empty when the blog is off. Same validation as the feed.
 */
export function buildPostsIndex(portfolio, posts) {
  const list = !portfolio.showBlog
    ? []
    : posts
        .map(({ slug, data }) => {
          const parsed = new Date(data.date);
          const date = Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
          if (!date) throw new Error(`posts-index: ${slug}.md has no valid date`);
          if (!data.title) throw new Error(`posts-index: ${slug}.md has no title`);
          return { slug, title: squash(data.title), date };
        })
        .sort((a, b) => (a.date === b.date ? (a.slug < b.slug ? -1 : 1) : a.date < b.date ? 1 : -1));
  return JSON.stringify(list, null, 2) + "\n";
}
