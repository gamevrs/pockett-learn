/**
 * The Orchard Vision lab as a plain (non-React) store.
 *
 * It owns every call into the learner's program. Hook calls never happen while React renders: they run
 * from small time-sliced jobs (a generator per job, resumed for a few milliseconds at a time) and from
 * the belt when a fruit reaches the scanner. Results are cached per program run, so changing the
 * unlocked set or the plotted axes only recomputes what depends on it. The React scene subscribes with
 * useSyncExternalStore and draws immutable `View` snapshots.
 *
 * Everything that comes back from the program is untrusted: wrong types, nulls and exceptions all
 * degrade to "nothing to show".
 */
import type { ProgramHandle } from "@/engine/program";
import {
  AXIS_PRESETS,
  EMPTY_VARS,
  asKind,
  featsOf,
  featureRange,
  finite,
  nearestRows,
  numList,
  planeGrid,
  readVars,
  scaleOf,
  type AxisPair,
  type Feats,
  type Kind,
  type Row,
  type Vars,
} from "./data.ts";

// ───────────────────────── types ─────────────────────────

export interface Inspection {
  row: Row;
  feats: Feats | null;
  label: Kind | null;
  predicted: Kind | null;
  source: "label" | "nn" | "knn" | "sorter";
  votes: Partial<Record<Kind, number>> | null;
  prob: number | null;
  ripe: boolean | null;
  price: number | null;
}

export interface Probe {
  insp: Inspection;
  neighbours: number[];
}

export interface Classifier {
  hook: "classify" | "classify_1nn";
  batch: boolean;
}

/** A progressively filled array: `rev` bumps whenever cells were added so canvases know to repaint. */
export interface Filled<T> {
  key: string;
  data: T[];
  done: number;
  rev: number;
}

export interface GridResult extends Filled<Kind | null> {
  gw: number;
  gh: number;
  feats: Feats[];
}

export interface PricePoint {
  actual: number;
  pred: number;
  kind: Kind;
}

export interface View {
  generation: number;
  hasProgram: boolean;
  vars: Vars;
  unlocked: ReadonlySet<string>;
  axes: AxisPair;
  classifier: Classifier | null;
  preds: Filled<Kind | null> | null;
  grid: GridResult | null;
  ripeCurve: { x: number; y: number }[] | null;
  priceCompare: PricePoint[] | null;
  density: { kind: Kind; value: number }[] | null;
  probe: Probe | null;
  /** feature id -> the function or variable that feature still needs from the learner's file */
  missing: Record<string, string>;
  busy: boolean;
}

export interface HookStats {
  calls: number;
  totalMs: number;
  maxMs: number;
  jobs: Record<string, { calls: number; hookMs: number; wallMs: number }>;
}

const EMPTY_AXES: AxisPair = AXIS_PRESETS[0];
const now = () => (typeof performance !== "undefined" ? performance.now() : Date.now());
const SLICE_MS = 9;

function bump<T>(f: Filled<T | null>) {
  f.rev += 1;
  f.done = f.data.filter(Boolean).length;
}
const GRID_PLAIN = { gw: 28, gh: 18 };
const GRID_BATCH = { gw: 48, gh: 30 };

function globalStats(): HookStats | null {
  if (typeof globalThis === "undefined") return null;
  const g = globalThis as { __aiHookStats?: HookStats };
  return (g.__aiHookStats ??= { calls: 0, totalMs: 0, maxMs: 0, jobs: {} });
}

export const EMPTY_VIEW: View = {
  generation: 0,
  hasProgram: false,
  vars: EMPTY_VARS,
  unlocked: new Set(),
  axes: EMPTY_AXES,
  classifier: null,
  preds: null,
  grid: null,
  ripeCurve: null,
  priceCompare: null,
  density: null,
  probe: null,
  missing: {},
  busy: false,
};

interface Job {
  name: string;
  sig: string;
  gen: Generator<void, void, void>;
}

