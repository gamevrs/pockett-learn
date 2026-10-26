/**
 * Season Analytics: the hidden season database.
 *
 * `buildSeason()` simulates ten Grands Prix with a seeded random generator, so every learner (and
 * every check) sees exactly the same rows. Nothing here uses transcendental maths: only +, -, *, /
 * and Math.round/min/max/sqrt, which are bit-for-bit identical in Node and every browser.
 *
 * The data is built to be worth asking questions about: a three-way title fight with several lead
 * changes, a reserve driver filling in for two rounds, a DNS and a disqualification, qualifying
 * rows with NULLs and a legacy 0, messy steward reports, one- two- and three-stop strategies, a
 * summer break in the calendar and two drivers level on points at the end (count-back decides).
 */

export type Compound = "SOFT" | "MEDIUM" | "HARD" | "INTER";

export interface Rng {
  next(): number;
  /** Roughly normal, mean 0, sd 1, clipped to +-2.6. */
  gauss(): number;
  int(lo: number, hi: number): number;
  pick<T>(items: readonly T[]): T;
}

export function makeRng(seed: number): Rng {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const gauss = () => {
    const g = (next() + next() + next() + next() - 2) * 1.7320508;
    return Math.max(-2.6, Math.min(2.6, g));
  };
  return { next, gauss, int: (lo, hi) => lo + Math.floor(next() * (hi - lo + 1)), pick: (items) => items[Math.floor(next() * items.length)] };
}

const q = (s: string) => `'${s.replace(/'/g, "''")}'`;
const lit = (v: string | number | null) => (v === null ? "NULL" : typeof v === "number" ? String(v) : q(v));

// ───────────────────────── static data ─────────────────────────

const TEAMS: [number, string, string, number][] = [
  [1, "Halcyon Racing", "United Kingdom", 1998],
  [2, "Vanta Motorsport", "Italy", 1987],
  [3, "Kestrel GP", "Germany", 2009],
  [4, "Orbital Dynamics", "Japan", 2014],
  [5, "Nordlys Racing", "Norway", 2019],
  [6, "Sable Works", "France", 1979],
];

interface DriverDef {
  id: number;
  number: number;
  code: string;
  name: string;
  country: string;
  team: number;
  born: string;
  /** Pace offset in ms per lap (lower is quicker). */
  offset: number;
}

const DRIVERS: DriverDef[] = [
  { id: 1, number: 4, code: "NOV", name: "Lena Novak", country: "Czechia", team: 1, born: "1996-04-12", offset: 0 },
  { id: 2, number: 16, code: "ADE", name: "Tomi Adeyemi", country: "Nigeria", team: 1, born: "2001-09-03", offset: 330 },
  { id: 3, number: 7, code: "MAR", name: "Inés Marín", country: "Spain", team: 2, born: "1998-01-27", offset: 40 },
  { id: 4, number: 22, code: "BEL", name: "Luca Bellini", country: "Italy", team: 2, born: "2003-11-19", offset: 380 },
  { id: 5, number: 11, code: "HAR", name: "Kai Hartmann", country: "Germany", team: 3, born: "1997-06-30", offset: -20 },
  { id: 6, number: 31, code: "LIN", name: "Mei Lin", country: "China", team: 3, born: "2004-02-08", offset: 520 },
  { id: 7, number: 3, code: "MOR", name: "Haru Mori", country: "Japan", team: 4, born: "1995-08-21", offset: 10 },
  { id: 8, number: 44, code: "PAL", name: "Diego Palma", country: "Argentina", team: 4, born: "2000-12-05", offset: 360 },
  { id: 9, number: 9, code: "SOL", name: "Freya Solberg", country: "Norway", team: 5, born: "2002-03-16", offset: 20 },
  { id: 10, number: 27, code: "KOV", name: "Anya Kovač", country: "Croatia", team: 5, born: "1999-10-02", offset: 610 },
  { id: 11, number: 18, code: "DUB", name: "Théo Dubois", country: "France", team: 6, born: "1994-07-14", offset: 0 },
  { id: 12, number: 63, code: "WAL", name: "Sam Walsh", country: "Australia", team: 6, born: "1993-05-09", offset: 360 },
  { id: 13, number: 77, code: "IYE", name: "Ravi Iyer", country: "India", team: 6, born: "2005-01-22", offset: 640 },
];

