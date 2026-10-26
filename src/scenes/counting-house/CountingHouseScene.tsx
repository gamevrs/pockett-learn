"use client";

import React from "react";
import { Database, Terminal, TriangleAlert } from "lucide-react";
import type { SceneProps } from "@/engine/scene";
import { FeatureIcon } from "@/components/ui/icons";
import { assign, hasData, PANELS, plural, readError, readResults, readTables, rowsFor, TENANT_NAMES, type Bundle, type PanelDef, type SqlErr } from "./model";
import { chipSpecs, Overview, OVERVIEW_H, OVERVIEW_W, StatusChip } from "./overview";
import { Guards, IdemDesk, MoneyDesk, OutboxRelay, Posting, Trial } from "./panels-a";
import { AuditTrail, DeadLetters, Plans, QueueBoard, Retention, Tenants } from "./panels-b";
import { CloseBooks, Console, Migrations, Pages, Quality, Rollups, Schema, Statements } from "./panels-c";
import { CSS, Empty, LockedPanel, PanelFrame } from "./ui";

/**
 * Counting House: the production console for Fernhollow Co-op Market.
 *
 * The runtime hands the scene every result set the query file produced. Each panel finds its own by
 * the columns it returns (see model.ts `assign`), shows a ghost until its lesson is passed, and
 * draws whatever the learner's query actually returned. The query console shows the latest result
 * set whatever it is, and a failed statement shows up as a strip at the top.
 *
 * Colour follows the Pockett Stage system: neutral greys for structure, lime only for values the
 * learner's queries produced, amber for caution, red for failures.
 */

const NEEDS: Record<string, string> = {
  "ch-trial": "code, account, kind, debit_cents, credit_cents, balance_cents",
  "ch-posting": "source, entries, lines, total_cents",
  "ch-guards": "rule, violations",
  "ch-money": "order_id, stored_fee_cents, correct_fee_cents · seller, share_cents · currency, amount_cents, display",
  "ch-idem": "req_id, idem_key, seller_id, amount_cents, outcome",
  "ch-outbox": "event_id, topic, aggregate_id, status",
  "ch-queue": "job_id, kind, state, attempts, max_attempts, priority, run_at, locked_by, lease_until",
  "ch-dead": "job_id, kind, attempts, max_attempts, last_error",
  "ch-audit": "audit_id, at, actor, table_name, row_id, field, old_value, new_value",
  "ch-retention": "store, purged, kept",
  "ch-tenants": "as_tenant, entries, lines, debits_cents",
  "ch-plans": "EXPLAIN QUERY PLAN SELECT …",
  "ch-pages": "page, entry_id, posted_at, memo",
  "ch-statement": "posted_at, memo, debit_cents, credit_cents, balance_cents",
  "ch-rollup": "day, attempts, ok, approval_pct, ok_cents, avg_latency_ms",
  "ch-quality": "check_name, severity, violations",
  "ch-migrations": "version, name, phase, applied_at",
  "ch-close": "proof, expected_cents, actual_cents, ok",
};

function Body({ id, b, tables, interactive }: { id: string; b: Bundle; tables: ReturnType<typeof readTables>; interactive: boolean }) {
  switch (id) {
    case "ch-trial":
      return <Trial rs={b.trial} beam={b.beam} interactive={interactive} />;
    case "ch-posting":
      return b.posting ? <Posting rs={b.posting} /> : null;
    case "ch-guards":
      return b.guards ? <Guards rs={b.guards} /> : null;
    case "ch-money":
      return <MoneyDesk b={b} />;
    case "ch-idem":
      return <IdemDesk stream={b.idemStream} summary={b.idemSummary} interactive={interactive} />;
    case "ch-outbox":
      return b.outbox ? <OutboxRelay rs={b.outbox} claim={b.claim} /> : null;
    case "ch-queue":
      return b.board ? <QueueBoard rs={b.board} /> : null;
    case "ch-dead":
      return <DeadLetters dead={b.dead} board={b.board} />;
    case "ch-audit":
      return b.audit ? <AuditTrail rs={b.audit} /> : null;
    case "ch-retention":
      return b.retention ? <Retention rs={b.retention} /> : null;
    case "ch-tenants":
      return <Tenants sets={b.tenants} lookup={b.lookup} />;
    case "ch-plans":
      return <Plans groups={b.plans} tables={tables} />;
    case "ch-pages":
      return <Pages b={b} />;
    case "ch-statement":
      return <Statements statement={b.statement} mom={b.mom} />;
    case "ch-rollup":
      return <Rollups b={b} />;
    case "ch-quality":
      return <Quality checks={b.checks} recon={b.recon} />;
    case "ch-migrations":
      return <Migrations migrations={b.migrations} progress={b.progress} />;
    case "ch-close":
      return b.proofs ? <CloseBooks rs={b.proofs} /> : null;
    default:
      return null;
  }
}

/** Space the stage shell keeps for its own label and expand button along the top edge. */
const SHELL_TOP = 44;

/** Short and wide stages (the project hub, the landing page) get the one-screen overview. */
const isCompact = (box: { w: number; h: number } | null) => box !== null && box.w >= 420 && box.h <= 600 && box.w / box.h >= 1.2;

function ErrorStrip({ error }: { error: SqlErr }) {
  return (
    <div role="alert" className="mb-3 flex min-w-0 items-start gap-2 rounded-[10px] border border-[#f87171]/40 bg-[#2a0f0f]/70 px-3 py-2">
      <TriangleAlert className="mt-px h-3.5 w-3.5 shrink-0 text-[#f87171]" aria-hidden />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="hud-title hud-danger">That statement failed</span>
          {error.line !== null && <span className="hud-tag hud-danger shrink-0 border-[#f87171]/40">line {error.line}</span>}
        </div>
        <p className="mt-0.5 break-words font-mono text-[11px] leading-snug text-[#fecaca]">{error.message}</p>
        <p className="hud-muted mt-0.5 text-[10.5px]">Nothing after it ran. The panels show the results from before the error.</p>
      </div>
    </div>
  );
}

