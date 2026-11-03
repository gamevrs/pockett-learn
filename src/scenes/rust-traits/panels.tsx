"use client";

import React from "react";
import { ArrowRight, Check, X } from "lucide-react";
import { kindOf, pickDrones, type DroneCard, type Fleet, type Kind } from "./data";
import { C, Empty, Meter, Mono, Pill, Tile } from "../rust-inventory/ui";

/**
 * The sixteen panels of the fleet board, one per lesson. Colour rules (Pockett Stage): lime marks a
 * value your code produced, blue is a pointer or a borrow, violet is something the compiler wrote for
 * you (a generic copy, a derived impl), amber is caution, red is a refusal. Everything else is grey.
 */

// ───────────────────────── drone glyphs ─────────────────────────

const KIND_COLOR: Record<Kind, string> = { Sparrow: C.lime, Heron: C.amber, Glider: C.blue, Unknown: "#a3a3a3" };

export function DroneGlyph({ kind, size = 28 }: { kind: Kind; size?: number }) {
  const col = KIND_COLOR[kind];
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} role="img" aria-label={kind} className="shrink-0">
      {kind === "Sparrow" && (
        <g stroke={col} strokeWidth="1.6" fill="none" strokeLinecap="round">
          <path d="M8 8 L24 24 M24 8 L8 24" />
          <circle cx="16" cy="16" r="3" fill={col} fillOpacity=".25" />
          {[
            [8, 8],
            [24, 8],
            [8, 24],
            [24, 24],
          ].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="4" strokeOpacity=".7" />
          ))}
        </g>
      )}
      {kind === "Heron" && (
        <g stroke={col} strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 10 H28 M4 22 H28" />
          <rect x="10" y="10" width="12" height="12" rx="2" fill={col} fillOpacity=".2" />
          <path d="M16 6 V10 M16 22 V26" />
        </g>
      )}
      {kind === "Glider" && (
        <g stroke={col} strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 18 L16 12 L30 18 L16 16 Z" fill={col} fillOpacity=".2" />
          <path d="M16 12 V25 M12 25 H20" />
        </g>
      )}
      {kind === "Unknown" && <circle cx="16" cy="16" r="9" stroke={col} strokeWidth="1.6" fill="none" strokeDasharray="3 3" />}
    </svg>
  );
}

function batteryTone(b: number | undefined): "accent" | "warning" | "danger" {
  if (b === undefined) return "warning";
  return b < 40 ? "danger" : b < 60 ? "warning" : "accent";
}

function DroneRow({ d, extra }: { d: DroneCard; extra?: React.ReactNode }) {
  return (
    <li className="grid min-w-0 grid-cols-[28px_minmax(0,7rem)_minmax(0,1fr)_auto] items-center gap-2 text-[11px]">
      <DroneGlyph kind={d.kind} />
      <span className="truncate font-mono text-[#f4f4f4]">{d.callsign}</span>
      <Meter value={d.battery ?? 0} tone={batteryTone(d.battery)} />
      <span className="font-mono text-[10.5px] text-white/70">{d.battery !== undefined ? `${d.battery}%` : "?"}</span>
      {extra}
    </li>
  );
}

// ───────────────────────── 1. roster ─────────────────────────

export function Roster({ f }: { f: Fleet }) {
  if (!f.roster) return <Empty>No roster yet. Send it with scene(&quot;roster&quot;, …);</Empty>;
  return (
    <div className="space-y-2">
      <ul className="space-y-1.5">
        {f.roster.map((d, i) => (
          <DroneRow key={`${d.callsign}-${i}`} d={d} />
        ))}
      </ul>
      <p className="flex flex-wrap items-center gap-1.5 text-[10px] text-white/60">
        <Pill tone="blue">trait Drone</Pill>
        <span>callsign() and battery() answered by {new Set(f.roster.map((d) => d.kind)).size} different types</span>
      </p>
    </div>
  );
}

// ───────────────────────── 2. carrier desk ─────────────────────────

