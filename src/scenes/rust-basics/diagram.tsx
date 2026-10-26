"use client";

import React from "react";
import {
  Anchor,
  BookOpen,
  Bot,
  Cable,
  ClipboardList,
  DoorOpen,
  Flag,
  Gauge,
  Inbox,
  Lock,
  Radar,
  RadioTower,
  Repeat,
  Shell,
  Siren,
  Terminal,
  Vault,
  Wind,
  type LucideIcon,
} from "lucide-react";
import { FLOOR_COUNTS, ROOMS, tileValue, type Room, type Station } from "./data";

/**
 * The cutaway of Halcyon Reef Station: four decks (one per chapter) bolted to a reef shelf, a mast
 * up to the surface, a drone patrolling the seabed. Each lesson switches one room on. The backdrop
 * is plain SVG; the rooms are HTML buttons laid over it in percentages, so their text stays crisp at
 * any width and can drop details when the stage is narrow (container queries on the wrapper).
 *
 * All motion is CSS and stops under prefers-reduced-motion. Nothing here reads the program except
 * through the `station` model, and every value is optional.
 */

const VB_W = 800;
const VB_H = 520;
const CELL_W = 140;
const FLOOR_Y = [92, 176, 260, 344] as const;
const FLOOR_H = 78;

export const ROOM_ICONS: Record<string, LucideIcon> = {
  "rs-console": Terminal,
  "rs-oxygen": Wind,
  "rs-pressure": Gauge,
  "rs-airlock": DoorOpen,
  "rs-alarms": Siren,
  "rs-pumps": Repeat,
  "rs-sensors": Radar,
  "rs-divelog": BookOpen,
  "rs-vault": Vault,
  "rs-tether": Cable,
  "rs-radio": RadioTower,
  "rs-drones": Bot,
  "rs-orders": ClipboardList,
  "rs-catalogue": Shell,
  "rs-intake": Inbox,
  "rs-report": Flag,
};

/** Where a room sits in the cutaway: left / top / width / height as percentages of the diagram. */
function roomBox(room: Room): { left: number; top: number; width: number; height: number } {
  const count = FLOOR_COUNTS[room.floor];
  const col = ROOMS.filter((r) => r.floor === room.floor).findIndex((r) => r.id === room.id);
  const x0 = (VB_W - count * CELL_W) / 2;
  return {
    left: ((x0 + col * CELL_W + 6) / VB_W) * 100,
    top: ((FLOOR_Y[room.floor] + 5) / VB_H) * 100,
    width: ((CELL_W - 12) / VB_W) * 100,
    height: ((FLOOR_H - 10) / VB_H) * 100,
  };
}

const WAVE = (() => {
  // one long sine-ish ribbon; shifting it by one period (100) in CSS loops seamlessly
  let d = "M-100 56";
  for (let i = 0; i < 12; i++) d += " q25 -7 50 0 t50 0";
  return `${d} V0 H-100 Z`;
})();

const BUBBLES: { x: number; y: number; r: number; delay: number; dur: number }[] = [
  { x: 168, y: 410, r: 3, delay: 0, dur: 6.2 },
  { x: 176, y: 414, r: 2, delay: 2.1, dur: 5.4 },
  { x: 372, y: 330, r: 2.5, delay: 1.2, dur: 6.8 },
  { x: 640, y: 330, r: 3, delay: 3.4, dur: 7.2 },
  { x: 700, y: 414, r: 2, delay: 0.8, dur: 5.8 },
  { x: 708, y: 408, r: 3, delay: 4.2, dur: 6.4 },
  { x: 90, y: 400, r: 2, delay: 2.9, dur: 6 },
  { x: 560, y: 262, r: 2, delay: 5.1, dur: 6.6 },
];

const KELP: { x: number; h: number; delay: number }[] = [
  { x: 22, h: 70, delay: 0 },
  { x: 38, h: 52, delay: 1.1 },
  { x: 760, h: 64, delay: 0.5 },
  { x: 778, h: 82, delay: 1.7 },
];

