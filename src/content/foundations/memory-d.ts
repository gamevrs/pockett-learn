import type { ConceptLesson } from "../../learn/types.ts";

/** Fenced plain-text block (tables, diagrams) for lesson prose. */
const txt = (s: string) => "~~~text\n" + s.trim() + "\n~~~";
/** Paragraphs joined with blank lines. */
const P = (...paras: string[]) => paras.join("\n\n");

/** Lesson 13 (placed after lesson 9 in the module): DRAM organisation and generations, ECC and Rowhammer, NAND flash and SSDs. */
export const memoryLessonD: ConceptLesson = {
  id: "fnd-mem-13-technologies",
  title: "Memory and storage technologies",
  summary: "Channels, ranks and banks; DDR, LPDDR, GDDR and HBM; ECC and Rowhammer; NAND flash pages and blocks, the FTL, wear and write amplification.",
  minutes: 12,
  xp: 80,
  level: "Advanced",
  steps: [
    {
      kind: "explain",
      title: "Inside a memory stick",
      body: P(
        "In *Inside a memory chip* you met one DRAM grid with its row buffer. A real memory system is many of those grids, organised in layers so that lots of them can work at once:",
        txt(`
memory controller (on the CPU)
  channel    one independent bus to the memory (64 data bits on DDR4)
    DIMM     a memory stick plugged into that channel
      rank   the set of chips that together fill the bus width,
             e.g. eight chips x 8 bits = 64 bits, all answering together
        bank one independent grid inside every chip, with its own
             row buffer (DDR4: 16 banks, DDR5: 32, typical)
          row / column   as in the first lesson
`),
        "Banks are the trick for hiding the row-opening cost. While one bank is busy opening a row, the controller can send a request to another bank, so a stream of requests spread over many banks keeps the bus busy. Channels multiply bandwidth outright: a desktop with two channels moves twice as many bytes per second as one.",
        "**DDR** means *double data rate*: data moves on both edges of the clock, so speeds are quoted in **mega-transfers per second** (MT/s). A DDR4-3200 stick does 3200 million transfers per second, each 64 bits (8 bytes) wide: 3200 × 8 = **25.6 GB/s** for one channel. A DDR5 stick splits its 64 bits into two independent 32-bit **subchannels**, which keeps more requests in flight.",
      ),
    },
    {
      kind: "question",
      title: "One stick's bandwidth",
      body: "A DDR5-6400 stick does **6400 million transfers per second**, and each transfer carries **64 bits** (its two 32-bit subchannels together). What is its peak bandwidth in **GB/s**?",
      question: { type: "number", answer: 51.2, tolerance: 0.1, unit: "GB/s", hint: "Turn 64 bits into bytes, then multiply by the transfers per second." },
      explanation: "64 bits = 8 bytes, and 6400 million × 8 bytes = **51.2 GB/s**. That is a peak: row switches, refresh and turning the bus around between reads and writes mean real programs see less, often 70 to 90% of it. The toy desktop in *Memory performance in practice* uses 50 GB/s for this reason.",
    },
    {
      kind: "question",
      title: "Wide and close",
      body: P(
        "The same DRAM cells come packaged in several families. Typical figures (order of magnitude; exact parts vary):",
        txt(`
family     where it lives               bus width      typical peak
DDR4       sticks in desktops/servers   64 bit/chan    25.6 GB/s (3200)
DDR5       sticks, 2 x 32-bit subchan   64 bit/stick   38-51 GB/s
LPDDR5X    soldered beside a phone or   16-bit chans,  ~136 GB/s for
           laptop chip, low power       128 bit total  128 bits at 8533
GDDR6/7    chips around a graphics GPU  32 bit/chip    ~1 TB/s for a
                                                       384-bit card
HBM3       stacks of DRAM dies next to  1024 bit/stack ~0.8 TB/s per
           the GPU on a silicon base                   stack (HBM3E ~1.2)
`),
        "The time to the first byte is much the same in every family: tens of nanoseconds inside the chip, because the cells are the same kind of capacitor. What differs is how many bytes move per second, and the power per byte. (The GPU module's *GPU memory* lesson shows where HBM and GDDR sit on a graphics card.)",
        "Where does HBM's huge bandwidth come from?",
      ),
      question: {
        type: "choice",
        options: [
          "Its cells are SRAM instead of DRAM",
          "A very wide bus over very short wires",
          "Each pin runs several times faster than DDR5",
          "It has much lower latency than DDR5",
        ],
        answer: 1,
        hint: "Compare the bus widths in the table, and think about where the stacks sit.",
        feedback: {
          0: "HBM is DRAM: stacked DRAM dies, the same leaky capacitors that need refresh.",
          2: "HBM's pins run at about the same rate as DDR5's (a few Gb/s each). GDDR is the family with the fast pins.",
          3: "The cells are the same kind, so the first byte takes about as long. HBM wins on bytes per second, not on latency.",
        },
      },
      explanation: "HBM stacks DRAM dies on top of each other and sits millimetres from the GPU on a silicon **interposer**, so it can afford **1024 data wires per stack** (a DDR5 stick has 64). Each wire runs at a moderate speed, which saves power. Several stacks per GPU give terabytes per second. The cost: it is expensive, and its capacity is fixed when the chip is built.",
    },
    {
      kind: "explain",
      title: "Catching flipped bits",
      body: P(
        "A DRAM bit is a tiny charge, and now and then one flips on its own: a cosmic-ray neutron or an alpha particle from the chip's own packaging hits a cell, or a weak cell leaks too fast. These **soft errors** are rare per bit, but a server holds hundreds of billions of bits, so they happen.",
        "**ECC memory** (error-correcting code) stores extra **check bits** with the data. The common scheme is **SEC-DED**: *single error correct, double error detect*. Each check bit is the parity (odd or even count of 1s) of a different group of positions, chosen so that when one bit flips, the failing checks spell out its position in binary. That number is the **syndrome**. One extra parity bit over everything tells one flip (odd) from two (even).",
        "Real ECC sticks store **64 data bits with 8 check bits**, 72 in all (an ECC DDR5 stick has 40-bit subchannels instead of 32). The toy below protects one byte with 5 check bits. It starts with one bit already flipped: read the syndrome and see which position it names. Then tap bits to flip more.",
      ),
      widget: { type: "memsys-ecc", props: { flip: [6] } },
    },
    {
      kind: "question",
      title: "Detect, but can't fix",
      body: "Flip bits so that ECC **detects** an error it **cannot correct**.",
      widget: { type: "memsys-ecc", props: {} },
      question: {
        type: "widget",
        goal: { verdict: "detected", maxFlips: 2 },
        prompt: "Tap stored bits until the verdict is \"Detected, can't fix\", with at most 2 bits flipped.",
        hint: "One flipped bit gets corrected. SEC-DED promises something different for the next number up.",
      },
      explanation: "With **two** flips the syndrome is not zero but the overall parity is even again, which no single flip can cause: ECC knows the word is bad but not which two bits to fix. The computer then reports an uncorrectable error (a server usually logs it and may stop the program or the machine rather than use bad data). With three or more flips SEC-DED can be fooled into \"fixing\" the wrong bit, so servers that need more use stronger codes, such as the *chipkill* schemes that survive a whole chip failing.",
    },
    {
      kind: "code",
      title: "How many check bits?",
      body: "Write `secded_bits(m)`: the number of check bits SEC-DED needs to protect `m` data bits.\n\nHamming's rule: with `r` check bits, the syndrome can take `2**r` values. It must be able to name any one of the `m + r` stored positions, or say \"no error\". SEC-DED then adds one overall parity bit on top.",
      language: "python",
      starter: `def secded_bits(m):
    # your code here
    return 0
`,
      solution: `def secded_bits(m):
    r = 0
    while 2 ** r < m + r + 1:
        r += 1
    return r + 1
`,
      tests: [
        { id: "byte", description: "8 data bits need 5 check bits (the toy above)", assertionCode: `assert secded_bits(8) == 5, f"got {secded_bits(8)}, expected 5"` },
        { id: "word", description: "64 data bits need 8 check bits: a 72-bit ECC word", assertionCode: `assert secded_bits(64) == 8, f"got {secded_bits(64)}, expected 8"` },
        { id: "half", description: "32 data bits need 7", assertionCode: `assert secded_bits(32) == 7, f"got {secded_bits(32)}, expected 7"` },
        { id: "wide", description: "128 data bits need 9, so wider words waste a smaller share", assertionCode: `assert secded_bits(128) == 9, f"got {secded_bits(128)}, expected 9"` },
        { id: "tiny", description: "Even 1 data bit needs 3", assertionCode: `assert secded_bits(1) == 3, f"got {secded_bits(1)}, expected 3"` },
      ],
      hints: ["Start with r = 0 and increase it while 2 ** r is too small to name m + r positions plus \"no error\".", "Return r plus 1 for the overall parity bit."],
    },
    {
      kind: "question",
      title: "Rowhammer",
      body: P(
        "Shrinking DRAM cells brought a stranger failure. Rows sit so close together that **activating one row over and over** (\"hammering\" it, tens of thousands of times between two refreshes; fewer on newer, denser chips) disturbs the charge in the **neighbouring rows** and flips their bits, without ever writing to them. Researchers showed this on ordinary DDR3 sticks in 2014, and then turned it into attacks: flipping a bit in a page table can hand a program memory it should never reach.",
        "Defences, all partial: chips and controllers count activations and refresh a hammered row's neighbours early (**target row refresh**, which later research bypassed with cleverer patterns); DDR5 adds refresh-management commands for this; refreshing more often; and ECC.",
        "Why is ECC memory **not** a complete fix for Rowhammer?",
      ),
      question: {
        type: "choice",
        options: [
          "Hammering can flip several bits in one word",
          "ECC only checks data on its way to the SSD",
          "ECC is switched off while a row is refreshed",
          "Rowhammer flips bits in the CPU cache instead",
        ],
        answer: 0,
        hint: "What exactly does SEC-DED promise, and for how many flipped bits?",
        feedback: {
          1: "ECC memory checks every word read from DRAM, not just storage traffic.",
          2: "ECC works on every read, refresh or not. The problem is how many bits flip.",
          3: "The flips happen in the DRAM rows next to the hammered one, which is exactly where ECC looks.",
        },
      },
      explanation: "SEC-DED fixes one flipped bit per word and detects two. Hammering can flip **three or more** bits in the same word, which can slip past it or be \"corrected\" into the wrong value; and even detected errors can crash a machine. ECC makes attacks much harder, not impossible, which is why the fixes are layered.",
    },
    {
      kind: "explain",
      title: "Flash: write once, erase in bulk",
      body: P(
        "An SSD stores bits in **NAND flash**: each cell traps charge in an insulated layer, so it keeps its data with the power off. Each cell holds 1 to 4 bits by storing one of several charge levels (**SLC** 1 bit, **MLC** 2, **TLC** 3, **QLC** 4; more levels means more capacity but slower, less durable cells). Modern chips are **3D NAND**: cells stacked in towers of 200 or more layers, so capacity grows upward instead of by shrinking cells.",
        "Flash has two awkward rules:",
        "- It is written a **page** at a time (16 KiB is typical) and a page can be written only once. To reuse it, the chip must **erase** it first, and it can only erase a whole **block**: hundreds of pages, several MiB.\n- Each erase wears the cells a little. A TLC block survives on the order of **a thousand to a few thousand** erase cycles (typical figures; QLC fewer, SLC far more).",
        "So the drive never overwrites in place. Its controller runs a **flash translation layer (FTL)**: a map from the *logical* pages the computer asks for to *physical* pages. A rewrite goes to a fresh page, the map is updated, and the old page is marked **stale**. When fresh pages run out, **garbage collection** picks a block, copies its still-valid pages elsewhere and erases it. Those copies are writes the computer never asked for: **write amplification** = flash writes ÷ host writes. The FTL also spreads erases evenly (**wear levelling**), and the **TRIM** command lets the OS say which pages hold deleted files, so they need no copying.",
        "This is also why an SSD read takes **tens of microseconds**, not nanoseconds: sensing a page of multi-level cells takes roughly 50 µs (typical TLC), plus the controller and the PCIe/NVMe trip. Writing a page takes hundreds of µs and erasing a block a few ms, which drives hide behind caches and parallel chips.",
        "The toy drive below starts empty. Tap the write buttons and watch pages fill, go stale and get collected.",
      ),
      widget: { type: "memsys-flash", props: { prefill: false } },
    },
    {
      kind: "question",
      title: "Garbage that isn't",
      body: "This drive already holds L0 to L5. Rewrite pages until garbage collection has to **copy at least one still-valid page** before erasing a block.",
      widget: { type: "memsys-flash", props: {} },
      question: {
        type: "widget",
        goal: { minGcCopies: 1 },
        prompt: "Write pages until the GC copies counter is at least 1.",
        hint: "Rewriting pages strictly in order makes whole blocks stale, so there is nothing to copy. Rewrite a few pages often and leave the others alone.",
      },
      explanation: "When a victim block still holds valid pages (cold data that you never rewrote, sitting next to hot data that you did), GC must move them before the erase. Each move is a flash write and a little wear, so write amplification climbs above 1. Real drives fight it with spare capacity the host never sees (**over-provisioning**), TRIM, and by keeping hot and cold data in different blocks. A nearly full drive with random writes has the worst write amplification, and gets slower and wears faster.",
    },
    {
      kind: "recap",
      points: [
        "DRAM is organised as **channels → DIMMs → ranks → chips → banks → rows**. Banks overlap row openings; channels add bandwidth. Peak bandwidth = transfers per second × bus width (DDR5-6400: 51.2 GB/s per stick).",
        "DDR, LPDDR, GDDR and HBM use the same kind of cell: similar latency, very different bandwidth and power. HBM's terabytes per second come from a 1024-bit bus per stack beside the chip.",
        "**ECC** (SEC-DED: 8 check bits per 64 data bits) fixes one flipped bit per word and detects two. **Rowhammer** flips bits in neighbouring rows; ECC and early refresh make it harder, not impossible.",
        "NAND flash writes **pages** once and erases whole **blocks**. The **FTL** remaps every write, **garbage collection** copies valid pages (write amplification), and wear levelling spreads the erases. A page read takes tens of µs, which is why SSDs sit far below RAM in the hierarchy.",
      ],
    },
  ],
};
