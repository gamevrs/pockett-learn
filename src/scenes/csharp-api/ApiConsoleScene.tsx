"use client";

import React from "react";
import { Lock, Play } from "lucide-react";
import type { SceneProps } from "@/engine/scene";
import { FeatureIcon } from "@/components/ui/icons";
import { outputLines } from "../csharp-basics/data";
import { Frame, LockedPanel, WaitingPanel, type GhostKind } from "../csharp-basics/panels";
import { readAny, readApi, SCENE_KEYS, statusColor, type ApiData, type Exchange } from "./data";
import {
  Access, CacheValidators, ConsolePanel, Container, DayReport, Endpoints, FlagsPanel, HealthBoard, IdempotencyLedger, Ledger, LogStream, Latency, Lanes,
  Outbox, Problems, RateLimits, RequestLog, RouteTable, TestResults, Upstream, Versions,
} from "./panels";

/**
 * Crux operations console: the live board for the Crux Desk course.
 *
 * The program can't be called back, so the console draws what it printed: stdout for the output tab and every
 * `Board.Show("key", value)` line (an `@scene` line) for the panels. A failed build arrives as a `build_error`
 * value and is drawn on the console with its line number. Each panel is a ghost until its lesson is passed, and
 * shows a "press Run" hint when it is unlocked but nothing has been built on this page yet.
 *
 * Colour follows the Pockett Stage system: neutral greys for structure, lime only for values the learner's code
 * produced, amber for caution, red for failures.
 */

interface PanelSpec {
  id: string;
  title: string;
  lesson: number;
  clause: string;
  ghost: GhostKind;
  /** Short value shown on the compact overview chip. */
  chip: (d: ApiData) => string | undefined;
  meta?: (d: ApiData) => string | undefined;
}

const count = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
const statusCount = (list: Exchange[], match: (e: Exchange) => boolean) => list.filter(match).length;

