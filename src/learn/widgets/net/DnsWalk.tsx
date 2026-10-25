"use client";

import React, { useState } from "react";
import { BookOpen, Clock, Database, FastForward, Globe2, Laptop, Search, StepForward, Trees } from "lucide-react";
import type { WidgetProps } from "@/learn/widget";
import { Caption, Note, Readout } from "./ui";

/**
 * DNS resolution step by step: the browser's cache, then the resolver, which (if it hasn't cached
 * the answer) walks root → TLD → authoritative name server. Answers are cached with a TTL, so a
 * second lookup is instant; "Wait 5 minutes" lets the cached answer expire.
 */

type ServerId = "browser" | "resolver" | "root" | "tld" | "auth";

const ADDRS: Record<string, string> = {
  "www.example.com": "203.0.113.80",
  "mail.example.com": "203.0.113.25",
  "shop.example.com": "203.0.113.80",
  "www.example.org": "198.51.100.10",
};
const ipFor = (name: string) => ADDRS[name] ?? `198.51.100.${(name.length * 37) % 250}`;
const RECORD_TTL = 300;
const ZONE_TTL = 86400;
const TLD_TTL = 172800;

const tldOf = (name: string) => "." + name.split(".").pop();
const zoneOf = (name: string) => name.split(".").slice(-2).join(".");

interface Hop {
  server: ServerId;
  text: string;
  ms: number;
}
interface Caches {
  browser: Record<string, number>;
  resolver: Record<string, number>;
  zones: Record<string, number>;
  tlds: Record<string, number>;
}
interface Walk {
  name: string;
  hops: Hop[];
  next: Caches;
  hit: "browser" | "resolver" | null;
}

function plan(name: string, c: Caches, now: number): Walk {
  const ip = ipFor(name);
  const alive = (m: Record<string, number>, k: string) => (m[k] ?? -1) > now;
  const hops: Hop[] = [];
  const next: Caches = { browser: { ...c.browser }, resolver: { ...c.resolver }, zones: { ...c.zones }, tlds: { ...c.tlds } };
  if (alive(c.browser, name)) {
    hops.push({ server: "browser", text: `Found ${name} in its own cache: ${ip} (${c.browser[name] - now} s left).`, ms: 0 });
    return { name, hops, next, hit: "browser" };
  }
  hops.push({ server: "browser", text: `Not in its cache. Asks the resolver: "What is ${name}?"`, ms: 1 });
  if (alive(c.resolver, name)) {
    hops.push({ server: "resolver", text: `Has it cached: ${ip} (${c.resolver[name] - now} s left). Answers straight away.`, ms: 10 });
    next.browser[name] = c.resolver[name];
    return { name, hops, next, hit: "resolver" };
  }
  const tld = tldOf(name);
  const zone = zoneOf(name);
  if (!alive(c.zones, zone)) {
    if (!alive(c.tlds, tld)) {
      hops.push({ server: "resolver", text: `Not cached. Starts at the top and asks a root server.`, ms: 1 });
      hops.push({ server: "root", text: `"I don't know ${name}, but the ${tld} servers will. Ask them."`, ms: 25 });
      next.tlds[tld] = now + TLD_TTL;
    } else {
      hops.push({ server: "resolver", text: `Not cached, but it remembers the ${tld} servers, so it skips the root.`, ms: 1 });
    }
    hops.push({ server: "tld", text: `"${zone} is handled by ns1.${zone}. Ask that server."`, ms: 25 });
    next.zones[zone] = now + ZONE_TTL;
  } else {
    hops.push({ server: "resolver", text: `Not cached, but it remembers ${zone}'s name server, so it asks it directly.`, ms: 1 });
  }
  hops.push({ server: "auth", text: `"${name} is ${ip}. You may keep that for ${RECORD_TTL} s."`, ms: 30 });
  hops.push({ server: "resolver", text: `Caches the answer and passes ${ip} back to the browser.`, ms: 10 });
  next.resolver[name] = now + RECORD_TTL;
  next.browser[name] = now + RECORD_TTL;
  return { name, hops, next, hit: null };
}

const SERVERS: { id: ServerId; name: string; sub: (name: string) => string; icon: typeof Globe2 }[] = [
  { id: "browser", name: "Browser", sub: () => "checks its own cache first", icon: Laptop },
  { id: "resolver", name: "Resolver", sub: () => "your provider's, or a public one", icon: Search },
  { id: "root", name: "Root server", sub: () => "knows where every TLD lives", icon: Trees },
  { id: "tld", name: "TLD server", sub: (n) => `knows every ${tldOf(n)} domain's name server`, icon: Globe2 },
  { id: "auth", name: "Authoritative server", sub: (n) => `ns1.${zoneOf(n)}, holds the real records`, icon: BookOpen },
];

