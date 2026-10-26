"use client";

import React, { useState } from "react";
import { Hand, KeyRound, LogIn, ShieldAlert, Play, Repeat, Zap } from "lucide-react";
import { IPS, login } from "./access";
import { burst, doubleTap, MATRIX_ACTIONS, rentBike, reuseKey, runMatrix, tamper } from "./actions";
import { Feature, NeedsHook, type PanelCtx } from "./feature";
import { useNow } from "./hooks";
import { RIDERS } from "./sim-data";
import type { Exchange } from "./state";
import { asStr } from "./types";
import { BTN, BTN_ON, Chip, Code, Empty } from "./ui";
import { countdown } from "./util";

/** L9-L12: rider tokens, the access guard, the idempotency ledger and the rate-limit buckets. */

// ───────────────────────── L9 rider tokens ─────────────────────────

const initials = (name: string) => name.split(" ").map((p) => p[0]).join("");

function TokenCard({ ctx, riderId, now }: { ctx: PanelCtx; riderId: string; now: number }) {
  const rider = RIDERS.find((r) => r.id === riderId)!;
  const t = ctx.snap.tokens[riderId];
  const [wrong, setWrong] = useState<Exchange | null>(null);
  const tampered = ctx.snap.tampered?.riderId === riderId ? ctx.snap.tampered : null;
  const parts = t ? t.token.split(".") : [];
  const expSeconds = t && typeof t.payload?.exp === "number" ? t.payload.exp : null;
  const expiresAt = expSeconds !== null ? expSeconds * 1000 : t ? t.at + t.expiresIn * 1000 : 0;
  const left = t ? expiresAt - now : 0;
  const total = t ? Math.max(1, t.expiresIn * 1000) : 1;
  return (
    <li className="min-w-0 rounded-lg bg-white/[0.05] px-2.5 py-2">
      <div className="flex min-w-0 items-center gap-2">
        <span aria-hidden className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px] font-semibold ${t ? "bg-[#c5ee8a] text-[#0a0a0a]" : "bg-white/12 text-white/80"}`}>
          {initials(rider.name)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[12px] font-medium text-white">{rider.name}</div>
          <div className="font-mono text-[10px] text-white/65">{rider.id}</div>
        </div>
        <Chip tone={rider.role === "admin" ? "warn" : rider.role === "mechanic" ? "plain" : "dim"}>{rider.role}</Chip>
      </div>

      {t ? (
        <>
          <div className="mt-2 break-all font-mono text-[10px] leading-snug" aria-label="Token parts">
            <span className="text-[#e5e5e5]" title="header">{parts[0]?.slice(0, 14)}…</span>
            <span className="text-white/60">.</span>
            <span className="text-[#c5ee8a]" title="payload">{parts[1]?.slice(0, 22)}…</span>
            <span className="text-white/60">.</span>
            <span className="text-[#fbbf24]" title="signature">{parts[2]?.slice(0, 12)}…</span>
          </div>
          <dl className="mt-1.5 grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 text-[10.5px]">
            <dt className="text-white/60">alg</dt>
            <dd className="font-mono text-white/90">{asStr(t.header?.alg, "?")}</dd>
            <dt className="text-white/60">sub / role</dt>
            <dd className="truncate font-mono text-white/90">
              {asStr(t.payload?.sub, "?")} / {asStr(t.payload?.role, "?")}
            </dd>
            <dt className="text-white/60">expires</dt>
            <dd className={`font-mono ${left <= 0 ? "text-[#fbbf24]" : "text-white/90"}`}>{left <= 0 ? "expired" : `in ${countdown(left)}`}</dd>
          </dl>
          <div className="hud-bar mt-1.5" aria-hidden>
            <span style={{ width: `${Math.max(0, Math.min(100, (left / total) * 100))}%`, background: left <= 0 ? "#fbbf24" : "#c5ee8a" }} />
          </div>
        </>
      ) : (
        <p className="mt-2 text-[11px] text-white/60">No token yet.</p>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <button type="button" className={BTN_ON} disabled={!ctx.interactive} aria-label={`Log in as ${rider.name}`} onClick={() => void login(ctx.driver, riderId)}>
          <LogIn className="h-3 w-3" aria-hidden /> Log in
        </button>
        <button type="button" className={BTN} disabled={!ctx.interactive} aria-label={`Try a wrong PIN for ${rider.name}`} onClick={() => void login(ctx.driver, riderId, "0000").then(setWrong)}>
          <KeyRound className="h-3 w-3" aria-hidden /> Wrong PIN
        </button>
        {t && (
          <button type="button" className={BTN} disabled={!ctx.interactive} aria-label={`Tamper with ${rider.name}'s token`} onClick={() => void tamper(ctx.driver, riderId)}>
            <ShieldAlert className="h-3 w-3" aria-hidden /> Tamper
          </button>
        )}
        {wrong && <Code ex={wrong} />}
        {tampered && (
          <Chip tone={tampered.status === 401 ? "ok" : "bad"} title="Status for a request with the forged token">
            forged → {tampered.status}
          </Chip>
        )}
      </div>
    </li>
  );
}

