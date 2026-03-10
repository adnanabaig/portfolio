import type { AppProps } from "next/app";
import "../styles/globals.css";
import { useEffect, useRef } from "react";
import gsap from "gsap";

function App({ Component, pageProps }: AppProps) {
  const dispMapRef = useRef<SVGFEDisplacementMapElement | null>(null);
  // Proxy object so GSAP can tween the numeric scale value
  const scaleProxy = useRef({ value: 0 });
  const prevMouse = useRef({ x: 0, y: 0, t: 0 });
  const decayTween = useRef<gsap.core.Tween | null>(null);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      const now = performance.now();
      const dt = now - prevMouse.current.t;

      // Guard: ignore first event and stale deltas (tab switch, etc.)
      if (dt > 0 && dt < 80) {
        const dx = e.clientX - prevMouse.current.x;
        const dy = e.clientY - prevMouse.current.y;
        // Normalise to ~px-per-frame at 60fps so speed feels consistent
        const speed = (Math.sqrt(dx * dx + dy * dy) / dt) * 16;
        const targetScale = Math.min(speed * 0.38, 14);

        if (targetScale > 0.8) {
          decayTween.current?.kill();
          scaleProxy.current.value = targetScale;
          dispMapRef.current?.setAttribute("scale", String(targetScale.toFixed(2)));

          // Smooth organic decay back to 0
          decayTween.current = gsap.to(scaleProxy.current, {
            value: 0,
            duration: 1.4,
            ease: "power2.out",
            onUpdate: () => {
              dispMapRef.current?.setAttribute(
                "scale",
                String(scaleProxy.current.value.toFixed(3))
              );
            },
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
       * SVG filter bank — zero-size, lives in the document but takes no layout space.
       * feTurbulence generates a fractal-noise field;
       * feDisplacementMap warps the source layer using that noise.
       * The `scale` attribute is animated by the mouse-velocity effect above.
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
       * Ambient background layer — the only element the displacement filter is
       * applied to. Using it on a fixed gradient layer (instead of the whole page)
       * avoids stacking-context / z-index issues and is far more performant.
       * The gradient provides enough colour variation that the displacement ripple
       * is faintly visible as a light-through-water shimmer.
       */}
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
          filter: "url(#liquid-distort)",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(ellipse 70% 55% at 15% 25%, rgba(0,112,243,0.11) 0%, transparent 60%), " +
              "radial-gradient(ellipse 55% 45% at 85% 75%, rgba(80,40,220,0.09) 0%, transparent 55%), " +
              "radial-gradient(ellipse 50% 50% at 50% 50%, rgba(0,50,140,0.06) 0%, transparent 70%)",
          }}
        />
      </div>

      {/* Main content — sits above the displaced background */}
      <div style={{ position: "relative", zIndex: 1 }}>
        <Component {...pageProps} />
      </div>
    </>
  );
}

export default App;
