import type { ConceptLesson } from "../../learn/types.ts";

/** Fenced plain-text block (tables, diagrams) for lesson prose. */
const txt = (s: string) => "~~~text\n" + s.trim() + "\n~~~";
/** Paragraphs joined with blank lines. */
const P = (...paras: string[]) => paras.join("\n\n");

// ───────────── shared Verilog snippets (the lesson tests in scratchpad/chip/tests/lessons-a.test.ts run all of them) ─────────────

const COUNTER_RTL = `module counter(input clk, input rst, input en, output reg [3:0] q);
  // On every rising clock edge: reset, or count, or hold.
  always @(posedge clk) begin
    if (rst) q <= 4'd0;
    else if (en) q <= q + 1;
  end
endmodule`;

const ORDER_CODE = `module order(input [3:0] a, input [3:0] b, output [3:0] s, output [3:0] d);
  assign s = a + b;
  assign d = s - 1;
endmodule`;

const MUX_GOAL_STIM = { steps: [{ a: 3, b: 12, sel: 0 }, { sel: 1 }, { a: 9, b: 2, sel: 0 }, { sel: 1 }] };

/** A mux with a planted bug: when sel is 1 but b is smaller than a, it returns a. */
const MUX_BUGGY = `module mux2(input [3:0] a, input [3:0] b, input sel, output [3:0] y);
  wire pick_b = sel & (b >= a);
  assign y = pick_b ? b : a;
endmodule`;

/** An adder with a planted bug: the carry out ignores the carry in. */
const ADDER_BUGGY = `module adder4(input [3:0] a, input [3:0] b, input cin, output [3:0] sum, output cout);
  wire [4:0] t;
  assign sum = a + b + cin;
  assign t = a + b;
  assign cout = t[4];
endmodule`;

const ADDER_GOOD = `module adder4(input [3:0] a, input [3:0] b, input cin, output [3:0] sum, output cout);
  assign {cout, sum} = a + b + cin;
endmodule`;

const FSM_CODE = (s2: string) => `module det101(input clk, input rst, input x, output z);
  // Moore machine: z is 1 while the machine is in S3 (it has just seen 1, 0, 1).
  localparam S0 = 2'd0;   // nothing useful seen yet
  localparam S1 = 2'd1;   // last input was 1
  localparam S2 = 2'd2;   // last two inputs were 1, 0
  localparam S3 = 2'd3;   // last three inputs were 1, 0, 1
  reg [1:0] state;
  always @(posedge clk) begin
    if (rst) state <= S0;
    else case (state)
      S0: state <= x ? S1 : S0;
      S1: state <= x ? S1 : S2;
      S2: ${s2}
      S3: state <= x ? S1 : S2;
      default: state <= S0;
    endcase
  end
  assign z = (state == S3);
endmodule`;

