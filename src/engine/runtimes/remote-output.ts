import { describeFailure, testHelpers } from "./assert.ts";
import type { RunError, TestCase, TestResult } from "../types.ts";

/**
 * Pure helpers for the compiled-language runner's results (no DOM, no fetch), shared by the browser
 * runtime (remote.ts) and the content validator (scripts/validate-content.mjs), so a lesson is
 * judged by exactly the same rules in both places.
 */

/** The JSON the /api/run route answers with (see src/server/runner/result.ts). */
export interface RemoteResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  compileError: string | null;
  timedOut?: boolean;
}

export function lineFrom(text: string): number | null {
  // gcc "main.cpp:12:5:", go "./main.go:12:5:", Roslyn "Program.cs(12,5):",
  // .NET stack trace "in Program.cs:line 12", Go panic trace "main.go:12 +0x1d"
  const m = /:(\d+):\d+:/.exec(text) ?? /\((\d+),\d+\)/.exec(text) ?? /:line (\d+)/.exec(text) ?? /\.go:(\d+)\b/.exec(text);
  return m ? Number(m[1]) : null;
}

/** First few meaningful lines of a crash report (blank lines dropped, .NET's boilerplate prefix removed). */
export function summarize(text: string): string {
  return text.trim().replace(/^Unhandled exception\.\s*/, "").split("\n").filter((l) => l.trim() !== "").slice(0, 6).join("\n");
}

export function toError(r: RemoteResult): RunError | null {
  if (r.compileError) return { type: "CompileError", message: r.compileError.trim().split("\n").slice(0, 6).join("\n"), line: lineFrom(r.compileError) };
  if (r.exitCode && r.exitCode !== 0) return { type: "RuntimeError", message: summarize(r.stderr || `exited with code ${r.exitCode}`), line: lineFrom(r.stderr) };
  return null;
}

/** Splits `@scene {json}` lines out of the visible output. */
export function parseOutput(stdout: string): { scene: Record<string, unknown>; text: string } {
  const scene: Record<string, unknown> = {};
  const visible: string[] = [];
  for (const line of stdout.split("\n")) {
    const m = /^@scene\s+(\{.*\})\s*$/.exec(line);
    if (m) {
      try {
        Object.assign(scene, JSON.parse(m[1]));
        continue;
      } catch {
        /* not valid JSON: show it as normal output */
      }
    }
    visible.push(line);
  }
  return { scene, text: visible.join("\n") };
}

export function runChecks(stdout: string, scene: Record<string, unknown>, tests: TestCase[]): TestResult[] {
  const lines = stdout.split("\n").filter((l) => l.length > 0);
  return tests.map((t) => {
    try {
      new Function("stdout", "lines", "scene", "assert", "assertEqual", "assertClose", t.assertionCode)(
        stdout, lines, scene, testHelpers.assert, testHelpers.assertEqual, testHelpers.assertClose,
      );
      return { testId: t.id, description: t.description, passed: true };
    } catch (err) {
      return { testId: t.id, description: t.description, passed: false, error: describeFailure(err) };
    }
  });
}
