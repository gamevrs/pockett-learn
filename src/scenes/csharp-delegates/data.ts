import type { ProgramHandle } from "@/engine/program";
import { readAny } from "../csharp-basics/data";

export { readAny, fmtNum, plural, outputLines, parseDiagnostics, adviceFor, runtimeAdvice } from "../csharp-basics/data";
export type { BuildError } from "../csharp-basics/data";

/**
 * What the Lantern Hall desk board reads from the learner's C# program. A compiled program can't
 * be called back, so the board works from the values the program printed with
 * `Desk.Show("key", value)` (each one an `@scene {json}` line). Every value may be missing or the
 * wrong type: the readers below return `undefined` instead of guessing. Pure module, no React.
 *
 * The keys per lesson are listed in content/projects/csharp-delegates.ts.
 */

// ───────────────────────── safe readers ─────────────────────────

export const isRec = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
export const num = (v: unknown): number | undefined => (typeof v === "number" && Number.isFinite(v) ? v : undefined);
export const str = (v: unknown): string | undefined => (typeof v === "string" ? v : undefined);
export const bool = (v: unknown): boolean | undefined => (typeof v === "boolean" ? v : undefined);
const arr = (v: unknown): unknown[] | undefined => (Array.isArray(v) ? v : undefined);
const strs = (v: unknown): string[] | undefined => arr(v)?.map((x) => (typeof x === "string" ? x : x === null || x === undefined ? "" : String(x)));
const nums = (v: unknown): number[] | undefined => arr(v)?.flatMap((x) => (num(x) === undefined ? [] : [x as number]));
const recs = (v: unknown): Record<string, unknown>[] | undefined => arr(v)?.filter(isRec);

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

// ───────────────────────── the model ─────────────────────────

export interface BusDelivery {
  publisher: string;
  eventName: string;
  subscriber: string;
  payload: string;
}
export interface PropRow {
  name: string;
  kind: string;
  weight: number;
}
export interface SegmentRow {
  name: string;
  start: number;
  end: number;
  length: number;
}
export interface SpanRow {
  name: string;
  start: number;
  end: number;
  /** "done", "failed" or "cancelled" (anything else is drawn as neutral) */
  state: string;
}
export interface AttemptRow {
  number: number;
  outcome: string;
  waitMs: number;
}
export interface NodeRow {
  name: string;
  lifetime: string;
}
export interface EdgeRow {
  from: string;
  to: string;
}
export interface CueRow {
  number: number;
  name: string;
  device: string;
}
export interface BuildErrorValue {
  type: string;
  message: string;
  line: number | null;
}

export interface Desk {
  cues: { label?: string; labelerType?: string; sheet?: string[]; bright?: boolean; dim?: boolean };
  faders: { master?: number; levels?: number[]; brokenLevels?: number[] };
  chain: {
    stageNames?: string[];
    trail?: number[];
    samples?: { input: number; output: number }[];
    fade?: { linear?: number; easeIn?: number; stepped?: number; steppedName?: string };
  };
  go: { handlers?: string[]; naive?: string[]; safe?: string[]; failures?: string[]; lastWins?: number; everyReturn?: number[] };
  bus: { log?: BusDelivery[]; listeners?: number };
  observers: { meter?: number[]; alarm?: number[]; completed?: string[]; stillSubscribed?: number };
  props: { shelf?: PropRow[]; heaviest?: string; viewed?: number; judged?: string[] };
  iter: { fade?: number[]; trace?: string[]; pulse?: number[] };
  query: { source?: number; pulls?: { built?: number; pass?: number; first?: number }; kept?: number; pages?: string[][] };
  runSheet: { segments?: SegmentRow[]; overlaps?: string[]; totalMinutes?: number; endsAt?: number; lazyCheck?: string; eagerCheck?: string };
  timeline: { spans?: SpanRow[]; winner?: string; rethrown?: string; failedCount?: number };
  hold: { state?: string; stepsDone?: number; stepsTotal?: number; timeoutMessage?: string; guardedOutcome?: string };
  channel: { capacity?: number; sent?: number; handled?: string[]; waits?: number; deepest?: number };
  retry: { fog?: AttemptRow[]; fogResult?: string; slow?: AttemptRow[]; slowOutcome?: string };
  breaker: { outcomes?: string[]; transitions?: string[]; finalState?: string; serviceCalls?: number; bulkhead?: string[] };
  lifetimes: { log?: string[]; free?: number };
  wiring: { nodes?: NodeRow[]; edges?: EdgeRow[]; liveLog?: string[]; rehearsalLog?: string[]; cycleMessage?: string };
  show: { report?: { fired?: number; failed?: number; skipped?: number; peakLevel?: number; retries?: number; spotsFree?: number }; cues?: CueRow[] };
  error: BuildErrorValue | null;
}

