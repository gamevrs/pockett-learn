"use client";

import React, { useState } from "react";
import { ChevronRight, Lock, RotateCcw } from "lucide-react";
import type { WidgetProps } from "@/learn/widget";
import { Btn, Caption, Icon, Note, Readout } from "./ui";

export interface CacheProps {
  /** Cache slots (1–6). Default 4. */
  slots?: number;
  /** RAM addresses (8–16). Default 16. */
  size?: number;
  /** Scripted reads: a "Next read" button walks through these addresses instead of tapping RAM. */
  sequence?: number[];
  /** Lock the controls until the step's question is answered. */
  predict?: boolean;
  hitNs?: number;
  missNs?: number;
}

interface Slot {
  addr: number;
  used: number;
}

export interface CacheState {
  reads: number;
  hits: number;
  misses: number;
  time: number;
  log: { addr: number; hit: boolean }[];
  /** Scripted mode: every read in the sequence has been done. */
  done: boolean;
}

const valueAt = (a: number) => (a * 37 + 11) % 100;

/** A tiny cache in front of RAM: repeat reads hit the cache and get fast; new ones miss and evict the oldest. */
export function Cache({ props, onChange, revealed }: WidgetProps<CacheProps>) {
  const nSlots = Math.min(6, Math.max(1, props.slots ?? 4));
  const size = Math.min(16, Math.max(8, props.size ?? 16));
  const hitNs = props.hitNs ?? 1;
  const missNs = props.missNs ?? 100;
  const seq = props.sequence;
  const [slots, setSlots] = useState<(Slot | null)[]>(() => Array.from({ length: nSlots }, () => null));
  const [stats, setStats] = useState<CacheState>({ reads: 0, hits: 0, misses: 0, time: 0, log: [], done: false });
  const [flash, setFlash] = useState<{ addr: number; hit: boolean; slot: number; evicted: number | null } | null>(null);
  const locked = Boolean(props.predict && !revealed);

  const read = (addr: number) => {
    if (locked) return;
    const clock = stats.reads + 1;
    const at = slots.findIndex((s) => s?.addr === addr);
    const next = slots.slice();
    let slot = at;
    let evicted: number | null = null;
    const hit = at >= 0;
    if (hit) next[at] = { addr, used: clock };
    else {
      const free = next.findIndex((s) => s === null);
      if (free >= 0) slot = free;
      else {
        slot = 0;
        for (let i = 1; i < next.length; i++) if (next[i]!.used < next[slot]!.used) slot = i;
        evicted = next[slot]!.addr;
      }
      next[slot] = { addr, used: clock };
    }
    const reads = stats.reads + 1;
    const ns: CacheState = {
      reads,
      hits: stats.hits + (hit ? 1 : 0),
      misses: stats.misses + (hit ? 0 : 1),
      time: stats.time + (hit ? hitNs : missNs),
      log: [...stats.log, { addr, hit }],
      done: seq ? reads >= seq.length : false,
    };
    setSlots(next);
    setStats(ns);
    setFlash({ addr, hit, slot, evicted });
    onChange?.(ns);
  };
  const reset = () => {
    setSlots(Array.from({ length: nSlots }, () => null));
    const ns = { reads: 0, hits: 0, misses: 0, time: 0, log: [], done: false };
    setStats(ns);
    setFlash(null);
    onChange?.(ns);
  };

  const oldest = slots.every((s) => s) ? slots.reduce((m, s, i) => (s!.used < slots[m]!.used ? i : m), 0) : -1;
  const nextAddr = seq && stats.reads < seq.length ? seq[stats.reads] : null;

  return (
    <div className="w-full">
      {seq && (
        <div className="mb-3 flex flex-wrap items-center justify-center gap-1.5" aria-label="Reads to do">
          <span className="mr-1 text-xs text-ink-3">Reads:</span>
          {seq.map((a, i) => {
            const doneHere = i < stats.reads;
            const entry = stats.log[i];
            return (
              <span
                key={i}
                className={`grid h-8 min-w-8 place-items-center rounded-md border px-1.5 font-mono text-sm font-semibold ${
                  doneHere ? (entry?.hit ? "border-transparent bg-primary text-primary-ink" : "border-[var(--line-strong)] bg-surface-2 text-ink-2") : i === stats.reads ? "border-[var(--brand)] bg-tint text-ink" : "border-line bg-surface text-ink-3"
                }`}
                title={doneHere ? (entry?.hit ? "hit" : "miss") : undefined}
              >
                {a}
              </span>
            );
          })}
        </div>
      )}

      <div className="grid gap-2 sm:grid-cols-[auto_1fr] sm:items-stretch">
        <div className="flex items-center gap-2 rounded-xl border border-line bg-surface-2 px-3 py-2 sm:flex-col sm:justify-center sm:px-4">
          <span className="text-brand">
            <Icon name="cpu" className="h-5 w-5" />
          </span>
          <p className="text-sm font-semibold text-ink">CPU</p>
          <p className="ml-auto font-mono text-xs text-ink-2 sm:ml-0">{flash ? `wants ${flash.addr}` : "idle"}</p>
        </div>
        <div className="rounded-xl border border-line bg-surface-2 p-2.5">
          <div className="mb-1.5 flex items-baseline justify-between">
            <Caption>Cache · {nSlots} slots · {hitNs} ns</Caption>
            <span className="text-[10.5px] text-ink-3">keeps recent reads</span>
          </div>
          <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${nSlots}, minmax(0, 1fr))` }}>
            {slots.map((s, i) => {
              const lit = flash?.slot === i;
              return (
                <div
                  key={i}
                  className={`relative flex min-h-12 flex-col items-center justify-center rounded-lg border font-mono transition-colors ${
                    lit && flash?.hit ? "border-transparent bg-primary text-primary-ink" : lit ? "border-[var(--brand)] bg-tint text-ink" : s ? "border-line bg-surface text-ink" : "border-dashed border-[var(--line-strong)] text-ink-3"
                  }`}
                >
                  {s ? (
                    <>
                      <span className="text-[10px] opacity-70">addr {s.addr}</span>
                      <span className="text-sm font-semibold">{valueAt(s.addr)}</span>
                    </>
                  ) : (
                    <span className="text-[11px]">empty</span>
                  )}
                  {oldest === i && !lit && <span className="absolute -top-2 rounded-full border border-line bg-surface px-1.5 text-[9px] text-ink-3">oldest</span>}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-2 rounded-xl border border-line bg-surface p-2.5">
        <div className="mb-1.5 flex items-baseline justify-between">
          <Caption>Memory (RAM) · {missNs} ns</Caption>
          {!seq && <span className="text-[10.5px] text-ink-3">tap an address to read it</span>}
        </div>
        <div className="grid grid-cols-4 gap-1 sm:grid-cols-8">
          {Array.from({ length: size }, (_, a) => {
            const fetched = flash && !flash.hit && flash.addr === a;
            return (
              <button
                key={a}
                type="button"
                disabled={Boolean(seq) || locked}
                onClick={() => read(a)}
                aria-label={`Read address ${a}`}
                className={`flex min-h-10 flex-col items-center justify-center rounded-md border font-mono transition-colors disabled:cursor-default ${
                  fetched ? "border-[var(--brand)] bg-tint" : "border-line bg-surface-2 enabled:hover:border-[var(--line-strong)] enabled:hover:bg-surface"
                }`}
              >
                <span className="text-[9.5px] leading-none text-ink-3">{a}</span>
                <span className="text-[0.85rem] font-semibold leading-tight text-ink">{valueAt(a)}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-3">
        <Note tone={flash ? "accent" : "plain"}>
          {locked ? (
            <span className="inline-flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5" /> Make your prediction first, then play the reads.
            </span>
          ) : flash ? (
            flash.hit ? (
              <>
                <b>Hit.</b> Address {flash.addr} was already in the cache: {hitNs} ns.
              </>
            ) : (
              <>
                <b>Miss.</b> Address {flash.addr} wasn&apos;t in the cache, so it came from RAM: {missNs} ns. A copy now sits in the cache
                {flash.evicted !== null ? `, pushing out address ${flash.evicted}, the one used longest ago` : ""}.
              </>
            )
          ) : seq ? (
            "Press Next read to send each read in the list."
          ) : (
            "The cache starts empty. Read a few addresses, then read some of them again."
          )}
        </Note>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        <Readout label="Reads" value={stats.reads} />
        <Readout label="Hits" value={stats.hits} />
        <Readout label="Misses" value={stats.misses} />
        <Readout label="Total time" value={`${stats.time} ns`} accent />
      </div>
      <div className="mt-3 flex justify-center gap-2">
        <Btn onClick={reset} disabled={locked || stats.reads === 0}>
          <RotateCcw className="h-4 w-4" /> Reset
        </Btn>
        {seq && (
          <Btn primary onClick={() => nextAddr !== null && read(nextAddr)} disabled={locked || nextAddr === null}>
            Next read <ChevronRight className="h-4 w-4" />
          </Btn>
        )}
      </div>
    </div>
  );
}

/** goal: { minReads, maxTime } (enough reads, fast enough), { minHits }, or { done: true } (sequence finished). */
export function checkCache(state: unknown, goal: Record<string, unknown>) {
  const s = state as CacheState | undefined;
  if (!s) return false;
  if (typeof goal.minReads === "number" && s.reads < goal.minReads) return false;
  if (typeof goal.maxTime === "number" && s.time > goal.maxTime) return false;
  if (typeof goal.minHits === "number" && s.hits < goal.minHits) return false;
  if (goal.done === true && !s.done) return false;
  return true;
}
