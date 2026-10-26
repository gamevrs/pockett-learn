import { instrument } from "./instrument.ts";
import { describeFailure, inspect, testHelpers } from "../assert.ts";
import { ASYNC_BUDGET, Sandbox, TimeoutError } from "./sandbox.ts";
import type { Route } from "./sim-network.ts";
import type { RunError, TestCase, TestResult } from "../../types.ts";

export { TimeoutError, StuckPromiseError } from "./sandbox.ts";

/**
 * Core of the JavaScript runtime, free of browser APIs so Node can use it for content validation.
 *
 * The learner's file runs as the body of an async function, so top-level `await` works and
 * top-level `let`/`const`/`function` live in one function scope. A closure that does a *direct*
 * eval in that scope lets us read variables, call hooks and run test code against the learner's
 * program, the same way the Python engine keeps a namespace alive.
 *
 * Timers, Date and fetch inside the file are simulated (see sandbox.ts): while the file and the
 * tests run, time is virtual and jumps forward whenever the program is waiting, so nothing is slow.
 */

const STDOUT_LIMIT = 100_000;
/** Budgets (ms) before a loop guard stops synchronous code. Awaiting a timer never counts. */
export const BUDGET = { run: 2000, hook: 60, test: 1000 };

/** A program that ran: its output and a window into its top-level scope. */
export interface JsScope {
  stdout: string;
  sandbox: Sandbox;
  /** Evaluate `source` inside the program's scope (direct eval) with a time budget. */
  evaluate(source: string, budgetMs: number): unknown;
  /** Start a fresh time budget before calling one of the program's functions directly. */
  arm(budgetMs: number): void;
  /** Wait for a promise while virtual time moves on whenever the program is idle. */
  drive<T>(work: Promise<T> | T, label?: string): Promise<T>;
  /** Switch timers to real time (after the run, for the live scene). */
  goLive(): void;
  /** Cancel every pending timer. */
  dispose(): void;
}

const now = () => (typeof performance !== "undefined" ? performance.now() : Date.now());

