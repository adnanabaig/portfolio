import type { CSSProperties } from "react";
import { fillFor, spritePaths, sprites, type SpriteName } from "../../lib/pixel/toPaths";

export interface SpriteProps {
  name: SpriteName;
  frame?: number;
  /**
   * CSS pixels per sprite pixel. Omit to use the responsive --px
   * (3px on phones, 4px from 768px up).
   */
  scale?: number;
  /** Giving a title makes the sprite an image with that accessible name. */
  title?: string;
  className?: string;
  /** Mirror horizontally (AB-01 faces right by default). */
  flip?: boolean;
  /** Paint every pixel in currentColor (for one-color glyphs inside buttons). */
  mono?: boolean;
  style?: CSSProperties;
}

/** Crisp, SSR-rendered pixel art: one <path> per palette color. */
const Sprite = ({ name, frame = 0, scale, title, className = "", flip = false, mono = false, style }: SpriteProps) => {
  const def = sprites[name];
  const paths = spritePaths(name, frame);
  const vars = {
    "--sw": def.w,
    "--sh": def.h,
    ...(scale ? { "--sc": `${scale}px` } : {}),
    ...style,
  } as CSSProperties;

  return (
    <svg
      viewBox={`0 0 ${def.w} ${def.h}`}
      shapeRendering="crispEdges"
      className={`sprite${title ? "" : " deco"}${flip ? " sprite--flip" : ""} ${className}`}
      style={vars}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
      data-sprite={name}
    >
      {paths.map((p) => (
        <path key={p.key} d={p.d} style={{ fill: mono ? "currentColor" : fillFor(p.key) }} />
      ))}
    </svg>
  );
};

export default Sprite;
