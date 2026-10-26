import type { LanguageId } from "../types";
import type { Runtime } from "./types";

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

export function loadRuntime(language: LanguageId): Promise<Runtime> {
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

/** Warm a language up in the background (engine download, parser chunk). */
export function preloadRuntime(language: LanguageId) {
  void loadRuntime(language)
    .then((r) => r.preload())
    .catch(() => {});
}
