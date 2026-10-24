import React, { Suspense } from "react";
import { notFound } from "next/navigation";
import { getCourse, getAllCourses } from "@/lib/courses/registry";
import { CourseSyllabusView } from "@/components/course/CourseSyllabusView";
import type { Metadata } from "next";

interface DynamicCoursePageProps {
  params: Promise<{
    courseSlug: string;
  }>;
}

export async function generateStaticParams() {
  const courses = getAllCourses();
  return courses.map((c) => ({
    courseSlug: c.slug,
  }));
}

export async function generateMetadata({
  params,
}: DynamicCoursePageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const course =
    getCourse(resolvedParams.courseSlug) ||
    getAllCourses().find((c) => c.slug === resolvedParams.courseSlug);

  if (!course) {
    return {
      title: "Course Not Found | Pockett Learn",
    };
  }

  return {
    title: `${course.title} Syllabus | Pockett Learn`,
    description: course.description,
  };
}

function CourseSyllabusSkeleton() {
  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0b0f19] text-slate-800 dark:text-slate-100 flex flex-col animate-pulse">
      <section className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 py-10 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="flex items-center gap-2">
            <div className="h-4 w-12 bg-slate-200 dark:bg-slate-700 rounded" />
            <div className="h-4 w-4 bg-slate-200 dark:bg-slate-700 rounded" />
            <div className="h-4 w-16 bg-slate-200 dark:bg-slate-700 rounded" />
            <div className="h-4 w-4 bg-slate-200 dark:bg-slate-700 rounded" />
            <div className="h-4 w-28 bg-slate-200 dark:bg-slate-700 rounded" />
          </div>
          <div className="space-y-4">
            <div className="h-6 w-24 bg-slate-200 dark:bg-slate-700 rounded-full" />
            <div className="h-10 w-96 max-w-full bg-slate-200 dark:bg-slate-700 rounded" />
            <div className="h-4 w-2/3 bg-slate-200 dark:bg-slate-700 rounded" />
          </div>
        </div>
      </section>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 w-full space-y-6">
        <div className="h-40 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800" />
        <div className="h-40 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800" />
      </div>
    </div>
  );
}

async function CourseContent({ params }: DynamicCoursePageProps) {
  const resolvedParams = await params;
  const course =
    getCourse(resolvedParams.courseSlug) ||
    getAllCourses().find((c) => c.slug === resolvedParams.courseSlug);

  if (!course) {
    notFound();
  }

  return <CourseSyllabusView course={course} />;
}

export default function DynamicCoursePage({
  params,
}: DynamicCoursePageProps) {
  return (
    <Suspense fallback={<CourseSyllabusSkeleton />}>
      <CourseContent params={params} />
    </Suspense>
  );
}
