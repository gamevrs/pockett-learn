"use client";

import React from "react";
import { Check, ShieldAlert, ShieldCheck } from "lucide-react";
import { C, fmtInt, money, n, n0, objs, plural, s, type Bundle, type ResultSet } from "./model";
import { Empty, Meter, More, Pill, Tile, type Tone } from "./ui";

/** Chapter 1 and 2 panels: the books, the guards, money and the retry-proof paths. */

// ───────────────────────── trial balance ─────────────────────────

export function BalanceBeam({ debits, credits }: { debits: number; credits: number }) {
  const balanced = debits === credits && debits > 0;
  const top = Math.max(debits, credits, 1);
  const tilt = ((debits - credits) / top) * 14; // degrees, positive lowers the debit (left) side
  const a = (tilt * Math.PI) / 180;
  const half = 92;
  const px = 130;
  const py = 22;
  const lx = px - half * Math.cos(a);
  const ly = py + half * Math.sin(a);
  const rx = px + half * Math.cos(a);
  const ry = py - half * Math.sin(a);
  const color = balanced ? C.lime : C.amber;
  const pan = (x: number, y: number, fill: string, label: string) => (
    <g>
      <path d={`M${x} ${y} L${x - 22} ${y + 26} M${x} ${y} L${x + 22} ${y + 26}`} stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
      <path d={`M${x - 26} ${y + 26} H${x + 26} c0 9 -11 13 -26 13 s-26 -4 -26 -13 Z`} fill="#181818" stroke={fill} strokeOpacity={0.7} />
      <text x={x} y={y + 54} textAnchor="middle" fontSize="8.5" fill="rgba(255,255,255,0.5)" fontFamily="var(--font-mono)" letterSpacing="0.06em">
        {label}
      </text>
    </g>
  );
  return (
    <svg viewBox="0 0 260 112" className="block h-[104px] w-full max-w-[260px] shrink-0" role="img" aria-label={balanced ? "Debits equal credits" : "Debits and credits differ"}>
      {balanced && <circle cx={px} cy={py} r="30" fill={C.lime} opacity="0.1" />}
      <path d={`M${px} ${py} V96 M${px - 18} 98 H${px + 18}`} stroke="rgba(255,255,255,0.25)" strokeWidth="3" strokeLinecap="round" />
      <path d={`M${lx} ${ly} L${rx} ${ry}`} stroke={color} strokeWidth="3.5" strokeLinecap="round" />
      <circle cx={px} cy={py} r="5" fill="#121212" stroke={color} strokeWidth="2.5" />
      {pan(lx, ly, C.lime, "DEBITS")}
      {pan(rx, ry, "#c8c8c8", "CREDITS")}
    </svg>
  );
}

