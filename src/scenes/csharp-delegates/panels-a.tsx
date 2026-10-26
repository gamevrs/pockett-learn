"use client";

import React from "react";
import { clamp, fmtNum, hasValues, type Desk } from "./data";
import { C, dash, Empty, Lamp } from "./ui";

/**
 * Board panels for lessons 1 to 9 of the Footlight desk. Each one draws only from its slice of the
 * `Desk` model, tolerates missing or odd values and never throws. Lime marks values the learner's
 * code produced, amber is the "wrong on purpose" demonstrations and cautions, red is failure.
 */

const mono = "var(--font-mono)";
const delay = (i: number) => ({ "--i": i }) as React.CSSProperties;
const uniq = <T,>(items: T[]) => [...new Set(items)];

function SectionLabel({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="mb-1 mt-3 flex min-w-0 items-baseline justify-between gap-2 first:mt-0">
      <span className="hud-label truncate">{children}</span>
      {right && <span className="hud-value hud-muted shrink-0 text-[10px]">{right}</span>}
    </div>
  );
}

function Pill({ tone = "plain", children, dashed }: { tone?: "plain" | "accent" | "warning" | "danger" | "ghost"; children: React.ReactNode; dashed?: boolean }) {
  const look =
    tone === "accent"
      ? "border-[#c5ee8a]/50 bg-[#c5ee8a]/10 text-[#d3f3a4]"
      : tone === "warning"
        ? "border-[#fbbf24]/50 bg-[#fbbf24]/10 text-[#fbbf24]"
        : tone === "danger"
          ? "border-[#f87171]/50 bg-[#f87171]/10 text-[#f87171]"
          : tone === "ghost"
            ? "border-white/10 text-white/35"
            : "border-white/15 bg-white/[0.04] text-white/75";
  return (
    <span className={`inline-flex h-5 max-w-full items-center truncate rounded-full border px-2 font-mono text-[10px] ${dashed ? "border-dashed" : ""} ${look}`}>{children}</span>
  );
}

// ───────────────────────── lesson 1: cue sheet ─────────────────────────

export function CueSheet({ d }: { d: Desk["cues"] }) {
  if (!hasValues(d)) return <Empty>Nothing yet. Send cueSheet, cueLabel and brightness with Desk.Show.</Empty>;
  const sheet = d.sheet ?? [];
  return (
    <div>
      {d.label !== undefined && (
        <div className="overflow-hidden rounded-md border border-white/15 bg-white/[0.03]">
          <div
            className="h-2.5"
            aria-hidden
            style={{ background: "repeating-linear-gradient(-45deg, rgba(255,255,255,0.78) 0 8px, rgba(10,10,10,0.9) 8px 16px)" }}
          />
          <div className="flex min-w-0 items-center justify-between gap-2 px-2.5 py-2">
            <span className="hud-value hud-accent min-w-0 truncate text-[20px] leading-none tracking-wide">{d.label}</span>
            {d.labelerType && <Pill tone="accent">{d.labelerType}</Pill>}
          </div>
        </div>
      )}

      <SectionLabel right={d.sheet ? `${sheet.length} stored delegates` : undefined}>Cue sheet</SectionLabel>
      {d.sheet === undefined ? (
        <p className="hud-muted text-[11px]">Send cueSheet to list the named cues.</p>
      ) : sheet.length === 0 ? (
        <p className="hud-muted text-[11px]">The sheet is empty.</p>
      ) : (
        <ol className="space-y-1">
          {sheet.map((name, i) => (
            <li key={`${name}-${i}`} className="fl-pop flex min-w-0 items-center gap-2 rounded-md bg-white/[0.04] px-2 py-1" style={delay(i)}>
              <svg viewBox="0 0 10 10" className="h-2.5 w-2.5 shrink-0" aria-hidden>
                <path d="M2 1 L9 5 L2 9 Z" fill={C.lime} />
              </svg>
              <span className="hud-value w-3 shrink-0 text-right text-[10px] text-white/40">{i + 1}</span>
              <span className="hud-value min-w-0 flex-1 truncate text-[12px]">{name}</span>
              <span className="hud-label shrink-0 !text-[9px]">Action</span>
            </li>
          ))}
        </ol>
      )}

      {(d.bright !== undefined || d.dim !== undefined) && (
        <>
          <SectionLabel>Tests stored as delegates</SectionLabel>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <span className="flex items-center gap-1.5 font-mono text-[11px] text-white/75">
              <Lamp on={d.bright === true} size={8} />
              bright(85)
              <span className="text-white/40">{d.bright === undefined ? dash : String(d.bright)}</span>
            </span>
            <span className="flex items-center gap-1.5 font-mono text-[11px] text-white/75">
              <Lamp on={d.dim === true} size={8} />
              dim(20)
              <span className="text-white/40">{d.dim === undefined ? dash : String(d.dim)}</span>
            </span>
          </div>
        </>
      )}
    </div>
  );
}

// ───────────────────────── lesson 2: faders ─────────────────────────

