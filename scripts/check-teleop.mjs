// Teleop catalog guard (chained into `npm run check:copy`).
// data/teleop.json must index the resume's skills exactly:
// - every block label maps to a real skill string in data/portfolio.json
// - every skill has exactly one block
// - every bin key is a real skill group, and every group has a bin
// - labels are 2-6 chars the 5x7 canvas font can draw, with no em dash or emoji
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (f) => JSON.parse(fs.readFileSync(path.join(root, f), "utf8"));
const data = read("data/portfolio.json");
const teleop = read("data/teleop.json");
const font = read("lib/pixel/font.json");

const problems = [];
const skills = data.skills.flatMap((g) => g.items);
const groups = data.skills.map((g) => g.group);
const drawable = new Set(Object.keys(font.glyphs));
const EMOJI = /[\p{Extended_Pictographic}\u{FE0F}]/u;

function checkLabel(kind, label, { min, max }) {
  if (label.length < min || label.length > max) problems.push(`${kind} "${label}": length ${label.length}, expected ${min}-${max}`);
  if (label !== label.toUpperCase()) problems.push(`${kind} "${label}": must be uppercase`);
  if (label.includes("\u2014")) problems.push(`${kind} "${label}": em dash`);
  if (EMOJI.test(label)) problems.push(`${kind} "${label}": emoji`);
  for (const ch of label) if (!drawable.has(ch)) problems.push(`${kind} "${label}": "${ch}" is not in lib/pixel/font.json`);
}

const counts = new Map(skills.map((s) => [s, 0]));
for (const [label, skill] of Object.entries(teleop.blocks)) {
  checkLabel("block", label, { min: 2, max: 6 });
  if (!counts.has(skill)) problems.push(`block "${label}" maps to "${skill}", which is not a skill in data/portfolio.json`);
  else counts.set(skill, counts.get(skill) + 1);
}
for (const [skill, n] of counts) {
  if (n !== 1) problems.push(`skill "${skill}" has ${n} blocks (expected exactly 1)`);
}

for (const [group, label] of Object.entries(teleop.bins)) {
  checkLabel("bin", label, { min: 2, max: 11 });
  if (!groups.includes(group)) problems.push(`bin "${group}" is not a skill group in data/portfolio.json`);
}
for (const group of groups) if (!(group in teleop.bins)) problems.push(`skill group "${group}" has no bin label`);

if (problems.length) {
  console.error(`check-teleop found ${problems.length} problem(s):`);
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}
const mapped = [...counts.values()].filter((n) => n === 1).length;
console.log(`check-teleop: ok (${mapped}/${skills.length} skills mapped exactly once, ${groups.length} bins)`);
