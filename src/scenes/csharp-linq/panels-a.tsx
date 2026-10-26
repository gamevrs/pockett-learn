"use client";

import React from "react";
import { ArrowRight, ChevronRight } from "lucide-react";
import { clamp, fmtKg, fmtNum, splitCrew, sumValues, type PortData, type Shipment } from "./data";
import { Bar, BarRow, C, Cap, dash, Empty, IdChip, Lamp, Pill, Segments, Tile, type Tone } from "./ui";

/**
 * Panels for lessons 1 to 8: dock structures, category chart, vessel loads, execution tracer,
 * amendment desk, triage lanes, load contracts and the generic toolkit. Each draws only what the
 * learner's program sent, tolerates missing or odd values, and never throws.
 */

export const hasValues = (o: object): boolean => Object.values(o).some((v) => v !== undefined);
const show = (v: number | undefined, f: (n: number) => string = (n) => fmtNum(n)) => (v === undefined ? dash : f(v));
const entries = (r: Record<string, number> | undefined): [string, number][] => (r ? Object.entries(r) : []);

// ───────────────────────── lesson 1: dock structures ─────────────────────────

export function Structures({ d }: { d: PortData["structures"] }) {
  if (!hasValues(d)) return <Empty>Nothing yet. Send origins, docked, dockQueue, unloadOrder and tonnageByCategory with Port.Show.</Empty>;
  const tonnage = entries(d.tonnageByCategory);
  const maxT = Math.max(1, ...tonnage.map(([, v]) => v));
  return (
    <div className="space-y-3">
      {d.origins && (
        <div>
          <Cap right={`${d.origins.length} distinct`}>Origins · HashSet</Cap>
          <div className="flex flex-wrap gap-1.5">
            {d.origins.length === 0 && <span className="hud-muted text-[11px]">No origins yet.</span>}
            {d.origins.map((o) => (
              <IdChip key={o} tone="accent">
                {o}
              </IdChip>
            ))}
          </div>
        </div>
      )}

      {(d.docked !== undefined || d.dockQueue) && (
        <div>
          <Cap right={d.dockQueue ? `${d.dockQueue.length} waiting` : undefined}>Berth 1 · Queue</Cap>
          <div className="flex min-w-0 items-stretch gap-2">
            <div className="flex shrink-0 flex-col justify-center rounded-md border border-[#c5ee8a]/40 bg-[#c5ee8a]/10 px-2.5 py-1.5">
              <span className="hud-label flex items-center gap-1.5 !text-[9px]">
                <Lamp on={d.docked !== undefined ? true : undefined} size={6} blink />
                Docked
              </span>
              <span className="hud-value hud-accent text-[15px] leading-tight">{d.docked ?? dash}</span>
            </div>
            <div className="flex min-w-0 flex-1 flex-wrap content-center items-center gap-x-1 gap-y-1.5 rounded-md border border-dashed border-white/12 px-2 py-1.5">
              {(d.dockQueue ?? []).length === 0 && <span className="hud-muted text-[11px]">{d.dockQueue ? "Queue is empty." : "No queue yet."}</span>}
              {(d.dockQueue ?? []).map((v, i) => (
                <React.Fragment key={`${v}:${i}`}>
                  {i > 0 && <ChevronRight className="h-3 w-3 shrink-0 text-white/30" aria-hidden />}
                  <span className="flex flex-col items-start">
                    <IdChip tone={i === 0 ? "accent" : "plain"}>{v}</IdChip>
                    {i === 0 && <span className="hud-label mt-0.5 !text-[8.5px]">next</span>}
                  </span>
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      )}

      {(d.unloadOrder || d.tonnageByCategory) && (
        <div className="grid grid-cols-2 gap-3">
          <div className="min-w-0">
            <Cap right={d.unloadOrder ? d.unloadOrder.length : undefined}>Unload · Stack</Cap>
            <ol className="flex flex-col gap-0.5">
              {(d.unloadOrder ?? []).length === 0 && <li className="hud-muted text-[11px]">{d.unloadOrder ? "Stack is empty." : "No stack yet."}</li>}
              {(d.unloadOrder ?? []).map((id, i) => (
                <li key={`${id}:${i}`} className={`flex min-w-0 items-center gap-1.5 rounded border px-1.5 py-[2px] font-mono text-[10.5px] ${i === 0 ? "border-[#c5ee8a]/40 bg-[#c5ee8a]/10 text-[#d3f3a4]" : "border-white/10 bg-white/[0.03] text-white/70"}`}>
                  <span className="min-w-0 flex-1 truncate">{id}</span>
                  {i === 0 && <span className="hud-label !text-[8.5px]">top</span>}
                </li>
              ))}
            </ol>
          </div>
          <div className="min-w-0">
            <Cap right={tonnage.length > 0 ? "kg" : undefined}>Tonnage · Sorted</Cap>
            {tonnage.length === 0 && <span className="hud-muted text-[11px]">No totals yet.</span>}
            <div className="space-y-1.5">
              {tonnage.map(([k, v], i) => (
                <BarRow key={k} label={k} text={fmtNum(v)} pct={(v / maxT) * 100} index={i} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ───────────────────────── lesson 3: category chart ─────────────────────────

export function Groups({ d }: { d: PortData["groups"] }) {
  if (!hasValues(d)) return <Empty>Nothing yet. Send categoryStats, originTotals, perVessel and totals with Port.Show.</Empty>;
  const stats = d.stats ?? [];
  const maxKg = Math.max(1, ...stats.map((s) => s.totalKg ?? 0));
  const origins = entries(d.originTotals);
  const vessels = entries(d.perVessel);
  return (
    <div className="space-y-3">
      {d.totals && (
        <dl className="grid grid-cols-3 gap-1.5">
          <Tile label="Shipments" value={show(d.totals.count)} tone="accent" />
          <Tile label="Total kg" value={show(d.totals.totalKg)} tone="accent" />
          <Tile label="Average kg" value={show(d.totals.avgKg)} />
        </dl>
      )}
      {stats.length > 0 && (
        <div>
          <Cap right={d.totals?.heaviest ? `heaviest ${d.totals.heaviest}` : "by total kg"}>Categories</Cap>
          <div className="space-y-2">
            {stats.map((s, i) => (
              <BarRow
                key={s.category}
                label={
                  <>
                    {s.category} <span className="hud-muted font-mono text-[10px]">×{s.count ?? "?"}</span>
                  </>
                }
                text={fmtKg(s.totalKg)}
                pct={((s.totalKg ?? 0) / maxKg) * 100}
                index={i}
                sub={`avg ${show(s.avgKg)} kg${s.heaviest ? ` · top ${s.heaviest}` : ""}`}
              />
            ))}
          </div>
        </div>
      )}
      {origins.length > 0 && (
        <div>
          <Cap right={`${fmtNum(sumValues(d.originTotals))} kg`}>By origin</Cap>
          <Segments items={origins.map(([label, value]) => ({ label, value }))} unit=" kg" />
        </div>
      )}
      {vessels.length > 0 && (
        <div>
          <Cap>Shipments per vessel</Cap>
          <div className="flex flex-wrap gap-1.5">
            {vessels.map(([v, n]) => (
              <span key={v} className="inline-flex items-center gap-1.5 rounded border border-white/10 bg-white/[0.04] px-1.5 py-[1px] font-mono text-[10.5px]">
                <span className="text-white/70">{v}</span>
                <span className={n === 0 ? "text-white/30" : "hud-accent"}>{n}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ───────────────────────── lesson 4: vessel loads ─────────────────────────

export function Joins({ d, interactive }: { d: PortData["joins"]; interactive: boolean }) {
  if (!hasValues(d)) return <Empty>Nothing yet. Send manifest, vesselLoads and crew with Port.Show.</Empty>;
  const loads = d.vesselLoads ?? [];
  const manifest = d.manifest ?? [];
  const crew = d.crew ?? [];
  return (
    <div className="space-y-3">
      {loads.length > 0 && (
        <div>
          <Cap right="load / capacity">Vessel loads</Cap>
          <div className="space-y-2">
            {loads.map((v, i) => {
              const pct = v.usedPct ?? (v.loadKg !== undefined && v.capacityKg ? (v.loadKg / v.capacityKg) * 100 : undefined);
              const tone: Tone = pct === undefined ? "plain" : pct > 100 ? "danger" : pct >= 85 ? "warning" : "accent";
              return (
                <BarRow
                  key={v.vessel}
                  label={
                    <>
                      {v.vessel} <span className="hud-muted font-mono text-[10px]">{v.shipments === undefined ? "" : v.shipments === 0 ? "empty" : `${v.shipments} crates`}</span>
                    </>
                  }
                  text={
                    <>
                      {show(v.loadKg)}
                      <span className="text-white/35"> / {show(v.capacityKg)}</span> <span className={tone === "danger" ? "hud-danger" : tone === "warning" ? "hud-warning" : "hud-accent"}>{pct === undefined ? "" : `${fmtNum(pct)}%`}</span>
                    </>
                  }
                  pct={pct ?? 0}
                  tone={tone}
                  index={i}
                />
              );
            })}
          </div>
        </div>
      )}
      {manifest.length > 0 && (
        <div>
          <Cap right={`${manifest.length} rows`}>Manifest · Join</Cap>
          <div className={`rounded-md border border-white/[0.07] bg-black/25 ${interactive ? "max-h-40 overflow-auto" : "max-h-32 overflow-hidden"}`}>
            <table className="w-full table-fixed border-collapse text-left text-[11px]">
              <colgroup>
                <col style={{ width: "4.1rem" }} />
                <col />
                <col style={{ width: "3.6rem" }} />
              </colgroup>
              <tbody>
                {manifest.map((r, i) => (
                  <tr key={`${r.id}:${i}`} className="border-t border-white/[0.06] first:border-t-0">
                    <td className="px-2 py-[3px] font-mono text-[10.5px] text-white/80">{r.id}</td>
                    <td className="truncate px-2 py-[3px] text-white/70">{r.vessel || dash}</td>
                    <td className="px-2 py-[3px] text-right font-mono text-[10.5px] tabular-nums text-white/65">{show(r.massKg)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {(crew.length > 0 || d.crewCount !== undefined) && (
        <div>
          <Cap right={d.crewCount !== undefined ? `${d.crewCount} on rosters` : `${crew.length} names`}>Crew · SelectMany</Cap>
          <div className="flex flex-wrap gap-1.5">
            {crew.map((c, i) => {
              const { name, vessel } = splitCrew(c);
              return (
                <span key={`${c}:${i}`} className="inline-flex max-w-full items-baseline gap-1 rounded-full border border-white/10 bg-white/[0.04] px-2 py-[1px] text-[10.5px]" title={c}>
                  <span className="truncate text-white/85">{name}</span>
                  {vessel && <span className="hud-muted truncate text-[9.5px]">{vessel}</span>}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ───────────────────────── lesson 5: execution tracer ─────────────────────────

export function Lazy({ d }: { d: PortData["lazy"] }) {
  if (!hasValues(d)) return <Empty>Nothing yet. Send executionTrace, sourceChange and passes with Port.Show.</Empty>;
  const trace = d.trace ?? [];
  const max = Math.max(1, ...trace.map((t) => t.evaluations));
  const top = trace.filter((t) => t.evaluations === max);
  const uniqueMax = max > 1 && top.length === 1 ? top[0] : undefined;
  const total = trace.reduce((a, t) => a + t.evaluations, 0);
  const sc = d.sourceChange;
  const passMax = Math.max(1, d.passes?.naive ?? 0, d.passes?.snapshot ?? 0);
  return (
    <div className="space-y-3">
      {trace.length > 0 && (
        <div>
          <Cap right={`${total} evaluations`}>Step timeline</Cap>
          <ol className="relative space-y-2 pl-4 before:absolute before:bottom-1.5 before:left-[4.5px] before:top-1.5 before:w-px before:bg-white/15">
            {trace.map((t, i) => {
              const tone: Tone = t.evaluations === 0 ? "plain" : t === uniqueMax ? "warning" : "accent";
              return (
                <li key={`${t.step}:${i}`} className="relative min-w-0">
                  <span
                    aria-hidden
                    className="absolute -left-4 top-[3px] h-[10px] w-[10px] rounded-full border-2 bg-[#0a0a0a]"
                    style={{ borderColor: t.evaluations === 0 ? "rgba(255,255,255,0.28)" : tone === "warning" ? C.amber : C.lime, background: t.evaluations === 0 ? "#0a0a0a" : tone === "warning" ? C.amber : C.lime }}
                  />
                  <div className="flex min-w-0 items-baseline gap-2">
                    <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-white/85" title={t.step}>
                      {t.step}
                    </span>
                    <span className={`hud-value shrink-0 text-[11px] ${tone === "warning" ? "hud-warning" : t.evaluations === 0 ? "text-white/35" : "hud-accent"}`}>
                      {t.evaluations === 0 ? "0 · deferred" : t.evaluations}
                    </span>
                  </div>
                  <Bar pct={(t.evaluations / max) * 100} tone={tone} index={i} h={4} />
                </li>
              );
            })}
          </ol>
        </div>
      )}
      {sc && (
        <div>
          <Cap>Source changed after the query</Cap>
          <dl className="grid grid-cols-3 gap-1.5">
            <Tile label="Before" value={show(sc.before)} />
            <Tile label="Lazy sees" value={show(sc.after)} tone="accent" />
            <Tile label="Snapshot" value={show(sc.snapshot)} />
          </dl>
          {sc.before !== undefined && sc.after !== undefined && sc.snapshot !== undefined && sc.after !== sc.snapshot && (
            <p className="hud-muted mt-1.5 text-[10.5px] leading-snug">The lazy query ran again and saw {sc.after}. The ToList() snapshot stayed at {sc.snapshot}.</p>
          )}
        </div>
      )}
      {d.passes && (d.passes.naive !== undefined || d.passes.snapshot !== undefined) && (
        <div>
          <Cap>Passes over the source</Cap>
          <div className="space-y-1.5">
            {d.passes.naive !== undefined && <BarRow label="Naive" text={d.passes.naive} pct={(d.passes.naive / passMax) * 100} tone="warning" />}
            {d.passes.snapshot !== undefined && <BarRow label="Snapshot" text={d.passes.snapshot} pct={(d.passes.snapshot / passMax) * 100} tone="accent" />}
          </div>
        </div>
      )}
    </div>
  );
}

// ───────────────────────── lesson 6: amendment desk ─────────────────────────

const SHIPMENT_FIELDS: [keyof Shipment, string][] = [
  ["id", "id"],
  ["cargo", "cargo"],
  ["category", "category"],
  ["origin", "origin"],
  ["vesselId", "vessel"],
  ["massKg", "massKg"],
  ["priority", "priority"],
];

function ShipmentCard({ title, s, other, side }: { title: string; s: Shipment | undefined; other: Shipment | undefined; side: "before" | "after" }) {
  return (
    <div className={`min-w-0 rounded-md border px-2 py-1.5 ${side === "after" ? "border-[#c5ee8a]/30 bg-[#c5ee8a]/[0.04]" : "border-white/10 bg-white/[0.03]"}`}>
      <div className="hud-label mb-1 !text-[9.5px]">{title}</div>
      {!s ? (
        <p className="hud-muted text-[10.5px]">Not sent yet.</p>
      ) : (
        <dl className="space-y-px">
          {SHIPMENT_FIELDS.map(([k, label]) => {
            const v = s[k];
            const changed = other !== undefined && other[k] !== v;
            return (
              <div
                key={k}
                className={`flex min-w-0 items-baseline justify-between gap-2 rounded-sm px-1 py-[1px] ${changed ? (side === "after" ? "bg-[#c5ee8a]/15" : "bg-[#fbbf24]/12") : ""}`}
              >
                <dt className="hud-muted shrink-0 text-[10px]">{label}</dt>
                <dd className={`min-w-0 truncate font-mono text-[10.5px] ${changed ? (side === "after" ? "hud-accent font-semibold" : "hud-warning line-through decoration-1") : "text-white/80"}`}>{v === undefined ? dash : typeof v === "number" ? fmtNum(v) : v}</dd>
              </div>
            );
          })}
        </dl>
      )}
    </div>
  );
}

export function Records({ d }: { d: PortData["records"] }) {
  if (!hasValues(d)) return <Empty>Nothing yet. Send berthCompare, berthMove, berthKeys and amendment with Port.Show.</Empty>;
  const { amendment, berthCompare, berthMove, berthKeys } = d;
  const changes = amendment?.before && amendment.after ? SHIPMENT_FIELDS.filter(([k]) => amendment.before?.[k] !== amendment.after?.[k]).length : undefined;
  return (
    <div className="space-y-3">
      {amendment && (
        <div>
          <Cap right={changes === undefined ? undefined : `${changes} field${changes === 1 ? "" : "s"} changed`}>Amendment · with</Cap>
          <div className="grid grid-cols-2 gap-1.5">
            <ShipmentCard title="Before" s={amendment.before} other={amendment.after} side="before" />
            <ShipmentCard title="After" s={amendment.after} other={amendment.before} side="after" />
          </div>
        </div>
      )}
      {berthCompare && (
        <div>
          <Cap>Berth equality</Cap>
          <div className="flex flex-wrap gap-1.5">
            <Pill tone={berthCompare.equal === undefined ? "plain" : berthCompare.equal ? "accent" : "warning"}>
              {berthCompare.equal === undefined ? "== ?" : berthCompare.equal ? "== equal by value" : "== not equal"}
            </Pill>
            <Pill tone={berthCompare.sameReference ? "warning" : "plain"}>{berthCompare.sameReference === undefined ? "ReferenceEquals ?" : berthCompare.sameReference ? "same object" : "different objects"}</Pill>
          </div>
          {berthCompare.text && <div className="mt-1.5 truncate rounded-md bg-black/40 px-2 py-1 font-mono text-[10.5px] text-white/80" title={berthCompare.text}>{berthCompare.text}</div>}
        </div>
      )}
      {berthMove && (berthMove.before || berthMove.after) && (
        <div>
          <Cap>Berth move · with</Cap>
          <div className="space-y-1 rounded-md bg-black/40 px-2 py-1.5 font-mono text-[10.5px]">
            <p className="truncate text-white/55" title={berthMove.before}>
              <span className="mr-1.5 text-white/30">before</span>
              {berthMove.before ?? dash}
            </p>
            <p className="hud-accent flex min-w-0 items-center gap-1">
              <ArrowRight className="h-3 w-3 shrink-0" aria-hidden />
              <span className="truncate" title={berthMove.after}>{berthMove.after ?? dash}</span>
            </p>
          </div>
        </div>
      )}
      {berthKeys && (
        <div>
          <Cap>Records as keys</Cap>
          <div className="flex flex-wrap gap-1.5">
            <Pill tone="accent">{show(berthKeys.distinct)} distinct keys</Pill>
            {berthKeys.occupant && <Pill>occupant {berthKeys.occupant}</Pill>}
          </div>
        </div>
      )}
    </div>
  );
}

// ───────────────────────── lesson 7: triage lanes ─────────────────────────

const LANE_ORDER = ["Express", "Heavy lift", "Mail run", "Standard"];

export function Lanes({ d }: { d: PortData["lanes"] }) {
  if (!hasValues(d)) return <Empty>Nothing yet. Send lanes, laneCounts, bandCounts and handlingCounts with Port.Show.</Empty>;
  const lanes = d.lanes ?? [];
  const names = [...new Set([...entries(d.laneCounts).map(([k]) => k), ...lanes.map((l) => l.lane)])].sort((a, b) => {
    const ia = LANE_ORDER.indexOf(a);
    const ib = LANE_ORDER.indexOf(b);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
  });
  const BAND_ORDER = ["light", "medium", "heavy"];
  const bands = entries(d.bandCounts).sort(([a], [b]) => {
    const ia = BAND_ORDER.indexOf(a);
    const ib = BAND_ORDER.indexOf(b);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
  });
  const handling = entries(d.handlingCounts);
  const routes = d.routeSummaries ?? [];
  return (
    <div className="space-y-3">
      {names.length > 0 && (
        <div>
          <Cap>Lanes</Cap>
          <div className="grid grid-cols-2 gap-1.5">
            {names.map((name) => {
              const ids = lanes.filter((l) => l.lane === name).map((l) => l.id);
              const count = d.laneCounts?.[name] ?? ids.length;
              const express = name === "Express";
              return (
                <div key={name} className="min-w-0 rounded-md border border-white/10 bg-white/[0.03] p-1.5">
                  <div className="mb-1.5 flex min-w-0 items-baseline justify-between gap-1 border-b border-white/[0.07] pb-1">
                    <span className="truncate text-[10.5px] font-medium text-white/85" title={name}>
                      {name}
                    </span>
                    <span className={`hud-value shrink-0 text-[11px] ${express ? "hud-warning" : "hud-accent"}`}>{count}</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {ids.map((id, i) => (
                      <IdChip key={`${id}:${i}`} tone={express ? "warning" : "accent"}>
                        {id}
                      </IdChip>
                    ))}
                    {ids.length === 0 && <span className="hud-muted text-[10px]">empty</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {bands.length > 0 && (
        <div>
          <Cap>Mass bands</Cap>
          <Segments items={bands.map(([label, value]) => ({ label, value }))} />
        </div>
      )}
      {handling.length > 0 && (
        <div>
          <Cap>Handling</Cap>
          <div className="flex flex-wrap gap-1.5">
            {handling.map(([k, n]) => (
              <span key={k} className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2 py-[1px] text-[10.5px]">
                <span className="text-white/75">{k}</span>
                <span className="hud-value hud-accent">{n}</span>
              </span>
            ))}
          </div>
        </div>
      )}
      {routes.length > 0 && (
        <div>
          <Cap right={routes.length}>Route summaries</Cap>
          <ul className="space-y-0.5 rounded-md bg-black/40 px-2 py-1.5 font-mono text-[10.5px] leading-[1.5] text-white/75">
            {routes.slice(0, 5).map((r, i) => (
              <li key={`${r}:${i}`} className="truncate" title={r}>
                {r}
              </li>
            ))}
            {routes.length > 5 && <li className="text-white/35">+{routes.length - 5} more</li>}
          </ul>
        </div>
      )}
    </div>
  );
}

// ───────────────────────── lesson 8: load contracts ─────────────────────────

const PARTY = /\b(party|parties|crew|team|passengers?|inspectors?|guests?|visitors?|delegation)\b/i;

export function Contracts({ d }: { d: PortData["contracts"] }) {
  if (!hasValues(d)) return <Empty>Nothing yet. Send loadables, boardingKg, heaviestCrates and crateDedupe with Port.Show.</Empty>;
  const loadables = d.loadables ?? [];
  const max = Math.max(1, ...loadables.map((l) => l.massKg ?? 0));
  const dd = d.crateDedupe;
  const dropped = dd?.offered !== undefined && dd.kept !== undefined ? Math.max(0, dd.offered - dd.kept) : undefined;
  return (
    <div className="space-y-3">
      {loadables.length > 0 && (
        <div>
          <Cap right={`${loadables.length} loadables`}>ILoadable</Cap>
          <div className="space-y-1.5">
            {loadables.map((l, i) => {
              const party = PARTY.test(l.label);
              return (
                <BarRow
                  key={`${l.label}:${i}`}
                  label={
                    <span className="flex min-w-0 items-center gap-1.5">
                      <span className={`shrink-0 rounded px-1 text-[8.5px] font-semibold uppercase leading-[13px] ${party ? "bg-white/10 text-white/70" : "bg-[#c5ee8a]/12 text-[#d3f3a4]"}`}>{party ? "party" : "crate"}</span>
                      <span className="truncate">{l.label}</span>
                    </span>
                  }
                  text={fmtKg(l.massKg)}
                  pct={((l.massKg ?? 0) / max) * 100}
                  tone={party ? "plain" : "accent"}
                  index={i}
                />
              );
            })}
          </div>
        </div>
      )}
      <div className="grid grid-cols-2 gap-1.5">
        <Tile label="Boarding" value={show(d.boardingKg)} unit="kg" tone="accent" />
        <Tile label="Dedupe" value={dd?.offered !== undefined && dd.kept !== undefined ? `${dd.offered} → ${dd.kept}` : dash} tone={dropped ? "warning" : "accent"} />
      </div>
      {dd?.offered !== undefined && dd.kept !== undefined && dd.offered > 0 && (
        <div>
          <Bar pct={(dd.kept / dd.offered) * 100} tone="accent" h={5} />
          <p className="hud-muted mt-1 text-[10.5px]">{dropped ? `${dropped} duplicate${dropped === 1 ? "" : "s"} dropped by IEquatable.` : "No duplicates offered."}</p>
        </div>
      )}
      {d.heaviestCrates && d.heaviestCrates.length > 0 && (
        <div>
          <Cap right="IComparable">Heaviest crates</Cap>
          <ol className="flex flex-wrap gap-1.5">
            {d.heaviestCrates.map((id, i) => (
              <li key={`${id}:${i}`} className="flex items-center gap-1">
                <span className="hud-muted font-mono text-[9.5px]">{i + 1}</span>
                <IdChip tone={i === 0 ? "accent" : "plain"}>{id}</IdChip>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

// ───────────────────────── lesson 9: generic toolkit ─────────────────────────

export function Generics({ d }: { d: PortData["generics"] }) {
  if (!hasValues(d)) return <Empty>Nothing yet. Send largest, hold, recent and grouped with Port.Show.</Empty>;
  const { largest, hold, recent } = d;
  const grouped = entries(d.grouped);
  const maxG = Math.max(1, ...grouped.map(([, v]) => v));
  const holdPct = hold?.capacityKg ? clamp(((hold.totalKg ?? 0) / hold.capacityKg) * 100, 0, 100) : 0;
  const holdTone: Tone = hold?.capacityKg && (hold.totalKg ?? 0) > hold.capacityKg ? "danger" : holdPct >= 85 ? "warning" : "accent";
  return (
    <div className="space-y-3">
      {largest && (
        <div>
          <Cap>Largest&lt;T&gt;</Cap>
          <div className="grid grid-cols-3 gap-1.5">
            {(
              [
                ["int", largest.number === undefined ? dash : fmtNum(largest.number)],
                ["string", largest.name ?? dash],
                ["Crate", largest.crate ?? dash],
              ] as [string, string][]
            ).map(([t, v]) => (
              <div key={t} className="min-w-0 rounded-md bg-white/[0.04] px-2 py-1.5">
                <div className="hud-label truncate !text-[9px]">T = {t}</div>
                <div className={`hud-value mt-0.5 truncate text-[12.5px] leading-tight ${v === dash ? "text-white/30" : "hud-accent"}`} title={v}>
                  {v}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {hold && (
        <div>
          <Cap right={hold.capacityKg !== undefined ? `${show(hold.totalKg)} / ${fmtNum(hold.capacityKg)} kg` : undefined}>Hold&lt;T&gt; · where T :</Cap>
          {hold.capacityKg !== undefined && <Bar pct={holdPct} tone={holdTone} h={6} />}
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {(hold.accepted ?? []).map((id, i) => (
              <IdChip key={`a${id}:${i}`} tone="accent">
                {id}
              </IdChip>
            ))}
            {(hold.refused ?? []).map((id, i) => (
              <IdChip key={`r${id}:${i}`} tone="danger" title="refused">
                <s className="decoration-1">{id}</s>
              </IdChip>
            ))}
            {!(hold.accepted?.length || hold.refused?.length) && <span className="hud-muted text-[11px]">Nothing offered to the hold yet.</span>}
          </div>
          {hold.refused && hold.refused.length > 0 && <p className="hud-muted mt-1 text-[10.5px]">{hold.refused.length} refused: the hold was full.</p>}
        </div>
      )}
      {recent && (
        <div>
          <Cap right={`last ${recent.length}`}>Recent&lt;T&gt;</Cap>
          <div className="flex flex-wrap items-center gap-1">
            {recent.length === 0 && <span className="hud-muted text-[11px]">Empty.</span>}
            {recent.map((id, i) => (
              <React.Fragment key={`${id}:${i}`}>
                {i > 0 && <ChevronRight className="h-3 w-3 shrink-0 text-white/25" aria-hidden />}
                <IdChip tone={i === recent.length - 1 ? "accent" : "plain"}>{id}</IdChip>
              </React.Fragment>
            ))}
            {recent.length > 0 && <span className="hud-label ml-1 !text-[8.5px]">newest</span>}
          </div>
        </div>
      )}
      {grouped.length > 0 && (
        <div>
          <Cap>GroupCount&lt;T&gt;</Cap>
          <div className="space-y-1.5">
            {grouped.map(([k, v], i) => (
              <BarRow key={k} label={k} text={v} pct={(v / maxG) * 100} index={i} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
