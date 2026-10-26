"use client";

import React from "react";
import { Lock } from "lucide-react";
import { FeatureIcon } from "@/components/ui/icons";
import { ErDiagram, ErGhost } from "./er";
import { MigrationTimeline, TallyBar, tallyOf, txSummary } from "./panels";
import { clip, findFlip, FEATURE_LESSON, plural, readPlans, type FeatureId, type Flags, type LogEntry, type MigrationNode, type Plan, type ResultSet, type SketchLink, type TableInfo, type Tx } from "./model";

/**
 * The compact board: what the scene shows when its stage is short and wide (the project hub, the
 * landing page), so the whole schema reads at a glance without scrolling. It is drawn at a fixed
 * logical size and scaled to fit by the scene.
 */

export const OVERVIEW_W = 680;
export const OVERVIEW_H = 440;

export interface Bundle {
  program: boolean;
  tables: TableInfo[];
  results: ResultSet[];
  log: LogEntry[];
  sketch: SketchLink[];
  flags: Flags;
  txs: Tx[];
  migrations: MigrationNode[];
  unlocked: ReadonlySet<string>;
  focus: string | null;
  flashing: ReadonlySet<string>;
}

const alive = (b: Bundle, id: FeatureId) => b.program && b.unlocked.has(id);

function MiniFrame({ id, title, feature, b, children }: { id: string; title: string; feature: FeatureId; b: Bundle; children: React.ReactNode }) {
  if (!alive(b, feature)) {
    return (
      <div data-panel={id} data-locked="" className={`flex min-h-0 min-w-0 flex-col rounded-[10px] border border-dashed px-2.5 py-2 ${b.focus === feature ? "pulse-ring border-[#c5ee8a]/60" : "border-white/15"}`}>
        <div className="flex min-w-0 items-center gap-2">
          <Lock className="h-3 w-3 shrink-0 text-white/35" aria-hidden />
          <span className="hud-label min-w-0 flex-1 truncate !text-[10.5px]">{title}</span>
          <span className="hud-label shrink-0 !text-[10px] text-white/30">L{FEATURE_LESSON[feature]}</span>
        </div>
        <div className="mt-2 space-y-1.5" aria-hidden>
          {[80, 56].map((w) => (
            <div key={w} className="h-1.5 rounded-sm bg-white/[0.05]" style={{ width: `${w}%` }} />
          ))}
        </div>
      </div>
    );
  }
  return (
    <div data-panel={id} className={`hud-panel flex min-h-0 min-w-0 flex-col !px-2.5 !py-2 ${b.flashing.has(feature) ? "pop-in" : ""} ${b.focus === feature ? "!border-[#c5ee8a]/35" : ""}`}>
      <div className="mb-1.5 flex min-w-0 items-center gap-1.5">
        <FeatureIcon id={feature} className="h-3.5 w-3.5 shrink-0 text-[#c5ee8a]" />
        <span className="hud-title min-w-0 flex-1 truncate">{title}</span>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
    </div>
  );
}

function PlanMini({ plans }: { plans: Plan[] }) {
  const flip = findFlip(plans);
  const last = plans[plans.length - 1];
  if (!flip && !last) return <p className="text-[11px] text-white/50">Run EXPLAIN QUERY PLAN to see how a lookup is answered.</p>;
  const line = (p: Plan) => p.lines[0];
  const row = (p: Plan, tag: string) => {
    const l = line(p);
    if (!l) return null;
    return (
      <p className="flex min-w-0 items-center gap-1.5 font-mono text-[11px]">
        <span className={`shrink-0 rounded-sm px-1 text-[10px] font-bold ${l.op === "SCAN" ? "bg-[#fbbf24]/15 text-[#fbbf24]" : "bg-[#c5ee8a]/15 text-[#d3f3a4]"}`}>{l.op === "OTHER" ? tag : l.op}</span>
        <span className="min-w-0 truncate text-white/75">{l.table}{l.index ? ` · ${l.index}` : ""}</span>
      </p>
    );
  };
  if (flip) {
    return (
      <div className="space-y-1">
        {row(flip.before, "SCAN")}
        {row(flip.after, "SEARCH")}
      </div>
    );
  }
  return <div>{row(last, "plan")}</div>;
}

export function StatusChip({ id, title, value, b }: { id: FeatureId; title: string; value: string | undefined; b: Bundle }) {
  if (!alive(b, id)) {
    return (
      <div data-panel={`chip-${id}`} data-locked="" className={`flex min-w-0 items-center gap-1.5 rounded-lg border border-dashed px-2 py-1.5 ${b.focus === id ? "pulse-ring border-[#c5ee8a]/60" : "border-white/15"}`}>
        <Lock className="h-3 w-3 shrink-0 text-white/35" aria-hidden />
        <span className="hud-label min-w-0 flex-1 truncate !text-[10.5px]">{title}</span>
        <span className="hud-label shrink-0 !text-[10px] text-white/30">L{FEATURE_LESSON[id]}</span>
      </div>
    );
  }
  return (
    <div data-panel={`chip-${id}`} className={`flex min-w-0 items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1.5 ${b.flashing.has(id) ? "pop-in" : ""}`}>
      <FeatureIcon id={id} className="h-3.5 w-3.5 shrink-0 text-[#c5ee8a]" />
      <div className="min-w-0 flex-1">
        <div className="hud-label truncate !text-[10px]">{title}</div>
        <div className="hud-value truncate text-[11.5px] leading-tight" style={{ color: value === undefined ? "rgba(255,255,255,0.3)" : "#f4f4f4" }}>
          {value ?? "—"}
        </div>
      </div>
    </div>
  );
}

