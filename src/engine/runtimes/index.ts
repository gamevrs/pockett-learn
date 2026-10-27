import type { LanguageId } from "../types";
import { framedRuntime } from "../frame/client";
import { usesCodeFrame } from "../frame/protocol";
import type { Runtime } from "./types";

export { ServiceError, RunCancelled, isServiceError, isRunCancelled } from "./service-error";
export { useRuntimeState } from "./status";
export type { GradeOutcome, RunOptions, RunOutcome, Runtime, StatusListener } from "./types";

/**
 * Runtime registry. Each runtime is a separate chunk, so a Python learner never downloads the
 * JavaScript parser or SQLite, and vice versa.
 */
const loaders: Record<LanguageId, () => Promise<Runtime>> = {
  python: () => import("./python").then((m) => m.pythonRuntime),
  javascript: () => import("./javascript").then((m) => m.javascriptRuntime),
  sql: () => import("./sql").then((m) => m.sqlRuntime),
  csharp: () => import("./remote").then((m) => m.remoteRuntime("csharp")),
  cpp: () => import("./remote").then((m) => m.remoteRuntime("cpp")),
  go: () => import("./remote").then((m) => m.remoteRuntime("go")),
  rust: () => import("./remote").then((m) => m.remoteRuntime("rust")),
};

const cache = new Map<LanguageId, Promise<Runtime>>();

/** Set by the code frame itself, the one place learner Python and JavaScript actually run. */
let insideCodeFrame = false;
export function markInsideCodeFrame() {
  insideCodeFrame = true;
}

/**
 * The runtime that really executes a language in THIS page. Only the code frame (and Node scripts) use it:
 * learner Python and JavaScript must never execute in the signed-in site's own page.
 */
export function loadLocalRuntime(language: LanguageId): Promise<Runtime> {
  let p = cache.get(language);
  if (!p) {
    p = loaders[language]().catch((err) => {
      cache.delete(language);
      throw err;
    });
    cache.set(language, p);
  }
  return p;
}

/** The runtime for a language. In the site, Python and JavaScript run in the code frame on another origin. */
export function loadRuntime(language: LanguageId): Promise<Runtime> {
  if (!insideCodeFrame && typeof window !== "undefined" && usesCodeFrame(language)) return Promise.resolve(framedRuntime(language));
  return loadLocalRuntime(language);
}

/** Warm a language up in the background (engine download, parser chunk). */
export function preloadRuntime(language: LanguageId, eager = false) {
  void loadRuntime(language)
    .then((r) => r.preload(eager))
    .catch(() => {});
}
