/**
 * Pure simulation for the Turbo Garage scene: track geometry, sensors and car physics.
 * No DOM, no React, no imports: the rendering lives in GarageScene.tsx, and
 * scripts/tune-garage.mjs runs this headlessly to prove the reference autopilot can lap.
 */

export const WORLD_W = 1000;
export const WORLD_H = 600;
export const KMH = 1.55; // world units per second for 1 km/h
export const SENSOR_RANGE = 150;
export const SENSOR_ANGLE = (38 * Math.PI) / 180;
export const MAX_STEER = 35;

export interface Vec {
  x: number;
  y: number;
}

export interface Track {
  pts: Vec[];
  tangent: number[];
  halfWidth: number;
  length: number;
}

/**
 * The circuit: hand-placed control points joined by a closed centripetal Catmull-Rom spline,
 * then resampled at equal arc-length spacing (so "progress" is fair and corners stay round).
 * Clockwise on screen, starting on the top straight heading east.
 */
export const CIRCUIT: Vec[] = [
  { x: 330, y: 110 },
  { x: 640, y: 110 },
  { x: 820, y: 130 },
  { x: 905, y: 230 },
  { x: 880, y: 370 },
  { x: 770, y: 470 },
  { x: 625, y: 455 },
  { x: 520, y: 385 },
  { x: 400, y: 410 },
  { x: 285, y: 490 },
  { x: 150, y: 455 },
  { x: 95, y: 320 },
  { x: 140, y: 175 },
];

function catmullRom(p0: Vec, p1: Vec, p2: Vec, p3: Vec, t: number): Vec {
  // centripetal parameterisation avoids cusps and overshoot
  const d = (a: Vec, b: Vec) => Math.pow(Math.hypot(b.x - a.x, b.y - a.y), 0.5) || 1e-4;
  const t0 = 0;
  const t1 = t0 + d(p0, p1);
  const t2 = t1 + d(p1, p2);
  const t3 = t2 + d(p2, p3);
  const tt = t1 + (t2 - t1) * t;
  const lerp = (a: Vec, b: Vec, ta: number, tb: number) => {
    const k = (tt - ta) / (tb - ta);
    return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k };
  };
  const a1 = lerp(p0, p1, t0, t1);
  const a2 = lerp(p1, p2, t1, t2);
  const a3 = lerp(p2, p3, t2, t3);
  const b1 = lerp(a1, a2, t0, t2);
  const b2 = lerp(a2, a3, t1, t3);
  return lerp(b1, b2, t1, t2);
}

export function buildTrack(samples = 480, halfWidth = 38): Track {
  const n = CIRCUIT.length;
  const dense: Vec[] = [];
  for (let i = 0; i < n; i++) {
    const p0 = CIRCUIT[(i - 1 + n) % n];
    const p1 = CIRCUIT[i];
    const p2 = CIRCUIT[(i + 1) % n];
    const p3 = CIRCUIT[(i + 2) % n];
    for (let k = 0; k < 60; k++) dense.push(catmullRom(p0, p1, p2, p3, k / 60));
  }
  // resample by arc length
  const cum = [0];
  for (let i = 1; i <= dense.length; i++) {
    const a = dense[i - 1];
    const b = dense[i % dense.length];
    cum.push(cum[i - 1] + Math.hypot(b.x - a.x, b.y - a.y));
  }
  const length = cum[cum.length - 1];
  const pts: Vec[] = [];
  let j = 0;
  for (let i = 0; i < samples; i++) {
    const target = (i / samples) * length;
    while (cum[j + 1] < target) j++;
    const a = dense[j];
    const b = dense[(j + 1) % dense.length];
    const k = (target - cum[j]) / (cum[j + 1] - cum[j] || 1);
    pts.push({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k });
  }
  const tangent: number[] = [];
  for (let i = 0; i < samples; i++) {
    const a = pts[(i - 1 + samples) % samples];
    const b = pts[(i + 1) % samples];
    tangent.push(Math.atan2(b.y - a.y, b.x - a.x));
  }
  return { pts, tangent, halfWidth, length };
}

