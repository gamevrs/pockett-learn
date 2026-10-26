import type { ProgramHandle } from "@/engine/program";
import { FIXTURES, MATCH_MINUTES, MatchSim, SEED_RESULTS, corrupt, rng, type ArenaEvent, type EventType, type MatchResult } from "./sim";

/**
 * The arena driver: a tiny external store that plays the stadium and talks to the learner's program.
 * It only ever touches the program through `program.call` / `program.callAsync`, and only calls a
 * hook when its feature is unlocked and the hook exists. Everything the panels show about the
 * learner's engine is read back from hooks.
 *
 * Hooks used (all optional): describeEvent, isHighlight, scoreboard.add/snapshot/reset,
 * tickClock, matchClock.display/reset, standings, reportAll, summaries, resetReporters,
 * arena.emit, arena.listenerCount, deadLetters, busWarnings, processEvent, pipelineStats, recentFailures.
 */

export interface FeedItem {
  key: number;
  event: ArenaEvent;
  /** The learner's describeEvent() text (null before it is unlocked). */
  line: string | null;
  /** The learner's isHighlight() answer (null before it is unlocked). */
  highlight: boolean | null;
  /** How many listeners the bus reported running (arena.emit's return value). */
  ran: number | null;
  /** What the pipeline answered: delivered, dropped or failed. */
  outcome: string | null;
}

export interface StandingRow {
  team: string;
  name: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}

export interface BusState {
  counts: Record<string, number>;
  emitted: Record<string, number>;
  last: { type: string; ran: number | null; nonce: number } | null;
  letters: { type: string; message: string }[];
  warnings: string[];
}

export interface PipelineState {
  stats: { received: number; delivered: number; dropped: number; failed: number } | null;
  failures: { stage: string; message: string; eventId: number | null }[];
  noisy: boolean;
}

export interface ArenaSnapshot {
  running: boolean;
  speed: number;
  home: string;
  away: string;
  fixture: number;
  minute: number;
  status: "live" | "full-time";
  /** The real score (the stadium's own count), for comparison. */
  truth: { home: number; away: number };
  /** The learner's scoreboard.snapshot(). */
  scores: Record<string, number> | null;
  /** The learner's matchClock.display(). */
  clock: string | null;
  feed: FeedItem[];
  reel: FeedItem[];
  results: MatchResult[];
  standings: StandingRow[] | null;
  stats: Record<string, unknown> | null;
  bus: BusState;
  pipeline: PipelineState;
  error: string | null;
  counter: number;
}

const BUS_TYPES = ["goal", "foul", "timeout", "card", "*"];
const BASE_TICK = 1500;

const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const asNum = (v: unknown, fallback = 0) => (typeof v === "number" && Number.isFinite(v) ? v : fallback);

export class ArenaDriver {
  private program: ProgramHandle | null;
  private unlockedSet: ReadonlySet<string>;
  private snap: ArenaSnapshot;
  private listeners = new Set<() => void>();
  private sim: MatchSim;
  private fixture = 0;
  private timer: ReturnType<typeof setInterval> | null = null;
  private clockTimer: ReturnType<typeof setInterval> | null = null;
  private nextMatchTimer: ReturnType<typeof setTimeout> | null = null;
  private clockSeconds = 0;
  private feedKey = 0;
  private busNonce = 0;
  private queue: Promise<void> = Promise.resolve();
  private disposed = false;
  private noise = rng(99);
  private unsubscribeProgram: (() => void) | null = null;

  constructor(program: ProgramHandle | null, unlocked: ReadonlySet<string>) {
    this.program = program;
    this.unlockedSet = unlocked;
    this.sim = new MatchSim(this.fixture);
    this.snap = this.initial();
  }

  private initial(): ArenaSnapshot {
    return {
      running: true,
      speed: 1,
      home: this.sim.home,
      away: this.sim.away,
      fixture: this.fixture,
      minute: 0,
      status: "live",
      truth: { home: 0, away: 0 },
      scores: null,
      clock: null,
      feed: [],
      reel: [],
      results: SEED_RESULTS.map((r) => ({ ...r })),
      standings: null,
      stats: null,
      bus: { counts: {}, emitted: {}, last: null, letters: [], warnings: [] },
      pipeline: { stats: null, failures: [], noisy: false },
      error: null,
      counter: 0,
    };
  }

  // ── store plumbing ──
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  getSnapshot = () => this.snap;

  private set(patch: Partial<ArenaSnapshot>) {
    this.snap = { ...this.snap, ...patch, counter: this.snap.counter + 1 };
    this.listeners.forEach((l) => l());
  }

  private on(feature: string) {
    return this.unlockedSet.has(feature);
  }
  private hook(path: string, feature: string) {
    return !!this.program && !this.disposed && this.on(feature) && this.program.hasHook(path);
  }
  private call<T>(path: string, ...args: unknown[]): T | undefined {
    return this.program?.call<T>(path, ...args);
  }

