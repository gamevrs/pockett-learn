"use client";

import React, { useId, useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { CAN_ID_BITS, CAN_MAX_ID, arbitrate, hex3, isValidCanId, type CanBitRow, type CanNodeIn } from "./canArb";
import { Caption, Note, Stepper, ToyNote, clamp } from "./ui";

// ───────────────────────────── emb-can: CAN bus arbitration on the 11-bit identifier ─────────────────────────────

export interface CanProps {
  /** Starting nodes: id (key), name, canId (0..0x7FF). Defaults to Window, Radio, Brake. */
  nodes?: { id: string; name: string; canId: number }[];
  /** Node ids whose ID cannot be edited. */
  lock?: string[];
  task?: string;
}

export interface CanState {
  /** CAN ID of every node, by node id. */
  ids: Record<string, number>;
  /** Winner node id, or null (equal IDs). */
  winner: string | null;
  /** CAN ID of the winner, or null. */
  winnerId: number | null;
  /** True if two nodes share an ID. */
  duplicate: boolean;
  /** Bit index where each node backed off, or null. */
  lostAt: Record<string, number | null>;
}

const DEFAULT_NODES: CanNodeIn[] = [
  { id: "window", name: "Window", canId: 0x2a0 },
  { id: "radio", name: "Radio", canId: 0x3f1 },
  { id: "brake", name: "Brake", canId: 0x5c0 },
];

const BITS = Array.from({ length: CAN_ID_BITS }, (_, i) => CAN_ID_BITS - 1 - i);

function parseId(text: string): number | null {
  const t = text.trim().replace(/^0x/i, "").replace(/_/g, "");
  if (!/^[0-9a-f]{1,3}$/i.test(t)) return null;
  const n = parseInt(t, 16);
  return isValidCanId(n) ? n : null;
}

/** A hex ID box that keeps what you type until you leave it. */
function IdField({ label, value, onCommit, disabled }: { label: string; value: number; onCommit: (n: number) => void; disabled?: boolean }) {
  const id = useId();
  const [draft, setDraft] = useState<string | null>(null);
  const parsed = draft === null ? null : parseId(draft);
  const shown = draft !== null && parsed === value ? draft : hex3(value);
  const bad = draft !== null && draft.trim() !== "" && parsed === null;
  return (
    <div className="flex flex-col items-start gap-1">
      <label htmlFor={id} className="font-mono text-[10.5px] font-medium uppercase tracking-[0.08em] text-ink-3">
        {label}
      </label>
      <input
        id={id}
        type="text"
        inputMode="text"
        autoComplete="off"
        spellCheck={false}
        value={shown}
        disabled={disabled}
        aria-invalid={bad}
        onChange={(e) => {
          const t = e.target.value;
          setDraft(t);
          const n = parseId(t);
          if (n !== null) onCommit(n);
        }}
        onBlur={() => setDraft(null)}
        className={`min-h-10 w-24 rounded-lg border bg-surface px-2 text-center font-mono text-sm text-ink disabled:opacity-60 ${bad ? "border-[var(--bad)]" : "border-line"}`}
      />
      {bad && <span className="text-[0.78rem] text-[var(--bad)]">Type 0x000 to 0x7FF</span>}
    </div>
  );
}

/** One cell of the bit table: the bit and D (dominant, 0) or R (recessive, 1) as text, not only as fill. */
function Cell({ bit, level, lost, who }: { bit: number; level: 0 | 1 | null; lost?: boolean; who: string }) {
  if (level === null) {
    return (
      <span className="grid h-10 min-w-0 place-items-center rounded-md border border-dashed border-line text-[0.75rem] text-ink-3">
        <span aria-hidden>·</span>
        <span className="sr-only">{`${who}, bit ${bit}: stopped sending`}</span>
      </span>
    );
  }
  const dom = level === 0;
  return (
    <span
      className={`flex h-10 min-w-0 flex-col items-center justify-center rounded-md border font-mono leading-none ${dom ? "border-line bg-tint text-ink" : "border-line bg-surface text-ink"} ${lost ? "border-2 border-[var(--line-strong)] ring-2 ring-[var(--brand)]" : ""}`}
    >
      <span aria-hidden className="text-[0.85rem] font-semibold">
        {level}
      </span>
      <span aria-hidden className="mt-0.5 text-[0.7rem] text-ink-2">
        {lost ? "✕" : dom ? "D" : "R"}
      </span>
      <span className="sr-only">{`${who}, bit ${bit}: sent ${level}, ${dom ? "dominant" : "recessive"}${lost ? ", read dominant, so it lost arbitration and stops" : ""}`}</span>
    </span>
  );
}

export function Can({ props, onChange, revealed }: WidgetProps<CanProps>) {
  const locked = Boolean(revealed);
  const src = Array.isArray(props.nodes) && props.nodes.length ? props.nodes : DEFAULT_NODES;
  const startNodes: CanNodeIn[] = src.slice(0, 4).map((n, i) => ({
    id: String(n.id ?? `n${i}`),
    name: String(n.name ?? `Node ${i + 1}`),
    canId: clamp(Math.round(Number.isFinite(n.canId) ? n.canId : 0), 0, CAN_MAX_ID),
  }));
  const lockSet = new Set(props.lock ?? []);
  const [ids, setIds] = useState<Record<string, number>>(() => Object.fromEntries(startNodes.map((n) => [n.id, n.canId])));

  const nodes: CanNodeIn[] = startNodes.map((n) => ({ ...n, canId: ids[n.id] ?? n.canId }));
  const res = arbitrate(nodes);

  const setId = (nodeId: string, canId: number) => {
    const nextIds = { ...ids, [nodeId]: canId };
    setIds(nextIds);
    const r = arbitrate(startNodes.map((n) => ({ ...n, canId: nextIds[n.id] ?? n.canId })));
    if (!r.ok) return;
    const w = r.winner ? nextIds[r.winner] : null;
    onChange?.({ ids: nextIds, winner: r.winner, winnerId: w ?? null, duplicate: r.duplicate, lostAt: r.lostAt } satisfies CanState);
  };

  const nameOf = (id: string) => startNodes.find((n) => n.id === id)?.name ?? id;
  const rows: CanBitRow[] = res.ok ? res.rows : [];

  let summary: React.ReactNode = null;
  if (res.ok) {
    if (res.duplicate && res.winner === null) {
      summary = "Two nodes have the same ID, so neither backs off. They keep sending until their data differs and corrupt each other. IDs must be unique.";
    } else if (res.duplicate) {
      summary = `${nameOf(res.winner as string)} (${hex3(ids[res.winner as string])}) wins, but two nodes share an ID. On a real bus every ID must be unique.`;
    } else if (res.winner) {
      summary = `${nameOf(res.winner)} (${hex3(ids[res.winner])}) wins: its ID is the lowest, so it keeps the bus.`;
    }
  }

  return (
    <div className="w-full">
      {props.task && <p className="mb-2 text-[0.92rem] leading-snug text-ink">{props.task}</p>}

      <div className="flex flex-col gap-3">
        {startNodes.map((n) => {
          const off = locked || lockSet.has(n.id);
          const v = ids[n.id] ?? n.canId;
          return (
            <div key={n.id} className="flex flex-wrap items-end gap-x-4 gap-y-2 rounded-xl border border-line bg-surface px-3 py-2.5">
              <div className="min-w-[4.5rem]">
                <Caption>Node</Caption>
                <p className="text-[0.95rem] font-semibold text-ink">{n.name}</p>
                {lockSet.has(n.id) && <p className="text-[0.78rem] text-ink-3">ID fixed</p>}
              </div>
              <IdField label={`${n.name} ID (hex)`} value={v} onCommit={(x) => setId(n.id, x)} disabled={off} />
              <Stepper label={`${n.name} ID`} value={v} min={0} max={CAN_MAX_ID} onChange={(x) => setId(n.id, x)} format={hex3} disabled={off} wide />
            </div>
          );
        })}
      </div>

      <div className="mt-4" role="group" aria-label="Arbitration, one column per identifier bit, most significant bit first">
        <Caption className="mb-1">ID bits on the wire, first to last (D = dominant 0, R = recessive 1)</Caption>
        <div className="grid grid-cols-11 gap-0.5 text-center" aria-hidden>
          {BITS.map((b) => (
            <span key={b} className="font-mono text-[0.7rem] text-ink-3">
              {b}
            </span>
          ))}
        </div>
        {startNodes.map((n) => {
          const lostBit = res.ok ? res.lostAt[n.id] : null;
          return (
            <div key={n.id} className="mt-1.5">
              <p className="mb-0.5 text-[0.82rem] font-medium text-ink-2">
                {n.name}{" "}
                <span className="font-mono text-ink-3">{hex3(ids[n.id] ?? n.canId)}</span>
              </p>
              <div className="grid grid-cols-11 gap-0.5">
                {rows.map((r) => (
                  <Cell key={r.bit} bit={r.bit} level={r.sent[n.id] ?? null} lost={lostBit === r.bit} who={n.name} />
                ))}
              </div>
            </div>
          );
        })}
        <div className="mt-2.5">
          <p className="mb-0.5 text-[0.82rem] font-medium text-ink">Bus (wired-AND: any dominant makes it dominant)</p>
          <div className="grid grid-cols-11 gap-0.5">
            {rows.map((r) => (
              <span
                key={r.bit}
                className={`flex h-10 min-w-0 flex-col items-center justify-center rounded-md border-2 border-[var(--line-strong)] font-mono leading-none text-ink ${r.bus === 0 ? "bg-tint" : "bg-surface"}`}
              >
                <span aria-hidden className="text-[0.85rem] font-semibold">
                  {r.bus}
                </span>
                <span aria-hidden className="mt-0.5 text-[0.7rem] text-ink-2">
                  {r.bus === 0 ? "D" : "R"}
                </span>
                <span className="sr-only">{`Bus, bit ${r.bit}: ${r.bus}, ${r.bus === 0 ? "dominant" : "recessive"}`}</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      <ul className="mt-3 flex flex-col gap-1 text-[0.86rem] leading-snug text-ink-2">
        {res.ok &&
          startNodes.map((n) => {
            const b = res.lostAt[n.id];
            return (
              <li key={n.id}>
                <span className="font-semibold text-ink">{n.name}</span>
                {b === null ? " keeps sending to the end of the ID." : ` sends 1 at bit ${b}, reads 0 on the bus, and backs off (✕).`}
              </li>
            );
          })}
      </ul>

      <div className="mt-3">
        {res.ok ? <Note>{summary}</Note> : <Note>{res.error}</Note>}
      </div>
      <ToyNote>Toy model: only the 11-bit identifier is shown. Real frames also have SOF, RTR and IDE bits, data, CRC and ACK, and bit stuffing.</ToyNote>
    </div>
  );
}

/** goal: { winner?: node id, maxId?: the winner's ID must be at most this }. IDs must also be unique. */
export function checkCan(state: unknown, goal: Record<string, unknown>): boolean {
  const s = state as CanState | undefined;
  if (!s || typeof s !== "object" || typeof s.duplicate !== "boolean") return false;
  if (s.duplicate) return false;
  if ("winner" in goal && goal.winner !== undefined && s.winner !== goal.winner) return false;
  if ("maxId" in goal && typeof goal.maxId === "number" && (s.winnerId === null || s.winnerId > goal.maxId)) return false;
  return true;
}
