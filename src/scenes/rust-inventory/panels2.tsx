"use client";

import React from "react";
import { ArrowDown, Check, X } from "lucide-react";
import { fmtNum, plural, type Peak } from "./data";
import { C, Empty, Meter, Pill, Tile } from "./ui";

/** Panels for lessons 7 to 12: line desk, closures, adaptor chain, aggregates, drift scan, report cards. */

// ───────────────────────── 7. line desk ─────────────────────────

export function LineDesk({ s, interactive }: { s: Peak; interactive: boolean }) {
  const rows = s.lineResults;
  if (!rows) return <Empty>No lines yet. Send them with scene(&quot;lineResults&quot;, …);</Empty>;
  const good = rows.filter((r) => r.ok).length;
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-[10.5px] text-white/70">
        <Pill tone="accent">{good} ok</Pill>
        <Pill tone={rows.length - good > 0 ? "danger" : "plain"}>{rows.length - good} rejected</Pill>
        <span className="ml-auto">each error carries its line number</span>
      </div>
      <ul className={`space-y-1 ${interactive ? "max-h-64 overflow-auto pr-0.5" : ""}`}>
        {rows.map((r, i) => (
          <li key={i} className="min-w-0 rounded-md border-l-2 bg-white/[0.04] px-2 py-1.5" style={{ borderColor: r.ok ? C.lime : C.red }}>
            <div className="flex min-w-0 items-start gap-2">
              <span className="w-5 shrink-0 text-right font-mono text-[10.5px] text-white/60">{r.line}</span>
              <span className="min-w-0 flex-1 break-all font-mono text-[10.5px] leading-snug text-white/85">{r.text === "" ? "(blank)" : r.text}</span>
              {r.ok ? <Check className="mt-[1px] h-3.5 w-3.5 shrink-0 text-[#c5ee8a]" aria-label="parsed" /> : <X className="mt-[1px] h-3.5 w-3.5 shrink-0 text-[#f87171]" aria-label="rejected" />}
            </div>
            {!r.ok && r.error && <p className="mt-0.5 break-words pl-7 text-[11px] leading-snug text-[#fecaca]">{r.error}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ───────────────────────── 8. instrument rack ─────────────────────────

const KIND_COLOR: Record<string, string> = { Fn: C.lime, FnMut: C.amber, FnOnce: C.violet };

function ClosureSets({ names }: { names: Record<string, string[]> }) {
  const t = { fontSize: 10, fontFamily: "var(--font-mono), monospace" } as const;
  // names wrapped onto at most two lines of `n` characters
  const wrap = (k: string, n: number): string[] => {
    const out: string[] = [];
    let cur = "";
    for (const name of names[k] ?? []) {
      const next = cur ? `${cur}, ${name}` : name;
      if (cur && next.length > n) {
        out.push(cur + ",");
        cur = name;
      } else cur = next;
    }
    if (cur) out.push(cur);
    const clip = (l: string) => (l.length > n ? l.slice(0, n - 1) + "…" : l);
    if (out.length > 2) return [out[0], clip(out[1].replace(/,$/, "") + " …")];
    return out.map(clip);
  };
  const lines = (k: string, n: number, x: number, y: number, fill: string) =>
    (wrap(k, n).length ? wrap(k, n) : ["—"]).map((l, i) => (
      <text key={`${k}${i}`} x={x} y={y + i * 12} {...t} fontSize={9.5} fill={fill}>
        {l}
      </text>
    ));
  return (
    <svg viewBox="0 0 360 112" className="block w-full" role="img" aria-label="Fn is inside FnMut is inside FnOnce">
      <rect x="2" y="2" width="356" height="108" rx="12" fill="rgba(196,168,255,0.07)" stroke="rgba(196,168,255,0.55)" />
      <text x="12" y="17" {...t} fill={C.violet}>FnOnce: can be called once</text>
      {lines("FnOnce", 13, 12, 64, C.violet)}
      <rect x="112" y="24" width="240" height="80" rx="10" fill="rgba(251,191,36,0.07)" stroke="rgba(251,191,36,0.55)" />
      <text x="120" y="38" {...t} fill={C.amber}>FnMut: may change captures</text>
      {lines("FnMut", 13, 120, 84, C.amber)}
      <rect x="222" y="46" width="122" height="52" rx="8" fill="rgba(197,238,138,0.08)" stroke="rgba(197,238,138,0.6)" />
      <text x="229" y="60" {...t} fill={C.limeSoft}>Fn: only reads</text>
      {lines("Fn", 17, 229, 76, C.limeSoft)}
    </svg>
  );
}

export function InstrumentRack({ s }: { s: Peak }) {
  const closures = s.closures;
  const rack = s.rack;
  if (!closures && !rack) return <Empty>No closures yet. Send them with scene(&quot;closures&quot;, …);</Empty>;
  const names: Record<string, string[]> = {};
  for (const c of closures ?? []) (names[c.kind] ??= []).push(c.name);
  const total = s.records?.length;
  const max = Math.max(1, total ?? 0, ...(rack ?? []).map((r) => r.matches));
  return (
    <div className="space-y-2.5">
      {closures && <ClosureSets names={names} />}
      {closures && (
        <ul className="space-y-1.5">
          {closures.map((c, i) => {
            const col = KIND_COLOR[c.kind] ?? "#e8e8e8";
            return (
              <li key={i} className="min-w-0 rounded-md bg-white/[0.04] px-2.5 py-1.5">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="min-w-0 truncate font-mono text-[11.5px] font-semibold text-[#f4f4f4]">{c.name}</span>
                  <span className="shrink-0 rounded-full border px-2 font-mono text-[10px]" style={{ borderColor: `${col}88`, color: col }}>
                    {c.kind}
                  </span>
                  <span className="ml-auto min-w-0 truncate font-mono text-[11px] text-[#d3f3a4]" title={c.result}>
                    {c.result}
                  </span>
                </div>
                {c.captures && <p className="mt-0.5 break-words text-[10.5px] leading-snug text-white/70">captures: {c.captures}</p>}
              </li>
            );
          })}
        </ul>
      )}
      {rack && rack.length > 0 && (
        <div className="rounded-md bg-black/35 px-2.5 py-2">
          <p className="hud-label !text-white/65">Box&lt;dyn Fn(&amp;Record) -&gt; bool&gt; rack{total !== undefined ? ` · ${plural(total, "star")}` : ""}</p>
          <ul className="mt-1.5 space-y-1.5">
            {rack.map((r, i) => (
              <li key={i}>
                <div className="flex items-baseline justify-between gap-2 font-mono text-[11px]">
                  <span className="min-w-0 truncate text-[#f4f4f4]">{r.filter}</span>
                  <span className="shrink-0 text-[#d3f3a4]">{r.matches}</span>
                </div>
                <Meter value={r.matches} max={max} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ───────────────────────── 9. adaptor chain ─────────────────────────

export function AdaptorChain({ s }: { s: Peak }) {
  const chain = s.chain;
  if (!chain || chain.length === 0) return <Empty>No stages yet. Send them with scene(&quot;chain&quot;, …);</Empty>;
  const max = Math.max(1, ...chain.map((c) => c.count));
  return (
    <div className="space-y-1">
      {chain.map((c, i) => {
        const prev = i > 0 ? chain[i - 1].count : undefined;
        const dropped = prev !== undefined ? prev - c.count : 0;
        const last = i === chain.length - 1;
        return (
          <React.Fragment key={i}>
            {dropped !== 0 && (
              <div className="flex items-center justify-center gap-1 text-[10px] text-white/65" aria-label={`${Math.abs(dropped)} ${dropped > 0 ? "dropped" : "added"}`}>
                <ArrowDown className="h-3 w-3" aria-hidden />
                <span className={dropped > 0 ? "text-[#fbbf24]" : "text-[#8aa4ff]"}>{dropped > 0 ? `${dropped} dropped` : `${-dropped} added`}</span>
              </div>
            )}
            <div>
              <div className="flex items-baseline justify-between gap-2 font-mono text-[11px]">
                <span className="min-w-0 truncate text-white/85">{c.stage}</span>
                <span className={`shrink-0 text-[13px] font-semibold ${last ? "text-[#d3f3a4]" : "text-[#f4f4f4]"}`}>{c.count}</span>
              </div>
              <div className="mx-auto mt-0.5 h-3 rounded-[4px]" style={{ width: `${Math.max(3, (c.count / max) * 100)}%`, background: last ? "rgba(197,238,138,0.75)" : "rgba(197,238,138,0.32)", boxShadow: "inset 0 0 0 1px rgba(197,238,138,0.5)" }} />
            </div>
          </React.Fragment>
        );
      })}
      {s.shortlist && s.shortlist.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1.5">
          <span className="hud-label !text-white/65">shortlist</span>
          {s.shortlist.map((n, i) => (
            <Pill key={i} tone="accent">
              {n}
            </Pill>
          ))}
        </div>
      )}
    </div>
  );
}

// ───────────────────────── 10. aggregates ─────────────────────────

export function Aggregates({ s }: { s: Peak }) {
  const groups = s.byConstellation ? Object.entries(s.byConstellation) : [];
  const bright = s.brightNames ?? [];
  const dim = s.dimNames ?? [];
  const sum = bright.length + dim.length;
  const hasAny = s.totalLy !== undefined || s.nearest !== undefined || groups.length > 0 || sum > 0 || s.allOrNothing !== undefined;
  if (!hasAny) return <Empty>No aggregates yet. Send totalLy, nearest, byConstellation … with scene(…);</Empty>;
  return (
    <div className="space-y-2.5">
      <dl className="grid grid-cols-3 gap-1.5">
        <Tile label="Total" value={s.totalLy !== undefined ? fmtNum(s.totalLy) : undefined} unit="ly" tone="accent" />
        <Tile label="Nearest" value={s.nearest} />
        <Tile label="Faintest" value={s.faintest} />
      </dl>
      {groups.length > 0 && (
        <div>
          <p className="hud-label mb-1 !text-white/65">collect into a BTreeMap · {plural(groups.length, "group")}</p>
          <ul className="space-y-1">
            {groups.map(([name, stars]) => (
              <li key={name} className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1">
                <span className="w-24 shrink-0 truncate font-mono text-[11px] text-[#f4f4f4]">{name}</span>
                {stars.map((n, i) => (
                  <Pill key={i} tone="plain">
                    {n}
                  </Pill>
                ))}
              </li>
            ))}
          </ul>
        </div>
      )}
      {sum > 0 && (
        <div>
          <p className="hud-label mb-1 !text-white/65">partition · magnitude below 1.0</p>
          <div className="flex h-3 w-full overflow-hidden rounded-full bg-white/10">
            <span style={{ width: `${(bright.length / sum) * 100}%`, background: "rgba(197,238,138,0.8)" }} title={bright.join(", ")} />
            <span style={{ width: `${(dim.length / sum) * 100}%`, background: "rgba(154,163,154,0.7)" }} title={dim.join(", ")} />
          </div>
          <div className="mt-1 flex justify-between gap-3 text-[10.5px]">
            <span className="min-w-0 text-[#d3f3a4]">
              <span className="font-semibold">{bright.length} bright</span> <span className="text-white/65">{bright.join(", ")}</span>
            </span>
            <span className="min-w-0 text-right text-[#d9dcc9]">
              <span className="font-semibold">{dim.length} dim</span> <span className="text-white/65">{dim.join(", ")}</span>
            </span>
          </div>
        </div>
      )}
      {s.allOrNothing && (
        <div className="rounded-md bg-black/35 px-2.5 py-2">
          <p className="hud-label !text-white/65">collect::&lt;Result&lt;Vec&lt;_&gt;, _&gt;&gt; · all or nothing</p>
          <ul className="mt-1 space-y-1 text-[11px]">
            {[
              ["tidy batch", s.allOrNothing.tidy, true],
              ["smudged batch", s.allOrNothing.smudged, false],
            ].map(([label, text, ok]) =>
              text === undefined ? null : (
                <li key={String(label)} className="flex min-w-0 items-start gap-1.5">
                  {ok ? <Check className="mt-[2px] h-3 w-3 shrink-0 text-[#c5ee8a]" aria-hidden /> : <X className="mt-[2px] h-3 w-3 shrink-0 text-[#f87171]" aria-hidden />}
                  <span className="shrink-0 font-mono text-[#f4f4f4]">{String(label)}</span>
                  <span className="min-w-0 break-words text-white/80">{String(text)}</span>
                </li>
              ),
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

// ───────────────────────── 11. drift scan ─────────────────────────

export function DriftScan({ s }: { s: Peak }) {
  const hours = s.sweepHours;
  const stars = s.hourStars;
  if (!hours && !stars) return <Empty>No sweep yet. Send sweepHours and hourStars with scene(…);</Empty>;
  const yielded = new Set(hours ?? []);
  const perHour = new Map((stars ?? []).map((h) => [Math.round(h.hour), h.stars]));
  const busiest = (stars ?? []).reduce<{ hour: number; stars: number } | undefined>((best, h) => (!best || h.stars > best.stars ? h : best), undefined);
  const x = (h: number) => 14 + h * 14.1;
  const t = { fontSize: 9.5, fontFamily: "var(--font-mono), monospace" } as const;
  const base = 104;
  const cap = 5;
  return (
    <div className="space-y-2">
      <svg viewBox="0 0 360 138" className="block w-full" role="img" aria-label="A 24-hour right ascension ruler with the hours the sweep visited and the stars in each hour">
        <path d={`M8 ${base} H352`} stroke="rgba(255,255,255,0.3)" />
        {Array.from({ length: 24 }, (_, h) => {
          const on = yielded.has(h);
          const major = h % 3 === 0;
          return (
            <g key={h}>
              <path d={`M${x(h)} ${base} v${on ? 9 : 5}`} stroke={on ? C.lime : "rgba(255,255,255,0.3)"} strokeWidth={on ? 1.8 : 1} />
              {major && (
                <text x={x(h)} y={base + 24} textAnchor="middle" {...t} fill="rgba(255,255,255,0.7)">
                  {h}h
                </text>
              )}
            </g>
          );
        })}
        {Array.from(perHour.entries()).map(([h, n]) => {
          const best = busiest && Math.round(busiest.hour) === h;
          return (
            <g key={h}>
              {Array.from({ length: Math.min(n, cap) }, (_, k) => (
                <circle key={k} cx={x(h)} cy={base - 9 - k * 9} r={3.6} fill={best ? C.cream : "#e9ecd8"} stroke={best ? C.lime : "none"} strokeWidth="1.2" />
              ))}
              {n > cap && (
                <text x={x(h)} y={base - 9 - cap * 9} textAnchor="middle" {...t} fill={C.limeSoft}>
                  +{n - cap}
                </text>
              )}
            </g>
          );
        })}
        {(hours?.length ?? 0) > 0 && (
          <g className="cp-beam" style={{ ["--cp-dist" as string]: "322px" }}>
            <rect x={x(0) - 1} y="6" width="2" height={base - 6} fill="url(#cp-beam-grad)" />
          </g>
        )}
        <defs>
          <linearGradient id="cp-beam-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={C.lime} stopOpacity="0" />
            <stop offset="1" stopColor={C.lime} stopOpacity="0.8" />
          </linearGradient>
        </defs>
        <text x="8" y="14" {...t} fill="rgba(255,255,255,0.65)">right ascension, one tick per hour</text>
      </svg>
      <dl className="grid grid-cols-3 gap-1.5">
        <Tile label="Hours visited" value={hours ? hours.length : undefined} tone="accent" />
        <Tile label="Busiest hour" value={busiest ? `${busiest.hour} h` : undefined} />
        <Tile label="Stars there" value={busiest?.stars} />
      </dl>
    </div>
  );
}

// ───────────────────────── 12. report cards ─────────────────────────

export function ReportCards({ s }: { s: Peak }) {
  const rows = s.rows;
  if (!rows && !s.summaryCard) return <Empty>No cards yet. Send rows and summaryCard with scene(…);</Empty>;
  return (
    <div className="space-y-2.5">
      {rows && (
        <div className="max-w-full overflow-x-auto rounded-md bg-black/40 px-2.5 py-2">
          <pre className="font-mono text-[10.5px] leading-[1.6] text-[#e4f7c6]">
            <span className="text-white/60">{"STAR       CONSTELLATION   MAG  DISTANCE\n"}</span>
            {rows.join("\n")}
          </pre>
        </div>
      )}
      {s.summaryCard && (
        <div className="max-w-full overflow-x-auto rounded-md border border-[#c5ee8a]/35 bg-[#c5ee8a]/[0.05] px-2.5 py-2">
          <pre className="font-mono text-[10.5px] leading-[1.6] text-[#e4f7c6]">{s.summaryCard}</pre>
        </div>
      )}
      {s.debugLine && (
        <div>
          <p className="hud-label !text-white/65">{"{:?}"} Debug view</p>
          <p className="mt-0.5 break-all rounded-md bg-black/30 px-2 py-1.5 font-mono text-[10px] leading-snug text-white/70">{s.debugLine}</p>
        </div>
      )}
    </div>
  );
}