export class OrchardStore {
  private listeners = new Set<() => void>();
  private snapshot: View = EMPTY_VIEW;
  private program: ProgramHandle | null = null;
  private vars: Vars = EMPTY_VARS;
  private unlocked: ReadonlySet<string> = new Set();
  private axes: AxisPair = EMPTY_AXES;
  private visible = true;
  private timer: ReturnType<typeof setTimeout> | null = null;

  private queue: Job[] = [];
  private started = new Map<string, string>();
  private preds: Filled<Kind | null> | null = null;
  private grid: GridResult | null = null;
  private ripeCurve: { x: number; y: number }[] | null = null;
  private priceCompare: PricePoint[] | null = null;
  private density: { kind: Kind; value: number }[] | null = null;
  private probe: Probe | null = null;
  private jobHookMs = 0;
  private jobCalls = 0;

  // ----- external-store plumbing -----
  subscribe = (cb: () => void) => {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  };
  getSnapshot = () => this.snapshot;
  getServerSnapshot = () => EMPTY_VIEW;

  private emit() {
    this.snapshot = this.build();
    this.listeners.forEach((l) => l());
  }

  // ----- inputs from the scene -----
  configure(program: ProgramHandle | null, unlocked: ReadonlySet<string>) {
    if (program === this.program && unlocked === this.unlocked) return;
    if (program !== this.program) {
      this.program = program;
      this.vars = readVars(program);
      this.queue = [];
      this.started.clear();
      this.preds = this.grid = this.ripeCurve = this.priceCompare = this.density = this.probe = null;
    }
    this.unlocked = unlocked;
    this.refresh();
    this.emit();
  }

  setAxes(axes: AxisPair) {
    if (axes.x === this.axes.x && axes.y === this.axes.y) return;
    this.axes = axes;
    this.refresh();
    this.emit();
  }

  setVisible(v: boolean) {
    this.visible = v;
    if (v) this.schedule();
  }

  setProbe(insp: Inspection | null) {
    if (!insp) {
      this.probe = null;
    } else {
      const rows = this.vars.rows;
      const useTrain = this.unlocked.has("oa-split") && this.vars.trainIdx;
      const pool = useTrain ? (this.vars.trainIdx as number[]) : rows.map((_, i) => i);
      const k = insp.source === "nn" ? 1 : insp.source === "label" ? 0 : Math.max(1, Math.round(this.vars.k ?? 3));
      const q = insp.feats ?? featsOf(insp.row);
      this.probe = { insp, neighbours: k > 0 && rows.length ? nearestRows(rows, pool, q, k, scaleOf(this.vars)) : [] };
    }
    this.emit();
  }

