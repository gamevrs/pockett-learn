/**
 * Pure logic for the pcb-emc widget: a toy radiated-emission estimate for one clock loop.
 * Everything here is an ESTIMATE (Ott's small-loop, differential-mode formula): real boards are often
 * dominated by common-mode currents on cables, which this model ignores.
 */

/** FCC Part 15 Class B radiated limit at 3 m, in dBµV/m (Hz in). 100, 150, 200 and 500 µV/m by band. */
export function fccClassBLimitDbuv(fHz: number): number {
  if (fHz < 88e6) return 40;
  if (fHz < 216e6) return 43.5;
  if (fHz < 960e6) return 46;
  return 54;
}

/** Field strength in V/m to dBµV/m. */
export function vmToDbuv(e: number): number {
  return 20 * Math.log10(Math.max(e, 1e-30) / 1e-6);
}

/** dBµV/m to V/m. */
export function dbuvToVm(db: number): number {
  return 1e-6 * 10 ** (db / 20);
}

/** Ott: E = 263e-16 · f² · A · I / r  (f Hz, A m², I A, r m). Small loop, far field, includes ground reflection. */
export function ottField(fHz: number, areaM2: number, amps: number, rM: number): number {
  return (263e-16 * fHz * fHz * areaM2 * amps) / rM;
}

/** The toy source filter: a first-order low-pass on the clock current with this corner. */
export const FILTER_FC_HZ = 100e6;

export interface EmcParams {
  freqMHz: number;
  /** Current amplitude in mA. */
  currentMa: number;
  riseNs: number;
  areaMm2: number;
  filter: boolean;
  /** Measurement distance, m. */
  rM?: number;
}

export interface Line {
  n: number;
  fHz: number;
  /** Harmonic current amplitude after the trapezoid envelope and the optional filter, A. */
  iA: number;
  eDbuv: number;
  limitDbuv: number;
  marginDb: number;
}

export const F_MIN_HZ = 30e6;
export const F_MAX_HZ = 1e9;

/** Trapezoid envelope: |sin(x)/x| with x = nπ·f·tr. */
export function riseRolloff(fHz: number, riseNs: number): number {
  const x = Math.PI * fHz * riseNs * 1e-9;
  return x < 1e-9 ? 1 : Math.abs(Math.sin(x) / x);
}

/** Odd harmonics n·f of a 50 % duty clock with amplitude 2·I/(nπ), inside the 30 MHz to 1 GHz scan. */
export function spectrum(p: EmcParams): Line[] {
  const r = p.rM ?? 3;
  const f0 = p.freqMHz * 1e6;
  const I = p.currentMa * 1e-3;
  const A = p.areaMm2 * 1e-6;
  const out: Line[] = [];
  for (let n = 1; n * f0 <= F_MAX_HZ; n += 2) {
    const f = n * f0;
    if (f < F_MIN_HZ) continue;
    let iA = ((2 * I) / (n * Math.PI)) * riseRolloff(f, p.riseNs);
    if (p.filter) iA /= Math.sqrt(1 + (f / FILTER_FC_HZ) ** 2);
    const eDbuv = vmToDbuv(ottField(f, A, iA, r));
    const limitDbuv = fccClassBLimitDbuv(f);
    out.push({ n, fHz: f, iA, eDbuv, limitDbuv, marginDb: limitDbuv - eDbuv });
  }
  return out;
}

export interface EmcResult {
  lines: Line[];
  worst: Line | null;
  worstMarginDb: number;
  pass: boolean;
}

export function evaluate(p: EmcParams): EmcResult {
  const lines = spectrum(p);
  let worst: Line | null = null;
  for (const l of lines) if (!worst || l.marginDb < worst.marginDb) worst = l;
  const worstMarginDb = worst ? worst.marginDb : 99;
  return { lines, worst, worstMarginDb, pass: worstMarginDb >= 0 };
}
