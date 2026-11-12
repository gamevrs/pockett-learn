"use client";

import React, { useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { transfer, type TransferInput } from "./sim";
import { Caption, Note, Readout, Seg, Slider, BLUE, ORANGE, fmtTime } from "./ui";

export interface TransferProps {
  /** Starting data size in MB (default 256). */
  mb?: number;
  opsPerElement?: number;
  kernels?: number;
  pcie?: number;
}

export interface TransferState {
  mb: number;
  opsPerElement: number;
  kernels: number;
  pcie: number;
  /** Percent of the GPU path spent copying. */
  copyPercent: number;
  /** The whole GPU path (copy in + kernel + copy out) beats doing it on the CPU. */
  gpuWins: boolean;
  /** Copying takes more than half the GPU path. */
  copyDominates: boolean;
}

const GPU_TFLOPS = 20; // toy sustained rate for simple float kernels, well under any headline peak
const CPU_GFLOPS = 200; // toy rate for a multi-core CPU on the same arithmetic

/** Copy the array over PCIe, run the kernel, copy it back: when does the copy cost more than the maths? */
export function Transfer({ props, onChange }: WidgetProps<TransferProps>) {
  const [mb, setMb] = useState(props.mb ?? 256);
  const [ops, setOps] = useState(props.opsPerElement ?? 1);
  const [kernels, setKernels] = useState(props.kernels ?? 1);
  const [pcie, setPcie] = useState(props.pcie ?? 32);

  const make = (m: number, o: number, k: number, p: number): TransferInput => ({ elements: (m * 1e6) / 4, opsPerElement: o, kernels: k, pcie: p, gpuTflops: GPU_TFLOPS, cpuGflops: CPU_GFLOPS });
  const r = transfer(make(mb, ops, kernels, pcie));

  const upd = (m: number, o: number, k: number, p: number) => {
    setMb(m);
    setOps(o);
    setKernels(k);
    setPcie(p);
    const x = transfer(make(m, o, k, p));
    onChange?.({ mb: m, opsPerElement: o, kernels: k, pcie: p, copyPercent: Math.round(x.copyShare * 100), gpuWins: x.gpuTotal < x.cpuTotal, copyDominates: x.copyShare > 0.5 } satisfies TransferState);
  };

  const max = Math.max(r.gpuTotal, r.cpuTotal);
  const w = (t: number) => `${(t / max) * 100}%`;
  const pct = Math.round(r.copyShare * 100);

  return (
    <div className="w-full" data-widget>
      <div className="mb-3 space-y-3">
        <div>
          <Caption className="mb-1">Array size</Caption>
          <Seg label="Array size" value={mb} onChange={(v) => upd(v, ops, kernels, pcie)} options={[{ value: 1, label: "1 MB" }, { value: 64, label: "64 MB" }, { value: 256, label: "256 MB" }, { value: 1024, label: "1 GB" }]} />
        </div>
        <div>
          <Caption className="mb-1">Maths per number in one kernel</Caption>
          <Seg label="Operations per element" value={ops} onChange={(v) => upd(mb, v, kernels, pcie)} options={[{ value: 1, label: "1 op" }, { value: 10, label: "10" }, { value: 100, label: "100" }, { value: 1000, label: "1,000" }]} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Slider label="Kernels run on the data once it is on the GPU" value={kernels} min={1} max={100} onChange={(v) => upd(mb, ops, v, pcie)} />
          <div>
            <Caption className="mb-1">PCIe link (GB/s each way, theoretical)</Caption>
            <Seg label="PCIe bandwidth" value={pcie} onChange={(v) => upd(mb, ops, kernels, v)} options={[{ value: 16, label: "16" }, { value: 32, label: "32" }, { value: 64, label: "64" }]} />
          </div>
        </div>
      </div>

      <div className="space-y-2 rounded-xl border border-line bg-surface p-3">
        <div>
          <p className="mb-1 flex justify-between text-xs text-ink-3">
            <span className="font-semibold text-ink">GPU path</span>
            <span className="font-mono tabular-nums text-ink">{fmtTime(r.gpuTotal)}</span>
          </p>
          <div className="flex h-5 overflow-hidden rounded-md bg-[var(--line-strong)]" style={{ width: w(r.gpuTotal) }} role="img" aria-label={`GPU path ${fmtTime(r.gpuTotal)}: copy in ${fmtTime(r.copyIn)}, kernels ${fmtTime(r.compute)}, copy out ${fmtTime(r.copyOut)}`}>
            <span style={{ width: `${(r.copyIn / r.gpuTotal) * 100}%`, background: ORANGE }} />
            <span style={{ width: `${(r.compute / r.gpuTotal) * 100}%`, background: BLUE }} />
            <span style={{ width: `${(r.copyOut / r.gpuTotal) * 100}%`, background: ORANGE, opacity: 0.7 }} />
          </div>
          <p className="mt-1 text-xs text-ink-3">
            <span style={{ color: ORANGE }}>■</span> copy in {fmtTime(r.copyIn)} · <span style={{ color: BLUE }}>■</span> kernels {fmtTime(r.compute)} · <span style={{ color: ORANGE }}>■</span> copy out {fmtTime(r.copyOut)}
          </p>
        </div>
        <div>
          <p className="mb-1 flex justify-between text-xs text-ink-3">
            <span className="font-semibold text-ink">Just use the CPU</span>
            <span className="font-mono tabular-nums text-ink">{fmtTime(r.cpuTotal)}</span>
          </p>
          <div className="h-5 overflow-hidden rounded-md bg-[var(--line-strong)]" style={{ width: w(r.cpuTotal) }} role="img" aria-label={`CPU only ${fmtTime(r.cpuTotal)}`}>
            <span className="block h-full w-full" style={{ background: "var(--ink-3)" }} />
          </div>
        </div>
      </div>

      <div className="mt-3">
        <Note tone={pct > 50 ? "accent" : "plain"}>
          {pct > 50 ? (
            <>
              <b>The copy dominates:</b> {pct}% of the GPU path is spent on the PCIe link, not on maths. {r.gpuTotal > r.cpuTotal ? "The CPU would have finished first." : "The GPU still wins, but the link is the bottleneck."}
            </>
          ) : (
            <>
              The kernels do most of the work ({100 - pct}% of the time), so the copy is worth paying for. {r.gpuTotal < r.cpuTotal ? "The GPU path beats the CPU." : "The CPU still wins on this little maths."}
            </>
          )}
        </Note>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        <Readout label="Bytes moved" value={`${((r.bytes * 2) / 1e6).toLocaleString("en-US", { maximumFractionDigits: 0 })} MB`} />
        <Readout label="Copy share" value={`${pct}%`} accent />
      </div>
      <p className="mt-2 text-xs text-ink-3">
        Toy rates: GPU {GPU_TFLOPS} TFLOP/s on simple float maths, CPU {CPU_GFLOPS} GFLOP/s. Real kernels also wait on GPU memory; this model ignores that and any launch overhead.
      </p>
    </div>
  );
}

/** goal: { copyDominates?: boolean, gpuWins?: boolean, maxCopyPercent?: number, minCopyPercent?: number }. */
export function checkTransfer(state: unknown, goal: Record<string, unknown>) {
  const s = state as TransferState | undefined;
  if (!s) return false;
  if (typeof goal.copyDominates === "boolean" && s.copyDominates !== goal.copyDominates) return false;
  if (typeof goal.gpuWins === "boolean" && s.gpuWins !== goal.gpuWins) return false;
  if (typeof goal.maxCopyPercent === "number" && s.copyPercent > goal.maxCopyPercent) return false;
  if (typeof goal.minCopyPercent === "number" && s.copyPercent < goal.minCopyPercent) return false;
  return true;
}
