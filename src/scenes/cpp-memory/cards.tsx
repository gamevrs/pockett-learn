"use client";

import React from "react";
import { Lock, ShieldCheck, TriangleAlert } from "lucide-react";
import {
  allEvents,
  blockOwners,
  doubleOwned,
  elementBlocks,
  emptyOwners,
  isCopy,
  isHeapEvent,
  isLife,
  isMove,
  outputLines,
  resolveTarget,
  sList,
  sNum,
  sNumList,
  sStr,
  totals,
  type Ev,
  type Lab,
  type Shot,
} from "./data";
import { COL, Empty, Mono, Pill, Stat } from "./ui";

/** The smaller panels of the board. Each one reads what it needs defensively and says so when it has nothing to show. */

const EVENT_COLOR: Record<string, string> = {
  ctor: COL.owner,
  dtor: COL.borrowed,
  copy: COL.raw,
  "assign-copy": COL.raw,
  move: "#f4f4f4",
  "assign-move": "#f4f4f4",
  "double-free": COL.bad,
};
const eventColor = (k: string) => EVENT_COLOR[k] ?? COL.dim;
const EVENT_GLYPH: Record<string, string> = { ctor: "+", dtor: "−", copy: "⎘", "assign-copy": "⎘", move: "➜", "assign-move": "➜", alloc: "▣", free: "▢", "double-free": "✕" };

// ───────────────────────── logbook ─────────────────────────

type LogRow = { type: "ev"; ev: Ev; depth: number; end: number | null; shot: number } | { type: "photo"; caption: string };

const LOG_ROW_H = 22;

function logRows(lab: Lab, withHeap: boolean): LogRow[] {
  const rows: LogRow[] = [];
  const open: { who: string; row: number; depth: number }[] = [];
  let depth = 0;
  const push = (ev: Ev, shot: number) => {
    if (!withHeap && isHeapEvent(ev.kind)) return;
    let d = depth;
    if (ev.kind === "ctor") {
      open.push({ who: ev.who, row: rows.length, depth });
      depth += 1;
    } else if (ev.kind === "dtor") {
      let k = open.length - 1;
      while (k >= 0 && open[k].who !== ev.who) k--;
      if (k >= 0) {
        const o = open[k];
        open.splice(k, 1);
        depth = o.depth;
        d = o.depth;
        const start = rows[o.row];
        if (start && start.type === "ev") start.end = rows.length;
      } else {
        depth = Math.max(0, depth - 1);
        d = depth;
      }
    }
    rows.push({ type: "ev", ev, depth: d, end: null, shot });
  };
  lab.shots.forEach((s, i) => {
    const before = rows.length;
    s.events.forEach((ev) => push(ev, i));
    if (rows.length > before) rows.push({ type: "photo", caption: s.caption });
  });
  lab.audit?.tail.forEach((ev) => push(ev, lab.shots.length));
  return rows;
}