export interface Nearest {
  index: number;
  dist: number;
  /** Signed lateral offset from the centre line: positive = right of travel direction. */
  lateral: number;
}

export function nearest(track: Track, x: number, y: number): Nearest {
  let best = Infinity;
  let index = 0;
  const { pts } = track;
  for (let i = 0; i < pts.length; i++) {
    const dx = pts[i].x - x;
    const dy = pts[i].y - y;
    const d = dx * dx + dy * dy;
    if (d < best) {
      best = d;
      index = i;
    }
  }
  const p = pts[index];
  const th = track.tangent[index];
  // dot with the right-hand normal (-sin, cos); screen y points down.
  const cross = Math.cos(th) * (y - p.y) - Math.sin(th) * (x - p.x);
  const dist = Math.sqrt(best);
  return { index, dist, lateral: cross >= 0 ? dist : -dist };
}

/** Distance from (x, y) along `angle` to the edge of the asphalt (capped at `max`). */
export function castRay(track: Track, x: number, y: number, angle: number, max = SENSOR_RANGE): number {
  const step = 5;
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  for (let d = 0; d < max; d += step) {
    if (nearest(track, x + dx * d, y + dy * d).dist > track.halfWidth) return d;
  }
  return max;
}

export interface Sensors {
  left: number;
  front: number;
  right: number;
}

export function readSensors(track: Track, car: CarState): Sensors {
  const h = car.heading;
  return {
    left: round3(castRay(track, car.x, car.y, h - SENSOR_ANGLE) / SENSOR_RANGE),
    front: round3(castRay(track, car.x, car.y, h) / SENSOR_RANGE),
    right: round3(castRay(track, car.x, car.y, h + SENSOR_ANGLE) / SENSOR_RANGE),
  };
}

const round3 = (v: number) => Math.round(v * 1000) / 1000;

export interface CarSpec {
  topSpeed: number; // km/h
  acceleration: number; // km/h per second at full throttle
  grip: number; // 1 = medium tyre
}

export interface CarState {
  x: number;
  y: number;
  heading: number;
  kmh: number;
  wheel: number; // current front wheel angle, degrees (+ = right)
  pedal: number; // smoothed pedal 0..1
  progress: number; // 0..1 around the lap
  lap: number;
  lapTime: number;
  lastLap: number | null;
  bestLap: number | null;
  gatesPassed: number[];
  sliding: boolean;
  braking: boolean;
  crashes: number;
  stuckFor: number;
  odometer: number;
}

export interface Controls {
  throttle: number; // 0..1, after the throttle curve
  brake: boolean;
  steer: number; // requested wheel angle, degrees
}

export type SimEvent =
  | { kind: "lap"; time: number; lap: number }
  | { kind: "gate"; at: number; split: number }
  | { kind: "wall" }
  | { kind: "respawn" };

export function spawn(track: Track): CarState {
  const p = track.pts[0];
  return {
    x: p.x,
    y: p.y,
    heading: track.tangent[0],
    kmh: 0,
    wheel: 0,
    pedal: 0,
    progress: 0,
    lap: 0,
    lapTime: 0,
    lastLap: null,
    bestLap: null,
    gatesPassed: [],
    sliding: false,
    braking: false,
    crashes: 0,
    stuckFor: 0,
    odometer: 0,
  };
}

/** Put the car back on the centre line where it is (keeps lap progress). */
export function recover(track: Track, car: CarState) {
  const n = nearest(track, car.x, car.y);
  const p = track.pts[n.index];
  car.x = p.x;
  car.y = p.y;
  car.heading = track.tangent[n.index];
  car.kmh = 0;
  car.wheel = 0;
  car.stuckFor = 0;
}

const WHEELBASE = 22;
const LATERAL_G = 340;

