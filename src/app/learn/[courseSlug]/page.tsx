import React from "react";
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

export default async function DynamicCoursePage({
  params,
}: DynamicCoursePageProps) {
  const resolvedParams = await params;
  const course =
    getCourse(resolvedParams.courseSlug) ||
    getAllCourses().find((c) => c.slug === resolvedParams.courseSlug);

  if (!course) {
    notFound();
  }

  return <CourseSyllabusView course={course} />;
}
