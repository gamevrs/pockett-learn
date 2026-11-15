"use client";

import React, { useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { BANKS, bankAccess, type BankAccess } from "./sim";
import { Caption, Note, Readout, Seg, ORANGE } from "./ui";

export interface BanksProps {
  /** What the warp reads (default "row"). */
  access?: BankAccess;
  /** Floats per tile row: 32 or 33 (default 32). */
  cols?: number;
  /** Hide the controls: show the starting access only. */
  fixed?: boolean;
}

export interface BanksState {
  access: BankAccess;
  cols: number;
  /** Passes shared memory needs for this request (1 = conflict-free). */
  ways: number;
  conflictFree: boolean;
}

const BRAND_TINT = "color-mix(in srgb, var(--brand) 24%, transparent)";
const ORANGE_TINT = `color-mix(in srgb, ${ORANGE} 34%, transparent)`;

/** 32 lanes of a warp read a tile in shared memory: which of the 32 banks does each lane hit, and do two lanes need different words from one bank? */
export function Banks({ props, onChange }: WidgetProps<BanksProps>) {
  const [access, setAccess] = useState<BankAccess>(props.access ?? "row");
  const [cols, setCols] = useState(props.cols ?? 32);

  const r = bankAccess(access, cols);
  const busiest = Math.max(...r.lanesPerBank);
  // distinct words per bank, to colour only real conflicts (same word = broadcast)
  const distinct = Array.from({ length: BANKS }, (_, b) => new Set(r.words.filter((_, l) => r.banks[l] === b)).size);

  const upd = (a: BankAccess, c: number) => {
    setAccess(a);
    setCols(c);
    const x = bankAccess(a, c);
    onChange?.({ access: a, cols: c, ways: x.ways, conflictFree: x.ways === 1 } satisfies BanksState);
  };

  return (
    <div className="w-full" data-widget>
      {!props.fixed && (
        <div className="mb-3 space-y-3">
          <div>
            <Caption className="mb-1">The warp reads</Caption>
            <Seg
              label="The warp reads"
              value={access}
              onChange={(v) => upd(v, cols)}
              options={[
                { value: "row" as BankAccess, label: "A row: tile[r][lane]" },
                { value: "column" as BankAccess, label: "A column: tile[lane][c]" },
              ]}
              className="max-w-full"
            />
          </div>
          <div>
            <Caption className="mb-1">Tile width</Caption>
            <Seg
              label="Tile width"
              value={cols}
              onChange={(v) => upd(access, v)}
              options={[
                { value: 32, label: "32 floats" },
                { value: 33, label: "33 floats (1 pad)" },
              ]}
              className="max-w-full"
            />
          </div>
        </div>
      )}

      <p className="mb-2 whitespace-pre-wrap break-words rounded-lg bg-surface-2 px-3 py-2 font-mono text-[13px] text-ink">
        {`float tile[32][${cols}];\n${access === "row" ? "x = tile[0][lane];" : "x = tile[lane][0];"}`}
      </p>

      <Caption className="mb-1.5">The 32 banks · the number in each cell is how many lanes it serves</Caption>
      <div className="grid grid-cols-8 gap-1">
        {r.lanesPerBank.map((n, b) => {
          const conflict = distinct[b] > 1;
          const used = n > 0;
          return (
            <div
              key={b}
              className="flex min-w-0 flex-col items-center rounded-md border border-line px-0.5 py-1 text-center text-ink"
              style={{ background: conflict ? ORANGE_TINT : used ? BRAND_TINT : undefined }}
              role="img"
              aria-label={`bank ${b}: ${n} ${n === 1 ? "lane" : "lanes"}${conflict ? ", conflict" : ""}`}
            >
              <span className="text-[11px] leading-tight text-ink-2">bank</span>
              <span className="text-[11px] leading-tight text-ink-2">{b}</span>
              <span className="font-mono text-[13px] font-semibold leading-tight tabular-nums">{n}</span>
            </div>
          );
        })}
      </div>

      <div className="mt-3">
        <Note tone={r.ways === 1 ? "plain" : "accent"}>
          {r.ways === 1 ? (
            <>
              <b>Conflict-free.</b> All 32 lanes hit different banks, so shared memory serves the warp in one pass.
            </>
          ) : (
            <>
              <b>{r.ways}-way bank conflict.</b> {r.ways} lanes need different words from the same bank, so the request is split into {r.ways} passes, one after another.
            </>
          )}
        </Note>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        <Readout label="Passes" value={r.ways} accent />
        <Readout label="Busiest bank" value={`${busiest} ${busiest === 1 ? "lane" : "lanes"}`} />
      </div>
      <p className="mt-2 text-xs text-ink-3">Simplified: 32 banks, each 4 bytes wide, as on NVIDIA GPUs; lanes reading the very same word get it by broadcast. Bank counts and widths vary by vendor and generation.</p>
    </div>
  );
}

/** goal: { access?: "row" | "column", cols?: number, ways?: number, maxWays?: number, conflictFree?: boolean }. access, cols and ways match exactly; maxWays is an upper bound. */
export function checkBanks(state: unknown, goal: Record<string, unknown>) {
  const s = state as BanksState | undefined;
  if (!s) return false;
  if (typeof goal.access === "string" && s.access !== goal.access) return false;
  if (typeof goal.cols === "number" && s.cols !== goal.cols) return false;
  if (typeof goal.ways === "number" && s.ways !== goal.ways) return false;
  if (typeof goal.maxWays === "number" && s.ways > goal.maxWays) return false;
  if (typeof goal.conflictFree === "boolean" && s.conflictFree !== goal.conflictFree) return false;
  return true;
}
