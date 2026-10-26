"use client";

import React from "react";
import { Check, CircleAlert, TriangleAlert, X } from "lucide-react";
import { C, ci, displaySql, fmtInt, money, n, n0, objs, plural, s, shortDay, shortStamp, type Bundle, type ResultSet, type Row, type TableInfo, SEED_TABLES } from "./model";
import { DataGrid, Empty, Meter, More, Pill, Tile, type Tone } from "./ui";

/** Chapter 3 to 5 panels: pagination, statements, roll-ups, data quality, migrations and the close. */

// ───────────────────────── pages without N+1 ─────────────────────────

export function Pages({ b }: { b: Bundle }) {
  const list = objs(b.nplus1);
  const pages = b.pages.map((rs) => objs(rs));
  const seen = new Map<string, number>();
  let repeats = 0;
  for (const p of pages) for (const r of p) seen.set(s(r.entry_id), (seen.get(s(r.entry_id)) ?? 0) + 1);
  for (const c of seen.values()) if (c > 1) repeats += c - 1;
  return (
    <div className="space-y-3">
      {list.length > 0 && (
        <section>
          <div className="grid grid-cols-3 gap-2">
            <Tile label="Entries listed" value={fmtInt(list.length)} tone="accent" />
            <Tile label="Queries" value="1" tone="accent" sub={`not ${list.length + 1}`} />
            <Tile label="Lines counted" value={fmtInt(list.reduce((t, r) => t + n0(r.line_count), 0))} />
          </div>
          <ul className="mt-2 space-y-[3px]">
            {list.slice(0, 5).map((r, i) => (
              <li key={`${s(r.entry_id)}:${i}`} className="flex min-w-0 items-center gap-2 border-t border-white/[0.05] pt-[3px] text-[10.5px]">
                <span className="hud-value w-9 shrink-0 text-white/45">#{s(r.entry_id)}</span>
                <span className="min-w-0 flex-1 truncate text-white/85">{s(r.memo)}</span>
                <span className="hud-muted shrink-0">{plural(n0(r.line_count), "line")}</span>
                <span className="hud-value w-[4.6rem] shrink-0 text-right">{money(n0(r.total_cents))}</span>
              </li>
            ))}
          </ul>
          <More shown={Math.min(5, list.length)} total={list.length} />
        </section>
      )}
      {pages.length > 0 && (
        <section>
          <h4 className="hud-label mb-1.5 flex items-center gap-2">
            <span>Keyset pages</span>
            <span className="ml-auto normal-case tracking-normal" style={{ color: repeats === 0 ? C.limeText : C.red }}>
              {repeats === 0 ? "no row repeated" : `${plural(repeats, "row")} repeated`}
            </span>
          </h4>
          <div className="space-y-1.5">
            {pages.map((p, pi) => {
              const last = p[p.length - 1];
              return (
                <div key={pi}>
                  {pi > 0 && pages[pi - 1].length > 0 && (
                    <p className="hud-value flex items-center gap-1 py-0.5 pl-1 text-[9.5px] text-white/45">
                      ▸ cursor = ({shortStamp(s(pages[pi - 1][pages[pi - 1].length - 1].posted_at))}, {s(pages[pi - 1][pages[pi - 1].length - 1].entry_id)})
                    </p>
                  )}
                  <div className="rounded-md border border-white/[0.09] bg-black/20 p-1.5">
                    <div className="mb-1 flex items-baseline gap-2">
                      <span className="hud-value text-[11px]" style={{ color: C.limeText }}>
                        page {pi + 1}
                      </span>
                      <span className="hud-muted text-[10px]">{plural(p.length, "row")}</span>
                      {last && <span className="hud-value ml-auto truncate text-[9.5px] text-white/45">ends {shortStamp(s(last.posted_at))}</span>}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {p.map((r, i) => (
                        <span
                          key={`${s(r.entry_id)}:${i}`}
                          title={`${s(r.memo)} · ${s(r.posted_at)}`}
                          className="hud-value rounded px-1.5 py-[1px] text-[10px]"
                          style={i === p.length - 1 ? { background: "rgba(197,238,138,0.18)", color: C.limeText, outline: "1px solid rgba(197,238,138,0.5)" } : { background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.8)" }}
                        >
                          #{s(r.entry_id)}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

// ───────────────────────── statements & trends ─────────────────────────

function StepChart({ values, labelFirst, labelLast }: { values: number[]; labelFirst: string; labelLast: string }) {
  const H = 78;
  const width = 360;
  const min = Math.min(0, ...values);
  const max = Math.max(1, ...values);
  const x = (i: number) => 6 + (values.length <= 1 ? 0 : (i / (values.length - 1)) * (width - 12));
  const y = (v: number) => 8 + (1 - (v - min) / (max - min || 1)) * (H - 22);
  let d = "";
  values.forEach((v, i) => {
    d += i === 0 ? `M${x(i).toFixed(1)} ${y(v).toFixed(1)}` : ` H${x(i).toFixed(1)} V${y(v).toFixed(1)}`;
  });
  const area = values.length ? `${d} V${y(min)} H${x(0)} Z` : "";
  return (
    <div className="w-full max-w-[520px]">
      <svg viewBox={`0 0 ${width} ${H}`} className="block h-auto w-full" role="img" aria-label="Running balance">
        <path d={`M6 ${y(0)} H${width - 6}`} stroke="rgba(255,255,255,0.12)" strokeDasharray="3 4" />
        {area && <path d={area} fill={C.lime} opacity="0.1" />}
        {d && <path d={d} fill="none" stroke={C.lime} strokeWidth="1.8" strokeLinejoin="round" />}
        {values.length > 0 && <circle cx={x(values.length - 1)} cy={y(values[values.length - 1])} r="3.2" fill={C.lime} />}
        <text x="6" y={H - 3} fontSize="9" fill="rgba(255,255,255,0.4)" fontFamily="var(--font-mono)">
          {labelFirst}
        </text>
        <text x={width - 6} y={H - 3} fontSize="9" fill="rgba(255,255,255,0.4)" textAnchor="end" fontFamily="var(--font-mono)">
          {labelLast}
        </text>
      </svg>
    </div>
  );
}

export function Statements({ statement, mom }: { statement: ResultSet | null; mom: ResultSet | null }) {
  const rows = objs(statement);
  const months = objs(mom);
  const maxFee = Math.max(1, ...months.map((r) => Math.abs(n0(r.fees_cents))));
  return (
    <div className="space-y-3">
      {rows.length > 0 && (
        <section>
          <div className="mb-1.5 grid grid-cols-3 gap-2">
            <Tile label="Closing" value={money(n(rows[rows.length - 1].balance_cents))} tone="accent" />
            <Tile label="Money in" value={money(rows.reduce((t, r) => t + n0(r.credit_cents), 0), { compact: true })} />
            <Tile label="Money out" value={money(rows.reduce((t, r) => t + n0(r.debit_cents), 0), { compact: true })} />
          </div>
          <StepChart values={rows.map((r) => n0(r.balance_cents))} labelFirst={shortDay(s(rows[0].posted_at))} labelLast={shortDay(s(rows[rows.length - 1].posted_at))} />
          <ul className="mt-1.5 space-y-[3px]">
            {rows.slice(-4).map((r, i) => {
              const delta = n0(r.credit_cents) - n0(r.debit_cents);
              return (
                <li key={i} className="flex min-w-0 items-center gap-2 border-t border-white/[0.05] pt-[3px] text-[10.5px]">
                  <span className="hud-value w-10 shrink-0 text-white/45">{shortDay(s(r.posted_at))}</span>
                  <span className="min-w-0 flex-1 truncate text-white/85">{s(r.memo)}</span>
                  <span className="hud-value shrink-0" style={{ color: delta >= 0 ? C.limeText : "rgba(255,255,255,0.7)" }}>{money(delta, { sign: true })}</span>
                  <span className="hud-value w-[4.2rem] shrink-0 text-right">{money(n(r.balance_cents))}</span>
                </li>
              );
            })}
          </ul>
          {rows.length > 4 && <p className="hud-label mt-1 text-white/35">+{rows.length - 4} earlier lines</p>}
        </section>
      )}
      {months.length > 0 && (
        <section>
          <h4 className="hud-label mb-1.5">Fee revenue, month over month</h4>
          <ul className="space-y-2">
            {months.map((r, i) => {
              const pct = n(r.change_pct);
              return (
                <li key={`${s(r.month)}:${i}`}>
                  <div className="flex min-w-0 items-baseline gap-2 text-[11px]">
                    <span className="hud-value w-14 shrink-0 text-white/70">{s(r.month)}</span>
                    <span className="hud-value min-w-0 flex-1">{money(n(r.fees_cents))}</span>
                    {pct !== null ? <Pill tone={pct >= 0 ? "accent" : "warning"}>{pct >= 0 ? "▲" : "▼"} {Math.abs(pct).toFixed(1)}%</Pill> : <span className="hud-muted text-[10px]">first month</span>}
                  </div>
                  <Meter value={Math.abs(n0(r.fees_cents))} max={maxFee} className="mt-1" />
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}

// ───────────────────────── roll-ups & late data ─────────────────────────

function DailyChart({ rows }: { rows: Row[] }) {
  const H = 96;
  const width = 400;
  const maxA = Math.max(1, ...rows.map((r) => n0(r.attempts)));
  const slot = (width - 12) / Math.max(1, rows.length);
  const bw = Math.max(6, Math.min(28, slot * 0.58));
  const cx = (i: number) => 6 + slot * i + slot / 2;
  const yBar = (v: number) => H - 16 - (v / maxA) * (H - 40);
  // approval % mapped onto 80..100
  const yPct = (p: number) => 10 + (1 - (Math.max(80, Math.min(100, p)) - 80) / 20) * (H - 40);
  const line = rows.map((r, i) => `${i === 0 ? "M" : "L"}${cx(i).toFixed(1)} ${yPct(n0(r.approval_pct)).toFixed(1)}`).join(" ");
  return (
    <div className="w-full max-w-[520px]">
      <svg viewBox={`0 0 ${width} ${H}`} className="block h-auto w-full" role="img" aria-label="Daily attempts and approval rate">
        {rows.map((r, i) => (
          <g key={i}>
            <rect x={cx(i) - bw / 2} y={yBar(n0(r.attempts))} width={bw} height={H - 16 - yBar(n0(r.attempts))} rx="2" fill="#c8c8c8" opacity="0.28" />
            <text x={cx(i)} y={H - 4} textAnchor="middle" fontSize="8.5" fill="rgba(255,255,255,0.45)" fontFamily="var(--font-mono)">
              {shortDay(s(r.day))}
            </text>
          </g>
        ))}
        {line && <path d={line} fill="none" stroke={C.lime} strokeWidth="1.8" strokeLinejoin="round" />}
        {rows.map((r, i) => (
          <circle key={i} cx={cx(i)} cy={yPct(n0(r.approval_pct))} r="2.6" fill={C.lime} />
        ))}
      </svg>
    </div>
  );
}

export function Rollups({ b }: { b: Bundle }) {
  const stages = b.stages.map((rs) => objs(rs)[0]).filter((r): r is Row => !!r);
  const daily = objs(b.daily);
  const late = objs(b.late);
  const maxStage = Math.max(1, ...stages.map((r) => n0(r.attempts)));
  const lateByDay = new Map(late.map((r) => [s(r.day), r]));
  const worst = late.reduce<Row | null>((best, r) => (!best || n0(r.late_pct) > n0(best.late_pct) ? r : best), null);
  return (
    <div className="space-y-3">
      {stages.length > 0 && (
        <section>
          <h4 className="hud-label mb-1.5">Hourly roll-up, run by run</h4>
          <ul className="space-y-1.5">
            {stages.map((r, i) => (
              <li key={`${s(r.stage)}:${i}`}>
                <div className="flex min-w-0 items-baseline gap-2 text-[11px]">
                  <span className="min-w-0 flex-1 truncate text-white/85">{s(r.stage)}</span>
                  <span className="hud-muted text-[10px]">{plural(n0(r.hours), "hour")}</span>
                  <span className="hud-value">{fmtInt(n0(r.attempts))} attempts</span>
                </div>
                <Meter value={n0(r.attempts)} max={maxStage} className="mt-0.5" tone={i === stages.length - 1 ? "accent" : "plain"} />
              </li>
            ))}
          </ul>
          {stages.length > 1 && n0(stages[stages.length - 1].attempts) > n0(stages[0].attempts) && (
            <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-white/75">
              <Check className="h-3.5 w-3.5 text-[#c5ee8a]" aria-hidden />
              The next run healed <span className="hud-value" style={{ color: C.limeText }}>{fmtInt(n0(stages[stages.length - 1].attempts) - n0(stages[0].attempts))}</span> late-arriving attempts.
            </p>
          )}
        </section>
      )}
      {daily.length > 0 && (
        <section>
          <h4 className="hud-label mb-1 flex items-center gap-2">
            <span>Daily attempts · approval rate</span>
            <span className="ml-auto flex items-center gap-2 normal-case tracking-normal">
              <span className="inline-flex items-center gap-1"><span className="h-1.5 w-2.5 rounded-sm bg-[#c8c8c8]/40" />attempts</span>
              <span className="inline-flex items-center gap-1"><span className="h-0.5 w-2.5" style={{ background: C.lime }} />approval</span>
            </span>
          </h4>
          <DailyChart rows={daily} />
          <ul className="mt-1 grid grid-cols-[repeat(auto-fit,minmax(5.6rem,1fr))] gap-1.5">
            {daily.map((r, i) => {
              const l = lateByDay.get(s(r.day));
              return (
                <li key={`${s(r.day)}:${i}`} className="rounded-md border border-white/[0.07] bg-white/[0.03] px-1.5 py-1 text-[10px]">
                  <div className="flex items-baseline justify-between gap-1">
                    <span className="hud-value text-white/50">{shortDay(s(r.day))}</span>
                    <span className="hud-value" style={{ color: C.limeText }}>{n0(r.approval_pct).toFixed(1)}%</span>
                  </div>
                  <div className="hud-muted truncate">{money(n(r.ok_cents), { compact: true })} · {n0(r.avg_latency_ms)}ms</div>
                  {l && <div className="mt-0.5 truncate" style={{ color: n0(l.late_pct) >= 8 ? C.amber : "rgba(255,255,255,0.5)" }}>{n0(l.late_events)} late · {n0(l.late_pct).toFixed(1)}%</div>}
                </li>
              );
            })}
          </ul>
        </section>
      )}
      {daily.length === 0 && late.length > 0 && (
        <section>
          <h4 className="hud-label mb-1.5">Late arrivals per day</h4>
          <ul className="space-y-1">
            {late.map((r, i) => (
              <li key={i} className="flex items-center gap-2 text-[11px]">
                <span className="hud-value w-12 text-white/50">{shortDay(s(r.day))}</span>
                <Meter value={n0(r.late_pct)} max={12} tone="warning" className="flex-1" />
                <span className="hud-value w-12 text-right">{n0(r.late_pct).toFixed(1)}%</span>
              </li>
            ))}
          </ul>
        </section>
      )}
      {worst && daily.length > 0 && <p className="hud-muted text-[10px]">Worst late-data day: {shortDay(s(worst.day))} at {n0(worst.late_pct).toFixed(1)}% of events.</p>}
    </div>
  );
}

// ───────────────────────── data quality ─────────────────────────

const RECON: { status: string; label: string; tone: Tone }[] = [
  { status: "matched", label: "matched", tone: "accent" },
  { status: "amount_mismatch", label: "amount differs", tone: "warning" },
  { status: "duplicate_settlement", label: "settled twice", tone: "warning" },
  { status: "not_settled_yet", label: "not settled yet", tone: "steel" },
  { status: "unknown_to_ledger", label: "unknown to ledger", tone: "danger" },
];

export function Quality({ checks, recon }: { checks: ResultSet | null; recon: ResultSet | null }) {
  const cs = objs(checks);
  const rs = objs(recon);
  const counts = new Map<string, number>();
  for (const r of rs) counts.set(s(r.status), (counts.get(s(r.status)) ?? 0) + 1);
  const exceptions = rs.filter((r) => s(r.status) !== "matched");
  const failing = cs.filter((c) => n0(c.violations) > 0);
  return (
    <div className="grid grid-cols-1 gap-3 @xl:grid-cols-2">
      {cs.length > 0 && (
        <section className="min-w-0">
          <h4 className="hud-label mb-1.5 flex items-center gap-2">
            <span>Invariant checks</span>
            <span className="ml-auto normal-case tracking-normal" style={{ color: failing.length ? C.amber : C.limeText }}>
              {cs.length - failing.length}/{cs.length} clean
            </span>
          </h4>
          <ul className="space-y-1">
            {cs.slice(0, 12).map((c, i) => {
              const v = n0(c.violations);
              const sev = s(c.severity).toLowerCase();
              const bad = v > 0;
              const color = !bad ? C.lime : sev === "error" ? C.red : C.amber;
              return (
                <li key={`${s(c.check_name)}:${i}`} className="flex min-w-0 items-center gap-2 rounded-md border border-white/[0.07] bg-white/[0.03] px-2 py-1" style={bad ? { borderColor: `${color}55`, background: `${color}12` } : undefined}>
                  {!bad ? <Check className="h-3 w-3 shrink-0" style={{ color }} aria-hidden /> : sev === "error" ? <X className="h-3 w-3 shrink-0" style={{ color }} aria-hidden /> : <TriangleAlert className="h-3 w-3 shrink-0" style={{ color }} aria-hidden />}
                  <span className="min-w-0 flex-1 text-[10.5px] leading-snug text-white/85">{s(c.check_name)}</span>
                  <span className="hud-value shrink-0 text-[11px]" style={{ color }}>{v}</span>
                </li>
              );
            })}
          </ul>
          <More shown={Math.min(12, cs.length)} total={cs.length} />
        </section>
      )}
      {rs.length > 0 && (
        <section className="min-w-0">
          <h4 className="hud-label mb-1.5">Ledger vs processor · {plural(rs.length, "reference")}</h4>
          <div className="flex flex-wrap gap-1.5">
            {RECON.map((k) => (
              <span key={k.status} className="inline-flex items-center gap-1.5 rounded-md border border-white/[0.08] bg-white/[0.03] px-1.5 py-1">
                <Pill tone={k.tone} solid={k.status === "matched"}>{counts.get(k.status) ?? 0}</Pill>
                <span className="text-[10px] text-white/65">{k.label}</span>
              </span>
            ))}
          </div>
          {exceptions.length > 0 && (
            <ul className="mt-2 space-y-[3px]">
              {exceptions.slice(0, 7).map((r, i) => {
                const k = RECON.find((x) => x.status === s(r.status));
                return (
                  <li key={`${s(r.processor_ref)}:${i}`} className="flex min-w-0 items-center gap-2 border-t border-white/[0.05] pt-[3px] text-[10.5px]">
                    <span className="hud-value w-[4.4rem] shrink-0 text-white/70">{s(r.processor_ref)}</span>
                    <span className="hud-value min-w-0 flex-1 truncate text-white/80">
                      {n(r.ledger_cents) !== null ? money(n(r.ledger_cents)) : "—"} <span className="text-white/35">vs</span> {n(r.settled_cents) !== null ? money(n(r.settled_cents)) : "—"}
                    </span>
                    <Pill tone={k?.tone ?? "plain"}>{k?.label ?? s(r.status)}</Pill>
                  </li>
                );
              })}
            </ul>
          )}
          <More shown={Math.min(7, exceptions.length)} total={exceptions.length} />
        </section>
      )}
    </div>
  );
}

// ───────────────────────── safe migrations ─────────────────────────

const PHASE: Record<string, { tone: Tone; step: number }> = { expand: { tone: "steel", step: 1 }, backfill: { tone: "warning", step: 2 }, contract: { tone: "accent", step: 3 } };

export function Migrations({ migrations, progress }: { migrations: ResultSet | null; progress: ResultSet | null }) {
  const rows = objs(migrations);
  const p = objs(progress)[0];
  const remaining = p ? n0(p.remaining) : null;
  const done = p ? n0(p.backfilled) : null;
  const shown = rows.slice(-7);
  const reached = new Set(rows.map((r) => s(r.phase)));
  return (
    <div>
      <div className="mb-2 flex items-center gap-1">
        {["expand", "backfill", "contract"].map((ph, i) => {
          const on = reached.has(ph) && rows.some((r) => s(r.phase) === ph && n0(r.version) > 5);
          return (
            <React.Fragment key={ph}>
              {i > 0 && <span className="h-px flex-1 bg-white/15" />}
              <Pill tone={on ? PHASE[ph].tone : "plain"} solid={on && ph === "contract"}>{ph}</Pill>
            </React.Fragment>
          );
        })}
      </div>
      {p && done !== null && remaining !== null && (
        <div className="mb-2.5 rounded-md border border-white/[0.08] bg-white/[0.03] px-2 py-1.5">
          <div className="flex items-baseline justify-between gap-2 text-[11px]">
            <span className="hud-label">Backfill</span>
            <span className="hud-value" style={{ color: remaining === 0 ? C.limeText : C.amber }}>
              {remaining === 0 ? "complete" : `${fmtInt(remaining)} rows left`}
            </span>
          </div>
          <Meter value={done} max={done + remaining} tone={remaining === 0 ? "accent" : "warning"} className="mt-1" />
          <p className="hud-muted mt-1 text-[10px]">{fmtInt(done)} rows rewritten in batches</p>
        </div>
      )}
      <ol className="space-y-1.5">
        {shown.map((r, i) => {
          const ph = PHASE[s(r.phase)] ?? { tone: "plain" as Tone, step: 0 };
          return (
            <li key={`${s(r.version)}:${i}`} className="flex min-w-0 items-start gap-2">
              <span className="hud-value mt-px w-6 shrink-0 text-[10.5px] text-white/50">v{s(r.version)}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[11px] leading-snug text-white/85" title={s(r.name)}>{s(r.name)}</span>
                {s(r.applied_at) && <span className="hud-value block text-[9.5px] text-white/35">{shortStamp(s(r.applied_at))}</span>}
              </span>
              <Pill tone={ph.tone}>{s(r.phase) || "?"}</Pill>
            </li>
          );
        })}
      </ol>
      {rows.length > shown.length && <p className="hud-label mt-1.5 text-white/35">+{rows.length - shown.length} earlier</p>}
      {rows.length === 0 && !p && <Empty>No migrations recorded yet.</Empty>}
    </div>
  );
}

// ───────────────────────── month-end close ─────────────────────────

export function CloseBooks({ rs }: { rs: ResultSet }) {
  const rows = objs(rs);
  const okRows = rows.filter((r) => n0(r.ok) === 1 || (n(r.expected_cents) !== null && n(r.expected_cents) === n(r.actual_cents)));
  const all = rows.length > 0 && okRows.length === rows.length;
  return (
    <div>
      <div className="flex items-center gap-3">
        <div
          className={`${all ? "ch-stamp" : ""} shrink-0 rounded-md border-2 px-2.5 py-1.5 text-center`}
          style={{ borderColor: all ? C.lime : "rgba(251,191,36,0.6)", color: all ? C.limeText : C.amber, transform: "rotate(-4deg)", boxShadow: all ? "0 0 18px rgba(197,238,138,0.18)" : "none" }}
        >
          <div className="hud-value text-[13px] font-bold leading-none tracking-[0.12em]">{all ? "BOOKS" : "NOT YET"}</div>
          <div className="hud-value mt-0.5 text-[13px] font-bold leading-none tracking-[0.12em]">{all ? "BALANCE" : "PROVEN"}</div>
        </div>
        <p className="min-w-0 flex-1 text-[11px] leading-snug text-white/75">
          {all ? (
            <>All <span className="hud-value" style={{ color: C.limeText }}>{rows.length}</span> proofs agree to the cent. February is closed.</>
          ) : (
            <>
              <span className="hud-value" style={{ color: C.amber }}>{okRows.length}/{rows.length}</span> proofs agree. Find the difference before closing.
            </>
          )}
        </p>
      </div>
      <ul className="mt-2.5 space-y-1">
        {rows.slice(0, 10).map((r, i) => {
          const ok = okRows.includes(r);
          return (
            <li key={`${s(r.proof)}:${i}`} className="min-w-0 rounded-md border border-white/[0.07] bg-white/[0.03] px-2 py-1" style={ok ? undefined : { borderColor: "rgba(248,113,113,0.45)", background: "rgba(248,113,113,0.08)" }}>
              <div className="flex items-center gap-2">
                {ok ? <Check className="h-3 w-3 shrink-0 text-[#c5ee8a]" aria-hidden /> : <CircleAlert className="h-3 w-3 shrink-0 text-[#f87171]" aria-hidden />}
                <span className="min-w-0 flex-1 text-[10.5px] leading-snug text-white/85">{s(r.proof)}</span>
              </div>
              <div className="hud-value mt-0.5 flex gap-3 pl-5 text-[10px] text-white/55">
                <span>expected {money(n(r.expected_cents))}</span>
                <span style={{ color: ok ? C.limeText : C.red }}>actual {money(n(r.actual_cents))}</span>
              </div>
            </li>
          );
        })}
      </ul>
      <More shown={Math.min(10, rows.length)} total={rows.length} />
    </div>
  );
}

// ───────────────────────── console and schema ─────────────────────────

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
          <DataGrid rs={rs} maxRows={isPlan ? 8 : 8} interactive={interactive} />
        </>
      ) : (
        <Empty>No result sets yet. Run a SELECT to see its rows here.</Empty>
      )}
      {(writes.length > 0 || count > 1) && (
        <div className="hud-log mt-2 border-t border-white/[0.06] pt-1.5 text-[10.5px]">
          {writes.map((l, i) => (
            <div key={`${i}:${l}`} className="hud-log-line truncate">
              {l.trim().replace(/^(CREATE|DROP|ALTER|PRAGMA|EXPLAIN|BEGIN|COMMIT|ROLLBACK)(.*?) · \d+ rows? changed$/, "$1$2")}
            </div>
          ))}
          {count > 1 && <div className="hud-log-line hud-muted truncate">{plural(count, "result set")} in query.sql</div>}
        </div>
      )}
    </>
  );
}

export function Schema({ tables }: { tables: TableInfo[] }) {
  if (tables.length === 0) return <Empty>No tables found.</Empty>;
  return (
    <ul className="max-h-[21rem] space-y-2 overflow-y-auto overscroll-contain pr-1">
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
