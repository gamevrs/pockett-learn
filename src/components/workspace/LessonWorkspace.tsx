"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Play,
  CheckCircle,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Terminal,
  Sparkles,
  LayoutGrid,
} from "lucide-react";
import { Lesson, TestResult } from "@/lib/courses/types";
import { pythonCourse } from "@/lib/courses/python";
import { executePythonCode } from "@/lib/pyodide/runner";
import {
  getSavedLessonCode,
  saveLessonCode,
  completeLesson,
  getUserStats,
} from "@/lib/storage/progress";
import { sound } from "@/lib/sound/sound";
import { fireCelebrationConfetti } from "@/lib/ui/confetti";
import { StoryPane } from "./StoryPane";
import { CodeEditor } from "../editor/CodeEditor";
import { ConsoleOutput } from "../editor/ConsoleOutput";
import { TestResults } from "../editor/TestResults";
import { CompletionModal } from "./CompletionModal";
import { AdBanner } from "../ads/AdBanner";

interface LessonWorkspaceProps {
  lesson: Lesson;
}

export function LessonWorkspace({ lesson }: LessonWorkspaceProps) {
  const [code, setCode] = useState<string>(lesson.starterCode);
  const [stdout, setStdout] = useState<string>("");
  const [stderr, setStderr] = useState<string>("");
  const [executionTimeMs, setExecutionTimeMs] = useState<number>(0);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [statusText, setStatusText] = useState<string>("");
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [activeTab, setActiveTab] = useState<"tests" | "console">("tests");
  const [showCompletionModal, setShowCompletionModal] = useState<boolean>(false);
  const [completionStats, setCompletionStats] = useState({
    xpEarned: 0,
    totalXp: 0,
    level: 1,
    leveledUp: false,
    streak: 1,
  });

  // Calculate next and prev lessons in sequence
  const allLessons = pythonCourse.modules.flatMap((m) => m.lessons);
  const currentIndex = allLessons.findIndex((l) => l.id === lesson.id);
  const prevLesson = currentIndex > 0 ? allLessons[currentIndex - 1] : null;
  const nextLesson =
    currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1] : null;

  // Load saved code on mount or lesson change
  useEffect(() => {
    const saved = getSavedLessonCode(lesson.id, lesson.starterCode);
    setCode(saved);
    setStdout("");
    setStderr("");
    setTestResults([]);
    setShowCompletionModal(false);
  }, [lesson.id, lesson.starterCode]);

  // Code change handler with auto-save
  const handleCodeChange = (newCode: string) => {
    setCode(newCode);
    saveLessonCode(lesson.id, newCode);
  };

  const handleReset = () => {
    setCode(lesson.starterCode);
    saveLessonCode(lesson.id, lesson.starterCode);
    setStdout("");
    setStderr("");
    setTestResults([]);
  };

  // Run only standard output without evaluating tests
  const handleRunCodeOnly = async () => {
    sound.playClick();
    setIsRunning(true);
    setStatusText("Running code...");
    setActiveTab("console");

    try {
      const res = await executePythonCode(code, [], (status) =>
        setStatusText(status)
      );
      setStdout(res.stdout);
      setStderr(res.stderr);
      setExecutionTimeMs(res.executionTimeMs);
      if (res.stderr) {
        sound.playError();
      }
    } catch (err: any) {
      setStderr(err?.message || String(err));
      sound.playError();
    } finally {
      setIsRunning(false);
      setStatusText("");
    }
  };

  // Test and submit solution
  const handleTestAndSubmit = async () => {
    sound.playClick();
    setIsRunning(true);
    setStatusText("Initializing test execution...");
    setActiveTab("tests");

    try {
      const res = await executePythonCode(
        code,
        lesson.testCases,
        (status) => setStatusText(status)
      );

      setStdout(res.stdout);
      setStderr(res.stderr);
      setExecutionTimeMs(res.executionTimeMs);
      setTestResults(res.testResults);

      if (res.allPassed) {
        sound.playSuccess();
        fireCelebrationConfetti();

        // Award progress
        const result = completeLesson(lesson.id, lesson.xpReward);
        if (result.leveledUp) {
          setTimeout(() => sound.playLevelUp(), 400);
        }

        // Notify other components (Navbar etc.)
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("pockett_progress_updated"));
        }

        setCompletionStats({
          xpEarned: lesson.xpReward,
          totalXp: result.stats.xp,
          level: result.stats.level,
          leveledUp: result.leveledUp,
          streak: result.stats.streak,
        });

        setShowCompletionModal(true);
      } else {
        sound.playError();
      }
    } catch (err: any) {
      setStderr(err?.message || String(err));
      sound.playError();
    } finally {
      setIsRunning(false);
      setStatusText("");
    }
  };

  // Hotkey support: Ctrl+Enter or Cmd+Enter to test solution
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        handleTestAndSubmit();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [code, lesson]);

  const allPassed =
    testResults.length > 0 && testResults.every((t) => t.passed);

  return (
    <div className="flex-1 flex flex-col w-full h-[calc(100vh-4rem)] overflow-hidden bg-[#07090e]">
      {/* Top Workspace Navigation Bar */}
      <div className="h-12 border-b border-slate-800 bg-[#0a0d14] px-4 flex items-center justify-between gap-4 select-none shrink-0">
        <div className="flex items-center gap-3">
          <Link
            href="/learn/python"
            onClick={() => sound.playClick()}
            className="flex items-center gap-1.5 text-xs font-mono text-slate-400 hover:text-white transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Course Syllabus</span>
          </Link>

          <span className="text-slate-700">/</span>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-emerald-400 font-bold truncate max-w-[200px] sm:max-w-xs">
              {lesson.title}
            </span>
          </div>
        </div>

        {/* Action Controls & Navigation */}
        <div className="flex items-center gap-2">
          {prevLesson && (
            <Link
              href={`/learn/python/${prevLesson.id}`}
              onClick={() => sound.playClick()}
              title={`Previous: ${prevLesson.title}`}
              className="p-1.5 rounded-lg border border-slate-800 bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </Link>
          )}

          {nextLesson && (
            <Link
              href={`/learn/python/${nextLesson.id}`}
              onClick={() => sound.playClick()}
              title={`Next: ${nextLesson.title}`}
              className="p-1.5 rounded-lg border border-slate-800 bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </Link>
          )}

          {/* Run Code Button (stdout only) */}
          <button
            onClick={handleRunCodeOnly}
            disabled={isRunning}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 text-xs font-mono font-semibold transition-all border border-slate-700"
          >
            <Play className="w-3.5 h-3.5 fill-slate-300" />
            <span className="hidden sm:inline">Run Code</span>
          </button>

          {/* Test & Submit Button */}
          <button
            onClick={handleTestAndSubmit}
            disabled={isRunning}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 text-xs font-mono font-bold tracking-wide uppercase transition-all shadow-[0_0_15px_rgba(16,231,117,0.3)] hover:scale-102"
          >
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Test & Submit</span>
            <span className="hidden md:inline-block text-[10px] opacity-75 font-normal ml-0.5">
              (⌘+↵)
            </span>
          </button>
        </div>
      </div>

      {/* Main Split-Screen Coding Lab */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-2 p-2 sm:p-3 overflow-hidden">
        {/* Left Pane: Narrative Story, Concepts, and Checklist */}
        <div className="lg:col-span-5 h-full overflow-hidden flex flex-col">
          <StoryPane lesson={lesson} allPassed={allPassed} />
        </div>

        {/* Right Pane: Code Editor + Bottom Output Tabs */}
        <div className="lg:col-span-7 h-full flex flex-col gap-2 overflow-hidden">
          {/* Top half: Monaco Editor */}
          <div className="flex-1 min-h-[300px] overflow-hidden">
            <CodeEditor
              value={code}
              onChange={handleCodeChange}
              onReset={handleReset}
              language="python"
            />
          </div>

          {/* Bottom half: Output Tabs (Console / Tests) */}
          <div className="h-56 shrink-0 flex flex-col">
            {/* Tab switchers */}
            <div className="flex items-center gap-2 mb-1.5">
              <button
                onClick={() => {
                  sound.playClick();
                  setActiveTab("tests");
                }}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono font-semibold transition-colors ${
                  activeTab === "tests"
                    ? "bg-slate-800 text-emerald-400 border border-emerald-500/30"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Sparkles className="w-3 h-3" />
                <span>Test Cases ({lesson.testCases.length})</span>
                {testResults.length > 0 && (
                  <span
                    className={`w-2 h-2 rounded-full ${
                      allPassed ? "bg-emerald-400" : "bg-rose-400"
                    }`}
                  />
                )}
              </button>

              <button
                onClick={() => {
                  sound.playClick();
                  setActiveTab("console");
                }}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono font-semibold transition-colors ${
                  activeTab === "console"
                    ? "bg-slate-800 text-emerald-400 border border-emerald-500/30"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Terminal className="w-3 h-3" />
                <span>Standard Output</span>
                {stdout && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                )}
                {stderr && <span className="w-2 h-2 rounded-full bg-rose-400" />}
              </button>
            </div>

            {/* Active Tab View */}
            <div className="flex-1 overflow-hidden">
              {activeTab === "tests" ? (
                <TestResults
                  testCases={lesson.testCases}
                  testResults={testResults}
                  isRunning={isRunning}
                  className="h-full"
                />
              ) : (
                <ConsoleOutput
                  stdout={stdout}
                  stderr={stderr}
                  executionTimeMs={executionTimeMs}
                  isRunning={isRunning}
                  statusText={statusText}
                  onClear={() => {
                    setStdout("");
                    setStderr("");
                  }}
                  className="h-full"
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Completion Modal */}
      <CompletionModal
        isOpen={showCompletionModal}
        xpEarned={completionStats.xpEarned}
        totalXp={completionStats.totalXp}
        level={completionStats.level}
        leveledUp={completionStats.leveledUp}
        streak={completionStats.streak}
        nextLessonHref={
          nextLesson ? `/learn/python/${nextLesson.id}` : undefined
        }
        onClose={() => setShowCompletionModal(false)}
      />
    </div>
  );
}