export default function CountingHouseScene({ program, unlocked, focus, celebration, interactive }: SceneProps) {
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

  const results = readResults(program);
  const tables = readTables(program);
  const error = readError(program);
  const bundle = assign(results);
  const last = results.at(-1) ?? null;
  const flashing = new Set(celebration?.features ?? []);
  const live = PANELS.filter((p) => !!program && unlocked.has(p.id)).length;
  const generation = program?.generation ?? 0;

  if (box && isCompact(box)) {
    const availH = Math.max(box.h - SHELL_TOP, 120);
    const scale = Math.min(box.w / OVERVIEW_W, availH / OVERVIEW_H);
    const chips = chipSpecs(bundle);
    return (
      <div ref={measure} data-scene="counting-house" className="absolute inset-0 overflow-hidden">
        <style>{CSS}</style>
        <div
          className="absolute flex flex-col gap-2.5"
          style={{ width: OVERVIEW_W, height: OVERVIEW_H, left: (box.w - OVERVIEW_W * scale) / 2, top: SHELL_TOP + (availH - OVERVIEW_H * scale) / 2, transform: `scale(${scale})`, transformOrigin: "top left" }}
        >
          <div className="relative flex min-w-0 shrink-0 items-center gap-2 px-0.5">
            <h2 className="hud-title !text-[14px]">Fernhollow Co-op Market</h2>
            <span className="hud-label min-w-0 truncate !text-[11px] text-white/55">· production console</span>
            <span className="hud-label ml-auto shrink-0 !text-[11px]">
              <span className={`hud-value ${live > 0 ? "hud-accent" : "text-white/45"}`}>{live}</span>/{PANELS.length} panels live
            </span>
            {program && <span key={generation} aria-hidden className="ch-scan pointer-events-none absolute inset-x-0 -bottom-1 h-px bg-gradient-to-r from-transparent via-[#c5ee8a] to-transparent" />}
          </div>
          {error ? (
            <div role="alert" className="flex min-w-0 shrink-0 items-center gap-2 rounded-[10px] border border-[#f87171]/40 bg-[#2a0f0f]/70 px-3 py-2">
              <span className="hud-title hud-danger shrink-0">Statement failed</span>
              {error.line !== null && <span className="hud-tag hud-danger shrink-0 border-[#f87171]/40">line {error.line}</span>}
              <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-[#fecaca]">{error.message}</span>
            </div>
          ) : null}
          <Overview b={bundle} unlocked={unlocked} built={!!program} />
          <div className="grid shrink-0 grid-cols-6 gap-2">
            {chips.map((c) => (
              <StatusChip key={c.id} spec={c} unlocked={unlocked.has(c.id)} built={!!program} spot={focus === c.id} flash={flashing.has(c.id)} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const renderPanel = (p: PanelDef) => {
    const alive = !!program && unlocked.has(p.id);
    const spot = focus === p.id;
    if (!alive) return <LockedPanel key={p.id} id={p.id} title={p.title} kind={p.ghost} lesson={p.lesson} clause={p.clause} spot={spot} wide={p.wide} />;
    const rows = rowsFor(p.id, bundle);
    return (
      <PanelFrame
        key={flashing.has(p.id) ? `${p.id}:${celebration?.nonce}` : p.id}
        id={p.id}
        title={p.title}
        icon={<FeatureIcon id={p.id} className="h-3.5 w-3.5" />}
        meta={rows === undefined ? undefined : plural(rows, "row")}
        focus={spot}
        flash={flashing.has(p.id)}
        wide={p.wide}
      >
        {hasData(p.id, bundle) ? <Body id={p.id} b={bundle} tables={tables} interactive={interactive} /> : <Empty>No query for this panel yet. Return the columns: {NEEDS[p.id]}.</Empty>}
      </PanelFrame>
    );
  };

  const focused = PANELS.find((p) => p.id === focus) ?? null;
  const isLive = (p: PanelDef) => !!program && unlocked.has(p.id);
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
    <LockedPanel key="schema" id="schema" title="Database" kind="schema" clause="12 tables · 3 co-ops" spot={false} />
  );

  return (
    <div ref={measure} data-scene="counting-house" className={`@container absolute inset-0 ${interactive ? "overflow-y-auto overscroll-contain" : "overflow-hidden"}`}>
      <style>{CSS}</style>
      <div className="px-3 pb-3 pt-12">
        <div className="mb-3 flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1 px-0.5">
          <h2 className="hud-title min-w-0 truncate">Fernhollow Co-op Market · production console</h2>
          <span className="hud-tag hidden shrink-0 text-white/65 @sm:inline-flex">
            tenant 1 · {TENANT_NAMES[1].currency}
          </span>
          <span className="hud-label ml-auto shrink-0">
            <span className={`hud-value ${live > 0 ? "hud-accent" : "text-white/45"}`}>{live}</span>/{PANELS.length} panels live
          </span>
        </div>
        {error && <ErrorStrip error={error} />}
        <div className="grid grid-cols-1 items-start gap-3 @2xl:grid-cols-2 @6xl:grid-cols-3">
          {focused && renderPanel(focused)}
          {focused ? consolePanel : null}
          {rest.map(renderPanel)}
          {focused ? null : consolePanel}
          {schemaPanel}
        </div>
      </div>
    </div>
  );
}
