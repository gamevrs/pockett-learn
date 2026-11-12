"use client";

import React, { useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { matmul } from "./sim";
import { Caption, Note, Readout, Seg, Stepper, BLUE, ORANGE } from "./ui";

export interface TiledProps {
  /** Starting tile size (1, 2, 4 or 8; default 1 = the naive kernel). */
  tile?: number;
}

export interface TiledState {
  tile: number;
  /** Global loads for the whole 8×8 multiply. */
  loads: number;
  naiveLoads: number;
  /** FLOPs per byte of global traffic (any matrix size). */
  intensity: number;
}

const N = 8;

/** An 8×8 matrix multiply: pick a tile size and step through the phases to see how much fewer global loads tiling needs. */
export function Tiled({ props, onChange }: WidgetProps<TiledProps>) {
  const [tile, setTile] = useState(props.tile ?? 1);
  const [phase, setPhase] = useState(0);
  const [cTile, setCTile] = useState({ r: 0, c: 0 });

  const phases = N / tile;
  const cnt = matmul(N, tile);
  const naive = matmul(N, 1);

  const report = (t: number) => {
    const x = matmul(N, t);
    onChange?.({ tile: t, loads: x.loads, naiveLoads: naive.loads, intensity: x.intensity } satisfies TiledState);
  };
  const pickTile = (t: number) => {
    setTile(t);
    setPhase(0);
    setCTile({ r: 0, c: 0 });
    report(t);
  };

  const grid = (name: string, kind: "A" | "B" | "C") => (
    <div>
      <p className="mb-1 text-center font-mono text-[11px] text-ink-3">{name}</p>
      <div className="grid gap-px rounded-md bg-[var(--line-strong)] p-px" style={{ gridTemplateColumns: `repeat(${N}, 1fr)`, width: "11.5rem", maxWidth: "100%" }}>
        {Array.from({ length: N * N }, (_, k) => {
          const r = Math.floor(k / N);
          const c = k % N;
          const inC = Math.floor(r / tile) === cTile.r && Math.floor(c / tile) === cTile.c;
          const inA = Math.floor(r / tile) === cTile.r && Math.floor(c / tile) === phase;
          const inB = Math.floor(r / tile) === phase && Math.floor(c / tile) === cTile.c;
          const colour = kind === "C" ? (inC ? "var(--brand)" : "") : kind === "A" ? (inA ? BLUE : "") : inB ? ORANGE : "";
          const base = <span key={k} className="aspect-square" style={{ background: colour || "var(--surface)" }} />;
          if (kind !== "C") return base;
          return (
            <button key={k} type="button" aria-label={`Pick the output tile containing row ${r}, column ${c}`} onClick={() => { setCTile({ r: Math.floor(r / tile), c: Math.floor(c / tile) }); setPhase(0); }} className="aspect-square" style={{ background: colour || "var(--surface)" }} />
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="w-full" data-widget>
      <div className="mb-3 flex flex-wrap items-end gap-x-6 gap-y-3">
        <div>
          <Caption className="mb-1">Tile size (T × T)</Caption>
          <Seg label="Tile size" value={tile} onChange={pickTile} options={[1, 2, 4, 8].map((v) => ({ value: v, label: v === 1 ? "1 (naive)" : `${v} × ${v}` }))} />
        </div>
        <div>
          <Caption className="mb-1">Phase (which slice of the sum)</Caption>
          <Stepper label="Phase" value={phase + 1} min={1} max={phases} onChange={(v) => setPhase(v - 1)} format={(v) => `${v} / ${phases}`} wide />
        </div>
      </div>

      <div className="flex flex-wrap items-start justify-center gap-x-4 gap-y-3">
        {grid("A (input)", "A")}
        {grid("B (input)", "B")}
        {grid("C = A × B (tap a spot)", "C")}
      </div>
      <p className="mt-2 text-xs text-ink-3">
        Green: the {tile} × {tile} piece of C one block computes. <span style={{ color: BLUE }}>■</span> blue and <span style={{ color: ORANGE }}>■</span> orange: the tiles of A and B it copies into shared memory in this phase and reuses {tile} times each.
      </p>

      <div className="mt-3">
        <Note tone={tile > 1 ? "accent" : "plain"}>
          {tile === 1 ? (
            <>
              <b>Naive:</b> every output number reads its own row of A and column of B straight from global memory: {2 * N} loads each, {naive.loads.toLocaleString("en-US")} in all for this 8 × 8 multiply. The same numbers are fetched again and again.
            </>
          ) : (
            <>
              <b>Tiled:</b> the block loads a {tile} × {tile} tile of A and of B once per phase and all {tile * tile} threads reuse it from shared memory. {phases} phases, {cnt.loads.toLocaleString("en-US")} global loads in all: <b>{tile}× fewer</b>.
            </>
          )}
        </Note>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        <Readout label="Global loads" value={cnt.loads.toLocaleString("en-US")} />
        <Readout label="vs naive" value={`${naive.loads.toLocaleString("en-US")}`} />
        <Readout label="FLOP per byte" value={+cnt.intensity.toFixed(2)} accent />
      </div>
      <p className="mt-2 text-xs text-ink-3">Counts loads of A and B only, with no caches helping. Real kernels use tiles of 16 to 128 and register tiling on top.</p>
    </div>
  );
}

/** goal: { tile?: number, minTile?: number }. */
export function checkTiled(state: unknown, goal: Record<string, unknown>) {
  const s = state as TiledState | undefined;
  if (!s) return false;
  if (typeof goal.tile === "number" && s.tile !== goal.tile) return false;
  if (typeof goal.minTile === "number" && s.tile < goal.minTile) return false;
  return true;
}
