"use client";

import React, { useState } from "react";
import { Database, RotateCcw, Server } from "lucide-react";
import type { WidgetProps } from "@/learn/widget";
import { Caption, Note, Pill, Readout, Segmented, useInitialReport } from "../reliability/ui";

/**
 * One API behind three servers, with a limit of 6 requests per user per window. Where is the
 * count kept? Each server alone (a user can get 6 from each), a shared counter updated with a
 * read-then-write (simultaneous requests all read the same number), or a shared counter with an
 * atomic increment.
 */

type Mode = "local" | "racy" | "atomic";
type Key = "maya" | "omar";
const SERVERS = ["A", "B", "C"] as const;
const KEYS: { id: Key; label: string }[] = [
  { id: "maya", label: "Maya" },
  { id: "omar", label: "Omar" },
];

interface Model {
  local: Record<string, Record<Key, number>>;
  shared: Record<Key, number>;
  allowed: Record<Key, number>;
  refused: Record<Key, number>;
  log: string[];
}

const fresh = (): Model => ({
  local: { A: { maya: 0, omar: 0 }, B: { maya: 0, omar: 0 }, C: { maya: 0, omar: 0 } },
  shared: { maya: 0, omar: 0 },
  allowed: { maya: 0, omar: 0 },
  refused: { maya: 0, omar: 0 },
  log: [],
});

export interface SharedState {
  mode: Mode;
  limit: number;
  allowed: number;
  over: boolean;
  /** A burst of simultaneous requests has happened in this window. */
  burst: boolean;
}

