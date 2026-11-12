import type { ConceptLesson } from "../../learn/types.ts";

/**
 * GPU module, lessons 1 to 5: why GPUs exist, the graphics pipeline, kernels and threads, warps and divergence, GPU memory.
 * CUDA words are the main vocabulary (they are the most widely taught); the other vendors' names are given when a term first appears.
 */
export const gpuLessonsA: ConceptLesson[] = [
  // ── Lesson 1 ──
  {
    id: "fnd-gpu-1-why-gpus",
    title: "Why GPUs exist",
    summary: "A few fast workers or thousands of slow ones? Why pixels, and later AI, favour the crowd.",
    minutes: 6,
    xp: 45,
    level: "Beginner",
    steps: [
      {
        kind: "explain",
        title: "Eight experts or a thousand helpers?",
        body: "Imagine painting a huge wall. You can hire **8 expert painters**, each very fast, or **1,000 helpers**, each slow with a tiny brush.\n\nIf the wall is one big flat area, the thousand helpers finish first: everyone paints their own patch and nobody has to wait for anyone. But if the job is *\"paint the next stripe only after the previous stripe is dry\"*, 999 helpers just stand around, and the experts win.\n\nThat is the difference between a **CPU** and a **GPU** (graphics processing unit). A CPU has a few big, clever cores that finish *one* thing quickly. A GPU has thousands of small, simple cores that finish *a huge number of things* per second.\n\nPress **Run the race**, then try the other jobs. (This is a toy: the numbers are made up to show the shape of the idea.)",
        widget: { type: "gpu-race", props: { chain: 0, items: 4096 } },
      },
      {
        kind: "question",
        title: "Make the CPU win",
        body: "Pick or build a job so that the **CPU** finishes first, then press **Run the race**. Hint: think about steps that each need the answer of the step before.",
        widget: { type: "gpu-race", props: { chain: 0, items: 4096 } },
        question: {
          type: "widget",
          goal: { winner: "cpu", ran: true },
          prompt: "Set up a job where the CPU wins, and run the race.",
          hint: "Many steps that must go one after another can use only one worker, so speed per worker matters more than the number of workers.",
        },
        explanation: "A chain of dependent steps (\"add this to the running total\", \"follow the next link\") can only use **one** worker at a time. The CPU's worker is faster, so it wins. The GPU wins when there are many **independent** pieces, because then all its slow workers can start at once.",
      },
      {
        kind: "question",
        title: "Spot the crowd-friendly jobs",
        body: "Which of these jobs is made of lots of **independent** pieces, so thousands of small workers could share it? Pick all that apply.",
        question: {
          type: "choice",
          options: [
            "Brightening every pixel of a photo by 10%",
            "Following a chain of links, where each link tells you where the next one is",
            "Multiplying two big tables of numbers (every result cell is its own sum)",
            "Computing a running total where each step adds to the previous total",
          ],
          answer: [0, 2],
          feedback: {
            1: "To find the next link you must have read the current one, so the steps cannot happen at the same time.",
            3: "Each step needs the total from the step before, so they have to go one after another.",
          },
          hint: "Ask of each job: can two pieces be done at the same moment without knowing each other's answer?",
        },
        explanation: "Brightening a pixel never needs another pixel's result, and every cell of a table product is its own sum: perfect for a crowd. Link-chasing and running totals are chains, where each step waits for the one before. (Clever tricks can split some running totals up, but that is extra work, not free.)",
      },
      {
        kind: "question",
        title: "Counting pixels",
        body: "A full-HD screen is **1,920 pixels wide and 1,080 pixels tall**. How many pixels is that in total?",
        question: { type: "number", answer: 2073600, unit: "pixels", hint: "Width times height." },
        explanation: "1,920 × 1,080 = **2,073,600** pixels, about two million. Every one of them needs a colour, and each colour can be worked out without looking at the others: pixels were the first big parallel job, which is why GPUs were invented.",
      },
      {
        kind: "question",
        title: "Pixels per second",
        body: "A game draws that screen **60 times every second**. About how many million pixel colours is that to work out each second? (Round to the nearest million.)",
        question: { type: "number", answer: 124, tolerance: 1, unit: "million per second", hint: "2,073,600 × 60, then divide by a million." },
        explanation: "2,073,600 × 60 ≈ **124 million** pixel colours per second, and a modern game does several steps of work for each one. One fast core doing them one by one would never keep up; thousands of small cores sharing the work can.",
      },
      {
        kind: "explain",
        title: "Latency or throughput?",
        body: "Two words describe the split:\n\n- **Latency** is how long *one* job takes from start to finish. A CPU is built to make this small: big caches, clever guessing, a few very fast cores.\n- **Throughput** is how many jobs get finished *per second*. A GPU is built to make this large: it spends its chip area on thousands of small arithmetic units instead of on cleverness.\n\nA sports car and a bus: the car gets *one* person across town sooner, the bus gets *fifty* people there per hour. Neither is better; it depends on the trip.\n\nGPUs started as graphics chips, but the same trick, doing the same small calculation on a huge pile of data, fits science, video, and above all **AI**, whose core work is multiplying giant tables of numbers. You will see that in the last two lessons. (The CPU module, *How a CPU runs your code*, shows the other side: how one big, clever core is built to make a single job fast.)",
      },
      {
        kind: "question",
        title: "A fair summary",
        body: "Which statement about CPUs and GPUs is true?",
        question: {
          type: "choice",
          options: [
            "A GPU is simply a faster CPU that does everything better",
            "A GPU's cores are slower and simpler, but there are thousands of them, so it wins when the work splits into many independent pieces",
            "A GPU can only draw pictures; it cannot do ordinary calculations",
          ],
          answer: 1,
          feedback: {
            0: "A GPU is slower at a single sequential task; you would not run your operating system on it.",
            2: "GPUs run general calculations too (science, AI, video). Drawing is just where they started.",
          },
          hint: "Think of the painters: which crowd wins on a chain of dependent steps?",
        },
        explanation: "A GPU trades single-core speed for sheer numbers. It shines on big, regular, independent work and loses on chains of dependent steps. Real systems use **both**: the CPU runs the program and hands the crowd-friendly parts to the GPU.",
      },
      {
        kind: "recap",
        points: [
          "A **CPU** has a few fast, clever cores built for low **latency**; a **GPU** has thousands of small cores built for high **throughput**.",
          "Work that splits into **independent pieces** (pixels, big table products) suits a GPU; a **chain of dependent steps** does not.",
          "A 1080p screen at 60 frames per second is about 124 million pixel colours every second: pixels were the first parallel job.",
          "The same trick now powers science, video and AI. Real programs use the CPU and the GPU together.",
        ],
      },
    ],
  },

  // ── Lesson 2 ──
  {
    id: "fnd-gpu-2-graphics-pipeline",
    title: "The graphics pipeline",
    summary: "From vertices to triangles to pixels: how a scene becomes a picture, and what a shader is.",
    minutes: 7,
    xp: 50,
    level: "Beginner",
    steps: [
      {
        kind: "explain",
        title: "From corners to colours",
        body: "A 3D game scene is built from thousands or millions of **triangles**. Why triangles? Three points always lie flat on one plane, so a triangle is the simplest shape that is never bent or twisted.\n\nTo turn triangles into a picture, the GPU runs them through a **pipeline**, a series of stages. Press **Play** to watch one triangle go through the three big ideas. (A real screen has millions of pixels; this one has 104 so you can see each.)",
        widget: { type: "gpu-pipeline" },
      },
      {
        kind: "question",
        title: "What is a vertex?",
        body: "Scene 1 showed three dots joined into a triangle. What do we call one of those corner points?",
        widget: { type: "gpu-pipeline", props: { scenes: ["vertices"] } },
        question: {
          type: "choice",
          options: ["A fragment", "A vertex", "A shader", "A pixel"],
          answer: 1,
          feedback: {
            0: "A fragment is a pixel-sized piece of a triangle, which comes later in the pipeline.",
            2: "A shader is a small program, not a point.",
            3: "A pixel is a dot on the screen. The corners of a triangle are called vertices.",
          },
          hint: "The plural is \"vertices\".",
        },
        explanation: "A corner point is a **vertex** (plural vertices). The **vertex shader** is a tiny program that runs once per vertex and decides where on the screen it lands. A model with a million vertices runs it a million times, all independent of each other.",
      },
      {
        kind: "question",
        title: "Which pixels are covered?",
        body: "Play this scene to the end. The counter at the bottom counts the pixels whose centre is inside the triangle. **How many pixels does the triangle cover?**",
        widget: { type: "gpu-pipeline", props: { scenes: ["raster"] } },
        question: { type: "number", answer: 23, hint: "Watch the last number the counter reaches." },
        explanation: "The triangle covers **23** of the 104 pixels. Working this out is called **rasterising**: for each pixel, test whether its centre falls inside the triangle. Every pixel's test is independent, so a GPU can check thousands at once. Each covered pixel becomes a **fragment**.",
      },
      {
        kind: "question",
        title: "Why all at once?",
        body: "In scene 3 the fragment shader colours every covered pixel. Why can the GPU colour them all at the same time?",
        widget: { type: "gpu-pipeline", props: { scenes: ["shade"] } },
        question: {
          type: "choice",
          options: [
            "Because each pixel's colour does not depend on any other pixel's colour",
            "Because the colours are all the same",
            "Because the screen refreshes faster than the shader runs",
            "Because the CPU does the work in advance",
          ],
          answer: 0,
          feedback: {
            1: "The colours differ: they blend orange, blue and green by distance from each corner.",
            2: "Refresh rate is unrelated; the point is that no pixel waits on another.",
            3: "The GPU runs the shader itself, once per fragment.",
          },
          hint: "Does pixel 5 need to know the result for pixel 4?",
        },
        explanation: "Each fragment's colour comes from its own position and the triangle's corner colours only, with no pixel waiting on another. Work with **no dependencies between items** is exactly what thousands of small cores are good at.",
      },
      {
        kind: "question",
        title: "Put the pipeline in order",
        body: "Order the stages a triangle goes through, from first to last.",
        question: {
          type: "order",
          items: [
            "The vertex shader places each corner on the screen",
            "The corners are joined into a triangle",
            "Rasterising finds the pixels the triangle covers",
            "The fragment shader colours each covered pixel",
            "The finished pixels are written to the frame sent to the screen",
          ],
          hint: "Corners first, colours last.",
        },
        explanation: "Vertices, then triangle, then covered pixels (fragments), then colours, then the frame. Real GPUs add more stages (depth tests to hide what is behind other things, blending for see-through objects), but the shape is always: **few items, turned into many items, each handled by a tiny program**.",
      },
      {
        kind: "explain",
        title: "A shader is a tiny program",
        body: "A **shader** is a small program that the GPU runs for *every item* of one kind: once per vertex, or once per fragment. You write it for **one** item and the GPU runs thousands of copies of it at the same time.\n\nHere is a fragment shader that fades the screen from black on the left to white on the right. It is written in the style of GLSL, a common shader language (others: HLSL, Metal Shading Language, WGSL):\n\n```text\nvoid main() {\n    float x = pixel_x / screen_width;   // 0.0 at the left edge, 1.0 at the right\n    color = vec3(x, x, x);              // red = green = blue = grey\n}\n```\n\nNotice what is missing: there is **no loop over pixels**. The program says what to do for one pixel, and the GPU runs it for all of them. Different vendors differ in the details (phones and Apple chips, for example, usually colour the screen one small tile at a time), but the idea of one tiny program per item is shared by all.",
      },
      {
        kind: "code",
        title: "Write a shader for one pixel",
        body: "Write `shade(x, width)`, the fragment shader for the left-to-right fade. It gets a pixel's column `x` (0 for the leftmost) and the screen `width` in pixels, and returns a grey level from **0** (black) to **255** (white): the leftmost pixel is 0 and the rightmost (column `width - 1`) is 255.\n\nUse whole-number maths: `x * 255 // (width - 1)`. Notice that you only write the code for **one** pixel.",
        language: "python",
        starter: `def shade(x, width):
    # return the grey level (0..255) for the pixel in column x
    return 128
`,
        solution: `def shade(x, width):
    return x * 255 // (width - 1)
`,
        tests: [
          { id: "left", description: "The leftmost pixel is black", assertionCode: `assert shade(0, 100) == 0, f"column 0 should be 0, got {shade(0, 100)}"` },
          { id: "right", description: "The rightmost pixel is white", assertionCode: `assert shade(99, 100) == 255, f"column 99 of 100 should be 255, got {shade(99, 100)}"` },
          { id: "middle", description: "A pixel halfway across is mid-grey", assertionCode: `assert shade(50, 101) == 127, f"column 50 of 101 should be 127, got {shade(50, 101)}"` },
          { id: "every", description: "Grey grows as you go right", assertionCode: `vals = [shade(x, 16) for x in range(16)]\nassert vals == sorted(vals) and vals[0] == 0 and vals[-1] == 255, f"got {vals}"` },
        ],
        hints: ["The fraction across the screen is x / (width - 1). Multiply by 255.", "Use // so you get a whole number: x * 255 // (width - 1)."],
      },
      {
        kind: "recap",
        points: [
          "Scenes are made of **triangles**; a triangle is three **vertices**.",
          "The pipeline: **vertex shader** places the corners, the triangle is **rasterised** into the **fragments** (pixels) it covers, and a **fragment shader** colours each one.",
          "A **shader** is a tiny program written for one item; the GPU runs it on thousands of items at once.",
          "This works because the items are **independent**: one pixel's colour never waits on another's.",
        ],
      },
    ],
  },

  // ── Lesson 3 ──
  {
    id: "fnd-gpu-3-kernels-threads",
    title: "Kernels and threads",
    summary: "Write the work for one item; the GPU runs it on a grid of blocks of threads. Find your own index.",
    minutes: 7,
    xp: 60,
    level: "Intermediate",
    steps: [
      {
        kind: "explain",
        title: "A kernel: the work for one item",
        body: "Shaders do graphics. For general number crunching GPUs run a **kernel**: a function you write for **one** item, which the GPU then runs once for every item in your data. Here is a kernel that adds two lists of numbers, in CUDA (NVIDIA's language, which is C++ with a few extras and the most widely taught):\n\n```cpp\n__global__ void add(const float *a, const float *b, float *c, int n) {\n    int i = blockIdx.x * blockDim.x + threadIdx.x;   // which item am I?\n    if (i < n) {\n        c[i] = a[i] + b[i];\n    }\n}\n```\n\nEach running copy is a **thread**. The GPU launches thousands of them. All of them run the same code, so each needs a way to know *which element is mine*: that is the `i` line. The rest of this lesson unpacks it.\n\nA note on words: CUDA is the vocabulary used here. Other systems have the same ideas with other names: OpenCL calls threads *work-items* and blocks *work-groups*; Metal says *threads* and *threadgroups*; Vulkan compute says *invocations* and *workgroups*; AMD's HIP copies CUDA's names.",
      },
      {
        kind: "explain",
        title: "Grid, blocks, threads",
        body: "Threads are organised in two levels:\n\n- Threads are grouped into **blocks** (all the same size: `blockDim.x` threads). A block's threads can cooperate and share fast memory (more in a later lesson).\n- The blocks together are the **grid**.\n\nThree built-in numbers tell a thread where it is: `blockIdx.x` (which block), `blockDim.x` (threads per block) and `threadIdx.x` (which thread inside its block). Then:\n\n**global index = block × block size + thread**\n\nIt works like finding a seat in a theatre: row number times seats per row, plus the seat in that row. Below, an array of 20 elements is covered by blocks of 8 threads. **Tap a thread** and read its index.",
        widget: { type: "gpu-grid", props: { n: 20, blockSize: 8 } },
      },
      {
        kind: "question",
        title: "Find your element",
        body: "Tap the thread whose global index is **11**.",
        widget: { type: "gpu-grid", props: { n: 20, blockSize: 8, fixed: true } },
        question: { type: "widget", goal: { picked: 11 }, hint: "11 = block × 8 + thread. Which block starts at 8?" },
        explanation: "Block 1 starts at 1 × 8 = 8, so thread 3 of block 1 has index 1 × 8 + 3 = **11**. The same index can never belong to two threads: that is what makes the layout work.",
      },
      {
        kind: "question",
        title: "Cover 20 elements with 2 blocks",
        body: "Change the block size so the whole array of **20 elements** is covered by exactly **2 blocks**.",
        widget: { type: "gpu-grid", props: { n: 20, blockSize: 8 } },
        question: { type: "widget", goal: { n: 20, blocks: 2 }, prompt: "Make 2 blocks cover 20 elements.", hint: "Each block needs at least 10 threads. Which block sizes on offer are big enough?" },
        explanation: "With blocks of **16** threads, 2 blocks give 32 threads, enough for 20 elements, and 12 threads are left over. With 8 you need 3 blocks (24 threads); with 4 you need 5.",
      },
      {
        kind: "question",
        title: "How many blocks?",
        body: "You have **1,000** elements and choose **256** threads per block. How many blocks must you launch so that every element gets a thread?",
        question: { type: "number", answer: 4, hint: "1000 ÷ 256 is about 3.9. You cannot launch a part of a block." },
        explanation: "You round **up**: 1,000 ÷ 256 = 3.9, so **4** blocks, giving 1,024 threads. In code that rounding-up division is `(n + size - 1) / size`.",
      },
      {
        kind: "question",
        title: "The extra threads",
        body: "With 4 blocks of 256 threads, 24 threads have an index of 1,000 or more, past the end of the array. In the kernel we wrote `if (i < n)`. What would happen without it?",
        question: {
          type: "choice",
          options: [
            "Nothing: the GPU skips threads that have no data",
            "The 24 extra threads would read and write memory past the end of the arrays, which can corrupt data or crash",
            "The GPU would launch fewer blocks automatically",
          ],
          answer: 1,
          feedback: {
            0: "The GPU runs every thread you launch; it has no idea how long your arrays are.",
            2: "The block count is whatever you asked for. Only your own code can keep extra threads away from the data.",
          },
          hint: "The GPU does not know your array length. Who stops thread 1,000 from touching element 1,000?",
        },
        explanation: "The grid is always a whole number of blocks, so there are often spare threads. The **bounds check** `if (i < n)` is what stops them touching memory that is not yours. Forgetting it is one of the most common GPU bugs.",
      },
      {
        kind: "code",
        title: "Your own index",
        body: "Write `global_index(block, block_size, thread)` that returns the global index of a thread, exactly as the kernel's `i` line computes it.",
        language: "python",
        starter: `def global_index(block, block_size, thread):
    return 0
`,
        solution: `def global_index(block, block_size, thread):
    return block * block_size + thread
`,
        tests: [
          { id: "first", description: "Block 0 thread 5 is index 5", assertionCode: `assert global_index(0, 256, 5) == 5, f"got {global_index(0, 256, 5)}"` },
          { id: "later", description: "Block 3 of size 256, thread 5 is 773", assertionCode: `assert global_index(3, 256, 5) == 773, f"got {global_index(3, 256, 5)}"` },
          { id: "unique", description: "Every index is used exactly once", assertionCode: `ids = [global_index(b, 8, t) for b in range(3) for t in range(8)]\nassert ids == list(range(24)), f"got {ids}"` },
        ],
        hints: ["Skip past all the earlier blocks first: block * block_size.", "Then add the position inside the block."],
      },
      {
        kind: "code",
        title: "How many blocks to launch?",
        body: "Write `blocks_needed(n, block_size)`: how many blocks cover `n` elements. It must **round up**, and an exact fit must not add a block: 1,024 elements with 256 threads need 4 blocks, not 5.\n\nTrick: for whole numbers, `(n + block_size - 1) // block_size` rounds up.",
        language: "python",
        starter: `def blocks_needed(n, block_size):
    return -1
`,
        solution: `def blocks_needed(n, block_size):
    return (n + block_size - 1) // block_size
`,
        tests: [
          { id: "round-up", description: "1,000 elements need 4 blocks of 256", assertionCode: `assert blocks_needed(1000, 256) == 4, f"got {blocks_needed(1000, 256)}"` },
          { id: "exact", description: "1,024 elements need exactly 4 blocks, not 5", assertionCode: `assert blocks_needed(1024, 256) == 4, f"got {blocks_needed(1024, 256)}"` },
          { id: "one", description: "One element still needs one block", assertionCode: `assert blocks_needed(1, 256) == 1, f"got {blocks_needed(1, 256)}"` },
          { id: "zero", description: "No elements, no blocks", assertionCode: `assert blocks_needed(0, 256) == 0, f"got {blocks_needed(0, 256)}"` },
        ],
        hints: ["Ordinary division gives a fraction; floor division `//` drops it, so add `block_size - 1` first to push partial blocks over the edge."],
      },
      {
        kind: "recap",
        points: [
          "A **kernel** is a function written for one item; the GPU runs it as thousands of **threads**.",
          "Threads form **blocks**, and blocks form the **grid**. Other APIs say work-items/work-groups (OpenCL) or threads/threadgroups (Metal).",
          "**Global index = blockIdx × blockDim + threadIdx** tells each thread which element is its own.",
          "Round the block count **up** with `(n + size - 1) // size`, and add a **bounds check** `if (i < n)` for the spare threads.",
        ],
      },
    ],
  },

  // ── Lesson 4 ──
  {
    id: "fnd-gpu-4-warps-divergence",
    title: "Warps and divergence",
    summary: "Threads march in lockstep groups of 32. An if that splits a group makes it run both sides.",
    minutes: 7,
    xp: 60,
    level: "Intermediate",
    steps: [
      {
        kind: "explain",
        title: "A marching band of 32",
        body: "A GPU does not run its threads fully on their own. It groups them into **warps** of **32 threads** (NVIDIA's word, and the usual way to teach this). All 32 threads of a warp execute the **same instruction at the same moment**, each on its own data, like a rowing crew pulling together on one drum beat. This style is called **SIMT**: single instruction, multiple threads.\n\nThe word and the size vary: AMD calls the group a *wavefront*, 32 or 64 lanes wide depending on the chip; Intel and Apple have their own names (Apple's *SIMD-groups* are 32 wide). The lesson is the same everywhere.\n\nIf you did the CPU module's *SIMD: one instruction, many numbers* lesson, a warp is like a 32-lane vector register. The difference is in how you write it: you code each thread as if it were alone (SIMT), and the hardware keeps the lanes in step, switching off the lanes that skip an `if`.\n\nThis makes the hardware cheap: one instruction decoder serves 32 lanes. The catch shows up with `if`. Below, a warp's 32 **lanes** (a lane is one thread's slot in the warp) meet an `if`. Try the different conditions and watch the passes.",
        widget: { type: "gpu-warp", props: { branch: "below" } },
      },
      {
        kind: "question",
        title: "Make it agree",
        body: "Right now half the warp takes the `if` side and half takes the `else` side. Change the condition or `k` so the lanes **all agree** and the warp does not diverge.",
        widget: { type: "gpu-warp", props: { branch: "below" } },
        question: { type: "widget", goal: { diverged: false }, prompt: "Get the warp to stop diverging.", hint: "If all 32 lanes give the same answer to the condition, only one side needs to run." },
        explanation: "When all lanes take the same side, only that side runs and every lane is busy. That is why a condition that is the same for a whole warp (such as one based on `blockIdx`, or on a setting passed to the kernel) costs nothing extra.",
      },
      {
        kind: "question",
        title: "Both sides run",
        body: "Lanes 0 to 15 take the `if` side, which costs **2 cycles**. Lanes 16 to 31 take the `else` side, which costs **6 cycles**. How many cycles does the warp spend on this branch in total?",
        widget: { type: "gpu-warp", props: { branch: "below" }, after: true },
        question: { type: "number", answer: 8, unit: "cycles", hint: "The warp runs one side, then the other. Do the two costs add or overlap?" },
        explanation: "**2 + 6 = 8 cycles.** While the `if` lanes work, the `else` lanes are switched off and wait; then it swaps. The warp cannot run both sides at once because it has only one instruction stream.",
      },
      {
        kind: "question",
        title: "Why both?",
        body: "Why does a GPU warp have to run **both** sides of an `if` whose lanes disagree?",
        question: {
          type: "choice",
          options: [
            "The GPU is not clever enough to evaluate the condition",
            "The warp has one instruction stream, so it runs the `if` side with the `else` lanes switched off, then the `else` side with the `if` lanes switched off",
            "Each thread secretly runs both sides and keeps one answer",
            "The compiler always converts `if` into a loop",
          ],
          answer: 1,
          feedback: {
            0: "The condition is evaluated per lane just fine; the problem is what to run next.",
            2: "Each lane runs only its own side's work; the other side's lanes are masked off (switched off).",
            3: "The compiler may turn small branches into \"predicated\" instructions, but not into loops.",
          },
          hint: "How many instructions can a warp issue at a time?",
        },
        explanation: "One instruction stream, so one side at a time. Lanes not on that side are **masked off**: they sit idle for those cycles. Modern NVIDIA chips can interleave the two sides and let lanes make progress independently, but the cost is the same in effect: divergent paths do not run at the same moment.",
      },
      {
        kind: "question",
        title: "How much is wasted?",
        body: "A warp splits: **8 lanes** take a 6-cycle `if` side and **24 lanes** take a 2-cycle `else` side. The branch lasts 8 cycles. What percentage of lane-cycles do useful work? (Lane-cycles are 32 lanes × 8 cycles = 256 slots.)",
        widget: { type: "gpu-warp", props: { branch: "below" }, after: true },
        question: { type: "number", answer: 37.5, tolerance: 0.5, unit: "%", hint: "Useful slots = 8 lanes × 6 cycles + 24 lanes × 2 cycles. Divide by 256." },
        explanation: "Useful lane-cycles = 8 × 6 + 24 × 2 = 96. Out of 256 slots that is **37.5%**. Utilisation is how much of the warp's width does real work, and divergence is the main way to lose it.",
      },
      {
        kind: "question",
        title: "Which test never diverges?",
        body: "A kernel is launched with blocks of 128 threads. Which condition is the same for every lane of a warp, so it can never split one?",
        question: {
          type: "choice",
          options: [
            "if (threadIdx.x % 2 == 0)",
            "if (data[i] > 0), where the data is random positive and negative numbers",
            "if (threadIdx.x < 20)",
            "if (blockIdx.x == 0)",
          ],
          answer: 3,
          feedback: {
            0: "Even and odd threads sit side by side in the same warp, so this splits every warp in half.",
            1: "Random data makes neighbouring lanes disagree, so most warps diverge.",
            2: "Threads 0 to 19 and 20 to 31 are in the same warp (warp 0), so that warp splits. (Other warps are all-false.)",
          },
          hint: "A warp's lanes all share one block. Which values are the same for all of them?",
        },
        explanation: "All 32 lanes of a warp belong to the same block, so `blockIdx.x` is the same for all of them: no divergence. Conditions on `threadIdx.x` or on per-item data can split a warp. Aligning the split to warp boundaries (like `threadIdx.x < 32`) also avoids it.",
      },
      {
        kind: "code",
        title: "Measure the waste",
        body: "Write `lane_utilisation(n_if, n_else, if_cycles, else_cycles)` that returns the fraction of lane-cycles doing useful work, as a number from 0 to 1. A side only costs its cycles if at least one lane takes it. Lanes always total 32.",
        language: "python",
        starter: `def lane_utilisation(n_if, n_else, if_cycles, else_cycles):
    return 0
`,
        solution: `def lane_utilisation(n_if, n_else, if_cycles, else_cycles):
    cycles = 0
    if n_if > 0:
        cycles += if_cycles
    if n_else > 0:
        cycles += else_cycles
    useful = n_if * if_cycles + n_else * else_cycles
    return useful / (32 * cycles)
`,
        tests: [
          { id: "agree", description: "All lanes on one side: 100%", assertionCode: `assert lane_utilisation(32, 0, 4, 9) == 1.0, f"got {lane_utilisation(32, 0, 4, 9)}"` },
          { id: "half", description: "A 16/16 split with equal costs: 50%", assertionCode: `assert lane_utilisation(16, 16, 4, 4) == 0.5, f"got {lane_utilisation(16, 16, 4, 4)}"` },
          { id: "uneven", description: "8 lanes at 6 cycles and 24 at 2 cycles: 37.5%", assertionCode: `assert lane_utilisation(8, 24, 6, 2) == 0.375, f"got {lane_utilisation(8, 24, 6, 2)}"` },
          { id: "else-only", description: "Everyone takes the else side: 100%", assertionCode: `assert lane_utilisation(0, 32, 7, 3) == 1.0, f"got {lane_utilisation(0, 32, 7, 3)}"` },
        ],
        hints: ["Total cycles = the if side's cycles (if any lane uses it) plus the else side's (if any lane uses it).", "Useful lane-cycles = n_if × if_cycles + n_else × else_cycles. Divide by 32 × total cycles."],
      },
      {
        kind: "question",
        title: "Taming divergence",
        body: "Items in an array need either a cheap or an expensive treatment, mixed at random, and the array is huge. What is the most effective way to cut divergence?",
        question: {
          type: "choice",
          options: [
            "Launch fewer threads so there are fewer warps",
            "Sort or group the items so that neighbouring threads take the same branch",
            "Add more else branches so each is shorter",
            "Use bigger blocks",
          ],
          answer: 1,
          feedback: {
            0: "Fewer threads means less work done per second, and the remaining warps still split.",
            2: "More branches usually means more passes for a warp that lands in several of them.",
            3: "Block size does not change which lanes inside one warp disagree.",
          },
          hint: "Divergence happens when neighbouring lanes disagree. How can you make neighbours agree?",
        },
        explanation: "If neighbouring threads handle items of the same kind, whole warps agree and skip the other side. Sorting or bucketing the work before the kernel is a common trick; so is writing branch-free arithmetic (for example selecting with a multiplication or a conditional move) when both paths are tiny.",
      },
      {
        kind: "recap",
        points: [
          "Threads run in **warps** of 32 (NVIDIA; AMD wavefronts are 32 or 64 wide) that execute one instruction together: **SIMT**.",
          "When lanes disagree at an `if`, the warp runs **both sides** one after the other, with the lanes not on that side switched off: **divergence**.",
          "Utilisation = useful lane-cycles ÷ (32 × cycles). Divergence is the main way to lose it.",
          "Conditions that are the same across a warp are free; make neighbouring threads take the same path by grouping similar work.",
        ],
      },
    ],
  },

  // ── Lesson 5 ──
  {
    id: "fnd-gpu-5-gpu-memory",
    title: "GPU memory",
    summary: "Registers, shared memory, global memory and the trip over PCIe: why copying can cost more than computing.",
    minutes: 8,
    xp: 60,
    level: "Intermediate",
    steps: [
      {
        kind: "explain",
        title: "A ladder of memories",
        body: "Like a CPU (you met its hierarchy in *Inside the computer*), a GPU has memories of different sizes and speeds (the memory module's *The memory hierarchy* and *Latency vs bandwidth* lessons cover the ideas in depth). From closest and fastest to farthest:\n\n- **Registers**: private to one thread, fastest, a few dozen to a couple of hundred per thread, about one cycle.\n- **Shared memory**: a small, fast scratchpad on the chip, shared by all threads of one **block**. *You* decide what goes in it. Roughly tens of cycles.\n- **L2 cache**: shared by the whole chip, filled automatically.\n- **Global memory**: the big memory on the card (gigabytes). It is built from **HBM** (high-bandwidth memory, stacked chips on data-centre cards) or **GDDR** (on graphics cards). Several hundred cycles away (often a few hundred nanoseconds, a slower first byte than a CPU's RAM), but with huge bandwidth: roughly 2 to 3+ terabytes per second on recent data-centre cards, around 0.5 to 1 TB/s on consumer cards (typical figures; they change every generation).\n- **Host memory**: the computer's ordinary RAM, across the **PCIe** link. PCIe 4.0 x16 moves about **32 GB/s** in each direction at best (PCIe 5.0 about 64), a small fraction of the card's own bandwidth.\n\nOne exception: phones and Apple chips use **unified memory**, where CPU and GPU share the same RAM, so there is no copy over a slow link at all.",
      },
      {
        kind: "question",
        title: "Fastest to slowest",
        body: "Order these from the **fastest** to reach to the **slowest**, for a thread on a discrete GPU.",
        question: {
          type: "order",
          items: ["Registers", "Shared memory (on the chip)", "L2 cache", "Global memory (HBM or GDDR on the card)", "Host RAM across PCIe"],
          hint: "The farther the data lives from the arithmetic units, the slower it is.",
        },
        explanation: "Registers, then shared memory, then the L2 cache, then global memory on the card, and last host RAM, which has to cross the PCIe link. Good GPU programs keep data in the fast levels and move it down the ladder as little as possible.",
      },
      {
        kind: "question",
        title: "What is shared memory?",
        body: "Which description of **shared memory** is correct?",
        question: {
          type: "choice",
          options: [
            "RAM that the CPU and GPU both read",
            "A small, fast on-chip scratchpad that all threads in one block can read and write, managed by the programmer",
            "A cache that all blocks of the grid share automatically",
            "Another name for global memory",
          ],
          answer: 1,
          feedback: {
            0: "That would be unified or pinned host memory. The name \"shared\" here means shared among threads in a block.",
            2: "It is shared only within one block, and nothing is automatic: you copy data in yourself.",
            3: "Global memory is the big off-chip memory; shared memory is small and on the chip.",
          },
          hint: "\"Shared\" by whom? Think of the threads of one block working together.",
        },
        explanation: "Shared memory is the block's own scratchpad (called *threadgroup memory* in Metal and *local memory* in OpenCL): tiny, very fast, and explicitly controlled. Tiled matrix multiplication, two lessons ahead, uses it to avoid reading global memory over and over.",
      },
      {
        kind: "explain",
        title: "The copy tax",
        body: "A discrete GPU cannot read your program's arrays directly. The usual dance is:\n\n1. **Copy in**: send the data from host RAM to the card over PCIe.\n2. **Run** one or more kernels on the card.\n3. **Copy out**: bring the results back.\n\nBelow, the orange parts are copying and the blue part is the maths. Try more maths per number, or more kernels on the same data, and see when the copy stops mattering.",
        widget: { type: "gpu-transfer", props: { mb: 256, opsPerElement: 1, kernels: 1, pcie: 32 } },
      },
      {
        kind: "question",
        title: "When the CPU is better",
        body: "Set up the widget so that **doing it on the CPU alone is faster** than copying to the GPU, computing and copying back.",
        widget: { type: "gpu-transfer", props: { mb: 256, opsPerElement: 1000, kernels: 20, pcie: 32 } },
        question: { type: "widget", goal: { gpuWins: false }, prompt: "Make the CPU-only time shorter than the GPU path.", hint: "Right now the GPU does a lot of maths per byte copied. Reduce the maths or the number of kernels." },
        explanation: "With little maths per number, the GPU's speed barely matters: the time is dominated by shipping the data both ways. The CPU, which already has the data in its own memory, wins. The rule of thumb: a GPU pays off when there is **a lot of maths per byte moved**, or when the data stays on the card for many steps.",
      },
      {
        kind: "question",
        title: "Make the copy small",
        body: "Now make the copy a **small share** of the GPU path: **10% or less** of its time.",
        widget: { type: "gpu-transfer", props: { mb: 1024, opsPerElement: 10, kernels: 1, pcie: 32 } },
        question: { type: "widget", goal: { maxCopyPercent: 10 }, prompt: "Get the copy share to 10% or less.", hint: "Keep the data on the GPU and run lots of kernels on it, or do more maths per number." },
        explanation: "Running **many kernels** on data that stays on the card (the usual shape of neural-network training, and of many simulations) spreads the one-time copy over a lot of useful work. Both fixes work: more maths per byte, or more reuse per copy.",
      },
      {
        kind: "question",
        title: "Time the copy",
        body: "A PCIe 4.0 x16 link moves about 32 GB per second (a theoretical best). How many **milliseconds** does it take to copy **1 GB** one way? (Round to the nearest millisecond.)",
        question: { type: "number", answer: 31, tolerance: 1, unit: "ms", hint: "1 GB ÷ 32 GB/s is a fraction of a second; times 1,000 for milliseconds." },
        explanation: "1 ÷ 32 = 0.03125 s ≈ **31 ms**, about 62 ms for a round trip. In that time a data-centre GPU could stream through its own memory at 3 TB/s about 94 times as much data. Copies across PCIe are the slow part of the path.",
      },
      {
        kind: "code",
        title: "The whole trip",
        body: "Write `gpu_total_time(nbytes, pcie_gb_s, kernel_s)`: seconds for copy-in, then the kernel (`kernel_s` seconds), then copy-out of the same number of bytes. A link of `pcie_gb_s` moves `pcie_gb_s * 1e9` bytes per second.",
        language: "python",
        starter: `def gpu_total_time(nbytes, pcie_gb_s, kernel_s):
    return 0
`,
        solution: `def gpu_total_time(nbytes, pcie_gb_s, kernel_s):
    copy = nbytes / (pcie_gb_s * 1e9)
    return copy + kernel_s + copy
`,
        tests: [
          { id: "basic", description: "32 GB over a 32 GB/s link plus a 0.5 s kernel is 2.5 s", assertionCode: `t = gpu_total_time(32e9, 32, 0.5)\nassert abs(t - 2.5) < 1e-9, f"got {t}"` },
          { id: "nothing", description: "Zero bytes costs only the kernel", assertionCode: `t = gpu_total_time(0, 32, 1.0)\nassert abs(t - 1.0) < 1e-9, f"got {t}"` },
          { id: "faster-link", description: "A faster link shortens the trip", assertionCode: `assert gpu_total_time(8e9, 64, 0.1) < gpu_total_time(8e9, 16, 0.1), "a 64 GB/s link should beat a 16 GB/s one"` },
        ],
        hints: ["One copy takes nbytes / (pcie_gb_s * 1e9) seconds.", "You copy twice: in and out."],
      },
      {
        kind: "recap",
        points: [
          "A GPU's memory ladder: **registers** (per thread) → **shared memory** (per block, programmer-managed) → **L2 cache** → **global memory** (HBM/GDDR on the card) → **host RAM** over PCIe.",
          "Typical numbers: HBM on data-centre cards is in the **TB/s** range; PCIe 4.0 x16 is about **32 GB/s** each way. Always check the actual hardware.",
          "A discrete GPU path is **copy in → kernels → copy out**; for little maths per byte, the copy dominates and the CPU can win.",
          "Keep data on the card and reuse it across many kernels. Phones and Apple chips share memory between CPU and GPU, so they skip the copy.",
        ],
      },
    ],
  },
];