export interface DnsWalkProps {
  names?: string[];
  /** Hide the "wait" button. */
  noWait?: boolean;
}

export interface DnsWalkState {
  lookups: number;
  done: boolean;
  name: string;
  asked: ServerId[];
  ms: number;
  cacheHit: "browser" | "resolver" | null;
  waited: boolean;
}

export function DnsWalk({ props, onChange, revealed }: WidgetProps<DnsWalkProps>) {
  const names = props.names ?? ["www.example.com", "mail.example.com", "www.example.org"];
  const [name, setName] = useState(names[0]);
  const [now, setNow] = useState(0);
  const [waited, setWaited] = useState(false);
  const [caches, setCaches] = useState<Caches>({ browser: {}, resolver: {}, zones: {}, tlds: {} });
  const [walk, setWalk] = useState<Walk | null>(null);
  const [shown, setShown] = useState(0);
  const [lookups, setLookups] = useState(0);
  const busy = walk !== null && shown < walk.hops.length;

  const report = (w: Walk | null, s: number, n: number, wt: boolean) => {
    const vis = w ? w.hops.slice(0, s) : [];
    const done = Boolean(w && s >= w.hops.length);
    onChange?.({
      lookups: n,
      done,
      name: w?.name ?? name,
      asked: [...new Set(vis.map((h) => h.server))],
      ms: vis.reduce((t, h) => t + h.ms, 0),
      cacheHit: done ? (w?.hit ?? null) : null,
      waited: wt,
    } satisfies DnsWalkState);
  };

  const advance = (w: Walk, to: number, from = shown) => {
    const s = Math.min(w.hops.length, to);
    setShown(s);
    let n = lookups;
    if (s >= w.hops.length && from < w.hops.length) {
      setCaches(w.next);
      n = lookups + 1;
      setLookups(n);
    }
    report(w, s, n, waited);
  };

  const lookUp = () => {
    if (revealed || busy) return;
    const w = plan(name, caches, now);
    setWalk(w);
    advance(w, 1, 0);
  };
  const wait = () => {
    if (revealed || busy) return;
    setNow(now + RECORD_TTL + 1);
    setWaited(true);
    report(walk, shown, lookups, true);
  };
  const pick = (n: string) => {
    if (revealed || busy) return;
    setName(n);
  };

  const vis = walk ? walk.hops.slice(0, shown) : [];
  const current = vis.length ? vis[vis.length - 1].server : null;
  const askedSet = new Set(vis.map((h) => h.server));
  const ms = vis.reduce((t, h) => t + h.ms, 0);
  const done = Boolean(walk && shown >= walk.hops.length);
  const entries = (m: Record<string, number>) => Object.entries(m).filter(([, exp]) => exp > now);
  const browserEntries = entries(caches.browser);
  const resolverEntries = [...entries(caches.resolver).map(([k, e]) => `${k} → ${ipFor(k)} · ${e - now} s`), ...entries(caches.zones).map(([k]) => `${k} → ns1.${k}`), ...entries(caches.tlds).map(([k]) => `${k} servers`)];

  return (
    <div className="w-full max-w-2xl">
      <div className="flex flex-wrap items-center gap-1.5">
        {names.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => pick(n)}
            disabled={revealed || busy}
            aria-pressed={name === n}
            className={`min-h-10 rounded-full border px-3 font-mono text-[12.5px] transition-colors disabled:cursor-default ${
              name === n ? "border-transparent bg-primary font-semibold text-primary-ink" : "border-line bg-surface text-ink hover:border-[var(--line-strong)]"
            } ${busy && name !== n ? "opacity-50" : ""}`}
          >
            {n}
          </button>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {!busy ? (
          <button type="button" className="btn btn-primary !h-10" onClick={lookUp} disabled={revealed}>
            <Search className="h-4 w-4" /> Look up {name}
          </button>
        ) : (
          <>
            <button type="button" className="btn btn-primary !h-10" onClick={() => walk && advance(walk, shown + 1)} disabled={revealed}>
              <StepForward className="h-4 w-4" /> Next step
            </button>
            <button type="button" className="btn !h-10" onClick={() => walk && advance(walk, walk.hops.length)} disabled={revealed}>
              <FastForward className="h-4 w-4" /> Finish
            </button>
          </>
        )}
        {!props.noWait && (
          <button type="button" className="btn !h-10" onClick={wait} disabled={revealed || busy}>
            <Clock className="h-4 w-4" /> Wait 5 minutes
          </button>
        )}
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <ol className="grid gap-1.5">
          {SERVERS.map((s) => {
            const Icon = s.icon;
            const on = current === s.id;
            const asked = askedSet.has(s.id);
            return (
              <li
                key={s.id}
                className={`flex min-h-12 items-center gap-2.5 rounded-xl border px-3 py-1.5 transition-colors ${
                  on ? "border-[var(--brand)] bg-tint" : asked ? "border-[var(--brand)]/40 bg-surface" : "border-line bg-surface"
                }`}
              >
                <Icon className={`h-4 w-4 shrink-0 ${asked ? "text-brand" : "text-ink-3"}`} />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-ink">{s.id === "tld" ? `${tldOf(walk?.name ?? name)} TLD server` : s.name}</span>
                  <span className="block truncate text-[11.5px] text-ink-3">{s.sub(walk?.name ?? name)}</span>
                </span>
                {asked && <span className="chip shrink-0">{s.id === "browser" || s.id === "resolver" ? "checked" : "asked"}</span>}
              </li>
            );
          })}
        </ol>

        <div className="grid content-start gap-2">
          <div className="rounded-xl border border-line bg-surface-2 p-3" aria-live="polite">
            <div className="flex items-center justify-between gap-2">
              <Caption>{walk ? `Looking up ${walk.name}` : "Steps"}</Caption>
              <Readout label="Time" value={`${ms} ms`} accent={done} />
            </div>
            {vis.length === 0 ? (
              <p className="mt-2 text-sm text-ink-3">Pick a name and look it up.</p>
            ) : (
              <ol className="mt-2 grid gap-1.5">
                {vis.map((h, i) => (
                  <li key={`${lookups}-${i}`} className={`text-[12.5px] leading-snug text-ink-2 ${i === vis.length - 1 ? "pop-in" : ""}`}>
                    <span className="font-semibold text-ink">{SERVERS.find((x) => x.id === h.server)?.name.replace("TLD server", `${tldOf(walk!.name)} server`)}:</span> {h.text}
                  </li>
                ))}
              </ol>
            )}
            {done && walk && (
              <Note tone="good" className="pop-in mt-2">
                {walk.name} = <span className="font-mono font-semibold">{ipFor(walk.name)}</span>
                {walk.hit === "browser" ? ", straight from the browser's cache." : walk.hit === "resolver" ? ", from the resolver's cache." : ", after the full walk."}
              </Note>
            )}
          </div>

          <div className="rounded-xl border border-line bg-surface p-3">
            <div className="flex items-center gap-2">
              <Database className="h-3.5 w-3.5 text-ink-3" />
              <Caption>Caches</Caption>
              {waited && <span className="ml-auto font-mono text-[11px] text-ink-3">clock: +{now} s</span>}
            </div>
            <p className="mt-1.5 text-[12px] text-ink-3">Browser</p>
            <div className="font-mono text-[12px] text-ink">
              {browserEntries.length ? browserEntries.map(([k, e]) => <p key={k}>{`${k} → ${ipFor(k)} · ${e - now} s`}</p>) : "empty"}
            </div>
            <p className="mt-1.5 text-[12px] text-ink-3">Resolver</p>
            <div className="font-mono text-[12px] text-ink">
              {resolverEntries.length ? resolverEntries.map((e) => <p key={e}>{e}</p>) : "empty"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function checkDnsWalk(state: unknown, goal: Record<string, unknown>) {
  const st = state as DnsWalkState | undefined;
  if (!st) return false;
  if (goal.done === true && !st.done) return false;
  if (typeof goal.name === "string" && st.name !== goal.name) return false;
  if (goal.cacheHit !== undefined && st.cacheHit !== goal.cacheHit) return false;
  if (Array.isArray(goal.asked) && !goal.asked.every((s) => st.asked.includes(s as ServerId))) return false;
  if (Array.isArray(goal.notAsked) && goal.notAsked.some((s) => st.asked.includes(s as ServerId))) return false;
  if (typeof goal.minLookups === "number" && st.lookups < goal.minLookups) return false;
  return true;
}
