"use client";

import React, { useState } from "react";
import { Check, Minus, User, Users, Globe } from "lucide-react";
import type { WidgetProps } from "@/learn/widget";
import { modeString, octal, parseMode } from "./shell";

export interface PermsProps {
  /** Starting permissions: "644", "rwxr-xr-x"… Default "644". */
  mode?: string;
  name?: string;
  kind?: "file" | "dir";
  owner?: string;
  group?: string;
  /** Show the octal number and the 4+2+1 sums. Default true. */
  octal?: boolean;
  /** Show the "who can do what" panel for three example people. Default false. */
  people?: boolean;
  /** Members of the group shown in the people panel (default "bob"). */
  member?: string;
  /** Someone outside the group (default "eve"). */
  outsider?: string;
  /** Read-only display. */
  locked?: boolean;
}

export interface PermsState {
  mode: string;
  string: string;
}

const CLASSES = [
  { id: "u", label: "Owner", Icon: User, shift: 6 },
  { id: "g", label: "Group", Icon: Users, shift: 3 },
  { id: "o", label: "Others", Icon: Globe, shift: 0 },
] as const;
const BITS = [
  { ch: "r", value: 4, word: "read" },
  { ch: "w", value: 2, word: "write" },
  { ch: "x", value: 1, word: "execute" },
] as const;

