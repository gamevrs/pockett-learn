import type { Project } from "@/engine/types";

/**
 * Pit Wall: you are the data engineer on a race team's pit wall. Every query you write powers
 * one panel of the live dashboard.
 *
 * Authoring notes:
 *  - SQL goes in String.raw`...` (no backticks, no ${ inside). Prose goes in normal templates;
 *    escape inline-code backticks as \` and use ~~~sql fences for code blocks (avoid "#" inside
 *    fences: the lesson highlighter treats it as a comment).
 *  - The hidden `setup` below builds the race database. It is generated from fixed seed data, so
 *    every run (and every check) sees exactly the same rows.
 *  - drivers.retired_lap is NULL for every car still running (only Kovač has a value): it powers the
 *    NULL lesson. Drivers with no pit_stops row (HAR, PAL, KOV, WAL) power the LEFT JOIN lesson.
 *  - The scene (src/scenes/sqldesk) gets every result set and picks one per panel by what the
 *    statement does (the extra lessons' queries -- LIKE, BETWEEN, IN, DISTINCT, NULL, LEFT JOIN -- belong to no panel): FROM pit_stops → pit log, CASE → strategy, GROUP BY → pace chart,
 *    JOIN → timing tower, aggregates → session stats, ORDER BY/LIMIT → fastest laps,
 *    WHERE → live timing, anything else → roster.
 */
const sql = String.raw;

// ───────────────────────── seed data: the Marrow Bay Grand Prix, lap 24 of 50 ─────────────────────────

type Compound = "SOFT" | "MEDIUM" | "HARD";

interface DriverSeed {
  id: number;
  number: number;
  code: string;
  name: string;
  country: string;
  team: number;
  /** Pace offset in ms (lower is quicker). */
  skill: number;
  start: Compound;
  pit?: { lap: number; fit: Compound; ms: number };
  retiredOn?: number;
  /** Fuel burn, kg per lap. */
  burn: number;
}

const RACE_LAPS = 50;
const CURRENT_LAP = 24;

const TEAMS: [number, string, string, number][] = [
  [1, "Halcyon Racing", "United Kingdom", 1998],
  [2, "Vanta Motorsport", "Italy", 1987],
  [3, "Kestrel GP", "Germany", 2009],
  [4, "Orbital Dynamics", "Japan", 2014],
  [5, "Nordlys Racing", "Norway", 2019],
  [6, "Sable Works", "France", 1979],
];

const DRIVERS: DriverSeed[] = [
  { id: 1, number: 4, code: "NOV", name: "Lena Novak", country: "Czechia", team: 1, skill: 0, start: "MEDIUM", pit: { lap: 17, fit: "HARD", ms: 2410 }, burn: 1.78 },
  { id: 2, number: 16, code: "ADE", name: "Tomi Adeyemi", country: "Nigeria", team: 1, skill: 420, start: "SOFT", pit: { lap: 12, fit: "HARD", ms: 4870 }, burn: 1.84 },
  { id: 3, number: 7, code: "MAR", name: "Inés Marín", country: "Spain", team: 2, skill: 170, start: "MEDIUM", pit: { lap: 19, fit: "HARD", ms: 2290 }, burn: 1.81 },
  { id: 4, number: 22, code: "BEL", name: "Luca Bellini", country: "Italy", team: 2, skill: 610, start: "SOFT", pit: { lap: 9, fit: "MEDIUM", ms: 2650 }, burn: 1.86 },
  { id: 5, number: 11, code: "HAR", name: "Kai Hartmann", country: "Germany", team: 3, skill: 290, start: "MEDIUM", burn: 1.79 },
  { id: 6, number: 31, code: "LIN", name: "Mei Lin", country: "China", team: 3, skill: 880, start: "SOFT", pit: { lap: 13, fit: "HARD", ms: 2530 }, burn: 1.83 },
  { id: 7, number: 3, code: "MOR", name: "Haru Mori", country: "Japan", team: 4, skill: 120, start: "MEDIUM", pit: { lap: 18, fit: "HARD", ms: 2340 }, burn: 1.77 },
  { id: 8, number: 44, code: "PAL", name: "Diego Palma", country: "Argentina", team: 4, skill: 690, start: "HARD", burn: 1.8 },
  { id: 9, number: 9, code: "SOL", name: "Freya Solberg", country: "Norway", team: 5, skill: 240, start: "SOFT", pit: { lap: 8, fit: "MEDIUM", ms: 3120 }, burn: 1.82 },
  { id: 10, number: 27, code: "KOV", name: "Anya Kovač", country: "Croatia", team: 5, skill: 1050, start: "MEDIUM", retiredOn: 9, burn: 1.85 },
  { id: 11, number: 18, code: "DUB", name: "Théo Dubois", country: "France", team: 6, skill: 790, start: "SOFT", pit: { lap: 14, fit: "MEDIUM", ms: 2480 }, burn: 1.87 },
  { id: 12, number: 63, code: "WAL", name: "Sam Walsh", country: "Australia", team: 6, skill: 1280, start: "HARD", burn: 1.76 },
];

const OFFSET: Record<Compound, number> = { SOFT: -700, MEDIUM: 0, HARD: 450 };
const WEAR: Record<Compound, number> = { SOFT: 90, MEDIUM: 48, HARD: 28 };

const q = (s: string) => `'${s.replace(/'/g, "''")}'`;

