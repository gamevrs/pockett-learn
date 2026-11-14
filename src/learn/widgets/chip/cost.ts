/**
 * Pure model behind chip-crossover: total cost = NRE + units × unit cost, for an FPGA and an ASIC. No React.
 * All default numbers are illustrative orders of magnitude, not quotes.
 */

export interface CostInput {
  nreAsic: number;
  unitAsic: number;
  unitFpga: number;
  nreFpga: number;
  /** A bug escaped: pay for a second mask set and redesign. */
  respin?: boolean;
}

/** A respin adds roughly this fraction of the ASIC NRE (a new mask set plus rework and verification; toy). */
export const RESPIN_FRACTION = 0.3;

export const effectiveNreAsic = (c: CostInput) => c.nreAsic * (c.respin ? 1 + RESPIN_FRACTION : 1);
export const totalAsic = (c: CostInput, volume: number) => effectiveNreAsic(c) + volume * c.unitAsic;
export const totalFpga = (c: CostInput, volume: number) => c.nreFpga + volume * c.unitFpga;

/** Volume above which the ASIC is cheaper: (NRE_asic − NRE_fpga) / (unit_fpga − unit_asic). null when there is no such volume. */
export function crossover(c: CostInput): number | null {
  const nre = effectiveNreAsic(c);
  if (c.unitFpga <= c.unitAsic || nre <= c.nreFpga) return null;
  return (nre - c.nreFpga) / (c.unitFpga - c.unitAsic);
}

export type Cheaper = "asic" | "fpga" | "tie";

export function cheaperAt(c: CostInput, volume: number): Cheaper {
  const a = totalAsic(c, volume);
  const f = totalFpga(c, volume);
  if (Math.abs(a - f) <= 1e-9 * Math.max(a, f)) return "tie";
  return a < f ? "asic" : "fpga";
}

/** Cost per unit including the NRE spread over the volume. */
export const perUnitAsic = (c: CostInput, volume: number) => totalAsic(c, volume) / volume;
export const perUnitFpga = (c: CostInput, volume: number) => totalFpga(c, volume) / volume;

export interface CrossState {
  nreAsic: number;
  unitAsic: number;
  unitFpga: number;
  nreFpga: number;
  volume: number;
  respin: boolean;
  crossover: number | null;
  cheaper: Cheaper;
}

export function crossState(c: CostInput, volume: number): CrossState {
  return { nreAsic: c.nreAsic, unitAsic: c.unitAsic, unitFpga: c.unitFpga, nreFpga: c.nreFpga, volume, respin: !!c.respin, crossover: crossover(c), cheaper: cheaperAt(c, volume) };
}

const num = (v: unknown): v is number => typeof v === "number" && isFinite(v);

/**
 * goal: { volumeAtLeastCrossover?: true, cheaper?: "asic" | "fpga", findCrossover?: true, tol? }.
 * findCrossover: the chosen volume is within tol (default 10 %) of V*. Recomputed from the state's inputs.
 */
export function checkCrossover(state: unknown, goal: Record<string, unknown>): boolean {
  const s = state as Partial<CrossState> | undefined;
  if (!s || !num(s.nreAsic) || !num(s.unitAsic) || !num(s.unitFpga) || !num(s.nreFpga) || !num(s.volume) || s.volume <= 0) return false;
  const c: CostInput = { nreAsic: s.nreAsic, unitAsic: s.unitAsic, unitFpga: s.unitFpga, nreFpga: s.nreFpga, respin: !!s.respin };
  const v = crossover(c);
  let any = false;
  if (goal.volumeAtLeastCrossover === true) {
    any = true;
    if (v === null || s.volume < v) return false;
  }
  if (goal.cheaper === "asic" || goal.cheaper === "fpga") {
    any = true;
    if (cheaperAt(c, s.volume) !== goal.cheaper) return false;
  }
  if (goal.findCrossover === true) {
    any = true;
    const tol = num(goal.tol) ? goal.tol : 0.1;
    if (v === null || Math.abs(s.volume - v) > tol * v) return false;
  }
  return any;
}