/** Line in the learner's file from an error thrown inside the async function. */
function errorLine(err: unknown): number | null {
  const stack = (err as Error)?.stack ?? "";
  // V8: "<anonymous>:LINE:COL"; Firefox: "> AsyncFunction:LINE:COL". The Function constructor adds 2 header lines.
  const m = /<anonymous>:(\d+):\d+/.exec(stack) ?? /> (?:Async)?Function:(\d+):\d+/.exec(stack);
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

function unhandledToRunError(reason: unknown): RunError {
  const base = reason instanceof Error ? toRunError(reason) : { type: "Error", message: inspect(reason), line: null };
  return {
    type: "UnhandledRejection",
    message: `${base.type}: ${base.message}. A Promise was rejected and nothing handled it. Add .catch(...) or wrap the await in try/catch.`,
    line: base.line,
  };
}

export type JsRunResult = { ok: true; scope: JsScope } | { ok: false; stdout: string; error: RunError };

export interface ExecuteOptions {
  /** Replace the simulated API (default: the tournament API in sim-api.ts). */
  routes?: Route[];
}

const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor as new (...args: string[]) => (...a: unknown[]) => Promise<unknown>;

/** Runs the learner's file once and keeps its scope alive. */
export async function executeJs(source: string, options: ExecuteOptions = {}): Promise<JsRunResult> {
  let out = "";
  const write = (level: string, args: unknown[]) => {
    if (out.length > STDOUT_LIMIT) return;
    const line = args.map((a) => inspect(a)).join(" ");
    out += (level === "log" ? "" : `${level}: `) + line + "\n";
    if (out.length > STDOUT_LIMIT) out = out.slice(0, STDOUT_LIMIT) + "\n… output truncated\n";
  };
  const counts = new Map<string, number>();
  const console = {
    log: (...a: unknown[]) => write("log", a),
    info: (...a: unknown[]) => write("log", a),
    debug: (...a: unknown[]) => write("log", a),
    warn: (...a: unknown[]) => write("warning", a),
    error: (...a: unknown[]) => write("error", a),
    table: (data: unknown) => write("log", [data]),
    dir: (data: unknown) => write("log", [data]),
    group: (...a: unknown[]) => a.length && write("log", a),
    groupEnd: () => {},
    assert: (cond: unknown, ...a: unknown[]) => {
      if (!cond) write("error", ["Assertion failed:", ...a]);
    },
    count: (label = "default") => {
      const n = (counts.get(label) ?? 0) + 1;
      counts.set(label, n);
      write("log", [`${label}: ${n}`]);
    },
  };

  let deadline = 0;
  let ticks = 0;
  const arm = (budgetMs: number) => {
    deadline = now() + budgetMs;
    ticks = 0;
  };
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

  const sandbox = new Sandbox(() => arm(BUDGET.run), options.routes);
  const globalNames = Object.keys(sandbox.globals);
  let evaluator: ((src: string) => unknown) | null = null;
  const reg = (fn: (src: string) => unknown) => {
    evaluator = fn;
  };

  let body: (...a: unknown[]) => Promise<unknown>;
  try {
    body = new AsyncFunction("console", "__guard", "__reg", ...globalNames, code);
  } catch (err) {
    return { ok: false, stdout: out, error: toRunError(err) };
  }

  const fail = (error: RunError): JsRunResult => {
    sandbox.dispose();
    return { ok: false, stdout: out, error };
  };

  try {
    arm(BUDGET.run);
    const work = body(console, guard, reg, ...globalNames.map((n) => sandbox.globals[n]));
    await sandbox.drive(work, "Your code");
    await sandbox.drain();
  } catch (err) {
    return fail(toRunError(err));
  }
  if (sandbox.uncaught.length) return fail(toRunError(sandbox.uncaught[0]));
  if (sandbox.unhandled.length) return fail(unhandledToRunError(sandbox.unhandled[0].reason));
  const evalInScope = evaluator as ((src: string) => unknown) | null;
  if (!evalInScope) return fail({ type: "Error", message: "The program did not start.", line: null });

  return {
    ok: true,
    scope: {
      get stdout() {
        return out;
      },
      sandbox,
      evaluate(src: string, budgetMs: number) {
        arm(budgetMs);
        return evalInScope(src);
      },
      arm,
      drive: (work, label) => sandbox.drive(work, label),
      goLive: () => sandbox.goLive(),
      dispose: () => sandbox.dispose(),
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
      } else if ((value !== null && typeof value === "object") || typeof value === "function") {
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

/**
 * Runs each check inside the learner's scope. `stdout`, the assert helpers and `sim` (the fake
 * clock and network) are in scope, and check code may use `await`.
 */
export async function runJsTests(scope: JsScope, tests: TestCase[]): Promise<TestResult[]> {
  const results: TestResult[] = [];
  const sandbox = scope.sandbox;
  for (const t of tests) {
    const src = `(async function (stdout, assert, assertEqual, assertClose, assertRejects, assertThrows, sim) {\n${t.assertionCode}\n})`;
    const keep = new Set(sandbox.scheduler.ids());
    const uncaughtBefore = sandbox.uncaught.length;
    sandbox.network.reset();
    try {
      const fn = scope.evaluate(src, BUDGET.test) as (...a: unknown[]) => Promise<void>;
      scope.arm(BUDGET.test);
      await scope.drive(
        fn(scope.stdout, testHelpers.assert, testHelpers.assertEqual, testHelpers.assertClose, testHelpers.assertRejects, testHelpers.assertThrows, sandbox.controls),
        "This check",
      );
      if (sandbox.uncaught.length > uncaughtBefore) {
        const err = sandbox.uncaught[uncaughtBefore];
        throw new Error(`a timer callback threw an error: ${err instanceof Error ? `${err.name}: ${err.message}` : inspect(err)}`);
      }
      results.push({ testId: t.id, description: t.description, passed: true });
    } catch (err) {
      results.push({ testId: t.id, description: t.description, passed: false, error: describeFailure(err) });
    } finally {
      sandbox.scheduler.cancelAll(keep);
    }
  }
  return results;
}

export { ASYNC_BUDGET };
