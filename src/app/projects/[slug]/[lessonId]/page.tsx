import React, { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { allLessonParams, getLessonContext } from "@/content";
import { Workspace } from "@/components/workspace/Workspace";

interface PageProps {
  params: Promise<{ slug: string; lessonId: string }>;
}

export function generateStaticParams() {
  return allLessonParams();
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug, lessonId } = await params;
  const ctx = getLessonContext(slug, lessonId);
  if (!ctx) return { title: "Lesson not found" };
  return { title: `${ctx.lesson.title} · ${ctx.project.title}`, description: ctx.lesson.mission.replace(/[`*]/g, "").slice(0, 160) };
}

async function Lesson({ params }: PageProps) {
  const { slug, lessonId } = await params;
  const ctx = getLessonContext(slug, lessonId);
  if (!ctx) notFound();
  return <Workspace key={ctx.lesson.id} ctx={ctx} />;
}

export default function LessonPage({ params }: PageProps) {
  return (
    <Suspense fallback={<div className="fixed inset-0 z-[60] grid place-items-center bg-bg text-sm text-ink-3">Loading your workspace…</div>}>
      <Lesson params={params} />
    </Suspense>
  );
}
