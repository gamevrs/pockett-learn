/** Pure virtual-memory simulations: page-table translation, a TLB, demand paging / swap, and a toy heap allocator. No UI. */

// ───────────────────────── page table (toy: 16-bit addresses, 4 KiB pages) ─────────────────────────

export const PAGE_BITS = 12;
export const PAGE_SIZE = 1 << PAGE_BITS;
export const VPN_BITS = 4;

export interface Pte {
  present: boolean;
  writable: boolean;
  /** Physical frame number (only meaningful when present). */
  frame: number;
}

export type Translation =
  | { ok: true; vpn: number; offset: number; frame: number; pa: number }
  | { ok: false; vpn: number; offset: number; fault: "page-fault" | "protection" };

export function translate(table: Pte[], va: number, write: boolean): Translation {
  const vpn = (va >>> PAGE_BITS) & ((1 << VPN_BITS) - 1);
  const offset = va & (PAGE_SIZE - 1);
  const e = table[vpn];
  if (!e || !e.present) return { ok: false, vpn, offset, fault: "page-fault" };
  if (write && !e.writable) return { ok: false, vpn, offset, fault: "protection" };
  return { ok: true, vpn, offset, frame: e.frame, pa: (e.frame << PAGE_BITS) | offset };
}

// ───────────────────────── TLB ─────────────────────────

export interface TlbRun {
  accesses: number;
  pages: number;
  tlbMisses: number;
  missRate: number;
  reachBytes: number;
}

function prng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/**
 * A fully associative LRU TLB walking `regionBytes` of memory.
 * "scan": sequential, `stride` bytes at a time, `passes` times. "random": `randomCount` random accesses.
 * Accesses inside the page just visited are hits, so only page changes are simulated.
 */
export function runTlb(opts: {
  pageBytes: number;
  entries: number;
  regionBytes: number;
  pattern: "scan" | "random";
  stride?: number;
  passes?: number;
  randomCount?: number;
}): TlbRun {
  const { pageBytes, entries, regionBytes, pattern } = opts;
  const pages = Math.max(1, Math.ceil(regionBytes / pageBytes));
  const tlb: number[] = [];
  let misses = 0;
  let accesses = 0;
  const visit = (p: number) => {
    const at = tlb.indexOf(p);
    if (at >= 0) tlb.splice(at, 1);
    else misses++;
    tlb.push(p);
    if (tlb.length > entries) tlb.shift();
  };
  if (pattern === "scan") {
    const stride = Math.max(1, opts.stride ?? 64);
    const passes = opts.passes ?? 2;
    const perPage = Math.max(1, Math.floor(pageBytes / stride));
    const stepsPerPass = Math.max(1, Math.ceil(regionBytes / stride));
    for (let k = 0; k < passes; k++) {
      if (stride >= pageBytes) {
        for (let i = 0; i < stepsPerPass; i++) visit(Math.floor((i * stride) / pageBytes));
      } else {
        for (let p = 0; p < pages; p++) visit(p);
      }
      accesses += stride >= pageBytes ? stepsPerPass : pages * perPage;
    }
  } else {
    const rnd = prng(7);
    const n = opts.randomCount ?? 20000;
    for (let i = 0; i < n; i++) visit(Math.floor(rnd() * pages));
    accesses = n;
  }
  return { accesses, pages, tlbMisses: misses, missRate: misses / Math.max(1, accesses), reachBytes: entries * pageBytes };
}

// ───────────────────────── demand paging ─────────────────────────

export type FaultKind = "hit" | "minor" | "major";

export interface SwapRun {
  steps: { page: number; kind: FaultKind; evicted: number | null }[];
  minor: number;
  major: number;
  hits: number;
  /** Frames after the last access, least recent first. */
  resident: number[];
}

/** LRU physical memory of `frames` frames. First touch of a page = minor fault (zero-filled); a page that was evicted and is touched again = major fault (read from swap). */
export function runSwap(frames: number, pages: number[]): SwapRun {
  const resident: number[] = [];
  const touched = new Set<number>();
  const steps: SwapRun["steps"] = [];
  let minor = 0;
  let major = 0;
  let hits = 0;
  for (const p of pages) {
    const at = resident.indexOf(p);
    if (at >= 0) {
      resident.splice(at, 1);
      resident.push(p);
      hits++;
      steps.push({ page: p, kind: "hit", evicted: null });
      continue;
    }
    const kind: FaultKind = touched.has(p) ? "major" : "minor";
    if (kind === "major") major++;
    else minor++;
    let evicted: number | null = null;
    if (resident.length >= frames) evicted = resident.shift()!;
    resident.push(p);
    touched.add(p);
    steps.push({ page: p, kind, evicted });
  }
  return { steps, minor, major, hits, resident };
}

// ───────────────────────── toy heap allocator ─────────────────────────

export interface Block {
  id: number;
  start: number;
  size: number;
}

/** First-fit allocation in a heap of `cells` cells. Returns the start, or -1 when no single gap is big enough. */
export function allocFirstFit(blocks: Block[], cells: number, size: number): number {
  const sorted = blocks.slice().sort((a, b) => a.start - b.start);
  let cursor = 0;
  for (const b of sorted) {
    if (b.start - cursor >= size) return cursor;
    cursor = b.start + b.size;
  }
  return cells - cursor >= size ? cursor : -1;
}

export function heapStats(blocks: Block[], cells: number) {
  const sorted = blocks.slice().sort((a, b) => a.start - b.start);
  let cursor = 0;
  let largest = 0;
  let free = 0;
  for (const b of sorted) {
    const gap = b.start - cursor;
    free += gap;
    largest = Math.max(largest, gap);
    cursor = b.start + b.size;
  }
  const tail = cells - cursor;
  free += tail;
  largest = Math.max(largest, tail);
  return { free, largest, used: cells - free };
}

// ───────────────────────── struct layout ─────────────────────────

export interface FieldType {
  name: string;
  size: number;
  align: number;
}
export const FIELD_TYPES: Record<string, FieldType> = {
  char: { name: "char", size: 1, align: 1 },
  short: { name: "short", size: 2, align: 2 },
  int: { name: "int", size: 4, align: 4 },
  float: { name: "float", size: 4, align: 4 },
  double: { name: "double", size: 8, align: 8 },
  ptr: { name: "pointer", size: 8, align: 8 },
};

export interface Placed {
  index: number;
  type: string;
  offset: number;
  size: number;
}
export interface Layout {
  placed: Placed[];
  /** [startOffset, length] runs of padding bytes (between fields and at the end). */
  pads: [number, number][];
  size: number;
  align: number;
  padBytes: number;
}

/** C struct layout rules for a typical 64-bit ABI: each field at a multiple of its alignment, total size a multiple of the largest alignment. */
export function layoutStruct(types: string[]): Layout {
  let off = 0;
  let maxAlign = 1;
  const placed: Placed[] = [];
  const pads: [number, number][] = [];
  types.forEach((t, index) => {
    const f = FIELD_TYPES[t];
    maxAlign = Math.max(maxAlign, f.align);
    const aligned = Math.ceil(off / f.align) * f.align;
    if (aligned > off) pads.push([off, aligned - off]);
    placed.push({ index, type: t, offset: aligned, size: f.size });
    off = aligned + f.size;
  });
  const size = types.length ? Math.ceil(off / maxAlign) * maxAlign : 0;
  if (size > off) pads.push([off, size - off]);
  return { placed, pads, size, align: maxAlign, padBytes: pads.reduce((s, p) => s + p[1], 0) };
}
