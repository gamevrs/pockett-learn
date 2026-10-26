"use client";

import React, { useState } from "react";
import { CheckCircle2, CircleHelp, ServerCrash } from "lucide-react";
import type { WidgetProps } from "@/learn/widget";
import { Caption, Note, Pill, Slider, useInitialReport } from "./ui";
import { WORLDS } from "./sim";

/**
 * Slow, lost or dead? The app asks a parcel tracker to mark parcel #4417 as delivered and waits.
 * Four different realities exist; the learner picks one and a timeout. Three of the four look the
 * same from the app's side once the timeout fires: silence.
 */

const SPAN = 2000;
const at = (ms: number) => `${Math.min(100, (ms / SPAN) * 100)}%`;

export interface SlowDeadState {
  timeout: number;
  world: string;
  timedOut: boolean;
  processed: boolean;
  /** The app timed out although the work was done. */
  ambiguous: boolean;
}

export function SlowDead({ onChange }: WidgetProps) {
  const [world, setWorld] = useState("fast");
  const [timeout, setTimeoutMs] = useState(600);
  const w = WORLDS.find((x) => x.id === world) ?? WORLDS[0];
  const timedOut = w.reply === null || w.reply > timeout;

  const report = (id: string, t: number) => {
    const x = WORLDS.find((k) => k.id === id) ?? WORLDS[0];
    const to = x.reply === null || x.reply > t;
    onChange?.({ timeout: t, world: id, timedOut: to, processed: x.processed, ambiguous: to && x.processed } satisfies SlowDeadState);
  };

  useInitialReport(() => report(world, timeout));

  return (
    <div className="w-full max-w-2xl">
      <Caption>Request: &ldquo;mark parcel #4417 as delivered&rdquo;</Caption>
      <div className="mt-2 grid grid-cols-2 gap-2 min-[560px]:grid-cols-4">
        {WORLDS.map((x) => (
          <Pill
            key={x.id}
            on={world === x.id}
            onClick={() => {
              setWorld(x.id);
              report(x.id, timeout);
            }}
            className="w-full"
          >
            {x.label}
          </Pill>
        ))}
      </div>
      <p className="mt-2 text-sm text-ink-2">{w.desc}</p>

      <Slider
        className="mt-3"
        label="Your app's timeout"
        value={timeout}
        min={100}
        max={2000}
        step={50}
        format={(v) => `${v} ms`}
        onChange={(v) => {
          setTimeoutMs(v);
          report(world, v);
        }}
      />

      {/* timeline */}
      <div className="mt-2 rounded-xl border border-line bg-surface p-3">
        <div className="relative h-14">
          <div className="absolute inset-x-0 top-6 h-1.5 rounded-full bg-surface-2 ring-1 ring-[var(--line)]" />
          <div className="absolute left-0 top-6 h-1.5 rounded-full bg-[var(--brand)]/70" style={{ width: at(timedOut ? timeout : w.reply ?? timeout) }} />
          <div className="absolute top-1 h-12 border-l-2 border-dashed border-[var(--bad)]" style={{ left: at(timeout) }}>
            <span className="absolute -top-0.5 left-1 whitespace-nowrap rounded bg-surface px-1 font-mono text-[10px] text-ink-2">gives up</span>
          </div>
          {w.reply !== null && (
            <div className="absolute top-[18px] -translate-x-1/2" style={{ left: at(w.reply) }}>
              <span className={`block h-4 w-4 rounded-full border-2 ${timedOut ? "border-[var(--bad)] bg-surface" : "border-[var(--brand)] bg-primary"}`} />
              <span className="absolute left-1/2 top-5 -translate-x-1/2 whitespace-nowrap font-mono text-[10px] text-ink-2">{w.reply} ms</span>
            </div>
          )}
        </div>
        <div className="flex justify-between font-mono text-[10px] text-ink-3">
          <span>0</span>
          <span>0.5 s</span>
          <span>1 s</span>
          <span>1.5 s</span>
          <span>2 s</span>
        </div>
      </div>

      <div className="mt-3 grid gap-2 min-[520px]:grid-cols-2">
        <div className="rounded-xl border border-line bg-surface-2 p-3">
          <Caption>What your app knows</Caption>
          <p className="mt-1.5 flex items-start gap-2 text-sm text-ink">
            {timedOut ? <CircleHelp className="mt-0.5 h-4 w-4 shrink-0 text-[var(--bad)]" /> : <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-good" />}
            {timedOut ? `Nothing came back in ${timeout} ms. Did it work? No way to tell.` : `An answer arrived after ${w.reply} ms: delivered.`}
          </p>
        </div>
        <div className="rounded-xl border border-line bg-surface-2 p-3">
          <Caption>What really happened</Caption>
          <p className="mt-1.5 flex items-start gap-2 text-sm text-ink">
            {w.processed ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-good" /> : <ServerCrash className="mt-0.5 h-4 w-4 shrink-0 text-[var(--bad)]" />}
            {w.processed ? "The parcel is marked delivered." : "Nothing. The parcel is untouched."}
          </p>
        </div>
      </div>

      <div className="mt-3" aria-live="polite">
        {timedOut && w.processed ? (
          <Note tone="bad">The work is done, but your app can&apos;t know it. Retrying could do it twice.</Note>
        ) : timedOut ? (
          <Note>Silence again. From here it looks exactly like the &ldquo;answer lost&rdquo; case, yet here a retry is safe.</Note>
        ) : (
          <Note tone="good">A clear answer. The timeout never fired.</Note>
        )}
      </div>
    </div>
  );
}

export function checkSlowDead(state: unknown, goal: Record<string, unknown>) {
  const st = state as SlowDeadState | undefined;
  if (!st) return false;
  if (typeof goal.ambiguous === "boolean" && st.ambiguous !== goal.ambiguous) return false;
  if (typeof goal.timedOut === "boolean" && st.timedOut !== goal.timedOut) return false;
  if (typeof goal.world === "string" && st.world !== goal.world) return false;
  if (typeof goal.processed === "boolean" && st.processed !== goal.processed) return false;
  return true;
}
