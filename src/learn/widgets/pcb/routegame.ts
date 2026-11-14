/**
 * Pure logic of the place-and-route game: one copper layer on a 6 x 7 grid, three nets, a toy clearance rule and a
 * "decoupling loop" metric. No React, so Node can test it (a solver confirms a clean, tight layout exists).
 */

export const COLS = 6;
export const ROWS = 7;

export type NetId = "VCC" | "GND" | "SIG";
export const NETS: NetId[] = ["VCC", "GND", "SIG"];
export type Rot = 0 | 90 | 180 | 270;
export type Pt = [number, number];

export const key = (x: number, y: number) => `${x},${y}`;
export const unkey = (k: string): Pt => k.split(",").map(Number) as Pt;
const NEIGHBOURS: Pt[] = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
];
export const neighbours = (k: string): string[] => {
  const [x, y] = unkey(k);
  return NEIGHBOURS.map(([dx, dy]) => [x + dx, y + dy] as Pt)
    .filter(([a, b]) => a >= 0 && a < COLS && b >= 0 && b < ROWS)
    .map(([a, b]) => key(a, b));
};

export interface Pin {
  part: string;
  /** Pin name drawn in the cell. */
  name: string;
  net: NetId;
}
export interface BodyCell {
  part: string;
  /** Label drawn in a part cell without a pin (empty = none). */
  label: string;
}

/** Fixed parts: pins (cells with a net) and body cells (no net). */
export const FIXED_PINS: Record<string, Pin> = {
  [key(0, 1)]: { part: "J1", name: "VCC", net: "VCC" },
  [key(0, 3)]: { part: "J1", name: "GND", net: "GND" },
  [key(3, 2)]: { part: "U1", name: "VDD", net: "VCC" },
  [key(3, 3)]: { part: "U1", name: "GND", net: "GND" },
  [key(4, 3)]: { part: "U1", name: "OUT", net: "SIG" },
  [key(5, 5)]: { part: "J2", name: "SIG", net: "SIG" },
};
export const FIXED_BODY: Record<string, BodyCell> = {
  [key(0, 2)]: { part: "J1", label: "J1" },
  [key(4, 2)]: { part: "U1", label: "U1" },
};

export interface Layout {
  /** C1: the "+" pad cell and rotation. Rotation 0 puts the "−" pad one cell below; 90 left; 180 above; 270 right. */
  c1: [number, number, Rot];
}
export const DEFAULT_C1: [number, number, Rot] = [0, 5, 0];

export function c1Cells(l: Layout): { plus: string; minus: string } {
  const [x, y, r] = l.c1;
  const d: Pt = r === 0 ? [0, 1] : r === 90 ? [-1, 0] : r === 180 ? [0, -1] : [1, 0];
  return { plus: key(x, y), minus: key(x + d[0], y + d[1]) };
}

/** All pin cells for a layout (fixed plus C1's two pads). */
export function pinsOf(l: Layout): Record<string, Pin> {
  const { plus, minus } = c1Cells(l);
  return { ...FIXED_PINS, [plus]: { part: "C1", name: "+", net: "VCC" }, [minus]: { part: "C1", name: "−", net: "GND" } };
}

/** Cells that hold a part (pins and bodies). */
export function partCells(l: Layout): Set<string> {
  return new Set([...Object.keys(pinsOf(l)), ...Object.keys(FIXED_BODY)]);
}

export type Copper = Record<NetId, string[]>;
export const emptyCopper = (): Copper => ({ VCC: [], GND: [], SIG: [] });

export function ownerOf(copper: Copper, k: string): NetId | null {
  for (const n of NETS) if (copper[n].includes(k)) return n;
  return null;
}

const inBounds = (k: string) => {
  const [x, y] = unkey(k);
  return x >= 0 && x < COLS && y >= 0 && y < ROWS;
};

/** Try to move C1 so its "+" pad is at (x, y). Returns the new layout or a reason. */
export function placeC1(l: Layout, copper: Copper, x: number, y: number, rot: Rot): { ok: true; layout: Layout } | { ok: false; why: string } {
  const next: Layout = { c1: [x, y, rot] };
  const { plus, minus } = c1Cells(next);
  if (!inBounds(plus) || !inBounds(minus)) return { ok: false, why: "C1 would hang off the board edge." };
  const taken = new Set([...Object.keys(FIXED_PINS), ...Object.keys(FIXED_BODY)]);
  if (taken.has(plus) || taken.has(minus)) return { ok: false, why: "Another part is already there." };
  for (const k of [plus, minus]) {
    const o = ownerOf(copper, k);
    if (o === "SIG") return { ok: false, why: "A SIG trace is there. Clear it first." };
  }
  void l;
  return { ok: true, layout: next };
}

