"use client";

import React from "react";
import Link from "next/link";
import {
  Trophy,
  Zap,
  Flame,
  ArrowRight,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl text-center space-y-6">
        {/* Trophy icon */}
        <div className="w-16 h-16 mx-auto rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-[#0056d2] dark:text-blue-400 shadow-xs">
          <Trophy className="w-8 h-8 text-[#0056d2] dark:text-blue-400" />
        </div>

        <div className="space-y-1.5">
          <div className="text-xs uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-bold flex items-center justify-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Lab Completed Successfully!</span>
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            All Test Cases Verified
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Your code passed all automated assertions in the in-browser WebAssembly kernel.
          </p>
        </div>

        {/* Leveled Up Banner */}
        {leveledUp && (
          <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs font-bold flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span>Level Up! You reached Level {level}!</span>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-2.5 py-1">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col items-center">
            <Zap className="w-4 h-4 text-[#0056d2] dark:text-blue-400 mb-1" />
            <span className="text-sm font-bold text-slate-900 dark:text-white">+{xpEarned}</span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-medium">XP Earned</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col items-center">
            <Flame className="w-4 h-4 text-amber-500 mb-1" />
            <span className="text-sm font-bold text-slate-900 dark:text-white">{streak}d</span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-medium">Streak</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col items-center">
            <Trophy className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mb-1" />
            <span className="text-sm font-bold text-slate-900 dark:text-white">{totalXp}</span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-medium">Total XP</span>
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
              className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-[#0056d2] hover:bg-[#0041b8] text-white font-bold text-sm tracking-wide shadow-xs transition-all"
            >
              <span>Next Guided Lab</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          ) : (
            <Link
              href="/learn/python"
              onClick={() => {
                sound.playClick();
                onClose();
              }}
              className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-[#0056d2] hover:bg-[#0041b8] text-white font-bold text-sm tracking-wide shadow-xs transition-all"
            >
              <span>Back to Syllabus</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          )}

          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="px-4 py-3 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs transition-colors"
          >
            Review Code
          </button>
        </div>
      </div>
    </div>
  );
}