export function step(track: Track, car: CarState, spec: CarSpec, input: Controls, dt: number): SimEvent[] {
  const events: SimEvent[] = [];
  const top = Math.max(20, spec.topSpeed);

  // longitudinal
  const drive = spec.acceleration * input.throttle * Math.max(0, 1 - Math.pow(car.kmh / top, 2));
  const drag = 0.03 * car.kmh;
  const brake = input.brake ? 70 : 0;
  car.kmh = Math.max(0, car.kmh + (drive - drag - brake) * dt);
  car.braking = input.brake && car.kmh > 1;

  // steering (wheel turns at a limited rate)
  const target = Math.max(-MAX_STEER, Math.min(MAX_STEER, Number.isFinite(input.steer) ? input.steer : 0));
  const maxDelta = 240 * dt;
  car.wheel += Math.max(-maxDelta, Math.min(maxDelta, target - car.wheel));

  // yaw (bicycle model, limited by tyre grip)
  const v = car.kmh * KMH;
  const wanted = (v / WHEELBASE) * Math.tan((car.wheel * Math.PI) / 180);
  const limit = (spec.grip * LATERAL_G) / Math.max(v, 1);
  const yaw = Math.max(-limit, Math.min(limit, wanted));
  car.sliding = Math.abs(wanted) > limit * 1.05 && car.kmh > 25;
  if (car.sliding) car.kmh = Math.max(0, car.kmh - 14 * dt);
  car.heading += yaw * dt;

  const before = { x: car.x, y: car.y };
  car.x += Math.cos(car.heading) * v * dt;
  car.y += Math.sin(car.heading) * v * dt;
  car.odometer += Math.hypot(car.x - before.x, car.y - before.y);

  // track limits
  const n = nearest(track, car.x, car.y);
  const wall = track.halfWidth + 12;
  if (n.dist > track.halfWidth) car.kmh = Math.max(0, car.kmh - 55 * dt); // kerb / grass
  if (n.dist > wall) {
    const p = track.pts[n.index];
    const k = wall / n.dist;
    car.x = p.x + (car.x - p.x) * k;
    car.y = p.y + (car.y - p.y) * k;
    if (car.kmh > 18) {
      car.crashes++;
      events.push({ kind: "wall" });
    }
    car.kmh *= 0.35;
  }

  // stuck detection -> respawn on the centre line
  if (car.kmh < 4 && n.dist > track.halfWidth - 6 && (input.throttle > 0.1 || car.stuckFor > 0)) car.stuckFor += dt;
  else car.stuckFor = Math.max(0, car.stuckFor - dt);
  if (car.stuckFor > 1.4) {
    recover(track, car);
    events.push({ kind: "respawn" });
  }

  // lap progress
  const prev = car.progress;
  car.progress = n.index / track.pts.length;
  if (car.kmh > 0.5 || car.lap > 0 || prev > 0) car.lapTime += dt;
  if (prev > 0.85 && car.progress < 0.15) {
    if (car.lapTime > 3) {
      car.lap++;
      car.lastLap = round3(car.lapTime);
      car.bestLap = car.bestLap === null ? car.lastLap : Math.min(car.bestLap, car.lastLap);
      events.push({ kind: "lap", time: car.lastLap, lap: car.lap });
    }
    car.lapTime = 0;
    car.gatesPassed = [];
  } else if (prev < 0.15 && car.progress > 0.85) {
    car.lapTime = 0;
  }
  return events;
}

export function crossedGates(prev: number, now: number, gates: number[], passed: number[]): number[] {
  const hit: number[] = [];
  for (const g of gates) {
    const at = g / 100;
    if (passed.includes(g)) continue;
    if (prev < at && now >= at && now - prev < 0.2) hit.push(g);
  }
  return hit;
}

/**
 * Default speed control used while the autopilot drives: ease off when the road ahead
 * closes in. A learner can override it by defining `autopilot.throttle(sensors)`.
 */
export function cruise(spec: CarSpec, kmh: number, sensors: Sensors): { throttle: number; brake: boolean } {
  const target = spec.topSpeed * (0.3 + 0.5 * Math.min(1, sensors.front * 1.3));
  if (kmh > target + 6) return { throttle: 0, brake: true };
  return { throttle: kmh < target ? 1 : 0, brake: false };
}