/** Team pace (ms per lap), how much it develops per round, reliability and pit-crew speed. */
const TEAM_PACE: Record<number, { base: number; dev: number; dnf: number; crew: number }> = {
  1: { base: 0, dev: -9, dnf: 0.05, crew: 2330 },
  2: { base: 150, dev: -4, dnf: 0.08, crew: 2450 },
  3: { base: 30, dev: 11, dnf: 0.06, crew: 2390 },
  4: { base: 220, dev: 0, dnf: 0.07, crew: 2520 },
  5: { base: 400, dev: -30, dnf: 0.1, crew: 2650 },
  6: { base: 760, dev: -13, dnf: 0.12, crew: 2860 },
};

interface CircuitDef {
  id: number;
  name: string;
  country: string;
  km: number;
  laps: number;
  /** How hard the circuit is on tyres (1 = normal). */
  deg: number;
  /** ms lost per grid slot, a proxy for how hard overtaking is. */
  trainOfCars: number;
}

const CIRCUITS: CircuitDef[] = [
  { id: 1, name: "Costa Dorada Circuit", country: "Spain", km: 5.1, laps: 44, deg: 1.15, trainOfCars: 110 },
  { id: 2, name: "Fjordring", country: "Norway", km: 4.4, laps: 50, deg: 0.85, trainOfCars: 140 },
  { id: 3, name: "Nippon Bay Raceway", country: "Japan", km: 5.3, laps: 42, deg: 0.7, trainOfCars: 120 },
  { id: 4, name: "Marrow Bay Circuit", country: "United Kingdom", km: 4.9, laps: 50, deg: 1.0, trainOfCars: 100 },
  { id: 5, name: "Monte Verde Street Circuit", country: "Italy", km: 3.3, laps: 56, deg: 0.6, trainOfCars: 330 },
  { id: 6, name: "Rheinschleife", country: "Germany", km: 5.8, laps: 40, deg: 1.3, trainOfCars: 90 },
  { id: 7, name: "Lakeside Park", country: "Canada", km: 4.4, laps: 48, deg: 0.95, trainOfCars: 150 },
  { id: 8, name: "Sierra Alta Autodrome", country: "Argentina", km: 4.6, laps: 46, deg: 1.25, trainOfCars: 110 },
  { id: 9, name: "Outback Night Circuit", country: "Australia", km: 5.0, laps: 44, deg: 0.9, trainOfCars: 190 },
  { id: 10, name: "Sable Coast Circuit", country: "France", km: 5.4, laps: 40, deg: 0.8, trainOfCars: 130 },
];

interface RaceDef {
  round: number;
  circuit: number;
  name: string;
  date: string;
  weather: "Dry" | "Wet";
}

const RACES: RaceDef[] = [
  { round: 1, circuit: 1, name: "Costa Dorada Grand Prix", date: "2026-03-08", weather: "Dry" },
  { round: 2, circuit: 2, name: "Fjordring Grand Prix", date: "2026-03-22", weather: "Dry" },
  { round: 3, circuit: 3, name: "Nippon Bay Grand Prix", date: "2026-04-12", weather: "Wet" },
  { round: 4, circuit: 4, name: "Marrow Bay Grand Prix", date: "2026-05-03", weather: "Dry" },
  { round: 5, circuit: 5, name: "Monte Verde Grand Prix", date: "2026-05-24", weather: "Dry" },
  { round: 6, circuit: 6, name: "Rheinschleife Grand Prix", date: "2026-06-14", weather: "Wet" },
  { round: 7, circuit: 7, name: "Lakeside Grand Prix", date: "2026-07-05", weather: "Dry" },
  { round: 8, circuit: 8, name: "Sierra Alta Grand Prix", date: "2026-08-30", weather: "Dry" },
  { round: 9, circuit: 9, name: "Outback Night Grand Prix", date: "2026-09-19", weather: "Dry" },
  { round: 10, circuit: 10, name: "Sable Coast Grand Prix", date: "2026-10-11", weather: "Wet" },
];

