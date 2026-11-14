import type { ConceptLesson } from "../../learn/types.ts";

/** Fenced plain-text block (tables, diagrams) for lesson prose. */
const txt = (s: string) => "~~~text\n" + s.trim() + "\n~~~";
/** Paragraphs joined with blank lines. */
const P = (...paras: string[]) => paras.join("\n\n");

/** Lessons 6 to 10 of "Designing chips: from RTL to tape-out": synthesis, timing, physical design, verification and test, FPGA vs ASIC. */
export const chipdesignLessonsB: ConceptLesson[] = [
  // ─────────────────────────────── 6. Synthesis ───────────────────────────────
  {
    id: "fnd-chip-6-synthesis",
    title: "Synthesis: from RTL to gates",
    summary: "A synthesis tool turns RTL into a netlist of library cells and trades area against speed. What it ignores, what it refuses, and the accidental latch.",
    minutes: 10,
    xp: 75,
    level: "Advanced",
    steps: [
      {
        kind: "explain",
        title: "The tool that writes the gates",
        body: P(
          "You write RTL (register-transfer level: what happens between registers on each clock). Nobody wires gates by hand for a billion-transistor chip. A **synthesis** tool reads the RTL and produces a **netlist**: a list of cells and the wires between them.",
          "The cells come from a **standard-cell library**: a catalogue the foundry or a vendor provides, with a few hundred ready-made, pre-drawn gates and flip-flops, each with a known area and delay. Synthesis translates the RTL into generic logic, optimises it, then **maps** it onto library cells to meet a speed target with the least area. Open-source **Yosys** is one example of such a tool.",
          "Below is a toy: a made-up library of seven cells (areas in µm² and delays in ps are **illustrative**, not any real process). It shows a 2:1 multiplexer, `assign y = s ? b : a;`, built two ways: compare their area and delay. In the next step you choose the netlist for a different piece of RTL yourself.",
        ),
        widget: { type: "chip-synth", props: { preset: "mux", choosePreset: false } },
      },
      {
        kind: "question",
        title: "Same function, two netlists",
        body: "Both netlists compute exactly `y = (a & b) | c`. Make the circuit **faster than 40 ps** and, among the choices that manage it, with the **least area**.",
        widget: { type: "chip-synth", props: { preset: "ao", choosePreset: false } },
        question: {
          type: "widget",
          goal: { preset: "ao", maxDelayPs: 40, minimiseArea: true },
          prompt: "Pick the netlist that meets 40 ps with the smallest area.",
          hint: "Compare the delay column first. One netlist chains two cells; the other uses one cell that does both steps.",
        },
        explanation: "The single **AO21** cell (AND then OR in one stage) takes 30 ps and 2.0 µm². Two separate cells take 50 ps and 3.2 µm²: the simple cells are slower and bigger here. Real tools do this kind of **technology mapping** across millions of gates, looking for complex cells that cover several RTL operations at once.",
      },
      {
        kind: "question",
        title: "Small or fast?",
        body: "The toy now shows the **2:1 mux** design (`assign y = s ? b : a;`) with its two netlists. A synthesis tool picks the **smallest** netlist that meets the delay budget it is given. Read both netlists' area and delay: which one does it pick with a **42 ps** budget, and which with a **50 ps** budget?",
        widget: { type: "chip-synth", props: { preset: "mux" } },
        question: {
          type: "choice",
          options: [
            "The MUX2 cell at both budgets",
            "NAND version at 42 ps, MUX2 cell at 50 ps",
            "MUX2 cell at 42 ps, NAND version at 50 ps",
            "The NAND version at both budgets",
          ],
          answer: 1,
          hint: "Read both numbers for each netlist. First ask which netlists meet each budget, then which of those is smaller.",
          feedback: {
            0: "The MUX2 cell takes 45 ps, so it misses the 42 ps budget. Only one netlist meets it.",
            2: "Backwards: at 42 ps only the faster NAND version fits; at 50 ps both fit and the smaller MUX2 wins.",
            3: "At 50 ps both netlists meet the budget, so the tool takes the smaller one: the MUX2 cell.",
          },
        },
        explanation: "The MUX2 cell is smaller (3.0 vs 4.9 µm²) but slower (45 vs 40 ps). With 42 ps only the NAND version meets timing, so the tool spends the extra area; with 50 ps both do, so it saves area with the MUX2 cell. This is the basic **area vs speed trade-off**: a synthesis tool is given a clock period (a **constraint**) and minimises area subject to meeting it. The toy numbers are illustrative.",
      },
      {
        kind: "question",
        title: "Adders: three architectures",
        body: "The same RTL, `assign {cout, sum} = a + b;`, can be built as a **ripple-carry** chain (cheap, slow: the carry passes through every bit), **carry-select** (upper half computed twice, a mux picks) or **parallel prefix** (carries combined in log₂ levels). Using the 8-bit adder, require **at most 200 ps** with the **least area**.",
        widget: { type: "chip-synth", props: { preset: "add8" } },
        question: {
          type: "widget",
          goal: { preset: "add8", maxDelayPs: 200, minimiseArea: true },
          prompt: "Choose the architecture that meets 200 ps with the smallest area.",
          hint: "Ripple is too slow for this target. Of the two that meet it, one costs far fewer cells.",
        },
        explanation: "In the toy: ripple 65.8 µm² / 260 ps, carry-select 92.6 µm² / 185 ps, parallel prefix 101.8 µm² / 170 ps. Both select and prefix beat 200 ps; **carry-select** does it with less area. Tighten the target to 175 ps and only prefix works. You met the idea of a faster adder in *From gates to an adder*; synthesis is the step that chooses among them for you.",
      },
      {
        kind: "question",
        title: "How slow does ripple get?",
        body: "In the toy, the 4-bit ripple adder takes 140 ps and the 8-bit one 260 ps, so each extra bit adds **30 ps** (the carry passes one more cell). A **16-bit** ripple adder of the same style would take about how many ps? (A straight extrapolation of the toy.)",
        question: { type: "number", answer: 500, tolerance: 5, unit: "ps", hint: "Start from 260 ps for 8 bits and add 30 ps for each of the 8 extra bits." },
        explanation: "260 + 8 × 30 = **500 ps**. Delay grows in proportion to width, which is why a 64-bit ripple adder is hopeless in a fast CPU and the tool (or the designer) reaches for prefix structures whose delay grows only as log₂ of the width.",
      },
      {
        kind: "explain",
        title: "What is not hardware",
        body: P(
          "Verilog is also a simulation language, and a lot of legal Verilog has no hardware meaning. Synthesis tools **ignore** or **refuse** some of it; the toy panel below lists the common cases.",
          "The one that bites people is the **inferred latch**. In a combinational block, if some path does not assign an output, the output must *remember* its old value, and the tool builds a level-sensitive memory element (a latch) you did not intend:",
          "```verilog\nalways @* if (en) y = d;   // no else: y holds its value when en = 0, so a latch is inferred\n```",
          "The cure: give every output a value on every path (an `else`, a default assignment before the `if`, or a `default:` in a `case`).",
        ),
        widget: { type: "chip-synth", props: { preset: "ao", choosePreset: false, rules: true } },
      },
      {
        kind: "question",
        title: "Spot the latch",
        body: "Which of these combinational blocks infers a latch?",
        question: {
          type: "choice",
          options: [
            "`always @* if (s) y = b; else y = a;`",
            "`always @* begin y = 0; if (en) y = d; end`",
            "`always @* case (sel) 2'b00: y = a; 2'b01: y = b; default: y = 0; endcase`",
            "`always @* if (en) y = d;`",
          ],
          answer: 3,
          hint: "Look for a path where y is never assigned.",
          feedback: {
            0: "Both branches assign y, so this is a plain mux, no memory needed.",
            1: "The default `y = 0` runs first, so y has a value on every path. No latch.",
            2: "The `default:` branch covers every other value of sel, so y is always assigned.",
          },
        },
        explanation: "Without an `else`, the case `en = 0` leaves y unassigned in the code, and hardware cannot be undefined: it must hold. Tools usually warn about inferred latches; read those warnings. Latches are sometimes used on purpose, but an accidental one is almost always a bug.",
      },
      {
        kind: "question",
        title: "Why always @*?",
        body: "A designer writes `always @(a) y = a & b;`, leaving `b` out of the **sensitivity list** (the signals in brackets that make the block run again). Synthesis and a real event-driven simulator disagree about this block. How? The toy simulator opens after you answer, so you can see its warning.",
        widget: {
          type: "chip-verilog",
          props: {
            code: `module and2(input a, input b, output reg y);
  always @(a) y = a & b;   // b is missing from the list
endmodule`,
            title: "An incomplete sensitivity list",
            stimulus: { steps: [{ a: 1, b: 0 }, { a: 1, b: 1 }, { a: 1, b: 0 }] },
          },
          after: true,
        },
        question: {
          type: "choice",
          options: [
            "Synthesis builds a latch; simulation shows an AND",
            "Both ignore b, so y simply follows a",
            "The gates follow b; the simulator misses b's changes",
            "Simulation follows b; synthesis drops the b input",
          ],
          answer: 2,
          hint: "Synthesis reads what the block computes. An event-driven simulator reruns a block only when something in its list changes.",
          feedback: {
            0: "Every path assigns y, so there is nothing to remember and no latch. The disagreement is about when the block reruns.",
            1: "Synthesis can't ignore b: the expression a & b needs it, so the AND gate has two inputs.",
            3: "The other way round: the gates use b, and it is the simulator that stops listening to it.",
          },
        },
        explanation: "Synthesis builds an AND gate whose output follows **both** inputs. A real event-driven simulator (Icarus Verilog, or the commercial ones) reruns the block only when `a` changes, so while only `b` moves, y keeps a stale value. That is a **simulation–synthesis mismatch**, a nasty bug because the tests you ran no longer describe the chip. `always @*` (or SystemVerilog's `always_comb`) lists every signal the block reads automatically. This site's toy simulator warns about the missing name and simulates the block as if it were `@*`, which is what the hardware does.",
      },
      {
        kind: "question",
        title: "Ignored in synthesis",
        body: "A designer writes `assign #5 y = a & b;` and expects a 5 ns delay in the real chip. What actually happens in synthesis?",
        question: {
          type: "choice",
          options: [
            "The `#5` is dropped; real delay comes from the cells",
            "The tool adds a 5 ns delay cell to the path",
            "The tool rejects the file with an error",
            "The delay is rounded to the nearest clock period",
          ],
          answer: 0,
          hint: "Delays in the code are for simulation only.",
          feedback: {
            1: "Tools do not build hardware from `#` delays; they time the circuit they actually build.",
            2: "Most synthesis tools just ignore `#` delays, usually with a warning at most.",
            3: "Nothing in the flow rounds a `#` delay to a clock period; it is simply dropped.",
          },
        },
        explanation: "`#` delays, `initial` blocks (on ASIC flows; FPGAs can use them for power-up values) and system tasks like `$display` are for simulation. What a chip's delay really is gets decided by synthesis choices, placement and wiring, and is measured by static timing analysis, the next lesson.",
      },
      {
        kind: "recap",
        points: [
          "**Synthesis** turns RTL into a **netlist** of **standard cells** from a library, optimising for area, speed and power under a clock-period **constraint**. Yosys is one open-source example.",
          "The same function can be built many ways: **area vs speed** is the central trade-off (the toy's 8-bit adder: ripple 260 ps, carry-select 185 ps, prefix 170 ps, at rising area).",
          "`#` delays, `initial` (on ASIC flows) and `$display` are ignored; unbounded loops cannot be built.",
          "An incomplete `if` or `case` in a combinational block **infers a latch**. Assign every output on every path.",
          "Write combinational blocks as `always @*`: a hand-written sensitivity list that misses a signal makes simulation and synthesis disagree.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 7. Static timing analysis ───────────────────────────────
  {
    id: "fnd-chip-7-timing",
    title: "Static timing analysis",
    summary: "Arrival, required time and slack along every path; setup vs hold; WNS and fmax; fixing violations by pipelining, upsizing and buffering.",
    minutes: 11,
    xp: 75,
    level: "Advanced",
    steps: [
      {
        kind: "explain",
        title: "Every path, every time",
        body: P(
          "*Timing: how fast can the clock go?* in *Digital logic from transistors* explained setup and hold for one flip-flop. A real chip has billions of paths, and you cannot simulate them all with every input. **Static timing analysis (STA)** adds up delays along each path **without simulating any inputs**, and checks every one against the clock.",
          "A **path** runs from a launching flip-flop through gates to a capturing flip-flop. Two numbers per path:",
          txt(`
arrival  = tcq + sum of gate delays        when the data actually gets there
required = T + skew - tsu                  when it must be there, to be captured

setup slack = required - arrival           negative = violation
`),
          "Here **tcq** is the clock-to-Q delay of the launching flop, **tsu** the capturing flop's setup time, **T** the clock period and **skew** how much later the capture clock arrives (zero for now). All numbers in this toy are illustrative. The widget lists four paths at a 2 ns clock; change the period and watch slack move.",
        ),
        widget: { type: "chip-sta", props: { preset: "basic", choosePreset: false } },
      },
      {
        kind: "question",
        title: "One slack by hand",
        body: "Path **D** (the multiplier) has tcq = 400 ps, gates AND 300 + FA 600 + FA 600 + XOR 400 ps, and tsu = 200 ps. At a **2 ns** clock (2000 ps) and zero skew, what is its setup slack, in **ps**?",
        question: { type: "number", answer: -500, tolerance: 1, unit: "ps", hint: "required = 2000 − 200. arrival = 400 + (300 + 600 + 600 + 400). Slack = required − arrival." },
        explanation: "required = 2000 − 200 = 1800 ps; arrival = 400 + 1900 = 2300 ps; slack = 1800 − 2300 = **−500 ps**. Negative slack means the data arrives after the capturing flop needed it, so the chip would capture wrong values. The **worst negative slack (WNS)** is the single worst path; the **total negative slack (TNS)** sums all violating paths.",
      },
      {
        kind: "code",
        title: "A tiny STA in code",
        body: P(
          "Write `sta(paths, period, tcq, tsu, skew=0)`, a miniature timing report. `paths` is a list of paths, each a list of gate delays; all times are in **ps**. Return a tuple `(wns, tns, fmax_mhz)`:",
          "- `wns`: the worst (smallest) setup slack over all paths; it can be positive when everything passes.\n- `tns`: the sum of the **negative** slacks only (0 when no path fails).\n- `fmax_mhz`: the highest clock frequency at which the slowest path still meets setup, in MHz.",
          "The tests use the four paths of the widget: A = [240, 320], B = [360, 300, 300, 340], C = [400] and D = [300, 600, 600, 400], with tcq = 400 and tsu = 200.",
        ),
        language: "python",
        starter: "def sta(paths, period, tcq, tsu, skew=0):\n    # return (wns, tns, fmax_mhz); times in ps\n    # your code here\n    return (0, 0, 0)\n",
        solution:
          "def sta(paths, period, tcq, tsu, skew=0):\n    slacks = []\n    latest = 0\n    for gates in paths:\n        arrival = tcq + sum(gates)\n        slacks.append(period + skew - tsu - arrival)\n        latest = max(latest, arrival)\n    wns = min(slacks)\n    tns = sum(s for s in slacks if s < 0)\n    fmax_mhz = 1e6 / (latest + tsu - skew)\n    return (wns, tns, fmax_mhz)\n",
        tests: [
          { id: "widget", description: "The widget's four paths at 2 ns: WNS −500, TNS −500, fmax 400 MHz", assertionCode: `P = [[240, 320], [360, 300, 300, 340], [400], [300, 600, 600, 400]]\nw, t, f = sta(P, 2000, 400, 200)\nassert (w, t) == (-500, -500) and abs(f - 400) < 1e-6, f"got {(w, t, f)}"` },
          { id: "passing", description: "At 2.6 ns everything passes: WNS +100, TNS 0", assertionCode: `P = [[240, 320], [360, 300, 300, 340], [400], [300, 600, 600, 400]]\nw, t, f = sta(P, 2600, 400, 200)\nassert (w, t) == (100, 0) and abs(f - 400) < 1e-6, f"got {(w, t, f)}"` },
          { id: "two-fail", description: "At 1.6 ns two paths fail: WNS −900, TNS −1200", assertionCode: `P = [[240, 320], [360, 300, 300, 340], [400], [300, 600, 600, 400]]\nw, t, f = sta(P, 1600, 400, 200)\nassert (w, t) == (-900, -1200), f"got {(w, t)}"` },
          { id: "skew", description: "100 ps of useful skew: WNS −400, fmax about 416.7 MHz", assertionCode: `P = [[240, 320], [360, 300, 300, 340], [400], [300, 600, 600, 400]]\nw, t, f = sta(P, 2000, 400, 200, 100)\nassert (w, t) == (-400, -400) and abs(f - 1e6 / 2400) < 1e-6, f"got {(w, t, f)}"` },
        ],
        hints: [
          "For each path, work out its arrival time and its setup slack with the formulas above; keep the slacks in a list.",
          "WNS is the minimum of the list, TNS adds up only the negative entries, and the minimum period comes from the latest arrival (plus setup, minus skew). With times in ps, MHz = 10⁶ / period.",
        ],
      },
      {
        kind: "question",
        title: "Fix the multiplier",
        body: "Make **every** path meet timing at the **2 ns** clock without slowing the clock. Options on the widget: upsize a gate (faster, bigger), or add a pipeline register in the middle of a path.",
        widget: { type: "chip-sta", props: { preset: "basic", choosePreset: false } },
        question: {
          type: "widget",
          goal: { preset: "basic", setupMet: true, periodNs: 2 },
          prompt: "Meet setup on all four paths with the clock period at 2 ns or shorter.",
          hint: "Try upsizing every gate of path D: it helps, but it is not enough. What splits a long path in two?",
        },
        explanation: "Upsizing all of D's gates gives −25 ps: still failing. **Pipelining** (a register after the second gate) splits the 1900 ps of logic into two stages of 900 and 1000 ps, each with room, and the worst slack becomes +100 ps with fmax about 526 MHz. The price: one more cycle of **latency** and the extra flip-flops. See *Pipelining: an assembly line for instructions* for why that trade pays: more throughput per second at the cost of a longer wait for each individual result.",
      },
      {
        kind: "question",
        title: "Which fix, which cost?",
        body: "A timing report shows one long path failing setup by 120 ps. Which statement about the usual fixes is correct?",
        question: {
          type: "choice",
          options: [
            "Upsizing is free: faster cells cost no area or power",
            "Slowing the clock is the only fix for setup",
            "Retiming or pipelining shortens the longest stage",
            "Adding delay buffers is the standard setup fix",
          ],
          answer: 2,
          hint: "Think about what each fix gives up.",
          feedback: {
            0: "Bigger cells are faster but use more area and power (the toy doubles the area).",
            1: "Slowing the clock does fix setup, but it throws away performance. It is the fix of last resort.",
            3: "Delay buffers make the path slower. They are used for the opposite problem: hold.",
          },
        },
        explanation: "Setup fixes make the critical path **shorter** (re-synthesise, upsize, restructure, **retime** by moving a register along the path, or **pipeline**, which may change latency and needs extra flip-flops) or give it more time (a multicycle path, where that is truly safe). Each has a cost in area, power, latency or design effort, which is why timing closure is a negotiation, not a button.",
      },
      {
        kind: "question",
        title: "Retime the register",
        body: "In the **pipeline** preset the multiply path already has a register, but it sits after the first gate, so the second stage still carries 1600 ps of logic and fails. **Move** the register along the path (retiming) so every path meets setup at the 2 ns clock, **without upsizing** any gate.",
        widget: { type: "chip-sta", props: { preset: "pipeline", choosePreset: false } },
        question: {
          type: "widget",
          goal: { preset: "pipeline", setupMet: true, periodNs: 2, maxUpsized: 0 },
          prompt: "Meet setup on every path at 2 ns by moving the pipeline register, with no upsized gates.",
          hint: "Pick path D and try each register position. You want the two stages as equal as possible: the four gates are 300, 600, 600 and 400 ps.",
        },
        explanation: "After gate 1 the stages are 300 and 1600 ps (stage 2 misses by 200 ps); after gate 3 they are 1500 and 400 ps (stage 1 misses by 100 ps). After gate **2** they are 900 and 1000 ps, both with room, and the worst slack is +100 ps (path B). Retiming keeps the same number of registers and the same latency; it only moves the cut. Synthesis tools can retime automatically when asked, but the result must still be checked against the design's intent.",
      },
      {
        kind: "explain",
        title: "Hold: the same edge",
        body: P(
          "*Timing: how fast can the clock go?* introduced hold: the *old* data must stay stable **long enough after the same edge** that captures it, so a late capture clock (**skew**) plus a very short path lets new data race through. STA checks it on every path with the same formula:",
          txt(`
hold slack = (tcq + shortest path) - (thold + skew)

thold    the capturing flop's hold time
negative = violation, and T does not appear in it
`),
          "What STA adds is scale and timing of the fix. Hold is checked once the clock tree exists and the real skew is known, and the tool repairs it by inserting **delay buffers** on the short paths. This preset has skew 500 ps and a nearly direct flop-to-flop wire: setup is fine, hold fails. (The fix controls appear in the next step.)",
        ),
        widget: { type: "chip-sta", props: { preset: "hold", choosePreset: false, showSkew: true, fixes: false } },
      },
      {
        kind: "question",
        title: "Fix the hold violation",
        body: "In the **hold** preset, make hold timing pass by changing the design, not the clock: the 500 ps of skew comes from the clock tree and stays as it is.",
        widget: { type: "chip-sta", props: { preset: "hold", choosePreset: false, showSkew: true } },
        question: {
          type: "widget",
          goal: { preset: "hold", holdMet: true, skewPs: 500 },
          prompt: "Make hold slack non-negative on every path, with the skew left at +500 ps.",
          hint: "Hold slack is short-path delay minus (hold time + skew). How do you make the short path longer?",
        },
        explanation: "The wire path has hold slack (400 + 48) − (100 + 500) = **−152 ps**. Each delay buffer adds 100 ps in the toy: one buffer gives −52, two give **+48 ps**. Real tools insert hold buffers automatically after clock-tree synthesis, once the skew is known; the price is a little area and power.",
      },
      {
        kind: "question",
        title: "Not every path is real",
        body: "STA reports a setup violation of −300 ps on a path from `cfg_mode`, a configuration register that firmware writes once at boot, **before** the datapath is switched on, to the datapath's registers. STA doesn't know that: it assumes every path can toggle every cycle. What is the right response?",
        question: {
          type: "choice",
          options: [
            "Pipeline the path: every reported violation is real",
            "Constrain it as a false path once that's confirmed",
            "Slow the clock until this path passes as well",
            "Insert hold buffers to absorb the 300 ps",
          ],
          answer: 1,
          hint: "The tool times paths that can't happen in practice unless you tell it otherwise. Who knows that this register is static?",
          feedback: {
            0: "A pipeline register would add latency and area to fix a path that never toggles while the datapath runs.",
            2: "That throws away performance on every real path to satisfy one that can't happen.",
            3: "Hold buffers slow a path down, which makes setup worse, not better.",
          },
        },
        explanation: "A **false path** is one the design guarantees is never exercised in operation; the designer tells STA so in the **constraints** (SDC, the Synopsys Design Constraints format most tools read: `set_false_path`). A **multicycle path** is one that is allowed several clock cycles by design (`set_multicycle_path`). Both are powerful and dangerous: a wrong exception hides a real bug from every later check, so teams review them like code. On a real report you then read **WNS** (the worst slack, the path to fix first) and **TNS** (the total, how much work is left), as in the code step.",
      },
      {
        kind: "recap",
        points: [
          "**STA** checks every path against the clock by adding delays, no input vectors needed.",
          "**Setup slack = required − arrival**, with required = T + skew − tsu and arrival = tcq + gate delays. Negative is a violation; **WNS** is the worst path, **TNS** the sum of the negative ones.",
          "**fmax** (MHz) = 1000 / minimum period (ns). Fix setup by shortening the path: upsizing, restructuring, **retiming**, **pipelining** (more latency, more throughput).",
          "**Hold** is checked at the **same edge**: slack = tcq + short path − (thold + skew). Slowing the clock does **not** fix it; add delay to the short path once the clock tree sets the skew.",
          "**Exceptions**: false paths and multicycle paths tell STA what the design guarantees. Review them carefully: a wrong one hides a real violation.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 8. Physical design ───────────────────────────────
  {
    id: "fnd-chip-8-physical-design",
    title: "Physical design: floorplan to routing",
    summary: "Where the blocks go, how the clock reaches every flip-flop at the same time, how wires are routed, DRC versus LVS, and what the power is made of.",
    minutes: 12,
    xp: 80,
    level: "Advanced",
    steps: [
      {
        kind: "explain",
        title: "From netlist to layout",
        body: P(
          "Synthesis gives a netlist: *what* connects to *what*. **Physical design** decides *where*, and draws the actual shapes the foundry will etch.",
          txt(`
floorplan   chip size and shape, where the big blocks and I/O pads go, power grid
place       exact position of every cell, wires kept short and spread out
CTS         clock tree synthesis: buffers that deliver the clock everywhere
route       draw the metal wires that connect the pins
sign-off    STA again with real wire delays, plus DRC and LVS
`),
          "Start with placement. The toy chip has six movable blocks on a 5×5 grid, with the input and output pads fixed on the edges. Move the blocks and watch two numbers: the **HPWL** (half-perimeter wirelength: for each net, the width plus the height of the box around its pins, a standard quick estimate of wire length) and **overflow** (wires beyond the capacity of a slot, a stand-in for routing congestion). Toy model.",
        ),
        widget: { type: "chip-place", props: {} },
      },
      {
        kind: "question",
        title: "Short, but routable",
        body: "Rearrange the blocks so the total wirelength is **16 or less** *and* nothing is over capacity (**overflow 0**).",
        widget: { type: "chip-place", props: {} },
        question: {
          type: "widget",
          goal: { maxHpwl: 16, maxOverflow: 0 },
          prompt: "Reach HPWL ≤ 16 with overflow 0.",
          hint: "Put blocks that share nets next to each other and to their pads, but not all piled into one row or column.",
        },
        explanation: "The starting placement scores HPWL 48 and overflow 6. A good placement reaches about 15 with no overflow. The absolute shortest wirelength the toy allows is 14, but it is crowded and leaves overflow 2. A real placer optimises wirelength **and** congestion, timing and power at once.",
      },
      {
        kind: "question",
        title: "Why not the shortest?",
        body: "The placement with the smallest possible wirelength (14) has overflow 2, so it is worse than one with wirelength 15 and overflow 0. Why?",
        question: {
          type: "choice",
          options: [
            "Wirelength doesn't matter; only overflow does",
            "Overflow only makes the picture look untidy",
            "Overflow means the blocks overlap in the layout",
            "Too many wires want one channel: it may not route",
          ],
          answer: 3,
          hint: "Routing channels have a limited number of tracks.",
          feedback: {
            0: "Wirelength matters too: longer wires are slower, bigger and burn more power. It is a balance.",
            1: "It is not cosmetic: each metal layer has limited tracks, so excess demand is a real routing failure.",
            2: "Blocks do not overlap here; overflow is about wire demand against capacity.",
          },
        },
        explanation: "Overflow means more wires want a routing channel than it has tracks. **Routing** draws the real wires on several metal layers (horizontal on some, vertical on others, joined by **vias**). If demand in a region exceeds the tracks available, the router makes long detours, adds delay, or leaves open or shorted nets, so the design may not route at all. Congestion is why floorplans have empty-looking space.",
      },
      {
        kind: "question",
        title: "Clock tree: zero skew",
        body: P(
          "A clock must reach many thousands of flip-flops at almost the same moment. If it reaches some later (**skew**), setup and hold budgets shrink (*Static timing analysis*). **Clock tree synthesis** builds a network of buffers to deliver the edge evenly.",
          "Compare three toy trees for 16 sinks (flip-flop clock pins): a **daisy chain**, an **unbalanced** tree and a balanced **H-tree**. The toy charges 25 ps per grid unit of wire and 35 ps per buffer. Choose the style with **zero skew**.",
        ),
        widget: { type: "chip-cts", props: {} },
        question: { type: "widget", goal: { maxSkewPs: 0 }, prompt: "Pick the tree whose sinks all see the clock at the same time.", hint: "Which topology gives every sink the same wire length and the same number of buffers?" },
        explanation: "The **H-tree** is symmetric: every sink sits at the end of an identical path, so skew is 0 and latency is 215 ps in the toy, against skews of 375 ps (daisy) and 150 ps (unbalanced). Real trees are never perfect (on-chip variation, load differences), so they aim for small skew and tools budget the remainder.",
      },
      {
        kind: "question",
        title: "Useful skew",
        body: "Clock tree tools can delay one flop's clock **on purpose** to lend time to a failing path. Path X (FF1 → FF2) fails setup with slack **−60 ps**. The next path, Y (FF2 → FF3), has **+150 ps** of setup slack, and path X has **+90 ps** of hold slack. The tree is changed so FF2's clock arrives **80 ps later**. Work out X's new setup slack, Y's new setup slack and X's new hold slack. What is the **smallest** of the three, in ps?",
        question: { type: "number", answer: 10, tolerance: 0.5, unit: "ps", hint: "FF2 captures X later (X setup gains 80, X hold loses 80) and launches Y later (Y setup loses 80)." },
        explanation: "X setup: −60 + 80 = +20 ps. Y setup: 150 − 80 = +70 ps. X hold: 90 − 80 = **+10 ps**, the smallest. This is **useful skew**: borrowing time from a path with spare slack, here Y, to rescue X. It works only while the neighbours can afford it, and every picosecond lent to setup is taken from hold on the same path, which is why CTS and hold fixing are run together.",
      },
      {
        kind: "question",
        title: "DRC or LVS?",
        body: "After routing, the layout is checked twice. A check finds that two metal wires are **closer together than the foundry allows**. Which check reports that, and what does the other one check?",
        question: {
          type: "choice",
          options: [
            "DRC reports it; LVS compares layout and netlist",
            "LVS reports it; DRC compares simulation waveforms",
            "DRC reports it; LVS checks transistor speed",
            "Both are the same check under two names",
          ],
          answer: 0,
          hint: "One check is about geometry and the foundry's rules. The other is about connectivity.",
          feedback: {
            1: "Backwards: spacing is a geometric rule, which is DRC. LVS has nothing to do with waveforms.",
            2: "DRC is right, but LVS is not a speed check; that is STA. LVS compares connectivity.",
            3: "They answer different questions: DRC is geometry, LVS is whether the layout implements the intended circuit.",
          },
        },
        explanation: "**DRC (design rule check)**: widths, spacings, enclosures and the other geometric rules the foundry can manufacture. **LVS (layout versus schematic)**: extract the netlist from the drawn shapes and compare it with the intended netlist, catching a missing via or a swapped wire. A layout must pass **both**, plus timing sign-off, before tape-out. KLayout, Magic and Netgen are open-source examples.",
      },
      {
        kind: "explain",
        title: "Power: what burns it",
        body: P(
          "Chip power has two parts. **Dynamic** power is spent when signals switch:",
          txt(`
P_dyn = alpha x C x V^2 x f

alpha  activity: the fraction of the capacitance that switches each cycle
C      switched capacitance (gates and wires)
V      supply voltage        f   clock frequency
`),
          "**Leakage** is current that flows even when nothing switches; it grows with lower-threshold (faster) transistors and with temperature. Notice the **V²**: lowering the voltage pays back more than lowering the frequency, but a lower voltage also makes transistors slower, so the clock must drop too (the widget flags a clock the voltage cannot support). **Clock gating** switches the clock off for idle blocks so they stop toggling. Toy numbers; this design starts busier than the one in the next step.",
        ),
        widget: { type: "chip-power", props: { alpha: 0.2, fMhz: 1500 } },
      },
      {
        kind: "question",
        title: "Half the power, same speed",
        body: "Starting from 0.1 W of dynamic power at 1.0 V and 1000 MHz, cut dynamic power to **0.05 W or less** while still running at **1000 MHz or more**.",
        widget: { type: "chip-power", props: {} },
        question: {
          type: "widget",
          goal: { maxDynW: 0.05, minFMhz: 1000 },
          prompt: "Dynamic power at most 0.05 W with the clock at 1000 MHz or faster.",
          hint: "Power is proportional to V². Which input can you lower, while the toy still allows 1000 MHz?",
        },
        explanation: "At 0.7 V: 0.1 × 0.7² = 0.049 W, and the toy's speed limit at 0.7 V is still 1500 MHz, so 1000 MHz is fine. Cutting activity α (for example by **clock gating** idle blocks, which in the toy saves 30% at 60% idle) or capacitance also helps, but voltage is the strongest lever because of the square.",
      },
      {
        kind: "code",
        title: "Dynamic power in code",
        body: P(
          "Write `dynamic_power(alpha, c, v, f)` returning dynamic power in **watts**, with `c` in farads, `v` in volts and `f` in hertz.",
          "Check: α = 0.1, C = 1 nF (1e-9), V = 1.0 V and f = 1 GHz (1e9) give **0.1 W**, the widget's default.",
        ),
        language: "python",
        starter: "def dynamic_power(alpha, c, v, f):\n    # return the dynamic power in watts\n    # your code here\n    return 0\n",
        solution: "def dynamic_power(alpha, c, v, f):\n    return alpha * c * v * v * f\n",
        tests: [
          { id: "default", description: "the widget default is 0.1 W", assertionCode: `assert abs(dynamic_power(0.1, 1e-9, 1.0, 1e9) - 0.1) < 1e-12, f"got {dynamic_power(0.1, 1e-9, 1.0, 1e9)}"` },
          { id: "squared", description: "0.7 V gives 49 mW", assertionCode: `assert abs(dynamic_power(0.1, 1e-9, 0.7, 1e9) - 0.049) < 1e-12, f"got {dynamic_power(0.1, 1e-9, 0.7, 1e9)}"` },
          { id: "other", description: "a different design", assertionCode: `assert abs(dynamic_power(0.2, 2e-9, 0.5, 5e8) - 0.05) < 1e-12, f"got {dynamic_power(0.2, 2e-9, 0.5, 5e8)}"` },
        ],
        hints: ["Multiply the four inputs, squaring V.", "Use v * v or v ** 2."],
      },
      {
        kind: "recap",
        points: [
          "**Physical design**: floorplan → place → clock tree → route → sign-off. The netlist says what connects; physical design decides where and draws it.",
          "A placer balances **wirelength (HPWL)**, **congestion**, timing and power. The shortest layout may not be routable.",
          "**Clock tree synthesis** balances skew; skew shifts setup and hold budgets (a late capture clock helps setup and hurts hold). **Useful skew** lends slack from one path to its neighbour on purpose.",
          "**DRC** = geometric rules (widths, spacings, enclosures); **LVS** = the layout's extracted netlist matches the intended one. Both must pass.",
          "**P_dyn = α·C·V²·f**; voltage is the strongest lever. **Clock gating** cuts α in idle blocks; leakage grows with low-Vt cells and heat.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 9. Verification and DFT ───────────────────────────────
  {
    id: "fnd-chip-9-verification-dft",
    title: "Verification at scale and design for test",
    summary: "Coverage, constrained-random tests and formal proofs for design bugs; scan chains, ATPG, stuck-at faults and BIST for manufacturing defects.",
    minutes: 12,
    xp: 90,
    level: "Professional",
    steps: [
      {
        kind: "explain",
        title: "How do you know it is right?",
        body: P(
          "A bug in software can be patched next week. A bug in a chip may mean a new mask set, months and a great deal of money (the next lesson). So **verification**, showing that the design does what the specification says, is often the largest part of a chip project, frequently more than the design itself.",
          "A directed test checks the cases you thought of. But you cannot try every input of even an 8-bit ALU with all its operations by hand, let alone a CPU. Two ideas help:",
          "- **Constrained-random testing**: a generator produces many random but legal stimulus sequences; a **reference model** or scoreboard checks each result.\n- **Coverage**: a measurement of *what was exercised*, in **bins** such as \"add produced a carry\" or \"result was zero\". Unhit bins are places where no test has looked yet.",
          "Try it on an 8-bit ALU with 25 coverage bins (toy). Tap bins to run directed tests, or run batches of random tests, and compare uniform random with the **biased** generator. (This run uses a different random seed from the next step.)",
        ),
        widget: { type: "chip-coverage", props: { formal: false, seed: 3 } },
      },
      {
        kind: "question",
        title: "Ninety per cent",
        body: "Reach at least **90%** functional coverage on the ALU. Mix directed taps and random runs however you like.",
        widget: { type: "chip-coverage", props: { formal: false } },
        question: { type: "widget", goal: { minCoverage: 0.9 }, prompt: "Hit at least 90% of the 25 bins.", hint: "Random runs get most bins quickly. For the last few rare ones, switch on the bias or tap the bins directly." },
        explanation: "Uniform random with this seed needs about 2,400 tests for 90%, and thousands more for the last corner cases (the wrap-to-zero, equal-operand, \"small\" and \"large\" bins are rare when 8-bit operands are drawn at random; carry, by contrast, comes up in about half of all additions). Biased generation, which weights stimulus toward special values like 0 and 255, gets there in a few hundred. Directed tests for the rare bins plus random for everything else is the usual mix.",
      },
      {
        kind: "question",
        title: "What coverage means",
        body: "A regression reports **100% functional coverage** on all bins. What can you conclude?",
        question: {
          type: "choice",
          options: [
            "The design has no bugs left",
            "The design is formally proven correct",
            "Every defined bin was hit; bugs can remain",
            "The test suite is complete and can be retired",
          ],
          answer: 2,
          hint: "Coverage measures stimulus against a list someone wrote.",
          feedback: {
            0: "Coverage says tests *reached* those situations, not that every output was *checked* correctly.",
            1: "Simulation, even with full coverage, samples behaviour. Proofs are a different technique.",
            3: "Regressions are re-run after every change to catch new bugs; a passing history is not a reason to stop.",
          },
        },
        explanation: "Every bin someone thought to define was hit, but bugs outside those bins, or in situations that were hit but never checked, can remain. Coverage is only as good as its **bins** and the **checkers** behind the tests. A bin hit by a test that never compares the output proves nothing. Teams track coverage together with pass rates, bug-discovery trends and review, and treat 100% as a milestone, not a guarantee.",
      },
      {
        kind: "question",
        title: "Prove it, then break it",
        body: P(
          "Simulation tries inputs. **Formal verification** instead *proves* a property for **all** inputs at once, or produces a **counterexample**: a concrete input that breaks it. Engines use **SAT/SMT solvers** (programs that decide whether a logical formula can be satisfied) and clever state-space reductions, not brute force; real designs have far too many states to enumerate.",
          "The toy below checks a 4-bit saturating adder against the property `sat_add(a, b) >= a and >= b`. With only 256 input pairs the widget can enumerate them; real tools do the same job symbolically for 64-bit buses. Run the formal check, then plant the bug and read the counterexample.",
        ),
        widget: { type: "chip-coverage", props: { formal: true } },
        question: { type: "widget", goal: { formalCleanRun: true, formalBugRun: true }, prompt: "Run the formal check on the correct adder, then plant the bug and run it again to get a counterexample.", hint: "Press Run formal check once as it starts, then flip the bug switch and press it again. Read the counterexample it gives." },
        explanation: "With the correct adder, all 256 pairs satisfy the property: a proof. With the planted bug, **15 counterexamples** appear, and the first is a = 1, b = 15 giving 0: the sum wrapped instead of saturating. Formal tools are strongest on control logic, arbiters and protocol properties with small, well-defined behaviour; they struggle with deep datapaths, so teams combine both methods.",
      },
      {
        kind: "question",
        title: "Simulation or proof?",
        body: "What is the key difference between a passing simulation and a passing formal proof of a property?",
        question: {
          type: "choice",
          options: [
            "Formal is just faster; the guarantee is the same",
            "A proof covers every input; simulation, only those tried",
            "Simulation covers all inputs; formal checks a sample",
            "Formal always replaces simulation entirely",
          ],
          answer: 1,
          hint: "One samples; the other reasons about everything.",
          feedback: {
            0: "The guarantee is different: samples versus all inputs. Speed is not the point.",
            2: "Backwards: simulation samples; formal reasons about all inputs.",
            3: "Formal has capacity limits and needs properties written; teams use both in combination.",
          },
        },
        explanation: "Simulation shows the property held for the inputs tried; a proof shows it holds for every input, within the modelled assumptions. A proof is only as good as the property and the **assumptions** (constraints on inputs) written down. An over-constrained proof can pass vacuously. Both techniques have a place: simulation scales to whole systems, formal gives exhaustive answers on well-bounded blocks.",
      },
      {
        kind: "question",
        title: "Design for test: find the stuck net",
        body: P(
          "Verification checks the **design**. A different problem remains: even a perfect design is manufactured with random defects (*Yield and cost* in *Semiconductors: physics to fab*). Every die must be tested in seconds, at **wafer sort** and again at **final test** (*Packaging and test*), and you cannot probe a billion internal nodes from outside.",
          "So designers add **design for test (DFT)** hardware. In **scan** mode the flip-flops are linked into a long **scan chain** (a shift register): the tester shifts a pattern in, pulses the functional clock once to capture the logic's response, then shifts the result out. Now every flop is both controllable and observable. **ATPG** (automatic test pattern generation) tools find the patterns, targeting a **fault model**, most commonly **stuck-at**: a net permanently stuck at 0 or at 1. Memories are usually tested with **BIST** (built-in self-test): on-chip logic generates patterns and compresses the responses to a pass/fail flag.",
          "In the toy, one internal net is secretly stuck. Apply patterns, compare the captured responses with the expected ones, and guess the **net and value**.",
        ),
        widget: { type: "chip-scan", props: { fault: { net: "n2", value: 0 } } },
        question: {
          type: "widget",
          goal: { findFault: true, unique: true, fault: { net: "n2", value: 0 } },
          prompt: "Identify the faulty net and the value it is stuck at, with enough patterns applied to rule out every other fault.",
          hint: "Find a pattern whose response differs from the expected one, then ask which nets could change those captured bits when stuck. \"What your results rule out\" lists the faults still possible; add patterns (the ATPG button helps) until only one is left.",
        },
        explanation: "This is what ATPG does at scale: choose patterns that make a fault's effect show up at an observable flop. The toy's six internal nets have 12 single stuck-at faults, all distinguishable, and just three patterns (0000, 1101, 0110) detect every one (100% **fault coverage**). Real designs use compressed scan and need thousands of patterns for tens of millions of faults.",
      },
      {
        kind: "question",
        title: "Coverage to escapes",
        body: P(
          "A test program is judged by how many bad chips it lets through. ATPG reports that its patterns detect **11,400** of the design's **12,000** modelled stuck-at faults, and the manufacturing **yield** is **90%** (Y = 0.9: nine dies in ten have no defect).",
          "A classic estimate of the share of shipped parts that are still defective, the **defect level** (Williams and Brown's model, a simplification), is **DL = 1 − Y^(1 − T)**, where T is the fault coverage as a fraction. How many defective parts per million (**DPPM**) does it predict?",
        ),
        question: { type: "number", answer: 5254, tolerance: 30, unit: "DPPM", hint: "First T = detected / total. Then compute 1 − 0.9^(1 − T) and multiply by one million." },
        explanation: "T = 11,400 / 12,000 = 0.95, so DL = 1 − 0.9^0.05 ≈ 1 − 0.99475 = 0.00525: about **5,250 DPPM**, one bad part in every 190 shipped. Raising coverage to 99% gives 1 − 0.9^0.01 ≈ 1,050 DPPM. Customers such as car makers ask for single-digit DPPM, which is why they demand very high coverage and extra fault models on top of stuck-at, such as transition (delay) faults for defects that only make a path slow.",
      },
      {
        kind: "explain",
        title: "In practice",
        body: P(
          "Names you will meet, as examples rather than recommendations:",
          "- **Simulation**: Icarus Verilog (open-source event simulator), Verilator (compiles Verilog to fast C++ models), and commercial simulators from the large EDA vendors. **cocotb** lets you write tests in Python; **UVM** (Universal Verification Methodology, built on SystemVerilog) is the industry standard for constrained-random, coverage-driven benches.\n- **Formal**: the open-source SymbiYosys flow (built on Yosys, with SAT/SMT back ends) for learning; commercial formal tools for production.\n- **DFT**: scan insertion, ATPG and memory BIST are commercial tool categories; the IEEE 1149.1 (JTAG) port is a common way to reach on-chip test logic. The patterns run on automatic test equipment at wafer sort and final test.",
          "Honest about cost: commercial verification and DFT tools are licensed per seat and expensive, so most learners start with the open-source ones; simulation farms and emulation hardware are a large part of a real chip's budget. A good habit to build now: write the checker before the stimulus, and measure what you covered.",
        ),
      },
      {
        kind: "recap",
        points: [
          "**Verification** shows the design matches the spec, and is often the biggest share of a chip project. **Constrained-random** tests plus a **reference model**, measured by **coverage** bins; 100% coverage is a milestone, not proof.",
          "**Formal** proves a property for **all** inputs (SAT/SMT solvers, not brute force) or returns a **counterexample**; it needs well-bounded blocks and honest assumptions.",
          "**DFT** targets manufacturing defects: **scan chains** make flops controllable and observable, **ATPG** generates patterns for a fault model like **stuck-at**, **BIST** self-tests memories.",
          "Those tests run on automatic test equipment at **wafer sort** and **final test**. Open tools to start with: Icarus Verilog, Verilator, cocotb, SymbiYosys.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 10. FPGA vs ASIC and tape-out ───────────────────────────────
  {
    id: "fnd-chip-10-fpga-asic-tapeout",
    title: "FPGA vs ASIC and tape-out",
    summary: "Prototyping on an FPGA, the cost crossover with an ASIC, respin risk, what tape-out means, and the open-source path from RTL to a real chip.",
    minutes: 12,
    xp: 90,
    level: "Professional",
    steps: [
      {
        kind: "explain",
        title: "Two ways to build the same logic",
        body: P(
          "An **ASIC** (application-specific integrated circuit) is a chip made for one design: masks, fabrication, the whole flow of this module. An **FPGA** (field-programmable gate array) is a chip that is already made: a grid of small configurable look-up tables (LUTs), flip-flops, memory blocks and a programmable wiring network. You load a **bitstream** and it *becomes* your circuit, in seconds, again and again.",
          "That makes FPGAs ideal for **prototyping** (run your RTL on real hardware long before any silicon exists) and for products with low volume or changing requirements. **Emulation** systems, large boxes full of FPGAs or special processors, run a whole SoC design, slowly but far faster than simulation, to boot an operating system before tape-out.",
          "ASIC logic is smaller, faster and uses less power per function, and each unit is cheap, but the up-front engineering cost is huge. An FPGA is the reverse: no mask cost, each unit expensive. Which wins depends on the **volume**.",
        ),
      },
      {
        kind: "question",
        title: "A reset, not an initial value",
        body: "Your RTL has `reg [7:0] count = 8'd0;` (an initial value). It works on the FPGA board. What is the safe lesson for the ASIC version?",
        question: {
          type: "choice",
          options: [
            "Add a reset: ASIC flops have no set power-up value",
            "Nothing changes: ASIC flip-flops power up to zero",
            "Initial values are an error in every synthesis tool",
            "ASIC flops power up random, so `initial` is an error",
          ],
          answer: 0,
          hint: "FPGAs load their power-up state from the bitstream. What does a standard-cell flip-flop have?",
          feedback: {
            1: "Nothing forces a standard-cell flop to zero when power arrives; its starting state is undefined.",
            2: "FPGA tools accept initial values and use them for power-up state, so it is not an error everywhere.",
            3: "The state is undefined, not a feature you can use, but `initial` is simply ignored by most ASIC flows rather than being an error.",
          },
        },
        explanation: "Standard-cell flip-flops have no defined power-up value, and `initial` is usually ignored by ASIC flows, so the design needs an explicit reset. FPGAs can honour initial values because their flip-flops are loaded from the bitstream. ASIC flops have no such mechanism, so a design that relies on `initial` can work on the prototype and fail in silicon. Use a reset that the design drives explicitly, and simulate with it. Differences like this are why an FPGA prototype is valuable but not a full proof of the ASIC.",
      },
      {
        kind: "question",
        title: "The crossover",
        body: P(
          "Compare total cost: **total = NRE + units × cost per unit**. **NRE** (non-recurring engineering) is the one-time cost: for an ASIC, design, tools, verification and the **mask set** (the set of plates, one per layer, that the fab uses to print the chip). Published estimates put a mask set alone at roughly **a million dollars at mature nodes** (28 nm and older) and **tens of millions at the leading edge**, and the whole project costs far more. The numbers in the widget are **illustrative orders of magnitude, not quotes**.",
          "Setting the two totals equal gives the **crossover volume** where the ASIC starts to win:",
          txt(`
V* = (NRE_asic - NRE_fpga) / (unit_fpga - unit_asic)

below V*  the FPGA is cheaper     above V*  the ASIC is cheaper
`),
          "Set the production volume so that the **ASIC is the cheaper option**.",
        ),
        widget: { type: "chip-crossover", props: {} },
        question: { type: "widget", goal: { volumeAtLeastCrossover: true }, prompt: "Choose a volume at or above the crossover.", hint: "The ASIC pays off only after enough units spread its NRE." },
        explanation: "At the defaults the crossover is about **110,667 units**: at 30,000 the FPGA is cheaper, at 1 million the ASIC is. Above V* every extra unit saves the difference in unit cost; below it the NRE is not recovered.",
      },
      {
        kind: "question",
        title: "Compute the crossover",
        body: "ASIC NRE = $5,000,000; FPGA NRE = $20,000; ASIC unit cost = $5; FPGA unit cost = $50 (illustrative). What is the crossover volume, in **units**? Use the formula above.",
        question: { type: "number", answer: 110667, tolerance: 5, unit: "units", hint: "(5,000,000 − 20,000) ÷ (50 − 5)." },
        explanation: "4,980,000 ÷ 45 ≈ **110,667**. Numbers like these are illustrative, but the structure is real: a lower ASIC NRE (older node, shared mask set) pulls the crossover down, and so does a bigger FPGA price premium.",
      },
      {
        kind: "question",
        title: "The price of a bug",
        body: "Now suppose a bug escapes to silicon: a **respin** means a second mask set and rework, +30% of the ASIC NRE in this toy. With the other numbers unchanged, what is the new crossover volume, in **units**? (The widget opens after you answer: switch on respin there to check.)",
        widget: { type: "chip-crossover", props: {} , after: true },
        question: { type: "number", answer: 144000, tolerance: 50, unit: "units", hint: "ASIC NRE becomes 1.3 × 5,000,000 = 6,500,000. Subtract the FPGA NRE, then divide by 45." },
        explanation: "(6,500,000 − 20,000) ÷ 45 = **144,000**. One escaped bug moves the break-even up by about 30%: a very good reason for the verification effort of the last lesson, and for FPGA prototyping and emulation before tape-out.",
      },
      {
        kind: "code",
        title: "The crossover in code",
        body: P(
          "Write `crossover_volume(nre_asic, unit_asic, unit_fpga, nre_fpga=0, respin=0.0)`. It returns the number of units at which the ASIC and FPGA totals are equal, using the totals from this lesson. `respin` is the extra fraction of the ASIC NRE paid for a respin (0.3 means +30%).",
          "If there is no crossover, return **`None`**: when the FPGA is not more expensive per unit, the ASIC can never win back its NRE, and when the ASIC's (respun) NRE is not above the FPGA's, there is nothing to win back.",
        ),
        language: "python",
        starter: "def crossover_volume(nre_asic, unit_asic, unit_fpga, nre_fpga=0, respin=0.0):\n    # units at which the two totals are equal, or None\n    # your code here\n    return 0\n",
        solution:
          "def crossover_volume(nre_asic, unit_asic, unit_fpga, nre_fpga=0, respin=0.0):\n    nre = nre_asic * (1 + respin)\n    if unit_fpga <= unit_asic or nre <= nre_fpga:\n        return None\n    return (nre - nre_fpga) / (unit_fpga - unit_asic)\n",
        tests: [
          { id: "default", description: "The lesson's numbers: $5M vs $20k NRE, $5 vs $50, about 110,667 units", assertionCode: `v = crossover_volume(5_000_000, 5, 50, 20_000)\nassert v is not None and abs(v - 110666.6667) < 1e-3, f"got {v}"` },
          { id: "respin", description: "A 30% respin moves it to 144,000", assertionCode: `v = crossover_volume(5_000_000, 5, 50, 20_000, 0.3)\nassert v is not None and abs(v - 144000) < 1e-6, f"got {v}"` },
          { id: "no-fpga-nre", description: "$1M NRE, saving $10 per unit, FPGA NRE left at 0: 100,000", assertionCode: `v = crossover_volume(1_000_000, 2, 12)\nassert v is not None and abs(v - 100000) < 1e-6, f"got {v}"` },
          { id: "none-unit", description: "No crossover when the FPGA is not dearer per unit", assertionCode: `assert crossover_volume(1_000_000, 10, 8) is None and crossover_volume(1_000_000, 10, 10) is None, "expected None"` },
          { id: "none-nre", description: "No crossover when the ASIC NRE is not above the FPGA's", assertionCode: `assert crossover_volume(10_000, 5, 50, 20_000) is None, f"got {crossover_volume(10_000, 5, 50, 20_000)}"` },
        ],
        hints: ["Work out the ASIC's NRE including any respin first, then handle the two no-crossover cases.", "Otherwise the crossover is the extra NRE divided by the per-unit saving."],
      },
      {
        kind: "question",
        title: "What \"tape-out\" means",
        body: P(
          "**Tape-out** is the moment the design is released for manufacturing: the final, signed-off **layout database** (in the **GDSII** or **OASIS** file format) is sent to the foundry, which turns it into masks. The word dates from the days when the data went to the fab on a reel of magnetic tape.",
          "It is a one-way door. Before it, a team works through a **sign-off checklist**: final **STA** at every corner (setup and hold; *Low power and sign-off* covers corners and variation), **DRC** clean, **LVS** clean, power-grid (IR drop) and signal-integrity checks, and the verification and test-coverage goals from the last lesson. After it come masks, wafers (*The fab process loop*), packaging and test (*Packaging and test*), and **bring-up**: the first time real silicon runs your design.",
          "On the day before tape-out, which of these findings should stop the release?",
        ),
        question: {
          type: "choice",
          options: [
            "Wirelength is 3% above the floorplan estimate",
            "Simulation took a week longer than planned",
            "Reviewers want the RTL comments rewritten",
            "LVS finds a net in the layout the netlist lacks",
          ],
          answer: 3,
          hint: "Which item on the list says the layout may not be the circuit you verified?",
          feedback: {
            0: "Wirelength is an estimate the flow works with; if timing, DRC and LVS pass, a longer total is not a sign-off failure.",
            1: "A late schedule is painful, but it says nothing about whether the layout is correct.",
            2: "Comments don't change the layout. They can be fixed in the source after the release.",
          },
        },
        explanation: "An LVS mismatch means the drawn layout is not the netlist you simulated and timed: an extra net could be a short or a missing connection, and every die would carry it. That is a hard stop. The other three are worth fixing some day, but none of them puts wrong shapes on the masks.",
      },
      {
        kind: "question",
        title: "Order of events",
        body: "Put these events in order, from sign-off to a chip on the bench.",
        question: {
          type: "order",
          items: [
            "Sign-off: STA at all corners, DRC and LVS clean",
            "The GDSII or OASIS layout is sent to the foundry (tape-out)",
            "The foundry makes masks and fabricates wafers",
            "Wafer sort: every die is tested while still on the wafer",
            "Good dies are diced, packaged and tested again (final test)",
            "Bring-up: the first packaged silicon is powered on",
          ],
          hint: "Checks come before release; manufacturing comes next, then the two rounds of test.",
        },
        explanation: "The sign-off checks (timing, **DRC** and **LVS**, which run side by side) gate the release; the foundry then makes masks and wafers; **wafer sort** finds the bad dies before anyone pays to package them, and **final test** checks the packaged parts that bring-up then uses. Every step after tape-out costs real money or weeks, which is why a clean sign-off matters.",
      },
      {
        kind: "question",
        title: "In practice: your own chip",
        body: P(
          "You can run this whole flow yourself with open-source tools, as examples rather than recommendations:",
          "- **RTL and simulation**: write Verilog, simulate with Icarus Verilog or Verilator, test with cocotb.\n- **Synthesis**: Yosys, mapping onto the cells of an open **PDK** (process design kit: the foundry's device models, DRC and LVS rules, cell libraries and technology files; see *How chips are designed*). **SkyWater SKY130** is an open 130 nm PDK; open PDKs exist for a few other processes too.\n- **Physical design**: **OpenROAD** (floorplan, place, CTS, route, timing), usually driven by **OpenLane**, a flow that chains these steps and the sign-off checks.\n- **Checks and viewing**: KLayout and Magic for layout and DRC, Netgen for LVS.\n- **Fabrication**: **shuttle** or **multi-project wafer (MPW)** programs put many small designs on one set of masks and share the cost, so a small team can get chips for far less than a private mask set. Availability and prices change; check current programs.\n- **Prototype first**: an inexpensive FPGA board runs the same RTL in the meantime (*FPGA hands-on: from RTL to a board* shows how).",
          "Put the open-source path in order, from your RTL to a chip on a shuttle.",
        ),
        question: {
          type: "order",
          items: [
            "Simulate the RTL with Icarus Verilog or Verilator",
            "Synthesise with Yosys onto the PDK's standard cells",
            "Floorplan, place, build the clock tree and route with OpenROAD",
            "Check DRC (KLayout or Magic) and LVS (Netgen)",
            "Send the GDS to a multi-project wafer (shuttle) run",
          ],
          hint: "It is the same flow as the whole module: prove the logic, turn it into cells, lay it out, check the layout, then release it.",
        },
        explanation: "Simulation → Yosys → OpenROAD → DRC/LVS → shuttle: the same **spec → RTL → simulation → synthesis → place and route → sign-off → tape-out → fab** path as the whole module, with free tools. Honest about cost: open tools are free, but open PDKs are older, larger nodes, so the chips are slower and bigger than leading-edge parts. A commercial flow at an advanced node means licensed tools from the large EDA vendors (priced per seat), a mask set costing millions to tens of millions of dollars, and a team of specialists in each stage. An FPGA board and a toy RTL design cost a modest amount by comparison. Tools differ; the ideas in this module carry over to all of them.",
      },
      {
        kind: "recap",
        points: [
          "An **FPGA** is configured with a bitstream: perfect for **prototyping**, **emulation** and low volume. An **ASIC** costs far more up front (masks, design, verification) but less per unit.",
          "**Crossover volume V\\* = (NRE_asic − NRE_fpga) / (unit_fpga − unit_asic)**; no crossover if the FPGA is not dearer per unit. A **respin** raises ASIC NRE and moves V\\* up.",
          "FPGAs can use initial values; ASICs need an explicit **reset**.",
          "**Tape-out** = sending the signed-off layout database (GDSII/OASIS) to the foundry, after timing, DRC and LVS sign-off; then wafer sort, packaging, final test and bring-up.",
          "Open path: Icarus/Verilator/cocotb, Yosys, OpenROAD/OpenLane on an open PDK such as SKY130, KLayout/Magic/Netgen, and shuttle (MPW) programs.",

        ],
      },
    ],
  },
];
