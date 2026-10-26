"use client";

import React from "react";
import { Database, Lock, Terminal } from "lucide-react";
import type { SceneProps } from "@/engine/scene";
import type { ProgramHandle } from "@/engine/program";
import { FeatureIcon } from "@/components/ui/icons";

/**
 * Pit Wall: a 2D race-engineering dashboard driven by the learner's SQL.
 *
 * The SQL runtime hands us plain data: every result set the file produced (`results`) and the
 * database's tables (`tables`). Each panel picks the result set that matches its lesson's
 * concept (see `classify`), so one growing query.sql file powers the whole wall. Everything is
 * read defensively: result sets can be empty, have any column names, or hold NULLs.
 *
 * Colour follows the Pockett Stage system: neutral greys for structure, lime only for values the
 * learner's queries produced, amber for caution, red for failures.
 */

// ───────────────────────── data ─────────────────────────

type Cell = unknown;

interface ResultSet {
  sql: string;
  columns: string[];
  rows: Cell[][];
}

interface TableInfo {
  name: string;
  columns: { name: string; type: string }[];
  rowCount: number;
}

type PanelId = "roster" | "timing" | "fastest" | "stats" | "pace" | "tower" | "strategy" | "pitlog";

const PANELS: { id: PanelId; title: string; lesson: number; clause: string }[] = [
  { id: "roster", title: "Driver roster", lesson: 1, clause: "SELECT … FROM drivers" },
  { id: "timing", title: "Live timing", lesson: 2, clause: "WHERE lap = 24" },
  { id: "fastest", title: "Fastest laps", lesson: 3, clause: "ORDER BY … LIMIT 10" },
  { id: "stats", title: "Race stats", lesson: 4, clause: "COUNT · MIN · AVG" },
  { id: "pace", title: "Pace chart", lesson: 5, clause: "GROUP BY … HAVING" },
  { id: "tower", title: "Timing tower", lesson: 6, clause: "JOIN … ON" },
  { id: "strategy", title: "Strategy calls", lesson: 7, clause: "CASE WHEN … END" },
  { id: "pitlog", title: "Pit log", lesson: 8, clause: "INSERT · UPDATE" },
];

/** Tables the hidden setup creates; anything else on the schema list was made by the learner. */
const SEED_TABLES = new Set(["teams", "drivers", "laps", "pit_stops", "car_status"]);

function readResults(program: ProgramHandle | null): ResultSet[] {
  if (!program) return [];
  return program.list<unknown>("results").flatMap((raw) => {
    if (!raw || typeof raw !== "object") return [];
    const r = raw as Record<string, unknown>;
    const columns = Array.isArray(r.columns) ? r.columns.map((c) => String(c)) : [];
    if (columns.length === 0) return [];
    const rows = Array.isArray(r.rows) ? (r.rows.filter((row) => Array.isArray(row)) as Cell[][]) : [];
    return [{ sql: typeof r.sql === "string" ? r.sql : "", columns, rows }];
  });
}

function readTables(program: ProgramHandle | null): TableInfo[] {
  if (!program) return [];
  return program.list<unknown>("tables").flatMap((raw) => {
    if (!raw || typeof raw !== "object") return [];
    const t = raw as Record<string, unknown>;
    if (typeof t.name !== "string") return [];
    const columns = Array.isArray(t.columns)
      ? t.columns.flatMap((c) => {
          if (!c || typeof c !== "object") return [];
          const col = c as Record<string, unknown>;
          return [{ name: String(col.name ?? "?"), type: String(col.type ?? "") }];
        })
      : [];
    const rowCount = typeof t.rowCount === "number" && Number.isFinite(t.rowCount) ? t.rowCount : 0;
    return [{ name: t.name, columns, rowCount }];
  });
}

/** The statement without comments or string literals, lower-cased, for keyword checks. */
function bareSql(sql: string): string {
  return sql
    .replace(/\/\*[\s\S]*?(\*\/|$)/g, " ")
    .replace(/--[^\n]*/g, " ")
    .replace(/'(?:[^']|'')*'/g, "''")
    .toLowerCase();
}

