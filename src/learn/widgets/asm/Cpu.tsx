"use client";

import React, { useState } from "react";
import { BookOpen, ChevronRight, FastForward, Lock, Pencil, RotateCcw, Undo2 } from "lucide-react";
import type { WidgetProps } from "@/learn/widget";
import { CodeBlock } from "@/components/ui/Prose";
import { CODE_SURFACE, Stepper } from "../programs/values";
import { ALL_OPS, assemble, boot, evaluate, instrText, makeConfig, run, step, USAGE } from "./machine";
import type { AsmError, CpuGoal, Machine, MachineConfig, Mnemonic, Program } from "./machine";
import { FlagLight, highlightAsm, num, PanelLabel, RegBox } from "./shared";

export interface CpuProps {
  /** Starting source code. */
  program?: string;
  /** Read-only program: assembled straight away, the learner can only step and run it. */
  locked?: boolean;
  /** Editable, but start already assembled (ready to step). */
  assembled?: boolean;
  /** Instructions available (mnemonics). Default: all. Also drives which panels show. */
  allow?: string[];
  /** Number of registers (default 4). */
  registers?: number;
  /** Starting register values, e.g. { R0: 5 }. */
  regs?: Record<string, number>;
  /** Registers the learner may set before running, e.g. ["R0"]. */
  inputs?: string[];
  /** Memory cells (0 hides memory). Default 16 when memory instructions are available, else 0. */
  memory?: number;
  /** Starting memory, e.g. { "0": 12 }. */
  mem?: Record<string, number>;
  /** Variable names for addresses, e.g. { "0": "x" }. */
  names?: Record<string, string>;
  /** Show each instruction's machine code beside it, or only the machine code. */
  machineCode?: "off" | "beside" | "only";
  /** Show the Z and N flags (default: when compare/jump instructions are available). */
  flags?: boolean;
  /** Show the stack pointer (default: when PUSH/POP/CALL/RET are available). */
  stack?: boolean;
  /** Step limit before the CPU gives up (default 500). */
  maxSteps?: number;
  /** Predict mode: stepping stays locked until the question is answered. */
  predict?: boolean;
  /** Python shown above the assembly, with the line for the current instruction highlighted. */
  python?: string;
  /** For each assembly source line (in order), the Python line it comes from (1-based; 0 = none). */
  pyLines?: number[];
  /** A working program, shown and run when the learner gives up. */
  solution?: string;
  /** Caption above the widget. */
  label?: string;
  /** Show the instruction reference card (default: when the program is editable). */
  reference?: boolean;
}

export interface CpuState {
  source: string;
  assembled: boolean;
  regs: number[];
  mem: number[];
  out: number[];
  pc: number;
  steps: number;
  halted: boolean;
  error: string | null;
  /** Everything needed to re-run the program (check() runs it against the goal). */
  config: MachineConfig;
}

interface Session {
  mode: "edit" | "run";
  source: string;
  errors: AsmError[];
  program: Program | null;
  m: Machine;
  prev: Machine | null;
  startRegs: number[];
}

const TEXT = "font-mono text-base leading-6 sm:text-[0.82rem] sm:leading-[1.375rem]";
const ROW = "h-6 sm:h-[1.375rem]";
/** Read-only listings can be a little smaller on phones (no zoom-on-focus to avoid). */
const LIST_TEXT = "font-mono text-[0.875rem] leading-6 sm:text-[0.82rem] sm:leading-[1.375rem]";

function initSession(source: string, cfg: MachineConfig, start: boolean, autoRun: boolean): Session {
  const base: Session = { mode: "edit", source, errors: [], program: null, m: boot(cfg), prev: null, startRegs: cfg.regs };
  if (!start) return base;
  const r = assemble(source, cfg);
  if (!r.ok) return { ...base, errors: r.errors };
  const m0 = boot(cfg);
  return { ...base, mode: "run", program: r.program, m: autoRun ? run(m0, r.program, cfg) : m0 };
}

