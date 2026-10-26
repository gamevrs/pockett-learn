"use client";

import React, { useState } from "react";
import { Check, Clock } from "lucide-react";
import { TIERS, type Difficulty, type LanguageId, type Track, type UpcomingProject } from "@/engine/types";
import { LANGUAGES, TRACKS } from "@/engine/languages";
import { useProgress } from "@/data/progress/store";
import type { summarize } from "@/content";
import { ProjectCard, UpcomingCard } from "./ProjectCard";

type Summary = ReturnType<typeof summarize>;

/** A path is a language, or a cross-language track such as AI & Machine Learning. */
type PathId = LanguageId | Track;

const ORDER: PathId[] = ["python", "ai", "javascript", "sql", "csharp", "cpp", "go", "rust"];

const isTrack = (id: PathId): id is Track => id in TRACKS;

function pathInfo(id: PathId): { label: string; blurb: string; runsIn: "browser" | "server" } {
  return isTrack(id) ? { label: TRACKS[id].label, blurb: TRACKS[id].blurb, runsIn: "browser" } : LANGUAGES[id];
}

/** What each rung of the ladder means, in a few words. */
const TIER_NOTE: Record<Difficulty, string> = {
  Beginner: "Your first programs, one idea at a time",
  Intermediate: "Real tools that handle messy input",
  Advanced: "Patterns that keep bigger code tidy",
  Professional: "Production-style systems you could ship",
};

/**
 * Every language is a path: Beginner → Intermediate → Advanced → Professional. Built projects are
 * cards you can open; planned ones sit beside them, quieter, so the whole ladder is visible.
 */
