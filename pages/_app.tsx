import type { AppProps } from "next/app";
import "../styles/globals.css";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import type LenisClass from "@studio-freight/lenis";

function App({ Component, pageProps }: AppProps) {
  // ── Liquid-distortion: mouse velocity drives feDisplacementMap scale ────────
  const dispMapRef = useRef<SVGFEDisplacementMapElement | null>(null);
  const scaleProxy = useRef({ value: 0 });
  const prevMouse  = useRef({ x: 0, y: 0, t: 0 });
  const decayTween = useRef<gsap.core.Tween | null>(null);

  // ── Lenis smooth scroll — wired into GSAP ticker + ScrollTrigger ────────────
  useEffect(() => {
    let lenis: InstanceType<typeof LenisClass> | null = null;
    let tick: ((time: number) => void) | null = null;
    let cancelled = false;

    Promise.all([
      import("@studio-freight/lenis"),
      import("gsap/ScrollTrigger"),
    ]).then(([{ default: Lenis }, { ScrollTrigger }]) => {
      if (cancelled) return;

      gsap.registerPlugin(ScrollTrigger);

      lenis = new Lenis({
        duration: 1.1,
        // expo-out: fast start, buttery deceleration
        easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
        syncTouch: false, // keep native momentum on touch devices
      });

      // Keep ScrollTrigger's scroll position in sync with Lenis's virtual scroll
      lenis.on("scroll", ScrollTrigger.update);

      // Tell ScrollTrigger to read position from Lenis, not window.scrollY
      // (Lenis prevents native scroll; without this proxy, pins never fire)
      ScrollTrigger.scrollerProxy(document.documentElement, {
        scrollTop(value?: number) {
          if (value !== undefined) lenis!.scrollTo(value, { immediate: true });
          return lenis!.scroll;
        },
        getBoundingClientRect() {
          return { top: 0, left: 0, width: window.innerWidth, height: window.innerHeight };
        },
      });

      // Drive Lenis from GSAP's RAF so both are frame-synced
      tick = (time: number) => lenis!.raf(time * 1000);
      gsap.ticker.add(tick);
      gsap.ticker.lagSmoothing(0); // prevent GSAP skipping frames during smooth scroll
    });

    return () => {
      cancelled = true;
      if (tick) gsap.ticker.remove(tick);
      lenis?.destroy();
    };
  }, []);

  // ── Liquid-distortion: mouse velocity drives feDisplacementMap scale ────────
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      const now = performance.now();
      const dt  = now - prevMouse.current.t;

      if (dt > 0 && dt < 80) {
        const dx    = e.clientX - prevMouse.current.x;
        const dy    = e.clientY - prevMouse.current.y;
        const speed = (Math.sqrt(dx * dx + dy * dy) / dt) * 16;
        const targetScale = Math.min(speed * 0.38, 14);

        if (targetScale > 0.8) {
          decayTween.current?.kill();
          scaleProxy.current.value = targetScale;
          dispMapRef.current?.setAttribute("scale", String(targetScale.toFixed(2)));

          decayTween.current = gsap.to(scaleProxy.current, {
            value: 0,
            duration: 1.4,
            ease: "power2.out",
            onUpdate: () =>
              dispMapRef.current?.setAttribute(
                "scale",
                String(scaleProxy.current.value.toFixed(3)),
              ),
          });
        }
      }

      prevMouse.current = { x: e.clientX, y: e.clientY, t: now };
    };

    window.addEventListener("mousemove", onMouseMove);
    return () => window.removeEventListener("mousemove", onMouseMove);
  }, []);

  return (
    <>
      {/*
       * SVG filter bank — zero layout footprint.
       * feTurbulence generates fractal noise; feDisplacementMap warps the
       * source layer with it. scale=0 at rest; driven up by mouse velocity.
       */}
      <svg
        aria-hidden="true"
        style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}
      >
        <defs>
          <filter id="liquid-distort">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.012 0.012"
              numOctaves="3"
              seed="8"
              result="noise"
            />
            <feDisplacementMap
              ref={dispMapRef}
              in="SourceGraphic"
              in2="noise"
              scale="0"
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
      </svg>

      {/*
       * ── CSS MESH GRADIENT BACKGROUND ──────────────────────────────────────
       * Fixed, z-index 0, behind all content.
       *
       * The inner div carries four overlapping radial-gradient orbs that form
       * a mesh. A CSS `gradient-hue` animation (defined in globals.css) applies
       * a slow hue-rotate so the colour palette breathes subtly over ~30 s —
       * no JS, no RAF, pure CSS keyframe on the GPU.
       *
       * The outer div applies the liquid-distort SVG filter to the composited
       * gradient so mouse-velocity ripples still distort the background.
       *
       * overflow:hidden prevents any filter bleeding outside the viewport.
       * will-change:filter on the inner div promotes it to its own layer so
       * the hue-rotate animation is fully GPU-composited.
       */}
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
          overflow: "hidden",
          filter: "url(#liquid-distort)",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: [
              "radial-gradient(ellipse 70% 62% at 12% 10%, rgba(0,112,243,0.16) 0%, transparent 65%)",
              "radial-gradient(ellipse 64% 58% at 88% 72%, rgba(66,24,208,0.13) 0%, transparent 60%)",
              "radial-gradient(ellipse 58% 52% at 48% 42%, rgba(0,150,130,0.09) 0%, transparent 62%)",
              "radial-gradient(ellipse 52% 48% at 18% 80%, rgba(8,48,180,0.11) 0%, transparent 58%)",
            ].join(", "),
            animation: "gradient-hue 30s ease-in-out infinite",
            willChange: "filter",
          }}
        />
      </div>

      {/* Main content — z-index 1 sits above the gradient layer */}
      <div style={{ position: "relative", zIndex: 1 }}>
        <Component {...pageProps} />
      </div>
    </>
  );
}

export default App;
