import type { ConceptLesson } from "../../learn/types.ts";

/** Paragraphs joined with blank lines. */
const P = (...paras: string[]) => paras.join("\n\n");

/** Lessons 5 to 8 of "Digital logic from transistors": registers and counters, state machines, timing, metastability. */
export const digitalLessonsB: ConceptLesson[] = [
  // ─────────────────────────────── 5. Registers and counters ───────────────────────────────
  {
    id: "fnd-digi-5-registers-counters",
    title: "Registers, shift registers and counters",
    summary: "Flip-flops sharing a clock become registers, shift registers and binary counters, and a counter is also a clock divider.",
    level: "Intermediate",
    minutes: 10,
    xp: 60,
    steps: [
      {
        kind: "explain",
        title: "A register is flip-flops with a shared clock",
        body: P(
          "One flip-flop stores one bit. Put several side by side, share one clock between them, and you have a **register**. A 4-bit register stores a 4-bit number; the CPU's registers (from *The datapath* lesson) are 32 or 64 flip-flops wide.",
          "A register also has a **load** (or enable) input. On each rising clock edge, if LOAD is 1 every flip-flop copies its own data input at the same instant; if LOAD is 0 each one keeps its old value. Between edges the data inputs can change freely.",
          "Set the data inputs, then give the clock a pulse.",
        ),
        widget: { type: "digi-seq", props: { mode: "reg", bits: 4 } },
      },
      {
        kind: "question",
        title: "Load a 6",
        body: "Set the data inputs to the number **6** (0110) and clock it into the register.",
        widget: { type: "digi-seq", props: { mode: "reg", bits: 4 } },
        question: { type: "widget", goal: { mode: "reg", value: 6 }, hint: "6 is 0110 in binary: D2 and D1 are 1, D3 and D0 are 0. Then press Clock pulse." },
        explanation: "The register only changes on the clock edge. Setting D to 0110 alone does nothing to Q: the new value is captured when the clock pulse arrives, all four bits at once.",
      },
      {
        kind: "question",
        title: "No clock, no change",
        body: "The LOAD input is 1 and the data inputs change, but no clock edge has arrived. What does the register hold?",
        question: {
          type: "choice",
          options: ["The new data, immediately", "A mix of old and new bits", "Nothing: it is cleared", "Its old value, until the next clock edge"],
          answer: 3,
          hint: "A flip-flop only looks at its input at one instant. Which instant?",
          feedback: {
            0: "That would be a transparent latch. Flip-flops only update at the clock edge.",
            1: "All flip-flops see the same edge at the same time, so the register changes all at once or not at all.",
            2: "Nothing clears it. The loop inside each flip-flop keeps holding the old value.",
          },
        },
        explanation: "Edge-triggered storage holds its value between clock edges, whatever D does. That is what lets the next stage of logic see a stable number for a whole clock period.",
      },
      {
        kind: "explain",
        title: "Shift registers: bits on a conveyor",
        body: P(
          "Wire each flip-flop's D input to its neighbour's Q and you have a **shift register**. On every clock edge the whole row moves one place and a new bit enters at one end. The bit pushed off the other end is lost.",
          "Shifting turns a stream of bits arriving one per tick into a whole word (**serial to parallel**), or the reverse. That is how serial links such as UART and SPI (see the Embedded module) put bytes on a wire one bit at a time.",
          "Here the new bit enters at the left and the row moves right. Toggle IN between pulses.",
        ),
        widget: { type: "digi-seq", props: { mode: "shift", bits: 4 } },
      },
      {
        kind: "question",
        title: "Load 1010 serially",
        body: "Using only the serial input and the clock, make the register read **1010** (the number 10). Think about which bit you send **first**.",
        widget: { type: "digi-seq", props: { mode: "shift", bits: 4 } },
        question: { type: "widget", goal: { mode: "shift", value: 10, minPulses: 4 }, hint: "Each new bit enters at the left and pushes the others right. The bit sent first ends up farthest right after four pulses." },
        explanation: "The first bit you send travels the whole row and ends at the **right-hand** (least significant) end. To get 1010 you send 0, 1, 0, 1 in that order: the last bit sent is the most significant. Serial links agree in advance whether they send the most or the least significant bit first.",
      },
      {
        kind: "question",
        title: "Shift right once",
        body: "An 8-bit shift register holds **00001100** (decimal 12). Shift it **right** one place with a 0 entering at the left. What decimal number is in it now?",
        question: { type: "number", answer: 6, tolerance: 0, hint: "The register becomes 00000110. Convert that to decimal." },
        explanation: "00000110 is **6**: shifting right by one place halves the number (for unsigned values), shifting left doubles it. This is the hardware behind the `>>` and `<<` operators, and why multiplying by powers of two is cheap.",
      },
      {
        kind: "explain",
        title: "Counters and clock dividers",
        body: P(
          "A **binary counter** is a register that adds 1 on every clock edge: its next-state logic is an incrementer. Look at the pattern 000, 001, 010, 011, 100…: bit 0 flips **every** clock, bit 1 flips every **second** clock, bit 2 every **fourth**. A bit flips when all the bits below it are 1.",
          "So each output is a slower copy of the clock: Q0 is the clock **divided by 2**, Q1 by **4**, Q2 by **8**. Each divide-by-2 stage has a clean 50% duty cycle. Counters like this build timers, set the speed of serial links, and produce slow clocks from a fast one.",
          "Run the 3-bit counter and watch the waveforms. (A **ripple** counter feeds each flip-flop's clock from the previous output, which is cheaper but lets delays pile up. This widget is the **synchronous** kind, where every flip-flop gets the same clock.)",
        ),
        widget: { type: "digi-seq", props: { mode: "count", bits: 3 } },
      },
      {
        kind: "question",
        title: "How fast is Q2?",
        body: "A 3-bit counter is clocked at **80 MHz**. How fast does its top output **Q2** run, in MHz? (The frequency of Q2 itself, one full period per cycle.)",
        widget: { type: "digi-seq", props: { mode: "count", bits: 3 }, live: true },
        question: { type: "number", answer: 10, tolerance: 0.01, unit: "MHz", hint: "Q2 completes one full cycle every 8 clock ticks." },
        explanation: "Q2 goes through a full high-and-low cycle once every 2³ = 8 clocks, so its frequency is 80 MHz ÷ 8 = **10 MHz**. An n-bit counter's top bit divides the clock by 2ⁿ.",
      },
      {
        kind: "code",
        title: "A counter in code",
        body: P(
          "Write `counter_step(bits)`. `bits` is a list of 0s and 1s with the **least significant bit first**, e.g. `[1, 1, 0]` is binary 011 = 3. Return the list after **one clock edge**: add 1, wrapping to all zeros after all ones.",
          "Do it the hardware way: a bit toggles when every bit below it is 1.",
        ),
        language: "python",
        starter: `def counter_step(bits):
    # bits[0] is the least significant bit
    # return the list after one clock edge
    return bits
`,
        solution: `def counter_step(bits):
    out = []
    carry = 1          # bit 0 always toggles
    for b in bits:
        out.append(b ^ carry)
        carry = carry & b
    return out
`,
        tests: [
          { id: "from-zero", description: "000 counts to 001", assertionCode: `assert counter_step([0, 0, 0]) == [1, 0, 0], f"got {counter_step([0, 0, 0])}"` },
          { id: "carry", description: "011 counts to 100", assertionCode: `assert counter_step([1, 1, 0]) == [0, 0, 1], f"got {counter_step([1, 1, 0])}"` },
          { id: "wrap", description: "111 wraps to 000", assertionCode: `assert counter_step([1, 1, 1]) == [0, 0, 0], f"got {counter_step([1, 1, 1])}"` },
          { id: "sequence", description: "Counts 0 to 7 in order", assertionCode: `bits = [0, 0, 0]\nvals = []\nfor _ in range(8):\n    vals.append(bits[0] + 2 * bits[1] + 4 * bits[2])\n    bits = counter_step(bits)\nassert vals == [0, 1, 2, 3, 4, 5, 6, 7], f"got {vals}"` },
        ],
        hints: ["Bit 0 always toggles, so start with carry = 1.", "A bit toggles when carry is 1. The carry passes up only if the current bit was 1."],
      },
      {
        kind: "recap",
        points: [
          "A **register** is flip-flops sharing a clock (and usually a load input). All bits change together, on the edge.",
          "A **shift register** moves bits one place per tick: serial to parallel and back. Shifting right halves, shifting left doubles.",
          "A **binary counter** adds 1 each clock: bit k toggles when all lower bits are 1, so output k is the clock divided by 2^(k+1).",
          "Hardware descriptions (Verilog) write all of these as `always @(posedge clk)`: you will see the same circuits again in the chip-design module.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 6. State machines ───────────────────────────────
  {
    id: "fnd-digi-6-state-machines",
    title: "State machines",
    summary: "A register plus next-state logic: traffic lights, a vending machine, and the difference between Moore and Mealy machines.",
    level: "Advanced",
    minutes: 11,
    xp: 75,
    steps: [
      {
        kind: "explain",
        title: "A machine that remembers where it is",
        body: P(
          "Most digital systems need to do *different things at different times*: a traffic light goes green, amber, red; a vending machine remembers the coins so far. They need **memory of the past**, and a rule for what to do next. That is a **finite state machine** (FSM).",
          "It has three parts: a **state register** (flip-flops holding which state we are in), **next-state logic** (combinational gates that compute the state to move to from the current state and the inputs) and **output logic**. On every clock edge the register loads the next state.",
          "A **state diagram** draws states as boxes and transitions as arrows labelled with the input that triggers them. Here is a traffic light. The input is a timer: \"done\" moves on, \"running\" stays put (that arrow is listed in the table, not drawn).",
        ),
        widget: { type: "digi-fsm", props: { machine: "traffic" } },
      },
      {
        kind: "question",
        title: "Get to east-west green",
        body: "Starting from N-S green, clock the machine until **E-W green** is the current state. (A \"timer done\" input is needed to move.)",
        widget: { type: "digi-fsm", props: { machine: "traffic" } },
        question: { type: "widget", goal: { machine: "traffic", state: "ew-go" }, hint: "Choose Timer done, then press Clock edge. It takes two moves from N-S green." },
        explanation: "N-S green → N-S amber → E-W green: two clock edges with \"timer done\". With \"timer running\" the machine stays where it is. Notice that the lights depend only on which state you are in: that is a **Moore** machine, defined in a moment.",
      },
      {
        kind: "explain",
        title: "From diagram to gates",
        body: P(
          "To build it, give each state a **binary code**. N states need ⌈log₂ N⌉ flip-flops: 4 states fit in 2 bits. With the codes 00, 01, 10, 11 in order, \"timer done\" simply adds 1 and wraps (a 2-bit counter from the last lesson), and \"timer running\" holds the value. The next-state logic is small enough to write as equations of the state bits and the input.",
          "Real designs choose encodings for speed or size. **One-hot** uses one flip-flop per state (only one is 1): more flip-flops, but the next-state logic is tiny and fast, which suits FPGAs. The process is always the same: **diagram → state table → encode → equations → gates**.",
        ),
      },
      {
        kind: "question",
        title: "Flip-flops needed",
        body: "A state machine has **5** states and is encoded in plain binary. How many flip-flops does the state register need?",
        question: { type: "number", answer: 3, tolerance: 0, hint: "Find the smallest n so that 2ⁿ is at least 5." },
        explanation: "2² = 4 is too few, 2³ = 8 is enough, so **3** flip-flops (three codes stay unused). With one-hot encoding the same machine would use 5.",
      },
      {
        kind: "explain",
        title: "A vending machine",
        body: P(
          "A drink costs **15¢**. The machine takes **nickels** (5¢) and **dimes** (10¢). Its state is the money inserted so far: 0¢, 5¢, 10¢, or **Pay** (15¢ or more), where it dispenses and then starts over.",
          "Notice what the states are for: they stand for *everything the machine needs to remember about the past*, no more. The history \"nickel then dime\" and \"dime then nickel\" lead to the same state, because the future is the same.",
          "Insert coins and clock the machine. The overpayment case (a dime at 10¢) is not refunded in this toy.",
        ),
        widget: { type: "digi-fsm", props: { machine: "vending" } },
      },
      {
        kind: "question",
        title: "Pay up",
        body: "Insert coins until the machine reaches the **Pay** state and dispenses.",
        widget: { type: "digi-fsm", props: { machine: "vending" } },
        question: { type: "widget", goal: { machine: "vending", dispensed: true }, hint: "Pick Nickel or Dime, press Clock edge, and repeat until the total reaches 15¢." },
        explanation: "Any combination reaching 15¢ works: three nickels, a nickel and a dime, a dime and a nickel, or two dimes. They differ only in the *path* through the diagram; the output depends on the state alone, so this is again a Moore machine.",
      },
      {
        kind: "explain",
        title: "Moore versus Mealy",
        body: P(
          "There are two ways to produce outputs. In a **Moore** machine the output depends **only on the state**. In a **Mealy** machine it depends on the state **and the current input**: the output is attached to the *arrows*.",
          "Try a **sequence detector** that raises its output when it has seen the bits **1, 0, 1**. The Mealy version needs three states and shows the output *in the same cycle* the last 1 arrives (the labels read input / output). The Moore version needs a fourth state, \"found\", and its output appears **one cycle later**, because the state has to change first.",
          "Feed it 1, 0, 1 with each machine and compare the \"output seen\" line.",
        ),
        widget: { type: "digi-fsm", props: { machine: "detect-mealy", pick: true } },
      },
      {
        kind: "question",
        title: "Which reacts first?",
        body: "A Mealy and a Moore detector are both given the bits 1, 0, 1. Which is true?",
        question: {
          type: "choice",
          options: ["The Moore output rises first, because it needs fewer states", "Both outputs rise in the same cycle, always", "The Mealy output can rise in the cycle where the last 1 is applied; the Moore output rises a cycle later", "Neither can detect overlapping sequences"],
          answer: 2,
          hint: "A Mealy output is a function of the state and the input right now. A Moore output has to wait for the state register to change.",
          feedback: {
            0: "The Moore detector actually has more states, and its output comes later, not earlier.",
            1: "They differ: the Mealy output reacts to the input directly, the Moore output only after the clock edge moves the state.",
            3: "Both versions here handle overlapping patterns like 10101, which contains 101 twice.",
          },
        },
        explanation: "Mealy: output = f(state, input), so it can respond in the same cycle (and may glitch if the input glitches). Moore: output = f(state), so it is cleaner and changes only on clock edges, at the price of an extra state and a one-cycle delay. Designers pick whichever suits the system.",
      },
      {
        kind: "code",
        title: "The vending machine's next state",
        body: P(
          "Write `next_state(state, coin)` for the vending machine. `state` is the money inserted so far: **0, 5, 10, or 15** (15 means *Pay*). `coin` is **0** (nothing), **5** or **10**.",
          "Rules: from 15 the machine always goes back to 0. Otherwise add the coin, but the total never goes above 15.",
        ),
        language: "python",
        starter: `def next_state(state, coin):
    # return the new state (0, 5, 10 or 15)
    return None
`,
        solution: `def next_state(state, coin):
    if state == 15:
        return 0
    return min(15, state + coin)
`,
        tests: [
          { id: "add", description: "0 and a nickel gives 5", assertionCode: `assert next_state(0, 5) == 5, f"got {next_state(0, 5)}"` },
          { id: "pay", description: "5 and a dime reach 15", assertionCode: `assert next_state(5, 10) == 15, f"got {next_state(5, 10)}"` },
          { id: "cap", description: "10 and a dime stays capped at 15", assertionCode: `assert next_state(10, 10) == 15, f"got {next_state(10, 10)}"` },
          { id: "reset", description: "From 15 it returns to 0", assertionCode: `assert next_state(15, 0) == 0 and next_state(15, 5) == 0, "Pay always goes back to 0"` },
          { id: "idle", description: "No coin keeps the state", assertionCode: `assert next_state(10, 0) == 10 and next_state(0, 0) == 0, "state should not change with no coin"` },
        ],
        hints: ["Handle the Pay state first: it always returns to 0.", "Otherwise the new state is the old state plus the coin, capped at 15 (use min)."],
      },
      {
        kind: "recap",
        points: [
          "A **finite state machine** is a **state register** plus **next-state logic** and **output logic**. Each clock edge loads the next state.",
          "States stand for what must be remembered about the past; N states need ⌈log₂ N⌉ flip-flops in binary encoding (or N in **one-hot**).",
          "**Moore**: outputs depend on the state only. **Mealy**: outputs depend on state and input, so they can react a cycle sooner and often need fewer states.",
          "The design path: diagram → state table → encoding → equations → gates (or, in practice, a hardware description language).",
        ],
      },
    ],
  },

  // ─────────────────────────────── 7. Timing ───────────────────────────────
  {
    id: "fnd-digi-7-timing",
    title: "Timing: how fast can the clock go?",
    summary: "Propagation delay, the critical path, setup and hold time, clock skew, and the formula for a circuit's maximum clock frequency.",
    level: "Advanced",
    minutes: 11,
    xp: 85,
    steps: [
      {
        kind: "explain",
        title: "Nothing is instant",
        body: P(
          "So far gates changed their outputs instantly. In reality every gate has a **propagation delay**: the time between an input change and the output following, tiny (tens of picoseconds in modern chips) but real. A flip-flop has one too: **clock-to-Q** (tcq), the time after the clock edge until Q shows the new value.",
          "Now take two flip-flops with logic between them. At the clock edge FF1 launches new data. It must travel through the gates and reach FF2 **before the next clock edge**, and early enough that FF2 can see it clearly: the **setup time** (tsu) is how long the data must be stable *before* the edge.",
          "The picture shows FF1, four gates and FF2. The data can take two routes; the slower one is the **critical path**. The bar chart underneath is one clock period. Slide the clock period and watch the **setup slack**: the spare time, which must stay positive.",
        ),
        widget: { type: "digi-timing", props: { skew: false } },
      },
      {
        kind: "question",
        title: "Find the limit",
        body: "Make the clock as **fast as possible** while setup is still met: slide the period down until the setup slack is just above zero.",
        widget: { type: "digi-timing", props: { skew: false } },
        question: { type: "widget", goal: { setupOk: true, maxPeriod: 1.65 }, hint: "The slack is the period minus (clock-to-Q + critical path + setup). Stop just before it turns negative." },
        explanation: "The shortest period that works is exactly the **sum of the delays on the slowest path**: clock-to-Q + critical path logic + setup. Any faster and the data arrives too late for FF2 to capture it reliably.",
      },
      {
        kind: "question",
        title: "The maximum clock",
        body: "A path has **tcq = 0.5 ns**, **logic delay = 1.2 ns** and **tsu = 0.3 ns** (no skew). The maximum clock frequency is 1 / (tcq + tlogic + tsu). What is it, in **MHz**?",
        question: { type: "number", answer: 500, tolerance: 1, unit: "MHz", hint: "Add the three delays to get the minimum period in ns, then take 1000 divided by that to get MHz." },
        explanation: "Period ≥ 0.5 + 1.2 + 0.3 = 2.0 ns, so fmax = 1 / 2.0 ns = **500 MHz**. (1 ns period is 1000 MHz, so divide 1000 by the period in nanoseconds.)",
      },
      {
        kind: "question",
        title: "Speed up the wrong path",
        body: "Open the gate delays and make gate **G3** (on the *short* path) much faster. Does the maximum clock frequency go up?",
        widget: { type: "digi-timing", props: { skew: false }, live: true },
        question: {
          type: "choice",
          options: ["Yes, every gate counts equally", "No: only the critical path sets the limit", "Yes, but only if the clock-to-Q also shrinks", "No: and the circuit would now fail setup"],
          answer: 1,
          hint: "Which route does the maximum frequency formula use: the longest or the shortest?",
          feedback: {
            0: "The formula uses the slowest path only. Making a path that already finishes early faster changes nothing about the limit.",
            2: "Clock-to-Q matters for every path, but the point here is which path sets the limit.",
            3: "A faster non-critical path cannot break setup; if anything, hold gets harder (next).",
          },
        },
        explanation: "Only the **critical path** limits the clock. Engineers speed up the circuit by shortening that path (a faster gate, splitting the logic over two clock cycles with a register, as in CPU **pipelining**), then find the next-slowest, and repeat. Speeding up other paths is wasted effort for frequency.",
      },
      {
        kind: "explain",
        title: "Hold time and clock skew",
        body: P(
          "There is a second danger. A flip-flop also needs its input to stay stable for a short time **after** the clock edge: the **hold time** (thold). The *new* data launched by the same edge must not arrive too early and overwrite the old value while FF2 is still looking at it. The fastest path is the one that matters here.",
          "Real clocks do not arrive everywhere at the same instant. **Clock skew** is the difference in arrival time between two flip-flops. If FF2's clock arrives **later** than FF1's, the data has extra time (setup gets easier) but the race for hold gets harder: hold slack = tcq + fastest path − thold − skew.",
          "Now the skew slider is on. Hold slack does not depend on the clock period at all. This is why a hold violation cannot be fixed by slowing the clock.",
        ),
        widget: { type: "digi-timing", props: { skew: true } },
      },
      {
        kind: "question",
        title: "Break hold, keep setup",
        body: "Use the skew slider to create a **hold violation** while **setup still passes**.",
        widget: { type: "digi-timing", props: { skew: true } },
        question: { type: "widget", goal: { setupOk: true, holdOk: false }, hint: "Slide the skew up (FF2's clock arrives later) until the hold slack turns negative. Setup gets easier as skew grows." },
        explanation: "A large positive skew gives setup extra time but lets the next data race through the fastest path before FF2 has finished holding the old value. Hold is a race that **no clock speed can win**.",
      },
      {
        kind: "question",
        title: "Fixing a hold violation",
        body: "A chip has been manufactured and one path has a hold violation. Slowing the clock does not help. What does?",
        question: {
          type: "choice",
          options: ["Slow the clock down even more", "Add delay (buffers) to the fast path, or reduce the skew", "Raise the supply voltage so the gates are faster", "Shorten the critical path"],
          answer: 1,
          hint: "Hold is a race between the new data and the clock edge. Which side do you need to slow down?",
          feedback: {
            0: "Hold slack does not depend on the clock period: it compares delays from the same edge. A slower clock changes nothing.",
            2: "Faster gates make the fast path faster, which makes hold worse, not better.",
            3: "That helps setup, not hold. Hold is about the shortest path being too fast.",
          },
        },
        explanation: "Hold fixes make the fast path **slower**: designers insert delay buffers on the short path, or rebalance the clock tree. Because it cannot be repaired by slowing the clock, a hold violation in a finished chip can make it useless, so design tools check hold on every path before tape-out (see *Static timing analysis* in the chip-design module).",
      },
      {
        kind: "code",
        title: "Maximum frequency",
        body: P(
          "Write `max_freq_mhz(tcq, tlogic, tsu)` where the delays are in **nanoseconds**. It returns the maximum clock frequency in **MHz**: 1000 divided by the total delay.",
        ),
        language: "python",
        starter: `def max_freq_mhz(tcq, tlogic, tsu):
    # delays in ns, result in MHz
    return 0
`,
        solution: `def max_freq_mhz(tcq, tlogic, tsu):
    return 1000 / (tcq + tlogic + tsu)
`,
        tests: [
          { id: "simple", description: "0.5 + 1.2 + 0.3 ns gives 500 MHz", assertionCode: `assert abs(max_freq_mhz(0.5, 1.2, 0.3) - 500) < 1e-6, f"got {max_freq_mhz(0.5, 1.2, 0.3)}"` },
          { id: "fast", description: "0.2 + 0.6 + 0.2 ns gives 1000 MHz", assertionCode: `assert abs(max_freq_mhz(0.2, 0.6, 0.2) - 1000) < 1e-6, f"got {max_freq_mhz(0.2, 0.6, 0.2)}"` },
          { id: "slow", description: "1 + 3 + 1 ns gives 200 MHz", assertionCode: `assert abs(max_freq_mhz(1, 3, 1) - 200) < 1e-6, f"got {max_freq_mhz(1, 3, 1)}"` },
        ],
        hints: ["Add the three delays to get the minimum period in ns.", "1 ns period is 1000 MHz, so the frequency in MHz is 1000 / period_ns."],
      },
      {
        kind: "recap",
        points: [
          "Every gate and flip-flop has a **delay**. The slowest path from flip-flop to flip-flop is the **critical path**.",
          "**Setup**: data must arrive at least tsu before the capture edge. So period ≥ tcq + tlogic + tsu (− skew), and fmax = 1 / that. Only the critical path matters.",
          "**Hold**: new data must not arrive within thold of the edge. It depends on the *fastest* path and skew, not on the clock period, so you fix it with extra delay, not a slower clock.",
          "**Skew** helps one check and hurts the other. Timing tools (static timing analysis) check every path of a chip for both.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 8. Metastability and clock domains ───────────────────────────────
  {
    id: "fnd-digi-8-metastability",
    title: "Metastability, synchronisers and debouncing",
    summary: "What happens when setup is violated, why it can only be made improbable, two-flop synchronisers, crossing clock domains, and cleaning up a bouncing button.",
    level: "Professional",
    minutes: 12,
    xp: 90,
    steps: [
      {
        kind: "explain",
        title: "When setup is violated",
        body: P(
          "The previous lesson assumed data changes only well away from the clock edge. But some signals come from *outside* the clock: a button press, another chip with its own clock, a sensor. They are **asynchronous**, and sooner or later one will change **inside the flip-flop's setup-and-hold window**.",
          "Then the flip-flop's internal loop is left balanced between 0 and 1, like a ball on top of a hill. It is **metastable**: its output may sit at an in-between voltage for a random time before it falls to 0 or 1, and nobody can say *which* it will pick or *when*.",
          "Slide the data edge across the clock edge. Outside the window the result is clean. Inside, clock it several times (the orange band) and look at how long the output hovers.",
        ),
        widget: { type: "digi-meta", props: {} },
      },
      {
        kind: "question",
        title: "Land in the window",
        body: "Place the data edge **inside the window** and clock it at least once so that the flip-flop goes metastable.",
        widget: { type: "digi-meta", props: {} },
        question: { type: "widget", goal: { inWindow: true, minMeta: 1 }, hint: "The window runs from about 0.3 ns before the clock edge to 0.1 ns after it. Put the slider there, then press Clock it." },
        explanation: "Inside the window the flip-flop cannot decide. The time it takes to resolve is random with an **exponential** tail: the chance of still hovering after time t falls as e^(−t/τ), where τ is a time constant of the circuit. It is never exactly zero, however long you wait.",
      },
      {
        kind: "explain",
        title: "Never zero, only improbable",
        body: P(
          "Metastability **cannot be eliminated**: any circuit that must choose between two values for an input that may change at any time can be caught undecided. What we *can* do is give it **time to settle** before anyone uses the output, which makes failure exponentially less likely.",
          "The standard recipe is a **two-flop synchroniser**: the asynchronous signal goes into a first flip-flop whose output is *not used for anything else*, then into a second. If the first one goes metastable, it usually settles during the clock period before the second samples it.",
          "Reliability is measured as **MTBF**, the mean time between failures: **MTBF = e^(t/τ) / (Tw · f_clk · f_data)**, where t is the settling time available, τ and Tw are properties of the flip-flop, and the two frequencies set how often an edge can land in the window. Try the stages and the clock speed. (The numbers are illustrative.)",
        ),
        widget: { type: "digi-mtbf", props: {} },
      },
      {
        kind: "question",
        title: "A century without failure",
        body: "At the starting setting (no synchroniser, a 1 GHz receiving clock, data changing 100 million times a second) the circuit fails about every fifth of a second. Choose a setting that gives an MTBF of **at least 100 years**. (Try two flops first and read the result.)",
        widget: { type: "digi-mtbf", props: {} },
        question: { type: "widget", goal: { minYears: 100 }, hint: "Each extra flop adds a whole clock period of settling time, and settling time sits in an exponent. A slower receiving clock also adds time." },
        explanation: "At 1 GHz two flops still fail about every day or two; a third flop (or a slower clock) multiplies the MTBF by a gigantic factor, because the settling time sits **in the exponent**. A real design picks the number of stages from the flip-flop's measured τ and Tw, the clock rate and a safety target (often thousands of years) taking process, voltage and temperature into account. The extra cost is **latency**: each stage delays the signal by one clock.",
      },
      {
        kind: "explain",
        title: "Crossing clock domains",
        body: P(
          "Anything that passes from one clock to an unrelated one crosses a **clock domain**. A single-bit signal can use a synchroniser. A **multi-bit** value cannot: each bit has its own tiny timing difference, so after synchronising, some bits show the new value and some the old, and the receiver can see a number that never existed (for example 0111 → 1000 caught half-way as 1111).",
          "Two safe ways. First: pass a value with a **handshake** (request and acknowledge signals, each synchronised) so the receiver reads the data only once it is stable. Second: for counters, use **Gray code**, where only **one bit** changes per step (000, 001, 011, 010, 110…), so a sample taken at the wrong moment sees either the old or the new number, never a wrong one.",
          "An **asynchronous FIFO** (a queue between two clock domains) combines these ideas: write and read pointers kept in Gray code, each synchronised into the other domain to work out how full or empty the queue is.",
        ),
      },
      {
        kind: "question",
        title: "Why Gray code?",
        body: "Why do asynchronous FIFOs keep their pointers in **Gray code** when sending them to the other clock domain?",
        question: {
          type: "choice",
          options: ["Gray code uses fewer bits than binary", "Only one bit changes per step, so a mistimed sample reads the old or the new value, never garbage", "Gray code makes the clock faster", "Gray code removes metastability entirely"],
          answer: 1,
          hint: "Think about what goes wrong when several bits change at once and the receiver samples part-way through.",
          feedback: {
            0: "Gray code uses exactly as many bits as plain binary. Its benefit is elsewhere.",
            2: "Gray code has no effect on clock speed.",
            3: "Nothing eliminates metastability. Gray code just guarantees that a bit caught mid-change gives a valid neighbouring count.",
          },
        },
        explanation: "If only one bit changes, a bit that is caught mid-change resolves to the old or the new value, and either is a legitimate pointer (one step apart). With binary, several bits flipping at once could be sampled in a mix, giving a pointer far from the truth. Metastability itself is still handled by the synchronisers.",
      },
      {
        kind: "question",
        title: "One press, many edges",
        body: "A mechanical button's contacts **bounce**: for a few milliseconds the signal flickers between 0 and 1. Software or hardware counting edges sees many presses. A **debouncer** ignores a change until the signal has been stable for some time. Set the debounce time (and press again with *New press* a few times) so that the count is exactly **1**.",
        widget: { type: "digi-bounce", props: {} },
        question: { type: "widget", goal: { presses: 1, ok: true }, hint: "Raise the debounce time until it is longer than the longest gap between bounces: a few milliseconds is enough here. Then try New press." },
        explanation: "The output only follows the contact once it has been **stable for the debounce time**. Set it longer than the longest gap inside a bounce (here a few ms) and shorter than the shortest real press. The price is a delay equal to that time. A button is also an **asynchronous** input: after debouncing, it still goes through a synchroniser before the clocked logic reads it.",
      },
      {
        kind: "code",
        title: "A debouncer in code",
        body: P(
          "Write `debounce(samples, n)`. `samples` is a list of 0/1 readings, one per tick. The output list starts at `samples[0]` and changes to the new level only after the input has shown that **new level for `n` readings in a row**.",
        ),
        language: "python",
        starter: `def debounce(samples, n):
    # return a list the same length as samples
    return list(samples)
`,
        solution: `def debounce(samples, n):
    out = samples[0]
    last = samples[0]
    run = 0
    result = []
    for s in samples:
        run = run + 1 if s == last else 1
        last = s
        if s != out and run >= n:
            out = s
        result.append(out)
    return result
`,
        tests: [
          { id: "bounce", description: "Ignores the short blips before a real press", assertionCode: `assert debounce([0, 1, 0, 1, 1, 1, 1], 3) == [0, 0, 0, 0, 0, 1, 1], f"got {debounce([0, 1, 0, 1, 1, 1, 1], 3)}"` },
          { id: "glitch", description: "A short glitch never changes the output", assertionCode: `assert debounce([1, 0, 1, 0, 1, 1, 1, 1], 3) == [1, 1, 1, 1, 1, 1, 1, 1], f"got {debounce([1, 0, 1, 0, 1, 1, 1, 1], 3)}"` },
          { id: "clean", description: "A clean step arrives n readings late", assertionCode: `assert debounce([0, 0, 0, 1, 1, 1, 1], 2) == [0, 0, 0, 0, 1, 1, 1], f"got {debounce([0, 0, 0, 1, 1, 1, 1], 2)}"` },
        ],
        hints: ["Count how many readings in a row equal the latest one. Reset the count to 1 whenever the reading changes.", "Only update the output when the reading differs from it AND the count has reached n."],
      },
      {
        kind: "explain",
        title: "In practice",
        body: P(
          "On real projects the habits are simple. **Every** signal that crosses between clocks, or comes from the outside world, gets a synchroniser or a handshake: no exceptions. Design tools help: **static timing analysis** checks setup and hold, and separate **clock-domain-crossing (CDC) checks** (offered by commercial EDA vendors, and partly by open tools such as Yosys and Verilator linters) flag any crossing that lacks one. Libraries often provide ready-made synchroniser cells.",
          "To look at the real thing, put an **oscilloscope** on the button (trigger on the first edge, zoom in on the bounce) or a **logic analyser** on a bus and count how many extra edges appear. You will find bounce times vary from well under a millisecond to tens of milliseconds, so check your own part. In firmware the same debounce idea reappears as a timer-based counter (see *GPIO in depth* in the Embedded module).",
          "The cost is honest: each synchroniser stage adds a clock of latency and some area, and a failure caused by metastability is rare, random and nearly impossible to reproduce, which is exactly why it is dangerous. The cheapest fix is always the one made at design time.",
        ),
      },
      {
        kind: "recap",
        points: [
          "A data edge inside the **setup/hold window** can leave a flip-flop **metastable**: an in-between level that resolves to 0 or 1 after a random time with an exponential tail.",
          "Metastability can't be eliminated, only made improbable: **MTBF = e^(t/τ) / (Tw · f_clk · f_data)**. Give it settling time with a **two-flop synchroniser** (more stages or a slower clock for more margin).",
          "Single bits use synchronisers; **multi-bit** values need a handshake or **Gray code** (one bit changes per step), as in an **asynchronous FIFO**.",
          "Buttons are asynchronous and **bounce**: debounce by requiring stability for longer than the bounce, then synchronise. In practice: check every crossing with CDC tools, and measure real signals with a scope or logic analyser.",
        ],
      },
    ],
  },
];
