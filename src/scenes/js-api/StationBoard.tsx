"use client";

import React, { useState } from "react";
import { Minus, Plus, RefreshCw, Zap } from "lucide-react";
import { createStation, deleteStation, isSeeded, refreshBoard } from "./actions";
import { Feature, NeedsHook, type PanelCtx } from "./feature";
import { SEED_STATIONS } from "./sim-data";
import type { Station } from "./types";
import { BTN, Chip, Empty, Notice } from "./ui";
import { asNum, isRecord } from "./types";
import { pick } from "./util";

/** L5: the city map. Every station and bike count here came back from GET /stations and GET /stations/:id/bikes. */

const NEW_STATIONS = ["Pier Nine", "Copper Yard", "Linden Close", "Signal Box", "Orchard Gate", "Weir Road", "Tannery Lane"];
const ZONES = ["waterfront", "old-town", "central", "park", "east", "campus"];

const MAP_H = 82;

function place(stations: Station[]): Map<string, { x: number; y: number }> {
  const out = new Map<string, { x: number; y: number }>();
  let free = 0;
  for (const s of stations) {
    const seed = SEED_STATIONS.find((x) => x.id === s.id);
    if (typeof s.x === "number" && typeof s.y === "number") out.set(s.id, { x: s.x, y: s.y });
    else if (seed?.x !== undefined && seed.y !== undefined) out.set(s.id, { x: seed.x, y: seed.y });
    else out.set(s.id, { x: 10 + (free++ % 8) * 11, y: 78 });
  }
  return out;
}

