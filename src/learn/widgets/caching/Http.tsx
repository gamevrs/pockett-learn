"use client";

import React, { useState } from "react";
import { Clock, RotateCcw, Upload } from "lucide-react";
import type { WidgetProps } from "@/learn/widget";
import { Caption, Note, Readout } from "../dsa/ui";
import { Choice, Toggle } from "./ui";

/**
 * A browser asking for the same page again and again. You decide which caching headers the server
 * sends, move the clock, and publish new versions; the log shows what the browser did each time:
 * used its own copy, asked "has it changed?" and got a tiny 304, or downloaded everything again.
 */

export type Directive = "none" | "max-age" | "no-cache" | "no-store" | "swr";

const CC: Record<Directive, string> = {
  none: "(no Cache-Control)",
  "max-age": "max-age=60",
  "no-cache": "no-cache",
  "no-store": "no-store",
  swr: "max-age=60, stale-while-revalidate=30",
};
const BODY_KB = 48;
const NOT_MODIFIED_KB = 0.3;

type Kind = "full" | "304" | "cache" | "stale";
interface Row {
  at: number;
  kind: Kind;
  shown: number;
  latest: number;
  detail: string;
}
interface Stored {
  ver: number;
  at: number;
}
interface World {
  now: number;
  server: number;
  stored: Stored | null;
  rows: Row[];
  n200: number;
  n304: number;
  nCache: number;
  nStale: number;
  kb: number;
  everStale: boolean;
}
const START: World = { now: 0, server: 1, stored: null, rows: [], n200: 0, n304: 0, nCache: 0, nStale: 0, kb: 0, everStale: false };

function load(w: World, cc: Directive, etag: boolean, lastmod: boolean): World {
  const validators = etag || lastmod;
  const row = (kind: Kind, shown: number, detail: string): Row => ({ at: w.now, kind, shown, latest: w.server, detail });
  const add = (r: Row, d: Partial<World>): World => ({ ...w, ...d, rows: [...w.rows, r].slice(-12), everStale: w.everStale || r.shown !== r.latest });
  const download = (detail: string, keep: boolean) =>
    add(row("full", w.server, detail), { n200: w.n200 + 1, kb: w.kb + BODY_KB, stored: keep ? { ver: w.server, at: w.now } : w.stored });

  if (cc === "no-store") return download("Sent in full: no-store forbids keeping a copy.", false);
  const s = w.stored;
  if (!s) return download("First visit: nothing stored, so the whole page is downloaded.", true);

  const age = w.now - s.at;
  const fresh = cc === "max-age" || cc === "swr" ? age < 60 : false;
  if (fresh) return add(row("cache", s.ver, `Used the stored copy (${age} s old, fresh for 60 s). No request left the browser.`), { nCache: w.nCache + 1 });

  const revalidate = (): { kind: "304" | "full"; stored: Stored; kb: number } =>
    validators && s.ver === w.server
      ? { kind: "304", stored: { ver: s.ver, at: w.now }, kb: NOT_MODIFIED_KB }
      : { kind: "full", stored: { ver: w.server, at: w.now }, kb: BODY_KB };

  if (cc === "swr" && age < 90) {
    const r = revalidate();
    return add(row("stale", s.ver, r.kind === "304" ? `Showed the ${age} s old copy instantly and asked in the background: 304, still current.` : `Showed the old copy instantly, and fetched ${validators ? "version " + w.server : "everything"} in the background for next time.`), {
      nStale: w.nStale + 1,
      n304: w.n304 + (r.kind === "304" ? 1 : 0),
      n200: w.n200 + (r.kind === "full" ? 1 : 0),
      kb: w.kb + r.kb,
      stored: r.stored,
    });
  }

  if (!validators) return download(`Stored copy is ${cc === "none" ? "not trusted" : "stale"}, and with no ETag or Last-Modified the browser cannot ask "changed?": full download.`, true);
  const r = revalidate();
  if (r.kind === "304") return add(row("304", s.ver, `Asked "changed since my copy?" and the server said 304 Not Modified. Reused the copy (${NOT_MODIFIED_KB} kB over the wire).`), { n304: w.n304 + 1, kb: w.kb + r.kb, stored: r.stored });
  return add(row("full", w.server, `Asked "changed?": yes, the server has version ${w.server}. Downloaded it in full.`), { n200: w.n200 + 1, kb: w.kb + r.kb, stored: r.stored });
}

