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

  const getDifficultyColor = (diff: string) => {
    switch (diff) {
      case "Beginner":
        return "text-emerald-400 bg-emerald-500/10 border-emerald-500/30";
      case "Intermediate":
        return "text-cyan-400 bg-cyan-500/10 border-cyan-500/30";
      case "Advanced":
        return "text-amber-400 bg-amber-500/10 border-amber-500/30";
      case "Pro":
        return "text-purple-400 bg-purple-500/10 border-purple-500/30";
      default:
        return "text-slate-400 bg-slate-800 border-slate-700";
    }
  };

  return (
    <div
      className={`h-full overflow-y-auto bg-[#090b10] border border-slate-800 rounded-xl p-5 sm:p-6 space-y-6 ${className}`}
    >
      {/* Lesson Header */}
      <div className="space-y-3 pb-4 border-b border-slate-800/80">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span
            className={`text-[11px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded border ${getDifficultyColor(
              lesson.difficulty
            )}`}
          >
            {lesson.difficulty}
          </span>

          <div className="flex items-center gap-3 text-xs text-slate-400 font-mono">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              {lesson.estimatedMinutes}m
            </span>
            <span className="flex items-center gap-1 text-emerald-400 font-bold">
              <Sparkles className="w-3.5 h-3.5" />+{lesson.xpReward} XP
            </span>
          </div>
        </div>

        <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
          {lesson.title}
        </h1>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          {lesson.tags.map((tag) => (
            <span
              key={tag}
              className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800"
            >
              #{tag}
            </span>
          ))}
        </div>
      </div>

      {/* Narrative Story (boot.dev style) */}
      <div className="rounded-xl bg-gradient-to-br from-slate-900/90 to-slate-950 border border-slate-800/90 p-4 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
        <div className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 font-bold mb-1.5 flex items-center gap-1">
          <Flame className="w-3.5 h-3.5 text-emerald-400" />
          The Mission Briefing
        </div>
        <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-sans">
          {lesson.story}
        </p>
      </div>

      {/* Conceptual Deep Dive */}
      <div className="space-y-3 text-slate-300 text-xs sm:text-sm leading-relaxed">
        <div className="flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold">
          <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
          <span>Core Concepts & Syntax</span>
        </div>
        <div className="prose prose-invert prose-sm max-w-none prose-pre:bg-[#06080d] prose-pre:border prose-pre:border-slate-800 prose-code:text-emerald-300 prose-code:font-mono">
          <div className="whitespace-pre-line">{lesson.concept}</div>
        </div>
      </div>

      {/* Mission Tasks Checklist */}
      <div className="space-y-2.5 pt-2 border-t border-slate-800/80">
        <h3 className="text-xs font-mono uppercase tracking-wider text-slate-300 font-bold flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          Assignment Objectives
        </h3>
        <div className="space-y-2">
          {lesson.tasks.map((task) => (
            <div
              key={task.id}
              className={`flex items-start gap-2.5 p-2.5 rounded-lg border text-xs transition-colors ${
                allPassed
                  ? "bg-emerald-950/20 border-emerald-500/30 text-emerald-200"
                  : "bg-slate-900/40 border-slate-800 text-slate-300"
              }`}
            >
              <CheckCircle2
                className={`w-4 h-4 shrink-0 mt-0.5 ${
                  allPassed ? "text-emerald-400" : "text-slate-600"
                }`}
              />
              <span className="leading-snug">{task.description}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Progressive Hints Accordion */}
      {lesson.hints && lesson.hints.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-slate-800/80">
          <div className="text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-1.5">
            <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
            <span>Tiered Hints</span>
          </div>

          <div className="space-y-2">
            {lesson.hints.map((hint, idx) => {
              const isOpen = activeHintIndex === idx;
              return (
                <div
                  key={hint.id}
                  className="rounded-lg border border-slate-800 bg-slate-900/40 overflow-hidden"
                >
                  <button
                    onClick={() => toggleHint(idx)}
                    className="w-full px-3 py-2 flex items-center justify-between text-left text-xs font-mono text-slate-300 hover:text-white transition-colors"
                  >
                    <span>
                      Hint {idx + 1}: {hint.title}
                    </span>
                    {isOpen ? (
                      <ChevronUp className="w-3.5 h-3.5 text-amber-400" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                    )}
                  </button>

                  {isOpen && (
                    <div className="px-3 py-2.5 bg-slate-950/70 border-t border-slate-800/80 text-xs text-slate-300 leading-relaxed font-sans">
                      {hint.content}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Reveal Solution Section */}
      <div className="pt-2 border-t border-slate-800/80">
        <button
          onClick={toggleSolution}
          className="flex items-center gap-2 text-xs font-mono text-slate-500 hover:text-slate-300 transition-colors"
        >
          {showSolution ? (
            <>
              <EyeOff className="w-3.5 h-3.5" />
              <span>Hide Reference Solution</span>
            </>
          ) : (
            <>
              <Eye className="w-3.5 h-3.5" />
              <span>Stuck? Peek Reference Solution</span>
            </>
          )}
        </button>

        {showSolution && (
          <div className="mt-3 p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
            <div className="font-mono text-[11px] text-amber-400 font-bold uppercase tracking-wider">
              Reference Solution Code:
            </div>
            <pre className="p-3 bg-[#06080d] border border-slate-800/80 rounded-lg text-emerald-300 font-mono text-xs overflow-x-auto whitespace-pre">
              {lesson.solutionCode}
            </pre>
            <p className="text-slate-400 text-xs leading-relaxed pt-1">
              {lesson.solutionExplanation}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
