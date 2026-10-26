"use client";

import React, { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { compileAdvice, parseDiagnostics, runtimeAdvice, type BuildError } from "./data";
import { Chip, Ghost } from "./ui";

/**
 * The control console: everything the program printed, the values it sent to the board, and the
 * compiler's message (with its line number and a plain-language hint) when the build fails.
 */

function ErrorBlock({ error }: { error: BuildError }) {
  const compile = error.type === "CompileError";
  const diags = compile ? parseDiagnostics(error.message) : [];
  const main = diags.filter((d) => d.severity === "error");
  const advice = compile ? compileAdvice((main.length > 0 ? main : diags).map((d) => d.text)) : runtimeAdvice(error.message);
  const lines = compile ? [] : error.message.split("\n").filter((l) => l.trim().length > 0);
  return (
    <div role="alert" className="mb-2 rounded-md border border-[#f87171]/40 bg-[#2a0f0f]/70 px-2.5 py-2">
      <div className="mb-1.5 flex min-w-0 items-center gap-2">
        <AlertTriangle className="hud-danger h-3.5 w-3.5 shrink-0" aria-hidden />
        <span className="hud-title hud-danger min-w-0 flex-1 truncate">{compile ? "Build failed" : "The program crashed"}</span>
        {error.line !== null && <span className="hud-tag hud-danger shrink-0 border-[#f87171]/40">line {error.line}</span>}
      </div>
      {compile ? (
        <ul className="space-y-1.5">
          {diags.slice(0, 4).map((d, i) => (
            <li key={i} className="min-w-0">
              <p className="flex min-w-0 items-baseline gap-2 font-mono text-[11px] leading-snug text-[#fecaca]">
                {d.where && <span className="shrink-0 rounded bg-[#f87171]/15 px-1 text-[10px] text-[#fca5a5]">L{d.where}</span>}
                {d.severity !== "error" && <span className="shrink-0 text-[10px] uppercase text-[#fca5a5]/80">{d.severity}</span>}
                <span className="min-w-0 break-words">{d.text}</span>
              </p>
              {d.excerpt.length > 0 && <pre className="mt-0.5 overflow-hidden whitespace-pre-wrap break-words font-mono text-[10px] leading-snug text-white/55">{d.excerpt.join("\n")}</pre>}
            </li>
          ))}
        </ul>
      ) : (
        <pre className="max-h-24 overflow-auto whitespace-pre-wrap break-words font-mono text-[11px] leading-snug text-[#fecaca]">{lines.join("\n")}</pre>
      )}
      {advice && <p className="mt-1.5 border-t border-white/10 pt-1.5 text-[11px] leading-snug text-white/70">{advice}</p>}
      <p className="hud-muted mt-1 text-[10px]">Fix it in the editor and press Run again.</p>
    </div>
  );
}

function TerminalIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polyline points="4 17 10 11 4 5" />
      <line x1="12" x2="20" y1="19" y2="19" />
    </svg>
  );
}

function safeJson(v: unknown): string {
  try {
    const s = JSON.stringify(v);
    return s === undefined ? String(v) : s;
  } catch {
    return String(v);
  }
}

export function ConsolePanel({
  stdout,
  built,
  error,
  keys,
  live,
  interactive,
  focus,
  flash,
  locked,
  className = "",
}: {
  stdout: string;
  built: boolean;
  error: BuildError | null;
  /** key -> value pairs the program sent with scene("key", value) */
  keys: [string, unknown][];
  live: boolean;
  interactive: boolean;
  focus: boolean;
  flash: boolean;
  /** Console not unlocked yet: only the build result is shown */
  locked: boolean;
  className?: string;
}) {
  const [tab, setTab] = useState<"output" | "data">("output");
  const lines = stdout.split("\n");
  while (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();
  const compileFailed = error?.type === "CompileError";
  const status = !built ? "Idle" : error ? (compileFailed ? "Build failed" : "Crashed") : "Build OK";
  const statusTone = !built ? "text-white/45" : error ? "hud-danger border-[#f87171]/40" : "hud-accent";

  return (
    <section data-panel="rc-console" className={`hud-panel min-w-0 px-3 py-2.5 ${focus ? "border-[#c5ee8a]/35" : ""} ${flash ? "pop-in" : ""} ${className}`}>
      <header className="mb-2 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1.5">
        <span className="shrink-0 text-[#c5ee8a]">
          <TerminalIcon />
        </span>
        <h3 className="hud-title min-w-0 flex-1 truncate">Control console</h3>
        <span className={`hud-tag shrink-0 ${statusTone}`}>{status}</span>
      </header>

      {error && <ErrorBlock error={error} />}

      {locked ? (
        <div>
          <Ghost kind="console" />
          <p className="mt-2.5 truncate font-mono text-[10px] text-white/40">
            {focus ? <span className="hud-accent">Your code powers this · </span> : "Locked · "}
            std::cout &lt;&lt; …
          </p>
        </div>
      ) : (
        <>
          <div className="mb-1.5 flex gap-1.5" role="tablist" aria-label="Console view">
            <Chip active={tab === "output"} onClick={() => setTab("output")}>
              Output{lines.length > 0 ? ` · ${lines.length}` : ""}
            </Chip>
            <Chip active={tab === "data"} onClick={() => setTab("data")}>
              Scene data{keys.length > 0 ? ` · ${keys.length}` : ""}
            </Chip>
          </div>
          {tab === "output" ? (
            <div className={`hud-log rounded-md bg-black/40 px-2 py-1.5 ${interactive ? "max-h-56 overflow-auto" : "max-h-40 overflow-hidden"}`} role="log" aria-label="Program output">
              {!built ? (
                <p className="hud-muted">Press Run to build and run your program (a few seconds).</p>
              ) : lines.length === 0 ? (
                <p className="hud-muted">{error ? "Nothing was printed before the problem." : "The program ran but printed nothing."}</p>
              ) : (
                lines.map((l, i) => (
                  <div key={i} className="hud-log-line whitespace-pre-wrap break-words">
                    {l === "" ? " " : l}
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className={`rounded-md bg-black/40 px-2 py-1.5 font-mono text-[10.5px] leading-[1.5] ${interactive ? "max-h-56 overflow-auto" : "max-h-40 overflow-hidden"}`}>
              {keys.length === 0 ? (
                <p className="hud-muted">{live ? 'No values yet. Send one with scene("name", value);' : "Run your program to see what it sent to the board."}</p>
              ) : (
                <dl className="space-y-0.5">
                  {keys.map(([k, v]) => (
                    <div key={k} className="flex min-w-0 gap-2">
                      <dt className="shrink-0 text-white/45">{k}</dt>
                      <dd className="hud-accent min-w-0 flex-1 truncate" title={safeJson(v)}>
                        {safeJson(v)}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}
