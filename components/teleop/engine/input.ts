// Operator input. Keys are read only from the focused application wrapper,
// so arrows scroll the page as usual everywhere else. Pointer events on the
// canvas set a click/drag target; touch pads feed the same state.
export type Dir = "up" | "down" | "left" | "right";

export interface InputHandlers {
  grip(): void;
  estop(): void;
  clear(): void;
  rec(): void;
  release(): void;
  /** Any operator input (resets the watchdog, wakes the loop). */
  activity(): void;
}

const KEY_DIRS: Record<string, Dir> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  w: "up",
  s: "down",
  a: "left",
  d: "right",
  W: "up",
  S: "down",
  A: "left",
  D: "right",
};

export class Controls {
  private keys = new Set<Dir>();
  private pads = new Set<Dir>();
  keyHold = false;
  padHold = false;
  /** Logical-pixel target from a mouse click or touch drag, while pressed. */
  pointer: { x: number; y: number } | null = null;

  dir(d: Dir) {
    return this.keys.has(d) || this.pads.has(d);
  }

  get anyDir() {
    return this.keys.size > 0 || this.pads.size > 0;
  }

  get hold() {
    return this.keyHold || this.padHold;
  }

  setPad(d: Dir, on: boolean) {
    if (on) this.pads.add(d);
    else this.pads.delete(d);
  }

  /** Drops every held input (blur, Esc, E-STOP). */
  releaseAll() {
    this.keys.clear();
    this.pads.clear();
    this.keyHold = false;
    this.padHold = false;
    this.pointer = null;
  }

  attach(wrapper: HTMLElement, canvas: HTMLCanvasElement, logicalW: number, logicalH: number, h: InputHandlers) {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "Shift") {
        this.keyHold = true;
        h.activity();
        return;
      }
      const d = KEY_DIRS[e.key];
      if (d) {
        e.preventDefault();
        this.keys.add(d);
        h.activity();
        return;
      }
      if (e.repeat && e.key !== "Escape") {
        if (e.key === " " || e.key === "Enter") e.preventDefault();
        return;
      }
      switch (e.key) {
        case " ":
        case "Enter":
          e.preventDefault();
          h.grip();
          break;
        case "x":
        case "X":
          e.preventDefault();
          h.estop();
          break;
        case "c":
        case "C":
          e.preventDefault();
          h.clear();
          break;
        case "r":
        case "R":
          e.preventDefault();
          h.rec();
          break;
        case "Escape":
          e.preventDefault();
          h.release();
          break;
        default:
          return;
      }
      h.activity();
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === "Shift") this.keyHold = false;
      const d = KEY_DIRS[e.key];
      if (d) this.keys.delete(d);
      h.activity();
    };
    const onBlur = () => {
      this.keys.clear();
      this.keyHold = false;
      this.pointer = null;
      h.activity();
    };

    const toLogical = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      return {
        x: ((e.clientX - r.left) / Math.max(1, r.width)) * logicalW,
        y: ((e.clientY - r.top) / Math.max(1, r.height)) * logicalH,
      };
    };
    let pointerId: number | null = null;
    const onDown = (e: PointerEvent) => {
      if (e.button !== 0 || pointerId !== null) return;
      pointerId = e.pointerId;
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch {
        /* synthetic events cannot capture */
      }
      this.pointer = toLogical(e);
      h.activity();
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerId !== pointerId) return;
      this.pointer = toLogical(e);
      h.activity();
    };
    const onUp = (e: PointerEvent) => {
      if (e.pointerId !== pointerId) return;
      pointerId = null;
      this.pointer = null;
      h.activity();
    };

    wrapper.addEventListener("keydown", onKeyDown);
    wrapper.addEventListener("keyup", onKeyUp);
    wrapper.addEventListener("blur", onBlur);
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onUp);
    canvas.addEventListener("lostpointercapture", onUp);
    return () => {
      wrapper.removeEventListener("keydown", onKeyDown);
      wrapper.removeEventListener("keyup", onKeyUp);
      wrapper.removeEventListener("blur", onBlur);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
      canvas.removeEventListener("lostpointercapture", onUp);
    };
  }
}
