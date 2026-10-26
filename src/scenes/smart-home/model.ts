/**
 * Smart Home Hub: pure model code (no React, no DOM).
 *
 * Geometry of the floor plan, the walking graph, the fallback device layout, and defensive parsers
 * for everything the learner's hooks return. A learner's program can return anything (wrong types,
 * missing keys, unknown devices), so every parser here falls back to something sensible.
 */

// ───────────────────────── plan geometry (viewBox 640 x 440) ─────────────────────────

export const PLAN_W = 640;
export const PLAN_H = 440;

export type RoomId = "hall" | "living" | "kitchen" | "bedroom";
export type Place = RoomId | "outside";
export const ROOM_IDS: RoomId[] = ["hall", "living", "kitchen", "bedroom"];

export interface Point {
  x: number;
  y: number;
}

export interface RoomGeo {
  id: RoomId;
  label: string;
  short: string;
  x: number;
  y: number;
  w: number;
  h: number;
  /** Where a person stands (and where the sensor "sees" them). */
  center: Point;
  /** Top-left anchor of the room's name. */
  tag: Point;
  /** Fraction of daylight that reaches the room through windows when the blinds are open. */
  window: number;
}

export const ROOMS: Record<RoomId, RoomGeo> = {
  bedroom: { id: "bedroom", short: "Bedroom", label: "Bedroom", x: 60, y: 40, w: 220, h: 170, center: { x: 170, y: 140 }, tag: { x: 72, y: 62 }, window: 1 },
  kitchen: { id: "kitchen", short: "Kitchen", label: "Kitchen", x: 280, y: 40, w: 300, h: 170, center: { x: 430, y: 140 }, tag: { x: 292, y: 62 }, window: 0.8 },
  hall: { id: "hall", short: "Hall", label: "Hall", x: 60, y: 210, w: 160, h: 170, center: { x: 140, y: 292 }, tag: { x: 72, y: 232 }, window: 0 },
  living: { id: "living", short: "Living", label: "Living room", x: 220, y: 210, w: 360, h: 170, center: { x: 400, y: 300 }, tag: { x: 232, y: 232 }, window: 1 },
};

/** The yard south of the front door, where the person stands when they are "out". */
export const OUTSIDE: Point = { x: 130, y: 416 };
export const FRONT_DOOR: Point = { x: 130, y: 380 };

/** Doorway between two rooms (the gap in their shared wall). */
export const DOORWAYS: { a: Place; b: Place; at: Point }[] = [
  { a: "bedroom", b: "hall", at: { x: 130, y: 210 } },
  { a: "hall", b: "living", at: { x: 220, y: 300 } },
  { a: "living", b: "kitchen", at: { x: 435, y: 210 } },
  { a: "kitchen", b: "bedroom", at: { x: 280, y: 125 } },
  { a: "hall", b: "outside", at: FRONT_DOOR },
];

export const PLACE_POINT = (p: Place): Point => (p === "outside" ? OUTSIDE : ROOMS[p].center);

function neighbours(p: Place): { to: Place; at: Point }[] {
  return DOORWAYS.flatMap((d) => (d.a === p ? [{ to: d.b, at: d.at }] : d.b === p ? [{ to: d.a, at: d.at }] : []));
}

/** One stop on a walk. `leave` / `enter` say which place the person is leaving or reaching. */
export interface Step extends Point {
  leave?: Place;
  enter?: Place;
  /** The front door opens just before this step (true) or closes after it (false). */
  door?: boolean;
}

