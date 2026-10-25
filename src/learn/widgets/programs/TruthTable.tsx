"use client";

import React, { useState } from "react";
import { Check, X } from "lucide-react";
import type { WidgetProps } from "@/learn/widget";

export interface TruthTableProps {
  /** Input names, 1 to 3, e.g. ["a", "b"]. */
  inputs: string[];
  /** Python boolean expression over the inputs: and, or, not, parentheses, True, False. */
  expr: string;
  /** "explore": flip the inputs and see the result. "fill": the learner fills in the result column. */
  mode?: "explore" | "fill";
  /** Optional plain-language labels for the inputs, e.g. { a: "it's raining" }. */
  meaning?: Record<string, string>;
}

export interface TruthTableState {
  inputs: Record<string, boolean>;
  result: boolean;
  /** fill mode: what the learner put in each row (null = not filled). */
  filled: (boolean | null)[];
  allCorrect: boolean;
}

/* ── a tiny parser for and / or / not ── */
type Tok = { t: "id" | "op" | "(" | ")"; v: string };
function tokenize(src: string): Tok[] {
  const out: Tok[] = [];
  for (const m of src.matchAll(/\s*([A-Za-z_]\w*|\(|\))/g)) {
    const v = m[1];
    if (v === "(" || v === ")") out.push({ t: v, v });
    else if (v === "and" || v === "or" || v === "not") out.push({ t: "op", v });
    else out.push({ t: "id", v });
  }
  return out;
}
export function evalBool(src: string, env: Record<string, boolean>): boolean {
  const toks = tokenize(src);
  let i = 0;
  const peek = () => toks[i];
  const orExpr = (): boolean => {
    let v = andExpr();
    while (peek()?.v === "or") {
      i++;
      const r = andExpr();
      v = v || r;
    }
    return v;
  };
  const andExpr = (): boolean => {
    let v = notExpr();
    while (peek()?.v === "and") {
      i++;
      const r = notExpr();
      v = v && r;
    }
    return v;
  };
  const notExpr = (): boolean => {
    if (peek()?.v === "not") {
      i++;
      return !notExpr();
    }
    return atom();
  };
  const atom = (): boolean => {
    const tok = toks[i++];
    if (!tok) return false;
    if (tok.t === "(") {
      const v = orExpr();
      i++; // ")"
      return v;
    }
    if (tok.v === "True") return true;
    if (tok.v === "False") return false;
    return Boolean(env[tok.v]);
  };
  return orExpr();
}

const B = (v: boolean) => (v ? "True" : "False");

function rowsFor(inputs: string[]): Record<string, boolean>[] {
  const n = inputs.length;
  return Array.from({ length: 2 ** n }, (_, r) => Object.fromEntries(inputs.map((name, k) => [name, !((r >> (n - 1 - k)) & 1)])));
}

