// Checks the shared electronics kit (src/learn/widgets/elec-kit) against hand-computed answers.
//   node scripts/test-elec-kit.mjs
// The solvers and formatter are plain TypeScript, loaded through Node's type stripping plus the repo's resolve
// hook (scripts/ts-alias-hooks.mjs), like test-progress-ids.mjs. No dependencies.
process.env.NODE_NO_WARNINGS = "1";
import { register } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
register(pathToFileURL(path.join(HERE, "ts-alias-hooks.mjs")).href);
const kit = (f) => import(pathToFileURL(path.join(HERE, "..", "src", "learn", "widgets", "elec-kit", f)).href);
const { solveDC } = await kit("solve.ts");
const { simulate, waveAt, peakAfter, sampleAt } = await kit("transient.ts");
const { formatSI, parseSI, toInputSI } = await kit("format.ts");
const { pinsOf, markOf } = await kit("geometry.ts");

let passed = 0;
const failures = [];
function check(name, ok, detail = "") {
  if (ok) passed++;
  else failures.push(`${name}${detail ? `: ${detail}` : ""}`);
}
/** |got − want| ≤ tol·max(|want|, floor) */
function near(name, got, want, tol = 1e-9, floor = 1e-12) {
  const ok = Number.isFinite(got) && Math.abs(got - want) <= tol * Math.max(Math.abs(want), floor);
  check(name, ok, `got ${got}, want ${want}`);
}
function solved(name, res) {
  check(`${name}: solves`, res.ok, res.ok ? "" : `${res.error}: ${res.message}`);
  if (res.ok) {
    const nums = [...Object.values(res.v), ...Object.values(res.el).flatMap((e) => [e.v, e.i, e.p])];
    check(`${name}: every number is finite`, nums.every(Number.isFinite));
  }
  return res.ok ? res : null;
}
function errors(name, res, kind) {
  check(`${name}: reports "${kind}"`, !res.ok && res.error === kind, res.ok ? "solved instead" : `${res.error}: ${res.message}`);
  if (!res.ok) check(`${name}: has a readable message`, typeof res.message === "string" && res.message.length > 20 && !/NaN|undefined/.test(res.message), res.message);
}

