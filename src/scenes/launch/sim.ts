/**
 * Pure flight simulation for the Launch Control scene: a 2D point-mass rocket on a small
 * "pocket Earth" (a tenth of the real radius, same 9.81 m/s² gravity), with thrust, staging,
 * atmospheric drag, a pitch program and an automatic orbit check.
 * No DOM, no React, no imports: rendering lives in LaunchScene.tsx, and
 * scripts/tune-launch.mjs runs this headlessly to prove the reference program reaches orbit.
 *
 * Units are SI (metres, seconds, kilograms, newtons) unless a name says otherwise.
 */

export const R_PLANET = 640_000;
export const G0 = 9.81;
export const MU = G0 * R_PLANET * R_PLANET;
export const ISP = 320;
/** Exhaust velocity (m/s). Fuel burned = thrust x time / VE. */
export const VE = ISP * G0;
const RHO0 = 1.225;
const SCALE_HEIGHT = 7200;
const CDA = 5; // drag coefficient x frontal area (m²)

/** Perigee (km above the surface) a trajectory needs before the flight computer calls it an orbit. */
export const ORBIT_PERIGEE_KM = 80;
/** Delta-v (m/s) the leftover fuel must provide for a trans-lunar injection. */
export const TLI_DV = 800;
/** With guidance on, the flight computer cuts the engines once the apogee reaches this height... */
export const TARGET_APOGEE_KM = 110;
export const CONTROL_DT = 0.1;
const PITCH_RATE = 12; // degrees per second the rocket can swing
const THROTTLE_RATE = 3; // full range per second
export const STAGE_GAP = 1.4; // seconds of coasting after a separation
const MAX_PITCH = 100;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

// ───────────────────────── rocket description ─────────────────────────

export interface StageSpec {
  name: string;
  thrustKn: number;
  burnSeconds: number;
  dryT: number;
  /** Propellant in tonnes (derived: thrust x burn time / exhaust velocity). */
  fuelT: number;
}

export interface RocketSpec {
  payloadT: number;
  stages: StageSpec[];
  staged: boolean;
  /**
   * True once the learner has a guidance program. The flight computer then cuts the engines when
   * the apogee is high enough, coasts up to it, and relights so the pitch program can circularize.
   */
  guided: boolean;
}

export function makeStage(name: string, thrustKn: number, burnSeconds: number, dryT: number): StageSpec {
  const thrust = clamp(thrustKn, 0, 30000);
  const burn = clamp(burnSeconds, 1, 600);
  return { name, thrustKn: thrust, burnSeconds: burn, dryT: clamp(dryT, 0.1, 800), fuelT: (thrust * burn) / VE };
}

/** One big tank and engine: the rocket from lessons 2 to 6. */
export function singleStageRocket(thrustKn: number, fuelT: number, dryT: number): RocketSpec {
  const thrust = clamp(thrustKn, 0, 30000);
  const fuel = clamp(fuelT, 0.1, 2000);
  const burn = thrust > 0 ? (fuel * VE) / thrust : 600;
  return {
    payloadT: 0,
    staged: false,
    guided: false,
    stages: [{ name: "Rocket", thrustKn: thrust, burnSeconds: burn, dryT: clamp(dryT, 1, 1000), fuelT: fuel }],
  };
}

/** Reads the learner's `stages` list. Returns null if nothing usable is in it. */
export function stagedRocket(rawStages: unknown, payloadT: number): RocketSpec | null {
  if (!Array.isArray(rawStages)) return null;
  const stages: StageSpec[] = [];
  for (const item of rawStages.slice(0, 4)) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const s = item as Record<string, unknown>;
    if (!isNum(s.thrust_kn) || !isNum(s.burn_seconds)) continue;
    const name = typeof s.name === "string" && s.name.trim() ? s.name.trim().slice(0, 22) : `Stage ${stages.length + 1}`;
    stages.push(makeStage(name, s.thrust_kn, s.burn_seconds, isNum(s.dry_t) ? s.dry_t : 5));
  }
  if (stages.length === 0) return null;
  return { payloadT: clamp(isNum(payloadT) ? payloadT : 12, 0.5, 800), stages, staged: true, guided: false };
}

