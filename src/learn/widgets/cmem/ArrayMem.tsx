"use client";

import React, { useState } from "react";
import { TriangleAlert } from "lucide-react";
import type { WidgetProps } from "@/learn/widget";
import { CodeBlock } from "@/components/ui/Prose";
import { CODE_SURFACE, hex, Label, Readout } from "./shared";

export interface ArrayMemProps {
  /** Array name (default "a"). */
  name?: string;
  /** Element type (default int). */
  type?: "char" | "int" | "double";
  /** Address of element 0 (default 0x2000). */
  base?: number;
  /** Element values (for char, a string or char codes). */
  values: number[] | string;
  /** A variable stored right after the array (same type), to show what out-of-bounds reaches. */
  after?: { name: string; value: number | string };
  /** Index range the stepper allows (default 0 … length − 1). */
  minIndex?: number;
  maxIndex?: number;
  /** Start index. */
  index?: number;
  /** Offer `a[i] = value;` with this value (shows writes landing in the neighbour). */
  write?: number | string;
  /** Hide the address/value readouts until answered (for predictions). */
  hideAnswer?: boolean;
  label?: string;
}

export interface ArrayMemState {
  i: number;
  addr: number;
  outOfBounds: boolean;
  /** The neighbour variable was overwritten by an out-of-bounds write. */
  corrupted: boolean;
  wrote: boolean;
}

const SIZES = { char: 1, int: 4, double: 8 } as const;

const show = (type: "char" | "int" | "double", v: number | string) =>
  type === "char" ? `'${typeof v === "string" ? v : String.fromCharCode(v)}'` : type === "double" ? (Number.isInteger(Number(v)) ? `${v}.0` : String(v)) : String(v);

