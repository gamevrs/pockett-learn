/**
 * Data and pure logic for the mock datasheet of the PK3302, a MADE-UP 3.3 V, 500 mA low-dropout regulator.
 * Every number here is invented for the lesson and self-consistent; none of it describes a real product.
 */

export const PART_NAME = "PK3302";
export const VOUT = 3.3;
/** Thermal resistance, junction to ambient, on the stated test board (°C per watt). */
export const THETA_JA = 60;
export const TJ_REC_MAX = 125;
export const VIN_REC_MAX = 12;
export const VIN_REC_MIN = 4.5;
export const VIN_ABS_MAX = 16;
export const IOUT_REC_MAX = 0.5;

export type SectionId = "features" | "pinout" | "absmax" | "rec" | "ec" | "thermal" | "app";
export const SECTION_IDS: SectionId[] = ["features", "pinout", "absmax", "rec", "ec", "thermal", "app"];

export interface PinRow {
  id: string;
  pin: string;
  name: string;
  text: string;
}
export const PINS: PinRow[] = [
  { id: "pin-gnd", pin: "1", name: "GND", text: "Ground. Return for input and output." },
  { id: "pin-out", pin: "2", name: "OUT", text: "Regulated 3.3 V output." },
  { id: "pin-in", pin: "3", name: "IN", text: "Supply input, 4.5 to 12 V." },
  { id: "pin-tab", pin: "4 (tab)", name: "OUT", text: "Metal tab, connected to OUT. Solder it to a copper pad to shed heat." },
];

export interface ValueCell {
  id: string;
  /** shown on the cell, e.g. "−0.3 to 16 V" */
  text: string;
  /** which column it is: shown as a tiny tag on the cell */
  tag?: string;
}
export interface TableRow {
  param: string;
  cond?: string;
  cells: ValueCell[];
}

export const ABSMAX: TableRow[] = [
  { param: "Input voltage, VIN", cells: [{ id: "absmax-vin", text: "−0.3 to 16 V" }] },
  { param: "Output current, IOUT", cells: [{ id: "absmax-iout", text: "internally limited" }] },
  { param: "Junction temperature, TJ", cells: [{ id: "absmax-tj", text: "150 °C" }] },
  { param: "Storage temperature", cells: [{ id: "absmax-tstg", text: "−65 to 150 °C" }] },
  { param: "ESD, human-body model", cells: [{ id: "absmax-esd", text: "2 kV" }] },
];

export const REC: TableRow[] = [
  { param: "Input voltage, VIN", cells: [{ id: "rec-vin-min", tag: "min", text: "4.5 V" }, { id: "rec-vin-max", tag: "max", text: "12 V" }] },
  { param: "Output current, IOUT", cells: [{ id: "rec-iout-min", tag: "min", text: "0 mA" }, { id: "rec-iout-max", tag: "max", text: "500 mA" }] },
  { param: "Junction temperature, TJ", cells: [{ id: "rec-tj-min", tag: "min", text: "−40 °C" }, { id: "rec-tj-max", tag: "max", text: "125 °C" }] },
];

export const EC: TableRow[] = [
  {
    param: "Output voltage, VOUT",
    cond: "VIN = 5 V, IOUT = 10 mA, TJ = 25 °C",
    cells: [{ id: "ec-vout-min", tag: "min", text: "3.234 V" }, { id: "ec-vout-typ", tag: "typ", text: "3.3 V" }, { id: "ec-vout-max", tag: "max", text: "3.366 V" }],
  },
  {
    param: "Line regulation",
    cond: "VIN = 4.5 to 12 V, IOUT = 10 mA",
    cells: [{ id: "ec-line-typ", tag: "typ", text: "2 mV" }, { id: "ec-line-max", tag: "max", text: "10 mV" }],
  },
  {
    param: "Load regulation",
    cond: "VIN = 5 V, IOUT = 10 to 500 mA",
    cells: [{ id: "ec-load-typ", tag: "typ", text: "5 mV" }, { id: "ec-load-max", tag: "max", text: "20 mV" }],
  },
  {
    param: "Dropout voltage",
    cond: "IOUT = 500 mA, VOUT 2 % below nominal",
    cells: [{ id: "ec-dropout-typ", tag: "typ", text: "0.6 V" }, { id: "ec-dropout-max", tag: "max", text: "1.0 V" }],
  },
  {
    param: "Quiescent current, IQ",
    cond: "VIN = 5 V, IOUT = 0",
    cells: [{ id: "ec-iq-typ", tag: "typ", text: "1.5 mA" }, { id: "ec-iq-max", tag: "max", text: "3 mA" }],
  },
  {
    param: "Current limit",
    cond: "VIN = 5 V, output shorted",
    cells: [{ id: "ec-ilim-min", tag: "min", text: "600 mA" }, { id: "ec-ilim-typ", tag: "typ", text: "800 mA" }],
  },
];

