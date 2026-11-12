"use client";

import React, { useState } from "react";
import { RotateCcw } from "lucide-react";
import type { WidgetProps } from "@/learn/widget";
import { PAGE_BITS, PAGE_SIZE, runSwap, runTlb, translate, type Pte } from "./vmsim";
import { Btn, Caption, Note, Readout, Seg, Slider, Stepper, fmtBytes, fmtNs, hex } from "./ui";

// ───────────────────────────── memsys-pagetable: virtual to physical ─────────────────────────────

const none: Pte = { present: false, writable: false, frame: 0 };
const mk = (entries: Record<number, [number, boolean]>): Pte[] =>
  Array.from({ length: 16 }, (_, i) => (entries[i] ? { present: true, writable: entries[i][1], frame: entries[i][0] } : none));

/** Two toy processes. Same virtual page, different physical frames. */
const TABLES: Record<string, Pte[]> = {
  A: mk({ 0: [4, false], 1: [9, true], 2: [2, true], 3: [11, true], 14: [6, true], 15: [7, true] }),
  B: mk({ 0: [12, false], 1: [5, true], 3: [8, true], 13: [3, true], 15: [13, true] }),
};

export interface PageTableProps {
  proc?: "A" | "B";
  addr?: number;
  write?: boolean;
  /** Show only one process (hide the switch). */
  lockProc?: boolean;
}

export interface PageTableState {
  proc: string;
  va: number;
  write: boolean;
  vpn: number;
  outcome: "ok" | "page-fault" | "protection";
  pa: number | null;
  frame: number | null;
}

