"use client";

import React from "react";
import { ci, fmtMs, num, plural, SERIES, str, type ResultSet } from "./model";
import { Chip, Code, Empty, More, useWidth, usePick } from "./ui";

/** The big panels: progression chart, heatmaps, standings and the final championship. */

// ───────────────────────── points progression (SVG line chart) ─────────────────────────

interface Series {
  code: string;
  pts: { round: number; total: number }[];
  final: number;
}

function readSeries(rs: ResultSet): Series[] {
  const codeI = ci(rs, "code");
  const roundI = ci(rs, "round");
  const totalI = ci(rs, "total");
  const by = new Map<string, { round: number; total: number }[]>();
  for (const row of rs.rows) {
    const code = str(row, codeI);
    const round = num(row, roundI);
    const total = num(row, totalI);
    if (!code || round === null || total === null) continue;
    const list = by.get(code) ?? [];
    list.push({ round, total });
    by.set(code, list);
  }
  return [...by].map(([code, pts]) => {
    pts.sort((a, b) => a.round - b.round);
    return { code, pts, final: pts[pts.length - 1]?.total ?? 0 };
  });
}

/** Spread label positions so they never overlap (keeps their order). */
function spread(ys: number[], min: number, gap: number, max: number): number[] {
  const idx = ys.map((y, i) => [y, i] as const).sort((a, b) => a[0] - b[0]);
  const out = new Array<number>(ys.length).fill(0);
  let prev = min - gap;
  for (const [y, i] of idx) {
    const v = Math.max(y, prev + gap);
    out[i] = v;
    prev = v;
  }
  const over = prev - max;
  if (over > 0) {
    for (let k = idx.length - 1, next = max + gap; k >= 0; k--) {
      const i = idx[k][1];
      out[i] = Math.min(out[i], next - gap);
      next = out[i];
    }
  }
  return out;
}

