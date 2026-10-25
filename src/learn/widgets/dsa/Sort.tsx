"use client";

import React, { useEffect, useState } from "react";
import { ChevronRight, FastForward, Pause, Play, RotateCcw, Shuffle } from "lucide-react";
import type { WidgetProps } from "@/learn/widget";
import { Caption, fmt, Readout, Segmented, Stepper } from "./ui";

/**
 * Sorting, step by step. Pick an algorithm and step through it (or play it): the two bars being
 * compared light up, swaps and writes are counted, and bars that reached their final place turn
 * green. `manual` lets the learner sort by swapping any two bars. `table` races all four
 * algorithms on bigger inputs and shows only the comparison counts.
 */
export type Algo = "bubble" | "selection" | "insertion" | "merge";

export interface SortProps {
  algorithm?: Algo;
  /** Algorithms the learner can switch between (default: just `algorithm`). */
  choose?: Algo[];
  values?: number[];
  /** Sort by hand: tap two bars to swap them. */
  manual?: boolean;
  /** Comparison table for n = 8 … 256 on shuffled, sorted or reversed input. */
  table?: boolean;
  initialN?: number;
}

export interface SortState {
  algorithm: Algo | "manual" | "table";
  done: boolean;
  sorted: boolean;
  comparisons: number;
  moves: number;
  n?: number;
  input?: string;
}

interface Frame {
  arr: number[];
  cmp?: [number, number];
  swap?: [number, number];
  write?: number;
  fixed: number[];
  region?: [number, number];
  note: string;
  comparisons: number;
  moves: number;
}

const NAMES: Record<Algo, string> = { bubble: "Bubble", selection: "Selection", insertion: "Insertion", merge: "Merge" };

