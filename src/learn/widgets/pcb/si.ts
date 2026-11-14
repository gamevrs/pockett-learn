/**
 * Pure logic for the PCB power / signal-integrity widgets (no UI, no React). Every model here is a simplified
 * teaching model; the doc comments say which simplification each one makes.
 */

// ───────────────────────────── return path and loop area (pcb-returnpath) ─────────────────────────────

export type Pt = readonly [number, number];
export type PlaneKind = "solid" | "split" | "stitch" | "none";
export type FreqKind = "dc" | "hf";

/** Board is 90 × 55 mm (the drawing uses 4 px per mm). */
export const BOARD = { w: 90, h: 55 } as const;
/** Distance between the signal trace and the plane under it (a typical 4-layer prepreg is about 0.1 to 0.2 mm). */
export const PLANE_GAP_MM = 0.2;

/** The dog-leg signal route, driver pin first, receiver pin last (mm). */
export const SIGNAL: Pt[] = [
  [12, 36],
  [26, 36],
  [26, 10],
  [66, 10],
  [66, 15],
  [78, 15],
];
/** Ground pins of the driver and the receiver (mm). */
export const G_DRIVER: Pt = [12, 46];
export const G_RECEIVER: Pt = [78, 20];
/** A slot (gap) cut across the plane: from the top edge down to `end`. The plane is still joined below it. */
export const SLOT = { x0: 51, x1: 57, end: 46 } as const;
/** Where a stitching capacitor bridges the slot (mm, just below the trace). */
export const STITCH_Y = 12.7;

/** Polygon area by the shoelace formula (absolute value). */
export function polygonArea(pts: readonly Pt[]): number {
  let s = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[(i + 1) % pts.length];
    s += x1 * y2 - x2 * y1;
  }
  return Math.abs(s) / 2;
}

export function pathLength(pts: readonly Pt[]): number {
  let s = 0;
  for (let i = 1; i < pts.length; i++) s += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  return s;
}

/** Offset a polyline to its right-hand side by `d` with mitred corners (right-angle corners only need the simple case). */
export function offsetPolyline(pts: readonly Pt[], d: number): Pt[] {
  const out: Pt[] = [];
  const normal = (a: Pt, b: Pt): Pt => {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const l = Math.hypot(dx, dy) || 1;
    // Screen coordinates (y down): the right-hand side of travel direction (dx, dy) is (-dy, dx).
    return [-dy / l, dx / l];
  };
  for (let i = 0; i < pts.length; i++) {
    if (i === 0) {
      const n = normal(pts[0], pts[1]);
      out.push([pts[0][0] + n[0] * d, pts[0][1] + n[1] * d]);
    } else if (i === pts.length - 1) {
      const n = normal(pts[i - 1], pts[i]);
      out.push([pts[i][0] + n[0] * d, pts[i][1] + n[1] * d]);
    } else {
      const n1 = normal(pts[i - 1], pts[i]);
      const n2 = normal(pts[i], pts[i + 1]);
      const k = d / (1 + n1[0] * n2[0] + n1[1] * n2[1]);
      out.push([pts[i][0] + (n1[0] + n2[0]) * k, pts[i][1] + (n1[1] + n2[1]) * k]);
    }
  }
  return out;
}

/** The return path from the receiver's ground pin back to the driver's ground pin (mm, in that order). */
export function returnPath(plane: PlaneKind, freq: FreqKind): Pt[] {
  if (plane === "none") {
    // A separate ground wire routed round the edge of the board, at any frequency.
    return [G_RECEIVER, [72, 20], [72, 52], [6, 52], [6, 46], G_DRIVER];
  }
  const detourY = SLOT.end + 2.5;
  if (freq === "dc") {
    // Current spreads out over the whole plane; the middle of that spread is the shortest route.
    if (plane === "solid") return [G_RECEIVER, G_DRIVER];
    // A slot is a gap in the copper: DC cannot cross it either (the stitching capacitor is open at DC).
    return [G_RECEIVER, [SLOT.x1 + 1, detourY], [SLOT.x0 - 1, detourY], G_DRIVER];
  }
  // High frequency: the return current hugs the trace on the plane (the path of least inductance).
  const hug = offsetPolyline(SIGNAL, PLANE_GAP_MM).reverse(); // receiver end first
  const mid: Pt[] = [];
  const yTrace = 10 + PLANE_GAP_MM;
  if (plane === "split") mid.push([SLOT.x1 + 1, yTrace], [SLOT.x1 + 1, detourY], [SLOT.x0 - 1, detourY], [SLOT.x0 - 1, yTrace]);
  if (plane === "stitch") mid.push([SLOT.x1 + 1, yTrace], [SLOT.x1 + 1, STITCH_Y], [SLOT.x0 - 1, STITCH_Y], [SLOT.x0 - 1, yTrace]);
  // hug = [P(receiver pin), P(66,15)side, P(66,10)side, P(26,10)side, ..., P(driver pin)]; the slot sits on the y = 10 run.
  // Insert the detour after the corner at x = 66 and before the corner at x = 26.
  return [G_RECEIVER, hug[0], hug[1], hug[2], ...mid, hug[3], hug[4], hug[5], G_DRIVER];
}

