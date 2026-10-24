"use client";

import React from "react";
import Link from "next/link";
import { ArrowUpRight, Clock, Layers } from "lucide-react";
import { useProgress } from "@/data/progress/store";
import type { UpcomingProject } from "@/engine/types";
import type { summarize } from "@/content";
import { ProjectArt } from "./ProjectArt";

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
      <div className="relative aspect-[400/220] overflow-hidden border-b-2 border-[var(--line-strong)]">
        <ProjectArt slug={project.slug} emoji={project.emoji} />
        <span className="sticker absolute left-3 top-3">{project.difficulty}</span>
        <span className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white text-black opacity-0 transition-opacity group-hover:opacity-100">
          <ArrowUpRight className="h-4 w-4" />
        </span>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-display text-3xl">
          {project.emoji} {project.title}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-ink-2">{project.tagline}</p>

        <div className="mt-4 flex flex-wrap gap-1.5">
          <span className="chip"><Layers className="h-3 w-3" />{project.lessonCount} lessons</span>
          <span className="chip"><Clock className="h-3 w-3" />~{project.hours}h</span>
        </div>

        <p className="eyebrow mt-5">Comes alive</p>
        <div className="mt-2 flex flex-wrap gap-1">
          {project.features.map((f) => (
            <span key={f.id} title={f.title} className="grid h-8 w-8 place-items-center rounded-lg border border-line bg-surface-2 text-base">
              {f.emoji}
            </span>
          ))}
        </div>

        <div className="mt-auto pt-5">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-ink-2">{done === 0 ? "Not started" : done === lessonIds.length ? "Complete 🎉" : `${done}/${lessonIds.length} lessons`}</span>
            <span className="text-ink-3">{pct}%</span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-2">
            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "linear-gradient(120deg, var(--brand-light), var(--brand) 55%, var(--brand-deep))" }} />
          </div>
        </div>
      </div>
    </Link>
  );
}

export function UpcomingCard({ project }: { project: UpcomingProject }) {
  return (
    <div
      className="flex items-center gap-4 rounded-2xl border-2 border-dashed border-line p-4"
    >
      <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-3xl" style={{ background: "linear-gradient(120deg, var(--brand-light), var(--brand) 55%, var(--brand-deep))" }}>
        {project.emoji}
      </span>
      <div className="min-w-0">
        <p className="font-display text-xl">{project.title}</p>
        <p className="text-sm text-ink-2">{project.tagline}</p>
      </div>
      <span className="chip ml-auto shrink-0">Soon</span>
    </div>
  );
}
