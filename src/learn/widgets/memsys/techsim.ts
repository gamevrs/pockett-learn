/** Pure toy models for the write-policy, ECC and flash widgets. No UI, no React. */

// ───────────────────────────── write-through vs write-back ─────────────────────────────

export type WritePolicyKind = "through" | "back";
export type LineName = "A" | "B" | "C";
export const LINES: LineName[] = ["A", "B", "C"];

export interface Slot {
  line: LineName;
  value: number;
  dirty: boolean;
  /** Higher = used more recently. */
  used: number;
}

export interface WriteSim {
  policy: WritePolicyKind;
  /** Exactly two slots; null = empty. */
  slots: (Slot | null)[];
  ram: Record<LineName, number>;
  ramWrites: number;
  ramReads: number;
  /** Number of ops done so far. */
  step: number;
  clock: number;
}

export interface WriteStepInfo {
  op: string;
  kind: "r" | "w";
  line: LineName;
  hit: boolean;
  /** The line that was evicted on this access, if any, and whether it had to be written back. */
  evicted: { line: LineName; wroteBack: boolean } | null;
  /** Wrote to RAM straight away (write-through). */
  wroteThrough: boolean;
}

/** A fresh cache (both slots empty) and RAM with every line at 0. */
export function freshWriteSim(policy: WritePolicyKind): WriteSim {
  return { policy, slots: [null, null], ram: { A: 0, B: 0, C: 0 }, ramWrites: 0, ramReads: 0, step: 0, clock: 0 };
}

/** Parse an op like "rA" or "wB". Returns null for anything else. */
export function parseOp(op: string): { kind: "r" | "w"; line: LineName } | null {
  const m = /^([rw])([ABC])$/.exec(op);
  return m ? { kind: m[1] as "r" | "w", line: m[2] as LineName } : null;
}

/** Do one access. Both policies are write-allocate: a write miss first reads the line from RAM. Returns a new state and what happened. */
export function stepWrite(s: WriteSim, op: string): { sim: WriteSim; info: WriteStepInfo } {
  const p = parseOp(op);
  if (!p) throw new Error(`bad op ${op}`);
  const slots = s.slots.map((x) => (x ? { ...x } : null));
  const ram = { ...s.ram };
  let { ramWrites, ramReads } = s;
  const clock = s.clock + 1;
  let evicted: WriteStepInfo["evicted"] = null;
  let wroteThrough = false;
  let idx = slots.findIndex((x) => x && x.line === p.line);
  const hit = idx >= 0;
  if (!hit) {
    ramReads += 1;
    idx = slots.findIndex((x) => x === null);
    if (idx < 0) {
      idx = slots[0]!.used <= slots[1]!.used ? 0 : 1;
      const v = slots[idx]!;
      let wroteBack = false;
      if (v.dirty) {
        ram[v.line] = v.value;
        ramWrites += 1;
        wroteBack = true;
      }
      evicted = { line: v.line, wroteBack };
    }
    slots[idx] = { line: p.line, value: ram[p.line], dirty: false, used: clock };
  }
  const slot = slots[idx]!;
  slot.used = clock;
  if (p.kind === "w") {
    slot.value += 1;
    if (s.policy === "through") {
      ram[p.line] = slot.value;
      ramWrites += 1;
      wroteThrough = true;
    } else {
      slot.dirty = true;
    }
  }
  return { sim: { policy: s.policy, slots, ram, ramWrites, ramReads, step: s.step + 1, clock }, info: { op, kind: p.kind, line: p.line, hit, evicted, wroteThrough } };
}

/** Number of cache slots whose line is dirty. */
export const dirtyCount = (s: WriteSim) => s.slots.filter((x) => x && x.dirty).length;
/** Number of lines whose RAM value is out of date (a dirty cache copy that differs from RAM). */
export const staleCount = (s: WriteSim) => s.slots.filter((x) => x && x.dirty && x.value !== s.ram[x.line]).length;
/** Is RAM's copy of this line out of date right now? */
export const isStale = (s: WriteSim, line: LineName) => s.slots.some((x) => x && x.line === line && x.dirty && x.value !== s.ram[line]);

export const DEFAULT_WRITE_SEQ = ["wA", "wA", "wA", "wA", "rB", "wB", "rC", "wA"];

