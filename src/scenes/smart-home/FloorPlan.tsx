"use client";

import React from "react";
import type { Celebration } from "@/engine/scene";
import {
  COLOR,
  FRONT_DOOR,
  KIND_FEATURE,
  PLAN_H,
  PLAN_W,
  clamp,
  ROOMS,
  ROOM_IDS,
  WINDOWS,
  daylight,
  devicePosition,
  isKind,
  mixHex,
  type CatalogDevice,
  type Place,
  type Point,
  type RoomId,
} from "./model";
import { dev, type View } from "./runtime";

/**
 * The top-down floor plan (SVG). Everything that glows, turns, locks or rings here is read from the
 * learner's `snapshot()`; blueprint outlines mark parts whose lesson has not been passed yet.
 */

export interface PlanProps {
  view: View;
  unlocked: ReadonlySet<string>;
  focus: string | null;
  celebration: Celebration | null;
  /** Scale for glyphs and text so they stay readable when the plan is drawn small. */
  k: number;
  interactive: boolean;
  selected: string | null;
  reduceMotion: boolean;
  onSelect: (id: string | null) => void;
  onRoom: (room: Place) => void;
  onDoor: () => void;
}

type Look = "ghost" | "blueprint" | "live";

const strokeFor = (look: Look) => (look === "live" ? COLOR.lime : look === "blueprint" ? "rgba(163,230,53,0.55)" : "rgba(255,255,255,0.3)");
const dashFor = (look: Look) => (look === "live" ? undefined : "3 3");

/** Where a device's caption goes: inward from the wall, clamped inside its room, never at the header band. */
function labelFor(
  e: { d: CatalogDevice; pos: Point; live: boolean; state: View["devices"][string] | undefined; look: Look },
  selected: boolean,
  k: number,
  state: View["devices"][string] | undefined,
): { text: string; x: number; y: number; anchor: "start" | "middle" | "end" } | null {
  const { d, pos } = e;
  const wide = k < 1.25;
  const kindShown = d.kind === "thermostat" || d.kind === "speaker" || d.kind === "blinds";
  if (!selected && !(wide && kindShown)) return null;
  if (d.kind === "lock" && e.live) return null; // the LOCKED / UNLOCKED caption already says it
  let text = d.title;
  if (d.kind === "blinds") text = "Blinds";
  else if (!selected && d.kind === "speaker") text = "Speaker";
  if (d.kind === "blinds" && e.live) {
    const p = dev.position(state);
    text = `Blinds · ${p >= 100 ? "open" : p <= 0 ? "closed" : `${p}%`}`;
  }
  const size = 8 * k;
  const w = text.length * size * 0.56;
  const room = ROOMS[d.room as RoomId];
  if (d.kind === "thermostat") return { text, x: pos.x - (19 + 5) * k, y: pos.y + 3 * k, anchor: "end" };
  if (!room) return { text, x: clamp(pos.x, 10 + w / 2, PLAN_W - 10 - w / 2), y: pos.y - 20 * k, anchor: "middle" };
  const lower = pos.y > room.y + room.h / 2;
  const onWall = d.kind === "blinds";
  const dy = onWall ? (lower ? -9 * k : 14 * k + size * 0.4) : lower ? -21 * k : 27 * k;
  const x = clamp(pos.x, room.x + 10 + w / 2, room.x + room.w - 10 - w / 2);
  return { text, x, y: pos.y + dy, anchor: "middle" };
}

function featureOf(d: CatalogDevice): string {
  return isKind(d.kind) ? KIND_FEATURE[d.kind] : "sh-lights";
}

