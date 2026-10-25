"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Play, RotateCcw, Terminal } from "lucide-react";
import type { LanguageId, RunError } from "@/engine/types";
import { LANGUAGES } from "@/engine/languages";
import { loadRuntime, preloadRuntime } from "@/engine/runtimes";
import { CodeEditor } from "@/components/workspace/CodeEditor";
import { useHydrated } from "@/lib/hooks";

type SandboxLanguage = Extract<LanguageId, "python" | "javascript" | "sql">;
const SANDBOX_LANGUAGES: SandboxLanguage[] = ["python", "javascript", "sql"];
const LANG_KEY = "pockett_sandbox_language";
const codeKey = (lang: SandboxLanguage) => (lang === "python" ? "pockett_sandbox_code" : `pockett_sandbox_code_${lang}`);

const STARTERS: Record<SandboxLanguage, string> = {
  python: `# Anything goes here. Press Run (Ctrl/Cmd + Enter).
names = ["Ada", "Grace", "Linus"]

for name in names:
    print(f"Hello, {name}!")

squares = [n * n for n in range(1, 6)]
print("Squares:", squares)
`,
  javascript: `// Anything goes here. Press Run (Ctrl/Cmd + Enter).
const names = ["Ada", "Grace", "Linus"];

for (const name of names) {
  console.log(\`Hello, \${name}!\`);
}

const squares = [1, 2, 3, 4, 5].map((n) => n * n);
console.log("Squares:", squares);
`,
  sql: `-- A small "planets" table is ready to query. Press Run (Ctrl/Cmd + Enter).
SELECT name, moons, ROUND(day_hours / 24.0, 1) AS day_in_earth_days
FROM planets
ORDER BY moons DESC;
`,
};

/** Sample data for the SQL sandbox. */
const SQL_SETUP = `CREATE TABLE planets (name TEXT PRIMARY KEY, moons INTEGER, day_hours REAL, rings INTEGER);
INSERT INTO planets VALUES
  ('Mercury', 0, 4222.6, 0), ('Venus', 0, 2802.0, 0), ('Earth', 1, 24.0, 0), ('Mars', 2, 24.7, 0),
  ('Jupiter', 95, 9.9, 1), ('Saturn', 146, 10.7, 1), ('Uranus', 28, 17.2, 1), ('Neptune', 16, 16.1, 1);`;

function read(key: string, fallback: string) {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

export function Sandbox() {
  const hydrated = useHydrated();
  if (!hydrated) return <div className="grid min-h-[60vh] place-items-center text-sm text-ink-3">Loading sandbox…</div>;
  return <SandboxInner />;
}

function SandboxInner() {
  const [language, setLanguage] = useState<SandboxLanguage>(() => {
    const saved = read(LANG_KEY, "python");
    return (SANDBOX_LANGUAGES as string[]).includes(saved) ? (saved as SandboxLanguage) : "python";
  });
  const [code, setCode] = useState(() => read(codeKey(language), STARTERS[language]));
  const [out, setOut] = useState("");
  const [error, setError] = useState<RunError | null>(null);
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState("");
  const [ms, setMs] = useState<number | null>(null);
  const busy = useRef(false);
  const info = LANGUAGES[language];

  useEffect(() => {
    preloadRuntime(language);
  }, [language]);

  useEffect(() => {
    const t = setTimeout(() => {
      try {
        localStorage.setItem(codeKey(language), code);
        localStorage.setItem(LANG_KEY, language);
      } catch {
        /* storage unavailable */
      }
    }, 400);
    return () => clearTimeout(t);
  }, [code, language]);

  const switchTo = (next: SandboxLanguage) => {
    if (next === language) return;
    try {
      localStorage.setItem(codeKey(language), code);
    } catch {
      /* storage unavailable */
    }
    setLanguage(next);
    setCode(read(codeKey(next), STARTERS[next]));
    setOut("");
    setError(null);
    setMs(null);
  };

  const run = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    setRunning(true);
    try {
      const rt = await loadRuntime(language);
      const res = await rt.run(code, { onStatus: setStatus, setup: language === "sql" ? SQL_SETUP : undefined });
      res.program?.dispose();
      setOut(res.stdout);
      setError(res.error);
      setMs(res.durationMs);
    } catch (e) {
      setError({ type: "EngineError", message: (e as Error).message, line: null });
    } finally {
      busy.current = false;
      setRunning(false);
    }
  }, [code, language]);

  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
      <p className="eyebrow">Sandbox</p>
      <h1 className="font-display mt-2 text-[2.25rem] sm:text-[2.75rem]">Code sandbox</h1>
      <p className="mt-3 max-w-xl text-ink-2">No lessons, no tests. Just you and a real engine. Everything stays in your browser.</p>

      <div className="mt-6 flex flex-wrap gap-2" role="group" aria-label="Language">
        {SANDBOX_LANGUAGES.map((id) => (
          <button
            key={id}
            onClick={() => switchTo(id)}
            aria-pressed={language === id}
            className={`inline-flex h-9 items-center rounded-full border px-3.5 text-sm transition-colors ${
              language === id ? "border-transparent bg-ink text-bg" : "border-line bg-surface text-ink-2 hover:text-ink"
            }`}
          >
            {LANGUAGES[id].label}
          </button>
        ))}
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div className="card flex h-[520px] flex-col overflow-hidden">
          <div className="flex h-12 shrink-0 items-center justify-between border-b border-line px-3">
            <span className="font-mono text-xs font-medium">{info.fileName.replace(/^(main|query|Program)/, "sandbox")}</span>
            <div className="flex items-center gap-2">
              <button className="btn btn-sm btn-ghost" onClick={() => setCode(STARTERS[language])}>
                <RotateCcw className="h-3.5 w-3.5" /> Reset
              </button>
              <button className="btn btn-sm btn-primary" onClick={() => void run()} disabled={running}>
                <Play className="h-3.5 w-3.5" fill="currentColor" /> Run
              </button>
            </div>
          </div>
          <div className="min-h-0 flex-1">
            <CodeEditor
              value={code}
              onChange={setCode}
              onRun={() => void run()}
              onSubmit={() => void run()}
              language={info.monaco}
              errorLine={error?.line ?? null}
              errorMessage={error ? `${error.type}: ${error.message}` : undefined}
              revealKey={`sandbox-${language}`}
            />
          </div>
        </div>

        <div className="card flex h-[520px] flex-col overflow-hidden">
          <div className="flex h-12 shrink-0 items-center justify-between border-b border-line px-4">
            <span className="flex items-center gap-2 text-xs font-medium">
              <Terminal className="h-4 w-4" /> Output
            </span>
            <span className="text-xs text-ink-3">{running ? status : ms !== null ? `${ms} ms · ${info.engine}` : info.engine}</span>
          </div>
          <div className="min-h-0 flex-1 overflow-auto p-4 font-mono text-[13px] leading-relaxed">
            {error && (
              <p className="mb-3 rounded-lg border border-bad/30 bg-bad/[0.06] p-3 font-medium text-bad">
                {error.line ? `Line ${error.line} · ` : ""}
                {error.type}: {error.message}
              </p>
            )}
            {out ? <pre className="whitespace-pre-wrap">{out}</pre> : !error && <p className="text-ink-3">Output appears here.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
