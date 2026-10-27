"use client";

import React from "react";
import {
  aliasOf,
  badgeOf,
  blockOwners,
  doubleOwned,
  elementBlocks,
  emptyOwners,
  frameGroups,
  hex,
  isPointer,
  resolveTarget,
  shortHex,
  type Block,
  type Entry,
  type Lab,
  type Shot,
  type Target,
} from "./data";
import { COL, Empty, Mono, Pill } from "./ui";

/**
 * The picture of memory itself: the workbench (stack cells with arrows between them), the shelf
 * (an array with pointer arithmetic), the call frames and the vault (heap bays with arrows from
 * the pointers that hold them).
 *
 * Rows have fixed heights, so arrows are computed from row numbers, not measured from the page.
 */

const ROW_H = 36;
const FRAME_H = 22;
const LANE_W = 52;

function arrowColor(entry: Entry, target: Target): string {
  if (target.kind === "dangling" || (target.kind === "heap" && !target.live)) return COL.bad;
  const b = badgeOf(entry);
  return b === "borrowed" ? COL.borrowed : b === "raw" ? COL.raw : COL.owner;
}

function Head({ x, y, color, dir }: { x: number; y: number; color: string; dir: "left" | "right" }) {
  const d = dir === "left" ? 1 : -1;
  return <polygon points={`${x},${y} ${x + 7 * d},${y - 4} ${x + 7 * d},${y + 4}`} fill={color} />;
}

/** One-line text for what a pointer-like entry points at. */
export function targetText(entry: Entry, target: Target, shot: Shot): string {
  switch (target.kind) {
    case "null":
      return "nullptr";
    case "cell": {
      const cell = shot.entries[target.index];
      return target.elem !== undefined ? `${cell.name}[${target.elem}]` : cell.name;
    }
    case "heap":
      return `bay #${target.block}${target.live ? "" : " (freed)"}`;
    case "dangling":
      return "dangling";
    case "static":
      return "static data";
    default:
      return entry.to !== undefined ? shortHex(entry.to) : "?";
  }
}

export function entryValue(e: Entry): string {
  switch (e.kind) {
    case "arr":
      return `[${(e.items ?? []).slice(0, 5).join(", ")}${(e.len ?? 0) > 5 ? ", …" : ""}]`;
    case "vec":
      return `size ${e.len ?? 0} · cap ${e.cap ?? 0}`;
    case "obj":
      return `{…} ${e.size} B`;
    default:
      return e.value ?? "";
  }
}

// ───────────────────────── workbench ─────────────────────────

type Row =
  | { kind: "frame"; name: string; y: number; h: number; count: number }
  | { kind: "cell"; index: number; entry: Entry; aliases: Entry[]; y: number; h: number };

function layoutRows(shot: Shot): { rows: Row[]; height: number; centerOf: Map<number, number> } {
  const alias = aliasOf(shot);
  const rows: Row[] = [];
  const centerOf = new Map<number, number>();
  let y = 0;
  for (const g of frameGroups(shot)) {
    const visible = g.entries.filter(({ index }) => !alias.has(index));
    rows.push({ kind: "frame", name: g.name, y, h: FRAME_H, count: visible.length });
    y += FRAME_H;
    for (const { entry, index } of visible) {
      const aliases = g.entries.filter((x) => alias.get(x.index) === index).map((x) => x.entry);
      rows.push({ kind: "cell", index, entry, aliases, y, h: ROW_H });
      centerOf.set(index, y + ROW_H / 2);
      y += ROW_H;
    }
  }
  // aliased entries live in their primary's row (also across frames)
  alias.forEach((primary, secondary) => {
    const c = centerOf.get(primary);
    if (c !== undefined) centerOf.set(secondary, c);
  });
  return { rows, height: y, centerOf };
}

