"use client";

import React from "react";
import { ArrowRight, Check, ShieldAlert, Skull, TriangleAlert } from "lucide-react";
import { C, fmtInt, money, n, n0, objs, plural, s, shortStamp, TENANT_NAMES, type PlanGroup, type PlanLine, type ResultSet, type Row, type TableInfo } from "./model";
import { Empty, Meter, More, Pill, Tile, type Tone } from "./ui";

/** Chapter 2 and 3 panels: the queue, the audit trail, retention, isolation and query plans. */

// ───────────────────────── job queue ─────────────────────────

const WORKER_COLORS = [C.lime, C.steel, C.amber, "#d6b4fc", "#f9a8d4"];
const workerColor = (name: string) => {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return WORKER_COLORS[h % WORKER_COLORS.length];
};

const LANES: { state: string; label: string; tone: Tone }[] = [
  { state: "queued", label: "Queued", tone: "warning" },
  { state: "running", label: "Running", tone: "accent" },
  { state: "done", label: "Done", tone: "plain" },
  { state: "dead", label: "Dead", tone: "danger" },
];

function Pips({ used, max }: { used: number; max: number }) {
  const total = Math.max(1, Math.min(max, 8));
  return (
    <span className="inline-flex items-center gap-[2px]" title={`attempt ${used} of ${max}`}>
      {Array.from({ length: total }).map((_, i) => (
        <span key={i} className="h-1.5 w-1.5 rounded-full" style={{ background: i < used ? (used >= max ? C.red : C.lime) : "rgba(255,255,255,0.14)" }} />
      ))}
    </span>
  );
}

function JobChip({ r, state }: { r: Row; state: string }) {
  const worker = s(r.locked_by);
  const priority = n(r.priority);
  const when = state === "running" ? s(r.lease_until) : state === "queued" ? s(r.run_at) : "";
  const err = s(r.last_error);
  return (
    <li className={`min-w-0 rounded-md border px-1.5 py-1 ${state === "dead" ? "border-[#f87171]/40 bg-[#f87171]/[0.07]" : state === "done" ? "border-white/[0.06] bg-white/[0.02] opacity-60" : "border-white/[0.1] bg-white/[0.04]"}`}>
      <div className="flex min-w-0 items-center gap-1.5">
        <span className="hud-value text-[10px] text-white/50">#{s(r.job_id)}</span>
        <span className="min-w-0 flex-1 truncate text-[10.5px] text-white/85">{s(r.kind)}</span>
        {priority !== null && priority !== 5 && (
          <span className="hud-value rounded px-1 text-[9px]" style={{ background: priority > 5 ? "rgba(197,238,138,0.18)" : "rgba(255,255,255,0.08)", color: priority > 5 ? C.limeText : "rgba(255,255,255,0.55)" }}>
            P{priority}
          </span>
        )}
      </div>
      <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[9.5px] text-white/50">
        {n(r.attempts) !== null && <Pips used={n0(r.attempts)} max={n(r.max_attempts) ?? Math.max(5, n0(r.attempts))} />}
        {worker && state === "running" && (
          <span className="inline-flex items-center gap-1 truncate">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: workerColor(worker) }} />
            {worker}
          </span>
        )}
        {when && <span className="hud-value ml-auto shrink-0">{state === "running" ? "until " : "at "}{shortStamp(when).slice(6)}</span>}
      </div>
      {state === "dead" && err && <div className="mt-0.5 truncate text-[9.5px] text-[#f8a5a5]" title={err}>{err}</div>}
    </li>
  );
}

