"use client";

import React from "react";
import Link from "next/link";
import {
  Trophy,
  Zap,
  Flame,
  ArrowRight,
  RotateCcw,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { sound } from "@/lib/sound/sound";

interface CompletionModalProps {
  isOpen: boolean;
  xpEarned: number;
  totalXp: number;
  level: number;
  leveledUp: boolean;
  streak: number;
  nextLessonHref?: string;
  onClose: () => void;
}

export function CompletionModal({
  isOpen,
  xpEarned,
  totalXp,
  level,
  leveledUp,
  streak,
  nextLessonHref,
  onClose,
}: CompletionModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-[#0a0d14] border border-emerald-500/40 rounded-2xl p-6 sm:p-8 shadow-[0_0_50px_rgba(16,231,117,0.25)] text-center space-y-6">
        {/* Glow orb */}
        <div className="w-20 h-20 mx-auto rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-[0_0_30px_rgba(16,231,117,0.4)] animate-bounce">
          <Trophy className="w-10 h-10" />
        </div>

        <div className="space-y-1.5">
          <div className="text-[11px] font-mono uppercase tracking-widest text-emerald-400 font-bold flex items-center justify-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" />
            Mission Completed!
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">
            All Test Cases Verified
          </h2>
          <p className="text-xs text-slate-400">
            Clean code execution verified inside the WebAssembly Python kernel.
          </p>
        </div>

        {/* Leveled Up Banner */}
        {leveledUp && (
          <div className="p-3 rounded-xl bg-gradient-to-r from-amber-500/20 via-emerald-500/20 to-cyan-500/20 border border-amber-500/40 text-amber-300 font-mono text-xs font-bold flex items-center justify-center gap-2 animate-pulse">
            <Sparkles className="w-4 h-4 text-amber-400" />
            LEVEL UP! You reached Level {level}!
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-2.5 py-1">
          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col items-center">
            <Zap className="w-4 h-4 text-emerald-400 mb-1" />
            <span className="text-sm font-bold text-white font-mono">+{xpEarned}</span>
            <span className="text-[10px] text-slate-400 uppercase font-mono">XP Earned</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col items-center">
            <Flame className="w-4 h-4 text-amber-400 mb-1" />
            <span className="text-sm font-bold text-white font-mono">{streak}d</span>
            <span className="text-[10px] text-slate-400 uppercase font-mono">Day Streak</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col items-center">
            <Trophy className="w-4 h-4 text-cyan-400 mb-1" />
            <span className="text-sm font-bold text-white font-mono">{totalXp}</span>
            <span className="text-[10px] text-slate-400 uppercase font-mono">Total XP</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          {nextLessonHref ? (
            <Link
              href={nextLessonHref}
              onClick={() => {
                sound.playClick();
                onClose();
              }}
              className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm tracking-wide transition-all shadow-[0_0_20px_rgba(16,231,117,0.3)] hover:scale-102"
            >
              <span>Next Mission</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          ) : (
            <Link
              href="/learn/python"
              onClick={() => {
                sound.playClick();
                onClose();
              }}
              className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm tracking-wide transition-all"
            >
              <span>Course Roadmap</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          )}

          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="px-4 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 font-mono text-xs transition-colors"
          >
            Review Code
          </button>
        </div>
      </div>
    </div>
  );
}
