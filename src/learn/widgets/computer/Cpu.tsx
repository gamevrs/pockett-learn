"use client";

import React, { useEffect, useReducer, useRef } from "react";
import { Lock, Pause, Play, RotateCcw, StepForward } from "lucide-react";
import type { WidgetProps } from "@/learn/widget";
import { Btn, Caption, hex, Note, Seg, Stepper } from "./ui";

/**
 * A toy CPU with 16 bytes of memory. Each instruction is one byte: the high 4 bits say what to do
 * (the opcode), the low 4 bits say which address to use. One register, A (the accumulator).
 */
export const OPS = ["HALT", "LOAD", "ADD", "SUB", "STORE", "JUMP", "JZ", "OUT"] as const;
export type OpName = (typeof OPS)[number];
const TAKES_ADDR: OpName[] = ["LOAD", "ADD", "SUB", "STORE", "JUMP", "JZ"];

/** "LOAD 14" → 0x1E. */
export function encode(src: string): number {
  const [name, arg] = src.trim().toUpperCase().split(/\s+/);
  const op = OPS.indexOf(name as OpName);
  if (op < 0) throw new Error(`Unknown instruction ${src}`);
  return (op << 4) | (Number(arg ?? 0) & 15);
}

export function decode(byte: number): { op: OpName | null; arg: number; text: string } {
  const code = byte >> 4;
  const arg = byte & 15;
  const op = code < OPS.length ? OPS[code] : null;
  if (!op) return { op: null, arg, text: "?" };
  return { op, arg, text: TAKES_ADDR.includes(op) ? `${op} ${arg}` : op };
}

const describe = (op: OpName, arg: number) =>
  ({
    HALT: "stop the CPU",
    LOAD: `copy the value at address ${arg} into A`,
    ADD: `add the value at address ${arg} to A`,
    SUB: `subtract the value at address ${arg} from A`,
    STORE: `copy A into address ${arg}`,
    JUMP: `set PC to ${arg}, so the next instruction comes from there`,
    JZ: `if A is 0, set PC to ${arg}; otherwise carry on`,
    OUT: "send the value in A to the output",
  })[op];

export interface CpuProps {
  /** Up to 16 cells: instruction text ("LOAD 14", "OUT", "HALT") or a number (data). */
  program: (string | number)[];
  /** Names for data addresses, e.g. { "14": "x" }. */
  names?: Record<string, string>;
  /** "phase": Step does one of fetch/decode/execute. "instruction": Step does all three. Default "phase". */
  granularity?: "phase" | "instruction";
  /** Show Run/Pause with a clock speed picker and a tick counter. */
  clock?: boolean;
  /** Predict mode: controls stay locked until the step's question is answered. */
  predict?: boolean;
  /** Data addresses the learner may change before running (tap the box, then − +). */
  editable?: number[];
  /** Stop a runaway program after this many ticks. Default 400. */
  maxTicks?: number;
}

type Phase = "ready" | "fetched" | "decoded" | "executed";

interface Machine {
  base: number[];
  initCode: boolean[];
  mem: number[];
  code: boolean[];
  pc: number;
  ir: number | null;
  a: number;
  phase: Phase;
  halted: boolean;
  crashed: boolean;
  out: number[];
  ticks: number;
  count: number;
  note: string;
  touch: { cell: number; kind: "fetch" | "read" | "write" } | null;
  running: boolean;
  hz: number;
  editing: number | null;
  version: number;
}

export interface CpuState {
  pc: number;
  a: number;
  ir: number | null;
  phase: Phase;
  halted: boolean;
  crashed: boolean;
  out: number[];
  mem: number[];
  ticks: number;
  count: number;
}

function initMachine(props: CpuProps): Machine {
  const mem = Array.from({ length: 16 }, () => 0);
  const code = Array.from({ length: 16 }, () => false);
  props.program.slice(0, 16).forEach((c, i) => {
    if (typeof c === "number") mem[i] = c & 255;
    else {
      mem[i] = encode(c);
      code[i] = true;
    }
  });
  return fresh(mem, code, 2, 0);
}

