"use client";

import React from "react";
import { CheckCircle2, ChevronDown, ChevronUp, CircleDashed, Terminal, XCircle } from "lucide-react";
import type { RunError, TestCase, TestResult } from "@/engine/types";

export type ResultTab = "checks" | "console";

function friendly(err: RunError): string {
  switch (err.type) {
    case "SyntaxError":
      return "Python couldn't read this line. Look for a missing quote, bracket or colon.";
    case "IndentationError":
      return "The spacing at the start of a line is off. Lines inside def/if/for must be indented the same amount.";
    case "NameError":
      return "A name isn't defined yet. Check the spelling, and that it's created above the line that uses it.";
    case "TypeError":
      return "A value is the wrong type for this operation (for example adding text to a number).";
    case "TimeoutError":
      return "Your code ran for too long. A loop may never end.";
    case "ZeroDivisionError":
      return "Dividing by zero isn't allowed.";
    default:
      return "";
  }
}

interface ResultsPanelProps {
  tab: ResultTab;
  onTab: (t: ResultTab) => void;
  tests: TestCase[];
  results: TestResult[];
  stdout: string;
  error: RunError | null;
  running: boolean;
  statusText: string;
  /** Desktop: only the tab bar is shown. */
  collapsed?: boolean;
  /** Desktop only: collapse/expand control. */
  onToggleCollapsed?: () => void;
}

export function ResultsPanel({ tab, onTab, tests, results, stdout, error, running, statusText, collapsed = false, onToggleCollapsed }: ResultsPanelProps) {
  const passed = results.filter((r) => r.passed).length;
  const hasRun = results.length > 0 || error !== null;
  const allPassed = results.length > 0 && passed === results.length;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex shrink-0 items-center gap-1 border-b border-line p-2">
        <button
          onClick={() => onTab("checks")}
          className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${tab === "checks" ? "bg-surface-2 text-ink" : "text-ink-2 hover:bg-surface-2"}`}
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          Checks
          {hasRun && (
            <span className={`rounded-full px-1.5 text-[10px] ${allPassed ? "bg-good text-[#06140f]" : "bg-bad/20 text-bad"}`}>
              {passed}/{tests.length}
            </span>
          )}
        </button>
        <button
          onClick={() => onTab("console")}
          className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${tab === "console" ? "bg-surface-2 text-ink" : "text-ink-2 hover:bg-surface-2"}`}
        >
          <Terminal className="h-3.5 w-3.5" />
          Console
          {error && <span className="h-2 w-2 rounded-full bg-bad" />}
        </button>
        <div className="ml-auto flex min-w-0 items-center gap-2">
          {running && (
            <span className="flex min-w-0 items-center gap-2 text-xs text-ink-3">
              <span className="h-3 w-3 shrink-0 animate-spin rounded-full border-2 border-line border-t-brand" />
              <span className="truncate">{statusText}</span>
            </span>
          )}
          {onToggleCollapsed && (
            <button
              onClick={onToggleCollapsed}
              aria-label={collapsed ? "Expand panel" : "Collapse panel"}
              title={collapsed ? "Expand (or drag the divider)" : "Collapse"}
              className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-ink-3 hover:bg-surface-2 hover:text-ink"
            >
              {collapsed ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          )}
        </div>
      </div>

      <div className={`min-h-0 flex-1 overflow-y-auto p-3 ${collapsed ? "hidden" : ""}`}>
        {tab === "checks" && (
          <ul className="space-y-1.5">
            {tests.map((t) => {
              const r = results.find((x) => x.testId === t.id);
              return (
                <li key={t.id} className={`flex items-start gap-2.5 rounded-lg border px-3 py-2 text-sm ${r ? (r.passed ? "border-good/25 bg-good/[0.06]" : "border-bad/25 bg-bad/[0.06]") : "border-line"}`}>
                  {!r ? (
                    <CircleDashed className="mt-0.5 h-4 w-4 shrink-0 text-ink-3" />
                  ) : r.passed ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-good" />
                  ) : (
                    <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-bad" />
                  )}
                  <div className="min-w-0">
                    <p className="leading-snug">{t.description}</p>
                    {r && !r.passed && r.error && <p className="mt-1 font-mono text-xs leading-relaxed text-bad">{r.error}</p>}
                  </div>
                </li>
              );
            })}
            {!hasRun && <li className="px-1 pt-1 text-xs text-ink-3"><strong className="text-ink-2">Run</strong> (Ctrl/⌘ + Enter) to try your code. <strong className="text-ink-2">Submit</strong> (Ctrl/⌘ + Shift + Enter) to check it and finish the lesson.</li>}
          </ul>
        )}

        {tab === "console" && (
          <div className="font-mono text-[13px] leading-relaxed">
            {error && (
              <div className="mb-2 rounded-lg border border-bad/30 bg-bad/[0.06] p-3">
                <p className="font-medium text-bad">
                  {error.line ? `Line ${error.line} · ` : ""}
                  {error.type}: {error.message}
                </p>
                {friendly(error) && <p className="mt-1 font-sans text-xs text-ink-2">{friendly(error)}</p>}
              </div>
            )}
            {stdout ? <pre className="whitespace-pre-wrap text-ink">{stdout}</pre> : !error && <p className="text-ink-3">Nothing printed yet. print() output shows up here (and on the car&apos;s dashboard).</p>}
          </div>
        )}
      </div>
    </div>
  );
}
