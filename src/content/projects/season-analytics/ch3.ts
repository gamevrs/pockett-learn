import type { Chapter } from "@/engine/types";
import { md, sql, t } from "./util.ts";

/**
 * Chapter 3: windows on the season.
 * Ranking functions and NTILE, running totals and frames, LAG / LEAD.
 */
export const chapter3: Chapter = {
  id: "windows",
  title: "Windows on the season",
  blurb: "Window functions: rank, accumulate and compare rows without collapsing them.",
  lessons: [
    // ───────────────────────────── 10 ─────────────────────────────
    {
      id: "season-analytics-10-movers",
      title: "Ranking: drivers of the day",
      minutes: 22,
      xp: 130,
      concepts: ["OVER (PARTITION BY ... ORDER BY ...)", "ROW_NUMBER / RANK / DENSE_RANK", "NTILE", "filtering on a window result"],
      learn: md`### Calculate across rows without losing them

\`GROUP BY\` squashes many rows into one. A **window function** looks at a group of related rows too, but keeps **every row** and adds a new column with the answer. The group is described by an \`OVER\` clause:

~~~sql
SELECT code, round, finish_pos,
       RANK() OVER (
         PARTITION BY round
         ORDER BY finish_pos
       ) AS race_rank
FROM v_race_results;
~~~

- \`PARTITION BY round\` splits the rows into groups (one per race) and restarts the calculation in each. Leave it out and the whole result is one group.
- \`ORDER BY finish_pos\` orders the rows *inside* each group.
- Windows were added in SQLite 3.25 and work the same way in Postgres, MySQL 8 and SQL Server.

### Four ways to number rows

Take scores 30, 20, 20, 10, best first:

- \`ROW_NUMBER()\` gives 1, 2, 3, 4. Always unique, ties broken **arbitrarily**, so add a tiebreaker to the ORDER BY if the order matters.
- \`RANK()\` gives 1, 2, 2, 4. Ties share a rank and leave a **gap** after them.
- \`DENSE_RANK()\` gives 1, 2, 2, 3. Ties share a rank, **no gap**.
- \`NTILE(n)\` deals rows into *n* equally sized buckets (tiers): \`NTILE(4)\` makes quartiles. When rows do not divide evenly, the first buckets get one extra.

### You cannot filter on a window in the same SELECT

Windows are worked out **after** \`WHERE\`, \`GROUP BY\` and \`HAVING\`, so \`WHERE ROW_NUMBER() OVER (...) = 1\` is an error. Some databases have \`QUALIFY\`; SQLite does not. The pattern is a CTE (or subquery) that computes the number, and an outer query that filters it:

~~~sql
WITH ranked AS (
  SELECT code, round, finish_pos,
         ROW_NUMBER() OVER (
           PARTITION BY round
           ORDER BY finish_pos
         ) AS rn
  FROM v_race_results
  WHERE finish_pos IS NOT NULL
)
SELECT * FROM ranked WHERE rn = 1;
-- the winner of each race
~~~

### Common mistakes

- Using \`RANK\` when you need exactly one row per group (ties return several). Use \`ROW_NUMBER\` with a tiebreaker.
- Forgetting that \`NULL\` sorts first in ascending order (see the NULL lesson): exclude retirements before ranking, as above.
- Putting the window function inside \`WHERE\` or \`GROUP BY\`.`,
      mission: md`The commentators award a **driver of the day** each round: the classified finisher who gained the most places from the grid to the flag. Gaining places is \`grid - finish_pos\` (start 9th, finish 4th: **+5**).

While you are at it, the board wants to see how wins rank across the whole grid (where ties are the whole point), and which pace tier each driver sits in.

You can use the \`v_race_results\` view from last lesson.`,
      tasks: [
        "Drivers of the day: for each round the single driver with the biggest gain (ties: better finish_pos, then code): round, code, grid, finish_pos, gained",
        "Win ranking: code, wins, row_num, rnk, dense_rnk using ROW_NUMBER, RANK and DENSE_RANK over wins",
        "Tiers: code, points and tier from NTILE(3) over season points, best first",
      ],
      starterAdd: sql`-- ── ✏️ YOUR TURN ───────────────────────────
-- Lesson 10: ranking with window functions (use the v_race_results view).
-- 1. Driver of the day. Among classified finishers (finish_pos IS NOT NULL), per round, keep the ONE
--    driver with the biggest gained = grid - finish_pos. Break ties by lower finish_pos, then code.
--    Use ROW_NUMBER() OVER (PARTITION BY round ORDER BY ...) in a CTE, then WHERE rn = 1.
--    Columns: round, code, grid, finish_pos, gained. Order by round.
-- 2. Win ranking: wins per code (COUNT of finish_pos = 1) in a CTE, then
--      row_num   ROW_NUMBER() OVER (ORDER BY wins DESC, code)
--      rnk       RANK() OVER (ORDER BY wins DESC)
--      dense_rnk DENSE_RANK() OVER (ORDER BY wins DESC)
--    Columns: code, wins, row_num, rnk, dense_rnk. Order by row_num.
-- 3. Tiers: season points per code, then NTILE(3) OVER (ORDER BY points DESC, code) AS tier.
--    Columns: code, points, tier. Order by points DESC, code.
`,
      solutionAdd: sql`-- Driver of the day
WITH moves AS (
  SELECT
    round, code, grid, finish_pos,
    grid - finish_pos AS gained,
    ROW_NUMBER() OVER (
      PARTITION BY round
      ORDER BY grid - finish_pos DESC, finish_pos, code
    ) AS rn
  FROM v_race_results
  WHERE finish_pos IS NOT NULL
)
SELECT round, code, grid, finish_pos, gained
FROM moves
WHERE rn = 1
ORDER BY round;

-- How wins rank: three ways to number the same list
WITH wins AS (
  SELECT code, COUNT(CASE WHEN finish_pos = 1 THEN 1 END) AS wins
  FROM v_race_results
  GROUP BY code
)
SELECT
  code,
  wins,
  ROW_NUMBER() OVER (ORDER BY wins DESC, code) AS row_num,
  RANK() OVER (ORDER BY wins DESC) AS rnk,
  DENSE_RANK() OVER (ORDER BY wins DESC) AS dense_rnk
FROM wins
ORDER BY row_num;

-- Points tiers
WITH totals AS (
  SELECT code, SUM(points) AS points
  FROM v_race_results
  GROUP BY code
)
SELECT
  code,
  points,
  NTILE(3) OVER (ORDER BY points DESC, code) AS tier
FROM totals
ORDER BY points DESC, code;`,
      explanation:
        "ROW_NUMBER restarts in every round (PARTITION BY round) and numbers the drivers from the biggest gain down, so rn = 1 is exactly one driver per round; the filter has to live outside the CTE because windows are computed after WHERE. RANK and DENSE_RANK treat equal win counts as ties, the first leaving gaps. NTILE(3) deals the sorted drivers into three tiers, with the remainder going to the first tier.",
      hints: [
        { id: "h1", title: "Partition and order", content: "ROW_NUMBER() OVER (PARTITION BY round ORDER BY grid - finish_pos DESC, finish_pos, code) AS rn. You can order by an expression, not just a column." },
        { id: "h2", title: "Filter outside", content: "Wrap it: WITH moves AS (SELECT ..., ROW_NUMBER() OVER (...) AS rn FROM v_race_results WHERE finish_pos IS NOT NULL) SELECT round, code, grid, finish_pos, gained FROM moves WHERE rn = 1." },
        { id: "h3", title: "Three rankings", content: "RANK() OVER (ORDER BY wins DESC), DENSE_RANK() OVER (ORDER BY wins DESC) and ROW_NUMBER() OVER (ORDER BY wins DESC, code). For tiers: NTILE(3) OVER (ORDER BY points DESC, code)." },
      ],
      tests: [
        {
          id: "t1",
          description: "Exactly one driver of the day per round",
          assertionCode: t`const rs = need(["round", "code", "grid", "finish_pos", "gained"], "Add the driver-of-the-day query: round, code, grid, finish_pos, gained", /\bover\s*\(/);
const rounds = rs.rows.map((r) => r[0]);
assertEqual(rounds.length, one("SELECT COUNT(*) AS n FROM races").n, "One row per round (ROW_NUMBER ... WHERE rn = 1)");
assertEqual(new Set(rounds).size, rounds.length, "A round appears twice: with ties you need ROW_NUMBER and a tiebreaker, not RANK");`,
        },
        {
          id: "t2",
          description: "The biggest gainer, with the tiebreakers applied",
          assertionCode: t`const got = data(["round", "code", "grid", "finish_pos", "gained"], "", /\bover\s*\(/);
const raw = query("SELECT round, code, grid, finish_pos FROM v_race_results WHERE finish_pos IS NOT NULL");
const want = [];
for (let round = 1; round <= 10; round++) {
  const c = raw.filter((r) => r.round === round).map((r) => ({ ...r, gained: r.grid - r.finish_pos }));
  c.sort((a, b) => b.gained - a.gained || a.finish_pos - b.finish_pos || (a.code < b.code ? -1 : 1));
  want.push(c[0]);
}
match(got, want, "round", ["code", "grid", "finish_pos", "gained"], "the drivers of the day");`,
        },
        {
          id: "t3",
          description: "ROW_NUMBER, RANK and DENSE_RANK on wins",
          assertionCode: t`const got = data(["code", "wins", "row_num", "rnk", "dense_rnk"], "Add the win ranking: code, wins, row_num, rnk, dense_rnk");
const raw = query("SELECT code, COUNT(CASE WHEN finish_pos = 1 THEN 1 END) AS wins FROM v_race_results GROUP BY code");
const sorted = raw.slice().sort((a, b) => b.wins - a.wins || (a.code < b.code ? -1 : 1));
const want = sorted.map((r, i) => ({ code: r.code, wins: r.wins, row_num: i + 1, rnk: 1 + raw.filter((x) => x.wins > r.wins).length, dense_rnk: 1 + new Set(raw.filter((x) => x.wins > r.wins).map((x) => x.wins)).size }));
match(got, want, "code", ["wins", "row_num", "rnk", "dense_rnk"], "the win ranking");`,
        },
        {
          id: "t4",
          description: "NTILE(3) deals the drivers into tiers of 5, 4 and 4",
          assertionCode: t`const got = data(["code", "points", "tier"], "Add the tiers: code, points, tier");
const raw = query("SELECT code, SUM(points) AS points FROM v_race_results GROUP BY code").sort((a, b) => b.points - a.points || (a.code < b.code ? -1 : 1));
const n = raw.length, base = Math.floor(n / 3), extra = n % 3;
const want = [];
let i = 0;
for (let tier = 1; tier <= 3; tier++) { const size = base + (tier <= extra ? 1 : 0); for (let k = 0; k < size; k++) want.push({ code: raw[i].code, points: raw[i].points, tier }), i++; }
match(got, want, "code", ["points", "tier"], "the tiers");
got.forEach((r, k) => k > 0 && assert(got[k - 1].points >= r.points, "Order by points DESC, code"));`,
        },
      ],
      unlocks: ["sa-movers"],
      checks: [
        {
          prompt: "Scores sorted best first are 30, 20, 20, 10. What `RANK()` does the 10 get?",
          question: { type: "number", answer: 4 },
          explanation: "The two 20s share rank 2, and RANK then skips 3, so the 10 is 4th. DENSE_RANK would give it 3 (no gaps) and ROW_NUMBER would give it 4 as well, but the two 20s would get 2 and 3 in an arbitrary order.",
        },
        {
          prompt: "Why does `WHERE ROW_NUMBER() OVER (PARTITION BY round ORDER BY gained DESC) = 1` fail?",
          question: {
            type: "choice",
            options: [
              "ROW_NUMBER cannot be used with PARTITION BY",
              "Window functions are evaluated after WHERE, so the value does not exist yet; compute it in a CTE and filter outside",
              "SQLite does not support ROW_NUMBER",
            ],
            answer: 1,
          },
          explanation: "The order of work is FROM, WHERE, GROUP BY, HAVING, then windows, then SELECT's final shape and ORDER BY. A filter on a window result has to wait for a second query level: a CTE or subquery.",
        },
      ],
    },

    // ───────────────────────────── 11 ─────────────────────────────
    {
      id: "season-analytics-11-progression",
      title: "Running totals and race pace",
      minutes: 24,
      xp: 140,
      concepts: ["SUM() OVER (ORDER BY ...)", "window frames (ROWS BETWEEN)", "moving average", "window over an aggregate"],
      learn: md`### Running totals

Add \`ORDER BY\` to an aggregate window and it accumulates row by row:

~~~sql
SELECT code, round, points,
       SUM(points) OVER (
         PARTITION BY driver_id
         ORDER BY round
       ) AS total
FROM v_points_grid;
~~~

For each driver, \`total\` is "all of their points up to and including this round". That is the data behind every points-progression chart.

### The frame: which rows does each row see?

A window function does not have to look at the whole partition. The **frame** says which rows around the current one take part:

~~~sql
AVG(x) OVER (
  PARTITION BY driver_id
  ORDER BY round
  ROWS BETWEEN 2 PRECEDING AND CURRENT ROW
)   -- a moving average of 3
~~~

- Boundaries: \`UNBOUNDED PRECEDING\`, \`n PRECEDING\`, \`CURRENT ROW\`, \`n FOLLOWING\`, \`UNBOUNDED FOLLOWING\`.
- Near the start there are fewer than three earlier rows, so the average uses what exists. The first row averages only itself.
- **ROWS counts physical rows**; **RANGE** groups rows with equal ORDER BY values ("peers"). With an \`ORDER BY\` and no frame, SQLite uses \`RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW\`, so rows tied on the ordering value all show the *same* running total. When ties are possible, say \`ROWS\` explicitly or add a unique tiebreaker column.
- No \`ORDER BY\` at all: the frame is the whole partition, so \`SUM(points) OVER (PARTITION BY driver_id)\` repeats the season total on every row.
- Watch out for \`LAST_VALUE\`: with the default frame it only sees up to the current row, so it looks like it returns the current row. Widen the frame to \`UNBOUNDED FOLLOWING\`.

### A window over an aggregate

You can compute a window over the result of a \`GROUP BY\`. Two steps, because windows run after grouping: aggregate in a CTE, then window the CTE. To compare each driver's race pace with the **fastest in that race**, first average each driver's clean laps per race, then take \`MIN(avg) OVER (PARTITION BY race)\`.

~~~sql
(avg_ms - MIN(avg_ms) OVER (PARTITION BY race_id))
  / MIN(avg_ms) OVER (PARTITION BY race_id)
~~~

### Common mistakes

- Averaging every lap blindly: a pit lap is 20 seconds slow and lap 1 is a standing start. Filter both out of "clean pace".
- Using ROWS when you meant RANGE, or the reverse.
- Forgetting the \`PARTITION BY\`: the running total then runs across all drivers.`,
      mission: md`Two big panels today.

The **points progression** line chart: every driver's running total after every round, using the gap-free \`v_points_grid\` view.

The **race pace heatmap**: how far off the quickest car each driver was in each race (as a percentage), plus a three-race moving average to show form. Clean pace only: no lap 1, no pit laps.`,
      tasks: [
        "Progression: code, round, points, total (running sum per driver by round) from v_points_grid, ordered by driver_id then round",
        "CTE clean: each driver's AVG(lap_ms) per race using only laps with pit_lap = 0 and lap > 1",
        "CTE gaps: avg_ms (rounded) and gap_pct = 100 * (avg - fastest avg in that race) / fastest avg, rounded to 2 places",
        "Final SELECT: code, round, avg_ms, gap_pct and form3, the average gap_pct over the driver's last 3 rows, ordered by code then round",
      ],
      starterAdd: sql`-- ── ✏️ YOUR TURN ───────────────────────────
-- Lesson 11: running totals, frames and pace.
-- 1. Progression, FROM v_points_grid: code, round, points and
--      total = SUM(points) OVER (PARTITION BY driver_id ORDER BY round ... UNBOUNDED PRECEDING TO CURRENT ROW)
--    Order by driver_id, round.
-- 2. Pace heatmap data.
--    CTE clean: race_id, driver_id, AVG(lap_ms) AS avg_ms from laps WHERE pit_lap = 0 AND lap > 1, per race and driver.
--    CTE gaps: join races (round) and drivers (code); avg_ms = ROUND(avg), and
--      gap_pct = ROUND(100.0 * (avg - MIN(avg) OVER (PARTITION BY race_id)) / MIN(avg) OVER (PARTITION BY race_id), 2)
--    Final: code, round, avg_ms, gap_pct and
--      form3 = ROUND(AVG(gap_pct) OVER (PARTITION BY driver_id ORDER BY round ROWS BETWEEN 2 PRECEDING AND CURRENT ROW), 2)
--    Order by code, round.
`,
      solutionAdd: sql`-- Points progression
SELECT
  code,
  round,
  points,
  SUM(points) OVER (
    PARTITION BY driver_id
    ORDER BY round
    ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
  ) AS total
FROM v_points_grid
ORDER BY driver_id, round;

-- Race pace heatmap
WITH clean AS (
  SELECT race_id, driver_id, AVG(lap_ms) AS avg_ms
  FROM laps
  WHERE pit_lap = 0 AND lap > 1
  GROUP BY race_id, driver_id
),
gaps AS (
  SELECT
    d.driver_id,
    d.code,
    ra.round,
    ROUND(c.avg_ms) AS avg_ms,
    ROUND(
      100.0 * (c.avg_ms - MIN(c.avg_ms) OVER (PARTITION BY c.race_id))
            / MIN(c.avg_ms) OVER (PARTITION BY c.race_id),
      2
    ) AS gap_pct
  FROM clean AS c
  JOIN races AS ra ON ra.race_id = c.race_id
  JOIN drivers AS d ON d.driver_id = c.driver_id
)
SELECT
  code,
  round,
  avg_ms,
  gap_pct,
  ROUND(
    AVG(gap_pct) OVER (
      PARTITION BY driver_id
      ORDER BY round
      ROWS BETWEEN 2 PRECEDING AND CURRENT ROW
    ),
    2
  ) AS form3
FROM gaps
ORDER BY code, round;`,
      explanation:
        "The running total is a window SUM whose frame grows from the driver's first round to the current one. For pace, the aggregation has to happen first (a CTE), and only then can MIN() OVER (PARTITION BY race_id) find the fastest average of each race. form3 slides a three-row frame along each driver's rounds, so early rounds average fewer values.",
      hints: [
        { id: "h1", title: "Running total", content: "SUM(points) OVER (PARTITION BY driver_id ORDER BY round ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS total. PARTITION BY keeps each driver's total separate." },
        { id: "h2", title: "Clean pace first", content: "Aggregate before windowing: WITH clean AS (SELECT race_id, driver_id, AVG(lap_ms) AS avg_ms FROM laps WHERE pit_lap = 0 AND lap > 1 GROUP BY race_id, driver_id). Then MIN(c.avg_ms) OVER (PARTITION BY c.race_id) is the fastest average of that race." },
        { id: "h3", title: "The moving average", content: "AVG(gap_pct) OVER (PARTITION BY driver_id ORDER BY round ROWS BETWEEN 2 PRECEDING AND CURRENT ROW). Wrap it in ROUND(..., 2)." },
      ],
      tests: [
        {
          id: "t1",
          description: "Progression has a running total per driver and round",
          assertionCode: t`const rs = need(["code", "round", "points", "total"], "Add the progression query: code, round, points, total", /\bover\s*\(/);
assertEqual(rs.rows.length, one("SELECT COUNT(*) * (SELECT COUNT(*) FROM races) AS n FROM drivers").n, "One row per driver per round (read from v_points_grid)");`,
        },
        {
          id: "t2",
          description: "Totals accumulate and end on each driver's season points",
          assertionCode: t`const got = data(["code", "round", "points", "total"], "", /\bover\s*\(/);
const raw = query("SELECT code, SUM(points) AS p FROM v_race_results GROUP BY code");
for (const r of raw) {
  const mine = got.filter((g) => g.code === r.code).sort((a, b) => a.round - b.round);
  assert(mine.length === 10, r.code + " should have 10 rows, one per round");
  let run = 0;
  for (const g of mine) { run += g.points; assert(g.total === run, r.code + " total after round " + g.round + " is " + g.total + ", expected " + run + " (PARTITION BY driver_id so drivers do not mix)"); }
  assertEqual(mine[9].total, r.p, r.code + " final total");
}`,
        },
        {
          id: "t3",
          description: "Pace: average clean lap and gap to the quickest car",
          assertionCode: t`const got = data(["code", "round", "avg_ms", "gap_pct", "form3"], "Add the pace query: code, round, avg_ms, gap_pct, form3");
const raw = query("SELECT l.race_id AS race_id, ra.round AS round, d.code AS code, AVG(l.lap_ms) AS avg FROM laps l JOIN races ra ON ra.race_id = l.race_id JOIN drivers d ON d.driver_id = l.driver_id WHERE l.pit_lap = 0 AND l.lap > 1 GROUP BY l.race_id, l.driver_id");
assertEqual(got.length, raw.length, "One row per driver per race with clean laps (skip lap 1 and pit laps)");
const best = {};
for (const r of raw) best[r.race_id] = Math.min(best[r.race_id] ?? Infinity, r.avg);
const want = raw.map((r) => ({ code: r.code, round: r.round, avg_ms: Math.round(r.avg), gap_pct: Math.round(100 * 100 * (r.avg - best[r.race_id]) / best[r.race_id]) / 100 }));
match(got, want, ["code", "round"], ["avg_ms", "gap_pct"], "the pace table", 0.011);`,
        },
        {
          id: "t4",
          description: "Every race has a fastest car with gap 0",
          assertionCode: t`const got = data(["code", "round", "avg_ms", "gap_pct", "form3"]);
for (let round = 1; round <= 10; round++) {
  const g = got.filter((r) => r.round === round);
  assert(g.length > 0 && Math.min(...g.map((r) => r.gap_pct)) === 0, "In round " + round + " the quickest average should have gap_pct 0 (MIN(...) OVER (PARTITION BY race_id))");
}`,
        },
        {
          id: "t5",
          description: "form3 is a moving average over the last three rows",
          assertionCode: t`const rs = need(["code", "round", "avg_ms", "gap_pct", "form3"]);
assert(/rows\s+between\s+2\s+preceding/.test(sqlOf(rs)), "Compute form3 with ROWS BETWEEN 2 PRECEDING AND CURRENT ROW");
const got = objs(rs);
for (const code of [...new Set(got.map((r) => r.code))]) {
  const mine = got.filter((r) => r.code === code).sort((a, b) => a.round - b.round);
  mine.forEach((r, i) => {
    const win = mine.slice(Math.max(0, i - 2), i + 1).map((x) => x.gap_pct);
    const avg = win.reduce((a, b) => a + b, 0) / win.length;
    assert(Math.abs(r.form3 - avg) <= 0.011, code + " form3 in round " + r.round + " is " + r.form3 + ", expected about " + avg.toFixed(2));
  });
}
got.forEach((r, i) => i > 0 && assert(got[i - 1].code < r.code || (got[i - 1].code === r.code && got[i - 1].round < r.round), "Order by code, round"));`,
        },
      ],
      unlocks: ["sa-progression", "sa-pace"],
      checks: [
        {
          prompt: "What does `AVG(x) OVER (ORDER BY round ROWS BETWEEN 2 PRECEDING AND CURRENT ROW)` return on the **first** row?",
          question: {
            type: "choice",
            options: ["NULL, because there are no two rows before it", "x of that row: the frame contains only the row itself", "0"],
            answer: 1,
          },
          explanation: "A frame never reaches outside the partition. At the start it is simply smaller, so the first row averages only itself and the second averages two values. If you want NULL until a full window exists, you have to count the frame's rows yourself.",
        },
        {
          prompt: "What does `SUM(points) OVER (PARTITION BY driver_id)` (no ORDER BY) put in each row?",
          question: {
            type: "choice",
            options: ["A running total", "The driver's whole-season total, repeated on every one of their rows", "Only the current row's points"],
            answer: 1,
          },
          explanation: "Without ORDER BY the frame is the entire partition for every row. It is the window version of GROUP BY driver_id that does not collapse the rows: handy for 'share of the driver's total'.",
        },
      ],
    },

    // ───────────────────────────── 12 ─────────────────────────────
    {
      id: "season-analytics-12-standings",
      title: "Standings with LAG and LEAD",
      minutes: 26,
      xp: 150,
      concepts: ["LAG / LEAD", "stacking CTEs and windows", "position change", "gaps to neighbours"],
      learn: md`### Looking at the neighbouring row

\`LAG(x)\` returns \`x\` from the **previous** row of the window, \`LEAD(x)\` from the **next** one. Both take an optional offset and a default for when there is no neighbour:

~~~sql
-- last round's total (NULL in round 1)
LAG(total) OVER (
  PARTITION BY driver_id ORDER BY round)
-- the same, but 0 instead of NULL
LAG(total, 1, 0) OVER (
  PARTITION BY driver_id ORDER BY round)
-- two rows ahead
LEAD(total, 2) OVER (...)
~~~

Subtract the lagged value from the current one and you get the **change**: points scored this round, places gained since last race, time between two events.

### Windows cannot be nested

You may not write \`LAG(RANK() OVER (...)) OVER (...)\`. A window function cannot take another window function as its argument. So you build the answer in **layers**, each in its own CTE:

1. Running points per driver and round (\`SUM(points) OVER ...\`).
2. The championship position in each round (\`RANK() OVER (PARTITION BY round ORDER BY total DESC)\`).
3. The previous round's position (\`LAG(pos) OVER (PARTITION BY driver_id ORDER BY round)\`).
4. Filter to the latest round, join names, and subtract.

Each layer reads like one sentence, and you can run any of them on its own to check it.

### Gaps along the table

The same functions work along the final standings. Ordered by position, \`LAG(points)\` is the car ahead and \`LEAD(points)\` the car behind, which gives the gap to each:

~~~sql
-- how far to catch the car ahead
LAG(points) OVER (ORDER BY pos, code) - points
-- lead over the car behind
points - LEAD(points) OVER (ORDER BY pos, code)
~~~

Use the same tiebreaker in the window and in the final \`ORDER BY\`, or the gaps will not line up with the rows you see.

### Common mistakes

- Using the wrong direction: position change is \`previous - current\`, so a positive number means the driver **moved up**.
- Forgetting \`PARTITION BY\`: LAG then reaches across from one driver's last row into the next driver's first.
- Filtering to the last round *before* computing LAG: there is then no previous round to look at. Filter in the outer query, after the layers.
- Ties: \`RANK\` gives equal points the same position (so 3, 3, 5). That is correct for a rank, and the last lesson decides what to do about it.`,
      mission: md`The headline panel of the whole dashboard: the **championship standings** after the final round, with a little arrow for how far each driver moved since the round before, and how many points separate each driver from the cars either side.

You will build it in layers on top of \`v_points_grid\`, which already contains every driver in every round.`,
      tasks: [
        "CTE running: each driver's running total per round (SUM OVER); CTE ranked: RANK() OVER (PARTITION BY round ORDER BY total DESC) as pos",
        "CTE moves: add prev_pos with LAG(pos) OVER (PARTITION BY driver_id ORDER BY round)",
        "Final SELECT for the last round (WHERE round = (SELECT MAX(round) FROM races)) joining drivers and teams: pos, code, name, team, points, change (prev_pos - pos)",
        "Add to_ahead (LAG of points minus own) and to_behind (own minus LEAD of points), both OVER (ORDER BY pos, code); order by pos, code",
      ],
      starterAdd: sql`-- ── ✏️ YOUR TURN ───────────────────────────
-- Lesson 12: the championship standings. Build it in layers from v_points_grid:
--   running AS (driver_id, round, total = SUM(points) OVER (PARTITION BY driver_id ORDER BY round)),
--   ranked  AS (+ pos = RANK() OVER (PARTITION BY round ORDER BY total DESC)),
--   moves   AS (+ prev_pos = LAG(pos) OVER (PARTITION BY driver_id ORDER BY round))
-- Final SELECT, only the latest round, joining drivers d and teams t:
--   pos, code, name, team, points (= total),
--   change    = prev_pos - pos   (positive = moved up)
--   to_ahead  = LAG(points)  OVER (ORDER BY pos, code) - points    (NULL for the leader)
--   to_behind = points - LEAD(points) OVER (ORDER BY pos, code)    (NULL for the last car)
-- Order by pos, code.
`,
      solutionAdd: sql`-- Championship standings after the last round
WITH running AS (
  SELECT driver_id, round, SUM(points) OVER (PARTITION BY driver_id ORDER BY round) AS total
  FROM v_points_grid
),
ranked AS (
  SELECT driver_id, round, total, RANK() OVER (PARTITION BY round ORDER BY total DESC) AS pos
  FROM running
),
moves AS (
  SELECT driver_id, round, total, pos, LAG(pos) OVER (PARTITION BY driver_id ORDER BY round) AS prev_pos
  FROM ranked
)
SELECT
  m.pos,
  d.code,
  d.name,
  t.name AS team,
  m.total AS points,
  m.prev_pos - m.pos AS change,
  LAG(m.total) OVER (ORDER BY m.pos, d.code) - m.total AS to_ahead,
  m.total - LEAD(m.total) OVER (ORDER BY m.pos, d.code) AS to_behind
FROM moves AS m
JOIN drivers AS d ON d.driver_id = m.driver_id
JOIN teams AS t ON t.team_id = d.team_id
WHERE m.round = (SELECT MAX(round) FROM races)
ORDER BY m.pos, d.code;`,
      explanation:
        "Each CTE adds one layer: running totals, then each round's league table, then the previous round's position beside it. Only after all the layers exist is the result cut down to the final round, which is why LAG could still see round 9. The last two columns run LAG and LEAD along the finished table to give the gaps to the cars either side.",
      hints: [
        { id: "h1", title: "Layers", content: "WITH running AS (...), ranked AS (SELECT ..., RANK() OVER (PARTITION BY round ORDER BY total DESC) AS pos FROM running), moves AS (SELECT ..., LAG(pos) OVER (PARTITION BY driver_id ORDER BY round) AS prev_pos FROM ranked)" },
        { id: "h2", title: "Filter late", content: "Filter with WHERE m.round = (SELECT MAX(round) FROM races) in the FINAL select. If you filter inside the CTEs, LAG has no previous round to read." },
        { id: "h3", title: "Gaps", content: "LAG(m.total) OVER (ORDER BY m.pos, d.code) - m.total AS to_ahead, and m.total - LEAD(m.total) OVER (ORDER BY m.pos, d.code) AS to_behind. Use the same ORDER BY as the final ORDER BY." },
      ],
      tests: [
        {
          id: "t1",
          description: "A standings row for every driver",
          assertionCode: t`const rs = need(["pos", "code", "name", "team", "points", "change", "to_ahead", "to_behind"], "Add the standings query: pos, code, name, team, points, change, to_ahead, to_behind", /\blag\s*\(/);
assertEqual(rs.rows.length, one("SELECT COUNT(*) AS n FROM drivers").n, "One row per driver, for the final round only");`,
        },
        {
          id: "t2",
          description: "Positions and points are the championship after the final round",
          assertionCode: t`const got = data(["pos", "code", "name", "team", "points", "change", "to_ahead", "to_behind"], "", /\blag\s*\(/);
const all = query("SELECT d.code AS code, ra.round AS round, r.points AS points FROM results r JOIN races ra ON ra.race_id = r.race_id JOIN drivers d ON d.driver_id = r.driver_id");
const codes = query("SELECT code FROM drivers").map((r) => r.code);
const totalAfter = (round) => Object.fromEntries(codes.map((c) => [c, all.filter((r) => r.code === c && r.round <= round).reduce((a, r) => a + r.points, 0)]));
const rankOf = (tot) => Object.fromEntries(codes.map((c) => [c, 1 + codes.filter((o) => tot[o] > tot[c]).length]));
const last = totalAfter(10), prev = totalAfter(9), posNow = rankOf(last), posPrev = rankOf(prev);
const want = codes.map((c) => ({ code: c, pos: posNow[c], points: last[c], change: posPrev[c] - posNow[c] }));
match(got, want, "code", ["pos", "points", "change"], "the standings");`,
        },
        {
          id: "t3",
          description: "Sorted by position, with arrows (change) the right way round",
          assertionCode: t`const got = data(["pos", "code", "name", "team", "points", "change", "to_ahead", "to_behind"], "", /\blag\s*\(/);
for (let i = 1; i < got.length; i++) assert(got[i - 1].pos < got[i].pos || (got[i - 1].pos === got[i].pos && got[i - 1].code < got[i].code), "Order by pos, code");
const ade = got.find((r) => r.code === "ADE");
assert(ade && ade.pos === 1 && ade.change === 2, "Adeyemi went from 3rd to 1st in the last round: change should be +2 (prev_pos - pos), got " + (ade && ade.change));`,
        },
        {
          id: "t4",
          description: "to_ahead and to_behind use LAG and LEAD along the table",
          assertionCode: t`const rs = need(["pos", "code", "points", "to_ahead", "to_behind"], "", /\blag\s*\(/);
assert(/\blead\s*\(/.test(sqlOf(rs)), "Use LEAD(...) for to_behind");
const got = objs(rs);
got.forEach((r, i) => {
  const ahead = i === 0 ? null : got[i - 1].points - r.points;
  const behind = i === got.length - 1 ? null : r.points - got[i + 1].points;
  assert(r.to_ahead === ahead, r.code + " to_ahead is " + r.to_ahead + ", expected " + ahead + " (LAG(points) OVER (ORDER BY pos, code) - points)");
  assert(r.to_behind === behind, r.code + " to_behind is " + r.to_behind + ", expected " + behind + " (points - LEAD(points) OVER (ORDER BY pos, code))");
});`,
        },
      ],
      unlocks: ["sa-standings"],
      checks: [
        {
          prompt: "What does `LAG(pos) OVER (PARTITION BY driver_id ORDER BY round)` return in a driver's **first** round?",
          question: { type: "choice", options: ["0", "NULL", "The driver's position in the last round"], answer: 1 },
          explanation: "There is no previous row in the partition, so LAG returns NULL (or the third argument if you give a default: LAG(pos, 1, 0)). That NULL flows through arithmetic, so 'change' is NULL for round 1, which is honest: there was no previous standing.",
        },
        {
          prompt: "Why can't `LAG(RANK() OVER (...)) OVER (...)` be written in one SELECT?",
          question: {
            type: "choice",
            options: [
              "LAG only works on integer columns",
              "Window functions cannot be nested; compute the inner one in a CTE and apply the outer one to its column",
              "RANK cannot have a PARTITION BY",
            ],
            answer: 1,
          },
          explanation: "A window function's arguments are ordinary expressions evaluated before windowing, so a window function inside another has nothing to read. Layers of CTEs are the standard answer, and they keep every step testable.",
        },
      ],
    },
  ],
};