export function RiderTokens({ ctx }: { ctx: PanelCtx }) {
  const now = useNow(1000);
  return (
    <Feature id="api-auth" ctx={ctx} meta={`${Object.keys(ctx.snap.tokens).length} of ${RIDERS.length} signed in`}>
      <NeedsHook ctx={ctx} hook="handle">
        <ul className="grid gap-2 px-3 py-2 @lg:grid-cols-2" aria-label="Riders">
          {RIDERS.map((r) => (
            <TokenCard key={r.id} ctx={ctx} riderId={r.id} now={now} />
          ))}
        </ul>
      </NeedsHook>
    </Feature>
  );
}

// ───────────────────────── L10 access guard ─────────────────────────

const SHORT: Record<string, string> = { own: "Own", other: "Other’s", create: "Create", patch: "Patch", all: "List all" };

function Cell({ status, note }: { status: number | null | undefined; note?: string }) {
  if (status === undefined) return <span className="text-white/60">·</span>;
  if (status === null) return <span className="text-[10px] text-white/60">{note ?? "n/a"}</span>;
  const ok = status < 300;
  return (
    <span className="inline-flex flex-col items-center leading-none">
      <Chip tone={ok ? "ok" : status === 401 || status >= 500 ? "bad" : "warn"}>{status}</Chip>
      <span className="mt-0.5 text-[9.5px] text-white/65">{ok ? "allowed" : status === 403 ? "forbidden" : status === 404 ? "hidden" : status === 401 ? "no auth" : "refused"}</span>
    </span>
  );
}

