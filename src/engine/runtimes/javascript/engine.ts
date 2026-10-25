import { instrument } from "./instrument.ts";
import { describeFailure, inspect, testHelpers } from "../assert.ts";
import type { RunError, TestCase, TestResult } from "../../types.ts";

/**
 * Core of the JavaScript runtime, free of browser APIs so Node can use it for content validation.
 *
 * The learner's file runs inside `new Function`, so top-level `let`/`const`/`function` live in
 * one function scope. A closure that does a *direct* eval in that scope lets us read variables,
 * call hooks and run test code against the learner's program, the same way the Python engine
 * keeps a namespace alive.
 */

const STDOUT_LIMIT = 100_000;
/** Budgets (ms) before a loop guard stops the code. */
export const BUDGET = { run: 2000, hook: 60, test: 1000 };

export class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TimeoutError";
  }
}

/** A program that ran: its output and a window into its top-level scope. */
export interface JsScope {
  stdout: string;
  /** Evaluate `source` inside the program's scope (direct eval) with a time budget. */
  evaluate(source: string, budgetMs: number): unknown;
  /** Start a fresh time budget before calling one of the program's functions directly. */
  arm(budgetMs: number): void;
}

const now = () => (typeof performance !== "undefined" ? performance.now() : Date.now());

/** Line in the learner's file from an error thrown inside `new Function` code. */
function errorLine(err: unknown): number | null {
  const stack = (err as Error)?.stack ?? "";
  // V8: "<anonymous>:LINE:COL"; Firefox: "> Function:LINE:COL". new Function adds 2 header lines.
  const m = /<anonymous>:(\d+):\d+/.exec(stack) ?? /> Function:(\d+):\d+/.exec(stack);
  if (!m) return null;
  const line = Number(m[1]) - 2;
  return line >= 1 ? line : null;
}

export function toRunError(err: unknown): RunError {
  const e = err as Error & { loc?: { line: number } };
  if (e?.name === "SyntaxError" && e.loc) {
    return { type: "SyntaxError", message: e.message.replace(/\s*\(\d+:\d+\)$/, ""), line: e.loc.line };
  }
  if (e instanceof Error) return { type: e.name || "Error", message: e.message, line: errorLine(e) };
  return { type: "Error", message: inspect(err), line: null };
}

export type JsRunResult = { ok: true; scope: JsScope } | { ok: false; stdout: string; error: RunError };

/** Runs the learner's file once and keeps its scope alive. */
export function executeJs(source: string): JsRunResult {
  let out = "";
  const write = (level: string, args: unknown[]) => {
    if (out.length > STDOUT_LIMIT) return;
    const line = args.map((a) => inspect(a)).join(" ");
    out += (level === "log" ? "" : `${level}: `) + line + "\n";
    if (out.length > STDOUT_LIMIT) out = out.slice(0, STDOUT_LIMIT) + "\n… output truncated\n";
  };
  const console = {
    log: (...a: unknown[]) => write("log", a),
    info: (...a: unknown[]) => write("log", a),
    debug: (...a: unknown[]) => write("log", a),
    warn: (...a: unknown[]) => write("warning", a),
    error: (...a: unknown[]) => write("error", a),
    table: (data: unknown) => write("log", [data]),
  };

  let deadline = 0;
  let ticks = 0;
  const guard = () => {
    if ((++ticks & 255) === 0 && now() > deadline) {
      throw new TimeoutError("This code ran for too long. Is there a loop that never ends?");
    }
  };

  let code: string;
  try {
    code = instrument(source);
  } catch (err) {
    return { ok: false, stdout: "", error: toRunError(err) };
  }

  let evaluator: (src: string) => unknown;
  try {
    const factory = new Function(
      "console",
      "__guard",
      `${code}\n;return function (__src) { return eval(__src); };`,
    ) as (c: typeof console, g: () => void) => (src: string) => unknown;
    deadline = now() + BUDGET.run;
    evaluator = factory(console, guard);
  } catch (err) {
    return { ok: false, stdout: out, error: toRunError(err) };
  }

  return {
    ok: true,
    scope: {
      get stdout() {
        return out;
      },
      evaluate(src: string, budgetMs: number) {
        deadline = now() + budgetMs;
        ticks = 0;
        return evaluator(src);
      },
      arm(budgetMs: number) {
        deadline = now() + budgetMs;
        ticks = 0;
      },
    },
  };
}

const IDENT = /^[A-Za-z_$][\w$]*$/;
const camel = (s: string) => s.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase());

/**
 * Scenes ask for Python-style names (`car_name`, `autopilot.steer`). JavaScript learners write
 * camelCase (`carName`), so look up the name as written first, then its camelCase form.
 * Returns the value and, for method paths, the object it belongs to.
 */
export function resolve(scope: JsScope, path: string): { found: boolean; value: unknown; owner: unknown } {
  const parts = path.split(".");
  if (!parts.every((p) => IDENT.test(p))) return { found: false, value: undefined, owner: undefined };
  let owner: unknown = undefined;
  let value: unknown = undefined;
  for (let i = 0; i < parts.length; i++) {
    const names = parts[i] === camel(parts[i]) ? [parts[i]] : [parts[i], camel(parts[i])];
    let hit = false;
    for (const name of names) {
      if (i === 0) {
        let v: unknown;
        try {
          v = scope.evaluate(`typeof ${name} === "undefined" ? undefined : ${name}`, BUDGET.hook);
        } catch {
          v = undefined; // e.g. read before initialisation
        }
        if (v !== undefined) {
          value = v;
          hit = true;
          break;
        }
      } else if (value !== null && typeof value === "object" || typeof value === "function") {
        const v = (value as Record<string, unknown>)[name];
        if (v !== undefined) {
          owner = value;
          value = v;
          hit = true;
          break;
        }
      }
    }
    if (!hit) return { found: false, value: undefined, owner: undefined };
  }
  return { found: true, value, owner };
}

/** Plain-data copy (like a value crossing from Python): drops functions, cycles become null. */
export function plain(value: unknown): unknown {
  try {
    return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  } catch {
    return undefined;
  }
}

/** Runs each check inside the learner's scope. `stdout` and the assert helpers are in scope. */
export function runJsTests(scope: JsScope, tests: TestCase[]): TestResult[] {
  return tests.map((t) => {
    const src = `(function (stdout, assert, assertEqual, assertClose) {\n${t.assertionCode}\n})`;
    try {
      const fn = scope.evaluate(src, BUDGET.test) as (...a: unknown[]) => void;
      scope.arm(BUDGET.test);
      fn(scope.stdout, testHelpers.assert, testHelpers.assertEqual, testHelpers.assertClose);
      return { testId: t.id, description: t.description, passed: true };
    } catch (err) {
      return { testId: t.id, description: t.description, passed: false, error: describeFailure(err) };
    }
  });
}
