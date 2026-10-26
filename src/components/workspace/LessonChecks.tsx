"use client";

import React, { useState } from "react";
import { Check, HelpCircle, RotateCcw, X } from "lucide-react";
import type { LanguageId, LessonCheck } from "@/engine/types";
import { Prose } from "@/components/ui/Prose";
import { QuestionInput, answerText, hasAnswer, initialAnswer, isCorrect, type Answer } from "@/components/learn/QuestionInput";
import { sound } from "@/lib/sound/sound";

type Status = "idle" | "correct" | "wrong" | "revealed";

/**
 * "Check your understanding": a few ungraded questions at the end of the Learn tab. They never
 * gate Submit; they are retrieval practice. Same feedback language as the Foundations player:
 * lime tint when right, red tint when not, Show answer after two misses.
 */
export function LessonChecks({ checks, lessonId, language }: { checks: LessonCheck[]; lessonId: string; language: LanguageId }) {
  const [solved, setSolved] = useState<Record<number, boolean>>({});
  const done = Object.values(solved).filter(Boolean).length;

  return (
    <section className="mt-10 border-t border-line pt-6" aria-labelledby={`checks-${lessonId}`}>
      <div className="flex items-center justify-between gap-3">
        <h2 id={`checks-${lessonId}`} className="flex items-center gap-2 text-sm font-semibold text-ink">
          <HelpCircle className="h-4 w-4 text-brand" /> Check your understanding
        </h2>
        <span className="chip tabular-nums">
          {done}/{checks.length}
        </span>
      </div>
      <p className="mt-1 text-xs text-ink-3">Quick questions on what you just read. They don&apos;t affect your lesson.</p>
      <div className="mt-4 space-y-4">
        {checks.map((c, i) => (
          <CheckCard
            key={`${lessonId}:${i}`}
            index={i}
            check={c}
            seed={`${lessonId}:${i}`}
            language={language}
            onSettled={(ok) => setSolved((s) => ({ ...s, [i]: ok }))}
          />
        ))}
      </div>
    </section>
  );
}

function CheckCard({
  check,
  index,
  seed,
  language,
  onSettled,
}: {
  check: LessonCheck;
  index: number;
  seed: string;
  language: LanguageId;
  onSettled: (ok: boolean) => void;
}) {
  const { question } = check;
  const [answer, setAnswer] = useState<Answer>(() => initialAnswer(question, seed));
  const [status, setStatus] = useState<Status>("idle");
  const [misses, setMisses] = useState(0);
  const answered = status === "correct" || status === "revealed";

  const change = (a: Answer) => {
    setAnswer(a);
    if (status === "wrong") setStatus("idle");
  };
  const submit = () => {
    if (isCorrect(question, answer)) {
      sound.playSuccess();
      setStatus("correct");
      onSettled(true);
    } else {
      sound.playError();
      setMisses((n) => n + 1);
      setStatus("wrong");
    }
  };
  const reveal = () => {
    setStatus("revealed");
    onSettled(false);
  };
  const retry = () => {
    setAnswer(initialAnswer(question, `${seed}:${misses}`));
    setStatus("idle");
  };

  const tone =
    status === "correct" ? "border-[var(--brand)]/40 bg-tint" : status === "wrong" ? "border-bad/40 bg-bad/[0.06]" : "border-line bg-surface";

  return (
    <div className={`rounded-xl border p-4 transition-colors ${tone}`}>
      <div className="flex gap-3">
        <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border border-line bg-surface-2 font-mono text-[10px] font-medium text-ink">
          {index + 1}
        </span>
        <Prose source={check.prompt} language={language} className="min-w-0 flex-1 !text-[0.95rem] [&_p:first-child]:!mt-0 [&_p:last-child]:!mb-0" />
      </div>

      <div className="mt-3">
        <QuestionInput question={question} answer={answer} onAnswer={change} locked={answered} status={status} />
      </div>

      {answered ? (
        <div className="pop-in mt-4 border-t border-line pt-3">
          <p className="flex items-center gap-2 text-sm font-semibold">
            {status === "correct" ? (
              <>
                <span className="grid h-6 w-6 place-items-center rounded-full bg-primary text-primary-ink">
                  <Check className="h-3.5 w-3.5" strokeWidth={3} />
                </span>
                Correct
              </>
            ) : (
              <span className="font-normal text-ink-2">
                Answer: <span className="font-medium text-ink">{answerText(question)}</span>
              </span>
            )}
          </p>
          <Prose source={check.explanation} language={language} className="mt-2 !text-sm [&_p:first-child]:!mt-0 [&_p:last-child]:!mb-0" />
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2">
          {status === "wrong" ? (
            <>
              <p className="flex items-center gap-2 text-sm font-semibold">
                <span className="grid h-6 w-6 place-items-center rounded-full bg-bad/15 text-bad">
                  <X className="h-3.5 w-3.5" strokeWidth={3} />
                </span>
                Not quite.
              </p>
              <button type="button" className="btn btn-sm" onClick={retry}>
                <RotateCcw className="h-3.5 w-3.5" /> Try again
              </button>
            </>
          ) : (
            <button type="button" className="btn btn-sm btn-primary" onClick={submit} disabled={!hasAnswer(question, answer)}>
              Check
            </button>
          )}
          {misses >= 2 && (
            <button type="button" className="text-sm font-medium text-ink-2 underline underline-offset-2 hover:text-ink" onClick={reveal}>
              Show answer
            </button>
          )}
        </div>
      )}
    </div>
  );
}