/** The cells a net's copper can connect through: its trace cells plus its pins. */
function netCells(l: Layout, copper: Copper, net: NetId): Set<string> {
  const s = new Set(copper[net]);
  for (const [k, p] of Object.entries(pinsOf(l))) if (p.net === net) s.add(k);
  return s;
}

/** Steps along a net's connected cells from one cell to another (BFS), or -1 when they are not connected. */
export function pathSteps(l: Layout, copper: Copper, net: NetId, from: string, to: string): number {
  const cells = netCells(l, copper, net);
  if (!cells.has(from) || !cells.has(to)) return -1;
  const dist = new Map<string, number>([[from, 0]]);
  const q = [from];
  while (q.length) {
    const c = q.shift()!;
    if (c === to) return dist.get(c)!;
    for (const n of neighbours(c)) if (cells.has(n) && !dist.has(n)) {
      dist.set(n, dist.get(c)! + 1);
      q.push(n);
    }
  }
  return -1;
}

export function isRouted(l: Layout, copper: Copper, net: NetId): boolean {
  const pins = Object.entries(pinsOf(l)).filter(([, p]) => p.net === net).map(([k]) => k);
  return pins.every((p) => pathSteps(l, copper, net, pins[0], p) >= 0);
}

export interface Report {
  routed: Record<NetId, boolean>;
  unrouted: NetId[];
  /** Clearance violations: pairs of touching cells of different nets (pins of one part excepted). */
  drcErrors: number;
  /** Cells to highlight. */
  drcCells: string[];
  /** Steps VDD→C1+ plus C1−→GND through the copper, or -1 when either is not connected. */
  loopCells: number;
  totalCells: number;
}

export function evaluate(l: Layout, copper: Copper): Report {
  const pins = pinsOf(l);
  const netAt = (k: string): { net: NetId; part?: string } | null => {
    if (pins[k]) return { net: pins[k].net, part: pins[k].part };
    const o = ownerOf(copper, k);
    return o ? { net: o } : null;
  };
  const routed = { VCC: isRouted(l, copper, "VCC"), GND: isRouted(l, copper, "GND"), SIG: isRouted(l, copper, "SIG") } as Record<NetId, boolean>;
  let drc = 0;
  const bad = new Set<string>();
  for (let y = 0; y < ROWS; y++)
    for (let x = 0; x < COLS; x++) {
      const a = key(x, y);
      const na = netAt(a);
      if (!na) continue;
      for (const b of [key(x + 1, y), key(x, y + 1)]) {
        if (!inBounds(b)) continue;
        const nb = netAt(b);
        if (!nb || nb.net === na.net) continue;
        if (na.part && nb.part && na.part === nb.part) continue;
        drc++;
        bad.add(a);
        bad.add(b);
      }
    }
  const { plus, minus } = c1Cells(l);
  const a = pathSteps(l, copper, "VCC", key(3, 2), plus);
  const b = pathSteps(l, copper, "GND", key(3, 3), minus);
  return {
    routed,
    unrouted: NETS.filter((n) => !routed[n]),
    drcErrors: drc,
    drcCells: [...bad],
    loopCells: a < 0 || b < 0 ? -1 : a + b,
    totalCells: NETS.reduce((s, n) => s + copper[n].length, 0),
  };
}

/** One tap on a cell while routing `net`. Returns the new copper and a message for the learner. */
export function tapRoute(l: Layout, copper: Copper, net: NetId, k: string): { copper: Copper; msg: string } {
  const pins = pinsOf(l);
  if (pins[k] || FIXED_BODY[k]) return { copper, msg: "That cell holds a part. Traces start in a cell next to a pad." };
  const owner = ownerOf(copper, k);
  if (owner && owner !== net) return { copper, msg: `That cell already carries ${owner}. Different nets cannot share a cell on one layer.` };
  if (owner === net) {
    const list = copper[net];
    if (list[list.length - 1] === k) return { copper: { ...copper, [net]: list.slice(0, -1) }, msg: `Removed the last ${net} cell.` };
    return { copper, msg: "Tap the most recent cell to undo it, or use Clear net." };
  }
  const cells = netCells(l, copper, net);
  if (!neighbours(k).some((n) => cells.has(n))) return { copper, msg: `Start next to a ${net} pad, or next to a cell you already routed.` };
  return { copper: { ...copper, [net]: [...copper[net], k] }, msg: `Added a ${net} cell.` };
}

/** Moving C1 breaks the cap's nets, so the VCC and GND copper is cleared. */
export function clearPowerCopper(copper: Copper): Copper {
  return { ...copper, VCC: [], GND: [] };
}