export function CarrierDesk({ f }: { f: Fleet }) {
  if (!f.carriers) return <Empty>No carriers yet. Send them with scene(&quot;carriers&quot;, …);</Empty>;
  return (
    <div className="space-y-2">
      <ul className="space-y-1.5">
        {f.carriers.map((c, i) => (
          <li key={`${c.callsign}-${i}`} className="min-w-0 rounded-md bg-white/[0.04] px-2.5 py-1.5 text-[11px]">
            <div className="flex min-w-0 items-center gap-2">
              <DroneGlyph kind={kindOf(c.callsign)} size={22} />
              <span className="min-w-0 flex-1 truncate font-mono text-[#f4f4f4]">{c.callsign}</span>
              <span className="font-mono text-[10.5px] text-white/70">{c.capacityKg ?? "?"} kg</span>
              <Pill tone={c.canLift6 ? "accent" : "danger"} title="can_lift(6)">
                6 kg {c.canLift6 ? "yes" : "no"}
              </Pill>
            </div>
            <div className="mt-1 flex min-w-0 items-center gap-2 pl-7 text-[10.5px]">
              <Pill tone={c.overridden ? "warning" : "blue"}>{c.overridden ? "override" : "default"}</Pill>
              <span className="min-w-0 truncate text-white/70">{c.note}</span>
            </div>
          </li>
        ))}
      </ul>
      <p className="text-[10px] text-white/60">can_lift and rig_note have bodies in the trait. Types that say nothing inherit them.</p>
    </div>
  );
}

// ───────────────────────── 3. copies made ─────────────────────────

