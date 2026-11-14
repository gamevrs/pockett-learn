"use client";

import React, { useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { MINUS } from "../elec-kit/format";
import { kirchhoff, type KirchhoffResult } from "./logic";
import { Note, Readout, ResistorSlider, Sch, Seg, Slider, ToyNote, amps, ohms, volts } from "./ui";

export interface KirchhoffProps {
  b1?: number;
  b2?: number;
  r1?: number;
  r2?: number;
  r3?: number;
  /** Which law to show: both (toggle), or lock to one. */
  mode?: "kcl" | "kvl" | "both";
  /** Hide the resistor sliders (the learner moves only the two batteries). */
  lockResistors?: boolean;
}

export interface KirchhoffState extends KirchhoffResult {
  b1: number;
  b2: number;
  r1: number;
  r2: number;
  r3: number;
}

/** goal: { i1Zero }, { i3Zero }, { minVa, maxVa } for the node voltage, { minI2, maxI2 } amps. */
export function checkKirchhoff(state: unknown, goal: Record<string, unknown>) {
  const s = state as KirchhoffState | undefined;
  if (!s) return false;
  const g = goal as { i1Zero?: boolean; i3Zero?: boolean; minVa?: number; maxVa?: number; minI2?: number; maxI2?: number };
  if (g.i1Zero && Math.abs(s.i1) > 1e-6) return false;
  if (g.i3Zero && Math.abs(s.i3) > 1e-6) return false;
  if (g.minVa !== undefined && s.va < g.minVa) return false;
  if (g.maxVa !== undefined && s.va > g.maxVa) return false;
  if (g.minI2 !== undefined && s.i2 < g.minI2) return false;
  if (g.maxI2 !== undefined && s.i2 > g.maxI2) return false;
  return true;
}

const signed = (x: number, f: (n: number) => string) => (x < 0 ? `${MINUS}${f(-x)}` : f(x));
const plus = (x: number, f: (n: number) => string) => (x < 0 ? `${MINUS} ${f(-x)}` : `+ ${f(x)}`);

/** Two batteries and three resistors share a middle node A. Currents into A balance the current out (KCL); every loop's voltages add to zero (KVL). */
export function Kirchhoff({ props, onChange }: WidgetProps<KirchhoffProps>) {
  const [b1, setB1] = useState(props.b1 ?? 9);
  const [b2, setB2] = useState(props.b2 ?? 5);
  const [r1, setR1] = useState(props.r1 ?? 100);
  const [r2, setR2] = useState(props.r2 ?? 220);
  const [r3, setR3] = useState(props.r3 ?? 330);
  const [view, setView] = useState<"kcl" | "kvl">(props.mode === "kvl" ? "kvl" : "kcl");
  const mode = props.mode && props.mode !== "both" ? props.mode : view;

  const make = (a: number, b: number, x: number, y: number, z: number): KirchhoffState => ({ ...kirchhoff(a, b, x, y, z), b1: a, b2: b, r1: x, r2: y, r3: z });
  const st = make(b1, b2, r1, r2, r3);
  const emit = (a: number, b: number, x: number, y: number, z: number) => onChange?.(make(a, b, x, y, z));
  const f = (x: number) => Math.sqrt(Math.abs(x)) * Math.sign(x);
  const flowRef = Math.sqrt(12 / 100);

  const kclSum = st.i1 + st.i3 - st.i2;
  const loop1 = b1 - st.v1 - st.v2;
  const loop2 = b2 - st.v3 - st.v2;

  return (
    <div className="w-full">
      <Sch
        cols={18}
        rows={9}
        flowRef={flowRef}
        ariaLabel={`Two batteries, ${volts(b1)} and ${volts(b2)}, feed three resistors that meet at node A. The voltage at A is ${volts(st.va)}. Current into A from R1 is ${amps(st.i1)} and from R3 is ${amps(st.i3)}; current out through R2 is ${amps(st.i2)}.`}
        parts={[
          { kind: "battery", id: "B1", at: [2, 3], rot: 90, label: "B1", value: volts(b1) },
          { kind: "resistor", id: "R1", at: [4, 2], label: "R1", value: ohms(r1) },
          { kind: "resistor", id: "R2", at: [9, 3], rot: 90, label: "R2", value: ohms(r2) },
          { kind: "resistor", id: "R3", at: [10, 2], label: "R3", value: ohms(r3) },
          { kind: "battery", id: "B2", at: [15, 3], rot: 90, label: "B2", value: volts(b2) },
          { kind: "ground", id: "G", at: [9, 7] },
        ]}
        wires={[
          { points: ["B1.a", [2, 2], "R1.a"], flow: f(st.i1) },
          { points: ["R1.b", [9, 2]], flow: f(st.i1) },
          { points: [[9, 2], "R3.a"], flow: -f(st.i3) },
          { points: ["R3.b", [15, 2], "B2.a"], flow: -f(st.i3) },
          { points: [[9, 2], "R2.a"], flow: f(st.i2) },
          { points: ["R2.b", [9, 7]], flow: f(st.i2) },
          { points: [[9, 7], [2, 7], "B1.b"], flow: f(st.i1) },
          { points: [[9, 7], [15, 7], "B2.b"], flow: f(st.i3) },
        ]}
        texts={[
          { at: [9.5, 1.2], text: "A", anchor: "start" },
          { at: [10, 8.6], text: "ground 0 V", anchor: "start", muted: true },
        ]}
      />
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Readout label="Voltage at A" value={volts(st.va)} accent />
      </div>
      {!props.mode || props.mode === "both" ? (
        <div className="mt-3 flex justify-center">
          <Seg
            label="Which law"
            value={view}
            options={[
              { value: "kcl", label: "Currents at A (KCL)" },
              { value: "kvl", label: "Loop voltages (KVL)" },
            ]}
            onChange={setView}
          />
        </div>
      ) : null}
      {mode === "kcl" ? (
        <div className="mt-2 rounded-xl border border-line bg-surface-2 px-3 py-2 text-sm text-ink" aria-live="polite">
          <p className="font-medium">Currents at node A (arrows show the way each flows)</p>
          <p className="mt-1 font-mono text-[13px] tabular-nums">
            In from R1: {signed(st.i1, amps)}
            <br />
            In from R3: {signed(st.i3, amps)}
            <br />
            Out through R2: {signed(st.i2, amps)}
          </p>
          <p className="mt-1 font-mono text-[13px] tabular-nums text-ink-2">
            in − out = {signed(st.i1, amps)} {plus(st.i3, amps)} {MINUS} {signed(st.i2, amps)} = {Math.abs(kclSum) < 1e-12 ? "0 A" : amps(kclSum)}
          </p>
          <p className="mt-1 text-xs text-ink-3">A negative current just means it flows the other way from the direction the label assumes.</p>
        </div>
      ) : (
        <div className="mt-2 rounded-xl border border-line bg-surface-2 px-3 py-2 text-sm text-ink" aria-live="polite">
          <p className="font-medium">Round each loop: rises minus drops add to zero</p>
          <p className="mt-1 font-mono text-[13px] tabular-nums">
            Left loop: {volts(b1)} {MINUS} {signed(st.v1, volts)} {MINUS} {signed(st.v2, volts)} = {Math.abs(loop1) < 1e-9 ? "0 V" : volts(loop1)}
          </p>
          <p className="mt-1 font-mono text-[13px] tabular-nums">
            Right loop: {volts(b2)} {MINUS} {signed(st.v3, volts)} {MINUS} {signed(st.v2, volts)} = {Math.abs(loop2) < 1e-9 ? "0 V" : volts(loop2)}
          </p>
          <p className="mt-1 text-xs text-ink-3">R1 and R3 drops are measured in the direction of current flowing toward A. The drop across R2 is shared by both loops.</p>
        </div>
      )}
      <div className="mt-3 grid gap-x-4 sm:grid-cols-2">
        <Slider label="B1 voltage" value={b1} min={0} max={12} step={0.5} onChange={(v) => { setB1(v); emit(v, b2, r1, r2, r3); }} format={volts} />
        <Slider label="B2 voltage" value={b2} min={0} max={12} step={0.5} onChange={(v) => { setB2(v); emit(b1, v, r1, r2, r3); }} format={volts} />
        {!props.lockResistors && (
          <>
            <ResistorSlider label="R1" value={r1} onChange={(v) => { setR1(v); emit(b1, b2, v, r2, r3); }} />
            <ResistorSlider label="R2" value={r2} onChange={(v) => { setR2(v); emit(b1, b2, r1, v, r3); }} />
            <ResistorSlider label="R3" value={r3} onChange={(v) => { setR3(v); emit(b1, b2, r1, r2, v); }} />
          </>
        )}
      </div>
      <div className="mt-1">
        <Note>The solver finds the voltage at A that makes the currents balance; then you can check both laws on its answer.</Note>
      </div>
      <ToyNote />
    </div>
  );
}