/** The keys shown on the "Scene data" tab, in lesson order. */
export const SCENE_KEYS = [
  "cueLabel", "labelerType", "cueSheet", "brightness",
  "faders", "chain", "go", "bus", "observers", "props",
  "iter", "query", "runSheet", "spans", "timeline", "hold",
  "channel", "retry", "breaker", "lifetimes", "wiring", "show",
] as const;

const attempts = (v: unknown): AttemptRow[] | undefined =>
  recs(v)?.map((r) => ({ number: num(r.number) ?? 0, outcome: str(r.outcome) ?? "", waitMs: num(r.waitMs) ?? 0 }));

export function readDesk(p: ProgramHandle | null): Desk {
  const g = (k: string): unknown => (p ? readAny(p, k) : undefined);
  const o = (k: string): Record<string, unknown> => {
    const v = g(k);
    return isRec(v) ? v : {};
  };

  const cueSheet = strs(g("cueSheet"));
  const brightness = o("brightness");
  const faders = o("faders");
  const chain = o("chain");
  const fade = isRec(chain.fade) ? chain.fade : undefined;
  const go = o("go");
  const bus = o("bus");
  const observers = o("observers");
  const props = o("props");
  const iter = o("iter");
  const query = o("query");
  const pulls = isRec(query.pulls) ? query.pulls : undefined;
  const runSheet = o("runSheet");
  const timeline = o("timeline");
  const hold = o("hold");
  const channel = o("channel");
  const retry = o("retry");
  const breaker = o("breaker");
  const lifetimes = o("lifetimes");
  const wiring = o("wiring");
  const show = o("show");
  const report = isRec(show.report) ? show.report : undefined;

  const err = g("build_error");
  const error: BuildErrorValue | null = isRec(err)
    ? { type: str(err.type) ?? "Error", message: str(err.message) ?? "", line: num(err.line) ?? null }
    : null;

  return {
    cues: { label: str(g("cueLabel")), labelerType: str(g("labelerType")), sheet: cueSheet, bright: bool(brightness.bright), dim: bool(brightness.dim) },
    faders: { master: num(faders.master), levels: nums(faders.levels), brokenLevels: nums(faders.brokenLevels) },
    chain: {
      stageNames: strs(chain.stageNames),
      trail: nums(chain.trail),
      samples: recs(chain.samples)?.map((r) => ({ input: num(r.input) ?? 0, output: num(r.output) ?? 0 })),
      fade: fade ? { linear: num(fade.linear), easeIn: num(fade.easeIn), stepped: num(fade.stepped), steppedName: str(fade.steppedName) } : undefined,
    },
    go: { handlers: strs(go.handlers), naive: strs(go.naive), safe: strs(go.safe), failures: strs(go.failures), lastWins: num(go.lastWins), everyReturn: nums(go.everyReturn) },
    bus: {
      log: recs(bus.log)?.map((r) => ({ publisher: str(r.publisher) ?? "?", eventName: str(r.eventName) ?? "?", subscriber: str(r.subscriber) ?? "?", payload: str(r.payload) ?? "" })),
      listeners: num(bus.listeners),
    },
    observers: { meter: nums(observers.meter), alarm: nums(observers.alarm), completed: strs(observers.completed), stillSubscribed: num(observers.stillSubscribed) },
    props: {
      shelf: recs(props.shelf)?.map((r) => ({ name: str(r.name) ?? "?", kind: str(r.kind) ?? "?", weight: num(r.weight) ?? 0 })),
      heaviest: str(props.heaviest),
      viewed: num(props.viewed),
      judged: strs(props.judged),
    },
    iter: { fade: nums(iter.fade), trace: strs(iter.trace), pulse: nums(iter.pulse) },
    query: {
      source: num(query.source),
      pulls: pulls ? { built: num(pulls.built), pass: num(pulls.pass), first: num(pulls.first) } : undefined,
      kept: num(query.kept),
      pages: arr(query.pages)?.map((page) => strs(page) ?? []),
    },
    runSheet: {
      segments: recs(runSheet.segments)?.map((r) => ({ name: str(r.name) ?? "?", start: num(r.start) ?? 0, end: num(r.end) ?? 0, length: num(r.length) ?? (num(r.end) ?? 0) - (num(r.start) ?? 0) })),
      overlaps: strs(runSheet.overlaps),
      totalMinutes: num(runSheet.totalMinutes),
      endsAt: num(runSheet.endsAt),
      lazyCheck: str(runSheet.lazyCheck),
      eagerCheck: str(runSheet.eagerCheck),
    },
    timeline: {
      // spans arrive as their own top-level key so later lessons can send them again
      spans: recs(g("spans"))?.map((r) => ({ name: str(r.name) ?? "?", start: num(r.start) ?? 0, end: num(r.end) ?? 0, state: str(r.state) ?? "done" })),
      winner: str(timeline.winner),
      rethrown: str(timeline.rethrown),
      failedCount: num(timeline.failedCount),
    },
    hold: { state: str(hold.state), stepsDone: num(hold.stepsDone), stepsTotal: num(hold.stepsTotal), timeoutMessage: str(hold.timeoutMessage), guardedOutcome: str(hold.guardedOutcome) },
    channel: { capacity: num(channel.capacity), sent: num(channel.sent), handled: strs(channel.handled), waits: num(channel.waits), deepest: num(channel.deepest) },
    retry: { fog: attempts(retry.fog), fogResult: str(retry.fogResult), slow: attempts(retry.slow), slowOutcome: str(retry.slowOutcome) },
    breaker: { outcomes: strs(breaker.outcomes), transitions: strs(breaker.transitions), finalState: str(breaker.finalState), serviceCalls: num(breaker.serviceCalls), bulkhead: strs(breaker.bulkhead) },
    lifetimes: { log: strs(lifetimes.log), free: num(lifetimes.free) },
    wiring: {
      nodes: recs(wiring.nodes)?.map((r) => ({ name: str(r.name) ?? "?", lifetime: str(r.lifetime) ?? "" })),
      edges: recs(wiring.edges)?.map((r) => ({ from: str(r.from) ?? "?", to: str(r.to) ?? "?" })),
      liveLog: strs(wiring.liveLog),
      rehearsalLog: strs(wiring.rehearsalLog),
      cycleMessage: str(wiring.cycleMessage),
    },
    show: {
      report: report
        ? { fired: num(report.fired), failed: num(report.failed), skipped: num(report.skipped), peakLevel: num(report.peakLevel), retries: num(report.retries), spotsFree: num(report.spotsFree) }
        : undefined,
      cues: recs(show.cues)?.map((r) => ({ number: num(r.number) ?? 0, name: str(r.name) ?? "?", device: str(r.device) ?? "" })),
    },
    error,
  };
}

/** True when any value in the object is set. */
export const hasValues = (o: object): boolean => Object.values(o).some((v) => v !== undefined);
