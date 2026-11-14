/**
 * Pure logic for the ESD bench (no React): a toy version of the IEC 61000-4-2 "human body" system-level test.
 *
 *   150 pF charged to the test voltage → 330 Ω → the pin (with ~5 pF of pin capacitance)
 *   pin → the chip's own protection → a stiff 3.3 V rail
 *   pin → optional TVS diode → ground
 *
 * Everything runs on the shared transient solver; the two clamps are the kit's piecewise diode `{ kind: "D", a, b,
 * vf, ron }` (off below `vf`, then `vf + i·ron`), used here as TOY stand-ins:
 *   - the chip's own clamp: turns on 0.7 V above the 3.3 V rail (4.0 V at the pin) and has 10 Ω of resistance
 *     (a weak on-chip structure; real ones are designed for about 2 kV of handling, not for a connector);
 *   - a TVS: turns on at its breakdown voltage and has 0.3 Ω of dynamic resistance (typical-looking, not a datasheet).
 * Only positive hits are modelled (a real part clamps negative hits too). The toy is a plain RC discharge: it lacks
 * the sub-nanosecond first spike of a real ESD current, so its peak current is gentler than the real thing's.
 */
import { simulate } from "../elec-kit/transient";

export const ESD_C = 150e-12;
export const ESD_R = 330;
export const ESD_CPIN = 5e-12;
export const ESD_RAIL = 3.3;
export const CHIP_VF = 0.7;
export const CHIP_RON = 10;
/** Chip survives up to this peak current in its own clamp (toy figure, from the ~1.3 A peak of a 2 kV human-body-model test). */
export const CHIP_MAX_A = 1.3;
export const TVS_RON = 0.3;
/** A TVS that breaks down within this margin of the normal signal level would conduct on a normal signal. */
export const SIGNAL_MARGIN = 0.3;
export const ESD_T_STOP = 300e-9;
export const ESD_LEVELS = [2, 4, 6, 8];

export type TvsId = "none" | "2.5" | "3.3" | "5" | "12";
export interface TvsPart {
  id: TvsId;
  label: string;
  /** standoff voltage: stays off up to about this (the label on the part) */
  standoff: number;
  /** breakdown voltage where it starts to conduct (toy, typical-looking: a little above the standoff) */
  vbr: number;
}
export const TVS_PARTS: TvsPart[] = [
  { id: "none", label: "None", standoff: 0, vbr: Infinity },
  { id: "2.5", label: "2.5 V", standoff: 2.5, vbr: 2.8 },
  { id: "3.3", label: "3.3 V", standoff: 3.3, vbr: 4.1 },
  { id: "5", label: "5 V", standoff: 5, vbr: 6.4 },
  { id: "12", label: "12 V", standoff: 12, vbr: 13.3 },
];

export interface EsdResult {
  /** seconds */
  t: number[];
  /** voltage at the pin, V */
  pin: number[];
  /** current into the chip's own clamp, A */
  chip: number[];
  /** current through the TVS, A (all zeros with none) */
  tvs: number[];
  peakPinV: number;
  peakChipA: number;
  peakTvsA: number;
  /** ½ C V² stored in the 150 pF before the hit, joules */
  energyJ: number;
  chipSafe: boolean;
  /** the TVS does not conduct at the normal 3.3 V signal level */
  signalOk: boolean;
}

export const esdEnergy = (kv: number) => 0.5 * ESD_C * (kv * 1000) ** 2;

export function runEsd(kv: number, tvsId: TvsId): EsdResult | null {
  const part = TVS_PARTS.find((p) => p.id === tvsId) ?? TVS_PARTS[0];
  const res = simulate(
    [
      { kind: "C", id: "CESD", a: "src", b: "gnd", farads: ESD_C, v0: kv * 1000 },
      { kind: "R", id: "RESD", a: "src", b: "pin", ohms: ESD_R },
      { kind: "C", id: "CPIN", a: "pin", b: "gnd", farads: ESD_CPIN },
      { kind: "V", id: "VDD", a: "rail", b: "gnd", volts: ESD_RAIL },
      { kind: "D", id: "DCHIP", a: "pin", b: "rail", vf: CHIP_VF, ron: CHIP_RON },
      ...(part.id !== "none" ? [{ kind: "D" as const, id: "DTVS", a: "pin", b: "gnd", vf: part.vbr, ron: TVS_RON }] : []),
    ],
    { tStop: ESD_T_STOP, steps: 1500, method: "backward-euler" },
  );
  if (!res.ok) return null;
  const pin = res.v.pin;
  const chip = res.el.DCHIP.i.map((x) => Math.max(0, x));
  const tvs = part.id !== "none" ? res.el.DTVS.i.map((x) => Math.max(0, x)) : res.t.map(() => 0);
  const peakChipA = Math.max(...chip);
  return {
    t: res.t,
    pin,
    chip,
    tvs,
    peakPinV: Math.max(...pin),
    peakChipA,
    peakTvsA: Math.max(...tvs),
    energyJ: esdEnergy(kv),
    chipSafe: peakChipA <= CHIP_MAX_A,
    signalOk: part.id === "none" || part.vbr > ESD_RAIL + SIGNAL_MARGIN,
  };
}
