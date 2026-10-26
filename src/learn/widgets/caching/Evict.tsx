"use client";

import React, { useState } from "react";
import { RotateCcw, StepForward } from "lucide-react";
import type { WidgetProps } from "@/learn/widget";
import { Caption, Note, Readout } from "../dsa/ui";
import { Choice } from "./ui";

/**
 * A tiny cache with room for a few entries. Request keys (tap them, or step through a script) and
 * see which entry each policy throws out when the cache is full. The leftmost card is the one
 * that would go next.
 */

export type Policy = "lru" | "lfu" | "fifo";

interface Entry {
  key: string;
  last: number;
  freq: number;
  ins: number;
}

const LABEL: Record<Policy, string> = { lru: "LRU: least recently used", lfu: "LFU: least frequently used", fifo: "FIFO: first in, first out" };

function victimOrder(entries: Entry[], policy: Policy): Entry[] {
  const cmp = (a: Entry, b: Entry) => (policy === "lru" ? a.last - b.last : policy === "fifo" ? a.ins - b.ins : a.freq - b.freq || a.last - b.last);
  return [...entries].sort(cmp);
}

export interface EvictProps {
  capacity?: number;
  keys?: string[];
  script?: string[];
  policies?: Policy[];
  initial?: Policy;
}

export interface EvictState {
  policy: Policy;
  hits: number;
  misses: number;
  contents: string[];
  lastKey: string | null;
  lastHit: boolean | null;
  lastEvicted: string | null;
  requests: number;
}

interface Model {
  entries: Entry[];
  tick: number;
  hits: number;
  misses: number;
  history: { key: string; hit: boolean; evicted: string | null }[];
  step: number;
}

const EMPTY: Model = { entries: [], tick: 0, hits: 0, misses: 0, history: [], step: 0 };

export function request(m: Model, key: string, policy: Policy, capacity: number): Model {
  const tick = m.tick + 1;
  const found = m.entries.find((e) => e.key === key);
  if (found) {
    return {
      ...m,
      tick,
      hits: m.hits + 1,
      entries: m.entries.map((e) => (e.key === key ? { ...e, last: tick, freq: e.freq + 1 } : e)),
      history: [...m.history, { key, hit: true, evicted: null }].slice(-16),
    };
  }
  let entries = m.entries;
  let evicted: string | null = null;
  if (entries.length >= capacity) {
    evicted = victimOrder(entries, policy)[0].key;
    entries = entries.filter((e) => e.key !== evicted);
  }
  entries = [...entries, { key, last: tick, freq: 1, ins: tick }];
  return { ...m, tick, misses: m.misses + 1, entries, history: [...m.history, { key, hit: false, evicted }].slice(-16) };
}