function fresh(base: number[], code: boolean[], hz: number, version: number): Machine {
  return {
    base,
    initCode: code,
    mem: base.slice(),
    code: code.slice(),
    pc: 0,
    ir: null,
    a: 0,
    phase: "ready",
    halted: false,
    crashed: false,
    out: [],
    ticks: 0,
    count: 0,
    note: "PC is 0, so the first instruction will come from address 0. Press Step.",
    touch: null,
    running: false,
    hz,
    editing: null,
    version,
  };
}

function phaseStep(m: Machine, maxTicks: number): Machine {
  if (m.halted) return { ...m, running: false };
  if (m.ticks >= maxTicks) return { ...m, running: false, halted: true, note: `Stopped after ${maxTicks} ticks: this program never reaches HALT.` };
  const t = m.ticks + 1;
  if (m.phase === "ready" || m.phase === "executed") {
    const ir = m.mem[m.pc];
    const pc = (m.pc + 1) & 15;
    return { ...m, ir, pc, phase: "fetched", ticks: t, touch: { cell: m.pc, kind: "fetch" }, note: `Fetch: copy the byte at address ${m.pc} (0x${hex(ir)}) into the instruction register. PC moves on to ${pc}.` };
  }
  const d = decode(m.ir ?? 0);
  if (m.phase === "fetched") {
    if (!d.op) return { ...m, phase: "decoded", ticks: t, touch: null, note: `Decode: 0x${hex(m.ir ?? 0)} isn't an instruction this CPU knows. It's data, but the CPU can't tell.` };
    const parts = TAKES_ADDR.includes(d.op) ? `opcode ${(m.ir ?? 0) >> 4} = ${d.op}, address ${hex(d.arg, 1)} = ${d.arg}` : `opcode ${(m.ir ?? 0) >> 4} = ${d.op}`;
    return { ...m, phase: "decoded", ticks: t, touch: null, note: `Decode: 0x${hex(m.ir ?? 0)} splits into ${parts}. Meaning: ${describe(d.op, d.arg)}.` };
  }
  // execute
  const base = { ...m, phase: "executed" as Phase, ticks: t, count: m.count + 1, touch: null as Machine["touch"] };
  const v = m.mem[d.arg];
  switch (d.op) {
    case null:
      return { ...base, halted: true, crashed: true, running: false, note: "Execute: the CPU has no idea what to do with that byte, so it stops with an error. Programs crash like this when the PC wanders into data." };
    case "HALT":
      return { ...base, halted: true, running: false, note: "Execute: HALT. The CPU stops. Program finished." };
    case "LOAD":
      return { ...base, a: v, touch: { cell: d.arg, kind: "read" }, note: `Execute: read address ${d.arg} (it holds ${v}) into A. A = ${v}.` };
    case "ADD": {
      const a = (m.a + v) & 255;
      return { ...base, a, touch: { cell: d.arg, kind: "read" }, note: `Execute: A + (value at ${d.arg}) = ${m.a} + ${v} = ${a}${m.a + v > 255 ? " (wrapped round past 255)" : ""}. A = ${a}.` };
    }
    case "SUB": {
      const a = (m.a - v + 256) & 255;
      return { ...base, a, touch: { cell: d.arg, kind: "read" }, note: `Execute: A − (value at ${d.arg}) = ${m.a} − ${v} = ${a}${m.a - v < 0 ? " (wrapped round below 0)" : ""}. A = ${a}.` };
    }
    case "STORE": {
      const mem = m.mem.slice();
      mem[d.arg] = m.a;
      const code = m.code.slice();
      code[d.arg] = false;
      return { ...base, mem, code, touch: { cell: d.arg, kind: "write" }, note: `Execute: write A (${m.a}) into address ${d.arg}.` };
    }
    case "JUMP":
      return { ...base, pc: d.arg, note: `Execute: PC = ${d.arg}. The next fetch comes from address ${d.arg}.` };
    case "JZ":
      return m.a === 0
        ? { ...base, pc: d.arg, note: `Execute: A is 0, so jump: PC = ${d.arg}.` }
        : { ...base, note: `Execute: A is ${m.a}, not 0, so no jump. PC stays at ${m.pc}.` };
    case "OUT":
      return { ...base, out: [...m.out, m.a], note: `Execute: send A (${m.a}) to the output.` };
  }
}