/* ───────────── DC ───────────── */
{
  // series: 9 V across 1 kΩ + 2 kΩ → I = 3 mA, middle node 6 V
  const r = solved("series", solveDC([
    { kind: "V", id: "B1", a: "top", b: "gnd", volts: 9 },
    { kind: "R", id: "R1", a: "top", b: "mid", ohms: 1000 },
    { kind: "R", id: "R2", a: "mid", b: "gnd", ohms: 2000 },
  ]));
  if (r) {
    near("series: current", r.el.R1.i, 0.003);
    near("series: middle node", r.v.mid, 6);
    near("series: battery current is negative (leaves its + terminal)", r.el.B1.i, -0.003);
    near("series: battery delivers 27 mW", r.el.B1.p, -0.027);
    near("series: R1 dissipates 9 mW", r.el.R1.p, 0.009);
    near("series: R2 dissipates 18 mW", r.el.R2.p, 0.018);
  }
}
{
  // parallel: 12 V across 3 kΩ ∥ 6 kΩ (= 2 kΩ) → 6 mA total, 4 mA and 2 mA
  const r = solved("parallel", solveDC([
    { kind: "V", id: "V1", a: "n", b: "gnd", volts: 12 },
    { kind: "R", id: "R1", a: "n", b: "gnd", ohms: 3000 },
    { kind: "R", id: "R2", a: "n", b: "gnd", ohms: 6000 },
  ]));
  if (r) {
    near("parallel: total current", -r.el.V1.i, 0.006);
    near("parallel: 3 kΩ branch", r.el.R1.i, 0.004);
    near("parallel: 6 kΩ branch", r.el.R2.i, 0.002);
  }
}
{
  // divider: 5 V, 10 kΩ over 4.7 kΩ → 5·4.7/14.7; loaded by 4.7 kΩ → 5·2.35/12.35
  const parts = [
    { kind: "V", id: "V1", a: "in", b: "gnd", volts: 5 },
    { kind: "R", id: "R1", a: "in", b: "out", ohms: 10000 },
    { kind: "R", id: "R2", a: "out", b: "gnd", ohms: 4700 },
  ];
  const r = solved("divider", solveDC(parts));
  if (r) near("divider: Vout = Vin·R2/(R1+R2)", r.v.out, (5 * 4.7) / 14.7);
  const l = solved("loaded divider", solveDC([...parts, { kind: "R", id: "RL", a: "out", b: "gnd", ohms: 4700 }]));
  if (l) near("loaded divider: Vout with R2 ∥ RL", l.v.out, (5 * 2.35) / 12.35);
}
{
  // Wheatstone bridge, 10 V. Balanced (100/200 vs 150/300): no current in the 50 Ω galvanometer.
  const bridge = (r4) => [
    { kind: "V", id: "V1", a: "a", b: "gnd", volts: 10 },
    { kind: "R", id: "R1", a: "a", b: "c", ohms: 100 },
    { kind: "R", id: "R2", a: "c", b: "gnd", ohms: 200 },
    { kind: "R", id: "R3", a: "a", b: "d", ohms: 150 },
    { kind: "R", id: "R4", a: "d", b: "gnd", ohms: r4 },
    { kind: "R", id: "Rg", a: "c", b: "d", ohms: 50 },
  ];
  const b = solved("balanced bridge", solveDC(bridge(300)));
  if (b) {
    near("balanced bridge: galvanometer current is zero", b.el.Rg.i, 0, 1, 1e-12);
    near("balanced bridge: both midpoints at 20/3 V", b.v.c, 20 / 3);
  }
  // Unbalanced (R4 = 100 Ω), by hand: 7Vc − 4Vd = 20 and −6Vc + 11Vd = 20 → Vc = 2100/371, Vd = 260/53
  const u = solved("unbalanced bridge", solveDC(bridge(100)));
  if (u) {
    near("unbalanced bridge: Vc", u.v.c, 2100 / 371);
    near("unbalanced bridge: Vd", u.v.d, 260 / 53);
    near("unbalanced bridge: galvanometer current 5.6/371 A", u.el.Rg.i, 5.6 / 371);
  }
}
{
  // two loops: 10 V – 2 Ω – node – 2 Ω – 5 V, with 4 Ω from node to ground. KCL at the node: 5Vn = 30 → 6 V.
  const r = solved("two-loop KVL", solveDC([
    { kind: "V", id: "V1", a: "n1", b: "gnd", volts: 10 },
    { kind: "R", id: "R1", a: "n1", b: "n2", ohms: 2 },
    { kind: "R", id: "R2", a: "n2", b: "gnd", ohms: 4 },
    { kind: "R", id: "R3", a: "n2", b: "n3", ohms: 2 },
    { kind: "V", id: "V2", a: "n3", b: "gnd", volts: 5 },
  ]));
  if (r) {
    near("two-loop: node voltage", r.v.n2, 6);
    near("two-loop: I(R1) = 2 A", r.el.R1.i, 2);
    near("two-loop: I(R2) = 1.5 A", r.el.R2.i, 1.5);
    near("two-loop: 0.5 A flows into V2's + terminal (it is being charged)", r.el.V2.i, 0.5);
    near("two-loop: V1 delivers 20 W", r.el.V1.p, -20);
    const total = Object.values(r.el).reduce((s, e) => s + e.p, 0);
    near("two-loop: power balances (sum of absorbed power is 0)", total, 0, 1, 1e-9);
  }
}
{
  // current source: 2 mA pushed into n1 (from gnd through the source) across 1 kΩ → 2 V; with 1 kΩ ∥ 1 kΩ → 1 V
  const r = solved("current source", solveDC([
    { kind: "I", id: "I1", a: "gnd", b: "n1", amps: 0.002 },
    { kind: "R", id: "R1", a: "n1", b: "gnd", ohms: 1000 },
  ]));
  if (r) {
    near("current source: V = IR", r.v.n1, 2);
    near("current source: delivers 4 mW", r.el.I1.p, -0.004);
  }
  const p = solved("current source, two resistors", solveDC([
    { kind: "I", id: "I1", a: "gnd", b: "n1", amps: 0.002 },
    { kind: "R", id: "R1", a: "n1", b: "gnd", ohms: 1000 },
    { kind: "R", id: "R2", a: "n1", b: "gnd", ohms: 1000 },
  ]));
  if (p) near("current source: splits 1 mA each", p.el.R2.i, 0.001);
}
{
  // switch: 9 V, switch, 90 Ω lamp
  const circuit = (closed) => [
    { kind: "V", id: "B1", a: "p", b: "gnd", volts: 9 },
    { kind: "S", id: "S1", a: "p", b: "q", closed },
    { kind: "R", id: "LAMP", a: "q", b: "gnd", ohms: 90 },
  ];
  const c = solved("closed switch", solveDC(circuit(true)));
  if (c) {
    near("closed switch: lamp current 0.1 A", c.el.LAMP.i, 0.1);
    near("closed switch: switch carries 0.1 A", c.el.S1.i, 0.1);
    near("closed switch: 0 V across the switch", c.el.S1.v, 0, 1, 1e-12);
  }
  const o = solved("open switch", solveDC(circuit(false)));
  if (o) {
    near("open switch: no current", o.el.LAMP.i, 0, 1, 1e-12);
    near("open switch: all 9 V across the switch", o.el.S1.v, 9);
  }
  const par = solved("two closed switches in parallel", solveDC([...circuit(true), { kind: "S", id: "S2", a: "p", b: "q", closed: true }]));
  if (par) near("parallel switches: total current still 0.1 A", par.el.S1.i + par.el.S2.i, 0.1);
}
{
  // diodes (piecewise-linear: forward drop + 1 mΩ on-resistance)
  const led = (vs) => [
    { kind: "V", id: "V1", a: "s", b: "gnd", volts: vs },
    { kind: "R", id: "R1", a: "s", b: "an", ohms: 150 },
    { kind: "D", id: "D1", a: "an", b: "gnd", vf: 2 },
  ];
  const f = solved("LED forward", solveDC(led(5)));
  if (f) {
    near("LED: I = (Vs − Vf)/R = 20 mA", f.el.D1.i, 0.02, 1e-4);
    check("LED: reported on", f.el.D1.on === true);
  }
  const rv = solved("LED reversed supply", solveDC(led(-5)));
  if (rv) {
    check("LED reversed: off", rv.el.D1.on === false);
    near("LED reversed: only the 1 GΩ model leakage (< 10 nA)", rv.el.D1.i, 0, 1, 1e-8);
    near("LED reversed: whole supply across it", rv.el.D1.v, -5, 1e-6);
  }
  // bridge rectifier: 10 V either way round → 10 − 2·0.7 = 8.6 V across the load, same polarity
  const bridge = (v) => [
    { kind: "V", id: "V1", a: "x", b: "y", volts: v },
    { kind: "R", id: "Rg", a: "y", b: "gnd", ohms: 1e6 },
    { kind: "D", id: "D1", a: "x", b: "pos" },
    { kind: "D", id: "D2", a: "y", b: "pos" },
    { kind: "D", id: "D3", a: "neg", b: "x" },
    { kind: "D", id: "D4", a: "neg", b: "y" },
    { kind: "R", id: "RL", a: "pos", b: "neg", ohms: 1000 },
  ];
  for (const v of [10, -10]) {
    const b = solved(`bridge rectifier ${v} V`, solveDC(bridge(v)));
    if (b) near(`bridge rectifier ${v} V: load sees +8.6 V`, b.el.RL.v, 8.6, 1e-4);
  }
}
{
  // errors instead of NaN
  errors("floating resistor", solveDC([
    { kind: "V", id: "V1", a: "n", b: "gnd", volts: 5 },
    { kind: "R", id: "R1", a: "n", b: "gnd", ohms: 100 },
    { kind: "R", id: "R9", a: "x", b: "y", ohms: 100 },
  ]), "floating-node");
  const allowed = solveDC([
    { kind: "V", id: "V1", a: "n", b: "gnd", volts: 5 },
    { kind: "R", id: "R1", a: "n", b: "gnd", ohms: 100 },
    { kind: "R", id: "R9", a: "x", b: "y", ohms: 100 },
  ], { allowFloating: true });
  check("floating allowed: solves and lists the island", allowed.ok && allowed.floating.includes("x") && allowed.floating.includes("y"), JSON.stringify(allowed));
  errors("parallel ideal sources", solveDC([
    { kind: "V", id: "V1", a: "n", b: "gnd", volts: 5 },
    { kind: "V", id: "V2", a: "n", b: "gnd", volts: 5 },
    { kind: "R", id: "R1", a: "n", b: "gnd", ohms: 100 },
  ]), "voltage-loop");
  errors("switch shorting a battery", solveDC([
    { kind: "V", id: "B1", a: "p", b: "gnd", volts: 9 },
    { kind: "S", id: "S1", a: "p", b: "gnd", closed: true },
    { kind: "R", id: "R1", a: "p", b: "gnd", ohms: 100 },
  ]), "short-circuit");
  errors("current source into an open switch", solveDC([
    { kind: "I", id: "I1", a: "gnd", b: "n", amps: 0.001 },
    { kind: "S", id: "S1", a: "n", b: "m", closed: false },
    { kind: "R", id: "R1", a: "m", b: "gnd", ohms: 100 },
  ]), "current-source-open");
  errors("zero-ohm resistor", solveDC([
    { kind: "V", id: "V1", a: "n", b: "gnd", volts: 5 },
    { kind: "R", id: "R1", a: "n", b: "gnd", ohms: 0 },
  ]), "invalid-value");
  errors("no ground", solveDC([
    { kind: "V", id: "V1", a: "n", b: "m", volts: 5 },
    { kind: "R", id: "R1", a: "n", b: "m", ohms: 100 },
  ]), "no-ground");
}

