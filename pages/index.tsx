import { useCallback, useEffect, useRef, useState } from "react";
import Head from "next/head";

import gsap from "gsap";
import Header from "../components/Header";
import GlassWrapper from "../components/GlassWrapper";
import Socials from "../components/Socials";
import WorkCard from "../components/WorkCard";
import Footer from "../components/Footer";
import { useIsomorphicLayoutEffect } from "../utils";
import { stagger } from "../animations";

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

  // ── Tagline entrance refs ─────────────────────────────────────────────────
  const textOne   = useRef<HTMLDivElement | null>(null);
  const textTwo   = useRef<HTMLDivElement | null>(null);
  const textThree = useRef<HTMLDivElement | null>(null);
  const textFour  = useRef<HTMLDivElement | null>(null);

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

  // ── Stagger entrance for taglines + project cards ─────────────────────────
  const runEntranceAnimations = useCallback(() => {
    const targets = [textOne, textTwo, textThree, textFour]
      .map((r) => r.current)
      .filter((el): el is HTMLDivElement => el !== null);

    if (targets.length > 0) stagger(targets, { y: 30 }, { y: 0 });

    const animateGrid = (ref: React.RefObject<HTMLDivElement>, sel: string, delay: number) => {
      if (!ref.current) return;
      const cards = ref.current.querySelectorAll<HTMLElement>(sel);
      gsap.fromTo(cards, { opacity: 0, y: 26 }, {
        opacity: 1, y: 0, duration: 0.8, ease: "power3.out", stagger: 0.12, delay,
      });
    };

    animateGrid(projectsGridRef, "[data-project-card]", 0.1);
    animateGrid(engineeringGridRef, "[data-engineering-card]", 0.35);
  }, []); // refs are stable — safe with empty deps

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
            <div ref={textOne}>
              <h1 className="text-4xl tablet:text-6xl laptop:text-7xl laptopl:text-8xl font-bold leading-tight tracking-tight">
                {data.headerTaglineOne}
              </h1>
            </div>
            {data.headerTaglineTwo && (
              <div ref={textTwo}>
                <h1 className="text-4xl tablet:text-6xl laptop:text-7xl laptopl:text-8xl font-bold leading-tight tracking-tight">
                  {data.headerTaglineTwo}
                </h1>
              </div>
            )}
            {data.headerTaglineThree && (
              <div ref={textThree}>
                <h1 className="text-4xl tablet:text-6xl laptop:text-7xl laptopl:text-8xl font-bold leading-tight tracking-tight">
                  {data.headerTaglineThree}
                </h1>
              </div>
            )}
            {data.headerTaglineFour && (
              <div ref={textFour}>
                <h1 className="text-4xl tablet:text-6xl laptop:text-7xl laptopl:text-8xl font-bold leading-tight tracking-tight">
                  {data.headerTaglineFour}
                </h1>
              </div>
            )}

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
