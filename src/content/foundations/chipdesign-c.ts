import type { ConceptLesson } from "../../learn/types.ts";

/** Fenced plain-text block (tables, diagrams) for lesson prose. */
const txt = (s: string) => "~~~text\n" + s.trim() + "\n~~~";
/** Paragraphs joined with blank lines. */
const P = (...paras: string[]) => paras.join("\n\n");

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
