"use client";

import React, { useEffect, useRef, useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { Btn, Caption, Note, Readout, Seg, Toy } from "../semi/ui";
import { Field, Stepper } from "../computer/ui";
import { useReducedMotion } from "../explain/useReducedMotion";
import {
  HW_PRESETS,
  INPUT_NAMES,
  OP_DELAY_NS,
  OP_SYMBOL,
  TCQ_NS,
  TSU_NS,
  applyOp,
  checkHwSw,
  evalComb,
  initModel,
  presetById,
  program,
  resetModel,
  setInputs,
  setPipelined,
  stateOf,
  stepModel,
  streamNext,
  timingOf,
  type HwSwModel,
  type Inputs,
  type Op,
} from "./hwsw-model.ts";

// ───────────── chip-hwsw: the same computation as a program and as a circuit ─────────────

export interface HwSwProps {
  /** "mulsub" (default), "sum4" or "dot". */
  preset?: string;
  /** Show the preset picker (default true). */
  choosePreset?: boolean;
  /** Start in pipelined mode (default false). */
  pipelined?: boolean;
  title?: string;
}

export { checkHwSw };

const OP_NAME: Record<Op, string> = { add: "add", sub: "sub", mul: "mul" };
const fmt = (n: number | null) => (n === null ? "–" : String(n));
const mhz = (ns: number) => Math.round(1000 / ns);

function Datapath({ m }: { m: HwSwModel }) {
  const p = presetById(m.preset);
  const t = timingOf(p);
  const c = evalComb(p, m.inputs);
  const s1 = m.hw.s1;
  const crit = t.critical[0];
  const y2 = m.pipelined ? (s1 ? applyOp(p.ops[2], s1.n1, s1.n2) : null) : c.y;
  const hot = "var(--brand)";
  const cold = "var(--ink-3)";
  const wire = (on: boolean) => ({ stroke: on ? hot : cold, strokeWidth: on ? 3 : 1.75, fill: "none", strokeLinejoin: "round" as const });
  const box = (x: number, y: number, sym: string, val: string, on: boolean, key: string) => (
    <g key={key}>
      <rect x={x} y={y} width={56} height={44} rx={6} fill="var(--tint)" stroke={on ? hot : cold} strokeWidth={on ? 3 : 1.75} />
      <text x={x + 28} y={y + 19} textAnchor="middle" fontSize={18} fontWeight={700} fill="var(--ink)">
        {sym}
      </text>
      <text x={x + 28} y={y + 38} textAnchor="middle" fontSize={14} fontFamily="ui-monospace, monospace" fill="var(--ink)">
        {val}
      </text>
    </g>
  );
  const in1 = (n: string, y: number, ty: number, boxX: number) => (
    <g key={n}>
      <polyline points={`40,${y} 52,${y} 52,${ty} ${boxX},${ty}`} {...wire(false)} />
      <text x={2} y={y + 5} fontSize={14} fontFamily="ui-monospace, monospace" fill="var(--ink)">
        {n}={m.inputs[n as keyof Inputs]}
      </text>
    </g>
  );
  return (
    <svg viewBox="0 0 360 190" className="block h-auto w-full" role="img" aria-label={`Hardware datapath for ${p.expr}: two operators in parallel feeding a third, then an output register. Combinational result ${c.y}, register holds ${fmt(m.hw.q)}.`}>
      {in1("a", 30, 38, 62)}
      {in1("b", 70, 62, 62)}
      {in1("c", 130, 138, 62)}
      {in1("d", 170, 162, 62)}
      <polyline points="118,50 180,50 180,88 196,88" {...wire(crit === "n1")} />
      <polyline points="118,150 180,150 180,112 196,112" {...wire(crit === "n2")} />
      <polyline points="252,100 276,100" {...wire(true)} />
      {box(62, 28, OP_SYMBOL[p.ops[0]], String(c.n1), crit === "n1", "n1")}
      {box(62, 128, OP_SYMBOL[p.ops[1]], String(c.n2), crit === "n2", "n2")}
      {box(196, 78, OP_SYMBOL[p.ops[2]], fmt(y2), true, "n3")}
      {m.pipelined && (
        <g>
          <rect x={130} y={16} width={34} height={158} rx={5} fill="var(--surface)" stroke="var(--ink)" strokeWidth={2} />
          <text x={147} y={104} textAnchor="middle" fontSize={14} fontWeight={700} fill="var(--ink)">
            R
          </text>
          <text x={147} y={55} textAnchor="middle" fontSize={14} fontFamily="ui-monospace, monospace" fill="var(--ink)">
            {fmt(s1 ? s1.n1 : null)}
          </text>
          <text x={147} y={155} textAnchor="middle" fontSize={14} fontFamily="ui-monospace, monospace" fill="var(--ink)">
            {fmt(s1 ? s1.n2 : null)}
          </text>
        </g>
      )}
      <rect x={276} y={74} width={64} height={52} rx={6} fill="var(--surface)" stroke="var(--ink)" strokeWidth={2} />
      <polygon points="276,112 284,118 276,124" fill="var(--ink)" />
      <text x={308} y={105} textAnchor="middle" fontSize={16} fontWeight={700} fontFamily="ui-monospace, monospace" fill="var(--ink)">
        {fmt(m.hw.q)}
      </text>
      <text x={308} y={66} textAnchor="middle" fontSize={14} fill="var(--ink-2)">
        Q reg
      </text>
      <line x1={308} y1={126} x2={308} y2={152} stroke={cold} strokeWidth={1.75} />
      <text x={308} y={172} textAnchor="middle" fontSize={14} fill="var(--ink-2)">
        clock
      </text>
    </svg>
  );
}

export function HwSw({ props, onChange }: WidgetProps<HwSwProps>) {
  const [m, setM] = useState<HwSwModel>(() => initModel(props.preset ?? "mulsub", props.pipelined ?? false));
  const [running, setRunning] = useState(false);
  const reduced = useReducedMotion();
  const cb = useRef(onChange);
  useEffect(() => {
    cb.current = onChange;
  });
  useEffect(() => {
    cb.current?.(stateOf(m));
  }, [m]);

  const p = presetById(m.preset);
  const prog = program(p);
  const t = timingOf(p);
  const c = evalComb(p, m.inputs);
  const done = m.cpu.pc >= prog.length;
  const active = running && !done;

  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setM((prev) => stepModel(prev)), 700);
    return () => clearInterval(id);
  }, [active]);

  const run = () => {
    if (done) return;
    if (reduced) {
      setM((prev) => {
        let x = prev;
        while (x.cpu.pc < prog.length) x = stepModel(x);
        return x;
      });
    } else setRunning(true);
  };
  const stop = () => setRunning(false);
  const change = (k: keyof Inputs, v: number) => setM((prev) => setInputs(prev, { ...prev.inputs, [k]: v }));
  const critOps = `${OP_NAME[p.ops[t.critical[0] === "n1" ? 0 : 1]]} → ${OP_NAME[p.ops[2]]}`;
  const critSum = `${(t.critical[0] === "n1" ? t.d1 : t.d2).toFixed(1)} + ${t.d3.toFixed(1)}`;
  const stale = m.hw.q !== null && !m.pipelined && m.hw.q !== c.y;

  return (
    <div className="@container w-full" data-widget>
      {props.title && <Caption className="mb-1.5">{props.title}</Caption>}
      {props.choosePreset !== false && (
        <div className="mb-3 flex justify-center">
          <Seg
            label="Computation"
            value={m.preset}
            options={HW_PRESETS.map((x) => ({ value: x.id, label: x.label }))}
            onChange={(id) => {
              stop();
              setM(initModel(id, m.pipelined));
            }}
            className="flex-wrap"
          />
        </div>
      )}
      <p className="text-center font-mono text-[0.95rem] font-semibold text-ink">{p.expr}</p>

      <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-2">
        {INPUT_NAMES.map((k) => (
          <Field key={k} label={`input ${k}`}>
            <Stepper label={`Input ${k}`} value={m.inputs[k]} min={0} max={15} onChange={(v) => change(k, v)} />
          </Field>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        <Btn
          primary
          onClick={() => {
            stop();
            setM((prev) => stepModel(prev));
          }}
          label="Step: one clock cycle for both"
        >
          Step
        </Btn>
        {active ? <Btn onClick={stop}>Pause</Btn> : <Btn onClick={run} disabled={done}>Run</Btn>}
        <Btn
          onClick={() => {
            stop();
            setM((prev) => streamNext(prev));
          }}
          label="Stream: load the next stored input set, then clock once"
        >
          Stream next input
        </Btn>
        <Btn
          onClick={() => {
            stop();
            setM((prev) => setPipelined(prev, !prev.pipelined));
          }}
          on={m.pipelined}
        >
          Pipelined
        </Btn>
        <Btn
          onClick={() => {
            stop();
            setM((prev) => resetModel(prev));
          }}
        >
          Reset
        </Btn>
      </div>
      <p className="mt-1.5 text-center text-xs text-ink-3">Step is one clock cycle for both sides. Changing an input makes the program start over; the circuit just settles.</p>

      <div className="mt-3 grid gap-3 @2xl:grid-cols-2">
        <section aria-label="Software: a CPU running a program" className="rounded-xl border border-line bg-surface p-2.5">
          <Caption className="mb-1.5">Software: one instruction per cycle</Caption>
          <ol className="flex flex-col gap-1" aria-label="Program">
            {prog.map((ins, i) => {
              const now = m.cpu.pc === i;
              const was = m.cpu.pc > i;
              return (
                <li
                  key={i}
                  className={`flex items-baseline gap-2 rounded-lg px-2 py-1 font-mono text-[0.88rem] ${now ? "bg-tint font-semibold text-ink ring-1 ring-[var(--brand)]" : was ? "text-ink-2" : "text-ink-3"}`}
                  aria-current={now ? "step" : undefined}
                >
                  <span aria-hidden className="w-3 text-brand">
                    {now ? "▶" : was ? "✓" : ""}
                  </span>
                  <span className="w-28 shrink-0">{ins.text}</span>
                  <span className="font-sans text-xs text-ink-3">{ins.gloss}</span>
                </li>
              );
            })}
          </ol>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Readout label="cycles" value={m.softwareSteps} accent />
            <Readout label="r1" value={fmt(m.cpu.r1)} />
            <Readout label="r2" value={fmt(m.cpu.r2)} />
            <Readout label="y" value={fmt(m.cpu.y)} />
          </div>
          <p className="mt-1.5 text-[0.88rem] leading-snug text-ink-2">
            {done ? `Done after ${prog.length} cycles: y = ${m.cpu.y}.` : `The answer needs ${prog.length} cycles: the one adder or multiplier is reused, one operation at a time.`}
          </p>
        </section>

        <section aria-label="Hardware: a datapath" className="rounded-xl border border-line bg-surface p-2.5">
          <Caption className="mb-1">Hardware: all operators at once</Caption>
          <Datapath m={m} />
          <div className="mt-1 flex flex-wrap gap-1.5">
            <Readout label="y now (no clock)" value={c.y} accent />
            <Readout label="Q after clock" value={fmt(m.hw.q)} />
            <Readout label="ticks" value={m.hw.ticks} />
          </div>
          <p className="mt-1.5 text-[0.88rem] leading-snug text-ink-2">
            {stale
              ? "The combinational result y already follows the inputs, but the register Q still holds the old value until the next clock edge."
              : m.pipelined
                ? "Pipelined: a register sits between the first operators and the last one, so a result takes 2 ticks to appear, but a new one can come out on every tick."
                : "Combinational: y follows the inputs after the propagation delay. The register Q copies y only on a clock edge."}
          </p>
        </section>
      </div>

      <div className="mt-3 rounded-xl border border-line bg-surface-2 p-2.5 text-[0.9rem] leading-snug text-ink-2">
        <p>
          <span className="font-semibold text-ink">Propagation delay:</span> longest path {critOps} = {critSum} = <span className="font-mono font-semibold text-ink">{t.combNs.toFixed(1)} ns</span> (toy delays: add {OP_DELAY_NS.add}, sub {OP_DELAY_NS.sub}, mul {OP_DELAY_NS.mul} ns).
        </p>
        {!m.pipelined ? (
          <p className="mt-1">
            Fastest clock: tcq {TCQ_NS} + {t.combNs.toFixed(1)} + tsu {TSU_NS} = <span className="font-mono font-semibold text-ink">{t.periodNs.toFixed(1)} ns</span> (about {mhz(t.periodNs)} MHz). One result takes 1 cycle; the CPU needs {prog.length}.
          </p>
        ) : (
          <p className="mt-1">
            Stage 1 {t.stage1Ns.toFixed(1)} ns, stage 2 {t.stage2Ns.toFixed(1)} ns, so the clock can run at tcq {TCQ_NS} + {Math.max(t.stage1Ns, t.stage2Ns).toFixed(1)} + tsu {TSU_NS} = <span className="font-mono font-semibold text-ink">{t.pipelinedPeriodNs.toFixed(1)} ns</span> (about {mhz(t.pipelinedPeriodNs)} MHz), instead of {t.periodNs.toFixed(1)} ns. Latency 2 cycles, throughput 1 result per cycle.
          </p>
        )}
      </div>

      {m.hw.log.length > 0 && (
        <div className="mt-3 overflow-x-auto rounded-xl border border-line">
          <table className="w-full min-w-[19rem] border-collapse text-left text-[0.86rem]">
            <caption className="sr-only">Clock ticks: inputs sampled and what the output register shows afterwards</caption>
            <thead>
              <tr className="bg-surface-2 text-xs text-ink-3">
                <th className="px-2 py-1.5 font-medium">Tick</th>
                <th className="px-2 py-1.5 font-medium">Inputs sampled (a, b, c, d)</th>
                <th className="px-2 py-1.5 font-medium">Q shows</th>
              </tr>
            </thead>
            <tbody>
              {m.hw.log.map((r) => (
                <tr key={r.tick} className="border-t border-line">
                  <td className="px-2 py-1.5 font-mono text-ink">{r.tick}</td>
                  <td className="px-2 py-1.5 font-mono text-ink">{INPUT_NAMES.map((k) => r.inputs[k]).join(", ")}</td>
                  <td className="px-2 py-1.5 font-mono text-ink">
                    {r.q === null ? "nothing yet" : r.forTick === r.tick ? r.q : `${r.q} (from tick ${r.forTick})`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {m.hw.ticks === 0 && (
        <div className="mt-3">
          <Note>Press Step: the CPU runs its first instruction while the hardware finishes the whole expression at its first clock edge.</Note>
        </div>
      )}
      <Toy>Toy model: whole numbers, no overflow, made-up delays (add 1.0 ns, subtract 1.2 ns, multiply 3.0 ns) and a one-instruction-per-cycle CPU with no pipeline of its own. Real CPUs and real circuits are far faster and more complicated.</Toy>
    </div>
  );
}
