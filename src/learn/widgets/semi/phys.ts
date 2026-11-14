/**
 * Pure models behind the "Semiconductors: physics to fab" widgets (no React, so they also run in Node).
 *
 * Every model here is a toy with its parameters stated: textbook room-temperature silicon numbers, ideal
 * equations, round illustrative costs. The widgets say so on screen. Checked against hand-computed answers by a
 * node script outside the repo.
 */

// ───────────────────────────── constants ─────────────────────────────

/** Boltzmann constant in eV per kelvin. */
export const K_B = 8.617e-5;
/** Elementary charge in coulombs. */
export const Q = 1.602e-19;
/** Permittivity of free space in F/cm. */
export const EPS0 = 8.854e-14;
/** Relative permittivity of silicon. */
export const EPS_SI = 11.7;
/** Silicon atoms per cm³. */
export const SI_ATOMS = 5e22;
/** Intrinsic carrier density of silicon at 300 K, cm⁻³ (the round textbook value; measured about 1 × 10¹⁰). */
export const NI_300 = 1e10;

/** Thermal voltage kT/q in volts. */
export const thermalVoltage = (tempK = 300) => K_B * tempK;

/** Photon energy in eV for a wavelength in nm (E = hc/λ ≈ 1240 / λ). */
export const photonEv = (nm: number) => 1239.84 / nm;

// ───────────────────────────── energy bands ─────────────────────────────

export type MaterialId = "copper" | "ge" | "si" | "gaas" | "diamond" | "glass";

export interface Material {
  id: MaterialId;
  name: string;
  /** Band gap in eV at room temperature (0: the bands overlap, a metal). */
  gap: number;
  kind: "metal" | "semiconductor" | "insulator";
}

/** Room-temperature band gaps (typical textbook values; glass is fused silica, SiO₂, roughly 9 eV). */
export const MATERIALS: Material[] = [
  { id: "copper", name: "Copper", gap: 0, kind: "metal" },
  { id: "ge", name: "Germanium", gap: 0.66, kind: "semiconductor" },
  { id: "si", name: "Silicon", gap: 1.12, kind: "semiconductor" },
  { id: "gaas", name: "Gallium arsenide", gap: 1.42, kind: "semiconductor" },
  { id: "diamond", name: "Diamond", gap: 5.5, kind: "insulator" },
  { id: "glass", name: "Glass (SiO₂)", gap: 9, kind: "insulator" },
];

export const material = (id: MaterialId) => MATERIALS.find((m) => m.id === id) ?? MATERIALS[2];

/**
 * Electrons kicked into the conduction band by heat, per cm³: ni = A · T^1.5 · e^(−Eg / 2kT).
 * A is fixed so silicon gives 1 × 10¹⁰ at 300 K and reused for every material (a toy: real materials have their own
 * prefactor, and the gap itself shrinks a little as the crystal warms). Metals return the electron density of copper.
 */
export function thermalCarriers(gap: number, tempK: number): number {
  if (gap <= 0) return 8.5e22;
  const a = NI_300 / (Math.pow(300, 1.5) * Math.exp(-1.12 / (2 * K_B * 300)));
  return a * Math.pow(tempK, 1.5) * Math.exp(-gap / (2 * K_B * tempK));
}

/** Can a photon of this wavelength lift an electron across the gap? */
export const photonCrosses = (gap: number, nm: number) => gap > 0 && photonEv(nm) >= gap;

// ───────────────────────────── doping ─────────────────────────────

/** Mobility fit (Caughey–Thomas form, typical room-temperature silicon parameters), cm²/(V·s). */
function mobility(total: number, carrier: "e" | "h"): number {
  const p = carrier === "e" ? { min: 68.5, max: 1414, ref: 9.2e16, a: 0.711 } : { min: 44.9, max: 470.5, ref: 2.23e17, a: 0.719 };
  return p.min + (p.max - p.min) / (1 + Math.pow(total / p.ref, p.a));
}