export function PageTable({ props, onChange, revealed }: WidgetProps<PageTableProps>) {
  const [proc, setProc] = useState<"A" | "B">(props.proc ?? "A");
  const [va, setVa] = useState(props.addr ?? 0x1abc);
  const [text, setText] = useState((props.addr ?? 0x1abc).toString(16).toUpperCase().padStart(4, "0"));
  const [write, setWrite] = useState(Boolean(props.write));
  const locked = Boolean(revealed);
  const table = TABLES[proc];
  const tr = translate(table, va, write);

  const build = (p: "A" | "B", a: number, w: boolean): PageTableState => {
    const t = translate(TABLES[p], a, w);
    return { proc: p, va: a, write: w, vpn: t.vpn, outcome: t.ok ? "ok" : t.fault, pa: t.ok ? t.pa : null, frame: t.ok ? t.frame : null };
  };
  const apply = (p: "A" | "B", a: number, w: boolean) => {
    setProc(p);
    setVa(a);
    setWrite(w);
    setText(a.toString(16).toUpperCase().padStart(4, "0"));
    onChange?.(build(p, a, w));
  };
  const typed = (v: string) => {
    const clean = v.replace(/[^0-9a-fA-F]/g, "").slice(0, 4);
    setText(clean.toUpperCase());
    if (clean === "") return;
    const a = parseInt(clean, 16);
    setVa(a);
    onChange?.(build(proc, a, write));
  };
  const bits = va.toString(2).padStart(16, "0");

  return (
    <div className="w-full">
      <div className="flex flex-wrap items-center justify-center gap-2">
        {!props.lockProc && (
          <Seg
            label="Process"
            value={proc}
            onChange={(p) => apply(p, va, write)}
            disabled={locked}
            options={[
              { value: "A", label: "Process A" },
              { value: "B", label: "Process B" },
            ]}
          />
        )}
        <Seg
          label="Access type"
          value={write ? "w" : "r"}
          onChange={(v) => apply(proc, va, v === "w")}
          disabled={locked}
          options={[
            { value: "r", label: "Read" },
            { value: "w", label: "Write" },
          ]}
        />
      </div>

      <div className="mt-3 rounded-xl border border-line bg-surface p-3">
        <label className="flex items-center justify-center gap-2 text-sm text-ink-2">
          Virtual address 0x
          <input
            value={text}
            onChange={(e) => typed(e.target.value)}
            disabled={locked}
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            maxLength={4}
            aria-label="Virtual address in hexadecimal"
            className="h-10 w-24 rounded-lg border border-line bg-surface-2 px-2 text-center font-mono text-base font-semibold text-ink"
          />
        </label>
        <div className="mt-2.5 flex gap-[3px]" role="img" aria-label={`Binary ${bits}: page number ${bits.slice(0, 4)}, offset ${bits.slice(4)}`}>
          {bits.split("").map((b, i) => (
            <span
              key={i}
              className={`grid h-8 min-w-0 flex-1 place-items-center rounded-[5px] border font-mono text-[12px] font-semibold ${i < 4 ? "border-transparent bg-primary text-primary-ink" : "border-line bg-surface-2 text-ink-2"}`}
            >
              {b}
            </span>
          ))}
        </div>
        <div className="mt-1.5 flex gap-[3px] text-[11px] font-medium text-ink-2">
          <span style={{ flex: 4 }} className="text-center text-brand">
            page number · 4
          </span>
          <span style={{ flex: 12 }} className="text-center">
            offset in page · 12
          </span>
        </div>
      </div>

      <div className="mt-3">
        <Caption className="mb-1.5">Page table of process {proc} · tap a row to aim at that page</Caption>
        <div className="grid grid-cols-4 gap-1.5">
          {table.map((e, i) => (
            <button
              key={i}
              type="button"
              disabled={locked}
              onClick={() => apply(proc, (i << PAGE_BITS) | (va & (PAGE_SIZE - 1)), write)}
              aria-label={`Page ${i}: ${e.present ? `frame ${e.frame}, ${e.writable ? "read and write" : "read only"}` : "not mapped"}`}
              className={`flex min-h-11 flex-col items-center justify-center rounded-lg border px-1 py-1 font-mono text-[11px] leading-tight transition-colors ${
                tr.vpn === i ? "border-[var(--brand)] bg-tint text-ink" : "border-line bg-surface-2 text-ink-2 hover:border-[var(--line-strong)]"
              }`}
            >
              <span className="font-semibold">page {i}</span>
              <span>{e.present ? `→ frame ${e.frame}` : "unmapped"}</span>
              <span className="text-ink-3">{e.present ? (e.writable ? "read+write" : "read only") : "–"}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3">
        <Note tone="accent">
          <b>1.</b> Split {hex(va)}: page <b>{tr.vpn}</b>, offset <b>{hex(tr.offset, 3)}</b>. <b>2.</b> Look up page {tr.vpn} in process {proc}&apos;s table.{" "}
          {tr.ok ? (
            <>
              <b>3.</b> It maps to frame <b>{tr.frame}</b> ({write ? "write allowed" : "read allowed"}). Physical address = {tr.frame} × {PAGE_SIZE} + {tr.offset} = <b>{hex(tr.pa)}</b>.
            </>
          ) : tr.fault === "page-fault" ? (
            <>
              <b>3. Page fault.</b> Page {tr.vpn} is not mapped. The hardware stops the instruction and the operating system takes over.
            </>
          ) : (
            <>
              <b>3. Protection fault.</b> Page {tr.vpn} is mapped but read-only, and this is a write. The access is refused.
            </>
          )}
        </Note>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        <Readout label="Result" value={tr.ok ? hex(tr.pa) : tr.fault === "page-fault" ? "page fault" : "protection fault"} accent={tr.ok} />
      </div>
    </div>
  );
}

/** goal: { proc, outcome, vpn, pa, write } */
export function checkPageTable(state: unknown, goal: Record<string, unknown>) {
  const s = state as PageTableState | undefined;
  if (!s) return false;
  let any = false;
  for (const k of ["proc", "outcome", "vpn", "pa", "write", "frame"] as const) {
    if (k in goal) {
      any = true;
      if (s[k] !== goal[k]) return false;
    }
  }
  return any;
}

// ───────────────────────────── memsys-tlb: the translation cache ─────────────────────────────

export interface TlbProps {
  entries?: number;
  /** log2 of the region size to start with (22 = 4 MiB). */
  exp?: number;
  pageBytes?: number;
  pattern?: "scan" | "random";
}

export interface TlbWidgetState {
  pageBytes: number;
  exp: number;
  pattern: string;
  missRate: number;
  misses: number;
  accesses: number;
  reachBytes: number;
  regionBytes: number;
}

const WALK_NS = 30;

export function Tlb({ props, onChange, revealed }: WidgetProps<TlbProps>) {
  const entries = props.entries ?? 64;
  const [pageBytes, setPageBytes] = useState(props.pageBytes ?? 4096);
  const [exp, setExp] = useState(props.exp ?? 24);
  const [pattern, setPattern] = useState<"scan" | "random">(props.pattern ?? "random");
  const locked = Boolean(revealed);
  const region = 2 ** exp;
  const run = runTlb({ pageBytes, entries, regionBytes: region, pattern, stride: 64, passes: 2 });
  const fits = region <= run.reachBytes;

  const report = (pb: number, e: number, pat: "scan" | "random") => {
    const r = runTlb({ pageBytes: pb, entries, regionBytes: 2 ** e, pattern: pat, stride: 64, passes: 2 });
    onChange?.({ pageBytes: pb, exp: e, pattern: pat, missRate: r.missRate, misses: r.tlbMisses, accesses: r.accesses, reachBytes: r.reachBytes, regionBytes: 2 ** e } satisfies TlbWidgetState);
  };
  const upd = (pb: number, e: number, pat: "scan" | "random") => {
    setPageBytes(pb);
    setExp(e);
    setPattern(pat);
    report(pb, e, pat);
  };

  const reachFrac = Math.min(1, run.reachBytes / region);

  return (
    <div className="w-full">
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Seg
          label="Page size"
          value={pageBytes}
          onChange={(pb) => upd(pb, exp, pattern)}
          disabled={locked}
          options={[
            { value: 4096, label: "4 KiB pages" },
            { value: 2 * 1024 * 1024, label: "2 MiB huge pages" },
          ]}
        />
        <Seg
          label="Access pattern"
          value={pattern}
          onChange={(p) => upd(pageBytes, exp, p)}
          disabled={locked}
          options={[
            { value: "scan", label: "Walk in order" },
            { value: "random", label: "Jump around" },
          ]}
        />
      </div>
      <Slider className="mt-2" label="Memory the program touches" value={exp} min={18} max={32} step={1} onChange={(e) => upd(pageBytes, e, pattern)} disabled={locked} format={(v) => fmtBytes(2 ** v)} />

      <div className="mt-3 rounded-xl border border-line bg-surface p-3">
        <Caption className="mb-1.5">
          TLB reach: {entries} entries × {fmtBytes(pageBytes)} = {fmtBytes(run.reachBytes)}
        </Caption>
        <div className="relative h-5 w-full overflow-hidden rounded-full bg-[var(--line-strong)]" role="img" aria-label={`The TLB covers ${Math.round(reachFrac * 100)} percent of the memory touched`}>
          <div className="h-full rounded-full" style={{ width: `${reachFrac * 100}%`, background: "var(--brand)" }} />
        </div>
        <p className="mt-1.5 text-[0.82rem] text-ink-2">
          {fits ? "Everything touched fits inside the TLB's reach: after the first visits, no page-table walks." : `The TLB covers only ${(reachFrac * 100).toFixed(reachFrac < 0.1 ? 1 : 0)}% of what the program touches.`}
        </p>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        <Readout label="Pages touched" value={run.pages.toLocaleString("en-US")} />
        <Readout label="TLB miss rate" value={`${(run.missRate * 100).toFixed(run.missRate < 0.1 ? 2 : 0)}%`} accent />
        <Readout label="Walk cost / access" value={fmtNs(run.missRate * WALK_NS)} />
      </div>
      <div className="mt-3">
        <Note>
          Toy numbers: a TLB hit is free, a miss costs a {WALK_NS} ns page-table walk (real walks run from a few ns to a few hundred, depending on whether the page-table entries are in cache). {entries}-entry fully associative TLB, 64-byte reads
          {pattern === "scan" ? ", two passes over the memory." : ", random places."}
        </Note>
      </div>
    </div>
  );
}

/** goal: { maxMissRate, pageBytes, pattern, minExp } */
export function checkTlb(state: unknown, goal: Record<string, unknown>) {
  const s = state as TlbWidgetState | undefined;
  if (!s) return false;
  if (typeof goal.maxMissRate === "number" && s.missRate > goal.maxMissRate) return false;
  if (typeof goal.pageBytes === "number" && s.pageBytes !== goal.pageBytes) return false;
  if (typeof goal.pattern === "string" && s.pattern !== goal.pattern) return false;
  if (typeof goal.minExp === "number" && s.exp < goal.minExp) return false;
  return true;
}

// ───────────────────────────── memsys-swap: page faults and swapping ─────────────────────────────

export interface SwapProps {
  frames?: number;
  /** Pages the learner can touch (default 0 to 6). */
  pages?: number;
  /** Scripted touches; a Next button walks them. */
  sequence?: number[];
  /** Offer a frames stepper. */
  chooseFrames?: boolean;
}

export interface SwapState {
  frames: number;
  touches: number;
  minor: number;
  major: number;
  hits: number;
  disk: string;
  stallNs: number;
  done: boolean;
}

const MINOR_NS = 1_000;
const DISK_NS: Record<string, number> = { ssd: 100_000, hdd: 10_000_000 };

export function Swap({ props, onChange, revealed }: WidgetProps<SwapProps>) {
  const [frames, setFrames] = useState(props.frames ?? 3);
  const [log, setLog] = useState<number[]>([]);
  const [disk, setDisk] = useState("ssd");
  const locked = Boolean(revealed);
  const nPages = props.pages ?? 6;
  const seq = props.sequence;
  const run = runSwap(frames, log);
  const last = run.steps[run.steps.length - 1];

  const emit = (f: number, l: number[], d: string) => {
    const r = runSwap(f, l);
    onChange?.({ frames: f, touches: l.length, minor: r.minor, major: r.major, hits: r.hits, disk: d, stallNs: r.minor * MINOR_NS + r.major * DISK_NS[d], done: seq ? l.length >= seq.length : false } satisfies SwapState);
  };
  const touch = (p: number) => {
    if (locked) return;
    const l = [...log, p];
    setLog(l);
    emit(frames, l, disk);
  };
  const reset = () => {
    setLog([]);
    emit(frames, [], disk);
  };
  const pickFrames = (f: number) => {
    setFrames(f);
    setLog([]);
    emit(f, [], disk);
  };
  const pickDisk = (d: string) => {
    setDisk(d);
    emit(frames, log, d);
  };
  const nextP = seq && log.length < seq.length ? seq[log.length] : null;
  const stall = run.minor * MINOR_NS + run.major * DISK_NS[disk];

  return (
    <div className="w-full">
      {props.chooseFrames && (
        <div className="mb-2 flex items-center justify-center gap-2">
          <span className="text-xs text-ink-3">RAM frames for this program</span>
          <Stepper label="RAM frames" value={frames} min={1} max={6} onChange={pickFrames} disabled={locked} />
        </div>
      )}
      {seq && (
        <div className="mb-3 flex flex-wrap items-center justify-center gap-1.5" aria-label="Pages to touch">
          {seq.map((p, i) => {
            const st = run.steps[i];
            return (
              <span
                key={i}
                className={`grid h-8 min-w-8 place-items-center rounded-md border px-1.5 font-mono text-sm font-semibold ${
                  st ? (st.kind === "hit" ? "border-transparent bg-primary text-primary-ink" : st.kind === "minor" ? "border-[var(--brand)] bg-tint text-ink" : "border-[var(--bad)]/60 bg-surface text-bad") : i === log.length ? "border-[var(--brand)] bg-tint text-ink" : "border-line bg-surface text-ink-3"
                }`}
                title={st?.kind}
              >
                {p}
              </span>
            );
          })}
        </div>
      )}

      <div className="rounded-xl border border-line bg-surface-2 p-2">
        <Caption className="mb-1.5">RAM · {frames} frame{frames > 1 ? "s" : ""} (oldest use on the left)</Caption>
        <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${frames}, minmax(0, 1fr))` }}>
          {Array.from({ length: frames }, (_, i) => {
            const p = run.resident[i];
            return (
              <div key={i} className={`grid min-h-11 place-items-center rounded-md border font-mono text-sm font-semibold ${p === undefined ? "border-dashed border-[var(--line-strong)] text-ink-3" : last && last.page === p ? "border-transparent bg-primary text-primary-ink" : "border-line bg-surface text-ink"}`}>
                {p === undefined ? "free" : `page ${p}`}
              </div>
            );
          })}
        </div>
      </div>
      <div className="mt-2 rounded-xl border border-line bg-surface p-2">
        <Caption className="mb-1">Swap on the {disk === "ssd" ? "SSD" : "hard disk"} · pages pushed out of RAM</Caption>
        <div className="flex min-h-8 flex-wrap gap-1.5">
          {(() => {
            const out = [...new Set(log)].filter((p) => !run.resident.includes(p));
            return out.length ? out.map((p) => <span key={p} className="rounded-md border border-line bg-surface-2 px-2 py-0.5 font-mono text-[0.8rem] font-semibold text-ink-2">page {p}</span>) : <span className="text-sm text-ink-3">nothing swapped out yet</span>;
          })()}
        </div>
      </div>

      {!seq && (
        <div className="mt-3">
          <Caption className="mb-1.5 text-center">Tap a page to use it</Caption>
          <div className="flex flex-wrap justify-center gap-1.5">
            {Array.from({ length: nPages }, (_, p) => (
              <button
                key={p}
                type="button"
                disabled={locked}
                onClick={() => touch(p)}
                aria-label={`Use page ${p}`}
                className="grid min-h-11 min-w-11 place-items-center rounded-lg border border-line bg-surface px-2 font-mono text-sm font-semibold text-ink transition-colors enabled:hover:border-[var(--line-strong)] enabled:hover:bg-surface-2 disabled:opacity-50"
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-3">
        <Note tone={last ? "accent" : "plain"}>
          {!last
            ? "RAM starts empty. The first use of any page is a minor fault: the OS hands out a zeroed frame."
            : last.kind === "hit"
              ? `Page ${last.page} is in RAM: no fault.`
              : last.kind === "minor"
                ? `Page ${last.page}: first use, so a minor fault. The OS finds a free frame and zeroes it${last.evicted !== null ? `; RAM was full, so page ${last.evicted} (used longest ago) went out to swap` : ""}. About ${fmtNs(MINOR_NS)}.`
                : `Page ${last.page} was swapped out earlier: a major fault. The OS reads it back from disk${last.evicted !== null ? ` (pushing page ${last.evicted} out)` : ""}. About ${fmtNs(DISK_NS[disk])}.`}
        </Note>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        <Readout label="Hits" value={run.hits} />
        <Readout label="Minor faults" value={run.minor} />
        <Readout label="Major faults" value={run.major} accent={run.major > 0} />
        <Readout label="Time stalled" value={fmtNs(stall)} />
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
        <Seg
          label="Swap device"
          value={disk}
          onChange={pickDisk}
          disabled={locked}
          options={[
            { value: "ssd", label: "SSD swap" },
            { value: "hdd", label: "Hard-disk swap" },
          ]}
        />
        <Btn onClick={reset} disabled={locked || log.length === 0}>
          <RotateCcw className="h-4 w-4" /> Reset
        </Btn>
        {seq && (
          <Btn primary onClick={() => nextP !== null && touch(nextP)} disabled={locked || nextP === null}>
            Next use
          </Btn>
        )}
      </div>
    </div>
  );
}

/** goal: { maxMajor, minTouches, minMajor, frames, done } */
export function checkSwap(state: unknown, goal: Record<string, unknown>) {
  const s = state as SwapState | undefined;
  if (!s) return false;
  if (typeof goal.maxMajor === "number" && s.major > goal.maxMajor) return false;
  if (typeof goal.minMajor === "number" && s.major < goal.minMajor) return false;
  if (typeof goal.minTouches === "number" && s.touches < goal.minTouches) return false;
  if (typeof goal.frames === "number" && s.frames !== goal.frames) return false;
  if (goal.done === true && !s.done) return false;
  return true;
}
