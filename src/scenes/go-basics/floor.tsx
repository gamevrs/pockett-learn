"use client";

import React from "react";
import { chuteLabelsOf, fmtNum, regionNamesOf, type Hub } from "./data";

/**
 * The Gopher Post sorting floor: a top-down SVG of the hub. An intake belt carries crates past a scanner
 * arch; four chutes drop them into courier vans; rejects go to a bin, spill-over to a tray; a board and a
 * nameplate show the numbers. Every part belongs to one feature (one lesson) and is a dashed blueprint
 * until that feature is unlocked. All motion is CSS (no JS loop), pauses when the scene is a still
 * preview and stops for prefers-reduced-motion.
 *
 * Two layouts share one drawing routine: "wide" for landscape containers and "tall" for portrait.
 */

const C = {
  floor: "#0b0c0c",
  grid: "rgba(255,255,255,0.035)",
  steel: "#262626",
  steelHi: "#3b3b3b",
  steelLo: "#171717",
  line: "rgba(255,255,255,0.16)",
  ghost: "rgba(255,255,255,0.22)",
  ghostText: "rgba(255,255,255,0.38)",
  teal: "rgba(45,212,191,0.55)",
  tealSoft: "rgba(45,212,191,0.12)",
  lime: "#c5ee8a",
  limeSoft: "rgba(197,238,138,0.2)",
  red: "#f87171",
  amber: "#fbbf24",
  text: "rgba(255,255,255,0.86)",
  mute: "rgba(255,255,255,0.5)",
};

interface Layout {
  kind: "wide" | "tall";
  w: number;
  h: number;
  beltX0: number;
  beltX1: number;
  beltY: number;
  beltH: number;
  gateX: number;
  cx: number[];
  chuteW: number;
  chuteTop: number;
  chuteBot: number;
  vanTop: number;
  vanH: number;
  vanW: number;
  bin: Box;
  tray: Box;
  board: Box;
  plate: Box;
  /** where a rejected crate leaves the belt and where it ends up */
  reject: { x1: number; x2: number; y2: number };
  font: number;
}

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

const WIDE: Layout = {
  kind: "wide",
  w: 800,
  h: 450,
  beltX0: 24,
  beltX1: 676,
  beltY: 72,
  beltH: 40,
  gateX: 104,
  cx: [200, 330, 460, 590],
  chuteW: 96,
  chuteTop: 92,
  chuteBot: 204,
  vanTop: 226,
  vanH: 196,
  vanW: 80,
  bin: { x: 684, y: 30, w: 104, h: 156 },
  tray: { x: 684, y: 202, w: 104, h: 88 },
  plate: { x: 684, y: 306, w: 104, h: 116 },
  board: { x: 24, y: 142, w: 118, h: 200 },
  reject: { x1: 718, x2: 718, y2: 128 },
  font: 10,
};

const TALL: Layout = {
  kind: "tall",
  w: 432,
  h: 560,
  beltX0: 12,
  beltX1: 424,
  beltY: 70,
  beltH: 32,
  gateX: 36,
  cx: [98, 186, 274, 362],
  chuteW: 74,
  chuteTop: 86,
  chuteBot: 178,
  vanTop: 196,
  vanH: 150,
  vanW: 60,
  bin: { x: 276, y: 368, w: 144, h: 96 },
  tray: { x: 148, y: 368, w: 120, h: 96 },
  board: { x: 12, y: 368, w: 128, h: 96 },
  plate: { x: 12, y: 476, w: 408, h: 64 },
  reject: { x1: 414, x2: 414, y2: 410 },
  font: 9,
};

// ───────────────────────── crates ─────────────────────────

interface Crate {
  id: string;
  lane: number | "reject";
  size: number;
}

const MAX_CRATES = 10;

