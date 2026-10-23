"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Trophy,
  Flame,
  Zap,
  Award,
  CheckCircle2,
  Calendar,
  Download,
  Share2,
  Terminal,
  Shield,
  RotateCcw,
  Sparkles,
  ExternalLink,
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
      title: "Genesis Spark",
      desc: "Complete your first Python terminal challenge",
      icon: Terminal,
      unlocked: completedCount >= 1,
    },
    {
      id: "ach-2",
      title: "Flow State",
      desc: "Master conditionals and control flow logic",
      icon: Shield,
      unlocked: stats.completedLessons.includes("py-04-conditionals"),
    },
    {
      id: "ach-3",
      title: "Loop Architect",
      desc: "Implement convergent while loops and range iterators",
      icon: RotateCcw,
      unlocked: stats.completedLessons.includes("py-06-for-loops-range"),
    },
    {
      id: "ach-4",
      title: "OOP Titan",
      desc: "Encapsulate complex system state in classes",
      icon: Award,
      unlocked: stats.completedLessons.includes("py-10-classes-and-oop"),
    },
    {
      id: "ach-5",
      title: "Century Engineer",
      desc: "Amass 500+ XP in hands-on coding tests",
      icon: Zap,
      unlocked: stats.xp >= 500,
    },
    {
      id: "ach-6",
      title: "Streak Guardian",
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
        "Are you sure you want to reset all your progress and completed lessons? This action cannot be undone."
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
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col py-10 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto w-full space-y-8">
        {/* User Summary Header */}
        <div className="rounded-2xl bg-gradient-to-br from-[#0c0f18] to-[#07090e] border border-slate-800 p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-[0_0_25px_rgba(16,231,117,0.25)]">
              <Trophy className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  className="bg-transparent border-b border-transparent hover:border-slate-700 focus:border-emerald-500 outline-none font-black text-xl sm:text-2xl text-white tracking-tight"
                  title="Click to edit name"
                />
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Level {stats.level} Apprentice Engineer • Joined Local Track
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                sound.playClick();
                setShowCertificate(!showCertificate);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-mono font-semibold text-slate-200 transition-colors"
            >
              <Award className="w-4 h-4 text-emerald-400" />
              <span>{showCertificate ? "Hide Certificate" : "View Certificate"}</span>
            </button>

            <Link
              href="/learn/python"
              onClick={() => sound.playClick()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-mono font-bold uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(16,231,117,0.3)] hover:scale-102"
            >
              Continue Learning
            </Link>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-5 rounded-2xl bg-[#090b10] border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 text-xs font-mono mb-2">
              <span>Total XP</span>
              <Zap className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-black text-emerald-400 font-mono">
              {stats.xp}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              +{xpIntoCurrentLevel} / 250 XP to Lv.{stats.level + 1}
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full mt-2 overflow-hidden">
              <div
                className="h-full bg-emerald-400"
                style={{ width: `${levelProgressPercent}%` }}
              />
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-[#090b10] border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 text-xs font-mono mb-2">
              <span>Daily Streak</span>
              <Flame className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-black text-amber-400 font-mono">
              {stats.streak} Days
            </div>
            <div className="text-[11px] text-slate-400 mt-1">Active daily habit</div>
          </div>

          <div className="p-5 rounded-2xl bg-[#090b10] border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 text-xs font-mono mb-2">
              <span>Labs Completed</span>
              <CheckCircle2 className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-black text-cyan-400 font-mono">
              {completedCount} / {totalLessons}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              {Math.round((completedCount / totalLessons) * 100)}% Python curriculum
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-[#090b10] border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 text-xs font-mono mb-2">
              <span>Rank Status</span>
              <Award className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-2xl font-black text-purple-400 font-mono">
              Lv. {stats.level}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">Architect In Training</div>
          </div>
        </div>

        {/* Certificate Display (Coursera style verification) */}
        {showCertificate && (
          <div className="p-6 sm:p-10 rounded-2xl bg-gradient-to-br from-slate-950 via-[#0a0e17] to-slate-950 border-2 border-emerald-500/40 relative shadow-2xl space-y-6">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2 font-mono text-xs text-emerald-400">
                <Terminal className="w-4 h-4" />
                <span>POCKETT LEARN VERIFIED CERTIFICATE</span>
              </div>
              <button
                onClick={handlePrintCertificate}
                className="print:hidden inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono hover:bg-emerald-500/20 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Print / Save PDF</span>
              </button>
            </div>

            <div className="text-center space-y-3 py-4">
              <span className="text-xs uppercase tracking-widest text-slate-400 font-mono">
                Official Credential of Completion
              </span>
              <h2 className="text-2xl sm:text-4xl font-serif text-white italic">
                {studentName}
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto leading-relaxed">
                has successfully demonstrated proficiency in Python 3 programming mechanics,
                dynamic typing, control flow, functions, OOP, and data structures through rigorous
                interactive unit-tested lab evaluations.
              </p>
            </div>

            <div className="border-t border-slate-800/80 pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-400 font-mono">
              <div>
                <span>ISSUED: </span>
                <span className="text-slate-300">
                  {new Date().toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </div>
              <div>
                <span>TOTAL XP ACCREDITED: </span>
                <span className="text-emerald-400 font-bold">{stats.xp} XP</span>
              </div>
              <div>
                <span>SERIAL: </span>
                <span className="text-slate-300">
                  PL-PY3-{Math.abs(stats.xp * 7919).toString(16).toUpperCase()}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Achievement Badges */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <Award className="w-5 h-5 text-emerald-400" />
              <span>Skill Milestones & Badges</span>
            </h3>
            <span className="text-xs font-mono text-slate-400">
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
                      ? "bg-slate-900/60 border-emerald-500/30"
                      : "bg-[#080a0f] border-slate-800/60 opacity-50"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                        ach.unlocked
                          ? "bg-emerald-500/20 text-emerald-400"
                          : "bg-slate-800 text-slate-600"
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4
                          className={`text-xs font-bold ${
                            ach.unlocked ? "text-slate-200" : "text-slate-500"
                          }`}
                        >
                          {ach.title}
                        </h4>
                        {ach.unlocked && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1 leading-snug">
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

        {/* Local Storage & Future Supabase Scaling Notice */}
        <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs">
          <div className="space-y-1">
            <span className="font-mono text-slate-300 font-semibold flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-cyan-400" />
              Local Storage Sync Active
            </span>
            <p className="text-slate-400 max-w-xl">
              All your coding progress, XP, and streak data are stored safely on your device.
              Cloud sync to Supabase will automatically activate once connected.
            </p>
          </div>

          <button
            onClick={handleResetData}
            className="text-rose-400 hover:text-rose-300 text-[11px] font-mono underline decoration-rose-500/30 shrink-0"
          >
            Reset Local Progress
          </button>
        </div>
      </div>
    </div>
  );
}
