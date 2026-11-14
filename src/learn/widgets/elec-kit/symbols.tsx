/**
 * SVG schematic symbols for the electronics widgets, drawn on a 20-unit grid (GRID). Use them inside an
 * <svg> whose viewBox is about 360 units wide (18 grid cells) so the 14-unit labels read at phone width.
 *
 * Style: the resistor is the zigzag (ANSI/US) form by default, as in most datasheets' typical-application
 * circuits and beginner material; pass `variant="box"` for the IEC rectangle (used across Europe and by KiCad's
 * default library) when a lesson wants to show both.
 *
 * Geometry. Two-pin parts run from pin `a` at (x, y) to pin `b` 60 units (3 grid cells) along the rotation:
 * rot 0 → b is 60 to the right, 90 → 60 down, 180 → 60 left, 270 → 60 up. Polarity: `a` is the battery/source
 * + terminal, the diode/LED anode, the capacitor + plate. Ground has one pin at (x, y). Transistors and the
 * op-amp have named pins (see PIN_OFFSETS). `pinsOf(kind, x, y, rot)` returns every pin's absolute position.
 *
 * Colours are CSS variables (theme-aware): wires and outlines var(--ink), highlighted parts var(--brand),
 * labels var(--ink) and values var(--ink-2), part bodies var(--surface). A lit LED or lamp glows with
 * var(--elec-glow, #f5c518).
 */
import type { ReactNode } from "react";

export const GRID = 20;
export type Rot = 0 | 90 | 180 | 270;
export type Pt = [number, number];

const INK = "var(--ink)";
const HI = "var(--brand)";
const BODY = "var(--surface)";
const GLOW = "var(--elec-glow, #f5c518)";
const SW = 2;
export const LABEL_SIZE = 14;

export interface PartProps {
  x: number;
  y: number;
  rot?: Rot;
  /** reference designator or name, e.g. "R1" */
  label?: string;
  /** value text under the label, e.g. "4.7 kΩ" */
  value?: string;
  /** draw in the accent colour (e.g. the part the step is about) */
  highlight?: boolean;
  /** put the label on the other side (below a horizontal part, left of a vertical one) */
  labelFlip?: boolean;
}

/* ───────────────────────── pin geometry ───────────────────────── */

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

/* ───────────────────────── shared bits ───────────────────────── */

const stroke = (hi?: boolean) => (hi ? HI : INK);

function Frame({ x, y, rot = 0, children }: { x: number; y: number; rot?: Rot; children: ReactNode }) {
  return <g transform={`translate(${x} ${y})${rot ? ` rotate(${rot})` : ""}`}>{children}</g>;
}

/** Label and value beside a part's centre, always upright. `cx, cy` is the centre in absolute units. */
export function PartLabel({ cx, cy, vertical, label, value, flip, gap = 18 }: { cx: number; cy: number; vertical: boolean; label?: string; value?: string; flip?: boolean; gap?: number }) {
  if (!label && !value) return null;
  const lines = [label, value].filter(Boolean) as string[];
  if (vertical) {
    const x = flip ? cx - gap : cx + gap;
    const top = cy + 5 - ((lines.length - 1) * 17) / 2;
    return (
      <g fontSize={LABEL_SIZE} textAnchor={flip ? "end" : "start"}>
        {lines.map((t, i) => (
          <text key={i} x={x} y={top + i * 17} fill={i === 0 && label ? INK : "var(--ink-2)"} fontWeight={i === 0 && label ? 600 : 400}>
            {t}
          </text>
        ))}
      </g>
    );
  }
  // horizontal: label above, value below (or both below / both above when flipped)
  if (flip) {
    return (
      <g fontSize={LABEL_SIZE} textAnchor="middle">
        {lines.map((t, i) => (
          <text key={i} x={cx} y={cy + gap + 11 + i * 17} fill={i === 0 && label ? INK : "var(--ink-2)"} fontWeight={i === 0 && label ? 600 : 400}>
            {t}
          </text>
        ))}
      </g>
    );
  }
  return (
    <g fontSize={LABEL_SIZE} textAnchor="middle">
      {label && (
        <text x={cx} y={cy - gap + 4} fill={INK} fontWeight={600}>
          {label}
        </text>
      )}
      {value && (
        <text x={cx} y={cy + gap + 11} fill="var(--ink-2)">
          {value}
        </text>
      )}
    </g>
  );
}

