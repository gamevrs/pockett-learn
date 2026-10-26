"use client";

import React, { useState } from "react";
import { Pause, Play, RotateCcw, StepForward, Wrench } from "lucide-react";
import type { WidgetProps } from "@/learn/widget";
import { Caption, Note, Pill, Readout, Slider, useInitialReport, useTicker } from "../reliability/ui";
import { dlqRedrive, dlqStep, newDlq, POISON, type DlqPolicy, type DlqState } from "./sim";

/**
 * A worker takes messages from the front of a queue. Two of the eight messages are poison: they
 * crash the worker every time. Choose what happens after a failure and watch whether the queue
 * drains, gets stuck, silently loses messages, or sets the bad ones aside in a dead-letter queue.
 */

const POLICIES: { id: DlqPolicy; label: string; blurb: string }[] = [
  { id: "forever", label: "Retry forever", blurb: "A failed message goes straight back to the front of the queue and is tried again, however many times it takes." },
  { id: "drop", label: "Give up and discard", blurb: "After the allowed number of failures the message is simply thrown away." },
  { id: "dead", label: "Dead-letter queue", blurb: "After the allowed number of failures the message is moved to a separate queue for a human or a repair job." },
];

const STUCK_AFTER = 6;

export interface DlqWidgetState {
  policy: DlqPolicy;
  done: number;
  dead: number;
  dropped: number;
  stuck: boolean;
  fixed: boolean;
  redriven: boolean;
  empty: boolean;
}

function Chip({ id, tone }: { id: number; tone: "wait" | "head" | "ok" | "dead" | "drop" }) {
  const cls = {
    wait: "border-line bg-surface text-ink",
    head: "border-[var(--brand)] bg-tint text-ink ring-2 ring-[var(--brand)]/40",
    ok: "border-[var(--brand)]/50 bg-primary text-primary-ink",
    dead: "border-[#d99a2b] bg-[#e8b04f] text-[#2a1c00]",
    drop: "border-dashed border-[var(--line-strong)] bg-surface-2 text-ink-3 line-through",
  }[tone];
  return <span className={`inline-grid h-9 min-w-9 place-items-center rounded-lg border px-1.5 font-mono text-[13px] font-semibold ${cls}`}>#{id}</span>;
}

