"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Clock, Play, Zap } from "lucide-react";
import { featuresUnlockedBy, flattenLessons, type Project } from "@/engine/types";
import type { ProgramHandle } from "@/engine/program";
import { latestBuild } from "@/engine/compose";
import { preloadPython, runProgram } from "@/engine/python/host";
import { submittedCode, useProgress } from "@/data/progress/store";
import { StageShell, type StageStatus } from "@/components/stage/StageShell";
import { AdSlot } from "@/components/ads/AdSlot";

export function ProjectHub({ project }: { project: Project }) {
  const progress = useProgress();
  const lessons = flattenLessons(project);
  const doneIds = Object.keys(progress.completed).filter((id) => lessons.some((l) => l.id === id));
  const unlocked = featuresUnlockedBy(project, doneIds);
  const nextLesson = lessons.find((l) => !progress.completed[l.id]) ?? null;
  const finished = doneIds.length === lessons.length;
  const pct = Math.round((doneIds.length / lessons.length) * 100);
  const totalXp = lessons.reduce((s, l) => s + l.xp, 0);
  const earnedXp = lessons.filter((l) => progress.completed[l.id]).reduce((s, l) => s + l.xp, 0);

  // Boot the learner's own latest build on the stage.
  const build = useMemo(() => latestBuild(project, submittedCode(progress)), [project, progress]);
  const buildKey = build ? `${build.lessonId}:${hashCode(build.code)}` : null;
  const [program, setProgram] = useState<ProgramHandle | null>(null);
  const [bootedKey, setBootedKey] = useState<string | null>(null);
  const [bootFailed, setBootFailed] = useState(false);
  const status: StageStatus = buildKey !== null && bootedKey !== buildKey ? "loading" : "idle";
  const live = useRef<ProgramHandle | null>(null);

  useEffect(() => {
    preloadPython();
  }, []);

  useEffect(() => {
    if (!build) return;
    let cancelled = false;
    runProgram(build.code)
      .then((out) => {
        if (cancelled) {
          out.program?.dispose();
          return;
        }
        live.current?.dispose();
        live.current = out.program;
        setProgram(out.program);
        setBootFailed(false);
      })
      .catch(() => {
        if (!cancelled) setBootFailed(true);
      })
      .finally(() => {
        if (!cancelled) setBootedKey(buildKey);
      });
    return () => {
      // also runs when the route is hidden: drop the program so nothing calls a disposed one
      cancelled = true;
      live.current?.dispose();
      live.current = null;
      setProgram(null);
      setBootedKey(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buildKey]);

  const cta = nextLesson ?? lessons[0];
  const ctaLabel = finished ? "Replay from the start" : doneIds.length === 0 ? "Start building" : `Continue: ${nextLesson?.title}`;

  return (
    <div>
      <section className="relative overflow-hidden border-b border-line">
        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_1.15fr] lg:py-16">
          <div className="flex min-w-0 flex-col justify-center">
            <p className="eyebrow">
              {project.difficulty} · ~{project.hours}h · {lessons.length} lessons
            </p>
            <h1 className="font-display mt-4 text-6xl sm:text-7xl">
              {project.emoji}
              <br />
              <span className="text-gradient">{project.title}</span>
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-ink-2">{project.pitch}</p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href={`/projects/${project.slug}/${cta.id}`} className="btn btn-primary">
                <Play className="h-4 w-4" fill="currentColor" />
                {ctaLabel}
              </Link>
              <span className="chip">
                <Zap className="h-3 w-3" fill="currentColor" />
                {earnedXp}/{totalXp} XP
              </span>
            </div>

            <div className="mt-8 max-w-md">
              <div className="flex items-center justify-between text-xs font-bold text-ink-2">
                <span>{doneIds.length === 0 ? "Not started: still a blueprint" : `${unlocked.size}/${project.features.length} parts alive`}</span>
                <span>{pct}%</span>
              </div>
              <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-surface-2">
                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: "linear-gradient(120deg, var(--brand-light), var(--brand) 55%, var(--brand-deep))" }} />
              </div>
            </div>
          </div>

          <div className="h-[420px] min-w-0 sm:h-[500px]">
            <StageShell
              project={project}
              program={program}
              unlocked={unlocked}
              status={status}
              statusText="Booting your build…"
              emptyHint={bootFailed ? "Couldn't load Python. Check your connection and reload." : doneIds.length === 0 ? "Pass lesson 1 to power it up" : undefined}
            />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="grid gap-12 lg:grid-cols-[1fr_320px]">
          <div>
            <p className="eyebrow">Roadmap</p>
            <h2 className="font-display mt-3 text-4xl sm:text-5xl">Every lesson builds a part.</h2>

            <div className="mt-10 space-y-12">
              {project.chapters.map((chapter, ci) => (
                <div key={chapter.id}>
                  <div className="flex items-baseline gap-3">
                    <span className="font-display text-5xl text-ink-3/40">{String(ci + 1).padStart(2, "0")}</span>
                    <div>
                      <h3 className="font-display text-2xl">{chapter.title}</h3>
                      <p className="text-sm text-ink-2">{chapter.blurb}</p>
                    </div>
                  </div>
                  <ol className="relative mt-5 space-y-3 border-l-2 border-line pl-6">
                    {chapter.lessons.map((lesson) => {
                      const done = Boolean(progress.completed[lesson.id]);
                      const isNext = nextLesson?.id === lesson.id;
                      const feats = lesson.unlocks.map((id) => project.features.find((f) => f.id === id)).filter(Boolean);
                      return (
                        <li key={lesson.id} className="relative">
                          <span
                            className={`absolute -left-[37px] top-5 grid h-6 w-6 place-items-center rounded-full border-2 text-[10px] font-bold ${
                              done ? "border-transparent text-black" : isNext ? "pulse-ring border-[var(--accent-from)] bg-bg" : "border-line bg-bg text-ink-3"
                            }`}
                            style={done ? { background: "linear-gradient(120deg, var(--brand-light), var(--brand) 55%, var(--brand-deep))" } : undefined}
                          >
                            {done ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : null}
                          </span>
                          <Link
                            href={`/projects/${project.slug}/${lesson.id}`}
                            className={`card flex flex-col gap-3 p-4 transition-transform hover:-translate-y-0.5 sm:flex-row sm:items-center ${isNext ? "!border-[var(--accent-from)]" : ""}`}
                          >
                            <div className="min-w-0 flex-1">
                              <p className="font-display text-xl leading-tight">{lesson.title}</p>
                              <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-3">
                                <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{lesson.minutes} min</span>
                                <span>{lesson.xp} XP</span>
                                <span className="font-mono">{lesson.concepts.join(" · ")}</span>
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              {feats.map((f) => (
                                <span key={f!.id} className={`chip ${done ? "!border-transparent !text-black" : ""}`} style={done ? { background: "linear-gradient(120deg, var(--brand-light), var(--brand) 55%, var(--brand-deep))" } : undefined}>
                                  {f!.emoji} {f!.title}
                                </span>
                              ))}
                              <ArrowRight className="h-4 w-4 text-ink-3" />
                            </div>
                          </Link>
                        </li>
                      );
                    })}
                  </ol>
                </div>
              ))}
            </div>
          </div>

          <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
            <div className="card p-5">
              <p className="eyebrow">You will learn</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {project.skills.map((s) => (
                  <span key={s} className="chip font-mono">{s}</span>
                ))}
              </div>
            </div>
            <div className="card p-5">
              <p className="eyebrow">Controls</p>
              <ul className="mt-3 space-y-1.5 font-mono text-xs text-ink-2">
                {project.controls.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-ink-3">Click the stage first so it can hear your keys.</p>
            </div>
            <AdSlot slot="hub-sidebar" minHeight={250} />
          </aside>
        </div>
      </section>
    </div>
  );
}

/** Small, fast string hash (djb2) so a re-passed lesson with different code re-boots the stage. */
function hashCode(text: string): string {
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}
