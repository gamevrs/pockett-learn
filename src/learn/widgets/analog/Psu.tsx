"use client";

import React, { useMemo, useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { MINUS, Note, Plot, Readout, SECOND, Seg, Slider, ToyNote, formatSI } from "./ui";
import { SECONDARY_PEAK, SECONDARY_RMS, rectifiedPeak, rippleEstimate, rippleFreq, simulatePsu, type PsuStage } from "./psusim";

export interface PsuProps {
  stage?: PsuStage;
  /** Starting smoothing capacitor, farads (snaps to the nearest listed value). */
  c?: number;
  /** Starting load current at the output peak, amps. */
  iLoad?: number;
  fMains?: 50 | 60;
  smooth?: boolean;
}

export interface PsuState {
  stage: PsuStage;
  smooth: boolean;
  c: number;
  iLoad: number;
  fMains: 50 | 60;
  /** Simulated output swing (max − min) over the last two cycles, volts. For "ac" this is the whole AC swing. */
  rippleV: number;
  dc: number;
  /** I / (f_ripple · C); 0 when there is no smoothing capacitor. */
  estimate: number;
  fRipple: number;
}

const C_VALUES = [1e-4, 2.2e-4, 4.7e-4, 1e-3, 2.2e-3, 4.7e-3];

/** Transformer → rectifier → smoothing capacitor → load, simulated with the shared transient solver. */
export function Psu({ props, onChange }: WidgetProps<PsuProps>) {
  const [stage, setStage] = useState<PsuStage>(props.stage ?? "ac");
  const [smooth, setSmooth] = useState(props.smooth ?? true);
  const [ci, setCi] = useState(() => {
    const want = props.c ?? 1e-3;
    return C_VALUES.reduce((b, x, i) => (Math.abs(Math.log(x / want)) < Math.abs(Math.log(C_VALUES[b] / want)) ? i : b), 0);
  });
  const [ma, setMa] = useState(Math.round((props.iLoad ?? 0.3) * 1000));
  const [fm, setFm] = useState<50 | 60>(props.fMains ?? 50);

  const c = C_VALUES[ci];
  const iLoad = ma / 1000;
  const hasCap = smooth && stage !== "ac";
  const sim = useMemo(() => simulatePsu({ stage, smooth, c, iLoad, fMains: fm }), [stage, smooth, c, iLoad, fm]);
  const fr = rippleFreq(stage, fm);

  const stateOf = (stg: PsuStage, sm: boolean, cc: number, i: number, f: 50 | 60): PsuState | null => {
    const r = stg === stage && sm === smooth && cc === c && i === iLoad && f === fm ? sim : simulatePsu({ stage: stg, smooth: sm, c: cc, iLoad: i, fMains: f });
    if (!r.ok) return null;
    const cap = sm && stg !== "ac";
    return { stage: stg, smooth: sm, c: cc, iLoad: i, fMains: f, rippleV: r.ripple, dc: r.dc, estimate: cap ? rippleEstimate(i, rippleFreq(stg, f), cc) : 0, fRipple: rippleFreq(stg, f) };
  };
  const report = (stg: PsuStage, sm: boolean, cc: number, i: number, f: 50 | 60) => {
    const s = stateOf(stg, sm, cc, i, f);
    if (s) onChange?.(s);
  };

  if (!sim.ok) return <div data-widget="analog-psu"><Note>{sim.message}</Note></div>;
  const T = sim.period;
  const est = hasCap ? rippleEstimate(iLoad, fr, c) : 0;
  const peak = rectifiedPeak(stage);
  const bigRipple = hasCap && sim.ripple > 0.25 * peak;

  const chain = [
    { id: "tr", label: "Transformer", sub: `${SECONDARY_RMS} V RMS`, on: true },
    { id: "rect", label: "Rectifier", sub: stage === "ac" ? "none" : stage === "half" ? "1 diode" : "4 diodes", on: stage !== "ac" },
    { id: "cap", label: "Smoothing C", sub: hasCap ? formatSI(c, "F") : "none", on: hasCap },
    { id: "reg", label: "Regulator", sub: "next step", on: false },
  ];

  return (
    <div data-widget="analog-psu" className="w-full">
      <ol className="flex flex-wrap items-stretch gap-1.5" aria-label="Power supply chain">
        {chain.map((b, i) => (
          <li key={b.id} className="flex items-center gap-1.5">
            <span className={`rounded-xl border px-2.5 py-1 text-center text-xs leading-tight ${b.on ? "border-[var(--brand)]/50 bg-tint text-ink" : "border-line bg-surface-2 text-ink-3"}`}>
              <span className="block font-semibold">{b.label}</span>
              <span className="block">{b.sub}</span>
            </span>
            {i < chain.length - 1 && <span aria-hidden className="text-ink-3">→</span>}
          </li>
        ))}
      </ol>

      <div className="mt-2">
        <Plot
          height={220}
          x={[0, 3 * T]}
          y={[-18, 18]}
          xTicks={[0, 1, 2].map((k) => ({ value: k * T, label: k === 0 ? "0" : formatSI(k * T, "s") }))}
          yTicks={[-15, -10, -5, 0, 5, 10, 15].map((v) => ({ value: v, label: v < 0 ? `${MINUS}${-v}` : `${v}` }))}
          xLabel="time (three mains cycles)"
          yLabel="volts"
          markers={hasCap ? [{ y: sim.vmax, color: "var(--ink-3)" }, { y: sim.vmin, color: "var(--ink-3)" }] : [{ y: 0, color: "var(--line-strong)" }]}
          series={[
            { points: sim.t.map((t, i) => [t, sim.vin[i]] as [number, number]), color: SECOND, dashed: true },
            { points: sim.t.map((t, i) => [t, sim.vout[i]] as [number, number]), color: "var(--brand)" },
          ]}
          ariaLabel={`Voltage over three mains cycles. The transformer output swings to ${SECONDARY_PEAK.toFixed(1)} volts. The output after the ${stage === "ac" ? "load only" : stage === "half" ? "half-wave rectifier" : "bridge rectifier"} averages ${sim.dc.toFixed(1)} volts with ${hasCap ? `${sim.ripple.toFixed(2)} volts of ripple` : "no smoothing capacitor"}.`}
        />
        <p className="mt-1 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-ink-2">
          <span className="inline-flex items-center gap-1.5"><span aria-hidden className="inline-block h-0.5 w-5 rounded" style={{ background: SECOND }} />transformer output</span>
          <span className="inline-flex items-center gap-1.5"><span aria-hidden className="inline-block h-0.5 w-5 rounded" style={{ background: "var(--brand)" }} />voltage across the load</span>
        </p>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Seg
          label="Rectifier stage"
          options={[{ value: "ac", label: "AC in" }, { value: "half", label: "Half-wave" }, { value: "full", label: "Full-wave bridge" }]}
          value={stage}
          onChange={(v) => { setStage(v); report(v, smooth, c, iLoad, fm); }}
        />
        <Seg label="Mains frequency" options={[{ value: 50, label: "50 Hz" }, { value: 60, label: "60 Hz" }]} value={fm} onChange={(v) => { setFm(v); report(stage, smooth, c, iLoad, v); }} />
        <Seg
          label="Smoothing capacitor fitted"
          options={[{ value: 0, label: "No capacitor" }, { value: 1, label: "Capacitor" }]}
          value={smooth ? 1 : 0}
          onChange={(v) => { setSmooth(v === 1); report(stage, v === 1, c, iLoad, fm); }}
        />
      </div>
      <div className="mt-2 grid gap-x-4 sm:grid-cols-2">
        <Slider label="Smoothing capacitor" value={ci} min={0} max={C_VALUES.length - 1} disabled={!hasCap} onChange={(i) => { setCi(i); report(stage, smooth, C_VALUES[i], iLoad, fm); }} format={(i) => formatSI(C_VALUES[i], "F")} />
        <Slider label="Load current (at the output peak)" value={ma} min={50} max={1000} step={10} onChange={(m) => { setMa(m); report(stage, smooth, c, m / 1000, fm); }} format={(m) => formatSI(m / 1000, "A")} />
      </div>

      <div className="mt-3 flex flex-wrap justify-center gap-2">
        {stage === "ac" ? (
          <>
            <Readout label="peak" value={`${SECONDARY_PEAK.toFixed(1)} V`} accent />
            <Readout label="average" value="0 V" />
          </>
        ) : (
          <>
            <Readout label="DC level" value={`${sim.dc.toFixed(1)} V`} accent />
            <Readout label={hasCap ? "ripple (simulated)" : "swing, no smoothing"} value={`${sim.ripple.toFixed(2)} V`} accent />
            {hasCap && <Readout label={`I/(f·C), f = ${fr} Hz`} value={`${est.toFixed(2)} V`} />}
          </>
        )}
      </div>

      <div className="mt-3 space-y-2">
        {stage === "ac" && (
          <Note>
            The transformer has stepped the mains down and isolated it: here an ideal {SECONDARY_RMS} V RMS secondary, which peaks at {SECONDARY_RMS} × √2 = {SECONDARY_PEAK.toFixed(1)} V. The load sees voltage that swings both ways and averages 0 V, which most electronics cannot use. Pick a rectifier.
          </Note>
        )}
        {stage !== "ac" && !hasCap && (
          <Note>
            No capacitor: the output is a string of bumps that drops all the way to 0 V between them. It peaks at {peak.toFixed(1)} V ({SECONDARY_PEAK.toFixed(1)} V minus {stage === "half" ? "one diode drop of about 0.7 V" : "two diode drops, about 1.4 V in total"}).
          </Note>
        )}
        {hasCap && !bigRipple && (
          <Note tone="accent">
            The capacitor refills at each peak and feeds the load in between. Ripple is {sim.ripple.toFixed(2)} V in the simulation; the I/(f·C) estimate says {est.toFixed(2)} V{Math.abs(sim.ripple - est) / est <= 0.15 ? ", close to it" : ", so the simulation comes out lower"}. The estimate is a bit pessimistic: a resistor draws less as the voltage sags, and the diodes start refilling the capacitor just before the peak, so the gap grows as the ripple gets bigger.
          </Note>
        )}
        {bigRipple && (
          <Note>
            The ripple is a big share of the peak, so the I/(f·C) estimate ({est.toFixed(1)} V) no longer holds: it assumes a constant current and a ripple that is small against the peak. Use more capacitance or less load until the ripple is small.
          </Note>
        )}
        <p className="text-xs leading-snug text-ink-3">Safety: the transformer and everything on its mains side can kill. Learners never build that side; use a sealed, certified plug-in adapter or a bench supply, and treat big capacitors as stored energy.</p>
        <ToyNote>Toy model: ideal 12 V RMS transformer secondary with 0.5 Ω of series resistance, 0.7 V diodes, a resistor as the load (sized for the current you pick at the peak), and no capacitor leakage or ESR. The plot starts with the capacitor near its peak voltage so it shows the settled picture.</ToyNote>
      </div>
    </div>
  );
}

/** goal: { stage, smooth, rippleMax, rippleMin, dcMin, cMin, cMax, iMax, iMin, fMains }. */
export function checkPsu(state: unknown, goal: Record<string, unknown>) {
  const s = state as PsuState | undefined;
  if (!s) return false;
  if (goal.stage !== undefined && s.stage !== goal.stage) return false;
  if (typeof goal.smooth === "boolean" && s.smooth !== goal.smooth) return false;
  if (typeof goal.fMains === "number" && s.fMains !== goal.fMains) return false;
  if (typeof goal.rippleMax === "number" && !(s.rippleV <= goal.rippleMax)) return false;
  if (typeof goal.rippleMin === "number" && !(s.rippleV >= goal.rippleMin)) return false;
  if (typeof goal.dcMin === "number" && !(s.dc >= goal.dcMin)) return false;
  if (typeof goal.cMin === "number" && !(s.c >= goal.cMin - 1e-12)) return false;
  if (typeof goal.cMax === "number" && !(s.c <= goal.cMax + 1e-12)) return false;
  if (typeof goal.iMax === "number" && !(s.iLoad <= goal.iMax + 1e-9)) return false;
  if (typeof goal.iMin === "number" && !(s.iLoad >= goal.iMin - 1e-9)) return false;
  return true;
}
