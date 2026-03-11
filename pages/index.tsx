import { useCallback, useEffect, useRef, useState } from "react";
import Head from "next/head";

import gsap from "gsap";
import Header from "../components/Header";
import GlassWrapper from "../components/GlassWrapper";
import Socials from "../components/Socials";
import WorkCard from "../components/WorkCard";
import Footer from "../components/Footer";
import { useIsomorphicLayoutEffect } from "../utils";

import portfolioJson from "../data/portfolio.json";
import type { PortfolioData, Project } from "../types/portfolio";

const data = portfolioJson as PortfolioData;

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function safeStorage(key: string): string | null {
  try { return sessionStorage.getItem(key); } catch { return null; }
}
function safeStorageSet(key: string, value: string) {
  try { sessionStorage.setItem(key, value); } catch { /* private browsing */ }
}

const INIT_KEY = "ab-init-played";

// Typewriter config
const TYPED_NAME = "Adnan Baig.";
const CHAR_DURATION = 0.068; // seconds per character

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default function Home() {
  // showOverlay: true on first visit (plays typewriter), false on return visits
  const [showOverlay, setShowOverlay] = useState(true);

  // ── Overlay refs ──────────────────────────────────────────────────────────
  const overlayRef    = useRef<HTMLDivElement | null>(null);
  const overlayNameRef = useRef<HTMLSpanElement | null>(null);
  const cursorRef     = useRef<HTMLSpanElement | null>(null);

  // ── Page content wrapper — opacity:0 until the overlay fades out ──────────
  const pageRef = useRef<HTMLDivElement | null>(null);

  // ── Scroll targets ────────────────────────────────────────────────────────
  const workRef  = useRef<HTMLDivElement | null>(null);
  const aboutRef = useRef<HTMLDivElement | null>(null);

  // ── Hero curtain (ScrollTrigger) ──────────────────────────────────────────
  const heroRef        = useRef<HTMLDivElement | null>(null);
  const heroContentRef = useRef<HTMLDivElement | null>(null);

  // ── Matrix-shine refs ─────────────────────────────────────────────────────
  const matrixCanvasRef     = useRef<HTMLCanvasElement | null>(null);
  const binaryOverlayRef    = useRef<HTMLDivElement | null>(null);   // receives mask-image
  const taglineContainerRef = useRef<HTMLDivElement | null>(null);

  // ── Grid refs ─────────────────────────────────────────────────────────────
  const projectsGridRef    = useRef<HTMLDivElement | null>(null);
  const engineeringGridRef = useRef<HTMLDivElement | null>(null);

  // ── Section header parallax refs ──────────────────────────────────────────
  const workHeaderRef        = useRef<HTMLHeadingElement | null>(null);
  const engineeringHeaderRef = useRef<HTMLHeadingElement | null>(null);
  const aboutHeaderRef       = useRef<HTMLHeadingElement | null>(null);

  const handleWorkScroll = () => {
    if (!workRef.current) return;
    window.scrollTo({ top: workRef.current.offsetTop, left: 0, behavior: "smooth" });
  };
  const handleAboutScroll = () => {
    if (!aboutRef.current) return;
    window.scrollTo({ top: aboutRef.current.offsetTop, left: 0, behavior: "smooth" });
  };

  // ── Matrix-shine animation ────────────────────────────────────────────────
  // Two-layer technique:
  //   Layer 1 (bottom): the normal solid h1 text — always visible.
  //   Layer 2 (top):    binaryOverlayRef div containing a canvas that draws
  //                     scrolling green binary chars clipped to the letter
  //                     shapes (canvas source-atop stencil).
  //
  // A GSAP tween sweeps a mask-image gradient left→right over Layer 2.
  //   - Where the mask is WHITE  → Layer 2 shows (binary inside letters).
  //   - Where the mask is TRANSPARENT → Layer 2 hidden → Layer 1 shows through.
  //
  // The binary canvas is already scrolling when the mask window arrives, so
  // the reveal feels alive from the first letter it touches.
  const runMatrixShine = useCallback(() => {
    const canvas  = matrixCanvasRef.current;
    const overlay = binaryOverlayRef.current;
    const container = taglineContainerRef.current;
    if (!canvas || !overlay || !container) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // ── Size canvas to the container at device resolution ─────────────────
    const dpr = Math.max(window.devicePixelRatio || 1, 1);
    const cr  = container.getBoundingClientRect();
    const W   = cr.width;
    const H   = cr.height;
    canvas.width  = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    canvas.style.width  = `${W}px`;
    canvas.style.height = `${H}px`;
    ctx.scale(dpr, dpr);

    // ── Capture h1 positions + fonts relative to container ────────────────
    const h1s  = Array.from(container.querySelectorAll<HTMLHeadingElement>("h1"));
    const lines = h1s.map((el) => {
      const r  = el.getBoundingClientRect();
      const cs = window.getComputedStyle(el);
      return {
        text: el.textContent ?? "",
        cx: r.left - cr.left + r.width / 2,
        cy: r.top  - cr.top,
        font: `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`,
        letterSpacing: cs.letterSpacing,
      };
    });
    if (lines.length === 0) return;

    // ── Binary grid ───────────────────────────────────────────────────────
    const basePx  = parseFloat(window.getComputedStyle(h1s[0]).fontSize);
    const CHAR_PX = Math.max(8, Math.round(basePx * 0.16));
    const cols    = Math.ceil(W / CHAR_PX) + 1;
    const rows    = Math.ceil(H / CHAR_PX) + 2; // +2 for scroll wrap-around
    const grid: string[] = Array.from({ length: cols * rows }, () =>
      Math.random() > 0.5 ? "1" : "0",
    );

    // ── Shine + scroll params ─────────────────────────────────────────────
    // shineHalfW: half-width of the visible mask window in pixels.
    // Sized to ~2 rendered character widths so each letter is fully lit before
    // the next begins, giving a clean letter-by-letter reveal.
    const shineHalfW       = Math.max(56, basePx * 1.4);
    const SCROLL_PX_PER_MS = (CHAR_PX * 8) / 1000; // ~8 char-rows / sec downward

    // ── Show overlay; set mask to fully transparent (nothing visible yet) ─
    gsap.set(overlay, { display: "block", opacity: 1 });
    const setMask = (mask: string) => {
      overlay.style.setProperty("-webkit-mask-image", mask);
      overlay.style.setProperty("mask-image", mask);
    };
    setMask("linear-gradient(to right, transparent, transparent)");

    // ── Canvas draw loop — runs continuously while overlay is mounted ─────
    let rafId:    number;
    let lastT     = performance.now();
    let charTimer = 0;
    let scrollY   = 0;

    const drawFrame = (now: number) => {
      const dt = Math.min(now - lastT, 50);
      lastT      = now;
      charTimer += dt;
      scrollY   += SCROLL_PX_PER_MS * dt;

      // Randomly flip ~4% of chars every ~80 ms for visual noise
      if (charTimer >= 80) {
        charTimer = 0;
        const n = Math.floor(grid.length * 0.04);
        for (let i = 0; i < n; i++) {
          const idx = Math.floor(Math.random() * grid.length);
          grid[idx] = grid[idx] === "1" ? "0" : "1";
        }
      }

      ctx.clearRect(0, 0, W, H);

      // Step 1 — Draw text as alpha stencil (white pixels define letter shapes)
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle    = "#ffffff";
      ctx.textBaseline = "top";
      lines.forEach(({ text, cx, cy, font, letterSpacing }) => {
        ctx.font      = font;
        ctx.textAlign = "center";
        (ctx as unknown as Record<string, unknown>).letterSpacing = letterSpacing;
        ctx.fillText(text, cx, cy);
      });

      // Step 2 — source-atop: everything drawn here clips to the letter shapes
      ctx.globalCompositeOperation = "source-atop";

      // Black fill inside letters
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, W, H);

      // Scrolling binary chars (uniform bright green — mask handles the reveal)
      ctx.font       = `700 ${CHAR_PX}px "Roboto Mono","Courier New",monospace`;
      ctx.textAlign  = "left";
      ctx.textBaseline = "top";
      (ctx as unknown as Record<string, unknown>).letterSpacing = "0px";
      ctx.fillStyle  = "rgba(0, 230, 85, 0.92)";

      const charOffset = Math.floor(scrollY / CHAR_PX);
      const subPx      = scrollY % CHAR_PX;

      for (let r = 0; r <= rows; r++) {
        const py      = r * CHAR_PX - subPx;
        if (py > H + CHAR_PX) break;
        const gridRow = ((r + charOffset) % rows + rows) % rows;
        for (let c = 0; c < cols; c++) {
          ctx.fillText(grid[gridRow * cols + c], c * CHAR_PX, py);
        }
      }

      rafId = requestAnimationFrame(drawFrame);
    };
    rafId = requestAnimationFrame(drawFrame);

    // ── GSAP timeline: sweep mask window left→right ───────────────────────
    const proxy = { x: -shineHalfW };

    gsap.to(proxy, {
      x: W + shineHalfW,
      duration: 2.0,
      ease: "none", // linear — every letter gets identical dwell time
      onUpdate() {
        const x  = proxy.x;
        // Four-stop gradient: soft outer edges, solid inner window.
        // Inner window = 60% of shineHalfW so letters are fully lit at center.
        const a = `${x - shineHalfW}px`;
        const b = `${x - shineHalfW * 0.4}px`;
        const c2 = `${x + shineHalfW * 0.4}px`;
        const d = `${x + shineHalfW}px`;
        setMask(
          `linear-gradient(to right, transparent ${a}, white ${b}, white ${c2}, transparent ${d})`,
        );
      },
      onComplete() {
        // Shine has exited — cancel RAF, clear canvas, hide overlay
        cancelAnimationFrame(rafId);
        gsap.to(overlay, {
          opacity: 0,
          duration: 0.3,
          ease: "power2.in",
          onComplete() {
            gsap.set(overlay, { display: "none", opacity: 1 });
            setMask("linear-gradient(to right, transparent, transparent)");
            ctx.clearRect(0, 0, canvas.width, canvas.height);
          },
        });
      },
    });
  }, []); // refs are stable — safe with empty deps

  // ── Stagger entrance for project cards ────────────────────────────────────
  // The landing quote (taglines) are intentionally excluded — they fade in
  // with the global page reveal (pageRef opacity) simultaneously with the
  // Nav and Hero section, immediately after the typewriter overlay exits.
  const runEntranceAnimations = useCallback(() => {
    const animateGrid = (ref: React.RefObject<HTMLDivElement>, sel: string, delay: number) => {
      if (!ref.current) return;
      const cards = ref.current.querySelectorAll<HTMLElement>(sel);
      gsap.fromTo(cards, { opacity: 0, y: 26 }, {
        opacity: 1, y: 0, duration: 0.8, ease: "power3.out", stagger: 0.12, delay,
      });
    };

    animateGrid(projectsGridRef, "[data-project-card]", 0.1);
    animateGrid(engineeringGridRef, "[data-engineering-card]", 0.35);

    // Matrix shine fires 1 s after the page is fully visible
    setTimeout(runMatrixShine, 1000);
  }, [runMatrixShine]);

  // ── First vs. return visit ─────────────────────────────────────────────────
  // useLayoutEffect fires synchronously before the first browser paint.
  // Return visits: collapse the overlay state and reveal the page immediately.
  // First visits:  hide the page so the overlay typewriter plays first.
  useIsomorphicLayoutEffect(() => {
    const hasPlayed = safeStorage(INIT_KEY);

    if (hasPlayed) {
      setShowOverlay(false);
      gsap.set(pageRef.current, { opacity: 1 });
      runEntranceAnimations();
    } else {
      gsap.set(pageRef.current, { opacity: 0 });
    }
  }, [runEntranceAnimations]);

  // ── Typewriter overlay — only runs on first visit ─────────────────────────
  // No async dynamic imports: gsap is imported at module level, proxy pattern
  // avoids TextPlugin entirely. Single timeline, no race conditions.
  useEffect(() => {
    if (!showOverlay) return; // return visit — skip

    const proxy = { n: 0 };

    // Cursor blink — independent of the main timeline
    const blinkTween = gsap.to(cursorRef.current, {
      opacity: 0,
      duration: 0.42,
      ease: "power1.inOut",
      repeat: -1,
      yoyo: true,
    });

    const tl = gsap.timeline();

    // 1. Brief dark-screen pause
    tl.to({}, { duration: 0.3 });

    // 2. Type "Adnan Baig." character-by-character via onUpdate proxy
    tl.to(proxy, {
      n: TYPED_NAME.length,
      duration: TYPED_NAME.length * CHAR_DURATION,
      ease: "none",
      onUpdate() {
        if (overlayNameRef.current) {
          overlayNameRef.current.textContent = TYPED_NAME.slice(0, Math.round(proxy.n));
        }
      },
    });

    // 3. Stop blink, hold cursor solid
    tl.call(() => {
      blinkTween.kill();
      gsap.set(cursorRef.current, { opacity: 1 });
    });
    tl.to({}, { duration: 0.5 });

    // 4. Fade cursor out
    tl.to(cursorRef.current, { opacity: 0, duration: 0.2, ease: "none" });

    // 5. Brief breathe
    tl.to({}, { duration: 0.25 });

    // 6. Overlay fades out → page fades in → entrance animations
    tl.to(overlayRef.current, {
      opacity: 0,
      duration: 0.65,
      ease: "power2.inOut",
      onComplete() {
        safeStorageSet(INIT_KEY, "1");
        setShowOverlay(false);                 // unmount the overlay DOM node
        gsap.to(pageRef.current, {
          opacity: 1,
          duration: 0.5,
          ease: "power2.out",
          onComplete: runEntranceAnimations,   // stagger taglines + cards after reveal
        });
      },
    });

    return () => {
      tl.kill();
      blinkTween.kill();
    };
  }, [showOverlay, runEntranceAnimations]);

  // ── ScrollTrigger: hero curtain + section header parallax ─────────────────
  useIsomorphicLayoutEffect(() => {
    let cancelled = false;
    const killFns: Array<() => void> = [];

    import("gsap/ScrollTrigger").then(({ ScrollTrigger }) => {
      if (cancelled) return;
      gsap.registerPlugin(ScrollTrigger);

      if (heroRef.current && heroContentRef.current) {
        const curtain = gsap.to(heroContentRef.current, {
          scale: 0.88, opacity: 0, y: -60, ease: "none",
          scrollTrigger: {
            trigger: heroRef.current,
            start: "top top",
            end: "+=680",
            scrub: 0.6,
            pin: heroRef.current,
            pinSpacing: true,
          },
        });
        killFns.push(() => { curtain.scrollTrigger?.kill(); curtain.kill(); });
      }

      [workHeaderRef, engineeringHeaderRef, aboutHeaderRef]
        .map((r) => r.current)
        .filter((el): el is HTMLHeadingElement => el !== null)
        .forEach((el) => {
          const tween = gsap.fromTo(el,
            { scale: 1, opacity: 1, y: 0 },
            {
              scale: 0.8, opacity: 0, y: -18, ease: "none",
              scrollTrigger: { trigger: el, start: "top 18%", end: "top -8%", scrub: 0.4 },
            }
          );
          killFns.push(() => { tween.scrollTrigger?.kill(); tween.kill(); });
        });
    });

    return () => { cancelled = true; killFns.forEach((fn) => fn()); };
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <>
      <Head>
        <title>{data.name}</title>
        <meta
          name="description"
          content="Adnan Baig — robotics engineer, AI builder, and CS graduate (CSUS '25) currently at Meta Reality Labs."
        />
      </Head>

      {/*
       * ── TYPEWRITER OVERLAY ──────────────────────────────────────────────
       * Fixed, full-screen, dark — sits above all page content.
       * Unmounted from the DOM once the fade-out completes.
       * pointerEvents:none so the page beneath can hydrate freely.
       */}
      {showOverlay && (
        <div
          ref={overlayRef}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 200,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#121212",
            pointerEvents: "none",
          }}
        >
          <span
            style={{
              fontFamily: "'Roboto Mono', ui-monospace, 'Courier New', monospace",
              fontSize: "clamp(1.9rem, 5.5vw, 4.8rem)",
              fontWeight: 800,
              letterSpacing: "-0.04em",
              color: "#f1f5f9",
              display: "flex",
              alignItems: "center",
            }}
          >
            {/* GSAP writes characters into this span via onUpdate proxy */}
            <span ref={overlayNameRef} />
            {/* Electric-blue blinking cursor */}
            <span
              ref={cursorRef}
              style={{
                display: "inline-block",
                width: "3px",
                height: "0.82em",
                background: "#0070F3",
                marginLeft: "3px",
                verticalAlign: "middle",
                boxShadow: "0 0 10px rgba(0,112,243,0.9), 0 0 20px rgba(0,112,243,0.4)",
              }}
            />
          </span>
        </div>
      )}

      {/*
       * ── PAGE CONTENT ────────────────────────────────────────────────────
       * Everything except the typewriter name lives here.
       * On first visit: starts at opacity:0 (set by GSAP in useLayoutEffect).
       * Fades to opacity:1 once the overlay completes its exit.
       */}
      <div ref={pageRef}>

        {/* ── HERO ──────────────────────────────────────────────────────── */}
        <div ref={heroRef} className="relative min-h-screen flex flex-col overflow-hidden">
          <div className="container mx-auto">
            <Header
              handleWorkScroll={handleWorkScroll}
              handleAboutScroll={handleAboutScroll}
            />
          </div>

          {/* Inner hero content — animated out by ScrollTrigger curtain on scroll */}
          <div
            ref={heroContentRef}
            className="flex-1 flex flex-col items-center justify-center text-center px-6 pb-20 will-change-transform"
          >
            {/*
             * ── TAGLINE CONTAINER ─────────────────────────────────────────
             * position:relative so the matrix-shine canvas can sit on top.
             * The canvas is sized + positioned by JS in runMatrixShine.
             */}
            <div ref={taglineContainerRef} style={{ position: "relative" }}>
              <div>
                <h1 className="text-4xl tablet:text-6xl laptop:text-7xl laptopl:text-8xl font-bold leading-tight tracking-tight">
                  {data.headerTaglineOne}
                </h1>
              </div>
              {data.headerTaglineTwo && (
                <div>
                  <h1 className="text-4xl tablet:text-6xl laptop:text-7xl laptopl:text-8xl font-bold leading-tight tracking-tight">
                    {data.headerTaglineTwo}
                  </h1>
                </div>
              )}
              {data.headerTaglineThree && (
                <div>
                  <h1 className="text-4xl tablet:text-6xl laptop:text-7xl laptopl:text-8xl font-bold leading-tight tracking-tight">
                    {data.headerTaglineThree}
                  </h1>
                </div>
              )}
              {data.headerTaglineFour && (
                <div>
                  <h1 className="text-4xl tablet:text-6xl laptop:text-7xl laptopl:text-8xl font-bold leading-tight tracking-tight">
                    {data.headerTaglineFour}
                  </h1>
                </div>
              )}

              {/*
               * ── BINARY OVERLAY (Layer 2) ───────────────────────────────
               * Sits absolutely on top of the normal text (Layer 1).
               * mask-image is updated by GSAP each frame: the transparent
               * region of the gradient falls through to Layer 1 (solid text),
               * the white region reveals the canvas binary content.
               * display:none until runMatrixShine fires.
               */}
              <div
                ref={binaryOverlayRef}
                aria-hidden="true"
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  pointerEvents: "none",
                  zIndex: 10,
                  display: "none",
                }}
              >
                <canvas ref={matrixCanvasRef} style={{ display: "block" }} />
              </div>
            </div>

            <Socials className="mt-8 laptop:mt-10" />
          </div>

          {/* Scroll affordance */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-30 pointer-events-none select-none">
            <span className="text-xs font-mono tracking-[0.25em] uppercase">Scroll</span>
            <svg width="16" height="20" viewBox="0 0 16 20" fill="none" className="animate-bounce" aria-hidden="true">
              <path d="M8 0v16M1 9l7 7 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>

        {/* ── WORK + ENGINEERING + ABOUT ────────────────────────────────── */}
        <div className="container mx-auto mb-10">

          {/* Work — professional engagements (WRAM, SentrySight, etc.) */}
          <div id="work-section" className="mt-10 laptop:mt-20 p-2 laptop:p-0" ref={workRef}>
            <h1 ref={workHeaderRef} className="text-2xl font-bold">Work.</h1>
            <div
              ref={projectsGridRef}
              className="mt-5 laptop:mt-10 grid grid-cols-1 tablet:grid-cols-2 gap-4"
            >
              {data.projects.map((project: Project) => (
                <div key={project.id} data-project-card>
                  <WorkCard
                    img={project.imageSrc}
                    name={project.title}
                    description={project.description}
                    category={project.category}
                    organization={project.organization}
                    onClick={() => window.open(project.url)}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Technical Engineering — research & independent builds */}
          <div className="mt-16 laptop:mt-24 p-2 laptop:p-0">
            <h1 ref={engineeringHeaderRef} className="text-2xl font-bold">
              Technical Engineering.
            </h1>
            <p className="mt-2 opacity-50 text-base laptop:text-lg max-w-2xl">
              Research and independent builds — satellite ML, on-chain systems, and real-time AI.
            </p>
            <GlassWrapper className="mt-6">
              <div
                ref={engineeringGridRef}
                className="p-4 laptop:p-6 grid grid-cols-1 tablet:grid-cols-2 laptop:grid-cols-3 gap-4"
              >
                {data.engineeringProjects.map((project: Project) => (
                  <div key={project.id} data-engineering-card>
                    <WorkCard
                      img={project.imageSrc}
                      name={project.title}
                      description={project.description}
                      category={project.category}
                      organization={project.organization}
                      onClick={() => window.open(project.url)}
                    />
                  </div>
                ))}
              </div>
            </GlassWrapper>
          </div>

          {/* About */}
          <div id="about-section" className="mt-16 laptop:mt-32 p-2 laptop:p-0" ref={aboutRef}>
            <h1 ref={aboutHeaderRef} className="tablet:m-10 text-2xl font-bold">About.</h1>
            <p className="tablet:m-10 mt-2 text-xl laptop:text-3xl w-full laptop:w-3/5">
              {data.aboutpara}
            </p>
          </div>

          <Footer />
        </div>

      </div>{/* /pageRef */}
    </>
  );
}