/** Lessons 1 to 5 of "Designing chips: from RTL to tape-out": the flow, hardware thinking, Verilog, sequential logic, testbenches. */
export const chipdesignLessonsA: ConceptLesson[] = [
  // ─────────────────────────────── 1. How chips are designed ───────────────────────────────
  {
    id: "fnd-chip-1-design-flow",
    title: "How chips are designed",
    summary: "From a written spec to masks at the foundry: the twelve stages of the chip design flow, who does what, and why it loops back on itself.",
    minutes: 8,
    xp: 45,
    level: "Beginner",
    steps: [
      {
        kind: "explain",
        title: "Nobody draws a billion transistors",
        body: P(
          "A modern processor holds billions of transistors. No team could place them by hand, so chip designers work like software engineers: they **describe** what the chip should do in a language, and programs called **EDA tools** (electronic design automation) turn the description into the shapes that get printed on silicon.",
          "The path from idea to chip is called the **design flow**. It has about a dozen stages, each one taking the output of the last:",
          "- the **front end** decides *what* the chip does: specification, writing the design, testing it, turning it into gates.\n- the **back end** decides *where everything physically goes*: placing cells, wiring, checking timing and layout rules.\n- the **fab** (a **foundry**: a factory that makes chips for other companies) builds it. That part is the subject of the Semiconductors module.",
          "Tap the stages below. Each card says what goes in, what comes out, who does the work and which tools are typical. The tools named are open-source *examples*; every step also has commercial equivalents.",
        ),
        widget: { type: "chip-flow", props: { fabHref: "/learn/fnd-semi-7-process" } },
      },
      {
        kind: "question",
        title: "The timing stage",
        body: "One stage adds up the delays along every path in the finished layout and compares them with the clock period, **without running any test vectors**.",
        widget: { type: "chip-flow", props: { fabHref: "/learn/fnd-semi-7-process" } },
        question: {
          type: "widget",
          goal: { select: "sta" },
          prompt: "Tap the stage that checks timing on every path without simulating (the card should show its name).",
          hint: "Its short name on the map is \"Timing\", and its full name starts with the word \"Static\".",
        },
        explanation: "That is **static timing analysis (STA)**: \"static\" because it adds up delays on paper (well, in a program) instead of running the design with test inputs. It covers every path, which no set of test vectors could. Lesson 7 of this module is about it.",
      },
      {
        kind: "question",
        title: "Front end or back end?",
        body: "Which pair of stages both belong to the **front end**?",
        question: {
          type: "choice",
          options: [
            "Placement and routing",
            "Simulation and logic synthesis",
            "Clock-tree synthesis and tape-out",
            "Static timing analysis and DRC/LVS",
          ],
          answer: 1,
          hint: "The front end is about what the chip does (logic). The back end is about where things physically sit.",
          feedback: {
            0: "Both place or draw things on the die, so they are back-end stages.",
            2: "Both are back-end work: the clock tree is a physical network of buffers, and tape-out hands the finished layout to the foundry.",
            3: "These check the finished layout, so they are back-end stages.",
          },
        },
        explanation: "The front end ends with a **netlist** (the design as a network of gates). Everything after that is physical: the back end gives every gate an exact location and every connection an actual wire.",
      },
      {
        kind: "explain",
        title: "What RTL looks like",
        body: P(
          "The main thing a designer writes is **RTL**, short for **register-transfer level**: code that says which **registers** (storage that holds a value between clock ticks) exist and what logic computes the next value of each one. The languages are Verilog, SystemVerilog and VHDL.",
          "Here is a real RTL fragment, a 4-bit counter. Read it like a description of a circuit, not a list of steps: *on every rising clock edge, if reset is 1 set q to 0, otherwise if enable is 1 add 1 to q*. You will write code like this yourself in lessons 3 and 4.",
          "Press Run: the waveform below the code is what that circuit would do. This simulator is a **toy** that understands a small piece of Verilog, enough to learn on.",
        ),
        widget: {
          type: "chip-verilog",
          props: {
            code: COUNTER_RTL,
            editable: false,
            title: "RTL: a 4-bit counter (read-only)",
            stimulus: { clock: "clk", steps: [{ rst: 1, en: 0 }, { rst: 0, en: 1 }, { en: 1 }, { en: 1 }, { en: 0 }, { en: 0 }, { en: 1 }, { en: 1 }] },
          },
        },
      },
      {
        kind: "question",
        title: "Put the flow in order",
        body: "Here are the main steps, shuffled. Put them in the order a design really goes through them the first time.",
        question: {
          type: "order",
          items: [
            "Write the specification",
            "Write the RTL",
            "Simulate the RTL against tests",
            "Synthesize the RTL into gates",
            "Floorplan and place the cells",
            "Build the clock tree and route the wires",
            "Check timing, then DRC and LVS",
            "Tape out to the foundry",
          ],
          hint: "Decide, write, test, convert to gates, then physical steps, then checks, then hand-off.",
        },
        explanation: "Spec → RTL → simulation → synthesis → floorplan and placement → clock tree and routing → sign-off checks (timing, **DRC** = design-rule check, **LVS** = layout versus schematic) → **tape-out**. Tape-out is the hand-off of the final layout to the foundry; the name dates from the days when the design really was written to magnetic tape.",
      },
      {
        kind: "explain",
        title: "The flow is a loop, not a line",
        body: P(
          "On paper the flow is a line. In practice it is full of **loops**: a stage fails its check and the design goes back. A failing test sends you back to the RTL. A path that is too slow after routing might need a pipeline register (an RTL change), a tighter synthesis run or a small fix in the layout. A layout that can't be routed sends you back to placement.",
          "The earlier a problem is found, the cheaper it is to fix, which is why teams spend so much effort on simulation before any layout is drawn. Switch the map to loops mode and tap **Timing** to see where it can send you.",
          "After tape-out, a mistake means a new set of masks (the stencils used to print each layer). At advanced nodes that costs millions of dollars, which makes \"get it right first time\" the whole point of the flow.",
        ),
        widget: { type: "chip-flow", props: { mode: "loops", highlight: ["sta"], fabHref: "/learn/fnd-semi-7-process" } },
      },
      {
        kind: "question",
        title: "What a bug costs",
        body: "The same bug could be found at four different moments. Which one is the **most expensive** to fix?",
        question: {
          type: "choice",
          options: [
            "In RTL simulation, before synthesis",
            "In the gate-level netlist, right after synthesis",
            "During timing sign-off, after routing",
            "In the first chips back from the fab",
          ],
          answer: 3,
          hint: "Which fix means redoing the most steps, and paying for new masks?",
          feedback: {
            0: "This is the cheapest moment: edit the RTL and re-run the test in minutes.",
            1: "Fixing it here means editing the RTL and re-running synthesis, which is cheap compared with later stages.",
            2: "Expensive in effort, since placement and routing may have to be redone, but no new masks are needed yet.",
          },
        },
        explanation: "Chips back from the fab with a logic bug need a **respin**: fix the design, redo the back end and pay for new masks. That is why simulation and verification get so much effort (lesson 9 of this module).",
      },
      {
        kind: "question",
        title: "What does the foundry receive?",
        body: "At tape-out, what does the design team actually send to the foundry?",
        question: {
          type: "choice",
          options: [
            "The RTL source files and the testbench",
            "A box of finished, packaged chips to be tested",
            "The final layout data (GDSII or OASIS files): the shapes for every layer",
            "A list of the tests the chip passed in simulation",
          ],
          answer: 2,
          hint: "The foundry builds the chip, so it needs to know the exact shapes to print, layer by layer.",
          feedback: {
            0: "The foundry doesn't need your source code. By tape-out it has been turned into geometry.",
            1: "The foundry makes the chips. Nothing finished exists yet at tape-out.",
            3: "Test results are your own sign-off evidence. The foundry needs the shapes to build.",
          },
        },
        explanation: "The output of the back end is a **layout**: polygons for each layer, stored in a standard format called **GDSII** or **OASIS**. The foundry turns it into masks. A single bad shape can ruin every chip, which is why the layout goes through DRC and LVS first.",
      },
      {
        kind: "recap",
        points: [
          "Chips are **described** in code (RTL), and **EDA tools** turn the description into layout. The flow runs: spec, RTL, simulation, synthesis, floorplan, placement, clock tree, routing, timing, DRC/LVS, tape-out, fab.",
          "**Front end**: what the chip does (up to the gate-level netlist). **Back end**: where everything goes and the checks on it. The **foundry** manufactures from the layout data.",
          "The flow **loops**: failed checks send you back, and the later a bug appears, the more it costs. After tape-out a fix means new masks.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 2. Hardware is not software ───────────────────────────────
  {
    id: "fnd-chip-2-hardware-not-software",
    title: "Hardware is not software",
    summary: "Why Verilog is not a programming language: all the logic exists at once, the clock sets the rhythm, and pipelining trades latency for throughput.",
    minutes: 9,
    xp: 45,
    level: "Beginner",
    steps: [
      {
        kind: "explain",
        title: "A program runs, a circuit exists",
        body: P(
          "Software is a list of **instructions** that one processor carries out one after another. Hardware is a **circuit**: every gate and wire exists all the time, and all of them work at once. Nothing \"runs\" in a circuit; its outputs simply follow its inputs after a short delay.",
          "The widget computes **(a + b) × (c − d)** both ways. On the left, a toy CPU runs a 6-instruction program, one instruction per clock cycle. On the right, the same maths is built as hardware: an adder, a subtractor and a multiplier wired together, with a register at the end.",
          "Press **Step**. The CPU finishes one instruction; the circuit finishes the whole expression at its first clock edge. Try changing an input too.",
        ),
        widget: { type: "chip-hwsw", props: { preset: "mulsub" } },
      },
      {
        kind: "question",
        title: "Count the cycles",
        body: "Run the whole program on the software side, then clock the hardware once.",
        widget: { type: "chip-hwsw", props: { preset: "mulsub" } },
        question: {
          type: "widget",
          goal: { minSoftwareSteps: 6, minTicks: 1 },
          prompt: "Use Step until the program has run all 6 instructions (6 cycles), with at least one hardware clock tick.",
          hint: "Each press of Step is one clock cycle for both sides, so six presses finish the program.",
        },
        explanation: "The CPU needed **6 cycles** for one result. The circuit had the answer at its first tick, because the adder, subtractor and multiplier were all working in parallel. The price is **area**: the circuit contains all three operators permanently, while the CPU reuses one.",
      },
      {
        kind: "question",
        title: "Ten results",
        body: "The toy CPU takes 6 cycles per result. How many cycles does it take to compute the expression for **10 different sets of inputs**, one after the other?",
        question: { type: "number", answer: 60, tolerance: 0, unit: "cycles", hint: "6 cycles per result, 10 results." },
        explanation: "6 × 10 = **60 cycles**. A circuit like this one needs 1 clock cycle per result, so 10 cycles. Its clock period would be longer than the CPU's (the multiplier is slow), but you still win by a wide margin. That is why chips use dedicated hardware for jobs done millions of times, such as video decoding.",
      },
      {
        kind: "explain",
        title: "Line order does not matter",
        body: P(
          "In Verilog, a line like `assign s = a + b;` does not mean \"calculate a + b now\". It means **\"s is always a + b\"**: a permanent connection, like soldering a wire. Every `assign` exists all the time, so the order you write them in changes nothing.",
          "The module below has two such lines. `d` depends on `s`, yet `s` is written first only by habit. Try it: cut the `assign d` line and paste it above the `assign s` line. The waveform stays identical.",
          "That is the first big change in mindset: in software, swapping two lines usually changes the result. In a hardware description, a swap of two independent connections changes nothing, because you are describing a *structure*, not a sequence.",
        ),
        widget: {
          type: "chip-verilog",
          props: {
            code: ORDER_CODE,
            title: "Two wires, in either order",
            stimulus: { steps: [{ a: 1, b: 2 }, { a: 5, b: 5 }, { a: 9, b: 7 }, { a: 15, b: 1 }] },
          },
        },
      },
      {
        kind: "question",
        title: "Swap the lines",
        body: "Prove it to yourself. The target waveform below is the one for the original design.",
        widget: { type: "chip-verilog", props: { code: ORDER_CODE, title: "Reorder the two assigns" } },
        question: {
          type: "widget",
          goal: {
            stimulus: { steps: [{ a: 1, b: 2 }, { a: 5, b: 5 }, { a: 9, b: 7 }, { a: 15, b: 1 }] },
            expect: { s: [3, 10, 0, 0], d: [2, 9, 15, 15] },
            mustContain: ["assign\\s+d\\b[\\s\\S]*assign\\s+s\\b"],
            solution: `module order(input [3:0] a, input [3:0] b, output [3:0] s, output [3:0] d);
  assign d = s - 1;
  assign s = a + b;
endmodule`,
          },
          prompt: "Edit the code so the `assign d` line comes first and `assign s` second, and the waveform still matches the target.",
          hint: "Cut the `assign d = s - 1;` line and paste it above `assign s = a + b;`. Don't change anything else.",
        },
        explanation: "The waveform is identical. Notice that `s` is a 4-bit result, so 9 + 7 = 16 wraps to 0, and `d` = 0 − 1 wraps to 15. The numbers in hardware have a fixed width. We come back to this in lesson 3.",
      },
      {
        kind: "explain",
        title: "Registers and the clock; pipelining",
        body: P(
          "A circuit made only of `assign`-style logic is called **combinational**: its outputs depend only on its current inputs. To remember anything you need a **register** (a bank of flip-flops) that captures its input on each rising edge of the **clock**, a signal that ticks regularly. Lesson 4 writes these in Verilog; \"Digital logic from transistors\" explains what is inside them.",
          "The clock period has to be long enough for the slowest path between registers. In the toy numbers of the widget, the slowest path of **(a + b) × (c − d)** is the subtractor followed by the multiplier: 1.2 + 3.0 = 4.2 ns, plus 0.4 ns for the register's clock-to-output delay and 0.2 ns of setup time, so the clock period is at least **4.8 ns**.",
          "**Pipelining** puts a register in the middle of the path so each half is shorter. Here the period drops to **3.6 ns**. The price: the answer now takes 2 clock cycles to appear (**latency**: delay from input to output), but a new answer comes out **every cycle** (**throughput**: results per second). The lesson \"Pipelining: an assembly line for instructions\" in the CPU module shows the same trade-off.",
          txt(`
                  clock period   latency          throughput
no pipeline       4.8 ns         1 cycle = 4.8 ns   1 result / 4.8 ns
with pipeline     3.6 ns         2 cycles = 7.2 ns  1 result / 3.6 ns
`),
        ),
      },
      {
        kind: "question",
        title: "Pipeline it",
        body: "Turn on the pipelined option and clock the circuit enough times to see the answers stream out.",
        widget: { type: "chip-hwsw", props: { preset: "mulsub", pipelined: false } },
        question: {
          type: "widget",
          goal: { pipelined: true, minTicks: 3 },
          prompt: "Switch to the pipelined circuit and press Step at least 3 times (or use Stream).",
          hint: "Look for the Pipelined switch near the buttons, then press Step three times.",
        },
        explanation: "After the first tick the output register still holds nothing useful; after the second, the first result is out. From then on a result appears **every** cycle. The widget's delays are made-up toy numbers.",
      },
      {
        kind: "question",
        title: "Latency in nanoseconds",
        body: "The pipelined circuit has a clock period of **3.6 ns** and takes **2 clock cycles** from input to output. What is its latency?",
        question: { type: "number", answer: 7.2, tolerance: 0.05, unit: "ns", hint: "Latency = number of cycles × clock period." },
        explanation: "2 × 3.6 = **7.2 ns**, which is *worse* than the 4.8 ns of the unpipelined version. But throughput is better: 1000 / 3.6 ≈ 278 million results per second versus 1000 / 4.8 ≈ 208 million. Pipelining trades latency for throughput.",
      },
      {
        kind: "question",
        title: "Reading an assign",
        body: "What does the Verilog line `assign y = a & b;` describe?",
        question: {
          type: "choice",
          options: [
            "Compute a & b once, when the simulator reaches this line, and store the result in y",
            "Compute a & b every time the clock ticks",
            "A step in a program that runs before the next line",
            "An AND gate whose output y always follows a and b, whatever order the lines are in",
          ],
          answer: 3,
          hint: "Think wire and gate, not instruction.",
          feedback: {
            0: "That is how a software assignment behaves. An `assign` is a standing connection, not a one-off calculation.",
            1: "There is no clock in this line, so it is purely combinational: y follows a and b after a gate delay.",
            2: "Hardware descriptions have no \"before\" and \"after\" between independent lines; they all exist at once.",
          },
        },
        explanation: "An `assign` is a **continuous assignment**: the right-hand side is always driving the left-hand side. A synthesis tool turns it into real gates. Clocked behaviour comes from registers, which lesson 4 covers.",
      },
      {
        kind: "recap",
        points: [
          "Software is a sequence of instructions on a processor. Hardware is a **circuit**: everything exists and works **at the same time**.",
          "An `assign` is a **permanent connection**, so line order doesn't matter. **Registers** change only at clock edges, and the **clock period** must cover the slowest path between registers.",
          "**Pipelining** adds registers to shorten the period: **throughput** rises, **latency** can get slightly worse. Dedicated hardware beats a CPU on repetitive work at the cost of area.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 3. Verilog basics ───────────────────────────────
  {
    id: "fnd-chip-3-verilog-basics",
    title: "Verilog basics: modules, ports and assign",
    summary: "Write combinational circuits: modules and ports, vectors, number literals, operators, concatenation, a mux and an adder you edit until the waveform matches.",
    minutes: 11,
    xp: 60,
    level: "Intermediate",
    steps: [
      {
        kind: "explain",
        title: "A module is a box with ports",
        body: P(
          "The unit of design in Verilog is the **module**: a box with named connection points called **ports**. Each port is an `input` or an `output`. Inside the box you describe what drives the outputs.",
          txt(`
module gates(input a, input b, output y_and, output y_or, output y_xor);
  assign y_and = a & b;     // & is AND
  assign y_or  = a | b;     // | is OR
  assign y_xor = a ^ b;     // ^ is XOR
endmodule
`),
          "- A **`wire`** is a connection that carries a value; outputs driven by `assign` are wires.\n- **`assign`** drives a wire continuously from an expression (lesson 2).\n- Comments start with `//`. Every statement ends with `;`, and the module ends with `endmodule`.",
          "Edit the code below if you like (change `^` to `~^` for XNOR) and watch the waveform. This is a **toy simulator**: it runs a small subset of Verilog, which the panel under the code lists.",
        ),
        widget: {
          type: "chip-verilog",
          props: {
            code: `module gates(input a, input b, output y_and, output y_or, output y_xor);
  assign y_and = a & b;     // & is AND
  assign y_or  = a | b;     // | is OR
  assign y_xor = a ^ b;     // ^ is XOR
endmodule`,
            stimulus: { steps: [{ a: 0, b: 0 }, { a: 0, b: 1 }, { a: 1, b: 0 }, { a: 1, b: 1 }] },
          },
        },
      },
      {
        kind: "explain",
        title: "Vectors and number literals",
        body: P(
          "A group of related wires is a **vector** (also called a bus). `[3:0]` means four bits numbered 3 down to 0, where bit 3 is the most significant: `input [3:0] a`.",
          "Numbers written in code carry a **width** and a **base**: `width'base value`. `4'b1010` is four bits, binary, 1010 (decimal 10). `4'd10` is the same value in decimal, `8'hA5` is 8 bits in hexadecimal (A = 10, so 10 × 16 + 5). A plain number like `5` has no stated width, which is fine in `a + 5` but not inside `{ }` braces.",
          txt(`
literal     width  base         value (decimal)
4'b1010     4      binary       10
4'd10       4      decimal      10
8'hFF       8      hexadecimal  255
1'b1        1      binary       1
`),
        ),
      },
      {
        kind: "question",
        title: "Read a literal",
        body: "What is the decimal value of the literal `8'hA5`?",
        question: { type: "number", answer: 165, tolerance: 0, hint: "Hex digit A is 10. Compute 10 × 16 + 5." },
        explanation: "`A5` in hex is 10 × 16 + 5 = **165**. In binary that is `1010 0101`: each hex digit is exactly four bits, which is why hardware engineers like hex.",
      },
      {
        kind: "explain",
        title: "Operators, selects and concatenation",
        body: P(
          "Verilog has the usual operators: arithmetic `+ - *`, comparison `== != < >`, bitwise `& | ^ ~`, shifts `<< >>` and the **conditional** `cond ? x : y` (\"if cond then x else y\", which becomes a **multiplexer** in hardware).",
          "Two special tools for vectors:\n- a **select** picks bits: `a[2]` is one bit, `a[1:0]` is the low two bits.\n- **concatenation** `{ x, y }` glues vectors together, left part first (most significant).",
          "The widget glues `a[1:0]`, all of `b` and the literal `2'b01` into an 8-bit `y`, and reverses the bits of `a` into `z`. With a = 5 (0101) and b = 3 (0011): y = 01 0011 01 = 77.",
        ),
        widget: {
          type: "chip-verilog",
          props: {
            code: `module cat(input [3:0] a, input [3:0] b, output [7:0] y, output [3:0] z);
  assign y = {a[1:0], b, 2'b01};          // 2 + 4 + 2 = 8 bits
  assign z = {a[0], a[1], a[2], a[3]};    // a with its bits reversed
endmodule`,
            stimulus: { steps: [{ a: 5, b: 3 }, { a: 10, b: 15 }, { a: 1, b: 0 }] },
            radix: "bin",
          },
        },
      },
      {
        kind: "question",
        title: "Finish the multiplexer",
        body: "A **2:1 multiplexer** (mux) passes one of its two data inputs to the output, chosen by a select input. The module below is unfinished: it always outputs `a`. Make it output **b when sel is 1** and **a when sel is 0**.",
        widget: {
          type: "chip-verilog",
          props: {
            code: `module mux2(input [3:0] a, input [3:0] b, input sel, output [3:0] y);
  // y should be b when sel is 1, otherwise a
  assign y = a;
endmodule`,
            title: "Fix the mux",
          },
        },
        question: {
          type: "widget",
          goal: {
            stimulus: MUX_GOAL_STIM,
            expect: { y: [3, 12, 9, 2] },
            solution: `module mux2(input [3:0] a, input [3:0] b, input sel, output [3:0] y);
  assign y = sel ? b : a;
endmodule`,
          },
          prompt: "Edit the `assign` so the waveform matches the target.",
          hint: "Use the conditional operator: `sel ? (value when 1) : (value when 0)`.",
        },
        explanation: "`assign y = sel ? b : a;` is the one-line mux. The synthesis tool picks a mux cell from the library; lesson 6 shows how it chooses.",
      },
      {
        kind: "question",
        title: "An adder with carry",
        body: "A 4-bit adder adds `a`, `b` and a carry-in `cin`, and produces a 4-bit `sum` plus a carry-out `cout`. Right now `cout` is stuck at 0. Make `{cout, sum}` hold the **5-bit** result (the \"From gates to an adder\" lesson in the CPU module builds this from gates).",
        widget: {
          type: "chip-verilog",
          props: {
            code: `module fa(input [3:0] a, input [3:0] b, input cin, output [3:0] sum, output cout);
  assign sum = a + b + cin;
  assign cout = 1'b0;   // TODO: this should be the carry out
endmodule`,
            title: "Add the carry out",
          },
        },
        question: {
          type: "widget",
          goal: {
            stimulus: { steps: [{ a: 3, b: 4, cin: 0 }, { a: 15, b: 1, cin: 0 }, { a: 15, b: 15, cin: 1 }, { a: 8, b: 8, cin: 0 }, { a: 7, b: 8, cin: 1 }] },
            expect: { sum: [7, 0, 15, 0, 0], cout: [0, 1, 1, 1, 1] },
            solution: `module fa(input [3:0] a, input [3:0] b, input cin, output [3:0] sum, output cout);
  assign {cout, sum} = a + b + cin;
endmodule`,
          },
          prompt: "Edit the code so the sum and carry-out match the target for all five input sets.",
          hint: "Replace both assigns with one: put `{cout, sum}` on the left, so the 5-bit result is split into the carry and the 4 sum bits.",
        },
        explanation: "`assign {cout, sum} = a + b + cin;` works because the addition is carried out at the width of the left side (5 bits), so the carry is not lost. With just `sum` on the left the same addition would be cut to 4 bits, and the carry would vanish.",
      },
      {
        kind: "question",
        title: "Wraparound",
        body: "In a design `assign y = a + b;` where `y` is a **4-bit** output, a = 13 and b = 7. What value does y hold?",
        question: { type: "number", answer: 4, tolerance: 0, hint: "13 + 7 = 20, but 4 bits only count 0 to 15. Take the remainder after dividing by 16." },
        explanation: "20 does not fit in 4 bits (maximum 15), so only the low four bits survive: 20 mod 16 = **4** (`10100` → `0100`). Hardware numbers have a fixed width, and the top bit is silently dropped. Capture it, as `cout` did, or make the result wider.",
      },
      {
        kind: "question",
        title: "Find the error",
        body: "The 3-input AND below has two mistakes. The simulator reports them in plain words, so read what it says. Fix the code so `y` is 1 only when all of `a`, `b` and `c` are 1.",
        widget: {
          type: "chip-verilog",
          props: {
            code: `module and3(input a, input b, input c, output y);
  assign y = a & b & cc
endmodule`,
            title: "Read the error messages",
          },
        },
        question: {
          type: "widget",
          goal: {
            stimulus: { steps: [0, 1, 2, 3, 4, 5, 6, 7].map((n) => ({ a: (n >> 2) & 1, b: (n >> 1) & 1, c: n & 1 })) },
            expect: { y: [0, 0, 0, 0, 0, 0, 0, 1] },
            solution: `module and3(input a, input b, input c, output y);
  assign y = a & b & c;
endmodule`,
          },
          prompt: "Fix both errors so the waveform shows y = 1 only on the last input combination.",
          hint: "One message is about a missing `;`. The other about a name that was never declared: look at the ports.",
        },
        explanation: "Two classics: a **missing semicolon** and a **misspelled signal** (`cc` instead of `c`). Real tools report the same kinds of error, usually less politely. A tip for later: always compile your design before you simulate.",
      },
      {
        kind: "question",
        title: "Declaring a bus",
        body: "Which line declares an **8-bit** wire called `data`?",
        question: {
          type: "choice",
          options: [
            "wire data[8];",
            "wire [8:0] data;",
            "wire [7:0] data;",
            "wire data = 8'b0;",
          ],
          answer: 2,
          hint: "Bits are numbered from 0, so eight bits go from 7 down to 0.",
          feedback: {
            0: "That isn't how a vector's width is written in Verilog; the range goes before the name.",
            1: "`[8:0]` is nine bits: bits 8, 7, 6, 5, 4, 3, 2, 1 and 0.",
            3: "That declares a one-bit wire driven by an 8-bit constant, not an 8-bit bus.",
          },
        },
        explanation: "`[7:0]` is the range of bit numbers, so the width is 7 − 0 + 1 = 8. Off-by-one in widths is among the most common beginner bugs.",
      },
      {
        kind: "recap",
        points: [
          "A **module** has **ports** (`input`, `output`); `assign` drives a wire continuously from an expression. Statements end with `;`.",
          "A **vector** `[3:0]` has 4 bits. A literal is `width'base value` (`4'b1010`, `8'hA5`). Use `{a, b}` to concatenate and `a[1:0]` to select bits.",
          "`cond ? x : y` is a **mux**; `assign {cout, sum} = a + b + cin;` keeps the carry. A result wider than its target loses its top bits (wraparound).",
          "Read error messages: missing semicolons and misspelled names are the first things to check.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 4. Sequential logic ───────────────────────────────
  {
    id: "fnd-chip-4-sequential-verilog",
    title: "Sequential logic: always @(posedge clk)",
    summary: "Describe registers, counters and a small state machine with always @(posedge clk), and see why clocked code uses non-blocking assignments.",
    minutes: 11,
    xp: 60,
    level: "Intermediate",
    steps: [
      {
        kind: "explain",
        title: "A register in Verilog",
        body: P(
          "Combinational logic has no memory. To remember a value you need a **flip-flop**, which captures its input on a clock edge (\"Digital logic from transistors\" builds one from gates, so we won't redo that here). In Verilog you write one with an **`always` block** triggered by the clock:",
          txt(`
reg [3:0] q;
always @(posedge clk)      // whenever clk goes from 0 to 1
  q <= d;                  // q takes the value d had at that edge
`),
          "- **`reg`** (or `output reg`) declares a signal that is assigned inside an `always` block. It does not always mean a physical register: it is just Verilog's name for \"assigned in a procedural block\".\n- **`@(posedge clk)`** means \"on every rising edge of clk\".\n- **`<=`** is the **non-blocking assignment**, the one to use for clocked logic (more on it soon).",
          "Below is a register with a reset: while `rst` is 1 at an edge, q goes to 0. Everything inside the `always` block happens only at the edge; between edges q holds. In the waveform, q follows d one edge at a time.",
          "A real simulator starts every `reg` at an unknown value `x` until it is reset or assigned; this toy starts them at 0.",
        ),
        widget: {
          type: "chip-verilog",
          props: {
            code: `module reg4(input clk, input rst, input [3:0] d, output reg [3:0] q);
  always @(posedge clk) begin
    if (rst) q <= 4'd0;
    else q <= d;
  end
endmodule`,
            stimulus: { clock: "clk", steps: [{ rst: 0, d: 3 }, { d: 5 }, { d: 5 }, { d: 9 }, { rst: 1, d: 2 }, { rst: 0, d: 2 }, { d: 7 }] },
          },
        },
      },
      {
        kind: "question",
        title: "Add an enable",
        body: "The counter below counts up on every clock edge unless `rst` is 1. Add an **enable**: it should count only when `en` is 1 and hold its value when `en` is 0. Reset must still win over everything.",
        widget: {
          type: "chip-verilog",
          props: {
            code: `module counter(input clk, input rst, input en, output reg [3:0] q);
  always @(posedge clk) begin
    if (rst) q <= 4'd0;
    else q <= q + 1;
  end
endmodule`,
            title: "Counter: add the enable",
          },
        },
        question: {
          type: "widget",
          goal: {
            stimulus: { clock: "clk", steps: [{ rst: 1, en: 0 }, { rst: 0, en: 1 }, { en: 1 }, { en: 0 }, { en: 0 }, { en: 1 }, { rst: 1 }, { rst: 0 }] },
            expect: { q: [0, 1, 2, 2, 2, 3, 0, 1] },
            mustContain: ["<="],
            solution: COUNTER_RTL,
          },
          prompt: "Edit the code so q matches the target: it holds when en is 0, and reset still takes priority. Keep using `<=`.",
          hint: "Add a second branch: `else if (en) q <= q + 1;`. Reset is checked first, so it keeps priority.",
        },
        explanation: "The order of the `if` branches is the **priority**: reset first, then enable, otherwise q keeps its value (no branch fires, so the flip-flop holds). At the second-to-last edge both `rst` and `en` are 1 and q goes to 0: reset wins because it is tested first.",
      },
      {
        kind: "explain",
        title: "Blocking vs non-blocking",
        body: P(
          "Verilog has two kinds of assignment inside `always` blocks:",
          "- **blocking `=`**: takes effect **immediately**, and the next statement sees the new value (like most programming languages).\n- **non-blocking `<=`**: reads every right-hand side first, then updates **all left-hand sides together at the end of the time step**.",
          "The second one matches how real flip-flops behave: on a clock edge they all sample their inputs at once and change together. A **swap** shows it. On `load` the two registers get `da` and `db`; afterwards each cycle should swap them: `a <= b; b <= a;`.",
          "The waveform on top uses `<=`: a and b swap every cycle (3, 5, 3, 5). The one underneath is the same circuit written with blocking `=`.",
        ),
        widget: {
          type: "chip-verilog",
          props: {
            code: `module swap(input clk, input load, input [3:0] da, input [3:0] db, output reg [3:0] a, output reg [3:0] b);
  always @(posedge clk) begin
    if (load) begin
      a <= da;
      b <= db;
    end else begin
      a <= b;     // both right-hand sides are read first,
      b <= a;     // then both registers update together
    end
  end
endmodule`,
            stimulus: { clock: "clk", steps: [{ load: 1, da: 3, db: 5 }, { load: 0 }, { load: 0 }, { load: 0 }] },
            compare: {
              label: "The same, with blocking = instead of <=",
              code: `module swap(input clk, input load, input [3:0] da, input [3:0] db, output reg [3:0] a, output reg [3:0] b);
  always @(posedge clk) begin
    if (load) begin
      a = da;
      b = db;
    end else begin
      a = b;
      b = a;
    end
  end
endmodule`,
            },
          },
        },
      },
      {
        kind: "question",
        title: "Why did it break?",
        body: "In the blocking version, after the first swap both a and b show **5**. Why?",
        question: {
          type: "choice",
          options: [
            "Blocking assignments are not allowed inside always blocks",
            "`a = b;` changed a straight away, so `b = a;` then copied the new a (which was already 5)",
            "The registers need a reset before they can swap",
            "The simulator cannot swap two values",
          ],
          answer: 1,
          hint: "Follow the two lines in order, remembering that `=` updates the left side at once.",
          feedback: {
            0: "They are allowed; that's exactly why this bug is easy to write. The tool may only warn you.",
            2: "A reset isn't the issue: the load already put 3 and 5 in the registers.",
            3: "The non-blocking version swaps fine, so the design idea works.",
          },
        },
        explanation: "With `=`: `a = b` makes a equal to 5 immediately, then `b = a` copies that new 5 into b. Both are 5, and the old a (3) is lost. With `<=` both right-hand sides are read **before** either register changes, so they trade values. The rule of thumb: **`<=` in clocked blocks, `=` in combinational `always @*` blocks**.",
      },
      {
        kind: "question",
        title: "Which assignment where",
        body: "Which pairing follows the standard coding rule?",
        question: {
          type: "choice",
          options: [
            "Use `<=` in `always @(posedge clk)` blocks, `=` in combinational `always @*` blocks",
            "Use `=` everywhere because it is faster to simulate",
            "Use `<=` in combinational blocks and `=` in clocked blocks",
            "Mix them freely: the tool picks the right one",
          ],
          answer: 0,
          hint: "Flip-flops all sample at once, which is what the non-blocking assignment imitates.",
          feedback: {
            1: "Speed isn't the reason either kind exists. Using `=` for registers can give wrong results, as the swap showed.",
            2: "It is the other way round: this pairing invites races between flip-flops and confusing combinational results.",
            3: "The tool doesn't pick. Mixing in one block also causes subtle simulation-versus-hardware mismatches.",
          },
        },
        explanation: "`always @*` is a **combinational** block: it re-runs whenever any input changes, and `=` gives the plain top-to-bottom behaviour you want for logic. For flip-flops, `<=` models simultaneous sampling. Good tools (and this toy) warn when you break the rule.",
      },
      {
        kind: "explain",
        title: "A state machine",
        body: P(
          "A **finite state machine (FSM)** is a register holding the current **state**, plus logic that picks the next state from the current state and the inputs. \"Digital logic from transistors\" introduces the idea; here is how it looks in Verilog.",
          "This one watches a stream of bits `x` and raises `z` when it has just seen **1, 0, 1**. The states are `localparam` constants (named values), and a `case` statement lists what happens in each state:",
          txt(`
state   meaning                   x=0   x=1
S0      nothing useful yet        S0    S1
S1      last input was 1          S2    S1
S2      last two were 1,0         S0    S3
S3      last three were 1,0,1     S2    S1      (z = 1 here)
`),
          "z depends only on the state, so this is a **Moore** machine. The input pattern 1,0,1,1,0,1,0,0 contains two 1,0,1 sequences; z should pulse twice. Press Run and match the states and z to the table.",
        ),
        widget: {
          type: "chip-verilog",
          props: {
            code: FSM_CODE("state <= x ? S3 : S0;"),
            stimulus: { clock: "clk", steps: [1, 0, 1, 1, 0, 1, 0, 0].map((x) => ({ rst: 0, x })) },
            radix: "dec",
          },
        },
      },
      {
        kind: "question",
        title: "Fix the state machine",
        body: "This copy of the machine has a bug in state **S2** (\"last two inputs were 1, 0\"): it always goes back to S0. It should go to **S3** if x is 1, and to S0 if x is 0, so z can pulse.",
        widget: {
          type: "chip-verilog",
          props: { code: FSM_CODE("state <= S0;"), title: "Fix the S2 branch" },
        },
        question: {
          type: "widget",
          goal: {
            stimulus: { clock: "clk", steps: [1, 0, 1, 1, 0, 1, 0, 0].map((x) => ({ rst: 0, x })) },
            expect: { state: [1, 2, 3, 1, 2, 3, 2, 0], z: [0, 0, 1, 0, 0, 1, 0, 0] },
            mustContain: ["<="],
            solution: FSM_CODE("state <= x ? S3 : S0;"),
          },
          prompt: "Edit the S2 line so the state sequence and z match the target.",
          hint: "Copy the style of the S0 line: `state <= x ? (state if x is 1) : (state if x is 0);`.",
        },
        explanation: "S2 is the \"1, 0 seen\" state, so a 1 completes the pattern (go to S3) and a 0 breaks it (go back to S0). This is how most control logic in chips is written: a state register, a `case` on it and `<=` for the next state.",
      },
      {
        kind: "question",
        title: "Overlapping patterns",
        body: "The machine above feeds S3 back to S2 on x = 0, so overlapping patterns count. Reset it, then feed the bits **1, 0, 1, 0, 1**. How many times does z pulse high (in separate clock cycles)?",
        question: { type: "number", answer: 2, tolerance: 0, hint: "Track the state after each bit: S0 → S1 → S2 → S3 → (x=0) → S2 → (x=1) → ?" },
        explanation: "States after each bit: S1, S2, S3 (z=1), S2, S3 (z=1). The middle 1 is shared by both patterns, **1 0 1** at positions 1–3 and 3–5, so z pulses **twice**. Whether a design should allow overlap is a decision you write into the spec, not something the code settles by itself.",
      },
      {
        kind: "recap",
        points: [
          "`always @(posedge clk)` describes logic that updates only on the rising clock edge: that is a **flip-flop** (a `reg` is just a signal assigned in an always block).",
          "Use **`<=`** (non-blocking: read all right-hand sides, update together) in clocked blocks and **`=`** (blocking: immediate) in combinational `always @*`. Swapping two registers shows why.",
          "Priority in an `if / else if` chain matters: reset first, then enable, otherwise the register holds.",
          "An **FSM** is a state register plus `case` logic with named `localparam` states. Moore: outputs from the state alone.",
          "The toy starts registers at 0; real simulators start them at `x` until reset, so real designs reset their registers explicitly.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 5. Testbenches and simulation ───────────────────────────────
  {
    id: "fnd-chip-5-testbenches",
    title: "Testbenches and simulation",
    summary: "Drive inputs, check outputs against a reference model, and hunt for a planted bug that the obvious test cannot see.",
    minutes: 12,
    xp: 60,
    level: "Intermediate",
    steps: [
      {
        kind: "explain",
        title: "The testbench: a circuit's test harness",
        body: P(
          "A design on its own does nothing: it needs inputs. A **testbench** is a second piece of Verilog that wraps the **design under test (DUT)**, drives its inputs with **stimulus**, and checks its outputs. A testbench is never built into a chip: it exists only inside the simulator.",
          "That is why it may use constructs the toy here does not run. A real testbench for the adder from lesson 3 looks like this:",
          txt(`
module tb;
  reg  [3:0] a, b;  reg cin;
  wire [3:0] sum;   wire cout;
  adder4 dut(.a(a), .b(b), .cin(cin), .sum(sum), .cout(cout));   // the DUT

  initial begin                     // runs once, at the start of simulation
    a = 4'd3;  b = 4'd4;  cin = 1'b0;
    #10;                            // wait 10 time units
    if (sum !== 4'd7 || cout !== 1'b0) $display("FAIL: 3 + 4");
    a = 4'd15; b = 4'd1;
    #10;
    if (sum !== 4'd0 || cout !== 1'b1) $display("FAIL: 15 + 1");
    $finish;                        // end the simulation
  end
endmodule
`),
          "`initial`, delays like `#10`, and system tasks like `$display` and `$finish` exist **only for simulation**. A synthesis tool can't turn them into gates (and most ASIC flows ignore or reject them), which is fine because the testbench never leaves the simulator. The `!==` operator compares including unknown `x` values, so an uninitialised output fails instead of slipping through.",
          "Real simulators you can try yourself include **Icarus Verilog** and **Verilator** (both open source), plus commercial ones. **cocotb** lets you write the testbench in Python instead. The toy below takes a simpler route: you supply a table of input vectors, and it compares the DUT with a built-in reference model.",
        ),
      },
      {
        kind: "question",
        title: "Simulation only",
        body: "Which of these constructs exist **only for simulation**, meaning a design that has to become gates can't use them? Pick all that apply.",
        question: {
          type: "choice",
          options: [
            "`assign y = a & b;`",
            "`$display(\"sum=%d\", sum);`",
            "`#10;` (wait 10 time units)",
            "`initial begin ... end`",
            "`always @(posedge clk) q <= d;`",
          ],
          answer: [1, 2, 3],
          hint: "Ask: could a gate or a flip-flop do this? A circuit has no notion of printing text or waiting a number of time units.",
          feedback: {
            0: "This is a plain AND gate: synthesisable.",
            4: "This is a flip-flop, the bread and butter of synthesisable RTL.",
          },
        },
        explanation: "`$display` prints text, `#10` waits in simulated time and `initial` runs once at time zero: none of them describes hardware. (One footnote: some FPGA flows read `initial` to set power-up values, but most ASIC flows ignore it, so never rely on it.)",
      },
      {
        kind: "explain",
        title: "A self-checking test",
        body: P(
          "Staring at waveforms does not scale. A **self-checking** testbench compares every output with the right answer from a **reference model** (also called a golden model): a simple, obviously-correct description of what the design should do, often written in a software language.",
          "The widget below holds a correct 4-bit adder. Each row of the table is one **test vector**: values for `a`, `b` and `cin`. Add a few vectors (try **Add vector** and **Add 5 random**), press **Run tests**, and see each row marked PASS or FAIL against the reference.",
          "All rows pass here, but a passing test only tells you about the vectors you actually tried. That is the whole difficulty of testing.",
        ),
        widget: { type: "chip-testbench", props: { dut: ADDER_GOOD, model: "adder4", title: "A correct adder", seed: 3 } },
      },
      {
        kind: "question",
        title: "Catch the mux bug",
        body: "This 2:1 mux has a **bug planted in it**. The reference model says y = b when sel is 1, otherwise a. Build test vectors until at least one **fails**. The default all-zero vector will not do it.",
        widget: { type: "chip-testbench", props: { dut: MUX_BUGGY, model: "mux2", title: "Mux with a bug", seed: 5 } },
        question: {
          type: "widget",
          goal: { minFailures: 1 },
          prompt: "Add test vectors and press Run tests until at least one row fails.",
          hint: "Read the code: when does `pick_b` become 1? Try a vector where sel is 1 and b is smaller than a.",
        },
        explanation: "The bug is in `pick_b = sel & (b >= a)`: with sel = 1 but **b < a**, the mux wrongly returns a. The all-zero vector (a = b) hides it, and so do all vectors with sel = 0. Only the combination *sel = 1 and a > b* exposes it. That corner is about a quarter of the input space, so random vectors find it quickly, but a short hand-picked list may not.",
      },
      {
        kind: "question",
        title: "Directed or random?",
        body: "Testers mix **directed** tests (hand-picked vectors for cases you thought of: zero, maximum, boundaries) with **random** vectors. What is the main reason to add random ones?",
        question: {
          type: "choice",
          options: [
            "Random vectors are guaranteed to cover every case",
            "They are always faster to simulate than directed ones",
            "Random tests don't need a reference model",
            "They reach combinations you didn't think of, which is where unexpected bugs hide",
          ],
          answer: 3,
          hint: "Your directed list is limited by what you thought of; the bug you haven't imagined isn't on it.",
          feedback: {
            0: "Nothing random guarantees full coverage: that's the topic of lesson 9 (coverage).",
            1: "Speed isn't the issue. Both kinds cost about the same simulation time per vector.",
            2: "Random tests need a reference model even more: you can't eyeball thousands of results.",
          },
        },
        explanation: "Directed tests check what you expect to matter; random tests probe what you didn't think of. Big projects use **constrained-random** stimulus (random, but within legal ranges) plus coverage measurement to know what the random vectors reached. The reference model is what makes thousands of random vectors usable.",
      },
      {
        kind: "question",
        title: "Catch the carry bug",
        body: "Here is an adder with a planted bug. Its **sum** is right, but something is wrong with **cout**. Find a vector that exposes it. All-zero and simple small-number vectors won't.",
        widget: { type: "chip-testbench", props: { dut: ADDER_BUGGY, model: "adder4", title: "Adder with a bug", seed: 2 } },
        question: {
          type: "widget",
          goal: { minFailures: 1 },
          prompt: "Add vectors and run the tests until at least one fails.",
          hint: "Read how `cout` is computed: which input does it leave out? Then ask when that input is the one that tips the sum over 15.",
        },
        explanation: "`cout` is taken from `a + b` and ignores `cin`. It is only wrong when `a + b` is **exactly 15** and `cin` is 1: the carry-in then pushes the total to 16. Out of 512 input combinations only 16 expose it, so a random test usually misses it, but a designer who asks \"where does the carry-in matter?\" finds it at once. Directed corner cases and random vectors complement each other.",
      },
      {
        kind: "question",
        title: "Fix it, then re-run",
        body: "You have found the mux bug. Now fix it in the code below so the waveform matches what the **reference model** says (y = b when sel is 1, else a), including the case that used to fail.",
        widget: { type: "chip-verilog", props: { code: MUX_BUGGY, title: "Fix the buggy mux" } },
        question: {
          type: "widget",
          goal: {
            stimulus: MUX_GOAL_STIM,
            expect: { y: [3, 12, 9, 2] },
            solution: `module mux2(input [3:0] a, input [3:0] b, input sel, output [3:0] y);
  assign y = sel ? b : a;
endmodule`,
          },
          prompt: "Edit the mux so y matches the target on all four vectors.",
          hint: "Drop the extra comparison: the select alone should decide.",
        },
        explanation: "Debugging is a loop: a failing test points to a vector, the vector points to a line, you fix the line, and you re-run **all** the tests (a fix can break something else, so keep the old tests). Keeping every vector that ever caught a bug is called a **regression suite**.",
      },
      {
        kind: "code",
        title: "A reference model in Python",
        body: P(
          "Reference models are often written in a software language because that is quick and easy to get right. Write `golden_adder4(a, b, cin)` for the 4-bit adder: it returns a tuple `(sum, cout)` where `sum` is the 4-bit result (0 to 15) and `cout` is 1 if the full sum is 16 or more, otherwise 0.",
        ),
        language: "python",
        starter: `def golden_adder4(a, b, cin):
    # total = a + b + cin ; sum is the low 4 bits, cout is the carry out
    return (0, 0)
`,
        solution: `def golden_adder4(a, b, cin):
    total = a + b + cin
    return (total & 15, total >> 4)
`,
        tests: [
          { id: "small", description: "3 + 4 + 0 = (7, 0)", assertionCode: `r = golden_adder4(3, 4, 0)\nassert r == (7, 0), f"expected (7, 0), got {r}"` },
          { id: "carry", description: "15 + 1 + 0 = (0, 1)", assertionCode: `r = golden_adder4(15, 1, 0)\nassert r == (0, 1), f"expected (0, 1), got {r}"` },
          { id: "cin", description: "7 + 8 + 1 = (0, 1): the carry-in tips it over", assertionCode: `r = golden_adder4(7, 8, 1)\nassert r == (0, 1), f"expected (0, 1), got {r}"` },
          { id: "max", description: "15 + 15 + 1 = (15, 1)", assertionCode: `r = golden_adder4(15, 15, 1)\nassert r == (15, 1), f"expected (15, 1), got {r}"` },
        ],
        hints: ["Add all three inputs first: total = a + b + cin.", "The low 4 bits are total & 15 (or total % 16). The carry is total // 16 (or total >> 4)."],
      },
      {
        kind: "recap",
        points: [
          "A **testbench** drives a **DUT** with stimulus and checks its outputs. It never becomes hardware, so it may use `initial`, `#` delays, `$display` and `$finish`, all simulation-only.",
          "A **self-checking** testbench compares outputs with a **reference model**, which is often software, so thousands of vectors can run without anyone reading a waveform.",
          "A passing test proves nothing about vectors you didn't try. Bugs live in **corners**: here, `sel = 1` with `a > b`, and `a + b = 15` with `cin = 1`.",
          "Mix **directed** corner tests with **random** vectors, and keep every vector that once caught a bug (a regression suite). Real tools: Icarus Verilog, Verilator, cocotb (Python).",
        ],
      },
    ],
  },
];
