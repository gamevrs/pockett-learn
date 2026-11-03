"use client";

import React, { useSyncExternalStore } from "react";
import { pickDrones, type Fleet, type Kind } from "./data";
import { Frame } from "../rust-inventory/ui";

/**
 * The hero of the fleet board: Skerry Post's harbour grid. The depot and the drones parked at it appear
 * with the roster; the islands, route and flight vectors appear when the operators lesson is passed.
 * Everything drawn comes from the learner's scene data. North is up, one grid cell is one step.
 */

const W = 420;
const H = 210;
const PAD = 26;
const STRIP = 44; // height of the parked-drones strip along the bottom

type Pt = [number, number];

const COLOR: Record<Kind, string> = { Sparrow: "#c5ee8a", Heron: "#fbbf24", Glider: "#8aa4ff", Unknown: "#a3a3a3" };

const subscribeMotion = (notify: () => void) => {
  const q = window.matchMedia("(prefers-reduced-motion: reduce)");
  q.addEventListener("change", notify);
  return () => q.removeEventListener("change", notify);
};

function useReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeMotion,
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
}

function glyph(kind: Kind, x: number, y: number) {
  const c = COLOR[kind];
  if (kind === "Heron")
    return (
      <g transform={`translate(${x} ${y})`} stroke={c} strokeWidth="1.5" fill="none" strokeLinecap="round">
        <path d="M-9 -4 H9 M-9 4 H9" />
        <rect x="-4" y="-4" width="8" height="8" rx="1.5" fill={c} fillOpacity=".25" />
      </g>
    );
  if (kind === "Glider")
    return (
      <g transform={`translate(${x} ${y})`} stroke={c} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M-10 3 L0 -3 L10 3 L0 1 Z" fill={c} fillOpacity=".25" />
        <path d="M0 -3 V8" />
      </g>
    );
  return (
    <g transform={`translate(${x} ${y})`} stroke={c} strokeWidth="1.5" fill="none" strokeLinecap="round">
      <path d="M-6 -6 L6 6 M6 -6 L-6 6" />
      {[
        [-6, -6],
        [6, -6],
        [-6, 6],
        [6, 6],
      ].map(([px, py], i) => (
        <circle key={i} cx={px} cy={py} r="3" strokeOpacity=".7" />
      ))}
    </g>
  );
}

