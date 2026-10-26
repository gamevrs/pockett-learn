"use client";

/**
 * The sorting belt: fruit ride a conveyor under the scanner, the learner's functions read each one,
 * and it drops into the bin their code chose. Lesson 1 switches it on (label), lesson 5/6 swap the
 * decision for the nearest-neighbour vote, lesson 16 shows the whole `sort_fruit` verdict.
 */
import React, { useEffect, useRef, useSyncExternalStore } from "react";
import { Lock } from "lucide-react";
import { BAD, FEAT_UNIT, KINDS, KIND_COLOR, KIND_NAME, LIME, RIPE_COLOR, type Kind, type Row } from "./data.ts";
import { BELT_H, BELT_W, BELT_Y, BIN_TOP, BIN_X, SCAN_X, type BeltFruit, type BeltSim, type BeltSnapshot } from "./belt.ts";
import type { Inspection, View } from "./store.ts";
import { Chip, NeedsHook, PANEL, money } from "./ui.tsx";

/** Paint colour for a fruit, tied to its measured hue but kept inside what that kind can look like. */
export function fruitColor(row: Row): string {
  const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
  if (row.kind === "plum") return `hsl(${clamp(268 + (row.hue - 235) * 0.2, 250, 296)} 46% 46%)`;
  if (row.kind === "pear") return `hsl(${clamp(52 + (row.hue - 62) * 0.5, 42, 92)} 62% 52%)`;
  return `hsl(${clamp(row.hue, 0, 105)} 66% 50%)`;
}

export function FruitShape({ kind, color, r }: { kind: Kind; color: string; r: number }) {
  return (
    <g transform={`scale(${r})`}>
      {kind === "apple" && (
        <>
          <path d="M0 -0.78 C 0.35 -1.05 1 -0.85 1 -0.1 C 1 0.6 0.55 1 0 0.9 C -0.55 1 -1 0.6 -1 -0.1 C -1 -0.85 -0.35 -1.05 0 -0.78Z" fill={color} />
          <path d="M0 -0.78 Q 0.05 -1.1 0.22 -1.28" stroke="#6b4a2b" strokeWidth="0.12" fill="none" strokeLinecap="round" />
          <ellipse cx="0.42" cy="-1.1" rx="0.3" ry="0.13" transform="rotate(-28 0.42 -1.1)" fill="#7bc96f" />
        </>
      )}
      {kind === "pear" && (
        <>
          <path d="M0 -1.15 C 0.32 -1.15 0.38 -0.55 0.55 -0.15 C 0.95 0.35 0.85 1 0 1 C -0.85 1 -0.95 0.35 -0.55 -0.15 C -0.38 -0.55 -0.32 -1.15 0 -1.15Z" fill={color} />
          <path d="M0 -1.12 Q 0.04 -1.35 0.2 -1.5" stroke="#6b4a2b" strokeWidth="0.1" fill="none" strokeLinecap="round" />
          <ellipse cx="0.36" cy="-1.36" rx="0.26" ry="0.11" transform="rotate(-24 0.36 -1.36)" fill="#7bc96f" />
        </>
      )}
      {kind === "plum" && (
        <>
          <ellipse cx="0" cy="0" rx="0.92" ry="1" fill={color} />
          <path d="M0 -0.92 C 0.22 -0.3 0.22 0.4 0 0.92" stroke="rgba(0,0,0,0.28)" strokeWidth="0.09" fill="none" />
          <path d="M0 -0.95 Q 0 -1.2 0.12 -1.32" stroke="#6b4a2b" strokeWidth="0.09" fill="none" strokeLinecap="round" />
        </>
      )}
      <ellipse cx="-0.36" cy="-0.32" rx="0.26" ry="0.17" transform="rotate(-35 -0.36 -0.32)" fill="#ffffff" opacity="0.28" />
    </g>
  );
}

const SOURCE_NOTE: Record<Inspection["source"], string> = { label: "label", nn: "nearest", knn: "vote", sorter: "sorter" };

function tagOf(insp: Inspection): { text: string; kind: Kind | null; wrong: boolean } {
  const kind = insp.predicted ?? insp.label;
  const wrong = !!insp.predicted && insp.predicted !== insp.row.kind;
  if (!kind) return { text: "?", kind: null, wrong: false };
  let text = KIND_NAME[kind].toLowerCase();
  if (insp.source === "knn" && insp.votes && insp.votes[kind]) {
    const total = Object.values(insp.votes).reduce((a, b) => a + (b ?? 0), 0);
    text += ` ${insp.votes[kind]}/${total}`;
  }
  if (insp.source === "sorter") {
    if (insp.ripe !== null) text += insp.ripe ? " · ripe" : " · green";
    if (insp.price !== null) text += ` · ${money(insp.price)}`;
  }
  if (insp.source === "label") text = `label: ${text}`;
  if (insp.source !== "sorter" && insp.source !== "label" && insp.ripe !== null) text += insp.ripe ? " · ripe" : " · green";
  return { text, kind, wrong };
}