  // ── lifecycle ──
  /** Safe to call again after stop() (React strict mode mounts, unmounts and mounts again). */
  start() {
    this.disposed = false;
    this.unsubscribeProgram?.();
    this.unsubscribeProgram = this.program?.subscribe(() => this.refreshError()) ?? null;
    this.refresh();
    this.applyTimers();
  }

  stop() {
    this.disposed = true;
    if (this.timer) clearInterval(this.timer);
    if (this.clockTimer) clearInterval(this.clockTimer);
    if (this.nextMatchTimer) clearTimeout(this.nextMatchTimer);
    this.timer = this.clockTimer = null;
    this.nextMatchTimer = null;
    this.unsubscribeProgram?.();
    this.unsubscribeProgram = null;
  }

  private applyTimers() {
    if (this.timer) clearInterval(this.timer);
    if (this.clockTimer) clearInterval(this.clockTimer);
    this.timer = this.clockTimer = null;
    if (!this.snap.running || this.disposed) return;
    this.timer = setInterval(() => this.tick(), BASE_TICK / this.snap.speed);
    this.clockTimer = setInterval(() => this.tickClock(), 140 / this.snap.speed);
  }

  // ── controls ──
  setRunning(running: boolean) {
    this.set({ running });
    this.applyTimers();
  }
  setSpeed(speed: number) {
    this.set({ speed });
    this.applyTimers();
  }
  stepOnce() {
    this.tick();
  }

  newMatch() {
    if (this.nextMatchTimer) clearTimeout(this.nextMatchTimer);
    this.nextMatchTimer = null;
    this.fixture = (this.fixture + 1) % FIXTURES.length;
    this.sim = new MatchSim(this.fixture, Math.floor(Date.now() / 1000) % 50);
    this.clockSeconds = 0;
    if (this.hook("scoreboard.reset", "arena-scoreboard")) this.call("scoreboard.reset");
    if (this.hook("resetReporters", "arena-stats")) this.call("resetReporters");
    if (this.hook("matchClock.reset", "arena-clock")) this.call("matchClock.reset");
    this.set({ home: this.sim.home, away: this.sim.away, fixture: this.fixture, minute: 0, status: "live", truth: { home: 0, away: 0 }, feed: [], reel: [] });
    this.refresh();
  }

  inject(type: EventType, side: "home" | "away", extra: Partial<ArenaEvent> = {}) {
    if (this.sim.finished) return;
    this.dispatch(this.sim.inject(type, side, extra));
  }

  setNoisy(noisy: boolean) {
    this.set({ pipeline: { ...this.snap.pipeline, noisy } });
  }

  /** A goal with nothing valid in it: a crash for the learner's scoreboard (and a test of the bus). */
  sendMalformed() {
    if (!this.hook("arena.emit", "arena-bus")) return;
    this.noteEmit("goal", this.call<number>("arena.emit", "goal", { id: -1, type: "goal", team: "???", minute: 1 }) ?? null);
    this.refresh();
  }

  /** An "error" event with nobody listening throws, like Node. */
  emitErrorEvent() {
    if (!this.hook("arena.emit", "arena-bus")) return;
    this.call("arena.emit", "error", { message: "Referee system offline" });
    this.refresh();
  }

  // ── the match ──
  private tick() {
    if (this.disposed || this.snap.status === "full-time") return;
    const { event } = this.sim.step();
    this.set({ minute: this.sim.minute, truth: { ...this.sim.goals } });
    if (event) this.dispatch(event);
    if (this.sim.finished) this.fullTime();
  }

  private tickClock() {
    if (this.disposed) return;
    const target = this.sim.minute * 60;
    if (this.clockSeconds >= target) return;
    const delta = Math.min(target - this.clockSeconds, 20);
    this.clockSeconds += delta;
    if (this.hook("tickClock", "arena-clock")) {
      this.call("tickClock", delta);
      const display = this.call<string>("matchClock.display");
      this.set({ clock: typeof display === "string" ? display : null });
    }
  }

  private fullTime() {
    const result = this.sim.result;
    const results = [...this.snap.results, result];
    this.set({ status: "full-time", minute: MATCH_MINUTES, results });
    this.refresh();
    if (this.nextMatchTimer) clearTimeout(this.nextMatchTimer);
    this.nextMatchTimer = setTimeout(() => this.newMatch(), 5000 / this.snap.speed);
  }

  // ── one event travels through the learner's engine ──
  private dispatch(raw: ArenaEvent) {
    const key = ++this.feedKey;
    let line: string | null = null;
    let highlight: boolean | null = null;
    if (this.hook("describeEvent", "arena-feed")) {
      const out = this.call<unknown>("describeEvent", raw);
      line = typeof out === "string" ? out : `describeEvent returned ${out === undefined ? "nothing (undefined)" : JSON.stringify(out)}`;
    }
    if (this.hook("isHighlight", "arena-highlights")) {
      const out = this.call<unknown>("isHighlight", raw);
      highlight = typeof out === "boolean" ? out : null;
    }
    const item: FeedItem = { key, event: raw, line, highlight, ran: null, outcome: null };
    const feed = [item, ...this.snap.feed].slice(0, 40);
    const reel = highlight ? [item, ...this.snap.reel].slice(0, 24) : this.snap.reel;
    this.set({ feed, reel });

    if (this.hook("processEvent", "arena-pipeline")) {
      this.viaPipeline(item);
    } else if (this.hook("arena.emit", "arena-bus")) {
      const ran = this.call<number>("arena.emit", raw.type, raw);
      this.patchItem(key, { ran: typeof ran === "number" ? ran : null });
      this.noteEmit(raw.type, typeof ran === "number" ? ran : null);
    } else {
      if (raw.type === "goal" && this.hook("scoreboard.add", "arena-scoreboard")) this.call("scoreboard.add", raw.team, raw.points ?? 1);
      if (this.hook("reportAll", "arena-stats")) this.call("reportAll", raw);
    }
    this.refresh();
  }

