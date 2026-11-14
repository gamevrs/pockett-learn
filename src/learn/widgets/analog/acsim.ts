/**
 * Pure logic for the AC explorer (no React): sine, square and triangle waves with a phase, the RMS computed from
 * samples, and the closed-form RMS it is checked against (sine: peak/√2, square: peak, triangle: peak/√3).
 */
export type AcShape = "sine" | "square" | "triangle";

export const AC_FREQS = [1, 2, 5, 10, 20, 50, 60, 100, 200, 500, 1000];
export const AC_AMPS = [0.5, 1, 2, 3.3, 5, 9, 12];
/** Peak voltages of the nominal mains: √2 × 120 = 169.7 V and √2 × 230 = 325.3 V. */
export const AC_MAINS_AMPS = [169.7, 325.3];
/** The periods shown on the scope. */
export const AC_PERIODS = 2;

/** One wave at time t seconds: amplitude `amp` (peak), frequency `freq` Hz, phase in degrees (positive = leads, i.e. the wave is shifted earlier). All start at 0 rising (square: high first). */
export function waveform(shape: AcShape, amp: number, freq: number, t: number, phaseDeg = 0): number {
  const theta = 2 * Math.PI * freq * t + (phaseDeg * Math.PI) / 180;
  const s = Math.sin(theta);
  switch (shape) {
    case "sine":
      return amp * s;
    case "square":
      return amp * (s >= 0 ? 1 : -1);
    case "triangle":
      return amp * (2 / Math.PI) * Math.asin(s);
  }
}

/** Closed-form RMS for each shape, from the peak. */
export function rmsFormula(shape: AcShape, peak: number): number {
  switch (shape) {
    case "sine":
      return peak / Math.SQRT2;
    case "square":
      return peak;
    case "triangle":
      return peak / Math.sqrt(3);
  }
}

/** RMS from samples: the square root of the mean of the squares over one whole period (midpoint rule, n samples). */
export function rmsFromSamples(shape: AcShape, amp: number, freq: number, n = 4000): number {
  let sum = 0;
  for (let k = 0; k < n; k++) {
    const v = waveform(shape, amp, freq, ((k + 0.5) / n) / freq);
    sum += v * v;
  }
  return Math.sqrt(sum / n);
}

/** Points for a plot: `periods` periods in `n` steps. */
export function wavePoints(shape: AcShape, amp: number, freq: number, phaseDeg: number, periods = AC_PERIODS, n = 600): [number, number][] {
  const tEnd = periods / freq;
  return Array.from({ length: n + 1 }, (_, k) => {
    const t = (k / n) * tEnd;
    return [t, waveform(shape, amp, freq, t, phaseDeg)] as [number, number];
  });
}
