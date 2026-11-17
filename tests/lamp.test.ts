// lib/lamp.ts against a stubbed DOM (no jsdom): pointermove never reads
// layout, the rect is read once on enter and again only after a scroll, each
// frame makes one style write, and E-STOP, reduced motion, and Text Mode
// detach it and clear every trace.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type Listener = (e: unknown) => void;

class Emitter {
  listeners = new Map<string, Set<Listener>>();
  addEventListener(type: string, fn: Listener) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type)!.add(fn);
  }
  removeEventListener(type: string, fn: Listener) {
    this.listeners.get(type)?.delete(fn);
  }
  dispatchEvent(e: { type: string }) {
    this.listeners.get(e.type)?.forEach((fn) => fn(e));
    return true;
  }
  count(type: string) {
    return this.listeners.get(type)?.size ?? 0;
  }
}

class ClassList {
  set = new Set<string>();
  add(c: string) {
    this.set.add(c);
  }
  remove(c: string) {
    this.set.delete(c);
  }
  contains(c: string) {
    return this.set.has(c);
  }
}

class FakeEl {
  classList = new ClassList();
  attrs = new Set<string>();
  props = new Map<string, string>();
  rectReads = 0;
  writes = 0;
  style = {
    setProperty: (k: string, v: string) => {
      this.writes++;
      this.props.set(k, v);
    },
    removeProperty: (k: string) => {
      this.props.delete(k);
    },
  };
  constructor(public lamp: FakeEl | null = null, public left = 100, public top = 50, public inDialog = false) {}
  closest(sel: string) {
    if (sel === "dialog") return this.inDialog ? {} : null;
    return this.lamp;
  }
  getBoundingClientRect() {
    this.rectReads++;
    return { left: this.left, top: this.top } as DOMRect;
  }
  hasAttribute(a: string) {
    return this.attrs.has(a);
  }
}

let win: Emitter;
let doc: Emitter & { documentElement: FakeEl };
let frames: (() => void)[];
let mq: { reduced: boolean; fine: boolean; rmListeners: Set<() => void> };
let observers: (() => void)[];

const flush = () => {
  const run = frames;
  frames = [];
  run.forEach((f) => f());
};
// lib/bus.ts reads only `type` and `detail`, so a plain object stands in for the CustomEvent.
const estop = (on: boolean) => win.dispatchEvent({ type: "ab:estop", detail: { on } } as never);
const pointer = (type: string, target: unknown, x: number, y: number, relatedTarget: unknown = target) =>
  doc.dispatchEvent({ type, target, clientX: x, clientY: y, relatedTarget } as never);

