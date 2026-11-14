"use client";

import { useId, useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { Btn, Caption, Note, Readout, Seg, Slider, ToyNote } from "./ui";
import { F_MAX_HZ, F_MIN_HZ, FILTER_FC_HZ, evaluate, fccClassBLimitDbuv } from "./emc-logic";

const AREAS = [
  { value: 10, label: "Over a plane" },
  { value: 400, label: "Split detour" },
  { value: 2000, label: "Far return wire" },
];
const AREA_NOTE: Record<number, string> = {
  10: "Trace over a solid plane: the return current runs right under the trace, loop about 10 mm².",
  400: "Return forced round a split in the plane: loop about 400 mm².",
  2000: "Two-layer board, return wire far away: loop about 2000 mm².",
};

export interface EmcProps {
  freqMHz?: number;
  currentMa?: number;
  riseNs?: number;
  areaMm2?: number;
  filter?: boolean;
}

export interface EmcState {
  worstMarginDb: number;
  pass: boolean;
  areaMm2: number;
  riseNs: number;
  freqMHz: number;
  currentMa: number;
  filter: boolean;
}

// Plot geometry (viewBox units).
const FS = 16;
const W = 360;
const H = 236;
const X0 = 46;
const X1 = 350;
const YT = 16;
const YB = 186;
const DB_MIN = -20;
const DB_MAX = 80;
const px = (f: number) => X0 + (Math.log(f / F_MIN_HZ) / Math.log(F_MAX_HZ / F_MIN_HZ)) * (X1 - X0);
const py = (db: number) => YB - ((Math.max(DB_MIN, Math.min(DB_MAX, db)) - DB_MIN) / (DB_MAX - DB_MIN)) * (YB - YT);

export function Emc({ props, onChange, revealed }: WidgetProps<EmcProps>) {
  const [freq, setFreq] = useState(props.freqMHz ?? 30);
  const [cur, setCur] = useState(props.currentMa ?? 30);
  const [rise, setRise] = useState(props.riseNs ?? 3);
  const [area, setArea] = useState(props.areaMm2 ?? 400);
  const [filter, setFilter] = useState(props.filter ?? false);
  const locked = Boolean(revealed);
  const uid = useId();

  const r = evaluate({ freqMHz: freq, currentMa: cur, riseNs: rise, areaMm2: area, filter });

  const emit = (f: number, c: number, t: number, a: number, fl: boolean) => {
    const rr = evaluate({ freqMHz: f, currentMa: c, riseNs: t, areaMm2: a, filter: fl });
    onChange?.({ worstMarginDb: Math.round(rr.worstMarginDb * 10) / 10, pass: rr.pass, areaMm2: a, riseNs: t, freqMHz: f, currentMa: c, filter: fl } satisfies EmcState);
  };

  const margin = r.worstMarginDb;
  const marginTxt = `${margin >= 0 ? "+" : "−"}${Math.abs(margin).toFixed(1)} dB`;

  // limit step line
  const limitPath = (() => {
    const edges = [F_MIN_HZ, 88e6, 216e6, 960e6, F_MAX_HZ];
    let d = "";
    for (let i = 0; i < edges.length - 1; i++) {
      const lim = fccClassBLimitDbuv(edges[i]);
      d += `${i === 0 ? "M" : "L"}${px(edges[i]).toFixed(1)},${py(lim).toFixed(1)} L${px(edges[i + 1]).toFixed(1)},${py(lim).toFixed(1)} `;
    }
    return d;
  })();

  const xt = [
    { f: 30e6, l: "30" },
    { f: 100e6, l: "100" },
    { f: 300e6, l: "300" },
    { f: 1e9, l: "1000" },
  ];
  const yt = [0, 20, 40, 60, 80];

  return (
    <div className="w-full">
      <div className="grid gap-x-4 gap-y-1 sm:grid-cols-2">
        <Slider label="Clock frequency" value={freq} min={10} max={100} step={5} disabled={locked} format={(v) => `${v} MHz`} onChange={(v) => { setFreq(v); emit(v, cur, rise, area, filter); }} />
        <Slider label="Clock current (amplitude)" value={cur} min={10} max={50} step={5} disabled={locked} format={(v) => `${v} mA`} onChange={(v) => { setCur(v); emit(freq, v, rise, area, filter); }} />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
        <div>
          <Caption className="mb-1">Rise time</Caption>
          <Seg label="Rise time" value={rise} onChange={(v) => { if (!locked) { setRise(v); emit(freq, cur, v, area, filter); } }} options={[1, 3, 10].map((v) => ({ value: v, label: `${v} ns` }))} />
        </div>
        <div>
          <Caption className="mb-1">Return path (loop area)</Caption>
          <Seg label="Loop area" value={area} onChange={(v) => { if (!locked) { setArea(v); emit(freq, cur, rise, v, filter); } }} options={AREAS} />
        </div>
        <div>
          <Caption className="mb-1">Toy filter at the source</Caption>
          <Btn on={filter} disabled={locked} onClick={() => { setFilter(!filter); emit(freq, cur, rise, area, !filter); }} label="Toggle the source filter, a first-order low-pass on the clock current">
            {filter ? "Filter on (fc 100 MHz)" : "Filter off"}
          </Btn>
        </div>
      </div>
      <p className="mt-2 text-[0.82rem] text-ink-3">{AREA_NOTE[area] ?? `Loop area ${area} mm².`}</p>

      <div className="mt-3 rounded-xl border border-line bg-surface p-2">
        <Caption className="mb-1 px-1">Estimated field at 3 m</Caption>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-labelledby={`${uid}-t`}>
          <title id={`${uid}-t`}>{`Estimated radiated field in dB microvolts per metre against frequency, with the FCC Part 15 Class B limit. Worst margin ${marginTxt}, ${r.pass ? "pass" : "fail"}.`}</title>
          {yt.map((v) => (
            <g key={v}>
              <line x1={X0} x2={X1} y1={py(v)} y2={py(v)} stroke="var(--line)" strokeWidth={1} />
              <text x={X0 - 5} y={py(v) + 5} textAnchor="end" fontSize={FS} fill="var(--ink-3)">{v}</text>
            </g>
          ))}
          {xt.map((t) => (
            <g key={t.l}>
              <line x1={px(t.f)} x2={px(t.f)} y1={YT} y2={YB} stroke="var(--line)" strokeWidth={1} />
              <text x={Math.min(Math.max(px(t.f), X0 + 8), X1 - 14)} y={YB + 18} textAnchor="middle" fontSize={FS} fill="var(--ink-3)">{t.l}</text>
            </g>
          ))}
          <text x={(X0 + X1) / 2} y={H - 8} textAnchor="middle" fontSize={FS} fill="var(--ink-3)">frequency, MHz (log scale)</text>
          {r.lines.map((l) => (
            <line key={l.n} x1={px(l.fHz)} x2={px(l.fHz)} y1={YB} y2={py(l.eDbuv)} stroke={l.marginDb >= 0 ? "var(--brand)" : "var(--bad)"} strokeWidth={2.5} strokeLinecap="round" />
          ))}
          <path d={limitPath} fill="none" stroke="var(--ink)" strokeWidth={2} strokeDasharray="6 4" />
          {r.worst && <circle cx={px(r.worst.fHz)} cy={py(r.worst.eDbuv)} r={5} fill="none" stroke="var(--ink)" strokeWidth={2} />}
        </svg>
        <p className="px-1 text-[0.78rem] text-ink-3">Vertical axis: dBµV/m. Dashed line: FCC Class B limit at 3 m. Each bar is one odd harmonic of the clock; red bars are over the limit and the ring marks the worst one.</p>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        <Readout label="Worst margin" value={marginTxt} accent />
        <Readout label="Result" value={r.pass ? "Pass" : "Fail"} />
        {r.worst && <Readout label="Worst at" value={`${Math.round(r.worst.fHz / 1e6)} MHz`} />}
      </div>
      <div className="mt-3">
        <Note tone={r.pass ? "accent" : "plain"}>
          {r.pass
            ? `Under the Class B line by ${margin.toFixed(1)} dB. A real lab likes 6 dB or more of margin because boards and tests vary.`
            : `Over the limit by ${(-margin).toFixed(1)} dB. Shrink the loop (every 6 dB is a factor of two), slow the edges, or filter at the source.`}
        </Note>
      </div>
      <ToyNote>
        A toy estimate: one clock loop, Ott&apos;s small-loop formula E ≈ 263×10⁻¹⁶·f²·A·I/r (differential mode, r = 3 m, ground reflection included), a 50% duty trapezoid with a sin(x)/x rise-time envelope, and a first-order low-pass (corner {FILTER_FC_HZ / 1e6} MHz) for the filter. Real emissions are often dominated by common-mode currents on cables, which this ignores. Only a test lab gives a real result.
      </ToyNote>
    </div>
  );
}

/** goal: { pass, minMarginDb, areaMm2 (max), riseNs (max or exact via riseNsMin) } */
export function checkEmc(state: unknown, goal: Record<string, unknown>) {
  const s = state as EmcState | undefined;
  if (!s || typeof s.worstMarginDb !== "number") return false;
  if (typeof goal.pass === "boolean" && s.pass !== goal.pass) return false;
  if (typeof goal.minMarginDb === "number" && s.worstMarginDb < goal.minMarginDb) return false;
  if (typeof goal.areaMm2 === "number" && s.areaMm2 > goal.areaMm2) return false;
  if (typeof goal.riseNs === "number" && s.riseNs < goal.riseNs) return false;
  return true;
}
