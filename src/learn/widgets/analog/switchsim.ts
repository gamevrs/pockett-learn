/**
 * Pure logic for the transistor-switch widget (no React): a 3.3 V GPIO pin switching a load on the low side with a
 * BJT or a MOSFET, using a simple behavioural model (stated on screen), not a device simulation.
 */

export const V_GPIO = 3.3;
/** Typical base-emitter drop of a conducting silicon BJT. */
export const V_BE = 0.7;
/** Typical collector-emitter drop of a saturated small BJT (typical 0.1 to 0.3 V; the model uses the middle). */
export const V_CE_SAT = 0.2;
/** Heat a small package (TO-92, SOT-23) typically sheds without a heatsink, watts (typical). */
export const SMALL_PACKAGE_W = 0.5;

export type LoadId = "led" | "motor" | "relay";
export interface LoadSpec {
  id: LoadId;
  label: string;
  /** Supply voltage the load runs from, volts. */
  vsup: number;
  /** Current the load draws when fully powered, amps. */
  amps: number;
  inductive: boolean;
}
export const LOADS: Record<LoadId, LoadSpec> = {
  led: { id: "led", label: "LED strip", vsup: 12, amps: 0.15, inductive: false },
  motor: { id: "motor", label: "Small motor", vsup: 6, amps: 0.4, inductive: true },
  relay: { id: "relay", label: "Relay coil", vsup: 5, amps: 0.07, inductive: true },
};

export interface MosfetPart {
  id: "logic" | "standard";
  label: string;
  /** On-resistance at the 3.3 V gate drive, ohms (the toy model's number). */
  rds: number;
  note: string;
}
export const MOSFETS: Record<MosfetPart["id"], MosfetPart> = {
  logic: { id: "logic", label: "Logic-level", rds: 0.05, note: "RDS(on) 0.05 Ω specified at VGS = 2.5 V" },
  standard: { id: "standard", label: "Standard (10 V part)", rds: 8, note: "RDS(on) only specified at VGS = 10 V; toy assumption: about 8 Ω at 3.3 V" },
};

/** E12 resistor values, 100 Ω to 100 kΩ. */
export const E12_RB: number[] = (() => {
  const base = [1.0, 1.2, 1.5, 1.8, 2.2, 2.7, 3.3, 3.9, 4.7, 5.6, 6.8, 8.2];
  const out: number[] = [];
  for (const dec of [100, 1000, 10000]) for (const b of base) out.push(Math.round(b * dec));
  out.push(100000);
  return out;
})();

export interface SwitchResult {
  device: "bjt" | "mosfet";
  load: LoadId;
  /** Load resistance used by the model, ohms (supply voltage divided by the load's full current). */
  rLoad: number;
  /** Current from the GPIO pin, amps (the base current for a BJT, about 0 for a MOSFET). */
  gpioA: number;
  /** Current through the load, amps. */
  iLoad: number;
  /** Voltage across the switch (collector-emitter or drain-source), volts. */
  vSwitch: number;
  /** Power turned to heat in the switch, watts. */
  heatW: number;
  /** BJT only. */
  ib?: number;
  /** BJT only: Ib that just reaches saturation (Ic / β). */
  ibNeeded?: number;
  /** BJT only: forced ratio β·Ib / Ic(sat); ≥ 2 is a comfortable design margin. */
  overdrive?: number;
  /** BJT only: β·Ib reaches the load's current, so the switch is in saturation. */
  saturated?: boolean;
  /** MOSFET only. */
  rds?: number;
}

export function bjtSwitch(opts: { load: LoadId; rb: number; beta: number }): SwitchResult {
  const L = LOADS[opts.load];
  const rLoad = L.vsup / L.amps;
  const ib = (V_GPIO - V_BE) / opts.rb;
  const icSat = (L.vsup - V_CE_SAT) / rLoad;
  const icAvail = opts.beta * ib;
  const saturated = icAvail >= icSat;
  const ic = saturated ? icSat : icAvail;
  const vce = saturated ? V_CE_SAT : L.vsup - ic * rLoad;
  return {
    device: "bjt",
    load: opts.load,
    rLoad,
    gpioA: ib,
    iLoad: ic,
    vSwitch: vce,
    heatW: vce * ic + V_BE * ib,
    ib,
    ibNeeded: icSat / opts.beta,
    overdrive: icAvail / icSat,
    saturated,
  };
}

export function mosfetSwitch(opts: { load: LoadId; part: MosfetPart["id"] }): SwitchResult {
  const L = LOADS[opts.load];
  const rLoad = L.vsup / L.amps;
  const rds = MOSFETS[opts.part].rds;
  const id = L.vsup / (rLoad + rds);
  return { device: "mosfet", load: opts.load, rLoad, gpioA: 0, iLoad: id, vSwitch: id * rds, heatW: id * id * rds, rds };
}

/** Largest E12 base resistor that still gives at least `overdrive` times the saturation base current. */
export function baseResistorFor(load: LoadId, beta: number, overdrive: number): number {
  const L = LOADS[load];
  const ibWanted = (overdrive * (L.vsup - V_CE_SAT)) / (L.vsup / L.amps) / beta;
  const rMax = (V_GPIO - V_BE) / ibWanted;
  let best = E12_RB[0];
  for (const r of E12_RB) if (r <= rMax) best = r;
  return best;
}

/** How hard the GPIO pin is working: ≤ 4 mA comfortable, ≤ 20 mA heavy, above that over typical limits. */
export function gpioLevel(a: number): "ok" | "heavy" | "over" {
  return a <= 0.004 ? "ok" : a <= 0.02 ? "heavy" : "over";
}
