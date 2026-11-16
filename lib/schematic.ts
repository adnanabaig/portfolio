// Draws a project's system sketch (data/schematics.json) as pixel SVG markup.
// Runs at build time only (getStaticProps), so neither this module nor the
// bitmap font reaches the browser. Labels are drawn with lib/pixel/font.json,
// boxes and wires snap to a 2-unit grid, and colors come from CSS classes so
// the themes recolor the sketch.
//
// Two layouts: "wide" puts the flow left to right on a 4 x 2 grid; "narrow"
// (phones) transposes it so the flow runs top to bottom on a 2 x 4 grid and
// the labels stay readable.
import font from "./pixel/font.json";
import { rowsToPaths } from "./pixel/toPaths";
import type { Schematic, SchematicEdge, SchematicNode } from "../types/portfolio";

export type SketchLayout = "wide" | "narrow";

const G = 2; // units per font pixel
const ADV = font.advance * G;
const GLYPH_H = font.h * G;
const LINE = GLYPH_H + 6;
const PAD = 16;
export const MAX_LABEL = 13;
const BOX_W = MAX_LABEL * ADV - G + PAD * 2 + 2; // 188, even so centers land on the grid
const BOX_H = GLYPH_H * 2 + 6 + 26; // 60
const GAP_FLOW = 64; // room for the elbow and the arrowhead
const GAP_CROSS = 40;
const MARGIN = 16;
const WIRE = 4;
const ARROW = 8;

const glyphs = font.glyphs as Record<string, string[]>;

/** True when the bitmap font can draw every character of the label. */
export function drawable(text: string) {
  return [...text.toUpperCase()].every((ch) => ch === " " || Boolean(glyphs[ch]));
}