export interface Doped {
  /** Free electrons per cm³. */
  n: number;
  /** Holes per cm³. */
  p: number;
  /** Conductivity, S/cm. */
  sigma: number;
  /** Resistivity, Ω·cm. */
  rho: number;
  /** Silicon atoms per dopant atom (Infinity when undoped). */
  atomsPerDopant: number;
  /** Conductivity divided by pure silicon's. */
  ratio: number;
}

/**
 * Silicon at 300 K with `donors` phosphorus and `acceptors` boron atoms per cm³ (every dopant ionised, n · p = ni²).
 */
export function doped(donors: number, acceptors: number): Doped {
  const net = donors - acceptors;
  const half = net / 2;
  // n = net/2 + sqrt((net/2)² + ni²), written to stay accurate when |net| >> ni
  const root = Math.sqrt(half * half + NI_300 * NI_300);
  let n: number;
  let p: number;
  if (net >= 0) {
    n = half + root;
    p = (NI_300 * NI_300) / n;
  } else {
    p = -half + root;
    n = (NI_300 * NI_300) / p;
  }
  const total = donors + acceptors;
  const sigma = Q * (n * mobility(total, "e") + p * mobility(total, "h"));
  const pure = Q * NI_300 * (mobility(0, "e") + mobility(0, "h"));
  return { n, p, sigma, rho: 1 / sigma, atomsPerDopant: total > 0 ? SI_ATOMS / total : Infinity, ratio: sigma / pure };
}

// ───────────────────────────── PN junction ─────────────────────────────

export const PN = {
  /** Doping on each side, cm⁻³. */
  na: 1e16,
  nd: 1e16,
  /** Diode saturation current, A (a typical small-signal silicon value), ideality 1, 300 K. */
  is: 1e-14,
  tempK: 300,
};

/** Built-in voltage Vbi = (kT/q) · ln(Na·Nd / ni²). */
export const builtIn = (na = PN.na, nd = PN.nd) => thermalVoltage(PN.tempK) * Math.log((na * nd) / (NI_300 * NI_300));

/**
 * Depletion width in µm for a bias V (positive = forward): W = √(2ε(Vbi − V)/q · (1/Na + 1/Nd)).
 * The formula only holds below Vbi; forward bias near Vbi is clamped to a sliver (the depletion approximation breaks).
 */
export function depletionUm(v: number, na = PN.na, nd = PN.nd): number {
  const vbi = builtIn(na, nd);
  const drop = Math.max(vbi - v, 0.02);
  const wCm = Math.sqrt(((2 * EPS_SI * EPS0 * drop) / Q) * (1 / na + 1 / nd));
  return wCm * 1e4;
}

/** Shockley diode current in A: I = Is · (e^(V / Vt) − 1). No series resistance, no breakdown. */
export const diodeCurrent = (v: number, is = PN.is, tempK = PN.tempK) => is * (Math.exp(v / thermalVoltage(tempK)) - 1);

// ───────────────────────────── MOSFET ─────────────────────────────

export type MosType = "nmos" | "pmos";

/** Toy square-law transistors, always in saturation (Vds fixed at the 3.3 V supply). */
export const MOS = {
  vdd: 3.3,
  nmos: { vth: 0.7, k: 2e-3 },
  pmos: { vth: 0.7, k: 1e-3 },
};

/** Drain current magnitude in A for a gate–source voltage magnitude |Vgs|: ½ · k · (|Vgs| − |Vth|)², 0 below threshold. */
export function drainCurrent(type: MosType, vgsMag: number): number {
  const { vth, k } = MOS[type];
  const ov = vgsMag - vth;
  return ov > 0 ? 0.5 * k * ov * ov : 0;
}

/** What the region under the gate is doing at this |Vgs|. */
export function channelState(type: MosType, vgsMag: number): "accumulation" | "depletion" | "inversion" {
  const { vth } = MOS[type];
  if (vgsMag < 0.15) return "accumulation";
  return vgsMag < vth ? "depletion" : "inversion";
}

// ───────────────────────────── scaling ─────────────────────────────

