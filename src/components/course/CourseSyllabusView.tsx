"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Terminal,
  Clock,
  Zap,
  CheckCircle2,
  Lock,
  ArrowRight,
  Award,
  ChevronRight,
  Code2,
  Star,
  BookOpen,
  GraduationCap,
  Users,
} from "lucide-react";
import { Course } from "@/lib/courses/types";
import { getUserStats } from "@/lib/storage/progress";
import { sound } from "@/lib/sound/sound";
import { AdBanner } from "@/components/ads/AdBanner";

interface CourseSyllabusViewProps {
  course: Course;
}

export function CourseSyllabusView({ course }: CourseSyllabusViewProps) {
  const [completedIds, setCompletedIds] = useState<string[]>([]);

  useEffect(() => {
    const stats = getUserStats();
    setCompletedIds(stats.completedLessons);
  }, []);

  const allLessons = course.modules.flatMap((m) => m.lessons);
  const totalLessons = allLessons.length;
  const isAvailable = totalLessons > 0;

  const completedCount = allLessons.filter((l) =>
    completedIds.includes(l.id)
  ).length;
  const progressPercent =
    totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  const nextUpLesson =
    allLessons.find((l) => !completedIds.includes(l.id)) || allLessons[0];

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0b0f19] text-slate-800 dark:text-slate-100 flex flex-col transition-colors duration-150">
      {/* Coursera-Style Course Header */}
      <section className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 py-10 px-4 sm:px-6 transition-colors duration-150">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
            <Link href="/" className="hover:text-[#0056d2] dark:hover:text-blue-400">Home</Link>
            <span>/</span>
            <span className="text-slate-400 dark:text-slate-500">Courses</span>
            <span>/</span>
            <span className="text-slate-800 dark:text-slate-200 font-semibold">{course.title}</span>
          </div>

          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900/60 text-[#0056d2] dark:text-blue-400 text-xs font-bold uppercase tracking-wider">
                {course.badge}
              </span>
              <span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-medium">
                {course.level}
              </span>
              <span className="px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 text-xs font-medium">
                100% Free Forever
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {course.title}
            </h1>

            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-3xl leading-relaxed">
              {course.description}
            </p>

            {/* Instructor & Ratings line */}
            <div className="flex flex-wrap items-center gap-6 text-xs text-slate-600 dark:text-slate-400 pt-1">
              <span className="flex items-center gap-1.5 font-medium text-slate-900 dark:text-slate-200">
                <GraduationCap className="w-4 h-4 text-[#0056d2] dark:text-blue-400" />
                Taught by Data with Baraa &amp; Artemis Mission Grounding
              </span>
              <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-semibold">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                4.9 (14,200+ ratings)
              </span>
              <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                <Users className="w-4 h-4 text-slate-400" />
                48,000+ Enrolled on pockett.ai
              </span>
            </div>
          </div>

          {/* Key Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3">
            <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium uppercase">
                Estimated Time
              </span>
              <div className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5 mt-0.5">
                <Clock className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                <span>{course.estimatedHours} Hours</span>
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium uppercase">
                Total XP Reward
              </span>
              <div className="text-base font-bold text-[#0056d2] dark:text-blue-400 flex items-center gap-1.5 mt-0.5">
                <Zap className="w-4 h-4 text-[#0056d2] dark:text-blue-400" />
                <span>{course.totalXp} XP</span>
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium uppercase">
                Interactive Labs
              </span>
              <div className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5 mt-0.5">
                <Terminal className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                <span>{totalLessons} Guided Labs</span>
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium uppercase">
                Credential
              </span>
              <div className="text-base font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5 mt-0.5">
                <Award className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Free Certificate</span>
              </div>
            </div>
          </div>

          {/* Progress & CTA Card */}
          {isAvailable ? (
            <div className="p-5 rounded-xl bg-blue-50/60 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 flex flex-col sm:flex-row items-center justify-between gap-5 mt-4">
              <div className="w-full sm:w-1/2 space-y-2">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-800 dark:text-slate-200">Your Progress</span>
                  <span className="text-[#0056d2] dark:text-blue-400 font-bold">{progressPercent}% Completed</span>
                </div>
                <div className="w-full h-2 rounded-full bg-blue-200 dark:bg-blue-900/60 overflow-hidden">
                  <div
                    className="h-full bg-[#0056d2] dark:bg-blue-500 transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <span className="text-[11px] text-slate-600 dark:text-slate-400 block">
                  {completedCount} of {totalLessons} coding labs completed
                </span>
              </div>

              <Link
                href={`/learn/${course.slug}/${nextUpLesson.id}`}
                onClick={() => sound.playClick()}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-[#0056d2] hover:bg-[#0041b8] text-white font-bold text-sm tracking-wide transition-all shadow-xs"
              >
                <span>{completedCount === 0 ? "Enroll & Begin Lab 1.1" : "Resume Course"}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <div className="p-5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                  {course.title} is In Active Development
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                  We are porting the WebAssembly test harness and interactive curriculum.
                </p>
              </div>
              <Link
                href="/learn/python"
                className="px-5 py-2.5 rounded-lg bg-[#0056d2] text-white font-bold text-xs"
              >
                Take Python Track Now
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* AdSense Banner */}
      <AdBanner slotType="leaderboard" />

      {/* Syllabus Modules Breakdown */}
      {isAvailable && (
        <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 w-full space-y-6 flex-1">
          <div className="space-y-1">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Syllabus &amp; Guided Projects
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              Complete all guided labs and capstone challenges to earn your verified credential.
            </p>
          </div>

          <div className="space-y-4">
            {course.modules.map((module, mIdx) => (
              <div
                key={module.id}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs"
              >
                {/* Module Header */}
                <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="space-y-0.5">
                    <span className="text-[11px] uppercase tracking-wider text-[#0056d2] dark:text-blue-400 font-bold">
                      Module {mIdx + 1}
                    </span>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      {module.title}
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-300">{module.description}</p>
                  </div>

                  <div className="text-xs font-medium text-slate-500 dark:text-slate-400 shrink-0">
                    {module.lessons.length} Guided Lab{module.lessons.length > 1 ? "s" : ""}
                  </div>
                </div>

                {/* Lessons List */}
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {module.lessons.map((lesson) => {
                    const isCompleted = completedIds.includes(lesson.id);

                    return (
                      <Link
                        key={lesson.id}
                        href={`/learn/${course.slug}/${lesson.id}`}
                        onClick={() => sound.playClick()}
                        className="group p-3.5 sm:p-4 flex items-center justify-between gap-3 hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="shrink-0">
                            {isCompleted ? (
                              <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
                                <CheckCircle2 className="w-4 h-4" />
                              </div>
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-950/60 text-[#0056d2] dark:text-blue-400 flex items-center justify-center group-hover:bg-[#0056d2] group-hover:text-white transition-colors">
                                <Terminal className="w-4 h-4" />
                              </div>
                            )}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 group-hover:text-[#0056d2] dark:group-hover:text-blue-400 transition-colors truncate">
                                {lesson.title}
                              </h4>
                              <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium shrink-0">
                                {lesson.difficulty}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                              <span>{lesson.estimatedMinutes} mins</span>
                              <span>•</span>
                              <span className="text-[#0056d2] dark:text-blue-400 font-medium">+{lesson.xpReward} XP</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 text-xs font-semibold text-[#0056d2] dark:text-blue-400 shrink-0">
                          <span className="hidden sm:inline">
                            {isCompleted ? "Review Lab" : "Start Lab"}
                          </span>
                          <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </main>
      )}
    </div>
  );
}