beforeEach(() => {
  vi.resetModules();
  frames = [];
  observers = [];
  mq = { reduced: false, fine: true, rmListeners: new Set() };
  win = Object.assign(new Emitter(), {
    requestAnimationFrame: (cb: () => void) => frames.push(cb),
    cancelAnimationFrame: () => {
      frames = [];
    },
    matchMedia: (q: string) => ({
      get matches() {
        return q.includes("reduced-motion") ? mq.reduced : mq.fine;
      },
      addEventListener: (_: string, fn: () => void) => mq.rmListeners.add(fn),
      removeEventListener: (_: string, fn: () => void) => mq.rmListeners.delete(fn),
    }),
  });
  doc = Object.assign(new Emitter(), { documentElement: new FakeEl() });
  vi.stubGlobal("window", win);
  vi.stubGlobal("document", doc);
  vi.stubGlobal("MutationObserver", class {
    constructor(private cb: () => void) {}
    observe() {
      observers.push(this.cb);
    }
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

async function startLamp() {
  const lamp = await import("../lib/lamp");
  lamp.start();
  return lamp;
}

describe("lamp", () => {
  it("attaches with html.lamp-on and lights the frame under the pointer", async () => {
    await startLamp();
    expect(doc.documentElement.classList.contains("lamp-on")).toBe(true);
    const card = new FakeEl(null, 100, 50);
    card.lamp = card;
    const child = new FakeEl(card);
    pointer("pointerover", child, 140, 90);
    expect(card.rectReads).toBe(0); // no layout read in the event handler
    flush();
    expect(card.classList.contains("is-lit")).toBe(true);
    expect(card.props.get("--lamp")).toBe("40px 40px");
    expect(card.rectReads).toBe(1);
  });

  it("pointermove never reads layout and makes one style write per frame", async () => {
    await startLamp();
    const card = new FakeEl();
    card.lamp = card;
    pointer("pointerover", card, 110, 60);
    flush();
    const reads = card.rectReads;
    const writes = card.writes;
    for (let i = 0; i < 10; i++) pointer("pointermove", card, 120 + i, 70 + i);
    expect(card.rectReads).toBe(reads);
    expect(frames.length).toBe(1); // ten moves, one frame scheduled
    flush();
    expect(card.writes - writes).toBe(1);
    expect(card.rectReads).toBe(reads); // the rect is cached until something makes it stale
    expect(card.props.get("--lamp")).toBe("29px 29px");
  });

  it("re-reads the rect once after a scroll", async () => {
    await startLamp();
    const card = new FakeEl();
    card.lamp = card;
    pointer("pointerover", card, 110, 60);
    flush();
    win.dispatchEvent({ type: "scroll" });
    win.dispatchEvent({ type: "scroll" });
    card.top = 20;
    flush();
    expect(card.rectReads).toBe(2);
    expect(card.props.get("--lamp")).toBe("10px 40px");
  });

  it("skips frames inside dialogs and clears on leaving", async () => {
    await startLamp();
    const dialogFrame = new FakeEl(null, 0, 0, true);
    dialogFrame.lamp = dialogFrame;
    pointer("pointerover", dialogFrame, 10, 10);
    flush();
    expect(dialogFrame.classList.contains("is-lit")).toBe(false);

    const card = new FakeEl();
    card.lamp = card;
    pointer("pointerover", card, 110, 60);
    flush();
    pointer("pointerover", new FakeEl(null), 5, 5);
    flush();
    expect(card.classList.contains("is-lit")).toBe(false);
    expect(card.props.has("--lamp")).toBe(false);
  });

  it("detaches on E-STOP and re-attaches on release", async () => {
    await startLamp();
    const card = new FakeEl();
    card.lamp = card;
    pointer("pointerover", card, 110, 60);
    flush();
    doc.documentElement.attrs.add("data-estop");
    estop(true);
    expect(doc.documentElement.classList.contains("lamp-on")).toBe(false);
    expect(card.classList.contains("is-lit")).toBe(false);
    expect(card.props.has("--lamp")).toBe(false);
    expect(doc.count("pointermove")).toBe(0);
    pointer("pointermove", card, 120, 70);
    expect(frames.length).toBe(0);

    doc.documentElement.attrs.delete("data-estop");
    estop(false);
    expect(doc.documentElement.classList.contains("lamp-on")).toBe(true);
    expect(doc.count("pointermove")).toBe(1);
  });

  it("detaches when reduced motion turns on and when Text Mode flips", async () => {
    await startLamp();
    mq.reduced = true;
    mq.rmListeners.forEach((fn) => fn());
    expect(doc.documentElement.classList.contains("lamp-on")).toBe(false);
    mq.reduced = false;
    mq.rmListeners.forEach((fn) => fn());
    expect(doc.documentElement.classList.contains("lamp-on")).toBe(true);

    doc.documentElement.attrs.add("data-plain");
    observers.forEach((fn) => fn());
    expect(doc.documentElement.classList.contains("lamp-on")).toBe(false);
    expect(doc.count("pointerover")).toBe(0);
  });

  it("refuses to run on a coarse pointer", async () => {
    mq.fine = false;
    const lamp = await startLamp();
    expect(lamp.lampAllowed()).toBe(false);
    expect(doc.documentElement.classList.contains("lamp-on")).toBe(false);
  });
});
