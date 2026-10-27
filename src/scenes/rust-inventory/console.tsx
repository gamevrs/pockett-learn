"use client";

import React, { useState } from "react";
import { ArrowRight, TriangleAlert } from "lucide-react";
import { FeatureIcon } from "@/components/ui/icons";
import { explainError, outputLines, type BuildError, type DiagramKind } from "./data";
import { Chip } from "./ui";

/**
 * The console (stdout and the Scene data tab) and the compiler panel that explains a failed build:
 * rustc code, message, line, what it means, usual fixes and a tiny diagram for the ideas this
 * course is about (lifetimes, borrows, paths, closures, traits).
 */

function ErrorDiagram({ kind }: { kind: DiagramKind }) {
  const t = { fill: "rgba(255,255,255,0.78)", fontSize: 9.5, fontFamily: "var(--font-mono), monospace" } as const;
  const box = { fill: "rgba(255,255,255,0.05)", stroke: "rgba(255,255,255,0.25)", rx: 5 } as const;
  return (
    <svg viewBox="0 0 320 78" className="my-2 h-[78px] w-full" role="img" aria-label={`${kind} diagram`}>
      <defs>
        <marker id="cp-arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
          <path d="M0 0 L8 4 L0 8 Z" fill="#8aa4ff" />
        </marker>
      </defs>
      {kind === "scope" && (
        <g>
          <rect x="6" y="6" width="308" height="66" {...box} strokeDasharray="3 3" />
          <text x="12" y="19" {...t} opacity=".7">outer scope: owner</text>
          <rect x="150" y="26" width="120" height="40" {...box} stroke="#f87171" />
          <text x="156" y="39" {...t} fill="#fecaca">inner block ends</text>
          <path d="M270 52 H298" stroke="#f87171" strokeWidth="1.5" />
          <path d="M40 46 H300" stroke="#8aa4ff" strokeWidth="1.6" strokeDasharray="4 3" markerEnd="url(#cp-arrow)" />
          <text x="14" y="62" {...t} fill="#b3c3ff">reference</text>
          <text x="196" y="58" {...t} fill="#f87171">too late</text>
        </g>
      )}
      {kind === "borrow" && (
        <g>
          <text x="6" y="18" {...t}>slice (reader)</text>
          <rect x="84" y="9" width="226" height="12" rx="6" fill="rgba(138,164,255,0.55)" />
          <text x="6" y="54" {...t}>buffer.clear()</text>
          <rect x="150" y="45" width="160" height="12" rx="6" fill="rgba(251,191,36,0.6)" />
          <rect x="146" y="3" width="168" height="62" rx="4" fill="rgba(248,113,113,0.14)" stroke="#f87171" strokeDasharray="3 3" />
          <text x="230" y="75" textAnchor="middle" {...t} fill="#f87171">writer + reader overlap</text>
        </g>
      )}
      {kind === "move" && (
        <g>
          <rect x="6" y="10" width="96" height="26" {...box} strokeDasharray="3 3" />
          <text x="54" y="27" textAnchor="middle" {...t} opacity=".7">first owner</text>
          <path d="M104 23 H190" stroke="#c5ee8a" strokeWidth="1.6" />
          <text x="147" y="16" textAnchor="middle" {...t} fill="#c5ee8a">value moves</text>
          <rect x="192" y="10" width="122" height="26" {...box} stroke="#c5ee8a" />
          <text x="253" y="27" textAnchor="middle" {...t} fill="#d3f3a4">new owner</text>
          <path d="M54 38 C54 64 100 64 128 58" fill="none" stroke="#f87171" strokeWidth="1.6" strokeDasharray="4 3" />
          <text x="136" y="61" {...t} fill="#f87171">used here: gone</text>
        </g>
      )}
      {kind === "path" && (
        <g>
          <rect x="6" y="6" width="90" height="22" {...box} />
          <text x="51" y="21" textAnchor="middle" {...t}>main</text>
          <rect x="60" y="28" width="104" height="22" {...box} stroke="#8aa4ff" />
          <text x="112" y="43" textAnchor="middle" {...t} fill="#b3c3ff">sky</text>
          <rect x="116" y="50" width="120" height="22" {...box} stroke="#c5ee8a" />
          <text x="176" y="65" textAnchor="middle" {...t} fill="#d3f3a4">coords::fn</text>
          <path d="M96 17 H110 V28 M164 39 H176 V50" fill="none" stroke="rgba(255,255,255,0.4)" />
          <text x="250" y="62" {...t} fill="#fbbf24">pub? use? path?</text>
        </g>
      )}
      {kind === "closure" && (
        <g>
          <rect x="6" y="8" width="96" height="26" {...box} />
          <text x="54" y="25" textAnchor="middle" {...t}>factor (local)</text>
          <path d="M102 21 C140 21 140 21 180 21" stroke="#8aa4ff" strokeWidth="1.6" strokeDasharray="4 3" markerEnd="url(#cp-arrow)" />
          <rect x="182" y="8" width="132" height="26" {...box} stroke="#8aa4ff" />
          <text x="248" y="25" textAnchor="middle" {...t} fill="#b3c3ff">|x| x * factor</text>
          <path d="M54 36 V58" stroke="#f87171" strokeWidth="1.6" />
          <text x="62" y="62" {...t} fill="#f87171">function returns: factor gone</text>
          <text x="182" y="48" {...t} fill="#c5ee8a">move |x| ... takes it along</text>
        </g>
      )}
      {kind === "trait" && (
        <g>
          <rect x="10" y="10" width="116" height="30" {...box} stroke="#c5ee8a" />
          <text x="68" y="29" textAnchor="middle" {...t} fill="#d3f3a4">needs: trait</text>
          <text x="160" y="31" textAnchor="middle" {...t} fontSize={14} fill="#f87171">?</text>
          <rect x="194" y="10" width="116" height="30" {...box} stroke="#f87171" />
          <text x="252" y="29" textAnchor="middle" {...t} fill="#fecaca">your type: none</text>
          <text x="160" y="62" textAnchor="middle" {...t}>impl the trait, or derive it</text>
        </g>
      )}
      {kind === "types" && (
        <g>
          <rect x="14" y="10" width="112" height="30" {...box} stroke="#c5ee8a" />
          <text x="70" y="29" textAnchor="middle" {...t} fill="#d3f3a4">expected</text>
          <text x="160" y="31" textAnchor="middle" {...t} fontSize={14} fill="#f87171">≠</text>
          <rect x="194" y="10" width="112" height="30" {...box} stroke="#f87171" />
          <text x="250" y="29" textAnchor="middle" {...t} fill="#fecaca">found</text>
          <text x="160" y="62" textAnchor="middle" {...t}>convert on purpose, or annotate</text>
        </g>
      )}
    </svg>
  );
}

