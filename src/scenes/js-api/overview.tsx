"use client";

import React, { useEffect, useState, useSyncExternalStore } from "react";
import { Lock, Play } from "lucide-react";
import { FeatureIcon } from "@/components/ui/icons";
import { MATRIX_ACTIONS, parseQuery } from "./actions";
import { IPS } from "./access";
import type { PanelCtx } from "./feature";
import { useNow } from "./hooks";
import { RIDERS, SEED_STATIONS } from "./sim-data";
import { KLASSES, type Exchange, type Snap } from "./state";
import { isRecord, asNum, type Station } from "./types";
import { FEATURES, KLASS_COLOR, META, statusColor } from "./ui";
import { countdown, percentile } from "./util";
import type { NetworkEntryView } from "@/engine/program";

/**
 * The compact overview: what the scene draws when its stage is short and wide (the project hub card,
 * the landing page). All 19 features as small live tiles on one board, drawn at a fixed logical size
 * and scaled to fit by the scene. Locked tiles are dashed with their lesson number.
 */

export const OVERVIEW_W = 800;
export const OVERVIEW_H = 528;

const LIME = "#c5ee8a";
const DIM = "rgba(255,255,255,0.16)";

function Tile({ id, ctx, children }: { id: string; ctx: PanelCtx; children: React.ReactNode }) {
  const m = META[id];
  const spot = ctx.focus === id;
  if (!ctx.unlocked.has(id)) {
    return (
      <div data-panel={id} data-locked="" className={`flex min-w-0 flex-col rounded-lg border border-dashed px-2.5 py-2 ${spot ? "pulse-ring border-[#c5ee8a]/60" : "border-white/20"}`}>
        <div className="flex min-w-0 items-center gap-1.5">
          <Lock className="h-3 w-3 shrink-0 text-white/60" aria-hidden />
          <span className="hud-label min-w-0 flex-1 truncate !text-[10.5px] !tracking-[0.02em] !text-white/60">{m.title}</span>
          <span className="hud-label shrink-0 !text-[10.5px] !text-white/60">L{m.n}</span>
        </div>
        <code className="mt-auto line-clamp-2 break-words font-mono text-[10.5px] leading-tight text-white/60">{m.need}</code>
      </div>
    );
  }
  return (
    <div data-panel={id} className={`flex min-w-0 flex-col overflow-hidden rounded-lg border bg-white/[0.04] px-2.5 py-2 ${spot ? "border-[#c5ee8a]/45" : "border-white/10"} ${ctx.fresh.has(id) ? "pop-in" : ""}`}>
      <div className="flex min-w-0 items-center gap-1.5">
        {ctx.snap.hasProgram ? <FeatureIcon id={id} className="h-3 w-3 shrink-0 text-[#c5ee8a]" /> : <Play className="h-3 w-3 shrink-0 text-[#c5ee8a]/70" aria-hidden />}
        <span className="hud-label min-w-0 flex-1 truncate !text-[10.5px] !tracking-[0.02em] !text-white/70">{m.title}</span>
        <span className="hud-label shrink-0 !text-[10.5px] !text-white/60">L{m.n}</span>
      </div>
      <div className="mt-1.5 min-h-0 flex-1">{ctx.snap.hasProgram ? children : <p className="font-mono text-[11px] text-white/60">Press Run</p>}</div>
    </div>
  );
}

const Big = ({ children, tone = "plain" }: { children: React.ReactNode; tone?: "plain" | "accent" | "warn" | "bad" }) => (
  <span className={`hud-value text-[15px] leading-none ${tone === "accent" ? "hud-accent" : tone === "warn" ? "hud-warning" : tone === "bad" ? "hud-danger" : ""}`}>{children}</span>
);
const Sub = ({ children }: { children: React.ReactNode }) => <span className="truncate text-[10.5px] leading-tight text-white/65">{children}</span>;

const lastWhere = (s: Snap, f: (e: Exchange) => boolean) => [...s.exchanges].reverse().find(f);

