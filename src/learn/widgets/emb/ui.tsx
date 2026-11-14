"use client";

/** Shared kit for the "Programming chips" widgets: the Hardware path's controls (wrapping Seg) plus small helpers. */
import React from "react";

export { Btn, Caption, Field, Note, Readout, Stepper, clamp } from "../computer/ui";
export { Seg, ORANGE, BLUE } from "../gpu/ui";
export { Slider, Meter } from "../ai/ui";
export { useReducedMotion } from "../explain/useReducedMotion";

/** A short line under a simulator saying it is a toy. */
export function ToyNote({ children }: { children: React.ReactNode }) {
  return <p className="mt-2 text-center text-[0.78rem] leading-snug text-ink-3">{children}</p>;
}

/** Seconds as a friendly unit (s, ms, µs, ns). */
export function fmtSec(s: number): string {
  const a = Math.abs(s);
  if (a >= 1) return `${+s.toFixed(a >= 100 ? 0 : 2)} s`;
  if (a >= 1e-3) return `${+(s * 1e3).toFixed(a >= 0.1 ? 0 : 2)} ms`;
  if (a >= 1e-6) return `${+(s * 1e6).toFixed(a >= 1e-4 ? 0 : 2)} µs`;
  return `${+(s * 1e9).toFixed(1)} ns`;
}

/** Hertz with a prefix (Hz, kHz, MHz). */
export function fmtHz(hz: number): string {
  const a = Math.abs(hz);
  if (a >= 1e6) return `${+(hz / 1e6).toFixed(3)} MHz`;
  if (a >= 1e3) return `${+(hz / 1e3).toFixed(3)} kHz`;
  return `${+hz.toFixed(a >= 100 ? 1 : 3)} Hz`;
}

/** Current in A as mA / µA. */
export function fmtAmps(a: number): string {
  const x = Math.abs(a);
  if (x >= 1) return `${+a.toFixed(2)} A`;
  if (x >= 1e-3) return `${+(a * 1e3).toFixed(x >= 0.1 ? 0 : 2)} mA`;
  return `${+(a * 1e6).toFixed(x >= 1e-5 ? 1 : 2)} µA`;
}

/**
 * A digital trace drawn as a step line in an SVG <g>: `levels` are 0/1 (null draws a mid-level "undriven" dash),
 * spread across `width` starting at x, between y (high) and y + h (low).
 */
export function Trace({ levels, x, y, width, h = 18, color = "var(--brand)", label }: { levels: (0 | 1 | null)[]; x: number; y: number; width: number; h?: number; color?: string; label?: string }) {
  const n = Math.max(levels.length, 1);
  const dx = width / n;
  const yOf = (v: 0 | 1 | null) => (v === 1 ? y : v === 0 ? y + h : y + h / 2);
  let d = "";
  levels.forEach((v, i) => {
    const x0 = +(x + i * dx).toFixed(2);
    const x1 = +(x + (i + 1) * dx).toFixed(2);
    const yy = +yOf(v).toFixed(2);
    d += i === 0 ? `M${x0} ${yy}` : `L${x0} ${yy}`;
    d += `L${x1} ${yy}`;
  });
  return (
    <g>
      {label && (
        <text x={x - 6} y={y + h / 2 + 5} textAnchor="end" fontSize={14} fill="var(--ink-2)" fontFamily="var(--font-mono, monospace)">
          {label}
        </text>
      )}
      <path d={d} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" />
    </g>
  );
}