const POINTS = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];

const OFFSET: Record<Compound, number> = { SOFT: -650, MEDIUM: 0, HARD: 420, INTER: 0 };
const WEAR: Record<Compound, number> = { SOFT: 78, MEDIUM: 42, HARD: 24, INTER: 30 };

const DNF_STATUS = ["Engine", "Gearbox", "Hydraulics", "Brakes", "Collision", "Spun off", "Suspension"];

/** Steward report wording as it was typed at the track: capitalisation and spacing all over the place. */
const REASONS: Record<string, string[]> = {
  limits: ["Track limits - T4", "track limits - t9 ", "TRACK LIMITS - T4", "Track limits - T12", " Track Limits - T1", "track limits - t4"],
  release: ["Unsafe release", " unsafe release", "UNSAFE RELEASE", "Unsafe release "],
  collision: ["Causing a collision", "causing a collision (T1)", "Causing a collision - T3", "CAUSING A COLLISION"],
  pitlane: ["Speeding in pit lane", "speeding in pit lane ", "Pit lane speeding"],
};

// ───────────────────────── simulation ─────────────────────────

export interface Knobs {
  seed: number;
  /** Optional hand-placed events, applied after the dice are rolled. */
  forceDnf?: { round: number; driver: number; lapFrac: number; status: string }[];
  /** Entered and qualified, but never left the garage. */
  dns?: { round: number; driver: number }[];
  /** Classified on track, thrown out afterwards. */
  dsq?: { round: number; driver: number }[];
  /** Crashed in Q1 before setting a time; the legacy feed wrote 0 instead of NULL. */
  noTime?: { round: number; driver: number }[];
}

interface Entrant {
  driver: DriverDef;
  pace: number;
  q1: number;
  q2: number | null;
  q3: number | null;
  grid: number;
}

interface LapRow {
  race: number;
  driver: number;
  lap: number;
  ms: number;
  compound: Compound;
  age: number;
  pit: 0 | 1;
}

interface StopRow {
  race: number;
  driver: number;
  no: number;
  lap: number;
  ms: number;
  fit: Compound;
}

interface ResultRow {
  race: number;
  driver: number;
  grid: number;
  pos: number | null;
  status: string;
  lapsDone: number;
  points: number;
  fl: 0 | 1;
}

interface PenaltyRow {
  race: number;
  driver: number;
  seconds: number | null;
  reason: string;
  at: string;
}

interface QualiRow {
  race: number;
  driver: number;
  q1: number | null;
  q2: number | null;
  q3: number | null;
}

export interface Season {
  laps: LapRow[];
  stops: StopRow[];
  results: ResultRow[];
  penalties: PenaltyRow[];
  quali: QualiRow[];
}

const pad = (n: number) => String(n).padStart(2, "0");