export function Trial({ rs, beam, interactive }: { rs: ResultSet | null; beam: ResultSet | null; interactive: boolean }) {
  const rows = objs(rs);
  const beamRow = objs(beam)[0];
  const sumD = rows.reduce((t, r) => t + n0(r.debit_cents), 0);
  const sumC = rows.reduce((t, r) => t + n0(r.credit_cents), 0);
  const debits = beamRow ? n0(beamRow.total_debits) : sumD;
  const credits = beamRow ? n0(beamRow.total_credits) : sumC;
  const balanced = beamRow && n(beamRow.balanced) !== null ? n(beamRow.balanced) === 1 && debits === credits : debits === credits && debits > 0;
  const max = Math.max(1, ...rows.map((r) => Math.max(n0(r.debit_cents), n0(r.credit_cents))));
  const shown = rows.slice(0, interactive ? 20 : 8);
  return (
    <div>
      <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2">
        <BalanceBeam debits={debits} credits={credits} />
        <div className="min-w-[10rem] flex-1 space-y-1.5">
          <div className={`ch-glow inline-flex items-center gap-1.5 rounded-md border px-2 py-1 ${balanced ? "border-[#c5ee8a]/50 bg-[#c5ee8a]/10" : "border-[#fbbf24]/50 bg-[#fbbf24]/10"}`} style={balanced ? undefined : { animation: "none" }}>
            {balanced ? <Check className="h-3.5 w-3.5 text-[#c5ee8a]" aria-hidden /> : <ShieldAlert className="h-3.5 w-3.5 text-[#fbbf24]" aria-hidden />}
            <span className="hud-value text-[12px] font-semibold tracking-wide" style={{ color: balanced ? C.limeText : C.amber }}>
              {balanced ? "BALANCED" : debits === 0 && credits === 0 ? "NOTHING POSTED" : `OUT OF BALANCE ${money(debits - credits, { sign: true })}`}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Tile label="Total debits" value={money(debits)} tone="accent" />
            <Tile label="Total credits" value={money(credits)} />
          </div>
        </div>
      </div>
      {rows.length > 0 && (
        <div className="mt-3">
          <div className="hud-label mb-1 grid grid-cols-[2.6rem_minmax(0,1fr)_minmax(0,1.2fr)_4.6rem] gap-2 !text-[9.5px]">
            <span>Code</span>
            <span>Account</span>
            <span className="flex justify-between">
              <span>← debit</span>
              <span>credit →</span>
            </span>
            <span className="text-right">Balance</span>
          </div>
          <ul className="space-y-[3px]">
            {shown.map((r, i) => {
              const d = n0(r.debit_cents);
              const c = n0(r.credit_cents);
              return (
                <li key={`${s(r.code)}:${i}`} className="grid grid-cols-[2.6rem_minmax(0,1fr)_minmax(0,1.2fr)_4.6rem] items-center gap-2 border-t border-white/[0.05] pt-[3px]">
                  <span className="hud-value text-[10.5px] text-white/50">{s(r.code)}</span>
                  <span className="truncate text-[11px] text-white/85" title={s(r.account)}>
                    {s(r.account)}
                  </span>
                  <span className="grid grid-cols-2 items-center gap-px" title={`debit ${money(d)} · credit ${money(c)}`}>
                    <span className="flex justify-end">
                      <span className="h-[7px] rounded-l-sm" style={{ width: `${(d / max) * 100}%`, minWidth: d > 0 ? 2 : 0, background: C.lime }} />
                    </span>
                    <span className="flex justify-start">
                      <span className="h-[7px] rounded-r-sm bg-[#c8c8c8]/70" style={{ width: `${(c / max) * 100}%`, minWidth: c > 0 ? 2 : 0 }} />
                    </span>
                  </span>
                  <span className="hud-value text-right text-[10.5px]" style={{ color: n(r.balance_cents) !== null && n0(r.balance_cents) < 0 ? C.red : "#f4f4f4" }}>
                    {n(r.balance_cents) !== null ? money(n0(r.balance_cents)) : money(d - c)}
                  </span>
                </li>
              );
            })}
          </ul>
          <More shown={shown.length} total={rows.length} />
        </div>
      )}
    </div>
  );
}

// ───────────────────────── posting run ─────────────────────────

export function Posting({ rs }: { rs: ResultSet }) {
  const rows = objs(rs);
  const max = Math.max(1, ...rows.map((r) => n0(r.total_cents)));
  const entries = rows.reduce((t, r) => t + n0(r.entries), 0);
  const lines = rows.reduce((t, r) => t + n0(r.lines), 0);
  const moved = rows.reduce((t, r) => t + n0(r.total_cents), 0);
  return (
    <div>
      <div className="grid grid-cols-3 gap-2">
        <Tile label="Entries posted" value={fmtInt(entries)} tone="accent" />
        <Tile label="Lines" value={fmtInt(lines)} />
        <Tile label="Debits moved" value={money(moved, { compact: true })} />
      </div>
      <ul className="mt-2.5 space-y-1.5">
        {rows.slice(0, 8).map((r, i) => (
          <li key={`${s(r.source)}:${i}`} className="min-w-0">
            <div className="flex min-w-0 items-baseline gap-2">
              <span className="hud-value w-14 shrink-0 truncate text-[11px] text-white/90">{s(r.source) || "—"}</span>
              <span className="hud-muted min-w-0 flex-1 truncate text-[10.5px]">
                {n0(r.entries) === 1 ? "1 entry" : `${n0(r.entries)} entries`} · {plural(n0(r.lines), "line")}
              </span>
              <span className="hud-value shrink-0 text-[10.5px]">{money(n0(r.total_cents))}</span>
            </div>
            <Meter value={n0(r.total_cents)} max={max} className="mt-1" />
          </li>
        ))}
      </ul>
      <More shown={Math.min(8, rows.length)} total={rows.length} />
    </div>
  );
}

