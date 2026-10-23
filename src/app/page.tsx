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
  LockOpen,
  DollarSign,
  Globe2,
} from "lucide-react";
import { pythonCourse, coursesCatalog } from "@/lib/courses/python";
import { executePythonCode } from "@/lib/pyodide/runner";
import { sound } from "@/lib/sound/sound";
import { AdBanner } from "@/components/ads/AdBanner";

export default function HomePage() {
  const [heroCode, setHeroCode] = useState<string>(`# Interactive Python Test Drive
def calculate_quantum_payload(energy_level: float, pulses: int) -> float:
    efficiency = 0.942
    return round((energy_level ** 1.5) * pulses * efficiency, 3)

# Test run in WebAssembly
result = calculate_quantum_payload(12.5, 8)
print(f"Calculated Quantum Payload: {result} Terajoules")
print("Python 3.12 WebAssembly is running at native browser speeds!")
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
    <div className="flex-1 flex flex-col bg-[#07090e] text-slate-100 overflow-x-hidden">
      {/* Verge-Style Cyber Hero Section */}
      <section className="relative pt-12 pb-20 px-4 sm:px-6 border-b border-slate-800/80 overflow-hidden">
        {/* Subtle grid background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#13182608_1px,transparent_1px),linear-gradient(to_bottom,#13182608_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="max-w-6xl mx-auto relative z-10 space-y-10">
          {/* Header Tagline & Badges */}
          <div className="text-center space-y-4 max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold tracking-wider uppercase">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>Next-Gen Interactive Coding • 100% Free</span>
            </div>

            <h1 className="text-4xl sm:text-6xl md:text-7xl font-black text-white tracking-tight leading-[1.08]">
              MASTER CODE. <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
                ZERO PAYWALLS.
              </span>
            </h1>

            <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
              Experience the fast, interactive feedback loops of modern bootcamps —
              powered by in-browser WebAssembly with automated unit test suites.
              From your first print statement to production-grade architecture.
            </p>

            {/* CTA Group */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3">
              <Link
                href="/learn/python/py-01-hello-world"
                onClick={() => sound.playClick()}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm uppercase tracking-wider font-mono transition-all shadow-[0_0_30px_rgba(16,231,117,0.35)] hover:scale-102"
              >
                <span>Start Python Track (Free)</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <Link
                href="/playground"
                onClick={() => sound.playClick()}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-mono text-xs font-semibold transition-colors"
              >
                <Code2 className="w-4 h-4 text-emerald-400" />
                <span>Open Instant Sandbox</span>
              </Link>
            </div>
          </div>

          {/* Interactive Live Hero Terminal (The Verge style interactive card) */}
          <div className="max-w-4xl mx-auto rounded-2xl bg-[#0a0d14] border border-slate-800 shadow-[0_20px_60px_rgba(0,0,0,0.8)] overflow-hidden">
            {/* Terminal Bar */}
            <div className="h-10 bg-[#0e121a] border-b border-slate-800 px-4 flex items-center justify-between text-xs font-mono text-slate-400 select-none">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
                <span className="ml-2 font-bold text-slate-300">
                  interactive_demo.py
                </span>
                <span className="hidden sm:inline-block text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  Try it right here
                </span>
              </div>

              <button
                onClick={handleTestRun}
                disabled={isRunning}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-xs uppercase tracking-wider font-mono transition-all"
              >
                <Play className="w-3 h-3 fill-slate-950" />
                <span>{isRunning ? "Executing..." : "Run in WASM"}</span>
              </button>
            </div>

            {/* Split Code & Output */}
            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-800">
              <div className="p-4 bg-[#090b10]">
                <div className="text-[10px] font-mono uppercase text-slate-400 mb-2 font-bold">
                  // Python 3 Script (Editable)
                </div>
                <textarea
                  value={heroCode}
                  onChange={(e) => setHeroCode(e.target.value)}
                  className="w-full h-48 bg-transparent font-mono text-xs text-emerald-300 resize-none outline-none leading-relaxed"
                  spellCheck={false}
                />
              </div>

              <div className="p-4 bg-[#06080d] flex flex-col justify-between min-h-[160px]">
                <div>
                  <div className="text-[10px] font-mono uppercase text-slate-400 mb-2 font-bold flex items-center gap-1.5">
                    <Terminal className="w-3 h-3 text-emerald-400" />
                    <span>Real-Time Output</span>
                  </div>
                  <pre className="font-mono text-xs text-slate-200 whitespace-pre-wrap leading-relaxed">
                    {heroOutput || (
                      <span className="text-slate-400 italic">
                        Click &quot;Run in WASM&quot; to test instant in-browser compilation!
                      </span>
                    )}
                  </pre>
                </div>
                <div className="pt-4 border-t border-slate-900 flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span className="flex items-center gap-1 text-emerald-400">
                    <Cpu className="w-3.5 h-3.5" /> Pyodide 0.26 WebAssembly
                  </span>
                  <span>Zero server delay</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* AdSense Placement */}
      <AdBanner slotType="leaderboard" />

      {/* Course Tracks Catalog (Coursera structure + Verge aesthetic) */}
      <section className="py-16 px-4 sm:px-6 max-w-6xl mx-auto w-full space-y-10">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-2">
            <span className="text-[11px] font-mono uppercase tracking-widest text-emerald-400 font-bold">
              Engineering Pathways
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              Interactive Programming Curriculums
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 max-w-md font-sans">
            Every curriculum begins with first principles and progresses toward production architecture.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {coursesCatalog.map((course) => {
            const isAvailable = course.modules.length > 0;
            return (
              <div
                key={course.id}
                className={`rounded-2xl border p-6 flex flex-col justify-between transition-all relative overflow-hidden ${
                  isAvailable
                    ? "bg-[#0b0e17] border-emerald-500/40 shadow-[0_0_30px_rgba(16,231,117,0.1)] hover:border-emerald-400"
                    : "bg-[#080a0f] border-slate-800/80 opacity-70"
                }`}
              >
                {/* Glow bar */}
                {isAvailable && (
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 to-cyan-400" />
                )}

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[10px] font-mono uppercase font-bold px-2.5 py-0.5 rounded border ${
                        isAvailable
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                          : "bg-slate-800 text-slate-400 border-slate-700"
                      }`}
                    >
                      {course.badge}
                    </span>
                    <span className="text-xs font-mono text-slate-400">
                      {course.level}
                    </span>
                  </div>

                  <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                    {course.title}
                  </h3>

                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    {course.tagline}
                  </p>

                  <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-slate-400 pt-2">
                    <span className="flex items-center gap-1">
                      <Zap className="w-3.5 h-3.5 text-emerald-400" />
                      {course.totalXp} XP
                    </span>
                    <span className="flex items-center gap-1">
                      <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                      {course.estimatedHours} Hours
                    </span>
                  </div>
                </div>

                <div className="pt-6 mt-6 border-t border-slate-800/80 flex items-center justify-between">
                  {isAvailable ? (
                    <Link
                      href="/learn/python"
                      onClick={() => sound.playClick()}
                      className="inline-flex items-center gap-2 text-xs font-mono font-bold text-emerald-400 hover:text-emerald-300 uppercase tracking-wider group"
                    >
                      <span>Explore Syllabus</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  ) : (
                    <span className="text-xs font-mono text-slate-400">
                      In Development
                    </span>
                  )}

                  {isAvailable && (
                    <Link
                      href="/learn/python/py-01-hello-world"
                      onClick={() => sound.playClick()}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs font-mono uppercase tracking-wider transition-all"
                    >
                      Launch Lab 1.1
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Philosophy: Why 100% Free? (Verge Editorial Section) */}
      <section className="py-16 px-4 sm:px-6 bg-[#05070b] border-t border-b border-slate-800/80">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="space-y-3 text-center">
            <span className="text-[11px] font-mono uppercase tracking-widest text-emerald-400 font-bold">
              The Manifesto
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              Why We Are Free Forever
            </h2>
            <p className="text-slate-400 text-xs sm:text-sm max-w-xl mx-auto leading-relaxed">
              Traditional bootcamps charge \$15,000+ for slides and quizzes.
              Modern WebAssembly allows us to deliver interactive execution directly on your device with zero cloud server computing bills.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
            <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 mb-3">
                <DollarSign className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-200">Zero Paywalls</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                All 9 modules, test suites, and sandbox features are available to anyone in the world without requiring a credit card.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-2">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-400 mb-3">
                <Cpu className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-200">Client-Side WASM</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Python runs securely inside your web browser via WebAssembly. Your code runs with zero queue times and infinite scalability.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-2">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400 mb-3">
                <Globe2 className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-200">Ethical Ads Model</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                We fund platform operations and course authoring through clean, non-intrusive developer tooling sponsors and Google AdSense.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final Call to Action */}
      <section className="py-20 px-4 sm:px-6 text-center relative overflow-hidden">
        <div className="max-w-2xl mx-auto space-y-6 relative z-10">
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            Ready to write Python?
          </h2>
          <p className="text-slate-300 text-xs sm:text-sm">
            No signup forms. No credit cards. No local environment setup required.
          </p>
          <div>
            <Link
              href="/learn/python/py-01-hello-world"
              onClick={() => sound.playClick()}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm uppercase font-mono tracking-wider transition-all shadow-[0_0_30px_rgba(16,231,117,0.4)] hover:scale-105"
            >
              <span>Launch Lab 1.1 Now</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