// ───────────────────────── mini visuals ─────────────────────────

function WireTile({ ctx }: { ctx: PanelCtx }) {
  const { snap } = ctx;
  const last = snap.exchanges[snap.exchanges.length - 1];
  return (
    <div className="flex h-full flex-col gap-1.5">
      <div className="flex flex-wrap gap-[3px]" aria-hidden>
        {snap.exchanges.slice(-28).map((e, i, a) => (
          <span key={e.id} className="h-[7px] w-[7px] rounded-full" style={{ background: statusColor(e.status, e.outcome), opacity: 0.35 + (i / a.length) * 0.65 }} />
        ))}
      </div>
      <div className="mt-auto flex items-baseline gap-1.5">
        <Big>{snap.total}</Big>
        <Sub>{last ? `${last.req.method} ${last.path}` : "waiting"}</Sub>
      </div>
    </div>
  );
}

function PipelineTile({ ctx }: { ctx: PanelCtx }) {
  const { snap } = ctx;
  const lanes = snap.hooks.middleware ?? [];
  const last = lastWhere(snap, (e) => e.outcome === "ok" && e.trace.length > 0);
  const n = lanes.length + 2;
  const reach = last ? Math.max(0, ...last.trace.map((t) => lanes.indexOf(t) + 1)) : 0;
  const through = !!last && reach === lanes.length && last.status !== 304;
  const color = last ? statusColor(last.status) : DIM;
  const lit = through ? n : reach + 1;
  return (
    <div className="flex h-full flex-col">
      <svg viewBox={`0 0 ${n * 22} 26`} className="w-full" aria-label={`${lanes.length} middleware lanes`} role="img">
        {Array.from({ length: n - 1 }, (_, i) => (
          <line key={i} x1={i * 22 + 11} y1={13} x2={(i + 1) * 22 + 11} y2={13} stroke={i < lit - 1 ? color : DIM} strokeWidth={1.5} />
        ))}
        {Array.from({ length: n }, (_, i) => (
          <circle key={i} cx={i * 22 + 11} cy={13} r={i < lit ? 4.5 : 3.5} fill={i < lit ? color : "#1c1c1c"} stroke={i < lit ? color : "rgba(255,255,255,0.4)"} strokeWidth={1} />
        ))}
      </svg>
      <div className="mt-auto flex items-baseline gap-1.5">
        <Big>{lanes.length}</Big>
        <Sub>{last ? (through ? "last reached the handler" : `last stopped at ${lanes[Math.max(0, reach - 1)] ?? "the gate"}`) : "lanes"}</Sub>
      </div>
    </div>
  );
}

function RoutesTile({ ctx }: { ctx: PanelCtx }) {
  const { snap } = ctx;
  const top = Object.entries(snap.routeHits).sort((a, b) => b[1] - a[1]).slice(0, 2);
  const max = Math.max(1, ...top.map(([, n]) => n));
  return (
    <div className="flex h-full flex-col gap-[3px]">
      {top.length === 0 && <Sub>no hits yet</Sub>}
      {top.map(([k, n]) => (
        <div key={k} className="flex min-w-0 items-center gap-1.5">
          <span className="min-w-0 flex-1 truncate font-mono text-[10px] text-white/80">{k.replace("GET ", "")}</span>
          <span className="h-1.5 w-10 overflow-hidden rounded-full bg-white/10"><span className="block h-full bg-[#c5ee8a]" style={{ width: `${(n / max) * 100}%` }} /></span>
        </div>
      ))}
      <div className="mt-auto flex items-baseline gap-1.5">
        <Big>{snap.hooks.routes?.length ?? 0}</Big>
        <Sub>routes · {snap.misses.length} misses</Sub>
      </div>
    </div>
  );
}

