// Keycaps: <Kbd keys={["mod", "K"]} />. "mod" is Cmd on Apple devices and
// Ctrl elsewhere. Both labels render on the server and share one grid cell;
// html[data-os="mac"] (set before paint by pages/_document) picks which one
// is visible, so there is no hydration mismatch and the cap is the same
// width on every platform. Glyph keys are 7x7 pixel SVGs (crispEdges) with
// a screen-reader name.

export type KeyName = "mod" | "up" | "down" | "enter" | string;

// 7x7 glyphs as rows ("#" on). Original art: a looped command key, two arrows, and a return arrow.
const GLYPHS = {
  cmd: [".#...#.", "#.#.#.#", ".#####.", "..#.#..", ".#####.", "#.#.#.#", ".#...#."],
  up: ["...#...", "..###..", ".#####.", "...#...", "...#...", "...#...", "...#..."],
  down: ["...#...", "...#...", "...#...", "...#...", ".#####.", "..###..", "...#..."],
  enter: ["......#", "......#", "..#...#", ".##...#", "#######", ".##....", "..#...."],
};

/** Horizontal runs of "#" as one path. */
function runs(rows: string[]) {
  let d = "";
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      if (row[x] !== "#") continue;
      let w = 1;
      while (row[x + w] === "#") w++;
      d += `M${x} ${y}h${w}v1h-${w}z`;
      x += w - 1;
    }
  });
  return d;
}

const PATHS = Object.fromEntries(Object.entries(GLYPHS).map(([k, rows]) => [k, runs(rows)])) as Record<keyof typeof GLYPHS, string>;

export const Glyph = ({ name }: { name: keyof typeof GLYPHS }) => (
  <svg className="kbd__glyph" width="14" height="14" viewBox="0 0 7 7" shapeRendering="crispEdges" aria-hidden="true" focusable="false">
    <path d={PATHS[name]} fill="currentColor" />
  </svg>
);

function Cap({ k }: { k: KeyName }) {
  if (k === "mod") {
    return (
      <kbd className="kbd__key kbd__mod">
        <span className="kbd__mac">
          <Glyph name="cmd" />
          <span className="sr-only">Cmd</span>
        </span>
        <span className="kbd__pc">Ctrl</span>
      </kbd>
    );
  }
  if (k === "up" || k === "down" || k === "enter") {
    return (
      <kbd className="kbd__key">
        <Glyph name={k} />
        <span className="sr-only">{k === "enter" ? "Enter" : k === "up" ? "Up" : "Down"}</span>
      </kbd>
    );
  }
  return <kbd className="kbd__key">{k}</kbd>;
}

export default function Kbd({ keys, className = "" }: { keys: KeyName[]; className?: string }) {
  return (
    <kbd className={`kbd ${className}`}>
      {keys.map((k, i) => (
        <Cap key={`${k}${i}`} k={k} />
      ))}
    </kbd>
  );
}
