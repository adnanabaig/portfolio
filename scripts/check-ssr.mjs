// SSR guard: `npm run check:ssr [distDir]` (default .next-build).
// Reads the prerendered home page and asserts the recruiter path and the
// fact contract: content is real HTML, complete, in order, and nothing
// hidden or invented leaks in.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import matter from "gray-matter";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const distDir = process.argv[2] || ".next-build";
const htmlFile = path.join(root, distDir, "server/pages/index.html");
if (!fs.existsSync(htmlFile)) {
  console.error(`check:ssr: ${path.relative(root, htmlFile)} not found. Build first (NEXT_DIST_DIR=${distDir} npm run build).`);
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(path.join(root, "data/portfolio.json"), "utf8"));
const raw = fs.readFileSync(htmlFile, "utf8");
const failures = [];
const passes = [];
const check = (ok, label) => (ok ? passes : failures).push(label);

const decode = (s) =>
  s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");
const squash = (s) => s.replace(/\s+/g, " ").trim();

// Visible markup: drop scripts, styles, comments (React text separators), and
// SVG internals (path data is numbers, not copy).
const body = raw
  .replace(/<script[\s\S]*?<\/script>/gi, "")
  .replace(/<style[\s\S]*?<\/style>/gi, "")
  .replace(/<!--[\s\S]*?-->/g, "")
  .replace(/<svg[\s\S]*?<\/svg>/gi, "<svg></svg>");
const text = squash(decode(body.replace(/<[^>]+>/g, " ")));
const textAt = (html) => squash(decode(html.replace(/<[^>]+>/g, " ")));

// 1. Exactly one h1, and it contains the name.
const h1s = [...body.matchAll(/<h1[\s>][\s\S]*?<\/h1>/gi)].map((m) => textAt(m[0]));
check(h1s.length === 1, `exactly one <h1> (found ${h1s.length})`);
check(h1s.some((h) => h.includes(data.name)), `<h1> contains "${data.name}"`);

// 2. Recruiter path: eyebrow, lede, proof, and resume link before the cell.
const cellAt = (() => {
  const marks = [body.indexOf('data-marker="cell"'), body.indexOf("data-cell-poster"), body.indexOf("<canvas")].filter((i) => i >= 0);
  return marks.length ? Math.min(...marks) : -1;
})();
check(cellAt > 0, "cell marker present");
const before = textAt(body.slice(0, cellAt > 0 ? cellAt : body.length));
for (const [label, value] of [
  ["eyebrow", data.hero.eyebrow],
  ["lede", data.hero.lede],
  ...data.hero.proof.map((p, i) => [`proof ${i + 1}`, p]),
]) {
  check(before.includes(squash(value)), `${label} appears before the cell`);
}
check(body.slice(0, cellAt).includes(`href="${data.resumeUrl}"`), "resume href appears before the cell");
const header = (body.match(/<header class="statusbar"[\s\S]*?<\/header>/) || [""])[0];
const mobileNav = (header.match(/<nav[^>]*id="mobile-nav"[\s\S]*?<\/nav>/) || [""])[0];
check(header.replace(mobileNav, "").includes(`href="${data.resumeUrl}"`), "status bar has a resume link outside the mobile menu");

// 3. Every visible fact string appears.
const visibleJobs = data.experience.filter((j) => !j.hidden);
const facts = [
  data.name,
  data.title,
  data.location,
  data.email,
  data.contact.lede,
  ...data.about,
  ...[...data.projects, ...data.engineeringProjects].flatMap((p) => [
    p.title,
    p.summary,
    p.category,
    ...(p.org ? [p.org] : []),
    ...(p.role ? [p.role] : []),
    ...(p.period ? [p.period] : []),
    ...p.highlights,
    ...p.stack,
  ]),
  ...visibleJobs.flatMap((j) => [j.org, j.role, j.period, ...(j.location ? [j.location] : []), ...j.highlights]),
  ...data.skills.flatMap((g) => [g.group, ...g.items]),
  ...data.education.flatMap((e) => [e.school, e.degree, e.period, ...(e.shortName ? [e.shortName] : [])]),
  ...data.awards.flatMap((a) => [a.title, ...(a.detail ? [a.detail] : [])]),
];
const missing = facts.filter((f) => !text.includes(squash(f)));
check(missing.length === 0, `all ${facts.length} visible fact strings render${missing.length ? `; missing: ${missing.map((m) => JSON.stringify(m)).join(", ")}` : ""}`);

// 4. Nothing hidden or private leaks.
for (const job of data.experience.filter((j) => j.hidden)) {
  check(!raw.includes(job.org), `hidden entry "${job.org}" absent`);
}
check(!/_todo|TODO\(/.test(raw), "no _todo or TODO( text");

// 5. Section ids.
for (const id of ["work-section", "experience-section", "engineering-section", "about-section", "writing-section", "contact-section"]) {
  check(new RegExp(`id="${id}"`).test(body), `section #${id} exists`);
}

// 6. Every digit run in visible text is a fact or an allowlisted label.
const skillCount = data.skills.reduce((n, g) => n + g.items.length, 0);
const factText = JSON.stringify({ ...data, _todo: undefined, experience: visibleJobs });
const postText = fs
  .readdirSync(path.join(root, "_posts"))
  .filter((f) => f.endsWith(".md"))
  .map((f) => {
    const { data: fm } = matter(fs.readFileSync(path.join(root, "_posts", f), "utf8"));
    const d = new Date(fm.date);
    const pretty = Number.isNaN(d.getTime())
      ? ""
      : new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(d);
    return [fm.title, fm.tagline, fm.preview, pretty].join(" ");
  })
  .join(" ");
const levelCount = visibleJobs.length;
const allow = new Set([
  ...["00", "01", "02", "03", "04", "05", "06"],
  ...Array.from({ length: levelCount }, (_, i) => String(i + 1)),
  ...Array.from({ length: 9 }, (_, i) => `0${i + 1}`),
  String(skillCount),
]);
const strays = [...new Set((text.match(/\d+/g) || []).filter((run) => !allow.has(run) && !factText.includes(run) && !postText.includes(run)))];
check(strays.length === 0, `no invented numbers${strays.length ? `; unexplained: ${strays.join(", ")}` : ""}`);

// 7. Teleop cell and station switches: the poster is SSR, the game is not.
check(!/<canvas[\s>]/i.test(raw), "no <canvas> in SSR HTML (the game is client-only)");
check(/data-cell-poster[^>]*>[\s\S]*?<path /.test(raw), "cell poster SVG is server-rendered with paths");
const skipAt = body.indexOf('href="#cell-after"');
const takeAt = body.search(/<button[^>]*>\s*<span>Take control<\/span>/i);
check(skipAt > 0 && /Skip teleop/.test(body.slice(skipAt, skipAt + 200)), '"Skip teleop" link present');
check(takeAt > skipAt && skipAt > 0, "TAKE CONTROL button present, after the skip link");
check(/id="cell-after"/.test(body), "skip target #cell-after exists");
check(/<button[^>]*class="[^"]*estop[^"]*"[^>]*aria-pressed="false"/.test(header), "header has the E-STOP toggle (aria-pressed)");
check(/class="track"[^>]*aria-hidden="true"/.test(header), "AB-01 track is in the header and aria-hidden");

for (const p of passes) console.log(`  ok   ${p}`);
for (const f of failures) console.error(`  FAIL ${f}`);
if (failures.length) {
  console.error(`check:ssr: ${failures.length} failure(s) in ${path.relative(root, htmlFile)}`);
  process.exit(1);
}
console.log(`check:ssr: ok (${passes.length} assertions)`);
