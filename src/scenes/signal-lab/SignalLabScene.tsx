"use client";

import React, { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Lock, Pause, Play, Radio, Send, TriangleAlert, Waves, Zap } from "lucide-react";
import type { SceneProps } from "@/engine/scene";
import { FeatureIcon } from "@/components/ui/icons";
import { Lab, type AlertRow, type ConsoleRow, type View } from "./lab.ts";

/**
 * Signal Lab: a deep-space radio console driven by the learner's Python.
 *
 * The scene owns the incoming stream (a seeded feed of messy transmissions) and nothing else. Every
 * decoded thing on screen is produced by a function the learner wrote, called through the store in
 * lab.ts. Each lesson unlocks one panel; until then it is a dashed blueprint. Colour follows the
 * Pockett Stage system: neutral greys for structure, lime only for values the learner's code
 * produced, amber/red for caution and failures. The one exception is regex group colouring in the
 * Field extractor, which needs a handful of distinct tints by nature.
 */

type PanelDef = { id: string; title: string; lesson: number; clause: string };

const PANELS: PanelDef[] = [
  { id: "sl-stream", title: "Incoming stream", lesson: 1, clause: "text[11:19] · slicing" },
  { id: "sl-scrub", title: "Noise filter", lesson: 2, clause: ".strip() · .split() · .join()" },
  { id: "sl-decode", title: "Message decoder", lesson: 3, clause: ".partition() · .casefold()" },
  { id: "sl-readout", title: "Readout & checksum", lesson: 4, clause: "f\"{x:>10.3f}\" · ord()" },
  { id: "sl-scanner", title: "Pattern scanner", lesson: 5, clause: "re.search · re.findall" },
  { id: "sl-fields", title: "Field extractor", lesson: 6, clause: "(?P<name>…) groups" },
  { id: "sl-release", title: "Release copy", lesson: 7, clause: "re.sub(…, func)" },
  { id: "sl-records", title: "Parsed records", lesson: 8, clause: "re.compile(…, re.X)" },
  { id: "sl-search", title: "Search console", lesson: 9, clause: "search(lines, query)" },
  { id: "sl-alerts", title: "Alert board", lesson: 10, clause: "try / except ValueError" },
  { id: "sl-skymap", title: "Sky map", lesson: 11, clause: "[… for … if …]" },
  { id: "sl-ranking", title: "Strongest signals", lesson: 12, clause: "sorted(key=lambda …)" },
  { id: "sl-leaderboard", title: "Top senders", lesson: 13, clause: "Counter · defaultdict" },
  { id: "sl-report", title: "Mission report", lesson: 14, clause: "summarize(lines)" },
];
const PANEL = Object.fromEntries(PANELS.map((p) => [p.id, p])) as Record<string, PanelDef>;

/** Regex group tints: the one place the stage uses several hues, because the groups must be told apart. */
const GROUP_TINT: Record<string, string> = {
  call: "#a3e635",
  freq: "#7dd3fc",
  az: "#fcd34d",
  el: "#c4b5fd",
  snr: "#fda4af",
};

const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;

// ───────────────────────── text helpers ─────────────────────────

interface Mark {
  start: number;
  end: number;
  node: (text: string, key: number) => React.ReactNode;
}

/** Wraps non-overlapping ranges of `text` with the given renderers. */
function Marked({ text, marks }: { text: string; marks: Mark[] }) {
  const sorted = [...marks].filter((m) => m.end > m.start).sort((a, b) => a.start - b.start);
  const out: React.ReactNode[] = [];
  let at = 0;
  sorted.forEach((m, i) => {
    if (m.start < at) return;
    if (m.start > at) out.push(text.slice(at, m.start));
    out.push(m.node(text.slice(m.start, m.end), i));
    at = m.end;
  });
  if (at < text.length) out.push(text.slice(at));
  return <>{out}</>;
}

/** Locates each value in order inside `text` (values are what the learner's code returned). */
function locate(text: string, values: { key: string; value: string }[]): { key: string; start: number; end: number }[] {
  const lower = text.toLowerCase();
  const found: { key: string; start: number; end: number }[] = [];
  let cursor = 0;
  for (const { key, value } of values) {
    if (!value) continue;
    const at = lower.indexOf(value.toLowerCase(), cursor);
    if (at === -1) continue;
    found.push({ key, start: at, end: at + value.length });
    cursor = at + value.length;
  }
  return found;
}

// ───────────────────────── building blocks ─────────────────────────

function PanelFrame({
  id,
  icon,
  meta,
  focus,
  flash,
  children,
}: {
  id: string;
  icon?: React.ReactNode;
  meta?: React.ReactNode;
  focus?: boolean;
  flash?: boolean;
  children: React.ReactNode;
}) {
  const def = PANEL[id];
  return (
    <section data-panel={id} className={`hud-panel mb-3 break-inside-avoid px-3 py-2.5 ${focus ? "border-[#a3e635]/35" : ""} ${flash ? "pop-in" : ""}`}>
      <header className="mb-2 flex min-w-0 items-center gap-2">
        <span className="shrink-0 text-[#a3e635]">{icon ?? <FeatureIcon id={id} className="h-3.5 w-3.5" />}</span>
        <h3 className="hud-title min-w-0 flex-1 truncate">{def?.title ?? id}</h3>
        {meta && <span className="hud-value hud-muted shrink-0 text-[10px]">{meta}</span>}
      </header>
      {children}
    </section>
  );
}

