// Keycaps: <Kbd keys={["mod", "K"]} />. "mod" is Cmd on Apple devices and
// Ctrl elsewhere. Both labels render on the server and share one grid cell;
// html[data-os="mac"] (set before paint by pages/_document) picks which one
// is visible, so there is no hydration mismatch and the cap is the same
// width on every platform. Glyph keys are 7x7 pixel SVGs (crispEdges) with
// a screen-reader name.

export type KeyName = "mod" | "up" | "down" | "enter" | string;

// 7x7 glyphs (original art), drawn as pixel rects:
//   cmd      up       down     enter
//   .#...#.  ...#...  ...#...  ......#
//   #.#.#.#  ..###..  ...#...  ......#
//   .#####.  .#####.  ...#...  ..#...#
//   ..#.#..  ...#...  ...#...  .##...#
//   .#####.  ...#...  .#####.  #######
//   #.#.#.#  ...#...  ..###..  .##....
//   .#...#.  ...#...  ...#...  ..#....
const PATHS = {
  cmd: "M1 0h1v1H1zM5 0h1v1H5zM0 1h1v1H0zM2 1h1v1H2zM4 1h1v1H4zM6 1h1v1H6zM1 2h5v1H1zM2 3h1v1H2zM4 3h1v1H4zM1 4h5v1H1zM0 5h1v1H0zM2 5h1v1H2zM4 5h1v1H4zM6 5h1v1H6zM1 6h1v1H1zM5 6h1v1H5z",
  up: "M3 0h1v7H3zM2 1h3v1H2zM1 2h5v1H1z",
  down: "M3 0h1v7H3zM1 4h5v1H1zM2 5h3v1H2z",
  enter: "M6 0h1v5H6zM0 4h6v1H0zM2 2h1v5H2zM1 3h1v3H1z",
};

export const Glyph = ({ name }: { name: keyof typeof PATHS }) => (
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
