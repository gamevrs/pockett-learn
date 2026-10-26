"use client";

import React, { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { adviceFor, parseDiagnostics, runtimeAdvice } from "../csharp-basics/data";
import { bodyJson, clamp, statusColor, type ApiData, type BuildError, type Exchange } from "./data";

/**
 * Panels of the Crux operations console. Each one draws only what the learner's program printed,
 * tolerates missing or odd values, and never throws. Lime marks values the learner's code produced,
 * amber is caution, red is failure, blue-grey is "not modified", everything else is neutral grey.
 */

const LIME = "#c5ee8a";
const AMBER = "#fbbf24";
const RED = "#f87171";
const BLUE = "#93c5fd";

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="hud-log hud-muted py-1 text-[11px]">{children}</p>;
}

function Status({ status }: { status: number }) {
  return (
    <span className="shrink-0 rounded px-1.5 font-mono text-[10px] font-semibold tabular-nums" style={{ color: statusColor(status), background: "rgba(255,255,255,0.06)" }}>
      {status}
    </span>
  );
}

function Method({ method }: { method: string }) {
  return <span className="w-[3.1rem] shrink-0 font-mono text-[10px] text-white/45">{method}</span>;
}

function Pill({ children, color = "rgba(255,255,255,0.6)" }: { children: React.ReactNode; color?: string }) {
  return (
    <span className="shrink-0 rounded-full border px-1.5 text-[9.5px] leading-[15px]" style={{ color, borderColor: "rgba(255,255,255,0.14)" }}>
      {children}
    </span>
  );
}

function More({ shown, total }: { shown: number; total: number }) {
  return total > shown ? <p className="mt-1 text-[10px] text-white/35">+ {total - shown} more</p> : null;
}

function Line({ left, right, title }: { left: React.ReactNode; right?: React.ReactNode; title?: string }) {
  return (
    <div className="flex min-w-0 items-center gap-2 font-mono text-[11px] leading-[1.55]" title={title}>
      {left}
      {right !== undefined && <span className="ml-auto flex shrink-0 items-center gap-1.5">{right}</span>}
    </div>
  );
}

function problemOf(e: Exchange): { title?: string; detail?: string; errors?: Record<string, string[]> } | null {
  const j = bodyJson(e.body);
  return j && typeof j === "object" && !Array.isArray(j) && "status" in j ? (j as { title?: string; detail?: string; errors?: Record<string, string[]> }) : null;
}

// ───────────────────────── console ─────────────────────────

