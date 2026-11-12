/** Pure cache simulation: set-associative with LRU, miss classification, a line-granular traversal model. No UI. */

export const isPow2 = (n: number) => n > 0 && (n & (n - 1)) === 0;
export const log2 = (n: number) => Math.round(Math.log2(n));

export interface CacheCfg {
  lineBytes: number;
  ways: number;
  sets: number;
}

export interface Split {
  tag: number;
  index: number;
  offset: number;
  offsetBits: number;
  indexBits: number;
  tagBits: number;
}

/** Split an address into tag / index / offset for a cache shape (all sizes powers of two). */
export function splitAddr(addr: number, cfg: CacheCfg, addrBits = 16): Split {
  const offsetBits = log2(cfg.lineBytes);
  const indexBits = log2(cfg.sets);
  const tagBits = Math.max(0, addrBits - offsetBits - indexBits);
  const a = addr >>> 0;
  const offset = a & (cfg.lineBytes - 1);
  const index = (a >>> offsetBits) & (cfg.sets - 1);
  const tag = a >>> (offsetBits + indexBits);
  return { tag, index, offset, offsetBits, indexBits, tagBits };
}

export type MissKind = "compulsory" | "capacity" | "conflict";

export interface Way {
  /** Tag stored in this way, or null when empty. */
  tag: number | null;
  /** Clock of the last use (higher = more recent). */
  used: number;
}

export interface Access {
  addr: number;
  line: number;
  set: number;
  tag: number;
  hit: boolean;
  way: number;
  /** Line number evicted by this access (null when the way was empty or it was a hit). */
  evictedLine: number | null;
  kind: MissKind | null;
}

export interface CacheRun {
  steps: Access[];
  sets: Way[][];
  hits: number;
  misses: number;
  kinds: Record<MissKind, number>;
}

/** Run a read sequence through a set-associative LRU cache. Misses are classified the textbook way. */
export function runCache(cfg: CacheCfg, addrs: number[]): CacheRun {
  const sets: Way[][] = Array.from({ length: cfg.sets }, () => Array.from({ length: cfg.ways }, () => ({ tag: null, used: 0 })));
  const total = cfg.sets * cfg.ways;
  const seen = new Set<number>();
  const fa: number[] = []; // fully associative LRU of the same size, most recent last
  const steps: Access[] = [];
  const kinds: Record<MissKind, number> = { compulsory: 0, capacity: 0, conflict: 0 };
  let hits = 0;
  let clock = 0;
  for (const addr of addrs) {
    clock++;
    const sp = splitAddr(addr, cfg, 32);
    const line = Math.floor(addr / cfg.lineBytes);
    const row = sets[sp.index];
    let way = row.findIndex((w) => w.tag === sp.tag);
    const hit = way >= 0;
    let evictedLine: number | null = null;
    let kind: MissKind | null = null;
    // the fully associative twin decides capacity vs conflict
    const faAt = fa.indexOf(line);
    const faHit = faAt >= 0;
    if (faHit) fa.splice(faAt, 1);
    fa.push(line);
    if (fa.length > total) fa.shift();
    if (hit) {
      hits++;
    } else {
      kind = !seen.has(line) ? "compulsory" : faHit ? "conflict" : "capacity";
      kinds[kind]++;
      way = row.findIndex((w) => w.tag === null);
      if (way < 0) {
        way = 0;
        for (let i = 1; i < row.length; i++) if (row[i].used < row[way].used) way = i;
        evictedLine = row[way].tag! * cfg.sets + sp.index;
      }
      row[way].tag = sp.tag;
    }
    row[way].used = clock;
    seen.add(line);
    steps.push({ addr, line, set: sp.index, tag: sp.tag, hit, way, evictedLine, kind });
  }
  return { steps, sets, hits, misses: addrs.length - hits, kinds };
}

/** A grid walk: ROWS x COLS ints (4 bytes each, row-major in memory), through a small fully associative LRU line cache. */
export interface WalkStep {
  r: number;
  c: number;
  line: number;
  hit: boolean;
  prefetched: boolean;
}
export interface WalkRun {
  steps: WalkStep[];
  hits: number;
  misses: number;
  /** Resident lines (least recent first) after step k (0..n). */
  resident: number[][];
}

export function walkGrid(rows: number, cols: number, order: "row" | "col", capLines: number, prefetch: boolean, lineInts = 16): WalkRun {
  const seq: [number, number][] = [];
  if (order === "row") for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) seq.push([r, c]);
  else for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) seq.push([r, c]);
  const cache: number[] = [];
  const pref = new Set<number>();
  const steps: WalkStep[] = [];
  const resident: number[][] = [[]];
  let hits = 0;
  const touch = (line: number) => {
    const at = cache.indexOf(line);
    if (at >= 0) cache.splice(at, 1);
    cache.push(line);
    if (cache.length > capLines) {
      const gone = cache.shift()!;
      pref.delete(gone);
    }
  };
  const lastLine = Math.floor((rows * cols - 1) / lineInts);
  for (const [r, c] of seq) {
    const line = Math.floor((r * cols + c) / lineInts);
    const hit = cache.includes(line);
    const prefetched = hit && pref.has(line);
    if (hit) hits++;
    touch(line);
    if (hit) pref.delete(line);
    if (!hit && prefetch && line + 1 <= lastLine && !cache.includes(line + 1)) {
      touch(line + 1);
      pref.add(line + 1);
    }
    steps.push({ r, c, line, hit, prefetched });
    resident.push(cache.slice());
  }
  return { steps, hits, misses: steps.length - hits, resident };
}

/** Number of distinct cache lines a list of byte addresses touches. */
export function linesTouched(addrs: number[], lineBytes = 64): number {
  return new Set(addrs.map((a) => Math.floor(a / lineBytes))).size;
}

/** Working-set curve: average access time for random accesses over `ws` bytes through a cache hierarchy (toy model). */
export interface Level {
  name: string;
  bytes: number;
  ns: number;
}
export const DEFAULT_LEVELS: Level[] = [
  { name: "L1", bytes: 32 * 1024, ns: 1 },
  { name: "L2", bytes: 1024 * 1024, ns: 4 },
  { name: "L3", bytes: 32 * 1024 * 1024, ns: 15 },
  { name: "RAM", bytes: Infinity, ns: 90 },
];
export function avgLatency(ws: number, levels: Level[] = DEFAULT_LEVELS): { ns: number; share: number[] } {
  let prev = 0;
  let ns = 0;
  const share: number[] = [];
  for (const l of levels) {
    const reach = Math.min(1, l.bytes / ws);
    const p = Math.max(0, reach - prev);
    share.push(p);
    ns += p * l.ns;
    prev = Math.max(prev, reach);
  }
  return { ns, share };
}

/** AMAT with per-level hit rates (fraction of accesses that reach the level and hit there). RAM always hits. */
export function amat(hit: number[], ns: number[]): { ns: number; parts: number[]; reach: number[] } {
  let reach = 1;
  let total = 0;
  const parts: number[] = [];
  const reached: number[] = [];
  for (let i = 0; i < ns.length; i++) {
    reached.push(reach);
    const part = reach * ns[i];
    parts.push(part);
    total += part;
    reach *= i < hit.length ? 1 - hit[i] : 0;
  }
  return { ns: total, parts, reach: reached };
}