export function framesFor(algo: Algo, input: number[]): Frame[] {
  const a = [...input];
  const n = a.length;
  const out: Frame[] = [];
  let c = 0;
  let m = 0;
  const fixed = new Set<number>();
  const push = (f: Omit<Frame, "arr" | "fixed" | "comparisons" | "moves">, arr = a) => out.push({ arr: [...arr], fixed: [...fixed], comparisons: c, moves: m, ...f });
  push({ note: "Start." });

  if (algo === "bubble") {
    for (let i = 0; i < n - 1; i++) {
      let swapped = false;
      for (let j = 0; j < n - 1 - i; j++) {
        c++;
        push({ cmp: [j, j + 1], note: `Compare ${a[j]} and ${a[j + 1]}.` });
        if (a[j] > a[j + 1]) {
          [a[j], a[j + 1]] = [a[j + 1], a[j]];
          m++;
          swapped = true;
          push({ swap: [j, j + 1], note: `${a[j + 1]} is bigger, so swap: it bubbles right.` });
        }
      }
      fixed.add(n - 1 - i);
      if (!swapped) {
        for (let k = 0; k < n; k++) fixed.add(k);
        push({ note: "A whole pass with no swaps: everything is in order." });
        break;
      }
      push({ note: `Pass ${i + 1} done: ${a[n - 1 - i]} has reached its place.` });
    }
  } else if (algo === "selection") {
    for (let i = 0; i < n - 1; i++) {
      let min = i;
      for (let j = i + 1; j < n; j++) {
        c++;
        const smaller = a[j] < a[min];
        push({ cmp: [min, j], note: smaller ? `${a[j]} < ${a[min]}: new smallest so far.` : `${a[j]} isn't smaller than ${a[min]}.` });
        if (smaller) min = j;
      }
      if (min !== i) {
        [a[i], a[min]] = [a[min], a[i]];
        m++;
        fixed.add(i);
        push({ swap: [i, min], note: `Swap the smallest, ${a[i]}, into place ${i}.` });
      } else {
        fixed.add(i);
        push({ note: `${a[i]} is already the smallest left: it stays at place ${i}.` });
      }
    }
    fixed.add(n - 1);
  } else if (algo === "insertion") {
    for (let i = 1; i < n; i++) {
      let j = i;
      while (j > 0) {
        c++;
        push({ cmp: [j - 1, j], region: [0, i], note: `Compare ${a[j - 1]} and ${a[j]}.` });
        if (a[j - 1] > a[j]) {
          [a[j - 1], a[j]] = [a[j], a[j - 1]];
          m++;
          push({ swap: [j - 1, j], region: [0, i], note: `${a[j - 1]} is smaller: slide it left.` });
          j--;
        } else break;
      }
      push({ region: [0, i], note: `The first ${i + 1} are sorted among themselves.` });
    }
    for (let k = 0; k < n; k++) fixed.add(k);
  } else {
    const sortRange = (lo: number, hi: number) => {
      if (hi - lo <= 1) return;
      const mid = Math.floor((lo + hi) / 2);
      sortRange(lo, mid);
      sortRange(mid, hi);
      const left = a.slice(lo, mid);
      const right = a.slice(mid, hi);
      const merged: number[] = [];
      let i = 0;
      let j = 0;
      const view = () => [...a.slice(0, lo), ...merged, ...left.slice(i), ...right.slice(j), ...a.slice(hi)];
      push({ region: [lo, hi - 1], note: `Merge [${left.join(", ")}] and [${right.join(", ")}].` }, view());
      while (i < left.length && j < right.length) {
        c++;
        const p = lo + merged.length;
        const q = p + (left.length - i);
        push({ cmp: [p, q], region: [lo, hi - 1], note: `Front items: ${left[i]} and ${right[j]}. Take the smaller.` }, view());
        if (left[i] <= right[j]) merged.push(left[i++]);
        else merged.push(right[j++]);
        m++;
        push({ write: lo + merged.length - 1, region: [lo, hi - 1], note: `Write ${merged[merged.length - 1]}.` }, view());
      }
      while (i < left.length || j < right.length) {
        merged.push(i < left.length ? left[i++] : right[j++]);
        m++;
      }
      for (let k = 0; k < merged.length; k++) a[lo + k] = merged[k];
      if (lo === 0 && hi === n) for (let k = 0; k < n; k++) fixed.add(k);
      push({ region: [lo, hi - 1], note: `One side ran out: copy the rest. [${merged.join(", ")}] is sorted.` });
    };
    sortRange(0, n);
  }
  for (let k = 0; k < n; k++) fixed.add(k);
  push({ note: `Sorted: ${c} comparisons, ${m} ${algo === "merge" ? "writes" : "swaps"}.` });
  return out;
}

/** Comparisons only (for the table): the same algorithms as framesFor, counting instead of recording. */
export function comparisonsFor(algo: Algo, input: number[]): number {
  const a = [...input];
  const n = a.length;
  let c = 0;
  if (algo === "bubble") {
    for (let i = 0; i < n - 1; i++) {
      let swapped = false;
      for (let j = 0; j < n - 1 - i; j++) {
        c++;
        if (a[j] > a[j + 1]) {
          [a[j], a[j + 1]] = [a[j + 1], a[j]];
          swapped = true;
        }
      }
      if (!swapped) break;
    }
  } else if (algo === "selection") {
    for (let i = 0; i < n - 1; i++) {
      let min = i;
      for (let j = i + 1; j < n; j++) {
        c++;
        if (a[j] < a[min]) min = j;
      }
      [a[i], a[min]] = [a[min], a[i]];
    }
  } else if (algo === "insertion") {
    for (let i = 1; i < n; i++) {
      for (let j = i; j > 0; j--) {
        c++;
        if (a[j - 1] > a[j]) [a[j - 1], a[j]] = [a[j], a[j - 1]];
        else break;
      }
    }
  } else {
    const sortRange = (lo: number, hi: number) => {
      if (hi - lo <= 1) return;
      const mid = Math.floor((lo + hi) / 2);
      sortRange(lo, mid);
      sortRange(mid, hi);
      const left = a.slice(lo, mid);
      const right = a.slice(mid, hi);
      let i = 0;
      let j = 0;
      let k = lo;
      while (i < left.length && j < right.length) {
        c++;
        a[k++] = left[i] <= right[j] ? left[i++] : right[j++];
      }
      while (i < left.length) a[k++] = left[i++];
      while (j < right.length) a[k++] = right[j++];
    };
    sortRange(0, n);
  }
  return c;
}

