"use client";

import React from "react";

/** Shared kit for the semiconductor widgets: the computer module's controls, the AI slider, the memory module's wrapping pills. */
export { Btn, Caption, Note, Readout } from "../computer/ui";
export { Slider, Meter } from "../ai/ui";
export { Seg } from "../memsys/ui";
export { formatSI } from "../elec-kit/format";

/** Second data hues that read on both themes (the GPU module's pair). */
export const ORANGE = "#e8924a";
export const BLUE = "#4fa3df";

const SUP: Record<string, string> = { "-": "⁻", "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹" };

/** 1.2 × 10¹⁶ style; plain digits between 0.01 and 10,000. */
export function sci(v: number, digits = 2): string {
  if (!isFinite(v)) return "∞";
  if (v === 0) return "0";
  const a = Math.abs(v);
  if (a >= 0.01 && a < 1e4) return (+v.toPrecision(digits + 1)).toLocaleString("en-US");
  const e = Math.floor(Math.log10(a));
  const m = v / 10 ** e;
  const ms = +m.toFixed(digits - 1);
  // 9.96 rounds to 10.0: carry into the exponent
  if (Math.abs(ms) >= 10) return `${(ms / 10).toFixed(digits - 1)} × 10${String(e + 1).split("").map((c) => SUP[c]).join("")}`;
  return `${ms.toFixed(digits - 1)} × 10${String(e).split("").map((c) => SUP[c]).join("")}`;
}

/** A plain whole number with thousands separators. */
export const whole = (v: number) => Math.round(v).toLocaleString("en-US");

/** Dollars: $12.34 below 100, $1,234 above. */
export const usd = (v: number) => (!isFinite(v) ? "–" : v < 100 ? `$${v.toFixed(2)}` : `$${whole(v)}`);

/** The "this is a toy" line every simulator carries. */
export function Toy({ children }: { children: React.ReactNode }) {
  return <p className="mt-2 text-xs leading-snug text-ink-3">{children}</p>;
}
