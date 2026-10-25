"use client";

import React, { useState } from "react";
import { ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import type { WidgetProps } from "@/learn/widget";
import { Btn, Caption, clamp, hex, Note, Stepper } from "./ui";

export interface MemoryProps {
  /** Number of bytes (4–32). Default 16. */
  size?: number;
  /** Starting values (missing ones are 0). */
  initial?: number[];
  /** "view": tap a box to see its address and value. "read": values are hidden until you tap (read) them. "rw": read and write with the controls. Default "view". */
  mode?: "view" | "read" | "rw";
  /** Show addresses in hex (0x05) instead of decimal. */
  hexAddr?: boolean;
  /** Names for some addresses, e.g. { "12": "score" }, drawn under the box. */
  names?: Record<string, string>;
  /** rw mode: value the input starts with. */
  startValue?: number;
  label?: string;
}

export interface MemoryState {
  cells: number[];
  addr: number;
  reads: number[];
  writes: number;
  last: { op: "read" | "write"; addr: number; value: number } | null;
}

/** Memory as a row of numbered boxes: read and write bytes by address. */
export function Memory({ props, onChange, revealed, status, goal }: WidgetProps<MemoryProps>) {
  const size = clamp(props.size ?? 16, 4, 32);
  const mode = props.mode ?? "view";
  const [cells, setCells] = useState<number[]>(() => Array.from({ length: size }, (_, i) => clamp(props.initial?.[i] ?? 0, 0, 255)));
  const [addr, setAddr] = useState(0);
  const [value, setValue] = useState(String(props.startValue ?? ""));
  const [reads, setReads] = useState<number[]>([]);
  const [writes, setWrites] = useState(0);
  const [last, setLast] = useState<MemoryState["last"]>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const locked = Boolean(revealed);
  const fmtAddr = (a: number) => (props.hexAddr ? `0x${hex(a)}` : String(a));

  const report = (next: Partial<MemoryState>) =>
    onChange?.({ cells, addr, reads, writes, last, ...next } satisfies MemoryState);

  const read = (a: number) => {
    if (locked) return;
    const nextReads = reads.includes(a) ? reads : [...reads, a];
    const l = { op: "read" as const, addr: a, value: cells[a] };
    setReads(nextReads);
    setLast(l);
    setSelected(a);
    setAddr(a);
    report({ reads: nextReads, last: l, addr: a });
  };
  const num = Number(value);
  const valid = value.trim() !== "" && Number.isInteger(num) && num >= 0 && num <= 255;
  const write = () => {
    if (locked || !valid) return;
    const next = cells.slice();
    next[addr] = num;
    const l = { op: "write" as const, addr, value: num };
    setCells(next);
    setLast(l);
    setSelected(addr);
    setWrites(writes + 1);
    report({ cells: next, last: l, writes: writes + 1 });
  };
  const tapCell = (a: number) => {
    if (locked) return;
    if (mode === "rw") {
      setAddr(a);
      setSelected(a);
      report({ addr: a });
    } else read(a);
  };

  const goalCells = status === "revealed" && goal?.cells && typeof goal.cells === "object" ? (goal.cells as Record<string, number>) : null;
  const goalRead = status === "revealed" && typeof goal?.read === "number" ? goal.read : null;
  const shown = (a: number) => mode !== "read" || reads.includes(a) || goalRead === a;

  return (
    <div className="w-full">
      {props.label && <Caption className="mb-2 text-center">{props.label}</Caption>}
      <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-8">
        {cells.map((v, a) => {
          const isSel = selected === a;
          const justWrote = last?.op === "write" && last.addr === a;
          const want = goalCells?.[String(a)];
          const name = props.names?.[String(a)];
          return (
            <button
              key={a}
              type="button"
              onClick={() => tapCell(a)}
              disabled={locked}
              aria-label={`Address ${fmtAddr(a)}${shown(a) ? `, holds ${v}` : ""}`}
              className={`relative flex min-h-[3.6rem] flex-col items-stretch overflow-hidden rounded-lg border text-center transition-colors disabled:cursor-default ${
                isSel ? "border-[var(--brand)] bg-tint shadow-[0_0_0_3px_var(--brand-soft)]" : want !== undefined || goalRead === a ? "border-dashed border-[var(--brand)] bg-surface" : "border-line bg-surface hover:border-[var(--line-strong)]"
              }`}
            >
              <span className={`border-b px-1 py-0.5 font-mono text-[10px] tabular-nums ${isSel ? "border-[var(--brand)]/30 text-brand" : "border-line text-ink-3"}`}>{fmtAddr(a)}</span>
              <span className={`grid flex-1 place-items-center font-mono text-[1.05rem] font-semibold tabular-nums ${justWrote ? "text-brand" : shown(a) ? "text-ink" : "text-ink-3"}`}>
                {shown(a) ? v : "?"}
              </span>
              {want !== undefined && want !== v && <span className="pb-0.5 font-mono text-[10px] text-brand">→ {want}</span>}
              {name && <span className="truncate px-1 pb-0.5 font-mono text-[9.5px] text-ink-3">{name}</span>}
            </button>
          );
        })}
      </div>

      {mode === "rw" && (
        <div className="mt-4 flex flex-wrap items-end justify-center gap-x-4 gap-y-3 rounded-xl border border-line bg-surface-2 p-3">
          <div className="flex flex-col items-center gap-1">
            <Caption>Address</Caption>
            <Stepper
              label="Address"
              value={addr}
              min={0}
              max={size - 1}
              format={fmtAddr}
              disabled={locked}
              onChange={(a) => {
                setAddr(a);
                setSelected(a);
                report({ addr: a });
              }}
            />
          </div>
          <div className="flex flex-col items-center gap-1">
            <Caption>Value (0–255)</Caption>
            <input
              className="input !h-10 w-24 text-center font-mono font-semibold"
              inputMode="numeric"
              value={value}
              disabled={locked}
              aria-label="Value to write"
              placeholder="0–255"
              onChange={(e) => setValue(e.target.value.replace(/[^0-9]/g, "").slice(0, 3))}
              onKeyDown={(e) => {
                if (e.key === "Enter") write();
              }}
            />
          </div>
          <div className="flex gap-2">
            <Btn onClick={() => read(addr)} disabled={locked}>
              <ArrowUpFromLine className="h-4 w-4" /> Read
            </Btn>
            <Btn primary onClick={write} disabled={locked || !valid}>
              <ArrowDownToLine className="h-4 w-4" /> Write
            </Btn>
          </div>
        </div>
      )}

      <div className="mt-3">
        <Note tone={last ? "accent" : "plain"}>
          {last ? (
            last.op === "read" ? (
              <>
                Read address <b className="font-mono">{fmtAddr(last.addr)}</b>: it holds <b className="font-mono">{last.value}</b>. Reading doesn&apos;t change it.
              </>
            ) : (
              <>
                Wrote <b className="font-mono">{last.value}</b> into address <b className="font-mono">{fmtAddr(last.addr)}</b>. Whatever was there before is gone.
              </>
            )
          ) : mode === "rw" ? (
            "Pick an address (tap a box or use − +), type a value, then Read or Write."
          ) : mode === "read" ? (
            "Each box hides its value until you read it. Tap a box to read it."
          ) : (
            "Tap a box to read it."
          )}
        </Note>
        {mode === "rw" && value !== "" && !valid && <p className="mt-1.5 text-center text-xs text-bad">One byte holds 0 to 255.</p>}
      </div>
    </div>
  );
}

/** goal: { cells: { addr: value } } (all must match) and/or { read: addr } (that box was read). */
export function checkMemory(state: unknown, goal: Record<string, unknown>) {
  const s = state as MemoryState | undefined;
  if (!s) return false;
  let any = false;
  if (goal.cells && typeof goal.cells === "object") {
    any = true;
    for (const [a, v] of Object.entries(goal.cells as Record<string, number>)) if (s.cells[Number(a)] !== v) return false;
  }
  if (typeof goal.read === "number") {
    any = true;
    if (!s.reads.includes(goal.read)) return false;
  }
  return any;
}
