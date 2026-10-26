"use client";

import React from "react";

/** The security widgets share the networking module's small kit, plus a few pieces of their own. */
export { Caption, Note, Pill, Readout, Segmented, noise, shuffle, sameSet } from "../net/ui";

/** A mono "request line" or code snippet box that wraps on narrow screens. */
export function Mono({ children, tone = "plain", className = "" }: { children: React.ReactNode; tone?: "plain" | "good" | "bad"; className?: string }) {
  const border = tone === "bad" ? "border-[var(--bad)]/50" : tone === "good" ? "border-[var(--brand)]/50" : "border-line";
  return <div className={`break-words rounded-lg border bg-surface px-2.5 py-1.5 font-mono text-[12px] leading-snug text-ink ${border} ${className}`}>{children}</div>;
}

/** A small coloured status label: ok, blocked, leak... */
export function Tag({ tone, children }: { tone: "good" | "bad" | "warn" | "muted"; children: React.ReactNode }) {
  const styles = {
    good: "border-[var(--good)]/45 bg-[var(--good)]/[0.1] text-ink",
    bad: "border-[var(--bad)]/50 bg-[var(--bad)]/[0.09] text-ink",
    warn: "border-[#d9a21b]/60 bg-[#d9a21b]/[0.12] text-ink",
    muted: "border-line bg-surface-2 text-ink-2",
  } as const;
  return <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 font-mono text-[11px] font-semibold ${styles[tone]}`}>{children}</span>;
}

/** An on/off switch with a label, 40px tall. */
export function Toggle({ on, onClick, disabled, children }: { on: boolean; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex min-h-10 items-center gap-2 rounded-full border px-3 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
        on ? "border-[var(--brand)]/60 bg-tint text-ink" : "border-line bg-surface text-ink-2 hover:text-ink"
      }`}
    >
      <span className={`relative h-4 w-7 shrink-0 rounded-full transition-colors ${on ? "bg-primary" : "bg-[var(--line-strong)]"}`}>
        <span className={`absolute top-0.5 h-3 w-3 rounded-full bg-white shadow transition-all ${on ? "left-3.5" : "left-0.5"}`} />
      </span>
      {children}
    </button>
  );
}