type Action =
  | { type: "step"; whole: boolean; maxTicks: number }
  | { type: "tick"; whole: boolean; maxTicks: number }
  | { type: "reset" }
  | { type: "run"; on: boolean }
  | { type: "hz"; hz: number }
  | { type: "edit"; cell: number | null }
  | { type: "set"; cell: number; value: number };

function reducer(m: Machine, act: Action): Machine {
  switch (act.type) {
    case "step":
    case "tick": {
      if (act.type === "tick" && !m.running) return m;
      let n = phaseStep(m, act.maxTicks);
      if (act.whole) while (n.phase !== "executed" && !n.halted) n = phaseStep(n, act.maxTicks);
      return { ...n, editing: null, version: m.version + 1, running: act.type === "tick" ? n.running && !n.halted : n.running };
    }
    case "reset":
      return { ...fresh(m.base, m.initCode, m.hz, m.version + 1), note: "Reset: memory reloaded, PC back to 0." };
    case "run":
      if (act.on && m.halted) {
        return { ...fresh(m.base, m.initCode, m.hz, m.version + 1), running: true };
      }
      return { ...m, running: act.on, editing: null };
    case "hz":
      return { ...m, hz: act.hz };
    case "edit":
      return { ...m, editing: act.cell };
    case "set": {
      const base = m.base.slice();
      base[act.cell] = act.value;
      return { ...m, base, mem: base.slice(), version: m.version + 1 };
    }
  }
}

const report = (m: Machine): CpuState => ({ pc: m.pc, a: m.a, ir: m.ir, phase: m.phase, halted: m.halted, crashed: m.crashed, out: m.out, mem: m.mem, ticks: m.ticks, count: m.count });

