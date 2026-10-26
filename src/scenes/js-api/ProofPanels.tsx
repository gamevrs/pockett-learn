"use client";

import React, { useEffect, useState } from "react";
import { Check, Play, X } from "lucide-react";
import { parseQuery, runGraph, runSuiteNow } from "./actions";
import { Feature, NeedsHook, type PanelCtx } from "./feature";
import type { Exchange } from "./state";
import { asStr, isRecord, type GraphDocument, type GraphSelection } from "./types";
import { BTN, BTN_ON, Chip, Code, Empty, Notice } from "./ui";
import { pretty } from "./util";

/** L17-L19: the test lab, the query parser and the graph console. */

// ───────────────────────── L17 test lab ─────────────────────────

export function TestLab({ ctx }: { ctx: PanelCtx }) {
  const { snap, driver } = ctx;
  const [open, setOpen] = useState<string | null>(null);
  const enabled = ctx.unlocked.has("api-tests") && snap.hasProgram;
  const ran = snap.suite !== null;
  useEffect(() => {
    if (enabled && !ran) void runSuiteNow(driver);
  }, [enabled, ran, driver]);
  const suite = snap.suite;
  const failed = suite ? suite.results.filter((r) => !r.ok) : [];
  return (
    <Feature
      id="api-tests"
      ctx={ctx}
      meta={suite ? `${suite.passed}/${suite.total} passing` : undefined}
      actions={
        ctx.interactive && (
          <button type="button" className={BTN_ON} disabled={snap.suiteBusy} onClick={() => void runSuiteNow(driver)} aria-label="Run the test suite">
            <Play className="h-3 w-3" aria-hidden /> {snap.suiteBusy ? "Running…" : "Run suite"}
          </button>
        )
      }
    >
      <NeedsHook ctx={ctx} hook="runSuite">
        {!suite ? (
          <Empty>{snap.suiteBusy ? "Running the suite…" : "runSuite() has not returned results yet."}</Empty>
        ) : (
          <div className="px-3 py-2">
            <div className="flex items-center gap-2">
              <div className="hud-bar !h-2 flex-1" role="meter" aria-label="Tests passing" aria-valuemin={0} aria-valuemax={suite.total} aria-valuenow={suite.passed}>
                <span style={{ width: `${suite.total ? (suite.passed / suite.total) * 100 : 0}%`, background: failed.length ? "#fbbf24" : "#c5ee8a" }} />
              </div>
              <span className={`hud-value text-[13px] ${failed.length ? "hud-warning" : "hud-accent"}`}>
                {suite.passed}/{suite.total}
              </span>
            </div>
            <ul className="mt-2 grid gap-1.5 @sm:grid-cols-2" aria-label="Test cases">
              {suite.results.map((r) => (
                <li key={r.name}>
                  <button
                    type="button"
                    aria-expanded={open === r.name}
                    onClick={() => setOpen(open === r.name ? null : r.name)}
                    className={`flex w-full min-w-0 items-start gap-1.5 rounded-md border px-2 py-1.5 text-left focus-visible:outline-2 focus-visible:outline-[#c5ee8a] ${r.ok ? "border-white/10 bg-white/[0.04]" : "border-[#f87171]/50 bg-[#f87171]/10"}`}
                  >
                    {r.ok ? <Check className="mt-px h-3 w-3 shrink-0 text-[#c5ee8a]" aria-label="passed" /> : <X className="mt-px h-3 w-3 shrink-0 text-[#f87171]" aria-label="failed" />}
                    <span className="line-clamp-2 min-w-0 text-[11px] leading-snug text-white/90">{r.name}</span>
                  </button>
                  {open === r.name && (
                    <div className="mt-1 rounded bg-black/40 px-2 py-1.5 text-[10.5px] leading-snug text-white/85">
                      {r.failures.length === 0 ? "All assertions passed." : r.failures.map((f, i) => <div key={i} className="font-mono text-[#fca5a5]">{f}</div>)}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </NeedsHook>
    </Feature>
  );
}

// ───────────────────────── L18 query parser ─────────────────────────

const SAMPLES: { label: string; q: string }[] = [
  { label: "Stations", q: '{ stations(zone: "central", limit: 3) { id name bikes(kind: "electric") { id battery } } }' },
  { label: "One station", q: '{ station(id: "st-03") { name capacity availableBikes } }' },
  { label: "Bikes", q: '{ bikes(status: "available", limit: 4) { id kind station { name zone } } }' },
  { label: "Broken", q: "{ stations(zone: ) { name } }" },
];

function countNodes(sels: GraphSelection[]): number {
  return sels.reduce((n, s) => n + 1 + countNodes(s.selections), 0);
}

function Tree({ sels, depth = 0 }: { sels: GraphSelection[]; depth?: number }) {
  return (
    <ul className={depth === 0 ? "" : "ml-3 border-l border-white/20 pl-2.5"}>
      {sels.map((s, i) => (
        <li key={`${s.name}:${i}`} className="py-[2px]">
          <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5">
            <span className={`font-mono text-[11.5px] ${s.selections.length > 0 ? "font-semibold text-[#d3f3a4]" : "text-white/95"}`}>{s.name}</span>
            {Object.entries(s.args).map(([k, v]) => (
              <Chip key={k} tone="plain">
                {k}: {typeof v === "string" ? `"${v}"` : String(v)}
              </Chip>
            ))}
            {s.selections.length > 0 && <span className="text-[10px] text-white/60">{s.selections.length} field{s.selections.length === 1 ? "" : "s"}</span>}
          </div>
          {s.selections.length > 0 && <Tree sels={s.selections} depth={depth + 1} />}
        </li>
      ))}
    </ul>
  );
}

export function QueryParser({ ctx }: { ctx: PanelCtx }) {
  const { driver } = ctx;
  const [src, setSrc] = useState(SAMPLES[0].q);
  const [result, setResult] = useState<{ doc: GraphDocument | null; error: string | null }>({ doc: null, error: null });
  const enabled = ctx.unlocked.has("api-graph-query") && ctx.snap.hasProgram;

  useEffect(() => {
    if (!enabled) return;
    const t = setTimeout(() => setResult(parseQuery(driver, src)), 200);
    return () => clearTimeout(t);
  }, [enabled, driver, src]);

  useEffect(() => {
    if (!enabled || !ctx.autoplay) return;
    let i = 0;
    const t = setInterval(() => setSrc(SAMPLES[++i % (SAMPLES.length - 1)].q), 5200);
    return () => clearInterval(t);
  }, [enabled, ctx.autoplay]);

  const nodes = result.doc ? countNodes(result.doc.selections) : 0;
  return (
    <Feature id="api-graph-query" ctx={ctx} meta={result.doc ? `${nodes} node${nodes === 1 ? "" : "s"}` : undefined}>
      <NeedsHook ctx={ctx} hook="parseGraph">
        <div className="px-3 py-2">
          <label className="block">
            <span className="hud-label !text-white/65">Query</span>
            <textarea
              value={src}
              onChange={(e) => setSrc(e.target.value)}
              disabled={!ctx.interactive}
              rows={3}
              spellCheck={false}
              aria-label="Query source"
              className="mt-0.5 w-full resize-y rounded-md border border-white/15 bg-white/[0.05] px-2 py-1.5 font-mono text-[11px] leading-snug text-white outline-none focus:border-[#c5ee8a]/70"
            />
          </label>
          {ctx.interactive && (
            <div className="mt-1 flex flex-wrap gap-1">
              {SAMPLES.map((s) => (
                <button key={s.label} type="button" className={BTN} onClick={() => setSrc(s.q)}>
                  {s.label}
                </button>
              ))}
            </div>
          )}
          <div className="mt-2">
            {result.error ? (
              <Notice tone="bad">
                <span className="font-semibold">SyntaxError</span> · {result.error}
              </Notice>
            ) : result.doc ? (
              <div className="rounded-md bg-black/30 px-2 py-1.5">
                <div className="mb-0.5 font-mono text-[10.5px] text-white/65">operation: {result.doc.operation}</div>
                <Tree sels={result.doc.selections} />
              </div>
            ) : (
              <p className="text-[11px] text-white/60">Parsing…</p>
            )}
          </div>
        </div>
      </NeedsHook>
    </Feature>
  );
}

// ───────────────────────── L19 graph console ─────────────────────────

const GRAPH_SAMPLES: { label: string; q: string }[] = [
  { label: "Central stations", q: '{ stations(zone: "central") { name capacity availableBikes } }' },
  { label: "Nested bikes", q: '{ station(id: "st-03") { name bikes(kind: "electric") { id battery status } } }' },
  { label: "Bikes + station", q: '{ bikes(status: "available", limit: 3) { id kind station { name } } }' },
  { label: "Bad field", q: "{ stations(limit: 2) { name colour } }" },
];

export function GraphConsole({ ctx }: { ctx: PanelCtx }) {
  const { driver, snap } = ctx;
  const [q, setQ] = useState(GRAPH_SAMPLES[0].q);
  const [ran, setRan] = useState<Exchange | null>(null);
  const [busy, setBusy] = useState(false);
  const shown = ran ?? snap.lastGraph;
  const body = shown && isRecord(shown.body) ? shown.body : null;
  const errors = body && Array.isArray(body.errors) ? body.errors.filter(isRecord) : [];
  const asked = shown && isRecord(shown.req.body) ? asStr(shown.req.body.query) : "";
  const run = async () => {
    setBusy(true);
    setRan(await runGraph(driver, q));
    setBusy(false);
  };
  return (
    <Feature
      id="api-graph"
      ctx={ctx}
      meta="POST /graphql"
      actions={
        ctx.interactive && (
          <button type="button" className={BTN_ON} disabled={busy} onClick={() => void run()} aria-label="Run the query">
            <Play className="h-3 w-3" aria-hidden /> Run
          </button>
        )
      }
    >
      <NeedsHook ctx={ctx} hook="handle">
        <div className="px-3 py-2">
          <textarea
            value={q}
            onChange={(e) => setQ(e.target.value)}
            disabled={!ctx.interactive}
            rows={2}
            spellCheck={false}
            aria-label="Graph query"
            className="w-full resize-y rounded-md border border-white/15 bg-white/[0.05] px-2 py-1.5 font-mono text-[11px] leading-snug text-white outline-none focus:border-[#c5ee8a]/70"
          />
          {ctx.interactive && (
            <div className="mt-1 flex flex-wrap gap-1">
              {GRAPH_SAMPLES.map((s) => (
                <button key={s.label} type="button" className={BTN} onClick={() => setQ(s.q)}>
                  {s.label}
                </button>
              ))}
            </div>
          )}
          {shown ? (
            <div className="mt-2 rounded-md bg-black/30 px-2 py-1.5">
              <div className="flex min-w-0 items-center gap-2">
                <Code ex={shown} />
                <span className="min-w-0 flex-1 truncate font-mono text-[10.5px] text-white/70" title={asked}>
                  {asked}
                </span>
                {errors.length > 0 && <Chip tone="warn">{errors.length} error{errors.length === 1 ? "" : "s"}</Chip>}
              </div>
              {body && "data" in body && (
                <pre className="mt-1.5 max-h-44 overflow-auto whitespace-pre-wrap break-all font-mono text-[10.5px] leading-snug text-[#e0f6c1]">{pretty(body.data, 1100)}</pre>
              )}
              {errors.map((e, i) => (
                <p key={i} className="mt-1 text-[11px] text-[#fca5a5]">
                  {asStr(e.message, "error")}
                  {Array.isArray(e.path) && <span className="ml-1 font-mono text-white/60">at {e.path.join(".")}</span>}
                </p>
              ))}
              {!body && <p className="mt-1.5 text-[11px] text-white/70">The response body is not an object.</p>}
            </div>
          ) : (
            <p className="mt-2 text-[11px] text-white/60">Run a query to see data and errors come back.</p>
          )}
        </div>
      </NeedsHook>
    </Feature>
  );
}