function strategyFor(rnd: Rng, laps: number, wet: boolean): { compounds: Compound[]; stopLaps: number[] } {
  const roll = rnd.next();
  if (wet) {
    const stops = roll < 0.45 ? 1 : roll < 0.85 ? 2 : 3;
    const compounds: Compound[] = Array.from({ length: stops + 1 }, () => "INTER");
    const stopLaps = Array.from({ length: stops }, (_, i) => Math.round(((i + 1) / (stops + 1)) * laps + rnd.int(-3, 3)));
    return { compounds, stopLaps };
  }
  if (roll < 0.52) {
    const compounds = rnd.pick<Compound[]>([["MEDIUM", "HARD"], ["MEDIUM", "HARD"], ["SOFT", "HARD"], ["HARD", "MEDIUM"]]);
    return { compounds, stopLaps: [Math.round(laps * (0.4 + rnd.next() * 0.2))] };
  }
  if (roll < 0.93) {
    const compounds = rnd.pick<Compound[]>([["SOFT", "MEDIUM", "MEDIUM"], ["MEDIUM", "HARD", "SOFT"], ["SOFT", "HARD", "MEDIUM"], ["SOFT", "MEDIUM", "SOFT"]]);
    const a = Math.round(laps * (0.26 + rnd.next() * 0.08));
    return { compounds, stopLaps: [a, a + Math.round(laps * (0.3 + rnd.next() * 0.1))] };
  }
  const compounds: Compound[] = ["SOFT", "SOFT", "MEDIUM", "SOFT"];
  const a = Math.round(laps * 0.2);
  return { compounds, stopLaps: [a, a + Math.round(laps * 0.25), a + Math.round(laps * 0.5)] };
}