function LogsTile({ ctx }: { ctx: PanelCtx }) {
  const lat = ctx.snap.latencies.slice(-40);
  const p95 = percentile(lat, 95);
  const max = Math.max(1, ...lat);
  return (
    <div className="flex h-full flex-col">
      <svg viewBox="0 0 120 26" preserveAspectRatio="none" className="h-[26px] w-full" aria-hidden>
        <polyline fill="none" stroke={LIME} strokeWidth={1.4} vectorEffect="non-scaling-stroke" points={lat.map((v, i) => `${(i / Math.max(1, lat.length - 1)) * 120},${24 - (v / max) * 22}`).join(" ")} />
      </svg>
      <div className="mt-auto flex items-baseline gap-1.5">
        <Big>{p95 === null ? "—" : `${Math.round(p95)}ms`}</Big>
        <Sub>p95 · {ctx.snap.hooks.logs?.length ?? 0} log lines</Sub>
      </div>
    </div>
  );
}

function StationsTile({ ctx }: { ctx: PanelCtx }) {
  const { board } = ctx.snap;
  const stations: Station[] = board.stations.length ? board.stations : SEED_STATIONS;
  const free = Object.values(board.bikes).flat().filter((b) => b.status === "available").length;
  return (
    <div className="flex h-full flex-col">
      <div className="relative h-[34px] w-full" aria-hidden>
        {stations.map((s) => {
          const seed = SEED_STATIONS.find((x) => x.id === s.id);
          const n = board.bikes[s.id]?.filter((b) => b.status === "available").length;
          return <span key={s.id} className="absolute h-[7px] w-[7px] -translate-x-1/2 rounded-full" style={{ left: `${s.x ?? seed?.x ?? 50}%`, top: `${((s.y ?? seed?.y ?? 50) / 90) * 100}%`, background: n === undefined ? DIM : n <= 1 ? "#fbbf24" : LIME, opacity: n === undefined ? 1 : 0.5 + Math.min(1, n / 5) * 0.5 }} />;
        })}
      </div>
      <div className="mt-auto flex items-baseline gap-1.5">
        <Big>{free}</Big>
        <Sub>bikes free · {stations.length} stations</Sub>
      </div>
    </div>
  );
}

function ValidationTile({ ctx }: { ctx: PanelCtx }) {
  const bad = lastWhere(ctx.snap, (e) => e.status === 400 && isRecord(e.body) && Array.isArray(e.body.errors));
  const fields = bad && isRecord(bad.body) && Array.isArray(bad.body.errors) ? bad.body.errors.filter(isRecord).map((e) => String(e.field)) : [];
  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap gap-1">
        {fields.slice(0, 4).map((f, i) => (
          <span key={`${f}:${i}`} className="rounded border border-[#f87171]/50 px-1.5 py-px font-mono text-[10px] text-[#fecaca]">{f}</span>
        ))}
        {fields.length === 0 && <Sub>no invalid input yet</Sub>}
      </div>
      <div className="mt-auto flex items-baseline gap-1.5">
        <Big tone={fields.length ? "warn" : "plain"}>{fields.length}</Big>
        <Sub>bad fields in the last 400</Sub>
      </div>
    </div>
  );
}

function ProblemsTile({ ctx }: { ctx: PanelCtx }) {
  const { counts, total } = ctx.snap;
  const t = Math.max(1, total);
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-2 overflow-hidden rounded-full bg-white/10" aria-hidden>
        {KLASSES.map((k) => <span key={k} style={{ width: `${(counts[k] / t) * 100}%`, background: KLASS_COLOR[k] }} />)}
      </div>
      <div className="mt-1.5 flex gap-2 font-mono text-[10px] text-white/80">
        <span>4xx {counts["4xx"]}</span>
        <span>5xx {counts["5xx"]}</span>
      </div>
      <div className="mt-auto flex items-baseline gap-1.5">
        <Big tone={counts["5xx"] > 0 ? "bad" : "plain"}>{Object.keys(ctx.snap.problemTypes).length}</Big>
        <Sub>problem types</Sub>
      </div>
    </div>
  );
}

