"use client";

import React, { useMemo, useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { Schematic, type WireSpec } from "../elec-kit/Schematic";
import { Btn, Caption, Note, Plot, Readout, Seg, Slider, ToyNote, formatSI } from "./ui";
import { RL_CLOSED_TAUS, RL_L_VALUES, RL_ROPEN_VALUES, RL_R_VALUES, RL_VF, RL_VS, niceMax, rlOpen, rlRise } from "./rlsim";

export interface RlBenchProps {
  /** Starting inductance, henries (snaps to a slider stop). Default 0.1. */
  l?: number;
  /** Starting winding resistance, ohms. Default 470. */
  r?: number;
  /** Start with the flyback diode fitted. Default false. */
  diode?: boolean;
  /** Stand-in resistance across the opening switch, ohms. Default 10 000. */
  ropen?: number;
  /** Lock any of these controls. */
  lock?: ("l" | "r" | "diode" | "ropen")[];
}

export interface RlBenchState {
  diode: boolean;
  l: number;
  r: number;
  /** τ = L / R, seconds */
  tau: number;
  /** peak voltage across the opening switch */
  peakV: number;
  vs: number;
  ropen: number;
  /** is the switch shown open in the schematic */
  open: boolean;
  /** final current V / R, amps */
  iFinal: number;
}

const SUPPLY = "var(--ink-2)";
const nearest = (list: number[], x: number) => list.reduce((best, v, i) => (Math.abs(Math.log(v / x)) < Math.abs(Math.log(list[best] / x)) ? i : best), 0);
/** bare number for axis ticks: three significant digits, no trailing zeros */
const num = (x: number) => String(Number(x.toPrecision(3)));

/** RL circuit with a switch and an optional flyback diode: the coil current rises, then the switch opens and the voltage spikes. */
export function RlBench({ props, onChange }: WidgetProps<RlBenchProps>) {
  const lock = props.lock ?? [];
  const [li, setLi] = useState(() => nearest(RL_L_VALUES, props.l ?? 0.1));
  const [ri, setRi] = useState(() => nearest(RL_R_VALUES, props.r ?? 470));
  const [oi, setOi] = useState(() => nearest(RL_ROPEN_VALUES, props.ropen ?? 10000));
  const [diode, setDiode] = useState(props.diode ?? false);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"v" | "i">("v");

  const l = RL_L_VALUES[li];
  const r = RL_R_VALUES[ri];
  const ropen = RL_ROPEN_VALUES[oi];
  const rise = useMemo(() => rlRise(l, r), [l, r]);
  const op = useMemo(() => (rise ? rlOpen(l, r, rise.iOpen, diode, ropen) : null), [l, r, rise, diode, ropen]);

  const report = (nl: number, nr: number, nd: boolean, nro: number, nopen: boolean) => {
    const ru = rlRise(nl, nr);
    const o = ru ? rlOpen(nl, nr, ru.iOpen, nd, nro) : null;
    onChange?.({ diode: nd, l: nl, r: nr, tau: nl / nr, peakV: o ? o.peak : NaN, vs: RL_VS, ropen: nro, open: nopen, iFinal: RL_VS / nr } satisfies RlBenchState);
  };
  const setAll = (nli: number, nri: number, nd: boolean, noi: number, nopen: boolean) => {
    setLi(nli);
    setRi(nri);
    setDiode(nd);
    setOi(noi);
    setOpen(nopen);
    report(RL_L_VALUES[nli], RL_R_VALUES[nri], nd, RL_ROPEN_VALUES[noi], nopen);
  };

  if (!rise || !op) return <Note>The simulation could not run with these values.</Note>;

  const tau = rise.tau;
  const iFinal = rise.iFinal;
  const energy = 0.5 * l * iFinal * iFinal;
  const circulating = open && diode;
  const coilFlow = !open || circulating ? 1 : 0;
  const wires: WireSpec[] = [
    { points: ["B1.a", "S1.a"], flow: open ? 0 : 1 },
    { points: ["S1.b", "L1.a"], flow: coilFlow },
    { points: ["L1.b", "Rw.a"], flow: coilFlow },
    { points: ["Rw.b", [14, 7], [7, 7]], flow: coilFlow },
    { points: [[7, 7], [2, 7], "B1.b"], flow: open ? 0 : 1 },
    ...(diode
      ? [
          { points: [[7, 7], "D1.a"], flow: circulating ? 1 : 0 },
          { points: ["D1.b", "S1.b"], flow: circulating ? 1 : 0 },
        ]
      : []),
  ] as WireSpec[];

  // zoomed time axis for the open phase
  const unit = op.tEnd < 1e-3 ? { s: 1e6, name: "µs" } : { s: 1e3, name: "ms" };
  const xTicksB = [0, 0.25, 0.5, 0.75, 1].map((f) => ({ value: f * op.tEnd, label: num(f * op.tEnd * unit.s) }));
  const iMaxA = niceMax(rise.iOpen * 1.05 * 1000);
  const iRiseMax = niceMax(iFinal * 1.05 * 1000);
  const peakShown = niceMax(Math.max(op.peak, RL_VS) * 1.05);
  const tRelease = diode ? (l / r) * Math.log(1 + (r * rise.iOpen) / RL_VF) : 0;

  return (
    <div data-widget="analog-rl" className="w-full">
      <div className="mx-auto max-w-[460px]">
        <Schematic
          cols={18}
          rows={9}
          ariaLabel={`A ${RL_VS} volt battery and a switch feed a relay coil: ${formatSI(l, "H")} of inductance in series with ${formatSI(r, "Ω")} of winding resistance${diode ? ", with a flyback diode across the coil, cathode to the positive side" : ", with no flyback diode"}. The switch is ${open ? "open" : "closed"}.`}
          parts={[
            { kind: "battery", id: "B1", at: [2, 2], rot: 90, label: "B1", value: `${RL_VS} V` },
            { kind: "switch", id: "S1", at: [4, 2], label: "S1", closed: !open },
            { kind: "inductor", id: "L1", at: [9, 2], label: "coil L", value: formatSI(l, "H") },
            { kind: "resistor", id: "Rw", at: [14, 2], rot: 90, label: "Rw", value: formatSI(r, "Ω") },
            ...(diode ? [{ kind: "diode" as const, id: "D1", at: [7, 6] as [number, number], rot: 270 as const, label: "D1" }] : []),
          ]}
          wires={wires}
          texts={diode ? [{ at: [6.5, 3.2], text: "K", anchor: "end", muted: true }] : []}
        />
      </div>
      <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
        <Caption>Switch</Caption>
        <Seg label="Switch position in the drawing" value={open ? "open" : "closed"} options={[{ value: "closed", label: "Closed" }, { value: "open", label: "Open" }]} onChange={(v) => setAll(li, ri, diode, oi, v === "open")} />
      </div>
      <p className="mt-1 text-center text-xs text-ink-3">
        {!open
          ? "Switch closed: the battery pushes current through the coil."
          : diode
            ? "Switch open: the coil's current keeps going round the loop through the diode."
            : "Switch open: the coil's current has nowhere to go."}
      </p>

      <div className="mt-3">
        <Caption>Switch closed for {RL_CLOSED_TAUS}τ: the coil current climbs</Caption>
        <Plot
          ariaLabel={`Coil current rising after the switch closes. Time constant ${formatSI(tau, "s")}; it heads for ${formatSI(iFinal, "A")}.`}
          x={[0, RL_CLOSED_TAUS * tau]}
          y={[0, iRiseMax]}
          xTicks={[1, 2, 3, 4, 5].map((k) => ({ value: k * tau, label: `${k}τ` }))}
          yTicks={[0, 0.5, 1].map((f) => ({ value: f * iRiseMax, label: num(f * iRiseMax) }))}
          markers={[
            ...[1, 2, 3, 4].map((k) => ({ x: k * tau, color: "var(--ink-3)" })),
            { y: 0.632 * iFinal * 1000, color: "var(--ink-2)", label: "63.2%" },
          ]}
          series={[{ points: rise.t.map((t, k) => [t, rise.i[k] * 1000] as [number, number]) }]}
          xLabel={`time (1τ = L ÷ R = ${formatSI(tau, "s")})`}
          yLabel="coil mA"
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Caption>Then the switch opens (zoomed in)</Caption>
        <Seg label="What to plot after the switch opens" value={view} options={[{ value: "v", label: "Voltage at the switch" }, { value: "i", label: "Coil current" }]} onChange={setView} />
      </div>
      <Plot
        ariaLabel={
          view === "v"
            ? `Voltage across the opening switch. Peak ${formatSI(op.peak, "V")}${diode ? ", clamped by the flyback diode" : " with no flyback diode"}.`
            : `Coil current after the switch opens, falling from ${formatSI(rise.iOpen, "A")}.`
        }
        x={[0, op.tEnd]}
        y={view === "v" ? [0, peakShown] : [0, iMaxA]}
        xTicks={xTicksB}
        yTicks={view === "v" ? [0, 0.5, 1].map((f) => ({ value: f * peakShown, label: num(f * peakShown) })) : [0, 0.5, 1].map((f) => ({ value: f * iMaxA, label: num(f * iMaxA) }))}
        markers={view === "v" ? [{ y: RL_VS, color: SUPPLY, label: `${RL_VS} V supply` }] : []}
        series={[
          view === "v"
            ? { points: op.t.map((t, k) => [t, op.vSwitch[k]] as [number, number]) }
            : { points: op.t.map((t, k) => [t, op.iCoil[k] * 1000] as [number, number]) },
        ]}
        xLabel={`time since opening (${unit.name})`}
        yLabel={view === "v" ? "switch volts" : "coil mA"}
      />

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Btn on={diode} disabled={lock.includes("diode")} onClick={() => setAll(li, ri, !diode, oi, open)}>
          {diode ? "Flyback diode fitted" : "No flyback diode"}
        </Btn>
      </div>
      <div className="mt-1 grid gap-x-4 sm:grid-cols-2">
        <Slider label="Coil inductance L" value={li} min={0} max={RL_L_VALUES.length - 1} disabled={lock.includes("l")} format={(k) => formatSI(RL_L_VALUES[k], "H")} onChange={(k) => setAll(k, ri, diode, oi, open)} />
        <Slider label="Winding resistance R" value={ri} min={0} max={RL_R_VALUES.length - 1} disabled={lock.includes("r")} format={(k) => formatSI(RL_R_VALUES[k], "Ω")} onChange={(k) => setAll(li, k, diode, oi, open)} />
        {!diode && (
          <Slider
            className="sm:col-span-2"
            label="Stand-in resistance across the opening switch (sets the toy's spike height)"
            value={oi}
            min={0}
            max={RL_ROPEN_VALUES.length - 1}
            disabled={lock.includes("ropen")}
            format={(k) => formatSI(RL_ROPEN_VALUES[k], "Ω")}
            onChange={(k) => setAll(li, ri, diode, k, open)}
          />
        )}
      </div>

      <div className="mt-2 flex flex-wrap justify-center gap-2">
        <Readout label="τ = L ÷ R" value={formatSI(tau, "s")} accent />
        <Readout label="Final current V ÷ R" value={formatSI(iFinal, "A")} />
        <Readout label="Stored energy ½LI²" value={formatSI(energy, "J")} />
        <Readout label="Peak at the switch" value={formatSI(op.peak, "V")} accent />
      </div>

      <p className={`mt-2 text-center text-sm leading-snug ${!diode && op.peak > 100 ? "font-semibold text-bad" : "text-ink-2"}`} role="status">
        {diode
          ? `With the diode the voltage at the switch stays near ${RL_VS} V + ${RL_VF} V = ${(RL_VS + RL_VF).toFixed(1)} V, and the current dies away in about ${formatSI(tRelease, "s")} (a slower release than without).`
          : `With no diode the voltage at the switch spikes to ${formatSI(op.peak, "V")}, and the current is gone within about ${formatSI(op.tEnd, "s")}. In this toy that height is the coil current times the ${formatSI(ropen, "Ω")} stand-in. Real spikes are held down by an arc across the contacts, a transistor breaking down or stray capacitance.`}
      </p>

      <div className="mt-3">
        <ToyNote>Toy model: an ideal inductor and a perfect battery and switch. The opening switch is modelled as a closed switch plus a stand-in resistor, and the diode as a fixed {RL_VF} V drop (typical).</ToyNote>
      </div>
    </div>
  );
}

/** goal: { diode }, { peakVMax }, { peakVMin }, { tau, tol }, { l }, { r }, { open }. */
export function checkRlBench(state: unknown, goal: Record<string, unknown>) {
  const s = state as RlBenchState | undefined;
  if (!s) return false;
  if (typeof goal.diode === "boolean" && s.diode !== goal.diode) return false;
  if (typeof goal.peakVMax === "number" && !(s.peakV <= goal.peakVMax)) return false;
  if (typeof goal.peakVMin === "number" && !(s.peakV >= goal.peakVMin)) return false;
  if (typeof goal.tau === "number" && Math.abs(s.tau - goal.tau) > (typeof goal.tol === "number" ? goal.tol : 0.05) * goal.tau) return false;
  if (typeof goal.l === "number" && Math.abs(s.l - goal.l) > 1e-6) return false;
  if (typeof goal.r === "number" && Math.abs(s.r - goal.r) > 1e-6) return false;
  if (typeof goal.open === "boolean" && s.open !== goal.open) return false;
  return true;
}
