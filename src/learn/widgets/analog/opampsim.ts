/**
 * Ideal op-amp playground model (golden rules): with negative feedback and the output inside its limits the
 * op-amp output does whatever makes V− = V+ and no current flows into the inputs. Outside the limits the
 * output simply sits at the limit and the rules stop holding. Open loop (comparator) the output is at a rail.
 */

export type OpMode = "inverting" | "noninv" | "buffer" | "comparator";
export type Rails = "pm5" | "pm12" | "single5";

export const RAILS: Record<Rails, { vneg: number; vpos: number; label: string }> = {
  pm5: { vneg: -5, vpos: 5, label: "±5 V" },
  pm12: { vneg: -12, vpos: 12, label: "±12 V" },
  single5: { vneg: 0, vpos: 5, label: "0 to 5 V" },
};

/** Typical distance a general-purpose (non rail-to-rail) output stays away from each rail. */
export const NON_RR_MARGIN = 1.5;
/** Typical distance a rail-to-rail output stays away from each rail (tens of mV to ~0.1 V depending on load). */
export const RR_MARGIN = 0.1;

export function outLimits(rails: Rails, railToRail: boolean) {
  const r = RAILS[rails];
  const m = railToRail ? RR_MARGIN : NON_RR_MARGIN;
  return { lo: r.vneg + m, hi: r.vpos - m };
}

/** E12 resistor values from 1 kΩ to 1 MΩ (37 values). */
export const E12 = (() => {
  const base = [1, 1.2, 1.5, 1.8, 2.2, 2.7, 3.3, 3.9, 4.7, 5.6, 6.8, 8.2];
  const out: number[] = [];
  for (const dec of [1e3, 1e4, 1e5]) for (const b of base) out.push(Math.round(b * dec));
  out.push(1e6);
  return out;
})();

export interface OpParams {
  mode: OpMode;
  /** feedback resistor, Ω */
  rf: number;
  /** input resistor Rin (inverting) or ground resistor Rg (non-inverting), Ω */
  rin: number;
  rails: Rails;
  railToRail: boolean;
  /** comparator reference voltage on the − input, V */
  vref: number;
}

/** Closed-loop gain from the golden rules (NaN for the comparator, whose gain is the open-loop gain). */
export function idealGain(p: Pick<OpParams, "mode" | "rf" | "rin">): number {
  switch (p.mode) {
    case "inverting":
      return -p.rf / p.rin;
    case "noninv":
      return 1 + p.rf / p.rin;
    case "buffer":
      return 1;
    default:
      return NaN;
  }
}

export interface OpPoint {
  vout: number;
  vminus: number;
  vplus: number;
  /** true when the output is stuck at a limit (always, for the comparator) */
  clipped: boolean;
  /** current in Rin (inverting) or Rg (non-inverting), A, signed along the arrow in the drawing */
  iR: number;
  ideal: number;
}

/** Solve one instant for DC input `vin`. */
export function opPoint(p: OpParams, vin: number): OpPoint {
  const { lo, hi } = outLimits(p.rails, p.railToRail);
  if (p.mode === "comparator") {
    const vout = vin > p.vref ? hi : lo;
    return { vout, vminus: p.vref, vplus: vin, clipped: true, iR: 0, ideal: vout };
  }
  const g = idealGain(p);
  const ideal = g * vin;
  const vout = Math.min(hi, Math.max(lo, ideal));
  const clipped = vout !== ideal;
  if (p.mode === "inverting") {
    // V+ is grounded; V− sits where Rin and Rf (a divider between vin and vout) put it.
    const vminus = (vin / p.rin + vout / p.rf) / (1 / p.rin + 1 / p.rf);
    return { vout, vminus, vplus: 0, clipped, iR: (vin - vminus) / p.rin, ideal };
  }
  if (p.mode === "noninv") {
    const vminus = (vout * p.rin) / (p.rin + p.rf);
    return { vout, vminus, vplus: vin, clipped, iR: vminus / p.rin, ideal };
  }
  return { vout, vminus: vout, vplus: vin, clipped, iR: 0, ideal };
}

/** Sine view: n points over `cycles` cycles of amplitude `amp`. */
export function opWave(p: OpParams, amp: number, n = 200, cycles = 2) {
  const vin: [number, number][] = [];
  const out: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * cycles;
    const v = amp * Math.sin(2 * Math.PI * t);
    vin.push([t, v]);
    out.push([t, opPoint(p, v).vout]);
  }
  return { vin, out };
}