export interface LoopResult {
  /** Enclosed area between the signal route and the return route, mm². */
  areaMm2: number;
  /** Area of the best case (solid plane, high frequency), mm². */
  bestMm2: number;
  /** areaMm2 / bestMm2: the toy "relative radiation / pickup" factor. */
  rel: number;
  ret: Pt[];
}

/** Loop area for a setting: the closed polygon "out along the signal, back along the return". */
export function loopArea(plane: PlaneKind, freq: FreqKind): LoopResult {
  const ret = returnPath(plane, freq);
  const area = polygonArea([...SIGNAL, ...ret]);
  const best = polygonArea([...SIGNAL, ...returnPath("solid", "hf")]);
  return { areaMm2: area, bestMm2: best, rel: area / best, ret };
}

// ───────────────────────────── decoupling placement (pcb-decap) ─────────────────────────────

export const DECAP_PLACE_MM = { "1mm": 1, "5mm": 5, "20mm": 20 } as const;
export const DECAP_VIA_MM = { pad: 0, "5mm": 5, shared: 15 } as const;
export type DecapPlace = keyof typeof DECAP_PLACE_MM;
export type DecapVia = keyof typeof DECAP_VIA_MM;
export type DecapValue = "100nF" | "1uF" | "10uF";

/** Toy numbers (all stated on screen). */
export const DECAP = {
  /** Rule of thumb: about 1 nH per mm of loop path. */
  nhPerMm: 1,
  /** Capacitor body ESL (typical; bigger capacitances come in bigger packages) plus 0.3 nH of pad and via. */
  esl: { "100nF": 0.5, "1uF": 0.6, "10uF": 0.8 } as Record<DecapValue, number>,
  viaPad: 0.3,
  capF: { "100nF": 100e-9, "1uF": 1e-6, "10uF": 10e-6 } as Record<DecapValue, number>,
  /** The load step: 50 mA in 1 ns that then lasts 20 ns. */
  stepA: 0.05,
  riseS: 1e-9,
  holdS: 20e-9,
  vdd: 3.3,
  /** Example budget: ±5% of 3.3 V. */
  budgetV: 0.165,
};

export interface DecapResult {
  loopNh: number;
  /** Inductive part L·di/dt, volts. */
  inductiveV: number;
  /** Charge part I·t/C at the end of the hold, volts. */
  chargeV: number;
  /** Largest dip below 3.3 V, volts. */
  dipV: number;
  ok: boolean;
  /** Self-resonant frequency of the capacitor in this loop, Hz. */
  srfHz: number;
}

export function decap(place: DecapPlace, via: DecapVia, value: DecapValue): DecapResult {
  const loopNh = (DECAP_PLACE_MM[place] + DECAP_VIA_MM[via]) * DECAP.nhPerMm + DECAP.esl[value] + DECAP.viaPad;
  const L = loopNh * 1e-9;
  const inductiveV = (L * DECAP.stepA) / DECAP.riseS;
  const chargeV = (DECAP.stepA * (DECAP.holdS + DECAP.riseS / 2)) / DECAP.capF[value];
  const dipV = Math.max(inductiveV + (DECAP.stepA * DECAP.riseS * 0.5) / DECAP.capF[value], chargeV);
  return { loopNh, inductiveV, chargeV, dipV, ok: dipV <= DECAP.budgetV + 1e-12, srfHz: 1 / (2 * Math.PI * Math.sqrt(L * DECAP.capF[value])) };
}

