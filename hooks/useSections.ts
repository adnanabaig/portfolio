// One source of truth for "which section is the reader in": section tops are
// cached (recomputed on ResizeObserver and once fonts load), one passive
// scroll listener writes scroll state into a ref, and React state changes
// only when the active section changes. The header's aria-current and the
// AB-01 track both read from it.
import { useEffect, useMemo, useRef, useState } from "react";

export interface SectionState {
  ids: string[];
  /** Document y of each section's reading line crossing, clamped so the last one is reachable. */
  stops: number[];
  /** Current reading-line position (scrollY + offset). */
  line: number;
  /** 0..1 scroll progress through the page. */
  progress: number;
  /** True once the first measurement ran. */
  ready: boolean;
}

export interface Sections {
  activeIndex: number;
  activeId: string;
  /** Mutable; read inside rAF loops, never in render. */
  state: SectionState;
  /** Called on every scroll or re-measure; returns an unsubscribe. */
  subscribe(cb: () => void): () => void;
}

export function useSections(ids: string[], enabled = true): Sections {
  const [activeIndex, setActiveIndex] = useState(0);
  const listeners = useRef(new Set<() => void>());
  const stateRef = useRef<SectionState>({ ids, stops: ids.map(() => 0), line: 0, progress: 0, ready: false });
  const key = ids.join("|");

  useEffect(() => {
    if (!enabled) return;
    const list = key.split("|");
    const st = stateRef.current;
    st.ids = list;
    let offset = 0;
    let maxScroll = 1;
    let tops: number[] = list.map(() => 0);
    let current = -1;

    const update = () => {
      const y = window.scrollY;
      st.line = y + offset;
      st.progress = maxScroll > 0 ? Math.min(1, Math.max(0, y / maxScroll)) : 1;
      let idx = 0;
      for (let i = 0; i < st.stops.length; i++) if (st.stops[i] <= st.line + 1) idx = i;
      if (idx !== current) {
        current = idx;
        setActiveIndex(idx);
      }
      listeners.current.forEach((cb) => cb());
    };

    const measure = () => {
      const header = document.querySelector<HTMLElement>(".statusbar");
      const headerH = header ? header.offsetHeight : 84;
      // The reading line sits 30% of the way down the visible area under the header.
      offset = headerH + Math.round((window.innerHeight - headerH) * 0.3);
      maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      tops = list.map((id) => {
        const el = document.getElementById(id);
        return el ? el.getBoundingClientRect().top + window.scrollY : Infinity;
      });
      // The line can never pass maxScroll + offset, so pull late stops back to
      // where they can still be reached (the last section lights at the bottom).
      const maxLine = maxScroll + offset;
      let prev = -Infinity;
      st.stops = tops.map((t, i) => {
        let s = i === 0 ? 0 : Math.min(t, maxLine);
        if (!Number.isFinite(s)) s = maxLine;
        s = Math.max(s, prev);
        prev = s;
        return s;
      });
      st.ready = true;
      update();
    };

    // The one passive scroll listener: cheap reads, state only on section change.
    const onScroll = () => update();

    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", measure);
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => measure()) : null;
    ro?.observe(document.body);
    let live = true;
    document.fonts?.ready
      .then(() => {
        if (live) measure();
      })
      .catch(() => undefined);
    return () => {
      live = false;
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", measure);
      ro?.disconnect();
    };
  }, [key, enabled]);

  return useMemo(
    () => ({
      activeIndex,
      activeId: ids[activeIndex] ?? "",
      state: stateRef.current,
      subscribe(cb: () => void) {
        listeners.current.add(cb);
        return () => {
          listeners.current.delete(cb);
        };
      },
    }),
    // ids identity changes every render; key captures its content.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeIndex, key]
  );
}