export function Logbook({ lab, interactive }: { lab: Lab; interactive: boolean }) {
  const [withHeap, setWithHeap] = React.useState(false);
  const rows = logRows(lab, withHeap);
  const evCount = rows.filter((r) => r.type === "ev").length;
  const lifeCount = allEvents(lab).filter((x) => isLife(x.ev.kind)).length;
  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        <button type="button" aria-pressed={!withHeap} onClick={() => setWithHeap(false)} className={`h-6 rounded-full border px-2.5 text-[10px] font-medium transition-colors ${!withHeap ? "border-transparent bg-[#c5ee8a] text-[#0a0a0a]" : "border-white/12 bg-white/[0.04] text-white/70 hover:bg-white/10"}`}>
          Lifecycle
        </button>
        <button type="button" aria-pressed={withHeap} onClick={() => setWithHeap(true)} className={`h-6 rounded-full border px-2.5 text-[10px] font-medium transition-colors ${withHeap ? "border-transparent bg-[#c5ee8a] text-[#0a0a0a]" : "border-white/12 bg-white/[0.04] text-white/70 hover:bg-white/10"}`}>
          + heap bays
        </button>
        <span className="hud-value ml-auto text-[10px] text-white/45">{lifeCount} lifecycle lines</span>
      </div>
      {evCount === 0 ? (
        <Empty>The logbook is empty. Call trace(&quot;ctor&quot;, &quot;name&quot;); from a constructor, and trace(&quot;dtor&quot;, ...); from a destructor.</Empty>
      ) : (
        <div className={`pv-scroll rounded-md bg-black/40 py-1 ${interactive ? "max-h-72 overflow-auto" : "max-h-48 overflow-hidden"}`} role="log" aria-label="Lab logbook">
          <div className="relative" style={{ minWidth: 0 }}>
            {rows.map((r, i) =>
              r.type === "photo" ? (
                <div key={i} className="flex items-center gap-2 px-2 text-[9.5px] text-white/35" style={{ height: LOG_ROW_H }}>
                  <span className="h-px flex-1 bg-white/10" />
                  <span className="truncate">photo · {r.caption}</span>
                  <span className="h-px w-3 bg-white/10" />
                </div>
              ) : (
                <div key={i} className="relative flex min-w-0 items-center gap-1.5 pr-2" style={{ height: LOG_ROW_H, paddingLeft: 8 + r.depth * 14 }}>
                  {r.end !== null && (
                    <span aria-hidden className="absolute rounded-full" style={{ left: 8 + r.depth * 14 + 4, top: LOG_ROW_H / 2, width: 1.5, height: (rowsBetween(rows, i, r.end) - 0) * LOG_ROW_H, background: "rgba(197,238,138,0.28)" }} />
                  )}
                  <span className="grid h-4 w-4 shrink-0 place-items-center rounded text-[10px] font-bold leading-none" style={{ color: eventColor(r.ev.kind), background: "rgba(255,255,255,0.06)" }} aria-hidden>
                    {EVENT_GLYPH[r.ev.kind] ?? "·"}
                  </span>
                  <span className="w-[4.6rem] shrink-0 font-mono text-[10px]" style={{ color: eventColor(r.ev.kind) }}>
                    {r.ev.kind}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-mono text-[10.5px] text-white/80">{r.ev.who}</span>
                  {r.ev.extra !== undefined && isHeapEvent(r.ev.kind) && <Mono className="shrink-0 text-white/35">{r.ev.extra} B</Mono>}
                </div>
              ),
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function rowsBetween(rows: LogRow[], from: number, to: number): number {
  return Math.max(0, to - from);
}

// ───────────────────────── custody, casts, handover ─────────────────────────

export interface Handover {
  block: number;
  from: string[];
  to: string[];
}

/** Blocks whose owner changed between the previous photo and this one. */
export function handovers(lab: Lab, shot: Shot): Handover[] {
  const prev = shot.index > 0 ? lab.shots[shot.index - 1] : null;
  if (!prev) return [];
  const before = blockOwners(prev);
  const now = blockOwners(shot);
  const out: Handover[] = [];
  const ownerNames = (m: ReturnType<typeof blockOwners>, id: number) =>
    (m.get(id)?.holders ?? [])
      .filter((h) => h.badge === "unique" || h.badge === "owner" || h.badge === "container")
      .map((h) => h.entry.name)
      .sort();
  for (const b of shot.blocks) {
    if (!b.live) continue;
    const from = ownerNames(before, b.id);
    const to = ownerNames(now, b.id);
    if (from.length > 0 && to.length > 0 && from.join() !== to.join()) out.push({ block: b.id, from, to });
  }
  return out;
}

export function Custody({ lab, shot }: { lab: Lab; shot: Shot }) {
  const owners = blockOwners(shot);
  const doubles = doubleOwned(shot);
  const empties = emptyOwners(lab, shot);
  const moved = handovers(lab, shot);
  const rows = shot.blocks.filter((b) => b.live && (owners.get(b.id)?.holders.length ?? 0) > 0);
  return (
    <div>
      {rows.length === 0 && empties.length === 0 && <Empty>No pointer on this photo holds a heap bay. Peek an owning pointer with OWNER, or a unique_ptr.</Empty>}
      <ul className="space-y-1.5">
        {rows.map((b) => {
          const o = owners.get(b.id)!;
          const twice = doubles.some((d) => d.block === b.id);
          return (
            <li key={b.id} className="rounded-md border bg-white/[0.035] px-2 py-1.5" style={{ borderColor: twice ? "rgba(248,113,113,0.5)" : COL.line }}>
              <div className="flex min-w-0 items-center gap-2">
                <span className="hud-value text-[12px] font-semibold text-white/90">bay #{b.id}</span>
                <Mono className="text-white/40">{b.size} B</Mono>
                {twice && <Pill kind="two owners" />}
                {moved.find((m) => m.block === b.id) && <Pill kind="moved-from" label={`from ${moved.find((m) => m.block === b.id)!.from.join(", ")}`} />}
              </div>
              <div className="mt-1 flex flex-wrap gap-1">
                {o.holders.map((h) => (
                  <span key={h.entry.name} className="inline-flex items-center gap-1 text-[10.5px] text-white/75">
                    <Pill kind={h.badge} />
                    {h.entry.name}
                  </span>
                ))}
                {o.inside.length > 0 && <Mono className="text-white/40">inside bay #{o.inside.join(", #")}</Mono>}
              </div>
            </li>
          );
        })}
        {empties.map(({ entry, why }) => (
          <li key={entry.name} className="flex min-w-0 items-center gap-2 rounded-md border border-dashed border-white/15 px-2 py-1.5">
            <span className="min-w-0 truncate text-[11.5px] font-semibold text-white/80">{entry.name}</span>
            <Pill kind={why} />
            <span className="hud-muted ml-auto shrink-0 text-[10px]">holds nothing</span>
          </li>
        ))}
      </ul>
      {doubles.length === 0 && rows.some((b) => (owners.get(b.id)?.holders.filter((h) => h.badge !== "borrowed").length ?? 0) === 1) && (
        <p className="mt-2 flex items-center gap-1.5 text-[10.5px]" style={{ color: COL.owner }}>
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden /> One owner per bay.
        </p>
      )}
    </div>
  );
}

function byClass(events: Ev[], pred: (k: string) => boolean): [string, number][] {
  const m = new Map<string, number>();
  for (const e of events) if (pred(e.kind)) m.set(e.who.replace(/ x\d+$/, ""), (m.get(e.who.replace(/ x\d+$/, "")) ?? 0) + 1);
  return [...m].sort((a, b) => b[1] - a[1]);
}

function Bars({ items, color }: { items: [string, number][]; color: string }) {
  const max = Math.max(1, ...items.map((i) => i[1]));
  return (
    <ul className="space-y-1">
      {items.slice(0, 6).map(([name, n]) => (
        <li key={name} className="flex min-w-0 items-center gap-2 text-[11px]">
          <span className="w-[6.2rem] shrink-0 truncate text-white/75" title={name}>
            {name}
          </span>
          <span className="hud-bar h-1.5 flex-1">
            <span style={{ width: `${(n / max) * 100}%`, background: color }} />
          </span>
          <span className="hud-value w-5 shrink-0 text-right text-white/85">{n}</span>
        </li>
      ))}
    </ul>
  );
}

export function Casts({ lab }: { lab: Lab }) {
  const t = totals(lab);
  const evs = allEvents(lab).map((x) => x.ev);
  const verdictShot = [...lab.shots].reverse().find((s) => s.entries.filter((e) => e.kind === "ptr" && e.role === "owner").length >= 2);
  const doubles = verdictShot ? doubleOwned(verdictShot) : [];
  const copies = byClass(evs, isCopy);
  return (
    <div>
      <div className="grid grid-cols-2 gap-2">
        <Stat label="copies so far" value={t.copies} tone={t.copies > 0 ? "warn" : "plain"} sub="deep copies allocate" />
        <Stat label="copy lines in logbook" value={copies.reduce((n, c) => n + c[1], 0)} />
      </div>
      {copies.length > 0 && (
        <div className="mt-2">
          <div className="hud-label mb-1">copies by class</div>
          <Bars items={copies} color={COL.raw} />
        </div>
      )}
      {verdictShot && (
        <div className="mt-2 rounded-md border bg-white/[0.035] px-2.5 py-2 text-[11px] leading-snug" style={{ borderColor: doubles.length > 0 ? "rgba(248,113,113,0.5)" : "rgba(197,238,138,0.35)" }}>
          <div className="mb-0.5 flex items-center gap-1.5">
            {doubles.length > 0 ? <TriangleAlert className="h-3.5 w-3.5" style={{ color: COL.bad }} aria-hidden /> : <ShieldCheck className="h-3.5 w-3.5" style={{ color: COL.owner }} aria-hidden />}
            <b style={{ color: doubles.length > 0 ? COL.bad : COL.owner }}>{doubles.length > 0 ? "Shallow copy" : "Deep copy"}</b>
            <span className="hud-muted ml-auto truncate text-[10px]">{verdictShot.caption}</span>
          </div>
          <span className="text-white/70">
            {doubles.length > 0
              ? `${doubles[0].names.join(" and ")} point at the same bay: one array, two owners.`
              : "Every owner points at a bay of its own: copying made new memory."}
          </span>
        </div>
      )}
      {lab.scalars.morningFirst !== undefined && lab.scalars.backupFirst !== undefined && (
        <p className="hud-muted mt-2 text-[10.5px]">
          morning log <span className="hud-value hud-accent">{String(lab.scalars.morningFirst)}</span> · backup <span className="hud-value hud-accent">{String(lab.scalars.backupFirst)}</span> (changing the backup must not change the original)
        </p>
      )}
    </div>
  );
}

export function HandoverDesk({ lab, shot }: { lab: Lab; shot: Shot | null }) {
  const t = totals(lab);
  const evs = allEvents(lab).map((x) => x.ev);
  const moves = byClass(evs, isMove);
  const total = t.copies + t.moves;
  const empties = shot ? emptyOwners(lab, shot) : [];
  const trail = shot ? handovers(lab, shot) : [];
  return (
    <div>
      <div className="grid grid-cols-2 gap-2">
        <Stat label="moves so far" value={t.moves} tone="accent" sub="just pointers swapped" />
        <Stat label="copies so far" value={t.copies} tone={t.copies > 0 ? "warn" : "plain"} sub="each one allocates" />
      </div>
      {total > 0 && (
        <div className="mt-2">
          <div className="hud-label mb-1">copy vs move</div>
          <div className="flex h-2 overflow-hidden rounded-full bg-white/10" role="img" aria-label={`${t.copies} copies and ${t.moves} moves`}>
            <span style={{ width: `${(t.copies / total) * 100}%`, background: COL.raw }} />
            <span style={{ width: `${(t.moves / total) * 100}%`, background: COL.owner }} />
          </div>
        </div>
      )}
      {moves.length > 0 && (
        <div className="mt-2">
          <div className="hud-label mb-1">moves by class</div>
          <Bars items={moves} color={COL.owner} />
        </div>
      )}
      {empties.length > 0 && (
        <ul className="mt-2 space-y-1">
          {empties.map(({ entry, why }) => (
            <li key={entry.name} className="flex min-w-0 items-center gap-2 rounded-md border border-dashed border-white/15 px-2 py-1 text-[11px]">
              <span className="min-w-0 truncate font-semibold text-white/80">{entry.name}</span>
              <Pill kind={why} />
              <Mono className="ml-auto shrink-0 text-white/40">null</Mono>
            </li>
          ))}
        </ul>
      )}
      {trail.length > 0 && (
        <ul className="mt-2 space-y-1">
          {trail.map((h) => (
            <li key={h.block} className="text-[10.5px] text-white/70">
              bay #{h.block}: <span className="font-mono text-white/50">{h.from.join(", ")}</span> → <span className="font-mono" style={{ color: COL.owner }}>{h.to.join(", ")}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ───────────────────────── rule board ─────────────────────────

export function RuleBoard({ lab }: { lab: Lab }) {
  const evs = allEvents(lab).map((x) => x.ev);
  const names = [...new Set(evs.filter((e) => /^Plaque/.test(e.who)).map((e) => e.who))].sort((a, b) => a.length - b.length || a.localeCompare(b));
  if (names.length === 0) return <Empty>Move a Plaque, a PlaqueFive and a PlaqueZero to fill this board.</Empty>;
  const rows = names.map((name) => {
    const mine = evs.filter((e) => e.who === name);
    const copies = mine.filter((e) => isCopy(e.kind)).length;
    const moves = mine.filter((e) => isMove(e.kind)).length;
    return { name, copies, moves, dtor: mine.some((e) => e.kind === "dtor") };
  });
  return (
    <div>
      <ul className="space-y-1.5">
        {rows.map((r) => {
          const trap = r.copies > 0 && r.moves === 0;
          return (
            <li key={r.name} className="rounded-md border bg-white/[0.035] px-2.5 py-1.5" style={{ borderColor: trap ? "rgba(251,191,36,0.5)" : COL.line }}>
              <div className="flex min-w-0 items-center gap-2">
                <span className="text-[12px] font-semibold text-white/90">{r.name}</span>
                <Pill kind={r.dtor ? "owner" : "empty"} label={r.dtor ? "declares destructor" : "declares nothing"} />
                <span className="ml-auto flex shrink-0 gap-2 text-[11px]">
                  <span style={{ color: r.copies > 0 ? COL.raw : COL.faint }}>
                    copy <b className="hud-value">{r.copies}</b>
                  </span>
                  <span style={{ color: r.moves > 0 ? COL.owner : COL.faint }}>
                    move <b className="hud-value">{r.moves}</b>
                  </span>
                </span>
              </div>
              {trap && <p className="mt-1 text-[10.5px] leading-snug" style={{ color: COL.raw }}>std::move quietly turned into a copy: the destructor switched the move members off.</p>}
              {!trap && r.moves > 0 && <p className="hud-muted mt-1 text-[10.5px] leading-snug">{r.dtor ? "Rule of five: every member decided explicitly." : "Rule of zero: the members look after themselves."}</p>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ───────────────────────── storeroom ─────────────────────────

export function Storeroom({ lab, shot }: { lab: Lab; shot: Shot }) {
  const vec = shot.entries.find((e) => e.kind === "vec" && elementBlocks(e).some((b) => b !== null));
  const empties = emptyOwners(lab, shot);
  const views = shot.entries.filter((e) => e.kind === "ptr" && e.role === "borrowed");
  const owners = shot.entries.filter((e) => e.kind === "own" && e.targetBlock !== undefined);
  return (
    <div>
      {vec ? (
        <div>
          <div className="mb-1 flex items-center gap-2">
            <span className="text-[12px] font-semibold text-white/90">{vec.name}</span>
            <Pill kind="container" />
            <Mono className="ml-auto text-white/40">{vec.len ?? 0} slot{vec.len === 1 ? "" : "s"}</Mono>
          </div>
          <div className="pv-scroll flex gap-1.5 overflow-x-auto pb-1">
            {elementBlocks(vec).map((b, k) => (
              <div key={k} className="w-[5.2rem] shrink-0 rounded-md border bg-white/[0.045] px-2 py-1.5 text-center" style={{ borderColor: "rgba(197,238,138,0.4)" }}>
                <Mono className="text-white/35">slot {k}</Mono>
                <div className="hud-value text-[13px] font-semibold text-white/90">{b === null ? "—" : `#${b}`}</div>
                <Pill kind="unique" />
                {views.filter((v) => v.targetBlock === b).map((v) => (
                  <div key={v.name} className="mt-1 truncate text-[9.5px]" style={{ color: COL.borrowed }} title={`${v.name} borrows this piece`}>
                    ↖ {v.name}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <Empty>Put a std::vector of unique_ptr on a photo to see the slots.</Empty>
      )}
      {owners.length > 0 && (
        <ul className="mt-2 space-y-1">
          {owners.map((o) => (
            <li key={o.name} className="flex min-w-0 items-center gap-2 text-[11px]">
              <span className="truncate font-semibold text-white/85">{o.name}</span>
              <Pill kind="unique" />
              <Mono className="ml-auto text-white/45">owns bay #{o.targetBlock}</Mono>
            </li>
          ))}
        </ul>
      )}
      {empties.length > 0 && (
        <ul className="mt-2 space-y-1">
          {empties.map(({ entry, why }) => (
            <li key={entry.name} className="flex min-w-0 items-center gap-2 rounded-md border border-dashed border-white/15 px-2 py-1 text-[11px]">
              <span className="truncate font-semibold text-white/80">{entry.name}</span>
              <Pill kind={why} />
              <span className="hud-muted ml-auto text-[10px]">empty unique_ptr</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ───────────────────────── operators, glass case ─────────────────────────

function Truth({ label, value }: { label: string; value: boolean | undefined }) {
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-md bg-white/[0.04] px-2.5 py-1.5 text-[11px]">
      <span className="font-mono text-white/80">{label}</span>
      <span className="ml-auto font-semibold" style={{ color: value === undefined ? COL.faint : value ? COL.owner : COL.bad }}>
        {value === undefined ? "—" : value ? "true" : "false"}
      </span>
    </div>
  );
}

export function Operators({ lab }: { lab: Lab }) {
  const printed = outputLines(lab.stdout).filter((l) => / g$/.test(l));
  const grams = sNum(lab.scalars.carriedGrams);
  return (
    <div>
      <div className="space-y-1.5">
        <Truth label="light < heavy" value={typeof lab.scalars.lightLighter === "boolean" ? lab.scalars.lightLighter : undefined} />
        <Truth label="testRack[0] == Weight{320}" value={typeof lab.scalars.slotMatches === "boolean" ? lab.scalars.slotMatches : undefined} />
      </div>
      {grams !== undefined && (
        <div className="mt-2 rounded-md bg-white/[0.04] px-2.5 py-2">
          <div className="hud-label">carried = light + heavy; carried += 50</div>
          <div className="hud-value mt-0.5 text-[18px] tabular-nums" style={{ color: COL.owner }}>
            {grams} g
          </div>
        </div>
      )}
      {printed.length > 0 && (
        <div className="hud-log mt-2 rounded-md bg-black/40 px-2 py-1.5" role="log" aria-label="Printed by operator<<">
          {printed.map((l, i) => (
            <div key={i} className="hud-log-line truncate">
              {l}
            </div>
          ))}
        </div>
      )}
      {printed.length === 0 && grams === undefined && <Empty>Run to see your operators work.</Empty>}
    </div>
  );
}

export function GlassCase({ lab, shot }: { lab: Lab; shot: Shot | null }) {
  const sealed = shot?.entries.find((e) => e.isConst && (e.kind === "obj" || e.kind === "val"));
  const copies = sNum(lab.scalars.constCopies);
  const cond = sNum(lab.scalars.beadCondition);
  const lines = outputLines(lab.stdout).filter((l) => / at \d+%$|: \d+$/.test(l) && /bead/i.test(l));
  return (
    <div>
      <div className="relative rounded-lg border px-3 py-3" style={{ borderColor: "rgba(143,179,201,0.45)", background: "linear-gradient(160deg, rgba(143,179,201,0.12), rgba(143,179,201,0.02))" }}>
        <Lock className="absolute right-2.5 top-2.5 h-4 w-4" style={{ color: COL.borrowed }} aria-hidden />
        {sealed ? (
          <>
            <div className="hud-label">under glass · const</div>
            <div className="mt-0.5 text-[13px] font-semibold text-white/90">{sealed.name}</div>
            <Mono className="text-white/45">{sealed.type} · {sealed.size} B</Mono>
            <p className="mt-1.5 text-[10.5px] leading-snug text-white/65">Only const member functions may touch it. restore() would not compile.</p>
          </>
        ) : (
          <p className="hud-muted text-[11px]">Peek a const object to see it under glass.</p>
        )}
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <Stat label="copies while reading" value={copies ?? "—"} tone={copies === 0 ? "accent" : copies ? "warn" : "plain"} sub="const& avoids them" />
        <Stat label="working bead" value={cond !== undefined ? `${cond}%` : "—"} sub="restored by 10" />
      </div>
      {lines.length > 0 && (
        <div className="hud-log mt-2 rounded-md bg-black/40 px-2 py-1.5">
          {lines.map((l, i) => (
            <div key={i} className="hud-log-line truncate">
              {l}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ───────────────────────── manifest ─────────────────────────

export function Manifest({ lab, interactive }: { lab: Lab; interactive: boolean }) {
  const ids = sList(lab.scalars.intakeIds);
  const names = sList(lab.scalars.intakeNames);
  const years = sNumList(lab.scalars.intakeYears);
  const conds = sNumList(lab.scalars.intakeConditions);
  const rejLines = sList(lab.scalars.rejectLines);
  const rejWhy = sList(lab.scalars.rejectReasons);
  if (ids.length === 0 && rejLines.length === 0) return <Empty>Read the manifest to fill this desk.</Empty>;
  return (
    <div>
      <div className="mb-1.5 flex gap-2 text-[10.5px]">
        <span style={{ color: COL.owner }}>
          <b className="hud-value">{ids.length}</b> accepted
        </span>
        <span style={{ color: rejLines.length > 0 ? COL.raw : COL.faint }}>
          <b className="hud-value">{rejLines.length}</b> refused
        </span>
      </div>
      <div className={`pv-scroll rounded-md bg-black/40 ${interactive ? "max-h-60 overflow-auto" : "max-h-44 overflow-hidden"}`}>
        <table className="w-full min-w-[17rem] border-separate border-spacing-0 text-left text-[11px]">
          <thead>
            <tr className="text-[9.5px] uppercase tracking-wider text-white/40">
              <th className="px-2 py-1 font-medium">id</th>
              <th className="px-2 py-1 font-medium">name</th>
              <th className="px-2 py-1 text-right font-medium">year</th>
              <th className="w-20 px-2 py-1 font-medium">condition</th>
            </tr>
          </thead>
          <tbody>
            {ids.map((id, i) => (
              <tr key={id + i} className="border-t border-white/5">
                <td className="whitespace-nowrap px-2 py-1 font-mono text-white/85">{id}</td>
                <td className="max-w-[7rem] truncate px-2 py-1 text-white/75">{names[i] ?? ""}</td>
                <td className="px-2 py-1 text-right font-mono tabular-nums text-white/65">{years[i] ?? ""}</td>
                <td className="px-2 py-1">
                  <span className="hud-bar block h-1.5">
                    <span style={{ width: `${Math.max(0, Math.min(100, conds[i] ?? 0))}%`, background: (conds[i] ?? 0) < 60 ? COL.raw : COL.owner }} />
                  </span>
                  <span className="sr-only">{conds[i]}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rejLines.length > 0 && (
        <ul className="mt-2 space-y-1.5">
          {rejLines.map((line, i) => (
            <li key={i} className="rounded-md border border-[#fbbf24]/30 bg-[#fbbf24]/[0.06] px-2 py-1.5">
              <div className="truncate font-mono text-[10.5px] text-white/75" title={line}>
                {line}
              </div>
              <div className="mt-0.5 text-[10.5px] font-semibold" style={{ color: COL.raw }}>
                refused: {rejWhy[i] ?? "unknown reason"}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ───────────────────────── fault drill ─────────────────────────

function Lane({ title, tag, held, error, tone }: { title: string; tag: string; held: number | undefined; error: string | undefined; tone: "warn" | "accent" }) {
  const color = tone === "warn" ? COL.raw : COL.owner;
  return (
    <div className="min-w-0 rounded-md border bg-white/[0.035] px-2.5 py-2" style={{ borderColor: `${color}55` }}>
      <div className="flex min-w-0 items-center gap-2">
        <span className="truncate text-[12px] font-semibold text-white/90">{title}</span>
        <span className="ml-auto shrink-0 rounded-full px-1.5 text-[9.5px] font-semibold" style={{ color, background: `${color}22` }}>
          {tag}
        </span>
      </div>
      <div className="hud-value mt-1 text-[20px] tabular-nums" style={{ color }}>
        {held ?? "—"}
      </div>
      <div className="hud-muted text-[10px]">pieces on the shelf after the failure</div>
      <div className="mt-1.5 truncate font-mono text-[10.5px]" style={{ color: COL.bad }} title={error}>
        {error ? `threw: ${error}` : "no error recorded"}
      </div>
    </div>
  );
}

export function FaultDrill({ lab, shot }: { lab: Lab; shot: Shot | null }) {
  const unwound = shot ? shot.events.filter((e) => e.kind === "dtor").map((e) => e.who) : [];
  return (
    <div>
      <div className="grid gap-2 @md:grid-cols-2">
        <Lane title="Basic" tag="valid, but changed" held={sNum(lab.scalars.basicHeld)} error={sStr(lab.scalars.basicError)} tone="warn" />
        <Lane title="Strong" tag="all or nothing" held={sNum(lab.scalars.strongHeld)} error={sStr(lab.scalars.strongError)} tone="accent" />
      </div>
      {unwound.length > 0 && (
        <p className="hud-muted mt-2 text-[10.5px] leading-snug">
          While the exception unwound the stack, destructors ran for <span className="font-mono text-white/80">{unwound.join(", ")}</span>: RAII cleaned up without a single delete.
        </p>
      )}
    </div>
  );
}

// ───────────────────────── registry ─────────────────────────

export function RegistryView({ lab, shot }: { lab: Lab; shot: Shot }) {
  const reg = shot.entries.find((e) => e.kind === "vec" && e.name.toLowerCase().includes("registry")) ?? shot.entries.find((e) => e.kind === "vec");
  const elems = reg ? elementBlocks(reg) : [];
  const views = shot.entries.filter((e) => e.kind === "ptr" && e.role === "borrowed");
  return (
    <div>
      {reg ? (
        <div className="rounded-md border bg-white/[0.035] px-2.5 py-2" style={{ borderColor: "rgba(197,238,138,0.35)" }}>
          <div className="flex min-w-0 items-center gap-2">
            <span className="text-[12px] font-semibold text-white/90">Registry</span>
            <Pill kind="container" label="the only owner" />
            <Mono className="ml-auto text-white/45">{reg.len ?? 0} pieces</Mono>
          </div>
          <div className="pv-scroll mt-1.5 flex gap-1 overflow-x-auto pb-1">
            {elems.map((b, k) => (
              <div key={k} className="w-[3.6rem] shrink-0 rounded border px-1 py-1 text-center" style={{ borderColor: "rgba(197,238,138,0.35)", background: "rgba(197,238,138,0.06)" }}>
                <Mono className="text-white/35">{k}</Mono>
                <div className="hud-value text-[11.5px] font-semibold text-white/90">{b === null ? "—" : `#${b}`}</div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <Empty>Peek registry.pieces() to see the owner.</Empty>
      )}
      <ul className="mt-2 space-y-1.5">
        {views.map((v) => {
          const t = resolveTarget(lab, shot, v);
          const stale = t.kind === "heap" && !t.live;
          const nothing = t.kind === "null";
          const color = stale ? COL.bad : nothing ? COL.dim : COL.borrowed;
          return (
            <li key={v.name} className="flex min-w-0 items-center gap-2 rounded-md border bg-white/[0.035] px-2.5 py-1.5" style={{ borderColor: stale ? "rgba(248,113,113,0.5)" : COL.line }}>
              <span className="min-w-0 truncate text-[11.5px] font-semibold text-white/90">{v.name}</span>
              <Pill kind={stale ? "freed" : "borrowed"} label={stale ? "stale handle" : nothing ? "no such piece" : "borrowed"} />
              <Mono className="ml-auto shrink-0" >
                <span style={{ color }}>{stale ? `bay #${t.kind === "heap" ? t.block : "?"} was freed` : nothing ? "nullptr" : t.kind === "heap" ? `→ bay #${t.block}` : "→ ?"}</span>
              </Mono>
            </li>
          );
        })}
      </ul>
      <div className="mt-2 grid grid-cols-3 gap-2">
        <Stat label="registered" value={sNum(lab.scalars.registrySize) ?? "—"} />
        <Stat label="mirror" value={sNum(lab.scalars.mirrorCondition) !== undefined ? `${sNum(lab.scalars.mirrorCondition)}%` : "—"} sub="via a view" />
        <Stat label="lamp gone" value={lab.scalars.lampGone === true ? "yes" : lab.scalars.lampGone === false ? "no" : "—"} tone={lab.scalars.lampGone === true ? "accent" : "plain"} />
      </div>
    </div>
  );
}

// ───────────────────────── final report ─────────────────────────

export function Report({ lab }: { lab: Lab }) {
  const a = lab.audit;
  const lines = outputLines(lab.stdout);
  const start = lines.indexOf("Larkspur Lab report");
  const report = start >= 0 ? lines.slice(start, start + 6) : [];
  const copies = sNum(lab.scalars.runCopies);
  const moves = sNum(lab.scalars.runMoves);
  const total = (copies ?? 0) + (moves ?? 0);
  const clean = a ? a.leakCount === 0 && a.counters.badFrees === 0 : undefined;
  return (
    <div>
      <div className="flex items-center gap-3 rounded-lg border px-3 py-2.5" style={{ borderColor: clean === undefined ? COL.line : clean ? "rgba(197,238,138,0.5)" : "rgba(248,113,113,0.5)", background: clean ? "rgba(197,238,138,0.07)" : "rgba(255,255,255,0.03)" }}>
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full" style={{ background: clean ? COL.ownerSoft : clean === false ? COL.badSoft : "rgba(255,255,255,0.06)", color: clean ? COL.owner : clean === false ? COL.bad : COL.dim }}>
          {clean === false ? <TriangleAlert className="h-5 w-5" aria-hidden /> : <ShieldCheck className="h-5 w-5" aria-hidden />}
        </span>
        <div className="min-w-0">
          <div className="text-[13px] font-semibold text-white/90">{clean === undefined ? "Waiting for the audit" : clean ? "Zero leaks. Nothing freed twice." : a!.leakCount > 0 ? `${a!.leakCount} bay${a!.leakCount === 1 ? "" : "s"} never returned` : `${a!.counters.badFrees} block${a!.counters.badFrees === 1 ? "" : "s"} freed twice`}</div>
          <div className="hud-muted text-[10.5px]">
            {a ? `${a.counters.allocs} bays taken · ${a.counters.frees} returned · peak ${a.counters.peak} B` : "The audit prints when main ends."}
          </div>
        </div>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <Stat label="copies this run" value={copies ?? "—"} tone={copies ? "warn" : "plain"} sub="made on purpose" />
        <Stat label="moves this run" value={moves ?? "—"} tone="accent" sub="cheap hand-overs" />
      </div>
      {total > 0 && (
        <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-white/10" role="img" aria-label={`${copies} copies against ${moves} moves`}>
          <span style={{ width: `${((copies ?? 0) / total) * 100}%`, background: COL.raw }} />
          <span style={{ width: `${((moves ?? 0) / total) * 100}%`, background: COL.owner }} />
        </div>
      )}
      {report.length > 0 && (
        <div className="hud-log mt-2 rounded-md bg-black/40 px-2 py-1.5" role="log" aria-label="Lab report">
          {report.map((l, i) => (
            <div key={i} className="hud-log-line truncate">
              {l}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
