/**
 * Pure logic for the Zener bench (no React): a supply, a series resistor, a Zener to ground and an optional load,
 * solved with the shared DC solver.
 *
 * The Zener is a TOY piecewise clamp: the kit's diode element `{ kind: "D", a, b, vf, ron }` is off below `vf`, then
 * `vf + i·ron`. Here it sits "backwards" from the supply's point of view (anode to ground), so `vf` plays the part of
 * the Zener voltage Vz and `ron` the dynamic resistance. A real Zener has a soft knee, a tolerance of about 5%, a
 * dynamic resistance that depends on the current (typically 10 to 40 Ω for a small 5.1 V part near 5 mA) and a
 * temperature coefficient; none of that is modelled.
 *
 * The load is a resistor sized to draw the chosen current at exactly Vz (R_L = Vz / I). If the output sags below Vz
 * (the Zener is starved) the load current falls with it, as a resistor's would.
 */
import { solveDC } from "../elec-kit/solve";

/** Typical small Zener used throughout the lesson. */
export const ZENER_VZ = 5.1;
/** Toy dynamic resistance. */
export const ZENER_RZ = 10;
/** A small glass-package Zener is typically a 0.5 W part. */
export const ZENER_PMAX = 0.5;
/** A common through-hole resistor is rated 1/4 W. */
export const R_PMAX = 0.25;
/** Rule of thumb (typical): keep at least about 1 mA flowing in the Zener so it stays in its breakdown region. */
export const ZENER_IZ_MIN = 0.001;
/** The heaviest load the question considers, amps. */
export const LOAD_MAX = 0.02;
/** E12 resistor values offered, 100 Ω to 1 kΩ. */
export const ZENER_R_VALUES = [100, 120, 150, 180, 220, 270, 330, 390, 470, 560, 680, 820, 1000];

export interface ZenerSolution {
  /** voltage at the output node */
  vout: number;
  /** current through the series resistor */
  ir: number;
  /** current through the Zener (0 when it is not conducting) */
  iz: number;
  /** current the load really takes (less than asked for when the output sags) */
  iload: number;
  /** Zener power, Vout × Iz */
  pz: number;
  /** series resistor power */
  pr: number;
  /** is the Zener conducting */
  regulating: boolean;
}

/** Supply → R → out, Zener out → ground, optional load out → ground drawing `iLoad` amps at Vz. */
export function solveZener(vin: number, r: number, iLoad: number): ZenerSolution | null {
  const res = solveDC([
    { kind: "V", id: "V1", a: "in", b: "gnd", volts: vin },
    { kind: "R", id: "R1", a: "in", b: "out", ohms: r },
    { kind: "D", id: "Z1", a: "out", b: "gnd", vf: ZENER_VZ, ron: ZENER_RZ },
    ...(iLoad > 0 ? [{ kind: "R" as const, id: "RL", a: "out", b: "gnd", ohms: ZENER_VZ / iLoad }] : []),
  ]);
  if (!res.ok) return null;
  const on = !!res.el.Z1.on;
  const iz = on ? res.el.Z1.i : 0;
  return {
    vout: res.v.out,
    ir: res.el.R1.i,
    iz,
    iload: iLoad > 0 ? res.el.RL.i : 0,
    pz: on ? res.el.Z1.p : 0,
    pr: res.el.R1.p,
    regulating: on,
  };
}

export interface ZenerWorst {
  /** Zener current with the heaviest load */
  izFullLoad: number;
  /** output voltage with the heaviest load */
  voutFullLoad: number;
  /** Zener power with no load (the Zener carries all of the resistor's current) */
  pzNoLoad: number;
  /** resistor power with no load */
  prNoLoad: number;
}

export function worstCases(vin: number, r: number, loadMax: number = LOAD_MAX): ZenerWorst | null {
  const full = solveZener(vin, r, loadMax);
  const none = solveZener(vin, r, 0);
  if (!full || !none) return null;
  return { izFullLoad: full.iz, voutFullLoad: full.vout, pzNoLoad: none.pz, prNoLoad: none.pr };
}
