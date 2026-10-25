"use client";

import React, { useState } from "react";
import { ChevronLeft, ChevronRight, Lock, RotateCcw, TriangleAlert } from "lucide-react";
import type { WidgetProps } from "@/learn/widget";
import { CPane, hex, Label, PtrChip } from "./shared";

/** A local variable in a stack frame. `ptr` marks a pointer and gives the address it holds (0 = NULL). */
export interface CVar {
  name: string;
  /** C type as written, e.g. "int", "char", "int *", "int[3]", "char[6]". */
  type: string;
  addr: number;
  /** Value as shown, e.g. "5", "'A'", "{1, 2, 3}", "??". Ignored for pointers (the chip shows `ptr`). */
  value?: string;
  ptr?: number;
}

export interface CFrame {
  name: string;
  vars: CVar[];
}

/** A block on the heap from malloc. */
export interface CBlock {
  addr: number;
  size: number;
  /** e.g. "int[3]" */
  label?: string;
  /** Values of the elements, if shown. */
  cells?: string[];
  /** live (in use), freed (given back), leaked (still allocated but nothing points at it any more). */
  state?: "live" | "freed" | "leaked";
}

/**
 * One step: line `line` (1-based) just ran and this is the state after it. `frames` and `heap` carry forward when
 * omitted; `out` is printed text; `crash` ends the program with that message (e.g. "Segmentation fault").
 */
export interface CStep {
  line: number;
  frames?: CFrame[];
  heap?: CBlock[];
  out?: string;
  note?: string;
  crash?: string;
}

export interface CTraceProps {
  code: string;
  steps: CStep[];
  /** File name over the code (default "main.c"). */
  title?: string;
  /** Predict mode: stepping stays locked until the question is answered. */
  predict?: boolean;
  /** Steps already run when the widget opens. */
  startAt?: number;
  label?: string;
}

export interface CTraceState {
  pos: number;
  atEnd: boolean;
  frames: number;
  /** Heap blocks still allocated (live or leaked). */
  allocated: number;
  crashed: boolean;
}

interface Resolved {
  line: number;
  frames: CFrame[];
  heap: CBlock[];
  out: string[];
  printed: number;
  note?: string;
  crash?: string;
}

const START: Resolved = { line: 0, frames: [{ name: "main", vars: [] }], heap: [], out: [], printed: 0 };

function resolve(steps: CStep[]): Resolved[] {
  const res = [START];
  let cur = START;
  for (const s of steps) {
    const lines = s.out ? s.out.replace(/\n$/, "").split("\n") : [];
    if (s.crash) lines.push(s.crash);
    cur = { line: s.line, frames: s.frames ?? cur.frames, heap: s.heap ?? cur.heap, out: [...cur.out, ...lines], printed: lines.length, note: s.note, crash: s.crash };
    res.push(cur);
  }
  return res;
}

/** Bytes a variable of this C type takes on a 64-bit machine. */
export function sizeOfType(t: string): number {
  const arr = t.match(/^(.*)\[(\d+)\]$/);
  if (arr) return sizeOfType(arr[1].trim()) * Number(arr[2]);
  if (t.includes("*")) return 8;
  if (t === "char") return 1;
  if (t === "double" || t === "long") return 8;
  return 4;
}

type Target = { kind: "var"; frame: number; name: string } | { kind: "block"; addr: number; freed: boolean } | null;

function findTarget(r: Resolved, addr: number): Target {
  for (let fi = 0; fi < r.frames.length; fi++) {
    for (const v of r.frames[fi].vars) if (addr >= v.addr && addr < v.addr + sizeOfType(v.type)) return { kind: "var", frame: fi, name: v.name };
  }
  for (const b of r.heap) if (addr >= b.addr && addr < b.addr + b.size) return { kind: "block", addr: b.addr, freed: b.state === "freed" };
  return null;
}

