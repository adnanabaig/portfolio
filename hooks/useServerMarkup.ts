// Keeps server-rendered static markup (pixel art) without shipping the code
// or data that drew it.
//
// The component renders its art through dangerouslySetInnerHTML. On the
// server `initial` is available, so the HTML carries the real markup. In the
// browser `initial` is usually null: hydration then renders an empty string,
// and React leaves the server's children in place (it never diffs inner HTML
// while hydrating, and the element sets suppressHydrationWarning). Only when
// the element is empty (a fresh client mount, such as a client-side
// navigation) or the caller asks for something other than what the server
// drew (`want` changed) does the hook run `load` and re-render with real
// markup.
import { useEffect, useRef, useState, type RefObject } from "react";

export function useServerMarkup<T>(
  ref: RefObject<Element>,
  initial: T | null,
  load: () => Promise<T>,
  want = ""
): T | null {
  const [value, setValue] = useState<T | null>(initial);
  const drawn = useRef(want);

  useEffect(() => {
    if (value) return;
    if (ref.current?.firstChild && want === drawn.current) return;
    let live = true;
    load().then(
      (v) => {
        if (live) setValue(v);
      },
      () => {}
    );
    return () => {
      live = false;
    };
    // `load` is a module-level function at every call site.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, want]);

  return value;
}
