import type { ProgramHandle } from "@/engine/program";
import { readAny } from "../go-basics/data";

/**
 * What the Tidewatch harbour board reads from the learner's Go program. A compiled program can't be
 * called back, so the board works from the values the program printed with `scene("key", value)` (each
 * one an `@scene` line) plus its plain output. Every value may be missing or the wrong type: the readers
 * below return `undefined` instead of guessing and never throw.
 *
 * Pure module (no React). Field names of decoded Go structs are matched case-insensitively.
 */

export { readAny } from "../go-basics/data";
export { adviceFor, parseDiagnostics, runtimeAdvice } from "../go-basics/data";

type Rec = Record<string, unknown>;
const isRec = (v: unknown): v is Rec => !!v && typeof v === "object" && !Array.isArray(v);
const num = (v: unknown): number | undefined => (typeof v === "number" && Number.isFinite(v) ? v : undefined);
const str = (v: unknown): string | undefined => (typeof v === "string" ? v : undefined);
const bool = (v: unknown): boolean | undefined => (typeof v === "boolean" ? v : undefined);
const arr = (v: unknown): unknown[] | undefined => (Array.isArray(v) ? v : undefined);
const nums = (v: unknown): number[] | undefined => arr(v)?.flatMap((x) => (num(x) === undefined ? [] : [x as number]));
const strs = (v: unknown): string[] | undefined => arr(v)?.flatMap((x) => (typeof x === "string" ? [x] : []));

function field(o: unknown, name: string): unknown {
  if (!isRec(o)) return undefined;
  if (name in o) return o[name];
  const want = name.toLowerCase();
  for (const k of Object.keys(o)) if (k.toLowerCase() === want) return o[k];
  return undefined;
}

function numRec(v: unknown): Record<string, number> | undefined {
  if (!isRec(v)) return undefined;
  const out: Record<string, number> = {};
  for (const [k, x] of Object.entries(v)) {
    const n = num(x);
    if (n !== undefined) out[k] = n;
  }
  return out;
}

// ───────────────────────── the model ─────────────────────────

export interface Sum {
  buoy: number;
  count: number;
  maxWave: number;
  windSum: number;
}

export interface Slot {
  job: number;
  worker: number;
  start: number;
  end: number;
}

export interface SimRun {
  workers: number;
  slots: Slot[];
  makespan: number;
  busy: number[];
  peakQueue: number;
  depth: number[];
}

export interface BuildErr {
  type: string;
  message: string;
  line: number | null;
}

export interface Board {
  lanes?: Sum[];
  sequential?: Sum[];
  same?: boolean;
  waves?: number[];
  streamTotal?: number;
  streamPeak?: number;
  stillOpen?: boolean;
  queue?: { cap?: number; filled?: number; room?: number; waiting?: number; firstWave?: number };
  collected?: Sum[];
  shed?: { accepted?: number; shed?: number; seqs?: number[] };
  heard?: number[];
  race?: { order: string; result: number }[];
  lostRuns?: number;
  tally?: { perBuoy?: Record<string, number>; waveSum?: number; expected?: number; match?: boolean };
  calibration?: { loads?: number; workers?: number; seen?: number; fixed?: number[] };
  peaks?: Record<string, number>;
  pipeline?: { in?: number; out?: number; limit?: number; seqs?: number[]; calibrated?: number; raw?: number };
  pool?: { workers?: number; jobs?: number; summaries?: Sum[]; match?: boolean };
  fan?: { streams?: number; workers?: number; total?: number; perBuoy?: Record<string, number>; tempSum?: number };
  ticks?: { runs?: SimRun[]; util?: number[]; best?: number };
  cancel?: { asked?: number; took?: number; waves?: number[]; reason?: string; stopped?: boolean };
  deadlines?: { statuses?: string[]; limitMs?: number; silentErr?: string };
  group?: { first?: string; cancelled?: number; tasks?: number; joined?: string };
  shutdown?: { accepted?: number; processed?: number; perBuoy?: Record<string, number>; maxWave?: number; clean?: boolean };
  error: BuildErr | null;
}

export const SCENE_KEYS = [
  "lanes", "sequential", "same", "waves", "streamTotal", "streamPeak", "stillOpen", "queue", "collected", "shed", "heard",
  "race", "lostRuns", "tally", "calibration", "peaks", "pipeline", "pool", "fan", "ticks", "cancel", "deadlines", "group", "shutdown",
] as const;

function sums(v: unknown): Sum[] | undefined {
  const a = arr(v);
  if (!a) return undefined;
  return a.flatMap((r): Sum[] =>
    isRec(r)
      ? [{ buoy: num(field(r, "Buoy")) ?? 0, count: num(field(r, "Count")) ?? 0, maxWave: num(field(r, "MaxWave")) ?? 0, windSum: num(field(r, "WindSum")) ?? 0 }]
      : [],
  );
}

