"use client";

import React, { useState } from "react";
import { ChevronLeft, ChevronRight, Lock, RotateCcw } from "lucide-react";
import type { WidgetProps } from "@/learn/widget";
import { CodeBlock } from "@/components/ui/Prose";
import { CODE_SURFACE, formatVal, isRef, PanelLabel, type Val, VarBox } from "./values";

export interface TraceFrame {
  /** "global" for the top level, otherwise the function name. */
  name: string;
  vars: Record<string, Val>;
  /** Set on the step where this frame's `return` just ran. */
  ret?: Val;
}

export interface HeapObj {
  id: number;
  kind: "list" | "dict" | "tuple";
  items?: Val[];
  entries?: [Val, Val][];
}

/**
 * One step of a precomputed trace: line `line` (1-based) just ran, and this is the state after it.
 * `vars`, `frames` and `heap` carry forward from the previous step when omitted; `out` is the text
 * printed during this step.
 */
export interface TraceStep {
  line: number;
  vars?: Record<string, Val>;
  frames?: TraceFrame[];
  heap?: HeapObj[];
  out?: string;
  note?: string;
}

export interface TraceProps {
  /** Python source shown in the code panel. */
  code: string;
  steps: TraceStep[];
  /** Predict mode: stepping stays locked until the step's question is answered. */
  predict?: boolean;
  /** Pick mode: the learner taps the line they think runs next (from position `startAt`). */
  selectLine?: boolean;
  /** Position to start at: 0 = nothing has run yet, k = the first k steps have run. */
  startAt?: number;
  /** selectLine mode: the correct line, if it isn't simply the next one to run (badge colour only). */
  answerLine?: number;
  /** Optional caption above the code. */
  label?: string;
}

export interface TraceState {
  pos: number;
  atEnd: boolean;
  /** Lines executed so far (positions 1..pos). */
  line: number | null;
  /** Line the learner picked in selectLine mode. */
  picked: number | null;
  /** Frames on the call stack at the current position. */
  frames: number;
}

interface Resolved {
  line: number;
  frames: TraceFrame[];
  heap: HeapObj[];
  out: string[];
  printed: number;
  note?: string;
}

const EMPTY: Resolved = { line: 0, frames: [{ name: "global", vars: {} }], heap: [], out: [], printed: 0 };

function resolve(steps: TraceStep[]): Resolved[] {
  const res: Resolved[] = [EMPTY];
  let cur = EMPTY;
  for (const s of steps) {
    const frames = s.frames ?? (s.vars ? [{ name: "global", vars: s.vars }] : cur.frames.map((f) => ({ ...f, ret: undefined })));
    const lines = s.out ? s.out.replace(/\n$/, "").split("\n") : [];
    cur = { line: s.line, frames, heap: s.heap ?? cur.heap, out: [...cur.out, ...lines], printed: lines.length, note: s.note };
    res.push(cur);
  }
  return res;
}

const same = (a: Val | undefined, b: Val | undefined) => JSON.stringify(a) === JSON.stringify(b);

function autoNote(prev: Resolved, now: Resolved, pos: number, total: number, nextLine: number | null, lines: string[]): string {
  if (pos === 0) return nextLine ? `Nothing has run yet. Press Next to run line ${nextLine}.` : "Nothing to run.";
  let text: string;
  const top = now.frames[now.frames.length - 1];
  const prevTop = prev.frames[prev.frames.length - 1];
  const explicitReturn = /^\s*return\b/.test(lines[now.line - 1] ?? "");
  if (now.frames.length > prev.frames.length) text = `Line ${now.line} calls ${top.name}(): a new frame goes on the stack.`;
  else if (now.frames.length < prev.frames.length && prevTop.ret !== undefined) text = `${prevTop.name}() handed back ${formatVal(prevTop.ret)} and its frame is gone. Back on line ${now.line}.`;
  else if (top.ret !== undefined && now.frames.length > 1)
    text = explicitReturn ? `Line ${now.line} returns ${formatVal(top.ret)}.` : `Line ${now.line} ran. That's the end of ${top.name}(), and with no return line it hands back None.`;
  else text = `Line ${now.line} ran.`;
  if (pos === total) text += " The program has finished.";
  return text;
}

