import type { ConceptLesson } from "../../learn/types.ts";

/** Fenced assembly block. */
const asm = (s: string) => "~~~asm\n" + s.trim() + "\n~~~";
/** Paragraphs joined with blank lines. */
const P = (...paras: string[]) => paras.join("\n\n");

/** "The instruction set and who may run what": sits after lesson 3 (Intermediate). */
export const cpuIsaLesson: ConceptLesson = {
  id: "fnd-cpu-12-isa-privilege",
  title: "The instruction set, and who may run what",
  summary: "RISC and CISC, x86, Arm and RISC-V, how a core cracks instructions into micro-ops, user and kernel mode, and what a system call costs.",
  level: "Intermediate",
  minutes: 9,
  xp: 60,
  steps: [
    {
      kind: "explain",
      title: "A contract between software and chip",
      body: P(
        "The **instruction set architecture (ISA)** is the list of instructions a CPU promises to understand, the registers they use and how they name memory. It is a contract: a compiler writes to the ISA, and any chip that implements it runs the program. How a chip keeps the promise inside (its pipeline, predictors, caches) is its **microarchitecture**, which can change every generation.",
        "Three ISA families matter most today. **x86-64** (Intel and AMD) runs most PCs and servers. **Arm** (AArch64) runs nearly every phone, Apple's Macs and a growing share of servers. **RISC-V** is an open standard anyone may implement, common in microcontrollers and spreading upwards.",
        "They differ in style. x86 is **CISC** (complex instruction set): instructions are 1 to 15 bytes long and many can do arithmetic straight on memory. Arm and RISC-V are **RISC** (reduced instruction set): fixed 4-byte instructions (RISC-V adds an optional 2-byte form), and only **loads and stores** touch memory. Here is `total += a[i]` (32-bit numbers) on each:",
        asm(`; x86-64: one instruction reads memory and adds
add  eax, [rdi + rcx*4]

; AArch64: load, then add
ldr  w8, [x0, x1, lsl #2]
add  w2, w2, w8

; RISC-V (RV64): work out the address, load, add
slli t0, a1, 2
add  t0, a0, t0
lw   t1, 0(t0)
addw a2, a2, t1`),
        "More instructions does not mean slower: simple, regular instructions are easier to decode and pipeline. You met this style of code in *Assembly: talking to the CPU*.",
      ),
    },
    {
      kind: "question",
      title: "Spot the load/store style",
      body: "Which of these is a trait of a **load/store** (RISC-style) ISA such as RISC-V?",
      question: {
        type: "choice",
        options: [
          "Arithmetic can read its operand straight from memory",
          "Instruction lengths vary from 1 to 15 bytes",
          "Only loads and stores touch memory; maths uses registers",
          "It needs fewer instructions for the same C code",
        ],
        answer: 2,
        hint: "Look at the RISC-V version of total += a[i]: which instruction touched memory?",
        feedback: {
          0: "That is the CISC style: x86's add eax, [mem] does a load and an add in one instruction.",
          1: "Variable lengths of 1 to 15 bytes are x86. Arm and RISC-V use fixed 4-byte instructions (plus RISC-V's optional 2-byte ones).",
          3: "Usually the opposite: the RISC-V version above needed four instructions where x86 needed one.",
        },
      },
      explanation: "In a **load/store** ISA only `load` and `store` instructions touch memory; everything else works on registers. That keeps each instruction simple and the same size, which makes the decoder small and the pipeline regular.",
    },
    {
      kind: "explain",
      title: "Inside, everyone runs micro-ops",
      body: P(
        "A modern x86 core does not execute `add eax, [rdi + rcx*4]` as one step. Its decoder **cracks** it into simpler internal operations called **micro-ops** (µops): here, usually a load µop and an add µop. The out-of-order engine you will meet in *Superscalar and out-of-order* schedules µops, not x86 instructions.",
        "Decoding x86 is the hard part: an instruction can start at any byte and be 1 to 15 bytes long, so finding where the next four or more instructions begin, every cycle, takes a lot of logic and power. That is why x86 cores keep a **micro-op cache** of already-decoded instructions, so hot loops skip the decoders. Some high-end Arm cores crack instructions too, and some have had a micro-op cache, but fixed-length instructions make their decoders far simpler.",
        "So the line between RISC and CISC has blurred: inside, both are out-of-order cores running µops. The ISA still matters for decoder cost, code size, and above all the software that already exists for it.",
      ),
    },
    {
      kind: "question",
      title: "Why cache decoded work?",
      body: "Why do modern x86 cores keep a cache of already-decoded micro-ops?",
      question: {
        type: "choice",
        options: [
          "To keep copies of data that missed in the L1 cache",
          "Decoding variable-length x86 is slow and power-hungry",
          "To let user programs run kernel instructions safely",
          "Because x86 instructions are all exactly 4 bytes long",
        ],
        answer: 1,
        hint: "What makes it hard to find where each x86 instruction starts?",
        feedback: {
          0: "Data that misses L1 is held by L2 and L3. The micro-op cache holds decoded instructions, not data.",
          2: "Privilege has nothing to do with it. Decoded micro-ops follow the same rules as the instructions they came from.",
          3: "That is the RISC style. x86 instructions vary from 1 to 15 bytes, which is exactly why decoding is costly.",
        },
      },
      explanation: "Finding instruction boundaries in a stream of 1-to-15-byte instructions, several per cycle, is expensive. A **micro-op cache** keeps the decoded result for hot code, saving decoder work and power and feeding the back end faster.",
    },
    {
      kind: "explain",
      title: "User mode and kernel mode",
      body: P(
        "Your program shares the machine with the operating system and other programs, so it must not be able to do everything. The CPU has a **privilege level**, a few bits of state saying how trusted the running code is. Ordinary programs run in **user mode**. The operating system's core, the **kernel**, runs in **kernel mode** (also called supervisor mode).",
        "Some instructions are **privileged**: changing which page table the CPU uses, switching interrupts off, talking directly to devices. Run one in user mode and the CPU refuses and raises an **exception** instead. The page tables from *Virtual memory* carry a 'user may access this page' bit for the same reason: kernel memory is marked off-limits to user mode.",
        "The names differ by ISA. x86 has **rings** 0 to 3 (operating systems use ring 0 for the kernel and ring 3 for programs). Arm has **exception levels**: EL0 for apps, EL1 for the kernel, EL2 for a hypervisor, EL3 for secure firmware. RISC-V has **U**, **S** and **M** modes (user, supervisor, machine).",
      ),
    },
    {
      kind: "question",
      title: "Who is allowed?",
      body: "Sort each action by the lowest privilege that may do it.",
      widget: {
        type: "pattern-sorter",
        props: {
          buckets: [
            { id: "user", label: "User mode can", hint: "any program" },
            { id: "kernel", label: "Kernel only", hint: "privileged" },
          ],
          items: [
            { id: "a", text: "Add two registers" },
            { id: "b", text: "Point the CPU at a different page table" },
            { id: "c", text: "Load a value from the program's own stack" },
            { id: "d", text: "Switch interrupts off" },
            { id: "e", text: "Write straight to a disk controller's registers" },
            { id: "f", text: "Call one of the program's own functions" },
          ],
          answer: { a: "user", b: "kernel", c: "user", d: "kernel", e: "kernel", f: "user" },
        },
      },
      question: {
        type: "widget",
        goal: { placed: { a: "user", b: "kernel", c: "user", d: "kernel", e: "kernel", f: "user" } },
        hint: "Ask: could this action let one program break the machine or spy on another? If so, only the kernel may do it.",
      },
      explanation: "Arithmetic, your own memory and your own functions are fine in user mode. Anything that changes **how memory is mapped**, **stops interrupts** (which would let a program hog the CPU) or **touches hardware** directly is privileged, so a buggy or hostile program cannot take over the machine.",
    },
    {
      kind: "explain",
      title: "Three ways into the kernel",
      body: P(
        "The CPU switches to kernel mode in three situations. A **system call** is a deliberate request: the program puts a call number and arguments in registers and runs a special instruction (`syscall` on x86-64, `svc` on Arm, `ecall` on RISC-V). An **exception** is caused by the instruction itself: a page fault, a divide by zero, an illegal instruction. An **interrupt** comes from outside: a timer tick or a device with data ready.",
        "Each time, the CPU saves where it was, raises the privilege level and jumps to an entry point that **the kernel** set up earlier, so a program cannot choose where kernel code starts. When the kernel is done, a return instruction (`sysret`, `eret`, `sret`) drops back to user mode.",
        "That round trip is not free: on current desktop and server chips a minimal system call typically costs on the order of a hundred to a few hundred nanoseconds, more with some security settings. Below, a program writes 64 KiB of output in small pieces. Try the batch sizes.",
      ),
      widget: { type: "cpuarch-syscall", props: { batches: [1, 16, 256] } },
    },
    {
      kind: "question",
      title: "Batch the writes",
      body: "Choose a batch size so that **under 20%** of the cycles go on entering and leaving the kernel.",
      widget: { type: "cpuarch-syscall", props: {} },
      question: { type: "widget", goal: { maxOverheadShare: 0.2 }, hint: "Every call pays the same toll however few bytes it carries. Fewer, bigger calls pay it fewer times." },
      explanation: "With 4 KiB per call the program makes only 16 calls, so the toll is about 13% of the cycles; with 1-byte writes it is over 99%. This is why C's `stdio` and Python's file objects **buffer** output and hand it to the kernel in big chunks.",
    },
    {
      kind: "question",
      title: "One system call, start to finish",
      body: "Put the steps of a system call in order.",
      question: {
        type: "order",
        items: [
          "The program puts the call number and arguments in registers",
          "It runs the system-call instruction (ecall on RISC-V)",
          "The CPU raises the privilege level and jumps to the kernel's entry point",
          "The kernel checks the arguments and does the work",
          "A return instruction drops back to user mode, just after the call",
        ],
        hint: "The program prepares, the CPU switches, the kernel works, the CPU switches back.",
      },
      explanation: "The program asks, the **CPU** does the switch (to an address only the kernel chose), the **kernel** checks everything it was handed (a program may pass bad pointers on purpose) and does the work, and the return instruction puts the program back in user mode.",
    },
    {
      kind: "recap",
      points: [
        "The **ISA** is the contract (instructions, registers, addressing); the **microarchitecture** is how one chip fulfils it.",
        "**x86-64** is CISC: 1-to-15-byte instructions that can work on memory. **Arm** and **RISC-V** are RISC: fixed-size instructions, and only loads and stores touch memory.",
        "Cores crack instructions into **micro-ops**; x86 keeps a **micro-op cache** because its decoding is costly.",
        "**User mode** cannot run privileged instructions; the **kernel** can. System calls, exceptions and interrupts all enter the kernel at addresses it chose, and each round trip costs time, so batch your system calls.",
      ],
    },
  ],
};

