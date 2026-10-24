// The Turbo Garage controller must behave the same at any refresh rate.
//   node scripts/tune-garage-fps.mjs
process.env.NODE_NO_WARNINGS = "1";
import { GarageController } from "../src/scenes/garage/controller.ts";

let calls = 0;
const program = {
  generation: 1,
  hasHook: (p) => p === "autopilot.steer",
  call: (p, s) => { calls++; return (s.right - s.left) * 60; },
  num: (n, f) => ({ top_speed: 180, acceleration: 20, grip: 1.15 })[n] ?? f,
  list: () => [],
};
const alive = () => true;
const input = { gas: false, brake: false, left: false, right: false };

for (const fps of [30, 60, 120, 144]) {
  const c = new GarageController(true);
  calls = 0;
  let t = 0;
  const dt = 1 / fps;
  while (t < 90 && c.car.lap < 3) { c.tick(dt, program, alive, input, false); t += dt; }
  console.log(`${String(fps).padStart(3)} fps: laps=${c.car.lap} best=${c.car.bestLap?.toFixed(2)}s crashes=${c.car.crashes} python calls/s=${(calls / t).toFixed(0)}`);
}
