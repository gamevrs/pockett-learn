/**
 * Pure logic for the switching-converter widget (no React). A synchronous buck or boost converter in steady
 * state, ideal continuous conduction (CCM) unless flagged:
 *
 *   buck   Vout = D·Vin           IL = Iout           dI = (Vin − Vout)·D / (L·f)    dVout = dI / (8·f·C)
 *   boost  Vout = Vin / (1 − D)   IL = Iout / (1 − D) dI = Vin·D / (L·f)             dVout = Iout·D / (f·C)
 *
 * IL is the average inductor current, dI its peak-to-peak ripple. When dI / 2 > IL the inductor current would go
 * below zero: the converter enters discontinuous mode (DCM) and the formulas stop holding, so the model flags it.
 *
 * Loss model (toy constants, typical orders of magnitude):
 *   conduction  Irms² · (RDS_ON + DCR),  Irms² = IL² + dI²/12  (one switch always conducts; DCR grows with L)
 *   switching   ½ · Vsw · IL · (t_r + t_f) · f   (Vsw = Vin for a buck, Vout for a boost)
 *   gate drive  2 · Qg · Vdrive · f   (two switches)
 * Efficiency = Pout / (Pout + losses).
 */
import { simulate } from "../elec-kit/transient";

export type Topology = "buck" | "boost";

export const CONV_C = 22e-6;
export const CONV_RDS = 0.02;
/** Inductor winding resistance per microhenry (bigger inductors use more wire). */
export const CONV_DCR_PER_UH = 0.002;
export const CONV_TRF = 50e-9;
export const CONV_QG = 10e-9;
export const CONV_VDRIVE = 5;
export const CONV_FREQS = [100e3, 500e3, 1e6, 2e6];
export const CONV_LS = [2.2e-6, 4.7e-6, 10e-6, 22e-6, 47e-6];
export const CONV_PERIODS = 3;
const STEPS_PER_PERIOD = 200;

export interface ConvInput {
  topology: Topology;
  vin: number;
  d: number;
  f: number;
  l: number;
  iout: number;
}

export interface ConvSteady {
  vout: number;
  /** average inductor current, A */
  il: number;
  /** peak-to-peak inductor current ripple, A */
  dI: number;
  /** peak-to-peak output voltage ripple, V (ideal capacitor) */
  dVout: number;
  /** inductor ripple as a percent of the load current */
  ripplePct: number;
  dcm: boolean;
  pout: number;
  losses: { cond: number; sw: number; gate: number };
  /** efficiency, percent */
  eff: number;
}

export function steady(x: ConvInput): ConvSteady {
  const { topology, vin, d, f, l, iout } = x;
  const buck = topology === "buck";
  const vout = buck ? d * vin : vin / (1 - d);
  const il = buck ? iout : iout / (1 - d);
  const dI = buck ? ((vin - vout) * d) / (l * f) : (vin * d) / (l * f);
  const dVout = buck ? dI / (8 * f * CONV_C) : (iout * d) / (f * CONV_C);
  const irms2 = il * il + (dI * dI) / 12;
  const cond = irms2 * (CONV_RDS + CONV_DCR_PER_UH * (l * 1e6));
  const vsw = buck ? vin : vout;
  const sw = 0.5 * vsw * il * CONV_TRF * f;
  const gate = 2 * CONV_QG * CONV_VDRIVE * f;
  const pout = vout * iout;
  const total = cond + sw + gate;
  return {
    vout,
    il,
    dI,
    dVout,
    ripplePct: (dI / iout) * 100,
    dcm: dI / 2 > il,
    pout,
    losses: { cond, sw, gate },
    eff: (pout / (pout + total)) * 100,
  };
}

export interface ConvWave {
  /** seconds */
  t: number[];
  iL: number[];
  vSw: number[];
  vOut: number[];
  /** mean of vOut over the last switching period */
  vOutAvg: number;
  /** peak-to-peak iL over the last switching period */
  iLpp: number;
  tEnd: number;
}

/** Transient simulation of three switching periods with two ideal switches (no dead time, no losses). Null in DCM. */
export function waves(x: ConvInput): ConvWave | null {
  const s = steady(x);
  if (s.dcm || !(s.vout > 0) || !Number.isFinite(s.vout)) return null;
  const T = 1 / x.f;
  const n = STEPS_PER_PERIOD;
  const dt = T / n;
  const nOn = Math.round(x.d * n);
  const on = (t: number) => {
    const k = Math.round(t / dt);
    return (((k - 1) % n) + n) % n < nOn;
  };
  const buck = x.topology === "buck";
  const res = simulate(
    [
      { kind: "V", id: "V1", a: "vin", b: "gnd", volts: x.vin },
      ...(buck
        ? [
            { kind: "S" as const, id: "SH", a: "vin", b: "sw", closed: on },
            { kind: "S" as const, id: "SL", a: "sw", b: "gnd", closed: (t: number) => !on(t) },
            { kind: "L" as const, id: "L1", a: "sw", b: "out", henries: x.l, i0: s.il - s.dI / 2 },
          ]
        : [
            { kind: "L" as const, id: "L1", a: "vin", b: "sw", henries: x.l, i0: s.il - s.dI / 2 },
            { kind: "S" as const, id: "SL", a: "sw", b: "gnd", closed: on },
            { kind: "S" as const, id: "SH", a: "sw", b: "out", closed: (t: number) => !on(t) },
          ]),
      { kind: "C", id: "C1", a: "out", b: "gnd", farads: CONV_C, v0: s.vout },
      { kind: "R", id: "RL", a: "out", b: "gnd", ohms: s.vout / x.iout },
    ],
    { tStop: CONV_PERIODS * T, steps: CONV_PERIODS * n, method: "backward-euler" },
  );
  if (!res.ok) return null;
  const from = (CONV_PERIODS - 1) * n + 1;
  const lastI = res.el.L1.i.slice(from);
  const lastV = res.v.out.slice(from);
  return {
    t: res.t,
    iL: res.el.L1.i,
    vSw: res.v.sw,
    vOut: res.v.out,
    vOutAvg: lastV.reduce((a, b) => a + b, 0) / lastV.length,
    iLpp: Math.max(...lastI) - Math.min(...lastI),
    tEnd: CONV_PERIODS * T,
  };
}
