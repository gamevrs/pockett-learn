"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Compass,
  Crosshair,
  Footprints,
  Gauge,
  ListOrdered,
  Lock,
  Percent,
  Ruler,
  Scale,
  Scissors,
  SlidersHorizontal,
  Table2,
  Vote,
  Workflow,
  NotebookPen,
  Shuffle,
  Container,
  type LucideIcon,
} from "lucide-react";
import type { SceneProps } from "@/engine/scene";
import { BAD, KINDS, KIND_COLOR, LIME, readData, steps, type Counts, type Data, type Kind, type Pebble, asKind } from "./data.ts";

/**
 * Pebble Beach: Pip's sorting lab, driven by the learner's Python.
 *
 * The scene owns the map and the cards; every number on them comes from variables the learner's file
 * defined, read through data.ts. Each lesson unlocks one part; until then it is a dashed blueprint.
 * Colour follows the Pockett Stage system: neutral greys for structure, lime for what the learner's
 * code produced, one hue (and one shape) per kind of pebble, red for mistakes.
 */

interface PanelDef {
  id: string;
  title: string;
  lesson: number;
  clause: string;
  icon: LucideIcon;
}

const PANELS: PanelDef[] = [
  { id: "pb-rule", title: "Rule board", lesson: 1, clause: "needs hand_guess and truth", icon: Ruler },
  { id: "pb-beach", title: "Beach map", lesson: 2, clause: "needs PEBBLES", icon: Compass },
  { id: "pb-distance", title: "Step counter", lesson: 3, clause: "needs to_first and to_other", icon: Footprints },
  { id: "pb-nearest", title: "Nearest pebble", lesson: 4, clause: "needs nn_pebble and nn_guess", icon: Crosshair },
  { id: "pb-neighbours", title: "Closest three", lesson: 5, clause: "needs near3", icon: ListOrdered },
  { id: "pb-vote", title: "Vote", lesson: 6, clause: "needs tricky_votes", icon: Vote },
  { id: "pb-accuracy", title: "Accuracy meter", lesson: 7, clause: "needs basket_accuracy", icon: Percent },
  { id: "pb-split", title: "Hidden pebbles", lesson: 8, clause: "needs train_set and test_set", icon: Scissors },
  { id: "pb-scores", title: "Honest score", lesson: 9, clause: "needs train_accuracy and test_accuracy", icon: Scale },
  { id: "pb-memory", title: "Memoriser", lesson: 10, clause: "needs memo_test_accuracy", icon: NotebookPen },
  { id: "pb-fit", title: "How many neighbours?", lesson: 11, clause: "needs fit_table", icon: SlidersHorizontal },
  { id: "pb-bias", title: "Lopsided sample", lesson: 12, clause: "needs cove_counts", icon: Container },
  { id: "pb-fair", title: "A fair pile", lesson: 13, clause: "needs fair_counts", icon: Shuffle },
  { id: "pb-table", title: "Confusion table", lesson: 14, clause: "needs confusion_table", icon: Table2 },
  { id: "pb-pipeline", title: "Pipeline", lesson: 15, clause: "needs report", icon: Workflow },
];
const PANEL: Record<string, PanelDef> = Object.fromEntries(PANELS.map((p) => [p.id, p]));
const CARD_IDS = PANELS.map((p) => p.id).filter((id) => id !== "pb-beach");

// ───────────────────────── small pieces ─────────────────────────

function Shape({ kind, size = 10, hollow = false }: { kind: Kind; size?: number; hollow?: boolean }) {
  const c = KIND_COLOR[kind];
  const s = size;
  const common = { fill: hollow ? "none" : c, stroke: c, strokeWidth: hollow ? 1.6 : 0 } as const;
  return (
    <svg width={s + 4} height={s + 4} viewBox="-8 -8 16 16" className="shrink-0" aria-hidden>
      {kind === "skipper" && <rect x="-7" y="-3.5" width="14" height="7" rx="3.5" {...common} />}
      {kind === "roller" && <circle r="5" {...common} />}
      {kind === "sparkler" && <rect x="-4" y="-4" width="8" height="8" transform="rotate(45)" {...common} />}
    </svg>
  );
}

function KindChip({ kind, text }: { kind: string | null; text?: string }) {
  const k = asKind(kind);
  if (!k) return <span className="hud-value hud-muted text-[11px]">{kind ?? "?"}</span>;
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-white/10 px-1.5 py-px text-[11px]" style={{ color: KIND_COLOR[k] }}>
      <Shape kind={k} size={8} />
      <span className="font-medium">{text ?? k}</span>
    </span>
  );
}

