"use client";

import React, { useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { useReducedMotion } from "@/learn/widgets/explain/useReducedMotion";
import { BOARD, G_DRIVER, G_RECEIVER, SIGNAL, SLOT, STITCH_Y, loopArea, pathLength, type FreqKind, type PlaneKind, type Pt } from "./si";
import { Caption, Meter, Note, ORANGE, Readout, Seg, ToyNote } from "./ui";

// ───────────────────────────── pcb-returnpath: where the return current goes ─────────────────────────────

export interface ReturnPathProps {
  /** Starting plane: solid | split | stitch | none. */
  plane?: PlaneKind;
  /** Starting frequency: dc | hf. */
  freq?: FreqKind;
}

export interface ReturnPathState {
  plane: PlaneKind;
  freq: FreqKind;
  /** Loop area between the signal route and the return route, mm². */
  loopArea: number;
  /** Loop area relative to the best case (solid plane, high frequency). */
  rel: number;
}

const K = 4; // px per mm
const W = BOARD.w * K;
const H = BOARD.h * K;
const px = (p: Pt) => `${+(p[0] * K).toFixed(1)} ${+(p[1] * K).toFixed(1)}`;
const poly = (pts: readonly Pt[]) => pts.map((p) => px(p)).join(" L");
const pathD = (pts: readonly Pt[]) => `M${poly(pts)}`;

/** A point a fraction along a polyline, and the direction there in degrees. */
function along(pts: readonly Pt[], frac: number): { x: number; y: number; deg: number } {
  const total = pathLength(pts);
  let want = total * frac;
  for (let i = 1; i < pts.length; i++) {
    const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    if (want <= l || i === pts.length - 1) {
      const t = l ? Math.min(1, want / l) : 0;
      const dx = pts[i][0] - pts[i - 1][0];
      const dy = pts[i][1] - pts[i - 1][1];
      return { x: (pts[i - 1][0] + dx * t) * K, y: (pts[i - 1][1] + dy * t) * K, deg: (Math.atan2(dy, dx) * 180) / Math.PI };
    }
    want -= l;
  }
  return { x: 0, y: 0, deg: 0 };
}

const PLANES: { value: PlaneKind; label: string }[] = [
  { value: "solid", label: "Solid plane" },
  { value: "split", label: "Split (slot)" },
  { value: "stitch", label: "Split + stitching cap" },
  { value: "none", label: "No plane (wire)" },
];
const FREQS: { value: FreqKind; label: string }[] = [
  { value: "dc", label: "DC" },
  { value: "hf", label: "High frequency (1 MHz+)" },
];

function explain(plane: PlaneKind, freq: FreqKind): string {
  if (plane === "none") return "There is no plane, so the return current has only the ground wire along the board edge, at any frequency. The loop is huge. This is why boards use planes.";
  if (plane === "solid" && freq === "dc") return "At DC the return current spreads out over the whole plane and takes the shortest, lowest-resistance route between the two ground pins. The loop is big, but a steady current does not radiate.";
  if (plane === "solid") return "At high frequency the return current squeezes into the plane right under the trace, the path of least inductance. The loop shrinks to a thin sliver: low inductance, little radiation.";
  if (plane === "split" && freq === "dc") return "A slot is a gap in the copper, and DC cannot cross a gap either. The current takes the shortest route around the end of the slot.";
  if (plane === "split") return "The return current wants to sit under the trace, but the slot is in the way. It runs along the slot to its end, round it, and back: a big loop, so more inductance and more radiation.";
  if (freq === "dc") return "At DC a capacitor is an open circuit, so it does not help: the current still goes round the end of the slot.";
  return "At high frequency the capacitor passes the return current across the slot right next to the trace. The loop is nearly as small as with a solid plane (a real capacitor adds a little inductance of its own).";
}

export function ReturnPath({ props, onChange }: WidgetProps<ReturnPathProps>) {
  const reduced = useReducedMotion();
  const [plane, setPlane] = useState<PlaneKind>(props.plane ?? "solid");
  const [freq, setFreq] = useState<FreqKind>(props.freq ?? "dc");
  const L = loopArea(plane, freq);
  const area = Math.round(L.areaMm2 * 10) / 10;

  const report = (p: PlaneKind, f: FreqKind) => {
    const r = loopArea(p, f);
    onChange?.({ plane: p, freq: f, loopArea: Math.round(r.areaMm2 * 10) / 10, rel: r.rel } satisfies ReturnPathState);
  };
  const pickPlane = (p: PlaneKind) => {
    setPlane(p);
    report(p, freq);
  };
  const pickFreq = (f: FreqKind) => {
    setFreq(f);
    report(plane, f);
  };

  const ret = L.ret;
  const retD = pathD(ret);
  const retLen = pathLength(ret) * K;
  const dur = Math.max(2.5, retLen / 55);
  const hasPlane = plane !== "none";
  const hasSlot = plane === "split" || plane === "stitch";
  const fan = plane === "solid" && freq === "dc";
  const frac = Math.log10(Math.max(1, L.rel)) / Math.log10(120);
  const tone = freq === "dc" ? "muted" : L.rel < 3 ? "brand" : L.rel < 15 ? "warn" : "bad";
  const arrows = [0.25, 0.55, 0.85].map((f) => along(ret, f));

  const label = `Top view of a board. ${PLANES.find((p) => p.value === plane)!.label}, ${freq === "dc" ? "DC" : "high frequency"}. Loop area ${area.toLocaleString("en-US")} square millimetres.`;
  const stitchY = STITCH_Y * K;

  return (
    <div className="w-full">
      <div className="flex flex-col items-center gap-2">
        <Seg label="Plane" value={plane} onChange={pickPlane} options={PLANES} />
        <Seg label="Frequency" value={freq} onChange={pickFreq} options={FREQS} />
      </div>

      <svg viewBox={`0 0 ${W} ${H + 4}`} className="mt-3 w-full rounded-xl border border-line bg-surface" role="img" aria-label={label}>
        {/* the board and its ground plane */}
        <rect x={1} y={1} width={W - 2} height={H - 2} rx={4} fill={hasPlane ? "color-mix(in srgb, var(--ink-3) 22%, transparent)" : "none"} stroke="var(--line-strong)" strokeWidth={1.5} />
        {hasSlot && <rect x={SLOT.x0 * K} y={1} width={(SLOT.x1 - SLOT.x0) * K} height={SLOT.end * K - 1} fill="var(--surface)" stroke="var(--ink-3)" strokeWidth={1} strokeDasharray="3 2" />}

        {/* the loop the current makes */}
        <path d={`${pathD([...SIGNAL, ...ret])}Z`} fill={ORANGE} opacity={0.2} />

        {/* the return current */}
        {fan &&
          [5, 10].map((o) => {
            const m: Pt = [(G_DRIVER[0] + G_RECEIVER[0]) / 2, (G_DRIVER[1] + G_RECEIVER[1]) / 2];
            return <path key={o} d={`M${px(G_RECEIVER)} Q${px([m[0] + o * 0.37 * 2, m[1] + o * 0.93 * 2])} ${px(G_DRIVER)}`} fill="none" stroke={ORANGE} strokeWidth={2} opacity={0.45} strokeDasharray="2 3" />;
          })}
        <path d={retD} fill="none" stroke={ORANGE} strokeWidth={freq === "hf" && hasPlane ? 7 : 3} opacity={freq === "hf" && hasPlane ? 0.4 : 0.9} strokeLinejoin="round" strokeLinecap="round" />
        {freq === "hf" && hasPlane && <path d={retD} fill="none" stroke={ORANGE} strokeWidth={2} strokeLinejoin="round" />}

        {/* the signal trace */}
        <path d={pathD(SIGNAL)} fill="none" stroke="var(--ink)" strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />

        {/* chips */}
        <rect x={3 * K} y={32 * K} width={9 * K} height={18 * K} rx={3} fill="var(--surface-2)" stroke="var(--ink-2)" strokeWidth={1.5} />
        <text x={7.5 * K} y={42.5 * K} textAnchor="middle" fontSize={14} fontWeight={600} fill="var(--ink)">
          TX
        </text>
        <rect x={78 * K} y={11 * K} width={10 * K} height={14 * K} rx={3} fill="var(--surface-2)" stroke="var(--ink-2)" strokeWidth={1.5} />
        <text x={83 * K} y={19.5 * K} textAnchor="middle" fontSize={14} fontWeight={600} fill="var(--ink)">
          RX
        </text>
        {[SIGNAL[0], SIGNAL[SIGNAL.length - 1], G_DRIVER, G_RECEIVER].map((p, i) => (
          <circle key={i} cx={p[0] * K} cy={p[1] * K} r={3.5} fill={i < 2 ? "var(--ink)" : ORANGE} stroke="var(--surface)" strokeWidth={1} />
        ))}

        {/* the stitching capacitor across the slot */}
        {plane === "stitch" && (
          <g stroke="var(--ink)" strokeWidth={2.5} fill="none">
            <line x1={(SLOT.x0 - 1) * K} x2={(SLOT.x0 + 2) * K} y1={stitchY} y2={stitchY} />
            <line x1={(SLOT.x1 - 2) * K} x2={(SLOT.x1 + 1) * K} y1={stitchY} y2={stitchY} />
            <line x1={(SLOT.x0 + 2) * K} x2={(SLOT.x0 + 2) * K} y1={stitchY - 7} y2={stitchY + 7} />
            <line x1={(SLOT.x1 - 2) * K} x2={(SLOT.x1 - 2) * K} y1={stitchY - 7} y2={stitchY + 7} />
          </g>
        )}
        {plane === "stitch" && (
          <text x={((SLOT.x0 + SLOT.x1) / 2) * K} y={stitchY + 26} textAnchor="middle" fontSize={14} fill="var(--ink)">
            C
          </text>
        )}

        {/* direction: moving dots, or static arrows under reduced motion */}
        {!reduced &&
          [0, 1, 2, 3, 4, 5].map((i) => (
            <circle key={i} r={3.6} fill="var(--surface)" stroke={ORANGE} strokeWidth={2}>
              <animateMotion dur={`${dur}s`} begin={`-${((i * dur) / 6).toFixed(2)}s`} repeatCount="indefinite" path={retD} />
            </circle>
          ))}
        {reduced &&
          arrows.map((a, i) => (
            <path key={i} d="M-6 -5 L5 0 L-6 5 Z" transform={`translate(${a.x.toFixed(1)} ${a.y.toFixed(1)}) rotate(${a.deg.toFixed(0)})`} fill="var(--surface)" stroke={ORANGE} strokeWidth={2} strokeLinejoin="round" />
          ))}
      </svg>

      <ul className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1 text-[0.8rem] text-ink-2">
        <li className="flex items-center gap-1.5">
          <span aria-hidden className="inline-block h-1 w-5 rounded bg-[var(--ink)]" />
          Signal trace
        </li>
        <li className="flex items-center gap-1.5">
          <span aria-hidden className="inline-block h-1 w-5 rounded" style={{ background: ORANGE }} />
          Return current{reduced ? " (arrows)" : " (dots)"}
        </li>
        {hasPlane && (
          <li className="flex items-center gap-1.5">
            <span aria-hidden className="inline-block h-3 w-5 rounded-sm" style={{ background: "color-mix(in srgb, var(--ink-3) 30%, transparent)" }} />
            Ground plane
          </li>
        )}
      </ul>

      <div className="mt-3 rounded-xl border border-line bg-surface p-3">
        <Caption className="mb-1.5">{freq === "dc" ? "Loop size (matters little at DC)" : "Loop inductance and radiation (toy: grows with loop area)"}</Caption>
        <Meter frac={frac} tone={tone} label={`Relative loop size ${L.rel.toFixed(1)} times the best case`} />
        <div className="mt-1.5 flex justify-between gap-2 text-[0.8rem] text-ink-2">
          <span>best case</span>
          <span>{freq === "dc" ? "no radiation from a steady current" : `${L.rel < 1.5 ? "about 1" : L.rel.toFixed(0)}× the best case`}</span>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        <Readout label="Loop area" value={`${area.toLocaleString("en-US", { maximumFractionDigits: 1 })} mm²`} accent />
        <Readout label="vs best case" value={`${L.rel < 1.5 ? "1" : L.rel.toFixed(0)}×`} />
      </div>
      <div className="mt-3">
        <Note>{explain(plane, freq)}</Note>
      </div>
      <ToyNote>Toy model: board 90 × 55 mm, trace 0.2 mm above the plane. The move from &quot;spread out&quot; to &quot;under the trace&quot; is gradual: roughly tens of kHz up to about 1 MHz on a typical board.</ToyNote>
    </div>
  );
}

/** goal: { plane, freq, maxLoop (mm²) } */
export function checkReturnPath(state: unknown, goal: Record<string, unknown>) {
  const s = state as ReturnPathState | undefined;
  if (!s) return false;
  if (typeof goal.plane === "string" && s.plane !== goal.plane) return false;
  if (typeof goal.freq === "string" && s.freq !== goal.freq) return false;
  if (typeof goal.maxLoop === "number" && s.loopArea > goal.maxLoop) return false;
  return true;
}
