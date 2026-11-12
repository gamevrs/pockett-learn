import type { ConceptLesson } from "../../learn/types.ts";

/** Fenced C/C++ block for lesson prose. */
const cpp = (s: string) => "~~~cpp\n" + s.trim() + "\n~~~";
/** Fenced plain-text block (tables, diagrams) for lesson prose. */
const txt = (s: string) => "~~~text\n" + s.trim() + "\n~~~";
/** Paragraphs joined with blank lines. */
const P = (...paras: string[]) => paras.join("\n\n");

/** Lessons 1 to 4 of "Memory: from bytes to the hierarchy": the chip, the hierarchy, latency vs bandwidth, cache lines. */
export const memoryLessonsA: ConceptLesson[] = [
  // ─────────────────────────────── 1. Inside a memory chip ───────────────────────────────
  {
    id: "fnd-mem-1-chip",
    title: "Inside a memory chip",
    summary: "SRAM and DRAM: a loop that holds itself versus a bucket that leaks. Why RAM forgets, what refresh is, and why chips are grids.",
    minutes: 8,
    xp: 40,
    level: "Beginner",
    steps: [
      {
        kind: "explain",
        title: "A bit needs a holder",
        body: P(
          "In *Inside the computer* you met memory as a long row of numbered boxes. Zoom in far enough and every box is made of **bits**, and every bit lives in a tiny physical **holder** that can be in one of two states. Chips use two main kinds of holder.",
          "- **SRAM** (static RAM) uses a small loop of transistors, usually six per bit. The loop props itself up: as long as power is on, it keeps its value with no help. It is very fast, but six transistors take a lot of room.\n- **DRAM** (dynamic RAM) uses **one transistor and one capacitor** per bit. A capacitor is a tiny bucket for electric charge: full bucket means 1, empty bucket means 0. It is small and cheap, so one chip holds billions of bits.",
          "Below, the same eight bits are stored twice: the top row in SRAM, the bottom row in DRAM. The fill in each DRAM cell is its charge. Tap any cell to flip its bit, then press **Wait** a few times and watch the buckets.",
        ),
        widget: { type: "memsys-cell", props: {} },
      },
      {
        kind: "question",
        title: "What is a 1?",
        body: "In a DRAM cell, what does a stored **1** physically look like?",
        question: {
          type: "choice",
          options: ["A capacitor holding electric charge", "A loop of six transistors latched in the \"on\" position", "A tiny magnet pointing north", "A scratch in a metal surface"],
          answer: 0,
          hint: "DRAM has one transistor and one capacitor per bit. Which of those can hold something?",
          feedback: {
            1: "That is an SRAM cell. DRAM is the one with a single transistor and a bucket.",
            2: "Magnets store bits on hard disks and tapes. A DRAM chip has none.",
            3: "Scratches are how an optical disc stores bits. DRAM stores a bit as electric charge.",
          },
        },
        explanation: "A DRAM bit is **charge in a capacitor**. Charged means 1, empty means 0. The SRAM loop is the other design, with no bucket at all.",
      },
      {
        kind: "explain",
        title: "A bucket with a tiny hole",
        body: P(
          "Real buckets leak, and so do capacitors. Within a few milliseconds to seconds the charge in a DRAM cell drains away, and a 1 slowly turns into something that looks like a 0. (The leak speeds in the widget are a toy; real cells vary a lot from one to the next.)",
          "The fix is **refresh**. The memory controller keeps visiting every row: it *reads* the row, notices which cells are still above the halfway mark, and *writes* them back at full charge. The usual rule for DRAM chips is that **every cell is refreshed about every 64 ms**, sooner when the chip is hot. That sounds frequent, but it costs only a few percent of the chip's time.",
          "This is also why DRAM is called *dynamic*, and why every kind of RAM is **volatile**: switch off the power and the buckets drain (and the SRAM loops stop holding), so the bits are gone. Try the **No refresh** and **Every 64 ms** settings, then press Power off.",
        ),
        widget: { type: "memsys-cell", props: {} },
      },
      {
        kind: "question",
        title: "Keep every bit alive",
        body: "Choose an automatic refresh setting that keeps **all** the bits alive, then let at least **300 ms** pass.",
        widget: { type: "memsys-cell", props: {} },
        question: {
          type: "widget",
          goal: { refreshMs: 64, minElapsed: 300, maxLost: 0 },
          prompt: "Pick a refresh interval that loses no bits, then press Wait until 300 ms have passed.",
          hint: "A cell dies when its charge falls below halfway. The refresh has to arrive before the weakest cell gets there.",
        },
        explanation: "Refreshing every **64 ms** reaches every cell before the weakest one fades. At 128 ms the leakiest cells are already below halfway, so their 1s are lost for good: a refresh can only top up charge that is still there.",
      },
      {
        kind: "explain",
        title: "Chips are grids",
        body: P(
          "A memory chip is not a long line of cells; it is a **grid** of rows and columns. To read a byte, the chip first **activates a whole row**: it copies every cell of that row into a small holder called the **row buffer**. Then it picks the **column** it wants from the buffer.",
          "That makes a second read from the same row cheap (the row is already open), and a read from a different row expensive (close the old row, open the new one). Typical order-of-magnitude numbers: about **15 ns** for a row hit, about **45 ns** for a row switch. The grid below is a tiny 4 × 4 toy; a real row holds thousands of bytes.",
          "Tap any cell to read it. Read a few from the same row, then jump to another row.",
        ),
        widget: { type: "memsys-rowbuf", props: {} },
      },
      {
        kind: "question",
        title: "Stay on the open row",
        body: "Read at least **8** cells with a **total of 150 ns or less**.",
        widget: { type: "memsys-rowbuf", props: {} },
        question: {
          type: "widget",
          goal: { minReads: 8, maxTotal: 150 },
          prompt: "Tap cells until you have made 8 reads that together cost 150 ns or less.",
          hint: "The first read has to open a row. After that, each read from the same row is cheap. A row switch is the expensive move.",
        },
        explanation: "The first read opens a row (30 ns). Seven more reads from that same row cost 15 ns each: 30 + 7 × 15 = 135 ns. Even one row switch (45 ns) pushes the total over 150. Programs that read **neighbouring** addresses live on open rows; that idea comes back in a big way in a few lessons.",
      },
      {
        kind: "question",
        title: "Why two kinds?",
        body: "A CPU's L1 cache is built from **SRAM**, but the main memory sticks are **DRAM**. Why not make all memory out of SRAM?",
        question: {
          type: "choice",
          options: [
            "SRAM cells are much bigger and costlier per bit, so a big SRAM memory would be huge and expensive",
            "SRAM forgets its data every 64 ms and needs refreshing",
            "SRAM is slower than DRAM",
            "SRAM cannot be put on a chip",
          ],
          answer: 0,
          hint: "Count the parts in each cell: six transistors against one transistor and one capacitor.",
          feedback: {
            1: "It is the other way round: DRAM is the one that needs refreshing. SRAM keeps its value while powered.",
            2: "SRAM is the faster kind, which is exactly why caches use it.",
            3: "SRAM sits right on the CPU chip; that is where caches are.",
          },
        },
        explanation: "SRAM is **faster** but needs about six transistors per bit, so it is big and costly. DRAM packs a bit into a transistor plus a bucket, so gigabytes fit in a few chips. Computers use a **little SRAM close to the CPU** and a **lot of DRAM further away**. That trade is the next lesson.",
      },
      {
        kind: "recap",
        points: [
          "**SRAM** holds a bit in a self-propping transistor loop (fast, big, costly). **DRAM** holds it as charge in a capacitor (small, cheap, slower).",
          "DRAM charge **leaks**, so every row is **refreshed** (read and written back) about every **64 ms**. All RAM is **volatile**: no power, no data.",
          "A DRAM chip is a **grid**. A read opens a whole **row** into the row buffer; reads from the open row are cheap, switching rows costs more.",
          "Computers pair a small amount of fast SRAM (caches) with a large amount of cheap DRAM (main memory).",
        ],
      },
    ],
  },

  // ─────────────────────────────── 2. The memory hierarchy ───────────────────────────────
  {
    id: "fnd-mem-2-hierarchy",
    title: "The memory hierarchy",
    summary: "Registers to SSD: why computers stack small fast memory on big slow memory, and the average-access-time arithmetic that makes it work.",
    minutes: 8,
    xp: 45,
    level: "Beginner",
    steps: [
      {
        kind: "explain",
        title: "Fast, big, cheap: pick two",
        body: P(
          "Every kind of memory is a trade between three things: **speed**, **size** and **cost**. You can have two of them. A memory that is fast and big would cost a fortune; one that is big and cheap is slow; one that is fast and cheap is tiny.",
          "Computers do not pick one. They stack several memories, each **bigger and slower than the one above it**, and keep the things you use most in the top layers. That stack is the **memory hierarchy**. Typical figures for a modern desktop (order of magnitude; real chips vary):",
          txt(`
level        size            time to read
registers    ~ 1 KB          ~ 0.3 ns
L1 cache     32-64 KB        ~ 1 ns
L2 cache     0.25-2 MB       ~ 4 ns
L3 cache     8-64 MB         ~ 15 ns
RAM (DRAM)   8-64 GB         ~ 80-100 ns
SSD          0.5-4 TB        ~ 10-100 us
`),
          "You met this ladder in *Inside the computer*, where RAM was rounded to 100 ns; the sums in this module use 90 ns, a typical middle of the 80 to 100 ns range. This module goes further: how each rung really works, and how to write code that stays on the upper ones.",
        ),
      },
      {
        kind: "question",
        title: "Smallest to biggest",
        body: "Put these in order, **smallest capacity first**.",
        question: {
          type: "order",
          items: ["Registers", "L1 cache", "L3 cache", "Main memory (RAM)", "SSD"],
          hint: "The faster a memory is, the less of it a computer can afford.",
        },
        explanation: "Capacity grows by roughly a factor of ten or more at each step, and speed drops by about the same. That is the whole bargain: the smaller layers are quick because there is little of them to search and they sit close to the cores.",
      },
      {
        kind: "explain",
        title: "Time you can feel",
        body: P(
          "Nanoseconds are hard to picture. So stretch time until **1 ns lasts 1 second**. Tap each rung to see how long a read would take for a person.",
          "In that scale an L1 hit takes a second, RAM takes a minute and a half, and an SSD read takes about a day. A program that has to go to the SSD for every value is not slow in the way a slow phone is slow; it is working on a different clock.",
        ),
        widget: { type: "computer-latency", props: { levels: ["reg", "l1", "l2", "l3", "ram", "ssd"], scale: "human" } },
      },
      {
        kind: "question",
        title: "How many L1 reads?",
        body: "One RAM access takes about **90 ns**. An L1 hit takes about **1 ns**. How many L1 hits fit in the time of **one** RAM access?",
        question: { type: "number", answer: 90, tolerance: 0, unit: "hits", hint: "Divide the RAM time by the L1 time." },
        explanation: "About **90**. While the CPU waits for one trip to RAM, it could have read ninety values from L1. That is what a cache miss costs, and why hardware works so hard to avoid them.",
      },
      {
        kind: "explain",
        title: "The average access",
        body: P(
          "The stack only works because programs are **repetitive**: they reuse the same data and walk through neighbouring addresses. So most reads are found in the top layers (hits) and only a few fall through to the next one (misses).",
          "The **average memory access time** adds it up. Every access pays for L1. The fraction that misses L1 also pays for L2, the fraction that misses both also pays for L3, and so on:",
          txt("average = t(L1) + miss1 x ( t(L2) + miss2 x ( t(L3) + miss3 x t(RAM) ) )"),
          "Move the three sliders. Each one is the share of accesses *reaching that level* that are found there. Watch where the time goes.",
        ),
        widget: { type: "memsys-amat", props: {} },
      },
      {
        kind: "question",
        title: "Make it fast",
        body: "Set the three hit rates so the **average access** is **2 ns or less**.",
        widget: { type: "memsys-amat", props: { initial: [80, 40, 40] } },
        question: {
          type: "widget",
          goal: { maxNs: 2 },
          prompt: "Move the hit-rate sliders until the average access is 2 ns or less.",
          hint: "The L1 slider matters most: every access pays for L1, and every miss in it sends traffic further down.",
        },
        explanation: "You need an L1 hit rate in the high 90s, with decent L2 and L3 rates behind it. Real programs with good locality do reach this. Notice the pattern: the average sits **close to the L1 time**, and the rare RAM trips make up most of what is left.",
      },
      {
        kind: "question",
        title: "A small share, a big bite",
        body: "In the widget, only a few percent of accesses went all the way to RAM, but RAM often accounted for a large part of the total time. Why?",
        question: {
          type: "choice",
          options: [
            "Each RAM access takes tens of times longer than an L1 hit, so a few of them weigh as much as many hits",
            "RAM accesses are counted twice",
            "The sliders are not accurate for RAM",
            "RAM is bigger, so reading it takes more bytes",
          ],
          answer: 0,
          hint: "Think of 3 slow trips of 90 ns next to 97 quick ones of 1 ns.",
          feedback: {
            1: "Each access is counted once. The bar shows how many nanoseconds each level contributes.",
            2: "RAM's 90 ns is a typical figure, and the sum is exact for the numbers shown.",
            3: "A read fetches the same small amount; it is the waiting that is long, not the size.",
          },
        },
        explanation: "3 trips of 90 ns cost 270 ns; 97 hits of 1 ns cost 97 ns. Rare, slow events **dominate** averages. This is why \"raise the hit rate\" is the main lever, and why a few percent of misses is a big deal.",
      },
      {
        kind: "recap",
        points: [
          "Memory trades **speed, size and cost**; computers stack layers: registers, L1, L2, L3, RAM, SSD, each bigger and slower than the last.",
          "Typical order of magnitude: L1 about 1 ns, L2 about 4 ns, L3 about 15 ns, RAM about 90 ns, SSD tens of microseconds.",
          "The stack works because programs **reuse data and read neighbours**, so most accesses hit near the top.",
          "**Average access = t(L1) + miss1 × (t(L2) + miss2 × (…))**. The rare slow trips dominate the average, so hit rate is the lever.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 3. Latency vs bandwidth ───────────────────────────────
  {
    id: "fnd-mem-3-latency-bandwidth",
    title: "Latency vs bandwidth",
    summary: "How long the first byte takes versus how many bytes arrive per second, and why one big read beats a thousand small ones.",
    minutes: 8,
    xp: 50,
    level: "Beginner",
    steps: [
      {
        kind: "explain",
        title: "The pipe",
        body: P(
          "Imagine a long water pipe. Turn the tap and you wait for the first drop to come out the far end: that wait is the **latency**. Once the water flows, the pipe delivers so many litres per second: that rate is the **bandwidth**.",
          "Memory and storage work the same way. **Latency** is how long until the *first byte* arrives. **Bandwidth** is how many bytes per second flow after that. Moving a block of bytes takes:",
          txt("total time = latency + bytes / bandwidth"),
          "Pick a device and drag the size. The red part of the bar is waiting, the green part is moving bytes. (Numbers are typical, rounded; real devices differ by a factor of a few.)",
        ),
        widget: { type: "memsys-pipe", props: { link: "ram", exp: 12 } },
      },
      {
        kind: "question",
        title: "Mostly waiting",
        body: "Pick the **NVMe SSD** and find a size where the drive spends **more than half** its time waiting for the first byte.",
        widget: { type: "memsys-pipe", props: { link: "nvme", exp: 24 } },
        question: {
          type: "widget",
          goal: { link: "nvme", maxEfficiency: 0.5 },
          prompt: "Choose a size so the red (waiting) part is bigger than the green part.",
          hint: "Small transfers are all wait. Drag the size down until the red part is bigger.",
        },
        explanation: "The NVMe drive waits about 80 µs and then moves 5 GB every second. Latency and transfer take equal time at about **400 KB** (80 µs × 5 GB/s). Below that, a read is mostly waiting; above it, mostly flowing.",
      },
      {
        kind: "question",
        title: "A slow disk",
        body: "A hard disk takes **10 ms** to the first byte, then delivers **150 MB per second**. How many milliseconds does it take to read **15 MB**?",
        question: { type: "number", answer: 110, tolerance: 1, unit: "ms", hint: "Transfer time = size / speed. Then add the wait." },
        explanation: "15 MB at 150 MB/s is 0.1 s = 100 ms, plus the 10 ms wait: **110 ms**. Here the transfer dominates. For a 15 KB read the same disk would take about 10.1 ms, almost all waiting.",
      },
      {
        kind: "explain",
        title: "Many small versus one big",
        body: P(
          "Because latency is paid **once per request**, the number of requests matters as much as their size. Take the NVMe drive and read 4 MB of data:",
          "- as **1000 reads of 4 KB**: 1000 × (80 µs + 0.8 µs) ≈ **81 ms**\n- as **one read of 4 MB**: 80 µs + 0.8 ms ≈ **0.9 ms**",
          "Same bytes, about ninety times faster. The same rule holds for RAM, for databases and for network calls: **batch your requests**. The break-even size, latency × bandwidth, tells you how big a request must be before the wait stops mattering.",
          "Slide the widget to see how the break-even size changes from one device to the next.",
        ),
        widget: { type: "memsys-pipe", props: { exp: 14 } },
      },
      {
        kind: "question",
        title: "A thousand lookups",
        body: "Your program must read 1000 small records that sit next to each other on an SSD. Which change helps **most**?",
        question: {
          type: "choice",
          options: [
            "Buy a drive with twice the bandwidth",
            "Read them all with one large request instead of 1000 small ones",
            "Add more RAM so the program has room",
            "Read them in a random order",
          ],
          answer: 1,
          hint: "Small requests are limited by latency, not by bandwidth. How do you pay the wait less often?",
          feedback: {
            0: "Small reads are limited by the wait for the first byte, so extra bandwidth barely helps.",
            2: "More RAM does not make each trip to the drive any shorter.",
            3: "A random order does not remove any waits; if anything it can add them.",
          },
        },
        explanation: "One big request pays the latency **once**. Twice the bandwidth would shave only the tiny transfer part of each of the 1000 small reads. The lesson of this module in one line: **fewer, bigger, nearer** beats many, small, far.",
      },
      {
        kind: "code",
        title: "Total transfer time",
        body: "Write `transfer_ms(latency_ms, size_mb, mb_per_s)`. It returns the **total time in milliseconds** to move `size_mb` megabytes over a link that takes `latency_ms` to the first byte and then delivers `mb_per_s` megabytes per second.\n\nRemember: bytes / (bytes per second) gives **seconds**, and there are 1000 ms in a second.",
        language: "python",
        starter: `def transfer_ms(latency_ms, size_mb, mb_per_s):
    # latency + size / speed, in milliseconds
    return latency_ms
`,
        solution: `def transfer_ms(latency_ms, size_mb, mb_per_s):
    return latency_ms + size_mb / mb_per_s * 1000
`,
        tests: [
          { id: "disk", description: "Hard disk: 10 ms wait, 15 MB at 150 MB/s is 110 ms", assertionCode: `assert abs(transfer_ms(10, 15, 150) - 110) < 0.01, f"got {transfer_ms(10, 15, 150)}, expected 110"` },
          { id: "zero", description: "No wait at all: 1 MB at 1000 MB/s is 1 ms", assertionCode: `assert transfer_ms(0, 1, 1000) == 1.0, f"got {transfer_ms(0, 1, 1000)}, expected 1.0"` },
          { id: "net", description: "1 MB over an ocean link: 150 ms wait + 0.8 ms", assertionCode: `assert abs(transfer_ms(150, 1, 1250) - 150.8) < 0.001, f"got {transfer_ms(150, 1, 1250)}, expected 150.8"` },
        ],
        hints: ["Seconds = size_mb / mb_per_s. Multiply by 1000 to get milliseconds.", "Return latency_ms plus that transfer time."],
      },
      {
        kind: "question",
        title: "Which one can you buy?",
        body: "Engineers can raise memory **bandwidth** by adding more channels, wider buses and more chips working in parallel. **Latency** is much harder to improve. Why?",
        question: {
          type: "choice",
          options: [
            "Latency depends on physical things: signals crossing wires, opening a DRAM row, distance. Parallel chips don't make one trip shorter",
            "Latency is only caused by bad software",
            "Bandwidth is measured in a different unit, so it is easier to inflate",
            "Faster clocks always remove latency",
          ],
          answer: 0,
          hint: "Ten lanes on a motorway carry more cars per hour, but does any single car arrive sooner?",
          feedback: {
            1: "Even perfect software waits for the DRAM row to open and the signal to travel.",
            2: "Both are real, physical numbers. Parallelism simply helps one but not the other.",
            3: "A faster clock helps, but wires, row activation and distance set a floor that clocks don't remove.",
          },
        },
        explanation: "More parallel pipes means **more bytes per second**, but each byte still makes the same trip. That is why a program that asks for one value at a time (a long chain of dependent reads) is stuck on latency no matter how wide the memory is. The next lessons are all about hiding or avoiding that wait.",
      },
      {
        kind: "recap",
        points: [
          "**Latency** = time until the first byte. **Bandwidth** = bytes per second afterwards. **Total = latency + bytes / bandwidth**.",
          "Small transfers are **latency-bound**; large ones are **bandwidth-bound**. The break-even size is latency × bandwidth.",
          "Latency is paid **once per request**, so many small requests are far slower than one big one: batch.",
          "Bandwidth can be bought with more parallel hardware; latency is set by physics and is much harder to improve.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 4. Cache lines and locality ───────────────────────────────
  {
    id: "fnd-mem-4-lines",
    title: "Cache lines and locality",
    summary: "Memory moves in 64-byte lines. Spatial and temporal locality, why row-by-row beats column-by-column, and what a prefetcher does.",
    minutes: 9,
    xp: 55,
    level: "Intermediate",
    steps: [
      {
        kind: "explain",
        title: "You never fetch one byte",
        body: P(
          "When the CPU reads a single byte that is not in its cache, it does not fetch just that byte. It fetches a whole **cache line**: an aligned block of **64 bytes** on most x86 and ARM chips. (Some chips use other sizes; Apple's M-series, for example, uses 128 bytes at some levels.) Think of buying eggs: the shop sells them by the carton, so you pay for the whole carton even if you wanted one.",
          "That is a good deal when your next read is *nearby*, because it is already in the carton. It is a poor deal when you only wanted one egg from each of a hundred cartons.",
          "The grid below is an 8 × 16 array of 4-byte ints. One row is exactly 64 bytes, so **one row = one cache line**. Press *Next read* a few times, then *Run to the end*. Red cells are misses (a line had to be fetched), green cells are hits.",
        ),
        widget: { type: "memsys-walk", props: { order: "row", lines: 4, lock: ["order", "lines", "prefetch"] } },
      },
      {
        kind: "question",
        title: "Ints per line",
        body: "A cache line is 64 bytes and an `int` is 4 bytes. How many `int`s fit in one line?",
        question: { type: "number", answer: 16, tolerance: 0, unit: "ints", hint: "Divide the line size by the size of one int." },
        explanation: "64 / 4 = **16**. Walking through an int array one element at a time, you miss once and then hit fifteen times: the first read pays for the line, and the next fifteen are free.",
      },
      {
        kind: "explain",
        title: "Two kinds of locality",
        body: P(
          "Caches work because real programs show **locality**, in two flavours:",
          "- **Spatial locality**: after reading address *a*, you soon read addresses near *a* (the next array element, the next field). Cache lines capture this.\n- **Temporal locality**: a value you used a moment ago, you tend to use again (a loop counter, a running total). Keeping recently used lines captures this.",
          "A 2D array makes the difference visible. In C, `int m[8][16]` is stored **row by row**. These two loops read the same 128 numbers:",
          cpp(`
// A: row by row (walks memory in order)
for (int r = 0; r < 8; r++)
    for (int c = 0; c < 16; c++)
        sum += m[r][c];

// B: column by column (jumps 64 bytes each time)
for (int c = 0; c < 16; c++)
    for (int r = 0; r < 8; r++)
        sum += m[r][c];
`),
          "Switch the widget to *Column by column* and run it. The cache holds only **4 lines**.",
        ),
        widget: { type: "memsys-walk", props: { order: "col", lines: 4, lock: ["prefetch"] } },
      },
      {
        kind: "question",
        title: "Rescue the column walk",
        body: "Column-by-column is awful with a 4-line cache. Change the settings so the whole column-by-column walk has **at most 8 misses**, the same as row-by-row.",
        widget: { type: "memsys-walk", props: { order: "col", lines: 4, lock: ["prefetch"] } },
        question: {
          type: "widget",
          goal: { order: "col", maxMisses: 8 },
          prompt: "Keep the order on Column by column and change the cache size until the total is 8 misses or fewer.",
          hint: "There are 8 lines in the whole array. What if the cache could hold all of them at once?",
        },
        explanation: "With room for all **8 lines**, column-by-column fetches each line once and then hits on every later column. With only 4 lines, every read evicts a line that is needed again soon, so every read is a miss: **128 misses instead of 8**. A real array is far bigger than any cache, so the cache can never hold all its lines: walk it in memory order.",
      },
      {
        kind: "explain",
        title: "The prefetcher guesses",
        body: P(
          "CPUs do not wait for you to ask. A **hardware prefetcher** watches the addresses you read, spots a pattern (\"+64, +64, +64…\"), and fetches the next line **before** you ask for it, so it is already in the cache when you arrive.",
          "That only works when the pattern is regular. Walking an array in order is perfect. Hopping around randomly, or chasing a pointer to find the next address, gives the prefetcher nothing to guess.",
          "Walk row by row, first with *Prefetch next line* off and then on. With it on, the prefetcher grabs the next row whenever a read has to fetch one.",
        ),
        widget: { type: "memsys-walk", props: { order: "row", lines: 4, lock: ["order"] } },
      },
      {
        kind: "question",
        title: "Prefetch pays off",
        body: "Walk **row by row** with the prefetcher **on**. What is the **fewest misses** you can get for the whole walk?",
        widget: { type: "memsys-walk", props: { order: "row", lines: 4, lock: ["order", "lines"] } },
        question: {
          type: "widget",
          goal: { order: "row", prefetch: true, maxMisses: 4 },
          prompt: "Turn Prefetch next line on so the whole walk has 4 misses or fewer.",
          hint: "Each miss now also fetches the next row for free. How many misses does that leave out of 8 rows?",
        },
        explanation: "Without the prefetcher the walk misses on all **8** rows. With it, every second row arrives early, so only **4** reads stall. A real prefetcher can run further ahead and hide almost all of them. It is a bet on regular patterns, and sequential walks are the pattern it knows best.",
      },
      {
        kind: "code",
        title: "Count the lines",
        body: "Write `lines_touched(addresses, line_size=64)`. It takes a list of **byte addresses** and returns how many **distinct cache lines** they fall in.\n\nA line is a block of `line_size` bytes starting at a multiple of `line_size`, so the line number of an address is `address // line_size`.",
        language: "python",
        starter: `def lines_touched(addresses, line_size=64):
    # how many different lines do these addresses fall in?
    return 0
`,
        solution: `def lines_touched(addresses, line_size=64):
    return len({a // line_size for a in addresses})
`,
        tests: [
          { id: "same", description: "Four neighbouring ints share one line", assertionCode: `assert lines_touched([0, 4, 8, 12]) == 1, "addresses 0 to 12 are all inside line 0"` },
          { id: "spread", description: "Addresses 64 bytes apart each need their own line", assertionCode: `assert lines_touched([0, 64, 128, 192]) == 4, "each of these starts a new line"` },
          { id: "edge", description: "63 is the last byte of line 0, 64 starts line 1", assertionCode: `assert lines_touched([0, 63, 64]) == 2, "63 is in line 0 and 64 is in line 1"` },
          { id: "walk", description: "A row-by-row walk of 128 ints touches 8 lines; column-by-column touches the same 8", assertionCode: `a = [4 * (r * 16 + c) for r in range(8) for c in range(16)]\nassert lines_touched(a) == 8, f"got {lines_touched(a)}, expected 8"\nb = [4 * (r * 16 + c) for c in range(16) for r in range(8)]\nassert lines_touched(b) == 8, "the order does not change which lines are touched, only how often they are re-fetched"` },
        ],
        hints: ["Use `address // line_size` to get the line number.", "A set keeps each line number only once: `len({...})`."],
      },
      {
        kind: "question",
        title: "Which loop?",
        body: "A C program has `int grid[1000][1000];`, stored row by row. Which loop nest walks memory **in order** (and so uses the cache best)?",
        question: {
          type: "choice",
          options: [
            "for (j...) for (i...) sum += grid[i][j];",
            "for (i...) for (j...) sum += grid[i][j];",
            "for (i...) for (j...) sum += grid[j][i];",
            "Both are the same speed; the compiler fixes it",
          ],
          answer: 1,
          hint: "In grid[i][j], the last index is the one that changes fastest in memory. Which loop should be the inner one?",
          feedback: {
            0: "Here the inner loop changes i, the row, so every read jumps 4000 bytes ahead.",
            2: "grid[j][i] with j inner jumps a whole row each time, just like walking by columns.",
            3: "Compilers can sometimes swap loops, but you cannot count on it, and the speed difference can be many times.",
          },
        },
        explanation: "Make the **inner loop the last index**: `grid[i][j]` with `j` innermost. Then consecutive reads are 4 bytes apart and share lines. With `i` innermost, each read is 4000 bytes from the last, so every read lands on a new line. On big arrays this can be several times slower, with identical results.",
      },
      {
        kind: "recap",
        points: [
          "Memory moves in **cache lines**: 64 bytes on most x86 and ARM chips (some chips use 128). A miss fetches the whole line.",
          "**Spatial locality** (nearby addresses) is captured by line size; **temporal locality** (reuse) by keeping recent lines.",
          "Walk arrays **in memory order**: for row-major C arrays the last index goes in the inner loop. Column-by-column over a big array re-fetches lines it just threw away.",
          "A **prefetcher** fetches the next lines ahead of you, but only for regular patterns like sequential or constant-stride access.",
        ],
      },
    ],
  },
];