export function AccessGuard({ ctx }: { ctx: PanelCtx }) {
  const { snap, driver } = ctx;
  return (
    <Feature
      id="api-authz"
      ctx={ctx}
      meta="riders × actions"
      actions={
        ctx.interactive && (
          <button type="button" className={BTN_ON} disabled={snap.matrixBusy} onClick={() => void runMatrix(driver)} aria-label="Run every rider against every action">
            <Play className="h-3 w-3" aria-hidden /> {snap.matrixBusy ? "Running…" : "Run matrix"}
          </button>
        )
      }
    >
      <NeedsHook ctx={ctx} hook="handle">
        <div className="overflow-x-auto px-3 py-2">
          <table className="w-full min-w-[19rem] border-separate border-spacing-y-1 text-left">
            <thead>
              <tr>
                <th scope="col" className="hud-label pb-1 !text-white/60">Rider</th>
                {MATRIX_ACTIONS.map((a) => (
                  <th key={a.id} scope="col" title={a.label} className="hud-label px-1 pb-1 text-center !text-white/60">
                    {SHORT[a.id]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {RIDERS.map((r) => (
                <tr key={r.id} className="bg-white/[0.04]">
                  <th scope="row" className="rounded-l-md px-2 py-1.5 text-left font-normal">
                    <div className="truncate text-[11.5px] text-white">{r.name.split(" ")[0]}</div>
                    <div className="text-[10px] text-white/65">{r.role}</div>
                  </th>
                  {MATRIX_ACTIONS.map((a, i) => {
                    const c = snap.matrix[`${r.id}:${a.id}`];
                    return (
                      <td key={a.id} className={`px-1 py-1.5 text-center ${i === MATRIX_ACTIONS.length - 1 ? "rounded-r-md" : ""}`}>
                        <span key={c ? `${c.status}` : "x"} className={c ? "dl-new inline-block rounded" : "inline-block"}>
                          <Cell status={c?.status} note={c?.note} />
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          {Object.keys(snap.matrix).length === 0 && <p className="mt-1 text-[11px] text-white/60">Press Run matrix: each cell is a real request made as that rider.</p>}
        </div>
      </NeedsHook>
    </Feature>
  );
}

// ───────────────────────── L11 idempotency ledger ─────────────────────────

export function IdempotencyLedger({ ctx }: { ctx: PanelCtx }) {
  const { snap, driver } = ctx;
  const rows = [...snap.ledger].reverse();
  const replays = snap.ledger.filter((r) => r.replay).length;
  return (
    <Feature
      id="api-idempotency"
      ctx={ctx}
      meta={`${snap.ledger.length} keys · ${replays} replayed`}
      actions={
        ctx.interactive && (
          <>
            <button type="button" className={BTN} onClick={() => void rentBike(driver, "u-ana")} aria-label="Rent a bike with a fresh key">
              <Zap className="h-3 w-3" aria-hidden /> Rent
            </button>
            <button type="button" className={BTN_ON} onClick={() => void doubleTap(driver)} aria-label="Send the same rental twice with one key">
              <Hand className="h-3 w-3" aria-hidden /> Double-tap
            </button>
            <button type="button" className={BTN} onClick={() => void reuseKey(driver)} aria-label="Reuse a key with a different bike">
              <Repeat className="h-3 w-3" aria-hidden /> Reuse key
            </button>
          </>
        )
      }
    >
      <NeedsHook ctx={ctx} hook="handle">
        {rows.length === 0 ? (
          <Empty>No keyed requests yet. Rent a bike, or press Double-tap to send one twice.</Empty>
        ) : (
          <ul aria-label="Idempotency keys" className="px-3 py-2">
            <li className="hud-label grid grid-cols-[minmax(0,1fr)_3rem_auto] gap-x-2 pb-1 !text-white/60 @md:grid-cols-[minmax(0,1.2fr)_3.4rem_3rem_3rem_auto]">
              <span>Key</span>
              <span className="hidden @md:block">Rider</span>
              <span className="hidden @md:block">Bike</span>
              <span>Sent</span>
              <span className="text-right">Result</span>
            </li>
            {rows.slice(0, 8).map((r) => (
              <li key={r.key} className="dl-new grid grid-cols-[minmax(0,1fr)_3rem_auto] items-center gap-x-2 rounded px-0 py-1 @md:grid-cols-[minmax(0,1.2fr)_3.4rem_3rem_3rem_auto]">
                <code className="min-w-0 truncate font-mono text-[11px] text-white/95">{r.key}</code>
                <span className="hidden truncate font-mono text-[10px] text-white/70 @md:block">{r.riderId.replace("u-", "")}</span>
                <span className="hidden font-mono text-[10px] text-white/70 @md:block">{r.bikeId.replace("bk-", "")}</span>
                <span className="hud-value text-[10.5px] text-white/85">×{r.attempts}</span>
                <span className="flex flex-wrap justify-end gap-1">
                  <Chip tone={r.status < 300 ? "ok" : "warn"}>{r.status}</Chip>
                  {r.replay && <Chip tone="ok" title="x-idempotent-replay: true">replay</Chip>}
                  {r.conflict && <Chip tone="warn" title="Same key, different body">mismatch</Chip>}
                </span>
              </li>
            ))}
          </ul>
        )}
      </NeedsHook>
    </Feature>
  );
}

// ───────────────────────── L12 rate-limit buckets ─────────────────────────

export function RateLimitBuckets({ ctx }: { ctx: PanelCtx }) {
  const { snap, driver } = ctx;
  const now = useNow(250);
  return (
    <Feature id="api-ratelimit" ctx={ctx} meta="per client IP">
      <NeedsHook ctx={ctx} hook="handle">
        <ul className="grid gap-2 px-3 py-2 @lg:grid-cols-3" aria-label="Clients">
          {IPS.map((ip) => {
            const b = snap.buckets[ip];
            const frac = b && b.limit > 0 ? b.remaining / b.limit : 0;
            const wait = b ? b.retryUntil - now : 0;
            const color = !b ? "rgba(255,255,255,0.3)" : frac <= 0 ? "#f87171" : frac < 0.35 ? "#fbbf24" : "#c5ee8a";
            return (
              <li key={ip} className="min-w-0 rounded-lg bg-white/[0.05] px-2.5 py-2">
                <div className="flex min-w-0 items-center gap-2">
                  <code className="min-w-0 flex-1 truncate font-mono text-[11.5px] text-white">{ip}</code>
                  {wait > 0 ? <Chip tone="bad">retry in {countdown(wait)}</Chip> : b && frac > 0 ? <Chip tone="ok">open</Chip> : b ? <Chip tone="warn">empty</Chip> : <Chip tone="dim">idle</Chip>}
                </div>
                <div className="hud-bar mt-2 !h-2" role="meter" aria-label={`Requests left for ${ip}`} aria-valuemin={0} aria-valuemax={b?.limit ?? 0} aria-valuenow={b?.remaining ?? 0}>
                  <span style={{ width: `${Math.max(0, Math.min(1, frac)) * 100}%`, background: color, transition: "width .25s" }} />
                </div>
                <div className="mt-1.5 flex items-baseline gap-2">
                  <span className="hud-value text-[15px]">{b ? `${b.remaining}/${b.limit}` : "—"}</span>
                  <span className="text-[10.5px] text-white/65">left</span>
                  <span className="ml-auto text-[10.5px] text-white/70">
                    {b?.sent ?? 0} sent · <span className={b && b.blocked > 0 ? "text-[#fca5a5]" : ""}>{b?.blocked ?? 0} × 429</span>
                  </span>
                </div>
                {ctx.interactive && (
                  <button type="button" className={`${BTN} mt-2`} onClick={() => void burst(driver, ip, 16)} aria-label={`Burst 16 requests from ${ip}`}>
                    <Zap className="h-3 w-3" aria-hidden /> Burst
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </NeedsHook>
    </Feature>
  );
}
