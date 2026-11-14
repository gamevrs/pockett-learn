"use client";

import React, { useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { Note, Plot, Readout, SECOND, Seg, Slider, ToyNote, formatSI } from "./ui";
import { reactanceC, reactanceL, resonanceHz } from "./filtersim";

export interface ReactanceProps {
  /** Starting slider position (0 to 1200, 200 per decade from 1 Hz). Default 3 decades up (1 kHz). */
  pos?: number;
  /** Starting capacitance, farads. */
  c?: number;
  /** Starting inductance, henries. */
  l?: number;
}

export interface ReactanceState {
  pos: number;
  f: number;
  c: number;
  l: number;
  xc: number;
  xl: number;
  /** Frequency where XC = XL. */
  f0: number;
}

const C_OPTS = [
  { value: 1e-8, label: "10 nF" },
  { value: 1e-7, label: "100 nF" },
  { value: 1e-6, label: "1 µF" },
  { value: 1e-5, label: "10 µF" },
  { value: 1e-4, label: "100 µF" },
];
const L_OPTS = [
  { value: 1e-5, label: "10 µH" },
  { value: 1e-4, label: "100 µH" },
  { value: 1e-3, label: "1 mH" },
  { value: 1e-2, label: "10 mH" },
  { value: 1e-1, label: "100 mH" },
];
const POS_MAX = 1200;
const fOf = (pos: number) => Math.pow(10, pos / 200);

const X_TICKS = [0, 1, 2, 3, 4, 5, 6].map((e) => ({ value: Math.pow(10, e), label: ["1", "10", "100", "1k", "10k", "100k", "1M"][e] }));
const Y_TICKS = [-3, -2, -1, 0, 1, 2, 3, 4, 5, 6, 7].map((e) => ({
  value: Math.pow(10, e),
  label: e === -3 ? "1m" : e === 0 ? "1" : e === 3 ? "1k" : e === 6 ? "1M" : "",
}));

/** log-log plot of XC and XL against frequency, with a movable frequency. */
export function Reactance({ props, onChange }: WidgetProps<ReactanceProps>) {
  const [pos, setPos] = useState(props.pos ?? 600);
  const [c, setC] = useState(props.c ?? 1e-6);
  const [l, setL] = useState(props.l ?? 1e-3);

  const make = (p: number, cc: number, ll: number): ReactanceState => {
    const f = fOf(p);
    return { pos: p, f, c: cc, l: ll, xc: reactanceC(f, cc), xl: reactanceL(f, ll), f0: resonanceHz(ll, cc) };
  };
  const st = make(pos, c, l);
  const update = (p: number, cc: number, ll: number) => {
    setPos(p);
    setC(cc);
    setL(ll);
    onChange?.(make(p, cc, ll));
  };

  const pts = (fn: (f: number) => number): [number, number][] => Array.from({ length: 121 }, (_, i) => {
    const f = Math.pow(10, i / 20);
    return [f, fn(f)];
  });
  const ratio = st.xc / st.xl;
  const near = ratio > 0.9 && ratio < 1.1;

  return (
    <div data-widget="analog-reactance" className="w-full">
      <Plot
        height={230}
        x={[1, 1e6]}
        y={[1e-3, 1e7]}
        xLog
        yLog
        xTicks={X_TICKS}
        yTicks={Y_TICKS}
        xLabel="frequency (Hz)"
        yLabel="reactance (Ω)"
        markers={[{ x: st.f, color: "var(--ink-2)", label: formatSI(st.f, "Hz") }]}
        series={[
          { points: pts((f) => reactanceC(f, c)), color: "var(--brand)", label: "XC" },
          { points: pts((f) => reactanceL(f, l)), color: SECOND, label: "XL" },
        ]}
        ariaLabel={`Log-log plot of reactance against frequency. At ${formatSI(st.f, "Hz")} the capacitor's reactance is ${formatSI(st.xc, "Ω")} and the inductor's is ${formatSI(st.xl, "Ω")}.`}
      />
      <p className="mt-1 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-ink-2">
        <span className="inline-flex items-center gap-1.5"><span aria-hidden className="inline-block h-0.5 w-5 rounded" style={{ background: "var(--brand)" }} />XC of the capacitor (falls)</span>
        <span className="inline-flex items-center gap-1.5"><span aria-hidden className="inline-block h-0.5 w-5 rounded" style={{ background: SECOND }} />XL of the inductor (rises)</span>
      </p>
      <div className="mt-2 grid gap-x-4 gap-y-1 sm:grid-cols-2">
        <Slider label="Frequency (each step is a small slice of a decade)" value={pos} min={0} max={POS_MAX} onChange={(p) => update(p, c, l)} format={() => formatSI(st.f, "Hz")} />
        <div className="flex flex-col gap-2">
          <div>
            <p className="text-xs text-ink-3">Capacitor</p>
            <Seg label="Capacitance" options={C_OPTS} value={c} onChange={(v) => update(pos, v, l)} />
          </div>
          <div>
            <p className="text-xs text-ink-3">Inductor</p>
            <Seg label="Inductance" options={L_OPTS} value={l} onChange={(v) => update(pos, c, v)} />
          </div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        <Readout label="f" value={formatSI(st.f, "Hz")} />
        <Readout label="XC" value={formatSI(st.xc, "Ω")} accent />
        <Readout label="XL" value={formatSI(st.xl, "Ω")} accent />
      </div>
      <div className="mt-3">
        <Note tone={near ? "accent" : "plain"}>
          {near
            ? `XC and XL are about equal here. For this C and L that happens at f₀ = 1 / (2π√(LC)) = ${formatSI(st.f0, "Hz")} (the resonance idea, if you want to look it up later).`
            : st.xc > st.xl
              ? `The capacitor resists more than the inductor at ${formatSI(st.f, "Hz")}: XC is ${formatSI(st.xc, "Ω")}. Slow signals struggle to get through a capacitor.`
              : `The inductor resists more than the capacitor at ${formatSI(st.f, "Hz")}: XL is ${formatSI(st.xl, "Ω")}. Fast signals struggle to get through an inductor.`}
        </Note>
      </div>
      <div className="mt-2">
        <ToyNote>Toy model: ideal parts with no resistance, leakage or stray capacitance. Real capacitors and inductors depart from these lines at high frequency. Only the size of the opposition is shown; the 90° phase shift is left out.</ToyNote>
      </div>
    </div>
  );
}

/** goal: { xcMax, xcMin, xlMax, xlMin, equal, c, l, fMin, fMax }. `equal` means XC and XL are within 10% of each other. */
export function checkReactance(state: unknown, goal: Record<string, unknown>) {
  const s = state as ReactanceState | undefined;
  if (!s) return false;
  if (typeof goal.xcMax === "number" && !(s.xc <= goal.xcMax)) return false;
  if (typeof goal.xcMin === "number" && !(s.xc >= goal.xcMin)) return false;
  if (typeof goal.xlMax === "number" && !(s.xl <= goal.xlMax)) return false;
  if (typeof goal.xlMin === "number" && !(s.xl >= goal.xlMin)) return false;
  if (typeof goal.fMin === "number" && !(s.f >= goal.fMin)) return false;
  if (typeof goal.fMax === "number" && !(s.f <= goal.fMax)) return false;
  if (typeof goal.c === "number" && Math.abs(s.c / goal.c - 1) > 1e-6) return false;
  if (typeof goal.l === "number" && Math.abs(s.l / goal.l - 1) > 1e-6) return false;
  if (goal.equal === true) {
    const r = s.xc / s.xl;
    if (!(r > 0.9 && r < 1.1)) return false;
  }
  return true;
}
