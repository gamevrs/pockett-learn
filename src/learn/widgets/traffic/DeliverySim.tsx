"use client";

import React, { useState } from "react";
import { RotateCcw, Zap } from "lucide-react";
import type { WidgetProps } from "@/learn/widget";
import { Caption, Note, Pill, Readout, useInitialReport } from "../reliability/ui";
import { deliver, newDelivery, type AckMode, type DeliveryState } from "./sim";

/**
 * A broker hands five messages to a consumer, one at a time. For each, the consumer does two things:
 * acknowledge it and do the work (here: send a receipt email). The order of those two steps, a
 * crash between them, and whether the consumer remembers ids, decide whether each email goes out
 * once, twice, or never.
 */

export interface DeliveryWidgetState {
  ack: AckMode;
  dedupe: boolean;
  finished: boolean;
  lost: number;
  duplicated: number;
  exact: boolean;
  crashes: number;
}

const IDS = [1, 2, 3, 4, 5];

export function DeliverySim({ props, onChange }: WidgetProps<{ ack?: AckMode; dedupe?: boolean; lockAck?: boolean; lockDedupe?: boolean }>) {
  const [ack, setAck] = useState<AckMode>(props.ack ?? "after");
  const [dedupe, setDedupe] = useState(props.dedupe ?? false);
  const [crash, setCrash] = useState(false);
  const [s, setS] = useState<DeliveryState>(newDelivery);

  const finished = s.queue.length === 0 && s.deliveries > 0;
  const lost = finished ? IDS.filter((i) => (s.effects[i] ?? 0) === 0).length : 0;
  const duplicated = IDS.filter((i) => (s.effects[i] ?? 0) > 1).length;
  const exact = finished && IDS.every((i) => s.effects[i] === 1);

  const emit = (n: DeliveryState, a: AckMode, d: boolean) => {
    const fin = n.queue.length === 0 && n.deliveries > 0;
    onChange?.({
      ack: a,
      dedupe: d,
      finished: fin,
      lost: fin ? IDS.filter((i) => (n.effects[i] ?? 0) === 0).length : 0,
      duplicated: IDS.filter((i) => (n.effects[i] ?? 0) > 1).length,
      exact: fin && IDS.every((i) => n.effects[i] === 1),
      crashes: n.crashes,
    } satisfies DeliveryWidgetState);
  };

  useInitialReport(() => emit(s, ack, dedupe));

  const next = () => {
    const n = deliver(s, ack, dedupe, crash);
    setS(n);
    setCrash(false);
    emit(n, ack, dedupe);
  };
  const reset = (a = ack, d = dedupe) => {
    setS(newDelivery());
    setCrash(false);
    emit(newDelivery(), a, d);
  };

  return (
    <div className="w-full max-w-2xl">
      {!props.lockAck && (
        <>
          <Caption>The consumer…</Caption>
          <div className="mt-2 flex flex-wrap gap-2">
            <Pill
              on={ack === "first"}
              onClick={() => {
                setAck("first");
                reset("first", dedupe);
              }}
            >
              Acknowledges, then works
            </Pill>
            <Pill
              on={ack === "after"}
              onClick={() => {
                setAck("after");
                reset("after", dedupe);
              }}
            >
              Works, then acknowledges
            </Pill>
          </div>
        </>
      )}
      {!props.lockDedupe && (
        <div className="mt-2">
          <Pill
            on={dedupe}
            onClick={() => {
              setDedupe(!dedupe);
              reset(ack, !dedupe);
            }}
            label="Remember message ids and skip repeats"
          >
            Remembers ids and skips repeats
          </Pill>
        </div>
      )}

      <div className="mt-3 rounded-xl border border-line bg-surface p-3">
        <Caption>Broker queue</Caption>
        <div className="mt-1.5 flex min-h-9 flex-wrap gap-1.5">
          {s.queue.length === 0 && <span className="text-sm text-ink-3">empty</span>}
          {s.queue.map((id, i) => (
            <span key={`${id}-${i}`} className={`inline-grid h-9 min-w-9 place-items-center rounded-lg border px-1.5 font-mono text-[13px] font-semibold ${i === 0 ? "border-[var(--brand)] bg-tint ring-2 ring-[var(--brand)]/40" : "border-line bg-surface"} text-ink`}>
              #{id}
            </span>
          ))}
        </div>
        <p className="mt-2 rounded-lg bg-surface-2 px-2.5 py-2 text-sm text-ink-2">
          Each delivery: <span className="font-semibold text-ink">{ack === "first" ? "(1) acknowledge, then (2) send the email" : "(1) send the email, then (2) acknowledge"}</span>
          {crash && <span className="ml-1 text-[var(--bad)]">· will crash between (1) and (2)</span>}
        </p>

        <Caption className="mt-3">Receipt emails sent</Caption>
        <div className="mt-1.5 grid grid-cols-5 gap-1.5">
          {IDS.map((id) => {
            const n = s.effects[id] ?? 0;
            const missing = n === 0 && !s.queue.includes(id) && s.deliveries > 0;
            return (
              <div key={id} className={`rounded-lg border px-1 py-1.5 text-center ${n > 1 ? "border-[var(--bad)] bg-[var(--bad)]/10" : missing ? "border-[#d99a2b] bg-[#e8b04f]/20" : n === 1 ? "border-[var(--brand)]/60 bg-tint" : "border-line bg-surface-2"}`}>
                <p className="font-mono text-[11px] text-ink-2">#{id}</p>
                <p className="font-mono text-sm font-semibold tabular-nums text-ink">{n === 0 ? (missing ? "lost" : "·") : `×${n}`}</p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Pill on onClick={next} disabled={s.queue.length === 0}>
          Deliver next
        </Pill>
        <Pill on={crash} onClick={() => setCrash(!crash)} disabled={s.queue.length === 0} label="Crash the consumer between its two steps on the next delivery">
          <Zap className="h-4 w-4" /> Crash next time
        </Pill>
        <Pill onClick={() => reset()} label="Reset">
          <RotateCcw className="h-4 w-4" />
        </Pill>
        <Readout label="Deliveries" value={s.deliveries} />
      </div>

      <ol className="mt-3 min-h-[3.6rem] space-y-0.5 rounded-xl border border-line bg-surface-2 p-2.5 font-mono text-[11.5px] leading-snug text-ink-2">
        {s.log.length === 0 && <li className="text-ink-3">Press “Deliver next”. Switch on “Crash next time” to make something go wrong.</li>}
        {s.log.map((l, i) => (
          <li key={i} className={i === 0 ? "text-ink" : ""}>
            {l}
          </li>
        ))}
      </ol>
      <div className="mt-3" aria-live="polite">
        {finished && exact ? (
          <Note tone="good">Every customer got exactly one email{s.crashes > 0 ? `, even though the consumer crashed ${s.crashes} ${s.crashes === 1 ? "time" : "times"}` : ""}.</Note>
        ) : finished ? (
          <Note tone="bad">
            {lost > 0 && `${lost} ${lost === 1 ? "email was" : "emails were"} never sent. `}
            {duplicated > 0 && `${duplicated} ${duplicated === 1 ? "customer got" : "customers got"} the email twice. `}
          </Note>
        ) : null}
      </div>
    </div>
  );
}

export function checkDelivery(state: unknown, goal: Record<string, unknown>) {
  const st = state as DeliveryWidgetState | undefined;
  if (!st) return false;
  if (goal.ack !== undefined && st.ack !== goal.ack) return false;
  if (typeof goal.dedupe === "boolean" && st.dedupe !== goal.dedupe) return false;
  if (typeof goal.exact === "boolean" && st.exact !== goal.exact) return false;
  if (typeof goal.minLost === "number" && st.lost < goal.minLost) return false;
  if (typeof goal.minDuplicated === "number" && st.duplicated < goal.minDuplicated) return false;
  if (typeof goal.minCrashes === "number" && st.crashes < goal.minCrashes) return false;
  if (typeof goal.finished === "boolean" && st.finished !== goal.finished) return false;
  return true;
}
