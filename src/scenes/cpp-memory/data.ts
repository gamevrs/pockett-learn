import type { ProgramHandle } from "@/engine/program";
import { clamp, isRec, num, readAny, str } from "../cpp-basics/data";

/**
 * What the Provenance Lab board reads from the learner's C++ program. A compiled program cannot be
 * called back, so the board works from the `@scene {json}` lines the program printed:
 *
 *   shot1, shot2, ...  one per snap("caption"): the peeked variables, the live heap blocks, the logbook
 *                      lines since the previous photo and the running counters
 *   audit              printed when main ends: allocations, frees, leaks, double frees, copies, moves
 *   plus the plain values the lessons send with scene("name", value)
 *
 * Every value may be missing or the wrong type; the readers below return safe defaults instead of
 * throwing. Pure module (no React).
 */

export { clamp, isRec, num, str };

// ───────────────────────── model ─────────────────────────

export type Kind = "val" | "ptr" | "own" | "vec" | "arr" | "obj";
export type Region = 0 | 1 | 2 | 3;

export interface Entry {
  name: string;
  frame: string;
  type: string;
  size: number;
  addr: number;
  region: Region;
  kind: Kind;
  value?: string;
  /** Where a pointer-like entry points (normalised address), its region (3 = null) and the heap block it lands in. */
  to?: number;
  targetRegion?: Region;
  targetBlock?: number;
  targetFreed?: boolean;
  pointeeConst?: boolean;
  selfConst?: boolean;
  pointee?: string;
  role?: "owner" | "borrowed";
  len?: number;
  cap?: number;
  elemSize?: number;
  items?: string[];
  isConst?: boolean;
  /** A temporary (the result of a call): it has no address of its own. */
  temp?: boolean;
}

export interface Block {
  id: number;
  size: number;
  addr: number;
  live: boolean;
  holds: number[];
}

export interface Ev {
  kind: string;
  who: string;
  seq: number;
  extra?: number;
}

export interface Counters {
  allocs: number;
  frees: number;
  live: number;
  bytes: number;
  peak: number;
  badFrees: number;
}

export interface Shot {
  index: number;
  caption: string;
  seq: number;
  entries: Entry[];
  blocks: Block[];
  events: Ev[];
  dropped: number;
  counters: Counters;
  lean: boolean;
}

export interface Audit {
  counters: Counters;
  leaks: { id: number; size: number }[];
  leakCount: number;
  ctor: number;
  dtor: number;
  copies: number;
  moves: number;
  shots: number;
  tail: Ev[];
  full: boolean;
}

export interface BuildError {
  type: string;
  message: string;
  line: number | null;
}

export interface Lab {
  shots: Shot[];
  audit: Audit | null;
  error: BuildError | null;
  stdout: string;
  scalars: Record<string, unknown>;
}

// ───────────────────────── readers ─────────────────────────

const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const nonNeg = (v: unknown, fallback = 0): number => {
  const n = num(v);
  return n === undefined ? fallback : n;
};
const strs = (v: unknown): string[] | undefined => (Array.isArray(v) ? v.map((x) => (typeof x === "string" ? x : String(x ?? ""))) : undefined);

const KINDS: Kind[] = ["val", "ptr", "own", "vec", "arr", "obj"];

function parseEntry(raw: unknown): Entry | null {
  if (!isRec(raw)) return null;
  const name = str(raw.n);
  if (name === undefined) return null;
  const k = str(raw.k);
  const kind: Kind = KINDS.includes(k as Kind) ? (k as Kind) : "val";
  const region = nonNeg(raw.rg);
  const e: Entry = {
    name,
    frame: str(raw.fr) ?? "main",
    type: str(raw.ty) ?? "?",
    size: nonNeg(raw.sz, 1),
    addr: nonNeg(raw.a),
    region: (region >= 0 && region <= 3 ? region : 2) as Region,
    kind,
  };
  const v = str(raw.v);
  if (v !== undefined) e.value = v;
  if (num(raw.to) !== undefined) {
    e.to = num(raw.to);
    const tg = nonNeg(raw.tg, 2);
    e.targetRegion = (tg >= 0 && tg <= 3 ? tg : 2) as Region;
    const tb = num(raw.tb);
    if (tb !== undefined && tb > 0) e.targetBlock = tb;
    if (raw.tf === 1) e.targetFreed = true;
  }
  if (raw.pc === 1) e.pointeeConst = true;
  if (raw.cp === 1) e.selfConst = true;
  if (raw.cv === 1) e.isConst = true;
  if (raw.tp === 1) e.temp = true;
  const pt = str(raw.pt);
  if (pt !== undefined) e.pointee = pt;
  const r = str(raw.r);
  if (r === "owner" || r === "borrowed") e.role = r;
  if (num(raw.len) !== undefined) e.len = num(raw.len);
  if (num(raw.cap) !== undefined) e.cap = num(raw.cap);
  if (num(raw.es) !== undefined) e.elemSize = num(raw.es);
  const vs = strs(raw.vs);
  if (vs) e.items = vs;
  return e;
}

