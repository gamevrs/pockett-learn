import type { ConceptLesson } from "../../learn/types.ts";

/** Fenced C block. */
const c = (s: string) => "~~~c\n" + s.trim() + "\n~~~";
/** Fenced shell block. */
const sh = (s: string) => "~~~sh\n" + s.trim() + "\n~~~";
/** Paragraphs joined with blank lines. */
const P = (...paras: string[]) => paras.join("\n\n");

/** Programs for the scheduler widget: latency (cycles to a usable result) and the earlier instructions each one needs. */
const CHAIN = [
  { text: "A add r1", lat: 1, deps: [] },
  { text: "B add r2, r1", lat: 1, deps: [0] },
  { text: "C add r3, r2", lat: 1, deps: [1] },
  { text: "D add r4, r3", lat: 1, deps: [2] },
];
const INDEPENDENT = ["A", "B", "C", "D", "E", "F", "G", "H"].map((l, i) => ({ text: `${l} add r${i + 1}`, lat: 1, deps: [] as number[] }));
const MIXED = [
  { text: "A load r1", lat: 4, deps: [] },
  { text: "B add r2, r1", lat: 1, deps: [0] },
  { text: "C mul r3, r4", lat: 3, deps: [] },
  { text: "D add r5, r3", lat: 1, deps: [2] },
  { text: "E add r6, r7", lat: 1, deps: [] },
  { text: "F add r8, r6", lat: 1, deps: [4] },
];