function buildCrates(h: Hub, labels: string[], names: string[]): Crate[] {
  const rejectIds = new Set((h.rejects.rejects ?? []).map((r) => r.id));
  const gramsById = new Map<string, number>();
  (h.queue.queue ?? []).forEach((id, i) => {
    const g = h.queue.weights?.[i];
    if (g !== undefined) gramsById.set(id, g);
  });
  for (const p of h.vans.parcels ?? []) if (p.grams !== undefined) gramsById.set(p.id, p.grams);
  const size = (id: string) => 11 + Math.min(1, (gramsById.get(id) ?? 3000) / 20000) * 8;

  const laneByRegion = (region: string) => {
    const i = names.findIndex((n) => n.toLowerCase() === region.toLowerCase());
    return i >= 0 ? i : null;
  };

  let crates: Crate[] = [];
  const routes = h.routers.routes;
  const parcels = h.vans.parcels;
  const queue = h.queue.queue;
  if (routes && routes.length > 0) {
    crates = routes.map((r, i) => {
      const li = labels.indexOf(r.chute);
      return { id: r.id, lane: li >= 0 ? li : i % 4, size: size(r.id) };
    });
  } else if (parcels && parcels.length > 0) {
    crates = parcels.map((p, i) => ({ id: p.id, lane: laneByRegion(p.region) ?? i % 4, size: size(p.id) }));
  } else if (queue && queue.length > 0) {
    crates = queue.map((id, i) => ({ id, lane: i % 4, size: size(id) }));
  } else {
    crates = Array.from({ length: 6 }, (_, i) => ({ id: `c${i}`, lane: i % 4, size: 12 + (i % 3) * 2 }));
  }
  crates = crates.map((c) => (rejectIds.has(c.id) ? { ...c, lane: "reject" as const } : c));
  const have = new Set(crates.map((c) => c.id));
  for (const id of rejectIds) if (!have.has(id)) crates.push({ id, lane: "reject", size: size(id) });
  // keep a readable mix: every reject (up to 3) plus the first normal crates
  const rejectsOnly = crates.filter((c) => c.lane === "reject").slice(0, 3);
  const normal = crates.filter((c) => c.lane !== "reject").slice(0, MAX_CRATES - rejectsOnly.length);
  const merged: Crate[] = [];
  const total = normal.length + rejectsOnly.length;
  for (let i = 0, ni = 0, ri = 0; i < total; i++) {
    const takeReject = ri < rejectsOnly.length && (ni >= normal.length || i % 3 === 2);
    merged.push(takeReject ? rejectsOnly[ri++] : normal[ni++]);
  }
  return merged;
}

const CYCLE = 15; // seconds for one trip across the floor

const CSS = `
@keyframes gp-dash { to { stroke-dashoffset: -32; } }
@keyframes gp-crate {
  0% { transform: translate(var(--x0), var(--y0)); opacity: 0; }
  4% { opacity: 1; }
  44% { transform: translate(var(--x1), var(--y1)); opacity: 1; }
  74% { transform: translate(var(--x2), var(--y2)); opacity: 1; }
  86% { transform: translate(var(--x2), var(--y2)); opacity: 0; }
  100% { transform: translate(var(--x0), var(--y0)); opacity: 0; }
}
@keyframes gp-scan { 0%, 100% { opacity: 0.25; } 50% { opacity: 0.95; } }
@keyframes gp-focus { 0%, 100% { stroke-opacity: 0.35; } 50% { stroke-opacity: 1; } }
@keyframes gp-lamp { 0%, 100% { opacity: 0.55; } 50% { opacity: 1; } }
.gp-wide { display: none; }
.gp-tall { display: block; }
@container (min-aspect-ratio: 1.15) {
  .gp-wide { display: block; }
  .gp-tall { display: none; }
}
.gp-belt-dash { animation: gp-dash 1.6s linear infinite; }
.gp-crate { animation: gp-crate ${CYCLE}s linear infinite; }
.gp-scan { animation: gp-scan 1.8s ease-in-out infinite; }
.gp-focus { animation: gp-focus 1.4s ease-in-out infinite; }
.gp-lamp { animation: gp-lamp 2.2s ease-in-out infinite; }
.gp-still .gp-belt-dash, .gp-still .gp-crate, .gp-still .gp-scan, .gp-still .gp-focus, .gp-still .gp-lamp { animation-play-state: paused; }
@media (prefers-reduced-motion: reduce) {
  .gp-belt-dash, .gp-scan, .gp-focus, .gp-lamp { animation: none; }
  .gp-crate { animation: none; opacity: 1; transform: translate(var(--xs), var(--y1)); }
}
`;

// ───────────────────────── pieces ─────────────────────────

interface Ctx {
  L: Layout;
  hub: Hub;
  on: (id: string) => boolean;
  focus: string | null;
  labels: string[];
  names: string[];
}

