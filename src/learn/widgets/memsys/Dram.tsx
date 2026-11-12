"use client";

import React, { useState } from "react";
import { Power, RotateCcw } from "lucide-react";
import type { WidgetProps } from "@/learn/widget";
import { Btn, Caption, Note, Readout, Seg } from "./ui";
import { TAU, advance, charge, freshCells, lostCount, refreshNow, runRows, ROWS, COLS, T_ROW_CONFLICT, T_ROW_EMPTY, T_ROW_HIT, type CellState } from "./dramsim";

// ───────────────────────────── memsys-cell: SRAM vs DRAM ─────────────────────────────

export interface CellProps {
  /** Initial refresh setting in ms (0 = never). */
  refreshMs?: number;
  /** Hide the refresh control (it stays at `refreshMs`). */
  lockRefresh?: boolean;
}

export interface CellWidgetState {
  elapsed: number;
  lost: number;
  refreshMs: number;
  powered: boolean;
  /** DRAM bits as they would read right now. */
  reads: number[];
}

export function Cell({ props, onChange, revealed }: WidgetProps<CellProps>) {
  const [cells, setCells] = useState<CellState>(() => freshCells());
  const [refreshMs, setRefreshMs] = useState(props.refreshMs ?? 0);
  const [msg, setMsg] = useState("Each cell holds one bit. The top row is SRAM, the bottom row is DRAM. Let some time pass.");
  const locked = Boolean(revealed);

  const report = (c: CellState, r: number) =>
    onChange?.({ elapsed: c.elapsed, lost: lostCount(c), refreshMs: r, powered: c.powered, reads: c.bits.map((b, i) => (c.powered && !c.lost[i] ? b : 0)) } satisfies CellWidgetState);

  const wait = (dt: number) => {
    if (locked || !cells.powered) return;
    const next = advance(cells, dt, refreshMs);
    const newlyLost = next.lost.map((l, i) => l && !cells.lost[i]);
    const gone = newlyLost.map((l, i) => (l ? i + 1 : 0)).filter(Boolean);
    setCells(next);
    setMsg(
      gone.length
        ? `${dt} ms later: DRAM cell${gone.length > 1 ? "s" : ""} ${gone.join(", ")} leaked below the halfway mark. Those 1s now read as 0, for good.`
        : `${dt} ms later. ${refreshMs ? `The controller refreshes every ${refreshMs} ms, so every 1 is still a 1.` : "Charge is leaking, but every 1 still reads as 1."}`,
    );
    report(next, refreshMs);
  };
  const pickRefresh = (r: number) => {
    setRefreshMs(r);
    report(cells, r);
  };
  const refresh = () => {
    if (locked || !cells.powered) return;
    const next = refreshNow(cells);
    setCells(next);
    setMsg("Refresh: every cell still above the halfway mark was read and topped up to full charge.");
    report(next, refreshMs);
  };
  const flip = (i: number) => {
    if (locked || !cells.powered) return;
    const bits = cells.bits.slice();
    bits[i] = bits[i] ? 0 : 1;
    const lost = cells.lost.slice();
    lost[i] = false;
    const since = cells.since.slice();
    since[i] = 0;
    const next = { ...cells, bits, lost, since };
    setCells(next);
    setMsg(`Wrote ${bits[i]} into bit ${i + 1} of both rows. Written cells start at full charge.`);
    report(next, refreshMs);
  };
  const power = () => {
    if (locked) return;
    const next = { ...cells, powered: false };
    setCells(next);
    setMsg("Power off. SRAM latches and DRAM capacitors both forget: RAM is volatile.");
    report(next, refreshMs);
  };
  const reset = () => {
    const next = freshCells();
    setCells(next);
    setMsg("Fresh start: the same eight bits written into both rows.");
    report(next, refreshMs);
  };

  const readBit = (i: number, dram: boolean) => (!cells.powered ? "–" : dram && cells.lost[i] ? "0" : String(cells.bits[i]));

  return (
    <div className="w-full">
      <div className="space-y-3">
        <div>
          <Caption className="mb-1.5">SRAM · flip-flop per bit · holds while powered</Caption>
          <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-8">
            {cells.bits.map((b, i) => (
              <button
                key={i}
                type="button"
                onClick={() => flip(i)}
                disabled={locked || !cells.powered}
                aria-label={`SRAM bit ${i + 1} is ${readBit(i, false)}. Tap to write the other value.`}
                className="grid min-h-12 place-items-center rounded-lg border border-line bg-surface-2 font-mono text-lg font-semibold text-ink transition-colors enabled:hover:border-[var(--line-strong)] disabled:cursor-default"
              >
                {readBit(i, false)}
              </button>
            ))}
          </div>
        </div>
        <div>
          <Caption className="mb-1.5">DRAM · one capacitor per bit · charge leaks</Caption>
          <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-8">
            {cells.bits.map((b, i) => {
              const c = !cells.powered || b === 0 || cells.lost[i] ? 0 : charge(cells.since[i], TAU[i]);
              const was1Lost = cells.lost[i];
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => flip(i)}
                  disabled={locked || !cells.powered}
                  aria-label={`DRAM bit ${i + 1} reads ${readBit(i, true)}${was1Lost ? " (a 1 that leaked away)" : ""}, charge ${Math.round(c * 100)} percent. Tap to write the other value.`}
                  className={`relative flex min-h-14 flex-col justify-end overflow-hidden rounded-lg border bg-surface-2 text-ink transition-colors disabled:cursor-default ${was1Lost ? "border-[var(--bad)]/70" : "border-line enabled:hover:border-[var(--line-strong)]"}`}
                >
                  <span aria-hidden className="absolute inset-x-0 bottom-0 bg-[var(--brand)] opacity-40 transition-[height] duration-200" style={{ height: `${Math.round(c * 100)}%` }} />
                  <span aria-hidden className="absolute inset-x-0 border-t border-dashed border-[var(--ink-3)]" style={{ bottom: "50%" }} />
                  <span className={`relative mb-1 text-center font-mono text-lg font-semibold ${was1Lost ? "text-bad" : ""}`}>{readBit(i, true)}</span>
                </button>
              );
            })}
          </div>
          <p className="mt-1 text-[11px] text-ink-3">Fill = charge. Below the dashed halfway line, a stored 1 reads as 0.</p>
        </div>
      </div>

      <div className="mt-3">
        <Note tone={lostCount(cells) > 0 ? "accent" : "plain"}>{msg}</Note>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        <Readout label="Time passed" value={`${cells.elapsed} ms`} />
        <Readout label="DRAM bits lost" value={lostCount(cells)} accent={lostCount(cells) > 0} />
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        <Btn onClick={() => wait(10)} disabled={locked || !cells.powered}>
          Wait 10 ms
        </Btn>
        <Btn onClick={() => wait(50)} disabled={locked || !cells.powered}>
          Wait 50 ms
        </Btn>
        <Btn onClick={() => wait(100)} disabled={locked || !cells.powered}>
          Wait 100 ms
        </Btn>
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
        {!props.lockRefresh && (
          <Seg
            label="Automatic refresh"
            value={refreshMs}
            onChange={pickRefresh}
            disabled={locked}
            options={[
              { value: 0, label: "No refresh" },
              { value: 64, label: "Every 64 ms" },
              { value: 128, label: "Every 128 ms" },
            ]}
          />
        )}
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
        <Btn onClick={refresh} disabled={locked || !cells.powered}>
          Refresh now
        </Btn>
        <Btn onClick={power} disabled={locked || !cells.powered}>
          <Power className="h-4 w-4" /> Power off
        </Btn>
        <Btn onClick={reset}>
          <RotateCcw className="h-4 w-4" /> Reset
        </Btn>
      </div>
    </div>
  );
}

