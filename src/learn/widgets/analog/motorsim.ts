/**
 * Pure logic for the H-bridge widget (no React). A toy brushed DC motor on a 6 V supply, driven by four switches.
 *
 * Circuit at each instant (solved with the elec-kit DC solver): supply Vs (6 V times the PWM duty, a state-space-average
 * toy: the real switching ripple is ignored), switches Q1 (top to A), Q2 (A to ground), Q3 (top to B), Q4 (B to ground),
 * and the motor as its winding resistance R from A to m in series with a voltage source from m to B that stands for the
 * back-EMF E = k·ω. The winding inductance is left out of the speed model: its time constant L/R is far shorter than the
 * mechanical one, so the current follows the speed almost instantly.
 *
 * Mechanics: J dω/dt = k·i − b·ω − T_load·sign(ω)   (k also converts current to torque, N·m per A)
 *   steady speed (free)  ω = (k·V/R) / (k²/R + b)
 *   mechanical time constant  J / (k²/R + b)  (about 28 ms here)
 *
 * Closing both switches of one side (Q1+Q2 or Q3+Q4) shorts the supply: the kit reports a short-circuit error, which the
 * widget shows as "shoot-through". With every switch open the motor is left floating (body diodes are ignored).
 */
import { solveDC, type DcElement } from "../elec-kit/solve";

export const V_SUPPLY = 6;
/** Winding resistance, ohms. */
export const R_WINDING = 2;
/** Motor constant: back-EMF per rad/s (V·s/rad) and torque per amp (N·m/A) are the same number in SI units. */
export const K_MOTOR = 0.0095;
/** Rotor inertia, kg·m². */
export const J_ROTOR = 1.35e-6;
/** Viscous friction, N·m per rad/s. */
export const B_FRICTION = 2.25e-6;
/** The "Loaded" setting: a constant opposing torque, N·m. */
export const T_LOAD = 0.01;
/** Length of one simulated run, seconds, and the integration step. */
export const RUN_S = 0.3;
export const DT = 0.0005;
/** Keep every this-many steps for the plots. */
const KEEP = 5;

export type Mode = "forward" | "reverse" | "brake" | "coast" | "manual";
export type Load = "free" | "loaded" | "stalled";
export type Switches = [boolean, boolean, boolean, boolean];

/** Full-supply, no-load speed (rad/s): the 100% mark of the speed plot. */
export const W_FREE = (K_MOTOR * V_SUPPLY) / R_WINDING / ((K_MOTOR * K_MOTOR) / R_WINDING + B_FRICTION);
/** Mechanical time constant, seconds. */
export const TAU_MECH = J_ROTOR / ((K_MOTOR * K_MOTOR) / R_WINDING + B_FRICTION);
export const rpm = (w: number) => (w * 60) / (2 * Math.PI);

/** Which switches each preset mode closes. Manual starts with everything open. */
export function modeSwitches(mode: Mode): Switches {
  switch (mode) {
    case "forward":
      return [true, false, false, true];
    case "reverse":
      return [false, true, true, false];
    case "brake":
      return [false, true, false, true];
    default:
      return [false, false, false, false];
  }
}

/** Drive direction set by the switches: 1 = A to B (Q1 + Q4 only), −1 = B to A (Q3 + Q2 only), 0 = anything else. */
export function driveDirection(q: Switches): 1 | -1 | 0 {
  if (q[0] && q[3] && !q[1] && !q[2]) return 1;
  if (q[2] && q[1] && !q[0] && !q[3]) return -1;
  return 0;
}

/** True when one side of the bridge has both its switches closed. */
export function isShoot(q: Switches): boolean {
  return (q[0] && q[1]) || (q[2] && q[3]);
}

export interface BridgeNow {
  shoot: boolean;
  /** why, in plain words (from the kit's error when it reported one) */
  message: string;
  /** motor current from A to B, amps */
  i: number;
  /** current through Q1..Q4 in their drawn direction (Q1, Q3 downwards from the supply; Q2, Q4 down to ground) */
  iq: [number, number, number, number];
}