const T = ({ x, y, size, fill = C.text, anchor = "middle", weight, children }: { x: number; y: number; size: number; fill?: string; anchor?: "start" | "middle" | "end"; weight?: number; children: React.ReactNode }) => (
  <text x={x} y={y} fontSize={size} fill={fill} textAnchor={anchor} fontWeight={weight} style={{ fontFamily: "var(--font-mono), ui-monospace, monospace" }}>
    {children}
  </text>
);

const fit = (s: string, n: number) => (s.length > n ? `${s.slice(0, Math.max(1, n - 1))}…` : s);

function GhostTag({ x, y, lesson, size }: { x: number; y: number; lesson: number; size: number }) {
  return (
    <T x={x} y={y} size={size} fill={C.ghostText} anchor="middle">
      {`L${lesson}`}
    </T>
  );
}

function Belt({ c }: { c: Ctx }) {
  const { L } = c;
  const alive = c.on("go-belt");
  const y0 = L.beltY - L.beltH / 2;
  const w = L.beltX1 - L.beltX0;
  const focus = c.focus === "go-belt";
  if (!alive) {
    return (
      <g>
        <rect x={L.beltX0} y={y0} width={w} height={L.beltH} rx={4} fill="none" stroke={focus ? C.lime : C.ghost} strokeDasharray="5 5" className={focus ? "gp-focus" : undefined} />
        <T x={L.beltX0 + w / 2} y={L.beltY + 3} size={L.font} fill={C.ghostText}>
          {"intake belt · L6"}
        </T>
      </g>
    );
  }
  return (
    <g>
      <rect x={L.beltX0} y={y0} width={w} height={L.beltH} rx={4} fill={C.steel} stroke={C.steelHi} />
      <rect x={L.beltX0} y={y0 - 4} width={w} height={4} fill={C.steelHi} />
      <rect x={L.beltX0} y={y0 + L.beltH} width={w} height={4} fill={C.steelHi} />
      <line x1={L.beltX0 + 6} x2={L.beltX1 - 6} y1={L.beltY - 7} y2={L.beltY - 7} stroke="rgba(255,255,255,0.1)" strokeWidth={2} strokeDasharray="10 22" className="gp-belt-dash" />
      <line x1={L.beltX0 + 6} x2={L.beltX1 - 6} y1={L.beltY + 7} y2={L.beltY + 7} stroke="rgba(255,255,255,0.1)" strokeWidth={2} strokeDasharray="10 22" className="gp-belt-dash" />
      <rect x={L.beltX0 - 2} y={y0 - 2} width={14} height={L.beltH + 4} rx={3} fill={C.steelLo} stroke={C.teal} />
      <T x={L.beltX0 + 5} y={L.beltY + 3} size={7} fill={C.mute}>
        IN
      </T>
    </g>
  );
}

function Gate({ c }: { c: Ctx }) {
  const { L, hub } = c;
  const alive = c.on("go-scanner");
  const gateAlive = c.on("go-gate");
  const focus = c.focus === "go-scanner" || c.focus === "go-gate";
  const top = L.beltY - L.beltH / 2 - 6;
  const bot = L.beltY + L.beltH / 2 + 6;
  const stroke = alive ? C.teal : focus ? C.lime : C.ghost;
  const grams = hub.scanner.grams;
  const id = hub.scanner.parcelID;
  const cls = hub.gate.class;
  return (
    <g>
      <rect x={L.gateX - 4} y={top - 2} width={8} height={9} rx={2} fill={alive ? C.steelLo : "none"} stroke={stroke} strokeDasharray={alive ? undefined : "3 3"} className={focus && !alive ? "gp-focus" : undefined} />
      <rect x={L.gateX - 4} y={bot - 7} width={8} height={9} rx={2} fill={alive ? C.steelLo : "none"} stroke={stroke} strokeDasharray={alive ? undefined : "3 3"} />
      {alive ? <line x1={L.gateX} x2={L.gateX} y1={top + 7} y2={bot - 7} stroke={C.lime} strokeWidth={2} className="gp-scan" /> : <line x1={L.gateX} x2={L.gateX} y1={top + 7} y2={bot - 7} stroke={C.ghost} strokeDasharray="3 3" />}
      {alive && id && (
        <T x={L.gateX + 8} y={top - 14} size={L.font - 1} fill={C.lime} anchor="start" weight={600}>
          {fit(`${id}${grams !== undefined ? ` · ${fmtNum(grams / 1000)} kg` : ""}`, L.kind === "wide" ? 22 : 18)}
        </T>
      )}
      {gateAlive && cls ? (
        <g>
          <rect x={L.gateX + 8} y={top - 10} width={Math.max(40, cls.length * 6 + 12)} height={13} rx={6.5} fill={C.limeSoft} stroke={C.lime} strokeOpacity={0.6} />
          <T x={L.gateX + 14 + Math.max(40, cls.length * 6 + 12) / 2 - 6} y={top - 1} size={L.font - 2} fill={C.lime}>
            {fit(cls, 12)}
          </T>
        </g>
      ) : null}
      {!alive && <GhostTag x={L.gateX} y={top - 8} lesson={4} size={L.font - 1} />}
    </g>
  );
}

