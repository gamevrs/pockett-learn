import type { ConceptLesson } from "../../learn/types.ts";

/** Paragraphs joined with blank lines. */
const P = (...paras: string[]) => paras.join("\n\n");

/** Instructions for the pipeline widget: kind, destination register, source registers. */
const ins = (text: string, kind: "alu" | "load" | "store" | "branch", dst: number | undefined, ...src: number[]) => ({ text, kind, dst, src });

/** Lessons 1 to 5 of "How a CPU runs your code": adder, datapath, cycles per instruction, pipelining, hazards. */
export const cpuLessonsA: ConceptLesson[] = [
  // ─────────────────────────────── 1. From gates to an adder ───────────────────────────────
  {
    id: "fnd-cpu-1-gates-to-adder",
    title: "From gates to an adder",
    summary: "How a handful of logic gates add numbers: half adder, full adder, a row of them, and an ALU that also subtracts and compares.",
    level: "Beginner",
    minutes: 8,
    xp: 45,
    steps: [
      {
        kind: "explain",
        title: "Adding two bits",
        body: P(
          "A CPU can add millions of numbers a second, yet it is built from tiny switches. You met the building blocks in the bits lessons: **logic gates**, little circuits that take bits in and put one bit out. Now you will see how a few of them add.",
          "Add two single bits by hand: 0 + 0 = 0, 0 + 1 = 1, 1 + 0 = 1, and **1 + 1 = 10** (that is two, written in binary). The answer sometimes needs *two* bits: a **sum** bit (the right-hand digit) and a **carry** bit (the left-hand digit that does not fit).",
          "A circuit that adds two bits and gives both outputs is a **half adder**. Tap A and B to see what comes out.",
        ),
        widget: { type: "cpuarch-adder", props: { mode: "half" } },
      },
      {
        kind: "question",
        title: "Sum 0, carry 1",
        body: "Set the inputs so the **sum is 0** but the **carry is 1**.",
        widget: { type: "cpuarch-adder", props: { mode: "half" } },
        question: { type: "widget", goal: { sum: 0, carry: 1 }, hint: "The carry is 1 only when you are adding 1 + 1." },
        explanation: "1 + 1 = 10 in binary: the sum bit is 0 and the carry bit is 1. The **sum** is the XOR gate (1 when the inputs differ) and the **carry** is the AND gate (1 when both inputs are 1). Two gates make a half adder.",
      },
      {
        kind: "explain",
        title: "The full adder",
        body: P(
          "A half adder is not enough for longer numbers. When you add 25 + 17 by hand, the second column also has to add the **1 carried over** from the first. So each column adds *three* bits: A, B and the **carry in**.",
          "A circuit that does that is a **full adder** (two half adders plus an OR gate). Its sum bit is 1 when an odd number of inputs are 1. Its carry out is 1 when **two or more** inputs are 1. Open the truth table and try every row.",
        ),
        widget: { type: "cpuarch-adder", props: { mode: "full" } },
      },
      {
        kind: "question",
        title: "1 + 1 + 1",
        body: "A full adder gets A = 1, B = 1 and carry in = 1. What comes out?",
        question: {
          type: "choice",
          options: ["Sum 0, carry out 1", "Sum 1, carry out 1", "Sum 1, carry out 0", "Sum 0, carry out 0"],
          answer: 1,
          hint: "Count the ones: 1 + 1 + 1 = 3, and 3 in binary is 11.",
          feedback: {
            0: "That is what 1 + 1 + 0 gives (binary 10). With a third 1 the sum bit is 1 too.",
            2: "Three ones make 3, which needs two bits (11). The carry out can not be 0.",
            3: "Three ones certainly are not zero. 1 + 1 + 1 = 3, which is 11 in binary.",
          },
        },
        explanation: "1 + 1 + 1 = 3 = binary **11**: sum bit 1, carry out 1. Odd number of ones gives a sum of 1; two or more ones give a carry.",
      },
      {
        kind: "explain",
        title: "A row of full adders",
        body: P(
          "To add 4-bit numbers, line up **four full adders**. Each one adds one column and passes its carry out to the *next* adder's carry in, just like carrying on paper. This is a **ripple-carry adder**: the carry ripples from right to left.",
          "Flip the A and B bits. The top row of chips shows the carry going into each column. Try 7 + 1 (0111 + 0001) and watch the carry run all the way across.",
        ),
        widget: { type: "cpuarch-adder", props: { mode: "ripple", a: 3, b: 2 } },
      },
      {
        kind: "question",
        title: "Make the carry ripple",
        body: "Choose A and B so a carry passes through **at least 3 adders in a row** (the **Carry hops** count shows it).",
        widget: { type: "cpuarch-adder", props: { mode: "ripple", a: 3, b: 2 } },
        question: { type: "widget", goal: { minHops: 3 }, hint: "A carry keeps going while every column adds up to 2 or more. Try 0111 + 0001." },
        explanation: "7 + 1 makes every column carry: 111 + 001 flips each column in turn. That is the weakness of a ripple adder: the last column has to **wait** for the carry to arrive, so wide adders are slow. Real CPUs use faster layouts (carry-lookahead) that work out the carries in parallel.",
      },
      {
        kind: "explain",
        title: "An ALU: add, subtract, compare",
        body: P(
          "The **ALU** (arithmetic logic unit) is the part of the CPU that does the maths. At its heart is the adder, plus a little trick for **subtraction**: flip every bit of B and add 1. So A − B becomes A + (NOT B) + 1, and the same adder does both jobs.",
          "A **compare** is just a subtraction whose result is thrown away: the ALU keeps only the **flags**. **Z** (zero) says the result was all zeros, so A and B are equal. **C** (carry out) tells you whether the subtraction needed to borrow. Switch between Add, Subtract and Compare.",
          "Different CPU families name and use the carry flag a little differently. This toy uses 1 to mean 'nothing was borrowed'.",
        ),
        widget: { type: "cpuarch-adder", props: { mode: "alu", a: 9, b: 5 } },
      },
      {
        kind: "question",
        title: "Prove two numbers are equal",
        body: "Use **Compare** and pick A and B so the ALU reports they are **equal** (the Z flag is 1).",
        widget: { type: "cpuarch-adder", props: { mode: "alu", a: 9, b: 5 } },
        question: { type: "widget", goal: { op: "cmp", zero: true }, hint: "A compare subtracts. The result is zero when the two numbers are the same." },
        explanation: "If A − B is zero, then A = B. That is exactly how an `if (a == b)` in your code becomes hardware: a subtraction, then a branch on the Z flag, as you saw in the Assembly lessons with `CMP` and `JZ`.",
      },
      {
        kind: "code",
        title: "Build a full adder",
        body: P(
          "Write `full_adder(a, b, cin)` using only bit operators. It takes three bits (0 or 1) and returns `(sum, carry)`.",
          "In Python, `^` is XOR, `&` is AND and `|` is OR. The sum is `a ^ b ^ cin`. The carry out is 1 when at least two inputs are 1: `(a & b) | (cin & (a ^ b))`.",
        ),
        language: "python",
        starter: `def full_adder(a, b, cin):
    # return (sum_bit, carry_out) using ^, & and |
    return (0, 0)
`,
        solution: `def full_adder(a, b, cin):
    s = a ^ b ^ cin
    carry = (a & b) | (cin & (a ^ b))
    return (s, carry)
`,
        tests: [
          { id: "ones", description: "1 + 1 + 1 gives sum 1, carry 1", assertionCode: `assert full_adder(1, 1, 1) == (1, 1), f"1+1+1 should be (1, 1), got {full_adder(1, 1, 1)}"` },
          { id: "two", description: "1 + 1 + 0 gives sum 0, carry 1", assertionCode: `assert full_adder(1, 1, 0) == (0, 1), f"1+1+0 should be (0, 1), got {full_adder(1, 1, 0)}"` },
          { id: "carryin", description: "0 + 0 + 1 gives sum 1, carry 0", assertionCode: `assert full_adder(0, 0, 1) == (1, 0), f"0+0+1 should be (1, 0), got {full_adder(0, 0, 1)}"` },
          { id: "all", description: "Matches ordinary addition for all 8 inputs", assertionCode: `for a in (0, 1):\n    for b in (0, 1):\n        for c in (0, 1):\n            s, k = full_adder(a, b, c)\n            assert s + 2 * k == a + b + c, f"{a}+{b}+{c} gave sum {s}, carry {k}"` },
        ],
        hints: ["XOR (^) gives 1 when an odd number of bits are 1.", "The carry is 1 when A and B are both 1, or when the carry in is 1 and exactly one of A, B is 1."],
      },
      {
        kind: "recap",
        points: [
          "A **half adder** (XOR for the sum, AND for the carry) adds two bits; a **full adder** also takes a carry in.",
          "Chain full adders and you get a **ripple-carry adder**: each column waits for the carry from the one before.",
          "The **ALU** subtracts by flipping B's bits and adding 1, and compares by subtracting and keeping only the **flags** (zero, carry).",
          "Everything the CPU calculates comes down to a few gates, repeated billions of times a second.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 2. The datapath ───────────────────────────────
  {
    id: "fnd-cpu-2-datapath",
    title: "The datapath: one instruction, start to finish",
    summary: "Registers, the ALU, the control unit and the program counter, and how one instruction travels through them.",
    level: "Beginner",
    minutes: 8,
    xp: 45,
    steps: [
      {
        kind: "explain",
        title: "The parts of the loop",
        body: P(
          "In *Inside the computer* you met the **fetch, decode, execute** loop. Now meet the parts of the chip that do each job. Together they are called the **datapath**.",
          "- The **program counter (PC)** holds the number of the next instruction.\n- **Instruction memory** holds the program. The instruction being worked on sits in the **instruction register (IR)**.\n- The **control unit** reads the instruction and switches the right parts on.\n- The **registers** are a few ultra-fast boxes for numbers in use right now.\n- The **ALU** does the maths you built in the last lesson.\n- **Data memory** holds the program's numbers.",
          "This datapath runs the same toy instructions as the Assembly lessons. Press **Next step** and watch which block lights up.",
        ),
        widget: { type: "cpuarch-datapath", props: {} },
      },
      {
        kind: "question",
        title: "Fill the registers",
        body: "Run the program until **R0 holds 5** and **R1 holds 7**.",
        widget: { type: "cpuarch-datapath", props: {} },
        question: { type: "widget", goal: { r0: 5, r1: 7 }, hint: "The two MOV instructions come first. Use Finish instruction to run one at a time." },
        explanation: "Each `MOV` put a number into a register. The instruction carries the number inside itself, which is why the ALU only had to pass it along.",
      },
      {
        kind: "question",
        title: "Who decides?",
        body: "In the **decode** step, which part works out what the instruction means and which other parts to switch on?",
        question: {
          type: "choice",
          options: ["The ALU", "The registers", "The control unit", "Data memory"],
          answer: 2,
          hint: "It is the part that orchestrates the others without doing any maths itself.",
          feedback: {
            0: "The ALU does the arithmetic when told to. It does not read instructions.",
            1: "Registers just hold numbers. They do what they are told.",
            3: "Data memory holds the program's numbers and answers reads and writes. It does not interpret instructions.",
          },
        },
        explanation: "The **control unit** is the conductor: it reads the instruction and sends signals that tell the registers what to read, the ALU what to do, and memory whether to read or write.",
      },
      {
        kind: "question",
        title: "Predict the ADD",
        body: "R0 holds 5 and R1 holds 7. After `ADD R0, R1` finishes, what does R0 hold?",
        widget: { type: "cpuarch-datapath", props: {}, after: true },
        question: { type: "number", answer: 12, hint: "ADD R0, R1 means R0 = R0 + R1." },
        explanation: "Decode read R0 and R1; the ALU **added** them to get 12; write-back put the result in R0. R1 stays 7. Run the widget above to watch it happen.",
      },
      {
        kind: "question",
        title: "Five stages in order",
        body: "Every instruction goes through the same five stages. Put them in order.",
        question: { type: "order", items: ["Fetch", "Decode", "Execute", "Memory", "Write back"], hint: "Get the instruction, understand it, do it, touch memory if needed, store the result." },
        explanation: "**Fetch** the instruction, **decode** it, **execute** it in the ALU, access **memory** (only for loads and stores), then **write back** the result to a register. These five stages come back in the pipelining lesson.",
      },
      {
        kind: "explain",
        title: "Loads and stores use memory",
        body: P(
          "Most instructions finish with the registers and the ALU. Two kinds also touch **data memory**: `LOAD` copies a number from memory into a register, and `STORE` copies a register back to memory.",
          "In this run, watch the **Execute** stage compute the memory *address*, and the **Memory** stage do the read or write.",
        ),
        widget: {
          type: "cpuarch-datapath",
          props: {
            program: [
              { op: "LOAD", rd: 0, addr: 2 },
              { op: "LOAD", rd: 1, addr: 3 },
              { op: "ADD", rd: 0, rs: 1 },
              { op: "STORE", rs: 0, addr: 4 },
            ],
            memory: [0, 0, 9, 4, 0, 0, 0, 0],
          },
        },
      },
      {
        kind: "question",
        title: "Which ones touch memory?",
        body: "Pick **every** instruction that reads or writes **data memory**.",
        question: {
          type: "choice",
          options: ["ADD R0, R1", "LOAD R2, [4]", "MOV R0, #9", "STORE R1, [2]"],
          answer: [1, 3],
          hint: "Look for the square brackets: they mean 'the number at this memory address'.",
          feedback: {
            0: "ADD works only on registers, so the Memory stage does nothing for it.",
            2: "MOV #9 puts a number from the instruction itself into a register. No data memory involved.",
          },
        },
        explanation: "Only `LOAD` and `STORE` use data memory. That is why a register is so much quicker to use than memory: it needs no trip to a separate block.",
      },
      {
        kind: "question",
        title: "Where is the program counter?",
        body: "The PC starts at 0 and the program has no jumps. After **4 instructions** have finished, what number does the PC hold?",
        question: { type: "number", answer: 4, hint: "The PC moves on by 1 after each instruction finishes." },
        explanation: "The PC always holds the number of the **next** instruction. It starts at 0, goes up by 1 each time, and a jump simply writes a new number into it. That one trick is how loops and `if`s work.",
      },
      {
        kind: "recap",
        points: [
          "The **datapath** is the program counter, instruction memory, control unit, registers, ALU and data memory working together.",
          "The **control unit** decodes each instruction and switches the right parts on; the **ALU** does the arithmetic.",
          "Every instruction goes **fetch, decode, execute, memory, write back**. Only loads and stores really use the memory stage.",
          "The **program counter** names the next instruction; jumps just change it.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 3. Cycles per instruction ───────────────────────────────
  {
    id: "fnd-cpu-3-cycles-per-instruction",
    title: "Cycles per instruction",
    summary: "Why some instructions take longer than others, and the one formula that turns instructions, cycles and clock speed into real run time.",
    level: "Beginner",
    minutes: 8,
    xp: 45,
    steps: [
      {
        kind: "explain",
        title: "One tick is not one instruction",
        body: P(
          "In *Inside the computer* you learned that the **clock** ticks billions of times a second and that **IPC** counts instructions finished per tick. Here is the same idea turned around: **CPI**, *cycles per instruction*, is how many ticks an instruction takes on average. CPI is just 1 ÷ IPC.",
          "Instructions are not equally hard. Adding two registers is quick. A divide needs many steps of its own. Play with the mix below: the numbers are typical textbook values, not one specific chip.",
        ),
        widget: { type: "cpuarch-cpi", props: {} },
      },
      {
        kind: "question",
        title: "Work out the time",
        body: "A program has 3 billion instructions, an average CPI of 1.5 and runs on a 3 GHz CPU. How many **seconds** does it take?",
        question: { type: "number", answer: 1.5, tolerance: 0.05, unit: "s", hint: "Total cycles = instructions × CPI. Then divide by how many cycles happen each second." },
        explanation: "3 billion × 1.5 = 4.5 billion cycles. At 3 billion cycles a second, that is **1.5 seconds**. The whole story fits in one formula: **time = instructions × CPI ÷ clock speed**.",
      },
      {
        kind: "question",
        title: "Cut the average",
        body: "Hold the clock steady and change the instruction mix so the **average CPI is 1.5 or lower**.",
        widget: { type: "cpuarch-cpi", props: { controls: ["mix"] } },
        question: { type: "widget", goal: { maxCpi: 1.5 }, hint: "Look at which kinds of instruction cost the most cycles each, and ask for fewer of them." },
        explanation: "The expensive instructions (divides, and loads that miss the cache) drag the average up far more than their share suggests: 2% of divides at 20 cycles adds 0.4 cycles to *every* instruction on average. Cheap instructions pull it down.",
      },
      {
        kind: "question",
        title: "Fast clock or fast work?",
        body: "Program A runs on a **4 GHz** CPU at an average CPI of **2.0**. Program B runs on a **2.5 GHz** CPU at CPI **1.0**. Both have the same number of instructions. Which finishes first?",
        question: {
          type: "choice",
          options: ["A, because 4 GHz is the faster clock", "They tie", "B, because each instruction takes fewer ticks", "Can not tell without the instruction count"],
          answer: 2,
          hint: "Compare time per instruction: CPI ÷ GHz gives nanoseconds each.",
          feedback: {
            0: "A ticks faster but spends 2 ticks per instruction: 2 ÷ 4 = 0.5 ns each. B needs 1 ÷ 2.5 = 0.4 ns.",
            1: "They are close but not equal: A takes 0.5 ns per instruction, B takes 0.4 ns.",
            3: "The instruction count is the same for both, so it cancels out. The comparison only needs CPI and clock.",
          },
        },
        explanation: "Per instruction, A needs 2 ÷ 4 = 0.5 ns and B needs 1 ÷ 2.5 = 0.4 ns. **A higher GHz number alone proves nothing.** What matters is clock speed *and* how much work each tick gets done.",
      },
      {
        kind: "question",
        title: "Waiting for memory",
        body: P(
          "Some instructions are slow because they **wait**. A load that finds its data in the cache can finish in about 4 cycles. A load that has to go all the way to main memory (DRAM) waits tens of nanoseconds.",
          "Say a DRAM access takes about **80 ns** (typical order of magnitude) on a **4 GHz** CPU. How many **cycles** is that? (cycles = nanoseconds × GHz)",
        ),
        question: { type: "number", answer: 320, tolerance: 5, hint: "4 GHz means 4 ticks every nanosecond." },
        explanation: "80 ns × 4 ticks per ns = **320 cycles**. One cache miss can cost as much as hundreds of simple instructions. That is why, in the caching lessons, a few misses can wreck a program's average CPI.",
      },
      {
        kind: "question",
        title: "Three ways to finish sooner",
        body: "Run time = instructions × CPI ÷ clock speed. Which changes make a program finish sooner? Pick **all** that apply.",
        question: {
          type: "choice",
          options: ["Do the same job with fewer instructions (a better algorithm or compiler)", "Make each instruction take fewer cycles (fewer cache misses, no divides)", "Make the screen bigger", "Raise the clock speed"],
          answer: [0, 1, 3],
          hint: "Look at the three things on the right-hand side of the formula.",
          feedback: { 2: "A bigger screen is not in the formula. Only instructions, CPI and clock speed are." },
        },
        explanation: "Every speed-up trick in this module attacks one of the three terms: fewer **instructions** (SIMD, better code), fewer **cycles per instruction** (pipelining, prediction, caches) or a faster **clock**. The next lessons are all about CPI.",
      },
      {
        kind: "code",
        title: "The run-time formula",
        body: "Write `run_time(instructions, cpi, ghz)` that returns the run time in **seconds**. One GHz is a billion (`1e9`) cycles per second.",
        language: "python",
        starter: `def run_time(instructions, cpi, ghz):
    # seconds = instructions * cpi / (ghz * 1e9)
    return instructions
`,
        solution: `def run_time(instructions, cpi, ghz):
    return instructions * cpi / (ghz * 1e9)
`,
        tests: [
          { id: "basic", description: "3 billion instructions, CPI 1.5, 3 GHz takes 1.5 s", assertionCode: `assert abs(run_time(3e9, 1.5, 3) - 1.5) < 1e-9, f"expected 1.5, got {run_time(3e9, 1.5, 3)}"` },
          { id: "fast", description: "One billion instructions at CPI 1 on 4 GHz takes 0.25 s", assertionCode: `assert abs(run_time(1e9, 1, 4) - 0.25) < 1e-9, f"expected 0.25, got {run_time(1e9, 1, 4)}"` },
          { id: "slowcpi", description: "Doubling the CPI doubles the time", assertionCode: `assert abs(run_time(2e9, 2, 2) - 2 * run_time(2e9, 1, 2)) < 1e-9, "doubling the CPI should double the time"` },
        ],
        hints: ["cycles = instructions × cpi", "cycles per second = ghz × 1e9"],
      },
      {
        kind: "recap",
        points: [
          "**CPI** is cycles per instruction; **IPC** is its inverse. Different instructions cost different amounts: a divide is slow, a register add is quick.",
          "**Run time = instructions × CPI ÷ clock speed.** Raising GHz alone is not enough.",
          "Waiting for memory shows up as huge CPI: a miss to main memory can cost hundreds of cycles (typical order of magnitude).",
          "The rest of this module is about driving CPI down: overlapping instructions, guessing branches and running several at once.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 4. Pipelining ───────────────────────────────
  {
    id: "fnd-cpu-4-pipelining",
    title: "Pipelining: an assembly line for instructions",
    summary: "Overlap the five stages so a new instruction starts every cycle, and the difference between latency and throughput.",
    level: "Intermediate",
    minutes: 9,
    xp: 60,
    steps: [
      {
        kind: "explain",
        title: "The laundry trick",
        body: P(
          "You have four loads of laundry. A washer takes 30 minutes, a dryer 30 minutes. Do one load completely before starting the next and you wait four hours. But start load 2 in the washer *while load 1 is in the dryer*, and everything finishes much sooner. Nothing got faster. The machines just never sit idle.",
          "A CPU does the same. Remember the five stages: **IF** (fetch), **ID** (decode), **EX** (execute), **MEM** (memory), **WB** (write back). A **pipeline** starts the next instruction as soon as the last one has moved on to the next stage.",
          "Below: five independent instructions, one row each, one column per cycle. Switch between **One at a time** and **Pipelined**.",
        ),
        widget: {
          type: "cpuarch-pipeline",
          props: {
            overlap: true,
            program: [
              ins("ADD R1, R2, R3", "alu", 1, 2, 3),
              ins("SUB R4, R5, R6", "alu", 4, 5, 6),
              ins("AND R7, R8, R9", "alu", 7, 8, 9),
              ins("OR R10, R11, R12", "alu", 10, 11, 12),
              ins("XOR R13, R14, R15", "alu", 13, 14, 15),
            ],
          },
        },
      },
      {
        kind: "question",
        title: "Without overlap",
        body: "Run one at a time, each instruction takes 5 cycles before the next one starts. How many cycles do the **5 instructions** take?",
        question: { type: "number", answer: 25, hint: "5 instructions × 5 cycles each." },
        explanation: "5 × 5 = **25 cycles**. Most of the chip sat idle: while one instruction was in EX, the fetch, decode and write-back parts did nothing.",
      },
      {
        kind: "question",
        title: "With overlap",
        body: "Now pipeline them: a new instruction enters the fetch stage every cycle. How many cycles do the same 5 instructions take?",
        widget: {
          type: "cpuarch-pipeline",
          props: {
            overlap: true,
            program: [
              ins("ADD R1, R2, R3", "alu", 1, 2, 3),
              ins("SUB R4, R5, R6", "alu", 4, 5, 6),
              ins("AND R7, R8, R9", "alu", 7, 8, 9),
              ins("OR R10, R11, R12", "alu", 10, 11, 12),
              ins("XOR R13, R14, R15", "alu", 13, 14, 15),
            ],
          },
          after: true,
        },
        question: { type: "number", answer: 9, hint: "The first instruction needs 5 cycles to get through. After that one more finishes every cycle." },
        explanation: "**9 cycles**: 5 for the first instruction to travel through, then one more finishes each cycle for the remaining 4. The general rule is **cycles = instructions + stages − 1**.",
      },
      {
        kind: "question",
        title: "What got better?",
        body: "Pipelining did not make any single instruction faster. So what exactly improved?",
        question: {
          type: "choice",
          options: ["Latency: each instruction now takes just 1 cycle", "Throughput: close to one instruction finishes every cycle", "The clock speed went up by 5×", "The program needs fewer instructions"],
          answer: 1,
          hint: "Think about how many instructions come out per cycle, not how long one takes.",
          feedback: {
            0: "Latency (the time for one instruction from start to finish) is still 5 cycles. Look at any row in the grid.",
            2: "Pipelining lets the clock tick faster because each stage does less work, but that is a design choice, not an automatic 5×.",
            3: "The program is exactly the same list of instructions. It just overlaps them.",
          },
        },
        explanation: "**Latency** (time for one instruction) stays at 5 cycles. **Throughput** (instructions finished per cycle) climbs from 1 in 5 to almost 1 per cycle. Real cores are pipelined much deeper than the textbook five stages, often 14 to 20 stages for a fast desktop core (typical).",
      },
      {
        kind: "question",
        title: "A long run",
        body: "A program of **100 instructions** runs on a 5-stage pipeline with no stalls. How many cycles does it take?",
        question: { type: "number", answer: 104, hint: "cycles = instructions + stages − 1" },
        explanation: "100 + 5 − 1 = **104 cycles**, almost one per instruction. The 4 'extra' cycles to fill the pipeline matter less and less the longer the program runs.",
      },
      {
        kind: "code",
        title: "Count the cycles",
        body: "Write `pipeline_cycles(n, stages=5)` that returns the cycles needed for `n` independent instructions in a pipeline with no stalls. An empty program (`n = 0`) takes 0 cycles.",
        language: "python",
        starter: `def pipeline_cycles(n, stages=5):
    # fill the pipeline once, then finish one instruction per cycle
    return n + 1
`,
        solution: `def pipeline_cycles(n, stages=5):
    if n == 0:
        return 0
    return n + stages - 1
`,
        tests: [
          { id: "five", description: "5 instructions on 5 stages take 9 cycles", assertionCode: `assert pipeline_cycles(5) == 9, f"expected 9, got {pipeline_cycles(5)}"` },
          { id: "one", description: "A single instruction still takes all 5 stages", assertionCode: `assert pipeline_cycles(1) == 5, f"expected 5, got {pipeline_cycles(1)}"` },
          { id: "empty", description: "No instructions take 0 cycles", assertionCode: `assert pipeline_cycles(0) == 0, f"expected 0, got {pipeline_cycles(0)}"` },
          { id: "deep", description: "Works for a deeper pipeline", assertionCode: `assert pipeline_cycles(100, 15) == 114, f"expected 114, got {pipeline_cycles(100, 15)}"` },
        ],
        hints: ["The first instruction needs `stages` cycles. Each later one finishes one cycle after the previous.", "Handle n = 0 separately."],
      },
      {
        kind: "question",
        title: "Read the grid",
        body: "Look at the diagram: in a full pipeline with no stalls, which stage is the **first** instruction in during **cycle 3**?",
        widget: {
          type: "cpuarch-pipeline",
          props: {
            program: [
              ins("ADD R1, R2, R3", "alu", 1, 2, 3),
              ins("SUB R4, R5, R6", "alu", 4, 5, 6),
              ins("AND R7, R8, R9", "alu", 7, 8, 9),
              ins("OR R10, R11, R12", "alu", 10, 11, 12),
            ],
          },
          live: true,
        },
        question: {
          type: "choice",
          options: ["IF (fetch)", "ID (decode)", "EX (execute)", "WB (write back)"],
          answer: 2,
          hint: "Cycle 1 is IF, cycle 2 is ID. Count along the first row.",
          feedback: {
            0: "IF is where the first instruction is in cycle 1. By cycle 3 it moved on twice.",
            1: "ID is cycle 2 for the first instruction. Cycle 3 is the next stage.",
            3: "WB comes last, in cycle 5.",
          },
        },
        explanation: "Cycle 3, first instruction: IF (cycle 1), ID (2), **EX (3)**. At the same moment the second instruction is decoding and the third is being fetched: three instructions in flight at once.",
      },
      {
        kind: "recap",
        points: [
          "A **pipeline** overlaps the five stages so a new instruction starts every cycle.",
          "**Latency** (one instruction's time) stays the same; **throughput** (instructions per cycle) approaches 1.",
          "Ideal cycles for n instructions: **n + stages − 1**.",
          "Real cores use deeper pipelines (typically 14 to 20 stages) to allow faster clocks. The cost: more things can go wrong, which is the next lesson.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 5. Hazards and stalls ───────────────────────────────
  {
    id: "fnd-cpu-5-hazards",
    title: "Hazards and stalls",
    summary: "Why a pipeline sometimes has to wait: data hazards, forwarding, the load-use stall, structural and control hazards.",
    level: "Intermediate",
    minutes: 9,
    xp: 60,
    steps: [
      {
        kind: "explain",
        title: "When one instruction needs another's answer",
        body: P(
          "The pipeline assumed every instruction was independent. Real code is not: `SUB R4, R1, R5` needs the value **R1** that the previous `ADD` is still working out. That is a **data hazard**: an instruction needs a result that has not been written yet.",
          "The simple fix is to **stall**: hold the later instruction back (a *bubble* in the pipeline) until the result is written into the register. Here is a chain where each instruction uses the result of the one before. Forwarding is off.",
        ),
        widget: {
          type: "cpuarch-pipeline",
          props: {
            forwarding: true,
            program: [
              ins("ADD R1, R2, R3", "alu", 1, 2, 3),
              ins("SUB R4, R1, R5", "alu", 4, 1, 5),
              ins("AND R6, R4, R7", "alu", 6, 4, 7),
              ins("OR R8, R6, R9", "alu", 8, 6, 9),
            ],
          },
        },
      },
      {
        kind: "question",
        title: "Count the damage",
        body: "Four instructions would take 8 cycles with no hazards. With forwarding off, how many cycles does this dependent chain actually take?",
        widget: {
          type: "cpuarch-pipeline",
          props: {
            forwarding: true,
            program: [
              ins("ADD R1, R2, R3", "alu", 1, 2, 3),
              ins("SUB R4, R1, R5", "alu", 4, 1, 5),
              ins("AND R6, R4, R7", "alu", 6, 4, 7),
              ins("OR R8, R6, R9", "alu", 8, 6, 9),
            ],
          },
          after: true,
        },
        question: { type: "number", answer: 14, hint: "Each dependent instruction waits 2 extra cycles for the previous result to be written back. There are 3 of them." },
        explanation: "Each of the 3 dependent instructions waits **2 cycles** for its input to reach the register file: 8 + 3 × 2 = **14 cycles**, nearly twice the ideal time.",
      },
      {
        kind: "explain",
        title: "Forwarding: take a shortcut",
        body: P(
          "The ADD's answer is known at the **end of its EX stage**, long before it is written to the register file. **Forwarding** (also called *bypassing*) adds extra wires that send the result straight from the end of one EX to the start of the next.",
          "Turn forwarding **on** and watch the stalls disappear.",
        ),
        widget: {
          type: "cpuarch-pipeline",
          props: {
            forwarding: true,
            program: [
              ins("ADD R1, R2, R3", "alu", 1, 2, 3),
              ins("SUB R4, R1, R5", "alu", 4, 1, 5),
              ins("AND R6, R4, R7", "alu", 6, 4, 7),
              ins("OR R8, R6, R9", "alu", 8, 6, 9),
            ],
          },
        },
      },
      {
        kind: "question",
        title: "Remove the stalls",
        body: "Get this dependent chain down to its ideal **8 cycles**.",
        widget: {
          type: "cpuarch-pipeline",
          props: {
            forwarding: true,
            program: [
              ins("ADD R1, R2, R3", "alu", 1, 2, 3),
              ins("SUB R4, R1, R5", "alu", 4, 1, 5),
              ins("AND R6, R4, R7", "alu", 6, 4, 7),
              ins("OR R8, R6, R9", "alu", 8, 6, 9),
            ],
          },
        },
        question: { type: "widget", goal: { forwarding: true, maxCycles: 8 }, hint: "Use the forwarding switch." },
        explanation: "With forwarding, every ALU result is available to the very next instruction, so the chain runs at full speed. Nearly every real CPU forwards.",
      },
      {
        kind: "explain",
        title: "The one stall forwarding can not fix",
        body: P(
          "A **load** is different. Its value only arrives at the end of the **MEM** stage, one stage later than an ALU result. If the very next instruction needs it, even forwarding must wait one cycle. This is the **load-use stall**.",
          "A smart compiler (or you) can often fix this by **reordering**: put an *unrelated* instruction between the load and its use. The arrows next to each row swap neighbours, but only when it is safe.",
        ),
        widget: {
          type: "cpuarch-pipeline",
          props: {
            forwarding: "on",
            reorder: true,
            program: [ins("LW R1, [R2]", "load", 1, 2), ins("ADD R3, R1, R4", "alu", 3, 1, 4), ins("SUB R5, R6, R7", "alu", 5, 6, 7)],
          },
        },
      },
      {
        kind: "question",
        title: "Schedule around the load",
        body: "These three instructions take 8 cycles because the ADD waits for the load. Reorder them to finish in the ideal **7 cycles**.",
        widget: {
          type: "cpuarch-pipeline",
          props: {
            forwarding: "on",
            reorder: true,
            program: [ins("LW R1, [R2]", "load", 1, 2), ins("ADD R3, R1, R4", "alu", 3, 1, 4), ins("SUB R5, R6, R7", "alu", 5, 6, 7)],
          },
        },
        question: { type: "widget", goal: { maxCycles: 7 }, hint: "Put the independent SUB between the LW and the ADD that uses its result." },
        explanation: "Moving `SUB` into the gap gives the load time to finish: LW, SUB, ADD runs with **no stall**. Compilers do this kind of *instruction scheduling* all the time, and out-of-order CPUs do it in hardware (coming up).",
      },
      {
        kind: "explain",
        title: "Control hazards, and a third kind",
        body: P(
          "A **control hazard** happens at a branch. The pipeline fetches the next instruction every cycle, but a branch does not know where to go until its EX stage. Without a guess, fetching has to wait, leaving **bubbles**. Here the BEQ costs two empty cycles. (The next lesson is all about guessing.)",
          "The third kind is a **structural hazard**: two instructions need the same piece of hardware in the same cycle, such as one memory port used both to fetch an instruction and to load data. Designers avoid these by giving the CPU separate paths, so you will rarely see them in a modern core.",
        ),
        widget: {
          type: "cpuarch-pipeline",
          props: {
            forwarding: "on",
            branchStall: true,
            program: [ins("ADD R1, R2, R3", "alu", 1, 2, 3), ins("BEQ R1, R4, done", "branch", undefined, 1, 4), ins("SUB R5, R6, R7", "alu", 5, 6, 7), ins("AND R8, R9, R10", "alu", 8, 9, 10)],
          },
        },
      },
      {
        kind: "question",
        title: "Name that hazard",
        body: "Sort each situation into the kind of hazard it is.",
        widget: {
          type: "pattern-sorter",
          props: {
            buckets: [
              { id: "data", label: "Data", hint: "needs a result" },
              { id: "control", label: "Control", hint: "which way?" },
              { id: "structural", label: "Structural", hint: "same hardware" },
            ],
            items: [
              { id: "a", text: "ADD uses R1, which the instruction before is still computing" },
              { id: "b", text: "A branch has not decided yet whether to jump" },
              { id: "c", text: "A load and an instruction fetch both want the only memory port" },
              { id: "d", text: "A LOAD's value is needed by the very next instruction" },
              { id: "e", text: "A return instruction does not know the address it jumps back to" },
            ],
            answer: { a: "data", b: "control", c: "structural", d: "data", e: "control" },
          },
        },
        question: { type: "widget", goal: { placed: { a: "data", b: "control", c: "structural", d: "data", e: "control" } }, hint: "Ask: is it waiting for a value, for a decision about where to go next, or for a shared piece of hardware?" },
        explanation: "Waiting for a **value** is a data hazard (the load-use stall is one). Not knowing **which instruction comes next** is a control hazard (branches, jumps and returns). Two instructions fighting over the **same hardware** is a structural hazard.",
      },
      {
        kind: "recap",
        points: [
          "A **data hazard** is an instruction needing a result that is not ready. The pipeline inserts **stalls** (bubbles) until it is.",
          "**Forwarding** sends results straight from one stage to the next and removes most stalls. A **load-use** stall of one cycle remains.",
          "Reordering independent instructions (by the compiler or the CPU) fills the gap.",
          "**Control hazards** come from branches; **structural hazards** come from sharing hardware. Branch hazards are the big one, and the next lesson tackles them.",
        ],
      },
    ],
  },
];