export function QueueBoard({ rs }: { rs: ResultSet }) {
  const rows = objs(rs);
  return (
    <div>
      <div className="grid grid-cols-2 gap-2 @xl:grid-cols-4">
        {LANES.map((lane) => {
          const jobs = rows.filter((r) => s(r.state) === lane.state);
          const shown = lane.state === "done" ? jobs.slice(-4) : jobs.slice(0, 6);
          return (
            <section key={lane.state} className="min-w-0 rounded-md border border-white/[0.07] bg-black/20 p-1.5">
              <header className="mb-1.5 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: lane.tone === "plain" ? "#9f9f9f" : lane.tone === "accent" ? C.lime : lane.tone === "warning" ? C.amber : C.red }} />
                <h4 className="hud-label !text-[9.5px]">{lane.label}</h4>
                <span className="hud-value ml-auto text-[11px]" style={{ color: lane.state === "dead" && jobs.length > 0 ? C.red : "#f4f4f4" }}>
                  {jobs.length}
                </span>
              </header>
              <ul className="space-y-1">
                {shown.map((r) => (
                  <JobChip key={s(r.job_id)} r={r} state={lane.state} />
                ))}
                {jobs.length === 0 && <li className="py-1 text-center text-[10px] text-white/25">empty</li>}
              </ul>
              {jobs.length > shown.length && <p className="hud-label mt-1 text-white/35">+{jobs.length - shown.length} more</p>}
            </section>
          );
        })}
      </div>
      {rows.length === 0 && <Empty>The queue is empty.</Empty>}
    </div>
  );
}

// ───────────────────────── dead letters ─────────────────────────

export function DeadLetters({ dead, board }: { dead: ResultSet | null; board: ResultSet | null }) {
  const rows = dead ? objs(dead) : objs(board).filter((r) => s(r.state) === "dead");
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <Skull className="h-3.5 w-3.5" style={{ color: rows.length ? C.red : "rgba(255,255,255,0.35)" }} aria-hidden />
        <span className="hud-value text-[12px]" style={{ color: rows.length ? C.red : C.limeText }}>
          {rows.length}
        </span>
        <span className="hud-label">{rows.length === 1 ? "job parked" : "jobs parked"}</span>
      </div>
      <ul className="space-y-1.5">
        {rows.slice(0, 6).map((r, i) => (
          <li key={`${s(r.job_id)}:${i}`} className="min-w-0 rounded-md border border-[#f87171]/35 bg-[#f87171]/[0.07] px-2 py-1.5">
            <div className="flex min-w-0 items-center gap-2">
              <span className="hud-value text-[10.5px] text-white/55">#{s(r.job_id)}</span>
              <span className="min-w-0 flex-1 truncate text-[11px] text-white/90">{s(r.kind)}</span>
              <Pips used={n0(r.attempts)} max={n(r.max_attempts) ?? n0(r.attempts)} />
              <span className="hud-value text-[10px] text-white/55">
                {n0(r.attempts)}/{n(r.max_attempts) ?? "?"}
              </span>
            </div>
            <p className="mt-1 break-words font-mono text-[10.5px] leading-snug text-[#f8a5a5]">{s(r.last_error) || "no error recorded"}</p>
          </li>
        ))}
      </ul>
      {rows.length === 0 && <Empty>Nothing is dead-lettered. Every job still has attempts left.</Empty>}
      <More shown={Math.min(6, rows.length)} total={rows.length} />
    </div>
  );
}

// ───────────────────────── audit trail ─────────────────────────

const ACTOR_TONE = (actor: string): string => {
  if (actor.startsWith("ops:")) return C.amber;
  if (actor.startsWith("job:")) return C.steel;
  if (actor.startsWith("api:")) return C.lime;
  return "#c8c8c8";
};

