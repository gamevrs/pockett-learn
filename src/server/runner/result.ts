import { COMPILE_TIMEOUT_MESSAGE, LIMITS, TIMEOUT_MESSAGE } from "./config.ts";
import type { RunResponse } from "./config.ts";

/**
 * Turns the report printed by run.sh (see provision.ts) into the /api/run response.
 *
 * run.sh prints `<marker>:key=value` lines and `<marker>:name_begin` ... `<marker>:name_end`
 * sections, where the marker is a random token chosen per request. The learner's program can't
 * reasonably forge it, and even if it did the only victim would be their own result.
 */

export class RunnerProtocolError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RunnerProtocolError";
  }
}

function section(raw: string, marker: string, name: string): string | null {
  const open = `${marker}:${name}_begin\n`;
  const at = raw.indexOf(open);
  if (at < 0) return null;
  const start = at + open.length;
  const end = raw.indexOf(`\n${marker}:${name}_end`, start);
  return raw.slice(start, end < 0 ? raw.length : end);
}

function value(raw: string, marker: string, key: string): string | null {
  const needle = `\n${marker}:${key}=`;
  const at = raw.indexOf(needle);
  if (at < 0) return null;
  const from = at + needle.length;
  const nl = raw.indexOf("\n", from);
  return raw.slice(from, nl < 0 ? raw.length : nl).trim();
}

function int(raw: string, marker: string, key: string): number | null {
  const v = value(raw, marker, key);
  if (v === null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Removes sandbox-internal paths and tool banners so learners see messages about their own file. */
export function cleanToolOutput(text: string): string {
  return text
    .replace(/\/tmp\/pk-(?:build|run)\.[A-Za-z0-9]+\//g, "")
    .replace(/^# command-line-arguments\r?\n/gm, "")
    .replace(/\r\n/g, "\n");
}

function cap(text: string, max: number, note: string): string {
  return text.length > max ? `${text.slice(0, max)}\n${note}\n` : text;
}

/** What to tell the learner when a program died from a signal without printing anything. */
export function describeExit(code: number): string | null {
  switch (code) {
    case 139:
      return "Segmentation fault: your program touched memory it doesn't own (an invalid pointer, or an array index far out of range).";
    case 134:
      return "Aborted: your program crashed.";
    case 136:
      return "Floating point exception (for example an integer divided by zero).";
    case 137:
      return "Your program was stopped by the system, most likely because it used too much memory.";
    case 153:
      return "Your program printed too much output and was stopped.";
    default:
      return null;
  }
}

export function parseRunnerOutput(raw: string, marker: string): RunResponse {
  // Leading newline makes `\n<marker>:key=` match for the very first line too.
  const text = `\n${raw}`;
  const compileCode = int(text, marker, "compile_code");
  if (compileCode === null) throw new RunnerProtocolError("The runner produced no report.");

  if (compileCode !== 0) {
    const timedOut = int(text, marker, "compile_timed_out") === 1;
    const out = cleanToolOutput(section(text, marker, "compile") ?? "").trim();
    const compileError = timedOut
      ? out ? `${COMPILE_TIMEOUT_MESSAGE}\n${out}` : COMPILE_TIMEOUT_MESSAGE
      : out || "Compilation failed.";
    return { stdout: "", stderr: "", exitCode: null, compileError: cap(compileError, LIMITS.maxStderr, "[compiler output truncated]"), timedOut: false };
  }

  const runCode = int(text, marker, "run_code");
  if (runCode === null) throw new RunnerProtocolError("The runner report was incomplete.");
  const timedOut = int(text, marker, "timed_out") === 1;
  const stdoutBytes = int(text, marker, "stdout_bytes") ?? 0;
  let stdout = cleanToolOutput(section(text, marker, "stdout") ?? "");
  let stderr = cleanToolOutput(section(text, marker, "stderr") ?? "");
  if (stdoutBytes > LIMITS.maxOutput) stdout += "\n[output truncated]\n";
  stderr = cap(stderr, LIMITS.maxStderr, "[error output truncated]");

  if (timedOut) {
    return { stdout, stderr: TIMEOUT_MESSAGE, exitCode: 137, compileError: null, timedOut: true };
  }
  if (runCode !== 0) {
    const friendly = describeExit(runCode);
    if (friendly && (runCode === 153 || stderr.trim() === "")) stderr = friendly;
  }
  return { stdout, stderr, exitCode: runCode, compileError: null, timedOut: false };
}
