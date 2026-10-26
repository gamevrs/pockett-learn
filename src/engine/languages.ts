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
  /** Where code executes. "server" languages need the remote runner (RUNNER_SNAPSHOT_ID, see /api/run). */
  runsIn: "browser" | "server";
  /** One line for course cards. */
  engine: string;
  /** One line about the language, shown at the top of its path on the projects page. */
  blurb: string;
}

export const LANGUAGES: Record<LanguageId, LanguageInfo> = {
  python: { id: "python", label: "Python", fileName: "main.py", monaco: "python", comment: "#", runsIn: "browser", engine: "Python 3.12",
    blurb: "Readable, versatile and the best first language. From your first loop to a REST API." },
  javascript: { id: "javascript", label: "JavaScript", fileName: "main.js", monaco: "javascript", comment: "//", runsIn: "browser", engine: "JavaScript",
    blurb: "The language of the web. Learn it from variables to async code and APIs." },
  sql: { id: "sql", label: "SQL", fileName: "query.sql", monaco: "sql", comment: "--", runsIn: "browser", engine: "SQLite",
    blurb: "The language of data. Ask databases questions, then design them well." },
  csharp: { id: "csharp", label: "C#", fileName: "Program.cs", monaco: "csharp", comment: "//", runsIn: "server", engine: "C# · .NET 10",
    blurb: "Typed, modern and everywhere, from games to backends." },
  cpp: { id: "cpp", label: "C++", fileName: "main.cpp", monaco: "cpp", comment: "//", runsIn: "server", engine: "C++ (g++)",
    blurb: "Fast and close to the machine." },
  go: { id: "go", label: "Go", fileName: "main.go", monaco: "go", comment: "//", runsIn: "server", engine: "Go",
    blurb: "Simple, concurrent and built for servers." },
};

export function languageInfo(id: LanguageId | undefined): LanguageInfo {
  return LANGUAGES[id ?? "python"];
}
