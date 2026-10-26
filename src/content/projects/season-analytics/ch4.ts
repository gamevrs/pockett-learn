import type { Chapter } from "@/engine/types";
import { md, sql, t } from "./util.ts";

/**
 * Chapter 4: production-grade analytics.
 * Trust the numbers (fan-out checks), read query plans, and settle the championship with tiebreaks.
 */
export const chapter4: Chapter = {
  id: "production",
  title: "Numbers you can defend",
  blurb: "Catch the silent join bug, read the query plan, and finish with standings decided entirely in SQL.",
  lessons: [
    // ───────────────────────────── 13 ─────────────────────────────
    {
      id: "season-analytics-13-strategy",
      title: "Fan-out and the query plan",
      minutes: 26,
      xp: 150,
      concepts: ["join fan-out", "pre-aggregating before a join", "reconciling totals", "EXPLAIN QUERY PLAN", "CREATE INDEX"],
      learn: md`### The bug that never raises an error

Wrong joins do not crash. They give you a confident, wrong number. The classic is **fan-out**: you join a table to a *many* side, and each row on the "one" side is repeated once per match.

A driver has **one** result row per race (say 18 points) but **two** pit stops in that race. Join \`results\` to \`pit_stops\` and the 18 points appear twice. A \`SUM(points)\` over that join now counts the race twice, and a three-stop race three times:

~~~sql
SELECT SUM(r.points)
-- bigger than the real season total!
FROM results AS r
JOIN pit_stops AS p
  ON p.race_id = r.race_id
 AND p.driver_id = r.driver_id;
~~~

### How to catch it

- **Reconcile.** Compare your total with the same total taken from the base table (\`SELECT SUM(points) FROM results\`). If a report has an easy cross-check, always run it.
- **Count rows before and after a join.** A join that adds rows when you did not expect a one-to-many is a fan-out.
- **Check the grain.** Ask: "what does one row of this table mean?" (a result = one driver in one race; a pit stop = one stop.) Joining two different grains multiplies.
- Beware of \`SELECT DISTINCT\` as a fix: it removes duplicate *rows*, so two different races with the same points collapse into one. It hides the symptom and corrupts the data.

### The fix: aggregate first, then join

Reduce the many side to the grain of the one side (one row per race and driver) in a CTE, then join. Now each result matches **at most one** row:

~~~sql
WITH stops AS (
  SELECT race_id, driver_id, COUNT(*) AS stops
  FROM pit_stops
  GROUP BY race_id, driver_id
)
SELECT ...
FROM results AS r
LEFT JOIN stops AS s
  ON s.race_id = r.race_id
 AND s.driver_id = r.driver_id
~~~

A \`LEFT JOIN\` plus \`COALESCE(s.stops, 0)\` keeps the cars that never stopped.

Other ways to fan out: joining on only part of a key (\`ON driver_id\` when the key is race **and** driver), a forgotten ON clause (every row against every row), and a LEFT JOIN whose NULL row gets counted by \`COUNT(*)\`.

### Reading the plan: EXPLAIN QUERY PLAN

Once the numbers are right, ask whether the query is efficient. Put \`EXPLAIN QUERY PLAN\` in front of any query and SQLite describes how it would run it, without running it:

- \`SCAN laps\`: reads **every row** of the table. Fine for 40 rows, painful for 40 million.
- \`SEARCH laps USING INDEX idx (race_id=?)\`: jumps straight to the matching rows through an index.
- \`USE TEMP B-TREE FOR ORDER BY\` or \`GROUP BY\`: an extra sort was needed.

An **index** is a sorted lookup structure on one or more columns:

~~~sql
CREATE INDEX idx_laps_race_driver ON laps (race_id, driver_id);
~~~

Put the columns you filter on with \`=\` first. Indexes make reads faster and writes slower (each insert must update them), so add them for queries you actually run. Postgres and MySQL use \`EXPLAIN\` (and \`EXPLAIN ANALYZE\` to run it for real); SQLite's plan is text, without cost numbers, and its wording can change between versions.`,
      mission: md`The strategists ask: **does stopping more often pay off?** Compare finishers by their number of pit stops: how many cars, how many points, and the average per car.

Before anyone trusts that table, prove that the naive join would have lied to them. Finally look at how the database reads the laps table, and fix it with an index.`,
      tasks: [
        "Audit: one row with joined_points (SUM of results.points over a plain join to pit_stops) and true_points (the real total): see the inflation",
        "Strategy table for classified finishers: stops, entries, points, avg_points, with pit stops pre-aggregated in a CTE and a LEFT JOIN; reconcile to the real total",
        "EXPLAIN QUERY PLAN for SELECT lap, lap_ms FROM laps WHERE race_id = 4 AND driver_id = 1, then CREATE INDEX idx_laps_race_driver ON laps (race_id, driver_id), then the same EXPLAIN again",
      ],
      starterAdd: sql`-- ── ✏️ YOUR TURN ───────────────────────────
-- Lesson 13: trust, then verify.
-- 1. Audit. One row: joined_points = SUM(r.points) from results r JOIN pit_stops p ON the race AND driver,
--    true_points = (SELECT SUM(points) FROM results).  Run it and look at the gap.
-- 2. The honest strategy table. CTE stops: race_id, driver_id, COUNT(*) AS stops from pit_stops.
--    FROM results r LEFT JOIN stops s (same race and driver), only classified finishers
--    (r.finish_pos IS NOT NULL), grouped by COALESCE(s.stops, 0):
--      stops = COALESCE(s.stops, 0), entries = COUNT(*), points = SUM(r.points),
--      avg_points = ROUND(AVG(r.points), 2).  Order by stops.
--    The points column must add up to the real season total.
-- 3. The plan.
--    EXPLAIN QUERY PLAN SELECT lap, lap_ms FROM laps WHERE race_id = 4 AND driver_id = 1;
--    CREATE INDEX idx_laps_race_driver ON laps (race_id, driver_id);
--    EXPLAIN QUERY PLAN SELECT lap, lap_ms FROM laps WHERE race_id = 4 AND driver_id = 1;
`,
      solutionAdd: sql`-- Audit: what the naive join does to the points
SELECT
  SUM(r.points) AS joined_points,
  (SELECT SUM(points) FROM results) AS true_points
FROM results AS r
JOIN pit_stops AS p ON p.race_id = r.race_id AND p.driver_id = r.driver_id;

-- Strategy table: one row per stop count, pit stops aggregated before the join
WITH stops AS (
  SELECT race_id, driver_id, COUNT(*) AS stops
  FROM pit_stops
  GROUP BY race_id, driver_id
)
SELECT
  COALESCE(s.stops, 0) AS stops,
  COUNT(*) AS entries,
  SUM(r.points) AS points,
  ROUND(AVG(r.points), 2) AS avg_points
FROM results AS r
LEFT JOIN stops AS s ON s.race_id = r.race_id AND s.driver_id = r.driver_id
WHERE r.finish_pos IS NOT NULL
GROUP BY COALESCE(s.stops, 0)
ORDER BY stops;

-- Query plan before and after an index
EXPLAIN QUERY PLAN
SELECT lap, lap_ms FROM laps WHERE race_id = 4 AND driver_id = 1;

CREATE INDEX idx_laps_race_driver ON laps (race_id, driver_id);

EXPLAIN QUERY PLAN
SELECT lap, lap_ms FROM laps WHERE race_id = 4 AND driver_id = 1;`,
      explanation:
        "The plain join repeats every result once per pit stop, so its SUM is inflated. Counting stops in a CTE first leaves exactly one row per race and driver, and the LEFT JOIN keeps cars that never stopped, so the strategy table adds up to the true total. The first plan says SCAN laps (every row is read); once the index exists the same query becomes a SEARCH that uses it.",
      hints: [
        { id: "h1", title: "The audit", content: "SELECT SUM(r.points) AS joined_points, (SELECT SUM(points) FROM results) AS true_points FROM results AS r JOIN pit_stops AS p ON p.race_id = r.race_id AND p.driver_id = r.driver_id;" },
        { id: "h2", title: "Pre-aggregate", content: "WITH stops AS (SELECT race_id, driver_id, COUNT(*) AS stops FROM pit_stops GROUP BY race_id, driver_id) then results LEFT JOIN stops ON both keys, WHERE r.finish_pos IS NOT NULL, GROUP BY COALESCE(s.stops, 0)." },
        { id: "h3", title: "EXPLAIN", content: "Write EXPLAIN QUERY PLAN directly in front of the SELECT, run it, then CREATE INDEX idx_laps_race_driver ON laps (race_id, driver_id); and repeat the EXPLAIN. Both EXPLAIN statements return their own result." },
      ],
      tests: [
        {
          id: "t1",
          description: "The audit shows the plain join inflating the total",
          assertionCode: t`const got = data(["joined_points", "true_points"], "Add the audit: one row with joined_points and true_points");
assertEqual(got.length, 1, "One row");
const truth = one("SELECT SUM(points) AS p FROM results").p;
assertEqual(got[0].true_points, truth, "true_points is the real season total");
const inflated = one("SELECT SUM(r.points) AS p FROM results r JOIN pit_stops p ON p.race_id = r.race_id AND p.driver_id = r.driver_id").p;
assertEqual(got[0].joined_points, inflated, "joined_points (SUM over the plain join to pit_stops)");
assert(got[0].joined_points > got[0].true_points, "The join should be inflating the total, but joined_points is not bigger than true_points");`,
        },
        {
          id: "t2",
          description: "Strategy table: stops, entries, points, avg_points",
          assertionCode: t`const got = data(["stops", "entries", "points", "avg_points"], "Add the strategy table: stops, entries, points, avg_points", /\bwith\b/);
const raw = query("SELECT r.points AS points, COALESCE((SELECT COUNT(*) FROM pit_stops p WHERE p.race_id = r.race_id AND p.driver_id = r.driver_id), 0) AS stops FROM results r WHERE r.finish_pos IS NOT NULL");
const groups = [...new Set(raw.map((r) => r.stops))];
const want = groups.map((s) => { const g = raw.filter((r) => r.stops === s); const sum = g.reduce((a, r) => a + r.points, 0); return { stops: s, entries: g.length, points: sum, avg_points: Math.round((sum / g.length) * 100) / 100 }; });
match(got, want, "stops", ["entries", "points", "avg_points"], "the strategy table", 0.006);`,
        },
        {
          id: "t3",
          description: "The strategy table reconciles to the real season total",
          assertionCode: t`const got = data(["stops", "entries", "points", "avg_points"], "", /\bwith\b/);
const total = one("SELECT SUM(points) AS p FROM results").p;
const sum = got.reduce((a, r) => a + r.points, 0);
assertEqual(sum, total, "The points column adds up to " + sum + " but the real total is " + total + ". A join is multiplying rows: count the pit stops in a CTE first");
const finishers = one("SELECT COUNT(*) AS n FROM results WHERE finish_pos IS NOT NULL").n;
assertEqual(got.reduce((a, r) => a + r.entries, 0), finishers, "Entries add up to the number of classified finishers");
got.forEach((r, i) => i > 0 && assert(got[i - 1].stops < r.stops, "Order by stops"));`,
        },
        {
          id: "t4",
          description: "An index on laps (race_id, driver_id) exists",
          assertionCode: t`const idx = query("SELECT name FROM sqlite_master WHERE type = 'index' AND name = 'idx_laps_race_driver'");
assert(idx.length === 1, "Create the index with CREATE INDEX idx_laps_race_driver ON laps (race_id, driver_id)");
const cols = query("PRAGMA index_info(idx_laps_race_driver)").map((r) => r.name);
assertEqual(cols, ["race_id", "driver_id"], "Index columns, in order");`,
        },
        {
          id: "t5",
          description: "The plan changes from SCAN to SEARCH once the index exists",
          assertionCode: t`const plans = results.filter((r) => r.columns.includes("detail") && r.columns.includes("parent"));
assert(plans.length >= 2, "Run EXPLAIN QUERY PLAN twice: once before and once after creating the index (I found " + plans.length + ")");
const text = (rs) => rs.rows.map((row) => String(row[rs.columns.indexOf("detail")])).join(" | ");
const before = text(plans[plans.length - 2]), after = text(plans[plans.length - 1]);
assert(/SCAN/.test(before) && !/idx_laps_race_driver/.test(before), "The first plan should be a SCAN of laps (run it before CREATE INDEX). It says: " + before);
assert(/SEARCH/.test(after) && /idx_laps_race_driver/.test(after), "The second plan should be a SEARCH using idx_laps_race_driver (run it after CREATE INDEX). It says: " + after);`,
        },
      ],
      unlocks: ["sa-strategy", "sa-plan"],
      checks: [
        {
          prompt: "`SUM(r.points)` over `results JOIN pit_stops` is far bigger than `SUM(points)` over `results`. Which is the right fix?",
          question: {
            type: "choice",
            options: [
              "Add SELECT DISTINCT",
              "Count the pit stops per race and driver in a CTE, then join that single row per result",
              "Switch to a LEFT JOIN",
              "Use AVG instead of SUM",
            ],
            answer: 1,
          },
          explanation: "The join multiplies each result by its number of stops. Bring the many side down to the same grain (one row per race and driver) before joining. DISTINCT removes identical-looking rows, so two races with equal points would collapse and the total would be wrong in a different way; a LEFT JOIN changes nothing about the repetition.",
        },
        {
          prompt: "In a query plan, which word means the table is read row by row from start to end?",
          question: { type: "text", answer: ["SCAN"], placeholder: "one word" },
          explanation: "SCAN visits every row. SEARCH jumps to matching rows through an index or the primary key. A SCAN of a small lookup table is normal; a SCAN of the biggest table inside a frequently run query is the thing to look for.",
        },
      ],
    },

    // ───────────────────────────── 14 ─────────────────────────────
    {
      id: "season-analytics-14-championship",
      title: "The championship, tiebreaks and all",
      minutes: 30,
      xp: 220,
      concepts: ["count-back tiebreaks", "multi-key window ORDER BY", "COUNT() OVER (PARTITION BY ...)", "putting it all together"],
      learn: md`### Standings are a tiebreak problem

Two drivers finish the season on 132 points. Who is third? Racing rules answer with a **count-back**: the one with more wins; if still level, more second places; then thirds, and so on. A real standings query has to apply the rules, not just \`ORDER BY points\`.

The ingredients are all things you already know:

1. A tally per driver: points, and how many times they finished 1st, 2nd and 3rd (**conditional aggregation**, lesson 4).
2. A single position per driver, from a **window function** whose \`ORDER BY\` lists the keys in priority order, each with its own direction:

~~~sql
ROW_NUMBER() OVER (
  ORDER BY points DESC, wins DESC,
           seconds DESC, thirds DESC, code
) AS pos
~~~

3. A flag to show *why* two drivers are separated: \`COUNT(*) OVER (PARTITION BY points) > 1\` is true when more than one driver has the same points. The window has no \`ORDER BY\`, so the frame is the whole partition and every row sees the full count.

### ROW_NUMBER or RANK here?

\`RANK\` with the same keys would still give two drivers the same position if they are tied on **everything**. A real championship needs one winner of a count-back, and the table must have unique positions, so:

- put every rule in the \`ORDER BY\`, most important first,
- finish with a **final deterministic key** (the code) so results never depend on how the database happens to read the rows,
- use \`ROW_NUMBER\` for the position, and keep the real rule visible in the query.

### Constructors too

The team table is the same recipe grouped by team instead of by driver: the points of a team's cars, and the count-back over *its* drivers' finishes.

### The checklist for a query you will defend

- **Reconcile**: do the points add up to the base table's total?
- **Grain**: one row per driver, one per team. Count the rows.
- **Ties**: are there any, and are they resolved by the stated rule?
- **NULLs**: retirements have no finish position; they should not count as a win, second or third (they don't, because \`finish_pos = 1\` is false for NULL).
- **Readability**: CTEs for steps, aliases for everything, comments for the rule.`,
      mission: md`Final round at Sable Coast is in the book, and two drivers, **Marín** and **Novak**, are level on 132 points. Novak has seven podiums and no wins; Marín has two wins. The rulebook says wins first, so Marín is third. Prove it in SQL, then do the same for the constructors' title.

This is the query that goes on the big screen, so build it from your own views and make it airtight.`,
      tasks: [
        "CTE tally from v_race_results: driver_id, code, name, team, points, wins, seconds, thirds (conditional aggregation, grouped by driver)",
        "Drivers' table: pos = ROW_NUMBER() OVER (ORDER BY points DESC, wins DESC, seconds DESC, thirds DESC, code), plus code, name, team, points, wins, tied_on_points (COUNT(*) OVER (PARTITION BY points) > 1) and behind_leader",
        "Constructors' table with the same rules grouped by team_id: pos, team, points, wins, tied_on_points",
        "Both ordered by pos",
      ],
      starterAdd: sql`-- ── ✏️ YOUR TURN ───────────────────────────
-- Lesson 14: the championship. Marín and Novak are level on points; wins decide it.
-- 1+2. Drivers' table from v_race_results.
--    CTE tally (per driver): driver_id, code, driver AS name, team, SUM(points) AS points,
--      wins / seconds / thirds = how many times finish_pos was 1 / 2 / 3.
--    Final: pos = ROW_NUMBER() OVER (ORDER BY points DESC, wins DESC, seconds DESC, thirds DESC, code),
--      code, name, team, points, wins,
--      tied_on_points = COUNT(*) OVER (PARTITION BY points) > 1,
--      behind_leader  = MAX(points) OVER () - points.   Order by pos.
-- 3. Constructors' table: the same rules grouped by team (team_id, team).
--      Columns: pos, team, points, wins, tied_on_points. Order by pos.
`,
      solutionAdd: sql`-- Drivers' championship, count-back applied
WITH tally AS (
  SELECT
    driver_id,
    code,
    driver AS name,
    team,
    SUM(points) AS points,
    COUNT(CASE WHEN finish_pos = 1 THEN 1 END) AS wins,
    COUNT(CASE WHEN finish_pos = 2 THEN 1 END) AS seconds,
    COUNT(CASE WHEN finish_pos = 3 THEN 1 END) AS thirds
  FROM v_race_results
  GROUP BY driver_id
)
SELECT
  ROW_NUMBER() OVER (ORDER BY points DESC, wins DESC, seconds DESC, thirds DESC, code) AS pos,
  code,
  name,
  team,
  points,
  wins,
  COUNT(*) OVER (PARTITION BY points) > 1 AS tied_on_points,
  MAX(points) OVER () - points AS behind_leader
FROM tally
ORDER BY pos;

-- Constructors' championship, same rules
WITH team_tally AS (
  SELECT
    team_id,
    team,
    SUM(points) AS points,
    COUNT(CASE WHEN finish_pos = 1 THEN 1 END) AS wins,
    COUNT(CASE WHEN finish_pos = 2 THEN 1 END) AS seconds,
    COUNT(CASE WHEN finish_pos = 3 THEN 1 END) AS thirds
  FROM v_race_results
  GROUP BY team_id
)
SELECT
  ROW_NUMBER() OVER (ORDER BY points DESC, wins DESC, seconds DESC, thirds DESC, team) AS pos,
  team,
  points,
  wins,
  COUNT(*) OVER (PARTITION BY points) > 1 AS tied_on_points
FROM team_tally
ORDER BY pos;`,
      explanation:
        "The tally folds every result into one row per driver with the count-back ingredients. ROW_NUMBER over a multi-key ORDER BY applies the rulebook in priority order and always produces a unique position, with the code as the last resort. COUNT(*) OVER (PARTITION BY points) simply asks how many drivers share a points total, which is the flag for 'a tiebreak was involved'. The constructors' table is the same shape grouped by team.",
      hints: [
        { id: "h1", title: "The tally", content: "FROM v_race_results GROUP BY driver_id with SUM(points) AS points and COUNT(CASE WHEN finish_pos = 1 THEN 1 END) AS wins; do the same for finish_pos 2 and 3. Select driver AS name." },
        { id: "h2", title: "The order of the rules", content: "ROW_NUMBER() OVER (ORDER BY points DESC, wins DESC, seconds DESC, thirds DESC, code) AS pos. Every key gets its own DESC; code is the final tiebreaker." },
        { id: "h3", title: "Window extras", content: "COUNT(*) OVER (PARTITION BY points) > 1 AS tied_on_points and MAX(points) OVER () - points AS behind_leader are plain window expressions in the final SELECT. For teams group by team_id." },
      ],
      tests: [
        {
          id: "t1",
          description: "Drivers' table with unique positions",
          assertionCode: t`const rs = need(["pos", "code", "name", "team", "points", "wins", "tied_on_points", "behind_leader"], "Add the drivers' table: pos, code, name, team, points, wins, tied_on_points, behind_leader", /row_number/);
const got = objs(rs);
assertEqual(got.length, one("SELECT COUNT(*) AS n FROM drivers").n, "One row per driver");
assertEqual(got.map((r) => r.pos), got.map((_, i) => i + 1), "Positions should be 1, 2, 3 ... with no repeats, in order (ROW_NUMBER, ORDER BY pos)");`,
        },
        {
          id: "t2",
          description: "The count-back puts Marín ahead of Novak",
          assertionCode: t`const got = data(["pos", "code", "name", "team", "points", "wins", "tied_on_points", "behind_leader"], "", /row_number/);
const raw = query("SELECT code, finish_pos AS pos, points FROM v_race_results");
const codes = [...new Set(raw.map((r) => r.code))];
const tally = codes.map((code) => { const rs = raw.filter((r) => r.code === code); return { code, points: rs.reduce((a, r) => a + r.points, 0), w: rs.filter((r) => r.pos === 1).length, s: rs.filter((r) => r.pos === 2).length, th: rs.filter((r) => r.pos === 3).length }; });
tally.sort((a, b) => b.points - a.points || b.w - a.w || b.s - a.s || b.th - a.th || (a.code < b.code ? -1 : 1));
assertEqual(got.map((r) => r.code), tally.map((r) => r.code), "Drivers in championship order (points, then wins, then seconds, then thirds, then code)");
const rn = need(["pos", "code", "name", "team", "points", "wins", "tied_on_points", "behind_leader"], "", /row_number/);
assert(/order\s+by\s+[\w.]*points\s+desc\s*,\s*[\w.]*wins\s+desc/.test(sqlOf(rn)), "Put the count-back rules in the ROW_NUMBER ORDER BY: points DESC first, then wins DESC, then seconds and thirds");
const mar = got.find((r) => r.code === "MAR"), nov = got.find((r) => r.code === "NOV");
assert(mar.points === nov.points, "Marín and Novak should be level on points");
assert(mar.pos < nov.pos, "Marín has 2 wins and Novak none, so Marín must be ahead of Novak");`,
        },
        {
          id: "t3",
          description: "tied_on_points and behind_leader",
          assertionCode: t`const got = data(["pos", "code", "name", "team", "points", "wins", "tied_on_points", "behind_leader"], "", /row_number/);
const top = Math.max(...got.map((r) => r.points));
for (const r of got) {
  const shared = got.filter((o) => o.points === r.points).length > 1 ? 1 : 0;
  assertEqual(r.tied_on_points, shared, "tied_on_points for " + r.code);
  assertEqual(r.behind_leader, top - r.points, "behind_leader for " + r.code);
}
assertEqual(got.filter((r) => r.tied_on_points === 1).length, 2, "Exactly two drivers (Marín and Novak) share a points total");`,
        },
        {
          id: "t4",
          description: "Constructors' table follows the same rules",
          assertionCode: t`const got = data(["pos", "team", "points", "wins", "tied_on_points"], "Add the constructors' table: pos, team, points, wins, tied_on_points", /row_number/, /\bcode\b/);
assertEqual(got.length, one("SELECT COUNT(*) AS n FROM teams").n, "One row per team");
const raw = query("SELECT team, finish_pos AS pos, points FROM v_race_results");
const teams = [...new Set(raw.map((r) => r.team))];
const tally = teams.map((team) => { const rs = raw.filter((r) => r.team === team); return { team, points: rs.reduce((a, r) => a + r.points, 0), w: rs.filter((r) => r.pos === 1).length, s: rs.filter((r) => r.pos === 2).length, th: rs.filter((r) => r.pos === 3).length }; });
tally.sort((a, b) => b.points - a.points || b.w - a.w || b.s - a.s || b.th - a.th || (a.team < b.team ? -1 : 1));
assertEqual(got.map((r) => r.team), tally.map((r) => r.team), "Teams in championship order");
assertEqual(got.map((r) => r.points), tally.map((r) => r.points), "Team points");
assertEqual(got.map((r) => r.pos), got.map((_, i) => i + 1), "Positions 1..n in order");
assertEqual(got.reduce((a, r) => a + r.points, 0), one("SELECT SUM(points) AS p FROM results").p, "Team points must add up to the season total (the reserve driver's points count for Sable Works)");`,
        },
      ],
      unlocks: ["sa-championship"],
      checks: [
        {
          prompt: "Two drivers are tied on points and on wins. Why does the championship `ORDER BY` still end with `code`?",
          question: {
            type: "choice",
            options: [
              "SQL requires the last key to be text",
              "So the order is fully determined: without it, tied rows could come out in a different order on different runs",
              "It speeds up the sort",
            ],
            answer: 1,
          },
          explanation: "If every key is equal, the database may return the tied rows in any order, and ROW_NUMBER would number them arbitrarily. A final unique key (code) makes the answer deterministic and repeatable. For real rules you would continue the count-back (4th places, 5th...) before falling back to a name.",
        },
        {
          prompt: "A driver has points 132 and `COUNT(*) OVER (PARTITION BY points)` returns 2 for their row. What does that tell you?",
          question: { type: "choice", options: ["The driver has two wins", "Two drivers (including this one) share that points total", "The driver raced twice"], answer: 1 },
          explanation: "With PARTITION BY points and no ORDER BY, the window is every row with the same points total, so COUNT(*) is the size of that tie group. Compare it with 1 to get a 'was this decided by a tiebreak?' flag.",
        },
      ],
    },
  ],
};