/** goal: { minElapsed, maxLost, minLost, powered } */
export function checkCell(state: unknown, goal: Record<string, unknown>) {
  const s = state as CellWidgetState | undefined;
  if (!s) return false;
  if (typeof goal.minElapsed === "number" && s.elapsed < goal.minElapsed) return false;
  if (typeof goal.maxLost === "number" && s.lost > goal.maxLost) return false;
  if (typeof goal.minLost === "number" && s.lost < goal.minLost) return false;
  if (typeof goal.refreshMs === "number" && s.refreshMs !== goal.refreshMs) return false;
  if (typeof goal.powered === "boolean" && s.powered !== goal.powered) return false;
  return true;
}

// ───────────────────────────── memsys-rowbuf: rows and columns ─────────────────────────────

export interface RowBufProps {
  /** Reads to do in order, as [row, column]; a Next button walks them. Without it the learner taps cells. */
  sequence?: [number, number][];
}

export interface RowBufState {
  reads: number;
  total: number;
  hits: number;
  conflicts: number;
}

export function RowBuf({ props, onChange, revealed }: WidgetProps<RowBufProps>) {
  const [reads, setReads] = useState<[number, number][]>([]);
  const locked = Boolean(revealed);
  const run = runRows(reads);
  const last = reads[reads.length - 1];
  const hits = run.kinds.filter((k) => k === "row hit").length;
  const conflicts = run.kinds.filter((k) => k === "row conflict").length;

  const report = (rs: [number, number][]) => {
    const r = runRows(rs);
    onChange?.({
      reads: rs.length,
      total: r.total,
      hits: r.kinds.filter((k) => k === "row hit").length,
      conflicts: r.kinds.filter((k) => k === "row conflict").length,
    } satisfies RowBufState);
  };
  const read = (r: number, c: number) => {
    if (locked) return;
    const next: [number, number][] = [...reads, [r, c]];
    setReads(next);
    report(next);
  };
  const reset = () => {
    setReads([]);
    report([]);
  };
  const seq = props.sequence;
  const nextRead = seq && reads.length < seq.length ? seq[reads.length] : null;

  const kind = run.kinds[run.kinds.length - 1];
  const note = !last
    ? seq
      ? "Press Next read to send the reads in the list."
      : "Tap any cell to read it. Watch which row sits in the row buffer."
    : kind === "row hit"
      ? `Row ${last[0]} was already open in the row buffer: just pick column ${last[1]}. About ${T_ROW_HIT} ns.`
      : kind === "row empty"
        ? `No row was open. Activate row ${last[0]} (copy the whole row into the row buffer), then pick column ${last[1]}. About ${T_ROW_EMPTY} ns.`
        : `Row ${last[0]} is not the open row. Close the old row, activate row ${last[0]}, then pick column ${last[1]}. About ${T_ROW_CONFLICT} ns.`;

  return (
    <div className="w-full">
      <Caption className="mb-1.5">DRAM array · {ROWS} rows × {COLS} columns {seq ? "" : "· tap a cell to read it"}</Caption>
      <div className="rounded-xl border border-line bg-surface-2 p-2">
        <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))` }}>
          {Array.from({ length: ROWS * COLS }, (_, i) => {
            const r = Math.floor(i / COLS);
            const c = i % COLS;
            const open = run.open === r;
            const cur = last && last[0] === r && last[1] === c;
            return (
              <button
                key={i}
                type="button"
                disabled={Boolean(seq) || locked}
                onClick={() => read(r, c)}
                aria-label={`Read row ${r}, column ${c}`}
                className={`grid min-h-10 place-items-center rounded-md border font-mono text-[11px] transition-colors disabled:cursor-default ${
                  cur ? "border-transparent bg-primary text-primary-ink" : open ? "border-[var(--brand)] bg-tint text-ink" : "border-line bg-surface text-ink-3 enabled:hover:border-[var(--line-strong)]"
                }`}
              >
                {r},{c}
              </button>
            );
          })}
        </div>
      </div>
      <div className="mt-2 rounded-xl border border-line bg-surface p-2">
        <Caption className="mb-1">Row buffer {run.open === null ? "· empty" : `· holds row ${run.open}`}</Caption>
        <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))` }}>
          {Array.from({ length: COLS }, (_, c) => (
            <span
              key={c}
              className={`grid h-7 place-items-center rounded border font-mono text-[11px] ${run.open === null ? "border-dashed border-[var(--line-strong)] text-ink-3" : last && last[1] === c ? "border-transparent bg-primary text-primary-ink" : "border-[var(--brand)] bg-tint text-ink"}`}
            >
              {run.open === null ? "–" : `${run.open},${c}`}
            </span>
          ))}
        </div>
      </div>
      <div className="mt-3">
        <Note tone={last ? "accent" : "plain"}>{note}</Note>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        <Readout label="Reads" value={reads.length} />
        <Readout label="Row hits" value={hits} />
        <Readout label="Row switches" value={conflicts} />
        <Readout label="Total" value={`${run.total} ns`} accent />
      </div>
      <div className="mt-3 flex justify-center gap-2">
        <Btn onClick={reset} disabled={locked || reads.length === 0}>
          <RotateCcw className="h-4 w-4" /> Reset
        </Btn>
        {seq && (
          <Btn primary onClick={() => nextRead && read(nextRead[0], nextRead[1])} disabled={locked || !nextRead}>
            Next read
          </Btn>
        )}
      </div>
    </div>
  );
}

/** goal: { minReads, maxTotal, minHits } */
export function checkRowBuf(state: unknown, goal: Record<string, unknown>) {
  const s = state as RowBufState | undefined;
  if (!s) return false;
  if (typeof goal.minReads === "number" && s.reads < goal.minReads) return false;
  if (typeof goal.maxTotal === "number" && s.total > goal.maxTotal) return false;
  if (typeof goal.minHits === "number" && s.hits < goal.minHits) return false;
  return true;
}
