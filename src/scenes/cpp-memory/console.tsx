"use client";

import React, { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { compileAdvice, parseDiagnostics, runtimeAdvice } from "../cpp-basics/data";
import { Chip } from "../cpp-basics/ui";
import { outputLines, type BuildError, type Lab } from "./data";

/**
 * The lab console: what the program printed, the plain values it sent to the board, and the
 * compiler's message (with its line number and a plain-language hint) when the build fails.
 */

export function ErrorBlock({ error }: { error: BuildError }) {
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

function safeJson(v: unknown): string {
  try {
    const s = JSON.stringify(v);
    return s === undefined ? String(v) : s;
  } catch {
    return String(v);
  }
}

export function LabConsole({ lab, built, interactive, className = "" }: { lab: Lab; built: boolean; interactive: boolean; className?: string }) {
  const [tab, setTab] = useState<"output" | "data">("output");
  const lines = outputLines(lab.stdout);
  const error = lab.error;
  const compileFailed = error?.type === "CompileError";
  const status = !built ? "Idle" : error ? (compileFailed ? "Build failed" : "Crashed") : "Build OK";
  const statusTone = !built ? "text-white/45" : error ? "hud-danger border-[#f87171]/40" : "hud-accent";
  const scalarKeys = Object.keys(lab.scalars);
  return (
    <section data-panel="pv-console" className={`hud-panel min-w-0 px-3 py-2.5 ${className}`}>
      <header className="mb-2 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1.5">
        <span className="shrink-0 text-[#c5ee8a]">
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <polyline points="4 17 10 11 4 5" />
            <line x1="12" x2="20" y1="19" y2="19" />
          </svg>
        </span>
        <h3 className="hud-title min-w-0 flex-1 truncate">Lab console</h3>
        <span className={`hud-tag shrink-0 ${statusTone}`}>{status}</span>
      </header>
      {error && <ErrorBlock error={error} />}
      <div className="mb-1.5 flex gap-1.5" role="tablist" aria-label="Console view">
        <Chip active={tab === "output"} onClick={() => setTab("output")}>
          Output{lines.length > 0 ? ` · ${lines.length}` : ""}
        </Chip>
        <Chip active={tab === "data"} onClick={() => setTab("data")}>
          Photos &amp; data{lab.shots.length + scalarKeys.length > 0 ? ` · ${lab.shots.length + scalarKeys.length}` : ""}
        </Chip>
      </div>
      {tab === "output" ? (
        <div className={`hud-log rounded-md bg-black/40 px-2 py-1.5 ${interactive ? "max-h-56 overflow-auto" : "max-h-40 overflow-hidden"}`} role="log" aria-label="Program output">
          {!built ? (
            <p className="hud-muted">Press Run to build and run your program (a few seconds).</p>
          ) : lines.length === 0 ? (
            <p className="hud-muted">{error ? "Nothing was printed before the problem." : "The program ran but printed nothing. The photos you take with snap() still appear on the board."}</p>
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
          {lab.shots.length === 0 && scalarKeys.length === 0 ? (
            <p className="hud-muted">{built ? 'Nothing sent yet. Take a photo with peek("name", x); snap("caption");' : "Run your program to see what it sent to the board."}</p>
          ) : (
            <dl className="space-y-0.5">
              {lab.shots.map((s) => (
                <div key={s.index} className="flex min-w-0 gap-2">
                  <dt className="shrink-0 text-white/45">photo {s.index + 1}</dt>
                  <dd className="hud-accent min-w-0 flex-1 truncate" title={s.caption}>
                    {s.caption} · {s.entries.length} peeked
                  </dd>
                </div>
              ))}
              {lab.audit && (
                <div className="flex min-w-0 gap-2">
                  <dt className="shrink-0 text-white/45">audit</dt>
                  <dd className="hud-accent min-w-0 flex-1 truncate">
                    {lab.audit.counters.allocs} taken · {lab.audit.counters.frees} returned · {lab.audit.leakCount} left
                  </dd>
                </div>
              )}
              {scalarKeys.map((k) => (
                <div key={k} className="flex min-w-0 gap-2">
                  <dt className="shrink-0 text-white/45">{k}</dt>
                  <dd className="hud-accent min-w-0 flex-1 truncate" title={safeJson(lab.scalars[k])}>
                    {safeJson(lab.scalars[k])}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      )}
    </section>
  );
}