export function simulate(knobs: Knobs): Season {
  const rnd = makeRng(knobs.seed);
  const season: Season = { laps: [], stops: [], results: [], penalties: [], quali: [] };
  // each team has circuits it loves and circuits it hates
  const aptitude: Record<number, number[]> = {};
  for (const t of TEAMS) aptitude[t[0]] = CIRCUITS.map(() => Math.round(rnd.gauss() * 110));
  const wetSkill: Record<number, number> = {};
  for (const d of DRIVERS) wetSkill[d.id] = Math.round(rnd.gauss() * 260);

  for (const race of RACES) {
    const circuit = CIRCUITS[race.circuit - 1];
    const wet = race.weather === "Wet";
    const baseMs = Math.round(circuit.km * 18800 * (wet ? 1.1 : 1));

    // who is on the grid: Walsh is injured for rounds 5 and 6 and the reserve steps in
    const lineup = DRIVERS.filter((d) => d.id !== 13 && !(d.id === 12 && (race.round === 5 || race.round === 6))).concat(
      race.round === 5 || race.round === 6 ? [DRIVERS[12]] : [],
    );

    const entrants: Entrant[] = lineup.map((d) => {
      const tp = TEAM_PACE[d.team];
      const form = rnd.gauss() * 120;
      const pace = Math.round(tp.base + tp.dev * (race.round - 1) + d.offset + aptitude[d.team][circuit.id - 1] + form + (wet ? wetSkill[d.id] : 0));
      return { driver: d, pace, q1: 0, q2: null, q3: null, grid: 0 };
    });

    // ── qualifying: 12 cars, 9 go through to Q2, 6 to Q3 ──
    const qBase = baseMs - 2100;
    const qNoise = () => rnd.gauss() * 230;
    entrants.forEach((e) => {
      e.q1 = Math.round(qBase + e.pace + qNoise());
      if (knobs.noTime?.some((n) => n.round === race.round && n.driver === e.driver.id)) e.q1 = 0;
    });
    const q1Key = (e: Entrant) => (e.q1 === 0 ? Infinity : e.q1);
    const byQ1 = [...entrants].sort((a, b) => q1Key(a) - q1Key(b));
    const q2Cars = byQ1.slice(0, 9);
    q2Cars.forEach((e) => (e.q2 = Math.round(qBase + e.pace - 260 + qNoise())));
    const byQ2 = [...q2Cars].sort((a, b) => a.q2! - b.q2!);
    const q3Cars = byQ2.slice(0, 6);
    q3Cars.forEach((e) => (e.q3 = Math.round(qBase + e.pace - 430 + qNoise())));
    const byQ3 = [...q3Cars].sort((a, b) => a.q3! - b.q3!);
    const order = [...byQ3, ...byQ2.slice(6), ...byQ1.slice(9)];
    order.forEach((e, i) => (e.grid = i + 1));

    // ── race ──
    const stints: { e: Entrant; total: number; laps: LapRow[]; stops: StopRow[]; status: string; lapsDone: number; penalty: number; reasonKinds: string[] }[] = [];
    for (const e of entrants) {
      const d = e.driver;
      const tp = TEAM_PACE[d.team];
      const strat = strategyFor(rnd, circuit.laps, wet);
      let dnfLap = 0;
      let status = "Finished";
      if (rnd.next() < tp.dnf + (wet ? 0.03 : 0)) {
        dnfLap = rnd.int(4, circuit.laps - 3);
        status = rnd.pick(DNF_STATUS);
      }
      const forced = knobs.forceDnf?.find((f) => f.round === race.round && f.driver === d.id);
      if (forced) {
        dnfLap = Math.max(2, Math.round(circuit.laps * forced.lapFrac));
        status = forced.status;
      }
      if (knobs.dns?.some((n) => n.round === race.round && n.driver === d.id)) {
        dnfLap = 1;
        status = "DNS";
      }
      const rows: LapRow[] = [];
      const stops: StopRow[] = [];
      let total = Math.round((e.grid - 1) * circuit.trainOfCars);
      let stint = 0;
      let age = 0;
      const lastLap = dnfLap ? dnfLap - 1 : circuit.laps;
      for (let lap = 1; lap <= lastLap; lap++) {
        age += 1;
        const lapAge = age;
        const compound = strat.compounds[stint];
        let pit: 0 | 1 = 0;
        const wear = WEAR[compound] * circuit.deg * (wet ? 0.8 : 1);
        let ms =
          baseMs + e.pace + (circuit.laps - lap) * 38 + OFFSET[compound] + Math.round(wear * age) + Math.round(rnd.gauss() * 240);
        if (lap === 1) ms += 4300;
        if (age === 1 && lap > 1) ms += 900; // cold tyres on the out-lap
        if (rnd.next() < 0.004) ms += rnd.int(1800, 6500); // a snap of oversteer, a lock-up, traffic
        const stopAfter = strat.stopLaps[stint];
        if (stopAfter === lap && stint < strat.compounds.length - 1) {
          pit = 1;
          const slow = rnd.next() < 0.07;
          const stationary = Math.round(tp.crew + rnd.gauss() * 150 + (slow ? rnd.int(1200, 3200) : 0));
          ms += 20400 + (stationary - 2400);
          stops.push({ race: race.round, driver: d.id, no: stint + 1, lap, ms: stationary, fit: strat.compounds[stint + 1] });
          stint += 1;
          age = 0;
        }
        rows.push({ race: race.round, driver: d.id, lap, ms, compound, age: lapAge, pit });
        total += ms;
      }
      stints.push({ e, total, laps: rows, stops, status, lapsDone: lastLap, penalty: 0, reasonKinds: [] });
    }

    // penalties: a couple per race, mostly 5 seconds
    const nPen = rnd.int(0, 2);
    for (let i = 0; i < nPen; i++) {
      const s = stints[rnd.int(0, stints.length - 1)];
      if (s.status !== "Finished") continue;
      const kind = rnd.pick(["limits", "limits", "release", "collision", "pitlane"]);
      const reason = rnd.pick(REASONS[kind]);
      const seconds = kind === "collision" ? 10 : kind === "pitlane" && rnd.next() < 0.5 ? null : 5;
      s.penalty += seconds ?? 0;
      s.reasonKinds.push(kind);
      season.penalties.push({
        race: race.round,
        driver: s.e.driver.id,
        seconds,
        reason,
        at: `${race.date} ${pad(rnd.int(14, 16))}:${pad(rnd.int(0, 59))}:${pad(rnd.int(0, 59))}`,
      });
    }

    for (const s of stints) if (knobs.dsq?.some((n) => n.round === race.round && n.driver === s.e.driver.id)) s.status = "Disqualified";

    // classification: finishers by race time (plus penalties), then retirements by distance
    for (const s of stints) s.total += s.penalty * 1000;
    const finishers = stints.filter((s) => s.status === "Finished").sort((a, b) => a.total - b.total);
    const retirees = stints.filter((s) => s.status !== "Finished").sort((a, b) => b.lapsDone - a.lapsDone);

    // fastest lap of the race (clean laps only)
    let fl = { driver: 0, ms: Infinity };
    for (const s of stints) for (const l of s.laps) if (!l.pit && l.lap > 1 && l.ms < fl.ms) fl = { driver: s.e.driver.id, ms: l.ms };

    finishers.forEach((s, i) => {
      const pos = i + 1;
      const bonus = s.e.driver.id === fl.driver && pos <= 10 ? 1 : 0;
      season.results.push({
        race: race.round,
        driver: s.e.driver.id,
        grid: s.e.grid,
        pos,
        status: "Finished",
        lapsDone: s.lapsDone,
        points: (POINTS[i] ?? 0) + bonus,
        fl: s.e.driver.id === fl.driver ? 1 : 0,
      });
    });
    for (const s of retirees) {
      season.results.push({
        race: race.round,
        driver: s.e.driver.id,
        grid: s.e.grid,
        pos: null,
        status: s.status,
        lapsDone: s.lapsDone,
        points: 0,
        fl: s.e.driver.id === fl.driver ? 1 : 0,
      });
    }
    for (const s of stints) {
      season.laps.push(...s.laps);
      season.stops.push(...s.stops);
      const e = s.e;
      season.quali.push({ race: race.round, driver: e.driver.id, q1: e.q1, q2: e.q2, q3: e.q3 });
    }
  }
  return season;
}

