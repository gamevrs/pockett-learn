"use client";

import React, { useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { CODE_SURFACE, Stepper } from "../programs/values";
import { USAGE } from "./machine";
import { FlagLight, highlightAsm, num, PanelLabel } from "./shared";

type Jump = "JZ" | "JNZ" | "JLT" | "JGT";

export interface FlagsProps {
  a?: number;
  b?: number;
  min?: number;
  max?: number;
  /** Which conditional jumps to list (default all four). */
  jumps?: Jump[];
}

export interface FlagsState {
  a: number;
  b: number;
  z: boolean;
  n: boolean;
  /** The jumps that would be taken. */
  taken: Jump[];
}

const ALL: Jump[] = ["JZ", "JNZ", "JLT", "JGT"];

function takes(j: Jump, z: boolean, n: boolean) {
  if (j === "JZ") return z;
  if (j === "JNZ") return !z;
  if (j === "JLT") return n;
  return !z && !n;
}

/** CMP R0, R1 with adjustable values: see the subtraction, the flags it leaves, and which jumps would fire. */
export function AsmFlags({ props, onChange, status, goal }: WidgetProps<FlagsProps>) {
  const min = props.min ?? -9;
  const max = props.max ?? 9;
  const [a, setA] = useState(props.a ?? 5);
  const [b, setB] = useState(props.b ?? 8);
  const jumps = props.jumps ?? ALL;
  const locked = status === "revealed" || status === "correct";

  const d = a - b;
  const z = d === 0;
  const n = d < 0;
  const set = (na: number, nb: number) => {
    setA(na);
    setB(nb);
    const nz = na - nb === 0;
    const nn = na - nb < 0;
    onChange?.({ a: na, b: nb, z: nz, n: nn, taken: ALL.filter((j) => takes(j, nz, nn)) } satisfies FlagsState);
  };

  return (
    <div className="mx-auto w-full max-w-md">
      <div className={`${CODE_SURFACE} px-4 py-3 text-center font-mono text-[1.05rem]`}>{highlightAsm("CMP R0, R1")}</div>

      <div className="mt-3 flex flex-wrap justify-center gap-2">
        <Stepper label="R0" value={a} min={min} max={max} onChange={(v) => set(v, b)} disabled={locked} />
        <Stepper label="R1" value={b} min={min} max={max} onChange={(v) => set(a, v)} disabled={locked} />
      </div>

      <p className="mt-3 text-center font-mono text-sm text-ink-2">
        R0 − R1 = {num(a)} − {b < 0 ? `(${num(b)})` : num(b)} = <span className="font-semibold text-ink">{num(d)}</span>
      </p>
      <p className="mt-0.5 text-center text-xs text-ink-3">CMP throws the answer away and keeps only the flags.</p>

      <div className="mt-3 flex gap-2">
        <FlagLight name="Z" on={z} title="Zero flag: the result was zero (the two were equal)" />
        <FlagLight name="N" on={n} title="Negative flag: the result was below zero (R0 was less)" />
      </div>

      <div className="mt-4">
        <PanelLabel>Would it jump?</PanelLabel>
        <ul className="grid gap-1.5">
          {jumps.map((j) => {
            const t = takes(j, z, n);
            return (
              <li key={j} className={`flex min-h-10 items-center gap-3 rounded-lg border px-3 py-1.5 ${t ? "border-[var(--brand)] bg-tint" : "border-line bg-surface"}`}>
                <span className="w-10 font-mono text-sm font-semibold text-ink">{j}</span>
                <span className="min-w-0 flex-1 text-[0.8rem] leading-snug text-ink-2">{USAGE[j].does.replace(/^Jump /, "jumps ")}</span>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[0.7rem] font-semibold ${t ? "bg-primary text-primary-ink" : "bg-surface-2 text-ink-3"}`}>{t ? "jumps" : "no jump"}</span>
              </li>
            );
          })}
        </ul>
      </div>
      {status === "revealed" && goal && <p className="mt-3 text-center text-sm text-ink-2">{revealText(goal)}</p>}
    </div>
  );
}

function revealText(goal: Record<string, unknown>) {
  if (goal.z === true) return "Any two equal numbers work, like R0 = 4 and R1 = 4.";
  if (goal.n === true) return "Any R0 smaller than R1 works, like R0 = 2 and R1 = 7.";
  if (goal.z === false && goal.n === false) return "Any R0 bigger than R1 works, like R0 = 7 and R1 = 2.";
  return "";
}

export function checkFlags(state: unknown, goal: Record<string, unknown>) {
  const s = state as FlagsState | undefined;
  if (!s) return false;
  if (typeof goal.z === "boolean" && s.z !== goal.z) return false;
  if (typeof goal.n === "boolean" && s.n !== goal.n) return false;
  if (Array.isArray(goal.taken)) {
    const want = new Set(goal.taken as string[]);
    if (want.size !== s.taken.length || !s.taken.every((t) => want.has(t))) return false;
  }
  return true;
}