export function Faders({ d }: { d: Desk["faders"] }) {
  if (!hasValues(d)) return <Empty>Nothing yet. Send faders with Desk.Show: master, levels and brokenLevels.</Empty>;
  const levels = (d.levels ?? []).slice(0, 8);
  const broken = (d.brokenLevels ?? []).slice(0, 8);
  const same = broken.length > 1 && broken.every((v) => v === broken[0]);
  const n = Math.max(levels.length, 1);
  const slot = 220 / n;
  const master = d.master === undefined ? undefined : clamp(d.master, 0, 100);
  return (
    <div>
      <SectionLabel right={levels.length > 0 ? "one captured copy per pass" : undefined}>Faders</SectionLabel>
      {levels.length === 0 ? (
        <p className="hud-muted text-[11px]">Send levels to move the faders.</p>
      ) : (
        <svg viewBox="0 0 220 120" className="block w-full" role="img" aria-label={`Fader levels: ${levels.join(", ")}`}>
          {[0, 25, 50, 75, 100].map((t) => (
            <g key={t}>
              <path d={`M0 ${88 - t * 0.8} H220`} stroke="rgba(255,255,255,0.07)" strokeDasharray={t % 50 === 0 ? undefined : "2 4"} />
              {t % 50 === 0 && (
                <text x="218" y={86 - t * 0.8} textAnchor="end" fontSize="7" fontFamily={mono} fill="rgba(255,255,255,0.3)">
                  {t}
                </text>
              )}
            </g>
          ))}
          {levels.map((raw, i) => {
            const level = clamp(raw, 0, 100);
            const cx = slot * (i + 0.5);
            const h = level * 0.8;
            return (
              <g key={i}>
                <rect x={cx - 3} y="8" width="6" height="80" rx="3" fill="rgba(255,255,255,0.1)" />
                <rect className="fl-rise" style={{ ...delay(i), transformBox: "fill-box" }} x={cx - 3} y={88 - h} width="6" height={h} rx="3" fill={C.lime} opacity=".55" />
                <rect className="fl-pop" style={delay(i)} x={cx - 10} y={88 - h - 3.5} width="20" height="7" rx="2.5" fill={C.limeSoft} />
                <text x={cx} y="102" textAnchor="middle" fontSize="8" fontFamily={mono} fill="rgba(255,255,255,0.5)">
                  CH{i + 1}
                </text>
                <text x={cx} y="114" textAnchor="middle" fontSize="9" fontFamily={mono} fill={C.limeSoft}>
                  {fmtNum(raw)}
                </text>
              </g>
            );
          })}
        </svg>
      )}

      {broken.length > 0 && (
        <>
          <SectionLabel>Shared loop variable</SectionLabel>
          <div className="flex gap-1.5">
            {broken.map((v, i) => (
              <div key={i} className="min-w-0 flex-1 rounded-md border border-dashed border-[#fbbf24]/50 px-1.5 py-1">
                <div className="flex items-baseline justify-between gap-1">
                  <span className="hud-label !text-[9px]">CH{i + 1}</span>
                  <span className="hud-value text-[11px] text-[#fbbf24]">{fmtNum(v)}</span>
                </div>
                <div className="hud-bar mt-1 !h-1">
                  <span style={{ width: `${clamp(v, 0, 100)}%`, background: C.amber }} />
                </div>
              </div>
            ))}
          </div>
          {same && <p className="mt-1 text-[10.5px] leading-snug text-[#fbbf24]/90">All {broken.length} closures saw the same loop variable, so every fader reads {fmtNum(broken[0])}.</p>}
        </>
      )}

      {master !== undefined && (
        <>
          <SectionLabel right={`${fmtNum(master)}%`}>Master (captured variable)</SectionLabel>
          <div className="hud-bar !h-2">
            <span style={{ width: `${master}%` }} />
          </div>
        </>
      )}
    </div>
  );
}

// ───────────────────────── lesson 3: sound chain ─────────────────────────

function CurveBar({ label, value, tone }: { label: string; value: number | undefined; tone?: "accent" }) {
  const v = value === undefined ? 0 : clamp(value, 0, 100);
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-1">
      <span className="hud-value text-[10px]" style={{ color: tone === "accent" ? C.limeSoft : undefined }}>
        {value === undefined ? dash : fmtNum(value, 1)}
      </span>
      <div className="relative h-14 w-full max-w-[2.5rem] overflow-hidden rounded-sm bg-white/[0.06]">
        <div className="fl-rise absolute inset-x-0 bottom-0 rounded-sm" style={{ height: `${v}%`, background: C.lime, opacity: 0.8 }} />
      </div>
      <span className="hud-label max-w-full truncate !text-[9px]" title={label}>
        {label}
      </span>
    </div>
  );
}

