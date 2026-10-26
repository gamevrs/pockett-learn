"use client";

import React, { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Lock, Pause, Play } from "lucide-react";
import type { SceneProps } from "@/engine/scene";
import { scenarios } from "./actions";
import { DocklineDriver } from "./driver";
import type { PanelCtx } from "./feature";
import { GuardTab, ProofTab, ResilienceTab, ResourcesTab, TrafficTab } from "./tabs";
import { planNext } from "./mix";
import { Overview, OVERVIEW_H, OVERVIEW_W } from "./overview";
import { BTN, BTN_ON, CSS, Notice, TABS, TAB_OF, type TabId } from "./ui";

/**
 * Dockline: a live operations board for a bike-share network API, powered by the learner's JavaScript.
 *
 * The learner builds one growing program: a Node-style HTTP framework plus a REST API for bike
 * stations, bikes and rentals. There are no sockets. The scene fires plain-object requests at the
 * learner's `handle(raw)` and draws what comes back. Each of the 19 lessons unlocks one panel; a
 * locked panel is a dashed blueprint that names the function it is waiting for. Every number drawn
 * is read from a response or a hook, never invented by the scene.
 *
 * Hook contract (all optional; the scene only calls a hook when its feature is unlocked and
 * `program.hasHook(name)`; JS also tries camelCase for snake-case names). Junk results are ignored.
 *
 *  handle(raw) async -> { status:number, headers:Record<string,string> (lower-case names), body:any, trace:string[] }
 *    raw = { method:"GET", url:"/stations?zone=central&limit=3",
 *            headers:{ authorization:"Bearer <jwt>", "idempotency-key":"...", "if-none-match":"\"abc\"", "content-type":"application/json" },
 *            body:<JSON-able or a raw string>, ip:"10.0.0.7" }
 *    trace = names of the middleware the request passed through, in order (the last is where it stopped).
 *    Error bodies are problem-details JSON: { type:"https://dockline.example/problems/<slug>", title, status, detail,
 *    instance, requestId, errors?:[{field,code,message}] } with content-type application/problem+json.
 *  listMiddleware() sync -> string[]                       (L2) execution order, e.g. ["requestId","accessLog","rateLimit","authenticate","idempotency","cache"]
 *  listRoutes() sync -> [{method,path}]                    (L3) e.g. {method:"GET",path:"/stations/:id"}
 *  recentLogs(n) sync -> last n { time:ISO, level:"info"|"warn"|"error", msg, reqId, method, path, status, ms } (L4)
 *  breakerState() sync -> { state:"closed"|"open"|"half-open", failures, threshold, openedAt:number|null, cooldownMs } (L15)
 *  lifecycleState() sync -> { state:"running"|"draining"|"closed", inFlight:number }  (L16)
 *  shutdown() async -> { drained:boolean, abandoned:number, closed:string[] };  restart() sync -> running again (L16)
 *  runSuite() async -> { total, passed, results:[{ name, ok, failures:string[] }] }   (L17)
 *  parseGraph(source) sync -> { operation:"query", selections:Selection[] }, Selection = { name, args:Record<string,string|number|boolean>, selections }
 *    (L18) throws SyntaxError with a message on bad input (the scene shows it).
 *  POST /graphql body { query } -> 200 { data, errors?:[{message,path?}] } (L19)
 *
 * Response headers read when present: x-request-id, x-response-time ("12ms"), ratelimit-limit, ratelimit-remaining,
 * retry-after (seconds), etag, cache-control, x-idempotent-replay: "true", www-authenticate, allow, location.
 *
 * Endpoints the traffic uses: GET /health/live, /health/ready; POST /auth/token {riderId,pin} -> {token,tokenType,expiresIn}
 * (HS256 JWT, payload {sub,role,name,iat,exp}); GET/POST/PATCH/DELETE /stations[/:id], GET /stations/:id/bikes,
 * GET /stations/:id/forecast (calls GET /upstream/forecast/:zone through retries and a circuit breaker; body.source is
 * "live" or "fallback"); GET /bikes (cursor: ?after=, {items,next}); GET/POST /rentals, GET /rentals/:id, POST /rentals/:id/return.
 *
 * The program's simulated network (program.env.network) is read to draw the retry waterfall and flipped by the
 * Fail next / Slow upstream / Break upstream buttons.
 */

