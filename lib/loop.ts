// Fixed 60 Hz simulation with an accumulator, rendered on rAF (the 404
// level's loop). It only runs while `shouldRun()` says so (on screen, tab
// visible, no E-STOP, not settled); anything that changes the world calls wake().
export const STEP = 1 / 60;

export interface Loop {
  wake(): void;
  stop(): void;
  readonly running: boolean;
}

export function createLoop(step: (dt: number) => void, render: () => void, shouldRun: () => boolean): Loop {
  let raf = 0;
  let last = 0;
  let acc = 0;
  let running = false;

  const frame = (t: number) => {
    raf = 0;
    acc += Math.min(0.25, Math.max(0, (t - last) / 1000));
    last = t;
    let n = 0;
    while (acc >= STEP && n < 15) {
      step(STEP);
      acc -= STEP;
      n++;
    }
    if (n === 15) acc = 0;
    render();
    if (shouldRun()) raf = requestAnimationFrame(frame);
    else running = false;
  };

  return {
    wake() {
      if (running) return;
      running = true;
      last = performance.now();
      acc = STEP; // take one step right away so input feels instant
      raf = requestAnimationFrame(frame);
    },
    stop() {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      running = false;
    },
    get running() {
      return running;
    },
  };
}
