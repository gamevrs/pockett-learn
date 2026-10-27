"use client";

import React, { useEffect, useRef, useState } from "react";
import { RotateCw, Type } from "lucide-react";

/**
 * Wraps <CodeEditor>. Monaco is fetched from a CDN at runtime; when that is blocked or very slow the editor
 * component just shows "loading editor…" forever. This watches for the editor actually appearing and, if it
 * hasn't after `slowAfterMs`, says what happened and offers Retry (a reload; drafts are autosaved) or a plain
 * text box so the learner can keep working. If Monaco shows up late the notice goes away by itself.
 *
 * (The CodeEditor itself is untouched: nothing else is needed for this to work.)
 */
export function EditorFrame({
  value,
  onChange,
  children,
  slowAfterMs = 12_000,
}: {
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
  slowAfterMs?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [slow, setSlow] = useState(false);
  const [basic, setBasic] = useState(false);

  useEffect(() => {
    if (loaded) return;
    const started = Date.now();
    const id = setInterval(() => {
      if (ref.current?.querySelector(".monaco-editor")) {
        setLoaded(true);
        setSlow(false);
      } else if (Date.now() - started >= slowAfterMs) {
        setSlow(true);
      }
    }, 500);
    return () => clearInterval(id);
  }, [loaded, slowAfterMs]);

  if (basic) {
    return (
      <div className="flex h-full flex-col">
        <p className="shrink-0 border-b border-line bg-surface-2 px-3 py-1.5 text-xs text-ink-3">Basic editor: the code editor couldn&apos;t load. Reload the page to try it again.</p>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          spellCheck={false}
          aria-label="Code"
          data-testid="basic-editor"
          className="min-h-0 flex-1 resize-none bg-surface p-3 font-mono text-[13px] leading-relaxed text-ink outline-none"
        />
      </div>
    );
  }

  return (
    <div ref={ref} className="relative h-full">
      {children}
      {slow && !loaded && (
        <div role="status" data-testid="editor-slow" className="absolute inset-0 z-10 grid place-items-center bg-surface p-4 text-center">
          <div className="max-w-sm">
            <p className="text-sm font-semibold">The code editor is taking a while</p>
            <p className="mt-1.5 text-xs leading-relaxed text-ink-2">
              It loads from a CDN that may be blocked or slow on this connection. Your code is safe. Wait a little longer, retry, or use a plain text box for now.
            </p>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              <button type="button" className="btn btn-sm btn-primary" onClick={() => window.location.reload()} data-testid="editor-retry">
                <RotateCw className="h-3.5 w-3.5" /> Retry
              </button>
              <button type="button" className="btn btn-sm" onClick={() => setBasic(true)} data-testid="editor-basic">
                <Type className="h-3.5 w-3.5" /> Use basic editor
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