function parseBlock(raw: unknown): Block | null {
  if (!isRec(raw)) return null;
  const id = num(raw.id);
  if (id === undefined) return null;
  return { id, size: nonNeg(raw.sz), addr: nonNeg(raw.a), live: raw.st !== 0, holds: arr(raw.h).flatMap((x) => (num(x) === undefined ? [] : [x as number])) };
}

function parseEv(raw: unknown): Ev | null {
  if (!Array.isArray(raw)) return null;
  const kind = str(raw[0]);
  const who = str(raw[1]);
  if (kind === undefined || who === undefined) return null;
  const ev: Ev = { kind, who, seq: nonNeg(raw[2]) };
  if (num(raw[3]) !== undefined) ev.extra = num(raw[3]);
  return ev;
}

function parseCounters(raw: unknown): Counters {
  const r = isRec(raw) ? raw : {};
  return { allocs: nonNeg(r.al), frees: nonNeg(r.fr), live: nonNeg(r.lv), bytes: nonNeg(r.by), peak: nonNeg(r.pk), badFrees: nonNeg(r.bf) };
}

function parseShot(raw: unknown, index: number): Shot | null {
  if (!isRec(raw)) return null;
  return {
    index,
    caption: str(raw.cap) ?? `photo ${index + 1}`,
    seq: nonNeg(raw.seq),
    entries: arr(raw.e).flatMap((x) => {
      const e = parseEntry(x);
      return e ? [e] : [];
    }),
    blocks: arr(raw.hp).flatMap((x) => {
      const b = parseBlock(x);
      return b ? [b] : [];
    }),
    events: arr(raw.ev).flatMap((x) => {
      const e = parseEv(x);
      return e ? [e] : [];
    }),
    dropped: nonNeg(raw.evx),
    counters: parseCounters(raw.c),
    lean: raw.lean === true,
  };
}

function parseAudit(raw: unknown): Audit | null {
  if (!isRec(raw)) return null;
  const leaks = arr(raw.leaks).flatMap((x) => (isRec(x) && num(x.id) !== undefined ? [{ id: x.id as number, size: nonNeg(x.sz) }] : []));
  return {
    counters: parseCounters(raw),
    leaks,
    leakCount: nonNeg(raw.lv, leaks.length),
    ctor: nonNeg(raw.ct),
    dtor: nonNeg(raw.dt),
    copies: nonNeg(raw.cp),
    moves: nonNeg(raw.mv),
    shots: nonNeg(raw.shots),
    tail: arr(raw.tail).flatMap((x) => {
      const e = parseEv(x);
      return e ? [e] : [];
    }),
    full: raw.full === true,
  };
}

/** Plain values the lessons send with scene("name", value), shown on the data tab and read by the small panels. */
export const SCALAR_KEYS = [
  "thirdSlot", "slotTotal", "slotGap",
  "morningFirst", "backupFirst",
  "bluesFirst", "redsFirst", "bluesSize",
  "senderSize", "receiverSize", "spareFirst", "copyFirst",
  "lightLighter", "slotMatches", "carriedGrams",
  "constCopies", "beadCondition",
  "intakeIds", "intakeNames", "intakeYears", "intakeConditions", "rejectLines", "rejectReasons",
  "basicHeld", "strongHeld", "basicError", "strongError",
  "registrySize", "mirrorCondition", "lampGone",
  "runCopies", "runMoves", "finalCount",
] as const;

const MAX_SHOTS = 90;

export function readLab(p: ProgramHandle | null): Lab {
  if (!p) return { shots: [], audit: null, error: null, stdout: "", scalars: {} };
  const shots: Shot[] = [];
  for (let i = 1; i <= MAX_SHOTS; i++) {
    const key = `shot${i}`;
    if (!p.has(key)) break;
    const shot = parseShot(readAny(p, key), shots.length);
    if (shot) shots.push(shot);
  }
  const scalars: Record<string, unknown> = {};
  for (const k of SCALAR_KEYS) {
    const v = readAny(p, k);
    if (v !== undefined) scalars[k] = v;
  }
  const err = readAny(p, "build_error");
  const error: BuildError | null = isRec(err) ? { type: str(err.type) ?? "Error", message: str(err.message) ?? "", line: num(err.line) ?? null } : null;
  return { shots, audit: parseAudit(readAny(p, "audit")), error, stdout: p.stdout ?? "", scalars };
}

