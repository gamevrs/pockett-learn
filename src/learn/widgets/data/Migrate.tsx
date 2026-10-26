"use client";

import React, { useState } from "react";
import { ArrowLeft, ArrowRight, DatabaseZap, RotateCcw, Undo2 } from "lucide-react";
import type { WidgetProps } from "@/learn/widget";
import { Caption, Note, Readout } from "../dsa/ui";
import { Choice } from "./ui";

/**
 * Renaming `orders.total` (euros, a decimal) to `orders.total_cents` (an integer) while the site
 * keeps serving traffic. Eight app servers are replaced a few at a time, so for a while two
 * versions of the code run against the same database. Walk through "one big change" and then
 * "expand, migrate, contract" and watch which app versions each database state can serve.
 */

type Fill = number | null;
interface Col {
  name: string;
  /** Share of rows with a value, or null if the column doesn't exist */
  fill: Fill;
}
interface Phase {
  title: string;
  command: string;
  say: string;
  cols: Col[];
  /** Version of each of the 8 servers. */
  fleet: number[];
  /** Versions that would crash against this schema. */
  broken: number[];
  rollback: { ok: boolean; text: string };
}

const ALL = (v: number, n = 8) => Array(n).fill(v) as number[];
const MIX = (a: number, na: number, b: number) => [...ALL(a, na), ...ALL(b, 8 - na)];

const EXPAND: Phase[] = [
  {
    title: "Where we start",
    command: "-- v1 reads and writes orders.total",
    say: "All eight servers run v1. The table has one money column.",
    cols: [{ name: "total", fill: 1 }],
    fleet: ALL(1),
    broken: [],
    rollback: { ok: true, text: "Nothing has changed yet." },
  },
  {
    title: "Expand: add the new column",
    command: "ALTER TABLE orders ADD COLUMN total_cents INTEGER;  -- nullable",
    say: "A new, empty, nullable column. v1 doesn't know it exists and doesn't care: a column nobody asks about breaks nobody.",
    cols: [{ name: "total", fill: 1 }, { name: "total_cents", fill: 0 }],
    fleet: ALL(1),
    broken: [],
    rollback: { ok: true, text: "Drop the empty column. Nothing depended on it." },
  },
  {
    title: "Deploy v2: write both",
    command: "-- v2: INSERT/UPDATE set total AND total_cents; reads still use total",
    say: "Servers are replaced a few at a time, so v1 and v2 run side by side. Both are happy: v1 writes only total, v2 writes both. New rows get total_cents, old rows don't yet.",
    cols: [{ name: "total", fill: 1 }, { name: "total_cents", fill: 0.15 }],
    fleet: MIX(2, 5, 1),
    broken: [],
    rollback: { ok: true, text: "Redeploy v1. total was never left behind, so nothing is lost." },
  },
  {
    title: "Backfill the old rows",
    command: "UPDATE orders SET total_cents = ROUND(total * 100)\n WHERE id BETWEEN ? AND ?  AND total_cents IS NULL;  -- one batch at a time",
    say: "Old rows get their cents in small batches, so no single statement holds locks for long. Run the batches yourself.",
    cols: [{ name: "total", fill: 1 }, { name: "total_cents", fill: 0.15 }],
    fleet: ALL(2),
    broken: [],
    rollback: { ok: true, text: "Stop the backfill any time; rerunning it is harmless because it only touches rows that are still NULL." },
  },
  {
    title: "Deploy v3: read the new column",
    command: "-- v3: reads total_cents, still writes both",
    say: "Now readers switch. Because both columns are still written, v2 and v3 can mix and either can be rolled back to the other.",
    cols: [{ name: "total", fill: 1 }, { name: "total_cents", fill: 1 }],
    fleet: MIX(3, 4, 2),
    broken: [],
    rollback: { ok: true, text: "Redeploy v2. Both columns are still current." },
  },
  {
    title: "Deploy v4: stop writing the old one",
    command: "-- v4: writes and reads only total_cents",
    say: "The old column stops being updated. It is now stale, which is fine because nothing reads it anymore.",
    cols: [{ name: "total", fill: 1 }, { name: "total_cents", fill: 1 }],
    fleet: ALL(4),
    broken: [],
    rollback: { ok: false, text: "Careful: rolling back to v3 is fine (it reads total_cents), but v2 or v1 would read a stale total. Keep v3 as the rollback target." },
  },
  {
    title: "Contract: drop the old column",
    command: "ALTER TABLE orders DROP COLUMN total;",
    say: "Only now, when no running code mentions total, is it removed. This step is the point of no return, so it waits until v4 has been stable for a while.",
    cols: [{ name: "total_cents", fill: 1 }],
    fleet: ALL(4),
    broken: [],
    rollback: { ok: false, text: "No way back except restoring a backup. That's why this step comes last and waits." },
  },
];