export function FloorPlan({ view, unlocked, focus, celebration, k, interactive, selected, reduceMotion, onSelect, onRoom, onDoor }: PlanProps) {
  const light = daylight(view.minute, view.sunrise, view.sunset);
  const yard = mixHex(COLOR.night, COLOR.day, light);
  const blueprintOn = unlocked.has("sh-blueprint") && view.fromProgram;
  const flashing = new Set(celebration?.features ?? []);

  const entries = view.catalog.map((d, i) => {
    const feature = featureOf(d);
    const state = view.devices[d.id];
    const live = unlocked.has(feature) && !!state && view.hasProgram;
    const look: Look = live ? "live" : blueprintOn ? "blueprint" : "ghost";
    return { d, feature, state, live, look, pos: devicePosition(d, i) };
  });
  const blindsPosition = (id?: string): number => {
    if (!id) return 100;
    const e = entries.find((x) => x.d.id === id);
    return e && e.live ? dev.position(e.state) : 100;
  };

  const roomAmbient = (room: RoomId): number => {
    const geo = ROOMS[room];
    const blinds = WINDOWS.filter((w) => w.room === room && w.blinds).map((w) => blindsPosition(w.blinds) / 100);
    const open = blinds.length ? Math.max(0.15, Math.max(...blinds)) : 1;
    return light * geo.window * open;
  };

  const maxVisits = Math.max(1, ...ROOM_IDS.map((r) => view.visits[r] ?? 0));
  const showTraffic = unlocked.has("sh-traffic") && view.hasProgram;
  const lit = entries.filter((e) => e.d.kind === "light" && e.live && dev.on(e.state));

  const text = (size: number) => size * k;
  const onKey = (fn: () => void) => (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      fn();
    }
  };

  const doorOpen = view.doorOpen;
  const lockEntry = entries.find((e) => e.d.kind === "lock");
  const person: Point = view.person;

  return (
    <svg viewBox={`0 0 ${PLAN_W} ${PLAN_H}`} className="block h-auto w-full select-none" role="group" aria-label="Floor plan of the house">
      <defs>
        <pattern id="sh-grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M20 0H0V20" fill="none" stroke="#ffffff" strokeOpacity="0.035" />
        </pattern>
        <radialGradient id="sh-pool">
          <stop offset="0" stopColor={COLOR.warm} stopOpacity="0.62" />
          <stop offset="0.55" stopColor={COLOR.warm} stopOpacity="0.2" />
          <stop offset="1" stopColor={COLOR.warm} stopOpacity="0" />
        </radialGradient>
        <radialGradient id="sh-heat">
          <stop offset="0" stopColor={COLOR.warm} stopOpacity="0.35" />
          <stop offset="1" stopColor={COLOR.warm} stopOpacity="0" />
        </radialGradient>
        {ROOM_IDS.map((r) => (
          <clipPath key={r} id={`sh-clip-${r}`}>
            <rect x={ROOMS[r].x} y={ROOMS[r].y} width={ROOMS[r].w} height={ROOMS[r].h} />
          </clipPath>
        ))}
      </defs>

      {/* yard */}
      <rect width={PLAN_W} height={PLAN_H} fill={yard} />
      <rect width={PLAN_W} height={PLAN_H} fill="url(#sh-grid)" />
      <path d={`M${FRONT_DOOR.x - 14} ${FRONT_DOOR.y + 6}V${PLAN_H}M${FRONT_DOOR.x + 14} ${FRONT_DOOR.y + 6}V${PLAN_H}`} stroke="#ffffff" strokeOpacity="0.06" strokeWidth="2" strokeDasharray="6 8" />
      <text x={20} y={PLAN_H - 12} fontSize={text(8.5)} fill={COLOR.muted} letterSpacing="0.1em" style={{ textTransform: "uppercase" }}>
        Outside
      </text>

      {/* rooms: floor, daylight, light pools, traffic */}
      {ROOM_IDS.map((r) => {
        const geo = ROOMS[r];
        const ambient = roomAmbient(r);
        const visits = view.visits[r] ?? 0;
        return (
          <g key={r}>
            <rect
              x={geo.x}
              y={geo.y}
              width={geo.w}
              height={geo.h}
              fill={mixHex(COLOR.floor, COLOR.floorLit, ambient)}
              style={{ cursor: interactive ? "pointer" : "default" }}
              onClick={interactive ? () => onRoom(r) : undefined}
              onKeyDown={interactive ? onKey(() => onRoom(r)) : undefined}
              tabIndex={interactive ? 0 : undefined}
              role={interactive ? "button" : undefined}
              aria-label={interactive ? `Walk to the ${geo.label}` : undefined}
            />
            {showTraffic && (
              <g pointerEvents="none">
                <rect x={geo.x + 8} y={geo.y + 7} width={geo.w - 16} height="3" rx="1.5" fill="#ffffff" opacity="0.07" />
                {visits > 0 && <rect x={geo.x + 8} y={geo.y + 7} width={Math.max(6, (geo.w - 16) * (visits / maxVisits))} height="3" rx="1.5" fill={COLOR.lime} opacity="0.9" />}
              </g>
            )}
          </g>
        );
      })}
      {lit.map((e) => {
        const level = dev.level(e.state);
        const room = (ROOMS[e.d.room as RoomId] ? e.d.room : "living") as RoomId;
        return (
          <g key={e.d.id} clipPath={`url(#sh-clip-${room})`} pointerEvents="none">
            <circle cx={e.pos.x} cy={e.pos.y} r={70 + level * 0.9} fill="url(#sh-pool)" opacity={0.25 + 0.75 * (level / 100)} />
          </g>
        );
      })}

      {/* windows (with blinds) */}
      {WINDOWS.map((w) => {
        const pos = blindsPosition(w.blinds);
        const covered = w.blinds ? 1 - pos / 100 : 0;
        const live = !!w.blinds && entries.some((e) => e.d.id === w.blinds && e.live);
        const width = w.x2 - w.x1;
        return (
          <g key={w.id} pointerEvents="none">
            <line x1={w.x1} x2={w.x2} y1={w.y} y2={w.y} stroke={mixHex("#2a3036", "#9fb7c9", light)} strokeWidth="7" strokeLinecap="butt" />
            {covered > 0.02 && (
              <>
                <rect x={w.x1} y={w.y - 5} width={width * covered} height="10" fill="#101010" />
                {Array.from({ length: Math.ceil((width * covered) / 7) }).map((_, i) => (
                  <line key={i} x1={w.x1 + i * 7 + 2} x2={w.x1 + i * 7 + 2} y1={w.y - 5} y2={w.y + 5} stroke={live ? COLOR.lime : "#8a8a8a"} strokeWidth="2" opacity={live ? 0.85 : 0.5} />
                ))}
              </>
            )}
          </g>
        );
      })}

      {/* walls with doorways */}
      <g stroke={COLOR.wall} strokeWidth="6" strokeLinecap="square" fill="none" pointerEvents="none">
        <path d="M60 40H580V380H160M100 380H60V40" />
        <path d="M280 40V100M280 150V210" strokeWidth="4" />
        <path d="M60 210H100M160 210H405M465 210H580" strokeWidth="4" />
        <path d="M220 210V270M220 330V380" strokeWidth="4" />
      </g>

      {/* room names + visit counts */}
      {ROOM_IDS.map((r) => {
        const geo = ROOMS[r];
        const visits = view.visits[r] ?? 0;
        return (
          <text key={r} data-ov="header" x={geo.tag.x} y={geo.tag.y} fontSize={text(8.5)} fill={COLOR.muted} letterSpacing="0.1em" pointerEvents="none" style={{ textTransform: "uppercase" }}>
            {k >= 1.25 ? geo.short : geo.label}
            {showTraffic && k < 1.25 && <tspan fill={visits > 0 ? COLOR.limeSoft : COLOR.muted}>{`  ${visits} visit${visits === 1 ? "" : "s"}`}</tspan>}
            {showTraffic && k >= 1.25 && visits > 0 && <tspan fill={COLOR.limeSoft}>{`  ${visits}`}</tspan>}
          </text>
        );
      })}

      {/* front door */}
      <g>
        {doorOpen ? (
          <g>
            <path d={`M${FRONT_DOOR.x + 30} ${FRONT_DOOR.y}A60 60 0 0 0 ${FRONT_DOOR.x - 30} ${FRONT_DOOR.y - 60}`} fill="none" stroke="#ffffff" strokeOpacity="0.12" strokeDasharray="3 4" />
            <line x1={FRONT_DOOR.x - 30} y1={FRONT_DOOR.y} x2={FRONT_DOOR.x - 30} y2={FRONT_DOOR.y - 60} stroke="#d4d4d4" strokeWidth="4" strokeLinecap="round" />
          </g>
        ) : (
          <line x1={FRONT_DOOR.x - 30} y1={FRONT_DOOR.y} x2={FRONT_DOOR.x + 30} y2={FRONT_DOOR.y} stroke="#d4d4d4" strokeWidth="4" strokeLinecap="round" />
        )}
        <rect
          x={FRONT_DOOR.x - 36}
          y={FRONT_DOOR.y - 14}
          width="72"
          height="28"
          fill="transparent"
          style={{ cursor: interactive ? "pointer" : "default" }}
          onClick={interactive ? onDoor : undefined}
          onKeyDown={interactive ? onKey(onDoor) : undefined}
          tabIndex={interactive ? 0 : undefined}
          role={interactive ? "button" : undefined}
          aria-label={interactive ? (doorOpen ? "Close the front door" : "Open the front door") : undefined}
        >
          <title>{doorOpen ? "Front door: open (click to close)" : "Front door: closed (click to open)"}</title>
        </rect>
        <text data-ov="caption" x={FRONT_DOOR.x + 40} y={FRONT_DOOR.y + 8 + 6 * k} fontSize={text(8)} fill={COLOR.muted} letterSpacing="0.1em" pointerEvents="none">
          FRONT DOOR
        </text>
      </g>

      {/* devices */}
      {entries.map((e) => {
        const { d, pos, look, state, live, feature } = e;
        const stroke = strokeFor(look);
        const dash = dashFor(look);
        const isSel = selected === d.id;
        const spot = focus === feature && !live;
        const burst = flashing.has(feature) && live;
        return (
          <g key={d.id} transform={`translate(${pos.x} ${pos.y})`}>
            <g transform={`scale(${k})`} data-ov="glyph" data-id={d.id}>
              <Glyph kind={d.kind} stroke={stroke} dash={dash} live={live} state={state} reduce={reduceMotion} span={blindsSpan(d.id)} k={k} />
              {isSel && <circle data-halo="" r="19" fill="none" stroke="#ffffff" strokeWidth="1.2" />}
              {spot && (
                <circle r="16" fill="none" stroke={COLOR.lime} strokeWidth="1.5">
                  {!reduceMotion && <animate attributeName="r" values="14;26" dur="1.6s" repeatCount="indefinite" />}
                  {!reduceMotion && <animate attributeName="opacity" values="0.9;0" dur="1.6s" repeatCount="indefinite" />}
                </circle>
              )}
              {burst && !reduceMotion && (
                <circle key={celebration?.nonce} r="12" fill="none" stroke={COLOR.limeSoft} strokeWidth="2">
                  <animate attributeName="r" values="10;38" dur="0.9s" repeatCount="1" />
                  <animate attributeName="opacity" values="1;0" dur="0.9s" repeatCount="1" fill="freeze" />
                </circle>
              )}
            </g>
            {interactive && (
              <circle
                r={Math.max(15, 15 * k)}
                fill="transparent"
                style={{ cursor: "pointer" }}
                tabIndex={0}
                role="button"
                aria-label={`${d.title}${live ? ", live" : ", not built yet"}`}
                onClick={(ev) => {
                  ev.stopPropagation();
                  onSelect(isSel ? null : d.id);
                }}
                onKeyDown={onKey(() => onSelect(isSel ? null : d.id))}
              />
            )}
          </g>
        );
      })}

      {/* device labels: always inward from the walls, never over room headers */}
      {entries.map((e) => {
        const label = labelFor(e, e.d.id === selected, k, e.state);
        if (!label) return null;
        return (
          <text data-ov="label" key={`label-${e.d.id}`} x={label.x} y={label.y} textAnchor={label.anchor} fontSize={text(8)} fill={e.d.id === selected ? COLOR.text : COLOR.muted} pointerEvents="none" style={{ paintOrder: "stroke" }} stroke="#0a0a0a" strokeWidth={text(2.5)} strokeLinejoin="round">
            {label.text}
          </text>
        );
      })}

      {/* the person */}
      <g style={{ transform: `translate(${person.x}px, ${person.y}px)`, transition: "transform 120ms linear" }} pointerEvents="none">
        <circle r={11 * k} fill="#ffffff" opacity="0.1" />
        <circle r={7 * k} fill="#f4f4f4" stroke="#0a0a0a" strokeWidth="1.5" />
        <circle r={2.4 * k} fill="#0a0a0a" opacity="0.55" cy={-0.5 * k} />
        {view.walking && !reduceMotion && (
          <circle r={9 * k} fill="none" stroke="#ffffff" strokeWidth="1" opacity="0.4">
            <animate attributeName="r" values={`${9 * k};${18 * k}`} dur="0.9s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.5;0" dur="0.9s" repeatCount="indefinite" />
          </circle>
        )}
      </g>

      {/* the lock label sits by the door so a locked door is obvious at a glance */}
      {lockEntry && lockEntry.live && k < 1.5 && (
        <text data-ov="label" x={lockEntry.pos.x - 17 * k} y={lockEntry.pos.y + 2.8 * k} textAnchor="end" fontSize={text(8)} fill={dev.locked(lockEntry.state) ? COLOR.limeSoft : COLOR.warning} pointerEvents="none" letterSpacing="0.08em">
          {dev.locked(lockEntry.state) ? "LOCKED" : "UNLOCKED"}
        </text>
      )}
    </svg>
  );
}

