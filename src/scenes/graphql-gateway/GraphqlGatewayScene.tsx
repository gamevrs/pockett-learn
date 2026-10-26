"use client";

import React, { useEffect, useLayoutEffect, useMemo, useState, useSyncExternalStore } from "react";
import type { SceneProps } from "@/engine/scene";
import { GqlSession } from "./session";
import { PRESETS } from "./operations";
import { ExplorerPane } from "./Explorer";
import { ClientAppPane } from "./ClientApp";
import { PlanPane } from "./Plan";
import { DocsPane } from "./Docs";
import { LabPane } from "./Lab";
import { Notice } from "./ui";

/**
 * GraphQL Gateway: an explorer, a mobile client app, a query-plan panel, a docs browser and a lab,
 * all powered by the learner's execute(request).
 *
 * The scene plays the GraphQL client. Every pane builds {query, variables, operationName, headers}
 * and calls program.call("execute", request). Nothing is faked: a missing field shows the real
 * validation error, a crashing resolver shows the crash. Each lesson's feature unlocks one more
 * part (see the `unlocked` checks in the panes).
 *
 * Optional hooks used when present: reset_db(), recent_errors(), set_introspection(enabled),
 * run_tests(), compare_rest(product_id).
 */

type Tab = "explorer" | "app" | "plan" | "docs" | "lab";

const TAB_LABEL: Record<Tab, string> = { explorer: "Explorer", app: "Client app", plan: "Plan", docs: "Docs", lab: "Lab" };

/** Which pane each feature lives in, for the "new" dots and for jumping to a freshly unlocked part. */
const FEATURE_TAB: Record<string, Tab> = {
  "gql-explorer": "explorer",
  "gql-variables": "explorer",
  "gql-identity": "explorer",
  "gql-catalogue": "app",
  "gql-search": "app",
  "gql-product": "app",
  "gql-mutations": "app",
  "gql-browse": "app",
  "gql-orders": "app",
  "gql-plan": "plan",
  "gql-batching": "plan",
  "gql-docs": "docs",
  "gql-limits": "lab",
  "gql-errors": "lab",
  "gql-ship": "lab",
};

/** Demo mode steps: which preset to fire, and which side pane to show. */
const AUTOPLAY: { preset: string; tab: Tab }[] = [
  { preset: "hello", tab: "app" },
  { preset: "home", tab: "app" },
  { preset: "by-category", tab: "plan" },
  { preset: "product-page", tab: "app" },
  { preset: "n1-categories", tab: "plan" },
  { preset: "browse", tab: "app" },
  { preset: "my-orders", tab: "app" },
  { preset: "whoami", tab: "docs" },
];

