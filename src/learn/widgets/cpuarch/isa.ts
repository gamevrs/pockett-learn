// Pure logic for the ISA/privilege and hardware-security lessons. No UI. All costs are toy numbers.

// ───────────────────────────── system-call batching ─────────────────────────────

/** Toy cost of entering the kernel and coming back (switch modes, save and restore state), in cycles. */
export const SYSCALL_OVERHEAD = 300;
/** Toy cost of the real work: copying each byte into the kernel's buffer, in cycles. */
export const COPY_PER_BYTE = 0.5;

export interface SyscallRun {
  calls: number;
  overheadCycles: number;
  copyCycles: number;
  total: number;
  /** Share of all cycles spent getting into and out of the kernel, 0 to 1. */
  overheadShare: number;
}

/** Write `bytes` of output in calls of `batch` bytes each (the last call may be short). */
export function syscallRun(bytes: number, batch: number, overhead = SYSCALL_OVERHEAD, perByte = COPY_PER_BYTE): SyscallRun {
  const calls = bytes <= 0 ? 0 : Math.ceil(bytes / Math.max(1, batch));
  const overheadCycles = calls * overhead;
  const copyCycles = bytes * perByte;
  const total = overheadCycles + copyCycles;
  return { calls, overheadCycles, copyCycles, total, overheadShare: total ? overheadCycles / total : 0 };
}

// ───────────────────────────── mitigations ─────────────────────────────

export type ThreatId = "meltdown" | "spectre-v1" | "spectre-v2" | "cross-thread";
export type MitigationId = "kpti" | "pcid" | "retpoline" | "fence" | "nosmt";
export type WorkloadId = "server" | "compute";

export interface Threat {
  id: ThreatId;
  label: string;
}

export const THREATS: Threat[] = [
  { id: "meltdown", label: "Kernel data read from user mode (Meltdown)" },
  { id: "spectre-v1", label: "Bounds check bypassed while speculating (Spectre v1)" },
  { id: "spectre-v2", label: "Indirect branch steered by another program (Spectre v2)" },
  { id: "cross-thread", label: "Leaks between two SMT threads on one core" },
];

export interface Mitigation {
  id: MitigationId;
  label: string;
  closes: ThreatId[];
  /** Toy slowdown in percent, per workload. */
  cost: Record<WorkloadId, number>;
  /** Only does anything together with this mitigation. */
  needs?: MitigationId;
}

/**
 * Toy costs with the right shape: page-table isolation hurts code that enters the kernel often, and tagging TLB
 * entries (PCID) wins most of that back; turning SMT off costs throughput everywhere SMT was helping.
 */
export const MITIGATIONS: Mitigation[] = [
  { id: "kpti", label: "Kernel page-table isolation (KPTI)", closes: ["meltdown"], cost: { server: 12, compute: 1 } },
  { id: "pcid", label: "Tag TLB entries (PCID) so KPTI keeps them", closes: [], cost: { server: -8, compute: 0 }, needs: "kpti" },
  { id: "retpoline", label: "Retpolines or IBRS on indirect branches", closes: ["spectre-v2"], cost: { server: 3, compute: 1 } },
  { id: "fence", label: "Fence or mask the risky bounds checks", closes: ["spectre-v1"], cost: { server: 1, compute: 1 } },
  { id: "nosmt", label: "Turn SMT off", closes: ["cross-thread"], cost: { server: 20, compute: 15 } },
];

export interface MitigationRun {
  on: MitigationId[];
  closed: ThreatId[];
  open: ThreatId[];
  /** Total toy slowdown, percent. */
  overhead: number;
}

export function mitigationRun(on: MitigationId[], workload: WorkloadId): MitigationRun {
  const set = new Set(on);
  const active = MITIGATIONS.filter((m) => set.has(m.id) && (!m.needs || set.has(m.needs)));
  const closed = THREATS.map((t) => t.id).filter((id) => active.some((m) => m.closes.includes(id)));
  const open = THREATS.map((t) => t.id).filter((id) => !closed.includes(id));
  const overhead = Math.max(0, active.reduce((a, m) => a + m.cost[workload], 0));
  return { on: MITIGATIONS.map((m) => m.id).filter((id) => set.has(id)), closed, open, overhead };
}
