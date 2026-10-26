"use client";

import React, { useState } from "react";
import { RotateCcw } from "lucide-react";
import type { WidgetProps } from "@/learn/widget";
import { Note, Readout } from "../dsa/ui";
import { Choice } from "./ui";

/**
 * Seats left for a concert: 12 in the database. The cache entry just expired. A reader needs the
 * number (miss, read the database, fill the cache) while a writer sells a seat (12 becomes 11)
 * and fixes the cache. You choose the order the five steps happen in. Some orders leave the cache
 * wrong until it expires.
 */

export type Strategy = "delete-after" | "delete-before" | "update-after" | "versioned";

const NAMES: Record<Strategy, string> = {
  "delete-after": "Write the database, then delete the entry",
  "delete-before": "Delete the entry, then write the database",
  "update-after": "Write the database, then update the entry",
  versioned: "Write the database, then leave a versioned marker",
};

type Val = { val: number; ver: number };
type Slot = Val | { tomb: number } | null;
interface W {
  db: Val;
  cache: Slot;
  read: Val | null;
}

const INITIAL: W = { db: { val: 12, ver: 1 }, cache: null, read: null };
const NEW: Val = { val: 11, ver: 2 };

interface Stepdef {
  label: string;
  run: (w: W) => W;
}

function readerSteps(s: Strategy): Stepdef[] {
  return [
    { label: "Look in the cache: nothing there (miss)", run: (w) => w },
    { label: "Read the seat count from the database", run: (w) => ({ ...w, read: w.db }) },
    {
      label: s === "versioned" ? "Store it, unless a newer version has been seen" : "Store what it read in the cache",
      run: (w) => {
        const r = w.read!;
        if (s === "versioned") {
          const c = w.cache;
          const newerSeen = c !== null && ("tomb" in c ? c.tomb > r.ver : c.ver > r.ver);
          if (newerSeen) return w;
        }
        return { ...w, cache: { val: r.val, ver: r.ver } };
      },
    },
  ];
}

function writerSteps(s: Strategy): Stepdef[] {
  switch (s) {
    case "delete-after":
      return [
        { label: "Sell a seat: write 11 to the database", run: (w) => ({ ...w, db: NEW }) },
        { label: "Delete the cache entry", run: (w) => ({ ...w, cache: null }) },
      ];
    case "delete-before":
      return [
        { label: "Delete the cache entry", run: (w) => ({ ...w, cache: null }) },
        { label: "Sell a seat: write 11 to the database", run: (w) => ({ ...w, db: NEW }) },
      ];
    case "update-after":
      return [
        { label: "Sell a seat: write 11 to the database", run: (w) => ({ ...w, db: NEW }) },
        { label: "Put 11 in the cache", run: (w) => ({ ...w, cache: NEW }) },
      ];
    case "versioned":
      return [
        { label: "Sell a seat: write 11 (version 2) to the database", run: (w) => ({ ...w, db: NEW }) },
        { label: "Replace the entry with a marker: version 2 exists", run: (w) => ({ ...w, cache: { tomb: 2 } }) },
      ];
  }
}

const isStale = (w: W) => w.cache !== null && !("tomb" in w.cache) && w.cache.val !== w.db.val;

/** Every way to interleave 3 reader steps with 2 writer steps: sequences like "RRWRW". */
const ORDERS: string[] = (() => {
  const out: string[] = [];
  const rec = (r: number, w: number, acc: string) => {
    if (r === 3 && w === 2) out.push(acc);
    if (r < 3) rec(r + 1, w, acc + "R");
    if (w < 2) rec(r, w + 1, acc + "W");
  };
  rec(0, 0, "");
  return out;
})();

export function runOrder(s: Strategy, order: string): W {
  const rs = readerSteps(s);
  const ws = writerSteps(s);
  let w = INITIAL;
  let r = 0;
  let wi = 0;
  for (const c of order) w = c === "R" ? rs[r++].run(w) : ws[wi++].run(w);
  return w;
}

export function staleOrders(s: Strategy): number {
  return ORDERS.filter((o) => isStale(runOrder(s, o))).length;
}

export interface RaceProps {
  strategies?: Strategy[];
  initial?: Strategy;
}

export interface RaceState {
  strategy: Strategy;
  done: boolean;
  stale: boolean;
  staleOrders: number;
  order: string;
}

const show = (c: Slot) => (c === null ? "empty" : "tomb" in c ? `marker v${c.tomb}` : `${c.val} (v${c.ver})`);

