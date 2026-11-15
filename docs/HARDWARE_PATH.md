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

Each list below is the module's `lessons` array in order (array position decides order; ids never
change, so a lesson added later keeps the next free number wherever it sits).

## Module `cpu` — "How a CPU runs your code" (ids `fnd-cpu-N-…`)
1. Beginner — From gates to an adder (`fnd-cpu-1-gates-to-adder`): gates → half/full adder → an ALU that adds, subtracts, compares.
2. Beginner — The datapath: one instruction, start to finish (`fnd-cpu-2-datapath`): registers, ALU, control unit; one instruction travelling through it.
3. Beginner — Cycles per instruction (`fnd-cpu-3-cycles-per-instruction`): why some instructions take longer; clock × IPC recap → real run time.
4. Intermediate — The instruction set, and who may run what (`fnd-cpu-12-isa-privilege`): RISC vs CISC, x86/Arm/RISC-V, cracking instructions into micro-ops and the micro-op cache; user vs kernel mode, system calls, exceptions and interrupts, what a system call costs.
5. Intermediate — Pipelining: an assembly line for instructions (`fnd-cpu-4-pipelining`): the 5-stage pipeline (fetch, decode, execute, memory, write-back); latency vs throughput.
6. Intermediate — Hazards and stalls (`fnd-cpu-5-hazards`): data hazards, forwarding, load-use stall, structural/control hazards.
7. Intermediate — Branch prediction: guessing the future (`fnd-cpu-6-branch-prediction`): mispredict cost, predictors learning patterns, the sorted-vs-unsorted array effect, branchless code.
8. Advanced — Superscalar and out-of-order (`fnd-cpu-7-superscalar-ooo`): multiple issue, reorder buffer, register renaming, instruction-level parallelism and its limits.
9. Advanced — Many cores: why 8 cores is not 8x faster (`fnd-cpu-8-many-cores`): threads vs cores, SMT/hyper-threading, Amdahl's law.
10. Advanced — SIMD: one instruction, many numbers (`fnd-cpu-9-simd`): SSE/AVX/NEON as examples, vectorising a loop, when compilers do it.
11. Professional — Measuring the CPU (`fnd-cpu-10-measuring`): performance counters (cycles, instructions, IPC, branch-misses), sampling profilers and flame graphs, a methodical optimise loop (measure → hypothesis → change → re-measure), microbenchmark pitfalls.
12. Professional — Hardware security: when speed leaks secrets (`fnd-cpu-11-hardware-security`): timing, cache and power side channels, constant-time code, Spectre and Meltdown from prediction + out-of-order + caches, mitigations (KPTI and the TLB, PCID) and what they cost, fault injection.

## Module `memory` — "Memory: from bytes to the hierarchy" (ids `fnd-mem-N-…`)
1. Beginner — Inside a memory chip (`fnd-mem-1-chip`): SRAM vs DRAM (flip-flops vs capacitors that leak and need refresh), rows/columns, why RAM forgets.
2. Beginner — The memory hierarchy (`fnd-mem-2-hierarchy`): registers → L1 → L2 → L3 → RAM → SSD; size vs speed; human-scale latency.
3. Beginner — Latency vs bandwidth (`fnd-mem-3-latency-bandwidth`): how long the first byte takes vs how many bytes per second; the pipe analogy.
4. Intermediate — Cache lines and locality (`fnd-mem-4-lines`): memory moves in 64-byte lines; spatial/temporal locality; row-major vs column-major traversal.
5. Intermediate — How a cache finds data (`fnd-mem-5-find`): address → tag / index / offset; direct-mapped vs set-associative; hit, miss, eviction (LRU); write-back vs write-through and dirty bits.
6. Intermediate — The three kinds of miss (`fnd-mem-6-misses`): compulsory, capacity, conflict; working-set size; the step in the latency curve.
7. Intermediate — Alignment, padding and layout (`fnd-mem-7-layout`): why fields are aligned, struct padding, reordering fields, array-of-structs vs struct-of-arrays.
8. Advanced — Virtual memory (`fnd-mem-8-virtual`): every process sees its own addresses; pages and page tables; address translation; protection.
9. Advanced — TLB and page faults (`fnd-mem-9-tlb`): the translation cache, minor vs major faults, swapping, huge pages.
10. Advanced — Memory and storage technologies (`fnd-mem-13-technologies`): DRAM channels/ranks/banks/rows, DDR4/DDR5/LPDDR/GDDR/HBM (typical figures), SEC-DED ECC and Rowhammer, NAND pages and blocks, erase-before-write, the FTL, garbage collection, wear levelling and write amplification, why an SSD read takes microseconds.
11. Advanced — Many cores, one memory (`fnd-mem-10-coherence`): cache coherence (MESI in plain words), false sharing and padding to a line.
12. Professional — Memory ordering and atomics (`fnd-mem-11-ordering`): compilers and CPUs reorder; data races; atomics, acquire/release, fences; why locks work.
13. Professional — Memory performance in practice (`fnd-mem-12-practice`): bandwidth-bound vs compute-bound, prefetching, NUMA, allocators and fragmentation, measuring cache misses and memory bandwidth with real tools.