function PagingTile({ ctx }: { ctx: PanelCtx }) {
  const page = lastWhere(ctx.snap, (e) => e.path === "/stations" && e.status === 200 && isRecord(e.body) && isRecord(e.body.page));
  const bikes = lastWhere(ctx.snap, (e) => e.path === "/bikes" && e.status === 200 && isRecord(e.body) && "next" in e.body);
  const p = page && isRecord(page.body) && isRecord(page.body.page) ? page.body.page : null;
  const next = bikes && isRecord(bikes.body) ? bikes.body.next : undefined;
  return (
    <div className="flex h-full flex-col gap-0.5">
      <span className="font-mono text-[10.5px] text-white/85">{p ? `offset ${asNum(p.offset)} · ${asNum(p.limit)} of ${asNum(p.total)}` : "offset: no page yet"}</span>
      <span className="truncate font-mono text-[10.5px] text-white/85">{next === undefined ? "cursor: no page yet" : `next: ${typeof next === "string" ? next : "null"}`}</span>
    </div>
  );
}

function AuthTile({ ctx }: { ctx: PanelCtx }) {
  const now = useNow(1000);
  const tokens = Object.values(ctx.snap.tokens);
  const soonest = tokens.length ? Math.min(...tokens.map((t) => t.at + t.expiresIn * 1000)) - now : 0;
  return (
    <div className="flex h-full flex-col">
      <div className="flex gap-1.5" aria-hidden>
        {RIDERS.map((r) => (
          <span key={r.id} className="grid h-5 w-5 place-items-center rounded-full text-[9px] font-semibold" style={ctx.snap.tokens[r.id] ? { background: LIME, color: "#0a0a0a" } : { background: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.8)" }}>
            {r.name.split(" ").map((p) => p[0]).join("")}
          </span>
        ))}
      </div>
      <div className="mt-auto flex items-baseline gap-1.5">
        <Big>{tokens.length}/4</Big>
        <Sub>{tokens.length && now > 0 ? `next expiry ${countdown(soonest)}` : "signed in"}</Sub>
      </div>
    </div>
  );
}

function AuthzTile({ ctx }: { ctx: PanelCtx }) {
  const m = ctx.snap.matrix;
  const done = Object.keys(m).length;
  return (
    <div className="flex h-full flex-col">
      <div className="grid w-fit grid-cols-5 gap-[3px]" aria-hidden>
        {RIDERS.flatMap((r) => MATRIX_ACTIONS.map((a) => {
          const c = m[`${r.id}:${a.id}`];
          return <span key={`${r.id}${a.id}`} className="h-[8px] w-[14px] rounded-[2px]" style={{ background: !c || c.status === null ? "rgba(255,255,255,0.12)" : c.status < 300 ? LIME : c.status === 401 ? "#f87171" : "#fbbf24" }} />;
        }))}
      </div>
      <div className="mt-auto flex items-baseline gap-1.5">
        <Big>{done}</Big>
        <Sub>of 20 checks answered</Sub>
      </div>
    </div>
  );
}

function IdemTile({ ctx }: { ctx: PanelCtx }) {
  const { ledger } = ctx.snap;
  const last = ledger[ledger.length - 1];
  return (
    <div className="flex h-full flex-col">
      <span className="truncate font-mono text-[10.5px] text-white/85">{last ? `${last.key} ×${last.attempts}` : "no keys yet"}</span>
      <div className="mt-1 flex gap-1">
        {last?.replay && <span className="rounded border border-[#c5ee8a]/50 px-1.5 text-[10px] text-[#e0f6c1]">replay</span>}
        {last?.conflict && <span className="rounded border border-[#fbbf24]/50 px-1.5 text-[10px] text-[#fde68a]">422</span>}
      </div>
      <div className="mt-auto flex items-baseline gap-1.5">
        <Big>{ledger.filter((r) => r.replay).length}</Big>
        <Sub>replays · {ledger.length} keys</Sub>
      </div>
    </div>
  );
}

function RateTile({ ctx }: { ctx: PanelCtx }) {
  const { buckets } = ctx.snap;
  const blocked = Object.values(buckets).reduce((n, b) => n + b.blocked, 0);
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-[26px] items-end gap-2" aria-hidden>
        {IPS.map((ip) => {
          const b = buckets[ip];
          const f = b && b.limit ? b.remaining / b.limit : 0;
          return <span key={ip} className="relative h-full w-6 overflow-hidden rounded-sm bg-white/10"><span className="absolute inset-x-0 bottom-0" style={{ height: `${Math.max(6, f * 100)}%`, background: !b ? DIM : f <= 0 ? "#f87171" : f < 0.35 ? "#fbbf24" : LIME }} /></span>;
        })}
      </div>
      <div className="mt-auto flex items-baseline gap-1.5">
        <Big tone={blocked ? "warn" : "plain"}>{blocked}</Big>
        <Sub>429s across 3 clients</Sub>
      </div>
    </div>
  );
}

