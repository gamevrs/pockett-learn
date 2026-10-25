"use client";

import React, { useState } from "react";
import { ArrowDown } from "lucide-react";
import type { WidgetProps } from "@/learn/widget";
import { CODE_SURFACE, Stepper } from "../programs/values";
import { FORMS, instrText } from "./machine";
import type { Form, Operand } from "./machine";
import { highlightAsm, PanelLabel } from "./shared";

export interface EncodeProps {
  /** Opcodes the learner can pick from (default: HLT, MOV, ADD, SUB, OUT forms). */
  opcodes?: number[];
  /** Registers to choose from (default 4). */
  registers?: number;
  /** Largest number for #n operands (default 20). */
  maxNumber?: number;
  /** Starting choice. */
  initial?: { opcode?: number; a?: number; b?: number };
  /** Show each number in binary too (default true). */
  binary?: boolean;
}

export interface EncodeState {
  code: [number, number, number];
  text: string;
}

const DEFAULT_OPCODES = [1, 2, 5, 6, 7, 16, 0];

function formLabel(f: Form) {
  const parts = f.kinds.map((k) => (k === "reg" ? "R" : k === "imm" ? "#n" : k === "addr" ? "[a]" : k === "ind" ? "[R]" : "label"));
  return parts.length ? `${f.op} ${parts.join(", ")}` : f.op;
}

function toOperands(f: Form, a: number, b: number): Operand[] {
  return f.kinds.map((k, i) => {
    const v = i === 0 ? a : b;
    if (k === "reg") return { kind: "reg", r: v };
    if (k === "imm") return { kind: "imm", v };
    if (k === "addr") return { kind: "addr", a: v };
    if (k === "ind") return { kind: "ind", r: v };
    return { kind: "label", name: String(v), target: v };
  });
}

