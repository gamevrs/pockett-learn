/**
 * A toy oscilloscope: pure logic, no React. The signal under test is a 3.3 V logic square wave at 1 MHz with 3 ns edges.
 * Between the signal and the screen sit four things the lesson is about:
 *
 *   - the ground lead: a long clip lead is an inductor (typically ~150 nH) that rings with the probe tip's capacitance
 *     (typically ~12 pF) after every fast edge; a short spring ground (~12 nH) rings far above what the scope can show;
 *   - the probe: 10x divides the signal by ten and has a high bandwidth; 1x has about 6 MHz of bandwidth (typical);
 *   - the channel's "probe" setting: it only changes the scale factor the scope uses to label the screen, so a 10x probe on a channel
 *     still set to 1x shows a trace ten times too small;
 *   - the scope's own bandwidth (100 MHz, a typical entry-level figure).
 *
 * The screen is 10 divisions wide and 8 high; the trigger point sits 2 divisions in from the left, and 0 V sits 1 division up from the bottom.
 */

export const SCOPE = {
  /** the signal under test */
  amp: 3.3,
  period: 1e-6,
  riseTime: 3e-9,
  /** probe tip capacitance, farads (typical) and the loop resistance that damps the ring, ohms (source plus lead, typical) */
  cTip: 12e-12,
  rLoop: 40,
  /** ground-lead inductance, henries (typical) */
  lLong: 150e-9,
  lShort: 12e-9,
  /** bandwidths, hertz (typical) */
  scopeBw: 100e6,
  probe1xBw: 6e6,
  /** screen */
  divsX: 10,
  divsY: 8,
  /** 0 V is this many divisions above the bottom of the screen */
  zeroDiv: 1,
  /** the trigger point is this many divisions from the left edge */
  trigDiv: 2,
  /** simulation step, seconds */
  dt: 1e-10,
};

export type Ground = "clip" | "spring";
export type Edge = "rise" | "fall";
export type ProbeX = 1 | 10;

/** Volts per division as the scope labels them. */
export const VDIVS = [0.1, 0.2, 0.5, 1, 2, 5, 10];
/** Seconds per division. */
export const TDIVS = [20e-9, 50e-9, 100e-9, 200e-9, 500e-9, 1e-6, 2e-6, 5e-6];

export interface ScopeSim {
  dt: number;
  /** the time of y[0], seconds relative to the rising edge */
  t0: number;
  /** the trace as a fraction of the signal swing (1 = 3.3 V), one period long, repeating */
  y: Float32Array;
  /** the biggest value reached, as a fraction (1 = no overshoot) */
  peak: number;
}

const cache = new Map<string, ScopeSim>();

/** The signal's drive: 0 before the rising edge, 1 after it, back to 0 half a period later; edges are straight ramps. */
function drive(t: number): number {
  const tr = SCOPE.riseTime;
  const half = SCOPE.period / 2;
  if (t < half) return Math.min(1, Math.max(0, t / tr));
  return 1 - Math.min(1, Math.max(0, (t - half) / tr));
}

