"use client";

import React, { useState } from "react";
import { Plus, RotateCcw, Undo2 } from "lucide-react";
import type { WidgetProps } from "@/learn/widget";
import { byteHex, charOf, doubleBytes, hex, leBytes, Pill, Readout, SIZE, TYPE_LABEL, type CType } from "./shared";

/** A variable laid over the bytes. */
export interface MemVar {
  name: string;
  /** char / int / double / ptr, or an array of char or int. */
  type: CType | "char[]" | "int[]";
  addr: number;
  /** char: a number or one-character string; int/double: a number; char[]: a string; int[]: numbers; ptr: an address. */
  value?: number | string | number[];
  /** ptr only: the name of the variable it points at (its address becomes the value). */
  target?: string;
  /** char[] only: total bytes (the rest after the text is zero). Defaults to the text plus its '\0'. */
  size?: number;
  /** char[] only: leave out the '\0' terminator (the missing-terminator bug). */
  noTerminator?: boolean;
  /** Value not set yet: draw the bytes as "??". */
  uninit?: boolean;
}

export interface MemoryMapProps {
  /** Address of the first byte shown. */
  start: number;
  /** Number of bytes shown. */
  length: number;
  /** Bytes per row (default 8). */
  cols?: number;
  vars?: MemVar[];
  /**
   * explore: tap to inspect · pick-var: tap any byte of the variable you mean · pick-byte: tap one exact byte ·
   * declare: add char/int/double/pointer variables and watch them take up space.
   */
  mode?: "explore" | "pick-var" | "pick-byte" | "declare";
  /** Show each byte as a character too (for strings). */
  showChars?: boolean;
  /** Hide the decoded value in the info card (for "what value is stored here?" questions). */
  hideValues?: boolean;
  /** Hide addresses in the info card (for "what is &x?" questions). */
  hideAddrs?: boolean;
  /** Variable selected at the start. */
  selected?: string;
  /** declare mode: the types offered (default char, int, double, ptr). */
  declareTypes?: CType[];
  /** Bytes for memory no variable owns (repeats). Default: drawn as empty. */
  garbage?: number[];
  label?: string;
}

export interface MemoryMapState {
  /** Address picked (pick-byte: the byte; pick-var/explore: the start of the variable). */
  addr: number | null;
  /** Variable picked. */
  var: string | null;
  /** declare mode: bytes used and the types declared, in order. */
  used: number;
  types: CType[];
}

interface Owned {
  v: MemVar;
  size: number;
  bytes: (number | null)[];
}

function layout(vars: MemVar[]): Owned[] {
  const byName = new Map(vars.map((v) => [v.name, v]));
  return vars.map((v) => {
    let bytes: number[] = [];
    if (v.type === "char") {
      const c = typeof v.value === "string" ? v.value.charCodeAt(0) || 0 : Number(v.value ?? 0);
      bytes = [c & 0xff];
    } else if (v.type === "int") bytes = leBytes(Number(v.value ?? 0), 4);
    else if (v.type === "double") bytes = doubleBytes(Number(v.value ?? 0));
    else if (v.type === "ptr") bytes = leBytes(v.target ? (byName.get(v.target)?.addr ?? 0) : Number(v.value ?? 0), 8);
    else if (v.type === "char[]") {
      const text = String(v.value ?? "");
      bytes = [...text].map((c) => c.charCodeAt(0) & 0xff);
      if (!v.noTerminator) bytes.push(0);
      while (v.size && bytes.length < v.size) bytes.push(0);
      if (v.size) bytes = bytes.slice(0, v.size);
    } else {
      bytes = (Array.isArray(v.value) ? v.value : []).flatMap((n) => leBytes(n, 4));
    }
    return { v, size: bytes.length, bytes: v.uninit ? bytes.map(() => null) : bytes };
  });
}

