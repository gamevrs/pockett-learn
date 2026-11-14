"use client";

import React, { useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { BitBtn, Caption, Lamp, Note, Readout, Seg } from "./ui";
import { decode, mux, priorityEncode } from "./sim";

type Mode = "mux" | "decoder" | "encoder" | "lut";

export interface MuxProps {
  mode?: Mode;
  /** show a selector between the four building blocks */
  pick?: boolean;
  /** decoder width: 2 gives a 2-to-4 decoder, 3 a 3-to-8 */
  bits?: 2 | 3;
}

export interface MuxState {
  mode: Mode;
  /** select / address value */
  sel: number;
  /** data inputs (mux), toggled inputs (encoder) or the truth table column (lut), index = row */
  data: number[];
  enable: boolean;
  out: number;
  /** lut: the truth table as a number, row 0 is the lowest bit */
  table: number;
  /** encoder */
  code: number;
  valid: number;
}

const bitsOf = (n: number, w: number) => Array.from({ length: w }, (_, i) => (n >> (w - 1 - i)) & 1);
const binStr = (n: number, w: number) => bitsOf(n, w).join("");

function snap(mode: Mode, sel: number, data: number[], enable: boolean, decBits: number): MuxState {
  let out = 0;
  let code = 0;
  let valid = 0;
  if (mode === "mux" || mode === "lut") out = mux(sel, data);
  if (mode === "decoder") out = decode(sel, 2 ** decBits, enable).indexOf(1);
  if (mode === "encoder") {
    const e = priorityEncode(data);
    code = e.code;
    valid = e.valid;
    out = e.code;
  }
  const table = mode === "lut" ? data.reduce((n, b, i) => n + (b ? 2 ** i : 0), 0) : 0;
  return { mode, sel, data, enable, out, table, code, valid };
}

/** Playground for the combinational building blocks: multiplexer, decoder, priority encoder, and a multiplexer used as a lookup table. */
export function MuxPlay({ props, onChange }: WidgetProps<MuxProps>) {
  const decBits = props.bits ?? 2;
  const [mode, setMode] = useState<Mode>(props.mode ?? "mux");
  const [sel, setSel] = useState(0);
  const [data, setData] = useState<number[]>(mode === "lut" ? new Array(8).fill(0) : mode === "mux" ? [0, 1, 1, 0] : [0, 0, 0, 0]);
  const [enable, setEnable] = useState(true);

  const apply = (m: Mode, s: number, d: number[], e: boolean) => {
    setMode(m);
    setSel(s);
    setData(d);
    setEnable(e);
    onChange?.(snap(m, s, d, e, decBits));
  };
  const defaults = (m: Mode) => (m === "lut" ? new Array(8).fill(0) : m === "mux" ? [0, 1, 1, 0] : [0, 0, 0, 0]);
  const flip = (i: number) => apply(mode, sel, data.map((v, k) => (k === i ? 1 - v : v)), enable);
  const s = snap(mode, sel, data, enable, decBits);

  const flipSel = (bitIdx: number) => apply(mode, sel ^ (1 << bitIdx), data, enable);

  return (
    <div className="w-full" data-widget="digi-mux">
      {props.pick && (
        <div className="mb-3 flex justify-center">
          <Seg
            label="Building block"
            value={mode}
            onChange={(m) => apply(m, 0, defaults(m), true)}
            options={[
              { value: "mux", label: "Multiplexer" },
              { value: "decoder", label: "Decoder" },
              { value: "encoder", label: "Encoder" },
            ]}
          />
        </div>
      )}

      {mode === "mux" && (
        <div className="rounded-xl border border-line bg-surface-2 p-3">
          <Caption>Data inputs (tap to flip)</Caption>
          <div className="mt-1 flex flex-wrap gap-2">
            {data.map((v, i) => (
              <span key={i} className={`rounded-lg ${i === sel ? "ring-2 ring-[var(--brand)] ring-offset-2 ring-offset-[var(--surface-2)]" : ""}`}>
                <BitBtn label={`D${i}`} value={v} onClick={() => flip(i)} />
              </span>
            ))}
          </div>
          <Caption className="mt-3">Select inputs (a binary number picks the input)</Caption>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <BitBtn label="S1" value={(sel >> 1) & 1} onClick={() => flipSel(1)} />
            <BitBtn label="S0" value={sel & 1} onClick={() => flipSel(0)} />
            <span className="font-mono text-sm text-ink-2">
              S1S0 = {binStr(sel, 2)} = {sel} → passes D{sel}
            </span>
          </div>
        </div>
      )}

      {mode === "decoder" && (
        <div className="rounded-xl border border-line bg-surface-2 p-3">
          <Caption>Address inputs and enable</Caption>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            {Array.from({ length: decBits }, (_, k) => decBits - 1 - k).map((b) => (
              <BitBtn key={b} label={`A${b}`} value={(sel >> b) & 1} onClick={() => flipSel(b)} />
            ))}
            <BitBtn label="EN" value={enable ? 1 : 0} onClick={() => apply(mode, sel, data, !enable)} />
          </div>
          <Caption className="mt-3">Outputs (exactly one is 1 when enabled)</Caption>
          <div className="mt-1 flex flex-wrap gap-2">
            {decode(sel, 2 ** decBits, enable).map((v, i) => (
              <span key={i} className="flex flex-col items-center gap-0.5">
                <Lamp v={v} label={`Y${i}`} />
                <span className="font-mono text-[11px] text-ink-3">Y{i}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {mode === "encoder" && (
        <div className="rounded-xl border border-line bg-surface-2 p-3">
          <Caption>Request lines (tap to raise or lower)</Caption>
          <div className="mt-1 flex flex-wrap gap-2">
            {data.map((v, i) => (
              <BitBtn key={i} label={`I${i}`} value={v} onClick={() => flip(i)} />
            ))}
          </div>
          <Caption className="mt-3">Output: the number of the highest active line</Caption>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <Lamp v={bitsOf(s.code, 2)[0]} label="Output bit 1" />
            <Lamp v={bitsOf(s.code, 2)[1]} label="Output bit 0" />
            <span className="font-mono text-sm text-ink-2">
              code {binStr(s.code, 2)} = {s.code}, valid = {s.valid}
            </span>
          </div>
        </div>
      )}

      {mode === "lut" && (
        <div className="rounded-xl border border-line bg-surface-2 p-3">
          <Caption>Inputs A, B, C choose a row</Caption>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <BitBtn label="A" value={(sel >> 2) & 1} onClick={() => flipSel(2)} />
            <BitBtn label="B" value={(sel >> 1) & 1} onClick={() => flipSel(1)} />
            <BitBtn label="C" value={sel & 1} onClick={() => flipSel(0)} />
          </div>
          <Caption className="mt-3">The 8 data inputs are the answer column of a truth table (tap to flip)</Caption>
          <div className="mt-1 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
            {data.map((v, i) => (
              <button
                key={i}
                type="button"
                onClick={() => flip(i)}
                aria-label={`Row ${binStr(i, 3)}: output ${v}, tap to flip`}
                aria-pressed={v === 1}
                className={`inline-flex min-h-10 items-center justify-between gap-2 rounded-lg border px-3 font-mono text-sm transition-colors ${v ? "border-transparent bg-primary text-primary-ink" : "border-line bg-surface text-ink hover:bg-surface-2"} ${i === sel ? "ring-2 ring-[var(--brand)] ring-offset-2 ring-offset-[var(--surface-2)]" : ""}`}
              >
                <span className="text-xs opacity-80">{binStr(i, 3)}</span>
                <span className="font-semibold">{v}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-3 flex flex-wrap justify-center gap-2">
        {mode === "mux" && <Readout label="Output" value={s.out} accent />}
        {mode === "lut" && (
          <>
            <Readout label="Output for this row" value={s.out} accent />
            <Readout label="Table as a number" value={s.table} />
          </>
        )}
        {mode === "decoder" && <Readout label="Active output" value={enable ? `Y${sel}` : "none (disabled)"} accent />}
        {mode === "encoder" && <Readout label="Code out" value={s.valid ? s.code : "none"} accent />}
      </div>
      <div className="mt-3">
        <Note>
          {mode === "mux" && "A multiplexer (mux) is a data selector: the select inputs choose which one data input reaches the output."}
          {mode === "decoder" && `A decoder does the reverse of counting in binary: ${decBits} address bits light exactly one of ${2 ** decBits} outputs (one-hot). The enable input turns all outputs off.`}
          {mode === "encoder" && "A priority encoder reports the number of the highest request line that is active, plus a valid flag. With several requests, the highest wins."}
          {mode === "lut" && "A multiplexer with its data inputs wired to constants is a lookup table (LUT): the inputs are the address, the data inputs hold the answers. Any 3-input function fits in 8 bits. FPGAs are built from such tables."}
        </Note>
      </div>
    </div>
  );
}

/** goal: any of { mode, sel, out, table, code, valid } or { data: number[] } */
export function checkMux(state: unknown, goal: Record<string, unknown>) {
  const s = state as MuxState | undefined;
  if (!s) return false;
  for (const k of ["mode", "sel", "out", "table", "code", "valid"] as const) if (k in goal && s[k] !== goal[k]) return false;
  if (Array.isArray(goal.data)) {
    const want = goal.data as number[];
    if (want.length !== s.data.length || want.some((v, i) => v !== s.data[i])) return false;
  }
  return Object.keys(goal).length > 0;
}
