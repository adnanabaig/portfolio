// "Drive AB-01 home": the 404 page's optional one-screen micro-level. Loaded
// only when the visitor presses the button under the plain links. AB-01 walks
// and jumps over a few equipment cases to the HOME dock; arriving focuses a
// real link to "/" and earns the Signal found visitor badge (via "ab:home").
// Built from shared pieces: the fixed 60 Hz loop (lib/loop), the
// palette-indexed Raster, the 5x7 bitmap font, and theme colors read from CSS.
// Keys only while the level has focus; Esc releases. Reduced motion: no
// landing squash, no dust, no screen motion.
// Narrow screens (under NARROW css px) show half the world at twice the size,
// in a taller 8:9 box: the view follows AB-01 (or cuts between the two halves
// under reduced motion) and the HUD text stays in view.
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { MouseEvent as RMouseEvent, PointerEvent as RPointerEvent } from "react";
import { emit, on } from "../../lib/bus";
import { PALETTE_KEYS, Raster } from "../../lib/pixel/raster";
import { palette } from "../../lib/pixel/spriteData";
import { isEstop, prefersReducedMotion } from "../../lib/station";
import { createLoop } from "../../lib/loop";

const W = 320;
const H = 180;
const GROUND = 152;
const BOT_W = 16;
const BOT_H = 24;
const RUN = 72;
const GRAVITY = 620;
const JUMP_V = 236;
const COYOTE = 0.09;
const BUFFER = 0.12;
/** Equipment cases: x, and how many are stacked. */
const CASES = [
  { x: 92, n: 1 },
  { x: 158, n: 2 },
  { x: 222, n: 1 },
];
const CASE_W = 16;
const CASE_H = 12;
const DOCK_X = 284;
/** Below this canvas width (css px) the view is half the world wide, at 2x. */
const NARROW = 560;
const HALF = W / 2;

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}
const SOLIDS: Box[] = CASES.map((c) => ({ x: c.x, y: GROUND - c.n * CASE_H, w: CASE_W, h: c.n * CASE_H }));

type Dir = "left" | "right";
interface Dust {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
}