// ───────────────────────── invariant guards ─────────────────────────

export function Guards({ rs }: { rs: ResultSet }) {
  const rows = objs(rs);
  const broken = rows.filter((r) => n0(r.violations) > 0).length;
  return (
    <div>
      <p className="hud-label mb-2 flex items-center gap-1.5">
        <span className="hud-value text-[12px]" style={{ color: broken === 0 ? C.limeText : C.red }}>
          {rows.length - broken}/{rows.length}
        </span>
        guards holding
      </p>
      <ul className="space-y-1.5">
        {rows.slice(0, 10).map((r, i) => {
          const v = n0(r.violations);
          const ok = v === 0;
          return (
            <li key={`${s(r.rule)}:${i}`} className={`flex min-w-0 items-center gap-2 rounded-md border px-2 py-1.5 ${ok ? "border-white/[0.08] bg-white/[0.03]" : "border-[#f87171]/40 bg-[#f87171]/10"}`}>
              {ok ? <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-[#c5ee8a]" aria-hidden /> : <ShieldAlert className="h-3.5 w-3.5 shrink-0 text-[#f87171]" aria-hidden />}
              <span className="min-w-0 flex-1 text-[11px] leading-snug text-white/85">{s(r.rule)}</span>
              <span className="hud-value shrink-0 text-[11px]" style={{ color: ok ? C.limeText : C.red }}>
                {ok ? "0" : v}
              </span>
            </li>
          );
        })}
      </ul>
      <More shown={Math.min(10, rows.length)} total={rows.length} />
    </div>
  );
}

// ───────────────────────── money desk ─────────────────────────

export function MoneyDesk({ b }: { b: Bundle }) {
  const audit = objs(b.feeAudit);
  const short = objs(b.shortfall)[0];
  const split = objs(b.split);
  const shown = objs(b.display);
  const splitMax = Math.max(1, ...split.map((r) => n0(r.share_cents)));
  const splitSum = split.reduce((t, r) => t + n0(r.share_cents), 0);
  const wrong = short ? n0(short.orders_wrong) : audit.length;
  const shortfall = short ? n0(short.shortfall_cents) : audit.reduce((t, r) => t + (n0(r.correct_fee_cents) - n0(r.stored_fee_cents)), 0);
  return (
    <div className="space-y-3">
      {(b.feeAudit || b.shortfall) && (
        <section>
          <h4 className="hud-label mb-1.5">Fee audit · stored vs 5% rounded half up</h4>
          <div className="grid grid-cols-2 gap-2">
            <Tile label="Orders off" value={fmtInt(wrong)} tone={wrong > 0 ? "warning" : "accent"} />
            <Tile label="Under-charged" value={money(shortfall)} tone={shortfall > 0 ? "warning" : "accent"} sub={wrong > 0 ? "across those orders" : "all fees agree"} />
          </div>
          {audit.length > 0 && (
            <ul className="mt-2 grid grid-cols-1 gap-x-3 gap-y-[3px] @sm:grid-cols-2">
              {audit.slice(0, 6).map((r, i) => {
                const diff = n0(r.correct_fee_cents) - n0(r.stored_fee_cents);
                return (
                  <li key={`${s(r.order_id)}:${i}`} className="flex min-w-0 items-center gap-1.5 border-t border-white/[0.05] pt-[3px] text-[10.5px]">
                    <span className="hud-value text-white/50">#{s(r.order_id)}</span>
                    <span className="hud-value min-w-0 flex-1 truncate text-white/80">
                      {money(n0(r.stored_fee_cents))} → {money(n0(r.correct_fee_cents))}
                    </span>
                    <Pill tone={diff === 0 ? "accent" : "warning"}>{diff === 0 ? "ok" : `${diff > 0 ? "−" : "+"}${Math.abs(diff)}¢`}</Pill>
                  </li>
                );
              })}
            </ul>
          )}
          <More shown={Math.min(6, audit.length)} total={audit.length} />
        </section>
      )}
      {split.length > 0 && (
        <section>
          <h4 className="hud-label mb-1.5 flex items-center gap-2">
            <span>Fair split</span>
            <span className="hud-value ml-auto text-[10.5px] normal-case tracking-normal text-white/70">shares add up to {money(splitSum)}</span>
          </h4>
          <ul className="space-y-1.5">
            {split.slice(0, 8).map((r, i) => (
              <li key={`${s(r.seller)}:${i}`}>
                <div className="flex min-w-0 items-baseline gap-2 text-[11px]">
                  <span className="min-w-0 flex-1 truncate text-white/85">{s(r.seller)}</span>
                  {n(r.weight_cents) !== null && <span className="hud-muted shrink-0 text-[10px]">sold {money(n0(r.weight_cents))}</span>}
                  <span className="hud-value shrink-0 text-[11px]">{money(n0(r.share_cents))}</span>
                </div>
                <Meter value={n0(r.share_cents)} max={splitMax} className="mt-0.5" />
              </li>
            ))}
          </ul>
        </section>
      )}
      {shown.length > 0 && (
        <section>
          <h4 className="hud-label mb-1.5">Shown per currency</h4>
          <ul className="grid grid-cols-2 gap-1.5 @sm:grid-cols-3">
            {shown.slice(0, 9).map((r, i) => (
              <li key={`${s(r.currency)}:${s(r.amount_cents)}:${i}`} className="min-w-0 rounded-md border border-white/[0.08] bg-white/[0.03] px-2 py-1">
                <div className="flex items-baseline justify-between gap-1">
                  <span className="hud-label !text-[9.5px]">{s(r.currency)}</span>
                  <span className="hud-muted text-[9.5px]">{s(r.amount_cents)}¢</span>
                </div>
                <div className="hud-value truncate text-[13px]" style={{ color: C.limeText }}>
                  {s(r.display) || "—"}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

// ───────────────────────── idempotency desk ─────────────────────────

const OUTCOME: Record<string, { tone: Tone; label: string }> = {
  executed: { tone: "accent", label: "executed" },
  replayed: { tone: "steel", label: "replayed" },
  conflict: { tone: "warning", label: "conflict" },
};

export function IdemDesk({ stream, summary, interactive }: { stream: ResultSet | null; summary: ResultSet | null; interactive: boolean }) {
  const reqs = objs(stream);
  const sum = new Map(objs(summary).map((r) => [s(r.outcome), r]));
  const groups = new Map<string, typeof reqs>();
  for (const r of reqs) groups.set(s(r.idem_key), [...(groups.get(s(r.idem_key)) ?? []), r]);
  const count = (o: string) => (sum.get(o) ? n0(sum.get(o)!.requests) : reqs.filter((r) => s(r.outcome) === o).length);
  const cents = (o: string) => (sum.get(o) ? n0(sum.get(o)!.cents) : reqs.filter((r) => s(r.outcome) === o).reduce((t, r) => t + n0(r.amount_cents), 0));
  const keys = [...groups.entries()].slice(0, interactive ? 16 : 8);
  return (
    <div>
      <div className="grid grid-cols-3 gap-2">
        <Tile label="Executed once" value={fmtInt(count("executed"))} tone="accent" sub={money(cents("executed"), { compact: true })} />
        <Tile label="Replayed" value={fmtInt(count("replayed"))} tone="steel" sub="caught, not paid" />
        <Tile label="Conflicts" value={fmtInt(count("conflict"))} tone={count("conflict") > 0 ? "warning" : "plain"} sub="key reused, body differs" />
      </div>
      {cents("replayed") > 0 && (
        <p className="mt-2 flex items-center gap-1.5 rounded-md border border-[#8fb8d4]/30 bg-[#8fb8d4]/[0.07] px-2 py-1 text-[11px] text-white/80">
          <ShieldCheck className="h-3.5 w-3.5 shrink-0" style={{ color: C.steel }} aria-hidden />
          <span>
            Duplicate payouts prevented: <span className="hud-value font-semibold" style={{ color: C.steel }}>{money(cents("replayed"))}</span>
          </span>
        </p>
      )}
      {keys.length > 0 && (
        <ul className="mt-2.5 space-y-[3px]">
          {keys.map(([key, list]) => (
            <li key={key} className="flex min-w-0 items-center gap-2 border-t border-white/[0.05] pt-[3px]">
              <span className="hud-value w-[5.6rem] shrink-0 truncate text-[10.5px] text-white/60" title={key}>
                {key}
              </span>
              <span className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
                {list.map((r, i) => {
                  const o = OUTCOME[s(r.outcome)] ?? { tone: "plain" as Tone, label: s(r.outcome) };
                  return (
                    <Pill key={`${s(r.req_id)}:${i}`} tone={o.tone} solid={o.tone === "accent"} title={`request ${s(r.req_id)} · ${o.label}`}>
                      {o.tone === "steel" ? "caught" : o.tone === "warning" ? "409" : "paid"}
                    </Pill>
                  );
                })}
              </span>
              <span className="hud-value shrink-0 text-[10.5px] text-white/80">{money(n0(list[0]?.amount_cents))}</span>
            </li>
          ))}
        </ul>
      )}
      <More shown={keys.length} total={groups.size} />
      {reqs.length === 0 && !summary && <Empty>Return req_id, idem_key and outcome for every request.</Empty>}
    </div>
  );
}

// ───────────────────────── outbox relay ─────────────────────────

const STATUS_TONE: Record<string, Tone> = { pending: "warning", claimed: "steel", sent: "accent" };

function RelayTrack({ status, index }: { status: string; index: number }) {
  if (status === "sent") {
    return (
      <span className="relative block h-3 w-[58px] shrink-0 overflow-hidden" aria-hidden>
        <span className="absolute inset-x-0 top-1/2 h-px bg-[#c5ee8a]/25" />
        {[0, 1, 2].map((k) => (
          <span key={k} className="ch-relay absolute left-0 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-[#c5ee8a]" style={{ "--i": k + (index % 3) * 0.4, "--ch-dx": "50px" } as React.CSSProperties} />
        ))}
      </span>
    );
  }
  return (
    <span className="relative block h-3 w-[58px] shrink-0" aria-hidden>
      <span className="absolute inset-x-0 top-1/2 h-px border-t border-dashed border-white/15" />
      <span className="absolute left-0 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full border" style={{ borderColor: status === "claimed" ? C.steel : C.amber }} />
    </span>
  );
}

export function OutboxRelay({ rs, claim }: { rs: ResultSet; claim: ResultSet | null }) {
  const rows = objs(rs);
  const by = (st: string) => rows.filter((r) => s(r.status) === st).length;
  const shown = rows.length > 10 ? rows.slice(-10) : rows;
  return (
    <div>
      <div className="grid grid-cols-3 gap-2">
        <Tile label="Pending" value={by("pending")} tone={by("pending") > 0 ? "warning" : "plain"} />
        <Tile label="Claimed" value={by("claimed")} tone={by("claimed") > 0 ? "steel" : "plain"} />
        <Tile label="Sent" value={by("sent")} tone="accent" />
      </div>
      {claim && claim.rows.length > 0 && (
        <p className="hud-muted mt-1.5 text-[10.5px]">
          Last claim: {plural(claim.rows.length, "event")} by <span className="hud-value text-white/80">{s(objs(claim)[0]?.claimed_by)}</span>
        </p>
      )}
      <ul className="mt-2.5 space-y-[3px]">
        {shown.map((r, i) => {
          const st = s(r.status);
          return (
            <li key={`${s(r.event_id)}:${i}`} className="flex min-w-0 items-center gap-2 border-t border-white/[0.05] pt-[3px]">
              <span className="hud-value w-8 shrink-0 text-[10.5px] text-white/45">#{s(r.event_id)}</span>
              <span className="min-w-0 flex-1 truncate text-[11px] text-white/85">
                {s(r.topic)} <span className="hud-muted">· #{s(r.aggregate_id)}</span>
              </span>
              <RelayTrack status={st} index={i} />
              <span className="w-[3.4rem] shrink-0 text-right">
                <Pill tone={STATUS_TONE[st] ?? "plain"}>{st || "?"}</Pill>
              </span>
            </li>
          );
        })}
      </ul>
      {rows.length > shown.length && <p className="hud-label mt-1.5 text-white/35">+{rows.length - shown.length} earlier</p>}
      <div className="mt-2 flex items-center justify-end gap-1.5 text-[9.5px] text-white/35">
        <span className="hud-label !text-[9px]">→ broker</span>
      </div>
    </div>
  );
}
