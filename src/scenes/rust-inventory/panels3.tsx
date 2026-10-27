"use client";

import React from "react";
import { Check, CircleCheck, X } from "lucide-react";
import { fmtNum, plural, type LineKind, type Peak } from "./data";
import { bandColor } from "./sky";
import { C, Empty, Meter, Pill, Tile } from "./ui";

/** Panels for lessons 13 to 16: sort desk, test results, intake bench, night report. */

// ───────────────────────── 13. sort desk ─────────────────────────

export function SortDesk({ s, interactive }: { s: Peak; interactive: boolean }) {
  const ranking = s.ranking;
  if (!ranking) return <Empty>No ranking yet. Send it with scene(&quot;ranking&quot;, …);</Empty>;
  const t = s.totals;
  return (
    <div className="space-y-2.5">
      <ol className={`space-y-0.5 ${interactive ? "max-h-64 overflow-auto pr-0.5" : ""}`}>
        {ranking.map((r, i) => {
          const newBand = i === 0 || r.band !== ranking[i - 1].band;
          const col = bandColor(r.band);
          const fill = r.mag === undefined ? 0 : Math.min(100, Math.max(6, ((2 - r.mag) / 3.6) * 100));
          return (
            <React.Fragment key={`${r.name}-${i}`}>
              {newBand && r.band && (
                <li className="flex items-center gap-2 pt-1 first:pt-0" aria-hidden>
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: col }} />
                  <span className="hud-label !text-white/70">{r.band}</span>
                  <span className="h-px flex-1 bg-white/10" />
                </li>
              )}
              <li className="grid min-w-0 grid-cols-[1.4rem_minmax(0,6.5rem)_minmax(0,1fr)_auto] items-center gap-2 text-[11px]">
                <span className="text-right font-mono text-[10.5px] text-white/60">{r.rank}</span>
                <span className="truncate font-mono text-[#f4f4f4]">{r.name}</span>
                <span className="h-1.5 overflow-hidden rounded-full bg-white/10" title={r.mag !== undefined ? `magnitude ${r.mag}` : undefined}>
                  <span className="block h-full rounded-full" style={{ width: `${fill}%`, background: col, opacity: 0.85 }} />
                </span>
                <span className="font-mono text-[10.5px] text-white/70">{r.dist !== undefined ? `${fmtNum(r.dist)} ly` : ""}</span>
              </li>
            </React.Fragment>
          );
        })}
      </ol>
      <p className="text-[10px] text-white/60">sorted by Band (derive Ord), then nearest first: .cmp().then(…)</p>
      {s.farthest && s.farthest.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="hud-label !text-white/65">farthest first</span>
          {s.farthest.map((n, i) => (
            <Pill key={i} tone="plain">
              {i + 1}. {n}
            </Pill>
          ))}
        </div>
      )}
      {t && (
        <dl className="grid grid-cols-2 gap-1.5 @xl:grid-cols-4">
          <Tile label="Stars" value={t.stars} tone="accent" />
          <Tile label="Total" value={t.totalLy !== undefined ? fmtNum(t.totalLy) : undefined} unit="ly" />
          <Tile label="Brilliant" value={t.brilliant} />
          <Tile label="Notes" value={t.notes} />
        </dl>
      )}
    </div>
  );
}

// ───────────────────────── 14. test results ─────────────────────────

export function TestResults({ s }: { s: Peak }) {
  const tests = s.tests;
  if (!tests) return <Empty>No tests yet. Send them with scene(&quot;tests&quot;, …);</Empty>;
  const passed = s.testSummary?.passed ?? tests.filter((t) => t.ok).length;
  const failed = s.testSummary?.failed ?? tests.length - passed;
  const all = passed + failed;
  return (
    <div className="space-y-2">
      <p className="font-mono text-[10.5px] text-white/70">running {plural(tests.length, "test")}</p>
      <ul className="space-y-0.5 rounded-md bg-black/40 px-2.5 py-2 font-mono text-[10.5px] leading-snug">
        {tests.map((t, i) => (
          <li key={i} className="min-w-0">
            <div className="flex min-w-0 items-baseline gap-1.5">
              <span className="text-white/65">test</span>
              <span className="min-w-0 truncate text-[#f4f4f4]" title={t.name}>
                {t.name}
              </span>
              <span className="shrink-0 text-white/40" aria-hidden>
                ...
              </span>
              <span className={`shrink-0 font-semibold ${t.ok ? "text-[#c5ee8a]" : "text-[#f87171]"}`}>{t.ok ? "ok" : "FAILED"}</span>
            </div>
            {!t.ok && t.message && <p className="break-words pl-5 text-[#fecaca]">{t.message}</p>}
          </li>
        ))}
      </ul>
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-white/10" role="img" aria-label={`${passed} passed, ${failed} failed`}>
        {all > 0 && <span style={{ width: `${(passed / all) * 100}%`, background: C.lime }} />}
        {all > 0 && failed > 0 && <span style={{ width: `${(failed / all) * 100}%`, background: C.red }} />}
      </div>
      <p className="font-mono text-[11px]">
        <span className="text-white/70">test result: </span>
        <span className={failed === 0 ? "font-semibold text-[#c5ee8a]" : "font-semibold text-[#f87171]"}>{failed === 0 ? "ok" : "FAILED"}</span>
        <span className="text-white/85">
          . {passed} passed; {failed} failed
        </span>
      </p>
    </div>
  );
}

// ───────────────────────── 15. intake bench ─────────────────────────

