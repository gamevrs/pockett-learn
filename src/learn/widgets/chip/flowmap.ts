// Pure data and checks for chip-flow: the RTL-to-silicon design flow. No UI, runs in Node.

export type Side = "front" | "back" | "fab";

export interface FlowLoop {
  to: string;
  why: string;
}

export interface FlowStage {
  id: string;
  name: string;
  short: string;
  side: Side;
  /** What goes in / what comes out. */
  input: string;
  output: string;
  who: string;
  /** Example tools, named as examples of the category. */
  tools: string;
  /** One or two plain sentences about what happens. */
  what: string;
  loops: FlowLoop[];
}

export const FLOW_STAGES: FlowStage[] = [
  {
    id: "spec",
    name: "Specification",
    short: "Spec",
    side: "front",
    input: "A market need: what the chip must do, how fast, how much power, how much it may cost.",
    output: "A written specification and an architecture: the blocks, their interfaces, the targets.",
    who: "Architect",
    tools: "Documents, spreadsheets and high-level models written in C++ or Python.",
    what: "Decide what to build before building it. Mistakes here are the most expensive ones: everything later inherits them.",
    loops: [],
  },
  {
    id: "rtl",
    name: "RTL design",
    short: "RTL",
    side: "front",
    input: "The specification.",
    output: "RTL source code (Verilog, SystemVerilog or VHDL) describing registers and the logic between them.",
    who: "RTL designer",
    tools: "A text editor and a linter, for example Verible or Verilator's lint mode.",
    what: "Write the design as code: what happens to the data on every clock edge. This is the register-transfer level.",
    loops: [],
  },
  {
    id: "sim",
    name: "Simulation and verification",
    short: "Simulate",
    side: "front",
    input: "The RTL and a testbench (test vectors, reference models, checks).",
    output: "A pass/fail verdict, coverage numbers and waveforms that show where the design misbehaves.",
    who: "Verification engineer",
    tools: "Simulators such as Icarus Verilog or Verilator, with cocotb for Python testbenches.",
    what: "Check that the RTL does what the spec says before spending money on layout. Verification is often more than half of the project effort.",
    loops: [{ to: "rtl", why: "A failing test usually means a bug in the RTL: fix it and run the tests again." }],
  },
  {
    id: "synth",
    name: "Logic synthesis",
    short: "Synthesize",
    side: "front",
    input: "RTL, a standard-cell library (the menu of gates) and constraints (clock period, area, power goals).",
    output: "A gate-level netlist: the same logic as a network of library cells and flip-flops.",
    who: "Physical design engineer (working with the RTL designer)",
    tools: "Yosys is an open-source example; commercial synthesis tools do the same job.",
    what: "A program turns the code into gates and picks cells so that the design meets its constraints. It runs again after any RTL change.",
    loops: [{ to: "rtl", why: "If the netlist is too big or too slow for the constraints, change the RTL (or relax the constraints) and re-synthesize." }],
  },
  {
    id: "floorplan",
    name: "Floorplanning",
    short: "Floorplan",
    side: "back",
    input: "The netlist, the chip size, the I/O pad plan and any memory macros.",
    output: "A die outline with macros placed, power rails and a power grid drawn, and regions for the logic.",
    who: "Physical design engineer",
    tools: "OpenROAD (driven by OpenLane flows) is an open-source example.",
    what: "Decide where the big blocks sit and how power reaches every part of the die.",
    loops: [],
  },
  {
    id: "place",
    name: "Placement",
    short: "Place",
    side: "back",
    input: "The floorplan and the netlist.",
    output: "Every standard cell at an exact position in the rows, with wire lengths now roughly known.",
    who: "Physical design engineer",
    tools: "OpenROAD's placer, run from OpenLane scripts, is an open-source example.",
    what: "Put connected cells close together without overlaps, while keeping wires short enough for timing.",
    loops: [{ to: "floorplan", why: "If placement is too congested to route, give it more room or move the macros." }],
  },
  {
    id: "cts",
    name: "Clock-tree synthesis (CTS)",
    short: "Clock tree",
    side: "back",
    input: "The placed design and the clock net that reaches every flip-flop.",
    output: "A buffered clock tree that delivers the clock edge to all flip-flops at nearly the same time (low skew).",
    who: "Physical design engineer",
    tools: "OpenROAD's clock-tree tool (TritonCTS) is an open-source example.",
    what: "One clock signal must reach thousands of flip-flops at almost the same instant, so a tree of buffers is built to balance the delays.",
    loops: [{ to: "place", why: "If the clock tree cannot be balanced, the flip-flops are re-placed or clustered differently." }],
  },
  {
    id: "route",
    name: "Routing",
    short: "Route",
    side: "back",
    input: "The placed design with its clock tree.",
    output: "Every wire drawn on the metal layers, with the vias between them, so real lengths are known.",
    who: "Physical design engineer",
    tools: "OpenROAD's router (run from OpenLane) is an open-source example.",
    what: "Draw the actual wires on the metal layers without shorts, obeying the spacing rules. Now wire resistance and capacitance can be extracted.",
    loops: [{ to: "place", why: "If the wires cannot all be routed, placement is spread out or redone to ease the congestion." }],
  },
  {
    id: "sta",
    name: "Static timing analysis (STA)",
    short: "Timing",
    side: "back",
    input: "The routed design, the extracted wire delays and the constraints.",
    output: "A timing report: setup and hold slack for every path, and the worst negative slack (WNS).",
    who: "Physical design engineer",
    tools: "OpenSTA (inside OpenROAD) is an open-source example; every flow has an equivalent.",
    what: "Add up the delays on every path and compare them with the clock period, without running any test vectors. Timing is also checked earlier in the flow, not just here.",
    loops: [
      { to: "rtl", why: "A path that is far too slow may need a pipeline register: that is an RTL change." },
      { to: "synth", why: "A path that is nearly right may be fixed by synthesizing with tighter constraints or bigger cells." },
      { to: "route", why: "Small violations are often fixed in place with buffers or resized cells (an engineering change order), then re-routed." },
    ],
  },
  {
    id: "verify",
    name: "Physical verification (DRC and LVS)",
    short: "DRC / LVS",
    side: "back",
    input: "The final layout (GDSII or OASIS), the foundry's design rules and the netlist.",
    output: "Reports: design-rule check (DRC) violations and layout-versus-schematic (LVS) mismatches. Clean means zero of each.",
    who: "Physical design engineer",
    tools: "KLayout or Magic for DRC, and Netgen for LVS, are open-source examples.",
    what: "DRC checks every shape against the foundry's geometry rules. LVS extracts the circuit from the drawing and checks that it equals the netlist you meant to build.",
    loops: [{ to: "route", why: "DRC violations and shorts are fixed in the layout, then everything is checked again." }],
  },
  {
    id: "tapeout",
    name: "Tape-out",
    short: "Tape-out",
    side: "back",
    input: "A clean, signed-off layout database.",
    output: "The mask data sent to the foundry. After this point a mistake costs a new set of masks.",
    who: "Physical design engineer and project lead (sign-off)",
    tools: "GDSII or OASIS files, sent through a foundry portal or, for small projects, a shuttle service.",
    what: "The point of no return. The name comes from the days when the design really was written to magnetic tape.",
    loops: [],
  },
  {
    id: "fab",
    name: "Fabrication",
    short: "Fab",
    side: "fab",
    input: "The mask data.",
    output: "Wafers of finished chips, then packaged and tested parts.",
    who: "Foundry",
    tools: "Not software: lithography, etching, deposition and the rest of the fab process loop.",
    what: "The foundry makes masks and builds the circuit layer by layer on a silicon wafer. That process is the subject of the Semiconductors module.",
    loops: [{ to: "rtl", why: "If the first silicon is wrong, a new version (a respin) starts all the way back at the design." }],
  },
];

export const FLOW_IDS = FLOW_STAGES.map((s) => s.id);

export function stageById(id: string): FlowStage | undefined {
  return FLOW_STAGES.find((s) => s.id === id);
}

export interface FlowState {
  visited: string[];
  selected?: string;
}

/** goal: { visitAll?: boolean, select?: string }. */
export function checkFlow(state: unknown, goal: Record<string, unknown>): boolean {
  const s = state as FlowState | undefined;
  if (!s || !Array.isArray(s.visited)) return false;
  let any = false;
  if (goal.visitAll === true) {
    any = true;
    if (!FLOW_IDS.every((id) => s.visited.includes(id))) return false;
  }
  if (typeof goal.select === "string") {
    any = true;
    if (s.selected !== goal.select) return false;
  }
  return any;
}
