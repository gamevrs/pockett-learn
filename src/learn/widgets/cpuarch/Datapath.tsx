"use client";

import React, { useState } from "react";
import { ChevronRight, RotateCcw } from "lucide-react";
import type { WidgetProps } from "@/learn/widget";
import { Btn, Caption, Note, Readout } from "../computer/ui";
import { dpStart, dpStep, dpText, PHASES, type DpInstr, type DpState } from "./sim";

export interface DatapathProps {
  /** Program, in the toy assembly style of the Assembly lessons. Default: MOV, MOV, ADD, STORE. */
  program?: DpInstr[];
  /** Starting data memory (8 cells). */
  memory?: number[];
}

const DEFAULT: DpInstr[] = [
  { op: "MOV", rd: 0, imm: 5 },
  { op: "MOV", rd: 1, imm: 7 },
  { op: "ADD", rd: 0, rs: 1 },
  { op: "STORE", rs: 0, addr: 3 },
];

type Block = "pc" | "imem" | "ctl" | "regs" | "alu" | "dmem";

/** Which blocks are busy in each phase, for this instruction. */
function active(ins: DpInstr | null, phase: number): Block[] {
  if (phase < 0) return [];
  if (phase === 0) return ["pc", "imem"];
  if (phase === 1) return ins && ins.op !== "MOV" ? ["ctl", "regs"] : ["ctl"];
  if (phase === 2) return ["alu"];
  if (phase === 3) return ins && (ins.op === "LOAD" || ins.op === "STORE") ? ["dmem"] : [];
  return ins && ins.op !== "STORE" ? ["regs", "pc"] : ["pc"];
}

function caption(ins: DpInstr | null, phase: number, s: DpState): string {
  if (phase < 0 || !ins) return "Press Next step. The CPU starts by fetching the instruction the program counter points at.";
  const t = dpText(ins);
  switch (phase) {
    case 0:
      return `Fetch: the program counter says ${s.pc}, so the CPU reads instruction ${s.pc} from memory into the instruction register: ${t}.`;
    case 1:
      return ins.op === "MOV"
        ? `Decode: the control unit reads "${t}" and works out what to switch on: the number is built into the instruction, no register needs reading.`
        : `Decode: the control unit works out what "${t}" means and tells the register file which registers to read.`;
    case 2:
      return ins.op === "LOAD" || ins.op === "STORE"
        ? `Execute: the ALU works out the memory address: ${ins.addr}.`
        : ins.op === "MOV"
          ? `Execute: the ALU passes the number ${ins.imm} through unchanged.`
          : `Execute: the ALU ${ins.op === "ADD" ? "adds" : "subtracts"} the two register values and gets ${s.alu}.`;
    case 3:
      return ins.op === "LOAD"
        ? `Memory: the CPU reads address ${ins.addr} from data memory and gets ${s.loaded}.`
        : ins.op === "STORE"
          ? `Memory: the CPU writes ${s.regs[ins.rs]} into data memory at address ${ins.addr}.`
          : "Memory: this instruction does not touch data memory, so this step does nothing.";
    default:
      return ins.op === "STORE"
        ? "Write back: nothing to put in a register. The program counter moves on to the next instruction."
        : `Write back: the result goes into R${ins.rd}, and the program counter moves on to the next instruction.`;
  }
}