## Module `gpu` — "GPUs: thousands of small cores" (ids `fnd-gpu-N-…`)
1. Beginner — Why GPUs exist (`fnd-gpu-1-why-gpus`): a few big cores (latency) vs thousands of small ones (throughput); pixels as the first parallel job.
2. Beginner — The graphics pipeline (`fnd-gpu-2-graphics-pipeline`): vertices → triangles → rasterise → fragments/pixels; shaders as tiny programs run per item.
3. Intermediate — Kernels and threads (`fnd-gpu-3-kernels-threads`): write the work for one item; grid → blocks → threads; global index = block × size + thread; a whole CUDA host program (cudaMalloc → copy in → launch `(n+255)/256` blocks → sync → copy back) and the same kernel in Metal/WGSL/OpenCL as examples.
4. Intermediate — Warps and divergence (`fnd-gpu-4-warps-divergence`): 32 threads in lockstep (SIMT); an if that splits a warp runs both sides.
5. Intermediate — GPU memory (`fnd-gpu-5-gpu-memory`): registers, shared memory, global memory (HBM/GDDR), copying between CPU and GPU over PCIe, why transfers can dominate, unified/shared memory on integrated GPUs.
6. Advanced — Races, atomics and reductions (`fnd-gpu-11-races-reductions`): lost updates, what atomicAdd promises, tree reduction in shared memory (log2 n rounds), warp shuffles, and why code must not assume warp lockstep.
7. Advanced — Coalescing (`fnd-gpu-6-coalescing`): neighbouring threads reading neighbouring addresses → one wide transaction; strided access wastes bandwidth.
8. Advanced — Occupancy and latency hiding (`fnd-gpu-7-occupancy`): many warps resident so others run while one waits; registers/shared memory limit occupancy.
9. Advanced — Tiled matrix multiply (`fnd-gpu-8-tiled-matmul`): why naive matmul is memory-bound; tiles in shared memory reuse data; arithmetic intensity; shared-memory bank conflicts and padding.
10. Professional — GPUs for AI (`fnd-gpu-9-gpus-for-ai`): tensor cores, FP32/FP16/BF16/INT8 and 4-bit formats, the roofline model, why LLM decode is memory-bound and prefill compute-bound (link fnd-ai-8-inference).
11. Professional — Profiling and scaling (`fnd-gpu-10-profiling-scaling`): kernel timelines, overlapping copies and compute with streams, multi-GPU (data vs tensor parallelism, NVLink/interconnect as examples), what to measure first.

## Implementation notes

- Content: `src/content/foundations/{cpu,memory,gpu}.ts` (`cpuModule`, `memoryModule`, `gpuModule`), all with `part: "hardware"`.
- Widgets: `src/learn/widgets/cpuarch/` (`CPUARCH_WIDGETS`, keys `cpuarch-*`), `src/learn/widgets/memsys/`
  (`MEMSYS_WIDGETS`, keys `memsys-*`), `src/learn/widgets/gpu/` (`GPU_WIDGETS`, keys `gpu-*`).
- Lesson ids: `fnd-cpu-N-slug`, `fnd-mem-N-slug`, `fnd-gpu-N-slug`.
- Levels: set `level` on every lesson; see "Lesson levels" in FOUNDATIONS_AUTHORING.md.
