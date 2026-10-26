import React from "react";
import { ALL_OPS } from "./machine";

/** Colours on the dark code surface (match the lesson code blocks). */
export const C = {
  op: "#c5ee8a",
  reg: "#7fd4ff",
  num: "#ffb86b",
  label: "#fcd34d",
  comment: "#8a8a8a",
};

const OPS = new Set<string>(ALL_OPS);

/** Syntax colours for one line of toy assembly. */
export function highlightAsm(line: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  const semi = line.indexOf(";");
  const body = semi >= 0 ? line.slice(0, semi) : line;
  const re = /([A-Za-z_][A-Za-z0-9_]*\s*:)|(\b[Rr]\d+\b)|(#\s*-?\d+|-?\b\d+\b)|([A-Za-z_][A-Za-z0-9_]*)/g;
  let last = 0;
  let k = 0;
  let sawOp = false;
  for (const m of body.matchAll(re)) {
    const idx = m.index ?? 0;
    if (idx > last) out.push(body.slice(last, idx));
    const [tok, label, reg, num, word] = m;
    const key = k++;
    if (label) out.push(<span key={key} style={{ color: C.label }}>{tok}</span>);
    else if (reg) out.push(<span key={key} style={{ color: C.reg }}>{tok}</span>);
    else if (num) out.push(<span key={key} style={{ color: C.num }}>{tok}</span>);
    else if (word && !sawOp) {
      sawOp = true;
      out.push(<span key={key} style={{ color: OPS.has(word.toUpperCase()) ? C.op : undefined, fontWeight: 600 }}>{tok}</span>);
    } else out.push(<span key={key} style={{ color: C.label }}>{tok}</span>);
    last = idx + tok.length;
  }
  if (last < body.length) out.push(body.slice(last));
  if (semi >= 0) out.push(<span key="c" style={{ color: C.comment }}>{line.slice(semi)}</span>);
  return out;
}

/** Signed numbers with a real minus sign. */
export const num = (v: number) => (v < 0 ? `−${-v}` : String(v));

export function PanelLabel({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="mb-2 flex items-center justify-between gap-2">
      <p className="text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-ink-3">{children}</p>
      {right}
    </div>
  );
}

/** A register-style box: a name tab on the left, the value on the right. */
export function RegBox({ name, value, changed, dim, wide }: { name: string; value: React.ReactNode; changed?: boolean; dim?: boolean; wide?: boolean }) {
  return (
    <span className={`flex min-h-10 min-w-0 items-stretch overflow-hidden rounded-lg border transition-colors ${changed ? "border-[var(--brand)]" : "border-line"} ${wide ? "col-span-2" : ""}`}>
      <span className={`flex w-9 shrink-0 items-center justify-center font-mono text-[0.7rem] font-semibold ${changed ? "bg-primary text-primary-ink" : "bg-surface-2 text-ink-2"}`}>{name}</span>
      <span className={`flex min-w-0 flex-1 items-center justify-end px-2.5 font-mono text-[0.95rem] font-medium tabular-nums ${changed ? "bg-tint text-ink" : dim ? "bg-surface text-ink-3" : "bg-surface text-ink"}`}>{value}</span>
    </span>
  );
}

/** A flag light: lit when the flag is 1. */
export function FlagLight({ name, on, title, changed }: { name: string; on: boolean; title: string; changed?: boolean }) {
  return (
    <span
      className={`inline-flex h-10 min-w-0 flex-1 items-center gap-2 rounded-lg border px-2.5 transition-colors ${on ? "border-[var(--brand)] bg-tint" : "border-line bg-surface"} ${changed ? "ring-2 ring-[var(--brand-soft)]" : ""}`}
      title={title}
    >
      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${on ? "bg-[var(--brand)]" : "bg-[var(--line-strong)]"}`} aria-hidden />
      <span className="font-mono text-xs font-semibold text-ink">{name}</span>
      <span className="ml-auto font-mono text-sm tabular-nums text-ink-2">{on ? 1 : 0}</span>
      <span className="sr-only">{title}</span>
    </span>
  );
}
