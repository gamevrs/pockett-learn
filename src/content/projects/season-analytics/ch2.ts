import type { Chapter } from "@/engine/types";
import { md, sql, t } from "./util.ts";

/**
 * Chapter 2: real data is messy.
 * NULLs, dates and text, set operations, recursive CTEs and views.
 */
export const chapter2: Chapter = {
  id: "messy",
  title: "Real data is messy",
  blurb: "NULLs, dates, text and gaps in the calendar, then the tools that keep it tidy: set operations, recursion and views.",
  lessons: [
    // ───────────────────────────── 5 ─────────────────────────────
    {
      id: "season-analytics-5-qualifying",
      title: "Qualifying and the NULL problem",
      minutes: 20,
      xp: 110,
      concepts: ["NULL", "IS NULL", "three-valued logic", "COUNT(*) vs COUNT(col)", "COALESCE", "NULLIF", "NOT IN trap"],
      learn: md`### NULL means "unknown", not zero

Qualifying has three knockout sessions. A driver knocked out in Q1 never drove Q2, so their \`q2_ms\` is **NULL**: there is no value, and the database says so. NULL is not 0, not an empty string and not "false". It means *unknown / missing*.

Because it is unknown, almost every operation on it is unknown too:

~~~sql
SELECT NULL = NULL;     -- NULL, not 1
SELECT NULL IS NULL;    -- 1
SELECT 1 + NULL;        -- NULL
SELECT NULL AND 0;      -- 0 (false either way)
SELECT NULL OR 1;       -- 1 (true either way)
~~~

That is **three-valued logic**: every condition is TRUE, FALSE or UNKNOWN, and \`WHERE\` keeps only the TRUE rows. So \`WHERE q2_ms = NULL\` finds nothing, ever. Use \`IS NULL\` and \`IS NOT NULL\`. Likewise \`WHERE q2_ms <> 100000\` quietly **drops** the NULL rows as well.

### COUNT(*) vs COUNT(column)

\`COUNT(*)\` counts rows. \`COUNT(q3_ms)\` counts rows where \`q3_ms\` is **not NULL**. That makes it a free way to ask "how many reached Q3?". \`SUM\`, \`AVG\`, \`MIN\` and \`MAX\` also skip NULLs, which is usually right, but an \`AVG\` over only NULLs is NULL.

### COALESCE and NULLIF

- \`COALESCE(a, b, c)\` returns the first non-NULL argument: the best time a driver set, falling back session by session. SQLite also has the two-argument \`IFNULL(a, b)\`.
- \`NULLIF(a, b)\` returns NULL when \`a = b\`, otherwise \`a\`. Two classic uses: turn a "magic" placeholder into a real NULL, and avoid dividing by zero with \`x / NULLIF(y, 0)\`.

This database has a wart that real data always has: an old timing feed wrote **0** in \`q1_ms\` for a car that crashed before setting a time. A 0 pulls every average down. \`NULLIF(q1_ms, 0)\` repairs it on the way in.

### The NOT IN trap

~~~sql
SELECT 5 NOT IN (1, 2, 3);
-- 1
SELECT 5 NOT IN (1, 2, NULL);
-- NULL: is 5 equal to the NULL? unknown
~~~

If the list from a subquery contains a single NULL, \`NOT IN\` returns **no rows at all**. Filter the NULLs out of the subquery, or use \`NOT EXISTS\` (lesson 2), which is immune.

### Sorting NULLs

SQLite sorts NULLs **first** in ascending order (Postgres puts them last). Add \`NULLS LAST\` (SQLite 3.30+) or sort by \`col IS NULL\` first when it matters.`,
      mission: md`The qualifying ladder shows how far each driver usually gets on Saturday: Q1 exit, Q2 exit or into the top six shoot-out (Q3). Raw counts are a perfect job for \`COUNT(col)\`.

You also need a **grid sheet** for one weekend, Monte Verde (round 5), where Bellini crashed before setting a time. And one query that proves how much the legacy zeros distort an average.`,
      tasks: [
        "Ladder per driver: code, sessions (COUNT(*)), timed_q1, reached_q2, reached_q3, using COUNT(column) and NULLIF for the 0 times",
        "Grid sheet for race_id 5: grid, code, session ('Q3', 'Q2', 'Q1' or 'No time') and best_ms from COALESCE, ordered by grid",
        "One row, race 5: raw_avg_ms (AVG of q1_ms) and clean_avg_ms (the same with zeros ignored), both ROUNDed",
      ],
      starterAdd: sql`-- ── ✏️ YOUR TURN ───────────────────────────
-- Lesson 5: qualifying and NULLs. q2_ms is NULL if the car was out in Q1, q3_ms is NULL
-- if it was out in Q2, and q1_ms is 0 (old feed) when the car set no time at all.
--
-- 1. Ladder, one row per driver (qualifying q JOIN drivers d, GROUP BY driver):
--      code, sessions = COUNT(*), timed_q1 = COUNT(NULLIF(q.q1_ms, 0)),
--      reached_q2 = COUNT(q.q2_ms), reached_q3 = COUNT(q.q3_ms)
--    Order by reached_q3 DESC, reached_q2 DESC, code.
-- 2. Grid sheet for race_id 5 (join results r for the grid slot):
--      grid, code, session ('Q3' / 'Q2' / 'Q1' / 'No time'), best_ms = the time from the last session
--      the driver reached, or NULL for no time. Use CASE + COALESCE + NULLIF. Order by grid.
-- 3. One row for race_id 5: raw_avg_ms = ROUND(AVG(q1_ms)), clean_avg_ms = the same ignoring zeros.
`,
      solutionAdd: sql`-- Qualifying ladder
SELECT
  d.code,
  COUNT(*) AS sessions,
  COUNT(NULLIF(q.q1_ms, 0)) AS timed_q1,
  COUNT(q.q2_ms) AS reached_q2,
  COUNT(q.q3_ms) AS reached_q3
FROM qualifying AS q
JOIN drivers AS d ON d.driver_id = q.driver_id
GROUP BY d.driver_id
ORDER BY reached_q3 DESC, reached_q2 DESC, d.code;

-- Grid sheet, Monte Verde
SELECT
  r.grid,
  d.code,
  CASE
    WHEN q.q3_ms IS NOT NULL THEN 'Q3'
    WHEN q.q2_ms IS NOT NULL THEN 'Q2'
    WHEN NULLIF(q.q1_ms, 0) IS NOT NULL THEN 'Q1'
    ELSE 'No time'
  END AS session,
  COALESCE(q.q3_ms, q.q2_ms, NULLIF(q.q1_ms, 0)) AS best_ms
FROM qualifying AS q
JOIN results AS r ON r.race_id = q.race_id AND r.driver_id = q.driver_id
JOIN drivers AS d ON d.driver_id = q.driver_id
WHERE q.race_id = 5
ORDER BY r.grid;

-- What the legacy zeros do to an average
SELECT
  ROUND(AVG(q1_ms)) AS raw_avg_ms,
  ROUND(AVG(NULLIF(q1_ms, 0))) AS clean_avg_ms
FROM qualifying
WHERE race_id = 5;`,
      explanation:
        "COUNT(column) skips NULLs, so COUNT(q3_ms) is the number of times a driver reached Q3. NULLIF(q1_ms, 0) turns the legacy 0 into a real NULL, so both COUNT and AVG ignore it. COALESCE picks the time from the last session the car reached, and the CASE says which session that was, checking from the latest backwards.",
      hints: [
        { id: "h1", title: "COUNT(column)", content: "COUNT(q.q3_ms) counts only the rows where q3_ms is not NULL. COUNT(*) counts every row. For the zeros: COUNT(NULLIF(q.q1_ms, 0))." },
        { id: "h2", title: "Latest session first", content: "Test the sessions from the last backwards: CASE WHEN q.q3_ms IS NOT NULL THEN 'Q3' WHEN q.q2_ms IS NOT NULL THEN 'Q2' WHEN NULLIF(q.q1_ms, 0) IS NOT NULL THEN 'Q1' ELSE 'No time' END." },
        { id: "h3", title: "Best time", content: "COALESCE(q.q3_ms, q.q2_ms, NULLIF(q.q1_ms, 0)) AS best_ms. Join results r ON r.race_id = q.race_id AND r.driver_id = q.driver_id to get r.grid." },
      ],
      tests: [
        {
          id: "t1",
          description: "Ladder: one row per driver with sessions and the three counts",
          assertionCode: t`const rs = need(["code", "sessions", "timed_q1", "reached_q2", "reached_q3"], "Add the ladder query: code, sessions, timed_q1, reached_q2 and reached_q3");
assertEqual(rs.rows.length, one("SELECT COUNT(DISTINCT driver_id) AS n FROM qualifying").n, "One row per driver (GROUP BY the driver)");`,
        },
        {
          id: "t2",
          description: "The counts skip NULLs and the legacy zeros",
          assertionCode: t`const got = data(["code", "sessions", "timed_q1", "reached_q2", "reached_q3"]);
const raw = query("SELECT d.code AS code, q.q1_ms AS q1, q.q2_ms AS q2, q.q3_ms AS q3 FROM qualifying q JOIN drivers d ON d.driver_id = q.driver_id");
const want = [...new Set(raw.map((r) => r.code))].map((code) => {
  const rs = raw.filter((r) => r.code === code);
  return { code, sessions: rs.length, timed_q1: rs.filter((r) => r.q1 !== null && r.q1 !== 0).length, reached_q2: rs.filter((r) => r.q2 !== null).length, reached_q3: rs.filter((r) => r.q3 !== null).length };
});
match(got, want, "code", ["sessions", "timed_q1", "reached_q2", "reached_q3"], "the ladder");`,
        },
        {
          id: "t3",
          description: "Grid sheet: the session each car reached, in grid order",
          assertionCode: t`const got = data(["grid", "code", "session", "best_ms"], "Add the grid sheet: grid, code, session and best_ms for race_id 5");
assertEqual(got.length, one("SELECT COUNT(*) AS n FROM qualifying WHERE race_id = 5").n, "One row per car in race 5");
const raw = query("SELECT r.grid AS grid, d.code AS code, q.q1_ms AS q1, q.q2_ms AS q2, q.q3_ms AS q3 FROM qualifying q JOIN results r ON r.race_id = q.race_id AND r.driver_id = q.driver_id JOIN drivers d ON d.driver_id = q.driver_id WHERE q.race_id = 5");
const want = raw.map((r) => ({ code: r.code, grid: r.grid, session: r.q3 !== null ? "Q3" : r.q2 !== null ? "Q2" : r.q1 ? "Q1" : "No time", best_ms: r.q3 !== null ? r.q3 : r.q2 !== null ? r.q2 : r.q1 ? r.q1 : null }));
match(got, want, "code", ["grid", "session", "best_ms"], "the grid sheet");
got.forEach((r, i) => i > 0 && assert(got[i - 1].grid < r.grid, "Order the sheet by grid"));`,
        },
        {
          id: "t4",
          description: "A car with no time has NULL, not 0, as best_ms",
          assertionCode: t`const got = data(["grid", "code", "session", "best_ms"]);
const none = got.filter((r) => r.session === "No time");
assert(none.length >= 1, "Bellini set no time at Monte Verde: his session should be 'No time'");
for (const r of none) assert(r.best_ms === null, r.code + " set no time, so best_ms must be NULL (NULLIF turns the 0 into NULL)");
assert(got.every((r) => r.best_ms !== 0), "best_ms must never be 0");`,
        },
        {
          id: "t5",
          description: "The legacy zeros drag the raw average down",
          assertionCode: t`const rs = data(["raw_avg_ms", "clean_avg_ms"], "Add a one-row query with raw_avg_ms and clean_avg_ms for race_id 5");
assertEqual(rs.length, 1, "One row");
const q1 = query("SELECT q1_ms AS q FROM qualifying WHERE race_id = 5").map((r) => r.q);
const timed = q1.filter((v) => v);
assertClose(rs[0].raw_avg_ms, q1.reduce((a, b) => a + b, 0) / q1.length, 1, "raw_avg_ms (AVG(q1_ms))");
assertClose(rs[0].clean_avg_ms, timed.reduce((a, b) => a + b, 0) / timed.length, 1, "clean_avg_ms (AVG(NULLIF(q1_ms, 0)))");
assert(rs[0].clean_avg_ms > rs[0].raw_avg_ms, "The cleaned average should be larger than the raw one");`,
        },
      ],
      unlocks: ["sa-qualifying"],
      checks: [
        {
          prompt: "A table has 10 rows and 4 of them have `q3_ms` NULL. What does `COUNT(q3_ms)` return?",
          question: { type: "number", answer: 6 },
          explanation: "COUNT(column) counts the non-NULL values: 10 - 4 = 6. COUNT(*) would say 10. That difference is a handy way to count missing values: COUNT(*) - COUNT(col).",
        },
        {
          prompt: "What does `SELECT 5 NOT IN (1, 2, NULL)` evaluate to?",
          question: { type: "choice", options: ["1 (true)", "0 (false)", "NULL (unknown)"], answer: 2 },
          explanation: "NOT IN means 5 <> 1 AND 5 <> 2 AND 5 <> NULL. The last part is unknown, and TRUE AND UNKNOWN is UNKNOWN, which WHERE treats as not-true. A subquery that returns even one NULL turns NOT IN into 'match nothing'. Filter the NULLs out or use NOT EXISTS.",
        },
      ],
    },

    // ───────────────────────────── 6 ─────────────────────────────
    {
      id: "season-analytics-6-calendar",
      title: "Calendar and steward reports",
      minutes: 22,
      xp: 110,
      concepts: ["date(), strftime(), julianday()", "date arithmetic", "substr / instr / upper / trim", "LIKE", "cleaning text"],
      learn: md`### Dates in SQLite

SQLite has no DATE type. You store dates as **ISO-8601 text** (\`'2026-03-08'\` or \`'2026-03-08 15:42:10'\`), which sorts correctly as plain text, and use functions to work with them:

~~~sql
SELECT date('2026-03-08', '+14 days');
-- 2026-03-22
SELECT strftime('%w', '2026-03-08');
-- '0': weekday, 0 = Sunday ... 6 = Saturday
SELECT strftime('%Y-%m', '2026-03-08');
-- 2026-03
SELECT julianday('2026-03-22')
     - julianday('2026-03-08');
-- 14.0 days
~~~

- \`date()\`, \`time()\`, \`datetime()\` format and shift a value; the second argument is a *modifier* (\`'+7 days'\`, \`'start of month'\`, \`'weekday 0'\` = the next Sunday, or the same day if it already is one).
- \`strftime(format, value)\` picks parts out: \`%Y\` year, \`%m\` month, \`%d\` day, \`%H\` hour, \`%w\` weekday, \`%j\` day of year.
- **Differences:** subtract \`julianday()\` values to get days (there is no DATEDIFF; Postgres subtracts dates directly, MySQL has DATEDIFF).
- An invalid date gives **NULL**, silently. \`'now'\` is the current time, so avoid it in anything you want to be repeatable.

### Text functions

~~~sql
SELECT 'Lena' || ' ' || 'Novak';
-- || joins text (MySQL uses CONCAT)
SELECT length('Novak');           -- 5
SELECT substr('Lena Novak', 6);   -- 'Novak'
-- positions start at 1, not 0
SELECT instr('Lena Novak', ' ');  -- 5
-- where the first space is (0 = absent)
SELECT upper('novak'), lower('NOVAK');
SELECT trim('  Track limits  ');
-- also ltrim / rtrim
SELECT replace('Track limits - T4', ' - ', ': ');
SELECT printf('%.1f km', 5.123);  -- '5.1 km'
SELECT group_concat(code, ', ')
FROM drivers WHERE team_id = 1;   -- 'NOV, ADE'
~~~

\`group_concat(x, sep)\` is an aggregate that glues a whole group's values into one text value (Postgres calls it \`string_agg\`, MySQL \`GROUP_CONCAT\`), and \`printf\` formats numbers the way C does.

- \`LIKE\` matches patterns: \`%\` is any run of characters, \`_\` exactly one. In SQLite it ignores case for plain English letters.
- Anything joined to NULL with \`||\` becomes NULL, so wrap nullable columns in \`COALESCE\`.
- **SQLite's \`upper()\` and \`lower()\` only change ASCII letters.** \`upper('Inés')\` is \`'INéS'\`. That is documented behaviour, not a bug, and a good reason to test text code on real names.

### Cleaning messy text

Stewards typed their reports at the track, and it shows: \`'TRACK LIMITS - T4'\`, \`' track limits - t9 '\`. Normalise first (\`lower(trim(reason))\`), then match with \`LIKE\` inside a \`CASE\` to put every report into a category. Fixing it on the way out like this beats editing the data.`,
      mission: md`Three small jobs for the dashboard's side panels:

- A **season calendar** that shows each race's weekday and the number of days since the previous round, so the summer break stands out.
- **Short names** for the standings (\`L. NOVAK\`).
- A **steward report summary**: how many penalties of each kind, and how many seconds they cost.`,
      tasks: [
        "Calendar: round, name, race_date, weekday ('Saturday', 'Sunday' or 'Midweek') and days_since_prev (NULL for round 1), ordered by round",
        "Short names: code and short_name, the first initial, '. ', then the surname in capitals, ordered by code",
        "Steward summary: category (Track limits, Unsafe release, Collision, Pit lane speeding, Other), penalties and seconds (NULL seconds count as 0), most penalties first",
      ],
      starterAdd: sql`-- ── ✏️ YOUR TURN ───────────────────────────
-- Lesson 6: dates and text.
-- 1. Calendar, from races (alias r), ordered by round:
--      round, name, race_date,
--      weekday          'Saturday' if strftime('%w', race_date) = '6', 'Sunday' if '0', else 'Midweek'
--      days_since_prev  whole days since the previous round (round - 1); NULL for round 1
--    Hint: subtract julianday() values and CAST to INTEGER.
-- 2. Short names: code and short_name, e.g. 'L. NOVAK' (first letter, '. ', surname in capitals).
--    The surname is everything after the first space. Order by code.
-- 3. Penalty categories from penalties.reason (messy case and spaces; use lower(reason) LIKE ...):
--      '%track limits%' -> 'Track limits', '%unsafe release%' -> 'Unsafe release',
--      '%collision%' -> 'Collision', '%pit lane%' -> 'Pit lane speeding', anything else 'Other'
--    Columns: category, penalties (COUNT), seconds (SUM of seconds, NULL counts as 0).
--    Order by penalties DESC, category.
`,
      solutionAdd: sql`-- Season calendar
SELECT
  r.round,
  r.name,
  r.race_date,
  CASE strftime('%w', r.race_date)
    WHEN '6' THEN 'Saturday'
    WHEN '0' THEN 'Sunday'
    ELSE 'Midweek'
  END AS weekday,
  CAST(julianday(r.race_date) - julianday(
    (SELECT p.race_date FROM races AS p WHERE p.round = r.round - 1)
  ) AS INTEGER) AS days_since_prev
FROM races AS r
ORDER BY r.round;

-- Short names for the standings
SELECT
  code,
  substr(name, 1, 1) || '. ' || upper(substr(name, instr(name, ' ') + 1)) AS short_name
FROM drivers
ORDER BY code;

-- Steward reports, cleaned into categories
SELECT
  CASE
    WHEN lower(reason) LIKE '%track limits%' THEN 'Track limits'
    WHEN lower(reason) LIKE '%unsafe release%' THEN 'Unsafe release'
    WHEN lower(reason) LIKE '%collision%' THEN 'Collision'
    WHEN lower(reason) LIKE '%pit lane%' THEN 'Pit lane speeding'
    ELSE 'Other'
  END AS category,
  COUNT(*) AS penalties,
  SUM(COALESCE(seconds, 0)) AS seconds
FROM penalties
GROUP BY category
ORDER BY penalties DESC, category;`,
      explanation:
        "Dates are text, so julianday() converts them to numbers you can subtract. For round 1 the correlated subquery finds no previous round, returns NULL, and NULL minus anything stays NULL. The surname starts one character after instr() finds the space. Lowercasing the report first makes LIKE patterns independent of how the steward typed it, and COALESCE keeps a drive-through (NULL seconds) from turning the sum into NULL.",
      hints: [
        { id: "h1", title: "Days between rounds", content: "CAST(julianday(r.race_date) - julianday((SELECT p.race_date FROM races AS p WHERE p.round = r.round - 1)) AS INTEGER). The subquery fetches the previous round's date." },
        { id: "h2", title: "Short name", content: "substr(name, 1, 1) is the initial. substr(name, instr(name, ' ') + 1) is everything after the first space. Join with || and wrap the surname in upper()." },
        { id: "h3", title: "Categories", content: "GROUP BY category works because SQLite lets GROUP BY use a SELECT alias. Put the CASE in the SELECT list and test lower(reason) LIKE '%collision%'. SUM(COALESCE(seconds, 0))." },
      ],
      tests: [
        {
          id: "t1",
          description: "Calendar: weekday and days since the previous round",
          assertionCode: t`const got = data(["round", "name", "race_date", "weekday", "days_since_prev"], "Add the calendar query: round, name, race_date, weekday, days_since_prev");
const races = query("SELECT round, name, race_date FROM races ORDER BY round");
assertEqual(got.length, races.length, "One row per race");
const day = (s) => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)) / 86400000;
const want = races.map((r, i) => ({ round: r.round, weekday: [ "Sunday", "Midweek", "Midweek", "Midweek", "Midweek", "Midweek", "Saturday" ][new Date(day(r.race_date) * 86400000).getUTCDay()], days_since_prev: i === 0 ? null : day(r.race_date) - day(races[i - 1].race_date) }));
match(got, want, "round", ["weekday", "days_since_prev"], "the calendar");`,
        },
        {
          id: "t2",
          description: "Round 1 has NULL days_since_prev, and the summer break shows",
          assertionCode: t`const got = data(["round", "name", "race_date", "weekday", "days_since_prev"]);
assert(got[0].round === 1 && got[0].days_since_prev === null, "Round 1 has no previous race, so days_since_prev must be NULL (not 0)");
const longest = got.reduce((a, b) => ((b.days_since_prev || 0) > (a.days_since_prev || 0) ? b : a));
assertEqual(longest.round, 8, "The summer break comes before round 8");
got.forEach((r, i) => i > 0 && assert(got[i - 1].round < r.round, "Order the calendar by round"));`,
        },
        {
          id: "t3",
          description: "Short names like L. NOVAK",
          assertionCode: t`const got = data(["code", "short_name"], "Add a SELECT of code and short_name");
const want = query("SELECT code, substr(name, 1, 1) || '. ' || upper(substr(name, instr(name, ' ') + 1)) AS short_name FROM drivers");
match(got, want, "code", ["short_name"], "the short names");
assert(got.find((r) => r.code === "NOV").short_name === "L. NOVAK", "Lena Novak should be 'L. NOVAK'");
assertEqual(got.map((r) => r.code), got.map((r) => r.code).slice().sort(), "Order by code");`,
        },
        {
          id: "t4",
          description: "Steward reports are cleaned into categories",
          assertionCode: t`const got = data(["category", "penalties", "seconds"], "Add the steward summary: category, penalties, seconds");
const raw = query("SELECT reason, seconds FROM penalties");
const cat = (s) => { s = s.toLowerCase(); return s.includes("track limits") ? "Track limits" : s.includes("unsafe release") ? "Unsafe release" : s.includes("collision") ? "Collision" : s.includes("pit lane") ? "Pit lane speeding" : "Other"; };
const names = [...new Set(raw.map((r) => cat(r.reason)))];
const want = names.map((c) => ({ category: c, penalties: raw.filter((r) => cat(r.reason) === c).length, seconds: raw.filter((r) => cat(r.reason) === c).reduce((a, r) => a + (r.seconds || 0), 0) }));
match(got, want, "category", ["penalties", "seconds"], "the steward summary");`,
        },
        {
          id: "t5",
          description: "NULL seconds count as 0 and the busiest category is first",
          assertionCode: t`const got = data(["category", "penalties", "seconds"]);
assert(got.every((r) => r.seconds !== null), "A drive-through has NULL seconds; wrap seconds in COALESCE(seconds, 0) so the total is never NULL");
for (let i = 1; i < got.length; i++) assert(got[i - 1].penalties >= got[i].penalties, "Sort by penalties DESC, then category");
assert(got.every((r) => r.category === r.category.trim()), "Categories should be tidy names");`,
        },
      ],
      unlocks: ["sa-calendar", "sa-stewards"],
      checks: [
        {
          prompt: "What does `strftime('%w', '2026-09-19')` return? (The Outback Night race.) Use 0 for Sunday ... 6 for Saturday.",
          question: { type: "text", answer: ["6"], placeholder: "a digit" },
          explanation: "2026-09-19 is a Saturday, and %w numbers days from Sunday = 0, so Saturday is '6'. Note that strftime returns text, so compare with '6', not 6.",
        },
        {
          prompt: "What does `SELECT upper('Inés')` return in SQLite?",
          question: { type: "choice", options: ["INÉS", "INéS", "inés", "An error"], answer: 1 },
          explanation: "Built-in upper() and lower() only know ASCII, so the accented é is left alone. If you need full Unicode case folding you must do it in your application (or load an ICU extension).",
        },
      ],
    },

    // ───────────────────────────── 7 ─────────────────────────────
    {
      id: "season-analytics-7-honours",
      title: "Honours board with set operations",
      minutes: 16,
      xp: 100,
      concepts: ["UNION vs UNION ALL", "INTERSECT", "EXCEPT", "compound SELECT rules"],
      learn: md`### Stack queries on top of each other

A **join** puts tables side by side. A **set operation** stacks the results of two SELECTs *on top of each other*, as long as they have the same number of columns:

~~~sql
SELECT code FROM drivers WHERE team_id = 1
UNION
SELECT code FROM drivers WHERE country = 'Japan';
~~~

- \`UNION\`: every row from either query, **duplicates removed**.
- \`UNION ALL\`: every row from either query, **duplicates kept**.
- \`INTERSECT\`: only the rows that appear in **both**.
- \`EXCEPT\`: the rows of the first query that are **not** in the second (order matters!).

### The rules

- Both sides need the **same number of columns**, in compatible types. The column names come from the **first** query.
- \`ORDER BY\` (and \`LIMIT\`) is written **once, at the very end**, and applies to the whole result. Refer to columns by the first query's names or by position (\`ORDER BY 1\`).
- Set operations compare *whole rows*, and treat two NULLs as equal.
- \`UNION\` has to find and drop duplicates, which costs a sort or hash. If you know the sides cannot overlap, or you want every row, \`UNION ALL\` is cheaper and safer: \`UNION\` can **silently merge** rows that merely happen to look alike.

### SQLite specifics

- No parentheses around the individual queries of a compound.
- With several operators in a row, SQLite evaluates strictly **left to right**. The SQL standard (and Postgres) give \`INTERSECT\` higher priority than \`UNION\`, so a mixed chain can mean different things. Use a CTE or subquery to be explicit.
- \`INTERSECT ALL\` and \`EXCEPT ALL\` do not exist in SQLite.

### Set operations or joins?

\`INTERSECT\` and \`EXCEPT\` read like the question you are asking ("winners **and** pole sitters", "podium but **not** winners") and are great for quick checks. When you need extra columns from the matching rows, use \`IN\`, \`EXISTS\` or a join.`,
      mission: md`Every sports page has an **honours board**: who has won, who has taken pole, who has set the fastest lap, and how often.

Then two classic "who is in this group but not that one" questions the commentators love.`,
      tasks: [
        "Honours roll with UNION ALL: honour ('Winner', 'Pole', 'Fastest lap'), code and total, each part with its own GROUP BY",
        "Order the roll by honour, total DESC, code",
        "INTERSECT: the codes of drivers who have both won a race and started from pole, ordered by code",
        "EXCEPT: the codes of drivers who have a podium but have never won, ordered by code",
      ],
      starterAdd: sql`-- ── ✏️ YOUR TURN ───────────────────────────
-- Lesson 7: the honours board. results has finish_pos, grid (1 = pole) and fastest_lap (1 = yes).
-- 1. UNION ALL of three SELECTs, each joining drivers and grouping by driver:
--      'Winner'      finish_pos = 1
--      'Pole'        grid = 1
--      'Fastest lap' fastest_lap = 1
--    Columns: honour, code, total (COUNT(*)). Order the whole thing by honour, total DESC, code.
-- 2. INTERSECT: codes of drivers who have won AND started from pole. Order by code.
-- 3. EXCEPT: codes of drivers who have finished on the podium (finish_pos <= 3) but never won.
`,
      solutionAdd: sql`-- Honours roll
SELECT 'Winner' AS honour, d.code, COUNT(*) AS total
FROM results AS r
JOIN drivers AS d ON d.driver_id = r.driver_id
WHERE r.finish_pos = 1
GROUP BY d.code
UNION ALL
SELECT 'Pole', d.code, COUNT(*)
FROM results AS r
JOIN drivers AS d ON d.driver_id = r.driver_id
WHERE r.grid = 1
GROUP BY d.code
UNION ALL
SELECT 'Fastest lap', d.code, COUNT(*)
FROM results AS r
JOIN drivers AS d ON d.driver_id = r.driver_id
WHERE r.fastest_lap = 1
GROUP BY d.code
ORDER BY honour, total DESC, code;

-- Won from pole
SELECT d.code
FROM results AS r
JOIN drivers AS d ON d.driver_id = r.driver_id
WHERE r.finish_pos = 1
INTERSECT
SELECT d.code
FROM results AS r
JOIN drivers AS d ON d.driver_id = r.driver_id
WHERE r.grid = 1
ORDER BY code;

-- On the podium but never a winner
SELECT d.code
FROM results AS r
JOIN drivers AS d ON d.driver_id = r.driver_id
WHERE r.finish_pos <= 3
EXCEPT
SELECT d.code
FROM results AS r
JOIN drivers AS d ON d.driver_id = r.driver_id
WHERE r.finish_pos = 1
ORDER BY code;`,
      explanation:
        "UNION ALL glues the three labelled lists together without any duplicate checking, and one ORDER BY at the end sorts the combined result. INTERSECT keeps only codes present on both sides; EXCEPT keeps codes from the first query that the second one does not contain, so swapping the two queries would answer a different question.",
      hints: [
        { id: "h1", title: "Labels", content: "Start each part with a constant: SELECT 'Winner' AS honour, d.code, COUNT(*) AS total. Only the first SELECT's names matter, but keep the column count the same in all three." },
        { id: "h2", title: "One ORDER BY", content: "ORDER BY goes once, after the last SELECT: ... GROUP BY d.code ORDER BY honour, total DESC, code;" },
        { id: "h3", title: "INTERSECT / EXCEPT", content: "SELECT d.code ... WHERE r.finish_pos = 1 INTERSECT SELECT d.code ... WHERE r.grid = 1 ORDER BY code. For EXCEPT the podium list comes first, the winners second." },
      ],
      tests: [
        {
          id: "t1",
          description: "Honours roll with honour, code and total",
          assertionCode: t`const got = data(["honour", "code", "total"], "Add the honours roll: honour, code, total", /union\s+all/);
const raw = query("SELECT d.code AS code, r.finish_pos AS pos, r.grid AS grid, r.fastest_lap AS fl FROM results r JOIN drivers d ON d.driver_id = r.driver_id");
const lists = [["Winner", (r) => r.pos === 1], ["Pole", (r) => r.grid === 1], ["Fastest lap", (r) => r.fl === 1]];
const want = lists.flatMap(([honour, f]) => [...new Set(raw.filter(f).map((r) => r.code))].map((code) => ({ honour, code, total: raw.filter((r) => r.code === code && f(r)).length })));
match(got, want, ["honour", "code"], ["total"], "the honours roll");`,
        },
        {
          id: "t2",
          description: "Sorted by honour, then total (highest first), then code",
          assertionCode: t`const got = data(["honour", "code", "total"], "", /union\s+all/);
for (let i = 1; i < got.length; i++) {
  const a = got[i - 1], b = got[i];
  const ok = a.honour < b.honour || (a.honour === b.honour && (a.total > b.total || (a.total === b.total && a.code <= b.code)));
  assert(ok, "Order the whole roll with one ORDER BY honour, total DESC, code (row " + (i + 1) + " is out of order)");
}`,
        },
        {
          id: "t3",
          description: "INTERSECT: winners who also took pole",
          assertionCode: t`const got = data(["code"], "Add a SELECT of codes that uses INTERSECT", /\bintersect\b/).map((r) => r.code);
const want = query("SELECT DISTINCT d.code AS code FROM results r JOIN drivers d ON d.driver_id = r.driver_id WHERE r.finish_pos = 1 AND d.driver_id IN (SELECT driver_id FROM results WHERE grid = 1) ORDER BY d.code").map((r) => r.code);
assertEqual(got, want, "Drivers who have won a race and started a race from pole");`,
        },
        {
          id: "t4",
          description: "EXCEPT: podium finishers who never won",
          assertionCode: t`const got = data(["code"], "Add a SELECT of codes that uses EXCEPT", /\bexcept\b/).map((r) => r.code);
const want = query("SELECT d.code AS code FROM drivers d WHERE d.driver_id IN (SELECT driver_id FROM results WHERE finish_pos <= 3) AND d.driver_id NOT IN (SELECT driver_id FROM results WHERE finish_pos = 1) ORDER BY d.code").map((r) => r.code);
assertEqual(got, want, "Podium finishers without a win");`,
        },
      ],
      unlocks: ["sa-honours"],
      checks: [
        {
          prompt: "Query A returns 4 rows, query B returns 3 rows, and 2 rows appear in both. How many rows does `A UNION B` return?",
          question: { type: "number", answer: 5 },
          explanation: "UNION removes duplicates: 4 + 3 - 2 = 5. `A UNION ALL B` keeps everything: 7. `A INTERSECT B` returns 2. `A EXCEPT B` returns 2 (A's other rows).",
        },
        {
          prompt: "Is `A EXCEPT B` the same as `B EXCEPT A`?",
          question: { type: "choice", options: ["Yes, set operations are symmetric", "No: the first query is the one being filtered"], answer: 1 },
          explanation: "EXCEPT means 'rows of the first that the second does not have'. Podium EXCEPT winners gives drivers who finished high without winning; winners EXCEPT podium would always be empty, since every winner has a podium.",
        },
      ],
    },

    // ───────────────────────────── 8 ─────────────────────────────
    {
      id: "season-analytics-8-grid",
      title: "Recursive CTEs: no gaps",
      minutes: 22,
      xp: 120,
      concepts: ["WITH RECURSIVE", "anchor + recursive member", "series generation", "LEFT JOIN gap-filling", "ON vs WHERE"],
      learn: md`### A query that calls itself

Sometimes the rows you need do not exist in any table: the numbers 1 to 10, every Sunday of the season, the chain of managers above an employee. A **recursive CTE** builds them step by step:

~~~sql
WITH RECURSIVE countdown(n) AS (
  SELECT 5          -- anchor
  UNION ALL
  SELECT n - 1      -- recursive step
  FROM countdown
  WHERE n > 1       -- stop condition
)
SELECT n FROM countdown;  -- 5 4 3 2 1
~~~

The engine runs the anchor, then keeps feeding the newest rows back into the recursive step until it produces **no new rows**. The \`WHERE n > 1\` is what makes it stop. Forget it and the query never ends, so always bound your recursion.

Postgres and MySQL require the word \`RECURSIVE\`; SQLite is relaxed about it, but write it anyway. Walking a tree works the same way. Try this one with an inline table:

~~~sql
WITH RECURSIVE
org(id, role, boss) AS (
  VALUES (1, 'Team principal', NULL),
         (2, 'Chief engineer', 1),
         (3, 'Strategist', 2),
         (4, 'Race engineer', 2)
),
chain(id, role, depth) AS (
  SELECT id, role, 0
  FROM org WHERE boss IS NULL
  UNION ALL
  SELECT o.id, o.role, chain.depth + 1
  FROM org AS o
  JOIN chain ON o.boss = chain.id
)
SELECT substr('        ', 1, depth * 2) || role
       AS org_chart
FROM chain;
~~~

### Filling the gaps in a chart

A chart wants a point for every driver in **every** round. But Sam Walsh missed rounds 5 and 6 (a reserve, Ravi Iyer, drove in his place), and Iyer appears only twice. A plain join on \`results\` has no rows for those rounds, so the chart would have holes.

The cure: generate the rounds with recursion, \`CROSS JOIN\` them with all drivers (every combination), then \`LEFT JOIN\` the results so missing combinations survive as NULL, and \`COALESCE\` them to 0:

~~~sql
FROM drivers AS d
CROSS JOIN rounds
LEFT JOIN races AS ra
  ON ra.round = rounds.n
LEFT JOIN results AS r
  ON r.race_id = ra.race_id
 AND r.driver_id = d.driver_id
~~~

### Common mistakes

- **Filtering the right-hand table in WHERE.** \`WHERE r.driver_id = d.driver_id\` removes the NULL rows a \`LEFT JOIN\` just created, turning it back into an inner join. Conditions about the optional table belong in the \`ON\` clause.
- **No stopping condition in the recursive step.** The query never ends and the browser tab freezes (the editor cannot interrupt a running query). Write the \`WHERE\` bound first, before you press Run. If it does happen, reload the page and fix the condition.
- \`UNION\` vs \`UNION ALL\`: \`UNION\` removes duplicate rows as it goes, which also stops cycles in graph walks, but costs more.`,
      mission: md`The progression chart (coming up) needs one value for every driver and every round, with a 0 when a driver was not there. Let's build that grid and keep it: it will feed three later lessons.

You also want a second sanity check on the calendar: how many weeks of the season had no race at all.`,
      tasks: [
        "WITH RECURSIVE rounds(n): the numbers 1 to the last round, bounded by (SELECT MAX(round) FROM races)",
        "The grid: code, round, points (0 if absent) and entered (1 if the driver has a results row for that round), for every driver and round, ordered by driver_id then round",
        "Season weeks: generate every Sunday from the first race's weekend to the last; report weeks, race_weeks (a race on that Sunday or the day before) and quiet_weeks",
      ],
      starterAdd: sql`-- ── ✏️ YOUR TURN ───────────────────────────
-- Lesson 8: no gaps in the points grid.
-- Safety first: write the stopping WHERE of each recursion BEFORE you run it.
-- 1+2. WITH RECURSIVE rounds(n) AS (1 .. MAX(round)), then one row per driver per round:
--        d.code, rounds.n AS round, COALESCE(r.points, 0) AS points,
--        entered = 1 when the driver has a results row for that round, else 0
--      drivers d CROSS JOIN rounds, LEFT JOIN races ra ON ra.round = rounds.n,
--      LEFT JOIN results r ON r.race_id = ra.race_id AND r.driver_id = d.driver_id
--      (Keep conditions about r in the ON clause!) Order by d.driver_id, rounds.n.
-- 3. WITH RECURSIVE sundays(day): start at date(MIN(race_date), 'weekday 0'), add 7 days
--    ('+7 days') until you pass the last race_date. Then one row:
--      weeks       how many Sundays
--      race_weeks  Sundays where some race_date is that day or the day before
--      quiet_weeks weeks - race_weeks
`,
      solutionAdd: sql`-- Points grid: every driver in every round
WITH RECURSIVE rounds(n) AS (
  SELECT 1
  UNION ALL
  SELECT n + 1 FROM rounds WHERE n < (SELECT MAX(round) FROM races)
)
SELECT
  d.code,
  rounds.n AS round,
  COALESCE(r.points, 0) AS points,
  r.result_id IS NOT NULL AS entered
FROM drivers AS d
CROSS JOIN rounds
LEFT JOIN races AS ra ON ra.round = rounds.n
LEFT JOIN results AS r ON r.race_id = ra.race_id AND r.driver_id = d.driver_id
ORDER BY d.driver_id, rounds.n;

-- Weeks of the season with and without a race
WITH RECURSIVE sundays(day) AS (
  SELECT date((SELECT MIN(race_date) FROM races), 'weekday 0')
  UNION ALL
  SELECT date(day, '+7 days')
  FROM sundays
  WHERE day < (SELECT MAX(race_date) FROM races)
),
weeks AS (
  SELECT
    s.day,
    EXISTS (
      SELECT 1 FROM races AS ra
      WHERE ra.race_date BETWEEN date(s.day, '-1 day') AND s.day
    ) AS has_race
  FROM sundays AS s
)
SELECT
  COUNT(*) AS weeks,
  SUM(has_race) AS race_weeks,
  COUNT(*) - SUM(has_race) AS quiet_weeks
FROM weeks;`,
      explanation:
        "The recursive step adds one to the previous number until the bound is reached, producing 1..10 without any table. CROSS JOIN pairs every driver with every round, and the LEFT JOIN keeps the pairs that have no result, with NULL points that COALESCE turns into 0. Because the results filter sits in ON rather than WHERE, those NULL rows survive. The Sunday series works the same way with date arithmetic instead of numbers.",
      hints: [
        { id: "h1", title: "The recursion", content: "WITH RECURSIVE rounds(n) AS (SELECT 1 UNION ALL SELECT n + 1 FROM rounds WHERE n < (SELECT MAX(round) FROM races)) SELECT ..." },
        { id: "h2", title: "Keep the empty cells", content: "FROM drivers AS d CROSS JOIN rounds LEFT JOIN races AS ra ON ra.round = rounds.n LEFT JOIN results AS r ON r.race_id = ra.race_id AND r.driver_id = d.driver_id. entered: r.result_id IS NOT NULL." },
        { id: "h3", title: "Sundays", content: "Anchor: SELECT date((SELECT MIN(race_date) FROM races), 'weekday 0'). Step: SELECT date(day, '+7 days') FROM sundays WHERE day < (SELECT MAX(race_date) FROM races). Then mark each Sunday with EXISTS (a race BETWEEN date(day, '-1 day') AND day)." },
      ],
      tests: [
        {
          id: "t1",
          description: "A row for every driver in every round",
          assertionCode: t`const got = data(["code", "round", "points", "entered"], "Add the grid query with columns code, round, points and entered", /recursive/);
const drivers = one("SELECT COUNT(*) AS n FROM drivers").n, rounds = one("SELECT COUNT(*) AS n FROM races").n;
assertEqual(got.length, drivers * rounds, "Rows in the grid (every driver x every round = " + drivers + " x " + rounds + ")");`,
        },
        {
          id: "t2",
          description: "Absent drivers have 0 points and entered = 0",
          assertionCode: t`const got = data(["code", "round", "points", "entered"], "", /recursive/);
const cell = (code, round) => got.find((r) => r.code === code && r.round === round);
assert(cell("WAL", 5) && cell("WAL", 5).points === 0 && cell("WAL", 5).entered === 0, "Walsh missed round 5: expect a row with points 0 and entered 0 (LEFT JOIN, then COALESCE)");
assert(cell("IYE", 1) && cell("IYE", 1).points === 0 && cell("IYE", 1).entered === 0, "The reserve driver Iyer should have a row for round 1 too");
assert(cell("IYE", 6) && cell("IYE", 6).entered === 1 && cell("IYE", 6).points > 0, "Iyer scored in round 6");`,
        },
        {
          id: "t3",
          description: "Points and entered match the results table",
          assertionCode: t`const got = data(["code", "round", "points", "entered"], "", /recursive/);
const raw = query("SELECT d.code AS code, ra.round AS round, r.points AS points FROM results r JOIN races ra ON ra.race_id = r.race_id JOIN drivers d ON d.driver_id = r.driver_id");
const codes = query("SELECT code FROM drivers").map((r) => r.code);
const want = [];
for (const code of codes) for (let round = 1; round <= 10; round++) { const x = raw.find((r) => r.code === code && r.round === round); want.push({ code, round, points: x ? x.points : 0, entered: x ? 1 : 0 }); }
match(got, want, ["code", "round"], ["points", "entered"], "the grid");
assertEqual(got.reduce((a, r) => a + r.points, 0), one("SELECT SUM(points) AS p FROM results").p, "Total points in the grid must equal the season total");`,
        },
        {
          id: "t4",
          description: "Ordered by driver, then round",
          assertionCode: t`const got = data(["code", "round", "points", "entered"], "", /recursive/);
const order = query("SELECT code FROM drivers ORDER BY driver_id").map((r) => r.code);
let last = -1;
got.forEach((r, i) => { const k = order.indexOf(r.code) * 100 + r.round; assert(k > last, "Order by d.driver_id, then round (row " + (i + 1) + ")"); last = k; });`,
        },
        {
          id: "t5",
          description: "Weeks of the season: how many had a race",
          assertionCode: t`const got = data(["weeks", "race_weeks", "quiet_weeks"], "Add a one-row query with weeks, race_weeks and quiet_weeks built from a recursive series of Sundays", /recursive/);
assertEqual(got.length, 1, "One row");
const day = (s) => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)) / 86400000;
const sundays = query("SELECT race_date AS d FROM races").map((r) => { const x = day(r.d); const dow = new Date(x * 86400000).getUTCDay(); return x + ((7 - dow) % 7); });
const first = Math.min(...sundays), last = Math.max(...sundays);
const weeks = (last - first) / 7 + 1, raceWeeks = new Set(sundays).size;
assertEqual(got[0].weeks, weeks, "weeks (every Sunday from the first race weekend to the last)");
assertEqual(got[0].race_weeks, raceWeeks, "race_weeks");
assertEqual(got[0].quiet_weeks, weeks - raceWeeks, "quiet_weeks");`,
        },
      ],
      unlocks: ["sa-grid"],
      checks: [
        {
          prompt: "What makes a recursive CTE stop?",
          question: {
            type: "choice",
            options: ["It stops after 100 iterations", "The recursive step returns no new rows", "The outer query's LIMIT, always", "SQLite detects the cycle and stops it"],
            answer: 1,
          },
          explanation: "The recursive part keeps running on its own newest rows until one pass produces nothing. A WHERE bound (n < 10) is what makes that happen. Without it the query runs until you kill it; SQLite will not guess for you.",
        },
        {
          prompt: "You write `FROM drivers d LEFT JOIN results r ON r.driver_id = d.driver_id WHERE r.race_id = 5`. A driver who did not enter race 5 ...",
          question: { type: "choice", options: ["appears with NULLs, as LEFT JOIN promises", "disappears from the output", "causes an error"], answer: 1 },
          explanation: "LEFT JOIN creates a row of NULLs for the unmatched driver, but then WHERE r.race_id = 5 is unknown for that row and removes it. Put the condition in the ON clause (ON ... AND r.race_id = 5) to keep the driver.",
        },
      ],
    },

    // ───────────────────────────── 9 ─────────────────────────────
    {
      id: "season-analytics-9-views",
      title: "Views and teammate head-to-head",
      minutes: 22,
      xp: 120,
      concepts: ["CREATE VIEW", "reusing queries", "self-join", "teammate comparison"],
      learn: md`### Save a query under a name

By now you have written the same four-table join three times. A **view** saves a query under a name; from then on you use it like a table:

~~~sql
CREATE VIEW v_podiums AS
SELECT ra.round, d.code, r.finish_pos
FROM results AS r
JOIN races AS ra ON ra.race_id = r.race_id
JOIN drivers AS d ON d.driver_id = r.driver_id
WHERE r.finish_pos <= 3;

SELECT * FROM v_podiums WHERE round = 4;
~~~

A view stores the **query**, not the rows: it is always as fresh as the tables underneath, and it takes no extra space.

### Why bother

- **One place to fix a bug.** Fix the view and every query that uses it is fixed.
- **Readable names** instead of a repeated wall of joins; a \`v_\` prefix tells your team it is a view.
- **A tidy interface:** other people (and charts) query \`v_race_results\` without knowing which tables sit behind it.

### Good to know

- A view can contain CTEs and even \`WITH RECURSIVE\`, so your gap-free grid from last lesson can become one.
- The \`ORDER BY\` inside a view is not a promise: sort in the query that uses it.
- SQLite views are read-only and recomputed each time (no materialized views like Postgres). \`DROP VIEW name\` removes one; \`CREATE VIEW IF NOT EXISTS\` keeps a script safe to re-run. In this editor every run starts from a fresh database, so a plain \`CREATE VIEW\` is fine.
- Columns of a view take the names in its SELECT: alias anything computed.

### Self-joins: a table against itself

Teammates are rows of the *same* view. Join the view to itself under two aliases to pair them up:

~~~sql
FROM v_race_results AS a
JOIN v_race_results AS b
  ON b.round = a.round         -- same race
 AND b.team_id = a.team_id     -- same team
 AND b.driver_id > a.driver_id -- each pair once
~~~

Without that last line you get every pair twice (A,B and B,A) plus every driver against themselves.

### Careful with retirements

A retired car has \`finish_pos\` = NULL. Comparing NULLs gives "unknown", so a retirement would count as neither ahead nor behind. Decide the rule and encode it: here a classified finisher beats a retirement, and two retirements beat nobody. \`COALESCE(finish_pos, 99)\` is the classic trick.`,
      mission: md`Every pit wall obsesses over the **teammate battle**: same car, so any gap is the driver. You'll need two reusable views (a readable results table and the points grid you just built) and then the head-to-head itself.

The later chapters will lean on both views heavily.`,
      tasks: [
        "CREATE VIEW v_race_results: round, race (race name), driver_id, code, driver (name), team_id, team, grid, finish_pos, status, points",
        "CREATE VIEW v_points_grid: last lesson's grid query with the columns driver_id, code, round, points, entered",
        "Teammate head-to-head from v_race_results with a self-join: team, driver_a, driver_b, races, a_ahead, b_ahead, a_points, b_points",
      ],
      starterAdd: sql`-- ── ✏️ YOUR TURN ───────────────────────────
-- Lesson 9: views and the teammate battle.
-- 1. CREATE VIEW v_race_results AS  (results r + races ra + drivers d + teams t)
--      ra.round, ra.name AS race, d.driver_id, d.code, d.name AS driver,
--      t.team_id, t.name AS team, r.grid, r.finish_pos, r.status, r.points
-- 2. CREATE VIEW v_points_grid AS  your recursive grid from lesson 8, now with d.driver_id first:
--      driver_id, code, round, points, entered
-- 3. Head-to-head: v_race_results a JOIN v_race_results b ON same round, same team_id, b.driver_id > a.driver_id.
--    GROUP BY the team and the pair. Columns:
--      team, driver_a (a.code), driver_b (b.code), races = COUNT(*),
--      a_ahead / b_ahead = races where that driver finished ahead (a retirement, NULL finish_pos,
--      is behind any finisher; if both retired, neither is ahead),
--      a_points / b_points = SUM of their points
--    Order by team_id, then driver ids.
`,
      solutionAdd: sql`-- A readable results view
CREATE VIEW v_race_results AS
SELECT
  ra.round,
  ra.name AS race,
  d.driver_id,
  d.code,
  d.name AS driver,
  t.team_id,
  t.name AS team,
  r.grid,
  r.finish_pos,
  r.status,
  r.points
FROM results AS r
JOIN races AS ra ON ra.race_id = r.race_id
JOIN drivers AS d ON d.driver_id = r.driver_id
JOIN teams AS t ON t.team_id = d.team_id;

-- Every driver in every round, with zeros for absences
CREATE VIEW v_points_grid AS
WITH RECURSIVE rounds(n) AS (
  SELECT 1
  UNION ALL
  SELECT n + 1 FROM rounds WHERE n < (SELECT MAX(round) FROM races)
)
SELECT
  d.driver_id,
  d.code,
  rounds.n AS round,
  COALESCE(r.points, 0) AS points,
  r.result_id IS NOT NULL AS entered
FROM drivers AS d
CROSS JOIN rounds
LEFT JOIN races AS ra ON ra.round = rounds.n
LEFT JOIN results AS r ON r.race_id = ra.race_id AND r.driver_id = d.driver_id;

-- Teammate head-to-head
SELECT
  a.team,
  a.code AS driver_a,
  b.code AS driver_b,
  COUNT(*) AS races,
  SUM(CASE WHEN COALESCE(a.finish_pos, 99) < COALESCE(b.finish_pos, 99) THEN 1 ELSE 0 END) AS a_ahead,
  SUM(CASE WHEN COALESCE(b.finish_pos, 99) < COALESCE(a.finish_pos, 99) THEN 1 ELSE 0 END) AS b_ahead,
  SUM(a.points) AS a_points,
  SUM(b.points) AS b_points
FROM v_race_results AS a
JOIN v_race_results AS b
  ON b.round = a.round
 AND b.team_id = a.team_id
 AND b.driver_id > a.driver_id
GROUP BY a.team_id, a.driver_id, b.driver_id
ORDER BY a.team_id, a.driver_id, b.driver_id;`,
      explanation:
        "The first view hides the four-table join behind one name. The second wraps the recursive grid, so later queries can simply SELECT from v_points_grid. The head-to-head joins the first view to itself: matching round and team pairs teammates, and b.driver_id > a.driver_id makes each pair appear once. COALESCE(finish_pos, 99) pushes a retirement behind every finisher, and two retirements compare equal so neither side scores.",
      hints: [
        { id: "h1", title: "View syntax", content: "CREATE VIEW v_race_results AS SELECT ... FROM results AS r JOIN races AS ra ... JOIN drivers AS d ... JOIN teams AS t ...; Alias the renamed columns: ra.name AS race, d.name AS driver, t.name AS team." },
        { id: "h2", title: "A view around a CTE", content: "CREATE VIEW v_points_grid AS WITH RECURSIVE rounds(n) AS (...) SELECT d.driver_id, d.code, rounds.n AS round, ... Drop the ORDER BY from inside the view." },
        { id: "h3", title: "The self-join", content: "FROM v_race_results AS a JOIN v_race_results AS b ON b.round = a.round AND b.team_id = a.team_id AND b.driver_id > a.driver_id. Count a win for a when COALESCE(a.finish_pos, 99) < COALESCE(b.finish_pos, 99)." },
      ],
      tests: [
        {
          id: "t1",
          description: "v_race_results exists with the right columns and rows",
          assertionCode: t`const views = query("SELECT name FROM sqlite_master WHERE type = 'view'").map((r) => r.name);
assert(views.includes("v_race_results"), "Create the view with CREATE VIEW v_race_results AS SELECT ...");
const cols = query("PRAGMA table_info(v_race_results)").map((r) => r.name);
assertEqual(cols, ["round", "race", "driver_id", "code", "driver", "team_id", "team", "grid", "finish_pos", "status", "points"], "Columns of v_race_results, in order");
assertEqual(one("SELECT COUNT(*) AS n FROM v_race_results").n, one("SELECT COUNT(*) AS n FROM results").n, "v_race_results should have one row per result");`,
        },
        {
          id: "t2",
          description: "v_points_grid holds every driver x round with zero-filled gaps",
          assertionCode: t`const views = query("SELECT name FROM sqlite_master WHERE type = 'view'").map((r) => r.name);
assert(views.includes("v_points_grid"), "Create the view with CREATE VIEW v_points_grid AS WITH RECURSIVE ...");
const cols = query("PRAGMA table_info(v_points_grid)").map((r) => r.name);
assertEqual(cols, ["driver_id", "code", "round", "points", "entered"], "Columns of v_points_grid, in order");
assertEqual(one("SELECT COUNT(*) AS n FROM v_points_grid").n, one("SELECT COUNT(*) * (SELECT COUNT(*) FROM races) AS n FROM drivers").n, "Rows in v_points_grid (drivers x rounds)");
assertEqual(one("SELECT SUM(points) AS p FROM v_points_grid").p, one("SELECT SUM(points) AS p FROM results").p, "Points in the grid must add up to the season total");`,
        },
        {
          id: "t3",
          description: "Teammate head-to-head: one row per pair of teammates",
          assertionCode: t`const rs = need(["team", "driver_a", "driver_b", "races", "a_ahead", "b_ahead", "a_points", "b_points"], "Add the head-to-head query with columns team, driver_a, driver_b, races, a_ahead, b_ahead, a_points and b_points");
assert(/v_race_results/.test(sqlOf(rs)), "Build the head-to-head from the view v_race_results (joined to itself)");
const raw = query("SELECT ra.round AS round, d.team_id AS team_id, d.driver_id AS id, d.code AS code, r.finish_pos AS pos, r.points AS points FROM results r JOIN races ra ON ra.race_id = r.race_id JOIN drivers d ON d.driver_id = r.driver_id");
const want = [];
for (const a of raw) for (const b of raw) if (a.round === b.round && a.team_id === b.team_id && b.id > a.id) {
  const k = a.code + "/" + b.code;
  let w = want.find((x) => x.pair === k);
  if (!w) want.push((w = { pair: k, driver_a: a.code, driver_b: b.code, races: 0, a_ahead: 0, b_ahead: 0, a_points: 0, b_points: 0 }));
  const pa = a.pos === null ? 99 : a.pos, pb = b.pos === null ? 99 : b.pos;
  w.races++; w.a_points += a.points; w.b_points += b.points;
  if (pa < pb) w.a_ahead++; if (pb < pa) w.b_ahead++;
}
const got = objs(rs).map((r) => ({ ...r, pair: r.driver_a + "/" + r.driver_b }));
match(got, want, "pair", ["races", "a_ahead", "b_ahead", "a_points", "b_points"], "the head-to-head");`,
        },
        {
          id: "t4",
          description: "Retirements count as behind, and each pair appears once",
          assertionCode: t`const got = data(["team", "driver_a", "driver_b", "races", "a_ahead", "b_ahead", "a_points", "b_points"]);
const pairs = got.map((r) => [r.driver_a, r.driver_b].sort().join("/"));
assertEqual(new Set(pairs).size, pairs.length, "Each teammate pair should appear once (use b.driver_id > a.driver_id)");
assert(got.every((r) => r.driver_a !== r.driver_b), "A driver must not be paired with themselves");
const nov = got.find((r) => r.driver_a === "NOV" && r.driver_b === "ADE") || got.find((r) => r.driver_a === "ADE" && r.driver_b === "NOV");
assert(nov, "Halcyon's pair NOV / ADE is missing");
assert(got.every((r) => r.a_ahead + r.b_ahead <= r.races), "a_ahead + b_ahead can never be more than the races shared");`,
        },
      ],
      unlocks: ["sa-h2h"],
      checks: [
        {
          prompt: "What does a view store?",
          question: { type: "choice", options: ["A copy of the result rows", "The text of the query, which is run each time you use the view", "An index on the underlying tables"], answer: 1 },
          explanation: "Only the query. Use the view and SQLite runs that query against today's tables, so it never goes stale. The price is that an expensive view is expensive every time (SQLite has no materialized views).",
        },
        {
          prompt: "In a teammate self-join, why add `AND b.driver_id > a.driver_id` to the ON clause?",
          question: {
            type: "choice",
            options: [
              "To make the join run faster",
              "So each pair appears once, and no driver is paired with themselves",
              "Because SQLite cannot join a view to itself otherwise",
            ],
            answer: 1,
          },
          explanation: "Without it you also get (B, A) next to (A, B), doubling every count, and (A, A) pairs where a driver 'beats' themselves. A strict inequality on the id keeps exactly one orientation.",
        },
      ],
    },
  ],
};
