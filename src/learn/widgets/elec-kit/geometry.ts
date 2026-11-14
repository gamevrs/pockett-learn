/**
 * Pure geometry of the schematic symbols: the grid, pin positions and where each polarity mark is drawn.
 * symbols.tsx draws from these constants, and scripts/test-elec-kit.mjs checks them in Node (no DOM): for every
 * polarised symbol and rotation, the "+" / anode / arrow tail must sit at pin a, the "−" / cathode / arrow head
 * at pin b, and the op-amp's signs at the matching input pins.
 */

export const GRID = 20;
export type Rot = 0 | 90 | 180 | 270;
export type Pt = [number, number];

/** Pin positions in a part's own frame (rot 0). */
export const PIN_OFFSETS = {
  two: { a: [0, 0], b: [60, 0] },
  gnd: { a: [0, 0] },
  dot: { a: [0, 0] },
  npn: { b: [0, 0], c: [40, -40], e: [40, 40] },
  nmos: { g: [0, 0], d: [40, -40], s: [40, 40] },
  pmos: { g: [0, 0], s: [40, -40], d: [40, 40] },
  opamp: { minus: [0, -20], plus: [0, 20], out: [80, 0] },
} as const satisfies Record<string, Record<string, Pt>>;

/**
 * Polarity marks in the part's own frame (rot 0, pin a at the origin, pin b at (60, 0)). `plus` is the "+"
 * sign, the anode side of a diode/LED triangle, or a current source's arrow tail; `minus` is the "−" sign, the
 * cathode bar or the arrow head. For the op-amp they are the input signs in the unflipped drawing.
 */
export const MARKS = {
  battery: { plus: [13, -11], minus: [40, 0] },
  "battery-1": { plus: [17, -11], minus: [34, 0] },
  "polar-capacitor": { plus: [17, -11], minus: [34, 0] },
  "dc-source": { plus: [23, 0], minus: [37, 0] },
  "current-source": { plus: [21, 0], minus: [39, 0] },
  diode: { plus: [20, 0], minus: [40, 0] },
  led: { plus: [20, 0], minus: [40, 0] },
  opamp: { minus: [30, -20], plus: [30, 20] },
} as const satisfies Record<string, { plus: Pt; minus: Pt }>;

export function rotate([px, py]: readonly [number, number], rot: Rot = 0): Pt {
  switch (rot) {
    case 0:
      return [px, py];
    case 90:
      return [-py, px];
    case 180:
      return [-px, -py];
    case 270:
      return [py, -px];
  }
}

export type SymbolKind =
  | "resistor"
  | "capacitor"
  | "polar-capacitor"
  | "inductor"
  | "battery"
  | "dc-source"
  | "ac-source"
  | "current-source"
  | "diode"
  | "led"
  | "switch"
  | "lamp"
  | "ground"
  | "junction"
  | "npn"
  | "nmos"
  | "pmos"
  | "opamp";

const TWO_PIN: SymbolKind[] = ["resistor", "capacitor", "polar-capacitor", "inductor", "battery", "dc-source", "ac-source", "current-source", "diode", "led", "switch", "lamp"];

/** Absolute pin positions of a part placed at (x, y). Two-pin parts: { a, b }; npn: { b, c, e }; nmos/pmos: { g, d, s }; opamp: { minus, plus, out }. */
export function pinsOf(kind: SymbolKind, x: number, y: number, rot: Rot = 0, opts: { mirror?: boolean; flip?: boolean } = {}): Record<string, Pt> {
  const table: Record<string, readonly [number, number]> =
    TWO_PIN.includes(kind) ? PIN_OFFSETS.two
    : kind === "ground" ? PIN_OFFSETS.gnd
    : kind === "junction" ? PIN_OFFSETS.dot
    : kind === "npn" ? PIN_OFFSETS.npn
    : kind === "nmos" ? PIN_OFFSETS.nmos
    : kind === "pmos" ? PIN_OFFSETS.pmos
    : PIN_OFFSETS.opamp;
  const out: Record<string, Pt> = {};
  for (const [name, off] of Object.entries(table)) {
    let o: Pt = [off[0], off[1]];
    // op-amp `flip` puts + on top, so the input pins swap places
    if (kind === "opamp" && opts.flip && name !== "out") o = [o[0], -o[1]];
    if (opts.mirror && (kind === "npn" || kind === "nmos" || kind === "pmos")) o = [-o[0], o[1]];
    const r = TWO_PIN.includes(kind) || kind === "ground" ? rotate(o, rot) : o;
    out[name] = [x + r[0], y + r[1]];
  }
  return out;
}

/** Where a symbol's polarity mark lands when the part is placed at (x, y) with rotation `rot` (op-amp: `flip` swaps the signs). */
export function markOf(kind: keyof typeof MARKS, which: "plus" | "minus", x: number, y: number, rot: Rot = 0, opts: { flip?: boolean } = {}): Pt {
  if (kind === "opamp") {
    const m = MARKS.opamp[which];
    return [x + m[0], y + (opts.flip ? -m[1] : m[1])];
  }
  const r = rotate(MARKS[kind][which], rot);
  return [x + r[0], y + r[1]];
}

/**
 * Seconds per dot spacing for a wire carrying `flow`, or null when no dots should move.
 * The fastest wire is 0.25 s, a vanishing one 2 s. `scale` is the |flow| that moves at full speed:
 * the largest |flow| on the drawing by default, or Schematic's `flowRef` when that is bigger.
 */
export function flowDuration(flow: number, scale: number): number | null {
  if (!(scale > 0) || Math.abs(flow) < scale * 1e-6) return null;
  const rel = Math.min(1, Math.abs(flow) / scale);
  return 2 - 1.75 * rel;
}