/** What each tappable cell means, in plain words. Shown in "read" mode and after answering in "find" mode. */
export const MEANINGS: Record<string, string> = {
  "pin-gnd": "Pin 1 is ground (GND). Pin numbers come from the package drawing, so read them from the pinout, never from memory.",
  "pin-out": "Pin 2 is the regulated output (OUT): 3.3 V for the rest of your circuit.",
  "pin-in": "Pin 3 is the input (IN): where the supply comes in, 4.5 to 12 V.",
  "pin-tab": "The metal tab is not a separate signal: it is wired to OUT. It is also the way heat leaves the package, so the datasheet wants it soldered to copper.",
  "absmax-vin": "Absolute maximum input voltage: −0.3 to 16 V. Beyond this the part can be damaged. It is a limit not to cross, not a voltage to run at.",
  "absmax-iout": "No fixed number: the part limits its own output current internally (see the current limit row). Do not count on that as a way to protect your circuit.",
  "absmax-tj": "Junction temperature (the temperature of the silicon itself) above 150 °C can damage the part, even briefly.",
  "absmax-tstg": "How cold or hot the part may be when it is just sitting in a box or on a shelf, not powered.",
  "absmax-esd": "It survives a 2 kV static zap in the human-body-model test. That is for handling; it does not make the pins safe to abuse.",
  "rec-vin-min": "Below 4.5 V the regulator may not hold 3.3 V: this is the lowest input the specs promise.",
  "rec-vin-max": "The highest input voltage at which the electrical-characteristics numbers are guaranteed: 12 V. Higher is 'works maybe', not 'guaranteed'.",
  "rec-iout-min": "The part can run with no load at all.",
  "rec-iout-max": "Up to 500 mA is the guaranteed load current.",
  "rec-tj-min": "Coldest junction temperature at which the specs are guaranteed.",
  "rec-tj-max": "Hottest junction temperature at which the specs are guaranteed: 125 °C. The 150 °C absolute maximum is the damage line; this is the working line.",
  "ec-vout-min": "Lowest output you can get from a good part under the stated conditions: 3.234 V (2 % below 3.3 V).",
  "ec-vout-typ": "Typical output: 3.3 V. A typical value is what a part usually does, not something guaranteed.",
  "ec-vout-max": "Highest output you can get from a good part under the stated conditions: 3.366 V (2 % above 3.3 V).",
  "ec-line-typ": "Typical change in output when the input moves across its range.",
  "ec-line-max": "At most 10 mV of output change when the input moves from 4.5 to 12 V.",
  "ec-load-typ": "Typical change in output when the load goes from 10 to 500 mA.",
  "ec-load-max": "At most 20 mV of output droop when the load goes from 10 to 500 mA.",
  "ec-dropout-typ": "Typical dropout: the output starts to fall out of regulation when VIN is within about 0.6 V of VOUT at 500 mA.",
  "ec-dropout-max": "Worst-case dropout: up to 1.0 V at 500 mA. For a guaranteed 3.3 V you need VIN at least 3.3 + 1.0 = 4.3 V at full load.",
  "ec-iq-typ": "Typical current the regulator itself draws with no load.",
  "ec-iq-max": "Worst case the regulator draws 3 mA by itself, a number that matters for batteries.",
  "ec-ilim-min": "The current limit is at least 600 mA, so a 500 mA load never hits it on a good part.",
  "ec-ilim-typ": "Typical current limit: 800 mA when the output is shorted.",
  "theta-ja": "Thermal resistance: every watt burnt in the part raises the junction 60 °C above the air around it, on the board described in the conditions. Your board may differ.",
  "app-cin": "Input capacitor: 10 µF near the pin keeps the input steady, especially if the supply is some distance away.",
  "app-cout": "Output capacitor: at least 10 µF is REQUIRED for stability. Leave it out and the regulator can oscillate.",
};

export function meaningOf(id: string): string {
  return MEANINGS[id] ?? "";
}

/** A short human label for a cell id, for the "you picked ..." line and screen readers. */
export function labelOf(id: string): string {
  for (const p of PINS) if (p.id === id) return `pin ${p.pin} ${p.name}`;
  for (const rows of [ABSMAX, REC, EC]) {
    for (const r of rows) for (const c of r.cells) if (c.id === id) return `${r.param}${c.tag ? ` ${c.tag}` : ""}, ${c.text}`;
  }
  if (id === "theta-ja") return "thermal resistance θJA, 60 °C/W";
  if (id === "app-cin") return "input capacitor";
  if (id === "app-cout") return "output capacitor";
  return id;
}