function seeded(n: number, seed: number): number[] {
  const arr = Array.from({ length: n }, (_, i) => i + 1);
  let s = seed;
  for (let i = n - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) % 2147483648;
    const j = s % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

const isSorted = (a: number[]) => a.every((v, i) => i === 0 || a[i - 1] <= v);

export function Sort(p: WidgetProps<SortProps>) {
  if (p.props.table) return <SortTable {...p} />;
  if (p.props.manual) return <ManualSort {...p} />;
  return <SortStepper {...p} />;
}

function SortStepper({ props, onChange }: WidgetProps<SortProps>) {
  const options = props.choose ?? [props.algorithm ?? "selection"];
  const [algo, setAlgo] = useState<Algo>(props.algorithm ?? options[0]);
  const [values, setValues] = useState<number[]>(props.values ?? [5, 2, 8, 1, 9, 3, 7, 4]);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const frames = framesFor(algo, values);
  const f = frames[Math.min(step, frames.length - 1)];
  const done = step >= frames.length - 1;

  const go = (s: number) => {
    const k = Math.max(0, Math.min(frames.length - 1, s));
    setStep(k);
    const fr = frames[k];
    if (k >= frames.length - 1) setPlaying(false);
    onChange?.({ algorithm: algo, done: k >= frames.length - 1, sorted: isSorted(fr.arr), comparisons: fr.comparisons, moves: fr.moves } satisfies SortState);
  };

  useEffect(() => {
    if (!playing) return;
    const t = setTimeout(() => go(step + 1), algo === "merge" ? 420 : 300);
    return () => clearTimeout(t);
  });

  const switchAlgo = (a: Algo) => {
    setAlgo(a);
    setStep(0);
    setPlaying(false);
    onChange?.(undefined);
  };
  const shuffle = () => {
    const n = values.length;
    let next = values;
    while (next === values || isSorted(next)) next = seeded(n, Math.floor(Math.random() * 1e9)).map((v) => v + Math.max(0, Math.min(...values) - 1));
    setValues(next);
    setStep(0);
    setPlaying(false);
    onChange?.(undefined);
  };

  const maxV = Math.max(...values);
  const moveLabel = algo === "merge" ? "Writes" : "Swaps";

  return (
    <div className="w-full min-w-0">
      {options.length > 1 && (
        <Segmented className="mb-3 w-full sm:w-auto" label="Algorithm" value={algo} onChange={switchAlgo} options={options.map((o) => ({ id: o, label: NAMES[o] }))} />
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Readout label="Comparisons" value={f.comparisons} accent />
        <Readout label={moveLabel} value={f.moves} />
        <span className="ml-auto font-mono text-xs tabular-nums text-ink-3">
          step {step} / {frames.length - 1}
        </span>
      </div>

      <Bars arr={f.arr} maxV={maxV} frame={f} />

      <p className="mt-2 min-h-10 rounded-xl bg-surface-2 px-3 py-2 text-sm text-ink-2" aria-live="polite">
        {f.note}
      </p>

      <div className="mt-3 flex items-center gap-2">
        <button type="button" className={`btn ${done ? "" : "btn-primary"} !h-10 flex-1 sm:flex-none sm:!px-5`} onClick={() => go(step + 1)} disabled={done}>
          Step <ChevronRight className="h-4 w-4" />
        </button>
        <button type="button" className="btn !h-10" onClick={() => (playing ? setPlaying(false) : done ? undefined : setPlaying(true))} disabled={done} aria-label={playing ? "Pause" : "Play"}>
          {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          <span className="hidden min-[380px]:inline">{playing ? "Pause" : "Play"}</span>
        </button>
        <button type="button" className="btn !h-10 !w-10 !p-0" onClick={() => go(frames.length - 1)} disabled={done} aria-label="Skip to the end" title="Skip to the end">
          <FastForward className="h-4 w-4" />
        </button>
        <span className="ml-auto flex gap-1">
          <button type="button" className="btn btn-ghost !h-10 !w-10 !p-0" onClick={shuffle} aria-label="New order" title="New order">
            <Shuffle className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="btn btn-ghost !h-10 !w-10 !p-0"
            onClick={() => {
              setPlaying(false);
              go(0);
            }}
            disabled={step === 0}
            aria-label="Back to the start"
            title="Back to the start"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </span>
      </div>
    </div>
  );
}

function Bars({ arr, maxV, frame, picked, onPick, disabled }: { arr: number[]; maxV: number; frame?: Frame; picked?: number | null; onPick?: (i: number) => void; disabled?: boolean }) {
  const fixed = new Set(frame?.fixed ?? []);
  return (
    <div className="mt-3 flex h-44 items-end gap-1 rounded-xl border border-line bg-surface-2 px-2 pb-2 pt-3 sm:gap-1.5 sm:px-3">
      {arr.map((v, i) => {
        const cmp = frame?.cmp?.includes(i);
        const sw = frame?.swap?.includes(i) || frame?.write === i;
        const fx = fixed.has(i);
        const inRegion = frame?.region && i >= frame.region[0] && i <= frame.region[1];
        const pick = picked === i;
        const cls = pick
          ? "border-transparent bg-primary text-primary-ink ring-2 ring-[var(--brand)] ring-offset-2 ring-offset-[var(--surface-2)]"
          : sw
            ? "border-transparent bg-primary text-primary-ink"
            : cmp
              ? "border-[var(--brand)] border-2 bg-tint text-ink"
              : fx
                ? "border-[var(--brand)]/40 bg-[var(--brand)]/25 text-ink"
                : inRegion
                  ? "border-[var(--line-strong)] bg-ink/[0.16] text-ink"
                  : "border-transparent bg-ink/[0.09] text-ink-2";
        const body = (
          <span className={`flex w-full items-end justify-center rounded-t-md border pb-1 font-mono text-[0.7rem] font-semibold tabular-nums transition-[height] duration-200 sm:text-xs ${cls} ${sw ? "pop-in" : ""}`} style={{ height: `${18 + (v / maxV) * 82}%` }}>
            {v}
          </span>
        );
        return onPick ? (
          <button key={i} type="button" className="flex h-full min-w-0 flex-1 items-end disabled:cursor-default" onClick={() => onPick(i)} disabled={disabled} aria-label={`Bar ${v}${pick ? ", picked" : ""}`} aria-pressed={pick}>
            {body}
          </button>
        ) : (
          <div key={i} className="flex h-full min-w-0 flex-1 items-end">
            {body}
          </div>
        );
      })}
    </div>
  );
}

function ManualSort({ props, onChange, revealed, status }: WidgetProps<SortProps>) {
  const start = props.values ?? [5, 2, 8, 1, 9, 3, 7, 4];
  const [arr, setArr] = useState(start);
  const [picked, setPicked] = useState<number | null>(null);
  const [swaps, setSwaps] = useState(0);
  const sorted = isSorted(arr);
  const pick = (i: number) => {
    if (revealed || sorted) return;
    if (picked === null) return setPicked(i);
    if (picked === i) return setPicked(null);
    const next = [...arr];
    [next[picked], next[i]] = [next[i], next[picked]];
    setArr(next);
    setPicked(null);
    setSwaps(swaps + 1);
    onChange?.({ algorithm: "manual", done: isSorted(next), sorted: isSorted(next), comparisons: 0, moves: swaps + 1 } satisfies SortState);
  };
  const reset = () => {
    setArr(start);
    setPicked(null);
    setSwaps(0);
    onChange?.(undefined);
  };
  const shown = status === "revealed" && !sorted ? [...arr].sort((a, b) => a - b) : arr;
  return (
    <div className="w-full min-w-0">
      <div className="flex flex-wrap items-center gap-2">
        <Readout label="Swaps" value={swaps} accent />
        <span className="text-sm text-ink-2">{sorted ? "Sorted, smallest to largest." : picked === null ? "Tap a bar to pick it up." : "Now tap the bar to swap it with."}</span>
        <button type="button" className="btn btn-ghost ml-auto !h-10 !w-10 !p-0" onClick={reset} disabled={revealed || swaps === 0} aria-label="Start over" title="Start over">
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>
      <Bars arr={shown} maxV={Math.max(...arr)} picked={picked} onPick={pick} disabled={revealed || sorted} frame={sorted ? { arr, fixed: arr.map((_, i) => i), note: "", comparisons: 0, moves: 0 } : undefined} />
    </div>
  );
}

function SortTable({ props, onChange, revealed }: WidgetProps<SortProps>) {
  const [n, setN] = useState(props.initialN ?? 16);
  const [input, setInput] = useState<"shuffled" | "sorted" | "reversed">("shuffled");
  const data = input === "sorted" ? Array.from({ length: n }, (_, i) => i + 1) : input === "reversed" ? Array.from({ length: n }, (_, i) => n - i) : seeded(n, 42);
  const algos: Algo[] = ["bubble", "selection", "insertion", "merge"];
  const rows = algos.map((a) => ({ a, c: comparisonsFor(a, data) }));
  const top = Math.max(...rows.map((r) => r.c), 1);
  const report = (nn: number, inp: string) => onChange?.({ algorithm: "table", done: true, sorted: true, comparisons: 0, moves: 0, n: nn, input: inp } satisfies SortState);
  return (
    <div className="w-full min-w-0">
      <div className="flex flex-wrap items-center gap-2">
        <Stepper label="n items" value={n} onDec={() => {
            setN(n / 2);
            report(n / 2, input);
          }}
          onInc={() => {
            setN(n * 2);
            report(n * 2, input);
          }} canDec={n > 8} canInc={n < 256} disabled={revealed} />
        <Segmented
          label="Input order"
          value={input}
          onChange={(v) => {
            setInput(v);
            report(n, v);
          }}
          disabled={revealed}
          options={[
            { id: "shuffled", label: "Shuffled" },
            { id: "sorted", label: "Sorted" },
            { id: "reversed", label: "Reversed" },
          ]}
        />
      </div>
      <Caption className="mt-4">Comparisons to sort {n} items</Caption>
      <div className="grid gap-1.5">
        {rows.map((r) => (
          <div key={r.a} className="grid grid-cols-[5.5rem_1fr_4rem] items-center gap-2">
            <span className="text-sm text-ink-2">{NAMES[r.a]}</span>
            <span className="h-6 overflow-hidden rounded-md bg-surface-2">
              <span className={`block h-full rounded-md ${r.a === "merge" ? "bg-primary" : "bg-[var(--brand)]/35"}`} style={{ width: `${Math.max(1.5, (r.c / top) * 100)}%` }} />
            </span>
            <span className="text-right font-mono text-sm font-semibold tabular-nums text-ink">{fmt(r.c)}</span>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[0.72rem] text-ink-3">
        For reference: n²/2 = {fmt((n * n) / 2)}, n·log₂n = {fmt(n * Math.log2(n))}.
      </p>
    </div>
  );
}

export function checkSort(state: unknown, goal: Record<string, unknown>) {
  const s = state as SortState | undefined;
  if (!s) return false;
  if (typeof goal.algorithm === "string" && s.algorithm !== goal.algorithm) return false;
  if (goal.done === true && !s.done) return false;
  if (goal.sorted === true && !s.sorted) return false;
  if (typeof goal.maxSwaps === "number" && s.moves > goal.maxSwaps) return false;
  if (typeof goal.n === "number" && s.n !== goal.n) return false;
  if (typeof goal.input === "string" && s.input !== goal.input) return false;
  return true;
}