/** Shortest walk between two places, as steps through the doorways. Empty when already there. */
export function walkSteps(from: Place, to: Place): Step[] {
  if (from === to) return [];
  const prev = new Map<Place, { from: Place; at: Point } | null>([[from, null]]);
  const queue: Place[] = [from];
  while (queue.length && !prev.has(to)) {
    const here = queue.shift()!;
    for (const n of neighbours(here)) {
      if (!prev.has(n.to)) {
        prev.set(n.to, { from: here, at: n.at });
        queue.push(n.to);
      }
    }
  }
  if (!prev.has(to)) return [];
  const hops: { from: Place; to: Place; at: Point }[] = [];
  for (let cur: Place = to; ; ) {
    const link = prev.get(cur);
    if (!link) break;
    hops.unshift({ from: link.from, to: cur, at: link.at });
    cur = link.from;
  }
  const steps: Step[] = [];
  for (const hop of hops) {
    const outdoors = hop.from === "outside" || hop.to === "outside";
    if (outdoors) {
      // approach the door, step through (the door is open), then settle on the other side
      if (hop.from === "outside") {
        steps.push({ ...FRONT_DOOR, door: true });
        steps.push({ ...PLACE_POINT(hop.to), enter: hop.to, leave: hop.from, door: false });
      } else {
        steps.push({ ...FRONT_DOOR, leave: hop.from, door: true });
        steps.push({ ...OUTSIDE, enter: "outside", door: false });
      }
    } else {
      steps.push({ ...hop.at, leave: hop.from });
      steps.push({ ...PLACE_POINT(hop.to), enter: hop.to });
    }
  }
  return steps;
}

// ───────────────────────── devices ─────────────────────────

export type DeviceKind = "light" | "thermostat" | "lock" | "motion" | "speaker" | "blinds";
export const DEVICE_KINDS: DeviceKind[] = ["light", "thermostat", "lock", "motion", "speaker", "blinds"];

/** The feature a device kind belongs to: that lesson makes its objects live. */
export const KIND_FEATURE: Record<DeviceKind, string> = {
  light: "sh-lights",
  lock: "sh-lock",
  thermostat: "sh-climate",
  motion: "sh-sensors",
  speaker: "sh-comfort",
  blinds: "sh-comfort",
};

export interface CatalogDevice {
  id: string;
  kind: string;
  room: string;
  title: string;
}

export const isKind = (k: string): k is DeviceKind => (DEVICE_KINDS as string[]).includes(k);

/** The house as the lessons describe it. Drawn as blueprint paper until the learner's catalog() runs. */
export const DEFAULT_CATALOG: CatalogDevice[] = [
  { id: "thermostat", kind: "thermostat", room: "living", title: "Thermostat" },
  { id: "front_lock", kind: "lock", room: "hall", title: "Front door lock" },
  { id: "living_speaker", kind: "speaker", room: "living", title: "Living Speaker" },
  { id: "living_blinds", kind: "blinds", room: "living", title: "Living Blinds" },
  { id: "bedroom_blinds", kind: "blinds", room: "bedroom", title: "Bedroom Blinds" },
  ...ROOM_IDS.map((r) => ({ id: `${r}_light`, kind: "light", room: r, title: `${ROOMS[r].label} light` })),
  ...ROOM_IDS.map((r) => ({ id: `${r}_motion`, kind: "motion", room: r, title: `${ROOMS[r].label} motion` })),
];

const FIXED_POSITIONS: Record<string, Point> = {
  hall_light: { x: 140, y: 262 },
  living_light: { x: 400, y: 264 },
  kitchen_light: { x: 430, y: 96 },
  bedroom_light: { x: 170, y: 100 },
  hall_motion: { x: 82, y: 346 },
  living_motion: { x: 556, y: 346 },
  kitchen_motion: { x: 556, y: 66 },
  bedroom_motion: { x: 258, y: 190 },
  thermostat: { x: 548, y: 262 },
  front_lock: { x: 186, y: 345 },
  living_speaker: { x: 276, y: 344 },
  living_blinds: { x: 400, y: 380 },
  bedroom_blinds: { x: 223, y: 40 },
};