export function initialMassKg(spec: RocketSpec): number {
  let m = spec.payloadT;
  for (const s of spec.stages) m += s.dryT + s.fuelT;
  return m * 1000;
}

export function totalFuelKg(spec: RocketSpec): number {
  return spec.stages.reduce((a, s) => a + s.fuelT, 0) * 1000;
}

/** Thrust-to-weight at liftoff with the given throttle. */
export function liftoffTwr(spec: RocketSpec, throttle = 1): number {
  return (spec.stages[0].thrustKn * 1000 * throttle) / (initialMassKg(spec) * G0);
}

// ───────────────────────── flight state ─────────────────────────

export type Phase = "ascent" | "coast" | "orbit" | "ended";

export type OutcomeKind = "orbit" | "moon" | "suborbital" | "escape" | "crash" | "abort" | "nolift";

export interface Outcome {
  kind: OutcomeKind;
  apogeeKm: number;
  perigeeKm: number;
  maxAltKm: number;
  maxSpeed: number;
  fuelLeftPct: number;
  dvLeft: number;
  t: number;
}

export type FlightEvent =
  | { kind: "liftoff" }
  | { kind: "maxq"; q: number }
  | { kind: "stage_sep"; index: number; name: string; last: boolean }
  | { kind: "stage_ignite"; index: number; name: string }
  | { kind: "burnout" }
  | { kind: "meco" }
  | { kind: "relight" }
  | { kind: "orbit"; perigeeKm: number; apogeeKm: number }
  | { kind: "abort" }
  | { kind: "crash" }
  | { kind: "nolift" };

export interface Flight {
  x: number;
  y: number;
  vx: number;
  vy: number;
  t: number;
  phase: Phase;
  /** Index of the stage that fires (or last fired). */
  stage: number;
  /** Number of stages already thrown away. */
  jettisoned: number;
  fuel: number[];
  gap: number;
  throttleCmd: number;
  throttle: number;
  pitchCmd: number;
  /** Degrees from straight up toward downrange. */
  pitch: number;
  released: boolean;
  controlAcc: number;
  qPeak: number;
  qNow: number;
  qEvent: boolean;
  maxAlt: number;
  maxSpeed: number;
  accelG: number;
  burnedOut: boolean;
  burnoutT: number;
  /** The flight computer is holding the engines off while the rocket coasts up to apogee. */
  hold: boolean;
  mecoDone: boolean;
  outcome: Outcome | null;
  events: FlightEvent[];
}

export function createFlight(spec: RocketSpec): Flight {
  return {
    x: 0,
    y: R_PLANET,
    vx: 0,
    vy: 0,
    t: 0,
    phase: "ascent",
    stage: 0,
    jettisoned: 0,
    fuel: spec.stages.map((s) => s.fuelT * 1000),
    gap: 0,
    throttleCmd: 1,
    throttle: 0,
    pitchCmd: 0,
    pitch: 0,
    released: false,
    controlAcc: CONTROL_DT, // run the hooks on the very first step
    qPeak: 0,
    qNow: 0,
    qEvent: false,
    maxAlt: 0,
    maxSpeed: 0,
    accelG: 1,
    burnedOut: false,
    burnoutT: 0,
    hold: false,
    mecoDone: false,
    outcome: null,
    events: [],
  };
}

export const altitudeM = (f: Flight) => Math.hypot(f.x, f.y) - R_PLANET;
export const altitudeKm = (f: Flight) => altitudeM(f) / 1000;
export const speedMs = (f: Flight) => Math.hypot(f.vx, f.vy);
/** Downrange angle around the planet, radians (0 = straight above the pad). */
export const downrange = (f: Flight) => Math.atan2(f.x, f.y);

export function massKg(f: Flight, spec: RocketSpec): number {
  let m = spec.payloadT * 1000;
  for (let i = f.jettisoned; i < spec.stages.length; i++) m += spec.stages[i].dryT * 1000 + f.fuel[i];
  return m;
}

