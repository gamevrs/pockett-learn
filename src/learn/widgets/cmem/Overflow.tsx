"use client";

import React, { useState } from "react";
import { ShieldCheck, TriangleAlert } from "lucide-react";
import type { WidgetProps } from "@/learn/widget";
import { byteHex, charOf, CPane, hex, Readout } from "./shared";

export interface OverflowProps {
  /** Buffer size in bytes (default 8). */
  size?: number;
  /** Buffer name (default "name"). */
  name?: string;
  /** The int stored right after the buffer (default is_admin = 0). */
  neighbour?: string;
  /** Show the switch between strcpy and a size-limited copy. */
  allowSafe?: boolean;
  /** Start with the size-limited copy. */
  safe?: boolean;
  /** Address of the buffer (default 0x7FE0). */
  base?: number;
  label?: string;
}

export interface OverflowState {
  inputLen: number;
  /** Bytes the copy wrote, including the '\0'. */
  written: number;
  /** The copy wrote past the end of the buffer. */
  overflowed: boolean;
  /** The neighbour's value changed. */
  changed: boolean;
  safe: boolean;
}

const EXTRA = 4;

/** Type into a fixed-size buffer: too much input spills into the variable next to it, unless the copy is bounded. */
export function Overflow({ props, onChange, revealed }: WidgetProps<OverflowProps>) {
  const size = props.size ?? 8;
  const name = props.name ?? "name";
  const nb = props.neighbour ?? "is_admin";
  const base = props.base ?? 0x7fe0;
  const total = size + 4 + EXTRA;
  const [input, setInput] = useState("");
  const [safe, setSafe] = useState(Boolean(props.safe));
  const locked = Boolean(revealed);

  const copy = (text: string, isSafe: boolean) => {
    const chars = [...text].map((c) => c.charCodeAt(0) & 0xff);
    const kept = isSafe ? chars.slice(0, size - 1) : chars;
    return [...kept, 0];
  };
  const written = copy(input, safe);
  const mem: (number | null)[] = Array.from({ length: total }, (_, k) => (k < size ? null : k < size + 4 ? 0 : null));
  written.forEach((b, k) => {
    if (k < total) mem[k] = b;
  });
  const nbBytes = mem.slice(size, size + 4).map((b) => b ?? 0);
  const nbValue = nbBytes.reduce((v, b, k) => v + b * 2 ** (8 * k), 0) | 0;
  const overflowed = written.length > size;

  const report = (text: string, isSafe: boolean) => {
    const w = copy(text, isSafe);
    const nbv = w.slice(size, size + 4).some((b) => b !== 0);
    onChange?.({ inputLen: text.length, written: w.length, overflowed: w.length > size, changed: nbv, safe: isSafe } satisfies OverflowState);
  };

  const code = safe
    ? `char ${name}[${size}];\nint ${nb} = 0;\nsnprintf(${name}, sizeof ${name}, "%s", input);\nif (${nb}) { /* trusted-user features */ }`
    : `char ${name}[${size}];\nint ${nb} = 0;\nstrcpy(${name}, input);   // copies until '\\0'\nif (${nb}) { /* trusted-user features */ }`;

  return (
    <div className="w-full min-w-0">
      {props.label && <p className="mb-3 text-center text-xs font-medium text-ink-3">{props.label}</p>}
      <CPane code={code} title="login.c" current={3} />

      <div className="mt-4 flex flex-wrap items-end gap-2">
        <label className="min-w-0 flex-1">
          <span className="mb-1 block text-xs font-medium text-ink-3">input (typed by the user)</span>
          <input
            type="text"
            value={input}
            maxLength={total - 1}
            disabled={locked}
            onChange={(e) => {
              const t = e.target.value.replace(/[^\x20-\x7e]/g, "");
              setInput(t);
              report(t, safe);
            }}
            placeholder="Type a name"
            spellCheck={false}
            autoComplete="off"
            className="h-11 w-full rounded-xl border border-line bg-surface px-3 font-mono text-[0.95rem] text-ink outline-none focus:border-[var(--brand)]"
          />
        </label>
        {props.allowSafe && (
          <button
            type="button"
            className={`btn !h-11 ${safe ? "btn-primary" : ""}`}
            disabled={locked}
            aria-pressed={safe}
            onClick={() => {
              setSafe(!safe);
              report(input, !safe);
            }}
          >
            <ShieldCheck className="h-4 w-4" /> {safe ? "Bounded copy on" : "Use a bounded copy"}
          </button>
        )}
      </div>

      <div className="mt-4 overflow-x-auto pb-1">
        <div className="mx-auto flex w-max items-stretch gap-2">
          {[
            { label: `${name}[${size}]`, from: 0, to: size, kind: "buf" },
            { label: `int ${nb}`, from: size, to: size + 4, kind: "nb" },
            { label: "other memory", from: size + 4, to: total, kind: "other" },
          ].map((g) => (
            <div key={g.kind} className="flex flex-col">
              <span className={`mb-1 rounded-t-md px-1.5 font-mono text-[0.65rem] font-semibold ${g.kind === "nb" && nbValue !== 0 ? "bg-[var(--bad)] text-white" : g.kind === "buf" ? "bg-surface-2 text-ink-2" : "text-ink-3"}`}>
                {g.label}
              </span>
              <div className="flex">
                {mem.slice(g.from, g.to).map((b, j) => {
                  const k = g.from + j;
                  const spilled = k >= size && k < written.length;
                  return (
                    <span
                      key={k}
                      className={`-ml-px flex h-11 w-[1.95rem] flex-col items-center justify-center border font-mono first:ml-0 ${
                        spilled ? "relative z-10 border-[var(--bad)] bg-surface text-bad" : k < written.length ? "border-[var(--brand)]/60 bg-tint text-ink" : g.kind === "other" ? "border-dashed border-line text-ink-3" : "border-[var(--line-strong)] bg-surface-2 text-ink-2"
                      }`}
                      title={hex(base + k)}
                    >
                      <span className="text-[0.75rem] font-semibold">{b === null ? "?" : charOf(b)}</span>
                      <span className="text-[0.55rem] opacity-70">{b === null ? "??" : byteHex(b)}</span>
                    </span>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        <Readout label="bytes written" value={`${written.length} of ${size}`} bad={overflowed} strong={!overflowed && input.length > 0} />
        <Readout label={nb} value={nbValue} bad={nbValue !== 0} />
      </div>
      <p className={`mt-2 flex min-h-[2.75rem] items-start justify-center gap-1.5 text-center text-sm leading-snug ${overflowed ? "text-bad" : "text-ink-2"}`} aria-live="polite">
        {overflowed && <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />}
        <span>
          {input.length === 0
            ? `${name} has room for ${size - 1} characters plus the '\\0'.`
            : !overflowed
              ? safe && input.length > size - 1
                ? `The bounded copy kept ${size - 1} characters and the '\\0', and dropped the rest. ${nb} is safe.`
                : `Fits: ${input.length} character${input.length === 1 ? "" : "s"} + '\\0' = ${written.length} bytes.`
              : nbValue !== 0
                ? `strcpy wrote ${written.length} bytes into a ${size}-byte array. The extra bytes landed in ${nb}, which is no longer 0, so the program now treats this user as trusted.`
                : `strcpy wrote ${written.length} bytes into ${size}: already past the end, even though ${nb} still happens to read 0.`}
        </span>
      </p>
    </div>
  );
}

export function checkOverflow(state: unknown, goal: Record<string, unknown>) {
  const s = state as OverflowState | undefined;
  if (!s) return false;
  if (goal.overflowed !== undefined && s.overflowed !== goal.overflowed) return false;
  if (goal.changed !== undefined && s.changed !== goal.changed) return false;
  if (goal.safe !== undefined && s.safe !== goal.safe) return false;
  if (typeof goal.minInput === "number" && s.inputLen < goal.minInput) return false;
  return true;
}