function Ghost({ id }: { id: string }) {
  const bar = "rounded-sm bg-white/[0.05]";
  if (id === "sl-skymap") {
    return (
      <div className="grid place-items-center py-1">
        <div className="relative h-24 w-24 rounded-full border border-dashed border-white/10">
          <div className="absolute inset-4 rounded-full border border-dashed border-white/10" />
          <div className="absolute inset-9 rounded-full border border-dashed border-white/10" />
        </div>
      </div>
    );
  }
  if (id === "sl-ranking" || id === "sl-leaderboard") {
    return (
      <div className="space-y-1.5">
        {[88, 70, 54, 41].map((w) => (
          <div key={w} className="flex items-center gap-2">
            <div className={`${bar} h-1.5 w-8 shrink-0`} />
            <div className={`${bar} h-1.5`} style={{ width: `${w}%` }} />
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="space-y-1.5">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex items-center gap-2">
          <div className={`${bar} h-1.5 w-6 shrink-0`} />
          <div className={`${bar} h-1.5 flex-1`} />
          <div className={`${bar} h-1.5 w-8 shrink-0`} />
        </div>
      ))}
    </div>
  );
}

function LockedPanel({ id, spot }: { id: string; spot: boolean }) {
  const def = PANEL[id];
  return (
    <section data-panel={id} data-locked="" className={`mb-3 break-inside-avoid rounded-[10px] border border-dashed px-3 py-2.5 ${spot ? "pulse-ring border-[#a3e635]/60" : "border-white/15"}`}>
      <header className="mb-2.5 flex min-w-0 items-center gap-2">
        <Lock className="h-3 w-3 shrink-0 text-white/35" aria-hidden />
        <h3 className="hud-label min-w-0 flex-1 truncate">{def.title}</h3>
        <span className="hud-label shrink-0 text-white/30">L{def.lesson}</span>
      </header>
      <Ghost id={id} />
      <p className="mt-2.5 truncate font-mono text-[10px] text-white/40">
        {spot ? <span className="hud-accent">Your code powers this · </span> : "Locked · "}
        {def.clause}
      </p>
    </section>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return <p className="hud-log hud-muted py-1 text-[11px]">{children}</p>;
}

/** Shown when a panel is unlocked but the learner's function it needs is missing from the file. */
function NeedsHook({ name }: { name: string }) {
  return (
    <Note>
      Waiting for <span className="hud-warning">{name}()</span> in your file. Run again once it is defined.
    </Note>
  );
}

function Chip({ children, tone = "muted", title }: { children: React.ReactNode; tone?: "muted" | "lime" | "danger" | "warn"; title?: string }) {
  const cls =
    tone === "lime"
      ? "border-[#a3e635]/40 text-[#bef264]"
      : tone === "danger"
        ? "border-[#f87171]/40 text-[#f87171]"
        : tone === "warn"
          ? "border-[#fbbf24]/40 text-[#fbbf24]"
          : "border-white/10 text-white/50";
  return (
    <span title={title} className={`inline-flex h-[18px] shrink-0 items-center rounded-full border px-1.5 font-mono text-[9.5px] font-medium uppercase tracking-wide ${cls}`}>
      {children}
    </span>
  );
}

// ───────────────────────── the console (stream + clean) ─────────────────────────

function RawCell({ row, stampLive, filterLive }: { row: ConsoleRow; stampLive: boolean; filterLive: boolean }) {
  const stampText = row.raw.slice(0, 20);
  const payload = row.raw.slice(20);
  const [l, r] = row.margins ?? [0, 0];
  const mid = payload.slice(l, payload.length - r || undefined);
  const hasMargins = filterLive && row.margins !== null;
  return (
    <p className="min-w-0 whitespace-pre-wrap break-all font-mono text-[11px] leading-[1.45] text-white/55 [tab-size:2]">
      {stampLive && row.stamp ? (
        <>
          <span className="text-white/40">{row.stamp.date}</span>
          <span className="text-white/25">T</span>
          <span className="hud-accent font-semibold">{row.stamp.time}</span>
          <span className="text-white/25">Z</span>
        </>
      ) : (
        <span className="text-white/40">{stampText}</span>
      )}
      {hasMargins ? (
        <>
          <span className="text-white/20 line-through decoration-white/20">{payload.slice(0, l)}</span>
          <span>{mid}</span>
          <span className="text-white/20 line-through decoration-white/20">{payload.slice(payload.length - r)}</span>
        </>
      ) : (
        payload
      )}
    </p>
  );
}

function Console({
  view,
  streamLive,
  filterLive,
  streamMissing,
  filterMissing,
  interactive,
  narrow,
  focus,
  flash,
  onTransmit,
  onToggle,
  onJam,
  onCorrupt,
}: {
  view: View;
  streamLive: boolean;
  filterLive: boolean;
  streamMissing?: string;
  filterMissing?: string;
  interactive: boolean;
  narrow: boolean;
  focus: string | null;
  flash: Set<string>;
  onTransmit: (text: string) => void;
  onToggle: () => void;
  onJam: () => void;
  onCorrupt: () => void;
}) {
  const [draft, setDraft] = useState("");
  const rows = narrow ? view.rows.slice(-6) : view.rows;
  const spotStream = focus === "sl-stream" && !streamLive;
  const spotFilter = focus === "sl-scrub" && !filterLive;
  return (
    <section
      data-panel="console"
      className={`hud-panel mb-3 px-3 py-2.5 ${streamLive ? "" : "border-dashed"} ${focus === "sl-stream" || focus === "sl-scrub" ? "border-[#a3e635]/35" : ""} ${flash.has("sl-stream") || flash.has("sl-scrub") ? "pop-in" : ""}`}
    >
      <header className="mb-2 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1.5">
        <span className={streamLive ? "text-[#a3e635]" : "text-white/40"}>
          <Radio className="h-3.5 w-3.5" aria-hidden />
        </span>
        <h3 className="hud-title min-w-0 flex-1 truncate">Incoming stream</h3>
        <span className="hud-value hud-muted shrink-0 text-[10px]">{plural(view.received, "message")}</span>
        {interactive && (
          <span className="flex shrink-0 items-center gap-1.5">
            <button type="button" className="hud-btn !h-6 !px-2.5 !text-[11px]" onClick={onToggle} aria-label={view.running ? "Pause the stream" : "Resume the stream"}>
              {view.running ? <Pause className="h-3 w-3" aria-hidden /> : <Play className="h-3 w-3" aria-hidden />}
              {view.running ? "Pause" : "Resume"}
            </button>
            <button type="button" className="hud-btn !h-6 !px-2.5 !text-[11px]" onClick={onJam} title="Inject a burst of garbage">
              <Zap className="h-3 w-3" aria-hidden />
              Jam
            </button>
            <button type="button" className="hud-btn !h-6 !px-2.5 !text-[11px]" onClick={onCorrupt} title="Send a message that was damaged after its checksum was computed">
              <Waves className="h-3 w-3" aria-hidden />
              Corrupt
            </button>
          </span>
        )}
      </header>

      <div className="hidden grid-cols-2 gap-x-3 pb-1 @lg:grid">
        <p className="hud-label flex items-center gap-1.5">
          Raw · what the dish heard
          {!streamLive && <Lock className="h-2.5 w-2.5 text-white/30" aria-hidden />}
        </p>
        <p className="hud-label flex items-center gap-1.5">
          {filterLive ? <span className="hud-accent">Clean · your scrub()</span> : <>Clean · locked</>}
          {!filterLive && <Lock className="h-2.5 w-2.5 text-white/30" aria-hidden />}
        </p>
      </div>

      {streamMissing && <NeedsHook name={streamMissing} />}
      <ol className="space-y-0">
        {rows.length === 0 && <li className="hud-muted py-2 text-[11px]">Listening…</li>}
        {rows.map((row) => (
          <li key={row.id} className="grid min-w-0 grid-cols-1 gap-x-3 gap-y-0.5 border-t border-white/[0.06] py-1 @lg:grid-cols-2">
            <RawCell row={row} stampLive={streamLive && !streamMissing} filterLive={filterLive && !filterMissing} />
            {filterLive && !filterMissing ? (
              <p className="hud-accent min-w-0 break-words font-mono text-[11px] leading-[1.45]">{row.clean ?? <span className="text-white/30">no text returned</span>}</p>
            ) : (
              <div className={`hidden items-center @lg:flex ${spotFilter ? "pulse-ring rounded-md" : ""}`} aria-hidden>
                <div className="h-1.5 w-full rounded-sm bg-white/[0.05]" />
              </div>
            )}
          </li>
        ))}
      </ol>
      {filterMissing && filterLive && <NeedsHook name={filterMissing} />}

      {!streamLive && (
        <p className="mt-2 truncate font-mono text-[10px] text-white/40">
          {spotStream ? <span className="hud-accent">Your code powers this · </span> : "Locked · "}
          {PANEL["sl-stream"].clause}
        </p>
      )}
      {streamLive && !filterLive && (
        <p className="mt-2 truncate font-mono text-[10px] text-white/40">
          {spotFilter ? <span className="hud-accent">Your code powers the clean column · </span> : "Clean column locked · "}
          {PANEL["sl-scrub"].clause}
        </p>
      )}

      {interactive && (
        <form
          className="mt-2.5 flex min-w-0 items-center gap-2 border-t border-white/[0.06] pt-2.5"
          onSubmit={(e) => {
            e.preventDefault();
            onTransmit(draft);
            setDraft("");
          }}
        >
          <label className="sr-only" htmlFor="sl-transmit">
            Transmit a line
          </label>
          <input
            id="sl-transmit"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={'kx-204 @ 1420.405mhz az=47.5 el=32 snr=12dB "Hello"'}
            spellCheck={false}
            autoComplete="off"
            maxLength={160}
            className="h-8 min-w-0 flex-1 rounded-full border border-white/12 bg-black/40 px-3 font-mono text-[11px] text-white placeholder:text-white/30 focus:border-[#a3e635]/50 focus:outline-none"
          />
          <button type="submit" className="hud-btn shrink-0" aria-label="Transmit this line">
            <Send className="h-3 w-3" aria-hidden />
            <span className="hidden @sm:inline">Transmit</span>
          </button>
        </form>
      )}
    </section>
  );
}

// ───────────────────────── panels ─────────────────────────

function DecodePanel({ view }: { view: View }) {
  if (view.decode.length === 0) return <Note>Nothing decoded yet. split_message() has to return a dict with call, message and checksum.</Note>;
  return (
    <ul className="space-y-1.5">
      {[...view.decode].reverse().map((d) => (
        <li key={d.id} className="min-w-0 rounded-md bg-white/[0.04] px-2 py-1.5">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <span className="hud-value hud-accent text-[12px] font-semibold">{d.call || "?"}</span>
            {d.beacon && <Chip tone="lime">beacon</Chip>}
            {d.tag && <Chip tone="lime" title="first_tag()">[{d.tag}]</Chip>}
            <span className="hud-value hud-muted ml-auto text-[10px]">#{d.checksum || "--"}</span>
          </div>
          <p className="mt-0.5 min-w-0 break-words text-[11px] text-white/85">{d.message || <span className="text-white/35">no message</span>}</p>
        </li>
      ))}
    </ul>
  );
}

function ReadoutPanel({ view }: { view: View }) {
  const rows = [...view.readout].reverse().filter((r) => r.text !== null || r.sum !== null);
  if (rows.length === 0) return <Note>No readings yet. Waiting for a clean transmission.</Note>;
  return (
    <ul className="space-y-2">
      {rows.map((r) => {
        const ok = r.sum !== null && r.claimed !== null ? r.sum.toUpperCase() === r.claimed : null;
        return (
          <li key={r.id} className="min-w-0">
            <div className="flex min-w-0 items-start justify-between gap-2">
              <pre className="hud-value hud-accent m-0 min-w-0 overflow-hidden whitespace-pre text-[10.5px] leading-[1.4]">{r.text ?? "(readout returned no text)"}</pre>
              {ok !== null && (
                <Chip tone={ok ? "lime" : "danger"} title={ok ? "checksum matches" : `your checksum is ${r.sum}, the message claims ${r.claimed}`}>
                  {ok ? `ok ${r.sum}` : `${r.sum} ≠ ${r.claimed}`}
                </Chip>
              )}
            </div>
            {(r.hz || r.pretty) && <p className="hud-value hud-muted mt-0.5 break-words text-[10px]">{[r.hz, r.pretty].filter(Boolean).join(" · ")}</p>}
          </li>
        );
      })}
    </ul>
  );
}

function ScanPanel({ view }: { view: View }) {
  const dot = (label: string, v: boolean | null) =>
    v === null ? null : (
      <span key={label} className={`inline-flex items-center gap-1 font-mono text-[9.5px] uppercase tracking-wide ${v ? "text-[#bef264]" : "text-[#f87171]"}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${v ? "bg-[#a3e635]" : "bg-[#f87171]"}`} />
        {label}
      </span>
    );
  return (
    <>
      <ul className="space-y-2">
        {[...view.scan].reverse().map((s) => {
          const marks: Mark[] = locate(
            s.clean,
            s.numbers.map((n) => ({ key: n, value: n })),
          ).map((f) => ({
            start: f.start,
            end: f.end,
            node: (t, k) => (
              <mark key={k} className="rounded-[3px] bg-[#a3e635]/20 px-px text-[#d9f99d]">
                {t}
              </mark>
            ),
          }));
          return (
            <li key={s.id} className="min-w-0">
              <div className="mb-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                {dot("stamp", s.stampOk)}
                {dot("call", s.callOk)}
                {dot("chk", s.chkOk)}
                <span className="hud-value hud-muted ml-auto text-[10px]">{plural(s.numbers.length, "number")}</span>
              </div>
              <p className="min-w-0 break-words font-mono text-[11px] leading-[1.45] text-white/70">
                <Marked text={s.clean} marks={marks} />
              </p>
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-[10.5px] leading-snug text-white/45">
        Spot the <span className="font-mono text-white/70">-204</span> inside each call sign? A pattern knows shape, not meaning. Groups fix that in the next lesson.
      </p>
    </>
  );
}

function FieldsPanel({ view }: { view: View }) {
  const keys = ["call", "freq", "az", "el", "snr"] as const;
  return (
    <>
      <div className="mb-2 flex flex-wrap gap-x-3 gap-y-1">
        {keys.map((k) => (
          <span key={k} className="inline-flex items-center gap-1.5 font-mono text-[10px] text-white/60">
            <span className="h-2 w-2 rounded-[3px]" style={{ background: GROUP_TINT[k] }} />
            {k}
          </span>
        ))}
      </div>
      <ul className="space-y-2.5">
        {[...view.fields].reverse().map((f) => {
          const found = f.fields ? locate(f.clean, keys.map((k) => ({ key: k, value: f.fields?.[k] ?? "" }))) : [];
          const marks: Mark[] = found.map((m) => ({
            start: m.start,
            end: m.end,
            node: (t, i) => (
              <span key={i} className="rounded-[3px] px-[2px] font-semibold" style={{ color: GROUP_TINT[m.key], background: `${GROUP_TINT[m.key]}26` }}>
                {t}
              </span>
            ),
          }));
          const tagMarks: Mark[] = f.spans.map(([s, e]) => ({
            start: s,
            end: e,
            node: (t, i) => (
              <span key={i} className="rounded-[3px] bg-[#a3e635]/20 px-px text-[#d9f99d]">
                {t}
              </span>
            ),
          }));
          return (
            <li key={f.id} className="min-w-0">
              {f.fields ? (
                <p className="min-w-0 break-words font-mono text-[11px] leading-[1.6] text-white/55">
                  <Marked text={f.clean} marks={marks} />
                </p>
              ) : (
                <p className="min-w-0 break-words font-mono text-[11px] leading-[1.45] text-white/35">
                  <span className="hud-warning">no match</span> · {f.clean || "(empty)"}
                </p>
              )}
              {f.fields && f.message && (
                <p className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-white/80">
                  {f.kind && <Chip tone="lime">{f.kind}</Chip>}
                  <span className="min-w-0 break-words">
                    <Marked text={f.message} marks={tagMarks} />
                  </span>
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}

function ReleasePanel({ view }: { view: View }) {
  return (
    <ul className="space-y-2">
      {[...view.release].reverse().map((r) => (
        <li key={r.id} className="min-w-0 font-mono text-[11px] leading-[1.45]">
          <p className="min-w-0 break-words text-white/35 line-through decoration-white/15">{r.clean}</p>
          <p className="hud-accent min-w-0 break-words">{r.released ?? <span className="text-white/35">no text returned</span>}</p>
        </li>
      ))}
    </ul>
  );
}

function RecordsPanel({ view }: { view: View }) {
  const cols: [string, string, string][] = [
    ["stamp", "time", "text-left"],
    ["call", "call", "text-left"],
    ["freq", "MHz", "text-right"],
    ["az", "az", "text-right"],
    ["el", "el", "text-right"],
    ["snr", "snr", "text-right"],
    ["message", "message", "text-left"],
  ];
  const rows = [...view.records].reverse();
  if (rows.length === 0) return <Note>No records yet.</Note>;
  return (
    <div className="-mx-1 overflow-x-auto">
      <table className="w-full border-collapse text-[11px]">
        <thead>
          <tr>
            {cols.map(([, label, align]) => (
              <th key={label} scope="col" className={`whitespace-nowrap px-1 pb-1 font-mono text-[10px] font-medium text-white/45 ${align}`}>
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="hud-value">
          {rows.map((r) =>
            r.parsed ? (
              <tr key={r.id} className="border-t border-white/[0.06]">
                {cols.map(([key, , align]) => {
                  const v = r.parsed?.[key];
                  const shown = key === "stamp" && v ? v.slice(11, 19) : v;
                  return (
                    <td key={key} className={`max-w-[10rem] truncate whitespace-nowrap px-1 py-[3px] tabular-nums ${align} ${key === "call" ? "hud-accent" : ""} ${shown === undefined ? "text-white/25" : ""}`}>
                      {shown ?? "—"}
                    </td>
                  );
                })}
              </tr>
            ) : (
              <tr key={r.id} className="border-t border-white/[0.06]">
                <td className="hud-warning px-1 py-[3px] font-mono text-[10px]">no match</td>
                <td colSpan={cols.length - 1} className="max-w-0 truncate px-1 py-[3px] text-white/30">
                  {r.raw.slice(20).trim()}
                </td>
              </tr>
            ),
          )}
        </tbody>
      </table>
    </div>
  );
}

function SearchPanel({ view, interactive, onQuery }: { view: View; interactive: boolean; onQuery: (q: string) => void }) {
  const s = view.search;
  const examples = ["beacon", "[a-z]{2}-\\d{3}", "relay|ping", "\\[urgent\\]", "snr=-"];
  const shown = s ? [...s.hits].reverse().slice(0, 7) : [];
  return (
    <>
      <div className="relative">
        <label className="sr-only" htmlFor="sl-search">
          Search the stream
        </label>
        <input
          id="sl-search"
          value={view.query}
          onChange={(e) => onQuery(e.target.value)}
          readOnly={!interactive}
          placeholder="beacon  ·  [a-z]{2}-\d{3}  ·  relay|ping"
          spellCheck={false}
          autoComplete="off"
          className={`h-8 w-full rounded-full border bg-black/40 px-3 font-mono text-[11px] text-white placeholder:text-white/30 focus:outline-none ${
            s?.state === "invalid" ? "border-[#f87171]/50" : "border-white/12 focus:border-[#a3e635]/50"
          }`}
        />
      </div>
      <div className="mt-1.5 flex min-h-[18px] items-center gap-2">
        {s?.state === "ok" && (
          <span className="hud-value hud-accent text-[10px]">
            {s.hits.length} of {s.scanned} lines match
          </span>
        )}
        {s?.state === "invalid" && <span className="hud-danger text-[10px]">search() gave nothing back: invalid or oversized pattern</span>}
        {s?.state === "idle" && <span className="hud-label">your regex filter, live</span>}
      </div>
      {s?.state === "idle" && interactive && (
        <div className="mt-1 flex flex-wrap gap-1.5">
          {examples.map((q) => (
            <button key={q} type="button" onClick={() => onQuery(q)} className="hud-tag !h-5 font-mono !text-[10px] font-medium hover:border-[#a3e635]/40">
              {q}
            </button>
          ))}
        </div>
      )}
      {s?.state === "ok" && (
        <ul className="mt-1 space-y-1">
          {shown.map((h) => (
            <li key={h.id} className="min-w-0 break-words rounded bg-white/[0.04] px-1.5 py-1 font-mono text-[11px] leading-[1.4] text-white/65">
              <Marked
                text={h.text}
                marks={[
                  {
                    start: h.start,
                    end: h.end,
                    node: (t, i) => (
                      <mark key={i} className="rounded-[3px] bg-[#a3e635]/25 px-px text-[#d9f99d]">
                        {t}
                      </mark>
                    ),
                  },
                ]}
              />
            </li>
          ))}
          {s.hits.length === 0 && <li className="hud-muted py-1 text-[11px]">No line matches.</li>}
          {s.hits.length > shown.length && <li className="hud-label text-white/35">+{s.hits.length - shown.length} more</li>}
        </ul>
      )}
    </>
  );
}

function AlertsPanel({ view }: { view: View }) {
  if (view.alerts.length === 0) return <Note>All clear. Every message so far decoded cleanly.</Note>;
  return (
    <ul className="space-y-1.5">
      {view.alerts.map((a: AlertRow) => (
        <li key={a.id} className="min-w-0 rounded-md bg-white/[0.04] px-2 py-1.5">
          <div className="flex min-w-0 items-center gap-2">
            {a.level === "bad" ? <TriangleAlert className="h-3 w-3 shrink-0 text-[#f87171]" aria-hidden /> : <Waves className="h-3 w-3 shrink-0 text-[#fbbf24]" aria-hidden />}
            <span className={`min-w-0 flex-1 break-words font-mono text-[10.5px] font-medium ${a.level === "bad" ? "hud-danger" : "hud-warning"}`}>{a.reason}</span>
            <span className="hud-value hud-muted shrink-0 text-[10px]">{a.stamp}</span>
          </div>
          <p className="mt-0.5 truncate font-mono text-[10px] text-white/40">{a.excerpt}</p>
        </li>
      ))}
    </ul>
  );
}

function SkyPanel({ view, interactive, onMinSnr }: { view: View; interactive: boolean; onMinSnr: (v: number) => void }) {
  const points = view.sky ?? [];
  const [picked, setPicked] = useState<string | null>(null);
  const C = 100;
  const R = 86;
  const proj = (az: number, el: number): [number, number] => {
    const r = R * (1 - Math.max(0, Math.min(90, el)) / 90);
    const a = (az * Math.PI) / 180;
    return [C + r * Math.sin(a), C - r * Math.cos(a)];
  };
  const radius = (snr: number) => 2 + (Math.max(-10, Math.min(35, snr)) + 10) / 45 * 3.5;
  const latest = new Map<string, number>();
  points.forEach((p, i) => latest.set(p.call, i));
  const info = picked !== null ? points[latest.get(picked) ?? -1] : undefined;
  return (
    <>
      <div className="mx-auto w-full max-w-[17rem]">
        <svg viewBox="0 0 200 200" className="block h-auto w-full" role="img" aria-label={`Sky map with ${points.length} sources`}>
          <circle cx={C} cy={C} r={R} fill="rgba(255,255,255,0.02)" stroke="rgba(255,255,255,0.14)" />
          {[30, 60].map((el) => (
            <circle key={el} cx={C} cy={C} r={R * (1 - el / 90)} fill="none" stroke="rgba(255,255,255,0.08)" strokeDasharray="2 3" />
          ))}
          <path d={`M${C} ${C - R} V${C + R} M${C - R} ${C} H${C + R}`} stroke="rgba(255,255,255,0.07)" />
          {[
            ["N", C, C - R - 4],
            ["E", C + R + 6, C + 2.5],
            ["S", C, C + R + 10],
            ["W", C - R - 6, C + 2.5],
          ].map(([t, x, y]) => (
            <text key={t as string} x={x as number} y={y as number} textAnchor="middle" fontSize="7" fill="rgba(255,255,255,0.4)" fontFamily="var(--font-mono)">
              {t as string}
            </text>
          ))}
          <g className="animate-spin" style={{ transformOrigin: "100px 100px", animationDuration: "10s", animationTimingFunction: "linear" }}>
            <path d={`M${C} ${C} L${C} ${C - R}`} stroke="rgba(255,255,255,0.22)" strokeWidth="0.8" />
            <path d={`M${C} ${C} L${C - 22} ${C - R * 0.96} A${R} ${R} 0 0 1 ${C} ${C - R} Z`} fill="rgba(255,255,255,0.035)" />
          </g>
          {points.map((p, i) => {
            const [x, y] = proj(p.az, p.el);
            const isLatest = latest.get(p.call) === i;
            return (
              <circle key={i} cx={x} cy={y} r={isLatest ? radius(p.snr) : Math.max(1.4, radius(p.snr) - 1.4)} fill="#a3e635" opacity={isLatest ? 0.95 : 0.28}>
                <title>{`${p.call}  az ${p.az.toFixed(1)}  el ${p.el.toFixed(1)}  snr ${p.snr.toFixed(1)} dB`}</title>
              </circle>
            );
          })}
          {[...latest.entries()].map(([call, i]) => {
            const p = points[i];
            const [x, y] = proj(p.az, p.el);
            const right = x < C + 30;
            return (
              <g
                key={call}
                onClick={() => setPicked(call === picked ? null : call)}
                className={interactive ? "cursor-pointer" : ""}
                role={interactive ? "button" : undefined}
                aria-label={`${call} at azimuth ${p.az.toFixed(0)}`}
              >
                <circle cx={x} cy={y} r={9} fill="transparent" />
                <text x={right ? x + 6 : x - 6} y={y - 5} textAnchor={right ? "start" : "end"} fontSize="6.5" fill={picked === call ? "#d9f99d" : "rgba(255,255,255,0.7)"} fontFamily="var(--font-mono)">
                  {call}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <p className="hud-value hud-muted mt-1 min-h-[16px] text-center text-[10px]">
        {info ? (
          <>
            <span className="hud-accent">{info.call}</span> · az {info.az.toFixed(1)}° · el {info.el.toFixed(1)}° · {info.snr >= 0 ? "+" : ""}
            {info.snr.toFixed(1)} dB
          </>
        ) : points.length === 0 ? (
          "No sources above the SNR floor"
        ) : (
          `${plural(latest.size, "station")} · ${plural(points.length, "fix")}`
        )}
      </p>
      <div className="mt-1 flex items-center gap-2">
        <label htmlFor="sl-snr" className="hud-label shrink-0">
          Min SNR
        </label>
        <input
          id="sl-snr"
          type="range"
          min={-10}
          max={30}
          step={1}
          value={view.minSnr}
          disabled={!interactive}
          onChange={(e) => onMinSnr(Number(e.target.value))}
          className="h-4 min-w-0 flex-1 accent-[#a3e635]"
        />
        <span className="hud-value w-12 shrink-0 text-right text-[10px]">{view.minSnr} dB</span>
      </div>
    </>
  );
}

function RankPanel({ view }: { view: View }) {
  const rows = view.rank ?? [];
  if (rows.length === 0) return <Note>No ranked signals yet. strongest() should return the best records, highest first.</Note>;
  return (
    <ol className="space-y-1">
      {rows.map((r, i) => (
        <li key={`${r.stamp}-${i}`} className={`min-w-0 rounded px-1.5 py-1 ${i === 0 ? "bg-white/[0.05]" : ""}`}>
          <div className="flex min-w-0 items-baseline gap-2">
            <span className="hud-value hud-muted w-5 shrink-0 text-[10px]">{i + 1}</span>
            <span className={`hud-value shrink-0 text-[11px] font-semibold ${i === 0 ? "hud-accent" : ""}`}>{r.call}</span>
            <span className="min-w-0 flex-1 truncate text-[10.5px] text-white/45">{r.message}</span>
            <span className="hud-value shrink-0 text-[11px]">{r.snr >= 0 ? "+" : ""}{r.snr.toFixed(1)}</span>
          </div>
          <div className={`hud-bar mt-1 ${i === 0 ? "" : "hud-bar-neutral"}`}>
            <span style={{ width: `${Math.max(3, Math.min(100, ((r.snr + 10) / 45) * 100))}%` }} />
          </div>
        </li>
      ))}
    </ol>
  );
}

function BoardPanel({ view }: { view: View }) {
  const b = view.board;
  if (!b || b.senders.length === 0) return <Note>No counts yet. top_senders() should return (call, count) pairs.</Note>;
  const max = Math.max(1, ...b.senders.map(([, n]) => n));
  return (
    <>
      <ol className="space-y-1.5">
        {b.senders.map(([call, n], i) => (
          <li key={call} className="min-w-0">
            <div className="flex min-w-0 items-baseline gap-2">
              <span className={`hud-value shrink-0 text-[11px] font-semibold ${i === 0 ? "hud-accent" : ""}`}>{call}</span>
              {b.avg[call] !== undefined && (
                <span className="hud-value hud-muted text-[10px]" title="average SNR from average_snr()">
                  avg {b.avg[call] >= 0 ? "+" : ""}
                  {b.avg[call].toFixed(1)} dB
                </span>
              )}
              <span className="hud-value ml-auto shrink-0 text-[11px]">{n}</span>
            </div>
            <div className={`hud-bar mt-1 ${i === 0 ? "" : "hud-bar-neutral"}`}>
              <span style={{ width: `${(n / max) * 100}%` }} />
            </div>
          </li>
        ))}
      </ol>
      {b.words.length > 0 && (
        <div className="mt-2.5 border-t border-white/[0.06] pt-2">
          <p className="hud-label mb-1">Hot words</p>
          <div className="flex flex-wrap gap-1.5">
            {b.words.map(([w, n]) => (
              <span key={w} className="hud-tag !h-5 gap-1 font-mono !text-[10px] font-medium">
                {w}
                <span className="hud-accent">{n}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function ReportPanel({ view }: { view: View }) {
  const r = view.report;
  if (!r || !r.text) return <Note>No report yet. summarize() returns a dict and format_report() turns it into text.</Note>;
  const tiles: [string, number, string][] = [
    ["decoded", r.decoded, "hud-accent"],
    ["malformed", r.malformed, "hud-danger"],
    ["corrupt", r.corrupt, "hud-warning"],
  ];
  return (
    <>
      <div className="mb-2 grid grid-cols-3 gap-1.5">
        {tiles.map(([label, n, tone]) => (
          <div key={label} className="min-w-0 rounded-md bg-white/[0.04] px-2 py-1.5">
            <p className="hud-label truncate">{label}</p>
            <p className={`hud-value text-[15px] ${tone}`}>{n}</p>
          </div>
        ))}
      </div>
      <pre className="hud-log m-0 overflow-x-auto whitespace-pre text-[10.5px] leading-[1.5] text-[#d9f99d]">{r.text}</pre>
    </>
  );
}

// ───────────────────────── the scene ─────────────────────────

function sameSet(a: ReadonlySet<string>, b: ReadonlySet<string>) {
  if (a.size !== b.size) return false;
  for (const x of a) if (!b.has(x)) return false;
  return true;
}

export default function SignalLabScene({ program, unlocked, focus, celebration, interactive, autoplay }: SceneProps) {
  const [lab] = useState(() => new Lab());
  const view = useSyncExternalStore(lab.subscribe, lab.getSnapshot, lab.getServerSnapshot);
  const rootRef = useRef<HTMLDivElement>(null);
  const lastUnlocked = useRef<ReadonlySet<string>>(unlocked);
  const [narrow, setNarrow] = useState(true);

  // Calls into the learner's code happen in the store, never while rendering.
  useEffect(() => {
    if (!sameSet(lastUnlocked.current, unlocked)) lastUnlocked.current = unlocked;
    lab.configure(program, lastUnlocked.current);
  }, [lab, program, unlocked]);

  useEffect(() => {
    lab.start(autoplay ? 1100 : 1700);
    return () => lab.stop();
  }, [lab, autoplay]);

  // Routes are kept alive hidden: stop feeding Python while nobody can see the console.
  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([entry]) => lab.setVisible(entry.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, [lab]);

  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([entry]) => setNarrow(entry.contentRect.width < 576));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!autoplay) return;
    const id = setInterval(() => lab.demoQuery(), 3600);
    return () => clearInterval(id);
  }, [lab, autoplay]);

  const flash = new Set(celebration?.features ?? []);
  const alive = (id: string) => !!program && unlocked.has(id);
  const live = PANELS.filter((p) => alive(p.id)).length;

  const renderBody = (id: string): React.ReactNode => {
    const missing = view.missing[id];
    if (missing) return <NeedsHook name={missing} />;
    switch (id) {
      case "sl-decode":
        return <DecodePanel view={view} />;
      case "sl-readout":
        return <ReadoutPanel view={view} />;
      case "sl-scanner":
        return <ScanPanel view={view} />;
      case "sl-fields":
        return <FieldsPanel view={view} />;
      case "sl-release":
        return <ReleasePanel view={view} />;
      case "sl-records":
        return <RecordsPanel view={view} />;
      case "sl-search":
        return <SearchPanel view={view} interactive={interactive} onQuery={(q) => lab.setQuery(q)} />;
      case "sl-alerts":
        return <AlertsPanel view={view} />;
      case "sl-skymap":
        return <SkyPanel view={view} interactive={interactive} onMinSnr={(v) => lab.setMinSnr(v)} />;
      case "sl-ranking":
        return <RankPanel view={view} />;
      case "sl-leaderboard":
        return <BoardPanel view={view} />;
      default:
        return <ReportPanel view={view} />;
    }
  };

  const meta = (id: string): React.ReactNode => {
    switch (id) {
      case "sl-alerts":
        return view.alertTotal > 0 ? <span className="hud-warning">{view.alertTotal}</span> : "clear";
      case "sl-search":
        return view.search?.state === "ok" ? plural(view.search.hits.length, "hit") : undefined;
      case "sl-skymap":
        return view.sky ? plural(view.sky.length, "fix") : undefined;
      default:
        return undefined;
    }
  };

  const renderPanel = (p: PanelDef) => {
    if (!alive(p.id)) return <LockedPanel key={p.id} id={p.id} spot={focus === p.id} />;
    return (
      <PanelFrame key={flash.has(p.id) ? `${p.id}:${celebration?.nonce}` : p.id} id={p.id} meta={meta(p.id)} focus={focus === p.id} flash={flash.has(p.id)}>
        {renderBody(p.id)}
      </PanelFrame>
    );
  };

  // The current lesson's panel comes first so it is on screen at any size; the rest keep a fixed order.
  const order = ["sl-decode", "sl-readout", "sl-scanner", "sl-fields", "sl-release", "sl-records", "sl-search", "sl-alerts", "sl-skymap", "sl-ranking", "sl-leaderboard", "sl-report"];
  const focused = order.includes(focus ?? "") ? PANEL[focus as string] : null;
  const rest = order.filter((id) => id !== focused?.id).map((id) => PANEL[id]);

  return (
    <div ref={rootRef} className={`@container absolute inset-0 ${interactive ? "overflow-y-auto overscroll-contain" : "overflow-hidden"}`}>
      <div className="px-3 pb-3 pt-12">
        <div className="mb-3 flex min-w-0 items-baseline gap-x-3 gap-y-0.5 px-0.5">
          <h2 className="hud-title min-w-0 truncate">Deep Space Observatory · Dish 4</h2>
          <span className="hud-value hud-muted hidden shrink-0 text-[11px] @sm:inline">1420 MHz band</span>
          <span className="hud-label ml-auto shrink-0">
            <span className={`hud-value ${live > 0 ? "hud-accent" : "text-white/45"}`}>{live}</span>/{PANELS.length} panels live
          </span>
        </div>

        {narrow && focused && <div>{renderPanel(focused)}</div>}

        <Console
          view={view}
          streamLive={alive("sl-stream")}
          filterLive={alive("sl-scrub")}
          streamMissing={alive("sl-stream") ? view.missing["sl-stream"] : undefined}
          filterMissing={alive("sl-scrub") ? view.missing["sl-scrub"] : undefined}
          interactive={interactive}
          narrow={narrow}
          focus={focus}
          flash={flash}
          onTransmit={(t) => lab.transmit(t)}
          onToggle={() => lab.setRunning(!view.running)}
          onJam={() => lab.jam()}
          onCorrupt={() => lab.corrupt()}
        />

        <div className="gap-3 @xl:columns-2 @4xl:columns-3">
          {!narrow && focused && renderPanel(focused)}
          {rest.map(renderPanel)}
        </div>
      </div>
    </div>
  );
}