function Verdict({ ok, yes, no }: { ok: boolean | null; yes: string; no: string }) {
  if (ok === null) return null;
  return (
    <span
      className="inline-flex h-[18px] items-center rounded-full border px-1.5 font-mono text-[9.5px] font-medium uppercase tracking-wide"
      style={{ color: ok ? LIME : BAD, borderColor: ok ? "rgba(197,238,138,.4)" : "rgba(248,113,113,.4)" }}
    >
      {ok ? yes : no}
    </span>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return <p className="hud-log hud-muted py-1 text-[11px]">{children}</p>;
}

function Needs({ names }: { names: string }) {
  return (
    <Note>
      Waiting for <span className="hud-warning">{names}</span> in your file. Run again once it is defined.
    </Note>
  );
}

function Meter({ value, color = LIME, label, detail }: { value: number; color?: string; label: string; detail?: string }) {
  const v = Math.min(100, Math.max(0, Number.isFinite(value) ? value : 0));
  return (
    <div className="min-w-0">
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <span className="hud-label truncate">{label}</span>
        <span className="hud-value shrink-0 text-[13px]" style={{ color }}>
          {Math.round(v)}
          <span className="text-[9px] text-white/45">%</span>
        </span>
      </div>
      <div className="h-[6px] overflow-hidden rounded-full bg-white/10" role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(v)}>
        <div className="h-full rounded-full" style={{ width: `${v}%`, background: color, transition: "width .8s cubic-bezier(.2,.8,.2,1)" }} />
      </div>
      {detail && <p className="hud-value hud-muted mt-1 text-[10px]">{detail}</p>}
    </div>
  );
}

