"use client";

import React, { useEffect, useLayoutEffect, useMemo, useState, useSyncExternalStore } from "react";
import type { SceneProps } from "@/engine/scene";
import { ApiSession } from "./session";
import { ConsolePane } from "./Console";
import { LogPane } from "./LogPane";
import { StorePane } from "./Store";
import { Notice } from "./ui";

/**
 * Pocket Store: a shop, an API console and a request log, all powered by the learner's handle().
 *
 * The scene plays the HTTP client: every pane builds a request dict and calls
 * program.call("handle", request). Nothing is faked: if the learner's route is missing, the pane
 * shows the real 404; if their handler crashes, the pane shows the crash. Each lesson's feature
 * unlocks one more part of the store (see the `unlocked` checks in the panes).
 *
 * Optional hooks the scene uses when present: reset_db(), list_products(), recent_errors(), run_tests().
 */

type View = "shop" | "console" | "log";

const AUTOPLAY_PATHS = ["/health", "/products?q=lamp", "/products/3", "/products?sort=-price&per_page=4", "/products?category=desk", "/nope"];

export default function StoreApiScene({ program, unlocked, focus, celebration, interactive, autoplay = false }: SceneProps) {
  // one session per run of the learner's program: a new run means a new log, a new login, a new database
  const session = useMemo(() => new ApiSession(program), [program]);
  const snap = useSyncExternalStore(session.subscribe, session.getSnapshot, session.getSnapshot);
  const [view, setView] = useState<View>("shop");

  const fresh = useMemo(() => new Set(celebration?.features ?? []), [celebration]);
  const errorsOn = unlocked.has("store-errors");

  // a layout effect runs before the panes' own load effects, so their very first 5xx is captured too
  useLayoutEffect(() => {
    session.setCaptureServerErrors(errorsOn);
  }, [session, errorsOn]);

  // notices fade after a few seconds
  const noticeNonce = snap.notice?.nonce;
  useEffect(() => {
    if (noticeNonce === undefined) return;
    const t = setTimeout(() => session.clearNotice(), 4500);
    return () => clearTimeout(t);
  }, [session, noticeNonce]);

  // demo mode: the console fires a request now and then so the log fills up by itself
  useEffect(() => {
    if (!autoplay || !program) return;
    let i = 0;
    const t = setInterval(() => {
      if (!session.hasHandle) return;
      const path = AUTOPLAY_PATHS[i++ % AUTOPLAY_PATHS.length];
      if (path.startsWith("/products") && !unlocked.has("store-catalogue")) return;
      session.request("GET", path, { source: "console" });
    }, 4200);
    return () => clearInterval(t);
  }, [autoplay, program, session, unlocked]);

  const canReset = unlocked.has("store-db") && session.hasHook("reset_db");
  const logCount = snap.log.length;

  const tab = (id: View, label: string, badge?: number) => (
    <button
      key={id}
      role="tab"
      aria-selected={view === id}
      onClick={() => setView(id)}
      className={`flex h-7 flex-1 items-center justify-center gap-1.5 rounded-full text-[11px] font-medium transition-colors ${
        view === id ? "bg-white/12 text-white" : "text-white/50 hover:text-white/80"
      }`}
    >
      {label}
      {badge ? <span className="hud-value rounded-full bg-white/10 px-1.5 text-[9.5px] text-white/70">{badge}</span> : null}
    </button>
  );

  return (
    <div className={`@container absolute inset-0 flex flex-col gap-2 px-2 pb-2 pt-11 ${interactive ? "" : "pointer-events-none"}`}>
      {/* narrow screens show one pane at a time */}
      <div role="tablist" aria-label="Panes" className="flex shrink-0 gap-1 rounded-full border border-white/10 bg-black/30 p-0.5 @3xl:hidden">
        {tab("shop", "Storefront")}
        {tab("console", "Console")}
        {tab("log", "Log", logCount > 99 ? 99 : logCount)}
      </div>

      {snap.notice && (
        <div className="pointer-events-auto shrink-0">
          <Notice tone={snap.notice.tone}>{snap.notice.text}</Notice>
        </div>
      )}

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-2 @3xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <section aria-label="Storefront" className={`${view === "shop" ? "flex" : "hidden"} min-h-0 min-w-0 @3xl:flex`}>
          <StorePane session={session} snap={snap} unlocked={unlocked} focus={focus} interactive={interactive} autoplay={autoplay} fresh={fresh} />
        </section>
        <div className={`${view === "shop" ? "hidden" : "flex"} min-h-0 min-w-0 flex-col gap-2 @3xl:flex`}>
          <section aria-label="API console" className={`${view === "console" ? "flex" : "hidden"} min-h-0 min-w-0 flex-[3] @3xl:flex`}>
            <ConsolePane session={session} snap={snap} unlocked={unlocked} focus={focus} interactive={interactive} fresh={fresh} />
          </section>
          <section aria-label="Request log" className={`${view === "log" ? "flex" : "hidden"} min-h-0 min-w-0 flex-[2] @3xl:flex`}>
            <LogPane session={session} snap={snap} interactive={interactive} canReset={canReset} />
          </section>
        </div>
      </div>
    </div>
  );
}
