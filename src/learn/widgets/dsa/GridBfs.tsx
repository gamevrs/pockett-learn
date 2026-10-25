"use client";

import React, { useState } from "react";
import { ChevronRight, FastForward, RotateCcw } from "lucide-react";
import type { WidgetProps } from "@/learn/widget";
import { Readout } from "./ui";

/**
 * Breadth-first search on a grid. From S, the search spreads one layer at a time: first every
 * cell 1 move away, then every cell 2 moves away, and so on. The number in a cell is how many moves
 * it took to reach. When G is reached, the shortest path lights up. With `editable`, tap cells to
 * add or remove walls.
 *
 * Map rows use "S" start, "G" goal, "#" wall, "." open.
 */
export interface GridBfsProps {
  map: string[];
  editable?: boolean;
  /** Show the distance numbers (default true). */
  numbers?: boolean;
}

export interface GridBfsState {
  layer: number;
  /** The layered search has reached G. */
  reached: boolean;
  /** True shortest distance S → G with the current walls (null when blocked). */
  distance: number | null;
  walls: number;
}

type Cell = [number, number];
const key = (r: number, c: number) => `${r},${c}`;
const DIRS: Cell[] = [
  [-1, 0],
  [0, 1],
  [1, 0],
  [0, -1],
];

function parse(map: string[]) {
  let start: Cell = [0, 0];
  let goal: Cell = [0, 0];
  const walls = new Set<string>();
  map.forEach((row, r) =>
    [...row].forEach((ch, c) => {
      if (ch === "S") start = [r, c];
      else if (ch === "G") goal = [r, c];
      else if (ch === "#") walls.add(key(r, c));
    }),
  );
  return { rows: map.length, cols: Math.max(...map.map((r) => r.length)), start, goal, walls };
}

function bfs(rows: number, cols: number, start: Cell, walls: Set<string>) {
  const dist = new Map<string, number>([[key(...start), 0]]);
  const prev = new Map<string, string>();
  const queue: Cell[] = [start];
  for (let h = 0; h < queue.length; h++) {
    const [r, c] = queue[h];
    const d = dist.get(key(r, c))!;
    for (const [dr, dc] of DIRS) {
      const nr = r + dr;
      const nc = c + dc;
      const k = key(nr, nc);
      if (nr < 0 || nc < 0 || nr >= rows || nc >= cols || walls.has(k) || dist.has(k)) continue;
      dist.set(k, d + 1);
      prev.set(k, key(r, c));
      queue.push([nr, nc]);
    }
  }
  return { dist, prev };
}

