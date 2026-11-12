"use client";

import React, { useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { streams } from "./sim";
import { Caption, Note, Readout, Seg, BLUE, ORANGE } from "./ui";

export interface StreamsProps {
  /** Starting chunk count (1 = no overlap; default 1). */
  chunks?: number;
  /** Starting job shape: "balanced", "copy" (copy-heavy) or "compute". */
  job?: "balanced" | "copy" | "compute";
}

export interface StreamsState {
  job: string;
  chunks: number;
  total: number;
  serial: number;
  /** Time saved against the one-chunk timeline, percent. */
  savedPercent: number;
}

const JOBS = {
  balanced: { label: "Balanced", a: 10, b: 10, c: 10 },
  copy: { label: "Copy-heavy", a: 20, b: 10, c: 20 },
  compute: { label: "Compute-heavy", a: 5, b: 30, c: 5 },
};
type JobId = keyof typeof JOBS;

const LANES = ["copy in", "compute", "copy out"] as const;

/** A timeline of copy-in, compute and copy-out for one job, cut into chunks that overlap when copies and kernels run on separate engines. */
export function Streams({ props, onChange }: WidgetProps<StreamsProps>) {
  const [job, setJob] = useState<JobId>(props.job ?? "balanced");
  const [chunks, setChunks] = useState(props.chunks ?? 1);

  const j = JOBS[job];
  const r = streams(j.a, j.b, j.c, chunks);
  const upd = (jb: JobId, c: number) => {
    setJob(jb);
    setChunks(c);
    const q = JOBS[jb];
    const x = streams(q.a, q.b, q.c, c);
    onChange?.({ job: jb, chunks: c, total: x.total, serial: x.serial, savedPercent: Math.round((1 - x.total / x.serial) * 100) } satisfies StreamsState);
  };

  const saved = Math.round((1 - r.total / r.serial) * 100);
  const scale = 100 / r.serial; // percent of the serial length per ms: the axis always spans the one-chunk timeline

  return (
    <div className="w-full" data-widget>
      <div className="mb-3 flex flex-wrap items-end gap-x-6 gap-y-3">
        <div>
          <Caption className="mb-1">Job shape</Caption>
          <Seg label="Job shape" value={job} onChange={(v) => upd(v, chunks)} options={(Object.keys(JOBS) as JobId[]).map((k) => ({ value: k, label: JOBS[k].label }))} />
        </div>
        <div>
          <Caption className="mb-1">Chunks (streams)</Caption>
          <Seg label="Chunks" value={chunks} onChange={(v) => upd(job, v)} options={[1, 2, 4, 8].map((v) => ({ value: v, label: String(v) }))} />
        </div>
      </div>

      <div className="space-y-1.5 rounded-xl border border-line bg-surface p-2.5" role="img" aria-label={`Timeline: ${chunks} chunk${chunks === 1 ? "" : "s"}, total ${+r.total.toFixed(1)} ms against ${r.serial} ms done one stage after another`}>
        {LANES.map((lane) => (
          <div key={lane}>
            <p className="mb-0.5 text-[11px] text-ink-3">{lane}</p>
            <div className="relative h-6 overflow-hidden rounded-md bg-surface-2">
              {r.slices
                .filter((s) => s.lane === lane)
                .map((s) => (
                  <span
                    key={s.chunk}
                    className="absolute top-0.5 bottom-0.5 rounded-[4px]"
                    style={{ left: `${s.start * scale}%`, width: `${(s.end - s.start) * scale}%`, background: lane === "compute" ? BLUE : ORANGE, opacity: s.chunk % 2 === 0 ? 1 : 0.65, boxShadow: "0 0 0 1px var(--surface)" }}
                  />
                ))}
            </div>
          </div>
        ))}
        <div className="relative h-3" aria-hidden>
          <span className="absolute top-0 h-3 border-l-2 border-[var(--ink)]" style={{ left: `${Math.min(100, r.total * scale)}%` }} />
        </div>
        <p className="text-right text-xs text-ink-3">The line marks the finish. The full width is the one-chunk time ({r.serial} ms).</p>
      </div>

      <div className="mt-3">
        <Note tone={chunks > 1 ? "accent" : "plain"}>
          {chunks === 1 ? (
            <>
              <b>No overlap.</b> Copy in ({j.a} ms), compute ({j.b} ms) and copy out ({j.c} ms) happen one after another: {r.serial} ms. The GPU&apos;s copy engines sit idle while the kernels run, and the kernels idle while the copies run.
            </>
          ) : (
            <>
              <b>Overlap.</b> While chunk 1 computes, chunk 2 is already copying in. Total {+r.total.toFixed(1)} ms instead of {r.serial} ms: {saved}% saved. The longest stage sets the floor.
            </>
          )}
        </Note>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        <Readout label="Total" value={`${+r.total.toFixed(1)} ms`} accent />
        <Readout label="Saved" value={`${saved}%`} />
      </div>
      <p className="mt-2 text-xs text-ink-3">Toy timeline: assumes one copy engine each way and separate compute units, equal chunks and no launch overhead. Real overlap needs pinned host memory and independent streams.</p>
    </div>
  );
}

/** goal: { minSavedPercent?: number, chunks?: number, job?: string }. */
export function checkStreams(state: unknown, goal: Record<string, unknown>) {
  const s = state as StreamsState | undefined;
  if (!s) return false;
  if (typeof goal.minSavedPercent === "number" && s.savedPercent < goal.minSavedPercent) return false;
  if (typeof goal.chunks === "number" && s.chunks !== goal.chunks) return false;
  if (typeof goal.job === "string" && s.job !== goal.job) return false;
  return true;
}
