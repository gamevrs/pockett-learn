/**
 * Pure logic for the Li-ion charger widget (no React, no circuit solver: this is an electrochemical toy,
 * not a circuit).
 *
 * Model (a toy, every number is typical, none is a datasheet):
 *  - Open-circuit voltage OCV(soc): linear interpolation of an NMC-like curve (soc = state of charge, 0 to 1).
 *  - Internal resistance R = 0.1 Ω × (2000 mAh / capacity) at 25 °C, so the current-times-resistance drop
 *    I·R depends only on the C-rate. The factor is 3 at 5 °C (cold cells have a higher R).
 *  - Charger window 0 to 45 °C (typical): outside it the charger refuses to start.
 *  - Constant current (CC) at I = rate × C until the terminal voltage OCV + I·R reaches 4.20 V, then constant
 *    voltage (CV) at 4.20 V: the current is whatever pushes the cell towards 4.20 V, I = (4.20 − OCV) / R, and it tapers.
 *  - Terminate when I falls to C/10 (a typical termination; some chargers use C/20).
 *  - Coulomb counting at 100% charge efficiency, no diffusion, no self-heating: real cells take somewhat longer.
 */

export const CHARGE_V = 4.2;
export const CHARGE_DT_S = 5;
export const CHARGE_MAX_H = 8;
export const CHARGE_T_MIN = 0;
export const CHARGE_T_MAX = 45;
export const CHARGE_CAPACITIES = [1000, 2000, 3000];
export const CHARGE_RATES = [0.2, 0.5, 1, 2];
export const CHARGE_TEMPS = [-10, 5, 25, 50];

/** (soc, open-circuit volts) of a typical NMC-like cell. */
const OCV_TABLE: [number, number][] = [
  [0, 3.0],
  [0.05, 3.45],
  [0.1, 3.55],
  [0.2, 3.65],
  [0.3, 3.7],
  [0.4, 3.75],
  [0.5, 3.8],
  [0.6, 3.87],
  [0.7, 3.95],
  [0.8, 4.03],
  [0.9, 4.1],
  [1, 4.2],
];

export function ocv(soc: number): number {
  if (soc <= 0) return OCV_TABLE[0][1];
  for (let k = 1; k < OCV_TABLE.length; k++) {
    const [s1, v1] = OCV_TABLE[k];
    if (soc <= s1) {
      const [s0, v0] = OCV_TABLE[k - 1];
      return v0 + ((soc - s0) / (s1 - s0)) * (v1 - v0);
    }
  }
  return OCV_TABLE[OCV_TABLE.length - 1][1];
}

/** Resistance multiplier against 25 °C (typical shape: it grows steeply in the cold). */
export function tempFactor(tempC: number): number {
  if (tempC <= -10) return 6;
  if (tempC <= 5) return 6 + ((tempC + 10) / 15) * (3 - 6);
  if (tempC <= 25) return 3 + ((tempC - 5) / 20) * (1 - 3);
  if (tempC <= 50) return 1 + ((tempC - 25) / 25) * (0.8 - 1);
  return 0.8;
}

/** Internal resistance in ohms. */
export function cellResistance(capacityMah: number, tempC: number): number {
  return 0.1 * (2000 / capacityMah) * tempFactor(tempC);
}

export interface ChargeRun {
  /** The charger accepts the cell at this temperature. */
  allowed: boolean;
  /** Why it refused ("" when allowed). */
  reason: "" | "cold" | "hot";
  /** Set current, amps. */
  iSet: number;
  /** Internal resistance, ohms. */
  r: number;
  /** Hours at which constant current ends (null if refused or never reached). */
  ccH: number | null;
  /** Hours to termination (null if refused or not finished within the limit). */
  totalH: number | null;
  /** State of charge at the end of the run, 0 to 1. */
  finalSoc: number;
  /** Charge delivered, mAh. */
  chargeMah: number;
  /** Energy delivered at the terminals, Wh. */
  wh: number;
  /** Plot samples (hours, volts, amps). */
  t: number[];
  v: number[];
  i: number[];
}

export function runCharge(capacityMah: number, cRate: number, tempC: number): ChargeRun {
  const capAh = capacityMah / 1000;
  const iSet = cRate * capAh;
  const r = cellResistance(capacityMah, tempC);
  const empty: ChargeRun = { allowed: false, reason: tempC < CHARGE_T_MIN ? "cold" : "hot", iSet, r, ccH: null, totalH: null, finalSoc: 0, chargeMah: 0, wh: 0, t: [], v: [], i: [] };
  if (tempC < CHARGE_T_MIN || tempC > CHARGE_T_MAX) return empty;

  const dt = CHARGE_DT_S;
  const iStop = capAh / 10;
  const t: number[] = [];
  const v: number[] = [];
  const i: number[] = [];
  let soc = 0;
  let sec = 0;
  let cv = false;
  let ccH: number | null = null;
  let totalH: number | null = null;
  let chargeAs = 0;
  let joules = 0;
  const every = 6; // keep every 6th sample for the plots
  let n = 0;
  while (sec <= CHARGE_MAX_H * 3600) {
    const o = ocv(soc);
    let cur = iSet;
    let vt = o + cur * r;
    if (!cv && vt >= CHARGE_V) {
      cv = true;
      ccH = sec / 3600;
    }
    if (cv) {
      cur = Math.max(0, (CHARGE_V - o) / r);
      vt = CHARGE_V;
      if (cur <= iStop) {
        totalH = sec / 3600;
        t.push(sec / 3600);
        v.push(vt);
        i.push(cur);
        break;
      }
    }
    if (n % every === 0) {
      t.push(sec / 3600);
      v.push(vt);
      i.push(cur);
    }
    n++;
    chargeAs += cur * dt;
    joules += vt * cur * dt;
    soc = Math.min(1, soc + (cur * dt) / (capAh * 3600));
    sec += dt;
  }
  return { allowed: true, reason: "", iSet, r, ccH, totalH, finalSoc: soc, chargeMah: (chargeAs / 3600) * 1000, wh: joules / 3600, t, v, i };
}
