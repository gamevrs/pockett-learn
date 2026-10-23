import React from "react";
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

export default async function DynamicLessonPage({
  params,
}: DynamicLessonPageProps) {
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