function describe(o: Owned, all: Owned[]): string {
  const { v } = o;
  if (v.uninit) return `${TYPE_LABEL[v.type as CType] ?? v.type} ${v.name}; (no value yet)`;
  if (v.type === "char") {
    const c = typeof v.value === "string" ? v.value : String.fromCharCode(Number(v.value ?? 0));
    return `char ${v.name} = '${c}';`;
  }
  if (v.type === "int") return `int ${v.name} = ${v.value ?? 0};`;
  if (v.type === "double") return `double ${v.name} = ${v.value ?? 0};`;
  if (v.type === "ptr") {
    const t = v.target ? all.find((x) => x.v.name === v.target) : undefined;
    return t ? `${t.v.type === "char" ? "char" : t.v.type === "double" ? "double" : "int"} *${v.name} = &${v.target};` : `int *${v.name} = ${hex(Number(v.value ?? 0))};`;
  }
  if (v.type === "char[]") return `char ${v.name}[${o.size}] = "${String(v.value ?? "")}";`;
  const nums = Array.isArray(v.value) ? v.value : [];
  return `int ${v.name}[${nums.length}] = {${nums.join(", ")}};`;
}

const NAMES = "abcdefghijklmnop".split("");

/** Bytes at addresses with typed variables laid over them. */
export function MemoryMap({ props, onChange, revealed, status, goal }: WidgetProps<MemoryMapProps>) {
  const mode = props.mode ?? "explore";
  const cols = props.cols ?? 8;
  const [declared, setDeclared] = useState<CType[]>([]);
  const baseVars = props.vars ?? [];
  const declaredVars: MemVar[] = [];
  {
    let at = props.start;
    declared.forEach((t, i) => {
      declaredVars.push({ name: NAMES[i] ?? `v${i}`, type: t, addr: at, uninit: true });
      at += SIZE[t];
    });
  }
  const owned = layout(mode === "declare" ? declaredVars : baseVars);
  const used = declared.reduce((n, t) => n + SIZE[t], 0);
  const initial = owned.find((o) => o.v.name === props.selected);
  const [sel, setSel] = useState<{ addr: number | null; var: string | null }>({ addr: initial?.v.addr ?? null, var: initial?.v.name ?? null });
  const locked = Boolean(revealed) && mode !== "declare" && mode !== "explore";

  const ownerAt = (addr: number) => owned.find((o) => addr >= o.v.addr && addr < o.v.addr + o.size);
  const byteAt = (addr: number): { b: number | null; o?: Owned } => {
    const o = ownerAt(addr);
    if (o) return { b: o.bytes[addr - o.v.addr], o };
    const g = props.garbage;
    return { b: g && g.length ? g[(addr - props.start) % g.length] : null };
  };

  const report = (next: { addr: number | null; var: string | null }, types = declared) =>
    onChange?.({ ...next, used: types.reduce((n, t) => n + SIZE[t], 0), types } satisfies MemoryMapState);

  const tap = (addr: number) => {
    if (locked || mode === "declare") return;
    const o = ownerAt(addr);
    const next = mode === "pick-byte" ? { addr, var: o?.v.name ?? null } : { addr: o ? o.v.addr : addr, var: o?.v.name ?? null };
    setSel(next);
    report(next);
  };
  const declare = (t: CType) => {
    if (used + SIZE[t] > props.length || declared.length >= NAMES.length) return;
    const types = [...declared, t];
    setDeclared(types);
    report({ addr: null, var: null }, types);
  };
  const undo = () => {
    const types = declared.slice(0, -1);
    setDeclared(types);
    report({ addr: null, var: null }, types);
  };

  // what to outline: the selection, or the goal once revealed
  const showGoal = status === "revealed" && goal;
  const focusVar = showGoal && typeof goal.var === "string" ? goal.var : showGoal && typeof goal.addr === "number" ? ownerAt(goal.addr)?.v.name ?? null : sel.var;
  const focusByte = showGoal && typeof goal.addr === "number" && mode === "pick-byte" ? goal.addr : mode === "pick-byte" ? sel.addr : null;
  const wrongPick = status === "wrong";

  const rows = Math.ceil(props.length / cols);
  const focus = owned.find((o) => o.v.name === focusVar);

  return (
    <div className="w-full min-w-0">
      {props.label && <p className="mb-3 text-center text-xs font-medium text-ink-3">{props.label}</p>}

      <div className="mx-auto w-full max-w-[34rem]">
        <div className="mb-1.5 flex items-center justify-between px-0.5 text-[0.65rem] font-medium uppercase tracking-[0.08em] text-ink-3">
          <span>Address</span>
          <span>One box = one byte</span>
        </div>
        <div className="grid gap-y-1.5">
          {Array.from({ length: rows }, (_, r) => {
            const rowStart = props.start + r * cols;
            const addrs = Array.from({ length: Math.min(cols, props.length - r * cols) }, (_, c) => rowStart + c);
            // name strip: runs of the same owner within this row
            const runs: { from: number; span: number; o?: Owned; cont: boolean }[] = [];
            for (const a of addrs) {
              const o = ownerAt(a);
              const last = runs[runs.length - 1];
              if (last && last.o === o) last.span++;
              else runs.push({ from: a, span: 1, o, cont: Boolean(o && a !== o.v.addr) });
            }
            return (
              <div key={r} className="grid items-end gap-x-1" style={{ gridTemplateColumns: `3.1rem repeat(${cols}, minmax(0, 1fr))` }}>
                <span className="row-start-2 self-center font-mono text-[0.65rem] tabular-nums text-ink-3 sm:text-[0.7rem]">{hex(rowStart)}</span>
                {runs.map((run) => (
                  <span
                    key={`n${run.from}`}
                    className={`row-start-1 mb-0.5 truncate rounded-t-md px-1 font-mono text-[0.62rem] font-semibold leading-[1.15rem] sm:text-[0.7rem] ${
                      !run.o ? "" : run.o.v.name === focusVar ? "bg-primary text-primary-ink" : "bg-surface-2 text-ink-2"
                    }`}
                    style={{ gridColumn: `${run.from - rowStart + 2} / span ${run.span}` }}
                    title={run.o ? run.o.v.name : undefined}
                  >
                    {run.o ? (run.cont ? `…${run.o.v.name}` : run.o.v.name) : " "}
                  </span>
                ))}
                {addrs.map((a, c) => {
                  const { b, o } = byteAt(a);
                  const inFocus = Boolean(o && o.v.name === focusVar);
                  const exact = focusByte === a;
                  const first = o && a === o.v.addr;
                  const lastByte = o && a === o.v.addr + o.size - 1;
                  return (
                    <button
                      key={a}
                      type="button"
                      onClick={() => tap(a)}
                      disabled={locked || mode === "declare"}
                      aria-label={`${hex(a)}: ${b === null ? "unknown" : byteHex(b)}${o ? `, part of ${o.v.name}` : ""}`}
                      aria-pressed={exact || undefined}
                      className={`row-start-2 flex h-10 min-w-0 flex-col items-center justify-center border font-mono text-[0.7rem] tabular-nums transition-colors sm:h-11 sm:text-[0.8rem] ${
                        first || !o || c === 0 ? "rounded-l-md" : ""
                      } ${lastByte || !o || c === addrs.length - 1 ? "rounded-r-md" : ""} ${
                        exact
                          ? wrongPick
                            ? "border-[var(--bad)] bg-surface text-ink ring-1 ring-[var(--bad)]"
                            : "border-[var(--brand)] bg-primary text-primary-ink"
                          : inFocus
                            ? "border-[var(--brand)] bg-tint text-ink"
                            : o
                              ? "border-[var(--line-strong)] bg-surface-2 text-ink"
                              : "border-dashed border-line bg-transparent text-ink-3"
                      } ${locked || mode === "declare" ? "cursor-default" : "hover:border-[var(--brand)]"}`}
                      style={{ gridColumn: c + 2 }}
                    >
                      <span className={b === null ? "opacity-50" : ""}>{b === null ? (o ? "??" : "··") : byteHex(b)}</span>
                      {props.showChars && b !== null && <span className={`text-[0.6rem] leading-none ${exact && !wrongPick ? "" : "text-ink-3"}`}>{charOf(b)}</span>}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {mode === "declare" ? (
        <div className="mt-4 grid gap-3">
          <div className="flex flex-wrap justify-center gap-2">
            {(props.declareTypes ?? (["char", "int", "double", "ptr"] as CType[])).map((t) => (
              <Pill key={t} onClick={() => declare(t)} disabled={used + SIZE[t] > props.length} mono>
                <Plus className="h-3.5 w-3.5" /> {t === "ptr" ? "int *" : t} <span className="text-ink-3">({SIZE[t]})</span>
              </Pill>
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Readout label="used" value={`${used} of ${props.length} bytes`} strong={used === props.length} />
            <button type="button" className="btn btn-ghost !h-10 !w-10 !p-0" onClick={undo} disabled={declared.length === 0} aria-label="Remove the last variable" title="Undo">
              <Undo2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="btn btn-ghost !h-10 !w-10 !p-0"
              onClick={() => {
                setDeclared([]);
                report({ addr: null, var: null }, []);
              }}
              disabled={declared.length === 0}
              aria-label="Start over"
              title="Start over"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>
          {declared.length > 0 && (
            <p className="text-center font-mono text-xs text-ink-2">
              {declaredVars.map((v) => `${v.type === "ptr" ? "int *" : `${v.type} `}${v.name};`).join("  ")}
            </p>
          )}
        </div>
      ) : (
        <div className="mx-auto mt-4 min-h-[4.5rem] w-full max-w-[34rem] rounded-xl border border-line bg-surface-2 p-3">
          {focus ? (
            <>
              <p className="font-mono text-sm font-semibold text-ink">{props.hideValues ? `${focus.v.type.replace("ptr", "pointer")} ${focus.v.name}` : describe(focus, owned)}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Readout label="size" value={`${focus.size} byte${focus.size === 1 ? "" : "s"}`} />
                {!props.hideAddrs && <Readout label={`&${focus.v.name}`} value={hex(focus.v.addr)} strong />}
                {!props.hideAddrs && focus.size > 1 && <Readout label="ends at" value={hex(focus.v.addr + focus.size - 1)} />}
                {mode === "pick-byte" && sel.addr !== null && !props.hideAddrs && <Readout label="byte" value={hex(sel.addr)} />}
              </div>
            </>
          ) : sel.addr !== null && mode !== "explore" ? (
            <p className="text-sm text-ink-2">
              <span className="font-mono font-semibold">{hex(sel.addr)}</span> isn&apos;t part of any variable.
            </p>
          ) : (
            <p className="text-sm text-ink-3">{mode === "pick-byte" ? "Tap a byte to pick it." : mode === "pick-var" ? "Tap any byte of the variable you mean." : "Tap a byte to see which variable it belongs to."}</p>
          )}
        </div>
      )}
    </div>
  );
}

export function checkMemoryMap(state: unknown, goal: Record<string, unknown>) {
  const s = state as MemoryMapState | undefined;
  if (!s) return false;
  if (typeof goal.used === "number" && s.used !== goal.used) return false;
  if (typeof goal.count === "number" && s.types.length !== goal.count) return false;
  if (Array.isArray(goal.includes) && !(goal.includes as string[]).every((t) => s.types.includes(t as CType))) return false;
  if (typeof goal.addr === "number" && s.addr !== goal.addr) return false;
  if (typeof goal.var === "string" && s.var !== goal.var) return false;
  return true;
}
