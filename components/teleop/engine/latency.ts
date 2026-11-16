// Simulated link latency. Operator commands go into a ring buffer keyed by
// timestamp (performance.now() in the browser); the arm only sees a command
// once it is `delay` ms old. Pure and allocation-free after construction.

export class CommandBuffer<T> {
  private stamps: Float64Array;
  private items: (T | undefined)[];
  private head = 0; // oldest
  private size = 0;
  private current: T | undefined;

  constructor(readonly capacity = 256) {
    this.stamps = new Float64Array(capacity);
    this.items = new Array(capacity);
  }

  /** Queues a command issued at time `t` (ms). A full buffer drops its oldest entry. */
  push(t: number, cmd: T) {
    if (this.size === this.capacity) {
      this.current = this.items[this.head];
      this.head = (this.head + 1) % this.capacity;
      this.size--;
    }
    const i = (this.head + this.size) % this.capacity;
    this.stamps[i] = t;
    this.items[i] = cmd;
    this.size++;
  }

  /**
   * The newest command at least `delay` ms old at time `now`, consuming
   * everything older. Returns the last delivered command when nothing new
   * has arrived (or undefined before the first one).
   */
  sample(now: number, delay: number): T | undefined {
    const cutoff = now - delay;
    while (this.size > 0 && this.stamps[this.head] <= cutoff) {
      this.current = this.items[this.head];
      this.items[this.head] = undefined;
      this.head = (this.head + 1) % this.capacity;
      this.size--;
    }
    return this.current;
  }

  /** Commands still in flight. */
  get pending() {
    return this.size;
  }

  /** Drops in-flight commands and makes `cmd` the delivered state. */
  reset(cmd?: T) {
    this.head = 0;
    this.size = 0;
    this.items.fill(undefined);
    this.current = cmd;
  }
}

/** A short history of simulated round-trip times for the HUD sparkline. */
export class RttTrace {
  readonly samples: Float32Array;
  private i = 0;
  private filled = 0;

  constructor(readonly length = 40) {
    this.samples = new Float32Array(length);
  }

  /** Records one RTT sample: twice the one-way delay plus a little jitter. */
  add(oneWayMs: number, rand: number) {
    const jitter = (rand - 0.5) * (4 + oneWayMs * 0.12);
    this.samples[this.i] = Math.max(0, oneWayMs * 2 + jitter);
    this.i = (this.i + 1) % this.length;
    this.filled = Math.min(this.length, this.filled + 1);
  }

  /** Samples oldest to newest. */
  ordered(): number[] {
    const out: number[] = [];
    for (let k = 0; k < this.filled; k++) out.push(this.samples[(this.i - this.filled + k + this.length) % this.length]);
    return out;
  }
}
