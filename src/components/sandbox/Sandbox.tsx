"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Play, RotateCcw, Terminal } from "lucide-react";
import type { RunError } from "@/engine/types";
import { preloadPython, runProgram } from "@/engine/python/host";
import { CodeEditor } from "@/components/workspace/CodeEditor";
import { useHydrated } from "@/lib/hooks";

const KEY = "pockett_sandbox_code";
const STARTER = `# Anything goes here. Press Run (Ctrl/Cmd + Enter).
names = ["Ada", "Grace", "Linus"]

for name in names:
    print(f"Hello, {name}!")

squares = [n * n for n in range(1, 6)]
print("Squares:", squares)
`;

export function Sandbox() {
  const hydrated = useHydrated();
  if (!hydrated) return <div className="grid min-h-[60vh] place-items-center text-sm text-ink-3">Loading sandbox…</div>;
  return <SandboxInner />;
}

function SandboxInner() {
  const [code, setCode] = useState(() => {
    try {
      return localStorage.getItem(KEY) ?? STARTER;
    } catch {
      return STARTER;
    }
  });
  const [out, setOut] = useState("");
  const [error, setError] = useState<RunError | null>(null);
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState("");
  const [ms, setMs] = useState<number | null>(null);
  const busy = useRef(false);

  useEffect(() => {
    preloadPython();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      try {
        localStorage.setItem(KEY, code);
      } catch {
        /* storage unavailable */
      }
    }, 400);
    return () => clearTimeout(t);
  }, [code]);

  const run = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    setRunning(true);
    try {
      const res = await runProgram(code, setStatus);
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
  }, [code]);

  return (
    <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-10 sm:px-6">
      <p className="eyebrow">Sandbox</p>
      <h1 className="font-display mt-2 text-4xl sm:text-5xl">Free-play Python.</h1>
      <p className="mt-3 max-w-xl text-ink-2">No lessons, no tests. Just you and an interpreter. Everything stays in your browser.</p>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <div className="card flex h-[520px] flex-col overflow-hidden">
          <div className="flex h-12 shrink-0 items-center justify-between border-b border-line px-3">
            <span className="font-mono text-xs font-bold">sandbox.py</span>
            <div className="flex items-center gap-2">
              <button className="btn btn-sm btn-ghost" onClick={() => setCode(STARTER)}>
                <RotateCcw className="h-3.5 w-3.5" /> Reset
              </button>
              <button className="btn btn-sm btn-primary" onClick={() => void run()} disabled={running}>
                <Play className="h-3.5 w-3.5" fill="currentColor" /> Run
              </button>
            </div>
          </div>
          <div className="min-h-0 flex-1">
            <CodeEditor value={code} onChange={setCode} onRun={() => void run()} errorLine={error?.line ?? null} errorMessage={error ? `${error.type}: ${error.message}` : undefined} revealKey="sandbox" />
          </div>
        </div>

        <div className="card flex h-[520px] flex-col overflow-hidden">
          <div className="flex h-12 shrink-0 items-center justify-between border-b border-line px-4">
            <span className="flex items-center gap-2 text-xs font-bold"><Terminal className="h-4 w-4" /> Output</span>
            <span className="text-xs text-ink-3">{running ? status : ms !== null ? `${ms} ms` : ""}</span>
          </div>
          <div className="min-h-0 flex-1 overflow-auto p-4 font-mono text-[13px] leading-relaxed">
            {error && (
              <p className="mb-3 rounded-xl border border-bad/40 bg-bad/10 p-3 font-bold text-bad">
                {error.line ? `Line ${error.line} · ` : ""}{error.type}: {error.message}
              </p>
            )}
            {out ? <pre className="whitespace-pre-wrap">{out}</pre> : !error && <p className="text-ink-3">Output appears here.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
