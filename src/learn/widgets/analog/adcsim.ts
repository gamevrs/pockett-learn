/**
 * Sampling and quantisation model. Input: a sine with amplitude Vref/2 centred on Vref/2 (full scale for an
 * ideal unipolar ADC). Conversion: code = min(floor(v / LSB), 2^bits − 1), reconstructed at the middle of the
 * code's step: (code + 0.5)·LSB, so the error is within ±½ LSB.
 */

export const levels = (bits: number) => 2 ** bits;
export const lsb = (vref: number, bits: number) => vref / 2 ** bits;
/** Ideal SNR of an n-bit converter for a full-scale sine, dB (assumes only quantisation noise). */
export const idealSnr = (bits: number) => 6.02 * bits + 1.76;

export function code(v: number, vref: number, bits: number) {
  return Math.max(0, Math.min(Math.floor((v / vref) * 2 ** bits), 2 ** bits - 1));
}
export const reconstruct = (c: number, vref: number, bits: number) => (c + 0.5) * lsb(vref, bits);

/** Frequency a sampled sine appears at: |f − k·fs| with k the nearest integer to f/fs (always ≤ fs/2). */
export function aliasFreq(f: number, fs: number) {
  return Math.abs(f - Math.round(f / fs) * fs);
}
/** Signed version: samples of sin(2πf·n/fs) equal samples of sin(2π·fsigned·n/fs). */
export const aliasSigned = (f: number, fs: number) => f - Math.round(f / fs) * fs;
/** True when f is above the Nyquist frequency fs/2 (strictly), so the ADC reports a false lower frequency. */
export const isAliased = (f: number, fs: number) => f > fs / 2 + 1e-9;

export interface AdcParams {
  f: number;
  fs: number;
  bits: number;
  vref: number;
}

export function adcView(p: AdcParams, periods = 4, filtered = false) {
  const W = periods / p.f;
  const amp = filtered && isAliased(p.f, p.fs) ? 0 : 1;
  const sig = (t: number) => p.vref / 2 + amp * (p.vref / 2) * Math.sin(2 * Math.PI * p.f * t);
  const N = Math.floor(W * p.fs + 1e-9);
  const samples: { t: number; v: number; c: number; q: number }[] = [];
  for (let n = 0; n <= N; n++) {
    const t = n / p.fs;
    const v = sig(t);
    const c = code(v, p.vref, p.bits);
    samples.push({ t, v, c, q: reconstruct(c, p.vref, p.bits) });
  }
  const cont: [number, number][] = [];
  const M = Math.min(1200, Math.max(200, periods * 64));
  for (let i = 0; i <= M; i++) {
    const t = (i / M) * W;
    cont.push([t, sig(t)]);
  }
  const stair: [number, number][] = [];
  samples.forEach((s, i) => {
    const tEnd = i + 1 < samples.length ? samples[i + 1].t : W;
    stair.push([s.t, s.q], [tEnd, s.q]);
  });
  // the dashed "what you will see" sine through the samples
  const fa = aliasSigned(p.f, p.fs);
  const alias: [number, number][] = [];
  for (let i = 0; i <= M; i++) {
    const t = (i / M) * W;
    alias.push([t, p.vref / 2 + amp * (p.vref / 2) * Math.sin(2 * Math.PI * fa * t)]);
  }
  return { W, samples, cont, stair, alias };
}