  /** The scene went off screen or unmounted: stop all work. `setVisible(true)` picks it up again. */
  suspend() {
    this.visible = false;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  // ----- what the program offers right now -----
  private has(hook: string) {
    return !!this.program && this.program.hasHook(hook);
  }

  private unlockedHas(id: string) {
    return !!this.program && this.unlocked.has(id);
  }

  classifier(): Classifier | null {
    if (!this.program) return null;
    const batch = this.unlockedHas("oa-sorter") && this.has("classify_many");
    if (this.unlockedHas("oa-knn") && this.has("classify")) return { hook: "classify", batch };
    if (this.unlockedHas("oa-neighbour") && this.has("classify_1nn")) return { hook: "classify_1nn", batch: false };
    return null;
  }

  // ----- calling the learner's code (always timed, never throws) -----
  call(path: string, ...args: unknown[]): unknown {
    const program = this.program;
    if (!program) return undefined;
    const t0 = now();
    let out: unknown;
    try {
      out = program.call(path, ...args);
    } catch {
      out = undefined;
    }
    const ms = now() - t0;
    this.jobHookMs += ms;
    this.jobCalls += 1;
    const s = globalStats();
    if (s) {
      s.calls += 1;
      s.totalMs += ms;
      s.maxMs = Math.max(s.maxMs, ms);
    }
    return out;
  }

  /** Reads one fruit the way the belt scanner does: each learner function it has unlocked gets one call. */
  inspect(row: Row): Inspection {
    const has = (h: string) => this.has(h);
    const u = (id: string) => this.unlockedHas(id);
    const insp: Inspection = { row, feats: null, label: null, predicted: null, source: "label", votes: null, prob: null, ripe: null, price: null };
    if (u("oa-belt")) {
      if (has("features")) {
        const f = numList(this.call("features", row));
        if (f && f.length === 4) insp.feats = f as Feats;
      }
      if (has("label")) insp.label = asKind(this.call("label", row));
    }
    const f: Feats = insp.feats ?? featsOf(row);
    if (u("oa-sorter") && has("sort_fruit")) {
      const r = this.call("sort_fruit", f);
      if (r && typeof r === "object") {
        const o = r as Record<string, unknown>;
        insp.predicted = asKind(o.kind);
        insp.prob = finite(o.ripe_probability) ? o.ripe_probability : null;
        insp.ripe = typeof o.ripe === "boolean" ? o.ripe : null;
        insp.price = finite(o.price) ? o.price : null;
        insp.source = "sorter";
      }
    }
    if (insp.source !== "sorter") {
      if (u("oa-knn") && has("classify")) {
        insp.predicted = asKind(this.call("classify", f));
        insp.source = "knn";
      } else if (u("oa-neighbour") && has("classify_1nn")) {
        insp.predicted = asKind(this.call("classify_1nn", f));
        insp.source = "nn";
      }
      if (u("oa-ripeness") && has("ripe_probability")) {
        const p = this.call("ripe_probability", f[3]);
        insp.prob = finite(p) ? p : null;
        if (insp.prob !== null) insp.ripe = insp.prob >= 0.5;
      }
      if (u("oa-threshold") && has("is_ripe")) {
        const r = this.call("is_ripe", f[3]);
        if (typeof r === "boolean") insp.ripe = r;
      }
      if (u("oa-price") && has("price_for")) {
        const p = this.call("price_for", f);
        insp.price = finite(p) ? p : null;
      }
    }
    if (u("oa-knn") && has("votes")) {
      const v = this.call("votes", f);
      if (v && typeof v === "object" && !Array.isArray(v)) {
        const votes: Partial<Record<Kind, number>> = {};
        for (const [k, n] of Object.entries(v as Record<string, unknown>)) {
          const kind = asKind(k);
          if (kind && finite(n) && n > 0) votes[kind] = n;
        }
        if (Object.keys(votes).length) insp.votes = votes;
      }
    }
    return insp;
  }

  // ----- job scheduling -----
  private refresh() {
    if (!this.program) return;
    const gen = this.program.generation;
    const rows = this.vars.rows;
    const cl = this.classifier();
    const base = `${gen}|${rows.length}`;

    const want = (name: string, sig: string | null, make: () => Generator<void, void, void>) => {
      if (sig === null) {
        if (this.started.has(name)) {
          this.started.delete(name);
          this.queue = this.queue.filter((j) => j.name !== name);
        }
        return;
      }
      if (this.started.get(name) === sig) return;
      this.started.set(name, sig);
      this.queue = this.queue.filter((j) => j.name !== name);
      this.queue.push({ name, sig, gen: make() });
    };

    const clSig = cl && rows.length ? `${base}|${cl.hook}|${cl.batch}|${this.vars.k}` : null;
    if (!clSig) {
      this.preds = null;
      this.grid = null;
    }
    want("preds", clSig, () => this.runPreds(clSig as string, cl as Classifier));
    want("grid", clSig && `${clSig}|${this.axes.x}|${this.axes.y}`, () => this.runGrid(`${clSig}|${this.axes.x}|${this.axes.y}`, cl as Classifier));
    const ripeOk = this.unlockedHas("oa-ripeness") && this.has("ripe_probability");
    if (!ripeOk) this.ripeCurve = null;
    want("ripe", ripeOk ? base : null, () => this.runRipe(base));
    const priceOk = this.unlockedHas("oa-price") && this.has("price_for") && rows.length > 0;
    if (!priceOk) this.priceCompare = null;
    want("price", priceOk ? base : null, () => this.runPrice(base));
    const densityOk = this.unlockedHas("oa-features") && this.has("engineer") && rows.length > 0;
    if (!densityOk) this.density = null;
    want("density", densityOk ? base : null, () => this.runDensity(base));
    this.schedule();
  }

  private schedule() {
    if (this.timer || !this.queue.length || !this.visible) return;
    this.timer = setTimeout(this.pump, 0);
  }

  private pump = () => {
    this.timer = null;
    if (!this.visible) return;
    const t0 = now();
    let progressed = false;
    while (this.queue.length && now() - t0 < SLICE_MS) {
      const job = this.queue[0];
      let done = false;
      try {
        done = !!job.gen.next().done;
      } catch {
        done = true;
      }
      progressed = true;
      if (done) this.queue.shift();
    }
    if (progressed) this.emit();
    if (this.queue.length) this.timer = setTimeout(this.pump, 12);
  };

  private current(name: string, sig: string) {
    return this.started.get(name) === sig;
  }

  private logJob(name: string, wall0: number, calls0: number, hook0: number) {
    const s = globalStats();
    if (s) s.jobs[name] = { calls: this.jobCalls - calls0, hookMs: this.jobHookMs - hook0, wallMs: now() - wall0 };
  }

  /** Classify a list of measurements; yields between calls unless one batch call covers them all. */
  private *classifyAll(cl: Classifier, list: Feats[], out: (Kind | null)[], onCells: () => void, sig: string, name: string): Generator<void, void, void> {
    if (cl.batch) {
      const r = this.call("classify_many", list);
      if (Array.isArray(r)) for (let i = 0; i < list.length; i++) out[i] = asKind(r[i]);
      onCells();
      return;
    }
    for (let i = 0; i < list.length; i++) {
      if (!this.current(name, sig)) return;
      out[i] = asKind(this.call(cl.hook, list[i]));
      onCells();
      yield;
    }
  }

  private *runPreds(sig: string, cl: Classifier): Generator<void, void, void> {
    const rows = this.vars.rows;
    const w0 = now();
    const c0 = this.jobCalls;
    const h0 = this.jobHookMs;
    const result: Filled<Kind | null> = { key: sig, data: new Array(rows.length).fill(null), done: 0, rev: 0 };
    this.preds = result;
    yield* this.classifyAll(cl, rows.map(featsOf), result.data, () => bump(result), sig, "preds");
    this.logJob("preds", w0, c0, h0);
  }

  private *runGrid(sig: string, cl: Classifier): Generator<void, void, void> {
    const rows = this.vars.rows;
    const w0 = now();
    const c0 = this.jobCalls;
    const h0 = this.jobHookMs;
    const { gw, gh } = cl.batch ? GRID_BATCH : GRID_PLAIN;
    const rx = featureRange(rows, this.axes.x);
    const ry = featureRange(rows, this.axes.y);
    const feats = yield* planeGrid(rows, this.axes, rx, ry, gw, gh);
    const result: GridResult = { key: sig, gw, gh, feats, data: new Array(gw * gh).fill(null), done: 0, rev: 0 };
    this.grid = result;
    yield* this.classifyAll(cl, feats, result.data, () => bump(result), sig, "grid");
    this.logJob("grid", w0, c0, h0);
  }

  private *runRipe(sig: string): Generator<void, void, void> {
    const w0 = now();
    const c0 = this.jobCalls;
    const h0 = this.jobHookMs;
    const sugar = this.vars.rows.map((r) => r.sugar);
    const lo = sugar.length ? Math.floor(Math.min(...sugar)) - 1 : 4;
    const hi = sugar.length ? Math.ceil(Math.max(...sugar)) + 1 : 20;
    const out: { x: number; y: number }[] = [];
    const N = 40;
    for (let i = 0; i <= N; i++) {
      if (!this.current("ripe", sig)) return;
      const x = lo + ((hi - lo) * i) / N;
      const p = this.call("ripe_probability", x);
      if (finite(p)) out.push({ x, y: Math.min(1, Math.max(0, p)) });
      yield;
    }
    this.ripeCurve = out.length > 1 ? out : null;
    this.logJob("ripe", w0, c0, h0);
  }

  private *runPrice(sig: string): Generator<void, void, void> {
    const w0 = now();
    const c0 = this.jobCalls;
    const h0 = this.jobHookMs;
    const rows = this.vars.rows;
    const idx = (this.vars.testIdx ?? rows.map((_, i) => i)).slice(0, 60);
    const out: PricePoint[] = [];
    for (const i of idx) {
      if (!this.current("price", sig)) return;
      const r = rows[i];
      const p = this.call("price_for", featsOf(r));
      if (finite(p)) out.push({ actual: r.price, pred: p, kind: r.kind });
      yield;
    }
    this.priceCompare = out.length ? out : null;
    this.logJob("price", w0, c0, h0);
  }

  private *runDensity(sig: string): Generator<void, void, void> {
    const w0 = now();
    const c0 = this.jobCalls;
    const h0 = this.jobHookMs;
    const out: { kind: Kind; value: number }[] = [];
    for (const r of this.vars.rows) {
      if (!this.current("density", sig)) return;
      const e = numList(this.call("engineer", featsOf(r)));
      if (e && e.length >= 5) out.push({ kind: r.kind, value: e[4] });
      yield;
    }
    this.density = out.length ? out : null;
    this.logJob("density", w0, c0, h0);
  }

  // ----- the published snapshot -----
  private build(): View {
    const vars = this.vars;
    const need: Record<string, string | null> = {};
    const hook = (id: string, ...names: string[]) => {
      if (!this.unlockedHas(id)) return;
      const miss = names.find((n) => !this.has(n));
      if (miss) need[id] = `${miss}()`;
    };
    const variable = (id: string, name: string, ok: boolean) => {
      if (this.unlockedHas(id) && !ok) need[id] = name;
    };
    hook("oa-belt", "features", "label");
    variable("oa-stats", "stats", !!vars.stats);
    variable("oa-matrix", "column_means", !!vars.colMeans && (!!vars.xList || vars.rows.length > 0));
    variable("oa-scale", "scaled_sample", !!vars.scaledSample);
    hook("oa-neighbour", "classify_1nn");
    hook("oa-knn", "classify");
    variable("oa-split", "train_idx", !!vars.trainIdx && !!vars.testIdx && vars.trainAcc !== null && vars.testAcc !== null);
    variable("oa-confusion", "confusion", !!vars.confusion);
    variable("oa-line", "line_w", vars.lineW !== null && vars.lineB !== null);
    variable("oa-descent", "fit_history", vars.fitHistory.length > 1);
    hook("oa-price", "price_for");
    hook("oa-ripeness", "ripe_probability");
    variable("oa-threshold", "threshold_table", vars.thresholds.length > 1);
    variable("oa-fit", "fit_curve", vars.fitCurve.length > 1);
    hook("oa-features", "engineer");
    hook("oa-sorter", "sort_fruit");
    const missing: Record<string, string> = {};
    for (const [k, v] of Object.entries(need)) if (v) missing[k] = v;
    return {
      generation: this.program?.generation ?? 0,
      hasProgram: !!this.program,
      vars,
      unlocked: this.unlocked,
      axes: this.axes,
      classifier: this.classifier(),
      preds: this.preds,
      grid: this.grid,
      ripeCurve: this.ripeCurve,
      priceCompare: this.priceCompare,
      density: this.density,
      probe: this.probe,
      missing,
      busy: this.queue.length > 0,
    };
  }
}