/** Wrapper for every two-pin part: frame, leads and an upright label at the middle. */
function TwoPin({ x, y, rot = 0, label, value, highlight, labelFlip, leadA, leadB, gap, children }: PartProps & { leadA: number; leadB: number; gap?: number; children: ReactNode }) {
  const [mx, my] = rotate([30, 0], rot);
  const c = stroke(highlight);
  return (
    <g>
      <Frame x={x} y={y} rot={rot}>
        <g stroke={c} strokeWidth={SW} fill="none" strokeLinecap="round" strokeLinejoin="round">
          <line x1={0} y1={0} x2={leadA} y2={0} />
          <line x1={leadB} y1={0} x2={60} y2={0} />
          {children}
        </g>
      </Frame>
      <PartLabel cx={x + mx} cy={y + my} vertical={rot === 90 || rot === 270} label={label} value={value} flip={labelFlip} gap={gap} />
    </g>
  );
}

/** A small "+" drawn with lines (crisper than a glyph at this size). */
function Plus({ x, y, s = 4 }: { x: number; y: number; s?: number }) {
  return <path d={`M${x - s} ${y}H${x + s}M${x} ${y - s}V${y + s}`} />;
}
function Minus({ x, y, s = 4 }: { x: number; y: number; s?: number }) {
  return <path d={`M${x - s} ${y}H${x + s}`} />;
}

/* ───────────────────────── two-pin parts ───────────────────────── */

export function Resistor(p: PartProps & { variant?: "zigzag" | "box" }) {
  if (p.variant === "box") {
    return (
      <TwoPin {...p} leadA={14} leadB={46}>
        <rect x={14} y={-7} width={32} height={14} fill={BODY} />
      </TwoPin>
    );
  }
  return (
    <TwoPin {...p} leadA={12} leadB={48}>
      <polyline points="12,0 15,-8 21,8 27,-8 33,8 39,-8 45,8 48,0" />
    </TwoPin>
  );
}

export function Capacitor(p: PartProps) {
  return (
    <TwoPin {...p} leadA={26} leadB={34} gap={22}>
      <line x1={26} y1={-13} x2={26} y2={13} strokeWidth={2.5} />
      <line x1={34} y1={-13} x2={34} y2={13} strokeWidth={2.5} />
    </TwoPin>
  );
}

/** Polarised (electrolytic) capacitor: straight + plate at pin a, curved − plate at pin b. */
export function PolarCapacitor(p: PartProps) {
  return (
    <TwoPin {...p} leadA={26} leadB={32} gap={23}>
      <line x1={26} y1={-13} x2={26} y2={13} strokeWidth={2.5} />
      <path d="M37 -13 Q31 0 37 13" strokeWidth={2.5} />
      <Plus x={17} y={-11} s={3.5} />
    </TwoPin>
  );
}

export function Inductor(p: PartProps) {
  return (
    <TwoPin {...p} leadA={10} leadB={50}>
      <path d="M10 0 a5 5 0 0 1 10 0 a5 5 0 0 1 10 0 a5 5 0 0 1 10 0 a5 5 0 0 1 10 0" />
    </TwoPin>
  );
}

/** Battery: long plate = +, at pin a. `cells` 1 or 2 (default 2). */
export function Battery(p: PartProps & { cells?: 1 | 2 }) {
  const two = (p.cells ?? 2) === 2;
  return (
    <TwoPin {...p} leadA={two ? 22 : 26} leadB={two ? 40 : 34} gap={23}>
      {two ? (
        <>
          <line x1={22} y1={-14} x2={22} y2={14} />
          <line x1={28} y1={-7} x2={28} y2={7} strokeWidth={4} strokeLinecap="butt" />
          <line x1={34} y1={-14} x2={34} y2={14} />
          <line x1={40} y1={-7} x2={40} y2={7} strokeWidth={4} strokeLinecap="butt" />
        </>
      ) : (
        <>
          <line x1={26} y1={-14} x2={26} y2={14} />
          <line x1={34} y1={-7} x2={34} y2={7} strokeWidth={4} strokeLinecap="butt" />
        </>
      )}
      <Plus x={two ? 13 : 17} y={-11} s={3.5} />
    </TwoPin>
  );
}