/** Steps through a program line by line: variables as boxes, output, call stack and objects. */
export function Trace({ props, onChange, revealed }: WidgetProps<TraceProps>) {
  const steps = props.steps ?? [];
  const resolved = resolve(steps);
  const total = steps.length;
  const startAt = Math.min(total, Math.max(0, props.startAt ?? 0));
  const [pos, setPos] = useState(startAt);
  const [picked, setPicked] = useState<number | null>(null);
  const locked = (props.predict || props.selectLine) && !revealed;
  const lines = props.code.replace(/\n$/, "").split("\n");

  const now = resolved[pos];
  const prev = resolved[Math.max(0, pos - 1)];
  const nextLine = pos < total ? steps[pos].line : null;
  const useStack = resolved.some((r) => r.frames.length > 1);
  const hasHeap = resolved.some((r) => r.heap.length > 0);
  const hasVars = resolved.some((r) => r.frames.some((f) => Object.keys(f.vars).length > 0));
  const atEnd = pos === total;

  const report = (p: number, pick: number | null) =>
    onChange?.({ pos: p, atEnd: p === total, line: p > 0 ? steps[p - 1].line : null, picked: pick, frames: resolved[p].frames.length } satisfies TraceState);
  const go = (p: number) => {
    if (locked) return;
    const np = Math.min(total, Math.max(0, p));
    setPos(np);
    report(np, picked);
  };
  const pick = (line: number) => {
    if (!props.selectLine || revealed) return;
    setPicked(line);
    report(pos, line);
  };

  const note = now.note ?? autoNote(prev, now, pos, total, nextLine, lines);
  // who points at each heap object (for "two names, one list")
  const holders = new Map<number, string[]>();
  for (const f of now.frames) {
    for (const [name, v] of Object.entries(f.vars)) {
      if (isRef(v)) holders.set(v.ref, [...(holders.get(v.ref) ?? []), now.frames.length > 1 && f.name !== "global" ? `${name} (${f.name})` : name]);
    }
  }
  // highlight what this step changed: new values, and every variable of a frame that just appeared
  const changedVar = (frameIdx: number, name: string, v: Val) => {
    if (pos === 0) return false;
    const pf = prev.frames[frameIdx];
    if (!pf || pf.name !== now.frames[frameIdx].name) return true;
    return !same(pf.vars[name], v);
  };

  return (
    <div className="w-full min-w-0">
      {props.label && <p className="mb-3 text-center text-xs font-medium text-ink-3">{props.label}</p>}

      {/* code */}
      <div className={`${CODE_SURFACE} overflow-x-auto py-2`}>
        <ol className="min-w-max font-mono text-[0.8rem] leading-[1.65] sm:text-[0.85rem]">
          {lines.map((text, i) => {
            const n = i + 1;
            const ran = pos > 0 && now.line === n;
            const next = !locked && nextLine === n;
            const isPicked = picked === n;
            const isAnswer = Boolean(revealed && props.selectLine) && n === (props.answerLine ?? (startAt < total ? steps[startAt].line : -1));
            const pickRight = isAnswer;
            const rowClass = `flex w-full items-stretch text-left ${
              ran ? "bg-[rgba(163,230,53,0.16)]" : isPicked ? "bg-white/[0.08]" : ""
            } ${props.selectLine && !revealed ? "min-h-10 cursor-pointer hover:bg-white/[0.06]" : ""}`;
            const inner = (
              <>
                <span className={`w-1 shrink-0 ${ran ? "bg-[#a3e635]" : isPicked ? "bg-white/60" : ""}`} aria-hidden />
                <span className={`w-9 shrink-0 select-none pr-3 text-right tabular-nums ${ran ? "text-[#a3e635]" : "text-white/35"}`}>{n}</span>
                <span className="w-4 shrink-0 select-none text-[#a3e635]/80" aria-hidden>
                  {next ? "›" : ""}
                </span>
                <span className="flex-1 whitespace-pre pr-4 py-px">{text ? <CodeBlock code={text} language="python" /> : " "}</span>
                {isPicked && (
                  <span className={`mr-3 self-center rounded px-1.5 text-[0.65rem] font-sans font-semibold ${pickRight ? "bg-[#a3e635] text-[#0a0a0a]" : revealed ? "bg-white/15 text-white/80" : "bg-white/15 text-white"}`}>
                    your pick
                  </span>
                )}
                {isAnswer && !isPicked && <span className="mr-3 self-center rounded bg-[#a3e635] px-1.5 text-[0.65rem] font-sans font-semibold text-[#0a0a0a]">answer</span>}
              </>
            );
            return (
              <li key={n}>
                {props.selectLine && !revealed ? (
                  <button type="button" className={`${rowClass} items-center`} onClick={() => pick(n)} aria-pressed={isPicked} aria-label={`Line ${n}: ${text.trim() || "blank"}`}>
                    {inner}
                  </button>
                ) : (
                  <div className={rowClass} aria-current={ran ? "step" : undefined}>
                    {inner}
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      </div>

      {/* step note + controls */}
      <p className={`mt-3 text-sm leading-snug text-ink-2 ${locked ? "" : "min-h-[2.75rem]"}`} aria-live="polite">
        {locked ? (
          <span className="inline-flex items-center gap-1.5 text-ink-3">
            <Lock className="h-3.5 w-3.5 shrink-0" /> {props.selectLine ? "Tap a line to pick it, then press Check." : "Make your prediction below. Then you can step through and see why."}
          </span>
        ) : (
          note
        )}
      </p>
      {!locked && (
        <div className="mt-1 flex items-center gap-2">
          <button type="button" className="btn !h-10 !w-10 !p-0" onClick={() => go(pos - 1)} disabled={pos === 0} aria-label="Previous step">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button type="button" className={`btn ${atEnd ? "" : "btn-primary"} !h-10 flex-1 sm:flex-none sm:!px-6`} onClick={() => go(pos + 1)} disabled={atEnd}>
            {pos === 0 ? "Run line 1" : atEnd ? "Finished" : "Next"} {!atEnd && <ChevronRight className="h-4 w-4" />}
          </button>
          <span className="ml-auto font-mono text-xs tabular-nums text-ink-3">
            {pos}/{total}
          </span>
          <button type="button" className="btn btn-ghost !h-10 !w-10 !p-0" onClick={() => go(0)} disabled={pos === 0} aria-label="Start over" title="Start over">
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* state (hidden while a prediction is pending, so it can't give the answer away) */}
      {!(props.predict && locked) && (
        <>
          <div className={`mt-4 grid gap-3 ${hasVars ? "sm:grid-cols-2" : ""}`}>
            {hasVars && (
              <section className="min-w-0 rounded-xl border border-line bg-surface-2 p-3">
                <PanelLabel>{useStack ? "Call stack" : "Variables"}</PanelLabel>
                {useStack ? (
                  <div className="grid gap-1.5">
                    {[...now.frames.keys()].reverse().map((fi) => {
                      const f = now.frames[fi];
                      const top = fi === now.frames.length - 1;
                      const entries = Object.entries(f.vars);
                      return (
                        <div key={`${fi}-${f.name}`} className={`flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-lg border px-2.5 py-2 ${top ? "border-[var(--brand)] bg-surface" : "border-line bg-surface"}`}>
                          <span className="flex min-w-[4.5rem] flex-col">
                            <span className={`font-mono text-xs font-semibold ${top ? "text-ink" : "text-ink-2"}`}>{f.name === "global" ? "global" : `${f.name}()`}</span>
                            {top && now.frames.length > 1 && <span className="text-[0.65rem] font-medium text-brand">running</span>}
                          </span>
                          {entries.length === 0 && f.ret === undefined ? (
                            <span className="text-xs text-ink-3">no variables</span>
                          ) : (
                            <span className="flex flex-wrap gap-1.5">
                              {entries.map(([name, v]) => (
                                <VarBox key={name} name={name} value={v} changed={changedVar(fi, name, v)} compact />
                              ))}
                              {f.ret !== undefined && <VarBox name="returns" value={f.ret} changed compact />}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : Object.keys(now.frames[0].vars).length === 0 ? (
                  <p className="text-sm text-ink-3">No variables yet</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(now.frames[0].vars).map(([name, v]) => (
                      <VarBox key={name} name={name} value={v} changed={changedVar(0, name, v)} />
                    ))}
                  </div>
                )}
              </section>
            )}

            <section className="min-w-0 rounded-xl border border-line bg-surface-2 p-3">
              <PanelLabel>Output</PanelLabel>
              {now.out.length === 0 ? (
                <p className="text-sm text-ink-3">Nothing printed yet</p>
              ) : (
                <pre className="max-h-48 overflow-auto font-mono text-[0.85rem] leading-relaxed text-ink">
                  {now.out.map((l, i) => (
                    <div key={i} className={i >= now.out.length - now.printed && pos > 0 ? "-mx-1 rounded bg-tint px-1 text-ink" : ""}>
                      {l || " "}
                    </div>
                  ))}
                </pre>
              )}
            </section>
          </div>

          {hasHeap && (
            <section className="mt-3 rounded-xl border border-line bg-surface-2 p-3">
              <PanelLabel>Objects in memory</PanelLabel>
              {now.heap.length === 0 ? (
                <p className="text-sm text-ink-3">No objects yet</p>
              ) : (
                <div className="grid gap-2">
                  {now.heap.map((obj) => {
                    const names = holders.get(obj.id) ?? [];
                    const changed = pos > 0 && JSON.stringify(prev.heap.find((o) => o.id === obj.id)) !== JSON.stringify(obj);
                    return <HeapCard key={obj.id} obj={obj} names={names} changed={changed} />;
                  })}
                </div>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}

function HeapCard({ obj, names, changed }: { obj: HeapObj; names: string[]; changed: boolean }) {
  return (
    <div className={`rounded-lg border bg-surface p-2.5 transition-colors ${changed ? "border-[var(--brand)]" : "border-line"}`}>
      <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="rounded-md bg-tint px-1.5 py-0.5 font-mono text-xs font-semibold text-brand">#{obj.id}</span>
        <span className="font-mono text-xs text-ink-2">{obj.kind}</span>
        <span className="ml-auto text-xs text-ink-3">
          {names.length === 0 ? "no names point here" : names.length === 1 ? `← ${names[0]}` : <span className="font-semibold text-ink">← {names.join(", ")}</span>}
        </span>
      </div>
      {obj.kind === "dict" ? (
        <div className="grid gap-1">
          {(obj.entries ?? []).length === 0 && <span className="font-mono text-xs text-ink-3">{"{}"} empty</span>}
          {(obj.entries ?? []).map(([k, v], i) => (
            <div key={i} className="flex items-center gap-2 font-mono text-[0.85rem]">
              <span className="rounded-md border border-line bg-surface-2 px-2 py-1">{formatVal(k)}</span>
              <span className="text-ink-3" aria-hidden>
                →
              </span>
              <span className="rounded-md border border-line px-2 py-1">{formatVal(v)}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-wrap">
          {(obj.items ?? []).length === 0 && <span className="font-mono text-xs text-ink-3">[] empty</span>}
          {(obj.items ?? []).map((v, i) => (
            <div key={i} className="-ml-px flex min-w-10 flex-col items-center first:ml-0">
              <span className="w-full border border-line px-2 py-1.5 text-center font-mono text-[0.85rem]">{isRef(v) ? `→ #${v.ref}` : formatVal(v)}</span>
              <span className="mt-0.5 font-mono text-[0.65rem] text-ink-3">{i}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function checkTrace(state: unknown, goal: Record<string, unknown>) {
  const s = state as TraceState | undefined;
  if (!s) return false;
  if (typeof goal.line === "number") return s.picked === goal.line;
  if (typeof goal.frames === "number") return s.frames === goal.frames;
  if (typeof goal.pos === "number") return s.pos === goal.pos;
  if (goal.atEnd) return s.atEnd;
  return false;
}
