// The SSR "CELL VIEW": a static pixel render of the teleop workcell. It is
// decorative (aria-hidden); every label it draws already exists as HTML in
// the Inventory. WS2 swaps it for the live canvas on TAKE CONTROL inside the
// same 16:9 box, so the swap causes no layout shift.
import { Raster } from "../../lib/pixel/raster";
import { fillFor, rowsToPaths, type PixelPath } from "../../lib/pixel/toPaths";
import { CELL_H, CELL_W, CONVEYOR_Y, drawArm, drawBlock, drawStatic, posterBlocks, solveIK } from "../../lib/teleop/scene";

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
  // Operator station: AB-01 at its console, watching the arm.
  r.rect(63, 95, 22, 24, "o");
  r.rect(64, 96, 20, 22, "s");
  r.rect(66, 98, 16, 8, "k");
  r.rect(67, 101, 3, 1, "t");
  r.rect(71, 100, 3, 2, "t");
  r.rect(75, 102, 5, 1, "t");
  r.rect(66, 109, 4, 2, "g");
  r.rect(72, 109, 4, 2, "a");
  r.rect(78, 109, 4, 2, "r");
  r.sprite("ab01", 28, 71, 0, false, 2);
  const ik = solveIK(target.x, target.y, true);
  if (ik) drawArm(r, ik.q1, ik.q2, false);
  cached = rowsToPaths(r.rows());
  return cached;
}

export interface CellPosterProps {
  className?: string;
}

const CellPoster = ({ className = "" }: CellPosterProps) => {
  const paths = posterPaths();
  return (
    <svg
      viewBox={`0 0 ${CELL_W} ${CELL_H}`}
      shapeRendering="crispEdges"
      className={`cell-poster ${className}`}
      aria-hidden="true"
      focusable="false"
      data-cell-poster=""
    >
      <rect width={CELL_W} height={CELL_H} style={{ fill: "var(--ink)" }} />
      {paths.map((p) => (
        <path key={p.key} d={p.d} style={{ fill: fillFor(p.key) }} />
      ))}
    </svg>
  );
};

export default CellPoster;