function runs(v: unknown): SimRun[] | undefined {
  const a = arr(v);
  if (!a) return undefined;
  return a.flatMap((r): SimRun[] => {
    if (!isRec(r)) return [];
    const slots = (arr(field(r, "Slots")) ?? []).flatMap((s): Slot[] =>
      isRec(s) ? [{ job: num(field(s, "Job")) ?? 0, worker: num(field(s, "Worker")) ?? 0, start: num(field(s, "Start")) ?? 0, end: num(field(s, "End")) ?? 0 }] : [],
    );
    return [
      {
        workers: num(field(r, "Workers")) ?? 0,
        slots,
        makespan: num(field(r, "Makespan")) ?? 0,
        busy: nums(field(r, "Busy")) ?? [],
        peakQueue: num(field(r, "PeakQueue")) ?? 0,
        depth: nums(field(r, "Depth")) ?? [],
      },
    ];
  });
}

export function readBoard(p: ProgramHandle | null): Board {
  const g = (k: string): unknown => (p ? readAny(p, k) : undefined);
  const err = g("build_error");
  const q = g("queue");
  const sd = g("shed");
  const tl = g("tally");
  const cb = g("calibration");
  const pl = g("pipeline");
  const po = g("pool");
  const fn = g("fan");
  const tk = g("ticks");
  const cn = g("cancel");
  const dl = g("deadlines");
  const gr = g("group");
  const sh = g("shutdown");
  return {
    lanes: sums(g("lanes")),
    sequential: sums(g("sequential")),
    same: bool(g("same")),
    waves: nums(g("waves")),
    streamTotal: num(g("streamTotal")),
    streamPeak: num(g("streamPeak")),
    stillOpen: bool(g("stillOpen")),
    queue: isRec(q) ? { cap: num(field(q, "cap")), filled: num(field(q, "filled")), room: num(field(q, "room")), waiting: num(field(q, "waiting")), firstWave: num(field(q, "firstWave")) } : undefined,
    collected: sums(g("collected")),
    shed: isRec(sd) ? { accepted: num(field(sd, "accepted")), shed: num(field(sd, "shed")), seqs: nums(field(sd, "shedSeqs")) } : undefined,
    heard: nums(g("heard")),
    race: arr(g("race"))?.flatMap((r) => (isRec(r) ? [{ order: str(field(r, "order")) ?? "", result: num(field(r, "result")) ?? 0 }] : [])),
    lostRuns: num(g("lostRuns")),
    tally: isRec(tl) ? { perBuoy: numRec(field(tl, "perBuoy")), waveSum: num(field(tl, "waveSum")), expected: num(field(tl, "expected")), match: bool(field(tl, "match")) } : undefined,
    calibration: isRec(cb) ? { loads: num(field(cb, "loads")), workers: num(field(cb, "workers")), seen: num(field(cb, "seen")), fixed: nums(field(cb, "fixed")) } : undefined,
    peaks: numRec(g("peaks")),
    pipeline: isRec(pl)
      ? { in: num(field(pl, "in")), out: num(field(pl, "out")), limit: num(field(pl, "limit")), seqs: nums(field(pl, "seqs")), calibrated: num(field(pl, "calibrated")), raw: num(field(pl, "raw")) }
      : undefined,
    pool: isRec(po) ? { workers: num(field(po, "workers")), jobs: num(field(po, "jobs")), summaries: sums(field(po, "summaries")), match: bool(field(po, "match")) } : undefined,
    fan: isRec(fn) ? { streams: num(field(fn, "streams")), workers: num(field(fn, "workers")), total: num(field(fn, "total")), perBuoy: numRec(field(fn, "perBuoy")), tempSum: num(field(fn, "tempSum")) } : undefined,
    ticks: isRec(tk) ? { runs: runs(field(tk, "runs")), util: nums(field(tk, "util")), best: num(field(tk, "best")) } : undefined,
    cancel: isRec(cn) ? { asked: num(field(cn, "asked")), took: num(field(cn, "took")), waves: nums(field(cn, "waves")), reason: str(field(cn, "reason")), stopped: bool(field(cn, "stopped")) } : undefined,
    deadlines: isRec(dl) ? { statuses: strs(field(dl, "statuses")), limitMs: num(field(dl, "limitMs")), silentErr: str(field(dl, "silentErr")) } : undefined,
    group: isRec(gr) ? { first: str(field(gr, "first")), cancelled: num(field(gr, "cancelled")), tasks: num(field(gr, "tasks")), joined: str(field(gr, "joined")) } : undefined,
    shutdown: isRec(sh)
      ? { accepted: num(field(sh, "Accepted")), processed: num(field(sh, "Processed")), perBuoy: numRec(field(sh, "PerBuoy")), maxWave: num(field(sh, "MaxWave")), clean: bool(field(sh, "Clean")) }
      : undefined,
    error: isRec(err) ? { type: str(err.type) ?? "Error", message: str(err.message) ?? "", line: num(err.line) ?? null } : null,
  };
}
