"use client";

import React from "react";
import { ArrowRight, Check, TriangleAlert } from "lucide-react";
import {
  cellOf,
  classifyRefusal,
  clip,
  describeTrigger,
  findFlip,
  flat,
  fmt,
  isNum,
  lastWith,
  plural,
  readPlans,
  RELICS,
  type LogEntry,
  type MigrationNode,
  type Phase,
  type Plan,
  type PlanLine,
  type RefusalKind,
  type ResultSet,
  type TableInfo,
  type Tx,
} from "./model";
import { DataGrid, Empty, More, Pill, useWidth } from "./ui";

/** One body per panel. Each reads only what it is handed; the scene decides when it is alive. */

// ───────────────────────── constraint firewall ─────────────────────────

const KIND_SHADE: Record<RefusalKind, string> = {
  "NOT NULL": "#c5ee8a",
  UNIQUE: "#abd373",
  CHECK: "#e0f6c1",
  "FOREIGN KEY": "#83ab49",
  TYPE: "#d3f3a4",
  RULE: "#4b7411",
};

export function tallyOf(log: LogEntry[]): { refused: number; accepted: number; byKind: Partial<Record<RefusalKind, number>> } {
  const byKind: Partial<Record<RefusalKind, number>> = {};
  let refused = 0;
  let accepted = 0;
  for (const e of log) {
    if (!e.expected) continue;
    if (e.error) {
      refused++;
      const k = classifyRefusal(e.error).kind;
      byKind[k] = (byKind[k] ?? 0) + 1;
    } else accepted++;
  }
  return { refused, accepted, byKind };
}

export function TallyBar({ byKind, refused }: { byKind: Partial<Record<RefusalKind, number>>; refused: number }) {
  if (refused === 0) return null;
  return (
    <div className="flex h-1.5 w-full gap-px overflow-hidden rounded-full bg-white/10" role="img" aria-label={`${refused} refused`}>
      {(Object.keys(KIND_SHADE) as RefusalKind[])
        .filter((k) => byKind[k])
        .map((k) => (
          <span key={k} style={{ width: `${((byKind[k] ?? 0) / refused) * 100}%`, background: KIND_SHADE[k] }} />
        ))}
    </div>
  );
}

export function Firewall({ log }: { log: LogEntry[] }) {
  const probes = log.filter((e) => e.expected).reverse();
  const { refused, accepted, byKind } = tallyOf(log);
  if (probes.length === 0) {
    return <Empty>No refused rows yet. Put a comment line `-- expect error` above a statement that should be turned away, and the database&apos;s reason shows up here.</Empty>;
  }
  const shown = probes.slice(0, 8);
  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="hud-value text-[11px]">
          <span className="hud-accent">{refused}</span> refused
        </span>
        {accepted > 0 && (
          <span className="hud-value hud-warning text-[11px]">
            {accepted} got through
          </span>
        )}
        <span className="hud-label min-w-0 truncate normal-case tracking-normal text-white/45">
          {(Object.keys(byKind) as RefusalKind[]).map((k) => `${k.toLowerCase()} ${byKind[k]}`).join(" · ")}
        </span>
      </div>
      <TallyBar byKind={byKind} refused={refused} />
      <ul className="mt-2.5 space-y-2">
        {shown.map((e, i) => {
          if (!e.error) {
            return (
              <li key={i} className="min-w-0">
                <div className="flex min-w-0 items-center gap-1.5">
                  <TriangleAlert className="h-3 w-3 shrink-0 text-[#fbbf24]" aria-hidden />
                  <Pill tone="warning">got through</Pill>
                  <span className="min-w-0 truncate text-[11px] text-[#fbbf24]">the database accepted it</span>
                </div>
                <p className="truncate pl-[18px] font-mono text-[10.5px] text-white/45">{clip(flat(e.sql), 120)}</p>
              </li>
            );
          }
          const r = classifyRefusal(e.error);
          return (
            <li key={i} className="min-w-0">
              <div className="flex min-w-0 items-center gap-1.5">
                <Check className="h-3 w-3 shrink-0 text-[#c5ee8a]" aria-hidden />
                <Pill tone="accent">{r.kind}</Pill>
                <span className="min-w-0 truncate font-mono text-[11px] text-white/85" title={e.error}>
                  {r.detail || e.error}
                </span>
              </div>
              <p className="truncate pl-[18px] font-mono text-[10.5px] text-white/45" title={flat(e.sql)}>
                {clip(flat(e.sql), 120)}
              </p>
            </li>
          );
        })}
      </ul>
      <More shown={shown.length} total={probes.length} />
    </div>
  );
}

