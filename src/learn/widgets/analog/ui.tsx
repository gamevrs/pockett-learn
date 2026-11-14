"use client";

/** Shared kit for the analog widgets: the computer module's controls, the AI module's slider, SI formatting, a scope/Bode plot. */
import React, { useId } from "react";

export { Btn, Caption, Field, Note, Readout, Stepper, clamp } from "../computer/ui";
export { Slider, Meter } from "../ai/ui";
export { formatSI, toInputSI, MINUS } from "../elec-kit/format";

/** Second data hue that reads on both themes (same as the GPU module's ORANGE). */
export const SECOND = "#e8924a";

/** One-line muted disclaimer every simulator shows. */
export function ToyNote({ children }: { children?: React.ReactNode }) {
  return <p className="text-xs leading-snug text-ink-3">{children ?? "Toy model: ideal parts, simplified physics."}</p>;
}

/** Wrapping segmented control (every segment at least 40px). */
export function Seg<T extends string | number>({
  options,
  value,
  onChange,
  label,
  className = "",
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
  className?: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className={`inline-flex max-w-full flex-wrap rounded-3xl border border-line bg-surface-2 p-0.5 ${className}`}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.value)}
            className={`min-h-10 min-w-10 flex-auto whitespace-nowrap rounded-full px-3 text-xs font-medium transition-colors sm:text-[0.8rem] ${
              on ? "bg-surface text-ink shadow-[0_0_0_1px_var(--line-strong)]" : "text-ink-3 hover:text-ink"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export interface PlotSeries {
  points: [number, number][];
  color?: string;
  dashed?: boolean;
  label?: string;
}
export interface PlotTick {
  value: number;
  label: string;
}
export interface PlotMarker {
  x?: number;
  y?: number;
  label?: string;
  color?: string;
}
export interface PlotProps {
  width?: number;
  height?: number;
  x: [number, number];
  y: [number, number];
  xLog?: boolean;
  yLog?: boolean;
  series: PlotSeries[];
  xTicks?: PlotTick[];
  yTicks?: PlotTick[];
  markers?: PlotMarker[];
  xLabel?: string;
  yLabel?: string;
  ariaLabel: string;
}

const r2 = (n: number) => (Math.round(n * 100) / 100).toFixed(2).replace(/\.?0+$/, "");

/** Scope / Bode style line chart. Scales to its container; log axes skip non-positive values; out-of-range points are clipped. */
export function Plot({ width = 360, height = 200, x, y, xLog, yLog, series, xTicks = [], yTicks = [], markers = [], xLabel, yLabel, ariaLabel }: PlotProps) {
  const clipId = `plot-${useId().replace(/:/g, "")}`;
  const L = 44;
  const R = 10;
  const T = 10;
  const B = 34;
  const pw = width - L - R;
  const ph = height - T - B;
  const tx = (v: number) => (xLog ? Math.log10(v) : v);
  const ty = (v: number) => (yLog ? Math.log10(v) : v);
  const ok = (v: number, log?: boolean) => Number.isFinite(v) && (!log || v > 0);
  const x0 = tx(x[0]);
  const x1 = tx(x[1]);
  const y0 = ty(y[0]);
  const y1 = ty(y[1]);
  const px = (v: number) => L + ((tx(v) - x0) / (x1 - x0 || 1)) * pw;
  const py = (v: number) => T + ph - ((ty(v) - y0) / (y1 - y0 || 1)) * ph;
  const inX = (v: number) => ok(v, xLog) && px(v) >= L - 0.5 && px(v) <= L + pw + 0.5;
  const inY = (v: number) => ok(v, yLog) && py(v) >= T - 0.5 && py(v) <= T + ph + 0.5;
  const FS = 14;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" role="img" aria-label={ariaLabel} style={{ display: "block", maxWidth: "100%", height: "auto" }}>
      <defs>
        <clipPath id={clipId}>
          <rect x={r2(L)} y={r2(T)} width={r2(pw)} height={r2(ph)} />
        </clipPath>
      </defs>
      <rect x={r2(L)} y={r2(T)} width={r2(pw)} height={r2(ph)} fill="none" stroke="var(--line-strong)" />
      {xTicks.filter((t) => inX(t.value)).map((t) => (
        <g key={`x${t.value}`}>
          <line x1={r2(px(t.value))} x2={r2(px(t.value))} y1={r2(T)} y2={r2(T + ph)} stroke="var(--line)" />
          <text x={r2(px(t.value))} y={r2(T + ph + 16)} textAnchor="middle" fontSize={FS} fill="var(--ink-3)">{t.label}</text>
        </g>
      ))}
      {yTicks.filter((t) => inY(t.value)).map((t) => (
        <g key={`y${t.value}`}>
          <line x1={r2(L)} x2={r2(L + pw)} y1={r2(py(t.value))} y2={r2(py(t.value))} stroke="var(--line)" />
          <text x={r2(L - 5)} y={r2(py(t.value) + 5)} textAnchor="end" fontSize={FS} fill="var(--ink-3)">{t.label}</text>
        </g>
      ))}
      <g clipPath={`url(#${clipId})`}>
        {markers.map((m, i) => {
          const c = m.color ?? "var(--ink-2)";
          if (m.x !== undefined && inX(m.x)) {
            return <line key={`m${i}`} x1={r2(px(m.x))} x2={r2(px(m.x))} y1={r2(T)} y2={r2(T + ph)} stroke={c} strokeDasharray="4 3" />;
          }
          if (m.y !== undefined && inY(m.y)) {
            return <line key={`m${i}`} x1={r2(L)} x2={r2(L + pw)} y1={r2(py(m.y))} y2={r2(py(m.y))} stroke={c} strokeDasharray="4 3" />;
          }
          return null;
        })}
        {series.map((s, i) => {
          let d = "";
          let pen = false;
          for (const [a, b] of s.points) {
            if (!ok(a, xLog) || !ok(b, yLog)) {
              pen = false;
              continue;
            }
            d += `${pen ? "L" : "M"}${r2(px(a))} ${r2(py(b))}`;
            pen = true;
          }
          return <path key={i} d={d} fill="none" stroke={s.color ?? "var(--brand)"} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" strokeDasharray={s.dashed ? "6 4" : undefined} />;
        })}
      </g>
      {markers.map((m, i) => {
        if (!m.label) return null;
        const c = m.color ?? "var(--ink-2)";
        if (m.x !== undefined && inX(m.x)) {
          const mx = px(m.x);
          const right = mx < L + pw / 2;
          return <text key={`l${i}`} x={r2(mx + (right ? 4 : -4))} y={r2(T + FS)} textAnchor={right ? "start" : "end"} fontSize={FS} fill={c}>{m.label}</text>;
        }
        if (m.y !== undefined && inY(m.y)) {
          return <text key={`l${i}`} x={r2(L + pw - 4)} y={r2(py(m.y) - 4)} textAnchor="end" fontSize={FS} fill={c}>{m.label}</text>;
        }
        return null;
      })}
      {xLabel && <text x={r2(L + pw / 2)} y={r2(height - 3)} textAnchor="middle" fontSize={FS} fill="var(--ink-2)">{xLabel}</text>}
      {yLabel && <text x={r2(L + 5)} y={r2(T + ph - 6)} textAnchor="start" fontSize={FS} fill="var(--ink-2)">{yLabel}</text>}
    </svg>
  );
}
