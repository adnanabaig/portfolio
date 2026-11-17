// React honors suppressHydrationWarning on every element, but @types/react
// only declares it for HTML. The server-markup islands (Sprite, CellView,
// the track walker) put it on <svg> and <g>.
import "react";

declare module "react" {
  interface SVGAttributes<T> {
    suppressHydrationWarning?: boolean;
  }
}
