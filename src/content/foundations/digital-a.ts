import type { ConceptLesson } from "../../learn/types.ts";

/** Paragraphs joined with blank lines. */
const P = (...paras: string[]) => paras.join("\n\n");

/** Lessons 1 to 4 of "Digital logic from transistors": the switch, CMOS gates, combinational blocks, latches and flip-flops. */
export const digitalLessonsA: ConceptLesson[] = [
  // ─────────────────────────────── 1. From switch to gate ───────────────────────────────
  {
    id: "fnd-digi-1-switch-to-gate",
    title: "From switch to gate",
    summary: "A transistor as a switch, and how a PMOS and an NMOS together make the CMOS inverter, the building block of every chip.",
    level: "Beginner",
    minutes: 8,
    xp: 45,
    steps: [
      {
        kind: "explain",
        title: "A switch with no moving parts",
        body: P(
          "In the bits lessons, a logic gate was a box: bits in, a bit out. This module opens the box. Everything inside is built from one tiny part, the **transistor**.",
          "For digital logic, treat a transistor as a **switch controlled by a voltage**. A voltage on one terminal, the **gate**, decides whether current can flow between the other two. Nothing moves, nothing wears out, and it can flip billions of times a second.",
          "There are two kinds. An **NMOS** transistor conducts when its gate is **high** (a 1). A **PMOS** transistor does the opposite: it conducts when its gate is **low** (a 0). *How* a gate voltage opens a channel in silicon is the story of the lesson *The MOSFET: a switch made of silicon* in the Semiconductors part. Here we only need the switch behaviour.",
          "Stack one PMOS over one NMOS, tie their gates together, and you have the simplest gate: the **inverter** (the NOT gate from *Logic gates*). Flip the input and see which transistor is on.",
        ),
        widget: { type: "digi-inverter", props: { mode: "switch" } },
      },
      {
        kind: "question",
        title: "Input high",
        body: "The input of the inverter is **high** (1). Which transistor conducts, and what is the output?",
        widget: { type: "digi-inverter", props: { mode: "switch" }, live: true },
        question: {
          type: "choice",
          options: ["The PMOS conducts, so the output is 1", "The NMOS conducts, so the output is 0", "Both conduct, so the output is 0", "Neither conducts, so the output floats"],
          answer: 1,
          hint: "An NMOS conducts when its gate is high. Which rail does it connect the output to?",
          feedback: {
            0: "A PMOS needs a LOW gate to conduct. With the input high it is off, so it cannot pull the output up.",
            2: "Only briefly, in the middle of switching. With a clean high input exactly one transistor is on.",
            3: "One of the two is always on when the input is a clean 0 or 1, so the output is always driven.",
          },
        },
        explanation: "A high input turns the NMOS **on** and the PMOS **off**. The NMOS connects the output to ground, so the output is **0**. A low input does the reverse. That is exactly what NOT means, built from two switches.",
      },
      {
        kind: "explain",
        title: "Why two transistors?",
        body: P(
          "Why not one transistor and a resistor? The transistor would pull the output down, the resistor would pull it up, and whenever the transistor was on, current would flow through the resistor to ground. Constant waste and heat.",
          "**CMOS** (*complementary* MOS) uses a PMOS to pull **up** and an NMOS to pull **down**, and arranges that **exactly one is on at a time**. The output is always firmly connected to either the supply (called **VDD**, the 1 level) or ground (0 V), and no steady current can flow from one to the other.",
          "Now use the slider to move the input slowly through the middle. A real input is never perfect: it takes a moment to cross from 0 to 1, and in that moment something interesting happens.",
        ),
        widget: { type: "digi-inverter", props: { mode: "ramp" } },
      },
      {
        kind: "question",
        title: "Both on at once",
        body: "Use the slider to find an input voltage where **both** transistors are on at the same time.",
        widget: { type: "digi-inverter", props: { mode: "ramp" } },
        question: { type: "widget", goal: { shoot: true }, hint: "The NMOS turns on above about 0.7 V and the PMOS turns off above about 2.6 V. Pick a voltage between those." },
        explanation: "Between the two thresholds both switches conduct, so for a moment current flows straight from VDD to ground. The input crosses that zone in picoseconds, so the burst is tiny, but a chip does it billions of times a second in billions of gates. Cleanly held at 0 or 1, though, a CMOS gate passes no current.",
      },
      {
        kind: "question",
        title: "Holding a 1",
        body: "A CMOS inverter has held its output at 1 for a whole minute. Ignoring tiny leakage currents, how much current flows from the supply?",
        question: {
          type: "choice",
          options: ["Essentially none", "A steady current, as long as the output is 1", "A steady current, as long as the output is 0", "Half the maximum, because one transistor is always on"],
          answer: 0,
          hint: "Look at the stack: is there ever a closed path from VDD to ground when the input is steady?",
          feedback: {
            1: "The PMOS is on, but the NMOS below it is off, so the path to ground is broken. Nothing flows.",
            2: "With the output at 0 the NMOS is on, but the PMOS above it is off, so the path to VDD is broken.",
            3: "One transistor is on, yes, but the other is off, so the stack is open somewhere. Zero is not half of anything.",
          },
        },
        explanation: "With a steady input one of the two transistors is always off, so the path from VDD to ground is never complete. Apart from a tiny **leakage** current (which grows as transistors shrink), a CMOS gate uses power **only while it switches**. That one property is why billions of transistors can fit in a phone.",
      },
      {
        kind: "explain",
        title: "Power is spent on changing",
        body: P(
          "What *does* use power? The output drives a **load**: the wire and the gate inputs it connects to. Electrically that load acts like a tiny capacitor (see *Capacitors* in the Analog module). Every time the output rises, the PMOS charges that capacitance from the supply. Every fall throws the charge away to ground.",
          "So power depends on how often the node switches: **P ≈ α · C · V² · f**. C is the load capacitance, V the supply voltage, f the clock frequency, and **α** the **activity factor**: the fraction of clock cycles in which the node rises. A node that rises every cycle (like the clock itself) has α = 1; a quiet one has α near 0. Small extras like shoot-through and leakage come on top.",
          "Two consequences you can feel: a CPU runs hot when busy and cool when idle, and **lowering the voltage helps a great deal**, because V is squared.",
        ),
      },
      {
        kind: "question",
        title: "A tiny power bill",
        body: "One node has a load of **5 fF** (5 × 10⁻¹⁵ F), a supply of **1.0 V**, and rises once every cycle (α = 1) of a **1 GHz** clock. What is P = α · C · V² · f, in **microwatts**?",
        question: { type: "number", answer: 5, tolerance: 0.05, unit: "µW", hint: "Multiply C, V squared and f. Femto is 10⁻¹⁵ and giga is 10⁹, so the powers of ten combine to 10⁻⁶." },
        explanation: "P = 1 × 5×10⁻¹⁵ F × (1.0 V)² × 10⁹ Hz = 5×10⁻⁶ W = **5 µW**. Tiny for one node, but a chip has hundreds of millions of them. And halving V to 0.5 V would cut this to a quarter, 1.25 µW.",
      },
      {
        kind: "question",
        title: "What happens, in order",
        body: "The input of an inverter rises from 0 to 1. Put the events in the order they happen.",
        question: {
          type: "order",
          items: [
            "The input rises past the NMOS threshold",
            "The NMOS turns on and the PMOS turns off (for a moment both conduct)",
            "The output's load capacitance discharges through the NMOS",
            "The output settles at 0 and the current stops",
          ],
          hint: "Start with the cause (the input), then the switches, then the load, then the quiet end state.",
        },
        explanation: "The input crosses the NMOS threshold, the pair swaps roles, the load capacitance drains through the NMOS (that discharge current is the power spent), and once the output sits at 0 V nothing flows any more.",
      },
      {
        kind: "recap",
        points: [
          "For logic, a transistor is a **voltage-controlled switch**: an **NMOS** conducts when its gate is high, a **PMOS** when its gate is low.",
          "A **CMOS inverter** is a PMOS (pull-up to VDD) over an NMOS (pull-down to ground) with joined gates. Exactly one is on, so the output is always driven.",
          "With a steady input no current flows from the supply to ground (only tiny leakage). Both conduct briefly while the input crosses the middle.",
          "Power is spent on switching: **P ≈ α · C · V² · f**. Lower the voltage, the frequency, or the activity and the power falls.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 2. CMOS gates ───────────────────────────────
  {
    id: "fnd-digi-2-cmos-gates",
    title: "CMOS gates: NAND and NOR",
    summary: "Build NAND and NOR from series and parallel transistors, avoid short circuits, and see why NAND alone can build every gate.",
    level: "Beginner",
    minutes: 9,
    xp: 50,
    steps: [
      {
        kind: "explain",
        title: "Two inputs, two networks",
        body: P(
          "To make a gate with two inputs, split the inverter's two switches into two **networks**: a **pull-up network** of PMOS transistors between VDD and the output, and a **pull-down network** of NMOS transistors between the output and ground.",
          "In each network the two transistors can be wired **in series** (one after the other: current needs *both* to be on) or **in parallel** (side by side: *either* one is enough). Remember that a PMOS is on for a low input and an NMOS is on for a high input.",
          "The widget shows the NAND choice: pull-up in parallel, pull-down in series. Flip A and B, and read the truth table below the picture: the output is 0 only when *both* inputs are 1.",
        ),
        widget: { type: "digi-cmos-gate", props: { pu: "parallel", pd: "series" } },
      },
      {
        kind: "question",
        title: "Build a NOR",
        body: "A **NOR** gate is an OR followed by a NOT: its output is 1 only when **both** inputs are 0. Change the two networks so the widget shows a **NOR**.",
        widget: { type: "digi-cmos-gate", props: { pu: "parallel", pd: "series" } },
        question: { type: "widget", goal: { name: "NOR" }, hint: "NOR is the mirror image of NAND. Swap which network is in series and which is in parallel." },
        explanation: "NOR is NAND turned upside down: the PMOS pull-up goes in **series** (both inputs must be 0 to connect the output to VDD) and the NMOS pull-down goes in **parallel** (either input being 1 connects the output to ground). The two networks are always duals of each other.",
      },
      {
        kind: "question",
        title: "Never wire it like this",
        body: "Put **both** networks in **parallel**, then try the four input rows. What goes wrong?",
        widget: { type: "digi-cmos-gate", props: { pu: "parallel", pd: "parallel" }, live: true },
        question: {
          type: "choice",
          options: ["The output floats whenever A = B = 1", "Nothing: it is a perfectly good XOR gate", "For A ≠ B both networks conduct: a short circuit from VDD to ground", "The output is always 0"],
          answer: 2,
          hint: "Check the row A = 0, B = 1. Is one PMOS on? Is one NMOS on?",
          feedback: {
            0: "At A = B = 1 both NMOS are on and both PMOS are off, so the output is pulled low firmly, not floating.",
            1: "XOR needs no short circuits. Look at the rows A ≠ B: both networks conduct there.",
            3: "Not always: for A = B = 0 only the pull-up conducts, and the output is 1.",
          },
        },
        explanation: "When A ≠ B one PMOS and one NMOS are both on, with nothing in series to stop it: a direct path from VDD to ground. A real gate would burn power and might fail. The rule for a valid static CMOS gate: for **every** input row, **exactly one** network conducts. Parallel + parallel breaks the first half, series + series breaks the second (the output floats).",
      },
      {
        kind: "explain",
        title: "NAND can build everything",
        body: P(
          "Here is a remarkable fact: **NAND is universal**. With NAND gates alone you can build NOT, AND, OR, XOR, and so every other logic function, the adder from *From gates to an adder* included. (NOR is universal too.)",
          "How? Tie both inputs of a NAND together and it becomes a **NOT**: NAND(A, A) = NOT A. Then AND is a NAND followed by that NOT. OR follows from De Morgan's law: A OR B = NOT(NOT A AND NOT B) = NAND(NOT A, NOT B).",
          "Pick a gate below and see it built from NANDs. Flip the inputs: lit wires carry a 1.",
        ),
        widget: { type: "digi-nand-net", props: { mode: "not", pick: true } },
      },
      {
        kind: "question",
        title: "Count the NANDs",
        body: "The classic XOR built only from NAND gates takes how many NAND gates? (Pick **XOR** in the widget to see it.)",
        widget: { type: "digi-nand-net", props: { mode: "xor", pick: true }, live: true },
        question: { type: "number", answer: 4, tolerance: 0, hint: "Count the boxes in the XOR drawing. One of them takes A and B first; two more combine each input with that result." },
        explanation: "**Four**: n1 = NAND(A, B), then n2 = NAND(A, n1) and n3 = NAND(B, n1), and finally n4 = NAND(n2, n3). Real designs often use XOR cells directly, but the point is that the single NAND cell is enough, which is why early chip designers and chip libraries love it.",
      },
      {
        kind: "question",
        title: "Why NAND, not AND?",
        body: "A CMOS NAND gate takes 4 transistors. A CMOS AND gate takes 6. Why?",
        question: {
          type: "choice",
          options: ["AND needs a bigger voltage", "AND is a NAND followed by an inverter, and CMOS stages are naturally inverting", "AND has three inputs inside", "NAND is slower, so it needs fewer transistors"],
          answer: 1,
          hint: "Look at the pull-up and pull-down networks: when an input rises, which way does the output move?",
          feedback: {
            0: "The supply is the same for every gate. The difference is in how many stages it has.",
            2: "Both gates have two inputs. The extra transistors are an extra stage, not an extra input.",
            3: "Fewer transistors does not mean slower here. The gates differ in structure, not in who is faster.",
          },
        },
        explanation: "A CMOS stage is **inverting**: a rising input can only pull the output down. So the cheapest gates are the inverting ones (NOT, NAND, NOR) and AND/OR are built as NAND/NOR plus an inverter: 4 + 2 = 6 transistors.",
      },
      {
        kind: "code",
        title: "XOR from nothing but NAND",
        body: P(
          "`nand(a, b)` is given. Write `xor_gate(a, b)` using **only calls to `nand`**, with the four-gate layout you just saw: `n1 = nand(a, b)`, `n2 = nand(a, n1)`, `n3 = nand(b, n1)`, then `nand(n2, n3)`.",
        ),
        language: "python",
        starter: `def nand(a, b):
    return 0 if (a and b) else 1

def xor_gate(a, b):
    # use only nand() calls, no ^, &, | or not
    return None
`,
        solution: `def nand(a, b):
    return 0 if (a and b) else 1

def xor_gate(a, b):
    n1 = nand(a, b)
    n2 = nand(a, n1)
    n3 = nand(b, n1)
    return nand(n2, n3)
`,
        tests: [
          { id: "zero", description: "0 XOR 0 = 0", assertionCode: `assert xor_gate(0, 0) == 0, f"0 XOR 0 should be 0, got {xor_gate(0, 0)}"` },
          { id: "one", description: "0 XOR 1 and 1 XOR 0 are 1", assertionCode: `assert xor_gate(0, 1) == 1 and xor_gate(1, 0) == 1, "XOR is 1 when the inputs differ"` },
          { id: "both", description: "1 XOR 1 = 0", assertionCode: `assert xor_gate(1, 1) == 0, f"1 XOR 1 should be 0, got {xor_gate(1, 1)}"` },
          { id: "four", description: "Uses exactly four NAND gates", assertionCode: `calls = []\nreal = nand\ndef nand(a, b):\n    calls.append(1)\n    return real(a, b)\nxor_gate(1, 0)\nassert len(calls) == 4, f"expected 4 nand() calls, got {len(calls)}"` },
        ],
        hints: ["The first gate takes a and b. The next two each take one original input and the first gate's result.", "The last gate combines the outputs of the two middle gates."],
      },
      {
        kind: "recap",
        points: [
          "A static CMOS gate has a **pull-up** network of PMOS and a **pull-down** network of NMOS that are **duals**: series in one is parallel in the other.",
          "**NAND**: pull-up parallel, pull-down series. **NOR**: pull-up series, pull-down parallel. In every input row exactly one network must conduct.",
          "Both conducting is a **short circuit**; neither conducting leaves the output **floating**. Both are design errors.",
          "**NAND is universal**: NOT, AND, OR and XOR are all built from NAND alone. CMOS stages are naturally inverting, which is why NAND and NOR are cheaper than AND and OR.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 3. Combinational building blocks ───────────────────────────────
  {
    id: "fnd-digi-3-building-blocks",
    title: "Multiplexers, decoders and lookup tables",
    summary: "The standard combinational blocks: multiplexers, decoders and priority encoders, and how any truth table fits in a multiplexer.",
    level: "Intermediate",
    minutes: 9,
    xp: 55,
    steps: [
      {
        kind: "explain",
        title: "Choosing one of many",
        body: P(
          "A circuit is **combinational** when its outputs depend only on its inputs *right now*: no memory, no clock. The adders in *From gates to an adder* are combinational. So are the blocks in this lesson, which appear inside every chip.",
          "A **multiplexer** (mux) picks one of several data inputs and passes it to the output. A few **select** inputs, read as a binary number, say which one. With 2 select bits the mux has 4 data inputs (S1 S0 = 10 is binary 2, so it passes D2). A mux is a digital rotary switch.",
          "Flip the data and select inputs to see it work.",
        ),
        widget: { type: "digi-mux", props: { mode: "mux" } },
      },
      {
        kind: "question",
        title: "Route D3 to the output",
        body: "Set the multiplexer so the output is **1** while **D3** is the selected input.",
        widget: { type: "digi-mux", props: { mode: "mux" } },
        question: { type: "widget", goal: { mode: "mux", sel: 3, out: 1 }, hint: "Select 3 is binary 11. Then make sure D3 itself is 1." },
        explanation: "S1 S0 = 11 is 3, so the mux passes D3, and D3 must be 1 for the output to be 1. Inside, a mux is just AND gates (one per input, enabled by the select code) feeding an OR.",
      },
      {
        kind: "explain",
        title: "Decoders: a number becomes a wire",
        body: P(
          "A **decoder** does the opposite job of counting: it turns a binary number on its inputs into **one active wire** out of many (a **one-hot** code). Two address bits give 4 outputs, three give 8. An **enable** input forces every output to 0.",
          "Decoders select things: *which* memory row to open, *which* chip on a bus to listen to, which register to write. Memory chips use one to pick which row to open (see *Inside a memory chip*).",
        ),
        widget: { type: "digi-mux", props: { mode: "decoder", bits: 3 } },
      },
      {
        kind: "question",
        title: "Address bits",
        body: "A memory has **16** rows, and a decoder must pick exactly one of them. How many address bits does the decoder need?",
        question: { type: "number", answer: 4, tolerance: 0, hint: "n address bits give 2ⁿ outputs. Which n gives 16?" },
        explanation: "2⁴ = 16, so **4** address bits. Each extra bit doubles the number of outputs, which is why a decoder for a memory with a million rows needs only 20 address bits (2²⁰ ≈ 10⁶).",
      },
      {
        kind: "explain",
        title: "Encoders and priority",
        body: P(
          "An **encoder** goes the other way: it turns \"which wire is active\" into a binary number. The catch is what to do when *several* inputs are active at once. A **priority encoder** has a rule: the highest-numbered active input wins. It also needs a **valid** flag, because code 0 could mean \"input 0 is active\" *or* \"nothing is active\".",
          "Interrupt controllers use this: many devices raise their hand, and the encoder reports the most urgent one (see *Input, output and interrupts* in the Inside the computer lessons).",
        ),
        widget: { type: "digi-mux", props: { mode: "encoder" } },
      },
      {
        kind: "question",
        title: "Make the code 2",
        body: "Raise some request lines so the priority encoder outputs the code **2** with a valid flag of 1.",
        widget: { type: "digi-mux", props: { mode: "encoder" } },
        question: { type: "widget", goal: { mode: "encoder", code: 2, valid: 1 }, hint: "Code 2 means the highest active line is I2. So I3 must stay low." },
        explanation: "The highest request wins, so I2 must be the top one raised: I3 low, I2 high. Lines below it (I1, I0) may be high or low, and the answer is still 2. That is what \"priority\" means.",
      },
      {
        kind: "explain",
        title: "Any truth table is a multiplexer",
        body: P(
          "Wire a mux's **data inputs to constants** (0s and 1s) and its **select inputs** become the function's inputs. The mux then just looks up the answer: the data inputs *are* the output column of a truth table. This is a **lookup table** (LUT). Any function of 3 inputs fits in an 8-input mux with 8 stored bits.",
          "FPGAs (chips you can reprogram) are made largely of small LUTs, each with a few inputs, wired together by programmable connections. \"Reprogramming\" rewrites the stored bits.",
          "Below, A, B and C pick a row, and each row's output bit is yours to set. Remember the full adder: its **sum** bit is 1 when an odd number of inputs is 1.",
        ),
        widget: { type: "digi-mux", props: { mode: "lut" } },
      },
      {
        kind: "question",
        title: "Program the sum bit",
        body: "Fill in the truth table so the output is the **sum bit of a full adder**: A XOR B XOR C, which is 1 when an **odd number** of A, B, C are 1.",
        widget: { type: "digi-mux", props: { mode: "lut" } },
        question: { type: "widget", goal: { mode: "lut", table: 150 }, hint: "The rows with exactly one 1 (001, 010, 100) and the row with three 1s (111) should output 1. The rest output 0." },
        explanation: "Rows 001, 010, 100 and 111 get a 1; the other four get 0. Read as a number with row 000 as the lowest bit, that is 150. The **carry** bit (1 when two or more inputs are 1) would be rows 011, 101, 110, 111: the number 232. Two 8-bit LUTs make a full adder.",
      },
      {
        kind: "code",
        title: "A decoder in code",
        body: P(
          "Write `decode(address, outputs)` that returns a **list** of `outputs` values: all 0 except a 1 at position `address`. For example `decode(2, 4)` is `[0, 0, 1, 0]`.",
        ),
        language: "python",
        starter: `def decode(address, outputs):
    # return a list with a single 1 at position 'address'
    return None
`,
        solution: `def decode(address, outputs):
    return [1 if i == address else 0 for i in range(outputs)]
`,
        tests: [
          { id: "two", description: "decode(2, 4) is [0, 0, 1, 0]", assertionCode: `assert decode(2, 4) == [0, 0, 1, 0], f"got {decode(2, 4)}"` },
          { id: "zero", description: "decode(0, 8) has the 1 first", assertionCode: `assert decode(0, 8) == [1, 0, 0, 0, 0, 0, 0, 0], f"got {decode(0, 8)}"` },
          { id: "one-hot", description: "Exactly one output is 1 for every address", assertionCode: `for a in range(8):\n    out = decode(a, 8)\n    assert sum(out) == 1 and out[a] == 1, f"address {a} gave {out}"` },
        ],
        hints: ["Build a list with one entry for each output.", "An entry is 1 when its position equals the address, else 0."],
      },
      {
        kind: "recap",
        points: [
          "**Combinational** logic has no memory: outputs depend only on the current inputs.",
          "A **multiplexer** passes one of many data inputs, chosen by the select inputs; a **decoder** turns a binary number into one active wire (one-hot); a **priority encoder** turns \"which wires are active\" into a number, the highest winning.",
          "Any truth table fits in a multiplexer with constant data inputs: a **lookup table**, the building block of FPGAs.",
          "With n select or address bits you reach 2ⁿ inputs or outputs.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 4. Remembering a bit ───────────────────────────────
  {
    id: "fnd-digi-4-latches-flipflops",
    title: "Remembering a bit",
    summary: "Feedback makes memory: the SR latch, the D latch, and the edge-triggered D flip-flop that clocked chips are built from.",
    level: "Intermediate",
    minutes: 10,
    xp: 60,
    steps: [
      {
        kind: "explain",
        title: "A loop that remembers",
        body: P(
          "Combinational gates forget everything the moment their inputs change. To **remember** a bit you need a loop: feed a gate's output back to an input so the circuit holds itself in one of two stable states.",
          "Cross-couple two NOR gates and you get the **SR latch**. Raise **S** (set) and the output **Q** becomes 1. Raise **R** (reset) and Q becomes 0. With both low it **holds** whatever it had, and that is the whole memory. (**Qn** is the opposite of Q, often written Q-bar.)",
          "The same two-gates-in-a-loop idea sits inside the SRAM cells from *Inside a memory chip*, where it is built from two cross-coupled inverters. Try it: set, hold, reset.",
        ),
        widget: { type: "digi-latch", props: { mode: "sr" } },
      },
      {
        kind: "question",
        title: "Store a 1",
        body: "Make the latch **store a 1**: set it, then lower **both** inputs so it must remember on its own.",
        widget: { type: "digi-latch", props: { mode: "sr" } },
        question: { type: "widget", goal: { mode: "sr", q: 1, s: 0, r: 0 }, hint: "Raise S so Q becomes 1, then flip S back down. Q should stay at 1 with S and R both low." },
        explanation: "After S falls back to 0, both inputs are low and the two gates keep each other in the state they were in: Q stays at 1. That is **hold** mode, a bit stored with no input at all (as long as the power stays on).",
      },
      {
        kind: "question",
        title: "The forbidden state",
        body: "Raise S **and** R together (S = R = 1), then lower them at the same time. What does the SR latch do?",
        widget: { type: "digi-latch", props: { mode: "sr" }, live: true },
        question: {
          type: "choice",
          options: ["It keeps the old value", "It goes to Q = 1", "It goes to Q = 0", "It ends up in an unpredictable state"],
          answer: 3,
          hint: "With S = R = 1 both outputs are forced low. When both inputs release together, both gates try to rise at once.",
          feedback: {
            0: "The old value was already overwritten when S = R = 1 forced both outputs to 0, so there is nothing to keep.",
            1: "Nothing favours 1. Both gates are symmetrical, so neither has a head start.",
            2: "Nothing favours 0 either. The outcome depends on tiny differences between the two gates.",
          },
        },
        explanation: "With S = R = 1 both outputs are 0 (so Q and Qn are no longer opposites). When both inputs drop together, the two gates race and whichever is a hair faster wins. The result is unpredictable, so designers treat S = R = 1 as **forbidden**. This is a first taste of the *metastability* idea in the last lesson of this module.",
      },
      {
        kind: "explain",
        title: "The D latch: one data input",
        body: P(
          "The forbidden state is awkward. The fix: a **D latch** has a single **data** input D and an **enable** input (here driven by the clock). Inside, a little logic turns D into a safe S and R pair, so the forbidden combination can never occur.",
          "While the enable is high the latch is **transparent**: Q simply follows D. When the enable falls, the latch **closes** and Q freezes at the last value. Raise the clock, change D, then lower the clock and watch the waveform.",
        ),
        widget: { type: "digi-latch", props: { mode: "dlatch" } },
      },
      {
        kind: "question",
        title: "Q follows D",
        body: "Raise the clock (CLK = 1), then change D while the clock is high. Watch the latch **follow** it.",
        widget: { type: "digi-latch", props: { mode: "dlatch" } },
        question: { type: "widget", goal: { mode: "dlatch", follow: true }, hint: "Tap CLK so it reads 1, then tap D. Q should change along with D." },
        explanation: "While the enable is high, every change of D passes straight through to Q. That is the latch's weakness: if Q feeds back into the logic that feeds D, a signal can race round the loop again and again in a single clock phase. We want each bit to be captured **once per clock tick**.",
      },
      {
        kind: "explain",
        title: "The flip-flop: capture at an edge",
        body: P(
          "The cure is the **edge-triggered D flip-flop**. It looks at D for just one instant, the **rising edge** of the clock (the change from 0 to 1), copies it to Q, and then ignores D until the next edge. In between, D can wobble all it likes.",
          "Inside, it is two D latches back to back with opposite enables, a **master** that is open while the clock is low and a **slave** that is open while it is high. Data can only pass through both at the moment the clock flips. (This level-versus-edge difference is why hardware descriptions say `always @(posedge clk)` for flip-flops. You will meet that in the chip-design module.)",
          "Compare them side by side with the same D and clock.",
        ),
        widget: { type: "digi-latch", props: { mode: "compare" } },
      },
      {
        kind: "question",
        title: "Make them disagree",
        body: "Get the **latch** and the **flip-flop** to hold **different** values at the same time.",
        widget: { type: "digi-latch", props: { mode: "compare" } },
        question: { type: "widget", goal: { mode: "compare", differ: true }, hint: "Give the clock a pulse so both capture D. Then raise the clock and change D while it is high: only one of the two follows." },
        explanation: "A rising edge makes both copy D. Then, with the clock **high** and D changed, the transparent latch follows D while the flip-flop (which only listens at the edge) keeps the old value. **Level-sensitive** (latch) versus **edge-triggered** (flip-flop): that is the whole difference.",
      },
      {
        kind: "question",
        title: "Which is which?",
        body: "Which statement about latches and flip-flops is correct?",
        question: {
          type: "choice",
          options: ["A flip-flop is transparent for the whole time the clock is high", "A latch only looks at D at the clock edge", "A flip-flop samples D at the clock edge and ignores it otherwise", "A flip-flop needs S and R inputs to be safe"],
          answer: 2,
          hint: "Think about the word edge. Which of the two looks at a single instant?",
          feedback: {
            0: "That describes a latch. A flip-flop is closed except at the edge.",
            1: "The other way round: a latch is transparent for a whole clock phase, a flip-flop looks at one instant.",
            3: "The D flip-flop has a single data input and no forbidden state. S and R belong to the SR latch.",
          },
        },
        explanation: "A **flip-flop** samples D on the clock edge (usually rising) and holds the result for a whole cycle. A **latch** is transparent for a whole clock *phase*. Registers, counters and almost every state element in a clocked chip use flip-flops, because one tick moves a bit exactly one step.",
      },
      {
        kind: "recap",
        points: [
          "**Feedback** makes memory: cross-coupled NOR gates hold a bit (the **SR latch**). S = R = 1 is forbidden, and releasing it can leave the latch in an unpredictable state.",
          "A **D latch** has one data input and an enable. It is **transparent** (Q follows D) while enabled and frozen otherwise: it is **level-sensitive**.",
          "An **edge-triggered D flip-flop** copies D to Q only on the clock's rising edge: two opposite-phase latches, a master and a slave.",
          "Clocked designs use flip-flops so every bit moves exactly one step per tick.",
        ],
      },
    ],
  },
];
