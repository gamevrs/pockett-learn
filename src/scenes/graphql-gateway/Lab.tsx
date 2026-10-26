"use client";

import React, { useState } from "react";
import { Check, FlaskConical, Play, RefreshCw, ScrollText, ShieldAlert, X } from "lucide-react";
import type { GqlSession, LogEntry, Snapshot } from "./session";
import { ABUSE, FEATURE_INFO } from "./operations";
import { BTN, BTN_ON, Bar, Empty, GhostRows, Locked, Notice, PaneFrame, SectionLabel } from "./ui";

/** The Lab pane: the abuse lab, your test suite, REST vs GraphQL and the server log. */

interface Props {
  session: GqlSession;
  snap: Snapshot;
  unlocked: ReadonlySet<string>;
  focus: string | null;
  interactive: boolean;
}

const OP_NAME: Record<string, string> = { deep: "DeepCycle", alias: "AliasBomb", huge: "HugePage", legit: "LegitHeavy" };

function verdictOf(entry: LogEntry | null, hostile: boolean): { tone: "ok" | "warn" | "bad"; title: string; detail: string } | null {
  if (!entry) return null;
  const r = entry.result;
  if (!r.ok) {
    const slow = /too long|Timeout/i.test(r.problem ?? "");
    return slow
      ? { tone: "bad", title: "Timed out", detail: "Your server was still working after 0.25 s. This is the denial of service a limit exists to prevent." }
      : { tone: "bad", title: "Server crashed", detail: r.problem ?? "No response." };
  }
  const refused = r.errors.length > 0 && !r.hasData;
  const code = r.errors[0]?.code ?? "error";
  const sql = r.stats ? ` · ${r.stats.sql} SQL queries` : "";
  if (refused) {
    return hostile
      ? { tone: "ok", title: `Rejected · ${code}`, detail: `${r.errors[0]?.message ?? ""} (${r.ms} ms)` }
      : { tone: "warn", title: `Refused · ${code}`, detail: `Too strict: a legitimate query was turned away. ${r.errors[0]?.message ?? ""}` };
  }
  return hostile
    ? { tone: "bad", title: "Allowed", detail: `Your server ran it in ${r.ms} ms${sql}. A client could repeat this all day.` }
    : { tone: "ok", title: "Allowed", detail: `Answered in ${r.ms} ms${sql}.` };
}

