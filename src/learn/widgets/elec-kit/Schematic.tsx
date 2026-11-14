"use client";

/**
 * Lay out a schematic from a plain description: parts on a grid, wires as point lists, optional current-flow
 * animation. Coordinates in the description are GRID CELLS (1 = 20 SVG units), so a 360-unit-wide drawing is
 * `cols={18}`.
 *
 *   <Schematic
 *     cols={14} rows={8} ariaLabel="A 9 V battery driving a lamp through a switch"
 *     parts={[
 *       { kind: "battery", id: "B1", at: [2, 3], rot: 90, label: "B1", value: "9 V" },
 *       { kind: "switch", id: "S1", at: [4, 2], label: "S1", closed },
 *       { kind: "lamp", id: "L1", at: [10, 3], rot: 90, label: "L1", brightness: closed ? 1 : 0 },
 *     ]}
 *     wires={[
 *       { id: "top", points: ["B1.a", [2, 2], "S1.a"], flow: closed ? 1 : 0 },
 *       { points: ["S1.b", [10, 2], "L1.a"], flow: closed ? 1 : 0 },
 *       { points: ["L1.b", [10, 7], [2, 7], "B1.b"], flow: closed ? 1 : 0 },
 *     ]}
 *   />
 *
 * A wire point is [col, row] or "partId.pin" (pins: a/b for two-pin parts, b/c/e for npn, g/d/s for MOSFETs,
 * minus/plus/out for the op-amp, a for ground). `flow` on a wire is a signed current in any unit: + means along
 * the point order. Dots move at a speed proportional to |flow| / the largest |flow| on the drawing; with
 * prefers-reduced-motion they stand still and an arrow shows the direction instead. Junction dots are added
 * where a wire ends on another wire's middle or three or more wire ends meet (turn off with autoDots={false}).
 */
import { useId } from "react";
import { useReducedMotion } from "../explain/useReducedMotion";
import {
  ACSource,
  Battery,
  Capacitor,
  CurrentSource,
  DCSource,
  Diode,
  GRID,
  Ground,
  Inductor,
  Junction,
  Lamp,
  LED,
  NetLabel,
  NMOS,
  NPN,
  OpAmp,
  PMOS,
  PolarCapacitor,
  Resistor,
  Switch,
  Wire,
  pinsOf,
  type Pt,
  type Rot,
  type SymbolKind,
} from "./symbols";

export interface PartSpec {
  kind: SymbolKind;
  id: string;
  /** grid cell of the part's reference pin (pin a, base, gate, or the op-amp's input midpoint) */
  at: Pt;
  rot?: Rot;
  label?: string;
  value?: string;
  highlight?: boolean;
  labelFlip?: boolean;
  /** switch */
  closed?: boolean;
  /** led */
  on?: boolean;
  /** lamp, 0–1 */
  brightness?: number;
  /** battery */
  cells?: 1 | 2;
  /** resistor */
  variant?: "zigzag" | "box";
  /** transistors: input on the right */
  mirror?: boolean;
  /** op-amp: + on top */
  flip?: boolean;
  /** pmos: gate bubble */
  bubble?: boolean;
}

export type WirePoint = Pt | `${string}.${string}`;

export interface WireSpec {
  id?: string;
  points: WirePoint[];
  /** signed current along the point order (any unit); 0 or absent = no dots */
  flow?: number;
  highlight?: boolean;
  dashed?: boolean;
}

export interface TextSpec {
  at: Pt;
  text: string;
  anchor?: "start" | "middle" | "end";
  muted?: boolean;
}

export interface SchematicProps {
  parts: PartSpec[];
  wires?: WireSpec[];
  texts?: TextSpec[];
  /** drawing size in grid cells */
  cols: number;
  rows: number;
  /** what the circuit is, for screen readers */
  ariaLabel: string;
  /** faint grid dots (handy while laying out) */
  showGrid?: boolean;
  autoDots?: boolean;
  /** set false to never animate (dots still show where current flows) */
  animate?: boolean;
  className?: string;
}

