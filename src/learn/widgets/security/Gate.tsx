"use client";

import React, { useState } from "react";
import { Check, X } from "lucide-react";
import type { WidgetProps } from "@/learn/widget";
import { Caption, Mono, Segmented } from "./ui";

/**
 * Two questions at every door: "who are you?" (authentication) and "may you do this?"
 * (authorization). Each request below arrives at the Dovetail Clinic API; choose the status code
 * the server should answer with.
 */

interface Req {
  id: string;
  line: string;
  who: string;
  answer: 200 | 401 | 403;
  why: string;
}

const REQS: Req[] = [
  { id: "r1", line: "GET /appointments/118", who: "No cookie at all", answer: 401, why: "The server does not know who is asking, so it cannot decide. Unauthenticated: 401." },
  { id: "r2", line: "GET /appointments/118", who: "Session of Dana, who booked #118", answer: 200, why: "Known caller, and the booking is hers." },
  { id: "r3", line: "GET /appointments/119", who: "Session of Dana; #119 belongs to Eli", answer: 403, why: "Dana is known (so not 401) but may not see Eli's booking. Forbidden: 403. (Some teams answer 404 here so the id's existence stays secret.)" },
  { id: "r4", line: "DELETE /staff/users/7", who: "Session of Dana, a patient", answer: 403, why: "A valid login is not a licence. Patients have no business deleting staff." },
  { id: "r5", line: "POST /appointments", who: "Session cookie that expired yesterday", answer: 401, why: "An expired session proves nothing, so it is the same as having none." },
  { id: "r6", line: "GET /clinic/opening-hours", who: "No cookie (a public page)", answer: 200, why: "Public information needs no identity and no permission." },
  { id: "r7", line: "POST /appointments/118/cancel", who: "Session of Reza, a receptionist", answer: 200, why: "Known caller, and the receptionist role is allowed to cancel any booking." },
];

export interface GateProps {
  /** Subset of request ids to show (default: all). */
  ids?: string[];
}

export interface GateState {
  answers: Record<string, number>;
  answered: number;
  correct: number;
  total: number;
  allCorrect: boolean;
}

export function Gate({ props, onChange, revealed, status }: WidgetProps<GateProps>) {
  const reqs = props.ids ? REQS.filter((r) => props.ids!.includes(r.id)) : REQS;
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const showAnswers = status === "revealed";

  const summarize = (a: Record<string, number>): GateState => {
    const correct = reqs.filter((r) => a[r.id] === r.answer).length;
    return { answers: a, answered: Object.keys(a).length, correct, total: reqs.length, allCorrect: correct === reqs.length };
  };
  const pick = (id: string, code: number) => {
    if (revealed) return;
    const next = { ...answers, [id]: code };
    setAnswers(next);
    onChange?.(summarize(next));
  };

  return (
    <div className="w-full max-w-2xl">
      <Caption className="mb-2">What should the server answer?</Caption>
      <ul className="grid gap-2">
        {reqs.map((r) => {
          const chosen = answers[r.id];
          const wrong = (status === "wrong" || showAnswers) && chosen !== undefined && chosen !== r.answer;
          const shown = showAnswers ? r.answer : chosen;
          return (
            <li key={r.id} className={`rounded-xl border bg-surface p-2.5 ${wrong ? "border-[var(--bad)]/60" : "border-line"}`}>
              <Mono className="!border-0 !bg-surface-2">{r.line}</Mono>
              <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2">
                <p className="min-w-0 flex-1 text-[13px] text-ink-2">{r.who}</p>
                <Segmented
                  label={`Status for ${r.line}`}
                  value={shown ?? 0}
                  disabled={revealed}
                  options={[
                    { id: 200, label: "200" },
                    { id: 401, label: "401" },
                    { id: 403, label: "403" },
                  ]}
                  onChange={(v) => pick(r.id, v)}
                />
              </div>
              {revealed && (
                <p className="mt-1.5 flex items-start gap-1.5 text-[12.5px] leading-snug text-ink-2">
                  {chosen === r.answer || showAnswers ? <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-good" /> : <X className="mt-0.5 h-3.5 w-3.5 shrink-0 text-bad" />}
                  {r.why}
                </p>
              )}
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-xs text-ink-3">200 = go ahead · 401 = I don&apos;t know who you are · 403 = I know who you are, and no</p>
    </div>
  );
}

export function checkGate(state: unknown, goal: Record<string, unknown>) {
  const st = state as GateState | undefined;
  if (!st) return false;
  if (goal.allCorrect === true && !st.allCorrect) return false;
  return true;
}
