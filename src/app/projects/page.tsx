import React from "react";
import type { Metadata } from "next";
import { PROJECTS, UPCOMING, summarize } from "@/content";
import { flattenLessons } from "@/engine/types";
import { ProjectBrowser } from "@/components/projects/ProjectBrowser";

export const metadata: Metadata = {
  title: "Projects",
  description: "Choose a project in Python, JavaScript or SQL. Every lesson you pass adds a working part to a live build.",
};

export default function ProjectsPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <p className="eyebrow">Projects</p>
      <h1 className="font-display mt-3 text-balance text-[2.5rem] sm:text-[3.25rem]">Choose what you want to build</h1>
      <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-2">
        Each project starts as a blueprint. Every concept you learn adds a working part, until the whole thing runs in front of you. Pick a
        language, or start with Python if you&apos;re new to code.
      </p>

      <div className="mt-10">
        <ProjectBrowser
          projects={PROJECTS.map(summarize)}
          lessonIds={Object.fromEntries(PROJECTS.map((p) => [p.slug, flattenLessons(p).map((l) => l.id)]))}
          upcoming={UPCOMING}
        />
      </div>
    </div>
  );
}
