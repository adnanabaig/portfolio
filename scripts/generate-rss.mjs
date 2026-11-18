// Writes public/rss.xml (RSS 2.0) and data/posts-index.json (the command
// palette's post list) from _posts/*.md. Runs as `prebuild`. Both come from
// scripts/feeds.mjs (unit-tested in tests/feeds.test.ts); with the blog off,
// any old feed is removed and the index is an empty list.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { buildPostsIndex, buildRss, readPosts } from "./feeds.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const portfolio = JSON.parse(fs.readFileSync(path.join(root, "data/portfolio.json"), "utf8"));
const out = path.join(root, "public/rss.xml");
const posts = readPosts(path.join(root, "_posts"));
const feed = buildRss(portfolio, posts);
fs.writeFileSync(path.join(root, "data/posts-index.json"), buildPostsIndex(portfolio, posts));

if (!feed) {
  if (fs.existsSync(out)) fs.rmSync(out);
  console.log("rss: blog is off, no feed written");
} else {
  fs.writeFileSync(out, feed.xml);
  console.log(`rss: wrote ${feed.count} posts to public/rss.xml`);
}
