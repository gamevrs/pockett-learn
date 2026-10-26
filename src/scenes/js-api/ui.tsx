"use client";

import React from "react";
import { Lock } from "lucide-react";
import { FeatureIcon } from "@/components/ui/icons";
import { klassOf, type Exchange, type Klass } from "./state";

/** Shared building blocks for the Dockline scene (Pockett Stage look: neutral greys, lime = your code). */

export const BTN =
  "inline-flex h-7 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full border border-white/15 bg-white/[0.06] px-2.5 text-[11px] font-medium text-white/90 transition-colors hover:bg-white/12 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#c5ee8a] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white/[0.06]";

export const BTN_ON =
  "inline-flex h-7 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full border border-transparent bg-[#c5ee8a] px-3 text-[11px] font-semibold text-[#0a0a0a] transition-colors hover:bg-[#d3f3a4] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-[#c5ee8a]";

export const INPUT =
  "h-7 min-w-0 rounded-md border border-white/15 bg-white/[0.05] px-2 text-[11px] text-white placeholder:text-white/60 outline-none transition-colors focus:border-[#c5ee8a]/70 disabled:cursor-not-allowed disabled:opacity-50";

export const CSS = `
@keyframes dl-run { from { transform: translateY(0); } to { transform: translateY(var(--dy, 0px)); } }
@keyframes dl-fade { to { opacity: 0; } }
.dl-dot { animation: dl-run var(--dur, 800ms) cubic-bezier(.45,.05,.35,1) both, dl-fade .5s linear calc(var(--dur, 800ms) + .9s) forwards; }
@keyframes dl-new { from { background-color: rgba(197,238,138,.2); } to { background-color: transparent; } }
.dl-new { animation: dl-new 1.1s ease-out both; }
@keyframes dl-blink { 50% { opacity: .35; } }
.dl-blink { animation: dl-blink 1.2s ease-in-out infinite; }
@keyframes dl-slide { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: none; } }
.dl-slide { animation: dl-slide .22s ease-out both; }
@keyframes dl-orbit { to { stroke-dashoffset: -24; } }
.dl-orbit { stroke-dasharray: 5 7; animation: dl-orbit 1.2s linear infinite; }
@media (prefers-reduced-motion: reduce) {
  .dl-dot { animation: none; transform: translateY(var(--dy, 0px)); opacity: .9; }
  .dl-new, .dl-blink, .dl-slide, .dl-orbit { animation: none !important; }
}
`;

// ───────────────────────── the nineteen features ─────────────────────────

export interface FeatureMeta {
  id: string;
  n: number;
  title: string;
  need: string;
  blurb: string;
}

export const FEATURES: FeatureMeta[] = [
  { id: "api-wire", n: 1, title: "Request log", need: "handle(raw)", blurb: "Every request in, every response out." },
  { id: "api-pipeline", n: 2, title: "Middleware lanes", need: "listMiddleware()", blurb: "Watch each request travel the chain." },
  { id: "api-routes", n: 3, title: "Route map", need: "listRoutes()", blurb: "Which routes get hit, and which requests miss." },
  { id: "api-logs", n: 4, title: "Structured log", need: "recentLogs(n)", blurb: "One JSON line per request, plus latency." },
  { id: "api-stations", n: 5, title: "Station board", need: "GET /stations/:id/bikes", blurb: "The city map, live from your API." },
  { id: "api-validation", n: 6, title: "Bad-request inspector", need: "errors[] on bad input", blurb: "Invalid input, field by field." },
  { id: "api-problems", n: 7, title: "Error dashboard", need: "problem+json errors", blurb: "Every failure as a problem document." },
  { id: "api-paging", n: 8, title: "List explorer", need: "limit · offset · cursor", blurb: "Walk a list page by page." },
  { id: "api-auth", n: 9, title: "Rider tokens", need: "POST /auth/token", blurb: "Log in, read the JWT, try to forge it." },
  { id: "api-authz", n: 10, title: "Access guard", need: "roles · 403 · 404", blurb: "Who may do what, tested for real." },
  { id: "api-idempotency", n: 11, title: "Idempotency ledger", need: "Idempotency-Key", blurb: "Double taps must not double rent." },
  { id: "api-ratelimit", n: 12, title: "Rate-limit buckets", need: "429 · retry-after", blurb: "A budget per client." },
  { id: "api-cache", n: 13, title: "Cache & 304", need: "ETag · if-none-match", blurb: "Revalidate instead of resending." },
  { id: "api-retry", n: 14, title: "Retries & backoff", need: "retry with backoff", blurb: "Outbound calls that try again." },
  { id: "api-breaker", n: 15, title: "Circuit breaker", need: "breakerState()", blurb: "Stop calling a broken upstream." },
  { id: "api-shutdown", n: 16, title: "Graceful shutdown", need: "shutdown() · lifecycleState()", blurb: "Drain in-flight work, then close." },
  { id: "api-tests", n: 17, title: "Test lab", need: "runSuite()", blurb: "Your API's own checks, as a grid." },
  { id: "api-graph-query", n: 18, title: "Query parser", need: "parseGraph(source)", blurb: "A query turned into a tree." },
  { id: "api-graph", n: 19, title: "Graph console", need: "POST /graphql", blurb: "Ask for exactly the fields you want." },
];

