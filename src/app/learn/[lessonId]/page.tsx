import React, { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { FOUNDATIONS, getConceptContext } from "@/content/foundations";
import { trackLessons } from "@/learn/types";
import { LessonPlayer } from "@/components/learn/LessonPlayer";

interface PageProps {
  params: Promise<{ lessonId: string }>;
}

export function generateStaticParams() {
  return trackLessons(FOUNDATIONS).map((l) => ({ lessonId: l.id }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { lessonId } = await params;
  const ctx = getConceptContext(lessonId);
  if (!ctx) return { title: "Lesson not found" };
  return { title: `${ctx.lesson.title} · Foundations`, description: ctx.lesson.summary };
}

async function Lesson({ params }: PageProps) {
  const { lessonId } = await params;
  const ctx = getConceptContext(lessonId);
  if (!ctx) notFound();
  return <LessonPlayer key={ctx.lesson.id} ctx={ctx} />;
}

export default function ConceptLessonPage({ params }: PageProps) {
  return (
    <Suspense fallback={<div className="fixed inset-0 z-[60] grid place-items-center bg-bg text-sm text-ink-3">Loading lesson…</div>}>
      <Lesson params={params} />
    </Suspense>
  );
}