/* ───────────── transient ───────────── */
const fullScale = (name, got, want, scale, tol = 0.01) => check(name, Number.isFinite(got) && Math.abs(got - want) <= tol * scale, `got ${got.toFixed?.(5)}, want ${want.toFixed(5)} (±${(tol * 100).toFixed(1)}% of ${scale})`);
for (const method of ["backward-euler", "trapezoidal"]) {
  // RC charge: 5 V step into 1 kΩ / 1 µF (τ = 1 ms), 100 steps per τ
  const rc = simulate([
    { kind: "V", id: "V1", a: "in", b: "gnd", volts: { kind: "step", from: 0, to: 5, at: 0 } },
    { kind: "R", id: "R1", a: "in", b: "out", ohms: 1000 },
    { kind: "C", id: "C1", a: "out", b: "gnd", farads: 1e-6 },
  ], { tStop: 5e-3, steps: 500, method });
  check(`${method} RC charge: runs`, rc.ok, rc.ok ? "" : rc.message);
  if (rc.ok) {
    const at = (t) => sampleAt(rc, rc.v.out, t) / 5;
    near(`${method} RC charge: starts at 0`, rc.v.out[0], 0, 1, 1e-6);
    near(`${method} RC charge: 63.2% at τ`, at(1e-3), 1 - Math.exp(-1), 0.01);
    near(`${method} RC charge: 86.5% at 2τ`, at(2e-3), 1 - Math.exp(-2), 0.01);
    near(`${method} RC charge: 99.3% at 5τ`, at(5e-3), 1 - Math.exp(-5), 0.01);
    near(`${method} RC charge: initial current 5 mA`, rc.el.C1.i[1], 5e-3 * Math.exp(-0.01), 0.02);
  }
  // RC discharge from 5 V
  const dis = simulate([
    { kind: "C", id: "C1", a: "out", b: "gnd", farads: 1e-6, v0: 5 },
    { kind: "R", id: "R1", a: "out", b: "gnd", ohms: 1000 },
  ], { tStop: 5e-3, steps: 500, method });
  check(`${method} RC discharge: runs`, dis.ok, dis.ok ? "" : dis.message);
  if (dis.ok) {
    near(`${method} RC discharge: starts at 5 V`, dis.v.out[0], 5, 1e-5);
    for (const k of [1, 2, 5]) fullScale(`${method} RC discharge: e^−${k} of 5 V at ${k}τ (within 1% of 5 V)`, sampleAt(dis, dis.v.out, k * 1e-3), 5 * Math.exp(-k), 5);
    near(`${method} RC discharge: 36.8% at τ (relative)`, sampleAt(dis, dis.v.out, 1e-3) / 5, Math.exp(-1), 0.01);
  }
  // RL rise: 10 V, 10 Ω, 10 mH (τ = L/R = 1 ms, final 1 A)
  const rl = simulate([
    { kind: "V", id: "V1", a: "in", b: "gnd", volts: 10 },
    { kind: "R", id: "R1", a: "in", b: "x", ohms: 10 },
    { kind: "L", id: "L1", a: "x", b: "gnd", henries: 0.01 },
  ], { tStop: 5e-3, steps: 500, method });
  check(`${method} RL rise: runs`, rl.ok, rl.ok ? "" : rl.message);
  if (rl.ok) {
    near(`${method} RL rise: starts at 0 A`, rl.el.L1.i[0], 0, 1, 1e-5);
    near(`${method} RL rise: full 10 V across L at the start`, rl.el.L1.v[0], 10, 1e-4);
    for (const k of [1, 2, 5]) near(`${method} RL rise: ${(100 * (1 - Math.exp(-k))).toFixed(1)}% at ${k}τ`, sampleAt(rl, rl.el.L1.i, k * 1e-3), 1 - Math.exp(-k), 0.01);
  }
}
{
  // sine through an RC low-pass at f = fc = 1/(2πRC): steady-state amplitude 1/√2 of the input
  const R = 1000;
  const C = 1e-6;
  const fc = 1 / (2 * Math.PI * R * C);
  for (const [method, perPeriod] of [["backward-euler", 1000], ["trapezoidal", 200]]) {
    const periods = 20;
    const s = simulate([
      { kind: "V", id: "V1", a: "in", b: "gnd", volts: { kind: "sine", amplitude: 1, freq: fc } },
      { kind: "R", id: "R1", a: "in", b: "out", ohms: R },
      { kind: "C", id: "C1", a: "out", b: "gnd", farads: C },
    ], { tStop: periods / fc, steps: periods * perPeriod, method });
    check(`${method} RC low-pass: runs`, s.ok, s.ok ? "" : s.message);
    if (s.ok) near(`${method} RC low-pass at fc (${perPeriod} steps/period): amplitude ≈ 0.707`, peakAfter(s, s.v.out, (periods - 2) / fc), Math.SQRT1_2, 0.01);
  }
}
{
  // flyback: 10 V, 10 Ω, 10 mH charged to 1 A; switch opens at 6 ms; a diode across the coil catches the current
  const fb = simulate([
    { kind: "V", id: "V1", a: "in", b: "gnd", volts: 10 },
    { kind: "S", id: "S1", a: "in", b: "top", closed: (t) => t < 6e-3 },
    { kind: "R", id: "R1", a: "top", b: "x", ohms: 10 },
    { kind: "L", id: "L1", a: "x", b: "gnd", henries: 0.01 },
    { kind: "D", id: "Dfly", a: "gnd", b: "top" },
  ], { tStop: 8e-3, steps: 800 });
  check("flyback: runs", fb.ok, fb.ok ? "" : fb.message);
  if (fb.ok) {
    near("flyback: about 1 A before the switch opens", sampleAt(fb, fb.el.L1.i, 5.9e-3), 1 - Math.exp(-5.9), 0.01);
    const after = sampleAt(fb, fb.el.Dfly.i, 6.05e-3);
    check("flyback: the diode carries the coil current after the switch opens", after > 0.8, `diode current ${after}`);
    const vTop = Math.min(...fb.v.top);
    check("flyback: the diode clamps the spike near −0.7 V (instead of thousands of volts)", vTop > -1 && vTop < -0.6, `min V(top) ${vTop}`);
    check("flyback: every sample is finite", Object.values(fb.v).every((tr) => tr.every(Number.isFinite)));
  }
  // without the diode the cut current makes a big but finite spike, not NaN
  const spike = simulate([
    { kind: "V", id: "V1", a: "in", b: "gnd", volts: 10 },
    { kind: "S", id: "S1", a: "in", b: "top", closed: (t) => t < 6e-3 },
    { kind: "R", id: "R1", a: "top", b: "x", ohms: 10 },
    { kind: "L", id: "L1", a: "x", b: "gnd", henries: 0.01 },
    { kind: "R", id: "Rleak", a: "top", b: "gnd", ohms: 1e6 },
  ], { tStop: 8e-3, steps: 800 });
  check("flyback without diode: runs", spike.ok, spike.ok ? "" : spike.message);
  if (spike.ok) {
    const worst = Math.min(...spike.v.top);
    // (its size depends on the step: one backward-Euler step forces the 1 A through ~1 MΩ in series with L/h)
    check("flyback without diode: a large negative spike, still a finite number", Number.isFinite(worst) && worst < -500, `min ${worst}`);
  }
}
{
  // half-wave rectifier + 1000 µF smoothing into 1 kΩ: peaks near 10 − 0.7 V, ripple ≈ I/(f·C) ≈ 0.19 V
  const hw = simulate([
    { kind: "V", id: "V1", a: "ac", b: "gnd", volts: { kind: "sine", amplitude: 10, freq: 50 } },
    { kind: "D", id: "D1", a: "ac", b: "out" },
    { kind: "C", id: "C1", a: "out", b: "gnd", farads: 1e-3 },
    { kind: "R", id: "RL", a: "out", b: "gnd", ohms: 1000 },
  ], { tStop: 0.2, steps: 20000 });
  check("half-wave rectifier: runs", hw.ok, hw.ok ? "" : hw.message);
  if (hw.ok) {
    const last = hw.v.out.filter((_, k) => hw.t[k] >= 0.16);
    const hi = Math.max(...last);
    const lo = Math.min(...last);
    near("half-wave rectifier: peak ≈ 9.3 V", hi, 9.3, 0.01);
    near("half-wave rectifier: ripple ≈ 0.18 V", hi - lo, 9.3 / 1000 / (50 * 1e-3), 0.15);
  }
}
{
  // square wave: high for the first half of each period
  const sq = { kind: "square", low: 0, high: 5, freq: 1000 };
  check("square wave: high at t = 0", waveAt(sq, 0) === 5);
  check("square wave: low at 0.6 ms", waveAt(sq, 0.6e-3) === 0);
  check("square wave: high again at 1 ms", waveAt(sq, 1e-3) === 5);
  check("step: before and after", waveAt({ kind: "step", from: 0, to: 3, at: 1 }, 0.999) === 0 && waveAt({ kind: "step", from: 0, to: 3, at: 1 }, 1) === 3);
  const bad = simulate([
    { kind: "V", id: "B1", a: "p", b: "gnd", volts: 9 },
    { kind: "S", id: "S1", a: "p", b: "gnd", closed: (t) => t > 1e-3 },
    { kind: "R", id: "R1", a: "p", b: "gnd", ohms: 100 },
  ], { tStop: 2e-3, steps: 100 });
  check("transient: a switch that shorts the source mid-run reports short-circuit and when", !bad.ok && bad.error === "short-circuit" && bad.at > 1e-3, JSON.stringify(bad));
}

