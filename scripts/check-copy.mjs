// Copy guard: `npm run check:copy`. Fails on em dashes, emoji, leaked TODOs,
// and terms that must not appear on the public site, in:
// - data/*.json (except the private `_todo` notes) and _posts/*.md
// - source: components/ (including components/ops/**), pages/, lib/ (all of
//   it: badges, audio, hello, pixel data), hooks/ (.ts, .tsx, .json, .mjs)
// - scripts/build-og.mjs, whose strings end up in public/og.png, plus the
//   PNG encoder and grain scripts beside it
// The OPS console's actual output is checked by scripts/check-ops.mjs.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { EM_DASH, EMOJI, FORBIDDEN } from "./copy-rules.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
// Non-emoji symbols that are explicitly fine in copy (not matched by EMOJI
// today; listed so the intent is on record if the pattern ever widens).
const ALLOWED_SYMBOLS = new Set(["\u00B7"]); // middle dot
const SOURCE_DIRS = ["components", "pages", "lib", "hooks"];
const SOURCE_EXT = [".ts", ".tsx", ".json", ".mjs"];

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
  for (const match of text.matchAll(EMOJI)) {
    if (ALLOWED_SYMBOLS.has(match[0])) continue;
    const cp = match[0].codePointAt(0).toString(16).toUpperCase().padStart(4, "0");
    problems.push(`${rel}:${lineOf(text, match.index)}: emoji or pictograph U+${cp}`);
  }
  if (checkTodo) {
    for (const match of text.matchAll(/TODO|_todo/g)) {
      problems.push(`${rel}:${lineOf(text, match.index)}: "${match[0]}" in user-visible copy or source`);
    }
  }
}

function walk(dir, exts) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === "node_modules" ? [] : walk(full, exts);
    return exts.some((ext) => entry.name.endsWith(ext)) ? [full] : [];
  });
}

// data/*.json: everything except the `_todo` key is user-visible.
for (const file of walk(path.join(root, "data"), [".json"])) {
  const raw = fs.readFileSync(file, "utf8");
  const json = JSON.parse(raw);
  const todo = json._todo;
  delete json._todo;
  scanText(file, JSON.stringify(json, null, 2), { checkTodo: true });
  if (todo !== undefined) scanText(`${file} (_todo)`, JSON.stringify(todo, null, 2), { checkTodo: false });
}

// _posts/*.md: front matter and bodies are all published.
for (const file of walk(path.join(root, "_posts"), [".md"])) {
  scanText(file, fs.readFileSync(file, "utf8"), { checkTodo: true });
}

// Source: strings in components and pages ship to the browser, so the same
// rules apply. lib/facts.ts and friends must not reference the private notes.
for (const dir of SOURCE_DIRS) {
  for (const file of walk(path.join(root, dir), SOURCE_EXT)) {
    scanText(file, fs.readFileSync(file, "utf8"), { checkTodo: true });
  }
}

// The social card is rendered from strings in build-og; the grain and PNG
// scripts sit beside it and follow the same rules.
for (const rel of ["scripts/build-og.mjs", "scripts/build-grain.mjs", "scripts/png.mjs"]) {
  scanText(path.join(root, rel), fs.readFileSync(path.join(root, rel), "utf8"), { checkTodo: true });
}

if (problems.length) {
  console.error(`check:copy found ${problems.length} problem(s):`);
  for (const problem of problems) console.error(`  ${problem}`);
  process.exit(1);
}
console.log("check:copy: ok");
