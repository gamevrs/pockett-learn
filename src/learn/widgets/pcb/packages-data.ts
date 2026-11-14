/** Typical package facts for the gallery. Dimensions are typical nominal values (they vary by maker and variant). */

export type Mount = "THT" | "SMD";
/** 0 easy, 1 fiddly, 2 needs hot air or reflow, 3 not by hand */
export type Verdict = 0 | 1 | 2 | 3;

export const VERDICT_NAMES: Record<Verdict, string> = {
  0: "Easy",
  1: "Fiddly",
  2: "Needs hot air or reflow",
  3: "Not by hand",
};

export interface PackageInfo {
  id: string;
  /** short selector label */
  label: string;
  name: string;
  mount: Mount;
  /** pin pitch / lead spacing, with the word "typical" where it varies */
  pitch: string;
  /** where the pins are */
  pins: string;
  verdict: Verdict;
  /** the hand-soldering verdict in a sentence */
  solder: string;
  /** one more useful fact */
  fact: string;
  /** typical top-view size, mm (length along x, width along y) */
  size: [number, number];
  /** scale bar length in mm */
  bar: 1 | 5;
}

export const PACKAGES: PackageInfo[] = [
  {
    id: "dip8",
    label: "DIP-8",
    name: "DIP-8 (dual in-line, through-hole)",
    mount: "THT",
    pitch: "2.54 mm (0.1 in), rows 7.62 mm apart",
    pins: "Two rows of four leads along the long sides. The leads go through holes in the board.",
    verdict: 0,
    solder: "A basic iron and rosin-core solder are enough, and a socket lets you swap the chip.",
    fact: "Pin 1 is next to the notch or dot; count anticlockwise seen from the top.",
    size: [9.8, 7.6],
    bar: 5,
  },
  {
    id: "to220",
    label: "TO-220",
    name: "TO-220 (power, through-hole)",
    mount: "THT",
    pitch: "2.54 mm (typical) between three leads",
    pins: "Three leads in a row at one end, a metal tab with a screw hole at the other.",
    verdict: 0,
    solder: "Easy to solder. The tab is meant to be bolted to a heatsink, which is where the heat leaves.",
    fact: "The metal tab is often wired to one pin (e.g. the output on many regulators), so check before bolting it to a grounded heatsink.",
    size: [29, 10],
    bar: 5,
  },
  {
    id: "soic8",
    label: "SOIC-8",
    name: "SOIC-8 (small outline, SMD)",
    mount: "SMD",
    pitch: "1.27 mm",
    pins: "Four gull-wing leads on each long side, sitting on pads on the board surface.",
    verdict: 1,
    solder: "Doable with a fine tip, flux and a steady hand: tack one corner pin, then solder the rest. Often the first SMD chip people try.",
    fact: "Body about 4.9 × 3.9 mm (typical). A dot or bevelled edge marks pin 1.",
    size: [6.0, 3.9],
    bar: 1,
  },
  {
    id: "tssop",
    label: "TSSOP",
    name: "TSSOP-14 (thin shrink small outline, SMD)",
    mount: "SMD",
    pitch: "0.65 mm",
    pins: "Seven fine leads on each long side.",
    verdict: 1,
    solder: "Fiddly: the leads are close enough that a blob of solder bridges two of them. Flux and a drag-soldering technique, plus a magnifier, help.",
    fact: "Body about 5.0 × 4.4 mm (typical for 14 pins).",
    size: [6.4, 5.0],
    bar: 1,
  },
  {
    id: "qfn32",
    label: "QFN-32",
    name: "QFN-32 (quad flat no-lead, SMD)",
    mount: "SMD",
    pitch: "0.5 mm (typical)",
    pins: "Eight pads on each of the four sides, tucked under the edge, plus a large exposed pad under the centre.",
    verdict: 2,
    solder: "Needs hot air or reflow: the pads are under the chip, so an iron cannot reach them. The exposed pad also needs heat and a via or paste.",
    fact: "Body about 5 × 5 mm. The exposed pad carries heat to the board and is often ground.",
    size: [5, 5],
    bar: 1,
  },
  {
    id: "bga",
    label: "BGA",
    name: "BGA-144 (ball grid array, SMD)",
    mount: "SMD",
    pitch: "0.8 mm typical, 0.5 mm on dense chips",
    pins: "A grid of solder balls on the underside. None are visible from the top or the side.",
    verdict: 3,
    solder: "Not by hand: the balls are hidden and melt only in an oven or rework station. Inspection needs X-ray, and fixing one takes a rework station.",
    fact: "Body about 10 × 10 mm here. Large processors and memory use BGA because it fits hundreds of pins in a small area.",
    size: [10, 10],
    bar: 5,
  },
  {
    id: "r0805",
    label: "0805",
    name: "0805 chip (imperial code)",
    mount: "SMD",
    pitch: "two end pads, about 2.0 mm apart",
    pins: "A metal cap at each end. 0805 means 0.08 × 0.05 in, about 2.0 × 1.25 mm.",
    verdict: 1,
    solder: "Fiddly but fine: tweezers to hold it, tack one end, then the other. A good size for hand-assembled boards.",
    fact: "Imperial code: 0805 = 0.08 in × 0.05 in. The metric code for the same part is 2012.",
    size: [2.0, 1.25],
    bar: 1,
  },
  {
    id: "r0603",
    label: "0603",
    name: "0603 chip (imperial code)",
    mount: "SMD",
    pitch: "two end pads, about 1.6 mm apart",
    pins: "A metal cap at each end. About 1.6 × 0.8 mm.",
    verdict: 1,
    solder: "Fiddly: tiny enough to fly off the tweezers. Doable with magnification and patience.",
    fact: "The common choice for modern boards; metric code 1608.",
    size: [1.6, 0.8],
    bar: 1,
  },
  {
    id: "r0402",
    label: "0402",
    name: "0402 chip (imperial code)",
    mount: "SMD",
    pitch: "two end pads, about 1.0 mm apart",
    pins: "A metal cap at each end. About 1.0 × 0.5 mm, smaller than a grain of rice.",
    verdict: 2,
    solder: "Hot air or reflow is the sensible way: a hand iron can do it with practice, but the part is easy to lose or tombstone.",
    fact: "Often carries no marking at all. Metric code 1005.",
    size: [1.0, 0.5],
    bar: 1,
  },
];

export const PACKAGE_IDS = PACKAGES.map((p) => p.id);
