"use client";

import React from "react";
import Link from "next/link";
import { ArrowUpRight, Clock, Layers } from "lucide-react";
import { useProgress } from "@/data/progress/store";
import type { UpcomingProject } from "@/engine/types";
import type { summarize } from "@/content";
import { ProjectArt } from "./ProjectArt";
import { FeatureIcon, ProjectIcon } from "@/components/ui/icons";
import { languageInfo } from "@/engine/languages";

type Summary = ReturnType<typeof summarize>;

export function ProjectCard({ project, lessonIds }: { project: Summary; lessonIds: string[] }) {
  const progress = useProgress();
  const done = lessonIds.filter((id) => progress.completed[id]).length;
  const pct = Math.round((done / lessonIds.length) * 100);

  return (
    <Link
      href={`/projects/${project.slug}`}
      className="pop-card group flex flex-col overflow-hidden"
    >
      <div className="relative m-2 mb-0 aspect-[400/220] overflow-hidden rounded-xl">
        <ProjectArt slug={project.sceneId} />
        <span className="sticker absolute left-3 top-3">{languageInfo(project.language).label} · {project.difficulty}</span>
        <span className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-white/90 text-black opacity-0 transition-opacity group-hover:opacity-100">
          <ArrowUpRight className="h-4 w-4" />
        </span>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <ProjectIcon slug={project.slug} className="h-[18px] w-[18px] text-brand" />
          {project.title}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-ink-2">{project.tagline}</p>

        <div className="mt-4 flex flex-wrap gap-1.5">
          <span className="chip"><Layers className="h-3 w-3" />{project.lessonCount} lessons</span>
          <span className="chip"><Clock className="h-3 w-3" />~{project.hours}h</span>
        </div>

        <p className="mt-5 text-xs font-medium text-ink-3">What you build</p>
        <div className="mt-2 flex flex-wrap gap-1">
          {project.features.map((f) => (
            <span key={f.id} title={f.title} className="grid h-7 w-7 place-items-center rounded-full border border-line bg-surface-2 text-ink-2">
              <FeatureIcon id={f.id} />
            </span>
          ))}
        </div>

        <div className="mt-auto pt-5">
          <div className="flex items-center justify-between text-xs font-medium">
            <span className="text-ink-2">{done === 0 ? "Not started" : done === lessonIds.length ? "Complete" : `${done}/${lessonIds.length} lessons`}</span>
            <span className="text-ink-3">{pct}%</span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-2">
            <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>
    </Link>
  );
}

/** A project on the roadmap: visibly quieter than a real card, and not a link. */
export function UpcomingCard({ project, showLanguage }: { project: UpcomingProject; showLanguage?: boolean }) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-dashed border-[var(--line-strong)] p-4">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-surface-2 text-ink-3">
          <ProjectIcon slug={project.slug} className="h-[18px] w-[18px]" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-ink-2">{project.title}</p>
          {showLanguage && project.language && <p className="text-xs text-ink-3">{languageInfo(project.language).label}</p>}
        </div>
        <span className="chip shrink-0">Planned</span>
      </div>
      <p className="text-sm leading-relaxed text-ink-3">{project.tagline}</p>
      {project.skills && project.skills.length > 0 && (
        <div className="mt-auto flex flex-wrap gap-1">
          {project.skills.slice(0, 4).map((s) => (
            <span key={s} className="rounded-md border border-line px-1.5 py-0.5 font-mono text-[0.68rem] text-ink-3">
              {s}
            </span>
          ))}
          {project.skills.length > 4 && <span className="px-1 py-0.5 text-[0.68rem] text-ink-3">+{project.skills.length - 4}</span>}
        </div>
      )}
    </div>
  );
}
