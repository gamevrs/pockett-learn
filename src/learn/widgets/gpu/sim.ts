/**
 * Pure, UI-free models for the GPU widgets. Every one is a toy on purpose: it keeps the few limits that teach the
 * idea and says (in the widget) which real details it leaves out. Numbers are round, typical orders of magnitude.
 */

// ───────────────────────── 1. the race: few fast workers vs many slow ones ─────────────────────────

export const CPU_WORKERS = 8;
export const CPU_SPEED = 4; // operations per tick, per worker
export const GPU_WORKERS = 1024;
export const GPU_SPEED = 1;

export interface RaceResult {
  cpu: number;
  gpu: number;
  winner: "cpu" | "gpu" | "tie";
}

/**
 * A job is `chain` steps that must happen one after another (each needs the last answer) plus `items` independent
 * pieces of work (one operation each). The chain can only use one worker; the items spread over all of them.
 */
export function race(chain: number, items: number): RaceResult {
  const cpu = chain / CPU_SPEED + items / (CPU_WORKERS * CPU_SPEED);
  const gpu = chain / GPU_SPEED + items / (GPU_WORKERS * GPU_SPEED);
  const winner = Math.abs(cpu - gpu) < 0.5 ? "tie" : cpu < gpu ? "cpu" : "gpu";
  return { cpu, gpu, winner };
}

// ───────────────────────── 3. grid / block / thread ─────────────────────────

export const blocksNeeded = (n: number, blockSize: number) => Math.ceil(n / blockSize);
export const globalIndex = (block: number, blockSize: number, thread: number) => block * blockSize + thread;

// ───────────────────────── 4. warps and divergence ─────────────────────────

export const WARP = 32;

export type Branch = "below" | "even" | "every8" | "uniform";

/** Which of the 32 lanes take the `if` side. */
export function takesIf(kind: Branch, lane: number, k: number): boolean {
  if (kind === "below") return lane < k;
  if (kind === "even") return lane % 2 === 0;
  if (kind === "every8") return lane % 8 === 0;
  return true; // uniform: the whole warp agrees
}

export interface WarpResult {
  lanes: boolean[];
  nIf: number;
  nElse: number;
  /** Cycles the warp spends on the branch: both sides run when the lanes disagree. */
  cycles: number;
  /** Share of lane-cycles that did useful work. */
  utilisation: number;
}

export function warp(kind: Branch, k: number, ifCycles: number, elseCycles: number): WarpResult {
  const lanes = Array.from({ length: WARP }, (_, i) => takesIf(kind, i, k));
  const nIf = lanes.filter(Boolean).length;
  const nElse = WARP - nIf;
  const runIf = nIf > 0;
  const runElse = nElse > 0;
  const cycles = (runIf ? ifCycles : 0) + (runElse ? elseCycles : 0);
  const useful = nIf * ifCycles + nElse * elseCycles;
  return { lanes, nIf, nElse, cycles, utilisation: useful / (WARP * cycles) };
}

// ───────────────────────── 5. host <-> device transfer ─────────────────────────

export interface TransferInput {
  /** Array length (4-byte floats). */
  elements: number;
  /** Arithmetic operations per element in one kernel. */
  opsPerElement: number;
  /** Kernels run on the same data while it stays on the GPU. */
  kernels: number;
  /** PCIe bandwidth, GB/s per direction. */
  pcie: number;
  /** GPU arithmetic rate, TFLOP/s (toy: a round number, below the headline peak). */
  gpuTflops: number;
  /** CPU arithmetic rate, GFLOP/s. */
  cpuGflops: number;
}

export interface TransferResult {
  bytes: number;
  copyIn: number;
  compute: number;
  copyOut: number;
  gpuTotal: number;
  cpuTotal: number;
  /** Share of the GPU path spent copying. */
  copyShare: number;
}

