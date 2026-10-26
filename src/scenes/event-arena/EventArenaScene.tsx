"use client";

import React, { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Lock } from "lucide-react";
import type { SceneProps } from "@/engine/scene";
import { ArenaDriver } from "./driver";
import { MatchPanel } from "./MatchPanel";
import { StandingsPanel, StatsPanel } from "./TablePanel";
import { BusPanel } from "./BusPanel";
import { LoopLab } from "./LoopLab";
import { NetPanel } from "./NetPanel";
import { PipelinePanel } from "./PipelinePanel";
import { Notice } from "./ui";

/**
 * Event Arena: a live tournament dashboard powered by the learner's JavaScript.
 *
 * The scene plays the stadium (a deterministic match simulator) and the network (a simulated
 * fetch); every panel is the learner's own code showing through. Each lesson unlocks one feature,
 * and a locked feature is a dashed blueprint that names the function it is waiting for.
 *
 * Hooks the scene calls (all optional, only when the feature is unlocked and the function exists):
 *   L1  describeEvent(event) -> string                      L2  scoreboard.add(team, points) / snapshot() / reset()
 *   L3  tickClock(seconds), matchClock.display() / reset()  L4  isHighlight(event) -> boolean
 *   L5  standings(results) -> rows                          L6  reportAll(event), summaries(), resetReporters()
 *   L7  arena.emit(type, event), arena.listenerCount(type)  L8  deadLetters(), busWarnings()
 *   L9  runLoop(script) -> string[]
 *   L10 loadDashboard(), loadAvailable(urls), fastest(urls) L11 safeLoad(id), cancelLoad(id), fetchWithTimeout(url, ms)
 *   L12 fetchWithRetry(url), onSearchInput(q), getSearchState(), refreshStandings(), getRefreshStats()
 *   L13 startReplay(matchId, paceMs), getReplay()           L14 processEvent(event), pipelineStats(), recentFailures(), startFeed(id), stopFeed()
 * The program's simulated network (program.env.network) is read to draw the request waterfall.
 */

type TabId = "match" | "table" | "bus" | "loop" | "net" | "pipe";

const TABS: { id: TabId; label: string; features: string[] }[] = [
  { id: "match", label: "Match", features: ["arena-feed", "arena-scoreboard", "arena-clock", "arena-highlights"] },
  { id: "table", label: "Table", features: ["arena-standings", "arena-stats"] },
  { id: "bus", label: "Bus", features: ["arena-bus", "arena-resilience"] },
  { id: "loop", label: "Loop", features: ["arena-loop"] },
  { id: "net", label: "Network", features: ["arena-network", "arena-cancel", "arena-retry", "arena-replay"] },
  { id: "pipe", label: "Pipeline", features: ["arena-pipeline"] },
];

const TAB_OF: Record<string, TabId> = Object.fromEntries(TABS.flatMap((t) => t.features.map((f) => [f, t.id])));

const STYLES = `
@keyframes arena-pop { 0% { transform: scale(1.4); } 100% { transform: scale(1); } }
@keyframes arena-flash { 0% { box-shadow: 0 0 0 0 rgba(197,238,138,.85); transform: scale(1.6); } 100% { box-shadow: 0 0 0 5px rgba(197,238,138,0); transform: scale(1); } }
@keyframes arena-slide { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: none; } }
.arena-pop { animation: arena-pop .35s ease-out; }
.arena-flash { animation: arena-flash .6s ease-out; }
.arena-slide { animation: arena-slide .25s ease-out; }
`;

