import React from "react";
import { notFound } from "next/navigation";
import { pythonCourse } from "@/lib/courses/python";
import { LessonWorkspace } from "@/components/workspace/LessonWorkspace";
import type { Metadata } from "next";

interface LessonPageProps {
  params: Promise<{
    lessonId: string;
  }>;
}

export async function generateStaticParams() {
  const allLessons = pythonCourse.modules.flatMap((m) => m.lessons);
  return allLessons.map((l) => ({
    lessonId: l.id,
  }));
}

export async function generateMetadata({
  params,
}: LessonPageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const allLessons = pythonCourse.modules.flatMap((m) => m.lessons);
  const lesson = allLessons.find((l) => l.id === resolvedParams.lessonId);

  if (!lesson) {
    return {
      title: "Lesson Not Found | Pockett-Learn",
    };
  }

  return {
    title: `${lesson.title} - Python 3 | Pockett-Learn`,
    description: lesson.story,
  };
}

export default async function LessonPage({ params }: LessonPageProps) {
  const resolvedParams = await params;
  const allLessons = pythonCourse.modules.flatMap((m) => m.lessons);
  const lesson = allLessons.find((l) => l.id === resolvedParams.lessonId);

  if (!lesson) {
    notFound();
  }

  return <LessonWorkspace lesson={lesson} />;
}
