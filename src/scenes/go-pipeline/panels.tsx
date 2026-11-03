"use client";

import React, { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { adviceFor, parseDiagnostics, runtimeAdvice, type Board, type BuildErr, type SimRun } from "./data";
import { AMBER, BarRow, Code, dash, Empty, LIME, Lamp, Pill, RED, SectionLabel, Tile, safeJson } from "../go-inventory/ui";

/**
 * The cards of the Tidewatch harbour board. Each one draws only what the learner's program sent with
 * scene(), tolerates missing or odd values and never throws. Lime means "your code made this", amber is
 * caution, red is failure, everything else is neutral grey.
 */

const FLEET = [1, 2, 3, 4, 5, 6];
const WAVE_MAX = 200;

// ───────────────────────── console ─────────────────────────

function ErrorBlock({ error }: { error: BuildErr }) {
  const compile = error.type === "CompileError";
  const diags = compile ? parseDiagnostics(error.message) : [];
  const advice = compile ? diags.map((d) => adviceFor(d.text)).find((a) => a !== undefined) : runtimeAdvice(error.message);
  const lines = compile ? [] : error.message.split("\n").filter((l) => l.trim().length > 0);
  return (
    <div role="alert" className="mb-2 rounded-md border border-[#f87171]/40 bg-[#2a0f0f]/70 px-2.5 py-2">
      <div className="mb-1.5 flex min-w-0 items-center gap-2">
        <AlertTriangle className="hud-danger h-3.5 w-3.5 shrink-0" aria-hidden />
        <span className="hud-title hud-danger min-w-0 flex-1 truncate">{compile ? "Build failed" : "The program crashed"}</span>
        {error.line !== null && <span className="hud-tag hud-danger shrink-0 border-[#f87171]/40">line {error.line}</span>}
      </div>
      {compile ? (
        <ul className="space-y-1">
          {diags.map((d, i) => (
            <li key={i} className="flex min-w-0 items-baseline gap-2 font-mono text-[11px] leading-snug text-[#fecaca]">
              {d.where && <span className="shrink-0 rounded bg-[#f87171]/15 px-1 text-[10px] text-[#fca5a5]">L{d.where}</span>}
              <span className="min-w-0 break-words">{d.text}</span>
            </li>
          ))}
        </ul>
      ) : (
        <pre className="max-h-24 overflow-auto whitespace-pre-wrap break-words font-mono text-[11px] leading-snug text-[#fecaca]">{lines.join("\n")}</pre>
      )}
      {advice && <p className="mt-1.5 border-t border-white/10 pt-1.5 text-[11px] leading-snug text-white/70">{advice}</p>}
      <p className="hud-muted mt-1 text-[10px]">Fix it in the editor and press Run again.</p>
    </div>
  );
}

function TabChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`h-6 rounded-full border px-2.5 font-mono text-[10.5px] transition-colors ${active ? "border-[#c5ee8a]/60 bg-[#c5ee8a]/10 text-[#e0f6c1]" : "border-white/15 text-white/60 hover:text-white/85"}`}
    >
      {children}
    </button>
  );
}