function CacheTile({ ctx }: { ctx: PanelCtx }) {
  const { full, notModified } = ctx.snap.cache;
  const t = full + notModified;
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-2 overflow-hidden rounded-full bg-white/10" aria-hidden>
        <span style={{ width: `${t ? (full / t) * 100 : 0}%`, background: "#e5e5e5" }} />
        <span style={{ width: `${t ? (notModified / t) * 100 : 0}%`, background: LIME }} />
      </div>
      <div className="mt-1.5 flex gap-3 font-mono text-[10px] text-white/80"><span>200 {full}</span><span className="text-[#d3f3a4]">304 {notModified}</span></div>
      <div className="mt-auto flex items-baseline gap-1.5">
        <Big tone="accent">{t ? `${Math.round((notModified / t) * 100)}%` : "—"}</Big>
        <Sub>revalidated</Sub>
      </div>
    </div>
  );
}

const noop = () => () => {};
const none: readonly NetworkEntryView[] = [];
const getNone = () => none;

function RetryTile({ ctx }: { ctx: PanelCtx }) {
  const env = ctx.driver.program?.env ?? null;
  const entries = useSyncExternalStore(env ? env.network.subscribe : noop, env ? env.network.entries : getNone, getNone);
  const up = entries.filter((e) => e.url.startsWith("/upstream/")).slice(-4);
  const t0 = up.length ? Math.min(...up.map((e) => e.startedAt)) : 0;
  const ends = up.map((e) => e.endedAt ?? e.startedAt + Math.max(e.latency, 80));
  const span = Math.max(300, (ends.length ? Math.max(...ends) : 0) - t0);
  const retries = up.filter((e) => e.attempt > 1).length;
  return (
    <div className="flex h-full flex-col gap-[3px]">
      {up.map((e, i) => (
        <span key={e.id} className="relative h-[5px] rounded-full bg-white/[0.07]" aria-hidden>
          <span className="absolute top-0 h-full rounded-full" style={{ left: `${((e.startedAt - t0) / span) * 100}%`, width: `${Math.max(3, ((ends[i] - e.startedAt) / span) * 100)}%`, background: e.status === "ok" ? LIME : e.status === "pending" ? "#e5e5e5" : "#f87171" }} />
        </span>
      ))}
      {up.length === 0 && <Sub>no outbound calls yet</Sub>}
      <div className="mt-auto flex items-baseline gap-1.5">
        <Big tone={retries ? "warn" : "plain"}>{retries}</Big>
        <Sub>retries in the last {up.length || 0}</Sub>
      </div>
    </div>
  );
}

const STATE_COLOR = { closed: LIME, "half-open": "#fbbf24", open: "#f87171" } as const;