export function CopiesMade({ f }: { f: Fleet }) {
  if (!f.monomorphs) return <Empty>No copies yet. Send them with scene(&quot;monomorphs&quot;, …);</Empty>;
  return (
    <div className="space-y-2">
      <p className="text-[10.5px] text-white/70">One function you wrote. The compiler stamped out one copy per type it was used with (monomorphisation).</p>
      <ul className="space-y-1.5">
        {f.monomorphs.map((m, i) => (
          <li key={i} className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 text-[11px]">
            <span className="truncate rounded-md border border-[#c4a8ff]/45 bg-[#c4a8ff]/10 px-2 py-1 font-mono text-[10.5px] text-[#c4a8ff]" title="written by the compiler">
              {m.copy}
            </span>
            <ArrowRight className="h-3 w-3 text-white/50" aria-hidden />
            <span className="truncate font-mono text-[#d3f3a4]">{m.result}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ───────────────────────── 4. drop plans ─────────────────────────

export function DropPlans({ f }: { f: Fleet }) {
  if (!f.plans) return <Empty>No plans yet. Send them with scene(&quot;plans&quot;, …);</Empty>;
  return (
    <div className="space-y-2">
      <ul className="space-y-1.5">
        {f.plans.map((p, i) => (
          <li key={i} className="flex min-w-0 items-center gap-2 text-[11px]">
            {p.ok ? <Check className="h-3.5 w-3.5 shrink-0 text-[#c5ee8a]" aria-hidden /> : <X className="h-3.5 w-3.5 shrink-0 text-[#f87171]" aria-hidden />}
            <span className="min-w-0 flex-1 truncate font-mono text-[#f4f4f4]" title={p.text}>
              {p.text}
            </span>
            <Pill tone="plain">{p.kg ?? "?"} kg</Pill>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-white/65">
        <Pill tone="blue">T: Carrier + Beacon</Pill>
        {f.standby && (
          <>
            <Pill tone="accent">-&gt; impl Drone</Pill>
            <span>
              standby unit <Mono tone="accent">{f.standby}</Mono>: callers only see Drone
            </span>
          </>
        )}
      </div>
    </div>
  );
}

// ───────────────────────── 5. hangar (trait objects) ─────────────────────────

export function HangarBoxes({ f }: { f: Fleet }) {
  if (!f.hangar) return <Empty>No fleet yet. Send it with scene(&quot;hangar&quot;, …);</Empty>;
  const low = new Set(f.lowBattery ?? []);
  return (
    <div className="space-y-2">
      <ul className="space-y-2">
        {f.hangar.map((d, i) => (
          <li key={`${d.callsign}-${i}`} className="min-w-0 rounded-md bg-white/[0.04] px-2.5 py-2">
            <div className="flex min-w-0 items-center gap-2 text-[11px]">
              <span className="hud-label !text-white/60">Box&lt;dyn Drone&gt;</span>
              {low.has(d.callsign) && <Pill tone="danger">low battery</Pill>}
            </div>
            <div className="mt-1.5 grid min-w-0 grid-cols-[auto_1fr] items-start gap-x-2 gap-y-1 text-[10.5px]">
              <span className="font-mono text-[#8aa4ff]">data ptr</span>
              <span className="flex min-w-0 items-center gap-1.5">
                <ArrowRight className="h-3 w-3 shrink-0 text-[#8aa4ff]" aria-hidden />
                <DroneGlyph kind={d.kind} size={20} />
                <span className="truncate font-mono text-[#f4f4f4]">{d.callsign}</span>
                <span className="font-mono text-white/70">{d.battery ?? "?"}%</span>
              </span>
              <span className="font-mono text-[#8aa4ff]">vtable ptr</span>
              <span className="flex min-w-0 items-center gap-1.5">
                <ArrowRight className="h-3 w-3 shrink-0 text-[#8aa4ff]" aria-hidden />
                <span className="truncate font-mono text-[#b3c3ff]">
                  {d.kind === "Unknown" ? "?" : d.kind} as Drone: callsign, battery
                </span>
              </span>
            </div>
          </li>
        ))}
      </ul>
      <p className="text-[10px] text-white/60">One list, {new Set(f.hangar.map((d) => d.kind)).size} kinds. The list only knows what the trait lists.</p>
    </div>
  );
}

// ───────────────────────── 6. pads vs hangar ─────────────────────────

export function PadsVsHangar({ f }: { f: Fleet }) {
  const c = f.choice;
  if (!c) return <Empty>Nothing to compare yet. Send scene(&quot;choice&quot;, …);</Empty>;
  return (
    <div className="space-y-2.5">
      <div className="grid min-w-0 grid-cols-1 gap-2.5 @xl:grid-cols-2">
        <div className="min-w-0 rounded-md border border-[#c4a8ff]/35 px-2.5 py-2">
          <p className="hud-label !text-[#c4a8ff]">Pad&lt;T: Drone&gt; · generics</p>
          <ul className="mt-1.5 space-y-1">
            {c.pads.map((p, i) => (
              <li key={i} className="truncate font-mono text-[11px] text-[#f4f4f4]">
                {p}
              </li>
            ))}
          </ul>
          <p className="mt-1.5 text-[10px] text-white/60">One type each. Chosen at compile time.</p>
        </div>
        <div className="min-w-0 rounded-md border border-[#8aa4ff]/35 px-2.5 py-2">
          <p className="hud-label !text-[#b3c3ff]">Hangar · Vec&lt;Box&lt;dyn Drone&gt;&gt;</p>
          <ul className="mt-1.5 space-y-1">
            {c.callsigns.map((p, i) => (
              <li key={i} className="flex min-w-0 items-center gap-1.5 font-mono text-[11px] text-[#f4f4f4]">
                <DroneGlyph kind={kindOf(p)} size={16} />
                <span className="truncate">{p}</span>
              </li>
            ))}
          </ul>
          <p className="mt-1.5 text-[10px] text-white/60">Any mix. One vtable look-up per call.</p>
        </div>
      </div>
      <dl className="grid grid-cols-2 gap-1.5">
        <Tile label="Bays used" value={c.bays} tone="accent" />
        <Tile label="Total charge" value={c.totalCharge} unit="%" tone="accent" />
      </dl>
    </div>
  );
}

// ───────────────────────── 7. parcel card ─────────────────────────

export function ParcelCardPanel({ f }: { f: Fleet }) {
  const p = f.parcelCard;
  if (!p) return <Empty>No parcel yet. Send it with scene(&quot;parcelCard&quot;, …);</Empty>;
  return (
    <div className="space-y-2">
      <div className="rounded-md border border-[#c5ee8a]/35 bg-black/30 px-3 py-2">
        <p className="hud-label !text-white/60">Display · for people (written by you)</p>
        <p className="mt-0.5 font-mono text-[13px] text-[#d3f3a4]">{p.display}</p>
      </div>
      <div className="rounded-md border border-[#c4a8ff]/35 bg-black/30 px-3 py-2">
        <p className="hud-label !text-white/60">Debug · for programmers (derived)</p>
        <p className="mt-0.5 break-words font-mono text-[11px] text-[#c4a8ff]">{p.debug}</p>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <Pill tone={p.equalToTwin ? "accent" : "danger"}>== clone: {String(p.equalToTwin)}</Pill>
        <Pill tone={p.equalToHeavier ? "danger" : "accent"}>== heavier copy: {String(p.equalToHeavier)}</Pill>
        <Pill tone="blue">PartialEq</Pill>
        <Pill tone="blue">Clone</Pill>
      </div>
    </div>
  );
}

// ───────────────────────── 8. conversions ─────────────────────────

export function Conversions({ f }: { f: Fleet }) {
  if (!f.conversions) return <Empty>No conversions yet. Send them with scene(&quot;conversions&quot;, …);</Empty>;
  return (
    <ul className="space-y-1.5">
      {f.conversions.map((v, i) => (
        <li key={i} className="grid min-w-0 grid-cols-[minmax(0,8.5rem)_auto_minmax(0,1fr)] items-center gap-2 text-[11px]">
          <Pill tone="blue" title={v.via}>
            {v.via}
          </Pill>
          <ArrowRight className="h-3 w-3 text-white/50" aria-hidden />
          <span className="min-w-0 truncate font-mono text-[#d3f3a4]" title={v.result}>
            {v.result}
          </span>
        </li>
      ))}
    </ul>
  );
}

// ───────────────────────── 9. harbour grid (the vectors; the map is the hero) ─────────────────────────

const fmtPt = (p: [number, number] | undefined) => (p ? `(${p[0]}, ${p[1]})` : "?");

export function HarbourVectors({ f }: { f: Fleet }) {
  const h = f.harbour;
  if (!h) return <Empty>No map yet. Send it with scene(&quot;harbour&quot;, …);</Empty>;
  const rows: [string, string, [number, number] | undefined][] = [
    ["isle - depot", "leg", h.leg],
    ["leg * 2", "round trip", h.roundTrip],
    ["-leg", "way home", h.home],
    ["depot + leg + (1, 1)", "landing", h.landing],
  ];
  return (
    <div className="space-y-2">
      <ul className="space-y-1">
        {rows.map(([expr, name, p]) => (
          <li key={name} className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 text-[11px]">
            <span className="truncate font-mono text-white/75">{expr}</span>
            <span className="hud-label !text-white/60">{name}</span>
            <span className="font-mono text-[#d3f3a4]">{fmtPt(p)}</span>
          </li>
        ))}
      </ul>
      <dl className="grid grid-cols-2 gap-1.5">
        <Tile label="depot to reef" value={h.distanceToReef} unit="cells" tone="accent" />
        <Tile label="route[2]" value={h.route[2] ? fmtPt(h.route[2]) : undefined} tone="blue" />
      </dl>
    </div>
  );
}

// ───────────────────────── 10. bid ranking ─────────────────────────

export function BidRanking({ f }: { f: Fleet }) {
  const r = f.ranking;
  if (!r) return <Empty>No ranking yet. Send it with scene(&quot;ranking&quot;, …);</Empty>;
  const maxD = Math.max(1, ...r.bids.map((b) => b.distance ?? 0));
  return (
    <div className="space-y-2.5">
      <ol className="space-y-1.5">
        {r.bids.map((b, i) => (
          <li key={`${b.callsign}-${i}`} className="grid min-w-0 grid-cols-[1.2rem_minmax(0,6.5rem)_minmax(0,1fr)_auto] items-center gap-2 text-[11px]">
            <span className="text-right font-mono text-[10.5px] text-white/60">{b.rank}</span>
            <span className="truncate font-mono text-[#f4f4f4]">{b.callsign}</span>
            <span className="h-1.5 overflow-hidden rounded-full bg-white/10" title={`distance ${b.distance}`}>
              <span className="block h-full rounded-full" style={{ width: `${Math.max(8, ((b.distance ?? 0) / maxD) * 100)}%`, background: i === 0 ? C.lime : C.blue, opacity: 0.85 }} />
            </span>
            <span className="font-mono text-[10.5px] text-white/70">
              {b.distance ?? "?"} · {b.battery ?? "?"}%
            </span>
          </li>
        ))}
      </ol>
      <p className="text-[10px] text-white/60">cmp: nearer first, then more battery, then callsign.</p>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="hud-label !text-white/65">urgency</span>
        {r.urgencies.map((u, i) => (
          <React.Fragment key={u}>
            {i > 0 && <span className="text-white/45">&lt;</span>}
            <Pill tone={i === r.urgencies.length - 1 ? "warning" : "plain"}>{u}</Pill>
          </React.Fragment>
        ))}
      </div>
      {r.loads.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="hud-label !text-white/65">loads (kg)</span>
          {r.loads.map((l, i) => (
            <Pill key={i} tone="plain">
              {l}
            </Pill>
          ))}
        </div>
      )}
    </div>
  );
}

// ───────────────────────── 11. charging dock ─────────────────────────

export function ChargingDock({ f }: { f: Fleet }) {
  const c = f.charging;
  if (!c) return <Empty>No readings yet. Send them with scene(&quot;charging&quot;, …);</Empty>;
  const levels = [c.from, ...c.readings].filter((x): x is number => x !== undefined);
  return (
    <div className="space-y-2.5">
      <div className="flex h-16 items-end gap-1.5" role="img" aria-label={`battery levels ${levels.join(", ")}`}>
        {levels.map((l, i) => (
          <div key={i} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-0.5">
            <span className="font-mono text-[9.5px] text-white/70">{l}</span>
            <span className="w-full rounded-sm" style={{ height: `${Math.max(6, l * 0.42)}px`, background: i === 0 ? "rgba(255,255,255,0.25)" : C.lime, opacity: i === 0 ? 1 : 0.5 + (i / Math.max(1, levels.length)) * 0.5 }} />
          </div>
        ))}
      </div>
      <p className="text-[10px] text-white/60">
        {c.from !== undefined ? `docked at ${c.from}%` : "docked"}, one <Mono tone="blue">next()</Mono> per tick, then None.
      </p>
      {c.hops.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="hud-label !text-white/65">Hops</span>
          {c.hops.map((p, i) => (
            <Pill key={i} tone="blue">
              {fmtPt(p)}
            </Pill>
          ))}
        </div>
      )}
    </div>
  );
}

// ───────────────────────── 12. route report ─────────────────────────

export function RouteReport({ f }: { f: Fleet }) {
  const a = f.adaptors;
  if (!a) return <Empty>No report yet. Send it with scene(&quot;adaptors&quot;, …);</Empty>;
  const top = Math.max(1, ...a.stages.map((s) => s.count));
  return (
    <div className="space-y-2.5">
      <ul className="space-y-1.5">
        {a.stages.map((s, i) => (
          <li key={s.stage} className="grid min-w-0 grid-cols-[minmax(0,5.5rem)_minmax(0,1fr)_1.5rem] items-center gap-2 text-[11px]">
            <span className="truncate font-mono text-white/80">{s.stage}</span>
            <span className="mx-auto h-3 rounded-sm border border-[#c5ee8a]/40 bg-[#c5ee8a]/15" style={{ width: `${Math.max(14, (s.count / top) * 100)}%`, opacity: 1 - i * 0.12 }} />
            <span className="text-right font-mono text-[10.5px] text-[#d3f3a4]">{s.count}</span>
          </li>
        ))}
      </ul>
      <dl className="grid grid-cols-3 gap-1.5">
        <Tile label="Legs" value={a.legs.join(" · ")} tone="blue" />
        <Tile label="Total" value={a.total} unit="cells" tone="accent" />
        <Tile label="Long legs" value={a.longLegs} />
      </dl>
      {a.plan.length > 0 && (
        <ul className="space-y-0.5">
          {a.plan.map((p, i) => (
            <li key={i} className="truncate font-mono text-[10.5px] text-white/75" title={p}>
              {p}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ───────────────────────── 13. shared depot ─────────────────────────

export function SharedDepot({ f }: { f: Fleet }) {
  const d = f.depot;
  if (!d) return <Empty>No depot yet. Send it with scene(&quot;depot&quot;, …);</Empty>;
  const top = Math.max(1, ...d.steps.map((s) => s.count));
  return (
    <div className="space-y-2.5">
      <div className="flex min-w-0 items-center gap-2 rounded-md border border-[#8aa4ff]/40 bg-[#8aa4ff]/10 px-3 py-2">
        <span className="hud-label !text-[#b3c3ff]">Rc&lt;Depot&gt;</span>
        <span className="min-w-0 flex-1 truncate font-mono text-[12px] text-[#f4f4f4]">{d.name ?? "?"}</span>
        <Pill tone="plain">{d.docks ?? "?"} docks</Pill>
      </div>
      <ul className="space-y-1.5">
        {d.steps.map((s, i) => (
          <li key={i} className="grid min-w-0 grid-cols-[minmax(0,6.5rem)_minmax(0,1fr)_1.2rem] items-center gap-2 text-[11px]">
            <span className="truncate text-white/75">{s.label}</span>
            <span className="flex gap-0.5" aria-hidden>
              {Array.from({ length: Math.min(8, s.count) }, (_, k) => (
                <span key={k} className="h-3 rounded-sm bg-[#8aa4ff]" style={{ width: `${Math.max(8, 70 / top)}%`, opacity: 0.85 }} />
              ))}
            </span>
            <span className="text-right font-mono text-[10.5px] text-[#d3f3a4]">{s.count}</span>
          </li>
        ))}
      </ul>
      <p className="text-[10px] text-white/60">Each blue block is a ticket (an Rc). At zero tickets the depot is freed.</p>
    </div>
  );
}

// ───────────────────────── 14. ledger ─────────────────────────

export function LedgerPanel({ f }: { f: Fleet }) {
  const l = f.ledgerView;
  if (!l) return <Empty>No ledger yet. Send it with scene(&quot;ledgerView&quot;, …);</Empty>;
  return (
    <div className="space-y-2.5">
      <dl className="grid grid-cols-2 gap-1.5">
        <Tile label="Delivered" value={l.delivered} tone="accent" />
        <Tile label="Rc holders" value={l.strongCount} tone="blue" />
      </dl>
      <ul className="space-y-0.5">
        {l.entries.map((e, i) => (
          <li key={i} className="truncate font-mono text-[10.5px] text-white/80" title={e}>
            {e}
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center gap-1.5">
        <Pill tone="blue">RefCell</Pill>
        {l.whileReading && <Pill tone={l.whileReading === "refused" ? "danger" : "warning"}>writer while reading: {l.whileReading}</Pill>}
        {l.afterReader && <Pill tone={l.afterReader === "allowed" ? "accent" : "warning"}>after reader drops: {l.afterReader}</Pill>}
      </div>
      <p className="text-[10px] text-white/60">The borrow rule is checked while the program runs. A real borrow_mut() clash would panic.</p>
    </div>
  );
}

// ───────────────────────── 15. rigs ─────────────────────────

export function Rigs({ f }: { f: Fleet }) {
  if (!f.rigs) return <Empty>No rigs yet. Send them with scene(&quot;rigs&quot;, …);</Empty>;
  return (
    <ul className="space-y-2.5">
      {f.rigs.map((r, i) => (
        <li key={i} className="min-w-0">
          <div className="flex min-w-0 items-center gap-2 text-[11px]">
            <span className="min-w-0 flex-1 truncate font-mono text-[#f4f4f4]">{r.label}</span>
            <Pill tone="blue" title="const SLOTS">{`SLOTS = ${r.slots}`}</Pill>
          </div>
          <div className="mt-1 flex gap-1" role="img" aria-label={`${r.used} of ${r.slots} slots used`}>
            {Array.from({ length: Math.min(12, r.slots) }, (_, k) => (
              <span key={k} className={`h-4 flex-1 rounded-sm border ${k < r.used ? "border-[#c5ee8a]/60 bg-[#c5ee8a]/30" : "border-dashed border-white/20"}`} />
            ))}
          </div>
          <p className="mt-1 truncate font-mono text-[10.5px] text-white/70">{r.first}</p>
        </li>
      ))}
    </ul>
  );
}

// ───────────────────────── 16. dispatch board ─────────────────────────

export function DispatchBoard({ f, liveCount, total }: { f: Fleet; liveCount: number; total: number }) {
  const d = f.dispatchDay;
  if (!d) return <Empty>No dispatch day yet. Send it with scene(&quot;dispatchDay&quot;, …);</Empty>;
  return (
    <div className="space-y-2.5">
      <dl className="grid grid-cols-2 gap-1.5 @xl:grid-cols-4">
        <Tile label="Delivered" value={d.delivered !== undefined ? `${d.delivered}/${d.total ?? "?"}` : undefined} tone="accent" />
        <Tile label="Weight" value={d.deliveredKg} unit="kg" tone="accent" />
        <Tile label="Shelf holders" value={d.holders} tone="blue" />
        <Tile label="Panels live" value={`${liveCount}/${total}`} />
      </dl>
      <ul className="space-y-0.5">
        {d.log.map((l, i) => (
          <li key={i} className="truncate font-mono text-[10.5px] text-white/80" title={l}>
            {l}
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center gap-1.5">
        {d.runners.map((r) => (
          <Pill key={r.name} tone="accent">
            {r.name}: {r.deliveries}
          </Pill>
        ))}
        {d.left.map((l) => (
          <Pill key={l} tone="warning" title="too heavy for every runner">
            left: {l}
          </Pill>
        ))}
      </div>
    </div>
  );
}

// ───────────────────────── dispatcher ─────────────────────────

export function panelBody(id: string, f: Fleet, liveCount: number, total: number): React.ReactNode {
  switch (id) {
    case "df-roster":
      return <Roster f={f} />;
    case "df-abilities":
      return <CarrierDesk f={f} />;
    case "df-generics":
      return <CopiesMade f={f} />;
    case "df-bounds":
      return <DropPlans f={f} />;
    case "df-hangar":
      return <HangarBoxes f={f} />;
    case "df-choice":
      return <PadsVsHangar f={f} />;
    case "df-derives":
      return <ParcelCardPanel f={f} />;
    case "df-convert":
      return <Conversions f={f} />;
    case "df-harbour":
      return <HarbourVectors f={f} />;
    case "df-ranking":
      return <BidRanking f={f} />;
    case "df-charging":
      return <ChargingDock f={f} />;
    case "df-pipeline":
      return <RouteReport f={f} />;
    case "df-depot":
      return <SharedDepot f={f} />;
    case "df-ledger":
      return <LedgerPanel f={f} />;
    case "df-rigs":
      return <Rigs f={f} />;
    default:
      return <DispatchBoard f={f} liveCount={liveCount} total={total} />;
  }
}

export { pickDrones };
