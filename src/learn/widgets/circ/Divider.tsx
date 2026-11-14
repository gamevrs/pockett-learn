"use client";

import React, { useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { RES_STEPS, ldrOhms, loadedDivider, ntcOhms } from "./logic";
import { Note, Readout, ResistorSlider, Sch, Slider, ToyNote, amps, ohms, volts } from "./ui";

export type DividerMode = "load" | "pot" | "ldr" | "ntc";

export interface DividerProps {
  mode?: DividerMode;
  vin?: number;
  r1?: number;
  r2?: number;
  /** Starting load, ohms (omit or 0 for no load). */
  load?: number;
  /** Hide the load slider (load fixed at "no load"). */
  noLoad?: boolean;
  /** Potentiometer wiper position, percent from the bottom. */
  wiper?: number;
  lux?: number;
  tempC?: number;
}

export interface DividerState {
  mode: DividerMode;
  vin: number;
  r1: number;
  r2: number;
  /** load resistance, Infinity for none */
  load: number;
  vout: number;
  vUnloaded: number;
  /** how far the load pulled the output down, volts (>= 0) */
  sag: number;
  lux: number;
  tempC: number;
  wiper: number;
}

/** goal: { minVout, maxVout } volts, { minSag, maxSag } volts, { noLoad: true }, { minLux, maxLux }, { minTemp, maxTemp }, { minWiper, maxWiper }. */
export function checkDivider(state: unknown, goal: Record<string, unknown>) {
  const s = state as DividerState | undefined;
  if (!s) return false;
  const g = goal as Record<string, number | boolean | undefined>;
  const lt = (v: unknown, n: number) => typeof v === "number" && n < v;
  const gt = (v: unknown, n: number) => typeof v === "number" && n > v;
  if (lt(g.minVout, s.vout) || gt(g.maxVout, s.vout)) return false;
  if (lt(g.minSag, s.sag) || gt(g.maxSag, s.sag)) return false;
  if (lt(g.minLux, s.lux) || gt(g.maxLux, s.lux)) return false;
  if (lt(g.minTemp, s.tempC) || gt(g.maxTemp, s.tempC)) return false;
  if (lt(g.minWiper, s.wiper) || gt(g.maxWiper, s.wiper)) return false;
  if (g.noLoad && Number.isFinite(s.load)) return false;
  return true;
}

const LOADS = [100, 220, 470, 1000, 2200, 4700, 10000, 100000, Infinity];
const loadLabel = (r: number) => (Number.isFinite(r) ? ohms(r) : "no load");
const POT_TOTAL = 10000;

/** A voltage divider: two resistors share the input. Add a load and the output sags. Swap R2 for a light or temperature sensor and the output follows the world. */
export function Divider({ props, onChange }: WidgetProps<DividerProps>) {
  const mode = props.mode ?? "load";
  const vin = props.vin ?? (mode === "ldr" || mode === "ntc" ? 5 : 9);
  const [r1v, setR1] = useState(props.r1 ?? 1000);
  const [r2v, setR2] = useState(props.r2 ?? 1000);
  const [load, setLoad] = useState(props.load ? props.load : Infinity);
  const [wiper, setWiper] = useState(props.wiper ?? 50);
  const [lux, setLux] = useState(props.lux ?? 100);
  const [tempC, setTempC] = useState(props.tempC ?? 25);

  const rl = props.noLoad ? Infinity : load;
  const make = (rLoad: number, w: number, lx: number, tc: number, a: number, b: number): DividerState => {
    const rr1 = mode === "pot" ? POT_TOTAL * (1 - w / 100) : a;
    const rr2 = mode === "pot" ? POT_TOTAL * (w / 100) : mode === "ldr" ? ldrOhms(lx) : mode === "ntc" ? ntcOhms(tc) : b;
    const d = loadedDivider(vin, rr1, rr2, rLoad);
    return { mode, vin, r1: rr1, r2: rr2, load: rLoad, vout: d.vout, vUnloaded: d.vUnloaded, sag: Math.max(0, d.vUnloaded - d.vout), lux: lx, tempC: tc, wiper: w };
  };
  const st = make(rl, wiper, lux, tempC, r1v, r2v);
  const emit = (patch: Partial<{ rLoad: number; w: number; lx: number; tc: number; a: number; b: number }>) => {
    const next = { rLoad: rl, w: wiper, lx: lux, tc: tempC, a: r1v, b: r2v, ...patch };
    onChange?.(make(next.rLoad, next.w, next.lx, next.tc, next.a, next.b));
  };

  const loaded = Number.isFinite(rl);
  const iTop = st.vin / (st.r1 + (loaded ? (st.r2 * rl) / (st.r2 + rl) : st.r2));
  const flowRef = Math.sqrt(vin / 100);
  const flow = Math.sqrt(iTop);
  const r2Label = mode === "ldr" ? "LDR" : mode === "ntc" ? "NTC" : mode === "pot" ? "Pot, lower part" : "R2";
  const r1Label = mode === "pot" ? "Pot, upper part" : "R1";

  const parts = [
    { kind: "battery" as const, id: "B1", at: [2, 3] as [number, number], rot: 90 as const, label: "Vin", value: volts(vin) },
    { kind: "resistor" as const, id: "R1", at: [8, 1] as [number, number], rot: 90 as const, label: r1Label, value: ohms(st.r1) },
    { kind: "resistor" as const, id: "R2", at: [8, 4] as [number, number], rot: 90 as const, label: r2Label, value: ohms(st.r2) },
    { kind: "ground" as const, id: "G", at: [8, 8] as [number, number] },
    ...(loaded ? [{ kind: "resistor" as const, id: "RL", at: [14, 4] as [number, number], rot: 90 as const, label: "Load", value: ohms(rl) }] : []),
  ];
  const wires = [
    { points: ["B1.a", [2, 1], "R1.a"] as never, flow },
    { points: ["R2.b", [8, 8]] as never, flow: st.r2 > 0 ? Math.sqrt(st.vout / st.r2) : 0 },
    { points: ["B1.b", [2, 8], [8, 8]] as never, flow },
    ...(loaded
      ? [
          { points: [[8, 4], "RL.a"] as never, flow: Math.sqrt(st.vout / rl) },
          { points: ["RL.b", [14, 8], [8, 8]] as never, flow: Math.sqrt(st.vout / rl) },
        ]
      : []),
  ];

  // output bar: 0..Vin, the unloaded marker and the real one
  const W = 360;
  const x0 = 20;
  const x1 = 340;
  const xv = (v: number) => x0 + (x1 - x0) * Math.min(1, Math.max(0, v / vin));

  return (
    <div className="w-full">
      <Sch
        cols={18}
        rows={10}
        flowRef={flowRef}
        ariaLabel={`A voltage divider on ${volts(vin)}: ${ohms(st.r1)} over ${ohms(st.r2)}${loaded ? `, with a ${ohms(rl)} load` : ", unloaded"}. The output is ${volts(st.vout)}.`}
        parts={parts}
        wires={wires}
        texts={[{ at: [7.6, 3.6], text: `Vout ${volts(st.vout)}`, anchor: "end" }]}
      />
      <svg viewBox={`0 0 ${W} 58`} className="mt-1 w-full" role="img" aria-label={`Output ${volts(st.vout)} on a scale from 0 to ${volts(vin)}${loaded ? `; it would be ${volts(st.vUnloaded)} with no load` : ""}.`}>
        <rect x={x0} y={22} width={x1 - x0} height={12} rx={6} fill="var(--line-strong)" />
        <rect x={x0} y={22} width={Math.max(0, xv(st.vout) - x0)} height={12} rx={6} fill="var(--brand)" />
        {loaded && st.sag > 0.005 && <rect x={xv(st.vout)} y={22} width={Math.max(0, xv(st.vUnloaded) - xv(st.vout))} height={12} fill="var(--bad)" opacity={0.55} />}
        {loaded && <line x1={xv(st.vUnloaded)} y1={16} x2={xv(st.vUnloaded)} y2={40} stroke="var(--ink-2)" strokeWidth={2} strokeDasharray="3 3" />}
        <text x={x0} y={54} fontSize={14} fill="var(--ink-2)">
          0 V
        </text>
        <text x={x1} y={54} fontSize={14} fill="var(--ink-2)" textAnchor="end">
          {volts(vin)}
        </text>
        <text x={Math.min(Math.max(xv(st.vout), 60), 300)} y={14} fontSize={14} fill="var(--ink)" textAnchor="middle" fontWeight={600}>
          {loaded ? "loaded" : "output"}
        </text>
      </svg>
      <div className="mt-1 flex flex-wrap justify-center gap-2">
        <Readout label="Vout" value={volts(st.vout)} accent />
        {loaded && <Readout label="Unloaded" value={volts(st.vUnloaded)} />}
        {loaded && <Readout label="Sag" value={volts(st.sag)} />}
        <Readout label="Current drawn" value={amps(iTop)} />
      </div>
      <p className="mt-2 text-center font-mono text-xs text-ink-2 sm:text-sm" aria-live="polite">
        Vout = Vin × {loaded ? "(R2 ∥ load)" : "R2"} ÷ (R1 + {loaded ? "(R2 ∥ load)" : "R2"}) = {volts(st.vout)}
      </p>

      <div className="mt-3 grid gap-x-4 sm:grid-cols-2">
        {mode === "load" && (
          <>
            <ResistorSlider label="R1 (top)" value={r1v} onChange={(v) => { setR1(v); emit({ a: v }); }} steps={RES_STEPS} />
            <ResistorSlider label="R2 (bottom)" value={r2v} onChange={(v) => { setR2(v); emit({ b: v }); }} steps={RES_STEPS} />
          </>
        )}
        {mode === "pot" && <Slider label="Wiper position (0 = bottom, 100 = top)" value={wiper} min={0} max={100} step={5} onChange={(v) => { setWiper(v); emit({ w: v }); }} format={(x) => `${x}%`} />}
        {mode === "ldr" && (
          <>
            <ResistorSlider label="Fixed R1" value={r1v} onChange={(v) => { setR1(v); emit({ a: v }); }} steps={RES_STEPS} />
            <Slider
              label="Light level (log scale)"
              value={Math.round(Math.log10(lux) * 20)}
              min={0}
              max={80}
              onChange={(v) => {
                const l = Math.pow(10, v / 20);
                setLux(l);
                emit({ lx: l });
              }}
              format={() => `${lux < 10 ? lux.toFixed(1) : Math.round(lux)} lux`}
            />
          </>
        )}
        {mode === "ntc" && (
          <>
            <ResistorSlider label="Fixed R1" value={r1v} onChange={(v) => { setR1(v); emit({ a: v }); }} steps={RES_STEPS} />
            <Slider label="Temperature" value={tempC} min={-10} max={100} step={1} onChange={(v) => { setTempC(v); emit({ tc: v }); }} format={(x) => `${x} °C`} />
          </>
        )}
        {!props.noLoad && (
          <Slider
            label="Load across the output"
            value={LOADS.indexOf(load) < 0 ? LOADS.length - 1 : LOADS.indexOf(load)}
            min={0}
            max={LOADS.length - 1}
            onChange={(i) => {
              setLoad(LOADS[i]);
              emit({ rLoad: LOADS[i] });
            }}
            format={(i) => loadLabel(LOADS[i])}
          />
        )}
      </div>
      {(mode === "ldr" || mode === "ntc") && (
        <div className="mt-2">
          <Note tone="accent">
            {mode === "ldr"
              ? `The LDR is ${ohms(st.r2)} here: more light, less resistance, so the output falls.`
              : `The NTC thermistor is ${ohms(st.r2)} at ${tempC} °C: hotter, less resistance, so the output falls.`}
          </Note>
        </div>
      )}
      {mode === "load" && loaded && st.sag > 0.05 && (
        <div className="mt-2">
          <Note tone="bad">The load is in parallel with R2, so the bottom half got weaker and the output sagged by {volts(st.sag)}.</Note>
        </div>
      )}
      <ToyNote>
        {mode === "ldr"
          ? "A toy model: this LDR curve is a typical shape (10 kΩ at 100 lux); real parts vary a lot from part to part."
          : mode === "ntc"
            ? "A toy model: a typical 10 kΩ NTC (10 kΩ at 25 °C, B = 3950 K); check the datasheet of a real part."
            : undefined}
      </ToyNote>
    </div>
  );
}
