"use client";

import React, { useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { Btn, Note, Readout, Slider } from "./ui";
import { BLUE, ORANGE } from "../gpu/ui";
import { timing, type TimingInput } from "./sim";

export interface TimingProps {
  /** show the skew slider and hold analysis (default true) */
  skew?: boolean;
  /** starting values */
  period?: number;
  g?: [number, number, number, number];
  skewNs?: number;
}

export interface TimingState {
  period: number;
  skew: number;
  tlogic: number;
  setupSlack: number;
  holdSlack: number;
  setupOk: boolean;
  holdOk: boolean;
  fmaxMhz: number;
  critical: "long" | "short";
}

const DEFAULT: TimingInput = { tcq: 0.4, g: [0.35, 0.45, 0.3, 0.25], tsu: 0.15, thold: 0.05, skew: 0, period: 2 };
const EPS = 1e-9;
const ns = (v: number) => `${v < 0 ? "−" : ""}${Math.abs(v).toFixed(2)} ns`;

function snap(p: TimingInput): TimingState {
  const r = timing(p);
  return { period: p.period, skew: p.skew, tlogic: r.tlogic, setupSlack: r.setupSlack, holdSlack: r.holdSlack, setupOk: r.setupSlack >= -EPS, holdOk: r.holdSlack >= -EPS, fmaxMhz: r.fmaxMhz, critical: r.critical };
}

const X0 = 6;

/** Timing analyser: launch flop, gates with delays, capture flop; critical path, setup and hold slack, maximum clock frequency. */
export function Timing({ props, onChange }: WidgetProps<TimingProps>) {
  const showSkew = props.skew !== false;
  const [p, setP] = useState<TimingInput>({ ...DEFAULT, period: props.period ?? DEFAULT.period, g: props.g ?? DEFAULT.g, skew: props.skewNs ?? 0 });
  const upd = (patch: Partial<TimingInput>) => {
    const n = { ...p, ...patch };
    setP(n);
    onChange?.(snap(n));
  };
  const setG = (i: number, v: number) => upd({ g: p.g.map((x, k) => (k === i ? v : x)) as TimingInput["g"] });
  const r = timing(p);
  const setupOk = r.setupSlack >= -EPS;
  const holdOk = r.holdSlack >= -EPS;
  const longHot = r.critical === "long";
  const col = (hot: boolean) => (hot ? "var(--brand)" : "var(--line-strong)");
  const sw = (hot: boolean) => (hot ? 3 : 1.6);
  const E = p.period + p.skew;
  const tmin = Math.min(r.pathLong, r.pathShort);
  const AX = Math.max(3, Math.ceil(Math.max(E + 0.2, p.tcq + r.tlogic + 0.3, p.skew + p.thold + 0.3)));
  const tx = (t: number) => X0 + Math.max(0, Math.min(AX, t)) * ((360 - 2 * X0) / AX);

  const gate = (x: number, y: number, name: string, hot: boolean) => (
    <g key={name}>
      <rect x={x} y={y} width={40} height={32} rx={8} fill={hot ? "var(--tint)" : "var(--surface-2)"} stroke={col(hot)} strokeWidth={hot ? 2.4 : 1.4} />
      <text x={x + 20} y={y + 21} textAnchor="middle" fontSize={14} fill="var(--ink)" fontFamily="var(--font-mono, monospace)">
        {name}
      </text>
    </g>
  );

  return (
    <div className="w-full" data-widget="digi-timing">
      <div className="mx-auto max-w-[26rem] rounded-xl border border-line bg-surface p-1.5">
        <svg viewBox="0 0 300 126" role="img" aria-label={`Launch flip-flop, four gates and a capture flip-flop. Critical path is ${longHot ? "G1, G2, G4" : "G3, G4"}, ${r.tlogic.toFixed(2)} nanoseconds.`} className="block w-full">
          <path d="M40 62 L52 36" stroke={col(longHot)} strokeWidth={sw(longHot)} fill="none" />
          <path d="M40 62 L52 100" stroke={col(!longHot)} strokeWidth={sw(!longHot)} fill="none" />
          <path d="M92 36 L106 36" stroke={col(longHot)} strokeWidth={sw(longHot)} fill="none" />
          <path d="M146 36 L180 56" stroke={col(longHot)} strokeWidth={sw(longHot)} fill="none" />
          <path d="M92 100 L180 74" stroke={col(!longHot)} strokeWidth={sw(!longHot)} fill="none" />
          <path d="M220 65 L258 62" stroke="var(--brand)" strokeWidth={3} fill="none" />
          {gate(52, 20, "G1", longHot)}
          {gate(106, 20, "G2", longHot)}
          {gate(52, 84, "G3", !longHot)}
          {gate(180, 49, "G4", true)}
          {[
            [2, "FF1"],
            [258, "FF2"],
          ].map(([x, t]) => (
            <g key={String(t)}>
              <rect x={x as number} y={40} width={40} height={44} rx={8} fill="var(--surface-2)" stroke="var(--ink)" strokeWidth={1.8} />
              <text x={(x as number) + 20} y={67} textAnchor="middle" fontSize={14} fill="var(--ink)" fontFamily="var(--font-mono, monospace)">
                {t}
              </text>
            </g>
          ))}
        </svg>
      </div>
      <p className="mt-1 text-center text-xs text-ink-3">Gate delays are set below. The highlighted route is the critical path: the slowest way from FF1 to FF2.</p>

      <div className="mt-3 rounded-xl border border-line bg-surface p-2">
        <svg viewBox="0 0 360 104" role="img" aria-label={`Timeline of one clock period. Slowest data arrives at ${(p.tcq + r.tlogic).toFixed(2)} ns; the setup window ends at the capture edge at ${E.toFixed(2)} ns. Setup slack ${ns(r.setupSlack)}. Earliest next data arrives at ${(p.tcq + tmin).toFixed(2)} ns; hold window ends at ${(p.skew + p.thold).toFixed(2)} ns. Hold slack ${ns(r.holdSlack)}.`} className="block w-full">
          {/* axis */}
          <line x1={X0} x2={360 - X0} y1={96} y2={96} stroke="var(--line-strong)" strokeWidth={1} />
          {Array.from({ length: AX + 1 }, (_, i) => (
            <line key={i} x1={tx(i)} x2={tx(i)} y1={92} y2={100} stroke="var(--line-strong)" strokeWidth={1} />
          ))}
          {/* clock edges */}
          <line x1={tx(0)} x2={tx(0)} y1={2} y2={92} stroke="var(--ink-3)" strokeWidth={1.4} strokeDasharray="3 3" />
          <line x1={tx(p.period)} x2={tx(p.period)} y1={2} y2={92} stroke="var(--ink-3)" strokeWidth={1.4} strokeDasharray="3 3" />
          {/* row 1: slowest data (setup check) */}
          <rect x={tx(0)} y={12} width={Math.max(1, tx(p.tcq) - tx(0))} height={22} fill={BLUE} />
          <rect x={tx(p.tcq)} y={12} width={Math.max(1, tx(p.tcq + r.tlogic) - tx(p.tcq))} height={22} fill="var(--brand)" />
          <rect x={tx(E - p.tsu)} y={8} width={Math.max(1, tx(E) - tx(E - p.tsu))} height={30} fill={ORANGE} opacity={0.85} />
          <line x1={tx(E)} x2={tx(E)} y1={4} y2={42} stroke={setupOk ? "var(--ink)" : "var(--bad)"} strokeWidth={2.4} />
          {/* row 2: fastest data (hold check) */}
          <rect x={tx(0)} y={52} width={Math.max(1, tx(p.tcq) - tx(0))} height={22} fill={BLUE} />
          <rect x={tx(p.tcq)} y={52} width={Math.max(1, tx(p.tcq + tmin) - tx(p.tcq))} height={22} fill="var(--brand)" opacity={0.55} />
          <rect x={tx(p.skew)} y={48} width={Math.max(1, tx(p.skew + p.thold) - tx(p.skew))} height={30} fill={ORANGE} opacity={0.85} />
          <line x1={tx(p.skew)} x2={tx(p.skew)} y1={46} y2={82} stroke={holdOk ? "var(--ink)" : "var(--bad)"} strokeWidth={2.4} />
        </svg>
        <div className="mt-1 flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs text-ink-2">
          <span><span className="mr-1 inline-block h-2.5 w-2.5 rounded-sm align-middle" style={{ background: BLUE }} />clock to Q</span>
          <span><span className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-[var(--brand)] align-middle" />gate delays</span>
          <span><span className="mr-1 inline-block h-2.5 w-2.5 rounded-sm align-middle" style={{ background: ORANGE }} />setup / hold window</span>
          <span>top bar: slowest data · bottom bar: fastest data · dashed: FF1 clock edges · black: FF2 clock edges · axis ticks every 1 ns</span>
        </div>
      </div>

      <div className="mt-3 grid gap-x-4 gap-y-1 sm:grid-cols-2">
        <Slider label="Clock period" value={p.period} min={0.8} max={6} step={0.05} onChange={(v) => upd({ period: v })} format={(v) => `${v.toFixed(2)} ns (${(1000 / v).toFixed(0)} MHz)`} />
        {showSkew && <Slider label="Clock skew (FF2's clock arrives later by)" value={p.skew} min={-0.6} max={1.2} step={0.05} onChange={(v) => upd({ skew: v })} format={ns} />}
      </div>
      <details className="mt-2 rounded-xl border border-line bg-surface px-3 py-1 text-sm text-ink-2" open>
        <summary className="min-h-10 cursor-pointer py-2 text-ink">Gate delays</summary>
        <div className="grid gap-x-4 sm:grid-cols-2">
          {p.g.map((v, i) => (
            <Slider key={i} label={`G${i + 1}`} value={v} min={0.1} max={1.2} step={0.05} onChange={(x) => setG(i, x)} format={ns} />
          ))}
        </div>
      </details>
      {showSkew && (
        <details className="mt-2 rounded-xl border border-line bg-surface px-3 py-1 text-sm text-ink-2">
          <summary className="min-h-10 cursor-pointer py-2 text-ink">Flip-flop numbers</summary>
          <div className="grid gap-x-4 sm:grid-cols-3">
            <Slider label="Clock to Q" value={p.tcq} min={0.1} max={1} step={0.05} onChange={(v) => upd({ tcq: v })} format={ns} />
            <Slider label="Setup time" value={p.tsu} min={0.05} max={0.5} step={0.05} onChange={(v) => upd({ tsu: v })} format={ns} />
            <Slider label="Hold time" value={p.thold} min={0} max={0.4} step={0.05} onChange={(v) => upd({ thold: v })} format={ns} />
          </div>
        </details>
      )}
      <div className="mt-2 flex justify-center">
        <Btn onClick={() => { const n = { ...DEFAULT, g: [...DEFAULT.g] as TimingInput["g"] }; setP(n); onChange?.(snap(n)); }}>Reset</Btn>
      </div>

      <div className="mt-3 flex flex-wrap justify-center gap-2">
        <Readout label="Critical path" value={`${longHot ? "G1+G2+G4" : "G3+G4"} = ${r.tlogic.toFixed(2)} ns`} />
        <Readout label="Setup slack" value={ns(r.setupSlack)} accent />
        {showSkew && <Readout label="Hold slack" value={ns(r.holdSlack)} accent />}
        <Readout label="Max clock" value={`${r.fmaxMhz.toFixed(0)} MHz`} />
      </div>
      <div className="mt-3 flex flex-col gap-2">
        <Note tone={setupOk && holdOk ? "plain" : "accent"}>
          {!setupOk
            ? `Setup violated by ${Math.abs(r.setupSlack).toFixed(2)} ns: the data arrives (${(p.tcq + r.tlogic).toFixed(2)} ns) too late to be stable ${p.tsu.toFixed(2)} ns before the capture edge. Slow the clock down or shorten the critical path.`
            : showSkew && !holdOk
              ? `Hold violated by ${Math.abs(r.holdSlack).toFixed(2)} ns: the next data races through the fastest path and arrives before the capture flop has finished holding the old value. Slowing the clock does NOT fix hold.`
              : `Both checks pass. Setup: period ${p.period.toFixed(2)} ns ≥ clock-to-Q ${p.tcq.toFixed(2)} + logic ${r.tlogic.toFixed(2)} + setup ${p.tsu.toFixed(2)}${p.skew ? ` − skew ${p.skew.toFixed(2)}` : ""} = ${(p.tcq + r.tlogic + p.tsu - p.skew).toFixed(2)} ns.`}
        </Note>
        <p className="text-center text-xs text-ink-3">Toy model: one fixed delay per part, no temperature or voltage variation, no clock uncertainty. Numbers are illustrative, not from a real library.</p>
      </div>
    </div>
  );
}

/** goal: any of { setupOk, holdOk, critical } plus numeric minFmax, maxPeriod, minSkew, maxTlogic */
export function checkTiming(state: unknown, goal: Record<string, unknown>) {
  const s = state as TimingState | undefined;
  if (!s) return false;
  for (const k of ["setupOk", "holdOk", "critical"] as const) if (k in goal && s[k] !== goal[k]) return false;
  if (typeof goal.minFmax === "number" && s.fmaxMhz < goal.minFmax) return false;
  if (typeof goal.maxPeriod === "number" && s.period > goal.maxPeriod + EPS) return false;
  if (typeof goal.minSkew === "number" && s.skew < goal.minSkew - EPS) return false;
  if (typeof goal.maxTlogic === "number" && s.tlogic > goal.maxTlogic + EPS) return false;
  return Object.keys(goal).length > 0;
}
