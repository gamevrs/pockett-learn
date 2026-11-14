"use client";

import React, { useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { Caption, Note, Readout, Seg, ToyNote } from "./ui";
import { ENGINE_NAMES, HANDOVER_US, plan, type Act, type Engine, type Quant } from "./delegateModel";

// ───────────────────────────── emb-delegate: where each layer of a model runs ─────────────────────────────

export interface DelegateProps {
  engine?: Engine;
  quant?: Quant;
  act?: Act;
  task?: string;
}

export interface DelegateState {
  engine: Engine;
  quant: Quant;
  act: Act;
  partitions: number;
  handovers: number;
  ms: number;
  accelOps: number;
}

const ENGINE_OPTS: { value: Engine; label: string }[] = [
  { value: "cpu", label: "CPU only" },
  { value: "gpu", label: "GPU delegate" },
  { value: "npu", label: "NPU delegate" },
];
const QUANT_OPTS: { value: Quant; label: string }[] = [
  { value: "float32", label: "float32" },
  { value: "int8", label: "int8" },
];
const ACT_OPTS: { value: Act; label: string }[] = [
  { value: "hardswish", label: "HardSwish" },
  { value: "relu6", label: "ReLU6" },
];

const isEngine = (v: unknown): v is Engine => v === "cpu" || v === "gpu" || v === "npu";
const isQuant = (v: unknown): v is Quant => v === "float32" || v === "int8";
const isAct = (v: unknown): v is Act => v === "hardswish" || v === "relu6";

const fmtMs = (ms: number) => `${+ms.toFixed(2)} ms`;
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export function Delegate({ props, onChange, revealed }: WidgetProps<DelegateProps>) {
  const [engine, setEngine] = useState<Engine>(isEngine(props.engine) ? props.engine : "npu");
  const [quant, setQuant] = useState<Quant>(isQuant(props.quant) ? props.quant : "int8");
  const [act, setAct] = useState<Act>(isAct(props.act) ? props.act : "hardswish");
  const locked = Boolean(revealed);

  const stateOf = (e: Engine, q: Quant, a: Act): DelegateState => {
    const p = plan(e, q, a);
    return { engine: e, quant: q, act: a, partitions: p.partitions.length, handovers: p.handovers, ms: p.totalMs, accelOps: p.accelOps };
  };
  const apply = (e: Engine, q: Quant, a: Act) => {
    setEngine(e);
    setQuant(q);
    setAct(a);
    onChange?.(stateOf(e, q, a));
  };

  const p = plan(engine, quant, act);
  const name = ENGINE_NAMES[engine];
  const log =
    engine === "cpu"
      ? `No delegate: ${p.placed.length} of ${p.placed.length} ops on the CPU, 1 partition`
      : `Delegate: ${p.accelOps} of ${p.placed.length} ops on the ${name}, ${plural(p.partitions.length, "partition", "partitions")}`;
  const unsupported = p.placed.filter((x) => x.fallback).map((x) => x.op.name);

  return (
    <div className="w-full">
      {props.task && <p className="mb-2 text-[0.9rem] text-ink">{props.task}</p>}

      <fieldset disabled={locked} className={`m-0 flex min-w-0 flex-col gap-2.5 border-0 p-0 ${locked ? "opacity-70" : ""}`}>
        <div>
          <Caption className="mb-1">Run the model on</Caption>
          <Seg options={ENGINE_OPTS} value={engine} onChange={(v) => apply(v, quant, act)} label="Run the model on" />
        </div>
        <div>
          <Caption className="mb-1">Model numbers</Caption>
          <Seg options={QUANT_OPTS} value={quant} onChange={(v) => apply(engine, v, act)} label="Model number format" />
        </div>
        <div>
          <Caption className="mb-1">Activation layer (op 5)</Caption>
          <Seg options={ACT_OPTS} value={act} onChange={(v) => apply(engine, quant, v)} label="Activation layer" />
        </div>
      </fieldset>

      <Caption className="mb-1.5 mt-4">The model, layer by layer</Caption>
      <ol className="grid grid-cols-3 gap-1.5 sm:grid-cols-5" aria-label="Model layers and where each one runs">
        {p.placed.map((x, i) => (
          <li
            key={x.op.id}
            className={`min-w-0 rounded-lg border px-2 py-1.5 ${x.on === "cpu" ? "border-line bg-surface" : "border-[var(--brand)] bg-tint"}`}
          >
            <p className="break-words text-[0.78rem] font-semibold leading-snug text-ink">
              <span className="font-mono tabular-nums">{i + 1}.</span> {x.op.name}
            </p>
            <p className="text-[0.76rem] leading-snug text-ink">
              on {ENGINE_NAMES[x.on]}
              {x.fallback && <span className="text-ink-2"> (fallback)</span>}
            </p>
            <p className="font-mono text-[0.74rem] tabular-nums text-ink-2">{fmtMs(x.us / 1000)}</p>
          </li>
        ))}
      </ol>

      <p className="mt-3 break-words rounded-lg border border-line bg-surface-2 px-3 py-2 font-mono text-[0.8rem] leading-snug text-ink">{log}</p>

      <ol className="mt-2 flex flex-col gap-1" aria-label="Partitions">
        {p.partitions.map((pt, i) => (
          <li key={i} className="rounded-lg border border-line bg-surface px-2.5 py-1.5 text-[0.84rem] leading-snug text-ink">
            <span className="font-mono tabular-nums">Partition {i + 1}:</span> {ENGINE_NAMES[pt.on]}, {pt.from === pt.to ? `op ${pt.from}` : `ops ${pt.from} to ${pt.to}`}
          </li>
        ))}
      </ol>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        <Readout label="Partitions" value={p.partitions.length} />
        <Readout label="Hand-overs" value={p.handovers} />
        <Readout label="Time per run" value={fmtMs(p.totalMs)} />
      </div>
      <p className="mt-1.5 text-center text-[0.82rem] text-ink-2">
        {fmtMs(p.opsUs / 1000)} of layers + {plural(p.handovers, "hand-over", "hand-overs")} × {fmtMs(HANDOVER_US / 1000)} = {fmtMs(p.handoverUs / 1000)}
      </p>

      <div className="mt-3">
        <Note>
          {p.note ??
            (unsupported.length > 0
              ? `The ${name} delegate has no kernel for ${unsupported.join(", ")}, so the runtime runs it on the CPU and hands data across and back.`
              : engine === "cpu"
                ? "Everything runs on the CPU: one partition, no hand-overs, but the slowest layers."
                : `The ${name} delegate took every layer: one partition, no hand-overs.`)}
        </Note>
        {(act === "relu6" || quant === "int8") && (
          <p className="mt-1.5 text-center text-[0.8rem] text-ink-2">
            {act === "relu6" ? "ReLU6 is a different function from HardSwish: re-export or retrain, then check the accuracy. " : ""}
            {quant === "int8" ? "int8 rounds the numbers: check the accuracy on test data." : ""}
          </p>
        )}
      </div>
      <ToyNote>Toy model: times are made up for illustration; real ones depend on the chip, the model and the runtime.</ToyNote>
    </div>
  );
}

/** goal: { maxPartitions, maxMs, engine } (every key optional) */
export function checkDelegate(state: unknown, goal: Record<string, unknown>): boolean {
  const s = state as Partial<DelegateState> | undefined;
  if (!s || typeof s.partitions !== "number" || typeof s.ms !== "number") return false;
  if (typeof goal.maxPartitions === "number" && s.partitions > goal.maxPartitions) return false;
  if (typeof goal.maxMs === "number" && s.ms > goal.maxMs) return false;
  if (typeof goal.engine === "string" && s.engine !== goal.engine) return false;
  return true;
}