/** One instruction at a time through fetch, decode, execute, memory and write-back, with the blocks that are busy lit up. */
export function Datapath({ props, onChange }: WidgetProps<DatapathProps>) {
  const program = props.program ?? DEFAULT;
  const mem0 = props.memory ?? [0, 0, 0, 0, 0, 0, 0, 0];
  const [s, setS] = useState<DpState>(() => dpStart(mem0));

  const emit = (n: DpState) => {
    onChange?.({ pc: n.pc, regs: n.regs, mem: n.mem, retired: n.retired, phase: n.phase, halted: n.halted, r0: n.regs[0], r1: n.regs[1], r2: n.regs[2], r3: n.regs[3] });
  };
  const next = () => {
    const n = dpStep(s, program);
    setS(n);
    emit(n);
  };
  const finishOne = () => {
    // run until the current instruction retires
    let n = s;
    const start = s.retired;
    let guard = 0;
    while (!n.halted && n.retired === start && guard++ < 10) n = dpStep(n, program);
    setS(n);
    emit(n);
  };
  const reset = () => {
    const n = dpStart(mem0);
    setS(n);
    emit(n);
  };

  const act = active(s.ir, s.phase);
  const box = (id: Block, title: string, body: React.ReactNode) => {
    const on = act.includes(id);
    return (
      <div className={`rounded-xl border p-2 transition-colors ${on ? "border-[var(--brand)] bg-tint" : "border-line bg-surface"}`}>
        <Caption>{title}</Caption>
        <div className="mt-1 font-mono text-[0.82rem] leading-snug text-ink">{body}</div>
      </div>
    );
  };

  const cur = s.ir ? dpText(s.ir) : s.halted ? "(done)" : "-";
  return (
    <div className="w-full">
      <ol className="mb-3 space-y-1" aria-label="Program">
        {program.map((p, i) => (
          <li
            key={i}
            className={`flex items-center gap-2 rounded-lg border px-2.5 py-1 font-mono text-sm ${i === s.pc && !s.halted ? "border-[var(--brand)] bg-tint text-ink" : i < s.pc ? "border-line bg-surface-2 text-ink-3" : "border-line bg-surface text-ink-2"}`}
          >
            <span className="w-4 text-xs text-ink-3">{i}</span>
            <span>{dpText(p)}</span>
            {i === s.pc && !s.halted && <span className="ml-auto text-[11px] text-ink-3">← PC</span>}
          </li>
        ))}
      </ol>

      <div className="mb-3 flex flex-wrap items-center justify-center gap-1" role="list" aria-label="Stages">
        {PHASES.map((p, i) => (
          <span
            role="listitem"
            key={p}
            aria-current={i === s.phase ? "step" : undefined}
            className={`rounded-full border px-2.5 py-1 text-xs font-medium ${i === s.phase ? "border-transparent bg-primary text-primary-ink" : "border-line bg-surface text-ink-3"}`}
          >
            {p}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {box("pc", "Program counter", <>PC = {s.pc}</>)}
        {box("imem", "Instruction memory", <>IR = {cur}</>)}
        {box("ctl", "Control unit", <>{s.ir ? s.ir.op : "waiting"}</>)}
        {box(
          "regs",
          "Registers",
          <div className="grid grid-cols-2 gap-x-2">
            {s.regs.map((v, i) => (
              <span key={i}>
                R{i}={v}
              </span>
            ))}
          </div>,
        )}
        {box("alu", "ALU", <>{s.alu === null ? "idle" : `out = ${s.alu}`}</>)}
        {box(
          "dmem",
          "Data memory",
          <div className="grid grid-cols-4 gap-x-1.5">
            {s.mem.map((v, i) => (
              <span key={i} className={s.ir && (s.ir.op === "STORE" || s.ir.op === "LOAD") && s.ir.addr === i ? "font-semibold text-[var(--brand)]" : ""}>
                [{i}]={v}
              </span>
            ))}
          </div>,
        )}
      </div>

      <div className="mt-3">
        <Note tone={s.phase >= 0 ? "accent" : "plain"}>{s.halted ? "The program counter ran off the end of the program, so the CPU stops here." : caption(s.ir, s.phase, s)}</Note>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        <Readout label="Done" value={`${s.retired} of ${program.length}`} />
        <Btn primary onClick={next} disabled={s.halted}>
          Next step <ChevronRight className="h-4 w-4" />
        </Btn>
        <Btn onClick={finishOne} disabled={s.halted}>
          Finish instruction
        </Btn>
        <Btn onClick={reset} disabled={s.retired === 0 && s.phase < 0}>
          <RotateCcw className="h-4 w-4" /> Reset
        </Btn>
      </div>
    </div>
  );
}

/** goal: { retired } (instructions finished), or any of { r0, r1, r2, r3 } (register values), { mem: {3: 12} }. */
export function checkDatapath(state: unknown, goal: Record<string, unknown>) {
  const s = state as { retired: number; regs: number[]; mem: number[]; phase: number; halted: boolean } | undefined;
  if (!s) return false;
  if (typeof goal.retired === "number" && s.retired < goal.retired) return false;
  if (typeof goal.phase === "number" && s.phase !== goal.phase) return false;
  for (let i = 0; i < 4; i++) {
    const w = goal[`r${i}`];
    if (typeof w === "number" && s.regs[i] !== w) return false;
  }
  if (goal.mem && typeof goal.mem === "object") {
    for (const [k, v] of Object.entries(goal.mem as Record<string, number>)) if (s.mem[Number(k)] !== v) return false;
  }
  return true;
}
