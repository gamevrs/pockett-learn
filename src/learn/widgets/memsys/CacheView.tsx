"use client";

import React, { useState } from "react";
import { RotateCcw } from "lucide-react";
import type { WidgetProps } from "@/learn/widget";
import { runCache, splitAddr, type CacheCfg, type MissKind } from "./cachesim";
import { Btn, Caption, Note, Readout, Seg, Stepper, hex } from "./ui";

// ───────────────────────────── memsys-addr: tag / index / offset ─────────────────────────────

export interface AddrProps {
  lineBytes?: number;
  /** log2 of the number of sets. */
  setBits?: number;
  ways?: number;
  addr?: number;
  /** Lock the cache shape controls. */
  lockShape?: boolean;
}

export interface AddrState {
  lineBytes: number;
  sets: number;
  ways: number;
  addr: number;
  tag: number;
  index: number;
  offset: number;
  tagBits: number;
  indexBits: number;
  offsetBits: number;
  cacheBytes: number;
}

const ABITS = 16;
const bin16 = (n: number) => (n & 0xffff).toString(2).padStart(ABITS, "0");

export function Addr({ props, onChange, revealed }: WidgetProps<AddrProps>) {
  const [lineBytes, setLineBytes] = useState(props.lineBytes ?? 64);
  const [setBits, setSetBits] = useState(props.setBits ?? 2);
  const [ways, setWays] = useState(props.ways ?? 2);
  const [addr, setAddr] = useState(props.addr ?? 0x1234);
  const [text, setText] = useState((props.addr ?? 0x1234).toString(16).toUpperCase().padStart(4, "0"));
  const locked = Boolean(revealed);
  const sets = 2 ** setBits;
  const cfg: CacheCfg = { lineBytes, sets, ways };
  const sp = splitAddr(addr, cfg, ABITS);
  const bits = bin16(addr);
  const tagPart = bits.slice(0, sp.tagBits);
  const idxPart = bits.slice(sp.tagBits, sp.tagBits + sp.indexBits);
  const offPart = bits.slice(sp.tagBits + sp.indexBits);

  const build = (lb: number, sb: number, w: number, a: number): AddrState => {
    const c = { lineBytes: lb, sets: 2 ** sb, ways: w };
    const s = splitAddr(a, c, ABITS);
    return { lineBytes: lb, sets: 2 ** sb, ways: w, addr: a, tag: s.tag, index: s.index, offset: s.offset, tagBits: s.tagBits, indexBits: s.indexBits, offsetBits: s.offsetBits, cacheBytes: lb * 2 ** sb * w };
  };
  const apply = (lb: number, sb: number, w: number, a: number) => {
    a = ((a % 65536) + 65536) % 65536;
    setLineBytes(lb);
    setSetBits(sb);
    setWays(w);
    setAddr(a);
    setText(a.toString(16).toUpperCase().padStart(4, "0"));
    onChange?.(build(lb, sb, w, a));
  };
  const typed = (v: string) => {
    const clean = v.replace(/[^0-9a-fA-F]/g, "").slice(0, 4);
    setText(clean.toUpperCase());
    if (clean === "") return;
    const a = parseInt(clean, 16);
    setAddr(a);
    onChange?.(build(lineBytes, setBits, ways, a));
  };

  const box = (b: string, tone: "tag" | "idx" | "off", key: string) => (
    <span
      key={key}
      className={`grid h-8 min-w-0 flex-1 place-items-center rounded-[5px] border font-mono text-[12px] font-semibold ${
        tone === "tag" ? "border-line bg-surface-2 text-ink-2" : tone === "idx" ? "border-transparent bg-primary text-primary-ink" : "border-[var(--brand)] bg-tint text-ink"
      }`}
    >
      {b}
    </span>
  );

  return (
    <div className="w-full">
      {!props.lockShape && (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-ink-3">Line size</span>
              <Seg
                label="Line size in bytes"
                value={lineBytes}
                onChange={(v) => apply(v, setBits, ways, addr)}
                disabled={locked}
                options={[16, 32, 64, 128].map((v) => ({ value: v, label: `${v}` }))}
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-ink-3">Ways</span>
              <Seg label="Ways per set" value={ways} onChange={(v) => apply(lineBytes, setBits, v, addr)} disabled={locked} options={[1, 2, 4, 8].map((v) => ({ value: v, label: `${v}` }))} />
            </div>
          </div>
          <div className="flex items-center justify-center gap-2">
            <span className="text-xs text-ink-3">Sets</span>
            <Stepper label="Sets (power of two)" value={setBits} min={0} max={6} onChange={(v) => apply(lineBytes, v, ways, addr)} disabled={locked} format={(v) => String(2 ** v)} />
          </div>
        </div>
      )}
      <p className="mt-2 text-center text-xs text-ink-3">
        {sets} sets × {ways} way{ways > 1 ? "s" : ""} × {lineBytes} bytes = <b className="text-ink">{sets * ways * lineBytes} bytes</b> of cache (toy size; 16-bit addresses)
      </p>

      <div className="mt-3 rounded-xl border border-line bg-surface p-3">
        <label className="flex items-center justify-center gap-2 text-sm text-ink-2">
          Address 0x
          <input
            value={text}
            onChange={(e) => typed(e.target.value)}
            disabled={locked}
            inputMode="text"
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            maxLength={4}
            aria-label="Address in hexadecimal"
            className="h-10 w-24 rounded-lg border border-line bg-surface-2 px-2 text-center font-mono text-base font-semibold text-ink"
          />
        </label>
        <div className="mt-2.5 flex gap-[3px]" role="img" aria-label={`Address ${hex(addr)} in binary: tag ${tagPart || "none"}, index ${idxPart || "none"}, offset ${offPart}`}>
          {tagPart.split("").map((b, i) => box(b, "tag", `t${i}`))}
          {idxPart.split("").map((b, i) => box(b, "idx", `i${i}`))}
          {offPart.split("").map((b, i) => box(b, "off", `o${i}`))}
        </div>
        <div className="mt-1.5 flex gap-[3px] text-[11px] font-medium text-ink-2">
          <span style={{ flex: Math.max(sp.tagBits, 0.0001) }} className="min-w-0 text-center">{sp.tagBits > 0 ? `tag · ${sp.tagBits}` : ""}</span>
          <span style={{ flex: Math.max(sp.indexBits, 0.0001) }} className="min-w-0 text-center text-brand">{sp.indexBits > 0 ? `index · ${sp.indexBits}` : ""}</span>
          <span style={{ flex: sp.offsetBits }} className="min-w-0 text-center">offset · {sp.offsetBits}</span>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        <Readout label="Tag" value={hex(sp.tag, 1)} />
        <Readout label="Set" value={sp.index} accent />
        <Readout label="Byte in line" value={sp.offset} />
      </div>
      <div className="mt-2 flex flex-wrap justify-center gap-2">
        <Btn onClick={() => apply(lineBytes, setBits, ways, addr + 1)} disabled={locked}>
          +1 byte
        </Btn>
        <Btn onClick={() => apply(lineBytes, setBits, ways, addr + lineBytes)} disabled={locked}>
          +1 line
        </Btn>
        <Btn onClick={() => apply(lineBytes, setBits, ways, addr + lineBytes * sets)} disabled={locked}>
          +1 lap ({lineBytes * sets})
        </Btn>
      </div>
      <div className="mt-3">
        <Note>
          Address <b>{hex(addr)}</b> is byte <b>{sp.offset}</b> of its line. The line goes in <b>set {sp.index}</b> (any of its {ways} way{ways > 1 ? "s" : ""}); the tag <b>{hex(sp.tag, 1)}</b> tells it apart from the other lines that map to the same set.
        </Note>
      </div>
    </div>
  );
}