/* ───────────────────────── design review (audit) ───────────────────────── */

export interface Design {
  vin: number;
  iout: number;
  ta: number;
  cin: boolean;
  cout: boolean;
}
export const DEFAULT_DESIGN: Design = { vin: 15, iout: 0.45, ta: 60, cin: true, cout: false };

/** P = (VIN − VOUT) × IOUT, in watts. Ignores the small quiescent power VIN × IQ (a stated simplification). */
export function dissipation(vin: number, iout: number, vout = VOUT): number {
  return (vin - vout) * iout;
}
/** TJ = TA + P × θJA. */
export function junctionTemp(ta: number, p: number, theta = THETA_JA): number {
  return ta + p * theta;
}
/** Highest VIN that keeps TJ at its recommended maximum for this load and ambient. */
export function maxVinForThermal(iout: number, ta: number, vout = VOUT, theta = THETA_JA, tjMax = TJ_REC_MAX): number {
  return vout + (tjMax - ta) / theta / iout;
}

export interface ReviewRow {
  id: string;
  text: string;
  /** does this row break the datasheet? */
  violates: boolean;
  /** the working, shown once revealed */
  working: string;
}

const f = (v: number, d = 1) => (Math.round(v * 10 ** d) / 10 ** d).toString();

export function reviewRows(d: Design): ReviewRow[] {
  const p = dissipation(d.vin, d.iout);
  const tj = junctionTemp(d.ta, p);
  const vinBad = d.vin > VIN_REC_MAX || d.vin < VIN_REC_MIN;
  const vinWhy =
    d.vin > VIN_ABS_MAX
      ? `${f(d.vin)} V is above even the ${VIN_ABS_MAX} V absolute maximum: the part can be damaged.`
      : d.vin > VIN_REC_MAX
        ? `${f(d.vin)} V is under the ${VIN_ABS_MAX} V absolute maximum but above the ${VIN_REC_MAX} V recommended limit, so the specs are not guaranteed and a 1 V margin to damage is thin for an unregulated adapter.`
        : d.vin < VIN_REC_MIN
          ? `${f(d.vin)} V is below the ${VIN_REC_MIN} V recommended minimum.`
          : `${f(d.vin)} V sits inside the recommended ${VIN_REC_MIN} to ${VIN_REC_MAX} V range.`;
  const maxV = maxVinForThermal(d.iout, d.ta);
  return [
    { id: "vin", text: `Input: ${f(d.vin)} V from a wall adapter`, violates: vinBad, working: vinWhy },
    {
      id: "iout",
      text: `Load: ${Math.round(d.iout * 1000)} mA`,
      violates: d.iout > IOUT_REC_MAX,
      working: d.iout > IOUT_REC_MAX ? `${Math.round(d.iout * 1000)} mA is above the 500 mA recommended maximum.` : `${Math.round(d.iout * 1000)} mA is under the 500 mA recommended maximum.`,
    },
    {
      id: "ta",
      text: `Ambient temperature: ${f(d.ta, 0)} °C inside the enclosure`,
      violates: d.ta > TJ_REC_MAX,
      working: `The datasheet limits the junction, not the air. ${f(d.ta, 0)} °C ambient is fine by itself; it is the starting point for the junction temperature in the next row.`,
    },
    {
      id: "tj",
      text: `Heat: the part is soldered to the board with no extra copper (θJA = ${THETA_JA} °C/W)`,
      violates: tj > TJ_REC_MAX,
      working: `P = (${f(d.vin)} − ${VOUT}) × ${f(d.iout, 2)} A = ${f(p, 2)} W. TJ = ${f(d.ta, 0)} + ${f(p, 2)} × ${THETA_JA} = ${f(tj, 0)} °C, far over the ${TJ_REC_MAX} °C recommended and the 150 °C absolute maximum. For this load and ambient, VIN could be at most about ${f(maxV)} V.`,
    },
    {
      id: "cout",
      text: d.cout ? "Output capacitor: 10 µF at the output pin" : "Output capacitor: none fitted",
      violates: !d.cout,
      working: d.cout ? "A 10 µF output capacitor meets the requirement." : "The application circuit calls for at least 10 µF on the output for stability. Without it the regulator may oscillate.",
    },
    {
      id: "cin",
      text: d.cin ? "Input capacitor: 10 µF at the input pin" : "Input capacitor: none fitted",
      violates: !d.cin,
      working: d.cin ? "A 10 µF input capacitor matches the typical application circuit." : "The typical application circuit shows a 10 µF input capacitor.",
    },
  ];
}

/** Ids of the rows that violate, in order. */
export function violations(d: Design): string[] {
  return reviewRows(d)
    .filter((r) => r.violates)
    .map((r) => r.id);
}
