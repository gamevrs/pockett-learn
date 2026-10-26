import React, { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { PROJECTS, getProject, resolvePrerequisites } from "@/content";
import { ProjectHub } from "@/components/projects/ProjectHub";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return PROJECTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) return { title: "Project not found" };
  return { title: project.title, description: project.pitch };
}

async function Hub({ params }: PageProps) {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) notFound();
  return <ProjectHub project={project} prerequisites={resolvePrerequisites(project)} />;
}

export default function ProjectPage({ params }: PageProps) {
  return (
    <Suspense fallback={<div className="grid min-h-[60vh] place-items-center text-sm text-ink-3">Loading project…</div>}>
      <Hub params={params} />
    </Suspense>
  );
}
