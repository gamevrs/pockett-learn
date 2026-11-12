"use client";

import React, { useState } from "react";
import { ArrowDown, ArrowUp, RotateCcw, X } from "lucide-react";
import type { WidgetProps } from "@/learn/widget";
import { FIELD_TYPES, allocFirstFit, heapStats, layoutStruct, type Block } from "./vmsim";
import { Btn, Caption, Note, Readout } from "./ui";

// ───────────────────────────── memsys-struct: field order, alignment, padding ─────────────────────────────

export interface StructProps {
  /** Starting field types, in order (keys of char / short / int / float / double / ptr). */
  fields?: string[];
  /** Hide the add/remove controls; the learner can only reorder. */
  fixed?: boolean;
}

export interface StructState {
  fields: string[];
  size: number;
  padBytes: number;
  align: number;
}

const NAMES = "abcdefghijkl";

export function Struct({ props, onChange, revealed }: WidgetProps<StructProps>) {
  const start = props.fields ?? ["char", "double", "char", "int"];
  const [fields, setFields] = useState<string[]>(start);
  const locked = Boolean(revealed);
  const lay = layoutStruct(fields);

  const upd = (f: string[]) => {
    setFields(f);
    const l = layoutStruct(f);
    onChange?.({ fields: f, size: l.size, padBytes: l.padBytes, align: l.align } satisfies StructState);
  };
  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= fields.length) return;
    const f = fields.slice();
    [f[i], f[j]] = [f[j], f[i]];
    upd(f);
  };
  const sortBig = () => upd(fields.slice().sort((a, b) => FIELD_TYPES[b].align - FIELD_TYPES[a].align));

  // byte cells
  const cells: { kind: "pad" | "field"; field: number }[] = Array.from({ length: lay.size }, () => ({ kind: "pad", field: -1 }));
  lay.placed.forEach((p) => {
    for (let k = 0; k < p.size; k++) cells[p.offset + k] = { kind: "field", field: p.index };
  });
  const rows = Math.ceil(lay.size / 8);
  const code = `struct S {\n${fields.map((t, i) => `  ${t === "ptr" ? "void *" : t + " "}${NAMES[i]};`).join("\n")}\n};`;

  return (
    <div className="w-full">
      <div className="grid gap-3 sm:grid-cols-[1fr_1.3fr]">
        <div>
          <Caption className="mb-1.5">Fields, in order</Caption>
          <ul className="space-y-1.5">
            {fields.map((t, i) => (
              <li key={i} className="flex items-center gap-1.5 rounded-lg border border-line bg-surface-2 py-0.5 pl-2.5 pr-1">
                <span className="min-w-0 flex-1 truncate font-mono text-[0.85rem] text-ink">
                  {t === "ptr" ? "void *" : t} <b>{NAMES[i]}</b>
                  <span className="ml-1 text-[10.5px] text-ink-3">
                    {FIELD_TYPES[t].size}B
                  </span>
                </span>
                <button type="button" disabled={locked || i === 0} onClick={() => move(i, -1)} aria-label={`Move field ${NAMES[i]} up`} className="grid h-10 w-10 place-items-center rounded-full text-ink-2 enabled:hover:bg-surface disabled:opacity-30">
                  <ArrowUp className="h-4 w-4" />
                </button>
                <button type="button" disabled={locked || i === fields.length - 1} onClick={() => move(i, 1)} aria-label={`Move field ${NAMES[i]} down`} className="grid h-10 w-10 place-items-center rounded-full text-ink-2 enabled:hover:bg-surface disabled:opacity-30">
                  <ArrowDown className="h-4 w-4" />
                </button>
                {!props.fixed && (
                  <button type="button" disabled={locked || fields.length <= 1} onClick={() => upd(fields.filter((_, k) => k !== i))} aria-label={`Remove field ${NAMES[i]}`} className="grid h-10 w-10 place-items-center rounded-full text-ink-2 enabled:hover:bg-surface disabled:opacity-30">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
          {!props.fixed && fields.length < 8 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {Object.keys(FIELD_TYPES).map((t) => (
                <Btn key={t} onClick={() => upd([...fields, t])} disabled={locked} label={`Add a ${t} field`} className="!px-3 font-mono !text-xs">
                  + {t === "ptr" ? "pointer" : t}
                </Btn>
              ))}
            </div>
          )}
        </div>

        <div>
          <Caption className="mb-1.5">Bytes in memory (8 per row)</Caption>
          <div className="rounded-xl border border-line bg-surface p-2" role="img" aria-label={`Layout: ${lay.size} bytes in total, ${lay.padBytes} of them padding.`}>
            {Array.from({ length: rows }, (_, r) => (
              <div key={r} className="mb-1 flex items-center gap-1 last:mb-0">
                <span className="w-6 shrink-0 text-right font-mono text-[10px] text-ink-3">+{r * 8}</span>
                <div className="grid min-w-0 flex-1 grid-cols-8 gap-[3px]">
                  {Array.from({ length: 8 }, (_, k) => {
                    const c = cells[r * 8 + k];
                    if (!c) return <span key={k} className="h-8 rounded-[5px] border border-dashed border-transparent" />;
                    const first = c.kind === "field" && lay.placed[c.field].offset === r * 8 + k;
                    return (
                      <span
                        key={k}
                        className={`grid h-8 place-items-center rounded-[5px] border font-mono text-[11px] font-semibold ${
                          c.kind === "pad"
                            ? "border-dashed border-[var(--bad)]/70 bg-surface text-bad"
                            : c.field % 2 === 0
                              ? "border-transparent bg-primary text-primary-ink"
                              : "border-[var(--brand)] bg-tint text-ink"
                        }`}
                      >
                        {c.kind === "pad" ? "pad" : first ? NAMES[c.field] : ""}
                      </span>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-1 text-[11px] text-ink-3">Dashed red = padding the compiler inserts.</p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        <Readout label="sizeof" value={`${lay.size} bytes`} accent />
        <Readout label="Padding" value={`${lay.padBytes} bytes`} />
        <Readout label="Alignment" value={lay.align} />
      </div>
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        <Btn onClick={sortBig} disabled={locked}>
          Biggest alignment first
        </Btn>
        <Btn onClick={() => upd(start)} disabled={locked}>
          <RotateCcw className="h-4 w-4" /> Reset
        </Btn>
      </div>
      <pre className="mt-3 overflow-x-auto rounded-xl border border-white/10 bg-[#0a0a0a] px-3 py-2 font-mono text-[0.8rem] leading-relaxed text-[#e5e5e5]">{code}</pre>
      <div className="mt-3">
        <Note>
          Each field must start at an address that is a multiple of its own size, and the whole struct is rounded up to a multiple of its largest field, so arrays of it stay aligned.
        </Note>
      </div>
    </div>
  );
}

/** goal: { maxSize, maxPad, size } */
export function checkStruct(state: unknown, goal: Record<string, unknown>) {
  const s = state as StructState | undefined;
  if (!s) return false;
  if (typeof goal.maxSize === "number" && s.size > goal.maxSize) return false;
  if (typeof goal.maxPad === "number" && s.padBytes > goal.maxPad) return false;
  if (typeof goal.size === "number" && s.size !== goal.size) return false;
  return true;
}

// ───────────────────────────── memsys-frag: a heap that fragments ─────────────────────────────

const CELLS = 24;

export interface FragProps {
  /** Starting blocks as [start, size] pairs. */
  blocks?: [number, number][];
  /** Allocation sizes offered. */
  sizes?: number[];
}

export interface FragState {
  free: number;
  largest: number;
  fails: number;
  allocs: number;
  frees: number;
  /** An allocation failed even though enough cells were free in total. */
  failedWithRoom: boolean;
}

export function Frag({ props, onChange, revealed }: WidgetProps<FragProps>) {
  const initial = (): Block[] => (props.blocks ?? []).map(([start, size], i) => ({ id: i + 1, start, size }));
  const [blocks, setBlocks] = useState<Block[]>(initial);
  const [nextId, setNextId] = useState((props.blocks?.length ?? 0) + 1);
  const [counts, setCounts] = useState({ allocs: 0, frees: 0, fails: 0, failedWithRoom: false });
  const [msg, setMsg] = useState("Tap a size to allocate a block (first-fit: the first gap that is big enough). Tap a block to free it.");
  const locked = Boolean(revealed);
  const sizes = props.sizes ?? [1, 2, 3, 4, 6, 8];
  const st = heapStats(blocks, CELLS);

  const emit = (b: Block[], c: typeof counts) => {
    const s = heapStats(b, CELLS);
    onChange?.({ free: s.free, largest: s.largest, ...c } satisfies FragState);
  };
  const alloc = (size: number) => {
    if (locked) return;
    const at = allocFirstFit(blocks, CELLS, size);
    if (at < 0) {
      const c = { ...counts, fails: counts.fails + 1, failedWithRoom: counts.failedWithRoom || st.free >= size };
      setCounts(c);
      setMsg(st.free >= size ? `Out of memory for ${size} cells, yet ${st.free} cells are free. They are in pieces: the largest hole is ${st.largest}.` : `Out of memory: only ${st.free} cells are free.`);
      emit(blocks, c);
      return;
    }
    const b = [...blocks, { id: nextId, start: at, size }];
    setBlocks(b);
    setNextId(nextId + 1);
    const c = { ...counts, allocs: counts.allocs + 1 };
    setCounts(c);
    setMsg(`Allocated ${size} cells at ${at}.`);
    emit(b, c);
  };
  const free = (id: number) => {
    if (locked) return;
    const b = blocks.filter((x) => x.id !== id);
    setBlocks(b);
    const c = { ...counts, frees: counts.frees + 1 };
    setCounts(c);
    setMsg("Freed. The cells are free again, but the neighbours stay where they are.");
    emit(b, c);
  };
  const reset = () => {
    const b = initial();
    setBlocks(b);
    setNextId(b.length + 1);
    const c = { allocs: 0, frees: 0, fails: 0, failedWithRoom: false };
    setCounts(c);
    setMsg("Reset.");
    emit(b, c);
  };

  const owner: (Block | null)[] = Array.from({ length: CELLS }, () => null);
  blocks.forEach((b) => {
    for (let k = 0; k < b.size; k++) owner[b.start + k] = b;
  });
  const frag = st.free === 0 ? 0 : 1 - st.largest / st.free;

  return (
    <div className="w-full">
      <Caption className="mb-1.5">Heap · {CELLS} cells · tap a block to free it</Caption>
      <div className="grid gap-[3px] rounded-xl border border-line bg-surface-2 p-2" style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}>
        {owner.map((b, i) => {
          const first = b && b.start === i;
          return b ? (
            <button
              key={i}
              type="button"
              disabled={locked}
              onClick={() => free(b.id)}
              aria-label={`Block of ${b.size} cells starting at ${b.start}${first ? "" : " (continued)"}. Tap to free.`}
              className={`grid h-10 place-items-center rounded-[5px] border font-mono text-[11px] font-semibold ${b.id % 2 === 0 ? "border-transparent bg-primary text-primary-ink" : "border-[var(--brand)] bg-tint text-ink"}`}
            >
              {first ? b.size : ""}
            </button>
          ) : (
            <span key={i} className="h-10 rounded-[5px] border border-dashed border-[var(--line-strong)]" aria-label="free cell" />
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5">
        {sizes.map((s) => (
          <Btn key={s} onClick={() => alloc(s)} disabled={locked} label={`Allocate ${s} cells`} className="!px-3.5">
            alloc {s}
          </Btn>
        ))}
        <Btn onClick={reset} disabled={locked}>
          <RotateCcw className="h-4 w-4" /> Reset
        </Btn>
      </div>
      <div className="mt-3">
        <Note tone={counts.failedWithRoom ? "accent" : "plain"}>{msg}</Note>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        <Readout label="Free in total" value={st.free} />
        <Readout label="Largest hole" value={st.largest} accent />
        <Readout label="Scattered" value={`${Math.round(frag * 100)}%`} />
      </div>
    </div>
  );
}

/** goal: { failedWithRoom: true } | { minLargest } | { maxAllocs } */
export function checkFrag(state: unknown, goal: Record<string, unknown>) {
  const s = state as FragState | undefined;
  if (!s) return false;
  if (goal.failedWithRoom === true && !s.failedWithRoom) return false;
  if (typeof goal.minLargest === "number" && s.largest < goal.minLargest) return false;
  if (typeof goal.minFree === "number" && s.free < goal.minFree) return false;
  if (typeof goal.minFrees === "number" && s.frees < goal.minFrees) return false;
  return true;
}
