// Pure logic for the semi-reliab widget (electromigration + HTOL). No UI imports.

const K_EV = 8.617e-5;
const T_REF_K = 378.15;
/** Fixed current, mA, and wire thickness, µm. */
export const EM_CURRENT_MA = 2;
export const EM_THICK_UM = 0.2;
export const EM_EA = 0.85;
export const EM_TARGET_Y = 10;
export const USE_C = 55;
export const HOURS_PER_YEAR = 8766;
export const HTOL_HOURS = 1000;

/** Current density in MA/cm^2 for a wire of width w (µm): I/(w t) with I = 2 mA, t = 0.2 µm, which is 1/w. */
export function currentDensity(widthUm: number): number {
  // 2 mA / (w * 0.2 µm^2) = (10 / w) mA/µm^2 = (10 / w) * 1e5 A/cm^2 = (1 / w) MA/cm^2
  return EM_CURRENT_MA / (widthUm * EM_THICK_UM) / 10;
}

/** Black's equation, normalised: 10 years at 1 MA/cm^2 and 105 C. */
export function emLifeYears(widthUm: number, tempC: number): number {
  const j = currentDensity(widthUm);
  const t = tempC + 273.15;
  return 10 * Math.pow(j, -2) * Math.exp((EM_EA / K_EV) * (1 / t - 1 / T_REF_K));
}

/** Arrhenius acceleration factor of a stress temperature over the use temperature. */
export function htolAF(stressC: number, ea: number, useC: number = USE_C): number {
  return Math.exp((ea / K_EV) * (1 / (useC + 273.15) - 1 / (stressC + 273.15)));
}

/** Years of use represented by 1,000 h of stress. */
export function htolYears(stressC: number, ea: number): number {
  return (HTOL_HOURS * htolAF(stressC, ea)) / HOURS_PER_YEAR;
}

/** Two or three significant digits for readouts. */
export function sig(v: number, digits = 3): string {
  if (!isFinite(v)) return "∞";
  if (v >= 1000) return Math.round(v).toLocaleString("en-US");
  return String(+v.toPrecision(digits));
}

/** Number of voids to draw for a given lifetime (illustrative): 0 at >= 10 years. */
export function voidCount(lifeY: number): number {
  if (lifeY >= EM_TARGET_Y) return 0;
  if (lifeY >= 5) return 1;
  if (lifeY >= 2) return 2;
  if (lifeY >= 0.5) return 3;
  return 4;
}
