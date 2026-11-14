/**
 * Pure model behind chip-place: a toy floorplan on a 5 × 5 grid of slots, half-perimeter wirelength (HPWL) and an
 * L-route congestion map. No React, so it also runs in Node.
 */

export const COLS = 5;
export const ROWS = 5;
/** Routing tracks available through one slot (toy). A slot crossed by more nets than this overflows. */
export const CAP = 4;

export interface BlockDef {
  id: string;
  label: string;
  /** Pads are fixed to the edge of the die. */
  fixed?: boolean;
}

export const BLOCKS: BlockDef[] = [
  { id: "IN", label: "IN pad", fixed: true },
  { id: "OUT", label: "OUT pad", fixed: true },
  { id: "CPU", label: "CPU" },
  { id: "SRAM", label: "SRAM" },
  { id: "DSP", label: "DSP" },
  { id: "DMA", label: "DMA" },
  { id: "UART", label: "UART" },
  { id: "PLL", label: "PLL" },
];

export interface Net {
  id: string;
  /** pins[0] is the driver. */
  pins: string[];
}

export const NETS: Net[] = [
  { id: "n1", pins: ["IN", "DMA", "CPU"] },
  { id: "n2", pins: ["CPU", "SRAM"] },
  { id: "n3", pins: ["CPU", "DSP"] },
  { id: "n4", pins: ["DSP", "SRAM", "DMA"] },
  { id: "n5", pins: ["DMA", "UART"] },
  { id: "n6", pins: ["UART", "OUT"] },
  { id: "n7", pins: ["PLL", "CPU", "DSP", "UART"] },
  { id: "n8", pins: ["DSP", "OUT"] },
];

/** Slot index = row * COLS + col. The two pads never move. */
export const FIXED: Record<string, number> = { IN: 10, OUT: 14 };

/** A deliberately bad, scattered starting placement. */
export const START: Record<string, number> = { IN: 10, OUT: 14, CPU: 24, SRAM: 0, DSP: 20, DMA: 4, UART: 2, PLL: 22 };

/** A good placement (found by exhaustive search): HPWL 15, no overflow. The true minimum HPWL is 14 but that one overflows. */
export const GOOD: Record<string, number> = { IN: 10, OUT: 14, CPU: 6, SRAM: 7, DSP: 8, DMA: 12, UART: 13, PLL: 11 };

export type Placement = Record<string, number>;

export const colOf = (i: number) => i % COLS;
export const rowOf = (i: number) => Math.floor(i / COLS);

/** True when every block is placed exactly once on a real slot and the pads are where they belong. */
export function validPlacement(p: unknown): p is Placement {
  if (!p || typeof p !== "object") return false;
  const pl = p as Record<string, unknown>;
  const seen = new Set<number>();
  for (const b of BLOCKS) {
    const v = pl[b.id];
    if (typeof v !== "number" || !Number.isInteger(v) || v < 0 || v >= COLS * ROWS || seen.has(v)) return false;
    if (b.fixed && v !== FIXED[b.id]) return false;
    seen.add(v);
  }
  return true;
}

/** Half-perimeter wirelength of one net: bounding-box width + height, in grid units. */
export function netHpwl(p: Placement, net: Net): number {
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const id of net.pins) {
    const c = colOf(p[id]);
    const r = rowOf(p[id]);
    if (c < x0) x0 = c;
    if (c > x1) x1 = c;
    if (r < y0) y0 = r;
    if (r > y1) y1 = r;
  }
  return x1 - x0 + (y1 - y0);
}

export function hpwl(p: Placement, nets: Net[] = NETS): number {
  let s = 0;
  for (const n of nets) s += netHpwl(p, n);
  return s;
}

/** The slots one L-shaped branch passes through: along the driver's row to the sink's column, then along that column. Includes both ends. */
export function lPath(from: number, to: number): number[] {
  const out = [from];
  let c = colOf(from);
  let r = rowOf(from);
  const tc = colOf(to);
  const tr = rowOf(to);
  while (c !== tc) {
    c += tc > c ? 1 : -1;
    out.push(r * COLS + c);
  }
  while (r !== tr) {
    r += tr > r ? 1 : -1;
    out.push(r * COLS + c);
  }
  return out;
}

/** Every branch of a net (driver to each sink) and the set of slots the net touches. */
export function routeNet(p: Placement, net: Net): { branches: number[][]; cells: number[] } {
  const d = p[net.pins[0]];
  const branches = net.pins.slice(1).map((s) => lPath(d, p[s]));
  const cells = new Set<number>();
  for (const b of branches) for (const c of b) cells.add(c);
  return { branches, cells: [...cells].sort((a, b) => a - b) };
}

/** Number of nets routed through each slot (a net counts once per slot, however many of its branches cross it). */
export function demand(p: Placement, nets: Net[] = NETS): number[] {
  const d = new Array<number>(COLS * ROWS).fill(0);
  for (const n of nets) for (const c of routeNet(p, n).cells) d[c]++;
  return d;
}

/** Sum over slots of demand beyond the capacity. */
export function overflow(p: Placement, cap = CAP, nets: Net[] = NETS): number {
  let s = 0;
  for (const v of demand(p, nets)) if (v > cap) s += v - cap;
  return s;
}

/** Tap-to-select, tap-to-place: move a movable block into an empty slot or swap two movable blocks. null = not allowed. */
export function placeAt(p: Placement, block: string, slot: number): Placement | null {
  const def = BLOCKS.find((b) => b.id === block);
  if (!def || def.fixed || slot < 0 || slot >= COLS * ROWS) return null;
  const occupant = Object.keys(p).find((k) => p[k] === slot);
  if (occupant === block) return p;
  if (occupant) {
    const od = BLOCKS.find((b) => b.id === occupant);
    if (od?.fixed) return null;
    return { ...p, [block]: slot, [occupant]: p[block] };
  }
  return { ...p, [block]: slot };
}

/** goal: { maxHpwl, maxOverflow? }. Recomputes everything from the placement. */
export function checkPlacement(state: unknown, goal: Record<string, unknown>): boolean {
  const s = state as { placement?: unknown } | undefined;
  if (!s || !validPlacement(s.placement)) return false;
  const p = s.placement;
  if (typeof goal.maxHpwl === "number" && hpwl(p) > goal.maxHpwl) return false;
  if (typeof goal.maxOverflow === "number" && overflow(p) > goal.maxOverflow) return false;
  return typeof goal.maxHpwl === "number" || typeof goal.maxOverflow === "number";
}