const STYLE = `
@keyframes rs-wave { from { transform: translateX(0); } to { transform: translateX(100px); } }
@keyframes rs-rise { 0% { transform: translateY(0) scale(.6); opacity: 0; } 15% { opacity: .85; } 100% { transform: translateY(-200px) scale(1.2); opacity: 0; } }
@keyframes rs-sway { 0%, 100% { transform: rotate(-5deg); } 50% { transform: rotate(5deg); } }
@keyframes rs-swim { from { transform: translateX(0); } to { transform: translateX(560px); } }
@keyframes rs-shaft { 0%, 100% { opacity: .05; } 50% { opacity: .13; } }
@keyframes rs-ping { 0% { opacity: .9; transform: scale(.5); } 100% { opacity: 0; transform: scale(1.5); } }
@keyframes rs-blink { 0%, 100% { opacity: 1; } 50% { opacity: .3; } }
.rs-anim { transform-box: fill-box; }
.rs-wave { animation: rs-wave 7s linear infinite; }
.rs-rise { animation: rs-rise var(--d, 6s) ease-in infinite; animation-delay: var(--delay, 0s); transform-origin: center; }
.rs-sway { animation: rs-sway 4.5s ease-in-out infinite; animation-delay: var(--delay, 0s); transform-origin: center bottom; }
.rs-swim { animation: rs-swim 16s ease-in-out infinite alternate; }
.rs-shaft { animation: rs-shaft 7s ease-in-out infinite; animation-delay: var(--delay, 0s); }
.rs-ping { animation: rs-ping 2.6s ease-out infinite; transform-origin: center; animation-delay: var(--delay, 0s); }
.rs-blink { animation: rs-blink 2.2s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) { .rs-wave, .rs-rise, .rs-sway, .rs-swim, .rs-shaft, .rs-ping, .rs-blink { animation: none !important; } }
`;

