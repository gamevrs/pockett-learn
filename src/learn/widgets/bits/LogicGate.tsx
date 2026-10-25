"use client";

import React, { useState } from "react";
import { Check, X } from "lucide-react";
import type { WidgetProps } from "@/learn/widget";

export type GateKind = "AND" | "OR" | "XOR" | "NOT" | "NAND" | "NOR";

export interface LogicGateProps {
  gate?: GateKind;
  /** "play": toggle the inputs and watch the output. "table": fill in the output column. Default "play". */
  mode?: "play" | "table";
  /** In play mode, also show the truth table with the current row highlighted. Default false. */
  showTable?: boolean;
  /** Starting inputs in play mode. */
  initial?: { a?: 0 | 1; b?: 0 | 1 };
  locked?: boolean;
}

export type LogicGateState =
  | { mode: "play"; a: 0 | 1; b: 0 | 1; out: 0 | 1 }
  | { mode: "table"; answers: (0 | 1 | null)[]; complete: boolean; correct: boolean };

type Bit = 0 | 1;

export function gateOut(gate: GateKind, a: Bit, b: Bit): Bit {
  switch (gate) {
    case "AND":
      return (a & b) as Bit;
    case "OR":
      return (a | b) as Bit;
    case "XOR":
      return (a ^ b) as Bit;
    case "NOT":
      return (a ? 0 : 1) as Bit;
    case "NAND":
      return (a & b ? 0 : 1) as Bit;
    case "NOR":
      return (a | b ? 0 : 1) as Bit;
  }
}

const rowsFor = (gate: GateKind): [Bit, Bit][] =>
  gate === "NOT" ? [[0, 0], [1, 0]] : [[0, 0], [0, 1], [1, 0], [1, 1]];

