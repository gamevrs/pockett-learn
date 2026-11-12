"use client";

import React, { useEffect, useState } from "react";
import { Play, RotateCcw } from "lucide-react";
import type { WidgetProps } from "@/learn/widget";
import { useReducedMotion } from "../explain/useReducedMotion";
import { CPU_SPEED, CPU_WORKERS, GPU_SPEED, GPU_WORKERS, race } from "./sim";
import { Btn, Caption, Note, Readout, Seg, Slider, BLUE, ORANGE } from "./ui";

export interface RaceProps {
  /** Start with this many dependent steps / independent items. */
  chain?: number;
  items?: number;
  /** Hide the sliders and the presets: the job is fixed. */
  fixed?: boolean;
}

export interface RaceState {
  chain: number;
  items: number;
  cpu: number;
  gpu: number;
  winner: "cpu" | "gpu" | "tie";
  /** The race has been run at least once for this job. */
  ran: boolean;
}

const PRESETS = [
  { value: "pixels", label: "Paint pixels", chain: 0, items: 4096 },
  { value: "total", label: "Running total", chain: 64, items: 0 },
  { value: "mixed", label: "A bit of both", chain: 64, items: 4096 },
];

/** A toy race: 8 fast workers (the CPU) against 1,024 slow ones (the GPU) on a job with a chain of dependent steps and a pile of independent items. */
export function Race({ props, onChange }: WidgetProps<RaceProps>) {
  const reduced = useReducedMotion();
  const [chain, setChain] = useState(props.chain ?? 0);
  const [items, setItems] = useState(props.items ?? 4096);
  const [p, setP] = useState(0); // race progress 0..1 of the slower runner's time
  const [running, setRunning] = useState(false);
  const [ran, setRan] = useState(false);

  const r = race(chain, items);
  const slow = Math.max(r.cpu, r.gpu, 1e-9);

  const report = (c: number, i: number, didRun: boolean) => {
    const x = race(c, i);
    onChange?.({ chain: c, items: i, cpu: x.cpu, gpu: x.gpu, winner: x.winner, ran: didRun } satisfies RaceState);
  };
  const setJob = (c: number, i: number) => {
    setChain(c);
    setItems(i);
    setP(0);
    setRunning(false);
    setRan(false);
    report(c, i, false);
  };

  useEffect(() => {
    if (!running) return;
    let raf = 0;
    let prev = performance.now();
    let at = 0;
    const tick = (now: number) => {
      at += Math.min(now - prev, 100) / 2600;
      prev = now;
      if (at >= 1) {
        setP(1);
        setRunning(false);
        setRan(true);
        return;
      }
      setP(at);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [running]);

  const run = () => {
    report(chain, items, true);
    if (reduced) {
      setP(1);
      setRan(true);
      return;
    }
    setP(0);
    setRunning(true);
  };

  const done = (t: number) => Math.min(1, (p * slow) / Math.max(t, 1e-9));
  const preset = PRESETS.find((x) => x.chain === chain && x.items === items)?.value ?? "custom";

  const lane = (name: "CPU" | "GPU", workers: number, speed: number, t: number, colour: string, cells: number) => (
    <div className="rounded-xl border border-line bg-surface p-2.5">
      <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-3">
        <span className="text-sm font-semibold text-ink">{name}</span>
        <span className="text-xs text-ink-3">
          {workers.toLocaleString("en-US")} workers × {speed} {speed === 1 ? "step" : "steps"} per tick
        </span>
      </div>
      <div className="mb-2 flex flex-wrap gap-1" aria-hidden>
        {Array.from({ length: cells }, (_, i) => (
          <span key={i} className={workers > 100 ? "h-2.5 w-2.5 rounded-[2px]" : "h-5 w-5 rounded-md"} style={{ background: colour, opacity: p > 0 && done(t) < 1 ? 1 : 0.55 }} />
        ))}
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-[var(--line-strong)]" role="img" aria-label={`${name} progress ${Math.round(done(t) * 100)} percent`}>
        <div className="h-full rounded-full" style={{ width: `${done(t) * 100}%`, background: colour }} />
      </div>
      <p className="mt-1.5 font-mono text-sm tabular-nums text-ink">
        {p > 0 && done(t) >= 1 ? `${+t.toFixed(1)} ticks` : p > 0 ? "working…" : "ready"}
        {ran && r.winner === (name === "CPU" ? "cpu" : "gpu") ? "  ← wins" : ""}
      </p>
    </div>
  );

  return (
    <div className="w-full" data-widget>
      {!props.fixed && (
        <div className="mb-3 space-y-3">
          <Seg
            label="Job"
            value={preset}
            onChange={(v) => {
              const x = PRESETS.find((q) => q.value === v);
              if (x) setJob(x.chain, x.items);
            }}
            options={[...PRESETS.map((x) => ({ value: x.value, label: x.label })), ...(preset === "custom" ? [{ value: "custom", label: "Custom" }] : [])]}
            className="max-w-full"
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Slider label="Steps that must go one after another" value={chain} min={0} max={256} step={8} onChange={(v) => setJob(v, items)} />
            <Slider label="Independent pieces of work" value={items} min={0} max={8192} step={256} onChange={(v) => setJob(chain, v)} format={(v) => v.toLocaleString("en-US")} />
          </div>
        </div>
      )}
      {props.fixed && (
        <p className="mb-3 text-sm text-ink-2">
          Job: <b>{chain}</b> dependent steps and <b>{items.toLocaleString("en-US")}</b> independent pieces of work.
        </p>
      )}
      <div className="grid gap-2 sm:grid-cols-2">
        {lane("CPU", CPU_WORKERS, CPU_SPEED, r.cpu, ORANGE, CPU_WORKERS)}
        {lane("GPU", GPU_WORKERS, GPU_SPEED, r.gpu, BLUE, 64)}
      </div>
      <p className="mt-1 text-xs text-ink-3">The GPU strip draws 64 squares for its 1,024 workers (16 workers each).</p>
      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        <Btn primary onClick={run} disabled={running}>
          <Play className="h-4 w-4" /> Run the race
        </Btn>
        <Btn
          onClick={() => {
            setP(0);
            setRan(false);
            setRunning(false);
          }}
          disabled={p === 0 && !running}
        >
          <RotateCcw className="h-4 w-4" /> Reset
        </Btn>
        <Readout label="CPU" value={`${+r.cpu.toFixed(1)} ticks`} />
        <Readout label="GPU" value={`${+r.gpu.toFixed(1)} ticks`} />
      </div>
      <div className="mt-3">
        <Note tone={ran ? "accent" : "plain"}>
          {ran
            ? r.winner === "tie"
              ? "A tie: neither kind of worker has an edge on this job."
              : r.winner === "gpu"
                ? "The GPU wins: enough independent work to keep thousands of slow workers busy."
                : "The CPU wins: a chain of dependent steps can use only one worker at a time, so the CPU's faster worker beats the GPU's slower one."
            : "Toy model: a dependent step needs the answer of the one before it, so only one worker can do it. Independent pieces spread over every worker."}
        </Note>
      </div>
      <Caption className="mt-2">Toy numbers, not a benchmark</Caption>
    </div>
  );
}

/** goal: { winner: "cpu" | "gpu" } (the job you set makes that side win), optionally { ran: true } (and the race was run). */
export function checkRace(state: unknown, goal: Record<string, unknown>) {
  const s = state as RaceState | undefined;
  if (!s) return false;
  if (typeof goal.winner === "string" && s.winner !== goal.winner) return false;
  if (goal.ran === true && !s.ran) return false;
  return true;
}
