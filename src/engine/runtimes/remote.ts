import { createStaticProgram } from "../program";
import { describeFailure, testHelpers } from "./assert";
import { crashedResults, type Runtime } from "./types";
import type { LanguageId, RunError, TestCase, TestResult } from "../types";

/**
 * Compiled languages (C#, C++, Go) run on the pockett runner: /api/run forwards the source to a
 * sandboxed Piston-compatible service (RUNNER_URL). Programs can't be called back synchronously
 * from a scene, so scenes read what the program printed: `stdout`, plus any lines of the form
 * `@scene {json}` merged into the program's variables.
 *
 * Checks are JavaScript over the output: `stdout`, `lines`, `scene` (merged @scene data), and the
 * assert helpers.
 */

interface RemoteResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  compileError: string | null;
  error?: string;
}

async function execute(language: LanguageId, source: string, setup?: string): Promise<RemoteResult> {
  const res = await fetch("/api/run", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ language, source, stdin: setup ?? "" }),
  });
  const data = (await res.json().catch(() => ({}))) as Partial<RemoteResult>;
  if (!res.ok) throw new Error(data.error ?? `The code runner is unavailable (${res.status}).`);
  return { stdout: data.stdout ?? "", stderr: data.stderr ?? "", exitCode: data.exitCode ?? null, compileError: data.compileError ?? null };
}

function lineFrom(text: string): number | null {
  // gcc "main.cpp:12:5:", dotnet "(12,5)", go "main.go:12:5:"
  const m = /:(\d+):\d+:/.exec(text) ?? /\((\d+),\d+\)/.exec(text);
  return m ? Number(m[1]) : null;
}

function toError(r: RemoteResult): RunError | null {
  if (r.compileError) return { type: "CompileError", message: r.compileError.trim().split("\n").slice(0, 6).join("\n"), line: lineFrom(r.compileError) };
  if (r.exitCode && r.exitCode !== 0) return { type: "RuntimeError", message: (r.stderr || `exited with code ${r.exitCode}`).trim().split("\n").slice(0, 6).join("\n"), line: lineFrom(r.stderr) };
  return null;
}

/** Splits `@scene {json}` lines out of the visible output. */
function parseOutput(stdout: string) {
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

function runChecks(stdout: string, scene: Record<string, unknown>, tests: TestCase[]): TestResult[] {
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

export function remoteRuntime(language: LanguageId): Runtime {
  return {
    language,
    preload() {},
    async run(source, options) {
      const started = performance.now();
      options?.onStatus?.("Compiling and running on the pockett runner…");
      const r = await execute(language, source, options?.setup);
      const out = parseOutput(r.stdout);
      const error = toError(r);
      const durationMs = Math.round(performance.now() - started);
      return { stdout: out.text, error, durationMs, program: error ? null : createStaticProgram({ stdout: out.text, vars: out.scene }) };
    },
    async grade(source, tests, options) {
      const started = performance.now();
      options?.onStatus?.("Checking your work…");
      const r = await execute(language, source, options?.setup);
      const out = parseOutput(r.stdout);
      const error = toError(r);
      const results = error ? crashedResults(tests) : runChecks(out.text, out.scene, tests);
      return { stdout: out.text, error, results, allPassed: !error && results.length > 0 && results.every((x) => x.passed), durationMs: Math.round(performance.now() - started) };
    },
  };
}
