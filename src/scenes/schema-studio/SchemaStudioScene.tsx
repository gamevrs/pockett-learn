"use client";

import React from "react";
import { Database } from "lucide-react";
import type { SceneProps } from "@/engine/scene";
import { FeatureIcon } from "@/components/ui/icons";
import { ErDiagram, ErGhost, ErLegend } from "./er";
import { CompactBoard, OVERVIEW_H, OVERVIEW_W, type Bundle } from "./overview";
import { AuditPanel, BookingsPanel, DatabaseList, Firewall, JsonPanel, MigrationTimeline, NormalForms, PlanPanel, RelicChips, TxConsole, UpsertPanel, ViewsPanel } from "./panels";
import { FEATURE_LESSON, FEATURES, flagsOf, plural, readLog, readMigrations, readResults, readSketch, readTables, readTransactions, RELICS, type FeatureId } from "./model";
import { Empty, LockedPanel, PanelFrame, type GhostKind } from "./ui";

/**
 * Schema Studio: the live board for Lantern Yard's database.
 *
 * The ER diagram at the top grows as the learner's file does: a dashed sketch from the model they
 * return, solid cards for every table, then keys, checks, foreign-key arrows, junction tags and
 * index chips as each lesson is passed. Every other panel finds its data by the columns or log lines
 * it needs, shows a ghost until its lesson is passed, and then draws what the learner's SQL actually
 * produced. Statements marked `-- expect error` feed the constraint firewall.
 *
 * Colour follows the Pockett Stage system: neutral greys for structure, lime only for what the
 * learner's code produced, amber for caution, red for failures.
 */

type PanelId = "firewall" | "refactor" | "plan" | "views" | "audit" | "tx" | "upsert" | "json" | "migrations" | "bookings";

interface PanelDef {
  id: PanelId;
  feature: FeatureId;
  title: string;
  clause: string;
  ghost: GhostKind;
  wide?: boolean;
}

const PANELS: PanelDef[] = [
  { id: "firewall", feature: "ss-firewall", title: "Constraint firewall", clause: "NOT NULL · UNIQUE · CHECK · FOREIGN KEY", ghost: "feed" },
  { id: "refactor", feature: "ss-refactor", title: "Normal forms", clause: "1NF → 3NF · INSERT … SELECT", ghost: "map", wide: true },
  { id: "plan", feature: "ss-plan", title: "Query plans", clause: "EXPLAIN QUERY PLAN · CREATE INDEX", ghost: "plan" },
  { id: "views", feature: "ss-views", title: "Views", clause: "CREATE VIEW", ghost: "table" },
  { id: "audit", feature: "ss-audit", title: "Triggers & audit", clause: "CREATE TRIGGER … BEGIN … END", ghost: "feed" },
  { id: "tx", feature: "ss-tx", title: "Transaction console", clause: "BEGIN · COMMIT · ROLLBACK · SAVEPOINT", ghost: "console" },
  { id: "upsert", feature: "ss-upsert", title: "Upserts & RETURNING", clause: "ON CONFLICT DO UPDATE · RETURNING", ghost: "table" },
  { id: "json", feature: "ss-json", title: "JSON & generated columns", clause: "json_extract · ->> · GENERATED ALWAYS AS", ghost: "grid" },
  { id: "migrations", feature: "ss-migrations", title: "Migration timeline", clause: "expand · backfill · switch · contract", ghost: "timeline", wide: true },
  { id: "bookings", feature: "ss-bookings", title: "Collision-proof bookings", clause: "PRIMARY KEY (tool_id, slot_start)", ghost: "bars" },
];

/** Features whose home is the ER diagram. */
const ER_FEATURES = new Set<string>(["ss-sketch", "ss-tables", "ss-keys", "ss-checks", "ss-links", "ss-junction"]);

/** Space the stage shell keeps for its own label and expand button along the top edge. */
const SHELL_TOP = 44;

/** Short and wide stages (the project hub, the landing page) get the one-screen overview. */
const isCompact = (box: { w: number; h: number } | null) => box !== null && box.w >= 420 && box.h <= 600 && box.w / box.h >= 1.2;