/** Step a toy CPU through fetch → decode → execute and watch PC, the instruction register and A. */
export function Cpu({ props, onChange, revealed }: WidgetProps<CpuProps>) {
  const [m, dispatch] = useReducer(reducer, props, initMachine);
  const cb = useRef(onChange);
  useEffect(() => {
    cb.current = onChange;
  });
  const reported = useRef(0);
  useEffect(() => {
    if (m.version === reported.current) return;
    reported.current = m.version;
    cb.current?.(report(m));
  }, [m]);

  const whole = props.granularity === "instruction";
  const maxTicks = props.maxTicks ?? 400;
  useEffect(() => {
    if (!m.running) return;
    const id = setInterval(() => dispatch({ type: "tick", whole: false, maxTicks }), 1000 / m.hz);
    return () => clearInterval(id);
  }, [m.running, m.hz, maxTicks]);

  const locked = Boolean(props.predict && !revealed);
  const editable = props.editable ?? [];
  const canEdit = m.ticks === 0 && !locked;
  const d = m.ir === null ? null : decode(m.ir);
  const phases: { id: Phase; label: string }[] = [
    { id: "fetched", label: "Fetch" },
    { id: "decoded", label: "Decode" },
    { id: "executed", label: "Execute" },
  ];

  return (
    <div className="w-full">
      <div className="mb-1.5 flex items-center justify-between">
        <Caption>Memory · 16 bytes</Caption>
        {editable.length > 0 && <span className="text-[11px] text-ink-3">{canEdit ? "Tap a dashed box to change it" : "Reset to change numbers"}</span>}
      </div>
      <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-8">
        {m.mem.map((v, i) => {
          const isCode = m.code[i];
          const atPc = i === m.pc && !m.halted;
          const touch = m.touch?.cell === i ? m.touch.kind : null;
          const canTap = canEdit && editable.includes(i);
          const name = props.names?.[String(i)];
          const editingThis = m.editing === i;
          return (
            <button
              key={i}
              type="button"
              disabled={!canTap}
              onClick={() => dispatch({ type: "edit", cell: editingThis ? null : i })}
              aria-label={`Address ${i}: ${isCode ? decode(v).text : v}${atPc ? ", PC points here" : ""}`}
              className={`relative flex min-h-[3.5rem] flex-col overflow-hidden rounded-lg border text-center transition-colors disabled:cursor-default ${
                touch === "fetch"
                  ? "border-transparent bg-primary text-primary-ink"
                  : touch
                    ? "border-[var(--brand)] bg-tint shadow-[0_0_0_3px_var(--brand-soft)]"
                    : editingThis
                      ? "border-[var(--brand)] bg-tint"
                      : canTap
                        ? "border-dashed border-[var(--brand)] bg-surface hover:bg-tint"
                        : isCode
                          ? "border-line bg-surface-2"
                          : "border-line bg-surface"
              }`}
            >
              <span className={`flex items-center justify-between px-1.5 pt-0.5 font-mono text-[10px] tabular-nums ${touch === "fetch" ? "text-primary-ink/70" : "text-ink-3"}`}>
                <span>{i}</span>
                {atPc && <span className={`rounded px-1 text-[9px] font-semibold ${touch === "fetch" ? "bg-[var(--primary-ink)] text-[var(--primary)]" : "bg-primary text-primary-ink"}`}>PC</span>}
                {touch === "read" && <span className="text-[9px] font-semibold text-brand">read</span>}
                {touch === "write" && <span className="text-[9px] font-semibold text-brand">write</span>}
              </span>
              <span className={`grid flex-1 place-items-center px-0.5 font-mono font-semibold leading-tight ${isCode ? "text-[0.74rem] sm:text-[0.78rem]" : "text-[1rem]"}`}>
                {isCode ? decode(v).text : v}
              </span>
              <span className={`pb-0.5 font-mono text-[9.5px] ${touch === "fetch" ? "text-primary-ink/70" : "text-ink-3"}`}>{isCode ? `0x${hex(v)}` : name ?? " "}</span>
            </button>
          );
        })}
      </div>

      {m.editing !== null && (
        <div className="mt-2 flex items-center justify-center gap-3 rounded-xl border border-[var(--brand)]/40 bg-tint p-2">
          <span className="text-sm text-ink-2">
            Address <b className="font-mono text-ink">{m.editing}</b>
          </span>
          <Stepper label={`Value at address ${m.editing}`} value={m.base[m.editing]} min={0} max={99} onChange={(v) => dispatch({ type: "set", cell: m.editing!, value: v })} />
        </div>
      )}

      <div className="mt-3 rounded-2xl border border-line bg-surface-2 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Caption>CPU</Caption>
          <div className="flex gap-1" aria-label="Cycle stage">
            {phases.map((p) => {
              const on = m.phase === p.id && m.ticks > 0;
              return (
                <span key={p.id} className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors ${on ? "bg-primary text-primary-ink" : "border border-line bg-surface text-ink-3"}`}>
                  {p.label}
                </span>
              );
            })}
          </div>
        </div>
        <div className="mt-2.5 grid grid-cols-3 gap-2">
          <Reg name="PC" hint="next address" value={String(m.pc)} />
          <Reg name="IR" hint="instruction" value={m.ir === null ? "–" : `0x${hex(m.ir)}`} sub={m.phase !== "fetched" && d ? d.text : m.ir !== null ? "not decoded" : undefined} />
          <Reg name="A" hint="accumulator" value={String(m.a)} />
        </div>
        <div className="mt-2.5 flex min-h-9 flex-wrap items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 py-1.5">
          <span className="mr-1 text-[11px] text-ink-3">Output</span>
          {m.out.length === 0 ? <span className="text-xs text-ink-3">nothing yet</span> : m.out.map((o, i) => (
            <span key={i} className="rounded-md bg-tint px-2 py-0.5 font-mono text-sm font-semibold text-ink">
              {o}
            </span>
          ))}
          {props.clock && <span className="ml-auto font-mono text-[11px] tabular-nums text-ink-3">ticks {m.ticks}</span>}
        </div>
      </div>

      <div className="mt-3">
        <Note tone={m.ticks > 0 ? "accent" : "plain"}>
          {locked ? (
            <span className="inline-flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5" /> Make your prediction first. Then you can run it.
            </span>
          ) : (
            m.note
          )}
        </Note>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        <Btn onClick={() => dispatch({ type: "reset" })} disabled={locked || m.ticks === 0} label="Reset">
          <RotateCcw className="h-4 w-4" /> Reset
        </Btn>
        <Btn primary={!props.clock} onClick={() => dispatch({ type: "step", whole, maxTicks })} disabled={locked || m.halted || m.running}>
          <StepForward className="h-4 w-4" /> {whole ? "Step instruction" : "Step"}
        </Btn>
        {props.clock && (
          <>
            <Btn primary onClick={() => dispatch({ type: "run", on: !m.running })} disabled={locked}>
              {m.running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />} {m.running ? "Pause" : m.halted ? "Run again" : "Run"}
            </Btn>
            <Seg
              label="Clock speed"
              value={m.hz}
              onChange={(hz) => dispatch({ type: "hz", hz })}
              options={[1, 2, 4, 10].map((h) => ({ value: h, label: `${h} Hz` }))}
            />
          </>
        )}
      </div>
      {props.clock && <ClockStrip ticks={m.ticks} running={m.running} />}
    </div>
  );
}

function Reg({ name, hint, value, sub }: { name: string; hint: string; value: string; sub?: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-line bg-surface px-2 py-1.5 text-center">
      <p className="font-mono text-[11px] font-semibold text-brand">
        {name} <span className="font-sans font-normal text-ink-3">{hint}</span>
      </p>
      <p className="font-mono text-lg font-semibold tabular-nums text-ink">{value}</p>
      <p className="truncate font-mono text-[10.5px] text-ink-2">{sub ?? " "}</p>
    </div>
  );
}

/** A square-wave strip: each tick of the clock is one pulse; the latest is lit. */
function ClockStrip({ ticks, running }: { ticks: number; running: boolean }) {
  const n = 12;
  const at = ticks === 0 ? -1 : (ticks - 1) % n;
  const w = 24;
  return (
    <div className="mt-3 flex items-center justify-center gap-2">
      <span className="text-[11px] text-ink-3">Clock</span>
      <svg viewBox={`0 0 ${n * w} 22`} className="h-6 w-full max-w-[300px]" aria-hidden>
        <path
          d={Array.from({ length: n }, (_, i) => `${i === 0 ? "M" : "L"}${i * w} 19 L${i * w} 3 L${i * w + w / 2} 3 L${i * w + w / 2} 19`).join(" ") + ` L${n * w} 19`}
          className="fill-none stroke-[var(--line-strong)]"
          strokeWidth={2}
        />
        {at >= 0 && <path d={`M${at * w} 19 L${at * w} 3 L${at * w + w / 2} 3 L${at * w + w / 2} 19`} className={`fill-none ${running ? "stroke-[var(--brand)]" : "stroke-[var(--ink-2)]"}`} strokeWidth={3} />}
      </svg>
    </div>
  );
}

/** goal keys (all given must hold): a, pc, phase, halted, crashed, outLast, out (array), mem ({addr: v}), minCount. */
export function checkCpu(state: unknown, goal: Record<string, unknown>) {
  const s = state as CpuState | undefined;
  if (!s) return false;
  if (goal.a !== undefined && s.a !== goal.a) return false;
  if (goal.pc !== undefined && s.pc !== goal.pc) return false;
  if (goal.phase !== undefined && s.phase !== goal.phase) return false;
  if (goal.halted !== undefined && s.halted !== goal.halted) return false;
  if (goal.crashed !== undefined && s.crashed !== goal.crashed) return false;
  if (goal.outLast !== undefined && s.out[s.out.length - 1] !== goal.outLast) return false;
  if (Array.isArray(goal.out) && JSON.stringify(s.out) !== JSON.stringify(goal.out)) return false;
  if (goal.mem && typeof goal.mem === "object") {
    for (const [a, v] of Object.entries(goal.mem as Record<string, number>)) if (s.mem[Number(a)] !== v) return false;
  }
  if (typeof goal.minCount === "number" && s.count < goal.minCount) return false;
  return true;
}