function TabStrip({
  tabs,
  value,
  onChange,
  unlocked,
  fresh,
}: {
  tabs: typeof TABS;
  value: TabId;
  onChange: (id: TabId) => void;
  unlocked: ReadonlySet<string>;
  fresh: ReadonlySet<string>;
}) {
  return (
    <div role="tablist" aria-label="Arena panels" className="flex min-w-0 shrink-0 gap-0.5 overflow-x-auto rounded-full border border-white/10 bg-black/30 p-0.5 [scrollbar-width:none]">
      {tabs.map((t) => {
        const active = t.id === value;
        const any = t.features.some((f) => unlocked.has(f));
        const isFresh = t.features.some((f) => fresh.has(f));
        return (
          <button
            key={t.id}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.id)}
            className={`relative flex h-7 shrink-0 items-center justify-center gap-1.5 rounded-full px-3 text-[11px] font-medium transition-colors ${active ? "bg-white/12 text-white" : any ? "text-white/60 hover:text-white/85" : "text-white/30 hover:text-white/55"}`}
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

export default function EventArenaScene({ program, unlocked, focus, celebration, interactive }: SceneProps) {
  const initialUnlocked = useRef(unlocked);
  // eslint-disable-next-line react-hooks/refs
  const driver = useMemo(() => new ArenaDriver(program, initialUnlocked.current), [program]);
  const snap = useSyncExternalStore(driver.subscribe, driver.getSnapshot, driver.getSnapshot);
  const fresh = useMemo(() => new Set(celebration?.features ?? []), [celebration]);

  useEffect(() => {
    driver.start();
    return () => driver.stop();
  }, [driver]);

  useEffect(() => {
    driver.setUnlocked(unlocked);
  }, [driver, unlocked]);

  // narrow screens show one panel at a time; wide ones keep the match on the left
  const rootRef = useRef<HTMLDivElement>(null);
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([entry]) => setWide(entry.contentRect.width >= 760));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const focusTab = focus ? TAB_OF[focus] : undefined;
  const [view, setView] = useState<TabId>(focusTab ?? "match");
  const [side, setSide] = useState<TabId>(focusTab && focusTab !== "match" ? focusTab : "table");
  const [seenFocus, setSeenFocus] = useState<string | null>(focus);
  if (focus !== seenFocus) {
    setSeenFocus(focus);
    const target = focus ? TAB_OF[focus] : undefined;
    if (target) {
      setView(target);
      if (target !== "match") setSide(target);
    }
  }
  const choose = (id: TabId) => {
    setView(id);
    if (id !== "match") setSide(id);
  };

  const active: TabId = wide ? side : view;
  const hasProgram = !!program;

  const content = (tab: TabId) => {
    switch (tab) {
      case "match":
        return <MatchPanel snap={snap} driver={driver} unlocked={unlocked} focus={focus} interactive={interactive} fresh={fresh} />;
      case "table":
        return (
          <div className="flex min-w-0 flex-col gap-2">
            <StandingsPanel snap={snap} unlocked={unlocked} focus={focus} />
            <StatsPanel snap={snap} unlocked={unlocked} focus={focus} />
          </div>
        );
      case "bus":
        return <BusPanel snap={snap} driver={driver} unlocked={unlocked} focus={focus} interactive={interactive} hasProgram={hasProgram} />;
      case "loop":
        return <LoopLab program={program} unlocked={unlocked} focus={focus} />;
      case "net":
        return <NetPanel program={program} unlocked={unlocked} focus={focus} interactive={interactive} />;
      case "pipe":
        return <PipelinePanel snap={snap} driver={driver} program={program} unlocked={unlocked} focus={focus} interactive={interactive} />;
    }
  };

  const sideTabs = TABS.filter((t) => t.id !== "match");

  return (
    <div ref={rootRef} className={`@container absolute inset-0 flex flex-col gap-2 px-2 pb-2 pt-11 ${interactive ? "" : "pointer-events-none"}`}>
      <style>{STYLES}</style>
      {!wide && <TabStrip tabs={TABS} value={view} onChange={choose} unlocked={unlocked} fresh={fresh} />}
      {!hasProgram && <Notice tone="warn">Run your code to switch the arena on. Everything below is waiting for it.</Notice>}
      {hasProgram && snap.error && active !== "bus" && active !== "pipe" && (
        <div className="shrink-0">
          <Notice tone="bad">{snap.error}</Notice>
        </div>
      )}
      {wide ? (
        <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] gap-2">
          <div className="flex min-h-0 min-w-0 flex-col overflow-y-auto pr-0.5">{content("match")}</div>
          <div className="flex min-h-0 min-w-0 flex-col gap-2">
            <TabStrip tabs={sideTabs} value={side} onChange={choose} unlocked={unlocked} fresh={fresh} />
            <div className="min-h-0 flex-1 overflow-y-auto pr-0.5">{content(side)}</div>
          </div>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto pr-0.5">{content(active)}</div>
      )}
    </div>
  );
}
