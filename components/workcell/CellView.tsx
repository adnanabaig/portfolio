// The hero CELL VIEW: a powered CRT showing a static pixel render of Station
// AB-01's workcell (lib/workcell/scene). Nothing in it is interactive, and
// the whole frame is decorative (aria-hidden): it says nothing the page does
// not already say.
//
// The scene code (raster, sprites, bitmap font) is server only on first
// load: the browser keeps the server markup through hydration (see
// hooks/useServerMarkup) and imports the scene only for a fresh mount.
import { useRef } from "react";
import { useServerMarkup } from "../../hooks/useServerMarkup";
import { VIEW_H, VIEW_W } from "../../lib/workcell/dims";
import Led from "../pixel/Led";

type Scene = typeof import("../../lib/workcell/scene");

// The browser build drops this branch (`typeof window` is a compile-time constant).
const serverScene: Scene | null = typeof window === "undefined" ? require("../../lib/workcell/scene") : null;
const loadMarkup = () => import("../../lib/workcell/scene").then((m) => m.sceneMarkup());

const CellView = () => {
  const ref = useRef<SVGSVGElement | null>(null);
  const markup = useServerMarkup(ref, serverScene ? serverScene.sceneMarkup() : null, loadMarkup);
  return (
    <div className="px-frame px-frame--crt cell" data-marker="cell" aria-hidden="true">
      <div className="px-titlebar">
        <span className="px-titlebar__label">CELL VIEW / AB-01</span>
        <span className="px-titlebar__right">
          <Led color="leaf" />
          <span>CAM 01</span>
        </span>
      </div>
      <div className="crt-screen">
        <svg
          ref={ref}
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          shapeRendering="crispEdges"
          className="cell__art"
          aria-hidden="true"
          focusable="false"
          data-cell-art=""
          dangerouslySetInnerHTML={{ __html: markup ?? "" }}
          suppressHydrationWarning
        />
      </div>
    </div>
  );
};

export default CellView;