/** goal: any of tag / index / offset / lineBytes / sets / ways / addr, matched exactly. */
export function checkAddr(state: unknown, goal: Record<string, unknown>) {
  const s = state as AddrState | undefined;
  if (!s) return false;
  let any = false;
  for (const k of ["tag", "index", "offset", "lineBytes", "sets", "ways", "addr", "tagBits", "indexBits", "offsetBits", "cacheBytes"] as const) {
    if (typeof goal[k] === "number") {
      any = true;
      if (s[k] !== goal[k]) return false;
    }
  }
  return any;
}

// ───────────────────────────── memsys-cache: set-associative cache simulator ─────────────────────────────

export interface CachePalette {
  name: string;
  addr: number;
}

export interface CacheSimProps {
  /** Total lines in the cache (ways × sets). Default 8. */
  lines?: number;
  lineBytes?: number;
  ways?: number;
  /** Tappable named lines. */
  palette?: CachePalette[];
  /** Scripted reads (addresses). A Next button walks them; the palette is hidden. */
  sequence?: number[];
  /** Offer the way count as a choice (1, 2, 4 ... up to `lines`). */
  chooseWays?: boolean;
  /** Show the miss-kind counters (compulsory / capacity / conflict). */
  showKinds?: boolean;
}

export interface CacheSimState {
  ways: number;
  sets: number;
  accesses: number;
  hits: number;
  misses: number;
  kinds: Record<MissKind, number>;
  lastHit: boolean | null;
  done: boolean;
  log: number[];
}

