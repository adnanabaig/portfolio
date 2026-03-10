import { useEffect, useRef } from "react";
import gsap from "gsap";

const NAME = "Adnan Baig.";
// Time (seconds) between each character — feels like a fast but deliberate typist
const CHAR_DURATION = 0.068;

interface InitSequenceProps {
  /** Called once the overlay has fully faded out and the page can begin its reveal. */
  onComplete: () => void;
}

/**
 * Full-screen "system initialization" overlay.
 *
 * Sequence:
 *   1. 200ms boot pause          — blank dark screen
 *   2. Typewriter                — "Adnan Baig." typed character-by-character
 *      └─ cursor blinks the whole time (independent GSAP tween)
 *   3. Stop blink, hold cursor   — 500ms
 *   4. Cursor fades out          — 200ms
 *   5. 250ms hold                — let the name "breathe"
 *   6. Overlay fades to black    — 650ms power2.inOut
 *   7. onComplete()              — parent reveals the page
 */
export default function InitSequence({ onComplete }: InitSequenceProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const displayRef = useRef<HTMLSpanElement>(null);
  const cursorRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    // ── Cursor blink — runs independently in parallel with the typing ──────
    const blinkTween = gsap.to(cursorRef.current, {
      opacity: 0,
      duration: 0.42,
      ease: "power1.inOut",
      repeat: -1,
      yoyo: true,
    });

    // ── Main timeline ───────────────────────────────────────────────────────
    const proxy = { n: 0 };
    const tl = gsap.timeline();

    // 1. Boot pause
    tl.to({}, { duration: 0.2 });

    // 2. Typewriter
    tl.to(proxy, {
      n: NAME.length,
      duration: NAME.length * CHAR_DURATION,
      ease: "none",
      onUpdate() {
        if (displayRef.current) {
          displayRef.current.textContent = NAME.slice(0, Math.round(proxy.n));
        }
      },
    });

    // 3. Stop blink, hold cursor solid
    tl.call(() => {
      blinkTween.kill();
      gsap.set(cursorRef.current, { opacity: 1 });
    });
    tl.to({}, { duration: 0.5 });

    // 4. Cursor fades out
    tl.to(cursorRef.current, { opacity: 0, duration: 0.2, ease: "none" });

    // 5. Breathe
    tl.to({}, { duration: 0.25 });

    // 6. Overlay fades out — onComplete fires when the DOM is clear
    tl.to(overlayRef.current, {
      opacity: 0,
      duration: 0.65,
      ease: "power2.inOut",
      onComplete,
    });

    return () => {
      tl.kill();
      blinkTween.kill();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // onComplete is stabilised with useCallback([]) in the parent — safe to omit

  return (
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
        // Never steals pointer-events — the page below can load freely
        pointerEvents: "none",
      }}
    >
      <span
        style={{
          fontFamily: "'Roboto Mono', ui-monospace, 'Courier New', monospace",
          // clamp: readable on mobile, cinematic on desktop
          fontSize: "clamp(1.9rem, 5.5vw, 4.8rem)",
          fontWeight: 800,
          letterSpacing: "-0.04em",
          color: "#f1f5f9",
          display: "flex",
          alignItems: "center",
        }}
      >
        <span ref={displayRef} />
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
  );
}
