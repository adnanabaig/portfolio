// The SSR "CELL VIEW": a static pixel render of the teleop workcell. It is
// decorative (aria-hidden); every label it draws already exists as HTML in
// the Inventory. The live canvas covers it on TAKE CONTROL inside the same
// 16:9 box, so the swap causes no layout shift.
//
// The scene code (raster, scene, IK, bitmap font) is server only on first
// load: the browser keeps the server markup through hydration (see
// hooks/useServerMarkup) and imports ./posterArt only for a fresh mount.
import { useRef } from "react";
import { useServerMarkup } from "../../hooks/useServerMarkup";
import { CELL_H, CELL_W } from "../../lib/teleop/dims";

type PosterArt = typeof import("./posterArt");

// The browser build drops this branch (`typeof window` is a compile-time constant).
const serverArt: PosterArt | null = typeof window === "undefined" ? require("./posterArt") : null;
const loadMarkup = () => import("./posterArt").then((m) => m.posterMarkup());

export interface CellPosterProps {
  className?: string;
}

const CellPoster = ({ className = "" }: CellPosterProps) => {
  const ref = useRef<SVGSVGElement | null>(null);
  const markup = useServerMarkup(ref, serverArt ? serverArt.posterMarkup() : null, loadMarkup);
  return (
    <svg
      ref={ref}
      viewBox={`0 0 ${CELL_W} ${CELL_H}`}
      shapeRendering="crispEdges"
      className={`cell-poster ${className}`}
      aria-hidden="true"
      focusable="false"
      data-cell-poster=""
      dangerouslySetInnerHTML={{ __html: markup ?? "" }}
      suppressHydrationWarning
    />
  );
};

export default CellPoster;
