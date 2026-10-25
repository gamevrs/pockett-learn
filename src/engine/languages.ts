import type { LanguageId } from "./types.ts";

/**
 * Everything the UI needs to know about a language, without loading its runtime.
 * Runtimes themselves live in src/engine/runtimes/ and are code-split (see runtimes/index.ts).
 */
export interface LanguageInfo {
  id: LanguageId;
  label: string;
  /** File name shown above the editor. */
  fileName: string;
  /** Monaco language id. */
  monaco: string;
  /** Line comment prefix, used for the "YOUR TURN" marker in starters. */
  comment: string;
  /** Where code executes. "server" languages need the remote runner (RUNNER_URL). */
  runsIn: "browser" | "server";
  /** One line for course cards. */
  engine: string;
}

export const LANGUAGES: Record<LanguageId, LanguageInfo> = {
  python: { id: "python", label: "Python", fileName: "main.py", monaco: "python", comment: "#", runsIn: "browser", engine: "Python 3.12 via WebAssembly" },
  javascript: { id: "javascript", label: "JavaScript", fileName: "main.js", monaco: "javascript", comment: "//", runsIn: "browser", engine: "Your browser's JavaScript engine" },
  sql: { id: "sql", label: "SQL", fileName: "query.sql", monaco: "sql", comment: "--", runsIn: "browser", engine: "SQLite via WebAssembly" },
  csharp: { id: "csharp", label: "C#", fileName: "Program.cs", monaco: "csharp", comment: "//", runsIn: "server", engine: ".NET on the pockett runner" },
  cpp: { id: "cpp", label: "C++", fileName: "main.cpp", monaco: "cpp", comment: "//", runsIn: "server", engine: "g++ on the pockett runner" },
  go: { id: "go", label: "Go", fileName: "main.go", monaco: "go", comment: "//", runsIn: "server", engine: "Go on the pockett runner" },
};

export function languageInfo(id: LanguageId | undefined): LanguageInfo {
  return LANGUAGES[id ?? "python"];
}
