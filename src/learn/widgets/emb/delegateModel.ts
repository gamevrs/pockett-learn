/**
 * emb-delegate: a toy model of an ML runtime splitting one network between the CPU and an accelerator delegate.
 * Pure (no React), times in integer microseconds so every total is exact. All numbers are made up for illustration.
 */

export type Engine = "cpu" | "gpu" | "npu";
export type Quant = "float32" | "int8";
export type Act = "hardswish" | "relu6";

export interface OpDef {
  id: string;
  name: string;
  /** Time in µs on each engine; null = the delegate for that engine does not support the op. */
  cpu: number;
  gpu: number | null;
  npu: number | null;
}

/** The fixed ops of the network (the activation, op 5, is filled in by `opsFor`). */
const FIXED: Record<string, OpDef> = {
  c1: { id: "c1", name: "Conv 1", cpu: 4000, gpu: 1200, npu: 400 },
  c2: { id: "c2", name: "Conv 2", cpu: 6000, gpu: 1800, npu: 600 },
  p1: { id: "p1", name: "Pool 1", cpu: 800, gpu: 300, npu: 100 },
  c3: { id: "c3", name: "Conv 3", cpu: 6000, gpu: 1800, npu: 600 },
  c4: { id: "c4", name: "Conv 4", cpu: 4000, gpu: 1200, npu: 400 },
  p2: { id: "p2", name: "Pool 2", cpu: 600, gpu: 200, npu: 100 },
  fc: { id: "fc", name: "Dense", cpu: 2000, gpu: 800, npu: 200 },
  sm: { id: "sm", name: "Softmax", cpu: 400, gpu: 300, npu: 100 },
};

/** The two activation choices: the NPU delegate has no HardSwish kernel but does have ReLU6. */
export const ACTS: Record<Act, OpDef> = {
  hardswish: { id: "act", name: "HardSwish", cpu: 1000, gpu: 300, npu: null },
  relu6: { id: "act", name: "ReLU6", cpu: 500, gpu: 200, npu: 100 },
};

/** Cost of every border between two partitions (copy or cache maintenance, sync, waking the other engine), in µs. */
export const HANDOVER_US = 600;

export const ENGINE_NAMES: Record<Engine, string> = { cpu: "CPU", gpu: "GPU", npu: "NPU" };

export function opsFor(act: Act): OpDef[] {
  const f = FIXED;
  return [f.c1, f.c2, f.p1, f.c3, ACTS[act], f.c4, f.p2, f.fc, f.sm];
}

export interface PlacedOp {
  op: OpDef;
  /** The engine the op really runs on. */
  on: Engine;
  us: number;
  /** The delegate was asked to take it but could not. */
  fallback: boolean;
}

export interface Partition {
  on: Engine;
  /** 1-based op numbers, first to last. */
  from: number;
  to: number;
}

export interface Plan {
  placed: PlacedOp[];
  partitions: Partition[];
  handovers: number;
  opsUs: number;
  handoverUs: number;
  totalUs: number;
  totalMs: number;
  /** Ops that run on the chosen accelerator (0 for CPU only). */
  accelOps: number;
  /** Why the delegate took nothing at all, if so. */
  note: string | null;
}

/**
 * Where each op runs. CPU: everything. GPU delegate: every op in this toy (float or int8 model).
 * NPU delegate: only int8 models, and only the ops it has a kernel for. Everything else falls back to the CPU.
 */
export function plan(engine: Engine, quant: Quant, act: Act): Plan {
  const ops = opsFor(act);
  const npuBlocked = engine === "npu" && quant !== "int8";
  const placed: PlacedOp[] = ops.map((op) => {
    const accel = engine === "cpu" ? null : engine === "gpu" ? op.gpu : npuBlocked ? null : op.npu;
    if (engine !== "cpu" && accel !== null) return { op, on: engine, us: accel, fallback: false };
    return { op, on: "cpu", us: op.cpu, fallback: engine !== "cpu" };
  });
  const partitions: Partition[] = [];
  placed.forEach((p, i) => {
    const last = partitions[partitions.length - 1];
    if (last && last.on === p.on) last.to = i + 1;
    else partitions.push({ on: p.on, from: i + 1, to: i + 1 });
  });
  const handovers = partitions.length - 1;
  const opsUs = placed.reduce((s, p) => s + p.us, 0);
  const handoverUs = handovers * HANDOVER_US;
  const totalUs = opsUs + handoverUs;
  return {
    placed,
    partitions,
    handovers,
    opsUs,
    handoverUs,
    totalUs,
    totalMs: totalUs / 1000,
    accelOps: placed.filter((p) => p.on !== "cpu").length,
    note: npuBlocked ? "The NPU delegate takes int8 models only, so it took no ops." : null,
  };
}