// ───────────────────────── hand edits & SQL ─────────────────────────

/** The seed (and hand-placed beats) that produce the story described at the top of this file. */
export const SEASON_SEED = 213;

export const STORY: Omit<Knobs, "seed"> = {
  // Anya Kovač never leaves the garage at Lakeside
  dns: [{ round: 7, driver: 10 }],
  // Hartmann is thrown out of the Rheinschleife results after a technical check
  dsq: [{ round: 6, driver: 5 }],
  // three cars crash in Q1 before setting a time; the old timing feed stored 0 for "no time"
  noTime: [
    { round: 2, driver: 6 },
    { round: 5, driver: 4 },
    { round: 8, driver: 12 },
  ],
};

export function buildSeason(): Season {
  return simulate({ seed: SEASON_SEED, ...STORY });
}

export function buildSetup(): string {
  return renderSetup(buildSeason());
}

function chunks<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

export function renderSetup(season: Season): string {
  const insert = (table: string, cols: string, rows: (string | number | null)[][]) =>
    chunks(rows, 400)
      .map((c) => `INSERT INTO ${table} (${cols}) VALUES\n${c.map((r) => `(${r.map(lit).join(", ")})`).join(",\n")};`)
      .join("\n\n");

  const parts: string[] = [
    `CREATE TABLE teams (
  team_id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  country TEXT NOT NULL,
  founded INTEGER
);`,
    `CREATE TABLE drivers (
  driver_id INTEGER PRIMARY KEY,
  number INTEGER NOT NULL,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  country TEXT NOT NULL,
  team_id INTEGER NOT NULL REFERENCES teams(team_id),
  birth_date TEXT NOT NULL
);`,
    `CREATE TABLE circuits (
  circuit_id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  country TEXT NOT NULL,
  length_km REAL NOT NULL
);`,
    `CREATE TABLE races (
  race_id INTEGER PRIMARY KEY,
  round INTEGER NOT NULL UNIQUE,
  circuit_id INTEGER NOT NULL REFERENCES circuits(circuit_id),
  name TEXT NOT NULL,
  race_date TEXT NOT NULL,
  laps INTEGER NOT NULL,
  weather TEXT NOT NULL
);`,
    `CREATE TABLE points_rules (
  position INTEGER PRIMARY KEY,
  points INTEGER NOT NULL
);`,
    `CREATE TABLE results (
  result_id INTEGER PRIMARY KEY,
  race_id INTEGER NOT NULL REFERENCES races(race_id),
  driver_id INTEGER NOT NULL REFERENCES drivers(driver_id),
  grid INTEGER NOT NULL,
  finish_pos INTEGER,
  status TEXT NOT NULL,
  laps_done INTEGER NOT NULL,
  points INTEGER NOT NULL DEFAULT 0,
  fastest_lap INTEGER NOT NULL DEFAULT 0,
  UNIQUE (race_id, driver_id)
);`,
    `CREATE TABLE qualifying (
  race_id INTEGER NOT NULL REFERENCES races(race_id),
  driver_id INTEGER NOT NULL REFERENCES drivers(driver_id),
  q1_ms INTEGER,
  q2_ms INTEGER,
  q3_ms INTEGER,
  PRIMARY KEY (race_id, driver_id)
);`,
    `CREATE TABLE laps (
  lap_id INTEGER PRIMARY KEY,
  race_id INTEGER NOT NULL REFERENCES races(race_id),
  driver_id INTEGER NOT NULL REFERENCES drivers(driver_id),
  lap INTEGER NOT NULL,
  lap_ms INTEGER NOT NULL,
  compound TEXT NOT NULL,
  tyre_age INTEGER NOT NULL,
  pit_lap INTEGER NOT NULL DEFAULT 0
);`,
    `CREATE TABLE pit_stops (
  stop_id INTEGER PRIMARY KEY,
  race_id INTEGER NOT NULL REFERENCES races(race_id),
  driver_id INTEGER NOT NULL REFERENCES drivers(driver_id),
  stop_no INTEGER NOT NULL,
  lap INTEGER NOT NULL,
  duration_ms INTEGER NOT NULL,
  new_compound TEXT NOT NULL
);`,
    `CREATE TABLE penalties (
  penalty_id INTEGER PRIMARY KEY,
  race_id INTEGER NOT NULL REFERENCES races(race_id),
  driver_id INTEGER NOT NULL REFERENCES drivers(driver_id),
  seconds INTEGER,
  reason TEXT NOT NULL,
  issued_at TEXT NOT NULL
);`,
    insert("teams", "team_id, name, country, founded", TEAMS),
    insert("drivers", "driver_id, number, code, name, country, team_id, birth_date", DRIVERS.map((d) => [d.id, d.number, d.code, d.name, d.country, d.team, d.born])),
    insert("circuits", "circuit_id, name, country, length_km", CIRCUITS.map((c) => [c.id, c.name, c.country, c.km])),
    insert("races", "race_id, round, circuit_id, name, race_date, laps, weather", RACES.map((r) => [r.round, r.round, r.circuit, r.name, r.date, CIRCUITS[r.circuit - 1].laps, r.weather])),
    insert("points_rules", "position, points", POINTS.map((p, i) => [i + 1, p])),
    insert("results", "race_id, driver_id, grid, finish_pos, status, laps_done, points, fastest_lap", season.results.map((r) => [r.race, r.driver, r.grid, r.pos, r.status, r.lapsDone, r.points, r.fl])),
    insert("qualifying", "race_id, driver_id, q1_ms, q2_ms, q3_ms", season.quali.map((r) => [r.race, r.driver, r.q1, r.q2, r.q3])),
    insert("laps", "race_id, driver_id, lap, lap_ms, compound, tyre_age, pit_lap", season.laps.map((l) => [l.race, l.driver, l.lap, l.ms, l.compound, l.age, l.pit])),
    insert("pit_stops", "race_id, driver_id, stop_no, lap, duration_ms, new_compound", season.stops.map((s) => [s.race, s.driver, s.no, s.lap, s.ms, s.fit])),
    insert("penalties", "race_id, driver_id, seconds, reason, issued_at", season.penalties.map((p) => [p.race, p.driver, p.seconds, p.reason, p.at])),
  ];
  return parts.join("\n\n");
}
