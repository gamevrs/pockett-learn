"use client";

import React, { useState } from "react";
import { Send } from "lucide-react";
import { sendCustom } from "./actions";
import { Feature, NeedsHook, type PanelCtx } from "./feature";
import type { Exchange } from "./state";
import { BTN_ON, Chip, Code, Dot, Empty, INPUT, Method, Spark, Stat, statusColor } from "./ui";
import { clock, isoClock, percentile, pretty } from "./util";

/** L1-L4: the request log, the middleware lanes, the route map and the structured log. */

// ───────────────────────── L1 request log ─────────────────────────

function Detail({ ex }: { ex: Exchange }) {
  const entries = Object.entries(ex.headers);
  return (
    <div className="mx-1 mb-1.5 grid min-w-0 gap-2 rounded-md bg-black/40 p-2 text-[10.5px] @lg:grid-cols-2">
      <div className="min-w-0">
        <div className="hud-label !text-white/60">Request</div>
        <pre className="mt-1 max-h-32 overflow-auto whitespace-pre-wrap break-all font-mono leading-snug text-white/85">{pretty({ headers: ex.req.headers, body: ex.req.body, ip: ex.req.ip }, 600)}</pre>
      </div>
      <div className="min-w-0">
        <div className="hud-label !text-white/60">Response · {ex.outcome === "ok" ? ex.status : ex.outcome}</div>
        <div className="mt-1 flex flex-wrap gap-1">
          {entries.length === 0 && <span className="text-white/60">no headers</span>}
          {entries.slice(0, 10).map(([k, v]) => (
            <span key={k} className="max-w-full truncate rounded bg-white/[0.07] px-1.5 py-px font-mono text-white/80" title={`${k}: ${v}`}>
              {k}: {v}
            </span>
          ))}
        </div>
        <pre className="mt-1 max-h-32 overflow-auto whitespace-pre-wrap break-all font-mono leading-snug text-white/85">{pretty(ex.body, 700)}</pre>
        {ex.trace.length > 0 && <div className="mt-1 font-mono text-white/70">trace: {ex.trace.join(" › ")}</div>}
      </div>
    </div>
  );
}