/** Approximate published transistor counts (rounded). Multi-die products are left out. */
export const CHIPS: { year: number; name: string; count: number }[] = [
  { year: 1971, name: "Intel 4004", count: 2300 },
  { year: 1978, name: "Intel 8086", count: 29000 },
  { year: 1985, name: "Intel 80386", count: 275000 },
  { year: 1993, name: "Intel Pentium", count: 3.1e6 },
  { year: 2000, name: "Intel Pentium 4", count: 4.2e7 },
  { year: 2006, name: "Intel Core 2 Duo", count: 2.91e8 },
  { year: 2012, name: "Nvidia GK110 GPU", count: 7.1e9 },
  { year: 2020, name: "Apple M1", count: 1.6e10 },
  { year: 2022, name: "Nvidia H100 GPU", count: 8e10 },
];

/** Transistors predicted for `year` if the 1971 count doubles every `period` years. */
export const mooreCount = (year: number, period: number) => CHIPS[0].count * Math.pow(2, (year - CHIPS[0].year) / period);

/** Root-mean-square miss, in factors of ten, between the prediction and the chips (0.3 ≈ off by 2× on average). */
export function mooreError(period: number): number {
  const sq = CHIPS.slice(1).map((c) => (Math.log10(mooreCount(c.year, period)) - Math.log10(c.count)) ** 2);
  return Math.sqrt(sq.reduce((a, b) => a + b, 0) / sq.length);
}

/** Linear shrink per generation: √2, so each generation fits twice the transistors in the same area. */
export const SHRINK = Math.SQRT2;
/** Illustrative starting power density (W/cm²) and the cooling limit used by the toy (order of magnitude). */
export const PD_START = 10;
export const PD_LIMIT = 100;

/**
 * Power density after `gens` generations: density × k², capacitance ÷ k, voltage² ÷ k² (if voltage scales),
 * frequency × k (if the clock speeds up). Dynamic power only (P = C · V² · f per transistor).
 */
export function powerDensity(gens: number, voltageScales: boolean, clockScales: boolean): number {
  const k = SHRINK;
  const per = (k * k) / k / (voltageScales ? k * k : 1) * (clockScales ? k : 1);
  return PD_START * Math.pow(per, gens);
}

/** Supply and threshold toy (alpha-power law): reference point Vdd 1.0 V, Vth 0.45 V. */
export const LEAK = { vdd0: 1.0, vth0: 0.45, alpha: 1.3, swingMv: 90 };

/** Switching speed relative to the reference: ∝ (Vdd − Vth)^α / Vdd. */
export function relSpeed(vdd: number, vth: number): number {
  const f = (v: number, t: number) => (v > t ? Math.pow(v - t, LEAK.alpha) / v : 0);
  return f(vdd, vth) / f(LEAK.vdd0, LEAK.vth0);
}
/** Off-state leakage relative to the reference: ×10 for every 90 mV the threshold drops. */
export const relLeak = (vth: number) => Math.pow(10, ((LEAK.vth0 - vth) * 1000) / LEAK.swingMv);
/** Switching energy relative to the reference: ∝ Vdd². */
export const relEnergy = (vdd: number) => (vdd / LEAK.vdd0) ** 2;

// ───────────────────────────── cleanroom ─────────────────────────────

/** ISO 14644-1 class limit: particles ≥ d µm per m³ = 10^N · (0.1 / d)^2.08. */
export const isoLimit = (cls: number, d: number) => Math.pow(10, cls) * Math.pow(0.1 / d, 2.08);

// ───────────────────────────── lithography ─────────────────────────────

export type SourceId = "iline" | "krf" | "arf" | "arfi" | "euv" | "euvh";

/** Example exposure systems: wavelength in nm and a typical numerical aperture for that class of tool. */
export const SOURCES: { id: SourceId; name: string; short: string; nm: number; na: number }[] = [
  { id: "iline", name: "Mercury i-line, 365 nm", short: "i-line", nm: 365, na: 0.65 },
  { id: "krf", name: "KrF laser, 248 nm (DUV)", short: "KrF", nm: 248, na: 0.8 },
  { id: "arf", name: "ArF laser, 193 nm, dry (DUV)", short: "ArF dry", nm: 193, na: 0.93 },
  { id: "arfi", name: "ArF laser, 193 nm, water immersion (DUV)", short: "ArF immersion", nm: 193, na: 1.35 },
  { id: "euv", name: "EUV, 13.5 nm, NA 0.33", short: "EUV", nm: 13.5, na: 0.33 },
  { id: "euvh", name: "High-NA EUV, 13.5 nm, NA 0.55", short: "High-NA EUV", nm: 13.5, na: 0.55 },
];
export const source = (id: SourceId) => SOURCES.find((s) => s.id === id) ?? SOURCES[3];

