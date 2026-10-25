import React from "react";
import type { Metadata } from "next";
import { PROJECTS, UPCOMING, summarize } from "@/content";
import { flattenLessons } from "@/engine/types";
import { ProjectCard, UpcomingCard } from "@/components/projects/ProjectCard";

export const metadata: Metadata = {
  title: "Projects",
  description: "Choose a Python project. Every lesson you pass adds a working part to a live 3D build.",
};

export default function ProjectsPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <p className="eyebrow">Projects</p>
      <h1 className="font-display mt-3 text-balance text-[2.5rem] sm:text-[3.25rem]">Choose what you want to build</h1>
      <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-2">
        Each project starts as a blueprint. Every Python concept you learn adds a working part, until the whole thing runs in front of you. No experience needed.
      </p>

      <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {PROJECTS.map((p) => (
          <ProjectCard key={p.slug} project={summarize(p)} lessonIds={flattenLessons(p).map((l) => l.id)} />
        ))}
      </div>

      <div className="mt-16">
        <p className="text-sm font-medium text-ink-2">Coming soon</p>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {UPCOMING.map((u) => (
            <UpcomingCard key={u.slug} project={u} />
          ))}
        </div>
      </div>
    </div>
  );
}
