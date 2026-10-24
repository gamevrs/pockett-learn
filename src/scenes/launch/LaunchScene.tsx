"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import type { SceneProps } from "@/engine/scene";
import { useInput } from "@/engine/scene-kit";
import { useThreeStage } from "@/engine/three-kit";
import type { ProgramHandle } from "@/engine/program";
import {
  G0,
  ORBIT_PERIGEE_KM,
  TLI_DV,
  advance,
  altitudeKm,
  createFlight,
  downrange,
  fuelFraction,
  initialMassKg,
  liftoffTwr,
  orbitElements,
  singleStageRocket,
  speedMs,
  stagedRocket,
  suggestWarp,
  totalFuelKg,
  type Flight,
  type FlightEvent,
  type Hooks,
  type Outcome,
  type RocketSpec,
} from "./sim";
import { LaunchWorld, type LaunchView } from "./world3d";

const KEYS: Record<string, string> = { r: "reset", " ": "skip", enter: "skip" };
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const smooth = (t: number) => {
  const x = clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
};
const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

const TICK = 0.62;
const TICK_AUTO = 0.34;

type Mode = "idle" | "countdown" | "held" | "flight" | "outro" | "over";
type Tone = "ok" | "bad" | "accent" | "plain";

interface Banner {
  title: string;
  sub: string;
  tone: Tone;
  t: number;
  dur: number;
  id: number;
}

interface ResultCard {
  title: string;
  tone: Tone;
  lines: string[];
}

interface Row {
  label: string;
  value: string;
  bar?: number;
  tone?: Tone;
}

interface Hud {
  mode: Mode;
  w: number;
  h: number;
  consoleOn: boolean;
  lines: string[];
  clock: string;
  countdown: string | null;
  countKey: number;
  rows: Row[];
  banner: Banner | null;
  result: ResultCard | null;
  mission: string;
  rocket: string;
  crew: number;
  showPlate: boolean;
  warp: number;
}

interface Sim {
  gen: number;
  unlockKey: string;
  mode: Mode;
  modeT: number;
  spec: RocketSpec | null;
  flight: Flight | null;
  items: string[];
  banner: Banner | null;
  bannerSeq: number;
  result: ResultCard | null;
  celeb: number;
  fuelAnim: number;
  coolUntil: Record<string, number>;
  resetLatch: boolean;
  skipLatch: boolean;
  restartReq: boolean;
  skipReq: boolean;
  aborted: boolean;
  boomed: boolean;
  outroT: number;
  warp: number;
  hudT: number;
  size: { w: number; h: number };
}

function freshSim(): Sim {
  return {
    gen: -2,
    unlockKey: "",
    mode: "idle",
    modeT: 0,
    spec: null,
    flight: null,
    items: [],
    banner: null,
    bannerSeq: 0,
    result: null,
    celeb: -1,
    fuelAnim: 0,
    coolUntil: {},
    resetLatch: false,
    skipLatch: false,
    restartReq: false,
    skipReq: false,
    aborted: false,
    boomed: false,
    outroT: 0,
    warp: 1,
    hudT: 1,
    size: { w: 400, h: 600 },
  };
}

// ───────────────────────── learner data ─────────────────────────
function readRocket(program: ProgramHandle | null) {
  const clip = (s: string, n: number) => s.trim().slice(0, n);
  return {
    mission: program ? clip(program.str("mission_name", "MISSION"), 24) : "MISSION",
    name: program ? clip(program.str("rocket_name", "ROCKET"), 18) : "ROCKET",
    color: program ? program.str("rocket_color", "#f2f4fa") : "#f2f4fa",
    crew: program ? clamp(Math.round(program.num("crew", 0)), 0, 8) : 0,
    fuelT: program ? clamp(program.num("fuel_tons", 80), 0, 2000) : 80,
    tower: program ? program.bool("has_escape_tower", true) : true,
  };
}

