# Hardware path: CPU, memory and GPU (Foundations part `hardware`)

Placement: a new part `hardware` between `hood` and `building`, titled
"Hardware: how the CPU, memory and GPU really work", blurb along the lines of
"From logic gates to pipelines, caches, virtual memory and GPU kernels: how the
machine runs your code fast, from beginner to professional."
Module order inside the part: `cpu`, `memory`, `gpu`.

Assumed prior knowledge (link back, never re-teach at length): bits/logic gates
(fnd-bits-*), Inside the computer (fnd-computer-1..8: parts, memory, fetch-decode-execute,
clock/cores/IPC, buses, hierarchy and a tiny cache, I/O, boot), Assembly on the toy CPU
(fnd-asm-*), C pointers/arrays/stack/heap (fnd-c-*), Unix processes/scheduler (fnd-unix-*),
Big-O (fnd-dsa-2), inference and GPU batching (fnd-ai-8-inference).

Every lesson carries `level`: "Beginner" | "Intermediate" | "Advanced" | "Professional"
(the existing `Difficulty` type). Levels never go backwards inside a module.
6–10 steps per lesson, at least half interactive, one idea per step, original writing in the
voice of the existing lessons, beginner-friendly words even at Professional level (define every
term the first time). Every module ends its Professional lessons with practical, real-tool
guidance (what you'd actually run/measure), clearly labelled where tool names are examples.

Accuracy rules: numbers are "typical, order of magnitude" and say so (e.g. L1 ≈ 1 ns / 4–5
cycles, L2 ≈ 3–5 ns, L3 ≈ 10–20 ns, DRAM ≈ 60–100 ns, NVMe ≈ 10–100 µs; 64-byte cache lines
on mainstream x86/ARM; 4 KiB base pages; warps of 32 threads on NVIDIA, wavefronts of 32/64 on
AMD). Vendor-specific facts are named as such. No invented benchmarks presented as real.

## Module `cpu` — "How a CPU runs your code" (ids `fnd-cpu-N-…`)
1. Beginner — From gates to an adder: gates → half/full adder → an ALU that adds, subtracts, compares.
2. Beginner — The datapath: registers, ALU, control unit; one instruction travelling through it.
3. Beginner — Cycles per instruction: why some instructions take longer; clock × IPC recap → real run time.
4. Intermediate — Pipelining: the 5-stage pipeline (fetch, decode, execute, memory, write-back); latency vs throughput.
5. Intermediate — Hazards and stalls: data hazards, forwarding, load-use stall, structural/control hazards.
6. Intermediate — Branch prediction: mispredict cost, predictors learning patterns, the sorted-vs-unsorted array effect, branchless code.
7. Advanced — Superscalar and out-of-order: multiple issue, reorder buffer, register renaming, instruction-level parallelism and its limits.
8. Advanced — Many cores: threads vs cores, SMT/hyper-threading, Amdahl's law, why 8 cores ≠ 8× faster.
9. Advanced — SIMD: one instruction, many numbers (SSE/AVX/NEON as examples), vectorising a loop, when compilers do it.
10. Professional — Measuring the CPU: performance counters (cycles, instructions, IPC, branch-misses), sampling profilers and flame graphs, a methodical optimise loop (measure → hypothesis → change → re-measure), microbenchmark pitfalls.

## Module `memory` — "Memory: from bytes to the hierarchy" (ids `fnd-mem-N-…`)
1. Beginner — Inside a memory chip: SRAM vs DRAM (flip-flops vs capacitors that leak and need refresh), rows/columns, why RAM forgets.
2. Beginner — The memory hierarchy: registers → L1 → L2 → L3 → RAM → SSD; size vs speed; human-scale latency.
3. Beginner — Latency vs bandwidth: how long the first byte takes vs how many bytes per second; the pipe analogy.
4. Intermediate — Cache lines and locality: memory moves in 64-byte lines; spatial/temporal locality; row-major vs column-major traversal.
5. Intermediate — How a cache finds data: address → tag / index / offset; direct-mapped vs set-associative; hit, miss, eviction (LRU).
6. Intermediate — The three kinds of miss: compulsory, capacity, conflict; working-set size; the step in the latency curve.
7. Intermediate — Alignment, padding and layout: why fields are aligned, struct padding, reordering fields, array-of-structs vs struct-of-arrays.
8. Advanced — Virtual memory: every process sees its own addresses; pages and page tables; address translation; protection.
9. Advanced — TLB and page faults: the translation cache, minor vs major faults, swapping, huge pages.
10. Advanced — Many cores, one memory: cache coherence (MESI in plain words), false sharing and padding to a line.
11. Professional — Memory ordering and atomics: compilers and CPUs reorder; data races; atomics, acquire/release, fences; why locks work.
12. Professional — Memory performance in practice: bandwidth-bound vs compute-bound, prefetching, NUMA, allocators and fragmentation, measuring cache misses and memory bandwidth with real tools.

## Module `gpu` — "GPUs: thousands of small cores" (ids `fnd-gpu-N-…`)
1. Beginner — Why GPUs exist: a few big cores (latency) vs thousands of small ones (throughput); pixels as the first parallel job.
2. Beginner — The graphics pipeline: vertices → triangles → rasterise → fragments/pixels; shaders as tiny programs run per item.
3. Intermediate — Kernels and threads: write the work for one item; grid → blocks → threads; global index = block × size + thread.
4. Intermediate — Warps and divergence: 32 threads in lockstep (SIMT); an if that splits a warp runs both sides.
5. Intermediate — GPU memory: registers, shared memory, global memory (HBM/GDDR), copying between CPU and GPU over PCIe, why transfers can dominate.
6. Advanced — Coalescing: neighbouring threads reading neighbouring addresses → one wide transaction; strided access wastes bandwidth.
7. Advanced — Occupancy and latency hiding: many warps resident so others run while one waits; registers/shared memory limit occupancy.
8. Advanced — Tiled matrix multiply: why naive matmul is memory-bound; tiles in shared memory reuse data; arithmetic intensity.
9. Professional — GPUs for AI: tensor cores, FP32/FP16/BF16/INT8, the roofline model, why LLM decode is memory-bound and prefill compute-bound (link fnd-ai-8-inference).
10. Professional — Profiling and scaling: kernel timelines, overlapping copies and compute with streams, multi-GPU (data vs tensor parallelism, NVLink/interconnect as examples), what to measure first.

## Implementation notes

- Content: `src/content/foundations/{cpu,memory,gpu}.ts` (`cpuModule`, `memoryModule`, `gpuModule`), all with `part: "hardware"`.
- Widgets: `src/learn/widgets/cpuarch/` (`CPUARCH_WIDGETS`, keys `cpuarch-*`), `src/learn/widgets/memsys/`
  (`MEMSYS_WIDGETS`, keys `memsys-*`), `src/learn/widgets/gpu/` (`GPU_WIDGETS`, keys `gpu-*`).
- Lesson ids: `fnd-cpu-N-slug`, `fnd-mem-N-slug`, `fnd-gpu-N-slug`.
- Levels: set `level` on every lesson; see "Lesson levels" in FOUNDATIONS_AUTHORING.md.
