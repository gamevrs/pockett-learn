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
export type MeterPlace = "r1" | "r2" | "battery" | "switch" | "series";

export const METER = {
  /** a voltmeter's input resistance (typical digital meter) */
  voltInput: 10e6,
  /** an ammeter's burden, a small resistance */
  ampBurden: 0.05,
  /** the ammeter input's fuse, amps */
  fuseA: 0.5,
  /** the ohmmeter's test current, amps (typical meters use well under a milliamp) */
  testCurrent: 1e-4,
  /** above this the ohmmeter shows OL (over limit), ohms */
  olOhms: 1e7,
};

/**
 * The circuit under test: B1 (+ at node p) -> S1 -> node s -> [gap] -> node g -> R1 -> node mid -> R2 -> ground -> B1 (-).
 * `power` means the switch is closed. The battery is always connected: opening the switch only breaks the loop.
 */
export interface MeterScenario {
  battery: number;
  r1: number;
  r2: number;
  /** switch closed? */
  power: boolean;
}

export interface MeterReading {
  /** the number to show, in the unit of the mode; null when the display shows a word */
  value: number | null;
  /** word for the display when value is null: OL, ??, FUSE */
  display: string;
  tone: "good" | "bad" | "neutral";
  /** what happened, in plain words */
  note: string;
  fuseBlown?: boolean;
}

const ENDS: Record<MeterPlace, [string, string]> = {
  r1: ["g", "mid"],
  r2: ["mid", "gnd"],
  battery: ["p", "gnd"],
  switch: ["p", "s"],
  series: ["s", "g"],
};

function base(sc: MeterScenario, place: MeterPlace, batteryVolts: number): DcElement[] {
  const els: DcElement[] = [
    { kind: "V", id: "B", a: "p", b: "gnd", volts: batteryVolts },
    { kind: "S", id: "S1", a: "p", b: "s", closed: sc.power },
    { kind: "R", id: "R1", a: "g", b: "mid", ohms: sc.r1 },
    { kind: "R", id: "R2", a: "mid", b: "gnd", ohms: sc.r2 },
  ];
  // the wire between s and g is cut only when the meter sits in the loop there
  if (place !== "series") els.push({ kind: "S", id: "W", a: "s", b: "g", closed: true });
  return els;
}

function solveMeter(sc: MeterScenario, place: MeterPlace, mode: "V" | "A") {
  const [a, b] = ENDS[place];
  const els = base(sc, place, sc.battery);
  els.push({ kind: "R", id: "M", a, b, ohms: mode === "A" ? METER.ampBurden : METER.voltInput });
  const s = solveDC(els, { allowFloating: true });
  if (!s.ok) throw new Error(s.message);
  return s;
}

/** The ohmmeter pushes a small test current through the part and reads volts / amps, so any source in the path corrupts it. */
function ohmReading(sc: MeterScenario, place: MeterPlace, batteryVolts: number): number {
  const [a, b] = ENDS[place];
  const els = base(sc, place, batteryVolts);
  els.push({ kind: "I", id: "T", a, b, amps: METER.testCurrent });
  els.push({ kind: "R", id: "L", a, b, ohms: 1e9 });
  const s = solveDC(els, { allowFloating: true });
  if (!s.ok) throw new Error(s.message);
  return (s.v[b] - s.v[a]) / METER.testCurrent;
}

const PLACE_NAME: Record<MeterPlace, string> = { r1: "R1", r2: "R2", battery: "the battery", switch: "the switch", series: "the loop" };

export function readMeter(sc: MeterScenario, place: MeterPlace, mode: MeterMode): MeterReading {
  const open = !sc.power;
  if (mode === "ohm") {
    const passive = ohmReading(sc, place, 0);
    const live = ohmReading(sc, place, sc.battery);
    if (passive > METER.olOhms) {
      return {
        value: null,
        display: "OL",
        tone: "neutral",
        note:
          place === "series"
            ? "The loop is open at the switch, so with the probes in the gap there is no way round: the meter shows OL (over limit), an open circuit."
            : "Nothing connects the probes except air: the meter shows OL (over limit), an open circuit.",
      };
    }
    if (Math.abs(live - passive) > 1e-3 * Math.max(passive, 1)) {
      return {
        value: null,
        display: "??",
        tone: "bad",
        note: "The battery is in the path the meter's test current takes, so its voltage fights the test current and the reading is meaningless (it could be anything, even negative, and it can damage the meter). Measure resistance with no source in the path: take the part out, or at least cut the battery off from it.",
      };
    }
    return {
      value: passive,
      display: "",
      tone: "good",
      note: open
        ? "The open switch cuts the battery out of the path, so the meter's test current only sees this resistor and the reading is true. A cleaner habit is to remove the part or disconnect the battery."
        : "No source in the path, so the reading is the true resistance.",
    };
  }
  if (mode === "V") {
    const s = solveMeter(sc, place, "V");
    const v = Math.abs(s.el.M.v);
    if (place === "series") {
      return {
        value: v,
        display: "",
        tone: "bad",
        note: sc.power
          ? "A voltmeter in the loop is a 10 MΩ resistor in series. Almost no current can flow, so R1 and R2 get nothing and the meter shows nearly the whole battery voltage. Wrong place: volts go ACROSS a part."
          : "The loop is open at the switch and the meter sits in a second gap: no current flows, so it reads nothing. Volts go ACROSS a part, not in the loop.",
      };
    }
    const note =
      place === "switch"
        ? open
          ? "An open switch has the whole battery voltage across it: that is how you find the gap."
          : "A closed switch is a wire, so there is no voltage across it."
        : open && (place === "r1" || place === "r2")
          ? "With the switch open no current flows, so there is no voltage drop across this resistor: 0 V."
          : place === "battery"
            ? "The battery's voltage is there whether or not the switch is closed."
            : "Volts are measured ACROSS a part, with a probe on each end. The 10 MΩ meter barely disturbs the circuit.";
    return { value: v, display: "", tone: "good", note };
  }
  // amps
  const s = solveMeter(sc, place, "A");
  const i = Math.abs(s.el.M.i);
  if (fuseBlows(i, METER.fuseA)) {
    return {
      value: null,
      display: "FUSE",
      tone: "bad",
      fuseBlown: true,
      note: `An ammeter is almost a wire. Across ${PLACE_NAME[place]} it would have to carry about ${i < 1 ? Math.round(i * 1000) + " mA" : Math.round(i) + " A"}. Its ${METER.fuseA} A fuse blows, which is exactly the fuse's job. Amps go IN SERIES, never across a supply.`,
    };
  }
  if (place === "series") {
    return {
      value: i,
      display: "",
      tone: sc.power ? "good" : "neutral",
      note: sc.power ? "Amps are measured IN SERIES: the loop is opened and the meter becomes part of it, so all the current flows through it." : "The switch is open, so the loop is broken and no current flows. Close the switch to see the current.",
    };
  }
  if (place === "switch") {
    return open
      ? { value: i, display: "", tone: "good", note: "The meter bridges the open switch, so the current flows through the meter instead: it is in series with the rest of the loop, which works." }
      : { value: i, display: "", tone: "neutral", note: "A closed switch is already a wire, so almost all the current bypasses the meter and it reads nearly nothing. Put the meter in the loop instead." };
  }
  return {
    value: i,
    display: "",
    tone: "bad",
    note: sc.power
      ? `Across ${PLACE_NAME[place]} the ammeter is a near-wire in parallel, so it shorts that part out and changes the circuit. This is not the current that flowed before you connected it.`
      : "The switch is open so the loop is broken: nothing flows through the meter. Anyway, amps do not go across a part.",
  };
}