function count(tables: TableInfo[], name: string): number | undefined {
  return tables.find((t) => t.name === name)?.rowCount;
}

export function CompactBoard({ b }: { b: Bundle }) {
  const plans = readPlans(b.results);
  const tally = tallyOf(b.log);
  const lastTx = b.txs[b.txs.length - 1];
  const live = (["ss-sketch", "ss-tables", "ss-firewall", "ss-keys", "ss-checks", "ss-links", "ss-refactor", "ss-junction", "ss-plan", "ss-smart-indexes", "ss-views", "ss-audit", "ss-tx", "ss-upsert", "ss-json", "ss-migrations", "ss-bookings"] as FeatureId[]).filter((id) => alive(b, id)).length;
  const hasEr = alive(b, "ss-sketch") || alive(b, "ss-tables");
  const views = b.tables.filter((t) => t.kind === "view").length;
  const triggers = b.tables.reduce((n, t) => n + t.triggers.length, 0);
  const returning = b.results.filter((r) => /\breturning\b/i.test(r.sql.replace(/--[^\n]*/g, " "))).length;
  const tool = b.tables.find((t) => t.name === "tool");
  const gen = tool?.columns.find((c) => c.generated);
  const slots = count(b.tables, "booking_slot");
  const erTables = b.tables.filter((t) => t.kind === "table" && t.name !== "legacy_sheet" && t.name !== "door_log").length;
  return (
    <>
      <div className="flex shrink-0 items-center gap-2 px-0.5">
        <h2 className="hud-title !text-[14px]">Lantern Yard · schema</h2>
        <span className="hud-label min-w-0 truncate !text-[11px] text-white/55">· {b.program ? plural(erTables, "table") : "waiting for your SQL"}</span>
        <span className="hud-label ml-auto shrink-0 !text-[11px]">
          <span className={`hud-value ${live > 0 ? "hud-accent" : "text-white/45"}`}>{live}</span>/17 panels live
        </span>
      </div>
      <div className="flex min-h-0 flex-1 gap-2.5">
        <div className={`hud-panel flex min-h-0 w-[430px] shrink-0 flex-col !px-2.5 !py-2 ${b.focus && ["ss-sketch", "ss-tables", "ss-keys", "ss-checks", "ss-links", "ss-junction"].includes(b.focus) ? "!border-[#c5ee8a]/35" : ""}`}>
          <div className="mb-1.5 flex items-center gap-1.5">
            <FeatureIcon id="ss-tables" className="h-3.5 w-3.5 text-[#c5ee8a]" />
            <span className="hud-title">{alive(b, "ss-tables") ? "ER diagram" : "Design sketch"}</span>
          </div>
          <div className="flex min-h-0 flex-1 flex-col justify-center overflow-hidden">
            {b.program && hasEr ? <ErDiagram tables={b.tables} sketch={b.sketch} flags={b.flags} mode="mini" fixedWidth={408} /> : <ErGhost message={b.program ? "Your model is drawn here" : "Run your schema to draw it"} tall />}
          </div>
        </div>
        <div className="grid min-h-0 min-w-0 flex-1 grid-rows-4 gap-2">
          <MiniFrame id="mini-firewall" title="Constraint firewall" feature="ss-firewall" b={b}>
            {tally.refused + tally.accepted === 0 ? (
              <p className="text-[11px] text-white/50">Nothing refused yet.</p>
            ) : (
              <div>
                <p className="hud-value mb-1.5 text-[11.5px]">
                  <span className="hud-accent">{tally.refused}</span> <span className="hud-muted">refused</span>
                  {tally.accepted > 0 && <span className="hud-warning"> · {tally.accepted} got through</span>}
                </p>
                <TallyBar byKind={tally.byKind} refused={tally.refused} />
                <p className="mt-1 truncate font-mono text-[10px] text-white/45">{Object.entries(tally.byKind).map(([k, n]) => `${k.toLowerCase()} ${n}`).join(" · ")}</p>
              </div>
            )}
          </MiniFrame>
          <MiniFrame id="mini-plan" title="Query plan" feature="ss-plan" b={b}>
            <PlanMini plans={plans} />
          </MiniFrame>
          <MiniFrame id="mini-migrations" title="Migrations" feature="ss-migrations" b={b}>
            <MigrationTimeline nodes={b.migrations} compact />
          </MiniFrame>
          <MiniFrame id="mini-tx" title="Transactions" feature="ss-tx" b={b}>
            {lastTx ? (
              <div className="font-mono text-[11px]">
                <p className={`font-bold ${txSummary(lastTx).tone === "ok" ? "text-[#c5ee8a]" : "text-[#fbbf24]"}`}>{txSummary(lastTx).text}</p>
                <p className="mt-0.5 truncate text-white/45">{clip(lastTx.steps.filter((s) => s.kind === "stmt").map((s) => s.label).join(", "), 44)}</p>
              </div>
            ) : (
              <p className="text-[11px] text-white/50">No transactions yet.</p>
            )}
          </MiniFrame>
        </div>
      </div>
      <div className="grid shrink-0 grid-cols-6 gap-2">
        <StatusChip id="ss-refactor" title="Forms" value={count(b.tables, "booking")?.toLocaleString("en-US")} b={b} />
        <StatusChip id="ss-views" title="Views" value={String(views)} b={b} />
        <StatusChip id="ss-audit" title="Audit" value={String(triggers)} b={b} />
        <StatusChip id="ss-upsert" title="Upsert" value={String(returning)} b={b} />
        <StatusChip id="ss-json" title="JSON" value={gen ? gen.name : tool ? "specs" : undefined} b={b} />
        <StatusChip id="ss-bookings" title="Slots" value={slots?.toLocaleString("en-US")} b={b} />
      </div>
    </>
  );
}
