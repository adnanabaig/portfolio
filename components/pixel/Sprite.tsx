import { useRef, type CSSProperties } from "react";
import { useServerMarkup } from "../../hooks/useServerMarkup";
import { getSheet, loadSheet } from "../../lib/pixel/spriteStore";
import type { SpriteName } from "../../lib/pixel/toPaths";

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

/**
 * Crisp, SSR-rendered pixel art: one <path> per palette color.
 *
 * The server paints the paths, the viewBox, and the --sw/--sh size. The
 * browser keeps that markup through hydration without the sprite sheet
 * (see hooks/useServerMarkup), so no art ships in the main bundle. If this
 * element has to draw something the server did not (a fresh client mount,
 * or a new frame/name/mono), it loads the sheet and redraws.
 */
const Sprite = ({ name, frame = 0, scale, title, className = "", flip = false, mono = false, style }: SpriteProps) => {
  const ref = useRef<SVGSVGElement | null>(null);
  const sheet = useServerMarkup(ref, getSheet(), loadSheet, `${name}:${frame}:${mono ? 1 : 0}`);
  const def = sheet?.sprites[name];
  const vars = {
    ...(def ? { "--sw": def.w, "--sh": def.h } : {}),
    ...(scale ? { "--sc": `${scale}px` } : {}),
    ...style,
  } as CSSProperties;

  return (
    <svg
      ref={ref}
      viewBox={def ? `0 0 ${def.w} ${def.h}` : undefined}
      shapeRendering="crispEdges"
      className={`sprite${title ? "" : " deco"}${flip ? " sprite--flip" : ""} ${className}`}
      style={vars}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
      data-sprite={name}
      dangerouslySetInnerHTML={{ __html: sheet ? sheet.spriteMarkup(name, frame, mono) : "" }}
      suppressHydrationWarning
    />
  );
};

export default Sprite;
