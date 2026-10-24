"use client";

import React, { useState } from "react";
import {
  BookOpen,
  CheckCircle2,
  HelpCircle,
  Eye,
  EyeOff,
  Flame,
  Clock,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Award,
} from "lucide-react";
import { Lesson } from "@/lib/courses/types";
import { sound } from "@/lib/sound/sound";

interface StoryPaneProps {
  lesson: Lesson;
  allPassed: boolean;
  className?: string;
}

export function StoryPane({ lesson, allPassed, className = "" }: StoryPaneProps) {
  const [activeHintIndex, setActiveHintIndex] = useState<number | null>(null);
  const [showSolution, setShowSolution] = useState(false);

  const toggleHint = (idx: number) => {
    sound.playClick();
    setActiveHintIndex(activeHintIndex === idx ? null : idx);
  };

  const toggleSolution = () => {
    sound.playClick();
    setShowSolution(!showSolution);
  };

  const getDifficultyBadge = (diff: string) => {
    switch (diff) {
      case "Beginner":
        return "text-emerald-700 bg-emerald-50 border-emerald-200";
      case "Intermediate":
        return "text-blue-700 bg-blue-50 border-blue-200";
      case "Advanced":
        return "text-amber-700 bg-amber-50 border-amber-200";
      case "Pro":
        return "text-purple-700 bg-purple-50 border-purple-200";
      default:
        return "text-slate-600 bg-slate-100 border-slate-200";
    }
  };

  return (
    <div
      className={`h-full overflow-y-auto bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-6 shadow-xs ${className}`}
    >
      {/* Lesson Header */}
      <div className="space-y-3 pb-4 border-b border-slate-200">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span
            className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded border ${getDifficultyBadge(
              lesson.difficulty
            )}`}
          >
            {lesson.difficulty}
          </span>

          <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              {lesson.estimatedMinutes}m read &amp; code
            </span>
            <span className="flex items-center gap-1 text-[#0056d2] font-semibold">
              <Sparkles className="w-3.5 h-3.5" />+{lesson.xpReward} XP
            </span>
          </div>
        </div>

        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
          {lesson.title}
        </h1>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 pt-0.5">
          {lesson.tags.map((tag) => (
            <span
              key={tag}
              className="text-[11px] text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200 font-medium"
            >
              #{tag}
            </span>
          ))}
        </div>
      </div>

      {/* Narrative Story (Artemis Mission Briefing) */}
      <div className="rounded-xl bg-blue-50/70 border border-blue-200 p-4 relative">
        <div className="text-[11px] uppercase tracking-wider text-[#0056d2] font-bold mb-1.5 flex items-center gap-1.5">
          <Flame className="w-3.5 h-3.5 text-[#0056d2]" />
          <span>Artemis Mission Context</span>
        </div>
        <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-sans">
          {lesson.story}
        </p>
      </div>

      {/* Conceptual Deep Dive */}
      <div className="space-y-3 text-slate-700 text-xs sm:text-sm leading-relaxed">
        <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-slate-800 font-bold">
          <BookOpen className="w-3.5 h-3.5 text-[#0056d2]" />
          <span>Core Concepts &amp; Mechanics</span>
        </div>
        <div className="prose prose-sm max-w-none prose-pre:bg-slate-900 prose-pre:text-emerald-400 prose-pre:rounded-lg prose-pre:border prose-pre:border-slate-800 prose-code:text-[#0056d2] prose-code:bg-blue-50 prose-code:px-1 prose-code:py-0.5 prose-code:rounded">
          <div className="whitespace-pre-line leading-relaxed text-slate-700">
            {lesson.concept}
          </div>
        </div>
      </div>

      {/* Objectives Checklist */}
      <div className="space-y-2.5 pt-2 border-t border-slate-200">
        <h3 className="text-xs uppercase tracking-wider text-slate-900 font-bold flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-[#0056d2]" />
          <span>Assignment Objectives</span>
        </h3>
        <div className="space-y-2">
          {lesson.tasks.map((task) => (
            <div
              key={task.id}
              className={`flex items-start gap-2.5 p-3 rounded-lg border text-xs transition-colors ${
                allPassed
                  ? "bg-emerald-50 border-emerald-300 text-emerald-900"
                  : "bg-slate-50 border-slate-200 text-slate-700"
              }`}
            >
              <CheckCircle2
                className={`w-4 h-4 shrink-0 mt-0.5 ${
                  allPassed ? "text-emerald-600" : "text-slate-400"
                }`}
              />
              <span className="leading-snug font-medium">{task.description}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Progressive Hints Accordion */}
      {lesson.hints && lesson.hints.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-slate-200">
          <div className="text-xs uppercase tracking-wider text-slate-800 font-bold flex items-center gap-1.5">
            <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
            <span>Guided Hints</span>
          </div>

          <div className="space-y-2">
            {lesson.hints.map((hint, idx) => {
              const isOpen = activeHintIndex === idx;
              return (
                <div
                  key={hint.id}
                  className="rounded-lg border border-slate-200 bg-slate-50 overflow-hidden"
                >
                  <button
                    onClick={() => toggleHint(idx)}
                    className="w-full px-3 py-2 flex items-center justify-between text-left text-xs font-semibold text-slate-700 hover:text-[#0056d2] transition-colors"
                  >
                    <span>
                      Hint {idx + 1}: {hint.title}
                    </span>
                    {isOpen ? (
                      <ChevronUp className="w-3.5 h-3.5 text-amber-600" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </button>

                  {isOpen && (
                    <div className="px-3 py-2.5 bg-white border-t border-slate-200 text-xs text-slate-600 leading-relaxed font-sans">
                      {hint.content}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Reveal Solution */}
      <div className="pt-2 border-t border-slate-200">
        <button
          onClick={toggleSolution}
          className="flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-[#0056d2] transition-colors"
        >
          {showSolution ? (
            <>
              <EyeOff className="w-3.5 h-3.5" />
              <span>Hide Solution Code</span>
            </>
          ) : (
            <>
              <Eye className="w-3.5 h-3.5" />
              <span>Stuck? Inspect Reference Solution</span>
            </>
          )}
        </button>

        {showSolution && (
          <div className="mt-3 p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-2 text-xs">
            <div className="text-[11px] text-amber-700 font-bold uppercase tracking-wider">
              Instructor Reference Solution:
            </div>
            <pre className="p-3 bg-slate-900 border border-slate-800 rounded-md text-emerald-300 font-mono text-xs overflow-x-auto whitespace-pre">
              {lesson.solutionCode}
            </pre>
            <p className="text-slate-600 text-xs leading-relaxed pt-1">
              {lesson.solutionExplanation}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
