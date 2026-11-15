import type { ConceptLesson } from "../../learn/types.ts";

/** Fenced plain-text block (tables, diagrams) for lesson prose. */
const txt = (s: string) => "~~~text\n" + s.trim() + "\n~~~";
/** Paragraphs joined with blank lines. */
const P = (...paras: string[]) => paras.join("\n\n");

const SYNC_STIM = { clock: "clk", steps: [0, 1, 1, 1, 0, 0, 0, 1].map((v) => ({ async_in: v })) };

const SYNC_START = `module sync2(input clk, input async_in, output reg s2);
  reg s1;   // first stage: may go metastable in real hardware, feeds nothing else
  always @(posedge clk) begin
    s1 = async_in;
    s2 = s1;
  end
endmodule`;

const SYNC_GOOD = `module sync2(input clk, input async_in, output reg s2);
  reg s1;   // first stage: may go metastable in real hardware, feeds nothing else
  always @(posedge clk) begin
    s1 <= async_in;
    s2 <= s1;   // second stage: a whole clock period later
  end
endmodule`;

/**
 * Lessons added after the audit to "Designing chips: from RTL to tape-out": low-power design and sign-off variation
 * (placed after physical design) and FPGA hands-on (the last lesson). See chipdesign.ts for where each one sits.
 */