export function fuelFraction(f: Flight, spec: RocketSpec): number {
  const total = totalFuelKg(spec);
  if (total <= 0) return 0;
  return clamp(f.fuel.reduce((a, b) => a + b, 0) / total, 0, 1);
}

export interface OrbitElements {
  perigeeKm: number;
  apogeeKm: number;
}

/** Osculating orbit from the current state; null when the rocket is on an escape trajectory. */
export function orbitElements(f: Flight): OrbitElements | null {
  const r = Math.hypot(f.x, f.y);
  const v2 = f.vx * f.vx + f.vy * f.vy;
  const eps = v2 / 2 - MU / r;
  if (eps >= 0) return null;
  const a = -MU / (2 * eps);
  const h = f.x * f.vy - f.y * f.vx;
  const e = Math.sqrt(Math.max(0, 1 + (2 * eps * h * h) / (MU * MU)));
  return { perigeeKm: (a * (1 - e) - R_PLANET) / 1000, apogeeKm: (a * (1 + e) - R_PLANET) / 1000 };
}

/** Delta-v (m/s) still available from the fuel on board (stages thrown away as they empty). */
export function deltaVLeft(f: Flight, spec: RocketSpec): number {
  let dv = 0;
  let m = massKg(f, spec);
  const first = f.burnedOut ? spec.stages.length : f.stage;
  for (let i = first; i < spec.stages.length; i++) {
    const fuel = f.fuel[i];
    if (fuel <= 0) continue;
    dv += VE * Math.log(m / (m - fuel));
    m -= fuel;
    if (i < spec.stages.length - 1) m -= spec.stages[i].dryT * 1000;
  }
  return dv;
}

// ───────────────────────── stepping ─────────────────────────

export interface Hooks {
  /** Engine power 0..1 at `t` seconds after ignition. */
  throttle?: (t: number) => number | undefined;
  /** Degrees from vertical for the given altitude (km). */
  pitch?: (altitudeKm: number) => number | undefined;
  /** True to trigger an abort. */
  abort?: (altitudeKm: number, speed: number, fuelPct: number) => boolean | undefined;
}

function makeOutcome(f: Flight, spec: RocketSpec, kind: OutcomeKind): Outcome {
  const el = orbitElements(f);
  return {
    kind,
    apogeeKm: el ? el.apogeeKm : Infinity,
    perigeeKm: el ? el.perigeeKm : Infinity,
    maxAltKm: f.maxAlt / 1000,
    maxSpeed: f.maxSpeed,
    fuelLeftPct: fuelFraction(f, spec) * 100,
    dvLeft: deltaVLeft(f, spec),
    t: f.t,
  };
}

function finish(f: Flight, spec: RocketSpec, kind: OutcomeKind) {
  if (!f.outcome) f.outcome = makeOutcome(f, spec, kind);
  else {
    f.outcome.maxAltKm = f.maxAlt / 1000;
    f.outcome.maxSpeed = f.maxSpeed;
    f.outcome.t = f.t;
    if (kind === "crash" && f.outcome.kind === "suborbital") f.outcome.kind = "crash";
  }
  f.phase = "ended";
  f.throttle = 0;
}

