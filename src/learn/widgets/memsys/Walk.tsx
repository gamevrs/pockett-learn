"use client";

import React, { useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { walkGrid } from "./cachesim";
import { Btn, Caption, Note, Readout, Seg, Slider, Stepper } from "./ui";

// ───────────────────────────── memsys-walk: row-major vs column-major ─────────────────────────────

const ROWS = 8;
const COLS = 16;

export interface WalkProps {
  order?: "row" | "col";
  /** Cache capacity in lines (1 to 8). */
  lines?: number;
  prefetch?: boolean;
  /** Hide the controls the lesson does not want touched. */
  lock?: ("order" | "lines" | "prefetch")[];
}

export interface WalkState {
  order: "row" | "col";
  lines: number;
  prefetch: boolean;
  at: number;
  hits: number;
  misses: number;
  /** Misses for the whole walk (not just up to `at`). */
  totalMisses: number;
}

const CELL = 20;

export function Walk({ props, onChange, revealed }: WidgetProps<WalkProps>) {
  const [order, setOrder] = useState<"row" | "col">(props.order ?? "row");
  const [lines, setLines] = useState(props.lines ?? 4);
  const [prefetch, setPrefetch] = useState(Boolean(props.prefetch));
  const [at, setAt] = useState(0);
  const locked = Boolean(revealed);
  const lock = props.lock ?? [];
  const run = walkGrid(ROWS, COLS, order, lines, prefetch);
  const n = run.steps.length;
  const seen = run.steps.slice(0, at);
  const hits = seen.filter((s) => s.hit).length;
  const misses = at - hits;
  const cur = at > 0 ? run.steps[at - 1] : null;
  const resident = run.resident[at];

  const report = (o: "row" | "col", l: number, p: boolean, a: number) => {
    const r = walkGrid(ROWS, COLS, o, l, p);
    const h = r.steps.slice(0, a).filter((s) => s.hit).length;
    onChange?.({ order: o, lines: l, prefetch: p, at: a, hits: h, misses: a - h, totalMisses: r.misses } satisfies WalkState);
  };
  const upd = (o: "row" | "col", l: number, p: boolean, a: number) => {
    setOrder(o);
    setLines(l);
    setPrefetch(p);
    setAt(a);
    report(o, l, p, a);
  };

  const state = new Map<string, "hit" | "miss">();
  seen.forEach((s) => state.set(`${s.r},${s.c}`, s.hit ? "hit" : "miss"));

  return (
    <div className="w-full">
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Seg
          label="Order of the loops"
          value={order}
          onChange={(o) => upd(o, lines, prefetch, 0)}
          disabled={locked || lock.includes("order")}
          options={[
            { value: "row", label: "Row by row" },
            { value: "col", label: "Column by column" },
          ]}
        />
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
        {!lock.includes("lines") && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-ink-3">Cache holds</span>
            <Stepper label="Cache lines" value={lines} min={1} max={8} onChange={(l) => upd(order, l, prefetch, 0)} disabled={locked} format={(v) => `${v} line${v > 1 ? "s" : ""}`} wide />
          </div>
        )}
        {!lock.includes("prefetch") && (
          <Btn on={prefetch} onClick={() => upd(order, lines, !prefetch, 0)} disabled={locked} label="Prefetch next line">
            Prefetch next line: {prefetch ? "on" : "off"}
          </Btn>
        )}
      </div>

      <div className="mt-3 rounded-xl border border-line bg-surface-2 p-2">
        <svg viewBox={`0 0 ${COLS * CELL + 2} ${ROWS * CELL + 2}`} className="w-full" role="img" aria-label={`An ${ROWS} by ${COLS} array. ${at} of ${n} reads done: ${hits} hits, ${misses} misses.`}>
          {Array.from({ length: ROWS * COLS }, (_, i) => {
            const r = Math.floor(i / COLS);
            const c = i % COLS;
            const st = state.get(`${r},${c}`);
            const isCur = cur && cur.r === r && cur.c === c;
            return (
              <rect
                key={i}
                x={c * CELL + 1.5}
                y={r * CELL + 1.5}
                width={CELL - 3}
                height={CELL - 3}
                rx={3}
                fill={st === "miss" ? "var(--bad)" : st === "hit" ? "var(--brand)" : "var(--surface)"}
                fillOpacity={st === "miss" ? 0.7 : st === "hit" ? 0.5 : 1}
                stroke={isCur ? "var(--ink)" : "var(--line-strong)"}
                strokeWidth={isCur ? 2.4 : 0.8}
              />
            );
          })}
        </svg>
        <p className="mt-1 text-[11px] text-ink-3">
          {ROWS} × {COLS} ints, 4 bytes each. One row = 64 bytes = one cache line. <span className="text-bad">Red</span> = miss, <span className="text-brand">green</span> = hit.
        </p>
      </div>

      <div className="mt-2 rounded-xl border border-line bg-surface p-2">
        <Caption className="mb-1">Lines in the cache (oldest first)</Caption>
        <div className="flex min-h-8 flex-wrap gap-1.5">
          {resident.length === 0 ? (
            <span className="text-sm text-ink-3">empty</span>
          ) : (
            resident.map((l) => (
              <span key={l} className="rounded-md border border-[var(--brand)] bg-tint px-2 py-0.5 font-mono text-[0.8rem] font-semibold text-ink">
                row {l}
              </span>
            ))
          )}
        </div>
      </div>

      <Slider className="mt-2" label="Read number" value={at} min={0} max={n} step={1} onChange={(a) => upd(order, lines, prefetch, a)} disabled={locked} format={(v) => `${v} of ${n}`} />
      <div className="mt-1 flex flex-wrap justify-center gap-2">
        <Btn onClick={() => upd(order, lines, prefetch, Math.max(0, at - 1))} disabled={locked || at === 0}>
          Back
        </Btn>
        <Btn onClick={() => upd(order, lines, prefetch, Math.min(n, at + 1))} disabled={locked || at === n}>
          Next read
        </Btn>
        <Btn primary onClick={() => upd(order, lines, prefetch, n)} disabled={locked || at === n}>
          Run to the end
        </Btn>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        <Readout label="Hits" value={hits} />
        <Readout label="Misses" value={misses} accent={at === n && n > 0} />
        {at === n && <Readout label="Miss rate" value={`${Math.round((misses / n) * 100)}%`} />}
      </div>
      <div className="mt-3">
        <Note tone={cur ? "accent" : "plain"}>
          {!cur
            ? "Press Next read or drag the slider. Each read asks for one int; the cache keeps whole 64-byte lines."
            : cur.hit
              ? cur.prefetched
                ? `Read (${cur.r}, ${cur.c}): hit. The prefetcher had already fetched row ${cur.line}.`
                : `Read (${cur.r}, ${cur.c}): hit. Row ${cur.line} is already in the cache.`
              : `Read (${cur.r}, ${cur.c}): miss. Row ${cur.line} is not in the cache, so all 64 bytes of it come from RAM${prefetch ? " (and the prefetcher grabs the next row too)" : ""}.`}
        </Note>
      </div>
    </div>
  );
}

