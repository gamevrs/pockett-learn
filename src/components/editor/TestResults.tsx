"use client";

import React from "react";
import { CheckCircle2, XCircle, ShieldAlert, Sparkles, HelpCircle } from "lucide-react";
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
      className={`flex flex-col bg-[#0a0d14] border border-slate-800 rounded-xl overflow-hidden font-mono text-xs ${className}`}
    >
      {/* Header */}
      <div className="h-9 bg-[#0e121c] border-b border-slate-800/80 px-4 flex items-center justify-between text-slate-400 select-none">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          <span className="font-semibold text-slate-300">Automated Test Suites</span>
        </div>

        {hasRun && (
          <div className="flex items-center gap-1.5 font-bold">
            <span
              className={`px-2 py-0.5 rounded text-[11px] border ${
                passedCount === totalCount
                  ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                  : "bg-rose-500/15 text-rose-400 border-rose-500/30"
              }`}
            >
              {passedCount} / {totalCount} Passed
            </span>
          </div>
        )}
      </div>

      {/* List of Test Cases */}
      <div className="p-3 divide-y divide-slate-800/60 max-h-[220px] overflow-y-auto">
        {!hasRun && !isRunning && (
          <div className="text-slate-600 italic py-4 text-center">
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
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : isFailed ? (
                      <XCircle className="w-4 h-4 text-rose-400" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-slate-700 flex items-center justify-center text-[10px] text-slate-500">
                        {idx + 1}
                      </div>
                    )}
                  </div>
                  <div>
                    <span
                      className={`text-xs ${
                        isPassed
                          ? "text-slate-200"
                          : isFailed
                          ? "text-rose-300 font-semibold"
                          : "text-slate-400"
                      }`}
                    >
                      {tc.description}
                    </span>
                    {tc.hidden && (
                      <span className="ml-2 text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">
                        Secret Challenge Test
                      </span>
                    )}
                  </div>
                </div>

                <div className="shrink-0">
                  {isPassed && (
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                      PASSED
                    </span>
                  )}
                  {isFailed && (
                    <span className="text-[10px] font-bold text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">
                      FAILED
                    </span>
                  )}
                </div>
              </div>

              {/* Error Detail */}
              {isFailed && result?.error && (
                <div className="mt-2 ml-6 p-2 rounded bg-rose-950/30 border border-rose-900/40 text-[11px] text-rose-300">
                  <div className="flex items-center gap-1 font-semibold text-rose-400 mb-0.5">
                    <ShieldAlert className="w-3 h-3" />
                    <span>Assertion Mismatch</span>
                  </div>
                  <div className="font-mono">{result.error}</div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