export function AuditTrail({ rs }: { rs: ResultSet }) {
  const rows = objs(rs);
  const shown = rows.slice(-8);
  return (
    <div>
      <ol className="relative space-y-2 border-l border-white/15 pl-3">
        {shown.map((r, i) => {
          const actor = s(r.actor);
          const color = ACTOR_TONE(actor);
          return (
            <li key={`${s(r.audit_id)}:${i}`} className="relative min-w-0">
              <span className="absolute -left-[17px] top-1 h-2 w-2 rounded-full border-2 border-[#121212]" style={{ background: color }} />
              <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
                <span className="hud-value rounded px-1.5 text-[10.5px]" style={{ background: `${color}22`, color }}>
                  {actor || "unknown"}
                </span>
                <span className="hud-value text-[10px] text-white/45">{shortStamp(s(r.at))}</span>
              </div>
              <p className="mt-0.5 min-w-0 text-[11px] leading-snug text-white/80">
                changed <span className="hud-value text-white/95">{s(r.table_name)}#{s(r.row_id)}</span> · <span className="hud-value text-white/95">{s(r.field)}</span>
              </p>
              <p className="hud-value mt-0.5 flex min-w-0 items-center gap-1.5 text-[10.5px]">
                <span className="max-w-[40%] truncate text-white/50 line-through decoration-white/25">{s(r.old_value) || "NULL"}</span>
                <ArrowRight className="h-3 w-3 shrink-0 text-white/40" aria-hidden />
                <span className="min-w-0 truncate" style={{ color: C.limeText }}>{s(r.new_value) || "NULL"}</span>
              </p>
            </li>
          );
        })}
      </ol>
      {rows.length > shown.length && <p className="hud-label mt-1.5 text-white/35">+{rows.length - shown.length} earlier</p>}
      {rows.length === 0 && <Empty>No changes recorded yet.</Empty>}
    </div>
  );
}

// ───────────────────────── retention ─────────────────────────

export function Retention({ rs }: { rs: ResultSet }) {
  const latest = new Map<string, Row>();
  for (const r of objs(rs)) latest.set(s(r.store), r);
  const rows = [...latest.values()];
  const purged = rows.reduce((t, r) => t + n0(r.purged), 0);
  return (
    <div>
      <div className="grid grid-cols-2 gap-2">
        <Tile label="Purged" value={fmtInt(purged)} tone={purged > 0 ? "warning" : "plain"} sub={`across ${plural(rows.length, "store")}`} />
        <Tile label="Kept" value={fmtInt(rows.reduce((t, r) => t + n0(r.kept), 0))} tone="accent" sub="still within retention" />
      </div>
      <ul className="mt-2.5 space-y-2">
        {rows.map((r, i) => {
          const p = n0(r.purged);
          const k = n0(r.kept);
          const total = Math.max(1, p + k);
          return (
            <li key={`${s(r.store)}:${i}`}>
              <div className="flex min-w-0 items-baseline gap-2 text-[11px]">
                <span className="hud-value min-w-0 flex-1 truncate text-white/90">{s(r.store)}</span>
                <span className="hud-muted shrink-0 text-[10px]">
                  purged {p} · kept {k}
                </span>
              </div>
              <div className="mt-1 flex h-2 overflow-hidden rounded-full bg-white/[0.06]">
                <span style={{ width: `${(p / total) * 100}%`, background: "repeating-linear-gradient(135deg, rgba(251,191,36,0.75) 0 3px, rgba(251,191,36,0.3) 3px 6px)" }} />
                <span style={{ width: `${(k / total) * 100}%`, background: C.lime }} />
              </div>
            </li>
          );
        })}
      </ul>
      {rows.length === 0 && <Empty>No sweeps logged yet.</Empty>}
    </div>
  );
}

// ───────────────────────── tenant isolation ─────────────────────────

