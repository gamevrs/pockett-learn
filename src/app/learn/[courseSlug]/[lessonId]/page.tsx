import React, { Suspense } from "react";
import { notFound } from "next/navigation";
import {
  getLessonContext,
  getAllStaticLessonParams,
} from "@/lib/courses/registry";
import { LessonWorkspace } from "@/components/workspace/LessonWorkspace";
import type { Metadata } from "next";

interface DynamicLessonPageProps {
  params: Promise<{
    courseSlug: string;
    lessonId: string;
  }>;
}

export async function generateStaticParams() {
  return getAllStaticLessonParams();
}

export async function generateMetadata({
  params,
}: DynamicLessonPageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const context = getLessonContext(
    resolvedParams.courseSlug,
    resolvedParams.lessonId
  );

  if (!context) {
    return {
      title: "Mission Not Found | Pockett Learn",
    };
  }

  return {
    title: `${context.lesson.title} - ${context.course.title} | Pockett Learn`,
    description: context.lesson.story,
  };
}

function LessonWorkspaceSkeleton() {
  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-slate-50 dark:bg-[#0b1120] animate-pulse">
      {/* Header bar skeleton */}
      <div className="h-12 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-4 w-16 bg-slate-200 dark:bg-slate-700 rounded" />
          <div className="h-4 w-4 bg-slate-200 dark:bg-slate-700 rounded" />
          <div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-8 w-24 bg-slate-200 dark:bg-slate-700 rounded-lg" />
          <div className="h-8 w-32 bg-slate-200 dark:bg-slate-700 rounded-lg" />
        </div>
      </div>
      {/* Body skeleton */}
      <div className="flex-1 flex overflow-hidden">
        <div className="w-full lg:w-[45%] border-r border-slate-200 dark:border-slate-800 p-6 space-y-4">
          <div className="h-6 w-3/4 bg-slate-200 dark:bg-slate-700 rounded" />
          <div className="h-4 w-full bg-slate-200 dark:bg-slate-700 rounded" />
          <div className="h-4 w-5/6 bg-slate-200 dark:bg-slate-700 rounded" />
          <div className="h-32 w-full bg-slate-200 dark:bg-slate-700 rounded-xl mt-6" />
        </div>
        <div className="hidden lg:flex flex-1 flex-col p-6 space-y-4 bg-slate-900">
          <div className="h-8 w-40 bg-slate-800 rounded" />
          <div className="flex-1 bg-slate-800/60 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

async function LessonContent({ params }: DynamicLessonPageProps) {
  const resolvedParams = await params;
  const context = getLessonContext(
    resolvedParams.courseSlug,
    resolvedParams.lessonId
  );

  if (!context) {
    notFound();
  }

  return (
    <LessonWorkspace
      lesson={context.lesson}
      courseSlug={context.course.slug}
      courseTitle={context.course.title}
    />
  );
}

export default function DynamicLessonPage({
  params,
}: DynamicLessonPageProps) {
  return (
    <Suspense fallback={<LessonWorkspaceSkeleton />}>
      <LessonContent params={params} />
    </Suspense>
  );
}