export default function SchemaStudioScene({ program, unlocked, focus, celebration, interactive }: SceneProps) {
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

  const tables = readTables(program);
  const results = readResults(program);
  const log = readLog(program);
  const sketch = readSketch(results);
  const txs = readTransactions(log);
  const migrations = readMigrations(results, txs);
  const flags = flagsOf(unlocked, program);
  const flashing = new Set(celebration?.features ?? []);
  const isLive = (id: FeatureId) => !!program && unlocked.has(id);
  const liveCount = FEATURES.filter(isLive).length;
  const erTables = tables.filter((t) => t.kind === "table" && !RELICS.has(t.name));
  const heroLive = flags.sketch || flags.tables;

  const bundle: Bundle = { program: !!program, tables, results, log, sketch, flags, txs, migrations, unlocked, focus, flashing };

  if (box && isCompact(box)) {
    const availH = Math.max(box.h - SHELL_TOP, 120);
    const scale = Math.min(box.w / OVERVIEW_W, availH / OVERVIEW_H);
    return (
      <div ref={measure} data-scene="schema-studio" className="absolute inset-0 overflow-hidden">
        <div
          className="absolute flex flex-col gap-2.5"
          style={{ width: OVERVIEW_W, height: OVERVIEW_H, left: (box.w - OVERVIEW_W * scale) / 2, top: SHELL_TOP + (availH - OVERVIEW_H * scale) / 2, transform: `scale(${scale})`, transformOrigin: "top left" }}
        >
          <CompactBoard b={bundle} />
        </div>
      </div>
    );
  }

  const body = (id: PanelId): React.ReactNode => {
    switch (id) {
      case "firewall":
        return <Firewall log={log} />;
      case "refactor":
        return <NormalForms tables={tables} results={results} />;
      case "plan":
        return <PlanPanel results={results} tables={tables} smart={isLive("ss-smart-indexes")} />;
      case "views":
        return <ViewsPanel tables={tables} />;
      case "audit":
        return <AuditPanel results={results} tables={tables} />;
      case "tx":
        return <TxConsole txs={txs} />;
      case "upsert":
        return <UpsertPanel results={results} />;
      case "json":
        return <JsonPanel tables={tables} results={results} />;
      case "migrations":
        return <MigrationTimeline nodes={migrations} />;
      case "bookings":
        return <BookingsPanel log={log} results={results} tables={tables} />;
    }
  };

  const meta = (id: PanelId): string | undefined => {
    switch (id) {
      case "firewall": {
        const n = log.filter((e) => e.expected && e.error).length;
        return n ? `${n} refused` : undefined;
      }
      case "views":
        return plural(tables.filter((t) => t.kind === "view").length, "view");
      case "tx":
        return txs.length ? plural(txs.length, "transaction") : undefined;
      case "migrations":
        return migrations.length ? `v${migrations[migrations.length - 1].version}` : undefined;
      default:
        return undefined;
    }
  };

  const renderPanel = (p: PanelDef) => {
    const live = isLive(p.feature);
    const spot = focus === p.feature || (p.id === "plan" && focus === "ss-smart-indexes");
    if (!live) return <LockedPanel key={p.id} id={p.id} title={p.title} kind={p.ghost} lesson={FEATURE_LESSON[p.feature]} clause={p.clause} spot={spot} wide={p.wide} />;
    const flash = flashing.has(p.feature) || (p.id === "plan" && flashing.has("ss-smart-indexes"));
    return (
      <PanelFrame
        key={flash ? `${p.id}:${celebration?.nonce}` : p.id}
        id={p.id}
        title={p.title}
        icon={<FeatureIcon id={p.feature} className="h-3.5 w-3.5" />}
        meta={meta(p.id)}
        focus={spot}
        flash={flash}
        wide={p.wide}
      >
        {body(p.id)}
      </PanelFrame>
    );
  };

  const focused = PANELS.find((p) => p.feature === focus || (p.id === "plan" && focus === "ss-smart-indexes")) ?? null;
  const rest = PANELS.filter((p) => p.id !== focused?.id)
    .map((p, i) => ({ p, i }))
    .sort((a, b) => Number(isLive(b.p.feature)) - Number(isLive(a.p.feature)) || a.i - b.i)
    .map(({ p }) => p);

  const heroSpot = !!focus && ER_FEATURES.has(focus);
  const heroFlash = [...ER_FEATURES].some((f) => flashing.has(f));
  const hero = (
    <section data-panel="er" className={`hud-panel col-span-full min-w-0 px-3 py-2.5 ${heroSpot ? "border-[#c5ee8a]/35" : ""} ${heroFlash ? "pop-in" : ""}`}>
      <header className="mb-2.5 flex min-w-0 items-center gap-2">
        <span className="shrink-0 text-[#c5ee8a]">
          <FeatureIcon id={flags.tables ? "ss-tables" : "ss-sketch"} className="h-3.5 w-3.5" />
        </span>
        <h3 className="hud-title min-w-0 flex-1 truncate">{flags.tables ? "ER diagram" : "Design sketch"}</h3>
        {flags.tables && erTables.length > 0 && <span className="hud-value hud-muted shrink-0 text-[10px]">{plural(erTables.length, "table")}</span>}
      </header>
      {!program ? (
        <ErGhost message="Run your schema.sql and the diagram draws itself here." />
      ) : !heroLive ? (
        <ErGhost message={heroSpot ? "Your SQL powers this: return your model's relationships." : "Pass lesson 1 to draw your model here."} />
      ) : erTables.length === 0 && sketch.length === 0 ? (
        <div>
          <ErGhost message="Nothing to draw yet." />
          <Empty>Return a result with the columns a, b, cardinality (one row per relationship), or create a table.</Empty>
        </div>
      ) : (
        <>
          <ErDiagram tables={tables} sketch={sketch} flags={flags} focus={null} />
          <ErLegend flags={flags} />
          {flags.tables && <RelicChips tables={tables} />}
        </>
      )}
    </section>
  );

  const databasePanel = program ? (
    <PanelFrame key="db" id="database" title="Database" icon={<Database className="h-3.5 w-3.5 text-white/55" />} meta={plural(tables.length, "table")}>
      <DatabaseList tables={tables} />
    </PanelFrame>
  ) : (
    <LockedPanel key="db" id="database" title="Database" kind="table" clause="Run your schema.sql" spot={false} />
  );

  return (
    <div ref={measure} data-scene="schema-studio" className={`@container absolute inset-0 ${interactive ? "overflow-y-auto overscroll-contain" : "overflow-hidden"}`}>
      <div className="px-3 pb-3 pt-12">
        <div className="mb-3 flex min-w-0 items-baseline gap-x-3 gap-y-0.5 px-0.5">
          <h2 className="hud-title min-w-0 truncate">Lantern Yard · schema</h2>
          <span className="hud-label ml-auto shrink-0">
            <span className={`hud-value ${liveCount > 0 ? "hud-accent" : "text-white/45"}`}>{liveCount}</span>/{FEATURES.length} panels live
          </span>
        </div>
        <div className="grid grid-cols-1 items-start gap-3 @2xl:grid-cols-2 @6xl:grid-cols-3">
          {hero}
          {focused && renderPanel(focused)}
          {rest.map(renderPanel)}
          {databasePanel}
        </div>
      </div>
    </div>
  );
}