// ─────────────────────────────── 11. Low power and sign-off ───────────────────────────────
export const chipLowPowerLesson: ConceptLesson = {
  id: "fnd-chip-11-low-power-signoff",
  title: "Low power and sign-off: domains, corners and variation",
  summary: "Power gating, isolation, level shifters, multi-Vt and DVFS described in UPF; then the variation sign-off must survive: PVT corners, OCV derates, IR drop and crosstalk.",
  minutes: 12,
  xp: 80,
  level: "Advanced",
  steps: [
    {
      kind: "explain",
      title: "Beyond clock gating",
      body: P(
        "*Physical design: floorplan to routing* ended with dynamic power (α·C·V²·f), leakage and clock gating. Clock gating stops a block's clock but leaves it powered, so it still leaks. Phones and laptops spend most of their life nearly idle, so chips go further:",
        "- **Power gating**: switch a block's supply off with **power switches** (large transistors between the block and its supply rail). Leakage in that block falls to almost nothing. Waking it takes time (microseconds, typically), and its state is lost unless key flip-flops are **retention** flops, which keep their bit on a small always-on supply.\n- **Isolation cells** sit on the outputs of a block that can be switched off. An unpowered output floats to an undefined voltage; the isolation cell clamps it to a known 0 or 1, so the blocks that stay on see a clean value.\n- **Level shifters** translate a signal between two supply voltages, for example 0.8 V logic driving a 1.8 V I/O pin.\n- **Multi-Vt**: the library offers each cell with several threshold voltages. Low-Vt cells are fast and leak a lot; high-Vt cells are slower and leak far less (often around ten times less, typically), so tools use low-Vt only where timing needs it.\n- **DVFS** (dynamic voltage and frequency scaling): run a block at a lower voltage and clock when the work allows, and raise both when it doesn't.",
        "None of this is visible in the RTL. It is written separately as **power intent**, usually in **UPF** (the Unified Power Format, IEEE 1801), which synthesis, place and route, simulation and the checkers all read. An abridged sketch, with options trimmed (real files also define the supplies and power states):",
        txt(`
create_power_domain PD_CPU -elements {u_cpu}
create_power_switch SW_CPU -domain PD_CPU ...
set_isolation       ISO_CPU -domain PD_CPU -clamp_value 0 -applies_to outputs
set_level_shifter   LS_CPU  -domain PD_CPU -applies_to both
set_retention       RET_CPU -domain PD_CPU ...
`),
      ),
    },
    {
      kind: "question",
      title: "Where the leaky cells go",
      body: "A block meets timing using only standard-Vt cells, but it leaks too much. The library also has a high-Vt (slow, low-leakage) and a low-Vt (fast, leaky) version of every cell. What does the tool's **leakage recovery** step do?",
      question: {
        type: "choice",
        options: ["Use low-Vt everywhere so the clock can rise", "Use high-Vt only on the critical paths", "Swap in high-Vt wherever a path has spare slack", "Mix Vt types at random to average the leakage"],
        answer: 2,
        hint: "High-Vt cells are slower. Which paths can afford to get slower without failing timing?",
        feedback: {
          0: "Low-Vt cells leak the most, so this would make the problem worse, not better.",
          1: "Backwards: the critical paths are where the slower high-Vt cells can least be afforded.",
          3: "Nothing is random: every swap is checked against timing before it is kept.",
        },
      },
      explanation: "Most paths in a design have slack to spare. Swapping their cells to high-Vt cuts leakage there at no cost, as long as each path still meets timing; low-Vt cells stay on the few critical paths that need the speed. The price: slack everywhere shrinks towards zero, which makes the design more sensitive to the variation later in this lesson.",
    },
    {
      kind: "question",
      title: "Isolate and shift",
      body: "Here is the power intent of a small SoC: a CPU cluster that can be switched off and uses DVFS, a radio that can be switched off, an always-on block, and an I/O ring at 1.8 V. For each signal that crosses between two domains, choose the cells it needs, and nothing it doesn't.",
      widget: { type: "chip-domains", props: {} },
      question: {
        type: "widget",
        goal: { allCorrect: true },
        prompt: "Give every crossing exactly the cells it needs, then press Check.",
        hint: "Ask two questions per crossing. Can the sender be off while the receiver is on (isolation)? Can the two sides sit at different voltages (level shifter)? A signal going into a domain that is off needs no isolation.",
      },
      explanation: "Isolation goes on the signals leaving the CPU and the radio (irq_ack, rx_ready, rx_data), because those senders can be off while their receiver is on. An unpowered output floats, and a floating input to a powered gate can be read as either value and can even turn both of its transistors half on, so current flows straight through (the shoot-through of *From switch to gate*). Level shifters go wherever voltages can differ: everything touching the DVFS CPU (irq_ack, wake, rx_data) and the 0.8 V to 1.8 V uart_tx. tx_enable needs nothing: the same voltage on both sides, and its sender never turns off. Real flows insert these cells from the UPF and a power-aware checker verifies them; an *enable level shifter* does both jobs in one cell.",
    },
    {
      kind: "question",
      title: "Turn it down",
      body: "A CPU cluster runs a burst of work at **0.9 V and 2.0 GHz**. When the work allows, DVFS moves it to **0.7 V and 1.2 GHz**. Using P_dyn = α·C·V²·f with α and C unchanged, what **percentage** of the original dynamic power does it draw at the low setting?",
      question: { type: "number", answer: 36.3, tolerance: 0.3, unit: "%", hint: "Multiply the voltage ratio squared by the frequency ratio, then turn it into a percentage." },
      explanation: "(0.7 / 0.9)² × (1.2 / 2.0) = 0.605 × 0.6 = 0.363, so about **36%** of the power. The task now takes 2.0 / 1.2 ≈ 1.67 times as long, so the **energy** for the whole task (power × time) is 0.605 of the original, about 60%: per task, the saving comes from the voltage alone, because energy per operation goes as C·V². Leakage also changes (lower with the voltage, but for longer), which is why real power managers weigh this against finishing fast and then power gating the block.",
    },
    {
      kind: "explain",
      title: "Every corner, every variation",
      body: P(
        "*Static timing analysis* timed paths with one set of delays. Real cell delays move with three things, together called **PVT**:",
        "- **Process**: every wafer, and every die on it, comes out a little faster or slower. Libraries are characterised at **corners** such as SS (slow NMOS and PMOS), TT (typical) and FF (fast).\n- **Voltage**: a lower supply makes cells slower. The corners cover the supply's tolerance, often ±10%.\n- **Temperature**: at older nodes hot is slow; at advanced low-voltage nodes the reverse can happen (**temperature inversion**), so both ends get checked.",
        "Setup is usually worst where everything is slow, hold where everything is fast. Sign-off checks every combination of operating **mode** (functional, test, low power) and corner that matters, called **MMMC** (multi-mode multi-corner): often dozens of runs.",
        "Three more effects sit on top:\n- **OCV** (on-chip variation): even on one die, two cells at the same corner differ. STA applies **derates**: late paths are made a few percent slower and early paths a few percent faster, on the parts of the two clock paths that are not shared. Refined methods (AOCV, POCV) make the derate depend on path depth or use statistics.\n- **IR drop**: current flowing through the resistance of the power grid lowers the local supply (V = I·R), most where many cells switch at once. Cells there see a lower voltage and get slower.\n- **Crosstalk** (signal integrity, SI): a neighbouring wire switching at the same moment couples through the capacitance between the two wires and can slow a signal down or speed it up, which hurts setup or hold.",
        "The next two steps time one path at all 27 combinations of three process, three voltage and three temperature corners, with an OCV derate and a switch for local IR drop.",
      ),
    },
    {
      kind: "question",
      title: "Worst for setup",
      body: "The derate starts at ±5%. Find the corner where **setup** slack is worst.",
      widget: { type: "chip-corners", props: {} },
      question: {
        type: "widget",
        goal: { worstSetup: true },
        prompt: "Set process, voltage and temperature to the corner with the worst setup slack.",
        hint: "Setup fails when the data arrives late. Which process, voltage and temperature make every cell slowest in this toy?",
      },
      explanation: "SS, 0.72 V and 125 °C: k ≈ 1.66, and setup slack is only about +14 ps there, against +531 ps at the typical corner. Now switch IR drop on: the cells see 0.68 V, k rises to about 1.89 and setup fails by about 168 ps. A path that passes every corner on paper can fail in a hot spot of the power grid, which is why sign-off includes IR-drop analysis, and why grids get extra metal straps and decoupling capacitors (decap cells) where the current is high.",
    },
    {
      kind: "question",
      title: "Worst for hold",
      body: "Same path, same ±5% derate. Now find the corner where **hold** slack is worst.",
      widget: { type: "chip-corners", props: {} },
      question: {
        type: "widget",
        goal: { worstHold: true },
        prompt: "Set process, voltage and temperature to the corner with the worst hold slack.",
        hint: "Hold fails when new data arrives too early. Which corner makes every cell fastest?",
      },
      explanation: "FF, 0.88 V and −40 °C: k ≈ 0.64, and with the ±5% derate hold slack is about −4 ps, a violation the typical corner (+19 ps) hides completely. The fix is a hold buffer on the short path, which must then be re-checked at the slow corner, where the same buffer eats setup slack. Fixing one corner can break another, so sign-off is a loop over all of them at once.",
    },
    {
      kind: "question",
      title: "A derate by hand",
      body: "A path at the slow corner: launch clock path **400 ps**, clock-to-Q **50 ps**, logic **800 ps**, capture clock path **400 ps**, setup time **30 ps**, clock period **1000 ps**. The two clock paths share nothing. Apply a **±5%** OCV derate: the late delays (launch clock, clock-to-Q, logic) × 1.05 and the early capture clock × 0.95; the setup time stays as it is. What is the setup slack, in **ps**?",
      question: { type: "number", answer: 37.5, tolerance: 0.5, unit: "ps", hint: "Setup slack = period + capture clock − (launch clock + clock-to-Q + logic) − setup time, with each delay derated first." },
      explanation: "Capture clock: 400 × 0.95 = 380 ps. Launch side: (400 + 50 + 800) × 1.05 = 1312.5 ps. Slack = 1000 + 380 − 1312.5 − 30 = **37.5 ps**, against 120 ps with no derate. Most of the 82.5 ps lost comes from derating the two clock paths in opposite directions. If 300 ps of each clock path were a shared trunk, the tool would give back 300 × 0.10 = 30 ps, because one wire can't be fast and slow at the same moment; that correction is **CRPR** (clock reconvergence pessimism removal).",
    },
    {
      kind: "question",
      title: "It passed yesterday",
      body: "A path passes STA at every corner. A later run with **signal-integrity** analysis switched on reports it failing setup. Nothing in the design changed. What most likely happened?",
      question: {
        type: "choice",
        options: ["The SI run used a slower process corner by mistake", "A neighbour wire switching the other way slowed it", "Crosstalk only speeds signals up, so it's a tool bug", "SI analysis turned the path into a false path"],
        answer: 1,
        hint: "Two wires side by side form a small capacitor. What happens to a rising signal while its neighbour falls?",
        feedback: {
          0: "Nothing in the setup changed: the SI run times the same corners with the coupling between wires added.",
          2: "Crosstalk works both ways: a neighbour switching the same way speeds the victim up (a hold risk), the opposite way slows it down (a setup risk).",
          3: "A false path is never reported at all, and only the designer's constraints can create one. This path is reported as failing.",
        },
      },
      explanation: "When an **aggressor** wire switches in the opposite direction to the **victim** at the same moment, the victim has to swing against the coupling capacitance, so its transition takes longer: a crosstalk **delta delay**. SI-aware STA adds these deltas from the routed layout. The fixes: space the two wires apart, shield the victim with a grounded wire, upsize its driver, or move it to another layer. Same-direction switching speeds the victim up and threatens hold instead.",
    },
    {
      kind: "recap",
      points: [
        "**Power gating** switches idle blocks off (power switches, **retention** flops for state); **isolation cells** clamp the outputs of an off domain; **level shifters** bridge different voltages. **Multi-Vt** keeps fast, leaky cells on critical paths only, and **DVFS** lowers voltage and clock together. All of it is written as power intent in **UPF** (IEEE 1801).",
        "DVFS: dynamic power goes as V²·f, energy per task as V². From 0.9 V / 2 GHz to 0.7 V / 1.2 GHz: about 36% of the power and 60% of the energy.",
        "Sign-off times every path at every **PVT corner** and mode (MMMC). Setup is worst at slow corners (SS, low V, and hot at older nodes), hold at fast ones.",
        "**OCV** derates late and early paths apart (CRPR gives back the shared clock trunk); **IR drop** lowers the local supply and slows cells; **crosstalk** from a neighbouring wire can slow a signal (setup) or speed it up (hold).",
      ],
    },
  ],
};

