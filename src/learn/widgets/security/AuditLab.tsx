"use client";

import React, { useState } from "react";
import { Anchor, Eraser, Pencil, SearchCheck } from "lucide-react";
import type { WidgetProps } from "@/learn/widget";
import { Caption, Mono, Note, Tag, Toggle } from "./ui";

/**
 * An audit log whose entries are chained: each one stores a hash of its own content plus the
 * previous entry's hash, so changing one entry breaks every link after it. Tamper with an entry,
 * verify the chain, then give the attacker the skill to recompute the later hashes, and see why
 * the newest hash is also kept somewhere the attacker cannot write.
 * (The hash here is a tiny 32-bit toy so it fits on a phone. Real systems use SHA-256.)
 */

interface Entry {
  seq: number;
  time: string;
  actor: string;
  action: string;
  target: string;
}

const BASE: Entry[] = [
  { seq: 1, time: "09:02", actor: "reza", action: "viewed patient", target: "41" },
  { seq: 2, time: "09:15", actor: "reza", action: "exported list", target: "Elm Street" },
  { seq: 3, time: "10:40", actor: "sam", action: "granted role billing", target: "priya" },
  { seq: 4, time: "11:05", actor: "priya", action: "viewed invoice", target: "5521" },
  { seq: 5, time: "13:30", actor: "sam", action: "disabled MFA for", target: "dana" },
  { seq: 6, time: "14:10", actor: "dana", action: "logged in", target: "web" },
];

/** What the attacker rewrites an entry to. */
const FORGED = (e: Entry): Entry => ({ ...e, actor: "system", action: "ran nightly job", target: "n/a" });

function fnv(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}
const hashOf = (prev: string, e: Entry) => fnv(`${prev}|${e.seq}|${e.time}|${e.actor}|${e.action}|${e.target}`);

interface Stored extends Entry {
  prev: string;
  hash: string;
}

function build(): Stored[] {
  const out: Stored[] = [];
  let prev = "00000000";
  for (const e of BASE) {
    const hash = hashOf(prev, e);
    out.push({ ...e, prev, hash });
    prev = hash;
  }
  return out;
}
const ORIGINAL = build();
const ANCHOR = ORIGINAL[ORIGINAL.length - 1].hash;

export interface AuditLabProps {
  /** Show the "attacker recomputes" and "anchor" switches. */
  advanced?: boolean;
}

export interface AuditLabState {
  tampered: number | null;
  covered: boolean;
  anchored: boolean;
  verified: "ok" | "broken" | "anchor" | null;
  firstBad: number | null;
  /** A change was made and verification caught it. */
  detected: boolean;
}

function apply(tampered: number | null, covered: boolean): Stored[] {
  const rows = ORIGINAL.map((r) => ({ ...r }));
  if (tampered === null) return rows;
  rows[tampered] = { ...rows[tampered], ...FORGED(rows[tampered]) };
  if (covered) {
    let prev = tampered === 0 ? "00000000" : rows[tampered - 1].hash;
    for (let i = tampered; i < rows.length; i++) {
      rows[i].prev = prev;
      rows[i].hash = hashOf(prev, rows[i]);
      prev = rows[i].hash;
    }
  }
  return rows;
}

function verify(rows: Stored[], anchored: boolean): { result: "ok" | "broken" | "anchor"; firstBad: number | null } {
  let prev = "00000000";
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].prev !== prev || hashOf(rows[i].prev, rows[i]) !== rows[i].hash) return { result: "broken", firstBad: rows[i].seq };
    prev = rows[i].hash;
  }
  if (anchored && rows[rows.length - 1].hash !== ANCHOR) return { result: "anchor", firstBad: null };
  return { result: "ok", firstBad: null };
}

