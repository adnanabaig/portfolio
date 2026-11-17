// Draws the static CELL VIEW poster: the workcell scene composed in a Raster,
// then converted to SVG paths. Server only on first load (CellPoster keeps
// the server markup through hydration); the browser imports it only when the
// poster mounts fresh, such as after a client-side navigation.
import { fillFor } from "../../lib/pixel/spriteData";
import { Raster } from "../../lib/pixel/raster";
import { pathsMarkup, rowsToPaths, type PixelPath } from "../../lib/pixel/toPaths";
import { CELL_H, CELL_W, CONVEYOR_Y, drawArm, drawBlock, drawOperatorStation, drawStatic, posterBlocks, solveIK } from "../../lib/teleop/scene";

const BLOCK_X = [14, 86, 178, 262];

let cached: PixelPath[] | null = null;

export function posterPaths(): PixelPath[] {
  if (cached) return cached;
  const r = new Raster(CELL_W, CELL_H);
  drawStatic(r);
  const blocks = posterBlocks();
  let target = { x: 200, y: 27 };
  blocks.forEach((b, i) => {
    const w = drawBlock(r, b.label, BLOCK_X[i] ?? 14 + i * 76, CONVEYOR_Y + 3, b.group);
    // The gripper hovers just under this block (the belt's lower edge is
    // CONVEYOR_Y + 18), so neither the gripper nor the forearm covers a label.
    if (i === 2) target = { x: (BLOCK_X[i] ?? 0) + Math.round(w / 2), y: CONVEYOR_Y + 26 };
  });
  drawOperatorStation(r);
  const ik = solveIK(target.x, target.y, true);
  if (ik) drawArm(r, ik.q1, ik.q2, false);
  cached = rowsToPaths(r.rows());
  return cached;
}

let markup: string | null = null;

/** Inner SVG markup of the poster: an ink backdrop plus one path per color. */
export function posterMarkup(): string {
  if (markup === null) {
    markup = `<rect width="${CELL_W}" height="${CELL_H}" style="fill:var(--ink)"></rect>${pathsMarkup(posterPaths(), fillFor)}`;
  }
  return markup;
}
