// Writes public/sitemap.xml from the routes, every project dossier
// (/work/<id>), and _posts/*.md. Runs as `prebuild`. The XML comes from
// buildSitemap in scripts/feeds.mjs (unit-tested in tests/feeds.test.ts).
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { buildSitemap, readPosts } from "./feeds.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const portfolio = JSON.parse(fs.readFileSync(path.join(root, "data/portfolio.json"), "utf8"));
const { xml, count } = buildSitemap(portfolio, readPosts(path.join(root, "_posts")));

fs.writeFileSync(path.join(root, "public/sitemap.xml"), xml);
console.log(`sitemap: wrote ${count} URLs to public/sitemap.xml`);
