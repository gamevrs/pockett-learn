"use client";

import React, { useMemo, useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { MINUS, Note, Plot, Readout, SECOND, Seg, Slider, Stepper, ToyNote, formatSI } from "./ui";
import { cutoffHz, gainOf, phaseDeg, simulateFilter, toDb, type FilterType, type TestWave } from "./filtersim";

export interface FilterProps {
  /** Starting resistance, ohms (snaps to the nearest listed value). */
  r?: number;
  /** Starting capacitance, farads (snaps to the nearest listed value). */
  c?: number;
  type?: FilterType;
  /** Starting test frequency, Hz. */
  testF?: number;
  view?: "response" | "scope";
  wave?: TestWave;
}

export interface FilterState {
  r: number;
  c: number;
  type: FilterType;
  view: "response" | "scope";
  wave: TestWave;
  fc: number;
  testF: number;
  /** Voltage gain |Vout/Vin| at the test frequency. */
  gain: number;
  gainDb: number;
  phase: number;
}

const R_VALUES = [100, 150, 220, 330, 470, 680, 1e3, 1.5e3, 2.2e3, 3.3e3, 4.7e3, 6.8e3, 1e4, 1.5e4, 2.2e4, 3.3e4, 4.7e4, 6.8e4, 1e5];
const C_VALUES = [1e-9, 2.2e-9, 4.7e-9, 1e-8, 2.2e-8, 4.7e-8, 1e-7, 2.2e-7, 4.7e-7, 1e-6, 2.2e-6, 4.7e-6, 1e-5];
const POS_MAX = 800;
const fOf = (pos: number) => Math.pow(10, pos / 100 - 1);
const posOf = (f: number) => Math.round((Math.log10(f) + 1) * 100);
const nearest = (list: number[], v: number) => list.reduce((best, x, i) => (Math.abs(Math.log(x / v)) < Math.abs(Math.log(list[best] / v)) ? i : best), 0);

const decadeLabel = (e: number) => (e >= 6 ? `${Math.pow(10, e - 6)}M` : e >= 3 ? `${Math.pow(10, e - 3)}k` : e >= 0 ? `${Math.pow(10, e)}` : `${Math.pow(10, e)}`);

/** RC low-pass / high-pass: Bode-style response, or input and output on a scope at a chosen test frequency. */
export function Filter({ props, onChange, status, goal }: WidgetProps<FilterProps>) {
  const [ri, setRi] = useState(nearest(R_VALUES, props.r ?? 1e3));
  const [ci, setCi] = useState(nearest(C_VALUES, props.c ?? 1e-7));
  const [type, setType] = useState<FilterType>(props.type ?? "low");
  const [view, setView] = useState<"response" | "scope">(props.view ?? "response");
  const [wave, setWave] = useState<TestWave>(props.wave ?? "sine");
  const [pos, setPos] = useState(posOf(props.testF ?? 1000));

  const make = (r: number, c: number, t: FilterType, v: "response" | "scope", w: TestWave, p: number): FilterState => {
    const fc = cutoffHz(r, c);
    const f = fOf(p);
    const g = gainOf(t, f, fc);
    return { r, c, type: t, view: v, wave: w, fc, testF: f, gain: g, gainDb: toDb(g), phase: phaseDeg(t, f, fc) };
  };
  const r = R_VALUES[ri];
  const c = C_VALUES[ci];
  const st = make(r, c, type, view, wave, pos);
  const report = (rr: number, cc: number, t: FilterType, v: "response" | "scope", w: TestWave, p: number) => onChange?.(make(R_VALUES[rr], C_VALUES[cc], t, v, w, p));

  const fc = st.fc;
  const scope = useMemo(() => (view === "scope" ? simulateFilter({ type, r, c, wave, f: fOf(pos) }) : null), [view, type, r, c, wave, pos]);

  // Response curve over four decades around fc.
  const lo = fc / 100;
  const hi = fc * 100;
  const curve = useMemo(
    () => {
      const pts: [number, number][] = [];
      const asy: [number, number][] = [];
      for (let i = 0; i <= 160; i++) {
        const f = lo * Math.pow(hi / lo, i / 160);
        pts.push([f, toDb(gainOf(type, f, fc))]);
        const x = f / fc;
        asy.push([f, type === "low" ? (x <= 1 ? 0 : -20 * Math.log10(x)) : x >= 1 ? 0 : 20 * Math.log10(x)]);
      }
      return { pts, asy };
    },
    [type, fc, lo, hi],
  );
  const xTicks = [];
  for (let e = Math.ceil(Math.log10(lo) - 1e-9); e <= Math.floor(Math.log10(hi) + 1e-9); e++) xTicks.push({ value: Math.pow(10, e), label: decadeLabel(e) });
  const yTicks = [0, -10, -20, -30, -40].map((v) => ({ value: v, label: v === 0 ? "0" : `${MINUS}${-v}` }));

  const solution = status === "revealed" && goal && typeof goal.fc === "number" ? bestPair(goal.fc) : null;
  const dbText = `${st.gainDb < 0 ? MINUS : ""}${Math.abs(st.gainDb).toFixed(1)} dB`;
  const phaseText = `${st.phase < 0 ? MINUS : "+"}${Math.abs(st.phase).toFixed(0)}°`;
  const T = scope && scope.ok ? scope.period : 1;

  return (
    <div data-widget="analog-filter" className="w-full">
      <div className="flex flex-wrap items-center gap-2">
        <Seg label="Filter type" options={[{ value: "low", label: "Low-pass" }, { value: "high", label: "High-pass" }]} value={type} onChange={(t) => { setType(t); report(ri, ci, t, view, wave, pos); }} />
        <Seg label="View" options={[{ value: "response", label: "Response" }, { value: "scope", label: "Scope" }]} value={view} onChange={(v) => { setView(v); report(ri, ci, type, v, wave, pos); }} />
      </div>

      <div className="mt-2">
        {view === "response" ? (
          <Plot
            height={220}
            x={[lo, hi]}
            y={[-45, 3]}
            xLog
            xTicks={xTicks}
            yTicks={yTicks}
            xLabel="frequency (Hz)"
            yLabel="gain (dB)"
            markers={[
              { y: -3, color: "var(--bad)", label: `${MINUS}3 dB` },
              { x: fc, color: "var(--brand)", label: "fc" },
              { x: st.testF, color: SECOND },
              { y: st.gainDb, color: SECOND },
            ]}
            series={[
              { points: curve.asy, color: "var(--ink-3)", dashed: true },
              { points: curve.pts, color: "var(--brand)" },
            ]}
            ariaLabel={`Bode-style plot of a ${type === "low" ? "low-pass" : "high-pass"} filter with cutoff ${formatSI(fc, "Hz")}. At the test frequency ${formatSI(st.testF, "Hz")} the gain is ${dbText}.`}
          />
        ) : scope && scope.ok ? (
          <Plot
            height={210}
            x={[0, 3 * T]}
            y={[-1.25, 1.25]}
            xTicks={[0, 1, 2].map((k) => ({ value: k * T, label: k === 0 ? "0" : formatSI(k * T, "s") }))}
            yTicks={[-1, 0, 1].map((v) => ({ value: v, label: v < 0 ? `${MINUS}1 V` : `${v} V` }))}
            xLabel="time"
            markers={[{ y: 0, color: "var(--line-strong)" }]}
            series={[
              { points: scope.t.map((t, i) => [t, scope.vin[i]] as [number, number]), color: SECOND },
              { points: scope.t.map((t, i) => [t, scope.vout[i]] as [number, number]), color: "var(--brand)" },
            ]}
            ariaLabel={`Scope trace of a ${wave} wave of ${formatSI(st.testF, "Hz")} going into the filter (orange) and the filtered output (accent). Output gain ${st.gain.toFixed(2)}.`}
          />
        ) : (
          <Note>{scope ? scope.message : ""}</Note>
        )}
        <p className="mt-1 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-ink-2">
          {view === "response" ? (
            <>
              <span>Solid: gain of the filter</span>
              <span>Grey dashed: straight-line approximation</span>
              <span>Orange cross-hair: your test frequency</span>
            </>
          ) : (
            <>
              <span className="inline-flex items-center gap-1.5"><span aria-hidden className="inline-block h-0.5 w-5 rounded" style={{ background: SECOND }} />input (1 V peak)</span>
              <span className="inline-flex items-center gap-1.5"><span aria-hidden className="inline-block h-0.5 w-5 rounded" style={{ background: "var(--brand)" }} />output</span>
            </>
          )}
        </p>
      </div>

      <div className="mt-3 grid gap-x-4 gap-y-2 sm:grid-cols-2">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <div>
            <p className="text-xs text-ink-3">Resistor R</p>
            <Stepper label="Resistance" value={ri} min={0} max={R_VALUES.length - 1} format={(i) => formatSI(R_VALUES[i], "Ω")} wide onChange={(i) => { setRi(i); report(i, ci, type, view, wave, pos); }} />
          </div>
          <div>
            <p className="text-xs text-ink-3">Capacitor C</p>
            <Stepper label="Capacitance" value={ci} min={0} max={C_VALUES.length - 1} format={(i) => formatSI(C_VALUES[i], "F")} wide onChange={(i) => { setCi(i); report(ri, i, type, view, wave, pos); }} />
          </div>
        </div>
        <div>
          <Slider label="Test frequency" value={pos} min={0} max={POS_MAX} onChange={(p) => { setPos(p); report(ri, ci, type, view, wave, p); }} format={() => formatSI(st.testF, "Hz")} />
          {view === "scope" && (
            <Seg label="Test wave" className="mt-1" options={[{ value: "sine", label: "Sine" }, { value: "square", label: "Square" }]} value={wave} onChange={(w) => { setWave(w); report(ri, ci, type, view, w, pos); }} />
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap justify-center gap-2">
        <Readout label="fc" value={formatSI(fc, "Hz")} accent />
        <Readout label="gain at test f" value={`${st.gain.toFixed(3)} (${dbText})`} />
        <Readout label="phase" value={phaseText} />
      </div>
      <div className="mt-3 space-y-2">
        {view === "scope" && scope && scope.ok && wave === "sine" && scope.measured !== null && (
          <Note>
            Scope: the output peak is {scope.measured.toFixed(3)} V for a 1 V input, and the formula says {st.gain.toFixed(3)}. The run starts with the capacitor already at its steady-state charge, so you see the settled picture.
          </Note>
        )}
        {view === "scope" && wave === "square" && (
          <Note>A square wave is a stack of sine waves at the fundamental and its odd multiples, so the filter treats each one differently and the edges get rounded (low-pass) or turned into spikes (high-pass). The gain readout is for a sine at this frequency.</Note>
        )}
        {view === "response" && (
          <Note tone={Math.abs(st.testF / fc - 1) < 0.05 ? "accent" : "plain"}>
            {Math.abs(st.testF / fc - 1) < 0.05
              ? `You are at the cutoff: gain 0.707 (${MINUS}3 dB), and the phase is ${MINUS}45° for a low-pass or +45° for a high-pass.`
              : `fc = 1 / (2π · ${formatSI(r, "Ω")} · ${formatSI(c, "F")}) = ${formatSI(fc, "Hz")}. Past it, a first-order filter falls 20 dB per decade (ten times the frequency).`}
          </Note>
        )}
        {solution && <Note tone="accent">One answer: R = {formatSI(solution.r, "Ω")} and C = {formatSI(solution.c, "F")} give fc = {formatSI(cutoffHz(solution.r, solution.c), "Hz")}.</Note>}
        <ToyNote>Toy model: an ideal source with no resistance feeding a first-order RC filter, and nothing connected to its output. A real source and a real load change the cutoff, and real parts have tolerances.</ToyNote>
      </div>
    </div>
  );
}

function bestPair(target: number): { r: number; c: number } {
  let best = { r: R_VALUES[0], c: C_VALUES[0] };
  let err = Infinity;
  for (const r of R_VALUES) for (const c of C_VALUES) {
    const e = Math.abs(Math.log(cutoffHz(r, c) / target));
    if (e < err) {
      err = e;
      best = { r, c };
    }
  }
  return best;
}

/**
 * goal: { type, fc, tol (relative, default 0.1), gainDbMax, gainDbMin, at (test frequency, within 12%), view, r, c }.
 */
export function checkFilter(state: unknown, goal: Record<string, unknown>) {
  const s = state as FilterState | undefined;
  if (!s) return false;
  if (goal.type !== undefined && s.type !== goal.type) return false;
  if (goal.view !== undefined && s.view !== goal.view) return false;
  if (typeof goal.fc === "number") {
    const tol = typeof goal.tol === "number" ? goal.tol : 0.1;
    if (Math.abs(s.fc / goal.fc - 1) > tol) return false;
  }
  if (typeof goal.gainDbMax === "number" && !(s.gainDb <= goal.gainDbMax)) return false;
  if (typeof goal.gainDbMin === "number" && !(s.gainDb >= goal.gainDbMin)) return false;
  if (typeof goal.at === "number" && Math.abs(Math.log10(s.testF / goal.at)) > 0.05) return false;
  if (typeof goal.r === "number" && Math.abs(s.r / goal.r - 1) > 1e-6) return false;
  if (typeof goal.c === "number" && Math.abs(s.c / goal.c - 1) > 1e-6) return false;
  return true;
}
