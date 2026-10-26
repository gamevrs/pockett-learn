"use client";

import React, { useState } from "react";
import { BookOpen, CheckCircle2, Clock, Lightbulb, Lock, Target, Zap } from "lucide-react";
import { FeatureIcon } from "@/components/ui/icons";
import type { Feature } from "@/engine/types";
import type { LessonContext } from "@/content";
import { CodeBlock, Prose } from "@/components/ui/Prose";
import { languageOf } from "@/engine/types";
import { sound } from "@/lib/sound/sound";
import { LessonChecks } from "./LessonChecks";

type Tab = "mission" | "learn" | "hints";

interface LessonPanelProps {
  ctx: LessonContext;
  feature: Feature | null;
  alreadyDone: boolean;
  attempts: number;
  hintsSeen: number;
  onRevealHint: (count: number) => void;
  onUseSolution: () => void;
}

export function LessonPanel({ ctx, feature, alreadyDone, attempts, hintsSeen, onRevealHint, onUseSolution }: LessonPanelProps) {
  const { lesson, index, total, chapterTitle } = ctx;
  const [tab, setTab] = useState<Tab>("mission");
  const [showSolution, setShowSolution] = useState(false);

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "mission", label: "Mission", icon: <Target className="h-3.5 w-3.5" /> },
    { id: "learn", label: "Learn", icon: <BookOpen className="h-3.5 w-3.5" /> },
    { id: "hints", label: `Hints${hintsSeen ? ` ${hintsSeen}/${lesson.hints.length}` : ""}`, icon: <Lightbulb className="h-3.5 w-3.5" /> },
  ];

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex shrink-0 gap-1 border-b border-line p-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => {
              sound.playClick();
              setTab(t.id);
            }}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-full px-2 py-1.5 text-xs font-medium transition-colors ${
              tab === t.id ? "bg-surface-2 text-ink" : "text-ink-2 hover:bg-surface-2"
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
        {tab === "mission" && (
          <div className="rise">
            <p className="eyebrow">
              {chapterTitle} · {index + 1} of {total}
            </p>
            <h1 className="font-display mt-2 text-[1.75rem] sm:text-[2rem]">{lesson.title}</h1>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {lesson.concepts.map((c) => (
                <span key={c} className="chip font-mono">
                  {c}
                </span>
              ))}
              <span className="chip">
                <Clock className="h-3 w-3" />~{lesson.minutes} min
              </span>
              <span className="chip">
                <Zap className="h-3 w-3 text-brand" />
                {lesson.xp} XP
              </span>
            </div>

            {feature && (
              <div
                className="mt-5 flex items-start gap-3 rounded-xl border border-line bg-tint p-3.5"
              >
                <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${alreadyDone ? "bg-primary text-primary-ink" : "bg-surface text-ink-3"}`}>{alreadyDone ? <FeatureIcon id={feature.id} className="h-4 w-4" /> : <Lock className="h-4 w-4" />}</span>
                <div className="min-w-0">
                  <p className="text-xs text-ink-3">{alreadyDone ? "Working in your build" : "Pass this lesson to add"}</p>
                  <p className="mt-0.5 font-medium leading-tight">{feature.title}</p>
                  <p className="mt-0.5 text-sm text-ink-2">{feature.blurb}</p>
                </div>
              </div>
            )}

            <Prose source={lesson.mission} className="mt-5" language={languageOf(ctx.project)} />

            <h3 className="mt-6 text-sm font-medium text-ink">Your tasks</h3>
            <ol className="mt-2 space-y-2">
              {lesson.tasks.map((t, i) => (
                <li key={i} className="flex gap-3 text-sm text-ink-2">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border border-line bg-surface-2 font-mono text-[10px] font-medium text-ink">{i + 1}</span>
                  <span>{t}</span>
                </li>
              ))}
            </ol>

            {alreadyDone && (
              <div className="mt-6 rounded-xl border border-line bg-surface-2 p-4">
                <p className="mb-1 flex items-center gap-2 text-sm font-medium text-ink">
                  <CheckCircle2 className="h-4 w-4 text-good" /> Why it works
                </p>
                <p className="text-sm leading-relaxed text-ink-2">{lesson.explanation}</p>
              </div>
            )}
          </div>
        )}

        {tab === "learn" && (
          <div className="rise">
            <Prose source={lesson.learn} language={languageOf(ctx.project)} />
            {lesson.checks && lesson.checks.length > 0 && (
              <LessonChecks key={lesson.id} checks={lesson.checks} lessonId={lesson.id} language={languageOf(ctx.project)} />
            )}
          </div>
        )}

        {tab === "hints" && (
          <div className="rise space-y-3">
            <p className="text-sm text-ink-2">Stuck? Reveal hints one at a time. Trying first makes it stick.</p>
            {lesson.hints.map((h, i) => {
              const open = i < hintsSeen;
              return (
                <div key={h.id} className="rounded-xl border border-line bg-surface-2 p-3.5">
                  <p className="text-xs font-medium text-ink-3">
                    Hint {i + 1} · {h.title}
                  </p>
                  {open ? (
                    <p className="mt-1.5 font-mono text-[13px] leading-relaxed">{h.content}</p>
                  ) : i === hintsSeen ? (
                    <button
                      className="btn btn-sm btn-ghost mt-2"
                      onClick={() => {
                        sound.playClick();
                        onRevealHint(i + 1);
                      }}
                    >
                      <Lightbulb className="h-3.5 w-3.5" /> Reveal
                    </button>
                  ) : (
                    <p className="mt-1.5 text-xs text-ink-3">Reveal the previous hint first.</p>
                  )}
                </div>
              );
            })}

            <div className="rounded-xl border border-dashed border-[var(--line-strong)] p-3.5">
              <p className="text-xs font-medium text-ink-3">Reference solution</p>
              {attempts < 2 ? (
                <p className="mt-1.5 text-sm text-ink-3">Unlocks after two tries. You can do this.</p>
              ) : showSolution ? (
                <>
                  <div className="prose-lesson">
                    <pre style={{ maxHeight: 260, overflow: "auto" }}>
                      <CodeBlock code={lesson.solutionAdd} language={languageOf(ctx.project)} />
                    </pre>
                  </div>
                  <button className="btn btn-sm mt-2" onClick={onUseSolution}>
                    Replace my code with the solution
                  </button>
                </>
              ) : (
                <button className="btn btn-sm btn-ghost mt-2" onClick={() => setShowSolution(true)}>
                  Show the solution
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
