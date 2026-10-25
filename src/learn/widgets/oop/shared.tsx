"use client";

import React from "react";
import { CodeBlock } from "@/components/ui/Prose";

/** A dark code panel, same look as code blocks in lesson text (works on light and dark cards). */
export function Code({ code, className = "" }: { code: string; className?: string }) {
  return (
    <pre className={`overflow-x-auto rounded-xl border border-white/10 bg-[#0a0a0a] px-3.5 py-3 font-mono text-[0.78rem] leading-relaxed text-[#e5e5e5] ${className}`}>
      <CodeBlock code={code} language="python" />
    </pre>
  );
}

/** Small uppercase caption over a widget region. */
export function Caption({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <p className={`eyebrow mb-2 ${className}`}>{children}</p>;
}

/** A value literal the way Python would print it. */
export function pyValue(v: unknown): string {
  if (typeof v === "string") return `"${v}"`;
  if (typeof v === "boolean") return v ? "True" : "False";
  if (v === null || v === undefined) return "None";
  return String(v);
}

/** Fake but stable memory address for an object, to make "separate objects" visible. */
export function address(seed: number): string {
  return `0x${(0x7f3a10 + seed * 0x58).toString(16)}`;
}
