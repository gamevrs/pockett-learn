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
          "Below is a toy: a made-up library of seven cells (areas in µm² and delays in ps are **illustrative**, not any real process). The RTL is `assign y = (a & b) | c;`. Try both ways of building it.",
        ),
        widget: { type: "chip-synth", props: { preset: "ao", choosePreset: false } },
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
        body: "Switch the toy to the **2:1 mux** design (`assign y = s ? b : a;`). Which statement about its two netlists is correct?",
        widget: { type: "chip-synth", props: { preset: "mux" } },
        question: {
          type: "choice",
          options: [
            "The MUX2 cell is both smaller and faster, so it always wins",
            "The NAND version is both smaller and faster, so it always wins",
            "The MUX2 cell has the smaller area (3.0 vs 4.9 µm²), but the NAND version is faster (40 vs 45 ps)",
            "They are identical in area and delay, since they do the same job",
          ],
          answer: 2,
          hint: "Read both numbers for each netlist, not just one of them.",
          feedback: {
            0: "The MUX2 cell is smaller, but check the delay column: it loses on speed (45 ps).",
            1: "The NAND version is faster (40 ps) but uses more cells: 4.9 µm² against 3.0 µm².",
            3: "Same function does not mean same cost. Area and delay differ even though the truth table is identical.",
          },
        },
        explanation: "This is the basic **area vs speed trade-off**. A synthesis tool is given a clock period (a **constraint**) and then minimises area subject to meeting it; when timing is tight it spends area on faster structures, when timing is relaxed it saves area. The toy numbers (3.0 µm² / 45 ps and 4.9 µm² / 40 ps) are illustrative.",
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
        title: "Ignored in synthesis",
        body: "A designer writes `assign #5 y = a & b;` and expects a 5 ns delay in the real chip. What actually happens in synthesis?",
        question: {
          type: "choice",
          options: [
            "The tool adds a 5 ns delay cell",
            "The `#5` is ignored; the real delay comes from the cells and wires the tool chooses",
            "The tool refuses the file with an error",
            "The delay is rounded to the nearest clock period",
          ],
          answer: 1,
          hint: "Delays in the code are for simulation only.",
          feedback: {
            0: "Tools do not build hardware from `#` delays; they time the circuit they actually build.",
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
        title: "Slack and fmax in code",
        body: P(
          "Write two small functions. `slack(required, arrival)` returns the setup slack (any consistent unit). `fmax_mhz(path_ns)` takes the **minimum clock period** in nanoseconds (arrival plus setup, minus skew) and returns the highest clock frequency in **MHz**: 1000 divided by the period in ns.",
          "Check: a 2.5 ns critical path gives 400 MHz, which is exactly what the four-path widget reports.",
        ),
        language: "python",
        starter: "def slack(required, arrival):\n    # setup slack = required time minus arrival time\n    return None\n\n\ndef fmax_mhz(path_ns):\n    # minimum clock period in ns -> highest clock in MHz\n    return None\n",
        solution: "def slack(required, arrival):\n    return required - arrival\n\n\ndef fmax_mhz(path_ns):\n    return 1000.0 / path_ns\n",
        tests: [
          { id: "slack-neg", description: "path D at 2 ns misses by 500 ps", assertionCode: `assert slack(1800, 2300) == -500, f"got {slack(1800, 2300)}"` },
          { id: "slack-pos", description: "path A has plenty of room", assertionCode: `assert slack(1800, 960) == 840, f"got {slack(1800, 960)}"` },
          { id: "slack-zero", description: "arriving exactly on time is slack 0", assertionCode: `assert slack(1000, 1000) == 0, f"got {slack(1000, 1000)}"` },
          { id: "fmax-400", description: "2.5 ns gives 400 MHz", assertionCode: `assert abs(fmax_mhz(2.5) - 400) < 1e-9, f"got {fmax_mhz(2.5)}"` },
          { id: "fmax-1g", description: "1 ns gives 1000 MHz", assertionCode: `assert abs(fmax_mhz(1.0) - 1000) < 1e-9, f"got {fmax_mhz(1.0)}"` },
          { id: "fmax-slow", description: "4 ns gives 250 MHz", assertionCode: `assert abs(fmax_mhz(4.0) - 250) < 1e-9, f"got {fmax_mhz(4.0)}"` },
        ],
        hints: ["Slack is required minus arrival, so a late arrival makes it negative.", "A period in ns is 10⁻⁹ s, so f in MHz = 1000 / period in ns."],
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
            "Upsizing gates is free: faster cells never cost area or power",
            "Retiming (moving a register along the path) or pipelining shortens the longest stage, but may change latency or need extra flip-flops",
            "Slowing the clock is the only way to fix a setup violation",
            "Adding delay buffers on the path is the standard fix for setup",
          ],
          answer: 1,
          hint: "Think about what each fix gives up.",
          feedback: {
            0: "Bigger cells are faster but use more area and power (the toy doubles the area).",
            2: "Slowing the clock does fix setup, but it throws away performance. It is the fix of last resort.",
            3: "Delay buffers make the path slower. They are used for the opposite problem: hold.",
          },
        },
        explanation: "Setup fixes make the critical path **shorter** (re-synthesise, upsize, restructure, retime, pipeline) or give it more time (a multicycle path, where that is truly safe). Each has a cost in area, power, latency or design effort, which is why timing closure is a negotiation, not a button.",
      },
      {
        kind: "explain",
        title: "Hold: the same edge",
        body: P(
          "Setup asks: does the data arrive **before** the next edge? **Hold** asks: does the *old* data stay **long enough after the same edge** that captures it? If the next flop's clock arrives late (**skew**) and the path between the flops is very short, the new data races through and overwrites the old before the capture flop has finished looking.",
          txt(`
hold slack = (tcq + shortest path) - (thold + skew)

thold    the capturing flop's hold time
negative = violation, and T does not appear in it
`),
          "The period T is not in the formula: hold is checked at the **same edge**, so a slower clock does not help. The fix is to **add delay** to the short path with buffers. This preset has skew 500 ps and a nearly direct flop-to-flop wire: setup is fine, hold fails.",
        ),
        widget: { type: "chip-sta", props: { preset: "hold", choosePreset: false, showSkew: true } },
      },
      {
        kind: "question",
        title: "Fix the hold violation",
        body: "In the **hold** preset, make hold timing pass by changing the design, not the clock.",
        widget: { type: "chip-sta", props: { preset: "hold", choosePreset: false, showSkew: true } },
        question: {
          type: "widget",
          goal: { preset: "hold", holdMet: true },
          prompt: "Make hold slack non-negative on every path.",
          hint: "Hold slack is short-path delay minus (hold time + skew). How do you make the short path longer?",
        },
        explanation: "The wire path has hold slack (400 + 48) − (100 + 500) = **−152 ps**. Each delay buffer adds 100 ps in the toy: one buffer gives −52, two give **+48 ps**. Real tools insert hold buffers automatically after clock-tree synthesis, once the skew is known; the price is a little area and power.",
      },
      {
        kind: "question",
        title: "Slow the clock?",
        body: "A chip is back from the fab and fails at full speed. A test engineer says: \"Slow the clock down and see if it works.\" It works at a lower frequency. Which kind of violation does that point to?",
        question: {
          type: "choice",
          options: [
            "A hold violation, because slowing the clock lets the old data stay longer",
            "Both setup and hold, because any violation depends on the period",
            "A setup violation on some path: a longer period gives data more time to arrive",
            "Neither; it is a power problem",
          ],
          answer: 2,
          hint: "Which of the two slack formulas contains the period T?",
          feedback: {
            0: "Hold is checked at the same edge and has no T in it, so a slower clock cannot fix it.",
            1: "Only setup slack depends on T. Hold slack does not.",
            3: "Power can matter, but the test points at timing: a lower frequency let the paths finish.",
          },
        },
        explanation: "Setup failures behave this way; hold violations are the nasty ones precisely because they fail **at every frequency** and cannot be rescued after the chip is made. That is why sign-off checks hold at every operating corner (process, voltage and temperature combinations) before tape-out, and why the clock tree, next lesson, is built to keep skew under control.",
      },
      {
        kind: "recap",
        points: [
          "**STA** checks every path against the clock by adding delays, no input vectors needed.",
          "**Setup slack = required − arrival**, with required = T + skew − tsu and arrival = tcq + gate delays. Negative is a violation; **WNS** is the worst path, **TNS** the sum of the negative ones.",
          "**fmax** (MHz) = 1000 / minimum period (ns). Fix setup by shortening the path: upsizing, restructuring, **retiming**, **pipelining** (more latency, more throughput).",
          "**Hold** is checked at the **same edge**: slack = tcq + short path − (thold + skew). Slowing the clock does **not** fix it; add delay to the short path.",
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
            "Overflow means too many wires want the same routing channel; the router cannot complete them without detours or failures, so the design may not route at all",
            "Wirelength is irrelevant, only overflow matters",
            "Overflow only makes the picture look untidy",
            "Overflow means the blocks overlap in the layout",
          ],
          answer: 0,
          hint: "Routing channels have a limited number of tracks.",
          feedback: {
            1: "Wirelength matters too: longer wires are slower, bigger and burn more power. It is a balance.",
            2: "It is not cosmetic: each metal layer has limited tracks, so excess demand is a real routing failure.",
            3: "Blocks do not overlap here; overflow is about wire demand against capacity.",
          },
        },
        explanation: "**Routing** draws the real wires on several metal layers (horizontal on some, vertical on others, joined by **vias**). If demand in a region exceeds the tracks available, the router makes long detours, adds delay, or leaves open or shorted nets. Congestion is why floorplans have empty-looking space.",
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
        title: "Skew eats the hold margin",
        body: "A launching flop and a capturing flop have tcq = 50 ps, thold = 20 ps and the shortest path between them is 40 ps. The capture clock arrives **100 ps later** than the launch clock. What is the **hold slack**, in ps?",
        question: { type: "number", answer: -30, tolerance: 1, unit: "ps", hint: "hold slack = tcq + shortest path − thold − skew = 50 + 40 − 20 − 100." },
        explanation: "50 + 40 − 20 − 100 = **−30 ps**: a violation. The same 100 ps skew would *help* setup (the data gets 100 ps more time), which is why a late capture clock is sometimes used on purpose (**useful skew**), but it eats hold margin directly. Tools fix it with hold buffers, as in the last lesson.",
      },
      {
        kind: "question",
        title: "DRC or LVS?",
        body: "After routing, the layout is checked twice. A check finds that two metal wires are **closer together than the foundry allows**. Which check reports that, and what does the other one check?",
        question: {
          type: "choice",
          options: [
            "LVS reports it; DRC compares simulation waveforms",
            "DRC reports it; LVS checks that the transistors run fast enough",
            "DRC reports it; LVS extracts the netlist from the layout and checks that it matches the schematic or synthesised netlist",
            "Both are the same check under two names",
          ],
          answer: 2,
          hint: "One check is about geometry and the foundry's rules. The other is about connectivity.",
          feedback: {
            0: "Backwards: spacing is a geometric rule, which is DRC. LVS has nothing to do with waveforms.",
            1: "DRC is right, but LVS is not a speed check; that is STA. LVS compares connectivity.",
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
          "**Leakage** is current that flows even when nothing switches; it grows with lower-threshold (faster) transistors and with temperature. Notice the **V²**: lowering the voltage pays back more than lowering the frequency, but a lower voltage also makes transistors slower, so the clock must drop too (the widget flags a clock the voltage cannot support). **Clock gating** switches the clock off for idle blocks so they stop toggling. Toy numbers.",
        ),
        widget: { type: "chip-power", props: {} },
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
        starter: "def dynamic_power(alpha, c, v, f):\n    # P = alpha * C * V^2 * f\n    return 0\n",
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
          "**Clock tree synthesis** balances skew; skew shifts setup and hold budgets (a late capture clock helps setup and hurts hold).",
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
          "Try it on an 8-bit ALU with 25 coverage bins (toy). Tap bins to run directed tests, or run batches of random tests, and compare uniform random with the **biased** generator.",
        ),
        widget: { type: "chip-coverage", props: { formal: false } },
      },
      {
        kind: "question",
        title: "Ninety per cent",
        body: "Reach at least **90%** functional coverage on the ALU. Mix directed taps and random runs however you like.",
        widget: { type: "chip-coverage", props: { formal: false } },
        question: { type: "widget", goal: { minCoverage: 0.9 }, prompt: "Hit at least 90% of the 25 bins.", hint: "Random runs get most bins quickly. For the last few rare ones, switch on the bias or tap the bins directly." },
        explanation: "Uniform random with this seed needs about 2,400 tests for 90%, and thousands more for the last corner cases (carry and equality bins are rare when 8-bit operands are drawn at random). Biased generation, which weights stimulus toward special values like 0 and 255, gets there in a few hundred. Directed tests for the rare bins plus random for everything else is the usual mix.",
      },
      {
        kind: "question",
        title: "What coverage means",
        body: "A regression reports **100% functional coverage** on all bins. What can you conclude?",
        question: {
          type: "choice",
          options: [
            "The design has no bugs",
            "Every bin we thought to define was hit, but bugs outside the defined bins, or hit but not checked, can remain",
            "The design is formally proven correct",
            "The test suite can be deleted, since it is complete",
          ],
          answer: 1,
          hint: "Coverage measures stimulus against a list someone wrote.",
          feedback: {
            0: "Coverage says tests *reached* those situations, not that every output was *checked* correctly.",
            2: "Simulation, even with full coverage, samples behaviour. Proofs are a different technique.",
            3: "Regressions are re-run after every change to catch new bugs; a passing history is not a reason to stop.",
          },
        },
        explanation: "Coverage is only as good as its **bins** and the **checkers** behind the tests. A bin hit by a test that never compares the output proves nothing. Teams track coverage together with pass rates, bug-discovery trends and review, and treat 100% as a milestone, not a guarantee.",
      },
      {
        kind: "question",
        title: "Prove it, then break it",
        body: P(
          "Simulation tries inputs. **Formal verification** instead *proves* a property for **all** inputs at once, or produces a **counterexample**: a concrete input that breaks it. Engines use **SAT/SMT solvers** (programs that decide whether a logical formula can be satisfied) and clever state-space reductions, not brute force; real designs have far too many states to enumerate.",
          "The toy below checks a 4-bit saturating adder against the property `sat_add(a, b) >= a and >= b`. With only 256 input pairs the widget can enumerate them; real tools do the same job symbolically for 64-bit buses. Run the formal check, then plant the bug and read the counterexample.",
        ),
        widget: { type: "chip-coverage", props: { formal: true } },
        question: { type: "widget", goal: { formalRun: true }, prompt: "Run the formal check (and try the bug switch too).", hint: "Use the formal panel's run button." },
        explanation: "With the correct adder, all 256 pairs satisfy the property. With the planted bug, **15 counterexamples** appear, and the first is a = 1, b = 15 giving 0: the sum wrapped instead of saturating. Formal tools are strongest on control logic, arbiters and protocol properties with small, well-defined behaviour; they struggle with deep datapaths, so teams combine both methods.",
      },
      {
        kind: "question",
        title: "Simulation or proof?",
        body: "What is the key difference between a passing simulation and a passing formal proof of a property?",
        question: {
          type: "choice",
          options: [
            "Formal is only faster; they give the same guarantee",
            "Simulation covers all inputs while formal checks a sample",
            "Formal always replaces simulation entirely",
            "Simulation shows the property held for the inputs tried; a proof shows it holds for every input (within the modelled assumptions)",
          ],
          answer: 3,
          hint: "One samples; the other reasons about everything.",
          feedback: {
            0: "The guarantee is different: samples versus all inputs. Speed is not the point.",
            1: "Backwards: simulation samples; formal reasons about all inputs.",
            2: "Formal has capacity limits and needs properties written; teams use both in combination.",
          },
        },
        explanation: "A proof is only as good as the property and the **assumptions** (constraints on inputs) written down. An over-constrained proof can pass vacuously. Both techniques have a place: simulation scales to whole systems, formal gives exhaustive answers on well-bounded blocks.",
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
          goal: { findFault: true, fault: { net: "n2", value: 0 } },
          prompt: "Identify the faulty net and the value it is stuck at.",
          hint: "Find a pattern whose response differs from the expected one, then ask which nets could change those captured bits when stuck.",
        },
        explanation: "This is what ATPG does at scale: choose patterns that make a fault's effect show up at an observable flop. The toy's six internal nets have 12 single stuck-at faults, all distinguishable, and just three patterns (0000, 1101, 0110) detect every one (100% **fault coverage**). Real designs use compressed scan and need thousands of patterns for tens of millions of faults.",
      },
      {
        kind: "question",
        title: "How many faults?",
        body: "The toy logic has **6 internal nets**, and the stuck-at model puts each net at 0 *or* at 1, one at a time. How many single stuck-at faults is that?",
        question: { type: "number", answer: 12, tolerance: 0, unit: "faults", hint: "Two fault types per net." },
        explanation: "6 × 2 = **12**. Stuck-at faults grow linearly with the number of nets, which is why a fault model is useful: the target list is finite. Real defects are not all stuck-at (bridges between wires, slow transitions), so test engineers add other models, such as transition (delay) faults, on top.",
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
            "Nothing changes: ASIC flip-flops power up to zero",
            "ASIC flip-flops always power up to a random value, so initial values are an error",
            "Standard-cell flip-flops have no defined power-up value, and `initial` is usually ignored by ASIC flows, so add an explicit reset signal",
            "Initial values are an error in every synthesis tool",
          ],
          answer: 2,
          hint: "FPGAs load their power-up state from the bitstream. What does a standard-cell flip-flop have?",
          feedback: {
            0: "Nothing forces a standard-cell flop to zero when power arrives; its starting state is undefined.",
            1: "The state is undefined, not a feature you can use, but `initial` is simply ignored by most ASIC flows rather than being an error.",
            3: "FPGA tools accept initial values and use them for power-up state, so it is not an error everywhere.",
          },
        },
        explanation: "FPGAs can honour initial values because their flip-flops are loaded from the bitstream. ASIC flops have no such mechanism, so a design that relies on `initial` can work on the prototype and fail in silicon. Use a reset that the design drives explicitly, and simulate with it. Differences like this are why an FPGA prototype is valuable but not a full proof of the ASIC.",
      },
      {
        kind: "question",
        title: "The crossover",
        body: P(
          "Compare total cost: **total = NRE + units × cost per unit**. **NRE** (non-recurring engineering) is the one-time cost: for an ASIC, design, tools, verification and the **mask set** (the set of plates, one per layer, that the fab uses to print the chip). At advanced nodes a mask set costs on the order of **millions of dollars** by itself, and the whole project far more; older nodes are much cheaper. The numbers in the widget are **illustrative orders of magnitude, not quotes**.",
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
        body: "Switch on **respin** in the widget (a bug escapes to silicon: a second mask set and rework, +30% of the ASIC NRE in this toy). With the other defaults unchanged, what is the new crossover volume, in **units**?",
        widget: { type: "chip-crossover", props: {} },
        question: { type: "number", answer: 144000, tolerance: 50, unit: "units", hint: "ASIC NRE becomes 1.3 × 5,000,000 = 6,500,000. Subtract the FPGA NRE, then divide by 45." },
        explanation: "(6,500,000 − 20,000) ÷ 45 = **144,000**. One escaped bug moves the break-even up by about 30%: a very good reason for the verification effort of the last lesson, and for FPGA prototyping and emulation before tape-out.",
      },
      {
        kind: "code",
        title: "The crossover in code",
        body: P(
          "Write `crossover_volume(nre_asic, unit_asic, unit_fpga)`, assuming the FPGA has **zero NRE**. It returns the number of units at which the totals are equal: `nre_asic / (unit_fpga - unit_asic)`.",
          "If the FPGA is **not** more expensive per unit (`unit_fpga <= unit_asic`), the ASIC never pays back its NRE through unit savings, so return **`None`**.",
        ),
        language: "python",
        starter: "def crossover_volume(nre_asic, unit_asic, unit_fpga):\n    # units at which ASIC total cost equals FPGA total cost (FPGA NRE = 0)\n    # return None when the FPGA is not more expensive per unit\n    return 0\n",
        solution: "def crossover_volume(nre_asic, unit_asic, unit_fpga):\n    if unit_fpga <= unit_asic:\n        return None\n    return nre_asic / (unit_fpga - unit_asic)\n",
        tests: [
          { id: "basic", description: "$1M NRE, saving $10 per unit, crosses at 100,000", assertionCode: `assert abs(crossover_volume(1_000_000, 2, 12) - 100000) < 1e-6, f"got {crossover_volume(1_000_000, 2, 12)}"` },
          { id: "default", description: "$5M NRE, $5 vs $50", assertionCode: `assert abs(crossover_volume(5_000_000, 5, 50) - 111111.111111) < 1e-3, f"got {crossover_volume(5_000_000, 5, 50)}"` },
          { id: "none-cheaper-fpga", description: "no crossover when the FPGA is cheaper per unit", assertionCode: `assert crossover_volume(1_000_000, 10, 8) is None, f"got {crossover_volume(1_000_000, 10, 8)}"` },
          { id: "none-equal", description: "no crossover when unit costs are equal", assertionCode: `assert crossover_volume(1_000_000, 10, 10) is None, f"got {crossover_volume(1_000_000, 10, 10)}"` },
        ],
        hints: ["Guard first: if unit_fpga <= unit_asic, return None.", "Otherwise divide the ASIC NRE by the per-unit saving."],
      },
      {
        kind: "explain",
        title: "What \"tape-out\" means",
        body: P(
          "**Tape-out** is the moment the design is released for manufacturing: the final, signed-off **layout database** (in the **GDSII** or **OASIS** file format) is sent to the foundry, which turns it into masks. The word dates from the days when the data went to the fab on a reel of magnetic tape.",
          "It is a one-way door. Before it, a team runs the sign-off checklist: final **STA** at all corners (setup and hold), **DRC** clean, **LVS** clean, power and signal-integrity checks, and the verification and test-coverage goals from the last lesson. After it come masks, wafers (*The fab process loop*), packaging and test (*Packaging and test*), and **bring-up**: the first time real silicon runs your design.",
        ),
      },
      {
        kind: "question",
        title: "Order of events",
        body: "Put these events in order, from sign-off to a chip on the bench.",
        question: {
          type: "order",
          items: [
            "Final timing sign-off passes at all corners",
            "DRC and LVS come back clean",
            "The GDSII or OASIS layout is sent to the foundry (tape-out)",
            "The foundry makes masks and fabricates wafers",
            "Dies are tested, packaged and tested again",
            "Bring-up: the first silicon is powered on",
          ],
          hint: "Checks come before release; manufacturing and test come after it.",
        },
        explanation: "Sign-off checks (timing, **DRC**, **LVS**) gate the release; the foundry then makes masks and wafers; packaged parts are tested and brought up. Every step after tape-out costs real money or weeks, which is why a clean sign-off matters.",
      },
      {
        kind: "explain",
        title: "In practice: your own chip",
        body: P(
          "You can run this whole flow yourself with open-source tools, as examples rather than recommendations:",
          "- **RTL and simulation**: write Verilog, simulate with Icarus Verilog or Verilator, test with cocotb.\n- **Synthesis**: Yosys, mapping onto the cells of an open **PDK** (process design kit: the foundry's cell library and design rules). **SkyWater SKY130** is an open 130 nm PDK; open PDKs exist for a few other processes too.\n- **Physical design**: **OpenROAD** (floorplan, place, CTS, route, timing) driven by **OpenLane**, a flow that chains these steps and sign-off.\n- **Checks and viewing**: KLayout and Magic for layout and DRC, Netgen for LVS.\n- **Fabrication**: **shuttle** or **multi-project wafer (MPW)** programs put many small designs on one set of masks and share the cost, so a small team can get chips for far less than a private mask set. Availability and prices change; check current programs.\n- **Prototype first**: an inexpensive FPGA board runs the same RTL in the meantime.",
          "Honest about cost: open tools are free, but open PDKs are older, larger nodes, so the chips are slower and bigger than leading-edge parts. A commercial flow at an advanced node means licensed tools from the large EDA vendors (priced per seat), a mask set in the millions of dollars, and a team of specialists in each stage of this module. An FPGA board and a toy RTL design cost a modest amount by comparison.",
          "You now know the whole path: **spec → RTL → simulation → synthesis → place and route → timing and physical sign-off → tape-out → fab**. Tools differ; the ideas in this module carry over to all of them.",
        ),
      },
      {
        kind: "recap",
        points: [
          "An **FPGA** is configured with a bitstream: perfect for **prototyping**, **emulation** and low volume. An **ASIC** costs far more up front (masks, design, verification) but less per unit.",
          "**Crossover volume V\\* = (NRE_asic − NRE_fpga) / (unit_fpga − unit_asic)**; no crossover if the FPGA is not dearer per unit. A **respin** raises ASIC NRE and moves V\\* up.",
          "FPGAs can use initial values; ASICs need an explicit **reset**.",
          "**Tape-out** = sending the signed-off layout database (GDSII/OASIS) to the foundry, after timing, DRC and LVS sign-off.",
          "Open path: Icarus/Verilator/cocotb, Yosys, OpenROAD/OpenLane, SKY130, KLayout/Magic/Netgen, and shuttle (MPW) programs.",
        ],
      },
    ],
  },
];