export const META: Record<string, FeatureMeta> = Object.fromEntries(FEATURES.map((f) => [f.id, f]));

export type TabId = "traffic" | "resources" | "guard" | "resilience" | "proof";

export const TABS: { id: TabId; label: string; features: string[] }[] = [
  { id: "traffic", label: "Traffic", features: ["api-wire", "api-pipeline", "api-routes", "api-logs"] },
  { id: "resources", label: "Resources", features: ["api-stations", "api-validation", "api-problems", "api-paging"] },
  { id: "guard", label: "Guard", features: ["api-auth", "api-authz", "api-idempotency", "api-ratelimit"] },
  { id: "resilience", label: "Resilience", features: ["api-cache", "api-retry", "api-breaker", "api-shutdown"] },
  { id: "proof", label: "Proof & Graph", features: ["api-tests", "api-graph-query", "api-graph"] },
];

export const TAB_OF: Record<string, TabId> = Object.fromEntries(TABS.flatMap((t) => t.features.map((f) => [f, t.id])));

// ───────────────────────── panel chrome ─────────────────────────

export function Locked({ id, spot, compact = false, className = "" }: { id: string; spot: boolean; compact?: boolean; className?: string }) {
  const m = META[id];
  return (
    <section data-panel={id} data-locked="" className={`rounded-[10px] border border-dashed ${compact ? "px-3 py-2" : "px-3 py-3"} ${spot ? "pulse-ring border-[#c5ee8a]/60" : "border-white/20"} ${className}`}>
      <div className="flex min-w-0 items-center gap-2">
        <Lock className="h-3 w-3 shrink-0 text-white/60" aria-hidden />
        <h3 className="hud-label min-w-0 flex-1 truncate !text-white/60">{m.title}</h3>
        <span className="hud-label shrink-0 !text-white/60">L{m.n}</span>
      </div>
      <p className="mt-1.5 text-[11px] leading-snug text-white/60">
        {spot ? <span className="hud-accent">Pass this lesson to switch it on · </span> : "Locked · "}
        needs <code className="rounded bg-white/[0.08] px-1 py-px font-mono text-[10.5px] text-white/80">{m.need}</code>
      </p>
    </section>
  );
}

