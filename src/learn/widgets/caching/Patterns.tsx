"use client";

import React, { useState } from "react";
import { RotateCcw } from "lucide-react";
import type { WidgetProps } from "@/learn/widget";
import { Note } from "../dsa/ui";
import { Choice } from "./ui";

/**
 * One ticket price (in dollars) lives in a database. A cache sits in front of it. Four ways to
 * wire the two together: cache-aside, read-through, write-through, write-behind. Read and write
 * the price, expire the entry, flush or crash the cache, and watch which side is out of date.
 */

export type Pattern = "aside" | "through" | "wthrough" | "behind";

const NAMES: Record<Pattern, string> = {
  aside: "Cache-aside",
  through: "Read-through",
  wthrough: "Write-through",
  behind: "Write-behind",
};

const BLURB: Record<Pattern, string> = {
  aside: "The app talks to both. It fills the cache itself on a miss and deletes the entry when it writes.",
  through: "The cache loads missing values from the database itself. Writes go straight to the database.",
  wthrough: "Writes go to the cache, and the cache writes them to the database before it answers.",
  behind: "Writes land in the cache and are answered at once. The database catches up later.",
};

interface World {
  cache: number | null;
  db: number;
  pending: number | null;
  lost: boolean;
  /** the value the last read returned, and whether it matched the database at that moment */
  readValue: number | null;
  readFrom: "cache" | "db" | null;
  servedStale: boolean;
  dbReads: number;
  log: string[];
  next: number;
}

const START: World = { cache: null, db: 40, pending: null, lost: false, readValue: null, readFrom: null, servedStale: false, dbReads: 0, log: [], next: 45 };

function read(p: Pattern, w: World): World {
  if (w.cache !== null) {
    return { ...w, readValue: w.cache, readFrom: "cache", servedStale: w.cache !== w.db, log: [`Asked the cache for the price: hit, $${w.cache}.`, w.cache !== w.db ? `But the database says $${w.db}: this reader got an out-of-date price.` : "The database was not touched."] };
  }
  const log =
    p === "aside"
      ? ["App asks the cache for the price: miss.", `App reads the database: $${w.db}.`, `App stores $${w.db} in the cache, then answers.`]
      : ["App asks the cache for the price: miss.", `The cache itself reads the database: $${w.db}.`, `The cache keeps $${w.db} and hands it back.`];
  return { ...w, cache: w.db, readValue: w.db, readFrom: "db", servedStale: false, dbReads: w.dbReads + 1, log };
}

function write(p: Pattern, w: World): World {
  const n = w.next;
  const base = { ...w, next: n + 5, lost: false };
  switch (p) {
    case "aside":
      return { ...base, db: n, cache: null, log: [`App writes $${n} to the database.`, "App deletes the cache entry, so the next read refills it."] };
    case "through":
      return { ...base, db: n, log: [`App writes $${n} to the database.`, w.cache !== null ? `The cache is never told. It still holds $${w.cache} until it expires.` : "The cache is empty, so nothing is stale yet."] };
    case "wthrough":
      return { ...base, cache: n, db: n, pending: null, log: [`App hands $${n} to the cache.`, "The cache writes it to the database and waits for that to finish.", "Only then does the write return. Both hold the new price."] };
    case "behind":
      return { ...base, cache: n, pending: n, log: [`App hands $${n} to the cache. It answers immediately.`, `The database update is queued. Right now the database still says $${w.db}.`] };
  }
}

export interface PatternsProps {
  /** Which patterns can be chosen (default all four). */
  patterns?: Pattern[];
  initial?: Pattern;
}

export interface PatternsState {
  pattern: Pattern;
  cache: number | null;
  db: number;
  stale: boolean;
  dbBehind: boolean;
  lost: boolean;
  servedStale: boolean;
  dbReads: number;
  wrote: boolean;
  readFromCache: boolean;
}

