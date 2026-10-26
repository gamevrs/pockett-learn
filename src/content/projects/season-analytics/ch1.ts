import type { Chapter } from "@/engine/types";
import { md, sql, t } from "./util.ts";

/**
 * Chapter 1: questions inside questions.
 * Scalar subqueries and IN, correlated subqueries and EXISTS, CTEs, conditional aggregation.
 */
export const chapter1: Chapter = {
  id: "questions",
  title: "Questions inside questions",
  blurb: "Subqueries, CTEs and conditional aggregation: answer a question that needs another answer first.",
  lessons: [
    // ───────────────────────────── 1 ─────────────────────────────
    {
      id: "season-analytics-1-benchmarks",
      title: "Season benchmarks",
      minutes: 14,
      xp: 80,
      concepts: ["scalar subquery", "subquery in WHERE", "IN (SELECT ...)", "nested subqueries"],
      learn: md`### A query inside a query

Last time you read one race. Now the whole 2026 season is in the database: ten Grands Prix, thirteen drivers, five thousand laps. Many season questions need *another answer first*: "who scored more than the **average**?" needs the average before it can compare anything.

A **subquery** is a \`SELECT\` in parentheses, used where a value (or a list) is expected. The simplest kind is a **scalar subquery**: one column, one row, so it behaves like a single number.

~~~sql
-- in WHERE: results above the average
SELECT COUNT(*) AS big_hauls
FROM results
WHERE points > (
  SELECT AVG(points) FROM results
);

-- as a column: drivers and the round count
SELECT code,
       (SELECT COUNT(*) FROM races) AS rounds
FROM drivers;
~~~

The database runs the inner query first and drops its answer into the outer one. Nothing is typed in by hand, so the question stays correct when new races are added.

### IN with a subquery

When the inner query returns a *list* (one column, many rows), test membership with \`IN\`:

~~~sql
SELECT name
FROM drivers
WHERE driver_id IN (
  SELECT driver_id FROM results WHERE finish_pos = 1
);
~~~

A driver with three wins appears **once**, because \`IN\` only asks "is this id in the list?". A join to \`results\` would repeat the driver once per win. Both are valid; pick the one that matches the question.

### SQLite differences worth knowing

- If a scalar subquery returns **more than one row**, Postgres and MySQL raise an error. SQLite silently uses the *first* row, which makes mistakes hard to spot. Use an aggregate (\`MAX\`, \`AVG\`) or \`LIMIT 1\` on purpose.
- If it returns **no rows**, the value is \`NULL\`.
- Subqueries can nest: the innermost one runs first.

### Common mistakes

- Forgetting the parentheses around the inner \`SELECT\`.
- Using \`=\` with a subquery that returns many rows. Use \`IN\`.
- Selecting two columns in a subquery that feeds \`IN\`: it must return exactly one.`,
      mission: md`You are the new analyst at **Halcyon Racing**, and the team principal wants a dashboard for the whole 2026 season. Pit Wall showed you one race; this one covers all ten.

First screen: the **season benchmarks**, a row of headline numbers that every later chart will be judged against. Then a list of everyone who has won at least one race.`,
      tasks: [
        "Write one SELECT of five scalar subqueries: rounds, entries, avg_points, above_avg and best_lap_ms",
        "above_avg counts the results that scored more than the average (a subquery inside a subquery)",
        "Write a second SELECT: the code and name of every driver who has won a race, using IN (SELECT ...), ordered by code",
      ],
      starterAdd: sql`-- ── ✏️ YOUR TURN ───────────────────────────
-- Lesson 1: season benchmarks.
-- The season database is loaded: teams, drivers, circuits, races, results,
-- qualifying, laps, pit_stops, penalties, points_rules.
--
-- 1. ONE row, five columns, each one a scalar subquery:
--      rounds      how many races are in the races table
--      entries     how many rows are in results
--      avg_points  ROUND(AVG(points), 2) over results
--      above_avg   how many results scored MORE than the average points
--      best_lap_ms the fastest lap in laps (MIN(lap_ms))
-- 2. The code and name of every driver who has won a race (finish_pos = 1),
--    using IN (SELECT ...). Order by code.
`,
      solutionAdd: sql`-- Season benchmarks
SELECT
  (SELECT COUNT(*) FROM races) AS rounds,
  (SELECT COUNT(*) FROM results) AS entries,
  (SELECT ROUND(AVG(points), 2) FROM results) AS avg_points,
  (SELECT COUNT(*) FROM results WHERE points > (SELECT AVG(points) FROM results)) AS above_avg,
  (SELECT MIN(lap_ms) FROM laps) AS best_lap_ms;

-- Race winners
SELECT code, name
FROM drivers
WHERE driver_id IN (SELECT driver_id FROM results WHERE finish_pos = 1)
ORDER BY code;`,
      explanation:
        "Each parenthesised SELECT returns one value, so the outer query is just a row of numbers. above_avg nests a second subquery inside the first: the average is worked out, then used to filter, then counted. The winners list uses IN with a one-column subquery, so a driver with several wins still appears once.",
      hints: [
        { id: "h1", title: "A scalar subquery", content: "Wrap a normal query in parentheses and give it a name: (SELECT COUNT(*) FROM races) AS rounds. A SELECT with no FROM of its own can contain several of these separated by commas." },
        { id: "h2", title: "Above average", content: "(SELECT COUNT(*) FROM results WHERE points > (SELECT AVG(points) FROM results)) AS above_avg. The inner AVG runs first." },
        { id: "h3", title: "Winners", content: "SELECT code, name FROM drivers WHERE driver_id IN (SELECT driver_id FROM results WHERE finish_pos = 1) ORDER BY code;" },
      ],
      tests: [
        {
          id: "t1",
          description: "One row with rounds, entries, avg_points, above_avg and best_lap_ms",
          assertionCode: t`const rs = need(["rounds", "entries", "avg_points", "above_avg", "best_lap_ms"], "Add a SELECT whose columns are named rounds, entries, avg_points, above_avg and best_lap_ms");
assertEqual(rs.rows.length, 1, "A SELECT made only of scalar subqueries returns exactly one row");`,
        },
        {
          id: "t2",
          description: "The benchmark numbers match the database",
          assertionCode: t`const got = data(["rounds", "entries", "avg_points", "above_avg", "best_lap_ms"])[0];
const want = one("SELECT (SELECT COUNT(*) FROM races) AS rounds, (SELECT COUNT(*) FROM results) AS entries, (SELECT ROUND(AVG(points), 2) FROM results) AS avg_points, (SELECT COUNT(*) FROM results WHERE points > (SELECT AVG(points) FROM results)) AS above_avg, (SELECT MIN(lap_ms) FROM laps) AS best_lap_ms");
for (const k of Object.keys(want)) assert(eq(got[k], want[k], 0.006), k + " should be " + want[k] + " but your query gives " + got[k]);`,
        },
        {
          id: "t3",
          description: "Built from subqueries, not typed-in numbers",
          assertionCode: t`const rs = need(["rounds", "entries", "avg_points", "above_avg", "best_lap_ms"]);
const n = (sqlOf(rs).match(/\(\s*select/g) || []).length;
assert(n >= 6, "Use a subquery for every column (and one more inside above_avg): that is 6 parenthesised SELECTs. I found " + n);`,
        },
        {
          id: "t4",
          description: "Winners found with IN (SELECT ...), each listed once",
          assertionCode: t`const got = data(["code", "name"], "Add a SELECT of code and name for the drivers who have won a race, using IN (SELECT ...)", /\bin\s*\(\s*select/).map((r) => r.code);
const want = query("SELECT DISTINCT d.code AS code FROM drivers d JOIN results r ON r.driver_id = d.driver_id WHERE r.finish_pos = 1 ORDER BY d.code").map((r) => r.code);
assertEqual(new Set(got).size, got.length, "A winner should appear once (IN only tests membership)");
assertEqual(got, want, "Winners ordered by code");`,
        },
      ],
      unlocks: ["sa-benchmarks"],
      checks: [
        {
          prompt: "A scalar subquery in `WHERE x = (SELECT ...)` returns three rows. What does SQLite do?",
          question: {
            type: "choice",
            options: ["Raises an error, like Postgres", "Quietly uses the first row", "Compares x with all three and keeps any match", "Returns no rows"],
            answer: 1,
          },
          explanation: "SQLite does not complain: a scalar subquery with several rows contributes only its first row. That is convenient and dangerous, so aggregate (MAX, AVG) or add LIMIT 1 so the choice is deliberate. For a list of values use IN.",
        },
        {
          prompt: "Adeyemi has 2 wins. How many times does `SELECT name FROM drivers WHERE driver_id IN (SELECT driver_id FROM results WHERE finish_pos = 1)` list her?",
          question: { type: "number", answer: 1 },
          explanation: "IN only asks whether her driver_id is somewhere in the list, so she appears once however many wins she has. A JOIN from drivers to results filtered on finish_pos = 1 would return one row per win, i.e. two.",
        },
      ],
    },

    // ───────────────────────────── 2 ─────────────────────────────
    {
      id: "season-analytics-2-form",
      title: "Form guide",
      minutes: 18,
      xp: 90,
      concepts: ["correlated subquery", "EXISTS / NOT EXISTS", "subquery vs JOIN"],
      learn: md`### Subqueries that look at the outer row

So far the inner query could run alone. A **correlated subquery** mentions a column of the outer query, so it is worked out *again for every outer row*:

~~~sql
SELECT d.code,
       (SELECT MAX(r.points)
        FROM results AS r
        WHERE r.driver_id = d.driver_id
       ) AS best_haul
FROM drivers AS d;
~~~

Read it as a loop: "for each driver, find the biggest points haul among **that driver's** results". The inner \`d.driver_id\` is the outer row's value.

### EXISTS: is there at least one?

Sometimes you do not want a value, only a yes or no. \`EXISTS\` is true as soon as the inner query finds one row:

~~~sql
SELECT t.name
FROM teams AS t
WHERE EXISTS (
  SELECT 1
  FROM drivers AS d
  JOIN results AS r
    ON r.driver_id = d.driver_id
  WHERE d.team_id = t.team_id
    AND r.finish_pos = 1
);
~~~

What the inner query selects does not matter (\`SELECT 1\` is the habit), only whether any row comes back. \`NOT EXISTS\` keeps the outer rows with **no** match. Both stop searching at the first hit and never duplicate an outer row.

### Subquery or JOIN?

- Need **columns** from the other table (the winner's name next to the team)? Use a **JOIN**.
- Need a **yes/no** ("has this team won?")? Use **EXISTS**. A join to a one-to-many table repeats the team once per winning driver and forces a \`DISTINCT\`.
- Need **one number per row** (best finish, latest points)? A correlated subquery reads well; a join with \`GROUP BY\` is the alternative when it must be fast on large tables.

### Common mistakes

- **Unqualified names bind to the inner table.** In \`WHERE driver_id = driver_id\` both sides are \`results.driver_id\`, so the condition is always true and every driver gets the same answer. Alias every table and qualify every column in a correlated subquery.
- Using \`SELECT *\` in a subquery that must return one column.
- Expecting a correlated subquery to be free: it can run once per outer row.`,
      mission: md`The team principal opens the dashboard and asks three questions before his coffee is cold:

- *How is each driver doing?* Their **best finish** this season and the **points from their latest race**.
- *Which teams have won a race?*
- *Who has never been on a podium?*

None of them is a plain join. Each needs an answer *per row*, or a yes/no.`,
      tasks: [
        "Form guide: code, name, best_finish (correlated MIN of finish_pos) and last_points (points from their most recent round), for every driver",
        "Teams that have won a race: a name column, using EXISTS, ordered by name",
        "Drivers who have never finished in the top three: a code column, using NOT EXISTS, ordered by code",
      ],
      starterAdd: sql`-- ── ✏️ YOUR TURN ───────────────────────────
-- Lesson 2: the form guide.
-- 1. One row per driver (alias drivers AS d): d.code, d.name and two correlated subqueries
--      best_finish  the lowest finish_pos in that driver's results
--      last_points  the points from their latest race (join races, ORDER BY round DESC LIMIT 1)
--    Order by d.driver_id.
-- 2. Teams with a winner: SELECT t.name FROM teams AS t WHERE EXISTS (...). Order by name.
-- 3. Drivers with no podium: SELECT d.code ... WHERE NOT EXISTS (...). Order by code.
--    (A podium is finish_pos <= 3.)
`,
      solutionAdd: sql`-- Form guide
SELECT
  d.code,
  d.name,
  (SELECT MIN(r.finish_pos)
   FROM results AS r
   WHERE r.driver_id = d.driver_id) AS best_finish,
  (SELECT r.points
   FROM results AS r
   JOIN races AS ra ON ra.race_id = r.race_id
   WHERE r.driver_id = d.driver_id
   ORDER BY ra.round DESC
   LIMIT 1) AS last_points
FROM drivers AS d
ORDER BY d.driver_id;

-- Teams that have won a race
SELECT t.name
FROM teams AS t
WHERE EXISTS (
  SELECT 1
  FROM drivers AS d
  JOIN results AS r ON r.driver_id = d.driver_id
  WHERE d.team_id = t.team_id AND r.finish_pos = 1
)
ORDER BY t.name;

-- Drivers who have never been on the podium
SELECT d.code
FROM drivers AS d
WHERE NOT EXISTS (
  SELECT 1
  FROM results AS r
  WHERE r.driver_id = d.driver_id AND r.finish_pos <= 3
)
ORDER BY d.code;`,
      explanation:
        "Each correlated subquery is rerun for every driver with that driver's id plugged in. best_finish is an aggregate over their rows; last_points sorts their races newest first and takes one. EXISTS and NOT EXISTS only care whether the inner query finds a row, so a team with two winners is still listed once.",
      hints: [
        { id: "h1", title: "Correlate with the outer alias", content: "Inside the subquery compare to the outer table's alias: WHERE r.driver_id = d.driver_id. Qualify both sides." },
        { id: "h2", title: "Latest race", content: "Join results to races inside the subquery, ORDER BY ra.round DESC and LIMIT 1 to keep the newest race's points." },
        { id: "h3", title: "EXISTS shape", content: "WHERE EXISTS (SELECT 1 FROM drivers AS d JOIN results AS r ON r.driver_id = d.driver_id WHERE d.team_id = t.team_id AND r.finish_pos = 1). For the podium list use NOT EXISTS over results with finish_pos <= 3." },
      ],
      tests: [
        {
          id: "t1",
          description: "A form guide row for every driver",
          assertionCode: t`const rs = need(["code", "name", "best_finish", "last_points"], "Add the form guide: code, name, best_finish and last_points for every driver");
assertEqual(rs.rows.length, one("SELECT COUNT(*) AS n FROM drivers").n, "One row per driver (including the reserve driver)");
assert((sqlOf(rs).match(/\(\s*select/g) || []).length >= 2, "best_finish and last_points should each be a subquery in the SELECT list");`,
        },
        {
          id: "t2",
          description: "best_finish is each driver's best result",
          assertionCode: t`const got = data(["code", "best_finish", "last_points"]);
const want = query("SELECT d.code AS code, MIN(r.finish_pos) AS best_finish FROM drivers d JOIN results r ON r.driver_id = d.driver_id GROUP BY d.driver_id");
match(got, want, "code", ["best_finish"], "the form guide");`,
        },
        {
          id: "t3",
          description: "last_points comes from the latest race each driver entered",
          assertionCode: t`const got = data(["code", "best_finish", "last_points"]);
const all = query("SELECT d.code AS code, ra.round AS round, r.points AS points FROM results r JOIN races ra ON ra.race_id = r.race_id JOIN drivers d ON d.driver_id = r.driver_id");
const latest = new Map();
for (const r of all) if (!latest.has(r.code) || r.round > latest.get(r.code).round) latest.set(r.code, r);
for (const g of got) {
  const w = latest.get(g.code);
  assert(w, "Unknown driver " + g.code);
  assert(g.last_points === w.points, g.code + " last_points is " + g.last_points + ", expected " + w.points + " (their points in round " + w.round + "). Sort the subquery by ra.round DESC and take one row");
}`,
        },
        {
          id: "t4",
          description: "Teams with a winner, found with EXISTS",
          assertionCode: t`const got = data(["name"], "Add a SELECT of team names using WHERE EXISTS (...)", /\bexists\s*\(/, /\bnot\s+exists\b/).map((r) => r.name);
const want = query("SELECT DISTINCT t.name AS name FROM teams t JOIN drivers d ON d.team_id = t.team_id JOIN results r ON r.driver_id = d.driver_id WHERE r.finish_pos = 1 ORDER BY t.name").map((r) => r.name);
assertEqual(got, want, "Teams that have won, ordered by name");`,
        },
        {
          id: "t5",
          description: "Drivers who never reached the podium, found with NOT EXISTS",
          assertionCode: t`const got = data(["code"], "Add a SELECT of driver codes using WHERE NOT EXISTS (...)", /\bnot\s+exists\b/).map((r) => r.code);
const want = query("SELECT d.code AS code FROM drivers d WHERE d.driver_id NOT IN (SELECT driver_id FROM results WHERE finish_pos <= 3) ORDER BY d.code").map((r) => r.code);
assertEqual(got, want, "Drivers with no top-three finish, ordered by code");`,
        },
      ],
      unlocks: ["sa-form"],
      checks: [
        {
          prompt: "Inside `(SELECT MAX(points) FROM results AS r WHERE driver_id = driver_id)`, which `driver_id` does each side refer to?",
          question: {
            type: "choice",
            options: [
              "Left is results.driver_id, right is the outer drivers.driver_id",
              "Both are results.driver_id, so the condition is always true",
              "Both are drivers.driver_id",
              "SQLite raises an ambiguity error",
            ],
            answer: 1,
          },
          explanation: "An unqualified column name binds to the nearest table that has it, which is the inner results table. Both sides become r.driver_id, the filter never filters, and every driver gets the best haul of the whole table. Always write d.driver_id.",
        },
        {
          prompt: "You need each team's name **and the name of its winning driver** in the same row. EXISTS or JOIN?",
          question: { type: "choice", options: ["EXISTS", "JOIN"], answer: 1 },
          explanation: "EXISTS can only answer yes or no; nothing from its inner query is available outside it. Whenever you need columns from the other table, you need a JOIN.",
        },
      ],
    },

    // ───────────────────────────── 3 ─────────────────────────────
    {
      id: "season-analytics-3-leaders",
      title: "Points table with CTEs",
      minutes: 18,
      xp: 100,
      concepts: ["WITH (CTE)", "chained CTEs", "readable multi-step queries"],
      learn: md`### Name your steps

Nested subqueries answer hard questions but read like an onion: you have to start in the middle. A **common table expression** (CTE) lets you give each step a name and write the query top to bottom, like a recipe:

~~~sql
WITH wins AS (
  SELECT driver_id, COUNT(*) AS n
  FROM results
  WHERE finish_pos = 1
  GROUP BY driver_id
)
SELECT d.code, wins.n
FROM wins
JOIN drivers AS d
  ON d.driver_id = wins.driver_id;
~~~

\`WITH name AS ( ... )\` defines a temporary named result that the main query can use like a table.

### Several steps

Separate CTEs with commas. A later CTE may use an earlier one:

~~~sql
WITH totals AS (
  SELECT driver_id, SUM(points) AS points
  FROM results
  GROUP BY driver_id
),
leader AS (
  SELECT MAX(points) AS top_points
  FROM totals
)
SELECT d.code, totals.points,
       leader.top_points - totals.points AS gap
FROM totals
JOIN drivers AS d
  ON d.driver_id = totals.driver_id
CROSS JOIN leader;
~~~

\`leader\` is a one-row table, so \`CROSS JOIN\` attaches its single value to every driver. That is the standard way to compare each row with an overall figure.

### What a CTE is (and is not)

- It lives for **one statement**. After the semicolon it is gone; it is not a variable and not a saved table (that is a view, two lessons from now).
- SQLite is free to merge a CTE into the main query or to compute it once and reuse it. If it matters you can write \`AS MATERIALIZED (...)\` or \`AS NOT MATERIALIZED (...)\` (SQLite 3.35+, like PostgreSQL 12+).
- A CTE and a subquery in \`FROM\` can express exactly the same thing. Choose the CTE when you would otherwise nest more than one level, or use the same step twice.
- Postgres, MySQL 8 and SQL Server all support \`WITH\`; MySQL 5.7 does not.

### Common mistakes

- A comma after the *last* CTE, or a missing comma between two.
- Putting \`WITH\` in the middle of a statement. It comes first.
- Trying to use the CTE in the next statement.
- Joining two aggregated CTEs on the wrong key: check the row count before and after.`,
      mission: md`The championship table is the heart of every racing dashboard: each driver's points, and how far behind the leader they are. It needs two steps (add up the points, then find the leader) and then a presentable join with names and teams.

That is exactly what a CTE chain is for.`,
      tasks: [
        "A CTE driver_totals: driver_id and SUM(points) AS points, grouped by driver",
        "A second CTE leader: MAX(points) AS top_points taken from driver_totals",
        "Final SELECT: d.code, d.name, t.name AS team, points and gap (top_points minus points), ordered by points DESC then code",
      ],
      starterAdd: sql`-- ── ✏️ YOUR TURN ───────────────────────────
-- Lesson 3: the points table.
-- WITH driver_totals AS (...),   -- driver_id, SUM(points) AS points
--      leader AS (...)           -- MAX(points) AS top_points, from driver_totals
-- SELECT d.code, d.name, t.name AS team, points, gap   (gap = top_points - points)
-- joining drivers (d) and teams (t). Highest points first, then code.
`,
      solutionAdd: sql`-- Points table
WITH driver_totals AS (
  SELECT driver_id, SUM(points) AS points
  FROM results
  GROUP BY driver_id
),
leader AS (
  SELECT MAX(points) AS top_points
  FROM driver_totals
)
SELECT
  d.code,
  d.name,
  t.name AS team,
  dt.points,
  leader.top_points - dt.points AS gap
FROM driver_totals AS dt
JOIN drivers AS d ON d.driver_id = dt.driver_id
JOIN teams AS t ON t.team_id = d.team_id
CROSS JOIN leader
ORDER BY dt.points DESC, d.code;`,
      explanation:
        "driver_totals folds the results into one row per driver; leader reads that finished table to get a single number; the last SELECT joins everything and subtracts. Each step has a name, so you can read, test and change them one at a time. CROSS JOIN with a one-row CTE attaches the leader's points to every driver.",
      hints: [
        { id: "h1", title: "Two CTEs", content: "WITH driver_totals AS (SELECT ...), leader AS (SELECT ...) SELECT ... Only one WITH keyword; a comma separates the CTEs." },
        { id: "h2", title: "The leader", content: "leader AS (SELECT MAX(points) AS top_points FROM driver_totals). It reads the earlier CTE like a table." },
        { id: "h3", title: "The gap", content: "FROM driver_totals AS dt JOIN drivers AS d ... JOIN teams AS t ... CROSS JOIN leader, then leader.top_points - dt.points AS gap." },
      ],
      tests: [
        {
          id: "t1",
          description: "A row for every driver with code, name, team, points and gap",
          assertionCode: t`const rs = need(["code", "name", "team", "points", "gap"], "Add the points table: code, name, team, points and gap");
assertEqual(rs.rows.length, one("SELECT COUNT(DISTINCT driver_id) AS n FROM results").n, "One row per driver who has a result");`,
        },
        {
          id: "t2",
          description: "Points are each driver's season total",
          assertionCode: t`const got = data(["code", "name", "team", "points", "gap"]);
const want = query("SELECT d.code AS code, SUM(r.points) AS points FROM results r JOIN drivers d ON d.driver_id = r.driver_id GROUP BY d.driver_id");
match(got, want, "code", ["points"], "the points table");`,
        },
        {
          id: "t3",
          description: "gap is the distance to the leader",
          assertionCode: t`const got = data(["code", "name", "team", "points", "gap"]);
const top = Math.max(...got.map((r) => r.points));
for (const r of got) assertEqual(r.gap, top - r.points, "gap for " + r.code + " (top_points - points)");
assertEqual(got.filter((r) => r.gap === 0).length >= 1, true, "The leader should have a gap of 0");`,
        },
        {
          id: "t4",
          description: "Highest points first, team names attached",
          assertionCode: t`const got = data(["code", "name", "team", "points", "gap"]);
for (let i = 1; i < got.length; i++) {
  assert(got[i - 1].points > got[i].points || (got[i - 1].points === got[i].points && got[i - 1].code <= got[i].code), "Sort by points DESC, then code (row " + (i + 1) + " is out of order)");
}
const teams = query("SELECT d.code AS code, t.name AS team FROM drivers d JOIN teams t ON t.team_id = d.team_id");
match(got, teams.filter((x) => got.some((g) => g.code === x.code)), "code", ["team"], "the team column");`,
        },
        {
          id: "t5",
          description: "Written as a chain of CTEs",
          assertionCode: t`const rs = need(["code", "name", "team", "points", "gap"]);
const s = sqlOf(rs);
assert(/^\s*with\b/.test(s), "Start the statement with WITH");
assert((s.match(/\bas\s*\(\s*select/g) || []).length >= 2, "Define two CTEs: driver_totals and leader");`,
        },
      ],
      unlocks: ["sa-leaders"],
      checks: [
        {
          prompt: "A statement defines `WITH totals AS (...) SELECT ...;`. A second statement right after it says `SELECT * FROM totals;`. What happens?",
          question: {
            type: "choice",
            options: ["It works: CTEs stay until the session ends", "Error: no such table, because the CTE only lived for the first statement", "It returns the first statement's rows again", "It creates a table called totals"],
            answer: 1,
          },
          explanation: "A CTE is scoped to the single statement that defines it. If you want a name that survives, make a view (or a table).",
        },
        {
          prompt: "In `WITH a AS (...), b AS (...) SELECT ...`, can the body of `b` read from `a`?",
          question: { type: "choice", options: ["Yes, later CTEs can use earlier ones", "No, each CTE is isolated", "Only if a is marked MATERIALIZED"], answer: 0 },
          explanation: "CTEs are defined in order and each one can use those above it. That is what makes a long query read like a recipe. (Reversing the order only works with WITH RECURSIVE.)",
        },
      ],
    },

    // ───────────────────────────── 4 ─────────────────────────────
    {
      id: "season-analytics-4-record",
      title: "Win, podium and DNF record",
      minutes: 18,
      xp: 100,
      concepts: ["CASE inside aggregates", "COUNT vs SUM(CASE)", "FILTER", "pivoting rows to columns"],
      learn: md`### One pass, many counts

How many wins, podiums and retirements does each driver have? You could write three queries with three different \`WHERE\` clauses. Better: one pass over the table, with a \`CASE\` **inside** each aggregate that decides whether the row counts.

~~~sql
SELECT driver_id,
  COUNT(*) AS entries,
  SUM(CASE WHEN finish_pos = 1
           THEN 1 ELSE 0 END) AS wins,
  COUNT(CASE WHEN finish_pos <= 3
             THEN 1 END) AS podiums
FROM results
GROUP BY driver_id;
~~~

Two equivalent idioms:

- \`SUM(CASE WHEN cond THEN 1 ELSE 0 END)\` adds up ones and zeros.
- \`COUNT(CASE WHEN cond THEN 1 END)\` relies on two facts: a \`CASE\` with no \`ELSE\` gives \`NULL\`, and \`COUNT(x)\` skips \`NULL\`.

SQLite (3.30+) also supports the standard \`COUNT(*) FILTER (WHERE finish_pos = 1)\`, which says the same thing more directly. Because SQLite compares to 0 or 1, you will see \`SUM(finish_pos = 1)\`; it does not work in Postgres, so prefer CASE or FILTER when the SQL may travel.

### Pivoting

Conditional aggregation also turns row values into **columns**. One column per weather type instead of one row per weather type:

~~~sql
SELECT r.driver_id,
  SUM(CASE WHEN w.weather = 'Wet'
           THEN r.points ELSE 0 END) AS wet_points,
  SUM(CASE WHEN w.weather = 'Dry'
           THEN r.points ELSE 0 END) AS dry_points
FROM results AS r
JOIN races AS w ON w.race_id = r.race_id
GROUP BY r.driver_id;
~~~

That layout is what a chart wants: one row per driver, one column per series.

### Traps

- \`COUNT(CASE WHEN x THEN 1 ELSE 0 END)\` counts **every row**: 0 is not NULL, so it is counted. Use SUM with ELSE 0, or COUNT with no ELSE.
- \`SUM(CASE ... THEN 1 END)\` with no matches returns **NULL**, not 0, because every value was NULL. Add \`ELSE 0\` (or wrap in \`COALESCE(..., 0)\`).
- A comparison with NULL is never true: \`finish_pos <= 3\` is unknown for a retirement, so the CASE falls through to the ELSE branch. Usually what you want, but know why.
- Some rows are not what \`COUNT(*)\` assumes. A **DNS** ("did not start") row exists in \`results\` but is not a start.`,
      mission: md`Board meetings are won with one table: **starts, wins, podiums, retirements**. The team principal also wants to know who copes with rain, so the table needs wet and dry points side by side.

Remember the data's quirks: a driver who did not start (DNS) must not get a start, and a disqualification counts as not finishing.`,
      tasks: [
        "One row per driver code: starts (every result except DNS) and wins (finish_pos = 1)",
        "podiums (finish_pos <= 3) and dnfs (status other than 'Finished' or 'DNS')",
        "Pivot the points into wet_points and dry_points using races.weather",
        "Order by wins DESC, podiums DESC, then code",
      ],
      starterAdd: sql`-- ── ✏️ YOUR TURN ───────────────────────────
-- Lesson 4: the win / podium / DNF record. One query, one row per driver.
-- FROM results r JOIN drivers d JOIN races w, GROUP BY driver, with columns:
--   code        d.code
--   starts      results that are not status 'DNS'
--   wins        finish_pos = 1
--   podiums     finish_pos <= 3
--   dnfs        status not in ('Finished', 'DNS')   (retirements and disqualifications)
--   wet_points  sum of points in races with weather 'Wet'
--   dry_points  sum of points in races with weather 'Dry'
-- Order by wins DESC, podiums DESC, code.
`,
      solutionAdd: sql`-- Win / podium / DNF record
SELECT
  d.code,
  COUNT(CASE WHEN r.status <> 'DNS' THEN 1 END) AS starts,
  COUNT(CASE WHEN r.finish_pos = 1 THEN 1 END) AS wins,
  COUNT(CASE WHEN r.finish_pos <= 3 THEN 1 END) AS podiums,
  COUNT(CASE WHEN r.status NOT IN ('Finished', 'DNS') THEN 1 END) AS dnfs,
  SUM(CASE WHEN w.weather = 'Wet' THEN r.points ELSE 0 END) AS wet_points,
  SUM(CASE WHEN w.weather = 'Dry' THEN r.points ELSE 0 END) AS dry_points
FROM results AS r
JOIN drivers AS d ON d.driver_id = r.driver_id
JOIN races AS w ON w.race_id = r.race_id
GROUP BY d.driver_id
ORDER BY wins DESC, podiums DESC, d.code;`,
      explanation:
        "Every aggregate reads the same rows, but each CASE decides which of them count. COUNT(CASE ... THEN 1 END) counts only the rows where the condition holds because the missing ELSE gives NULL. The two SUMs split the points by weather, which pivots a row-per-race table into one row per driver with a column per weather type.",
      hints: [
        { id: "h1", title: "COUNT with CASE", content: "COUNT(CASE WHEN r.finish_pos = 1 THEN 1 END) AS wins. No ELSE: the unmatched rows become NULL and COUNT skips NULL." },
        { id: "h2", title: "Not DNS", content: "starts: COUNT(CASE WHEN r.status <> 'DNS' THEN 1 END). dnfs: COUNT(CASE WHEN r.status NOT IN ('Finished', 'DNS') THEN 1 END)." },
        { id: "h3", title: "The pivot", content: "SUM(CASE WHEN w.weather = 'Wet' THEN r.points ELSE 0 END) AS wet_points, and the same for 'Dry'. Join races AS w for the weather, GROUP BY d.driver_id." },
      ],
      tests: [
        {
          id: "t1",
          description: "One row per driver with the seven columns",
          assertionCode: t`const rs = need(["code", "starts", "wins", "podiums", "dnfs", "wet_points", "dry_points"], "Add the record query with columns code, starts, wins, podiums, dnfs, wet_points and dry_points");
assertEqual(rs.rows.length, one("SELECT COUNT(DISTINCT driver_id) AS n FROM results").n, "One row per driver (use GROUP BY)");`,
        },
        {
          id: "t2",
          description: "starts, wins and podiums are right (a DNS is not a start)",
          assertionCode: t`const got = data(["code", "starts", "wins", "podiums", "dnfs", "wet_points", "dry_points"]);
const raw = query("SELECT d.code AS code, r.finish_pos AS pos, r.status AS status FROM results r JOIN drivers d ON d.driver_id = r.driver_id");
const want = [...new Set(raw.map((r) => r.code))].map((code) => {
  const rs = raw.filter((r) => r.code === code);
  return { code, starts: rs.filter((r) => r.status !== "DNS").length, wins: rs.filter((r) => r.pos === 1).length, podiums: rs.filter((r) => r.pos !== null && r.pos <= 3).length };
});
match(got, want, "code", ["starts", "wins", "podiums"], "the record");`,
        },
        {
          id: "t3",
          description: "dnfs counts retirements and disqualifications only",
          assertionCode: t`const got = data(["code", "starts", "wins", "podiums", "dnfs", "wet_points", "dry_points"]);
const want = query("SELECT d.code AS code, SUM(r.status NOT IN ('Finished', 'DNS')) AS dnfs FROM results r JOIN drivers d ON d.driver_id = r.driver_id GROUP BY d.driver_id");
match(got, want, "code", ["dnfs"], "the dnfs column");`,
        },
        {
          id: "t4",
          description: "Wet and dry points are pivoted into columns",
          assertionCode: t`const got = data(["code", "starts", "wins", "podiums", "dnfs", "wet_points", "dry_points"]);
const want = query("SELECT d.code AS code, SUM(CASE WHEN w.weather = 'Wet' THEN r.points ELSE 0 END) AS wet_points, SUM(CASE WHEN w.weather = 'Dry' THEN r.points ELSE 0 END) AS dry_points FROM results r JOIN drivers d ON d.driver_id = r.driver_id JOIN races w ON w.race_id = r.race_id GROUP BY d.driver_id");
match(got, want, "code", ["wet_points", "dry_points"], "the weather split");
for (const r of got) assert(r.wet_points !== null && r.dry_points !== null, r.code + " has NULL points: add ELSE 0 so a driver with no wet points shows 0");`,
        },
        {
          id: "t5",
          description: "Most wins first, then podiums",
          assertionCode: t`const got = data(["code", "starts", "wins", "podiums", "dnfs", "wet_points", "dry_points"]);
for (let i = 1; i < got.length; i++) {
  const a = got[i - 1], b = got[i];
  assert(a.wins > b.wins || (a.wins === b.wins && (a.podiums > b.podiums || (a.podiums === b.podiums && a.code <= b.code))), "Sort by wins DESC, podiums DESC, code (" + b.code + " is out of order)");
}`,
        },
      ],
      unlocks: ["sa-record"],
      checks: [
        {
          prompt: "What does `COUNT(CASE WHEN finish_pos = 1 THEN 1 ELSE 0 END)` return for a driver with 10 results and 2 wins?",
          question: { type: "number", answer: 10 },
          explanation: "The ELSE branch returns 0, and 0 is a value, not NULL, so COUNT counts it. Every row contributes something. Drop the ELSE (COUNT) or use SUM(CASE ... THEN 1 ELSE 0 END) to get 2.",
        },
        {
          prompt: "A driver has no wins. What does `SUM(CASE WHEN finish_pos = 1 THEN 1 END)` return for them?",
          question: { type: "choice", options: ["0", "NULL", "An error"], answer: 1 },
          explanation: "Every CASE result is NULL, SUM ignores NULLs, and a SUM over no values is NULL, not 0. Add ELSE 0 or wrap the sum in COALESCE(..., 0) so charts and arithmetic do not meet a NULL.",
        },
      ],
    },
  ],
};
