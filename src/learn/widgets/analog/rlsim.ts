/**
 * Pure logic for the RL / flyback bench (no React). A coil (inductance L in series with its winding
 * resistance R) is switched on for 5 time constants, then the switch opens.
 *
 *  - Closed phase: current rises as (V/R)(1 − e^(−t/τ)), τ = L/R.
 *  - Open phase, simulated on its own (zoomed) time axis, starting from the coil current at the moment of opening:
 *      without a flyback diode the current can only continue through whatever path the open switch still offers.
 *      A real opening switch has no such path until something gives (an arc across the contacts, a transistor
 *      breaking down, stray capacitance), so the toy puts a stand-in resistor `ropen` across the switch.
 *      The peak voltage across the switch is then about I × ropen: it depends on that stand-in, not on physics we model.
 *      With a flyback diode (cathode to +) across the coil the current circulates through the diode and the
 *      switch sees the supply plus one diode drop.
 */
import { sampleAt, simulate } from "../elec-kit/transient";

export const RL_VS = 12;
export const RL_L_VALUES = [0.01, 0.022, 0.047, 0.1, 0.22, 0.47, 1];
export const RL_R_VALUES = [47, 100, 220, 470, 1000];
export const RL_ROPEN_VALUES = [1000, 10000, 100000];
/** Typical silicon diode forward drop used for the flyback diode. */
export const RL_VF = 0.7;
/** The closed phase lasts this many time constants. */
export const RL_CLOSED_TAUS = 5;

/** Smallest "round" value (1, 1.5, 2, 2.5, 3, 4, 5, 6, 8 times a power of ten) that is at least x. */
export function niceMax(x: number): number {
  const p = Math.pow(10, Math.floor(Math.log10(x)));
  return p * ([1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].find((m) => m * p >= x * (1 - 1e-9)) ?? 10);
}

export interface RlRise {
  tau: number;
  /** final current V/R */
  iFinal: number;
  t: number[];
  i: number[];
  /** coil current at 1τ … 5τ */
  atTau: number[];
  /** current at the moment the switch opens (after 5τ) */
  iOpen: number;
}

/** Closed phase: V across L in series with R, from 0 to 5τ. */
export function rlRise(l: number, r: number, vs: number = RL_VS): RlRise | null {
  const tau = l / r;
  const res = simulate(
    [
      { kind: "V", id: "V1", a: "vcc", b: "gnd", volts: vs },
      { kind: "L", id: "L1", a: "vcc", b: "y", henries: l, i0: 0 },
      { kind: "R", id: "Rw", a: "y", b: "gnd", ohms: r },
    ],
    { tStop: RL_CLOSED_TAUS * tau, steps: RL_CLOSED_TAUS * 100, method: "trapezoidal" },
  );
  if (!res.ok) return null;
  const i = res.el.L1.i;
  return {
    tau,
    iFinal: vs / r,
    t: res.t,
    i,
    atTau: [1, 2, 3, 4, 5].map((k) => sampleAt(res, i, k * tau)),
    iOpen: i[i.length - 1],
  };
}

export interface RlOpen {
  /** seconds since the switch opened */
  t: number[];
  /** voltage across the open switch, V */
  vSwitch: number[];
  /** coil current, A */
  iCoil: number[];
  /** largest voltage across the switch */
  peak: number;
  tEnd: number;
}

/** Open phase from coil current `iStart`, with or without the flyback diode. */
export function rlOpen(l: number, r: number, iStart: number, diode: boolean, ropen: number, vs: number = RL_VS): RlOpen | null {
  // how long to simulate: with the diode the current dies when L·di/dt = −(R·i + Vf) reaches 0; without it the
  // coil's current decays through R + ropen with τ = L / (R + ropen)
  const tEnd = niceMax(diode ? 1.3 * (l / r) * Math.log(1 + (r * iStart) / RL_VF) : (5 * l) / (r + ropen));
  const res = simulate(
    [
      { kind: "V", id: "V1", a: "vcc", b: "gnd", volts: vs },
      { kind: "R", id: "RO", a: "vcc", b: "x", ohms: ropen },
      { kind: "L", id: "L1", a: "x", b: "y", henries: l, i0: iStart },
      { kind: "R", id: "Rw", a: "y", b: "gnd", ohms: r },
      ...(diode ? [{ kind: "D" as const, id: "D1", a: "gnd", b: "x", vf: RL_VF }] : []),
    ],
    { tStop: tEnd, steps: 600, method: "backward-euler" },
  );
  if (!res.ok) return null;
  const vSwitch = res.el.RO.v;
  return { t: res.t, vSwitch, iCoil: res.el.L1.i, peak: Math.max(...vSwitch.map(Math.abs)), tEnd };
}