export default function GraphqlGatewayScene({ program, unlocked, focus, celebration, interactive, autoplay = false }: SceneProps) {
  // one session per run of the learner's program: a new run means a new log, a new identity, a new cart
  const session = useMemo(() => new GqlSession(program), [program]);
  const snap = useSyncExternalStore(session.subscribe, session.getSnapshot, session.getSnapshot);
  const [view, setView] = useState<Tab>("explorer");
  const [side, setSide] = useState<Tab>("app");

  const fresh = useMemo(() => new Set(celebration?.features ?? []), [celebration]);
  const freshTabs = useMemo(() => new Set([...fresh].flatMap((f) => (FEATURE_TAB[f] ? [FEATURE_TAB[f]] : []))), [fresh]);

  const idOn = unlocked.has("gql-identity");
  useLayoutEffect(() => {
    session.setIdentityEnabled(idOn);
  }, [session, idOn]);

  const select = (t: Tab) => {
    setView(t);
    if (t !== "explorer") setSide(t);
  };

  // jump to the part that just came alive
  const [seenNonce, setSeenNonce] = useState(celebration?.nonce ?? 0);
  if (celebration && celebration.nonce !== seenNonce) {
    setSeenNonce(celebration.nonce);
    const target = celebration.features.map((f) => FEATURE_TAB[f]).find(Boolean);
    if (target) select(target);
  }

  // notices fade after a few seconds
  const noticeNonce = snap.notice?.nonce;
  useEffect(() => {
    if (noticeNonce === undefined) return;
    const t = setTimeout(() => session.clearNotice(), 4500);
    return () => clearTimeout(t);
  }, [session, noticeNonce]);

  // demo mode: fire a starter operation now and then so the panes fill up by themselves
  useEffect(() => {
    if (!autoplay || !program) return;
    let i = 0;
    const t = setInterval(() => {
      if (!session.hasExecute) return;
      const step = AUTOPLAY[i++ % AUTOPLAY.length];
      const preset = PRESETS.find((p) => p.id === step.preset);
      if (!preset || !unlocked.has(preset.feature)) return;
      session.openInExplorer({ query: preset.query, variables: preset.variables });
      session.run({ query: preset.query, variables: preset.variables ?? null }, "explorer");
      setSide(step.tab === "explorer" ? "app" : step.tab);
      setView((v) => (v === "explorer" ? v : step.tab));
    }, 4200);
    return () => clearInterval(t);
  }, [autoplay, program, session, unlocked]);

  const tabs: Tab[] = ["explorer", "app", "plan", "docs", "lab"];
  const sql = snap.log[0]?.result.stats?.sql;
  const badge = (t: Tab) => (t === "plan" && unlocked.has("gql-plan") && sql !== undefined ? sql : 0);

  const common = { session, snap, unlocked, focus, interactive };
  const right = (id: Exclude<Tab, "explorer">, node: React.ReactNode) => (
    <section aria-label={TAB_LABEL[id]} className={`${view === id ? "flex" : "hidden"} ${side === id ? "@3xl:flex" : "@3xl:hidden"} min-h-0 min-w-0 flex-1`}>
      {node}
    </section>
  );

  const stripBtn = (t: Tab, active: boolean, onClick: () => void) => (
    <button
      key={t}
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`relative flex h-7 min-w-fit flex-1 items-center justify-center gap-1.5 rounded-full px-2 text-[11px] font-medium transition-colors ${active ? "bg-white/12 text-white" : "text-white/50 hover:text-white/80"}`}
    >
      {TAB_LABEL[t]}
      {badge(t) > 0 && <span className="hud-value rounded-full bg-white/10 px-1.5 text-[9.5px] text-white/70">{badge(t)}</span>}
      {freshTabs.has(t) && <span className="h-1.5 w-1.5 rounded-full bg-[#c5ee8a]" aria-label="new" />}
    </button>
  );

  return (
    <div className={`@container absolute inset-0 flex flex-col gap-2 px-2 pb-2 pt-11 ${interactive ? "" : "pointer-events-none"}`}>
      {/* narrow screens show one pane at a time */}
      <div role="tablist" aria-label="Panes" className="flex shrink-0 gap-0.5 overflow-x-auto rounded-full border border-white/10 bg-black/30 p-0.5 [scrollbar-width:none] @3xl:hidden">
        {tabs.map((t) => stripBtn(t, view === t, () => select(t)))}
      </div>

      {snap.notice && (
        <div className="pointer-events-auto shrink-0">
          <Notice tone={snap.notice.tone}>{snap.notice.text}</Notice>
        </div>
      )}

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-2 @3xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <section aria-label="Explorer" className={`${view === "explorer" ? "flex" : "hidden"} min-h-0 min-w-0 @3xl:flex`}>
          <ExplorerPane {...common} fresh={fresh} />
        </section>
        <div className={`${view === "explorer" ? "hidden" : "flex"} min-h-0 min-w-0 flex-col gap-2 @3xl:flex`}>
          {/* wide screens: one of four panes beside the explorer */}
          <div role="tablist" aria-label="Right pane" className="hidden shrink-0 gap-0.5 rounded-full border border-white/10 bg-black/30 p-0.5 @3xl:flex">
            {tabs.filter((t) => t !== "explorer").map((t) => stripBtn(t, side === t, () => select(t)))}
          </div>
          {right("app", <ClientAppPane {...common} fresh={fresh} />)}
          {right("plan", <PlanPane {...common} />)}
          {right("docs", <DocsPane session={session} snap={snap} unlocked={unlocked} focus={focus} />)}
          {right("lab", <LabPane {...common} />)}
        </div>
      </div>
    </div>
  );
}
