import type { ProgramHandle } from "@/engine/program";
import { STREAM, chaosBatch, type Crate, type RawCrate } from "./crates";
import { inspect, type Inspection, type Outcome } from "./inspect";

/**
 * The depot's moving parts, kept outside React: a belt of crates, a scanner, and counters.
 * The component subscribes with useSyncExternalStore, so the learner's Python is only ever
 * called from timers and button handlers, never during a render.
 */

export interface Arrival {
  crate: Crate;
  insp: Inspection;
}

export interface Counts {
  processed: number;
  LOAD: number;
  QUARANTINE: number;
  REJECT: number;
  HELD: number;
  UNSORTED: number;
  /** Crates for which at least one learner function raised an uncaught error. */
  crashed: number;
}

export interface ErrorTally {
  name: string;
  count: number;
  /** True when this was an uncaught crash rather than an error the learner's code handled. */
  uncaught: boolean;
}

export interface TrailItem {
  id: number;
  label: string;
  outcome: Outcome;
}

export interface Snapshot {
  started: boolean;
  playing: boolean;
  /** Set when an unprotected crash has stopped the belt (before lesson 2). */
  halted: string | null;
  current: Arrival | null;
  trail: TrailItem[];
  upcoming: Pick<Crate, "id" | "label" | "kind">[];
  counts: Counts;
  errors: ErrorTally[];
  chaos: { sent: number; done: number; crashed: number } | null;
}

const EMPTY_COUNTS: Counts = { processed: 0, LOAD: 0, QUARANTINE: 0, REJECT: 0, HELD: 0, UNSORTED: 0, crashed: 0 };
const BELT_MS = 2600;
const CHAOS_MS = 520;
const AHEAD = 3;

export class DepotSim {
  private listeners = new Set<() => void>();
  private snap: Snapshot;
  private queue: Crate[] = [];
  private streamAt = 0;
  private nextId = 1;
  private chaosRuns = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private started = false;
  private disposed = false;
  private visible = true;
  private errors = new Map<string, ErrorTally>();

  private program: ProgramHandle | null;
  private unlocked: ReadonlySet<string>;

  /** `program` may be null: the sim then only holds the blueprint state and never calls anything. */
  constructor(program: ProgramHandle | null, unlocked: ReadonlySet<string>, autoplay = true) {
    this.program = program;
    this.unlocked = unlocked;
    this.snap = {
      started: false,
      playing: autoplay,
      halted: null,
      current: null,
      trail: [],
      upcoming: [],
      counts: EMPTY_COUNTS,
      errors: [],
      chaos: null,
    };
    this.refill();
    this.publish({});
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = () => this.snap;

  // ── lifecycle ──

  /** Starts (or resumes, after a React strict-mode remount) the belt. */
  start() {
    if (!this.program) return;
    this.disposed = false;
    if (!this.started) {
      this.started = true;
      this.advance();
    }
    this.schedule();
  }

  /** Stops the timers. Safe to call more than once; start() resumes. */
  stop() {
    this.disposed = true;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  setVisible(visible: boolean) {
    this.visible = visible;
  }

  // ── controls ──

  setPlaying(playing: boolean) {
    this.publish({ playing });
  }

  next() {
    if (!this.snap.halted) this.advance();
  }

  /** Restart the belt after an unprotected crash stopped it. */
  reboot() {
    if (this.snap.halted) this.publish({ halted: null });
  }

  throwChaos(count = 12) {
    if (this.snap.halted) return;
    this.chaosRuns++;
    const batch = chaosBatch(this.chaosRuns * 7919 + 13, count);
    const crates = batch.map((b) => this.make(b, "chaos"));
    this.queue.unshift(...crates);
    this.publish({ chaos: { sent: count, done: 0, crashed: 0 }, playing: true });
    this.schedule(180);
  }

  send(raw: string) {
    if (this.snap.halted) return;
    this.queue.unshift(this.make({ label: "your manifest", raw }, "own"));
    this.advance();
  }

  // ── internals ──

  private make(raw: RawCrate, kind: Crate["kind"]): Crate {
    return { id: this.nextId++, label: raw.label, raw: raw.raw, kind };
  }

  private refill() {
    while (this.queue.length < AHEAD) {
      this.queue.push(this.make(STREAM[this.streamAt++ % STREAM.length], "stream"));
    }
  }

  private schedule(delay?: number) {
    if (this.disposed) return;
    if (this.timer) clearTimeout(this.timer);
    const chaosPending = this.queue.some((c) => c.kind === "chaos");
    this.timer = setTimeout(() => {
      this.timer = null;
      if (this.disposed) return;
      if (this.visible && !this.snap.halted && (this.snap.playing || chaosPending)) this.advance();
      this.schedule();
    }, delay ?? (chaosPending ? CHAOS_MS : BELT_MS));
  }

  private advance() {
    const program = this.program;
    if (this.disposed || !program) return;
    const crate = this.queue.shift();
    if (!crate) return;
    this.refill();

    let insp: Inspection;
    try {
      insp = inspect(program, this.unlocked, crate.raw);
    } catch (err) {
      // inspect() is written never to throw; this is the belt-and-braces net for the scene itself
      insp = {
        raw: crate.raw,
        readable: false,
        rows: [],
        outcome: "CRASH",
        reasons: [String((err as Error)?.message ?? err)],
        errorType: null,
        crashes: [{ fn: "scene", type: "Error", message: String((err as Error)?.message ?? err) }],
        flags: [],
        parseAt: null,
        readMessage: null,
        logLines: null,
        baysHeld: null,
        audit: [],
      };
    }

    const counts = { ...this.snap.counts, processed: this.snap.counts.processed + 1 };
    if (insp.outcome === "LOAD" || insp.outcome === "QUARANTINE" || insp.outcome === "REJECT" || insp.outcome === "HELD" || insp.outcome === "UNSORTED") counts[insp.outcome]++;
    const crashed = insp.crashes.length > 0;
    if (crashed) counts.crashed++;

    if (insp.errorType) this.tally(insp.errorType, false);
    for (const c of insp.crashes) this.tally(c.type, true);

    const previous = this.snap.current;
    const trail = previous
      ? [{ id: previous.crate.id, label: previous.crate.label, outcome: previous.insp.outcome }, ...this.snap.trail].slice(0, 3)
      : this.snap.trail;

    let chaos = this.snap.chaos;
    if (chaos && crate.kind === "chaos") {
      chaos = { ...chaos, done: chaos.done + 1, crashed: chaos.crashed + (crashed ? 1 : 0) };
    }

    // Before lesson 2 nothing catches a crash, so one takes the whole gate down.
    const halted = crashed && !this.unlocked.has("cc-scale") ? `${insp.crashes[0].fn}() raised ${insp.crashes[0].type}` : null;

    this.publish({ current: { crate, insp }, trail, counts, chaos, halted });
  }

  private tally(name: string, uncaught: boolean) {
    const key = `${uncaught ? "!" : ""}${name}`;
    const t = this.errors.get(key);
    if (t) t.count++;
    else this.errors.set(key, { name, count: 1, uncaught });
  }

  private publish(patch: Partial<Snapshot>) {
    const errors = [...this.errors.values()].sort((a, b) => b.count - a.count).slice(0, 7);
    this.snap = {
      ...this.snap,
      started: this.started,
      upcoming: this.queue.slice(0, AHEAD).map((c) => ({ id: c.id, label: c.label, kind: c.kind })),
      errors,
      ...patch,
    };
    this.listeners.forEach((l) => l());
  }
}