/** DC voltage source (circle with + at pin a). */
export function DCSource(p: PartProps) {
  return (
    <TwoPin {...p} leadA={16} leadB={44} gap={23}>
      <circle cx={30} cy={0} r={14} fill={BODY} />
      <Plus x={23} y={0} s={3.5} />
      <Minus x={37} y={0} s={3.5} />
    </TwoPin>
  );
}

export function ACSource(p: PartProps) {
  return (
    <TwoPin {...p} leadA={16} leadB={44} gap={23}>
      <circle cx={30} cy={0} r={14} fill={BODY} />
      <path d="M21 0 Q25.5 -10 30 0 T39 0" />
    </TwoPin>
  );
}

/** Current source: the arrow points the way it pushes current, from pin a to pin b. */
export function CurrentSource(p: PartProps) {
  return (
    <TwoPin {...p} leadA={16} leadB={44} gap={23}>
      <circle cx={30} cy={0} r={14} fill={BODY} />
      <path d="M21 0H38M33 -5L39 0L33 5" />
    </TwoPin>
  );
}

/** Diode: anode at pin a, cathode (bar) at pin b. */
export function Diode(p: PartProps) {
  const c = stroke(p.highlight);
  return (
    <TwoPin {...p} leadA={20} leadB={40} gap={21}>
      <path d="M20 -12L20 12L40 0Z" fill={c} />
      <line x1={40} y1={-12} x2={40} y2={12} />
    </TwoPin>
  );
}

/** LED: a diode with two arrows of light. `on` fills it and adds a glow. */
export function LED(p: PartProps & { on?: boolean; color?: string }) {
  const lit = p.color ?? GLOW;
  return (
    <TwoPin {...p} leadA={20} leadB={40} gap={p.rot === 90 || p.rot === 270 ? 26 : 29}>
      {p.on && <circle cx={30} cy={0} r={20} fill={lit} opacity={0.3} stroke="none" />}
      <path d="M20 -12L20 12L40 0Z" fill={p.on ? lit : BODY} />
      <line x1={40} y1={-12} x2={40} y2={12} />
      <path d="M30 -12L37 -19M37 -19h-5M37 -19v5" />
      <path d="M37 -9L44 -16M44 -16h-5M44 -16v5" />
    </TwoPin>
  );
}

/** Single-pole switch. */
export function Switch(p: PartProps & { closed?: boolean }) {
  const c = stroke(p.highlight);
  return (
    <TwoPin {...p} leadA={16} leadB={44} gap={25}>
      <circle cx={16} cy={0} r={3} fill={BODY} />
      <circle cx={44} cy={0} r={3} fill={BODY} />
      {p.closed ? <line x1={18} y1={-2} x2={43} y2={-3} stroke={c} /> : <line x1={18} y1={-2} x2={42} y2={-17} stroke={c} />}
    </TwoPin>
  );
}

/** Lamp: a circle with a cross. `brightness` 0–1 adds a glow. */
export function Lamp(p: PartProps & { brightness?: number }) {
  const b = Math.max(0, Math.min(1, p.brightness ?? 0));
  return (
    <TwoPin {...p} leadA={17} leadB={43} gap={b > 0 ? 29 : 22}>
      {b > 0 && <circle cx={30} cy={0} r={13 + 9 * b} fill={GLOW} opacity={0.15 + 0.45 * b} stroke="none" />}
      <circle cx={30} cy={0} r={13} fill={b > 0 ? GLOW : BODY} fillOpacity={b > 0 ? 0.35 + 0.5 * b : 1} />
      <path d="M20.8 -9.2L39.2 9.2M20.8 9.2L39.2 -9.2" />
    </TwoPin>
  );
}

/* ───────────────────────── one-pin and decoration ───────────────────────── */

