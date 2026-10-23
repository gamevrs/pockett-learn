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
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col">
      {/* Course Header (Coursera + Verge Style) */}
      <section className="border-b border-slate-800 bg-gradient-to-b from-[#0b0e16] to-[#07090e] py-8 sm:py-12 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5" />
              {course.badge}
            </span>
            <span className="px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-slate-300 text-xs font-mono">
              {course.level}
            </span>
            <span className="px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-mono">
              100% Free Forever
            </span>
          </div>

          <div className="space-y-3">
            <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
              {course.title}
            </h1>
            <p className="text-sm sm:text-base text-slate-300 max-w-3xl leading-relaxed">
              {course.description}
            </p>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 pt-2">
            <div className="p-3.5 sm:p-4 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-[10px] sm:text-[11px] font-mono text-slate-400 uppercase">
                Estimated Time
              </span>
              <div className="text-base sm:text-lg font-bold text-white flex items-center gap-1.5 mt-1 font-mono">
                <Clock className="w-4 h-4 text-slate-400" />
                <span>{course.estimatedHours} Hours</span>
              </div>
            </div>

            <div className="p-3.5 sm:p-4 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-[10px] sm:text-[11px] font-mono text-slate-400 uppercase">
                Total XP Available
              </span>
              <div className="text-base sm:text-lg font-bold text-emerald-400 flex items-center gap-1.5 mt-1 font-mono">
                <Zap className="w-4 h-4 text-emerald-400" />
                <span>{course.totalXp} XP</span>
              </div>
            </div>

            <div className="p-3.5 sm:p-4 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-[10px] sm:text-[11px] font-mono text-slate-400 uppercase">
                Interactive Labs
              </span>
              <div className="text-base sm:text-lg font-bold text-cyan-400 flex items-center gap-1.5 mt-1 font-mono">
                <Terminal className="w-4 h-4 text-cyan-400" />
                <span>{totalLessons} Challenges</span>
              </div>
            </div>

            <div className="p-3.5 sm:p-4 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-[10px] sm:text-[11px] font-mono text-slate-400 uppercase">
                Skill Level
              </span>
              <div className="text-base sm:text-lg font-bold text-purple-400 flex items-center gap-1.5 mt-1 font-mono">
                <Award className="w-4 h-4 text-purple-400" />
                <span>Zero to Pro</span>
              </div>
            </div>
          </div>

          {/* Progress Bar & Primary CTA */}
          {isAvailable ? (
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-5 sm:gap-6">
              <div className="w-full sm:w-1/2 space-y-2">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-300 font-semibold">Your Track Progress</span>
                  <span className="text-emerald-400 font-bold">{progressPercent}% Completed</span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <span className="text-[11px] text-slate-400 font-mono block">
                  {completedCount} of {totalLessons} coding labs completed
                </span>
              </div>

              <Link
                href={`/learn/${course.slug}/${nextUpLesson.id}`}
                onClick={() => sound.playClick()}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm uppercase font-mono tracking-wider transition-all shadow-[0_0_25px_rgba(16,231,117,0.3)] hover:scale-102"
              >
                <span>{completedCount === 0 ? "Begin First Lab" : "Resume Coding"}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-white text-sm">
                  {course.title} is In Active Development
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  We are porting the WebAssembly test harness and interactive curriculum.
                </p>
              </div>
              <Link
                href="/learn/python"
                className="px-5 py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-mono font-bold text-xs uppercase shadow-[0_0_15px_rgba(16,231,117,0.3)]"
              >
                Take Python Track Now
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* AdSense Placement */}
      <AdBanner slotType="leaderboard" />

      {/* Syllabus / Module List */}
      {isAvailable && (
        <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 w-full space-y-6 flex-1">
          <div className="space-y-1">
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Curriculum & Practical Labs
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              Each module culminates in production-grade challenges evaluated against unit test suites.
            </p>
          </div>

          <div className="space-y-5">
            {course.modules.map((module, mIdx) => (
              <div
                key={module.id}
                className="rounded-2xl border border-slate-800 bg-[#090b10] overflow-hidden"
              >
                {/* Module Header */}
                <div className="p-4 sm:p-5 bg-[#0c0f17] border-b border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3">
                  <div className="space-y-0.5">
                    <span className="text-[10px] sm:text-[11px] font-mono uppercase tracking-widest text-emerald-400 font-bold">
                      Chapter {mIdx + 1}
                    </span>
                    <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                      {module.title}
                    </h3>
                    <p className="text-xs text-slate-400">{module.description}</p>
                  </div>

                  <div className="text-xs font-mono text-slate-400 shrink-0">
                    {module.lessons.length} Challenge{module.lessons.length > 1 ? "s" : ""}
                  </div>
                </div>

                {/* Lessons List */}
                <div className="divide-y divide-slate-800/60">
                  {module.lessons.map((lesson) => {
                    const isCompleted = completedIds.includes(lesson.id);

                    return (
                      <Link
                        key={lesson.id}
                        href={`/learn/${course.slug}/${lesson.id}`}
                        onClick={() => sound.playClick()}
                        className="group p-3.5 sm:p-5 flex items-center justify-between gap-3 sm:gap-4 hover:bg-slate-900/50 transition-all"
                      >
                        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                          <div className="shrink-0">
                            {isCompleted ? (
                              <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                                <CheckCircle2 className="w-4 h-4" />
                              </div>
                            ) : (
                              <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 group-hover:text-white group-hover:border-slate-700 transition-colors">
                                <Terminal className="w-4 h-4" />
                              </div>
                            )}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="text-xs sm:text-sm font-semibold text-slate-200 group-hover:text-emerald-400 transition-colors truncate">
                                {lesson.title}
                              </h4>
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400 shrink-0">
                                {lesson.difficulty}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono mt-0.5">
                              <span>{lesson.estimatedMinutes} mins</span>
                              <span>•</span>
                              <span className="text-emerald-400">+{lesson.xpReward} XP</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 text-xs font-mono text-slate-400 group-hover:text-emerald-400 transition-colors shrink-0">
                          <span className="hidden sm:inline">
                            {isCompleted ? "Review Lab" : "Launch Lab"}
                          </span>
                          <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
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