export function Panel({
  id,
  icon = true,
  meta,
  actions,
  focus,
  flash,
  children,
  className = "",
  bodyClassName = "",
}: {
  id: string;
  icon?: boolean;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
  focus?: boolean;
  flash?: boolean;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  const m = META[id];
  return (
    <section data-panel={id} className={`hud-panel @container flex min-h-0 min-w-0 flex-col !p-0 ${focus ? "!border-[#c5ee8a]/40" : ""} ${flash ? "pop-in" : ""} ${className}`}>
      <header className="flex min-w-0 shrink-0 flex-wrap items-center gap-x-2 gap-y-1 border-b border-white/[0.08] px-3 py-2">
        {icon && <FeatureIcon id={id} className="h-3.5 w-3.5 shrink-0 text-[#c5ee8a]" />}
        <h3 className="hud-title min-w-0 truncate">{m.title}</h3>
        {meta && <span className="hud-value min-w-0 truncate text-[10px] text-white/65">{meta}</span>}
        {actions && <div className="ml-auto flex shrink-0 flex-wrap items-center gap-1.5">{actions}</div>}
      </header>
      <div className={`min-h-0 flex-1 ${bodyClassName}`}>{children}</div>
    </section>
  );
}

export function Notice({ tone, children }: { tone: "ok" | "warn" | "bad"; children: React.ReactNode }) {
  const cls =
    tone === "bad"
      ? "border-[#f87171]/45 bg-[#f87171]/10 text-[#fecaca]"
      : tone === "warn"
        ? "border-[#fbbf24]/40 bg-[#fbbf24]/10 text-[#fde68a]"
        : "border-[#c5ee8a]/35 bg-[#c5ee8a]/10 text-[#e0f6c1]";
  return (
    <div role={tone === "bad" ? "alert" : undefined} className={`rounded-md border px-2.5 py-1.5 text-[11px] leading-snug ${cls}`}>
      {children}
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="px-3 py-3 text-[11px] leading-snug text-white/60">{children}</p>;
}

export function Chip({ children, tone = "plain", className = "", title }: { children: React.ReactNode; tone?: "plain" | "ok" | "warn" | "bad" | "dim"; className?: string; title?: string }) {
  const cls =
    tone === "ok"
      ? "border-[#c5ee8a]/40 text-[#e0f6c1]"
      : tone === "warn"
        ? "border-[#fbbf24]/45 text-[#fde68a]"
        : tone === "bad"
          ? "border-[#f87171]/50 text-[#fecaca]"
          : tone === "dim"
            ? "border-white/12 text-white/60"
            : "border-white/20 text-white/80";
  return (
    <span title={title} className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-1.5 py-px font-mono text-[10px] font-semibold tabular-nums ${cls} ${className}`}>
      {children}
    </span>
  );
}

// ───────────────────────── status colours ─────────────────────────

export const KLASS_COLOR: Record<Klass, string> = {
  "2xx": "#c5ee8a",
  "3xx": "#e5e5e5",
  "4xx": "#fbbf24",
  "5xx": "#f87171",
  timeout: "#f87171",
};

export const statusColor = (status: number, outcome: Exchange["outcome"] = "ok") => KLASS_COLOR[klassOf({ status, outcome })];

export function Code({ ex, status, outcome = "ok" }: { ex?: Pick<Exchange, "status" | "outcome">; status?: number; outcome?: Exchange["outcome"] }) {
  const s = ex?.status ?? status ?? 0;
  const o = ex?.outcome ?? outcome;
  const k = klassOf({ status: s, outcome: o });
  const tone = k === "2xx" ? "ok" : k === "4xx" ? "warn" : k === "3xx" ? "plain" : "bad";
  return <Chip tone={tone}>{o === "timeout" ? "timeout" : o === "junk" ? "no reply" : s}</Chip>;
}

export function Dot({ color, size = 8, hollow = false, className = "" }: { color: string; size?: number; hollow?: boolean; className?: string }) {
  return <span aria-hidden className={`inline-block shrink-0 rounded-full ${className}`} style={{ width: size, height: size, background: hollow ? "transparent" : color, border: hollow ? `1.5px solid ${color}` : undefined }} />;
}

/** A tiny line chart of recent values. */
export function Spark({ values, height = 28, color = "#c5ee8a", label }: { values: number[]; height?: number; color?: string; label: string }) {
  if (values.length < 2) return <div className="grid place-items-center text-[10px] text-white/60" style={{ height }}>collecting…</div>;
  const w = 120;
  const max = Math.max(...values, 1);
  const pts = values.map((v, i) => `${((i / (values.length - 1)) * w).toFixed(1)},${(height - 2 - (v / max) * (height - 4)).toFixed(1)}`);
  return (
    <svg role="img" aria-label={label} viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" className="block w-full" style={{ height }}>
      <polyline points={pts.join(" ")} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export function Stat({ label, value, tone = "plain", sub }: { label: string; value: React.ReactNode; tone?: "plain" | "accent" | "warn" | "bad"; sub?: string }) {
  const cls = tone === "accent" ? "hud-accent" : tone === "warn" ? "hud-warning" : tone === "bad" ? "hud-danger" : "";
  return (
    <div className="min-w-0 rounded-md bg-white/[0.05] px-2 py-1.5">
      <div className="hud-label truncate !text-white/60">{label}</div>
      <div className={`hud-value mt-0.5 truncate text-[14px] leading-tight ${cls}`}>
        {value}
        {sub && <span className="ml-1 text-[10px] font-normal text-white/60">{sub}</span>}
      </div>
    </div>
  );
}

export function Method({ m }: { m: string }) {
  const color = m === "GET" ? "text-white/75" : m === "DELETE" ? "text-[#f87171]" : "text-[#fbbf24]";
  return <span className={`shrink-0 font-mono text-[10px] font-semibold ${color}`}>{m}</span>;
}