// ───────────────────────────── SEC-DED on one byte ─────────────────────────────

/** Position (1..12) of data bit d1..d8 (d1 = most significant). */
export const DATA_POS = [3, 5, 6, 7, 9, 10, 11, 12];
/** Cell order shown to the learner: position 0 is the overall parity bit "P", then 1..12. */
export const ECC_LABELS = ["P", "p1", "p2", "d1", "p4", "d2", "d3", "d4", "p8", "d5", "d6", "d7", "d8"];
export const ECC_NEW_DATA = [0b10110010, 0b01001101, 0b11110000, 0b00000001];

/** Encode a byte into 13 bits: index 0 = overall parity, 1..12 = Hamming(12,8) positions. */
export function eccEncode(data: number): number[] {
  const cw = new Array<number>(13).fill(0);
  DATA_POS.forEach((pos, k) => {
    cw[pos] = (data >> (7 - k)) & 1;
  });
  for (const p of [1, 2, 4, 8]) {
    let x = 0;
    for (let i = 1; i <= 12; i++) if (i !== p && i & p) x ^= cw[i];
    cw[p] = x;
  }
  let q = 0;
  for (let i = 1; i <= 12; i++) q ^= cw[i];
  cw[0] = q;
  return cw;
}

export type EccVerdict = "clean" | "corrected" | "detected";

export interface EccDecode {
  syndrome: number;
  /** XOR of all 13 stored bits (1 = odd). */
  overall: number;
  verdict: EccVerdict;
  /** Position the decoder flipped back (0 = the overall parity bit), or null. */
  fixed: number | null;
  decoded: number;
}

/** Decode 13 stored bits with SEC-DED rules. */
export function eccDecode(stored: number[]): EccDecode {
  let s = 0;
  let q = stored[0];
  for (let i = 1; i <= 12; i++) {
    if (stored[i]) {
      s ^= i;
      q ^= 1;
    }
  }
  let verdict: EccVerdict;
  let fixed: number | null = null;
  const bits = stored.slice();
  if (s === 0 && q === 0) verdict = "clean";
  else if (q === 1 && s <= 12) {
    verdict = "corrected";
    fixed = s;
    bits[s] ^= 1;
  } else verdict = "detected";
  let decoded = 0;
  DATA_POS.forEach((pos) => {
    decoded = (decoded << 1) | bits[pos];
  });
  return { syndrome: s, overall: q, verdict, fixed, decoded };
}

/** The stored bits after flipping the given positions in the clean codeword. */
export function eccStore(data: number, flipped: boolean[]): number[] {
  return eccEncode(data).map((b, i) => (flipped[i] ? b ^ 1 : b));
}

// ───────────────────────────── NAND flash, FTL, garbage collection ─────────────────────────────

export type Page = { st: "free" } | { st: "valid"; l: number } | { st: "stale"; l: number };

export interface FlashSim {
  blocksN: number;
  pagesPerBlock: number;
  logical: number;
  pages: Page[];
  /** Logical page -> physical page index, or -1 if never written. */
  map: number[];
  erase: number[];
  /** Index of the open block, or -1. */
  open: number;
  hostWrites: number;
  nandWrites: number;
  gcCopies: number;
  erases: number;
}

export interface GcEvent {
  victim: number;
  copied: number[];
}

export interface FlashWriteInfo {
  l: number;
  block: number;
  /** Block that held the old copy of l (now stale), or -1. */
  oldBlock: number;
  gc: GcEvent[];
}

/** Empty drive (no logical page written yet). Logical pages are clamped so a full GC always has room to work. */
export function freshFlash(logical = 6, blocksN = 4, pagesPerBlock = 4): FlashSim {
  const L = Math.max(1, Math.min(logical, (blocksN - 2) * pagesPerBlock));
  return {
    blocksN,
    pagesPerBlock,
    logical: L,
    pages: Array.from({ length: blocksN * pagesPerBlock }, () => ({ st: "free" }) as Page),
    map: new Array<number>(L).fill(-1),
    erase: new Array<number>(blocksN).fill(0),
    open: -1,
    hostWrites: 0,
    nandWrites: 0,
    gcCopies: 0,
    erases: 0,
  };
}

