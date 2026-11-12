import type { ConceptLesson } from "../../learn/types.ts";

/** Fenced C/C++ block for lesson prose. */
const cpp = (s: string) => "~~~cpp\n" + s.trim() + "\n~~~";
/** Fenced plain-text block (tables, commands) for lesson prose. */
const txt = (s: string) => "~~~text\n" + s.trim() + "\n~~~";
/** Paragraphs joined with blank lines. */
const P = (...paras: string[]) => paras.join("\n\n");

/** Lessons 9 to 12: the TLB and page faults, cache coherence, memory ordering, memory performance in practice. */
export const memoryLessonsC: ConceptLesson[] = [
  // ─────────────────────────────── 9. TLB and page faults ───────────────────────────────
  {
    id: "fnd-mem-9-tlb",
    title: "TLB and page faults",
    summary: "The cache for translations, huge pages that stretch its reach, minor and major page faults, swapping and thrashing.",
    minutes: 10,
    xp: 75,
    level: "Advanced",
    steps: [
      {
        kind: "explain",
        title: "Translation needs a cache too",
        body: P(
          "Translating an address means reading the page table, and on x86-64 that is up to **four dependent reads** (one per level) before you can even start the real access. Doing that for every load would make everything several times slower. So the CPU keeps a small cache of recent translations: the **TLB** (translation lookaside buffer).",
          "A TLB hit gives the frame number straight away. A TLB **miss** triggers a **page walk**: the hardware reads the table levels (often served from the normal caches) and fills the TLB. Typical sizes, order of magnitude: a first-level data TLB of about **64 entries** and a second level of a **thousand or two**.",
          "The TLB's **reach** is its entries times the page size. With 64 entries of 4 KiB pages that is only **256 KiB**: touch more memory than that in a jumpy way and you keep missing. The widget runs a toy 64-entry TLB; leave it on 4 KiB pages and slide the size up with *Jump around*.",
        ),
        widget: { type: "memsys-tlb", props: { entries: 64, exp: 20, pattern: "random", pageBytes: 4096 } },
      },
      {
        kind: "question",
        title: "Stretch the reach",
        body: "Make the program **jump around randomly** over **at least 16 MiB** and still keep the TLB miss rate **below 5%**.",
        widget: { type: "memsys-tlb", props: { entries: 64, exp: 22, pattern: "random", pageBytes: 4096 } },
        question: {
          type: "widget",
          goal: { maxMissRate: 0.05, pattern: "random", minExp: 24 },
          prompt: "Set Jump around, a memory size of 16 MiB or more, and a page size that keeps misses under 5%.",
          hint: "With 4 KiB pages the TLB covers 256 KiB. What page size would cover a lot more with the same 64 entries?",
        },
        explanation: "With **2 MiB huge pages** each TLB entry covers 512 times as much, so 64 entries reach 128 MiB: a 16 to 128 MiB region fits entirely, and after the first touches there are almost no misses. Using 4 KiB pages the same region needs thousands of translations and the 64-entry TLB misses on nearly every jump.",
      },
      {
        kind: "question",
        title: "Compute the reach",
        body: "A TLB has **64 entries** and the page size is **2 MiB**. How many **MiB** of memory does it cover?",
        question: { type: "number", answer: 128, tolerance: 0, unit: "MiB", hint: "Reach = number of entries × page size." },
        explanation: "64 × 2 MiB = **128 MiB**. With 1 GiB pages (available on x86-64) the same 64 entries would reach 64 GiB, more than most machines have. That is why databases and other programs with huge working sets ask for huge pages.",
      },
      {
        kind: "explain",
        title: "Minor and major faults",
        body: P(
          "From the last lesson: a **page fault** means the page is not mapped right now. There are two very different kinds.",
          "- A **minor fault**: the data is already in RAM or needs no disk (a first touch of fresh memory gets a zero-filled frame; a page already loaded for someone else gets mapped). It costs roughly a **microsecond**.\n- A **major fault**: the data must be **read from disk**, for example a page that was pushed out to **swap** earlier. An SSD read is on the order of **100 µs**, a spinning disk around **10 ms**: thousands to millions of times slower than RAM.",
          "When RAM is full the OS **swaps out** pages it has not used lately to make room. Below, a program uses pages 0 to 3 twice in a loop, but its share of RAM is only 3 frames. Press *Next use* through the list, then try giving it more frames.",
        ),
        widget: { type: "memsys-swap", props: { frames: 3, chooseFrames: true, sequence: [0, 1, 2, 3, 0, 1, 2, 3] } },
      },
      {
        kind: "question",
        title: "No major faults",
        body: "Walk through all 8 uses with **zero major faults**. Hint: the program's share of RAM matters.",
        widget: { type: "memsys-swap", props: { frames: 3, chooseFrames: true, sequence: [0, 1, 2, 3, 0, 1, 2, 3] } },
        question: {
          type: "widget",
          goal: { done: true, maxMajor: 0 },
          prompt: "Pick the number of RAM frames, then press Next use until all 8 are done with no major fault.",
          hint: "With 3 frames the fourth page pushes one out, and that page is needed again. How many frames avoid that?",
        },
        explanation: "With **4 frames**, all four pages stay in RAM: the first touches are minor faults and every later one is a plain hit. With 3 frames the page you just evicted is exactly the one you need next, so each of the last four uses is a major fault. This is **thrashing**.",
      },
      {
        kind: "question",
        title: "The machine that crawls",
        body: "A server suddenly gets extremely slow. The CPUs are mostly idle, the disk activity light is solid, and `free` shows RAM full and swap heavily in use. What is most likely happening?",
        question: {
          type: "choice",
          options: [
            "The CPU is overheating",
            "Thrashing: the working sets no longer fit in RAM, so the OS keeps swapping pages in and out",
            "The L1 cache has too few ways",
            "The TLB is too small",
          ],
          answer: 1,
          hint: "Idle CPUs plus a busy disk means the programs are waiting on something other than computation.",
          feedback: {
            0: "An overheating CPU would show high load or throttling, not idle CPUs with a busy disk.",
            2: "Cache associativity changes nanoseconds, and nothing about it makes a disk busy.",
            3: "TLB misses are nanoseconds each and use no disk.",
          },
        },
        explanation: "When processes need more memory than the machine has, they spend their time waiting for **major faults** while the OS moves pages to and from disk. Fixes: add RAM, shrink the working sets, or stop some jobs. A little swapping is normal; constant swap traffic with idle CPUs is not.",
      },
      {
        kind: "explain",
        title: "Huge pages: the trade-off",
        body: P(
          "Huge pages cut TLB misses and page-table size, so why not always use them?",
          "- **Wasted memory**: a program that needs 100 KB still gets 2 MiB if it is placed in a huge page.\n- **Hard to find**: a 2 MiB frame must be physically contiguous, so a long-running, fragmented machine may struggle, and compaction can cause latency spikes.\n- **Coarser tricks**: copy-on-write after a fork copies 2 MiB instead of 4 KiB; swapping moves bigger chunks.",
          "On Linux (as an example) you can get them as **transparent huge pages** (the kernel promotes regions automatically) or reserve them explicitly. Programs with big, randomly accessed data, such as databases, JVM heaps, caches and scientific code, often gain. Many small, short-lived programs gain nothing. As always: measure with and without.",
        ),
      },
      {
        kind: "question",
        title: "A page fault, step by step",
        body: "Put the steps of a **major page fault** in the order they happen.",
        question: {
          type: "order",
          items: [
            "The CPU cannot translate the address and raises a page fault",
            "The OS finds the page's copy in swap on disk",
            "The OS picks a free frame, evicting another page if RAM is full",
            "The disk read runs while the program sleeps and other programs run",
            "The OS updates the page table and the program retries the instruction",
          ],
          hint: "Start with the hardware noticing the problem; finish with the retry.",
        },
        explanation: "The key insight is step four: while the disk works, the program **sleeps** and the scheduler runs something else, so the CPU is not wasted. The program itself loses roughly 100 µs to 10 ms. After the retry it continues as if nothing had happened.",
      },
      {
        kind: "recap",
        points: [
          "The **TLB** caches recent page-to-frame translations. A miss triggers a **page walk** through the multi-level table.",
          "**TLB reach = entries × page size**. **Huge pages** (2 MiB, 1 GiB on x86-64) stretch the reach, at the cost of wasted memory and harder allocation.",
          "A **minor fault** is cheap (about a microsecond, no disk). A **major fault** reads from disk (SSD about 100 µs, hard disk about 10 ms).",
          "When working sets exceed RAM the system **thrashes**: idle CPUs, busy disk. Fix by adding memory or shrinking what is needed.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 10. Many cores, one memory ───────────────────────────────
  {
    id: "fnd-mem-10-coherence",
    title: "Many cores, one memory",
    summary: "Cache coherence in plain words (MESI), what a coherence miss costs, false sharing, and padding to a cache line.",
    minutes: 10,
    xp: 80,
    level: "Advanced",
    steps: [
      {
        kind: "explain",
        title: "Two caches, one value",
        body: P(
          "You met many-core CPUs earlier. Each core has its own private caches. So the same line of memory can sit in **two caches at once**. If one core changes it, the other core's copy is now stale, and reading it would give an old value. The hardware must prevent that. The rules it follows are called a **cache-coherence protocol**.",
          "The classic textbook protocol is **MESI**, named after the four states a line can be in, in each core's cache:",
          "- **Modified (M)**: I have the only copy and I changed it. Memory is out of date.\n- **Exclusive (E)**: I have the only copy and it is unchanged. I may write it without telling anyone.\n- **Shared (S)**: others may have copies too. I may read, but must warn them before I write.\n- **Invalid (I)**: my copy is not usable.",
          "Caches **snoop** each other's requests on a shared bus (bigger chips use directories to do the same job). Real CPUs use variants, such as MESIF and MOESI, but the idea is the same. Try the buttons below: read and write from both cores and watch the states.",
        ),
        widget: { type: "memsys-mesi", props: {} },
      },
      {
        kind: "question",
        title: "Everyone shares",
        body: "Get **both** cores' caches to hold the line in the **Shared** state.",
        widget: { type: "memsys-mesi", props: {} },
        question: {
          type: "widget",
          goal: { states: ["S", "S"] },
          prompt: "Press buttons until both Core A and Core B show Shared.",
          hint: "A line is Shared when more than one cache holds a clean copy. What do both cores have to do?",
        },
        explanation: "Core A reads first and gets the line **Exclusive** (nobody else has it). When Core B reads it, A's copy drops to Shared and B's arrives as Shared. Two readers never hurt each other: Shared lines can be read by everyone at full speed.",
      },
      {
        kind: "question",
        title: "Take ownership",
        body: "Reset, then make **Core A** hold the line **Modified** while **Core B** is **Invalid**.",
        widget: { type: "memsys-mesi", props: {} },
        question: {
          type: "widget",
          goal: { states: ["M", "I"] },
          prompt: "Reach the state where A is Modified and B is Invalid.",
          hint: "A write needs ownership. What happens to everyone else's copy when a core writes?",
        },
        explanation: "Writing needs **exclusive ownership**, so a write invalidates every other copy. After A's write, A is Modified (the only up-to-date copy; main memory is stale) and B is Invalid. If B now reads, A must hand the data over first.",
      },
      {
        kind: "question",
        title: "A reader meets a writer",
        body: "Core A holds a line **Modified**. Core B now **reads** the same line. What must happen?",
        question: {
          type: "choice",
          options: [
            "B reads the stale value from main memory",
            "A supplies the up-to-date data (and writes it back); both caches end up Shared",
            "A's copy is simply thrown away",
            "B waits until A is switched off",
          ],
          answer: 1,
          hint: "Main memory is stale in this situation, and B must see the latest write.",
          feedback: {
            0: "That would give B an old value. Coherence exists to prevent exactly this.",
            2: "Discarding the only up-to-date copy would lose A's write.",
            3: "Cores never wait for each other to switch off; the protocol sorts it out in nanoseconds.",
          },
        },
        explanation: "The Modified copy is the only fresh one. A hands it over (and updates memory), and both end Shared. The transfer takes tens of nanoseconds, more than an L1 hit: reading data another core just wrote is a **coherence miss**.",
      },
      {
        kind: "explain",
        title: "False sharing",
        body: P(
          "Coherence works on whole **cache lines**, not single variables. Now picture two threads, each incrementing its **own** counter. The counters are separate variables, so the code has no sharing at all. But if the two counters sit **next to each other in memory**, they share one 64-byte line.",
          "Every time one core writes its counter it must take the line away from the other core, and the other core then has to take it back. The line **ping-pongs** between the caches although the threads never touch the same variable. This is **false sharing**, one of the most common ways to make multi-threaded code slower than single-threaded code.",
          "Compare the layouts. The strip shows the first six increments: red means a bus transaction, green a plain hit. (Toy costs: 1 ns for a hit, 30 ns for a transfer.)",
        ),
        widget: { type: "memsys-falseshare", props: { layout: "same" } },
      },
      {
        kind: "question",
        title: "Stop the ping-pong",
        body: "Pick the layout that lets each core keep its line **to itself**, with at most 10 bus transactions in total.",
        widget: { type: "memsys-falseshare", props: { layout: "same" } },
        question: {
          type: "widget",
          goal: { layout: "padded", maxBus: 10 },
          prompt: "Choose the layout where the two counters live in different cache lines.",
          hint: "The problem is two counters in one line. Put them somewhere else.",
        },
        explanation: "Padded apart, each core takes its line once (Exclusive, then Modified) and every later write is a hit with no bus traffic. The work done is identical; only where the bytes sit changed. In the toy numbers that is tens of times faster. Real slowdowns are usually smaller but often 3x to 10x.",
      },
      {
        kind: "explain",
        title: "Padding to a line",
        body: P(
          "The cure is to keep data written by different threads on **different cache lines**, usually by padding or aligning to 64 bytes. (Some chips use 128-byte lines, so careful code asks the platform for the size instead of hard-coding it.)",
          cpp(`
// C++: give each counter its own line (64 is typical; example only)
struct alignas(64) PaddedCounter {
    long value;
};
PaddedCounter counters[4];     // thread i only touches counters[i]

// or: keep a private counter per thread and add them at the end
`),
          "Other languages offer the same: Rust has `#[repr(align(64))]`, Java has an `@Contended` annotation (restricted in the JDK), and Go programmers add padding fields by hand. The best fix is often to avoid the shared write completely: give every thread a private counter and **combine the totals once at the end**.",
          "There is a cost to padding: it wastes memory and cache space. Do it only for data that is written often by different threads.",
        ),
      },
      {
        kind: "question",
        title: "Four slow threads",
        body: "Four threads each increment their own element of `long counts[4]` in a tight loop. The program runs **slower with 4 threads than with 1**. Which change fixes it?",
        question: {
          type: "choice",
          options: [
            "Protect the array with a mutex",
            "Declare the array volatile",
            "Pad each element to its own 64-byte cache line (or use private counters and add them up at the end)",
            "Use 8 threads instead of 4",
          ],
          answer: 2,
          hint: "The four longs are 32 bytes in a row. How many cache lines is that?",
          feedback: {
            0: "A lock would add waiting on top of the ping-pong and make it slower still.",
            1: "volatile only stops the compiler caching a value in a register; it does not move the data to different lines.",
            3: "More threads fighting over the same line only makes the ping-pong worse.",
          },
        },
        explanation: "All four counters fit in half a cache line, so four cores fight over one line. Spacing them 64 bytes apart (or keeping them in thread-local variables) removes the coherence traffic, and the threads finally run in parallel.",
      },
      {
        kind: "code",
        title: "Do they share a line?",
        body: "Write `shares_line(addr_a, addr_b, line_size=64)`. It returns `True` if the two byte addresses fall in the **same** cache line. This is the test you would run mentally on two thread counters.",
        language: "python",
        starter: `def shares_line(addr_a, addr_b, line_size=64):
    # True if both addresses are in the same cache line
    return None
`,
        solution: `def shares_line(addr_a, addr_b, line_size=64):
    return addr_a // line_size == addr_b // line_size
`,
        tests: [
          { id: "neighbours", description: "Two 8-byte counters side by side", assertionCode: `assert shares_line(0, 8) is True, "bytes 0 and 8 are in line 0"` },
          { id: "apart", description: "64 bytes apart is the next line", assertionCode: `assert shares_line(0, 64) is False, "byte 64 starts line 1"` },
          { id: "edge", description: "Byte 63 is the end of line 0, byte 64 the start of line 1", assertionCode: `assert shares_line(60, 68) is False and shares_line(64, 127) is True, "check the line boundaries"` },
          { id: "size", description: "With 128-byte lines more addresses share", assertionCode: `assert shares_line(0, 100, line_size=128) is True and shares_line(0, 100) is False, "line size changes the answer"` },
        ],
        hints: ["Line number = address // line_size.", "Two addresses share a line when their line numbers are equal."],
      },
      {
        kind: "recap",
        points: [
          "Each core has private caches, so the hardware keeps them **coherent**. The textbook protocol is **MESI**: Modified, Exclusive, Shared, Invalid (real chips use variants like MESIF or MOESI).",
          "A write needs exclusive ownership and **invalidates** other copies. Reading what another core just wrote costs a transfer of tens of nanoseconds.",
          "**False sharing**: independent variables on one cache line make the line ping-pong between cores and wipe out the speed-up of threads.",
          "Fix by padding or aligning to the line size, or by using private per-thread data and combining at the end.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 11. Memory ordering and atomics ───────────────────────────────
  {
    id: "fnd-mem-11-ordering",
    title: "Memory ordering and atomics",
    summary: "Compilers and CPUs reorder memory operations. Data races, store buffers, acquire and release, fences, and why locks work.",
    minutes: 11,
    xp: 85,
    level: "Professional",
    steps: [
      {
        kind: "explain",
        title: "Reordering you can't see",
        body: P(
          "Coherence guarantees that every core agrees on the order of writes **to one line**. It says nothing about the order in which writes to **different** addresses become visible. And in fact, things get reordered at every level:",
          "- the **compiler** may reorder or remove memory operations, or keep a value in a register instead of re-reading it;\n- the **CPU** executes out of order, and writes first wait in a **store buffer** before reaching the cache, so a later load can overtake an earlier store.",
          "A single thread cannot tell: results always look as if everything ran in program order. **Another thread can tell.** The classic example is message passing: thread 1 writes some data and then raises a flag; thread 2 checks the flag and, if it is up, reads the data.",
          cpp(`
// everything starts at 0
// thread 1            // thread 2
data = 1;              r1 = flag;
flag = 1;              r2 = data;
// can thread 2 end with r1 == 1 and r2 == 0 ?
`),
          "The widget below is a **toy** that lists every result a given machine model can produce. It starts on an ARM-like (weak) model with no ordering rules. Tap the result *r1=1 r2=0* to see an execution that produces it.",
        ),
        widget: { type: "memsys-litmus", props: { test: "mp", model: "weak" } },
      },
      {
        kind: "question",
        title: "Store buffering",
        body: "Another classic test: each thread writes its own variable, then reads the other's (`x = 1; r1 = y;` and `y = 1; r2 = x;`). Switch the machine model to **x86 (TSO)**. Can **both** threads read 0?",
        widget: { type: "memsys-litmus", props: { test: "sb", model: "sc", tests: ["sb"] } },
        question: {
          type: "widget",
          goal: { test: "sb", model: "tso", surprisingPossible: true },
          prompt: "Select the x86 (TSO) model and see whether r1=0 r2=0 becomes possible.",
          hint: "On the in-order model (SC) the result 0,0 is crossed out. Change the model and look again.",
        },
        explanation: "On x86 each core keeps its writes in a **store buffer** and its later load can run before the write reaches the cache. Both threads can then read 0: each read passed the other's write. That store-then-load reordering is the one reordering x86 allows, and it is enough to break many hand-made algorithms.",
      },
      {
        kind: "question",
        title: "Two families",
        body: "Which statement about common CPUs is correct?",
        question: {
          type: "choice",
          options: [
            "Neither x86 nor ARM ever reorders memory operations",
            "x86 is fairly strongly ordered (TSO: mainly store-to-load reordering); ARM is weakly ordered and allows many more reorderings unless you use barriers or acquire/release",
            "ARM is more strongly ordered than x86",
            "Both reorder in exactly the same ways",
          ],
          answer: 1,
          hint: "Think about which one hides more of your threading bugs.",
          feedback: {
            0: "Both reorder; they just differ in how much. Store buffers alone cause visible reordering.",
            2: "It is the other way round: x86 gives stronger guarantees by default.",
            3: "They differ a lot, which is why some bugs only appear on ARM.",
          },
        },
        explanation: "x86's **TSO** model keeps loads in order with loads, stores with stores, and loads before later stores; only a store can be overtaken by a later load. ARM's model is **weak**: unrelated reads and writes can be observed in many orders. Code with a missing barrier can run fine on x86 for years and break the day it runs on an ARM server or an Apple-silicon laptop.",
      },
      {
        kind: "explain",
        title: "Acquire and release",
        body: P(
          "The tools for putting order back are cheap, targeted promises. Two matter most:",
          "- A **release** store: everything I did *before* this write is visible to anyone who sees this write.\n- An **acquire** load: if I see a value written by a release store, I also see everything that was done before it.",
          "Together they form a safe **hand-off**. In C++ (as an example) it reads like this:",
          cpp(`
std::atomic<int> flag{0};
int data = 0;

// thread 1
data = 42;
flag.store(1, std::memory_order_release);        // publish

// thread 2
while (flag.load(std::memory_order_acquire) == 0) {}   // wait
use(data);                                        // guaranteed to see 42
`),
          "C++ names the strengths `memory_order_relaxed` (atomic, but no ordering: fine for a plain counter), `acquire`/`release`, and `seq_cst` (the default: one agreed order for all such operations, the strongest and slightly costlier). A **fence** is a standalone barrier. What they cost depends on the CPU: on x86 acquire and release are ordinary moves, since TSO already gives them for free; on ARM64 they become special instructions (such as `ldar` and `stlr`).",
          "Try it in the widget: tap an operation to cycle *relaxed* → *release / acquire* → *seq_cst*.",
        ),
        widget: { type: "memsys-litmus", props: { test: "mp", model: "weak", tests: ["mp"], lockModel: true } },
      },
      {
        kind: "question",
        title: "Make the hand-off safe",
        body: "On the ARM-like model, make the message-passing result **r1=1, r2=0** impossible by adding ordering to the operations. (Use release on the flag store and acquire on the flag load.)",
        widget: { type: "memsys-litmus", props: { test: "mp", model: "weak", tests: ["mp"], lockModel: true } },
        question: {
          type: "widget",
          goal: { test: "mp", model: "weak", surprisingPossible: false, ordered: true },
          prompt: "Add ordering until the result r1=1 r2=0 is impossible.",
          hint: "The flag write must not overtake the data write, and the data read must not overtake the flag read. Tap those two operations.",
        },
        explanation: "A **release** on `flag = 1` keeps the data write before it; an **acquire** on the flag read keeps the data read after it. Now if thread 2 sees the flag, it must see the data. You only need to order the *flag* operations: the data accesses can stay plain.",
      },
      {
        kind: "question",
        title: "When release/acquire isn't enough",
        body: "Back to store buffering on **x86 (TSO)**. Add ordering so that **r1=0, r2=0** becomes impossible. (Release and acquire alone will not do it.)",
        widget: { type: "memsys-litmus", props: { test: "sb", model: "tso", tests: ["sb"], lockModel: true } },
        question: {
          type: "widget",
          goal: { test: "sb", model: "tso", surprisingPossible: false, ordered: true },
          prompt: "Add seq_cst to the operations (or a full fence between the two operations of each thread).",
          hint: "The problem is a store being overtaken by a later load. Which ordering stops a store from being passed by a load?",
        },
        explanation: "Release/acquire never stop a **store from being overtaken by a later load**. That needs a full barrier: a fence between the two operations, or `seq_cst` (on x86 a seq_cst store is compiled with an `xchg` or an `mfence`, which drains the store buffer). This is why the default `memory_order_seq_cst` exists: it is the one that matches intuition.",
      },
      {
        kind: "explain",
        title: "Data races, and why locks work",
        body: P(
          "A **data race** is two threads touching the same variable, at least one writing, with nothing ordering them. In C and C++ that is **undefined behaviour**: the compiler is allowed to assume it never happens. Even `counter++` on a plain `int` is three steps (load, add, store), and threads can interleave in the middle.",
          "Run the two threads below. You choose whose next step runs. Find an unlucky order, then try the other modes.",
          "A **mutex** fixes this twice over. It gives **mutual exclusion** (only one thread inside at a time). And it gives **ordering**: `unlock` is a *release* and `lock` is an *acquire*, so everything the previous holder did is visible to the next. An **atomic** add does the read-add-write as one indivisible step.",
        ),
        widget: { type: "memsys-race", props: { mode: "plain" } },
      },
      {
        kind: "question",
        title: "Lose an update",
        body: "Using the **Plain** mode, run the two threads in an order that ends with the counter at **1** (one increment lost).",
        widget: { type: "memsys-race", props: { mode: "plain", lockMode: true } },
        question: {
          type: "widget",
          goal: { lostUpdate: true, mode: "plain" },
          prompt: "Step the threads in an order that leaves the final counter at 1, with both threads finished.",
          hint: "Let both threads load the counter before either stores. Then each stores 0 + 1.",
        },
        explanation: "Both threads load 0, both add one in their own register, both store 1. Two increments ran, one counted. Nothing crashed and nothing looked wrong: this is why races are so dangerous. With a **lock** the second thread cannot start until the first has stored; with an **atomic** add there is no gap to slip into.",
      },
      {
        kind: "question",
        title: "What to do in practice",
        body: P(
          "Memory ordering is where careful engineers still slip. Practical habits (tools named are examples):",
          "- **Use high-level tools first**: mutexes, queues, channels, thread pools. They contain the right barriers.\n- If you use atomics, use the default `seq_cst` until a profile shows it matters. Use `relaxed` only for independent counters and statistics.\n- Never use `volatile` as a threading tool in C or C++: it is not atomic and gives no ordering. (In Java, `volatile` *does* give ordering, a different thing.)\n- **Test for races**: ThreadSanitizer (`-fsanitize=thread` in GCC and Clang) and Go's `go test -race` find data races at run time. For the Java memory model, jcstress stress-tests litmus patterns.\n- **Test on the weak hardware you ship on**: bugs hidden by x86 often show on ARM (cloud ARM servers, Apple silicon, phones).\n- To study litmus tests formally, the herdtools (`herd7`, `litmus7`) exist.",
          "Which of these is the **best first step** for a rare crash that only happens in production on ARM servers?",
        ),
        question: {
          type: "choice",
          options: [
            "Add volatile to the shared variables",
            "Run the tests under ThreadSanitizer, and review shared state for missing locks or acquire/release",
            "Add sleep calls until it goes away",
            "Assume it is a hardware fault",
          ],
          answer: 1,
          hint: "You need something that finds missing synchronisation instead of hiding it.",
          feedback: {
            0: "volatile does not make operations atomic or ordered in C and C++.",
            2: "A sleep changes timing and hides a race, it does not fix it; the bug returns under load.",
            3: "Weakly ordered hardware is behaving as documented. The missing barrier is in the code.",
          },
        },
        explanation: "A rare, platform-dependent failure is the signature of a **race or missing ordering**. Race detectors point at the exact unsynchronised accesses. Then fix by using a lock or properly ordered atomics, not by changing the timing.",
      },
      {
        kind: "recap",
        points: [
          "Compilers and CPUs **reorder** memory operations. One thread cannot see it; other threads can.",
          "**x86 is TSO**: mostly only a store can be overtaken by a later load. **ARM is weak**: many more reorderings unless you add barriers or acquire/release.",
          "**Release** (publish) and **acquire** (receive) make a safe hand-off. Store-then-load order needs a full fence or **seq_cst**.",
          "A **data race** is undefined behaviour in C and C++. **Locks** work because unlock is a release and lock is an acquire, as well as giving mutual exclusion.",
          "Prefer high-level tools, default to seq_cst, test with a race detector and on the hardware you ship on.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 12. Memory performance in practice ───────────────────────────────
  {
    id: "fnd-mem-12-practice",
    title: "Memory performance in practice",
    summary: "Bandwidth-bound versus compute-bound, prefetching and pointer chasing, NUMA, allocators and fragmentation, and the real tools that measure it.",
    minutes: 11,
    xp: 90,
    level: "Professional",
    steps: [
      {
        kind: "explain",
        title: "Which limit are you hitting?",
        body: P(
          "A program can be limited by two things: how fast the processor can do arithmetic, or how fast memory can feed it numbers. Which one depends on how much work you do on each byte you fetch. That ratio is the **arithmetic intensity**: operations per byte moved (FLOPs per byte, when the operations are floating-point maths).",
          "The **roofline** picture shows it. The sloped part of the line is the memory limit (bandwidth × intensity); the flat part is the compute limit. The corner is the **ridge**. A kernel to the left of the ridge is **memory-bound** (faster arithmetic won't help); to the right it is **compute-bound** (faster memory won't help).",
          "The machine below is a toy desktop: about 1 TFLOP/s single-precision peak and 50 GB/s of memory bandwidth, so the ridge sits at 20 operations per byte. Try the kernels. The *Your own* slider lets you choose any intensity. (GPUs have far more peak maths per byte of bandwidth, so their ridge sits much further right: the GPU module's *GPUs for AI* lesson draws it.)",
        ),
        widget: { type: "memsys-roofline", props: { peak: 1000, bw: 50, kernel: "add", free: true } },
      },
      {
        kind: "question",
        title: "Cross the ridge",
        body: "Pick a kernel that is **compute-bound** on this machine.",
        widget: { type: "memsys-roofline", props: { peak: 1000, bw: 50, kernel: "add" } },
        question: {
          type: "widget",
          goal: { bound: "compute" },
          prompt: "Select a kernel whose point sits on the flat part of the roofline.",
          hint: "Which kernel does the most operations for every byte it moves?",
        },
        explanation: "Only **tiled matrix multiply** has enough reuse: each byte loaded into a tile is used many times, so the intensity (32 operations per byte for 128 × 128 tiles) is past the ridge at 20. Vector add, SAXPY and the dot product do one or two operations per few bytes, so they wait on memory no matter how fast the arithmetic is.",
      },
      {
        kind: "question",
        title: "Streaming 12 gigabytes",
        body: "A loop computes `c[i] = a[i] + b[i]` over 1 billion floats (4 bytes each). It reads two arrays and writes one: 12 GB of traffic. At 50 GB/s of memory bandwidth, about how many **seconds** does it take?",
        question: { type: "number", answer: 0.24, tolerance: 0.02, unit: "s", hint: "Divide bytes by bytes per second: 12 / 50." },
        explanation: "12 GB / 50 GB/s = **0.24 s**. The arithmetic itself, one billion adds at 1 TFLOP/s, would take about a millisecond: more than **200 times** less. This loop is entirely memory-bound, so using fewer bytes (smaller types, fusing loops so a value is not written and re-read) is the only way to speed it up.",
      },
      {
        kind: "explain",
        title: "Prefetching and pointer chasing",
        body: P(
          "Bandwidth is only half the story; latency matters when the CPU cannot see the next address early. A hardware prefetcher (you met it with the cache-line lesson) streams memory in when your accesses are **regular**, so arrays run at nearly full bandwidth.",
          "A **linked list** or a tree is the opposite. To find the address of the next node, the CPU must first *finish loading the current node*. Every step depends on the previous one (**pointer chasing**), so loads cannot overlap and the prefetcher has nothing to predict. If the nodes are scattered, each step is a full RAM latency of about 80 to 100 ns.",
          "Summing ten million numbers might take a few milliseconds from an array, and the better part of a second from a randomly scattered linked list: roughly 100 times slower for the same work. Rules that follow: prefer **contiguous arrays**, keep related data together, use indexes into an array instead of pointers when you can, and give the CPU independent work to overlap.",
        ),
      },
      {
        kind: "question",
        title: "Array or list?",
        body: "You must sum 10 million integers. They are in a contiguous array, or in a linked list whose nodes were allocated at random places. Why is the list much slower?",
        question: {
          type: "choice",
          options: [
            "Each node must be loaded before the address of the next is known, so the loads cannot overlap or be prefetched, and each may miss to RAM",
            "Linked lists use more instructions per addition",
            "RAM is slower when the data was allocated by malloc",
            "Integers in lists are 8 bytes longer",
          ],
          answer: 0,
          hint: "Think about when the CPU learns the address of node 2.",
          feedback: {
            1: "The extra instructions cost almost nothing next to waiting for memory.",
            2: "Allocation does not change how fast RAM responds; what matters is where the nodes are.",
            3: "The size per node matters less than the dependent chain of loads.",
          },
        },
        explanation: "The dependent chain of loads turns the loop into a series of full-latency waits. The array version exposes all its addresses up front, so loads overlap, prefetching works, and one 64-byte line brings in sixteen of the integers.",
      },
      {
        kind: "question",
        title: "Near memory and far memory",
        body: P(
          "Big servers often have **two or more CPU sockets**, each with its own RAM attached. This design is called **NUMA** (non-uniform memory access). A core reaches the RAM on its own socket (**local**) faster than the RAM on another socket (**remote**, across a link between the sockets). Typical remote latency is somewhere around 1.3 to 2 times the local one (it varies by machine).",
          "On an example server, local RAM takes 80 ns and remote RAM takes 140 ns. A thread has **25%** of its memory accesses going to remote memory (and the rest local). What is its **average** memory latency in nanoseconds?",
        ),
        question: { type: "number", answer: 95, tolerance: 0.5, unit: "ns", hint: "Weighted average: 75% × 80 + 25% × 140." },
        explanation: "0.75 × 80 + 0.25 × 140 = **95 ns**. NUMA effects are quietly large on big machines. Practical rules: keep a thread and its data on the same node (on Linux the default \"first touch\" policy places a page on the node of the thread that first writes it), pin threads, and check with `numactl --hardware` or `lscpu`. Single-socket desktops and laptops are mostly not NUMA.",
      },
      {
        kind: "explain",
        title: "Allocators and fragmentation",
        body: P(
          "Every `malloc` or `new` is a request to an **allocator** that carves blocks out of the heap. Over time, blocks of different sizes are allocated and freed in a different order, and the free space shatters into small holes. That is **external fragmentation**: plenty of free memory in total, but no single hole big enough for a new request. (The opposite problem, **internal fragmentation**, is rounding a request up to a bucket size and wasting the rest.)",
          "The heap below is 24 cells. It starts with six blocks and six one-cell holes: 6 cells free, but the biggest hole is 1. Tap *alloc 2* and watch it fail. Then tap blocks to free them and try again.",
          "Real allocators (glibc's ptmalloc, jemalloc, tcmalloc and mimalloc are examples) fight fragmentation with size classes, per-thread caches and arenas. Languages with a moving garbage collector can **compact** the heap by sliding live objects together; C and C++ cannot move a block, because pointers to it exist.",
        ),
        widget: { type: "memsys-frag", props: { blocks: [[0, 3], [4, 3], [8, 3], [12, 3], [16, 3], [20, 3]], sizes: [1, 2, 3, 4, 6, 8] } },
      },
      {
        kind: "question",
        title: "Make room",
        body: "Free blocks until an allocation of **8 cells** could succeed (the largest hole must be at least 8). Which blocks should you free?",
        widget: { type: "memsys-frag", props: { blocks: [[0, 3], [4, 3], [8, 3], [12, 3], [16, 3], [20, 3]], sizes: [1, 2, 3, 4, 6, 8] } },
        question: {
          type: "widget",
          goal: { minLargest: 8 },
          prompt: "Tap blocks to free them until the Largest hole readout reaches 8.",
          hint: "Holes only join when the blocks between them are free. Free neighbours.",
        },
        explanation: "Freeing two **neighbouring** blocks merges their space with the holes next to them into one run of 7 or 8 cells. Scattered frees leave scattered holes. That is why allocators prefer to hand out memory from the same region, why **arena** or **pool** allocation (free a whole group together) is so effective, and why long-running servers keep an eye on memory growth that is really fragmentation.",
      },
      {
        kind: "question",
        title: "Measure, don't guess",
        body: P(
          "Memory problems are found by measuring. Tools named below are **examples**; names, events and availability differ by operating system and CPU (virtual machines often hide hardware counters).",
          txt(`
lscpu                       cache sizes, sockets, NUMA nodes (Linux)
getconf LEVEL1_DCACHE_LINESIZE   cache line size (Linux)
numactl --hardware          NUMA layout; numactl --cpunodebind=0 --membind=0 ./app
perf stat -e cache-references,cache-misses,page-faults ./app
perf stat -e L1-dcache-load-misses,LLC-load-misses,dTLB-load-misses ./app
perf record -g ./app        where the time goes; perf report to read it
valgrind --tool=cachegrind ./app   simulated cache misses per line (Linux; slow)
STREAM, Intel MLC           measure memory bandwidth / latency of the machine
vmstat 1, /proc/meminfo     swapping and page-fault rates
Instruments (macOS)         time profiler and CPU counters on Apple silicon
`),
          "A good loop: **measure → form a hypothesis → change one thing → measure again**. Counters tell you *what* is happening (miss rates, IPC); a profiler tells you *where*.",
          "You profile a hot loop and see **IPC of 0.3** (very low) with a **high last-level cache miss rate**. What is the most promising first move?",
        ),
        question: {
          type: "choice",
          options: [
            "Add more threads",
            "Make the memory access pattern friendlier: contiguous data, smaller types, blocking so the working set fits in cache",
            "Raise the compiler's optimisation flag from -O2 to -O3 and stop there",
            "Buy a CPU with a higher clock",
          ],
          answer: 1,
          hint: "A low IPC with many misses means the core is mostly waiting for memory, not busy computing.",
          feedback: {
            0: "More threads share the same memory bandwidth, and can add coherence traffic. The core is waiting, not short of workers.",
            2: "A compiler flag changes instructions; this loop is waiting on memory, not executing too many.",
            3: "A faster clock speeds up the part that is already idle. The wait for RAM stays the same.",
          },
        },
        explanation: "A low IPC plus many cache misses is the signature of a **memory-bound** loop: the cores are idle, waiting. The levers are in this module: use the cache lines fully, walk memory in order, shrink the data, block the loop to fit the cache, avoid pointer chasing. Then measure again to confirm the miss rate fell.",
      },
      {
        kind: "recap",
        points: [
          "**Arithmetic intensity** (operations per byte) decides the limit: left of the roofline's ridge you are **memory-bound**, right of it **compute-bound**.",
          "Arrays stream at full bandwidth thanks to prefetching; **pointer chasing** exposes full latency for every step.",
          "On multi-socket machines **NUMA** makes remote memory slower: keep threads and data on the same node.",
          "Allocators fragment: free space in pieces is not usable space. Group lifetimes (arenas, pools) and prefer contiguous data.",
          "Measure first (perf counters, profilers, bandwidth tests; tool names differ by platform), change one thing, measure again.",
        ],
      },
    ],
  },
];
