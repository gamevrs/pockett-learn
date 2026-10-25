"use client";

import React, { useState } from "react";
import { Flame, Timer } from "lucide-react";
import type { WidgetProps } from "@/learn/widget";
import { Caption, Field, Readout, Seg, Stepper } from "./ui";

export interface ClockProps {
  /** Which knobs to show. Default all three. */
  controls?: ("ghz" | "cores" | "ipc")[];
  initial?: { ghz?: number; cores?: number; ipc?: number };
  /** A job to finish, in billions of instructions. Shows how long it takes. */
  job?: number;
  /** Can the job be split across cores? true, false, or "toggle" (the learner decides). Default true. */
  split?: boolean | "toggle";
  /** Highest clock the knob allows, in GHz. Default 6. */
  maxGhz?: number;
}

export interface ClockState {
  ghz: number;
  cores: number;
  ipc: number;
  split: boolean;
  /** Billions of instructions per second. */
  rate: number;
  /** Seconds to finish the job (if there is one). */
  seconds: number | null;
}

const big = (billions: number) => (billions >= 1 ? `${+billions.toFixed(1)} billion` : `${Math.round(billions * 1000)} million`);
const secs = (s: number) => (s >= 10 ? `${s.toFixed(0)} s` : s >= 1 ? `${s.toFixed(1)} s` : `${(s * 1000).toFixed(0)} ms`);