/* ───────────── SI format / parse ───────────── */
{
  const fmt = [
    [0.0047, "F", "4.7 mF"],
    [4700, "Ω", "4.7 kΩ"],
    [1e-7, "F", "100 nF"],
    [2.2e-6, "F", "2.2 µF"],
    [0, "V", "0 V"],
    [999.96, "Ω", "1 kΩ"],
    [-0.0025, "A", "−2.5 mA"],
    [1234567, "Ω", "1.23 MΩ"],
    [3.3, "V", "3.3 V"],
    [0.5, "W", "500 mW"],
    [47e-12, "F", "47 pF"],
    [100, "Hz", "100 Hz"],
    [0.000999999, "s", "1 ms"],
  ];
  for (const [v, u, want] of fmt) check(`formatSI(${v}, "${u}") → "${want}"`, formatSI(v, u) === want, `got "${formatSI(v, u)}"`);
  check('formatSI(0.02, "A", { prefix: "m" }) → "20 mA"', formatSI(0.02, "A", { prefix: "m" }) === "20 mA", formatSI(0.02, "A", { prefix: "m" }));
  check('formatSI(NaN) → "—"', formatSI(NaN, "V") === "—");
  const parse = [
    ["4k7", 4700],
    ["4.7k", 4700],
    ["100n", 1e-7],
    ["2.2u", 2.2e-6],
    ["2u2", 2.2e-6],
    ["4R7", 4.7],
    ["1M", 1e6],
    ["1m", 1e-3],
    ["1meg", 1e6],
    ["10 kΩ", 1e4],
    ["10kohm", 1e4],
    ["100nF", 1e-7],
    ["4.7 µF", 4.7e-6],
    ["1F", 1],
    ["5mA", 0.005],
    ["3.3V", 3.3],
    ["−5", -5],
    ["-12", -12],
    ["1e-3", 1e-3],
    ["470", 470],
    ["10Hz", 10],
    ["1kHz", 1000],
  ];
  for (const [s, want] of parse) near(`parseSI("${s}") → ${want}`, parseSI(s), want, 1e-12);
  for (const s of ["", "abc", "4k7k", "1.5k3", "k", "Ω", "4..7"]) check(`parseSI("${s}") → null`, parseSI(s) === null, `got ${parseSI(s)}`);
  // round trips: format then parse lands within the 3-significant-digit rounding
  let worst = 0;
  for (let e = -12; e <= 9; e++) {
    for (const m of [1, 1.5, 2.2, 3.3, 4.7, 6.8, 9.99]) {
      const x = m * 10 ** e;
      for (const s of [formatSI(x, "Ω"), toInputSI(x)]) {
        const back = parseSI(s);
        worst = Math.max(worst, back === null ? Infinity : Math.abs(back - x) / x);
      }
    }
  }
  check("format → parse round trips within 0.5% (3 significant digits)", worst <= 0.005, `worst relative error ${worst}`);
}

