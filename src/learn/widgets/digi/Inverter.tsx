"use client";

import React, { useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { Schematic } from "../elec-kit/Schematic";
import { Note, Readout, Seg, Slider } from "./ui";
import { VDD, VT, inverterAt } from "./sim";

export interface InverterProps {
  /** "switch": a low/high input. "ramp": adds a slider so the input can be held between the rails. */
  mode?: "switch" | "ramp";
}

export interface InverterWidgetState {
  vin: number;
  /** 0, 1, or "mid" while neither rail level applies */
  input: 0 | 1 | "mid";
  nOn: boolean;
  pOn: boolean;
  /** 0, 1 or "mid" (both on, or neither) */
  out: 0 | 1 | "mid";
  shoot: boolean;
}

function snapshot(vin: number): InverterWidgetState {
  const r = inverterAt(vin);
  return { vin, input: vin <= 0.001 ? 0 : vin >= VDD - 0.001 ? 1 : "mid", nOn: r.nOn, pOn: r.pOn, out: r.out === null ? "mid" : r.out, shoot: r.shootThrough };
}

/** A CMOS inverter at switch level: PMOS pulls the output up, NMOS pulls it down, and you drive the input. */
export function Inverter({ props, onChange }: WidgetProps<InverterProps>) {
  const ramp = props.mode === "ramp";
  const [vin, setVin] = useState(0);
  const s = snapshot(vin);
  const set = (v: number) => {
    const x = Math.round(v * 10) / 10;
    setVin(x);
    onChange?.(snapshot(x));
  };
  const upPath = s.pOn;
  const downPath = s.nOn;
  const flow = s.shoot ? 1 : 0;
  const inLabel = s.input === "mid" ? `${vin.toFixed(1)} V` : s.input === 0 ? "0 V (low)" : `${VDD} V (high)`;

  return (
    <div className="w-full" data-widget="digi-inverter">
      <div className="mb-2 flex flex-wrap items-center justify-center gap-2">
        <Seg
          label="Input level"
          value={s.input === 0 ? "low" : s.input === 1 ? "high" : "mid"}
          onChange={(v) => set(v === "high" ? VDD : 0)}
          options={[
            { value: "low", label: "Input low (0)" },
            { value: "high", label: "Input high (1)" },
          ]}
        />
      </div>
      {ramp && (
        <div className="mb-2">
          <Slider label="Input voltage" value={vin} min={0} max={VDD} step={0.1} onChange={set} format={(v) => `${v.toFixed(1)} V`} />
        </div>
      )}
      <div className="mx-auto max-w-[26rem] rounded-xl border border-line bg-surface p-1.5">
        <Schematic
          cols={18}
          rows={15}
          ariaLabel="CMOS inverter: a PMOS transistor from the supply to the output and an NMOS transistor from the output to ground, both gates tied to the input"
          parts={[
            { kind: "pmos", id: "P1", at: [6, 5], bubble: true, label: "P", highlight: s.pOn },
            { kind: "nmos", id: "N1", at: [6, 11], label: "N", highlight: s.nOn },
            { kind: "capacitor", id: "CL", at: [14, 8], rot: 90, label: "load" },
            { kind: "ground", id: "G1", at: [8, 13] },
            { kind: "ground", id: "G2", at: [14, 11] },
          ]}
          wires={[
            { points: [[6, 1], [10, 1]] },
            { points: ["P1.s", [8, 1]], highlight: upPath, flow: -flow },
            { points: ["P1.d", [8, 8]], highlight: upPath, flow: flow },
            { points: [[8, 8], "N1.d"], highlight: downPath, flow: flow },
            { points: [[8, 8], [14, 8]], highlight: upPath || downPath },
            { points: ["N1.s", "G1.a"], highlight: downPath, flow: flow },
            { points: ["CL.b", "G2.a"] },
            { points: [[1, 8], [3, 8]] },
            { points: ["P1.g", [3, 5], [3, 11], "N1.g"] },
          ]}
          texts={[
            { at: [10.4, 1.35], text: "VDD", anchor: "start" },
            { at: [0.2, 7.3], text: "IN", anchor: "start" },
            { at: [9.3, 7.55], text: "OUT", anchor: "start", muted: true },
            { at: [9.3, 5.3], text: s.pOn ? "ON" : "off", anchor: "start" },
            { at: [9.3, 11.3], text: s.nOn ? "ON" : "off", anchor: "start" },
          ]}
        />
      </div>
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        <Readout label="Input" value={inLabel} />
        <Readout label="PMOS (top)" value={s.pOn ? "on" : "off"} />
        <Readout label="NMOS (bottom)" value={s.nOn ? "on" : "off"} />
        <Readout label="Output" value={s.out === "mid" ? (s.shoot ? "in between" : "floating") : s.out} accent />
      </div>
      <div className="mt-3">
        <Note tone={s.shoot ? "accent" : "plain"}>
          {s.shoot
            ? "Both transistors are on for a moment, so current flows straight from the supply to ground. This only happens while the input is crossing the middle, which is why CMOS uses power when it switches."
            : s.out === 1
              ? "Input low: the PMOS conducts and connects the output to VDD (a 1). The NMOS is off, so nothing flows to ground. Steady current is about zero (only a tiny leakage)."
              : "Input high: the NMOS conducts and connects the output to ground (a 0). The PMOS is off, so nothing flows from the supply. Steady current is about zero (only a tiny leakage)."}
        </Note>
      </div>
      <p className="mt-2 text-center text-xs text-ink-3">Toy model: ideal on/off switches with a {VT} V turn-on threshold on a {VDD} V supply (typical-looking numbers, not a real process).</p>
    </div>
  );
}

/** goal: any of { out, input, pOn, nOn, shoot } */
export function checkInverter(state: unknown, goal: Record<string, unknown>) {
  const s = state as InverterWidgetState | undefined;
  if (!s) return false;
  for (const k of ["out", "input", "pOn", "nOn", "shoot"] as const) if (k in goal && s[k] !== goal[k]) return false;
  return Object.keys(goal).length > 0;
}
