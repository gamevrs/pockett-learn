"use client";

import React, { useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import {
  DELAY_NS,
  ER_EFF,
  OZ_MM,
  RISE_STEPS_NS,
  STEP_V,
  Z0_LINE,
  bounce,
  critical,
  erEff,
  microstripZ0,
  z0Valid,
  type Layer,
  type ZL,
} from "./si";
import { Caption, Note, ORANGE, Readout, Seg, Slider, ToyNote } from "./ui";

const minus = (s: string) => s.replace("-", "−");
const signed = (v: number, d = 2) => (Math.abs(v) < 0.005 ? "0" : minus(`${v > 0 ? "+" : ""}${v.toFixed(d)}`));

// ───────────────────────────── pcb-critical: rise time vs trace length ─────────────────────────────

export interface CriticalProps {
  /** Starting rise time in ns (one of 0.1, 0.2, 0.5, 1, 2, 5, 10). */
  riseNs?: number;
  lengthCm?: number;
  layer?: Layer;
}

export interface CriticalState {
  riseNs: number;
  lengthCm: number;
  layer: Layer;
  /** Signal speed, cm/ns. */
  speed: number;
  criticalCm: number;
  isLine: boolean;
}

const LAYERS: { value: Layer; label: string }[] = [
  { value: "outer", label: "Outer layer (microstrip)" },
  { value: "inner", label: "Inner layer (stripline)" },
];
const fmtCm = (x: number) => (x >= 100 ? `${Math.round(x)} cm` : x >= 10 ? `${x.toFixed(1)} cm` : `${+x.toFixed(2)} cm`);
const fmtNs = (x: number) => (x >= 10 ? `${x.toFixed(1)} ns` : `${+x.toFixed(2)} ns`);

export function Critical({ props, onChange }: WidgetProps<CriticalProps>) {
  const startIdx = Math.max(0, (RISE_STEPS_NS as readonly number[]).indexOf(props.riseNs ?? 1));
  const [idx, setIdx] = useState(startIdx);
  const [len, setLen] = useState(props.lengthCm ?? 10);
  const [layer, setLayer] = useState<Layer>(props.layer ?? "outer");
  const riseNs = RISE_STEPS_NS[idx];
  const r = critical(riseNs, len, layer);

  const report = (i: number, l: number, ly: Layer) => {
    const x = critical(RISE_STEPS_NS[i], l, ly);
    onChange?.({ riseNs: RISE_STEPS_NS[i], lengthCm: l, layer: ly, speed: Math.round(x.speed * 100) / 100, criticalCm: Math.round(x.criticalCm * 1000) / 1000, isLine: x.isLine } satisfies CriticalState);
  };

  // drawing: three bars on one 0 to 50 cm axis
  const X0 = 16;
  const X1 = 344;
  const AX = 50;
  const xOf = (cm: number) => X0 + (Math.min(cm, AX) / AX) * (X1 - X0);
  const rows = [
    { y: 18, text: `Edge = rise time × speed = ${fmtCm(r.edgeCm)}`, cm: r.edgeCm, color: "var(--ink-3)" },
    { y: 66, text: `Critical length = edge ÷ 6 = ${fmtCm(r.criticalCm)}`, cm: r.criticalCm, color: ORANGE },
    { y: 114, text: `Your trace = ${fmtCm(len)}`, cm: len, color: r.isLine ? "var(--bad)" : "var(--brand)" },
  ];

  return (
    <div className="w-full">
      <div className="flex justify-center">
        <Seg label="Layer" value={layer} onChange={(l) => (setLayer(l), report(idx, len, l))} options={LAYERS} />
      </div>
      <div className="mt-2 grid gap-1 sm:grid-cols-2 sm:gap-4">
        <Slider
          label="Rise time (10 to 90 %)"
          value={idx}
          min={0}
          max={RISE_STEPS_NS.length - 1}
          step={1}
          onChange={(i) => (setIdx(i), report(i, len, layer))}
          format={(i) => fmtNs(RISE_STEPS_NS[i])}
        />
        <Slider label="Trace length" value={len} min={1} max={50} step={1} onChange={(l) => (setLen(l), report(idx, l, layer))} format={(v) => `${v} cm`} />
      </div>

      <svg viewBox="0 0 360 178" className="mt-3 w-full rounded-xl border border-line bg-surface" role="img" aria-label={`A ${fmtNs(riseNs)} edge is ${fmtCm(r.edgeCm)} long in space. Critical length ${fmtCm(r.criticalCm)}. Your trace is ${len} centimetres: ${r.isLine ? "long, a transmission line" : "short, a plain wire"}.`}>
        <line x1={xOf(r.criticalCm)} x2={xOf(r.criticalCm)} y1={8} y2={150} stroke={ORANGE} strokeWidth={1.5} strokeDasharray="4 3" />
        {rows.map((row) => (
          <g key={row.y}>
            <text x={X0} y={row.y + 12} fontSize={14} fill="var(--ink)">
              {row.text}
            </text>
            <rect x={X0} y={row.y + 20} width={Math.max(2, xOf(row.cm) - X0)} height={12} rx={3} fill={row.color} opacity={row.color === "var(--ink-3)" ? 0.55 : 0.95} />
            {row.cm > AX && (
              <text x={X1} y={row.y + 31} textAnchor="end" fontSize={14} fontWeight={700} fill="var(--surface)">
                ›››
              </text>
            )}
          </g>
        ))}
        <line x1={X0} x2={X1} y1={152} y2={152} stroke="var(--line-strong)" />
        {[0, 10, 20, 30, 40, 50].map((c) => (
          <text key={c} x={xOf(c)} y={172} textAnchor={c === 0 ? "start" : c === 50 ? "end" : "middle"} fontSize={14} fill="var(--ink-3)">
            {c}
          </text>
        ))}
        <text x={X1} y={146} textAnchor="end" fontSize={14} fill="var(--ink-3)">
          cm
        </text>
      </svg>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        <Readout label="Speed" value={`${r.speed.toFixed(1)} cm/ns`} />
        <Readout label="Time of flight" value={fmtNs(r.tofNs)} />
        <Readout label="Flight ÷ rise" value={r.ratio.toFixed(2)} />
        <Readout label="Edge bandwidth ≈" value={r.kneeMHz >= 1000 ? `${+(r.kneeMHz / 1000).toFixed(1)} GHz` : `${Math.round(r.kneeMHz)} MHz`} />
      </div>
      <div className="mt-3">
        <Note tone={r.isLine ? "accent" : "plain"}>
          {r.isLine ? (
            <>
              <b>Long: treat it as a transmission line.</b> The trace is longer than {fmtCm(r.criticalCm)}, so the far end hears about the edge too late to behave like the near end: reflections and a defined impedance matter.
            </>
          ) : (
            <>
              <b>Short: it behaves like a plain wire (lumped).</b> At {len} cm the edge crosses the trace in {fmtNs(r.tofNs)}, quick next to the {fmtNs(riseNs)} rise.
            </>
          )}{" "}
          Rise time, not clock frequency, decides: a 1 MHz clock with 1 ns edges still needs care.
        </Note>
      </div>
      <ToyNote>
        Rule of thumb, not a law: critical length = rise time × speed ÷ 6 (some engineers use ÷4 to ÷10). Speed = 30 cm/ns ÷ √εr_eff, with typical εr_eff of {ER_EFF.outer} outside and {ER_EFF.inner} inside. Edge bandwidth ≈ 0.35 ÷ rise time is a common estimate.
      </ToyNote>
    </div>
  );
}

/** goal: { isLine, riseNs, minLengthCm, maxLengthCm, layer } */
export function checkCritical(state: unknown, goal: Record<string, unknown>) {
  const s = state as CriticalState | undefined;
  if (!s) return false;
  if (typeof goal.isLine === "boolean" && s.isLine !== goal.isLine) return false;
  if (typeof goal.riseNs === "number" && s.riseNs !== goal.riseNs) return false;
  if (typeof goal.minLengthCm === "number" && s.lengthCm < goal.minLengthCm) return false;
  if (typeof goal.maxLengthCm === "number" && s.lengthCm > goal.maxLengthCm) return false;
  if (typeof goal.layer === "string" && s.layer !== goal.layer) return false;
  return true;
}

// ───────────────────────────── pcb-bounce: reflections and the lattice diagram ─────────────────────────────

export interface BounceProps {
  zs?: number;
  zl?: ZL;
}

export interface BounceState {
  zs: number;
  zl: ZL;
  gammaS: number;
  gammaL: number;
  overshootPct: number;
  settled: boolean;
}

const ZS_OPTS: { value: number; label: string }[] = [
  { value: 0, label: "0 Ω (ideal)" },
  { value: 10, label: "10 Ω (typical driver)" },
  { value: 50, label: "50 Ω (series termination)" },
];
const ZL_OPTS: { value: ZL; label: string }[] = [
  { value: "open", label: "Open (CMOS input)" },
  { value: 50, label: "50 Ω (matched)" },
  { value: 25, label: "25 Ω" },
  { value: 0, label: "Short" },
];

const LW = 360;
const LX0 = 74;
const LX1 = 286;
const LY0 = 38;
const LDY = 40;
const NSEG = 5;

export function Bounce({ props, onChange }: WidgetProps<BounceProps>) {
  const [zs, setZs] = useState(props.zs ?? 10);
  const [zl, setZl] = useState<ZL>(props.zl ?? "open");
  const b = bounce(zs, zl);

  const report = (s: number, l: ZL) => {
    const x = bounce(s, l);
    onChange?.({ zs: s, zl: l, gammaS: Math.round(x.lat.gammaS * 1000) / 1000, gammaL: Math.round(x.lat.gammaL * 1000) / 1000, overshootPct: Math.round(x.overshootPct * 10) / 10, settled: x.settled } satisfies BounceState);
  };

  // lattice: the first NSEG waves
  const waves: number[] = [];
  for (let k = 0; k < NSEG; k++) waves.push(k % 2 === 0 ? b.lat.forward[k / 2] : b.lat.back[(k - 1) / 2]);

  // waveform plot
  const PW = 360;
  const PH = 200;
  const PL = 40;
  const PR = 8;
  const PT = 10;
  const PB = 30;
  const allV = [...b.load.map((p) => p.v), ...b.source.map((p) => p.v), b.lat.finalV];
  const vmax = Math.max(...allV);
  const vmin = Math.min(0, ...allV);
  const step = vmax - vmin <= 4 ? 1 : vmax - vmin <= 8 ? 2 : 5;
  const top = Math.ceil((vmax * 1.05) / step) * step;
  const bot = Math.floor(vmin / step) * step;
  const xOf = (t: number) => PL + (t / b.tEndNs) * (PW - PL - PR);
  const yOf = (v: number) => PT + (1 - (v - bot) / (top - bot)) * (PH - PT - PB);
  const stair = (pts: { t: number; v: number }[]) => {
    let d = `M${xOf(0).toFixed(1)} ${yOf(pts[0].v).toFixed(1)}`;
    for (let i = 1; i < pts.length; i++) d += ` L${xOf(pts[i].t).toFixed(1)} ${yOf(pts[i - 1].v).toFixed(1)} L${xOf(pts[i].t).toFixed(1)} ${yOf(pts[i].v).toFixed(1)}`;
    return d + ` L${xOf(b.tEndNs).toFixed(1)} ${yOf(pts[pts.length - 1].v).toFixed(1)}`;
  };
  const fin = b.lat.finalV;
  const ticks: number[] = [];
  for (let v = bot; v <= top + 1e-9; v += step) ticks.push(v);

  const seriesTerm = zs === 50 && zl === "open";
  const gl = b.lat.gammaL;
  const gs = b.lat.gammaS;

  return (
    <div className="w-full">
      <div className="flex flex-col items-center gap-2">
        <Seg label="Source impedance" value={zs} onChange={(s) => (setZs(s), report(s, zl))} options={ZS_OPTS} />
        <Seg label="Load" value={zl} onChange={(l) => (setZl(l), report(zs, l))} options={ZL_OPTS} />
      </div>

      <svg viewBox={`0 0 ${LW} ${LY0 + NSEG * LDY + 26}`} className="mt-3 w-full rounded-xl border border-line bg-surface" role="img" aria-label={`Bounce diagram, first ${NSEG} waves: ${waves.map((w) => `${w.toFixed(2)} volts`).join(", ")}.`}>
        <text x={LX0} y={16} textAnchor="middle" fontSize={14} fontWeight={600} fill="var(--ink)">
          Source
        </text>
        <text x={LX1} y={16} textAnchor="middle" fontSize={14} fontWeight={600} fill="var(--ink)">
          Load
        </text>
        <line x1={LX0} x2={LX0} y1={LY0 - 8} y2={LY0 + NSEG * LDY} stroke="var(--ink-3)" strokeWidth={2} />
        <line x1={LX1} x2={LX1} y1={LY0 - 8} y2={LY0 + NSEG * LDY} stroke="var(--ink-3)" strokeWidth={2} />
        {Array.from({ length: NSEG + 1 }, (_, k) => (
          <text key={k} x={4} y={LY0 + k * LDY + 5} fontSize={14} fill="var(--ink-3)">
            {k === 0 ? "0" : `${k}T`}
          </text>
        ))}
        {waves.map((w, k) => {
          const fromLeft = k % 2 === 0;
          const x1 = fromLeft ? LX0 : LX1;
          const x2 = fromLeft ? LX1 : LX0;
          const y1 = LY0 + k * LDY;
          const y2 = y1 + LDY;
          const zero = Math.abs(w) < 0.005;
          const colour = zero ? "var(--ink-3)" : w > 0 ? "var(--brand)" : ORANGE;
          const txt = `${signed(w)} V`;
          const tw = txt.length * 8 + 8;
          return (
            <g key={k}>
              <line x1={x1} x2={x2} y1={y1} y2={y2} stroke={colour} strokeWidth={zero ? 1.5 : 2.5} strokeDasharray={zero ? "3 3" : undefined} />
              <rect x={(LX0 + LX1) / 2 - tw / 2} y={(y1 + y2) / 2 - 11} width={tw} height={22} rx={4} fill="var(--surface)" />
              <text x={(LX0 + LX1) / 2} y={(y1 + y2) / 2 + 5} textAnchor="middle" fontSize={14} fontWeight={600} fill="var(--ink)">
                {txt}
              </text>
            </g>
          );
        })}
        <text x={LX0} y={LY0 + NSEG * LDY + 20} textAnchor="middle" fontSize={14} fill="var(--ink-2)">
          Γs = {signed(gs)}
        </text>
        <text x={LX1} y={LY0 + NSEG * LDY + 20} textAnchor="middle" fontSize={14} fill="var(--ink-2)">
          ΓL = {signed(gl)}
        </text>
      </svg>
      <p className="mt-1 text-center text-[0.8rem] text-ink-3">Each line is a wave crossing the {Z0_LINE} Ω line in T = {DELAY_NS} ns; the number is that wave&apos;s voltage.</p>

      <svg viewBox={`0 0 ${PW} ${PH}`} className="mt-3 w-full rounded-xl border border-line bg-surface" role="img" aria-label={`Voltage over 8 nanoseconds. At the load the step settles to ${fin.toFixed(2)} volts with ${b.overshootPct.toFixed(0)} percent overshoot.`}>
        {fin > 0 && <rect x={PL} y={yOf(fin * 1.05)} width={PW - PL - PR} height={yOf(fin * 0.95) - yOf(fin * 1.05)} fill="var(--brand)" opacity={0.14} />}
        {ticks.map((v) => (
          <g key={v}>
            <line x1={PL} x2={PW - PR} y1={yOf(v)} y2={yOf(v)} stroke="var(--line-strong)" strokeWidth={0.8} />
            <text x={PL - 4} y={yOf(v) + 5} textAnchor="end" fontSize={14} fill="var(--ink-3)">
              {v}
            </text>
          </g>
        ))}
        <line x1={PL} x2={PW - PR} y1={yOf(fin)} y2={yOf(fin)} stroke="var(--ink-3)" strokeWidth={1.2} strokeDasharray="5 4" />
        <path d={stair(b.source)} fill="none" stroke={ORANGE} strokeWidth={2} strokeLinejoin="round" />
        <path d={stair(b.load)} fill="none" stroke="var(--brand)" strokeWidth={2.8} strokeLinejoin="round" />
        {[0, 2, 4, 6, 8].map((n) => (
          <text key={n} x={xOf(n)} y={PH - 10} textAnchor={n === 0 ? "start" : n === 8 ? "end" : "middle"} fontSize={14} fill="var(--ink-3)">
            {n}
          </text>
        ))}
        <text x={PW - PR} y={PH - 30} textAnchor="end" fontSize={14} fill="var(--ink-3)">
          ns
        </text>
      </svg>
      <p className="mt-1 text-center text-[0.8rem] text-ink-3">Volts against time in nanoseconds (T = 1 ns).</p>
      <ul className="mt-1 flex flex-wrap justify-center gap-x-4 gap-y-1 text-[0.8rem] text-ink-2">
        <li className="flex items-center gap-1.5">
          <span aria-hidden className="inline-block h-1 w-5 rounded bg-[var(--brand)]" />
          Voltage at the load
        </li>
        <li className="flex items-center gap-1.5">
          <span aria-hidden className="inline-block h-1 w-5 rounded" style={{ background: ORANGE }} />
          Voltage at the source end
        </li>
        <li className="flex items-center gap-1.5">
          <span aria-hidden className="inline-block h-3 w-5 rounded-sm bg-[var(--brand)] opacity-25" />
          Final value ± 5 %
        </li>
      </ul>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        <Readout label="Γs" value={signed(gs)} />
        <Readout label="ΓL" value={signed(gl)} />
        <Readout label="Overshoot" value={`${b.overshootPct.toFixed(0)}%`} accent />
        <Readout label="Settled by 4T" value={b.settled ? "yes" : "no"} />
      </div>
      <div className="mt-3">
        <Note tone={seriesTerm ? "accent" : "plain"}>
          {seriesTerm ? (
            <>
              <b>Series termination.</b> The 50 Ω in the driver and the 50 Ω line split the step, so only {b.lat.launched.toFixed(2)} V is launched. The open end doubles it to {STEP_V} V, and the reflection coming back is absorbed at the source (Γs = 0). One clean step at the load after one delay.
            </>
          ) : gl === 0 ? (
            <>The load matches the line (ΓL = 0): nothing is reflected, and the load sees one step of {fin.toFixed(2)} V.</>
          ) : b.overshootPct > 5 ? (
            <>
              The load reflects (ΓL = {signed(gl)}) and the source reflects it again (Γs = {signed(gs)}), so the load voltage overshoots by <b>{b.overshootPct.toFixed(0)}%</b> and rings before it settles to {fin.toFixed(2)} V.
            </>
          ) : (
            <>
              The load voltage rises to {fin.toFixed(2)} V with {b.overshootPct.toFixed(0)}% overshoot. Each reflection is smaller than the last, so it settles{b.settled ? " quickly" : " slowly"}.
            </>
          )}
        </Note>
      </div>
      <ToyNote>
        Toy model: a lossless {Z0_LINE} Ω line, a {STEP_V} V step, one-way delay T = {DELAY_NS} ns, resistive ends. Real lines lose a little, and real inputs have capacitance, so the corners are rounder.
      </ToyNote>
    </div>
  );
}

/** goal: { zs, zl, maxOvershootPct, minOvershootPct, settled } */
export function checkBounce(state: unknown, goal: Record<string, unknown>) {
  const s = state as BounceState | undefined;
  if (!s) return false;
  if (typeof goal.zs === "number" && s.zs !== goal.zs) return false;
  if ((typeof goal.zl === "number" || goal.zl === "open") && s.zl !== goal.zl) return false;
  if (typeof goal.maxOvershootPct === "number" && s.overshootPct > goal.maxOvershootPct) return false;
  if (typeof goal.minOvershootPct === "number" && s.overshootPct < goal.minOvershootPct) return false;
  if (typeof goal.settled === "boolean" && s.settled !== goal.settled) return false;
  return true;
}

// ───────────────────────────── pcb-z0: microstrip impedance calculator ─────────────────────────────

export interface Z0Props {
  /** Target impedance in ohms (shown as a chip). */
  target?: number;
  /** How close counts as hitting it, ohms. */
  tol?: number;
  w?: number;
  h?: number;
  oz?: "0.5" | "1" | "2";
  er?: number;
}

export interface Z0State {
  w: number;
  h: number;
  t: number;
  er: number;
  z0: number;
  valid: boolean;
}

const OZ_OPTS = [
  { value: "0.5", label: "0.5 oz" },
  { value: "1", label: "1 oz" },
  { value: "2", label: "2 oz" },
];
const um = (mm: number) => `${+(mm * 1000).toFixed(1)} µm`;

export function Z0({ props, onChange }: WidgetProps<Z0Props>) {
  const target = props.target ?? 50;
  const tol = props.tol ?? 2;
  const [w, setW] = useState(props.w ?? 0.15);
  const [h, setH] = useState(props.h ?? 0.2);
  const [oz, setOz] = useState<string>(props.oz ?? "1");
  const [er, setEr] = useState(props.er ?? 4.3);
  const t = OZ_MM[oz];
  const z0 = microstripZ0(w, h, t, er);
  const valid = z0Valid(w, h, er);
  const ee = erEff(w, h, er);
  const speed = 30 / Math.sqrt(ee);
  const off = z0 - target;
  const hit = Math.abs(off) <= tol;

  const report = (ww: number, hh: number, o: string, e: number) => {
    const tt = OZ_MM[o];
    onChange?.({ w: ww, h: hh, t: tt, er: e, z0: Math.round(microstripZ0(ww, hh, tt, e) * 100) / 100, valid: z0Valid(ww, hh, e) } satisfies Z0State);
  };

  // cross-section, drawn to scale: 100 px per mm
  const S = 100;
  const base = 196;
  const dTop = base - h * S;
  const trTop = dTop - Math.max(2, t * S);
  const cx = 180;
  const tw = Math.max(3, w * S);

  return (
    <div className="w-full">
      <svg viewBox="0 0 360 236" className="w-full rounded-xl border border-line bg-surface" role="img" aria-label={`Microstrip cross-section, to scale. Trace ${w.toFixed(2)} millimetres wide over ${h.toFixed(2)} millimetres of dielectric.`}>
        <rect x={0} y={dTop} width={360} height={h * S} fill="color-mix(in srgb, var(--brand) 14%, transparent)" />
        <rect x={0} y={base} width={360} height={12} fill="color-mix(in srgb, var(--ink-3) 45%, transparent)" />
        <rect x={cx - tw / 2} y={trTop} width={tw} height={dTop - trTop} fill="var(--ink)" />
        <text x={4} y={228} fontSize={14} fill="var(--ink-2)">
          ground plane
        </text>
        <text x={cx} y={Math.max(16, trTop - 20)} textAnchor="middle" fontSize={14} fontWeight={600} fill="var(--ink)">
          w = {w.toFixed(2)} mm
        </text>
        <line x1={cx - tw / 2} x2={cx + tw / 2} y1={Math.max(24, trTop - 12)} y2={Math.max(24, trTop - 12)} stroke="var(--ink)" strokeWidth={1.5} />
        <line x1={338} x2={338} y1={dTop} y2={base} stroke="var(--ink)" strokeWidth={1.5} />
        <line x1={333} x2={343} y1={dTop} y2={dTop} stroke="var(--ink)" strokeWidth={1.5} />
        <line x1={333} x2={343} y1={base} y2={base} stroke="var(--ink)" strokeWidth={1.5} />
        <text x={330} y={(dTop + base) / 2 + 5} textAnchor="end" fontSize={14} fontWeight={600} fill="var(--ink)">
          h = {h.toFixed(2)} mm
        </text>
      </svg>
      <p className="mt-1 text-center text-[0.8rem] text-ink-3">Cross-section drawn to scale (the copper really is this thin: {um(t)}).</p>

      <div className="mt-2 grid gap-1 sm:grid-cols-2 sm:gap-x-4">
        <Slider label="Trace width w" value={w} min={0.05} max={1} step={0.01} onChange={(v) => (setW(v), report(v, h, oz, er))} format={(v) => `${v.toFixed(2)} mm`} />
        <Slider label="Dielectric height h" value={h} min={0.1} max={1.6} step={0.05} onChange={(v) => (setH(v), report(w, v, oz, er))} format={(v) => `${v.toFixed(2)} mm`} />
        <Slider label="Dielectric constant εr" value={er} min={3.5} max={4.8} step={0.1} onChange={(v) => (setEr(v), report(w, h, oz, v))} format={(v) => v.toFixed(1)} />
        <div className="flex flex-col justify-end pb-1">
          <Caption className="mb-1">Copper weight</Caption>
          <Seg label="Copper weight" value={oz} onChange={(o) => (setOz(o), report(w, h, o, er))} options={OZ_OPTS} />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        <Readout label="Z0" value={`${z0.toFixed(1)} Ω`} accent />
        <Readout label="w / h" value={(w / h).toFixed(2)} />
        <Readout label="εr_eff ≈" value={ee.toFixed(2)} />
        <Readout label="Speed ≈" value={`${speed.toFixed(1)} cm/ns`} />
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
        <span className={`inline-flex min-h-8 items-center rounded-full border px-3 text-sm font-medium ${hit ? "border-[var(--brand)]/50 bg-tint text-ink" : "border-line bg-surface text-ink-2"}`}>
          Target {target} Ω ± {tol}: {hit ? "hit" : `${signed(off, 1)} Ω off`}
        </span>
        <span className={`inline-flex min-h-8 items-center rounded-full border px-3 text-sm font-medium ${valid ? "border-line bg-surface text-ink-2" : "border-[var(--bad)]/60 text-[var(--bad)]"}`}>
          {valid ? "Formula in range" : "Outside the formula's range: expect more error"}
        </span>
      </div>
      <div className="mt-3">
        <Note>
          The formula is valid for about 0.1 &lt; w/h &lt; 2. Z0 goes <b>down</b> as the trace gets wider or the dielectric thinner, and <b>up</b> as the trace gets narrower or the dielectric thicker. Z0 does not depend on the length.
        </Note>
      </div>
      <ToyNote>
        IPC-2141 approximation: Z0 = 87 / √(εr + 1.41) × ln(5.98 h / (0.8 w + t)); good to a few percent up to about ±5 to 10 %. εr_eff uses (εr + 1)/2 + (εr − 1)/2 × (1 + 12 h/w)^−0.5. Fabs use field solvers and your real stackup.
      </ToyNote>
    </div>
  );
}

/** goal: { target (ohms), tol (ohms, default 2), mustBeValid } */
export function checkZ0(state: unknown, goal: Record<string, unknown>) {
  const s = state as Z0State | undefined;
  if (!s) return false;
  if (typeof goal.target === "number") {
    const tol = typeof goal.tol === "number" ? goal.tol : 2;
    if (Math.abs(s.z0 - goal.target) > tol) return false;
  }
  if (goal.mustBeValid === true && !s.valid) return false;
  if (goal.mustBeValid === false && s.valid) return false;
  return true;
}