export function Ground({ x, y, rot = 0, highlight, label }: Pick<PartProps, "x" | "y" | "rot" | "highlight" | "label">) {
  const c = stroke(highlight);
  return (
    <g>
      <Frame x={x} y={y} rot={rot}>
        <g stroke={c} strokeWidth={SW} strokeLinecap="round">
          <line x1={0} y1={0} x2={0} y2={14} />
          <line x1={-14} y1={14} x2={14} y2={14} />
          <line x1={-9} y1={19.5} x2={9} y2={19.5} />
          <line x1={-4} y1={25} x2={4} y2={25} />
        </g>
      </Frame>
      {label && (
        <text x={x + 20} y={y + 19} fontSize={LABEL_SIZE} fill="var(--ink-2)">
          {label}
        </text>
      )}
    </g>
  );
}

/** Junction dot where three or more wires meet. */
export function Junction({ x, y, highlight }: { x: number; y: number; highlight?: boolean }) {
  return <circle cx={x} cy={y} r={4} fill={stroke(highlight)} />;
}

/** A wire through the given points (absolute units). */
export function Wire({ points, highlight, dashed }: { points: Pt[]; highlight?: boolean; dashed?: boolean }) {
  return <polyline points={points.map((p) => p.join(",")).join(" ")} fill="none" stroke={stroke(highlight)} strokeWidth={SW} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={dashed ? "6 5" : undefined} />;
}

/** Free text at a point, e.g. a net name ("5V", "OUT") or a node voltage. */
export function NetLabel({ x, y, text, anchor = "start", muted }: { x: number; y: number; text: string; anchor?: "start" | "middle" | "end"; muted?: boolean }) {
  return (
    <text x={x} y={y} fontSize={LABEL_SIZE} textAnchor={anchor} fill={muted ? "var(--ink-2)" : INK}>
      {text}
    </text>
  );
}

/** Arrowhead showing current direction on a wire at (x, y), pointing along `rot` (0 = right). */
export function CurrentArrow({ x, y, rot = 0, label, highlight = true }: { x: number; y: number; rot?: Rot; label?: string; highlight?: boolean }) {
  const [lx, ly] = rot === 0 || rot === 180 ? [0, -12] : [12, 5];
  return (
    <g>
      <Frame x={x} y={y} rot={rot}>
        <path d="M-6 -6L4 0L-6 6Z" fill={stroke(highlight)} />
      </Frame>
      {label && (
        <text x={x + lx} y={y + ly} fontSize={LABEL_SIZE} textAnchor={rot === 0 || rot === 180 ? "middle" : "start"} fill={stroke(highlight)} fontWeight={600}>
          {label}
        </text>
      )}
    </g>
  );
}

/* ───────────────────────── three-pin parts and the op-amp ───────────────────────── */

type ThreePinProps = Omit<PartProps, "rot"> & { /** mirror left-right (input on the right) */ mirror?: boolean; /** circle around the transistor (default true) */ circle?: boolean };

function Mirror({ x, y, mirror, children }: { x: number; y: number; mirror?: boolean; children: ReactNode }) {
  return <g transform={`translate(${x} ${y})${mirror ? " scale(-1 1)" : ""}`}>{children}</g>;
}

function SideLabel({ x, y, mirror, label, value }: { x: number; y: number; mirror?: boolean; label?: string; value?: string }) {
  const lx = mirror ? x - 56 : x + 56;
  return (
    <g fontSize={LABEL_SIZE} textAnchor={mirror ? "end" : "start"}>
      {label && (
        <text x={lx} y={y - 3} fill={INK} fontWeight={600}>
          {label}
        </text>
      )}
      {value && (
        <text x={lx} y={y + 14} fill="var(--ink-2)">
          {value}
        </text>
      )}
    </g>
  );
}