/** Runs the learner hooks and the flight-computer decisions. Called every CONTROL_DT at most. */
function control(f: Flight, spec: RocketSpec, hooks: Hooks) {
  const alt = altitudeKm(f);
  const speed = speedMs(f);

  if (f.phase === "ascent") {
    if (hooks.abort && f.t > 0.3) {
      if (hooks.abort(alt, speed, fuelFraction(f, spec) * 100) === true) {
        f.events.push({ kind: "abort" });
        finish(f, spec, "abort");
        return;
      }
    }
    const th = hooks.throttle ? hooks.throttle(f.t) : 1;
    f.throttleCmd = isNum(th) ? clamp(th, 0, 1) : 1;
    const p = hooks.pitch ? hooks.pitch(alt) : 0;
    f.pitchCmd = isNum(p) ? clamp(p, 0, MAX_PITCH) : 0;

    if (spec.guided) {
      const r = Math.hypot(f.x, f.y);
      const vr = (f.vx * f.x + f.vy * f.y) / r;
      const el = orbitElements(f);
      // During the circularization burn the computer tilts the nose up just enough to stop sinking.
      if (f.mecoDone && !f.hold) f.pitchCmd = clamp(f.pitchCmd - clamp(-vr * 0.1, 0, 45), 0, MAX_PITCH);
      if (!f.mecoDone && !f.hold && alt > 60 && vr > 0 && el && el.apogeeKm >= TARGET_APOGEE_KM && el.perigeeKm < ORBIT_PERIGEE_KM) {
        f.hold = true;
        f.mecoDone = true;
        f.events.push({ kind: "meco" });
      } else if (f.hold && vr <= 8) {
        f.hold = false;
        f.events.push({ kind: "relight" });
      }
    }
  }

  if ((f.phase === "ascent" || f.phase === "coast") && alt > 60) {
    const el = orbitElements(f);
    if (el && el.perigeeKm >= ORBIT_PERIGEE_KM) {
      f.throttle = 0;
      f.phase = "orbit";
      const dv = deltaVLeft(f, spec);
      f.outcome = makeOutcome(f, spec, dv >= TLI_DV ? "moon" : "orbit");
      f.events.push({ kind: "orbit", perigeeKm: el.perigeeKm, apogeeKm: el.apogeeKm });
      return;
    }
  }

  if (f.phase === "coast" && !f.outcome) {
    const el = orbitElements(f);
    f.outcome = makeOutcome(f, spec, el ? "suborbital" : "escape");
  }
}

function physics(f: Flight, spec: RocketSpec, dt: number) {
  const r = Math.hypot(f.x, f.y);
  const erx = f.x / r;
  const ery = f.y / r;
  const etx = ery;
  const ety = -erx;
  const alt = r - R_PLANET;

  f.t += dt;
  f.pitch += clamp(f.pitchCmd - f.pitch, -PITCH_RATE * dt, PITCH_RATE * dt);

  // ── thrust ──
  let thrust = 0;
  if (f.phase === "ascent" && !f.burnedOut && f.hold) {
    f.throttle = 0;
  } else if (f.phase === "ascent" && !f.burnedOut) {
    if (f.gap > 0) {
      f.gap -= dt;
      f.throttle = 0;
      if (f.gap <= 0) f.events.push({ kind: "stage_ignite", index: f.stage, name: spec.stages[f.stage].name });
    } else {
      f.throttle += clamp(f.throttleCmd - f.throttle, -THROTTLE_RATE * dt, THROTTLE_RATE * dt);
      const st = spec.stages[f.stage];
      const want = st.thrustKn * 1000 * f.throttle;
      const flow = want / VE;
      const burn = Math.min(flow * dt, f.fuel[f.stage]);
      thrust = flow > 0 ? want * (burn / (flow * dt)) : 0;
      f.fuel[f.stage] -= burn;
      if (f.fuel[f.stage] <= 1e-3) {
        f.fuel[f.stage] = 0;
        const last = f.stage >= spec.stages.length - 1;
        f.events.push({ kind: "stage_sep", index: f.stage, name: st.name, last });
        if (last) {
          f.burnedOut = true;
          f.burnoutT = f.t;
          f.phase = "coast";
          f.throttle = 0;
          f.events.push({ kind: "burnout" });
        } else {
          f.jettisoned = f.stage + 1;
          f.stage++;
          f.gap = STAGE_GAP;
          f.throttle = 0;
        }
      }
    }
  } else {
    f.throttle = 0;
  }

  const m = massKg(f, spec);
  const p = (f.pitch * Math.PI) / 180;
  const dx = erx * Math.cos(p) + etx * Math.sin(p);
  const dy = ery * Math.cos(p) + ety * Math.sin(p);

  // ── forces ──
  const speed = Math.hypot(f.vx, f.vy);
  const rho = RHO0 * Math.exp(-Math.max(0, alt) / SCALE_HEIGHT);
  const q = 0.5 * rho * speed * speed;
  f.qNow = q;
  const dragN = q * CDA;
  const g = MU / (r * r);
  let ax = (thrust * dx) / m - g * erx;
  let ay = (thrust * dy) / m - g * ery;
  if (speed > 1e-6) {
    ax -= (dragN * (f.vx / speed)) / m;
    ay -= (dragN * (f.vy / speed)) / m;
  }
  f.accelG = Math.hypot(ax + g * erx, ay + g * ery) / G0 + 1e-9;

  // ── launch pad: held down until thrust beats weight ──
  if (!f.released && alt < 1) {
    const ar = ax * erx + ay * ery;
    if (ar <= 0) {
      f.x = erx * R_PLANET;
      f.y = ery * R_PLANET;
      f.vx = 0;
      f.vy = 0;
      f.accelG = 1;
      if (f.phase === "ascent" && f.t > 8 && !f.outcome) {
        f.events.push({ kind: "nolift" });
        finish(f, spec, "nolift");
      }
      return;
    }
    f.released = true;
    f.events.push({ kind: "liftoff" });
  }

  f.vx += ax * dt;
  f.vy += ay * dt;
  f.x += f.vx * dt;
  f.y += f.vy * dt;

  // ── bookkeeping ──
  const r2 = Math.hypot(f.x, f.y);
  const alt2 = r2 - R_PLANET;
  f.maxAlt = Math.max(f.maxAlt, alt2);
  f.maxSpeed = Math.max(f.maxSpeed, Math.hypot(f.vx, f.vy));
  if (q > f.qPeak) f.qPeak = q;
  else if (!f.qEvent && f.qPeak > 4000 && q < f.qPeak * 0.9) {
    f.qEvent = true;
    f.events.push({ kind: "maxq", q: f.qPeak });
  }

  // ── ground contact after flying ──
  if (alt2 < 0 && f.released) {
    f.x *= R_PLANET / r2;
    f.y *= R_PLANET / r2;
    if (!f.outcome) f.events.push({ kind: "crash" });
    finish(f, spec, "crash");
    return;
  }

  // ── burned out without reaching orbit: the result is already decided, so wrap up shortly ──
  if (f.phase === "coast" && f.outcome && f.t - f.burnoutT > 2.5) finish(f, spec, f.outcome.kind);
  if (f.t > 3000 && f.phase !== "ended") finish(f, spec, "suborbital");
}

