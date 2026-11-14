"use client";

import React, { useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { Schematic, type PartSpec, type WireSpec } from "../elec-kit/Schematic";
import { Note, Readout, Seg, Slider, Stepper, ToyNote, formatSI } from "./ui";
import {
  E12_RB,
  LOADS,
  MOSFETS,
  SMALL_PACKAGE_W,
  V_GPIO,
  baseResistorFor,
  bjtSwitch,
  gpioLevel,
  mosfetSwitch,
  type LoadId,
  type MosfetPart,
  type SwitchResult,
} from "./switchsim";

export interface TransistorSwitchProps {
  load?: LoadId;
  device?: "bjt" | "mosfet";
  /** Starting base resistor, ohms (snaps to the nearest E12 value). */
  rb?: number;
  beta?: number;
  part?: MosfetPart["id"];
  diode?: boolean;
}

export interface TransistorSwitchState {
  device: "bjt" | "mosfet";
  load: LoadId;
  rb: number;
  beta: number;
  part: MosfetPart["id"];
  diode: boolean;
  /** BJT: β·Ib reaches the load current. MOSFET: always true (the channel is on, see `loadPct`). */
  saturated: boolean;
  /** Overdrive factor β·Ib / Ic(sat); only for a BJT (0 for a MOSFET). */
  overdrive: number;
  /** GPIO current, amps. */
  gpioA: number;
  /** Current in the load, amps. */
  iLoad: number;
  /** Share of the load's full current that actually flows, 0 to 1. */
  loadPct: number;
  heatW: number;
  /** An inductive load is switched without a flyback diode. */
  unprotected: boolean;
}

const nearestRb = (v: number) => E12_RB.reduce((b, x, i) => (Math.abs(Math.log(x / v)) < Math.abs(Math.log(E12_RB[b] / v)) ? i : b), 0);

/** A 3.3 V GPIO pin switching a load through a BJT or a MOSFET (behavioural model, drawn as a schematic). */
export function TransistorSwitch({ props, onChange, status, goal }: WidgetProps<TransistorSwitchProps>) {
  const [load, setLoad] = useState<LoadId>(props.load ?? "relay");
  const [device, setDevice] = useState<"bjt" | "mosfet">(props.device ?? "bjt");
  const [rbi, setRbi] = useState(nearestRb(props.rb ?? 4700));
  const [beta, setBeta] = useState(props.beta ?? 100);
  const [part, setPart] = useState<MosfetPart["id"]>(props.part ?? "logic");
  const [diode, setDiode] = useState(props.diode ?? false);

  const L = LOADS[load];
  const compute = (ld: LoadId, dv: "bjt" | "mosfet", rbIdx: number, b: number, pt: MosfetPart["id"], dd: boolean) => {
    const r: SwitchResult = dv === "bjt" ? bjtSwitch({ load: ld, rb: E12_RB[rbIdx], beta: b }) : mosfetSwitch({ load: ld, part: pt });
    const full = LOADS[ld].vsup / r.rLoad;
    const st: TransistorSwitchState = {
      device: dv,
      load: ld,
      rb: E12_RB[rbIdx],
      beta: b,
      part: pt,
      diode: dd,
      saturated: dv === "bjt" ? !!r.saturated : true,
      overdrive: dv === "bjt" ? (r.overdrive ?? 0) : 0,
      gpioA: r.gpioA,
      iLoad: r.iLoad,
      loadPct: r.iLoad / full,
      heatW: r.heatW,
      unprotected: LOADS[ld].inductive && !dd,
    };
    return { r, st };
  };
  const { r, st } = compute(load, device, rbi, beta, part, diode);
  const report = (ld: LoadId, dv: "bjt" | "mosfet", rbIdx: number, b: number, pt: MosfetPart["id"], dd: boolean) => onChange?.(compute(ld, dv, rbIdx, b, pt, dd).st);

  const rb = E12_RB[rbi];
  const lvl = gpioLevel(r.gpioA);
  const hot = r.heatW > SMALL_PACKAGE_W;
  const showDiode = L.inductive && diode;

  // --- schematic ---
  const lit = r.iLoad > 0.2 * (L.vsup / r.rLoad);
  const parts: PartSpec[] = [
    L.inductive
      ? { kind: "inductor", id: "L1", at: [12, 3], rot: 90, label: load === "motor" ? "Motor" : "Coil", labelFlip: true }
      : { kind: "led", id: "L1", at: [12, 3], rot: 90, label: "LEDs", on: lit, labelFlip: true },
    device === "bjt"
      ? { kind: "npn", id: "Q1", at: [10, 8], label: "Q1" }
      : { kind: "nmos", id: "Q1", at: [10, 8], label: "Q1" },
    { kind: "ground", id: "G1", at: [12, 11] },
  ];
  const texts = [
    { at: [0.2, 7.2] as [number, number], text: `GPIO ${V_GPIO} V`, anchor: "start" as const },
    { at: [14.2, 1.2] as [number, number], text: `+${L.vsup} V`, anchor: "middle" as const },
  ];
  const wires: WireSpec[] = [
    { points: [[16, 2], [12, 2], "L1.a"], flow: r.iLoad },
    { points: [device === "bjt" ? "Q1.e" : "Q1.s", "G1.a"], flow: r.iLoad },
  ];
  if (device === "bjt") {
    parts.push({ kind: "resistor", id: "Rb", at: [5, 8], label: "Rb", value: formatSI(rb, "Ω") });
    wires.push({ points: [[1, 8], "Rb.a"], flow: r.gpioA }, { points: ["Rb.b", "Q1.b"], flow: r.gpioA });
  } else {
    parts.push(
      { kind: "resistor", id: "Rg", at: [4, 8], label: "Rg" },
      { kind: "resistor", id: "Rpd", at: [8, 8], rot: 90, label: "Rpd", labelFlip: true },
      { kind: "ground", id: "G2", at: [8, 11] },
      { kind: "junction", id: "J1", at: [8, 8] },
    );
    wires.push({ points: [[1, 8], "Rg.a"] }, { points: ["Rg.b", "J1.a", "Q1.g"] }, { points: ["Rpd.b", "G2.a"] });
  }
  if (showDiode) {
    parts.push({ kind: "diode", id: "D1", at: [16, 6], rot: 270, label: "D1" });
    wires.push({ points: ["D1.b", [16, 2]] }, { points: [device === "bjt" ? "Q1.c" : "Q1.d", "D1.a"] });
  }

  const solutionRb = status === "revealed" && goal && goal.device === "bjt" && goal.saturated === true ? baseResistorFor(load, beta, 2) : null;

  return (
    <div data-widget="analog-switch" className="w-full">
      <div className="flex flex-wrap items-center gap-2">
        <Seg
          label="Load"
          options={(Object.keys(LOADS) as LoadId[]).map((k) => ({ value: k, label: LOADS[k].label }))}
          value={load}
          onChange={(v) => { setLoad(v); report(v, device, rbi, beta, part, diode); }}
        />
        <Seg
          label="Switch type"
          options={[{ value: "bjt", label: "BJT (NPN)" }, { value: "mosfet", label: "MOSFET (N-ch)" }]}
          value={device}
          onChange={(v) => { setDevice(v); report(load, v, rbi, beta, part, diode); }}
        />
      </div>
      <p className="mt-1.5 text-xs text-ink-2">
        {L.label}: runs from {L.vsup} V and draws {formatSI(L.amps, "A")} when fully on{L.inductive ? "; it is inductive" : ""}.
      </p>

      <div className="mt-2">
        <Schematic
          cols={18}
          rows={12}
          ariaLabel={`Low-side switch: a ${V_GPIO} volt GPIO pin drives the ${device === "bjt" ? "base of an NPN transistor through a base resistor" : "gate of an N-channel MOSFET through a gate resistor with a pull-down"}. The ${L.label.toLowerCase()} sits between ${L.vsup} volts and the ${device === "bjt" ? "collector" : "drain"}${showDiode ? ", with a flyback diode across it" : ""}.`}
          parts={parts}
          wires={wires}
          texts={texts}
        />
      </div>

      <div className="mt-2 grid gap-x-4 gap-y-2 sm:grid-cols-2">
        {device === "bjt" ? (
          <>
            <div>
              <p className="text-xs text-ink-3">Base resistor Rb</p>
              <Stepper label="Base resistor" value={rbi} min={0} max={E12_RB.length - 1} wide format={(i) => formatSI(E12_RB[i], "Ω")} onChange={(i) => { setRbi(i); report(load, device, i, beta, part, diode); }} />
            </div>
            <Slider label="Current gain β (typical; varies a lot between parts)" value={beta} min={20} max={300} step={10} onChange={(b) => { setBeta(b); report(load, device, rbi, b, part, diode); }} />
          </>
        ) : (
          <div className="sm:col-span-2">
            <p className="text-xs text-ink-3">MOSFET part</p>
            <Seg
              label="MOSFET part"
              options={(Object.keys(MOSFETS) as MosfetPart["id"][]).map((k) => ({ value: k, label: MOSFETS[k].label }))}
              value={part}
              onChange={(v) => { setPart(v); report(load, device, rbi, beta, v, diode); }}
            />
            <p className="mt-1 text-xs text-ink-2">{MOSFETS[part].note}. Fixed in the drawing: gate resistor Rg = 330 Ω and gate pull-down Rpd = 100 kΩ (typical values).</p>
          </div>
        )}
        {L.inductive && (
          <div className="sm:col-span-2">
            <p className="text-xs text-ink-3">Flyback diode across the {load === "motor" ? "motor" : "coil"}</p>
            <Seg label="Flyback diode" options={[{ value: 0, label: "None" }, { value: 1, label: "Diode fitted" }]} value={diode ? 1 : 0} onChange={(v) => { setDiode(v === 1); report(load, device, rbi, beta, part, v === 1); }} />
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap justify-center gap-2">
        <Readout label="load current" value={formatSI(r.iLoad, "A")} accent />
        <Readout label={device === "bjt" ? "VCE" : "VDS"} value={`${r.vSwitch.toFixed(2)} V`} />
        <Readout label="switch heat" value={r.heatW < 0.1 ? `${(r.heatW * 1000).toFixed(0)} mW` : `${r.heatW.toFixed(2)} W`} accent />
        <Readout label="from GPIO" value={device === "bjt" ? formatSI(r.gpioA, "A") : "about 0"} />
      </div>

      <div className="mt-3 space-y-2">
        {device === "bjt" && (
          <Note tone={r.saturated ? "accent" : "plain"}>
            Ib = ({V_GPIO} {"−"} 0.7) / {formatSI(rb, "Ω")} = {formatSI(r.ib ?? 0, "A")}. The load needs about {formatSI(r.ibNeeded ?? 0, "A")} to saturate (Ic / β). {r.saturated
              ? (r.overdrive ?? 0) >= 2
                ? `Saturated with ${(r.overdrive ?? 0).toFixed(1)}× to spare: VCE sits at about 0.2 V and the transistor stays cool.`
                : `Saturated, but only ${(r.overdrive ?? 0).toFixed(1)}× the minimum. Real β varies, so aim for 2× or more.`
              : `Not saturated: the transistor is in its active region, passing only β × Ib = ${formatSI(r.iLoad, "A")}, so it drops ${r.vSwitch.toFixed(2)} V and heats instead of acting like a closed switch.`}
          </Note>
        )}
        {device === "mosfet" && (
          <Note tone={r.heatW <= SMALL_PACKAGE_W ? "accent" : "plain"}>
            The gate takes almost no steady current; the part&apos;s on-resistance does the work. At {V_GPIO} V the {part === "logic" ? "logic-level" : "standard"} part acts like {formatSI(r.rds ?? 0, "Ω")}, so the load gets {Math.round(st.loadPct * 100)}% of its current and the switch burns I²R = {r.heatW < 0.1 ? `${(r.heatW * 1000).toFixed(1)} mW` : `${r.heatW.toFixed(2)} W`}.
          </Note>
        )}
        <Note>
          GPIO pin: {lvl === "ok" ? "a few mA or less, easy for almost any microcontroller." : lvl === "heavy" ? "heavy: close to what many pins can give. Check your chip's datasheet." : "over a typical per-pin limit (a few mA to about 20 mA; check the datasheet). Raise Rb."}
        </Note>
        {hot && (
          <Note tone="accent">
            {r.heatW.toFixed(2)} W in the switch is more than a small TO-92 or SOT-23 part typically sheds without help (about {SMALL_PACKAGE_W} W). It will run hot, and a hot transistor can burn you and fail.
          </Note>
        )}
        {L.inductive && !diode && (
          <Note tone="accent">
            No flyback diode: when the switch turns off, the {load === "motor" ? "motor winding" : "relay coil"} keeps pushing current and its voltage spikes (V = L·di/dt, see <em>Inductors and magnetism</em>). Nothing limits it except the transistor breaking down, which can destroy it.
          </Note>
        )}
        {L.inductive && diode && <Note>With the diode, the spike is clamped to about {L.vsup} V + 0.7 V = {(L.vsup + 0.7).toFixed(1)} V while the coil current dies away through the diode.</Note>}
        {!L.inductive && <Note>This load is not inductive, so it needs no flyback diode. Pick the motor or relay to see why inductive loads do.</Note>}
        {solutionRb && <Note tone="accent">One answer: Rb = {formatSI(solutionRb, "Ω")} gives about 2× the saturation base current at β = {beta}.</Note>}
        <ToyNote>
          Toy model: BJT saturated (β·Ib reaches the load current) gives VCE = 0.2 V, otherwise Ic = β·Ib and VCE = supply {"−"} Ic·Rload; VBE = 0.7 V. The MOSFET is a plain resistor: 0.05 Ω for the logic-level part, about 8 Ω for the standard part at 3.3 V (a made-up value; real parts vary). Typical values, not datasheet numbers.
        </ToyNote>
      </div>
    </div>
  );
}

/** goal: { device, part, load, saturated, gpioMaxA, heatMaxW, minOverdrive, diode, protectedLoad, loadPctMin }. */
export function checkTransistorSwitch(state: unknown, goal: Record<string, unknown>) {
  const s = state as TransistorSwitchState | undefined;
  if (!s) return false;
  if (goal.device !== undefined && s.device !== goal.device) return false;
  if (goal.part !== undefined && s.part !== goal.part) return false;
  if (goal.load !== undefined && s.load !== goal.load) return false;
  if (typeof goal.saturated === "boolean" && s.saturated !== goal.saturated) return false;
  if (typeof goal.diode === "boolean" && s.diode !== goal.diode) return false;
  if (goal.protectedLoad === true && s.unprotected) return false;
  if (typeof goal.gpioMaxA === "number" && !(s.gpioA <= goal.gpioMaxA)) return false;
  if (typeof goal.heatMaxW === "number" && !(s.heatW <= goal.heatMaxW)) return false;
  if (typeof goal.minOverdrive === "number" && !(s.overdrive >= goal.minOverdrive)) return false;
  if (typeof goal.loadPctMin === "number" && !(s.loadPct >= goal.loadPctMin)) return false;
  return true;
}
