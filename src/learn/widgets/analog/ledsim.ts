/**
 * Pure logic for the LED bench (no React): typical LED colours, the E12 resistor series, and the DC solution of
 * supply → resistor → LED from the shared solver.
 */
import { solveDC } from "../elec-kit/solve";

/** Typical forward voltages (labelled typical on screen; real parts vary with type, current and temperature). */
export const LED_COLOURS = [
  { id: "red", label: "Red", vf: 2.0, glow: "#ff5a4a" },
  { id: "green", label: "Green", vf: 2.2, glow: "#3ddc72" },
  { id: "blue", label: "Blue", vf: 3.0, glow: "#5aa9ff" },
  { id: "white", label: "White", vf: 3.1, glow: "#ffeeb0" },
] as const;
export type LedColourId = (typeof LED_COLOURS)[number]["id"];

/** Usual indicator-LED continuous current (typical) used to scale the brightness. */
export const LED_TYPICAL_MA = 20;
/** Typical absolute maximum continuous current of a small 3 or 5 mm LED. Always check the datasheet. */
export const LED_MAX_MA = 30;
/** A common small through-hole resistor is rated 1/4 W (typical). */
export const RESISTOR_WATTS = 0.25;
/** Without a resistor only the battery's own internal resistance (and wire) limits the current: a stand-in. */
export const NO_RESISTOR_OHMS = 1;

const E12_BASE = [1.0, 1.2, 1.5, 1.8, 2.2, 2.7, 3.3, 3.9, 4.7, 5.6, 6.8, 8.2];
/** E12 values from 100 Ω to 10 kΩ. */
export const E12: number[] = [
  ...[100, 1000].flatMap((d) => E12_BASE.map((m) => Math.round(m * d))),
  10000,
];
/** Slider stops: 0 means "no resistor", then the E12 values. */
export const LED_R_STOPS: number[] = [0, ...E12];

/** The smallest E12 value (any decade) that is at least `ohms`. */
export function nextE12(ohms: number): number {
  if (!(ohms > 0)) return NaN;
  const decade = Math.pow(10, Math.floor(Math.log10(ohms)));
  for (const d of [decade, decade * 10]) {
    for (const m of E12_BASE) {
      const v = Math.round(m * d * 1e6) / 1e6;
      if (v >= ohms * (1 - 1e-9)) return v;
    }
  }
  return decade * 10;
}

/** R = (Vs − Vf) / I. */
export function requiredR(vs: number, vf: number, amps: number): number {
  return (vs - vf) / amps;
}

export interface LedSolution {
  /** current through the resistor and LED, A (0 when the LED is off or reversed) */
  i: number;
  /** is the LED conducting */
  on: boolean;
  /** resistor voltage, power */
  vR: number;
  pR: number;
  /** voltage across the LED (positive in its forward direction) */
  vLed: number;
}

/** Solve supply → R → LED. `ohms` of 0 means "no resistor" (NO_RESISTOR_OHMS). */
export function solveLed(vs: number, vf: number, ohms: number, reversed: boolean): LedSolution | null {
  const r = ohms > 0 ? ohms : NO_RESISTOR_OHMS;
  const res = solveDC([
    { kind: "V", id: "B1", a: "top", b: "gnd", volts: vs },
    { kind: "R", id: "R1", a: "top", b: "mid", ohms: r },
    reversed ? { kind: "D", id: "D1", a: "gnd", b: "mid", vf } : { kind: "D", id: "D1", a: "mid", b: "gnd", vf },
  ]);
  if (!res.ok) return null;
  const on = !!res.el.D1.on;
  const i = on ? Math.abs(res.el.R1.i) : 0;
  return { i, on, vR: i * r, pR: i * i * r, vLed: on ? vf : res.v.mid };
}
