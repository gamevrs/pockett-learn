import React from "react";

/**
 * A Python value as plain lesson data:
 * - number → int, string → str (drawn in quotes), boolean → True/False, null → None
 * - array → a list drawn inline, e.g. [7, 9, 4]
 * - { ref: n } → a reference to heap object #n
 * - { py: "3.5" } → any literal shown exactly as written (floats, tuples…)
 * - { fn: "square" } → a function
 */
export type Val = string | number | boolean | null | Val[] | { ref: number } | { py: string } | { fn: string };

export function isRef(v: Val): v is { ref: number } {
  return typeof v === "object" && v !== null && !Array.isArray(v) && "ref" in v;
}

/** Python-style text for a value (strings in double quotes, the way lessons write them). */
export function formatVal(v: Val): string {
  if (v === null) return "None";
  if (typeof v === "boolean") return v ? "True" : "False";
  if (typeof v === "number") return String(v);
  if (typeof v === "string") return JSON.stringify(v);
  if (Array.isArray(v)) return `[${v.map(formatVal).join(", ")}]`;
  if ("ref" in v) return `→ #${v.ref}`;
  if ("py" in v) return v.py;
  return `function ${v.fn}`;
}

/** A value drawn for the variable boxes: references become a "→ #n" chip pointing at a heap card. */
export function ValueView({ v }: { v: Val }) {
  if (isRef(v)) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-tint px-1.5 py-0.5 font-mono text-[0.8rem] font-semibold text-brand">
        <span aria-hidden>→</span>
        <span>
          <span className="sr-only">object </span>#{v.ref}
        </span>
      </span>
    );
  }
  if (typeof v === "object" && v !== null && !Array.isArray(v) && "fn" in v) {
    return <span className="font-mono text-[0.8rem] italic text-ink-3">function</span>;
  }
  return <span className="font-mono text-[0.9rem] font-medium text-ink">{formatVal(v)}</span>;
}

/** A labelled box: the variable name on a tab, the value inside. `compact` draws one slim row (for stack frames). */
export function VarBox({ name, value, changed, compact }: { name: string; value: Val; changed?: boolean; compact?: boolean }) {
  if (compact) {
    return (
      <span className={`inline-flex min-h-9 max-w-full items-stretch overflow-hidden rounded-lg border transition-colors ${changed ? "border-[var(--brand)]" : "border-line"}`}>
        <span className={`flex items-center px-2 font-mono text-[0.7rem] font-semibold ${changed ? "bg-primary text-primary-ink" : "bg-surface-2 text-ink-2"}`}>{name}</span>
        <span className={`flex items-center px-2.5 py-1 break-all ${changed ? "bg-tint" : "bg-surface"}`}>
          <ValueView v={value} />
        </span>
      </span>
    );
  }
  return (
    <div className="flex min-w-[4.5rem] max-w-full flex-col">
      <span className={`w-fit max-w-full truncate rounded-t-md px-2 py-0.5 font-mono text-[0.7rem] font-semibold ${changed ? "bg-primary text-primary-ink" : "bg-surface-2 text-ink-2"}`}>{name}</span>
      <span
        className={`flex min-h-10 items-center rounded-b-lg rounded-tr-lg border px-2.5 py-1.5 break-all transition-colors ${
          changed ? "border-[var(--brand)] bg-tint" : "border-line bg-surface"
        }`}
      >
        <ValueView v={value} />
      </span>
    </div>
  );
}

/** Small section label used across the program widgets. */
export function PanelLabel({ children }: { children: React.ReactNode }) {
  return <p className="mb-2 text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-ink-3">{children}</p>;
}

/** A − value + stepper with 40px targets. */
export function Stepper({
  label,
  value,
  min,
  max,
  onChange,
  disabled,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-1 rounded-full border border-line bg-surface p-0.5">
      <button type="button" className="grid h-10 w-10 place-items-center rounded-full text-lg text-ink-2 hover:bg-surface-2 hover:text-ink disabled:opacity-30" onClick={() => onChange(value - 1)} disabled={disabled || value <= min} aria-label={`Decrease ${label}`}>
        −
      </button>
      <span className="min-w-[3.25rem] text-center">
        <span className="block text-[0.65rem] leading-none text-ink-3">{label}</span>
        <span className="font-mono text-base font-semibold tabular-nums">{value}</span>
      </span>
      <button type="button" className="grid h-10 w-10 place-items-center rounded-full text-lg text-ink-2 hover:bg-surface-2 hover:text-ink disabled:opacity-30" onClick={() => onChange(value + 1)} disabled={disabled || value >= max} aria-label={`Increase ${label}`}>
        +
      </button>
    </div>
  );
}

/** Dark code surface that matches lesson code blocks in both themes. */
export const CODE_SURFACE = "rounded-xl border border-white/10 bg-[#0a0a0a] text-[#e5e5e5]";