/** All times in seconds. */
export function transfer(i: TransferInput): TransferResult {
  const bytes = i.elements * 4;
  const copyIn = bytes / (i.pcie * 1e9);
  const copyOut = copyIn;
  const compute = (i.elements * i.opsPerElement * i.kernels) / (i.gpuTflops * 1e12);
  const gpuTotal = copyIn + compute + copyOut;
  const cpuTotal = (i.elements * i.opsPerElement * i.kernels) / (i.cpuGflops * 1e9);
  return { bytes, copyIn, compute, copyOut, gpuTotal, cpuTotal, copyShare: (copyIn + copyOut) / gpuTotal };
}

// ───────────────────────── 6. coalescing ─────────────────────────

export const SEGMENT_BYTES = 128;
export const WORD_BYTES = 4;
export const WORDS_PER_SEGMENT = SEGMENT_BYTES / WORD_BYTES;

export type Pattern = "contiguous" | "stride" | "reverse" | "random";

/** Deterministic pseudo-random numbers so the "random" pattern is the same every time. */
function lcg(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** Word index each of the 32 threads reads. */
export function addresses(pattern: Pattern, stride: number, offset: number): number[] {
  if (pattern === "contiguous") return Array.from({ length: WARP }, (_, t) => offset + t);
  if (pattern === "stride") return Array.from({ length: WARP }, (_, t) => offset + t * stride);
  if (pattern === "reverse") return Array.from({ length: WARP }, (_, t) => offset + (WARP - 1 - t));
  const rnd = lcg(7);
  return Array.from({ length: WARP }, () => Math.floor(rnd() * 2048));
}

export interface CoalesceResult {
  addrs: number[];
  /** Distinct 128-byte segments touched, ascending. */
  segments: number[];
  transactions: number;
  usefulBytes: number;
  movedBytes: number;
  efficiency: number;
}

export function coalesce(pattern: Pattern, stride: number, offset: number): CoalesceResult {
  const addrs = addresses(pattern, stride, offset);
  const segments = [...new Set(addrs.map((a) => Math.floor(a / WORDS_PER_SEGMENT)))].sort((a, b) => a - b);
  const usefulBytes = WARP * WORD_BYTES;
  const movedBytes = segments.length * SEGMENT_BYTES;
  return { addrs, segments, transactions: segments.length, usefulBytes, movedBytes, efficiency: usefulBytes / movedBytes };
}

// ───────────────────────── 7. occupancy ─────────────────────────

/** One SM of a typical modern NVIDIA-style GPU (round numbers). */
export const SM = { maxThreads: 2048, maxBlocks: 32, registers: 65536, sharedBytes: 98304, maxWarps: 64, schedulers: 4 };

export type Limiter = "threads" | "blocks" | "registers" | "shared memory";

export interface OccupancyResult {
  blocksPerSm: number;
  warpsPerSm: number;
  occupancy: number;
  limiter: Limiter;
  byThreads: number;
  byBlocks: number;
  byRegisters: number;
  byShared: number;
}

export function occupancy(blockSize: number, regsPerThread: number, sharedPerBlock: number): OccupancyResult {
  const byThreads = Math.floor(SM.maxThreads / blockSize);
  const byBlocks = SM.maxBlocks;
  const byRegisters = Math.floor(SM.registers / (regsPerThread * blockSize));
  const byShared = sharedPerBlock > 0 ? Math.floor(SM.sharedBytes / sharedPerBlock) : Infinity;
  const blocksPerSm = Math.min(byThreads, byBlocks, byRegisters, byShared);
  const order: [Limiter, number][] = [
    ["threads", byThreads],
    ["registers", byRegisters],
    ["shared memory", byShared],
    ["blocks", byBlocks],
  ];
  const limiter = order.find(([, v]) => v === blocksPerSm)![0];
  const warpsPerSm = blocksPerSm * Math.ceil(blockSize / WARP);
  return { blocksPerSm, warpsPerSm, occupancy: warpsPerSm / SM.maxWarps, limiter, byThreads, byBlocks, byRegisters, byShared };
}

/** Warps each scheduler needs ready so it always has something to issue while others wait on memory. */
export const warpsToHide = (latencyCycles: number, mathCyclesPerLoad: number) => 1 + Math.ceil(latencyCycles / mathCyclesPerLoad);

// ───────────────────────── 8. tiled matrix multiply ─────────────────────────

export interface MatmulCounts {
  flops: number;
  loads: number;
  bytes: number;
  intensity: number;
}

/** Square N x N matmul, tile size T (T = 1 is the naive kernel). Counts 4-byte global loads of A and B; ignores the C write and caches. */
export function matmul(n: number, tile: number): MatmulCounts {
  const flops = 2 * n * n * n;
  const loads = (2 * n * n * n) / tile;
  const bytes = loads * 4;
  return { flops, loads, bytes, intensity: flops / bytes };
}

// ───────────────────────── 9. roofline and number formats ─────────────────────────

export const attainable = (intensity: number, peakTflops: number, bwTBs: number) => Math.min(peakTflops, intensity * bwTBs);
export const ridge = (peakTflops: number, bwTBs: number) => peakTflops / bwTBs;

export interface Format {
  id: string;
  label: string;
  bits: number;
  sign: number;
  exp: number;
  man: number;
  /** Largest finite value, as text. */
  max: string;
}

export const FORMATS: Format[] = [
  { id: "fp32", label: "FP32", bits: 32, sign: 1, exp: 8, man: 23, max: "3.4 × 10^38" },
  { id: "fp16", label: "FP16", bits: 16, sign: 1, exp: 5, man: 10, max: "65,504" },
  { id: "bf16", label: "BF16", bits: 16, sign: 1, exp: 8, man: 7, max: "3.4 × 10^38" },
  { id: "fp8", label: "FP8 (E4M3)", bits: 8, sign: 1, exp: 4, man: 3, max: "448" },
  { id: "int8", label: "INT8", bits: 8, sign: 0, exp: 0, man: 0, max: "127" },
];

/** Upper bound on decode speed: every token must stream all the weights from memory once. */
export const decodeTokensPerSec = (paramsBillions: number, bitsPerParam: number, bwTBs: number) => (bwTBs * 1e12) / ((paramsBillions * 1e9 * bitsPerParam) / 8);

// ───────────────────────── 10. streams ─────────────────────────

export interface Slice {
  lane: "copy in" | "compute" | "copy out";
  chunk: number;
  start: number;
  end: number;
}

/**
 * Split the job into `chunks`. Each chunk goes copy in -> compute -> copy out. The copy engines and the compute units are
 * separate hardware, so with several chunks (streams) the stages of different chunks overlap. One chunk = fully serial.
 */
export function streams(copyIn: number, compute: number, copyOut: number, chunks: number): { slices: Slice[]; total: number; serial: number } {
  const a = copyIn / chunks;
  const b = compute / chunks;
  const c = copyOut / chunks;
  const slices: Slice[] = [];
  let freeIn = 0;
  let freeCompute = 0;
  let freeOut = 0;
  for (let k = 0; k < chunks; k++) {
    const inStart = freeIn;
    const inEnd = inStart + a;
    freeIn = inEnd;
    const cStart = Math.max(inEnd, freeCompute);
    const cEnd = cStart + b;
    freeCompute = cEnd;
    const oStart = Math.max(cEnd, freeOut);
    const oEnd = oStart + c;
    freeOut = oEnd;
    slices.push({ lane: "copy in", chunk: k, start: inStart, end: inEnd }, { lane: "compute", chunk: k, start: cStart, end: cEnd }, { lane: "copy out", chunk: k, start: oStart, end: oEnd });
  }
  return { slices, total: freeOut, serial: copyIn + compute + copyOut };
}