function CountBars({ counts, total }: { counts: Counts; total?: number }) {
  const sum = total ?? KINDS.reduce((a, k) => a + (counts[k] ?? 0), 0);
  return (
    <div className="space-y-1.5">
      <div className="flex h-3 overflow-hidden rounded-full bg-white/10" role="img" aria-label={KINDS.map((k) => `${counts[k] ?? 0} ${k}`).join(", ")}>
        {KINDS.map((k) => {
          const n = counts[k] ?? 0;
          return n > 0 ? <div key={k} style={{ width: `${(n / (sum || 1)) * 100}%`, background: KIND_COLOR[k], transition: "width .6s ease" }} /> : null;
        })}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {KINDS.map((k) => (
          <span key={k} className="inline-flex items-center gap-1 text-[11px] text-white/70">
            <Shape kind={k} size={8} />
            {k}
            <span className="hud-value">{counts[k] ?? 0}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function PanelFrame({ id, meta, focus, flash, children }: { id: string; meta?: React.ReactNode; focus?: boolean; flash?: boolean; children: React.ReactNode }) {
  const def = PANEL[id];
  const Icon = def?.icon ?? Gauge;
  return (
    <section data-panel={id} className={`hud-panel min-w-0 px-3 py-2.5 ${focus ? "border-[#c5ee8a]/40" : ""} ${flash ? "pop-in" : ""}`}>
      <header className="mb-2 flex min-w-0 items-center gap-2">
        <span className="shrink-0 text-[#c5ee8a]">
          <Icon className="h-3.5 w-3.5" aria-hidden />
        </span>
        <h3 className="hud-title min-w-0 flex-1 truncate">{def?.title ?? id}</h3>
        {meta && <span className="hud-value hud-muted shrink-0 text-[10px]">{meta}</span>}
      </header>
      {children}
    </section>
  );
}

function LockedPanel({ id, spot }: { id: string; spot: boolean }) {
  const def = PANEL[id];
  return (
    <section data-panel={id} data-locked="" className={`min-w-0 rounded-[10px] border border-dashed px-3 py-2.5 ${spot ? "pulse-ring border-[#c5ee8a]/60" : "border-white/15"}`}>
      <header className="mb-2 flex min-w-0 items-center gap-2">
        <Lock className="h-3 w-3 shrink-0 text-white/35" aria-hidden />
        <h3 className="hud-label min-w-0 flex-1 truncate">{def.title}</h3>
        <span className="hud-label shrink-0 text-white/30">L{def.lesson}</span>
      </header>
      <div className="space-y-1.5">
        {[86, 64, 46].map((w) => (
          <div key={w} className="h-1.5 rounded-sm bg-white/[0.05]" style={{ width: `${w}%` }} />
        ))}
      </div>
      <p className="mt-2.5 truncate font-mono text-[10px] text-white/40">
        {spot ? <span className="hud-accent">Your code powers this · </span> : "Locked · "}
        {def.clause}
      </p>
    </section>
  );
}

// ───────────────────────── the beach map ─────────────────────────

const MAP_W = 360;
const MAP_H = 316;
const X0 = 44;
const X1 = 344;
const Y0 = 16; // top (shine 9)
const Y1 = 268; // bottom (shine 1)
const px = (flat: number) => X0 + ((flat - 1) / 8) * (X1 - X0);
const py = (shine: number) => Y1 - ((shine - 1) / 8) * (Y1 - Y0);

function Marker({ kind, x, y, hollow, dim, big }: { kind: Kind | null; x: number; y: number; hollow?: boolean; dim?: boolean; big?: boolean }) {
  const k = kind ?? "roller";
  const c = kind ? KIND_COLOR[k] : "#9a9a9a";
  const f = big ? 1.25 : 1;
  const fill = hollow ? "none" : c;
  const sw = hollow ? 2 : 0;
  const opacity = dim ? 0.3 : 1;
  return (
    <g transform={`translate(${x} ${y}) scale(${f})`} opacity={opacity}>
      {k === "skipper" && <rect x="-9" y="-4.6" width="18" height="9.2" rx="4.6" fill={fill} stroke={c} strokeWidth={sw} />}
      {k === "roller" && <circle r="6.6" fill={fill} stroke={c} strokeWidth={sw} />}
      {k === "sparkler" && <rect x="-5.6" y="-5.6" width="11.2" height="11.2" transform="rotate(45)" fill={fill} stroke={c} strokeWidth={sw} />}
    </g>
  );
}

function Probe({ p, label, dim, motion }: { p: Pebble; label: string; dim?: boolean; motion: boolean }) {
  const x = px(p.flat);
  const y = py(p.shine);
  return (
    <g opacity={dim ? 0.4 : 1}>
      <circle cx={x} cy={y} r="13" fill="none" stroke={LIME} strokeWidth="2">
        {motion && <animate attributeName="r" values="12;16;12" dur="2.4s" repeatCount="indefinite" />}
      </circle>
      <circle cx={x} cy={y} r="5" fill="#0a0a0a" stroke={LIME} strokeWidth="2" />
      <text x={x} y={y + 3.5} textAnchor="middle" fontSize="9" fontWeight="700" fill={LIME}>
        ?
      </text>
      {label && (
        <text x={x > X1 - 40 ? x - 17 : x + 17} y={y - 12} textAnchor={x > X1 - 40 ? "end" : "start"} fontSize="10" fontWeight="600" fill={LIME}>
          {label}
        </text>
      )}
    </g>
  );
}

function Staircase({ from, to, label }: { from: Pebble; to: Pebble; label: number | null }) {
  const x1 = px(from.flat);
  const y1 = py(from.shine);
  const x2 = px(to.flat);
  const y2 = py(to.shine);
  return (
    <g>
      <path d={`M${x1} ${y1} H${x2} V${y2}`} fill="none" stroke={LIME} strokeWidth="1.6" strokeDasharray="4 4" opacity=".85" />
      {label !== null && (
        <g transform={`translate(${(x1 + x2) / 2} ${Math.min(y1, y2) > 40 ? y1 - 6 : y1 + 14})`}>
          <rect x="-24" y="-10" width="48" height="15" rx="7.5" fill="#0a0a0a" stroke={LIME} strokeOpacity=".5" />
          <text textAnchor="middle" y="1" fontSize="9.5" fill={LIME} fontWeight="600">
            {label} steps
          </text>
        </g>
      )}
    </g>
  );
}

function BeachMap({ data, unlocked, hover, setHover, motion, maxH }: { data: Data; unlocked: ReadonlySet<string>; hover: number | null; setHover: (i: number | null) => void; motion: boolean; maxH?: number }) {
  const alive = unlocked.has("pb-beach") && data.pebbles.length > 0;
  const testKeys = useMemo(() => new Set(data.testSet.map((p) => `${p.flat},${p.shine}`)), [data.testSet]);
  const splitOn = unlocked.has("pb-split") && data.testSet.length > 0;
  const voteOn = unlocked.has("pb-vote") && !!data.tricky;
  const mystery = data.mystery;
  const ring = (p: Pebble, n: number | null, key: string) => (
    <g key={key}>
      <circle cx={px(p.flat)} cy={py(p.shine)} r="15" fill="none" stroke={LIME} strokeWidth="2" />
      {n !== null && (
        <g transform={`translate(${px(p.flat) + 13} ${py(p.shine) - 13})`}>
          <circle r="6.5" fill={LIME} />
          <text textAnchor="middle" y="3.2" fontSize="9" fontWeight="700" fill="#10200a">
            {n}
          </text>
        </g>
      )}
    </g>
  );
  const first = data.pebbles[0];
  const ninth = data.pebbles[8];
  return (
    <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} className={`block w-full ${maxH ? "" : "h-auto"}`} style={maxH ? { height: maxH } : undefined} role="img" aria-label="Map of the labelled pebbles: flatness across, shine upwards">
      {/* grid */}
      {Array.from({ length: 9 }, (_, i) => i + 1).map((n) => (
        <g key={n}>
          <line x1={px(n)} y1={Y0} x2={px(n)} y2={Y1} stroke="#fff" strokeOpacity={alive ? 0.07 : 0.05} strokeDasharray={alive ? undefined : "2 4"} />
          <line x1={X0} y1={py(n)} x2={X1} y2={py(n)} stroke="#fff" strokeOpacity={alive ? 0.07 : 0.05} strokeDasharray={alive ? undefined : "2 4"} />
          <text x={px(n)} y={Y1 + 14} textAnchor="middle" fontSize="9.5" fill="#fff" fillOpacity=".42" fontFamily="var(--font-mono)">
            {n}
          </text>
          <text x={X0 - 12} y={py(n) + 3.5} textAnchor="middle" fontSize="9.5" fill="#fff" fillOpacity=".42" fontFamily="var(--font-mono)">
            {n}
          </text>
        </g>
      ))}
      <text x={(X0 + X1) / 2} y={MAP_H - 10} textAnchor="middle" fontSize="10.5" fill="#fff" fillOpacity=".55" fontWeight="600">
        flat: round to thin
      </text>
      <text transform={`translate(11 ${(Y0 + Y1) / 2}) rotate(-90)`} textAnchor="middle" fontSize="10.5" fill="#fff" fillOpacity=".55" fontWeight="600">
        shine: dull to glittery
      </text>
      <rect x={X0} y={Y0} width={X1 - X0} height={Y1 - Y0} fill="none" stroke="#fff" strokeOpacity=".1" />

      {!alive && (
        <text x={(X0 + X1) / 2} y={(Y0 + Y1) / 2 - 6} textAnchor="middle" fontSize="11" fill="#fff" fillOpacity=".4">
          <tspan x={(X0 + X1) / 2}>The map fills in when your</tspan>
          <tspan x={(X0 + X1) / 2} dy="15">pebbles are labelled (lesson 2)</tspan>
        </text>
      )}

      {/* the layers, bottom to top */}
      {alive && !voteOn && unlocked.has("pb-distance") && mystery && first && <Staircase from={mystery} to={first} label={data.toFirst} />}
      {alive && !voteOn && unlocked.has("pb-distance") && mystery && ninth && <Staircase from={mystery} to={ninth} label={data.toOther} />}
      {alive && !voteOn && unlocked.has("pb-nearest") && mystery && data.nnPebble && (
        <line x1={px(mystery.flat)} y1={py(mystery.shine)} x2={px(data.nnPebble.flat)} y2={py(data.nnPebble.shine)} stroke={LIME} strokeWidth="2.4" strokeLinecap="round" />
      )}
      {alive && !voteOn && unlocked.has("pb-neighbours") && mystery && data.near3.map((p, i) => (
        <line key={`nl${i}`} x1={px(mystery.flat)} y1={py(mystery.shine)} x2={px(p.flat)} y2={py(p.shine)} stroke={LIME} strokeWidth="1.2" strokeOpacity=".55" strokeDasharray="3 3" />
      ))}
      {alive && voteOn && data.tricky && data.trickyNear.map((p, i) => (
        <line key={`tl${i}`} x1={px(data.tricky!.flat)} y1={py(data.tricky!.shine)} x2={px(p.flat)} y2={py(p.shine)} stroke={LIME} strokeWidth="1.2" strokeOpacity=".55" strokeDasharray="3 3" />
      ))}

      {alive &&
        data.pebbles.map((p, i) => (
          <g key={i} onPointerEnter={() => setHover(i)} onPointerLeave={() => setHover(null)} onPointerDown={() => setHover(i)} style={{ cursor: "default" }}>
            <title>{`flat ${p.flat}, shine ${p.shine}${p.kind ? ` · ${p.kind}` : ""}`}</title>
            <Marker kind={p.kind} x={px(p.flat)} y={py(p.shine)} hollow={splitOn && testKeys.has(`${p.flat},${p.shine}`)} big={hover === i} />
          </g>
        ))}

      {alive && !voteOn && unlocked.has("pb-nearest") && data.nnPebble && ring(data.nnPebble, null, "nn")}
      {alive && !voteOn && unlocked.has("pb-neighbours") && data.near3.map((p, i) => ring(p, i + 1, `n${i}`))}
      {alive && voteOn && data.trickyNear.map((p, i) => ring(p, i + 1, `t${i}`))}

      {alive && mystery && <Probe p={mystery} label={voteOn ? "" : "mystery"} dim={voteOn} motion={motion && !voteOn} />}
      {alive && voteOn && data.tricky && <Probe p={data.tricky} label="" motion={motion} />}
    </svg>
  );
}

// ───────────────────────── card bodies ─────────────────────────

function clues(p: Pebble) {
  return `flat ${p.flat} · shine ${p.shine}`;
}

function RuleBody({ d }: { d: Data }) {
  if (!d.mystery || !d.handGuess) return <Needs names="mystery and hand_guess" />;
  return (
    <div className="space-y-2">
      <p className="hud-value text-[11px] text-white/70">Mystery pebble: {clues(d.mystery)}</p>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-white/10 p-2">
          <p className="hud-label mb-1">The rule says</p>
          <KindChip kind={d.handGuess} />
        </div>
        <div className="rounded-lg border border-white/10 p-2">
          <p className="hud-label mb-1">The truth is</p>
          <KindChip kind={d.truth} />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Verdict ok={d.handCorrect === null ? null : d.handCorrect} yes="rule is right" no="rule is wrong" />
        {d.handCorrect === false && <span className="text-[11px] text-white/55">It never heard of sparklers.</span>}
      </div>
    </div>
  );
}

function BeachBody({ d }: { d: Data }) {
  const counts = d.kindCounts ?? null;
  const fromPebbles: Counts = {};
  for (const p of d.pebbles) if (p.kind) fromPebbles[p.kind] = (fromPebbles[p.kind] ?? 0) + 1;
  return (
    <div className="space-y-2">
      <CountBars counts={counts ?? fromPebbles} />
      <p className="hud-value hud-muted text-[10px]">
        {d.pebbles.length} labelled pebbles{d.firstFeatures ? ` · the first has clues [${d.firstFeatures.join(", ")}]` : ""}
      </p>
    </div>
  );
}

function DistanceBody({ d }: { d: Data }) {
  if (d.toFirst === null && d.toOther === null) return <Needs names="to_first and to_other" />;
  const rows = [
    { name: "to the first pebble", n: d.toFirst, p: d.pebbles[0] },
    { name: "to the ninth pebble", n: d.toOther, p: d.pebbles[8] },
  ];
  return (
    <div className="space-y-2.5">
      {rows.map((r) =>
        r.n === null ? null : (
          <div key={r.name}>
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="flex min-w-0 items-center gap-1.5 text-[11px] text-white/70">
                <span className="truncate">{r.name}</span>
                {r.p?.kind && <KindChip kind={r.p.kind} />}
              </span>
              <span className="hud-value text-[12px] hud-accent">{r.n} steps</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-[#c5ee8a]" style={{ width: `${Math.min(100, (r.n / 16) * 100)}%`, transition: "width .6s ease" }} />
            </div>
          </div>
        ),
      )}
      <p className="text-[11px] text-white/50">Fewer steps means more alike.</p>
    </div>
  );
}

function NearestBody({ d }: { d: Data }) {
  if (!d.nnPebble || !d.nnGuess) return <Needs names="nn_pebble and nn_guess" />;
  const right = d.truth ? d.nnGuess === d.truth : null;
  return (
    <div className="space-y-2">
      <p className="hud-value text-[11px] text-white/70">Nearest example: {clues(d.nnPebble)}</p>
      {d.mystery && <p className="hud-value hud-muted text-[10px]">{steps(d.mystery, d.nnPebble)} step(s) away</p>}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] text-white/60">Pip copies</span>
        <KindChip kind={d.nnGuess} />
        <Verdict ok={right} yes="right" no="wrong" />
      </div>
    </div>
  );
}

function NeighboursBody({ d }: { d: Data }) {
  if (d.near3.length === 0) return <Needs names="near3" />;
  return (
    <ol className="space-y-1.5">
      {d.near3.map((p, i) => (
        <li key={i} className="flex items-center gap-2 text-[11px]">
          <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-[#c5ee8a] font-mono text-[9px] font-bold text-[#10200a]">{i + 1}</span>
          <span className="hud-value min-w-0 flex-1 truncate text-white/70">{clues(p)}</span>
          {d.mystery && <span className="hud-value hud-muted shrink-0 text-[10px]">{steps(d.mystery, p)} steps</span>}
          <KindChip kind={p.kind} />
        </li>
      ))}
    </ol>
  );
}

function VoteBody({ d }: { d: Data }) {
  if (!d.trickyVotes || !d.trickyGuess) return <Needs names="tricky_votes and tricky_guess" />;
  const total = KINDS.reduce((a, k) => a + (d.trickyVotes?.[k] ?? 0), 0) || 1;
  return (
    <div className="space-y-2">
      <div className="space-y-1.5">
        {KINDS.map((k) => {
          const n = d.trickyVotes?.[k] ?? 0;
          return (
            <div key={k} className="flex items-center gap-2 text-[11px]">
              <span className="w-[68px] shrink-0 text-white/65">{k}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full" style={{ width: `${(n / total) * 100}%`, background: KIND_COLOR[k], transition: "width .6s ease" }} />
              </div>
              <span className="hud-value w-4 text-right">{n}</span>
            </div>
          );
        })}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-white/10 p-2">
          <p className="hud-label mb-1">1 neighbour</p>
          <KindChip kind={d.trickyK1} />
        </div>
        <div className="rounded-lg border border-white/10 p-2">
          <p className="hud-label mb-1">{d.k ?? "k"} neighbours</p>
          <KindChip kind={d.trickyGuess} />
        </div>
      </div>
      {d.trickyTruth && (
        <p className="flex items-center gap-2 text-[11px] text-white/60">
          Truth: <KindChip kind={d.trickyTruth} /> <Verdict ok={d.trickyGuess === d.trickyTruth} yes="vote is right" no="vote is wrong" />
        </p>
      )}
    </div>
  );
}

function AccuracyBody({ d }: { d: Data }) {
  if (d.basketAccuracy === null) return <Needs names="basket_accuracy" />;
  return (
    <div className="space-y-3">
      <Meter value={d.basketAccuracy} label="Pip on a fresh basket" detail="12 pebbles it never studied" />
      {d.lazyAccuracy !== null && <Meter value={d.lazyAccuracy} color="#9a9a9a" label="Lazy guesser (always roller)" detail="the yardstick to beat" />}
    </div>
  );
}

function SplitBody({ d }: { d: Data }) {
  if (d.trainSet.length === 0 || d.testSet.length === 0) return <Needs names="train_set and test_set" />;
  const total = d.trainSet.length + d.testSet.length;
  return (
    <div className="space-y-2">
      <div className="flex h-5 overflow-hidden rounded-full border border-white/10 text-[10px] font-medium">
        <div className="grid place-items-center bg-[#c5ee8a]/25 text-[#d3f3a4]" style={{ width: `${(d.trainSet.length / total) * 100}%` }}>
          study {d.trainSet.length}
        </div>
        <div className="grid flex-1 place-items-center border-l border-dashed border-white/30 text-white/70">test {d.testSet.length}</div>
      </div>
      <p className="text-[11px] text-white/55">Hollow dots on the map are the hidden test pebbles. Pip never studies them.</p>
    </div>
  );
}

function ScoresBody({ d }: { d: Data }) {
  if (d.trainAccuracy === null || d.testAccuracy === null) return <Needs names="train_accuracy and test_accuracy" />;
  const gap = d.trainAccuracy - d.testAccuracy;
  return (
    <div className="space-y-3">
      <Meter value={d.trainAccuracy} color="#9a9a9a" label="Marked on pebbles it studied" detail="flattering: each finds itself" />
      <Meter value={d.testAccuracy} label="Marked on hidden pebbles" detail={gap > 0 ? `${gap} points lower: the number to trust` : "the number to trust"} />
    </div>
  );
}

function MemoryBody({ d }: { d: Data }) {
  if (d.memoTest === null) return <Needs names="memo_train_accuracy and memo_test_accuracy" />;
  return (
    <div className="space-y-3">
      {d.memoTrain !== null && <Meter value={d.memoTrain} color="#9a9a9a" label="Memoriser, studied pebbles" />}
      <Meter value={d.memoTest} color={BAD} label="Memoriser, hidden pebbles" detail="knows nothing about new pebbles" />
      {d.testAccuracy !== null && <Meter value={d.testAccuracy} label="Neighbours, hidden pebbles" detail="similar pebbles still help" />}
    </div>
  );
}

function FitBody({ d }: { d: Data }) {
  if (d.fitTable.length === 0) return <Needs names="fit_table" />;
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3 text-[10px] text-white/50">
        <span className="inline-flex items-center gap-1">
          <i className="inline-block h-2 w-3 rounded-sm bg-white/35" /> studied
        </span>
        <span className="inline-flex items-center gap-1">
          <i className="inline-block h-2 w-3 rounded-sm bg-[#c5ee8a]" /> hidden
        </span>
      </div>
      {d.fitTable.map((r) => {
        const best = d.bestK === r.k;
        return (
          <div key={r.k} className={`rounded-md px-1.5 py-1 ${best ? "bg-[#c5ee8a]/10 ring-1 ring-[#c5ee8a]/40" : ""}`}>
            <div className="mb-0.5 flex items-center justify-between text-[11px]">
              <span className="hud-value">k = {r.k}</span>
              <span className="hud-value hud-muted text-[10px]">
                {r.train} / {r.test}
                {best ? " · best" : ""}
              </span>
            </div>
            <div className="space-y-0.5">
              <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-white/35" style={{ width: `${r.train}%` }} />
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-[#c5ee8a]" style={{ width: `${r.test}%` }} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function BiasBody({ d }: { d: Data }) {
  if (!d.coveCounts) return <Needs names="cove_counts" />;
  return (
    <div className="space-y-2.5">
      <CountBars counts={d.coveCounts} />
      {d.coveShare !== null && (
        <p className="text-[11px] text-white/65">
          <span className="hud-value" style={{ color: BAD }}>
            {d.coveShare}%
          </span>{" "}
          of the scoop are rollers.
        </p>
      )}
      {d.coveAccuracy !== null && <Meter value={d.coveAccuracy} color={BAD} label="Pip trained on the cove, fresh basket" detail={d.basketAccuracy !== null ? `trained on the whole beach: ${d.basketAccuracy}%` : undefined} />}
    </div>
  );
}

function FairBody({ d }: { d: Data }) {
  if (!d.fairCounts) return <Needs names="fair_counts" />;
  return (
    <div className="space-y-2.5">
      {d.combinedCounts && (
        <div>
          <p className="hud-label mb-1">Both scoops joined</p>
          <CountBars counts={d.combinedCounts} />
        </div>
      )}
      <div>
        <p className="hud-label mb-1">After the quota</p>
        <CountBars counts={d.fairCounts} />
      </div>
      {d.fairAccuracy !== null && (
        <div className="space-y-2">
          {d.coveAccuracy !== null && <Meter value={d.coveAccuracy} color="#9a9a9a" label="Cove only" />}
          <Meter value={d.fairAccuracy} label="Fair pile" />
        </div>
      )}
    </div>
  );
}

function TableBody({ d }: { d: Data }) {
  if (!d.confusion) return <Needs names="confusion_table" />;
  const c = d.confusion;
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[auto_repeat(3,minmax(0,1fr))] gap-1 text-center text-[10.5px]">
        <span className="hud-label self-end text-left">true ↓ guessed →</span>
        {KINDS.map((k) => (
          <span key={k} className="flex items-center justify-center gap-1 text-white/60">
            <Shape kind={k} size={7} />
            <span className="truncate">{k}</span>
          </span>
        ))}
        {KINDS.map((t) => (
          <React.Fragment key={t}>
            <span className="flex items-center gap-1 text-left text-white/60">
              <Shape kind={t} size={7} />
              {t}
            </span>
            {KINDS.map((g) => {
              const n = c[t][g];
              const diag = t === g;
              const bg = n === 0 ? "rgba(255,255,255,0.04)" : diag ? "rgba(197,238,138,0.22)" : "rgba(248,113,113,0.28)";
              return (
                <span key={g} className="hud-value grid h-7 place-items-center rounded-md text-[12px]" style={{ background: bg, color: n === 0 ? "rgba(255,255,255,.35)" : "#f4f4f4" }}>
                  {n}
                </span>
              );
            })}
          </React.Fragment>
        ))}
      </div>
      <p className="text-[11px] text-white/55">
        Green is right, red is a mix-up.
        {d.tableRight !== null ? ` ${d.tableRight} pebbles on the diagonal.` : ""}
      </p>
    </div>
  );
}

function PipelineBody({ d }: { d: Data }) {
  const r = d.report;
  if (!r) return <Needs names="report" />;
  const steps3 = [
    { name: "learn", out: r.k !== null ? `k = ${r.k}` : "?" },
    { name: "test", out: r.testScore !== null ? `${r.testScore}% hidden` : "?", sub: r.basketScore !== null ? `${r.basketScore}% basket` : undefined },
    { name: "guess", out: r.mysteryGuess ?? "?" },
  ];
  return (
    <div className="space-y-2">
      <div className="flex items-stretch gap-1.5">
        {steps3.map((s, i) => (
          <React.Fragment key={s.name}>
            {i > 0 && <span className="hidden self-center text-white/30 @md:block">→</span>}
            <div className="min-w-0 flex-1 rounded-lg border border-[#c5ee8a]/30 bg-[#c5ee8a]/[0.06] px-1 py-1.5 text-center @md:px-2">
              <p className="hud-label !text-[#c5ee8a]">{s.name}</p>
              <p className="hud-value mt-0.5 truncate text-[11.5px]">{asKind(s.out) ? <KindChip kind={s.out} /> : s.out}</p>
              {s.sub && <p className="hud-value hud-muted text-[10px]">{s.sub}</p>}
            </div>
          </React.Fragment>
        ))}
      </div>
      <p className="text-[11px] text-white/55">Your whole program, in three small functions.</p>
    </div>
  );
}

// ───────────────────────── the scene ─────────────────────────

function metaOf(id: string, d: Data): React.ReactNode {
  switch (id) {
    case "pb-accuracy":
      return d.basketAccuracy !== null ? `${d.basketAccuracy}%` : undefined;
    case "pb-scores":
      return d.testAccuracy !== null ? `exam ${d.testAccuracy}%` : undefined;
    case "pb-fit":
      return d.bestK !== null ? `best k = ${d.bestK}` : undefined;
    case "pb-vote":
      return d.k !== null ? `k = ${d.k}` : undefined;
    case "pb-fair":
      return d.fairAccuracy !== null ? `${d.fairAccuracy}%` : undefined;
    default:
      return undefined;
  }
}

export default function AiFirstStepsScene({ program, unlocked, focus, celebration, interactive, autoplay }: SceneProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(true);
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);
  const [hover, setHover] = useState<number | null>(null);
  const [spot, setSpot] = useState(0);
  const un = unlocked;

  // The program handle is new on every run, so this re-reads the learner's variables exactly then.
  const data = useMemo(() => readData(program), [program]);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    if (typeof ResizeObserver !== "undefined") {
      const ro = new ResizeObserver(([entry]) => {
        setWidth(Math.round(entry.contentRect.width));
        setHeight(Math.round(entry.contentRect.height));
      });
      ro.observe(el);
      if (typeof IntersectionObserver === "undefined") return () => ro.disconnect();
      const io = new IntersectionObserver(([entry]) => setActive(entry.isIntersecting));
      io.observe(el);
      return () => {
        ro.disconnect();
        io.disconnect();
      };
    }
  }, []);

  const alive = (id: string) => !!program && un.has(id);
  const live = PANELS.filter((p) => alive(p.id)).length;
  const flash = new Set(celebration?.features ?? []);
  const wide = width >= 700;
  const narrow = width < 520;

  // The landing page and project hub have no scrolling and no pointer: show one live card at a time.
  const tour = !interactive;
  const aliveCards = CARD_IDS.filter((id) => alive(id));
  useEffect(() => {
    if (!tour || !active || aliveCards.length < 2) return;
    const id = setInterval(() => setSpot((n) => n + 1), 5200);
    return () => clearInterval(id);
  }, [tour, active, aliveCards.length]);
  const spotId = aliveCards.length ? aliveCards[spot % aliveCards.length] : null;

  const body = (id: string): React.ReactNode => {
    switch (id) {
      case "pb-rule":
        return <RuleBody d={data} />;
      case "pb-beach":
        return <BeachBody d={data} />;
      case "pb-distance":
        return <DistanceBody d={data} />;
      case "pb-nearest":
        return <NearestBody d={data} />;
      case "pb-neighbours":
        return <NeighboursBody d={data} />;
      case "pb-vote":
        return <VoteBody d={data} />;
      case "pb-accuracy":
        return <AccuracyBody d={data} />;
      case "pb-split":
        return <SplitBody d={data} />;
      case "pb-scores":
        return <ScoresBody d={data} />;
      case "pb-memory":
        return <MemoryBody d={data} />;
      case "pb-fit":
        return <FitBody d={data} />;
      case "pb-bias":
        return <BiasBody d={data} />;
      case "pb-fair":
        return <FairBody d={data} />;
      case "pb-table":
        return <TableBody d={data} />;
      default:
        return <PipelineBody d={data} />;
    }
  };

  const card = (id: string) =>
    alive(id) ? (
      <PanelFrame key={flash.has(id) ? `${id}:${celebration?.nonce}` : id} id={id} meta={metaOf(id, data)} focus={focus === id} flash={flash.has(id)}>
        {body(id)}
      </PanelFrame>
    ) : (
      <LockedPanel key={id} id={id} spot={focus === id} />
    );

  const focused = CARD_IDS.includes(focus ?? "") ? (focus as string) : null;
  const ordered = focused ? [focused, ...CARD_IDS.filter((id) => id !== focused)] : CARD_IDS;

  // Non-scrolling and short stages (landing page, project hub card) fit the map into the space they have.
  const mapMaxH = (tour || height < 560) && height > 0 ? Math.max(170, height - 44 - 46 - 30 - 36) : undefined;
  const hovered = hover !== null ? data.pebbles[hover] : null;
  const mapPanel = (
    <section data-panel="pb-beach" className={`hud-panel min-w-0 px-3 py-2.5 ${focus === "pb-beach" ? "border-[#c5ee8a]/40" : ""} ${flash.has("pb-beach") ? "pop-in" : ""}`}>
      <header className="mb-1.5 flex min-w-0 items-center gap-2">
        <Compass className="h-3.5 w-3.5 shrink-0 text-[#c5ee8a]" aria-hidden />
        <h3 className="hud-title min-w-0 flex-1 truncate">Beach map</h3>
        <span className="hud-value hud-muted shrink-0 text-[10px]">{alive("pb-beach") ? `${data.pebbles.length} pebbles` : "locked · L2"}</span>
      </header>
      <BeachMap data={data} unlocked={un} hover={hover} setHover={setHover} motion={active && (interactive || !!autoplay)} maxH={mapMaxH} />
      <div className="mt-1.5 flex min-h-[20px] flex-wrap items-center gap-x-3 gap-y-1">
        {KINDS.map((k) => (
          <span key={k} className="inline-flex items-center gap-1 text-[10.5px] text-white/60">
            <Shape kind={k} size={8} />
            {k}
          </span>
        ))}
        {alive("pb-beach") && (data.mystery || data.tricky) && (
          <span className="inline-flex items-center gap-1 text-[10.5px] text-white/60">
            <svg width="12" height="12" viewBox="-7 -7 14 14" aria-hidden>
              <circle r="5.5" fill="none" stroke={LIME} strokeWidth="1.8" />
            </svg>
            new pebble
          </span>
        )}
        <span className="hud-value hud-muted ml-auto text-[10px]">{hovered ? `${clues(hovered)}${hovered.kind ? ` → ${hovered.kind}` : ""}` : alive("pb-beach") ? "hover or tap a pebble" : ""}</span>
      </div>
    </section>
  );

  const header = (
    <div className="mb-3 flex min-w-0 shrink-0 items-baseline gap-x-3 px-0.5">
      <h2 className="hud-title min-w-0 truncate">Pebble Beach · Pip&apos;s sorting lab</h2>
      <span className="hud-label ml-auto shrink-0">
        <span className={`hud-value ${live > 0 ? "hud-accent" : "text-white/45"}`}>{live}</span>/{PANELS.length} parts live
      </span>
    </div>
  );

  const spotlight = (
    <div className="min-w-0">
      {spotId ? (
        <div key={spotId} className="pop-in">
          {card(spotId)}
        </div>
      ) : (
        card("pb-rule")
      )}
      {aliveCards.length > 1 && (
        <div className="mt-2 flex justify-center gap-1" aria-hidden>
          {aliveCards.map((id) => (
            <span key={id} className={`h-1 rounded-full transition-all ${id === spotId ? "w-4 bg-[#c5ee8a]" : "w-1 bg-white/20"}`} />
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div ref={rootRef} className={`@container absolute inset-0 ${interactive ? "overflow-y-auto overscroll-contain" : "overflow-hidden"}`}>
      <div className="px-3 pb-3 pt-11 @3xl:px-4">
        {header}
        {tour && wide ? (
          <div className="grid grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] items-start gap-3">
            {mapPanel}
            {spotlight}
          </div>
        ) : tour ? (
          <div className="space-y-3">
            {mapPanel}
            {!narrow && spotlight}
          </div>
        ) : (
          <div className="grid gap-3 @3xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] @3xl:items-start">
            <div className="min-w-0 @3xl:sticky @3xl:top-11">{mapPanel}</div>
            <div className="grid min-w-0 gap-3 @xl:grid-cols-2 @3xl:grid-cols-1">{ordered.map((id) => card(id))}</div>
          </div>
        )}
      </div>
    </div>
  );
}
