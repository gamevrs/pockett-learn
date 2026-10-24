import React from "react";
import type { Metadata } from "next";
import { PROJECTS, UPCOMING, summarize } from "@/content";
import { flattenLessons } from "@/engine/types";
import { ProjectCard, UpcomingCard } from "@/components/projects/ProjectCard";

export const metadata: Metadata = {
  title: "Pick your build",
  description: "Choose a project. Every lesson you pass makes it come alive.",
};

export default function ProjectsPage() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
      <p className="eyebrow">Step 1</p>
      <h1 className="font-display mt-3 text-5xl sm:text-7xl">
        Pick something you want <span className="text-gradient">to see move.</span>
      </h1>
      <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-2">
        Every project starts as a ghostly blueprint. Each Python concept you learn bolts a real part onto it, until the thing you built is running in front of you. No experience needed.
      </p>

      <div className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {PROJECTS.map((p) => (
          <ProjectCard key={p.slug} project={summarize(p)} lessonIds={flattenLessons(p).map((l) => l.id)} />
        ))}
      </div>

      <div className="mt-16">
        <p className="eyebrow">On the workbench</p>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {UPCOMING.map((u) => (
            <UpcomingCard key={u.slug} project={u} />
          ))}
        </div>
      </div>
    </div>
  );
}