/** The statement as the learner wrote it, minus comments, on as few lines as it needs. */
function displaySql(sql: string): string {
  return sql
    .replace(/\/\*[\s\S]*?(\*\/|$)/g, "")
    .split("\n")
    .map((l) => (/^\s*--/.test(l) ? "" : l.replace(/\s+--[^']*$/, "")))
    .filter((l) => l.trim().length > 0)
    .join("\n")
    .trim();
}

/** Which panel a statement belongs to, by the most specific idea it uses. */
function classify(sql: string): PanelId {
  const s = bareSql(sql);
  if (/\bpit_stops\b/.test(s)) return "pitlog";
  if (/\bcase\b/.test(s)) return "strategy";
  if (/\bgroup\s+by\b/.test(s)) return "pace";
  if (/\bjoin\b/.test(s)) return "tower";
  if (/\b(count|min|max|avg|sum|total)\s*\(/.test(s)) return "stats";
  if (/\border\s+by\b|\blimit\b/.test(s)) return "fastest";
  if (/\bwhere\b/.test(s)) return "timing";
  return "roster";
}

/** Latest matching result per panel; a panel with no match falls back to its lesson's position in the file. */
function assignPanels(results: ResultSet[]): Record<PanelId, ResultSet | null> {
  const out = {} as Record<PanelId, ResultSet | null>;
  const used = new Set<number>();
  for (const p of PANELS) {
    let idx = -1;
    results.forEach((r, i) => {
      if (classify(r.sql) === p.id) idx = i;
    });
    out[p.id] = idx >= 0 ? results[idx] : null;
    if (idx >= 0) used.add(idx);
  }
  PANELS.forEach((p, i) => {
    if (!out[p.id] && results[i] && !used.has(i)) {
      out[p.id] = results[i];
      used.add(i);
    }
  });
  return out;
}

// ───────────────────────── formatting ─────────────────────────

const isNum = (v: Cell): v is number => typeof v === "number" && Number.isFinite(v);
/** Columns holding milliseconds: lap_ms, best_ms, AVG(lap_ms)… */
const isMsCol = (name: string) => /_ms\b|^ms$/i.test(name);

function colIndex(rs: ResultSet, re: RegExp, except: number[] = []): number {
  return rs.columns.findIndex((c, i) => re.test(c) && !except.includes(i));
}

function numericCols(rs: ResultSet): number[] {
  return rs.columns.flatMap((_, i) => {
    const vals = rs.rows.map((r) => r[i]).filter((v) => v !== null && v !== undefined);
    return vals.length > 0 && vals.every(isNum) ? [i] : [];
  });
}

/** 93535 → "1:33.535", 2380 → "2.38s". */
function fmtMs(ms: number): string {
  const sign = ms < 0 ? "-" : "";
  const a = Math.abs(ms);
  if (a < 60000) return `${sign}${(a / 1000).toFixed(2)}s`;
  const m = Math.floor(a / 60000);
  const s = ((a % 60000) / 1000).toFixed(3).padStart(6, "0");
  return `${sign}${m}:${s}`;
}

function fmtNum(v: number): string {
  if (Number.isInteger(v)) return Math.abs(v) >= 100000 ? v.toLocaleString("en-US") : String(v);
  return String(Number(v.toFixed(3)));
}

function fmt(v: Cell, col = ""): string {
  if (v === null || v === undefined) return "NULL";
  if (isNum(v)) return isMsCol(col) ? fmtMs(v) : fmtNum(v);
  if (typeof v === "string") return v;
  if (typeof v === "boolean" || typeof v === "bigint") return String(v);
  if (v instanceof Uint8Array) return `<${v.length} bytes>`;
  try {
    return JSON.stringify(v) ?? String(v);
  } catch {
    return String(v);
  }
}

const label = (col: string) => col.replace(/_/g, " ");
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

// ───────────────────────── building blocks ─────────────────────────

function PanelFrame({
  id,
  title,
  icon,
  meta,
  focus,
  flash,
  children,
}: {
  id: string;
  title: string;
  icon: React.ReactNode;
  meta?: React.ReactNode;
  focus?: boolean;
  flash?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      data-panel={id}
      className={`hud-panel mb-3 break-inside-avoid px-3 py-2.5 ${focus ? "border-[#c5ee8a]/35" : ""} ${flash ? "pop-in" : ""}`}
    >
      <header className="mb-2 flex min-w-0 items-center gap-2">
        <span className="shrink-0 text-[#c5ee8a]">{icon}</span>
        <h3 className="hud-title min-w-0 flex-1 truncate">{title}</h3>
        {meta && <span className="hud-value hud-muted shrink-0 text-[10px]">{meta}</span>}
      </header>
      {children}
    </section>
  );
}

function Ghost({ kind }: { kind: PanelId | "console" | "schema" }) {
  const bar = "rounded-sm bg-white/[0.05]";
  if (kind === "stats") {
    return (
      <div className="grid grid-cols-2 gap-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="rounded-md border border-dashed border-white/10 p-2">
            <div className={`${bar} h-1.5 w-10`} />
            <div className={`${bar} mt-2 h-3 w-16`} />
          </div>
        ))}
      </div>
    );
  }
  if (kind === "pace") {
    return (
      <div className="space-y-1.5">
        {[92, 80, 74, 61, 47].map((w) => (
          <div key={w} className="flex items-center gap-2">
            <div className={`${bar} h-1.5 w-6 shrink-0`} />
            <div className={`${bar} h-1.5`} style={{ width: `${w}%` }} />
          </div>
        ))}
      </div>
    );
  }
  if (kind === "roster") {
    return (
      <div className="grid grid-cols-3 gap-1.5">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-8 rounded-md border border-dashed border-white/10" />
        ))}
      </div>
    );
  }
  return (
    <div className="space-y-1.5">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-2">
          <div className={`${bar} h-1.5 w-5 shrink-0`} />
          <div className={`${bar} h-1.5 flex-1`} />
          <div className={`${bar} h-1.5 w-10 shrink-0`} />
        </div>
      ))}
    </div>
  );
}