/** Supply voltage at the chip pin over time (first-order toy: the cap supplies all the current, V = V0 − L·di/dt − q/C). */
export function decapWave(place: DecapPlace, via: DecapVia, value: DecapValue, n = 160, tEndS = 40e-9): { t: number; v: number }[] {
  const L = decap(place, via, value).loopNh * 1e-9;
  const C = DECAP.capF[value];
  const t1 = 5e-9; // current starts rising at 5 ns
  const t2 = t1 + DECAP.riseS;
  const t3 = t2 + DECAP.holdS;
  const t4 = t3 + DECAP.riseS;
  const out: { t: number; v: number }[] = [];
  for (let k = 0; k <= n; k++) {
    const t = (k / n) * tEndS;
    let di = 0;
    if (t >= t1 && t < t2) di = DECAP.stepA / DECAP.riseS;
    else if (t >= t3 && t < t4) di = -DECAP.stepA / DECAP.riseS;
    // charge drawn so far (integral of i)
    let q = 0;
    if (t >= t1) q += (DECAP.stepA * (Math.min(t, t2) - t1) ** 2) / (2 * DECAP.riseS);
    if (t > t2) q += DECAP.stepA * (Math.min(t, t3) - t2);
    if (t > t3) q += (DECAP.stepA * (Math.min(t, t4) - t3)) - (DECAP.stepA * (Math.min(t, t4) - t3) ** 2) / (2 * DECAP.riseS);
    out.push({ t, v: DECAP.vdd - L * di - q / C });
  }
  return out;
}

// ───────────────────────────── critical length (pcb-critical) ─────────────────────────────

export const RISE_STEPS_NS = [0.1, 0.2, 0.5, 1, 2, 5, 10] as const;
export type Layer = "outer" | "inner";
/** Typical effective dielectric constants: outer microstrip (half air) about 3.3, inner stripline about 4.3. */
export const ER_EFF: Record<Layer, number> = { outer: 3.3, inner: 4.3 };
export const C_CM_PER_NS = 30;

/** Signal speed in cm/ns: c / sqrt(er_eff), with c about 30 cm/ns. */
export function speedCmPerNs(layer: Layer): number {
  return C_CM_PER_NS / Math.sqrt(ER_EFF[layer]);
}

/** Rule of thumb: a trace starts to need transmission-line treatment beyond rise time × speed / 6 (some use /4 to /10). */
export function criticalLengthCm(riseNs: number, speedCmNs: number, divisor = 6): number {
  return (riseNs * speedCmNs) / divisor;
}

export interface CriticalResult {
  speed: number;
  criticalCm: number;
  edgeCm: number;
  tofNs: number;
  ratio: number;
  kneeMHz: number;
  isLine: boolean;
}

export function critical(riseNs: number, lengthCm: number, layer: Layer): CriticalResult {
  const speed = speedCmPerNs(layer);
  const criticalCm = criticalLengthCm(riseNs, speed);
  const tofNs = lengthCm / speed;
  return { speed, criticalCm, edgeCm: riseNs * speed, tofNs, ratio: tofNs / riseNs, kneeMHz: 350 / riseNs, isLine: lengthCm > criticalCm };
}

// ───────────────────────────── reflections (pcb-bounce) ─────────────────────────────

export type ZL = number | "open";
export const Z0_LINE = 50;
export const STEP_V = 3.3;
export const DELAY_NS = 1;

export function gamma(zLoad: ZL, z0 = Z0_LINE): number {
  if (zLoad === "open") return 1;
  return (zLoad - z0) / (zLoad + z0);
}

export interface Lattice {
  gammaS: number;
  gammaL: number;
  /** Voltage of the first wave launched into the line. */
  launched: number;
  /** Waves travelling to the load: forward[k] arrives at (2k + 1)·T. */
  forward: number[];
  /** Waves reflected from the load: back[k] = forward[k]·ΓL arrives at the source at (2k + 2)·T. */
  back: number[];
  /** Final (DC) load voltage. */
  finalV: number;
}

/** Bounce (lattice) diagram of a step on a lossless line: `n` round trips. */
export function lattice(zs: number, zl: ZL, vs = STEP_V, z0 = Z0_LINE, n = 12): Lattice {
  const gs = (zs - z0) / (zs + z0);
  const gl = gamma(zl, z0);
  const launched = (vs * z0) / (zs + z0);
  const forward: number[] = [];
  const back: number[] = [];
  let w = launched;
  for (let k = 0; k < n; k++) {
    forward.push(w);
    back.push(w * gl);
    w = w * gl * gs;
  }
  const finalV = zl === "open" ? vs : (vs * zl) / (zs + zl);
  return { gammaS: gs, gammaL: gl, launched, forward, back, finalV };
}

export interface Bounce {
  lat: Lattice;
  /** Voltage steps at the load: [time ns, volts] holding from that time on. */
  load: { t: number; v: number }[];
  source: { t: number; v: number }[];
  /** Largest load voltage above the final value, percent of the final value (0 when the final value is 0). */
  overshootPct: number;
  /** Load voltage stays within 5% of its final value from 4T on, up to 8T. */
  settled: boolean;
  tEndNs: number;
}