export function SoundChain({ d }: { d: Desk["chain"] }) {
  if (!hasValues(d)) return <Empty>Nothing yet. Send chain with Desk.Show: stageNames, trail, samples and fade.</Empty>;
  const names = d.stageNames ?? [];
  const trail = d.trail ?? [];
  const samples = (d.samples ?? []).slice(0, 5);
  const top = Math.max(100, ...samples.flatMap((s) => [s.input, s.output]), ...trail);
  const fade = d.fade;
  const val = (i: number) => (trail[i] === undefined ? dash : fmtNum(trail[i]));
  return (
    <div>
      <SectionLabel right={names.length > 0 ? `${names.length} composed stages` : undefined}>Signal chain</SectionLabel>
      {names.length === 0 ? (
        trail.length > 0 ? (
          <p className="hud-value text-[12px] text-[#d3f3a4]">{trail.map(fmtNum).join(" → ")}</p>
        ) : (
          <p className="hud-muted text-[11px]">Send stageNames to draw the chain.</p>
        )
      ) : (
        <div className="flex items-stretch gap-0.5" role="img" aria-label={`Chain: ${names.join(", ")}. Values ${trail.join(", ")}`}>
          <span className="hud-value grid w-7 shrink-0 place-items-center text-[11px] text-[#d3f3a4]">{val(0)}</span>
          {names.map((name, i) => (
            <React.Fragment key={`${name}-${i}`}>
              <svg viewBox="0 0 12 10" className="w-3 shrink-0 self-center" aria-hidden>
                <path d="M1 5 H9 M6 2 L10 5 L6 8" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <div className="fl-pop flex min-w-0 flex-1 items-center justify-center rounded-md border border-white/15 bg-white/[0.04] px-1 py-1.5 text-center" style={delay(i)}>
                <span className="text-[10px] leading-tight text-white/80">{name}</span>
              </div>
              <svg viewBox="0 0 12 10" className="w-3 shrink-0 self-center" aria-hidden>
                <path d="M1 5 H9 M6 2 L10 5 L6 8" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="hud-value grid w-7 shrink-0 place-items-center text-[11px] text-[#d3f3a4]">{val(i + 1)}</span>
            </React.Fragment>
          ))}
        </div>
      )}
      {trail.length > 0 && names.length > 0 && <p className="hud-muted mt-1 text-[10px]">The value after each stage, starting from {val(0)}.</p>}

      {samples.length > 0 && (
        <>
          <SectionLabel>Samples through the chain</SectionLabel>
          <div className="space-y-1.5">
            {samples.map((s, i) => (
              <div key={i} className="flex min-w-0 items-center gap-2">
                <span className="hud-value w-16 shrink-0 text-[11px] text-white/80">
                  {fmtNum(s.input)} → <span className={s.output === 0 ? "text-white/40" : "text-[#d3f3a4]"}>{fmtNum(s.output)}</span>
                </span>
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="hud-bar !h-1 hud-bar-neutral">
                    <span style={{ width: `${clamp((s.input / top) * 100, 0, 100)}%` }} />
                  </div>
                  <div className="hud-bar !h-1">
                    <span style={{ width: `${clamp((s.output / top) * 100, 0, 100)}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {fade && hasValues(fade) && (
        <>
          <SectionLabel right="halfway through a 0 to 100 fade">Fade curves</SectionLabel>
          <div className="flex gap-2">
            <CurveBar label="linear" value={fade.linear} />
            <CurveBar label="ease-in" value={fade.easeIn} />
            <CurveBar label={fade.steppedName ?? "stepped"} value={fade.stepped} />
          </div>
        </>
      )}
    </div>
  );
}

// ───────────────────────── lesson 4: GO button ─────────────────────────

type HandlerState = "ran" | "failed" | "skipped";

function HandlerChip({ name, state }: { name: string; state: HandlerState }) {
  const look =
    state === "ran"
      ? "border-[#c5ee8a]/50 bg-[#c5ee8a]/10 text-[#d3f3a4]"
      : state === "failed"
        ? "border-[#f87171]/60 bg-[#f87171]/10 text-[#f87171]"
        : "border-dashed border-white/12 text-white/30";
  return (
    <span className={`inline-flex h-6 items-center gap-1 rounded-md border px-2 font-mono text-[10.5px] ${look}`} title={state === "skipped" ? "never reached" : state}>
      {state === "failed" && (
        <svg viewBox="0 0 10 10" className="h-2.5 w-2.5" aria-hidden>
          <path d="M2 2 L8 8 M8 2 L2 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      )}
      {name}
    </span>
  );
}

export function GoButton({ d }: { d: Desk["go"] }) {
  if (!hasValues(d)) return <Empty>Nothing yet. Send go with Desk.Show: handlers, naive, safe and failures.</Empty>;
  const handlers = d.handlers ?? uniq([...(d.naive ?? []), ...(d.safe ?? [])]);
  const failures = d.failures ?? [];
  const failedNames = new Set(failures.map((f) => f.split(":")[0].trim()));
  const firstFailed = handlers.findIndex((h) => failedNames.has(h));
  const naive = new Set(d.naive ?? []);
  const safe = new Set(d.safe ?? []);
  const naiveState = (h: string, i: number): HandlerState => (naive.has(h) ? "ran" : firstFailed === i ? "failed" : "skipped");
  const safeState = (h: string): HandlerState => (safe.has(h) ? "ran" : failedNames.has(h) ? "failed" : "skipped");
  return (
    <div>
      <div className="flex items-center gap-3">
        <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full border-2 border-[#c5ee8a]/70 bg-[#c5ee8a]/10" style={{ boxShadow: "0 0 18px rgba(197,238,138,0.18), inset 0 0 12px rgba(197,238,138,0.12)" }}>
          <span className="hud-value text-[15px] font-semibold tracking-widest text-[#d3f3a4]">GO</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="hud-label mb-1">Invocation list{handlers.length > 0 ? ` · ${handlers.length}` : ""}</p>
          {handlers.length === 0 ? (
            <p className="hud-muted text-[11px]">Send handlers to list who is listening.</p>
          ) : (
            <div className="flex flex-wrap items-center gap-1">
              {handlers.map((h, i) => (
                <React.Fragment key={`${h}-${i}`}>
                  {i > 0 && <span className="text-[10px] text-white/30">+=</span>}
                  <span className="rounded-md border border-white/15 bg-white/[0.04] px-1.5 py-0.5 font-mono text-[10.5px] text-white/75">{h}</span>
                </React.Fragment>
              ))}
            </div>
          )}
        </div>
      </div>

      {d.naive !== undefined && (
        <>
          <SectionLabel right="stops at the first throw">Plain call</SectionLabel>
          <div className="flex flex-wrap gap-1">
            {handlers.map((h, i) => (
              <HandlerChip key={`${h}-${i}`} name={h} state={naiveState(h, i)} />
            ))}
          </div>
        </>
      )}
      {d.safe !== undefined && (
        <>
          <SectionLabel right="one try per handler">Safe broadcast</SectionLabel>
          <div className="flex flex-wrap gap-1">
            {handlers.map((h, i) => (
              <HandlerChip key={`${h}-${i}`} name={h} state={safeState(h)} />
            ))}
          </div>
        </>
      )}
      {failures.length > 0 && (
        <ul className="mt-2 space-y-0.5">
          {failures.map((f, i) => (
            <li key={i} className="truncate font-mono text-[10.5px] text-[#f87171]" title={f}>
              {f}
            </li>
          ))}
        </ul>
      )}
      {d.lastWins !== undefined && (
        <p className="mt-2 rounded-md bg-white/[0.04] px-2 py-1.5 text-[10.5px] leading-snug text-white/65">
          A direct call on a multicast <span className="font-mono">Func</span> keeps only the last return, <span className="hud-value text-[#d3f3a4]">{fmtNum(d.lastWins)}</span>
          {d.everyReturn && d.everyReturn.length > 0 && (
            <>
              . Walking the list returns every one: <span className="hud-value text-[#d3f3a4]">{d.everyReturn.map((v) => fmtNum(v)).join(", ")}</span>
            </>
          )}
          .
        </p>
      )}
    </div>
  );
}

// ───────────────────────── lesson 5: event bus (hero) ─────────────────────────

const BUS_W = 300;
const spread = (count: number, top: number, bottom: number): number[] =>
  count === 1 ? [(top + bottom) / 2] : Array.from({ length: count }, (_, i) => top + ((bottom - top) * i) / (count - 1));

export function EventBus({ d, generation }: { d: Desk["bus"]; generation: number }) {
  if (!hasValues(d)) return <Empty>Nothing yet. Send bus with Desk.Show: log and listeners.</Empty>;
  const log = d.log ?? [];
  const pubsAll = uniq(log.map((r) => r.publisher));
  const eventsAll = uniq(log.map((r) => r.eventName));
  const subsAll = uniq(log.map((r) => r.subscriber));
  const pubs = pubsAll.slice(0, 3);
  const events = eventsAll.slice(0, 3);
  const subs = subsAll.slice(0, 5);
  const extra = pubsAll.length - pubs.length + (eventsAll.length - events.length) + (subsAll.length - subs.length);

  const height = Math.max(110, 30 + Math.max(subs.length, 1) * 36);
  const pubY = spread(Math.max(pubs.length, 1), 40, height - 34);
  const evY = spread(Math.max(events.length, 1), 34, height - 22);
  const subY = spread(Math.max(subs.length, 1), 34, height - 22);

  const pubX = 36;
  const evX = 136;
  const subX = 206;
  const link = (x1: number, y1: number, x2: number, y2: number) => {
    const mx = (x1 + x2) / 2;
    return `M${x1} ${y1} C${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`;
  };

  const subCount = new Map<string, number>();
  const pubEvent = new Map<string, number>();
  const evSub = new Map<string, number>();
  for (const r of log) {
    subCount.set(r.subscriber, (subCount.get(r.subscriber) ?? 0) + 1);
    pubEvent.set(`${r.publisher}\n${r.eventName}`, (pubEvent.get(`${r.publisher}\n${r.eventName}`) ?? 0) + 1);
    evSub.set(`${r.eventName}\n${r.subscriber}`, (evSub.get(`${r.eventName}\n${r.subscriber}`) ?? 0) + 1);
  }

  type Edge = { id: string; path: string; count: number };
  const edges: Edge[] = [];
  pubs.forEach((p, pi) =>
    events.forEach((e, ei) => {
      const count = pubEvent.get(`${p}\n${e}`);
      if (count) edges.push({ id: `pe-${pi}-${ei}`, path: link(pubX + 14, pubY[pi], evX - 40, evY[ei]), count });
    }),
  );
  events.forEach((e, ei) =>
    subs.forEach((s, si) => {
      const count = evSub.get(`${e}\n${s}`);
      if (count) edges.push({ id: `es-${ei}-${si}`, path: link(evX + 40, evY[ei], subX, subY[si]), count });
    }),
  );

  const recent = log.slice(-6);
  return (
    <div>
      {log.length === 0 ? (
        <p className="hud-muted text-[11px]">No deliveries yet. Raise an event while a subscriber is attached.</p>
      ) : (
        <svg viewBox={`0 0 ${BUS_W} ${height}`} className="block w-full" role="img" aria-label={`Event bus: ${pubsAll.join(", ")} raise ${eventsAll.join(", ")}; delivered to ${subsAll.join(", ")}`}>
          <text x={pubX} y="10" textAnchor="middle" fontSize="8" fontFamily={mono} letterSpacing="0.8" fill="rgba(255,255,255,0.4)">
            PUBLISH
          </text>
          <text x={evX} y="10" textAnchor="middle" fontSize="8" fontFamily={mono} letterSpacing="0.8" fill="rgba(255,255,255,0.4)">
            EVENT
          </text>
          <text x={subX + 46} y="10" textAnchor="middle" fontSize="8" fontFamily={mono} letterSpacing="0.8" fill="rgba(255,255,255,0.4)">
            SUBSCRIBE
          </text>
          <g key={generation}>
            {edges.map((e) => (
              <path key={e.id} d={e.path} fill="none" stroke={C.lime} strokeOpacity=".4" strokeWidth="1.5" className="fl-flow" />
            ))}
            {edges.flatMap((e, ei) =>
              Array.from({ length: Math.min(e.count, 3) }, (_, k) => (
                <circle key={`${e.id}-${k}`} className="fl-travel" cx="0" cy="0" r="2.6" fill={C.limeSoft} style={{ ...delay(ei * 0.5 + k), offsetPath: `path("${e.path}")` }} />
              )),
            )}
          </g>
          {pubs.map((p, i) => (
            <g key={p}>
              <circle cx={pubX} cy={pubY[i]} r="14" fill="#121212" stroke={C.lime} strokeOpacity=".7" strokeWidth="1.5" />
              <circle cx={pubX} cy={pubY[i]} r="4" fill={C.lime} />
              <circle cx={pubX} cy={pubY[i]} r="8.5" fill="none" stroke={C.lime} strokeOpacity=".35" strokeDasharray="2 3" />
              <text x={pubX} y={pubY[i] + 27} textAnchor="middle" fontSize="9" fontFamily={mono} fill={C.limeSoft}>
                {p.length > 11 ? `${p.slice(0, 10)}.` : p}
              </text>
              <title>{p}</title>
            </g>
          ))}
          {events.map((e, i) => (
            <g key={e}>
              <rect x={evX - 40} y={evY[i] - 12} width="80" height="24" rx="12" fill="#181818" stroke="rgba(255,255,255,0.22)" />
              <text x={evX} y={evY[i] + 3.5} textAnchor="middle" fontSize="9.5" fontFamily={mono} fill="rgba(255,255,255,0.85)">
                {e.length > 11 ? `${e.slice(0, 10)}.` : e}
              </text>
              <title>{e}</title>
            </g>
          ))}
          {subs.map((s, i) => (
            <g key={s}>
              <rect x={subX} y={subY[i] - 14} width="92" height="28" rx="7" fill="#181818" stroke="rgba(255,255,255,0.22)" />
              <text x={subX + 6} y={subY[i] + 3.5} fontSize="9" fontFamily={mono} fill="rgba(255,255,255,0.88)">
                {s.length > 11 ? `${s.slice(0, 10)}.` : s}
              </text>
              <rect x={subX + 92 - 24} y={subY[i] - 8} width="18" height="16" rx="8" fill={C.lime} />
              <text x={subX + 92 - 15} y={subY[i] + 3.5} textAnchor="middle" fontSize="9.5" fontWeight="600" fontFamily={mono} fill="#0a0a0a">
                {subCount.get(s) ?? 0}
              </text>
              <title>{s}</title>
            </g>
          ))}
        </svg>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {d.listeners !== undefined && <Pill tone={d.listeners > 0 ? "accent" : "ghost"}>listeners: {d.listeners}</Pill>}
        {log.length > 0 && <Pill>{log.length} delivered</Pill>}
        {extra > 0 && <Pill tone="ghost">+{extra} more nodes</Pill>}
      </div>

      {recent.length > 0 && (
        <ul className="mt-2 space-y-0.5 rounded-md bg-black/40 px-2 py-1.5" aria-label="Latest deliveries">
          {recent.map((r, i) => (
            <li key={i} className="flex min-w-0 items-baseline gap-1.5 font-mono text-[10.5px]">
              <span className="min-w-0 truncate text-white/80">{r.payload || r.eventName}</span>
              <span className="shrink-0 text-white/30">→</span>
              <span className="min-w-0 truncate text-[#d3f3a4]">{r.subscriber}</span>
            </li>
          ))}
          {log.length > recent.length && <li className="font-mono text-[10px] text-white/35">… {log.length - recent.length} earlier</li>}
        </ul>
      )}
    </div>
  );
}

// ───────────────────────── lesson 6: meters ─────────────────────────

function MeterRow({ label, readings, slots, done, leftAfter }: { label: string; readings: number[]; slots: number; done: boolean; leftAfter?: number }) {
  return (
    <div className="flex min-w-0 items-end gap-2">
      <div className="w-12 shrink-0 pb-4">
        <p className="hud-label truncate">{label}</p>
        {done && <span className="mt-0.5 inline-block rounded-full border border-white/15 px-1.5 text-[8.5px] text-white/55">completed</span>}
      </div>
      <div className="flex min-w-0 flex-1 items-end gap-1.5">
        {Array.from({ length: slots }, (_, i) => {
          const v = readings[i];
          const gap = v === undefined;
          const hot = !gap && v > 90;
          return (
            <div key={i} className="flex min-w-0 flex-1 flex-col items-center gap-0.5">
              <div className="relative h-10 w-full overflow-hidden rounded-sm bg-white/[0.05]">
                {gap ? (
                  <div className="absolute inset-0 rounded-sm border border-dashed border-white/12" />
                ) : (
                  <div className="fl-rise absolute inset-x-0 bottom-0" style={{ ...delay(i), height: `${clamp(v, 0, 100)}%`, background: hot ? C.amber : C.lime, opacity: 0.85 }} />
                )}
              </div>
              <span className="hud-value text-[9px]" style={{ color: gap ? "rgba(255,255,255,0.25)" : hot ? C.amber : "rgba(255,255,255,0.7)" }}>
                {gap ? (leftAfter !== undefined && i === leftAfter ? "off" : "·") : fmtNum(v)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function Meters({ d }: { d: Desk["observers"] }) {
  if (!hasValues(d)) return <Empty>Nothing yet. Send observers with Desk.Show: meter, alarm and completed.</Empty>;
  const meter = (d.meter ?? []).slice(0, 10);
  const alarm = (d.alarm ?? []).slice(0, 10);
  const slots = Math.max(meter.length, alarm.length, 1);
  const done = new Set((d.completed ?? []).map((c) => c.toLowerCase()));
  const left = d.alarm !== undefined && alarm.length < meter.length ? alarm.length : undefined;
  return (
    <div>
      <div className="space-y-2">
        {d.meter !== undefined && <MeterRow label="Meter" readings={meter} slots={slots} done={done.has("meter")} />}
        {d.alarm !== undefined && <MeterRow label="Alarm" readings={alarm} slots={slots} done={done.has("alarm")} leftAfter={left} />}
      </div>
      {left !== undefined && <p className="mt-1.5 text-[10.5px] leading-snug text-white/60">The alarm disposed its subscription after {left} readings, so later readings never reached it.</p>}
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {d.stillSubscribed !== undefined && <Pill tone={d.stillSubscribed > 0 ? "accent" : "ghost"}>{d.stillSubscribed} still subscribed</Pill>}
        {d.completed !== undefined && <Pill tone={d.completed.length > 0 ? "accent" : "ghost"}>completed: {d.completed.length > 0 ? d.completed.join(", ") : "nobody"}</Pill>}
      </div>
    </div>
  );
}

// ───────────────────────── lesson 7: prop shelves ─────────────────────────

export function PropShelves({ d }: { d: Desk["props"] }) {
  if (!hasValues(d)) return <Empty>Nothing yet. Send props with Desk.Show: shelf, heaviest, viewed and judged.</Empty>;
  const shelf = (d.shelf ?? []).slice(0, 8);
  const top = Math.max(1, ...shelf.map((p) => p.weight));
  return (
    <div>
      {d.shelf === undefined ? (
        <p className="hud-muted text-[11px]">Send shelf to stock the shelves.</p>
      ) : shelf.length === 0 ? (
        <p className="hud-muted text-[11px]">The shelf is empty.</p>
      ) : (
        <div className="border-b-2 border-white/20 pb-1.5">
          <div className="grid grid-cols-2 gap-1.5">
            {shelf.map((p, i) => {
              const heavy = p.name === d.heaviest;
              return (
                <div key={`${p.name}-${i}`} className={`fl-pop min-w-0 rounded-md border px-2 py-1.5 ${heavy ? "border-[#c5ee8a]/60 bg-[#c5ee8a]/[0.07]" : "border-white/12 bg-white/[0.03]"}`} style={delay(i)}>
                  <p className="hud-value truncate text-[11.5px]" title={p.name}>
                    {p.name}
                  </p>
                  <div className="mt-1 flex items-center justify-between gap-1">
                    <span className="hud-tag !h-[1.1rem] !px-1.5 !text-[9px]">{p.kind}</span>
                    <span className="hud-value text-[10px] text-white/60">{fmtNum(p.weight)} kg</span>
                  </div>
                  <div className="hud-bar mt-1.5 !h-1">
                    <span style={{ width: `${(p.weight / top) * 100}%`, background: heavy ? C.lime : "#9f9f9f" }} />
                  </div>
                  {heavy && <p className="mt-1 text-[9px] font-semibold uppercase tracking-wider text-[#d3f3a4]">heaviest</p>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {d.viewed !== undefined && (
        <p className="mt-2 text-[11px] leading-snug text-white/65">
          The same shelf seen as <span className="font-mono text-white/85">IShelfView&lt;Prop&gt;</span>: <span className="hud-value text-[#d3f3a4]">{d.viewed}</span> props, no copy made.
        </p>
      )}
      {d.judged && d.judged.length > 0 && (
        <>
          <SectionLabel>Judged by a Prop judge</SectionLabel>
          <div className="flex flex-wrap gap-1">
            {d.judged.map((j, i) => (
              <Pill key={`${j}-${i}`} tone={/heavy/i.test(j) ? "accent" : "plain"} dashed={!/heavy/i.test(j)}>
                {j}
              </Pill>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ───────────────────────── lesson 8: fade steps ─────────────────────────

export function FadeSteps({ d }: { d: Desk["iter"] }) {
  if (!hasValues(d)) return <Empty>Nothing yet. Send iter with Desk.Show: fade, trace and pulse.</Empty>;
  const fade = (d.fade ?? []).slice(0, 16);
  const pulse = (d.pulse ?? []).slice(0, 16);
  const trace = (d.trace ?? []).slice(0, 14);
  const fadeTop = Math.max(100, ...fade);
  const pulseTop = Math.max(100, ...pulse);
  const loaded = trace.filter((t) => t.startsWith("loading")).length;
  const neverThree = trace.some((t) => t.includes("loading cue 2")) && !trace.some((t) => t.includes("loading cue 3"));
  const unfinished = loaded > 0 && !trace.some((t) => t.includes("finished"));

  let pulsePath = "";
  const pw = 200;
  const ph = 28;
  if (pulse.length > 0) {
    const step = pw / pulse.length;
    pulse.forEach((v, i) => {
      const y = ph - 4 - (clamp(v, 0, pulseTop) / pulseTop) * (ph - 8);
      pulsePath += i === 0 ? `M0 ${y}` : ` V${y}`;
      pulsePath += ` H${(i + 1) * step}`;
    });
  }

  return (
    <div>
      {fade.length > 0 && (
        <>
          <SectionLabel right={`${fade.length} steps, produced on demand`}>Fade</SectionLabel>
          <svg viewBox="0 0 200 56" className="block w-full" role="img" aria-label={`Fade steps: ${fade.join(", ")}`}>
            <path d="M0 50 H200" stroke="rgba(255,255,255,0.15)" />
            {fade.map((v, i) => {
              const w = 200 / fade.length;
              const h = (clamp(v, 0, fadeTop) / fadeTop) * 38;
              return (
                <g key={i}>
                  <rect className="fl-rise" style={{ ...delay(i), transformBox: "fill-box" }} x={i * w + 2} y={50 - h} width={Math.max(2, w - 4)} height={Math.max(h, 1)} rx="2" fill={C.lime} opacity={0.35 + 0.65 * (fadeTop === 0 ? 0 : v / fadeTop)} />
                  <text x={i * w + w / 2} y="55" textAnchor="middle" fontSize="6.5" fontFamily={mono} fill="rgba(255,255,255,0.45)">
                    {fmtNum(v)}
                  </text>
                </g>
              );
            })}
          </svg>
        </>
      )}

      {pulse.length > 0 && (
        <>
          <SectionLabel right="an endless iterator, Take(6)">Pulse</SectionLabel>
          <svg viewBox={`0 0 ${pw} ${ph}`} className="block w-full" role="img" aria-label={`Pulse values: ${pulse.join(" ")}`}>
            <path d={pulsePath} fill="none" stroke={C.lime} strokeWidth="1.6" strokeLinejoin="round" />
          </svg>
        </>
      )}

      {trace.length > 0 && (
        <>
          <SectionLabel>Who runs when</SectionLabel>
          <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 rounded-md bg-black/40 px-2 py-1.5 font-mono text-[10.5px]" role="log" aria-label="Interleaving of the iterator and the loop">
            <span className="hud-label !text-[9px]">iterator</span>
            <span className="hud-label !text-[9px]">your loop</span>
            {trace.map((line, i) => {
              const consumer = line.startsWith("running");
              return (
                <React.Fragment key={i}>
                  <span className="truncate text-white/55" title={consumer ? undefined : line}>
                    {consumer ? "" : line}
                  </span>
                  <span className="truncate text-[#d3f3a4]" title={consumer ? line : undefined}>
                    {consumer ? line : ""}
                  </span>
                </React.Fragment>
              );
            })}
          </div>
          {neverThree ? (
            <p className="mt-1.5 text-[10.5px] leading-snug text-[#fbbf24]/90">Cue 3 was never loaded: the loop stopped early, so the iterator never ran that far.</p>
          ) : unfinished ? (
            <p className="mt-1.5 text-[10.5px] leading-snug text-[#fbbf24]/90">The iterator never reached its end: it only runs as far as the loop asks.</p>
          ) : null}
        </>
      )}
    </div>
  );
}

// ───────────────────────── lesson 9: query bench ─────────────────────────

function Stage({ name, count, unit, live }: { name: string; count: number | undefined; unit?: string; live?: boolean }) {
  return (
    <div className={`min-w-0 flex-1 rounded-md border px-1.5 py-1.5 text-center ${live ? "border-[#c5ee8a]/40 bg-[#c5ee8a]/[0.06]" : "border-white/12 bg-white/[0.03]"}`}>
      <p className="hud-label truncate !text-[9px]">{name}</p>
      <p className="hud-value text-[15px] leading-tight" style={{ color: live ? C.limeSoft : "rgba(255,255,255,0.7)" }}>
        {count === undefined ? dash : fmtNum(count)}
      </p>
      {unit && <p className="hud-muted text-[9px]">{unit}</p>}
    </div>
  );
}

const Arrow = () => (
  <svg viewBox="0 0 10 10" className="w-2.5 shrink-0 self-center" aria-hidden>
    <path d="M2 5 H8 M5.5 2.5 L8 5 L5.5 7.5" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export function QueryBench({ d }: { d: Desk["query"] }) {
  if (!hasValues(d)) return <Empty>Nothing yet. Send query with Desk.Show: source, pulls, kept and pages.</Empty>;
  const pages = (d.pages ?? []).slice(0, 4);
  const pulls = d.pulls;
  const top = Math.max(1, d.source ?? 0, pulls?.pass ?? 0, pulls?.built ?? 0, pulls?.first ?? 0);
  const rows: [string, number | undefined, string][] = [
    ["query built", pulls?.built, "nothing runs yet"],
    ["one full pass", pulls?.pass, "every entry pulled once"],
    ["First() only", pulls?.first, "stops at the first match"],
  ];
  return (
    <div>
      <SectionLabel right="each stage pulls from the one before">Pipeline</SectionLabel>
      <div className="flex items-stretch gap-1" role="img" aria-label="Source, Keep, Shape, Batch">
        <Stage name="source" count={d.source} unit="entries" />
        <Arrow />
        <Stage name="Keep" count={d.kept} unit="match" live />
        <Arrow />
        <Stage name="Shape" count={d.kept} unit="mapped" live />
        <Arrow />
        <Stage name="Batch" count={d.pages?.length} unit="pages" live />
      </div>

      {pulls && hasValues(pulls) && (
        <>
          <SectionLabel>Entries pulled from the source</SectionLabel>
          <div className="space-y-1.5">
            {rows.map(([label, v, note]) => (
              <div key={label} className="min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="hud-label truncate">{label}</span>
                  <span className="hud-value text-[11px] text-[#d3f3a4]">{v === undefined ? dash : fmtNum(v)}</span>
                </div>
                <div className="hud-bar !h-1.5">
                  <span className="fl-grow" style={{ width: `${v === undefined ? 0 : (v / top) * 100}%`, minWidth: v ? 2 : 0 }} />
                </div>
                <p className="hud-muted text-[9.5px]">{note}</p>
              </div>
            ))}
          </div>
        </>
      )}

      {pages.length > 0 && (
        <>
          <SectionLabel right={d.kept !== undefined ? `${d.kept} kept` : undefined}>Pages</SectionLabel>
          <div className="space-y-1">
            {pages.map((page, i) => (
              <div key={i} className="fl-pop flex min-w-0 items-center gap-2 rounded-md border border-white/12 bg-white/[0.03] px-2 py-1" style={delay(i)}>
                <span className="hud-label shrink-0 !text-[9px]">page {i + 1}</span>
                <div className="flex min-w-0 flex-1 flex-wrap gap-1">
                  {page.map((cue, k) => (
                    <span key={`${cue}-${k}`} className="truncate rounded bg-[#c5ee8a]/10 px-1.5 font-mono text-[10px] text-[#d3f3a4]">
                      {cue}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
