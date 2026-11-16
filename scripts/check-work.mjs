// Dossier sketch guard (chained into `npm run check:copy`).
// data/schematics.json drives the "system sketch (illustrative)" on every
// /work/<id> page. It must only name parts the project's own copy names:
// - every project has a sketch, and every sketch belongs to a project
// - every node label (lines joined with a space) and every edge note appears
//   in that project's title, org, role, category, summary, highlights, or
//   stack (case and punctuation folded)
// - labels are 1 or 2 lines of at most 13 characters the bitmap font draws
// - the grid is 4 x 2, one node per cell, edges reference real nodes, flow
//   never runs backward, and no straight run crosses another node's cell
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { copyProblems } from "./copy-rules.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (f) => JSON.parse(fs.readFileSync(path.join(root, f), "utf8"));
const data = read("data/portfolio.json");
const sketches = read("data/schematics.json");
const font = read("lib/pixel/font.json");
const problems = [];
const fail = (m) => problems.push(m);

const fold = (s) => ` ${String(s).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()} `;
const drawable = (s) => [...s.toUpperCase()].every((ch) => ch === " " || font.glyphs[ch]);
const KINDS = new Set(["hw", "sw", "data", "check"]);
const WIRES = new Set(["flow", "link", "gate"]);

const projects = [...data.projects, ...data.engineeringProjects];
const ids = new Set(projects.map((p) => p.id));
for (const key of Object.keys(sketches)) if (!key.startsWith("_") && !ids.has(key)) fail(`schematics.json has a sketch for unknown project "${key}"`);

let nodes = 0;
for (const p of projects) {
  const spec = sketches[p.id];
  if (!spec) {
    fail(`${p.id}: no sketch in data/schematics.json`);
    continue;
  }
  const copy = fold([p.title, p.org, p.role, p.category, p.summary, ...p.highlights, ...p.stack].filter(Boolean).join(" | "));
  const byId = new Map();
  const cells = new Map();
  for (const n of spec.nodes) {
    nodes++;
    const where = `${p.id}/${n.id}`;
    if (byId.has(n.id)) fail(`${where}: duplicate node id`);
    byId.set(n.id, n);
    if (!Array.isArray(n.label) || n.label.length < 1 || n.label.length > 2) fail(`${where}: label must be 1 or 2 lines`);
    for (const line of n.label ?? []) {
      if (line.length > 13) fail(`${where}: "${line}" is longer than 13 characters`);
      if (!drawable(line)) fail(`${where}: "${line}" has a character the bitmap font cannot draw`);
      for (const pr of copyProblems(line)) fail(`${where}: ${pr}`);
    }
    const label = (n.label ?? []).join(" ");
    if (!copy.includes(fold(label))) fail(`${where}: "${label}" is not named in the ${p.id} copy`);
    if (!KINDS.has(n.kind)) fail(`${where}: unknown kind "${n.kind}"`);
    if (!(Number.isInteger(n.col) && n.col >= 0 && n.col <= 3 && Number.isInteger(n.row) && n.row >= 0 && n.row <= 1)) fail(`${where}: cell (${n.col}, ${n.row}) is off the 4 x 2 grid`);
    const cell = `${n.col},${n.row}`;
    if (cells.has(cell)) fail(`${where}: shares cell ${cell} with ${cells.get(cell)}`);
    cells.set(cell, n.id);
  }
  const occupied = (col, row) => cells.has(`${col},${row}`);
  for (const e of spec.edges) {
    const where = `${p.id}: ${e.from} -> ${e.to}`;
    const a = byId.get(e.from);
    const b = byId.get(e.to);
    if (!a || !b) {
      fail(`${where}: unknown node`);
      continue;
    }
    if (e.kind && !WIRES.has(e.kind)) fail(`${where}: unknown edge kind "${e.kind}"`);
    if (e.note) {
      if (!copy.includes(fold(e.note))) fail(`${where}: note "${e.note}" is not in the ${p.id} copy`);
      for (const pr of copyProblems(e.note)) fail(`${where}: ${pr}`);
    }
    if (b.col < a.col) fail(`${where}: flow runs backward`);
    if (b.col === a.col && b.row === a.row) fail(`${where}: loops to itself`);
    // The renderer runs along the source row, then turns in the gap before
    // the target column: every cell it passes must be empty.
    for (let c = a.col + 1; c < b.col; c++) if (occupied(c, a.row)) fail(`${where}: crosses the node at (${c}, ${a.row})`);
  }
}

if (problems.length) {
  console.error(`check-work found ${problems.length} problem(s):`);
  for (const p of problems) console.error(`  ${p}`);
  process.exitCode = 1;
} else {
  console.log(`check-work: ok (${projects.length} sketches, ${nodes} nodes, every label named in its project copy)`);
}