export function ConsolePanel({
  stdout,
  built,
  error,
  keys,
  live,
  interactive,
  focus,
  flash,
  locked,
}: {
  stdout: string;
  built: boolean;
  error: BuildErr | null;
  keys: [string, unknown][];
  live: boolean;
  interactive: boolean;
  focus: boolean;
  flash: boolean;
  locked: boolean;
}) {
  const [tab, setTab] = useState<"output" | "data">("output");
  const lines = stdout.split("\n");
  while (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();
  const compileFailed = error?.type === "CompileError";
  const status = !built ? "Idle" : error ? (compileFailed ? "Build failed" : "Crashed") : "Build OK";
  const statusTone = !built ? "text-white/55" : error ? "hud-danger border-[#f87171]/40" : "hud-accent";
  return (
    <section data-panel="gp-console" className={`hud-panel mb-3 break-inside-avoid px-3 py-2.5 ${focus ? "border-[#c5ee8a]/35" : ""} ${flash ? "pop-in" : ""}`}>
      <header className="mb-2 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1.5">
        <h3 className="hud-title min-w-0 flex-1 truncate">Control console</h3>
        <span className={`hud-tag shrink-0 ${statusTone}`}>{status}</span>
      </header>
      {error && <ErrorBlock error={error} />}
      {locked ? (
        <p className="truncate font-mono text-[10px] text-white/45">{focus ? <span className="hud-accent">Your code powers this · </span> : "Locked · "}fmt.Println(…)</p>
      ) : (
        <>
          <div className="mb-1.5 flex gap-1.5" role="tablist" aria-label="Console view">
            <TabChip active={tab === "output"} onClick={() => setTab("output")}>
              Output{lines.length > 0 ? ` · ${lines.length}` : ""}
            </TabChip>
            <TabChip active={tab === "data"} onClick={() => setTab("data")}>
              Scene data{keys.length > 0 ? ` · ${keys.length}` : ""}
            </TabChip>
          </div>
          {tab === "output" ? (
            <div className={`hud-log rounded-md bg-black/40 px-2 py-1.5 ${interactive ? "max-h-56 overflow-auto" : "max-h-40 overflow-hidden"}`} role="log" aria-label="Program output">
              {!built ? (
                <p className="hud-muted">Press Run to build and run your program.</p>
              ) : lines.length === 0 ? (
                <p className="hud-muted">{error ? "Nothing was printed before the problem." : "The program ran but printed nothing."}</p>
              ) : (
                lines.map((l, i) => (
                  <div key={i} className="hud-log-line whitespace-pre-wrap break-words">
                    {l === "" ? " " : l}
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className={`rounded-md bg-black/40 px-2 py-1.5 font-mono text-[10.5px] leading-[1.5] ${interactive ? "max-h-56 overflow-auto" : "max-h-40 overflow-hidden"}`}>
              {keys.length === 0 ? (
                <p className="hud-muted">{live ? "No values yet. Send one with scene(\"name\", value)" : "Run your program to see what it sent to the board."}</p>
              ) : (
                <dl className="space-y-0.5">
                  {keys.map(([k, v]) => (
                    <div key={k} className="flex min-w-0 gap-2">
                      <dt className="shrink-0 text-white/45">{k}</dt>
                      <dd className="hud-accent min-w-0 flex-1 break-all" title={safeJson(v)}>
                        {safeJson(v)}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}

// ───────────────────────── chapter 1 ─────────────────────────

/** A strip of slots: `filled` of `total` lit. */
function Slots({ total, filled, tone = "lime" }: { total: number; filled: number; tone?: "lime" | "red" }) {
  const n = Math.max(0, Math.min(total, 24));
  return (
    <div className="flex flex-wrap gap-1" aria-hidden>
      {Array.from({ length: n }, (_, i) => (
        <span key={i} className="h-4 w-5 rounded-[3px] border" style={{ borderColor: i < filled ? (tone === "lime" ? LIME : RED) : "rgba(255,255,255,0.18)", background: i < filled ? (tone === "lime" ? "rgba(197,238,138,0.28)" : "rgba(248,113,113,0.25)") : "transparent" }} />
      ))}
    </div>
  );
}

export function Lanes({ d }: { d: Board }) {
  if (!d.lanes) return <Empty>Send the six summaries with scene(&quot;lanes&quot;, allAtOnce).</Empty>;
  return (
    <div>
      <div className="space-y-1">
        {d.lanes.map((r) => (
          <BarRow key={r.buoy} label={`Buoy ${r.buoy}`} value={r.maxWave} max={WAVE_MAX} text={`${r.count} read · ${r.maxWave} cm`} labelWidth="4rem" />
        ))}
      </div>
      <div className="mt-2 grid grid-cols-2 gap-1.5">
        <Tile label="One clerk" value="6 ticks" />
        <Tile label="Six clerks" value="1 tick" tone="accent" />
      </div>
      {d.same !== undefined && (
        <div className="mt-2">
          <Lamp on={d.same} bad={!d.same} label={d.same ? "Both ways gave the same answers" : "The answers differ: check each goroutine's slot"} />
        </div>
      )}
    </div>
  );
}

export function Stream({ d }: { d: Board }) {
  if (!d.waves) return <Empty>Collect the waves and send them with scene(&quot;waves&quot;, waves).</Empty>;
  return (
    <div>
      <SectionLabel>Buoy 3, as each reading arrives</SectionLabel>
      <div className="flex flex-wrap items-center gap-1">
        {d.waves.map((w, i) => (
          <React.Fragment key={i}>
            <Pill tone="accent">{w}</Pill>
            {i < d.waves!.length - 1 && <span className="text-white/30">→</span>}
          </React.Fragment>
        ))}
        <span className="text-white/30">→</span>
        <Pill tone="mute">closed</Pill>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-1.5">
        <Tile label="Total" value={d.streamTotal ?? dash} unit="cm" />
        <Tile label="Peak" value={d.streamPeak ?? dash} unit="cm" tone="accent" />
      </div>
      {d.stillOpen !== undefined && <div className="mt-2"><Lamp on={!d.stillOpen} label={`v, ok := <-closed gives ok = ${String(d.stillOpen)}`} /></div>}
    </div>
  );
}

export function Waiting({ d }: { d: Board }) {
  const q = d.queue;
  if (!q) return <Empty>Send the inbox numbers with scene(&quot;queue&quot;, ...).</Empty>;
  const cap = q.cap ?? 0;
  return (
    <div>
      <SectionLabel>Inbox, buffer of {cap}</SectionLabel>
      <div className="space-y-1.5">
        <div className="flex items-center gap-2"><span className="w-16 shrink-0 font-mono text-[10px] text-white/55">all sent</span><Slots total={cap} filled={q.filled ?? 0} /><span className="hud-value text-[10.5px]">{q.filled}/{cap}</span></div>
        <div className="flex items-center gap-2"><span className="w-16 shrink-0 font-mono text-[10px] text-white/55">two taken</span><Slots total={cap} filled={q.waiting ?? 0} /><span className="hud-value text-[10.5px]">{q.waiting}/{cap}</span></div>
      </div>
      {d.collected && (
        <div className="mt-2.5">
          <SectionLabel>Results shelf, sorted by buoy</SectionLabel>
          <div className="space-y-1">
            {d.collected.map((s) => <BarRow key={s.buoy} label={`Buoy ${s.buoy}`} value={s.maxWave} max={WAVE_MAX} text={`${s.maxWave} cm`} labelWidth="4rem" />)}
          </div>
        </div>
      )}
    </div>
  );
}

export function Switchboard({ d }: { d: Board }) {
  const s = d.shed;
  if (!s && !d.heard) return <Empty>Send scene(&quot;shed&quot;, ...) and scene(&quot;heard&quot;, heard).</Empty>;
  const total = (s?.accepted ?? 0) + (s?.shed ?? 0);
  return (
    <div className="space-y-2.5">
      {s && (
        <div>
          <SectionLabel>Shelf of {s.accepted ?? 0}: readings offered in order</SectionLabel>
          <div className="flex flex-wrap gap-1">
            {Array.from({ length: Math.min(total, 24) }, (_, i) => {
              const turnedAway = (s.seqs ?? []).includes(i + 1);
              return <Pill key={i} tone={turnedAway ? "danger" : "accent"} title={turnedAway ? "turned away: default ran" : "accepted"}>#{i + 1}{turnedAway ? " ✕" : ""}</Pill>;
            })}
          </div>
          <p className="hud-muted mt-1 text-[10.5px]">default turned away {s.shed ?? 0}</p>
        </div>
      )}
      {d.heard && (
        <div>
          <SectionLabel>Listener heard, then stop</SectionLabel>
          <div className="flex flex-wrap items-center gap-1">
            {d.heard.map((w, i) => <Pill key={i} tone="accent">{w}</Pill>)}
            <Pill tone="warning">stop</Pill>
          </div>
        </div>
      )}
    </div>
  );
}

// ───────────────────────── chapter 2 ─────────────────────────

export function RaceReplay({ d }: { d: Board }) {
  if (!d.race) return <Empty>Send the replays with scene(&quot;race&quot;, race).</Empty>;
  return (
    <div>
      <div className="space-y-1">
        {d.race.map((r) => {
          const ok = r.result === 2;
          return (
            <div key={r.order} className="flex items-center gap-2">
              <div className="flex gap-[3px]" title={`schedule ${r.order}`}>
                {r.order.split("").map((c, i) => (
                  <span key={i} className="grid h-5 w-5 place-items-center rounded-[4px] font-mono text-[10px] font-semibold text-[#0a0a0a]" style={{ background: c === "A" ? "#7dd3fc" : "#fcd34d" }}>{c}</span>
                ))}
              </div>
              <span className="text-white/30">→</span>
              <Pill tone={ok ? "accent" : "danger"} solid={!ok}>{r.result} on the board</Pill>
              {!ok && <span className="truncate text-[10px] text-[#fca5a5]">one update lost</span>}
            </div>
          );
        })}
      </div>
      <p className="hud-muted mt-2 text-[10.5px]">
        <span style={{ color: "#7dd3fc" }}>A</span> and <span style={{ color: "#fcd34d" }}>B</span> each load, then store. Two clerks should make it 2.
        {d.lostRuns !== undefined && <> <span className="hud-danger">{d.lostRuns} of {d.race.length}</span> schedules lose an update.</>}
      </p>
    </div>
  );
}

export function GuardedTally({ d }: { d: Board }) {
  const t = d.tally;
  if (!t?.perBuoy) return <Empty>Send the totals with scene(&quot;tally&quot;, ...).</Empty>;
  return (
    <div>
      <div className="space-y-1">
        {FLEET.map((b) => <BarRow key={b} label={`Buoy ${b}`} value={t.perBuoy?.[String(b)] ?? 0} max={200} text={String(t.perBuoy?.[String(b)] ?? 0)} labelWidth="4rem" />)}
      </div>
      <div className="mt-2 grid grid-cols-2 gap-1.5">
        <Tile label="Tally says" value={t.waveSum ?? dash} />
        <Tile label="Plain loop says" value={t.expected ?? dash} />
      </div>
      {t.match !== undefined && <div className="mt-2"><Lamp on={t.match} bad={!t.match} label={t.match ? "Mutex: no update lost" : "Totals differ"} /></div>}
    </div>
  );
}

export function Calibration({ d }: { d: Board }) {
  const c = d.calibration;
  if (!c) return <Empty>Send the numbers with scene(&quot;calibration&quot;, ...).</Empty>;
  const workers = c.workers ?? 0;
  return (
    <div>
      <div className="flex items-center gap-2">
        <div className="flex flex-wrap gap-1" aria-label={`${workers} workers`}>
          {Array.from({ length: Math.min(workers, 12) }, (_, i) => <span key={i} className="grid h-5 w-5 place-items-center rounded-full border border-white/25 font-mono text-[9px] text-white/70">{i + 1}</span>)}
        </div>
        <span className="text-white/30">⇒</span>
        <Pill tone={c.loads === 1 ? "accent" : "danger"}>table loaded {c.loads ?? dash}×</Pill>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-1.5">
        <Tile label="Workers" value={workers || dash} />
        <Tile label="Table loads" value={c.loads ?? dash} tone={c.loads === 1 ? "accent" : "danger"} />
        <Tile label="Atomic count" value={c.seen ?? dash} tone="accent" />
      </div>
    </div>
  );
}

export function PeakKeeper({ d }: { d: Board }) {
  if (!d.peaks) return <Empty>Send the keeper&apos;s map with scene(&quot;peaks&quot;, peaks).</Empty>;
  const peaks = d.peaks;
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-1.5"><Pill tone="mute">6 senders</Pill><span className="text-white/30">→</span><Pill tone="accent" solid>keeper owns the map</Pill></div>
      <div className="space-y-1">
        {FLEET.map((b) => <BarRow key={b} label={`Buoy ${b}`} value={peaks[String(b)] ?? 0} max={WAVE_MAX} text={`${peaks[String(b)] ?? dash} cm`} labelWidth="4rem" />)}
      </div>
    </div>
  );
}

// ───────────────────────── chapter 3 ─────────────────────────

function Stage({ name, count, lit }: { name: string; count: React.ReactNode; lit?: boolean }) {
  return (
    <div className={`min-w-0 flex-1 rounded-md border px-2 py-1.5 ${lit ? "border-[#c5ee8a]/40 bg-[#c5ee8a]/[0.06]" : "border-white/15"}`}>
      <p className="hud-label truncate">{name}</p>
      <p className="hud-value text-[13px] tabular-nums">{count}</p>
    </div>
  );
}

export function StageLine({ d }: { d: Board }) {
  const p = d.pipeline;
  if (!p) return <Empty>Send the numbers with scene(&quot;pipeline&quot;, ...).</Empty>;
  const total = Math.min(p.in ?? 0, 60);
  const storm = new Set(p.seqs ?? []);
  return (
    <div>
      <div className="flex items-stretch gap-1.5">
        <Stage name="Source" count={p.in ?? dash} />
        <span className="self-center text-white/30">→</span>
        <Stage name="Calibrate" count={p.in ?? dash} />
        <span className="self-center text-white/30">→</span>
        <Stage name={`Wave ≥ ${p.limit ?? dash}`} count={p.out ?? dash} lit />
      </div>
      <SectionLabel>Buoy 4&apos;s readings: storm-sized ones lit</SectionLabel>
      <div className="flex flex-wrap gap-[3px]" aria-hidden>
        {Array.from({ length: total }, (_, i) => <span key={i} className="h-3 w-3 rounded-[2px]" style={{ background: storm.has(i + 1) ? LIME : "rgba(255,255,255,0.12)" }} />)}
      </div>
      <p className="hud-muted mt-1.5 text-[10.5px]">First storm reading: temperature {p.raw ?? dash} raw, <span className="hud-accent">{p.calibrated ?? dash}</span> calibrated (tenths of a degree).</p>
    </div>
  );
}

export function PoolCard({ d }: { d: Board }) {
  const p = d.pool;
  if (!p?.summaries) return <Empty>Send the pool&apos;s answers with scene(&quot;pool&quot;, ...).</Empty>;
  const shades = ["#c5ee8a", "#a3d96f", "#86efac", "#6ee7b7", "#5eead4", "#7dd3fc"];
  return (
    <div>
      <div className="mb-2 flex items-center gap-1.5">
        <Pill tone="mute">{p.jobs ?? dash} jobs</Pill><span className="text-white/30">→</span>
        <div className="flex gap-1">{Array.from({ length: Math.min(p.workers ?? 0, 8) }, (_, i) => <span key={i} className="grid h-5 w-5 place-items-center rounded-full border border-white/25 font-mono text-[9px] text-white/70">{i + 1}</span>)}</div>
        <span className="text-white/30">→</span><Pill tone="accent">job order</Pill>
      </div>
      <div className="grid grid-cols-4 gap-1">
        {p.summaries.map((s, i) => (
          <div key={i} className="min-w-0 rounded-md bg-white/[0.04] px-1.5 py-1" title={`job ${i}: buoy ${s.buoy}, ${s.count} readings, max wave ${s.maxWave}`}>
            <p className="font-mono text-[9.5px] text-white/50">#{i} · B{s.buoy}</p>
            <p className="font-mono text-[11px] tabular-nums" style={{ color: shades[(s.buoy - 1) % shades.length] }}>{s.count} / {s.maxWave}</p>
          </div>
        ))}
      </div>
      {p.match !== undefined && <div className="mt-2"><Lamp on={p.match} bad={!p.match} label={p.match ? "Same as one-at-a-time" : "Answers differ from the plain loop"} /></div>}
    </div>
  );
}

export function FanCard({ d }: { d: Board }) {
  const f = d.fan;
  if (!f) return <Empty>Send the numbers with scene(&quot;fan&quot;, ...).</Empty>;
  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        <Pill tone="mute">{f.streams ?? dash} streams</Pill><span className="text-white/30">⇒ merge ⇒</span>
        <Pill tone="mute">{f.workers ?? dash} workers</Pill><span className="text-white/30">⇒ merge ⇒</span><Pill tone="accent">{f.total ?? dash} readings</Pill>
      </div>
      <div className="space-y-1">
        {FLEET.map((b) => <BarRow key={b} label={`Buoy ${b}`} value={f.perBuoy?.[String(b)] ?? 0} max={30} text={String(f.perBuoy?.[String(b)] ?? dash)} labelWidth="4rem" />)}
      </div>
      <p className="hud-muted mt-1.5 text-[10.5px]">Arrival order is not decided, so the list is sorted before it is shown.</p>
    </div>
  );
}

function GanttSvg({ run }: { run: SimRun }) {
  const unit = Math.max(12, Math.min(26, Math.floor(300 / Math.max(run.makespan, 1))));
  const rowH = 24;
  const labelW = 26;
  const w = labelW + Math.max(run.makespan, 1) * unit + 4;
  const depthMax = Math.max(run.peakQueue, 1);
  const chartH = run.workers * rowH + 6;
  const h = chartH + 34;
  const hue = (j: number) => ["#c5ee8a", "#86efac", "#5eead4", "#7dd3fc"][j % 4];
  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} role="img" aria-label={`Ticks chart for ${run.workers} workers`} style={{ minWidth: "100%" }}>
        {Array.from({ length: run.workers }, (_, wk) => (
          <g key={wk}>
            <text x={0} y={wk * rowH + 14} fontSize="9" fill="rgba(255,255,255,0.55)" fontFamily="monospace">W{wk}</text>
            <rect x={labelW} y={wk * rowH + 2} width={run.makespan * unit} height={rowH - 4} rx="3" fill="rgba(255,255,255,0.05)" />
          </g>
        ))}
        {run.slots.map((s) => (
          <g key={s.job}>
            <title>{`job ${s.job}: ticks ${s.start} to ${s.end} on worker ${s.worker}`}</title>
            <rect x={labelW + s.start * unit + 0.5} y={s.worker * rowH + 2} width={Math.max((s.end - s.start) * unit - 1, 1)} height={rowH - 4} rx="3" fill={hue(s.job)} opacity="0.85" />
            <text x={labelW + s.start * unit + 4} y={s.worker * rowH + 14} fontSize="9" fill="#0a0a0a" fontFamily="monospace">{s.job}</text>
          </g>
        ))}
        {run.depth.map((dp, t) => (
          <rect key={t} x={labelW + t * unit + 1} y={chartH + 6 + (24 - (dp / depthMax) * 24)} width={unit - 2} height={Math.max((dp / depthMax) * 24, dp > 0 ? 2 : 0)} rx="1.5" fill={AMBER} opacity="0.8" />
        ))}
        <text x={0} y={chartH + 22} fontSize="8" fill="rgba(255,255,255,0.45)" fontFamily="monospace">queue</text>
      </svg>
    </div>
  );
}

export function TickChart({ d }: { d: Board }) {
  const runs = d.ticks?.runs;
  const [pick, setPick] = useState<number | null>(null);
  if (!runs || runs.length === 0) return <Empty>Send the simulated runs with scene(&quot;ticks&quot;, ...).</Empty>;
  const bestIdx = Math.max(0, runs.findIndex((r) => r.workers === d.ticks?.best));
  const idx = Math.min(pick ?? bestIdx, runs.length - 1);
  const run = runs[idx];
  const util = d.ticks?.util?.[idx];
  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-1.5" role="tablist" aria-label="Number of workers">
        {runs.map((r, i) => <TabChip key={i} active={i === idx} onClick={() => setPick(i)}>{r.workers} worker{r.workers === 1 ? "" : "s"}{r.workers === d.ticks?.best ? " ★" : ""}</TabChip>)}
      </div>
      <GanttSvg run={run} />
      <p className="hud-muted mt-1 text-[10px]">Coloured blocks are jobs (busy). Gaps are idle. Amber bars are the waiting line at each tick.</p>
      <div className="mt-2 grid grid-cols-3 gap-1.5">
        <Tile label="Done at" value={run.makespan} unit="ticks" />
        <Tile label="Busy" value={util ?? dash} unit="%" tone={util !== undefined && util >= 90 ? "accent" : "warning"} />
        <Tile label="Peak queue" value={run.peakQueue} />
      </div>
    </div>
  );
}

// ───────────────────────── chapter 4 ─────────────────────────

export function CancelCard({ d }: { d: Board }) {
  const c = d.cancel;
  if (!c) return <Empty>Send the numbers with scene(&quot;cancel&quot;, ...).</Empty>;
  const asked = c.asked ?? 0;
  const took = c.took ?? 0;
  return (
    <div>
      <div className="flex flex-wrap items-center gap-1">
        {(c.waves ?? []).map((w, i) => <Pill key={i} tone="accent">{w}</Pill>)}
        <Pill tone="danger" solid>cancel()</Pill>
        <span className="min-w-0 flex-1 rounded-md border border-dashed border-white/20 px-2 py-0.5 text-center font-mono text-[10px] text-white/45">{asked > took ? `${(asked - took).toLocaleString("en-US")} never produced` : "nothing left"}</span>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-1.5">
        <Tile label="Took" value={took} unit={`of ${asked.toLocaleString("en-US")}`} tone="accent" />
        <Tile label="ctx.Err()" value={c.reason ?? dash} tone="warning" />
      </div>
      {c.stopped !== undefined && <div className="mt-2"><Lamp on={c.stopped} label={c.stopped ? "Producer stopped (the drain loop ended)" : "Producer may still be running"} /></div>}
    </div>
  );
}

export function DeadlineBoard({ d }: { d: Board }) {
  const s = d.deadlines;
  if (!s?.statuses) return <Empty>Send the report with scene(&quot;deadlines&quot;, ...).</Empty>;
  return (
    <div>
      <div className="space-y-1">
        {s.statuses.map((st, i) => {
          const ok = st === "ok";
          return (
            <div key={i} className="flex items-center gap-2">
              <span className="w-14 shrink-0 font-mono text-[10.5px] text-white/65">Buoy {i + 1}</span>
              <div className="hud-bar h-2 min-w-0 flex-1"><span style={{ width: ok ? "18%" : "100%", background: ok ? undefined : RED, opacity: ok ? 1 : 0.55 }} /></div>
              <Pill tone={ok ? "accent" : "danger"} solid={!ok}>{st}</Pill>
            </div>
          );
        })}
      </div>
      <p className="hud-muted mt-1.5 text-[10.5px]">Each poll had its own {s.limitMs ?? dash} ms limit. Answers arrive at once; silence runs the whole limit.</p>
      {s.silentErr && <Code className="mt-1.5">{s.silentErr}</Code>}
    </div>
  );
}

export function GroupCard({ d }: { d: Board }) {
  const g = d.group;
  if (!g) return <Empty>Send the report with scene(&quot;group&quot;, ...).</Empty>;
  const tasks = g.tasks ?? 0;
  const cancelled = g.cancelled ?? 0;
  return (
    <div>
      <SectionLabel>Five jobs, one failure</SectionLabel>
      <div className="flex flex-wrap gap-1">
        {Array.from({ length: Math.min(tasks, 12) }, (_, i) => {
          const failedAt = (g.first ?? "").match(/buoy (\d+)/)?.[1];
          const isFirst = failedAt !== undefined && Number(failedAt) === i + 1;
          return <Pill key={i} tone={isFirst ? "danger" : i < tasks && cancelled > 0 ? "warning" : "plain"} solid={isFirst}>job {i}{isFirst ? " failed" : cancelled > 0 ? " cancelled" : ""}</Pill>;
        })}
      </div>
      <div className="mt-2 grid grid-cols-2 gap-1.5">
        <Tile label="Wait returned" value={g.first ?? dash} tone="danger" />
        <Tile label="Stopped by cancel" value={cancelled} tone="warning" />
      </div>
      {g.joined && (
        <div className="mt-2">
          <SectionLabel>Errors() in launch order</SectionLabel>
          <Code>{g.joined}</Code>
        </div>
      )}
    </div>
  );
}

export function ShutdownCard({ d }: { d: Board }) {
  const s = d.shutdown;
  if (!s) return <Empty>Send the report with scene(&quot;shutdown&quot;, report).</Empty>;
  const lost = (s.accepted ?? 0) - (s.processed ?? 0);
  return (
    <div>
      <div className="grid grid-cols-3 gap-1.5">
        <Tile label="Accepted" value={s.accepted ?? dash} />
        <Tile label="Processed" value={s.processed ?? dash} tone="accent" />
        <Tile label="Lost" value={s.accepted !== undefined && s.processed !== undefined ? lost : dash} tone={lost === 0 ? "accent" : "danger"} />
      </div>
      <div className="mt-2 space-y-1">
        {FLEET.map((b) => <BarRow key={b} label={`Buoy ${b}`} value={s.perBuoy?.[String(b)] ?? 0} max={10} text={String(s.perBuoy?.[String(b)] ?? dash)} labelWidth="4rem" />)}
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <Lamp on={s.clean} bad={s.clean === false} label={s.clean ? "Clean shutdown: queue drained" : "Drain deadline hit"} />
        <span className="hud-muted text-[10.5px]">tallest wave {s.maxWave ?? dash} cm</span>
      </div>
    </div>
  );
}
