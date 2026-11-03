"use client";

import React from "react";
import { Tile } from "../cpp-basics/ui";
import { COL } from "../cpp-memory/ui";
import { boolOf, clamp, list, nums, numOf, rec, strOf, strs } from "./data";

/**
 * The sixteen panel bodies of the Lantern Bay board. Each one only draws values the learner's own program sent with
 * scene(...), reads them defensively (a missing or odd value shows a hint, never throws) and is a pure function of
 * `s` (the scene values), so the same program always draws the same picture. The two panels that step through a
 * sequence (event bus, owners) run a small timer that is cleaned up on unmount and follows `autoplay`.
 */

export type Scene = Record<string, unknown>;

const dash = "—";

// ───────────────────────── small parts ─────────────────────────

function Hint({ children }: { children: React.ReactNode }) {
  return <p className="hud-log hud-muted py-1 text-[11px]">{children}</p>;
}

function Mono({ children, className = "", title }: { children: React.ReactNode; className?: string; title?: string }) {
  return (
    <span className={`font-mono text-[10.5px] ${className}`} title={title}>
      {children}
    </span>
  );
}

function Tag({ children, tone = "plain" }: { children: React.ReactNode; tone?: "plain" | "accent" | "bad" | "warn" | "cool" }) {
  const color = tone === "accent" ? COL.owner : tone === "bad" ? COL.bad : tone === "warn" ? COL.raw : tone === "cool" ? COL.borrowed : "rgba(255,255,255,0.78)";
  const bg = tone === "accent" ? COL.ownerSoft : tone === "bad" ? COL.badSoft : tone === "warn" ? COL.rawSoft : tone === "cool" ? COL.borrowedSoft : "rgba(255,255,255,0.07)";
  return (
    <span className="inline-flex max-w-full items-center rounded-full px-2 py-[3px] font-mono text-[10px] leading-none" style={{ color, background: bg, boxShadow: `inset 0 0 0 1px ${color}33` }}>
      <span className="truncate">{children}</span>
    </span>
  );
}

function SubLabel({ children }: { children: React.ReactNode }) {
  return <p className="hud-label mb-1 mt-2 first:mt-0">{children}</p>;
}

/** A pattern like "#.#.#..." drawn as on / off cells. */
function Cells({ pattern, size = 12 }: { pattern: string; size?: number }) {
  return (
    <span className="inline-flex flex-wrap gap-[3px]" role="img" aria-label={`pattern ${pattern}`}>
      {[...pattern].map((c, i) => (
        <span key={i} className="inline-block rounded-[3px]" style={{ width: size, height: size, background: c === "#" ? COL.owner : "rgba(255,255,255,0.1)", boxShadow: c === "#" ? `0 0 6px ${COL.owner}55` : undefined }} />
      ))}
    </span>
  );
}

const CSS_FLASH = `
@keyframes en-pop { 0% { transform: scale(0.94); opacity: 0.4; } 100% { transform: scale(1); opacity: 1; } }
.en-pop { animation: en-pop 0.35s ease-out both; }
@keyframes en-fire { 0% { box-shadow: 0 0 0 0 rgba(197,238,138,0.0); } 40% { box-shadow: 0 0 0 3px rgba(197,238,138,0.35); } 100% { box-shadow: 0 0 0 0 rgba(197,238,138,0.0); } }
.en-fire { animation: en-fire 0.9s ease-out both; }
@media (prefers-reduced-motion: reduce) { .en-pop, .en-fire { animation: none !important; } }
`;
export const ENGINE_CSS = CSS_FLASH;

/** Steps 0..count-1 on a timer when `run` is true; the learner can also pick a step. Cleans its timer up on unmount. */
function useSteps(count: number, run: boolean, ms = 1400) {
  const [pick, setPick] = React.useState<number | null>(null);
  const [auto, setAuto] = React.useState(0);
  React.useEffect(() => {
    if (!run || count < 2) return;
    const id = window.setInterval(() => setAuto((a) => (a + 1) % count), ms);
    return () => window.clearInterval(id);
  }, [run, count, ms]);
  const idx = count === 0 ? 0 : clamp(pick ?? (run ? auto : count - 1), 0, count - 1);
  return { idx, pick: (i: number) => setPick(i), clear: () => setPick(null) };
}

function StepDots({ count, idx, onPick, label }: { count: number; idx: number; onPick: (i: number) => void; label: string }) {
  if (count < 2) return null;
  return (
    <div className="mt-2 flex items-center gap-1" role="group" aria-label={label}>
      {Array.from({ length: count }, (_, i) => (
        <button
          key={i}
          type="button"
          aria-label={`${label} ${i + 1}`}
          aria-pressed={i === idx}
          onClick={() => onPick(i)}
          className={`h-5 min-w-5 rounded-full border px-1.5 font-mono text-[10px] leading-none transition-colors ${i === idx ? "border-transparent bg-[#c5ee8a] text-[#0a0a0a]" : "border-white/12 bg-white/[0.04] text-white/65 hover:bg-white/10"}`}
        >
          {i + 1}
        </button>
      ))}
    </div>
  );
}

// ───────────────────────── 1: cookie cutters ─────────────────────────

