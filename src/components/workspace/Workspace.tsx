"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, Check, ChevronLeft, ChevronRight, Code2, Flame, ListChecks, MonitorPlay, Play, RotateCcw, Send, Volume2, VolumeX, X, Zap } from "lucide-react";
import { featuresUnlockedBy, flattenLessons, type RunError, type TestResult } from "@/engine/types";
import type { Celebration } from "@/engine/scene";
import type { ProgramHandle } from "@/engine/program";
import { gradeProgram, preloadPython, runProgram } from "@/engine/python/host";
import { solutionThrough, starterFor } from "@/engine/compose";
import type { LessonContext } from "@/content";
import {
  completeLesson,
  currentStreak,
  levelFor,
  recordAttempt,
  recordHint,
  saveDraft,
  clearDraft,
  setSoundEnabled,
  submittedCode,
  useProgress,
  type CompletionResult,
} from "@/data/progress/store";
import { StageShell, type StageStatus } from "@/components/stage/StageShell";
import { sound } from "@/lib/sound/sound";
import { fireCelebrationConfetti } from "@/lib/ui/confetti";
import { useHydrated } from "@/lib/hooks";
import { CodeEditor } from "./CodeEditor";
import { LessonPanel } from "./LessonPanel";
import { ResultsPanel, type ResultTab } from "./ResultsPanel";
import { WorkspaceLayout, useLayoutMode, type PanelId } from "./WorkspaceLayout";
import { FeatureIcon, ProjectIcon } from "@/components/ui/icons";

type MobileTab = "learn" | "code" | "stage" | "checks";
const MOBILE_PANEL: Record<MobileTab, PanelId> = { learn: "lesson", code: "editor", stage: "stage", checks: "results" };

export function Workspace({ ctx }: { ctx: LessonContext }) {
  const hydrated = useHydrated();
  if (!hydrated) return <WorkspaceSkeleton ctx={ctx} />;
  return <WorkspaceInner ctx={ctx} />;
}

function WorkspaceSkeleton({ ctx }: { ctx: LessonContext }) {
  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-bg">
      <div className="text-center">
        <span className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-tint text-brand">
          <ProjectIcon slug={ctx.project.slug} className="h-5 w-5" />
        </span>
        <p className="font-display mt-4 text-2xl">{ctx.lesson.title}</p>
        <p className="mt-1 text-sm text-ink-3">Loading your workspace…</p>
      </div>
    </div>
  );
}