function buildSpec(program: ProgramHandle, alive: (id: string) => boolean): RocketSpec {
  let spec: RocketSpec | null = null;
  if (alive("staging")) spec = stagedRocket(program.list("stages"), program.num("payload_t", 14));
  if (!spec) {
    const fuel = program.num("fuel_tons", 80);
    let dry = program.num("dry_mass_t", Number.NaN);
    if (!Number.isFinite(dry)) {
      const mass = program.num("mass_t", Number.NaN);
      dry = Number.isFinite(mass) && mass > fuel ? mass - fuel : 45;
    }
    spec = singleStageRocket(program.num("thrust_kn", 0), fuel, dry);
  }
  spec.guided = alive("guidance") && program.hasHook("guidance.pitch");
  return spec;
}

function countdownItems(program: ProgramHandle): string[] {
  const out: string[] = [];
  for (const v of program.list<unknown>("countdown").slice(0, 30)) {
    if (isNum(v)) out.push(String(Math.round(v * 100) / 100));
    else if (typeof v === "string" && v.trim()) out.push(v.trim().slice(0, 10));
  }
  return out;
}

function clockText(s: Sim, tick: number): string {
  const f = s.flight;
  if (f && (s.mode === "flight" || s.mode === "outro" || s.mode === "over")) {
    const t = Math.floor(f.t);
    return `T+${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
  }
  if (s.mode === "countdown" || s.mode === "held") {
    const left = Math.max(0, s.items.length - Math.floor(Math.max(0, s.modeT - 1.2) / tick));
    return `T-${String(Math.min(left, 99)).padStart(2, "0")}`;
  }
  return "";
}

const toneText: Record<Tone, string> = {
  ok: "text-[#34d399]",
  bad: "text-[#f87171]",
  accent: "text-violet-200",
  plain: "text-white",
};
const toneBar: Record<Tone, string> = {
  ok: "bg-[#34d399]",
  bad: "bg-[#f87171]",
  accent: "bg-[#8f74ff]",
  plain: "bg-white/70",
};

// ───────────────────────── the scene ─────────────────────────
export default function LaunchScene({ program, unlocked, focus, celebration, interactive, autoplay = false }: SceneProps) {
  const sim = useRef<Sim>(freshSim());
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const worldRef = useRef<LaunchWorld | null>(null);
  const reducedMotion = useRef(false);
  const view = useRef<LaunchView>({
    lit: false,
    painted: false,
    engines: false,
    staged: false,
    tower: 1,
    color: "#f2f4fa",
    crew: 0,
    flying: false,
    altKm: 0,
    downrange: 0,
    pitchDeg: 0,
    throttle: 0,
    firing: false,
    vacuum: 0,
    boosterAttached: true,
    hidden: false,
    outro: 0,
    pulseGhost: false,
    reduced: false,
    trail: false,
  });
  const stepRef = useRef<(dt: number, time: number) => void>(() => {});
  const [focused, setFocused] = useState(false);
  const [hud, setHud] = useState<Hud | null>(null);
  const input = useInput(canvasRef, KEYS);

  const alive = useCallback((id: string) => unlocked.has(id), [unlocked]);
  const tick = autoplay ? TICK_AUTO : TICK;

  const say = (s: Sim, title: string, sub: string, tone: Tone = "plain", dur = 2.6) => {
    s.bannerSeq++;
    s.banner = { title, sub, tone, t: 0, dur, id: s.bannerSeq };
  };

  const setMode = (s: Sim, mode: Mode) => {
    s.mode = mode;
    s.modeT = 0;
    s.hudT = 1; // refresh the HUD right away
  };

  // ── learner hooks (a failing hook backs off for a moment instead of stalling frames) ──
  const makeHooks = (s: Sim): Hooks => {
    if (!program) return {};
    const guard = (name: string, fn: () => unknown): unknown => {
      const now = performance.now();
      if ((s.coolUntil[name] ?? 0) > now) return undefined;
      const out = fn();
      if (out === undefined) s.coolUntil[name] = now + 1200;
      return out;
    };
    const round = (v: number, d = 3) => Math.round(v * 10 ** d) / 10 ** d;
    return {
      throttle:
        alive("throttle") && program.hasHook("throttle_program")
          ? (t) => {
              const out = guard("throttle", () => program.call("throttle_program", round(t, 2)));
              return isNum(out) ? out : undefined;
            }
          : undefined,
      pitch:
        alive("guidance") && program.hasHook("guidance.pitch")
          ? (a) => {
              const out = guard("pitch", () => program.call("guidance.pitch", round(a)));
              return isNum(out) ? out : undefined;
            }
          : undefined,
      abort:
        alive("safety") && program.hasHook("abort_check")
          ? (a, v, f) => {
              const out = guard("abort", () => program.call("abort_check", round(a), round(v, 1), round(f, 1)));
              return out === true || out === 1;
            }
          : undefined,
    };
  };

  // ── sequence control ──
  const beginSequence = (s: Sim) => {
    s.flight = null;
    s.spec = null;
    s.banner = null;
    s.result = null;
    s.fuelAnim = 0;
    s.aborted = false;
    s.boomed = false;
    s.outroT = 0;
    s.warp = 1;
    s.restartReq = false;
    s.skipReq = false;
    worldRef.current?.event("reset");
    if (!program) {
      setMode(s, "idle");
      return;
    }
    s.items = alive("countdown") ? countdownItems(program) : [];
    if (alive("engines")) s.spec = buildSpec(program, alive);
    setMode(s, "countdown");
  };

  const startFlight = (s: Sim) => {
    if (!program) return;
    if (!s.spec) s.spec = buildSpec(program, alive);
    s.flight = createFlight(s.spec);
    setMode(s, "flight");
    say(s, "IGNITION", "Engines coming up to power", "accent", 1.6);
  };

  const explain = (o: Outcome, spec: RocketSpec): ResultCard => {
    const km = (v: number) => (Number.isFinite(v) ? `${Math.round(v)} km` : "escape");
    const guided = !!spec.guided;
    switch (o.kind) {
      case "moon":
        return {
          title: "Mission success",
          tone: "ok",
          lines: [`Orbit ${Math.round(o.perigeeKm)} x ${Math.round(o.apogeeKm)} km`, `${Math.round(o.dvLeft)} m/s of fuel left: enough for the Moon (needs ${TLI_DV}).`, "Tweak your numbers and try for a leaner flight."],
        };
      case "orbit":
        return {
          title: "In orbit",
          tone: "ok",
          lines: [`Orbit ${Math.round(o.perigeeKm)} x ${Math.round(o.apogeeKm)} km`, `Only ${Math.round(o.dvLeft)} m/s left; the Moon needs ${TLI_DV}.`, "Save fuel: pitch over a little earlier, or add fuel_tons / burn_seconds."],
        };
      case "suborbital":
        return {
          title: "Suborbital",
          tone: "accent",
          lines: guided
            ? [`Apogee ${km(o.apogeeKm)}, perigee ${km(o.perigeeKm)}`, `Orbit needs a perigee above ${ORBIT_PERIGEE_KM} km: more sideways speed.`, "Try a smaller turn_start_km, a bigger degrees_per_km, or more fuel."]
            : [`Highest point: ${km(o.apogeeKm)}. You reached space!`, "Straight up never makes an orbit: you need sideways speed.", alive("guidance") ? "Check your Guidance class." : "Next up: guidance, which tilts the rocket over."],
        };
      case "escape":
        return { title: "Escaped", tone: "accent", lines: ["Straight up so fast that you left the planet behind!", "Orbits need sideways speed. Guidance will teach the rocket to tilt."] };
      case "crash":
        return { title: "Crash", tone: "bad", lines: ["The rocket fell back to the ground.", guided ? "Tilting too sharply wastes lift. Try a later turn_start_km or a smaller degrees_per_km." : "It ran out of push. Check thrust_kn and your throttle program."] };
      case "abort":
        return { title: "Abort", tone: "bad", lines: ["Your abort_check said True.", "The escape tower pulled the crew clear. Relaunching shortly..."] };
      case "nolift": {
        const weight = (initialMassKg(spec) * G0) / 1000;
        return {
          title: "No liftoff",
          tone: "bad",
          lines: [`Thrust ${Math.round(spec.stages[0].thrustKn)} kN vs weight ${Math.round(weight)} kN (TWR ${liftoffTwr(spec).toFixed(2)}).`, "Thrust must beat weight. Raise thrust_kn or cut fuel_tons / dry_mass_t."],
        };
      }
    }
  };

  const onFlightEvent = (s: Sim, e: FlightEvent) => {
    const world = worldRef.current;
    switch (e.kind) {
      case "liftoff":
        world?.event("liftoff");
        say(s, "Liftoff", "We have liftoff!", "plain", 2.2);
        break;
      case "maxq":
        say(s, "Max-Q", "Peak aerodynamic pressure", "accent", 1.8);
        break;
      case "stage_sep":
        if (!e.last) {
          say(s, "Stage separation", `${e.name} away`, "accent", 2.2);
          if (s.flight?.jettisoned === 1) world?.event("stage_sep");
        }
        break;
      case "stage_ignite":
        say(s, "Stage ignition", e.name, "accent", 1.8);
        break;
      case "meco":
        say(s, "Engine cutoff", "Coasting up to apogee", "accent", 2.4);
        break;
      case "relight":
        say(s, "Circularization burn", "Building orbital speed", "accent", 2.4);
        break;
      case "abort":
        s.aborted = true;
        s.boomed = true;
        world?.event("abort");
        say(s, "Abort", "Escape tower firing", "bad", 3);
        break;
      case "crash":
        s.boomed = true;
        world?.event("crash");
        say(s, "Anomaly", "Vehicle lost", "bad", 2.4);
        break;
      case "nolift":
        say(s, "No liftoff", "Thrust cannot beat weight", "bad", 3);
        break;
      case "burnout":
        say(s, "Burnout", "Out of fuel", "accent", 2.2);
        break;
      case "orbit":
        break;
    }
  };

  // ───────── simulation step ─────────
  const update = (dt: number) => {
    const s = sim.current;
    s.modeT += dt;
    if (s.banner) {
      s.banner.t += dt;
      if (s.banner.t > s.banner.dur) s.banner = null;
    }

    // fresh program (Run pressed) or new unlock: restart the whole sequence
    const key = Array.from(unlocked).sort().join(",");
    const gen = program ? program.generation : -1;
    if (s.gen !== gen || s.unlockKey !== key) {
      s.gen = gen;
      s.unlockKey = key;
      beginSequence(s);
    }

    if (celebration && s.celeb !== celebration.nonce) {
      s.celeb = celebration.nonce;
      worldRef.current?.event("celebrate");
    }

    // keys: R relaunches, Space / Enter skips the countdown
    if (input.isDown("reset") && !s.resetLatch) {
      s.resetLatch = true;
      s.restartReq = true;
    }
    if (!input.isDown("reset")) s.resetLatch = false;
    if (input.isDown("skip") && !s.skipLatch) {
      s.skipLatch = true;
      s.skipReq = true;
    }
    if (!input.isDown("skip")) s.skipLatch = false;

    if (s.restartReq) {
      beginSequence(s);
      return;
    }

    if (s.mode === "countdown") {
      const lead = s.items.length || !alive("countdown") ? 0.7 : 1.2;
      const total = lead + s.items.length * tick + 0.7;
      if (s.skipReq) s.modeT = Math.max(s.modeT, total);
      s.skipReq = false;
      if (alive("rocket")) s.fuelAnim = Math.min(1, s.fuelAnim + dt / 1.4);
      if (s.modeT >= total) {
        if (alive("engines") && program) startFlight(s);
        else {
          setMode(s, "held");
          say(s, "Hold", "Engines are offline: finish the Engines lesson", "accent", 4);
        }
      }
    } else if (s.mode === "held") {
      s.skipReq = false;
      if (alive("rocket")) s.fuelAnim = Math.min(1, s.fuelAnim + dt / 1.4);
      if (autoplay && s.modeT > 5) beginSequence(s);
    }

    const f = s.flight;
    const spec = s.spec;
    if (s.mode === "flight" && f && spec && program) {
      const warp = reducedMotion.current ? Math.max(1, suggestWarp(f) * 0.6) : suggestWarp(f);
      s.warp = warp;
      advance(f, spec, makeHooks(s), dt * warp);
      for (const e of f.events.splice(0)) onFlightEvent(s, e);
      if (f.phase === "orbit") {
        setMode(s, "outro");
        s.outroT = 0;
        const o = f.outcome;
        if (o) say(s, "Orbit achieved", `${Math.round(o.perigeeKm)} x ${Math.round(o.apogeeKm)} km`, "ok", 3);
      } else if (f.phase === "ended" && f.outcome) {
        s.result = explain(f.outcome, spec);
        setMode(s, "over");
      }
    } else if (s.mode === "outro" && f && spec) {
      s.outroT += dt;
      s.warp = 1;
      advance(f, spec, {}, dt * 2);
      f.events.length = 0;
      const moon = f.outcome?.kind === "moon";
      if (moon && s.outroT > 2.6 && s.banner?.title !== "Trans-lunar injection" && s.outroT < 3.2) {
        say(s, "Trans-lunar injection", "Next stop: the Moon", "accent", 3.4);
      }
      if (s.outroT > (moon ? 9 : 4.5) && f.outcome) {
        s.result = explain(f.outcome, spec);
        setMode(s, "over");
        if (moon) worldRef.current?.event("celebrate");
      }
    } else if (s.mode === "over") {
      s.warp = 1;
      const isAbort = f?.outcome?.kind === "abort";
      if (autoplay && s.modeT > (isAbort ? 5 : 6)) beginSequence(s);
      else if (isAbort && !autoplay && s.modeT > 5.5) beginSequence(s);
    }
  };

  // ───────── view + HUD ─────────
  const fillView = (s: Sim, data: ReturnType<typeof readRocket>) => {
    const v = view.current;
    const f = s.flight;
    const spec = s.spec;
    const painted = alive("rocket");
    v.lit = alive("console");
    v.painted = painted;
    v.engines = alive("engines");
    v.staged = alive("staging") && !!spec?.staged;
    v.tower = !painted ? 1 : !data.tower ? 0 : alive("safety") ? 2 : 1;
    v.color = data.color;
    v.crew = data.crew;
    v.flying = !!f;
    const alt = f ? altitudeKm(f) : 0;
    v.altKm = alt;
    v.downrange = f ? downrange(f) : 0;
    v.pitchDeg = f ? f.pitch : 0;
    const moon = f?.outcome?.kind === "moon";
    const tli = moon && s.mode === "outro" && s.outroT > 2.6 && s.outroT < 4.2;
    v.firing = (!!f && s.mode === "flight" && f.phase === "ascent" && f.throttle > 0.02) || tli;
    v.throttle = tli ? 1 : f ? f.throttle : 0;
    v.vacuum = clamp((alt - 8) / 55, 0, 1);
    v.boosterAttached = !v.staged || !f || f.jettisoned === 0;
    v.hidden = s.boomed;
    v.outro = !moon ? 0 : s.mode === "outro" ? smooth((s.outroT - 2.6) / 5.2) : s.mode === "over" ? 1 : 0;
    v.pulseGhost = interactive && !!focus && ["rocket", "engines", "safety", "staging"].includes(focus) && !alive(focus);
    v.reduced = reducedMotion.current;
    v.trail = alive("engines") && !!f;
  };

  const buildHud = (s: Sim, data: ReturnType<typeof readRocket>): Hud => {
    const f = s.flight;
    const spec = s.spec;
    const compact = s.size.h < 420;
    const portrait = s.size.h > s.size.w * 1.15;
    const maxLines = portrait ? 6 : compact ? 3 : 4;
    const lines = alive("console") && program ? program.stdout.split("\n").filter((l) => l.length > 0).slice(-maxLines) : [];

    let countdown: string | null = null;
    let countKey = -1;
    if (alive("countdown") && s.mode === "countdown" && program) {
      const lead = s.items.length ? 1.2 : 0.7;
      const idx = Math.floor((s.modeT - lead) / tick);
      if (s.modeT < lead) countdown = s.items.length ? "T-minus" : "Standby";
      else if (idx >= s.items.length) countdown = "Liftoff!";
      else countdown = s.items[idx];
      countKey = s.modeT < lead ? -2 : idx;
    }

    const rows: Row[] = [];
    const flying = !!f && (s.mode === "flight" || s.mode === "outro" || s.mode === "over");
    if (alive("engines") && program && spec) {
      if (flying && f) {
        const alt = altitudeKm(f);
        rows.push({ label: "ALT", value: `${alt < 10 ? alt.toFixed(2) : alt.toFixed(1)} km` });
        rows.push({ label: "SPEED", value: `${Math.round(speedMs(f))} m/s` });
        if (!compact) rows.push({ label: "Q", value: `${(f.qNow / 1000).toFixed(1)} kPa` });
      }
      const twr = liftoffTwr(spec);
      rows.push({ label: "TWR", value: twr.toFixed(2), tone: twr > 1 ? "ok" : "bad" });
    }
    if (alive("rocket") && program) {
      if (f && spec) {
        const frac = fuelFraction(f, spec);
        rows.push({ label: "FUEL", value: `${(frac * (totalFuelKg(spec) / 1000)).toFixed(1)} t`, bar: frac, tone: frac > 0.12 ? "accent" : "bad" });
      } else {
        rows.push({ label: "FUEL", value: `${data.fuelT.toFixed(1)} t`, bar: s.fuelAnim, tone: "accent" });
      }
    }
    if (alive("throttle") && f) rows.push({ label: "THROTTLE", value: `${Math.round(f.throttle * 100)}%`, bar: f.throttle, tone: "accent" });
    if (alive("staging") && spec?.staged && f) {
      const idx = Math.min(f.stage + 1, spec.stages.length);
      rows.push({ label: `STAGE ${idx}/${spec.stages.length}`, value: spec.stages[Math.min(f.stage, spec.stages.length - 1)].name.slice(0, 12) });
    }
    if (alive("guidance") && f && flying) {
      rows.push({ label: "PITCH", value: `${Math.round(f.pitch)}°`, bar: f.pitch / 90, tone: "accent" });
      const el = orbitElements(f);
      if (el && (el.perigeeKm > 0 || altitudeKm(f) > 40)) {
        rows.push({ label: "APOGEE", value: `${Math.round(el.apogeeKm)} km` });
        rows.push({ label: "PERIGEE", value: `${Math.round(el.perigeeKm)} km`, tone: el.perigeeKm >= ORBIT_PERIGEE_KM ? "ok" : "plain" });
      }
    }

    return {
      mode: s.mode,
      w: s.size.w,
      h: s.size.h,
      consoleOn: alive("console") && !!program,
      lines,
      clock: alive("countdown") ? clockText(s, tick) : "",
      countdown,
      countKey,
      rows,
      banner: s.banner ? { ...s.banner } : null,
      result: s.mode === "over" ? s.result : null,
      mission: data.mission,
      rocket: data.name,
      crew: data.crew,
      showPlate: alive("rocket") && !!program,
      warp: s.mode === "flight" ? s.warp : 1,
    };
  };

  // The render loop always calls the latest closure (fresh props every render).
  useEffect(() => {
    stepRef.current = (dt: number, time: number) => {
      const s = sim.current;
      update(dt);
      const data = readRocket(program);
      fillView(s, data);
      worldRef.current?.frame(view.current, dt, time);
      s.hudT += dt;
      if (s.hudT >= 0.1) {
        s.hudT = 0;
        setHud(buildHud(s, data));
      }
    };
  });

  useThreeStage(canvasRef, (ctx) => {
    const world = new LaunchWorld(ctx);
    worldRef.current = world;
    return {
      frame: (dt, time) => stepRef.current(dt, time),
      resize: (w, h) => {
        sim.current.size = { w, h };
        world.resize(w, h);
      },
      dispose: () => {
        world.dispose();
        worldRef.current = null;
        sim.current = freshSim();
      },
    };
  });

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => {
      reducedMotion.current = mq.matches;
    };
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const on = () => setFocused(true);
    const off = () => setFocused(false);
    el.addEventListener("focus", on);
    el.addEventListener("blur", off);
    return () => {
      el.removeEventListener("focus", on);
      el.removeEventListener("blur", off);
    };
  }, [canvasRef]);

  const uiMode = hud?.mode ?? "idle";
  const canLaunch = interactive && !!program;
  const compact = (hud?.h ?? 600) < 420;
  const portrait = (hud?.h ?? 600) > (hud?.w ?? 400) * 1.15;
  const ringConsole = interactive && (focus === "console" || focus === "countdown") && !alive(focus) ? "ring-2 ring-[#8f74ff]/70" : "";
  const ringTele = interactive && (focus === "throttle" || focus === "guidance") && !alive(focus) ? "ring-2 ring-[#8f74ff]/70" : "";
  const glass = "rounded-xl border border-white/10 bg-black/45 backdrop-blur";

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#07070c]">
      <canvas
        ref={canvasRef}
        tabIndex={interactive ? 0 : -1}
        aria-label="Launch Control live scene. Press R to relaunch, Space to skip the countdown."
        className="absolute inset-0 h-full w-full outline-none"
      />

      {hud && (
        <div className="pointer-events-none absolute inset-0 font-mono text-[11px] leading-snug text-white">
          {/* console */}
          <div className={`absolute left-3 top-11 ${glass} px-3 py-2 ${ringConsole}`} style={{ width: portrait ? "min(62%, 260px)" : "min(42%, 290px)" }}>
            {hud.consoleOn ? (
              <>
                <div className="mb-1 flex items-center justify-between text-[10px] uppercase tracking-[0.14em] text-violet-200/70">
                  <span>Launch console</span>
                  {hud.clock && <span className="font-bold text-violet-200">{hud.clock}</span>}
                </div>
                {hud.lines.length ? (
                  hud.lines.map((l, i) => (
                    <div key={`${i}-${l}`} className="truncate text-violet-100">
                      <span className="text-[#8f74ff]">› </span>
                      {l}
                    </div>
                  ))
                ) : (
                  <div className="text-white/45">› (nothing printed yet)</div>
                )}
              </>
            ) : (
              <>
                <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-violet-200">{program ? "Console offline" : "Blueprint"}</div>
                <div className="text-white/50">{program ? "print() something to power it on" : "press Run to power up"}</div>
              </>
            )}
          </div>

          {/* telemetry */}
          {hud.rows.length > 0 && (
            <div className={`absolute right-3 top-11 ${glass} px-3 py-2 ${ringTele}`} style={{ width: compact ? 132 : 150 }}>
              {hud.rows.map((r) => (
                <div key={r.label} className="py-[1px]">
                  <div className="flex min-w-0 items-baseline justify-between gap-2">
                    <span className="shrink-0 whitespace-nowrap text-[9.5px] uppercase tracking-wider text-white/50">{r.label}</span>
                    <span className={`truncate font-bold tabular-nums ${toneText[r.tone ?? "plain"]}`}>{r.value}</span>
                  </div>
                  {r.bar !== undefined && (
                    <div className="mt-0.5 h-[3px] w-full overflow-hidden rounded-full bg-white/10">
                      <div className={`h-full rounded-full ${toneBar[r.tone ?? "accent"]}`} style={{ width: `${clamp(r.bar, 0, 1) * 100}%` }} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* countdown */}
          {hud.countdown && (
            <div className="absolute inset-x-0 flex justify-center" style={{ top: portrait ? "30%" : "26%" }}>
              <div key={hud.countKey} className={`pop-in font-sans font-black tracking-tight text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.6)] ${hud.countdown.length > 3 ? (compact ? "text-3xl" : "text-4xl") : compact ? "text-5xl" : "text-7xl"}`}>
                {hud.countdown}
              </div>
            </div>
          )}

          {/* banner */}
          {hud.banner && !hud.result && (
            <div className="absolute inset-x-0 flex justify-center px-4" style={portrait && !compact ? { top: "40%" } : { bottom: "3.25rem" }}>
              {portrait && !compact ? (
                <div key={hud.banner.id} className={`pop-in ${glass} px-4 py-2 text-center`}>
                  <div className={`font-sans text-sm font-extrabold uppercase tracking-[0.18em] ${toneText[hud.banner.tone]}`}>{hud.banner.title}</div>
                  <div className="text-[10.5px] text-white/70">{hud.banner.sub}</div>
                </div>
              ) : (
                <div key={hud.banner.id} className={`pop-in rounded-full border border-white/10 bg-black/45 px-3 py-1 backdrop-blur`}>
                  <span className={`font-sans text-[11px] font-extrabold uppercase tracking-[0.16em] ${toneText[hud.banner.tone]}`}>{hud.banner.title}</span>
                  <span className="ml-2 text-[10.5px] text-white/65">{hud.banner.sub}</span>
                </div>
              )}
            </div>
          )}

          {/* outcome card */}
          {hud.result && (
            <div className="absolute inset-x-0 flex justify-center px-3" style={{ top: compact ? "22%" : "24%" }}>
              <div className={`pop-in w-full max-w-[340px] ${glass} bg-black/60 px-4 py-3`}>
                <div className={`font-sans text-lg font-black uppercase tracking-[0.12em] ${toneText[hud.result.tone]}`}>{hud.result.title}</div>
                {hud.result.lines.map((l) => (
                  <div key={l} className="mt-1 text-[11px] text-white/85">
                    {l}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* mission plate */}
          {hud.showPlate && (
            <div className={`absolute bottom-3 left-3 ${glass} px-3 py-1.5`}>
              <div className="font-bold text-white/90">
                {hud.mission} <span className="text-violet-200/70">· {hud.rocket}</span>
              </div>
              {hud.crew > 0 && (
                <div className="mt-0.5 flex items-center gap-1 text-[10px] text-white/55">
                  {Array.from({ length: hud.crew }, (_, i) => (
                    <span key={i} className="inline-block h-2 w-2 rounded-full bg-[#8f74ff]" />
                  ))}
                  <span className="ml-1">CREW {hud.crew}</span>
                </div>
              )}
            </div>
          )}

          {/* time warp */}
          {hud.warp > 1.05 && (
            <div className="absolute inset-x-0 bottom-3 flex justify-center">
              <span className="rounded-full border border-white/10 bg-black/45 px-2 py-0.5 text-[10px] font-bold text-violet-200 backdrop-blur">TIME ×{Math.round(hud.warp)}</span>
            </div>
          )}
        </div>
      )}

      {canLaunch && (
        <>
          {!focused && (uiMode === "over" || uiMode === "held") && (
            <div className="pointer-events-none absolute inset-x-0 bottom-14 flex justify-center [@media(pointer:coarse)]:hidden">
              <span className="rounded-full border border-white/10 bg-black/45 px-3 py-1.5 text-[11px] font-semibold text-white/80 backdrop-blur">Click the stage, then press R to relaunch</span>
            </div>
          )}
          <button
            type="button"
            onClick={() => {
              const s = sim.current;
              if (s.mode === "countdown") s.skipReq = true;
              else s.restartReq = true;
            }}
            className="absolute bottom-3 right-3 z-10 rounded-full border border-[#8f74ff]/60 bg-black/55 px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-wider text-white backdrop-blur transition-colors hover:bg-[#8f74ff]/25"
          >
            {uiMode === "countdown" ? "Skip countdown" : uiMode === "idle" ? "Launch" : "Launch again"} <span className="text-violet-200/70">({uiMode === "countdown" ? "Space" : "R"})</span>
          </button>
        </>
      )}
    </div>
  );
}