export function Progression({ rs }: { rs: ResultSet }) {
  const [width, ref] = useWidth();
  const { pick, setPick, interactive } = usePick();
  const [hover, setHover] = React.useState<number | null>(null);
  const series = readSeries(rs);
  if (series.length === 0) return <Empty>No usable rows. The chart needs the columns code, round and total.</Empty>;

  const order = series.slice().sort((a, b) => b.final - a.final || (a.code < b.code ? -1 : 1));
  const rounds = series.flatMap((s) => s.pts.map((p) => p.round));
  const minR = Math.min(...rounds);
  const maxR = Math.max(...rounds);
  const yMax = Math.max(1, ...series.map((s) => s.final));
  const step = yMax > 200 ? 50 : yMax > 80 ? 25 : 10;
  const top = Math.ceil(yMax / step) * step;

  // up to three highlighted drivers: the picked one first, then the leaders
  const colours = [SERIES.first, SERIES.second, SERIES.third];
  const highlight = new Map<string, string>();
  if (pick && series.some((s) => s.code === pick)) highlight.set(pick, colours[0]);
  for (const s of order) {
    if (highlight.size >= 3) break;
    if (!highlight.has(s.code)) highlight.set(s.code, colours[highlight.size]);
  }

  const W = Math.max(240, width || 320);
  const H = W < 420 ? 190 : 230;
  const m = { l: 28, r: 34, t: 8, b: 20 };
  const x = (r: number) => m.l + ((r - minR) / (maxR - minR || 1)) * (W - m.l - m.r);
  const y = (v: number) => H - m.b - (v / top) * (H - m.t - m.b);
  const path = (s: Series) => s.pts.map((p, i) => `${i ? "L" : "M"}${x(p.round).toFixed(1)} ${y(p.total).toFixed(1)}`).join(" ");
  const ticks = Array.from({ length: Math.floor(top / step) + 1 }, (_, i) => i * step);
  const xEvery = (W - m.l - m.r) / Math.max(1, maxR - minR) < 24 ? 2 : 1;

  const marked = order.filter((s) => highlight.has(s.code));
  const labelYs = spread(marked.map((s) => y(s.final)), m.t + 4, 11, H - m.b);
  const shownRound = hover ?? maxR;
  const at = (s: Series, r: number) => {
    let v: number | null = null;
    for (const p of s.pts) if (p.round <= r) v = p.total;
    return v;
  };

  const onMove = (e: React.PointerEvent<SVGRectElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - box.left + m.l;
    const r = Math.round(minR + ((px - m.l) / (W - m.l - m.r)) * (maxR - minR));
    setHover(Math.max(minR, Math.min(maxR, r)));
  };

  return (
    <div ref={ref} className="min-w-0">
      <p className="mb-1 flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-0.5 font-mono text-[10.5px]" aria-live="polite">
        <span className="hud-label shrink-0 text-white/45">after round {shownRound}</span>
        {marked.map((s) => (
          <span key={s.code} className="shrink-0">
            <i className="mr-1 inline-block h-1.5 w-3 rounded-full align-middle" style={{ background: highlight.get(s.code) }} />
            <span className="text-white/85">{s.code}</span> <span className="hud-value tabular-nums">{at(s, shownRound) ?? "–"}</span>
          </span>
        ))}
      </p>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Points progression for ${series.length} drivers over ${maxR - minR + 1} rounds. ${order[0].code} leads on ${order[0].final} points.`} className="block max-w-full overflow-visible">
        {ticks.map((t) => (
          <g key={t}>
            <path d={`M${m.l} ${y(t)} H${W - m.r}`} stroke="rgba(255,255,255,0.07)" />
            <text x={m.l - 5} y={y(t) + 3} textAnchor="end" fontSize="9.5" fill="rgba(255,255,255,0.4)" fontFamily="var(--font-mono)">
              {t}
            </text>
          </g>
        ))}
        {Array.from({ length: maxR - minR + 1 }, (_, i) => minR + i)
          .filter((r, i) => i % xEvery === 0 || r === maxR)
          .map((r) => (
            <text key={r} x={x(r)} y={H - 5} textAnchor="middle" fontSize="9.5" fill={r === shownRound ? "#f4f4f4" : "rgba(255,255,255,0.4)"} fontFamily="var(--font-mono)">
              {r}
            </text>
          ))}
        {series
          .filter((s) => !highlight.has(s.code))
          .map((s) => (
            <path key={s.code} d={path(s)} fill="none" stroke={SERIES.dim} strokeWidth="1" strokeLinejoin="round" />
          ))}
        {marked
          .slice()
          .reverse()
          .map((s) => (
            <g key={s.code}>
              <path d={path(s)} fill="none" stroke={highlight.get(s.code)} strokeWidth={s.code === marked[0].code || s.code === pick ? 2.4 : 1.8} strokeLinejoin="round" strokeLinecap="round" />
              {s.pts.map((p) => (
                <circle key={p.round} cx={x(p.round)} cy={y(p.total)} r={p.round === shownRound ? 3.2 : 1.6} fill={highlight.get(s.code)} />
              ))}
            </g>
          ))}
        {marked.map((s, i) => (
          <text key={s.code} x={W - m.r + 5} y={labelYs[i] + 3} fontSize="10.5" fontWeight="600" fill={highlight.get(s.code)} fontFamily="var(--font-mono)">
            {s.code}
          </text>
        ))}
        {hover !== null && <path d={`M${x(hover)} ${m.t} V${H - m.b}`} stroke="rgba(255,255,255,0.35)" strokeDasharray="2 3" />}
        {interactive && <rect x={m.l - 6} y={m.t} width={W - m.l - m.r + 12} height={H - m.t - m.b} fill="transparent" onPointerMove={onMove} onPointerDown={onMove} onPointerLeave={() => setHover(null)} />}
      </svg>
      {interactive && (
        <ul className="mt-1.5 flex flex-wrap gap-1" aria-label="Highlight a driver">
          {order.map((s) => (
            <li key={s.code}>
              <Chip active={highlight.get(s.code) === SERIES.first} onClick={() => setPick(pick === s.code ? null : s.code)} title={`${s.code}: ${s.final} points`}>
                {s.code}
              </Chip>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ───────────────────────── heatmaps ─────────────────────────

interface HeatRow {
  code: string;
  cells: Map<number, { v: number; note: string; entered: boolean }>;
  mean: number;
}

function Heat({
  rows,
  rounds,
  colour,
  label,
  showValues,
  total,
  onHover,
  hover,
}: {
  rows: HeatRow[];
  rounds: number[];
  colour: (v: number) => string;
  label: (v: number) => string;
  showValues: boolean;
  total?: (row: HeatRow) => string;
  onHover: (h: { code: string; round: number } | null) => void;
  hover: { code: string; round: number } | null;
}) {
  const { pick, interactive } = usePick();
  const cols = `2.6rem repeat(${rounds.length}, minmax(0, 1fr))${total ? " 2.2rem" : ""}`;
  return (
    <div role="grid" className="min-w-0">
      <div className="mb-[3px] grid items-end gap-[3px]" style={{ gridTemplateColumns: cols }}>
        <span />
        {rounds.map((r) => (
          <span key={r} className="hud-value hud-muted text-center text-[9px]">
            {r}
          </span>
        ))}
        {total && <span className="hud-label text-right text-[8.5px] text-white/35">total</span>}
      </div>
      <div className="space-y-[3px]">
        {rows.map((row) => (
          <div key={row.code} role="row" className={`grid items-center gap-[3px] rounded-[3px] ${pick === row.code ? "bg-[#c5ee8a]/[0.09]" : ""}`} style={{ gridTemplateColumns: cols }}>
            <Code code={row.code} />
            {rounds.map((r) => {
              const c = row.cells.get(r);
              const isHover = hover?.code === row.code && hover.round === r;
              return (
                <span
                  key={r}
                  role="gridcell"
                  tabIndex={interactive && c ? 0 : undefined}
                  aria-label={c ? `${row.code} round ${r}: ${label(c.v)}` : `${row.code} round ${r}: no data`}
                  onPointerEnter={() => interactive && c && onHover({ code: row.code, round: r })}
                  onFocus={() => c && onHover({ code: row.code, round: r })}
                  onPointerDown={() => interactive && c && onHover({ code: row.code, round: r })}
                  className={`hud-value flex h-[18px] items-center justify-center rounded-[3px] text-[9px] tabular-nums ${c && c.entered ? "" : "border border-dashed border-white/10"} ${isHover ? "outline outline-1 outline-white" : ""}`}
                  style={c && c.entered ? { background: colour(c.v), color: c.v > 0 || !showValues ? "#0a0a0a" : "rgba(255,255,255,0.45)" } : undefined}
                >
                  {c && c.entered && showValues ? c.v : ""}
                </span>
              );
            })}
            {total && <span className="hud-value hud-muted text-right text-[10px] tabular-nums">{total(row)}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

const lime = (t: number) => `rgba(197, 238, 138, ${(0.1 + 0.85 * Math.max(0, Math.min(1, t))).toFixed(3)})`;

export function PointsGrid({ rs }: { rs: ResultSet }) {
  const [hover, setHover] = React.useState<{ code: string; round: number } | null>(null);
  const codeI = ci(rs, "code");
  const roundI = ci(rs, "round");
  const ptsI = ci(rs, "points");
  const enteredI = ci(rs, "entered");
  const by = new Map<string, HeatRow>();
  const roundSet = new Set<number>();
  for (const row of rs.rows) {
    const code = str(row, codeI);
    const round = num(row, roundI);
    const pts = num(row, ptsI) ?? 0;
    if (!code || round === null) continue;
    roundSet.add(round);
    const h = by.get(code) ?? { code, cells: new Map(), mean: 0 };
    const entered = enteredI < 0 ? true : (num(row, enteredI) ?? 0) > 0;
    h.cells.set(round, { v: pts, note: "", entered });
    h.mean += pts;
    by.set(code, h);
  }
  const rows = [...by.values()];
  const rounds = [...roundSet].sort((a, b) => a - b);
  if (rows.length === 0) return <Empty>No usable rows. The matrix needs code, round and points.</Empty>;
  const entries = rows.reduce((a, r) => a + [...r.cells.values()].filter((c) => c.entered).length, 0);
  const cell = hover ? by.get(hover.code)?.cells.get(hover.round) : undefined;
  return (
    <>
      <Heat
        rows={rows.slice(0, 16)}
        rounds={rounds}
        colour={(v) => lime(v / 25)}
        label={(v) => `${v} points`}
        showValues
        total={(r) => String(r.mean)}
        hover={hover}
        onHover={setHover}
      />
      <p className="mt-2 truncate font-mono text-[10px] text-white/45" aria-live="polite">
        {hover && cell ? `${hover.code} · round ${hover.round} · ${cell.v} points` : `${rows.length} drivers × ${rounds.length} rounds · ${entries} entries · dashed = not entered`}
      </p>
      <More shown={Math.min(16, rows.length)} total={rows.length} />
    </>
  );
}

export function PaceHeat({ rs }: { rs: ResultSet }) {
  const [mode, setMode] = React.useState<"gap" | "form">("gap");
  const [hover, setHover] = React.useState<{ code: string; round: number } | null>(null);
  const codeI = ci(rs, "code");
  const roundI = ci(rs, "round");
  const gapI = ci(rs, "gap_pct");
  const formI = ci(rs, "form3");
  const avgI = ci(rs, "avg_ms");
  const useForm = mode === "form" && formI >= 0;
  const valueI = useForm ? formI : gapI;
  const by = new Map<string, HeatRow & { n: number }>();
  const roundSet = new Set<number>();
  for (const row of rs.rows) {
    const code = str(row, codeI);
    const round = num(row, roundI);
    const v = num(row, valueI);
    if (!code || round === null || v === null) continue;
    roundSet.add(round);
    const h = by.get(code) ?? { code, cells: new Map(), mean: 0, n: 0 };
    const avg = num(row, avgI);
    h.cells.set(round, { v, note: avg === null ? "" : fmtMs(avg), entered: true });
    h.mean += v;
    h.n += 1;
    by.set(code, h);
  }
  const rows = [...by.values()]
    .map((h) => ({ ...h, mean: h.n ? h.mean / h.n : 0 }))
    .sort((a, b) => a.mean - b.mean || (a.code < b.code ? -1 : 1));
  const rounds = [...roundSet].sort((a, b) => a - b);
  if (rows.length === 0) return <Empty>No usable rows. The heatmap needs code, round and gap_pct.</Empty>;
  const clip = 2.5;
  const cell = hover ? by.get(hover.code)?.cells.get(hover.round) : undefined;
  return (
    <>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <Chip active={mode === "gap"} onClick={() => setMode("gap")}>
          race gap
        </Chip>
        {formI >= 0 && (
          <Chip active={mode === "form"} onClick={() => setMode("form")} title="Average gap over the last three rounds">
            3-race form
          </Chip>
        )}
        <span className="ml-auto flex items-center gap-1.5 font-mono text-[9.5px] text-white/45">
          quickest
          <i className="h-1.5 w-14 rounded-full" style={{ background: "linear-gradient(90deg, rgba(197,238,138,0.95), rgba(197,238,138,0.1))" }} />
          {clip}%+ slower
        </span>
      </div>
      <Heat rows={rows.slice(0, 16)} rounds={rounds} colour={(v) => lime(1 - v / clip)} label={(v) => `${v.toFixed(2)}% off the quickest`} showValues={false} hover={hover} onHover={setHover} />
      <p className="mt-2 truncate font-mono text-[10px] text-white/45" aria-live="polite">
        {hover && cell
          ? `${hover.code} · round ${hover.round} · ${cell.v === 0 ? "quickest car" : `+${cell.v.toFixed(2)}%`}${cell.note ? ` · avg ${cell.note}` : ""}`
          : "Hover or tap a cell · rows sorted quickest first"}
      </p>
      <More shown={Math.min(16, rows.length)} total={rows.length} />
    </>
  );
}

// ───────────────────────── standings ─────────────────────────

function Arrow({ change }: { change: number | null }) {
  if (change === null) return <span className="hud-muted text-center text-[10px]">·</span>;
  if (change > 0) return <span className="hud-accent text-center font-mono text-[10.5px] font-semibold tabular-nums">▲{change}</span>;
  if (change < 0) return <span className="hud-danger text-center font-mono text-[10.5px] font-semibold tabular-nums">▼{Math.abs(change)}</span>;
  return <span className="hud-muted text-center font-mono text-[10.5px]">–</span>;
}

export function Standings({ rs }: { rs: ResultSet }) {
  const { pick } = usePick();
  const posI = ci(rs, "pos");
  const codeI = ci(rs, "code");
  const nameI = ci(rs, "name");
  const teamI = ci(rs, "team");
  const ptsI = ci(rs, "points");
  const chI = ci(rs, "change");
  const aheadI = ci(rs, "to_ahead");
  if (rs.rows.length === 0) return <Empty>0 rows returned. Filter to the last round only after the CTE layers.</Empty>;
  const shown = rs.rows.slice(0, 16);
  const max = Math.max(1, ...shown.map((r) => num(r, ptsI) ?? 0));
  return (
    <>
      <div className="mb-1 grid grid-cols-[1.6rem_2.1rem_2.6rem_minmax(0,1fr)_2.6rem] items-center gap-2 font-mono text-[9.5px] text-white/40 @lg:grid-cols-[1.6rem_2.1rem_2.6rem_minmax(0,1fr)_2.6rem_3.2rem]">
        <span className="text-right">pos</span>
        <span className="text-center">move</span>
        <span>driver</span>
        <span />
        <span className="text-right">pts</span>
        <span className="hidden text-right @lg:block">gap</span>
      </div>
      <ol className="space-y-px">
        {shown.map((row, i) => {
          const pos = num(row, posI);
          const prevPos = i > 0 ? num(shown[i - 1], posI) : null;
          const tied = pos !== null && (prevPos === pos || (i + 1 < shown.length && num(shown[i + 1], posI) === pos));
          const pts = num(row, ptsI);
          const ahead = num(row, aheadI);
          const code = str(row, codeI);
          return (
            <li
              key={i}
              className={`grid grid-cols-[1.6rem_2.1rem_2.6rem_minmax(0,1fr)_2.6rem] items-center gap-2 rounded border-t border-white/[0.05] px-0 py-[3px] first:border-t-0 @lg:grid-cols-[1.6rem_2.1rem_2.6rem_minmax(0,1fr)_2.6rem_3.2rem] ${pick && pick === code ? "bg-[#c5ee8a]/[0.09]" : ""}`}
            >
              <span className={`hud-value text-right text-[11px] tabular-nums ${i === 0 ? "hud-accent" : "hud-muted"}`} title={tied ? "Level on points: RANK gives them the same position" : undefined}>
                {tied ? "=" : ""}
                {pos ?? i + 1}
              </span>
              <Arrow change={chI >= 0 ? num(row, chI) : null} />
              <Code code={code || String(i + 1)} />
              <span className="flex min-w-0 flex-col gap-0.5 leading-tight">
                <span className="flex min-w-0 items-baseline gap-2 overflow-hidden whitespace-nowrap">
                  {nameI >= 0 && <span className="min-w-0 truncate text-[11px] text-white/85">{str(row, nameI)}</span>}
                  {teamI >= 0 && <span className="hud-muted hidden min-w-0 shrink-[2] truncate text-[10px] @md:inline">{str(row, teamI)}</span>}
                </span>
                <span className={`hud-bar h-[2px] ${i === 0 ? "" : "hud-bar-neutral"}`}>
                  <span style={{ width: `${pts === null ? 0 : (pts / max) * 100}%` }} />
                </span>
              </span>
              <span className={`hud-value text-right text-[11.5px] tabular-nums ${i === 0 ? "hud-accent" : ""}`}>{pts === null ? "–" : pts}</span>
              <span className="hud-value hud-muted hidden text-right text-[10px] tabular-nums @lg:block">{ahead === null ? "" : ahead === 0 ? "level" : `−${ahead}`}</span>
            </li>
          );
        })}
      </ol>
      <More shown={shown.length} total={rs.rows.length} />
    </>
  );
}

// ───────────────────────── final championship ─────────────────────────

function Podium({ rows }: { rows: { pos: number; code: string; points: number | null }[] }) {
  const top = rows.slice(0, 3);
  if (top.length === 0) return null;
  const slots = [top[1], top[0], top[2]];
  const heights = [34, 52, 24];
  return (
    <div className="mb-3 flex items-end justify-center gap-1.5" aria-label="Podium">
      {slots.map((d, i) =>
        d ? (
          <div key={d.code + i} className="flex w-[4.6rem] min-w-0 flex-col items-center">
            <Code code={d.code} className={`text-[12px] ${i === 1 ? "hud-accent" : ""}`} />
            <span className="hud-value hud-muted mb-0.5 text-[10px] tabular-nums">{d.points ?? "–"}</span>
            <div
              className={`flex w-full items-start justify-center rounded-t-md border border-b-0 pt-1 font-mono text-[11px] font-semibold ${i === 1 ? "border-[#c5ee8a]/50 bg-[#c5ee8a]/15 text-[#d3f3a4]" : "border-white/12 bg-white/[0.06] text-white/70"}`}
              style={{ height: heights[i] }}
            >
              P{d.pos}
            </div>
          </div>
        ) : (
          <div key={i} className="w-[4.6rem]" />
        ),
      )}
    </div>
  );
}

export function Championship({ rs, constructors }: { rs: ResultSet; constructors: ResultSet | null }) {
  const { pick } = usePick();
  const posI = ci(rs, "pos");
  const codeI = ci(rs, "code");
  const nameI = ci(rs, "name");
  const teamI = ci(rs, "team");
  const ptsI = ci(rs, "points");
  const winsI = ci(rs, "wins");
  const tieI = ci(rs, "tied_on_points");
  if (rs.rows.length === 0) return <Empty>0 rows returned.</Empty>;
  const shown = rs.rows.slice(0, 16);
  const podium = shown.slice(0, 3).map((r, i) => ({ pos: num(r, posI) ?? i + 1, code: str(r, codeI), points: num(r, ptsI) }));
  const tieCount = shown.filter((r) => (num(r, tieI) ?? 0) > 0).length;
  return (
    <div className="grid min-w-0 gap-x-6 gap-y-3 @3xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <div className="min-w-0">
        <Podium rows={podium} />
        <ol className="space-y-px">
          {shown.map((row, i) => {
            const tied = (num(row, tieI) ?? 0) > 0;
            const code = str(row, codeI);
            return (
              <li key={i} className={`grid grid-cols-[1.4rem_2.6rem_minmax(0,1fr)_2.4rem_1.8rem] items-center gap-2 rounded border-t border-white/[0.05] py-[3px] first:border-t-0 ${pick && pick === code ? "bg-[#c5ee8a]/[0.09]" : ""}`}>
                <span className={`hud-value text-right text-[11px] tabular-nums ${i === 0 ? "hud-accent" : "hud-muted"}`}>{num(row, posI) ?? i + 1}</span>
                <Code code={code || String(i + 1)} />
                <span className="flex min-w-0 items-baseline gap-2 overflow-hidden whitespace-nowrap">
                  {nameI >= 0 && <span className="min-w-0 truncate text-[11px] text-white/85">{str(row, nameI)}</span>}
                  {teamI >= 0 && <span className="hud-muted hidden min-w-0 shrink-[2] truncate text-[10px] @md:inline">{str(row, teamI)}</span>}
                  {tied && <span className="hud-tag h-4 shrink-0 border-[#fbbf24]/35 px-1.5 text-[9px] text-[#fbbf24]" title="Level on points: separated by wins, then 2nd and 3rd places">count-back</span>}
                </span>
                <span className={`hud-value text-right text-[11.5px] tabular-nums ${i === 0 ? "hud-accent" : ""}`}>{num(row, ptsI) ?? "–"}</span>
                <span className="hud-value hud-muted text-right text-[10px] tabular-nums" title="Wins">{winsI >= 0 ? `${num(row, winsI) ?? 0}W` : ""}</span>
              </li>
            );
          })}
        </ol>
        {tieCount > 0 && (
          <p className="mt-1.5 text-[10.5px] leading-snug text-white/55">
            {plural(tieCount, "driver")} level on points were separated by wins, then 2nd and 3rd places.
          </p>
        )}
        <More shown={shown.length} total={rs.rows.length} />
      </div>
      <div className="min-w-0">
        <p className="hud-label mb-1.5">Constructors</p>
        {constructors ? <Constructors rs={constructors} /> : <Empty>Add the constructors&apos; query (task 3).</Empty>}
      </div>
    </div>
  );
}

function Constructors({ rs }: { rs: ResultSet }) {
  const posI = ci(rs, "pos");
  const teamI = ci(rs, "team");
  const ptsI = ci(rs, "points");
  const winsI = ci(rs, "wins");
  if (rs.rows.length === 0) return <Empty>0 rows returned.</Empty>;
  const shown = rs.rows.slice(0, 12);
  const max = Math.max(1, ...shown.map((r) => num(r, ptsI) ?? 0));
  return (
    <ol className="space-y-1.5">
      {shown.map((row, i) => {
        const pts = num(row, ptsI);
        return (
          <li key={i} className="grid grid-cols-[1.2rem_minmax(0,1fr)_2.4rem] items-center gap-2">
            <span className={`hud-value text-right text-[11px] tabular-nums ${i === 0 ? "hud-accent" : "hud-muted"}`}>{num(row, posI) ?? i + 1}</span>
            <span className="min-w-0">
              <span className="block truncate text-[11px] text-white/85">
                {str(row, teamI)}
                {winsI >= 0 && <span className="hud-muted ml-1.5 text-[10px]">{num(row, winsI) ?? 0}W</span>}
              </span>
              <span className={`hud-bar mt-0.5 h-1 ${i === 0 ? "" : "hud-bar-neutral"}`}>
                <span style={{ width: `${pts === null ? 0 : (pts / max) * 100}%` }} />
              </span>
            </span>
            <span className={`hud-value text-right text-[11.5px] tabular-nums ${i === 0 ? "hud-accent" : ""}`}>{pts ?? "–"}</span>
          </li>
        );
      })}
    </ol>
  );
}