/** A single logic gate: toggle its inputs, or fill in its truth table. */
export function LogicGate({ props, onChange, revealed }: WidgetProps<LogicGateProps>) {
  const gate: GateKind = props.gate ?? "AND";
  const mode = props.mode ?? "play";
  const unary = gate === "NOT";
  const rows = rowsFor(gate);
  const [a, setA] = useState<Bit>(props.initial?.a ?? 0);
  const [b, setB] = useState<Bit>(props.initial?.b ?? 0);
  const [answers, setAnswers] = useState<(Bit | null)[]>(() => rows.map(() => null));
  const locked = Boolean(props.locked || revealed);
  const out = gateOut(gate, a, b);

  const toggle = (which: "a" | "b") => {
    if (locked || mode !== "play") return;
    const na: Bit = which === "a" ? (a ? 0 : 1) : a;
    const nb: Bit = which === "b" ? (b ? 0 : 1) : b;
    setA(na);
    setB(nb);
    onChange?.({ mode: "play", a: na, b: nb, out: gateOut(gate, na, nb) });
  };

  const cycle = (i: number) => {
    if (locked) return;
    const next = answers.slice();
    next[i] = next[i] === 1 ? 0 : 1;
    setAnswers(next);
    const complete = next.every((v) => v !== null);
    const correct = complete && next.every((v, j) => v === gateOut(gate, rows[j][0], rows[j][1]));
    onChange?.({ mode: "table", answers: next, complete, correct });
  };

  return (
    <div className="mx-auto w-full max-w-md">
      <GateDiagram gate={gate} a={a} b={b} out={out} live={mode === "play"} onToggle={toggle} disabled={locked || mode !== "play"} />

      {(mode === "table" || props.showTable) && (
        <table className="mx-auto mt-4 min-w-[15rem] border-separate border-spacing-y-1 text-center font-mono text-sm [&_td]:px-4 [&_th]:px-4">
          <thead>
            <tr className="text-xs text-ink-3">
              <th className="font-medium">A</th>
              {!unary && <th className="font-medium">B</th>}
              <th className="font-medium">{gate === "NOT" ? "NOT A" : `A ${gate} B`}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([ra, rb], i) => {
              const expected = gateOut(gate, ra, rb);
              const current = mode === "play" && ra === a && (unary || rb === b);
              const given = answers[i];
              const showResult = mode === "table" && revealed;
              return (
                <tr key={i} className={current ? "[&>td]:bg-tint [&>td:first-child]:shadow-[inset_3px_0_0_var(--brand)]" : "[&>td]:bg-surface-2"}>
                  <td className="h-11 rounded-l-lg text-ink-2">{ra}</td>
                  {!unary && <td className="h-11 text-ink-2">{rb}</td>}
                  <td className="h-11 rounded-r-lg">
                    {mode === "table" ? (
                      <span className="inline-flex items-center gap-1.5 pl-9">
                        <button
                          type="button"
                          onClick={() => cycle(i)}
                          disabled={locked}
                          aria-label={`Output for A=${ra}${unary ? "" : `, B=${rb}`}: ${given ?? "not set"}`}
                          className={`h-10 w-12 rounded-lg border font-semibold transition-colors ${
                            given === null ? "border-dashed border-[var(--line-strong)] bg-surface text-ink-3" : given === 1 ? "border-transparent bg-primary text-primary-ink" : "border-line bg-surface text-ink"
                          } disabled:cursor-default`}
                        >
                          {given ?? "?"}
                        </button>
                        <span className="inline-flex w-9 items-center">
                          {showResult &&
                            (given === expected ? (
                              <Check className="h-4 w-4 text-good" aria-label="right" />
                            ) : (
                              <span className="inline-flex items-center gap-0.5 text-xs text-bad">
                                <X className="h-4 w-4" aria-label="wrong" />
                                {expected}
                              </span>
                            ))}
                        </span>
                      </span>
                    ) : (
                      <span className={`font-semibold ${expected ? "text-ink" : "text-ink-3"}`}>{expected}</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      {mode === "table" && !revealed && <p className="mt-2 text-center text-xs text-ink-3">Tap each output to set it to 0 or 1.</p>}
    </div>
  );
}

/** SVG paths for the standard gate shapes, drawn in a 100..180 × 10..110 box. */
export function GateShape({ gate, x = 100, y = 60 }: { gate: GateKind; x?: number; y?: number }) {
  const body = "fill-[var(--surface-2)] stroke-[var(--ink-2)]";
  const t = `translate(${x - 100} ${y - 60})`;
  const bubble = gate === "NAND" || gate === "NOR" || gate === "NOT";
  const base = gate === "NAND" ? "AND" : gate === "NOR" ? "OR" : gate;
  return (
    <g transform={t} strokeWidth={2.5} strokeLinejoin="round">
      {base === "AND" && <path className={body} d="M100 25 H138 A35 35 0 0 1 138 95 H100 Z" />}
      {(base === "OR" || base === "XOR") && <path className={body} d="M98 25 Q116 60 98 95 Q150 95 176 60 Q150 25 98 25 Z" />}
      {base === "XOR" && <path className="fill-none stroke-[var(--ink-2)]" d="M88 25 Q106 60 88 95" />}
      {base === "NOT" && <path className={body} d="M100 28 L164 60 L100 92 Z" />}
      {bubble && <circle className={body} cx={base === "NOT" ? 170 : gate === "NAND" ? 179 : 182} cy={60} r={6} />}
      <text x={base === "NOT" ? 120 : 132} y={64} textAnchor="middle" className="fill-[var(--ink-2)] font-mono text-[11px] font-semibold" stroke="none">
        {gate}
      </text>
    </g>
  );
}

const wire = (on: boolean, live: boolean) => (live && on ? "stroke-[var(--brand)]" : "stroke-[var(--line-strong)]");

const CY = 65;

function GateDiagram({ gate, a, b, out, live, onToggle, disabled }: { gate: GateKind; a: Bit; b: Bit; out: Bit; live: boolean; onToggle: (w: "a" | "b") => void; disabled: boolean }) {
  const unary = gate === "NOT";
  // boxY: where the toggle sits; pinY: where its wire enters the gate
  const inputs: { key: "a" | "b"; boxY: number; pinY: number; v: Bit }[] = unary
    ? [{ key: "a", boxY: CY, pinY: CY, v: a }]
    : [
        { key: "a", boxY: 30, pinY: CY - 22, v: a },
        { key: "b", boxY: 100, pinY: CY + 22, v: b },
      ];
  const outX = gate === "NOT" ? 175 : gate === "NAND" ? 183 : gate === "NOR" ? 186 : gate === "AND" ? 168 : 172;
  const endX = gate === "OR" || gate === "XOR" || gate === "NOR" ? 106 : 100;
  return (
    <svg viewBox="0 0 290 130" className="mx-auto block w-full max-w-[360px]" role="group" aria-label={`${gate} gate`}>
      {inputs.map((inp) => (
        <path key={inp.key} d={`M52 ${inp.boxY} H74 V${inp.pinY} H${endX}`} className={wire(inp.v === 1, live)} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      ))}
      <path d={`M${outX} ${CY} H226`} className={wire(out === 1, live)} strokeWidth={4} strokeLinecap="round" fill="none" />
      <GateShape gate={gate} y={CY} />
      {inputs.map((inp) => {
        const lit = live && inp.v === 1;
        return (
          <g
            key={inp.key}
            role="button"
            tabIndex={disabled ? -1 : 0}
            aria-label={`Input ${inp.key.toUpperCase()}: ${live ? inp.v : "any"}`}
            aria-pressed={live ? inp.v === 1 : undefined}
            aria-disabled={disabled}
            onClick={() => !disabled && onToggle(inp.key)}
            onKeyDown={(e) => {
              if (!disabled && (e.key === " " || e.key === "Enter")) {
                e.preventDefault();
                e.stopPropagation();
                onToggle(inp.key);
              }
            }}
            className={disabled ? "" : "cursor-pointer outline-none [&:focus-visible>rect]:stroke-[var(--brand)]"}
          >
            <rect x={4} y={inp.boxY - 24} width={48} height={48} rx={10} className={lit ? "fill-[var(--primary)] stroke-transparent" : "fill-[var(--surface)] stroke-[var(--line-strong)]"} strokeWidth={2} />
            {live ? (
              <>
                <text x={28} y={inp.boxY - 8} textAnchor="middle" className={`text-[10px] font-semibold ${lit ? "fill-[var(--primary-ink)] opacity-70" : "fill-[var(--ink-3)]"}`}>
                  {inp.key.toUpperCase()}
                </text>
                <text x={28} y={inp.boxY + 15} textAnchor="middle" className={`font-mono text-[18px] font-semibold ${lit ? "fill-[var(--primary-ink)]" : "fill-[var(--ink)]"}`}>
                  {inp.v}
                </text>
              </>
            ) : (
              <text x={28} y={inp.boxY + 6} textAnchor="middle" className="fill-[var(--ink-2)] font-mono text-[17px] font-semibold">
                {inp.key.toUpperCase()}
              </text>
            )}
          </g>
        );
      })}
      <circle cx={252} cy={CY} r={23} className={live && out ? "fill-[var(--primary)] stroke-transparent" : "fill-[var(--surface)] stroke-[var(--line-strong)]"} strokeWidth={2} />
      {live && out === 1 && <circle cx={252} cy={CY} r={29} className="fill-none stroke-[var(--brand)] opacity-40" strokeWidth={2} />}
      <text x={252} y={CY + 6} textAnchor="middle" className={`font-mono text-[17px] font-semibold ${live && out ? "fill-[var(--primary-ink)]" : "fill-[var(--ink)]"}`}>
        {live ? out : "?"}
      </text>
      <text x={252} y={CY + 44} textAnchor="middle" className="fill-[var(--ink-3)] text-[10px] font-medium">
        OUT
      </text>
    </svg>
  );
}

/** goal: { complete: true } (truth table all right) or { out } (and optionally { a, b }) in play mode. */
export function checkLogicGate(state: unknown, goal: Record<string, unknown>) {
  const s = state as LogicGateState | undefined;
  if (!s) return false;
  if (goal.complete === true) return s.mode === "table" && s.correct;
  if (s.mode !== "play") return false;
  if (typeof goal.out !== "number") return false;
  return s.out === goal.out && (goal.a === undefined || s.a === goal.a) && (goal.b === undefined || s.b === goal.b);
}
