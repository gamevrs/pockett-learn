"use client";

import React, { useState } from "react";
import { RotateCcw, TriangleAlert } from "lucide-react";
import type { WidgetProps } from "@/learn/widget";
import { CodeBlock } from "@/components/ui/Prose";
import { CODE_SURFACE, hex, Label, Readout } from "./shared";

export interface PointerProps {
  /** int variables, side by side in memory. Default x = 3 at 0x1000, y = 8 at 0x1004. */
  vars?: { name: string; addr: number; value: number }[];
  /** The pointer: its name, where it lives, and what it points at first (a variable name, or null for NULL). */
  ptr?: { name?: string; addr?: number; target?: string | null };
  /**
   * Statements offered as buttons. Forms: "p=&x", "*p=5", "*p+=1", "p+=1", "p-=1", "p=NULL", "x=7".
   * Default: p=&x, p=&y, *p=5, *p+=1.
   */
  actions?: string[];
  /** Also show `int **pp = &p` (a pointer to the pointer). */
  pp?: boolean;
  label?: string;
}

export interface PointerState {
  /** Address the pointer holds (0 for NULL). */
  p: number;
  /** Name of the variable it points at, or null. */
  target: string | null;
  /** Current value of every int variable. */
  values: Record<string, number>;
  crashed: boolean;
  /** Statements run so far. */
  ran: number;
}

const DEFAULT_VARS = [
  { name: "x", addr: 0x1000, value: 3 },
  { name: "y", addr: 0x1004, value: 8 },
];

/** C text for an action id, e.g. "p+=1" → "p = p + 1;". */
function statement(a: string, p: string): string {
  const t = a.replace(/\bp\b/g, p);
  let m: RegExpMatchArray | null;
  if ((m = t.match(/^(\w+)\+=(\d+)$/)) && m[1] === p) return `${p} = ${p} + ${m[2]};`;
  if ((m = t.match(/^(\w+)-=(\d+)$/)) && m[1] === p) return `${p} = ${p} - ${m[2]};`;
  if ((m = t.match(/^\*(\w+)\+=(\d+)$/))) return `*${m[1]} = *${m[1]} + ${m[2]};`;
  if ((m = t.match(/^(\*?\w+)=(.+)$/))) return `${m[1]} = ${m[2]};`;
  return t;
}