const SHELL_TOP = 44;

/** Short and wide stages (the project hub, the landing page) get the one-screen overview. */
const isCompact = (box: { w: number; h: number } | null) => box !== null && box.w >= 420 && box.h <= 600 && box.w / box.h >= 1.2;

function TabStrip({ tabs, value, onChange, unlocked, fresh }: { tabs: typeof TABS; value: TabId; onChange: (id: TabId) => void; unlocked: ReadonlySet<string>; fresh: ReadonlySet<string> }) {
  return (
    <div role="tablist" aria-label="Dockline panels" className="flex min-w-0 shrink-0 gap-0.5 overflow-x-auto rounded-full border border-white/12 bg-black/30 p-0.5 [scrollbar-width:none]">
      {tabs.map((t) => {
        const active = t.id === value;
        const any = t.features.some((f) => unlocked.has(f));
        const isFresh = t.features.some((f) => fresh.has(f));
        return (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onChange(t.id)}
            className={`relative flex h-7 shrink-0 items-center justify-center gap-1.5 rounded-full px-3 text-[11px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-[#c5ee8a] ${active ? "bg-white/15 text-white" : any ? "text-white/75 hover:text-white" : "text-white/60 hover:text-white/80"}`}
          >
            {!any && <Lock className="h-2.5 w-2.5" aria-hidden />}
            {t.label}
            {isFresh && <span className="h-1.5 w-1.5 rounded-full bg-[#c5ee8a]" aria-label="new" />}
          </button>
        );
      })}
    </div>
  );
}

