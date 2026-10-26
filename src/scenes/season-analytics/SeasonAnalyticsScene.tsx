"use client";

import React from "react";
import { Database, Terminal } from "lucide-react";
import type { SceneProps } from "@/engine/scene";
import { FeatureIcon } from "@/components/ui/icons";
import { assign, PANELS, plural, readResults, readTables, SEED_TABLES, type Bundle, type PanelDef, type PanelId, type TableInfo } from "./model";
import { Benchmarks, CalendarPanel, Console, FormGuide, HeadToHead, Honours, Leaders, Movers, PlanPanel, Qualifying, RecordPanel, Stewards, Strategy } from "./panels-a";
import { Championship, PaceHeat, PointsGrid, Progression, Standings } from "./panels-b";
import { Empty, LockedPanel, PanelFrame, PickContext } from "./ui";

/**
 * Season Analytics: a 2D season-analysis dashboard driven by the learner's SQL.
 *
 * The runtime gives the scene every result set the query file produced. Each panel finds its
 * own by the columns it returns (see model.ts `assign`), shows a ghost until its lesson is passed,
 * and renders whatever the learner's query actually returned. The query console shows the latest
 * result set (or EXPLAIN plan) whatever it is. Click a driver code anywhere to highlight that
 * driver in every panel.
 *
 * Colour follows the Pockett Stage system: neutral greys for structure, lime only for values
 * the learner's queries produced, amber for caution, red for failures.
 */

const NEEDS: Record<PanelId, string> = {
  standings: "pos, code, name, team, points, change, to_ahead, to_behind",
  championship: "pos, code, name, team, points, wins, tied_on_points",
  progression: "code, round, points, total",
  pace: "code, round, avg_ms, gap_pct, form3",
  pointsgrid: "code, round, points, entered",
  leaders: "code, name, team, points, gap",
  benchmarks: "rounds, entries, avg_points, above_avg, best_lap_ms",
  form: "code, name, best_finish, last_points",
  record: "code, starts, wins, podiums, dnfs, wet_points, dry_points",
  qualifying: "code, sessions, timed_q1, reached_q2, reached_q3",
  calendar: "round, name, race_date, weekday, days_since_prev",
  stewards: "category, penalties, seconds",
  honours: "honour, code, total",
  h2h: "team, driver_a, driver_b, races, a_ahead, b_ahead, a_points, b_points",
  movers: "round, code, grid, finish_pos, gained",
  strategy: "stops, entries, points, avg_points",
  plan: "EXPLAIN QUERY PLAN SELECT …",
};

function rowsFor(id: PanelId, b: Bundle): number | undefined {
  const rs = id === "plan" ? b.plans[b.plans.length - 1] : b[id];
  return rs ? rs.rows.length : undefined;
}

function Body({ id, b }: { id: PanelId; b: Bundle }) {
  const missing = <Empty>No query for this screen yet. Return the columns: {NEEDS[id]}.</Empty>;
  switch (id) {
    case "standings":
      return b.standings ? <Standings rs={b.standings} /> : missing;
    case "championship":
      return b.championship ? <Championship rs={b.championship} constructors={b.constructors} /> : missing;
    case "progression":
      return b.progression ? <Progression rs={b.progression} /> : missing;
    case "pace":
      return b.pace ? <PaceHeat rs={b.pace} /> : missing;
    case "pointsgrid":
      return b.pointsgrid ? <PointsGrid rs={b.pointsgrid} /> : missing;
    case "leaders":
      return b.leaders ? <Leaders rs={b.leaders} /> : missing;
    case "benchmarks":
      return b.benchmarks ? <Benchmarks rs={b.benchmarks} winners={b.winners} /> : missing;
    case "form":
      return b.form ? <FormGuide rs={b.form} /> : missing;
    case "record":
      return b.record ? <RecordPanel rs={b.record} /> : missing;
    case "qualifying":
      return b.qualifying ? <Qualifying rs={b.qualifying} sheet={b.sheet} /> : missing;
    case "calendar":
      return b.calendar ? <CalendarPanel rs={b.calendar} /> : missing;
    case "stewards":
      return b.stewards ? <Stewards rs={b.stewards} /> : missing;
    case "honours":
      return b.honours ? <Honours rs={b.honours} /> : missing;
    case "h2h":
      return b.h2h ? <HeadToHead rs={b.h2h} /> : missing;
    case "movers":
      return b.movers ? <Movers rs={b.movers} /> : missing;
    case "strategy":
      return b.strategy ? <Strategy rs={b.strategy} audit={b.audit} /> : missing;
    case "plan":
      return b.plans.length > 0 ? <PlanPanel plans={b.plans} /> : missing;
  }
}