function parseHex(v: string, fallback: string) {
  const m = /^#([0-9a-f]{6})$/i.exec(v.trim()) || /^#([0-9a-f]{6})$/i.exec(fallback);
  const n = parseInt(m ? m[1] : "000000", 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export default function LostSignal() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const homeRef = useRef<HTMLAnchorElement>(null);
  const api = useRef<{ pad(d: Dir | "jump", on: boolean): void; reset(): void } | null>(null);
  const [home, setHome] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const r = new Raster(W, H);
    const buf = document.createElement("canvas");
    buf.width = W;
    buf.height = H;
    const bctx = buf.getContext("2d") as CanvasRenderingContext2D;
    const image = bctx.createImageData(W, H);
    const lut = new Uint32Array(PALETTE_KEYS.length);
    const little = new Uint8Array(new Uint32Array([1]).buffer)[0] === 1;
    const refreshPalette = () => {
      const css = getComputedStyle(document.documentElement);
      PALETTE_KEYS.forEach((key, i) => {
        const entry = i === 0 ? palette.k : palette[key];
        const [cr, cg, cb] = parseHex(css.getPropertyValue(entry.var), entry.hex);
        lut[i] = little ? (255 << 24) | (cb << 16) | (cg << 8) | cr : (cr << 24) | (cg << 16) | (cb << 8) | 255;
      });
    };
    let scale = 1;
    let viewW = W;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      // Only the width decides, so the taller narrow box cannot flip it back.
      viewW = rect.width > 0 && rect.width < NARROW ? HALF : W;
      wrap.closest(".level")?.toggleAttribute("data-narrow", viewW === HALF);
      const s = Math.max(1, Math.min(4, Math.floor((rect.width * (window.devicePixelRatio || 1)) / viewW) || 1));
      if (s !== scale || canvas.width !== viewW * s) {
        scale = s;
        canvas.width = viewW * s;
        canvas.height = H * s;
      }
    };

    let reduced = prefersReducedMotion();
    const keys = new Set<Dir>();
    const pads = new Set<Dir>();
    let jumpHeld = false;
    let x = 16;
    let y = GROUND - BOT_H;
    let vx = 0;
    let vy = 0;
    let grounded = true;
    let coyote = 0;
    let buffered = 0;
    let facingLeft = false;
    let walkClock = 0;
    let squash = 0;
    let dust: Dust[] = [];
    let done = false;
    let visible = true;

    const held = (d: Dir) => keys.has(d) || pads.has(d);
    const reset = () => {
      x = 16;
      y = GROUND - BOT_H;
      vx = vy = 0;
      grounded = true;
      done = false;
      dust = [];
      setHome(false);
      setMessage("Level reset. Drive AB-01 to the HOME dock.");
      loop.wake();
    };

    const step = (dt: number) => {
      if (done) return;
      const dir = (held("right") ? 1 : 0) - (held("left") ? 1 : 0);
      vx = dir * RUN;
      if (dir) facingLeft = dir < 0;
      coyote = grounded ? COYOTE : Math.max(0, coyote - dt);
      buffered = Math.max(0, buffered - dt);
      if (buffered > 0 && coyote > 0) {
        vy = -JUMP_V;
        grounded = false;
        coyote = 0;
        buffered = 0;
      }
      // Shorter hop when the jump is let go early (still clears one case).
      if (!jumpHeld && vy < -JUMP_V * 0.62) vy = -JUMP_V * 0.62;
      vy = Math.min(420, vy + GRAVITY * dt);

      // Horizontal move, then resolve against cases.
      x = Math.max(0, Math.min(W - BOT_W, x + vx * dt));
      const hb = () => ({ x: x + 3, y, w: BOT_W - 6, h: BOT_H });
      for (const s of SOLIDS) {
        const b = hb();
        if (b.x < s.x + s.w && b.x + b.w > s.x && b.y < s.y + s.h && b.y + b.h > s.y) {
          x = vx > 0 ? s.x - b.w - 3 : s.x + s.w - 3;
        }
      }
      // Vertical move.
      const wasGrounded = grounded;
      y += vy * dt;
      grounded = false;
      if (y + BOT_H >= GROUND) {
        y = GROUND - BOT_H;
        vy = 0;
        grounded = true;
      }
      for (const s of SOLIDS) {
        const b = hb();
        if (b.x < s.x + s.w && b.x + b.w > s.x && b.y < s.y + s.h && b.y + b.h > s.y) {
          if (vy >= 0) {
            y = s.y - BOT_H;
            vy = 0;
            grounded = true;
          } else {
            y = s.y + s.h;
            vy = 0;
          }
        }
      }
      if (grounded && !wasGrounded && !reduced) {
        squash = 0.08;
        for (let i = 0; i < 6; i++) dust.push({ x: x + 8, y: y + BOT_H - 1, vx: (Math.random() - 0.5) * 60, vy: -Math.random() * 30, life: 0.3 });
      }
      squash = Math.max(0, squash - dt);
      walkClock = grounded && vx ? walkClock + dt : 0;
      for (const d of dust) {
        d.x += d.vx * dt;
        d.y += d.vy * dt;
        d.vy += 120 * dt;
        d.life -= dt;
      }
      dust = reduced ? [] : dust.filter((d) => d.life > 0);

      if (grounded && x + 8 > DOCK_X + 6 && x + 8 < DOCK_X + 18) {
        done = true;
        vx = 0;
        setMessage("AB-01 is home. Signal found.");
        setHome(true);
        emit("ab:home", {});
      }
    };

    const render = () => {
      // The view's left edge in world pixels (0 unless narrow).
      const camX =
        viewW === W ? 0 : reduced ? (x + BOT_W / 2 > HALF ? HALF : 0) : Math.max(0, Math.min(W - viewW, Math.round(x + BOT_W / 2 - viewW / 2)));
      r.clear();
      // Back wall: rack silhouettes and a dither horizon, then the floor.
      for (let i = 0; i < 6; i++) r.rect(8 + i * 54, 60, 30, GROUND - 60, "c");
      for (let i = 0; i < 6; i++) for (let j = 0; j < 5; j++) r.rect(12 + i * 54, 68 + j * 14, 22, 2, "h");
      for (let xx = 0; xx < W; xx++) for (let yy = 0; yy < 8; yy++) if ((xx + yy) % (yy < 4 ? 4 : 2) === 0) r.set(xx, GROUND - 8 + yy, "i");
      r.rect(0, GROUND, W, H - GROUND, "s");
      r.rect(0, GROUND, W, 2, "a");
      for (let xx = 0; xx < W; xx += 16) r.rect(xx, GROUND + 2, 1, H - GROUND, "i");

      r.text("SIGNAL LOST", camX + 8, 8, "r");
      r.text("DRIVE AB-01 HOME", camX + 8, 20, "m");
      for (const c of CASES) for (let k = 0; k < c.n; k++) r.sprite("case", c.x, GROUND - (k + 1) * CASE_H);
      r.sprite("dock", DOCK_X, GROUND - 32);
      r.text("HOME", DOCK_X + 1, GROUND - 44, done ? "g" : "t");

      const frame = !grounded ? 2 : walkClock ? 1 + (Math.floor(walkClock * 8) % 4) : 0;
      if (squash > 0) r.sprite("ab01-sit", Math.round(x), Math.round(y), 0, facingLeft);
      else if (done) r.sprite("ab01-wave", Math.round(x), Math.round(y), 0, facingLeft);
      else r.sprite("ab01", Math.round(x), Math.round(y), frame, facingLeft);
      for (const d of dust) r.set(d.x, d.y, "m");
      if (done) r.text("SIGNAL FOUND", camX + viewW - 8 - Raster.textWidth("SIGNAL FOUND"), viewW === W ? 8 : 32, "g");

      const out = new Uint32Array(image.data.buffer);
      for (let i = 0; i < r.px.length; i++) out[i] = lut[r.px[i]];
      bctx.putImageData(image, 0, 0);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(buf, camX, 0, viewW, H, 0, 0, viewW * scale, H * scale);
    };

    const settled = () => done || (grounded && !held("left") && !held("right") && buffered <= 0 && squash <= 0 && dust.length === 0);
    const loop = createLoop(step, render, () => visible && !document.hidden && !isEstop() && !settled());

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key;
      if (k === "ArrowLeft" || k === "a" || k === "A") keys.add("left");
      else if (k === "ArrowRight" || k === "d" || k === "D") keys.add("right");
      else if (k === " " || k === "ArrowUp" || k === "w" || k === "W") {
        if (!e.repeat) buffered = BUFFER;
        jumpHeld = true;
      } else if (k === "r" || k === "R") reset();
      else if (k === "Escape") {
        keys.clear();
        wrap.blur();
        document.getElementById("drive-home")?.focus();
      } else return;
      e.preventDefault();
      loop.wake();
    };
    const onKeyUp = (e: KeyboardEvent) => {
      const k = e.key;
      if (k === "ArrowLeft" || k === "a" || k === "A") keys.delete("left");
      if (k === "ArrowRight" || k === "d" || k === "D") keys.delete("right");
      if (k === " " || k === "ArrowUp" || k === "w" || k === "W") jumpHeld = false;
    };
    const onBlur = () => {
      keys.clear();
      jumpHeld = false;
    };
    wrap.addEventListener("keydown", onKeyDown);
    wrap.addEventListener("keyup", onKeyUp);
    wrap.addEventListener("blur", onBlur);

    api.current = {
      pad(d, isOn) {
        if (d === "jump") {
          if (isOn) buffered = BUFFER;
          jumpHeld = isOn;
        } else if (isOn) pads.add(d);
        else pads.delete(d);
        loop.wake();
      },
      reset,
    };

    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) loop.wake();
      else loop.stop();
    });
    io.observe(wrap);
    const onVis = () => (document.hidden ? loop.stop() : loop.wake());
    document.addEventListener("visibilitychange", onVis);
    const ro = new ResizeObserver(() => {
      resize();
      render();
    });
    ro.observe(canvas);
    const themeWatch = new MutationObserver(() => {
      refreshPalette();
      render();
    });
    themeWatch.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    const offStop = on("ab:estop", ({ on: latched }) => (latched ? loop.stop() : loop.wake()));
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onMotion = () => {
      reduced = mq.matches;
    };
    mq.addEventListener?.("change", onMotion);

    refreshPalette();
    resize();
    render();
    wrap.focus();
    return () => {
      loop.stop();
      wrap.removeEventListener("keydown", onKeyDown);
      wrap.removeEventListener("keyup", onKeyUp);
      wrap.removeEventListener("blur", onBlur);
      io.disconnect();
      ro.disconnect();
      themeWatch.disconnect();
      offStop();
      mq.removeEventListener?.("change", onMotion);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  useEffect(() => {
    if (home) homeRef.current?.focus();
  }, [home]);

  const pad = useCallback(
    (d: Dir | "jump") => ({
      onPointerDown: (e: RPointerEvent<HTMLButtonElement>) => {
        e.preventDefault();
        api.current?.pad(d, true);
      },
      onPointerUp: () => api.current?.pad(d, false),
      onPointerLeave: () => api.current?.pad(d, false),
      onPointerCancel: () => api.current?.pad(d, false),
      onContextMenu: (e: RMouseEvent) => e.preventDefault(),
    }),
    []
  );

  return (
    <div className="level">
      <div className="px-frame px-frame--crt">
        <div className="px-titlebar">
          <span className="px-titlebar__label">Recovery / AB-01</span>
          <span className="px-titlebar__right">SIM</span>
        </div>
        <div className="crt-screen level__screen">
          <div
            ref={wrapRef}
            className="level__play"
            role="application"
            aria-label="Drive AB-01 home"
            aria-describedby="level-help"
            tabIndex={0}
          >
            <canvas ref={canvasRef} width={W} height={H} aria-hidden="true" />
          </div>
        </div>
        <div className="level__pads">
          <button type="button" className="tpad__btn level__pad" aria-label="Left" {...pad("left")}>
            <span aria-hidden="true">&lt;</span>
          </button>
          <button type="button" className="tpad__btn level__pad" aria-label="Right" {...pad("right")}>
            <span aria-hidden="true">&gt;</span>
          </button>
          <button type="button" className="tpad__btn level__pad level__pad--jump" {...pad("jump")}>
            <span>Jump</span>
          </button>
          <button type="button" className="px-btn px-btn--ghost px-btn--compact" onClick={() => api.current?.reset()}>
            <span>Restart</span>
          </button>
        </div>
      </div>
      <p id="level-help" className="level__help">
        Arrow keys or A and D to drive, Space or Up to jump, R to restart, Esc to let go. On touch, use the pads.
      </p>
      <p className="sr-only" role="status" aria-live="polite">
        {message}
      </p>
      {home && (
        <p className="level__done">
          <Link href="/">
            <a ref={homeRef} className="px-btn px-btn--primary">
              <span>Signal found. Go home</span>
            </a>
          </Link>
        </p>
      )}
    </div>
  );
}
