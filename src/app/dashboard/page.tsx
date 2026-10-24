"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Trophy,
  Flame,
  Zap,
  Award,
  CheckCircle2,
  Download,
  Terminal,
  Shield,
  RotateCcw,
  Sparkles,
  BookOpen,
  GraduationCap,
  Star,
  Check,
} from "lucide-react";
import { getUserStats, calculateLevel, saveUserStats } from "@/lib/storage/progress";
import { pythonCourse } from "@/lib/courses/python";
import { sound } from "@/lib/sound/sound";
import { AdBanner } from "@/components/ads/AdBanner";

export default function DashboardPage() {
  const [stats, setStats] = useState({
    xp: 0,
    level: 1,
    streak: 1,
    lastActiveDate: "",
    completedLessons: [] as string[],
    savedCode: {},
    soundEnabled: true,
  });

  const [studentName, setStudentName] = useState("Python Engineer");
  const [showCertificate, setShowCertificate] = useState(false);

  useEffect(() => {
    const loaded = getUserStats();
    setStats(loaded);
  }, []);

  const allLessons = pythonCourse.modules.flatMap((m) => m.lessons);
  const totalLessons = allLessons.length;
  const completedCount = allLessons.filter((l) =>
    stats.completedLessons.includes(l.id)
  ).length;

  const xpIntoCurrentLevel = stats.xp % 250;
  const xpNeededForNextLevel = 250;
  const levelProgressPercent = Math.round(
    (xpIntoCurrentLevel / xpNeededForNextLevel) * 100
  );

  const achievements = [
    {
      id: "ach-1",
      title: "Genesis Telemetry",
      desc: "Complete your first console print & variable lab",
      icon: Terminal,
      unlocked: completedCount >= 1,
    },
    {
      id: "ach-2",
      title: "Flight Safety Logic",
      desc: "Master conditionals and launch clearance trees",
      icon: Shield,
      unlocked: stats.completedLessons.includes("py-06-conditionals-abort"),
    },
    {
      id: "ach-3",
      title: "Orbital Loops Master",
      desc: "Implement T-minus countdowns and thermal sweeps",
      icon: RotateCcw,
      unlocked: stats.completedLessons.includes("py-07-countdown-while-loops"),
    },
    {
      id: "ach-4",
      title: "Telemetry Architect",
      desc: "Aggregate complex flight data with dictionaries",
      icon: Award,
      unlocked: stats.completedLessons.includes("py-11-dictionaries-telemetry"),
    },
    {
      id: "ach-5",
      title: "Century Engineer",
      desc: "Amass 500+ XP in hands-on test evaluations",
      icon: Zap,
      unlocked: stats.xp >= 500,
    },
    {
      id: "ach-6",
      title: "Habit Pioneer",
      desc: "Maintain a learning streak of 3+ consecutive days",
      icon: Flame,
      unlocked: stats.streak >= 3,
    },
  ];

  const handlePrintCertificate = () => {
    sound.playClick();
    window.print();
  };

  const handleResetData = () => {
    if (
      confirm(
        "Are you sure you want to reset all your progress and completed labs? This action cannot be undone."
      )
    ) {
      sound.playClick();
      const fresh = {
        xp: 0,
        level: 1,
        streak: 1,
        lastActiveDate: new Date().toISOString().split("T")[0],
        completedLessons: [],
        savedCode: {},
        soundEnabled: true,
      };
      saveUserStats(fresh);
      setStats(fresh);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("pockett_progress_updated"));
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0b0f19] text-slate-800 dark:text-slate-100 flex flex-col py-8 px-4 sm:px-6 transition-colors duration-150">
      <div className="max-w-5xl mx-auto w-full space-y-8">
        {/* User Summary Header (Coursera Style Profile Banner) */}
        <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xs">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-[#0056d2] dark:text-blue-400">
              <GraduationCap className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  className="bg-transparent border-b border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-[#0056d2] dark:focus:border-blue-400 outline-none font-extrabold text-xl sm:text-2xl text-slate-900 dark:text-white tracking-tight"
                  title="Click to edit name on certificate"
                />
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Level {stats.level} Student • Enrolled in Python 3 Artemis Track on pockett.ai
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                sound.playClick();
                setShowCertificate(!showCertificate);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors"
            >
              <Award className="w-4 h-4 text-[#0056d2] dark:text-blue-400" />
              <span>{showCertificate ? "Hide Certificate" : "Official Certificate"}</span>
            </button>

            <Link
              href="/learn/python"
              onClick={() => sound.playClick()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#0056d2] hover:bg-[#0041b8] text-white text-xs font-bold transition-all shadow-xs"
            >
              Resume Learning
            </Link>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold mb-1">
              <span>Total XP</span>
              <Zap className="w-4 h-4 text-[#0056d2] dark:text-blue-400" />
            </div>
            <div className="text-2xl font-extrabold text-[#0056d2] dark:text-blue-400">
              {stats.xp}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              +{xpIntoCurrentLevel} / 250 XP to Lv.{stats.level + 1}
            </div>
            <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full mt-2 overflow-hidden">
              <div
                className="h-full bg-[#0056d2] dark:bg-blue-500"
                style={{ width: `${levelProgressPercent}%` }}
              />
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold mb-1">
              <span>Daily Streak</span>
              <Flame className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-extrabold text-amber-600 dark:text-amber-400">
              {stats.streak} Days
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Consistent daily learning habit</div>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold mb-1">
              <span>Labs Completed</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-400">
              {completedCount} / {totalLessons}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              {Math.round((completedCount / totalLessons) * 100)}% Python curriculum
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold mb-1">
              <span>Learner Rank</span>
              <Award className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="text-2xl font-extrabold text-purple-700 dark:text-purple-400">
              Lv. {stats.level}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Systems Apprentice</div>
          </div>
        </div>

        {/* Coursera-Style Official Certificate Display */}
        {showCertificate && (
          <div className="p-8 sm:p-12 rounded-xl bg-white dark:bg-slate-900 border-4 border-double border-slate-300 dark:border-slate-700 shadow-lg space-y-6 relative">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2 text-xs font-bold text-[#0056d2] dark:text-blue-400 uppercase tracking-wider">
                <BookOpen className="w-4 h-4" />
                <span>pockett.ai Academy Verified Certificate of Completion</span>
              </div>
              <button
                onClick={handlePrintCertificate}
                className="print:hidden inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-[#0056d2] dark:text-blue-400 text-xs font-semibold hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download / Print PDF</span>
              </button>
            </div>

            <div className="text-center space-y-3 py-6">
              <span className="text-xs uppercase tracking-widest text-slate-500 dark:text-slate-400 font-semibold">
                Official Credential of Completion
              </span>
              <h2 className="text-3xl sm:text-5xl font-serif text-slate-900 dark:text-white italic font-bold">
                {studentName}
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-xl mx-auto leading-relaxed pt-2">
                has successfully completed all rigorous guided projects, unit-test evaluations,
                and capstone assignments for the <strong>Python 3: Artemis Mission Control Masterclass</strong> on pockett.ai, grounded in Data with Baraa&apos;s curriculum.
              </p>
            </div>

            <div className="border-t border-slate-200 dark:border-slate-800 pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
              <div>
                <span>ISSUED: </span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {new Date().toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </div>
              <div className="flex items-center gap-1 font-semibold text-[#0056d2] dark:text-blue-400">
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>VERIFIED COURSE COMPLETION</span>
              </div>
              <div>
                <span>VERIFICATION SERIAL: </span>
                <span className="font-mono text-slate-700 dark:text-slate-300">
                  PKT-AI-PY3-{Math.abs(stats.xp * 7919).toString(16).toUpperCase()}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Achievement Badges */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <Award className="w-5 h-5 text-[#0056d2] dark:text-blue-400" />
              <span>Skill Milestones &amp; Badges</span>
            </h3>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              {achievements.filter((a) => a.unlocked).length} / {achievements.length} Unlocked
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {achievements.map((ach) => {
              const Icon = ach.icon;
              return (
                <div
                  key={ach.id}
                  className={`p-4 rounded-xl border transition-all ${
                    ach.unlocked
                      ? "bg-white dark:bg-slate-900 border-blue-200 dark:border-blue-900/60 shadow-2xs"
                      : "bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-60"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                        ach.unlocked
                          ? "bg-blue-100 dark:bg-blue-950/80 text-[#0056d2] dark:text-blue-400"
                          : "bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500"
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4
                          className={`text-xs font-bold ${
                            ach.unlocked ? "text-slate-900 dark:text-white" : "text-slate-500 dark:text-slate-400"
                          }`}
                        >
                          {ach.title}
                        </h4>
                        {ach.unlocked && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                        {ach.desc}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* AdSense Placement */}
        <AdBanner slotType="leaderboard" />

        {/* Local Storage & Cloud Scaling Notice */}
        <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs">
          <div className="space-y-0.5">
            <span className="text-slate-800 dark:text-slate-200 font-semibold flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              Local Storage Synchronized on pockett.ai
            </span>
            <p className="text-slate-500 dark:text-slate-400 max-w-xl">
              All code submissions, completed labs, and streak credentials are safe in your browser.
            </p>
          </div>

          <button
            onClick={handleResetData}
            className="text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 text-xs font-medium underline shrink-0"
          >
            Reset Progress Data
          </button>
        </div>
      </div>
    </div>
  );
}