function Chute({ c, i }: { c: Ctx; i: number }) {
  const { L, hub } = c;
  const cx = L.cx[i];
  const labelOn = c.on("go-plate");
  const tallyOn = c.on("go-chutes");
  const routeOn = c.on("go-routers");
  const focus = c.focus === "go-plate" || c.focus === "go-chutes" || c.focus === "go-routers";
  const half = L.chuteW / 2;
  const neck = 15;
  const d = `M ${cx - half} ${L.chuteTop} L ${cx + half} ${L.chuteTop} L ${cx + neck} ${L.chuteBot} L ${cx - neck} ${L.chuteBot} Z`;
  const name = c.names[i] ?? "";
  const letter = c.labels[i] ?? "?";
  const key = name.toLowerCase();
  const count = tallyOn ? hub.chutes.tally?.[key] : undefined;
  const grams = tallyOn ? hub.chutes.gramsBy?.[key] : undefined;
  const routed = routeOn ? (hub.routers.routes ?? []).filter((r) => r.chute === letter).length : 0;
  const badgeY = L.chuteTop + 26;
  return (
    <g>
      <path d={d} fill={labelOn ? C.steelLo : "none"} stroke={labelOn ? C.teal : focus ? C.lime : C.ghost} strokeDasharray={labelOn ? undefined : "5 5"} className={focus && !labelOn ? "gp-focus" : undefined} />
      {labelOn && <path d={`M ${cx - half + 8} ${L.chuteTop + 8} L ${cx + half - 8} ${L.chuteTop + 8}`} stroke={C.tealSoft} strokeWidth={5} />}
      <circle cx={cx} cy={badgeY} r={12} fill={labelOn ? C.lime : "none"} stroke={labelOn ? C.lime : C.ghost} strokeDasharray={labelOn ? undefined : "3 3"} />
      <T x={cx} y={badgeY + 4} size={L.font + 3} fill={labelOn ? "#0a0a0a" : C.ghostText} weight={700}>
        {letter}
      </T>
      {labelOn ? (
        <T x={cx} y={badgeY + 26} size={L.font} fill={C.text}>
          {fit(name, 9)}
        </T>
      ) : (
        <GhostTag x={cx} y={badgeY + 26} lesson={2} size={L.font - 1} />
      )}
      {routed > 0 && (
        <g>
          {Array.from({ length: Math.min(routed, 6) }, (_, k) => (
            <circle key={k} cx={cx - ((Math.min(routed, 6) - 1) * 7) / 2 + k * 7} cy={badgeY + 38} r={2.2} fill={C.lime} />
          ))}
        </g>
      )}
      {tallyOn && count !== undefined && (
        <g>
          <rect x={cx - 33} y={L.chuteBot - 22} width={66} height={15} rx={7.5} fill="rgba(10,10,10,0.9)" stroke={C.lime} strokeOpacity={0.5} />
          <T x={cx} y={L.chuteBot - 11.5} size={L.font - 1} fill={C.lime}>
            {`${count}${grams !== undefined ? ` · ${fmtNum(grams / 1000, 1)}kg` : ""}`}
          </T>
        </g>
      )}
    </g>
  );
}

