"use client";

import React, { useState } from "react";
import { Clock } from "lucide-react";
import type { LanguageId, UpcomingProject } from "@/engine/types";
import { LANGUAGES } from "@/engine/languages";
import type { summarize } from "@/content";
import { ProjectCard, UpcomingCard } from "./ProjectCard";

type Summary = ReturnType<typeof summarize>;

const ORDER: LanguageId[] = ["python", "javascript", "sql", "csharp", "cpp", "go"];

/** Project grid with a language filter. Languages without courses yet show as "coming soon". */
export function ProjectBrowser({
  projects,
  lessonIds,
  upcoming,
}: {
  projects: Summary[];
  lessonIds: Record<string, string[]>;
  upcoming: UpcomingProject[];
}) {
  const [filter, setFilter] = useState<LanguageId | "all">("all");
  const counts = Object.fromEntries(ORDER.map((id) => [id, projects.filter((p) => p.language === id).length])) as Record<LanguageId, number>;
  const shown = filter === "all" ? projects : projects.filter((p) => p.language === filter);
  const soon = filter !== "all" && counts[filter] === 0;

  const tab = (id: LanguageId | "all", label: string, count?: number) => (
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
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by language">
        {tab("all", "All")}
        {ORDER.map((id) => tab(id, LANGUAGES[id].label, counts[id]))}
      </div>

      {soon ? (
        <div className="tint-panel mt-8 flex flex-col items-start gap-3 p-8 sm:p-10">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-surface text-brand">
            <Clock className="h-5 w-5" />
          </span>
          <h2 className="font-display text-2xl">{LANGUAGES[filter as LanguageId].label} is coming soon</h2>
          <p className="max-w-lg text-ink-2">
            {LANGUAGES[filter as LanguageId].label} courses compile and run on a secure code runner, which is being set up now. Python,
            JavaScript and SQL run right in your browser today.
          </p>
          <button className="btn btn-sm mt-1" onClick={() => setFilter("all")}>
            See available courses
          </button>
        </div>
      ) : (
        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {shown.map((p) => (
            <ProjectCard key={p.slug} project={p} lessonIds={lessonIds[p.slug] ?? []} />
          ))}
        </div>
      )}

      {filter === "all" && upcoming.length > 0 && (
        <div className="mt-16">
          <p className="text-sm font-medium text-ink-2">Coming soon</p>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {upcoming.map((u) => (
              <UpcomingCard key={u.slug} project={u} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