export function ProjectBrowser({
  projects,
  lessonIds,
  upcoming,
}: {
  projects: Summary[];
  lessonIds: Record<string, string[]>;
  upcoming: UpcomingProject[];
}) {
  const progress = useProgress();
  const [filter, setFilter] = useState<PathId | "all">("all");

  const builtIn = (id: PathId) => projects.filter((p) => (isTrack(id) ? p.track === id : p.language === id && !p.track));
  const plannedIn = (id: PathId) => upcoming.filter((u) => (isTrack(id) ? u.track === id : (u.language ?? "python") === id && !u.track));
  const hasPath = (id: PathId) => builtIn(id).length + plannedIn(id).length > 0;

  const visible = filter === "all" ? ORDER.filter(hasPath) : [filter];
  const soon = filter !== "all" && !hasPath(filter);

  const tab = (id: PathId | "all", label: string, count?: number) => (
    <button
      key={id}
      onClick={() => setFilter(id)}
      aria-pressed={filter === id}
      className={`inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-sm transition-colors ${
        filter === id ? "border-transparent bg-ink text-bg" : "border-line bg-surface text-ink-2 hover:border-[var(--line-strong)] hover:text-ink"
      }`}
    >
      {label}
      {count !== undefined && (
        <span className={`text-xs tabular-nums ${filter === id ? "opacity-60" : "text-ink-3"}`}>{count || "soon"}</span>
      )}
    </button>
  );

  return (
    <div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by language or track">
        {tab("all", "All")}
        {ORDER.map((id) => tab(id, pathInfo(id).label, builtIn(id).length))}
      </div>

      {soon ? (
        <div className="tint-panel mt-8 flex flex-col items-start gap-3 p-8 sm:p-10">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-surface text-brand">
            <Clock className="h-5 w-5" />
          </span>
          <h2 className="font-display text-2xl">{pathInfo(filter as PathId).label} is coming soon</h2>
          <p className="max-w-lg text-ink-2">
            {pathInfo(filter as PathId).label} courses are being written and will open as soon as they are ready.
          </p>
          <button className="btn btn-sm mt-1" onClick={() => setFilter("all")}>
            See available courses
          </button>
        </div>
      ) : (
        <div className="mt-10 space-y-16 sm:space-y-20">
          {visible.map((id) => (
            <LanguagePath
              key={id}
              language={id}
              built={builtIn(id)}
              planned={plannedIn(id)}
              lessonIds={lessonIds}
              completed={progress.completed}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function LanguagePath({
  language,
  built,
  planned,
  lessonIds,
  completed,
}: {
  language: PathId;
  built: Summary[];
  planned: UpcomingProject[];
  lessonIds: Record<string, string[]>;
  completed: Record<string, unknown>;
}) {
  const info = pathInfo(language);
  const allLessons = built.flatMap((p) => lessonIds[p.slug] ?? []);
  const done = allLessons.filter((id) => completed[id]).length;
  const pct = allLessons.length ? Math.round((done / allLessons.length) * 100) : 0;
  const needsRunner = info.runsIn === "server" && built.length === 0;

  const tiers = TIERS.map((tier) => {
    const tierBuilt = built.filter((p) => p.difficulty === tier);
    const tierPlanned = planned.filter((u) => u.difficulty === tier);
    const tierLessons = tierBuilt.flatMap((p) => lessonIds[p.slug] ?? []);
    const tierDone = tierLessons.filter((id) => completed[id]).length;
    return {
      tier,
      built: tierBuilt,
      planned: tierPlanned,
      complete: tierLessons.length > 0 && tierDone === tierLessons.length && tierPlanned.length === 0,
      started: tierDone > 0,
    };
  });

  return (
    <section aria-labelledby={`path-${language}`}>
      <header className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4 border-b border-line pb-6">
        <div className="min-w-0 max-w-xl">
          <p className="eyebrow">Learning path</p>
          <h2 id={`path-${language}`} className="font-display mt-2 text-[2rem] sm:text-[2.5rem]">
            {info.label} path
          </h2>
          <p className="mt-2 text-ink-2">{info.blurb}</p>
        </div>
        <div className="w-full max-w-[16rem] sm:w-64">
          <div className="flex items-center justify-between gap-3 text-xs">
            <span className="text-ink-2">
              {allLessons.length === 0
                ? needsRunner
                  ? "Planned"
                  : "Not started"
                : done === 0
                  ? `${built.length} ${built.length === 1 ? "project" : "projects"} · ${allLessons.length} lessons`
                  : `${done}/${allLessons.length} lessons`}
            </span>
            <span className="tabular-nums text-ink-3">{allLessons.length ? `${pct}%` : ""}</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2">
            <div className="h-full rounded-full bg-primary transition-all duration-700" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </header>

      {needsRunner && (
        <p className="mt-6 flex items-start gap-2 text-sm text-ink-2">
          <Clock className="mt-0.5 h-4 w-4 shrink-0 text-ink-3" />
          {info.label} courses are coming soon. These projects are planned and will open as they are written.
        </p>
      )}

      <ol className="mt-8">
        {tiers.map((t, i) => {
          const last = i === tiers.length - 1;
          const empty = t.built.length === 0 && t.planned.length === 0;
          return (
            <li key={t.tier} className="relative flex gap-3 sm:gap-5">
              <div className="relative flex w-8 shrink-0 flex-col items-center sm:w-10">
                <span
                  aria-hidden
                  className={`z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full border font-mono text-xs font-medium sm:h-10 sm:w-10 sm:text-sm ${
                    t.complete
                      ? "border-transparent bg-primary text-primary-ink"
                      : t.started
                        ? "border-[var(--brand)] bg-surface text-brand ring-4 ring-[var(--brand-soft)]"
                        : t.built.length > 0
                          ? "border-[var(--line-strong)] bg-surface text-ink"
                          : "border-line bg-surface-2 text-ink-3"
                  }`}
                >
                  {t.complete ? <Check className="h-4 w-4" strokeWidth={2.5} /> : i + 1}
                </span>
                {!last && (
                  <span
                    aria-hidden
                    className={`mt-1 w-0.5 flex-1 rounded-full ${t.complete ? "bg-primary" : t.built.length > 0 ? "bg-[var(--line-strong)]" : "bg-[var(--line)]"}`}
                  />
                )}
              </div>

              <div className={`min-w-0 flex-1 ${last ? "" : "pb-10 sm:pb-12"}`}>
                <div className="flex min-h-8 flex-wrap items-baseline gap-x-3 gap-y-0.5 sm:min-h-10 sm:items-center">
                  <h3 className={`text-lg font-semibold tracking-tight ${empty ? "text-ink-3" : ""}`}>{t.tier}</h3>
                  <p className="text-sm text-ink-3">{TIER_NOTE[t.tier]}</p>
                </div>

                {t.built.length > 0 && (
                  <div className="mt-4 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                    {t.built.map((p) => (
                      <ProjectCard key={p.slug} project={p} lessonIds={lessonIds[p.slug] ?? []} />
                    ))}
                  </div>
                )}
                {t.planned.length > 0 && (
                  <div className={`grid gap-5 md:grid-cols-2 xl:grid-cols-3 ${t.built.length > 0 ? "mt-5" : "mt-4"}`}>
                    {t.planned.map((u) => (
                      <UpcomingCard key={u.slug} project={u} />
                    ))}
                  </div>
                )}
                {empty && <p className="mt-2 text-sm text-ink-3">Nothing planned here yet.</p>}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
