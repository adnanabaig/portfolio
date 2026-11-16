// scripts/feeds.mjs: the pure sitemap and RSS builders behind prebuild.
import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import portfolio from "../data/portfolio.json";
import { RSS_DESCRIPTION, buildRss, buildSitemap, readPosts } from "../scripts/feeds.mjs";

const root = path.resolve(__dirname, "..");
const site = { ...portfolio, siteUrl: "https://example.test/" };
const post = (slug: string, data: Record<string, unknown>) => ({ slug, data });
const posts = [
  post("older", { title: "Older post", date: "2025-01-02T08:00:00.000Z", preview: "First." }),
  post("newer", { title: "Fish & Chips <live>", date: "2025-06-01T08:00:00.000Z", preview: "  Two\n  lines. ", tagline: "unused" }),
];
const locs = (xml: string) => [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);

describe("buildSitemap", () => {
  it("lists home, every dossier, the blog, and each post, under the site URL without a double slash", () => {
    const { xml, count } = buildSitemap(site, posts);
    const ids = [...portfolio.projects, ...portfolio.engineeringProjects].map((p) => p.id);
    expect(locs(xml)).toEqual([
      "https://example.test/",
      ...ids.map((id) => `https://example.test/work/${id}`),
      "https://example.test/blog",
      "https://example.test/blog/newer",
      "https://example.test/blog/older",
    ]);
    expect(count).toBe(1 + ids.length + 1 + posts.length);
  });

  it("dates each post and stamps /blog with the latest one", () => {
    const { xml } = buildSitemap(site, posts);
    expect(xml).toContain("<loc>https://example.test/blog</loc>\n    <lastmod>2025-06-01</lastmod>");
    expect(xml).toContain("<loc>https://example.test/blog/older</loc>\n    <lastmod>2025-01-02</lastmod>");
  });

  it("drops the blog when showBlog is off", () => {
    const { xml } = buildSitemap({ ...site, showBlog: false }, posts);
    expect(xml).not.toContain("/blog");
  });

  it("is well-formed: one urlset, balanced url tags", () => {
    const { xml } = buildSitemap(site, posts);
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>\n<urlset')).toBe(true);
    expect(xml.match(/<url>/g)!.length).toBe(xml.match(/<\/url>/g)!.length);
  });
});

describe("buildRss", () => {
  it("lists posts newest first with link, guid, pubDate, and the preview as description", () => {
    const { xml, count } = buildRss(site, posts)!;
    expect(count).toBe(2);
    const items = xml.split("<item>").slice(1);
    expect(items[0]).toContain("<link>https://example.test/blog/newer</link>");
    expect(items[0]).toContain('<guid isPermaLink="true">https://example.test/blog/newer</guid>');
    expect(items[0]).toContain(`<pubDate>${new Date("2025-06-01T08:00:00.000Z").toUTCString()}</pubDate>`);
    expect(items[0]).toContain("<description>Two lines.</description>");
    expect(items[1]).toContain("<link>https://example.test/blog/older</link>");
    expect(xml).toContain(`<lastBuildDate>${new Date("2025-06-01T08:00:00.000Z").toUTCString()}</lastBuildDate>`);
    expect(xml).toContain(`<description>${RSS_DESCRIPTION}</description>`);
    expect(xml).toContain('<atom:link href="https://example.test/rss.xml" rel="self" type="application/rss+xml"/>');
  });

  it("escapes XML in titles and descriptions", () => {
    const { xml } = buildRss(site, posts)!;
    expect(xml).toContain("<title>Fish &amp; Chips &lt;live&gt;</title>");
    expect(xml).not.toContain("<live>");
  });

  it("falls back to the tagline when a post has no preview", () => {
    const { xml } = buildRss(site, [post("t", { title: "T", date: "2025-01-01", tagline: "Tag line" })])!;
    expect(xml).toContain("<description>Tag line</description>");
  });

  it("is null when the blog is off", () => {
    expect(buildRss({ ...site, showBlog: false }, posts)).toBeNull();
  });

  it("fails the build on a post with no title or no valid date", () => {
    expect(() => buildRss(site, [post("bad", { date: "2025-01-01" })])).toThrow(/bad\.md has no title/);
    expect(() => buildRss(site, [post("bad", { title: "x", date: "someday" })])).toThrow(/bad\.md has no valid date/);
  });

  it("is stable: the same posts give byte-identical output", () => {
    expect(buildRss(site, posts)!.xml).toBe(buildRss(site, [...posts].reverse())!.xml);
  });
});

describe("the committed feeds match the generators", () => {
  const real = readPosts(path.join(root, "_posts"));

  it("readPosts reads _posts only, never _drafts", () => {
    const drafts = fs.readdirSync(path.join(root, "_drafts")).map((f) => f.replace(/\.md$/, ""));
    expect(real.length).toBeGreaterThan(0);
    for (const d of drafts) expect(real.map((p) => p.slug)).not.toContain(d);
  });

  it("public/sitemap.xml is up to date", () => {
    expect(fs.readFileSync(path.join(root, "public/sitemap.xml"), "utf8")).toBe(buildSitemap(portfolio, real).xml);
  });

  it("public/rss.xml is up to date", () => {
    expect(fs.readFileSync(path.join(root, "public/rss.xml"), "utf8")).toBe(buildRss(portfolio, real)!.xml);
  });
});