function WorkspaceInner({ ctx }: { ctx: LessonContext }) {
  const { project, lesson, index, total, prev, next } = ctx;
  const progress = useProgress();
  const lessons = flattenLessons(project);
  const done = Boolean(progress.completed[lesson.id]);

  const savedCode = progress.drafts[lesson.id] ?? progress.completed[lesson.id]?.code ?? null;
  const [code, setCode] = useState(() => savedCode ?? starterFor(project, index, submittedCode(progress)));
  // Untouched editors adopt saved code that arrives later (e.g. the cloud pull on a new device).
  const [pristine, setPristine] = useState(true);
  const [seenSaved, setSeenSaved] = useState(savedCode);
  if (savedCode !== seenSaved) {
    setSeenSaved(savedCode);
    if (pristine && savedCode !== null && savedCode !== code) setCode(savedCode);
  }
  // With earlier work saved we boot it on arrival, so the stage starts out "loading".
  const [status, setStatus] = useState<StageStatus>(() => (index > 0 || done ? "loading" : "idle"));
  const [statusText, setStatusText] = useState("");
  const [program, setProgram] = useState<ProgramHandle | null>(null);
  const [stdout, setStdout] = useState("");
  const [runError, setRunError] = useState<RunError | null>(null);
  const [results, setResults] = useState<TestResult[]>([]);
  const [resultTab, setResultTab] = useState<ResultTab>("checks");
  const [mobileTab, setMobileTab] = useState<MobileTab>("learn");
  const [celebration, setCelebration] = useState<Celebration | null>(null);
  const [completion, setCompletion] = useState<CompletionResult | null>(null);
  /** Set after a Submit that did not pass, so the feedback bar can say how close it was. */
  const [miss, setMiss] = useState<{ passed: number; total: number } | null>(null);
  const [resultsCollapsed, setResultsCollapsed] = useState(false);
  const layoutMode = useLayoutMode();

  const programRef = useRef<ProgramHandle | null>(null);
  // Bumped whenever the panel is hidden/unmounted (Next keeps routes alive hidden), so async
  // work that started earlier can tell it must not touch the UI any more.
  const epoch = useRef(0);
  const booted = useRef(false);
  const codeRef = useRef(code);
  /** Features previewed by the last successful Run (Submit makes them permanent). */
  const [preview, setPreview] = useState<string[]>([]);
  const busy = useRef(false);

  const unlocked = useMemo(() => {
    const set = featuresUnlockedBy(project, Object.keys(progress.completed));
    preview.forEach((f) => set.add(f));
    return set;
  }, [project, progress.completed, preview]);
  const feature = project.features.find((f) => f.id === lesson.unlocks[0]) ?? null;
  const featureAlive = feature ? unlocked.has(feature.id) : false;

  function swapProgram(next: ProgramHandle | null) {
    programRef.current?.dispose();
    programRef.current = next;
    setProgram(next);
  }

  useEffect(() => {
    const showsBoot = index > 0 || done;
    const epochRef = epoch;
    return () => {
      // hidden or unmounted: drop the live program and let the boot run again when shown
      epochRef.current++;
      programRef.current?.dispose();
      programRef.current = null;
      booted.current = false;
      busy.current = false;
      setProgram(null);
      setStatus(showsBoot ? "loading" : "idle");
    };
  }, [index, done]);

  // Start downloading Python right away; if there is earlier work, boot it so the stage is alive on arrival.
  useEffect(() => {
    preloadPython();
    if (booted.current) return;
    booted.current = true;
    if (index === 0 && !done) return;
    const my = epoch.current;
    void runProgram(codeRef.current, setStatusText)
      .then((out) => {
        if (my !== epoch.current) {
          out.program?.dispose();
          return;
        }
        if (out.program) {
          programRef.current?.dispose();
          programRef.current = out.program;
          setProgram(out.program);
          setStdout(out.stdout);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (my === epoch.current) setStatus("idle");
      });
  }, [index, done]);

  // autosave the draft shortly after typing stops
  useEffect(() => {
    if (pristine) return; // only real edits become drafts
    const t = setTimeout(() => saveDraft(lesson.id, code), 500);
    return () => clearTimeout(t);
  }, [code, lesson.id, pristine]);

  /** Run = try the code (output + live stage). Submit = also grade it and complete the lesson. */
  async function execute(mode: "run" | "submit") {
    if (busy.current) return;
    busy.current = true;
    const my = epoch.current;
    sound.playClick();
    if (mode === "submit") recordAttempt(lesson.id);
    setStatus("loading");
    setResultTab(mode === "submit" ? "checks" : "console");
    setResultsCollapsed(false);
    setCompletion(null);
    setMiss(null);

    try {
      const out = await runProgram(code, setStatusText);
      if (my !== epoch.current) {
        out.program?.dispose();
        return;
      }
      setStdout(out.stdout);
      setRunError(out.error);
      swapProgram(out.program);

      if (mode === "run") {
        if (out.error) {
          sound.playError();
          setMobileTab("checks");
        } else {
          // let the learner see what this lesson's part would do; Submit makes it permanent
          setPreview(lesson.unlocks);
          setMobileTab("stage");
        }
        return;
      }

      let nextResults: TestResult[];
      if (out.error) {
        nextResults = lesson.tests.map((t) => ({
          testId: t.id,
          description: t.description,
          passed: false,
          error: "Your code stopped with an error before this check could run.",
        }));
        setResultTab("console");
        sound.playError();
      } else {
        setStatusText("Checking your work…");
        const graded = await gradeProgram(code, lesson.tests, setStatusText);
        nextResults = graded.results;
      }
      if (my !== epoch.current) return;
      setResults(nextResults);

      const allPassed = nextResults.length > 0 && nextResults.every((r) => r.passed);
      if (allPassed) {
        const res = completeLesson(lesson.id, lesson.xp, code);
        sound.playSuccess();
        if (res.leveledUp) setTimeout(() => sound.playLevelUp(), 450);
        if (res.firstTime) {
          fireCelebrationConfetti();
          setCelebration({ nonce: Date.now(), features: lesson.unlocks });
        }
        setCompletion(res);
        setMobileTab("stage");
      } else {
        if (!out.error) sound.playError();
        setMiss({ passed: nextResults.filter((r) => r.passed).length, total: nextResults.length });
        setMobileTab("checks");
      }
    } catch (err) {
      if (my !== epoch.current) return;
      setRunError({ type: "EngineError", message: (err as Error)?.message ?? String(err), line: null });
      setResultTab("console");
      sound.playError();
    } finally {
      if (my === epoch.current) {
        busy.current = false;
        setStatus("idle");
      }
    }
  }

  const runRef = useRef(execute);
  useEffect(() => {
    runRef.current = execute;
    codeRef.current = code;
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        void runRef.current(e.shiftKey ? "submit" : "run");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const reset = () => {
    sound.playClick();
    const fresh = starterFor(project, index, submittedCode(progress));
    setCode(fresh);
    setPristine(false);
    clearDraft(lesson.id);
    setResults([]);
    setRunError(null);
  };

  const rank = levelFor(progress.xp);
  const solution = solutionThrough(project, index);
  const lessonPath = (id: string) => `/projects/${project.slug}/${id}`;
  const errorLine = runError?.line ?? null;
  const running = status === "loading";
  const doneCount = lessons.filter((l) => progress.completed[l.id]).length;

  const mobileTabs: { id: MobileTab; label: string; icon: React.ReactNode }[] = [
    { id: "learn", label: "Learn", icon: <BookOpen className="h-4 w-4" /> },
    { id: "code", label: "Code", icon: <Code2 className="h-4 w-4" /> },
    { id: "stage", label: "Live", icon: <MonitorPlay className="h-4 w-4" /> },
    { id: "checks", label: "Checks", icon: <ListChecks className="h-4 w-4" /> },
  ];

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col bg-bg"
    >
      {/* header */}
      <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-line bg-surface px-3 sm:px-4">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Link
            href={`/projects/${project.slug}`}
            aria-label={`Back to ${project.title}`}
            title={`Back to ${project.title}`}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-ink-2 hover:bg-surface-2 hover:text-ink"
          >
            <X className="h-4 w-4" />
          </Link>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium leading-tight">{lesson.title}</p>
            <p className="truncate text-xs text-ink-3">
              {project.title} · Lesson {index + 1} of {total}
            </p>
          </div>
          <div className="ml-2 hidden max-w-xs flex-1 items-center gap-1 md:flex" aria-label={`${doneCount} of ${total} lessons complete`}>
            {lessons.map((l, i) => (
              <Link
                key={l.id}
                href={lessonPath(l.id)}
                title={l.title}
                className={`h-1.5 flex-1 rounded-full transition-colors hover:opacity-70 ${
                  progress.completed[l.id] ? "bg-primary" : i === index ? "bg-ink-3" : "bg-surface-2"
                }`}
              />
            ))}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <span className="mr-1 hidden items-center gap-3 text-xs font-medium tabular-nums text-ink-2 lg:flex" title={`${rank.rank} · level ${rank.level}`}>
            <span className="flex items-center gap-1"><Zap className="h-3.5 w-3.5 text-brand" />{progress.xp}</span>
            <span className="flex items-center gap-1"><Flame className="h-3.5 w-3.5 text-brand" />{currentStreak(progress)}</span>
          </span>
          <button
            onClick={() => setSoundEnabled(!progress.soundEnabled)}
            aria-label={progress.soundEnabled ? "Mute sounds" : "Unmute sounds"}
            className="hidden h-8 w-8 place-items-center rounded-full text-ink-2 hover:bg-surface-2 hover:text-ink sm:grid"
          >
            {progress.soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </button>
          {prev && (
            <Link href={lessonPath(prev.id)} aria-label={`Previous: ${prev.title}`} className="hidden h-8 w-8 place-items-center rounded-full text-ink-2 hover:bg-surface-2 hover:text-ink sm:grid">
              <ChevronLeft className="h-4 w-4" />
            </Link>
          )}
          {next && (
            <Link href={lessonPath(next.id)} aria-label={`Next: ${next.title}`} className="hidden h-8 w-8 place-items-center rounded-full text-ink-2 hover:bg-surface-2 hover:text-ink sm:grid">
              <ChevronRight className="h-4 w-4" />
            </Link>
          )}
          <button
            onClick={() => void execute("run")}
            disabled={running}
            title="Run your code and watch the stage (Ctrl/⌘ + Enter)"
            className="btn btn-sm"
          >
            <Play className="h-3.5 w-3.5" fill="currentColor" />
            Run
            <kbd className="ml-1 hidden rounded bg-ink/10 px-1.5 py-0.5 font-mono text-[10px] font-medium xl:inline">Ctrl ↵</kbd>
          </button>
          <button
            onClick={() => void execute("submit")}
            disabled={running}
            title="Check your work and complete the lesson (Ctrl/⌘ + Shift + Enter)"
            className="btn btn-primary btn-sm"
          >
            <Send className="h-3.5 w-3.5" />
            Submit
            <kbd className="ml-1 hidden rounded bg-black/10 px-1.5 py-0.5 font-mono text-[10px] font-medium xl:inline">Ctrl ⇧ ↵</kbd>
          </button>
        </div>
      </header>

      {/* panels */}
      <div className="flex min-h-0 flex-1 flex-col p-2 sm:p-3">
        <WorkspaceLayout
          mode={layoutMode}
          active={MOBILE_PANEL[mobileTab]}
          resultsCollapsed={resultsCollapsed}
          onExpandResults={() => setResultsCollapsed(false)}
          panels={{
            lesson: (
              <section className="card flex h-full min-h-0 flex-col overflow-hidden">
                <LessonPanel
                  key={lesson.id}
                  ctx={ctx}
                  feature={feature}
                  alreadyDone={featureAlive}
                  attempts={progress.attempts[lesson.id] ?? 0}
                  hintsSeen={progress.hintsSeen[lesson.id] ?? 0}
                  onRevealHint={(n) => recordHint(lesson.id, n)}
                  onUseSolution={() => {
                    setCode(solution);
                    setPristine(false);
                    setMobileTab("code");
                  }}
                />
              </section>
            ),
            editor: (
              <section className="card flex h-full min-h-0 flex-col overflow-hidden">
                <div className="flex h-10 shrink-0 items-center justify-between border-b border-line px-3">
                  <span className="flex min-w-0 items-center gap-2 font-mono text-xs font-medium">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" /> main.py
                    <span className="hidden truncate font-sans font-medium text-ink-3 sm:inline">· your whole {project.title} program</span>
                  </span>
                  <button onClick={reset} className="flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs text-ink-3 hover:bg-surface-2 hover:text-ink">
                    <RotateCcw className="h-3.5 w-3.5" /> Reset lesson
                  </button>
                </div>
                <div className="min-h-0 flex-1">
                  <CodeEditor
                    value={code}
                    onChange={(v) => {
                      setCode(v);
                      setPristine(false);
                    }} onRun={() => void runRef.current("run")} onSubmit={() => void runRef.current("submit")} errorLine={errorLine} errorMessage={runError ? `${runError.type}: ${runError.message}` : undefined} revealKey={lesson.id} />
                </div>
              </section>
            ),
            results: (
              <section className="card flex h-full min-h-0 flex-col overflow-hidden">
                <ResultsPanel
                  tab={resultTab}
                  onTab={(t) => {
                    setResultTab(t);
                    setResultsCollapsed(false);
                  }}
                  tests={lesson.tests}
                  results={results}
                  stdout={stdout}
                  error={runError}
                  running={running}
                  statusText={statusText}
                  collapsed={layoutMode !== "phone" && resultsCollapsed}
                  onToggleCollapsed={layoutMode === "phone" ? undefined : () => setResultsCollapsed((c) => !c)}
                />
              </section>
            ),
            stage: (
              <section className="flex h-full min-h-0 min-w-0 flex-col">
                <StageShell
                  project={project}
                  program={program}
                  unlocked={unlocked}
                  focus={lesson.unlocks[0] ?? null}
                  celebration={celebration}
                  status={status}
                  statusText={statusText}
                  emptyHint="Press Run to boot your code"
                />
              </section>
            ),
          }}
        />
      </div>

      {/* mobile tab bar */}
      <nav className="grid shrink-0 grid-cols-4 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden">
        {mobileTabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setMobileTab(t.id)}
            className={`flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${mobileTab === t.id ? "text-ink" : "text-ink-3"}`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </nav>

      {/* feedback bar: one clear next step after Submit */}
      {completion && (
        <FeedbackBar tone="good" onDismiss={() => setCompletion(null)}>
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary text-primary-ink">
            {feature && completion.firstTime ? <FeatureIcon id={feature.id} className="h-5 w-5" /> : <Check className="h-5 w-5" strokeWidth={2.5} />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold leading-tight">
              {completion.firstTime ? "Correct. Lesson complete." : "Still passing."}
              {completion.firstTime && <span className="ml-2 text-sm font-medium text-brand">+{completion.xpGained} XP</span>}
            </p>
            <p className="truncate text-sm text-ink-2">
              {completion.leveledUp ? `Level up: you're now a ${completion.rank}. ` : ""}
              {feature && completion.firstTime ? `${feature.title} is now working.` : lesson.explanation}
            </p>
          </div>
          {next ? (
            <Link href={lessonPath(next.id)} className="btn btn-primary shrink-0 !h-10 !px-5">
              Continue <ArrowRight className="h-4 w-4" />
            </Link>
          ) : (
            <Link href={`/projects/${project.slug}`} className="btn btn-primary shrink-0 !h-10 !px-5">
              See your build <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </FeedbackBar>
      )}
      {miss && !completion && (
        <FeedbackBar tone="bad" onDismiss={() => setMiss(null)}>
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-bad/15 text-bad">
            <X className="h-5 w-5" strokeWidth={2.5} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold leading-tight">Not quite yet.</p>
            <p className="truncate text-sm text-ink-2">
              {miss.passed} of {miss.total} checks passed. Look at the first failing check, or open a hint.
            </p>
          </div>
          <button
            onClick={() => {
              setResultTab("checks");
              setResultsCollapsed(false);
              setMobileTab("checks");
              setMiss(null);
            }}
            className="btn shrink-0 !h-10 !px-5"
          >
            See checks
          </button>
        </FeedbackBar>
      )}
    </div>
  );
}

function FeedbackBar({ tone, onDismiss, children }: { tone: "good" | "bad"; onDismiss: () => void; children: React.ReactNode }) {
  return (
    <div
      role="status"
      className={`pop-in fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-[70] border-t lg:bottom-0 ${
        tone === "good" ? "border-brand/40 bg-tint" : "border-bad/30 bg-surface"
      }`}
    >
      <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3.5 sm:gap-4 sm:py-4">
        {children}
        <button onClick={onDismiss} aria-label="Dismiss" className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-ink-3 hover:bg-surface-2 hover:text-ink">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