/** Toggle r/w/x for owner, group and others; see the ls -l string and the octal number change together. */
export function Perms({ props, onChange, revealed, status, goal }: WidgetProps<PermsProps>) {
  const [mode, setMode] = useState(() => parseMode(props.mode, 0o644));
  const locked = Boolean(props.locked || revealed);
  const kind = props.kind ?? "file";
  const name = props.name ?? (kind === "dir" ? "shared" : "notes.txt");
  const owner = props.owner ?? "ada";
  const group = props.group ?? "team";
  const showOctal = props.octal ?? true;
  const target = status === "revealed" && goal ? parseMode((goal.mode as string) ?? (goal.string as string), -1) : -1;
  const shown = target >= 0 ? target : mode;

  const toggle = (bit: number) => {
    if (locked) return;
    const next = mode ^ bit;
    setMode(next);
    onChange?.({ mode: octal(next), string: modeString(next) } satisfies PermsState);
  };

  const str = modeString(shown);
  const verbs = kind === "dir" ? { r: "list", w: "add or delete files in", x: "enter" } : { r: "read", w: "change", x: "run" };
  const people = [
    { who: owner, role: "the owner", shift: 6 },
    { who: props.member ?? "bob", role: `in group ${group}`, shift: 3 },
    { who: props.outsider ?? "eve", role: "anyone else", shift: 0 },
  ];

  return (
    <div className="w-full min-w-0">
      {/* the ls -l line */}
      <div className="overflow-x-auto rounded-xl border border-white/10 bg-[#0a0a0a] px-3 py-2.5 font-mono text-[13px] text-[#e5e5e5] sm:text-sm">
        <span className="whitespace-pre">
          <span className="text-white/50">{kind === "dir" ? "d" : "-"}</span>
          <span className="rounded-sm bg-[#c5ee8a]/20 text-[#e0f6c1]">{str.slice(0, 3)}</span>
          <span className="rounded-sm bg-[#7dd3fc]/15 text-[#bae6fd]">{str.slice(3, 6)}</span>
          <span className="rounded-sm bg-white/10 text-white/85">{str.slice(6)}</span>
          <span className="text-white/60">{` 1 ${owner} ${group} ${kind === "dir" ? 4096 : 120} Oct 25 09:14 `}</span>
          <span className={kind === "dir" ? "font-semibold text-[#7dd3fc]" : shown & 0o100 ? "font-semibold text-[#c5ee8a]" : ""}>{name}</span>
        </span>
      </div>

      <div className="mt-4 grid gap-2">
        <div className="grid grid-cols-[minmax(0,1fr)_repeat(3,2.5rem)_2.25rem] items-center gap-1.5 px-1 text-[11px] font-medium text-ink-3 sm:grid-cols-[minmax(7rem,1fr)_repeat(3,3.25rem)_6.5rem] sm:gap-2">
          <span />
          {BITS.map((b) => (
            <span key={b.ch} className="text-center">
              {b.word}
            </span>
          ))}
          {showOctal && <span className="text-right">digit</span>}
        </div>
        {CLASSES.map((c, ci) => {
          const digit = (shown >> c.shift) & 7;
          const tint = ci === 0 ? "bg-[#c5ee8a]/10" : ci === 1 ? "bg-[#7dd3fc]/10" : "bg-surface-2";
          return (
            <div key={c.id} className={`grid grid-cols-[minmax(0,1fr)_repeat(3,2.5rem)_2.25rem] items-center gap-1.5 rounded-xl px-1 py-1.5 sm:grid-cols-[minmax(7rem,1fr)_repeat(3,3.25rem)_6.5rem] sm:gap-2 ${tint}`}>
              <span className="flex min-w-0 items-center gap-1.5 pl-1.5 text-sm">
                <c.Icon className="h-4 w-4 shrink-0 text-ink-3" aria-hidden />
                <span className="min-w-0">
                  <span className="block font-medium text-ink">{c.label}</span>
                  <span className="block truncate font-mono text-[11px] text-ink-3">{ci === 0 ? owner : ci === 1 ? group : "everyone else"}</span>
                </span>
              </span>
              {BITS.map((b) => {
                const bit = b.value << c.shift;
                const on = Boolean(shown & bit);
                return (
                  <button
                    key={b.ch}
                    type="button"
                    onClick={() => toggle(bit)}
                    disabled={locked}
                    aria-pressed={on}
                    aria-label={`${c.label} ${b.word}`}
                    className={`grid h-11 place-items-center rounded-lg border font-mono text-base font-semibold transition-colors disabled:cursor-default ${
                      on ? "border-transparent bg-primary text-primary-ink" : "border-line bg-surface text-ink-3 hover:border-[var(--line-strong)]"
                    } ${target >= 0 && Boolean(mode & bit) !== on ? "ring-2 ring-[var(--brand)] ring-offset-1 ring-offset-[var(--surface)]" : ""}`}
                  >
                    {on ? b.ch : "-"}
                  </button>
                );
              })}
              {showOctal && (
                <span className="flex items-baseline justify-end gap-1.5 pr-2 font-mono tabular-nums">
                  <span className="hidden text-[11px] text-ink-3 sm:inline">
                    {BITS.filter((b) => digit & b.value).map((b) => b.value).join("+") || "0"} =
                  </span>
                  <span className="text-xl font-semibold text-ink">{digit}</span>
                </span>
              )}
            </div>
          );
        })}
      </div>

      {showOctal && (
        <p className="mt-4 flex flex-wrap items-baseline justify-center gap-x-3 gap-y-1 text-sm">
          <span className="text-ink-3">As a number</span>
          <span className="font-mono text-2xl font-semibold tracking-wider text-ink tabular-nums">{octal(shown)}</span>
          <span className="font-mono text-xs text-ink-3">chmod {octal(shown)} {name}</span>
        </p>
      )}

      {props.people && (
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          {people.map((p) => {
            const d = (shown >> p.shift) & 7;
            return (
              <div key={p.who} className="rounded-xl border border-line bg-surface p-3">
                <p className="text-sm font-medium text-ink">
                  {p.who} <span className="font-normal text-ink-3">· {p.role}</span>
                </p>
                <ul className="mt-2 grid gap-1 text-[13px]">
                  {BITS.map((b) => {
                    const ok = Boolean(d & b.value);
                    return (
                      <li key={b.ch} className={`flex items-center gap-1.5 ${ok ? "text-ink" : "text-ink-3"}`}>
                        {ok ? <Check className="h-3.5 w-3.5 text-brand" strokeWidth={3} /> : <Minus className="h-3.5 w-3.5" />}
                        {ok ? "can" : "can't"} {verbs[b.ch]} {kind === "dir" ? "it" : "it"}
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** goal: { mode: "750" } or { string: "rwxr-x---" }. */
export function checkPerms(state: unknown, goal: Record<string, unknown>) {
  const s = state as PermsState | undefined;
  if (!s) return false;
  const want = (goal.mode ?? goal.string) as string | undefined;
  if (!want) return false;
  return s.mode === octal(parseMode(want, -1));
}
