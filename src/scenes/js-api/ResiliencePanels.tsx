"use client";

import React, { useState, useSyncExternalStore } from "react";
import { CloudLightning, Power, RotateCw, ServerOff, Snail, Zap } from "lucide-react";
import { breakUpstream, callForecast, changeStation, conditionalGet, failUpstream, restartNow, shutdownNow, toggleSlow } from "./actions";
import { Feature, NeedsHook, type PanelCtx } from "./feature";
import { useNow } from "./hooks";
import { isRecord, asNum, asStr, type BreakerInfo } from "./types";
import type { NetworkEntryView } from "@/engine/program";
import { BTN, BTN_ON, Chip, Code, Empty } from "./ui";
import { countdown, fmtMs } from "./util";

/** L13-L16: cache and 304, retries, the circuit breaker and graceful shutdown. */

// ───────────────────────── L13 cache ─────────────────────────

export function CachePanel({ ctx }: { ctx: PanelCtx }) {
  const { snap, driver } = ctx;
  const c = snap.cache;
  const total = c.full + c.notModified;
  const lastConditional = [...snap.exchanges].reverse().find((e) => e.req.headers?.["if-none-match"] && e.req.method === "GET");
  return (
    <Feature
      id="api-cache"
      ctx={ctx}
      meta={total > 0 ? `${Math.round((c.notModified / total) * 100)}% revalidated` : undefined}
      actions={
        ctx.interactive && (
          <>
            <button type="button" className={BTN_ON} onClick={() => void conditionalGet(driver, "/stations/st-03")} aria-label="Fetch station st-03, sending the ETag we have">
              <RotateCw className="h-3 w-3" aria-hidden /> Fetch
            </button>
            <button type="button" className={BTN} onClick={() => void changeStation(driver)} aria-label="Change station st-03 so its ETag changes">
              <Zap className="h-3 w-3" aria-hidden /> Change data
            </button>
          </>
        )
      }
    >
      <NeedsHook ctx={ctx} hook="handle">
        <div className="px-3 py-2">
          <div className="grid grid-cols-3 gap-1.5">
            <div className="rounded-md bg-white/[0.05] px-2 py-1.5">
              <div className="hud-label !text-white/60">200 full</div>
              <div className="hud-value text-[15px]">{c.full}</div>
            </div>
            <div className="rounded-md bg-[#c5ee8a]/10 px-2 py-1.5">
              <div className="hud-label !text-[#d3f3a4]">304 saved</div>
              <div className="hud-value hud-accent text-[15px]">{c.notModified}</div>
            </div>
            <div className="rounded-md bg-white/[0.05] px-2 py-1.5">
              <div className="hud-label !text-white/60">Bytes sent</div>
              <div className="hud-value text-[15px]">{c.bytes > 1024 ? `${(c.bytes / 1024).toFixed(1)}k` : c.bytes}</div>
            </div>
          </div>
          <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-white/10" role="img" aria-label={`${c.full} full responses, ${c.notModified} not modified`}>
            <span style={{ width: `${total ? (c.full / total) * 100 : 0}%`, background: "#e5e5e5" }} />
            <span style={{ width: `${total ? (c.notModified / total) * 100 : 0}%`, background: "#c5ee8a" }} />
          </div>
          <div className="mt-2 flex min-w-0 flex-wrap items-center gap-1.5">
            {c.etag ? <Chip tone="plain" title="etag header">etag {c.etag}</Chip> : <Chip tone="dim">no etag yet</Chip>}
            {c.cacheControl && <Chip tone="plain" title="cache-control header">{c.cacheControl}</Chip>}
            {c.last !== null && <Chip tone={c.last === 304 ? "ok" : "plain"}>last {c.last}</Chip>}
          </div>
          {lastConditional && (
            <p className="mt-2 truncate font-mono text-[10.5px] text-white/75">
              if-none-match {lastConditional.req.headers?.["if-none-match"]} → <span className={lastConditional.status === 304 ? "text-[#d3f3a4]" : ""}>{lastConditional.status}</span> {lastConditional.path}
            </p>
          )}
          {total === 0 && <p className="mt-1 text-[11px] text-white/60">Send a conditional GET: the second one should answer 304 with no body.</p>}
        </div>
      </NeedsHook>
    </Feature>
  );
}