function Tag({ f, fs }: { f: BeltFruit; fs: number }) {
  if (!f.insp) return null;
  const tag = tagOf(f.insp);
  const w = tag.text.length * 0.63 * fs + 14;
  const color = tag.wrong ? BAD : tag.kind ? KIND_COLOR[tag.kind] : "#9f9f9f";
  return (
    <g transform={`translate(0 ${-f.r - 8 - fs * 0.9 - (f.id % 2) * fs * 2.1})`}>
      <rect x={-w / 2} y={-fs * 0.95} width={w} height={fs * 1.7} rx={fs * 0.85} fill="rgba(10,10,10,0.88)" stroke={color} strokeOpacity={0.7} strokeWidth={1} />
      <text x={0} y={fs * 0.28} textAnchor="middle" fontSize={fs} fontFamily="var(--font-mono)" fill={color} fontWeight="600">
        {tag.wrong ? "✗ " : ""}
        {tag.text}
      </text>
    </g>
  );
}

function usePrefersReducedMotion() {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
}

function Conveyor({ alive, still }: { alive: boolean; still: boolean }) {
  const slots = KINDS.map((k) => BIN_X[k]);
  return (
    <g>
      <rect x={-2} y={BELT_Y} width={BELT_W + 4} height={13} rx={6.5} fill="#1d1d1d" stroke={alive ? "rgba(255,255,255,0.14)" : "rgba(197,238,138,0.28)"} strokeDasharray={alive ? undefined : "4 4"} />
      {alive && (
        <line x1={0} x2={BELT_W} y1={BELT_Y + 6.5} y2={BELT_Y + 6.5} stroke="rgba(255,255,255,0.16)" strokeWidth={4} strokeDasharray="3 13">
          {!still && <animate attributeName="stroke-dashoffset" from="16" to="0" dur="0.45s" repeatCount="indefinite" />}
        </line>
      )}
      {slots.map((x) => (
        <rect key={x} x={x - 12} y={BELT_Y - 1} width={24} height={15} fill="#0a0a0a" />
      ))}
      {[40, 150, 260, 370, 480, 590].map((x) => (
        <rect key={x} x={x} y={BELT_Y + 13} width={5} height={14} fill="#161616" />
      ))}
    </g>
  );
}