export function Shared({ props, onChange }: WidgetProps<{ mode?: Mode; limit?: number; lockMode?: boolean }>) {
  const limit = props.limit ?? 6;
  const [mode, setMode] = useState<Mode>(props.mode ?? "local");
  const [key, setKey] = useState<Key>("maya");
  const [m, setM] = useState<Model>(fresh);
  const [burst, setBurst] = useState(false);

  const emit = (md: Mode, mm: Model, b: boolean) => {
    const a = Math.max(mm.allowed.maya, mm.allowed.omar);
    onChange?.({ mode: md, limit, allowed: a, over: a > limit, burst: b } satisfies SharedState);
  };

  useInitialReport(() => emit(mode, m, false));

  // one batch of requests that all reach their servers at the same moment
  const send = (targets: string[]) => {
    const next: Model = { local: structuredClone(m.local), shared: { ...m.shared }, allowed: { ...m.allowed }, refused: { ...m.refused }, log: m.log };
    const lines: string[] = [];
    if (mode === "local") {
      for (const s of targets) {
        const ok = next.local[s][key] < limit;
        if (ok) next.local[s][key] += 1;
        next[ok ? "allowed" : "refused"][key] += 1;
        lines.push(`${s}: ${key} counted ${next.local[s][key]}/${limit} on this server → ${ok ? "allowed" : "refused"}`);
      }
    } else if (mode === "racy") {
      // every request reads the counter first; the writes come after all the reads
      const read = next.shared[key];
      const verdicts = targets.map((s) => {
        const ok = read < limit;
        lines.push(`${s}: read counter = ${read} → ${ok ? "allowed, will write " + (read + 1) : "refused"}`);
        return ok;
      });
      const wrote = verdicts.some(Boolean);
      if (wrote) next.shared[key] = read + 1;
      verdicts.forEach((ok) => (next[ok ? "allowed" : "refused"][key] += 1));
      if (targets.length > 1 && wrote) lines.push(`counter ends at ${next.shared[key]} although ${verdicts.filter(Boolean).length} were allowed`);
    } else {
      for (const s of targets) {
        next.shared[key] += 1;
        const ok = next.shared[key] <= limit;
        next[ok ? "allowed" : "refused"][key] += 1;
        lines.push(`${s}: INCR counter → ${next.shared[key]} ${ok ? "≤" : ">"} ${limit} → ${ok ? "allowed" : "refused"}`);
      }
    }
    next.log = [...lines.reverse(), ...m.log].slice(0, 6);
    const b = burst || targets.length > 1;
    setM(next);
    setBurst(b);
    emit(mode, next, b);
  };

  const reset = (md: Mode = mode) => {
    setM(fresh());
    setBurst(false);
    emit(md, fresh(), false);
  };

  const a = m.allowed[key];
  const over = a > limit;
  return (
    <div className="w-full max-w-2xl">
      {!props.lockMode && (
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Where the count lives">
          {(
            [
              ["local", "Each server alone"],
              ["racy", "Shared: read, then write"],
              ["atomic", "Shared: atomic increment"],
            ] as [Mode, string][]
          ).map(([id, label]) => (
            <Pill
              key={id}
              on={mode === id}
              onClick={() => {
                setMode(id);
                reset(id);
              }}
            >
              {label}
            </Pill>
          ))}
        </div>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-sm text-ink-2">Requests from</span>
        <Segmented label="Which user" value={key} options={KEYS.map((k) => ({ id: k.id, label: k.label }))} onChange={(k) => {
            setKey(k);
            emit(mode, m, burst);
          }}
        />
        <span className="text-sm text-ink-2">(limit {limit} per window)</span>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        {SERVERS.map((s) => (
          <div key={s} className="rounded-xl border border-line bg-surface p-2.5">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-ink">
              <Server className="h-4 w-4 text-ink-2" /> {s}
            </p>
            <p className="mt-1 min-h-[2.4rem] font-mono text-[12px] leading-snug text-ink-2">
              {mode === "local" ? (
                <>
                  Maya {m.local[s].maya}
                  <br />
                  Omar {m.local[s].omar}
                </>
              ) : (
                <span className="text-ink-3">no count of its own</span>
              )}
            </p>
            <button
              type="button"
              onClick={() => send([s])}
              className="mt-1 min-h-10 w-full rounded-full border border-line bg-surface-2 px-2 text-[13px] font-medium text-ink hover:border-[var(--line-strong)]"
            >
              Send to {s}
            </button>
          </div>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Pill on onClick={() => send([...SERVERS])}>
          3 at once (A, B, C)
        </Pill>
        <Pill onClick={() => reset()} label="Start a new window">
          <RotateCcw className="h-4 w-4" /> New window
        </Pill>
      </div>

      {mode !== "local" && (
        <div className="mt-3 flex items-center gap-3 rounded-xl border border-line bg-surface p-2.5">
          <Database className="h-5 w-5 shrink-0 text-ink-2" />
          <div className="min-w-0 text-sm text-ink">
            <p className="font-semibold">Shared counter</p>
            <p className="font-mono text-[12px] text-ink-2">
              Maya {m.shared.maya} · Omar {m.shared.omar}
            </p>
          </div>
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <Readout label={`${key === "maya" ? "Maya" : "Omar"} allowed`} value={`${a}/${limit}`} accent={!over} />
        <Readout label="Refused" value={m.refused[key]} />
      </div>
      <div className="mt-3 rounded-xl border border-line bg-surface-2 p-2.5">
        <Caption>Log</Caption>
        <ol className="mt-1 min-h-[4.5rem] space-y-0.5 font-mono text-[11.5px] leading-snug text-ink-2">
          {m.log.length === 0 && <li className="text-ink-3">Send some requests.</li>}
          {m.log.map((l, i) => (
            <li key={i} className={i < 3 ? "text-ink" : ""}>
              {l}
            </li>
          ))}
        </ol>
      </div>
      <div className="mt-3" aria-live="polite">
        {over ? (
          <Note tone="bad">
            {key === "maya" ? "Maya" : "Omar"} has had {a} requests through in one window, over the limit of {limit}. The limiter let them past.
          </Note>
        ) : a >= limit ? (
          <Note tone="good">Exactly {limit} allowed, and the rest are refused. The limiter held.</Note>
        ) : null}
      </div>
    </div>
  );
}

export function checkShared(state: unknown, goal: Record<string, unknown>) {
  const st = state as SharedState | undefined;
  if (!st) return false;
  if (goal.mode !== undefined && st.mode !== goal.mode) return false;
  if (typeof goal.over === "boolean" && st.over !== goal.over) return false;
  if (typeof goal.burst === "boolean" && st.burst !== goal.burst) return false;
  if (typeof goal.minAllowed === "number" && st.allowed < goal.minAllowed) return false;
  return true;
}
