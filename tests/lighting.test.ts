// The lighting layer (see "Lighting" in CLAUDE.md): AA contrast on every lit
// surface at full light, the lights-off resets for mono, Text Mode, and
// print, the motion gate on every animation, and the token mirror.
import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { contrast, LIGHTING, litSurfaces } from "../lib/pixel/tokens";

const css = fs.readFileSync(path.join(__dirname, "../styles/globals.css"), "utf8");

interface Rule {
  selectors: string[];
  body: string;
  /** Enclosing at-rule preludes, outermost first ("@media print", "@supports (...)"). */
  at: string[];
}

/** A small brace walker: enough for globals.css (no strings with braces in selectors). */
function parse(source: string): Rule[] {
  const text = source.replace(/\/\*[\s\S]*?\*\//g, "");
  const rules: Rule[] = [];
  const stack: string[] = [];
  let i = 0;
  let start = 0;
  while (i < text.length) {
    const ch = text[i];
    if (ch === "{") {
      const prelude = text.slice(start, i).trim();
      if (prelude.startsWith("@")) {
        stack.push(prelude);
        start = i + 1;
      } else {
        let depth = 1;
        let j = i + 1;
        while (j < text.length && depth) {
          if (text[j] === "{") depth++;
          else if (text[j] === "}") depth--;
          j++;
        }
        rules.push({
          selectors: prelude.split(",").map((s) => s.trim().replace(/\s+/g, " ")),
          body: text.slice(i + 1, j - 1),
          at: [...stack],
        });
        i = j;
        start = j;
        continue;
      }
    } else if (ch === "}") {
      stack.pop();
      start = i + 1;
    }
    i++;
  }
  return rules;
}

const rules = parse(css);
const inPrint = (r: Rule) => r.at.some((a) => /^@media print/.test(a));
const selectorsWhere = (pred: (r: Rule) => boolean) => new Set(rules.filter(pred).flatMap((r) => r.selectors));

describe("lit surfaces hold AA at full light", () => {
  for (const surface of litSurfaces) {
    it(`${surface.name} (${surface.hex})`, () => {
      for (const t of surface.text) {
        const ratio = contrast(t.hex, surface.hex);
        expect(ratio, `${t.name} on ${surface.name}: ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
      }
    });
  }

  it("covers every accent wash, the title bar, the palette row, the hero light, and the LIVE pill", () => {
    const names = litSurfaces.map((s) => s.name).join(" | ");
    for (const part of ["Frame face, leaf", "Title bar top", "Palette row, teal", "Hero light", "LIVE pill", "amber theme", "Dossier plate"]) {
      expect(names).toContain(part);
    }
  });
});

describe("command palette active row", () => {
  // The palette's selected row is panel-hi + 10% teal (amber in the amber theme). Its
  // meta line (mist) and title (paper) keep a margin over AA, not just 4.5:1.
  const row = (name: string) => litSurfaces.find((s) => s.name === name)!;
  for (const [surface, mist, paper] of [
    ["Palette row, teal", "--mist", "--paper"],
    ["Palette row, amber theme", "--mist (amber)", "--paper (amber)"],
  ]) {
    it(`${surface}: mist at least 5.2:1, paper at least 9.7:1`, () => {
      const s = row(surface);
      const ratio = (n: string) => contrast(s.text.find((t) => t.name === n)!.hex, s.hex);
      expect(ratio(mist)).toBeGreaterThanOrEqual(5.2);
      expect(ratio(paper)).toBeGreaterThanOrEqual(9.7);
    });
  }
  it("the CSS mixes --row-mix of teal into --panel-hi for the selected row", () => {
    expect(css).toMatch(/\.palette__row\[aria-selected="true"\] \{\s*background: color-mix\(in srgb, var\(--teal\) var\(--row-mix\), var\(--panel-hi\)\);/);
  });
});

describe("lights off: mono, Text Mode, and print reset every decorative light", () => {
  // Every new light layer that --lit cannot zero on its own (pseudo-element
  // lights, gradients, glows, border-image, grain). Each must be reset in
  // all three lists.
  const DECOR = [
    ".statusbar::after",
    ".statusbar",
    ".hero::before",
    ".cell .crt-screen::before",
    ".cell .crt-screen",
    ".px-frame::before",
    ".px-frame::after",
    ".telemetry__item::after",
    ".telemetry__item",
    ".px-titlebar",
    ".px-btn::before",
    ".px-btn--secondary",
    ".eyebrow::after",
    ".hairline",
    ".card__links::before",
    ".chip--live",
    ".chip--part",
    ".chip--skill",
    ".dither",
    ".led",
    ".telemetry__gauge i",
    ".telemetry__value",
    ".lost__level::before",
  ];
  const plain = selectorsWhere((r) => !inPrint(r));
  const print = selectorsWhere(inPrint);

  for (const sel of DECOR) {
    it(sel, () => {
      expect(plain.has(`html[data-plain] ${sel}`), `html[data-plain] ${sel}`).toBe(true);
      expect(plain.has(`html[data-theme="mono"] ${sel}`), `html[data-theme="mono"] ${sel}`).toBe(true);
      expect(print.has(sel), `@media print ${sel}`).toBe(true);
    });
  }

  it("--lit, --grain, and --titlebar-top go dark in all three", () => {
    const off = rules.filter((r) => /--lit:\s*0/.test(r.body));
    const where = off.map((r) => `${inPrint(r) ? "print " : ""}${r.selectors.join(",")}`).join(" | ");
    expect(where).toContain('html[data-theme="mono"]');
    expect(where).toContain("html[data-plain]");
    expect(where).toContain("print :root");
    for (const r of off) {
      expect(r.body).toMatch(/--grain:\s*none/);
      expect(r.body).toMatch(/--titlebar-top:\s*var\(--panel-hi\)/);
    }
  });
});

describe("motion gate", () => {
  it("every CSS animation sits under .motion-ok", () => {
    const animated = rules.filter((r) => /(^|;)\s*animation\s*:(?!\s*none)/.test(r.body));
    expect(animated.length).toBeGreaterThan(0);
    for (const r of animated) {
      for (const sel of r.selectors) expect(sel, sel).toMatch(/(^|\s|html)\.motion-ok\b/);
    }
  });

  it("no backdrop-filter, no blur filter, no blur radius over 60px", () => {
    expect(css).not.toMatch(/backdrop-filter/);
    expect(css).not.toMatch(/filter:\s*blur/);
    for (const m of css.matchAll(/(?:box-shadow|--depth(?:-lg)?|--bloom(?:-half)?):[^;]*/g)) {
      for (const shadow of m[0].replace(/^[^:]+:/, "").split(/,(?![^(]*\))/)) {
        const lengths = [...shadow.matchAll(/(-?\d+(?:\.\d+)?)px/g)].map((x) => Number(x[1]));
        // offset-x offset-y blur spread: the third length is the blur radius.
        if (lengths.length >= 3) expect(lengths[2], shadow.trim()).toBeLessThanOrEqual(60);
      }
    }
  });
});

describe("token mirror", () => {
  const root = rules.find((r) => r.selectors.includes(":root") && r.at.length === 0 && /--lit:\s*1/.test(r.body))!;
  const derived = rules.find((r) => r.selectors.includes("[data-lit]"))!;
  const value = (body: string, name: string) => body.match(new RegExp(`${name}:\\s*([^;]+);`))?.[1].trim();

  it("caps in tokens.ts match globals.css", () => {
    expect(value(root.body, "--wash-max")).toBe(`${LIGHTING.washMax * 100}%`);
    expect(value(root.body, "--row-mix")).toBe(`${LIGHTING.rowMix * 100}%`);
    expect(value(root.body, "--titlebar-top")?.toUpperCase()).toBe(LIGHTING.titlebarTop);
    expect(value(derived.body, "--hi")).toContain(`calc(${LIGHTING.hi} * var(--lit))`);
    expect(value(derived.body, "--edge")).toContain(`calc(${LIGHTING.edge} * var(--lit))`);
  });

  it("the plate key in CSS is the one measured", () => {
    expect(css).toContain(`calc(${LIGHTING.plateKey * 100}% * var(--lit))`);
  });

  it("grain.png is under 2 kB", () => {
    expect(fs.statSync(path.join(__dirname, "../public/tex/grain.png")).size).toBeLessThan(2048);
  });
});