function Van({ c, i }: { c: Ctx; i: number }) {
  const { L, hub } = c;
  const alive = c.on("go-vans");
  const focus = c.focus === "go-vans";
  const cx = L.cx[i];
  const x = cx - L.vanW / 2;
  const name = c.names[i] ?? "";
  const vans = hub.vans.vans ?? [];
  const van = alive ? (vans.find((v) => v.region === name.toLowerCase()) ?? vans[i]) : undefined;
  const bayTop = 9;
  const cabH = 34;
  const bayH = L.vanH - cabH - bayTop - 8;
  const ratio = van && van.limit > 0 ? Math.min(1, van.loaded / van.limit) : 0;
  if (!alive) {
    return (
      <g transform={`translate(${x} ${L.vanTop})`}>
        <rect width={L.vanW} height={L.vanH} rx={10} fill="none" stroke={focus ? C.lime : C.ghost} strokeDasharray="5 5" className={focus ? "gp-focus" : undefined} />
        <rect x={6} y={L.vanH - cabH} width={L.vanW - 12} height={cabH - 6} rx={6} fill="none" stroke={C.ghost} strokeDasharray="3 4" />
        <GhostTag x={L.vanW / 2} y={L.vanH / 2 - 8} lesson={11} size={L.font - 1} />
        <T x={L.vanW / 2} y={L.vanH / 2 + 6} size={L.font - 2} fill={C.ghostText}>
          van
        </T>
      </g>
    );
  }
  const full = ratio >= 0.95;
  return (
    <g transform={`translate(${x} ${L.vanTop})`}>
      <rect width={L.vanW} height={L.vanH} rx={10} fill={C.steelLo} stroke={C.steelHi} />
      <rect x={7} y={bayTop} width={L.vanW - 14} height={bayH} rx={5} fill="#0b0b0b" stroke="rgba(255,255,255,0.08)" />
      {van && <rect x={7} y={bayTop + bayH * (1 - ratio)} width={L.vanW - 14} height={bayH * ratio} rx={5} fill={full ? C.amber : C.lime} opacity={0.55} />}
      <rect x={7} y={L.vanH - cabH} width={L.vanW - 14} height={cabH - 8} rx={7} fill={C.steel} stroke={C.steelHi} />
      <rect x={13} y={L.vanH - cabH + 4} width={L.vanW - 26} height={9} rx={3} fill="rgba(45,212,191,0.28)" />
      <circle cx={13} cy={L.vanH - 7} r={3} fill="#0a0a0a" stroke={C.steelHi} />
      <circle cx={L.vanW - 13} cy={L.vanH - 7} r={3} fill="#0a0a0a" stroke={C.steelHi} />
      {van ? (
        <>
          <T x={L.vanW / 2} y={bayTop + 15} size={L.font - 1} fill={C.text}>
            {fit(van.name, 8)}
          </T>
          <T x={L.vanW / 2} y={bayTop + bayH / 2 + 4} size={L.font + 1} fill={C.text} weight={600}>
            {`${Math.round(ratio * 100)}%`}
          </T>
          <T x={L.vanW / 2} y={bayTop + bayH - 8} size={L.font - 1} fill={C.mute}>
            {`${fmtNum(van.loaded / 1000, 1)} kg`}
          </T>
        </>
      ) : (
        <T x={L.vanW / 2} y={bayTop + bayH / 2 + 3} size={L.font - 1} fill={C.mute}>
          empty
        </T>
      )}
    </g>
  );
}

function Bin({ c }: { c: Ctx }) {
  const { L, hub } = c;
  const b = L.bin;
  const alive = c.on("go-rejects");
  const focus = c.focus === "go-rejects";
  const rows = (hub.rejects.rejects ?? []).slice(0, L.kind === "wide" ? 5 : 3);
  const total = hub.rejects.rejects?.length ?? hub.rejects.rejected;
  if (!alive) {
    return (
      <g>
        <rect {...b} rx={8} fill="none" stroke={focus ? C.lime : C.ghost} strokeDasharray="5 5" className={focus ? "gp-focus" : undefined} />
        <T x={b.x + b.w / 2} y={b.y + b.h / 2 - 2} size={L.font} fill={C.ghostText}>
          reject bin
        </T>
        <GhostTag x={b.x + b.w / 2} y={b.y + b.h / 2 + 12} lesson={10} size={L.font - 1} />
      </g>
    );
  }
  return (
    <g>
      <rect {...b} rx={8} fill={C.steelLo} stroke="rgba(248,113,113,0.55)" />
      <rect x={b.x} y={b.y} width={b.w} height={5} rx={2} fill="rgba(248,113,113,0.4)" />
      <T x={b.x + 9} y={b.y + 19} size={L.font - 1} fill={C.red} anchor="start" weight={700}>
        {`REJECTED${total !== undefined ? ` · ${total}` : ""}`}
      </T>
      {rows.length === 0 && (
        <T x={b.x + b.w / 2} y={b.y + b.h / 2 + 8} size={L.font - 1} fill={C.mute}>
          nothing rejected
        </T>
      )}
      {rows.map((r, k) => (
        <g key={`${r.id}-${k}`} transform={`translate(${b.x + 7} ${b.y + 28 + k * 24})`}>
          <rect width={b.w - 14} height={20} rx={4} fill="rgba(248,113,113,0.1)" stroke="rgba(248,113,113,0.3)" />
          <T x={5} y={9} size={L.font - 2} fill={C.text} anchor="start" weight={600}>
            {fit(r.id, 9)}
          </T>
          <T x={5} y={17} size={L.font - 3} fill="rgba(252,165,165,0.9)" anchor="start">
            {fit(r.reason, L.kind === "wide" ? 16 : 20)}
          </T>
        </g>
      ))}
    </g>
  );
}