export function Cutters({ s }: { s: Scene }) {
  const stamps = strs(s.stamps);
  if (stamps.length === 0) return <Hint>Send the stamped types: scene(&quot;stamps&quot;, ...)</Hint>;
  const results = [s.brightInt, s.brightDouble];
  return (
    <div>
      <p className="hud-muted mb-2 text-[11px] leading-snug">One recipe, one real function per type it was used with.</p>
      <ul className="grid grid-cols-2 gap-2 @md:grid-cols-3">
        {stamps.map((t, i) => (
          <li key={`${t}-${i}`} className="en-pop min-w-0 rounded-lg border border-white/12 bg-white/[0.04] p-2" style={{ animationDelay: `${i * 90}ms` }}>
            <svg viewBox="0 0 80 44" className="mx-auto mb-1 block h-10 w-full" aria-hidden>
              <path d="M8 8 h64 a4 4 0 0 1 4 4 v20 a4 4 0 0 1 -4 4 h-64 a4 4 0 0 1 -4 -4 v-20 a4 4 0 0 1 4 -4 z" fill="none" stroke={COL.owner} strokeWidth="1.6" strokeDasharray="4 3" />
              <circle cx="22" cy="22" r="7" fill={COL.owner} opacity=".85" />
              <path d="M36 22 h28" stroke="rgba(255,255,255,0.35)" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <p className="truncate text-center font-mono text-[11px] text-white/85" title={`brighter<${t}>`}>
              brighter&lt;{t}&gt;
            </p>
            <p className="hud-value mt-0.5 truncate text-center text-[13px]" style={{ color: COL.owner }}>
              {numOf(results[i]) !== undefined ? String(results[i]) : dash}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ───────────────────────── 2: logbooks ─────────────────────────

export function Logbooks({ s }: { s: Scene }) {
  const types = strs(s.bookTypes);
  const books: { type: string; entries: string[] }[] = [
    { type: types[0] ?? "Logbook<int>", entries: list(s.lampEntries).map(String) },
    { type: types[1] ?? "Logbook<std::string>", entries: list(s.hornEntries).map(String) },
  ];
  if (!s.lampEntries && !s.hornEntries) return <Hint>Send lampEntries and hornEntries from your two logbooks.</Hint>;
  return (
    <div className="grid grid-cols-1 gap-2 @md:grid-cols-2">
      {books.map((b) => (
        <div key={b.type} className="min-w-0 rounded-lg border border-white/12 bg-white/[0.03] p-2">
          <p className="mb-1.5 truncate font-mono text-[11px]" style={{ color: COL.owner }} title={b.type}>
            {b.type}
          </p>
          <ol className="space-y-1">
            {b.entries.map((e, i) => (
              <li key={i} className="flex min-w-0 gap-2 border-b border-white/[0.06] pb-1 text-[11px] last:border-0">
                <span className="hud-muted w-4 shrink-0 text-right font-mono">{i + 1}</span>
                <span className="min-w-0 truncate text-white/85" title={e}>
                  {e}
                </span>
              </li>
            ))}
            {b.entries.length === 0 && <li className="hud-muted text-[11px]">empty</li>}
          </ol>
        </div>
      ))}
    </div>
  );
}

// ───────────────────────── 3: deduction desk ─────────────────────────

function describeStamp(note: string, i: number): { call: string; deduced: string } {
  const xN = /^(.+) x (\d+)$/.exec(note);
  if (xN) return { call: `call ${i + 1}`, deduced: `T = ${xN[1]}, N = ${xN[2]}` };
  const two = /^([^,]+),(.+)$/.exec(note);
  if (two) return { call: `call ${i + 1}`, deduced: `A = ${two[1]}, B = ${two[2]}` };
  return { call: `call ${i + 1}`, deduced: `T = ${note}` };
}

export function Deduction({ s }: { s: Scene }) {
  const notes = strs(s.deducedTypes);
  if (notes.length === 0) return <Hint>Have each template push typeName&lt;T&gt;() onto deduceLog, then send it.</Hint>;
  return (
    <div>
      <ol className="space-y-1">
        {notes.map((n, i) => {
          const d = describeStamp(n, i);
          return (
            <li key={i} className="en-pop flex min-w-0 items-center gap-2 rounded-md bg-white/[0.04] px-2 py-1.5" style={{ animationDelay: `${i * 70}ms` }}>
              <span className="hud-muted w-12 shrink-0 font-mono text-[10px]">{d.call}</span>
              <span className="hud-accent min-w-0 flex-1 truncate font-mono text-[11px]" title={d.deduced}>
                {d.deduced}
              </span>
            </li>
          );
        })}
      </ol>
      <dl className="mt-2 grid grid-cols-3 gap-2">
        <Tile label="dimmer<double>(3, 4.5)" value={numOf(s.mixedDim) ?? dash} />
        <Tile label="lumenGap(3, 4.5)" value={numOf(s.gapSize) ?? dash} />
        <Tile label="rackTotal" value={numOf(s.rackSum) ?? dash} />
      </dl>
    </div>
  );
}

// ───────────────────────── 4: gatehouse ─────────────────────────

export function Gatehouse({ s }: { s: Scene }) {
  const gate = rec(s.gateChecks);
  const names = Object.keys(gate);
  if (names.length === 0) return <Hint>Send gateChecks: a map of type name to Glowing&lt;Type&gt;.</Hint>;
  return (
    <div>
      <ul className="grid grid-cols-3 gap-2">
        {names.map((n) => {
          const ok = boolOf(gate[n]) === true;
          return (
            <li key={n} className="en-pop min-w-0 rounded-lg border p-2 text-center" style={{ borderColor: ok ? `${COL.owner}66` : `${COL.bad}66`, background: ok ? COL.ownerSoft : COL.badSoft }}>
              <p className="truncate font-mono text-[11px] text-white/90" title={n}>
                {n}
              </p>
              <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide" style={{ color: ok ? COL.owner : COL.bad }}>
                {ok ? "passes" : "stopped"}
              </p>
            </li>
          );
        })}
      </ul>
      <dl className="mt-2 grid grid-cols-2 gap-2">
        <Tile label="Glowing<T>" value="needs lumens() -> int" />
        <Tile label="total glow" value={numOf(s.totalGlow) ?? dash} unit="lm" tone="accent" />
      </dl>
    </div>
  );
}

// ───────────────────────── 5: berth queue ─────────────────────────

export function Queue({ s }: { s: Scene }) {
  const now = strs(s.queueNow);
  const left = strs(s.queueLeft);
  const served = strOf(s.served);
  const count = numOf(s.tideCount);
  const peakIndex = numOf(s.peakIndex);
  if (now.length === 0 && count === undefined) return <Hint>Send queueNow and the tide results.</Hint>;
  return (
    <div>
      <SubLabel>berth queue (front on the left)</SubLabel>
      <ul className="flex flex-wrap items-center gap-1.5">
        {now.map((n, i) => {
          const gone = served !== undefined && i === 0 && left[0] !== n;
          return (
            <li key={`${n}-${i}`}>
              <Tag tone={gone ? "warn" : "plain"}>
                {gone ? `${n} (berthed)` : n}
              </Tag>
            </li>
          );
        })}
      </ul>
      {count !== undefined && count > 0 && (
        <>
          <SubLabel>tide row ({count} readings, peak marked)</SubLabel>
          <div className="flex items-end gap-1.5" aria-label="tide readings">
            {Array.from({ length: Math.min(count, 16) }, (_, i) => (
              <span key={i} className="grid h-7 flex-1 place-items-center rounded-md font-mono text-[10px]" style={{ background: i === peakIndex ? COL.ownerSoft : "rgba(255,255,255,0.06)", color: i === peakIndex ? COL.owner : "rgba(255,255,255,0.5)", boxShadow: i === peakIndex ? `inset 0 0 0 1px ${COL.owner}88` : undefined }}>
                {i}
              </span>
            ))}
          </div>
          <dl className="mt-2 grid grid-cols-3 gap-2">
            <Tile label="peak" value={numOf(s.peakValue) ?? dash} tone="accent" />
            <Tile label="at distance" value={peakIndex ?? dash} />
            <Tile label="begin() + 3" value={numOf(s.jumped) ?? dash} />
          </dl>
        </>
      )}
    </div>
  );
}

// ───────────────────────── 6: ledger ─────────────────────────

export function Ledger({ s }: { s: Scene }) {
  const tons = rec(s.tonsByPort);
  const order = strs(s.portOrder).length > 0 ? strs(s.portOrder) : Object.keys(tons);
  const max = Math.max(1, ...order.map((k) => numOf(tons[k]) ?? 0));
  const before = numOf(s.sizeBefore);
  const after = numOf(s.sizeAfter);
  const grew = before !== undefined && after !== undefined && after > before;
  const hours = rec(s.lampHours);
  const visitors = strs(s.uniqueVisitors);
  if (order.length === 0 && Object.keys(hours).length === 0 && visitors.length === 0) return <Hint>Send tonsByPort, lampHours and uniqueVisitors.</Hint>;
  return (
    <div>
      {order.length > 0 && (
        <>
          <SubLabel>std::map: tons per port (keys in sorted order)</SubLabel>
          <ul className="space-y-1">
            {order.map((k) => (
              <li key={k} className="flex min-w-0 items-center gap-2">
                <span className="w-14 shrink-0 truncate font-mono text-[10.5px] text-white/75" title={k}>
                  {k}
                </span>
                <span className="h-3 min-w-0 flex-1 overflow-hidden rounded-sm bg-white/[0.06]">
                  <span className="block h-full rounded-sm" style={{ width: `${((numOf(tons[k]) ?? 0) / max) * 100}%`, background: COL.owner }} />
                </span>
                <span className="hud-value w-8 shrink-0 text-right text-[11px]">{numOf(tons[k]) ?? dash}</span>
              </li>
            ))}
          </ul>
        </>
      )}
      {before !== undefined && after !== undefined && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Tag tone={grew ? "bad" : "plain"}>
            size {before} to {after}
          </Tag>
          {grew && <span className="text-[11px]" style={{ color: COL.bad }}>a plain [] read added a key</span>}
          {boolOf(s.hasFerry) !== undefined && <Tag tone="cool">contains(&quot;Ferry&quot;) = {String(s.hasFerry)}</Tag>}
        </div>
      )}
      {Object.keys(hours).length > 0 && (
        <>
          <SubLabel>std::unordered_map: lamp hours (no order promised)</SubLabel>
          <div className="flex flex-wrap gap-1.5">
            {Object.keys(hours).map((k) => (
              <Tag key={k}>
                {k}: {String(hours[k])}
              </Tag>
            ))}
            {numOf(s.lampTotal) !== undefined && <Tag tone="accent">total {numOf(s.lampTotal)}</Tag>}
          </div>
        </>
      )}
      {visitors.length > 0 && (
        <>
          <SubLabel>std::set: visitors, each once ({numOf(s.visitorCount) ?? visitors.length})</SubLabel>
          <div className="flex flex-wrap gap-1.5">
            {visitors.map((v) => (
              <Tag key={v} tone="cool">
                {v}
              </Tag>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ───────────────────────── 7: algorithm bench ─────────────────────────

export function Algorithms({ s }: { s: Scene }) {
  const sorted = nums(s.sortedLumens);
  if (sorted.length === 0) return <Hint>Send sortedLumens after std::sort.</Hint>;
  const max = Math.max(...sorted, 1);
  const first = numOf(s.firstStrongIndex);
  return (
    <div>
      <SubLabel>sorted rack (lime = isStrong, 500 lumens or more)</SubLabel>
      <div className="flex h-24 items-end gap-1.5" role="img" aria-label={`sorted lumens ${sorted.join(", ")}`}>
        {sorted.map((v, i) => {
          const strong = v >= 500;
          return (
            <div key={i} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-0.5">
              <span className="font-mono text-[9.5px] text-white/60">{v}</span>
              <span className="w-full rounded-t-sm" style={{ height: `${Math.max(6, (v / max) * 72)}px`, background: strong ? COL.owner : "rgba(255,255,255,0.18)", outline: i === first ? "2px solid #fff" : undefined, outlineOffset: 1 }} />
            </div>
          );
        })}
      </div>
      <dl className="mt-2 grid grid-cols-2 gap-2 @md:grid-cols-4">
        <Tile label="count_if" value={numOf(s.strongCount) ?? dash} tone="accent" />
        <Tile label="find_if" value={first !== undefined ? `${numOf(s.firstStrongValue) ?? "?"} @ ${first}` : dash} />
        <Tile label="accumulate" value={numOf(s.lumenSum) ?? dash} />
        <Tile label="middle four" value={numOf(s.middleSum) ?? dash} />
      </dl>
    </div>
  );
}

// ───────────────────────── 8: lambda bench ─────────────────────────

export function Lambdas({ s }: { s: Scene }) {
  const now = numOf(s.dimByValueNow);
  const byValue = numOf(s.dimByValue);
  const byRef = numOf(s.dimByReference);
  const fleet = strs(s.fleetByLength);
  if (byValue === undefined && byRef === undefined && fleet.length === 0) return <Hint>Send dimByValue, dimByReference and fleetByLength.</Hint>;
  return (
    <div>
      <div className="grid grid-cols-2 gap-2">
        <div className="min-w-0 rounded-lg border border-white/12 bg-white/[0.03] p-2">
          <p className="truncate font-mono text-[11px] text-white/80">[dimLine]</p>
          <p className="hud-muted text-[10px]">copy made when created</p>
          <p className="hud-value mt-1 text-[15px]" style={{ color: COL.borrowed }}>
            {now ?? dash} <span className="hud-muted">then</span> {byValue ?? dash}
          </p>
          <p className="hud-muted text-[10px]">unchanged after the line moved</p>
        </div>
        <div className="min-w-0 rounded-lg border border-white/12 bg-white/[0.03] p-2">
          <p className="truncate font-mono text-[11px] text-white/80">[&amp;dimLine]</p>
          <p className="hud-muted text-[10px]">the live variable</p>
          <p className="hud-value mt-1 text-[15px]" style={{ color: COL.owner }}>
            {byRef ?? dash}
          </p>
          <p className="hud-muted text-[10px]">sees the new line</p>
        </div>
      </div>
      {fleet.length > 0 && (
        <>
          <SubLabel>fleet sorted by a comparator lambda (shorter name first)</SubLabel>
          <div className="flex flex-wrap gap-1.5">
            {fleet.map((f) => (
              <Tag key={f}>
                {f} · {f.length}
              </Tag>
            ))}
          </div>
        </>
      )}
      {numOf(s.brightTotal) !== undefined && (
        <p className="mt-2 text-[11px] text-white/70">
          for_each with <Mono>[&amp;brightTotal]</Mono> added up <span className="hud-value" style={{ color: COL.owner }}>{numOf(s.brightTotal)}</span> lumens
        </p>
      )}
    </div>
  );
}

// ───────────────────────── 9: flash plans ─────────────────────────

export function Strategy({ s }: { s: Scene }) {
  const shapes = rec(s.planShapes);
  const names = Object.keys(shapes);
  if (names.length === 0) return <Hint>Run each plan for 8 ticks and send planShapes.</Hint>;
  const first = strOf(s.firstFlash);
  const second = strOf(s.secondFlash);
  return (
    <div>
      <ul className="space-y-1.5">
        {names.map((n) => (
          <li key={n} className="flex min-w-0 items-center gap-2">
            <span className="w-14 shrink-0 truncate font-mono text-[11px] text-white/75">{n}</span>
            <Cells pattern={String(shapes[n])} />
          </li>
        ))}
      </ul>
      {first !== undefined && second !== undefined && (
        <>
          <SubLabel>one lamp, plan swapped with setPlan</SubLabel>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="hud-muted w-14 shrink-0 text-[10px]">before</span>
              <Cells pattern={first} />
            </div>
            <div className="flex items-center gap-2">
              <span className="hud-muted w-14 shrink-0 text-[10px]">after</span>
              <Cells pattern={second} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ───────────────────────── 10: event bus ─────────────────────────

interface BusEvent {
  name: string;
  fired: string[];
}

/** Turn the subscribers' own log lines ("horn: gale level 4", "lamp: dims for gale", "radio: relays gale") into one row per event. */
export function parseBus(lines: string[]): { who: string[]; events: BusEvent[] } {
  const who: string[] = [];
  const byName = new Map<string, BusEvent>();
  for (const line of lines) {
    const m = /^([^:]+):\s*(.*)$/.exec(line);
    if (!m) continue;
    const sub = m[1].trim();
    const rest = m[2];
    const name = (/^(.*?) level \d+$/.exec(rest)?.[1] ?? rest.replace(/^(dims for|relays)\s+/, "")).trim();
    if (!who.includes(sub)) who.push(sub);
    const event = byName.get(name) ?? { name, fired: [] };
    if (!event.fired.includes(sub)) event.fired.push(sub);
    byName.set(name, event);
  }
  const events = [...byName.values()];
  return { who, events };
}

export function Bus({ s, autoplay }: { s: Scene; autoplay: boolean }) {
  const log = strs(s.busLog);
  const { who, events } = parseBus(log);
  const steps = useSteps(events.length, autoplay);
  if (events.length === 0) return <Hint>Subscribe your listeners, publish some storms and send busLog.</Hint>;
  const current = events[steps.idx];
  const before = numOf(s.subscribersBefore);
  const after = numOf(s.subscribersAfter);
  return (
    <div>
      <div className="flex items-center gap-3">
        <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full border text-center" style={{ borderColor: `${COL.owner}88`, background: COL.ownerSoft }}>
          <span className="px-1 font-mono text-[10px] leading-tight" style={{ color: COL.owner }}>
            {current.name}
          </span>
        </div>
        <span aria-hidden className="hud-muted text-lg">
          →
        </span>
        <ul className="grid min-w-0 flex-1 grid-cols-1 gap-1.5">
          {who.map((w) => {
            const hit = current.fired.includes(w);
            return (
              <li key={`${w}-${steps.idx}`} className={`flex min-w-0 items-center gap-2 rounded-md border px-2 py-1 ${hit ? "en-fire" : ""}`} style={{ borderColor: hit ? `${COL.owner}88` : "rgba(255,255,255,0.1)", background: hit ? COL.ownerSoft : "rgba(255,255,255,0.03)" }}>
                <span className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ background: hit ? COL.owner : "rgba(255,255,255,0.2)" }} />
                <span className="min-w-0 flex-1 truncate font-mono text-[11px]" style={{ color: hit ? COL.owner : "rgba(255,255,255,0.45)" }}>
                  {w}
                </span>
                <span className="shrink-0 text-[10px]" style={{ color: hit ? COL.owner : "rgba(255,255,255,0.35)" }}>
                  {hit ? "fired" : "skipped"}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
      <StepDots count={events.length} idx={steps.idx} onPick={steps.pick} label="event" />
      <p className="hud-muted mt-1.5 text-[10.5px]">
        {before !== undefined && after !== undefined ? `${before} subscribers, then ${after} after one unsubscribed. ` : ""}
        {log.length} handler calls in all.
      </p>
    </div>
  );
}

// ───────────────────────── 11: vtable ─────────────────────────

const classOf = (n: string) => (n ? n.charAt(0).toUpperCase() + n.slice(1) : "?");

export function Vtable({ s }: { s: Scene }) {
  const direct = strs(s.directNames);
  const viaNames = strs(s.viaBaseNames);
  const signals = strs(s.viaBaseSignals);
  const plain = strOf(s.plainSignal);
  if (direct.length === 0 && signals.length === 0) return <Hint>Send directNames, viaBaseNames and viaBaseSignals.</Hint>;
  const tables = [{ cls: "Beacon", sig: plain ?? "steady glow" }, ...direct.map((d, i) => ({ cls: classOf(d), sig: signals[i] ?? "?" }))];
  return (
    <div>
      <SubLabel>vtables: one per class</SubLabel>
      <div className="grid grid-cols-2 gap-2 @md:grid-cols-4">
        {tables.map((t) => (
          <div key={t.cls} className="min-w-0 rounded-md border border-white/12 bg-white/[0.03] p-1.5">
            <p className="truncate font-mono text-[10.5px] text-white/85">{t.cls}</p>
            <p className="mt-1 break-words rounded bg-black/30 px-1 py-0.5 font-mono text-[10px] leading-snug" style={{ color: COL.owner }} title={t.sig}>
              signal → {t.sig}
            </p>
          </div>
        ))}
      </div>
      <SubLabel>row of const Beacon* (each really points at…)</SubLabel>
      <table className="w-full table-fixed border-collapse text-left text-[10.5px]">
        <thead>
          <tr className="hud-label">
            <th className="w-[22%] pb-1 font-medium">really a</th>
            <th className="w-[26%] pb-1 font-medium">b-&gt;name()</th>
            <th className="pb-1 font-medium">b-&gt;signal()</th>
          </tr>
        </thead>
        <tbody>
          {signals.map((sig, i) => (
            <tr key={i} className="border-t border-white/[0.07]">
              <td className="truncate py-1 font-mono text-white/80">{classOf(direct[i] ?? "")}</td>
              <td className="truncate py-1 font-mono" style={{ color: COL.raw }} title="not virtual: decided by the pointer's declared type">
                {viaNames[i] ?? dash}
              </td>
              <td className="truncate py-1 font-mono" style={{ color: COL.owner }} title="virtual: the hidden pointer leads to the object's own class table">
                {sig}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="hud-muted mt-1.5 text-[10.5px]">Amber: fixed while compiling. Lime: looked up in the object&apos;s own table at run time.</p>
    </div>
  );
}

// ───────────────────────── 12: hierarchy ─────────────────────────

function Dot({ colour }: { colour: string }) {
  const fill = colour === "red" ? "#f87171" : colour === "white" ? "#f4f4f4" : "#8fb3c9";
  return <span className="inline-block h-3 w-3 rounded-full" style={{ background: fill, boxShadow: `inset 0 0 0 1px rgba(255,255,255,0.3)` }} title={colour} />;
}

export function Hierarchy({ s }: { s: Scene }) {
  const abs = rec(s.abstractness);
  const classes = Object.keys(abs);
  const closing = strs(s.closingOrder);
  const sliced = strs(s.slicedColours);
  const kept = strs(s.keptColours);
  if (classes.length === 0 && sliced.length === 0 && closing.length === 0) return <Hint>Send abstractness, closingOrder and the lamp colours.</Hint>;
  return (
    <div>
      {classes.length > 0 && (
        <div className="flex flex-wrap items-start justify-center gap-2">
          {classes.map((c) => {
            const isAbs = boolOf(abs[c]) === true;
            const base = c === "Station";
            return (
              <div key={c} className="min-w-0 rounded-lg border px-2.5 py-1.5 text-center" style={{ borderColor: isAbs ? `${COL.raw}88` : "rgba(255,255,255,0.14)", background: isAbs ? COL.rawSoft : "rgba(255,255,255,0.04)", marginTop: base ? 0 : 10 }}>
                <p className={`font-mono text-[11px] text-white/90 ${isAbs ? "italic" : ""}`}>{c}</p>
                <p className="mt-0.5 flex flex-wrap justify-center gap-1">
                  {isAbs && <Tag tone="warn">abstract</Tag>}
                  {c === "Pier" && boolOf(s.pierIsFinal) && <Tag tone="bad">final</Tag>}
                  {!base && <Tag tone="cool">: Station</Tag>}
                </p>
              </div>
            );
          })}
        </div>
      )}
      {strs(s.roles).length > 0 && <p className="hud-muted mt-1.5 text-center text-[10.5px]">answers through Station pointers: {strs(s.roles).join(", ")}</p>}
      {closing.length > 0 && (
        <>
          <SubLabel>closing order (virtual destructor: derived, then base)</SubLabel>
          <ol className="flex flex-wrap gap-1.5">
            {closing.map((c, i) => (
              <li key={i}>
                <Tag tone={c.startsWith("Station") ? "plain" : "accent"}>
                  {i + 1}. {c}
                </Tag>
              </li>
            ))}
          </ol>
        </>
      )}
      {sliced.length > 0 && (
        <>
          <SubLabel>the slicing trap</SubLabel>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-md border border-white/12 p-1.5">
              <p className="truncate font-mono text-[10px] text-white/70">vector&lt;Lamp&gt;</p>
              <p className="mt-1 flex gap-1.5">
                {sliced.map((c, i) => (
                  <Dot key={i} colour={c} />
                ))}
              </p>
              <p className="hud-muted mt-1 text-[10px]" style={{ color: COL.bad }}>
                red part cut off
              </p>
            </div>
            <div className="rounded-md border border-white/12 p-1.5">
              <p className="truncate font-mono text-[10px] text-white/70">vector&lt;unique_ptr&lt;Lamp&gt;&gt;</p>
              <p className="mt-1 flex gap-1.5">
                {kept.map((c, i) => (
                  <Dot key={i} colour={c} />
                ))}
              </p>
              <p className="mt-1 text-[10px]" style={{ color: COL.owner }}>
                whole objects kept
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ───────────────────────── 13: owners ─────────────────────────

export function Owners({ s, autoplay }: { s: Scene; autoplay: boolean }) {
  const counts = nums(s.useCounts);
  const steps = useSteps(counts.length, autoplay, 1300);
  const stale = numOf(s.staleSoundings);
  const shared = numOf(s.sharedSoundings);
  if (counts.length === 0) return <Hint>Push chart.use_count() after each change and send useCounts.</Hint>;
  const n = counts[steps.idx] ?? 0;
  const maxOwners = Math.max(3, ...counts);
  const H = 24 + maxOwners * 26;
  const chartGone = n === 0;
  return (
    <div>
      <svg viewBox={`0 0 300 ${H}`} className="block w-full" role="img" aria-label={`${n} owners share one chart`}>
        {Array.from({ length: n }, (_, i) => {
          const y = 22 + i * 26;
          return (
            <g key={i}>
              <circle cx="46" cy={y} r="9" fill={COL.ownerSoft} stroke={COL.owner} strokeWidth="1.5" />
              <text x="46" y={y + 3} textAnchor="middle" fontSize="9" fill={COL.owner} fontFamily="monospace">
                {i + 1}
              </text>
              <path d={`M56 ${y} C 120 ${y}, 150 ${H / 2}, 196 ${H / 2}`} fill="none" stroke={COL.owner} strokeWidth="1.6" strokeOpacity=".75" />
            </g>
          );
        })}
        <rect x="196" y={H / 2 - 28} width="92" height="56" rx="10" fill={chartGone ? COL.badSoft : "rgba(255,255,255,0.05)"} stroke={chartGone ? COL.bad : "rgba(255,255,255,0.3)"} />
        <text x="242" y={H / 2 - 8} textAnchor="middle" fontSize="11" fill="#f4f4f4" fontFamily="monospace">
          Chart
        </text>
        <text x="242" y={H / 2 + 14} textAnchor="middle" fontSize="15" fill={COL.owner} fontFamily="monospace">
          count {n}
        </text>
      </svg>
      <StepDots count={counts.length} idx={steps.idx} onPick={steps.pick} label="step" />
      <dl className="mt-2 grid grid-cols-3 gap-2">
        <Tile label="plain copy" value={stale ?? dash} />
        <Tile label="shared" value={shared ?? dash} tone="accent" />
        <Tile label="destroyed" value={strs(s.chartLog).length} />
      </dl>
    </div>
  );
}

// ───────────────────────── 14: cycles ─────────────────────────

export function Cycles({ s }: { s: Scene }) {
  const cycle = nums(s.cycleCounts);
  const fixed = nums(s.fixedCounts);
  const gone = strs(s.goneLog);
  if (cycle.length === 0 && fixed.length === 0) return <Hint>Send cycleCounts and fixedCounts from your two blocks.</Hint>;
  const stuck = numOf(s.goneAfterCycle);
  return (
    <div className="grid grid-cols-1 gap-2 @md:grid-cols-2">
      <div className="min-w-0 rounded-lg border p-2" style={{ borderColor: `${COL.bad}55` }}>
        <p className="truncate font-mono text-[11px]" style={{ color: COL.bad }}>
          shared ⇄ shared: a cycle
        </p>
        <svg viewBox="0 0 220 84" className="mt-1 block w-full" role="img" aria-label="two objects each owning the other">
          <rect x="14" y="26" width="70" height="32" rx="8" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.3)" />
          <rect x="136" y="26" width="70" height="32" rx="8" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.3)" />
          <text x="49" y="40" textAnchor="middle" fontSize="10" fill="#f4f4f4" fontFamily="monospace">Berth</text>
          <text x="49" y="52" textAnchor="middle" fontSize="10" fill={COL.bad} fontFamily="monospace">count {cycle[0] ?? "?"}</text>
          <text x="171" y="40" textAnchor="middle" fontSize="10" fill="#f4f4f4" fontFamily="monospace">Mooring</text>
          <text x="171" y="52" textAnchor="middle" fontSize="10" fill={COL.bad} fontFamily="monospace">count {cycle[1] ?? "?"}</text>
          <path d="M84 34 C 105 10, 115 10, 136 34" fill="none" stroke={COL.owner} strokeWidth="1.6" />
          <path d="M136 50 C 115 74, 105 74, 84 50" fill="none" stroke={COL.owner} strokeWidth="1.6" />
        </svg>
        <p className="text-[11px]" style={{ color: stuck === 0 ? COL.bad : "rgba(255,255,255,0.6)" }}>
          {stuck === undefined ? "run to see how many were destroyed" : stuck === 0 ? "scope ended: 0 destroyed, both leaked" : `${stuck} destroyed`}
        </p>
      </div>
      <div className="min-w-0 rounded-lg border p-2" style={{ borderColor: `${COL.owner}55` }}>
        <p className="truncate font-mono text-[11px]" style={{ color: COL.owner }}>
          shared → weak: cycle broken
        </p>
        <svg viewBox="0 0 220 84" className="mt-1 block w-full" role="img" aria-label="a quay owning a crane, the crane watching the quay">
          <rect x="14" y="26" width="70" height="32" rx="8" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.3)" />
          <rect x="136" y="26" width="70" height="32" rx="8" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.3)" />
          <text x="49" y="40" textAnchor="middle" fontSize="10" fill="#f4f4f4" fontFamily="monospace">Quay</text>
          <text x="49" y="52" textAnchor="middle" fontSize="10" fill={COL.owner} fontFamily="monospace">count {fixed[0] ?? "?"}</text>
          <text x="171" y="40" textAnchor="middle" fontSize="10" fill="#f4f4f4" fontFamily="monospace">Crane</text>
          <text x="171" y="52" textAnchor="middle" fontSize="10" fill={COL.owner} fontFamily="monospace">count {fixed[1] ?? "?"}</text>
          <path d="M84 34 C 105 10, 115 10, 136 34" fill="none" stroke={COL.owner} strokeWidth="1.6" />
          <path d="M136 50 C 115 74, 105 74, 84 50" fill="none" stroke={COL.borrowed} strokeWidth="1.6" strokeDasharray="4 3" />
          <text x="110" y="80" textAnchor="middle" fontSize="8.5" fill={COL.borrowed} fontFamily="monospace">weak_ptr</text>
        </svg>
        <p className="text-[11px] text-white/70">
          lock() {boolOf(s.lockWorks) === undefined ? dash : boolOf(s.lockWorks) ? "returned a live pointer" : "found nothing"}
        </p>
      </div>
      {gone.length > 0 && (
        <div className="@md:col-span-2">
          <SubLabel>destroyed, in order</SubLabel>
          <ol className="flex flex-wrap gap-1.5">
            {gone.map((g, i) => (
              <li key={i}>
                <Tag tone="accent">
                  {i + 1}. {g}
                </Tag>
              </li>
            ))}
          </ol>
          {boolOf(s.watcherAliveInside) !== undefined && (
            <p className="mt-1.5 text-[11px] text-white/70">
              a standalone weak_ptr: alive inside the block <Mono className="text-white/90">{String(s.watcherAliveInside)}</Mono>, afterwards <Mono className="text-white/90">{String(s.watcherAliveAfter)}</Mono>
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ───────────────────────── 15: report desk ─────────────────────────

const kindOf = (line: string) => (line.startsWith("storm") ? "storm" : line.startsWith("fog") ? "fog" : "calm");
const KIND_COLOUR: Record<string, string> = { calm: COL.owner, fog: COL.borrowed, storm: COL.bad };

export function Variants({ s }: { s: Scene }) {
  const lines = strs(s.reportLines);
  const lookups = rec(s.lookups);
  const names = Object.keys(lookups);
  if (lines.length === 0 && names.length === 0) return <Hint>Send lookups and reportLines.</Hint>;
  return (
    <div>
      {names.length > 0 && (
        <>
          <SubLabel>optional&lt;int&gt; lookups</SubLabel>
          <ul className="grid grid-cols-3 gap-2">
            {names.map((n) => {
              const v = lookups[n];
              const has = typeof v === "number";
              return (
                <li key={n} className="min-w-0 rounded-md border px-2 py-1.5 text-center" style={{ borderColor: has ? "rgba(255,255,255,0.14)" : `${COL.raw}66`, background: has ? "rgba(255,255,255,0.04)" : COL.rawSoft }}>
                  <p className="truncate font-mono text-[10.5px] text-white/70">{n}</p>
                  <p className="hud-value text-[14px]" style={{ color: has ? COL.owner : COL.raw }}>
                    {has ? String(v) : "nullopt"}
                  </p>
                </li>
              );
            })}
          </ul>
          {numOf(s.westOrDefault) !== undefined && <p className="hud-muted mt-1 text-[10.5px]">value_or(-1) for a missing one gives {numOf(s.westOrDefault)}</p>}
        </>
      )}
      {lines.length > 0 && (
        <>
          <SubLabel>variant&lt;Calm, Fog, Storm&gt; reports</SubLabel>
          <ul className="grid grid-cols-2 gap-2 @md:grid-cols-4">
            {lines.map((l, i) => (
              <li key={i} className="en-pop min-w-0 rounded-md border p-1.5" style={{ borderColor: `${KIND_COLOUR[kindOf(l)]}66`, background: `${KIND_COLOUR[kindOf(l)]}14`, animationDelay: `${i * 80}ms` }}>
                <p className="font-mono text-[10px] uppercase" style={{ color: KIND_COLOUR[kindOf(l)] }}>
                  {kindOf(l)}
                </p>
                <p className="mt-0.5 text-[10.5px] leading-snug text-white/80">{l}</p>
              </li>
            ))}
          </ul>
          <p className="hud-muted mt-1.5 text-[10.5px]">
            {numOf(s.stormCount) ?? 0} storm{numOf(s.stormCount) === 1 ? "" : "s"}, worst wind {numOf(s.worstWind) ?? 0} knots
          </p>
        </>
      )}
    </div>
  );
}

// ───────────────────────── 16: night report ─────────────────────────

export function Report({ s }: { s: Scene }) {
  const lines = strs(s.nightLines);
  if (lines.length === 0) return <Hint>Run the night shift and send nightLines.</Hint>;
  const rows = lines.map((l) => {
    const m = /^report (\d+): (\S+) \| (\S+)$/.exec(l);
    return m ? { n: m[1], north: m[2], south: m[3] } : null;
  });
  const roles = strs(s.nightRoles);
  const east = s.eastPattern;
  return (
    <div>
      <table className="w-full table-fixed border-collapse text-left">
        <thead>
          <tr className="hud-label">
            <th className="w-8 pb-1 font-medium">#</th>
            <th className="pb-1 font-medium">{(roles[0] ?? "North lamp").replace(/ lamp$/, "")}</th>
            <th className="pb-1 font-medium">{(roles[1] ?? "South lamp").replace(/ lamp$/, "")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) =>
            r ? (
              <tr key={i} className="border-t border-white/[0.07]">
                <td className="py-1 font-mono text-[10.5px] text-white/60">{r.n}</td>
                <td className="py-1">
                  <Cells pattern={r.north} size={9} />
                </td>
                <td className="py-1">
                  <Cells pattern={r.south} size={9} />
                </td>
              </tr>
            ) : (
              <tr key={i}>
                <td colSpan={3} className="py-1 font-mono text-[10.5px] text-white/60">
                  {lines[i]}
                </td>
              </tr>
            ),
          )}
        </tbody>
      </table>
      <dl className="mt-2 grid grid-cols-3 gap-2">
        <Tile label="storm alerts" value={numOf(s.nightAlerts) ?? dash} tone="warning" />
        <Tile label="stations owned" value={numOf(s.stationCount) ?? dash} tone="accent" />
        <Tile label="East lamp" value={typeof east === "string" ? east : "nullopt"} />
      </dl>
      {roles.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {roles.map((r) => (
            <Tag key={r} tone="accent">
              unique_ptr: {r}
            </Tag>
          ))}
        </div>
      )}
    </div>
  );
}