export function DlqSim({ props, onChange }: WidgetProps<{ policy?: DlqPolicy; max?: number }>) {
  const [policy, setPolicy] = useState<DlqPolicy>(props.policy ?? "forever");
  const [max, setMax] = useState(props.max ?? 3);
  const [s, setS] = useState<DlqState>(newDlq);
  const [playing, setPlaying] = useState(false);
  const [redriven, setRedriven] = useState(false);

  const stuck = s.current !== null && s.current.failures >= STUCK_AFTER;
  const emit = (n: DlqState, p: DlqPolicy, rd: boolean) =>
    onChange?.({ policy: p, done: n.done.length, dead: n.dead.length, dropped: n.dropped.length, stuck: n.current !== null && n.current.failures >= STUCK_AFTER, fixed: n.fixed, redriven: rd, empty: n.queue.length === 0 } satisfies DlqWidgetState);

  const step = () => {
    if (s.queue.length === 0 || stuck) {
      setPlaying(false);
      return;
    }
    const n = dlqStep(s, policy, max);
    setS(n);
    emit(n, policy, redriven);
    if (n.queue.length === 0 || (n.current !== null && n.current.failures >= STUCK_AFTER)) setPlaying(false);
  };
  useTicker(playing, 550, step);
  useInitialReport(() => emit(s, policy, false));

  const reset = (p: DlqPolicy = policy) => {
    setPlaying(false);
    setS(newDlq());
    setRedriven(false);
    emit(newDlq(), p, false);
  };
  const info = POLICIES.find((p) => p.id === policy) ?? POLICIES[0];

  return (
    <div className="w-full max-w-2xl">
      <Caption>After a message fails…</Caption>
      <div className="mt-2 flex flex-wrap gap-2">
        {POLICIES.map((p) => (
          <Pill
            key={p.id}
            on={policy === p.id}
            onClick={() => {
              setPolicy(p.id);
              reset(p.id);
            }}
          >
            {p.label}
          </Pill>
        ))}
      </div>
      <p className="mt-2 text-sm text-ink-2">{info.blurb}</p>
      {policy !== "forever" && (
        <Slider
          className="mt-2 max-w-xs"
          label="Failures allowed per message"
          value={max}
          min={1}
          max={5}
          onChange={(v) => {
            setMax(v);
            reset();
          }}
        />
      )}

      <div className="mt-3 rounded-xl border border-line bg-surface p-3">
        <Caption>Main queue (front on the left)</Caption>
        <div className="mt-1.5 flex min-h-9 flex-wrap gap-1.5">
          {s.queue.length === 0 && <span className="text-sm text-ink-3">empty</span>}
          {s.queue.map((id, i) => (
            <Chip key={id} id={id} tone={i === 0 ? "head" : "wait"} />
          ))}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg bg-surface-2 px-2.5 py-2 text-sm text-ink-2">
          <span>Worker:</span>
          {s.current ? (
            <span className="text-ink">
              retrying <span className="font-mono font-semibold">#{s.current.id}</span>, failed {s.current.failures} {s.current.failures === 1 ? "time" : "times"}
            </span>
          ) : (
            <span>{s.queue.length ? `ready for #${s.queue[0]}` : "idle"}</span>
          )}
        </div>
        <div className="mt-3 grid gap-3 min-[520px]:grid-cols-3">
          <div>
            <Caption>Done</Caption>
            <div className="mt-1.5 flex min-h-9 flex-wrap gap-1">
              {s.done.length === 0 && <span className="text-sm text-ink-3">none yet</span>}
              {s.done.map((id) => (
                <Chip key={id} id={id} tone="ok" />
              ))}
            </div>
          </div>
          <div>
            <Caption>Dead-letter queue</Caption>
            <div className="mt-1.5 flex min-h-9 flex-wrap gap-1">
              {s.dead.length === 0 && <span className="text-sm text-ink-3">{policy === "dead" ? "empty" : "not in use"}</span>}
              {s.dead.map((id) => (
                <Chip key={id} id={id} tone="dead" />
              ))}
            </div>
          </div>
          <div>
            <Caption>Lost for good</Caption>
            <div className="mt-1.5 flex min-h-9 flex-wrap gap-1">
              {s.dropped.length === 0 && <span className="text-sm text-ink-3">none</span>}
              {s.dropped.map((id) => (
                <Chip key={id} id={id} tone="drop" />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Pill on={playing} onClick={() => setPlaying(!playing)} disabled={s.queue.length === 0 || stuck}>
          {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />} {playing ? "Pause" : "Run"}
        </Pill>
        <Pill onClick={step} disabled={playing || s.queue.length === 0 || stuck} label="One attempt">
          <StepForward className="h-4 w-4" /> One attempt
        </Pill>
        <Pill
          on={s.fixed}
          onClick={() => {
            const n = { ...s, fixed: !s.fixed, log: [s.fixed ? "bug re-introduced" : "bug fixed and deployed: #3 and #6 are processable now", ...s.log].slice(0, 6) };
            setS(n);
            emit(n, policy, redriven);
          }}
        >
          <Wrench className="h-4 w-4" /> {s.fixed ? "Bug fixed" : "Deploy the fix"}
        </Pill>
        {s.dead.length > 0 && (
          <Pill
            onClick={() => {
              const n = dlqRedrive(s);
              setS(n);
              setRedriven(true);
              emit(n, policy, true);
            }}
          >
            Redrive dead letters
          </Pill>
        )}
        <Pill onClick={() => reset()} label="Reset">
          <RotateCcw className="h-4 w-4" />
        </Pill>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Readout label="Done" value={`${s.done.length}/8`} accent={s.done.length === 8} />
        <Readout label="Set aside" value={s.dead.length} />
        <Readout label="Lost" value={s.dropped.length} accent={s.dropped.length === 0} />
        <Readout label="Poison ids" value={s.fixed ? "none (fixed)" : POISON.map((p) => `#${p}`).join(", ")} />
      </div>
      <div className="mt-3" aria-live="polite">
        {stuck ? (
          <Note tone="bad">Stuck on #{s.current?.id}. It fails every time, and it is at the front, so the {s.queue.length - 1} messages behind it can&apos;t move: head-of-line blocking. One bad message has stopped the whole queue.</Note>
        ) : s.dropped.length > 0 && s.queue.length === 0 ? (
          <Note tone="bad">The queue drained, but {s.dropped.length} messages are gone with no trace. If they were orders, you just lost orders.</Note>
        ) : s.queue.length === 0 && s.done.length === 8 ? (
          <Note tone="good">All eight messages processed{redriven ? ", after the bug was fixed and the dead letters were redriven" : ""}.</Note>
        ) : s.queue.length === 0 && s.dead.length > 0 ? (
          <Note tone="good">The queue drained, six messages are done, and the two bad ones are safely set aside. Fix the bug, then redrive them.</Note>
        ) : null}
      </div>
      <ol className="mt-3 space-y-0.5 font-mono text-[11.5px] leading-snug text-ink-2">
        {s.log.map((l, i) => (
          <li key={i} className={i === 0 ? "text-ink" : ""}>
            {l}
          </li>
        ))}
      </ol>
    </div>
  );
}

export function checkDlq(state: unknown, goal: Record<string, unknown>) {
  const st = state as DlqWidgetState | undefined;
  if (!st) return false;
  if (goal.policy !== undefined && st.policy !== goal.policy) return false;
  if (typeof goal.stuck === "boolean" && st.stuck !== goal.stuck) return false;
  if (typeof goal.empty === "boolean" && st.empty !== goal.empty) return false;
  if (typeof goal.done === "number" && st.done !== goal.done) return false;
  if (typeof goal.dead === "number" && st.dead !== goal.dead) return false;
  if (typeof goal.dropped === "number" && st.dropped !== goal.dropped) return false;
  if (typeof goal.redriven === "boolean" && st.redriven !== goal.redriven) return false;
  return true;
}
