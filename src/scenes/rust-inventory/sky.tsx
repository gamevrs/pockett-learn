"use client";

import React from "react";
import { bandOf, plural, clamp, type StarRec } from "./data";
import { C } from "./ui";

/**
 * The sky chart: right ascension across (hours increase to the left, like a real sky chart),
 * declination up the side. Every dot is a record the learner's program produced; the size follows
 * the magnitude. Stars and labels are HTML laid over a plain SVG grid so the text stays crisp at any
 * stage size. Labels are placed greedily (brightest first) and dropped when they would collide.
 */

export type SkyStatus = "locked" | "waiting" | "live";

interface Box {
  w: number;
  h: number;
}

function useBox(): [Box | null, (el: HTMLDivElement | null) => void | (() => void)] {
  const [box, setBox] = React.useState<Box | null>(null);
  const ref = React.useCallback((el: HTMLDivElement | null) => {
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setBox((prev) => (prev && Math.abs(prev.w - width) < 1 && Math.abs(prev.h - height) < 1 ? prev : { w: width, h: height }));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [box, ref];
}

const PAD_L = 30;
const PAD_R = 12;
const PAD_T = 26;
const PAD_B = 22;

const radius = (mag: number) => clamp(4.6 - mag * 1.25, 1.8, 7.4);

interface Placed {
  star: StarRec;
  x: number;
  y: number;
  r: number;
  label: { x: number; y: number; w: number; align: "left" | "right" | "center" } | null;
}

/** The declination range to draw: the stars' own span, padded to multiples of 30 degrees (full sky when empty). */
export function decRange(records: StarRec[]): [number, number] {
  if (records.length === 0) return [-90, 90];
  const lo = Math.min(...records.map((r) => r.dec));
  const hi = Math.max(...records.map((r) => r.dec));
  let a = clamp(Math.floor((lo - 3) / 30) * 30, -90, 60);
  let b = clamp(Math.ceil((hi + 3) / 30) * 30, -60, 90);
  if (b - a < 90) {
    // keep a sensible aspect: widen towards the middle of the sky
    if (a > -60) a = Math.max(-90, a - 30);
    if (b - a < 90) b = Math.min(90, b + 30);
  }
  return [a, b];
}

function layout(records: StarRec[], box: Box, maxLabels: number, dMin: number, dMax: number): Placed[] {
  const plotW = Math.max(40, box.w - PAD_L - PAD_R);
  const plotH = Math.max(40, box.h - PAD_T - PAD_B);
  const placed: Placed[] = records.map((star) => ({
    star,
    x: PAD_L + ((24 - clamp(star.ra, 0, 24)) / 24) * plotW,
    y: PAD_T + ((dMax - clamp(star.dec, dMin, dMax)) / (dMax - dMin)) * plotH,
    r: radius(star.mag),
    label: null,
  }));
  const taken: { x0: number; y0: number; x1: number; y1: number }[] = placed.map((p) => ({ x0: p.x - p.r - 1, y0: p.y - p.r - 1, x1: p.x + p.r + 1, y1: p.y + p.r + 1 }));
  const hit = (a: { x0: number; y0: number; x1: number; y1: number }, skip: number) =>
    taken.some((b, i) => i !== skip && a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0);
  const labelBoxes: { x0: number; y0: number; x1: number; y1: number }[] = [];
  const order = placed.map((p, i) => i).sort((a, b) => placed[a].star.mag - placed[b].star.mag);
  let shown = 0;
  for (const i of order) {
    if (shown >= maxLabels) break;
    const p = placed[i];
    const w = p.star.name.length * 5.9 + 4;
    const h = 12;
    const candidates: { x: number; y: number; align: "left" | "right" | "center" }[] = [
      { x: p.x + p.r + 3, y: p.y - h / 2, align: "left" },
      { x: p.x - p.r - 3 - w, y: p.y - h / 2, align: "right" },
      { x: p.x - w / 2, y: p.y + p.r + 2, align: "center" },
      { x: p.x - w / 2, y: p.y - p.r - 2 - h, align: "center" },
    ];
    for (const c of candidates) {
      const rect = { x0: c.x, y0: c.y, x1: c.x + w, y1: c.y + h };
      if (rect.x0 < 2 || rect.x1 > box.w - 2 || rect.y0 < 2 || rect.y1 > box.h - 14) continue;
      if (hit(rect, i) || labelBoxes.some((b) => rect.x0 < b.x1 && rect.x1 > b.x0 && rect.y0 < b.y1 && rect.y1 > b.y0)) continue;
      labelBoxes.push(rect);
      p.label = { x: c.x, y: c.y, w, align: c.align };
      shown++;
      break;
    }
  }
  return placed;
}

const GHOST_STARS: [number, number, number][] = [
  [0.12, 0.3, 3],
  [0.22, 0.62, 2],
  [0.31, 0.22, 4],
  [0.38, 0.5, 2],
  [0.47, 0.34, 3],
  [0.55, 0.7, 2],
  [0.63, 0.28, 4],
  [0.72, 0.52, 2],
  [0.8, 0.2, 3],
  [0.9, 0.62, 2],
];

export function SkyChart({
  records,
  status,
  focus = false,
  flash = false,
  compact = false,
  generation = 0,
  note,
}: {
  records: StarRec[] | undefined;
  status: SkyStatus;
  focus?: boolean;
  flash?: boolean;
  compact?: boolean;
  generation?: number;
  note?: string;
}) {
  const [box, boxRef] = useBox();
  const list = status === "live" && records ? records : [];
  const [dMin, dMax] = decRange(list);
  const placed = box && list.length > 0 ? layout(list, box, compact ? 7 : 16, dMin, dMax) : [];
  const plotW = box ? Math.max(40, box.w - PAD_L - PAD_R) : 0;
  const plotH = box ? Math.max(40, box.h - PAD_T - PAD_B) : 0;

  // faint constellation lines: stars of one constellation joined in right-ascension order
  const lines: { key: string; pts: Placed[] }[] = [];
  if (placed.length > 0) {
    const groups = new Map<string, Placed[]>();
    for (const p of placed) {
      const g = groups.get(p.star.constellation) ?? [];
      g.push(p);
      groups.set(p.star.constellation, g);
    }
    for (const [key, pts] of groups) if (pts.length >= 2) lines.push({ key, pts: [...pts].sort((a, b) => a.x - b.x) });
  }

  const constellations = new Set(list.map((s) => s.constellation)).size;
  const hours = [0, 3, 6, 9, 12, 15, 18, 21, 24];
  const decs = [90, 60, 30, 0, -30, -60, -90].filter((d) => d >= dMin && d <= dMax);

  return (
    <section data-panel="ob-sky" data-status={status} className={`hud-panel relative min-w-0 overflow-hidden !p-0 ${focus ? "border-[#c5ee8a]/35" : ""} ${flash ? "pop-in" : ""}`}>
      <div
        ref={boxRef}
        className={`relative w-full ${compact ? "h-full min-h-[120px]" : "aspect-[4/3] min-h-[220px] @xl:aspect-[16/8] @3xl:aspect-[16/6] @5xl:aspect-[4/1]"}`}
        style={{ background: "radial-gradient(ellipse at 50% 120%, rgba(60,70,130,0.35) 0%, rgba(14,16,30,0.9) 55%, rgba(8,8,12,0.96) 100%)" }}
      >
        {box && (
          <svg className="absolute inset-0 h-full w-full" viewBox={`0 0 ${box.w} ${box.h}`} aria-hidden>
            {hours.map((h) => {
              const x = PAD_L + ((24 - h) / 24) * plotW;
              return <path key={h} d={`M${x} ${PAD_T} V${PAD_T + plotH}`} stroke="rgba(255,255,255,0.07)" />;
            })}
            {decs.map((d) => {
              const y = PAD_T + ((dMax - d) / (dMax - dMin)) * plotH;
              return <path key={d} d={`M${PAD_L} ${y} H${PAD_L + plotW}`} stroke={d === 0 ? "rgba(138,164,255,0.3)" : "rgba(255,255,255,0.07)"} strokeDasharray={d === 0 ? "4 4" : undefined} />;
            })}
            {hours
              .filter((h) => h % 6 === 0 || !compact)
              .map((h) => (
                <text key={h} x={PAD_L + ((24 - h) / 24) * plotW} y={box.h - 6} textAnchor="middle" fontSize="9.5" fill="rgba(255,255,255,0.62)" fontFamily="var(--font-mono), monospace">
                  {h}h
                </text>
              ))}
            {decs
              .filter((d) => !compact || d % 60 === 0 || d === 0)
              .map((d) => (
                <text key={d} x={PAD_L - 5} y={PAD_T + ((dMax - d) / (dMax - dMin)) * plotH + 3} textAnchor="end" fontSize="9.5" fill="rgba(255,255,255,0.62)" fontFamily="var(--font-mono), monospace">
                  {d > 0 ? `+${d}` : d}°
                </text>
              ))}
            {lines.map((l) => (
              <path key={l.key} d={"M" + l.pts.map((p) => `${p.x} ${p.y}`).join(" L")} fill="none" stroke="rgba(138,164,255,0.38)" strokeWidth="1" />
            ))}
            {status !== "live" &&
              GHOST_STARS.map(([fx, fy, r], i) => <circle key={i} cx={PAD_L + fx * plotW} cy={PAD_T + fy * plotH} r={r} fill="none" stroke="rgba(255,255,255,0.28)" strokeDasharray="2 3" />)}
          </svg>
        )}

        {placed.map((p, i) => {
          const band = bandOf(p.star.mag);
          const size = p.r * 2;
          return (
            <React.Fragment key={`${p.star.name}-${i}`}>
              <span
                title={`${p.star.name}: ${p.star.constellation}, magnitude ${p.star.mag}${p.star.dist !== undefined ? `, ${p.star.dist} ly` : ""}`}
                className="cp-twinkle absolute rounded-full"
                style={{
                  left: p.x - p.r,
                  top: p.y - p.r,
                  width: size,
                  height: size,
                  background: band === "dim" ? "#d9dcc9" : "#fffdf0",
                  boxShadow: band === "brilliant" ? `0 0 ${p.r * 2.4}px ${p.r * 0.7}px rgba(197,238,138,0.5)` : band === "bright" ? `0 0 ${p.r * 1.6}px ${p.r * 0.3}px rgba(197,238,138,0.32)` : `0 0 ${p.r}px rgba(197,238,138,0.2)`,
                  ["--i" as string]: i,
                }}
              />
              {p.label && (
                <span
                  className="pointer-events-none absolute whitespace-nowrap font-mono text-[10px] leading-[12px] text-[#d3f3a4]"
                  style={{ left: p.label.x, top: p.label.y, width: p.label.w, textAlign: p.label.align === "center" ? "center" : p.label.align === "right" ? "right" : "left" }}
                >
                  {p.star.name}
                </span>
              )}
            </React.Fragment>
          );
        })}

        {status === "live" && list.length > 0 && (
          <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
            <span key={generation} className="cp-sweep absolute inset-y-0 w-16 bg-gradient-to-r from-transparent to-[#c5ee8a]/30" />
          </div>
        )}

        <div className="pointer-events-none absolute left-2.5 top-2 flex items-center gap-2">
          <span className="hud-label !text-white/70">Sky chart</span>
          {status === "live" && list.length > 0 && (
            <span className="hud-value text-[10px] text-[#d3f3a4]">
              {plural(list.length, "star")}
              {!compact && ` · ${plural(constellations, "constellation")}`}
            </span>
          )}
        </div>
        {!compact && status === "live" && list.length > 0 && (
          <div className="pointer-events-none absolute right-2.5 top-2 hidden items-center gap-2.5 @lg:flex">
            {([
              ["brilliant", 5],
              ["bright", 3.4],
              ["dim", 2.2],
            ] as const).map(([name, r]) => (
              <span key={name} className="flex items-center gap-1 text-[9.5px] text-white/65">
                <span className="rounded-full bg-[#fffdf0]" style={{ width: r * 2, height: r * 2 }} />
                {name}
              </span>
            ))}
          </div>
        )}

        {status !== "live" && (
          <div className="absolute inset-0 grid place-items-center px-6 text-center">
            <p className="max-w-[26rem] rounded-md bg-black/55 px-3 py-1.5 font-mono text-[10.5px] leading-snug text-white/75">
              {status === "locked" ? (
                <>
                  <span className={focus ? "hud-accent" : ""}>{focus ? "Your code powers this · " : "Locked · "}</span>
                  {note ?? "Lesson 3 plots every record you parse"}
                </>
              ) : (
                (note ?? "Unlocked. Press Run to plot your stars.")
              )}
            </p>
          </div>
        )}
        {status === "live" && list.length === 0 && (
          <div className="absolute inset-0 grid place-items-center px-6 text-center">
            <p className="rounded-md bg-black/55 px-3 py-1.5 font-mono text-[10.5px] text-white/75">No records yet. Send them with scene(&quot;records&quot;, …);</p>
          </div>
        )}
      </div>
    </section>
  );
}

/** Colour used for a band in lists and bars. */
export function bandColor(band: string): string {
  const b = band.toLowerCase();
  return b === "brilliant" ? C.cream : b === "bright" ? C.lime : "#9aa39a";
}