const BIG: Phase[] = [
  {
    title: "Where we start",
    command: "-- v1 reads and writes orders.total",
    say: "All eight servers run v1.",
    cols: [{ name: "total", fill: 1 }],
    fleet: ALL(1),
    broken: [],
    rollback: { ok: true, text: "Nothing has changed yet." },
  },
  {
    title: "Run the migration first",
    command: "ALTER TABLE orders RENAME COLUMN total TO total_cents;\nUPDATE orders SET total_cents = ROUND(total_cents * 100);",
    say: "The column is renamed instantly, but all eight servers still run v1, which still asks for the old name, total. Every request that touches an order fails until the new code is out.",
    cols: [{ name: "total_cents", fill: 1 }],
    fleet: ALL(1),
    broken: [1],
    rollback: { ok: false, text: "Reverting the code doesn't help: the column the old code needs is gone. You'd have to reverse the migration too, under pressure." },
  },
  {
    title: "Roll out v2",
    command: "-- v2: reads and writes total_cents",
    say: "While the fleet is replaced, half the servers are still v1 and still failing. Half of all order requests are errors.",
    cols: [{ name: "total_cents", fill: 1 }],
    fleet: MIX(2, 4, 1),
    broken: [1],
    rollback: { ok: false, text: "Mixed fleet, half broken. Both rolling forward and rolling back leave someone failing." },
  },
  {
    title: "Rollout finished",
    command: "-- all servers are v2",
    say: "Everything works again, after minutes of errors. And if v2 had a bug, you could not go back to v1 at all.",
    cols: [{ name: "total_cents", fill: 1 }],
    fleet: ALL(2),
    broken: [],
    rollback: { ok: false, text: "Going back to v1 would break everything again." },
  },
];

const VERSION_STYLE: Record<number, string> = {
  1: "border-line bg-surface-2 text-ink-2",
  2: "border-[var(--brand)]/40 bg-[var(--brand)]/20 text-ink",
  3: "border-[var(--brand)]/70 bg-[var(--brand)]/45 text-ink",
  4: "border-transparent bg-primary text-primary-ink",
};

export interface MigrateProps {
  /** "expand" (default), "bigbang", or "both" to show the switch. */
  mode?: "expand" | "bigbang" | "both";
}

export interface MigrateState {
  mode: "expand" | "bigbang";
  phase: number;
  last: boolean;
  batches: number;
  /** Highest share of requests that failed at any point so far. */
  worstErrorPct: number;
  /** Did the learner ever look at the rollback column of a point-of-no-return phase. */
  finished: boolean;
}

const BATCHES = 5;

