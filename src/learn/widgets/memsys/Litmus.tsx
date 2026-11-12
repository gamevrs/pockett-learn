"use client";

import React, { useState } from "react";
import { RotateCcw } from "lucide-react";
import type { WidgetProps } from "@/learn/widget";
import { LITMUS, outcomes, type Litmus as LitmusTest, type Model, type Op, type Order } from "./cohsim";
import { Btn, Caption, Note, Seg } from "./ui";

// ───────────────────────────── memsys-litmus: which outcomes can happen? ─────────────────────────────

const MODELS: { value: Model; label: string }[] = [
  { value: "sc", label: "In order (SC)" },
  { value: "tso", label: "x86 (TSO)" },
  { value: "weak", label: "ARM-like (weak)" },
];
const ORDER_CYCLE: Order[] = ["relaxed", "acqrel", "seqcst"];

export interface LitmusProps {
  test?: "sb" | "mp" | "lb";
  model?: Model;
  /** Which tests to offer. */
  tests?: ("sb" | "mp" | "lb")[];
  /** Hide the model switch. */
  lockModel?: boolean;
}

export interface LitmusWidgetState {
  test: string;
  model: Model;
  /** Outcomes the model allows, like "0,0". */
  possible: string[];
  surprisingPossible: boolean;
  /** Any op set to something stronger than relaxed, or a fence added. */
  ordered: boolean;
}

type OrderMap = Record<string, Order>;
type FenceMap = Record<string, boolean>;

function build(test: LitmusTest, orders: OrderMap, fences: FenceMap): LitmusTest {
  return {
    ...test,
    threads: test.threads.map((th, ti) => {
      const ops: Op[] = [];
      th.forEach((op, oi) => {
        ops.push({ ...op, order: orders[`${ti}.${oi}`] ?? "relaxed" });
        if (oi < th.length - 1 && fences[`${ti}.${oi}`]) ops.push({ kind: "fence", order: "seqcst" });
      });
      return ops;
    }),
  };
}

function opText(op: Op): string {
  if (op.kind === "store") return `${op.addr} = ${op.val}`;
  return `${op.reg} = ${op.addr}`;
}

function orderLabel(op: Op, o: Order): string {
  if (o === "relaxed") return "relaxed";
  if (o === "acqrel") return op.kind === "store" ? "release" : "acquire";
  return "seq_cst";
}