function Backdrop({ live }: { live: ReadonlySet<string> }) {
  const radio = live.has("rs-radio");
  const drones = live.has("rs-drones");
  const oxygen = live.has("rs-oxygen");
  return (
    <svg viewBox={`0 0 ${VB_W} ${VB_H}`} className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <defs>
        <linearGradient id="rs-water" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0f4a5a" />
          <stop offset=".45" stopColor="#0a2f3d" />
          <stop offset="1" stopColor="#04141b" />
        </linearGradient>
        <linearGradient id="rs-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0b1a20" />
          <stop offset="1" stopColor="#12303a" />
        </linearGradient>
        <linearGradient id="rs-shaft-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#bdf2f5" stopOpacity=".7" />
          <stop offset="1" stopColor="#bdf2f5" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="rs-sand" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3b3a2e" />
          <stop offset="1" stopColor="#14130f" />
        </linearGradient>
        <linearGradient id="rs-hull" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#12323d" />
          <stop offset="1" stopColor="#0b2029" />
        </linearGradient>
        <radialGradient id="rs-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#c5ee8a" stopOpacity=".5" />
          <stop offset="1" stopColor="#c5ee8a" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect width={VB_W} height={VB_H} fill="url(#rs-water)" />
      <rect width={VB_W} height="56" fill="url(#rs-sky)" />

      {/* light shafts from the surface */}
      <g>
        <polygon className="rs-anim rs-shaft" style={{ ["--delay" as string]: "0s" }} points="90,56 150,56 250,430 120,430" fill="url(#rs-shaft-fill)" />
        <polygon className="rs-anim rs-shaft" style={{ ["--delay" as string]: "2.4s" }} points="470,56 540,56 690,430 560,430" fill="url(#rs-shaft-fill)" />
        <polygon className="rs-anim rs-shaft" style={{ ["--delay" as string]: "4.6s" }} points="650,56 690,56 790,430 720,430" fill="url(#rs-shaft-fill)" />
      </g>

      {/* the surface: a drifting wave line, and a buoy with the mast's antenna */}
      <g className="rs-anim rs-wave">
        <path d={WAVE} fill="#0d3a47" opacity=".9" />
        <path d={WAVE.replace(/ V0 H-100 Z$/, "")} fill="none" stroke="#9fe6ea" strokeOpacity=".55" strokeWidth="1.5" />
      </g>
      <g stroke="#7a8c92" strokeWidth="2" strokeLinecap="round">
        <path d="M400 92 V18" />
        <path d="M388 30 H412" strokeWidth="1.5" />
      </g>
      <circle cx="400" cy="16" r="4" fill={radio ? "#c5ee8a" : "#3b4a4f"} className={radio ? "rs-blink" : undefined} />
      {radio && (
        <g fill="none" stroke="#c5ee8a" strokeWidth="1.4">
          <circle cx="400" cy="16" r="14" className="rs-anim rs-ping" style={{ ["--delay" as string]: "0s" }} />
          <circle cx="400" cy="16" r="14" className="rs-anim rs-ping" style={{ ["--delay" as string]: "1.3s" }} />
        </g>
      )}
      <g transform="translate(660 50)">
        <ellipse cx="0" cy="4" rx="16" ry="5" fill="#f0a070" opacity=".9" />
        <path d="M-10 4 Q0 -14 10 4 Z" fill="#e8e8e0" />
        <rect x="-1" y="-14" width="2" height="12" fill="#9aa" />
        <circle cx="0" cy="-15" r="2" fill="#ff7a6b" className="rs-blink" />
      </g>

      {/* the reef shelf */}
      <path d="M0 452 Q70 436 150 448 T330 446 T520 452 T700 440 T800 450 V520 H0 Z" fill="url(#rs-sand)" />
      <path d="M0 470 Q120 462 240 472 T520 470 T800 474 V520 H0 Z" fill="#0d0c09" opacity=".55" />
      {/* legs */}
      <g fill="#1b3b46" stroke="#f0a070" strokeOpacity=".35">
        <rect x="118" y="418" width="14" height="32" rx="3" />
        <rect x="668" y="418" width="14" height="32" rx="3" />
        <rect x="392" y="418" width="16" height="30" rx="3" />
      </g>
      {/* coral and kelp */}
      <g>
        {[
          { x: 70, c: "#f0a070" },
          { x: 100, c: "#e8749a" },
          { x: 228, c: "#f0a070" },
          { x: 560, c: "#e8749a" },
          { x: 612, c: "#f0a070" },
          { x: 730, c: "#7dd3d8" },
        ].map((k, i) => (
          <g key={i} transform={`translate(${k.x} 448)`} fill="none" stroke={k.c} strokeWidth="3.5" strokeLinecap="round" opacity=".5">
            <path d="M0 0 V-16 M0 -8 L-7 -17 M0 -10 L7 -20" />
          </g>
        ))}
        {KELP.map((k, i) => (
          <g key={i} transform={`translate(${k.x} 452)`}>
            <path
              className="rs-anim rs-sway"
              style={{ ["--delay" as string]: `${k.delay}s` }}
              d={`M0 0 C-6 -${k.h * 0.3} 6 -${k.h * 0.6} 0 -${k.h}`}
              fill="none"
              stroke="#4f8f6a"
              strokeOpacity=".7"
              strokeWidth="4"
              strokeLinecap="round"
            />
          </g>
        ))}
      </g>

      {/* the four decks */}
      {FLOOR_COUNTS.map((count, f) => {
        const w = count * CELL_W + 12;
        const x = (VB_W - w) / 2;
        return <rect key={f} x={x} y={FLOOR_Y[f] - 2} width={w} height={FLOOR_H + 2} rx="14" fill="url(#rs-hull)" stroke="#f0a070" strokeOpacity=".4" strokeWidth="1.5" />;
      })}

      {/* oxygen vents */}
      {BUBBLES.map((b, i) => (
        <circle
          key={i}
          className="rs-anim rs-rise"
          style={{ ["--d" as string]: `${b.dur}s`, ["--delay" as string]: `${b.delay}s`, opacity: oxygen ? 1 : 0.55 }}
          cx={b.x}
          cy={b.y}
          r={b.r}
          fill="none"
          stroke="#bdf2f5"
          strokeWidth="1.2"
        />
      ))}

      {/* the patrol drone */}
      <g transform="translate(60 438)">
        <g className="rs-anim rs-swim">
          <ellipse cx="0" cy="0" rx="26" ry="14" fill="url(#rs-glow)" opacity={drones ? 1 : 0} />
          <rect x="-12" y="-7" width="24" height="14" rx="6" fill={drones ? "#f0a070" : "none"} stroke={drones ? "none" : "#ffffff"} strokeOpacity=".25" strokeDasharray="3 3" />
          <rect x="-6" y="-4" width="12" height="6" rx="3" fill={drones ? "#0b1a20" : "none"} />
          <circle cx="9" cy="-1" r="2" fill={drones ? "#c5ee8a" : "#ffffff"} opacity={drones ? 1 : 0.25} className={drones ? "rs-blink" : undefined} />
          <path d="M-14 -9 H-6 M6 -9 H14" stroke={drones ? "#e8e8e0" : "#ffffff"} strokeOpacity={drones ? 0.8 : 0.25} strokeWidth="2" strokeLinecap="round" />
        </g>
      </g>
    </svg>
  );
}

