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
 *  - The scene (src/scenes/sqldesk) gets every result set and picks one per panel by what the
 *    statement does: FROM pit_stops → pit log, CASE → strategy, GROUP BY → pace chart,
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
  team_id INTEGER NOT NULL REFERENCES teams(team_id)
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
    `INSERT INTO drivers VALUES\n${DRIVERS.map((d) => `(${d.id}, ${d.number}, ${q(d.code)}, ${q(d.name)}, ${q(d.country)}, ${d.team})`).join(",\n")};`,
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
  hours: 2.5,
  sceneId: "sqldesk",
  accent: { from: "#a3e635", to: "#4d7c0f" },
  controls: [],
  skills: ["SELECT & FROM", "WHERE", "ORDER BY & LIMIT", "aggregates", "GROUP BY & HAVING", "JOIN", "CASE & computed columns", "INSERT & UPDATE"],
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
      blurb: "Read the database: pick columns, filter rows, sort them.",
      lessons: [
        {
          id: "pit-wall-1-roster",
          title: "Driver roster",
          minutes: 6,
          xp: 50,
          concepts: ["SELECT", "FROM", "columns", "comments"],
          learn: `### Tables, rows and columns

A database keeps data in **tables**. Each **row** is one thing (one driver), each **column** is one fact about it (their number, their name).

To read a table, you write a **query**:

~~~sql
SELECT name, country FROM drivers;
~~~

- \`SELECT\` lists the columns you want, separated by commas.
- \`FROM\` says which table to read.
- The \`;\` ends the statement.

\`SELECT * FROM drivers;\` means "every column", which is handy for a quick look. On a real dashboard you name the columns, so the screen gets exactly what it shows.

Keywords are not case-sensitive, but writing them in CAPITALS makes queries easy to scan. Lines starting with \`--\` are **comments**: SQL skips them.

### The pit wall database

- \`teams\`: team_id, name, country, founded
- \`drivers\`: driver_id, number, code, name, country, team_id
- \`laps\`: lap_id, driver_id, lap, lap_ms, compound, tyre_age, pit_lap
- \`pit_stops\`: stop_id, driver_id, lap, duration_ms, new_compound
- \`car_status\`: driver_id, position, gap_s, compound, tyre_age, fuel_kg

The schema panel on the stage lists them too.`,
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
              assertionCode: `const codes = query("SELECT code FROM drivers").map((r) => r.code);
assert(rows.every((r) => codes.includes(r.code)), "Every row should be a driver from the drivers table");`,
            },
          ],
          unlocks: ["roster"],
        },
        {
          id: "pit-wall-2-timing",
          title: "Live timing",
          minutes: 8,
          xp: 60,
          concepts: ["WHERE", "comparisons", "AND / OR", "IN"],
          learn: `### WHERE keeps only the rows you want

Add \`WHERE\` after \`FROM\` with a condition. Only rows where it is true come back.

~~~sql
SELECT name FROM drivers WHERE country = 'Japan';
~~~

Comparisons: \`=\`, \`!=\` (or \`<>\`), \`<\`, \`<=\`, \`>\`, \`>=\`. Text goes in **single quotes**; numbers don't.

Combine conditions with \`AND\` (both must be true) and \`OR\` (either one):

~~~sql
SELECT code FROM drivers WHERE team_id = 1 OR team_id = 2;
SELECT code FROM drivers WHERE team_id IN (1, 2);   -- same thing, shorter
~~~

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
            { id: "h3", title: "Keep the old query", content: "Leave lesson 1's query where it is and add the new one below it. Each statement ends with ;" },
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
        },
        {
          id: "pit-wall-3-fastest",
          title: "Fastest laps",
          minutes: 7,
          xp: 60,
          concepts: ["ORDER BY", "ASC / DESC", "LIMIT"],
          learn: `### Sorting with ORDER BY

Rows come back in whatever order the database finds convenient. \`ORDER BY\` puts them in the order you choose:

~~~sql
SELECT code, number FROM drivers ORDER BY number;        -- smallest first
SELECT code, number FROM drivers ORDER BY number DESC;   -- largest first
~~~

\`ASC\` (ascending) is the default; \`DESC\` flips it. Text sorts alphabetically.

You can sort by several columns: \`ORDER BY team_id, number\` sorts by team, then by number inside each team.

### LIMIT keeps the top few

\`LIMIT 3\` returns only the first 3 rows **after** sorting. That's how you build any "top N" list.

~~~sql
SELECT code, number FROM drivers ORDER BY number DESC LIMIT 3;
~~~

The order matters: \`SELECT ... FROM ... WHERE ... ORDER BY ... LIMIT ...\`.`,
          mission: `The race engineers want a **fastest laps board**: the ten quickest laps of the race so far, quickest at the top.

Lower lap_ms is faster, so think about which direction to sort.`,
          tasks: [
            "Select driver_id, lap and lap_ms from laps",
            "Sort so the fastest (smallest lap_ms) comes first",
            "Keep only the top 10",
          ],
          starterAdd: sql`-- ── ✏️ YOUR TURN ───────────────────────────
-- Lesson 3: the ten fastest laps of the race.
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
assertEqual(rows.length, 10, "Number of rows (use LIMIT 10)");`,
            },
            {
              id: "t2",
              description: "Fastest lap first",
              assertionCode: `const best = query("SELECT MIN(lap_ms) AS ms FROM laps")[0].ms;
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
        },
      ],
    },
    {
      id: "numbers",
      title: "Crunch the numbers",
      blurb: "Summarise thousands of seconds into a few numbers, then connect the tables.",
      lessons: [
        {
          id: "pit-wall-4-stats",
          title: "Race stats",
          minutes: 8,
          xp: 70,
          concepts: ["COUNT", "MIN / MAX", "AVG", "ROUND", "AS aliases"],
          learn: `### Aggregate functions squash many rows into one

~~~sql
SELECT COUNT(*) FROM laps;        -- how many rows
SELECT MIN(lap_ms) FROM laps;     -- smallest value
SELECT MAX(lap) FROM laps;        -- largest value
SELECT AVG(lap_ms) FROM laps;     -- mean value
SELECT SUM(duration_ms) FROM pit_stops;
~~~

\`COUNT(DISTINCT driver_id)\` counts different values only, so 24 laps by the same car count once.

You can ask for several at once; the answer is a single row.

### Name your columns with AS

Without a name, a column is called something like \`AVG(lap_ms)\`. Give it a clean one:

~~~sql
SELECT ROUND(AVG(lap_ms)) AS avg_ms FROM laps;
~~~

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
-- Lesson 4: race stats in one row.
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
        },
        {
          id: "pit-wall-5-pace",
          title: "Pace chart",
          minutes: 10,
          xp: 80,
          concepts: ["GROUP BY", "HAVING", "WHERE vs HAVING"],
          learn: `### GROUP BY: one answer per group

An aggregate on its own summarises the whole table. Add \`GROUP BY\` and you get one row **per group** instead:

~~~sql
SELECT compound, COUNT(*) AS laps
FROM laps
GROUP BY compound;
~~~

That returns one row for SOFT, one for MEDIUM and one for HARD. Every column you select should either be in the GROUP BY or inside an aggregate.

### HAVING filters groups

\`WHERE\` throws away **rows** before they are grouped. \`HAVING\` throws away **groups** after the aggregates are worked out, so it can use them:

~~~sql
SELECT compound, COUNT(*) AS laps
FROM laps
WHERE lap > 1               -- rows: skip the opening lap
GROUP BY compound
HAVING COUNT(*) >= 50       -- groups: only busy compounds
ORDER BY laps DESC;
~~~

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
-- Lesson 5: average race pace per driver.
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
              assertionCode: `const truth = new Map(query("SELECT driver_id, AVG(lap_ms) AS avg FROM laps WHERE pit_lap = 0 GROUP BY driver_id").map((r) => [r.driver_id, r.avg]));
for (const r of rows) assertClose(r.avg_ms, Math.round(truth.get(r.driver_id)), 0.5, "avg_ms for driver " + r.driver_id + " (did you keep only pit_lap = 0?)");`,
            },
            {
              id: "t4",
              description: "Quickest average first",
              assertionCode: `for (let i = 1; i < rows.length; i++) assert(rows[i - 1].avg_ms <= rows[i].avg_ms, "Sort with ORDER BY avg_ms");`,
            },
          ],
          unlocks: ["pace"],
        },
        {
          id: "pit-wall-6-tower",
          title: "Timing tower",
          minutes: 12,
          xp: 90,
          concepts: ["JOIN ... ON", "table aliases", "qualified columns"],
          learn: `### Data lives in several tables

\`car_status\` knows each car's position, but only by \`driver_id\`. The names are in \`drivers\`, and the team names are in \`teams\`. A **JOIN** stitches rows from two tables together wherever a condition matches:

~~~sql
SELECT drivers.code, teams.name
FROM drivers
JOIN teams ON teams.team_id = drivers.team_id;
~~~

For every driver, SQL finds the team whose \`team_id\` matches and glues the two rows side by side.

### Aliases keep it short

Give each table a short alias and use it to say which table a column comes from:

~~~sql
SELECT d.code, t.name AS team
FROM drivers AS d
JOIN teams AS t ON t.team_id = d.team_id;
~~~

Both tables have a \`name\` column, so \`t.name AS team\` avoids two columns called name.

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
-- Lesson 6: the timing tower.
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
          learn: `### Compute new columns

A SELECT can do maths on the way out. The result is a new column that isn't stored anywhere:

~~~sql
SELECT code, number * 2 AS doubled FROM drivers;
SELECT ROUND(gap_s / 60, 2) AS gap_min FROM car_status;
~~~

### CASE: if/else inside a query

\`CASE\` checks conditions top to bottom and returns the value of the first one that is true:

~~~sql
SELECT code,
  CASE
    WHEN number < 10 THEN 'single digit'
    WHEN number < 50 THEN 'double digit'
    ELSE 'big number'
  END AS style
FROM drivers;
~~~

Order matters: a car with number 4 matches the first WHEN and stops there. \`ELSE\` catches everything left over (without it you get NULL).`,
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
-- Lesson 7: a strategy call for every car.
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
              assertionCode: `const order = query("SELECT d.code AS code FROM car_status c JOIN drivers d ON d.driver_id = c.driver_id ORDER BY c.position").map((r) => r.code);
assertEqual(rows.map((r) => r.code), order, "Codes in race order (ORDER BY c.position)");`,
            },
          ],
          unlocks: ["strategy"],
        },
        {
          id: "pit-wall-8-pitstop",
          title: "Box, box",
          minutes: 12,
          xp: 120,
          concepts: ["INSERT INTO", "UPDATE ... SET", "WHERE on writes"],
          learn: `### Writing data

So far every query only read. \`INSERT\` adds a new row:

~~~sql
INSERT INTO teams (name, country, founded)
VALUES ('Fennec Racing', 'Morocco', 2024);
~~~

List the columns, then the values in the same order. A column you leave out gets its default; an \`INTEGER PRIMARY KEY\` like \`team_id\` numbers itself.

\`UPDATE\` changes rows that already exist:

~~~sql
UPDATE teams
SET country = 'Portugal', founded = 2023
WHERE name = 'Fennec Racing';
~~~

### Always check the WHERE

An UPDATE without WHERE changes **every row** in the table. Before you run one, read the WHERE out loud: "only the row where...". Then query the table to confirm what changed.`,
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
-- Lesson 8: box Hartmann (driver_id 5) on lap 25.
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
        },
      ],
    },
  ],
};
