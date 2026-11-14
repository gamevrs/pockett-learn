"use client";

import React, { useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { Note, Readout, Seg } from "../computer/ui";
import { COPY_PER_BYTE, SYSCALL_OVERHEAD, syscallRun } from "./isa";

export interface SyscallProps {
  /** Bytes of output the program writes in total. Default 65536 (64 KiB). */
  bytes?: number;
  /** Bytes per write() call on offer. Default 1, 16, 256, 1024, 4096. */
  batches?: number[];
  /** Starting batch size. Default the first one. */
  batch?: number;
}

export interface SyscallState {
  batch: number;
  calls: number;
  total: number;
  overheadShare: number;
}

const fmt = (n: number) => Math.round(n).toLocaleString("en-US");
const size = (b: number) => (b >= 1024 ? `${b / 1024} KiB` : `${b} B`);

/** A program writes its output with write() system calls. Each call pays a fixed toll to enter and leave the kernel. */
export function Syscall({ props, onChange }: WidgetProps<SyscallProps>) {
  const bytes = props.bytes ?? 65536;
  const batches = props.batches ?? [1, 16, 256, 1024, 4096];
  const [batch, setBatch] = useState(props.batch ?? batches[0]);
  const r = syscallRun(bytes, batch);
  const pick = (b: number) => {
    setBatch(b);
    const x = syscallRun(bytes, b);
    onChange?.({ batch: b, calls: x.calls, total: x.total, overheadShare: x.overheadShare } satisfies SyscallState);
  };
  const pct = Math.round(r.overheadShare * 100);
  // A strip of the first few calls: user code, then a trip into the kernel and back.
  const shown = Math.min(r.calls, 6);

  return (
    <div className="w-full">
      <div className="mb-3 flex justify-center">
        <Seg label="Bytes per write() call" value={batch} onChange={pick} options={batches.map((b) => ({ value: b, label: size(b) }))} />
      </div>
      <div className="rounded-xl border border-line bg-surface-2 p-3" role="img" aria-label={`${fmt(r.calls)} system calls. ${pct} percent of the cycles go on entering and leaving the kernel.`}>
        <div className="flex items-center gap-2 text-xs text-ink-2">
          <span className="w-14 shrink-0 font-mono">user</span>
          <div className="flex min-w-0 flex-1 gap-1">
            {Array.from({ length: shown }, (_, i) => (
              <span key={i} className="h-5 flex-1 rounded bg-tint" />
            ))}
            {r.calls > shown && <span className="self-center font-mono">…</span>}
          </div>
        </div>
        <div className="mt-1 flex items-center gap-2 text-xs text-ink-2">
          <span className="w-14 shrink-0 font-mono">kernel</span>
          <div className="flex min-w-0 flex-1 gap-1">
            {Array.from({ length: shown }, (_, i) => (
              <span key={i} className="h-5 flex-1 rounded border border-[var(--brand)] bg-surface" />
            ))}
            {r.calls > shown && <span className="self-center font-mono">…</span>}
          </div>
        </div>
        <p className="mt-2 text-center text-xs text-ink-3">Each write() switches to kernel mode and back.</p>
        <div className="mt-3 h-4 w-full overflow-hidden rounded-full border border-line bg-surface" aria-hidden>
          <div className="h-full bg-[var(--brand)]" style={{ width: `${Math.max(1, pct)}%` }} />
        </div>
        <p className="mt-1 text-center text-xs text-ink-2">Filled: cycles spent entering and leaving the kernel</p>
      </div>
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        <Readout label="write() calls" value={fmt(r.calls)} />
        <Readout label="Total cycles" value={fmt(r.total)} accent />
        <Readout label="Kernel entry and exit" value={`${pct}%`} />
      </div>
      <div className="mt-3">
        <Note>
          Toy model: {fmt(bytes)} bytes of output, {SYSCALL_OVERHEAD} cycles to enter and leave the kernel per call, {COPY_PER_BYTE} cycles to copy each byte. Real costs depend on the chip, the OS and its security settings.
        </Note>
      </div>
    </div>
  );
}

/** goal: { maxOverheadShare: 0.2 } and/or { maxCalls }. */
export function checkSyscall(state: unknown, goal: Record<string, unknown>) {
  const s = state as SyscallState | undefined;
  if (!s) return false;
  if (typeof goal.maxOverheadShare === "number" && s.overheadShare > goal.maxOverheadShare) return false;
  if (typeof goal.maxCalls === "number" && s.calls > goal.maxCalls) return false;
  return true;
}