function LockedPanel({ title, kind, lesson, clause, spot }: { title: string; kind: PanelId | "console" | "schema"; lesson?: number; clause: string; spot: boolean }) {
  return (
    <section
      data-panel={kind}
      data-locked=""
      className={`mb-3 break-inside-avoid rounded-[10px] border border-dashed px-3 py-2.5 ${spot ? "pulse-ring border-[#c5ee8a]/60" : "border-white/15"}`}
    >
      <header className="mb-2.5 flex min-w-0 items-center gap-2">
        <Lock className="h-3 w-3 shrink-0 text-white/35" aria-hidden />
        <h3 className="hud-label min-w-0 flex-1 truncate">{title}</h3>
        {lesson !== undefined && <span className="hud-label shrink-0 text-white/30">L{lesson}</span>}
      </header>
      <Ghost kind={kind} />
      <p className="mt-2.5 truncate font-mono text-[10px] text-white/40">
        {spot ? <span className="hud-accent">Your query powers this · </span> : "Locked · "}
        {clause}
      </p>
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="hud-log hud-muted py-1 text-[11px]">{children}</p>;
}

function More({ shown, total }: { shown: number; total: number }) {
  if (total <= shown) return null;
  return <p className="hud-label mt-1.5 text-white/35">+{total - shown} more</p>;
}

/** Any result set as a scrollable grid. Numbers right-aligned and tabular. */
function DataGrid({ rs, maxRows = 12, interactive, accentCol = -1 }: { rs: ResultSet; maxRows?: number; interactive: boolean; accentCol?: number }) {
  const numeric = new Set(numericCols(rs));
  const shown = rs.rows.slice(0, maxRows);
  const best = accentCol >= 0 ? Math.min(...rs.rows.map((r) => r[accentCol]).filter(isNum)) : NaN;
  return (
    <>
      <div className={`-mx-1 ${interactive ? "overflow-x-auto" : "overflow-hidden"}`}>
        <table className="w-full border-collapse text-[11px]">
          <thead>
            <tr>
              {rs.columns.map((c, i) => (
                <th
                  key={`${i}:${c}`}
                  scope="col"
                  className={`whitespace-nowrap px-1 pb-1 font-mono text-[10px] font-medium text-white/45 ${numeric.has(i) ? "text-right" : "text-left"}`}
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="hud-value">
            {shown.map((row, ri) => (
              <tr key={ri} className="border-t border-white/[0.06]">
                {rs.columns.map((c, ci) => {
                  const v = row[ci];
                  const isNull = v === null || v === undefined;
                  const hot = ci === accentCol && v === best;
                  return (
                    <td
                      key={ci}
                      className={`max-w-[11rem] truncate whitespace-nowrap px-1 py-[3px] tabular-nums ${numeric.has(ci) ? "text-right" : "text-left"} ${isNull ? "italic text-white/35" : hot ? "hud-accent" : ""}`}
                    >
                      {fmt(v, c)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rs.rows.length === 0 && <Empty>0 rows. Your WHERE may be filtering everything out.</Empty>}
      <More shown={shown.length} total={rs.rows.length} />
    </>
  );
}

// ───────────────────────── panels ─────────────────────────

function Roster({ rs }: { rs: ResultSet }) {
  const numI = colIndex(rs, /^(number|car_number|car|no|num)$/i);
  const codeI = colIndex(rs, /^(code|abbr|tla)$/i);
  const nameI = colIndex(rs, /name/i, [codeI]);
  const firstText = rs.columns.findIndex((_, i) => i !== numI && i !== codeI && typeof rs.rows[0]?.[i] === "string");
  const titleI = nameI >= 0 ? nameI : firstText >= 0 ? firstText : rs.columns.findIndex((_, i) => i !== numI && i !== codeI);
  const rest = rs.columns.map((_, i) => i).filter((i) => i !== numI && i !== codeI && i !== titleI);
  const shown = rs.rows.slice(0, 24);
  if (rs.rows.length === 0) return <Empty>0 rows returned.</Empty>;
  return (
    <>
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(8.5rem,1fr))] gap-1.5">
        {shown.map((row, i) => (
          <li key={i} className="flex min-w-0 items-center gap-2 rounded-md bg-white/[0.04] px-2 py-1.5">
            {numI >= 0 && (
              <span className="hud-value hud-accent w-6 shrink-0 text-right text-[13px] tabular-nums">{fmt(row[numI], rs.columns[numI])}</span>
            )}
            <span className="min-w-0 flex-1 leading-tight">
              <span className="block truncate">
                {codeI >= 0 && <span className="hud-value mr-1.5 text-[11px] font-semibold">{fmt(row[codeI])}</span>}
                {titleI >= 0 && <span className="text-[11px] text-white/85">{fmt(row[titleI], rs.columns[titleI])}</span>}
              </span>
              {rest.length > 0 && (
                <span className="hud-muted block truncate text-[10px]">{rest.map((ci) => fmt(row[ci], rs.columns[ci])).join(" · ")}</span>
              )}
            </span>
          </li>
        ))}
      </ul>
      <More shown={shown.length} total={rs.rows.length} />
    </>
  );
}

function Leaderboard({ rs }: { rs: ResultSet }) {
  const nums = numericCols(rs);
  const timeI = nums.find((i) => isMsCol(rs.columns[i])) ?? nums.at(-1) ?? -1;
  if (rs.rows.length === 0) return <Empty>0 rows returned.</Empty>;
  if (timeI < 0) return <DataGrid rs={rs} interactive={false} maxRows={10} />;
  const others = rs.columns.map((_, i) => i).filter((i) => i !== timeI);
  const shown = rs.rows.slice(0, 10);
  const first = shown[0]?.[timeI];
  const ms = isMsCol(rs.columns[timeI]);
  return (
    <>
      <ol className="space-y-px">
        {shown.map((row, i) => {
          const v = row[timeI];
          const delta = isNum(v) && isNum(first) && i > 0 ? v - first : null;
          return (
            <li key={i} className={`flex min-w-0 items-center gap-2 rounded px-1.5 py-1 ${i === 0 ? "bg-white/[0.05]" : ""}`}>
              <span className="hud-value hud-muted w-6 shrink-0 text-[10px] tabular-nums">P{i + 1}</span>
              <span className="flex min-w-0 flex-1 items-baseline gap-2.5 overflow-hidden whitespace-nowrap">
                {others.slice(0, 3).map((ci) => (
                  <span key={ci} className="min-w-0 truncate">
                    <span className="font-mono text-[9.5px] text-white/40">{rs.columns[ci]} </span>
                    <span className="hud-value text-[11px]">{fmt(row[ci], rs.columns[ci])}</span>
                  </span>
                ))}
              </span>
              <span className={`hud-value shrink-0 text-right text-[11.5px] tabular-nums ${i === 0 ? "hud-accent" : ""}`}>{fmt(v, rs.columns[timeI])}</span>
              <span className="hud-value hud-muted w-12 shrink-0 text-right text-[10px] tabular-nums">
                {delta === null ? "" : `${delta < 0 ? "−" : "+"}${ms ? (Math.abs(delta) / 1000).toFixed(3) : fmtNum(Math.abs(delta))}`}
              </span>
            </li>
          );
        })}
      </ol>
      <More shown={shown.length} total={rs.rows.length} />
    </>
  );
}

function Stats({ rs }: { rs: ResultSet }) {
  const row = rs.rows[0];
  if (!row) return <Empty>0 rows returned.</Empty>;
  const cols = rs.columns.slice(0, 8);
  return (
    <>
      <dl className={`grid gap-1.5 ${cols.length === 1 ? "grid-cols-1" : cols.length === 3 ? "grid-cols-3" : cols.length === 4 ? "grid-cols-2 @md:@max-xl:grid-cols-4" : "grid-cols-2 @md:@max-xl:grid-cols-3"}`}>
        {cols.map((c, i) => (
          <div key={`${i}:${c}`} className="min-w-0 rounded-md bg-white/[0.04] px-2.5 py-2">
            <dt className="hud-label truncate" title={c}>
              {label(c)}
            </dt>
            <dd className={`hud-value mt-0.5 truncate text-[17px] leading-tight tabular-nums ${row[i] === null || row[i] === undefined ? "text-white/35" : "hud-accent"}`}>
              {fmt(row[i], c)}
            </dd>
          </div>
        ))}
      </dl>
      {rs.rows.length > 1 && <p className="hud-label mt-1.5 text-white/35">showing row 1 of {rs.rows.length}</p>}
    </>
  );
}

function PaceChart({ rs }: { rs: ResultSet }) {
  const nums = numericCols(rs);
  const valueI = nums.find((i) => /avg|pace|mean/i.test(rs.columns[i])) ?? nums.find((i) => isMsCol(rs.columns[i])) ?? nums.at(-1) ?? -1;
  const labelI = rs.columns.findIndex((_, i) => !nums.includes(i)) >= 0 ? rs.columns.findIndex((_, i) => !nums.includes(i)) : rs.columns.findIndex((_, i) => i !== valueI);
  if (rs.rows.length === 0) return <Empty>0 rows returned. Check your HAVING.</Empty>;
  if (valueI < 0) return <DataGrid rs={rs} interactive={false} />;
  const shown = rs.rows.slice(0, 16);
  const values = shown.map((r) => r[valueI]).filter(isNum);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const ms = isMsCol(rs.columns[valueI]);
  // Lap times: quicker is better, so the quickest gets the longest bar and the rest show their gap.
  const width = (v: number) => (ms ? (max === min ? 100 : 18 + (82 * (max - v)) / (max - min)) : max > 0 ? Math.max(0, (v / max) * 100) : 0);
  return (
    <>
      <div className="mb-1.5 flex justify-between font-mono text-[9.5px] text-white/40">
        <span>{labelI >= 0 ? rs.columns[labelI] : ""}</span>
        <span>{rs.columns[valueI]}</span>
      </div>
      <ul className="space-y-1">
        {shown.map((row, i) => {
          const v = row[valueI];
          const top = isNum(v) && (ms ? v === min : v === max);
          return (
            <li key={i} className="grid grid-cols-[2.25rem_minmax(0,1fr)_auto] items-center gap-2">
              <span className="hud-value truncate text-[11px] tabular-nums">{labelI >= 0 ? fmt(row[labelI], rs.columns[labelI]) : i + 1}</span>
              <div className={`hud-bar h-1.5 ${top ? "" : "hud-bar-neutral"}`}>
                <span style={{ width: `${isNum(v) ? width(v) : 0}%` }} />
              </div>
              <span className="hud-value w-[5.75rem] text-right text-[11px] tabular-nums">
                <span className={top ? "hud-accent" : ""}>{fmt(v, rs.columns[valueI])}</span>
                {ms && isNum(v) && !top && <span className="hud-muted ml-1 text-[9.5px]">+{((v - min) / 1000).toFixed(2)}</span>}
              </span>
            </li>
          );
        })}
      </ul>
      <More shown={shown.length} total={rs.rows.length} />
    </>
  );
}

function Tower({ rs }: { rs: ResultSet }) {
  const posI = colIndex(rs, /^(position|pos|p|place|rank)$/i);
  const codeI = colIndex(rs, /^(code|abbr|tla)$/i);
  const nameI = colIndex(rs, /^(name|driver|driver_name|full_name)$/i, [codeI]);
  const teamI = colIndex(rs, /team/i, [codeI, nameI]);
  const gapI = colIndex(rs, /gap|interval|behind/i);
  if (rs.rows.length === 0) return <Empty>0 rows returned. Check your ON conditions.</Empty>;
  if ([codeI, nameI, teamI].filter((i) => i >= 0).length === 0) return <DataGrid rs={rs} interactive={false} />;
  const shown = rs.rows.slice(0, 20);
  return (
    <>
      <ol className="space-y-px">
        {shown.map((row, i) => {
          const gap = gapI >= 0 ? row[gapI] : undefined;
          const lead = isNum(gap) && gap === 0;
          return (
            <li key={i} className="grid grid-cols-[1.6rem_minmax(0,1fr)_auto] items-center gap-2 border-t border-white/[0.05] py-[3px] first:border-t-0">
              <span className={`hud-value text-right text-[11px] tabular-nums ${i === 0 ? "hud-accent" : "hud-muted"}`}>{posI >= 0 ? fmt(row[posI]) : i + 1}</span>
              <span className="flex min-w-0 items-baseline gap-2 overflow-hidden whitespace-nowrap">
                {codeI >= 0 && <span className="hud-value shrink-0 text-[11.5px] font-semibold">{fmt(row[codeI])}</span>}
                {nameI >= 0 && <span className="min-w-0 truncate text-[11px] text-white/80">{fmt(row[nameI])}</span>}
                {teamI >= 0 && <span className="hud-muted min-w-0 shrink-[2] truncate text-[10px]">{fmt(row[teamI])}</span>}
              </span>
              {gapI >= 0 && (
                <span className={`hud-value text-right text-[11px] tabular-nums ${lead ? "hud-accent" : ""}`}>
                  {lead ? "Leader" : isNum(gap) ? `+${gap.toFixed(3)}` : fmt(gap)}
                </span>
              )}
            </li>
          );
        })}
      </ol>
      <More shown={shown.length} total={rs.rows.length} />
    </>
  );
}

const CALLS = /^(box|pit|watch|stay out|stay|push|save|hold)/i;

function callStyle(v: string): string {
  const s = v.trim().toUpperCase();
  if (s.startsWith("BOX") || s.startsWith("PIT")) return "border-transparent bg-[#c5ee8a] text-[#0a0a0a]";
  if (s.startsWith("WATCH") || s.startsWith("SAVE") || s.startsWith("HOLD")) return "hud-warning border-[#fbbf24]/35";
  return "hud-muted";
}

function Strategy({ rs }: { rs: ResultSet }) {
  let callI = colIndex(rs, /^(call|action|decision|strategy|advice)$/i);
  if (callI < 0) callI = rs.columns.findIndex((_, i) => rs.rows.some((r) => typeof r[i] === "string" && CALLS.test(r[i] as string)));
  const codeI = colIndex(rs, /^(code|abbr|tla|name|driver)$/i);
  const compI = colIndex(rs, /compound|tyre$|tire$/i);
  const ageI = colIndex(rs, /age|laps_on/i);
  if (rs.rows.length === 0) return <Empty>0 rows returned.</Empty>;
  if (callI < 0) return <DataGrid rs={rs} interactive={false} />;
  const used = new Set([callI, codeI, compI, ageI]);
  const extraI = rs.columns.findIndex((_, i) => !used.has(i));
  const counts = new Map<string, number>();
  rs.rows.forEach((r) => {
    const k = fmt(r[callI]).toUpperCase();
    counts.set(k, (counts.get(k) ?? 0) + 1);
  });
  const shown = rs.rows.slice(0, 20);
  return (
    <>
      <p className="mb-1.5 flex flex-wrap gap-x-3 gap-y-0.5">
        {[...counts].slice(0, 4).map(([k, n]) => (
          <span key={k} className="hud-label">
            <span className="hud-value text-white/85">{n}</span> {k}
          </span>
        ))}
      </p>
      <ul className="space-y-px">
        {shown.map((row, i) => {
          const call = fmt(row[callI]);
          const age = ageI >= 0 ? row[ageI] : null;
          return (
            <li key={i} className="grid grid-cols-[2.4rem_minmax(0,1fr)_auto] items-center gap-2 border-t border-white/[0.05] py-[3px] first:border-t-0">
              <span className="hud-value truncate text-[11.5px] font-semibold">{codeI >= 0 ? fmt(row[codeI]) : i + 1}</span>
              <span className="flex min-w-0 items-center gap-2 overflow-hidden whitespace-nowrap text-[10.5px]">
                {compI >= 0 && <span className="hud-muted w-[3.4rem] shrink-0 truncate font-mono text-[10px] uppercase">{fmt(row[compI])}</span>}
                {ageI >= 0 && (
                  <span className="flex min-w-0 flex-1 items-center gap-1.5">
                    <span className="hud-bar hud-bar-neutral hidden h-1 min-w-6 flex-1 @xs:block">
                      <span style={{ width: `${isNum(age) ? Math.min(100, Math.max(0, (age / 30) * 100)) : 0}%` }} />
                    </span>
                    <span className="hud-value shrink-0 tabular-nums text-white/80">{fmt(age)}</span>
                    <span className="hud-muted shrink-0">laps</span>
                  </span>
                )}
                {extraI >= 0 && (
                  <span className="hud-muted hidden shrink-0 @sm:inline">
                    <span className="font-mono text-[9.5px] text-white/40">{rs.columns[extraI]}</span>{" "}
                    <span className="hud-value tabular-nums text-white/75">{fmt(row[extraI], rs.columns[extraI])}</span>
                  </span>
                )}
              </span>
              <span className={`hud-tag justify-center px-2 ${callStyle(call)}`}>{call}</span>
            </li>
          );
        })}
      </ul>
      <More shown={shown.length} total={rs.rows.length} />
    </>
  );
}

function PitLog({ rs }: { rs: ResultSet }) {
  const lapI = colIndex(rs, /^lap$|^in_lap$|lap$/i);
  const codeI = colIndex(rs, /^(code|abbr|tla|name|driver|driver_id)$/i);
  const durI = colIndex(rs, /duration|stationary|time|_ms$/i, [lapI]);
  const compI = colIndex(rs, /compound|tyre|tire/i);
  if (rs.rows.length === 0) return <Empty>0 rows returned.</Empty>;
  if (lapI < 0 && codeI < 0) return <DataGrid rs={rs} interactive={false} />;
  const laps = rs.rows.map((r) => (lapI >= 0 ? r[lapI] : null)).filter(isNum);
  const latest = laps.length ? Math.max(...laps) : NaN;
  const shown = rs.rows.slice(-12);
  return (
    <>
      <More shown={shown.length} total={rs.rows.length} />
      <ol className="space-y-px">
        {shown.map((row, i) => {
          const lap = lapI >= 0 ? row[lapI] : null;
          const isNew = isNum(lap) && lap === latest;
          const dur = durI >= 0 ? row[durI] : null;
          const slow = isNum(dur) && isMsCol(rs.columns[durI]) && dur >= 4000;
          return (
            <li
              key={i}
              className={`grid grid-cols-[2.4rem_2.6rem_minmax(0,1fr)_auto] items-center gap-2 rounded px-1.5 py-[3px] ${isNew ? "bg-[#c5ee8a]/[0.09]" : ""}`}
            >
              <span className="hud-value hud-muted text-[10.5px] tabular-nums">{lapI >= 0 ? `L${fmt(lap)}` : ""}</span>
              <span className="hud-value truncate text-[11.5px] font-semibold">{codeI >= 0 ? fmt(row[codeI]) : ""}</span>
              <span className="hud-muted min-w-0 truncate font-mono text-[10px] uppercase">
                {compI >= 0 ? fmt(row[compI]) : ""}
                {isNew && <span className="hud-accent ml-2 normal-case">latest</span>}
              </span>
              <span className={`hud-value text-right text-[11px] tabular-nums ${slow ? "hud-warning" : isNew ? "hud-accent" : ""}`}>
                {durI >= 0 ? fmt(dur, rs.columns[durI]) : ""}
              </span>
            </li>
          );
        })}
      </ol>
    </>
  );
}

function Console({ rs, stdout, count, interactive }: { rs: ResultSet | null; stdout: string; count: number; interactive: boolean }) {
  const writes = stdout
    .split("\n")
    .filter((l) => /^[A-Z]+ ok\b/.test(l.trim()))
    .slice(-3);
  return (
    <>
      {rs ? (
        <>
          <pre className="mb-2 rounded-md bg-white/[0.04] px-2 py-1.5 font-mono text-[10.5px] leading-[1.45] text-white/75">
            <code className="line-clamp-4 whitespace-pre-wrap break-words">{displaySql(rs.sql) || "SELECT …"}</code>
          </pre>
          <DataGrid rs={rs} maxRows={8} interactive={interactive} />
        </>
      ) : (
        <Empty>No result sets yet. Run a SELECT to see its rows here.</Empty>
      )}
      {(writes.length > 0 || count > 1) && (
        <div className="hud-log mt-2 border-t border-white/[0.06] pt-1.5 text-[10.5px]">
          {writes.map((l, i) => (
            <div key={`${i}:${l}`} className="hud-log-line truncate">
              {l.trim()}
            </div>
          ))}
          {count > 1 && <div className="hud-log-line hud-muted truncate">{plural(count, "result set")} in query.sql</div>}
        </div>
      )}
    </>
  );
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
            <p className="mt-0.5 font-mono text-[10px] leading-snug text-white/45">{t.columns.map((c) => c.name).join(" · ")}</p>
          </li>
        );
      })}
    </ul>
  );
}

// ───────────────────────── scene ─────────────────────────

export default function SqlDeskScene({ program, unlocked, focus, celebration, interactive }: SceneProps) {
  const results = readResults(program);
  const tables = readTables(program);
  const byPanel = assignPanels(results);
  const last = results.at(-1) ?? null;
  const live = PANELS.filter((p) => !!program && unlocked.has(p.id)).length;
  const flashing = new Set(celebration?.features ?? []);

  const renderPanel = (p: (typeof PANELS)[number]) => {
    const alive = !!program && unlocked.has(p.id);
    if (!alive) return <LockedPanel key={p.id} title={p.title} kind={p.id} lesson={p.lesson} clause={p.clause} spot={focus === p.id} />;
    const rs = byPanel[p.id];
    const meta = rs ? plural(rs.rows.length, "row") : undefined;
    let body: React.ReactNode;
    if (!rs) body = <Empty>No query for this screen yet. Add one that uses {p.clause}.</Empty>;
    else if (p.id === "roster") body = <Roster rs={rs} />;
    else if (p.id === "timing") body = <DataGrid rs={rs} maxRows={12} interactive={interactive} accentCol={rs.columns.findIndex(isMsCol)} />;
    else if (p.id === "fastest") body = <Leaderboard rs={rs} />;
    else if (p.id === "stats") body = <Stats rs={rs} />;
    else if (p.id === "pace") body = <PaceChart rs={rs} />;
    else if (p.id === "tower") body = <Tower rs={rs} />;
    else if (p.id === "strategy") body = <Strategy rs={rs} />;
    else body = <PitLog rs={rs} />;
    return (
      <PanelFrame
        key={flashing.has(p.id) ? `${p.id}:${celebration?.nonce}` : p.id}
        id={p.id}
        title={p.title}
        icon={<FeatureIcon id={p.id} className="h-3.5 w-3.5" />}
        meta={meta}
        focus={focus === p.id}
        flash={flashing.has(p.id)}
      >
        {body}
      </PanelFrame>
    );
  };

  // The current lesson's screen comes first, so it's on screen at any size; the rest keep a fixed order.
  const order: PanelId[] = ["stats", "tower", "strategy", "fastest", "pace", "timing", "pitlog", "roster"];
  const focused = PANELS.find((p) => p.id === focus) ?? null;
  const rest = order.filter((id) => id !== focused?.id).map((id) => PANELS.find((p) => p.id === id)!);

  const consolePanel = program ? (
    <PanelFrame key="console" id="console" title="Query console" icon={<Terminal className="h-3.5 w-3.5" />} meta={last ? plural(last.rows.length, "row") : undefined}>
      <Console rs={last} stdout={program.stdout} count={results.length} interactive={interactive} />
    </PanelFrame>
  ) : (
    <LockedPanel key="console" title="Query console" kind="console" clause="Run your query.sql" spot={false} />
  );

  const schemaPanel = program ? (
    <PanelFrame key="schema" id="schema" title="Database" icon={<Database className="h-3.5 w-3.5 text-white/55" />} meta={plural(tables.length, "table")}>
      <Schema tables={tables} />
    </PanelFrame>
  ) : (
    <LockedPanel key="schema" title="Database" kind="schema" clause="5 tables · lap 24 of 50" spot={false} />
  );

  return (
    <div className={`@container absolute inset-0 ${interactive ? "overflow-y-auto overscroll-contain" : "overflow-hidden"}`}>
      <div className="px-3 pb-3 pt-12">
        <div className="mb-3 flex min-w-0 items-baseline gap-x-3 gap-y-0.5 px-0.5">
          <h2 className="hud-title min-w-0 truncate">Marrow Bay Grand Prix</h2>
          <span className="hud-value hud-muted shrink-0 text-[11px]">Lap 24/50</span>
          <span className="hud-label ml-auto shrink-0">
            <span className={`hud-value ${live > 0 ? "hud-accent" : "text-white/45"}`}>{live}</span>/{PANELS.length} screens live
          </span>
        </div>
        <div className="gap-3 @xl:columns-2 @4xl:columns-3 @7xl:columns-4">
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
