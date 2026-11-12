/** Pure toy model of DRAM cells leaking charge and a row buffer. No UI. */

/** Leak time constants (ms) for eight cells. Real retention varies a lot from cell to cell; these are a toy. */
export const TAU = [210, 120, 300, 150, 240, 105, 180, 135];
export const THRESHOLD = 0.5;
export const charge = (sinceMs: number, tau: number) => Math.exp(-sinceMs / tau);

export interface CellState {
  bits: number[];
  /** A stored 1 whose charge fell below the threshold: it now reads as 0 for good. */
  lost: boolean[];
  /** Ms since each cell was last written or refreshed. */
  since: number[];
  elapsed: number;
  powered: boolean;
}

export const freshCells = (bits: number[] = [1, 0, 1, 1, 0, 1, 0, 1]): CellState => ({
  bits: bits.slice(),
  lost: bits.map(() => false),
  since: bits.map(() => 0),
  elapsed: 0,
  powered: true,
});

/** Refresh: every cell that still holds a 1 above the threshold is topped up. Cells already below it are gone. */
export function refreshNow(s: CellState): CellState {
  if (!s.powered) return s;
  const lost = s.lost.slice();
  const since = s.since.slice();
  s.bits.forEach((b, i) => {
    if (b === 1 && !lost[i]) {
      if (charge(since[i], TAU[i]) <= THRESHOLD) lost[i] = true;
      else since[i] = 0;
    }
  });
  return { ...s, lost, since };
}

/** Let `dt` ms pass, refreshing every `refreshMs` (0 = never). Simulated in 1 ms ticks. */
export function advance(s: CellState, dt: number, refreshMs: number): CellState {
  let cur = s;
  for (let ms = 0; ms < dt; ms++) {
    const lost = cur.lost.slice();
    const since = cur.since.map((x) => x + 1);
    cur.bits.forEach((b, i) => {
      if (b === 1 && !lost[i] && charge(since[i], TAU[i]) <= THRESHOLD) lost[i] = true;
    });
    cur = { ...cur, lost, since, elapsed: cur.elapsed + 1 };
    if (refreshMs > 0 && cur.elapsed % refreshMs === 0) cur = refreshNow(cur);
  }
  return cur;
}

export const lostCount = (s: CellState) => s.lost.filter(Boolean).length;

// ─────────────── row buffer ───────────────

export const ROWS = 4;
export const COLS = 4;
/** Typical order-of-magnitude timings in ns for a DRAM read. */
export const T_ROW_HIT = 15;
export const T_ROW_EMPTY = 30;
export const T_ROW_CONFLICT = 45;

export type RowKind = "row hit" | "row empty" | "row conflict";

export interface RowRun {
  kinds: RowKind[];
  ns: number[];
  open: number | null;
  total: number;
}

export function runRows(reads: [number, number][]): RowRun {
  let open: number | null = null;
  const kinds: RowKind[] = [];
  const ns: number[] = [];
  let total = 0;
  for (const [r] of reads) {
    let k: RowKind;
    if (open === null) k = "row empty";
    else if (open === r) k = "row hit";
    else k = "row conflict";
    const t = k === "row hit" ? T_ROW_HIT : k === "row empty" ? T_ROW_EMPTY : T_ROW_CONFLICT;
    kinds.push(k);
    ns.push(t);
    total += t;
    open = r;
  }
  return { kinds, ns, open, total };
}
