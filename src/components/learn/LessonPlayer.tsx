"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Flame, Lightbulb, Play, RotateCcw, Sparkles, X, Zap } from "lucide-react";
import type { ConceptContext } from "@/content/foundations";
import type { Step } from "@/learn/types";
import type { TestResult } from "@/engine/types";
import { getWidget } from "@/learn/widgets";
import { ModuleIcon } from "@/learn/module-icons";
import { languageInfo } from "@/engine/languages";
import { loadRuntime, preloadRuntime } from "@/engine/runtimes";
import { completeLesson, currentStreak, useProgress, type CompletionResult } from "@/data/progress/store";
import { Prose } from "@/components/ui/Prose";
import { CodeEditor } from "@/components/workspace/CodeEditor";
import { sound } from "@/lib/sound/sound";
import { fireCelebrationConfetti } from "@/lib/ui/confetti";
import { answerText, hasAnswer, initialAnswer, isCorrect, QuestionInput, type Answer } from "./QuestionInput";

type Status = "idle" | "correct" | "wrong" | "revealed";

/** Brilliant-style concept lesson: one step at a time, every step interactive. */
export function LessonPlayer({ ctx }: { ctx: ConceptContext }) {
  const { lesson, module } = ctx;
  const progress = useProgress();
  const [index, setIndex] = useState(0);
  const [done, setDone] = useState<CompletionResult | null>(null);
  const step = lesson.steps[index];
  const total = lesson.steps.length;

  const finish = () => {
    const res = completeLesson(lesson.id, lesson.xp, "");
    sound.playSuccess();
    if (res.firstTime) fireCelebrationConfetti();
    setDone(res);
  };

  const advance = () => {
    sound.playClick();
    if (index + 1 >= total) finish();
    else setIndex(index + 1);
  };

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-bg">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-line bg-surface px-3 sm:px-4">
        <Link href="/learn" aria-label="Back to Foundations" title="Back to Foundations" className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-ink-2 hover:bg-surface-2 hover:text-ink">
          <X className="h-4 w-4" />
        </Link>
        <div className="flex flex-1 items-center gap-1" aria-label={`Step ${Math.min(index + 1, total)} of ${total}`}>
          {lesson.steps.map((_, i) => (
            <span key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i < index || done ? "bg-primary" : i === index ? "bg-ink-3" : "bg-surface-2"}`} />
          ))}
        </div>
        <span className="hidden items-center gap-3 text-xs font-medium tabular-nums text-ink-2 sm:flex">
          <span className="flex items-center gap-1"><Zap className="h-3.5 w-3.5 text-brand" />{progress.xp}</span>
          <span className="flex items-center gap-1"><Flame className="h-3.5 w-3.5 text-brand" />{currentStreak(progress)}</span>
        </span>
      </header>

      {done ? (
        <Completion ctx={ctx} result={done} />
      ) : (
        <StepFrame key={`${lesson.id}-${index}`} step={step} seed={`${lesson.id}-${index}`} moduleIcon={module.icon} moduleTitle={module.title} lessonTitle={lesson.title} first={index === 0} last={index === total - 1} onContinue={advance} />
      )}
    </div>
  );
}

function StepFrame({
  step,
  seed,
  moduleIcon,
  moduleTitle,
  lessonTitle,
  first,
  last,
  onContinue,
}: {
  step: Step;
  seed: string;
  moduleIcon: string;
  moduleTitle: string;
  lessonTitle: string;
  first: boolean;
  last: boolean;
  onContinue: () => void;
}) {
  const [answer, setAnswer] = useState<Answer>(() => (step.kind === "question" ? initialAnswer(step.question, seed) : null));
  const [widgetState, setWidgetState] = useState<unknown>(undefined);
  const [status, setStatus] = useState<Status>("idle");
  const [attempts, setAttempts] = useState(0);
  const [code, setCode] = useState(() => (step.kind === "code" ? step.starter : ""));
  const [codeResult, setCodeResult] = useState<{ results: TestResult[]; stdout: string; error: string | null } | null>(null);
  const [running, setRunning] = useState(false);
  const [hintsShown, setHintsShown] = useState(0);
  const primaryRef = useRef<() => void>(() => {});

  useEffect(() => {
    if (step.kind === "code") preloadRuntime(step.language);
  }, [step]);

  const answered = status === "correct" || status === "revealed";
  // editing after a miss clears the "Not quite" so the learner can just check again
  const onAnswer = (a: Answer) => {
    setAnswer(a);
    if (status === "wrong") setStatus("idle");
  };
  const onWidget = (state: unknown) => {
    setWidgetState(state);
    if (status === "wrong") setStatus("idle");
  };
  const isQuestion = step.kind === "question";
  const isCode = step.kind === "code";
  const widgetDef = (step.kind === "explain" || step.kind === "question") && step.widget ? getWidget(step.widget.type) : undefined;

  const check = () => {
    if (step.kind !== "question") return;
    const q = step.question;
    const ok = q.type === "widget" ? Boolean(widgetDef?.check?.(widgetState, q.goal)) : isCorrect(q, answer);
    setAttempts((n) => n + 1);
    if (ok) {
      sound.playSuccess();
      setStatus("correct");
    } else {
      sound.playError();
      setStatus("wrong");
    }
  };

  const runCode = async () => {
    if (step.kind !== "code" || running) return;
    setRunning(true);
    try {
      const rt = await loadRuntime(step.language);
      const graded = await rt.grade(code, step.tests);
      const error = graded.error ? `${graded.error.type}: ${graded.error.message}${graded.error.line ? ` (line ${graded.error.line})` : ""}` : null;
      setCodeResult({ results: graded.results, stdout: graded.stdout, error });
      setAttempts((n) => n + 1);
      if (graded.allPassed) {
        sound.playSuccess();
        setStatus("correct");
      } else {
        sound.playError();
        setStatus("wrong");
      }
    } catch (e) {
      setCodeResult({ results: [], stdout: "", error: (e as Error).message });
      setStatus("wrong");
    } finally {
      setRunning(false);
    }
  };

  const canCheck = isQuestion ? (step.question.type === "widget" ? widgetState !== undefined : hasAnswer(step.question, answer)) : true;
  const primary = (() => {
    if (answered || step.kind === "explain" || step.kind === "recap") return { label: last ? "Finish lesson" : "Continue", run: onContinue, disabled: false };
    if (status === "wrong" && isQuestion) return { label: "Try again", run: () => setStatus("idle"), disabled: false };
    if (isCode) return { label: running ? "Checking…" : "Run & check", run: () => void runCode(), disabled: running };
    return { label: "Check", run: check, disabled: !canCheck };
  })();
  useEffect(() => {
    primaryRef.current = primary.disabled ? () => {} : primary.run;
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.key !== "Enter" || e.shiftKey || t.closest(".monaco-editor") || t.tagName === "BUTTON") return;
      // anything focused inside a widget (a terminal, an editor, a control) owns its Enter key
      if (t.closest("[data-widget]")) return;
      e.preventDefault();
      primaryRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const failing = codeResult?.results.find((r) => !r.passed);
  const wide = isCode;

  return (
    <>
      <main className="min-h-0 flex-1 overflow-y-auto">
        <div className={`rise mx-auto w-full px-4 pb-40 pt-8 sm:px-6 sm:pt-12 ${wide ? "max-w-4xl" : "max-w-2xl"}`}>
          {first && (
            <p className="mb-6 flex items-center gap-2 text-xs font-medium text-ink-3">
              <ModuleIcon icon={moduleIcon} className="h-3.5 w-3.5" /> {moduleTitle} · {lessonTitle}
            </p>
          )}
          {step.kind !== "recap" && step.title && <h1 className="font-display text-[1.75rem] leading-tight sm:text-[2.1rem]">{step.title}</h1>}

          {step.kind === "recap" ? (
            <div>
              <span className="grid h-11 w-11 place-items-center rounded-full bg-tint text-brand">
                <Sparkles className="h-5 w-5" />
              </span>
              <h1 className="font-display mt-4 text-[1.75rem] sm:text-[2.1rem]">{step.title ?? "What you learned"}</h1>
              <ul className="mt-6 grid gap-3">
                {step.points.map((p) => (
                  <li key={p} className="flex gap-3 rounded-xl border border-line bg-surface p-4">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand" strokeWidth={2.5} />
                    <Prose source={p} className="!text-[0.95rem] [&_p]:!m-0" />
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <>
              {"body" in step && step.body && <Prose source={step.body} className="mt-4 !text-[1rem] !leading-relaxed" />}

              {widgetDef && "widget" in step && step.widget && step.widget.after && !answered && (
                <p className="mt-6 rounded-xl border border-dashed border-[var(--line-strong)] p-4 text-sm text-ink-3">
                  Answer first, then you can try it yourself here.
                </p>
              )}
              {widgetDef && "widget" in step && step.widget && (!step.widget.after || answered) && (
                <div className={`card mt-6 flex justify-center p-4 sm:p-6 ${step.widget.after ? "pop-in" : ""}`} data-widget>
                  <widgetDef.Component
                    props={step.widget.props ?? {}}
                    onChange={onWidget}
                    revealed={answered && !step.widget.live && !step.widget.after}
                    status={status}
                    goal={step.kind === "question" && step.question.type === "widget" ? step.question.goal : undefined}
                  />
                </div>
              )}
              {"widget" in step && step.widget && !widgetDef && (
                <p className="mt-6 rounded-xl border border-dashed border-[var(--line-strong)] p-4 text-sm text-ink-3">Widget “{step.widget.type}” isn&apos;t available.</p>
              )}

              {step.kind === "question" && (
                <div className="mt-6">
                  <QuestionInput question={step.question} answer={answer} onAnswer={onAnswer} locked={answered} status={status} />
                </div>
              )}

              {step.kind === "code" && (
                <div className="mt-6 grid gap-3">
                  <div className="card h-[300px] overflow-hidden sm:h-[340px]">
                    <div className="flex h-9 items-center justify-between border-b border-line px-3 font-mono text-xs text-ink-3">
                      <span>{languageInfo(step.language).fileName}</span>
                      <button type="button" onClick={() => setCode(step.starter)} className="flex items-center gap-1 rounded-full px-2 py-0.5 hover:bg-surface-2 hover:text-ink">
                        <RotateCcw className="h-3 w-3" /> Reset
                      </button>
                    </div>
                    <div className="h-[calc(100%-2.25rem)]">
                      <CodeEditor value={code} onChange={setCode} onRun={() => void runCode()} onSubmit={() => void runCode()} language={languageInfo(step.language).monaco} errorLine={null} revealKey={seed} />
                    </div>
                  </div>
                  {codeResult && (
                    <div className="card p-4 text-sm">
                      <ul className="grid gap-1.5">
                        {codeResult.results.map((r) => (
                          <li key={r.testId} className="flex items-start gap-2">
                            {r.passed ? <Check className="mt-0.5 h-4 w-4 shrink-0 text-good" /> : <X className="mt-0.5 h-4 w-4 shrink-0 text-bad" />}
                            <span>
                              {r.description}
                              {!r.passed && r.error && <span className="block font-mono text-xs text-bad">{r.error}</span>}
                            </span>
                          </li>
                        ))}
                      </ul>
                      {codeResult.error && <p className="mt-2 font-mono text-xs text-bad">{codeResult.error}</p>}
                      {codeResult.stdout && <pre className="mt-3 max-h-40 overflow-auto rounded-lg bg-surface-2 p-3 font-mono text-xs text-ink-2">{codeResult.stdout}</pre>}
                    </div>
                  )}
                  {step.hints && step.hints.length > 0 && (
                    <div className="grid gap-2">
                      {step.hints.slice(0, hintsShown).map((h, i) => (
                        <p key={i} className="rounded-xl border border-line bg-surface-2 p-3 text-sm text-ink-2">
                          <Lightbulb className="mr-1.5 inline h-3.5 w-3.5 text-brand" />
                          {h}
                        </p>
                      ))}
                      {hintsShown < step.hints.length && (
                        <button type="button" className="btn btn-sm btn-ghost w-fit" onClick={() => setHintsShown((n) => n + 1)}>
                          <Lightbulb className="h-3.5 w-3.5" /> {hintsShown === 0 ? "Show a hint" : "Another hint"}
                        </button>
                      )}
                    </div>
                  )}
                  {attempts >= 2 && status !== "correct" && (
                    <button type="button" className="btn btn-sm btn-ghost w-fit" onClick={() => setCode(step.solution)}>
                      Use the reference solution
                    </button>
                  )}
                </div>
              )}

              {step.kind === "question" && answered && (
                <div className={`pop-in mt-6 rounded-xl border p-4 ${status === "correct" ? "border-[var(--brand)]/40 bg-tint" : "border-line bg-surface"}`}>
                  {status === "revealed" && step.question.type !== "widget" && (
                    <p className="mb-2 text-sm">
                      <span className="text-ink-3">Answer: </span>
                      <span className="font-medium">{answerText(step.question)}</span>
                    </p>
                  )}
                  <Prose source={step.explanation} className="!text-[0.95rem] [&_p:first-child]:!mt-0 [&_p:last-child]:!mb-0" />
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* action bar */}
      <div
        className={`shrink-0 border-t pb-[env(safe-area-inset-bottom)] ${
          status === "correct" ? "border-brand/40 bg-tint" : status === "wrong" ? "border-bad/30 bg-surface" : "border-line bg-surface"
        }`}
      >
        <div className={`mx-auto flex w-full items-center gap-3 px-4 py-3.5 sm:px-6 ${wide ? "max-w-4xl" : "max-w-2xl"}`}>
          <div className="min-w-0 flex-1">
            {status === "correct" && (
              <p className="flex items-center gap-2 font-semibold">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-primary text-primary-ink">
                  <Check className="h-4 w-4" strokeWidth={3} />
                </span>
                {isCode ? "All checks pass." : "Correct."}
              </p>
            )}
            {status === "wrong" && (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <p className="flex items-center gap-2 font-semibold">
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-bad/15 text-bad">
                    <X className="h-4 w-4" strokeWidth={3} />
                  </span>
                  Not quite.
                </p>
                {isCode && failing && <span className="truncate text-sm text-ink-2">{failing.description}</span>}
                {isQuestion && attempts >= 2 && (
                  <button type="button" className="text-sm font-medium text-ink-2 underline underline-offset-2 hover:text-ink" onClick={() => setStatus("revealed")}>
                    Show answer
                  </button>
                )}
              </div>
            )}
            {status === "revealed" && <p className="text-sm text-ink-2">Here&apos;s the answer. It&apos;ll stick next time.</p>}
            {/* after two misses the way out stays available, even after "Try again" */}
            {status === "idle" && isQuestion && attempts >= 2 && (
              <button type="button" className="text-sm font-medium text-ink-2 underline underline-offset-2 hover:text-ink" onClick={() => setStatus("revealed")}>
                Show answer
              </button>
            )}
          </div>
          <button type="button" className="btn btn-primary !h-11 shrink-0 !px-6" onClick={primary.run} disabled={primary.disabled}>
            {isCode && !answered && status !== "wrong" && <Play className="h-3.5 w-3.5" fill="currentColor" />}
            {primary.label}
            {(answered || step.kind === "explain" || step.kind === "recap") && <ArrowRight className="h-4 w-4" />}
          </button>
          {isCode && status === "wrong" && (
            <button type="button" className="btn !h-11 shrink-0" onClick={() => void runCode()} disabled={running}>
              <Play className="h-3.5 w-3.5" fill="currentColor" /> Run again
            </button>
          )}
        </div>
      </div>
    </>
  );
}

function Completion({ ctx, result }: { ctx: ConceptContext; result: CompletionResult }) {
  const { lesson, next } = ctx;
  return (
    <main className="min-h-0 flex-1 overflow-y-auto">
      <div className="pop-in mx-auto flex w-full max-w-md flex-col items-center px-4 py-16 text-center">
        <span className="grid h-16 w-16 place-items-center rounded-full bg-primary text-primary-ink">
          <Check className="h-8 w-8" strokeWidth={2.5} />
        </span>
        <h1 className="font-display mt-6 text-[2rem]">Lesson complete</h1>
        <p className="mt-2 text-ink-2">{lesson.title}</p>
        <div className="mt-8 grid w-full grid-cols-2 gap-3">
          <div className="card p-4">
            <p className="text-xs text-ink-3">XP earned</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">+{result.xpGained}</p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-ink-3">Streak</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">
              {result.streak} {result.streak === 1 ? "day" : "days"}
            </p>
          </div>
        </div>
        {result.leveledUp && <p className="mt-4 text-sm text-brand">Level up: you&apos;re now a {result.rank}.</p>}
        <div className="mt-10 flex w-full flex-col gap-3">
          {next ? (
            <Link href={`/learn/${next.id}`} className="btn btn-primary !h-12 w-full !text-base">
              Next: {next.title} <ArrowRight className="h-4 w-4" />
            </Link>
          ) : (
            <Link href="/projects" className="btn btn-primary !h-12 w-full !text-base">
              Put it to work in a project <ArrowRight className="h-4 w-4" />
            </Link>
          )}
          <Link href="/learn" className="btn !h-12 w-full">
            Back to Foundations
          </Link>
        </div>
      </div>
    </main>
  );
}
