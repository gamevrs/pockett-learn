import type { Module } from "../../learn/types.ts";

/**
 * Module: Assembly, talking to the CPU. Everything hands-on runs on the "asm-cpu" toy CPU widget
 * (src/learn/widgets/asm): registers R0–R3, PC, Z/N flags, 16 memory cells, a stack, and an output.
 * Write-a-program questions are checked by re-running the learner's program on several inputs
 * (goal.cases), so hard-coding the answer doesn't pass. Each has a `solution` shown on give-up.
 */

const BASIC = ["MOV", "OUT", "HLT"];
const MATHS = ["MOV", "ADD", "SUB", "OUT", "HLT"];
const MEMORY = ["MOV", "ADD", "SUB", "LOAD", "STORE", "OUT", "HLT"];
const LOOPS = ["MOV", "ADD", "SUB", "OUT", "HLT", "JMP", "JZ", "JNZ"];
const BRANCH = ["MOV", "ADD", "SUB", "OUT", "HLT", "JMP", "CMP", "JZ", "JNZ", "JLT", "JGT"];
const STACK = ["MOV", "ADD", "SUB", "OUT", "HLT", "JMP", "PUSH", "POP", "CALL", "RET"];

const FIRST = `MOV R0, #7
MOV R1, #5
ADD R0, R1
OUT R0
HLT`;

const IF_ELSE = `    CMP R0, #0
    JNZ else       ; x isn't 0
    MOV R1, #1     ; the "if" part
    OUT R1
    JMP end        ; skip the else
else:
    MOV R1, #2     ; the "else" part
    OUT R1
end:
    HLT`;

const DOUBLE = `    MOV R0, #3
    CALL double
    OUT R0
    MOV R0, #10
    CALL double
    OUT R0
    HLT
double:
    ADD R0, R0
    RET`;

const SUM_PY = `total = 0
i = 1
while i <= 5:
    total = total + i
    i = i + 1
print(total)`;

const SUM_ASM = `    MOV R0, #0      ; total = 0
    MOV R1, #1      ; i = 1
loop:
    CMP R1, #5      ; while i <= 5:
    JGT done
    ADD R0, R1      ; total = total + i
    ADD R1, #1      ; i = i + 1
    JMP loop
done:
    OUT R0          ; print(total)
    HLT`;
const SUM_MAP = [1, 2, 0, 3, 3, 4, 5, 3, 0, 6, 0];