/** Simulate one settled period of the signal through the ground loop, the probe and the scope. Cached by (ground, probe). */
export function scopeSim(ground: Ground, probe: ProbeX): ScopeSim {
  const key = `${ground}:${probe}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const { dt, period } = SCOPE;
  const n = Math.round(period / dt);
  const t0 = -period / 4;
  const L = ground === "clip" ? SCOPE.lLong : SCOPE.lShort;
  const w0 = 1 / Math.sqrt(L * SCOPE.cTip);
  const zeta = (SCOPE.rLoop / 2) * Math.sqrt(SCOPE.cTip / L);
  const tauScope = 1 / (2 * Math.PI * SCOPE.scopeBw);
  const tauProbe = probe === 1 ? 1 / (2 * Math.PI * SCOPE.probe1xBw) : 0;
  const y = new Float32Array(n);
  // the ground loop is a second-order low-pass: y1'' + 2 zeta w0 y1' + w0^2 y1 = w0^2 u
  let a = 0;
  let av = 0;
  let b = 0;
  let c = 0;
  let peak = 0;
  for (let i = 0; i < n; i++) {
    const u = drive(t0 + i * dt);
    av += dt * (w0 * w0 * (u - a) - 2 * zeta * w0 * av);
    a += dt * av;
    b = probe === 10 ? a : b + (dt / tauProbe) * (a - b);
    c += (dt / tauScope) * (b - c);
    y[i] = c;
    if (c > peak) peak = c;
  }
  const sim = { dt, t0, y, peak };
  cache.set(key, sim);
  return sim;
}

/** The trace value at time t (seconds relative to the rising edge), looking up the repeating period. */
export function valueAt(sim: ScopeSim, t: number): number {
  const n = sim.y.length;
  const idx = Math.round((t - sim.t0) / sim.dt);
  return sim.y[((idx % n) + n) % n];
}

export interface TriggerResult {
  /** did the trigger find a crossing at all */
  triggered: boolean;
  /** the time of the crossing, seconds relative to the rising edge */
  time: number;
}

/**
 * Find where the picture starts. `level` is in displayed volts and `scale` converts the 3.3 V signal into displayed volts
 * (1 when the probe and the channel setting agree). The trigger fires on the first crossing of the level on the chosen edge.
 */
export function findTrigger(sim: ScopeSim, level: number, edge: Edge, scale: number): TriggerResult {
  const yl = level / (SCOPE.amp * scale);
  const half = SCOPE.period / 2;
  const from = edge === "rise" ? -20e-9 : half - 20e-9;
  const to = edge === "rise" ? half - 20e-9 : SCOPE.period - 20e-9;
  const i0 = Math.round((from - sim.t0) / sim.dt);
  const i1 = Math.round((to - sim.t0) / sim.dt);
  for (let i = Math.max(1, i0); i < Math.min(sim.y.length, i1); i++) {
    const p = sim.y[i - 1];
    const q = sim.y[i];
    const hit = edge === "rise" ? p < yl && q >= yl : p > yl && q <= yl;
    if (hit) {
      const f = (yl - p) / (q - p || 1);
      return { triggered: true, time: sim.t0 + (i - 1 + f) * sim.dt };
    }
  }
  return { triggered: false, time: 0 };
}

/** One screen column's trace: the lowest and highest displayed volts that fell in that column (peak detect). */
export interface Column {
  lo: number;
  hi: number;
}

/** The trace across the screen, starting `trigDiv` divisions before `tTrig`: `bins` columns of (lo, hi) in displayed volts. */
export function traceColumns(sim: ScopeSim, scale: number, tTrig: number, tdiv: number, bins = 500): Column[] {
  const start = tTrig - SCOPE.trigDiv * tdiv;
  const span = SCOPE.divsX * tdiv;
  const out: Column[] = [];
  const k = SCOPE.amp * scale;
  for (let b = 0; b < bins; b++) {
    const a = start + (b / bins) * span;
    const z = start + ((b + 1) / bins) * span;
    const ia = Math.round((a - sim.t0) / sim.dt);
    const iz = Math.max(ia, Math.round((z - sim.t0) / sim.dt));
    let lo = Infinity;
    let hi = -Infinity;
    const n = sim.y.length;
    const count = iz - ia + 1;
    // very slow sweeps cover many periods: a full period already holds every extreme, so look at no more than that
    const last = count > n ? ia + n - 1 : iz;
    for (let i = ia; i <= last; i++) {
      const v = sim.y[((i % n) + n) % n];
      if (v < lo) lo = v;
      if (v > hi) hi = v;
    }
    out.push({ lo: lo * k, hi: hi * k });
  }
  return out;
}

/** Turn columns into one polyline of [column fraction 0..1, displayed volts] that visits each column's lo and hi. */
export function columnsToPolyline(cols: Column[]): [number, number][] {
  const pts: [number, number][] = [];
  let last = 0;
  cols.forEach((c, i) => {
    const x = (i + 0.5) / cols.length;
    const first = Math.abs(last - c.lo) <= Math.abs(last - c.hi) ? c.lo : c.hi;
    const second = first === c.lo ? c.hi : c.lo;
    pts.push([x, first]);
    if (second !== first) pts.push([x, second]);
    last = second;
  });
  return pts;
}

/** Phases for the smeared, un-triggered picture: each sweep starts at a different, unrelated point of the signal. */
export const GHOST_PHASES = [0.07, 0.31, 0.46, 0.68, 0.83].map((f) => f * SCOPE.period);

export interface Measurement {
  /** the scope's peak-to-peak reading, displayed volts, from the part of the trace that is on the screen */
  vpp: number;
  /** the trace is taller than the screen */
  clipped: boolean;
  /** how tall the trace is on the screen, divisions */
  heightDiv: number;
}

/** What the scope's measurement would say: the trace, clamped to the screen, from its lowest to its highest point. */
export function measure(cols: Column[], vdiv: number): Measurement {
  const bottom = -SCOPE.zeroDiv * vdiv;
  const top = (SCOPE.divsY - SCOPE.zeroDiv) * vdiv;
  let lo = Infinity;
  let hi = -Infinity;
  let clipped = false;
  for (const c of cols) {
    if (c.hi > top || c.lo < bottom) clipped = true;
    lo = Math.min(lo, Math.max(bottom, c.lo));
    hi = Math.max(hi, Math.min(top, c.hi));
  }
  const vpp = Math.max(0, hi - lo);
  return { vpp, clipped, heightDiv: vpp / vdiv };
}

/** Overshoot above the settled high level as a percentage; ignores anything under 2%. */
export function overshootPct(sim: ScopeSim): number {
  const o = (sim.peak - 1) * 100;
  return o < 2 ? 0 : o;
}

/** Displayed volts per real volt: the channel's probe setting divided by the probe's real attenuation. */
export const scaleFor = (probe: ProbeX, setting: ProbeX) => setting / probe;

/** Frequency of the signal from what the screen shows: one period spans `divsPerCycle` divisions at `tdiv` seconds each. */
export const frequencyFrom = (divsPerCycle: number, tdiv: number) => 1 / (divsPerCycle * tdiv);
