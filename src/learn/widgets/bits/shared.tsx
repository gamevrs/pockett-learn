import React from "react";

/** Small helpers shared by the module-1 widgets. */

export const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

export const toHex = (n: number, digits = 2) => n.toString(16).toUpperCase().padStart(digits, "0");

export const toBin = (n: number, digits = 8) => n.toString(2).padStart(digits, "0");

/** Number of 1 bits. */
export const popcount = (n: number) => {
  let c = 0;
  for (let v = n; v; v >>>= 1) c += v & 1;
  return c;
};

/** A rounded label/value pill, e.g. "Decimal 13". */
export function Readout({ label, value, strong }: { label: string; value: React.ReactNode; strong?: boolean }) {
  return (
    <span className={`inline-flex items-baseline gap-2 rounded-full border px-3 py-1 ${strong ? "border-[var(--brand)]/50 bg-tint" : "border-line bg-surface"}`}>
      <span className="text-xs text-ink-3">{label}</span>
      <span className="font-mono font-semibold tabular-nums text-ink">{value}</span>
    </span>
  );
}

/** Segmented control (two to four options), 40px tall. */
export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  label,
  disabled,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-full border border-line bg-surface-2 p-0.5">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={on}
            disabled={disabled}
            onClick={() => onChange(o.value)}
            className={`min-h-10 rounded-full px-3.5 text-xs font-medium transition-colors sm:text-[0.8rem] ${
              on ? "bg-surface text-ink shadow-[0_0_0_1px_var(--line-strong)]" : "text-ink-3 hover:text-ink"
            } disabled:cursor-default`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
