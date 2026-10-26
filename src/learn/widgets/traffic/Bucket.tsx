"use client";

import React, { useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { Bars, Caption, Note, Pill, Readout, Segmented, Slider, useInitialReport } from "../reliability/ui";
import { bucketTimes, bucketTrace, HORIZON, r1, type BucketPattern } from "./sim";

/**
 * A bucket you can tune. Token bucket: tokens refill at a steady rate up to a capacity, and every
 * request spends one. Leaky bucket: requests fill the bucket and it drains at a steady rate, so what
 * leaves is smooth. The top chart is the bucket's level; the bottom one is what reaches the backend.
 */

type Kind = "token" | "leaky";

const PATTERNS: { id: BucketPattern; label: string }[] = [
  { id: "calm", label: "Calm" },
  { id: "burst", label: "One big burst" },
  { id: "steady-high", label: "Steady, too fast" },
  { id: "bursty", label: "Three bursts" },
];

const W = 360;
const H = 118;
const PAD = 14;
const X = (t: number) => PAD + (t / HORIZON) * (W - PAD * 2);

export interface BucketState {
  kind: Kind;
  capacity: number;
  rate: number;
  pattern: BucketPattern;
  allowed: number;
  blocked: number;
  peakBackend: number;
}

export function Bucket({ props, onChange }: WidgetProps<{ kind?: Kind; kinds?: Kind[]; capacity?: number; rate?: number; pattern?: BucketPattern }>) {
  const [kind, setKind] = useState<Kind>(props.kind ?? "token");
  const [capacity, setCapacity] = useState(props.capacity ?? 6);
  const [rate, setRate] = useState(props.rate ?? 1);
  const [pattern, setPattern] = useState<BucketPattern>(props.pattern ?? "burst");
  const kinds = props.kinds ?? (["token", "leaky"] as Kind[]);

  const tr = bucketTrace(kind, capacity, rate, bucketTimes(pattern));
  const pts = tr.level.map((v, i) => `${r1(X(i / 10))},${r1(88 - (v / capacity) * 66)}`);
  const area = `${X(0)},88 ${pts.join(" ")} ${X(HORIZON)},88`;

  const emit = (k: Kind, c: number, r: number, p: BucketPattern) => {
    const x = bucketTrace(k, c, r, bucketTimes(p));
    onChange?.({ kind: k, capacity: c, rate: r, pattern: p, allowed: x.allowed, blocked: x.blocked, peakBackend: x.peakBackend } satisfies BucketState);
  };

  useInitialReport(() => emit(kind, capacity, rate, pattern));

  return (
    <div className="w-full max-w-2xl">
      {kinds.length > 1 && (
        <Segmented
          label="Bucket type"
          value={kind}
          options={[
            { id: "token", label: "Token bucket" },
            { id: "leaky", label: "Leaky bucket" },
          ]}
          onChange={(k) => {
            setKind(k);
            emit(k, capacity, rate, pattern);
          }}
        />
      )}
      <div className="mt-3 grid gap-3 min-[520px]:grid-cols-2">
        <Slider
          label={kind === "token" ? "Bucket size (burst allowed)" : "Bucket size (queue length)"}
          value={capacity}
          min={1}
          max={15}
          onChange={(v) => {
            setCapacity(v);
            emit(kind, v, rate, pattern);
          }}
        />
        <Slider
          label={kind === "token" ? "Refill (tokens per second)" : "Drain (requests per second)"}
          value={rate}
          min={0.5}
          max={5}
          step={0.5}
          onChange={(v) => {
            setRate(v);
            emit(kind, capacity, v, pattern);
          }}
        />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {PATTERNS.map((p) => (
          <Pill
            key={p.id}
            on={pattern === p.id}
            onClick={() => {
              setPattern(p.id);
              emit(kind, capacity, rate, p.id);
            }}
          >
            {p.label}
          </Pill>
        ))}
      </div>

      <Caption className="mt-4">{kind === "token" ? "Tokens in the bucket" : "Requests in the bucket"}</Caption>
      <div className="mt-1 rounded-xl border border-line bg-surface p-2">
        <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto w-full max-w-[480px]" role="img" aria-label={`${tr.allowed} requests accepted, ${tr.blocked} refused`}>
          <line x1={PAD} x2={W - PAD} y1={22} y2={22} stroke="var(--ink-3)" strokeDasharray="3 3" />
          <text x={W - PAD} y={16} textAnchor="end" fontSize="10" fill="var(--ink-2)" fontFamily="var(--font-mono), monospace">full: {capacity}</text>
          <polygon points={area} fill="var(--brand)" opacity="0.2" />
          <polyline points={pts.join(" ")} fill="none" stroke="var(--brand)" strokeWidth="2" strokeLinejoin="round" />
          <line x1={PAD} x2={W - PAD} y1={88} y2={88} stroke="var(--line-strong)" />
          {tr.verdicts.map((v, i) => (
            <rect key={i} x={X(v.t) - 1.2} y={92} width={2.4} height={12} rx={1} fill={v.allowed ? "var(--primary)" : "var(--bad)"} stroke={v.allowed ? "var(--brand)" : "none"} strokeWidth="0.6" />
          ))}
          {[0, 10, 20, 30].map((s) => (
            <text key={s} x={X(s)} y={H - 2} textAnchor={s === 30 ? "end" : s === 0 ? "start" : "middle"} fontSize="10" fill="var(--ink-3)" fontFamily="var(--font-mono), monospace">
              {s}s
            </text>
          ))}
        </svg>
        <p className="px-1 text-[11px] text-ink-2">Marks under the line are requests: green accepted, red refused.</p>
      </div>

      <Caption className="mt-3">Requests reaching your backend, per second</Caption>
      <div className="mt-1">
        <Bars values={tr.backend} limit={rate} limitLabel={`${r1(rate)}/s`} max={Math.max(6, tr.peakBackend)} tone={(v) => (v > rate + 0.01 ? "warn" : "ok")} height={86} label="Requests reaching the backend per second" axis={[["0 s", 0.03], ["15 s", 0.5], ["30 s", 0.96]]} />
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Readout label="Accepted" value={tr.allowed} />
        <Readout label="Refused" value={tr.blocked} />
        <Readout label="Backend peak" value={`${tr.peakBackend}/s`} accent={tr.peakBackend <= Math.ceil(rate)} />
      </div>
      <div className="mt-3" aria-live="polite">
        {kind === "token" ? (
          <Note>A token bucket lets a burst through (up to the bucket size) and then settles to the refill rate. The backend sees the burst.</Note>
        ) : (
          <Note>A leaky bucket takes bursts into the queue and releases them at the drain rate, so the backend sees a flat line. The price: queued requests wait.</Note>
        )}
      </div>
    </div>
  );
}

export function checkBucket(state: unknown, goal: Record<string, unknown>) {
  const st = state as BucketState | undefined;
  if (!st) return false;
  if (goal.kind !== undefined && st.kind !== goal.kind) return false;
  if (goal.pattern !== undefined && st.pattern !== goal.pattern) return false;
  if (typeof goal.maxBlocked === "number" && st.blocked > goal.maxBlocked) return false;
  if (typeof goal.minBlocked === "number" && st.blocked < goal.minBlocked) return false;
  if (typeof goal.maxPeak === "number" && st.peakBackend > goal.maxPeak) return false;
  if (typeof goal.minPeak === "number" && st.peakBackend < goal.minPeak) return false;
  return true;
}
