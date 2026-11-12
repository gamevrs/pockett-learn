import type { ConceptLesson } from "../../learn/types.ts";

/**
 * GPU module, lessons 6 to 10: coalescing, occupancy and latency hiding, tiled matrix multiply, GPUs for AI, profiling and scaling.
 * Numbers are round, typical orders of magnitude; the simulations are toys and say so.
 */
export const gpuLessonsB: ConceptLesson[] = [
  // ── Lesson 6 ──
  {
    id: "fnd-gpu-6-coalescing",
    title: "Coalescing",
    summary: "Neighbouring threads reading neighbouring addresses share one wide memory trip. Strides waste bandwidth.",
    minutes: 8,
    xp: 75,
    level: "Advanced",
    steps: [
      {
        kind: "explain",
        title: "One bus, 32 passengers",
        body: "Global memory is read in wide chunks, not one number at a time. On the simple model used here, memory hands over **128-byte segments** (32 four-byte numbers). When the 32 threads of a warp each read one number, the hardware looks at all 32 addresses and fetches the **fewest segments** that cover them. Each segment fetched is one **transaction**.\n\nIf the 32 threads read 32 neighbouring numbers, that is exactly one segment: one trip. This is called **coalescing**. If they read numbers scattered far apart, the hardware needs up to 32 trips, and most of every segment it fetches is thrown away. It is like a bus: 32 passengers at one stop need one bus, 32 passengers at 32 different stops need 32.\n\nPlay with the patterns. (Real GPUs fetch 32-byte sectors within 128-byte lines and have caches, so the details are finer, but the lesson holds.)",
        widget: { type: "gpu-coalesce", props: { pattern: "contiguous" } },
      },
      {
        kind: "question",
        title: "Eight trips",
        body: "Use a **strided** pattern: thread *t* reads element *t × stride*. Find a stride that makes the warp need exactly **8 transactions**.",
        widget: { type: "gpu-coalesce", props: { pattern: "contiguous" } },
        question: { type: "widget", goal: { pattern: "stride", transactions: 8 }, prompt: "Pick a strided pattern that needs 8 transactions.", hint: "A stride of 8 numbers spreads 32 threads over 256 numbers: how many 32-number segments is that?" },
        explanation: "With stride 8, the threads cover 32 × 8 = 256 numbers, which is **8** segments of 32. Each transaction delivers only 4 useful numbers out of 32, so just 12.5% of the bytes moved are used. Stride 32 is the worst case: 32 transactions for 32 numbers.",
      },
      {
        kind: "question",
        title: "Every second number",
        body: "Thread *t* reads `a[2 * t]` (stride 2), starting at the beginning of a 128-byte-aligned array. How many transactions does the warp need?",
        widget: { type: "gpu-coalesce", props: { pattern: "stride", stride: 2 }, after: true },
        question: { type: "number", answer: 2, hint: "32 threads × stride 2 reach 64 numbers. How many 32-number segments is that?" },
        explanation: "The reads span 64 numbers, which is **2** segments, so half of the bytes moved are used. Stride 2 costs twice what neighbours-reading-neighbours costs.",
      },
      {
        kind: "question",
        title: "Off by one",
        body: "Thread *t* reads element *t + 1*: perfectly contiguous, but shifted by one so it starts one number past the start of a segment. How many transactions?",
        widget: { type: "gpu-coalesce", props: { pattern: "contiguous" }, after: true },
        question: {
          type: "choice",
          options: ["1", "2", "32"],
          answer: 1,
          feedback: {
            0: "Contiguous is great, but this run starts one number into a segment, so it sticks out the other end.",
            2: "32 would need every thread in a different segment, which is not the case here.",
          },
          hint: "32 numbers starting at element 1 end at element 32, which is in the next segment.",
        },
        explanation: "Elements 1 to 32 straddle a segment boundary: element 0 to 31 is the first segment, element 32 is in the second. **2** transactions. Misalignment costs one extra trip. Allocating arrays on aligned addresses (the allocator normally does) and starting reads on segment boundaries keeps it at one.",
      },
      {
        kind: "question",
        title: "Rows or columns?",
        body: "A matrix is stored **row by row** (row-major): element (row, col) is at address `row * W + col`. In a kernel, which assignment of `threadIdx.x` makes a warp's reads coalesce?",
        question: {
          type: "choice",
          options: [
            "row = threadIdx.x, so neighbouring threads read down a column",
            "col = threadIdx.x, so neighbouring threads read along a row",
            "It makes no difference to the GPU",
          ],
          answer: 1,
          feedback: {
            0: "Down a column, each step jumps W numbers: a huge stride, up to 32 transactions.",
            2: "It makes a large difference: along a row is one transaction, down a column is up to 32.",
          },
          hint: "Neighbouring threads have consecutive threadIdx.x. Which choice makes their addresses consecutive too?",
        },
        explanation: "Threads with consecutive `threadIdx.x` should touch consecutive addresses. In a row-major array, consecutive addresses are consecutive **columns** of the same row. (A CPU taught you the same thing: walk memory in the order it is stored.)",
      },
      {
        kind: "question",
        title: "Structs and strides",
        body: "A particle is a struct of four floats `(x, y, z, w)`, stored one particle after another (an *array of structs*). Thread *t* reads only `particle[t].x`. What is the stride between neighbouring threads' reads, in four-byte numbers?",
        widget: { type: "gpu-coalesce", props: { pattern: "stride", stride: 4 }, after: true },
        question: { type: "number", answer: 4, hint: "How far apart are two neighbouring particles' x values, when each particle takes four numbers?" },
        explanation: "**4**: neighbouring `x` values are four numbers apart, so the warp's 32 reads span 128 numbers, which is 4 transactions, with a quarter of each used. Storing all the `x` values together, then all the `y`, and so on (a *structure of arrays*) makes the reads contiguous. It is the same idea as layout and padding on CPUs, with a bigger price.",
      },
      {
        kind: "code",
        title: "Count the transactions",
        body: "Write `transactions(addrs)`. `addrs` is the list of element indexes the 32 threads read (each element is a 4-byte number). A segment holds 32 consecutive elements, so element `a` lives in segment `a // 32`. Return how many **different** segments are touched.",
        language: "python",
        starter: `def transactions(addrs):
    return 0
`,
        solution: `def transactions(addrs):
    return len({a // 32 for a in addrs})
`,
        tests: [
          { id: "contiguous", description: "32 neighbours: 1 transaction", assertionCode: `assert transactions(list(range(32))) == 1, f"got {transactions(list(range(32)))}"` },
          { id: "stride2", description: "Stride 2: 2 transactions", assertionCode: `assert transactions(list(range(0, 64, 2))) == 2, f"got {transactions(list(range(0, 64, 2)))}"` },
          { id: "shifted", description: "Contiguous but shifted by one: 2", assertionCode: `assert transactions(list(range(1, 33))) == 2, f"got {transactions(list(range(1, 33)))}"` },
          { id: "stride32", description: "Stride 32: 32 transactions", assertionCode: `assert transactions([t * 32 for t in range(32)]) == 32, f"got {transactions([t * 32 for t in range(32)])}"` },
          { id: "same", description: "Everyone reads the same number: 1", assertionCode: `assert transactions([5] * 32) == 1, f"got {transactions([5] * 32)}"` },
        ],
        hints: ["Turn each address into its segment number with //, then count how many different segment numbers there are.", "A set removes duplicates: len(set(...))."],
      },
      {
        kind: "question",
        title: "When a strided read is unavoidable",
        body: "An algorithm genuinely needs each thread to read down a column of a row-major matrix (for example a transpose). What is the standard fix?",
        question: {
          type: "choice",
          options: [
            "Use a smaller block size",
            "Load a tile with coalesced reads into shared memory, then read it back in the other order from there",
            "Run the kernel several times and hope the cache helps",
            "Switch the GPU to a higher clock",
          ],
          answer: 1,
          feedback: {
            0: "Block size does not change the access pattern of a warp.",
            2: "The cache can help a little, but each warp still pays for the strided fetches.",
            3: "A faster clock does not fix wasted bandwidth.",
          },
          hint: "Shared memory is fast to read in any order. Where should the awkward ordering happen?",
        },
        explanation: "Do the **slow global access in the friendly order** (rows, coalesced) and the awkward reordering in **shared memory**, which does not mind. This is how fast matrix transposes work, and a taste of tiling, the subject of lesson 8.",
      },
      {
        kind: "recap",
        points: [
          "Memory is fetched in wide segments (128 bytes in this model). A warp's reads are served by the **fewest segments** that cover their addresses; each is a **transaction**.",
          "**Coalesced**: neighbouring threads read neighbouring addresses → 1 transaction. **Strided or scattered** → up to 32, with most of every segment wasted.",
          "Make consecutive `threadIdx.x` touch consecutive addresses; mind alignment (a shifted run costs an extra trip).",
          "Arrays of structs create strides; structures of arrays and shared-memory staging fix them.",
        ],
      },
    ],
  },

  // ── Lesson 7 ──
  {
    id: "fnd-gpu-7-occupancy",
    title: "Occupancy and latency hiding",
    summary: "A GPU hides memory waits by switching to another warp. Registers and shared memory limit how many are resident.",
    minutes: 8,
    xp: 75,
    level: "Advanced",
    steps: [
      {
        kind: "explain",
        title: "Hiding the wait",
        body: "A trip to global memory takes several hundred cycles. A CPU fights that with big caches and by guessing ahead. A GPU does something different: it **switches to another warp**.\n\nImagine a chef with many dishes: while one pot simmers, she stirs another. Every **resident** warp (one that has been assigned to the SM and keeps its state there) already has its registers on the chip, so switching costs almost nothing. If enough warps are resident, there is always one ready to run, and the memory wait is **hidden**.\n\n**Occupancy** is the share of an SM's warp slots that are filled. (NVIDIA calls the unit that runs blocks a *streaming multiprocessor*, SM; AMD calls it a *compute unit*, CU.) What limits it? Each SM has a fixed pool of **registers**, a fixed amount of **shared memory**, and caps on threads and blocks. A kernel that uses lots of registers or shared memory fits fewer blocks.\n\nPlay with the sliders. The model is simplified: it checks only those four limits and ignores rounding up of allocations, which real GPUs do and which varies by generation.",
        widget: { type: "gpu-occupancy", props: { blockSize: 256, regs: 32, sharedKb: 0 } },
      },
      {
        kind: "question",
        title: "Fill the SM",
        body: "This kernel uses 96 registers per thread, so the SM is only a quarter full. Change one setting so the SM reaches **100% occupancy** (64 resident warps).",
        widget: { type: "gpu-occupancy", props: { blockSize: 256, regs: 96, sharedKb: 0 } },
        question: { type: "widget", goal: { minOccupancy: 100 }, prompt: "Reach 100% occupancy.", hint: "The register file is the limit. Fewer registers per thread means more threads fit." },
        explanation: "Cutting registers to **32** per thread lets 8 blocks of 256 threads fit: 64 warps. In real code you cannot just ask for fewer registers, but you can restructure the kernel, or tell the compiler to cap them (and it may *spill* the extras to slow memory, so it is a trade).",
      },
      {
        kind: "question",
        title: "Who is the limit?",
        body: "A kernel uses blocks of 128 threads, 32 registers per thread, and **48 KB of shared memory per block**. The SM has 96 KB of shared memory. How many blocks fit on one SM?",
        widget: { type: "gpu-occupancy", props: { blockSize: 128, regs: 32, sharedKb: 48 }, after: true },
        question: { type: "number", answer: 2, hint: "Check each limit: shared memory 96 ÷ 48. Registers and threads would allow more." },
        explanation: "Shared memory allows 96 ÷ 48 = **2** blocks, while threads and registers would allow 16. Two blocks of 4 warps is only 8 warps: **12.5%** occupancy. Shared memory is the bottleneck here.",
      },
      {
        kind: "question",
        title: "How many warps are enough?",
        body: "A memory trip takes about 400 cycles. Each warp does 100 cycles of maths between loads. A scheduler wants one warp running while the others wait, so it needs roughly `1 + latency ÷ maths-per-load` ready warps. How many warps does one scheduler need? (A toy rule; real chips are subtler.)",
        question: { type: "number", answer: 5, hint: "1 + 400 ÷ 100." },
        explanation: "1 + 400 ÷ 100 = **5** warps per scheduler. With little maths between loads (say 10 cycles) you would need 41. That is why memory-heavy kernels need high occupancy, while kernels with a lot of maths per load are happy with few warps.",
      },
      {
        kind: "question",
        title: "Occupancy is a means, not a goal",
        body: "Someone reduces a kernel's registers to push occupancy from 50% to 100%, and the kernel gets *slower*. Which is the most likely reason?",
        question: {
          type: "choice",
          options: [
            "100% occupancy always makes a kernel slower",
            "The compiler spilled values from registers to slow memory, and the kernel already had enough warps to hide its waits at 50%",
            "The GPU's clock slows down when occupancy is high",
            "Occupancy has nothing to do with speed",
          ],
          answer: 1,
          feedback: {
            0: "Higher occupancy is often good; it just is not guaranteed to help.",
            2: "Clock speed depends on power and heat, not on occupancy.",
            3: "Occupancy matters when memory waits would otherwise leave the SM idle. It just is not the only factor.",
          },
          hint: "Registers hold values. What happens when there are fewer registers than values?",
        },
        explanation: "Occupancy only matters up to the point where waits are hidden. Past that, extra warps add nothing, and squeezing registers can force **spills** to local memory (which lives in slow global memory). Tune by measuring, not by chasing a number.",
      },
      {
        kind: "question",
        title: "Big blocks, big shared memory",
        body: "Each block uses 48 KB of shared memory, and math between loads is 40 cycles (so each scheduler needs about 11 ready warps). Choose a block size and settings so the SM **hides latency**.",
        widget: { type: "gpu-occupancy", props: { blockSize: 128, regs: 32, sharedKb: 48 } },
        question: { type: "widget", goal: { hidesLatency: true, minOccupancy: 90 }, prompt: "Get the SM to hide the memory wait while each block still uses 48 KB of shared memory.", hint: "Only 2 blocks fit in shared memory, so make each block as large as it can be." },
        explanation: "With shared memory limiting you to 2 blocks, the only way to fill the SM is **fewer, bigger blocks**: 2 blocks of 1,024 threads is 64 warps. This is a real trade in tiled kernels, where shared memory per block grows with the tile.",
      },
      {
        kind: "code",
        title: "Count resident warps",
        body: "Write `resident_warps(block_size, regs_per_thread)` for one SM with **65,536 registers**, room for at most **64 warps**, and warps of 32 threads. Blocks fit by registers as `65536 // (regs_per_thread * block_size)`; each block has `block_size // 32` warps. Return the resident warps, never more than 64. (Ignore every other limit.)",
        language: "python",
        starter: `def resident_warps(block_size, regs_per_thread):
    return 0
`,
        solution: `def resident_warps(block_size, regs_per_thread):
    blocks = 65536 // (regs_per_thread * block_size)
    return min(64, blocks * (block_size // 32))
`,
        tests: [
          { id: "full", description: "256 threads and 32 registers fill the SM", assertionCode: `assert resident_warps(256, 32) == 64, f"got {resident_warps(256, 32)}"` },
          { id: "half", description: "64 registers halves it to 32 warps", assertionCode: `assert resident_warps(256, 64) == 32, f"got {resident_warps(256, 64)}"` },
          { id: "fat", description: "128 registers leave 16 warps", assertionCode: `assert resident_warps(256, 128) == 16, f"got {resident_warps(256, 128)}"` },
          { id: "cap", description: "Small kernels are capped at 64 warps", assertionCode: `assert resident_warps(128, 16) == 64, f"got {resident_warps(128, 16)}"` },
        ],
        hints: ["Blocks that fit = 65536 // (regs_per_thread * block_size). Warps = blocks × (block_size // 32).", "Wrap the result in min(64, ...)."],
      },
      {
        kind: "recap",
        points: [
          "A GPU hides memory latency by **switching between resident warps**, which is nearly free because their registers stay on the chip.",
          "**Occupancy** = resident warps ÷ the SM's maximum. It is capped by threads, blocks, **registers per thread** and **shared memory per block** (this lesson's model checks those four, simplified).",
          "A memory-heavy kernel needs many warps to hide waits; a maths-heavy one needs few.",
          "More occupancy is a means, not a goal: cutting registers can cause **spills** and make a kernel slower. Measure with the vendor's occupancy calculator or profiler.",
        ],
      },
    ],
  },

  // ── Lesson 8 ──
  {
    id: "fnd-gpu-8-tiled-matmul",
    title: "Tiled matrix multiply",
    summary: "Why naive matmul is memory-bound, and how tiles in shared memory reuse data to raise arithmetic intensity.",
    minutes: 9,
    xp: 80,
    level: "Advanced",
    steps: [
      {
        kind: "explain",
        title: "Multiply two tables",
        body: "**Matrix multiplication** (matmul) is the workhorse of graphics, science and AI. To multiply two N × N tables A and B, every number of the result C is a **dot product**: take a row of A and a column of B, multiply them pairwise and add. That is N multiplications and N additions for each of N² results: **2N³ operations** (FLOPs, floating-point operations) in total.\n\nThe obvious kernel gives each thread one output number. Each thread then reads a whole row of A and a whole column of B from **global memory**: 2N numbers. But thread (3, 5) and thread (3, 6) read the **same row** of A, and nobody remembers: the same numbers are fetched again and again. On a GPU that means the cores spend their time waiting for memory.\n\nThe fix is **tiling**: a block of threads works on a T × T piece of C, copies a T × T tile of A and of B into fast **shared memory** once, and every thread in the block reuses it T times. Below is an 8 × 8 multiply. Change the tile size, move the green output tile around C, and step through the phases.",
        widget: { type: "gpu-tiled", props: { tile: 1 } },
      },
      {
        kind: "question",
        title: "Count the loads",
        body: "For this 8 × 8 multiply with **4 × 4 tiles**, how many numbers are loaded from global memory in total? (The naive kernel needs 2 × 8³ = 1,024.)",
        widget: { type: "gpu-tiled", props: { tile: 1 }, live: true },
        question: { type: "number", answer: 256, hint: "Tiling with T × T tiles loads T times fewer numbers than naive: 1,024 ÷ 4." },
        explanation: "**256**: each tile of A and B is loaded once per phase instead of once per use, and each loaded number is used T = 4 times. Bigger tiles mean more reuse, limited by how much shared memory a block can have.",
      },
      {
        kind: "question",
        title: "Wait for everybody",
        body: "In a tiled kernel the block's threads load the tile together, then everyone computes from it. Why does the kernel need a **barrier** (`__syncthreads()`) after loading the tile?",
        question: {
          type: "choice",
          options: [
            "To make the GPU run faster",
            "So no thread starts using the tile before every thread has finished writing its part of it",
            "To copy the tile back to global memory",
            "To make the threads take turns reading",
          ],
          answer: 1,
          feedback: {
            0: "A barrier makes threads wait for each other, which costs a little time; it is there for correctness.",
            2: "The barrier does not move data; it only makes threads wait.",
            3: "They all read at once; the barrier is about making sure the writing is finished first.",
          },
          hint: "Each thread loads just one part of the tile. Who needs the other parts?",
        },
        explanation: "Each thread fills one cell of the tile, but computing reads cells filled by **other** threads. Without the barrier a thread could read a cell that has not been written yet. A second barrier before the next tile overwrites shared memory prevents the opposite mistake. Barriers apply within one block only.",
      },
      {
        kind: "question",
        title: "Arithmetic intensity",
        body: "**Arithmetic intensity** is FLOPs done per byte moved from memory. A multiply-add is 2 FLOPs, and the naive kernel loads two 4-byte numbers (8 bytes) for it, so naive matmul has 2 ÷ 8 = 0.25 FLOP per byte. With **16 × 16 tiles** each loaded number is used 16 times, so loads drop 16-fold. How many FLOPs per byte does the tiled kernel do?",
        question: { type: "number", answer: 4, unit: "FLOP/byte", hint: "Same FLOPs, 16 times fewer bytes: 0.25 × 16." },
        explanation: "0.25 × 16 = **4 FLOP per byte**. In general, intensity is T ÷ 4 for four-byte numbers. Raising intensity is the whole point of tiling: it turns a memory-bound kernel into one where the maths units get a chance to be the limit.",
      },
      {
        kind: "question",
        title: "What does that allow?",
        body: "A GPU with 1 TB/s of memory bandwidth runs the **naive** kernel at 0.25 FLOP per byte. If memory is the only limit, how many **TFLOP/s** (trillions of FLOPs per second) can it reach?",
        question: { type: "number", answer: 0.25, tolerance: 0.01, unit: "TFLOP/s", hint: "Speed = bandwidth × FLOP per byte = 1 TB/s × 0.25." },
        explanation: "1 TB/s × 0.25 FLOP/B = **0.25 TFLOP/s**, even though the chip might be able to do tens of TFLOP/s on simple maths. The kernel is **memory-bound**: bytes, not arithmetic, set its speed. Lesson 9 draws this as the *roofline*.",
      },
      {
        kind: "code",
        title: "Count the global loads",
        body: "Write `global_loads(n, tile)`: how many numbers an N × N multiply loads from global memory with T × T tiles. Naive (`tile = 1`) loads `2 * n**3`; each increase of the tile divides that by `tile`.\n\nThen write `arithmetic_intensity(n, tile)`: FLOPs (`2 * n**3`) divided by bytes loaded (4 bytes per number).",
        language: "python",
        starter: `def global_loads(n, tile):
    return 0


def arithmetic_intensity(n, tile):
    return 0
`,
        solution: `def global_loads(n, tile):
    return 2 * n**3 // tile


def arithmetic_intensity(n, tile):
    flops = 2 * n**3
    nbytes = global_loads(n, tile) * 4
    return flops / nbytes
`,
        tests: [
          { id: "naive", description: "Naive 8 × 8 loads 1,024", assertionCode: `assert global_loads(8, 1) == 1024, f"got {global_loads(8, 1)}"` },
          { id: "tiled", description: "4 × 4 tiles load 256", assertionCode: `assert global_loads(8, 4) == 256, f"got {global_loads(8, 4)}"` },
          { id: "big", description: "1024 × 1024 with 16 × 16 tiles loads 134,217,728", assertionCode: `assert global_loads(1024, 16) == 134217728, f"got {global_loads(1024, 16)}"` },
          { id: "naive-ai", description: "Naive intensity is 0.25", assertionCode: `assert arithmetic_intensity(1024, 1) == 0.25, f"got {arithmetic_intensity(1024, 1)}"` },
          { id: "tiled-ai", description: "16 × 16 tiles give 4.0", assertionCode: `assert arithmetic_intensity(1024, 16) == 4.0, f"got {arithmetic_intensity(1024, 16)}"` },
        ],
        hints: ["Loads = 2 * n**3 divided by tile (use // for whole numbers).", "Bytes = loads × 4. Intensity = FLOPs ÷ bytes."],
      },
      {
        kind: "question",
        title: "In real life",
        body: "You need fast matrix multiplication in a real project. What should you do first?",
        question: {
          type: "choice",
          options: [
            "Write your own tiled kernel, since it is the fastest way",
            "Call a vendor-tuned library (cuBLAS or CUTLASS on NVIDIA, rocBLAS on AMD are examples) or your framework's matmul",
            "Run it on the CPU, since GPUs are bad at matmul",
            "Use the largest tile that compiles",
          ],
          answer: 1,
          feedback: {
            0: "A hand-written tiled kernel is a great learning exercise but rarely beats tuned libraries.",
            2: "Matmul is the thing GPUs are best at.",
            3: "Tile size is a trade with shared memory and occupancy; the biggest tile is often not the best.",
          },
          hint: "Libraries use many more tricks than one level of tiling.",
        },
        explanation: "Production kernels add tiling in registers, vectorised loads, double buffering and matrix units (tensor cores, next lesson), tuned per chip generation. Use the library; understanding tiling tells you *why* it is fast and how to read a profile when it is not.",
      },
      {
        kind: "recap",
        points: [
          "Matmul does **2N³** FLOPs, and the naive kernel reloads the same numbers from global memory again and again.",
          "**Tiling**: a block loads T × T tiles into **shared memory** once and every thread reuses them, cutting global loads by a factor of **T**.",
          "**Arithmetic intensity** = FLOPs ÷ bytes moved. Naive matmul is 0.25 FLOP/byte; tiled is T ÷ 4 with four-byte numbers.",
          "Barriers keep the block in step. In practice, use a tuned library.",
        ],
      },
    ],
  },

  // ── Lesson 9 ──
  {
    id: "fnd-gpu-9-gpus-for-ai",
    title: "GPUs for AI",
    summary: "Tensor cores, number formats (FP32 to INT8), the roofline model, and why decode is memory-bound while prefill is compute-bound.",
    minutes: 10,
    xp: 90,
    level: "Professional",
    steps: [
      {
        kind: "explain",
        title: "Neural networks are matmul",
        body: "A neural network's layers are mostly **matrix multiplications**, so everything in the last lesson applies. GPU makers added two things for AI.\n\nFirst, **matrix units**: circuits that multiply a small block of numbers in one step. NVIDIA calls them **tensor cores**; AMD's are *matrix cores*; other vendors have their own names. They are far faster than ordinary arithmetic units, but mainly for low-precision formats.\n\nSecond, **smaller number formats**, because fewer bits means less memory and more numbers per second:\n\n- **FP32**: 32-bit float, 1 sign, 8 exponent, 23 mantissa bits.\n- **FP16**: 16 bits; 5 exponent, 10 mantissa. More precise, but its range tops out at 65,504.\n- **BF16** (brain float): 16 bits; **8 exponent** (the same range as FP32) but only 7 mantissa bits.\n- **FP8**: 8 bits, in two layouts (E4M3 and E5M2). **INT8** and smaller whole-number formats are common for running trained models.\n\nThe **exponent** sets the size range, the **mantissa** sets the fine detail. Try each format and a model size: memory is bits ÷ 8 per parameter.",
        widget: { type: "gpu-formats", props: { params: 8, format: "fp32" } },
      },
      {
        kind: "question",
        title: "Fit the model",
        body: "A 13-billion-parameter model must fit its **weights** in a 24 GB card. Choose a format, so the weights fit.",
        widget: { type: "gpu-formats", props: { params: 13, format: "fp16" } },
        question: { type: "widget", goal: { paramsB: 13, maxGb: 24 }, prompt: "Pick a format that makes 13 B parameters fit in 24 GB (leave the size at 13 B).", hint: "FP16 needs 26 GB. Which format is half that?" },
        explanation: "13 B × 1 byte = **13 GB** in FP8 or INT8, which fits (with room for activations and the KV cache); at FP16 it needs 26 GB and does not. This is why quantising (squeezing weights to fewer bits) is so popular for running models on smaller cards, at some cost in accuracy that you must test.",
      },
      {
        kind: "question",
        title: "Range or precision?",
        body: "Which statement about **BF16** and **FP16** is correct?",
        question: {
          type: "choice",
          options: [
            "FP16 and BF16 differ only in name",
            "BF16 keeps FP32's exponent range but has fewer mantissa bits than FP16, so it is coarser but rarely overflows",
            "BF16 has more mantissa bits than FP16, so it is more precise",
            "FP16 has the larger range, since it is newer",
          ],
          answer: 1,
          feedback: {
            0: "They are different layouts: 5 exponent + 10 mantissa bits versus 8 exponent + 7 mantissa bits.",
            2: "BF16 has 7 mantissa bits, FP16 has 10: FP16 is the more precise of the two.",
            3: "FP16's 5 exponent bits top out at 65,504; BF16 reaches about 3.4 × 10^38 like FP32.",
          },
          hint: "Exponent bits give range; mantissa bits give precision.",
        },
        explanation: "BF16 trades precision for FP32's range, which is why large-model training uses it widely: values rarely overflow and no loss scaling tricks are needed. FP16 is finer but its limited range needs more care.",
      },
      {
        kind: "question",
        title: "How big is it?",
        body: "A model has **70 billion parameters** stored in FP16 (2 bytes each). How many **gigabytes** do just the weights take?",
        question: { type: "number", answer: 140, unit: "GB", hint: "70 billion × 2 bytes = 140 billion bytes." },
        explanation: "70 × 10⁹ × 2 bytes = **140 GB**: more than any single consumer card, and a squeeze even on large data-centre cards, so such models are often quantised or split across several GPUs (lesson 10).",
      },
      {
        kind: "explain",
        title: "The roofline",
        body: "A GPU has two limits. Its **maths units** can do at most some number of FLOP/s (the peak); its **memory** can supply at most some bytes/s (the bandwidth). A kernel doing **I** FLOPs per byte (its arithmetic intensity) can run at most at:\n\n**speed = min(peak, I × bandwidth)**\n\nDrawn on a chart (a **roofline**), that is a slope that flattens into a ceiling. The corner is the **ridge point**, at peak ÷ bandwidth FLOP per byte. Left of it a kernel is **memory-bound**; right of it, **compute-bound**.\n\nThe widget uses round example numbers (not any real product's spec). It places the kernels from the last lessons, plus a language model in its two phases (see the lesson *LLM inference and cost*): **prefill** reads your whole prompt at once and **decode** writes the answer one token at a time. Each decode step must read all the model's weights but does maths for only the users batched together, so its intensity is about the batch size. Prefill reuses each weight across every prompt token, so its intensity is about the prompt length.",
        widget: { type: "gpu-roofline", props: { preset: "dc", batch: 1, tokens: 2048 } },
      },
      {
        kind: "question",
        title: "Push decode past the ridge",
        body: "On the data-centre card, raise the **decode batch size** until decode is **no longer memory-bound**.",
        widget: { type: "gpu-roofline", props: { preset: "dc", batch: 1, tokens: 2048 } },
        question: { type: "widget", goal: { preset: "dc", decodeMemoryBound: false }, prompt: "Increase the batch size past the ridge point, on the data-centre card.", hint: "Decode is memory-bound while its intensity (about the batch size) is below the ridge point, around 333 here." },
        explanation: "Only at a batch of several hundred does decode reach the ridge, which is why serving systems **batch many users' requests together**. In practice the batch is limited by memory for each user's *KV cache* (the saved attention state of their conversation) and by latency targets, so decode usually stays memory-bound.",
      },
      {
        kind: "question",
        title: "Why the two phases differ",
        body: "Why is **decode** (one token at a time) typically memory-bound, while **prefill** (the whole prompt at once) is typically compute-bound?",
        question: {
          type: "choice",
          options: [
            "Decode uses a different kind of GPU",
            "Each decode step reads every weight from memory to do only a little maths per weight; prefill reuses each weight across many prompt tokens",
            "Prefill runs on the CPU",
            "Decode needs more precise numbers",
          ],
          answer: 1,
          feedback: {
            0: "Both phases run on the same GPU; what differs is how many tokens share each weight read.",
            2: "Prefill runs on the GPU too, and it is the maths-heavy phase.",
            3: "Precision is not what separates the phases.",
          },
          hint: "Count how many tokens share each weight that is fetched.",
        },
        explanation: "Intensity = maths per byte of weights read. Decode at batch 1 does ~1 multiply-add per weight read; prefill of a 2,000-token prompt does ~2,000. That one fact explains why decode speed tracks **memory bandwidth** and prefill speed tracks **FLOPs**.",
      },
      {
        kind: "question",
        title: "A speed limit for decode",
        body: "An 8-billion-parameter model in FP16 has 16 GB of weights. At batch 1, each generated token must read all of them once. On a card with 1 TB/s of bandwidth, about how many tokens per second is the **most** it can generate?",
        question: { type: "number", answer: 62.5, tolerance: 1, unit: "tokens/s", hint: "1,000 GB/s ÷ 16 GB per token." },
        explanation: "1,000 ÷ 16 = **62.5 tokens/s**, a ceiling that ignores the KV cache and every other overhead, so real speeds are lower. Halving the weights (INT8, about 125 tokens/s) roughly doubles the ceiling: a reason quantisation speeds up decode, not only shrinks it.",
      },
      {
        kind: "explain",
        title: "What you would actually check",
        body: "Practical habits when GPUs run AI work (tool names are examples):\n\n- **Know your card's two numbers**: peak FLOP/s for your format and memory bandwidth, from the vendor's spec sheet. Their ratio is your ridge point.\n- **Look at memory first** (`nvidia-smi` on NVIDIA; ROCm's `rocm-smi` on AMD): do the weights plus the KV cache fit, with room to spare?\n- **Batch requests** in your serving stack (inference servers such as vLLM, TensorRT-LLM or llama.cpp do this for you; names are examples) and watch latency as you raise the batch.\n- **Quantise carefully**: smaller formats are faster and smaller, but **measure quality** on your own task before and after.\n- **Do not trust peak numbers**: headline FLOP/s usually assume the fastest format on dense matrices. Measure the real throughput of your workload.\n\nOn Apple and mobile chips the CPU and GPU share memory, so the bandwidth you should look at is that one shared figure.",
      },
      {
        kind: "recap",
        points: [
          "AI is mostly **matmul**. **Tensor cores** (NVIDIA's name; AMD: matrix cores) multiply small blocks in one step, at low precision.",
          "**FP32 / FP16 / BF16 / FP8 / INT8**: fewer bits mean less memory and more speed. **BF16** keeps FP32's exponent range with fewer mantissa bits; FP16 is finer but overflows at 65,504.",
          "**Roofline**: speed = min(peak, intensity × bandwidth). Below the ridge point a kernel is memory-bound.",
          "**Decode** (batch 1) is memory-bound, so its speed is about bandwidth ÷ weight bytes; **prefill** is compute-bound. Batching raises decode's intensity.",
        ],
      },
    ],
  },

  // ── Lesson 10 ──
  {
    id: "fnd-gpu-10-profiling-scaling",
    title: "Profiling and scaling",
    summary: "Read a kernel timeline, overlap copies with compute, scale across GPUs, and know what to measure first.",
    minutes: 10,
    xp: 90,
    level: "Professional",
    steps: [
      {
        kind: "explain",
        title: "Reading a timeline",
        body: "Guessing why a GPU program is slow rarely works. A **profiler** records a **timeline**: when each copy and kernel ran, on which engine. The first thing to look for is **gaps**: stretches where the GPU is idle because it is waiting for a copy, for the CPU, or for the previous step.\n\nBelow, a job is copy in, compute, copy out, one after another (1 chunk). Notice how only one engine works at a time. Modern GPUs have separate **copy engines** and compute units, so if you cut the job into **chunks** and put them in different **streams** (queues of work that may overlap), the copy of one chunk can overlap the compute of another.\n\nTool names are examples: NVIDIA's *Nsight Systems*, PyTorch's built-in profiler, AMD's *rocprof*, and Apple's Instruments (Metal System Trace) all draw timelines like this.",
        widget: { type: "gpu-streams", props: { chunks: 1, job: "balanced" } },
      },
      {
        kind: "question",
        title: "Overlap it",
        body: "On the **balanced** job, choose a chunk count that saves at least **40%** of the time compared with doing it all in one piece.",
        widget: { type: "gpu-streams", props: { chunks: 1, job: "balanced" } },
        question: { type: "widget", goal: { job: "balanced", minSavedPercent: 40 }, prompt: "Save 40% or more on the balanced job.", hint: "More chunks give more overlap. Try 4 or 8." },
        explanation: "With 4 chunks the total falls from 30 ms to 15 ms (50% saved); with 8 it is 12.5 ms. The gain levels off because the longest stage sets a floor: you cannot beat the time of the slowest engine, and each chunk adds some overhead in real life that this toy ignores.",
      },
      {
        kind: "question",
        title: "The floor",
        body: "A job has a 20 ms copy-in, a 10 ms kernel and a 20 ms copy-out. With perfect overlap in many tiny chunks, what is the lowest the total can approach, in milliseconds?",
        question: { type: "number", answer: 20, unit: "ms", hint: "The slowest stage keeps its engine busy the whole time." },
        explanation: "**20 ms**: a copy engine moving the data in (or out) is busy for 20 ms whatever you do, so the total cannot drop below the longest stage. Serial it was 50 ms. When one stage dominates, speeding the *other* stages gains you nothing.",
      },
      {
        kind: "question",
        title: "What to measure first",
        body: "A GPU program is slower than expected. Put these investigation steps in a sensible order, first to last.",
        question: {
          type: "order",
          items: [
            "Check the timeline: is the GPU even busy, or are there gaps?",
            "Check copies: are big or frequent host-to-device transfers dominating?",
            "Find the kernels that take the most time",
            "Check whether the hottest kernel is memory-bound or compute-bound (roofline)",
            "Only then tune details: coalescing, divergence, occupancy",
          ],
          hint: "Go from the whole program down to a single kernel.",
        },
        explanation: "Work from **big to small**. Idle gaps and copies are often the problem and cost nothing to find. Then find the hot kernel, decide if bytes or maths limit it, and only then tune coalescing, divergence and occupancy. Tuning a kernel that takes 2% of the time is wasted work.",
      },
      {
        kind: "explain",
        title: "More than one GPU",
        body: "When one GPU is too slow or too small, you add more. There are three main ways to split the work:\n\n- **Data parallelism**: every GPU holds a **full copy** of the model and processes a different slice of the data; after each step they average their results (**all-reduce**). Simple, and the most common. The model must fit on one GPU.\n- **Tensor parallelism**: one layer's big matrices are **cut into pieces** across GPUs, which cooperate on every layer. Needed when a layer or the model is too big for one card; needs very fast links because GPUs talk several times per layer.\n- **Pipeline parallelism**: **different layers** live on different GPUs and the data flows through them like a production line.\n\nThe links matter. A PCIe 4.0 x16 link is about 32 GB/s each way. Data-centre systems add dedicated GPU-to-GPU links (NVIDIA's NVLink is one example; AMD has Infinity Fabric) in the hundreds of GB/s per GPU, which is why tensor parallelism is usually kept inside one server. Figures vary by generation, so check yours.",
      },
      {
        kind: "question",
        title: "Which split?",
        body: "A model's weights are 120 GB, but each of your GPUs has 80 GB of memory. Which approach can work at all?",
        question: {
          type: "choice",
          options: [
            "Data parallelism, since it uses all the GPUs",
            "Tensor or pipeline parallelism, which split the model's weights across GPUs",
            "Buying a faster PCIe link",
            "Reducing the batch size to zero",
          ],
          answer: 1,
          feedback: {
            0: "Data parallelism puts a full copy of the model on every GPU, and 120 GB does not fit in 80 GB.",
            2: "A faster link moves data quicker but does not make 120 GB fit in 80 GB of memory.",
            3: "A batch of zero does no work.",
          },
          hint: "Which approaches keep only part of the model on each GPU?",
        },
        explanation: "When the model does not fit on one GPU, it must be **split**: tensor parallelism (cut within layers) or pipeline parallelism (cut between layers), often combined with data parallelism across groups of GPUs. Quantising to fewer bits is the other lever.",
      },
      {
        kind: "code",
        title: "Model the overlap",
        body: "A job is cut into `chunks` equal pieces that flow through three stages: copy in, compute, copy out. Each stage works on one chunk at a time, but different chunks can be in different stages. The total time is the time for one chunk to pass through all three stages, plus `chunks - 1` more waits at the pace of the slowest stage:\n\n`total = (a + b + c) / chunks + (chunks - 1) * max(a, b, c) / chunks`\n\nWrite `pipeline_time(a, b, c, chunks)` for stage times `a` (copy in), `b` (compute), `c` (copy out) of the whole job.",
        language: "python",
        starter: `def pipeline_time(a, b, c, chunks):
    return 0
`,
        solution: `def pipeline_time(a, b, c, chunks):
    one_chunk = (a + b + c) / chunks
    slowest = max(a, b, c) / chunks
    return one_chunk + (chunks - 1) * slowest
`,
        tests: [
          { id: "one", description: "One chunk is the serial sum", assertionCode: `assert pipeline_time(10, 10, 10, 1) == 30, f"got {pipeline_time(10, 10, 10, 1)}"` },
          { id: "four", description: "Four chunks of a balanced job: 15", assertionCode: `assert pipeline_time(10, 10, 10, 4) == 15, f"got {pipeline_time(10, 10, 10, 4)}"` },
          { id: "uneven", description: "A copy-heavy job in 8 chunks: 23.75", assertionCode: `assert abs(pipeline_time(20, 10, 20, 8) - 23.75) < 1e-9, f"got {pipeline_time(20, 10, 20, 8)}"` },
          { id: "floor", description: "Many chunks approach the slowest stage", assertionCode: `t = pipeline_time(20, 10, 20, 1000)\nassert 20 <= t < 20.1, f"got {t}"` },
        ],
        hints: ["The first chunk takes (a + b + c) / chunks to get all the way through.", "Every other chunk finishes one slowest-stage step (max(a, b, c) / chunks) later."],
      },
      {
        kind: "explain",
        title: "A first-hour checklist",
        body: "When you are handed a slow GPU job, here is what you would actually run and read (tools are examples; use your platform's equivalents):\n\n- **Is the GPU busy?** `nvidia-smi` (or `rocm-smi`) shows utilisation and memory used. Careful: \"utilisation\" only means *some kernel was running*, not that the chip was used well.\n- **Record a timeline** with Nsight Systems, the PyTorch profiler, or rocprof. Look for gaps, many tiny kernels (launch overhead), and large copies.\n- **Zoom into the hot kernel** with a kernel profiler (such as Nsight Compute): is it memory- or compute-bound, are loads coalesced, what is the occupancy?\n- **Fix the big things first**: keep data on the GPU, batch work, use pinned memory and streams, fuse small kernels together, and use tuned libraries before hand-written kernels.\n- **Time it honestly**: GPU calls are **asynchronous**, so a CPU stopwatch around a launch measures only the launch. Use the profiler or GPU events, synchronise before stopping the clock, run a warm-up first, and repeat.\n- **Check scaling honestly**: if 8 GPUs give only 5× the speed, look at communication time on the timeline.",
      },
      {
        kind: "question",
        title: "A suspiciously fast kernel",
        body: "You time a kernel with a CPU stopwatch around its launch and get 0.02 ms, yet the profiler says it takes 12 ms. What is the most likely explanation?",
        question: {
          type: "choice",
          options: [
            "The profiler is adding delay",
            "The launch is asynchronous: the CPU only measured how long it took to queue the kernel, not to run it",
            "The kernel ran on the CPU",
            "The GPU is much faster when no one is watching",
          ],
          answer: 1,
          feedback: {
            0: "Profilers add a little overhead, but not a 600-fold difference.",
            2: "It ran on the GPU. The CPU just did not wait for it.",
            3: "A watched kernel is not slower; the stopwatch simply stopped too early.",
          },
          hint: "Does the CPU wait for the kernel to finish when it launches one?",
        },
        explanation: "Kernel launches return immediately and the GPU works in the background. To time it, **synchronise** (wait for the GPU to finish) before reading the clock, or use GPU-side events or a profiler. Many \"mysteriously fast\" benchmarks come from skipping this.",
      },
      {
        kind: "recap",
        points: [
          "Profile before tuning: read the **timeline** for idle gaps, then copies, then the hottest kernel, then decide **memory- or compute-bound**, and only then tune details.",
          "**Streams** and chunking overlap copy-in, compute and copy-out; the total can approach the **slowest stage** but no lower.",
          "**Data parallelism** copies the model to each GPU; **tensor/pipeline parallelism** split a model too big for one GPU, and need fast GPU-to-GPU links (NVLink is one example).",
          "GPU launches are **asynchronous**: synchronise, warm up and repeat when timing, and do not trust \"utilisation\" alone.",
        ],
      },
    ],
  },
];