function Tray({ c }: { c: Ctx }) {
  const { L, hub } = c;
  const b = L.tray;
  const alive = c.on("go-vans");
  if (!alive) {
    return (
      <g>
        <rect {...b} rx={8} fill="none" stroke={C.ghost} strokeDasharray="5 5" />
        <T x={b.x + b.w / 2} y={b.y + b.h / 2 + 3} size={L.font - 1} fill={C.ghostText}>
          overflow · L11
        </T>
      </g>
    );
  }
  const over = hub.vans.overflow ?? [];
  return (
    <g>
      <rect {...b} rx={8} fill={C.steelLo} stroke="rgba(251,191,36,0.5)" />
      <T x={b.x + 9} y={b.y + 18} size={L.font - 1} fill={C.amber} anchor="start" weight={700}>
        {`OVERFLOW · ${over.length}`}
      </T>
      {over.length === 0 && (
        <T x={b.x + b.w / 2} y={b.y + b.h / 2 + 8} size={L.font - 1} fill={C.mute}>
          everything fit
        </T>
      )}
      {over.slice(0, 3).map((id, k) => (
        <g key={`${id}-${k}`} transform={`translate(${b.x + 7} ${b.y + 27 + k * 19})`}>
          <rect width={b.w - 14} height={15} rx={4} fill="rgba(251,191,36,0.1)" stroke="rgba(251,191,36,0.35)" />
          <T x={(b.w - 14) / 2} y={10.5} size={L.font - 2} fill={C.text}>
            {fit(id, 12)}
          </T>
        </g>
      ))}
    </g>
  );
}

function Board({ c }: { c: Ctx }) {
  const { L, hub } = c;
  const b = L.board;
  const alive = c.on("go-weigh");
  const focus = c.focus === "go-weigh" || c.focus === "go-shift";
  if (!alive) {
    return (
      <g>
        <rect {...b} rx={8} fill="none" stroke={focus ? C.lime : C.ghost} strokeDasharray="5 5" className={focus ? "gp-focus" : undefined} />
        <T x={b.x + b.w / 2} y={b.y + b.h / 2 - 2} size={L.font} fill={C.ghostText}>
          stats board
        </T>
        <GhostTag x={b.x + b.w / 2} y={b.y + b.h / 2 + 12} lesson={9} size={L.font - 1} />
      </g>
    );
  }
  const rep = c.on("go-shift") ? hub.shift.report : undefined;
  const sorted = rep?.sorted;
  const rejected = rep?.rejected ?? hub.rejects.rejected;
  const kg = hub.weigh.batchKg;
  const rows: [string, string | undefined][] = [
    ["PARCELS", hub.weigh.batchCount !== undefined ? String(hub.weigh.batchCount) : undefined],
    ["WEIGHT", kg !== undefined ? `${fmtNum(kg, 1)} kg` : undefined],
    ["HEAVIEST", hub.weigh.batchHeaviest !== undefined ? `${fmtNum(hub.weigh.batchHeaviest / 1000, 1)} kg` : undefined],
    ["SORTED", sorted !== undefined ? String(sorted) : undefined],
    ["REJECTED", rejected !== undefined ? String(rejected) : undefined],
    ["REVENUE", rep?.revenue],
  ];
  const step = (b.h - 30) / rows.length;
  return (
    <g>
      <rect {...b} rx={8} fill={C.steelLo} stroke={C.teal} />
      <T x={b.x + 9} y={b.y + 17} size={L.font - 1} fill={C.mute} anchor="start" weight={700}>
        STATS BOARD
      </T>
      {rows.map(([label, value], k) => (
        <g key={label}>
          <T x={b.x + 9} y={b.y + 34 + k * step} size={L.font - 2} fill={C.mute} anchor="start">
            {label}
          </T>
          <T x={b.x + b.w - 9} y={b.y + 34 + k * step} size={L.font} fill={value === undefined ? "rgba(255,255,255,0.25)" : C.lime} anchor="end" weight={600}>
            {value === undefined ? "—" : fit(value, 9)}
          </T>
        </g>
      ))}
    </g>
  );
}