export function HarbourMap({ fleet, unlocked, autoplay, compact }: { fleet: Fleet; unlocked: ReadonlySet<string>; autoplay: boolean; compact: boolean }) {
  const reduced = useReducedMotion();
  const live = unlocked.has("df-roster");
  const mapLive = unlocked.has("df-harbour") && !!fleet.harbour;
  const h = mapLive ? fleet.harbour : undefined;
  const drones = live ? pickDrones(fleet) : [];

  // bounds: the points we know, or a default harbour
  const pts: Pt[] = [];
  if (h) {
    for (const p of [h.depot, h.isle, h.reef, h.landing, h.home]) if (p) pts.push(p);
    pts.push(...h.route);
  }
  if (pts.length === 0) pts.push([0, 0], [8, 5]);
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const x0 = Math.min(...xs, 0) - 1;
  const x1 = Math.max(...xs) + 1;
  const y0 = Math.min(...ys, 0) - 1;
  const y1 = Math.max(...ys) + 1;
  const plotW = W - PAD * 2;
  const plotH = H - PAD - STRIP - 6;
  const s = Math.min(plotW / Math.max(1, x1 - x0), plotH / Math.max(1, y1 - y0));
  const ox = PAD + (plotW - s * (x1 - x0)) / 2;
  const oy = 12 + (plotH - s * (y1 - y0)) / 2;
  const X = (x: number) => ox + (x - x0) * s;
  const Y = (y: number) => oy + (y1 - y) * s;

  const depot: Pt = h?.depot ?? [0, 0];
  const route = h?.route ?? [];
  const path = route.length >= 2 ? route.map((p, i) => `${i === 0 ? "M" : "L"}${X(p[0])} ${Y(p[1])}`).join(" ") : "";

  const gridX: number[] = [];
  for (let x = Math.ceil(x0); x <= x1; x++) gridX.push(x);
  const gridY: number[] = [];
  for (let y = Math.ceil(y0); y <= y1; y++) gridY.push(y);

  const pad = 8;
  const slotW = Math.min(64, (W - pad * 2) / Math.max(1, Math.min(drones.length, 6)));

  const body = (
    <svg viewBox={`0 0 ${W} ${H}`} className={compact ? "block h-auto w-full" : "mx-auto block h-auto w-full max-w-[560px]"} role="img" aria-label="Harbour grid with the depot, the route and the parked drones">
      <rect x="0" y="0" width={W} height={H} rx="8" fill="rgba(255,255,255,0.025)" />
      {gridX.map((x) => (
        <line key={`gx${x}`} x1={X(x)} y1={12} x2={X(x)} y2={H - STRIP - 6} stroke="rgba(255,255,255,0.06)" />
      ))}
      {gridY.map((y) => (
        <line key={`gy${y}`} x1={PAD} y1={Y(y)} x2={W - PAD} y2={Y(y)} stroke="rgba(255,255,255,0.06)" />
      ))}

      {mapLive && (
        <g>
          {h?.isle && h?.depot && <path d={`M${X(depot[0])} ${Y(depot[1])} L${X(h.isle[0])} ${Y(h.isle[1])}`} stroke="#8aa4ff" strokeWidth="1.5" strokeDasharray="4 4" opacity=".8" />}
          {path && <path d={path} fill="none" stroke="#c5ee8a" strokeWidth="2" strokeLinejoin="round" opacity=".85" />}
          {h?.landing && (
            <g>
              <circle cx={X(h.landing[0])} cy={Y(h.landing[1])} r="4" fill="none" stroke="#fbbf24" strokeWidth="1.5" />
              <text x={X(h.landing[0]) + 7} y={Y(h.landing[1]) + 3} fontSize="9" fill="#fbbf24" fontFamily="var(--font-mono), monospace">
                landing
              </text>
            </g>
          )}
          {([["isle", h?.isle], ["reef", h?.reef]] as const).map(([name, p]) =>
            p ? (
              <g key={name}>
                <circle cx={X(p[0])} cy={Y(p[1])} r="6" fill="#151515" stroke="#c5ee8a" strokeWidth="1.6" />
                <text x={X(p[0]) + 9} y={Y(p[1]) + 3} fontSize="10" fill="rgba(255,255,255,0.85)" fontFamily="var(--font-mono), monospace">
                  {name}
                </text>
              </g>
            ) : null,
          )}
          {path && !reduced && (
            <circle r="4" fill="#c5ee8a">
              <animateMotion dur={autoplay ? "5s" : "7s"} repeatCount="indefinite" path={path} />
            </circle>
          )}
        </g>
      )}

      {/* the depot */}
      <g>
        <rect x={X(depot[0]) - 7} y={Y(depot[1]) - 7} width="14" height="14" rx="3" fill={live ? "#c5ee8a" : "none"} fillOpacity={live ? 0.9 : 0} stroke={live ? "#c5ee8a" : "rgba(255,255,255,0.3)"} strokeDasharray={live ? undefined : "3 3"} />
        <text x={X(depot[0]) + 11} y={Y(depot[1]) + 14} fontSize="10" fill="rgba(255,255,255,0.8)" fontFamily="var(--font-mono), monospace">
          {fleet.depot?.name ?? "depot"}
        </text>
      </g>

      {/* parked drones */}
      <line x1={pad} y1={H - STRIP} x2={W - pad} y2={H - STRIP} stroke="rgba(255,255,255,0.12)" strokeDasharray="2 4" />
      {!live && (
        <text x={W / 2} y={H - STRIP / 2 + 3} textAnchor="middle" fontSize="10" fill="rgba(255,255,255,0.5)" fontFamily="var(--font-mono), monospace">
          Pass lesson 1 to park the first drones here
        </text>
      )}
      {drones.slice(0, 6).map((d, i) => {
        const cx = pad + slotW * i + slotW / 2;
        const cy = H - STRIP + 14;
        const b = d.battery ?? 0;
        const tone = b < 40 ? "#f87171" : b < 60 ? "#fbbf24" : "#c5ee8a";
        return (
          <g key={`${d.callsign}-${i}`}>
            {glyph(d.kind, cx, cy)}
            <text x={cx} y={H - 8} textAnchor="middle" fontSize="8.5" fill="rgba(255,255,255,0.75)" fontFamily="var(--font-mono), monospace">
              {d.callsign}
            </text>
            <rect x={cx - 14} y={H - STRIP + 25} width="28" height="3" rx="1.5" fill="rgba(255,255,255,0.12)" />
            <rect x={cx - 14} y={H - STRIP + 25} width={Math.max(1, (28 * Math.min(100, b)) / 100)} height="3" rx="1.5" fill={tone} />
          </g>
        );
      })}
    </svg>
  );

  if (compact) return <div className="hud-panel w-full min-w-0 !px-2 !py-2">{body}</div>;
  return (
    <Frame id="df-map" title="Skerry Post harbour" meta={mapLive && h?.distanceToReef !== undefined ? `reef ${h.distanceToReef} cells` : undefined} className="mb-0">
      {body}
    </Frame>
  );
}
