// The operator-to-arm latency link the engine runs every 60 Hz step: a new
// operator command goes in only when it changed, and the arm reads the command
// that is due after the set delay (or the live one before anything is due).
// Kept apart from the engine so the headless pipeline tests drive this exact code.
import type { Command } from "./episodes";
import { CommandBuffer } from "./latency";

export class CommandLink {
  private readonly buffer = new CommandBuffer<Command>(256);
  private pushed: Command;

  constructor(op: Command) {
    this.pushed = { ...op };
    this.buffer.reset({ ...op });
  }

  /** Drops everything in flight and starts again from this command. */
  reset(op: Command) {
    this.pushed = { ...op };
    this.buffer.reset({ ...op });
  }

  /** Sends the operator command if it differs from the last one sent. */
  offer(now: number, op: Command) {
    if (op.x === this.pushed.x && op.y === this.pushed.y && op.grip === this.pushed.grip) return;
    this.pushed = { ...op };
    this.buffer.push(now, this.pushed);
  }

  /** What the arm sees now: the command due after `latencyMs`, else the live one. */
  sample(now: number, latencyMs: number, op: Command): Command {
    return this.buffer.sample(now, latencyMs) ?? op;
  }

  /** Commands sent but not yet due. */
  get pending() {
    return this.buffer.pending;
  }
}
