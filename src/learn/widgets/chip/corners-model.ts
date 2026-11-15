// Pure model for chip-corners: one flop-to-flop path timed at process, voltage and temperature (PVT) corners, with an
// on-chip-variation (OCV) derate and an optional local IR drop. All times in ps, toy numbers. No UI.
//
//   k = kP(process) * kV(effective voltage) * kT(temperature)      every cell delay is its nominal delay times k
//   kV(v) = ((0.80 - 0.30) / (v - 0.30))^1.3                        alpha-power-law shape, 1.0 at 0.80 V
//   OCV: late paths are multiplied by (1 + d), early paths by (1 - d), on the parts of the clock tree the two flops do
//        not share (the shared trunk cancels; tools call removing that pessimism CRPR)
//
//   setup slack = T + capture clock (early) - [launch clock (late) + tcq (late) + long path (late)] - tsu
//   hold slack  = launch clock (early) + tcq (early) + short path (early) - [capture clock (late) + thold]

export type Proc = "SS" | "TT" | "FF";
export const PROCS: Proc[] = ["SS", "TT", "FF"];
export const VOLTS = [0.72, 0.8, 0.88] as const;
export const TEMPS = [-40, 25, 125] as const;
export type Volt = (typeof VOLTS)[number];
export type Temp = (typeof TEMPS)[number];

export const PROC_K: Record<Proc, number> = { SS: 1.2, TT: 1.0, FF: 0.83 };
/** Toy temperature factor: hot is slow, as at older nodes (advanced low-voltage nodes can invert this). */
export const TEMP_K: Record<string, number> = { "-40": 0.94, "25": 1.0, "125": 1.1 };
export const V_NOM = 0.8;
export const V_TH = 0.3;
export const V_ALPHA = 1.3;
/** The local supply droop the IR-drop switch applies, in volts. */
export const IR_DROP_V = 0.04;

export const kV = (v: number) => Math.pow((V_NOM - V_TH) / (v - V_TH), V_ALPHA);

/** Nominal (TT, 0.80 V, 25 °C) delays of the toy path. */
export const NOM = {
  periodPs: 1360,
  trunk: 200,
  launchBranch: 100,
  captureBranch: 120,
  tcq: 60,
  longPath: 700,
  shortPath: 40,
  tsu: 40,
  thold: 45,
};

export interface Corner {
  proc: Proc;
  v: Volt;
  t: Temp;
}

export interface CornerInput extends Corner {
  /** OCV derate as a fraction, e.g. 0.05 for 5%. */
  derate: number;
  /** Apply the local IR drop (the cells see v − 40 mV). */
  ir: boolean;
}

export interface CornerResult {
  k: number;
  vEff: number;
  setupSlackPs: number;
  holdSlackPs: number;
  /** Pieces of the two checks, for the readout. */
  launchLate: number;
  captureEarly: number;
  dataLate: number;
  launchEarly: number;
  captureLate: number;
  dataEarly: number;
}

export function delayFactor(c: Corner, ir: boolean): { k: number; vEff: number } {
  const vEff = c.v - (ir ? IR_DROP_V : 0);
  return { k: PROC_K[c.proc] * kV(vEff) * TEMP_K[String(c.t)], vEff };
}

export function analyzeCorner(i: CornerInput): CornerResult {
  const { k, vEff } = delayFactor(i, i.ir);
  const d = Math.max(0, Math.min(0.2, i.derate));
  const late = 1 + d;
  const early = 1 - d;
  const trunk = NOM.trunk * k;
  const launchLate = trunk + NOM.launchBranch * k * late;
  const launchEarly = trunk + NOM.launchBranch * k * early;
  const captureLate = trunk + NOM.captureBranch * k * late;
  const captureEarly = trunk + NOM.captureBranch * k * early;
  const dataLate = (NOM.tcq + NOM.longPath) * k * late;
  const dataEarly = (NOM.tcq + NOM.shortPath) * k * early;
  const setupSlackPs = NOM.periodPs + captureEarly - (launchLate + dataLate) - NOM.tsu;
  const holdSlackPs = launchEarly + dataEarly - (captureLate + NOM.thold);
  return { k, vEff, setupSlackPs, holdSlackPs, launchLate, captureEarly, dataLate, launchEarly, captureLate, dataEarly };
}

export const allCorners = (): Corner[] => PROCS.flatMap((proc) => VOLTS.flatMap((v) => TEMPS.map((t) => ({ proc, v, t }))));

/** The corner with the smallest setup (or hold) slack for this derate and IR setting. */
export function worstCorner(kind: "setup" | "hold", derate: number, ir: boolean): Corner {
  let best = allCorners()[0];
  let bestV = Infinity;
  for (const c of allCorners()) {
    const r = analyzeCorner({ ...c, derate, ir });
    const v = kind === "setup" ? r.setupSlackPs : r.holdSlackPs;
    if (v < bestV - 1e-9) {
      bestV = v;
      best = c;
    }
  }
  return best;
}

export interface CornersState extends CornerInput {
  setupSlackPs: number;
  holdSlackPs: number;
}

const sameCorner = (a: Corner, b: Corner) => a.proc === b.proc && a.v === b.v && a.t === b.t;

const isCornerInput = (s: unknown): s is CornerInput => {
  const x = s as CornerInput | undefined;
  return !!x && PROCS.includes(x.proc) && (VOLTS as readonly number[]).includes(x.v) && (TEMPS as readonly number[]).includes(x.t) && typeof x.derate === "number" && isFinite(x.derate);
};

/**
 * goal: { worstSetup?: true, worstHold?: true, minDerate?: number, ir?: boolean, setupMet?: boolean, holdMet?: boolean }.
 * worstSetup / worstHold: the chosen corner is the one with the smallest slack of that kind among all 27, for the
 * state's own derate and IR setting. Slacks are recomputed from the corner, never taken from the state.
 */
export function checkCorners(state: unknown, goal: Record<string, unknown>): boolean {
  if (!isCornerInput(state)) return false;
  const s: CornerInput = { proc: state.proc, v: state.v, t: state.t, derate: state.derate, ir: state.ir === true };
  const r = analyzeCorner(s);
  let any = false;
  if (typeof goal.minDerate === "number") {
    any = true;
    if (s.derate < goal.minDerate - 1e-9) return false;
  }
  if (typeof goal.ir === "boolean") {
    any = true;
    if (s.ir !== goal.ir) return false;
  }
  if (goal.worstSetup === true) {
    any = true;
    if (!sameCorner(s, worstCorner("setup", s.derate, s.ir))) return false;
  }
  if (goal.worstHold === true) {
    any = true;
    if (!sameCorner(s, worstCorner("hold", s.derate, s.ir))) return false;
  }
  if (typeof goal.setupMet === "boolean") {
    any = true;
    if (r.setupSlackPs >= 0 !== goal.setupMet) return false;
  }
  if (typeof goal.holdMet === "boolean") {
    any = true;
    if (r.holdSlackPs >= 0 !== goal.holdMet) return false;
  }
  return any;
}