/** The failure of a build or a run, explained. */
export function CompilerPanel({ error }: { error: BuildError }) {
  const info = explainError(error);
  const compile = info.kind === "compile";
  const lines = error.message.split("\n").filter((l) => l.trim().length > 0);
  const headline = compile ? "Build failed" : info.kind === "panic" ? "The program panicked" : "The program stopped";
  const indexUrl = /^E\d{4}$/.test(info.code) ? `https://doc.rust-lang.org/error_codes/${info.code}.html` : null;
  return (
    <section role="alert" data-panel="cp-compiler" className="min-w-0 overflow-hidden rounded-[10px] border border-[#f87171]/45 bg-[#1d0c0c]/85">
      <header className="flex min-w-0 items-center gap-2 border-b border-[#f87171]/25 bg-[#f87171]/10 px-3 py-2">
        <TriangleAlert className="hud-danger h-3.5 w-3.5 shrink-0" aria-hidden />
        <h3 className="hud-title hud-danger min-w-0 flex-1 truncate">{headline}</h3>
        {info.code && info.code !== "Panic" && <span className="hud-tag hud-danger shrink-0 border-[#f87171]/40 font-mono">{info.code}</span>}
        {error.line !== null && <span className="hud-tag hud-danger shrink-0 border-[#f87171]/40 font-mono">main.rs:{error.line}</span>}
      </header>
      <div className="px-3 py-2.5">
        <pre className="max-h-28 overflow-auto whitespace-pre-wrap break-words rounded-md bg-black/45 px-2.5 py-2 font-mono text-[11px] leading-snug text-[#fecaca]">
          <span className="text-[#f87171]">{compile ? (info.code ? `error[${info.code}]` : "error") : "panic"}</span>
          <span className="text-white/60">: </span>
          {lines.join("\n") || "(no message)"}
          {error.line !== null && <span className="block text-white/60">{`  --> main.rs:${error.line}`}</span>}
        </pre>
        <p className="mt-2 text-[12px] font-semibold leading-snug text-[#f4f4f4]">{info.headline}</p>
        <p className="mt-0.5 text-[11px] leading-snug text-white/75">{info.meaning}</p>
        {info.diagram && <ErrorDiagram kind={info.diagram} />}
        <ul className="mt-1.5 space-y-1">
          {info.fixes.map((f, i) => (
            <li key={i} className="flex min-w-0 items-start gap-1.5 text-[11px] leading-snug text-white/85">
              <ArrowRight className="mt-[2px] h-3 w-3 shrink-0 text-[#8aa4ff]" aria-hidden />
              <span className="min-w-0 break-words">{f}</span>
            </li>
          ))}
        </ul>
        <p className="mt-2 flex flex-wrap items-center gap-x-3 text-[10px] text-white/60">
          <span>Fix it in the editor and press Run again.</span>
          {indexUrl && (
            <a href={indexUrl} target="_blank" rel="noopener noreferrer" className="text-[#b3c3ff] underline-offset-2 hover:underline">
              {info.code} in the Rust error index
            </a>
          )}
        </p>
      </div>
    </section>
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
}: {
  stdout: string;
  built: boolean;
  error: BuildError | null;
  keys: [string, unknown][];
  live: boolean;
  interactive: boolean;
  focus: boolean;
  flash: boolean;
  locked: boolean;
}) {
  const [tab, setTab] = useState<"output" | "data">("output");
  const lines = outputLines(stdout);
  const panicked = error?.type === "Panic";
  const status = !built ? "Idle" : error ? (panicked ? "Panicked" : "Build failed") : "Build OK";
  const statusTone = !built ? "text-white/60" : error ? "hud-danger border-[#f87171]/40" : "hud-accent";

  return (
    <section data-panel="ob-console" className={`hud-panel min-w-0 px-3 py-2.5 ${focus ? "border-[#c5ee8a]/35" : ""} ${flash ? "pop-in" : ""}`}>
      <header className="mb-2 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1.5">
        <span className="shrink-0 text-[#c5ee8a]">
          <FeatureIcon id="ob-console" className="h-3.5 w-3.5" />
        </span>
        <h3 className="hud-title min-w-0 flex-1 truncate">Observer console</h3>
        <span className={`hud-tag shrink-0 ${statusTone}`}>{status}</span>
      </header>

      {locked ? (
        <div>
          <div className="space-y-1.5">
            {[70, 45, 85, 30].map((w, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="h-1.5 w-2 shrink-0 rounded-sm bg-white/[0.06]" />
                <div className="h-1.5 rounded-sm bg-white/[0.06]" style={{ width: `${w}%` }} />
              </div>
            ))}
          </div>
          <p className="mt-2.5 truncate font-mono text-[10px] text-white/55">
            {focus ? <span className="hud-accent">Your code powers this · </span> : "Locked · "}
            println!(…) · scene(…)
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
                <p className="text-white/60">Press Run to build and run your program (2 to 6 seconds).</p>
              ) : lines.length === 0 ? (
                <p className="text-white/60">{error ? "Nothing was printed before the problem." : "The program ran but printed nothing."}</p>
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
                <p className="text-white/60">{live ? 'No values yet. Send one with scene("name", value);' : "Run your program to see what it sent to the observatory."}</p>
              ) : (
                <dl className="space-y-0.5">
                  {keys.map(([k, v]) => (
                    <div key={k} className="flex min-w-0 gap-2">
                      <dt className="shrink-0 text-white/60">{k}</dt>
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