/** NPN bipolar transistor: base pin at (x, y), collector 40 right/40 up, emitter 40 right/40 down. */
export function NPN(p: ThreePinProps) {
  const c = stroke(p.highlight);
  return (
    <g>
      <Mirror x={p.x} y={p.y} mirror={p.mirror}>
        <g stroke={c} strokeWidth={SW} fill="none" strokeLinecap="round" strokeLinejoin="round">
          {p.circle !== false && <circle cx={30} cy={0} r={21} fill={BODY} />}
          <line x1={0} y1={0} x2={22} y2={0} />
          <line x1={22} y1={-13} x2={22} y2={13} strokeWidth={3} />
          <path d="M22 -6L40 -18V-40" />
          <path d="M22 6L40 18V40" />
          <path d="M37 16L27 14.7L32 7.3Z" fill={c} />
        </g>
      </Mirror>
      <SideLabel x={p.x} y={p.y} mirror={p.mirror} label={p.label} value={p.value} />
    </g>
  );
}

/** Enhancement-mode MOSFET (discrete style, body tied to source). NMOS: drain up, source down. */
export function NMOS(p: ThreePinProps) {
  return <Mosfet {...p} type="n" />;
}

/** PMOS: source up, drain down; arrow points out of the channel. `bubble` adds the digital-style gate circle. */
export function PMOS(p: ThreePinProps & { bubble?: boolean }) {
  return <Mosfet {...p} type="p" />;
}

function Mosfet(p: ThreePinProps & { type: "n" | "p"; bubble?: boolean }) {
  const c = stroke(p.highlight);
  const n = p.type === "n";
  // the source sits at the bottom for NMOS and at the top for PMOS; the body joins it
  const sy = n ? 12 : -12;
  return (
    <g>
      <Mirror x={p.x} y={p.y} mirror={p.mirror}>
        <g stroke={c} strokeWidth={SW} fill="none" strokeLinecap="round" strokeLinejoin="round">
          {p.circle !== false && <circle cx={30} cy={0} r={22} fill={BODY} />}
          {p.bubble && !n ? (
            <>
              <line x1={0} y1={0} x2={10} y2={0} />
              <circle cx={14} cy={0} r={4} fill={BODY} />
            </>
          ) : (
            <line x1={0} y1={0} x2={18} y2={0} />
          )}
          <line x1={18} y1={-12} x2={18} y2={12} />
          <line x1={24} y1={-16} x2={24} y2={-8} strokeWidth={3} />
          <line x1={24} y1={-4} x2={24} y2={4} strokeWidth={3} />
          <line x1={24} y1={8} x2={24} y2={16} strokeWidth={3} />
          <path d="M24 -12H40V-40" />
          <path d="M24 12H40V40" />
          <path d={`M24 0H40V${sy}`} />
          {n ? <path d="M25 0L33 -4.5V4.5Z" fill={c} /> : <path d="M36 0L28 -4.5V4.5Z" fill={c} />}
        </g>
      </Mirror>
      <SideLabel x={p.x} y={p.y} mirror={p.mirror} label={p.label} value={p.value} />
    </g>
  );
}

/** Op-amp: inverting input at (x, y − 20), non-inverting at (x, y + 20), output at (x + 80, y). `flip` swaps + and −. */
export function OpAmp({ x, y, label, value, highlight, flip }: Omit<PartProps, "rot"> & { flip?: boolean }) {
  const c = stroke(highlight);
  const [top, bottom] = flip ? ["+", "−"] : ["−", "+"];
  const sign = (s: string, yy: number) => (s === "+" ? <Plus x={30} y={yy} s={4} /> : <Minus x={30} y={yy} s={4} />);
  return (
    <g>
      <g transform={`translate(${x} ${y})`} stroke={c} strokeWidth={SW} fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 -34L20 34L74 0Z" fill={BODY} />
        <line x1={0} y1={-20} x2={20} y2={-20} />
        <line x1={0} y1={20} x2={20} y2={20} />
        <line x1={74} y1={0} x2={80} y2={0} />
        {sign(top, -20)}
        {sign(bottom, 20)}
      </g>
      {(label || value) && (
        <g fontSize={LABEL_SIZE}>
          {label && (
            <text x={x + 50} y={y - 26} fill={INK} fontWeight={600}>
              {label}
            </text>
          )}
          {value && (
            <text x={x + 50} y={y + 39} fill="var(--ink-2)">
              {value}
            </text>
          )}
        </g>
      )}
    </g>
  );
}

/* ───────────────────────── registry ───────────────────────── */

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
