/**
 * Pure logic for the power-supply and regulator widgets (no React).
 * PSU: an ideal transformer secondary (12 V RMS sine through a small series resistance) feeding nothing, one diode
 * or a four-diode bridge, a smoothing capacitor and a resistor load, simulated with the shared elec-kit solver.
 */
import { simulate, type TranElement } from "../elec-kit/transient.ts";

export type PsuStage = "ac" | "half" | "full";

/** Secondary voltage, volts RMS (a common low-voltage transformer rating). */
export const SECONDARY_RMS = 12;
export const SECONDARY_PEAK = SECONDARY_RMS * Math.SQRT2;
/** Typical silicon diode forward drop used by the model. */
export const DIODE_DROP = 0.7;
/** Series resistance of the transformer winding and wiring, toy value. */
export const SOURCE_OHMS = 0.5;
const CYCLES = 5;
const STEPS_PER_CYCLE = 800;

/** Frequency of the ripple: mains frequency for half-wave, twice that for full-wave. */
export const rippleFreq = (stage: PsuStage, fMains: number) => (stage === "full" ? 2 * fMains : fMains);
/** Textbook ripple estimate ΔV ≈ I / (f·C), constant load current, ripple small against the peak. */
export const rippleEstimate = (i: number, fRipple: number, c: number) => i / (fRipple * c);
/** Peak of the rectified waveform before smoothing: secondary peak minus the diode drops (one, or two for a bridge). */
export const rectifiedPeak = (stage: PsuStage) => SECONDARY_PEAK - (stage === "ac" ? 0 : stage === "half" ? DIODE_DROP : 2 * DIODE_DROP);

export interface PsuResult {
  ok: true;
  /** Times shown (last three cycles), shifted to start at 0. */
  t: number[];
  vin: number[];
  vout: number[];
  /** Output swing (max − min) over the last two cycles, volts. */
  ripple: number;
  /** Mean output over the last two cycles (an exact number of cycles), volts. */
  dc: number;
  vmax: number;
  vmin: number;
  /** Load resistance used, ohms. */
  rLoad: number;
  /** Mean load current, amps. */
  iMean: number;
  /** Largest current pulse through the secondary, amps. */
  iPeak: number;
  period: number;
}
export type PsuSimResult = PsuResult | { ok: false; message: string };

export function simulatePsu(opts: { stage: PsuStage; smooth: boolean; c: number; iLoad: number; fMains: number }): PsuSimResult {
  const { stage, smooth, c, iLoad, fMains } = opts;
  const period = 1 / fMains;
  const rLoad = rectifiedPeak(stage) / iLoad;
  const src = { kind: "sine", amplitude: SECONDARY_PEAK, freq: fMains } as const;
  const els: TranElement[] = [];
  if (stage === "ac") {
    els.push({ kind: "V", id: "V1", a: "s", b: "gnd", volts: src }, { kind: "R", id: "Rs", a: "s", b: "out", ohms: SOURCE_OHMS });
  } else if (stage === "half") {
    els.push(
      { kind: "V", id: "V1", a: "s", b: "gnd", volts: src },
      { kind: "R", id: "Rs", a: "s", b: "a", ohms: SOURCE_OHMS },
      { kind: "D", id: "D1", a: "a", b: "out", vf: DIODE_DROP, ron: 0.05 },
    );
  } else {
    // bridge: secondary between nodes p and q; out is the + rail, gnd the − rail
    els.push(
      { kind: "V", id: "V1", a: "p", b: "q", volts: src },
      { kind: "R", id: "Rs", a: "p", b: "a", ohms: SOURCE_OHMS },
      { kind: "D", id: "D1", a: "a", b: "out", vf: DIODE_DROP, ron: 0.05 },
      { kind: "D", id: "D2", a: "q", b: "out", vf: DIODE_DROP, ron: 0.05 },
      { kind: "D", id: "D3", a: "gnd", b: "a", vf: DIODE_DROP, ron: 0.05 },
      { kind: "D", id: "D4", a: "gnd", b: "q", vf: DIODE_DROP, ron: 0.05 },
    );
  }
  els.push({ kind: "R", id: "RL", a: "out", b: "gnd", ohms: rLoad });
  if (smooth && stage !== "ac") els.push({ kind: "C", id: "C1", a: "out", b: "gnd", farads: c, v0: rectifiedPeak(stage) });

  const steps = CYCLES * STEPS_PER_CYCLE;
  const res = simulate(els, { tStop: CYCLES * period, steps });
  if (!res.ok) return { ok: false, message: res.message };

  const startShow = 2 * STEPS_PER_CYCLE;
  const startMeasure = 3 * STEPS_PER_CYCLE;
  const vo = res.v.out;
  const vin = res.el.V1.v;
  let vmax = -Infinity;
  let vmin = Infinity;
  let sum = 0;
  let n = 0;
  let iPeak = 0;
  for (let k = startMeasure; k <= steps; k++) {
    vmax = Math.max(vmax, vo[k]);
    vmin = Math.min(vmin, vo[k]);
    if (k < steps) {
      sum += vo[k];
      n++;
    }
    iPeak = Math.max(iPeak, Math.abs(res.el.V1.i[k]));
  }
  const dc = sum / n;
  return {
    ok: true,
    t: res.t.slice(startShow).map((t) => t - res.t[startShow]),
    vin: vin.slice(startShow),
    vout: vo.slice(startShow),
    ripple: vmax - vmin,
    dc,
    vmax,
    vmin,
    rLoad,
    iMean: dc / rLoad,
    iPeak,
    period,
  };
}

/** Linear regulator: input power, output power, heat and efficiency; `dropout` is the minimum Vin − Vout to stay in regulation. */
export interface RegResult {
  kind: "linear" | "switching";
  vin: number;
  vout: number;
  /** Actual output voltage (a linear regulator below its dropout sags to Vin − dropout). */
  voutActual: number;
  i: number;
  pin: number;
  pout: number;
  heatW: number;
  eff: number;
  inRegulation: boolean;
}

export function regulate(opts: { kind: "linear" | "switching"; vin: number; vout: number; i: number; dropout: number; switchingEff: number }): RegResult {
  const { kind, vin, vout, i, dropout, switchingEff } = opts;
  if (kind === "linear") {
    const inReg = vin >= vout + dropout;
    const vo = inReg ? vout : Math.max(0, vin - dropout);
    const pin = vin * i;
    const pout = vo * i;
    return { kind, vin, vout, voutActual: vo, i, pin, pout, heatW: pin - pout, eff: pin > 0 ? pout / pin : 0, inRegulation: inReg };
  }
  // buck: steps down only; needs headroom above the output
  const inReg = vin > vout + 0.3;
  if (!inReg) return { kind, vin, vout, voutActual: 0, i, pin: 0, pout: 0, heatW: 0, eff: 0, inRegulation: false };
  const pout = vout * i;
  const pin = pout / switchingEff;
  return { kind, vin, vout, voutActual: vout, i, pin, pout, heatW: pin - pout, eff: switchingEff, inRegulation: true };
}
