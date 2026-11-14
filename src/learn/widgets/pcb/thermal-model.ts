/**
 * Toy thermal model for a power chip with an exposed pad (no React). Typical round numbers, not a field solver:
 * heat leaves the junction by two parallel paths, down through the pad into board copper, or from the package
 * body into the air.
 */

/** Junction to the underside of the exposed pad, °C/W (typical for a small QFN-style package). */
export const THETA_JC_PAD = 8;
/** Package body straight to still air, °C/W (typical, the weak path). */
export const THETA_BODY = 150;
/** Heat shed per cm² of copper per kelvin of rise, W/(cm²·K): natural convection plus radiation (typical, about 22 W/m²K). */
export const H_CU = 0.0022;
/** One plated thermal via (0.3 mm drill, 1.6 mm board, plain barrel), °C/W (typical, about 100 to 200). */
export const THETA_VIA = 150;

export const AREAS_CM2 = [1, 2, 4, 6, 10, 25] as const;
export const VIA_COUNTS = [0, 4, 9, 16] as const;

export interface ThermalResult {
  /** Copper plus vias seen from the pad, °C/W. */
  thetaCu: number;
  /** All the vias in parallel, °C/W (0 when there are none). */
  thetaVias: number;
  /** Pad path: junction to pad, then copper and vias, °C/W. */
  thetaPad: number;
  /** Both paths in parallel, °C/W. */
  thetaJA: number;
  /** Junction temperature, °C. */
  tj: number;
}

/**
 * Heat spreads in the top copper, and through the vias into an equal copper area on the far side, so the two
 * copper areas shed heat in parallel. More vias help until the copper itself is the limit.
 */
export function thermal(areaCm2: number, vias: number, powerW: number, ambientC: number): ThermalResult {
  const thetaTop = 1 / (H_CU * areaCm2);
  const thetaVias = vias > 0 ? THETA_VIA / vias : 0;
  const thetaCu = vias > 0 ? 1 / (1 / thetaTop + 1 / (thetaVias + thetaTop)) : thetaTop;
  const thetaPad = THETA_JC_PAD + thetaCu;
  const thetaJA = 1 / (1 / thetaPad + 1 / THETA_BODY);
  return { thetaCu, thetaVias, thetaPad, thetaJA, tj: ambientC + powerW * thetaJA };
}