/* ───────────── symbol polarity (geometry the symbols draw from) ───────────── */
{
  const dist = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]);
  // "+" / anode / arrow tail must sit at pin a, "−" / cathode / arrow head at pin b, for every rotation
  const polarised = [
    ["battery", "battery"],
    ["battery-1", "battery"],
    ["polar-capacitor", "polar-capacitor"],
    ["dc-source", "dc-source"],
    ["current-source", "current-source"],
    ["diode", "diode"],
    ["led", "led"],
  ];
  for (const [mark, kind] of polarised) {
    for (const rot of [0, 90, 180, 270]) {
      const x = 100;
      const y = 120;
      const { a, b } = pinsOf(kind, x, y, rot);
      const plus = markOf(mark, "plus", x, y, rot);
      const minus = markOf(mark, "minus", x, y, rot);
      check(`symbol ${mark} rot ${rot}: + / anode / arrow tail is nearer pin a`, dist(plus, a) < dist(plus, b), JSON.stringify({ plus, a, b }));
      check(`symbol ${mark} rot ${rot}: − / cathode / arrow head is nearer pin b`, dist(minus, b) < dist(minus, a), JSON.stringify({ minus, a, b }));
    }
  }
  for (const flip of [false, true]) {
    const pins = pinsOf("opamp", 100, 120, 0, { flip });
    const plus = markOf("opamp", "plus", 100, 120, 0, { flip });
    const minus = markOf("opamp", "minus", 100, 120, 0, { flip });
    check(`op-amp${flip ? " flipped" : ""}: "+" sign sits beside the plus pin`, dist(plus, pins.plus) < dist(plus, pins.minus), JSON.stringify({ plus, pins }));
    check(`op-amp${flip ? " flipped" : ""}: "−" sign sits beside the minus pin`, dist(minus, pins.minus) < dist(minus, pins.plus), JSON.stringify({ minus, pins }));
  }
}

console.log(`elec-kit: ${passed} passed, ${failures.length} failed`);
for (const f of failures) console.log(`  FAIL ${f}`);
process.exit(failures.length ? 1 : 0);