function AbuseLab({ session, snap, unlocked, focus, interactive }: Props) {
  const info = FEATURE_INFO["gql-limits"];
  if (!unlocked.has("gql-limits")) {
    return (
      <Locked title={info.title} need={info.need} lesson={info.lesson} spot={focus === "gql-limits"} compact>
        <GhostRows rows={3} />
      </Locked>
    );
  }
  return (
    <div>
      <SectionLabel right={<ShieldAlert className="h-3.5 w-3.5 text-[#c5ee8a]" aria-hidden />}>Abuse lab</SectionLabel>
      <p className="mb-2 text-[10.5px] leading-snug text-white/45">GraphQL lets the client choose the query, so a client can choose a cruel one. Send these hostile operations and see what your limits do.</p>
      <ul className="space-y-2">
        {ABUSE.map((c) => {
          const entry = snap.log.find((e) => e.source === "lab" && e.name === OP_NAME[c.id]) ?? null;
          const v = verdictOf(entry, c.hostile);
          return (
            <li key={c.id} className="rounded-lg border border-white/[0.08] bg-white/[0.03] p-2.5">
              <div className="flex min-w-0 items-center gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <span className="truncate text-[11px] font-medium text-white/90">{c.label}</span>
                    <span className={`shrink-0 rounded-full border px-1.5 py-px text-[9px] font-medium ${c.hostile ? "border-[#f87171]/35 text-[#fca5a5]" : "border-[#c5ee8a]/35 text-[#d3f3a4]"}`}>{c.hostile ? "hostile" : "legit"}</span>
                  </div>
                  <div className="truncate font-mono text-[10px] text-white/35">{c.shape}</div>
                </div>
                <button className={BTN_ON} disabled={!interactive || !session.hasExecute} onClick={() => session.run({ query: c.build(), operationName: OP_NAME[c.id] }, "lab")}>
                  <Play className="h-3 w-3" aria-hidden /> Send
                </button>
              </div>
              <p className="mt-1.5 text-[10.5px] leading-snug text-white/45">{c.why}</p>
              {v && (
                <div className="mt-2">
                  <Notice tone={v.tone}>
                    <span className="font-semibold">{v.title}.</span> {v.detail}
                  </Notice>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ───────────────────────── REST vs GraphQL ─────────────────────────

export function RestCompareCard({ session, snap, productId, fixedProduct = false }: { session: GqlSession; snap: Snapshot; productId?: number; fixedProduct?: boolean }) {
  const [picked, setPicked] = useState(productId ?? 1);
  const id = fixedProduct ? (productId ?? 1) : picked;
  const c = snap.compare;
  const v = c?.value && c.value.productId === id ? c.value : null;
  const maxReq = v ? Math.max(v.rest.requests, v.graphql.requests, 1) : 1;
  const maxBytes = v ? Math.max(v.rest.bytes, v.graphql.bytes, 1) : 1;
  return (
    <div className="rounded-lg border border-white/[0.08] bg-black/20 p-2.5">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <h4 className="hud-label min-w-0 flex-1">REST vs GraphQL · product page</h4>
        {!fixedProduct && (
          <select aria-label="Product" value={picked} onChange={(e) => setPicked(Number(e.target.value))} className="h-6 rounded-md border border-white/12 bg-[#141414] px-1.5 text-[10.5px] text-white outline-none focus:border-[#c5ee8a]/60">
            {Array.from({ length: 16 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                Product {n}
              </option>
            ))}
          </select>
        )}
        <button className={BTN} onClick={() => session.compareRest(id)} disabled={!session.hasHook("compare_rest")}>
          Compare product {id}
        </button>
      </div>
      {c?.problem && !v && (
        <div className="mt-2">
          <Notice tone="warn">{c.problem}</Notice>
        </div>
      )}
      {!c && <p className="mt-2 text-[10.5px] leading-snug text-white/45">What would this screen cost over REST (product, category, reviews, authors) compared with the one GraphQL query?</p>}
      {v && (
        <div className="mt-2.5 space-y-2.5">
          <div className="space-y-1.5">
            <Bar value={v.rest.requests} max={maxReq} tone="grey" label="REST requests" right={v.rest.requests} />
            <Bar value={v.graphql.requests} max={maxReq} tone="lime" label="GraphQL requests" right={v.graphql.requests} />
          </div>
          <div className="space-y-1.5">
            <Bar value={v.rest.bytes} max={maxBytes} tone="grey" label="REST bytes received" right={v.rest.bytes.toLocaleString()} />
            <Bar value={v.graphql.bytes} max={maxBytes} tone="lime" label="GraphQL bytes received" right={v.graphql.bytes.toLocaleString()} />
          </div>
          {v.rest.calls.length > 0 && (
            <ul className="space-y-0.5 border-t border-white/[0.07] pt-2">
              {v.rest.calls.map((call, i) => (
                <li key={i} className="flex min-w-0 gap-2 font-mono text-[10px] text-white/55">
                  <span className="shrink-0 text-white/35">GET</span>
                  <span className="min-w-0 flex-1 truncate">{call.path}</span>
                  <span className="shrink-0 text-white/40">{call.bytes.toLocaleString()} B</span>
                </li>
              ))}
            </ul>
          )}
          <p className="text-[10.5px] leading-snug text-white/45">REST is great when the resource is the screen and the response can be cached. GraphQL pays off when many clients need different shapes of the same graph.</p>
        </div>
      )}
    </div>
  );
}

function ShipSection({ session, snap, unlocked, focus, interactive }: Props) {
  const info = FEATURE_INFO["gql-ship"];
  if (!unlocked.has("gql-ship")) {
    return (
      <Locked title={info.title} need={info.need} lesson={info.lesson} spot={focus === "gql-ship"} compact>
        <GhostRows rows={3} />
      </Locked>
    );
  }
  const t = snap.tests;
  const passed = t?.rows.filter((r) => r.passed).length ?? 0;
  return (
    <div className="space-y-3">
      <div>
        <SectionLabel right={<FlaskConical className="h-3.5 w-3.5 text-[#c5ee8a]" aria-hidden />}>Your test suite</SectionLabel>
        <div className="flex flex-wrap items-center gap-2">
          <button className={BTN_ON} disabled={!interactive} onClick={() => session.runTests()}>
            <Play className="h-3 w-3" aria-hidden /> Run run_tests()
          </button>
          {t && !t.problem && (
            <span className={`hud-value text-[11px] ${passed === t.rows.length && t.rows.length > 0 ? "text-[#d3f3a4]" : "text-[#fbbf24]"}`}>
              {passed}/{t.rows.length} passing
            </span>
          )}
        </div>
        {t?.problem && (
          <div className="mt-2">
            <Notice tone="warn">{t.problem}</Notice>
          </div>
        )}
        {t && !t.problem && t.rows.length === 0 && <Empty>run_tests() returned an empty list.</Empty>}
        {t && t.rows.length > 0 && (
          <ul className="mt-2 space-y-1">
            {t.rows.map((r, i) => (
              <li key={i} className="rounded-md border border-white/[0.07] bg-white/[0.025] px-2 py-1.5">
                <div className="flex min-w-0 items-center gap-2 text-[11px]">
                  {r.passed ? <Check className="h-3 w-3 shrink-0 text-[#c5ee8a]" aria-hidden /> : <X className="h-3 w-3 shrink-0 text-[#f87171]" aria-hidden />}
                  <span className="min-w-0 flex-1 truncate font-mono text-white/85">{r.name}</span>
                </div>
                {r.error && <p className="mt-0.5 break-words pl-5 text-[10.5px] leading-snug text-[#fca5a5]">{r.error}</p>}
              </li>
            ))}
          </ul>
        )}
      </div>
      <RestCompareCard session={session} snap={snap} />
    </div>
  );
}

function ServerLog({ session, snap, unlocked, focus }: Props) {
  const info = FEATURE_INFO["gql-errors"];
  if (!unlocked.has("gql-errors")) {
    return (
      <Locked title="Server log" need="recent_errors() and masked errors" lesson={info.lesson} spot={focus === "gql-errors"} compact>
        <GhostRows rows={2} />
      </Locked>
    );
  }
  const l = snap.serverLog;
  return (
    <div>
      <SectionLabel right={<ScrollText className="h-3.5 w-3.5 text-[#c5ee8a]" aria-hidden />}>Server log</SectionLabel>
      <p className="mb-2 text-[10.5px] leading-snug text-white/45">Clients only see a masked INTERNAL_SERVER_ERROR. The real exception belongs here, in your recent_errors().</p>
      <button className={BTN} onClick={() => session.refreshServerLog()}>
        <RefreshCw className="h-3 w-3" aria-hidden /> Refresh
      </button>
      {l?.problem && (
        <div className="mt-2">
          <Notice tone="warn">{l.problem}</Notice>
        </div>
      )}
      {l && !l.problem && l.rows.length === 0 && <Empty>Nothing logged. Run the Flaky operation in the Explorer, then refresh.</Empty>}
      {l && l.rows.length > 0 && (
        <ul className="hud-log mt-2 space-y-1 rounded-md border border-white/[0.07] bg-black/30 p-2">
          {l.rows.slice(-12).map((row, i) => (
            <li key={i} className="hud-log-line break-words text-[10.5px]">
              <span className="text-[#f87171]">{row.type}</span> {row.message}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function LabPane(props: Props) {
  return (
    <PaneFrame title="Lab" icon={<FlaskConical className="h-3.5 w-3.5" aria-hidden />} hint="Stress, test and compare your gateway.">
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-2.5 [scrollbar-width:thin]">
        <AbuseLab {...props} />
        <ShipSection {...props} />
        <ServerLog {...props} />
      </div>
    </PaneFrame>
  );
}