/** Clock speed, cores and work per tick: how fast does a job really finish? */
export function Clock({ props, onChange, revealed }: WidgetProps<ClockProps>) {
  const controls = props.controls ?? ["ghz", "cores", "ipc"];
  const maxGhz = props.maxGhz ?? 6;
  const [halfGhz, setHalfGhz] = useState(Math.round((props.initial?.ghz ?? 2) * 2));
  const [cores, setCores] = useState(props.initial?.cores ?? 1);
  const [ipc, setIpc] = useState(props.initial?.ipc ?? 1);
  const [split, setSplit] = useState(props.split === false ? false : true);
  const locked = Boolean(revealed);
  const ghz = halfGhz / 2;
  const used = split ? cores : 1;
  const rate = ghz * ipc * used;
  const seconds = props.job ? props.job / rate : null;

  const update = (next: Partial<{ halfGhz: number; cores: number; ipc: number; split: boolean }>) => {
    const h = next.halfGhz ?? halfGhz;
    const c = next.cores ?? cores;
    const i = next.ipc ?? ipc;
    const sp = next.split ?? split;
    setHalfGhz(h);
    setCores(c);
    setIpc(i);
    setSplit(sp);
    const r = (h / 2) * i * (sp ? c : 1);
    onChange?.({ ghz: h / 2, cores: c, ipc: i, split: sp, rate: r, seconds: props.job ? props.job / r : null } satisfies ClockState);
  };

  // a 2-nanosecond window of the clock signal
  const W = 300;
  const pulses = ghz * 2;
  const period = W / pulses;
  let d = "M0 26";
  for (let x = 0; x < W; x += period) {
    const hi = Math.min(W, x + period / 2);
    const lo = Math.min(W, x + period);
    d += ` L${x.toFixed(1)} 26 L${x.toFixed(1)} 6 L${hi.toFixed(1)} 6 L${hi.toFixed(1)} 26 L${lo.toFixed(1)} 26`;
  }
  const heat = Math.min(1, (ghz / maxGhz) ** 2);
  const hot = ghz > 5;

  return (
    <div className="w-full">
      <div className="rounded-xl border border-line bg-surface-2 px-3 pb-2 pt-2.5">
        <div className="flex items-baseline justify-between">
          <Caption>Clock signal · 2 nanoseconds</Caption>
          <span className="font-mono text-[11px] text-ink-3">{+pulses.toFixed(1)} ticks</span>
        </div>
        <svg viewBox={`0 0 ${W} 32`} className="mt-1 block h-10 w-full" preserveAspectRatio="none" aria-label={`${ghz} gigahertz clock`}>
          <path d={d} className="fill-none stroke-[var(--brand)]" strokeWidth={2} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
        </svg>
      </div>

      <div className="mt-3 flex flex-wrap items-end justify-center gap-x-5 gap-y-3">
        {controls.includes("ghz") && (
          <Field label="Clock speed">
            <Stepper label="Clock speed" wide value={halfGhz} min={1} max={maxGhz * 2} disabled={locked} format={(v) => `${v / 2} GHz`} onChange={(v) => update({ halfGhz: v })} />
          </Field>
        )}
        {controls.includes("cores") && (
          <Field label="Cores">
            <Seg label="Cores" value={cores} disabled={locked} onChange={(c) => update({ cores: c })} options={[1, 2, 4, 8].map((c) => ({ value: c, label: String(c) }))} />
          </Field>
        )}
        {controls.includes("ipc") && (
          <Field label="Instructions per tick">
            <Seg label="Instructions per tick" value={ipc} disabled={locked} onChange={(i) => update({ ipc: i })} options={[1, 2, 4].map((i) => ({ value: i, label: String(i) }))} />
          </Field>
        )}
      </div>

      {controls.includes("cores") && (
        <div className="mt-4">
          <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-8">
            {Array.from({ length: cores }, (_, c) => {
              const busy = c < used;
              return (
                <div key={c} className={`rounded-lg border p-1.5 text-center ${busy ? "border-[var(--brand)]/50 bg-tint" : "border-dashed border-[var(--line-strong)] bg-surface"}`}>
                  <p className={`font-mono text-[10px] ${busy ? "text-brand" : "text-ink-3"}`}>core {c + 1}</p>
                  <div className="mt-1 flex justify-center gap-0.5">
                    {Array.from({ length: ipc }, (_, k) => (
                      <span key={k} className={`h-2.5 w-2.5 rounded-sm ${busy ? "bg-primary" : "bg-[var(--line-strong)]"}`} />
                    ))}
                  </div>
                  <p className="mt-0.5 text-[10px] text-ink-3">{busy ? "busy" : "idle"}</p>
                </div>
              );
            })}
          </div>
          {props.job && props.split === "toggle" && (
            <div className="mt-3 flex justify-center">
              <Seg
                label="Can the job be split?"
                value={split ? "yes" : "no"}
                disabled={locked}
                onChange={(v) => update({ split: v === "yes" })}
                options={[
                  { value: "yes", label: "Job splits into parts" },
                  { value: "no", label: "One step after another" },
                ]}
              />
            </div>
          )}
        </div>
      )}

      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <Readout label="Ticks per second" value={big(ghz)} />
        <Readout label="One tick" value={`${+(1 / ghz).toFixed(2)} ns`} />
        <Readout label="Instructions per second" value={big(rate)} accent />
      </div>

      {seconds !== null && (
        <div className="mt-3 flex items-center justify-center gap-2 rounded-xl border border-line bg-surface p-3">
          <Timer className="h-4 w-4 text-brand" />
          <span className="text-sm text-ink-2">
            Job of {props.job} billion instructions{props.split === false || !split ? " (can't be split)" : ""}:
          </span>
          <span className="font-mono text-base font-semibold text-ink">{secs(seconds)}</span>
        </div>
      )}

      {controls.includes("ghz") && (
        <div className="mx-auto mt-3 flex max-w-sm items-center gap-2">
          <Flame className={`h-4 w-4 shrink-0 ${hot ? "text-bad" : "text-ink-3"}`} />
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
            <div className={`h-full rounded-full transition-all ${hot ? "bg-bad" : "bg-[var(--ink-3)]"}`} style={{ width: `${Math.max(4, heat * 100)}%` }} />
          </div>
          <span className={`w-28 text-right text-[11px] ${hot ? "text-bad" : "text-ink-3"}`}>{hot ? "too hot to keep up" : ghz >= 4 ? "warm" : "cool"}</span>
        </div>
      )}
    </div>
  );
}

/** goal: { maxSeconds } (job finishes in time), { minRate } (billions/s), or exact { ghz } / { cores }. */
export function checkClock(state: unknown, goal: Record<string, unknown>) {
  const s = state as ClockState | undefined;
  if (!s) return false;
  if (typeof goal.maxSeconds === "number" && !(s.seconds !== null && s.seconds <= goal.maxSeconds + 1e-9)) return false;
  if (typeof goal.minRate === "number" && s.rate < goal.minRate - 1e-9) return false;
  if (typeof goal.maxGhz === "number" && s.ghz > goal.maxGhz) return false;
  if (typeof goal.ghz === "number" && s.ghz !== goal.ghz) return false;
  if (typeof goal.cores === "number" && s.cores !== goal.cores) return false;
  return true;
}