export function AuditLab({ props, onChange, revealed }: WidgetProps<AuditLabProps>) {
  const [tampered, setTampered] = useState<number | null>(null);
  const [covered, setCovered] = useState(false);
  const [anchored, setAnchored] = useState(false);
  const [verified, setVerified] = useState<{ result: "ok" | "broken" | "anchor"; firstBad: number | null } | null>(null);

  const rows = apply(tampered, covered);
  const emit = (t: number | null, c: boolean, a: boolean, v: typeof verified) =>
    onChange?.({ tampered: t, covered: c, anchored: a, verified: v ? v.result : null, firstBad: v ? v.firstBad : null, detected: t !== null && v !== null && v.result !== "ok" } satisfies AuditLabState);

  const tamper = (i: number) => {
    if (revealed) return;
    const t = tampered === i ? null : i;
    setTampered(t);
    setVerified(null);
    emit(t, covered, anchored, null);
  };
  const flipCover = () => {
    if (revealed) return;
    setCovered(!covered);
    setVerified(null);
    emit(tampered, !covered, anchored, null);
  };
  const flipAnchor = () => {
    if (revealed) return;
    setAnchored(!anchored);
    setVerified(null);
    emit(tampered, covered, !anchored, null);
  };
  const check = () => {
    if (revealed) return;
    const v = verify(rows, anchored);
    setVerified(v);
    emit(tampered, covered, anchored, v);
  };

  return (
    <div className="w-full max-w-2xl">
      <Caption className="mb-1.5">Audit log, newest hash at the bottom</Caption>
      <ul className="grid gap-1.5">
        {rows.map((r, i) => {
          const isT = tampered === i;
          const bad = verified?.result === "broken" && verified.firstBad !== null && r.seq >= verified.firstBad;
          const first = verified?.firstBad === r.seq;
          return (
            <li key={r.seq} className={`rounded-lg border bg-surface p-2 ${first ? "border-[var(--bad)]" : bad ? "border-[var(--bad)]/40" : isT ? "border-[#d9a21b]/70" : "border-line"}`}>
              <div className="flex items-start gap-2">
                <span className="mt-0.5 w-5 shrink-0 text-right font-mono text-[11px] text-ink-3">#{r.seq}</span>
                <div className="min-w-0 flex-1">
                  <p className="break-words text-[13px] text-ink">
                    <span className="font-mono text-ink-3">{r.time}</span> <span className="font-semibold">{r.actor}</span> {r.action} <span className="font-mono">{r.target}</span>
                  </p>
                  <p className="mt-0.5 font-mono text-[10.5px] leading-snug text-ink-3">
                    prev {r.prev} → hash <span className={bad ? "text-bad" : "text-ink-2"}>{r.hash}</span>
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <button type="button" className={`btn !h-8 !px-2.5 text-[12px] ${isT ? "btn-primary" : ""}`} onClick={() => tamper(i)} disabled={revealed} aria-pressed={isT} aria-label={`Tamper with entry ${r.seq}`}>
                    <Pencil className="h-3.5 w-3.5" /> {isT ? "Undo" : "Tamper"}
                  </button>
                  {first && <Tag tone="bad">first break</Tag>}
                  {isT && !first && <Tag tone="warn">edited</Tag>}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" className="btn btn-primary !h-10" onClick={check} disabled={revealed}>
          <SearchCheck className="h-4 w-4" /> Verify the chain
        </button>
        {props.advanced && (
          <>
            <Toggle on={covered} disabled={revealed} onClick={flipCover}>
              <Eraser className="h-4 w-4" /> Attacker recomputes later hashes
            </Toggle>
            <Toggle on={anchored} disabled={revealed} onClick={flipAnchor}>
              <Anchor className="h-4 w-4" /> Newest hash kept in a separate store
            </Toggle>
          </>
        )}
      </div>
      {anchored && <Mono className="mt-2 text-[11.5px]">anchor (stored elsewhere, append-only): {ANCHOR}</Mono>}

      {verified && (
        <Note tone={verified.result === "ok" ? (tampered === null ? "good" : "bad") : "good"} className="pop-in mt-2" >
          {verified.result === "broken" && `Chain broken at entry #${verified.firstBad}: its stored hash no longer matches its content, so every entry from there on is in doubt.`}
          {verified.result === "anchor" && "Every link is consistent, but the newest hash does not match the copy kept elsewhere. The whole log was rewritten after the anchor was taken."}
          {verified.result === "ok" && (tampered === null ? "Every link checks out." : "Every link checks out, and an entry was changed. A chain alone cannot catch an attacker who recomputes it. Something outside their reach has to remember the real newest hash.")}
        </Note>
      )}
    </div>
  );
}

export function checkAuditLab(state: unknown, goal: Record<string, unknown>) {
  const st = state as AuditLabState | undefined;
  if (!st) return false;
  if (goal.detected === true && !st.detected) return false;
  if (typeof goal.firstBad === "number" && st.firstBad !== goal.firstBad) return false;
  if (typeof goal.covered === "boolean" && st.covered !== goal.covered) return false;
  if (typeof goal.anchored === "boolean" && st.anchored !== goal.anchored) return false;
  if (goal.undetected === true && !(st.tampered !== null && st.verified === "ok")) return false;
  return true;
}
