import type { ConceptLesson } from "../../learn/types.ts";

/** Fenced C/C++ block for lesson prose. */
const cpp = (s: string) => "~~~cpp\n" + s.trim() + "\n~~~";
/** Fenced plain-text block (tables, diagrams) for lesson prose. */
const txt = (s: string) => "~~~text\n" + s.trim() + "\n~~~";
/** Paragraphs joined with blank lines. */
const P = (...paras: string[]) => paras.join("\n\n");

/** Ten named lines for the cache widgets: A is address 0, B is 16, and so on (16-byte lines). */
const LETTERS = "ABCDEFGHIJ".split("").map((name, i) => ({ name, addr: i * 16 }));

/** Lessons 5 to 8: how a cache finds data, the three kinds of miss, alignment and layout, virtual memory. */
export const memoryLessonsB: ConceptLesson[] = [
  // ─────────────────────────────── 5. How a cache finds data ───────────────────────────────
  {
    id: "fnd-mem-5-find",
    title: "How a cache finds data",
    summary: "Splitting an address into tag, index and offset. Direct-mapped versus set-associative caches, hits, misses and LRU eviction.",
    minutes: 9,
    xp: 55,
    level: "Intermediate",
    steps: [
      {
        kind: "explain",
        title: "Where would it be?",
        body: P(
          "A cache holds thousands of lines. When the CPU asks for an address, the cache cannot afford to look at every line one by one. Instead, the **address itself says where to look**. The hardware cuts the address into three fields:",
          "- **offset** (the low bits): which byte *inside* the line. For 64-byte lines that is 6 bits.\n- **index** (the next bits): which **set** of the cache to look in. A set is a small group of slots.\n- **tag** (all the remaining high bits): the identity of the line. Many lines share one set, so each slot stores its tag to say which line it really holds.",
          "A **hit** is: *the set picked by the index has a slot whose tag matches*. If not, it is a miss. A typical L1 data cache (32 KiB, 8 slots per set, 64-byte lines) has 64 sets: 6 offset bits and 6 index bits. The widget below is that cache, with toy 16-bit addresses so the bits fit on screen. Press *+1 byte* and *+1 line* and watch which field changes.",
        ),
        widget: { type: "memsys-addr", props: { lineBytes: 64, setBits: 6, ways: 8, addr: 0x1234 } },
      },
      {
        kind: "question",
        title: "Build a cache shape",
        body: "Configure a cache with **64-byte lines** and **16 sets**.",
        widget: { type: "memsys-addr", props: { lineBytes: 32, setBits: 3, ways: 2, addr: 0x2345 } },
        question: {
          type: "widget",
          goal: { lineBytes: 64, sets: 16, offsetBits: 6, indexBits: 4 },
          prompt: "Set the line size to 64 and the number of sets to 16, and read off the offset and index bits.",
          hint: "The number of sets is a power of two: 16 sets means 4 index bits, because 2⁴ = 16.",
        },
        explanation: "64-byte lines need **6 offset bits** (2⁶ = 64) and 16 sets need **4 index bits** (2⁴ = 16). In general: offset bits = log₂(line size), index bits = log₂(number of sets), and the tag is whatever address bits are left.",
      },
      {
        kind: "question",
        title: "Which set?",
        body: "In the cache below (64-byte lines, 64 sets), which **set number** does address `0x1234` map to?",
        widget: { type: "memsys-addr", props: { lineBytes: 64, setBits: 6, ways: 8, addr: 0x1234, lockShape: true } },
        question: { type: "number", answer: 8, tolerance: 0, unit: "set", hint: "Drop the lowest 6 bits (the offset), then keep the next 6 bits." },
        explanation: "0x1234 is `0001 0010 0011 0100` in binary. The low 6 bits (`110100`, = 52) are the offset. The next 6 bits (`001000`) are the index: **set 8**. What is left (`0001`) is the tag.",
      },
      {
        kind: "explain",
        title: "One slot, or several",
        body: P(
          "How many slots does a set have? That is the **associativity**, and it is a trade-off.",
          "- **Direct-mapped** (1 way): each line has exactly one possible slot. Simple and fast to check, but two lines that map to the same set keep kicking each other out.\n- **N-way set-associative**: each set has N slots, and a line may sit in any of them. Hardware checks all N tags at once. Real L1 caches are often 8-way or 12-way; L2 and L3 use more.\n- **Fully associative**: one set holds everything; any line can go anywhere. Flexible, but checking every tag is costly, so it is used only for small things.",
          "The cache below holds 8 lines of 16 bytes. Lines **A** and **B** live at addresses that map to the same set in the direct-mapped layout. Tap A, then B, then A again. Then change *Ways per set* to 2 and try again.",
        ),
        widget: {
          type: "memsys-cache",
          props: { lines: 8, lineBytes: 16, ways: 1, chooseWays: true, palette: [{ name: "A", addr: 0x00 }, { name: "B", addr: 0x80 }, { name: "C", addr: 0x10 }, { name: "D", addr: 0x20 }] },
        },
      },
      {
        kind: "question",
        title: "A ping-pong, fixed",
        body: "The list reads **A, B, A, B, A, B**. In a direct-mapped cache, A and B fight over one slot and every read misses. Choose a way count so the **whole list has only 2 misses**, then press *Next access* through all six reads.",
        widget: {
          type: "memsys-cache",
          props: {
            lines: 8,
            lineBytes: 16,
            ways: 1,
            chooseWays: true,
            sequence: [0x00, 0x80, 0x00, 0x80, 0x00, 0x80],
            palette: [{ name: "A", addr: 0x00 }, { name: "B", addr: 0x80 }],
          },
        },
        question: {
          type: "widget",
          goal: { done: true, maxMisses: 2 },
          prompt: "Pick the number of ways, then step through all six reads and finish with at most 2 misses.",
          hint: "With one way per set, A and B share a single slot. How many slots does a set need so both can stay?",
        },
        explanation: "With **2 or more ways**, A and B sit in the same set but in different slots, so only the first read of each misses (two cold misses) and the rest hit. In the direct-mapped cache both lines want the one slot in their set, so each read evicts the line the next read needs. More ways cost more hardware, but they take away this kind of avoidable fight.",
      },
      {
        kind: "explain",
        title: "Who gets evicted?",
        body: P(
          "When a set is full and a new line arrives, one old line must go. Hardware usually evicts the **least recently used** one (**LRU**, or a cheap approximation of it): the line you touched longest ago is the one you are least likely to need soon.",
          "Here the cache has 2 ways per set, and lines **A**, **B** and **C** all map to set 0. Step through the list **A, B, A, C, B, A**. Watch the *LRU* tag: it marks the line that would be evicted next.",
        ),
        widget: {
          type: "memsys-cache",
          props: {
            lines: 8,
            lineBytes: 16,
            ways: 2,
            sequence: [0x00, 0x40, 0x00, 0x80, 0x40, 0x00],
            palette: [{ name: "A", addr: 0x00 }, { name: "B", addr: 0x40 }, { name: "C", addr: 0x80 }],
          },
        },
      },
      {
        kind: "question",
        title: "The line that leaves",
        body: "A 2-way set holds **A** and **B**. The reads so far were: A, B, A. Now **C** arrives and maps to the same set. Which line is evicted?",
        question: {
          type: "choice",
          options: ["A", "B", "C", "Neither: the cache grows by one slot"],
          answer: 1,
          hint: "The last read was A. LRU removes whichever line was used longest ago.",
          feedback: {
            0: "A was read most recently (the third read). LRU keeps it.",
            2: "C is the newcomer; it is the line being put in, not thrown out.",
            3: "A set has a fixed number of slots. Hardware does not add more.",
          },
        },
        explanation: "The order of use is B (second read), then A (third read). **B** is the least recently used, so it makes way for C. Had the list been A, B, B, the answer would flip to A. Tracking \"who was used last\" is why each set keeps a little extra LRU state.",
      },
      {
        kind: "code",
        title: "Split an address",
        body: "Write `split_address(addr, offset_bits, index_bits)` that returns the tuple `(tag, index, offset)`.\n\nShifts and masks do it: `addr & ((1 << n) - 1)` keeps the low `n` bits, and `addr >> n` drops them.",
        language: "python",
        starter: `def split_address(addr, offset_bits, index_bits):
    # return (tag, index, offset)
    return (0, 0, 0)
`,
        solution: `def split_address(addr, offset_bits, index_bits):
    offset = addr & ((1 << offset_bits) - 1)
    index = (addr >> offset_bits) & ((1 << index_bits) - 1)
    tag = addr >> (offset_bits + index_bits)
    return (tag, index, offset)
`,
        tests: [
          { id: "l1", description: "0x1234 with 64-byte lines and 64 sets", assertionCode: `assert split_address(0x1234, 6, 6) == (1, 8, 52), f"got {split_address(0x1234, 6, 6)}, expected (1, 8, 52)"` },
          { id: "top", description: "The top of a 16-bit address space is all ones", assertionCode: `assert split_address(0xFFFF, 6, 6) == (15, 63, 63), f"got {split_address(0xFFFF, 6, 6)}, expected (15, 63, 63)"` },
          { id: "wrap", description: "One line further moves the index, not the offset", assertionCode: `assert split_address(64, 6, 6) == (0, 1, 0), f"got {split_address(64, 6, 6)}, expected (0, 1, 0)"` },
          { id: "same-set", description: "Addresses 4096 apart share a set but differ in tag", assertionCode: `a = split_address(0x2040, 6, 6)\nb = split_address(0x3040, 6, 6)\nassert a[1] == b[1] and a[0] != b[0], f"got {a} and {b}"` },
        ],
        hints: ["offset = the low offset_bits bits of addr.", "index = the next index_bits bits: shift right by offset_bits, then mask.", "tag = everything above: addr >> (offset_bits + index_bits)."],
      },
      {
        kind: "recap",
        points: [
          "A cache cuts an address into **tag | index | offset**. The offset picks the byte in a line, the **index picks the set**, and the **tag** tells lines in the same set apart.",
          "Offset bits = log₂(line size); index bits = log₂(number of sets); the tag is the rest.",
          "**Direct-mapped** = 1 way (fast, but lines collide). **N-way set-associative** = N slots per set. **Fully associative** = one big set.",
          "When a set is full, hardware evicts the **least recently used** line (or a close approximation).",
        ],
      },
    ],
  },

  // ─────────────────────────────── 6. The three kinds of miss ───────────────────────────────
  {
    id: "fnd-mem-6-misses",
    title: "The three kinds of miss",
    summary: "Compulsory, capacity and conflict misses, the working set, and why the speed of a program climbs in steps as its data grows.",
    minutes: 9,
    xp: 60,
    level: "Intermediate",
    steps: [
      {
        kind: "explain",
        title: "Not all misses are alike",
        body: P(
          "A miss is a miss to the CPU, but to the engineer there are three causes, and each has a different cure.",
          "- **Compulsory** (or *cold*): the **first time** a line is ever touched. It cannot be in the cache yet. No cache can avoid these.\n- **Capacity**: the cache is simply **too small** for what the program keeps using. Lines are thrown out and then needed again.\n- **Conflict**: the cache has room, but **too many lines want the same set**, so they push each other out.",
          "A handy way to remember: *first time*, *too much*, *too crowded*.",
          "Below is a cache of 8 lines (16 bytes each) and ten named lines A to J. Tap lines and watch the counters. In the **direct-mapped** setting, A and I map to the same set (so do B and J); try A, I, A, I.",
        ),
        widget: { type: "memsys-cache", props: { lines: 8, lineBytes: 16, ways: 1, chooseWays: true, showKinds: true, palette: LETTERS } },
      },
      {
        kind: "question",
        title: "Make conflict misses",
        body: "Using the direct-mapped cache (1 way), cause **at least 2 conflict misses**.",
        widget: { type: "memsys-cache", props: { lines: 8, lineBytes: 16, ways: 1, chooseWays: true, showKinds: true, palette: LETTERS } },
        question: {
          type: "widget",
          goal: { minConflict: 2 },
          prompt: "Tap lines until the Conflict counter shows 2 or more.",
          hint: "Each chip shows its set. Pick two lines in the same set and alternate between them.",
        },
        explanation: "A and I both map to set 0. Reading A, I, A, I: the first two are cold (compulsory) misses, then each later read misses because the other line took the slot, **even though the cache is mostly empty**. A fully associative cache of the same size would have kept both.",
      },
      {
        kind: "question",
        title: "A loop that doesn't fit",
        body: "A fully associative cache holds 8 lines (LRU). A loop reads 9 different lines in the same order, over and over. After the first pass, what kind of miss does it suffer?",
        question: {
          type: "choice",
          options: ["Compulsory", "Capacity", "Conflict", "None: after the first pass everything hits"],
          answer: 1,
          hint: "Fully associative means any line can go in any slot, so no set is crowded. What is the problem then?",
          feedback: {
            0: "Compulsory misses happen only on the very first touch of a line, and every line has been touched by then.",
            2: "Fully associative has no sets to be crowded, so conflicts cannot happen. The cache is just too small.",
            3: "Nine lines cannot all stay in a cache that holds eight, so some miss on every pass.",
          },
        },
        explanation: "The loop's **working set** (9 lines) is bigger than the cache (8). With LRU the line needed next is always the one just evicted, so **every** read misses: a capacity miss. Try it above: set 8 ways (fully associative), then read A to I twice and watch the Capacity counter.",
      },
      {
        kind: "explain",
        title: "Working-set size",
        body: P(
          "The **working set** is the amount of memory a program keeps touching in a stretch of time. Whichever level of the hierarchy can hold it, serves it. So if you plot the **average access time against the working-set size**, you get a curve that is flat while the data fits in L1, climbs when it spills into L2, flattens, climbs again for L3, and finally for RAM.",
          "Performance people measure exactly this to learn a machine's cache sizes. The widget below is a **toy model**: random reads over the working set, with each level serving the part that fits. Real curves have the same steps, though each machine's numbers differ.",
          "Slide the working set from 1 KiB to 4 GiB and watch the dot ride the curve.",
        ),
        widget: { type: "memsys-curve", props: { machine: "newer", lockMachine: true, exp: 12 } },
      },
      {
        kind: "question",
        title: "Staying in L1",
        body: "Find the **largest** working set whose average access time is still **2 ns or less**.",
        widget: { type: "memsys-curve", props: { machine: "newer", lockMachine: true, exp: 20 } },
        question: {
          type: "widget",
          goal: { maxNs: 2, minExp: 15 },
          prompt: "Drag the working set to the largest size that still averages 2 ns or less.",
          hint: "The first flat stretch ends where the L1 cache (the first dashed line) runs out.",
        },
        explanation: "The curve stays near 1 ns up to **32 KiB**, the size of this L1. One step beyond (64 KiB), half the accesses fall through to the slower L2 and the average jumps to about 2.5 ns. This is the first step of the staircase.",
      },
      {
        kind: "question",
        title: "Reach of the last cache",
        body: "In the toy model the L3 holds 32 MiB. A program makes random reads over **64 MiB**. At best, what **percentage** of reads can the L3 (and the faster levels) serve? The rest go to RAM.",
        question: { type: "number", answer: 50, tolerance: 0, unit: "%", hint: "A cache can serve the part of the data that fits in it." },
        explanation: "32 MiB of the 64 MiB fits, so at most **half** the reads are served on-chip; the other half pay RAM's roughly 90 ns. At 128 MiB it would be 25%. That is why programs that stream through huge arrays feel the speed of RAM, not of the caches.",
      },
      {
        kind: "explain",
        title: "A different cure for each",
        body: P(
          "Because the causes differ, so do the fixes.",
          "- **Compulsory misses**: cannot be removed, but can be hidden. **Prefetching** fetches lines before you ask, and longer lines amortise the first-touch cost.\n- **Capacity misses**: shrink the working set. Process data in blocks that fit the cache (**tiling** or **blocking**), use smaller types, keep only the fields you need. Or use a machine with a bigger cache.\n- **Conflict misses**: more ways, or change the addresses. A classic trap: arrays whose sizes or strides are a **large power of two**, because their addresses then share index bits and land in the same set.",
          "That last one is subtle, so the next question tries it.",
        ),
      },
      {
        kind: "question",
        title: "The four-kilobyte stride",
        body: "A program reads memory in steps of exactly **4096 bytes**. The L1 cache is 32 KiB and 8-way, with 64-byte lines and 64 sets, yet it suffers many misses on only a few KiB of data, and most of the cache sits empty. Why?",
        question: {
          type: "choice",
          options: [
            "The prefetcher is broken for large strides",
            "Every address 4096 apart has the same index bits, so they all map to one set and fight over its 8 slots",
            "4096 bytes is bigger than a cache line, so the CPU refuses to cache it",
            "The data is too large for L1",
          ],
          answer: 1,
          hint: "64 sets × 64-byte lines = 4096 bytes. What happens to the index bits when you add exactly 4096?",
          feedback: {
            0: "The cause is where the lines land, not the prefetcher.",
            2: "Lines of any address are cached; the stride only decides which sets they use.",
            3: "Only a few KiB are touched, far less than 32 KiB. The cache is mostly empty, which is the clue.",
          },
        },
        explanation: "The index uses address bits 6 to 11, and adding 4096 changes only bits 12 and up. So **every access lands in the same set**, which holds just 8 lines: conflict misses with 7/8 of the cache idle. The fix is to pad (use a stride like 4096 + 64) or restructure the loop.",
      },
      {
        kind: "recap",
        points: [
          "Three causes of misses: **compulsory** (first touch), **capacity** (working set too big), **conflict** (too many lines map to one set).",
          "The **working set** is the memory a program keeps touching. Time per access climbs in **steps** as it outgrows L1, then L2, then L3, then RAM.",
          "Cures: prefetch or longer lines for compulsory; blocking and smaller data for capacity; more ways or different addresses for conflict.",
          "Strides and array sizes that are large powers of two can make everything land in one set.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 7. Alignment, padding and layout ───────────────────────────────
  {
    id: "fnd-mem-7-layout",
    title: "Alignment, padding and layout",
    summary: "Why fields sit on aligned addresses, how a struct gets padding, reordering fields to shrink it, and array-of-structs versus struct-of-arrays.",
    minutes: 9,
    xp: 60,
    level: "Intermediate",
    steps: [
      {
        kind: "explain",
        title: "Fields don't sit back to back",
        body: P(
          "Memory hardware likes data to sit at addresses that are a **multiple of its size**: a 4-byte int at 0, 4, 8, 12…; an 8-byte double at 0, 8, 16…. That is **alignment**. A misaligned int could straddle two words, or even two cache lines, so it takes two fetches instead of one. On some CPUs that is slower; on others it is an error.",
          "So the compiler places each field of a struct at an address that is a multiple of its own size, and fills the gaps with unused **padding** bytes. The whole struct is also rounded up so that in an array every element starts aligned.",
          "Below is a C struct with four fields: `char a; double b; char c; int d;`. Each coloured box is a field; dashed red boxes are padding. Look at where each field starts.",
        ),
        widget: { type: "memsys-struct", props: { fields: ["char", "double", "char", "int"] } },
      },
      {
        kind: "question",
        title: "How big is it?",
        body: "What is `sizeof` for the struct `{ char a; double b; char c; int d; }` on a typical 64-bit machine? Use the widget to check yourself.",
        widget: { type: "memsys-struct", props: { fields: ["char", "double", "char", "int"], fixed: true } },
        question: { type: "number", answer: 24, tolerance: 0, unit: "bytes", hint: "Add the sizes, but put each field at a multiple of its own size, and round the total up to a multiple of 8." },
        explanation: "`a` sits at 0, then 7 bytes of padding so `b` starts at 8; `b` fills 8 to 15; `c` is at 16; 3 bytes of padding put `d` at 20; `d` ends at 24. The fields add up to only 14 bytes, but the struct is **24**: 10 bytes (more than 40%) are padding.",
      },
      {
        kind: "question",
        title: "Shrink it",
        body: "The same four fields, but you may **reorder** them with the arrows. What is the smallest size you can reach?",
        widget: { type: "memsys-struct", props: { fields: ["char", "double", "char", "int"], fixed: true } },
        question: {
          type: "widget",
          goal: { size: 16 },
          prompt: "Reorder the fields until sizeof is as small as it can be (16 bytes).",
          hint: "Try putting the biggest field first and the smallest last. The widget's button does the same.",
        },
        explanation: "Biggest first: `double` (0 to 8), `int` (8 to 12), `char` (12), `char` (13), then 2 bytes of tail padding to round up to 16. The data is only 14 bytes, so 16 is the best possible. Same fields, **one third smaller**.",
      },
      {
        kind: "explain",
        title: "Rules and who follows them",
        body: P(
          "The rule of thumb is: **declare fields from largest to smallest alignment**. For one struct, that saves a few bytes. For an array of a million of them, it saves megabytes, and fewer cache lines to fetch.",
          cpp(`
struct Loose { char a; double b; char c; int d; };   // sizeof 24
struct Tight { double b; int d; char a; char c; };   // sizeof 16

// ask the compiler instead of guessing:
static_assert(sizeof(Tight) == 16, "layout changed");
`),
          "Languages differ. **C and C++** keep your declaration order, so ordering is your job. **Rust** is free to reorder fields of ordinary structs for you (not if you ask for C layout with `#[repr(C)]`). **Go** keeps your order, so it too pays padding. When you need a struct to start on a cache line (to keep two threads' data apart, as you will see in the coherence lesson), C++ has `alignas(64)`. The sizes here are for a typical 64-bit ABI; check yours with `sizeof` and `offsetof`.",
        ),
      },
      {
        kind: "code",
        title: "Compute sizeof",
        body: "Write `struct_size(types)`. It takes a list of field types in declaration order, from `\"char\"` (1 byte), `\"short\"` (2), `\"int\"` (4), `\"double\"` (8) and `\"ptr\"` (8), and returns the struct's size in bytes, using the usual rules: each field at a multiple of its own size, total rounded up to a multiple of the largest field.\n\nA useful trick: to round `x` up to a multiple of `m`, use `-(-x // m) * m`.",
        language: "python",
        starter: `SIZES = {"char": 1, "short": 2, "int": 4, "double": 8, "ptr": 8}

def struct_size(types):
    # place each field at a multiple of its size, then round the total up
    return sum(SIZES[t] for t in types)
`,
        solution: `SIZES = {"char": 1, "short": 2, "int": 4, "double": 8, "ptr": 8}

def struct_size(types):
    offset = 0
    biggest = 1
    for t in types:
        size = SIZES[t]
        biggest = max(biggest, size)
        offset = -(-offset // size) * size   # round up to a multiple of size
        offset += size
    return -(-offset // biggest) * biggest
`,
        tests: [
          { id: "pad-after", description: "char then int: the int needs 4-byte alignment", assertionCode: `assert struct_size(["char", "int"]) == 8, f"got {struct_size(['char', 'int'])}, expected 8"` },
          { id: "pad-tail", description: "int then char: the tail is padded so arrays stay aligned", assertionCode: `assert struct_size(["int", "char"]) == 8, f"got {struct_size(['int', 'char'])}, expected 8"` },
          { id: "loose", description: "char, double, char, int is 24 bytes", assertionCode: `assert struct_size(["char", "double", "char", "int"]) == 24, f"got {struct_size(['char', 'double', 'char', 'int'])}, expected 24"` },
          { id: "tight", description: "double, int, char, char is 16 bytes", assertionCode: `assert struct_size(["double", "int", "char", "char"]) == 16, f"got {struct_size(['double', 'int', 'char', 'char'])}, expected 16"` },
          { id: "small", description: "A char and a short: the short needs 2-byte alignment", assertionCode: `assert struct_size(["char", "short"]) == 4, f"got {struct_size(['char', 'short'])}, expected 4"` },
        ],
        hints: ["Walk through the fields keeping a running offset. Before placing a field, round the offset up to a multiple of that field's size.", "After the loop, round the offset up to a multiple of the largest field size."],
      },
      {
        kind: "explain",
        title: "Arrays of structs, or structs of arrays",
        body: P(
          "Layout is also about *which values sit next to each other*. Say you have 16 particles, each with eight 4-byte fields: `x y z vx vy vz mass id`.",
          "- **Array of structs (AoS)**: particle 0's eight fields, then particle 1's eight fields, and so on. Natural to write.\n- **Struct of arrays (SoA)**: all 16 `x` values, then all 16 `y` values, and so on. Each field has its own array.",
          "Now a loop that only reads `x` (say, to find the leftmost particle). Tap the fields your loop reads and switch the layout. Each row below is one 64-byte cache line, and outlined rows are lines the loop has to fetch.",
        ),
        widget: { type: "memsys-layout", props: { layout: "aos", fields: ["x"] } },
      },
      {
        kind: "question",
        title: "Read only x",
        body: "A loop reads only the **x** field of all 16 particles. Switch the layout so it fetches the **fewest cache lines**.",
        widget: { type: "memsys-layout", props: { layout: "aos", fields: ["x"] } },
        question: {
          type: "widget",
          goal: { layout: "soa", maxLines: 1 },
          prompt: "Pick the layout that fetches one line for the x values.",
          hint: "Where would the 16 x values live if each field had its own array?",
        },
        explanation: "As a struct of arrays, the 16 `x` values are packed into **one** 64-byte line. As an array of structs, they are spread 32 bytes apart across **all 8** lines, and you fetch seven other fields you never use for every x. Struct-of-arrays also lines values up for SIMD instructions (see the SIMD lesson in the CPU module).",
      },
      {
        kind: "question",
        title: "When does AoS win?",
        body: "Struct-of-arrays is not always better. In which loop would an **array of structs** be at least as good?",
        question: {
          type: "choice",
          options: [
            "Summing one field over a million elements",
            "Counting how many elements have x > 0",
            "Updating each particle's position from its own velocity and mass, one particle at a time, all fields together",
            "Finding the largest mass",
          ],
          answer: 2,
          hint: "AoS keeps one element's fields together. Which loop wants everything about one element at once?",
          feedback: {
            0: "That reads a single field: exactly the case where struct-of-arrays wins.",
            1: "That reads one field across all elements, the same SoA-friendly shape.",
            3: "One field again (mass) across all elements: SoA fetches less.",
          },
        },
        explanation: "If every step uses most of one element's fields, an AoS element is one or two lines and all of it is useful. If steps use one field across many elements, SoA wins. Real code often mixes: pick the layout for the **hot loop**. Measuring beats guessing.",
      },
      {
        kind: "recap",
        points: [
          "Hardware wants each value at an address that is a **multiple of its size** (alignment). Compilers insert **padding** to get there and round the whole struct up.",
          "In C and C++, **field order is your choice**: biggest first usually gives the smallest struct. Rust may reorder for you; Go keeps your order.",
          "**Array of structs** keeps one element's fields together; **struct of arrays** keeps one field's values together.",
          "Choose the layout for the hot loop: reading one field of many elements favours SoA; using most fields of one element favours AoS.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 8. Virtual memory ───────────────────────────────
  {
    id: "fnd-mem-8-virtual",
    title: "Virtual memory",
    summary: "Why every process sees its own addresses, how pages and a page table translate them, and what protection and page faults are.",
    minutes: 10,
    xp: 70,
    level: "Advanced",
    steps: [
      {
        kind: "explain",
        title: "Every program gets its own map",
        body: P(
          "Two programs can both use the address `0x1ABC`, and they do not collide. That is because the addresses your program uses are not real. They are **virtual addresses**: numbers in a private map that the hardware and the operating system translate into **physical addresses**, the real positions in the RAM chips. It is like room numbers in two different hotels: room 12 in one is not room 12 in the other.",
          "Memory is divided into fixed-size blocks. A block of virtual addresses is a **page** (4 KiB is the usual size). A block of RAM of the same size is a **frame**. Each process has a **page table** saying which frame (if any) holds each of its pages.",
          "In the toy below, addresses are 16 bits: the top 4 are the **page number**, the low 12 are the **offset** inside the page. Switch between processes A and B with the same address and see where each one lands.",
        ),
        widget: { type: "memsys-pagetable", props: { proc: "A", addr: 0x1abc } },
      },
      {
        kind: "question",
        title: "Same address, other process",
        body: "Process A reads virtual address `0x1ABC` and lands in frame 9. Now make **process B** read the same virtual address, and find where it lands in physical memory.",
        widget: { type: "memsys-pagetable", props: { proc: "A", addr: 0x1abc } },
        question: {
          type: "widget",
          goal: { proc: "B", vpn: 1, outcome: "ok", pa: 23228 },
          prompt: "Switch to process B (a Read of 0x1ABC) so the result shows B's physical address.",
          hint: "Same page number, but B's page table is a different table.",
        },
        explanation: "Page 1 means frame 9 for process A (physical `0x9ABC`) but frame **5** for process B (physical `0x5ABC` = 23228). Same virtual address, different physical byte. That isolation is the point: a bug in A cannot scribble over B's data, because B's addresses never lead into A's frames.",
      },
      {
        kind: "explain",
        title: "Translation in one picture",
        body: P(
          "To translate, the hardware splits the address, looks up the page number in the page table to get a frame number, and **keeps the offset unchanged**:",
          txt(`
virtual address  =  [ page number | offset ]
                          |           |
                    page table        |  (copied as is)
                          v           v
physical address =  [ frame number | offset ]
`),
          "A flat table for a 48-bit address space would be gigantic, so real CPUs use a **multi-level** table: on x86-64 a 48-bit address is split into four 9-bit indexes (plus the 12-bit offset), each selecting an entry in a 4 KiB table of 512 entries, and unused regions need no tables at all. (Recent chips can use five levels; other CPUs use other page sizes, for example Apple silicon uses 16 KiB.) The kernel keeps one table per process and switches to the right one on every context switch.",
          "Each table entry also holds **permission bits**: present, writable, executable, and whether user code may touch it.",
        ),
      },
      {
        kind: "question",
        title: "How many pages?",
        body: "Pages are 4 KiB. How many pages does a 1 MiB array span (if it starts on a page boundary)?",
        question: { type: "number", answer: 256, tolerance: 0, unit: "pages", hint: "1 MiB is 1024 KiB." },
        explanation: "1 MiB = 1024 KiB, and 1024 / 4 = **256** pages, so 256 page-table entries. A 1 GiB array spans 262,144 pages. That is a lot of translations to remember, which is the problem the next lesson solves.",
      },
      {
        kind: "question",
        title: "Refused by the hardware",
        body: "Process A's page 0 is **read-only** (it maps to frame 4). Make the hardware **refuse an access because of permissions**, not because the page is missing.",
        widget: { type: "memsys-pagetable", props: { proc: "A", addr: 0x0010, write: false } },
        question: {
          type: "widget",
          goal: { outcome: "protection" },
          prompt: "Choose an access that ends in a protection fault.",
          hint: "A read of a read-only page is fine. What kind of access is not?",
        },
        explanation: "A **write** to a read-only page raises a **protection fault**. That is how the OS makes code pages unwritable, keeps programs out of the kernel's memory, and implements tricks like copy-on-write, where two processes share a frame until one writes.",
      },
      {
        kind: "explain",
        title: "The page that isn't there",
        body: P(
          "Now point at **page 5** in process A. Its entry says *not present*: no frame is assigned. The hardware cannot finish the access, so it raises a **page fault** and hands control to the operating system.",
          "A page fault is not always a crash. If the address is **valid but not loaded yet** (a program's code the OS hasn't read in, memory that has not been touched, a stack that needs to grow, a page that was swapped to disk), the OS fixes it: it finds a frame, fills it, updates the page table, and **retries the instruction**. The program never notices, except for the delay. If the address belongs to no valid region at all, the OS stops the program: on Linux and macOS that is the famous **segmentation fault**.",
        ),
        widget: { type: "memsys-pagetable", props: { proc: "A", addr: 0x5000 } },
      },
      {
        kind: "question",
        title: "A fault is not always fatal",
        body: "A program touches an address inside memory it was legitimately given (a big array it has not written to yet). The page is not present. What does the OS most likely do?",
        question: {
          type: "choice",
          options: [
            "Kill the program with a segmentation fault",
            "Give it a free frame (zero-filled), update the page table and retry the instruction",
            "Copy the program into a different process",
            "Ignore the access and carry on to the next instruction",
          ],
          answer: 1,
          hint: "Only accesses to memory the program has no right to end in a segmentation fault.",
          feedback: {
            0: "That is for addresses outside any valid region. This one is valid, just not backed by a frame yet.",
            2: "Processes do not trade code. The fix is a frame for the missing page.",
            3: "Skipping the instruction would corrupt the program. The OS makes the access work, then retries it.",
          },
        },
        explanation: "This lazy trick is called **demand paging**: asking for a gigabyte costs almost nothing until you actually touch the pages. The OS hands out frames one fault at a time. A true segmentation fault is only for addresses the program had no right to use.",
      },
      {
        kind: "code",
        title: "A translator",
        body: "Write `translate(page_table, vaddr, page_size=4096)`. `page_table` is a dict from page number to frame number. Return the **physical address**, or `None` if the page is not in the table (a page fault).\n\nPage number = `vaddr // page_size`; offset = `vaddr % page_size`; physical = `frame * page_size + offset`.",
        language: "python",
        starter: `def translate(page_table, vaddr, page_size=4096):
    # return the physical address, or None on a page fault
    return vaddr
`,
        solution: `def translate(page_table, vaddr, page_size=4096):
    page = vaddr // page_size
    offset = vaddr % page_size
    if page not in page_table:
        return None
    return page_table[page] * page_size + offset
`,
        tests: [
          { id: "map", description: "Page 1 in frame 9: 0x1ABC becomes 0x9ABC", assertionCode: `assert translate({0: 4, 1: 9}, 0x1ABC) == 0x9ABC, f"got {translate({0: 4, 1: 9}, 0x1ABC)}"` },
          { id: "offset", description: "Offset 0x10 in page 0, frame 4", assertionCode: `assert translate({0: 4, 1: 9}, 0x0010) == 4 * 4096 + 0x10, "the offset is kept as it is"` },
          { id: "fault", description: "Page 5 is not mapped: None", assertionCode: `assert translate({0: 4, 1: 9}, 0x5000) is None, "an unmapped page must return None"` },
          { id: "frame0", description: "Frame 0 is a real frame, not a missing page", assertionCode: `assert translate({3: 0}, 0x3123) == 0x123, f"got {translate({3: 0}, 0x3123)}; frame 0 is valid"` },
        ],
        hints: ["Use `in` to test whether the page is mapped; do not test the frame for truthiness, because frame 0 is a valid frame.", "Keep the offset and add it to frame * page_size."],
      },
      {
        kind: "question",
        title: "What it does not give you",
        body: "Virtual memory gives each process isolation, a clean private address space, and the ability to use more memory than the RAM installed. Which of these is **not** something it gives you?",
        question: {
          type: "choice",
          options: [
            "Protection: one process cannot read another's memory",
            "Faster memory access: translating every address makes reads quicker",
            "Lazy allocation: pages get frames only when touched",
            "Sharing: two processes can map the same frame (for example, a shared library)",
          ],
          answer: 1,
          hint: "Translation is extra work on every access. Does extra work make things quicker?",
          feedback: {
            0: "This is one of the main reasons for virtual memory.",
            2: "Demand paging is a direct consequence of translating through a table.",
            3: "Pointing two page tables at one frame is exactly how shared libraries save RAM.",
          },
        },
        explanation: "Translation is a **cost**, not a speedup: without help, every memory access would need extra reads of the page table. Hardware hides it with a small cache of recent translations, the subject of the next lesson.",
      },
      {
        kind: "recap",
        points: [
          "Programs use **virtual addresses**; hardware and the OS translate them to **physical** ones. Each process has its own **page table**.",
          "Memory is split into **pages** (4 KiB is typical; other sizes exist). A virtual address is **page number + offset**; the offset is kept, the page number is swapped for a frame number.",
          "Entries carry permissions. A write to a read-only page is a **protection fault**; a missing page is a **page fault**, which the OS may fix by loading the page and retrying.",
          "x86-64 uses a **multi-level** table to keep it small. Virtual memory gives isolation, sharing and lazy allocation, at the price of translation work.",
        ],
      },
    ],
  },
];