/** goal: { order, lines, prefetch, maxMisses (whole walk), minAt } */
export function checkWalk(state: unknown, goal: Record<string, unknown>) {
  const s = state as WalkState | undefined;
  if (!s) return false;
  if (typeof goal.order === "string" && s.order !== goal.order) return false;
  if (typeof goal.lines === "number" && s.lines !== goal.lines) return false;
  if (typeof goal.minLines === "number" && s.lines < goal.minLines) return false;
  if (typeof goal.prefetch === "boolean" && s.prefetch !== goal.prefetch) return false;
  if (typeof goal.maxMisses === "number" && s.totalMisses > goal.maxMisses) return false;
  if (typeof goal.minAt === "number" && s.at < goal.minAt) return false;
  return true;
}

// ───────────────────────────── memsys-layout: array of structs vs struct of arrays ─────────────────────────────

const FIELDS = ["x", "y", "z", "vx", "vy", "vz", "mass", "id"];
const N = 16;

export interface LayoutProps {
  layout?: "aos" | "soa";
  fields?: string[];
  /** Lock the layout switch. */
  lockLayout?: boolean;
}

export interface LayoutState {
  layout: "aos" | "soa";
  fields: string[];
  lines: number;
  aosLines: number;
  soaLines: number;
}

function touched(layout: "aos" | "soa", fields: string[]): { cells: Set<number>; lines: Set<number> } {
  const cells = new Set<number>();
  const lines = new Set<number>();
  for (const f of fields) {
    const fi = FIELDS.indexOf(f);
    for (let i = 0; i < N; i++) {
      const slot = layout === "aos" ? i * FIELDS.length + fi : fi * N + i; // 4-byte slots
      cells.add(slot);
      lines.add(Math.floor(slot / 16));
    }
  }
  return { cells, lines };
}

