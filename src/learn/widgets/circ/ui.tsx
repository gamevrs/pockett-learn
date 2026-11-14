"use client";

/** Shared kit for the circuits widgets: the same small controls as the other modules, plus a few circuit-specific helpers. */
import React from "react";
import { Schematic, type SchematicProps, type WireSpec } from "../elec-kit/Schematic";
import { formatSI } from "../elec-kit/format";
import { RES_STEPS } from "./logic";

export { Btn, Caption, Readout } from "../computer/ui";
export { Note } from "../net/ui";
export { Meter, Slider } from "../ai/ui";
export { Seg } from "../gpu/ui";

/** "9 V", "4.5 mA", "1.2 kΩ": three significant digits, SI prefixes. */
export const volts = (v: number) => formatSI(v, "V");
export const amps = (i: number) => formatSI(i, "A");
export const ohms = (r: number) => formatSI(r, "Ω");
export const watts = (p: number) => formatSI(p, "W");

/**
 * The shared schematic, wrapped so dots speed up and slow down against a fixed scale: `flowRef` is the current (any unit) that moves the dots at
 * full speed. A tiny wire carrying that reference is parked just outside the drawing and clipped away by the wrapper. Keep a one-cell margin
 * around the parts so nothing real is clipped.
 */
export function Sch({ flowRef, overlay, ...props }: SchematicProps & { flowRef?: number; overlay?: React.ReactNode }) {
  const ref: WireSpec | null = flowRef ? { points: [[-3, -3], [-3, -2]], flow: flowRef } : null;
  return (
    <div className="relative overflow-hidden">
      <Schematic {...props} wires={ref ? [...(props.wires ?? []), ref] : props.wires} />
      {overlay && (
        <svg viewBox={`0 0 ${props.cols * 20} ${props.rows * 20}`} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
          {overlay}
        </svg>
      )}
    </div>
  );
}

/** A slider over a ladder of resistor values (index based, so the steps are evenly spaced). */
export function ResistorSlider({
  label,
  value,
  onChange,
  steps = RES_STEPS,
  disabled,
}: {
  label: string;
  value: number;
  onChange: (ohms: number) => void;
  steps?: number[];
  disabled?: boolean;
}) {
  const idx = Math.max(0, steps.indexOf(value));
  return (
    <label className="block">
      <span className="flex items-baseline justify-between gap-2 text-xs text-ink-3">
        <span>{label}</span>
        <span className="font-mono text-[12.5px] font-semibold tabular-nums text-ink">{ohms(value)}</span>
      </span>
      <input
        type="range"
        min={0}
        max={steps.length - 1}
        step={1}
        value={idx}
        disabled={disabled}
        aria-label={label}
        aria-valuetext={ohms(value)}
        onChange={(e) => onChange(steps[Number(e.target.value)])}
        className="mt-1 h-10 w-full cursor-pointer accent-[var(--brand)] disabled:cursor-not-allowed disabled:opacity-50"
      />
    </label>
  );
}

/** The honest label every simulator wears. */
export function ToyNote({ children }: { children?: React.ReactNode }) {
  return <p className="mt-2 text-center text-xs text-ink-3">{children ?? "A toy model: ideal wires and parts, no temperature effects."}</p>;
}
