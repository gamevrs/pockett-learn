/**
 * Pure logic for the RC scope (no React). A capacitor charges or discharges through a resistor; the curve
 * comes from the shared transient solver, and `rcVoltage` is the closed form it is checked against.
 */
import { sampleAt, simulate } from "../elec-kit/transient";

export type RcMode = "charge" | "discharge";

/** Slider stops (E-series style values). */
export const RC_R_VALUES = [1000, 2200, 4700, 10000, 22000, 47000, 100000];
export const RC_C_VALUES = [1e-6, 2.2e-6, 4.7e-6, 10e-6, 22e-6, 47e-6, 100e-6];

/** Number of time constants the scope shows. */
export const RC_SPAN = 6;
/** Solver steps per time constant (trapezoidal: second order, and nothing switches after t = 0). */
const STEPS_PER_TAU = 100;

/** Closed form: charging v·(1 − e^(−t/RC)), discharging v·e^(−t/RC). */
export function rcVoltage(vs: number, r: number, c: number, t: number, mode: RcMode = "charge"): number {
  const k = Math.exp(-t / (r * c));
  return mode === "charge" ? vs * (1 - k) : vs * k;
}

export interface RcCurve {
  tau: number;
  /** sample times, s */
  t: number[];
  /** capacitor voltage, V */
  v: number[];
  /** current through the resistor, A, positive = flowing into the capacitor's + plate */
  i: number[];
  /** capacitor voltage at 1τ … 5τ */
  atTau: number[];
  at: (t: number) => number;
  atI: (t: number) => number;
}

/** Simulate 0 … 6τ. Charging: 0 V capacitor, supply on at t = 0. Discharging: capacitor starts at the supply voltage, the resistor goes to ground. */
export function rcCurve(r: number, c: number, vs: number, mode: RcMode): RcCurve | null {
  const tau = r * c;
  const res = simulate(
    [
      { kind: "V", id: "V1", a: "in", b: "gnd", volts: mode === "charge" ? vs : 0 },
      { kind: "R", id: "R1", a: "in", b: "out", ohms: r },
      { kind: "C", id: "C1", a: "out", b: "gnd", farads: c, v0: mode === "charge" ? 0 : vs },
    ],
    { tStop: RC_SPAN * tau, steps: RC_SPAN * STEPS_PER_TAU, method: "trapezoidal" },
  );
  if (!res.ok) return null;
  const v = res.v.out;
  // R1's current runs in → out, i.e. into the capacitor
  const i = res.el.R1.i;
  return {
    tau,
    t: res.t,
    v,
    i,
    atTau: [1, 2, 3, 4, 5].map((k) => sampleAt(res, v, k * tau)),
    at: (t) => sampleAt(res, v, t),
    atI: (t) => sampleAt(res, i, t),
  };
}
