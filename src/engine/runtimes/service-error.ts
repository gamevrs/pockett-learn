/**
 * Failures that are not the learner's fault: the code runner is busy or down, the network dropped, a
 * request hung, or a language engine (Python, SQLite) could not be downloaded. Runtimes throw these
 * instead of a plain Error so the UI can show a calm "try again" state rather than a red code error.
 */

export type ServiceIssueKind =
  /** HTTP 429: too many people (or too many runs from this browser) at once. May carry a Retry-After. */
  | "busy"
  /** HTTP 5xx or the runner switched off. */
  | "unavailable"
  /** The request never reached the runner (offline, DNS, blocked). */
  | "offline"
  /** The runner took longer than the client allows. */
  | "timeout"
  /** The language engine itself (Pyodide, sql.js) failed to download or start. */
  | "engine"
  /** The server refused the request outright (for example "program too large"): its own message is shown, no retry. */
  | "rejected";

export class ServiceError extends Error {
  readonly kind: ServiceIssueKind;
  /** Seconds the server asked us to wait before retrying. */
  readonly retryAfter: number | null;
  /** Server-provided text, only used for "rejected". */
  readonly detail: string | null;

  constructor(kind: ServiceIssueKind, options: { retryAfter?: number | null; detail?: string | null; message?: string } = {}) {
    // anything that prints err.message (for example the Foundations lesson player) still shows calm, plain words
    super(options.message ?? options.detail ?? SERVICE_COPY[kind].body);
    this.name = "ServiceError";
    this.kind = kind;
    this.retryAfter = options.retryAfter ?? null;
    this.detail = options.detail ?? null;
  }
}

export function isServiceError(err: unknown): err is ServiceError {
  return err instanceof ServiceError;
}

/** Thrown when the learner pressed Cancel; the UI treats it as "nothing went wrong". */
export class RunCancelled extends Error {
  constructor() {
    super("Run cancelled");
    this.name = "RunCancelled";
  }
}

export function isRunCancelled(err: unknown): err is RunCancelled {
  return err instanceof RunCancelled;
}

/** What the UI stores: plain data, no Error object. */
export interface ServiceIssue {
  kind: ServiceIssueKind;
  retryAfter: number | null;
  detail: string | null;
  /** When the issue happened, so a Retry-After countdown can be computed. */
  at: number;
}

export function toIssue(err: ServiceError): ServiceIssue {
  return { kind: err.kind, retryAfter: err.retryAfter, detail: err.detail, at: Date.now() };
}

export const SERVICE_COPY: Record<ServiceIssueKind, { title: string; body: string }> = {
  busy: { title: "Busy right now", body: "Lots of people are running code right now. Your code is fine. Try again in a few seconds." },
  unavailable: { title: "Can't run code right now", body: "Running this language isn't available for a moment. Your code is fine. Try again in a moment." },
  offline: { title: "You seem to be offline", body: "Your connection seems to be offline. Your code is fine and still saved. Check your connection, then try again." },
  timeout: { title: "That took too long", body: "We didn't get an answer in time. That's on our side, not your code. Try again." },
  engine: { title: "This language didn't load", body: "Something needed to run this language couldn't be downloaded. This is usually a connection problem. Your code is fine." },
  rejected: { title: "This couldn't be run", body: "The service turned this request down." },
};
