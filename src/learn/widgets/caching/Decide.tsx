"use client";

import React, { useState } from "react";
import { Check, X } from "lucide-react";
import type { WidgetProps } from "@/learn/widget";
import { Caption, Note } from "../dsa/ui";

/**
 * Six real-sounding cases. For each, decide: cache it for a long time, cache it briefly, or do
 * not cache it. The numbers on each card are what to reason from.
 */

type Verdict = "long" | "short" | "never";

const CASES: { id: string; title: string; facts: string; answer: Verdict; why: string }[] = [
  {
    id: "countries",
    title: "The country list on the sign-up form",
    facts: "500 reads/s · changes about once a year · the same for everyone",
    answer: "long",
    why: "Read constantly, almost never changes, identical for every visitor: the textbook cache. A day (or longer) is fine, and a deploy can clear it.",
  },
  {
    id: "seats",
    title: "Seats left when someone presses Buy",
    facts: "changes every second during a sale · a wrong number means selling a seat twice",
    answer: "never",
    why: "The buy step needs the truth. You may show a cached 'about 40 left' on the browsing page, but the purchase itself must check the source of truth.",
  },
  {
    id: "balance",
    title: "One member's wallet balance page",
    facts: "read twice a day by that one member · different for each member · changes on every purchase",
    answer: "never",
    why: "Personal, rarely reused and a stale number is a support ticket. A cache entry per member that is read twice a day never earns back its space.",
  },
  {
    id: "trending",
    title: "'Trending concerts' list, built by a heavy query",
    facts: "200 reads/s · 3 s to compute · nobody notices if it is a minute old",
    answer: "short",
    why: "Expensive to build, read a lot, and tolerant of staleness: cache it for a minute or so. The TTL is your freshness budget.",
  },
  {
    id: "reset",
    title: "Is this password-reset token still valid?",
    facts: "each token is single-use · a replayed token must fail",
    answer: "never",
    why: "A cached 'valid' answer lets the same link be used twice. Security decisions go to the source of truth every time.",
  },
  {
    id: "missing",
    title: "Lookups for ticket IDs that don't exist",
    facts: "a crawler tries 300 made-up IDs/s · each one scans the index and finds nothing",
    answer: "short",
    why: "Caching the 'not found' answer (negative caching) for a short time protects the database from repeat lookups. Keep it short so a ticket created a moment later is found.",
  },
];

const OPTIONS: { id: Verdict; label: string }[] = [
  { id: "long", label: "Cache for hours" },
  { id: "short", label: "Cache for seconds or minutes" },
  { id: "never", label: "Don't cache" },
];

export interface DecideState {
  answers: Record<string, Verdict>;
  answered: number;
  correct: number;
  all: boolean;
}

export function Decide({ onChange, revealed }: WidgetProps) {
  const [answers, setAnswers] = useState<Record<string, Verdict>>({});

  const pick = (id: string, v: Verdict) => {
    if (revealed) return;
    const a = { ...answers, [id]: v };
    setAnswers(a);
    const correct = CASES.filter((c) => a[c.id] === c.answer).length;
    onChange?.({ answers: a, answered: Object.keys(a).length, correct, all: correct === CASES.length } satisfies DecideState);
  };
  const correct = CASES.filter((c) => answers[c.id] === c.answer).length;

  return (
    <div className="w-full min-w-0">
      <Caption>Decide for each case</Caption>
      <div className="space-y-2.5">
        {CASES.map((c) => {
          const a = answers[c.id];
          const ok = a === c.answer;
          return (
            <div key={c.id} className={`rounded-xl border p-3 ${a === undefined ? "border-line bg-surface" : ok ? "border-[var(--brand)]/60 bg-tint" : "border-[var(--bad)]/50 bg-[var(--bad)]/[0.05]"}`}>
              <p className="text-sm font-semibold text-ink">{c.title}</p>
              <p className="mt-0.5 font-mono text-[11.5px] leading-snug text-ink-3">{c.facts}</p>
              <div className="mt-2 flex flex-wrap gap-1.5" role="radiogroup" aria-label={c.title}>
                {OPTIONS.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    role="radio"
                    aria-checked={a === o.id}
                    disabled={revealed}
                    onClick={() => pick(c.id, o.id)}
                    className={`min-h-10 rounded-full border px-3.5 text-[0.8rem] font-medium transition-colors disabled:cursor-default ${
                      a === o.id ? (ok ? "border-transparent bg-primary text-primary-ink" : "border-[var(--bad)] bg-surface text-ink") : "border-line bg-surface text-ink-2 hover:border-[var(--line-strong)] hover:text-ink"
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
              {a !== undefined && (
                <p className={`mt-2 flex gap-1.5 text-[0.82rem] leading-snug ${ok ? "text-ink-2" : "text-ink-2"}`} aria-live="polite">
                  {ok ? <Check className="mt-0.5 h-4 w-4 shrink-0 text-good" /> : <X className="mt-0.5 h-4 w-4 shrink-0 text-bad" />}
                  <span>{ok ? c.why : "Not quite: think about how often it is read, how fast it changes, and what a wrong answer costs. Try another option."}</span>
                </p>
              )}
            </div>
          );
        })}
      </div>
      <Note tone={correct === CASES.length ? "good" : "plain"}>{correct} of {CASES.length} decided correctly.</Note>
    </div>
  );
}

export function checkDecide(state: unknown, goal: Record<string, unknown>) {
  const s = state as DecideState | undefined;
  if (!s) return false;
  if (goal.all === true && !s.all) return false;
  if (typeof goal.correctMin === "number" && !(s.correct >= goal.correctMin)) return false;
  return true;
}
