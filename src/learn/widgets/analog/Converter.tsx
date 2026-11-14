"use client";

import React, { useEffect, useMemo, useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { Caption, Note, Plot, Readout, SECOND, Seg, Slider, ToyNote, formatSI } from "./ui";
import { CONV_C, CONV_FREQS, CONV_LS, CONV_RDS, CONV_PERIODS, steady, waves, type ConvInput, type Topology } from "./convsim";
import { niceMax } from "./rlsim";

export type ConverterControl = "topology" | "vin" | "d" | "f" | "l" | "iout";

export interface ConverterProps {
  topology?: Topology;
  vin?: number;
  /** duty cycle, 0.05 to 0.95 */
  d?: number;
  /** switching frequency, Hz (snaps to 100 kHz / 500 kHz / 1 MHz / 2 MHz) */
  f?: number;
  /** inductance, henries (snaps to 2.2 / 4.7 / 10 / 22 / 47 µH) */
  l?: number;
  iout?: number;
  /** hide these controls (they keep their starting value) */
  hide?: ConverterControl[];
  /** show these controls but do not let them change */
  lock?: ConverterControl[];
}

export interface ConverterState {
  topology: Topology;
  vin: number;
  d: number;
  f: number;
  l: number;
  iout: number;
  vout: number;
  dI: number;
  /** inductor ripple, percent of the load current */
  ripplePct: number;
  dcm: boolean;
  /** efficiency, percent */
  eff: number;
  losses: { cond: number; sw: number; gate: number };
}

const nearest = (list: number[], x: number) => list.reduce((best, v, i) => (Math.abs(Math.log(v / x)) < Math.abs(Math.log(list[best] / x)) ? i : best), 0);
const num = (x: number) => String(Number(x.toPrecision(3)));
const r3 = (x: number) => Math.round(x * 1000) / 1000;
const r1 = (x: number) => Math.round(x * 10) / 10;
const VIN_RANGE: Record<Topology, [number, number]> = { buck: [4, 24], boost: [1, 12] };

function stateOf(x: ConvInput): ConverterState {
  const s = steady(x);
  return { ...x, vout: s.vout, dI: s.dI, ripplePct: s.ripplePct, dcm: s.dcm, eff: s.eff, losses: s.losses };
}

/** Buck / boost converter bench: duty cycle, frequency and inductor set the waveforms, the ripple and the losses. */
export function Converter({ props, onChange }: WidgetProps<ConverterProps>) {
  const hide = props.hide ?? [];
  const lock = props.lock ?? [];
  const [topology, setTopology] = useState<Topology>(props.topology ?? "buck");
  const [vin, setVin] = useState(props.vin ?? 12);
  const [d, setD] = useState(props.d ?? 0.5);
  const [fi, setFi] = useState(() => nearest(CONV_FREQS, props.f ?? 1e6));
  const [li, setLi] = useState(() => nearest(CONV_LS, props.l ?? 4.7e-6));
  const [iout, setIout] = useState(props.iout ?? 1);

  const x: ConvInput = { topology, vin, d, f: CONV_FREQS[fi], l: CONV_LS[li], iout };
  const s = steady(x);
  const w = useMemo(() => waves({ topology, vin, d, f: CONV_FREQS[fi], l: CONV_LS[li], iout }), [topology, vin, d, fi, li, iout]);

  // report the starting state once, then on every change
  useEffect(() => {
    onChange?.(stateOf(x));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const set = (patch: Partial<ConvInput>) => {
    const n = { ...x, ...patch };
    if (patch.topology) {
      const [lo, hi] = VIN_RANGE[n.topology];
      n.vin = Math.min(hi, Math.max(lo, n.vin));
      setTopology(n.topology);
      setVin(n.vin);
    }
    if (patch.vin !== undefined) setVin(n.vin);
    if (patch.d !== undefined) setD(n.d);
    if (patch.f !== undefined) setFi(nearest(CONV_FREQS, n.f));
    if (patch.l !== undefined) setLi(nearest(CONV_LS, n.l));
    if (patch.iout !== undefined) setIout(n.iout);
    onChange?.(stateOf(n));
  };

  const [vlo, vhi] = VIN_RANGE[topology];
  const total = s.losses.cond + s.losses.sw + s.losses.gate;
  const parts = [
    { name: "Conduction", w: s.losses.cond, color: "var(--brand)" },
    { name: "Switching", w: s.losses.sw, color: SECOND },
    { name: "Gate drive", w: s.losses.gate, color: "var(--ink-3)" },
  ];
  const T = 1 / x.f;
  const us = (v: number) => v * 1e6;
  const xTicks = Array.from({ length: CONV_PERIODS + 1 }, (_, k) => ({ value: k * T, label: num(us(k * T)) }));
  const iTop = niceMax((s.il + s.dI / 2) * 1.1);
  const vTop = niceMax(Math.max(vin, s.vout) * 1.1);

  return (
    <div data-widget="analog-converter" className="w-full">
      <p className="text-center text-sm leading-snug text-ink-2">
        {topology === "buck"
          ? "Buck: a switch chops the input into a square wave at the switch node; the inductor and a 22 µF capacitor smooth it to its average."
          : "Boost: the inductor charges from the input while the low switch is on; when it opens, the inductor's voltage adds to the input."}
      </p>

      {w ? (
        <div className="mt-2">
          <Caption>Inductor current over {CONV_PERIODS} switching periods</Caption>
          <Plot
            ariaLabel={`Inductor current of a ${topology} converter: average ${formatSI(s.il, "A")}, ripple ${formatSI(s.dI, "A")} peak to peak.`}
            height={170}
            x={[0, w.tEnd]}
            y={[0, iTop]}
            xTicks={xTicks}
            yTicks={[0, 0.5, 1].map((f) => ({ value: f * iTop, label: num(f * iTop) }))}
            markers={[{ y: s.il, color: "var(--ink-3)", label: "average" }]}
            series={[{ points: w.t.map((t, k) => [t, w.iL[k]] as [number, number]) }]}
            xLabel="time (µs)"
            yLabel="inductor A"
          />
          <Caption className="mt-2">Switch-node voltage</Caption>
          <Plot
            ariaLabel={`Voltage at the switch node, a square wave between 0 V and ${formatSI(topology === "buck" ? vin : s.vout, "V")}.`}
            height={140}
            x={[0, w.tEnd]}
            y={[0, vTop]}
            xTicks={xTicks}
            yTicks={[0, 0.5, 1].map((f) => ({ value: f * vTop, label: num(f * vTop) }))}
            series={[{ points: w.vSw.map((v, k) => [w.t[k], v] as [number, number]), color: SECOND }]}
            xLabel="time (µs)"
            yLabel="node V"
          />
        </div>
      ) : (
        <div className="mt-2">
          <Note tone="accent">
            The inductor current would dip below zero (ripple {num(r1(s.ripplePct))}% of the load): this is discontinuous mode, where the simple formulas stop holding. Waveforms are not drawn. A bigger inductor, a higher frequency or a heavier load brings it back.
          </Note>
        </div>
      )}

      <div className="mt-3 space-y-2">
        {!hide.includes("topology") && (
          <Seg label="Topology" value={topology} options={[{ value: "buck", label: "Buck (step down)" }, { value: "boost", label: "Boost (step up)" }]} onChange={(v) => !lock.includes("topology") && set({ topology: v })} />
        )}
        {!hide.includes("f") && (
          <Seg
            label="Switching frequency"
            value={fi}
            options={CONV_FREQS.map((f, i) => ({ value: i, label: formatSI(f, "Hz", { digits: 2 }) }))}
            onChange={(i) => !lock.includes("f") && set({ f: CONV_FREQS[i] })}
          />
        )}
        {!hide.includes("l") && (
          <Seg
            label="Inductor"
            value={li}
            options={CONV_LS.map((l, i) => ({ value: i, label: formatSI(l, "H", { digits: 2 }) }))}
            onChange={(i) => !lock.includes("l") && set({ l: CONV_LS[i] })}
          />
        )}
      </div>
      <div className="mt-1 grid gap-x-4 sm:grid-cols-2">
        {!hide.includes("vin") && (
          <Slider label="Input voltage" value={vin} min={vlo} max={vhi} step={0.1} disabled={lock.includes("vin")} format={(v) => `${v.toFixed(1)} V`} onChange={(v) => set({ vin: r3(v) })} />
        )}
        {!hide.includes("d") && (
          <Slider label="Duty cycle D" value={d} min={0.05} max={0.95} step={0.005} disabled={lock.includes("d")} format={(v) => `${(v * 100).toFixed(1)}%`} onChange={(v) => set({ d: r3(v) })} />
        )}
        {!hide.includes("iout") && (
          <Slider label="Load current" value={iout} min={0.1} max={3} step={0.1} disabled={lock.includes("iout")} format={(v) => `${v.toFixed(1)} A`} onChange={(v) => set({ iout: r3(v) })} />
        )}
      </div>

      <div className="mt-2 flex flex-wrap justify-center gap-2">
        <Readout label="Output voltage" value={formatSI(s.vout, "V")} accent />
        <Readout label="Inductor ripple" value={`${formatSI(s.dI, "A")} (${num(r1(s.ripplePct))}% of load)`} />
        <Readout label="Output ripple" value={formatSI(s.dVout, "V")} />
        <Readout label="Efficiency" value={`${s.eff.toFixed(1)}%`} accent />
      </div>

      <div className="mt-3">
        <Caption>Where the watts go: {formatSI(total, "W")} lost, {formatSI(s.pout, "W")} delivered</Caption>
        <div className="mt-1 flex h-4 w-full overflow-hidden rounded-full border border-line bg-surface-2" role="img" aria-label={`Loss breakdown: conduction ${formatSI(s.losses.cond, "W")}, switching ${formatSI(s.losses.sw, "W")}, gate drive ${formatSI(s.losses.gate, "W")}.`}>
          {parts.map((p) => (
            <div key={p.name} style={{ width: `${(p.w / total) * 100}%`, background: p.color }} />
          ))}
        </div>
        <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-2">
          {parts.map((p) => (
            <span key={p.name} className="inline-flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: p.color }} aria-hidden />
              {p.name} {formatSI(p.w, "W")}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-3">
        <ToyNote>
          Toy model: ideal switches in the waveforms, continuous conduction, a fixed {formatSI(CONV_C, "F")} output capacitor (no ESR). Typical loss constants: {formatSI(CONV_RDS, "Ω")} per switch, inductor resistance 2 mΩ per µH, 50 ns of switching overlap, 10 nC of gate charge at 5 V. Real converters differ.
        </ToyNote>
      </div>
    </div>
  );
}

/**
 * goal: { topology }, { vin }, { iout }, { vout, voutTol (fraction, default 0.02) }, { rippleMaxPct },
 * { effMin (percent) }, { noDcm: true }. In DCM every goal fails.
 */
export function checkConverter(state: unknown, goal: Record<string, unknown>) {
  const s = state as ConverterState | undefined;
  if (!s || s.dcm) return false;
  if (typeof goal.topology === "string" && s.topology !== goal.topology) return false;
  if (typeof goal.vin === "number" && Math.abs(s.vin - goal.vin) > 0.05) return false;
  if (typeof goal.iout === "number" && Math.abs(s.iout - goal.iout) > 0.05) return false;
  if (typeof goal.vout === "number" && Math.abs(s.vout - goal.vout) > (typeof goal.voutTol === "number" ? goal.voutTol : 0.02) * goal.vout) return false;
  if (typeof goal.rippleMaxPct === "number" && !(s.ripplePct <= goal.rippleMaxPct)) return false;
  if (typeof goal.effMin === "number" && !(s.eff >= goal.effMin)) return false;
  return true;
}
