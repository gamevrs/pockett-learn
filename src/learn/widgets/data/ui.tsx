"use client";

import React from "react";

/**
 * A group of pill buttons that wraps onto several lines on narrow screens (the shared Segmented
 * switch never wraps, so long labels overflow at 320 px). Same props, so it can stand in for it.
 */
export function Choice<T extends string>({
  value,
  options,
  onChange,
  disabled,
  label,
  className = "",
}: {
  value: T;
  options: { id: T; label: string }[];
  onChange: (v: T) => void;
  disabled?: boolean;
  label: string;
  className?: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className={`flex max-w-full flex-wrap gap-1.5 ${className}`}>
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={value === o.id}
          disabled={disabled}
          onClick={() => onChange(o.id)}
          className={`min-h-10 rounded-full border px-3.5 text-[0.8rem] font-medium transition-colors disabled:cursor-default ${
            value === o.id ? "border-[var(--brand)] bg-tint text-ink" : "border-line bg-surface text-ink-3 hover:border-[var(--line-strong)] hover:text-ink"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