function BreakerTile({ ctx }: { ctx: PanelCtx }) {
  const b = ctx.snap.hooks.breaker;
  return (
    <div className="flex h-full flex-col">
      <div className="flex gap-2" aria-hidden>
        {(["closed", "half-open", "open"] as const).map((s) => (
          <span key={s} className={`h-3.5 w-3.5 rounded-full ${b?.state === s && s !== "closed" ? "dl-blink" : ""}`} style={{ background: b?.state === s ? STATE_COLOR[s] : "rgba(255,255,255,0.14)", boxShadow: b?.state === s ? `0 0 10px ${STATE_COLOR[s]}` : undefined }} />
        ))}
      </div>
      <div className="mt-auto flex items-baseline gap-1.5">
        <Big>{b?.state ?? "—"}</Big>
        <Sub>{b ? `${b.failures}/${b.threshold} failures` : "breaker"}</Sub>
      </div>
    </div>
  );
}

function ShutdownTile({ ctx }: { ctx: PanelCtx }) {
  const l = ctx.snap.hooks.lifecycle;
  const color = !l || l.state === "running" ? LIME : l.state === "draining" ? "#fbbf24" : "#f87171";
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-1" aria-hidden>
        <span className={`h-3.5 w-3.5 rounded-full ${l?.state === "draining" ? "dl-blink" : ""}`} style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
        {Array.from({ length: Math.min(l?.inFlight ?? 0, 8) }, (_, i) => <span key={i} className="dl-blink h-[6px] w-[6px] rounded-full bg-[#c5ee8a]" style={{ animationDelay: `${i * 80}ms` }} />)}
      </div>
      <div className="mt-auto flex items-baseline gap-1.5">
        <Big>{l?.state ?? "—"}</Big>
        <Sub>{l?.inFlight ?? 0} in flight</Sub>
      </div>
    </div>
  );
}

function TestsTile({ ctx }: { ctx: PanelCtx }) {
  const s = ctx.snap.suite;
  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap gap-[3px]" aria-hidden>
        {(s?.results ?? Array.from({ length: 15 }, () => null)).map((r, i) => <span key={i} className="h-[9px] w-[9px] rounded-[2px]" style={{ background: r === null ? DIM : r.ok ? LIME : "#f87171" }} />)}
      </div>
      <div className="mt-auto flex items-baseline gap-1.5">
        <Big tone={s && s.passed < s.total ? "warn" : "accent"}>{s ? `${s.passed}/${s.total}` : "—"}</Big>
        <Sub>passing</Sub>
      </div>
    </div>
  );
}

const TREE_SAMPLE = '{ stations(zone: "central") { name bikes { id battery } } }';

function ParserTile({ ctx }: { ctx: PanelCtx }) {
  const [nodes, setNodes] = useState<number | null>(null);
  const { driver } = ctx;
  const enabled = ctx.unlocked.has("api-graph-query") && ctx.snap.hasProgram;
  useEffect(() => {
    if (!enabled) return;
    const t = setTimeout(() => {
      const { doc } = parseQuery(driver, TREE_SAMPLE);
      const count = (s: { selections: unknown[] }[]): number => s.reduce((n, x) => n + 1 + count(x.selections as { selections: unknown[] }[]), 0);
      setNodes(doc ? count(doc.selections) : null);
    }, 0);
    return () => clearTimeout(t);
  }, [enabled, driver]);
  return (
    <div className="flex h-full flex-col">
      <div className="space-y-[3px]" aria-hidden>
        {[0, 1, 2].map((d) => <div key={d} className="h-[5px] rounded-full" style={{ marginLeft: d * 10, width: `${70 - d * 18}%`, background: nodes === null ? DIM : d === 0 ? "#d3f3a4" : "rgba(255,255,255,0.45)" }} />)}
      </div>
      <div className="mt-auto flex items-baseline gap-1.5">
        <Big>{nodes ?? "—"}</Big>
        <Sub>nodes in a sample tree</Sub>
      </div>
    </div>
  );
}

