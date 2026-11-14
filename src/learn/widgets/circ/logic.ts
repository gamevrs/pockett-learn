/**
 * Pure maths behind the circuits widgets (no React, no DOM, so it also runs in Node). Every number a widget shows comes from
 * here or from the shared DC solver. All models are toys: ideal wires, ideal parts, no temperature drift unless stated.
 */
import { solveDC, type DcElement } from "../elec-kit/solve";

export const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** Resistor values the sliders step through (an E12-flavoured ladder, in ohms). */
export const RES_STEPS = [10, 22, 47, 100, 220, 330, 470, 680, 1000, 1500, 2200, 3300, 4700, 6800, 10000, 22000, 47000, 100000];

export function nearestStep(ohms: number, steps: number[] = RES_STEPS): number {
  let best = 0;
  steps.forEach((s, i) => {
    if (Math.abs(Math.log(s / ohms)) < Math.abs(Math.log(steps[best] / ohms))) best = i;
  });
  return best;
}

/** Ohm's law, three ways round. */
export const currentOf = (v: number, r: number) => v / r;
export const voltageOf = (i: number, r: number) => i * r;
export const resistanceOf = (v: number, i: number) => v / i;
export const powerOf = (v: number, i: number) => v * i;

/** Combine resistors. */
export const seriesR = (rs: number[]) => rs.reduce((s, r) => s + r, 0);
export const parallelR = (rs: number[]) => 1 / rs.reduce((s, r) => s + 1 / r, 0);

/* ───────────────────────── Ohm's law with a lamp ───────────────────────── */

/** The toy lamp: 50 Ω, "full brightness" at 0.6 W (about 5.5 V across it). */
export const LAMP_OHMS = 50;
export const LAMP_RATED_W = 0.6;

export interface OhmState {
  v: number;
  r: number;
  /** current through the loop, amps */
  i: number;
  /** power in the lamp (0 without a lamp) */
  lampW: number;
  /** 0 to 1 */
  brightness: number;
}

export function ohmState(v: number, r: number, withLamp: boolean): OhmState {
  const total = withLamp ? r + LAMP_OHMS : r;
  const i = v / total;
  const lampW = withLamp ? i * i * LAMP_OHMS : 0;
  return { v, r, i, lampW, brightness: withLamp ? clamp(lampW / LAMP_RATED_W, 0, 1) : 0 };
}

/* ───────────────────────── series and parallel ───────────────────────── */

export type Topology = "series" | "parallel";
export interface NetResult {
  rTotal: number;
  iTotal: number;
  /** per resistor: volts across, amps through, watts */
  each: { v: number; i: number; p: number }[];
}

/** Closed-form answer for the series/parallel builder (cross-checked against solveDC in the node script). */
export function network(topology: Topology, rs: number[], volts: number): NetResult {
  if (topology === "series") {
    const rTotal = seriesR(rs);
    const i = volts / rTotal;
    return { rTotal, iTotal: i, each: rs.map((r) => ({ v: i * r, i, p: i * i * r })) };
  }
  const rTotal = parallelR(rs);
  return { rTotal, iTotal: volts / rTotal, each: rs.map((r) => ({ v: volts, i: volts / r, p: (volts * volts) / r })) };
}

/* ───────────────────────── Kirchhoff: two batteries, three resistors ───────────────────────── */

export interface KirchhoffResult {
  /** voltage at the middle node A (relative to ground) */
  va: number;
  /** current in R1 and R3, amps, positive = flowing INTO node A */
  i1: number;
  i3: number;
  /** current from A down through R2 to ground (positive = out of A) */
  i2: number;
  /** voltage drops across R1, R2, R3 in the directions above */
  v1: number;
  v2: number;
  v3: number;
}

/**
 * B1 (left) pushes current through R1 into node A, B2 (right) pushes through R3 into node A, and R2 takes whatever arrives to
 * ground. Solved with the shared DC solver; i1 and i3 are the currents flowing into A, i2 the current leaving A through R2.
 */
export function kirchhoff(b1: number, b2: number, r1: number, r2: number, r3: number): KirchhoffResult {
  const els: DcElement[] = [
    { kind: "V", id: "B1", a: "p1", b: "gnd", volts: b1 },
    { kind: "R", id: "R1", a: "p1", b: "A", ohms: r1 },
    { kind: "R", id: "R2", a: "A", b: "gnd", ohms: r2 },
    { kind: "R", id: "R3", a: "p2", b: "A", ohms: r3 },
    { kind: "V", id: "B2", a: "p2", b: "gnd", volts: b2 },
  ];
  const s = solveDC(els);
  if (!s.ok) throw new Error(s.message);
  return { va: s.v.A, i1: s.el.R1.i, i3: s.el.R3.i, i2: s.el.R2.i, v1: s.el.R1.v, v2: s.el.R2.v, v3: s.el.R3.v };
}

