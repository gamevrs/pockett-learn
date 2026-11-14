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
        widget: { type: "gpu-race", props: { chain: 0, items: 8192 } },
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
            "A GPU is a faster CPU: its cores beat a CPU's on every kind of job",
            "A GPU can only draw pictures; it cannot run ordinary calculations",
            "A GPU's many simple cores win when work splits into independent pieces",
          ],
          answer: 2,
          feedback: {
            0: "A GPU is slower at a single sequential task; you would not run your operating system on it.",
            1: "GPUs run general calculations too (science, AI, video). Drawing is just where they started.",
          },
          hint: "Think of the painters: which crowd wins on a chain of dependent steps?",
        },
        explanation: "A GPU's cores are slower and simpler than a CPU's, but there are thousands of them: it trades single-core speed for sheer numbers. It shines on big, regular, independent work and loses on chains of dependent steps. Real systems use **both**: the CPU runs the program and hands the crowd-friendly parts to the GPU.",
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
          options: ["A pixel", "A fragment", "A shader", "A vertex"],
          answer: 3,
          feedback: {
            0: "A pixel is a dot on the screen. The corners of a triangle are called vertices.",
            1: "A fragment is a pixel-sized piece of a triangle, which comes later in the pipeline.",
            2: "A shader is a small program, not a point.",
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
            "Each pixel's colour does not depend on any other pixel's colour",
            "All the covered pixels get the same colour, so one answer is reused",
            "The screen refreshes faster than the shader runs, hiding the order",
            "The CPU works out the colours in advance and the GPU only copies them",
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
        body: "Write `shade(x, width)`, the fragment shader for the left-to-right fade. It gets a pixel's column `x` (0 for the leftmost) and the screen `width` in pixels, and returns a grey level from **0** (black) to **255** (white): the leftmost pixel is 0 and the rightmost (column `width - 1`) is 255.\n\nUse whole-number maths (`//`) so the result is a whole grey level. Notice that you only write the code for **one** pixel.",
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
        widget: { type: "gpu-grid", props: { n: 20, blockSize: 4 } },
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
            "The 24 extra threads would touch memory past the end of the arrays",
            "Nothing: the GPU notices which threads have no data and skips them",
            "The GPU would trim the last block so it ends exactly at element 999",
          ],
          answer: 0,
          feedback: {
            1: "The GPU runs every thread you launch; it has no idea how long your arrays are.",
            2: "The block count and size are whatever you asked for. Only your own code can keep extra threads away from the data.",
          },
          hint: "The GPU does not know your array length. Who stops thread 1,000 from touching element 1,000?",
        },
        explanation: "The 24 spare threads would read and write past the end of the arrays, which can corrupt other data or crash the program. The grid is always a whole number of blocks, so there are often spare threads. The **bounds check** `if (i < n)` is what stops them touching memory that is not yours. Forgetting it is one of the most common GPU bugs.",
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
        body: "Write `blocks_needed(n, block_size)`: how many blocks cover `n` elements. It must **round up**, and an exact fit must not add a block: 1,024 elements with 256 threads need 4 blocks, not 5.\n\nUse whole-number maths only (no floats, no imports): there is a one-line trick that makes floor division round up.",
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
        kind: "explain",
        title: "The host side: a whole program",
        body: "A kernel never runs on its own. A normal program on the CPU (the **host**) allocates memory on the GPU (the **device**), copies the inputs over, launches the kernel, waits, and copies the result back. Here is the whole thing for vector add, in CUDA:\n\n```cpp\n#include <cstdio>\n#include <cstdlib>\n#include <cuda_runtime.h>\n\n// Stop with a message if a CUDA call fails.\n#define CHECK(call) do { cudaError_t e = (call); if (e != cudaSuccess) { \\\n    printf(\"CUDA error: %s (line %d)\\n\", cudaGetErrorString(e), __LINE__); exit(1); } } while (0)\n\n__global__ void add(const float *a, const float *b, float *c, int n) {\n    int i = blockIdx.x * blockDim.x + threadIdx.x;\n    if (i < n) c[i] = a[i] + b[i];\n}\n\nint main() {\n    const int n = 1000000;\n    size_t bytes = n * sizeof(float);\n    float *ha = (float *)malloc(bytes), *hb = (float *)malloc(bytes), *hc = (float *)malloc(bytes);\n    for (int i = 0; i < n; i++) { ha[i] = 1.0f; hb[i] = 2.0f; }\n\n    float *da, *db, *dc;                                       // pointers into GPU memory\n    CHECK(cudaMalloc(&da, bytes));\n    CHECK(cudaMalloc(&db, bytes));\n    CHECK(cudaMalloc(&dc, bytes));\n    CHECK(cudaMemcpy(da, ha, bytes, cudaMemcpyHostToDevice));   // copy in\n    CHECK(cudaMemcpy(db, hb, bytes, cudaMemcpyHostToDevice));\n\n    int blocks = (n + 255) / 256;                              // round up: 3,907 blocks\n    add<<<blocks, 256>>>(da, db, dc, n);                       // launch; returns at once\n    CHECK(cudaGetLastError());                                 // was the launch itself valid?\n    CHECK(cudaDeviceSynchronize());                            // wait; errors inside the kernel show up here\n\n    CHECK(cudaMemcpy(hc, dc, bytes, cudaMemcpyDeviceToHost));   // copy out\n    printf(\"c[0] = %.1f\\n\", hc[0]);                            // prints c[0] = 3.0\n    cudaFree(da); cudaFree(db); cudaFree(dc);\n    free(ha); free(hb); free(hc);\n    return 0;\n}\n```\n\nYou build it with NVIDIA's compiler (`nvcc add.cu -o add`) and run it like any program. The `<<<blocks, 256>>>` part is the launch: grid size, then block size. The launch is **asynchronous** (the CPU carries on at once), which matters when you time things in the last lesson.\n\nThe same kernel in other systems (shown as examples; each also needs its own host code to create buffers and dispatch):\n\n```text\n// Metal Shading Language (Apple)\nkernel void add(device const float *a [[buffer(0)]], device const float *b [[buffer(1)]],\n                device float *c [[buffer(2)]], constant uint &n [[buffer(3)]],\n                uint i [[thread_position_in_grid]]) {\n    if (i < n) c[i] = a[i] + b[i];\n}\n\n// WGSL (WebGPU, runs in the browser)\n@group(0) @binding(0) var<storage, read> a: array<f32>;\n@group(0) @binding(1) var<storage, read> b: array<f32>;\n@group(0) @binding(2) var<storage, read_write> c: array<f32>;\n@compute @workgroup_size(256)\nfn main(@builtin(global_invocation_id) id: vec3<u32>) {\n    let i = id.x;\n    if (i < arrayLength(&c)) { c[i] = a[i] + b[i]; }\n}\n\n// OpenCL C\n__kernel void add(__global const float *a, __global const float *b, __global float *c, int n) {\n    int i = get_global_id(0);\n    if (i < n) c[i] = a[i] + b[i];\n}\n```\n\nNotice that Metal, WGSL and OpenCL hand each thread its global index directly instead of making you compute it. From Python, libraries such as CuPy, Numba (`@cuda.jit`) or Triton (examples) let you write or call kernels without the C++ host code; the steps underneath are the same.",
      },
      {
        kind: "recap",
        points: [
          "A **kernel** is a function written for one item; the GPU runs it as thousands of **threads**.",
          "Threads form **blocks**, and blocks form the **grid**. Other APIs say work-items/work-groups (OpenCL) or threads/threadgroups (Metal).",
          "**Global index = blockIdx × blockDim + threadIdx** tells each thread which element is its own.",
          "Round the block count **up** with `(n + size - 1) // size`, and add a **bounds check** `if (i < n)` for the spare threads.",
          "The **host** program allocates GPU memory, copies in, launches `kernel<<<blocks, threads>>>`, synchronises and copies out; Metal, WGSL and OpenCL follow the same steps.",
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
        widget: { type: "gpu-warp", props: { branch: "even" } },
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
        widget: { type: "gpu-warp", props: { branch: "below", k: 16, ifCycles: 2, elseCycles: 6 }, after: true },
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
            "Lanes cannot test a condition, so the warp must try both outcomes",
            "Every lane works out both sides and then throws one answer away",
            "The warp issues one instruction stream, so it runs one side at a time",
            "The compiler turns each `if` into a loop that runs once per side",
          ],
          answer: 2,
          feedback: {
            0: "The condition is evaluated per lane just fine; the problem is what to run next.",
            1: "Each lane runs only its own side's work; the other side's lanes are masked off (switched off).",
            3: "The compiler may turn small branches into \"predicated\" instructions, but not into loops.",
          },
          hint: "How many instructions can a warp issue at a time?",
        },
        explanation: "One instruction stream, so one side at a time: the `if` side with the `else` lanes **masked off** (idle), then the `else` side with the `if` lanes masked off. Since Volta (2017), NVIDIA chips can interleave the two sides and let lanes make progress independently, but the cost is the same in effect: divergent paths do not run at the same moment. The practical consequence: never assume a warp's lanes are in lockstep; when lanes exchange data, use `__syncwarp()` and the `*_sync` intrinsics.",
      },
      {
        kind: "question",
        title: "How much is wasted?",
        body: "A warp splits: **8 lanes** take a 6-cycle `if` side and **24 lanes** take a 2-cycle `else` side. The branch lasts 8 cycles. What percentage of lane-cycles do useful work? (Lane-cycles are 32 lanes × 8 cycles = 256 slots.)",
        widget: { type: "gpu-warp", props: { branch: "below", k: 8, ifCycles: 6, elseCycles: 2 }, after: true },
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
            "if (blockIdx.x == 0)",
            "if (threadIdx.x < 20)",
            "if (data[i] > 0), with random signs",
          ],
          answer: 1,
          feedback: {
            0: "Even and odd threads sit side by side in the same warp, so this splits every warp in half.",
            2: "Threads 0 to 19 and 20 to 31 are in the same warp (warp 0), so that warp splits. (Other warps are all-false.)",
            3: "Random positive and negative data makes neighbouring lanes disagree, so most warps diverge.",
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
            "Launch fewer threads, so fewer warps exist to diverge",
            "Group the items so neighbouring threads take the same branch",
            "Split the work into more `else` branches, each one shorter",
            "Use bigger blocks, so each warp has more lanes to share",
          ],
          answer: 1,
          feedback: {
            0: "Fewer threads means less work done per second, and the remaining warps still split.",
            2: "More branches usually means more passes for a warp that lands in several of them.",
            3: "A warp is always 32 lanes; block size does not change which lanes inside one warp disagree.",
          },
          hint: "Divergence happens when neighbouring lanes disagree. How can you make neighbours agree?",
        },
        explanation: "If neighbouring threads handle items of the same kind, whole warps agree and skip the other side. Sorting or bucketing the work before the kernel is a common trick; so is writing branch-free arithmetic (for example selecting with a multiplication or a conditional move) when both paths are tiny.",
      },
      {
        kind: "recap",
        points: [
          "Threads run in **warps** of 32 (NVIDIA; AMD wavefronts are 32 or 64 wide) that issue one instruction at a time for all lanes: **SIMT**. Since Volta, do not assume the lanes stay in lockstep; synchronise explicitly when they share data.",
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
        body: "Like a CPU (you met its hierarchy in *Inside the computer*), a GPU has memories of different sizes and speeds (the memory module's *The memory hierarchy* and *Latency vs bandwidth* lessons cover the ideas in depth). From closest and fastest to farthest:\n\n- **Registers**: private to one thread, fastest, a few dozen to a couple of hundred per thread, about one cycle.\n- **Shared memory**: a small, fast scratchpad on the chip, shared by all threads of one **block**. *You* decide what goes in it. Roughly tens of cycles.\n- **L2 cache**: shared by the whole chip, filled automatically.\n- **Global memory**: the big memory on the card (gigabytes). It is built from **HBM** (high-bandwidth memory, stacked chips on data-centre cards) or **GDDR** (on graphics cards). Several hundred cycles away (often a few hundred nanoseconds, a slower first byte than a CPU's RAM), but with huge bandwidth: roughly 2 to 3+ terabytes per second on recent data-centre cards, around 0.5 to 1 TB/s on consumer cards (typical figures; they change every generation).\n- **Host memory**: the computer's ordinary RAM, across the **PCIe** link. PCIe 4.0 x16 moves about **32 GB/s** in each direction at best (PCIe 5.0 about 64), a small fraction of the card's own bandwidth.\n\nNot every GPU sits across a PCIe link: chips where the CPU and GPU share one RAM get their own step later in this lesson.",
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
            "Ordinary RAM that the CPU and the GPU can both read and write",
            "A cache on the chip that every block of the grid shares automatically",
            "The card's big HBM or GDDR memory, shared by every thread on the GPU",
            "A small on-chip scratchpad for one block's threads, filled by your code",
          ],
          answer: 3,
          feedback: {
            0: "That would be unified or pinned host memory. The name \"shared\" here means shared among threads in a block.",
            1: "It is shared only within one block, and nothing is automatic: you copy data in yourself. (The L2 cache is the automatic, chip-wide one.)",
            2: "That is global memory: big and off the chip. Shared memory is small and on the chip.",
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
        question: { type: "widget", goal: { maxCopyPercent: 10 }, prompt: "Get the copy share to 10% or less.", hint: "One lever is not enough here: you need both the most maths per number and many kernels on the same data." },
        explanation: "The two levers **multiply**: the GPU's work is maths per number × kernels per copy. At the top maths setting, one kernel still leaves the copy at over 80% of the time; you also need dozens of kernels on data that stays on the card (the usual shape of neural-network training, and of many simulations) to spread the one-time copy over enough useful work. A faster link helps too, but array size does not: a bigger array means more copying *and* more maths, in the same ratio.",
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
        kind: "explain",
        title: "When CPU and GPU share memory",
        body: "Everything above assumed a **discrete** card: its own memory, across PCIe. Many GPUs are not built like that.\n\n- **Shared-RAM chips**: phones, Apple's M-series and the integrated GPUs in most laptops (Intel, AMD) put the CPU and GPU on one chip, using the **same RAM**. Apple calls this *unified memory*. There is no copy over a slow link: both sides can use the same buffer. The catch is that there is **one** bandwidth figure for everything (typically about 50 to 800 GB/s on such chips, well below a data-centre card's HBM), and the CPU and GPU share it.\n- **CUDA's \"Unified Memory\"** (`cudaMallocManaged`) is a different thing with a confusingly similar name. It gives the CPU and a discrete GPU **one address space**, so the same pointer works on both sides, but the data still **moves**: pages migrate over PCIe when the other side touches them. It saves you writing the copies, not the time they take.\n- **Tile-based rendering**: phone GPUs draw the screen one small tile (say 32 × 32 pixels) at a time, keeping that tile's colours and depth in fast on-chip memory, and write each finished tile to RAM once. Because their RAM bandwidth is shared and power-hungry, saving those trips matters more than raw speed.\n\nSo the first question about any GPU is: *where does the data live, and what is the one bandwidth number that limits it?*",
      },
      {
        kind: "recap",
        points: [
          "A GPU's memory ladder: **registers** (per thread) → **shared memory** (per block, programmer-managed) → **L2 cache** → **global memory** (HBM/GDDR on the card) → **host RAM** over PCIe.",
          "Typical numbers: HBM on data-centre cards is in the **TB/s** range; PCIe 4.0 x16 is about **32 GB/s** each way. Always check the actual hardware.",
          "A discrete GPU path is **copy in → kernels → copy out**; for little maths per byte, the copy dominates and the CPU can win.",
          "Keep data on the card and reuse it across many kernels: maths per number and reuse per copy multiply.",
          "Phones, Apple chips and laptop iGPUs share one RAM with the CPU, so they skip the copy but share the bandwidth. CUDA's managed \"Unified Memory\" shares an address space, not the RAM: data still crosses PCIe.",
        ],
      },
    ],
  },

];
