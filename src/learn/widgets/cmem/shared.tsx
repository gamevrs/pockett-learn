"use client";

import React from "react";
import { CodeBlock } from "@/components/ui/Prose";

/** Shared helpers for the "C and memory" widgets: addresses, type sizes, bytes, code panes. */

export type CType = "char" | "int" | "double" | "ptr";

/** Sizes on a typical 64-bit computer. */
export const SIZE: Record<CType, number> = { char: 1, int: 4, double: 8, ptr: 8 };

export const TYPE_LABEL: Record<CType, string> = { char: "char", int: "int", double: "double", ptr: "pointer" };

/** 0x1004-style address (uppercase hex, at least 4 digits). */
export const hex = (n: number, digits = 4) => `0x${n.toString(16).toUpperCase().padStart(digits, "0")}`;

/** One byte as two hex digits. */
export const byteHex = (b: number) => (b & 0xff).toString(16).toUpperCase().padStart(2, "0");

/** Little-endian bytes of an integer (lowest byte first), `size` bytes long. Works for negatives too. */
export function leBytes(value: number, size: number): number[] {
  const out: number[] = [];
  let v = BigInt.asUintN(size * 8, BigInt(Math.trunc(value)));
  for (let i = 0; i < size; i++) {
    out.push(Number(v & BigInt(0xff)));
    v >>= BigInt(8);
  }
  return out;
}

/** Bytes of a double (IEEE 754), little-endian. */
export function doubleBytes(value: number): number[] {
  const buf = new DataView(new ArrayBuffer(8));
  buf.setFloat64(0, value, true);
  return Array.from({ length: 8 }, (_, i) => buf.getUint8(i));
}

/** Character for a byte, or a readable escape. */
export function charOf(b: number): string {
  if (b === 0) return "\\0";
  if (b === 32) return "␠";
  if (b === 10) return "\\n";
  if (b > 32 && b < 127) return String.fromCharCode(b);
  return "·";
}

/** Small uppercase section label. */
export function Label({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <p className={`mb-2 text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-ink-3 ${className}`}>{children}</p>;
}

/** Dark code surface that matches lesson code blocks in both themes. */
export const CODE_SURFACE = "rounded-xl border border-white/10 bg-[#0a0a0a] text-[#e5e5e5]";

/** A C code pane with line numbers; `current` (1-based) gets the accent bar. */
export function CPane({ code, current, title, className = "" }: { code: string; current?: number | null; title?: string; className?: string }) {
  const lines = code.replace(/\n$/, "").split("\n");
  return (
    <div className={`${CODE_SURFACE} min-w-0 overflow-hidden ${className}`}>
      {title && <div className="border-b border-white/10 px-3 py-1.5 font-mono text-[11px] text-white/55">{title}</div>}
      <ol className="overflow-x-auto py-2 font-mono text-[0.78rem] leading-[1.65] sm:text-[0.84rem]">
        {lines.map((text, i) => {
          const n = i + 1;
          const on = current === n;
          return (
            <li key={n} className={`flex min-w-max ${on ? "bg-[rgba(163,230,53,0.16)]" : ""}`} aria-current={on ? "step" : undefined}>
              <span className={`w-1 shrink-0 ${on ? "bg-[#a3e635]" : ""}`} aria-hidden />
              <span className={`w-8 shrink-0 select-none pr-3 text-right tabular-nums ${on ? "text-[#a3e635]" : "text-white/35"}`}>{n}</span>
              <span className="whitespace-pre pr-4">{text ? <CodeBlock code={text} language="cpp" /> : " "}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/** Pill button, 40px tall; `on` fills it with the accent. */
export function Pill({
  on,
  onClick,
  disabled,
  children,
  label,
  mono,
  className = "",
}: {
  on?: boolean;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  label?: string;
  mono?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={on}
      aria-label={label}
      className={`inline-flex min-h-10 items-center justify-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
        mono ? "font-mono text-[0.8rem]" : ""
      } ${on ? "border-transparent bg-primary text-primary-ink" : "border-line bg-surface text-ink hover:border-[var(--line-strong)] hover:bg-surface-2"} ${className}`}
    >
      {children}
    </button>
  );
}

/** A label/value pill, e.g. "&x 0x1004". */
export function Readout({ label, value, strong, bad }: { label: React.ReactNode; value: React.ReactNode; strong?: boolean; bad?: boolean }) {
  return (
    <span
      className={`inline-flex items-baseline gap-2 rounded-full border px-3 py-1 ${
        bad ? "border-[var(--bad)]/50 bg-surface" : strong ? "border-[var(--brand)]/50 bg-tint" : "border-line bg-surface"
      }`}
    >
      <span className="font-mono text-xs text-ink-3">{label}</span>
      <span className={`font-mono text-sm font-semibold tabular-nums ${bad ? "text-bad" : "text-ink"}`}>{value}</span>
    </span>
  );
}

/** "→ 0x1004" chip for a pointer value. */
export function PtrChip({ addr, dangling, active, onClick }: { addr: number; dangling?: boolean; active?: boolean; onClick?: () => void }) {
  const cls = `inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-mono text-[0.78rem] font-semibold ${
    dangling ? "border border-dashed border-[var(--bad)]/60 text-bad" : active ? "bg-primary text-primary-ink" : "bg-tint text-brand"
  }`;
  const body = (
    <>
      <span aria-hidden>→</span>
      {addr === 0 ? "NULL" : hex(addr)}
    </>
  );
  if (!onClick) return <span className={cls}>{body}</span>;
  return (
    <button type="button" onClick={onClick} className={`${cls} min-h-8`} aria-label={`Pointer to ${addr === 0 ? "NULL" : hex(addr)}`} aria-pressed={active}>
      {body}
    </button>
  );
}