/** The bridge at one instant: switches, average supply fraction `duty` (0 to 1) and motor speed ω (rad/s, + = A to B). */
export function bridgeAt(q: Switches, duty: number, omega: number): BridgeNow {
  const els: DcElement[] = [
    { kind: "V", id: "Vs", a: "top", b: "gnd", volts: V_SUPPLY * duty },
    { kind: "S", id: "Q1", a: "top", b: "A", closed: q[0] },
    { kind: "S", id: "Q2", a: "A", b: "gnd", closed: q[1] },
    { kind: "S", id: "Q3", a: "top", b: "B", closed: q[2] },
    { kind: "S", id: "Q4", a: "B", b: "gnd", closed: q[3] },
    { kind: "R", id: "Rm", a: "A", b: "m", ohms: R_WINDING },
    // back-EMF: V(m) − V(B) = k·ω, so current A to B sees (V(A) − V(B) − E) / R
    { kind: "V", id: "Eb", a: "m", b: "B", volts: K_MOTOR * omega },
  ];
  const res = solveDC(els, { allowFloating: true });
  if (!res.ok) {
    return { shoot: true, message: res.message, i: 0, iq: [0, 0, 0, 0] };
  }
  const shoot = isShoot(q);
  return {
    shoot,
    message: shoot ? "Two switches on one side are closed, so the supply is shorted through them." : "",
    i: shoot ? 0 : res.el.Rm.i,
    iq: [res.el.Q1.i, res.el.Q2.i, res.el.Q3.i, res.el.Q4.i],
  };
}

export interface RunParams {
  q: Switches;
  /** 0 to 1 */
  duty: number;
  load: Load;
}

export interface Run {
  /** milliseconds */
  t: number[];
  /** motor current A to B, amps */
  i: number[];
  /** speed as a percentage of W_FREE (signed) */
  pct: number[];
  /** largest |current| in the run, amps */
  peakA: number;
  /** values at the end of the run */
  wEnd: number;
  iEnd: number;
  eEnd: number;
  pctEnd: number;
  shoot: boolean;
  message: string;
  /** bridge reading at the end of the run (for the drawing) */
  end: BridgeNow;
}

/** Simulate RUN_S seconds from speed `w0` (rad/s) with the switches, duty and load held fixed. */
export function simulateRun(p: RunParams, w0: number): Run {
  const t: number[] = [];
  const i: number[] = [];
  const pct: number[] = [];
  let w = p.load === "stalled" ? 0 : w0;
  let peak = 0;
  const steps = Math.round(RUN_S / DT);
  let now = bridgeAt(p.q, p.duty, w);
  for (let n = 0; n <= steps; n++) {
    now = bridgeAt(p.q, p.duty, w);
    peak = Math.max(peak, Math.abs(now.i));
    if (n % KEEP === 0 || n === steps) {
      t.push(n * DT * 1000);
      i.push(now.i);
      pct.push((w / W_FREE) * 100);
    }
    if (n === steps) break;
    if (p.load === "stalled") {
      w = 0;
      continue;
    }
    const drive = K_MOTOR * now.i;
    const tl = p.load === "loaded" ? T_LOAD : 0;
    if (tl === 0) {
      w += (DT * (drive - B_FRICTION * w)) / J_ROTOR;
    } else if (w === 0) {
      // static friction: the shaft only starts if the drive torque beats the load
      if (Math.abs(drive) > tl) w = (DT * (drive - Math.sign(drive) * tl)) / J_ROTOR;
    } else {
      const wn = w + (DT * (drive - B_FRICTION * w - tl * Math.sign(w))) / J_ROTOR;
      w = Math.sign(wn) !== Math.sign(w) && Math.abs(drive) <= tl ? 0 : wn;
    }
  }
  return {
    t,
    i,
    pct,
    peakA: peak,
    wEnd: w,
    iEnd: now.i,
    eEnd: K_MOTOR * w,
    pctEnd: (w / W_FREE) * 100,
    shoot: now.shoot,
    message: now.message,
    end: now,
  };
}
