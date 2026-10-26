import { createStaticProgram } from "../../program";
import type { RunError } from "../../types";
import { crashedResults, type Runtime, type StatusListener } from "../types";
import type { GradePayload, RunPayload, WorkerRequest, WorkerResponse } from "./protocol";

/**
 * SQLite (WebAssembly) runs in a dedicated Web Worker so a runaway query can't freeze the page.
 * Each run/grade has a wall-clock budget; past it the worker is terminated (a fresh one is started
 * for the next run) and the learner gets a TimeoutError instead of a hung tab.
 */

/** How long one run or grade may take, setup and checks included. */
const TIME_LIMIT_MS = 3000;

const TIMEOUT_MESSAGE = `Your query ran for too long (over ${TIME_LIMIT_MS / 1000} seconds) and was stopped. A recursive CTE may be missing its stop condition, or a join may be multiplying rows.`;

let workerPromise: Promise<Worker> | null = null;
let nextId = 0;
/** Jobs share one worker, so they take turns (a timeout must not discard somebody else's queued job). */
let queueTail: Promise<unknown> = Promise.resolve();

function spawnWorker(onStatus?: StatusListener): Promise<Worker> {
  onStatus?.("Getting ready…");
  const worker = new Worker(new URL("./worker.ts", import.meta.url));
  return new Promise<Worker>((resolve, reject) => {
    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      if (event.data.kind === "ready") {
        worker.onmessage = null;
        worker.onerror = null;
        resolve(worker);
      } else if (event.data.kind === "init-error") {
        worker.terminate();
        reject(new Error("Could not load SQL. Check your connection and try again."));
      }
    };
    worker.onerror = () => {
      worker.terminate();
      reject(new Error("Could not start SQL. Try reloading the page."));
    };
  });
}

function getWorker(onStatus?: StatusListener): Promise<Worker> {
  if (typeof window === "undefined" || typeof Worker === "undefined") return Promise.reject(new Error("SQL only runs in the browser"));
  if (!workerPromise) {
    const pending = spawnWorker(onStatus);
    workerPromise = pending;
    pending.catch(() => {
      if (workerPromise === pending) workerPromise = null;
    });
  }
  return workerPromise;
}

/** Kills a worker that is stuck and warms up a replacement for the next run. */
function retire(worker: Worker) {
  worker.terminate();
  workerPromise = null;
  void getWorker().catch(() => {});
}

type JobResult<R> = { timedOut: false; response: R } | { timedOut: true; line: number | null };
type Job<K extends "run" | "grade"> = Extract<WorkerResponse, { kind: K }>;

function execute<K extends "run" | "grade">(request: Omit<Extract<WorkerRequest, { kind: K }>, "id">, onStatus: StatusListener | undefined, runningMessage: string): Promise<JobResult<Job<K>>> {
  const job = async (): Promise<JobResult<Job<K>>> => {
    const worker = await getWorker(onStatus);
    onStatus?.(runningMessage);
    const id = ++nextId;
    return new Promise((resolve, reject) => {
      let line: number | null = null;
      const timer = setTimeout(() => {
        retire(worker);
        resolve({ timedOut: true, line });
      }, TIME_LIMIT_MS);
      worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
        const msg = event.data;
        if (msg.kind === "ready" || msg.kind === "init-error" || msg.id !== id) return;
        if (msg.kind === "line") {
          line = msg.line;
          return;
        }
        clearTimeout(timer);
        worker.onmessage = null;
        worker.onerror = null;
        if (msg.kind === "fail") reject(new Error(msg.message));
        else resolve({ timedOut: false, response: msg as Job<K> });
      };
      worker.onerror = (event) => {
        clearTimeout(timer);
        retire(worker);
        reject(new Error(event.message || "SQL stopped unexpectedly. Run it again."));
      };
      worker.postMessage({ ...request, id } as WorkerRequest);
    });
  };
  const result = queueTail.then(job);
  queueTail = result.catch(() => {});
  return result;
}

function timeoutError(line: number | null): RunError {
  return { type: "TimeoutError", message: TIMEOUT_MESSAGE, line };
}

export const sqlRuntime: Runtime = {
  language: "sql",
  preload() {
    if (typeof window === "undefined") return;
    setTimeout(() => void getWorker().catch(() => {}), 800);
  },
  async run(source, options) {
    const started = performance.now();
    const outcome = await execute<"run">({ kind: "run", source, setup: options?.setup }, options?.onStatus, "Running your query…");
    const durationMs = Math.round(performance.now() - started);
    if (outcome.timedOut) return { stdout: "", error: timeoutError(outcome.line), durationMs, program: null };
    const p: RunPayload = outcome.response.payload;
    // Scenes read the outcome as plain data: the tables, every result set, and the last one.
    const program = createStaticProgram({
      stdout: p.stdout,
      vars: { tables: p.tables, results: p.results, result: p.result, rows: p.rows, error: p.error },
    });
    return { stdout: p.stdout, error: p.error, durationMs, program: p.error ? null : program };
  },
  async grade(source, tests, options) {
    const started = performance.now();
    const outcome = await execute<"grade">({ kind: "grade", source, setup: options?.setup, tests }, options?.onStatus, "Checking your work…");
    const durationMs = Math.round(performance.now() - started);
    if (outcome.timedOut) return { stdout: "", error: timeoutError(outcome.line), results: crashedResults(tests), allPassed: false, durationMs };
    const p: GradePayload = outcome.response.payload;
    if (p.error) return { stdout: p.stdout, error: p.error, results: crashedResults(tests), allPassed: false, durationMs };
    return { stdout: p.stdout, error: null, results: p.results, allPassed: p.results.length > 0 && p.results.every((r) => r.passed), durationMs };
  },
};