export function Layout({ props, onChange, revealed }: WidgetProps<LayoutProps>) {
  const [layout, setLayout] = useState<"aos" | "soa">(props.layout ?? "aos");
  const [fields, setFields] = useState<string[]>(props.fields ?? ["x"]);
  const locked = Boolean(revealed);
  const t = touched(layout, fields);
  const aos = touched("aos", fields).lines.size;
  const soa = touched("soa", fields).lines.size;
  const useful = fields.length * N * 4;
  const fetched = t.lines.size * 64;

  const report = (l: "aos" | "soa", f: string[]) =>
    onChange?.({ layout: l, fields: f, lines: touched(l, f).lines.size, aosLines: touched("aos", f).lines.size, soaLines: touched("soa", f).lines.size } satisfies LayoutState);
  const pickLayout = (l: "aos" | "soa") => {
    setLayout(l);
    report(l, fields);
  };
  const toggle = (f: string) => {
    const next = fields.includes(f) ? fields.filter((x) => x !== f) : [...fields, f];
    if (next.length === 0) return;
    setFields(next);
    report(layout, next);
  };

  return (
    <div className="w-full">
      <div className="flex justify-center">
        <Seg
          label="Memory layout"
          value={layout}
          onChange={pickLayout}
          disabled={locked || props.lockLayout}
          options={[
            { value: "aos", label: "Array of structs" },
            { value: "soa", label: "Struct of arrays" },
          ]}
        />
      </div>
      <p className="mt-2 text-center text-xs text-ink-3">
        {N} particles, each with {FIELDS.length} fields of 4 bytes (32 bytes). Tap the fields your loop <b>reads</b>:
      </p>
      <div className="mt-1.5 flex flex-wrap justify-center gap-1.5">
        {FIELDS.map((f) => (
          <Btn key={f} on={fields.includes(f)} onClick={() => toggle(f)} disabled={locked} label={`Read field ${f}`} className="!min-w-10 !px-3 font-mono">
            {f}
          </Btn>
        ))}
      </div>

      <div className="mt-3 rounded-xl border border-line bg-surface-2 p-2">
        <svg viewBox="0 0 322 176" className="w-full" role="img" aria-label={`Memory drawn as 8 cache lines of 16 slots. Your loop touches ${t.lines.size} of the 8 lines.`}>
          {Array.from({ length: 8 }, (_, line) => (
            <g key={line}>
              <rect x={0.5} y={line * 22 + 0.5} width={321} height={21} rx={4} fill="none" stroke={t.lines.has(line) ? "var(--ink)" : "var(--line-strong)"} strokeWidth={t.lines.has(line) ? 1.6 : 0.8} />
              {Array.from({ length: 16 }, (_, k) => {
                const slot = line * 16 + k;
                const on = t.cells.has(slot);
                return <rect key={k} x={3 + k * 19.8} y={line * 22 + 3.5} width={17.6} height={15} rx={2.5} fill={on ? "var(--brand)" : "var(--surface)"} fillOpacity={on ? 0.75 : 1} stroke="var(--line-strong)" strokeWidth={0.6} />;
              })}
            </g>
          ))}
        </svg>
        <p className="mt-1 text-[11px] text-ink-3">Each row is one 64-byte line (16 slots of 4 bytes). Green slots are values your loop reads. Outlined lines must be fetched.</p>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        <Readout label="Lines fetched" value={t.lines.size} accent />
        <Readout label="Bytes used" value={`${Math.round((useful / fetched) * 100)}% of ${fetched}`} />
      </div>
      <div className="mt-3">
        <Note>
          Reading {fields.join(", ")} for all {N} particles: <b>{aos}</b> line{aos === 1 ? "" : "s"} as an array of structs, <b>{soa}</b> as a struct of arrays.{" "}
          {aos === soa ? "Same cost: you read every field of every particle either way." : `Struct of arrays moves ${(aos / soa).toFixed(aos / soa % 1 ? 1 : 0)}× less data.`}
        </Note>
      </div>
    </div>
  );
}

/** goal: { layout, maxLines, fieldsCount } */
export function checkLayout(state: unknown, goal: Record<string, unknown>) {
  const s = state as LayoutState | undefined;
  if (!s) return false;
  if (typeof goal.layout === "string" && s.layout !== goal.layout) return false;
  if (typeof goal.maxLines === "number" && s.lines > goal.maxLines) return false;
  if (typeof goal.minFields === "number" && s.fields.length < goal.minFields) return false;
  return true;
}
