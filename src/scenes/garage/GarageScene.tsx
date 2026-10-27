"use client";

import React, { useEffect, useRef, useState } from "react";
import { Bot, Video } from "lucide-react";
import type { SceneProps } from "@/engine/scene";
import { TouchButtons, useInput } from "@/engine/scene-kit";
import { useStageSurface } from "@/engine/stage-surface";
import { useTouchPrimary } from "@/lib/ui/input-mode";
import { useThreeStage } from "@/engine/three-kit";
import { ACCENT, NEUTRAL } from "@/engine/stage-style";
import { GarageController, TRACK } from "./controller";
import { createGarageWorld, type CameraMode } from "./world3d";

const KEYS: Record<string, string> = {
  w: "gas",
  arrowup: "gas",
  s: "brake",
  arrowdown: "brake",
  a: "left",
  arrowleft: "left",
  d: "right",
  arrowright: "right",
  p: "autopilot",
  r: "reset",
  c: "camera",
};

interface Hud {
  kmh: number;
  topSpeed: number;
  pedal: number;
  power: number;
  lap: number;
  lapTime: number;
  bestLap: number | null;
  split: string;
  splitVisible: boolean;
  autopilot: boolean;
  width: number;
  height: number;
}

const EMPTY_HUD: Hud = { kmh: 0, topSpeed: 120, pedal: 0, power: 0, lap: 0, lapTime: 0, bestLap: null, split: "", splitVisible: false, autopilot: false, width: 600, height: 400 };

/** What the dim "no power" panel says. Only the lesson workspace has a Run button to point at. */
function blueprintHint(surface: "workspace" | "hub" | "landing", hasProgram: boolean): string {
  if (surface === "workspace") return hasProgram ? "print() something to boot the car" : "Press Run to boot the car";
  if (surface === "hub") return hasProgram ? "Open a lesson and print() to boot the car" : "Pass lesson 1 to power it up";
  return "Pass lessons to power it up";
}