/** "Hardware security: when speed leaks secrets": the module's last lesson (Professional). */
export const cpuSecurityLesson: ConceptLesson = {
  id: "fnd-cpu-11-hardware-security",
  title: "Hardware security: when speed leaks secrets",
  summary: "Side channels in timing, caches and power, how speculative execution leaked memory (Spectre and Meltdown), fault injection, and what each mitigation costs.",
  level: "Professional",
  minutes: 12,
  xp: 90,
  steps: [
    {
      kind: "explain",
      title: "Leaks that are not in the output",
      body: P(
        "Every speed trick in this module keeps **shared state** that depends on what ran before: caches remember which lines were used (*Cache lines and locality*), branch predictors remember which way branches went (*Branch prediction: guessing the future*), the TLB remembers recent translations (*TLB and page faults*). That state changes **how long** things take.",
        "A **side channel** is information that escapes through a property other than the program's real output: its timing, its effect on a shared cache, the power it draws, even the radio noise it gives off. If a secret decides how long code takes, someone who can measure the time can learn something about the secret.",
        "The simplest case is ordinary code. A password check that stops at the first wrong character answers faster when the first character is wrong, and a little slower for each correct one. The fix is to make the time not depend on the secret: **constant-time** code.",
      ),
    },
    {
      kind: "code",
      title: "Compare in constant time",
      body: P(
        "Write `constant_time_equal(a, b)` for two byte strings. Return `True` only if they are identical. If the lengths differ, return `False` straight away (length is usually not the secret). Otherwise look at **every** byte pair, whatever you find, and decide only at the end.",
        "A test hands your function strings that record which positions you read, so an early exit is caught.",
      ),
      language: "python",
      starter: `def constant_time_equal(a, b):
    # your code here
    return None
`,
      solution: `def constant_time_equal(a, b):
    if len(a) != len(b):
        return False
    diff = 0
    for x, y in zip(a, b):
        diff |= x ^ y
    return diff == 0
`,
      tests: [
        { id: "same", description: "Identical strings are equal", assertionCode: `assert constant_time_equal(b"secret42", b"secret42") is True, "identical strings should give True"` },
        { id: "differ", description: "A different first byte is not equal", assertionCode: `assert constant_time_equal(b"Xecret42", b"secret42") is False, "different strings should give False"` },
        { id: "length", description: "Different lengths are not equal", assertionCode: `assert constant_time_equal(b"secret", b"secret42") is False, "different lengths should give False"` },
        {
          id: "every",
          description: "Reads every byte even when the first one differs",
          assertionCode: `class Spy:
    def __init__(self, data):
        self.data = data
        self.seen = set()
    def __len__(self):
        return len(self.data)
    def __getitem__(self, i):
        self.seen.add(i)
        return self.data[i]
    def __iter__(self):
        for i in range(len(self.data)):
            yield self[i]
x, y = Spy(b"Xbcdefgh"), Spy(b"abcdefgh")
assert constant_time_equal(x, y) is False, "different strings should give False"
assert x.seen == set(range(8)) and y.seen == set(range(8)), f"every byte must be read, read only {sorted(x.seen)}"`,
        },
      ],
      hints: ["XOR of two equal bytes is 0. OR every XOR result into one running value.", "Return whether that running value is still 0, after the loop."],
    },
    {
      kind: "explain",
      title: "When speculation leaves footprints",
      body: P(
        "In *Superscalar and out-of-order* you saw that work done down a mispredicted path is thrown away, so the program's registers and memory end up exactly as if it never ran. In 2018 researchers published **Spectre** and **Meltdown**, which showed the catch: the rollback covers *architectural* state (registers, memory), but not *microarchitectural* state such as which lines are now in the cache.",
        "**Spectre** abuses prediction. If a predictor can be trained to guess wrong, the core briefly runs code the program never meant to run, for example reading past an array's bounds check before the check resolves. That wrong-path work is discarded, but if it touched cache lines chosen by a secret value, a later timing measurement can reveal which lines are warm, and so something about the secret.",
        "**Meltdown** hit certain chips harder: a user-mode load from kernel memory would eventually fault, but on affected cores the value was passed to dependent instructions before the permission check took effect, leaving the same kind of cache footprint. Kernels of that era mapped all kernel memory into every program's page tables (marked kernel-only), so this exposed it.",
        "Both are about **design**, not bugs in one program: any core that speculates and shares caches has to be checked for them. Fixes therefore come in layers: chip design, microcode updates, the operating system, compilers and even browsers.",
      ),
    },
    {
      kind: "question",
      title: "Why the rollback is not enough",
      body: "A mispredicted path is thrown away before it retires. Why can it still leak information?",
      question: {
        type: "choice",
        options: [
          "Its results are written to registers before the check",
          "Mispredicted instructions retire before the check",
          "Rolling back restores registers, not cache contents",
          "Speculation runs in kernel mode with no checks",
        ],
        answer: 2,
        hint: "Which kind of state does the reorder buffer undo, and which kind does it leave alone?",
        feedback: {
          0: "Wrong-path results never become official: the registers you can see end up as if nothing happened.",
          1: "They never retire at all. Retiring in order is exactly what lets the core discard them.",
          3: "Speculation runs at the program's own privilege. The issue is what it leaves behind, not extra rights.",
        },
      },
      explanation: "The reorder buffer undoes **architectural** state (registers, memory). It does not evict the cache lines that wrong-path loads brought in, and their timing can be measured afterwards. That gap between 'what the program sees' and 'what the hardware remembers' is the whole class of problem.",
    },
    {
      kind: "explain",
      title: "The mitigations, and their price",
      body: P(
        "- **Kernel page-table isolation (KPTI).** While a program runs, its page tables map almost none of the kernel, so there is nothing kernel-side to read. Each kernel entry and exit now switches page tables. Without help that flushes the **TLB** each time; **PCID** (process-context IDs, x86's name for tagged TLB entries) lets entries from both tables stay. This mainly fixes Meltdown, and newer chips are not affected in hardware.\n- **Indirect-branch protection.** Retpolines (a compiler trick that stops the predictor steering an indirect jump) or hardware controls such as IBRS stop one program training the predictor to misdirect another (Spectre variant 2).\n- **Fences and index masking** on bounds checks that guard secrets (Spectre variant 1), for example Linux's `array_index_nospec`. Applied by hand or by compilers to the risky spots, not everywhere.\n- **Turning SMT off** on hosts shared between customers, because two hyper-threads on one core share its caches and buffers (*Many cores: why 8 cores is not 8x faster*).\n- **Process isolation and coarser timers**: browsers put each site in its own process and reduced timer precision.",
        "Each fix costs speed, and the cost depends on the workload: code that enters the kernel often pays most for KPTI.",
      ),
    },
    {
      kind: "question",
      title: "What isolation costs a busy server",
      body: "A server makes **200,000 system calls a second** on one core. Say page-table isolation adds a toy **0.5 µs** to each call (switching page tables in and out, plus TLB refills). What **percentage** of that core's time goes on the extra work? Work out the percent.",
      question: { type: "number", answer: 10, tolerance: 0.5, unit: "%", hint: "Extra time per second = calls per second × extra time per call. Compare it with one second." },
      explanation: "200,000 × 0.5 µs = 0.1 s of extra work every second: **10%** of the core. A compute job that makes a few hundred calls a second would barely notice. That is why the same mitigation can be 'free' on one machine and painful on another, and why PCID mattered so much.",
    },
    {
      kind: "question",
      title: "Harden a shared server",
      body: "This server runs code from several customers. Close the three **required** leaks with a slowdown of **8% or less**.",
      widget: { type: "cpuarch-mitigate", props: { workload: "server" } },
      question: {
        type: "widget",
        goal: { closes: ["meltdown", "spectre-v1", "spectre-v2"], maxOverhead: 8 },
        prompt: "Close every required leak with a slowdown of 8% or less.",
        hint: "Each leak has its own fix. One option closes no leak but makes another fix much cheaper on a server like this.",
      },
      explanation: "KPTI with PCID, indirect-branch protection and fences on the risky bounds checks close all three for a toy 4 + 3 + 1 = **8%**. Without PCID the same set costs 16%. Turning SMT off would also close the cross-thread leak, at a large throughput cost: on shared cloud hosts some operators pay it, others schedule one customer per core instead.",
    },
    {
      kind: "explain",
      title: "Power, radio noise and faults",
      body: P(
        "On small chips such as smart cards and microcontrollers, an attacker with the device in hand has more options. The **current** a chip draws changes slightly with the data it processes, and so do its **electromagnetic** emissions. With many measurements and statistics (**power analysis**, published in the late 1990s), keys can be pulled out of crypto code that has no protection.",
        "**Fault injection** works the other way round: briefly disturbing the chip (a dip in the supply voltage, a glitch on the clock, a laser pulse, or Rowhammer in DRAM) can make it skip or corrupt one instruction, such as the check of a firmware signature.",
        "Defences: **masking** (mixing secret values with fresh random numbers so the power trace does not follow them), constant-time code, hardware crypto engines built with countermeasures, **glitch and brown-out detectors** that reset the chip, security checks done **twice in different ways**, and dedicated **secure elements**. Products that need assurance are evaluated under schemes such as Common Criteria or FIPS 140-3 (examples). Every countermeasure costs chip area, power, speed or design time, so teams choose them from a threat model: who might attack, with what access, and what is it worth.",
      ),
    },
    {
      kind: "question",
      title: "Match the defence",
      body: "Sort each defence by the kind of attack it mainly answers.",
      widget: {
        type: "pattern-sorter",
        props: {
          buckets: [
            { id: "timing", label: "Timing and caches", hint: "time leaks" },
            { id: "power", label: "Power and EM", hint: "current leaks" },
            { id: "fault", label: "Fault injection", hint: "glitches" },
          ],
          items: [
            { id: "a", text: "Compare secrets in constant time" },
            { id: "b", text: "Mix crypto values with fresh random masks" },
            { id: "c", text: "Reset the chip when the supply dips" },
            { id: "d", text: "Keep the kernel out of user page tables" },
            { id: "e", text: "Check the signature twice, in two ways" },
            { id: "f", text: "Filter and shield the crypto block's supply" },
          ],
          answer: { a: "timing", b: "power", c: "fault", d: "timing", e: "fault", f: "power" },
        },
      },
      question: {
        type: "widget",
        goal: { placed: { a: "timing", b: "power", c: "fault", d: "timing", e: "fault", f: "power" } },
        hint: "Ask whether the defence hides how long something takes, hides how much current it draws, or catches a disturbed chip.",
      },
      explanation: "Constant-time code and KPTI stop **timing** from depending on secrets. Masking and supply filtering stop the **power** trace from following the data. Glitch detectors and duplicated checks catch a **faulted** chip before a skipped instruction matters.",
    },
    {
      kind: "recap",
      points: [
        "A **side channel** leaks through timing, cache state, power or EM, not the output. The CPU's speed tricks keep exactly this kind of shared state.",
        "**Spectre** and **Meltdown** showed that rolled-back speculation still leaves **cache footprints**; the reorder buffer undoes registers and memory, not the cache.",
        "Mitigations are layered: **KPTI** (cheaper with **PCID**), indirect-branch protection, fences on risky bounds checks, SMT off on shared hosts, newer chips fixed in hardware. Their cost depends on the workload, so measure.",
        "On small devices, **power analysis** and **fault injection** matter too: masking, constant-time code, glitch detectors, duplicated checks and secure elements, chosen from a threat model. In Python, use `hmac.compare_digest` rather than your own compare, since the language itself makes no timing promises.",
      ],
    },
  ],
};
