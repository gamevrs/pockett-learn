"use client";

import React, { useState } from "react";
import { Clock, Eraser, Pencil, RotateCcw } from "lucide-react";
import type { WidgetProps } from "@/learn/widget";
import { Caption, Note, Readout } from "../dsa/ui";
import { Choice } from "./ui";

/**
 * A site with its origin in Virginia and three CDN edge locations. Four people request pages.
 * Pick a resource, choose the Cache-Control header it is sent with, and see whether the edge
 * answers by itself or goes back to the origin, and whether a shared cache ever hands one
 * person's page to another.
 */

type Res = "logo" | "feed" | "account";
type Pop = "FRA" | "SIN" | "GRU";
type Header = "public, max-age=3600" | "public, s-maxage=30" | "private" | "no-store";

const RES: Record<Res, { name: string; path: string; perUser: boolean }> = {
  logo: { name: "Logo image", path: "/logo.png", perUser: false },
  feed: { name: "Concert feed (JSON)", path: "/api/concerts", perUser: false },
  account: { name: "Account page", path: "/account", perUser: true },
};
const POPS: Record<Pop, { city: string; originMs: number }> = {
  FRA: { city: "Frankfurt", originMs: 90 },
  SIN: { city: "Singapore", originMs: 230 },
  GRU: { city: "São Paulo", originMs: 120 },
};
const PEOPLE: { name: string; pop: Pop }[] = [
  { name: "Ana", pop: "FRA" },
  { name: "Bruno", pop: "FRA" },
  { name: "Chen", pop: "SIN" },
  { name: "Dara", pop: "GRU" },
];
const EDGE_MS = 20;
const HEADERS: Header[] = ["public, max-age=3600", "public, s-maxage=30", "private", "no-store"];

const ttl = (h: Header) => (h === "public, max-age=3600" ? 3600 : h === "public, s-maxage=30" ? 30 : 0);

interface Entry {
  ver: number;
  at: number;
  user: string;
}
interface World {
  now: number;
  ver: Record<Res, number>;
  headers: Record<Res, Header>;
  edge: Record<Res, Partial<Record<Pop, Entry>>>;
  requests: number;
  edgeHits: number;
  originHits: number;
  ms: number;
  leaked: boolean;
  staleServed: boolean;
  log: { text: string; tone: "hit" | "miss" | "bad" }[];
}
const START: World = {
  now: 0,
  ver: { logo: 1, feed: 1, account: 1 },
  headers: { logo: "public, max-age=3600", feed: "public, s-maxage=30", account: "private" },
  edge: { logo: {}, feed: {}, account: {} },
  requests: 0,
  edgeHits: 0,
  originHits: 0,
  ms: 0,
  leaked: false,
  staleServed: false,
  log: [],
};

function ask(w: World, res: Res, who: { name: string; pop: Pop }): World {
  const h = w.headers[res];
  const entry = w.edge[res][who.pop];
  const fresh = entry && ttl(h) > 0 && w.now - entry.at < ttl(h);
  const where = `${who.name} → ${who.pop} edge`;
  if (fresh && entry) {
    const leak = RES[res].perUser && entry.user !== who.name;
    const stale = entry.ver !== w.ver[res];
    return {
      ...w,
      requests: w.requests + 1,
      edgeHits: w.edgeHits + 1,
      ms: w.ms + EDGE_MS,
      leaked: w.leaked || leak,
      staleServed: w.staleServed || stale,
      log: [...w.log, { text: leak ? `${where}: HIT in ${EDGE_MS} ms, but it is ${entry.user}'s account page. ${who.name} just read someone else's data.` : `${where}: HIT in ${EDGE_MS} ms${stale ? `. It is version ${entry.ver}, the origin already has ${w.ver[res]}.` : "."}`, tone: (leak || stale ? "bad" : "hit") as "bad" | "hit" }].slice(-8),
    };
  }
  const cost = EDGE_MS + POPS[who.pop].originMs;
  const store = ttl(h) > 0;
  return {
    ...w,
    requests: w.requests + 1,
    originHits: w.originHits + 1,
    ms: w.ms + cost,
    edge: store ? { ...w.edge, [res]: { ...w.edge[res], [who.pop]: { ver: w.ver[res], at: w.now, user: who.name } } } : w.edge,
    log: [...w.log, { text: `${where}: MISS, went to Virginia and back in ${cost} ms${store ? ". The edge keeps the answer." : h === "private" ? ". private: only the browser may keep it." : ". no-store: nobody keeps it."}`, tone: "miss" as const }].slice(-8),
  };
}

