/**
 * Pure board maths for the PCB widgets (no React): copper weight, IPC-2221 trace width and the stack-up data.
 * Checked in Node against hand-computed answers (see the scratch tests); simplified on purpose.
 */

/** 1 oz/ft² of copper is about 34.8 µm thick (often rounded to 35 µm). */
export const UM_PER_OZ = 34.8;
/** 1 mil = 0.001 in = 25.4 µm. */
export const UM_PER_MIL = 25.4;
/** Copper thickness per ounce in mil, using the usual rounded 35 µm / 25.4 = 1.378 mil. */
export const MIL_PER_OZ = 1.378;

export const ozToUm = (oz: number) => oz * UM_PER_OZ;
export const umToMil = (um: number) => um / UM_PER_MIL;
export const milToMm = (mil: number) => mil * 0.0254;
export const mmToMil = (mm: number) => mm / 0.0254;

/** IPC-2221 constants: I = k · ΔT^0.44 · A^0.725 (A in mil², ΔT in °C, I in A). */
export const K_EXTERNAL = 0.048;
export const K_INTERNAL = 0.024;

/** Cross-section (mil²) a trace needs to carry `amps` with a `rise` °C temperature rise, per IPC-2221. */
export function areaMil2(amps: number, rise: number, external: boolean): number {
  const k = external ? K_EXTERNAL : K_INTERNAL;
  return Math.pow(amps / (k * Math.pow(rise, 0.44)), 1 / 0.725);
}

/** Trace width in mil for that current, rise, copper weight and layer. */
export function traceWidthMil(amps: number, rise: number, oz: number, external: boolean): number {
  return areaMil2(amps, rise, external) / (oz * MIL_PER_OZ);
}

/** Inverse: the temperature rise (°C) a trace of `widthMil` gives when it carries `amps`. */
export function riseForWidth(amps: number, widthMil: number, oz: number, external: boolean): number {
  const k = external ? K_EXTERNAL : K_INTERNAL;
  const area = widthMil * oz * MIL_PER_OZ;
  return Math.pow(amps / (k * Math.pow(area, 0.725)), 1 / 0.44);
}

/** DC resistance (Ω) of a copper trace at 20 °C: ρ = 1.724e-8 Ω·m. */
export function traceResistance(lengthMm: number, widthMil: number, oz: number): number {
  const wM = widthMil * 25.4e-6;
  const tM = ozToUm(oz) * 1e-6;
  return (1.724e-8 * (lengthMm * 1e-3)) / (wM * tM);
}

// ───────────────────────────── stack-up data ─────────────────────────────

export type LayerCount = 2 | 4 | 6;
export type ViaKind = "through" | "blind" | "buried" | "micro";

export interface StackLayer {
  /** Short name drawn beside the copper layer, e.g. "L1 sig". */
  name: string;
  role: "sig" | "gnd" | "pwr";
}

export interface Stackup {
  layers: StackLayer[];
  /** Dielectric between copper layer i and i+1: kind and thickness in mm (typical). */
  gaps: { kind: "core" | "prepreg"; mm: number }[];
  /** One line saying which arrangement this is. */
  note: string;
}

/** Typical stack-ups. Real thicknesses are the fab's choice; these are rounded, illustrative values. */
export const STACKUPS: Record<LayerCount, Stackup> = {
  2: {
    layers: [
      { name: "L1 top", role: "sig" },
      { name: "L2 bot", role: "sig" },
    ],
    gaps: [{ kind: "core", mm: 1.5 }],
    note: "Two copper layers on one FR-4 core, about 1.6 mm in all (typical).",
  },
  4: {
    layers: [
      { name: "L1 sig", role: "sig" },
      { name: "L2 GND", role: "gnd" },
      { name: "L3 PWR", role: "pwr" },
      { name: "L4 sig", role: "sig" },
    ],
    gaps: [
      { kind: "prepreg", mm: 0.2 },
      { kind: "core", mm: 1.0 },
      { kind: "prepreg", mm: 0.2 },
    ],
    note: "Sig / GND / PWR / Sig: the common 4-layer choice (typical). Planes sit right under the outer signals.",
  },
  6: {
    layers: [
      { name: "L1 sig", role: "sig" },
      { name: "L2 GND", role: "gnd" },
      { name: "L3 sig", role: "sig" },
      { name: "L4 PWR", role: "pwr" },
      { name: "L5 GND", role: "gnd" },
      { name: "L6 sig", role: "sig" },
    ],
    gaps: [
      { kind: "prepreg", mm: 0.12 },
      { kind: "core", mm: 0.36 },
      { kind: "prepreg", mm: 0.3 },
      { kind: "core", mm: 0.36 },
      { kind: "prepreg", mm: 0.12 },
    ],
    note: "Sig / GND / Sig / PWR / GND / Sig: one common arrangement (typical); Sig / GND / Sig / Sig / PWR / Sig is another.",
  },
};

export interface ViaInfo {
  /** 1-based copper layers the via connects, [from, to]. */
  span: [number, number];
  /** Visible from the top or bottom face of the board? */
  outside: boolean;
  blurb: string;
}

/** What each via type connects on an n-layer board (n ≥ 4 for anything but "through"). */
export function viaSpan(kind: ViaKind, n: LayerCount): ViaInfo {
  switch (kind) {
    case "through":
      return { span: [1, n], outside: true, blurb: "Drilled through the whole board. Cheapest. Visible on both faces and it uses room on every layer." };
    case "blind":
      return {
        span: [1, n === 4 ? 2 : 3],
        outside: true,
        blurb: `Starts on an outer face and stops at an inner layer (here L1 to L${n === 4 ? 2 : 3}). Costs more: extra drilling and lamination steps.`,
      };
    case "buried":
      return { span: [2, 3], outside: false, blurb: "Joins inner layers only (here L2 to L3). Not visible from either face. The dearest kind, because it is made before the board is laminated." };
    case "micro":
      return { span: [1, 2], outside: true, blurb: "Laser-drilled, tiny, spans a single layer (here L1 to L2). The basis of HDI boards for fine-pitch BGAs. Costs more." };
  }
}

/** Does this via type exist on an n-layer board? Only through vias on 2 layers. */
export const viaAllowed = (kind: ViaKind, n: LayerCount) => kind === "through" || n >= 4;