export function Tenants({ sets, lookup }: { sets: ResultSet[]; lookup: ResultSet | null }) {
  const byTenant = new Map<number, Row>();
  for (const rs of sets) {
    const r = objs(rs)[0];
    if (r && n(r.as_tenant) !== null) byTenant.set(n0(r.as_tenant), r);
  }
  const ids = [1, 2, 3];
  const [picked, setPicked] = React.useState<number | null>(null);
  const first = ids.find((t) => byTenant.has(t)) ?? 1;
  const sel = picked !== null && byTenant.has(picked) ? picked : first;
  const row = byTenant.get(sel);
  const totals = { entries: 0, lines: 0, debits: 0 };
  for (const r of byTenant.values()) {
    totals.entries += n0(r.entries);
    totals.lines += n0(r.lines);
    totals.debits += n0(r.debits_cents);
  }
  const maxEntries = Math.max(1, ...[...byTenant.values()].map((r) => n0(r.entries)));
  const looks = objs(lookup);
  return (
    <div>
      {sets.length > 0 && (
        <>
          <div role="tablist" aria-label="Tenant" className="flex flex-wrap gap-1.5">
            {ids.map((t) => {
              const has = byTenant.has(t);
              const on = t === sel && has;
              return (
                <button
                  key={t}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  disabled={!has}
                  onClick={() => setPicked(t)}
                  className={`inline-flex h-6 items-center gap-1.5 rounded-full border px-2.5 font-mono text-[10.5px] font-semibold transition-colors ${
                    on ? "border-transparent bg-[#c5ee8a] text-[#0a0a0a]" : has ? "border-white/15 bg-white/[0.04] text-white/80 hover:bg-white/10" : "border-dashed border-white/10 text-white/25"
                  }`}
                >
                  <span className="opacity-60">{t}</span> {TENANT_NAMES[t].short}
                </button>
              );
            })}
          </div>
          {row && (
            <div className="mt-2 grid grid-cols-3 gap-2">
              <Tile label="Entries visible" value={fmtInt(n0(row.entries))} tone="accent" sub={`as tenant ${sel}`} />
              <Tile label="Lines visible" value={fmtInt(n0(row.lines))} tone="accent" />
              <Tile label="Debits" value={money(n(row.debits_cents), { compact: true })} sub={TENANT_NAMES[sel].currency} />
            </div>
          )}
          <div className="mt-2.5">
            <div className="hud-label mb-1 grid grid-cols-[minmax(0,1fr)_3rem_3rem_5rem] gap-2 !text-[9.5px]">
              <span>Seen as</span>
              <span className="text-right">Entries</span>
              <span className="text-right">Lines</span>
              <span className="text-right">Debits</span>
            </div>
            <ul className="space-y-[3px]">
              {ids.map((t) => {
                const r = byTenant.get(t);
                return (
                  <li key={t} className="border-t border-white/[0.05] pt-[3px]">
                    <div className="grid grid-cols-[minmax(0,1fr)_3rem_3rem_5rem] items-center gap-2 text-[11px]">
                      <span className="truncate" style={{ color: r ? "#f4f4f4" : "rgba(255,255,255,0.3)" }}>{TENANT_NAMES[t].short}</span>
                      <span className="hud-value text-right">{r ? n0(r.entries) : "—"}</span>
                      <span className="hud-value text-right">{r ? n0(r.lines) : "—"}</span>
                      <span className="hud-value text-right">{r ? money(n(r.debits_cents), { compact: true }) : "—"}</span>
                    </div>
                    <Meter value={r ? n0(r.entries) : 0} max={maxEntries} className="mt-0.5 !h-1" tone={t === sel ? "accent" : "plain"} />
                  </li>
                );
              })}
              {byTenant.size > 1 && (
                <li className="grid grid-cols-[minmax(0,1fr)_3rem_3rem_5rem] items-center gap-2 border-t border-white/15 pt-1 text-[11px]">
                  <span className="hud-label">All tenants</span>
                  <span className="hud-value text-right">{fmtInt(totals.entries)}</span>
                  <span className="hud-value text-right">{fmtInt(totals.lines)}</span>
                  <span className="hud-value text-right">{money(totals.debits, { compact: true })}</span>
                </li>
              )}
            </ul>
            {byTenant.size > 1 && <p className="hud-muted mt-1.5 text-[10px]">Each row came from a query that saw only its own tenant, so the rows never overlap.</p>}
          </div>
        </>
      )}
      {looks.length > 0 && (
        <div className={sets.length > 0 ? "mt-3 border-t border-white/10 pt-2.5" : ""}>
          <h4 className="hud-label mb-1.5">Looking up another tenant&apos;s entry by id</h4>
          <ul className="space-y-1.5">
            {looks.map((r, i) => {
              const hits = n0(r.rows_returned);
              const scoped = /^scoped/i.test(s(r.lookup));
              // the unscoped lookup is the lesson's demonstration (it should find the other tenant's row); only a scoped hit is a real leak
              const leak = hits > 0 && scoped;
              const demo = hits > 0 && !scoped;
              return (
                <li key={`${s(r.lookup)}:${i}`} className={`flex min-w-0 items-center gap-2 rounded-md border px-2 py-1.5 ${leak ? "border-[#f87171]/45 bg-[#f87171]/10" : demo ? "border-[#fbbf24]/35 bg-[#fbbf24]/[0.06]" : "border-[#c5ee8a]/30 bg-[#c5ee8a]/[0.06]"}`}>
                  {leak ? <TriangleAlert className="h-3.5 w-3.5 shrink-0 text-[#f87171]" aria-hidden /> : demo ? <TriangleAlert className="h-3.5 w-3.5 shrink-0 text-[#fbbf24]" aria-hidden /> : <Check className="h-3.5 w-3.5 shrink-0 text-[#c5ee8a]" aria-hidden />}
                  <span className="min-w-0 flex-1 truncate text-[11px] text-white/90">{s(r.lookup)}</span>
                  <span className="hud-value text-[10.5px] text-white/65">{plural(hits, "row")}</span>
                  <Pill tone={leak ? "danger" : demo ? "warning" : "accent"} solid>
                    {leak ? "leak" : demo ? "demo: caught" : "safe"}
                  </Pill>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      {sets.length === 0 && looks.length === 0 && <Empty>Run one scoped query per tenant: return as_tenant, entries, lines and debits_cents.</Empty>}
    </div>
  );
}

// ───────────────────────── query plans ─────────────────────────

type PlanKind = "scan" | "search" | "covering" | "ordered" | "sort" | "other";

function classify(text: string): PlanKind {
  const t = text.toUpperCase();
  if (t.startsWith("USE TEMP B-TREE")) return "sort";
  if (t.startsWith("SEARCH")) return t.includes("COVERING INDEX") ? "covering" : "search";
  if (t.startsWith("SCAN")) return t.includes("USING") && t.includes("INDEX") ? "ordered" : "scan";
  return "other";
}

const KIND_COLOR: Record<PlanKind, string> = { scan: C.amber, search: C.lime, covering: C.lime, ordered: C.limeText, sort: C.amber, other: "rgba(255,255,255,0.7)" };
const KIND_LABEL: Record<PlanKind, string> = { scan: "full scan", search: "index search", covering: "covering index", ordered: "ordered index scan", sort: "temp b-tree sort", other: "" };

function tableOf(text: string): string {
  const m = /^(?:SCAN|SEARCH)\s+(?:TABLE\s+)?([A-Za-z0-9_"]+)/i.exec(text.trim());
  return m ? m[1].replace(/"/g, "") : "";
}

function workOf(lines: PlanLine[], tables: TableInfo[]): number {
  let total = 0;
  for (const l of lines) {
    const kind = classify(l.text);
    const rows = Math.max(1, tables.find((t) => t.name.toLowerCase() === tableOf(l.text).toLowerCase())?.rowCount ?? 100);
    if (kind === "scan" || kind === "ordered") total += rows;
    else if (kind === "search" || kind === "covering") total += Math.ceil(Math.log2(rows + 1)) + 2;
  }
  return total;
}

function verdictOf(lines: PlanLine[]): { text: string; tone: Tone } {
  const kinds = lines.map((l) => classify(l.text));
  if (kinds.includes("scan")) return { text: "reads every row", tone: "warning" };
  if (kinds.includes("sort")) return { text: "sorts in a temp b-tree", tone: "warning" };
  if (kinds.some((k) => k === "search" || k === "covering" || k === "ordered")) return { text: "uses an index", tone: "accent" };
  return { text: "plan", tone: "plain" };
}

function PlanCard({ label, lines, tables, scale }: { label: string; lines: PlanLine[]; tables: TableInfo[]; scale: number }) {
  const v = verdictOf(lines);
  const work = workOf(lines, tables);
  return (
    <div className="min-w-0 rounded-md border border-white/[0.09] bg-black/25 p-2">
      <div className="mb-1.5 flex items-center gap-2">
        <span className="hud-label">{label}</span>
        <span className="ml-auto">
          <Pill tone={v.tone}>{v.text}</Pill>
        </span>
      </div>
      <ul className="space-y-[3px] font-mono text-[10.5px] leading-snug">
        {lines.slice(0, 6).map((l, i) => {
          const k = classify(l.text);
          return (
            <li key={i} className="min-w-0 break-words" style={{ paddingLeft: l.depth * 10, color: KIND_COLOR[k] }}>
              {KIND_LABEL[k] && (
                <span className="mr-1 rounded-sm px-1 text-[9px] font-semibold uppercase" style={{ background: `${KIND_COLOR[k]}22` }}>
                  {k === "sort" ? "sort" : k === "scan" ? "reads all" : "index"}
                </span>
              )}
              {l.text}
            </li>
          );
        })}
      </ul>
      {lines.length === 0 && <p className="text-[10.5px] text-white/40">empty plan</p>}
      <div className="mt-2">
        <div className="hud-label flex justify-between !text-[9px]">
          <span>rows read, estimated</span>
          <span className="hud-value normal-case tracking-normal text-white/75">≈ {fmtInt(work)}</span>
        </div>
        <Meter value={work} max={scale} tone={v.tone === "accent" ? "accent" : "warning"} className="mt-1" />
      </div>
    </div>
  );
}

export function Plans({ groups, tables }: { groups: PlanGroup[]; tables: TableInfo[] }) {
  const shown = groups.slice(-3);
  return (
    <div className="space-y-3">
      {shown.map((g) => {
        const wb = workOf(g.before, tables);
        const wa = g.after ? workOf(g.after, tables) : null;
        const scale = Math.max(1, wb, wa ?? 0);
        const ratio = wa !== null && wa > 0 ? wb / wa : null;
        return (
          <section key={g.key}>
            <pre className="mb-1.5 rounded-md bg-white/[0.04] px-2 py-1 font-mono text-[10.5px] leading-[1.45] text-white/70">
              <code className="line-clamp-2 whitespace-pre-wrap break-words">{g.statement || "EXPLAIN QUERY PLAN …"}</code>
            </pre>
            <div className="grid grid-cols-1 gap-2 @xl:grid-cols-[1fr_auto_1fr] @xl:items-stretch">
              <PlanCard label="Before" lines={g.before} tables={tables} scale={scale} />
              <div className="flex items-center justify-center text-white/35">
                <ArrowRight className="h-4 w-4 rotate-90 @xl:rotate-0" aria-hidden />
              </div>
              {g.after ? (
                <PlanCard label="After" lines={g.after} tables={tables} scale={scale} />
              ) : (
                <div className="grid min-h-[3.5rem] place-items-center rounded-md border border-dashed border-white/15 p-2 text-center text-[10.5px] text-white/40">Create the index, then run the same EXPLAIN again to see the after.</div>
              )}
            </div>
            {ratio !== null && ratio >= 1.5 && (
              <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-white/75">
                <Check className="h-3.5 w-3.5 text-[#c5ee8a]" aria-hidden />
                About <span className="hud-value" style={{ color: C.limeText }}>{Math.round(ratio)}×</span> fewer rows to read
              </p>
            )}
            {ratio !== null && ratio < 1.5 && g.after && !verdictOf(g.after).tone.startsWith("warn") && (
              <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-white/65">
                <ShieldAlert className="h-3.5 w-3.5 text-white/40" aria-hidden />
                Same rows to read, but the plan no longer needs an extra sort step.
              </p>
            )}
          </section>
        );
      })}
    </div>
  );
}