/* ───────────────────────── voltage divider, loading, sensors ───────────────────────── */

export const dividerOut = (vin: number, r1: number, r2: number) => (vin * r2) / (r1 + r2);

/** Divider with a load across the bottom resistor (Infinity = no load). */
export function loadedDivider(vin: number, r1: number, r2: number, rLoad: number) {
  const bottom = Number.isFinite(rLoad) ? parallelR([r2, rLoad]) : r2;
  const vout = dividerOut(vin, r1, bottom);
  const iTop = vin / (r1 + bottom);
  return { vout, vUnloaded: dividerOut(vin, r1, r2), iTop, bottom };
}

/** Toy LDR: 10 kΩ at 100 lux, resistance proportional to lux^−0.8 (real parts vary a lot; this is the typical shape only). */
export const ldrOhms = (lux: number) => 10000 * Math.pow(100 / lux, 0.8);

/** NTC thermistor, beta model: R = R25 · exp(B (1/T − 1/298.15 K)), 10 kΩ at 25 °C, B = 3950 K (a common catalogue value). */
export const ntcOhms = (celsius: number, r25 = 10000, beta = 3950) => r25 * Math.exp(beta * (1 / (celsius + 273.15) - 1 / 298.15));

/* ───────────────────────── power and heat ───────────────────────── */

export interface HeatState {
  watts: number;
  amps: number;
  /** watts as a share of the rating */
  load: number;
  over: boolean;
}
export function heat(v: number, r: number, ratingW: number): HeatState {
  const i = v / r;
  const watts = v * i;
  return { watts, amps: i, load: watts / ratingW, over: watts > ratingW };
}

/** Battery runtime in hours: capacity in mAh at a steady draw in mA. */
export const runtimeHours = (capacityMah: number, drawMa: number) => capacityMah / drawMa;
/** Energy in watt-hours from mAh and volts. */
export const energyWh = (capacityMah: number, volts: number) => (capacityMah / 1000) * volts;

/* ───────────────────────── real sources ───────────────────────── */

/** A cell with internal resistance: terminal voltage under a load. */
export function cellUnderLoad(voc: number, ri: number, rLoad: number) {
  const i = voc / (ri + rLoad);
  return { i, vTerminal: voc - i * ri, lost: i * i * ri, delivered: i * i * rLoad, efficiency: rLoad / (ri + rLoad) };
}

/**
 * Bench supply with a current limit: constant voltage until the load asks for more than `limit` amps, then it holds the current
 * and lets the voltage fall (constant-current mode).
 */
export function benchUnderLoad(vset: number, limit: number, rLoad: number) {
  const iWant = vset / rLoad;
  if (iWant <= limit) return { i: iWant, v: vset, mode: "CV" as const };
  return { i: limit, v: limit * rLoad, mode: "CC" as const };
}

/** A fuse opens when the current passes its rating (toy: no time delay; real fuses take longer for small overloads). */
export function fuseBlows(i: number, ratingA: number) {
  return Math.abs(i) > ratingA;
}

/** A short circuit through a source with internal resistance `ri`: the current, and the heat in the source. */
export function shortCircuit(voc: number, ri: number, rLoad: number, fuseA: number | null) {
  const i = voc / (ri + rLoad);
  const blown = fuseA !== null && fuseBlows(i, fuseA);
  return { i, blown, lostInCell: i * i * ri, inLoad: i * i * rLoad };
}

/* ───────────────────────── the virtual multimeter ───────────────────────── */

export type MeterMode = "V" | "A" | "ohm";
export type MeterPlace = "r1" | "r2" | "battery" | "series";

export const METER = {
  /** a voltmeter's input resistance (typical digital meter) */
  voltInput: 10e6,
  /** an ammeter's burden, a small resistance */
  ampBurden: 0.05,
  /** the ammeter input's fuse, amps */
  fuseA: 0.5,
};

export interface MeterScenario {
  battery: number;
  r1: number;
  r2: number;
  /** is the battery connected (switch closed)? */
  power: boolean;
}

export interface MeterReading {
  /** the number to show, in the unit of the mode; null when the meter shows a word instead */
  value: number | null;
  /** word for the display when value is null */
  display: string;
  tone: "good" | "bad" | "neutral";
  /** what happened, in plain words */
  note: string;
  fuseBlown?: boolean;
}