/** A toy CPU: edit a short assembly program, assemble it, then step or run it and watch registers, memory and output. */
export function AsmCpu({ props, onChange, status, goal, revealed }: WidgetProps<CpuProps>) {
  const [last, setLast] = useState<CpuState | null>(null);
  const cfg = makeConfig(props);
  const showSolution = status === "revealed" && Boolean(props.solution);
  const report = (st: CpuState) => {
    setLast(st);
    onChange?.(st);
  };
  const verdict = status === "wrong" && goal && last ? evaluate(last.source, last.config, goal as CpuGoal) : null;
  const predictLock = Boolean(props.predict && !revealed);

  return (
    <div className="w-full min-w-0">
      {props.label && <p className="mb-3 text-center text-xs font-medium text-ink-3">{props.label}</p>}
      {showSolution ? (
        <>
          <p className="mb-3 rounded-lg bg-tint px-3 py-2 text-sm text-ink">Here&apos;s one program that works, already run to the end. Press Reset to step through it.</p>
          <CpuView key="solution" props={{ ...props, program: props.solution, locked: true }} cfg={cfg} autoRun />
        </>
      ) : (
        <CpuView key="mine" props={props} cfg={cfg} onReport={report} predictLock={predictLock} />
      )}
      {verdict && !verdict.ok && (
        <p className="mt-3 rounded-lg border border-[var(--bad)] px-3 py-2 text-sm text-ink" role="status">
          <span className="font-semibold text-bad">Not yet. </span>
          {verdict.reason}
        </p>
      )}
    </div>
  );
}

