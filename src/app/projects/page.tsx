import React from "react";
import type { Metadata } from "next";
import { PROJECTS, UPCOMING, summarize } from "@/content";
import { flattenLessons } from "@/engine/types";
import { ProjectBrowser } from "@/components/projects/ProjectBrowser";

export const metadata: Metadata = {
  title: "Projects",
  description: "Follow a path from zero to hero in Python, JavaScript, SQL and more. Every lesson you pass adds a working part to a live build.",
};

export default function ProjectsPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <p className="eyebrow">Projects</p>
      <h1 className="font-display mt-3 text-balance text-[2.5rem] sm:text-[3.25rem]">Pick a language, climb the path</h1>
      <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-2">
        Every language is a path from your first program to professional-grade projects: Beginner, Intermediate, Advanced, then
        Professional. Each project starts as a blueprint, and every concept you learn adds a working part until the whole thing runs in front
        of you. New to code? Start with Python.
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