/** Rayleigh resolution: smallest half-pitch CD = k1 · λ / NA (nm). */
export const rayleighCd = (k1: number, nm: number, na: number) => (k1 * nm) / na;
/** Depth of focus ≈ k2 · λ / NA² with k2 = 1 (nm). */
export const depthOfFocus = (nm: number, na: number, k2 = 1) => (k2 * nm) / (na * na);

// ───────────────────────────── yield and cost ─────────────────────────────

/** Poisson yield Y = e^(−A · D0), A in cm², D0 in defects per cm². */
export const poissonYield = (areaCm2: number, d0: number) => Math.exp(-areaCm2 * d0);

/** Dies per wafer, the common approximation DPW ≈ π·(d/2)² / A − π·d / √(2A) (d in mm, A in mm²), rounded down. */
export function diesPerWaferFormula(diameterMm: number, dieAreaMm2: number): number {
  const v = (Math.PI * (diameterMm / 2) ** 2) / dieAreaMm2 - (Math.PI * diameterMm) / Math.sqrt(2 * dieAreaMm2);
  return Math.max(0, Math.floor(v));
}

export interface DieGrid {
  /** Die rectangles (lower-left corner, mm, wafer centre at 0,0) that fit wholly inside the usable circle. */
  dies: { x: number; y: number }[];
  side: number;
}

/**
 * Lay a grid of square dies (side `side` mm) on a wafer, keeping those wholly inside diameter − 2 · edge.
 * Tries a grid with a die corner on the centre and one with a die centre on the centre, and keeps the better.
 */
export function dieGrid(diameterMm: number, side: number, edgeMm = 3): DieGrid {
  const r = diameterMm / 2 - edgeMm;
  let best: { x: number; y: number }[] = [];
  for (const off of [0, side / 2]) {
    const out: { x: number; y: number }[] = [];
    const n = Math.ceil(r / side) + 1;
    for (let i = -n; i <= n; i++) {
      for (let j = -n; j <= n; j++) {
        const x = i * side - off;
        const y = j * side - off;
        const far = Math.max(Math.hypot(x, y), Math.hypot(x + side, y), Math.hypot(x, y + side), Math.hypot(x + side, y + side));
        if (far <= r) out.push({ x, y });
      }
    }
    if (out.length > best.length) best = out;
  }
  return { dies: best, side };
}

/** Small deterministic PRNG (mulberry32), so a wafer's defects are the same on the server and in the browser. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Defects scattered uniformly over the whole wafer: round(D0 × wafer area) points (mm). */
export function defects(diameterMm: number, d0: number, seed: number): { x: number; y: number }[] {
  const r = diameterMm / 2;
  const areaCm2 = (Math.PI * r * r) / 100;
  const count = Math.round(d0 * areaCm2);
  const rand = rng(seed);
  const out: { x: number; y: number }[] = [];
  for (let i = 0; i < count; i++) {
    const rr = r * Math.sqrt(rand());
    const th = 2 * Math.PI * rand();
    out.push({ x: Math.round(rr * Math.cos(th) * 100) / 100, y: Math.round(rr * Math.sin(th) * 100) / 100 });
  }
  return out;
}

/** Cost of one working die: wafer cost / (dies per wafer × yield). */
export const costPerGoodDie = (waferCost: number, dpw: number, y: number) => (dpw > 0 && y > 0 ? waferCost / (dpw * y) : Infinity);