const PANELS: PanelSpec[] = [
  { id: "ca-requests", title: "Request log", lesson: 1, clause: "record Request · Parse", ghost: "rows", chip: (d) => (d.requests.length ? count(d.requests.length, "request") : undefined), meta: (d) => (d.requests.length ? count(d.requests.length, "request") : undefined) },
  { id: "ca-routes", title: "Route table", lesson: 2, clause: "templates · constraints · 404 / 405", ghost: "rows", chip: (d) => (d.routes.table.length ? count(d.routes.table.length, "route") : undefined), meta: (d) => (d.routes.table.length ? count(d.routes.table.length, "route") : undefined) },
  { id: "ca-pipeline", title: "Middleware lanes", lesson: 3, clause: "Use · Map · next", ghost: "grid", chip: (d) => (d.pipeline.length ? count(d.pipeline.length, "flow") : undefined) },
  { id: "ca-di", title: "Container", lesson: 4, clause: "singleton · scoped · transient", ghost: "cards", chip: (d) => (d.di.services.length ? count(d.di.services.length, "service") : undefined) },
  { id: "ca-endpoints", title: "Endpoints", lesson: 5, clause: "binding · controllers · IResult", ghost: "rows", chip: (d) => (d.endpointTable.length ? count(d.endpointTable.length, "endpoint") : undefined), meta: (d) => (d.endpointTable.length ? count(d.endpointTable.length, "route") : undefined) },
  { id: "ca-problems", title: "Problem details", lesson: 6, clause: "validation · RFC 7807", ghost: "cards", chip: (d) => (d.problems.length ? `${statusCount(d.problems, (e) => e.status >= 400)} problems` : undefined) },
  { id: "ca-store", title: "Booking ledger", lesson: 7, clause: "unit of work · row versions", ghost: "rows", chip: (d) => (d.rows.length ? count(d.rows.length, "row") : undefined), meta: (d) => (d.rows.length ? count(d.rows.length, "row") : undefined) },
  { id: "ca-auth", title: "Access decisions", lesson: 8, clause: "HMAC token · policies · ownership", ghost: "pills", chip: (d) => (d.auth.length ? `${statusCount(d.auth, (e) => e.status < 300)}/${d.auth.length} allowed` : undefined) },
  { id: "ca-ratelimit", title: "Rate limits", lesson: 9, clause: "token bucket · 429", ghost: "bars", chip: (d) => (d.ratelimit.length ? `${statusCount(d.ratelimit, (e) => e.status === 429)} throttled` : undefined) },
  { id: "ca-idempotency", title: "Idempotency ledger", lesson: 10, clause: "Idempotency-Key · replay", ghost: "rows", chip: (d) => (d.idempotency.length ? `${statusCount(d.idempotency, (e) => e.headers["Idempotent-Replayed"] === "true")} replayed` : undefined) },
  { id: "ca-cache", title: "Cache validators", lesson: 11, clause: "ETag · If-None-Match · 304", ghost: "rows", chip: (d) => (d.caching.length ? `${statusCount(d.caching, (e) => e.status === 304)} × 304` : undefined) },
  { id: "ca-logs", title: "Log stream", lesson: 12, clause: "scopes · correlation ids", ghost: "rows", chip: (d) => (d.telemetry.logs.length ? count(d.telemetry.logs.length, "event") : undefined), meta: (d) => (d.telemetry.logs.length ? count(d.telemetry.logs.length, "event") : undefined) },
  { id: "ca-latency", title: "Latency histogram", lesson: 12, clause: "counters · p50 · p95", ghost: "bars", chip: (d) => (d.telemetry.p95 !== undefined ? `p95 ≤ ${d.telemetry.p95} ms` : undefined) },
  { id: "ca-health", title: "Health board", lesson: 13, clause: "live · ready · startup", ghost: "pills", chip: (d) => (d.health.length ? (d.health.some((e) => e.status >= 500) ? "503 seen" : "all 200") : undefined) },
  { id: "ca-resilience", title: "Upstream calls", lesson: 14, clause: "timeout · retry · breaker", ghost: "slots", chip: (d) => (d.resilience.calls.length ? count(d.resilience.calls.length, "send") : undefined) },
  { id: "ca-outbox", title: "Outbox", lesson: 15, clause: "outbox · worker · CancellationToken", ghost: "slots", chip: (d) => { const last = d.outboxQueue.stages.at(-1)?.[1]; return last ? `${last.filter((m) => m.status === "Sent").length} sent` : undefined; } },
  { id: "ca-flags", title: "Feature flags", lesson: 16, clause: "stable percentage rollout", ghost: "bars", chip: (d) => (d.rollout.steps.length ? (d.rollout.stable ? "stable rollout" : "unstable") : undefined) },
  { id: "ca-tests", title: "Test results", lesson: 17, clause: "in-process request tests", ghost: "rows", chip: (d) => (d.tests.length ? `${d.tests.filter((t) => t.passed).length}/${d.tests.length} pass` : undefined) },
  { id: "ca-versions", title: "Versions & paging", lesson: 18, clause: "/v2 · pages · next links", ghost: "rows", chip: (d) => (d.versions.length ? count(d.versions.filter((e) => e.path.startsWith("/v2")).length, "page") : undefined) },
  { id: "ca-report", title: "Day report", lesson: 19, clause: "the whole request day", ghost: "tiles", chip: (d) => (d.report?.requests !== undefined ? count(d.report.requests, "request") : undefined) },
];

const TOTAL_SYSTEMS = PANELS.length + 1;

function panelBody(id: string, d: ApiData, allLive: boolean): React.ReactNode {
  switch (id) {
    case "ca-requests": return <RequestLog d={d} />;
    case "ca-routes": return <RouteTable d={d} />;
    case "ca-pipeline": return <Lanes d={d} />;
    case "ca-di": return <Container d={d} />;
    case "ca-endpoints": return <Endpoints d={d} />;
    case "ca-problems": return <Problems d={d} />;
    case "ca-store": return <Ledger d={d} />;
    case "ca-auth": return <Access d={d} />;
    case "ca-ratelimit": return <RateLimits d={d} />;
    case "ca-idempotency": return <IdempotencyLedger d={d} />;
    case "ca-cache": return <CacheValidators d={d} />;
    case "ca-logs": return <LogStream d={d} />;
    case "ca-latency": return <Latency d={d} />;
    case "ca-health": return <HealthBoard d={d} />;
    case "ca-resilience": return <Upstream d={d} />;
    case "ca-outbox": return <Outbox d={d} />;
    case "ca-flags": return <FlagsPanel d={d} />;
    case "ca-tests": return <TestResults d={d} />;
    case "ca-versions": return <Versions d={d} />;
    default: return <DayReport d={d} allLive={allLive} />;
  }
}

