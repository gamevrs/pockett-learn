// Headless check that the reference Autopilot (lesson 8) can complete laps.
// usage: node scripts/tune-garage.mjs [gain]
import * as sim from "../src/scenes/garage/sim.ts";

const gain = Number(process.argv[2] ?? 60);
const track = sim.buildTrack();
const spec = { topSpeed: 120, acceleration: 20, grip: Number(process.argv[3] ?? 1.15) };

// min radius of curvature
let minR = Infinity;
for (let i = 0; i < track.pts.length; i++) {
  const a = track.pts[i], b = track.pts[(i + 1) % track.pts.length], c = track.pts[(i + 2) % track.pts.length];
  const ab = Math.hypot(b.x - a.x, b.y - a.y), bc = Math.hypot(c.x - b.x, c.y - b.y), ca = Math.hypot(a.x - c.x, a.y - c.y);
  const area = Math.abs((b.x - a.x) * (c.y - a.y) - (c.x - a.x) * (b.y - a.y)) / 2;
  const r = area > 1e-9 ? (ab * bc * ca) / (4 * area) : Infinity;
  minR = Math.min(minR, r);
}
console.log("track length", track.length.toFixed(0), "min radius", minR.toFixed(0));

const car = sim.spawn(track);
let t = 0, walls = 0, respawns = 0;
const dt = 1 / 60;
while (t < 120 && car.lap < 3) {
  const s = sim.readSensors(track, car);
  const steer = (s.right - s.left) * gain;
  const c = sim.cruise(spec, car.kmh, s);
  const ev = sim.step(track, car, spec, { throttle: c.throttle, brake: c.brake, steer }, dt);
  for (const e of ev) { if (e.kind === "wall") walls++; if (e.kind === "respawn") respawns++; if (e.kind === "lap") console.log("lap", e.lap, e.time); }
  t += dt;
}
console.log({ t: t.toFixed(1), laps: car.lap, walls, respawns, best: car.bestLap });