export function Litmus({ props, onChange, revealed }: WidgetProps<LitmusProps>) {
  const tests = (props.tests ?? ["sb", "mp", "lb"]).map((id) => LITMUS.find((t) => t.id === id)!);
  const [testId, setTestId] = useState(props.test ?? tests[0].id);
  const [model, setModel] = useState<Model>(props.model ?? "tso");
  const [orders, setOrders] = useState<OrderMap>({});
  const [fences, setFences] = useState<FenceMap>({});
  const [pick, setPick] = useState<string | null>(null);
  const locked = Boolean(revealed);
  const base = LITMUS.find((t) => t.id === testId)!;
  const test = build(base, orders, fences);
  const outs = outcomes(test, model);
  const possible = outs.map((o) => o.key);
  const surprisingKey = base.surprising.join(",");
  const ordered = Object.values(orders).some((o) => o !== "relaxed") || Object.values(fences).some(Boolean);

  const emit = (t: string, m: Model, o: OrderMap, f: FenceMap) => {
    const b = LITMUS.find((x) => x.id === t)!;
    const keys = outcomes(build(b, o, f), m).map((x) => x.key);
    onChange?.({
      test: t,
      model: m,
      possible: keys,
      surprisingPossible: keys.includes(b.surprising.join(",")),
      ordered: Object.values(o).some((x) => x !== "relaxed") || Object.values(f).some(Boolean),
    } satisfies LitmusWidgetState);
  };
  const upd = (t: string, m: Model, o: OrderMap, f: FenceMap) => {
    setTestId(t);
    setModel(m);
    setOrders(o);
    setFences(f);
    setPick(null);
    emit(t, m, o, f);
  };
  const cycle = (key: string) => {
    const cur = orders[key] ?? "relaxed";
    const next = ORDER_CYCLE[(ORDER_CYCLE.indexOf(cur) + 1) % ORDER_CYCLE.length];
    upd(testId, model, { ...orders, [key]: next }, fences);
  };
  const toggleFence = (key: string) => upd(testId, model, orders, { ...fences, [key]: !fences[key] });

  const combos = [
    [0, 0],
    [0, 1],
    [1, 0],
    [1, 1],
  ];
  const picked = pick ? outs.find((o) => o.key === pick) : null;

  return (
    <div className="w-full">
      <div className="flex flex-wrap items-center justify-center gap-2">
        {tests.length > 1 && <Seg label="Test" value={testId} onChange={(t) => upd(t, model, {}, {})} disabled={locked} options={tests.map((t) => ({ value: t.id, label: t.title }))} />}
        {!props.lockModel && <Seg label="Machine model" value={model} onChange={(m) => upd(testId, m, orders, fences)} disabled={locked} options={MODELS} />}
      </div>
      <p className="mt-2 text-center text-[0.85rem] text-ink-2">{base.note}</p>
      <p className="mt-0.5 text-center text-xs text-ink-3">Everything starts at 0. Tap an operation to cycle its ordering; tap the gap to add a full fence.</p>

      <div className="mt-3 grid grid-cols-2 gap-2">
        {test.threads.map((_, ti) => (
          <div key={ti} className="rounded-xl border border-line bg-surface-2 p-2">
            <Caption className="mb-1.5">Thread {ti + 1}</Caption>
            <div className="space-y-1">
              {base.threads[ti].map((op, oi) => {
                const key = `${ti}.${oi}`;
                const o = orders[key] ?? "relaxed";
                return (
                  <React.Fragment key={key}>
                    <button
                      type="button"
                      disabled={locked}
                      onClick={() => cycle(key)}
                      aria-label={`${op.kind === "store" ? "Store" : "Load"} ${opText(op)}, ordering ${orderLabel(op, o)}. Tap to change.`}
                      className={`flex min-h-11 w-full flex-col items-start justify-center rounded-lg border px-2 py-1 text-left transition-colors ${o === "relaxed" ? "border-line bg-surface text-ink hover:border-[var(--line-strong)]" : "border-[var(--brand)] bg-tint text-ink"}`}
                    >
                      <span className="font-mono text-[0.85rem] font-semibold">{opText(op)}</span>
                      <span className="text-[11px] text-ink-3">{op.kind} · {orderLabel(op, o)}</span>
                    </button>
                    {oi < base.threads[ti].length - 1 && (
                      <button
                        type="button"
                        disabled={locked}
                        onClick={() => toggleFence(key)}
                        aria-pressed={Boolean(fences[key])}
                        aria-label={`Fence between the two operations of thread ${ti + 1}`}
                        className={`flex min-h-10 w-full items-center justify-center rounded-lg border text-[11px] font-medium transition-colors ${fences[key] ? "border-transparent bg-primary text-primary-ink" : "border-dashed border-[var(--line-strong)] text-ink-3 hover:text-ink"}`}
                      >
                        {fences[key] ? "full fence" : "+ fence"}
                      </button>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3">
        <Caption className="mb-1.5">
          Possible results ({base.regs.join(", ")}) · tap one to see an order that produces it
        </Caption>
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
          {combos.map((c) => {
            const key = c.join(",");
            const ok = possible.includes(key);
            const surprising = key === surprisingKey;
            return (
              <button
                key={key}
                type="button"
                disabled={locked || !ok}
                onClick={() => setPick(pick === key ? null : key)}
                aria-label={`${base.regs[0]} = ${c[0]}, ${base.regs[1]} = ${c[1]}: ${ok ? "possible" : "impossible"}${surprising ? " (the surprising one)" : ""}`}
                aria-pressed={pick === key}
                className={`flex min-h-12 flex-col items-center justify-center rounded-lg border px-1 py-1 font-mono text-sm transition-colors ${
                  !ok ? "border-dashed border-[var(--line-strong)] text-ink-3 line-through decoration-1" : pick === key ? "border-transparent bg-primary text-primary-ink" : surprising ? "border-[var(--bad)]/70 bg-surface text-ink" : "border-line bg-surface text-ink hover:border-[var(--line-strong)]"
                }`}
              >
                <span className="font-semibold">
                  {base.regs[0]}={c[0]} {base.regs[1]}={c[1]}
                </span>
                <span className="font-sans text-[11px]">{ok ? (surprising ? "possible: surprising" : "possible") : "impossible"}</span>
              </button>
            );
          })}
        </div>
      </div>

      {picked && (
        <ol className="mt-3 space-y-1 rounded-xl border border-line bg-surface p-2.5 text-[0.85rem] text-ink-2">
          {picked.witness.map(([t, oi], i) => {
            const op = test.threads[t][oi];
            return (
              <li key={i} className="flex gap-2">
                <span className="w-4 shrink-0 text-right font-mono text-ink-3">{i + 1}.</span>
                <span>
                  Thread {t + 1}: <span className="font-mono text-ink">{op.kind === "fence" ? "fence" : opText(op)}</span>
                </span>
              </li>
            );
          })}
        </ol>
      )}

      <div className="mt-3">
        <Note tone={possible.includes(surprisingKey) ? "accent" : "plain"}>
          {possible.includes(surprisingKey) ? (
            <>
              <b>
                {base.regs[0]}={base.surprising[0]}, {base.regs[1]}={base.surprising[1]}
              </b>{" "}
              can happen on this machine model{ordered ? ", even with the ordering you chose" : ""}. No interleaving of the source lines explains it: the hardware reordered something.
            </>
          ) : (
            <>
              The surprising result{" "}
              <b>
                {base.regs[0]}={base.surprising[0]}, {base.regs[1]}={base.surprising[1]}
              </b>{" "}
              is impossible here{ordered ? ": your ordering rules close the door" : ": this machine model does not reorder these operations"}.
            </>
          )}
        </Note>
      </div>
      <div className="mt-2 flex justify-center">
        <Btn onClick={() => upd(testId, model, {}, {})} disabled={locked || (!ordered && Object.keys(orders).length === 0)}>
          <RotateCcw className="h-4 w-4" /> Clear orderings
        </Btn>
      </div>
      <p className="mt-2 text-center text-[11px] text-ink-3">Toy model of the textbook cases: single shared memory, per-thread reordering only where the model allows. Real chips and compilers have more rules.</p>
    </div>
  );
}

/** goal: { test, model, surprisingPossible } */
export function checkLitmus(state: unknown, goal: Record<string, unknown>) {
  const s = state as LitmusWidgetState | undefined;
  if (!s) return false;
  if (typeof goal.test === "string" && s.test !== goal.test) return false;
  if (typeof goal.model === "string" && s.model !== goal.model) return false;
  if (typeof goal.surprisingPossible === "boolean" && s.surprisingPossible !== goal.surprisingPossible) return false;
  if (typeof goal.ordered === "boolean" && s.ordered !== goal.ordered) return false;
  return true;
}

// ───────────────────────────── memsys-race: counter++ from two threads ─────────────────────────────

export interface RaceProps {
  mode?: "plain" | "lock" | "atomic";
  /** Lock the mode switch. */
  lockMode?: boolean;
}

export interface RaceState {
  mode: string;
  counter: number;
  done: boolean;
  lostUpdate: boolean;
  steps: number;
}

interface ThreadState {
  pc: number;
  tmp: number | null;
}

const PLAIN = ["tmp = counter", "tmp = tmp + 1", "counter = tmp"];
const LOCKED = ["lock(m)", "tmp = counter", "tmp = tmp + 1", "counter = tmp", "unlock(m)"];
const ATOMIC = ["fetch_add(counter, 1)"];

export function Race({ props, onChange, revealed }: WidgetProps<RaceProps>) {
  const [mode, setMode] = useState<"plain" | "lock" | "atomic">(props.mode ?? "plain");
  const [counter, setCounter] = useState(0);
  const [th, setTh] = useState<ThreadState[]>([
    { pc: 0, tmp: null },
    { pc: 0, tmp: null },
  ]);
  const [holder, setHolder] = useState<number | null>(null);
  const [steps, setSteps] = useState(0);
  const locked = Boolean(revealed);
  const prog = mode === "plain" ? PLAIN : mode === "lock" ? LOCKED : ATOMIC;
  const done = th.every((t) => t.pc >= prog.length);

  const emit = (c: number, t: ThreadState[], m: string, s: number) => {
    const d = t.every((x) => x.pc >= (m === "plain" ? 3 : m === "lock" ? 5 : 1));
    onChange?.({ mode: m, counter: c, done: d, lostUpdate: d && c < 2, steps: s } satisfies RaceState);
  };
  const reset = (m: "plain" | "lock" | "atomic" = mode) => {
    setMode(m);
    setCounter(0);
    setTh([
      { pc: 0, tmp: null },
      { pc: 0, tmp: null },
    ]);
    setHolder(null);
    setSteps(0);
    emit(0, [{ pc: 0, tmp: null }, { pc: 0, tmp: null }], m, 0);
  };

  const blocked = (i: number) => mode === "lock" && th[i].pc === 0 && holder !== null && holder !== i;
  const step = (i: number) => {
    if (locked || th[i].pc >= prog.length || blocked(i)) return;
    const t = th.map((x) => ({ ...x }));
    let c = counter;
    let h = holder;
    const instr = prog[t[i].pc];
    if (instr.startsWith("lock")) h = i;
    else if (instr.startsWith("unlock")) h = null;
    else if (instr === "tmp = counter") t[i].tmp = c;
    else if (instr === "tmp = tmp + 1") t[i].tmp = (t[i].tmp ?? 0) + 1;
    else if (instr === "counter = tmp") c = t[i].tmp ?? c;
    else if (instr.startsWith("fetch_add")) c = c + 1;
    t[i].pc++;
    setTh(t);
    setCounter(c);
    setHolder(h);
    setSteps(steps + 1);
    emit(c, t, mode, steps + 1);
  };

  return (
    <div className="w-full">
      {!props.lockMode && (
        <div className="flex justify-center">
          <Seg
            label="How the increment is protected"
            value={mode}
            onChange={(m) => reset(m)}
            disabled={locked}
            options={[
              { value: "plain", label: "Plain" },
              { value: "lock", label: "With a lock" },
              { value: "atomic", label: "Atomic add" },
            ]}
          />
        </div>
      )}
      <p className="mt-2 text-center text-xs text-ink-3">
        Both threads run <code className="font-mono">counter++</code>. You decide whose next instruction runs.
      </p>
      <div className="mt-3 grid grid-cols-1 gap-2 min-[420px]:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className="rounded-xl border border-line bg-surface-2 p-2">
            <Caption className="mb-1.5">Thread {i + 1}</Caption>
            <ol className="space-y-1">
              {prog.map((ins, k) => (
                <li
                  key={k}
                  className={`rounded-md border px-1.5 py-1 font-mono text-[0.78rem] leading-tight ${
                    th[i].pc === k ? "border-[var(--brand)] bg-tint font-semibold text-ink" : k < th[i].pc ? "border-transparent text-ink-3 line-through decoration-1" : "border-line bg-surface text-ink-2"
                  }`}
                  aria-current={th[i].pc === k ? "step" : undefined}
                >
                  {ins}
                </li>
              ))}
            </ol>
            <p className="mt-1.5 font-mono text-xs text-ink-2">tmp = {th[i].tmp === null ? "–" : th[i].tmp}</p>
            <Btn className="mt-1.5 w-full" onClick={() => step(i)} disabled={locked || th[i].pc >= prog.length || blocked(i)} primary={!blocked(i)}>
              {th[i].pc >= prog.length ? "Finished" : blocked(i) ? "Waiting for lock" : "Run next"}
            </Btn>
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        <span className="inline-flex items-baseline gap-2 rounded-full border border-[var(--brand)]/50 bg-tint px-3 py-1 text-sm">
          <span className="text-xs text-ink-3">counter in memory</span>
          <span className="font-mono font-semibold tabular-nums text-ink">{counter}</span>
        </span>
        {mode === "lock" && (
          <span className="inline-flex items-baseline gap-2 rounded-full border border-line bg-surface px-3 py-1 text-sm">
            <span className="text-xs text-ink-3">lock held by</span>
            <span className="font-mono font-semibold text-ink">{holder === null ? "nobody" : `thread ${holder + 1}`}</span>
          </span>
        )}
        <Btn onClick={() => reset()} disabled={steps === 0}>
          <RotateCcw className="h-4 w-4" /> Reset
        </Btn>
      </div>
      <div className="mt-3">
        <Note tone={done ? "accent" : "plain"}>
          {done
            ? counter === 2
              ? "Both increments counted: the counter is 2."
              : "Both threads finished, but the counter is 1. One update was lost: thread 2 stored a result based on a value that was already out of date."
            : mode === "plain"
              ? "Try running thread 1 one step, then thread 2 two steps, and so on, to find an unlucky interleaving."
              : mode === "lock"
                ? "While one thread holds the lock, the other has to wait before it may start."
                : "A single atomic instruction reads, adds and writes as one indivisible step."}
        </Note>
      </div>
    </div>
  );
}

/** goal: { lostUpdate: true } | { counter: 2, done: true } */
export function checkRace(state: unknown, goal: Record<string, unknown>) {
  const s = state as RaceState | undefined;
  if (!s) return false;
  if (typeof goal.lostUpdate === "boolean" && s.lostUpdate !== goal.lostUpdate) return false;
  if (typeof goal.counter === "number" && s.counter !== goal.counter) return false;
  if (typeof goal.mode === "string" && s.mode !== goal.mode) return false;
  if (goal.done === true && !s.done) return false;
  return true;
}