function textRows(text: string): string[] {
  const rows = Array.from({ length: font.h }, () => "");
  [...text.toUpperCase()].forEach((ch, i) => {
    const g = glyphs[ch] ?? Array.from({ length: font.h }, () => ".".repeat(font.w));
    for (let y = 0; y < font.h; y++) rows[y] += (i ? "." : "") + g[y].replace(/#/g, "w");
  });
  return rows;
}

function textMarkup(text: string, cx: number, top: number) {
  const width = text.length * ADV - G;
  const x = Math.round((cx - width / 2) / 2) * 2;
  const d = rowsToPaths(textRows(text))
    .map((p) => p.d)
    .join("");
  return `<path class="sk-text" transform="translate(${x} ${top}) scale(${G})" d="${d}"></path>`;
}

/** A box with stepped corners: outer fill is the border, inner fill is the panel. */
function notched(x: number, y: number, w: number, h: number, n: number) {
  return `M${x + n} ${y}h${w - 2 * n}v${n}h${n}v${h - 2 * n}h${-n}v${n}h${-(w - 2 * n)}v${-n}h${-n}v${-(h - 2 * n)}h${n}z`;
}

interface Cell {
  x: number;
  y: number;
}

function place(node: SchematicNode, layout: SketchLayout): Cell {
  const flow = node.col;
  const cross = node.row;
  if (layout === "wide") {
    return { x: MARGIN + flow * (BOX_W + GAP_FLOW), y: MARGIN + cross * (BOX_H + GAP_CROSS) };
  }
  return { x: MARGIN + cross * (BOX_W + GAP_CROSS), y: MARGIN + flow * (BOX_H + GAP_FLOW) };
}

/** Stepped arrowhead pointing +x with its tip at the origin, 2-unit pixels. */
const ARROW_D = "M-2 -1h2v2h-2zM-4 -3h2v6h-2zM-6 -5h2v10h-2zM-8 -7h2v14h-2z";

function wire(edge: SchematicEdge, from: SchematicNode, to: SchematicNode, layout: SketchLayout) {
  const a = place(from, layout);
  const b = place(to, layout);
  const wide = layout === "wide";
  // Flow axis: x when wide, y when narrow. Cross axis is the other one.
  const df = to.col - from.col;
  const dc = to.row - from.row;
  const pts: [number, number][] = [];
  let angle: number;
  const cxA = a.x + BOX_W / 2;
  const cyA = a.y + BOX_H / 2;
  const cxB = b.x + BOX_W / 2;
  const cyB = b.y + BOX_H / 2;
  if (df > 0) {
    // A turn leaves and enters off-center, on the side it turns toward, so it
    // never shares a run with a straight wire on the same face.
    const s = Math.sign(dc);
    if (wide) {
      const elbow = b.x - GAP_FLOW / 2;
      const off = s * 14;
      pts.push([a.x + BOX_W, cyA + off], [elbow, cyA + off], [elbow, cyB - off], [b.x, cyB - off]);
      angle = 0;
    } else {
      const elbow = b.y - GAP_FLOW / 2;
      const off = s * 40;
      pts.push([cxA + off, a.y + BOX_H], [cxA + off, elbow], [cxB - off, elbow], [cxB - off, b.y]);
      angle = 90;
    }
  } else {
    // Same flow step: a straight hop across the cross axis.
    const down = dc > 0;
    if (wide) {
      pts.push([cxA, down ? a.y + BOX_H : a.y], [cxB, down ? b.y : b.y + BOX_H]);
      angle = down ? 90 : -90;
    } else {
      pts.push([down ? a.x + BOX_W : a.x, cyA], [down ? b.x : b.x + BOX_W, cyB]);
      angle = down ? 0 : 180;
    }
  }
  const kind = edge.kind ?? "flow";
  const arrow = kind !== "link";
  // Stop the wire where the arrowhead begins, so the tip meets the box.
  const tip = pts[pts.length - 1];
  const prev = pts[pts.length - 2];
  if (arrow) {
    const len = Math.hypot(tip[0] - prev[0], tip[1] - prev[1]) || 1;
    pts[pts.length - 1] = [tip[0] - ((tip[0] - prev[0]) / len) * (ARROW - 2), tip[1] - ((tip[1] - prev[1]) / len) * (ARROW - 2)];
  }
  const d = pts.map(([x, y], i) => `${i ? "L" : "M"}${x} ${y}`).join("");
  const head = arrow ? `<path class="sk-head sk-head--${kind}" transform="translate(${tip[0]} ${tip[1]}) rotate(${angle})" d="${ARROW_D}"></path>` : "";
  return `<path class="sk-wire sk-wire--${kind}" d="${d}" stroke-width="${WIRE}"></path>${head}`;
}

function box(node: SchematicNode, layout: SketchLayout) {
  const { x, y } = place(node, layout);
  const lines = node.label;
  const top = y + Math.round((BOX_H - (lines.length * LINE - 6)) / 2);
  return [
    `<path class="sk-shadow" d="${notched(x + 4, y + 4, BOX_W, BOX_H, 4)}"></path>`,
    `<path class="sk-box sk-box--${node.kind}" d="${notched(x, y, BOX_W, BOX_H, 4)}"></path>`,
    `<path class="sk-fill" d="${notched(x + 2, y + 2, BOX_W - 4, BOX_H - 4, 2)}"></path>`,
    `<path class="sk-pin sk-box--${node.kind}" d="M${x + 6} ${y + 6}h6v6h-6z"></path>`,
    ...lines.map((line, i) => textMarkup(line, x + BOX_W / 2, top + i * LINE)),
  ].join("");
}

/** SVG markup (outer element included) for one layout of a sketch. */
export function renderSchematic(spec: Schematic, layout: SketchLayout, idSuffix: string): { svg: string; w: number; h: number } {
  const flowSteps = Math.max(...spec.nodes.map((n) => n.col)) + 1;
  const crossSteps = Math.max(...spec.nodes.map((n) => n.row)) + 1;
  const flowLen = flowSteps * BOX_W + (flowSteps - 1) * GAP_FLOW;
  const crossLen = crossSteps * BOX_H + (crossSteps - 1) * GAP_CROSS;
  const crossLenNarrow = crossSteps * BOX_W + (crossSteps - 1) * GAP_CROSS;
  const flowLenNarrow = flowSteps * BOX_H + (flowSteps - 1) * GAP_FLOW;
  const w = MARGIN * 2 + 4 + (layout === "wide" ? flowLen : crossLenNarrow);
  const h = MARGIN * 2 + 4 + (layout === "wide" ? crossLen : flowLenNarrow);
  const byId = new Map(spec.nodes.map((n) => [n.id, n]));
  const pattern = `sk-dots-${idSuffix}-${layout}`;
  // Wires draw over the boxes (so arrowheads clear the drop shadows), and
  // gates draw last so a shared entry point shows the gate color.
  const wires = [...spec.edges]
    .sort((a, b) => Number(a.kind === "gate") - Number(b.kind === "gate"))
    .map((e) => {
      const from = byId.get(e.from);
      const to = byId.get(e.to);
      return from && to ? wire(e, from, to, layout) : "";
    })
    .join("");
  const boxes = spec.nodes.map((n) => box(n, layout)).join("");
  const svg =
    `<svg class="sketch__svg sketch__svg--${layout}" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" shape-rendering="crispEdges" aria-hidden="true" focusable="false">` +
    `<defs><pattern id="${pattern}" width="16" height="16" patternUnits="userSpaceOnUse"><path class="sk-dot" d="M0 0h2v2h-2z"></path></pattern></defs>` +
    `<rect width="${w}" height="${h}" fill="url(#${pattern})"></rect>` +
    boxes +
    wires +
    `</svg>`;
  return { svg, w, h };
}
