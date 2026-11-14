/**
 * Pure logic for the reactance and filter widgets (no React): reactance, first-order RC response in closed form,
 * and a transient run of the same filter with the shared elec-kit solver.
 */
import { peakAfter, simulate, type TranElement } from "../elec-kit/transient.ts";

/** Capacitive reactance XC = 1 / (2π f C), ohms. */
export const reactanceC = (f: number, c: number) => 1 / (2 * Math.PI * f * c);
/** Inductive reactance XL = 2π f L, ohms. */
export const reactanceL = (f: number, l: number) => 2 * Math.PI * f * l;
/** Frequency where XC = XL: f0 = 1 / (2π √(LC)). */
export const resonanceHz = (l: number, c: number) => 1 / (2 * Math.PI * Math.sqrt(l * c));

/** First-order RC cutoff fc = 1 / (2π R C). */
export const cutoffHz = (r: number, c: number) => 1 / (2 * Math.PI * r * c);

export type FilterType = "low" | "high";

/** |H| for the first-order RC filter: low 1/√(1+(f/fc)²), high (f/fc)/√(1+(f/fc)²). */
export function gainOf(type: FilterType, f: number, fc: number): number {
  const x = f / fc;
  return type === "low" ? 1 / Math.sqrt(1 + x * x) : x / Math.sqrt(1 + x * x);
}
/** Voltage ratio to decibels: 20·log10(ratio). */
export const toDb = (ratio: number) => 20 * Math.log10(ratio);
/** Phase of Vout relative to Vin in degrees: low −atan(f/fc), high +atan(fc/f). */
export function phaseDeg(type: FilterType, f: number, fc: number): number {
  return type === "low" ? -(Math.atan(f / fc) * 180) / Math.PI : (Math.atan(fc / f) * 180) / Math.PI;
}

export type TestWave = "sine" | "square";

export interface FilterScope {
  ok: true;
  t: number[];
  vin: number[];
  vout: number[];
  /** Measured output amplitude for a 1 V sine input (peak of the run); null for a square wave. */
  measured: number | null;
  period: number;
}
export type FilterScopeResult = FilterScope | { ok: false; message: string };

/**
 * Three periods of a 1 V-amplitude test wave through the filter. The capacitor starts at its exact steady-state
 * voltage, so there is no start-up transient to wait for (sine: trapezoidal, 300 steps a period; square: backward Euler).
 * Low-pass takes the output across C, high-pass across R.
 */
export function simulateFilter(opts: { type: FilterType; r: number; c: number; wave: TestWave; f: number }): FilterScopeResult {
  const { type, r, c, wave, f } = opts;
  const fc = cutoffHz(r, c);
  const tau = r * c;
  const period = 1 / f;
  // The capacitor voltage obeys the low-pass equation for either filter type.
  let v0: number;
  if (wave === "sine") {
    const x = f / fc;
    v0 = -x / (1 + x * x);
  } else {
    v0 = -Math.tanh(period / 2 / (2 * tau));
  }
  const src = wave === "sine" ? ({ kind: "sine", amplitude: 1, freq: f } as const) : ({ kind: "square", low: -1, high: 1, freq: f } as const);
  const els: TranElement[] =
    type === "low"
      ? [
          { kind: "V", id: "V1", a: "in", b: "gnd", volts: src },
          { kind: "R", id: "R1", a: "in", b: "out", ohms: r },
          { kind: "C", id: "C1", a: "out", b: "gnd", farads: c, v0 },
        ]
      : [
          { kind: "V", id: "V1", a: "in", b: "gnd", volts: src },
          { kind: "C", id: "C1", a: "in", b: "out", farads: c, v0 },
          { kind: "R", id: "R1", a: "out", b: "gnd", ohms: r },
        ];
  const res = simulate(els, { tStop: 3 * period, steps: wave === "sine" ? 900 : 1500, method: wave === "sine" ? "trapezoidal" : "backward-euler" });
  if (!res.ok) return { ok: false, message: res.message };
  return { ok: true, t: res.t, vin: res.v.in, vout: res.v.out, measured: wave === "sine" ? peakAfter(res, res.v.out, 0) : null, period };
}
