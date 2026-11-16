// Copy guard: `npm run check:copy`. Fails on em dashes, leaked TODOs in
// user-visible content, and terms that must not appear on the public site.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const EM_DASH = "\u2014";
const FORBIDDEN = [
  "MUMI",
  "Beryllium",
  "Helium",
  "Hydrogen",
  "Lithium",
  "rl_robot",
  "metabot",
  "Phabricator",
  "unsplash",
];

const problems = [];
const lineOf = (text, index) => text.slice(0, index).split("\n").length;

function scanText(file, text, { checkTodo }) {
  const rel = path.relative(root, file);
  let index = text.indexOf(EM_DASH);
  while (index !== -1) {
    problems.push(`${rel}:${lineOf(text, index)}: em dash (U+2014)`);
    index = text.indexOf(EM_DASH, index + 1);
  }
  for (const term of FORBIDDEN) {
    const re = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    for (const match of text.matchAll(re)) {
      problems.push(`${rel}:${lineOf(text, match.index)}: forbidden term "${term}"`);
    }
  }
  if (checkTodo) {
    for (const match of text.matchAll(/TODO|_todo/g)) {
      problems.push(`${rel}:${lineOf(text, match.index)}: "${match[0]}" in user-visible copy`);
    }
  }
}

function walk(dir, ext) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) return walk(full, ext);
      return entry.name.endsWith(ext) ? [full] : [];
    });
}

// data/*.json: everything except the `_todo` key is user-visible.
for (const file of walk(path.join(root, "data"), ".json")) {
  const raw = fs.readFileSync(file, "utf8");
  const json = JSON.parse(raw);
  const todo = json._todo;
  delete json._todo;
  scanText(file, JSON.stringify(json, null, 2), { checkTodo: true });
  if (todo !== undefined) scanText(`${file} (_todo)`, JSON.stringify(todo, null, 2), { checkTodo: false });
}

// _posts/*.md: front matter and bodies are all published.
for (const file of walk(path.join(root, "_posts"), ".md")) {
  scanText(file, fs.readFileSync(file, "utf8"), { checkTodo: true });
}

if (problems.length) {
  console.error(`check:copy found ${problems.length} problem(s):`);
  for (const problem of problems) console.error(`  ${problem}`);
  process.exit(1);
}
console.log("check:copy: ok");