/** Steps through C code at the address level: stack frames with addressed locals, heap blocks, pointer chips. */
export function CTrace({ props, onChange, revealed }: WidgetProps<CTraceProps>) {
  const steps = props.steps ?? [];
  const resolved = resolve(steps);
  const total = steps.length;
  const [pos, setPos] = useState(Math.min(total, Math.max(0, props.startAt ?? 0)));
  const [focus, setFocus] = useState<number | null>(null);
  const locked = Boolean(props.predict) && !revealed;
  const now = resolved[pos];
  const prev = resolved[Math.max(0, pos - 1)];
  const crashedAt = resolved.findIndex((r) => r.crash);
  const end = crashedAt > 0 ? crashedAt : total;
  const atEnd = pos >= end;
  const hasHeap = resolved.some((r) => r.heap.length > 0);
  const hasPtr = resolved.some((r) => r.frames.some((f) => f.vars.some((v) => v.ptr)));
  const nextLine = pos < total ? steps[pos].line : null;

  const go = (p: number) => {
    if (locked) return;
    const np = Math.min(end, Math.max(0, p));
    setPos(np);
    setFocus(null);
    const r = resolved[np];
    onChange?.({ pos: np, atEnd: np >= end, frames: r.frames.length, allocated: r.heap.filter((b) => b.state !== "freed").length, crashed: Boolean(r.crash) } satisfies CTraceState);
  };

  const focusTarget = focus === null ? null : findTarget(now, focus);
  const isFocusVar = (fi: number, name: string) => focusTarget?.kind === "var" && focusTarget.frame === fi && focusTarget.name === name;
  const isFocusBlock = (addr: number) => focusTarget?.kind === "block" && focusTarget.addr === addr;
  const changed = (fi: number, v: CVar) => {
    if (pos === 0) return false;
    const pf = prev.frames[fi];
    if (!pf || pf.name !== now.frames[fi].name) return true;
    const pv = pf.vars.find((x) => x.name === v.name);
    return !pv || pv.value !== v.value || pv.ptr !== v.ptr;
  };

  const autoNote = () => {
    if (pos === 0) return nextLine ? `Nothing has run yet. Press Run to run line ${nextLine}.` : "";
    if (now.crash) return `Line ${now.line} crashed the program.`;
    if (now.frames.length > prev.frames.length) return `Line ${now.line} calls ${now.frames[now.frames.length - 1].name}(): a new frame is pushed on the stack.`;
    if (now.frames.length < prev.frames.length) return `${prev.frames[prev.frames.length - 1].name}() returned. Its frame is popped, and its locals are gone.`;
    return `Line ${now.line} ran.${atEnd ? " The program has finished." : ""}`;
  };

  return (
    <div className="w-full min-w-0">
      {props.label && <p className="mb-3 text-center text-xs font-medium text-ink-3">{props.label}</p>}
      <CPane code={props.code} current={pos > 0 ? now.line : null} title={props.title ?? "main.c"} />

      <p className={`mt-3 text-sm leading-snug ${now.crash ? "text-bad" : "text-ink-2"} ${locked ? "" : "min-h-[2.75rem]"}`} aria-live="polite">
        {locked ? (
          <span className="inline-flex items-center gap-1.5 text-ink-3">
            <Lock className="h-3.5 w-3.5 shrink-0" /> Make your prediction below. Then you can step through and see why.
          </span>
        ) : (
          (now.note ?? autoNote())
        )}
      </p>
      {!locked && (
        <div className="mt-1 flex items-center gap-2">
          <button type="button" className="btn !h-10 !w-10 !p-0" onClick={() => go(pos - 1)} disabled={pos === 0} aria-label="Previous step">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button type="button" className={`btn ${atEnd ? "" : "btn-primary"} !h-10 flex-1 sm:flex-none sm:!px-6`} onClick={() => go(pos + 1)} disabled={atEnd}>
            {pos === 0 ? "Run line " + (nextLine ?? 1) : atEnd ? (now.crash ? "Crashed" : "Finished") : "Next"} {!atEnd && <ChevronRight className="h-4 w-4" />}
          </button>
          <span className="ml-auto font-mono text-xs tabular-nums text-ink-3">
            {pos}/{end}
          </span>
          <button type="button" className="btn btn-ghost !h-10 !w-10 !p-0" onClick={() => go(0)} disabled={pos === 0} aria-label="Start over" title="Start over">
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
      )}

      {!locked && (
        <div className={`mt-4 grid gap-3 ${hasHeap ? "sm:grid-cols-2" : ""}`}>
          <section className="min-w-0 rounded-xl border border-line bg-surface-2 p-3">
            <Label>Stack</Label>
            <div className="grid gap-1.5">
              {[...now.frames.keys()].reverse().map((fi) => {
                const f = now.frames[fi];
                const top = fi === now.frames.length - 1;
                return (
                  <div key={`${fi}-${f.name}`} className={`rounded-lg border bg-surface p-2 ${top ? "border-[var(--brand)]" : "border-line"}`}>
                    <p className="mb-1 flex items-center gap-2 font-mono text-xs font-semibold text-ink">
                      {f.name}()
                      {top && now.frames.length > 1 && <span className="font-sans text-[0.65rem] font-medium text-brand">running</span>}
                    </p>
                    {f.vars.length === 0 ? (
                      <p className="text-xs text-ink-3">no locals yet</p>
                    ) : (
                      <div className="grid gap-1">
                        {f.vars.map((v) => {
                          const hl = isFocusVar(fi, v.name);
                          const ch = changed(fi, v);
                          const tgt = v.ptr !== undefined && v.ptr !== 0 ? findTarget(now, v.ptr) : null;
                          const dangling = v.ptr !== undefined && v.ptr !== 0 && (!tgt || (tgt.kind === "block" && tgt.freed));
                          return (
                            <div
                              key={v.name}
                              className={`flex min-h-9 flex-wrap items-center gap-x-2 gap-y-1 rounded-md border px-2 py-1 transition-colors ${
                                hl ? "border-[var(--brand)] bg-tint ring-1 ring-[var(--brand)]" : ch ? "border-[var(--brand)]/50 bg-tint" : "border-transparent"
                              }`}
                            >
                              <span className="min-w-0 font-mono text-[0.78rem] text-ink-2">
                                <span className="text-ink-3">{v.type}</span> <span className="font-semibold text-ink">{v.name}</span>
                              </span>
                              <span className="font-mono text-[0.85rem] font-semibold text-ink">
                                {v.ptr !== undefined ? (
                                  <PtrChip addr={v.ptr} dangling={dangling} active={focus === v.ptr} onClick={v.ptr === 0 ? undefined : () => setFocus(focus === v.ptr ? null : v.ptr!)} />
                                ) : (
                                  (v.value ?? "??")
                                )}
                              </span>
                              <span className="ml-auto font-mono text-[0.68rem] tabular-nums text-ink-3">{hex(v.addr)}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {hasHeap && (
            <section className="min-w-0 rounded-xl border border-line bg-surface-2 p-3">
              <Label>Heap</Label>
              {now.heap.length === 0 ? (
                <p className="text-sm text-ink-3">Nothing allocated</p>
              ) : (
                <div className="grid gap-1.5">
                  {now.heap.map((b) => {
                    const hl = isFocusBlock(b.addr);
                    const freed = b.state === "freed";
                    const leaked = b.state === "leaked";
                    return (
                      <div
                        key={b.addr}
                        className={`rounded-lg border p-2 transition-colors ${
                          hl ? (freed ? "border-[var(--bad)] bg-surface ring-1 ring-[var(--bad)]" : "border-[var(--brand)] bg-tint ring-1 ring-[var(--brand)]") : freed ? "border-dashed border-[var(--line-strong)] bg-transparent" : leaked ? "border-[var(--bad)]/60 bg-surface" : "border-line bg-surface"
                        }`}
                      >
                        <p className="flex flex-wrap items-center gap-x-2 font-mono text-xs">
                          <span className={`font-semibold ${freed ? "text-ink-3 line-through" : "text-ink"}`}>{hex(b.addr)}</span>
                          <span className="text-ink-3">
                            {b.size} bytes{b.label ? ` · ${b.label}` : ""}
                          </span>
                          {freed && <span className="ml-auto rounded bg-surface-2 px-1.5 font-sans text-[0.65rem] font-semibold text-ink-3">freed</span>}
                          {leaked && <span className="ml-auto rounded bg-surface-2 px-1.5 font-sans text-[0.65rem] font-semibold text-bad">leaked</span>}
                        </p>
                        {b.cells && (
                          <div className={`mt-1.5 flex flex-wrap ${freed ? "opacity-45" : ""}`}>
                            {b.cells.map((c, k) => (
                              <span key={k} className="-ml-px min-w-9 border border-line px-1.5 py-1 text-center font-mono text-[0.8rem] first:ml-0">
                                {c}
                              </span>
                            ))}
                          </div>
                        )}
                        {leaked && <p className="mt-1 text-[0.7rem] text-bad">Nothing points here any more, so it can never be freed.</p>}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          <section className={`min-w-0 rounded-xl border border-line bg-surface-2 p-3 ${hasHeap ? "sm:col-span-2" : ""}`}>
            <Label>Output</Label>
            {now.out.length === 0 ? (
              <p className="text-sm text-ink-3">Nothing printed yet</p>
            ) : (
              <pre className="max-h-40 overflow-auto font-mono text-[0.85rem] leading-relaxed text-ink">
                {now.out.map((l, k) => {
                  const isCrash = now.crash && k === now.out.length - 1;
                  return (
                    <div key={k} className={isCrash ? "flex items-center gap-1.5 font-semibold text-bad" : k >= now.out.length - now.printed && pos > 0 ? "-mx-1 rounded bg-tint px-1" : ""}>
                      {isCrash && <TriangleAlert className="h-3.5 w-3.5" />}
                      {l || " "}
                    </div>
                  );
                })}
              </pre>
            )}
          </section>
        </div>
      )}
      {!locked && hasPtr && <p className="mt-2 text-center text-[0.7rem] text-ink-3">Tap a pointer chip to light up what it points at.</p>}
    </div>
  );
}

export function checkCTrace(state: unknown, goal: Record<string, unknown>) {
  const s = state as CTraceState | undefined;
  if (!s) return false;
  if (typeof goal.pos === "number" && s.pos !== goal.pos) return false;
  if (goal.atEnd !== undefined && s.atEnd !== goal.atEnd) return false;
  if (typeof goal.frames === "number" && s.frames !== goal.frames) return false;
  if (goal.crashed !== undefined && s.crashed !== goal.crashed) return false;
  return true;
}