function SendBox({ ctx }: { ctx: PanelCtx }) {
  const [method, setMethod] = useState("GET");
  const [path, setPath] = useState("/stations/st-03");
  const [body, setBody] = useState("");
  const submit = () => {
    if (path.trim()) void sendCustom(ctx.driver, method, path.trim(), method === "GET" ? undefined : body);
  };
  return (
    <form
      className="flex min-w-0 flex-wrap items-center gap-1.5 border-t border-white/[0.08] px-3 py-2"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <select aria-label="HTTP method" value={method} onChange={(e) => setMethod(e.target.value)} className={`${INPUT} w-[4.6rem] shrink-0`}>
        {["GET", "POST", "PATCH", "DELETE"].map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>
      <input aria-label="Request path" value={path} onChange={(e) => setPath(e.target.value)} className={`${INPUT} min-w-[7rem] flex-1 font-mono`} placeholder="/stations?limit=3" spellCheck={false} />
      {method !== "GET" && <input aria-label="Request body (JSON)" value={body} onChange={(e) => setBody(e.target.value)} className={`${INPUT} min-w-[7rem] flex-1 font-mono`} placeholder='{"bikeId":"bk-101"}' spellCheck={false} />}
      <button type="submit" aria-label="Send request" className={BTN_ON}>
        <Send className="h-3 w-3" aria-hidden />
        Send
      </button>
    </form>
  );
}

export function RequestLog({ ctx }: { ctx: PanelCtx }) {
  const { snap } = ctx;
  const [open, setOpen] = useState<number | null>(null);
  const rows = [...snap.exchanges].reverse().slice(0, 14);
  return (
    <Feature id="api-wire" ctx={ctx} meta={`${snap.total} request${snap.total === 1 ? "" : "s"}`}>
      <NeedsHook ctx={ctx} hook="handle">
        {rows.length === 0 ? (
          <Empty>Waiting for the first request…</Empty>
        ) : (
          <ul aria-label="Requests" className="px-1.5 py-1">
            {rows.map((ex) => (
              <li key={ex.id} className="dl-new rounded-md">
                <button
                  type="button"
                  aria-expanded={open === ex.id}
                  aria-label={`${ex.req.method} ${ex.req.url}, ${ex.outcome === "ok" ? ex.status : ex.outcome}`}
                  onClick={() => setOpen(open === ex.id ? null : ex.id)}
                  className="grid w-full min-w-0 grid-cols-[2.6rem_minmax(0,1fr)_auto_auto] items-center gap-x-2 @sm:grid-cols-[auto_2.6rem_minmax(0,1fr)_auto_auto] rounded-md px-1.5 py-1 text-left hover:bg-white/[0.06] focus-visible:outline-2 focus-visible:outline-[#c5ee8a]"
                >
                  <span className="hud-value hidden text-[10px] text-white/60 @sm:block">{clock(ex.at)}</span>
                  <Method m={ex.req.method.toUpperCase()} />
                  <span className="min-w-0 truncate font-mono text-[11px] text-white/90" title={ex.req.url}>
                    {ex.req.url}
                  </span>
                  <Code ex={ex} />
                  <span className="hud-value w-12 text-right text-[10px] text-white/65">{ex.outcome === "timeout" ? "4s+" : `${Math.round(ex.ms)}ms`}</span>
                </button>
                {open === ex.id && <Detail ex={ex} />}
              </li>
            ))}
          </ul>
        )}
        {ctx.interactive && <SendBox ctx={ctx} />}
      </NeedsHook>
    </Feature>
  );
}

// ───────────────────────── L2 middleware lanes ─────────────────────────

const ROW = 26;

function laneNames(ctx: PanelCtx): string[] {
  const hooked = ctx.snap.hooks.middleware;
  if (hooked && hooked.length > 0) return hooked;
  const longest = [...ctx.snap.exchanges].reverse().find((e) => e.trace.length > 0);
  return longest ? longest.trace : [];
}

/** How far down the lanes this exchange travelled, in rows (0 = client, n+1 = handler). */
export function reachOf(ex: Exchange, lanes: string[]): { target: number; stopped: boolean } {
  let last = -1;
  ex.trace.forEach((t) => {
    const i = lanes.indexOf(t);
    if (i > last) last = i;
  });
  if (last < 0) return { target: 0, stopped: true };
  if (last === lanes.length - 1 && ex.status !== 304) return { target: lanes.length + 1, stopped: false };
  return { target: last + 1, stopped: true };
}

export function Lanes({ ctx }: { ctx: PanelCtx }) {
  const { snap } = ctx;
  const lanes = laneNames(ctx);
  const rows = ["client", ...lanes, "handler"];
  const dots = snap.dots.filter((d) => d.outcome === "ok");
  return (
    <Feature id="api-pipeline" ctx={ctx} meta={lanes.length > 0 ? `${lanes.length} lanes` : undefined}>
      <NeedsHook ctx={ctx} hook="listMiddleware">
        {lanes.length === 0 ? (
          <Empty>listMiddleware() returned no names yet.</Empty>
        ) : (
          <div className="relative px-3 py-2" style={{ height: rows.length * ROW + 16 }}>
            <ol className="m-0 list-none p-0" aria-label="Middleware in order">
              {rows.map((name, i) => {
                const stat = snap.laneStats[name];
                const edge = i === 0 || i === rows.length - 1;
                return (
                  <li key={`${name}:${i}`} className="relative flex min-w-0 items-center gap-2" style={{ height: ROW, paddingLeft: 52 }}>
                    <span className={`min-w-0 flex-1 truncate font-mono text-[11px] ${edge ? "text-white/60" : "text-white/90"}`}>{name}</span>
                    {stat && !edge && (
                      <span className="hud-value shrink-0 text-[10px] text-white/70">
                        {stat.passed} passed
                        {stat.stopped > 0 && <span className="ml-1.5 text-[#fbbf24]">{stat.stopped} stopped</span>}
                      </span>
                    )}
                  </li>
                );
              })}
            </ol>
            {/* the rail */}
            <div aria-hidden className="pointer-events-none absolute left-3 top-2 w-[44px]" style={{ height: rows.length * ROW }}>
              <span className="absolute left-[21px] top-[13px] w-px bg-white/25" style={{ height: (rows.length - 1) * ROW }} />
              {rows.map((name, i) => (
                <span key={`${name}:${i}`} className="absolute left-[17px] h-2 w-2 rounded-full border border-white/50 bg-[#121212]" style={{ top: i * ROW + 9 }} />
              ))}
              {dots.map((ex) => {
                const { target, stopped } = reachOf(ex, lanes);
                const color = statusColor(ex.status);
                return (
                  <span
                    key={ex.id}
                    className="dl-dot absolute h-2.5 w-2.5 rounded-full"
                    style={{
                      left: 4 + (ex.id % 4) * 9,
                      top: 8,
                      background: color,
                      boxShadow: stopped ? `0 0 0 3px ${color}55` : `0 0 8px ${color}`,
                      ["--dy" as string]: `${target * ROW}px`,
                      ["--dur" as string]: `${200 + target * 150}ms`,
                    }}
                  />
                );
              })}
            </div>
          </div>
        )}
      </NeedsHook>
    </Feature>
  );
}

// ───────────────────────── L3 route map ─────────────────────────

export function RouteMap({ ctx }: { ctx: PanelCtx }) {
  const { snap } = ctx;
  const routes = snap.hooks.routes;
  const max = Math.max(1, ...Object.values(snap.routeHits));
  const missTotal = snap.misses.length;
  return (
    <Feature id="api-routes" ctx={ctx} meta={routes ? `${routes.length} routes` : undefined}>
      <NeedsHook ctx={ctx} hook="listRoutes">
        {!routes || routes.length === 0 ? (
          <Empty>listRoutes() returned no routes yet.</Empty>
        ) : (
          <ul aria-label="Routes" className="px-3 py-1.5">
            {routes.map((r) => {
              const hits = snap.routeHits[`${r.method} ${r.path}`] ?? 0;
              return (
                <li key={`${r.method} ${r.path}`} className="grid min-w-0 grid-cols-[3.2rem_minmax(0,1fr)_3.5rem_1.6rem] items-center gap-x-2 py-[3px]">
                  <Method m={r.method} />
                  <span className="min-w-0 truncate font-mono text-[11px] text-white/90">{r.path}</span>
                  <span className="h-1.5 overflow-hidden rounded-full bg-white/10" aria-hidden>
                    <span className="block h-full rounded-full bg-[#c5ee8a]" style={{ width: `${(hits / max) * 100}%` }} />
                  </span>
                  <span className={`hud-value text-right text-[10px] ${hits > 0 ? "text-white/90" : "text-white/60"}`}>{hits}</span>
                </li>
              );
            })}
          </ul>
        )}
        <div className="border-t border-white/[0.08] px-3 py-2">
          <div className="hud-label !text-white/60">Misses (no route matched)</div>
          {missTotal === 0 ? (
            <p className="mt-1 text-[11px] text-white/60">None yet. A request for an unknown path or method lands here.</p>
          ) : (
            <ul className="mt-1 space-y-1">
              {[...snap.misses].reverse().slice(0, 4).map((m, i) => (
                <li key={`${m.at}:${i}`} className="flex min-w-0 items-center gap-2">
                  <Method m={m.method} />
                  <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-white/90">{m.path}</span>
                  <Chip tone={m.status === 405 ? "warn" : m.status === 404 ? "warn" : "bad"}>{m.status}</Chip>
                </li>
              ))}
            </ul>
          )}
        </div>
      </NeedsHook>
    </Feature>
  );
}

// ───────────────────────── L4 structured log ─────────────────────────

const LEVEL_COLOR = { info: "#c5ee8a", warn: "#fbbf24", error: "#f87171" } as const;

export function StructuredLog({ ctx }: { ctx: PanelCtx }) {
  const { snap } = ctx;
  const logs = snap.hooks.logs;
  const lat = snap.latencies;
  const p = (n: number) => percentile(lat, n);
  const fmt = (v: number | null) => (v === null ? "—" : `${Math.round(v)}ms`);
  return (
    <Feature id="api-logs" ctx={ctx} meta={logs ? `last ${Math.min(logs.length, 6)} of ${logs.length}` : undefined}>
      <NeedsHook ctx={ctx} hook="recentLogs">
        {!logs || logs.length === 0 ? (
          <Empty>recentLogs(n) has no entries yet.</Empty>
        ) : (
          <ul aria-label="Log lines" className="px-3 py-1.5">
            {[...logs].reverse().slice(0, 6).map((l, i) => (
              <li key={`${l.reqId}:${i}`} className="flex min-w-0 gap-2 py-[3px]">
                <Dot color={LEVEL_COLOR[l.level]} size={7} className="mt-[5px]" />
                <code className="line-clamp-3 min-w-0 break-words font-mono text-[10.5px] leading-snug text-white/85" title={JSON.stringify(l)}>
                  {JSON.stringify({ ...l, time: isoClock(l.time) }).replace(/,"/g, ", \"")}
                </code>
              </li>
            ))}
          </ul>
        )}
        <div className="border-t border-white/[0.08] px-3 py-2">
          <div className="grid grid-cols-3 gap-1.5">
            <Stat label="p50" value={fmt(p(50))} />
            <Stat label="p95" value={fmt(p(95))} tone={(p(95) ?? 0) > 400 ? "warn" : "plain"} />
            <Stat label="p99" value={fmt(p(99))} tone={(p(99) ?? 0) > 800 ? "warn" : "plain"} />
          </div>
          <div className="mt-1.5">
            <Spark values={lat.slice(-50)} label="Recent latency" />
          </div>
          <p className="mt-0.5 text-[10px] text-white/60">{snap.latencySource === "header" ? "from your x-response-time header" : "measured round trip"} · last {Math.min(lat.length, 50)}</p>
        </div>
      </NeedsHook>
    </Feature>
  );
}