/** One product's silicon split into n chiplets, each (area / n) × (1 + overhead) for the die-to-die links. */
export function chipletCost(totalAreaMm2: number, n: number, d0: number, waferCost: number, diameterMm = 300, overhead = 0.1) {
  const each = n === 1 ? totalAreaMm2 : (totalAreaMm2 / n) * (1 + overhead);
  const dpw = diesPerWaferFormula(diameterMm, each);
  const y = poissonYield(each / 100, d0);
  const per = costPerGoodDie(waferCost, dpw, y);
  return { each, dpw, y, perDie: per, perProduct: per * n };
}

// ───────────────────────────── packaging ─────────────────────────────

export type PackId = "wire" | "flip" | "interposer" | "stack";

/** Typical connection pitches (µm) for each style; area arrays cover the face, wire bonds only the edge. */
export const PACKS: { id: PackId; name: string; pitchUm: number; layout: "edge" | "area"; pitchNote: string }[] = [
  { id: "wire", name: "Wire bond", pitchUm: 60, layout: "edge", pitchNote: "pads round the edge, ~40–100 µm apart" },
  { id: "flip", name: "Flip chip", pitchUm: 150, layout: "area", pitchNote: "solder bumps over the whole face, ~100–200 µm apart" },
  { id: "interposer", name: "2.5D interposer", pitchUm: 45, layout: "area", pitchNote: "microbumps onto a silicon interposer, ~40–55 µm apart" },
  { id: "stack", name: "3D stack", pitchUm: 9, layout: "area", pitchNote: "hybrid bonding, copper to copper, under ~10 µm apart" },
];
export const pack = (id: PackId) => PACKS.find((p) => p.id === id) ?? PACKS[0];

/** Most connections a square die of `sideMm` can have: 4 · side / pitch for edge pads, (side / pitch)² for an area array. */
export function maxConnections(id: PackId, sideMm: number): number {
  const p = pack(id);
  const per = (sideMm * 1000) / p.pitchUm;
  return p.layout === "edge" ? Math.floor(4 * per) : Math.floor(per) ** 2;
}

// ───────────────────────────── test flow ─────────────────────────────

/** Toy lot: illustrative yields and costs (USD). */
export const TEST = {
  dies: 1000,
  waferYield: 0.7,
  packageLoss: 0.01,
  weakShare: 0.02,
  dieCost: 10,
  sortCost: 0.2,
  packageCost: 4,
  finalCost: 0.5,
  burnInCost: 2,
  returnCost: 50,
};

export interface TestRun {
  packaged: number;
  wastedPackages: number;
  finalRejects: number;
  burnInRejects: number;
  shipped: number;
  fieldFails: number;
  totalCost: number;
  /** Total cost (including handling the field returns) per part that keeps working for the customer. */
  costPerGood: number;
}

/** Push one lot through the flow. In the toy, every hard fail is caught by the first test that sees it. */
export function runTest(sort: boolean, burnIn: boolean): TestRun {
  const t = TEST;
  const good = Math.round(t.dies * t.waferYield);
  const bad = t.dies - good;
  const packaged = sort ? good : t.dies;
  const damaged = Math.round(good * t.packageLoss);
  const passFinal = good - damaged;
  const weak = Math.round(passFinal * t.weakShare);
  const burnInRejects = burnIn ? weak : 0;
  const shipped = passFinal - burnInRejects;
  const fieldFails = burnIn ? 0 : weak;
  const totalCost =
    t.dies * t.dieCost +
    (sort ? t.dies * t.sortCost : 0) +
    packaged * (t.packageCost + t.finalCost) +
    (burnIn ? passFinal * t.burnInCost : 0) +
    fieldFails * t.returnCost;
  return {
    packaged,
    wastedPackages: sort ? 0 : bad,
    finalRejects: (sort ? 0 : bad) + damaged,
    burnInRejects,
    shipped,
    fieldFails,
    totalCost,
    costPerGood: totalCost / (shipped - fieldFails),
  };
}

/** Speed bins of the shipped parts (illustrative shares). */
export const BINS = [
  { name: "Fast bin", share: 0.2 },
  { name: "Standard bin", share: 0.5 },
  { name: "Value bin", share: 0.3 },
];