// ───────────────────────── small helpers ─────────────────────────

export const hex = (v: number): string => `0x${Math.max(0, Math.round(v)).toString(16).padStart(8, "0")}`;
export const shortHex = (v: number): string => `…${Math.max(0, Math.round(v)).toString(16).padStart(8, "0").slice(-4)}`;

export const sNum = (v: unknown): number | undefined => num(v);
export const sStr = (v: unknown): string | undefined => str(v);
export const sList = (v: unknown): string[] => (Array.isArray(v) ? v.map((x) => String(x ?? "")) : []);
export const sNumList = (v: unknown): number[] => (Array.isArray(v) ? v.flatMap((x) => (num(x) === undefined ? [] : [x as number])) : []);

export function outputLines(stdout: string): string[] {
  const lines = stdout.split("\n");
  while (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();
  return lines;
}

const COPY_KINDS = new Set(["copy", "assign-copy"]);
const MOVE_KINDS = new Set(["move", "assign-move"]);
export const isCopy = (k: string) => COPY_KINDS.has(k);
export const isMove = (k: string) => MOVE_KINDS.has(k);
export const isHeapEvent = (k: string) => k === "alloc" || k === "free" || k === "double-free";
export const isLife = (k: string) => k === "ctor" || k === "dtor" || isCopy(k) || isMove(k);

/** Every event of the run in order: the events of each photo, then whatever happened after the last photo. */
export function allEvents(lab: Lab): { ev: Ev; shot: number }[] {
  const out: { ev: Ev; shot: number }[] = [];
  lab.shots.forEach((s, i) => s.events.forEach((ev) => out.push({ ev, shot: i })));
  lab.audit?.tail.forEach((ev) => out.push({ ev, shot: lab.shots.length }));
  return out;
}

export function totals(lab: Lab): { copies: number; moves: number; ctor: number; dtor: number } {
  if (lab.audit) return { copies: lab.audit.copies, moves: lab.audit.moves, ctor: lab.audit.ctor, dtor: lab.audit.dtor };
  let copies = 0;
  let moves = 0;
  let ctor = 0;
  let dtor = 0;
  for (const { ev } of allEvents(lab)) {
    if (isCopy(ev.kind)) copies++;
    else if (isMove(ev.kind)) moves++;
    else if (ev.kind === "ctor") ctor++;
    else if (ev.kind === "dtor") dtor++;
  }
  return { copies, moves, ctor, dtor };
}

// ───────────────────────── reading one photo ─────────────────────────

export interface FrameGroup {
  name: string;
  entries: { entry: Entry; index: number }[];
}

/** Entries grouped by the function they were peeked from; the outermost frame (highest stack addresses) first. */
export function frameGroups(shot: Shot): FrameGroup[] {
  const groups = new Map<string, FrameGroup & { top: number }>();
  shot.entries.forEach((entry, index) => {
    let g = groups.get(entry.frame);
    if (!g) {
      g = { name: entry.frame, entries: [], top: -Infinity };
      groups.set(entry.frame, g);
    }
    g.entries.push({ entry, index });
    if (entry.region === 0) g.top = Math.max(g.top, entry.addr);
  });
  return [...groups.values()].sort((a, b) => (a.name === "main" ? -1 : b.name === "main" ? 1 : b.top - a.top));
}

/** For each entry index, the index of the earlier entry that is the very same cell (a reference or an alias), if any. */
export function aliasOf(shot: Shot): Map<number, number> {
  const out = new Map<number, number>();
  const seen = new Map<string, number>();
  shot.entries.forEach((e, i) => {
    if (e.region !== 0 || e.temp) return;
    const key = `${e.addr}:${e.size}`;
    const first = seen.get(key);
    if (first === undefined) seen.set(key, i);
    else out.set(i, first);
  });
  return out;
}

export type Target =
  | { kind: "null" }
  | { kind: "cell"; index: number; elem?: number; offset: number }
  | { kind: "heap"; block: number; live: boolean; offset: number }
  | { kind: "dangling"; was: string; photo: string }
  | { kind: "static" }
  | { kind: "none" };

const covers = (e: Entry, to: number) => to >= e.addr && to < e.addr + Math.max(e.size, 1);

/** Where a pointer-like entry points, judged against this photo and the ones before it. */
export function resolveTarget(lab: Lab, shot: Shot, entry: Entry): Target {
  if (entry.to === undefined) return { kind: "none" };
  if (entry.targetRegion === 3) return { kind: "null" };
  if (entry.targetBlock !== undefined) {
    const b = shot.blocks.find((x) => x.id === entry.targetBlock);
    return { kind: "heap", block: entry.targetBlock, live: !entry.targetFreed, offset: b ? Math.max(0, entry.to - b.addr) : 0 };
  }
  if (entry.targetRegion === 2) return { kind: "static" };
  const self = shot.entries.indexOf(entry);
  let best = -1;
  shot.entries.forEach((e, i) => {
    if (i === self || e.region !== 0 || e.temp || !covers(e, entry.to!)) return;
    if (best < 0 || e.size < shot.entries[best].size) best = i;
  });
  if (best >= 0) {
    const cell = shot.entries[best];
    const offset = entry.to - cell.addr;
    const elem = cell.kind === "arr" && cell.elemSize ? Math.floor(offset / cell.elemSize) : undefined;
    return { kind: "cell", index: best, elem, offset };
  }
  for (let s = shot.index - 1; s >= 0; s--) {
    const old = lab.shots[s].entries.find((e) => e.region === 0 && !e.temp && covers(e, entry.to!));
    if (old) return { kind: "dangling", was: old.name, photo: lab.shots[s].caption };
  }
  return { kind: "none" };
}

/** True for entries that point somewhere (and so draw an arrow). */
export const isPointer = (e: Entry) => e.kind === "ptr" || e.kind === "own" || e.kind === "vec";

export type Badge = "unique" | "owner" | "borrowed" | "raw" | "container";
export function badgeOf(e: Entry): Badge | null {
  if (e.kind === "own") return "unique";
  if (e.kind === "vec") return "container";
  if (e.kind !== "ptr") return null;
  if (e.role === "borrowed") return "borrowed";
  if (e.role === "owner") return "owner";
  return "raw";
}

export interface BlockOwners {
  /** Entries that point into the block (owners and views). */
  holders: { entry: Entry; badge: Badge }[];
  /** Other blocks that hold a pointer to it (a container's buffer pointing at its elements). */
  inside: number[];
}

export function blockOwners(shot: Shot): Map<number, BlockOwners> {
  const out = new Map<number, BlockOwners>();
  const at = (id: number) => {
    let o = out.get(id);
    if (!o) {
      o = { holders: [], inside: [] };
      out.set(id, o);
    }
    return o;
  };
  for (const e of shot.entries) {
    const badge = badgeOf(e);
    if (badge && e.targetBlock !== undefined && !e.targetFreed) at(e.targetBlock).holders.push({ entry: e, badge });
  }
  for (const b of shot.blocks) {
    if (!b.live) continue;
    for (const h of b.holds) at(h).inside.push(b.id);
  }
  return out;
}

/** Owning entries that hold nothing: moved-from, reset or never filled. */
export function emptyOwners(lab: Lab, shot: Shot): { entry: Entry; why: "moved-from" | "empty" }[] {
  const out: { entry: Entry; why: "moved-from" | "empty" }[] = [];
  const movedHere = shot.events.some((e) => isMove(e.kind));
  for (const e of shot.entries) {
    const isOwner = e.kind === "own" || (e.kind === "ptr" && e.role === "owner");
    if (!isOwner || e.targetRegion !== 3) continue;
    const had = lab.shots.slice(0, shot.index).some((s) => s.entries.some((x) => x.name === e.name && x.targetRegion !== 3 && x.targetBlock !== undefined));
    out.push({ entry: e, why: had || movedHere ? "moved-from" : "empty" });
  }
  return out;
}

/** Two or more owner-role pointers that land in the same live block: the shallow-copy bug. */
export function doubleOwned(shot: Shot): { block: number; names: string[] }[] {
  const byBlock = new Map<number, string[]>();
  for (const e of shot.entries) {
    const owns = e.kind === "own" || (e.kind === "ptr" && e.role === "owner");
    if (!owns || e.targetBlock === undefined || e.targetFreed) continue;
    byBlock.set(e.targetBlock, [...(byBlock.get(e.targetBlock) ?? []), e.name]);
  }
  return [...byBlock].filter(([, names]) => names.length > 1).map(([block, names]) => ({ block, names }));
}

/** Elements of a vector entry as heap block numbers ("-> #7" texts), where they are pointers. */
export function elementBlocks(e: Entry): (number | null)[] {
  return (e.items ?? []).map((t) => {
    const m = /^-> #(\d+)/.exec(t);
    return m ? Number(m[1]) : null;
  });
}

export function pickShot(shots: Shot[], pred: (s: Shot) => boolean): number[] {
  const out: number[] = [];
  shots.forEach((s, i) => {
    if (pred(s)) out.push(i);
  });
  return out;
}