export function Evict({ props, onChange, revealed }: WidgetProps<EvictProps>) {
  const capacity = props.capacity ?? 3;
  const keys = props.keys ?? ["A", "B", "C", "D", "E"];
  const script = props.script ?? [];
  const policies = props.policies ?? ["lru", "lfu", "fifo"];
  const [policy, setPolicy] = useState<Policy>(props.initial ?? policies[0]);
  const [m, setM] = useState<Model>(EMPTY);

  const emit = (p: Policy, x: Model) => {
    const last = x.history[x.history.length - 1];
    onChange?.({
      policy: p,
      hits: x.hits,
      misses: x.misses,
      contents: x.entries.map((e) => e.key).sort(),
      lastKey: last?.key ?? null,
      lastHit: last ? last.hit : null,
      lastEvicted: last?.evicted ?? null,
      requests: x.hits + x.misses,
    } satisfies EvictState);
  };
  const ask = (key: string, fromScript = false) => {
    if (revealed) return;
    const x = { ...request(m, key, policy, capacity), step: fromScript ? m.step + 1 : m.step };
    setM(x);
    emit(policy, x);
  };
  const reset = (p: Policy) => {
    setPolicy(p);
    setM(EMPTY);
    emit(p, EMPTY);
  };

  const order = victimOrder(m.entries, policy);
  const last = m.history[m.history.length - 1];
  const metric = (e: Entry) => (policy === "lru" ? `used ${m.tick - e.last === 0 ? "just now" : `${m.tick - e.last} ago`}` : policy === "lfu" ? `used ${e.freq}×` : `arrived #${e.ins}`);
  const nextKey = script[m.step];

  return (
    <div className="w-full min-w-0">
      {policies.length > 1 && <Choice label="Eviction policy" value={policy} onChange={reset} disabled={revealed} options={policies.map((p) => ({ id: p, label: LABEL[p] }))} />}

      <Caption className="mt-3">Cache · room for {capacity} · next to go on the left</Caption>
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${capacity}, minmax(0, 1fr))` }}>
        {Array.from({ length: capacity }, (_, i) => {
          const e = order[i];
          return (
            <div key={i} className={`min-h-[4.25rem] rounded-xl border px-2 py-2 text-center ${e ? (i === 0 && m.entries.length >= capacity ? "border-[var(--bad)]/50 bg-[var(--bad)]/[0.06]" : "border-line bg-surface") : "border-dashed border-line"}`}>
              {e ? (
                <>
                  <p className="font-mono text-xl font-semibold text-ink">{e.key}</p>
                  <p className="text-[0.68rem] text-ink-3">{metric(e)}</p>
                </>
              ) : (
                <p className="pt-3 text-xs text-ink-3">empty</p>
              )}
            </div>
          );
        })}
      </div>

      <Caption className="mt-3">Request a key</Caption>
      <div className="flex flex-wrap items-center gap-1.5">
        {keys.map((k) => (
          <button key={k} type="button" disabled={revealed} onClick={() => ask(k)} className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-full border border-line bg-surface px-3 font-mono text-sm font-semibold text-ink transition-colors hover:border-[var(--brand)] hover:bg-tint disabled:opacity-50">
            {k}
          </button>
        ))}
        {script.length > 0 && (
          <button type="button" className="btn !h-10" disabled={revealed || nextKey === undefined} onClick={() => nextKey !== undefined && ask(nextKey, true)}>
            <StepForward className="h-4 w-4" /> {nextKey === undefined ? "Script finished" : `Next in script: ${nextKey}`}
          </button>
        )}
        <button type="button" className="btn btn-ghost !h-10 !w-10 !p-0" disabled={revealed || m.tick === 0} onClick={() => reset(policy)} aria-label="Start over" title="Start over">
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-3 flex min-h-8 flex-wrap items-center gap-1" aria-label="Request history">
        {m.history.length === 0 && <span className="text-xs text-ink-3">Requests will appear here: green is a hit, outlined is a miss.</span>}
        {m.history.map((h, i) => (
          <span key={i} className={`grid h-7 min-w-7 place-items-center rounded-md border px-1 font-mono text-xs font-semibold ${h.hit ? "border-transparent bg-primary text-primary-ink" : "border-[var(--line-strong)] bg-surface text-ink"}`}>
            {h.key}
          </span>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Readout label="Hits" value={m.hits} accent={m.hits > 0} />
        <Readout label="Misses" value={m.misses} />
        <Readout label="Hit rate" value={m.hits + m.misses === 0 ? "-" : `${Math.round((100 * m.hits) / (m.hits + m.misses))}%`} />
      </div>
      <Note tone={last?.evicted ? "bad" : "plain"}>
        {!last
          ? "Nothing requested yet."
          : last.hit
            ? `${last.key} was already there: a hit.`
            : last.evicted
              ? `${last.key} was missing and the cache was full, so ${last.evicted} was thrown out to make room.`
              : `${last.key} was missing: it is loaded into a free slot.`}
      </Note>
    </div>
  );
}

export function checkEvict(state: unknown, goal: Record<string, unknown>) {
  const s = state as EvictState | undefined;
  if (!s) return false;
  if (typeof goal.lastEvicted === "string" && s.lastEvicted !== goal.lastEvicted) return false;
  if (typeof goal.policy === "string" && s.policy !== goal.policy) return false;
  if (typeof goal.hitsMin === "number" && !(s.hits >= goal.hitsMin)) return false;
  if (typeof goal.missesMax === "number" && !(s.misses <= goal.missesMax)) return false;
  if (typeof goal.requests === "number" && s.requests !== goal.requests) return false;
  if (Array.isArray(goal.contents) && [...(goal.contents as string[])].sort().join() !== s.contents.join()) return false;
  return true;
}
