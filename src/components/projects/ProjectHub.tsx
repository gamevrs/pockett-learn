"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Clock } from "lucide-react";
import { featuresUnlockedBy, flattenLessons, languageOf, TIERS, type Project } from "@/engine/types";
import type { PrerequisiteRef } from "@/content";
import { languageInfo } from "@/engine/languages";
import type { ProgramHandle } from "@/engine/program";
import { latestBuild } from "@/engine/compose";
import { loadRuntime, preloadRuntime } from "@/engine/runtimes";
import { submittedCode, useProgress } from "@/data/progress/store";
import { StageShell, type StageStatus } from "@/components/stage/StageShell";
import { AdSlot } from "@/components/ads/AdSlot";
import { FeatureIcon, ProjectIcon } from "@/components/ui/icons";

export function ProjectHub({ project, prerequisites = [] }: { project: Project; prerequisites?: PrerequisiteRef[] }) {
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
    preloadRuntime(languageOf(project));
  }, [project]);

  useEffect(() => {
    if (!build) return;
    let cancelled = false;
    loadRuntime(languageOf(project))
      .then((rt) => rt.run(build.code, { setup: project.setup, prelude: project.prelude, packages: project.packages }))
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
  const ctaLabel = finished ? "Replay from the start" : doneIds.length === 0 ? "Start the first lesson" : `Continue: ${nextLesson?.title}`;

  return (
    <div>
      <section className="border-b border-line">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_1.2fr] lg:py-16">
          <div className="flex min-w-0 flex-col justify-center">
            <Link href="/projects" prefetch={false} className="-mt-1 mb-5 inline-flex min-h-10 w-fit items-center gap-1.5 text-sm text-ink-3 hover:text-ink">
              <ArrowLeft className="h-3.5 w-3.5" /> All projects
            </Link>
            <span className="grid h-11 w-11 place-items-center rounded-full bg-tint text-brand">
              <ProjectIcon slug={project.slug} className="h-5 w-5" />
            </span>
            <h1 className="font-display mt-5 text-[2.5rem] sm:text-[3.25rem]">{project.title}</h1>
            <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-3">
              <span>{languageInfo(project.language).label}</span>
              <span aria-hidden>·</span>
              <span
                className="inline-flex items-center gap-1.5 text-ink-2"
                title={`Tier ${TIERS.indexOf(project.difficulty) + 1} of ${TIERS.length} on the ${languageInfo(project.language).label} path`}
              >
                <span className="flex gap-0.5" aria-hidden>
                  {TIERS.map((t, i) => (
                    <span key={t} className={`h-1.5 w-3.5 rounded-full ${i <= TIERS.indexOf(project.difficulty) ? "bg-primary" : "bg-[var(--line-strong)]"}`} />
                  ))}
                </span>
                {project.difficulty}
              </span>
              <span aria-hidden>·</span>
              <span>about {project.hours} hours</span>
              <span aria-hidden>·</span>
              <span>{lessons.length} lessons</span>
            </p>
            {prerequisites.length > 0 && (
              <p className="mt-3 text-sm text-ink-2">
                <span className="text-ink-3">Recommended first: </span>
                {prerequisites.map((p, i) => (
                  <React.Fragment key={p.slug}>
                    {i > 0 && ", "}
                    {p.available ? (
                      <Link href={`/projects/${p.slug}`} className="font-medium text-ink underline underline-offset-4 hover:text-brand">
                        {p.title}
                      </Link>
                    ) : (
                      <span className="text-ink-2">{p.title} (planned)</span>
                    )}
                  </React.Fragment>
                ))}
              </p>
            )}
            <p className="mt-5 max-w-lg text-base leading-relaxed text-ink-2 sm:text-lg">{project.pitch}</p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href={`/projects/${project.slug}/${cta.id}`} prefetch={false} className="btn btn-primary !h-11 !px-5">
                {ctaLabel} <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="mt-8 max-w-md">
              <div className="flex items-center justify-between gap-4 text-xs text-ink-2">
                <span>
                  {doneIds.length === 0
                    ? "Not started"
                    : `${doneIds.length} of ${lessons.length} lessons · ${unlocked.size}/${project.features.length} parts working`}
                </span>
                <span className="tabular-nums">
                  {earnedXp}/{totalXp} XP
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2">
                <div className="h-full rounded-full bg-primary transition-all duration-700" style={{ width: `${pct}%` }} />
              </div>
            </div>
          </div>

          <div className="tint-panel h-[400px] min-w-0 p-2 sm:h-[480px] sm:p-3">
            <StageShell
              project={project}
              program={program}
              unlocked={unlocked}
              status={status}
              statusText="Booting your build…"
              surface="hub"
              emptyHint={
                bootFailed
                  ? languageOf(project) === "python"
                    ? "Couldn't load Python. Check your connection and reload."
                    : "Couldn't run your build. Check your connection and reload."
                  : doneIds.length === 0
                    ? "Pass lesson 1 to power it up"
                    : undefined
              }
            />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="grid gap-12 lg:grid-cols-[1fr_300px]">
          <div>
            <h2 className="font-display text-[2rem]">Learning path</h2>
            <p className="mt-2 text-ink-2">Each lesson adds one working part to your build.</p>

            <div className="mt-8 space-y-6">
              {project.chapters.map((chapter, ci) => {
                const chapterDone = chapter.lessons.filter((l) => progress.completed[l.id]).length;
                return (
                  <div key={chapter.id} className="card p-5 sm:p-7">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-medium text-ink-3">Chapter {ci + 1}</p>
                        <h3 className="mt-1 text-xl font-semibold tracking-tight">{chapter.title}</h3>
                        <p className="mt-1 text-sm text-ink-2">{chapter.blurb}</p>
                      </div>
                      <span className="chip tabular-nums">
                        {chapterDone}/{chapter.lessons.length} done
                      </span>
                    </div>

                    <ol className="mt-6">
                      {chapter.lessons.map((lesson, li) => {
                        const done = Boolean(progress.completed[lesson.id]);
                        const isNext = nextLesson?.id === lesson.id;
                        const feats = lesson.unlocks
                          .map((id) => project.features.find((f) => f.id === id))
                          .filter((f) => f !== undefined);
                        const last = li === chapter.lessons.length - 1;
                        return (
                          <li key={lesson.id} className="relative">
                            {!last && (
                              <span
                                className={`absolute left-[25px] top-[50px] h-[calc(100%-46px)] w-0.5 rounded-full ${done ? "bg-primary" : "bg-[var(--line)]"}`}
                              />
                            )}
                            <Link
                              href={`/projects/${project.slug}/${lesson.id}`}
                              prefetch={false}
                              className={`group flex items-center gap-4 rounded-2xl p-1 ${last ? "" : "pb-5"}`}
                            >
                              <span
                                className={`grid h-11 w-11 shrink-0 place-items-center rounded-full border transition-colors ${
                                  done
                                    ? "border-transparent bg-primary text-primary-ink"
                                    : isNext
                                      ? "border-[var(--brand)] bg-surface text-brand ring-4 ring-[var(--brand-soft)]"
                                      : "border-line bg-surface-2 text-ink-3 group-hover:text-ink-2"
                                }`}
                              >
                                {done ? (
                                  <Check className="h-5 w-5" strokeWidth={2.5} />
                                ) : (
                                  <FeatureIcon id={feats[0]?.id ?? ""} className="h-[18px] w-[18px]" />
                                )}
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className={`font-medium leading-snug group-hover:underline ${done || isNext ? "text-ink" : "text-ink-2"}`}>
                                  {lesson.title}
                                </p>
                                <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-ink-3">
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {lesson.minutes} min
                                  </span>
                                  <span>{lesson.xp} XP</span>
                                  {feats.length > 0 && <span>Adds {feats.map((f) => f.title).join(", ")}</span>}
                                </p>
                              </div>
                              {isNext && (
                                <span className="btn btn-primary btn-sm hidden shrink-0 sm:inline-flex">
                                  {doneIds.length === 0 ? "Start" : "Continue"}
                                </span>
                              )}
                            </Link>
                          </li>
                        );
                      })}
                    </ol>
                  </div>
                );
              })}
            </div>
          </div>

          <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
            <div className="card p-5">
              <p className="text-sm font-medium">You will learn</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {project.skills.map((s) => (
                  <span key={s} className="chip font-mono">
                    {s}
                  </span>
                ))}
              </div>
            </div>
            <div className="card p-5">
              <p className="text-sm font-medium">Controls</p>
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
