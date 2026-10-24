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
      <div className="relative w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xl text-center space-y-6">
        {/* Trophy icon */}
        <div className="w-16 h-16 mx-auto rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-[#0056d2] shadow-xs">
          <Trophy className="w-8 h-8 text-[#0056d2]" />
        </div>

        <div className="space-y-1.5">
          <div className="text-xs uppercase tracking-wider text-emerald-600 font-bold flex items-center justify-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Lab Completed Successfully!</span>
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            All Test Cases Verified
          </h2>
          <p className="text-xs text-slate-500">
            Your code passed all automated assertions in the in-browser WebAssembly kernel.
          </p>
        </div>

        {/* Leveled Up Banner */}
        {leveledUp && (
          <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-600" />
            <span>Level Up! You reached Level {level}!</span>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-2.5 py-1">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-col items-center">
            <Zap className="w-4 h-4 text-[#0056d2] mb-1" />
            <span className="text-sm font-bold text-slate-900">+{xpEarned}</span>
            <span className="text-[10px] text-slate-500 uppercase font-medium">XP Earned</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-col items-center">
            <Flame className="w-4 h-4 text-amber-500 mb-1" />
            <span className="text-sm font-bold text-slate-900">{streak}d</span>
            <span className="text-[10px] text-slate-500 uppercase font-medium">Streak</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-col items-center">
            <Trophy className="w-4 h-4 text-emerald-600 mb-1" />
            <span className="text-sm font-bold text-slate-900">{totalXp}</span>
            <span className="text-[10px] text-slate-500 uppercase font-medium">Total XP</span>
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
            className="px-4 py-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors"
          >
            Review Code
          </button>
        </div>
      </div>
    </div>
  );
}