// ───────────────────────── L14 retries ─────────────────────────

const EMPTY: readonly NetworkEntryView[] = [];
const noopSubscribe = () => () => {};
const getEmpty = () => EMPTY;

const BAR: Record<NetworkEntryView["status"], string> = {
  pending: "bg-white/45",
  ok: "bg-[#c5ee8a]",
  "http-error": "bg-[#f87171]",
  failed: "bg-[#f87171]",
  aborted: "bg-white/30",
};

export function RetryPanel({ ctx }: { ctx: PanelCtx }) {
  const { snap, driver } = ctx;
  const env = driver.program?.env ?? null;
  const entries = useSyncExternalStore(env ? env.network.subscribe : noopSubscribe, env ? env.network.entries : getEmpty, getEmpty);
  const upstream = entries.filter((e) => e.url.startsWith("/upstream/")).slice(-9);
  const lastForecast = snap.forecasts[snap.forecasts.length - 1];
  const t0 = upstream.length ? Math.min(...upstream.map((e) => e.startedAt)) : 0;
  const ends = upstream.map((e) => e.endedAt ?? e.startedAt + Math.max(e.latency, 80));
  const span = Math.max(300, (ends.length ? Math.max(...ends) : 0) - t0);
  return (
    <Feature
      id="api-retry"
      ctx={ctx}
      meta={`${upstream.length} upstream calls`}
      actions={
        ctx.interactive && (
          <>
            <button type="button" className={BTN} onClick={() => failUpstream(driver, 2)} aria-label="Make the next 2 upstream calls fail">
              <CloudLightning className="h-3 w-3" aria-hidden /> Fail next 2
            </button>
            <button type="button" className={snap.slow ? BTN_ON : BTN} aria-pressed={snap.slow} onClick={() => toggleSlow(driver)} aria-label="Slow the upstream down">
              <Snail className="h-3 w-3" aria-hidden /> Slow upstream
            </button>
            <button type="button" className={BTN_ON} onClick={() => void callForecast(driver)} aria-label="Ask for a station forecast">
              <Zap className="h-3 w-3" aria-hidden /> Forecast
            </button>
          </>
        )
      }
    >
      <NeedsHook ctx={ctx} hook="handle">
        {upstream.length === 0 ? (
          <Empty>No outbound calls yet. A forecast request makes your API call its weather feed.</Empty>
        ) : (
          <ul className="space-y-1 px-3 py-2" aria-label="Upstream calls">
            {upstream.map((e, i) => {
              const left = ((e.startedAt - t0) / span) * 100;
              const width = Math.max(1.5, ((ends[i] - e.startedAt) / span) * 100);
              return (
                <li key={e.id} className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 gap-y-0.5 @md:grid-cols-[minmax(0,9rem)_minmax(0,1fr)_auto]">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <span className="min-w-0 truncate font-mono text-[10.5px] text-white/90">{e.url.replace("/upstream/forecast/", "…/")}</span>
                    {e.attempt > 1 && <Chip tone="warn">try {e.attempt}</Chip>}
                  </div>
                  <div className="flex items-center justify-end gap-1 @md:order-3">
                    <Chip tone={e.status === "ok" ? "ok" : e.status === "pending" ? "plain" : "bad"}>{e.code ?? e.note ?? e.status}</Chip>
                    <span className="hud-value w-12 text-right text-[10px] text-white/70">{e.endedAt !== null ? fmtMs(e.endedAt - e.startedAt) : "…"}</span>
                  </div>
                  <div className="relative col-span-2 h-2 rounded-full bg-white/[0.07] @md:col-span-1 @md:order-2" aria-hidden>
                    <span className={`absolute top-0 h-full rounded-full ${BAR[e.status]} ${e.status === "pending" ? "dl-blink" : ""}`} style={{ left: `${left}%`, width: `${Math.min(width, 100 - left)}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {lastForecast && (
          <div className="flex min-w-0 flex-wrap items-center gap-1.5 border-t border-white/[0.08] px-3 py-2 text-[11px]">
            <span className="hud-label !text-white/60">Last forecast</span>
            <Code ex={lastForecast} />
            {isRecord(lastForecast.body) && (
              <>
                <Chip tone={lastForecast.body.source === "live" ? "ok" : "warn"}>{asStr(lastForecast.body.source, "unknown source")}</Chip>
                <span className="text-white/80">
                  {asStr(lastForecast.body.zone)} · {asNum(lastForecast.body.tempC)}°C · wind {asNum(lastForecast.body.windKph)} km/h
                </span>
              </>
            )}
            <span className="hud-value ml-auto text-[10px] text-white/65">{fmtMs(lastForecast.ms)}</span>
          </div>
        )}
      </NeedsHook>
    </Feature>
  );
}

// ───────────────────────── L15 circuit breaker ─────────────────────────

const STATE_COLOR: Record<BreakerInfo["state"], string> = { closed: "#c5ee8a", "half-open": "#fbbf24", open: "#f87171" };
const WINDOW = 50_000;

export function BreakerPanel({ ctx }: { ctx: PanelCtx }) {
  const { snap, driver } = ctx;
  const b = snap.hooks.breaker;
  const now = useNow(250);
  const [busy, setBusy] = useState(false);
  const trail = snap.breakerTrail;
  const from = now - WINDOW;
  const segs = trail
    .map((p, i) => ({ state: p.state, start: Math.max(p.t, from), end: Math.max(trail[i + 1]?.t ?? now, from) }))
    .filter((s) => s.end > s.start && now > 0);
  const cooldownLeft = b && b.state === "open" && b.openedAt !== null ? b.openedAt + b.cooldownMs - now : 0;
  const recent = snap.forecasts.slice(-8);
  return (
    <Feature
      id="api-breaker"
      ctx={ctx}
      meta={b ? b.state : undefined}
      actions={
        ctx.interactive && (
          <button
            type="button"
            className={BTN_ON}
            disabled={busy}
            aria-label="Break the upstream and keep asking for forecasts"
            onClick={() => {
              setBusy(true);
              void breakUpstream(driver).finally(() => setBusy(false));
            }}
          >
            <ServerOff className="h-3 w-3" aria-hidden /> {busy ? "Breaking…" : "Break upstream"}
          </button>
        )
      }
    >
      <NeedsHook ctx={ctx} hook="breakerState">
        {!b ? (
          <Empty>breakerState() has not answered yet.</Empty>
        ) : (
          <div className="px-3 py-2">
            <div className="grid grid-cols-3 gap-1.5" role="img" aria-label={`Breaker is ${b.state}`}>
              {(["closed", "half-open", "open"] as const).map((s) => {
                const on = b.state === s;
                return (
                  <div key={s} className={`rounded-md border px-2 py-1.5 text-center ${on ? "" : "border-white/10 opacity-60"}`} style={on ? { borderColor: STATE_COLOR[s], background: `${STATE_COLOR[s]}1f` } : undefined}>
                    <span aria-hidden className={`mx-auto block h-2.5 w-2.5 rounded-full ${on && s !== "closed" ? "dl-blink" : ""}`} style={{ background: on ? STATE_COLOR[s] : "rgba(255,255,255,0.25)", boxShadow: on ? `0 0 10px ${STATE_COLOR[s]}` : undefined }} />
                    <span className="mt-1 block font-mono text-[10.5px] text-white/90">{s}</span>
                  </div>
                );
              })}
            </div>
            <div className="mt-2 flex items-center gap-2 text-[11px] text-white/80">
              <span className="hud-label !text-white/60">Failures</span>
              <span className="flex gap-1" aria-label={`${b.failures} of ${b.threshold}`}>
                {Array.from({ length: Math.min(b.threshold, 10) }, (_, i) => (
                  <span key={i} className="h-2 w-4 rounded-sm" style={{ background: i < b.failures ? "#f87171" : "rgba(255,255,255,0.15)" }} />
                ))}
              </span>
              <span className="hud-value text-[10.5px]">
                {b.failures}/{b.threshold}
              </span>
              {cooldownLeft > 0 && <Chip tone="bad">cooldown {countdown(cooldownLeft)}</Chip>}
            </div>
            <div className="mt-2">
              <div className="hud-label !text-white/60">Last {WINDOW / 1000}s</div>
              <div className="relative mt-1 flex h-3 overflow-hidden rounded-full bg-white/10" role="img" aria-label="Breaker state over the last 50 seconds">
                {segs.map((s, i) => (
                  <span key={i} style={{ width: `${((s.end - s.start) / WINDOW) * 100}%`, background: STATE_COLOR[s.state] }} />
                ))}
              </div>
            </div>
            {recent.length > 0 && (
              <div className="mt-2 flex min-w-0 items-center gap-2">
                <span className="hud-label shrink-0 !text-white/60">Forecasts</span>
                <span className="flex min-w-0 flex-wrap gap-1" aria-label="Recent forecast sources">
                  {recent.map((ex) => {
                    const src = isRecord(ex.body) ? ex.body.source : undefined;
                    return (
                      <Chip key={ex.id} tone={src === "live" ? "ok" : src === "fallback" ? "warn" : "bad"}>
                        {typeof src === "string" ? src : ex.outcome === "ok" ? ex.status : ex.outcome}
                      </Chip>
                    );
                  })}
                </span>
              </div>
            )}
          </div>
        )}
      </NeedsHook>
    </Feature>
  );
}

// ───────────────────────── L16 graceful shutdown ─────────────────────────

export function ShutdownPanel({ ctx }: { ctx: PanelCtx }) {
  const { snap, driver } = ctx;
  const life = snap.hooks.lifecycle;
  const sd = snap.shutdown;
  const state = life?.state ?? "running";
  const color = state === "running" ? "#c5ee8a" : state === "draining" ? "#fbbf24" : "#f87171";
  const dots = Math.min(life?.inFlight ?? 0, 14);
  return (
    <Feature
      id="api-shutdown"
      ctx={ctx}
      meta={life ? state : undefined}
      actions={
        ctx.interactive && (
          <>
            <button type="button" className={BTN_ON} disabled={state !== "running" || sd.phase === "draining"} onClick={() => void shutdownNow(driver)} aria-label="Shut the server down gracefully">
              <Power className="h-3 w-3" aria-hidden /> Shut down
            </button>
            <button type="button" className={BTN} disabled={state === "running" && sd.phase === "idle"} onClick={() => restartNow(driver)} aria-label="Restart the server">
              <RotateCw className="h-3 w-3" aria-hidden /> Restart
            </button>
          </>
        )
      }
    >
      <NeedsHook ctx={ctx} hook="lifecycleState">
        <div className="px-3 py-2">
          <div className="flex items-center gap-3">
            <span aria-hidden className={`h-4 w-4 shrink-0 rounded-full ${state === "draining" ? "dl-blink" : ""}`} style={{ background: color, boxShadow: `0 0 12px ${color}` }} />
            <div className="min-w-0">
              <div className="hud-value text-[15px]" style={{ color }}>
                {state}
              </div>
              <div className="text-[10.5px] text-white/70">
                {state === "running" ? "taking new requests" : state === "draining" ? "finishing what is in flight, refusing new work" : "closed: nothing is accepted"}
              </div>
            </div>
            <div className="ml-auto text-right">
              <div className="hud-value text-[15px]">{life?.inFlight ?? 0}</div>
              <div className="hud-label !text-white/60">in flight</div>
            </div>
          </div>
          <div className="mt-2 flex min-h-[18px] flex-wrap items-center gap-1.5" aria-label={`${life?.inFlight ?? 0} requests in flight`}>
            {Array.from({ length: dots }, (_, i) => (
              <span key={i} className="dl-blink h-2.5 w-2.5 rounded-full bg-[#c5ee8a]" style={{ animationDelay: `${i * 90}ms` }} />
            ))}
            {dots === 0 && <span className="text-[11px] text-white/60">no requests in flight</span>}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <Chip tone={sd.rejected > 0 ? "warn" : "dim"}>{sd.rejected} refused with 503</Chip>
            {sd.result && (
              <>
                <Chip tone={sd.result.drained ? "ok" : "bad"}>{sd.result.drained ? "drained" : "not drained"}</Chip>
                <Chip tone={sd.result.abandoned === 0 ? "ok" : "bad"}>{sd.result.abandoned} abandoned</Chip>
              </>
            )}
          </div>
          {sd.result && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className="hud-label !text-white/60">Closed</span>
              {sd.result.closed.length === 0 ? <span className="text-[11px] text-white/60">nothing reported</span> : sd.result.closed.map((c) => <Chip key={c} tone="ok">✓ {c}</Chip>)}
            </div>
          )}
        </div>
      </NeedsHook>
    </Feature>
  );
}
