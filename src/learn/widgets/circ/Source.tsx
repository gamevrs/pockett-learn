"use client";

import React, { useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { benchUnderLoad, cellUnderLoad } from "./logic";
import { Note, Readout, Sch, Seg, Slider, ToyNote, amps, ohms, volts, watts } from "./ui";

const CELLS = [
  { id: "aa", label: "Fresh AA", voc: 1.5, ri: 0.2 },
  { id: "worn", label: "Tired AA", voc: 1.4, ri: 1.5 },
  { id: "coin", label: "Coin cell", voc: 3, ri: 15 },
] as const;

const LOADS = [1, 2.2, 4.7, 10, 22, 47, 100, 470, 1000, 10000];

export interface SourceProps {
  /** A battery with internal resistance, or a bench supply with a current limit. */
  kind?: "cell" | "bench";
  cell?: (typeof CELLS)[number]["id"];
  load?: number;
  /** Bench supply: the voltage you set, and its current limit. */
  vset?: number;
  limit?: number;
}

export interface SourceState {
  kind: "cell" | "bench";
  cell: string;
  load: number;
  /** voltage at the terminals under this load */
  vTerm: number;
  amps: number;
  /** open-circuit (no-load) voltage or set voltage */
  voc: number;
  /** watts lost inside the source (cell only) */
  lost: number;
  mode: "CV" | "CC" | "cell";
}

/** goal: { minV, maxV } terminal volts, { minI, maxI } amps, { mode: "CC" | "CV" }, { cell }. */
export function checkSource(state: unknown, goal: Record<string, unknown>) {
  const s = state as SourceState | undefined;
  if (!s) return false;
  const g = goal as { minV?: number; maxV?: number; minI?: number; maxI?: number; mode?: string; cell?: string; minLoad?: number; maxLoad?: number };
  if (g.minV !== undefined && s.vTerm < g.minV) return false;
  if (g.maxV !== undefined && s.vTerm > g.maxV) return false;
  if (g.minI !== undefined && s.amps < g.minI) return false;
  if (g.maxI !== undefined && s.amps > g.maxI) return false;
  if (g.mode !== undefined && s.mode !== g.mode) return false;
  if (g.cell !== undefined && s.cell !== g.cell) return false;
  if (g.minLoad !== undefined && s.load < g.minLoad) return false;
  if (g.maxLoad !== undefined && s.load > g.maxLoad) return false;
  return true;
}

/** Real sources are not ideal: a cell has a resistance inside, so its terminal voltage sags when the load pulls current; a bench supply caps the current instead. */
export function Source({ props, onChange }: WidgetProps<SourceProps>) {
  const kind = props.kind ?? "cell";
  const [cellId, setCellId] = useState<string>(props.cell ?? "aa");
  const [load, setLoad] = useState(props.load ?? 100);
  const vset = props.vset ?? 5;
  const limit = props.limit ?? 0.5;
  const cell = CELLS.find((c) => c.id === cellId) ?? CELLS[0];

  const make = (c: (typeof CELLS)[number], rl: number): SourceState => {
    if (kind === "bench") {
      const b = benchUnderLoad(vset, limit, rl);
      return { kind, cell: "", load: rl, vTerm: b.v, amps: b.i, voc: vset, lost: 0, mode: b.mode };
    }
    const u = cellUnderLoad(c.voc, c.ri, rl);
    return { kind, cell: c.id, load: rl, vTerm: u.vTerminal, amps: u.i, voc: c.voc, lost: u.lost, mode: "cell" };
  };
  const st = make(cell, load);
  const emit = (c: (typeof CELLS)[number], rl: number) => onChange?.(make(c, rl));

  const flow = Math.sqrt(st.amps);
  const flowRef = Math.sqrt(kind === "bench" ? limit : 1.5 / 1);

  // load-line plot: terminal voltage against current
  const W = 360;
  const H = 150;
  const L = 44;
  const R = 12;
  const T = 14;
  const B = 34;
  const iMax = kind === "bench" ? limit * 1.6 : cell.voc / cell.ri;
  const vMax = kind === "bench" ? vset : cell.voc;
  const px = (i: number) => L + (i / iMax) * (W - L - R);
  const py = (v: number) => H - B - (v / vMax) * (H - B - T);
  const curve =
    kind === "bench"
      ? `M${px(0)} ${py(vset)} L${px(limit)} ${py(vset)} L${px(limit)} ${py(0)}`
      : `M${px(0)} ${py(cell.voc)} L${px(iMax)} ${py(0)}`;

  const bench = kind === "bench";

  return (
    <div className="w-full">
      {!bench && (
        <div className="mb-2 flex justify-center">
          <Seg
            label="Battery"
            value={cellId}
            options={CELLS.map((c) => ({ value: c.id, label: c.label }))}
            onChange={(id) => {
              setCellId(id);
              emit(CELLS.find((c) => c.id === id) ?? CELLS[0], load);
            }}
          />
        </div>
      )}
      <Sch
        cols={18}
        rows={bench ? 9 : 10}
        flowRef={flowRef}
        ariaLabel={bench ? `A bench supply set to ${volts(vset)} with a ${amps(limit)} limit feeds a ${ohms(load)} load: ${amps(st.amps)} at ${volts(st.vTerm)} (${st.mode}).` : `A ${cell.label} (${volts(cell.voc)} with ${ohms(cell.ri)} inside) feeds a ${ohms(load)} load. Terminal voltage ${volts(st.vTerm)}, current ${amps(st.amps)}.`}
        parts={
          bench
            ? [
                { kind: "dc-source", id: "B1", at: [3, 3], rot: 90, label: "Supply", value: volts(vset) },
                { kind: "resistor", id: "RL", at: [14, 3], rot: 90, label: "Load", value: ohms(load) },
              ]
            : [
                { kind: "battery", id: "B1", at: [3, 3], rot: 90, label: "Ideal cell", value: volts(cell.voc) },
                { kind: "resistor", id: "RI", at: [6, 2], label: "Ri (inside)", value: ohms(cell.ri) },
                { kind: "resistor", id: "RL", at: [14, 3], rot: 90, label: "Load", value: ohms(load) },
              ]
        }
        wires={
          bench
            ? [
                { points: ["B1.a", [3, 2], [14, 2], "RL.a"], flow },
                { points: ["RL.b", [14, 7], [3, 7], "B1.b"], flow },
              ]
            : [
                { points: ["B1.a", [3, 2], "RI.a"], flow },
                { points: ["RI.b", [14, 2], "RL.a"], flow },
                { points: ["RL.b", [14, 7], [3, 7], "B1.b"], flow },
              ]
        }
        overlay={
          bench ? undefined : (
            <g>
              <rect x={22} y={8} width={176} height={156} rx={10} fill="none" stroke="var(--ink-3)" strokeWidth={2} strokeDasharray="5 4" />
              <text x={110} y={186} textAnchor="middle" fontSize={14} fill="var(--ink-2)">
                the battery
              </text>
            </g>
          )
        }
      />
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-1 w-full" role="img" aria-label={`Terminal voltage against current. Now ${volts(st.vTerm)} at ${amps(st.amps)}.`}>
        <line x1={L} y1={H - B} x2={W - R} y2={H - B} stroke="var(--line-strong)" />
        <line x1={L} y1={T} x2={L} y2={H - B} stroke="var(--line-strong)" />
        <path d={curve} fill="none" stroke="var(--ink-3)" strokeWidth={2.5} />
        <circle cx={px(Math.min(st.amps, iMax))} cy={py(st.vTerm)} r={7} fill="var(--brand)" stroke="var(--surface)" strokeWidth={2} />
        <text x={L - 6} y={T + 10} textAnchor="end" fontSize={14} fill="var(--ink-2)">
          {+vMax.toFixed(2)} V
        </text>
        <text x={L - 6} y={H - B + 5} textAnchor="end" fontSize={14} fill="var(--ink-2)">
          0
        </text>
        <text x={L} y={H - 10} fontSize={14} fill="var(--ink-2)">
          0 A
        </text>
        <text x={W - R} y={H - 10} textAnchor="end" fontSize={14} fill="var(--ink-2)">
          {amps(iMax)}
        </text>
        <text x={(L + W) / 2} y={H - 10} textAnchor="middle" fontSize={14} fill="var(--ink-2)">
          current drawn
        </text>
      </svg>
      <div className="mt-1 flex flex-wrap justify-center gap-2">
        <Readout label="At the terminals" value={volts(st.vTerm)} accent />
        <Readout label="Current" value={amps(st.amps)} />
        {bench ? <Readout label="Mode" value={st.mode === "CV" ? "CV (voltage held)" : "CC (current limited)"} /> : <Readout label="Heat inside" value={watts(st.lost)} />}
      </div>
      <div className="mt-2">
        <Slider label="Load resistance" value={LOADS.indexOf(load) < 0 ? 4 : LOADS.indexOf(load)} min={0} max={LOADS.length - 1} onChange={(i) => { setLoad(LOADS[i]); emit(cell, LOADS[i]); }} format={(i) => ohms(LOADS[i])} />
      </div>
      <div className="mt-1">
        {bench ? (
          <Note tone={st.mode === "CC" ? "bad" : "neutral"}>
            {st.mode === "CC"
              ? `The load wants more than ${amps(limit)}, so the supply holds the current at the limit and lets the voltage fall to ${volts(st.vTerm)}. That protects the circuit.`
              : `The load needs ${amps(st.amps)}, under the ${amps(limit)} limit, so the supply holds ${volts(vset)}.`}
          </Note>
        ) : (
          <Note tone={st.vTerm < cell.voc * 0.9 ? "bad" : "neutral"}>
            {st.vTerm < cell.voc * 0.9
              ? `The cell's own ${ohms(cell.ri)} takes ${volts(cell.voc - st.vTerm)} of its ${volts(cell.voc)}. Only ${volts(st.vTerm)} reaches the load.`
              : "A light load barely troubles the cell: nearly all of its voltage reaches the load."}
          </Note>
        )}
      </div>
      <ToyNote>
        {bench ? "A toy model of a bench supply: a perfect voltage until the current limit, then a perfect current." : "A toy model with typical values (fresh alkaline AA about 0.2 Ω, a tired one more, a coin cell around 15 Ω). Real cells change with age, charge and temperature."}
      </ToyNote>
    </div>
  );
}