function CellRow({ row, lab, shot, hit }: { row: Extract<Row, { kind: "cell" }>; lab: Lab; shot: Shot; hit: boolean }) {
  const e = row.entry;
  const badge = badgeOf(e);
  const target = isPointer(e) ? resolveTarget(lab, shot, e) : null;
  const text = target ? targetText(e, target, shot) : entryValue(e);
  const bad = target?.kind === "dangling" || (target?.kind === "heap" && !target.live);
  const accent = badge === "borrowed" ? COL.borrowed : badge === "raw" ? COL.raw : badge ? COL.owner : COL.line;
  return (
    <div
      data-cell={e.name}
      className={`flex min-w-0 items-center gap-2 rounded-md border bg-white/[0.035] px-2 ${hit ? "pv-pop" : ""}`}
      style={{ height: ROW_H - 4, marginBlock: 2, borderColor: bad ? "rgba(248,113,113,0.5)" : COL.line, borderLeft: `3px solid ${bad ? COL.bad : accent}` }}
      title={`${e.type} ${e.name} at ${hex(e.addr)} (${e.size} B)`}
    >
      <Mono className="hidden w-[3.4rem] shrink-0 text-white/35 @md:inline">{e.temp ? "temp" : shortHex(e.addr)}</Mono>
      <div className="min-w-0 flex-1 leading-tight">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="truncate text-[12px] font-semibold text-white/90">{e.name}</span>
          {row.aliases.map((a) => (
            <span key={a.name} className="shrink-0 rounded px-1 text-[9.5px] font-semibold" style={{ color: COL.borrowed, background: COL.borrowedSoft }} title={`${a.name} is another name for the same cell`}>
              = {a.name}
            </span>
          ))}
        </div>
        <div className="truncate font-mono text-[9.5px] text-white/40">{e.type}</div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {e.pointeeConst && <Pill kind="const" label="reads only" />}
        {e.selfConst && <Pill kind="const" label="fixed" />}
        {e.isConst && <Pill kind="const" />}
        {badge && <Pill kind={badge} />}
        <span className="hud-value max-w-[7.5rem] truncate text-[11px] tabular-nums" style={{ color: bad ? COL.bad : target?.kind === "null" ? COL.dim : COL.owner }} title={text}>
          {target && target.kind !== "null" ? "→ " : ""}
          {text}
        </span>
      </div>
    </div>
  );
}

/** Frames of stack cells, with an arrow lane at the right for pointers aimed at other cells. */
export function WorkbenchView({ lab, shot, compact = false }: { lab: Lab; shot: Shot; compact?: boolean }) {
  const { rows, height, centerOf } = layoutRows(shot);
  if (shot.entries.length === 0) return <Empty>Nothing was put on this photo. Use peek(&quot;name&quot;, variable); before snap.</Empty>;
  const arrows: { from: number; to: number; color: string; dashed: boolean; dangling: boolean }[] = [];
  shot.entries.forEach((e, i) => {
    if (!isPointer(e)) return;
    const t = resolveTarget(lab, shot, e);
    const from = centerOf.get(i);
    if (from === undefined) return;
    if (t.kind === "cell") {
      const to = centerOf.get(t.index);
      if (to !== undefined && to !== from) arrows.push({ from, to, color: arrowColor(e, t), dashed: badgeOf(e) === "borrowed", dangling: false });
    } else if (t.kind === "dangling") {
      arrows.push({ from, to: from, color: COL.bad, dashed: true, dangling: true });
    }
  });
  return (
    <div className="@container relative" style={{ minHeight: height }}>
      <div className="relative z-10" style={{ marginRight: arrows.length > 0 && !compact ? LANE_W : 0 }}>
        {rows.map((r, i) =>
          r.kind === "frame" ? (
            <div key={`f${i}`} className="flex items-center gap-2 pt-1.5" style={{ height: FRAME_H }}>
              <span className="hud-label truncate !text-[10px]">frame · {r.name}()</span>
              <span className="h-px flex-1 bg-white/10" />
              <span className="hud-label !text-[9.5px] text-white/30">{r.count}</span>
            </div>
          ) : (
            <CellRow key={`c${r.index}`} row={r} lab={lab} shot={shot} hit />
          ),
        )}
      </div>
      {arrows.length > 0 && !compact && (
        <svg className="pointer-events-none absolute right-0 top-0 z-0" width={LANE_W} height={height} aria-hidden>
          {arrows.slice(0, 24).map((a, i) => {
            const lane = 10 + (i % 4) * 9;
            if (a.dangling) {
              return (
                <g key={i} opacity={0.9}>
                  <path d={`M0 ${a.from} L${lane + 6} ${a.from}`} stroke={a.color} strokeWidth={1.6} strokeDasharray="3 3" fill="none" />
                  <path d={`M${lane + 6} ${a.from - 4} l8 8 m0 -8 l-8 8`} stroke={a.color} strokeWidth={1.6} />
                </g>
              );
            }
            return (
              <g key={i}>
                <path className="pv-draw" style={{ ["--pv-len" as string]: 160 }} d={`M0 ${a.from} C${lane + 14} ${a.from}, ${lane + 14} ${a.to}, 8 ${a.to}`} stroke={a.color} strokeWidth={1.7} strokeDasharray={a.dashed ? "4 3" : undefined} fill="none" />
                <Head x={1} y={a.to} color={a.color} dir="left" />
              </g>
            );
          })}
        </svg>
      )}
    </div>
  );
}