const KIND_STYLE: Record<LineKind, { bar: string; label: string }> = {
  comment: { bar: "rgba(138,164,255,0.45)", label: "comment" },
  blank: { bar: "rgba(255,255,255,0.12)", label: "blank" },
  record: { bar: "rgba(197,238,138,0.8)", label: "record" },
  error: { bar: "rgba(248,113,113,0.85)", label: "rejected" },
};

export function IntakeBench({ s, interactive }: { s: Peak; interactive: boolean }) {
  const lines = s.fileLines;
  const k = s.intake;
  if (!lines && !k) return <Empty>No intake yet. Send fileLines and intake with scene(…);</Empty>;
  const widest = Math.max(1, ...(lines ?? []).map((l) => l.text.length));
  return (
    <div className="space-y-2.5">
      {k && (
        <dl className="grid grid-cols-5 gap-1.5">
          <Tile label="Read" value={k.read} />
          <Tile label="Comments" value={k.comments} tone="blue" />
          <Tile label="Blank" value={k.blanks} />
          <Tile label="In" value={k.accepted} tone="accent" />
          <Tile label="Out" value={k.rejected} tone={k.rejected ? "danger" : "plain"} />
        </dl>
      )}
      {lines && (
        <div>
          <ul className={`space-y-[3px] ${interactive ? "max-h-56 overflow-auto pr-0.5" : "max-h-40 overflow-hidden"}`} aria-label="The input file, one bar per line">
            {lines.map((l) => (
              <li key={l.n} className="flex min-w-0 items-center gap-2" title={`${l.n}: ${l.text}`}>
                <span className="w-5 shrink-0 text-right font-mono text-[9.5px] text-white/60">{l.n}</span>
                <span className="h-[7px] rounded-sm" style={{ width: `${Math.max(l.kind === "blank" ? 4 : 10, (l.text.length / widest) * 62)}%`, background: KIND_STYLE[l.kind].bar }} />
                {l.kind === "error" && <span className="min-w-0 truncate font-mono text-[10px] text-[#fecaca]">{l.text}</span>}
              </li>
            ))}
          </ul>
          <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-white/70">
            {(Object.keys(KIND_STYLE) as LineKind[]).map((kind) => (
              <span key={kind} className="flex items-center gap-1">
                <span className="inline-block h-[7px] w-3 rounded-sm" style={{ background: KIND_STYLE[kind].bar }} />
                {KIND_STYLE[kind].label}
              </span>
            ))}
          </div>
        </div>
      )}
      {(s.problems ?? []).length > 0 && (
        <div className="rounded-md bg-black/35 px-2.5 py-2">
          <p className="hud-label !text-white/65">every problem, not just the first</p>
          <ul className="mt-1 space-y-0.5">
            {(s.problems ?? []).map((p, i) => (
              <li key={i} className="flex min-w-0 items-start gap-1.5 text-[11px] leading-snug text-[#fecaca]">
                <X className="mt-[2px] h-3 w-3 shrink-0 text-[#f87171]" aria-hidden />
                <span className="min-w-0 break-words">{p}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ───────────────────────── 16. night report ─────────────────────────

export function NightReport({ s, liveCount, total }: { s: Peak; liveCount: number; total: number }) {
  const r = s.report;
  if (!r) return <Empty>No report yet. Send it with scene(&quot;report&quot;, …);</Empty>;
  const groups = r.constellations ? Object.entries(r.constellations) : [];
  const max = Math.max(1, ...groups.map(([, n]) => n));
  const passed = s.testSummary?.passed;
  const failed = s.testSummary?.failed ?? 0;
  return (
    <div className="space-y-2.5">
      <div className="rounded-md border border-[#c5ee8a]/35 bg-[#c5ee8a]/[0.05] px-3 py-2.5">
        <p className="hud-title !text-[#d3f3a4]">Corvid Peak{r.night !== undefined ? `, night ${r.night}` : ""}</p>
        <dl className="mt-1.5 space-y-0.5 font-mono text-[11px]">
          {(
            [
              ["lines read", r.read],
              ["stars accepted", r.accepted],
              ["lines rejected", r.rejected],
              ["nearest", r.nearest],
              ["faintest", r.faintest],
              ["mean distance", r.meanLy !== undefined ? `${fmtNum(r.meanLy, 1)} ly` : undefined],
            ] as [string, string | number | undefined][]
          ).map(([k, v]) => (
            <div key={k} className="flex min-w-0 items-baseline gap-2">
              <dt className="shrink-0 text-white/70">{k}</dt>
              <span className="min-w-0 flex-1 translate-y-[-3px] border-b border-dotted border-white/20" aria-hidden />
              <dd className="shrink-0 text-[#f4f4f4]">{v ?? "—"}</dd>
            </div>
          ))}
        </dl>
      </div>
      {groups.length > 0 && (
        <div>
          <p className="hud-label mb-1 !text-white/65">stars per constellation</p>
          <ul className="space-y-1">
            {groups.map(([name, n]) => (
              <li key={name} className="grid grid-cols-[minmax(0,6.5rem)_minmax(0,1fr)_1rem] items-center gap-2 text-[11px]">
                <span className="truncate font-mono text-white/85">{name}</span>
                <Meter value={n} max={max} />
                <span className="text-right font-mono text-[10.5px] text-[#d3f3a4]">{n}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        {passed !== undefined && (
          <Pill tone={failed === 0 ? "accent" : "danger"}>
            <Check className="mr-1 h-3 w-3" aria-hidden />
            self-test {passed}/{passed + failed}
          </Pill>
        )}
        <Pill tone={liveCount === total ? "accent" : "plain"}>
          <CircleCheck className="mr-1 h-3 w-3" aria-hidden />
          {liveCount}/{total} panels live
        </Pill>
      </div>
    </div>
  );
}
