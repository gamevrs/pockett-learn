"use client";

import React, { useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { LAMP_OHMS, ohmState, type OhmState } from "./logic";
import { Note, Readout, ResistorSlider, Sch, Slider, ToyNote, amps, ohms, volts } from "./ui";

export interface OhmProps {
  /** Add a 50 Ω lamp in series so brightness shows the current. */
  withLamp?: boolean;
  v?: number;
  r?: number;
  maxV?: number;
  lockV?: boolean;
  lockR?: boolean;
}

/** goal: { iMin, iMax } amps through the loop; { brightMin, brightMax } 0 to 1; { v }, { r } exact. */
export function checkOhm(state: unknown, goal: Record<string, unknown>) {
  const s = state as OhmState | undefined;
  if (!s) return false;
  const g = goal as { iMin?: number; iMax?: number; brightMin?: number; brightMax?: number; v?: number; r?: number };
  if (g.iMin !== undefined && s.i < g.iMin) return false;
  if (g.iMax !== undefined && s.i > g.iMax) return false;
  if (g.brightMin !== undefined && s.brightness < g.brightMin) return false;
  if (g.brightMax !== undefined && s.brightness > g.brightMax) return false;
  if (g.v !== undefined && s.v !== g.v) return false;
  if (g.r !== undefined && s.r !== g.r) return false;
  return true;
}

/** Ohm's law in a live circuit: a battery, a resistor and (optionally) a lamp. Change the push (V) or the resistance (R) and watch the current (I). */
export function Ohm({ props, onChange }: WidgetProps<OhmProps>) {
  const withLamp = !!props.withLamp;
  const maxV = props.maxV ?? 12;
  const [v, setV] = useState(props.v ?? 6);
  const [r, setR] = useState(props.r ?? 100);

  const st = ohmState(v, r, withLamp);
  const update = (nv: number, nr: number) => {
    setV(nv);
    setR(nr);
    onChange?.(ohmState(nv, nr, withLamp));
  };

  const iMax = maxV / (withLamp ? 10 + LAMP_OHMS : 10);
  const flow = Math.sqrt(st.i);
  const loop = (pts: (string | [number, number])[]) => ({ points: pts as never, flow });
  const total = withLamp ? r + LAMP_OHMS : r;

  return (
    <div className="w-full">
      <Sch
        cols={18}
        rows={9}
        flowRef={Math.sqrt(iMax)}
        ariaLabel={`A ${v} volt battery drives ${amps(st.i)} through a ${ohms(r)} resistor${withLamp ? " and a lamp" : ""}.`}
        parts={
          withLamp
            ? [
                { kind: "battery", id: "B1", at: [3, 3], rot: 90, label: "Battery", value: volts(v) },
                { kind: "resistor", id: "R1", at: [7, 2], label: "R", value: ohms(r) },
                { kind: "lamp", id: "L1", at: [14, 3], rot: 90, label: "Lamp", brightness: st.brightness },
              ]
            : [
                { kind: "battery", id: "B1", at: [3, 3], rot: 90, label: "Battery", value: volts(v) },
                { kind: "resistor", id: "R1", at: [14, 3], rot: 90, label: "R", value: ohms(r) },
              ]
        }
        wires={
          withLamp
            ? [loop(["B1.a", [3, 2], "R1.a"]), loop(["R1.b", [14, 2], "L1.a"]), loop(["L1.b", [14, 7], [3, 7], "B1.b"])]
            : [loop(["B1.a", [3, 2], [14, 2], "R1.a"]), loop(["R1.b", [14, 7], [3, 7], "B1.b"])]
        }
      />
      <div className="mt-2 flex flex-wrap justify-center gap-2">
        <Readout label="V (push)" value={volts(v)} />
        <Readout label="R (resistance)" value={ohms(withLamp ? total : r)} />
        <Readout label="I (current)" value={amps(st.i)} accent />
      </div>
      <p className="mt-2 text-center font-mono text-sm text-ink" aria-live="polite">
        I = V ÷ R = {volts(v)} ÷ {ohms(total)} = {amps(st.i)}
      </p>
      {withLamp && <p className="text-center text-xs text-ink-3">The lamp is 50 Ω, so the total resistance in the loop is R + 50 Ω.</p>}
      <div className="mt-2 grid gap-x-4 sm:grid-cols-2">
        <Slider label="Battery voltage" value={v} min={0} max={maxV} step={0.5} disabled={props.lockV} onChange={(nv) => update(nv, r)} format={(x) => volts(x)} />
        <ResistorSlider label="Resistor" value={r} disabled={props.lockR} onChange={(nr) => update(v, nr)} />
      </div>
      {withLamp && st.brightness >= 1 && (
        <div className="mt-2">
          <Note tone="accent">The lamp is at full brightness. More push or less resistance would only overheat it: real lamps have a rating.</Note>
        </div>
      )}
      <ToyNote>A toy model: ideal battery, ideal wires, and a lamp that behaves like a plain 50 Ω resistor.</ToyNote>
    </div>
  );
}
