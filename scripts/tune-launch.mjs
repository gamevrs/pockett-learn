// Headless check of the Launch Control flight model (src/scenes/launch/sim.ts).
//   node scripts/tune-launch.mjs
// Proves: the reference program reaches orbit and the Moon, a weak rocket stays on the pad,
// nearby learner values still end well, and garbage values never crash or hang the sim.
process.env.NODE_NO_WARNINGS = "1";
import * as sim from "../src/scenes/launch/sim.ts";

// ── the reference solution, mirrored from src/content/projects/launch.ts ──
const REF = {
  dry_mass_t: 45.0,
  fuel_tons: 80.0,
  thrust_kn: 2400.0,
  payload_t: 14.0,
  stages: [
    { name: "Booster", thrust_kn: 2600, burn_seconds: 65, dry_t: 14.0 },
    { name: "Upper stage", thrust_kn: 800, burn_seconds: 150, dry_t: 5.0 },
  ],
  turn_start_km: 1,
  degrees_per_km: 2,
};
const throttleProgram = (t) => Math.min(1.0, 0.7 + t * 0.03);
const abortCheck = (alt, speed, fuel) => (alt < 25 && speed > 1200) || (fuel < 2 && alt < 70);
const pitchProgram = (start, gain) => (alt) => (alt <= start ? 0 : Math.min((alt - start) * gain, 90));

const refHooks = { throttle: throttleProgram, abort: abortCheck, pitch: pitchProgram(REF.turn_start_km, REF.degrees_per_km) };
const stagedSpec = (stages = REF.stages, payload = REF.payload_t, guided = true) => {
  const spec = sim.stagedRocket(stages, payload);
  if (spec) spec.guided = guided;
  return spec;
};
const singleSpec = (thrust = REF.thrust_kn, fuel = REF.fuel_tons, dry = REF.dry_mass_t) => sim.singleStageRocket(thrust, fuel, dry);

let failures = 0;
const check = (ok, label, detail = "") => {
  console.log(`${ok ? "ok  " : "FAIL"} ${label}${detail ? "  " + detail : ""}`);
  if (!ok) failures++;
};
const fmt = (o) =>
  o
    ? `${o.kind} peri=${Number.isFinite(o.perigeeKm) ? o.perigeeKm.toFixed(0) : "-"}km apo=${Number.isFinite(o.apogeeKm) ? o.apogeeKm.toFixed(0) : "-"}km dv=${o.dvLeft.toFixed(0)}m/s fuel=${o.fuelLeftPct.toFixed(0)}%`
    : "no outcome";

/** Runs like the scene: one advance per 60 Hz frame at the suggested warp. Counts hook calls per frame. */
function flyCounted(spec, hooks) {
  let maxCalls = 0;
  let calls = 0;
  let wall = 0;
  const wrapped = {
    throttle: hooks.throttle && ((t) => (calls++, hooks.throttle(t))),
    pitch: hooks.pitch && ((a) => (calls++, hooks.pitch(a))),
    abort: hooks.abort && ((a, s, f) => (calls++, hooks.abort(a, s, f))),
  };
  const f = sim.createFlight(spec);
  let n = 0;
  while (f.phase !== "ended" && f.phase !== "orbit" && n++ < 2_000_000) {
    calls = 0;
    sim.advance(f, spec, wrapped, sim.suggestWarp(f) / 60);
    maxCalls = Math.max(maxCalls, calls);
    wall += 1 / 60;
    f.events.length = 0;
  }
  return { f, wall, maxCalls };
}

console.log(`pocket Earth: radius ${sim.R_PLANET / 1000} km, orbit needs perigee >= ${sim.ORBIT_PERIGEE_KM} km, Moon needs ${sim.TLI_DV} m/s left\n`);

// 1. reference solution
const ref = stagedSpec();
const refRun = flyCounted(ref, refHooks);
console.log("reference:", fmt(refRun.f.outcome), ` mission ${refRun.f.t.toFixed(0)}s, wall ${refRun.wall.toFixed(0)}s, TWR ${sim.liftoffTwr(ref).toFixed(2)}`);
check(refRun.f.outcome?.kind === "moon", "reference program reaches orbit with enough fuel for the Moon");
check(refRun.f.outcome.perigeeKm >= sim.ORBIT_PERIGEE_KM, "reference perigee is above 80 km");
check(refRun.maxCalls <= 3, "at most 3 hook calls per frame", `(max ${refRun.maxCalls})`);
check(refRun.wall < 110, "reference flight is watchable", `(${refRun.wall.toFixed(0)}s of wall time)`);

// lesson 7: staged, but no guidance yet -> straight up
const noGuide = flyCounted(stagedSpec(REF.stages, REF.payload_t, false), { throttle: throttleProgram, abort: abortCheck });
console.log("staged, no guidance:", fmt(noGuide.f.outcome));
check(["suborbital", "escape"].includes(noGuide.f.outcome.kind), "staged rocket without guidance goes up but not into orbit");

// 2. single-stage rocket (lessons 4 to 6)
for (const [label, hooks] of [
  ["lesson 4 (full throttle)", {}],
  ["lesson 5 (throttle ramp)", { throttle: throttleProgram }],
  ["lesson 6 (with abort rule)", { throttle: throttleProgram, abort: abortCheck }],
]) {
  const r = flyCounted(singleSpec(), hooks);
  console.log(label.padEnd(30), fmt(r.f.outcome), ` wall ${r.wall.toFixed(0)}s`);
  check(r.f.outcome.kind === "suborbital" && r.f.outcome.maxAltKm > 60, `${label}: leaves the pad and reaches space`);
}

