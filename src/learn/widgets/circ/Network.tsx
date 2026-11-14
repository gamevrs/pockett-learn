"use client";

import React, { useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import type { PartSpec, WireSpec } from "../elec-kit/Schematic";
import { network, type NetResult, type Topology } from "./logic";
import { Note, Readout, Seg, Sch, Slider, ToyNote, amps, ohms, volts, watts } from "./ui";

const VALUES = [100, 220, 330, 470, 1000, 2200, 4700, 10000];

export interface NetworkProps {
  topology?: Topology;
  /** Starting resistor values, ohms (2 to 4 of them). */
  values?: number[];
  volts?: number;
  /** Keep the arrangement fixed (the learner only changes values and count). */
  lockTopology?: boolean;
  /** Keep the number of resistors fixed. */
  lockCount?: boolean;
  /** Keep the values fixed (the learner only changes the arrangement and count). */
  lockValues?: boolean;
}

export interface NetworkState extends NetResult {
  topology: Topology;
  rs: number[];
  volts: number;
  count: number;
}

/** goal: { topology }, { count }, { minR, maxR } for the total resistance, { minI, maxI } for the battery current. */
export function checkNetwork(state: unknown, goal: Record<string, unknown>) {
  const s = state as NetworkState | undefined;
  if (!s) return false;
  const g = goal as { topology?: string; count?: number; minR?: number; maxR?: number; minI?: number; maxI?: number };
  if (g.topology !== undefined && s.topology !== g.topology) return false;
  if (g.count !== undefined && s.count !== g.count) return false;
  if (g.minR !== undefined && s.rTotal < g.minR) return false;
  if (g.maxR !== undefined && s.rTotal > g.maxR) return false;
  if (g.minI !== undefined && s.iTotal < g.minI) return false;
  if (g.maxI !== undefined && s.iTotal > g.maxI) return false;
  return true;
}

function layout(topology: Topology, rs: number[], res: NetResult, volts_: number): { parts: PartSpec[]; wires: WireSpec[]; cols: number; rows: number } {
  const n = rs.length;
  const f = (x: number) => Math.sqrt(Math.abs(x));
  const parts: PartSpec[] = [{ kind: "battery", id: "B1", at: [2, 3], rot: 90, label: volts(volts_) }];
  const wires: WireSpec[] = [];
  if (topology === "series") {
    const xs = rs.map((_, k) => 4 + 3 * k);
    rs.forEach((r, k) => parts.push({ kind: "resistor", id: `R${k + 1}`, at: [xs[k], 2], label: `R${k + 1}`, value: ohms(r) }));
    const end = xs[n - 1] + 3;
    const flow = f(res.iTotal);
    wires.push({ points: ["B1.a", [2, 2], "R1.a"], flow });
    wires.push({ points: [`R${n}.b`, [end, 7], [2, 7], "B1.b"], flow });
    return { parts, wires, cols: end + 2, rows: 9 };
  }
  const xs = rs.map((_, k) => 5 + 3 * k);
  const last = xs[n - 1];
  // with three or four branches the value text would run into the next resistor: the table below carries the values then
  rs.forEach((r, k) => parts.push({ kind: "resistor", id: `R${k + 1}`, at: [xs[k], 3], rot: 90, label: `R${k + 1}`, value: n <= 2 ? ohms(r) : undefined }));
  // rails in segments so the dots slow down as current peels off into each branch
  let left = res.iTotal;
  const topPts: [number, number][] = [[2, 2], [xs[0], 2]];
  wires.push({ points: ["B1.a", ...topPts], flow: f(left) });
  rs.forEach((_, k) => {
    const ik = res.each[k].i;
    left -= ik;
    if (k + 1 < n) wires.push({ points: [[xs[k], 2], [xs[k + 1], 2]], flow: f(left) });
    wires.push({ points: [[xs[k], 2], `R${k + 1}.a`], flow: f(ik) });
    wires.push({ points: [`R${k + 1}.b`, [xs[k], 7]], flow: f(ik) });
  });
  wires.push({ points: [[xs[0], 7], [2, 7], "B1.b"], flow: f(res.iTotal) });
  for (let k = 0; k + 1 < n; k++) {
    // the bottom rail between branch k and k+1 carries what the branches to its right return
    const returning = res.each.slice(k + 1).reduce((s, e) => s + e.i, 0);
    wires.push({ points: [[xs[k + 1], 7], [xs[k], 7]], flow: f(returning) });
  }
  return { parts, wires, cols: last + 4, rows: 9 };
}

/** Build a network of 1 to 4 resistors in series or in parallel and see the total resistance, the current split and the voltage shares. */
export function Network({ props, onChange }: WidgetProps<NetworkProps>) {
  const [topology, setTopology] = useState<Topology>(props.topology ?? "series");
  const [rs, setRs] = useState<number[]>(props.values ?? [470, 470]);
  const [vb, setVb] = useState(props.volts ?? 9);

  const make = (t: Topology, r: number[], v: number): NetworkState => ({ ...network(t, r, v), topology: t, rs: r, volts: v, count: r.length });
  const st = make(topology, rs, vb);
  const emit = (t: Topology, r: number[], v: number) => onChange?.(make(t, r, v));
  const lay = layout(topology, rs, st, vb);
  const flowRef = Math.sqrt(vb / Math.min(...rs));

  const setCount = (c: number) => {
    const next = rs.slice(0, c);
    while (next.length < c) next.push(next[next.length - 1] ?? 470);
    setRs(next);
    emit(topology, next, vb);
  };
  const setVal = (k: number, v: number) => {
    const next = rs.map((x, i) => (i === k ? v : x));
    setRs(next);
    emit(topology, next, vb);
  };

  const formula =
    topology === "series"
      ? `R = ${rs.map((r) => ohms(r)).join(" + ")} = ${ohms(st.rTotal)}`
      : `1/R = ${rs.map((r) => `1/${ohms(r)}`).join(" + ")}, so R = ${ohms(st.rTotal)}`;

  return (
    <div className="w-full">
      <div className="flex flex-wrap items-center justify-center gap-2">
        {!props.lockTopology && (
          <Seg
            label="Arrangement"
            value={topology}
            options={[
              { value: "series", label: "In series" },
              { value: "parallel", label: "In parallel" },
            ]}
            onChange={(t) => {
              setTopology(t);
              emit(t, rs, vb);
            }}
          />
        )}
        {!props.lockCount && (
          <Seg label="Number of resistors" value={rs.length} options={[2, 3, 4].map((c) => ({ value: c, label: `${c} resistors` }))} onChange={setCount} />
        )}
      </div>
      <div className="mt-2">
        <Sch
          cols={lay.cols}
          rows={lay.rows}
          flowRef={flowRef}
          ariaLabel={`A ${volts(vb)} battery with ${rs.length} resistors in ${topology}. Total resistance ${ohms(st.rTotal)}, battery current ${amps(st.iTotal)}.`}
          parts={lay.parts}
          wires={lay.wires}
        />
      </div>
      <div className="mt-1 flex flex-wrap justify-center gap-2">
        <Readout label="Total resistance" value={ohms(st.rTotal)} accent />
        <Readout label="Battery current" value={amps(st.iTotal)} />
      </div>
      <p className="mt-2 text-center font-mono text-xs text-ink-2 sm:text-sm" aria-live="polite">
        {formula}
      </p>
      <div className="mt-3 grid grid-cols-[minmax(0,auto)_1fr_1fr_1fr] gap-x-3 gap-y-1 rounded-xl border border-line bg-surface-2 px-3 py-2 text-sm">
        <span className="text-xs text-ink-3">Part</span>
        <span className="text-xs text-ink-3">Volts across</span>
        <span className="text-xs text-ink-3">Current through</span>
        <span className="text-xs text-ink-3">Heat</span>
        {rs.map((r, k) => (
          <React.Fragment key={k}>
            <span className="font-mono text-ink">R{k + 1} <span className="text-ink-3">{ohms(r)}</span></span>
            <span className="font-mono tabular-nums text-ink">{volts(st.each[k].v)}</span>
            <span className="font-mono tabular-nums text-ink">{amps(st.each[k].i)}</span>
            <span className="font-mono tabular-nums text-ink">{watts(st.each[k].p)}</span>
          </React.Fragment>
        ))}
      </div>
      {!props.lockValues && (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {rs.map((r, k) => (
            <label key={k} className="flex items-center justify-between gap-2 rounded-xl border border-line bg-surface px-3">
              <span className="text-sm text-ink-2">R{k + 1}</span>
              <select
                value={r}
                onChange={(e) => setVal(k, Number(e.target.value))}
                aria-label={`Value of R${k + 1}`}
                className="min-h-10 flex-1 bg-transparent text-right font-mono text-sm text-ink outline-none"
              >
                {VALUES.map((v) => (
                  <option key={v} value={v}>
                    {ohms(v)}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
      )}
      <div className="mt-2">
        <Slider label="Battery voltage" value={vb} min={1} max={12} step={1} onChange={(v) => { setVb(v); emit(topology, rs, v); }} format={volts} />
      </div>
      <div className="mt-1">
        <Note>
          {topology === "series"
            ? "In series there is one path: every resistor carries the same current and the voltages add up to the battery's."
            : "In parallel every branch sits across the battery: each gets the full voltage and the currents add up."}
        </Note>
      </div>
      <ToyNote />
    </div>
  );
}
