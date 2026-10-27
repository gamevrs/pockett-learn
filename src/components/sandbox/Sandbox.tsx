"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Play, RotateCcw, Terminal } from "lucide-react";
import type { LanguageId, RunError } from "@/engine/types";
import { LANGUAGES } from "@/engine/languages";
import { isServiceError, loadRuntime, preloadRuntime, useRuntimeState } from "@/engine/runtimes";
import { getRuntimeState, needsEngineDownload } from "@/engine/runtimes/status";
import { CodeEditor } from "@/components/workspace/CodeEditor";
import { EditorFrame } from "@/components/workspace/EditorFrame";
import { ServiceNotice } from "@/components/workspace/ServiceNotice";
import { consoleEmptyText } from "@/components/workspace/console-hint";
import { useHydrated } from "@/lib/hooks";
import { useShortcuts } from "@/lib/ui/platform";

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
  const [ranOnce, setRanOnce] = useState(false);
  const busy = useRef(false);
  const info = LANGUAGES[language];
  const keys = useShortcuts();
  const engine = useRuntimeState(language);
  const engineFailed = needsEngineDownload(language) && engine.phase === "failed";
  const engineLoading = needsEngineDownload(language) && engine.phase === "loading";

  // Start downloading the engine the moment the sandbox opens (or the language changes), not on an idle moment,
  // so the first Run is usually instant and otherwise shows real progress.
  useEffect(() => {
    preloadRuntime(language, true);
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
    setRanOnce(false);
  };

  const run = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    setRunning(true);
    // show something the instant Run is pressed: real progress when the engine is still downloading
    setStatus(getRuntimeState(language).phase === "ready" || !needsEngineDownload(language) ? "Running your code…" : `Starting ${LANGUAGES[language].label}…`);
    try {
      const rt = await loadRuntime(language);
      const res = await rt.run(code, { onStatus: setStatus, setup: language === "sql" ? SQL_SETUP : undefined });
      res.program?.dispose();
      setOut(res.stdout);
      setError(res.error);
      setMs(res.durationMs);
      setRanOnce(true);
    } catch (e) {
      // a download that failed is shown by the engine notice (with Retry), not as a code error
      if (!isServiceError(e)) setError({ type: "EngineError", message: (e as Error).message, line: null });
    } finally {
      busy.current = false;
      setRunning(false);
    }
  }, [code, language]);

  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
      <p className="eyebrow">Sandbox</p>
      <h1 className="font-display mt-2 text-[2.25rem] sm:text-[2.75rem]">Code sandbox</h1>
      <p className="mt-3 max-w-xl text-ink-2">No lessons, no tests. Just you and a real engine.</p>

      <div className="mt-6 flex flex-wrap gap-2" role="group" aria-label="Language">
        {SANDBOX_LANGUAGES.map((id) => (
          <button
            key={id}
            onClick={() => switchTo(id)}
            aria-pressed={language === id}
            className={`inline-flex h-10 items-center rounded-full border px-3.5 text-sm transition-colors sm:h-9 ${
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
              <button
                className="btn btn-sm btn-primary"
                onClick={() => void run()}
                disabled={running || engineFailed}
                title={engineFailed ? `${info.label} couldn't load. Use Retry in the Output panel.` : `Run your code (${keys.runText})`}
                data-testid="sandbox-run"
              >
                <Play className="h-3.5 w-3.5" fill="currentColor" /> {running ? "Running…" : "Run"}
              </button>
            </div>
          </div>
          <div className="min-h-0 flex-1">
            <EditorFrame value={code} onChange={setCode}>
              <CodeEditor
                value={code}
                onChange={setCode}
                onRun={() => void run()}
                onSubmit={() => void run()}
                language={info.monaco}
                context={language === "sql" ? SQL_SETUP : undefined}
                errorLine={error?.line ?? null}
                errorMessage={error ? `${error.type}: ${error.message}` : undefined}
                revealKey={`sandbox-${language}`}
              />
            </EditorFrame>
          </div>
        </div>

        <div className="card flex h-[520px] flex-col overflow-hidden">
          <div className="flex h-12 shrink-0 items-center justify-between border-b border-line px-4">
            <span className="flex items-center gap-2 text-xs font-medium">
              <Terminal className="h-4 w-4" /> Output
            </span>
            <span className="text-xs text-ink-3" role="status" data-testid="sandbox-status">
              {running ? status : engineLoading ? engine.message || `Starting ${info.label}…` : ms !== null ? `${ms} ms · ${info.engine}` : info.engine}
            </span>
          </div>
          <div className="min-h-0 flex-1 overflow-auto p-4 font-mono text-[13px] leading-relaxed">
            {engineFailed && (
              <ServiceNotice
                issue={{ kind: "engine", retryAfter: null, detail: null, at: 0 }}
                onRetry={() => preloadRuntime(language, true)}
                engineName={info.label}
                className="mb-3"
              />
            )}
            {(running || engineLoading) && !out && !error && (
              <p className="flex items-center gap-2 font-sans text-sm text-ink-2" data-testid="sandbox-progress">
                <span className="h-3 w-3 shrink-0 animate-spin rounded-full border-2 border-line border-t-brand" />
                {running ? status : engine.message || `Starting ${info.label}…`}
                {language === "python" && engine.phase !== "ready" && <span className="text-ink-3">(the first run downloads Python, about 5 to 10 seconds)</span>}
              </p>
            )}
            {error && (
              <p className="mb-3 rounded-lg border border-bad/30 bg-bad/[0.06] p-3 font-medium text-bad">
                {error.line ? `Line ${error.line} · ` : ""}
                {error.type}: {error.message}
              </p>
            )}
            {out ? (
              <pre className="whitespace-pre-wrap">{out}</pre>
            ) : (
              !error && !engineFailed && !running && !engineLoading && <p className="text-ink-3">{consoleEmptyText(language, "sandbox", ranOnce)}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