const KIND: Record<Kind, { tag: string; cls: string }> = {
  full: { tag: "200", cls: "bg-surface-2 text-ink" },
  "304": { tag: "304", cls: "bg-primary text-primary-ink" },
  cache: { tag: "cache", cls: "bg-primary text-primary-ink" },
  stale: { tag: "stale+bg", cls: "bg-tint text-ink ring-1 ring-[var(--brand)]/60" },
};

export interface HttpProps {
  /** Which Cache-Control choices to offer (default all). */
  directives?: Directive[];
  initial?: Directive;
  /** Offer the ETag / Last-Modified switches (default true). */
  validators?: boolean;
  etag?: boolean;
}

export interface HttpState {
  cc: Directive;
  etag: boolean;
  lastmod: boolean;
  n200: number;
  n304: number;
  nCache: number;
  nStale: number;
  kb: number;
  everStale: boolean;
  last: Kind | null;
  lastStale: boolean;
}

export function Http({ props, onChange, revealed }: WidgetProps<HttpProps>) {
  const directives = props.directives ?? ["none", "max-age", "no-cache", "no-store", "swr"];
  const [cc, setCc] = useState<Directive>(props.initial ?? directives[0]);
  const [etag, setEtag] = useState(props.etag ?? false);
  const [lastmod, setLastmod] = useState(false);
  const [w, setW] = useState<World>(START);

  const emit = (c: Directive, e: boolean, l: boolean, x: World) => {
    const last = x.rows[x.rows.length - 1];
    onChange?.({ cc: c, etag: e, lastmod: l, n200: x.n200, n304: x.n304, nCache: x.nCache, nStale: x.nStale, kb: x.kb, everStale: x.everStale, last: last?.kind ?? null, lastStale: last ? last.shown !== last.latest : false } satisfies HttpState);
  };
  const act = (x: World) => {
    setW(x);
    emit(cc, etag, lastmod, x);
  };
  const reconfigure = (c: Directive, e: boolean, l: boolean) => {
    setCc(c);
    setEtag(e);
    setLastmod(l);
    setW(START);
    emit(c, e, l, START);
  };

  const btn = "btn !h-10";
  const last = w.rows[w.rows.length - 1];
  return (
    <div className="w-full min-w-0">
      <Caption>The server sends</Caption>
      <div className="rounded-xl border border-line bg-[#0a0a0a] px-3 py-2 font-mono text-[12.5px] leading-relaxed text-[#e5e5e5]">
        <div>
          <span className="text-white/50">Cache-Control: </span>
          <span className="text-[#c5ee8a]">{CC[cc]}</span>
        </div>
        {props.validators !== false && (
          <>
            <div>
              <span className="text-white/50">ETag: </span>
              <span className={etag ? "text-[#c5ee8a]" : "text-white/30"}>{etag ? `"v${w.server}"` : "(absent)"}</span>
            </div>
            <div>
              <span className="text-white/50">Last-Modified: </span>
              <span className={lastmod ? "text-[#c5ee8a]" : "text-white/30"}>{lastmod ? `version ${w.server} published` : "(absent)"}</span>
            </div>
          </>
        )}
      </div>

      <div className="mt-3 grid gap-2">
        <Choice label="Cache-Control" value={cc} disabled={revealed} onChange={(c) => reconfigure(c, etag, lastmod)} options={directives.map((d) => ({ id: d, label: CC[d] === "(no Cache-Control)" ? "no header" : CC[d].replace(", stale-while-revalidate=30", " + swr=30") }))} />
        {props.validators !== false && (
          <div className="flex flex-wrap gap-1.5">
            <Toggle on={etag} disabled={revealed} onClick={() => reconfigure(cc, !etag, lastmod)}>ETag</Toggle>
            <Toggle on={lastmod} disabled={revealed} onClick={() => reconfigure(cc, etag, !lastmod)}>Last-Modified</Toggle>
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <button type="button" className={`${btn} btn-primary`} disabled={revealed} onClick={() => act(load(w, cc, etag, lastmod))}>
          Load the page
        </button>
        <button type="button" className={btn} disabled={revealed} onClick={() => act({ ...w, now: w.now + 20 })}>
          <Clock className="h-4 w-4" /> Wait 20 s
        </button>
        <button type="button" className={btn} disabled={revealed} onClick={() => act({ ...w, now: w.now + 60 })}>
          <Clock className="h-4 w-4" /> Wait 60 s
        </button>
        <button type="button" className={btn} disabled={revealed} onClick={() => act({ ...w, server: w.server + 1 })}>
          <Upload className="h-4 w-4" /> Publish version {w.server + 1}
        </button>
        <button type="button" className="btn btn-ghost !h-10 !w-10 !p-0" disabled={revealed} onClick={() => reconfigure(cc, etag, lastmod)} aria-label="Start over" title="Start over">
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Readout label="Clock" value={`${w.now} s`} />
        <Readout label="Server has" value={`version ${w.server}`} />
        <Readout label="Transferred" value={`${+w.kb.toFixed(1)} kB`} accent={w.kb > 0} />
      </div>

      <div className="mt-3 max-h-56 min-h-14 space-y-1 overflow-y-auto rounded-xl border border-line bg-surface-2 p-2" aria-live="polite">
        {w.rows.length === 0 && <p className="px-1 py-1 text-sm text-ink-3">Press <strong>Load the page</strong>. Each load adds a line here.</p>}
        {[...w.rows].reverse().map((r, i) => (
          <div key={w.rows.length - i} className="flex items-start gap-2 rounded-lg bg-surface px-2 py-1.5 text-[0.8rem] leading-snug text-ink-2">
            <span className={`mt-px shrink-0 rounded px-1.5 py-0.5 font-mono text-[10.5px] font-semibold ${KIND[r.kind].cls}`}>{KIND[r.kind].tag}</span>
            <span className="min-w-0">
              <span className="font-mono text-[11px] text-ink-3">t={r.at}s · shows v{r.shown}</span>
              {r.shown !== r.latest && <span className="ml-1 rounded bg-[var(--bad)]/15 px-1 font-mono text-[10.5px] text-bad">out of date</span>}
              <br />
              {r.detail}
            </span>
          </div>
        ))}
      </div>
      {last && (
        <Note tone={last.shown !== last.latest ? "bad" : "plain"}>
          {w.n200 + w.n304 + w.nCache + w.nStale} loads: {w.n200} full {w.n200 === 1 ? "download" : "downloads"}, {w.n304} × 304, {w.nCache} from the browser cache, {w.nStale} stale-while-revalidate.
        </Note>
      )}
    </div>
  );
}

export function checkHttp(state: unknown, goal: Record<string, unknown>) {
  const s = state as HttpState | undefined;
  if (!s) return false;
  if (typeof goal.n304Min === "number" && !(s.n304 >= goal.n304Min)) return false;
  if (typeof goal.nCacheMin === "number" && !(s.nCache >= goal.nCacheMin)) return false;
  if (typeof goal.nStaleMin === "number" && !(s.nStale >= goal.nStaleMin)) return false;
  if (typeof goal.n200Max === "number" && !(s.n200 <= goal.n200Max)) return false;
  if (typeof goal.everStale === "boolean" && s.everStale !== goal.everStale) return false;
  if (typeof goal.kbMax === "number" && !(s.kb <= goal.kbMax)) return false;
  if (typeof goal.cc === "string" && s.cc !== goal.cc) return false;
  if (typeof goal.last === "string" && s.last !== goal.last) return false;
  if (typeof goal.lastStale === "boolean" && s.lastStale !== goal.lastStale) return false;
  if (typeof goal.loadsMin === "number" && !(s.n200 + s.n304 + s.nCache + s.nStale >= goal.loadsMin)) return false;
  return true;
}