export function Belt({ view, sim, alive, focus, flash, narrow }: { view: View; sim: BeltSim; alive: boolean; focus: boolean; flash: boolean; narrow: boolean }) {
  const fs = narrow ? 12.5 : 8.6;
  const bf = narrow ? 1.2 : 1;
  const snap: BeltSnapshot = useSyncExternalStore(sim.subscribe, sim.getSnapshot, sim.getSnapshot);
  const nodes = useRef(new Map<number, SVGGElement>());
  const still = usePrefersReducedMotion();
  const missing = view.missing["oa-belt"];
  const def = PANEL["oa-belt"];

  // The animation loop moves fruit by writing transforms straight to the DOM; React only re-renders on events.
  useEffect(() => {
    let raf = 0;
    let last = 0;
    const frame = (t: number) => {
      raf = requestAnimationFrame(frame);
      if (typeof document !== "undefined" && document.hidden) {
        last = t;
        return;
      }
      const dt = last ? (t - last) / 1000 : 0;
      last = t;
      sim.step(dt);
      for (const f of sim.live()) nodes.current.get(f.id)?.setAttribute("transform", `translate(${f.x.toFixed(1)} ${f.y.toFixed(1)})`);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [sim]);

  const last = snap.last;
  const feats = last ? (last.feats ?? [last.row.weight, last.row.diameter, last.row.hue, last.row.sugar]) : null;
  const verdict = last ? tagOf(last) : null;
  const sorted = snap.total;
  const meta = alive ? (
    <span className="flex items-center gap-1.5">
      <span>{sorted} sorted</span>
      {snap.wrong > 0 && <span style={{ color: BAD }}>{snap.wrong} wrong</span>}
    </span>
  ) : (
    <span>L{def.lesson}</span>
  );

  return (
    <section data-panel="oa-belt" className={`hud-panel min-w-0 px-3 py-2.5 ${focus ? "border-[#c5ee8a]/40" : ""} ${flash ? "pop-in" : ""} ${alive ? "" : "border-dashed"}`}>
      <header className="mb-1 flex min-w-0 items-center gap-2">
        {alive ? <def.icon className="h-3.5 w-3.5 shrink-0 text-[#c5ee8a]" aria-hidden /> : <Lock className="h-3 w-3 shrink-0 text-white/35" aria-hidden />}
        <h3 className="hud-title min-w-0 flex-1 truncate">Orchard sorting belt</h3>
        <span className="hud-value hud-muted shrink-0 text-[10px]">{meta}</span>
      </header>

      <svg viewBox={`${narrow ? 118 : 0} -16 ${narrow ? BELT_W - 118 : BELT_W} ${BELT_H + 16}`} className="block h-auto w-full" role="img" aria-label="Fruit riding a conveyor belt past a scanner and into three bins">
        <Conveyor alive={alive} still={still} />

        {/* scanner gantry */}
        <g>
          <rect x={SCAN_X - 22} y={BELT_Y - 62} width={44} height={6} rx={3} fill="#2b2b2b" />
          <rect x={SCAN_X - 22} y={BELT_Y - 62} width={5} height={62} fill="#232323" />
          <rect x={SCAN_X + 17} y={BELT_Y - 62} width={5} height={62} fill="#232323" />
          <rect x={SCAN_X - 15} y={BELT_Y - 56} width={30} height={3} rx={1.5} fill={alive ? LIME : "rgba(197,238,138,0.3)"} opacity={alive ? 0.9 : 1} />
          {alive && <rect key={snap.scans} x={SCAN_X - 14} y={BELT_Y - 52} width={28} height={52} fill={LIME} opacity={0}>
            <animate attributeName="opacity" values="0.38;0" dur="0.7s" fill="freeze" />
          </rect>}
        </g>

        {!alive && (
          <g fill="none" stroke="rgba(197,238,138,0.28)" strokeDasharray="3 4">
            {[70, 330].map((x, i) => (
              <circle key={x} cx={x} cy={BELT_Y - 15} r={i ? 13 : 15} />
            ))}
            <text x={BELT_W / 2 - 40} y={BELT_Y - 36} fill="rgba(255,255,255,0.45)" stroke="none" fontSize="11" fontFamily="var(--font-mono)">
              Lesson 1 switches the belt on
            </text>
          </g>
        )}

        {/* fruit */}
        <g>
          {snap.fruits.map((f) => (
            <g
              key={f.id}
              ref={(el) => {
                if (el) {
                  nodes.current.set(f.id, el);
                  el.setAttribute("transform", `translate(${f.x.toFixed(1)} ${f.y.toFixed(1)})`);
                } else nodes.current.delete(f.id);
              }}
            >
              <FruitShape kind={f.row.kind} color={fruitColor(f.row)} r={f.r} />
              {f.phase !== "drop" && <Tag f={f} fs={fs} />}
            </g>
          ))}
        </g>

        {/* bins in front of the falling fruit */}
        {KINDS.map((k) => {
          const x = BIN_X[k];
          const c = snap.counts[k];
          return (
            <g key={k}>
              <path d={`M${x - 33} ${BIN_TOP} L${x + 33} ${BIN_TOP} L${x + 29} ${BELT_H - 4} L${x - 29} ${BELT_H - 4}Z`} fill="#131313" stroke={KIND_COLOR[k]} strokeOpacity={alive ? 0.55 : 0.2} strokeDasharray={alive ? undefined : "3 3"} />
 <text x={x} y={BIN_TOP + 14} textAnchor="middle" fontSize={9 * bf} fontFamily="var(--font-mono)" fill={KIND_COLOR[k]} opacity={alive ? 0.95 : 0.4} letterSpacing="0.06em">
                {KIND_NAME[k].toUpperCase()}
              </text>
               <text x={x} y={BIN_TOP + 33} textAnchor="middle" fontSize={17 * bf} fontFamily="var(--font-mono)" fontWeight="600" fill="#f4f4f4" opacity={alive ? 1 : 0.25}>
                {c.n}
              </text>
              {c.wrong > 0 && (
                 <text x={x} y={BIN_TOP + 44} textAnchor="middle" fontSize={8 * bf} fontFamily="var(--font-mono)" fill={BAD}>
                  {c.wrong} wrong
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {alive ? (
        missing ? (
          <NeedsHook name={missing} />
        ) : (
          <div className="mt-1 grid gap-x-3 gap-y-0.5 font-mono text-[10.5px] leading-snug @lg:grid-cols-[1.1fr_1fr]">
            <p className="hud-muted">
              {feats ? (
                <>
                  {(["weight", "diameter", "hue", "sugar"] as const).map((n, i) => (
                    <span key={n} className="mr-2 inline-block whitespace-nowrap">
                      {n} <span className="text-white/85">{Math.round(feats[i] * 10) / 10}</span>
                      <span className="text-white/35"> {FEAT_UNIT[n]}</span>
                    </span>
                  ))}
                </>
              ) : (
                "Waiting for the first fruit…"
              )}
            </p>
            <p>
              {last && verdict ? (
                <>
                  <span className="hud-muted">{SOURCE_NOTE[last.source]} says </span>
                  <span style={{ color: verdict.kind ? KIND_COLOR[verdict.kind] : undefined }}>{verdict.kind ?? "?"}</span>
                  <span className="hud-muted"> · truth </span>
                  <span style={{ color: KIND_COLOR[last.row.kind] }}>{last.row.kind}</span>
                  {verdict.wrong ? <span style={{ color: BAD }}> ✗</span> : last.source !== "label" ? <span className="hud-accent"> ✓</span> : null}
                  {last.ripe !== null && (
                    <span className="ml-2" style={{ color: last.ripe ? RIPE_COLOR : "#7dd3a8" }}>
                      {last.ripe ? "ripe" : "not ripe"}
                    </span>
                  )}
                </>
              ) : (
                <Chip>scanner ready</Chip>
              )}
            </p>
          </div>
        )
      ) : (
        <p className="mt-1 truncate font-mono text-[10px] text-white/40">Locked · {def.clause}</p>
      )}
    </section>
  );
}
