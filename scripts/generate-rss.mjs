// Writes public/rss.xml (RSS 2.0) from _posts/*.md. Runs as `prebuild`. The
// XML comes from buildRss in scripts/feeds.mjs (unit-tested in
// tests/feeds.test.ts); with the blog off, any old feed is removed.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { buildRss, readPosts } from "./feeds.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const portfolio = JSON.parse(fs.readFileSync(path.join(root, "data/portfolio.json"), "utf8"));
const out = path.join(root, "public/rss.xml");
const feed = buildRss(portfolio, readPosts(path.join(root, "_posts")));

if (!feed) {
  if (fs.existsSync(out)) fs.rmSync(out);
  console.log("rss: blog is off, no feed written");
} else {
  fs.writeFileSync(out, feed.xml);
  console.log(`rss: wrote ${feed.count} posts to public/rss.xml`);
}