export interface CutawayProps {
  station: Station;
  unlocked: ReadonlySet<string>;
  selected: string | null;
  focus: string | null;
  flashing: ReadonlySet<string>;
  nonce: number | undefined;
  interactive: boolean;
  onSelect: (id: string) => void;
}

export function Cutaway({ station, unlocked, selected, focus, flashing, nonce, interactive, onSelect }: CutawayProps) {
  return (
    <div className="@container relative w-full select-none overflow-hidden rounded-[10px] border border-white/10 bg-[#04141b]" style={{ aspectRatio: `${VB_W} / ${VB_H}` }}>
      <style>{STYLE}</style>
      <Backdrop live={unlocked} />
      {ROOMS.map((room) => {
        const box = roomBox(room);
        const live = unlocked.has(room.id);
        const Icon = ROOM_ICONS[room.id] ?? Anchor;
        const value = live ? tileValue(room.id, station) : undefined;
        const isSelected = selected === room.id;
        const pop = flashing.has(room.id);
        return (
          <button
            key={pop ? `${room.id}:${nonce}` : room.id}
            type="button"
            data-room={room.id}
            data-live={live ? "" : undefined}
            aria-pressed={isSelected}
            aria-label={`${room.title}, lesson ${room.lesson}${live ? "" : ", locked"}`}
            disabled={!interactive}
            onClick={() => onSelect(room.id)}
            style={{ left: `${box.left}%`, top: `${box.top}%`, width: `${box.width}%`, height: `${box.height}%` }}
            className={`absolute flex min-w-0 flex-col items-center justify-center gap-[3px] overflow-hidden rounded-lg px-0.5 text-center transition-colors @2xl:flex-row @2xl:justify-start @2xl:gap-1.5 @2xl:px-2 @2xl:text-left ${
              live
                ? `border bg-[#0f2c36]/90 shadow-[0_0_16px_rgba(197,238,138,0.10)] ${isSelected ? "border-[#c5ee8a]/80" : "border-[#f0a070]/35 hover:border-[#f0a070]/70"}`
                : `border border-dashed bg-black/25 ${isSelected ? "border-white/45" : "border-white/15 hover:border-white/30"}`
            } ${pop ? "pop-in" : ""} ${focus === room.id && !isSelected ? "pulse-ring" : ""} disabled:cursor-default`}
          >
            <span className={`shrink-0 ${live ? "text-[#c5ee8a]" : "text-white/35"}`}>
              {live ? <Icon className="h-3 w-3 @lg:h-3.5 @lg:w-3.5 @3xl:h-4 @3xl:w-4 @5xl:h-5 @5xl:w-5" aria-hidden /> : <Lock className="h-3 w-3 @lg:h-3.5 @lg:w-3.5" aria-hidden />}
            </span>
            <span className="min-w-0 max-w-full @2xl:flex-1">
              <span className={`block whitespace-nowrap text-[8px] font-semibold leading-none @md:text-[9px] @lg:text-[10px] @2xl:truncate @2xl:leading-tight @2xl:text-[10.5px] @5xl:text-[12.5px] ${live ? "text-[#f4f4f4]" : "text-white/45"}`}>
                <span className="@3xl:hidden">{room.short}</span>
                <span className="hidden @3xl:inline">{room.title}</span>
              </span>
              <span className={`hidden truncate font-mono text-[9px] leading-tight @2xl:block @3xl:text-[10px] @5xl:text-[11.5px] ${live ? "text-[#d3f3a4]" : "text-white/30"}`}>
                {live ? (value ?? "online") : `lesson ${room.lesson}`}
              </span>
            </span>
            <span className={`absolute right-1 top-0.5 hidden font-mono text-[8px] @lg:block ${live ? "text-white/30" : "text-white/25"}`}>{room.lesson}</span>
            {live && <span className="rs-blink absolute bottom-1 right-1 hidden h-1 w-1 rounded-full bg-[#c5ee8a] @lg:block" aria-hidden />}
          </button>
        );
      })}
    </div>
  );
}
