"use client";

import React, { useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { Caption, Note, Readout, Seg } from "../computer/ui";
import { alu, fullAdder, halfAdder, type AluOp } from "./sim";

export interface AdderProps {
  /** "half": one bit + one bit. "full": adds a carry-in. "ripple": four full adders in a row. "alu": ripple plus add / subtract / compare. */
  mode?: "half" | "full" | "ripple" | "alu";
  /** Starting inputs (ripple / alu). */
  a?: number;
  b?: number;
}

export interface AdderState {
  a: number;
  b: number;
  cin: number;
  op: AluOp;
  sum: number;
  carry: number;
  value: number;
  carryOut: number;
  zero: boolean;
  /** Longest run of carries passing from one full adder to the next. */
  hops: number;
}

const bitBtn = (on: boolean) =>
  `grid h-10 w-full min-w-10 place-items-center rounded-lg border font-mono text-base font-semibold transition-colors ${
    on ? "border-transparent bg-primary text-primary-ink" : "border-line bg-surface text-ink hover:bg-surface-2"
  }`;

function Chip({ v, hot, label }: { v: number; hot?: boolean; label?: string }) {
  return (
    <span
      aria-label={label}
      className={`grid h-8 w-full place-items-center rounded-md border font-mono text-sm font-semibold ${
        v && hot ? "border-[var(--brand)] bg-tint text-ink" : v ? "border-[var(--line-strong)] bg-surface-2 text-ink" : "border-line text-ink-3"
      }`}
    >
      {v}
    </span>
  );
}

/** From a gate-level half/full adder to a 4-bit ripple-carry adder and a tiny ALU. Toggle input bits and watch the carries. */
export function Adder({ props, onChange }: WidgetProps<AdderProps>) {
  const mode = props.mode ?? "ripple";
  const small = mode === "half" || mode === "full";
  const [a, setA] = useState(small ? 0 : (props.a ?? 0));
  const [b, setB] = useState(small ? 0 : (props.b ?? 0));
  const [cin, setCin] = useState(0);
  const [op, setOp] = useState<AluOp>("add");

  const report = (A: number, B: number, C: number, O: AluOp) => {
    const bits = small ? 1 : 4;
    const r = small ? null : alu(A, B, mode === "alu" ? O : "add", bits);
    let st: AdderState;
    if (small) {
      const h = mode === "half" ? halfAdder(A & 1, B & 1) : fullAdder(A & 1, B & 1, C);
      st = { a: A, b: B, cin: C, op: "add", sum: h.sum, carry: h.carry, value: h.sum + 2 * h.carry, carryOut: h.carry, zero: h.sum === 0, hops: 0 };
    } else {
      let hops = 0;
      let run = 0;
      for (let i = 1; i <= bits; i++) {
        if (r!.carries[i]) run++;
        else run = 0;
        hops = Math.max(hops, run);
      }
      st = { a: A, b: B, cin: C, op: O, sum: r!.value, carry: r!.carryOut, value: r!.value, carryOut: r!.carryOut, zero: r!.zero, hops };
    }
    onChange?.(st);
  };
  const set = (A = a, B = b, C = cin, O = op) => {
    setA(A);
    setB(B);
    setCin(C);
    setOp(O);
    report(A, B, C, O);
  };

  if (small) {
    const h = mode === "half" ? halfAdder(a, b) : fullAdder(a, b, cin);
    const rows: [number, number, number][] = mode === "half" ? [[0, 0, 0], [0, 1, 0], [1, 0, 0], [1, 1, 0]] : [0, 1].flatMap((c) => [[0, 0, c], [0, 1, c], [1, 0, c], [1, 1, c]] as [number, number, number][]);
    return (
      <div className="w-full">
        <div className="flex flex-wrap items-end justify-center gap-3">
          {(
            [
              ["A", a, () => set(1 - a)],
              ["B", b, () => set(undefined, 1 - b)],
              ...(mode === "full" ? ([["Carry in", cin, () => set(undefined, undefined, 1 - cin)]] as const) : []),
            ] as const
          ).map(([label, v, flip]) => (
            <div key={label} className="flex w-24 flex-col items-center gap-1">
              <Caption>{label}</Caption>
              <button type="button" className={bitBtn(v === 1)} onClick={flip} aria-label={`${label}: ${v}, tap to flip`} aria-pressed={v === 1}>
                {v}
              </button>
            </div>
          ))}
        </div>
        <div className="mt-3 rounded-xl border border-line bg-surface-2 p-3 font-mono text-sm leading-relaxed text-ink-2">
          {mode === "half" ? (
            <>
              <p>
                Sum = A <b className="text-ink">XOR</b> B = {a} XOR {b} = <b className="text-ink">{h.sum}</b>
              </p>
              <p>
                Carry = A <b className="text-ink">AND</b> B = {a} AND {b} = <b className="text-ink">{h.carry}</b>
              </p>
            </>
          ) : (
            <>
              <p>
                Sum = A XOR B XOR Carry in = {a} XOR {b} XOR {cin} = <b className="text-ink">{h.sum}</b>
              </p>
              <p>
                Carry out = 1 when <b className="text-ink">two or more</b> inputs are 1 = <b className="text-ink">{h.carry}</b>
              </p>
            </>
          )}
        </div>
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          <Readout label="Sum bit" value={h.sum} accent />
          <Readout label="Carry out" value={h.carry} accent />
          <Readout label="Counts as" value={`${a}+${b}${mode === "full" ? `+${cin}` : ""} = ${h.sum + 2 * h.carry}`} />
        </div>
        <details className="mt-3 rounded-xl border border-line bg-surface px-3 py-2 text-sm text-ink-2">
          <summary className="min-h-10 cursor-pointer py-2 text-ink">Truth table</summary>
          <table className="mt-1 w-full text-center font-mono text-xs">
            <thead className="text-ink-3">
              <tr>
                <th>A</th>
                <th>B</th>
                {mode === "full" && <th>Cin</th>}
                <th>Carry</th>
                <th>Sum</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(([x, y, c]) => {
                const r = mode === "half" ? halfAdder(x, y) : fullAdder(x, y, c);
                const cur = x === a && y === b && (mode === "half" || c === cin);
                return (
                  <tr key={`${x}${y}${c}`} className={cur ? "bg-tint font-semibold text-ink" : "text-ink-2"}>
                    <td>{x}</td>
                    <td>{y}</td>
                    {mode === "full" && <td>{c}</td>}
                    <td>{r.carry}</td>
                    <td>{r.sum}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </details>
      </div>
    );
  }

  const bits = 4;
  const useOp: AluOp = mode === "alu" ? op : "add";
  const r = alu(a, b, useOp, bits);
  const order = [3, 2, 1, 0];
  let hops = 0;
  let run = 0;
  for (let i = 1; i <= bits; i++) {
    run = r.carries[i] ? run + 1 : 0;
    hops = Math.max(hops, run);
  }
  const flip = (which: "a" | "b", i: number) => (which === "a" ? set(a ^ (1 << i)) : set(a, b ^ (1 << i)));

  return (
    <div className="w-full">
      {mode === "alu" && (
        <div className="mb-3 flex justify-center">
          <Seg
            label="ALU operation"
            value={op}
            onChange={(o) => set(a, b, cin, o)}
            options={[
              { value: "add", label: "Add" },
              { value: "sub", label: "Subtract" },
              { value: "cmp", label: "Compare" },
            ]}
          />
        </div>
      )}
      <div className="rounded-xl border border-line bg-surface-2 p-2.5">
        <div className="grid items-center gap-x-1.5 gap-y-1.5" style={{ gridTemplateColumns: "1.9rem repeat(4, minmax(2.5rem, 1fr))" }}>
          <Caption className="col-span-5 -mb-0.5">Carry (the first chip is the carry out)</Caption>
          <Chip v={r.carries[4]} hot label={`Carry out: ${r.carries[4]}`} />
          {order.map((i) => (
            <Chip key={i} v={r.carries[i]} hot label={`Carry into bit ${i}: ${r.carries[i]}`} />
          ))}

          <Caption className="col-span-5 -mb-0.5 mt-1">A</Caption>
          <span />
          {order.map((i) => (
            <button key={i} type="button" className={bitBtn(Boolean((a >> i) & 1))} onClick={() => flip("a", i)} aria-label={`A bit ${i}: ${(a >> i) & 1}, tap to flip`} aria-pressed={Boolean((a >> i) & 1)}>
              {(a >> i) & 1}
            </button>
          ))}

          <Caption className="col-span-5 -mb-0.5 mt-1">{useOp === "add" ? "B" : "NOT B (B flipped)"}</Caption>
          <span />
          {order.map((i) =>
            useOp === "add" ? (
              <button key={i} type="button" className={bitBtn(Boolean((b >> i) & 1))} onClick={() => flip("b", i)} aria-label={`B bit ${i}: ${(b >> i) & 1}, tap to flip`} aria-pressed={Boolean((b >> i) & 1)}>
                {(b >> i) & 1}
              </button>
            ) : (
              <button key={i} type="button" className={bitBtn(Boolean((r.bUsed >> i) & 1))} onClick={() => flip("b", i)} aria-label={`B bit ${i}: ${(b >> i) & 1}, flipped to ${(r.bUsed >> i) & 1} for subtract; tap to flip B`}>
                {(r.bUsed >> i) & 1}
              </button>
            ),
          )}

          <Caption className="col-span-5 -mb-0.5 mt-1">{useOp === "cmp" ? "A − B" : "Result"}</Caption>
          <span />
          {order.map((i) => (
            <Chip key={i} v={r.sum[i]} hot label={`Result bit ${i}: ${r.sum[i]}`} />
          ))}
        </div>
        {useOp !== "add" && (
          <p className="mt-2 text-xs text-ink-3">
            Subtract = A + (B with every bit flipped) + 1. The first carry-in is a 1.
          </p>
        )}
      </div>
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        <Readout label="A" value={a} />
        <Readout label="B" value={b} />
        <Readout label={useOp === "add" ? "A + B" : "A − B"} value={r.value} accent />
        <Readout label="Carry hops" value={hops} />
      </div>
      {mode === "alu" ? (
        <div className="mt-3">
          <Note tone="accent">
            Flags: <b>Z (zero)</b> = {r.zero ? "1, the result is all zeros" : "0"} · <b>C (carry out)</b> = {r.carryOut}
            {useOp === "add"
              ? r.carryOut
                ? ". The sum did not fit in 4 bits and wrapped around."
                : "."
              : r.zero
                ? ". A and B are equal."
                : r.carryOut
                  ? ". Nothing was borrowed, so A is bigger than B."
                  : ". A borrow was needed, so A is smaller than B."}
          </Note>
        </div>
      ) : (
        <div className="mt-3">
          <Note>
            {r.carryOut ? "The sum does not fit in 4 bits: the carry out is the missing fifth bit, and the 4-bit result wraps around." : hops >= 2 ? `A carry rippled through ${hops} adders in a row. Each one had to wait for the one before it.` : "Flip a bit and watch the carry chips. The carry moves from right to left, one adder at a time."}
          </Note>
        </div>
      )}
    </div>
  );
}

/** goal: any of { value, carryOut, zero, minHops, a, b, op } */
export function checkAdder(state: unknown, goal: Record<string, unknown>) {
  const s = state as AdderState | undefined;
  if (!s) return false;
  if (typeof goal.value === "number" && s.value !== goal.value) return false;
  if (typeof goal.sum === "number" && s.sum !== goal.sum) return false;
  if (typeof goal.carry === "number" && s.carry !== goal.carry) return false;
  if (typeof goal.carryOut === "number" && s.carryOut !== goal.carryOut) return false;
  if (typeof goal.zero === "boolean" && s.zero !== goal.zero) return false;
  if (typeof goal.minHops === "number" && s.hops < goal.minHops) return false;
  if (typeof goal.a === "number" && s.a !== goal.a) return false;
  if (typeof goal.b === "number" && s.b !== goal.b) return false;
  if (typeof goal.op === "string" && s.op !== goal.op) return false;
  return true;
}