export function GridBfs({ props, onChange, revealed }: WidgetProps<GridBfsProps>) {
  const base = parse(props.map);
  const { rows, cols, start, goal } = base;
  const [walls, setWalls] = useState<Set<string>>(base.walls);
  const [layer, setLayer] = useState(0);
  const { dist, prev } = bfs(rows, cols, start, walls);
  const gk = key(...goal);
  const sk = key(...start);
  const total = dist.get(gk) ?? null;
  const maxLayer = Math.max(...dist.values());
  const reached = total !== null && layer >= total;
  const finished = reached || layer >= maxLayer;
  const numbers = props.numbers ?? true;

  const path = new Set<string>();
  if (reached) for (let k: string | undefined = gk; k; k = prev.get(k)) path.add(k);

  const report = (l: number, w: Set<string>) => {
    const r = bfs(rows, cols, start, w);
    const d = r.dist.get(gk) ?? null;
    onChange?.({ layer: l, reached: d !== null && l >= d, distance: d, walls: w.size } satisfies GridBfsState);
  };
  const toLayer = (l: number) => {
    setLayer(l);
    report(l, walls);
  };
  const toggle = (r: number, c: number) => {
    const k = key(r, c);
    if (!props.editable || revealed || k === sk || k === gk) return;
    const w = new Set(walls);
    if (w.has(k)) w.delete(k);
    else w.add(k);
    setWalls(w);
    setLayer(0);
    report(0, w);
  };
  const reset = () => {
    setWalls(base.walls);
    setLayer(0);
    onChange?.(undefined);
  };

  const frontier = [...dist.entries()].filter(([, d]) => d === layer).length;
  const visited = [...dist.values()].filter((d) => d <= layer).length;

  return (
    <div className="w-full min-w-0">
      <div className="flex flex-wrap items-center gap-2">
        <Readout label="Layer" value={layer} accent />
        <Readout label="Visited" value={visited} />
        {!finished && <Readout label="Frontier" value={frontier} />}
        {reached && <Readout label="Shortest path" value={`${total} moves`} accent />}
      </div>

      <div className="mx-auto mt-3 grid w-full gap-[3px]" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, maxWidth: cols * 46 }}>
        {Array.from({ length: rows * cols }, (_, idx) => {
          const r = Math.floor(idx / cols);
          const c = idx % cols;
          const k = key(r, c);
          const wall = walls.has(k);
          const d = dist.get(k);
          const seen = d !== undefined && d <= layer;
          const front = d === layer && !finished;
          const onPath = path.has(k);
          const isS = k === sk;
          const isG = k === gk;
          const cls = wall
            ? "border-[var(--line-strong)] bg-surface-2"
            : onPath
              ? "border-transparent bg-primary text-primary-ink"
              : front
                ? "border-[var(--brand)] border-2 bg-tint text-ink"
                : seen
                  ? "border-[var(--brand)]/30 bg-tint text-ink-2"
                  : "border-line bg-surface text-ink-3";
          const label = isS ? "S" : isG ? "G" : seen && numbers ? String(d) : "";
          const content = (
            <span
              style={wall ? { backgroundImage: "repeating-linear-gradient(45deg, var(--ink-3) 0 2px, transparent 2px 6px)" } : undefined}
              className={`grid aspect-square w-full place-items-center rounded-md border font-mono text-[0.7rem] font-semibold tabular-nums transition-colors sm:text-xs ${cls} ${isG && !onPath ? "ring-2 ring-inset ring-[var(--brand)]" : ""} ${front ? "pop-in" : ""}`}>
              {label}
            </span>
          );
          return props.editable && !isS && !isG ? (
            <button key={k} type="button" onClick={() => toggle(r, c)} disabled={revealed} className="block disabled:cursor-default" aria-label={`${wall ? "Remove wall at" : "Add wall at"} row ${r + 1}, column ${c + 1}`}>
              {content}
            </button>
          ) : (
            <span key={k} className="block">
              {content}
            </span>
          );
        })}
      </div>

      <p className="mt-3 min-h-10 rounded-xl bg-surface-2 px-3 py-2 text-sm text-ink-2" aria-live="polite">
        {reached
          ? `G reached in layer ${total}: the shortest path is ${total} moves. No shorter path can exist, because every cell closer than ${total} moves was already explored.`
          : finished && total === null
            ? "The frontier is empty and G was never reached: there's no way through."
            : layer === 0
              ? props.editable
                ? "Tap cells to add or remove walls, then search."
                : "Layer 0 is just S. Expand it to see every cell 1 move away."
              : `Every cell ${layer} ${layer === 1 ? "move" : "moves"} from S is now on the frontier.`}
      </p>

      <div className="mt-3 flex items-center gap-2">
        <button type="button" className={`btn ${finished ? "" : "btn-primary"} !h-10 flex-1 sm:flex-none sm:!px-5`} onClick={() => toLayer(layer + 1)} disabled={finished}>
          Next layer <ChevronRight className="h-4 w-4" />
        </button>
        <button type="button" className="btn !h-10" onClick={() => toLayer(total ?? maxLayer)} disabled={finished}>
          <FastForward className="h-4 w-4" /> <span className="hidden min-[360px]:inline">Run all</span>
        </button>
        <button type="button" className="btn btn-ghost ml-auto !h-10 !w-10 !p-0" onClick={reset} disabled={revealed || (layer === 0 && walls.size === base.walls.size && [...walls].every((w) => base.walls.has(w)))} aria-label="Start over" title="Start over">
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function checkGridBfs(state: unknown, goal: Record<string, unknown>) {
  const s = state as GridBfsState | undefined;
  if (!s) return false;
  if (goal.reached === true && !s.reached) return false;
  if (typeof goal.distance === "number" && s.distance !== goal.distance) return false;
  if (typeof goal.distanceMin === "number" && (s.distance === null || s.distance < goal.distanceMin)) return false;
  if (goal.blocked === true && s.distance !== null) return false;
  if (typeof goal.maxWalls === "number" && s.walls > goal.maxWalls) return false;
  return true;
}