// ───────────────────────── shelf ─────────────────────────

export function ShelfView({ lab, shot }: { lab: Lab; shot: Shot }) {
  const arrIdx = shot.entries.findIndex((e) => e.kind === "arr");
  if (arrIdx < 0) return <Empty>No array on this photo.</Empty>;
  const arr = shot.entries[arrIdx];
  const es = arr.elemSize ?? 4;
  const len = arr.len ?? 0;
  const items = arr.items ?? [];
  const shown = Math.min(len, items.length);
  const pointers = shot.entries
    .map((e, i) => ({ e, i }))
    .filter(({ e, i }) => isPointer(e) && i !== arrIdx && e.to !== undefined && e.targetRegion === 0 && e.to >= arr.addr && e.to <= arr.addr + len * es);
  const byElem = (k: number) => pointers.filter(({ e }) => Math.floor((e.to! - arr.addr) / es) === k);
  return (
    <div className="@container">
      <div className="mb-1.5 flex min-w-0 items-baseline gap-2">
        <span className="truncate text-[12px] font-semibold text-white/90">{arr.name}</span>
        <Mono className="truncate text-white/40">{arr.type}</Mono>
        <Mono className="ml-auto shrink-0 text-white/40">
          {len} × {es} B = {arr.size} B
        </Mono>
      </div>
      <div className="pv-scroll overflow-x-auto pb-1">
        <div className="flex min-w-max items-stretch gap-1.5">
          {items.slice(0, shown).map((v, k) => (
            <div key={k} className="flex w-[3.7rem] flex-col items-center">
              <div className="hud-value w-full rounded-md border border-white/12 bg-white/[0.05] py-1.5 text-center text-[13px]" style={{ color: COL.owner }}>
                {v}
              </div>
              <Mono className="mt-1 text-white/35">[{k}]</Mono>
              <Mono className="text-white/30">+{k * es}</Mono>
              <div className="mt-1 flex min-h-[2.2rem] flex-col items-center gap-1">
                {byElem(k).map(({ e }) => {
                  const b = badgeOf(e);
                  const color = b === "borrowed" ? COL.borrowed : b === "raw" ? COL.raw : COL.owner;
                  return (
                    <div key={e.name} className="flex flex-col items-center" title={`${e.name} holds ${hex(e.to!)}`}>
                      <svg width="12" height="10" viewBox="0 0 12 10" aria-hidden>
                        <path d="M6 10 V2 M2 5 L6 1 L10 5" stroke={color} strokeWidth="1.6" fill="none" />
                      </svg>
                      <span className="rounded px-1 text-[10px] font-semibold" style={{ color, background: "rgba(255,255,255,0.06)" }}>
                        {e.name}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          <div className="flex w-[3.2rem] flex-col items-center opacity-70">
            <div className="w-full rounded-md border border-dashed border-white/15 py-1.5 text-center font-mono text-[11px] text-white/35">end</div>
            <Mono className="mt-1 text-white/30">+{len * es}</Mono>
            <Mono className="text-white/25">not yours</Mono>
            <div className="mt-1 flex min-h-[2.2rem] flex-col items-center gap-1">
              {pointers.filter(({ e }) => Math.floor((e.to! - arr.addr) / es) >= len).map(({ e }) => (
                <span key={e.name} className="rounded px-1 text-[10px] font-semibold" style={{ color: COL.raw, background: COL.rawSoft }}>
                  {e.name}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
      {pointers.length > 0 && (
        <ul className="mt-2 space-y-1.5">
          {pointers.map(({ e }) => {
            const off = e.to! - arr.addr;
            return (
              <li key={e.name} className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 rounded-md bg-white/[0.04] px-2 py-1.5 text-[11px]">
                <span className="font-semibold text-white/90">{e.name}</span>
                <Mono className="text-white/45">
                  = {arr.name} + {off / es} → {shortHex(e.to!)} (+{off} B)
                </Mono>
                <span className="ml-auto flex shrink-0 gap-1">
                  {e.pointeeConst && <Pill kind="const" label="data is read-only" />}
                  {e.selfConst && <Pill kind="const" label="pointer is fixed" />}
                  {!e.pointeeConst && !e.selfConst && <Pill kind="raw" label="plain int*" />}
                </span>
              </li>
            );
          })}
        </ul>
      )}
      {lab.scalars.slotTotal !== undefined && (
        <p className="hud-muted mt-2 text-[10.5px]">
          Walking the whole shelf with a pointer adds up to <span className="hud-value hud-accent">{String(lab.scalars.slotTotal)}</span>.
        </p>
      )}
    </div>
  );
}

// ───────────────────────── call frames ─────────────────────────

export function FramesView({ lab, shot }: { lab: Lab; shot: Shot }) {
  const groups = frameGroups(shot);
  const alias = aliasOf(shot);
  const dangling = shot.entries.flatMap((e) => {
    if (!isPointer(e)) return [];
    const t = resolveTarget(lab, shot, e);
    return t.kind === "dangling" ? [{ e, t }] : [];
  });
  // deepest call on top, main at the bottom, like plates piled up
  const ordered = [...groups].reverse();
  return (
    <div>
      <div className="space-y-1.5">
        {ordered.map((g, depth) => (
          <div key={g.name} className="rounded-md border border-white/12 bg-white/[0.035] px-2 py-1.5" style={{ marginInlineStart: (ordered.length - 1 - depth) * 0 + (depth === 0 && ordered.length > 1 ? 10 : 0) }}>
            <div className="mb-1 flex items-center gap-2">
              <span className="text-[11.5px] font-semibold text-white/90">{g.name}()</span>
              <span className="hud-label !text-[9.5px]">{depth === ordered.length - 1 ? "outermost frame" : depth === 0 ? "running now" : "caller"}</span>
              <Mono className="ml-auto text-white/35">{g.entries.length} on this frame</Mono>
            </div>
            <ul className="space-y-0.5">
              {g.entries.map(({ entry, index }) => {
                const primary = alias.get(index);
                const sameCell = primary !== undefined ? shot.entries[primary] : null;
                const t = isPointer(entry) ? resolveTarget(lab, shot, entry) : null;
                return (
                  <li key={index} className="flex min-w-0 items-center gap-2 text-[11px]">
                    <Mono className="w-[3.4rem] shrink-0 text-white/35">{shortHex(entry.addr)}</Mono>
                    <span className="min-w-0 truncate font-semibold text-white/85">{entry.name}</span>
                    {sameCell && (
                      <span className="shrink-0 rounded px-1 text-[9.5px] font-semibold" style={{ color: COL.borrowed, background: COL.borrowedSoft }}>
                        same cell as {sameCell.name} ({sameCell.frame})
                      </span>
                    )}
                    {!sameCell && !t && g.name !== "main" && shot.entries.some((x, j) => j !== index && x.name === "frameSlots") && (
                      <span className="shrink-0 rounded px-1 text-[9.5px] font-semibold" style={{ color: COL.raw, background: COL.rawSoft }}>
                        a copy: its own cell
                      </span>
                    )}
                    <span className="hud-value ml-auto max-w-[8rem] shrink-0 truncate tabular-nums" style={{ color: t?.kind === "dangling" ? COL.bad : COL.owner }}>
                      {t ? `→ ${targetText(entry, t, shot)}` : entryValue(entry)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
      <p className="hud-label mt-1.5 !normal-case !tracking-normal !text-[10px]">↑ newest call on top · frames are released from the top when a function returns</p>
      {dangling.map(({ e, t }) => (
        <div key={e.name} role="alert" className="mt-2 rounded-md border border-[#f87171]/40 bg-[#2a0f0f]/70 px-2.5 py-2 text-[11px] leading-snug">
          <span className="font-semibold" style={{ color: COL.bad }}>
            Dangling: {e.name}
          </span>
          <span className="text-white/75">
            {" "}
            still holds {hex(e.to ?? 0)}, but <span className="font-mono">{t.kind === "dangling" ? t.was : "that variable"}</span> from the photo “{t.kind === "dangling" ? t.photo : ""}” has gone out of scope. Looking at the address is fine; reading through it is undefined behaviour.
          </span>
        </div>
      ))}
    </div>
  );
}

// ───────────────────────── vault ─────────────────────────

const TILE_H = 54;
const TILE_GAP = 6;
const GUTTER = 44;
const LABEL_H = 18;

function blockLabel(block: Block, holders: { entry: Entry }[]): string {
  const pt = holders.find((h) => h.entry.pointee)?.entry.pointee;
  void block;
  return pt ?? "block";
}

export function VaultMap({ lab, shot, compact = false, finalShot = false }: { lab: Lab; shot: Shot; compact?: boolean; finalShot?: boolean }) {
  const tileH = compact ? 40 : TILE_H;
  const owners = blockOwners(shot);
  const leakIds = new Set(lab.audit?.leaks.map((l) => l.id) ?? []);
  const doubles = doubleOwned(shot);
  const stopped = shot.events.filter((e) => e.kind === "double-free");
  const empties = emptyOwners(lab, shot);
  const emptyNames = new Set(empties.map((x) => x.entry.name));
  // freed blocks the pointers still mention, even if the camera list dropped them
  const known = new Set(shot.blocks.map((b) => b.id));
  const ghost: Block[] = [];
  for (const e of shot.entries) {
    if (e.targetBlock !== undefined && !known.has(e.targetBlock)) {
      known.add(e.targetBlock);
      ghost.push({ id: e.targetBlock, size: 0, addr: e.to ?? 0, live: false, holds: [] });
    }
  }
  const limit = compact ? 6 : 14;
  const live = shot.blocks.filter((b) => b.live);
  const held = (b: Block) => (owners.get(b.id)?.holders.length ?? 0) > 0;
  // tier 1: bays a peeked pointer leads to. tier 2: what those bays hold (a container buffer holding its pieces).
  const tier2: Block[] = [];
  const seen = new Set(live.filter(held).map((b) => b.id));
  const queue = live.filter(held);
  for (let k = 0; k < queue.length && k < 60; k++) {
    for (const id of queue[k].holds) {
      const next = live.find((x) => x.id === id);
      if (next && !seen.has(id)) {
        seen.add(id);
        tier2.push(next);
        queue.push(next);
      }
    }
  }
  const rest = live.filter((b) => !seen.has(b.id));
  // what to draw first: bays the photo leads to, bays that leak, bays just returned, then the newest others
  const ordered = [
    ...live.filter(held),
    ...tier2,
    ...rest.filter((b) => leakIds.has(b.id)),
    ...shot.blocks.filter((b) => !b.live),
    ...ghost,
    ...rest.filter((b) => !leakIds.has(b.id)).reverse(),
  ];
  const picked = ordered.slice(0, limit);
  const rank = (b: Block) => (!b.live ? 3 : held(b) ? 0 : seen.has(b.id) ? 1 : 2);
  const shownBlocks = [...picked].sort((x, y) => rank(x) - rank(y) || x.id - y.id);
  const blocks = ordered;
  const tileY = new Map<number, number>();
  shownBlocks.forEach((b, i) => tileY.set(b.id, i * (tileH + TILE_GAP) + tileH / 2));
  const holders = shot.entries.map((e, i) => ({ e, i })).filter(({ e }) => isPointer(e) && (e.targetBlock !== undefined || emptyNames.has(e.name)));
  const rowsH = holders.length * ROW_H;
  const tilesH = shownBlocks.length * (tileH + TILE_GAP);
  const height = Math.max(rowsH, tilesH, 60);
  const others = shot.entries.length - holders.length;
  return (
    <div className="@container">
      <div className="grid items-start" style={{ gridTemplateColumns: `minmax(0,1fr) ${GUTTER}px minmax(0,1.15fr)`, minHeight: height }}>
        {/* left: who holds a slip */}
        <div>
          <div className="hud-label !text-[9.5px]" style={{ height: LABEL_H }}>holds a slip</div>
          {holders.length === 0 && <p className="hud-muted text-[11px]">No pointers to the vault on this photo.</p>}
          {holders.map(({ e }) => {
            const b = badgeOf(e);
            const t = resolveTarget(lab, shot, e);
            const empty = emptyNames.has(e.name);
            const color = b === "borrowed" ? COL.borrowed : b === "raw" ? COL.raw : COL.owner;
            return (
              <div key={e.name + e.addr} className="flex min-w-0 items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.035] px-2" style={{ height: ROW_H - 4, marginBlock: 2, borderLeft: `3px solid ${t.kind === "heap" && !t.live ? COL.bad : color}` }} title={`${e.type} ${e.name}`}>
                <div className="min-w-0 flex-1 leading-tight">
                  <div className="truncate text-[11.5px] font-semibold text-white/90">{e.name}</div>
                  <div className="truncate font-mono text-[9.5px] text-white/40">{e.type}</div>
                </div>
                {empty ? <Pill kind={empties.find((x) => x.entry.name === e.name)?.why ?? "empty"} /> : b && !compact ? <Pill kind={b} /> : null}
              </div>
            );
          })}
          {others > 0 && !compact && <p className="hud-muted mt-1 text-[10px]">+ {others} more on the bench (see Workbench)</p>}
        </div>
        {/* gutter: arrows */}
        <svg className="pointer-events-none" width={GUTTER} height={height + 18} style={{ marginTop: 0 }} aria-hidden>
          {holders.map(({ e }, i) => {
            if (e.targetBlock === undefined) return null;
            const y2 = tileY.get(e.targetBlock);
            if (y2 === undefined) return null;
            const t = resolveTarget(lab, shot, e);
            const color = arrowColor(e, t);
            const y1 = LABEL_H + i * ROW_H + (ROW_H - 4) / 2 + 2;
            return (
              <g key={e.name + i}>
                <path className="pv-draw" style={{ ["--pv-len" as string]: 120 }} d={`M0 ${y1} C${GUTTER * 0.55} ${y1}, ${GUTTER * 0.45} ${y2 + LABEL_H}, ${GUTTER - 7} ${y2 + LABEL_H}`} stroke={color} strokeWidth={1.7} strokeDasharray={badgeOf(e) === "borrowed" || (t.kind === "heap" && !t.live) ? "4 3" : undefined} fill="none" />
                <Head x={GUTTER - 1} y={y2 + LABEL_H} color={color} dir="right" />
              </g>
            );
          })}
        </svg>
        {/* right: the vault */}
        <div>
          <div className="hud-label !text-[9.5px]" style={{ height: LABEL_H }}>
            the vault · {shot.counters.live} bay{shot.counters.live === 1 ? "" : "s"} in use
          </div>
          {shownBlocks.length === 0 && <p className="hud-muted text-[11px]">The vault is empty on this photo.</p>}
          {shownBlocks.map((b) => {
            const o = owners.get(b.id);
            const hold = o?.holders ?? [];
            const inside = o?.inside ?? [];
            const leaked = leakIds.has(b.id);
            const unheld = b.live && hold.length === 0 && inside.length === 0;
            const twice = doubles.some((d) => d.block === b.id);
            const stoppedHere = stopped.some((e) => e.who === `#${b.id}`);
            const freed = !b.live;
            const border = freed ? "rgba(248,113,113,0.45)" : leaked ? COL.bad : twice ? COL.bad : unheld ? "rgba(255,255,255,0.14)" : hold.some((h) => h.badge === "unique" || h.badge === "owner" || h.badge === "container") ? "rgba(197,238,138,0.45)" : "rgba(255,255,255,0.18)";
            return (
              <div
                key={b.id}
                data-bay={b.id}
                className={`relative flex min-w-0 flex-col justify-center rounded-md px-2 ${stoppedHere ? "pv-flash" : ""}`}
                style={{ height: tileH, marginBottom: TILE_GAP, border: `1px ${unheld || freed ? "dashed" : "solid"} ${border}`, background: freed ? "rgba(248,113,113,0.05)" : "rgba(255,255,255,0.045)" }}
                title={`bay #${b.id}: ${b.size} bytes at ${hex(b.addr)}`}
              >
                <div className="flex min-w-0 items-center gap-1.5">
                  <span className="hud-value text-[12px] font-semibold" style={{ color: freed ? COL.bad : COL.ink, textDecoration: freed ? "line-through" : undefined }}>
                    #{b.id}
                  </span>
                  <span className="truncate text-[11px] text-white/70">{blockLabel(b, hold)}</span>
                  <Mono className="ml-auto shrink-0 text-white/40">{b.size > 0 ? `${b.size} B` : ""}</Mono>
                </div>
                <div className="mt-0.5 flex min-w-0 items-center gap-1 overflow-hidden">
                  {freed && <Pill kind="freed" label="returned" />}
                  {leaked && <Pill kind="leaked" />}
                  {twice && <Pill kind="two owners" />}
                  {stoppedHere && <Pill kind="freed" label="2nd delete stopped" />}
                  {unheld && !leaked && <Pill kind="lost" />}
                  {!compact && hold.slice(0, 3).map((h) => <Pill key={h.entry.name} kind={h.badge} label={`${h.badge} · ${h.entry.name}`} />)}
                  {compact && hold[0] && <Pill kind={hold[0].badge} />}
                  {inside.length > 0 && <Mono className="shrink-0 text-white/40">in #{inside.join(", #")}</Mono>}
                  {b.holds.length > 0 && <Mono className="shrink-0 text-white/40">→ {b.holds.map((h) => `#${h}`).join(" ")}</Mono>}
                </div>
              </div>
            );
          })}
          {blocks.length > limit && <p className="hud-muted text-[10px]">+ {blocks.length - limit} more bays</p>}
        </div>
      </div>
      <div className="mt-2 flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1 border-t border-white/10 pt-2 text-[10.5px]">
        <span className="hud-label !text-[9.5px]">audit so far</span>
        <span>
          taken <b className="hud-value text-white/90">{shot.counters.allocs}</b>
        </span>
        <span>
          returned <b className="hud-value text-white/90">{shot.counters.frees}</b>
        </span>
        <span>
          in use <b className="hud-value text-white/90">{shot.counters.live}</b> · {shot.counters.bytes} B
        </span>
        {shot.counters.badFrees > 0 && (
          <span style={{ color: COL.bad }}>
            second deletes stopped <b className="hud-value">{shot.counters.badFrees}</b>
          </span>
        )}
        {finalShot && lab.audit && (
          <span className="ml-auto font-semibold" style={{ color: lab.audit.leakCount > 0 || lab.audit.counters.badFrees > 0 ? COL.bad : COL.owner }}>
            {lab.audit.leakCount > 0 ? `${lab.audit.leakCount} bay${lab.audit.leakCount === 1 ? "" : "s"} never returned` : lab.audit.counters.badFrees > 0 ? `${lab.audit.counters.badFrees} bay freed twice` : "nothing left over"}
          </span>
        )}
      </div>
      {doubles.map((d) => (
        <div key={d.block} role="alert" className="mt-2 rounded-md border border-[#f87171]/40 bg-[#2a0f0f]/70 px-2.5 py-2 text-[11px] leading-snug text-white/80">
          <b style={{ color: COL.bad }}>Two owners for bay #{d.block}:</b> {d.names.join(" and ")}. Each will delete it when it ends: a double free. Give each its own copy.
        </div>
      ))}
    </div>
  );
}

export { elementBlocks };