export const assemblyModule: Module = {
  id: "assembly",
  part: "machine",
  title: "Assembly: talking to the CPU",
  blurb: "Registers, instructions, jumps and loops on a toy CPU you program and step through.",
  icon: "microchip",
  lessons: [
    // ── Lesson 1 ──
    {
      id: "fnd-asm-1-machine-code",
      title: "Instructions are numbers",
      summary: "What a CPU really reads, how assembly spells it for people, and what an assembler does.",
      minutes: 6,
      xp: 50,
      steps: [
        {
          kind: "explain",
          title: "What the CPU actually reads",
          body: "You've seen the CPU fetch an instruction, decode it and execute it, over and over. But what *is* an instruction? Just **numbers**.\n\nBelow is a complete program for a small practice CPU, exactly as the CPU sees it: one instruction per row, three numbers each. Press **Step** a few times and watch the registers and the output. Can you guess what each row does?",
          widget: { type: "asm-cpu", props: { program: FIRST, locked: true, machineCode: "only", allow: ["MOV", "ADD", "OUT", "HLT"] } },
        },
        {
          kind: "question",
          title: "Read an opcode",
          body: "The first number in each row is the **opcode**: it says *which* operation to do. The other two say what to do it with. In this CPU, opcode **1** means \"put a number into a register\", so `1 0 7` put 7 into R0.\n\nWhat does the instruction `1 2 9` do?",
          question: { type: "choice", options: ["Puts 2 into R9", "Puts 9 into R2", "Adds 2 and 9", "Outputs the number 129"], answer: 1 },
          explanation: "Opcode 1 means \"put a number in a register\": the next number picks the register (R**2**) and the last one is the number (**9**). The CPU never sees words like \"put\". It sees 1, 2, 9, and its circuits are wired to react to that pattern.",
        },
        {
          kind: "explain",
          title: "Assembly: the same program in words",
          body: "Nobody wants to write programs as rows of numbers. **Assembly language** gives every opcode a short name, called a **mnemonic**, and writes the operands so people can read them:\n\n- `MOV R0, #7` means *move the number 7 into R0* (the `#` marks an exact number)\n- `ADD R0, R1` means *R0 = R0 + R1*\n- `OUT R0` sends R0 to the output, and `HLT` halts the CPU\n\nHere's the same program with the machine code beside each line. The small numbers on the left are each instruction's **address**, its numbered slot in program memory. Step through it again.",
          widget: { type: "asm-cpu", props: { program: FIRST, locked: true, machineCode: "beside", allow: ["MOV", "ADD", "OUT", "HLT"] } },
        },
        {
          kind: "question",
          title: "Be the assembler",
          body: "Pick an instruction and its operands, and watch the three numbers it becomes. Build the instruction whose machine code is **5 1 2**.",
          widget: { type: "asm-encode", props: { opcodes: [1, 2, 5, 6, 16, 0] } },
          question: { type: "widget", hint: "The first of the three numbers is the instruction's opcode; the other two are its operands.", goal: { code: [5, 1, 2] } },
          explanation: "Opcode 5 is `ADD` with two registers, and the operands are R1 and R2: **ADD R1, R2**, which sets R1 = R1 + R2. A register is stored as just its number: R1 is 1.",
        },
        {
          kind: "question",
          title: "One name, two opcodes",
          body: "`MOV R0, #3` and `MOV R0, R3` look almost the same. Build both in the encoder and compare their numbers. What's the difference to the CPU?",
          widget: { type: "asm-encode", props: { opcodes: [1, 2, 5, 16], initial: { opcode: 1, a: 0, b: 3 } }, live: true },
          question: {
            type: "choice",
            options: [
              "Nothing: both put 3 into R0",
              "The second one is an error",
              "They have different opcodes: one puts the number 3 in R0, the other copies whatever is in register R3",
              "The # makes the number bigger",
            ],
            answer: 2,
          },
          explanation: "`MOV R0, #3` is opcode **1** (a number goes in) and `MOV R0, R3` is opcode **2** (copy a register). Their other numbers are both `0 3`, so only the opcode tells them apart. That's why the `#` matters, and why our assembler won't let you leave it out.",
        },
        {
          kind: "explain",
          title: "The assembler",
          body: "An **assembler** is a program that does what you just did, for a whole file: it reads assembly text and writes out the machine code. Each line becomes exactly one instruction.\n\nEdit the program below: change a number, press **Assemble**, and check its machine code. Then try a typo like `MOOV` to see how the assembler complains.",
          widget: { type: "asm-cpu", props: { program: "MOV R0, #4\nMOV R1, #6\nADD R0, R1\nOUT R0\nHLT", machineCode: "beside", allow: ["MOV", "ADD", "SUB", "OUT", "HLT"] } },
        },
        {
          kind: "question",
          title: "Make it say 42",
          body: "Change this program so it outputs **42**, then press **Check**. Check assembles and runs it for you, but do try **Assemble** and **Run** yourself first.",
          widget: { type: "asm-cpu", props: { program: "MOV R0, #10\nOUT R0\nHLT", allow: ["MOV", "ADD", "SUB", "OUT", "HLT"], solution: "MOV R0, #42\nOUT R0\nHLT" } },
          question: { type: "widget", hint: "The program loads a number and then outputs it. Which number does it load?", goal: { out: [42] } },
          explanation: "`MOV R0, #42` puts 42 into R0 and `OUT R0` sends it out. You could also keep the 10 and add 32 to it. Any program that outputs exactly 42 and then halts is right.",
        },
        {
          kind: "question",
          title: "Count the instructions",
          body: "An assembly file has 6 instructions, 2 blank lines and 3 comment lines (comments start with `;` and are notes for people). How many instructions end up in the machine code?",
          question: { type: "number", hint: "Blank lines and comments are for people; only instructions become machine code.", answer: 6 },
          explanation: "Blank lines and comments are for humans, and the assembler skips them. Each instruction becomes exactly one machine instruction, so **6**. Later you'll see one line of Python turn into *several* instructions. That's a big difference between assembly and a high-level language.",
        },
        {
          kind: "recap",
          points: [
            "A CPU only runs **machine code**: instructions stored as numbers.",
            "Each instruction starts with an **opcode** (which operation), followed by its operands (what to do it with).",
            "**Assembly** spells each instruction with a short mnemonic like `MOV` or `ADD`, one line per instruction.",
            "An **assembler** translates assembly into machine code, one instruction for one instruction.",
          ],
        },
      ],
    },

    // ── Lesson 2 ──
    {
      id: "fnd-asm-2-registers",
      title: "Registers: the CPU's hands",
      summary: "Put numbers into registers, copy them around, show them and stop.",
      minutes: 6,
      xp: 50,
      steps: [
        {
          kind: "explain",
          title: "Four tiny boxes",
          body: "A **register** is a storage slot inside the CPU itself. Our CPU has four, named **R0** to **R3**, and each holds one whole number. Real CPUs have a few dozen at most, but they're the fastest storage in the computer, and the CPU does its calculating on values in registers.\n\n`MOV R1, #8` puts 8 into R1. The highlighted line is the one the CPU will run **next**. Step through and watch each register change.",
          widget: { type: "asm-cpu", props: { program: "MOV R0, #3\nMOV R1, #8\nMOV R3, #1\nHLT", locked: true, allow: BASIC } },
        },
        {
          kind: "question",
          title: "One number per register",
          body: "What does this program output?",
          widget: { type: "asm-cpu", props: { program: "MOV R0, #4\nMOV R0, #9\nOUT R0\nHLT", locked: true, predict: true, allow: BASIC } },
          question: { type: "choice", options: ["4", "9", "4 and then 9", "13"], answer: 1 },
          explanation: "A register holds **one** number. The second `MOV` replaces the 4 with 9, and the 4 is gone for good. Step through it now to see R0 change.",
        },
        {
          kind: "explain",
          title: "MOV copies",
          body: "With a register as its second operand, `MOV` **copies**: `MOV R1, R0` makes R1 hold the same number as R0. Despite the name *move*, R0 keeps its value. Step through: after the second line both registers hold 5.",
          widget: { type: "asm-cpu", props: { program: "MOV R0, #5\nMOV R1, R0\nHLT", locked: true, allow: BASIC } },
        },
        {
          kind: "question",
          title: "Copies don't stay linked",
          body: "What does this program output?",
          widget: { type: "asm-cpu", props: { program: "MOV R0, #5\nMOV R1, R0\nMOV R0, #2\nOUT R1\nOUT R0\nHLT", locked: true, predict: true, allow: BASIC } },
          question: { type: "choice", options: ["2, then 2", "5, then 5", "5, then 2", "2, then 5"], answer: 2 },
          explanation: "`MOV R1, R0` copied the 5 that was in R0 at that moment. Changing R0 afterwards doesn't touch R1, so the output is **5, then 2**. A copy is independent of the original.",
        },
        {
          kind: "question",
          title: "Don't forget to stop",
          body: "This program should output 7, but something's missing. Press **Run** and read the message, then fix it.",
          widget: { type: "asm-cpu", props: { program: "MOV R2, #7\nOUT R2", assembled: true, allow: BASIC, solution: "MOV R2, #7\nOUT R2\nHLT" } },
          question: { type: "widget", hint: "The CPU keeps going until it meets an instruction that tells it to stop.", goal: { out: [7] } },
          explanation: "Without `HLT` the CPU just fetches whatever comes after your last instruction. A real CPU would treat leftover bytes as instructions and run them, which is one way programs crash. `HLT` tells it to stop.",
        },
        {
          kind: "question",
          title: "Swap two registers",
          body: "R0 holds 3 and R1 holds 8. Swap them, so R0 ends with 8 and R1 with 3, using `MOV` between registers. Typing `#8` or `#3` won't do: your program must work for any two numbers, and Check will try others.",
          widget: {
            type: "asm-cpu",
            props: { program: "; swap R0 and R1\n\nHLT", regs: { R0: 3, R1: 8 }, inputs: ["R0", "R1"], allow: BASIC, solution: "MOV R2, R0   ; keep a copy of R0\nMOV R0, R1\nMOV R1, R2\nHLT" },
          },
          question: {
            type: "widget", hint: "If you overwrite one register straight away you lose its value. Park one in a spare register first.",
            goal: {
              cases: [
                { regs: { R0: 3, R1: 8 }, expectRegs: { R0: 8, R1: 3 } },
                { regs: { R0: 6, R1: 1 }, expectRegs: { R0: 1, R1: 6 } },
              ],
            },
          },
          explanation: "Start with `MOV R0, R1` and the 3 is overwritten before you've saved it. So park one value in a spare register first:\n```text\nMOV R2, R0   ; keep a copy of R0\nMOV R0, R1\nMOV R1, R2\n```\nIt's like swapping the drinks in two glasses: you need a third glass.",
        },
        {
          kind: "question",
          title: "Why registers?",
          body: "Memory can hold billions of numbers, yet a CPU has only a handful of registers. Why have registers at all?",
          question: {
            type: "choice",
            options: [
              "Registers keep their values when the power goes off",
              "Registers are inside the CPU, so using them is far faster than going out to memory",
              "Registers can hold bigger numbers than memory can",
              "Memory can only store text",
            ],
            answer: 1,
          },
          explanation: "Registers sit right next to the circuits that calculate, so using one takes about a clock tick, while a trip out to main memory can take a hundred times longer. Programs pull the values they're working on into registers, work there, and write results back. (Registers lose their contents without power, just like memory.)",
        },
        {
          kind: "recap",
          points: [
            "Registers are a few fast storage slots inside the CPU; ours has R0 to R3.",
            "`MOV R0, #5` puts a number in a register; `MOV R1, R0` copies one register into another.",
            "Writing to a register replaces its old value, and a copy doesn't stay linked to the original.",
            "`OUT` shows a value and `HLT` stops the CPU. Without `HLT`, the CPU runs on past your program.",
          ],
        },
      ],
    },

    // ── Lesson 3 ──
    {
      id: "fnd-asm-3-arithmetic",
      title: "Doing arithmetic",
      summary: "ADD and SUB, where results go, and how a whole expression becomes small steps.",
      minutes: 6,
      xp: 50,
      steps: [
        {
          kind: "explain",
          title: "ADD",
          body: "`ADD R0, R1` adds R1 to R0 and keeps the answer in **R0**. The first register is both an input and the place the result goes, so its old value is replaced. Step through and watch R0.",
          widget: { type: "asm-cpu", props: { program: "MOV R0, #6\nMOV R1, #4\nADD R0, R1\nOUT R0\nHLT", locked: true, allow: MATHS } },
        },
        {
          kind: "question",
          title: "Which one changes?",
          body: "After `SUB R0, R1` runs, what has changed?",
          widget: { type: "asm-cpu", props: { program: "MOV R0, #10\nMOV R1, #3\nSUB R0, R1\nHLT", locked: true, predict: true, allow: MATHS } },
          question: { type: "choice", options: ["R1 becomes 7", "R0 becomes −7", "R0 becomes 7", "Nothing: SUB just shows the answer"], answer: 2 },
          explanation: "`SUB R0, R1` means R0 = R0 − R1 = 10 − 3 = **7**. The result always lands in the first register, and R1 is left alone.",
        },
        {
          kind: "explain",
          title: "Adding a number directly",
          body: "Arithmetic works with exact numbers too: `ADD R0, #1` adds 1 to R0 without needing another register. Adding 1 is so common it has a name: **incrementing**. Step through.",
          widget: { type: "asm-cpu", props: { program: "MOV R0, #0\nADD R0, #1\nADD R0, #1\nADD R0, #5\nOUT R0\nHLT", locked: true, allow: MATHS } },
        },
        {
          kind: "question",
          title: "Order matters",
          body: "What does this program output?",
          widget: { type: "asm-cpu", props: { program: "MOV R0, #5\nMOV R1, #2\nSUB R1, R0\nOUT R1\nHLT", locked: true, predict: true, allow: MATHS } },
          question: { type: "choice", options: ["3", "−3", "2", "5"], answer: 1 },
          explanation: "`SUB R1, R0` means R1 = R1 − R0 = 2 − 5 = **−3**. Swapping the operands of a subtraction changes the answer, and registers are happy to hold negative numbers.",
        },
        {
          kind: "question",
          title: "a + b − c",
          body: "R0, R1 and R2 already hold three numbers, a, b and c. Write a program that outputs **a + b − c**. It has to work for any numbers, so don't type them in: use the registers. Change the starting values to test it.",
          widget: {
            type: "asm-cpu",
            props: {
              program: "; R0 = a, R1 = b, R2 = c\n; output a + b - c\n\nHLT",
              regs: { R0: 7, R1: 5, R2: 3 },
              inputs: ["R0", "R1", "R2"],
              allow: MATHS,
              solution: "ADD R0, R1   ; R0 = a + b\nSUB R0, R2   ; R0 = a + b - c\nOUT R0\nHLT",
            },
          },
          question: {
            type: "widget", hint: "Combine the registers step by step: add b to a, take c away, then output the result.",
            goal: {
              cases: [
                { regs: { R0: 7, R1: 5, R2: 3 }, out: [9] },
                { regs: { R0: 10, R1: 20, R2: 5 }, out: [25] },
                { regs: { R0: 0, R1: 0, R2: 4 }, out: [-4] },
              ],
            },
          },
          explanation: "Two instructions do the maths: `ADD R0, R1` makes R0 = a + b, then `SUB R0, R2` takes c away, and `OUT R0` shows it. Each instruction does one small step, so a longer expression just needs more of them.",
        },
        {
          kind: "question",
          title: "No multiply button",
          body: "Our CPU has no multiply instruction. Make it output **R0 × 4** anyway, using `ADD`. R0 starts at 3, so the answer here is 12, but it has to work for any R0.",
          widget: {
            type: "asm-cpu",
            props: { program: "; output R0 × 4\n\nHLT", regs: { R0: 3 }, inputs: ["R0"], allow: ["MOV", "ADD", "OUT", "HLT"], solution: "ADD R0, R0   ; × 2\nADD R0, R0   ; × 4\nOUT R0\nHLT" },
          },
          question: {
            type: "widget", hint: "R0 × 4 is R0 + R0 + R0 + R0. Keep adding R0 to a running total.",
            goal: {
              cases: [
                { regs: { R0: 3 }, out: [12] },
                { regs: { R0: 5 }, out: [20] },
                { regs: { R0: -2 }, out: [-8] },
              ],
            },
          },
          explanation: "`ADD R0, R0` doubles R0, and doubling twice multiplies by 4. Adding a copy of R0 three more times works too, it just takes more steps. Many early CPUs had no multiply instruction, and programs built multiplication out of additions like this.",
        },
        {
          kind: "recap",
          points: [
            "`ADD R0, R1` and `SUB R0, R1` do the maths and put the result in the **first** register.",
            "The second operand can be a register or an exact number, like `ADD R0, #1`.",
            "Each instruction does one small step, so an expression becomes a short sequence of them.",
            "Missing operations can be built from simple ones: × 4 is two doublings.",
          ],
        },
      ],
    },

    // ── Lesson 4 ──
    {
      id: "fnd-asm-4-memory",
      title: "Memory: LOAD and STORE",
      summary: "Addresses versus values, moving data between memory and registers, and what a variable really is.",
      minutes: 8,
      xp: 60,
      steps: [
        {
          kind: "explain",
          title: "Many more boxes",
          body: "Four registers aren't enough for most programs. The rest of the data lives in **memory**: a long row of cells, each with a number called its **address**. Ours has 16 cells, addresses 0 to 15. (Real memory has billions.)\n\nThe CPU can't do maths on memory directly. It **loads** a number into a register, works on it there, and **stores** the result back:\n\n- `LOAD R0, [0]` copies the number at address 0 into R0\n- `STORE R0, [0]` copies R0 into address 0\n\nThe square brackets mean *the cell at this address*. Step through and watch address 0.",
          widget: { type: "asm-cpu", props: { program: "LOAD R0, [0]\nADD R0, #1\nSTORE R0, [0]\nHLT", locked: true, mem: { "0": 41 }, allow: MEMORY } },
        },
        {
          kind: "question",
          title: "Address or value?",
          body: "Address 3 holds the number **10**, and address 10 holds **99**. What does `LOAD R0, [3]` put in R0?",
          question: { type: "choice", options: ["3", "10", "99", "13"], answer: 1 },
          explanation: "`[3]` means *the cell at address 3*, and that cell holds **10**. The address says *where* to look; the value is *what's there*. Mixing the two up is one of the most common mistakes in low-level code.",
        },
        {
          kind: "question",
          title: "# or [ ]?",
          body: "What's the difference between `MOV R2, #5` and `LOAD R2, [5]`?",
          question: {
            type: "choice",
            options: [
              "They do the same thing",
              "`MOV` writes to memory and `LOAD` writes to a register",
              "`LOAD` is just a slower `MOV`",
              "`MOV R2, #5` puts the number 5 in R2; `LOAD R2, [5]` copies whatever number is stored at address 5",
            ],
            answer: 3,
          },
          explanation: "`#5` is the number itself, written right into the instruction. `[5]` is the cell at address 5, which could hold anything. That's also why `LOAD` takes longer: it has to go out to memory to find out.",
        },
        {
          kind: "question",
          title: "Back and forth",
          body: "Address 0 starts at 4. After this program halts, what number is at address **1**?",
          widget: { type: "asm-cpu", props: { program: "LOAD R0, [0]\nADD R0, R0\nSTORE R0, [0]\nLOAD R1, [0]\nADD R1, #1\nSTORE R1, [1]\nHLT", locked: true, predict: true, mem: { "0": 4 }, allow: MEMORY } },
          question: { type: "number", hint: "Trace it line by line and write down what each register holds.", answer: 9 },
          explanation: "R0 loads the 4 and doubles it, and 8 is stored back at address 0. Then R1 loads that 8, adds 1, and **9** is stored at address 1. Memory only changes when a `STORE` runs.",
        },
        {
          kind: "explain",
          title: "Variables are addresses",
          body: "In Python you write `total = x + y` and never think about where the numbers live. When the program runs, each variable is really a place in memory: something decides an address for every variable, and the names disappear.\n\nHere `x` is address 0, `y` is address 1 and `total` is address 2. This is `total = x + y`, by hand.",
          widget: {
            type: "asm-cpu",
            props: { program: "LOAD R0, [0]    ; R0 = x\nLOAD R1, [1]    ; R1 = y\nADD R0, R1\nSTORE R0, [2]   ; total = R0\nHLT", locked: true, mem: { "0": 12, "1": 30 }, names: { "0": "x", "1": "y", "2": "total" }, allow: MEMORY },
          },
        },
        {
          kind: "question",
          title: "Write total = x − y",
          body: "Now you: compute `total = x - y`. As before, x is at address 0, y at 1, and total goes in 2. Check will try other values of x and y.",
          widget: {
            type: "asm-cpu",
            props: {
              program: "; total = x - y\n; x is at [0], y is at [1], total goes in [2]\n\nHLT",
              mem: { "0": 50, "1": 8 },
              names: { "0": "x", "1": "y", "2": "total" },
              allow: MEMORY,
              solution: "LOAD R0, [0]    ; R0 = x\nLOAD R1, [1]    ; R1 = y\nSUB R0, R1      ; R0 = x - y\nSTORE R0, [2]   ; total = R0\nHLT",
            },
          },
          question: {
            type: "widget", hint: "Load x, load y, subtract, then store the result at address 2.",
            goal: {
              cases: [
                { mem: { "0": 50, "1": 8 }, expectMem: { "2": 42 } },
                { mem: { "0": 5, "1": 9 }, expectMem: { "2": -4 } },
              ],
            },
          },
          explanation: "Load both variables into registers, subtract there, and store the answer at total's address. Load, compute, store: almost every line of a high-level language turns into that pattern.",
        },
        {
          kind: "question",
          title: "Swap two variables",
          body: "Swap x and y in memory: afterwards x holds what y had, and y holds what x had.",
          widget: {
            type: "asm-cpu",
            props: { program: "; swap x ([0]) and y ([1])\n\nHLT", mem: { "0": 12, "1": 30 }, names: { "0": "x", "1": "y" }, allow: MEMORY, solution: "LOAD R0, [0]\nLOAD R1, [1]\nSTORE R0, [1]\nSTORE R1, [0]\nHLT" },
          },
          question: {
            type: "widget", hint: "Load both values into registers first, then store them back the other way round.",
            goal: {
              cases: [
                { mem: { "0": 12, "1": 30 }, expectMem: { "0": 30, "1": 12 } },
                { mem: { "0": -1, "1": 7 }, expectMem: { "0": 7, "1": -1 } },
              ],
            },
          },
          explanation: "Load both first, then store them crosswise. Both values are safe in registers before either store happens, so this time you don't need a spare like you did when swapping two registers.",
        },
        {
          kind: "question",
          title: "An address in a register",
          body: "The address can come from a register: `LOAD R1, [R0]` reads the cell whose address is the number **in R0**. Add 1 to R0 and the same instruction reads the next cell. This is how programs walk through a list. (In C, an address kept in a variable is called a **pointer**.)\n\nWhat ends up in R2?",
          widget: { type: "asm-cpu", props: { program: "MOV R0, #2\nLOAD R1, [R0]\nADD R0, #1\nLOAD R2, [R0]\nHLT", locked: true, predict: true, mem: { "2": 70, "3": 15 }, allow: MEMORY } },
          question: { type: "number", hint: "R0 holds an address, so LOAD reads that cell. Add 1 to R0 and it reads the next cell.", answer: 15 },
          explanation: "R0 starts at 2, so `LOAD R1, [R0]` reads address 2 (70). Then R0 becomes 3, and `LOAD R2, [R0]` reads address 3: **15**. The same kind of instruction reaches a different cell because the address came from a register.",
        },
        {
          kind: "recap",
          points: [
            "Memory is a row of numbered cells; a cell's number is its **address**.",
            "`LOAD` copies from memory into a register and `STORE` copies a register into memory. The maths happens in registers.",
            "`#5` is the number 5; `[5]` is whatever is stored at address 5.",
            "A variable is a memory address with a name that only people see.",
            "`[R0]` uses a register as the address, so a program can step through memory.",
          ],
        },
      ],
    },

    // ── Lesson 5 ──
    {
      id: "fnd-asm-5-loops",
      title: "Jumps and loops",
      summary: "Labels, jumping back, the zero flag, and loops that know when to stop.",
      minutes: 8,
      xp: 60,
      steps: [
        {
          kind: "explain",
          title: "Changing the PC",
          body: "The **program counter** (PC) holds the address of the next instruction, and normally it just goes up by one, so the program runs top to bottom. A **jump** breaks that: `JMP skip` puts a new address into the PC, so the next instruction comes from somewhere else.\n\n`skip:` is a **label**: a name for the address of the instruction after it. The assembler swaps the name for that address, which you can see in the machine code. Step through: one line never runs.",
          widget: { type: "asm-cpu", props: { program: "    MOV R0, #1\n    JMP skip\n    MOV R0, #99\nskip:\n    OUT R0\n    HLT", locked: true, machineCode: "beside", allow: ["MOV", "OUT", "HLT", "JMP"], flags: false } },
        },
        {
          kind: "question",
          title: "Round and round",
          body: "What happens when this program runs?",
          widget: { type: "asm-cpu", props: { program: "    MOV R0, #0\nloop:\n    ADD R0, #1\n    OUT R0\n    JMP loop", locked: true, predict: true, allow: ["MOV", "ADD", "OUT", "HLT", "JMP"], flags: false, maxSteps: 30 } },
          question: {
            type: "choice",
            options: ["It outputs 1 and stops", "It outputs 1 over and over, because R0 starts again at 0 each time", "It outputs 1, 2, 3, … and never stops on its own", "The assembler rejects it, because there's no HLT"],
            answer: 2,
          },
          explanation: "`JMP loop` sends the PC back to `ADD R0, #1` every time, and nothing ever leaves the loop: an **infinite loop**. `MOV R0, #0` is above the label, so it runs only once and R0 keeps growing. This simulator gives up after a step limit; a real CPU would spin until someone stopped the program. Run it and see.",
        },
        {
          kind: "explain",
          title: "Loops that stop",
          body: "A useful loop needs a way out, and that's what the **flags** are for. Every `ADD` and `SUB` sets the **Z** (zero) flag to 1 when its result is 0, and to 0 otherwise. `JNZ loop` means *jump if not zero*: it jumps back only while Z is 0.\n\nThis loop counts down. Step through and watch R0 and Z: on the third pass `SUB` makes 0, Z lights up, and `JNZ` lets the CPU fall through to `HLT`. (The N flag lights when a result is negative. You'll use it in the next lesson.)",
          widget: { type: "asm-cpu", props: { program: "    MOV R0, #3\nloop:\n    OUT R0\n    SUB R0, #1\n    JNZ loop\n    HLT", locked: true, allow: LOOPS } },
        },
        {
          kind: "question",
          title: "Count down by twos",
          body: "Write a loop that outputs **10, 8, 6, 4, 2** and then halts. Use at most 6 instructions, so five separate `OUT`s won't fit.",
          widget: {
            type: "asm-cpu",
            props: { program: "; output 10, 8, 6, 4, 2 with a loop\n\nHLT", allow: LOOPS, solution: "    MOV R0, #10\nloop:\n    OUT R0\n    SUB R0, #2\n    JNZ loop\n    HLT" },
          },
          question: { type: "widget", hint: "Start at 10, output, subtract 2, and jump back until you reach 0.", goal: { out: [10, 8, 6, 4, 2], maxLines: 6 } },
          explanation: "Start at 10 and subtract 2 each pass. After 2 is output, `SUB` makes 0, Z turns on, and `JNZ` stops jumping. Had you started at 9, R0 would go 9, 7, … 1, −1 and skip 0 entirely, so the loop would never end. Exit conditions deserve a careful look.",
        },
        {
          kind: "question",
          title: "Add up 1 to n",
          body: "R0 holds a number n. Output the total 1 + 2 + … + n (for n = 4 that's 10). Fill in the loop: add R0 to the running total in R1, then count R0 down.",
          widget: {
            type: "asm-cpu",
            props: {
              program: "; R0 = n. Output 1 + 2 + ... + n\n    MOV R1, #0      ; running total\nloop:\n\n    JNZ loop\n    OUT R1\n    HLT",
              regs: { R0: 4 },
              inputs: ["R0"],
              allow: LOOPS,
              solution: "    MOV R1, #0      ; running total\nloop:\n    ADD R1, R0      ; total = total + n\n    SUB R0, #1      ; n = n - 1\n    JNZ loop\n    OUT R1\n    HLT",
            },
          },
          question: {
            type: "widget", hint: "Add R0 into the running total in R1, count R0 down by 1, and repeat until R0 is 0.",
            goal: {
              cases: [
                { regs: { R0: 4 }, out: [10] },
                { regs: { R0: 10 }, out: [55] },
                { regs: { R0: 1 }, out: [1] },
              ],
            },
          },
          explanation: "Each pass adds the current n to the total and then counts n down. Order matters: `SUB` must come right before `JNZ`, because a jump looks at the flags left by the **last** arithmetic instruction. (Starting at n = 0 would count down past zero and never stop, so here n is at least 1.)",
        },
        {
          kind: "question",
          title: "Twice the data",
          body: "With n = 10 this program runs 33 instructions. About how many will it run with n = 20? Set R0 and run it to check.",
          widget: {
            type: "asm-cpu",
            props: { program: "    MOV R1, #0\nloop:\n    ADD R1, R0\n    SUB R0, #1\n    JNZ loop\n    OUT R1\n    HLT", locked: true, regs: { R0: 10 }, inputs: ["R0"], allow: LOOPS },
            live: true,
          },
          question: { type: "choice", options: ["About the same: it's the same program", "About 63, twice as many", "About 130, four times as many", "Exactly 20"], answer: 1 },
          explanation: "The three loop instructions run once per number, so the work grows in step with n: 3 × 20 + 3 = **63**. The program is the same size, but how long it *runs* depends on the data. Later this idea gets a name: **time complexity**.",
        },
        {
          kind: "question",
          title: "Add up a list",
          body: "Addresses 0 to 4 hold a list of five numbers. Output their total. The starter keeps the address of the next item in R0 and counts the items left in R2. Fill in the loop body.",
          widget: {
            type: "asm-cpu",
            props: {
              program: "    MOV R0, #0      ; next address\n    MOV R2, #5      ; items left\n    MOV R1, #0      ; total\nloop:\n    ; load the item at [R0], add it\n    ; to R1, move R0 on, count R2 down\n\n    JNZ loop\n    OUT R1\n    HLT",
              mem: { "0": 3, "1": 8, "2": 1, "3": 9, "4": 4 },
              allow: [...LOOPS, "LOAD"],
              solution: "    MOV R0, #0      ; next address\n    MOV R2, #5      ; items left\n    MOV R1, #0      ; total\nloop:\n    LOAD R3, [R0]   ; the current item\n    ADD R1, R3\n    ADD R0, #1      ; next address\n    SUB R2, #1      ; one fewer left\n    JNZ loop\n    OUT R1\n    HLT",
            },
          },
          question: {
            type: "widget", hint: "Each time round: load the item at the address in R0, add it to the total, move R0 on by one and count R2 down.",
            goal: {
              cases: [
                { out: [25] },
                { mem: { "0": 10, "1": 20, "2": 30, "3": 40, "4": 50 }, out: [150] },
                { mem: { "0": -5, "1": 5, "2": 0, "3": 2, "4": 1 }, out: [3] },
              ],
            },
          },
          explanation: "`LOAD R3, [R0]` reads the current item, `ADD R1, R3` adds it to the total, `ADD R0, #1` moves to the next address, and `SUB R2, #1` counts down so `JNZ` knows when to stop. That's roughly what `sum(numbers)` does underneath: an address walking through memory.",
        },
        {
          kind: "recap",
          points: [
            "The PC normally moves on to the next instruction; a **jump** puts a new address into it.",
            "A **label** names an address, and the assembler replaces it with the number.",
            "`ADD` and `SUB` set the **Z flag** when the result is zero, and `JNZ` jumps only while Z is 0.",
            "A loop is a backwards jump plus a condition to escape. Without one, it's an **infinite loop**.",
            "A short loop can run many instructions: running time grows with the data.",
          ],
        },
      ],
    },

    // ── Lesson 6 ──
    {
      id: "fnd-asm-6-branches",
      title: "Comparisons and branches",
      summary: "CMP and the flags, conditional jumps, and how if/else and while look to the CPU.",
      minutes: 8,
      xp: 60,
      steps: [
        {
          kind: "explain",
          title: "CMP: subtract and forget",
          body: "To decide anything, a CPU compares. `CMP R0, R1` works out R0 − R1, throws the answer away, and keeps only the flags:\n\n- **Z = 1** when the result is 0: the numbers are **equal**\n- **N = 1** when the result is negative: **R0 is less** than R1\n- both 0: R0 is **greater**\n\nA conditional jump then reads the flags. Change R0 and R1 and see which jumps would fire.",
          widget: { type: "asm-flags", props: { a: 5, b: 8 } },
        },
        {
          kind: "question",
          title: "Make neither jump",
          body: "Find values where **neither** `JZ` nor `JLT` would jump.",
          widget: { type: "asm-flags", props: { a: 5, b: 8 } },
          question: { type: "widget", hint: "JZ jumps when the last result was zero and JLT when it was negative. Pick a value that is neither.", goal: { z: false, n: false } },
          explanation: "`JZ` needs equal numbers and `JLT` needs R0 < R1. For neither to fire, R0 must be **greater** than R1: the subtraction is positive, so both flags are 0. That's exactly when `JGT` jumps.",
        },
        {
          kind: "question",
          title: "Which way round?",
          body: "A program runs `CMP R0, R1` and then `JLT smaller`. When does it jump to `smaller`?",
          question: { type: "choice", options: ["When R1 is less than R0", "When R0 is less than R1", "When R0 and R1 are different", "Always: a CMP is always followed by a jump"], answer: 1 },
          explanation: "CMP works out R0 − R1, which is negative exactly when **R0 < R1**. Read `CMP R0, R1` then `JLT` as \"if R0 < R1, jump\": the operands keep their order.",
        },
        {
          kind: "explain",
          title: "if / else",
          body: "Here's an if/else in Python and the same decision in assembly, with x in R0. The assembly compares, then **jumps over** the part that shouldn't run. Notice `JMP end`: after the *if* part, it skips the *else* part.\n\nStep through and watch which Python line is running. Then press Reset, set R0 to something other than 0, and run it again.",
          widget: {
            type: "asm-cpu",
            props: { program: IF_ELSE, python: "if x == 0:\n    print(1)\nelse:\n    print(2)", pyLines: [1, 1, 2, 2, 2, 3, 4, 4, 0, 0], locked: true, regs: { R0: 0 }, inputs: ["R0"], allow: BRANCH },
          },
        },
        {
          kind: "question",
          title: "Delete the JMP",
          body: "What goes wrong if you delete the line `JMP end`? Edit the program and try it.",
          widget: { type: "asm-cpu", props: { program: IF_ELSE, regs: { R0: 0 }, inputs: ["R0"], allow: BRANCH }, live: true },
          question: {
            type: "choice",
            options: [
              "Nothing: HLT stops it anyway",
              "When x is not 0, nothing is output",
              "The assembler refuses: every JNZ needs a JMP",
              "When x is 0, it outputs 1 and then 2, because the CPU runs straight on into the else part",
            ],
            answer: 3,
          },
          explanation: "Labels aren't walls. The CPU just runs the next address, so after the *if* part it carries on into the *else* part. `JMP end` is what makes the two branches exclusive.",
        },
        {
          kind: "question",
          title: "The bigger one",
          body: "R0 and R1 hold two numbers. Output the **larger** one (if they're equal, output either).",
          widget: {
            type: "asm-cpu",
            props: {
              program: "; output the larger of R0 and R1\n\nHLT",
              regs: { R0: 3, R1: 9 },
              inputs: ["R0", "R1"],
              allow: BRANCH,
              solution: "    CMP R0, R1\n    JLT second     ; R0 < R1: R1 is bigger\n    OUT R0\n    HLT\nsecond:\n    OUT R1\n    HLT",
            },
          },
          question: {
            type: "widget", hint: "Subtract one from the other. If the result is negative, the second is the bigger one.",
            goal: {
              cases: [
                { regs: { R0: 3, R1: 9 }, out: [9] },
                { regs: { R0: 9, R1: 3 }, out: [9] },
                { regs: { R0: 5, R1: 5 }, out: [5] },
                { regs: { R0: -2, R1: -7 }, out: [-2] },
              ],
            },
          },
          explanation: "Compare, then branch: if R0 < R1, jump to code that outputs R1; otherwise fall through and output R0. Two `HLT`s are fine. You could also copy the winner into one register and output it in one place, which is closer to what `max(a, b)` compiles to.",
        },
        {
          kind: "question",
          title: "Count up to n",
          body: "n is in R0. Output 1, 2, 3, … up to n, using `CMP` to decide when to stop. If n is 0, output nothing.",
          widget: {
            type: "asm-cpu",
            props: {
              program: "; R0 = n. Output 1, 2, ..., n\n    MOV R1, #1      ; i = 1\nloop:\n\n    HLT",
              regs: { R0: 4 },
              inputs: ["R0"],
              allow: BRANCH,
              solution: "    MOV R1, #1      ; i = 1\nloop:\n    CMP R1, R0      ; i > n?\n    JGT done        ; then stop\n    OUT R1\n    ADD R1, #1      ; i = i + 1\n    JMP loop\ndone:\n    HLT",
            },
          },
          question: {
            type: "widget", hint: "Output the counter, add 1, compare it with n, and stop when you have passed n.",
            goal: {
              cases: [
                { regs: { R0: 4 }, out: [1, 2, 3, 4] },
                { regs: { R0: 1 }, out: [1] },
                { regs: { R0: 6 }, out: [1, 2, 3, 4, 5, 6] },
                { regs: { R0: 0 }, out: [] },
              ],
            },
          },
          explanation: "This is the shape of a `while` loop: test at the top, jump out when the test fails, otherwise run the body and `JMP` back. `CMP R1, R0` then `JGT done` reads as \"if i > n, stop\", the same as \"keep going while i ≤ n\". Testing at the top is what makes n = 0 output nothing.",
        },
        {
          kind: "recap",
          points: [
            "`CMP a, b` works out a − b only to set the flags: Z for equal, N for less.",
            "`JZ`, `JNZ`, `JLT` and `JGT` turn a comparison into a decision.",
            "An if/else is a conditional jump over one branch, plus a `JMP` over the other.",
            "A while loop tests at the top and jumps back at the bottom.",
          ],
        },
      ],
    },

    // ── Lesson 7 ──
    {
      id: "fnd-asm-7-stack",
      title: "The stack and function calls",
      summary: "PUSH and POP, return addresses, CALL and RET, and what a stack overflow really is.",
      minutes: 8,
      xp: 60,
      steps: [
        {
          kind: "explain",
          title: "A stack of plates",
          body: "A **stack** is a pile where you only touch the top. `PUSH R0` puts R0's value on top; `POP R2` takes the top value off into R2. The last value pushed is the first one popped.\n\nOur stack lives at the **top of memory** and grows downward. A register called **SP** (stack pointer) holds the address of the top value. It starts at 16, just past the end of memory, which means *empty*. Step through and watch SP and addresses 15 and 14.",
          widget: { type: "asm-cpu", props: { program: "MOV R0, #5\nMOV R1, #8\nPUSH R0\nPUSH R1\nPOP R2\nPOP R3\nHLT", locked: true, allow: ["MOV", "OUT", "HLT", "PUSH", "POP"] } },
        },
        {
          kind: "question",
          title: "Last in, first out",
          body: "After this program halts, what are R0, R1 and R2?",
          widget: { type: "asm-cpu", props: { program: "MOV R0, #1\nMOV R1, #2\nMOV R2, #3\nPUSH R0\nPUSH R1\nPUSH R2\nPOP R0\nPOP R1\nPOP R2\nHLT", locked: true, predict: true, allow: ["MOV", "OUT", "HLT", "PUSH", "POP"] } },
          question: { type: "choice", options: ["1, 2, 3: everything is back where it was", "3, 3, 3", "3, 2, 1", "1, 1, 1"], answer: 2 },
          explanation: "Last in, first out: 3 was pushed last, so the first `POP` (into R0) gets 3, then R1 gets 2, then R2 gets 1. The values come back **reversed**.",
        },
        {
          kind: "question",
          title: "Swap with the stack",
          body: "Swap R0 and R1 using only `PUSH` and `POP`.",
          widget: {
            type: "asm-cpu",
            props: { program: "; swap R0 and R1 with PUSH and POP\n\nHLT", regs: { R0: 3, R1: 8 }, inputs: ["R0", "R1"], allow: ["PUSH", "POP", "OUT", "HLT"], solution: "PUSH R0\nPUSH R1\nPOP R0     ; gets R1's value\nPOP R1     ; gets R0's value\nHLT" },
          },
          question: {
            type: "widget", hint: "PUSH both values, then POP them back in the opposite order.",
            goal: {
              cases: [
                { regs: { R0: 3, R1: 8 }, expectRegs: { R0: 8, R1: 3 } },
                { regs: { R0: 6, R1: 1 }, expectRegs: { R0: 1, R1: 6 } },
              ],
            },
          },
          explanation: "Push both, then pop in the same order you pushed. The first `POP` gets the last value pushed (R1's), so R0 ends up with R1's value and R1 with R0's. The stack did the job of the spare register.",
        },
        {
          kind: "explain",
          title: "Calling a function",
          body: "A function is a piece of code you can use from many places. The tricky part is getting **back**: when it finishes, the CPU must continue right after whichever line called it.\n\n- `CALL double` pushes the **return address** (the address of the next instruction) onto the stack, then jumps to `double`\n- `RET` pops that address back into the PC\n\nStep through and watch the return address appear on the stack and disappear again. `double` is used twice and goes back to a different place each time.",
          widget: { type: "asm-cpu", props: { program: DOUBLE, locked: true, allow: STACK } },
        },
        {
          kind: "question",
          title: "Where does it come back to?",
          body: "When the **second** `CALL double` runs, what return address does it push onto the stack? Use the addresses on the left.",
          widget: { type: "asm-cpu", props: { program: DOUBLE, locked: true, predict: true, allow: STACK } },
          question: { type: "number", hint: "CALL pushes the address of the instruction right after the CALL.", answer: 5 },
          explanation: "The second `CALL double` is at address 4, so the next instruction (`OUT R0`) is at address **5**. That's what gets pushed, and it's where `RET` lands afterwards. The first call pushed 2. The function doesn't know who called it; the stack remembers for it.",
        },
        {
          kind: "question",
          title: "Write a function",
          body: "Write the body of `triple`: it should multiply R0 by 3 and return. The main program is already done.",
          widget: {
            type: "asm-cpu",
            props: {
              program: "    MOV R0, #2\n    CALL triple\n    OUT R0\n    MOV R0, #5\n    CALL triple\n    OUT R0\n    HLT\ntriple:\n    ; R0 = R0 × 3, then return\n",
              allow: STACK,
              solution: "    MOV R0, #2\n    CALL triple\n    OUT R0\n    MOV R0, #5\n    CALL triple\n    OUT R0\n    HLT\ntriple:\n    MOV R1, R0\n    ADD R0, R1\n    ADD R0, R1\n    RET",
            },
          },
          question: { type: "widget", hint: "Triple is R0 + R0 + R0. Finish the body with a return.", goal: { out: [6, 15] } },
          explanation: "Copy R0 to a spare register and add the copy twice (or double R0 and add the copy once). Without `RET` at the end, the CPU would run on past the function instead of going back to the caller.",
        },
        {
          kind: "question",
          title: "Borrowed registers",
          body: "Suppose the main program keeps an important number in R1, then calls your `triple`, which uses R1 as scratch space. What happens, and what's the usual fix?",
          question: {
            type: "choice",
            options: [
              "Nothing: each function gets its own registers",
              "The CPU spots the clash and stops with an error",
              "The caller's R1 is overwritten. The fix: `triple` PUSHes R1 at the start and POPs it back just before RET",
              "R1 is put back automatically by RET",
            ],
            answer: 2,
          },
          explanation: "There's only one set of registers, shared by all the code. A function that borrows a register should save it on the stack first and restore it before returning. Compilers follow agreed rules, called a **calling convention**, about which registers a function must leave as it found them.",
        },
        {
          kind: "explain",
          title: "Stack overflow",
          body: "Every `CALL` uses one more stack slot until its `RET` gives it back. A function that calls itself with no way to stop keeps pushing return addresses until the stack runs out of room: a **stack overflow**. Press **Run** and watch the stack fill the memory.\n\nPython guards against this: very deep recursion stops with a `RecursionError` before the real stack runs out.",
          widget: { type: "asm-cpu", props: { program: "    CALL forever\n    HLT\nforever:\n    CALL forever", locked: true, allow: STACK } },
        },
        {
          kind: "recap",
          points: [
            "The stack is last in, first out: `PUSH` puts a value on top, `POP` takes the top one off.",
            "SP holds the address of the top of the stack; ours grows down from the end of memory.",
            "`CALL` pushes the return address and jumps; `RET` pops it back into the PC.",
            "Functions share the registers, so they save the ones they borrow with `PUSH` and `POP`.",
            "Recursion that never stops fills the stack: a stack overflow.",
          ],
        },
      ],
    },

    // ── Lesson 8 ──
    {
      id: "fnd-asm-8-python",
      title: "From Python to assembly",
      summary: "A Python loop and its machine-level twin, where variables go, and compilers versus interpreters.",
      minutes: 8,
      xp: 60,
      steps: [
        {
          kind: "explain",
          title: "One line, many instructions",
          body: "Here's a short Python loop, and assembly that a compiler could produce for it, with `total` in R0 and `i` in R1. Step through and watch which Python line each instruction belongs to.",
          widget: { type: "asm-cpu", props: { program: SUM_ASM, python: SUM_PY, pyLines: SUM_MAP, locked: true, allow: BRANCH } },
        },
        {
          kind: "question",
          title: "Count the work",
          body: "The Python version is 6 lines. How many instructions will the CPU execute to run the assembly version to the end?",
          widget: { type: "asm-cpu", props: { program: SUM_ASM, python: SUM_PY, pyLines: SUM_MAP, locked: true, predict: true, allow: BRANCH } },
          question: { type: "choice", options: ["6", "11", "31", "About 500"], answer: 2 },
          explanation: "2 to set up, then 5 per pass (CMP, JGT, ADD, ADD, JMP) for 5 passes, then a last CMP and JGT that exit, then OUT and HLT: 2 + 25 + 2 + 2 = **31**. Press Run and look at the step counter. Lines inside a loop cost instructions every time around.",
        },
        {
          kind: "question",
          title: "Where did the names go?",
          body: "The machine code contains no `total` and no `i`. What happened to the variable names?",
          question: {
            type: "choice",
            options: [
              "They're stored next to each instruction so the CPU can look them up",
              "They became labels like `loop`",
              "The compiler gave each variable a place, a register or a memory address, and the names were thrown away",
              "The CPU can only work with one variable at a time",
            ],
            answer: 2,
          },
          explanation: "Names are for people. A compiler decides where each variable lives (here R0 and R1; with more variables, memory addresses) and writes those locations into the instructions. Labels go the same way: `loop` became address 2.",
        },
        {
          kind: "explain",
          title: "Compilers and interpreters",
          body: "A **compiler** translates a whole program into machine code before it runs. C, C++, Rust and Go work this way: you compile once, and then the CPU runs the machine code directly.\n\nPython (the usual version, called CPython) works differently. It first turns your code into **bytecode**: simple instructions for an imaginary machine. Then a program called the **interpreter**, which is itself compiled machine code, reads the bytecode one instruction at a time and carries each one out. That extra layer is a big reason a Python loop runs many times slower than the same loop in C.",
        },
        {
          kind: "question",
          title: "Who runs what?",
          body: "Which of these is true?",
          question: {
            type: "choice",
            options: [
              "A CPU can read Python directly if the program is simple enough",
              "A compiled C program runs as machine code; a Python program is carried out by an interpreter, a machine-code program that reads its bytecode",
              "Interpreted programs don't need the CPU",
              "Compiling and interpreting run equally fast; only the file names differ",
            ],
            answer: 1,
          },
          explanation: "Everything ends up as machine code on the CPU. The difference is *when* and *how*: translated ahead of time (a compiler), or carried out by a go-between program while it runs (an interpreter).",
        },
        {
          kind: "question",
          title: "A familiar loop",
          body: "Inside CPython's interpreter is a loop that keeps doing three things: get the next bytecode instruction, work out which one it is, carry it out. What does that remind you of?",
          question: { type: "choice", options: ["A stack overflow", "The assembler", "The CPU's fetch-decode-execute cycle, done in software", "A conditional jump"], answer: 2 },
          explanation: "It's the same cycle one level up. The CPU fetches, decodes and executes machine code; the interpreter fetches, decodes and executes bytecode, and every bytecode step costs many real machine instructions.",
        },
        {
          kind: "question",
          title: "Be the compiler",
          body: "Translate this Python into assembly. `n` is already in R0.\n```python\nwhile n > 0:\n    print(n + n)\n    n = n - 1\n```\nFor n = 4 it prints 8, 6, 4, 2. For n = 0 it prints nothing.",
          widget: {
            type: "asm-cpu",
            props: {
              program: "; n is in R0\n\nHLT",
              python: "while n > 0:\n    print(n + n)\n    n = n - 1",
              regs: { R0: 4 },
              inputs: ["R0"],
              allow: BRANCH,
              solution: "loop:\n    CMP R0, #0      ; while n > 0:\n    JLT done\n    JZ done\n    MOV R1, R0      ;     print(n + n)\n    ADD R1, R0\n    OUT R1\n    SUB R0, #1      ;     n = n - 1\n    JMP loop\ndone:\n    HLT",
            },
          },
          question: {
            type: "widget", hint: "A while loop: check n > 0, output n + n, subtract 1 from n, jump back to the check.",
            goal: {
              cases: [
                { regs: { R0: 4 }, out: [8, 6, 4, 2] },
                { regs: { R0: 1 }, out: [2] },
                { regs: { R0: 0 }, out: [] },
              ],
            },
          },
          explanation: "Test at the top (`CMP R0, #0`, and jump out unless n > 0), then the body, then `JMP loop`. `n + n` needs a scratch register so that printing doesn't change n itself. Your version may differ, and that's fine: compilers make choices too, and a good one picks the fastest version it can prove gives the same result.",
        },
        {
          kind: "recap",
          points: [
            "One line of Python can become several instructions, and a loop runs them again on every pass.",
            "Compilers turn variables into registers and addresses, and labels into plain addresses. The names are gone.",
            "A **compiler** translates to machine code ahead of time (C, C++, Rust, Go).",
            "CPython compiles to **bytecode** and an **interpreter** runs it: fetch-decode-execute in software, which is why it's slower.",
            "Whatever language you write, the CPU only ever runs machine code.",
          ],
        },
      ],
    },
  ],
};