function solveMeter(sc: MeterScenario, place: MeterPlace, mode: "V" | "A") {
  const els: DcElement[] = [{ kind: "V", id: "B", a: "top", b: "gnd", volts: sc.power ? sc.battery : 0 }];
  const meterR = mode === "A" ? METER.ampBurden : METER.voltInput;
  if (place === "series") {
    els.push({ kind: "R", id: "R1", a: "top", b: "x", ohms: sc.r1 });
    els.push({ kind: "R", id: "M", a: "x", b: "mid", ohms: meterR });
    els.push({ kind: "R", id: "R2", a: "mid", b: "gnd", ohms: sc.r2 });
  } else {
    els.push({ kind: "R", id: "R1", a: "top", b: "mid", ohms: sc.r1 });
    els.push({ kind: "R", id: "R2", a: "mid", b: "gnd", ohms: sc.r2 });
    const [a, b] = place === "r1" ? ["top", "mid"] : place === "r2" ? ["mid", "gnd"] : ["top", "gnd"];
    els.push({ kind: "R", id: "M", a, b, ohms: meterR });
  }
  const s = solveDC(els, { allowFloating: true });
  if (!s.ok) throw new Error(s.message);
  return s;
}

const PLACE_NAME: Record<MeterPlace, string> = { r1: "R1", r2: "R2", battery: "the battery", series: "the loop" };

export function readMeter(sc: MeterScenario, place: MeterPlace, mode: MeterMode): MeterReading {
  if (mode === "ohm") {
    if (sc.power) {
      return {
        value: null,
        display: "ERR",
        tone: "bad",
        note: "Never measure resistance on a powered circuit: the meter sends its own tiny test current, and the battery's voltage would swamp it (and could damage the meter). Switch the circuit off first.",
      };
    }
    if (place === "series") {
      return { value: null, display: "OL", tone: "neutral", note: "Resistance is measured ACROSS a part, with the circuit off. Probes in the gap of the loop see an open circuit, which the meter shows as OL (over limit)." };
    }
    // powered off, battery out of the picture: what the rest of the circuit offers across the probes
    const ohms = place === "r1" ? sc.r1 : place === "r2" ? sc.r2 : sc.r1 + sc.r2;
    return {
      value: ohms,
      display: "",
      tone: "good",
      note: place === "battery" ? "With the battery disconnected, the probes see R1 and R2 in series: R1 + R2." : "Circuit off: the meter sends its own tiny current through this resistor and reads its resistance.",
    };
  }
  if (mode === "V") {
    const s = solveMeter(sc, place, "V");
    if (place === "series") {
      return {
        value: Math.abs(s.el.M.v),
        display: "",
        tone: "bad",
        note: sc.power
          ? "A voltmeter in the loop is a 10 MΩ resistor in series. Almost no current can flow, so R1 and R2 get nothing and the meter shows nearly the whole battery voltage. Wrong place: volts go ACROSS a part."
          : "The battery is disconnected, so there is no voltage to read.",
      };
    }
    return {
      value: Math.abs(s.el.M.v),
      display: "",
      tone: "good",
      note: sc.power ? "Volts are measured ACROSS a part, with a probe on each end. The 10 MΩ meter barely disturbs the circuit." : "The battery is disconnected, so every part reads 0 V.",
    };
  }
  const s = solveMeter(sc, place, "A");
  if (place === "series") {
    return {
      value: Math.abs(s.el.M.i),
      display: "",
      tone: "good",
      note: sc.power ? "Amps are measured IN SERIES: the loop is opened and the meter becomes part of it, so all the current flows through it." : "The circuit is off, so no current flows.",
    };
  }
  const i = Math.abs(s.el.M.i);
  if (sc.power && fuseBlows(i, METER.fuseA)) {
    return {
      value: null,
      display: "FUSE",
      tone: "bad",
      fuseBlown: true,
      note: `An ammeter is almost a wire. Across ${PLACE_NAME[place]} it would have to carry about ${i < 1 ? Math.round(i * 1000) + " mA" : Math.round(i) + " A"}. Its ${METER.fuseA} A fuse blows, which is exactly the fuse's job. Amps go IN SERIES, never across a supply.`,
    };
  }
  return {
    value: i,
    display: "",
    tone: "bad",
    note: sc.power
      ? `Across ${PLACE_NAME[place]} the ammeter is a near-wire in parallel, so it shorts that part out and changes the circuit. This is not the current that flowed before you connected it.`
      : "The circuit is off, so no current flows.",
  };
}
