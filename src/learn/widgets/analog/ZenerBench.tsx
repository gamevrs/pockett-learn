"use client";

import React, { useEffect, useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { Schematic, type WireSpec } from "../elec-kit/Schematic";
import { Note, Readout, Slider, ToyNote, formatSI } from "./ui";
import { LOAD_MAX, R_PMAX, ZENER_IZ_MIN, ZENER_PMAX, ZENER_R_VALUES, ZENER_RZ, ZENER_VZ, solveZener, worstCases, type ZenerWorst } from "./zenersim";

export interface ZenerBenchProps {
  /** Starting series resistor, ohms (snaps to an E12 value from 100 Ω to 1 kΩ). Default 470. */
  r?: number;
  /** Supply voltage, volts. Default 12. */
  vin?: number;
  /** Starting load current, mA. Default 5. */
  loadMa?: number;
  /** Lock any of these controls (a locked supply is shown as fixed text). */
  lock?: ("r" | "vin" | "load")[];
}

export interface ZenerBenchState {
  /** series resistor, ohms */
  r: number;
  vin: number;
  /** load current asked for, amps */
  iLoad: number;
  vout: number;
  /** Zener current, amps */
  iz: number;
  /** Zener power, watts */
  pz: number;
  /** series resistor power, watts */
  pr: number;
  worst: { izFullLoad: number; pzNoLoad: number; prNoLoad: number; voutFullLoad: number };
}

const nearest = (list: number[], x: number) => list.reduce((best, v, i) => (Math.abs(Math.log(v / x)) < Math.abs(Math.log(list[best] / x)) ? i : best), 0);
const mA = (a: number) => `${(a * 1000).toFixed(Math.abs(a) * 1000 < 10 ? 2 : 1)} mA`;
const mW = (w: number) => `${(w * 1000).toFixed(0)} mW`;

function make(r: number, vin: number, iLoad: number): ZenerBenchState | null {
  const s = solveZener(vin, r, iLoad);
  const w = worstCases(vin, r, LOAD_MAX);
  if (!s || !w) return null;
  return { r, vin, iLoad, vout: s.vout, iz: s.iz, pz: s.pz, pr: s.pr, worst: { izFullLoad: w.izFullLoad, pzNoLoad: w.pzNoLoad, prNoLoad: w.prNoLoad, voutFullLoad: w.voutFullLoad } };
}

/** Draws the bent ends of a Zener bar over the kit's plain diode bar (the part is at grid [gx, gy], rotated 270: anode down, cathode up). */
function ZenerBars({ gx, gy, cols, rows }: { gx: number; gy: number; cols: number; rows: number }) {
  const X = gx * 20;
  const Y = gy * 20;
  return (
    <svg viewBox={`0 0 ${cols * 20} ${rows * 20}`} className="pointer-events-none absolute inset-0 block h-full w-full" aria-hidden style={{ overflow: "visible" }}>
      <g stroke="var(--ink)" strokeWidth={2} strokeLinecap="round" fill="none">
        <path d={`M${X - 12} ${Y - 46}L${X - 12} ${Y - 40}`} />
        <path d={`M${X + 12} ${Y - 34}L${X + 12} ${Y - 40}`} />
      </g>
    </svg>
  );
}

/** Zener shunt regulator: a supply, a series resistor, a 5.1 V Zener and a load, with the currents and the worst cases. */
export function ZenerBench({ props, onChange, status, goal }: WidgetProps<ZenerBenchProps>) {
  const lock = props.lock ?? [];
  const [ri, setRi] = useState(() => nearest(ZENER_R_VALUES, props.r ?? 470));
  const [vin, setVin] = useState(props.vin ?? 12);
  const [ma, setMa] = useState(Math.round(props.loadMa ?? 5));

  const r = ZENER_R_VALUES[ri];
  const iLoad = ma / 1000;
  const sol = solveZener(vin, r, iLoad);
  const worst: ZenerWorst | null = worstCases(vin, r, LOAD_MAX);

  // report the starting state once, then every change
  useEffect(() => {
    const s = make(ZENER_R_VALUES[nearest(ZENER_R_VALUES, props.r ?? 470)], props.vin ?? 12, Math.round(props.loadMa ?? 5) / 1000);
    if (s) onChange?.(s);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const update = (nri: number, nvin: number, nma: number) => {
    setRi(nri);
    setVin(nvin);
    setMa(nma);
    const s = make(ZENER_R_VALUES[nri], nvin, nma / 1000);
    if (s) onChange?.(s);
  };

  if (!sol || !worst) return <Note>The simulation could not run with these values.</Note>;

  const COLS = 18;
  const ROWS = 9;
  const hasLoad = iLoad > 0;
  const wires: WireSpec[] = [
    { points: ["B1.a", "R1.a"], flow: sol.ir * 1000 },
    { points: ["R1.b", [9, 2]], flow: sol.ir * 1000 },
    ...(hasLoad ? [{ points: [[9, 2], "RL.a"], flow: sol.iload * 1000 } as WireSpec] : []),
    { points: [[9, 2], "Z1.b"], flow: sol.iz * 1000 },
    { points: ["Z1.a", [9, 7]], flow: sol.iz * 1000 },
    ...(hasLoad ? [{ points: ["RL.b", [14, 7], [9, 7]], flow: sol.iload * 1000 } as WireSpec] : []),
    { points: [[9, 7], [2, 7], "B1.b"], flow: sol.ir * 1000 },
  ];

  // after a wrong Check or a reveal, say which of the question's limits this resistor misses
  const g = (goal ?? {}) as Record<string, unknown>;
  const misses: string[] = [];
  if (status === "wrong" || status === "revealed") {
    if (typeof g.izMinFull === "number" && !(worst.izFullLoad >= g.izMinFull)) misses.push(`At full load the Zener carries only ${mA(worst.izFullLoad)}, under the ${mA(g.izMinFull)} it needs to keep regulating.`);
    if (typeof g.pzMaxNoLoad === "number" && !(worst.pzNoLoad <= g.pzMaxNoLoad)) misses.push(`With no load the Zener dissipates ${mW(worst.pzNoLoad)}, over its ${mW(g.pzMaxNoLoad)} rating.`);
    if (typeof g.prMax === "number" && !(worst.prNoLoad <= g.prMax)) misses.push(`With no load the resistor dissipates ${mW(worst.prNoLoad)}, over its ${mW(g.prMax)} rating.`);
  }

  return (
    <div data-widget="analog-zener" className="w-full">
      <div className="relative mx-auto max-w-[460px]">
        <Schematic
          cols={COLS}
          rows={ROWS}
          className="block w-full"
          flowRef={40}
          ariaLabel={`A ${vin} volt supply feeds a ${formatSI(r, "Ω")} resistor. At the output node a ${ZENER_VZ} volt Zener diode runs to ground, with its cathode on the output side${hasLoad ? `, and a load drawing ${ma} milliamps` : ", and nothing else connected (no load)"}. Output ${sol.vout.toFixed(2)} volts, Zener current ${mA(sol.iz)}.`}
          parts={[
            { kind: "dc-source", id: "B1", at: [2, 2], rot: 90, label: "Vin", value: `${vin} V` },
            { kind: "resistor", id: "R1", at: [4, 2], label: "R1", value: formatSI(r, "Ω") },
            { kind: "diode", id: "Z1", at: [9, 6], rot: 270, label: "Z1", value: `${ZENER_VZ} V` },
            ...(hasLoad ? [{ kind: "resistor" as const, id: "RL", at: [14, 2] as [number, number], rot: 90 as const, label: "Load", value: `${ma} mA` }] : []),
            { kind: "ground", id: "G1", at: [9, 7] },
          ]}
          wires={wires}
          texts={[{ at: [9.4, 1.55], text: "out", anchor: "start", muted: true }]}
        />
        <ZenerBars gx={9} gy={6} cols={COLS} rows={ROWS} />
      </div>

      <div className="mt-1 grid gap-x-4 sm:grid-cols-2">
        <Slider label="Series resistor R1" value={ri} min={0} max={ZENER_R_VALUES.length - 1} disabled={lock.includes("r")} format={(k) => formatSI(ZENER_R_VALUES[k], "Ω")} onChange={(k) => update(k, vin, ma)} />
        <Slider label="Load current" value={ma} min={0} max={LOAD_MAX * 1000} disabled={lock.includes("load")} format={(v) => (v === 0 ? "no load" : `${v} mA`)} onChange={(v) => update(ri, vin, v)} />
        {lock.includes("vin") ? (
          <p className="text-xs text-ink-3 sm:col-span-2">Supply fixed at {vin} V.</p>
        ) : (
          <Slider className="sm:col-span-2" label="Supply voltage Vin" value={vin} min={6} max={15} step={0.5} format={(v) => `${v.toFixed(1)} V`} onChange={(v) => update(ri, v, ma)} />
        )}
      </div>

      <div className="mt-2 flex flex-wrap justify-center gap-2">
        <Readout label="Vout" value={`${sol.vout.toFixed(2)} V`} accent />
        <Readout label="Resistor current" value={mA(sol.ir)} />
        <Readout label="Zener current" value={mA(sol.iz)} accent />
        <Readout label="Zener power" value={mW(sol.pz)} />
        <Readout label="Resistor power" value={mW(sol.pr)} />
      </div>

      <p className="mt-2 text-center text-sm leading-snug text-ink-2" role="status">
        {sol.regulating
          ? `The Zener is conducting, so the output is held near ${ZENER_VZ} V. The resistor current ${mA(sol.ir)} splits into ${mA(sol.iz)} through the Zener and ${mA(sol.iload)} through the load.`
          : `The Zener is not conducting: the output (${sol.vout.toFixed(2)} V) is below ${ZENER_VZ} V, so nothing is being held. The supply, the resistor and the load simply form a voltage divider.`}
      </p>

      <div className="mt-3 overflow-x-auto">
        <table className="mx-auto w-full max-w-[460px] border-collapse text-center text-xs text-ink-2">
          <caption className="pb-1 text-left text-xs text-ink-3">Worst cases for this resistor (typical limits: Zener {ZENER_PMAX * 1000} mW, resistor {R_PMAX * 1000} mW, Zener wants at least {ZENER_IZ_MIN * 1000} mA)</caption>
          <thead>
            <tr className="text-ink-3">
              <th scope="col" className="border border-line px-2 py-1 text-left font-medium">Case</th>
              <th scope="col" className="border border-line px-2 py-1 font-medium">Zener</th>
              <th scope="col" className="border border-line px-2 py-1 font-medium">Also</th>
            </tr>
          </thead>
          <tbody className="font-mono tabular-nums text-ink">
            <tr>
              <th scope="row" className="border border-line px-2 py-1 text-left font-medium text-ink-2">No load</th>
              <td className="border border-line px-2 py-1">power {mW(worst.pzNoLoad)}</td>
              <td className="border border-line px-2 py-1">resistor power {mW(worst.prNoLoad)}</td>
            </tr>
            <tr>
              <th scope="row" className="border border-line px-2 py-1 text-left font-medium text-ink-2">Full load ({LOAD_MAX * 1000} mA)</th>
              <td className="border border-line px-2 py-1">current {mA(worst.izFullLoad)}</td>
              <td className="border border-line px-2 py-1">Vout {worst.voutFullLoad.toFixed(2)} V</td>
            </tr>
          </tbody>
        </table>
      </div>

      {misses.length > 0 && (
        <div className="mt-3 space-y-1">
          {misses.map((m) => (
            <Note key={m}>{m}</Note>
          ))}
        </div>
      )}

      <div className="mt-3">
        <ToyNote>
          Toy model: the Zener is an ideal piecewise clamp that conducts above {ZENER_VZ} V with {ZENER_RZ} Ω of dynamic resistance (typical small parts are about 10 to 40 Ω), with no tolerance (real ones are typically ±5%), no knee and no temperature effects. The load is a resistor sized to draw the chosen current at {ZENER_VZ} V.
        </ToyNote>
      </div>
    </div>
  );
}

/** goal: { izMinFull, pzMaxNoLoad, prMax } (worst cases), { r } exact ohms, { vin } volts. */
export function checkZener(state: unknown, goal: Record<string, unknown>) {
  const s = state as ZenerBenchState | undefined;
  if (!s || !s.worst) return false;
  if (typeof goal.izMinFull === "number" && !(s.worst.izFullLoad >= goal.izMinFull)) return false;
  if (typeof goal.pzMaxNoLoad === "number" && !(s.worst.pzNoLoad <= goal.pzMaxNoLoad)) return false;
  if (typeof goal.prMax === "number" && !(s.worst.prNoLoad <= goal.prMax)) return false;
  if (typeof goal.r === "number" && Math.abs(s.r - goal.r) > 1e-6) return false;
  if (typeof goal.vin === "number" && Math.abs(s.vin - goal.vin) > 1e-6) return false;
  return true;
}