/** Where a device is drawn. Unknown devices (a learner may add their own) tuck into their room. */
export function devicePosition(d: CatalogDevice, slot: number): Point {
  const fixed = FIXED_POSITIONS[d.id];
  if (fixed) return fixed;
  const room = ROOMS[d.room as RoomId];
  if (!room) return { x: 40 + (slot % 8) * 22, y: 420 };
  return { x: room.x + 24 + (slot % 5) * 26, y: room.y + room.h - 26 };
}

// Windows on the outer walls (x1..x2 at y), tied to a blinds device when there is one.
export const WINDOWS: { id: string; room: RoomId; x1: number; x2: number; y: number; blinds?: string }[] = [
  { id: "w-bedroom", room: "bedroom", x1: 178, x2: 268, y: 40, blinds: "bedroom_blinds" },
  { id: "w-kitchen", room: "kitchen", x1: 380, x2: 500, y: 40 },
  { id: "w-living", room: "living", x1: 340, x2: 460, y: 380, blinds: "living_blinds" },
];

// ───────────────────────── time, light, temperature ─────────────────────────

export const DEFAULT_SUNRISE = 6 * 60 + 30;
export const DEFAULT_SUNSET = 18 * 60;

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function fmtTime(minute: number): string {
  const m = ((Math.round(minute) % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

export function isDarkAt(minute: number, sunrise: number, sunset: number): boolean {
  return minute < sunrise || minute >= sunset;
}

/** 0 at deep night, 1 at full day, with a 45 minute ramp around sunrise and sunset. */
export function daylight(minute: number, sunrise: number, sunset: number): number {
  const ramp = 45;
  if (minute < sunrise - ramp || minute > sunset + ramp) return 0;
  if (minute < sunrise + ramp) return clamp((minute - (sunrise - ramp)) / (2 * ramp), 0, 1);
  if (minute > sunset - ramp) return clamp(((sunset + ramp) - minute) / (2 * ramp), 0, 1);
  return 1;
}

export const fmtTemp = (t: number) => `${t.toFixed(1)}°C`;

// ───────────────────────── defensive parsing of hook results ─────────────────────────

type Rec = Record<string, unknown>;
export const isRec = (v: unknown): v is Rec => !!v && typeof v === "object" && !Array.isArray(v);
export const asArray = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
export const asStr = (v: unknown, fallback = ""): string => (typeof v === "string" ? v : typeof v === "number" || typeof v === "boolean" ? String(v) : fallback);
export const asNum = (v: unknown, fallback: number): number => (typeof v === "number" && Number.isFinite(v) ? v : fallback);
export const asBool = (v: unknown, fallback = false): boolean => (typeof v === "boolean" ? v : fallback);

export function parseCatalog(raw: unknown): CatalogDevice[] {
  const seen = new Set<string>();
  const out: CatalogDevice[] = [];
  for (const item of asArray(raw)) {
    if (!isRec(item)) continue;
    const id = asStr(item.id);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push({ id, kind: asStr(item.kind, "light"), room: asStr(item.room, "living"), title: asStr(item.title, id) });
  }
  return out;
}

export type DeviceState = Rec & { id: string; kind: string; room: string };

export function parseSnapshot(raw: unknown): Record<string, DeviceState> {
  const out: Record<string, DeviceState> = {};
  if (!isRec(raw)) return out;
  for (const [id, value] of Object.entries(raw)) {
    if (!isRec(value)) continue;
    out[id] = { ...value, id, kind: asStr(value.kind), room: asStr(value.room) };
  }
  return out;
}

export interface LogLine {
  seq: number;
  name: string;
  payload: Rec;
}

export function parseEvents(raw: unknown): LogLine[] {
  const out: LogLine[] = [];
  asArray(raw).forEach((item, i) => {
    if (!isRec(item)) return;
    out.push({ seq: asNum(item.seq, i), name: asStr(item.name, "?"), payload: isRec(item.payload) ? item.payload : {} });
  });
  return out;
}

export interface BusError {
  event: string;
  seq: number;
  handler: string;
  error: string;
}

export function parseErrors(raw: unknown): BusError[] {
  return asArray(raw).flatMap((item) =>
    isRec(item) ? [{ event: asStr(item.event, "?"), seq: asNum(item.seq, 0), handler: asStr(item.handler, "handler"), error: asStr(item.error, "error") }] : [],
  );
}

export interface PhoneMessage {
  at: string;
  title: string;
  body: string;
}

export function parsePhone(raw: unknown): PhoneMessage[] {
  return asArray(raw).flatMap((item) => (isRec(item) ? [{ at: asStr(item.at, "--:--"), title: asStr(item.title, "(no title)"), body: asStr(item.body) }] : []));
}

export interface RuleStatus {
  name: string;
  on: string;
  fired: number;
  skipped: number;
  failed: number;
  result: string;
  last: string;
}

export interface RuleDecision {
  seq: number;
  rule: string;
  result: string;
  why: string;
  event: string;
}

export function parseAutomations(raw: unknown): { rules: RuleStatus[]; log: RuleDecision[] } {
  if (!isRec(raw)) return { rules: [], log: [] };
  const rules = asArray(raw.rules).flatMap((r) =>
    isRec(r)
      ? [
          {
            name: asStr(r.name, "rule"),
            on: asStr(r.on),
            fired: asNum(r.fired, 0),
            skipped: asNum(r.skipped, 0),
            failed: asNum(r.failed, 0),
            result: asStr(r.result, "idle"),
            last: asStr(r.last),
          },
        ]
      : [],
  );
  const log = asArray(raw.log).flatMap((r) =>
    isRec(r) ? [{ seq: asNum(r.seq, 0), rule: asStr(r.rule, "rule"), result: asStr(r.result, "?"), why: asStr(r.why), event: asStr(r.event) }] : [],
  );
  return { rules, log };
}

export function parseVisits(raw: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  for (const item of asArray(raw)) {
    if (isRec(item) && typeof item.room === "string") out[item.room] = Math.max(0, asNum(item.visits, 0));
  }
  return out;
}

export const parseStrings = (raw: unknown): string[] => asArray(raw).flatMap((v) => (typeof v === "string" ? [v] : []));

export function parseDayMap(raw: unknown): { minute: number; dark: boolean }[] {
  return asArray(raw).flatMap((item) => (isRec(item) && typeof item.minute === "number" ? [{ minute: item.minute, dark: asBool(item.dark) }] : []));
}

/** A one-line description of an event payload for the log: {room: "hall"} -> room hall. */
export function payloadText(payload: Rec): string {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(payload)) {
    if (typeof v === "object" && v !== null) continue;
    parts.push(`${k} ${typeof v === "string" ? v : typeof v === "number" ? (Number.isInteger(v) ? v : v.toFixed(1)) : String(v)}`);
    if (parts.length >= 3) break;
  }
  return parts.join(" · ");
}

// ───────────────────────── colour (Pockett Stage palette, 2D) ─────────────────────────

export const COLOR = {
  void: "#0a0a0a",
  night: "#0c0d0e",
  day: "#2a2c2e",
  floor: "#161616",
  floorLit: "#2c2c2c",
  wall: "#4a4a4a",
  wallDim: "#2f2f2f",
  text: "#f4f4f4",
  muted: "#8a8a8a",
  lime: "#a3e635",
  limeSoft: "#bef264",
  limeDeep: "#4d7c0f",
  warm: "#ffb26b",
  warmCore: "#fff4dc",
  danger: "#f87171",
  warning: "#fbbf24",
} as const;

const hexToRgb = (hex: string): [number, number, number] => {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
};

/** Blend two #rrggbb colours: t = 0 gives a, t = 1 gives b. */
export function mixHex(a: string, b: string, t: number): string {
  const k = clamp(t, 0, 1);
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  const ch = (x: number, y: number) => Math.round(x + (y - x) * k).toString(16).padStart(2, "0");
  return `#${ch(ar, br)}${ch(ag, bg)}${ch(ab, bb)}`;
}