/** Staircase voltages at the load and at the source, up to 8T. */
export function bounce(zs: number, zl: ZL, T = DELAY_NS): Bounce {
  const lat = lattice(zs, zl);
  const load: { t: number; v: number }[] = [{ t: 0, v: 0 }];
  const source: { t: number; v: number }[] = [{ t: 0, v: lat.launched }];
  let vl = 0;
  let vsrc = lat.launched;
  const tEnd = 8 * T;
  for (let k = 0; k < lat.forward.length; k++) {
    const tl = (2 * k + 1) * T;
    if (tl <= tEnd) {
      vl += lat.forward[k] * (1 + lat.gammaL);
      load.push({ t: tl, v: vl });
    }
    const ts = (2 * k + 2) * T;
    if (ts <= tEnd) {
      vsrc += lat.back[k] * (1 + lat.gammaS);
      source.push({ t: ts, v: vsrc });
    }
  }
  const finalV = lat.finalV;
  let peak = 0;
  for (const p of load) peak = Math.max(peak, p.v);
  const overshootPct = finalV > 1e-9 ? Math.max(0, ((peak - finalV) / finalV) * 100) : 0;
  let settled = true;
  if (finalV > 1e-9) {
    for (const p of load) {
      // the value that holds from p.t until the next step; check every value held at or after 4T
      const idx = load.indexOf(p);
      const next = load[idx + 1]?.t ?? tEnd;
      if (next > 4 * T && Math.abs(p.v - finalV) > 0.05 * finalV) settled = false;
    }
  } else {
    for (const p of load) if (p.t >= 4 * T && Math.abs(p.v) > 0.05 * STEP_V) settled = false;
  }
  return { lat, load, source, overshootPct, settled, tEndNs: tEnd };
}

/** Value of a staircase at time t. */
export function stairAt(steps: { t: number; v: number }[], t: number): number {
  let v = steps[0].v;
  for (const s of steps) if (s.t <= t) v = s.v;
  return v;
}

// ───────────────────────────── microstrip Z0 (pcb-z0) ─────────────────────────────

export const OZ_MM: Record<string, number> = { "0.5": 0.0174, "1": 0.0348, "2": 0.0696 };

/** IPC-2141 microstrip approximation: Z0 = 87/sqrt(er + 1.41) · ln(5.98 h / (0.8 w + t)). Inputs in the same length unit. */
export function microstripZ0(w: number, h: number, t: number, er: number): number {
  return (87 / Math.sqrt(er + 1.41)) * Math.log((5.98 * h) / (0.8 * w + t));
}

/** Simple effective-permittivity approximation: (er + 1)/2 + (er − 1)/2 · (1 + 12 h / w)^−0.5. */
export function erEff(w: number, h: number, er: number): number {
  return (er + 1) / 2 + ((er - 1) / 2) * (1 + (12 * h) / w) ** -0.5;
}

/** Roughly where the formula is trusted: 0.1 < w/h < 2 and 1 < er < 15. */
export function z0Valid(w: number, h: number, er: number): boolean {
  const r = w / h;
  return r > 0.1 && r < 2 && er > 1 && er < 15;
}

// ───────────────────────────── crosstalk (pcb-crosstalk) ─────────────────────────────

/** Toy scale: noise at the largest possible coupling, percent of the aggressor swing. */
export const XT_MAX_PCT = 24;
/** Parallel length at which coupling is about 63% saturated (for a roughly 1 ns edge), cm. */
export const XT_SAT_CM = 8;
/** Trace width in units of the dielectric height (about a 50 Ω microstrip). */
export const XT_W_OVER_H = 1.5;

/** Coupling 1/(1 + (s/h)²) over a plane; without a nearby plane the field is not held down, so the effective height is about 4× larger. */
export function coupling(spacingH: number, plane: boolean): number {
  const s = plane ? spacingH : spacingH / 4;
  return 1 / (1 + s * s);
}

export function crosstalkPct(spacingH: number, lengthCm: number, plane: boolean): number {
  return XT_MAX_PCT * coupling(spacingH, plane) * (1 - Math.exp(-lengthCm / XT_SAT_CM));
}

/** 3W rule: centre-to-centre spacing at least 3× the trace width. Edge gap s, width w = 1.5 h. */
export function threeW(spacingH: number): { centreH: number; needH: number; ok: boolean } {
  const centreH = spacingH + XT_W_OVER_H;
  const needH = 3 * XT_W_OVER_H;
  return { centreH, needH, ok: centreH >= needH - 1e-9 };
}