/** Absolute pin positions (SVG units) of every part, keyed "id.pin". */
export function partPins(parts: PartSpec[]): Record<string, Pt> {
  const out: Record<string, Pt> = {};
  for (const p of parts) {
    const pins = pinsOf(p.kind, p.at[0] * GRID, p.at[1] * GRID, p.rot ?? 0, { mirror: p.mirror, flip: p.flip });
    for (const [name, xy] of Object.entries(pins)) out[`${p.id}.${name}`] = xy;
  }
  return out;
}

/** Resolve a wire's points to SVG units. Throws on an unknown pin reference (a layout bug worth seeing early). */
export function resolveWire(w: WireSpec, pins: Record<string, Pt>): Pt[] {
  return w.points.map((pt) => {
    if (typeof pt === "string") {
      const hit = pins[pt];
      if (!hit) throw new Error(`Schematic: unknown pin "${pt}" (known: ${Object.keys(pins).join(", ")})`);
      return hit;
    }
    return [pt[0] * GRID, pt[1] * GRID];
  });
}

const key = ([x, y]: Pt) => `${Math.round(x * 100)},${Math.round(y * 100)}`;

function onSegmentInterior([px, py]: Pt, [ax, ay]: Pt, [bx, by]: Pt): boolean {
  const cross = (bx - ax) * (py - ay) - (by - ay) * (px - ax);
  if (Math.abs(cross) > 1e-6) return false;
  const dot = (px - ax) * (bx - ax) + (py - ay) * (by - ay);
  const len2 = (bx - ax) ** 2 + (by - ay) ** 2;
  return dot > 1e-6 && dot < len2 - 1e-6;
}

/** Junction positions: a wire end on another wire's interior or bend, or ≥ 3 connections (wire ends, plus a part pin) at one point. */
export function junctions(paths: Pt[][], pinPoints: Pt[] = []): Pt[] {
  const pinKeys = new Set(pinPoints.map(key));
  const ends = new Map<string, { pt: Pt; n: number }>();
  const dots = new Map<string, Pt>();
  paths.forEach((path, i) => {
    for (const end of [path[0], path[path.length - 1]]) {
      const k = key(end);
      const e = ends.get(k) ?? { pt: end, n: 0 };
      e.n++;
      ends.set(k, e);
      paths.forEach((other, j) => {
        if (j === i) return;
        for (let s = 0; s + 1 < other.length; s++) if (onSegmentInterior(end, other[s], other[s + 1])) dots.set(k, end);
      });
    }
    // interior bends of this wire that another wire ends on
    for (let s = 1; s + 1 < path.length; s++) {
      const k = key(path[s]);
      if (paths.some((o, j) => j !== i && (key(o[0]) === k || key(o[o.length - 1]) === k))) dots.set(k, path[s]);
    }
  });
  for (const [k, e] of ends) if (e.n + (pinKeys.has(k) ? 1 : 0) >= 3) dots.set(k, e.pt);
  return [...dots.values()];
}

function PartView({ p }: { p: PartSpec }) {
  const x = p.at[0] * GRID;
  const y = p.at[1] * GRID;
  const base = { x, y, rot: p.rot, label: p.label, value: p.value, highlight: p.highlight, labelFlip: p.labelFlip };
  const three = { x, y, label: p.label, value: p.value, highlight: p.highlight, mirror: p.mirror };
  switch (p.kind) {
    case "resistor":
      return <Resistor {...base} variant={p.variant} />;
    case "capacitor":
      return <Capacitor {...base} />;
    case "polar-capacitor":
      return <PolarCapacitor {...base} />;
    case "inductor":
      return <Inductor {...base} />;
    case "battery":
      return <Battery {...base} cells={p.cells} />;
    case "dc-source":
      return <DCSource {...base} />;
    case "ac-source":
      return <ACSource {...base} />;
    case "current-source":
      return <CurrentSource {...base} />;
    case "diode":
      return <Diode {...base} />;
    case "led":
      return <LED {...base} on={p.on} />;
    case "switch":
      return <Switch {...base} closed={p.closed} />;
    case "lamp":
      return <Lamp {...base} brightness={p.brightness} />;
    case "ground":
      return <Ground x={x} y={y} rot={p.rot} highlight={p.highlight} label={p.label} />;
    case "junction":
      return <Junction x={x} y={y} highlight={p.highlight} />;
    case "npn":
      return <NPN {...three} />;
    case "nmos":
      return <NMOS {...three} />;
    case "pmos":
      return <PMOS {...three} bubble={p.bubble} />;
    case "opamp":
      return <OpAmp x={x} y={y} label={p.label} value={p.value} highlight={p.highlight} flip={p.flip} />;
  }
}