function GraphTile({ ctx }: { ctx: PanelCtx }) {
  const g = ctx.snap.lastGraph;
  const body = g && isRecord(g.body) ? g.body : null;
  const keys = body && isRecord(body.data) ? Object.keys(body.data) : [];
  const errors = body && Array.isArray(body.errors) ? body.errors.length : 0;
  return (
    <div className="flex h-full flex-col">
      <span className="truncate font-mono text-[10.5px] text-white/85">{keys.length ? `data { ${keys.join(", ")} }` : g ? `status ${g.status}` : "no query yet"}</span>
      <div className="mt-auto flex items-baseline gap-1.5">
        <Big tone={errors ? "warn" : "accent"}>{g ? errors : "—"}</Big>
        <Sub>errors in the last query</Sub>
      </div>
    </div>
  );
}

function SummaryTile({ ctx }: { ctx: PanelCtx }) {
  const { snap } = ctx;
  const bad = snap.counts["5xx"] + snap.counts.timeout;
  const p95 = percentile(snap.latencies, 95);
  return (
    <div className="flex min-w-0 flex-col justify-between rounded-lg border border-white/10 bg-[#c5ee8a]/[0.06] px-2.5 py-2">
      <div className="hud-label !text-[10.5px] !text-white/70">Dockline API</div>
      <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
        <Big>{snap.total}</Big><Big tone={bad ? "bad" : "accent"}>{p95 === null ? "—" : `${Math.round(p95)}ms`}</Big>
        <Sub>requests</Sub><Sub>p95</Sub>
      </div>
    </div>
  );
}

const BODIES: Record<string, (p: { ctx: PanelCtx }) => React.ReactNode> = {
  "api-wire": WireTile,
  "api-pipeline": PipelineTile,
  "api-routes": RoutesTile,
  "api-logs": LogsTile,
  "api-stations": StationsTile,
  "api-validation": ValidationTile,
  "api-problems": ProblemsTile,
  "api-paging": PagingTile,
  "api-auth": AuthTile,
  "api-authz": AuthzTile,
  "api-idempotency": IdemTile,
  "api-ratelimit": RateTile,
  "api-cache": CacheTile,
  "api-retry": RetryTile,
  "api-breaker": BreakerTile,
  "api-shutdown": ShutdownTile,
  "api-tests": TestsTile,
  "api-graph-query": ParserTile,
  "api-graph": GraphTile,
};

export function Overview({ ctx }: { ctx: PanelCtx }) {
  const { snap } = ctx;
  const live = FEATURES.filter((f) => ctx.unlocked.has(f.id)).length;
  const worst = snap.error ? "bad" : snap.counts["5xx"] + snap.counts.timeout > 0 ? "warn" : "ok";
  const tiles = FEATURES.map((f) => {
    const Body = BODIES[f.id];
    return (
      <Tile key={f.id} id={f.id} ctx={ctx}>
        <Body ctx={ctx} />
      </Tile>
    );
  });
  return (
    <div className="flex h-full flex-col gap-2">
      <div className="flex min-w-0 shrink-0 items-center gap-2 px-0.5">
        <span aria-hidden className="h-2.5 w-2.5 rounded-full" style={{ background: !snap.hasProgram ? "rgba(255,255,255,0.3)" : worst === "bad" ? "#f87171" : worst === "warn" ? "#fbbf24" : LIME, boxShadow: snap.hasProgram ? "0 0 8px rgba(197,238,138,.5)" : undefined }} />
        <h2 className="hud-title !text-[14px]">Dockline</h2>
        <span className="hud-label min-w-0 truncate !text-[11px] !text-white/65">· bike-share API</span>
        <span className="hud-label ml-auto shrink-0 !text-[11px]">
          <span className={`hud-value ${live > 0 ? "hud-accent" : "text-white/60"}`}>{live}</span>/19 features live
        </span>
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-4 grid-rows-5 gap-2">
        {tiles.slice(0, 19)}
        <SummaryTile ctx={ctx} />
      </div>
    </div>
  );
}