function Plate({ c }: { c: Ctx }) {
  const { L, hub } = c;
  const b = L.plate;
  const alive = c.on("go-plate");
  const focus = c.focus === "go-plate";
  if (!alive) {
    return (
      <g>
        <rect {...b} rx={8} fill="none" stroke={focus ? C.lime : C.ghost} strokeDasharray="5 5" className={focus ? "gp-focus" : undefined} />
        <T x={b.x + b.w / 2} y={b.y + b.h / 2 + 3} size={L.font} fill={C.ghostText}>
          hub plate · L2
        </T>
      </g>
    );
  }
  const p = hub.plate;
  const wide = L.kind === "wide";
  const words = (p.hubName ?? "—").split(" ");
  const half = Math.ceil(words.length / 2);
  const nameLines = [words.slice(0, half).join(" "), words.slice(half).join(" ")];
  return (
    <g>
      <rect {...b} rx={8} fill={C.steelLo} stroke={C.steelHi} />
      {wide ? (
        <>
          <T x={b.x + 9} y={b.y + 20} size={L.font - 1} fill={C.mute} anchor="start" weight={700}>
            HUB
          </T>
          <T x={b.x + 9} y={b.y + 36} size={L.font - 1} fill={C.lime} anchor="start" weight={600}>
            {fit(nameLines[0], 15)}
          </T>
          <T x={b.x + 9} y={b.y + 49} size={L.font - 1} fill={C.lime} anchor="start" weight={600}>
            {fit(nameLines[1], 15)}
          </T>
          <T x={b.x + 9} y={b.y + 68} size={L.font - 1} fill={C.text} anchor="start">
            {p.shift !== undefined ? `shift ${p.shift}` : "shift —"}
          </T>
          <T x={b.x + 9} y={b.y + 83} size={L.font - 1} fill={C.text} anchor="start">
            {p.beltSpeed !== undefined ? `belt ${fmtNum(p.beltSpeed)} m/s` : "belt —"}
          </T>
          <circle cx={b.x + 14} cy={b.y + 100} r={4} fill={p.open === false ? C.red : p.open ? C.lime : "rgba(255,255,255,0.3)"} className={p.open ? "gp-lamp" : undefined} />
          <T x={b.x + 24} y={b.y + 103.5} size={L.font - 1} fill={C.text} anchor="start">
            {p.open === undefined ? "status —" : p.open ? "open" : "closed"}
          </T>
        </>
      ) : (
        <>
          <T x={b.x + 12} y={b.y + 26} size={L.font + 2} fill={C.lime} anchor="start" weight={600}>
            {fit(p.hubName ?? "—", 28)}
          </T>
          <T x={b.x + 12} y={b.y + 47} size={L.font} fill={C.text} anchor="start">
            {`${p.shift !== undefined ? `shift ${p.shift}` : "shift —"}  ·  ${p.beltSpeed !== undefined ? `belt ${fmtNum(p.beltSpeed)} m/s` : "belt —"}`}
          </T>
          <circle cx={b.x + b.w - 56} cy={b.y + 44} r={4} fill={p.open === false ? C.red : p.open ? C.lime : "rgba(255,255,255,0.3)"} className={p.open ? "gp-lamp" : undefined} />
          <T x={b.x + b.w - 46} y={b.y + 47.5} size={L.font} fill={C.text} anchor="start">
            {p.open === undefined ? "—" : p.open ? "open" : "closed"}
          </T>
        </>
      )}
    </g>
  );
}