export default function GarageScene({ program, unlocked, celebration, interactive, autoplay = false }: SceneProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const labelRef = useRef<HTMLDivElement | null>(null);
  const input = useInput(canvasRef, KEYS);
  const surface = useStageSurface();
  const touch = useTouchPrimary();
  // UI -> game loop requests (the controller itself lives inside the 3D app)
  const requests = useRef({ toggleAutopilot: false });
  const [hud, setHud] = useState<Hud>(EMPTY_HUD);
  // Third-person chase cam is the default view; the camera button switches to the overview.
  const [camera, setCamera] = useState<CameraMode>("chase");
  const [focused, setFocused] = useState(false);
  // Demos (autoplay) drive themselves until the visitor touches anything; from then on the
  // virtual driver is off for good and only the visitor (or their autopilot) drives.
  const [tookControl, setTookControl] = useState(false);

  // Latest props for the render loop (which lives outside React's render cycle).
  const live = useRef({ program, unlocked, celebration, autoplay, camera, tookControl });
  useEffect(() => {
    live.current = { program, unlocked, celebration, autoplay, camera, tookControl };
  });

  useThreeStage(canvasRef, (ctx) => {
    const world = createGarageWorld(ctx, TRACK);
    const controller = new GarageController(live.current.autoplay);
    let hudClock = 0;
    let celebrated = -1;
    const latch = { autopilot: false, reset: false, camera: false };

    return {
      frame(dt, time) {
        const { program: prog, unlocked: open, celebration: cel, camera: cam } = live.current;
        const auto = live.current.autoplay && !live.current.tookControl;
        const alive = (id: string) => open.has(id);

        // one-shot keys
        const edge = (k: keyof typeof latch) => {
          const down = input.isDown(k);
          const fired = down && !latch[k];
          latch[k] = down;
          return fired;
        };
        if (edge("autopilot") || requests.current.toggleAutopilot) controller.autopilot = !controller.autopilot;
        requests.current.toggleAutopilot = false;
        if (edge("reset")) controller.reset();
        if (edge("camera")) setCamera((c) => (c === "chase" ? "overview" : "chase"));

        controller.tick(
          dt,
          prog,
          alive,
          { gas: input.isDown("gas"), brake: input.isDown("brake"), left: input.isDown("left"), right: input.isDown("right") },
          auto,
        );
        if (cel && cel.nonce !== celebrated) {
          celebrated = cel.nonce;
          world.celebrate();
        }

        const car = controller.car;
        world.update(
          {
            car,
            lit: alive("ignition") && !!prog,
            painted: alive("paint") && !!prog,
            paint: prog?.str("paint", ACCENT[400]) ?? ACCENT[400],
            turbo: prog?.bool("has_turbo", false) ?? false,
            roadAlive: alive("steering"),
            gates: alive("checkpoints") && prog ? prog.list<number>("checkpoints") : [],
            gateFlash: controller.gateFlash,
            sensors: controller.autopilotActive ? controller.sensors : null,
            power: controller.power,
            events: controller.events,
            camera: cam,
          },
          dt,
          time,
        );

        // name tag follows the car (direct DOM write; no React render per frame)
        const tag = labelRef.current;
        if (tag) {
          const pos = world.labelPosition();
          tag.style.transform = `translate(${pos.x}px, ${pos.y}px) translate(-50%, -100%)`;
          tag.style.opacity = pos.visible ? "1" : "0";
        }

        hudClock += dt;
        if (hudClock > 0.1) {
          hudClock = 0;
          setHud({
            kmh: car.kmh,
            topSpeed: Math.max(40, prog?.num("top_speed", 120) ?? 120),
            pedal: car.pedal,
            power: controller.power,
            lap: car.lap,
            lapTime: car.lapTime,
            bestLap: car.bestLap,
            split: controller.split,
            splitVisible: controller.splitTimer > 0,
            autopilot: controller.autopilotActive,
            width: ctx.size.width,
            height: ctx.size.height,
          });
        }
      },
      resize: (w, h) => world.resize(w, h),
      dispose: () => world.dispose(),
    };
  });

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const on = () => setFocused(true);
    const off = () => setFocused(false);
    const take = () => setTookControl(true);
    el.addEventListener("focus", on);
    el.addEventListener("blur", off);
    el.addEventListener("pointerdown", take);
    el.addEventListener("keydown", take);
    return () => {
      el.removeEventListener("focus", on);
      el.removeEventListener("blur", off);
      el.removeEventListener("pointerdown", take);
      el.removeEventListener("keydown", take);
    };
  }, []);

  const alive = (id: string) => unlocked.has(id);
  const lit = alive("ignition") && !!program;
  const canDrive = alive("engine") && !!program;
  // Small stages drop secondary readouts so panels never overlap.
  const compact = hud.width < 440 || hud.height < 340;
  const tiny = hud.height < 260;
  const name = alive("paint") && program ? program.str("car_name", "") : "";
  const lines = program ? program.stdout.split("\n").filter(Boolean).slice(tiny ? -1 : compact ? -3 : -5) : [];
  const hasAutopilot = alive("autopilot") && !!program?.hasHook("autopilot.steer");
  const toggleAutopilot = () => {
    setTookControl(true);
    requests.current.toggleAutopilot = true;
    canvasRef.current?.focus({ preventScroll: true });
  };
  const toggleCamera = () => {
    setTookControl(true);
    setCamera((c) => (c === "chase" ? "overview" : "chase"));
    canvasRef.current?.focus({ preventScroll: true });
  };
  const showLapBoard = canDrive && (alive("checkpoints") || alive("tires") || hud.lap > 0);

  return (
    <div className="relative h-full w-full overflow-hidden">
      <canvas
        ref={canvasRef}
        tabIndex={interactive ? 0 : -1}
        aria-label={touch ? "Turbo Garage live scene. Drive with the on-screen buttons." : "Turbo Garage live scene. Click, then drive with W A S D."}
        className="absolute inset-0 h-full w-full outline-none"
      />

      {/* name tag */}
      <div ref={labelRef} className="pointer-events-none absolute left-0 top-0 transition-opacity" style={{ opacity: 0 }}>
        {name && <span className="hud-tag font-mono uppercase">{name}</span>}
      </div>

      {/* HUD: rows (top info, bottom gauges + buttons, touch pads) so panels can never overlap */}
      <div className="pointer-events-none absolute inset-0 flex flex-col gap-2 p-3 pt-12">
        <div className="flex items-start justify-between gap-2">
          <div className={`hud-panel min-w-0 ${lit ? "hud-log" : ""} ${compact ? "max-w-[50%]" : "max-w-[min(60%,280px)]"}`}>
            {lit ? (
              lines.length ? (
                lines.map((l, i) => (
                  <p key={i} className="hud-log-line truncate">
                    {l}
                  </p>
                ))
              ) : (
                <p className="hud-muted">nothing printed yet</p>
              )
            ) : (
              <>
                <p className="hud-label">{program ? "No power" : "Blueprint"}</p>
                {!tiny && <p className="hud-muted">{blueprintHint(surface, !!program)}</p>}
              </>
            )}
          </div>

          {showLapBoard && (
            <div className="hud-panel shrink-0 text-right">
              <p className="hud-title">
                Lap <span className="hud-value">{hud.lap + 1}</span> <span className="hud-value hud-accent ml-1">{hud.lapTime.toFixed(1)}s</span>
              </p>
              {hud.bestLap !== null && (
                <p>
                  <span className="hud-label">Best</span> <span className="hud-value">{hud.bestLap.toFixed(2)}s</span>
                </p>
              )}
              {alive("tires") && program?.has("tire") && !tiny && (
                <p>
                  <span className="hud-label">Tyres</span>{" "}
                  <span className="hud-value">
                    {program.str("tire", "?")} · grip {program.num("grip", 1).toFixed(2)}
                  </span>
                </p>
              )}
              {alive("tires") && program?.has("best_lap") && !compact && (
                <p>
                  <span className="hud-label">Pit</span>{" "}
                  <span className="hud-value hud-muted">
                    best {program.num("best_lap", 0).toFixed(1)}s · avg {program.num("average_lap", 0).toFixed(1)}s
                  </span>
                </p>
              )}
            </div>
          )}
        </div>

        <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden">
          {hud.splitVisible ? (
            <span className="pop-in hud-tag h-6 px-3">
              <span className="hud-value hud-accent">{hud.split}</span>
            </span>
          ) : interactive && canDrive && !focused && !hud.autopilot && !compact ? (
            <span className="hud-tag h-7 px-3">{touch ? "Drive with the buttons below" : "Click the stage, then drive with W A S D · C switches camera"}</span>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-end justify-between gap-2">
            {canDrive ? <Speedo kmh={hud.kmh} top={hud.topSpeed} pedal={alive("throttle") ? hud.pedal : null} power={alive("throttle") ? hud.power : null} compact={compact} /> : <span />}

            <div className="pointer-events-auto flex flex-wrap items-center justify-end gap-2">
              {lit && interactive && (
                <button
                  onClick={toggleCamera}
                  className="hud-btn"
                  aria-label={camera === "chase" ? "Switch to overview camera" : "Switch to chase camera"}
                  title="Switch camera (C)"
                >
                  <Video className="h-3.5 w-3.5" />
                  {!compact && (camera === "chase" ? "Chase cam" : "Overview")}
                </button>
              )}
              {hasAutopilot && interactive && (
                <button
                  onClick={toggleAutopilot}
                  aria-pressed={hud.autopilot}
                  title={touch ? "Toggle autopilot" : "Toggle autopilot (P)"}
                  aria-label={`Autopilot ${hud.autopilot ? "on" : "off"}. Toggle autopilot`}
                  className={`hud-btn ${hud.autopilot ? "hud-btn-on" : ""}`}
                >
                  <Bot className="h-3.5 w-3.5" />
                  {compact ? `Auto ${hud.autopilot ? "on" : "off"}` : `Autopilot ${hud.autopilot ? "on" : "off"}`}
                </button>
              )}
            </div>
          </div>

          {/* touch screens get their own row of pads, below the gauges */}
          {interactive && canDrive && touch && (!autoplay || tookControl) && (
            <div className="pointer-events-auto flex items-center justify-between">
              <TouchButtons
                input={input}
                onTouch={() => setTookControl(true)}
                buttons={[
                  { action: "left", label: "◀" },
                  { action: "right", label: "▶" },
                ]}
              />
              <TouchButtons
                input={input}
                onTouch={() => setTookControl(true)}
                buttons={[
                  { action: "brake", label: "■" },
                  { action: "gas", label: "▲" },
                ]}
              />
            </div>
          )}
        </div>
      </div>

    </div>
  );
}

function Speedo({ kmh, top, pedal, power, compact }: { kmh: number; top: number; pedal: number | null; power: number | null; compact: boolean }) {
  const size = compact ? 74 : 92;
  const r = size / 2 - 7;
  const circ = 2 * Math.PI * r;
  const sweep = 0.75; // 270° gauge
  const frac = Math.min(1, Math.max(0, kmh / top));
  return (
    <div className="pointer-events-none flex items-end gap-2.5">
      <div className="hud-panel relative rounded-full p-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="absolute inset-0 rotate-[135deg]">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={NEUTRAL[700]} strokeWidth={4} strokeLinecap="round" strokeDasharray={`${circ * sweep} ${circ}`} />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={ACCENT[400]}
            strokeWidth={4}
            strokeLinecap="round"
            strokeDasharray={`${circ * sweep * frac} ${circ}`}
            style={{ transition: "stroke-dasharray 0.1s linear" }}
          />
        </svg>
        <div className="absolute inset-0 grid place-items-center text-center">
          <div>
            <p className={`hud-value leading-none ${compact ? "text-lg" : "text-xl"}`}>{Math.round(kmh)}</p>
            <p className="hud-label mt-0.5">km/h</p>
          </div>
        </div>
      </div>
      {pedal !== null && power !== null && !compact && (
        <div className="hud-panel mb-1 w-24 space-y-1.5">
          <Bar label="Pedal" value={pedal} fill={NEUTRAL[200]} />
          <Bar label="Power" value={power} />
        </div>
      )}
    </div>
  );
}

function Bar({ label, value, fill }: { label: string; value: number; fill?: string }) {
  return (
    <div>
      <p className="hud-label">{label}</p>
      <div className="hud-bar mt-1">
        <span style={{ width: `${Math.round(Math.min(1, Math.max(0, value)) * 100)}%`, background: fill }} />
      </div>
    </div>
  );
}