export function Race({ props, onChange, revealed }: WidgetProps<RaceProps>) {
  const strategies = props.strategies ?? ["delete-after", "delete-before", "update-after", "versioned"];
  const [strategy, setStrategy] = useState<Strategy>(props.initial ?? strategies[0]);
  const [order, setOrder] = useState("");

  const rs = readerSteps(strategy);
  const ws = writerSteps(strategy);
  const w = runOrder(strategy, order);
  const rDone = [...order].filter((c) => c === "R").length;
  const wDone = [...order].filter((c) => c === "W").length;
  const done = order.length === 5;
  const stale = done && isStale(w);
  const bad = staleOrders(strategy);

  const emit = (s: Strategy, o: string) => {
    const fin = o.length === 5;
    onChange?.({ strategy: s, done: fin, stale: fin && isStale(runOrder(s, o)), staleOrders: staleOrders(s), order: o } satisfies RaceState);
  };
  const go = (who: "R" | "W") => {
    if (revealed || done) return;
    const o = order + who;
    setOrder(o);
    emit(strategy, o);
  };
  const reset = (s: Strategy) => {
    setStrategy(s);
    setOrder("");
    emit(s, "");
  };

  const lane = (title: string, steps: Stepdef[], count: number, who: "R" | "W") => (
    <div className="min-w-0 rounded-xl border border-line bg-surface p-2">
      <p className="mb-1.5 text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-ink-3">{title}</p>
      <ol className="space-y-1">
        {steps.map((s, i) => (
          <li key={i} className={`flex gap-2 rounded-lg border px-2 py-1.5 text-[0.8rem] leading-snug ${i < count ? "border-transparent bg-primary text-primary-ink" : i === count ? "border-[var(--brand)] text-ink" : "border-line text-ink-3"}`}>
            <span className="font-mono text-xs leading-5 opacity-70">{who}{i + 1}</span>
            <span>{s.label}</span>
          </li>
        ))}
      </ol>
      <button type="button" className="btn mt-2 !h-10 w-full" disabled={revealed || done || count >= steps.length} onClick={() => go(who)}>
        {count >= steps.length ? "Finished" : `Run ${who}${count + 1}`}
      </button>
    </div>
  );

  return (
    <div className="w-full min-w-0">
      {strategies.length > 1 && <Choice label="Writer strategy" value={strategy} onChange={reset} disabled={revealed} options={strategies.map((s) => ({ id: s, label: NAMES[s] }))} />}
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {lane("Reader: needs the count", rs, rDone, "R")}
        {lane("Writer: sells a seat", ws, wDone, "W")}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-line bg-surface px-3 py-2 text-center">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.08em] text-ink-3">Database</p>
          <p className="font-mono text-lg font-semibold tabular-nums text-ink">{w.db.val} seats</p>
        </div>
        <div className={`rounded-xl border px-3 py-2 text-center ${stale ? "border-[var(--bad)]/50 bg-[var(--bad)]/[0.06]" : "border-line bg-surface"}`}>
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.08em] text-ink-3">Cache</p>
          <p className={`font-mono text-lg font-semibold tabular-nums ${stale ? "text-bad" : "text-ink"}`}>{show(w.cache)}</p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Readout label="Orders that end stale" value={`${bad} of ${ORDERS.length}`} accent={bad > 0} />
        <button type="button" className="btn btn-ghost !h-10 ml-auto" disabled={revealed || order === ""} onClick={() => reset(strategy)}>
          <RotateCcw className="h-4 w-4" /> Try another order
        </button>
      </div>
      <Note tone={done ? (stale ? "bad" : "good") : "plain"}>
        {!done
          ? order === ""
            ? "Pick which side moves first: press a Run button. All five steps happen, you choose the order."
            : `Order so far: ${[...order].map((c, i) => `${c}${[...order].slice(0, i + 1).filter((x) => x === c).length}`).join(" → ")}`
          : stale
            ? `The cache says ${(w.cache as Val).val} but the database says ${w.db.val}. Nothing will correct it until the entry expires.`
            : "The cache and the database agree (or the cache is empty and will refill with the truth)."}
      </Note>
    </div>
  );
}

export function checkRace(state: unknown, goal: Record<string, unknown>) {
  const s = state as RaceState | undefined;
  if (!s) return false;
  if (typeof goal.strategy === "string" && s.strategy !== goal.strategy) return false;
  if (typeof goal.stale === "boolean" && !(s.done && s.stale === goal.stale)) return false;
  if (typeof goal.safe === "boolean" && (s.staleOrders === 0) !== goal.safe) return false;
  if (typeof goal.done === "boolean" && s.done !== goal.done) return false;
  return true;
}