function buildSetup(): string {
  type Lap = { id: number; driver: number; lap: number; ms: number; compound: Compound; age: number; pit: 0 | 1 };
  const laps: Lap[] = [];
  const totals = new Map<number, number>();
  for (let lap = 1; lap <= CURRENT_LAP; lap++) {
    for (const d of DRIVERS) {
      if (d.retiredOn && lap > d.retiredOn) continue;
      const stinted = d.pit && lap > d.pit.lap;
      const compound = stinted ? d.pit!.fit : d.start;
      const age = stinted ? lap - d.pit!.lap : lap;
      const pit = d.pit?.lap === lap ? 1 : 0;
      const noise = ((d.id * 7919 + lap * 104729 + d.id * lap * 31) % 1201) - 600;
      let ms = 92000 + d.skill + (RACE_LAPS - lap) * 55 + OFFSET[compound] + WEAR[compound] * age + noise;
      if (lap === 1) ms += 4300; // standing start
      if (pit) ms += 20400 + (d.pit!.ms - 2400); // pit lane plus time stationary
      if (stinted && age === 1) ms += 900; // cold tyres on the out-lap
      if (d.code === "WAL" && lap === 24) ms += 7600; // spun at turn 9
      if (d.code === "KOV" && lap === 9) ms += 14000; // limped back with a gearbox failure
      laps.push({ id: laps.length + 1, driver: d.id, lap, ms, compound, age, pit });
      totals.set(d.id, (totals.get(d.id) ?? 0) + ms);
    }
  }

  const running = DRIVERS.filter((d) => !d.retiredOn).sort((a, b) => totals.get(a.id)! - totals.get(b.id)!);
  const leader = totals.get(running[0].id)!;
  const status = running.map((d, i) => {
    const last = laps.filter((l) => l.driver === d.id).at(-1)!;
    const gap = Math.round(totals.get(d.id)! - leader) / 1000;
    const fuel = Math.round((100 - d.burn * CURRENT_LAP) * 10) / 10;
    return `(${d.id}, ${i + 1}, ${gap}, ${q(last.compound)}, ${last.age}, ${fuel})`;
  });

  const stops = DRIVERS.filter((d) => d.pit).sort((a, b) => a.pit!.lap - b.pit!.lap);

  return [
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
  retired_lap INTEGER
);`,
    `CREATE TABLE laps (
  lap_id INTEGER PRIMARY KEY,
  driver_id INTEGER NOT NULL REFERENCES drivers(driver_id),
  lap INTEGER NOT NULL,
  lap_ms INTEGER NOT NULL,
  compound TEXT NOT NULL,
  tyre_age INTEGER NOT NULL,
  pit_lap INTEGER NOT NULL DEFAULT 0
);`,
    `CREATE TABLE pit_stops (
  stop_id INTEGER PRIMARY KEY,
  driver_id INTEGER NOT NULL REFERENCES drivers(driver_id),
  lap INTEGER NOT NULL,
  duration_ms INTEGER NOT NULL,
  new_compound TEXT NOT NULL
);`,
    `CREATE TABLE car_status (
  driver_id INTEGER PRIMARY KEY REFERENCES drivers(driver_id),
  position INTEGER NOT NULL,
  gap_s REAL NOT NULL,
  compound TEXT NOT NULL,
  tyre_age INTEGER NOT NULL,
  fuel_kg REAL NOT NULL
);`,
    `INSERT INTO teams VALUES\n${TEAMS.map(([id, name, country, founded]) => `(${id}, ${q(name)}, ${q(country)}, ${founded})`).join(",\n")};`,
    `INSERT INTO drivers VALUES\n${DRIVERS.map((d) => `(${d.id}, ${d.number}, ${q(d.code)}, ${q(d.name)}, ${q(d.country)}, ${d.team}, ${d.retiredOn ?? "NULL"})`).join(",\n")};`,
    `INSERT INTO laps VALUES\n${laps.map((l) => `(${l.id}, ${l.driver}, ${l.lap}, ${l.ms}, ${q(l.compound)}, ${l.age}, ${l.pit})`).join(",\n")};`,
    `INSERT INTO pit_stops (driver_id, lap, duration_ms, new_compound) VALUES\n${stops.map((d) => `(${d.id}, ${d.pit!.lap}, ${d.pit!.ms}, ${q(d.pit!.fit)})`).join(",\n")};`,
    `INSERT INTO car_status VALUES\n${status.join(",\n")};`,
  ].join("\n\n");
}

// ───────────────────────── the course ─────────────────────────

export const pitWall: Project = {
  slug: "pit-wall",
  language: "sql",
  setup: buildSetup(),
  title: "Pit Wall",
  tagline: "Run a race team's data. One query per screen.",
  pitch:
    "It's lap 24 of the Marrow Bay Grand Prix and the pit wall's screens are dark. You're the data engineer: every SQL query you write lights up a panel, from the driver roster to live timing, pace charts, the timing tower and finally the call to box a car.",
  emoji: "🏁",
  difficulty: "Beginner",
  hours: 3.5,
  sceneId: "sqldesk",
  accent: { from: "#c5ee8a", to: "#4b7411" },
  controls: [],
  skills: ["SELECT & FROM", "WHERE", "BETWEEN, IN & LIKE", "ORDER BY & LIMIT", "DISTINCT", "aggregates", "NULL & COALESCE", "GROUP BY & HAVING", "JOIN & LEFT JOIN", "CASE & computed columns", "INSERT & UPDATE"],
  features: [
    { id: "roster", title: "Driver roster", blurb: "The grid's drivers, straight from your SELECT.", emoji: "🧑‍✈️" },
    { id: "timing", title: "Live timing", blurb: "This lap's times, filtered by your WHERE.", emoji: "⏱️" },
    { id: "fastest", title: "Fastest laps", blurb: "A top-10 board sorted by your ORDER BY.", emoji: "🏆" },
    { id: "stats", title: "Race stats", blurb: "Totals and averages from your aggregate query.", emoji: "∑" },
    { id: "pace", title: "Pace chart", blurb: "Each driver's average lap, grouped by your GROUP BY.", emoji: "📊" },
    { id: "tower", title: "Timing tower", blurb: "The running order with names and teams, from your JOIN.", emoji: "🗼" },
    { id: "strategy", title: "Strategy calls", blurb: "BOX, WATCH or STAY OUT for every car, from your CASE.", emoji: "🧠" },
    { id: "pitlog", title: "Pit log", blurb: "Your INSERT records the stop and your UPDATE fits the tyres.", emoji: "🔧" },
  ],
  chapters: [
    {
      id: "screens",
      title: "Light up the screens",
      blurb: "Read the database: pick columns, filter and search rows, sort them, remove repeats.",
      lessons: [
        {
          id: "pit-wall-1-roster",
          title: "Driver roster",
          minutes: 6,
          xp: 50,
          concepts: ["SELECT", "FROM", "columns", "comments"],
          learn: `### Why this matters

A race team collects thousands of numbers every minute: lap times, tyre ages, fuel. On the pit wall, engineers can't scroll through a pile of numbers. They need screens that show just the right piece. Each screen is powered by a question you ask the database, and **SQL** is the language you ask it in.

### Tables, rows and columns

A database keeps data in **tables**, like spreadsheets. In a table, each **row** is one thing (one driver) and each **column** is one fact about it (their number, their name).

To read a table, you write a **query**: a question to the database. Here is one against the \`teams\` table:

~~~sql
SELECT name, country FROM teams;
~~~

- \`SELECT\` lists the columns you want, separated by commas.
- \`FROM\` says which table to read.
- The \`;\` ends the statement.

The database answers with a new table of just those columns, one row per team:

| name | country |
| --- | --- |
| Halcyon Racing | United Kingdom |
| Vanta Motorsport | Italy |
| Kestrel GP | Germany |
| Orbital Dynamics | Japan |
| Nordlys Racing | Norway |
| Sable Works | France |

\`SELECT * FROM drivers;\` means "every column", which is handy for a quick look. On a real dashboard you name the columns, so the screen gets exactly what it shows.

Keywords are not case-sensitive, but writing them in CAPITALS makes queries easy to scan. Lines starting with \`--\` are **comments**: SQL skips them.

### How this workspace works

Type your SQL in the editor. Press **Run** to send it to the database: the answer appears on the stage (the pit wall screens) and in the **Console** tab. Press **Submit** to have your work checked: the **Checks** tab lists what passed and what didn't, with a hint of what to fix. If you make a typo, you'll see a red error message that says what the database didn't understand. That's normal; read it, fix the line and Run again.

### The pit wall database

- \`teams\`: team_id, name, country, founded
- \`drivers\`: driver_id, number, code, name, country, team_id, retired_lap
- \`laps\`: lap_id, driver_id, lap, lap_ms, compound, tyre_age, pit_lap
- \`pit_stops\`: stop_id, driver_id, lap, duration_ms, new_compound
- \`car_status\`: driver_id, position, gap_s, compound, tyre_age, fuel_kg

The schema panel on the stage lists them too. (\`retired_lap\` is empty for most drivers. You'll see why in lesson 8.)`,
          mission: `It's lap 24 of 50 at Marrow Bay and every screen on the pit wall is dark. The database is fine, but nothing reads from it.

Start with the easiest screen: the **driver roster**. Query each driver's car number, three-letter code, name and country. Run it and the roster board fills in.`,
          tasks: [
            "Write a SELECT that reads from the drivers table",
            "Pick the columns number, code, name and country, in that order",
            "End the statement with a semicolon",
            "Run to fill the roster, then Submit",
          ],
          starterAdd: sql`-- ── ✏️ YOUR TURN ───────────────────────────
-- Lesson 1: fill the driver roster.
-- Select number, code, name and country from the drivers table.
`,
          solutionAdd: sql`-- Driver roster
SELECT number, code, name, country
FROM drivers;`,
          explanation:
            "SELECT names the columns, FROM names the table, and every row of drivers comes back because nothing filters them. The roster panel draws one card per row you return.",
          hints: [
            { id: "h1", title: "Shape of a query", content: "SELECT column1, column2 FROM table_name;" },
            { id: "h2", title: "The columns", content: "The drivers table has number, code, name and country columns. List all four after SELECT, separated by commas." },
            { id: "h3", title: "Full answer", content: "SELECT number, code, name, country FROM drivers;" },
          ],
          tests: [
            {
              id: "t1",
              description: "Returns every driver",
              assertionCode: `assert(result, "Write a SELECT statement that reads FROM drivers");
assertEqual(rows.length, query("SELECT COUNT(*) AS n FROM drivers")[0].n, "Number of rows");`,
            },
            {
              id: "t2",
              description: "Has the number, code, name and country columns",
              assertionCode: `for (const c of ["number", "code", "name", "country"]) {
  assert(result.columns.includes(c), "Your result is missing the " + c + " column");
}`,
            },
            {
              id: "t3",
              description: "The rows are real drivers",
              assertionCode: `assert(result && rows.length > 0, "Run a SELECT that returns the roster first");
const codes = query("SELECT code FROM drivers").map((r) => r.code);
assert(rows.every((r) => codes.includes(r.code)), "Every row should be a driver from the drivers table");`,
            },
          ],
          unlocks: ["roster"],
          checks: [
            {
              prompt: "In a table of drivers, what is **one row**?",
              question: { type: "choice", options: ["One fact about every driver, like all the names", "Everything known about one driver", "The name of the table"], answer: 1 },
              explanation: "A row is one thing (one driver) with all its facts. A column is one fact (like name) running down every row.",
            },
          ],
        },
        {
          id: "pit-wall-2-timing",
          title: "Live timing",
          minutes: 8,
          xp: 60,
          concepts: ["WHERE", "comparisons", "AND / OR", "IN"],
          learn: `### Why this matters

A live timing screen can't show every lap of the race, only the newest one. You need a way to say "only the rows that fit", and in SQL that is \`WHERE\`.

### WHERE keeps only the rows you want

Add \`WHERE\` after \`FROM\` with a condition. The database checks it for each row, and only rows where it is true come back.

~~~sql
SELECT name FROM drivers WHERE country = 'Japan';
~~~

| name |
| --- |
| Haru Mori |

Comparisons: \`=\`, \`!=\` (or \`<>\`), \`<\`, \`<=\`, \`>\`, \`>=\`. Text goes in **single quotes**; numbers don't.

Combine conditions with \`AND\` (both must be true) and \`OR\` (either one):

~~~sql
SELECT code FROM drivers WHERE team_id = 1 OR team_id = 2;
SELECT code FROM drivers WHERE team_id IN (1, 2);   -- same thing, shorter
~~~

Either way the answer is:

| code |
| --- |
| NOV |
| ADE |
| MAR |
| BEL |

(Lesson 3 teaches \`IN\` properly. For now, read it as "is one of these".)

Use parentheses when you mix AND and OR, so the meaning is obvious.

### Lap times

The \`laps\` table has one row per car per lap. \`lap_ms\` is the lap time in **milliseconds**: 93250 means 1 minute 33.250 seconds.`,
          mission: `The live timing screen should show the lap that just finished: **lap 24**.

One problem: car 63 spun at turn 9 and its lap 24 is junk (over 100 seconds). Engineers don't want spins on the timing screen, so keep only laps faster than 100000 ms.`,
          tasks: [
            "Select driver_id, lap, lap_ms and compound from laps",
            "Keep only rows where lap is 24",
            "AND lap_ms is below 100000",
          ],
          starterAdd: sql`-- ── ✏️ YOUR TURN ───────────────────────────
-- Lesson 2: live timing for lap 24.
-- Select driver_id, lap, lap_ms, compound from laps,
-- only for lap 24, and only laps faster than 100000 ms.
`,
          solutionAdd: sql`-- Live timing: lap 24, spins filtered out
SELECT driver_id, lap, lap_ms, compound
FROM laps
WHERE lap = 24 AND lap_ms < 100000;`,
          explanation:
            "WHERE is checked once per row. A row survives only if lap = 24 and its time is under 100 seconds, so Walsh's spin and every older lap are left out.",
          hints: [
            { id: "h1", title: "Where it goes", content: "WHERE comes after FROM: SELECT ... FROM laps WHERE ...;" },
            { id: "h2", title: "Two conditions", content: "Join them with AND: WHERE lap = 24 AND lap_ms < 100000" },
            { id: "h3", title: "Keep the old query", content: "Leave your earlier queries where they are and add the new one below them. Each statement ends with ;" },
          ],
          tests: [
            {
              id: "t1",
              description: "Shows driver_id, lap, lap_ms and compound",
              assertionCode: `assert(result, "Add a new SELECT below your roster query");
for (const c of ["driver_id", "lap", "lap_ms", "compound"]) {
  assert(result.columns.includes(c), "Your last query is missing the " + c + " column");
}`,
            },
            {
              id: "t2",
              description: "Only lap 24",
              assertionCode: `assert(rows.length > 0, "Your query returned no rows");
assert(rows.every((r) => r.lap === 24), "Every row should be from lap 24 (WHERE lap = 24)");`,
            },
            {
              id: "t3",
              description: "The spin is filtered out",
              assertionCode: `assert(rows.every((r) => r.lap_ms < 100000), "Keep only laps under 100000 ms");
const expected = query("SELECT COUNT(*) AS n FROM laps WHERE lap = 24 AND lap_ms < 100000")[0].n;
assertEqual(rows.length, expected, "Number of clean lap-24 laps");`,
            },
          ],
          unlocks: ["timing"],
          checks: [
            {
              prompt: "Which condition keeps a row only when **both** parts are true?",
              question: { type: "choice", options: ["lap = 24 OR lap_ms < 100000", "lap = 24 AND lap_ms < 100000", "lap = 24, lap_ms < 100000"], answer: 1 },
              explanation: "AND needs both parts true. OR needs just one, which would let in every lap-24 row plus every quick lap from other laps.",
            },
          ],
        },
        {
          id: "pit-wall-9-field",
          title: "Pick the field",
          minutes: 8,
          xp: 60,
          concepts: ["BETWEEN", "IN", "NOT IN"],
          learn: `### Why this matters

The broadcast director calls the pit wall: "Show me every lap between 94.0 and 94.8 seconds, and leave out our own two cars." You could chain a lot of \`AND\` and \`OR\`, but SQL has two shorter tools for exactly this.

### BETWEEN: inside a range

\`x BETWEEN low AND high\` is true when \`x\` is at least \`low\` and at most \`high\`. **Both ends count.**

~~~sql
SELECT code, number FROM drivers WHERE number BETWEEN 10 AND 20;
~~~

It is the same as \`number >= 10 AND number <= 20\`. The result:

| code | number |
| --- | --- |
| ADE | 16 |
| HAR | 11 |
| DUB | 18 |

### IN: one of a list

\`IN (...)\` is true when the value equals any item in the list. It replaces a pile of \`OR\`s.

~~~sql
SELECT code, country FROM drivers WHERE country IN ('Japan', 'China', 'Spain');
~~~

| code | country |
| --- | --- |
| MAR | Spain |
| LIN | China |
| MOR | Japan |

### NOT IN: anything except the list

Put \`NOT\` in front and the test flips: every row whose value is **not** on the list.

~~~sql
SELECT code, team_id FROM drivers WHERE team_id NOT IN (1, 2, 3, 4);
~~~

| code | team_id |
| --- | --- |
| SOL | 5 |
| KOV | 5 |
| DUB | 6 |
| WAL | 6 |

You can mix them with \`AND\`: \`WHERE lap = 24 AND lap_ms BETWEEN ... AND driver_id NOT IN (...)\`. The \`AND\` inside BETWEEN belongs to BETWEEN, so your own \`AND\` goes after the high value.`,
          mission: `The director wants a short list for the broadcast: on **lap 24**, every lap time from **94000 to 94800 ms** (both ends included), but without our own two cars (**driver_id 1 and 2**).

Show the driver and the time, fastest first.`,
          tasks: [
            "Select driver_id and lap_ms from laps",
            "WHERE lap = 24 AND lap_ms BETWEEN 94000 AND 94800",
            "AND driver_id NOT IN (1, 2)",
            "ORDER BY lap_ms, fastest first",
          ],
          starterAdd: sql`-- ── ✏️ YOUR TURN ───────────────────────────
-- Lesson 3: the broadcast shortlist.
-- From laps: driver_id, lap_ms for lap 24,
-- lap_ms from 94000 to 94800, not drivers 1 and 2, fastest first.
`,
          solutionAdd: sql`-- Broadcast shortlist
SELECT driver_id, lap_ms
FROM laps
WHERE lap = 24
  AND lap_ms BETWEEN 94000 AND 94800
  AND driver_id NOT IN (1, 2)
ORDER BY lap_ms;`,
          explanation:
            "BETWEEN keeps lap times from 94000 up to and including 94800, and NOT IN throws out the two Halcyon cars. Each row is checked against all three conditions, then the survivors are sorted.",
          hints: [
            { id: "h1", title: "The range", content: "lap_ms BETWEEN 94000 AND 94800 is one condition. Join it to the others with AND." },
            { id: "h2", title: "The exclusion", content: "driver_id NOT IN (1, 2) keeps every driver except 1 and 2." },
            { id: "h3", title: "Full answer", content: "SELECT driver_id, lap_ms FROM laps WHERE lap = 24 AND lap_ms BETWEEN 94000 AND 94800 AND driver_id NOT IN (1, 2) ORDER BY lap_ms;" },
          ],
          tests: [
            {
              id: "t1",
              description: "Shows driver_id and lap_ms",
              assertionCode: `assert(result && /\\bbetween\\b/i.test(result.sql), "Add a new SELECT below your earlier queries, using BETWEEN");
for (const c of ["driver_id", "lap_ms"]) assert(result.columns.includes(c), "Your last query is missing the " + c + " column");`,
            },
            {
              id: "t2",
              description: "Uses BETWEEN and NOT IN",
              assertionCode: `assert(result, "Add a new SELECT below your earlier queries");
assert(/\\bbetween\\b/i.test(result.sql), "Use BETWEEN 94000 AND 94800 for the time range");
assert(/\\bnot\\s+in\\b/i.test(result.sql), "Use NOT IN (1, 2) to leave out the two Halcyon cars");`,
            },
            {
              id: "t3",
              description: "The right laps, fastest first",
              assertionCode: `assert(result && rows.length > 0, "Run a SELECT that returns the shortlist first");
assert(rows.every((r) => r.driver_id !== 1 && r.driver_id !== 2), "Drivers 1 and 2 should be left out (NOT IN (1, 2))");
assert(rows.every((r) => r.lap_ms >= 94000 && r.lap_ms <= 94800), "Every lap time should be from 94000 to 94800 ms");
const truth = query("SELECT driver_id, lap_ms FROM laps WHERE lap = 24 AND lap_ms BETWEEN 94000 AND 94800 AND driver_id NOT IN (1, 2) ORDER BY lap_ms");
assertEqual(rows.map((r) => r.driver_id), truth.map((r) => r.driver_id), "Drivers on the shortlist, fastest first");`,
            },
          ],
          unlocks: [],
          checks: [
            {
              prompt: "`WHERE x BETWEEN 5 AND 8`: which of these values does it keep?",
              question: { type: "choice", options: ["4 and 5", "5 and 8", "5 but not 8", "6 and 7 only"], answer: 1 },
              explanation: "BETWEEN includes both ends, so 5 and 8 are kept, along with 6 and 7. It is the same as x >= 5 AND x <= 8.",
            },
          ],
        },
        {
          id: "pit-wall-10-search",
          title: "Search the grid",
          minutes: 8,
          xp: 60,
          concepts: ["LIKE", "% wildcard", "_ wildcard"],
          learn: `### Why this matters

On the radio, an engineer says "it was a driver with *an* in the name, or maybe a code like M-something-R". You don't know the exact text, only a piece of it. \`=\` needs the whole thing, so we use \`LIKE\`, which matches a **pattern**.

### Two wildcards

Inside a \`LIKE\` pattern two characters are special:

- \`%\` stands for **any run of characters**, even none at all
- \`_\` stands for **exactly one character**

Everything else must match as written. (In this database, upper and lower case count as the same for plain English letters.)

~~~sql
SELECT code, name FROM drivers WHERE name LIKE 'M%';
~~~

"Starts with M, then anything":

| code | name |
| --- | --- |
| LIN | Mei Lin |

~~~sql
SELECT code, name FROM drivers WHERE code LIKE 'M_R';
~~~

"M, one character, R":

| code | name |
| --- | --- |
| MAR | Inés Marín |
| MOR | Haru Mori |

Put \`%\` on both ends to say "contains it anywhere":

~~~sql
SELECT name FROM teams WHERE name LIKE '%Dyn%';
~~~

| name |
| --- |
| Orbital Dynamics |

And \`'%Racing'\` means "ends with Racing". \`NOT LIKE\` flips any pattern.`,
          mission: `The radio clip is crackly. The engineer is sure of one of two things: the driver's **name contains "an"** somewhere, or the **code is M, one letter, R**.

Find every driver that fits either clue, with their code and name, sorted by code.`,
          tasks: [
            "Select code and name from drivers",
            "WHERE name LIKE '%an%' OR code LIKE 'M_R'",
            "ORDER BY code",
          ],
          starterAdd: sql`-- ── ✏️ YOUR TURN ───────────────────────────
-- Lesson 4: the crackly radio clip.
-- From drivers: code, name where the name contains 'an'
-- or the code looks like M_R. Sorted by code.
`,
          solutionAdd: sql`-- Radio search
SELECT code, name
FROM drivers
WHERE name LIKE '%an%' OR code LIKE 'M_R'
ORDER BY code;`,
          explanation:
            "'%an%' matches any name with 'an' anywhere (Hartmann, Anya). 'M_R' matches a three-letter code with M first and R last, whatever sits between (MAR, MOR). OR keeps a driver if either clue fits.",
          hints: [
            { id: "h1", title: "Contains", content: "name LIKE '%an%' means: anything, then an, then anything." },
            { id: "h2", title: "One character", content: "code LIKE 'M_R' uses _ for exactly one unknown letter between M and R." },
            { id: "h3", title: "Full answer", content: "SELECT code, name FROM drivers WHERE name LIKE '%an%' OR code LIKE 'M_R' ORDER BY code;" },
          ],
          tests: [
            {
              id: "t1",
              description: "Shows code and name",
              assertionCode: `assert(result, "Add a new SELECT below your earlier queries");
for (const c of ["code", "name"]) assert(result.columns.includes(c), "Your last query is missing the " + c + " column");`,
            },
            {
              id: "t2",
              description: "Uses LIKE with % and _",
              assertionCode: `assert(result, "Add a new SELECT below your earlier queries");
assert(/\\blike\\b/i.test(result.sql), "Use LIKE to match a pattern");
assert(result.sql.includes("%"), "Use % in a pattern for 'anything' (name LIKE '%an%')");
assert(result.sql.includes("_"), "Use _ in a pattern for exactly one character (code LIKE 'M_R')");`,
            },
            {
              id: "t3",
              description: "The right drivers, in code order",
              assertionCode: `assert(result && rows.length > 0, "Run a SELECT that returns the matching drivers first");
const truth = query("SELECT code FROM drivers WHERE name LIKE '%an%' OR code LIKE 'M_R' ORDER BY code").map((r) => r.code);
assertEqual(rows.map((r) => r.code), truth, "Driver codes that fit either clue, sorted");`,
            },
          ],
          unlocks: [],
          checks: [
            {
              prompt: "Which pattern matches the code `NOV` but **not** `NOVA`?",
              question: { type: "choice", options: ["'N%'", "'NO_'", "'%NOV%'", "'NOV%'"], answer: 1 },
              explanation: "'NO_' needs exactly one character after NO, so NOV fits but NOVA (two characters after NO) does not. The other patterns all allow extra characters.",
            },
          ],
        },
        {
          id: "pit-wall-3-fastest",
          title: "Fastest laps",
          minutes: 7,
          xp: 60,
          concepts: ["ORDER BY", "ASC / DESC", "LIMIT"],
          learn: `### Why this matters

A leaderboard is only useful in the right order, and it is only readable if it stops after the first few places. Two small tools do both.

### Sorting with ORDER BY

Rows come back in whatever order the database finds convenient. \`ORDER BY\` puts them in the order you choose:

~~~sql
SELECT code, number FROM drivers ORDER BY number;        -- smallest first
SELECT code, number FROM drivers ORDER BY number DESC;   -- largest first
~~~

\`ASC\` (ascending) is the default; \`DESC\` flips it. Text sorts alphabetically.

You can sort by several columns: \`ORDER BY team_id, number\` sorts by team, then by number inside each team. For example, with \`LIMIT 4\` added:

| code | number |
| --- | --- |
| NOV | 4 |
| ADE | 16 |
| MAR | 7 |
| BEL | 22 |

(Team 1 first, its two drivers by number, then team 2.)

### LIMIT keeps the top few

\`LIMIT 3\` returns only the first 3 rows **after** sorting. That's how you build any "top N" list.

~~~sql
SELECT code, number FROM drivers ORDER BY number DESC LIMIT 3;
~~~

| code | number |
| --- | --- |
| WAL | 63 |
| PAL | 44 |
| LIN | 31 |

The order matters: \`SELECT ... FROM ... WHERE ... ORDER BY ... LIMIT ...\`.`,
          mission: `The race engineers want a **fastest laps board**: the ten quickest laps of the race so far, quickest at the top.

Lower lap_ms is faster, so think about which direction to sort.`,
          tasks: [
            "Select driver_id, lap and lap_ms from laps",
            "Sort so the fastest (smallest lap_ms) comes first",
            "Keep only the top 10",
          ],
          starterAdd: sql`-- ── ✏️ YOUR TURN ───────────────────────────
-- Lesson 5: the ten fastest laps of the race.
-- Select driver_id, lap, lap_ms from laps, fastest first, top 10.
`,
          solutionAdd: sql`-- Fastest laps board
SELECT driver_id, lap, lap_ms
FROM laps
ORDER BY lap_ms ASC
LIMIT 10;`,
          explanation:
            "ORDER BY lap_ms ASC sorts from the smallest time to the largest, so the quickest laps rise to the top, and LIMIT 10 cuts the list after ten rows.",
          hints: [
            { id: "h1", title: "Which way?", content: "The fastest lap has the smallest lap_ms, so sort ascending: ORDER BY lap_ms (ASC is the default)." },
            { id: "h2", title: "Top 10", content: "LIMIT 10 goes at the very end, after ORDER BY." },
            { id: "h3", title: "Full answer", content: "SELECT driver_id, lap, lap_ms FROM laps ORDER BY lap_ms LIMIT 10;" },
          ],
          tests: [
            {
              id: "t1",
              description: "Exactly ten laps",
              assertionCode: `assert(result && result.columns.includes("lap_ms"), "Select the lap_ms column");
assert(/\\blimit\\b/i.test(result.sql), "Add a new SELECT with LIMIT 10 to keep just the top ten laps");
assertEqual(rows.length, 10, "Number of rows (use LIMIT 10)");`,
            },
            {
              id: "t2",
              description: "Fastest lap first",
              assertionCode: `assert(result && rows.length > 0 && /order\\s+by/i.test(result.sql), "Sort the laps with ORDER BY lap_ms");
const best = query("SELECT MIN(lap_ms) AS ms FROM laps")[0].ms;
assertEqual(rows[0].lap_ms, best, "The first row should be the fastest lap of the race");`,
            },
            {
              id: "t3",
              description: "Sorted quickest to slowest",
              assertionCode: `for (let i = 1; i < rows.length; i++) {
  assert(rows[i - 1].lap_ms <= rows[i].lap_ms, "Rows should be in ascending lap_ms order (ORDER BY lap_ms)");
}
assert(result.columns.includes("driver_id") && result.columns.includes("lap"), "Include driver_id and lap so the board can say whose lap it was");`,
            },
          ],
          unlocks: ["fastest"],
          checks: [
            {
              prompt: "Which line gives you the **three slowest** laps?",
              question: {
                type: "choice",
                options: ["ORDER BY lap_ms LIMIT 3", "ORDER BY lap_ms DESC LIMIT 3", "LIMIT 3 ORDER BY lap_ms DESC"],
                answer: 1,
              },
              explanation: "The slowest laps have the biggest lap_ms, so sort DESC (biggest first) and then cut with LIMIT 3. LIMIT always comes last, after ORDER BY.",
            },
          ],
        },
        {
          id: "pit-wall-11-distinct",
          title: "Each tyre once",
          minutes: 6,
          xp: 50,
          concepts: ["DISTINCT", "duplicate rows"],
          learn: `### Why this matters

The tyre legend on the big screen should list each compound once: SOFT, MEDIUM, HARD. But the \`laps\` table has 273 rows and the same compound shows up on many of them. A plain SELECT would give you the same word over and over.

### DISTINCT removes repeats

Write \`DISTINCT\` right after \`SELECT\`. A row that is exactly the same as one already in the result is dropped.

~~~sql
SELECT DISTINCT new_compound FROM pit_stops ORDER BY new_compound;
~~~

Eight pit stops were made, but only two different tyres were fitted:

| new_compound |
| --- |
| HARD |
| MEDIUM |

With several columns, a row only counts as a repeat if **all** the chosen columns match. \`SELECT DISTINCT team_id, country ...\` keeps each different pair once.

Soon you will meet a cousin of this, \`COUNT(DISTINCT driver_id)\`, which counts the different values instead of listing them.`,
          mission: `Build the **tyre legend**: every compound that appears in the laps table, each listed once, in alphabetical order.`,
          tasks: [
            "SELECT DISTINCT compound FROM laps",
            "ORDER BY compound",
          ],
          starterAdd: sql`-- ── ✏️ YOUR TURN ───────────────────────────
-- Lesson 6: the tyre legend.
-- Each compound that appears in laps, once, alphabetical.
`,
          solutionAdd: sql`-- Tyre legend
SELECT DISTINCT compound
FROM laps
ORDER BY compound;`,
          explanation:
            "DISTINCT collapses the 273 lap rows to one row per different compound. ORDER BY then sorts those three rows alphabetically.",
          hints: [
            { id: "h1", title: "Where DISTINCT goes", content: "Right after SELECT, before the column: SELECT DISTINCT compound ..." },
            { id: "h2", title: "Full answer", content: "SELECT DISTINCT compound FROM laps ORDER BY compound;" },
          ],
          tests: [
            {
              id: "t1",
              description: "One compound column",
              assertionCode: `assert(result, "Add a new SELECT below your earlier queries");
assert(result.columns.length === 1 && result.columns[0] === "compound", "Select just the compound column");`,
            },
            {
              id: "t2",
              description: "Each compound once",
              assertionCode: `assert(result && /\\bdistinct\\b/i.test(result.sql), "Use SELECT DISTINCT so repeats are removed");
const list = rows.map((r) => r.compound);
assertEqual(new Set(list).size, list.length, "Each compound should appear only once");
assertEqual(list.length, query("SELECT COUNT(DISTINCT compound) AS n FROM laps")[0].n, "Number of different compounds");`,
            },
            {
              id: "t3",
              description: "Alphabetical order",
              assertionCode: `assert(result && rows.length > 0, "Run a SELECT DISTINCT compound query first");
assertEqual(rows.map((r) => r.compound), ["HARD", "MEDIUM", "SOFT"], "Compounds in alphabetical order (ORDER BY compound)");`,
            },
          ],
          unlocks: [],
          checks: [
            {
              prompt: "A column `team` holds the values A, A, B, B, B. How many rows does `SELECT DISTINCT team FROM ...` return?",
              question: { type: "number", answer: 2 },
              explanation: "Only two different values exist, A and B, so each comes back once.",
            },
          ],
        },
      ],
    },
    {
      id: "numbers",
      title: "Crunch the numbers",
      blurb: "Summarise thousands of seconds into a few numbers, handle missing values, then connect the tables.",
      lessons: [
        {
          id: "pit-wall-4-stats",
          title: "Race stats",
          minutes: 8,
          xp: 70,
          concepts: ["COUNT", "MIN / MAX", "AVG", "ROUND", "AS aliases"],
          learn: `### Why this matters

The race director doesn't want 273 lap times, just a few headline numbers: how many laps, the best one, the average. A function that looks at many rows and gives back one number is called an **aggregate**.

### Aggregate functions squash many rows into one

~~~sql
SELECT COUNT(*) FROM laps;        -- how many rows
SELECT MIN(lap_ms) FROM laps;     -- smallest value
SELECT MAX(lap) FROM laps;        -- largest value
SELECT AVG(lap_ms) FROM laps;     -- mean value
SELECT SUM(duration_ms) FROM pit_stops;
~~~

\`COUNT(DISTINCT driver_id)\` counts different values only (you met \`DISTINCT\` in lesson 6), so 24 laps by the same car count once.

You can ask for several at once; the answer is a single row. On the pit stops:

~~~sql
SELECT COUNT(*), MIN(duration_ms), SUM(duration_ms) FROM pit_stops;
~~~

| COUNT(*) | MIN(duration_ms) | SUM(duration_ms) |
| --- | --- | --- |
| 8 | 2290 | 22690 |

### Name your columns with AS

Without a name, a column is called something like \`AVG(lap_ms)\`. Give it a clean one:

~~~sql
SELECT COUNT(*) AS stops, ROUND(AVG(duration_ms)) AS avg_ms FROM pit_stops;
~~~

| stops | avg_ms |
| --- | --- |
| 8 | 2836 |

\`ROUND(x)\` rounds to a whole number, \`ROUND(x, 2)\` to 2 decimal places.`,
          mission: `The race director's screen needs four headline numbers, all from the laps table:

- how many laps have been completed in total
- how many different cars have set a lap
- the fastest lap of the race
- the average lap time, rounded to a whole millisecond`,
          tasks: [
            "COUNT(*) AS laps",
            "COUNT(DISTINCT driver_id) AS cars",
            "MIN(lap_ms) AS best_ms",
            "ROUND(AVG(lap_ms)) AS avg_ms, all in one SELECT from laps",
          ],
          starterAdd: sql`-- ── ✏️ YOUR TURN ───────────────────────────
-- Lesson 7: race stats in one row.
-- From laps, select:
--   COUNT(*) AS laps
--   COUNT(DISTINCT driver_id) AS cars
--   MIN(lap_ms) AS best_ms
--   ROUND(AVG(lap_ms)) AS avg_ms
`,
          solutionAdd: sql`-- Race stats
SELECT
  COUNT(*) AS laps,
  COUNT(DISTINCT driver_id) AS cars,
  MIN(lap_ms) AS best_ms,
  ROUND(AVG(lap_ms)) AS avg_ms
FROM laps;`,
          explanation:
            "Aggregates read every row and return one answer each, so the whole query returns a single row. AS gives each answer the name the stats panel shows above it.",
          hints: [
            { id: "h1", title: "One SELECT", content: "Put all four aggregates in the same SELECT, separated by commas, then FROM laps." },
            { id: "h2", title: "Aliases", content: "Write AS name after each one: COUNT(*) AS laps, MIN(lap_ms) AS best_ms ..." },
            { id: "h3", title: "Rounding", content: "Wrap AVG in ROUND: ROUND(AVG(lap_ms)) AS avg_ms" },
          ],
          tests: [
            {
              id: "t1",
              description: "One row with laps, cars, best_ms and avg_ms",
              assertionCode: `assert(result, "Add a new SELECT for the stats");
assertEqual(rows.length, 1, "Aggregates without GROUP BY return one row");
for (const c of ["laps", "cars", "best_ms", "avg_ms"]) {
  assert(result.columns.includes(c), "Name a column " + c + " with AS");
}`,
            },
            {
              id: "t2",
              description: "Counts laps and cars",
              assertionCode: `const truth = query("SELECT COUNT(*) AS laps, COUNT(DISTINCT driver_id) AS cars FROM laps")[0];
assertEqual(rows[0].laps, truth.laps, "laps (COUNT(*))");
assertEqual(rows[0].cars, truth.cars, "cars (COUNT(DISTINCT driver_id))");`,
            },
            {
              id: "t3",
              description: "Fastest and average lap",
              assertionCode: `const truth = query("SELECT MIN(lap_ms) AS best, AVG(lap_ms) AS avg FROM laps")[0];
assertEqual(rows[0].best_ms, truth.best, "best_ms (MIN(lap_ms))");
assertClose(rows[0].avg_ms, Math.round(truth.avg), 0.5, "avg_ms (ROUND(AVG(lap_ms)))");`,
            },
          ],
          unlocks: ["stats"],
          checks: [
            {
              prompt: "What does `SELECT COUNT(*) FROM laps` return: one row or one row per lap?",
              question: { type: "choice", options: ["One row, holding a single number", "One row per lap"], answer: 0 },
              explanation: "An aggregate folds all the rows into one answer. You only get one row per group when you add GROUP BY, which is next.",
            },
          ],
        },
        {
          id: "pit-wall-12-missing",
          title: "Missing values",
          minutes: 10,
          xp: 80,
          concepts: ["NULL", "IS NULL / IS NOT NULL", "COUNT(col)", "COALESCE"],
          learn: `### Why this matters

Anya Kovač's car stopped on lap 9. The race stewards want to record **which lap** a driver retired on. But eleven drivers are still racing: they have not retired, so there is no lap to write down. Writing 0 would be a lie (lap 0 is a real lap!). SQL has a special marker for "nothing is stored here": **NULL**.

The \`drivers\` table now has one more column, \`retired_lap\`:

| code | retired_lap |
| --- | --- |
| NOV | NULL |
| KOV | 9 |
| WAL | NULL |

NULL is not zero and not empty text. It means "no value / unknown".

### Asking for NULL: IS NULL

You might try \`WHERE retired_lap = NULL\`. It finds **nothing**, ever. Comparing anything with "unknown" gives "unknown", never "true", so no row passes. To test for NULL, use the special words \`IS NULL\` and \`IS NOT NULL\`:

~~~sql
SELECT code FROM drivers WHERE team_id = 6 AND retired_lap IS NULL ORDER BY code;
SELECT code, retired_lap FROM drivers WHERE retired_lap IS NOT NULL;
~~~

| code |
| --- |
| DUB |
| WAL |

| code | retired_lap |
| --- | --- |
| KOV | 9 |

### Counting skips NULL

\`COUNT(*)\` counts rows. \`COUNT(retired_lap)\` counts only the rows where that column is **not** NULL:

~~~sql
SELECT COUNT(*) AS entered, COUNT(retired_lap) AS retired FROM drivers;
~~~

| entered | retired |
| --- | --- |
| 12 | 1 |

### COALESCE: a stand-in for NULL

\`COALESCE(a, b)\` gives back \`a\`, unless \`a\` is NULL, and then it gives back \`b\`. It fills the gaps with a value you choose. For a car still running, the last lap it completed is the current lap, 24:

~~~sql
SELECT code, COALESCE(retired_lap, 24) AS last_lap FROM drivers WHERE team_id = 5;
~~~

| code | last_lap |
| --- | --- |
| SOL | 24 |
| KOV | 9 |

The stored data does not change; only this answer does.`,
          mission: `The stewards need two screens for their report. Write two queries, one after the other:

1. **Still running**: the code and name of every driver who has not retired (no \`retired_lap\`), sorted by code.
2. **Last lap completed**: for every driver, the code and \`last_lap\`: the lap they retired on, or lap 24 if they are still going. Sort by last_lap, then code.

Your last query is the one that fills the stewards' board.`,
          tasks: [
            "First query: SELECT code, name FROM drivers WHERE retired_lap IS NULL ORDER BY code",
            "Second query: SELECT code, COALESCE(retired_lap, 24) AS last_lap FROM drivers",
            "ORDER BY last_lap, code",
          ],
          starterAdd: sql`-- ── ✏️ YOUR TURN ───────────────────────────
-- Lesson 8: the stewards' report.
-- Query 1: code, name of drivers still running (retired_lap IS NULL), sorted by code.
-- Query 2: code and last_lap = COALESCE(retired_lap, 24) for every driver,
--          sorted by last_lap, then code.
`,
          solutionAdd: sql`-- Still running
SELECT code, name
FROM drivers
WHERE retired_lap IS NULL
ORDER BY code;

-- Last lap completed
SELECT code, COALESCE(retired_lap, 24) AS last_lap
FROM drivers
ORDER BY last_lap, code;`,
          explanation:
            "IS NULL keeps exactly the rows whose retired_lap holds no value, which is every car still running. COALESCE swaps those NULLs for 24 in the second answer, so every driver gets a number and Kovač's real 9 sorts to the top.",
          hints: [
            { id: "h1", title: "Never = NULL", content: "Use WHERE retired_lap IS NULL. Writing = NULL matches no rows at all." },
            { id: "h2", title: "COALESCE", content: "COALESCE(retired_lap, 24) AS last_lap returns retired_lap when it has a value, else 24." },
            { id: "h3", title: "Two queries", content: "Write the running-cars query first, end it with ;, then the last_lap query below it. The last one is what the board shows." },
          ],
          tests: [
            {
              id: "t1",
              description: "Query 1 lists the cars still running",
              assertionCode: `assert(results.length >= 2, "Write two queries: the still-running list first, then the last_lap board");
const first = results[results.length - 2];
assert(/\\bis\\s+null\\b/i.test(first.sql), "In the first query, use retired_lap IS NULL (never = NULL)");
assert(first.columns.includes("code") && first.columns.includes("name"), "The first query needs the code and name columns");
const truth = query("SELECT code FROM drivers WHERE retired_lap IS NULL ORDER BY code").map((r) => r.code);
const got = first.rows.map((r) => r[first.columns.indexOf("code")]);
assertEqual(got, truth, "Codes of drivers still running, sorted");`,
            },
            {
              id: "t2",
              description: "Query 2 has code and last_lap for every driver",
              assertionCode: `assert(result && result.columns.includes("last_lap") && result.columns.includes("code"), "End with a query that selects code and COALESCE(retired_lap, 24) AS last_lap");
assertEqual(rows.length, query("SELECT COUNT(*) AS n FROM drivers")[0].n, "One row per driver");
assert(/\\bcoalesce\\b/i.test(result.sql), "Use COALESCE(retired_lap, 24) to fill in the missing values");
assert(rows.every((r) => r.last_lap !== null), "No last_lap should be NULL: COALESCE should fill the gaps");`,
            },
            {
              id: "t3",
              description: "Right values, sorted by last_lap then code",
              assertionCode: `assert(result && result.columns.includes("last_lap") && rows.length > 0, "End with a query that returns last_lap");
const truth = query("SELECT code, COALESCE(retired_lap, 24) AS last_lap FROM drivers ORDER BY last_lap, code");
assertEqual(rows.map((r) => r.code + ":" + r.last_lap), truth.map((r) => r.code + ":" + r.last_lap), "Rows as code:last_lap (ORDER BY last_lap, code)");`,
            },
          ],
          unlocks: [],
          checks: [
            {
              prompt: "A table has 10 rows and 4 of them have NULL in `q3_ms`. What does `COUNT(q3_ms)` return?",
              question: { type: "number", answer: 6 },
              explanation: "COUNT(column) counts only the rows where the column has a value: 10 - 4 = 6. COUNT(*) would say 10.",
            },
            {
              prompt: "Why does `WHERE retired_lap = NULL` return no rows?",
              question: {
                type: "choice",
                options: ["No driver has retired", "Comparing with NULL is never true, so use IS NULL", "NULL must be written in quotes"],
                answer: 1,
              },
              explanation: "NULL means 'unknown', and any comparison with an unknown value is itself unknown, never true. IS NULL and IS NOT NULL are the tests built for it.",
            },
          ],
        },
        {
          id: "pit-wall-5-pace",
          title: "Pace chart",
          minutes: 10,
          xp: 80,
          concepts: ["GROUP BY", "HAVING", "WHERE vs HAVING"],
          learn: `### Why this matters

Strategists compare drivers by **pace**: each driver's typical lap time. One overall average can't do that, because you want a separate average for every driver. You need to cut the rows into piles first, one pile per driver, and then summarise each pile.

### GROUP BY: one answer per group

An aggregate on its own summarises the whole table. Add \`GROUP BY\` and you get one row **per group** instead:

~~~sql
SELECT compound, COUNT(*) AS laps
FROM laps
GROUP BY compound
ORDER BY compound;
~~~

| compound | laps |
| --- | --- |
| HARD | 89 |
| MEDIUM | 128 |
| SOFT | 56 |

One row for each different compound, with the number of laps in that group. Every column you select should either be in the GROUP BY or inside an aggregate.

### HAVING filters groups

\`WHERE\` throws away **rows** before they are grouped. \`HAVING\` throws away **groups** after the aggregates are worked out, so it can use them:

~~~sql
SELECT compound, COUNT(*) AS laps
FROM laps
WHERE lap > 1               -- rows: skip the opening lap
GROUP BY compound
HAVING COUNT(*) >= 100      -- groups: only busy compounds
ORDER BY laps DESC;
~~~

Only the MEDIUM group still has 100 or more laps after the opening lap is skipped:

| compound | laps |
| --- | --- |
| MEDIUM | 123 |

The full order is \`SELECT, FROM, WHERE, GROUP BY, HAVING, ORDER BY, LIMIT\`.`,
          mission: `Strategists compare **race pace**: each driver's average lap time. Two things would spoil the chart:

- Pit laps are 20 seconds slow. Leave them out (pit_lap = 0 keeps only normal laps).
- Kovač retired on lap 9 with a gearbox failure. Too few laps to be fair, so only show drivers with at least 10 clean laps.

Sort the result so the quickest average comes first.`,
          tasks: [
            "From laps, keep only rows WHERE pit_lap = 0",
            "GROUP BY driver_id and select driver_id, COUNT(*) AS laps, ROUND(AVG(lap_ms)) AS avg_ms",
            "HAVING COUNT(*) >= 10",
            "ORDER BY avg_ms, quickest first",
          ],
          starterAdd: sql`-- ── ✏️ YOUR TURN ───────────────────────────
-- Lesson 9: average race pace per driver.
-- Columns: driver_id, COUNT(*) AS laps, ROUND(AVG(lap_ms)) AS avg_ms
-- Skip pit laps (pit_lap = 0), one row per driver,
-- only drivers with 10+ laps, quickest first.
`,
          solutionAdd: sql`-- Pace chart: average clean lap per driver
SELECT driver_id, COUNT(*) AS laps, ROUND(AVG(lap_ms)) AS avg_ms
FROM laps
WHERE pit_lap = 0
GROUP BY driver_id
HAVING COUNT(*) >= 10
ORDER BY avg_ms;`,
          explanation:
            "WHERE drops the pit laps first, GROUP BY folds the remaining rows into one per driver, and HAVING then drops any driver whose group has fewer than 10 laps. ORDER BY works on the finished groups, so it can sort by the avg_ms alias.",
          hints: [
            { id: "h1", title: "Clause order", content: "SELECT ... FROM laps WHERE ... GROUP BY ... HAVING ... ORDER BY ...;" },
            { id: "h2", title: "WHERE or HAVING?", content: "pit_lap = 0 is about single rows, so it goes in WHERE. COUNT(*) >= 10 is about a whole group, so it goes in HAVING." },
            { id: "h3", title: "Group by the driver", content: "GROUP BY driver_id gives one row per driver." },
          ],
          tests: [
            {
              id: "t1",
              description: "One row per driver with driver_id, laps and avg_ms",
              assertionCode: `assert(result, "Add a new SELECT for the pace chart");
for (const c of ["driver_id", "laps", "avg_ms"]) assert(result.columns.includes(c), "Your result needs a " + c + " column");
const ids = rows.map((r) => r.driver_id);
assertEqual(new Set(ids).size, ids.length, "Each driver should appear once (GROUP BY driver_id)");`,
            },
            {
              id: "t2",
              description: "Retired car left out by HAVING",
              assertionCode: `assert(rows.every((r) => r.laps >= 10), "Only keep drivers with at least 10 laps (HAVING COUNT(*) >= 10)");
const expected = query("SELECT COUNT(*) AS n FROM (SELECT driver_id FROM laps WHERE pit_lap = 0 GROUP BY driver_id HAVING COUNT(*) >= 10)")[0].n;
assertEqual(rows.length, expected, "Number of drivers on the chart");`,
            },
            {
              id: "t3",
              description: "Averages skip pit laps",
              assertionCode: `assert(result && result.columns.includes("avg_ms") && result.columns.includes("driver_id") && rows.length > 0, "Add a new SELECT with driver_id and avg_ms, one row per driver");
const truth = new Map(query("SELECT driver_id, AVG(lap_ms) AS avg FROM laps WHERE pit_lap = 0 GROUP BY driver_id").map((r) => [r.driver_id, r.avg]));
for (const r of rows) assertClose(r.avg_ms, Math.round(truth.get(r.driver_id)), 0.5, "avg_ms for driver " + r.driver_id + " (did you keep only pit_lap = 0?)");`,
            },
            {
              id: "t4",
              description: "Quickest average first",
              assertionCode: `assert(result && result.columns.includes("avg_ms") && rows.length > 1, "Add a new SELECT that returns an avg_ms for each driver");
for (let i = 1; i < rows.length; i++) assert(rows[i - 1].avg_ms <= rows[i].avg_ms, "Sort with ORDER BY avg_ms");`,
            },
          ],
          unlocks: ["pace"],
          checks: [
            {
              prompt: "You want to ignore laps slower than 100 seconds **before** averaging, and drop whole groups that are too small **after** counting. Which clause does each job?",
              question: { type: "choice", options: ["WHERE first, HAVING second", "HAVING first, WHERE second", "WHERE for both"], answer: 0 },
              explanation: "WHERE filters single rows before they are grouped. HAVING filters whole groups after the aggregates have been worked out.",
            },
          ],
        },
        {
          id: "pit-wall-6-tower",
          title: "Timing tower",
          minutes: 12,
          xp: 90,
          concepts: ["JOIN ... ON", "table aliases", "qualified columns"],
          learn: `### Why this matters

The timing tower must show names and teams, but the tower's data (\`car_status\`) only stores a driver number like 5. Names live in \`drivers\`, team names in \`teams\`. Storing each fact once keeps the database tidy, so you have to join the tables back together when you want the full picture.

### Data lives in several tables

\`car_status\` knows each car's position, but only by \`driver_id\`. The names are in \`drivers\`, and the team names are in \`teams\`. A **JOIN** stitches rows from two tables together wherever a condition matches:

~~~sql
SELECT drivers.code, teams.name
FROM drivers
JOIN teams ON teams.team_id = drivers.team_id
WHERE drivers.team_id = 6;
~~~

For every driver, SQL finds the team whose \`team_id\` matches and glues the two rows side by side:

| code | name |
| --- | --- |
| DUB | Sable Works |
| WAL | Sable Works |

### Aliases keep it short

Give each table a short alias and use it to say which table a column comes from:

~~~sql
SELECT d.code, t.name AS team
FROM drivers AS d
JOIN teams AS t ON t.team_id = d.team_id;
~~~

Both tables have a \`name\` column, so \`t.name AS team\` avoids two columns called name. Here the same two rows look like this:

| code | team |
| --- | --- |
| DUB | Sable Works |
| WAL | Sable Works |

(Add \`WHERE d.team_id = 6\` to the alias query to get exactly that.)

You can keep adding joins, one per table: \`FROM a JOIN b ON ... JOIN c ON ...\`.`,
          mission: `Time for the big screen: the **timing tower**, the running order with real names instead of ids.

Start from \`car_status\` (position and gap to the leader), join \`drivers\` for the code and name, then join \`teams\` for the team name. Sort by position.`,
          tasks: [
            "FROM car_status AS c, JOIN drivers AS d ON d.driver_id = c.driver_id",
            "JOIN teams AS t ON t.team_id = d.team_id",
            "Select c.position, d.code, d.name, t.name AS team, c.gap_s",
            "ORDER BY c.position",
          ],
          starterAdd: sql`-- ── ✏️ YOUR TURN ───────────────────────────
-- Lesson 10: the timing tower.
-- Join car_status (c) to drivers (d) and teams (t).
-- Columns: c.position, d.code, d.name, t.name AS team, c.gap_s
-- Sorted by position.
`,
          solutionAdd: sql`-- Timing tower
SELECT c.position, d.code, d.name, t.name AS team, c.gap_s
FROM car_status AS c
JOIN drivers AS d ON d.driver_id = c.driver_id
JOIN teams AS t ON t.team_id = d.team_id
ORDER BY c.position;`,
          explanation:
            "Each JOIN matches rows on a shared id: car_status to drivers on driver_id, then drivers to teams on team_id. The aliases say which table every column comes from, and AS team keeps the team's name apart from the driver's.",
          hints: [
            { id: "h1", title: "First join", content: "FROM car_status AS c JOIN drivers AS d ON d.driver_id = c.driver_id" },
            { id: "h2", title: "Second join", content: "Add another line: JOIN teams AS t ON t.team_id = d.team_id" },
            { id: "h3", title: "Two names", content: "d.name is the driver and t.name is the team. Rename the team one: t.name AS team" },
          ],
          tests: [
            {
              id: "t1",
              description: "Has position, code, name, team and gap_s",
              assertionCode: `assert(result, "Add a new SELECT for the timing tower");
for (const c of ["position", "code", "name", "team", "gap_s"]) assert(result.columns.includes(c), "Your result needs a " + c + " column");`,
            },
            {
              id: "t2",
              description: "Every car still running, in race order",
              assertionCode: `assertEqual(rows.length, query("SELECT COUNT(*) AS n FROM car_status")[0].n, "One row per car in car_status");
rows.forEach((r, i) => assertEqual(r.position, i + 1, "Row " + (i + 1) + " position (ORDER BY c.position)"));`,
            },
            {
              id: "t3",
              description: "Names and teams match each car",
              assertionCode: `const truth = new Map(query("SELECT c.position AS p, d.code AS code, t.name AS team FROM car_status c JOIN drivers d ON d.driver_id = c.driver_id JOIN teams t ON t.team_id = d.team_id").map((r) => [r.p, r]));
for (const r of rows) {
  const t = truth.get(r.position);
  assert(t && t.code === r.code, "P" + r.position + " should be " + (t && t.code) + " (check your ON conditions)");
  assertEqual(r.team, t.team, "Team for " + r.code);
}`,
            },
          ],
          unlocks: ["tower"],
          checks: [
            {
              prompt: "In `JOIN teams AS t ON t.team_id = d.team_id`, what does the `ON` part do?",
              question: {
                type: "choice",
                options: ["It sorts the teams", "It says which rows of the two tables belong together", "It picks the columns to show"],
                answer: 1,
              },
              explanation: "ON is the matching rule. For each driver row, SQL finds the team row with the same team_id and glues them side by side.",
            },
          ],
        },
        {
          id: "pit-wall-13-leftjoin",
          title: "Cars with no stop",
          minutes: 10,
          xp: 90,
          concepts: ["INNER vs LEFT JOIN", "unmatched rows", "NULL from a join", "finding what is missing"],
          learn: `### Why this matters

The strategist asks: "Which cars have **not** pitted yet?" Think about what the plain \`JOIN\` from the last lesson does with that. It only keeps a driver when a matching pit stop **exists**. A driver with no stop has nothing to match, so the driver vanishes from the answer, and the very cars you are asking about are the ones missing.

### INNER JOIN drops unmatched rows

A plain \`JOIN\` is short for \`INNER JOIN\`: only rows that find a partner survive. Here are the drivers from teams 3 and 4 with their stop lap:

~~~sql
SELECT d.code, p.lap
FROM drivers AS d
JOIN pit_stops AS p ON p.driver_id = d.driver_id
WHERE d.team_id IN (3, 4)
ORDER BY d.code;
~~~

| code | lap |
| --- | --- |
| LIN | 13 |
| MOR | 18 |

Four drivers belong to those teams. HAR and PAL have not stopped, so they are gone.

### LEFT JOIN keeps the left table's rows

\`LEFT JOIN\` keeps **every** row from the table written first (the "left" one, after FROM). When there is no match on the right, the right-hand columns are filled with **NULL**:

~~~sql
SELECT d.code, p.lap
FROM drivers AS d
LEFT JOIN pit_stops AS p ON p.driver_id = d.driver_id
WHERE d.team_id IN (3, 4)
ORDER BY d.code;
~~~

| code | lap |
| --- | --- |
| HAR | NULL |
| LIN | 13 |
| MOR | 18 |
| PAL | NULL |

Now the unmatched drivers are in the answer, with NULL where the stop would be.

### Finding the missing ones

Those NULLs are a gift: keep only the rows where the right side is NULL and you have the drivers **with no match**. Test a column that always has a value when a match exists, such as the stop's id, using \`IS NULL\` from the last lesson:

~~~sql
SELECT d.code, p.lap
FROM drivers AS d
LEFT JOIN pit_stops AS p ON p.driver_id = d.driver_id
WHERE d.team_id IN (3, 4) AND p.stop_id IS NULL
ORDER BY d.code;
~~~

| code | lap |
| --- | --- |
| HAR | NULL |
| PAL | NULL |`,
          mission: `Build the strategist's list of cars that have **not pitted yet**, across all twelve drivers.

Start from \`drivers\` and \`LEFT JOIN\` \`pit_stops\`, keep only the drivers with no stop row, and show their code, name and the (empty) stop lap, sorted by code.`,
          tasks: [
            "FROM drivers AS d LEFT JOIN pit_stops AS p ON p.driver_id = d.driver_id",
            "WHERE p.stop_id IS NULL",
            "Select d.code, d.name, p.lap AS stop_lap",
            "ORDER BY d.code",
          ],
          starterAdd: sql`-- ── ✏️ YOUR TURN ───────────────────────────
-- Lesson 11: who has not pitted yet?
-- LEFT JOIN pit_stops (p) onto drivers (d), keep rows where p.stop_id IS NULL.
-- Columns: d.code, d.name, p.lap AS stop_lap. Sorted by code.
`,
          solutionAdd: sql`-- Cars yet to pit
SELECT d.code, d.name, p.lap AS stop_lap
FROM drivers AS d
LEFT JOIN pit_stops AS p ON p.driver_id = d.driver_id
WHERE p.stop_id IS NULL
ORDER BY d.code;`,
          explanation:
            "LEFT JOIN keeps all twelve drivers and fills the pit_stops columns with NULL for the ones with no stop. WHERE p.stop_id IS NULL then keeps exactly those drivers: Hartmann, Kovač, Palma and Walsh.",
          hints: [
            { id: "h1", title: "Keep every driver", content: "Write FROM drivers AS d LEFT JOIN pit_stops AS p ON p.driver_id = d.driver_id. Drivers is the left table, so none are dropped." },
            { id: "h2", title: "Keep only the unmatched", content: "A driver with no stop has NULL in every p column. Filter with WHERE p.stop_id IS NULL." },
            { id: "h3", title: "Full answer", content: "SELECT d.code, d.name, p.lap AS stop_lap FROM drivers AS d LEFT JOIN pit_stops AS p ON p.driver_id = d.driver_id WHERE p.stop_id IS NULL ORDER BY d.code;" },
          ],
          tests: [
            {
              id: "t1",
              description: "Has code, name and stop_lap",
              assertionCode: `assert(result, "Add a new SELECT below your earlier queries");
for (const c of ["code", "name", "stop_lap"]) assert(result.columns.includes(c), "Your last query needs a " + c + " column");
assert(/\\bleft\\s+(outer\\s+)?join\\b/i.test(result.sql), "Use LEFT JOIN so drivers without a stop are not dropped");`,
            },
            {
              id: "t2",
              description: "Only the cars with no stop",
              assertionCode: `assert(result && rows.length > 0, "Your query returned no rows: check your ON condition and use WHERE p.stop_id IS NULL");
assert(rows.every((r) => r.stop_lap === null), "Every row should have an empty stop_lap (WHERE p.stop_id IS NULL)");
const truth = query("SELECT d.code AS code FROM drivers d WHERE d.driver_id NOT IN (SELECT driver_id FROM pit_stops) ORDER BY d.code").map((r) => r.code);
assertEqual(rows.map((r) => r.code), truth, "Codes of the cars yet to pit, sorted by code");`,
            },
          ],
          unlocks: [],
          checks: [
            {
              prompt: "`drivers` has 12 rows. You run `drivers LEFT JOIN pit_stops` with no WHERE, and 8 drivers have exactly one stop each. How many rows come back?",
              question: { type: "number", answer: 12 },
              explanation: "LEFT JOIN keeps every driver, matched or not: 8 rows with a stop plus 4 rows with NULLs. A plain JOIN would give only 8.",
            },
          ],
        },
      ],
    },
    {
      id: "calls",
      title: "Make the call",
      blurb: "Turn data into decisions, then write to the database.",
      lessons: [
        {
          id: "pit-wall-7-strategy",
          title: "Strategy calls",
          minutes: 12,
          xp: 100,
          concepts: ["CASE WHEN", "computed columns", "arithmetic"],
          learn: `### Why this matters

On race day the question isn't "what is the tyre age?" but "what do we **do** about it?". The strategist needs a ready-made word on the screen: BOX, WATCH or STAY OUT. You can make SQL work that out for every row.

### Compute new columns

A SELECT can do maths on the way out. The result is a new column that isn't stored anywhere:

~~~sql
SELECT code, number * 2 AS doubled FROM drivers WHERE team_id = 1;
~~~

| code | doubled |
| --- | --- |
| NOV | 8 |
| ADE | 32 |

### CASE: if/else inside a query

\`CASE\` checks conditions top to bottom and returns the value of the first one that is true:

~~~sql
SELECT code,
  CASE
    WHEN number < 10 THEN 'single digit'
    WHEN number < 50 THEN 'double digit'
    ELSE 'big number'
  END AS style
FROM drivers
WHERE team_id IN (1, 6)
ORDER BY code;
~~~

| code | style |
| --- | --- |
| ADE | double digit |
| DUB | double digit |
| NOV | single digit |
| WAL | big number |

Order matters: a car with number 4 matches the first WHEN and stops there. \`ELSE\` catches everything left over (without it you get NULL, SQL's "no value", from lesson 8).`,
          mission: `The strategist wants one screen that says what to do with every car. Tyres are the big question:

- 20 laps or more on the same tyres: **BOX** (pit this lap)
- 15 laps or more: **WATCH**
- anything less: **STAY OUT**

Also show how many laps of fuel each car has left. Cars burn about 1.8 kg per lap, so that's fuel_kg divided by 1.8, rounded to one decimal place. Join drivers so the screen shows codes, and keep race order.`,
          tasks: [
            "FROM car_status AS c JOIN drivers AS d, ordered by c.position",
            "Select d.code, c.compound, c.tyre_age",
            "ROUND(c.fuel_kg / 1.8, 1) AS fuel_laps",
            "A CASE on c.tyre_age giving 'BOX', 'WATCH' or 'STAY OUT' AS call",
          ],
          starterAdd: sql`-- ── ✏️ YOUR TURN ───────────────────────────
-- Lesson 12: a strategy call for every car.
-- Columns: d.code, c.compound, c.tyre_age,
--   ROUND(c.fuel_kg / 1.8, 1) AS fuel_laps,
--   CASE: tyre_age >= 20 -> 'BOX', >= 15 -> 'WATCH', else 'STAY OUT' (AS call)
-- From car_status joined to drivers, in race order.
`,
          solutionAdd: sql`-- Strategy calls
SELECT
  d.code,
  c.compound,
  c.tyre_age,
  ROUND(c.fuel_kg / 1.8, 1) AS fuel_laps,
  CASE
    WHEN c.tyre_age >= 20 THEN 'BOX'
    WHEN c.tyre_age >= 15 THEN 'WATCH'
    ELSE 'STAY OUT'
  END AS call
FROM car_status AS c
JOIN drivers AS d ON d.driver_id = c.driver_id
ORDER BY c.position;`,
          explanation:
            "CASE is evaluated for each row and stops at the first true WHEN, so a car on 24-lap-old tyres gets BOX before the WATCH test is even tried. fuel_laps is computed fresh for every row from fuel_kg.",
          hints: [
            { id: "h1", title: "Biggest first", content: "Check >= 20 before >= 15. A 24-lap tyre also passes the >= 15 test, so the order of the WHENs decides the answer." },
            { id: "h2", title: "CASE shape", content: "CASE WHEN c.tyre_age >= 20 THEN 'BOX' WHEN c.tyre_age >= 15 THEN 'WATCH' ELSE 'STAY OUT' END AS call" },
            { id: "h3", title: "Fuel", content: "ROUND(c.fuel_kg / 1.8, 1) AS fuel_laps" },
          ],
          tests: [
            {
              id: "t1",
              description: "Has code, compound, tyre_age, fuel_laps and call",
              assertionCode: `assert(result, "Add a new SELECT for the strategy screen");
for (const c of ["code", "compound", "tyre_age", "fuel_laps", "call"]) assert(result.columns.includes(c), "Your result needs a " + c + " column");
assertEqual(rows.length, query("SELECT COUNT(*) AS n FROM car_status")[0].n, "One row per running car");`,
            },
            {
              id: "t2",
              description: "The right call for every car",
              assertionCode: `for (const r of rows) {
  const want = r.tyre_age >= 20 ? "BOX" : r.tyre_age >= 15 ? "WATCH" : "STAY OUT";
  assertEqual(r.call, want, r.code + " on " + r.tyre_age + "-lap tyres");
}`,
            },
            {
              id: "t3",
              description: "Fuel laps computed",
              assertionCode: `const fuel = new Map(query("SELECT d.code AS code, c.fuel_kg AS kg FROM car_status c JOIN drivers d ON d.driver_id = c.driver_id").map((r) => [r.code, r.kg]));
for (const r of rows) assertClose(r.fuel_laps, Math.round((fuel.get(r.code) / 1.8) * 10) / 10, 0.051, "fuel_laps for " + r.code);`,
            },
            {
              id: "t4",
              description: "In race order",
              assertionCode: `assert(result && result.columns.includes("call"), "Add a new SELECT with the strategy call for each car");
const order = query("SELECT d.code AS code FROM car_status c JOIN drivers d ON d.driver_id = c.driver_id ORDER BY c.position").map((r) => r.code);
assertEqual(rows.map((r) => r.code), order, "Codes in race order (ORDER BY c.position)");`,
            },
          ],
          unlocks: ["strategy"],
          checks: [
            {
              prompt: "A car has tyre_age 22. With `WHEN tyre_age >= 15 THEN 'WATCH' WHEN tyre_age >= 20 THEN 'BOX'`, what does CASE return?",
              question: { type: "choice", options: ["BOX", "WATCH", "NULL"], answer: 1 },
              explanation: "CASE stops at the first WHEN that is true, and 22 >= 15 is true. The BOX line is never reached, so put the strictest test first.",
            },
          ],
        },
        {
          id: "pit-wall-8-pitstop",
          title: "Box, box",
          minutes: 12,
          xp: 120,
          concepts: ["INSERT INTO", "UPDATE ... SET", "WHERE on writes"],
          learn: `### Why this matters

When a car pits, the numbers on the screen go stale: fresh tyres, a new stop on the list. The database has to be told. Until now every query only looked at the data; this lesson changes it.

### Writing data

So far every query only read. \`INSERT\` adds a new row:

~~~sql
INSERT INTO teams (name, country, founded)
VALUES ('Fennec Racing', 'Morocco', 2024);
~~~

List the columns, then the values in the same order. A column you leave out gets its default (or NULL if it has none); an \`INTEGER PRIMARY KEY\` like \`team_id\` numbers itself.

\`UPDATE\` changes rows that already exist:

~~~sql
UPDATE teams
SET country = 'Portugal', founded = 2023
WHERE name = 'Fennec Racing';
~~~

### Always check the WHERE

An UPDATE without WHERE changes **every row** in the table. Before you run one, read the WHERE out loud: "only the row where...". Then query the table to confirm what changed:

~~~sql
SELECT name, country, founded FROM teams WHERE name = 'Fennec Racing';
~~~

| name | country | founded |
| --- | --- | --- |
| Fennec Racing | Portugal | 2023 |

(That is what you'd see after running the INSERT and the UPDATE above, in that order.)`,
          mission: `Your strategy screen says **BOX** for Kai Hartmann (driver_id 5, car 11). He's in this lap. The crew fit hards in 2.38 seconds.

Record it like the team's timing system would:

- INSERT the stop into pit_stops: driver 5, lap 25, 2380 ms, new compound 'HARD'
- UPDATE his row in car_status: compound 'HARD', tyre_age 0. Only his row!
- Finish with a pit log query so the screen shows every stop, oldest first, with driver codes.`,
          tasks: [
            "INSERT INTO pit_stops (driver_id, lap, duration_ms, new_compound) VALUES (5, 25, 2380, 'HARD')",
            "UPDATE car_status SET compound = 'HARD', tyre_age = 0 WHERE driver_id = 5",
            "SELECT p.lap, d.code, p.duration_ms, p.new_compound from pit_stops joined to drivers",
            "ORDER BY p.lap so the new stop is last",
          ],
          starterAdd: sql`-- ── ✏️ YOUR TURN ───────────────────────────
-- Lesson 13: box Hartmann (driver_id 5) on lap 25.
-- 1. INSERT the stop: driver 5, lap 25, 2380 ms, 'HARD'
-- 2. UPDATE car_status: compound 'HARD', tyre_age 0, only for driver 5
-- 3. SELECT p.lap, d.code, p.duration_ms, p.new_compound
--    FROM pit_stops AS p joined to drivers AS d, ORDER BY p.lap
`,
          solutionAdd: sql`-- Box, box: record Hartmann's stop
INSERT INTO pit_stops (driver_id, lap, duration_ms, new_compound)
VALUES (5, 25, 2380, 'HARD');

UPDATE car_status
SET compound = 'HARD', tyre_age = 0
WHERE driver_id = 5;

-- Pit log
SELECT p.lap, d.code, p.duration_ms, p.new_compound
FROM pit_stops AS p
JOIN drivers AS d ON d.driver_id = p.driver_id
ORDER BY p.lap;`,
          explanation:
            "INSERT adds one row and lets stop_id number itself. UPDATE rewrites only the rows its WHERE matches, so just Hartmann's car gets fresh hards. The final SELECT reads the table back, which is how you confirm a write did what you meant.",
          hints: [
            { id: "h1", title: "INSERT shape", content: "INSERT INTO pit_stops (driver_id, lap, duration_ms, new_compound) VALUES (5, 25, 2380, 'HARD');" },
            { id: "h2", title: "UPDATE shape", content: "UPDATE car_status SET compound = 'HARD', tyre_age = 0 WHERE driver_id = 5;" },
            { id: "h3", title: "The pit log", content: "SELECT p.lap, d.code, p.duration_ms, p.new_compound FROM pit_stops AS p JOIN drivers AS d ON d.driver_id = p.driver_id ORDER BY p.lap;" },
          ],
          tests: [
            {
              id: "t1",
              description: "The stop is recorded",
              assertionCode: `const stops = query("SELECT * FROM pit_stops WHERE driver_id = 5");
assertEqual(stops.length, 1, "Rows in pit_stops for driver 5 (INSERT exactly one)");
assertEqual(stops[0].lap, 25, "lap");
assertEqual(stops[0].duration_ms, 2380, "duration_ms");
assertEqual(stops[0].new_compound, "HARD", "new_compound");`,
            },
            {
              id: "t2",
              description: "Hartmann is on fresh hards",
              assertionCode: `const car = query("SELECT compound, tyre_age FROM car_status WHERE driver_id = 5")[0];
assertEqual(car.compound, "HARD", "Driver 5's compound");
assertEqual(car.tyre_age, 0, "Driver 5's tyre_age");`,
            },
            {
              id: "t3",
              description: "No other car was changed",
              assertionCode: `const fresh = query("SELECT COUNT(*) AS n FROM car_status WHERE tyre_age = 0")[0].n;
assertEqual(fresh, 1, "Cars with tyre_age 0 (does your UPDATE have WHERE driver_id = 5?)");`,
            },
            {
              id: "t4",
              description: "The pit log shows every stop, newest last",
              assertionCode: `assert(result && result.columns.includes("lap") && result.columns.includes("code"), "End with a SELECT of p.lap, d.code, ... from pit_stops");
assertEqual(rows.length, query("SELECT COUNT(*) AS n FROM pit_stops")[0].n, "Rows in the pit log");
const last = rows[rows.length - 1];
assert(last.lap === 25 && last.code === "HAR", "The last row should be Hartmann's lap-25 stop (ORDER BY p.lap)");`,
            },
          ],
          unlocks: ["pitlog"],
          checks: [
            {
              prompt: "What happens if you run `UPDATE car_status SET tyre_age = 0;` with no WHERE?",
              question: { type: "choice", options: ["Nothing, SQL needs a WHERE", "Every car's tyre_age becomes 0", "Only the first row changes"], answer: 1 },
              explanation: "Without a WHERE, an UPDATE applies to every row of the table. Always read the WHERE out loud before you run it.",
            },
          ],
        },
      ],
    },
  ],
};
