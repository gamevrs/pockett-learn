"use client";

/** Shared kit for the "Building real products" widgets: the computer module's controls plus a labelled slider and a wrapping segmented control. */
import React from "react";

export { Btn, Caption, Field, Note, Readout, Stepper } from "../computer/ui";
export { Meter, Slider } from "../ai/ui";

/** Second data hue that reads on both themes. */
export const ORANGE = "#e8924a";
export const BLUE = "#4fa3df";
export const AMBER = "#d9a21b";

/** Segmented control whose segments wrap on narrow screens, 40px tall. */
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
            className={`min-h-10 min-w-10 flex-auto rounded-full px-3 text-xs font-medium transition-colors sm:text-[0.8rem] ${
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

/** A small "this is a toy" line every simulator carries. */
export function Toy({ children }: { children: React.ReactNode }) {
  return <p className="mt-3 text-[0.78rem] leading-snug text-ink-3">{children}</p>;
}

/** A card-style option button used for pick-one lists (radio semantics). */
export function Choice({
  selected,
  onClick,
  title,
  sub,
  className = "",
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  sub?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onClick}
      className={`min-h-10 w-full rounded-xl border px-3 py-2 text-left transition-colors ${
        selected ? "border-[var(--brand)] bg-tint" : "border-line bg-surface hover:bg-surface-2"
      } ${className}`}
    >
      <span className="block text-[0.88rem] font-medium leading-snug text-ink">{title}</span>
      {sub && <span className="mt-0.5 block text-xs leading-snug text-ink-3">{sub}</span>}
    </button>
  );
}

export const money = (n: number) => `$${n.toFixed(2)}`;