/**
 * Advance the mission by `dt` seconds (any size; it is chopped into physics steps).
 * Hooks run at most once per call, and at most every CONTROL_DT of mission time.
 */
export function advance(f: Flight, spec: RocketSpec, hooks: Hooks, dt: number) {
  if (f.phase === "ended" || !(dt > 0)) return;
  f.controlAcc += dt;
  if (f.controlAcc >= CONTROL_DT) {
    f.controlAcc = 0;
    control(f, spec, hooks);
    if ((f.phase as Phase) === "ended") return;
  }
  let left = dt;
  while (left > 1e-9 && (f.phase as Phase) !== "ended") {
    const h = Math.min(left, 0.05);
    physics(f, spec, h);
    left -= h;
  }
}

/** How fast the scene should run time right now (the sim itself is warp-agnostic). */
export function suggestWarp(f: Flight): number {
  const alt = altitudeKm(f);
  if (f.phase === "ascent") return f.hold ? 24 : !f.released || alt < 1.5 ? 1 : alt < 12 ? 2 : alt < 30 ? 4 : 6;
  if (f.phase === "coast") return alt > 70 ? 30 : 4;
  if (f.phase === "orbit") return 6;
  return 1;
}

/** Drives a whole mission without any rendering. Returns the final flight. */
export function fly(spec: RocketSpec, hooks: Hooks = {}, frameDt = 1 / 60, maxSeconds = 4000): Flight {
  const f = createFlight(spec);
  let guard = 0;
  while (f.phase !== "ended" && f.phase !== "orbit" && f.t < maxSeconds && guard++ < 2_000_000) {
    advance(f, spec, hooks, frameDt * suggestWarp(f));
    f.events.length = 0;
  }
  return f;
}