/** The point halfway along a polyline and the direction there (for the reduced-motion arrow). */
function midpoint(path: Pt[]): { pt: Pt; rot: number } {
  const lens = path.slice(1).map((b, i) => Math.hypot(b[0] - path[i][0], b[1] - path[i][1]));
  let half = lens.reduce((s, l) => s + l, 0) / 2;
  for (let i = 0; i < lens.length; i++) {
    if (half <= lens[i] || i === lens.length - 1) {
      const [a, b] = [path[i], path[i + 1]];
      const f = lens[i] ? Math.min(1, half / lens[i]) : 0;
      return { pt: [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f], rot: (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI };
    }
    half -= lens[i];
  }
  return { pt: path[0], rot: 0 };
}

export function Schematic({ parts, wires = [], texts = [], cols, rows, ariaLabel, showGrid, autoDots = true, animate = true, className }: SchematicProps) {
  const reduced = useReducedMotion();
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const pins = partPins(parts);
  const paths = wires.map((w) => resolveWire(w, pins));
  const dots = autoDots ? junctions(paths, Object.values(pins)) : [];
  const maxFlow = Math.max(0, ...wires.map((w) => Math.abs(w.flow ?? 0)));
  const moving = animate && !reduced;
  const W = cols * GRID;
  const H = rows * GRID;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={className ?? "w-full"} role="img" aria-label={ariaLabel} style={{ overflow: "visible" }}>
      <style>{`@keyframes elecflow${uid}{to{stroke-dashoffset:-20}}`}</style>
      {showGrid && (
        <g fill="var(--line-strong)">
          {Array.from({ length: (cols + 1) * (rows + 1) }, (_, i) => (
            <circle key={i} cx={(i % (cols + 1)) * GRID} cy={Math.floor(i / (cols + 1)) * GRID} r={1} />
          ))}
        </g>
      )}
      {paths.map((pts, i) => (
        <Wire key={`w${i}`} points={pts} highlight={wires[i].highlight || (wires[i].flow ?? 0) !== 0} dashed={wires[i].dashed} />
      ))}
      {parts.map((p) => (
        <PartView key={p.id} p={p} />
      ))}
      {dots.map((d, i) => (
        <Junction key={`j${i}`} x={d[0]} y={d[1]} />
      ))}
      {paths.map((pts, i) => {
        const f = wires[i].flow ?? 0;
        if (!maxFlow || Math.abs(f) < maxFlow * 1e-6) return null;
        const rel = Math.abs(f) / maxFlow;
        // 20 units between dots; one dot spacing every 0.25 s (fastest) to 2 s (slowest)
        const dur = 2 - 1.75 * rel;
        const ordered = f > 0 ? pts : [...pts].reverse();
        const pointsAttr = ordered.map((p) => p.join(",")).join(" ");
        const mid = midpoint(ordered);
        return (
          <g key={`f${i}`} pointerEvents="none">
            <polyline
              points={pointsAttr}
              fill="none"
              stroke="var(--brand)"
              strokeWidth={6}
              strokeLinecap="round"
              strokeDasharray="0.001 19.999"
              style={moving ? { animation: `elecflow${uid} ${dur.toFixed(2)}s linear infinite` } : undefined}
            />
            {!moving && (
              <g transform={`translate(${mid.pt[0]} ${mid.pt[1]}) rotate(${mid.rot})`}>
                <path d="M-7 -7L5 0L-7 7Z" fill="var(--brand)" stroke="var(--surface)" strokeWidth={1.5} />
              </g>
            )}
          </g>
        );
      })}
      {texts.map((t, i) => (
        <NetLabel key={`t${i}`} x={t.at[0] * GRID} y={t.at[1] * GRID} text={t.text} anchor={t.anchor} muted={t.muted} />
      ))}
    </svg>
  );
}
