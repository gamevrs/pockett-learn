/**
 * Behavioural model of one inverting (common-emitter style) amplifier stage. NOT a transistor simulation:
 * the output sits at a bias (quiescent) voltage, moves opposite to the input by `gain` times, and is flattened
 * (clipped) at roughly VSAT at the bottom (transistor saturated) and at the supply at the top (transistor cut off).
 */

/** Typical lowest output voltage of a saturated stage (roughly VCE(sat) plus a little emitter drop). */
export const VSAT = 0.2;

export type Clipping = "none" | "top" | "bottom" | "both";

export interface AmpParams {
  /** supply voltage, V */
  vcc: number;
  /** quiescent output as a fraction of the supply (0..1) */
  bias: number;
  /** voltage gain magnitude (the stage inverts) */
  gain: number;
  /** input peak amplitude, V */
  vinAmp: number;
}

export const quiescent = (p: AmpParams) => p.bias * p.vcc;

/** Output for one instantaneous input voltage (inverting, clipped to [VSAT, vcc]). */
export function ampOut(p: AmpParams, vin: number): number {
  return Math.min(p.vcc, Math.max(VSAT, quiescent(p) - p.gain * vin));
}

/** Unclipped output (what the stage would give with unlimited headroom). */
export const ampIdeal = (p: AmpParams, vin: number) => quiescent(p) - p.gain * vin;

export const gainDb = (gain: number) => 20 * Math.log10(gain);

export interface AmpResult {
  q: number;
  clipping: Clipping;
  /** output peak-to-peak after clipping, V */
  vpp: number;
  /** largest input amplitude that does not clip at this bias and gain, V */
  maxClean: number;
}

export function ampAnalyse(p: AmpParams): AmpResult {
  const q = quiescent(p);
  const swing = p.gain * p.vinAmp;
  const eps = 1e-9;
  const top = q + swing > p.vcc + eps;
  const bottom = q - swing < VSAT - eps;
  const hi = Math.min(p.vcc, q + swing);
  const lo = Math.max(VSAT, q - swing);
  return {
    q,
    clipping: top && bottom ? "both" : top ? "top" : bottom ? "bottom" : "none",
    vpp: Math.max(0, hi - lo),
    maxClean: Math.max(0, Math.min(p.vcc - q, q - VSAT) / p.gain),
  };
}

/** Two cycles of input and output, `n` points each, as [t (cycles), v] pairs. */
export function ampWave(p: AmpParams, n = 160, cycles = 2) {
  const vin: [number, number][] = [];
  const out: [number, number][] = [];
  const ideal: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * cycles;
    const v = p.vinAmp * Math.sin(2 * Math.PI * t);
    vin.push([t, v]);
    out.push([t, ampOut(p, v)]);
    ideal.push([t, ampIdeal(p, v)]);
  }
  return { vin, out, ideal };
}