// 3. weak rocket
const weak = flyCounted(singleSpec(1100), {});
console.log("weak rocket:", fmt(weak.f.outcome), `TWR ${sim.liftoffTwr(singleSpec(1100)).toFixed(2)}`);
check(weak.f.outcome.kind === "nolift" && sim.altitudeKm(weak.f) < 0.01, "twr < 1 stays on the pad (no liftoff)");
const edge = flyCounted(singleSpec(2400), { throttle: () => 0 });
check(edge.f.outcome.kind === "nolift", "throttle program returning 0 also stays on the pad");

// 4. abort
const abortRun = flyCounted(singleSpec(), { abort: () => true });
check(abortRun.f.outcome.kind === "abort", "abort_check returning True aborts", fmt(abortRun.f.outcome));
const lowFuel = flyCounted(singleSpec(2400, 12, 45), { throttle: throttleProgram, abort: abortCheck });
console.log("tiny tank + abort rule:", fmt(lowFuel.f.outcome));
check(lowFuel.f.outcome.kind === "abort", "running out of fuel too low triggers the abort rule");

// 5. tinkering: thrust, burn time, pitch program
console.log("\nstaged reference scaled (thrust x, burn x):");
for (const [kt, kb] of [[0.8, 1], [1.2, 1], [1, 0.8], [1, 1.2], [0.8, 0.8], [1.2, 1.2], [1.5, 1], [2, 1]]) {
  const stages = REF.stages.map((s) => ({ ...s, thrust_kn: s.thrust_kn * kt, burn_seconds: s.burn_seconds * kb }));
  const r = flyCounted(stagedSpec(stages), refHooks);
  console.log(`  x${kt} x${kb}  TWR ${sim.liftoffTwr(stagedSpec(stages)).toFixed(2)}  ${fmt(r.f.outcome)}`);
  check(["moon", "orbit", "suborbital", "abort", "escape", "crash"].includes(r.f.outcome.kind), `scale ${kt}/${kb} ends with a clear outcome`);
  if (kt >= 1 && kb >= 1) check(["moon", "orbit"].includes(r.f.outcome.kind), `scale ${kt}/${kb} still reaches orbit`);
}

console.log("\npitch programs (rows: turn_start_km, cols: degrees_per_km); m/o = moon/orbit with dv left in 100 m/s:");
const gains = [0.5, 0.8, 1, 1.3, 1.6, 2, 2.5, 3, 4];
console.log("      " + gains.map((g) => String(g).padEnd(6)).join(""));
let goodCells = 0;
let cells = 0;
for (const start of [0, 1, 2, 4, 8, 15]) {
  let row = String(start).padEnd(6);
  for (const g of gains) {
    const r = flyCounted(ref, { ...refHooks, pitch: pitchProgram(start, g) });
    const k = r.f.outcome.kind;
    row += (k === "moon" || k === "orbit" ? k[0] + Math.round(r.f.outcome.dvLeft / 100) : k.slice(0, 3)).padEnd(6);
    cells++;
    if (k === "moon" || k === "orbit") goodCells++;
  }
  console.log(row);
}
check(goodCells / cells > 0.8, "most sensible pitch programs reach orbit", `(${goodCells}/${cells})`);

// 6. garbage in, no exceptions out
console.log("\ngarbage inputs:");
const garbageStages = [
  null, undefined, 7, "x", [], {}, [{}], [{ thrust_kn: "big", burn_seconds: 5 }], [{ thrust_kn: NaN, burn_seconds: 5 }],
  [{ thrust_kn: -5, burn_seconds: -5, dry_t: -5 }], [{ thrust_kn: 1e12, burn_seconds: 1e12, dry_t: 1e12 }],
  [{ thrust_kn: 0, burn_seconds: 10, dry_t: 3 }],
  [{ thrust_kn: 1000, burn_seconds: 10 }, "oops", null, { thrust_kn: 500, burn_seconds: 30, dry_t: 2 }],
  [1, 2, 3, 4, 5, 6].map((i) => ({ thrust_kn: 500 * i, burn_seconds: 20 + i, dry_t: i })),
];
let garbageOk = true;
for (const g of garbageStages) {
  try {
    const spec = sim.stagedRocket(g, NaN) ?? sim.singleStageRocket(NaN, NaN, NaN);
    spec.guided = true;
    const r = flyCounted(spec, refHooks);
    if (!r.f.outcome) garbageOk = false;
  } catch (e) {
    garbageOk = false;
    console.log("  threw for", JSON.stringify(g), e);
  }
}
for (const v of [NaN, Infinity, -Infinity, 1e308, -1, 0, 1e-300]) {
  try {
    const r = flyCounted(sim.singleStageRocket(v, v, v), { throttle: () => v, pitch: () => v });
    if (!r.f.outcome) garbageOk = false;
  } catch (e) {
    garbageOk = false;
    console.log("  threw for scalar", v, e);
  }
}
const weirdHooks = [() => undefined, () => NaN, () => "1", () => null, () => ({}), () => [1], () => Infinity, () => -1e9];
for (const h of weirdHooks) {
  try {
    const r = flyCounted(ref, { throttle: h, pitch: h, abort: h });
    if (!r.f.outcome) garbageOk = false;
  } catch (e) {
    garbageOk = false;
    console.log("  threw for weird hook", e);
  }
}
check(garbageOk, "garbage stages, scalars and hook return values never throw and always end");

console.log(failures ? `\n${failures} check(s) FAILED` : "\nall launch checks passed");
process.exit(failures ? 1 : 0);