/** Point p at a variable, write through it, move it, and watch addresses and targets change. */
export function PointerPlayground({ props, onChange, revealed }: WidgetProps<PointerProps>) {
  const vars = props.vars ?? DEFAULT_VARS;
  const pName = props.ptr?.name ?? "p";
  const pAddr = props.ptr?.addr ?? Math.max(...vars.map((v) => v.addr)) + 4;
  const ppAddr = pAddr + 8;
  const startTarget = props.ptr?.target === undefined ? null : props.ptr.target;
  const startP = startTarget ? (vars.find((v) => v.name === startTarget)?.addr ?? 0) : 0;
  const actions = props.actions ?? ["p=&x", "p=&y", "*p=5", "*p+=1"];

  const [p, setP] = useState(startP);
  const [values, setValues] = useState<Record<string, number>>(() => Object.fromEntries(vars.map((v) => [v.name, v.value])));
  const [log, setLog] = useState<{ text: string; note: string; bad?: boolean }[]>([]);
  const [crashed, setCrashed] = useState(false);
  const locked = Boolean(revealed);

  const targetOf = (addr: number) => vars.find((v) => v.addr === addr) ?? null;
  const target = targetOf(p);

  const report = (np: number, nv: Record<string, number>, c: boolean, ran: number) =>
    onChange?.({ p: np, target: targetOf(np)?.name ?? null, values: nv, crashed: c, ran } satisfies PointerState);

  const run = (a: string) => {
    if (locked || crashed) return;
    const text = statement(a, pName);
    let np = p;
    const nv = { ...values };
    let note = "";
    let bad = false;
    let crash = false;
    let m: RegExpMatchArray | null;
    if ((m = a.match(/^p=&(\w+)$/))) {
      const v = vars.find((x) => x.name === m![1]);
      np = v?.addr ?? 0;
      note = `${pName} now holds ${hex(np)}, the address of ${m[1]}.`;
    } else if (a === "p=NULL") {
      np = 0;
      note = `${pName} holds 0: it points at nothing.`;
    } else if ((m = a.match(/^p([+-])=(\d+)$/))) {
      const k = Number(m[2]) * (m[1] === "+" ? 1 : -1);
      np = p + k * 4;
      note = p === 0 ? `Moving a NULL pointer is meaningless.` : `+${k} int moves ${k * 4} bytes: ${hex(p)} → ${hex(np)}.`;
      bad = p === 0;
    } else if ((m = a.match(/^\*p(\+?)=(-?\d+)$/))) {
      if (p === 0) {
        crash = true;
        note = "Segmentation fault: there is no variable at address 0, and the program is stopped.";
      } else if (!target) {
        bad = true;
        note = `Nothing of ours lives at ${hex(p)}. Writing there is undefined behaviour, so this toy refuses.`;
      } else {
        nv[target.name] = m[1] ? nv[target.name] + Number(m[2]) : Number(m[2]);
        note = `Wrote ${nv[target.name]} into the 4 bytes at ${hex(p)}, which is ${target.name}.`;
      }
    } else if ((m = a.match(/^(\w+)=(-?\d+)$/))) {
      nv[m[1]] = Number(m[2]);
      note = `${m[1]} changed directly.`;
    }
    const nextLog = [...log, { text, note, bad: bad || crash }];
    setP(np);
    setValues(nv);
    setLog(nextLog);
    setCrashed(crash);
    report(np, nv, crash, nextLog.length);
  };

  const reset = () => {
    const nv = Object.fromEntries(vars.map((v) => [v.name, v.value]));
    setP(startP);
    setValues(nv);
    setLog([]);
    setCrashed(false);
    report(startP, nv, false, 0);
  };

  const last = log[log.length - 1];
  const deref = p === 0 ? "crash" : target ? String(values[target.name]) : "??";

  return (
    <div className="w-full min-w-0">
      {props.label && <p className="mb-3 text-center text-xs font-medium text-ink-3">{props.label}</p>}

      {/* memory: the int boxes, then the pointer */}
      <div className="flex flex-wrap justify-center gap-2">
        {vars.map((v) => {
          const hit = target?.name === v.name && !crashed;
          return (
            <div key={v.name} className={`flex min-w-[5.5rem] flex-col rounded-xl border p-2.5 transition-colors ${hit ? "border-[var(--brand)] bg-tint" : "border-line bg-surface-2"}`}>
              <span className="flex items-center justify-between gap-2 font-mono text-xs">
                <span className="font-semibold text-ink-2">int {v.name}</span>
                {hit && <span className="rounded bg-primary px-1 text-[0.65rem] font-semibold text-primary-ink">*{pName}</span>}
              </span>
              <span className="mt-1 font-mono text-2xl font-semibold tabular-nums text-ink">{values[v.name]}</span>
              <span className="mt-1 font-mono text-[0.7rem] tabular-nums text-ink-3">{hex(v.addr)}</span>
            </div>
          );
        })}
        <div className={`flex min-w-[7.5rem] flex-col rounded-xl border p-2.5 ${crashed ? "border-[var(--bad)]" : "border-[var(--line-strong)]"} bg-surface`}>
          <span className="font-mono text-xs font-semibold text-ink-2">int *{pName}</span>
          <span className={`mt-1 font-mono text-lg font-semibold tabular-nums ${p === 0 ? "text-ink-3" : "text-brand"}`}>{p === 0 ? "NULL" : `→ ${hex(p)}`}</span>
          <span className="mt-1 font-mono text-[0.7rem] tabular-nums text-ink-3">{hex(pAddr)}</span>
        </div>
        {props.pp && (
          <div className="flex min-w-[7.5rem] flex-col rounded-xl border border-[var(--line-strong)] bg-surface p-2.5">
            <span className="font-mono text-xs font-semibold text-ink-2">int **pp</span>
            <span className="mt-1 font-mono text-lg font-semibold tabular-nums text-brand">→ {hex(pAddr)}</span>
            <span className="mt-1 font-mono text-[0.7rem] tabular-nums text-ink-3">{hex(ppAddr)}</span>
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap justify-center gap-1.5">
        <Readout label={pName} value={p === 0 ? "NULL" : hex(p)} strong />
        <Readout label={`*${pName}`} value={deref} bad={p === 0 || (!target && p !== 0)} />
        <Readout label={`&${pName}`} value={hex(pAddr)} />
        {props.pp && <Readout label="**pp" value={deref} />}
      </div>

      {/* statements */}
      <div className="mt-4">
        <Label className="text-center">Run a line of C</Label>
        <div className="flex flex-wrap justify-center gap-2">
          {actions.map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => run(a)}
              disabled={locked || crashed}
              className={`${CODE_SURFACE} min-h-10 px-3 font-mono text-[0.8rem] transition-colors hover:border-[#a3e635]/60 disabled:cursor-not-allowed disabled:opacity-40`}
            >
              <CodeBlock code={statement(a, pName)} language="cpp" />
            </button>
          ))}
          <button type="button" className="btn btn-ghost !h-10 !w-10 !p-0" onClick={reset} disabled={log.length === 0 || locked} aria-label="Start over" title="Start over">
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
      </div>

      <p className={`mt-3 flex min-h-[2.75rem] items-start justify-center gap-1.5 text-center text-sm leading-snug ${last?.bad ? "text-bad" : "text-ink-2"}`} aria-live="polite">
        {last ? (
          <>
            {last.bad && <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />}
            <span>
              <code className="font-mono text-ink">{last.text}</code> {last.note}
            </span>
          </>
        ) : (
          <span className="text-ink-3">Tap a statement to run it.</span>
        )}
      </p>
    </div>
  );
}

export function checkPointer(state: unknown, goal: Record<string, unknown>) {
  const s = state as PointerState | undefined;
  if (!s) return false;
  if (goal.crashed !== undefined && s.crashed !== goal.crashed) return false;
  if (goal.target !== undefined && s.target !== goal.target) return false;
  if (typeof goal.p === "number" && s.p !== goal.p) return false;
  if (goal.values && typeof goal.values === "object") {
    for (const [k, v] of Object.entries(goal.values as Record<string, number>)) if (s.values[k] !== v) return false;
  }
  return true;
}