/** Lessons 6 to 10 of "How a CPU runs your code": branch prediction, out-of-order, many cores, SIMD, measuring. */
export const cpuLessonsB: ConceptLesson[] = [
  // ─────────────────────────────── 6. Branch prediction ───────────────────────────────
  {
    id: "fnd-cpu-6-branch-prediction",
    title: "Branch prediction: guessing the future",
    summary: "What a wrong guess costs, how predictors learn patterns, the sorted-versus-shuffled-array effect, and branchless code.",
    level: "Intermediate",
    minutes: 10,
    xp: 60,
    steps: [
      {
        kind: "explain",
        title: "Guess now, check later",
        body: P(
          "The last lesson showed that a branch leaves the pipeline with nothing to fetch until the branch is worked out. Waiting wastes cycles, so the CPU **guesses**: it fetches along the path it *thinks* the branch will take, and keeps going. This is **branch prediction**.",
          "If the guess was right, nothing was lost. If it was wrong, everything fetched down the wrong path must be thrown away (the pipeline is **flushed**) and the right path started again. On modern desktop cores a wrong guess typically costs **10 to 20 cycles**.",
          "Below, a branch repeats a pattern 64 times. Each tile is T (taken) or N (not taken); a filled tile means the guess was wrong. Try the two simplest predictors: always say 'no', or always say 'yes'.",
        ),
        widget: { type: "cpuarch-branch", props: { patterns: ["loop"], predictors: ["static-not", "static-taken"] } },
      },
      {
        kind: "question",
        title: "Always 'no'",
        body: "This pattern is a loop that runs 8 times: taken 7 times, then not taken once, again and again. If the predictor always guesses 'not taken', how many of the **64** guesses are wrong?",
        question: { type: "number", answer: 56, hint: "In every group of 8, the predictor is right only when the branch is not taken. How often is that?" },
        explanation: "The loop branch is taken 7 times out of every 8, so guessing 'not taken' is wrong **56 times out of 64**. 'Always yes' would be wrong only 8 times. A predictor has to learn, and loops are an easy start.",
      },
      {
        kind: "explain",
        title: "Predictors that learn",
        body: P(
          "A real predictor remembers how each branch behaved. The simplest one is a **1-bit predictor**: guess whatever happened *last time*. A better one is a **2-bit saturating counter**: a number from 0 to 3. Each 'taken' nudges it up, each 'not taken' nudges it down, and it guesses 'taken' when it is 2 or 3. One odd outcome only moves it one step, so it does not change its mind straight away.",
          "Run both on the loop and compare.",
        ),
        widget: { type: "cpuarch-branch", props: { patterns: ["loop"], predictors: ["static-taken", "one-bit", "two-bit"], initialPredictor: "one-bit" } },
      },
      {
        kind: "question",
        title: "Learn the zig-zag",
        body: "Now the branch alternates taken, not taken, taken, not taken. Find the predictor that learns this pattern: **at most 5 wrong** out of 64.",
        widget: { type: "cpuarch-branch", props: { patterns: ["alternate"], predictors: ["static-not", "one-bit", "two-bit", "history"] } },
        question: { type: "widget", goal: { pattern: "alternate", maxMisses: 5 }, hint: "The simple counters keep getting fooled. One predictor remembers the last few outcomes as a pattern." },
        explanation: "The **pattern-history** predictor remembers the last few outcomes and keeps a separate counter for each pattern it sees. After a short learning phase it knows 'after taken, not taken comes taken'. Real predictors in modern cores are much bigger and combine several such tricks, so they learn long patterns too.",
      },
      {
        kind: "question",
        title: "Why the 1-bit one stumbles",
        body: "On the 8-trip loop, the 1-bit predictor is wrong **twice** per loop. Why?",
        question: {
          type: "choice",
          options: ["It is wrong when the loop exits, and then wrong again on the first branch of the next run because it just remembered 'not taken'", "It can not count to 8", "It guesses randomly", "It is only wrong at the very start of the program"],
          answer: 0,
          hint: "What does 'last time' say right after the loop has just exited?",
          feedback: {
            1: "It does not count at all. It only remembers the last outcome.",
            2: "It is perfectly deterministic: it repeats whatever happened last.",
            3: "It keeps being wrong in every loop, not just at the start.",
          },
        },
        explanation: "After the exit (not taken) the 1-bit predictor says 'not taken' for the next loop's first branch, which is wrong. The 2-bit counter only drops one step on the exit, still says 'taken', and stays right. That is the whole point of the extra bit.",
      },
      {
        kind: "explain",
        title: "The famous sorted-array effect",
        body: P(
          "Here is a real-world surprise. This loop counts the bytes that are 128 or more:",
          c(`for (int i = 0; i < n; i++)
    if (data[i] >= 128)
        count++;`),
          "On **sorted** data the answer to `data[i] >= 128` is 'no' for a long stretch, then 'yes' for a long stretch: easy to predict. On **shuffled** data it is a coin flip every time. The code and the data values are identical; only the order changed. In well-known experiments this kind of loop runs several times faster on sorted data (it depends on the compiler and chip).",
          "Compare the two with a 2-bit predictor. The cycles-wasted counter shows the cost.",
        ),
        widget: { type: "cpuarch-branch", props: { patterns: ["sorted", "unsorted"], predictors: ["two-bit"], initialPattern: "sorted", initialPredictor: "two-bit" } },
      },
      {
        kind: "question",
        title: "What the guesses cost",
        body: "With the 15-cycle penalty, how many **cycles** does the 2-bit predictor waste on the **sorted** data?",
        widget: { type: "cpuarch-branch", props: { patterns: ["sorted", "unsorted"], predictors: ["two-bit"], initialPattern: "unsorted", initialPredictor: "two-bit" }, after: true },
        question: { type: "number", answer: 30, hint: "Count the filled tiles on the sorted data and multiply by 15." },
        explanation: "Only **2** wrong guesses (once when the data flips from 'no' to 'yes', plus one warming up), so 2 × 15 = **30 cycles**. On the shuffled data it is wrong around 35 times out of 64, wasting hundreds of cycles for the same work.",
      },
      {
        kind: "explain",
        title: "Or remove the branch",
        body: P(
          "If a branch is unpredictable, one cure is to **not have a branch**. A **branchless** version turns the decision into arithmetic:",
          c(`count += (data[i] >= 128);   // the comparison gives 0 or 1`),
          "Compilers sometimes do this for you using a **conditional move** (an instruction that picks one of two values without jumping). The price: branchless code does the work for *both* outcomes every time, so it only wins when the branch is hard to predict. When the data is sorted or the pattern is regular, the plain branch is just as quick.",
          "The rule of thumb: **make branches predictable first** (sort, group, avoid data-dependent branches in hot loops), and reach for branchless tricks only after measuring.",
        ),
      },
      {
        kind: "code",
        title: "Write a 2-bit predictor",
        body: P(
          "Write `two_bit_misses(outcomes)`. `outcomes` is a list of booleans (`True` = taken). Start the counter at **1**. Before each outcome the predictor guesses `True` if the counter is **2 or more**. Count how many guesses are wrong. After each outcome, move the counter up by 1 if taken, down by 1 if not, but never below 0 or above 3.",
        ),
        language: "python",
        starter: `def two_bit_misses(outcomes):
    counter = 1
    misses = 0
    # for each outcome: guess, count a miss if wrong, then update the counter
    return len(outcomes) + 1  # placeholder: return misses once your loop works
`,
        solution: `def two_bit_misses(outcomes):
    counter = 1
    misses = 0
    for taken in outcomes:
        guess = counter >= 2
        if guess != taken:
            misses += 1
        if taken:
            counter = min(3, counter + 1)
        else:
            counter = max(0, counter - 1)
    return misses
`,
        tests: [
          { id: "alltaken", description: "Ten taken branches: only the first guess is wrong", assertionCode: `assert two_bit_misses([True] * 10) == 1, f"expected 1, got {two_bit_misses([True] * 10)}"` },
          { id: "nevertaken", description: "Never taken: the counter starts on the right side", assertionCode: `assert two_bit_misses([False] * 5) == 0, f"expected 0, got {two_bit_misses([False] * 5)}"` },
          { id: "zigzag", description: "Alternating outcomes fool a 2-bit counter every time", assertionCode: `assert two_bit_misses([True, False] * 4) == 8, f"expected 8, got {two_bit_misses([True, False] * 4)}"` },
          { id: "loop", description: "A loop of 4 repeated 3 times costs 4 misses", assertionCode: `assert two_bit_misses(([True] * 3 + [False]) * 3) == 4, f"expected 4, got {two_bit_misses(([True] * 3 + [False]) * 3)}"` },
        ],
        hints: ["The guess is `counter >= 2`.", "Use min(3, ...) and max(0, ...) to stop the counter going out of range."],
      },
      {
        kind: "recap",
        points: [
          "The CPU **predicts** each branch so the pipeline keeps fetching. A wrong guess flushes the pipeline and typically costs about 10 to 20 cycles.",
          "Predictors learn: a **2-bit counter** handles loops well; **history-based** predictors learn repeating patterns.",
          "Predictable data is fast data: the same loop can be several times faster on **sorted** input than on shuffled input.",
          "A **branchless** version removes the guess but always does both sides' work. Try predictable first, and measure before you get clever.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 7. Superscalar and out-of-order ───────────────────────────────
  {
    id: "fnd-cpu-7-superscalar-ooo",
    title: "Superscalar and out-of-order",
    summary: "Starting several instructions per cycle, running them out of order, the reorder buffer and register renaming, and where the parallelism runs out.",
    level: "Advanced",
    minutes: 10,
    xp: 70,
    steps: [
      {
        kind: "explain",
        title: "More than one lane",
        body: P(
          "A pipeline finishes at best **one** instruction per cycle. Modern cores are **superscalar**: they have several execution units side by side and can start **several instructions every cycle**. The number they can start at once is the **issue width**. Typical big cores today are around 4 to 8 wide (order of magnitude).",
          "But width only helps if there are independent instructions to start. Here is a chain where each instruction needs the result of the one before. Try widths 1, 2 and 4. Each row is an instruction; a 'go' tile is the cycle it starts.",
        ),
        widget: { type: "cpuarch-ooo", props: { program: CHAIN, chooseOrder: false } },
      },
      {
        kind: "question",
        title: "A chain does not care",
        body: "Four dependent additions at issue width 4. How many cycles does the chain take?",
        widget: { type: "cpuarch-ooo", props: { program: CHAIN, chooseOrder: false }, live: true },
        question: { type: "number", answer: 4, hint: "Each add has to wait for the one before it, however many lanes there are." },
        explanation: "**4 cycles**, the same as at width 1. The amount of work that *can* run side by side is the program's **instruction-level parallelism (ILP)**, and a dependency chain has an ILP of 1. Extra lanes sit empty.",
      },
      {
        kind: "explain",
        title: "Independent work uses the lanes",
        body: P(
          "Now eight instructions that do not depend on each other. With one lane they take 8 cycles; with wider issue they overlap. The speed-up is limited by **how many independent instructions the code offers**, not by how wide the core is.",
        ),
        widget: { type: "cpuarch-ooo", props: { program: INDEPENDENT, chooseOrder: false } },
      },
      {
        kind: "question",
        title: "Use all four lanes",
        body: "Set the width so the eight independent instructions finish in the fewest possible cycles.",
        widget: { type: "cpuarch-ooo", props: { program: INDEPENDENT, chooseOrder: false } },
        question: { type: "widget", goal: { width: 4, maxCycles: 2 }, hint: "Eight instructions at four per cycle take two cycles." },
        explanation: "Four lanes each handling two instructions: **2 cycles**, an IPC of 4. That is the dream. Real programs usually reach an IPC of 1 to 3 on a wide core, because dependencies and cache misses get in the way.",
      },
      {
        kind: "explain",
        title: "Out of order: do not wait in line",
        body: P(
          "Now a realistic mix. A **load** takes 4 cycles; a **multiply** takes 3. In **in-order** issue, instruction B (which needs the load) blocks everything behind it, even instructions C to F that need nothing from A.",
          "An **out-of-order** core keeps a window of waiting instructions and starts any whose inputs are ready, whatever their position. Compare the two.",
        ),
        widget: { type: "cpuarch-ooo", props: { program: MIXED } },
      },
      {
        kind: "question",
        title: "Look ahead",
        body: "Find a setting that runs this code in **5 cycles or fewer**.",
        widget: { type: "cpuarch-ooo", props: { program: MIXED } },
        question: { type: "widget", goal: { outOfOrder: true, maxCycles: 5 }, hint: "In order never gets below 7 cycles here. You need both looking ahead and more than one lane." },
        explanation: "Out of order at width 2 or more takes **5 cycles**, against 9 cycles in order at width 2. The slow load keeps running while the multiply and the independent adds sail past it.",
      },
      {
        kind: "explain",
        title: "Tricks that make it safe",
        body: P(
          "Running instructions in a different order sounds dangerous, so the hardware protects you with two ideas.",
          "- **Register renaming.** Two instructions can reuse the same register *name* without really depending on each other (`r1` is just a label for a short-lived value). The CPU gives each new value a fresh hidden register, which removes these false dependencies.\n- **The reorder buffer (ROB).** Instructions may *execute* in any order, but they **retire** (become official) strictly in program order, as if the order had never changed. If something goes wrong, such as a mispredicted branch, the CPU simply throws away everything younger. Big cores track hundreds of instructions in flight (order of magnitude).",
          "From your program's point of view nothing changed. It still looks like one instruction after another.",
        ),
      },
      {
        kind: "question",
        title: "What renaming buys",
        body: "What problem does **register renaming** solve?",
        question: {
          type: "choice",
          options: ["It makes registers bigger", "It lets the CPU skip the decode stage", "Reusing a register name no longer forces instructions to wait for each other", "It speeds up the clock"],
          answer: 2,
          hint: "Think about two unrelated calculations that both happen to use the register called r1.",
          feedback: {
            0: "Renaming does not change register size; it gives extra hidden registers to hand out.",
            1: "Every instruction is still decoded. Renaming happens right after decode.",
            3: "The clock is unrelated. Renaming removes waiting between instructions, so more can run each tick.",
          },
        },
        explanation: "Without renaming, the second use of `r1` would have to wait for the first to finish with it, even though the values are unrelated. With hidden registers the two live side by side, exposing more ILP.",
      },
      {
        kind: "question",
        title: "Follow an instruction",
        body: "Put the life of an instruction on an out-of-order core in order.",
        question: {
          type: "order",
          items: [
            "Fetched and decoded in program order",
            "Registers renamed, entered in the reorder buffer",
            "Started as soon as its inputs are ready (any order)",
            "Executed in an execution unit",
            "Retired in program order",
          ],
          hint: "In order at the start, out of order in the middle, in order again at the end.",
        },
        explanation: "The core is in-order at both ends and out-of-order in the middle. Because results only become official when they **retire in order**, a wrong guess or an error can be undone cleanly.",
      },
      {
        kind: "recap",
        points: [
          "A **superscalar** core starts several instructions per cycle; the count is its **issue width**.",
          "Width only helps with independent work: a dependency chain has **ILP** of 1 however many lanes you have.",
          "**Out-of-order** execution starts any instruction whose inputs are ready; the **reorder buffer** makes results retire in program order, and **register renaming** removes false dependencies.",
          "Real limits: dependency chains, branch mispredicts and cache misses. That is why IPC on real programs is usually 1 to 3 even on very wide cores.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 8. Many cores ───────────────────────────────
  {
    id: "fnd-cpu-8-many-cores",
    title: "Many cores: why 8 cores is not 8x faster",
    summary: "Threads versus cores, hyper-threading (SMT), and Amdahl's law: the serial part of a job sets the speed limit.",
    level: "Advanced",
    minutes: 9,
    xp: 70,
    steps: [
      {
        kind: "explain",
        title: "Cores, threads and SMT",
        body: P(
          "A **core** is a complete CPU: its own pipeline, registers and execution units. A chip with 8 cores can run 8 things truly at the same moment. A **thread** is one stream of instructions your program (or the operating system) can run; the scheduler you met in the Unix lessons hands threads to cores.",
          "Many chips also have **SMT** (simultaneous multithreading; Intel calls it Hyper-Threading). One core pretends to be two, with a separate set of registers for each thread but **the same execution units shared**. When one thread is stalled (say, on a cache miss), the other can use the units that would have sat idle.",
        ),
      },
      {
        kind: "question",
        title: "Is SMT a second core?",
        body: "A 4-core chip with SMT shows up as 8 logical processors. Running 8 busy threads on it, compared to 4 threads on the same chip, is usually:",
        question: {
          type: "choice",
          options: ["Exactly twice as fast", "Often somewhat faster (tens of percent), but nowhere near twice", "Always slower", "The same speed, since the hardware is shared"],
          answer: 1,
          hint: "The two threads share one set of execution units, so they only help each other when one would otherwise be idle.",
          feedback: {
            0: "That would need a real second core. SMT threads share the same execution units, so they mostly fill idle gaps.",
            2: "Not always. SMT helps when a thread stalls, and the other thread uses the gap.",
            3: "There is a gain, because stalled cycles get used. It is just much smaller than a second core would give.",
          },
        },
        explanation: "SMT squeezes more out of one core by filling idle slots. The gain depends heavily on the workload: typically tens of percent, and sometimes close to nothing for code that already keeps the units busy. It is not a second core.",
      },
      {
        kind: "explain",
        title: "Amdahl's law",
        body: P(
          "Say a job takes 10 seconds, and 90% of it can be split across cores while 10% has to run in a single line (reading the input, combining the answers). Even with infinite cores the 1 second of serial work remains. That is **Amdahl's law**:",
          "**speedup = 1 ÷ ((1 − p) + p ÷ n)**, where **p** is the share that runs in parallel and **n** is the number of cores.",
          "Drag the sliders. Notice how fast the curve flattens.",
        ),
        widget: { type: "cpuarch-amdahl", props: { parallel: 90, cores: 8 } },
      },
      {
        kind: "question",
        title: "Beat 5x on 8 cores",
        body: "With 90% parallel code and 8 cores you get under 5×. Change the settings to reach a **speedup of at least 5** while keeping **8 cores or fewer**.",
        widget: { type: "cpuarch-amdahl", props: { parallel: 90, cores: 8 } },
        question: { type: "widget", goal: { minSpeedup: 5, maxCores: 8 }, hint: "Adding cores is capped at 8. What else is in the formula?" },
        explanation: "The only other lever is **p**: make more of the job parallel. Going from 90% to 95% parallel lifts 8 cores from about 4.7× to about 5.9×. Shrinking the serial part is usually worth more than buying more cores.",
      },
      {
        kind: "question",
        title: "The hard ceiling",
        body: "A program is **80%** parallel. However many cores you add, what is the **most** it can ever speed up (as a number of times)?",
        question: { type: "number", answer: 5, hint: "With infinite cores the parallel part takes no time. Only the serial 20% is left." },
        explanation: "With infinite cores the time is just the serial share, 0.2 of the original, so the speedup is 1 ÷ 0.2 = **5×**. Always look for the serial part first: it is the ceiling.",
      },
      {
        kind: "question",
        title: "Doubling the cores",
        body: "A program is 90% parallel. Going from **8 cores to 16 cores** speeds it up by roughly:",
        widget: { type: "cpuarch-amdahl", props: { parallel: 90, cores: 8, lockParallel: true }, live: true },
        question: {
          type: "choice",
          options: ["2×", "About 1.4×", "No change at all", "It gets slower"],
          answer: 1,
          hint: "Read the speedup at 8 cores, then at 16 cores, and divide.",
          feedback: {
            0: "Double the cores would be double the speed only if everything was parallel. The 10% serial part limits it.",
            2: "The parallel part does get twice as many workers, so there is some gain (4.7× to 6.4×).",
            3: "In Amdahl's model extra cores never hurt. In real life, overheads can, but that is not what the law says.",
          },
        },
        explanation: "8 cores give about 4.7× and 16 give about 6.4×: roughly **1.4× more** for double the hardware. Each doubling buys less than the last.",
      },
      {
        kind: "explain",
        title: "Even worse in real life",
        body: P(
          "Amdahl's law is the *kind* picture. Real programs also lose speed to:",
          "- **Waiting for each other**: locks and other synchronisation make threads queue.\n- **Shared memory bandwidth**: all cores pull from the same memory, so memory-hungry code stops scaling long before the cores run out.\n- **Cache sharing and coherence**: cores that touch the same data keep invalidating each other's caches (more on this in the memory module).\n- **Overheads**: starting threads, splitting work and combining results all take time.",
          "On the other hand, for many problems the data keeps getting bigger as machines grow, and the parallel share keeps growing too. So more cores are still very worthwhile: just not by magic, and not for every program.",
        ),
      },
      {
        kind: "code",
        title: "Amdahl's law in code",
        body: "Write `speedup(p, n)`: the speedup on `n` cores when a fraction `p` (0 to 1) of the work is parallel.",
        language: "python",
        starter: `def speedup(p, n):
    # 1 / ((1 - p) + p / n)
    return 0
`,
        solution: `def speedup(p, n):
    return 1 / ((1 - p) + p / n)
`,
        tests: [
          { id: "half", description: "Half parallel on 2 cores gives about 1.33", assertionCode: `assert abs(speedup(0.5, 2) - 4 / 3) < 1e-9, f"expected 1.333..., got {speedup(0.5, 2)}"` },
          { id: "all", description: "Fully parallel code scales perfectly", assertionCode: `assert abs(speedup(1.0, 8) - 8) < 1e-9, f"expected 8, got {speedup(1.0, 8)}"` },
          { id: "one", description: "One core means no speedup", assertionCode: `assert abs(speedup(0.9, 1) - 1) < 1e-9, f"expected 1, got {speedup(0.9, 1)}"` },
          { id: "limit", description: "95% parallel approaches 20x as cores grow", assertionCode: `assert 19.9 < speedup(0.95, 10**9) < 20.01, f"expected about 20, got {speedup(0.95, 10**9)}"` },
        ],
        hints: ["The serial part takes (1 - p) of the time. The parallel part takes p / n.", "Speedup is old time (1) divided by new time."],
      },
      {
        kind: "recap",
        points: [
          "A **core** is a full CPU; a **thread** is a stream of instructions; **SMT** lets two threads share one core's execution units, which helps by tens of percent, not 2×.",
          "**Amdahl's law:** speedup = 1 ÷ ((1 − p) + p ÷ n). The serial part sets a hard ceiling of 1 ÷ (1 − p).",
          "Each doubling of cores buys less than the one before. Shrink the serial part first.",
          "Locks, shared memory bandwidth and cache sharing eat into scaling even further in real programs.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 9. SIMD ───────────────────────────────
  {
    id: "fnd-cpu-9-simd",
    title: "SIMD: one instruction, many numbers",
    summary: "Vector registers that hold several numbers, how a loop is vectorised (with its leftover tail), and when the compiler can not do it.",
    level: "Advanced",
    minutes: 9,
    xp: 70,
    steps: [
      {
        kind: "explain",
        title: "A wider register",
        body: P(
          "Adding two arrays element by element, `c[i] = a[i] + b[i]`, runs the same tiny step again and again. **SIMD** (single instruction, multiple data) is the CPU's answer: a **vector register** holds several numbers side by side, and **one instruction** adds all of them at once. Each slot is called a **lane**.",
          "A 128-bit vector register holds four 32-bit numbers, so one add does the work of four. Pick the number of lanes and watch the instruction count fall.",
        ),
        widget: { type: "cpuarch-simd", props: { lanes: [1, 4, 8], n: 16 } },
      },
      {
        kind: "question",
        title: "No numbers left over",
        body: "Choose a length and 8 lanes so that **no numbers are left over** at the end (the tail is 0).",
        widget: { type: "cpuarch-simd", props: { lanes: [1, 4, 8], n: 21, initialLanes: 8 } },
        question: { type: "widget", goal: { lanes: 8, tail: 0 }, hint: "The tail is the remainder when you divide the length by the number of lanes." },
        explanation: "A length that is a multiple of 8 divides evenly into vectors. Otherwise the last few numbers do not fill a vector and are handled one at a time (or with a **masked** vector operation on chips that support it). That leftover is called the **tail** or **remainder**.",
      },
      {
        kind: "question",
        title: "The tail",
        body: "An array has 100 numbers and the vector holds 8. After the full vector passes, how many numbers are in the **tail**?",
        question: { type: "number", answer: 4, hint: "100 divided by 8 is 12 with something left." },
        explanation: "12 full vectors cover 96 numbers; **4** are left for the tail.",
      },
      {
        kind: "explain",
        title: "How wide, really?",
        body: P(
          "Vector widths are a property of the chip family. Some real examples:",
          "- **SSE** on x86: 128-bit. **AVX2**: 256-bit. **AVX-512**: 512-bit (only on some chips).\n- **NEON** on ARM (phones, Apple silicon): 128-bit. **SVE** is ARM's *variable-length* design, so the same code adapts to the width of the chip it runs on.",
          "How many lanes you get depends on the **size of the number**: a 256-bit register holds eight 32-bit floats, but also sixteen 16-bit integers or thirty-two single bytes. That is why SIMD loves small number types (images, audio, machine-learning weights).",
        ),
      },
      {
        kind: "question",
        title: "Packing numbers",
        body: "A vector register is **256 bits** wide. How many **16-bit** integers fit in it?",
        question: { type: "number", answer: 16, hint: "256 divided by 16." },
        explanation: "256 ÷ 16 = **16 lanes**. Halve the number size and you double the lanes.",
      },
      {
        kind: "explain",
        title: "Turning a loop into vectors",
        body: P(
          "Making a loop use SIMD is **vectorising** it. You rarely write the vector instructions yourself. Compilers do it automatically (*auto-vectorisation*) when optimisation is turned on, for loops like this:",
          c(`for (int i = 0; i < n; i++)
    c[i] = a[i] + b[i];`),
          "Each pass handles 8 (or 4, or 16) elements, then a small scalar loop mops up the tail. But the compiler will only do it when it can *prove* it is safe, and some loops block it:",
          c(`// each step needs the previous result: a loop-carried dependency
for (int i = 1; i < n; i++)
    a[i] = a[i-1] + b[i];`),
        ),
      },
      {
        kind: "question",
        title: "What blocks the vectors?",
        body: "Which of these loops is **hard** to vectorise?",
        question: {
          type: "choice",
          options: ["c[i] = a[i] * 2", "a[i] = a[i-1] + b[i]", "c[i] = a[i] + b[i]", "d[i] = a[i] * a[i]"],
          answer: 1,
          hint: "Which loop needs the answer from the previous step before it can do the next?",
          feedback: {
            0: "Each element is independent: element 5 does not need element 4. That vectorises easily.",
            2: "Independent elements again, the classic easy case.",
            3: "Squaring each element does not depend on any neighbour. Easy to vectorise.",
          },
        },
        explanation: "`a[i] = a[i-1] + b[i]` is a **loop-carried dependency**: each element needs the one just computed, so they can not all be done at once. Other common blockers: pointers that might overlap (aliasing), unpredictable branches inside the loop, calls to functions the compiler can not see into, and memory access that jumps around instead of walking forward.",
      },
      {
        kind: "question",
        title: "SIMD from Python",
        body: "You are summing and multiplying big lists of numbers in Python and want the CPU's vector units to work. What is the usual practical route?",
        question: {
          type: "choice",
          options: ["Write assembly by hand inside your Python loop", "Use a library like NumPy, whose compiled loops are built to use SIMD", "Add more threads to a plain Python for loop", "Turn up the monitor refresh rate"],
          answer: 1,
          hint: "Python itself runs one object at a time. Where do fast array loops live?",
          feedback: {
            0: "Possible but rarely sensible. Libraries already ship tuned vector code for you.",
            2: "More threads do not make each Python step wider, and Python's own overhead per step stays.",
            3: "The monitor is unrelated to the CPU's vector units.",
          },
        },
        explanation: "Libraries such as NumPy run whole-array operations in compiled code that is written (or compiled) to use SIMD where the CPU has it. Moving a hot loop from plain Python into one array operation often gives a large speed-up for this reason (among others).",
      },
      {
        kind: "code",
        title: "Split a loop into vectors",
        body: "Write `vector_split(n, lanes)` that returns `(passes, tail)`: how many full vector passes you need for `n` numbers, and how many numbers are left over.",
        language: "python",
        starter: `def vector_split(n, lanes):
    # (full vector passes, leftover numbers)
    return (0, 0)
`,
        solution: `def vector_split(n, lanes):
    return (n // lanes, n % lanes)
`,
        tests: [
          { id: "tail", description: "100 numbers, 8 lanes: 12 passes and a tail of 4", assertionCode: `assert vector_split(100, 8) == (12, 4), f"expected (12, 4), got {vector_split(100, 8)}"` },
          { id: "even", description: "16 numbers, 4 lanes: exactly 4 passes", assertionCode: `assert vector_split(16, 4) == (4, 0), f"expected (4, 0), got {vector_split(16, 4)}"` },
          { id: "short", description: "Fewer numbers than lanes: no vector pass at all", assertionCode: `assert vector_split(3, 8) == (0, 3), f"expected (0, 3), got {vector_split(3, 8)}"` },
        ],
        hints: ["Floor division is `//` and the remainder is `%`."],
      },
      {
        kind: "recap",
        points: [
          "**SIMD** uses wide **vector registers** with several **lanes** so one instruction works on many numbers.",
          "Examples (they vary by chip): SSE 128-bit, AVX2 256-bit, AVX-512 512-bit on x86; NEON 128-bit and variable-length SVE on ARM. Smaller numbers mean more lanes.",
          "Loops are processed in vector passes plus a scalar **tail** for the remainder.",
          "Compilers **auto-vectorise** simple independent loops; dependencies between iterations, aliasing and branchy loops block it. Libraries like NumPy bring SIMD to high-level languages.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 10. Measuring the CPU ───────────────────────────────
  {
    id: "fnd-cpu-10-measuring",
    title: "Measuring the CPU",
    summary: "Performance counters, IPC and branch misses, sampling profilers and flame graphs, a measure-and-change loop, and the traps in microbenchmarks.",
    level: "Professional",
    minutes: 10,
    xp: 85,
    steps: [
      {
        kind: "explain",
        title: "Do not guess: count",
        body: P(
          "Everything in this module comes down to one habit: **measure before you change anything**. Intuition about performance is wrong surprisingly often.",
          "Modern CPUs count what they do in special **performance counters**: cycles, instructions retired, branches, branch misses, cache misses and more. A tool reads them for you. From them you work out:\n\n- **IPC** = instructions ÷ cycles. Low (under 1) usually means the core is stalled waiting, often on memory. Higher means it is busy. What counts as 'good' depends on the chip and the code.\n- **Branch-miss rate** = branch misses ÷ branches. A few percent is normal; a big number points at unpredictable branches.\n- **Cache misses per thousand instructions**: high means the program is waiting on memory.",
          "Below are counters for three made-up programs, laid out like the output of a typical Linux tool (`perf stat`). Click through them and read the numbers.",
        ),
        widget: { type: "cpuarch-counters", props: {} },
      },
      {
        kind: "question",
        title: "Who is waiting on memory?",
        body: "Look at IPC and cache misses. Which program spends most of its time **waiting for memory**? Select it.",
        widget: { type: "cpuarch-counters", props: { pick: true } },
        question: { type: "widget", goal: { picked: "list" }, prompt: "Pick the program that is stalled on memory.", hint: "Look for the lowest IPC together with a lot of cache misses per 1000 instructions." },
        explanation: "The scattered list has an IPC of about 0.2 and around 50 cache misses per 1000 instructions: the core spends most cycles idle, waiting for data. Walking pointers through memory leaves the prefetcher and caches nothing to work with.",
      },
      {
        kind: "question",
        title: "Who is guessing badly?",
        body: "Which program has a **branch-miss rate** that stands out as a problem?",
        widget: { type: "cpuarch-counters", props: {}, live: true },
        question: {
          type: "choice",
          options: ["Sum an array in order", "Walk a scattered list", "Count big values in shuffled data"],
          answer: 2,
          hint: "Find the row where branch-misses is a large share of branches.",
          feedback: {
            0: "Its branch-miss rate is tiny (0.03%): a simple loop is very easy to predict.",
            1: "Its branch-misses are rare. Its problem is memory, not branches.",
          },
        },
        explanation: "The shuffled-data count has about 25% of its branches mispredicted. That matches the data-dependent `if` from the branch-prediction lesson. Same tool, different diagnosis: the counters point at *which* kind of stall to chase.",
      },
      {
        kind: "explain",
        title: "Where in the code? Profilers",
        body: P(
          "Counters tell you *what kind* of problem, not *where*. A **sampling profiler** answers that. Many times a second (say a hundred) it pauses the program, records which function is running and the whole call stack, then lets it continue. After thousands of samples, the functions that appear most often are where the time goes.",
          "A **flame graph** draws those samples: each block is a function, **wider = more samples**, and a block sits on top of the function that called it. Importantly, left-to-right is *not* time order. Tap blocks to see two numbers: **total** (the function and everything it called) and **self** (only its own code).",
        ),
        widget: { type: "cpuarch-flame", props: {} },
      },
      {
        kind: "question",
        title: "Find the hot spot",
        body: "Tap the function with the most **self** time: the one whose *own* code is hottest.",
        widget: { type: "cpuarch-flame", props: {} },
        question: { type: "widget", goal: { selected: "sha_round" }, prompt: "Tap the block with the highest self time.", hint: "Total time includes everything a function calls. Look for the biggest self number, not the widest block near the bottom." },
        explanation: "`sha_round` has 35% self time: that is where the CPU is really working. `main` and `crunch` are wide, but almost all their time is spent inside the functions they call, so tuning them directly would change little.",
      },
      {
        kind: "question",
        title: "Total versus self",
        body: "`main` is at the bottom and has 100% total time. A teammate says: 'main is the bottleneck, optimise it!' What is the best reply?",
        question: {
          type: "choice",
          options: ["Agreed: 100% is the biggest number", "Its self time is 0%; the time is in the functions it calls, so look further up the graph", "We can not tell without a faster CPU", "Delete main"],
          answer: 1,
          hint: "The root function is always 100% total, because everything runs under it.",
          feedback: {
            0: "The root always shows 100% total, because every sample is inside it somewhere. That says nothing about where the work is.",
            2: "The profile already tells us a lot. We just need to read self time.",
            3: "A program without main does not run. The point is to find which called function does the work.",
          },
        },
        explanation: "A function's **total** includes its callees, so the root is always 100%. **Self** time shows who actually burns the cycles. Start with the biggest self-time blocks, then ask why they are slow, using the counters.",
      },
      {
        kind: "question",
        title: "The loop",
        body: "Optimising works best as a repeated cycle. Put its steps in order.",
        question: {
          type: "order",
          items: [
            "Measure a baseline on realistic input",
            "Profile to find where the time goes",
            "Form a hypothesis and change one thing",
            "Re-measure and compare with the baseline",
            "Keep the change only if the numbers improved",
          ],
          hint: "You need a number before you can claim anything improved.",
        },
        explanation: "**Measure → hypothesis → change → re-measure.** Changing one thing at a time tells you which change mattered. Keeping a change that did not measurably help just adds complexity.",
      },
      {
        kind: "explain",
        title: "Tools to try, and traps to avoid",
        body: P(
          "Tool names are examples; which one you can use depends on your operating system, chip and language.",
          sh(`# Linux: counters, then samples for a flame graph
perf stat -e cycles,instructions,branches,branch-misses ./myprog
perf record -g ./myprog
perf report

# macOS: Instruments (Time Profiler, CPU Counters)
# Windows: Windows Performance Analyzer, Intel VTune
# Python: python -m cProfile -s cumtime myscript.py   (or py-spy)
# Timing a whole command repeatedly: hyperfine './myprog'`),
          "Honest limits: hardware counters often are not available inside virtual machines and many cloud instances, and different chips count a given event in slightly different ways.",
          "**Microbenchmark traps** (tiny timed loops) fool even experts:\n- The compiler may delete code whose result is never used, so you time nothing.\n- The first run is slower (cold caches, code being loaded), so warm up and repeat.\n- Timings are noisy: run many times, look at the median or minimum, not one number.\n- Turbo boost, thermal throttling and other programs change the clock under you.\n- A tiny input that fits in cache says nothing about real data, and a debug build says nothing about a release build.\n\nAlways benchmark an optimised build, on realistic data, on the machine that matters.",
        ),
      },
      {
        kind: "question",
        title: "Spot the bad benchmark",
        body: "Which of these would make a timing result **misleading**? Pick **all** that apply.",
        question: {
          type: "choice",
          options: [
            "Timing one single run of a 2 ms function",
            "Running the benchmark many times and reporting the median",
            "The compiler removed the loop because its result was never used",
            "Timing a debug build and drawing conclusions about the release build",
          ],
          answer: [0, 2, 3],
          hint: "Ask for each: could the number I get differ a lot from what real users would see?",
          feedback: { 1: "That is good practice: repeating and using the median smooths out noise." },
        },
        explanation: "One tiny run is dominated by noise and cold caches. A loop the compiler deletes measures nothing. A debug build is not what ships. Repeating the run many times and using the median is the cure for noise, not a trap.",
      },
      {
        kind: "recap",
        points: [
          "**Measure first.** Performance counters give cycles, instructions (so **IPC**), branch misses and cache misses, and they point at the kind of stall.",
          "A **sampling profiler** and its **flame graph** show where time goes. Read **self** time, not just the widest blocks.",
          "Work in a loop: **baseline, profile, change one thing, re-measure, keep only what helps.**",
          "Guard against bad benchmarks: warm up, repeat, use realistic data and an optimised build, and watch for deleted code and clock changes. Tools like perf, Instruments and VTune are examples; what works depends on your platform.",
        ],
      },
    ],
  },
];
