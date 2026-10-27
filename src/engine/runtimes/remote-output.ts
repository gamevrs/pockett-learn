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
  // .NET stack trace "in Program.cs:line 12", Go panic trace "main.go:12 +0x1d",
  // rustc " --> main.rs:12:5" (Rust panics use the "main.rs:12:5:" form)
  const m = /:(\d+):\d+:/.exec(text) ?? /-->\s+[^\s:]+:(\d+):\d+/.exec(text) ?? /\((\d+),\d+\)/.exec(text) ?? /:line (\d+)/.exec(text) ?? /\.go:(\d+)\b/.exec(text);
  return m ? Number(m[1]) : null;
}

/** First few meaningful lines of a crash report (blank lines dropped, .NET's boilerplate prefix removed). */
export function summarize(text: string): string {
  return text.trim().replace(/^Unhandled exception\.\s*/, "").split("\n").filter((l) => l.trim() !== "").slice(0, 6).join("\n");
}

/**
 * rustc prints "error[E0382]: borrow of moved value: `x`" followed by " --> main.rs:12:5". The first
 * real error wins (the trailing "aborting due to ..." summary is not an error of its own). Null when
 * the text is not rustc output.
 */
export function parseRustcError(text: string): RunError | null {
  const lines = text.split("\n").map((l) => l.replace(/\r$/, ""));
  const head = /^error(?:\[(E\d+)\])?: (.+)$/;
  const at = lines.findIndex((l) => {
    const m = head.exec(l);
    return m !== null && !/^(aborting due to|could not compile)/.test(m[2]);
  });
  if (at < 0) return null;
  const m = head.exec(lines[at])!;
  let line: number | null = null;
  for (let i = at + 1; i < lines.length && !/^(error|warning)/.test(lines[i]); i++) {
    const loc = /^\s*-->\s+[^\s:]+:(\d+):\d+/.exec(lines[i]);
    if (loc) {
      line = Number(loc[1]);
      break;
    }
  }
  return { type: m[1] ?? "CompileError", message: m[2].trim(), line };
}

/**
 * A Rust panic on stderr: "thread 'main' panicked at main.rs:7:5:" then the message on the next line(s)
 * (older compilers print "panicked at 'message', main.rs:7:5"). The "note: run with RUST_BACKTRACE" hint is dropped.
 */
export function parseRustPanic(stderr: string): RunError | null {
  const text = stderr.replace(/\r/g, "");
  const modern = /thread '[^']*' panicked at [^\s:]+:(\d+):\d+:\n([\s\S]*?)(?:\nnote: |\n\n|\s*$)/.exec(text);
  if (modern) return { type: "Panic", message: modern[2].trim() || "the program panicked", line: Number(modern[1]) };
  const legacy = /thread '[^']*' panicked at '([\s\S]*?)', [^\s:]+:(\d+):\d+/.exec(text);
  if (legacy) return { type: "Panic", message: legacy[1].trim(), line: Number(legacy[2]) };
  return null;
}

export function toError(r: RemoteResult): RunError | null {
  if (r.compileError) {
    const rust = parseRustcError(r.compileError);
    if (rust) return rust;
  }
  if (r.exitCode && r.exitCode !== 0) {
    const panic = parseRustPanic(r.stderr);
    if (panic) return panic;
  }
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
      // a check that reads lines[3] or scene.total of an output that is not there yet: say so instead of showing a JavaScript error
      if (err instanceof TypeError) {
        const printed = lines.length === 0 ? "Your program has not printed anything yet." : `Your program printed ${lines.length} line${lines.length === 1 ? "" : "s"}, which is not what this check reads yet.`;
        return { testId: t.id, description: t.description, passed: false, error: `${printed} Run it and compare its output with the task.` };
      }
      return { testId: t.id, description: t.description, passed: false, error: describeFailure(err) };
    }
  });
}
