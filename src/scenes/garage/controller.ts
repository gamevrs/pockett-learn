import type { ProgramHandle } from "@/engine/program";
import { MAX_STEER, buildTrack, crossedGates, cruise, readSensors, spawn, step, type CarSpec, type CarState, type Sensors, type SimEvent } from "./sim";

/**
 * Turbo Garage game logic: turns keys + the learner's Python into car physics.
 * No rendering here; world3d.ts draws whatever state this holds.
 */

export const TRACK = buildTrack();

export interface DriveInput {
  gas: boolean;
  brake: boolean;
  left: boolean;
  right: boolean;
}

const finite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export class GarageController {
  car: CarState = spawn(TRACK);
  sensors: Sensors = { left: 1, front: 1, right: 1 };
  /** Engine power actually applied (after the learner's throttle curve). */
  power = 0;
  /** Wants the autopilot engaged (UI toggle). It only drives when unlocked and defined. */
  autopilot: boolean;
  autopilotActive = false;
  gateFlash: Record<number, number> = {};
  split = "";
  splitTimer = 0;
  /** Events from the last tick, for particles/sounds. */
  events: SimEvent[] = [];
  private acc = 0;
  private generation = -1;

  constructor(autopilot: boolean) {
    this.autopilot = autopilot;
  }

  reset() {
    this.car = spawn(TRACK);
    this.gateFlash = {};
    this.split = "";
    this.splitTimer = 0;
    this.acc = 0;
    this.power = 0;
  }

  tick(dt: number, program: ProgramHandle | null, alive: (id: string) => boolean, input: DriveInput, autoplay: boolean) {
    this.events = [];
    if (program && program.generation !== this.generation) {
      this.generation = program.generation;
      this.reset();
    }
    this.splitTimer = Math.max(0, this.splitTimer - dt);
    for (const k of Object.keys(this.gateFlash)) this.gateFlash[+k] = Math.max(0, this.gateFlash[+k] - dt * 1.5);

    const car = this.car;
    if (!program || !alive("engine")) {
      car.kmh = 0;
      car.pedal = 0;
      car.wheel *= 0.9;
      this.power = 0;
      this.autopilotActive = false;
      return;
    }

    const auto = this.autopilot && alive("autopilot") && program.hasHook("autopilot.steer");
    this.autopilotActive = auto;
    const spec: CarSpec = {
      topSpeed: clamp(program.num("top_speed", 120), 40, 400),
      acceleration: clamp(program.num("acceleration", 12), 2, 80),
      grip: alive("tires") ? clamp(program.num("grip", 1), 0.4, 2) : 1,
    };
    const gates = alive("checkpoints") ? program.list<number>("checkpoints").filter(finite) : [];

    this.acc += dt;
    let steps = 0;
    while (this.acc >= 1 / 60 && steps < 3) {
      this.acc -= 1 / 60;
      steps++;
      const h = 1 / 60;

      const needSensors = auto || autoplay || alive("autopilot");
      const sensors = needSensors ? readSensors(TRACK, car) : this.sensors;
      this.sensors = sensors;

      let throttle = 0;
      let brake = false;
      let steer = 0;

      if (auto) {
        const out = program.call<number>("autopilot.steer", sensors);
        steer = finite(out) ? out : 0;
        if (program.hasHook("autopilot.throttle")) {
          const t = program.call<number>("autopilot.throttle", sensors);
          throttle = finite(t) ? clamp(t, 0, 1) : 0;
          brake = throttle <= 0.02 && car.kmh > 15;
        } else {
          const c = cruise(spec, car.kmh, sensors);
          throttle = c.throttle;
          brake = c.brake;
        }
        car.pedal = throttle;
      } else {
        // In autoplay a virtual driver presses the keys, so every unlock level can show itself off.
        const virtualGas = autoplay && car.kmh < spec.topSpeed * 0.5;
        const virtualLeft = autoplay && sensors.left > sensors.right + 0.05;
        const virtualRight = autoplay && sensors.right > sensors.left + 0.05;
        const want = input.gas || virtualGas ? 1 : 0;
        const rate = want > car.pedal ? 2.4 : 5;
        car.pedal = clamp(car.pedal + Math.sign(want - car.pedal) * rate * h, 0, 1);
        if (Math.abs(want - car.pedal) < rate * h) car.pedal = want;
        throttle = car.pedal;
        if (alive("throttle") && program.hasHook("throttle_curve")) {
          const t = program.call<number>("throttle_curve", car.pedal);
          throttle = finite(t) ? clamp(t, 0, 1.2) : car.pedal;
        }
        brake = input.brake;
        if (alive("steering") && program.hasHook("steer")) {
          const out = program.call<number>("steer", input.left || virtualLeft, input.right || virtualRight);
          steer = finite(out) ? clamp(out, -MAX_STEER, MAX_STEER) : 0;
        }
      }

      this.power = throttle;
      const prev = car.progress;
      const events = step(TRACK, car, spec, { throttle, brake, steer }, h);
      for (const g of crossedGates(prev, car.progress, gates, car.gatesPassed)) {
        car.gatesPassed.push(g);
        this.gateFlash[g] = 1;
        this.split = `Gate ${g}% · ${car.lapTime.toFixed(2)}s`;
        this.splitTimer = 1.8;
      }
      for (const e of events) {
        if (e.kind === "lap") {
          this.split = `Lap ${e.lap} · ${e.time.toFixed(2)}s`;
          this.splitTimer = 2.5;
        }
        this.events.push(e);
      }
    }
  }
}