const blockPages = (s: FlashSim, b: number) => s.pages.slice(b * s.pagesPerBlock, (b + 1) * s.pagesPerBlock);
const isFreeBlock = (s: FlashSim, b: number) => blockPages(s, b).every((p) => p.st === "free");
const hasRoom = (s: FlashSim, b: number) => b >= 0 && blockPages(s, b).some((p) => p.st === "free");
/** Number of valid pages in block b. */
export const validIn = (s: FlashSim, b: number) => blockPages(s, b).filter((p) => p.st === "valid").length;
const freeBlocks = (s: FlashSim) => Array.from({ length: s.blocksN }, (_, b) => b).filter((b) => isFreeBlock(s, b));

function put(s: FlashSim, l: number): number {
  const b = s.open;
  const off = blockPages(s, b).findIndex((p) => p.st === "free");
  const at = b * s.pagesPerBlock + off;
  const old = s.map[l];
  if (old >= 0) s.pages[old] = { st: "stale", l };
  s.pages[at] = { st: "valid", l };
  s.map[l] = at;
  s.nandWrites += 1;
  return b;
}

/** Make sure the open block has a free page, running garbage collection when only the reserve block is left. Mutates s. */
function ensureRoom(s: FlashSim, events: GcEvent[]): void {
  let guard = 0;
  while (!hasRoom(s, s.open)) {
    if (guard++ > 64) throw new Error("garbage collection made no progress");
    const free = freeBlocks(s);
    if (free.length >= 2 || (free.length === 1 && s.open === -1)) {
      s.open = free[0];
      return;
    }
    // Only the reserve block is free: collect the full block with the fewest valid pages.
    let victim = -1;
    for (let b = 0; b < s.blocksN; b++) {
      if (isFreeBlock(s, b) || hasRoom(s, b)) continue;
      if (victim < 0 || validIn(s, b) < validIn(s, victim) || (validIn(s, b) === validIn(s, victim) && s.erase[b] < s.erase[victim])) victim = b;
    }
    if (victim < 0) throw new Error("no victim to collect");
    const copied: number[] = [];
    const valid = blockPages(s, victim).flatMap((p) => (p.st === "valid" ? [p.l] : []));
    if (valid.length > 0) {
      if (free.length === 0) throw new Error("no reserve block");
      s.open = free[0];
      for (const l of valid) {
        put(s, l);
        s.gcCopies += 1;
        copied.push(l);
      }
    }
    for (let i = 0; i < s.pagesPerBlock; i++) s.pages[victim * s.pagesPerBlock + i] = { st: "free" };
    s.erase[victim] += 1;
    s.erases += 1;
    events.push({ victim, copied });
  }
}

/** Host writes logical page l. Returns a new state and a description (which block, any GC that ran). */
export function flashWrite(prev: FlashSim, l: number): { sim: FlashSim; info: FlashWriteInfo } {
  const s: FlashSim = { ...prev, pages: prev.pages.slice(), map: prev.map.slice(), erase: prev.erase.slice() };
  const old = s.map[l];
  const oldBlock = old >= 0 ? Math.floor(old / s.pagesPerBlock) : -1;
  // The old copy goes stale first, so garbage collection never copies a page the host is about to replace.
  if (old >= 0) {
    s.pages[old] = { st: "stale", l };
    s.map[l] = -1;
  }
  const gc: GcEvent[] = [];
  ensureRoom(s, gc);
  const block = put(s, l);
  s.hostWrites += 1;
  return { sim: s, info: { l, block, oldBlock, gc } };
}

/** A drive with L0..L(L-1) written once in order, counters back at zero. */
export function prefilledFlash(logical = 6, blocksN = 4, pagesPerBlock = 4): FlashSim {
  let s = freshFlash(logical, blocksN, pagesPerBlock);
  for (let l = 0; l < s.logical; l++) s = flashWrite(s, l).sim;
  return { ...s, hostWrites: 0, nandWrites: 0, gcCopies: 0, erases: 0 };
}

/** Write amplification = flash writes / host writes, or 0 before any host write. */
export const writeAmp = (s: FlashSim) => (s.hostWrites > 0 ? s.nandWrites / s.hostWrites : 0);