/** A truth table: flip inputs to see the result, or fill in the result column yourself. */
export function TruthTable({ props, onChange, revealed }: WidgetProps<TruthTableProps>) {
  const inputs = (props.inputs ?? ["a", "b"]).slice(0, 3);
  const rows = rowsFor(inputs);
  const fill = props.mode === "fill";
  const [row, setRow] = useState(0);
  const [filled, setFilled] = useState<(boolean | null)[]>(() => rows.map(() => null));
  const truth = rows.map((r) => evalBool(props.expr, r));

  const report = (r: number, f: (boolean | null)[]) =>
    onChange?.({ inputs: rows[r], result: truth[r], filled: f, allCorrect: f.every((v, i) => v === truth[i]) } satisfies TruthTableState);
  const pickRow = (r: number) => {
    if (fill) return;
    setRow(r);
    report(r, filled);
  };
  const flip = (name: string) => {
    const cur = rows[row];
    const next = { ...cur, [name]: !cur[name] };
    const r = rows.findIndex((x) => inputs.every((k) => x[k] === next[k]));
    pickRow(r);
  };
  const setCell = (r: number) => {
    if (revealed) return;
    const next = filled.slice();
    next[r] = next[r] === null ? true : next[r] ? false : null;
    setFilled(next);
    report(row, next);
  };

  const result = truth[row];
  return (
    <div className="w-full min-w-0">
      {!fill && (
        <div className="mb-5">
          <div className="flex flex-wrap items-stretch justify-center gap-2">
            {inputs.map((name) => {
              const on = rows[row][name];
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => flip(name)}
                  aria-pressed={on}
                  className={`flex min-h-12 min-w-[6.5rem] flex-col items-center justify-center rounded-xl border px-3 py-1.5 transition-colors ${
                    on ? "border-transparent bg-primary text-primary-ink" : "border-line bg-surface-2 text-ink-2 hover:border-[var(--line-strong)]"
                  }`}
                >
                  <span className="font-mono text-xs opacity-80">{name}</span>
                  <span className="font-mono text-base font-semibold">{B(on)}</span>
                  {props.meaning?.[name] && <span className="mt-0.5 max-w-[9rem] text-center text-[0.65rem] leading-tight opacity-80">{props.meaning[name]}</span>}
                </button>
              );
            })}
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 font-mono">
            <span className="text-sm text-ink-2">{props.expr}</span>
            <span className="text-ink-3" aria-hidden>
              →
            </span>
            <span className={`rounded-lg px-3 py-1 text-lg font-semibold ${result ? "bg-tint text-brand" : "bg-surface-2 text-ink-2"}`} aria-live="polite">
              {B(result)}
            </span>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="mx-auto w-full max-w-md border-separate border-spacing-0 overflow-hidden rounded-xl border border-line text-center font-mono text-sm">
          <thead>
            <tr className="bg-surface-2">
              {inputs.map((name) => (
                <th key={name} className="border-b border-line px-2 py-2 font-semibold text-ink-2">
                  {name}
                </th>
              ))}
              <th className="border-b border-l border-line px-2 py-2 font-semibold text-ink">{props.expr}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, ri) => {
              const active = !fill && ri === row;
              const v = filled[ri];
              const right = v === truth[ri];
              return (
                <tr key={ri} onClick={() => pickRow(ri)} className={`${fill ? "" : "cursor-pointer"} ${active ? "bg-tint" : ri % 2 ? "bg-surface" : "bg-surface"}`}>
                  {inputs.map((name) => (
                    <td key={name} className={`h-11 border-b border-line px-2 ${r[name] ? "text-ink" : "text-ink-3"} ${ri === rows.length - 1 ? "border-b-0" : ""}`}>
                      {B(r[name])}
                    </td>
                  ))}
                  <td className={`border-b border-l border-line px-1.5 py-1 ${ri === rows.length - 1 ? "border-b-0" : ""}`}>
                    {fill ? (
                      <button
                        type="button"
                        onClick={() => setCell(ri)}
                        disabled={revealed}
                        aria-label={`Result for row ${ri + 1}: ${v === null ? "not set" : B(v)}`}
                        className={`inline-flex h-10 w-full min-w-[5.5rem] items-center justify-center gap-1 rounded-lg border font-semibold transition-colors ${
                          revealed
                            ? right
                              ? "border-[var(--brand)] bg-tint text-ink"
                              : "border-bad/50 bg-bad/[0.06] text-ink"
                            : v === null
                              ? "border-dashed border-[var(--line-strong)] text-ink-3 hover:bg-surface-2"
                              : v
                                ? "border-transparent bg-primary text-primary-ink"
                                : "border-line bg-surface-2 text-ink"
                        }`}
                      >
                        {revealed && (right ? <Check className="h-3.5 w-3.5 text-brand" /> : <X className="h-3.5 w-3.5 text-bad" />)}
                        {revealed && !right ? B(truth[ri]) : v === null ? "tap" : B(v)}
                      </button>
                    ) : (
                      <span className={`font-semibold ${truth[ri] ? "text-brand" : "text-ink-3"}`}>{B(truth[ri])}</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {fill && !revealed && <p className="mt-3 text-center text-xs text-ink-3">Tap a result cell to cycle it: True, False, empty.</p>}
    </div>
  );
}

export function checkTruthTable(state: unknown, goal: Record<string, unknown>) {
  const s = state as TruthTableState | undefined;
  if (!s) return false;
  if (goal.allCorrect) return s.allCorrect;
  if (typeof goal.result === "boolean") return s.result === goal.result && (!goal.inputs || Object.entries(goal.inputs as Record<string, boolean>).every(([k, v]) => s.inputs[k] === v));
  return false;
}
