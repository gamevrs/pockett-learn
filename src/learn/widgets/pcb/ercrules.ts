/**
 * Pure rules engine for the "run ERC" widget. The sensor board has four seeded mistakes; each is a bug id with
 * the fix options a learner can try (exactly one is right). "decap" is a design-review catch, not an ERC error.
 */

export type BugId = "nrst" | "contention" | "decap" | "vdd";

export interface FixOption {
  id: string;
  label: string;
  right: boolean;
  /** Shown when this option is tried: why it works, or why it does not. */
  why: string;
}

export interface Bug {
  id: BugId;
  /** "erc": a real ERC rule flags it. "review": a checklist / design-review catch. */
  kind: "erc" | "review";
  title: string;
  /** What the checker prints (one or two lines). */
  lines: string[];
  detail: string;
  options: FixOption[];
}

export const BUGS: Record<BugId, Bug> = {
  nrst: {
    id: "nrst",
    kind: "erc",
    title: "Unconnected input pin",
    lines: ["U1 pin NRST (input) is not connected to anything."],
    detail:
      "An input that nothing drives floats: it picks up noise and can read high or low at random, here resetting the chip now and then. ERC flags an unconnected pin as an error.",
    options: [
      { id: "pullup", label: "Pull NRST up to 3V3 through 10 kΩ", right: true, why: "Right. The resistor holds the line high when nothing else drives it, and a reset button could still pull it low. (Many real MCUs have an internal pull-up; this made-up one says to add an external one.)" },
      { id: "gnd", label: "Wire NRST straight to GND", right: false, why: "That connects the pin, so ERC goes quiet, but it holds the chip in reset forever. ERC checks connections, not whether the design works." },
      { id: "nc", label: "Put a \"no connect\" flag on NRST", right: false, why: "A no-connect flag says \"I meant to leave this open\". Fine for an unused pin, wrong for a reset input that must be held high." },
    ],
  },
  contention: {
    id: "contention",
    kind: "erc",
    title: "Two outputs on one net",
    lines: ["Pin conflict on net DATA: U3 OUT (output) and U4 OUT (output) are connected together."],
    detail:
      "A push-pull output drives its pin hard high or hard low. If two do that on one net and disagree, one pushes up while the other pulls down: the line sits at a muddy level and a large current flows between the chips. ERC's pin-type matrix flags output-to-output.",
    options: [
      { id: "one", label: "Keep one driver: disconnect U4 OUT from DATA", right: true, why: "Right. One driver per net. (Buses that need several talkers use open-drain outputs with one pull-up, as I²C does, or tri-state outputs with enables.)" },
      { id: "series", label: "Add a 100 Ω resistor in series with each output", right: false, why: "That limits the fight current but both chips still drive the line, so its level is still undefined." },
      { id: "pull", label: "Add a pull-up resistor on DATA", right: false, why: "A pull-up only helps when the outputs are open-drain. These are push-pull, so they still fight." },
    ],
  },
  decap: {
    id: "decap",
    kind: "review",
    title: "Missing decoupling capacitor",
    lines: ["U1 has no 100 nF capacitor between VDD and GND."],
    detail:
      "Not an ERC error: the netlist is legal. A design review or checklist catches it. Every supply pin of a fast chip needs a small capacitor right beside it for the sudden current it draws; 100 nF is a common starting value (typical).",
    options: [
      { id: "c100n", label: "Add 100 nF from VDD to GND, right at the pin", right: true, why: "Right. A small ceramic capacitor close to the pin supplies the chip's quick gulps of current through a short loop." },
      { id: "bulk", label: "Add one 100 µF capacitor at the power connector", right: false, why: "Bulk capacitors help, but one far away is too slow for fast current spikes: the wire to it has inductance. The 100 nF belongs at the pin." },
      { id: "series", label: "Put a 100 nF capacitor in series with VDD", right: false, why: "A capacitor in series blocks DC, so the chip would get no supply at all." },
    ],
  },
  vdd: {
    id: "vdd",
    kind: "erc",
    title: "Power pin not connected",
    lines: ["U1 pin VDD (power input) is not connected.", "Net VDD: input power pin not driven by any power output."],
    detail:
      "VDD never reaches the 3V3 rail, so the chip has no supply. ERC also complains that a power input has no source. In KiCad that second message goes away when the net contains a power-output pin, or a PWR_FLAG symbol, which tells ERC \"this net is powered from outside\" (for example from a connector). A flag silences the message but does not connect anything.",
    options: [
      { id: "tie", label: "Connect VDD to the 3V3 net", right: true, why: "Right. VDD now sits on the rail the regulator drives. (If ERC still said \"not driven\", a PWR_FLAG on the rail would tell it the supply is real.)" },
      { id: "flag", label: "Add a PWR_FLAG on the VDD pin", right: false, why: "A PWR_FLAG only tells ERC the net is powered. VDD would still be wired to nothing." },
      { id: "gnd", label: "Connect VDD to GND", right: false, why: "That shorts the supply pin to ground and the chip never starts. Power pins go to the right rail." },
    ],
  },
};

export const BUG_ORDER: BugId[] = ["nrst", "contention", "vdd", "decap"];

export interface ErcState {
  /** Remaining ERC errors plus review items. */
  errors: number;
  fixed: string[];
  ran: boolean;
  wrongTries: number;
}

/** Bugs still present: seeded and not yet fixed. */
export function remaining(seeded: BugId[], fixed: string[]): BugId[] {
  return BUG_ORDER.filter((b) => seeded.includes(b) && !fixed.includes(b));
}
