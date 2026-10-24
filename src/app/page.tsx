"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Terminal,
  Play,
  Zap,
  Flame,
  Award,
  Shield,
  ArrowRight,
  Code2,
  Sparkles,
  Cpu,
  Layers,
  CheckCircle2,
  DollarSign,
  Globe2,
  GraduationCap,
  Star,
  Users,
  BookOpen,
  Check,
} from "lucide-react";
import { pythonCourse, coursesCatalog } from "@/lib/courses/python";
import { executePythonCode } from "@/lib/pyodide/runner";
import { sound } from "@/lib/sound/sound";
import { AdBanner } from "@/components/ads/AdBanner";

export default function HomePage() {
  const [heroCode, setHeroCode] = useState<string>(`# Artemis Mission Control v3.12 (Live Telemetry Sweep)
spacecraft = "ORION-II"
velocity_km_s = 10.92
subsystems = {"PROPULSION": "NOMINAL", "LIFE_SUPPORT": "99.2%", "COMMS": "ONLINE"}

print(f"=== {spacecraft} MISSION CONTROL TELEMETRY ===")
print(f"Current Velocity: {velocity_km_s} km/s (Escape Trajectory)")
for system, status in subsystems.items():
    print(f"  > Subsystem [{system}]: {status}")
print("STATUS: Trans-Lunar Injection Verified in WebAssembly!")
`);

  const [heroOutput, setHeroOutput] = useState<string>("");
  const [isRunning, setIsRunning] = useState<boolean>(false);

  const handleTestRun = async () => {
    sound.playClick();
    setIsRunning(true);
    setHeroOutput("Initializing Python 3.12 WebAssembly...");

    try {
      const res = await executePythonCode(heroCode, []);
      if (res.stderr) {
        setHeroOutput(res.stderr);
        sound.playError();
      } else {
        setHeroOutput(res.stdout);
        sound.playSuccess();
      }
    } catch (err: any) {
      setHeroOutput(err?.message || String(err));
      sound.playError();
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#f8fafc] dark:bg-[#0b0f19] text-slate-800 dark:text-slate-100 transition-colors duration-150">
      {/* Coursera-Style Hero Section */}
      <section className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 pt-10 pb-16 px-4 sm:px-6 transition-colors duration-150">
        <div className="max-w-6xl mx-auto space-y-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            {/* Left Column: Hero Content */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900/60 text-[#0056d2] dark:text-blue-400 text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>100% Free Interactive Computer Science on pockett.ai</span>
              </div>

              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-[1.15]">
                Learn Without Limits. <br />
                <span className="text-[#0056d2] dark:text-blue-400">
                  Master Python from Scratch.
                </span>
              </h1>

              <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed max-w-xl">
                Build real-world programming mastery through the Artemis Mission Control curriculum.
                In-browser WebAssembly execution, automated test grading, and verified credentials. Zero subscriptions, completely free forever.
              </p>

              {/* Key Highlights Pill Row */}
              <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs font-medium pt-1">
                <span className="flex items-center gap-1.5 text-amber-800 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-md border border-amber-200 dark:border-amber-800">
                  <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                  <strong>4.9/5</strong> (14,200+ Learners)
                </span>
                <span className="flex items-center gap-1.5 text-emerald-800 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-md border border-emerald-200 dark:border-emerald-800">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  Zero Cost / Free Forever
                </span>
                <span className="flex items-center gap-1.5 text-blue-800 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2.5 py-1 rounded-md border border-blue-200 dark:border-blue-800">
                  <Award className="w-3.5 h-3.5 text-[#0056d2] dark:text-blue-400" />
                  Verified Shareable Certificate
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                <Link
                  href="/learn/python/py-01-comments-print"
                  onClick={() => sound.playClick()}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg bg-[#0056d2] hover:bg-[#0041b8] text-white font-bold text-sm tracking-wide transition-all shadow-sm hover:shadow"
                >
                  <span>Start Learning for Free</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <Link
                  href="/playground"
                  onClick={() => sound.playClick()}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-sm transition-colors"
                >
                  <Code2 className="w-4 h-4 text-[#0056d2] dark:text-blue-400" />
                  <span>Interactive Sandbox</span>
                </Link>
              </div>

              {/* Ground Truth Credit */}
              <div className="pt-2 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-[#0056d2] dark:text-blue-400" />
                <span>Curriculum grounded in Data with Baraa&apos;s 13-hour Python Masterclass</span>
              </div>
            </div>

            {/* Right Column: Interactive Code Lab Card */}
            <div className="lg:col-span-5">
              <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md overflow-hidden">
                {/* Window Header */}
                <div className="bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-600 inline-block" />
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-600 inline-block" />
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-600 inline-block" />
                    <span className="ml-1 text-xs font-semibold text-slate-700 dark:text-slate-300 font-mono">
                      mission_control.py
                    </span>
                  </div>

                  <button
                    onClick={handleTestRun}
                    disabled={isRunning}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-[#0056d2] hover:bg-[#0041b8] disabled:opacity-50 text-white font-semibold text-xs transition-colors"
                  >
                    <Play className="w-3 h-3 fill-white" />
                    <span>{isRunning ? "Running..." : "Run"}</span>
                  </button>
                </div>

                {/* Editor textarea */}
                <div className="p-3 bg-slate-900">
                  <div className="text-[10px] font-mono uppercase text-slate-400 mb-1.5">
                    # Python 3 WebAssembly Sandbox (Live)
                  </div>
                  <textarea
                    value={heroCode}
                    onChange={(e) => setHeroCode(e.target.value)}
                    className="w-full h-40 bg-transparent font-mono text-xs text-emerald-400 resize-none outline-none leading-relaxed"
                    spellCheck={false}
                  />
                </div>

                {/* Output console */}
                <div className="p-3 bg-slate-950 border-t border-slate-800 text-xs font-mono text-slate-200 min-h-[90px] max-h-[120px] overflow-y-auto">
                  <div className="text-[10px] uppercase text-slate-400 mb-1 flex items-center gap-1 font-semibold">
                    <Terminal className="w-3 h-3 text-[#0056d2]" />
                    <span>Terminal Console</span>
                  </div>
                  <pre className="whitespace-pre-wrap leading-relaxed text-slate-200">
                    {heroOutput || (
                      <span className="text-slate-500 italic">
                        Click &quot;Run&quot; above to compile in browser WebAssembly.
                      </span>
                    )}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* AdSense Placement */}
      <AdBanner slotType="leaderboard" />

      {/* Coursera-Style Course Catalog Grid */}
      <section className="py-14 px-4 sm:px-6 max-w-6xl mx-auto w-full space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-[#0056d2] dark:text-blue-400">
              Explore Learning Paths
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Featured Free Courses on pockett.ai
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md">
            Interactive, project-grounded engineering tracks with automated unit-test grading.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
          {coursesCatalog.map((course) => {
            const isAvailable = course.modules.length > 0;
            return (
              <div
                key={course.id}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 flex flex-col justify-between shadow-xs hover:shadow-md transition-shadow relative"
              >
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                        isAvailable
                          ? "bg-blue-50 dark:bg-blue-950/60 text-[#0056d2] dark:text-blue-400 border border-blue-200 dark:border-blue-900/60"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                      }`}
                    >
                      {course.badge}
                    </span>
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      {course.level}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                    {course.title}
                  </h3>

                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    {course.tagline}
                  </p>

                  <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-500 dark:text-slate-400 pt-1">
                    <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
                      <Terminal className="w-3.5 h-3.5 text-[#0056d2] dark:text-blue-400" />
                      {course.estimatedHours} Hours
                    </span>
                    <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
                      <Zap className="w-3.5 h-3.5 text-amber-500" />
                      {course.totalXp} XP Available
                    </span>
                    <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-semibold">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      4.9 (Masterclass)
                    </span>
                  </div>
                </div>

                <div className="pt-6 mt-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  {isAvailable ? (
                    <Link
                      href="/learn/python"
                      onClick={() => sound.playClick()}
                      className="text-xs font-bold text-[#0056d2] dark:text-blue-400 hover:underline flex items-center gap-1.5"
                    >
                      <span>View Full Syllabus</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  ) : (
                    <span className="text-xs text-slate-400 font-medium">
                      Curriculum In Production
                    </span>
                  )}

                  {isAvailable ? (
                    <Link
                      href="/learn/python/py-01-comments-print"
                      onClick={() => sound.playClick()}
                      className="inline-flex items-center gap-1 px-4 py-2 rounded-lg bg-[#0056d2] hover:bg-[#0041b8] text-white font-bold text-xs shadow-xs"
                    >
                      <span>Enroll Free</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  ) : (
                    <button
                      disabled
                      className="px-3.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 text-xs font-medium"
                    >
                      Coming Soon
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Coursera-Grade Learning Outcomes Section */}
      <section className="bg-white dark:bg-slate-900 border-t border-b border-slate-200 dark:border-slate-800 py-14 px-4 sm:px-6 transition-colors duration-150">
        <div className="max-w-5xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#0056d2] dark:text-blue-400">
              Learning Outcomes
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Skills You Will Master on pockett.ai
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-xl mx-auto">
              Step-by-step from fundamental syntax to building the full Artemis Mission Control suite.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 space-y-2">
              <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950/60 flex items-center justify-center text-[#0056d2] dark:text-blue-400">
                <Check className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Python 3 Fundamentals</h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Master variables, types, mathematical expressions, user input, and string transformations.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 space-y-2">
              <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950/60 flex items-center justify-center text-[#0056d2] dark:text-blue-400">
                <Check className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Logic &amp; Orbital Loops</h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Construct multi-sensor conditional gates, while countdown loops, and thermal sensor range sweeps.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 space-y-2">
              <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950/60 flex items-center justify-center text-[#0056d2] dark:text-blue-400">
                <Check className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Data Structures &amp; Maps</h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Harness lists, comprehensions, immutable tuples, radio channel sets, and subsystem dictionaries.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 space-y-2">
              <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950/60 flex items-center justify-center text-[#0056d2] dark:text-blue-400">
                <Check className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Modular Functions</h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Write clean procedures with return values, dynamic `*args` and `**kwargs`, and scope isolation.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 space-y-2">
              <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950/60 flex items-center justify-center text-[#0056d2] dark:text-blue-400">
                <Check className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Defensive Error Handling</h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Guard telemetry feeds against invalid sensor readings using `try/except` and custom exceptions.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 space-y-2">
              <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950/60 flex items-center justify-center text-[#0056d2] dark:text-blue-400">
                <Check className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Artemis Mission Suite</h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Integrate all components into `mission_control.py`: authentication, telemetry, and reporting.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Free Model & AdSense Explanation Banner */}
      <section className="py-14 px-4 sm:px-6 max-w-4xl mx-auto w-full text-center space-y-6">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Why is pockett.ai 100% Free?
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl mx-auto">
          Unlike traditional platforms charging \$49/month or \$15,000 for bootcamps, pockett.ai runs Python code directly in your browser using WebAssembly. This eliminates costly server compute bills and allows us to offer university-grade coding education supported by ethical, non-intrusive developer sponsors.
        </p>
        <div className="pt-2">
          <Link
            href="/learn/python/py-01-comments-print"
            onClick={() => sound.playClick()}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#0056d2] hover:bg-[#0041b8] text-white font-bold text-sm tracking-wide shadow-xs transition-all"
          >
            <span>Begin Chapter 1 Now</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