/** The most recent list of exchanges, for the traffic strip on the overview. */
function latestTraffic(d: ApiData): Exchange[] {
  for (const list of [d.day, d.versions, d.flags, d.ops, d.health, d.caching, d.idempotency, d.ratelimit, d.auth, d.bookings, d.problems, d.endpoints, d.pipeline]) if (list.length > 0) return list;
  return [];
}

const OVERVIEW_W = 780;
const OVERVIEW_H = 520;
const SHELL_TOP = 44;
const isCompact = (box: { w: number; h: number } | null) => box !== null && box.w >= 420 && box.h <= 600 && box.w / box.h >= 1.2;

function Overview({ d, built, unlocked, focus, flashing, liveCount, linesPrinted }: { d: ApiData; built: boolean; unlocked: ReadonlySet<string>; focus: string | null; flashing: Set<string>; liveCount: number; linesPrinted: number }) {
  const traffic = latestTraffic(d).slice(-34);
  const chips: { id: string; title: string; lesson: number; value: string | undefined }[] = [
    { id: "ca-console", title: "Console", lesson: 1, value: `${linesPrinted} line${linesPrinted === 1 ? "" : "s"} printed` },
    ...PANELS.map((p) => ({ id: p.id, title: p.title, lesson: p.lesson, value: p.chip(d) })),
  ];
  return (
    <div className="flex h-full w-full flex-col gap-2.5">
      <div className="flex min-w-0 items-center gap-2 px-0.5">
        <span className={`h-2 w-2 rounded-full ${d.error ? "bg-[#f87171]" : built ? "bg-[#c5ee8a]" : "bg-white/25"}`} />
        <h2 className="hud-title !text-[14px]">Crux operations console</h2>
        <span className={`hud-label min-w-0 truncate !text-[11px] ${d.error ? "hud-danger" : "text-white/55"}`}>· {d.error ? (d.error.type === "CompileError" ? "build failed" : "crashed") : built ? "platform online" : "waiting for a build"}</span>
        <span className="hud-label ml-auto shrink-0 !text-[11px]">
          <span className={`hud-value ${liveCount > 0 ? "hud-accent" : "text-white/45"}`}>{liveCount}</span>/{TOTAL_SYSTEMS} systems live
        </span>
      </div>
      <div className="hud-panel flex shrink-0 items-center gap-3 !px-3 !py-2">
        <span className="hud-title shrink-0">Traffic</span>
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-[3px]">
          {traffic.length === 0 ? <span className="hud-muted text-[11px]">{built ? "No traffic replayed yet." : "Press Run to replay the recorded day."}</span> : traffic.map((e, i) => <span key={i} title={`${e.method} ${e.path} → ${e.status}`} className="h-3 w-3 rounded-[3px]" style={{ background: statusColor(e.status) }} />)}
        </div>
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-4 auto-rows-fr gap-2">
        {chips.map((c) => {
          const on = unlocked.has(c.id);
          if (!on) {
            return (
              <div key={c.id} data-panel={c.id} data-locked="" className={`flex min-w-0 items-center gap-2 rounded-lg border border-dashed px-2.5 py-2 ${focus === c.id ? "pulse-ring border-[#c5ee8a]/60" : "border-white/15"}`}>
                <Lock className="h-3.5 w-3.5 shrink-0 text-white/35" aria-hidden />
                <span className="hud-label min-w-0 flex-1 truncate !text-[11px]">{c.title}</span>
                <span className="hud-label shrink-0 !text-[10px] text-white/30">L{c.lesson}</span>
              </div>
            );
          }
          return (
            <div key={c.id} data-panel={c.id} className={`flex min-w-0 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-2 ${flashing.has(c.id) ? "pop-in" : ""}`}>
              {built ? <FeatureIcon id={c.id} className="h-3.5 w-3.5 shrink-0 text-[#c5ee8a]" /> : <Play className="h-3.5 w-3.5 shrink-0 text-[#c5ee8a]/70" aria-hidden />}
              <div className="min-w-0 flex-1">
                <div className="hud-label truncate !text-[10px]">{c.title}</div>
                <div className="hud-value truncate text-[12px] leading-tight" style={{ color: c.value === undefined ? "rgba(255,255,255,0.3)" : "#f4f4f4" }}>
                  {!built ? "Press Run" : (c.value ?? "—")}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function ApiConsoleScene({ program, unlocked, focus, celebration, interactive }: SceneProps) {
  const [box, setBox] = React.useState<{ w: number; h: number } | null>(null);
  const measure = React.useCallback((el: HTMLDivElement | null) => {
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setBox((prev) => (prev && Math.abs(prev.w - width) < 1 && Math.abs(prev.h - height) < 1 ? prev : { w: width, h: height }));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const d = readApi(program);
  const flashing = new Set(celebration?.features ?? []);
  const compileFailed = d.error?.type === "CompileError";
  const liveCount = ["ca-console", ...PANELS.map((p) => p.id)].filter((id) => unlocked.has(id)).length;
  const allLive = liveCount === TOTAL_SYSTEMS;
  const keys: [string, unknown][] = program
    ? SCENE_KEYS.flatMap((k): [string, unknown][] => {
        const v = readAny(program, k);
        return v === undefined ? [] : [[k, v]];
      })
    : [];
  const lines = program ? outputLines(program.stdout).length : 0;

  if (box && isCompact(box)) {
    const availH = Math.max(box.h - SHELL_TOP, 120);
    const scale = Math.min(box.w / OVERVIEW_W, availH / OVERVIEW_H);
    return (
      <div ref={measure} className="absolute inset-0 overflow-hidden">
        <div className="absolute" style={{ width: OVERVIEW_W, height: OVERVIEW_H, left: (box.w - OVERVIEW_W * scale) / 2, top: SHELL_TOP + (availH - OVERVIEW_H * scale) / 2, transform: `scale(${scale})`, transformOrigin: "top left" }}>
          <Overview d={d} built={!!program} unlocked={unlocked} focus={focus} flashing={flashing} liveCount={liveCount} linesPrinted={lines} />
        </div>
      </div>
    );
  }

  const renderPanel = (p: PanelSpec) => {
    if (!unlocked.has(p.id)) return <LockedPanel key={p.id} id={p.id} title={p.title} kind={p.ghost} lesson={p.lesson} clause={p.clause} spot={focus === p.id} />;
    if (!program) return <WaitingPanel key={p.id} id={p.id} title={p.title} kind={p.ghost} lesson={p.lesson} />;
    return (
      <Frame
        key={flashing.has(p.id) ? `${p.id}:${celebration?.nonce}` : p.id}
        id={p.id}
        title={p.title}
        icon={<FeatureIcon id={p.id} className="h-3.5 w-3.5" />}
        meta={compileFailed ? undefined : p.meta?.(d)}
        focus={focus === p.id}
        flash={flashing.has(p.id)}
      >
        {compileFailed ? <p className="hud-log hud-muted py-1 text-[11px]">Waiting for a successful build. Fix the error on the console and press Run.</p> : panelBody(p.id, d, allLive)}
      </Frame>
    );
  };

  const focused = PANELS.find((p) => p.id === focus) ?? null;
  const rest = PANELS.filter((p) => p.id !== focused?.id);

  return (
    <div ref={measure} className={`@container absolute inset-0 ${interactive ? "overflow-y-auto overscroll-contain" : "overflow-hidden"}`}>
      <div className="px-3 pb-3 pt-12">
        <div className="mb-3 flex min-w-0 items-baseline gap-x-3 gap-y-0.5 px-0.5">
          <h2 className="hud-title min-w-0 truncate">Crux operations console</h2>
          <span className="hud-label ml-auto shrink-0">
            <span className={`hud-value ${liveCount > 0 ? "hud-accent" : "text-white/45"}`}>{liveCount}</span>/{TOTAL_SYSTEMS} systems live
          </span>
        </div>
        <div className="gap-3 @xl:columns-2 @4xl:columns-3 @7xl:columns-4">
          <ConsolePanel
            stdout={program?.stdout ?? ""}
            built={!!program}
            error={d.error}
            keys={keys}
            live={!!program}
            interactive={interactive}
            focus={focus === "ca-console"}
            flash={flashing.has("ca-console")}
            locked={!unlocked.has("ca-console")}
            ghost={<div className="space-y-1.5 rounded-md border border-dashed border-white/10 p-2">{[80, 55, 68].map((w) => <div key={w} className="h-1.5 rounded-sm bg-white/[0.05]" style={{ width: `${w}%` }} />)}</div>}
          />
          {focused && renderPanel(focused)}
          {rest.map(renderPanel)}
        </div>
      </div>
    </div>
  );
}