function Roads({ pts }: { pts: { x: number; y: number }[] }) {
  const lines: [number, number][] = [];
  pts.forEach((a, i) => {
    pts
      .map((b, j) => ({ j, d: Math.hypot(a.x - b.x, a.y - b.y) }))
      .filter((o) => o.j !== i)
      .sort((p, q) => p.d - q.d)
      .slice(0, 2)
      .forEach((o) => {
        if (!lines.some(([p, q]) => (p === i && q === o.j) || (p === o.j && q === i))) lines.push([i, o.j]);
      });
  });
  return (
    <svg aria-hidden viewBox={`0 0 100 ${MAP_H}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
      {lines.map(([i, j]) => (
        <line key={`${i}-${j}`} x1={pts[i].x} y1={pts[i].y} x2={pts[j].x} y2={pts[j].y} stroke="rgba(255,255,255,0.14)" strokeWidth={0.6} strokeDasharray="1.6 1.6" vectorEffect="non-scaling-stroke" />
      ))}
    </svg>
  );
}

export function StationBoard({ ctx }: { ctx: PanelCtx }) {
  const { snap, driver } = ctx;
  const { stations, bikes } = snap.board;
  const [selected, setSelected] = useState<string | null>(null);
  const [note, setNote] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);
  const positions = place(stations);
  const list = (id: string) => bikes[id];
  const free = (id: string) => list(id)?.filter((b) => b.status === "available").length;
  const all = Object.values(bikes).flat();
  const electric = all.filter((b) => b.kind === "electric" && b.status === "available").length;
  const classic = all.filter((b) => b.kind === "classic" && b.status === "available").length;
  const added = [...stations].reverse().find((s) => !isSeeded(s.id));
  const detail = stations.find((s) => s.id === selected);

  const add = async () => {
    const body = { name: pick(NEW_STATIONS), zone: pick(ZONES), capacity: 10, x: 8 + Math.round(Math.random() * 84), y: 8 + Math.round(Math.random() * 62) };
    const ex = await createStation(driver, body);
    if (!ex) return setNote({ tone: "bad", text: "Could not log in as the admin to add a station." });
    setNote(ex.status === 201 ? { tone: "ok", text: `Added ${body.name} (${isRecord(ex.body) ? String(ex.body.id) : "new"}).` } : { tone: "bad", text: `Add failed: ${ex.outcome === "ok" ? ex.status : ex.outcome}.` });
  };
  const remove = async () => {
    if (!added) return;
    const ex = await deleteStation(driver, added.id);
    setNote(ex && ex.status < 300 ? { tone: "ok", text: `Removed ${added.name}.` } : { tone: "bad", text: `Remove failed: ${ex ? (ex.outcome === "ok" ? ex.status : ex.outcome) : "no token"}.` });
    setSelected(null);
  };

  return (
    <Feature
      id="api-stations"
      ctx={ctx}
      meta={stations.length ? `${stations.length} stations · ${all.filter((b) => b.status === "available").length} bikes free` : undefined}
      actions={
        ctx.interactive && (
          <>
            <button type="button" className={BTN} onClick={() => void refreshBoard(driver)} aria-label="Refresh stations and bike counts">
              <RefreshCw className="h-3 w-3" aria-hidden /> Refresh
            </button>
            <button type="button" className={BTN} onClick={() => void add()} aria-label="Create a station">
              <Plus className="h-3 w-3" aria-hidden /> Add
            </button>
            <button type="button" className={BTN} onClick={() => void remove()} disabled={!added} aria-label="Delete the newest added station">
              <Minus className="h-3 w-3" aria-hidden /> Remove
            </button>
          </>
        )
      }
    >
      <NeedsHook ctx={ctx} hook="handle">
        {stations.length === 0 ? (
          <Empty>Loading the stations from GET /stations…</Empty>
        ) : (
          <div className="px-3 py-2">
            <div className="relative w-full overflow-hidden rounded-lg border border-white/[0.08] bg-[#0d0d0d]" style={{ aspectRatio: `100 / ${MAP_H}`, maxHeight: 340 }}>
              <Roads pts={stations.map((s) => positions.get(s.id) ?? { x: 0, y: 0 })} />
              {stations.map((s) => {
                const p = positions.get(s.id) ?? { x: 50, y: 50 };
                const n = free(s.id);
                const cap = Math.max(1, asNum(s.capacity, 1));
                const pct = n === undefined ? 0 : Math.min(100, (n / cap) * 100);
                const size = 26 + Math.min(14, cap / 2);
                const low = n !== undefined && n <= 1;
                return (
                  <button
                    key={s.id}
                    type="button"
                    aria-label={`${s.name}, ${n ?? "unknown"} of ${cap} bikes available`}
                    aria-pressed={selected === s.id}
                    onClick={() => setSelected(selected === s.id ? null : s.id)}
                    className="group absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center focus-visible:outline-none"
                    style={{ left: `${p.x}%`, top: `${(p.y / MAP_H) * 100}%` }}
                  >
                    <span
                      className={`grid place-items-center rounded-full transition-transform group-hover:scale-110 group-focus-visible:ring-2 group-focus-visible:ring-[#c5ee8a] ${selected === s.id ? "ring-2 ring-white/80" : ""}`}
                      style={{ width: size, height: size, background: `conic-gradient(${low ? "#fbbf24" : "#c5ee8a"} ${pct}%, rgba(255,255,255,0.18) 0)` }}
                    >
                      <span className="grid place-items-center rounded-full bg-[#121212] font-mono text-[11px] font-semibold text-white" style={{ width: size - 7, height: size - 7 }}>
                        {n ?? "–"}
                      </span>
                    </span>
                    <span className="mt-0.5 max-w-[5.5rem] truncate rounded bg-black/55 px-1 text-[10px] leading-tight text-white/90">{s.name}</span>
                  </button>
                );
              })}
            </div>
            <div className="mt-2 flex min-w-0 flex-wrap items-center gap-1.5">
              <Chip tone="ok">
                <Zap className="h-2.5 w-2.5" aria-hidden />
                {electric} electric free
              </Chip>
              <Chip>{classic} classic free</Chip>
              {snap.board.at > 0 && <span className="text-[10px] text-white/60">ring = free bikes ÷ capacity</span>}
            </div>
            {detail && (
              <div className="mt-2 rounded-md bg-white/[0.05] px-2.5 py-2">
                <div className="flex min-w-0 items-baseline gap-2">
                  <span className="hud-title">{detail.name}</span>
                  <span className="hud-label !text-white/60">
                    {detail.id} · {detail.zone} · cap {detail.capacity}
                  </span>
                </div>
                <ul className="mt-1.5 flex flex-wrap gap-1" aria-label="Bikes at this station">
                  {(list(detail.id) ?? []).map((b) => (
                    <li key={b.id}>
                      <Chip tone={b.status === "available" ? "ok" : b.status === "service" ? "warn" : "dim"} title={`${b.kind}, ${b.status}`}>
                        {b.id.replace("bk-", "")} {b.kind === "electric" ? `⚡${b.battery ?? "?"}%` : "classic"}
                        {b.status !== "available" ? ` · ${b.status}` : ""}
                      </Chip>
                    </li>
                  ))}
                  {!list(detail.id) && <li className="text-[11px] text-white/60">Loading bikes…</li>}
                </ul>
              </div>
            )}
            {note && (
              <div className="mt-2">
                <Notice tone={note.tone}>{note.text}</Notice>
              </div>
            )}
          </div>
        )}
      </NeedsHook>
    </Feature>
  );
}