// ───────────────────────── glyphs ─────────────────────────

function blindsSpan(id: string): number {
  const w = WINDOWS.find((x) => x.blinds === id);
  return w ? w.x2 - w.x1 : 100;
}

function Glyph({ kind, stroke, dash, live, state, reduce, span, k }: { k: number; kind: string; stroke: string; dash: string | undefined; live: boolean; state: View["devices"][string] | undefined; reduce: boolean; span: number }) {
  const body = "#1b1b1b";
  if (kind === "light") {
    const on = live && dev.on(state);
    const level = dev.level(state);
    return (
      <g>
        {on && <circle data-halo="" r="15" fill={COLOR.warm} opacity={0.12 + 0.18 * (level / 100)} />}
        <circle r="7.5" fill={on ? mixHex("#8a6b3c", COLOR.warmCore, level / 100) : body} stroke={stroke} strokeWidth="1.6" strokeDasharray={dash} />
        <path d="M-3 -1.5H3M-2.2 1.8H2.2" stroke={on ? "#3a2a10" : stroke} strokeWidth="1.2" strokeLinecap="round" opacity={on ? 0.7 : 0.6} />
      </g>
    );
  }
  if (kind === "motion") {
    const hit = live && dev.detected(state);
    return (
      <g>
        {hit &&
          (reduce ? (
            <circle data-halo="" r="14" fill="none" stroke={COLOR.lime} strokeWidth="1.5" opacity="0.7" />
          ) : (
            <>
              <circle r="6" fill="none" stroke={COLOR.lime} strokeWidth="1.5">
                <animate attributeName="r" values="6;24" dur="1.3s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.9;0" dur="1.3s" repeatCount="indefinite" />
              </circle>
              <circle r="6" fill="none" stroke={COLOR.lime} strokeWidth="1.2">
                <animate attributeName="r" values="6;24" dur="1.3s" begin="0.65s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.9;0" dur="1.3s" begin="0.65s" repeatCount="indefinite" />
              </circle>
            </>
          ))}
        <circle r="5.2" fill={hit ? COLOR.lime : body} stroke={stroke} strokeWidth="1.5" strokeDasharray={dash} />
        <path d="M-9 -2.5a10 10 0 0 1 4 -3.5M9 -2.5a10 10 0 0 0 -4 -3.5" stroke={stroke} strokeWidth="1.1" fill="none" strokeLinecap="round" opacity="0.6" transform="translate(0 1)" />
      </g>
    );
  }
  if (kind === "thermostat") {
    const heating = live && dev.heating(state);
    return (
      <g>
        {heating && <circle data-halo="" r="26" fill="url(#sh-heat)" />}
        <rect x="-19" y="-15" width="38" height="30" rx="8" fill={body} stroke={heating ? COLOR.warm : stroke} strokeWidth="1.6" strokeDasharray={dash} />
        {live ? (
          <>
            <text y="2.5" textAnchor="middle" fontSize="9.5" fill={COLOR.text} fontFamily="var(--font-mono, monospace)" fontWeight="500">
              {dev.current(state).toFixed(1)}
            </text>
            <text y="10.5" textAnchor="middle" fontSize="6.2" fill={heating ? COLOR.warm : COLOR.limeSoft} fontFamily="var(--font-mono, monospace)">
              {heating ? "heat " : "set "}
              {dev.target(state).toFixed(1)}
            </text>
          </>
        ) : (
          <path d="M-5 5a6 6 0 1 1 10 0M0 -8V3" stroke={stroke} strokeWidth="1.3" fill="none" strokeLinecap="round" opacity="0.7" />
        )}
      </g>
    );
  }
  if (kind === "lock") {
    const locked = !live || dev.locked(state);
    const color = !live ? stroke : locked ? COLOR.lime : COLOR.warning;
    return (
      <g>
        <circle r="13" fill={body} stroke={color} strokeWidth="1.5" strokeDasharray={dash} />
        <rect x="-5.5" y="-1.5" width="11" height="8.5" rx="1.8" fill="none" stroke={color} strokeWidth="1.5" />
        <path d={locked ? "M-3.2 -1.5V-4.2a3.2 3.2 0 0 1 6.4 0V-1.5" : "M-3.2 -1.5V-4.2a3.2 3.2 0 0 1 6.4 0"} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      </g>
    );
  }
  if (kind === "speaker") {
    const playing = live && dev.playing(state);
    const bars = playing ? 1 + Math.round(dev.volume(state) / 40) : 0;
    return (
      <g>
        <rect x="-8" y="-11" width="16" height="22" rx="3.5" fill={body} stroke={playing ? COLOR.lime : stroke} strokeWidth="1.5" strokeDasharray={dash} />
        <circle cy="4" r="4.3" fill="none" stroke={playing ? COLOR.lime : stroke} strokeWidth="1.3" strokeDasharray={dash} />
        <circle cy="-5" r="1.7" fill={playing ? COLOR.lime : stroke} opacity="0.8" />
        {Array.from({ length: bars }).map((_, i) => (
          <path key={i} d={`M${12 + i * 5} -5q${4} 5 0 10`} fill="none" stroke={COLOR.lime} strokeWidth="1.4" strokeLinecap="round">
            {!reduce && <animate attributeName="opacity" values="0.2;1;0.2" dur="1s" begin={`${i * 0.2}s`} repeatCount="indefinite" />}
          </path>
        ))}
      </g>
    );
  }
  if (kind === "blinds") {
    return (
      <g>
        {!live && <rect x={-span / 2 / k} y={-5 / k} width={span / k} height={10 / k} rx={3 / k} fill="none" stroke={stroke} strokeWidth="1.2" strokeDasharray="3 3" />}
      </g>
    );
  }
  return <circle r="6" fill={body} stroke={stroke} strokeDasharray={dash} />;
}