/** An array as consecutive boxes in memory: a[i] is the box at base + i × element size. */
export function ArrayMem({ props, onChange, revealed }: WidgetProps<ArrayMemProps>) {
  const name = props.name ?? "a";
  const type = props.type ?? "int";
  const size = SIZES[type];
  const base = props.base ?? 0x2000;
  const initial = typeof props.values === "string" ? [...props.values] : props.values;
  const n = initial.length;
  const min = props.minIndex ?? 0;
  const max = props.maxIndex ?? n - 1;
  const [i, setI] = useState(Math.min(max, Math.max(min, props.index ?? 0)));
  const [vals, setVals] = useState<(number | string)[]>(initial);
  const [after, setAfter] = useState<number | string | undefined>(props.after?.value);
  const [wrote, setWrote] = useState<{ at: number; hit: "array" | "after" | "unknown" } | null>(null);
  const locked = Boolean(revealed) && !props.write;

  const addr = base + i * size;
  const oob = i < 0 || i >= n;
  const inAfter = Boolean(props.after) && i === n;
  const value = !oob ? vals[i] : inAfter ? after : undefined;
  const corrupted = props.after !== undefined && after !== props.after.value;

  const report = (ni: number, w: boolean, c: boolean) =>
    onChange?.({ i: ni, addr: base + ni * size, outOfBounds: ni < 0 || ni >= n, corrupted: c, wrote: w } satisfies ArrayMemState);

  const move = (ni: number) => {
    if (locked) return;
    const c = Math.min(max, Math.max(min, ni));
    setI(c);
    setWrote(null);
    report(c, false, corrupted);
  };
  const doWrite = () => {
    if (props.write === undefined) return;
    let c = corrupted;
    if (!oob) {
      const next = vals.slice();
      next[i] = props.write;
      setVals(next);
      setWrote({ at: i, hit: "array" });
    } else if (inAfter) {
      setAfter(props.write);
      c = true;
      setWrote({ at: i, hit: "after" });
    } else setWrote({ at: i, hit: "unknown" });
    report(i, true, c);
  };
  const resetAll = () => {
    setVals(initial);
    setAfter(props.after?.value);
    setWrote(null);
    report(i, false, false);
  };

  const hide = props.hideAnswer && !revealed;
  // boxes: optional one before (index -1), the array, the neighbour, and unknown memory up to max
  const first = Math.min(0, min);
  const last = Math.max(n - 1 + (props.after ? 1 : 0), max);
  const slots = Array.from({ length: last - first + 1 }, (_, k) => first + k);
  const wide = type === "char" ? "min-w-[2.6rem]" : type === "int" ? "min-w-[3.6rem]" : "min-w-[4.6rem]";

  return (
    <div className="w-full min-w-0">
      {props.label && <p className="mb-3 text-center text-xs font-medium text-ink-3">{props.label}</p>}

      <div className="overflow-x-auto pb-1">
        <div className="mx-auto flex w-max items-end">
          {slots.map((k) => {
            const isArr = k >= 0 && k < n;
            const isAfter = Boolean(props.after) && k === n;
            const on = k === i;
            const v = isArr ? vals[k] : isAfter ? after : undefined;
            const changed = wrote !== null && wrote.at === k && wrote.hit !== "unknown";
            return (
              <div key={k} className={`-ml-px flex flex-col items-center first:ml-0 ${wide}`}>
                <span className={`mb-1 font-mono text-[0.62rem] tabular-nums ${on ? "font-semibold text-brand" : "text-ink-3"}`}>{hide && k !== 0 ? " " : hex(base + k * size)}</span>
                <span
                  className={`flex h-12 w-full items-center justify-center border px-1.5 font-mono text-sm font-semibold tabular-nums transition-colors ${
                    on ? (isArr ? "relative z-10 border-[var(--brand)] bg-primary text-primary-ink" : "relative z-10 border-[var(--bad)] bg-surface text-bad ring-1 ring-[var(--bad)]") : isArr ? "border-[var(--line-strong)] bg-surface-2 text-ink" : isAfter ? "border-dashed border-[var(--line-strong)] bg-surface text-ink-2" : "border-dashed border-line bg-transparent text-ink-3"
                  } ${changed && !on ? "bg-tint" : ""}`}
                >
                  {v === undefined ? "??" : show(type, v)}
                </span>
                <span className={`mt-1 font-mono text-[0.68rem] ${on ? "font-semibold text-ink" : "text-ink-3"}`}>{isArr ? `[${k}]` : isAfter ? props.after!.name : "?"}</span>
              </div>
            );
          })}
        </div>
      </div>
      <div className="mx-auto mt-1 flex w-full max-w-md items-center gap-2 text-[0.68rem] text-ink-3">
        <span className="h-2.5 w-2.5 rounded-sm border border-[var(--line-strong)] bg-surface-2" /> {name}: {n} × {type} = {n * size} bytes
        {props.after && (
          <>
            <span className="ml-2 h-2.5 w-2.5 rounded-sm border border-dashed border-[var(--line-strong)]" /> another variable
          </>
        )}
      </div>

      {/* index control */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        <div className="flex items-center gap-1 rounded-full border border-line bg-surface p-0.5">
          <button type="button" className="grid h-10 w-10 place-items-center rounded-full text-lg text-ink-2 hover:bg-surface-2 disabled:opacity-30" onClick={() => move(i - 1)} disabled={locked || i <= min} aria-label="Previous index">
            −
          </button>
          <span className="min-w-[3.5rem] text-center">
            <span className="block text-[0.65rem] leading-none text-ink-3">index i</span>
            <span className="font-mono text-base font-semibold tabular-nums">{i}</span>
          </span>
          <button type="button" className="grid h-10 w-10 place-items-center rounded-full text-lg text-ink-2 hover:bg-surface-2 disabled:opacity-30" onClick={() => move(i + 1)} disabled={locked || i >= max} aria-label="Next index">
            +
          </button>
        </div>
        {props.write !== undefined && (
          <>
            <button type="button" onClick={doWrite} className={`${CODE_SURFACE} min-h-10 px-3 font-mono text-[0.8rem] hover:border-[#c5ee8a]/60`}>
              <CodeBlock code={`${name}[${i}] = ${type === "char" ? `'${props.write}'` : props.write};`} language="cpp" />
            </button>
            <button type="button" className="btn btn-ghost btn-sm !h-10" onClick={resetAll} disabled={wrote === null && !corrupted && vals.every((v, k) => v === initial[k])}>
              Reset values
            </button>
          </>
        )}
      </div>

      {/* the formula */}
      <div className="mx-auto mt-4 w-full max-w-md rounded-xl border border-line bg-surface-2 p-3">
        <Label>
          {name}[{i}] is *({name} + {i})
        </Label>
        {hide ? (
          <p className="text-sm text-ink-3">Answer below first, then the address appears here.</p>
        ) : (
          <>
            <p className="font-mono text-sm tabular-nums text-ink">
              {hex(base)} + {i} × {size} = <span className="font-semibold text-brand">{hex(addr)}</span>
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Readout label={`&${name}[${i}]`} value={hex(addr)} strong={!oob} bad={oob} />
              <Readout label={`${name}[${i}]`} value={value === undefined ? "??" : show(type, value)} bad={oob} />
            </div>
          </>
        )}
        {oob && !hide && (
          <p className="mt-2 flex items-start gap-1.5 text-sm leading-snug text-bad">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Out of bounds: {name} only has indexes 0 to {n - 1}. C doesn&apos;t check, so this {inAfter ? `reaches into ${props.after!.name}` : "reaches memory that isn't part of the array"}.
              {wrote?.hit === "after" && ` The write just changed ${props.after!.name}.`}
              {wrote?.hit === "unknown" && " Writing there is undefined behaviour: it might corrupt something or crash."}
            </span>
          </p>
        )}
      </div>
    </div>
  );
}

export function checkArrayMem(state: unknown, goal: Record<string, unknown>) {
  const s = state as ArrayMemState | undefined;
  if (!s) return false;
  if (typeof goal.i === "number" && s.i !== goal.i) return false;
  if (typeof goal.addr === "number" && s.addr !== goal.addr) return false;
  if (goal.outOfBounds !== undefined && s.outOfBounds !== goal.outOfBounds) return false;
  if (goal.corrupted !== undefined && s.corrupted !== goal.corrupted) return false;
  return true;
}