  private viaPipeline(item: FeedItem) {
    const program = this.program;
    if (!program) return;
    const send = async (payload: unknown) => {
      const outcome = await program.callAsync<string>("processEvent", payload);
      return outcome;
    };
    const noisy = this.snap.pipeline.noisy;
    this.queue = this.queue.then(async () => {
      if (this.disposed) return;
      const outcome = await send(item.event);
      if (this.disposed) return;
      this.patchItem(item.key, { outcome: outcome ?? "failed" });
      this.noteEmit(item.event.type, null);
      if (noisy) {
        const roll = this.noise();
        if (roll < 0.55) await send(corrupt(item.event, this.noise()));
      }
      this.refresh();
    });
  }

  private patchItem(key: number, patch: Partial<FeedItem>) {
    const apply = (list: FeedItem[]) => list.map((i) => (i.key === key ? { ...i, ...patch } : i));
    this.set({ feed: apply(this.snap.feed), reel: apply(this.snap.reel) });
  }

  private noteEmit(type: string, ran: number | null) {
    const bus = this.snap.bus;
    this.set({ bus: { ...bus, emitted: { ...bus.emitted, [type]: (bus.emitted[type] ?? 0) + 1 }, last: { type, ran, nonce: ++this.busNonce } } });
  }

  private refreshError() {
    const error = this.program?.lastError ?? null;
    if (error !== this.snap.error) this.set({ error });
  }

  /** Re-read everything the learner's engine knows. */
  refresh() {
    if (this.disposed) return;
    const patch: Partial<ArenaSnapshot> = {};
    if (this.hook("scoreboard.snapshot", "arena-scoreboard")) {
      const s = this.call<unknown>("scoreboard.snapshot");
      patch.scores = isRecord(s) ? Object.fromEntries(Object.entries(s).map(([k, v]) => [k, asNum(v)])) : null;
    }
    if (this.hook("matchClock.display", "arena-clock")) {
      const c = this.call<unknown>("matchClock.display");
      patch.clock = typeof c === "string" ? c : null;
    }
    if (this.hook("standings", "arena-standings")) {
      const rows = this.call<unknown>("standings", this.snap.results);
      patch.standings = Array.isArray(rows) ? (rows.filter(isRecord) as unknown as StandingRow[]) : null;
    }
    if (this.hook("summaries", "arena-stats")) {
      const s = this.call<unknown>("summaries");
      patch.stats = isRecord(s) ? s : null;
    }
    if (this.on("arena-bus") && this.program) {
      const counts: Record<string, number> = {};
      if (this.program.hasHook("arena.listenerCount")) for (const t of BUS_TYPES) counts[t] = asNum(this.call<unknown>("arena.listenerCount", t));
      let letters = this.snap.bus.letters;
      let warnings = this.snap.bus.warnings;
      if (this.hook("deadLetters", "arena-resilience")) {
        const l = this.call<unknown>("deadLetters");
        letters = Array.isArray(l) ? (l.filter(isRecord).map((x) => ({ type: String(x.type), message: String(x.message) })) as BusState["letters"]) : [];
      }
      if (this.hook("busWarnings", "arena-resilience")) {
        const w = this.call<unknown>("busWarnings");
        warnings = Array.isArray(w) ? w.map(String) : [];
      }
      patch.bus = { ...this.snap.bus, counts, letters, warnings };
    }
    if (this.on("arena-pipeline") && this.program) {
      const stats = this.hook("pipelineStats", "arena-pipeline") ? this.call<unknown>("pipelineStats") : null;
      const failures = this.hook("recentFailures", "arena-pipeline") ? this.call<unknown>("recentFailures") : null;
      patch.pipeline = {
        ...this.snap.pipeline,
        stats: isRecord(stats)
          ? { received: asNum(stats.received), delivered: asNum(stats.delivered), dropped: asNum(stats.dropped), failed: asNum(stats.failed) }
          : null,
        failures: Array.isArray(failures) ? (failures.filter(isRecord).slice(-6).reverse() as unknown as PipelineState["failures"]) : [],
      };
    }
    patch.error = this.program?.lastError ?? null;
    this.set(patch);
  }

  /** A lesson was passed: the set of live features changed, so re-read everything. */
  setUnlocked(unlocked: ReadonlySet<string>) {
    this.unlockedSet = unlocked;
    if (!this.disposed) this.refresh();
  }
}