function ErrorBlock({ error }: { error: BuildError }) {
  const compile = error.type === "CompileError";
  const diags = compile ? parseDiagnostics(error.message) : [];
  const advice = compile ? diags.map((d) => adviceFor(d.code)).find((a) => a !== undefined) : runtimeAdvice(error.message);
  const lines = compile ? [] : error.message.split("\n").filter((l) => l.trim().length > 0);
  return (
    <div role="alert" className="mb-2 rounded-md border border-[#f87171]/40 bg-[#2a0f0f]/70 px-2.5 py-2">
      <div className="mb-1.5 flex min-w-0 items-center gap-2">
        <AlertTriangle className="hud-danger h-3.5 w-3.5 shrink-0" aria-hidden />
        <span className="hud-title hud-danger min-w-0 flex-1 truncate">{compile ? "Build failed" : "The program crashed"}</span>
        {error.line !== null && <span className="hud-tag hud-danger shrink-0 border-[#f87171]/40">line {error.line}</span>}
      </div>
      {compile ? (
        <ul className="space-y-1">
          {diags.map((d, i) => (
            <li key={i} className="flex min-w-0 items-baseline gap-2 font-mono text-[11px] leading-snug text-[#fecaca]">
              {d.where && <span className="shrink-0 rounded bg-[#f87171]/15 px-1 text-[10px] text-[#fca5a5]">L{d.where}</span>}
              {d.code && <span className="shrink-0 text-[10px] text-[#fca5a5]/80">{d.code}</span>}
              <span className="min-w-0 break-words">{d.text}</span>
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

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`h-6 shrink-0 rounded-full border px-2.5 text-[10px] font-medium transition-colors ${active ? "border-transparent bg-[#c5ee8a] text-[#0a0a0a]" : "border-white/12 bg-white/[0.04] text-white/70 hover:bg-white/10"}`}
    >
      {children}
    </button>
  );
}

export function ConsolePanel({
  stdout, built, error, keys, live, interactive, focus, flash, locked, ghost,
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
  ghost: React.ReactNode;
}) {
  const [tab, setTab] = useState<"output" | "data">("output");
  const lines = stdout.split("\n");
  while (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();
  const compileFailed = error?.type === "CompileError";
  const status = !built ? "Idle" : error ? (compileFailed ? "Build failed" : "Crashed") : "Build OK";
  const statusTone = !built ? "text-white/45" : error ? "hud-danger border-[#f87171]/40" : "hud-accent";
  return (
    <section data-panel="ca-console" className={`hud-panel mb-3 break-inside-avoid px-3 py-2.5 ${focus ? "border-[#c5ee8a]/35" : ""} ${flash ? "pop-in" : ""}`}>
      <header className="mb-2 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1.5">
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0 text-[#c5ee8a]" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <polyline points="4 17 10 11 4 5" />
          <line x1="12" x2="20" y1="19" y2="19" />
        </svg>
        <h3 className="hud-title min-w-0 flex-1 truncate">Operations console</h3>
        <span className={`hud-tag shrink-0 ${statusTone}`}>{status}</span>
      </header>
      {error && <ErrorBlock error={error} />}
      {locked ? (
        <div>
          {ghost}
          <p className="mt-2.5 truncate font-mono text-[10px] text-white/40">
            {focus ? <span className="hud-accent">Your code powers this · </span> : "Locked · "}Console.WriteLine(…)
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
                <p className="hud-muted">Press Run to build your program and replay the traffic.</p>
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
                <p className="hud-muted">{live ? "No values yet. Send one with Board.Show(\"name\", value);" : "Run your program to see what it sent to the console."}</p>
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

// ───────────────────────── lesson 1-4 ─────────────────────────

export function RequestLog({ d }: { d: ApiData }) {
  if (d.requests.length === 0) return <Empty>Parse the smoke section and send it with Board.Show(&quot;requests&quot;, ...).</Empty>;
  const rows = d.requests.slice(0, 7);
  return (
    <div>
      {rows.map((r, i) => (
        <Line
          key={i}
          left={
            <>
              <span className="w-9 shrink-0 text-right tabular-nums text-white/35">{r.at}</span>
              <Method method={r.method} />
              <span className="min-w-0 truncate text-white/80">{r.path}</span>
            </>
          }
          right={
            <>
              {r.queries > 0 && <Pill>?{r.queries}</Pill>}
              {r.headers > 0 && <Pill>{r.headers} hdr</Pill>}
              {r.body && <Pill color={LIME}>body</Pill>}
            </>
          }
        />
      ))}
      <More shown={rows.length} total={d.requests.length} />
      {d.response.status !== undefined && (
        <div className="mt-1.5 flex items-center gap-2 border-t border-white/10 pt-1.5 font-mono text-[10.5px] text-white/55">
          <Status status={d.response.status} />
          <span className="min-w-0 truncate">{d.response.body}</span>
        </div>
      )}
    </div>
  );
}

export function RouteTable({ d }: { d: ApiData }) {
  const { table, matches } = d.routes;
  if (table.length === 0 && matches.length === 0) return <Empty>Register routes and send the table with Board.Show(&quot;routes&quot;, ...).</Empty>;
  return (
    <div>
      <div className="mb-1.5 flex flex-wrap gap-1">
        {table.map((t, i) => (
          <span key={i} className="rounded border border-white/10 bg-white/[0.04] px-1.5 font-mono text-[10px] text-white/70">
            <span className="text-white/40">{t.method}</span> {t.template}
          </span>
        ))}
      </div>
      {matches.slice(0, 8).map((m, i) => (
        <Line
          key={i}
          left={
            <>
              <Method method={m.method} />
              <span className="min-w-0 truncate text-white/80">{m.path}</span>
            </>
          }
          right={
            m.outcome === "Found" ? (
              <span className="max-w-[10rem] truncate" style={{ color: LIME }}>{m.template}</span>
            ) : m.outcome === "MethodNotAllowed" ? (
              <span style={{ color: AMBER }}>405 · allow {m.allow.join(", ")}</span>
            ) : (
              <span style={{ color: AMBER }}>404</span>
            )
          }
        />
      ))}
      <More shown={Math.min(8, matches.length)} total={matches.length} />
    </div>
  );
}

export function Lanes({ d }: { d: ApiData }) {
  const flows = d.pipeline.filter((e) => e.trace);
  if (flows.length === 0) return <Empty>Replay the pipeline section with trace: true to see the lanes.</Empty>;
  const names: string[] = [];
  for (const f of flows) for (const t of f.trace ?? []) if (!t.startsWith("/") && t !== "endpoint" && !names.includes(t)) names.push(t);
  const lanes = [...names, "endpoint"];
  return (
    <div>
      <div className="mb-1 grid items-end gap-1" style={{ gridTemplateColumns: `repeat(${lanes.length}, minmax(0, 1fr)) 2.2rem` }}>
        {lanes.map((n) => (
          <span key={n} className="truncate text-center font-mono text-[9px] text-white/40" title={n}>
            {n.replace("map:", "")}
          </span>
        ))}
        <span />
      </div>
      <div className="space-y-1.5">
        {flows.slice(0, 7).map((f, i) => {
          const trace = f.trace ?? [];
          return (
            <div key={i}>
              <div className="grid items-center gap-1" style={{ gridTemplateColumns: `repeat(${lanes.length}, minmax(0, 1fr)) 2.2rem` }}>
                {lanes.map((n) => {
                  const entered = trace.includes(n);
                  const left = trace.includes("/" + n);
                  const color = !entered ? "rgba(255,255,255,0.07)" : n === "endpoint" ? LIME : left ? "rgba(197,238,138,0.55)" : RED;
                  return <span key={n} className="h-2.5 rounded-sm" style={{ background: color }} title={!entered ? `${n}: not reached` : left || n === "endpoint" ? `${n}: ran` : `${n}: interrupted`} />;
                })}
                <Status status={f.status} />
              </div>
              <p className="mt-0.5 truncate font-mono text-[9.5px] text-white/40">
                {f.method} {f.path}
              </p>
            </div>
          );
        })}
      </div>
      <p className="mt-1.5 text-[9.5px] text-white/35">
        Lime lanes ran and returned; red lanes were cut short by an exception; dark lanes were never reached.
      </p>
    </div>
  );
}

const lifeColor = (l: string) => (l === "Singleton" ? "#c4b5fd" : l === "Scoped" ? LIME : "rgba(255,255,255,0.6)");

export function Container({ d }: { d: ApiData }) {
  const { services, facts, errors } = d.di;
  if (services.length === 0) return <Empty>Build a container and send it with Board.Show(&quot;di&quot;, ...).</Empty>;
  return (
    <div>
      <div className="space-y-1">
        {services.map((s) => (
          <div key={s.service} className="flex min-w-0 items-center gap-2 font-mono text-[11px]">
            <span className="min-w-0 truncate text-white/85">{s.service}</span>
            <Pill color={lifeColor(s.lifetime)}>{s.lifetime}</Pill>
            {s.dependsOn.length > 0 && <span className="min-w-0 truncate text-[10px] text-white/40">needs {s.dependsOn.join(", ")}</span>}
          </div>
        ))}
      </div>
      {facts.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {facts.map(([label, ok]) => (
            <Pill key={label} color={ok ? LIME : AMBER}>
              {ok ? "✓" : "✗"} {label}
            </Pill>
          ))}
        </div>
      )}
      {errors.map(([label, message]) => (
        <p key={label} className="mt-1.5 rounded-md border border-[#fbbf24]/30 bg-[#fbbf24]/[0.06] px-2 py-1 font-mono text-[10px] leading-snug text-[#fde68a]">
          <span className="text-white/45">{label}: </span>
          {message}
        </p>
      ))}
    </div>
  );
}

// ───────────────────────── lesson 5-7 ─────────────────────────

export function Endpoints({ d }: { d: ApiData }) {
  if (d.endpointTable.length === 0 && d.endpoints.length === 0) return <Empty>Map endpoints and send the table with Board.Show(&quot;endpointTable&quot;, ...).</Empty>;
  return (
    <div>
      {d.endpointTable.map((e, i) => (
        <Line key={i} left={<><Method method={e.method} /><span className="min-w-0 truncate text-white/80">{e.template}</span></>} right={<Pill color={e.kind === "controller" ? "#c4b5fd" : LIME}>{e.kind}</Pill>} />
      ))}
      {d.endpoints.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1 border-t border-white/10 pt-1.5" aria-label="Replayed request statuses">
          {d.endpoints.map((e, i) => (
            <span key={i} title={`${e.method} ${e.path}`}>
              <Status status={e.status} />
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function Problems({ d }: { d: ApiData }) {
  const cards = d.problems.flatMap((e) => {
    const p = problemOf(e);
    return p ? [{ e, p }] : [];
  });
  if (cards.length === 0) return <Empty>Replay the problems section to see failures as problem documents.</Empty>;
  return (
    <div className="space-y-1.5">
      {cards.slice(0, 5).map(({ e, p }, i) => (
        <div key={i} className="rounded-md border border-white/10 bg-white/[0.03] px-2 py-1.5">
          <div className="flex min-w-0 items-center gap-2">
            <Status status={e.status} />
            <span className="min-w-0 truncate text-[11px] font-medium text-white/85">{p.title}</span>
            <span className="ml-auto shrink-0 font-mono text-[9.5px] text-white/35">{e.path}</span>
          </div>
          {p.detail && <p className="mt-0.5 truncate text-[10.5px] text-white/55">{p.detail}</p>}
          {p.errors && (
            <div className="mt-1 flex flex-wrap gap-1">
              {Object.entries(p.errors).map(([field, msgs]) => (
                <Pill key={field} color={AMBER}>
                  {field}: {Array.isArray(msgs) ? msgs[0] : String(msgs)}
                </Pill>
              ))}
            </div>
          )}
        </div>
      ))}
      <More shown={Math.min(5, cards.length)} total={cards.length} />
    </div>
  );
}

export function Ledger({ d }: { d: ApiData }) {
  if (d.rows.length === 0 && d.bookings.length === 0) return <Empty>Store bookings and send the rows with Board.Show(&quot;rows&quot;, ...).</Empty>;
  return (
    <div>
      {d.rows.length > 0 && (
        <table className="w-full font-mono text-[10.5px]">
          <thead>
            <tr className="text-left text-[9.5px] uppercase tracking-wider text-white/35">
              <th className="pr-2 font-normal">id</th>
              <th className="pr-2 font-normal">slot</th>
              <th className="pr-2 font-normal">who</th>
              <th className="pr-2 text-right font-normal">climbers</th>
              <th className="text-right font-normal">version</th>
            </tr>
          </thead>
          <tbody>
            {d.rows.map((r) => (
              <tr key={r.id} className="text-white/80">
                <td className="pr-2">#{r.id}</td>
                <td className="pr-2">{r.slotId}</td>
                <td className="max-w-[5rem] truncate pr-2">{r.name}</td>
                <td className="pr-2 text-right tabular-nums">{r.climbers}</td>
                <td className="text-right"><Pill color={r.version > 1 ? AMBER : LIME}>v{r.version}</Pill></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {d.bookings.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1 border-t border-white/10 pt-1.5">
          {d.bookings.map((e, i) => (
            <span key={i} title={`${e.method} ${e.path}`}>
              <Status status={e.status} />
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ───────────────────────── lesson 8-11 ─────────────────────────

function reasonOf(e: Exchange): string {
  const challenge = e.headers["WWW-Authenticate"];
  const m = challenge ? /error_description="([^"]+)"/.exec(challenge) : null;
  if (m) return m[1];
  const p = problemOf(e);
  if (e.status === 404) return "not yours (or not there)";
  return p?.detail ?? (e.status < 300 ? "allowed" : "");
}

export function Access({ d }: { d: ApiData }) {
  if (d.auth.length === 0) return <Empty>Replay the auth section to see every decision.</Empty>;
  return (
    <div>
      {d.minted && d.minted.memberId !== undefined && (
        <p className="mb-1.5 font-mono text-[10px] text-white/45">
          issued: member {d.minted.memberId} · {d.minted.role} · expires in {Math.round((d.minted.ttlMs ?? 0) / 1000)} s
        </p>
      )}
      {d.auth.slice(0, 10).map((e, i) => (
        <Line key={i} left={<><Method method={e.method} /><span className="min-w-0 truncate text-white/80">{e.path}</span></>} right={<><span className="max-w-[9rem] truncate text-[10px] text-white/45">{reasonOf(e)}</span><Status status={e.status} /></>} />
      ))}
    </div>
  );
}

export function RateLimits({ d }: { d: ApiData }) {
  if (d.ratelimit.length === 0) return <Empty>Replay the ratelimit section to see who got through.</Empty>;
  return (
    <div>
      <div className="flex flex-wrap gap-1" aria-label="Requests in order">
        {d.ratelimit.map((e, i) => (
          <span key={i} title={`${e.at} ms · ${e.status}${e.headers["Retry-After"] ? ` · retry in ${e.headers["Retry-After"]} s` : ""}`} className="h-4 w-4 rounded-[3px]" style={{ background: e.status === 429 ? RED : "rgba(197,238,138,0.8)", opacity: e.status === 429 ? 0.85 : 1 }} />
        ))}
      </div>
      <div className="mt-2 space-y-1">
        {d.buckets.map((b) => (
          <div key={b.key} className="flex items-center gap-2 font-mono text-[10.5px]">
            <span className="w-[5.5rem] shrink-0 truncate text-white/55">{b.key}</span>
            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
              <span className="block h-full rounded-full" style={{ width: `${clamp((b.tokens / 5) * 100, 2, 100)}%`, background: LIME }} />
            </span>
            <span className="w-8 shrink-0 text-right tabular-nums text-white/60">{b.tokens}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function IdempotencyLedger({ d }: { d: ApiData }) {
  if (d.idempotency.length === 0) return <Empty>Replay the idempotency section to see replays and refusals.</Empty>;
  return (
    <div>
      {d.idempotency.map((e, i) => {
        const replay = e.headers["Idempotent-Replayed"] === "true";
        const key = e.headers["Location"];
        return (
          <Line key={i} left={<><span className="w-9 shrink-0 text-right tabular-nums text-white/35">{e.at % 100000}</span><span className="min-w-0 truncate text-white/70">{key ?? problemOf(e)?.title ?? ""}</span></>} right={<>{replay && <Pill color={BLUE}>replayed</Pill>}<Status status={e.status} /></>} />
        );
      })}
      {d.ledger.stored.length > 0 && <p className="mt-1.5 truncate font-mono text-[9.5px] text-white/40">remembered: {d.ledger.stored.join(", ")}</p>}
    </div>
  );
}

export function CacheValidators({ d }: { d: ApiData }) {
  if (d.caching.length === 0) return <Empty>Replay the caching section to see 200s turn into 304s.</Empty>;
  return (
    <div>
      {d.caching.map((e, i) => (
        <Line key={i} left={<><Method method={e.method} /><span className="min-w-0 truncate font-mono text-[10px] text-white/55">{e.headers["ETag"] ?? ""}</span></>} right={<>{e.headers["Cache-Control"] && <span className="text-[9.5px] text-white/35">{e.headers["Cache-Control"].split(",")[0]}</span>}<Status status={e.status} /></>} />
      ))}
    </div>
  );
}

// ───────────────────────── lesson 12-15 ─────────────────────────

const levelColor = (l: string) => (l === "Error" ? RED : l === "Warning" ? AMBER : LIME);
const hue = (s: string) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 360, 7);

export function LogStream({ d }: { d: ApiData }) {
  const logs = d.telemetry.logs;
  if (logs.length === 0) return <Empty>Replay the ops section; every event carries a correlation id.</Empty>;
  const rows = logs.slice(-12);
  return (
    <div className="hud-log max-h-44 overflow-auto rounded-md bg-black/40 px-2 py-1.5">
      {rows.map((l, i) => {
        const id = String(l.props.correlationId ?? "");
        const extra = Object.entries(l.props).filter(([k]) => k !== "correlationId").map(([k, v]) => `${k}=${String(v)}`).join(" ");
        return (
          <div key={i} className="flex min-w-0 items-center gap-1.5 font-mono text-[10px] leading-[1.6]">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: levelColor(l.level) }} />
            <span className="shrink-0 rounded px-1" style={{ color: `hsl(${hue(id)} 70% 72%)`, background: `hsl(${hue(id)} 40% 20% / .55)` }}>{id}</span>
            <span className="min-w-0 truncate text-white/70">{l.message}</span>
            <span className="ml-auto max-w-[45%] shrink-0 truncate text-white/35">{extra}</span>
          </div>
        );
      })}
    </div>
  );
}

export function Latency({ d }: { d: ApiData }) {
  const { bounds, counts, p50, p95, counters } = d.telemetry;
  if (counts.length === 0) return <Empty>Send counters and the histogram with Board.Show(&quot;telemetry&quot;, ...).</Empty>;
  const max = Math.max(1, ...counts);
  return (
    <div>
      <div className="flex h-16 items-end gap-1">
        {counts.map((c, i) => (
          <div key={i} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-0.5">
            <span className="text-[9px] tabular-nums text-white/40">{c || ""}</span>
            <span className="w-full rounded-t-[3px]" style={{ height: `${c === 0 ? 2 : 6 + (c / max) * 80}%`, background: c === 0 ? "rgba(255,255,255,0.08)" : i === counts.length - 1 || (bounds[i] ?? 0) >= 500 ? AMBER : LIME }} />
          </div>
        ))}
      </div>
      <div className="mt-0.5 flex gap-1">
        {counts.map((_, i) => (
          <span key={i} className="min-w-0 flex-1 truncate text-center text-[8.5px] text-white/35">{i < bounds.length ? bounds[i] : "more"}</span>
        ))}
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
        {p50 !== undefined && <Pill color={LIME}>p50 ≤ {p50} ms</Pill>}
        {p95 !== undefined && <Pill color={p95 >= 500 ? AMBER : LIME}>p95 ≤ {p95} ms</Pill>}
        {Object.entries(counters).map(([k, v]) => (
          <Pill key={k} color={k.includes("5xx") ? RED : k.includes("4xx") ? AMBER : "rgba(255,255,255,0.6)"}>{k.replace("requests_", "")} × {v}</Pill>
        ))}
      </div>
    </div>
  );
}

export function HealthBoard({ d }: { d: ApiData }) {
  if (d.health.length === 0) return <Empty>Replay the health section to see the probes over time.</Empty>;
  const kind = (p: string) => p.split("/").pop() ?? p;
  const color = (e: Exchange) => {
    const j = bodyJson(e.body) as { status?: string } | null;
    return e.status >= 500 ? RED : j?.status === "Degraded" ? AMBER : LIME;
  };
  return (
    <div>
      {["live", "startup", "ready"].map((k) => (
        <div key={k} className="flex items-center gap-2 py-0.5">
          <span className="w-11 shrink-0 font-mono text-[10px] text-white/55">{k}</span>
          <div className="flex min-w-0 flex-1 flex-wrap gap-1">
            {d.health.filter((e) => kind(e.path) === k).map((e, i) => (
              <span key={i} title={`${e.at} ms: ${e.status}`} className="flex h-4 min-w-[1.6rem] items-center justify-center rounded-[3px] px-1 font-mono text-[8.5px] text-black/80" style={{ background: color(e) }}>
                {e.at >= 1000 ? `${(e.at / 1000).toFixed(1)}s` : `${e.at}`}
              </span>
            ))}
          </div>
        </div>
      ))}
      <p className="mt-1 text-[9.5px] text-white/35">Lime: 200 · amber: degraded · red: 503. Liveness stays lime when a dependency is down.</p>
    </div>
  );
}

export function Upstream({ d }: { d: ApiData }) {
  const calls = d.resilience.calls;
  if (calls.length === 0) return <Empty>Run the harness to see the breaker work through an outage.</Empty>;
  const color = (r: string) => (r === "ok" ? LIME : r === "failed" ? RED : "rgba(255,255,255,0.28)");
  const band = (b: string) => (b === "Open" ? "rgba(248,113,113,0.18)" : b === "HalfOpen" ? "rgba(251,191,36,0.18)" : "rgba(197,238,138,0.1)");
  return (
    <div>
      <div className="flex items-end gap-1">
        {calls.map((c) => (
          <div key={c.i} className="flex min-w-0 flex-1 flex-col items-center gap-1 rounded-[4px] px-0.5 py-1" style={{ background: band(c.breaker) }} title={`#${c.i} at ${c.at} ms: ${c.result} after ${c.attempts} attempt(s), ${c.spentMs} ms, breaker ${c.breaker}`}>
            <span className="w-full rounded-[2px]" style={{ height: `${clamp(4 + c.spentMs / 12, 4, 40)}px`, background: color(c.result) }} />
            <span className="font-mono text-[8.5px] tabular-nums text-white/45">{c.attempts}</span>
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[9.5px] text-white/40">
        <Pill color={LIME}>ok</Pill>
        <Pill color={RED}>failed</Pill>
        <Pill>rejected</Pill>
        <span>bar height: time spent · number: attempts · background: breaker (red open, amber half-open)</span>
      </div>
      {d.resilience.upstreamCalls !== undefined && <p className="mt-1 font-mono text-[10px] text-white/50">{d.resilience.upstreamCalls} calls reached the mailer for {calls.length} sends</p>}
    </div>
  );
}

const outboxColor = (s: string) => (s === "Sent" ? LIME : s === "Dead" ? RED : AMBER);

export function Outbox({ d }: { d: ApiData }) {
  const stages = d.outboxQueue.stages;
  if (stages.length === 0) return <Empty>Run the worker harness to watch the queue drain.</Empty>;
  return (
    <div className="space-y-1.5">
      {stages.map(([label, rows]) => (
        <div key={label} className="flex items-center gap-2">
          <span className="w-[5.2rem] shrink-0 truncate text-[10px] text-white/55">{label}</span>
          <div className="flex flex-1 gap-1">
            {rows.map((m) => (
              <span key={m.id} className="flex h-5 min-w-0 flex-1 items-center justify-center rounded-[3px] font-mono text-[9px] text-black/75" style={{ background: outboxColor(m.status) }} title={`${m.payload}: ${m.status}, ${m.attempts} attempt(s)`}>
                {m.attempts || ""}
              </span>
            ))}
          </div>
        </div>
      ))}
      <p className="text-[9.5px] text-white/35">
        <span style={{ color: AMBER }}>pending</span> · <span style={{ color: LIME }}>sent</span> · <span style={{ color: RED }}>dead</span> · number: attempts made
      </p>
    </div>
  );
}

// ───────────────────────── lesson 16-19 ─────────────────────────

export function FlagsPanel({ d }: { d: ApiData }) {
  const people = ["mika", "noor", "tomas", "ravi", "ola"];
  const members = d.flags.flatMap((e, i) => {
    const j = bodyJson(e.body);
    return e.status === 200 && j && typeof j === "object" ? [{ who: people[i] ?? `#${i + 1}`, flags: j as Record<string, boolean> }] : [];
  });
  if (d.rollout.steps.length === 0 && members.length === 0) return <Empty>Evaluate flags and send the rollout with Board.Show(&quot;rollout&quot;, ...).</Empty>;
  const names = [...new Set(members.flatMap((m) => Object.keys(m.flags)))];
  return (
    <div>
      {d.rollout.steps.map((s) => (
        <div key={s.percent} className="flex items-center gap-2 py-0.5 font-mono text-[10.5px]">
          <span className="w-9 shrink-0 text-white/55">{s.percent}%</span>
          <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
            <span className="block h-full rounded-full" style={{ width: `${clamp(s.on / 10, 1, 100)}%`, background: LIME }} />
          </span>
          <span className="w-10 shrink-0 text-right tabular-nums text-white/60">{s.on}</span>
        </div>
      ))}
      {d.rollout.stable !== undefined && <p className="mt-0.5 text-[10px]" style={{ color: d.rollout.stable ? LIME : RED }}>{d.rollout.stable ? "Stable: nobody loses a feature as the percentage grows." : "Unstable: some members lost the feature as it grew."}</p>}
      {members.length > 0 && (
        <table className="mt-2 w-full font-mono text-[10px]">
          <thead>
            <tr className="text-left text-white/35">
              <th className="font-normal" />
              {names.map((n) => (
                <th key={n} className="truncate px-1 text-center font-normal">{n}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.who}>
                <td className="pr-2 text-white/60">{m.who}</td>
                {names.map((n) => (
                  <td key={n} className="text-center" style={{ color: m.flags[n] ? LIME : "rgba(255,255,255,0.2)" }}>{m.flags[n] ? "●" : "○"}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export function TestResults({ d }: { d: ApiData }) {
  if (d.tests.length === 0) return <Empty>Run your suite and send the results with Board.Show(&quot;tests&quot;, ...).</Empty>;
  return (
    <div className="space-y-0.5">
      {d.tests.map((t, i) => (
        <div key={i}>
          <div className="flex min-w-0 items-center gap-2 text-[11px]">
            <span style={{ color: t.passed ? LIME : RED }}>{t.passed ? "✓" : "✗"}</span>
            <span className="min-w-0 truncate text-white/80">{t.name}</span>
          </div>
          {!t.passed && t.failure && <p className="ml-5 truncate font-mono text-[10px] text-[#fecaca]">{t.failure}</p>}
        </div>
      ))}
    </div>
  );
}

export function Versions({ d }: { d: ApiData }) {
  const pages = d.versions.flatMap((e) => {
    const j = bodyJson(e.body) as { items?: { id: number }[]; pageNumber?: number; pageSize?: number; total?: number; next?: string | null } | null;
    return e.path.startsWith("/v2") && j && Array.isArray(j.items) ? [{ e, j }] : [];
  });
  if (d.versions.length === 0) return <Empty>Replay the versions section to see pages and next links.</Empty>;
  return (
    <div className="space-y-1.5">
      {d.versions.some((e) => !e.path.startsWith("/v2")) && <p className="font-mono text-[10px] text-white/45">v1 /gyms/{"{id}"}/slots still returns a plain array</p>}
      {pages.slice(0, 5).map(({ j }, i) => (
        <div key={i} className="flex min-w-0 items-center gap-2 font-mono text-[10.5px]">
          <span className="w-12 shrink-0 text-white/50">p{j.pageNumber} · {j.pageSize}</span>
          <div className="flex min-w-0 flex-1 gap-1">
            {j.items?.map((s) => (
              <Pill key={s.id} color={LIME}>{s.id}</Pill>
            ))}
          </div>
          <span className="max-w-[7rem] shrink-0 truncate text-[9.5px] text-white/35">{j.next ?? "last page"}</span>
        </div>
      ))}
      {d.versions.filter((e) => e.status === 400).map((e, i) => (
        <p key={i} className="font-mono text-[10px]" style={{ color: AMBER }}>400 · {problemOf(e)?.detail}</p>
      ))}
    </div>
  );
}

export function DayReport({ d, allLive }: { d: ApiData; allLive: boolean }) {
  const r = d.report;
  if (!r) return <Empty>Build the report from the replayed day and send it with Board.Show(&quot;report&quot;, ...).</Empty>;
  const statuses = Object.entries(r.byStatus);
  const total = Math.max(1, statuses.reduce((a, [, n]) => a + n, 0));
  return (
    <div>
      <div className="grid grid-cols-3 gap-1.5">
        <Tile label="requests" value={r.requests ?? total} />
        <Tile label="p95" value={r.p95 === undefined ? "—" : `${r.p95} ms`} tone={(r.p95 ?? 0) >= 500 ? AMBER : LIME} />
        <Tile label="sent / dead" value={`${r.outbox.Sent ?? 0} / ${r.outbox.Dead ?? 0}`} tone={(r.outbox.Dead ?? 0) > 0 ? AMBER : LIME} />
      </div>
      <div className="mt-2 flex h-2 overflow-hidden rounded-full" aria-label="Responses by status">
        {statuses.map(([s, n]) => (
          <span key={s} title={`${s}: ${n}`} style={{ width: `${(n / total) * 100}%`, background: statusColor(Number(s)), opacity: 0.9 }} />
        ))}
      </div>
      <div className="mt-1.5 flex flex-wrap gap-1">
        {r.counts.map(([label, n]) => (
          <Pill key={label}>{n} {label}</Pill>
        ))}
      </div>
      {r.failures.map((f) => (
        <p key={f.correlationId} className="mt-1.5 rounded-md border border-[#f87171]/30 bg-[#f87171]/[0.06] px-2 py-1 font-mono text-[10px] text-[#fecaca]">
          500 {f.path} · {f.correlationId} → {f.trail.join(" › ")}
        </p>
      ))}
      <p className="mt-2 text-[11px] font-medium" style={{ color: allLive ? LIME : "rgba(255,255,255,0.5)" }}>
        {allLive ? "Every system is live. Crux Desk is open for business." : "Pass the remaining lessons to bring every system live."}
      </p>
    </div>
  );
}

function Tile({ label, value, tone }: { label: string; value: React.ReactNode; tone?: string }) {
  return (
    <div className="min-w-0 rounded-md bg-white/[0.04] px-2 py-1.5">
      <div className="hud-label truncate">{label}</div>
      <div className="hud-value mt-0.5 truncate text-[14px] leading-tight tabular-nums" style={{ color: tone }}>{value}</div>
    </div>
  );
}