export function Patterns({ props, onChange, revealed }: WidgetProps<PatternsProps>) {
  const options = props.patterns ?? ["aside", "through", "wthrough", "behind"];
  const [pattern, setPattern] = useState<Pattern>(props.initial ?? options[0]);
  const [w, setW] = useState<World>(START);
  const [wrote, setWrote] = useState(false);

  const emit = (p: Pattern, x: World, wr: boolean) =>
    onChange?.({
      pattern: p,
      cache: x.cache,
      db: x.db,
      stale: x.cache !== null && x.cache !== x.db && x.pending === null,
      dbBehind: x.pending !== null,
      lost: x.lost,
      servedStale: x.servedStale,
      dbReads: x.dbReads,
      wrote: wr,
      readFromCache: x.readFrom === "cache",
    } satisfies PatternsState);

  const apply = (x: World, wr = wrote) => {
    setW(x);
    setWrote(wr);
    emit(pattern, x, wr);
  };
  const pick = (p: Pattern) => {
    setPattern(p);
    setW(START);
    setWrote(false);
    emit(p, START, false);
  };

  const stale = w.cache !== null && w.cache !== w.db && w.pending === null;
  const btn = "btn !h-10";

  return (
    <div className="w-full min-w-0">
      <Choice label="Caching pattern" value={pattern} onChange={pick} disabled={revealed} options={options.map((o) => ({ id: o, label: NAMES[o] }))} />
      <p className="mt-2 text-sm text-ink-2">{BLURB[pattern]}</p>

      <div className="mt-3 grid grid-cols-[1fr_1fr_1fr] gap-2">
        {[
          { name: "Cache", val: w.cache === null ? "empty" : `$${w.cache}`, warn: stale, sub: stale ? "out of date" : w.cache === null ? "" : "" },
          { name: "Database", val: `$${w.db}`, warn: false, sub: w.pending !== null ? `$${w.pending} queued` : "the truth" },
          { name: "Last read", val: w.readValue === null ? "none" : `$${w.readValue}`, warn: w.servedStale, sub: w.readFrom ? `from ${w.readFrom}` : "" },
        ].map((b) => (
          <div key={b.name} className={`rounded-xl border px-2 py-2 text-center ${b.warn ? "border-[var(--bad)]/50 bg-[var(--bad)]/[0.06]" : "border-line bg-surface"}`}>
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.08em] text-ink-3">{b.name}</p>
            <p className="font-mono text-lg font-semibold tabular-nums text-ink">{b.val}</p>
            <p className={`min-h-4 text-[0.7rem] ${b.warn ? "text-bad" : "text-ink-3"}`}>{b.sub}</p>
          </div>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <button type="button" className={`${btn} btn-primary`} disabled={revealed} onClick={() => apply(read(pattern, w))}>
          Read the price
        </button>
        <button type="button" className={btn} disabled={revealed} onClick={() => apply(write(pattern, w), true)}>
          Raise it to ${w.next}
        </button>
        <button type="button" className={btn} disabled={revealed || w.cache === null} onClick={() => apply({ ...w, cache: null, log: ["The entry's time to live ran out: the cache dropped it."] })}>
          Let the entry expire
        </button>
        {pattern === "behind" && (
          <>
            <button type="button" className={btn} disabled={revealed || w.pending === null} onClick={() => apply({ ...w, db: w.pending ?? w.db, pending: null, log: [`The cache flushes its queue: the database now says $${w.pending}.`] })}>
              Flush to database
            </button>
            <button
              type="button"
              className={btn}
              disabled={revealed || w.cache === null}
              onClick={() => apply({ ...w, cache: null, lost: w.pending !== null, pending: null, log: [w.pending !== null ? `The cache node crashes. The queued write of $${w.pending} was only in its memory: gone for good.` : "The cache node restarts empty. Nothing was waiting to be flushed, so nothing is lost."] })}
            >
              Crash the cache
            </button>
          </>
        )}
        <button type="button" className="btn btn-ghost !h-10 !w-10 !p-0" disabled={revealed} onClick={() => pick(pattern)} aria-label="Start over" title="Start over">
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-3 min-h-[4.5rem] rounded-xl border border-line bg-surface-2 px-3 py-2 text-sm text-ink-2" aria-live="polite">
        {w.log.length === 0 ? (
          <span className="text-ink-3">Press <strong>Read the price</strong> to start.</span>
        ) : (
          <ol className="space-y-0.5">
            {w.log.map((l, i) => (
              <li key={i} className="flex gap-2">
                <span className="font-mono text-xs leading-6 text-ink-3">{i + 1}</span>
                <span>{l}</span>
              </li>
            ))}
          </ol>
        )}
      </div>
      {w.lost ? (
        <Note tone="bad">The price change is lost: neither the database nor the cache has it. A write-behind cache trades that risk for speed.</Note>
      ) : w.servedStale ? (
        <Note tone="bad">A reader just got ${w.readValue}, but the truth is ${w.db}. That is a stale read.</Note>
      ) : w.pending !== null ? (
        <Note>The database is behind the cache by one write. It is safe only as long as the cache stays alive.</Note>
      ) : null}
    </div>
  );
}

export function checkPatterns(state: unknown, goal: Record<string, unknown>) {
  const s = state as PatternsState | undefined;
  if (!s) return false;
  for (const [k, v] of Object.entries(goal)) {
    if ((s as unknown as Record<string, unknown>)[k] !== v) return false;
  }
  return true;
}
