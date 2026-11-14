// Pure model for chip-power: dynamic power, leakage, clock gating and voltage scaling. Toy numbers, no UI.
//
//   P_dyn  = alpha * C * V^2 * f
//   P_leak = V * I_leak,   I_leak = (mA per nF for the threshold option) * C(nF) * temperature factor
//   clock gating: the gated block (a share of C) stops toggling while it is idle

export type Vt = "high" | "std" | "low";

/** Leakage current per nF of switched capacitance at 25 °C, in mA (toy). */
export const LEAK_MA_PER_NF: Record<Vt, number> = { high: 0.5, std: 2, low: 8 };
/** Leakage roughly doubles every 37.5 °C in this toy, so 100 °C is 4 times 25 °C. */
export const HOT_FACTOR = 4;
export const VT_LABEL: Record<Vt, string> = { high: "high-Vt (slow, low leakage)", std: "standard-Vt", low: "low-Vt (fast, leaky)" };
/** Share of the switched capacitance that belongs to the block that can be clock gated. */
export const BLOCK_SHARE = 0.5;

/** Toy speed limit: the fastest clock the logic can run at a supply voltage (threshold 0.4 V; 3 GHz at 1.0 V). */
export const VTH = 0.4;
export function fMaxMhz(v: number): number {
  return Math.max(0, (3000 * (v - VTH)) / (1.0 - VTH));
}

export interface PowerInputs {
  alpha: number;
  cNf: number;
  v: number;
  fMhz: number;
  gating: boolean;
  /** Percent of the time the gated block is idle (0 to 100). */
  idlePct: number;
  vt: Vt;
  hot: boolean;
}

export const POWER_DEFAULTS: PowerInputs = { alpha: 0.1, cNf: 1, v: 1.0, fMhz: 1000, gating: false, idlePct: 60, vt: "std", hot: false };

export interface PowerResult {
  /** Dynamic power with no clock gating. */
  pDynUngatedW: number;
  /** Dynamic power as configured (gated when gating is on). */
  pDynW: number;
  iLeakA: number;
  pLeakW: number;
  pTotalW: number;
  /** Dynamic power saved by gating (W), and as a share of the ungated dynamic power. */
  savedW: number;
  savedPct: number;
  /** f is at or below what the supply voltage allows. */
  timingOk: boolean;
  fMaxMhz: number;
}

export function computePower(i: PowerInputs): PowerResult {
  const c = i.cNf * 1e-9;
  const f = i.fMhz * 1e6;
  const pDynUngatedW = i.alpha * c * i.v * i.v * f;
  const idle = Math.min(1, Math.max(0, i.idlePct / 100));
  const pDynW = i.gating ? pDynUngatedW * (1 - BLOCK_SHARE * idle) : pDynUngatedW;
  const iLeakA = (LEAK_MA_PER_NF[i.vt] * 1e-3 * i.cNf) * (i.hot ? HOT_FACTOR : 1);
  const pLeakW = i.v * iLeakA;
  const fm = fMaxMhz(i.v);
  return {
    pDynUngatedW,
    pDynW,
    iLeakA,
    pLeakW,
    pTotalW: pDynW + pLeakW,
    savedW: pDynUngatedW - pDynW,
    savedPct: pDynUngatedW > 0 ? ((pDynUngatedW - pDynW) / pDynUngatedW) * 100 : 0,
    timingOk: i.fMhz <= fm + 1e-6,
    fMaxMhz: fm,
  };
}

/** What the same design would burn at other supply voltages, with the clock limited to what each voltage allows. */
export function voltageTable(i: PowerInputs, volts: number[] = [1.2, 1.0, 0.8, 0.6]): { v: number; fMaxMhz: number; fUsedMhz: number; pDynW: number; pTotalW: number }[] {
  return volts.map((v) => {
    const fUsed = Math.min(i.fMhz, fMaxMhz(v));
    const r = computePower({ ...i, v, fMhz: fUsed });
    return { v, fMaxMhz: fMaxMhz(v), fUsedMhz: fUsed, pDynW: r.pDynW, pTotalW: r.pTotalW };
  });
}

export interface PowerState extends PowerInputs {
  pDynW: number;
  pLeakW: number;
  pTotalW: number;
}

export function stateOfPower(i: PowerInputs): PowerState {
  const r = computePower(i);
  return { ...i, pDynW: r.pDynW, pLeakW: r.pLeakW, pTotalW: r.pTotalW };
}

/**
 * goal: { maxTotalW?: number, maxDynW?: number, minFMhz?: number, gating?: boolean }.
 * Power is recomputed from the input fields (never from state.p*). The clock must also be one the supply voltage can
 * support (f <= fMaxMhz(v)), otherwise lowering V alone would "win" for free; pass `ignoreTiming: true` to skip that.
 * Example solvable goal: { maxDynW: 0.05, minFMhz: 1000 } (from the defaults: V = 0.7 gives 49 mW at 1 GHz).
 */
export function checkPower(state: unknown, goal: Record<string, unknown>): boolean {
  const s = state as Partial<PowerInputs> | undefined;
  if (!s) return false;
  const nums = ["alpha", "cNf", "v", "fMhz", "idlePct"] as const;
  for (const k of nums) if (typeof s[k] !== "number" || !isFinite(s[k] as number)) return false;
  const vt: Vt = s.vt === "high" || s.vt === "low" ? s.vt : "std";
  const inp: PowerInputs = {
    alpha: s.alpha as number,
    cNf: s.cNf as number,
    v: s.v as number,
    fMhz: s.fMhz as number,
    gating: s.gating === true,
    idlePct: s.idlePct as number,
    vt,
    hot: s.hot === true,
  };
  const r = computePower(inp);
  let any = false;
  if (goal.ignoreTiming !== true && !r.timingOk) return false;
  if (typeof goal.maxTotalW === "number") {
    any = true;
    if (r.pTotalW > goal.maxTotalW + 1e-12) return false;
  }
  if (typeof goal.maxDynW === "number") {
    any = true;
    if (r.pDynW > goal.maxDynW + 1e-12) return false;
  }
  if (typeof goal.minFMhz === "number") {
    any = true;
    if (inp.fMhz < goal.minFMhz) return false;
  }
  if (typeof goal.gating === "boolean") {
    any = true;
    if (inp.gating !== goal.gating) return false;
  }
  return any;
}