function Crates({ c, crates }: { c: Ctx; crates: Crate[] }) {
  const { L } = c;
  const n = crates.length;
  if (n === 0) return null;
  return (
    <g>
      {crates.map((cr, i) => {
        const x0 = L.beltX0 + 16;
        const y1 = L.beltY;
        let x1: number;
        let x2: number;
        let y2: number;
        if (cr.lane === "reject") {
          x1 = L.reject.x1;
          x2 = L.reject.x2;
          y2 = L.reject.y2;
        } else {
          x1 = L.cx[cr.lane];
          x2 = x1;
          y2 = L.vanTop + 32;
        }
        const style = {
          "--x0": `${x0}px`,
          "--y0": `${y1}px`,
          "--x1": `${x1}px`,
          "--y1": `${y1}px`,
          "--x2": `${x2}px`,
          "--y2": `${y2}px`,
          "--xs": `${x0 + 18 + (i * (L.beltX1 - L.beltX0 - 60)) / Math.max(1, n)}px`,
          animationDelay: `${-(i * CYCLE) / n}s`,
        } as React.CSSProperties;
        const reject = cr.lane === "reject";
        const s = cr.size;
        return (
          <g key={`${cr.id}-${i}`} className="gp-crate" style={style}>
            <rect x={-s / 2} y={-s / 2} width={s} height={s} rx={2} fill={reject ? "#3a1717" : "#3b3b3b"} stroke={reject ? C.red : C.lime} strokeWidth={1.3} />
            <line x1={-s / 2} x2={s / 2} y1={0} y2={0} stroke={reject ? "rgba(248,113,113,0.5)" : "rgba(197,238,138,0.45)"} />
            <line x1={0} x2={0} y1={-s / 2} y2={s / 2} stroke={reject ? "rgba(248,113,113,0.5)" : "rgba(197,238,138,0.45)"} />
          </g>
        );
      })}
    </g>
  );
}

// ───────────────────────── the floor ─────────────────────────

export function Floor({ hub, unlocked, focus, animate, compact }: { hub: Hub; unlocked: ReadonlySet<string>; focus: string | null; animate: boolean; compact: boolean }) {
  const labels = chuteLabelsOf(hub);
  const names = regionNamesOf(hub);
  const crates = unlocked.has("go-belt") ? buildCrates(hub, labels, names) : [];
  const draw = (L: Layout) => {
    const c: Ctx = { L, hub, on: (id) => unlocked.has(id), focus, labels, names };
    return (
      <svg
        viewBox={`0 0 ${L.w} ${L.h}`}
        preserveAspectRatio="xMidYMid meet"
        className="mx-auto block"
        style={{ width: "100%", height: `max(150px, min(calc((100cqw - 24px) * ${L.h / L.w}), calc(100cqh - ${compact ? 90 : 112}px)))` }}
        role="img" aria-label="Top-down view of the Gopher Post sorting floor">
        <defs>
          <pattern id={`gp-grid-${L.kind}`} width="24" height="24" patternUnits="userSpaceOnUse">
            <path d="M 24 0 L 0 0 0 24" fill="none" stroke={C.grid} strokeWidth="1" />
          </pattern>
        </defs>
        <rect width={L.w} height={L.h} rx={12} fill={C.floor} />
        <rect width={L.w} height={L.h} rx={12} fill={`url(#gp-grid-${L.kind})`} />
        <rect x={6} y={6} width={L.w - 12} height={L.h - 12} rx={9} fill="none" stroke="rgba(251,191,36,0.14)" strokeDasharray="10 8" />
        <Belt c={c} />
        {L.cx.map((_, i) => (
          <Chute key={`chute-${i}`} c={c} i={i} />
        ))}
        {L.cx.map((_, i) => (
          <Van key={`van-${i}`} c={c} i={i} />
        ))}
        <Gate c={c} />
        <Bin c={c} />
        <Tray c={c} />
        <Board c={c} />
        <Plate c={c} />
        <Crates c={c} crates={crates} />
      </svg>
    );
  };
  return (
    <div className={`${compact ? "mb-0" : "mb-3"} overflow-hidden rounded-[10px] border border-white/[0.08] bg-[#0b0c0c] ${animate ? "" : "gp-still"}`}>
      <style>{CSS}</style>
      <div className="gp-wide">{draw(WIDE)}</div>
      <div className="gp-tall">{draw(TALL)}</div>
    </div>
  );
}