function Schema({ tables }: { tables: TableInfo[] }) {
  if (tables.length === 0) return <Empty>No tables found.</Empty>;
  return (
    <ul className="space-y-2">
      {tables.map((t) => {
        const mine = !SEED_TABLES.has(t.name);
        return (
          <li key={t.name} className="min-w-0">
            <div className="flex min-w-0 items-baseline gap-2">
              <span className={`hud-value truncate text-[11.5px] ${mine ? "hud-accent" : ""}`}>{t.name}</span>
              {mine && <span className="hud-label hud-accent shrink-0">yours</span>}
              <span className="hud-value hud-muted ml-auto shrink-0 text-[10px] tabular-nums">{plural(t.rowCount, "row")}</span>
            </div>
            <p className="truncate font-mono text-[10px] leading-snug text-white/45">{t.columns.map((c) => c.name).join(" · ")}</p>
          </li>
        );
      })}
    </ul>
  );
}

export default function SeasonAnalyticsScene({ program, unlocked, focus, celebration, interactive }: SceneProps) {
  const [pick, setPick] = React.useState<string | null>(null);
  const results = readResults(program);
  const tables = readTables(program);
  const bundle = assign(results);
  const last = results.at(-1) ?? null;
  const flashing = new Set(celebration?.features ?? []);
  const live = PANELS.filter((p) => !!program && unlocked.has(p.feature)).length;
  const rounds = tables.find((t) => t.name === "races")?.rowCount;

  const renderPanel = (p: PanelDef) => {
    const alive = !!program && unlocked.has(p.feature);
    const spot = focus === p.feature;
    if (!alive) return <LockedPanel key={p.id} id={p.id} title={p.title} kind={p.ghost} lesson={p.lesson} clause={p.clause} spot={spot} wide={p.wide} />;
    const n = rowsFor(p.id, bundle);
    return (
      <PanelFrame
        key={flashing.has(p.feature) ? `${p.id}:${celebration?.nonce}` : p.id}
        id={p.id}
        title={p.title}
        icon={<FeatureIcon id={p.feature} className="h-3.5 w-3.5" />}
        meta={n === undefined ? undefined : plural(n, "row")}
        focus={spot}
        flash={flashing.has(p.feature)}
        wide={p.wide}
      >
        <Body id={p.id} b={bundle} />
      </PanelFrame>
    );
  };

  const focused = PANELS.find((p) => p.feature === focus) ?? null;
  // live panels first (in lesson order of the PANELS list), then the ghosts of what is still to come
  const isLive = (p: PanelDef) => !!program && unlocked.has(p.feature);
  const rest = PANELS.filter((p) => p.id !== focused?.id)
    .map((p, i) => ({ p, i }))
    .sort((a, b) => Number(isLive(b.p)) - Number(isLive(a.p)) || a.i - b.i)
    .map(({ p }) => p);

  const consolePanel = program ? (
    <PanelFrame key="console" id="console" title="Query console" icon={<Terminal className="h-3.5 w-3.5" />} meta={last ? plural(last.rows.length, "row") : undefined}>
      <Console rs={last} stdout={program.stdout} count={results.length} interactive={interactive} />
    </PanelFrame>
  ) : (
    <LockedPanel key="console" id="console" title="Query console" kind="console" clause="Run your query.sql" spot={false} />
  );

  const schemaPanel = program ? (
    <PanelFrame key="schema" id="schema" title="Database" icon={<Database className="h-3.5 w-3.5 text-white/55" />} meta={plural(tables.length, "table")}>
      <Schema tables={tables} />
    </PanelFrame>
  ) : (
    <LockedPanel key="schema" id="schema" title="Database" kind="schema" clause="10 tables · 2026 season" spot={false} />
  );

  return (
    <PickContext.Provider value={{ pick, setPick, interactive }}>
      <div data-scene="season-analytics" className={`@container absolute inset-0 ${interactive ? "overflow-y-auto overscroll-contain" : "overflow-hidden"}`}>
        <div className="px-3 pb-3 pt-12">
          <div className="mb-3 flex min-w-0 items-baseline gap-x-3 gap-y-0.5 px-0.5">
            <h2 className="hud-title min-w-0 truncate">Halcyon Racing · 2026 season</h2>
            <span className="hud-value hud-muted hidden shrink-0 text-[11px] @sm:inline">{rounds ? plural(rounds, "round") : "10 rounds"}</span>
            {pick && interactive && (
              <button type="button" onClick={() => setPick(null)} className="hud-tag hud-accent shrink-0 cursor-pointer" title="Clear highlight">
                {pick} ✕
              </button>
            )}
            <span className="hud-label ml-auto shrink-0">
              <span className={`hud-value ${live > 0 ? "hud-accent" : "text-white/45"}`}>{live}</span>/{PANELS.length} panels live
            </span>
          </div>
          <div className="grid grid-cols-1 items-start gap-3 @2xl:grid-cols-2 @6xl:grid-cols-3">
            {focused && renderPanel(focused)}
            {focused ? consolePanel : null}
            {rest.map(renderPanel)}
            {focused ? null : consolePanel}
            {schemaPanel}
          </div>
        </div>
      </div>
    </PickContext.Provider>
  );
}
