"use client";

/** Shared kit for the digital-logic widgets: controls from the other modules, a bit toggle and a waveform strip. */
import React from "react";
import type { Bit } from "./sim";

export { Btn, Caption, Note, Readout } from "../computer/ui";
export { Meter, Slider } from "../ai/ui";
export { Seg } from "../gpu/ui";

/** A 0/1 toggle button, 40px tall. */
export function BitBtn({ label, value, onClick, wide }: { label: string; value: number | string; onClick: () => void; wide?: boolean }) {
  const on = value === 1;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${label}: ${value}, tap to flip`}
      aria-pressed={on}
      className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border px-3 font-mono text-sm font-semibold transition-colors ${wide ? "min-w-24" : "min-w-16"} ${
        on ? "border-transparent bg-primary text-primary-ink" : "border-line bg-surface text-ink hover:bg-surface-2"
      }`}
    >
      <span className="text-xs font-medium opacity-80">{label}</span>
      <span>{value}</span>
    </button>
  );
}

/** A small 0/1 lamp. */
export function Lamp({ v, label }: { v: number | string; label: string }) {
  const on = v === 1;
  const unknown = v === "?";
  return (
    <span
      role="img"
      aria-label={`${label}: ${v}`}
      className={`grid h-9 min-w-9 place-items-center rounded-md border px-1.5 font-mono text-sm font-semibold ${
        unknown ? "border-[var(--bad)] bg-surface text-ink" : on ? "border-[var(--brand)] bg-tint text-ink" : "border-line bg-surface-2 text-ink-3"
      }`}
    >
      {v}
    </span>
  );
}

export interface WaveSignal {
  name: string;
  v: (Bit | "?")[];
  /** draw in the accent colour */
  hot?: boolean;
}

const ROW = 34;

/** Digital waveform strip: one row per signal, one slot per sample, steps drawn as square edges, "?" as a dashed mid-level. */
export function Wave({ signals, slots, label, labelW = 56, mark }: { signals: WaveSignal[]; slots: number; label: string; labelW?: number; mark?: number }) {
  const W = 360;
  const pw = W - labelW - 6;
  const sw = pw / slots;
  const H = signals.length * ROW + 6;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} className="block w-full">
      {Array.from({ length: slots + 1 }, (_, i) => (
        <line key={i} x1={labelW + i * sw} x2={labelW + i * sw} y1={2} y2={H - 4} stroke="var(--line)" strokeWidth={0.6} />
      ))}
      {mark !== undefined && mark >= 0 && mark < slots && <rect x={labelW + mark * sw} y={2} width={sw} height={H - 6} fill="var(--brand)" opacity={0.12} />}
      {signals.map((s, r) => {
        const yHi = r * ROW + 8;
        const yLo = r * ROW + 28;
        const yMid = (yHi + yLo) / 2;
        const col = s.hot ? "var(--brand)" : "var(--ink)";
        let d = "";
        let prevY: number | null = null;
        const unk: { x: number; w: number }[] = [];
        s.v.forEach((val, i) => {
          const x0 = labelW + i * sw;
          const y = val === "?" ? yMid : val ? yHi : yLo;
          if (val === "?") unk.push({ x: x0, w: sw });
          d += prevY === null ? `M${x0.toFixed(1)} ${y}` : prevY !== y ? ` L${x0.toFixed(1)} ${prevY} L${x0.toFixed(1)} ${y}` : "";
          d += ` L${(x0 + sw).toFixed(1)} ${y}`;
          prevY = y;
        });
        return (
          <g key={s.name}>
            <text x={2} y={yMid + 5} fontSize={14} fill="var(--ink-2)" fontFamily="var(--font-mono, monospace)">
              {s.name}
            </text>
            <path d={d} fill="none" stroke={col} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" strokeDasharray={undefined} />
            {unk.map((u) => (
              <rect key={u.x} x={u.x} y={yHi} width={u.w} height={yLo - yHi} fill="var(--bad)" opacity={0.18} />
            ))}
          </g>
        );
      })}
    </svg>
  );
}