function CpuView({
  props,
  cfg,
  onReport,
  autoRun = false,
  predictLock = false,
}: {
  props: CpuProps;
  cfg: MachineConfig;
  onReport?: (s: CpuState) => void;
  autoRun?: boolean;
  predictLock?: boolean;
}) {
  const starter = props.program ?? "";
  const [s, setS] = useState<Session>(() => initSession(starter, cfg, Boolean(props.locked || props.assembled || autoRun), autoRun));
  const ecfg: MachineConfig = { ...cfg, regs: s.startRegs };
  const editable = !props.locked;
  const mc = props.machineCode ?? "off";
  const ops = (cfg.allow ?? ALL_OPS) as Mnemonic[];
  const showStack = props.stack ?? ops.some((o) => ["PUSH", "POP", "CALL", "RET"].includes(o));
  const showRef = props.reference ?? editable;

  const commit = (next: Session) => {
    setS(next);
    onReport?.({
      source: next.source,
      assembled: next.mode === "run",
      regs: next.m.regs,
      mem: next.m.mem,
      out: next.m.out,
      pc: next.m.pc,
      steps: next.m.steps,
      halted: next.m.halted,
      error: next.m.error,
      config: { ...cfg, regs: next.startRegs },
    });
  };

  const doAssemble = () => {
    const r = assemble(s.source, ecfg);
    if (!r.ok) commit({ ...s, errors: r.errors, mode: "edit", program: null });
    else commit({ ...s, errors: [], mode: "run", program: r.program, m: boot(ecfg), prev: null });
  };
  const doStep = () => {
    if (!s.program || predictLock) return;
    commit({ ...s, m: step(s.m, s.program, ecfg), prev: s.m });
  };
  const doRun = () => {
    if (!s.program || predictLock) return;
    let prev = s.m;
    let m = s.m;
    for (let i = 0; i <= ecfg.maxSteps + 1 && !m.halted && !m.error; i++) {
      prev = m;
      m = step(m, s.program, ecfg);
    }
    commit({ ...s, m, prev });
  };
  const doReset = () => commit({ ...s, m: boot(ecfg), prev: null });
  const doEdit = () => commit({ ...s, mode: "edit", m: boot(ecfg), prev: null });
  const setSource = (source: string) => commit({ ...s, source, errors: [] });
  const setInput = (r: number, v: number) => {
    const startRegs = [...s.startRegs];
    startRegs[r] = v;
    commit({ ...s, startRegs, m: boot({ ...ecfg, regs: startRegs }), prev: null });
  };

  const m = s.m;
  const p = s.program;
  const prev = s.prev;
  const running = s.mode === "run" && p !== null;
  const done = m.halted || m.error !== null;
  const lines = s.source.replace(/\r/g, "").split("\n");
  const errLines = new Set(s.errors.map((e) => e.line));
  const curLine = running && !m.halted ? (p.instrs[m.pc]?.line ?? null) : null;
  const pyLine = curLine !== null && props.pyLines ? (props.pyLines[curLine - 1] ?? 0) : 0;
  const inputRegs = (props.inputs ?? []).map((r) => Number(r.replace(/^r/i, ""))).filter((r) => r >= 0 && r < cfg.registers);

  let note: React.ReactNode;
  if (predictLock) {
    note = (
      <span className="inline-flex items-center gap-1.5 text-ink-3">
        <Lock className="h-3.5 w-3.5 shrink-0" /> Make your prediction below first. Then you can run it and see.
      </span>
    );
  } else if (!running) {
    note = s.errors.length ? null : "Press Assemble to turn your program into machine code and load it into the CPU.";
  } else if (m.steps === 0 && !m.error) {
    note = `Assembled ${p.instrs.length} ${p.instrs.length === 1 ? "instruction" : "instructions"}. PC = 0, so the CPU will start with the instruction at address 0. Press Step.`;
  } else {
    const ran = m.error === null && m.last !== null ? p.instrs[m.last] : null;
    note = ran ? (
      <>
        <code className="mr-1.5 whitespace-nowrap rounded-md border border-line bg-surface-2 px-1.5 py-0.5 font-mono text-[0.8rem] text-ink">{instrText(ran)}</code>
        {m.note}
      </>
    ) : (
      m.note
    );
  }

  return (
    <div className="grid w-full min-w-0 gap-3">
      {props.python && <PythonPanel code={props.python} active={pyLine} />}

      <div className="grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_11.75rem]">
        {/* code + controls */}
        <div className="min-w-0">
          <div className={`${CODE_SURFACE} overflow-hidden`}>
            <div className="flex h-9 items-center gap-2 border-b border-white/10 px-3 text-[0.7rem] font-medium text-white/50">
              <span className="font-mono">{mc === "only" ? "machine code" : "program.asm"}</span>
              {running ? (
                <span className="rounded bg-[#a3e635]/15 px-1.5 py-0.5 font-sans text-[0.65rem] font-semibold text-[#a3e635]">loaded</span>
              ) : (
                <span className="rounded bg-white/10 px-1.5 py-0.5 font-sans text-[0.65rem] font-semibold text-white/70">editing</span>
              )}
              {running && mc === "beside" && <span className="ml-auto font-sans">machine code</span>}
              {!running && editable && s.source !== starter && (
                <button type="button" onClick={() => setSource(starter)} className="ml-auto -mr-2 flex h-9 items-center gap-1 rounded-md px-2 text-white/60 hover:bg-white/10 hover:text-white" title="Restore the starting code">
                  <Undo2 className="h-3.5 w-3.5" /> Restore
                </button>
              )}
            </div>
            {running ? (
              mc === "only" ? (
                <MachineListing program={p} m={m} />
              ) : (
                <Listing lines={lines} program={p} m={m} machineCode={mc === "beside"} />
              )
            ) : (
              <Editor lines={lines} source={s.source} errLines={errLines} onChange={setSource} readOnly={!editable} />
            )}
          </div>

          {/* controls */}
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            {running ? (
              <>
                <button type="button" className={`btn ${done ? "" : "btn-primary"} !h-10 flex-1 sm:flex-none sm:!px-5`} onClick={doStep} disabled={done || predictLock}>
                  {m.halted ? "Halted" : m.error ? "Stopped" : "Step"} {!done && <ChevronRight className="h-4 w-4" />}
                </button>
                <button type="button" className="btn !h-10 flex-1 sm:flex-none" onClick={doRun} disabled={done || predictLock} title="Run to the end">
                  <FastForward className="h-4 w-4" /> Run
                </button>
                <button type="button" className="btn btn-ghost !h-10 !w-10 !p-0" onClick={doReset} disabled={m.steps === 0 && !m.error} aria-label="Reset the CPU" title="Reset the CPU">
                  <RotateCcw className="h-4 w-4" />
                </button>
                {editable && (
                  <button type="button" className="btn btn-ghost !h-10" onClick={doEdit} title="Back to editing">
                    <Pencil className="h-4 w-4" /> Edit
                  </button>
                )}
              </>
            ) : (
              <button type="button" className="btn btn-primary !h-10 flex-1 sm:flex-none sm:!px-6" onClick={doAssemble}>
                Assemble <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* what just happened */}
          <div className="mt-2.5 min-h-[2.75rem] text-sm leading-snug" aria-live="polite">
            {!running && s.errors.length > 0 ? (
              <ul className="grid gap-1">
                {s.errors.slice(0, 4).map((e, i) => (
                  <li key={i} className="rounded-lg border border-[var(--bad)] px-2.5 py-1.5 text-ink">
                    <span className="font-semibold text-bad">Line {e.line}: </span>
                    {e.message}
                  </li>
                ))}
                {s.errors.length > 4 && <li className="text-ink-3">…and {s.errors.length - 4} more.</li>}
              </ul>
            ) : (
              <p className={m.error && running ? "rounded-lg border border-[var(--bad)] px-2.5 py-1.5 text-ink" : "text-ink-2"}>{note}</p>
            )}
          </div>
        </div>

        {/* CPU + output */}
        <div className="grid min-w-0 content-start gap-3">
          <section className="min-w-0 rounded-xl border border-line bg-surface-2 p-3">
            <PanelLabel right={<span className="font-mono text-[0.7rem] tabular-nums text-ink-3">{m.steps} {m.steps === 1 ? "step" : "steps"}</span>}>CPU</PanelLabel>
            <div className="grid grid-cols-2 gap-1.5">
              {m.regs.map((v, r) => (
                <RegBox key={r} name={`R${r}`} value={num(v)} changed={prev !== null && m.wroteReg === r} />
              ))}
              <RegBox name="PC" value={m.pc} changed={prev !== null && prev.pc + 1 !== m.pc && !m.halted} />
              {showStack && <RegBox name="SP" value={m.sp} changed={prev !== null && prev.sp !== m.sp} />}
            </div>
            {cfg.flags && (
              <div className="mt-1.5 flex gap-1.5">
                <FlagLight name="Z" on={m.z} changed={prev !== null && prev.z !== m.z} title="Zero flag: the last result was zero" />
                <FlagLight name="N" on={m.n} changed={prev !== null && prev.n !== m.n} title="Negative flag: the last result was below zero" />
              </div>
            )}
            {inputRegs.length > 0 && !predictLock && (
              <div className="mt-2.5 border-t border-line pt-2.5">
                {m.steps === 0 ? (
                  <div className="grid gap-1.5">
                    <p className="text-[0.7rem] text-ink-3">Starting values</p>
                    {inputRegs.map((r) => (
                      <Stepper key={r} label={`R${r}`} value={s.startRegs[r]} min={-99} max={99} onChange={(v) => setInput(r, v)} />
                    ))}
                  </div>
                ) : (
                  <p className="text-[0.7rem] leading-snug text-ink-3">Reset to change the starting {inputRegs.length === 1 ? `value of R${inputRegs[0]}` : "values"}.</p>
                )}
              </div>
            )}
          </section>

          <section className="min-w-0 rounded-xl border border-line bg-surface-2 p-3">
            <PanelLabel>Output</PanelLabel>
            {m.out.length === 0 ? (
              <p className="text-sm text-ink-3">Nothing yet</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {m.out.map((v, i) => {
                  const fresh = prev !== null && i >= prev.out.length;
                  return (
                    <span key={i} className={`min-w-9 rounded-md border px-2 py-1 text-center font-mono text-[0.9rem] tabular-nums ${fresh ? "border-[var(--brand)] bg-tint text-ink" : "border-line bg-surface text-ink"}`}>
                      {num(v)}
                    </span>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>

      {cfg.memory > 0 && <MemoryPanel m={m} prev={prev} size={cfg.memory} names={cfg.names} showStack={showStack} />}

      {showRef && <Reference ops={ops} />}
    </div>
  );
}

/** The editable program: a transparent textarea over a highlighted copy, so typing stays native. */
function Editor({ lines, source, errLines, onChange, readOnly }: { lines: string[]; source: string; errLines: Set<number>; onChange: (s: string) => void; readOnly: boolean }) {
  const longest = Math.max(18, ...lines.map((l) => l.length));
  const rows = Math.max(5, lines.length);
  return (
    <div className="flex">
      <div className={`shrink-0 select-none py-2 pl-2 pr-2 text-right tabular-nums text-white/35 ${TEXT}`} aria-hidden>
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className={`${ROW} ${errLines.has(i + 1) ? "font-semibold text-[#f87171]" : ""}`}>
            {i + 1}
          </div>
        ))}
      </div>
      <div className="relative min-w-0 flex-1 overflow-x-auto">
        <div className="relative" style={{ width: `max(100%, calc(${longest}ch + 1.5rem))` }}>
          <pre className={`pointer-events-none absolute inset-0 m-0 overflow-hidden whitespace-pre py-2 pl-1 pr-4 ${TEXT}`} aria-hidden>
            {Array.from({ length: rows }, (_, i) => (
              <div key={i} className={`${ROW} ${errLines.has(i + 1) ? "bg-[#f87171]/15" : ""}`}>
                {lines[i] ? highlightAsm(lines[i]) : " "}
              </div>
            ))}
          </pre>
          <textarea
            value={source}
            onChange={(e) => onChange(e.target.value)}
            readOnly={readOnly}
            rows={rows}
            wrap="off"
            spellCheck={false}
            autoCapitalize="off"
            autoComplete="off"
            autoCorrect="off"
            aria-label="Assembly program"
            className={`relative block w-full resize-none overflow-hidden whitespace-pre bg-transparent py-2 pl-1 pr-4 text-transparent caret-[#a3e635] outline-none selection:bg-[#a3e635]/30 selection:text-transparent ${TEXT}`}
          />
        </div>
      </div>
    </div>
  );
}

/** The assembled program: each instruction with its address, the PC arrow, and optionally its machine code. */
function Listing({ lines, program, m, machineCode }: { lines: string[]; program: Program; m: Machine; machineCode: boolean }) {
  return (
    <div className="overflow-x-auto py-2">
      <ol className={`min-w-max ${LIST_TEXT}`}>
        {lines.map((text, i) => {
          const addr = program.lineAddr[i];
          const ins = addr !== null ? program.instrs[addr] : null;
          const isPc = addr !== null && addr === m.pc && !m.halted;
          const failed = isPc && m.error !== null;
          const ran = addr !== null && addr === m.last && m.steps > 0 && !isPc;
          const bg = failed ? "bg-[#f87171]/15" : isPc ? "bg-[rgba(163,230,53,0.16)]" : ran ? "bg-white/[0.05]" : "";
          return (
            <li key={i} className={`flex items-center ${ROW} ${bg}`} aria-current={isPc ? "step" : undefined}>
              <span className={`h-full w-1 shrink-0 ${failed ? "bg-[#f87171]" : isPc ? "bg-[#a3e635]" : ""}`} aria-hidden />
              <span className={`w-8 shrink-0 select-none pr-1.5 text-right text-[0.7rem] tabular-nums ${isPc ? "text-[#a3e635]" : "text-white/35"}`}>{addr ?? ""}</span>
              <span className="w-4 shrink-0 select-none text-[#a3e635]" aria-hidden>
                {isPc && !failed ? "›" : ""}
              </span>
              <span className="flex-1 whitespace-pre pr-4">{text ? highlightAsm(text) : " "}</span>
              {machineCode && ins && <Code nums={ins.code} active={isPc} />}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/** Only the numbers: what the CPU really sees. */
function MachineListing({ program, m }: { program: Program; m: Machine }) {
  return (
    <ol className={`py-2 ${LIST_TEXT}`}>
      {program.instrs.map((ins, addr) => {
        const isPc = addr === m.pc && !m.halted;
        return (
          <li key={addr} className={`flex items-center ${ROW} ${isPc ? "bg-[rgba(163,230,53,0.16)]" : ""}`} aria-current={isPc ? "step" : undefined}>
            <span className={`h-full w-1 shrink-0 ${isPc ? "bg-[#a3e635]" : ""}`} aria-hidden />
            <span className={`w-8 shrink-0 pr-1.5 text-right text-[0.7rem] tabular-nums ${isPc ? "text-[#a3e635]" : "text-white/35"}`}>{addr}</span>
            <span className="w-4 shrink-0 text-[#a3e635]" aria-hidden>
              {isPc ? "›" : ""}
            </span>
            <Code nums={ins.code} active={isPc} big />
          </li>
        );
      })}
    </ol>
  );
}

function Code({ nums, active, big }: { nums: number[]; active: boolean; big?: boolean }) {
  return (
    <span className={`flex shrink-0 gap-1 pr-3 tabular-nums ${big ? "" : "pl-3"}`} aria-label={`machine code ${nums.join(" ")}`}>
      {nums.map((n, i) => (
        <span key={i} className={`${big ? "w-9" : "w-7"} text-right ${i === 0 ? (active ? "text-[#a3e635]" : "text-[#d9f99d]/80") : active ? "text-white" : "text-white/60"}`}>
          {n}
        </span>
      ))}
    </span>
  );
}

function PythonPanel({ code, active }: { code: string; active: number }) {
  const lines = code.replace(/\n$/, "").split("\n");
  return (
    <div className={`${CODE_SURFACE} overflow-hidden`}>
      <div className="flex h-9 items-center border-b border-white/10 px-3 font-mono text-[0.7rem] font-medium text-white/50">program.py</div>
      <ol className={`overflow-x-auto py-2 ${LIST_TEXT}`}>
        {lines.map((t, i) => {
          const on = active === i + 1;
          return (
            <li key={i} className={`flex min-w-max items-center ${ROW} ${on ? "bg-[rgba(163,230,53,0.16)]" : ""}`}>
              <span className={`h-full w-1 shrink-0 ${on ? "bg-[#a3e635]" : ""}`} aria-hidden />
              <span className={`w-8 shrink-0 select-none pr-3 text-right text-[0.7rem] tabular-nums ${on ? "text-[#a3e635]" : "text-white/35"}`}>{i + 1}</span>
              <span className="whitespace-pre pr-4">{t ? <CodeBlock code={t} language="python" /> : " "}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function MemoryPanel({ m, prev, size, names, showStack }: { m: Machine; prev: Machine | null; size: number; names: Record<string, string>; showStack: boolean }) {
  const stackUsed = size - m.sp;
  return (
    <section className="min-w-0 rounded-xl border border-line bg-surface-2 p-3">
      <PanelLabel
        right={
          showStack ? (
            <span className="text-[0.7rem] text-ink-3">
              {stackUsed === 0 ? "stack empty" : `stack: ${stackUsed} ${stackUsed === 1 ? "value" : "values"}`} · grows down from {size - 1}
            </span>
          ) : undefined
        }
      >
        Memory
      </PanelLabel>
      <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-8">
        {m.mem.map((v, a) => {
          const wrote = prev !== null && m.wroteMem === a;
          const read = prev !== null && m.readMem === a;
          const inStack = showStack && a >= m.sp;
          const name = names[String(a)];
          return (
            <div
              key={a}
              className={`relative flex min-h-[3.25rem] flex-col items-center justify-center rounded-lg border px-1 pb-1 pt-3 transition-colors ${
                wrote ? "border-[var(--brand)] bg-tint" : read ? "border-[var(--brand)] bg-surface" : inStack ? "border-line bg-[var(--brand-soft)]" : "border-line bg-surface"
              }`}
              title={`address ${a}${name ? ` (${name})` : ""}`}
            >
              <span className="absolute left-1.5 top-1 font-mono text-[0.6rem] leading-none text-ink-3">{a}</span>
              {showStack && a === m.sp && (
                <span className="absolute right-1 top-1 rounded bg-primary px-1 font-mono text-[0.55rem] font-bold leading-[0.9rem] text-primary-ink">SP</span>
              )}
              <span className={`font-mono text-[0.9rem] font-medium tabular-nums ${v === 0 && !name && !inStack ? "text-ink-3" : "text-ink"}`}>{num(v)}</span>
              {name && <span className="max-w-full truncate font-mono text-[0.65rem] font-semibold leading-tight text-brand">{name}</span>}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Reference({ ops }: { ops: Mnemonic[] }) {
  return (
    <details className="group rounded-xl border border-line bg-surface-2">
      <summary className="flex min-h-10 cursor-pointer list-none items-center gap-2 px-3 text-sm font-medium text-ink-2 hover:text-ink [&::-webkit-details-marker]:hidden">
        <BookOpen className="h-4 w-4" /> Instructions you can use
        <ChevronRight className="ml-auto h-4 w-4 transition-transform group-open:rotate-90" />
      </summary>
      <ul className="grid gap-2 border-t border-line px-3 py-3">
        {ops.map((o) => (
          <li key={o} className="grid gap-0.5 sm:grid-cols-[11rem_1fr] sm:gap-3">
            <code className="font-mono text-[0.8rem] font-semibold text-ink">{USAGE[o].example.split("  or  ")[0]}</code>
            <span className="text-[0.85rem] leading-snug text-ink-2">{USAGE[o].does}</span>
          </li>
        ))}
      </ul>
    </details>
  );
}

export function checkCpu(state: unknown, goal: Record<string, unknown>) {
  const s = state as CpuState | undefined;
  if (!s || typeof s.source !== "string") return false;
  return evaluate(s.source, s.config, goal as CpuGoal).ok;
}
