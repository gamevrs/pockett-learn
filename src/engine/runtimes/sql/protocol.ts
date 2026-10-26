import type { SqlValue } from "sql.js";
import type { RunError, TestCase, TestResult } from "../../types.ts";
import type { ResultSet, TableInfo } from "./engine.ts";

/** Messages between the SQL runtime (main thread) and its Web Worker. Types only. */

export type WorkerRequest =
  | { id: number; kind: "run"; source: string; setup?: string }
  | { id: number; kind: "grade"; source: string; setup?: string; tests: TestCase[] };

export interface RunPayload {
  stdout: string;
  error: RunError | null;
  tables: TableInfo[];
  results: ResultSet[];
  result: ResultSet | null;
  rows: Record<string, SqlValue>[];
}

export interface GradePayload {
  stdout: string;
  error: RunError | null;
  results: TestResult[];
}

export type WorkerResponse =
  | { kind: "ready" }
  | { kind: "init-error"; message: string }
  /** Sent just before each statement runs, so a timed-out job can say where it was stuck. */
  | { kind: "line"; id: number; line: number }
  | { kind: "run"; id: number; payload: RunPayload }
  | { kind: "grade"; id: number; payload: GradePayload }
  | { kind: "fail"; id: number; message: string };
