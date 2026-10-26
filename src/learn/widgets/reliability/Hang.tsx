"use client";

import React, { useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { Bars, Caption, Note, Pill, Readout, useInitialReport } from "./ui";
import { HANG, simHang } from "./sim";

/**
 * Workers piling up behind a hung call. A small web app has 20 workers. Checkout (4 requests a
 * second) calls a payment partner; from second 10 the partner stops answering. Each stuck checkout
 * keeps its worker until its timeout fires. Unrelated pages (/about) need a worker too.
 */

const OPTIONS: { id: string; label: string; value: number | null }[] = [
  { id: "none", label: "No timeout", value: null },
  { id: "1", label: "1 s", value: 1 },
  { id: "3", label: "3 s", value: 3 },
  { id: "5", label: "5 s", value: 5 },
  { id: "10", label: "10 s", value: 10 },
];

export interface HangState {
  timeout: number | null;
  fullSeconds: number;
  peak: number;
  neverFull: boolean;
}

export function Hang({ props, onChange }: WidgetProps<{ initial?: string }>) {
  const [pick, setPick] = useState(props.initial ?? "none");
  const opt = OPTIONS.find((o) => o.id === pick) ?? OPTIONS[0];
  const r = simHang(opt.value);
  const emit = (value: number | null) => {
    const x = simHang(value);
    onChange?.({ timeout: value, fullSeconds: x.fullSeconds, peak: x.peak, neverFull: x.fullSeconds === 0 } satisfies HangState);
  };
  useInitialReport(() => emit(opt.value));

  return (
    <div className="w-full max-w-2xl">
      <Caption>Timeout on the payment call</Caption>
      <div className="mt-2 flex flex-wrap gap-2">
        {OPTIONS.map((o) => (
          <Pill
            key={o.id}
            on={pick === o.id}
            onClick={() => {
              setPick(o.id);
              emit(o.value);
            }}
          >
            {o.label}
          </Pill>
        ))}
      </div>

      <p className="mb-1 mt-4 text-xs text-ink-2">Busy workers, second by second (the partner hangs from second {HANG.hungFrom}):</p>
      <Bars
        values={r.busy}
        max={HANG.pool}
        limit={HANG.pool}
        limitLabel={`${HANG.pool} workers`}
        tone={(v) => (v >= HANG.pool ? "bad" : v > HANG.pool * 0.6 ? "warn" : "ok")}
        height={130}
        label="Busy workers per second"
        axis={[
          ["0 s", 0.02],
          ["hang starts", HANG.hungFrom / HANG.seconds + 0.05],
          ["40 s", 0.96],
        ]}
      />

      <div className="mt-4 flex flex-wrap gap-2">
        <Readout label="Peak busy workers" value={r.peak} accent={r.peak < HANG.pool} />
        <Readout label="All workers stuck for" value={`${r.fullSeconds} s`} />
        <Readout label="/about page down for" value={`${r.aboutDown} s`} />
      </div>
      <div className="mt-3" aria-live="polite">
        {r.fullSeconds === 0 ? (
          <Note tone="good">
            At most {opt.value} s × {HANG.rate} checkouts a second = {(opt.value ?? 0) * HANG.rate} workers held by the stuck calls. The rest of the site never notices.
          </Note>
        ) : (
          <Note tone="bad">
            {opt.value === null
              ? "Stuck workers never come back, even if the partner recovers. Every worker ends up waiting, so the unrelated /about page is down too."
              : `${opt.value} s × ${HANG.rate} a second = ${opt.value * HANG.rate} workers pinned by stuck calls. With normal traffic on top, a pool of ${HANG.pool} is not enough. The timeout exists, but it is too long to save the pool.`}
          </Note>
        )}
      </div>
    </div>
  );
}

export function checkHang(state: unknown, goal: Record<string, unknown>) {
  const st = state as HangState | undefined;
  if (!st) return false;
  if (typeof goal.neverFull === "boolean" && st.neverFull !== goal.neverFull) return false;
  if (goal.timeout !== undefined && st.timeout !== goal.timeout) return false;
  return true;
}
