"use client";

import React from "react";
import { ci, displaySql, fmt, fmtMs, isNum, num, plural, str, type ResultSet } from "./model";
import { Code, DataGrid, Empty, More, usePick } from "./ui";

/** The compact list and tile panels of the Season Analytics dashboard (lessons 1-7, 9, 10, 13). */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** "2026-03-08" → "8 Mar" (null when the text is not an ISO date). */
export function shortDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  const month = MONTHS[Number(m[2]) - 1];
  return month ? `${Number(m[3])} ${month}` : iso;
}

function weekdayOf(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return "";
  return DAYS[new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))).getUTCDay()] ?? "";
}

/** Highlight wrapper for rows that belong to the clicked driver. */
function useRowClass() {
  const { pick } = usePick();
  return (code: string) => (pick && code === pick ? "bg-[#c5ee8a]/[0.09]" : "");
}

// ───────────────────────── 1 · benchmarks ─────────────────────────

const TILE_LABEL: Record<string, string> = {
  rounds: "Rounds",
  entries: "Entries",
  avg_points: "Avg points",
  above_avg: "Above average",
  best_lap_ms: "Best lap",
};

export function Benchmarks({ rs, winners }: { rs: ResultSet; winners: ResultSet | null }) {
  const row = rs.rows[0];
  if (!row) return <Empty>0 rows returned. A SELECT of scalar subqueries gives exactly one row.</Empty>;
  const cols = rs.columns.slice(0, 8);
  const codeI = winners ? ci(winners, "code") : -1;
  const nameI = winners ? ci(winners, "name") : -1;
  return (
    <>
      <dl className="grid grid-cols-[repeat(auto-fill,minmax(5.6rem,1fr))] gap-1.5">
        {cols.map((c, i) => (
          <div key={`${i}:${c}`} className="min-w-0 rounded-md bg-white/[0.04] px-2.5 py-2">
            <dt className="hud-label truncate" title={c}>
              {TILE_LABEL[c.toLowerCase()] ?? c.replace(/_/g, " ")}
            </dt>
            <dd className={`hud-value mt-0.5 truncate text-[16px] leading-tight tabular-nums ${row[i] === null || row[i] === undefined ? "text-white/35" : "hud-accent"}`}>{fmt(row[i], c)}</dd>
          </div>
        ))}
      </dl>
      {winners && codeI >= 0 && (
        <div className="mt-2.5">
          <p className="hud-label mb-1">Race winners ({winners.rows.length})</p>
          {winners.rows.length === 0 ? (
            <Empty>No winners found: check the finish_pos = 1 filter.</Empty>
          ) : (
            <ul className="flex flex-wrap gap-1">
              {winners.rows.slice(0, 16).map((r, i) => (
                <li key={i} title={nameI >= 0 ? str(r, nameI) : undefined} className="hud-tag">
                  {str(r, codeI)}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </>
  );
}

// ───────────────────────── 2 · form guide ─────────────────────────

export function FormGuide({ rs }: { rs: ResultSet }) {
  const rowCls = useRowClass();
  const codeI = ci(rs, "code");
  const nameI = ci(rs, "name");
  const bestI = ci(rs, "best_finish");
  const lastI = ci(rs, "last_points");
  if (rs.rows.length === 0) return <Empty>0 rows returned.</Empty>;
  const shown = rs.rows.slice(0, 16);
  const maxLast = Math.max(25, ...shown.map((r) => num(r, lastI) ?? 0));
  return (
    <>
      <div className="mb-1 grid grid-cols-[2.6rem_minmax(0,1fr)_2.4rem_5rem] items-center gap-2 font-mono text-[9.5px] text-white/40">
        <span>driver</span>
        <span />
        <span className="text-right">best</span>
        <span className="text-right">last race</span>
      </div>
      <ul className="space-y-px">
        {shown.map((row, i) => {
          const code = str(row, codeI);
          const best = num(row, bestI);
          const last = num(row, lastI);
          return (
            <li key={i} className={`grid grid-cols-[2.6rem_minmax(0,1fr)_2.4rem_5rem] items-center gap-2 rounded border-t border-white/[0.05] px-1 py-[3px] first:border-t-0 ${rowCls(code)}`}>
              <Code code={code || String(i + 1)} />
              <span className="truncate text-[10.5px] text-white/60">{nameI >= 0 ? str(row, nameI) : ""}</span>
              <span className={`hud-value text-right text-[11px] ${best === 1 ? "hud-accent" : best !== null && best <= 3 ? "" : "hud-muted"}`}>{best === null ? "–" : `P${best}`}</span>
              <span className="flex items-center justify-end gap-1.5">
                <span className="hud-bar hud-bar-neutral h-1 w-8">
                  <span style={{ width: `${last === null ? 0 : Math.min(100, (last / maxLast) * 100)}%` }} />
                </span>
                <span className="hud-value w-5 text-right text-[11px] tabular-nums">{last === null ? "–" : last}</span>
              </span>
            </li>
          );
        })}
      </ul>
      <More shown={shown.length} total={rs.rows.length} />
    </>
  );
}

// ───────────────────────── 3 · points table ─────────────────────────

export function Leaders({ rs }: { rs: ResultSet }) {
  const rowCls = useRowClass();
  const codeI = ci(rs, "code");
  const nameI = ci(rs, "name");
  const ptsI = ci(rs, "points");
  const gapI = ci(rs, "gap");
  if (rs.rows.length === 0) return <Empty>0 rows returned.</Empty>;
  const shown = rs.rows.slice(0, 16);
  const max = Math.max(1, ...shown.map((r) => num(r, ptsI) ?? 0));
  return (
    <>
      <ul className="space-y-1">
        {shown.map((row, i) => {
          const pts = num(row, ptsI);
          const gap = num(row, gapI);
          return (
            <li key={i} title={nameI >= 0 ? str(row, nameI) : undefined} className={`grid grid-cols-[2.6rem_minmax(0,1fr)_2.2rem_2.2rem] items-center gap-2 rounded px-1 ${rowCls(str(row, codeI))}`}>
              <Code code={str(row, codeI) || String(i + 1)} />
              <div className={`hud-bar h-1.5 ${i === 0 ? "" : "hud-bar-neutral"}`}>
                <span style={{ width: `${pts === null ? 0 : Math.max(0, (pts / max) * 100)}%` }} />
              </div>
              <span className={`hud-value text-right text-[11px] tabular-nums ${i === 0 ? "hud-accent" : ""}`}>{pts === null ? "–" : pts}</span>
              <span className="hud-value hud-muted text-right text-[10px] tabular-nums">{gap === null || gap === 0 ? "" : `−${gap}`}</span>
            </li>
          );
        })}
      </ul>
      <More shown={shown.length} total={rs.rows.length} />
    </>
  );
}

// ───────────────────────── 4 · win / podium / DNF record ─────────────────────────

export function RecordPanel({ rs }: { rs: ResultSet }) {
  const rowCls = useRowClass();
  const codeI = ci(rs, "code");
  const startsI = ci(rs, "starts");
  const winsI = ci(rs, "wins");
  const podI = ci(rs, "podiums");
  const dnfI = ci(rs, "dnfs");
  const wetI = ci(rs, "wet_points");
  const dryI = ci(rs, "dry_points");
  if (rs.rows.length === 0) return <Empty>0 rows returned.</Empty>;
  const shown = rs.rows.slice(0, 14);
  const maxStarts = Math.max(1, ...shown.map((r) => num(r, startsI) ?? 0));
  return (
    <>
      <p className="mb-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-white/55">
        <span className="inline-flex items-center gap-1"><i className="h-2 w-2 rounded-[2px] bg-[#c5ee8a]" />win</span>
        <span className="inline-flex items-center gap-1"><i className="h-2 w-2 rounded-[2px] bg-white/80" />podium</span>
        <span className="inline-flex items-center gap-1"><i className="h-2 w-2 rounded-[2px] bg-white/25" />finished</span>
        <span className="inline-flex items-center gap-1"><i className="h-2 w-2 rounded-[2px] bg-[#f87171]/80" />DNF</span>
      </p>
      <ul className="space-y-1">
        {shown.map((row, i) => {
          const starts = num(row, startsI) ?? 0;
          const wins = num(row, winsI) ?? 0;
          const pods = Math.max(0, (num(row, podI) ?? 0) - wins);
          const dnfs = num(row, dnfI) ?? 0;
          const rest = Math.max(0, starts - wins - pods - dnfs);
          const w = (n: number) => `${(n / maxStarts) * 100}%`;
          const wet = num(row, wetI);
          const dry = num(row, dryI);
          return (
            <li key={i} className={`grid grid-cols-[2.6rem_minmax(0,1fr)_auto] items-center gap-2 rounded px-1 @lg:grid-cols-[2.6rem_minmax(0,1fr)_auto_auto] ${rowCls(str(row, codeI))}`}>
              <Code code={str(row, codeI) || String(i + 1)} />
              <div className="flex h-2 min-w-0 overflow-hidden rounded-full bg-white/[0.06]">
                <span style={{ width: w(wins) }} className="bg-[#c5ee8a]" />
                <span style={{ width: w(pods) }} className="bg-white/80" />
                <span style={{ width: w(rest) }} className="bg-white/25" />
                <span style={{ width: w(dnfs) }} className="bg-[#f87171]/80" />
              </div>
              <span className="hud-value hud-muted whitespace-nowrap text-right text-[10px] tabular-nums">
                {wins}W · {num(row, podI) ?? 0}P
              </span>
              <span className="hud-value hidden whitespace-nowrap text-right text-[10px] tabular-nums text-white/45 @lg:block" title="points in the wet / the dry">
                {wet ?? "–"} wet · {dry ?? "–"} dry
              </span>
            </li>
          );
        })}
      </ul>
      <More shown={shown.length} total={rs.rows.length} />
    </>
  );
}

// ───────────────────────── 5 · qualifying ladder ─────────────────────────

const SESSION_STYLE: Record<string, string> = {
  Q3: "border-transparent bg-[#c5ee8a] text-[#0a0a0a]",
  Q2: "border-white/20 text-white/90",
  Q1: "border-white/10 text-white/55",
};

export function Qualifying({ rs, sheet }: { rs: ResultSet; sheet: ResultSet | null }) {
  const rowCls = useRowClass();
  const codeI = ci(rs, "code");
  const sessI = ci(rs, "sessions");
  const q2I = ci(rs, "reached_q2");
  const q3I = ci(rs, "reached_q3");
  if (rs.rows.length === 0) return <Empty>0 rows returned.</Empty>;
  const shown = rs.rows.slice(0, 14);
  return (
    <>
      <p className="mb-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-white/55">
        <span className="inline-flex items-center gap-1"><i className="h-2 w-2 rounded-[2px] bg-[#c5ee8a]" />reached Q3</span>
        <span className="inline-flex items-center gap-1"><i className="h-2 w-2 rounded-[2px] bg-white/80" />out in Q2</span>
        <span className="inline-flex items-center gap-1"><i className="h-2 w-2 rounded-[2px] bg-white/25" />out in Q1</span>
      </p>
      <ul className="space-y-1">
        {shown.map((row, i) => {
          const total = num(row, sessI) ?? 0;
          const q2 = num(row, q2I) ?? 0;
          const q3 = num(row, q3I) ?? 0;
          const pct = (n: number) => (total > 0 ? `${(Math.max(0, n) / total) * 100}%` : "0%");
          return (
            <li key={i} className={`grid grid-cols-[2.6rem_minmax(0,1fr)_3.2rem] items-center gap-2 rounded px-1 ${rowCls(str(row, codeI))}`}>
              <Code code={str(row, codeI) || String(i + 1)} />
              <div className="flex h-2 min-w-0 overflow-hidden rounded-full bg-white/[0.06]">
                <span style={{ width: pct(q3) }} className="bg-[#c5ee8a]" />
                <span style={{ width: pct(q2 - q3) }} className="bg-white/80" />
                <span style={{ width: pct(total - q2) }} className="bg-white/25" />
              </div>
              <span className="hud-value hud-muted text-right text-[10px] tabular-nums">
                {q3}/{total} Q3
              </span>
            </li>
          );
        })}
      </ul>
      <More shown={shown.length} total={rs.rows.length} />
      {sheet && <GridSheet rs={sheet} />}
    </>
  );
}

function GridSheet({ rs }: { rs: ResultSet }) {
  const rowCls = useRowClass();
  const gridI = ci(rs, "grid");
  const codeI = ci(rs, "code");
  const sessI = ci(rs, "session");
  const bestI = ci(rs, "best_ms");
  const shown = rs.rows.slice(0, 14);
  return (
    <div className="mt-3 border-t border-white/[0.06] pt-2">
      <p className="hud-label mb-1">Grid sheet · {plural(rs.rows.length, "car")}</p>
      <ul className="gap-x-6 @lg:columns-2">
        {shown.map((row, i) => {
          const session = str(row, sessI);
          const best = num(row, bestI);
          return (
            <li key={i} className={`grid break-inside-avoid grid-cols-[1.4rem_2.6rem_3.6rem_minmax(0,1fr)] items-center gap-2 rounded px-1 py-px ${rowCls(str(row, codeI))}`}>
              <span className="hud-value hud-muted text-right text-[10px] tabular-nums">{str(row, gridI)}</span>
              <Code code={str(row, codeI)} />
              <span className={`hud-tag h-4 justify-center px-1.5 text-[9px] ${SESSION_STYLE[session] ?? "border-[#fbbf24]/35 text-[#fbbf24]"}`}>{session || "?"}</span>
              <span className={`hud-value text-right text-[11px] tabular-nums ${best === null ? "italic text-white/35" : ""}`}>{best === null ? "NULL" : fmtMs(best)}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ───────────────────────── 6 · calendar ─────────────────────────

export function CalendarPanel({ rs }: { rs: ResultSet }) {
  const roundI = ci(rs, "round");
  const nameI = ci(rs, "name");
  const dateI = ci(rs, "race_date");
  const wdI = ci(rs, "weekday");
  const gapI = ci(rs, "days_since_prev");
  if (rs.rows.length === 0) return <Empty>0 rows returned.</Empty>;
  const shown = rs.rows.slice(0, 24);
  const gaps = shown.map((r) => num(r, gapI)).filter(isNum);
  const maxGap = Math.max(1, ...gaps);
  return (
    <>
      <ol className="space-y-px">
        {shown.map((row, i) => {
          const gap = num(row, gapI);
          const date = str(row, dateI);
          const wd = str(row, wdI) || weekdayOf(date);
          const odd = wd !== "" && !/^sun/i.test(wd);
          const long = gap !== null && gap >= maxGap * 0.9 && maxGap >= 35;
          return (
            <li key={i} className="grid grid-cols-[1.7rem_minmax(0,1fr)_4.3rem] items-center gap-2 border-t border-white/[0.05] py-[3px] first:border-t-0 @lg:grid-cols-[1.7rem_minmax(0,1fr)_4.3rem_minmax(0,7rem)]">
              <span className="hud-value hud-muted text-[10px] tabular-nums">R{str(row, roundI) || i + 1}</span>
              <span className="min-w-0 truncate text-[11px] text-white/85">{str(row, nameI).replace(/ Grand Prix$/i, "") || "Round"}</span>
              <span className="hud-value text-right text-[10.5px] tabular-nums">
                {shortDate(date)}
                <span className={`ml-1 text-[9px] ${odd ? "hud-warning" : "hud-muted"}`}>{wd.slice(0, 3)}</span>
              </span>
              <span className="hidden items-center gap-1.5 @lg:flex">
                <span className={`hud-bar h-1 flex-1 ${long ? "" : "hud-bar-neutral"}`}>
                  <span style={{ width: gap === null ? "0%" : `${Math.max(3, (gap / maxGap) * 100)}%` }} />
                </span>
                <span className={`hud-value w-8 text-right text-[10px] tabular-nums ${long ? "hud-accent" : "hud-muted"}`}>{gap === null ? "–" : `${gap}d`}</span>
              </span>
            </li>
          );
        })}
      </ol>
      <p className="mt-1.5 truncate font-mono text-[10px] text-white/40">
        {(() => {
          const g = gaps.length ? Math.max(...gaps) : 0;
          return g >= 35 ? `Summer break: ${g} days between rounds` : "days since the previous round";
        })()}
      </p>
    </>
  );
}

// ───────────────────────── 6 · steward reports ─────────────────────────

export function Stewards({ rs }: { rs: ResultSet }) {
  const catI = ci(rs, "category");
  const penI = ci(rs, "penalties");
  const secI = ci(rs, "seconds");
  if (rs.rows.length === 0) return <Empty>0 rows returned.</Empty>;
  const shown = rs.rows.slice(0, 10);
  const max = Math.max(1, ...shown.map((r) => num(r, penI) ?? 0));
  const total = shown.reduce((a, r) => a + (num(r, penI) ?? 0), 0);
  return (
    <>
      <ul className="space-y-1.5">
        {shown.map((row, i) => {
          const n = num(row, penI);
          const sec = num(row, secI);
          return (
            <li key={i} className="grid grid-cols-[minmax(0,7.5rem)_minmax(0,1fr)_auto] items-center gap-2">
              <span className="truncate text-[11px] text-white/85">{str(row, catI) || "(blank)"}</span>
              <div className={`hud-bar h-1.5 ${i === 0 ? "" : "hud-bar-neutral"}`}>
                <span style={{ width: `${n === null ? 0 : (n / max) * 100}%` }} />
              </div>
              <span className="hud-value hud-muted w-[4.2rem] text-right text-[10px] tabular-nums">
                <span className="text-white/85">{n ?? "–"}</span>
                {sec !== null && <> · {sec}s</>}
              </span>
            </li>
          );
        })}
      </ul>
      <p className="mt-1.5 truncate font-mono text-[10px] text-white/40">{total} {total === 1 ? "penalty" : "penalties"} cleaned into {shown.length} {shown.length === 1 ? "category" : "categories"}</p>
    </>
  );
}

// ───────────────────────── 7 · honours ─────────────────────────

export function Honours({ rs }: { rs: ResultSet }) {
  const honI = ci(rs, "honour");
  const codeI = ci(rs, "code");
  const totI = ci(rs, "total");
  if (rs.rows.length === 0) return <Empty>0 rows returned.</Empty>;
  const groups = new Map<string, { code: string; total: number }[]>();
  for (const row of rs.rows) {
    const h = str(row, honI) || "Honour";
    const list = groups.get(h) ?? [];
    list.push({ code: str(row, codeI), total: num(row, totI) ?? 0 });
    groups.set(h, list);
  }
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(8.5rem,1fr))] gap-x-4 gap-y-2.5">
      {[...groups].slice(0, 6).map(([name, list]) => (
        <div key={name} className="min-w-0">
          <p className="hud-label mb-1 truncate">{name}</p>
          <ul className="flex flex-wrap gap-1">
            {list
              .slice()
              .sort((a, b) => b.total - a.total)
              .slice(0, 10)
              .map((d, i) => (
                <li key={`${d.code}:${i}`} className="hud-tag gap-1">
                  <span className={i === 0 ? "hud-accent" : ""}>{d.code}</span>
                  <span className="hud-muted font-mono text-[9.5px]">×{d.total}</span>
                </li>
              ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

// ───────────────────────── 9 · head-to-head ─────────────────────────

export function HeadToHead({ rs }: { rs: ResultSet }) {
  const teamI = ci(rs, "team");
  const aI = ci(rs, "driver_a");
  const bI = ci(rs, "driver_b");
  const racesI = ci(rs, "races");
  const aAheadI = ci(rs, "a_ahead");
  const bAheadI = ci(rs, "b_ahead");
  const aPtsI = ci(rs, "a_points");
  const bPtsI = ci(rs, "b_points");
  if (rs.rows.length === 0) return <Empty>0 rows returned. Check the self-join conditions.</Empty>;
  return (
    <ul className="space-y-2.5">
      {rs.rows.slice(0, 10).map((row, i) => {
        const a = num(row, aAheadI) ?? 0;
        const b = num(row, bAheadI) ?? 0;
        const races = num(row, racesI) ?? a + b;
        const total = Math.max(1, a + b);
        const aPts = num(row, aPtsI);
        const bPts = num(row, bPtsI);
        const aLead = a > b;
        const bLead = b > a;
        return (
          <li key={i} className="min-w-0">
            <div className="mb-0.5 flex items-baseline justify-between gap-2">
              <span className="hud-muted min-w-0 truncate text-[10px]">{str(row, teamI)}</span>
              <span className="hud-label shrink-0 text-white/35">{plural(races, "race")} together</span>
            </div>
            <div className="grid grid-cols-[2.4rem_minmax(0,1fr)_2.4rem] items-center gap-2">
              <span className="text-right"><Code code={str(row, aI)} /></span>
              <div className="flex h-2.5 min-w-0 gap-[2px] overflow-hidden rounded-full bg-white/[0.06]">
                <span style={{ width: `${(a / total) * 100}%` }} className={`${aLead ? "bg-[#c5ee8a]" : bLead ? "bg-white/30" : "bg-white/60"} transition-[width] duration-500`} />
                <span style={{ width: `${(b / total) * 100}%` }} className={`${bLead ? "bg-[#c5ee8a]" : aLead ? "bg-white/30" : "bg-white/60"} transition-[width] duration-500`} />
              </div>
              <span><Code code={str(row, bI)} /></span>
            </div>
            <div className="mt-px grid grid-cols-[2.4rem_minmax(0,1fr)_2.4rem] items-center gap-2 font-mono text-[10px] tabular-nums text-white/55">
              <span className={`text-right ${aLead ? "hud-accent" : ""}`}>{a}</span>
              <span className="truncate text-center text-[9.5px] text-white/35">
                places ahead{aPts !== null && bPts !== null ? ` · ${aPts} – ${bPts} pts` : ""}
              </span>
              <span className={bLead ? "hud-accent" : ""}>{b}</span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

// ───────────────────────── 10 · drivers of the day ─────────────────────────

export function Movers({ rs }: { rs: ResultSet }) {
  const rowCls = useRowClass();
  const roundI = ci(rs, "round");
  const codeI = ci(rs, "code");
  const gridI = ci(rs, "grid");
  const finI = ci(rs, "finish_pos");
  const gainI = ci(rs, "gained");
  if (rs.rows.length === 0) return <Empty>0 rows returned.</Empty>;
  const shown = rs.rows.slice(0, 12);
  const max = Math.max(1, ...shown.map((r) => num(r, gainI) ?? 0));
  return (
    <>
      <ol className="space-y-px">
        {shown.map((row, i) => {
          const gain = num(row, gainI);
          return (
            <li key={i} className={`grid grid-cols-[1.9rem_2.6rem_minmax(0,1fr)_2.2rem] items-center gap-2 rounded border-t border-white/[0.05] px-1 py-[3px] first:border-t-0 ${rowCls(str(row, codeI))}`}>
              <span className="hud-value hud-muted text-[10px] tabular-nums">R{str(row, roundI) || i + 1}</span>
              <Code code={str(row, codeI)} />
              <span className="flex min-w-0 items-center gap-2">
                <span className="hud-value shrink-0 text-[10.5px] tabular-nums text-white/70">
                  P{str(row, gridI)} → P{str(row, finI)}
                </span>
                <span className="hud-bar hud-bar-neutral hidden h-1 min-w-4 flex-1 @md:block">
                  <span style={{ width: `${gain === null ? 0 : Math.max(0, (gain / max) * 100)}%` }} />
                </span>
              </span>
              <span className={`hud-value text-right text-[11px] tabular-nums ${gain !== null && gain > 0 ? "hud-accent" : "hud-muted"}`}>{gain === null ? "–" : gain > 0 ? `+${gain}` : gain}</span>
            </li>
          );
        })}
      </ol>
      <More shown={shown.length} total={rs.rows.length} />
    </>
  );
}

// ───────────────────────── 13 · pit strategy ─────────────────────────

export function Strategy({ rs, audit }: { rs: ResultSet; audit: ResultSet | null }) {
  const stopsI = ci(rs, "stops");
  const entriesI = ci(rs, "entries");
  const ptsI = ci(rs, "points");
  const avgI = ci(rs, "avg_points");
  if (rs.rows.length === 0) return <Empty>0 rows returned.</Empty>;
  const shown = rs.rows.slice(0, 8);
  const max = Math.max(0.1, ...shown.map((r) => num(r, avgI) ?? 0));
  const best = Math.max(...shown.map((r) => num(r, avgI) ?? -1));
  const sum = ptsI >= 0 ? shown.reduce((a, r) => a + (num(r, ptsI) ?? 0), 0) : null;
  const joined = audit ? num(audit.rows[0] ?? [], ci(audit, "joined_points")) : null;
  const truth = audit ? num(audit.rows[0] ?? [], ci(audit, "true_points")) : null;
  return (
    <>
      <ul className="space-y-1.5">
        {shown.map((row, i) => {
          const stops = num(row, stopsI);
          const avg = num(row, avgI);
          return (
            <li key={i} className="grid grid-cols-[3.6rem_minmax(0,1fr)_auto] items-center gap-2">
              <span className="hud-value whitespace-nowrap text-[11px]">{stops === null ? "?" : stops === 0 ? "no stop" : plural(stops, "stop")}</span>
              <div className={`hud-bar h-2 ${avg === best ? "" : "hud-bar-neutral"}`}>
                <span style={{ width: `${avg === null ? 0 : (avg / max) * 100}%` }} />
              </div>
              <span className="hud-value whitespace-nowrap text-right text-[10.5px] tabular-nums">
                <span className={avg === best ? "hud-accent" : ""}>{avg === null ? "–" : avg}</span>
                <span className="hud-muted"> avg · {num(row, entriesI) ?? "?"} cars</span>
              </span>
            </li>
          );
        })}
      </ul>
      <p className="mt-1.5 truncate font-mono text-[10px] text-white/40">average points per classified finisher{sum !== null ? ` · ${sum} pts in total` : ""}</p>
      {joined !== null && truth !== null && truth > 0 && (
        <p className="mt-2 rounded-md border border-[#fbbf24]/30 bg-[#fbbf24]/[0.06] px-2 py-1.5 text-[10.5px] leading-snug text-white/80">
          <span className="hud-warning font-semibold">Audit · </span>
          a plain join would claim <span className="hud-value">{joined}</span> points; the real total is <span className="hud-value">{truth}</span> ({joined > truth ? "+" : ""}
          {Math.round(((joined - truth) / truth) * 100)}%). Aggregate before you join.
        </p>
      )}
    </>
  );
}

// ───────────────────────── 13 · query plan ─────────────────────────

function planLines(rs: ResultSet): { depth: number; text: string }[] {
  const idI = ci(rs, "id");
  const parentI = ci(rs, "parent");
  const detailI = ci(rs, "detail");
  const depthOf = new Map<number, number>();
  return rs.rows.slice(0, 12).map((row) => {
    const id = num(row, idI);
    const parent = num(row, parentI);
    const depth = parent !== null && depthOf.has(parent) ? (depthOf.get(parent) ?? 0) + 1 : 0;
    if (id !== null) depthOf.set(id, depth);
    return { depth, text: str(row, detailI) || str(row, 0) };
  });
}

function PlanText({ text }: { text: string }) {
  const m = /^(SCAN|SEARCH|USE TEMP B-TREE|CO-ROUTINE|MATERIALIZE|COMPOUND|MERGE)\b/.exec(text);
  const rest = m ? text.slice(m[0].length) : text;
  const tone = !m ? "" : m[1] === "SCAN" ? "hud-warning" : m[1] === "SEARCH" ? "hud-accent" : "hud-muted";
  return (
    <>
      {m && <span className={`font-semibold ${tone}`}>{m[0]}</span>}
      <span className="text-white/80">{rest}</span>
    </>
  );
}

export function PlanPanel({ plans }: { plans: ResultSet[] }) {
  if (plans.length === 0) return <Empty>Run EXPLAIN QUERY PLAN SELECT … to see how SQLite would run it.</Empty>;
  return (
    <div className="space-y-2.5">
      {plans.map((rs, pi) => {
        const lines = planLines(rs);
        const label = plans.length > 1 ? (pi === 0 ? "Before" : "After") : "Plan";
        const text = lines.map((l) => l.text).join(" ");
        const verdict = /\bSEARCH\b/.test(text) && /USING (COVERING )?INDEX/.test(text) ? "uses an index" : /\bSCAN\b/.test(text) ? "reads every row" : "";
        return (
          <div key={pi}>
            <p className="hud-label mb-1 flex items-center gap-2">
              <span>{label}</span>
              {verdict && <span className={verdict === "uses an index" ? "hud-accent normal-case" : "hud-warning normal-case"}>{verdict}</span>}
            </p>
            <ol className="rounded-md bg-white/[0.04] px-2 py-1.5 font-mono text-[10.5px] leading-[1.55]">
              {lines.length === 0 && <li className="text-white/40">(empty plan)</li>}
              {lines.map((l, i) => (
                <li key={i} className="break-words" style={{ paddingLeft: `${Math.min(l.depth, 4) * 12}px` }}>
                  <PlanText text={l.text} />
                </li>
              ))}
            </ol>
          </div>
        );
      })}
    </div>
  );
}

// ───────────────────────── console ─────────────────────────

export function Console({ rs, stdout, count, interactive }: { rs: ResultSet | null; stdout: string; count: number; interactive: boolean }) {
  const writes = stdout
    .split("\n")
    .filter((l) => /^[A-Z]+ ok\b/.test(l.trim()))
    .slice(-3);
  const isPlan = rs ? ci(rs, "detail") >= 0 && ci(rs, "parent") >= 0 : false;
  return (
    <>
      {rs ? (
        <>
          <pre className="mb-2 rounded-md bg-white/[0.04] px-2 py-1.5 font-mono text-[10.5px] leading-[1.45] text-white/75">
            <code className="line-clamp-4 whitespace-pre-wrap break-words">{displaySql(rs.sql) || "SELECT …"}</code>
          </pre>
          {isPlan ? <PlanPanel plans={[rs]} /> : <DataGrid rs={rs} maxRows={8} interactive={interactive} />}
        </>
      ) : (
        <Empty>No result sets yet. Run a SELECT to see its rows here.</Empty>
      )}
      {(writes.length > 0 || count > 1) && (
        <div className="hud-log mt-2 border-t border-white/[0.06] pt-1.5 text-[10.5px]">
          {writes.map((l, i) => (
            <div key={`${i}:${l}`} className="hud-log-line truncate">
              {l.trim().replace(/^(CREATE|DROP|ALTER|PRAGMA|EXPLAIN)(.*?) · \d+ rows? changed$/, "$1$2")}
            </div>
          ))}
          {count > 1 && <div className="hud-log-line hud-muted truncate">{plural(count, "result set")} in query.sql</div>}
        </div>
      )}
    </>
  );
}