export function Migrate({ props, onChange, revealed }: WidgetProps<MigrateProps>) {
  const [mode, setMode] = useState<"expand" | "bigbang">(props.mode === "bigbang" ? "bigbang" : "expand");
  const [phase, setPhase] = useState(0);
  const [batches, setBatches] = useState(0);
  const [worst, setWorst] = useState(0);
  const phases = mode === "expand" ? EXPAND : BIG;
  const p = phases[phase];
  const backfill = mode === "expand" && phase === 3;
  const blocked = backfill && batches < BATCHES;
  const err = Math.round((p.fleet.filter((v) => p.broken.includes(v)).length / 8) * 100);

  const cols = p.cols.map((c) => (backfill && c.name === "total_cents" ? { ...c, fill: 0.15 + (0.85 * batches) / BATCHES } : c));

  const report = (m: "expand" | "bigbang", ph: number, b: number, w: number) => {
    const list = m === "expand" ? EXPAND : BIG;
    onChange?.({ mode: m, phase: ph, last: ph === list.length - 1, batches: b, worstErrorPct: w, finished: ph === list.length - 1 } satisfies MigrateState);
  };
  const go = (to: number) => {
    if (revealed) return;
    const e = Math.round((phases[to].fleet.filter((v) => phases[to].broken.includes(v)).length / 8) * 100);
    const w = Math.max(worst, e);
    setPhase(to);
    setWorst(w);
    report(mode, to, batches, w);
  };
  const reset = (m = mode) => {
    setPhase(0);
    setBatches(0);
    setWorst(0);
    report(m, 0, 0, 0);
  };

  return (
    <div className="w-full min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {props.mode === "both" ? (
          <Choice
            label="Strategy"
            value={mode}
            disabled={revealed}
            onChange={(m) => {
              setMode(m);
              reset(m);
            }}
            options={[{ id: "bigbang", label: "One big change" }, { id: "expand", label: "Expand, migrate, contract" }]}
          />
        ) : (
          <Caption className="!mb-0">{mode === "expand" ? "Expand, migrate, contract" : "One big change"}</Caption>
        )}
        <button type="button" className="btn btn-ghost !h-10 !w-10 !p-0" onClick={() => reset()} disabled={revealed || (phase === 0 && batches === 0)} aria-label="Start over" title="Start over">
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-3 flex items-center gap-1" aria-label={`Phase ${phase + 1} of ${phases.length}`}>
        {phases.map((_, i) => (
          <span key={i} className={`h-1.5 flex-1 rounded-full ${i <= phase ? "bg-primary" : "bg-surface-2"}`} />
        ))}
      </div>
      <p className="mt-2 font-display text-lg leading-snug text-ink">
        <span className="mr-2 font-mono text-sm text-ink-3">{phase + 1}/{phases.length}</span>
        {p.title}
      </p>
      <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-words rounded-xl border border-white/10 bg-[#0a0a0a] px-3 py-2 font-mono text-[12px] leading-[1.55] text-[#e5e5e5]">{p.command}</pre>
      <p className="mt-2 text-sm text-ink-2">{p.say}</p>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-line bg-surface-2 p-2.5">
          <Caption>orders table</Caption>
          <div className="grid gap-1.5">
            {cols.map((c) => (
              <div key={c.name} className="rounded-lg border border-line bg-surface px-2.5 py-1.5">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-mono text-[12.5px] font-medium text-ink">{c.name}</span>
                  <span className="font-mono text-[11px] tabular-nums text-ink-3">{Math.round((c.fill ?? 0) * 100)}% filled</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-2">
                  <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${(c.fill ?? 0) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-line bg-surface-2 p-2.5">
          <Caption>8 app servers</Caption>
          <div className="grid grid-cols-4 gap-1.5">
            {p.fleet.map((v, i) => {
              const bad = p.broken.includes(v);
              return (
                <div key={i} className={`grid h-10 place-items-center rounded-lg border font-mono text-xs font-semibold transition-colors ${bad ? "border-[var(--bad)]/60 bg-[var(--bad)]/15 text-bad" : VERSION_STYLE[v]}`}>
                  v{v}
                  {bad && <span className="sr-only"> failing</span>}
                </div>
              );
            })}
          </div>
          <p className="mt-2 text-[11.5px] text-ink-3">Red servers fail on every request that touches an order.</p>
        </div>
      </div>

      {backfill && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button type="button" className="btn btn-primary !h-10" disabled={revealed || batches >= BATCHES} onClick={() => { setBatches(batches + 1); report(mode, phase, batches + 1, worst); }}>
            <DatabaseZap className="h-4 w-4" /> Run a batch
          </button>
          <Readout label="Batches" value={`${batches} of ${BATCHES}`} accent={batches >= BATCHES} />
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" className="btn !h-10" onClick={() => go(phase - 1)} disabled={revealed || phase === 0}>
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <button type="button" className="btn btn-primary !h-10" onClick={() => go(phase + 1)} disabled={revealed || phase >= phases.length - 1 || blocked}>
          Next <ArrowRight className="h-4 w-4" />
        </button>
        <Readout label="Requests failing" value={`${err}%`} accent={err > 0} />
      </div>
      <Note tone={p.rollback.ok ? "plain" : "bad"}>
        <Undo2 className="h-4 w-4 shrink-0 text-ink-3" />
        <span>
          <strong className="font-semibold text-ink">If we had to roll back here: </strong>
          {p.rollback.text}
        </span>
      </Note>
    </div>
  );
}

export function checkMigrate(state: unknown, goal: Record<string, unknown>) {
  const s = state as MigrateState | undefined;
  if (!s) return false;
  if (typeof goal.mode === "string" && s.mode !== goal.mode) return false;
  if (goal.finished === true && !s.finished) return false;
  if (typeof goal.worstMin === "number" && s.worstErrorPct < goal.worstMin) return false;
  if (typeof goal.worstMax === "number" && s.worstErrorPct > goal.worstMax) return false;
  if (typeof goal.phase === "number" && s.phase !== goal.phase) return false;
  return true;
}
