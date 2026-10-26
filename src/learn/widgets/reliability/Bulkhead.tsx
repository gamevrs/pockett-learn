"use client";

import React, { useState } from "react";
import { Pause, Play, RotateCcw, StepForward } from "lucide-react";
import type { WidgetProps } from "@/learn/widget";
import { Caption, Note, Pill, Readout, Segmented, useInitialReport, useTicker } from "./ui";
import { BULK, bulkStep, newBulk, type BulkState, type Slot } from "./sim";

/**
 * A server with 12 worker threads serves two features: payments (quick) and recommendations (which
 * can turn slow). In one shared pool, a slow feature soaks up every thread. In separate pools it can
 * only soak up its own.
 */

export interface BulkheadState {
  split: boolean;
  slow: boolean;
  t: number;
  payRate: number;
  recRate: number;
}

const rate = (s: { pay: number; rec: number }, r: { pay: number; rec: number }, who: "pay" | "rec") => (s[who] + r[who] === 0 ? 1 : s[who] / (s[who] + r[who]));

function Cell({ slot }: { slot: Slot | null }) {
  return (
    <div
      className={`grid h-9 place-items-center rounded-md border text-[11px] font-semibold ${
        slot === null ? "border-dashed border-[var(--line-strong)] text-transparent" : slot.who === "pay" ? "border-[var(--brand)] bg-primary text-primary-ink" : "border-[#d99a2b] bg-[#e8b04f] text-[#2a1c00]"
      }`}
    >
      {slot ? (slot.who === "pay" ? "Pay" : "Rec") : "·"}
    </div>
  );
}

export function Bulkhead({ props, onChange }: WidgetProps<{ split?: boolean; slow?: boolean }>) {
  const [split, setSplit] = useState(props.split ?? false);
  const [slow, setSlow] = useState(props.slow ?? false);
  const [s, setS] = useState<BulkState>(newBulk);
  const [playing, setPlaying] = useState(false);

  const report = (n: BulkState, sp: boolean, sl: boolean) =>
    onChange?.({ split: sp, slow: sl, t: n.t, payRate: rate(n.served, n.rejected, "pay"), recRate: rate(n.served, n.rejected, "rec") } satisfies BulkheadState);
  const step = () => {
    const n = bulkStep(s, slow, split);
    setS(n);
    report(n, split, slow);
  };
  useTicker(playing, 650, step);
  useInitialReport(() => report(s, split, slow));

  const restart = (sp: boolean, sl: boolean) => {
    setPlaying(false);
    setS(newBulk());
    setSplit(sp);
    setSlow(sl);
    report(newBulk(), sp, sl);
  };
  const pay = rate(s.served, s.rejected, "pay");
  const rec = rate(s.served, s.rejected, "rec");

  return (
    <div className="w-full max-w-2xl">
      <div className="flex flex-wrap items-center gap-2">
        <Segmented
          label="Thread pools"
          value={split ? "split" : "shared"}
          options={[
            { id: "shared", label: "One shared pool" },
            { id: "split", label: "Separate pools" },
          ]}
          onChange={(v) => restart(v === "split", slow)}
        />
        <Pill on={slow} onClick={() => restart(split, !slow)} label="Recommendations is slow">
          Recommendations is slow
        </Pill>
      </div>

      <div className="mt-3 rounded-xl border border-line bg-surface p-3">
        {split ? (
          <div className="grid gap-3 min-[520px]:grid-cols-[2fr_1fr]">
            <div>
              <Caption>Payments pool · {BULK.bulkhead.pay} threads</Caption>
              <div className="mt-1.5 grid grid-cols-4 gap-1.5">
                {s.slots.slice(0, BULK.bulkhead.pay).map((x, i) => (
                  <Cell key={i} slot={x} />
                ))}
              </div>
            </div>
            <div>
              <Caption>Recommendations · {BULK.bulkhead.rec}</Caption>
              <div className="mt-1.5 grid grid-cols-4 gap-1.5 min-[520px]:grid-cols-2">
                {s.slots.slice(BULK.bulkhead.pay).map((x, i) => (
                  <Cell key={i} slot={x} />
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div>
            <Caption>Shared pool · {BULK.pool} threads</Caption>
            <div className="mt-1.5 grid grid-cols-6 gap-1.5">
              {s.slots.map((x, i) => (
                <Cell key={i} slot={x} />
              ))}
            </div>
          </div>
        )}
        <p className="mt-2 text-xs text-ink-2">
          Every second, {BULK.perTick} payment and {BULK.perTick} recommendation requests arrive. A payment holds a thread for 1 s; a recommendation for {slow ? `${BULK.slowTicks} s (slow)` : "1 s"}. No free thread means the request is turned away.
        </p>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Pill on={playing} onClick={() => setPlaying(!playing)}>
          {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />} {playing ? "Pause" : "Run"}
        </Pill>
        <Pill onClick={step} disabled={playing} label="Step one second">
          <StepForward className="h-4 w-4" /> Step
        </Pill>
        <Pill onClick={() => restart(split, slow)} label="Reset">
          <RotateCcw className="h-4 w-4" />
        </Pill>
        <Readout label="Time" value={`${s.t} s`} />
      </div>

      <div className="mt-3 grid gap-2 min-[480px]:grid-cols-2">
        <div className="rounded-xl border border-line bg-surface-2 p-2.5">
          <Caption>Payments</Caption>
          <p className="mt-1 text-sm text-ink">
            <span className="font-mono text-base font-semibold tabular-nums">{Math.round(pay * 100)}%</span> served · {s.rejected.pay} turned away
          </p>
        </div>
        <div className="rounded-xl border border-line bg-surface-2 p-2.5">
          <Caption>Recommendations</Caption>
          <p className="mt-1 text-sm text-ink">
            <span className="font-mono text-base font-semibold tabular-nums">{Math.round(rec * 100)}%</span> served · {s.rejected.rec} turned away
          </p>
        </div>
      </div>
      <div className="mt-3" aria-live="polite">
        {s.t >= 12 && slow && !split && pay < 0.8 ? (
          <Note tone="bad">The slow feature is sitting on the threads. Payments have nothing wrong with them, yet {Math.round((1 - pay) * 100)}% of them are being refused.</Note>
        ) : s.t >= 12 && slow && split && pay > 0.95 ? (
          <Note tone="good">Recommendations can only fill their own 4 threads. Payments never notice.</Note>
        ) : null}
      </div>
    </div>
  );
}

export function checkBulkhead(state: unknown, goal: Record<string, unknown>) {
  const st = state as BulkheadState | undefined;
  if (!st) return false;
  if (typeof goal.split === "boolean" && st.split !== goal.split) return false;
  if (typeof goal.slow === "boolean" && st.slow !== goal.slow) return false;
  if (typeof goal.minT === "number" && st.t < goal.minT) return false;
  if (typeof goal.minPayRate === "number" && st.payRate < goal.minPayRate) return false;
  if (typeof goal.maxPayRate === "number" && st.payRate > goal.maxPayRate) return false;
  return true;
}