// ─────────────────────────────── 12. FPGA hands-on ───────────────────────────────
export const chipFpgaLesson: ConceptLesson = {
  id: "fnd-chip-12-fpga-hands-on",
  title: "FPGA hands-on: from RTL to a board",
  summary: "Inside an FPGA (LUTs, flip-flops, block RAM, DSP), a two-flop synchroniser in Verilog, the open Yosys and nextpnr flow, pin and timing constraints, and reading the timing report.",
  minutes: 12,
  xp: 90,
  level: "Professional",
  steps: [
    {
      kind: "explain",
      title: "What is inside an FPGA",
      body: P(
        "*FPGA vs ASIC and tape-out* compared the two on cost. This lesson is about using one. An FPGA is a grid of small configurable pieces wired together by a huge programmable routing network:",
        "- **LUTs** (look-up tables): the truth-table trick from *Multiplexers, decoders and lookup tables*. A k-input LUT stores 2^k bits and can be any function of its k inputs. Large FPGA families use 6-input LUTs; many small, low-cost ones use 4-input LUTs.\n- **Flip-flops** next to every LUT, plus fast **carry chains** for adders and counters.\n- **Block RAM** (BRAM): dedicated memory blocks of a few kilobits to a few tens of kilobits each, far denser than memory built from LUTs.\n- **DSP blocks**: hard multiply-accumulate units for filters and arithmetic.\n- **Clocking** (PLLs that make new clock frequencies, and dedicated low-skew clock networks) and **I/O** blocks for the pins.",
        "Synthesis for an FPGA maps your RTL onto these resources instead of standard cells. Place and route then assigns each piece to a site in the grid and sets the routing switches. The result is a **bitstream** that configures the chip in milliseconds; on most FPGAs it is lost at power-off and reloaded from a flash chip at every power-up.",
      ),
    },
    {
      kind: "question",
      title: "Where did the memory go?",
      body: "Your design holds a 1,024-entry × 16-bit lookup table, read with `assign data = table[addr];`. The synthesis report shows it used **about 3,000 LUTs and no block RAM**. What is the most likely reason?",
      question: {
        type: "choice",
        options: ["The FPGA has no block RAM big enough for 16 kbit", "Block RAM can only hold constants set at power-up", "Yosys never maps memories onto block RAM", "Its read is combinational; block RAM reads on a clock"],
        answer: 3,
        hint: "Block RAM is a fixed piece of hardware with its own timing. When does it hand back the data for an address?",
        feedback: {
          0: "16 kbit fits in a few blocks, and most FPGAs have dozens to hundreds of them.",
          1: "Block RAM is ordinary read/write memory; it can also be preloaded from the bitstream.",
          2: "Yosys does map memories onto block RAM when the code describes one the hardware can provide.",
        },
      },
      explanation: "Block RAM has a **registered (synchronous) read**: you present an address at one clock edge and get the data after it. `assign data = table[addr];` asks for the data in the same cycle, which only logic can provide, so the tool built a big multiplexer out of LUTs. Read it with `always @(posedge clk) data <= table[addr];`, accept one cycle of latency, and the tool infers block RAM. Reading the **utilisation report** after every synthesis run is the cheapest habit in FPGA work.",
    },
    {
      kind: "question",
      title: "A synchroniser for the board",
      body: P(
        "Every FPGA design needs a way in from the outside world. A button or another chip's signal is asynchronous to your clock, so it goes through the **two-flop synchroniser** from *Metastability, synchronisers and debouncing*.",
        "The code below was written with blocking `=`, so it collapses into a single flop: `s2` copies the input at the same edge as `s1`. Rewrite it so that on each rising edge `s1` samples `async_in` and `s2` samples the old `s1`, which puts `s2` two cycles behind the input.",
        "This toy simulator is 2-state and cannot go metastable: it shows the structure and the latency, not the analogue behaviour.",
      ),
      widget: { type: "chip-verilog", props: { code: SYNC_START, title: "Two flops, not one", stimulus: SYNC_STIM } },
      question: {
        type: "widget",
        goal: { stimulus: SYNC_STIM, expect: { s1: [0, 1, 1, 1, 0, 0, 0, 1], s2: [0, 0, 1, 1, 1, 0, 0, 0] }, mustContain: ["<="], solution: SYNC_GOOD },
        prompt: "Make s1 and s2 two real flip-flops in a row, so the waveform matches the target.",
        hint: "Use the non-blocking `<=` for both lines, so both flops sample at the same edge and s2 gets the value s1 had before it.",
      },
      explanation: "With `<=` both flops sample at the same edge, so `s2` gets the **old** `s1`: each change of the input reaches `s2` two clocks later. That extra clock is the settling time t in MTBF = e^(t/τ) / (Tw · f_clk · f_data). On a real FPGA you also tell the tools these two flops form a synchroniser: AMD/Xilinx tools take an `ASYNC_REG` attribute (other vendors have equivalents), which keeps the two flops next to each other so routing doesn't eat the settling time, and lets clock-domain-crossing checks recognise them.",
    },
    {
      kind: "question",
      title: "The input that fails timing",
      body: "After place and route, the timing report shows a setup violation on the path from the `async_in` pin into the synchroniser's first flop. What should you do?",
      question: {
        type: "choice",
        options: ["Constrain it as asynchronous: a false path", "Add a pipeline register before the first flop", "Lower the clock until the input path meets setup", "Insert buffers on the input until the slack is 0"],
        answer: 0,
        hint: "Does this input have any fixed timing relation to the clock at all?",
        feedback: {
          1: "An extra flop in front is just another asynchronous sample; the input still has no timing relation to the clock.",
          2: "No clock speed makes an asynchronous input meet setup: it can change at any moment. That is what the synchroniser is for.",
          3: "Buffers can't line up a signal that has no fixed timing relation to the clock.",
        },
      },
      explanation: "STA assumes every input is timed against some clock. An asynchronous input isn't, so its \"violation\" means nothing: the synchroniser is the design's answer to it. You say so in the constraints (in XDC or SDC style, `set_false_path -from [get_ports async_in]`; other tools have their own spelling) and review that exception like any other. Never apply one to a path that really is synchronous: it would hide a real failure.",
    },
    {
      kind: "question",
      title: "The open FPGA flow",
      body: "Put the steps of an open-source FPGA flow in order, from Verilog to a working board. The tools named are examples for the Lattice iCE40 family (Yosys, nextpnr and Project IceStorm's icepack and iceprog); vendor tools such as AMD Vivado, Intel Quartus or Lattice Radiant do the same jobs for their own parts.",
      question: {
        type: "order",
        items: [
          "Simulate the RTL with a testbench (Icarus Verilog or Verilator)",
          "Synthesise onto LUTs and flip-flops (yosys synth_ice40)",
          "Place and route with the pin file (nextpnr-ice40 --pcf)",
          "Read the timing report and fix any failing paths",
          "Pack the bitstream (icepack)",
          "Program the board and test it (iceprog)",
        ],
        hint: "Find the bugs where they are cheapest first, then follow the data: RTL to netlist, netlist to placed design, placed design to bitstream.",
      },
      explanation: "Simulate first: a bug is far easier to see in a waveform than on a board. Then synthesise (and read the utilisation report), place and route against the pin and clock constraints, **read the timing report** before believing anything the board does, pack the bitstream and program it. The next step shows the files and commands.",
    },
    {
      kind: "explain",
      title: "Constraints and the timing report",
      body: P(
        "An FPGA design needs two kinds of constraint. **Pin constraints** say which package pin each port uses (take the numbers from your board's documentation; these are examples), and **timing constraints** say how fast each clock runs, so the tools know what to check:",
        txt(`
# top.pcf: the iCE40 pin file
set_io clk      35
set_io async_in 10
set_io led      39

# the same ideas in XDC/SDC style (AMD/Xilinx and others)
create_clock -period 10.000 -name clk [get_ports clk]
set_false_path -from [get_ports async_in]
`),
        "With the open tools the whole run is four commands (an iCE40 UP5K board as the example; nextpnr's `--freq` sets the clock target in MHz):",
        txt(`
yosys -p "synth_ice40 -top top -json top.json" top.v
nextpnr-ice40 --up5k --package sg48 --pcf top.pcf --json top.json --asc top.asc --freq 100
icepack top.asc top.bin
iceprog top.bin
`),
        "Place and route ends with a timing summary. An abridged example (the exact format varies by tool and version):",
        txt(`
Info: Max frequency for clock 'clk': 87.30 MHz (FAIL at 100.00 MHz)
Info: Critical path report for clock 'clk' (posedge -> posedge):
Info:  curr  total
Info:   0.5    0.5  Source u_ctr.q_DFF.Q
Info:   2.1    2.6  Net u_ctr.q[3] (routing)
...
`),
        "**FAIL** means the critical path can't settle within one clock period at that frequency: the setup check from *Static timing analysis*. Notice how much of a path is **routing**: on an FPGA the wires often cost more time than the logic.",
      ),
    },
    {
      kind: "question",
      title: "Read the report",
      body: "In the report above the design reaches **87.30 MHz** against a **100 MHz** target. What is the worst setup slack, in **ns** (negative for a violation)?",
      question: { type: "number", answer: -1.455, tolerance: 0.01, unit: "ns", hint: "The required period is 1000 / 100 ns. The period the critical path needs is 1000 / 87.30 ns. Slack = required − needed." },
      explanation: "Required: 1000 / 100 = 10.000 ns. Needed: 1000 / 87.30 = 11.455 ns. Slack = 10.000 − 11.455 = **−1.455 ns**: the critical path is about 1.5 ns too slow. The fixes are the ones from *Static timing analysis*: pipeline the long path, use a carry chain or DSP block, or relax the target. Don't ship a design whose report says FAIL because the board seems to work on your desk: it may fail on a warmer day or on another chip of the same type.",
    },
    {
      kind: "question",
      title: "Why the ASIC is faster",
      body: "The same RTL that closes timing at 100 MHz on this FPGA is later built as an ASIC in a process of similar age, and runs several times faster. What is the main reason?",
      question: {
        type: "choice",
        options: ["The ASIC flow upsizes every gate automatically", "FPGA flip-flops have a far longer clock-to-Q time", "FPGA signals pass through programmable routing", "FPGA tools can't optimise logic like ASIC synthesis"],
        answer: 2,
        hint: "Look at the critical path in the report: which part took the most time?",
        feedback: {
          0: "Upsizing helps a few critical paths, not every gate, and it can't explain a several-fold gap.",
          1: "Flip-flop overhead is a small part of a path; the big difference is in the connections between the logic.",
          3: "FPGA synthesis optimises logic well. The limit is that it must use LUTs and routing switches that already exist.",
        },
      },
      explanation: "On an FPGA every connection runs through programmable switches and long, generic wires, and every function sits in a LUT sized for the general case. An ASIC wires exactly the gates it needs with plain metal. A common rule of thumb is a few times slower and several times the power on the FPGA (order of magnitude only; it varies widely with the design and the parts). That is why the FPGA is the place to *prove* a design, and the ASIC is where it gets fast, small and low-power.",
    },
    {
      kind: "explain",
      title: "In practice",
      body: P(
        "Getting started costs little. Boards built around small FPGAs that the open tools support (iCE40 or ECP5 parts, on boards such as the iCEBreaker or the ULX3S, as examples) cost from tens of dollars to around a hundred and fifty. Boards for the vendor tools (AMD Artix or Intel Cyclone parts, for example) cost more; their entry-level tool editions are free to download, and the biggest devices need paid licences. Prices and support change, so check before you buy.",
        "Habits from this module carry straight over:\n- **Simulate before you synthesise**, and keep the testbench (*Testbenches and simulation*).\n- **Synchronise every asynchronous input** and debounce buttons (*Metastability, synchronisers and debouncing*).\n- **Read the utilisation and timing reports** after every build; a FAIL is a bug.\n- **Debug on the board** with an on-chip logic analyser: the vendors' integrated logic analyser cores, or open alternatives, record internal signals into block RAM and show them as waveforms.",
        "Hold boards by their edges and power them from a USB port or the supply their documentation names. FPGA boards run at low voltages, so there is no shock hazard, but connecting an I/O pin to the wrong voltage is the quickest way to destroy one.",
      ),
    },
    {
      kind: "recap",
      points: [
        "An **FPGA** is LUTs (4 or 6 inputs), flip-flops, carry chains, **block RAM**, **DSP** blocks, PLLs and I/O, joined by programmable routing and configured by a **bitstream**.",
        "Write RTL the hardware can use: block RAM needs a clocked read; asynchronous inputs go through a **two-flop synchroniser** written with `<=`, marked for the tools and constrained as a false path.",
        "Open flow (iCE40 as the example): simulate → **Yosys** → **nextpnr** with a pin file and a clock target → read the timing report → icepack → iceprog. Vendor tools do the same jobs.",
        "Slack from the report: required period minus the period the critical path needs (10 − 1000 / 87.3 = −1.455 ns). Programmable routing is why the same design runs several times faster as an ASIC.",
      ],
    },
  ],
};