export interface CdnProps {
  resources?: Res[];
  initial?: Res;
  /** Let the learner change the header (default true). */
  editable?: boolean;
  /** Start the initial resource with this header. */
  header?: Header;
}

export interface CdnState {
  resource: Res;
  header: Header;
  requests: number;
  edgeHits: number;
  originHits: number;
  leaked: boolean;
  staleServed: boolean;
  avgMs: number;
}

export function Cdn({ props, onChange, revealed }: WidgetProps<CdnProps>) {
  const resources = props.resources ?? ["logo", "feed", "account"];
  const [res, setRes] = useState<Res>(props.initial ?? resources[0]);
  const [w, setW] = useState<World>(() => (props.header ? { ...START, headers: { ...START.headers, [props.initial ?? resources[0]]: props.header } } : START));

  const emit = (r: Res, x: World) =>
    onChange?.({ resource: r, header: x.headers[r], requests: x.requests, edgeHits: x.edgeHits, originHits: x.originHits, leaked: x.leaked, staleServed: x.staleServed, avgMs: x.requests ? Math.round(x.ms / x.requests) : 0 } satisfies CdnState);
  const act = (x: World, r = res) => {
    setW(x);
    emit(r, x);
  };
  const pickRes = (r: Res) => {
    setRes(r);
    setW({ ...START, headers: w.headers });
    emit(r, { ...START, headers: w.headers });
  };
  const setHeader = (h: Header) => act({ ...START, headers: { ...w.headers, [res]: h } });

  const header = w.headers[res];
  const btn = "btn !h-10";
  return (
    <div className="w-full min-w-0">
      {resources.length > 1 && <Choice label="Resource" value={res} disabled={revealed} onChange={pickRes} options={resources.map((r) => ({ id: r, label: RES[r].name }))} />}
      <div className="mt-3 rounded-xl border border-line bg-[#0a0a0a] px-3 py-2 font-mono text-[12.5px] text-[#e5e5e5]">
        <span className="text-white/50">GET {RES[res].path} → </span>
        <span className="text-white/50">Cache-Control: </span>
        <span className="text-[#c5ee8a]">{header}</span>
      </div>
      {props.editable !== false && (
        <div className="mt-2">
          <Choice label="Cache-Control header" value={header} disabled={revealed} onChange={setHeader} options={HEADERS.map((h) => ({ id: h, label: h }))} />
        </div>
      )}

      <Caption className="mt-3">Edge caches · {RES[res].name}</Caption>
      <div className="grid grid-cols-3 gap-2">
        {(Object.keys(POPS) as Pop[]).map((p) => {
          const e = w.edge[res][p];
          const old = e && e.ver !== w.ver[res];
          return (
            <div key={p} className={`rounded-xl border px-2 py-2 text-center ${old ? "border-[var(--bad)]/50 bg-[var(--bad)]/[0.06]" : e ? "border-[var(--brand)]/50 bg-tint" : "border-line bg-surface"}`}>
              <p className="font-mono text-[0.7rem] font-semibold text-ink-3">{p} · {POPS[p].city}</p>
              <p className="text-sm font-medium text-ink">{e ? `v${e.ver}${RES[res].perUser ? ` · ${e.user}` : ""}` : "empty"}</p>
              <p className="text-[0.68rem] text-ink-3">{e ? `${w.now - e.at} s old` : `origin ${POPS[p].originMs} ms away`}</p>
            </div>
          );
        })}
      </div>

      <Caption className="mt-3">Who is asking</Caption>
      <div className="flex flex-wrap gap-1.5">
        {PEOPLE.map((p) => (
          <button key={p.name} type="button" disabled={revealed} onClick={() => act(ask(w, res, p))} className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-line bg-surface px-3.5 text-sm text-ink transition-colors hover:border-[var(--brand)] hover:bg-tint disabled:opacity-50">
            <strong>{p.name}</strong>
            <span className="font-mono text-[11px] text-ink-3">{p.pop}</span>
          </button>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <button type="button" className={btn} disabled={revealed} onClick={() => act({ ...w, now: w.now + 20 })}>
          <Clock className="h-4 w-4" /> Wait 20 s
        </button>
        <button type="button" className={btn} disabled={revealed} onClick={() => act({ ...w, now: w.now + 3600 })}>
          <Clock className="h-4 w-4" /> Wait 1 hour
        </button>
        <button type="button" className={btn} disabled={revealed} onClick={() => act({ ...w, ver: { ...w.ver, [res]: w.ver[res] + 1 } })}>
          <Pencil className="h-4 w-4" /> Change it at the origin
        </button>
        <button type="button" className={btn} disabled={revealed} onClick={() => act({ ...w, edge: { ...w.edge, [res]: {} }, log: [...w.log, { text: `Purged ${RES[res].path} from every edge.`, tone: "miss" as const }].slice(-8) })}>
          <Eraser className="h-4 w-4" /> Purge
        </button>
        <button type="button" className="btn btn-ghost !h-10 !w-10 !p-0" disabled={revealed} onClick={() => act({ ...START, headers: w.headers })} aria-label="Start over" title="Start over">
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Readout label="Edge hits" value={`${w.edgeHits} of ${w.requests}`} accent={w.edgeHits > 0} />
        <Readout label="Origin trips" value={w.originHits} />
        <Readout label="Average" value={w.requests ? `${Math.round(w.ms / w.requests)} ms` : "-"} />
      </div>
      <div className="mt-3 min-h-14 space-y-1 rounded-xl border border-line bg-surface-2 p-2" aria-live="polite">
        {w.log.length === 0 && <p className="px-1 py-1 text-sm text-ink-3">Tap a person to send a request.</p>}
        {w.log.slice(-5).map((l, i) => (
          <p key={i} className={`rounded-lg bg-surface px-2 py-1.5 text-[0.8rem] leading-snug ${l.tone === "bad" ? "text-bad" : "text-ink-2"}`}>{l.text}</p>
        ))}
      </div>
      {w.leaked && <Note tone="bad">A shared cache handed one person&apos;s private page to another. That is how real data leaks happen.</Note>}
    </div>
  );
}

export function checkCdn(state: unknown, goal: Record<string, unknown>) {
  const s = state as CdnState | undefined;
  if (!s) return false;
  if (typeof goal.resource === "string" && s.resource !== goal.resource) return false;
  if (typeof goal.leaked === "boolean" && s.leaked !== goal.leaked) return false;
  if (typeof goal.edgeHitsMin === "number" && !(s.edgeHits >= goal.edgeHitsMin)) return false;
  if (typeof goal.originMax === "number" && !(s.originHits <= goal.originMax)) return false;
  if (typeof goal.originMin === "number" && !(s.originHits >= goal.originMin)) return false;
  if (typeof goal.requestsMin === "number" && !(s.requests >= goal.requestsMin)) return false;
  if (typeof goal.staleServed === "boolean" && s.staleServed !== goal.staleServed) return false;
  if (typeof goal.header === "string" && s.header !== goal.header) return false;
  return true;
}