export default function JsApiScene({ program, unlocked, focus, celebration, interactive, autoplay = false }: SceneProps) {
  const initialUnlocked = useRef(unlocked);
  // eslint-disable-next-line react-hooks/refs
  const driver = useMemo(() => new DocklineDriver(program, initialUnlocked.current, autoplay), [program, autoplay]);
  const snap = useSyncExternalStore(driver.subscribe, driver.getSnapshot, driver.getSnapshot);
  const fresh = useMemo(() => new Set(celebration?.features ?? []), [celebration]);

  useEffect(() => {
    driver.start(async (d) => {
      if (d.autoplay) scenarios(d);
      return planNext(d);
    });
    return () => driver.stop();
  }, [driver]);

  useEffect(() => {
    driver.setUnlocked(unlocked);
  }, [driver, unlocked]);

  const [box, setBox] = useState<{ w: number; h: number } | null>(null);
  const measure = React.useCallback((el: HTMLDivElement | null) => {
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setBox((prev) => (prev && Math.abs(prev.w - width) < 1 && Math.abs(prev.h - height) < 1 ? prev : { w: width, h: height }));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const focusTab = focus ? TAB_OF[focus] : undefined;
  const [view, setView] = useState<TabId>(focusTab ?? "traffic");
  const [side, setSide] = useState<TabId>(focusTab && focusTab !== "traffic" ? focusTab : "resources");
  const [seenFocus, setSeenFocus] = useState<string | null>(focus);
  if (focus !== seenFocus) {
    setSeenFocus(focus);
    const target = focus ? TAB_OF[focus] : undefined;
    if (target) {
      setView(target);
      if (target !== "traffic") setSide(target);
    }
  }
  const choose = (id: TabId) => {
    setView(id);
    if (id !== "traffic") setSide(id);
  };

  const ctx: PanelCtx = { snap, driver, unlocked, focus, fresh, interactive, autoplay };

  if (box && isCompact(box)) {
    const availH = Math.max(box.h - SHELL_TOP, 120);
    const scale = Math.min(box.w / OVERVIEW_W, availH / OVERVIEW_H);
    return (
      <div ref={measure} className="absolute inset-0 overflow-hidden">
        <style>{CSS}</style>
        <div
          className="absolute"
          style={{ width: OVERVIEW_W, height: OVERVIEW_H, left: (box.w - OVERVIEW_W * scale) / 2, top: SHELL_TOP + (availH - OVERVIEW_H * scale) / 2, transform: `scale(${scale})`, transformOrigin: "top left" }}
        >
          <Overview ctx={ctx} />
        </div>
      </div>
    );
  }

  const wide = !!box && box.w >= 760;
  const active: TabId = wide ? side : view;
  const content = (tab: TabId) => {
    switch (tab) {
      case "traffic":
        return <TrafficTab ctx={ctx} />;
      case "resources":
        return <ResourcesTab ctx={ctx} />;
      case "guard":
        return <GuardTab ctx={ctx} />;
      case "resilience":
        return <ResilienceTab ctx={ctx} />;
      case "proof":
        return <ProofTab ctx={ctx} />;
    }
  };
  const sideTabs = TABS.filter((t) => t.id !== "traffic");
  const live = unlocked.size > 0;

  return (
    <div ref={measure} className="absolute inset-0">
      <div className={`@container absolute inset-0 flex flex-col gap-2 px-2 pb-2 pt-11 ${interactive ? "" : "pointer-events-none"}`}>
        <style>{CSS}</style>
        <div className="flex min-w-0 shrink-0 items-center gap-2 px-0.5">
          <span aria-hidden className="h-2 w-2 shrink-0 rounded-full" style={{ background: snap.hasProgram && snap.running ? "#c5ee8a" : "rgba(255,255,255,0.35)", boxShadow: snap.hasProgram && snap.running ? "0 0 8px rgba(197,238,138,.6)" : undefined }} />
          <span className="hud-title">Dockline</span>
          <span className="hud-label min-w-0 truncate !text-white/65">
            {snap.hasProgram ? `${snap.total} request${snap.total === 1 ? "" : "s"}${snap.inFlight > 0 ? ` · ${snap.inFlight} in flight` : ""}` : "bike-share API"}
          </span>
          {snap.hasProgram && interactive && (
            <div className="ml-auto flex shrink-0 items-center gap-1">
              <button type="button" className={snap.running ? BTN : BTN_ON} onClick={() => driver.setRunning(!snap.running)} aria-label={snap.running ? "Pause traffic" : "Resume traffic"}>
                {snap.running ? <Pause className="h-3 w-3" aria-hidden /> : <Play className="h-3 w-3" aria-hidden />}
                {snap.running ? "Pause" : "Play"}
              </button>
              {[1, 2, 4].map((s) => (
                <button key={s} type="button" className={snap.speed === s ? BTN_ON : BTN} aria-pressed={snap.speed === s} aria-label={`Traffic speed ${s}x`} onClick={() => driver.setSpeed(s)}>
                  {s}×
                </button>
              ))}
            </div>
          )}
        </div>
        {!snap.hasProgram && live && <Notice tone="warn">Run your code to switch Dockline on. Everything below is waiting for it.</Notice>}
        {snap.hasProgram && snap.error && <Notice tone="bad">{snap.error}</Notice>}
        {!wide && <TabStrip tabs={TABS} value={view} onChange={choose} unlocked={unlocked} fresh={fresh} />}
        {wide ? (
          <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] gap-2">
            <div className="min-h-0 min-w-0 overflow-y-auto pr-0.5">{content("traffic")}</div>
            <div className="flex min-h-0 min-w-0 flex-col gap-2">
              <TabStrip tabs={sideTabs} value={side} onChange={choose} unlocked={unlocked} fresh={fresh} />
              <div className="min-h-0 flex-1 overflow-y-auto pr-0.5">{content(side)}</div>
            </div>
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto pr-0.5">{content(active)}</div>
        )}
      </div>
    </div>
  );
}
