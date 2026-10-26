import { createStaticProgram, type ProgramHandle } from "@/engine/program";
import type { Sensors } from "./sim";

/** What the finished Python program would expose, written in plain JS so the landing page needs no Python runtime. */
export function garageDemoProgram(): ProgramHandle {
  return createStaticProgram({
    stdout: "BOOT SEQUENCE START\nENGINE: OK\nSYSTEMS GO",
    vars: {
      car_name: "Bolt",
      paint: "#c5ee8a",
      top_speed: 180,
      has_turbo: true,
      acceleration: 20,
      checkpoints: [20, 40, 60, 80],
      tire: "soft",
      grip: 1.15,
      best_lap: 29.1,
      average_lap: 30.15,
    },
    hooks: {
      throttle_curve: (pedal: number) => pedal * pedal,
      steer: (left: boolean, right: boolean) => (left && !right ? -30 : right && !left ? 30 : 0),
      "autopilot.steer": (sensors: Sensors) => (sensors.right - sensors.left) * 60,
    },
  });
}