// ───────────────────────── normal forms ─────────────────────────

const SHEET_MAP: { dest: string; cols: string[]; need: number; note?: string }[] = [
  { dest: "member", cols: ["member_name", "member_email", "member_phone", "badge_no"], need: 3 },
  { dest: "plan", cols: ["plan_name", "plan_fee_cents"], need: 1 },
  { dest: "workshop", cols: ["workshop_code", "workshop_name"], need: 1 },
  { dest: "tool", cols: ["tool_tag", "tool_name", "tool_rate_cents"], need: 4 },
  { dest: "certification", cols: ["certified_tools"], need: 1, note: "list in one cell" },
  { dest: "booking", cols: ["entry_id", "session_date", "start_time", "minutes", "note"], need: 1 },
];

export function NormalForms({ tables, results }: { tables: TableInfo[]; results: ResultSet[] }) {
  const sheet = tables.find((t) => t.name === "legacy_sheet");
  const by = new Map(tables.map((t) => [t.name, t]));
  const deps = lastWith(results, ["dependency", "violations"]);
  return (
    <div>
      <p className="mb-2 flex flex-wrap items-center gap-x-2 text-[11px]">
        <span className="hud-value text-white/80">legacy_sheet</span>
        <span className="hud-muted">{sheet ? `${plural(sheet.rowCount, "row")} · ${sheet.columns.length} columns, every fact repeated per row` : "the old spreadsheet"}</span>
      </p>
      <ul className="space-y-1.5">
        {SHEET_MAP.map((m) => {
          const t = by.get(m.dest);
          const done = !!t && t.kind === "table" && t.rowCount >= m.need;
          return (
            <li key={m.dest} className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1">
              <span className="flex min-w-0 flex-1 basis-[55%] flex-wrap gap-1">
                {m.cols.map((c) => (
                  <span key={c} className={`rounded-sm border px-1.5 py-px font-mono text-[10px] ${done ? "border-[#c5ee8a]/30 bg-[#c5ee8a]/[0.07] text-[#d3f3a4]" : "border-white/12 bg-white/[0.04] text-white/60"}`}>
                    {c}
                  </span>
                ))}
                {m.note && <Pill tone="warning">{m.note}</Pill>}
              </span>
              <ArrowRight className={`h-3 w-3 shrink-0 ${done ? "text-[#c5ee8a]" : "text-white/25"}`} aria-hidden />
              <span className={`flex w-[8.5rem] shrink-0 items-center gap-1.5 rounded-md border px-2 py-0.5 ${done ? "border-[#c5ee8a]/35 bg-[#c5ee8a]/[0.07]" : "border-dashed border-white/15"}`}>
                <span className={`hud-value min-w-0 flex-1 truncate text-[11px] ${done ? "text-[#d3f3a4]" : "text-white/45"}`}>{m.dest}</span>
                <span className={`hud-value shrink-0 text-[10px] tabular-nums ${done ? "text-white/70" : "text-white/35"}`}>{t ? t.rowCount.toLocaleString("en-US") : "—"}</span>
              </span>
            </li>
          );
        })}
      </ul>
      {deps && (
        <div className="mt-3 border-t border-white/[0.07] pt-2">
          <p className="hud-label mb-1.5">Does each fact depend on one thing?</p>
          <ul className="space-y-1">
            {deps.rows.slice(0, 8).map((row, i) => {
              const v = cellOf(deps, row, "violations");
              const bad = isNum(v) && v > 0;
              return (
                <li key={i} className="flex min-w-0 items-center gap-2 font-mono text-[10.5px]">
                  <span className="min-w-0 flex-1 truncate text-white/75">{fmt(cellOf(deps, row, "dependency"))}</span>
                  {bad ? <Pill tone="warning">{plural(v, "conflict")}</Pill> : <Pill tone="accent">holds</Pill>}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

// ───────────────────────── query plans ─────────────────────────

function PlanLines({ lines }: { lines: PlanLine[] }) {
  return (
    <ul className="space-y-0.5 font-mono text-[11px]">
      {lines.map((l, i) => (
        <li key={i} className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5">
          {l.op === "OTHER" ? (
            <span className="min-w-0 truncate text-white/60">{l.raw}</span>
          ) : (
            <>
              <span className={`shrink-0 rounded-sm px-1 text-[10px] font-bold ${l.op === "SCAN" ? "bg-[#fbbf24]/15 text-[#fbbf24]" : "bg-[#c5ee8a]/15 text-[#d3f3a4]"}`}>{l.op}</span>
              <span className="text-white/85">{l.table}</span>
              {l.index ? (
                <span className="inline-flex min-w-0 items-center gap-1">
                  <span className="shrink-0 text-white/40">{l.covering ? "covering index" : "index"}</span>
                  <span className="min-w-0 truncate text-[#d3f3a4]" title={l.cond ? `${l.index} (${l.cond})` : l.index}>
                    {l.index}
                  </span>
                </span>
              ) : (
                <span className="text-white/40">every row, in order</span>
              )}
            </>
          )}
        </li>
      ))}
    </ul>
  );
}

function PlanCard({ plan, label }: { plan: Plan; label?: string }) {
  return (
    <div className="min-w-0 rounded-md border border-white/[0.08] bg-black/25 px-2 py-1.5">
      <p className="mb-1 flex min-w-0 items-center gap-1.5 text-[10.5px]">
        {label && <span className="hud-label shrink-0 !text-[10px]">{label}</span>}
        <span className="min-w-0 truncate font-mono text-white/45" title={plan.statement}>
          {clip(plan.statement, 80)}
        </span>
      </p>
      <PlanLines lines={plan.lines} />
    </div>
  );
}

export function PlanPanel({ results, tables, smart }: { results: ResultSet[]; tables: TableInfo[]; smart: boolean }) {
  const plans = readPlans(results);
  const flip = findFlip(plans);
  const others = plans.filter((p) => p !== flip?.before && p !== flip?.after).slice(-(flip ? 2 : 3));
  const explicit = tables.flatMap((t) => t.indexes.filter((i) => i.origin === "c").map((i) => ({ ...i, table: t.name })));
  return (
    <div className="space-y-2">
      {plans.length === 0 && <Empty>Put EXPLAIN QUERY PLAN in front of a SELECT and its plan shows up here.</Empty>}
      {flip && (
        <div className="min-w-0 rounded-md border border-[#c5ee8a]/25 bg-[#c5ee8a]/[0.04] px-2 py-1.5">
          <p className="hud-label mb-1 !text-[10px]">The index paid off</p>
          <p className="mb-1.5 truncate font-mono text-[10.5px] text-white/45" title={flip.after.statement}>
            {clip(flip.after.statement, 90)}
          </p>
          <div className="flex min-w-0 flex-col gap-1.5">
            <PlanLines lines={flip.before.lines} />
            <span className="flex items-center gap-1 text-[10px] text-white/40">
              <ArrowRight className="h-3 w-3 rotate-90" aria-hidden /> after CREATE INDEX
            </span>
            <PlanLines lines={flip.after.lines} />
          </div>
        </div>
      )}
      {others.map((p) => (
        <PlanCard key={p.index} plan={p} />
      ))}
      {explicit.length > 0 && (
        <div>
          <p className="hud-label mb-1">Your indexes</p>
          <div className="flex flex-wrap gap-1">
            {explicit.slice(0, 12).map((ix) => {
              const expr = ix.columns.includes("<expr>");
              return (
                <span key={ix.name} className="inline-flex min-w-0 max-w-full items-center gap-1 rounded-full border border-white/12 bg-white/[0.04] px-2 py-0.5 font-mono text-[10px] text-white/75" title={ix.sql ?? ix.name}>
                  <span className="truncate">
                    {ix.table}.{ix.name.replace(`${ix.table}_`, "")} <span className="text-white/40">({ix.columns.join(", ")})</span>
                  </span>
                  {ix.unique && <span className="shrink-0 text-[#d3f3a4]">unique</span>}
                  {smart && ix.partial && <span className="shrink-0 text-[#fbbf24]">partial</span>}
                  {smart && expr && <span className="shrink-0 text-[#fbbf24]">expr</span>}
                </span>
              );
            })}
          </div>
          <More shown={Math.min(12, explicit.length)} total={explicit.length} />
        </div>
      )}
    </div>
  );
}

// ───────────────────────── views ─────────────────────────

export function ViewsPanel({ tables }: { tables: TableInfo[] }) {
  const views = tables.filter((t) => t.kind === "view");
  if (views.length === 0) return <Empty>No views yet. CREATE VIEW gives other people a stable name to query.</Empty>;
  return (
    <div>
      <ul className="space-y-2">
        {views.map((v) => (
          <li key={v.name} className="min-w-0">
            <div className="flex min-w-0 items-baseline gap-2">
              <span className="hud-value hud-accent min-w-0 truncate text-[11.5px]">{v.name}</span>
              <span className="hud-value hud-muted ml-auto shrink-0 text-[10px] tabular-nums">{plural(v.rowCount, "row")}</span>
            </div>
            <p className="truncate font-mono text-[10px] leading-snug text-white/45" title={v.columns.map((c) => c.name).join(", ")}>
              {v.columns.map((c) => c.name).join(" · ")}
            </p>
          </li>
        ))}
      </ul>
      <p className="mt-2 border-t border-white/[0.07] pt-1.5 text-[10.5px] text-white/45">Queries read these names, not the tables underneath, so the tables can change without breaking anyone.</p>
    </div>
  );
}

// ───────────────────────── triggers & audit ─────────────────────────

export function AuditPanel({ results, tables }: { results: ResultSet[]; tables: TableInfo[] }) {
  const feed = lastWith(results, ["table_name", "row_id", "action", "old_value", "new_value"]);
  const triggers = tables.flatMap((t) => t.triggers.map((g) => ({ ...describeTrigger(g.sql, g.name), table: t.name })));
  return (
    <div className="space-y-2.5">
      {feed ? (
        <ul className="space-y-1">
          {feed.rows.slice(0, 7).map((row, i) => {
            const old = cellOf(feed, row, "old_value");
            const nu = cellOf(feed, row, "new_value");
            return (
              <li key={i} className="flex min-w-0 flex-wrap items-center gap-x-1.5 font-mono text-[11px] leading-snug">
                <span className="text-white/80">
                  {fmt(cellOf(feed, row, "table_name"))} #{fmt(cellOf(feed, row, "row_id"))}
                </span>
                <span className="text-white/45">{fmt(cellOf(feed, row, "action"))}:</span>
                <span className="text-white/40 line-through">{fmt(old)}</span>
                <ArrowRight className="h-3 w-3 shrink-0 text-white/35" aria-hidden />
                <span className="hud-accent">{fmt(nu)}</span>
              </li>
            );
          })}
          <More shown={Math.min(7, feed.rows.length)} total={feed.rows.length} />
        </ul>
      ) : (
        <Empty>SELECT from your audit table and the trail it wrote appears here.</Empty>
      )}
      {triggers.length > 0 && (
        <div className="border-t border-white/[0.07] pt-2">
          <p className="hud-label mb-1">{plural(triggers.length, "trigger")} watching</p>
          <ul className="space-y-0.5">
            {triggers.slice(0, 9).map((g, i) => (
              <li key={i} className="flex min-w-0 items-baseline gap-1.5 font-mono text-[10.5px]">
                <span className="min-w-0 shrink-0 truncate text-[#d3f3a4]" style={{ maxWidth: "48%" }}>
                  {g.name}
                </span>
                <span className="min-w-0 truncate text-white/40">{g.when || `on ${g.table}`}</span>
              </li>
            ))}
          </ul>
          <More shown={Math.min(9, triggers.length)} total={triggers.length} />
        </div>
      )}
    </div>
  );
}

// ───────────────────────── transactions ─────────────────────────

export function txSummary(tx: Tx): { text: string; tone: "ok" | "undo" | "open" } {
  if (tx.end === "commit") return { text: `COMMIT · kept ${plural(tx.rows, "row")}`, tone: "ok" };
  if (tx.end === "rollback") return { text: `ROLLBACK · undid ${plural(tx.rows, "row")}`, tone: "undo" };
  return { text: "still open", tone: "open" };
}

export function TxConsole({ txs, count = 3 }: { txs: Tx[]; count?: number }) {
  if (txs.length === 0) return <Empty>No transactions yet. Wrap statements in BEGIN … COMMIT (or ROLLBACK) and watch what each one kept or undid.</Empty>;
  const shown = txs.slice(-count);
  return (
    <div className="space-y-2 rounded-md border border-white/[0.07] bg-black/35 p-2 font-mono text-[11px] leading-[1.55]">
      {shown.map((tx, i) => {
        const s = txSummary(tx);
        return (
          <div key={i} className={i > 0 ? "border-t border-white/[0.07] pt-2" : ""}>
            <p className="font-bold text-[#c5ee8a]">BEGIN</p>
            {tx.steps.slice(0, 7).map((st, j) => (
              <p key={j} className={`min-w-0 truncate pl-3 ${st.kind === "refused" ? "text-[#f87171]" : st.undone ? "text-white/35 line-through" : st.kind === "stmt" ? "text-white/80" : st.kind === "rollback-to" ? "text-[#fbbf24]" : "text-white/50"}`}>
                {st.kind === "refused" ? `refused: ${st.error}` : st.kind === "stmt" ? `${st.label}${st.rows ? `  +${st.rows}` : ""}` : st.kind === "rollback-to" ? `${st.label}${st.rows ? `  · undid ${st.rows}` : ""}` : st.label}
              </p>
            ))}
            {tx.steps.length > 7 && <p className="pl-3 text-white/35">… {tx.steps.length - 7} more</p>}
            <p className={`font-bold ${s.tone === "ok" ? "text-[#c5ee8a]" : s.tone === "undo" ? "text-[#fbbf24]" : "text-white/50"}`}>{s.text}</p>
          </div>
        );
      })}
    </div>
  );
}

// ───────────────────────── upserts & returning ─────────────────────────

function captionOf(sql: string): string {
  const s = flat(sql).toLowerCase();
  if (/^insert/.test(s)) {
    if (/on conflict[\s\S]*do nothing/.test(s)) return "INSERT … ON CONFLICT DO NOTHING";
    if (/on conflict[\s\S]*do update/.test(s)) return "INSERT … ON CONFLICT DO UPDATE";
    return "INSERT";
  }
  if (/^update/.test(s)) return "UPDATE";
  if (/^delete/.test(s)) return "DELETE";
  return "statement";
}

export function UpsertPanel({ results }: { results: ResultSet[] }) {
  const sets = results.filter((r) => /\breturning\b/.test(flat(r.sql).toLowerCase())).slice(-3);
  if (sets.length === 0) return <Empty>End an INSERT, UPDATE or DELETE with RETURNING and the rows it wrote come back here.</Empty>;
  return (
    <div className="space-y-2.5">
      {sets
        .slice()
        .reverse()
        .map((rs, i) => (
          <div key={i} className="min-w-0">
            <p className="mb-1 flex flex-wrap items-center gap-1.5">
              <Pill tone="accent">{captionOf(rs.sql)}</Pill>
              <span className="hud-label !text-[10px]">RETURNING</span>
            </p>
            {rs.rows.length === 0 ? <p className="font-mono text-[11px] text-white/50">0 rows returned: nothing was written.</p> : <DataGrid rs={rs} maxRows={4} />}
          </div>
        ))}
    </div>
  );
}

// ───────────────────────── JSON & generated columns ─────────────────────────

export function JsonPanel({ tables, results }: { tables: TableInfo[]; results: ResultSet[] }) {
  const tool = tables.find((t) => t.name === "tool");
  const spec = tool?.columns.find((c) => c.name === "specs") ?? tool?.columns.find((c) => /json|spec/i.test(c.name));
  const gen = tool?.columns.filter((c) => c.generated) ?? [];
  const indexed = (name: string) => !!tool?.indexes.some((i) => i.columns.includes(name));
  const used = results.filter((r) => /json_|->/.test(flat(r.sql).toLowerCase()) && !/^\s*(alter|update|create)/i.test(flat(r.sql))).slice(-1)[0];
  return (
    <div className="space-y-2.5">
      {tool && (
        <div className="rounded-md border border-white/[0.08] bg-black/25 px-2 py-1.5 font-mono text-[11px]">
          <p className="mb-1 text-white/45">tool</p>
          {spec ? (
            <p className="flex min-w-0 items-center gap-1.5 text-white/85">
              <span className="min-w-0 truncate">{spec.name}</span>
              <Pill tone="accent">JSON</Pill>
              <span className="text-white/35">{spec.type.toLowerCase()}</span>
            </p>
          ) : (
            <p className="text-white/45">no JSON column yet</p>
          )}
          {gen.map((g) => (
            <p key={g.name} className="mt-0.5 flex min-w-0 items-center gap-1.5 italic text-white/80">
              <span className="text-[#abd373]">fx</span>
              <span className="min-w-0 truncate">{g.name}</span>
              <Pill tone={indexed(g.name) ? "accent" : "plain"}>{indexed(g.name) ? "generated · indexed" : "generated"}</Pill>
            </p>
          ))}
        </div>
      )}
      {used ? <DataGrid rs={used} maxRows={6} maxCell={30} /> : <Empty>Query a JSON field with -&gt;&gt; or json_each and the answer shows here.</Empty>}
    </div>
  );
}

// ───────────────────────── migrations ─────────────────────────

const PHASE_COLOR: Record<Phase, string> = {
  baseline: "#9f9f9f",
  expand: "#c5ee8a",
  backfill: "#abd373",
  switch: "#e5e5e5",
  contract: "#fbbf24",
  other: "#c8c8c8",
};

const PHASE_LABEL: Record<Phase, string> = { baseline: "base", expand: "expand", backfill: "backfill", switch: "switch reads", contract: "contract", other: "step" };
const PHASE_SHORT: Record<Phase, string> = { baseline: "base", expand: "expand", backfill: "fill", switch: "read", contract: "drop", other: "step" };

export function MigrationTimeline({ nodes, compact = false }: { nodes: MigrationNode[]; compact?: boolean }) {
  const [w, ref] = useWidth();
  if (nodes.length === 0) return <Empty>No migrations recorded. Insert each applied version into schema_migrations and select it back.</Empty>;
  const horizontal = compact || w >= 380;
  return (
    <ol ref={ref} className={horizontal ? "flex items-start" : "flex flex-col gap-2"}>
      {nodes.map((n, i) => {
        const color = n.rolledBack ? "#f87171" : PHASE_COLOR[n.phase];
        const tail = i < nodes.length - 1;
        return (
          <li key={`${n.version}${n.rolledBack ? "r" : ""}`} className={horizontal ? "relative flex min-w-0 flex-1 flex-col items-center px-0.5 text-center" : "flex min-w-0 items-center gap-2"}>
            {horizontal && tail && <span aria-hidden className="absolute left-1/2 top-[10px] h-px w-full bg-white/20" />}
            <span
              className="relative z-10 grid h-[21px] w-[21px] shrink-0 place-items-center rounded-full font-mono text-[10.5px] font-bold"
              style={n.rolledBack ? { border: `1.5px dashed ${color}`, color, background: "#0d0d0d" } : { background: color, color: "#0a0a0a" }}
            >
              {n.version}
            </span>
            <span className={horizontal ? "mt-1 min-w-0 max-w-full" : "min-w-0 flex-1"}>
              <span className={`block truncate font-mono text-[10.5px] ${n.rolledBack ? "text-[#fca5a5]" : "text-white/80"}`} title={n.name}>
                {compact ? "" : n.name.replace(/_/g, " ")}
              </span>
              <span className="block font-mono text-[10px]" style={{ color: n.rolledBack ? "#f87171" : color, opacity: 0.85 }}>
                {n.rolledBack ? (compact ? "undone" : "rolled back") : compact ? PHASE_SHORT[n.phase] : PHASE_LABEL[n.phase]}
              </span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

// ───────────────────────── bookings ─────────────────────────

function friendlyBookingReason(message: string): string {
  if (/UNIQUE constraint failed:\s*booking_slot/i.test(message)) return "Slot already held: double booking";
  return message;
}

export function BookingsPanel({ log, results, tables }: { log: LogEntry[]; results: ResultSet[]; tables: TableInfo[] }) {
  const refused = log.filter((e) => e.expected && e.error && /^(insert\s+into|update)\s+booking\b/i.test(flat(e.sql))).reverse();
  const report = lastWith(results, ["asset_tag", "booked_hours", "share_pct"]);
  const slots = tables.find((t) => t.name === "booking_slot");
  const bars = report ? report.rows.map((r) => ({ tag: String(cellOf(report, r, "asset_tag")), name: String(cellOf(report, r, "name") ?? ""), hours: Number(cellOf(report, r, "booked_hours")) || 0 })) : [];
  const top = Math.max(1, ...bars.map((b) => b.hours));
  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <span className="hud-value text-[11px]">
          <span className="hud-accent">{slots ? slots.rowCount.toLocaleString("en-US") : "—"}</span> <span className="hud-muted">half-hour slots held</span>
        </span>
        <span className="hud-value text-[11px]">
          <span className={refused.length ? "hud-accent" : "text-white/45"}>{refused.length}</span> <span className="hud-muted">bookings turned away</span>
        </span>
      </div>
      {refused.length > 0 && (
        <ul className="space-y-1.5">
          {refused.slice(0, 5).map((e, i) => (
            <li key={i} className="min-w-0">
              <div className="flex min-w-0 items-center gap-1.5">
                <Check className="h-3 w-3 shrink-0 text-[#c5ee8a]" aria-hidden />
                <span className="min-w-0 truncate text-[11px] text-white/85" title={e.error}>
                  {friendlyBookingReason(e.error ?? "")}
                </span>
              </div>
            </li>
          ))}
          <More shown={Math.min(5, refused.length)} total={refused.length} />
        </ul>
      )}
      {bars.length > 0 ? (
        <div>
          <p className="hud-label mb-1">Hours booked per tool</p>
          <ul className="space-y-1">
            {bars.slice(0, 11).map((b) => (
              <li key={b.tag} className="flex min-w-0 items-center gap-2 font-mono text-[10.5px]" title={b.name}>
                <span className="w-11 shrink-0 text-white/65">{b.tag}</span>
                <span className="hud-bar min-w-0 flex-1">
                  <span style={{ width: `${Math.max(2, (b.hours / top) * 100)}%` }} />
                </span>
                <span className="w-9 shrink-0 text-right tabular-nums text-white/70">{fmt(b.hours)}h</span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <Empty>Select tool, booked hours and share from booking_slot and the utilisation bars appear.</Empty>
      )}
    </div>
  );
}

// ───────────────────────── database list ─────────────────────────

export function DatabaseList({ tables }: { tables: TableInfo[] }) {
  if (tables.length === 0) return <Empty>No tables yet.</Empty>;
  return (
    <ul className="space-y-1">
      {tables.map((t) => {
        const relic = RELICS.has(t.name);
        const ix = t.indexes.filter((i) => i.origin === "c").length;
        return (
          <li key={t.name} className="flex min-w-0 items-baseline gap-2">
            <span className={`hud-value min-w-0 truncate text-[11px] ${relic ? "text-white/45" : t.kind === "view" ? "text-white/80" : "hud-accent"}`}>{t.name}</span>
            {relic && <span className="hud-label shrink-0 !text-[10px]">given</span>}
            {t.kind === "view" && <span className="hud-label shrink-0 !text-[10px]">view</span>}
            <span className="hud-value hud-muted ml-auto shrink-0 text-[10px] tabular-nums">
              {t.rowCount.toLocaleString("en-US")}
              {ix > 0 && relic ? ` · ${ix} idx` : ""}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export function RelicChips({ tables }: { tables: TableInfo[] }) {
  const relics = tables.filter((t) => RELICS.has(t.name));
  if (relics.length === 0) return null;
  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5">
      <span className="hud-label !text-[10px]">given</span>
      {relics.map((t) => {
        const ix = t.indexes.filter((i) => i.origin === "c").length;
        return (
          <span key={t.name} className="inline-flex items-center gap-1 rounded-full border border-dashed border-white/18 px-2 py-0.5 font-mono text-[10px] text-white/50">
            {t.name} · {plural(t.rowCount, "row")}
            {t.name === "door_log" && ` · ${plural(ix, "index")}`.replace("1 indexs", "1 index")}
          </span>
        );
      })}
    </div>
  );
}

