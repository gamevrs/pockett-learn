"use client";

import React from "react";
import { CheckCircle2, XCircle, ShieldAlert, Sparkles } from "lucide-react";
import { TestCase, TestResult } from "@/lib/courses/types";

interface TestResultsProps {
  testCases: TestCase[];
  testResults: TestResult[];
  isRunning?: boolean;
  className?: string;
}

export function TestResults({
  testCases,
  testResults,
  isRunning,
  className = "",
}: TestResultsProps) {
  const totalCount = testCases.length;
  const passedCount = testResults.filter((r) => r.passed).length;
  const hasRun = testResults.length > 0;

  return (
    <div
      className={`flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden text-xs shadow-xs transition-colors ${className}`}
    >
      {/* Header */}
      <div className="h-9 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 px-4 flex items-center justify-between text-slate-700 dark:text-slate-300 select-none">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-[#0056d2] dark:text-blue-400" />
          <span className="font-bold text-slate-800 dark:text-white">Automated Test Suites</span>
        </div>

        {hasRun && (
          <div className="flex items-center gap-1.5 font-bold">
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                passedCount === totalCount
                  ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                  : "bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800"
              }`}
            >
              {passedCount} of {totalCount} Passed
            </span>
          </div>
        )}
      </div>

      {/* List of Test Cases */}
      <div className="p-3 divide-y divide-slate-100 dark:divide-slate-800 max-h-[220px] overflow-y-auto">
        {!hasRun && !isRunning && (
          <div className="text-slate-500 dark:text-slate-400 italic py-4 text-center">
            {totalCount} test case{totalCount > 1 ? "s" : ""} waiting for evaluation.
          </div>
        )}

        {testCases.map((tc, idx) => {
          const result = testResults.find((r) => r.testId === tc.id);
          const isPassed = result?.passed;
          const isFailed = result && !result.passed;

          return (
            <div key={tc.id} className="py-2.5 first:pt-0 last:pb-0">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2">
                  <div className="mt-0.5 shrink-0">
                    {isPassed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    ) : isFailed ? (
                      <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-slate-300 dark:border-slate-700 flex items-center justify-center text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                        {idx + 1}
                      </div>
                    )}
                  </div>
                  <div>
                    <span
                      className={`text-xs ${
                        isPassed
                          ? "text-slate-800 dark:text-slate-200 font-medium"
                          : isFailed
                          ? "text-rose-700 dark:text-rose-400 font-bold"
                          : "text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      {tc.description}
                    </span>
                    {tc.hidden && (
                      <span className="ml-2 text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium border border-slate-200 dark:border-slate-700">
                        Edge Case Test
                      </span>
                    )}
                  </div>
                </div>

                <div className="shrink-0">
                  {isPassed && (
                    <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                      PASSED
                    </span>
                  )}
                  {isFailed && (
                    <span className="text-[10px] font-bold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded-full border border-rose-200 dark:border-rose-800">
                      FAILED
                    </span>
                  )}
                </div>
              </div>

              {/* Error Detail */}
              {isFailed && result?.error && (
                <div className="mt-2 ml-6 p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-300">
                  <div className="flex items-center gap-1 font-bold text-rose-700 dark:text-rose-400 mb-0.5">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>Assertion Check Failed</span>
                  </div>
                  <div className="font-mono text-[11px] text-rose-900 dark:text-rose-200 bg-white/70 dark:bg-slate-900/80 p-1.5 rounded mt-1 border border-rose-100 dark:border-rose-900/60">
                    {result.error}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