/** Build one instruction from parts and watch the assembler turn it into three numbers. */
export function AsmEncode({ props, onChange, status, goal }: WidgetProps<EncodeProps>) {
  const opcodes = props.opcodes ?? DEFAULT_OPCODES;
  const forms = opcodes.map((o) => FORMS.find((f) => f.opcode === o)).filter((f): f is Form => Boolean(f));
  const registers = props.registers ?? 4;
  const maxNumber = props.maxNumber ?? 20;
  const [opcode, setOpcode] = useState(props.initial?.opcode ?? forms[0]?.opcode ?? 0);
  const [a, setA] = useState(props.initial?.a ?? 0);
  const [b, setB] = useState(props.initial?.b ?? 0);

  const goalCode = status === "revealed" && Array.isArray(goal?.code) ? (goal.code as number[]) : null;
  const shown = goalCode ? { opcode: goalCode[0], a: goalCode[1] ?? 0, b: goalCode[2] ?? 0 } : { opcode, a, b };
  const form = FORMS.find((f) => f.opcode === shown.opcode) ?? forms[0];
  const locked = goalCode !== null;

  const update = (no: number, na: number, nb: number) => {
    const f = FORMS.find((x) => x.opcode === no) ?? forms[0];
    // keep register picks in range when switching forms
    const fix = (k: string | undefined, v: number) => (k === "reg" ? Math.min(v, registers - 1) : k === undefined ? 0 : Math.min(v, maxNumber));
    const fa = fix(f.kinds[0], na);
    const fb = fix(f.kinds[1], nb);
    setOpcode(no);
    setA(fa);
    setB(fb);
    const code: [number, number, number] = [no, f.kinds.length > 0 ? fa : 0, f.kinds.length > 1 ? fb : 0];
    onChange?.({ code, text: instrText({ op: f.op, args: toOperands(f, fa, fb) }) } satisfies EncodeState);
  };

  const va = form.kinds.length > 0 ? shown.a : 0;
  const vb = form.kinds.length > 1 ? shown.b : 0;
  const code = [form.opcode, va, vb];
  const text = instrText({ op: form.op, args: toOperands(form, va, vb) });
  const binary = props.binary ?? true;

  return (
    <div className="w-full min-w-0">
      <PanelLabel>Instruction</PanelLabel>
      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Instruction">
        {forms.map((f) => {
          const on = f.opcode === form.opcode;
          return (
            <button
              key={f.opcode}
              type="button"
              role="radio"
              aria-checked={on}
              disabled={locked}
              onClick={() => update(f.opcode, a, b)}
              className={`min-h-10 rounded-full border px-3 font-mono text-[0.8rem] font-medium transition-colors disabled:cursor-default ${on ? "border-[var(--primary)] bg-primary text-primary-ink" : "border-line bg-surface text-ink hover:bg-surface-2"}`}
            >
              {formLabel(f)}
            </button>
          );
        })}
      </div>

      {form.kinds.length > 0 && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {form.kinds.map((k, i) => {
            const v = i === 0 ? shown.a : shown.b;
            const set = (nv: number) => (i === 0 ? update(form.opcode, nv, b) : update(form.opcode, a, nv));
            return (
              <div key={i} className="min-w-0">
                <PanelLabel>{i === 0 ? "First operand" : "Second operand"}</PanelLabel>
                {k === "reg" ? (
                  <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={i === 0 ? "First register" : "Second register"}>
                    {Array.from({ length: registers }, (_, r) => (
                      <button
                        key={r}
                        type="button"
                        role="radio"
                        aria-checked={v === r}
                        disabled={locked}
                        onClick={() => set(r)}
                        className={`h-10 min-w-11 rounded-lg border px-2 font-mono text-sm font-semibold transition-colors disabled:cursor-default ${v === r ? "border-[var(--primary)] bg-primary text-primary-ink" : "border-line bg-surface text-ink hover:bg-surface-2"}`}
                      >
                        R{r}
                      </button>
                    ))}
                  </div>
                ) : (
                  <Stepper label={k === "imm" ? "number" : k === "label" ? "address" : "address"} value={v} min={0} max={maxNumber} onChange={set} disabled={locked} />
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className={`${CODE_SURFACE} mt-5 px-4 py-4`}>
        <p className="text-center font-mono text-[1.15rem] font-medium sm:text-[1.3rem]">{highlightAsm(text)}</p>
        <div className="my-2 flex items-center justify-center gap-2 text-[0.7rem] font-medium text-white/45">
          <ArrowDown className="h-3.5 w-3.5" /> assembler
        </div>
        <div className="flex justify-center gap-2 sm:gap-3">
          {code.map((n, i) => (
            <div key={i} className="flex min-w-0 flex-col items-center">
              <span className={`grid h-14 w-16 place-items-center rounded-lg border font-mono text-2xl font-semibold tabular-nums sm:w-20 ${i === 0 ? "border-[#a3e635]/60 bg-[#a3e635]/10 text-[#a3e635]" : "border-white/15 bg-white/[0.04] text-white"}`}>{n}</span>
              <span className="mt-1 text-[0.65rem] font-medium text-white/55">{i === 0 ? "opcode" : i === 1 ? "A" : "B"}</span>
              {binary && <span className="font-mono text-[0.65rem] tabular-nums text-white/40">{(n >>> 0 & 255).toString(2).padStart(8, "0")}</span>}
            </div>
          ))}
        </div>
      </div>
      <p className="mt-2 text-center text-xs text-ink-3">
        {form.kinds.length === 0 ? "No operands, so A and B are just 0." : form.kinds.length === 1 ? "One operand goes in A; B is unused (0)." : "The opcode says what to do; A and B say what to do it with."}
      </p>
    </div>
  );
}

export function checkEncode(state: unknown, goal: Record<string, unknown>) {
  const s = state as EncodeState | undefined;
  if (!s) return false;
  if (Array.isArray(goal.code)) return (goal.code as number[]).every((n, i) => s.code[i] === n);
  if (typeof goal.text === "string") return s.text.toUpperCase() === goal.text.toUpperCase();
  return false;
}