export function CacheSim({ props, onChange, revealed }: WidgetProps<CacheSimProps>) {
  const lines = props.lines ?? 8;
  const lineBytes = props.lineBytes ?? 16;
  const [ways, setWays] = useState(props.ways ?? 1);
  const [log, setLog] = useState<number[]>([]);
  const locked = Boolean(revealed);
  const sets = Math.max(1, lines / ways);
  const cfg: CacheCfg = { lineBytes, ways, sets };
  const run = runCache(cfg, log);
  const last = run.steps[run.steps.length - 1];
  const palette = props.palette ?? [];
  const nameOf = (line: number) => palette.find((p) => Math.floor(p.addr / lineBytes) === line)?.name ?? `#${line}`;
  const seq = props.sequence;
  const waysOptions = [1, 2, 4, 8, 16].filter((w) => w <= lines);

  const emit = (w: number, l: number[]) => {
    const c = { lineBytes, ways: w, sets: Math.max(1, lines / w) };
    const r = runCache(c, l);
    onChange?.({
      ways: w,
      sets: c.sets,
      accesses: l.length,
      hits: r.hits,
      misses: r.misses,
      kinds: r.kinds,
      lastHit: r.steps.length ? r.steps[r.steps.length - 1].hit : null,
      done: seq ? l.length >= seq.length : false,
      log: l,
    } satisfies CacheSimState);
  };
  const access = (a: number) => {
    if (locked) return;
    const l = [...log, a];
    setLog(l);
    emit(ways, l);
  };
  const reset = () => {
    setLog([]);
    emit(ways, []);
  };
  const pickWays = (w: number) => {
    setWays(w);
    setLog([]);
    emit(w, []);
  };

  const note = !last
    ? seq
      ? "Press Next access to send the reads in the list."
      : "Tap a named line to read it. The cache starts empty."
    : last.hit
      ? `${nameOf(last.line)}: hit in set ${last.set}.`
      : `${nameOf(last.line)}: ${last.kind} miss. It maps to set ${last.set}${last.evictedLine !== null ? `, which was full, so ${nameOf(last.evictedLine)} (the least recently used) was evicted` : ", which had a free way"}.`;

  const nextA = seq && log.length < seq.length ? seq[log.length] : null;

  return (
    <div className="w-full">
      {props.chooseWays && (
        <div className="mb-2 flex items-center justify-center gap-2">
          <span className="text-xs text-ink-3">Ways per set</span>
          <Seg label="Ways per set" value={ways} onChange={pickWays} disabled={locked} options={waysOptions.map((w) => ({ value: w, label: w === 1 ? "1 (direct)" : w === lines ? `${w} (full)` : `${w}` }))} />
        </div>
      )}
      <p className="mb-1.5 text-center text-xs text-ink-3">
        {sets} set{sets > 1 ? "s" : ""} × {ways} way{ways > 1 ? "s" : ""} = {lines} lines of {lineBytes} bytes
      </p>

      {seq && (
        <div className="mb-3 flex flex-wrap items-center justify-center gap-1.5" aria-label="Reads to do">
          {seq.map((a, i) => {
            const st = run.steps[i];
            return (
              <span
                key={i}
                className={`grid h-8 min-w-8 place-items-center rounded-md border px-1.5 font-mono text-sm font-semibold ${
                  st ? (st.hit ? "border-transparent bg-primary text-primary-ink" : "border-[var(--bad)]/60 bg-surface text-bad") : i === log.length ? "border-[var(--brand)] bg-tint text-ink" : "border-line bg-surface text-ink-3"
                }`}
                title={st ? (st.hit ? "hit" : "miss") : undefined}
              >
                {nameOf(Math.floor(a / lineBytes))}
              </span>
            );
          })}
        </div>
      )}

      <div className="space-y-1.5 rounded-xl border border-line bg-surface-2 p-2">
        {run.sets.map((row, si) => (
          <div key={si} className="flex items-stretch gap-1.5">
            <span className="grid w-10 shrink-0 place-items-center rounded-md bg-surface font-mono text-[11px] text-ink-3">set {si}</span>
            <div className="grid min-w-0 flex-1 gap-1" style={{ gridTemplateColumns: `repeat(${row.length}, minmax(0, 1fr))` }}>
              {row.map((w, wi) => {
                const line = w.tag === null ? null : w.tag * sets + si;
                const touchedNow = last && last.set === si && last.way === wi;
                const lruWay = row.every((x) => x.tag !== null) ? row.reduce((m, x, i) => (x.used < row[m].used ? i : m), 0) : -1;
                return (
                  <div
                    key={wi}
                    className={`relative grid min-h-10 place-items-center rounded-md border font-mono text-[0.85rem] font-semibold ${
                      touchedNow ? (last.hit ? "border-transparent bg-primary text-primary-ink" : "border-[var(--bad)] bg-surface text-ink") : w.tag === null ? "border-dashed border-[var(--line-strong)] text-ink-3" : "border-line bg-surface text-ink"
                    }`}
                    aria-label={line === null ? `Set ${si} way ${wi}: empty` : `Set ${si} way ${wi}: ${nameOf(line)}${wi === lruWay ? ", least recently used" : ""}`}
                  >
                    {line === null ? "–" : nameOf(line)}
                    {wi === lruWay && row.length > 1 && <span className="absolute -top-1.5 right-0.5 rounded-full border border-line bg-surface px-1 text-[9px] font-medium text-ink-3">LRU</span>}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {!seq && palette.length > 0 && (
        <div className="mt-3">
          <Caption className="mb-1.5 text-center">Tap a line to read it</Caption>
          <div className="flex flex-wrap justify-center gap-1.5">
            {palette.map((p) => {
              const sp = splitAddr(p.addr, cfg, 16);
              return (
                <button
                  key={p.name}
                  type="button"
                  disabled={locked}
                  onClick={() => access(p.addr)}
                  aria-label={`Read line ${p.name} at address ${hex(p.addr)}, maps to set ${sp.index}`}
                  className="flex min-h-12 min-w-12 flex-col items-center justify-center rounded-lg border border-line bg-surface px-2 font-mono transition-colors enabled:hover:border-[var(--line-strong)] enabled:hover:bg-surface-2 disabled:opacity-50"
                >
                  <span className="text-sm font-semibold text-ink">{p.name}</span>
                  <span className="text-[10px] text-ink-3">set {sp.index}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-3">
        <Note tone={last ? "accent" : "plain"}>{note}</Note>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        <Readout label="Reads" value={log.length} />
        <Readout label="Hits" value={run.hits} />
        <Readout label="Misses" value={run.misses} accent={run.misses > 0} />
        {props.showKinds && (
          <>
            <Readout label="Compulsory" value={run.kinds.compulsory} />
            <Readout label="Capacity" value={run.kinds.capacity} />
            <Readout label="Conflict" value={run.kinds.conflict} />
          </>
        )}
      </div>
      <div className="mt-3 flex justify-center gap-2">
        <Btn onClick={reset} disabled={locked || log.length === 0}>
          <RotateCcw className="h-4 w-4" /> Reset
        </Btn>
        {seq && (
          <Btn primary onClick={() => nextA !== null && access(nextA)} disabled={locked || nextA === null}>
            Next access
          </Btn>
        )}
      </div>
    </div>
  );
}

/** goal: { ways, minReads, maxMisses, done, maxConflict, minHits } */
export function checkCacheSim(state: unknown, goal: Record<string, unknown>) {
  const s = state as CacheSimState | undefined;
  if (!s) return false;
  if (typeof goal.ways === "number" && s.ways !== goal.ways) return false;
  if (typeof goal.minReads === "number" && s.accesses < goal.minReads) return false;
  if (typeof goal.maxMisses === "number" && s.misses > goal.maxMisses) return false;
  if (typeof goal.minHits === "number" && s.hits < goal.minHits) return false;
  if (typeof goal.minConflict === "number" && s.kinds.conflict < goal.minConflict) return false;
  if (typeof goal.maxConflict === "number" && s.kinds.conflict > goal.maxConflict) return false;
  if (typeof goal.minCapacity === "number" && s.kinds.capacity < goal.minCapacity) return false;
  if (goal.done === true && !s.done) return false;
  return true;
}
