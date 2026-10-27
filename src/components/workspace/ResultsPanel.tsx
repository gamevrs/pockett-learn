"use client";

import React from "react";
import { CheckCircle2, ChevronDown, ChevronUp, CircleDashed, Terminal, XCircle } from "lucide-react";
import type { LanguageId, RunError, TestCase, TestResult } from "@/engine/types";
import type { ServiceIssue } from "@/engine/runtimes/service-error";
import { languageInfo } from "@/engine/languages";
import { useShortcuts } from "@/lib/ui/platform";
import { ServiceNotice } from "./ServiceNotice";
import { consoleEmptyText } from "./console-hint";

export type ResultTab = "checks" | "console";

function friendly(err: RunError): string {
  if (/has already been declared/.test(err.message)) {
    return "This name was already created earlier in the file (maybe in a previous lesson). Reuse it, or pick a new name.";
  }
  switch (err.type) {
    case "SyntaxError":
      return "This line can't be read. Look for a missing quote, bracket, colon or comma.";
    case "IndentationError":
      return "The spacing at the start of a line is off. Lines inside def/if/for must be indented the same amount.";
    case "NameError":
    case "ReferenceError":
      return "A name isn't defined yet. Check the spelling (capitals matter), and that it's created above the line that uses it.";
    case "TypeError":
      return "A value is the wrong type for this operation (for example calling something that isn't a function, or adding text to a number).";
    case "TimeoutError":
      return "Your code ran for too long. A loop may never end.";
    case "ZeroDivisionError":
      return "Dividing by zero isn't allowed.";
    case "SQLError":
      return /no such (table|column)/.test(err.message)
        ? "That table or column doesn't exist. Check the schema panel for the exact names."
        : "The database couldn't run this statement. Check commas between columns and the order of the clauses.";
    case "CompileError":
      return "The compiler stopped before running anything. The first error listed is usually the real one.";
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
  /** Language and scene decide what the empty Console tells the learner to write. */
  language: LanguageId;
  sceneId: string;
  /** True once a run has finished in this session, so an empty Console can say "ran and printed nothing". */
  ranOnce?: boolean;
  /** The runner or engine is having trouble (not the learner's code): shown as a calm notice with Retry. */
  service?: ServiceIssue | null;
  onRetry?: () => void;
  /** Present while a remote run is in flight. */
  onCancel?: () => void;
  /** Desktop: only the tab bar is shown. */
  collapsed?: boolean;
  /** Desktop only: collapse/expand control. */
  onToggleCollapsed?: () => void;
}

export function ResultsPanel({ tab, onTab, tests, results, stdout, error, running, statusText, language, sceneId, ranOnce = false, service = null, onRetry, onCancel, collapsed = false, onToggleCollapsed }: ResultsPanelProps) {
  const keys = useShortcuts();
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
              {onCancel && (
                <button type="button" onClick={onCancel} data-testid="cancel-run" className="shrink-0 rounded-full border border-line px-2 py-0.5 text-[11px] font-medium text-ink-2 hover:bg-surface-2 hover:text-ink">
                  Cancel
                </button>
              )}
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
        {service && onRetry && <ServiceNotice key={service.at} issue={service} onRetry={onRetry} engineName={languageInfo(language).label} className="mb-2.5" />}
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
            {!hasRun && <li className="px-1 pt-1 text-xs text-ink-3"><strong className="text-ink-2">Run</strong> ({keys.runText}) to try your code. <strong className="text-ink-2">Submit</strong> ({keys.submitText}) to check it and finish the lesson.</li>}
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
            {stdout ? <pre className="whitespace-pre-wrap text-ink">{stdout}</pre> : !error && !service && <p className="text-ink-3" data-testid="console-empty">{consoleEmptyText(language, sceneId, ranOnce)}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
