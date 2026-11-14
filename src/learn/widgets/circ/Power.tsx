"use client";

import React, { useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { heat, type HeatState } from "./logic";
import { Meter, Note, Readout, ResistorSlider, Sch, Slider, ToyNote, amps, ohms, volts, watts } from "./ui";

export interface PowerProps {
  /** The resistor's power rating, watts. A common small resistor is 0.25 W. */
  rating?: number;
  v?: number;
  r?: number;
  maxV?: number;
  /** Which resistor values the slider offers (default: all). */
  steps?: number[];
}

export interface PowerState extends HeatState {
  v: number;
  r: number;
  rating: number;
}

/** goal: { over: true|false }, { minLoad, maxLoad } as a share of the rating, { minWatts, maxWatts }. */
export function checkPower(state: unknown, goal: Record<string, unknown>) {
  const s = state as PowerState | undefined;
  if (!s) return false;
  const g = goal as { over?: boolean; minLoad?: number; maxLoad?: number; minWatts?: number; maxWatts?: number };
  if (g.over !== undefined && s.over !== g.over) return false;
  if (g.minLoad !== undefined && s.load < g.minLoad) return false;
  if (g.maxLoad !== undefined && s.load > g.maxLoad) return false;
  if (g.minWatts !== undefined && s.watts < g.minWatts) return false;
  if (g.maxWatts !== undefined && s.watts > g.maxWatts) return false;
  return true;
}

/** Mix cool grey-blue to orange to red as the load passes 0, 1 and 2 times the rating. */
function bodyColour(load: number): { fill: string; opacity: number } {
  if (load <= 0.5) return { fill: "var(--surface-2)", opacity: 1 };
  if (load <= 1) return { fill: "#e8924a", opacity: 0.25 + 0.6 * ((load - 0.5) / 0.5) };
  return { fill: "#e0452f", opacity: Math.min(1, 0.7 + 0.15 * (load - 1)) };
}

/** A resistor turns every watt it takes into heat. Pick the voltage and the resistance, watch P = V²/R against the part's rating. */
export function Power({ props, onChange }: WidgetProps<PowerProps>) {
  const rating = props.rating ?? 0.25;
  const maxV = props.maxV ?? 24;
  const [v, setV] = useState(props.v ?? 5);
  const [r, setR] = useState(props.r ?? 100);

  const make = (nv: number, nr: number): PowerState => ({ ...heat(nv, nr, rating), v: nv, r: nr, rating });
  const st = make(v, r);
  const update = (nv: number, nr: number) => {
    setV(nv);
    setR(nr);
    onChange?.(make(nv, nr));
  };
  const col = bodyColour(st.load);
  const flow = Math.sqrt(st.amps);
  const verdict = st.load > 1 ? "Over its rating: it would overheat and could burn" : st.load > 0.7 ? "Close to its limit: running hot" : st.load > 0.3 ? "Warm, comfortably within its rating" : "Barely warm";

  return (
    <div className="w-full">
      <Sch
        cols={18}
        rows={8}
        flowRef={Math.sqrt(maxV / 10)}
        ariaLabel={`A ${volts(v)} battery across a ${ohms(r)} resistor. The resistor dissipates ${watts(st.watts)}, ${Math.round(st.load * 100)} percent of its ${watts(rating)} rating.`}
        parts={[
          { kind: "battery", id: "B1", at: [3, 2], rot: 90, label: "Battery", value: volts(v) },
          { kind: "resistor", id: "R1", at: [14, 2], rot: 90, label: "R", value: ohms(r), highlight: st.over },
        ]}
        wires={[
          { points: ["B1.a", [3, 1], [14, 1], "R1.a"], flow },
          { points: ["R1.b", [14, 6], [3, 6], "B1.b"], flow },
        ]}
      />
      {/* the heat picture */}
      <svg viewBox="0 0 360 74" className="mt-1 w-full" role="img" aria-label={`The resistor body, ${Math.round(st.load * 100)} percent of its rating. ${verdict}.`}>
        <line x1={20} y1={40} x2={70} y2={40} stroke="var(--ink-2)" strokeWidth={3} strokeLinecap="round" />
        <line x1={290} y1={40} x2={340} y2={40} stroke="var(--ink-2)" strokeWidth={3} strokeLinecap="round" />
        {st.load > 0.5 && <rect x={62} y={14} width={236} height={52} rx={26} fill={col.fill} opacity={0.18} />}
        <rect x={70} y={20} width={220} height={40} rx={20} fill={col.fill} fillOpacity={col.opacity} stroke="var(--ink)" strokeWidth={2} />
        <text x={180} y={46} textAnchor="middle" fontSize={14} fontWeight={600} fill="var(--ink)">
          {watts(st.watts)} of {watts(rating)}
        </text>
        {st.over && (
          <g stroke="var(--bad)" strokeWidth={2.5} fill="none" strokeLinecap="round">
            <path d="M120 12 q-6 -6 0 -10" />
            <path d="M180 12 q-6 -6 0 -10" />
            <path d="M240 12 q-6 -6 0 -10" />
          </g>
        )}
      </svg>
      <div className="mt-1 px-1">
        <Meter frac={st.load / 2} tone={st.over ? "bad" : st.load > 0.7 ? "warn" : "brand"} label={`${Math.round(st.load * 100)} percent of the rating`} />
        <div className="mt-1 flex justify-between text-xs text-ink-3">
          <span>0</span>
          <span>rating ({watts(rating)})</span>
          <span>2×</span>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap justify-center gap-2">
        <Readout label="Current" value={amps(st.amps)} />
        <Readout label="Power (heat)" value={watts(st.watts)} accent />
        <Readout label="Of rating" value={`${Math.round(st.load * 100)}%`} />
      </div>
      <p className="mt-2 text-center font-mono text-sm text-ink" aria-live="polite">
        P = V²÷R = {volts(v)}² ÷ {ohms(r)} = {watts(st.watts)}
      </p>
      <div className="mt-2 grid gap-x-4 sm:grid-cols-2">
        <Slider label="Battery voltage" value={v} min={0} max={maxV} step={0.5} onChange={(nv) => update(nv, r)} format={volts} />
        <ResistorSlider label="Resistor" value={r} steps={props.steps} onChange={(nr) => update(v, nr)} />
      </div>
      <div className="mt-2">
        <Note tone={st.over ? "bad" : "neutral"}>{verdict}.</Note>
      </div>
      <ToyNote>A toy model: the part itself never changes, and real ratings also depend on how hot the air and the board already are.</ToyNote>
    </div>
  );
}
