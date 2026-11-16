// OPS console guard (chained into `npm run check:copy`).
// Compiles components/ops/commands.ts with the repo's TypeScript, then runs
// every command in node against a stub context and checks:
// - every command listed by `help` has a handler and runs without throwing
// - all output passes the copy rules (no em dash, emoji, internal terms)
// - every number printed is a fact from data/portfolio.json (or a level),
//   unless the line labels it as the visitor's own (your run, your link,
//   your clock, SIM, this browser)
// - the eggs say exactly what they should, and make no availability claim
// - `open operator-hmi` targets the operator-hmi card
import fs from "fs";
import os from "os";
import path from "path";
import { execFileSync } from "child_process";
import { createRequire } from "module";
import { fileURLToPath } from "url";
import { copyProblems } from "./copy-rules.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ops-check-"));
const problems = [];
const fail = (msg) => problems.push(msg);

try {
  execFileSync(
    path.join(root, "node_modules/.bin/tsc"),
    [
      "--outDir", tmp,
      "--rootDir", root,
      "--module", "commonjs",
      "--target", "es2020",
      "--moduleResolution", "node",
      "--resolveJsonModule",
      "--esModuleInterop",
      "--skipLibCheck",
      "--strict",
      "--types", "node",
      path.join(root, "components/ops/commands.ts"),
    ],
    { stdio: "inherit" }
  );
  const req = createRequire(path.join(tmp, "index.js"));
  const ops = req(path.join(tmp, "components/ops/commands.js"));
  const data = JSON.parse(fs.readFileSync(path.join(root, "data/portfolio.json"), "utf8"));
  const visibleJobs = data.experience.filter((j) => !j.hidden);
  const factText = JSON.stringify({ ...data, _todo: undefined, experience: visibleJobs });
  const levels = new Set(visibleJobs.map((_, i) => String(i + 1)));
  // Derived facts (lib/facts.ts) are allowed; they are computed from the data.
  const facts = req(path.join(tmp, "lib/facts.js"));
  const derived = new Set(
    [facts.skillCount, facts.robotPrograms, facts.automatedTests, facts.issuesResolved, facts.nclRank, facts.acmPlace, facts.graduated]
      .flatMap((v) => String(v).match(/\d+/g) || [])
  );
  // Site rules, not claims: the 404 page's name and the Night shift window.
  const RULES = new Set(["404", "22", "00", "05"]);
  const OWN = /your run|your link|your clock|\bSIM\b|this browser/i;

  const calls = [];
  const makeCtx = (out) => ({
    latched: false,
    print: (text, kind = "out") => out.push({ text, kind }),
    link: (text, href) => out.push({ text, kind: "out", href }),
    clear: () => out.push({ text: "<clear>", kind: "dim" }),
    close: () => calls.push(["close"]),
    history: () => ["help", "projects"],
    open: (url) => calls.push(["open", url]),
    navigate: (p) => calls.push(["navigate", p]),
    copy: async () => true,
    focusCard: (id) => (calls.push(["focusCard", id]), true),
    focusSection: (id) => (calls.push(["focusSection", id]), true),
    takeControl: () => (calls.push(["takeControl"]), true),
    cellLive: () => true,
    setLatency: (ms) => calls.push(["setLatency", ms]),
    ping: async () => 42.4,
    soundOn: () => false,
    setSound: (on) => calls.push(["setSound", on]),
    showKeys: () => calls.push(["showKeys"]),
  });

  const runLine = async (line, ctx = makeCtx([])) => {
    const out = [];
    Object.assign(ctx, { print: makeCtx(out).print, link: makeCtx(out).link });
    calls.length = 0;
    let result;
    try {
      result = await ops.run(line, ctx);
    } catch (e) {
      fail(`"${line}" threw: ${e.message}`);
    }
    return { out, result, calls: calls.slice(), ctx };
  };

  const SAMPLE_ARGS = {
    open: "operator-hmi",
    latency: "120",
    theme: "amber",
    sound: "on",
    crt: "off",
    sudo: "hire adnan",
    rm: "-rf /",
  };

  // 1. help lists every visible command, and each one runs.
  const help = await runLine("help");
  const helpText = help.out.map((l) => l.text).join("\n");
  const all = ops.allCommands();
  for (const cmd of all) {
    if (typeof cmd.run !== "function") fail(`command "${cmd.name}" has no handler`);
    if (!cmd.secret && !helpText.includes(cmd.name)) fail(`help does not list "${cmd.name}"`);
    if (!cmd.secret && !cmd.help) fail(`command "${cmd.name}" has no help text`);
  }
  for (const name of ops.commandNames()) if (!all.some((c) => c.name === name || (c.aliases || []).includes(name))) fail(`help lists "${name}" with no handler`);

  // 2. Run everything (plus a few bad inputs) and check every line.
  const lines = [...all.map((c) => `${c.name} ${SAMPLE_ARGS[c.name] ?? ""}`.trim()), "open nope", "latency 999", "theme", "sudo make sandwich", "frobnicate"];
  let printed = 0;
  for (const line of lines) {
    const { out } = await runLine(line);
    for (const l of out) {
      printed++;
      for (const p of copyProblems(l.text)) fail(`"${line}" printed ${p}: ${JSON.stringify(l.text)}`);
      if (/TODO|_todo/.test(l.text)) fail(`"${line}" printed a TODO`);
      if (data.experience.some((j) => j.hidden && l.text.includes(j.org))) fail(`"${line}" printed a hidden entry`);
      if (/\b(available|open to work|hiring me|for hire)\b/i.test(l.text)) fail(`"${line}" makes an availability claim: ${JSON.stringify(l.text)}`);
      if (OWN.test(l.text) || l.text === "<clear>") continue;
      const strays = (l.text.match(/\d+/g) || []).filter((n) => !factText.includes(n) && !levels.has(n) && !derived.has(n) && !RULES.has(n));
      if (strays.length) fail(`"${line}" printed numbers not in portfolio.json: ${strays.join(", ")} in ${JSON.stringify(l.text)}`);
    }
  }

  // 3. Specific contracts.
  const open = await runLine("open operator-hmi");
  if (!open.calls.some(([k, id]) => k === "focusCard" && id === "operator-hmi")) fail("open operator-hmi did not target the operator-hmi card");

  const hire = await runLine("sudo hire adnan");
  if (!hire.out.some((l) => l.text === "Access granted. Opening a channel.")) fail("sudo hire adnan: wrong reply");
  if (!hire.calls.some(([k, id]) => k === "focusSection" && id === "contact-section")) fail("sudo hire adnan: does not focus #contact-section");
  if (!hire.out.some((l) => /email/i.test(l.text))) fail("sudo hire adnan: does not offer the email");

  const ctx = makeCtx([]);
  const rm = await runLine("rm -rf /", ctx);
  if (!rm.out.some((l) => l.text === "Fail-closed. Request denied and latched. Type clear to resume.")) fail("rm -rf /: wrong reply");
  if (!ctx.latched) fail("rm -rf /: console not latched");
  const after = await runLine("whoami", ctx);
  if (after.result !== "deny") fail("latched console still ran a command");
  await runLine("clear", ctx);
  if (ctx.latched) fail("clear did not release the latch");

  const ping = await runLine("ping");
  if (!ping.out.some((l) => /your link/.test(l.text))) fail("ping: RTT not labeled 'your link'");

  const lat = await runLine("latency 120");
  if (!lat.calls.some(([k, ms]) => k === "setLatency" && ms === 120)) fail("latency 120 did not reach the cell");

  // 4. Completion.
  const c1 = ops.complete("pro");
  if (c1.value !== "projects ") fail(`complete("pro") gave ${JSON.stringify(c1.value)}`);
  const c2 = ops.complete("open op");
  if (c2.value !== "open operator-hmi ") fail(`complete("open op") gave ${JSON.stringify(c2.value)}`);

  if (problems.length) {
    console.error(`check-ops found ${problems.length} problem(s):`);
    for (const p of problems) console.error(`  ${p}`);
    process.exitCode = 1;
  } else {
    console.log(`check-ops: ok (${all.length} commands, ${printed} lines checked)`);
  }
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
