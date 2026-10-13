import type Lenis from "@studio-freight/lenis";

let smoothScroller: Lenis | null = null;

export function setSmoothScroller(scroller: Lenis | null) {
  smoothScroller = scroller;
}

export function scrollToSection(id: string) {
  const target = document.getElementById(id);
  if (!target) return;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (smoothScroller && !reducedMotion) {
    smoothScroller.scrollTo(target, { offset: -24, duration: 1.2 });
  } else {
    window.scrollTo({
      top: target.getBoundingClientRect().top + window.scrollY - 24,
      behavior: reducedMotion ? "auto" : "smooth",
    });
  }
  if (window.location.hash !== `#${id}`) {
    window.history.pushState(null, "", `#${id}`);
  }
}
