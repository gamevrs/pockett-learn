import type { ConceptLesson } from "../../learn/types.ts";

/** Fenced SQL block for lesson prose. */
const sql = (code: string) => "~~~sql\n" + code.trim() + "\n~~~";
/** Fenced plain-text block (tables the learner cannot see because they live in a hidden setup). */
const txt = (code: string) => "~~~text\n" + code.replace(/^\n+|\s+$/g, "") + "\n~~~";

type Tone = "active" | "done" | "path";
/** Tones for a whole grid row of `n` columns. */
const rowN = (r: number, n: number, tone: Tone) => Array.from({ length: n }, (_, c) => ({ r, c, tone }));

// ── trace data ──
const STEPS_CODE = ["SELECT day, n,", "  LAG(n) OVER (ORDER BY day) AS prev,", "  SUM(n) OVER (ORDER BY day) AS run", "FROM steps;"];
const stepsGrid = (filled: (string | number)[][]) => [["day", "n", "prev", "run"], ...[[1, 5], [2, 3], [3, 8], [4, 2]].map((r, i) => [...r, ...(filled[i] ?? ["", ""])])];

const SONGS_CODE = ["WITH r AS (", "  SELECT *, DENSE_RANK() OVER (", "    PARTITION BY g ORDER BY n DESC) AS dr", "  FROM songs)", "SELECT * FROM r WHERE dr <= 2;"];
const SONGS = [
  ["pop", "A", 90],
  ["pop", "B", 90],
  ["pop", "C", 70],
  ["pop", "D", 50],
  ["rock", "E", 80],
  ["rock", "F", 60],
];
const songsGrid = (dr: (number | string)[]) => [["g", "song", "n", "dr"], ...SONGS.map((r, i) => [...r, dr[i] ?? ""])];

const SALES_GRID = [
  ["mon", "cat", "amt"],
  ["Jan", "tea", 5],
  ["Jan", "pie", 8],
  ["Feb", "tea", 3],
  ["Jan", "tea", 4],
  ["Feb", "pie", 6],
];
const SALES_CODE = ["SELECT mon,", "  SUM(CASE WHEN cat = 'tea' THEN amt ELSE 0 END) AS tea,", "  SUM(CASE WHEN cat = 'pie' THEN amt ELSE 0 END) AS pie", "FROM sales", "GROUP BY mon;"];

const FOLDER_NODES = [
  { id: "root", label: "root" },
  { id: "docs", label: "docs", parent: "root" },
  { id: "pics", label: "pics", parent: "root" },
  { id: "work", label: "work", parent: "docs" },
  { id: "cv", label: "cv", parent: "docs" },
  { id: "cats", label: "cats", parent: "pics" },
  { id: "q1", label: "q1", parent: "work" },
];
const FOLDER_CODE = [
  "WITH RECURSIVE sub(id, name, depth) AS (",
  "  SELECT id, name, 0 FROM folders WHERE name = 'docs'",
  "  UNION ALL",
  "  SELECT f.id, f.name, s.depth + 1",
  "  FROM folders f JOIN sub s ON f.parent_id = s.id",
  ")",
  "SELECT name, depth FROM sub;",
];

export const ivDatabaseLessonsB: ConceptLesson[] = [
  // ─────────────────────────────── 5. Window functions ───────────────────────────────
  {
    id: "fnd-iv-database-5-window",
    title: "Window functions",
    summary: "OVER, PARTITION BY and ORDER BY: ranks, previous rows and running totals without losing rows.",
    minutes: 16,
    xp: 90,
    level: "Advanced",
    steps: [
      {
        kind: "explain",
        title: "Aggregates that keep every row",
        body:
          "GROUP BY squashes each group to one row. A **window function** computes over a group of rows too, but writes the answer **next to every row**. The group is described after `OVER`:\n\n" +
          sql(`
SELECT acct, day, amount,
  SUM(amount) OVER (PARTITION BY acct ORDER BY day) AS balance,
  LAG(amount) OVER (PARTITION BY acct ORDER BY day) AS previous,
  ROW_NUMBER() OVER (PARTITION BY acct ORDER BY amount DESC) AS rn
FROM ledger;
`) +
          "\n\n- `PARTITION BY` splits the rows into independent windows (like GROUP BY, but nothing is squashed). Leave it out for one window over everything.\n- `ORDER BY` inside OVER sets the order the function walks in.\n- `ROW_NUMBER()` numbers 1, 2, 3, …; `RANK()` gives ties the same number and **skips** (1, 1, 3); `DENSE_RANK()` gives ties the same number and doesn't skip (1, 1, 2).\n- `LAG(x)` / `LEAD(x)` read `x` from the previous / next row (NULL when there is none; `LAG(x, 1, 0)` gives 0 instead).\n- `SUM(x) OVER (ORDER BY …)` is a **running total**. By default ties in the ORDER BY are added together (the frame is `RANGE … CURRENT ROW`), so give a tie-breaker or write `ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW`.\n\nWindow functions run **after** WHERE and GROUP BY, so to filter on one, compute it in a CTE and filter outside.\n\n**How to spot it:** *running*, *cumulative*, *compared with the previous*, *rank*, *N-th within each*, *change since*, *consecutive*.",
      },
      {
        kind: "question",
        title: "LAG and a running total",
        body: "Step through the query. Each row gets two new columns, and no row disappears. At the stop, tap the cell that `prev` copies for day 3.",
        widget: {
          type: "iv-trace",
          props: {
            lang: "sql",
            title: "LAG(n) and SUM(n) over the days",
            frames: [
              { grid: stepsGrid([]), code: STEPS_CODE, line: 1, note: "The window is the whole table, walked in `day` order." },
              { grid: stepsGrid([["NULL", 5]]), cells: rowN(1, 4, "active"), line: 2, note: "Day 1 has no row before it, so `LAG(n)` is **NULL**. The running total is 5." },
              { grid: stepsGrid([["NULL", 5], [5, 8]]), cells: [...rowN(1, 4, "done"), ...rowN(2, 4, "active")], line: 3, note: "Day 2: `prev` is day 1's n (5), and `run` is 5 + 3 = 8." },
              { cells: [...rowN(1, 4, "done"), ...rowN(2, 4, "done"), ...rowN(3, 4, "active")], line: 2, note: "Now day 3.", pick: { prompt: "Which cell does `prev` copy for day 3? Tap it.", answer: "2,1" } },
              { grid: stepsGrid([["NULL", 5], [5, 8], [3, 16]]), cells: [...rowN(1, 4, "done"), ...rowN(2, 4, "done"), ...rowN(3, 4, "active")], line: 3, note: "`prev` = 3 (day 2's n). `run` = 8 + 8 = 16." },
              { grid: stepsGrid([["NULL", 5], [5, 8], [3, 16], [8, 18]]), cells: [...rowN(1, 4, "done"), ...rowN(2, 4, "done"), ...rowN(3, 4, "done"), ...rowN(4, 4, "active")], line: 4, note: "Day 4: prev 8, run 18. Four rows in, **four rows out**: that's the difference from GROUP BY." },
            ],
          },
        },
        question: { type: "widget", goal: { picked: true }, prompt: "Answer the pick.", hint: "LAG reads the same column, `n`, one row earlier in the window's order." },
        explanation: "`LAG(n)` looks one row back in the `ORDER BY day` order and reads `n` there, so day 3 gets day 2's 3. `SUM(n) OVER (ORDER BY day)` adds every n up to the current row.",
      },
      {
        kind: "question",
        title: "Ranks with a tie",
        body: "Scores, highest first: 90, 90, 80. What does `RANK() OVER (ORDER BY score DESC)` give them?",
        question: {
          type: "choice",
          options: ["1, 1, 3", "1, 2, 3", "1, 1, 2", "1, 1, 1"],
          answer: 0,
          feedback: { 1: "That's ROW_NUMBER: ties get different numbers.", 2: "That's DENSE_RANK: no gap after the tie." },
          hint: "RANK counts how many rows are strictly ahead of you, plus one.",
        },
        explanation: "RANK gives tied rows the same rank and then skips: two rows share 1, so the next is 3. DENSE_RANK would say 1, 1, 2; ROW_NUMBER 1, 2, 3 (in an arbitrary order among the ties).",
      },
      {
        kind: "question",
        title: "Dense ranks",
        body: "Scores 95, 90, 90, 80. Find the `DENSE_RANK() OVER (ORDER BY score DESC)` of the 80.",
        question: { type: "number", answer: 3, hint: "DENSE_RANK counts distinct values ahead of you, plus one." },
        explanation: "The distinct values ahead of 80 are 95 and 90, so 80 is 3rd. RANK would make it 4th.",
      },
      {
        kind: "question",
        title: "Filtering on a window",
        body: sql("SELECT * FROM visits\nWHERE ROW_NUMBER() OVER (PARTITION BY user ORDER BY ts) = 1;") + "\nThis is an error. Why?",
        question: {
          type: "choice",
          options: ["ROW_NUMBER needs a PARTITION BY clause", "SQLite has no ROW_NUMBER function at all", "WHERE can only compare plain table columns", "WHERE runs before window functions exist"],
          answer: 3,
          feedback: { 0: "It has one here. And PARTITION BY is optional anyway.", 1: "SQLite has supported window functions since 3.25 (2018)." },
          hint: "Recall the logical order: WHERE, GROUP BY, HAVING, then SELECT, where the windows are computed.",
        },
        explanation: "Window functions are computed with SELECT, after WHERE has run. Compute the number in a CTE (`WITH v AS (SELECT *, ROW_NUMBER() OVER (…) AS rn FROM visits)`) and filter `WHERE rn = 1` outside.",
      },
      {
        kind: "code",
        title: "Running balance",
        body:
          "A bank `ledger`; several entries can land on the same day:\n\n" +
          txt(`
ledger
 id | acct | day        | amount
----+------+------------+-------
  1 | A    | 2026-03-01 | 100
  2 | A    | 2026-03-02 | -30
  3 | B    | 2026-03-01 | 50
  4 | A    | 2026-03-02 | -20
  5 | B    | 2026-03-04 | 25
  6 | A    | 2026-03-05 | 10
  7 | B    | 2026-03-04 | -60
`) +
          "\nReturn `id`, `acct` and `balance`: the account's running total after that entry. Each account starts from 0. Entries on the same day apply in `id` order. Order the output by `acct`, `day`, `id`.",
        language: "sql",
        setup: `CREATE TABLE ledger (id INTEGER PRIMARY KEY, acct TEXT, day TEXT, amount INTEGER);
INSERT INTO ledger VALUES (1, 'A', '2026-03-01', 100), (2, 'A', '2026-03-02', -30), (3, 'B', '2026-03-01', 50), (4, 'A', '2026-03-02', -20), (5, 'B', '2026-03-04', 25), (6, 'A', '2026-03-05', 10), (7, 'B', '2026-03-04', -60);`,
        starter: `SELECT id, acct, SUM(amount) AS balance
FROM ledger
GROUP BY acct;
`,
        solution: `SELECT id, acct,
  SUM(amount) OVER (PARTITION BY acct ORDER BY day, id) AS balance
FROM ledger
ORDER BY acct, day, id;
`,
        tests: [
          { id: "t1", description: "one row per entry", assertionCode: `assertEqual(rows.length, 7, "A window function keeps every row: expected 7 rows");` },
          { id: "t2", description: "account A's balances", assertionCode: `assertEqual(rows.filter((r) => r.acct === "A").map((r) => r.balance), [100, 70, 50, 60], "A goes 100, 70, 50, 60");` },
          { id: "t3", description: "each account starts from 0", assertionCode: `assertEqual(rows.filter((r) => r.acct === "B").map((r) => r.balance), [50, 75, 15], "B goes 50, 75, 15. Did you PARTITION BY acct?");` },
          { id: "t4", description: "same-day entries get their own balance", assertionCode: `const two = rows.find((r) => r.id === 2);\nassert(two !== undefined && two.balance === 70, "Entry 2 should show 70, not the end-of-day 50. Order the window by day, then id");\nassertEqual(rows.map((r) => r.id), [1, 2, 4, 6, 3, 5, 7], "Order by acct, day, id");` },
        ],
        hints: ["`SUM(amount) OVER (PARTITION BY acct ORDER BY …)` keeps the rows.", "With only `ORDER BY day`, entries 2 and 4 share a day and get the same total. Add `id` as a tie-breaker."],
      },
      {
        kind: "code",
        title: "Change since the last reading",
        body:
          "Sensors report a value now and then:\n\n" +
          txt(`
readings
 sensor | ts    | value
--------+-------+------
 s1     | 08:00 | 20
 s2     | 08:00 | 5
 s1     | 09:00 | 23
 s1     | 10:00 | 21
 s2     | 09:30 | 9
 s2     | 11:00 | 9
`) +
          "\nReturn `sensor`, `ts` and `change`: this value minus the **same sensor's** previous value (NULL for a sensor's first reading). Order by `sensor`, `ts`.",
        language: "sql",
        setup: `CREATE TABLE readings (sensor TEXT, ts TEXT, value INTEGER);
INSERT INTO readings VALUES ('s1', '08:00', 20), ('s2', '08:00', 5), ('s1', '09:00', 23), ('s1', '10:00', 21), ('s2', '09:30', 9), ('s2', '11:00', 9);`,
        starter: `SELECT sensor, ts, value AS change
FROM readings
ORDER BY sensor, ts;
`,
        solution: `SELECT sensor, ts,
  value - LAG(value) OVER (PARTITION BY sensor ORDER BY ts) AS change
FROM readings
ORDER BY sensor, ts;
`,
        tests: [
          { id: "t1", description: "a first reading has no change", assertionCode: `const firsts = rows.filter((r) => r.ts === "08:00");\nassert(firsts.length === 2 && firsts.every((r) => r.change === null), "Each sensor's first reading has nothing before it, so change is NULL");` },
          { id: "t2", description: "sensor s1", assertionCode: `assertEqual(rows.filter((r) => r.sensor === "s1").map((r) => r.change), [null, 3, -2], "s1 goes 20, 23, 21");` },
          { id: "t3", description: "sensor s2 doesn't look at s1", assertionCode: `assertEqual(rows.filter((r) => r.sensor === "s2").map((r) => r.change), [null, 4, 0], "s2 goes 5, 9, 9. PARTITION BY sensor keeps s1's values out");` },
        ],
        hints: ["`LAG(value) OVER (…)` reads the previous row's value; subtract it from `value`.", "Partition by sensor and order by ts, so each sensor has its own history."],
      },
      {
        kind: "recap",
        points: [
          "A **window function** computes over related rows and keeps every row; `OVER (PARTITION BY … ORDER BY …)` says which rows and in what order.",
          "`ROW_NUMBER` 1, 2, 3 · `RANK` 1, 1, 3 · `DENSE_RANK` 1, 1, 2.",
          "`LAG` / `LEAD` read the previous / next row; the first row gets NULL (or a default).",
          "`SUM() OVER (ORDER BY …)` is a running total; break ties in the order, or use `ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW`.",
          "Windows are computed after WHERE: filter on them in an outer query or CTE.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 6. Top N per group ───────────────────────────────
  {
    id: "fnd-iv-database-6-top-n",
    title: "Top N per group and ranking",
    summary: "Rank inside each group in a CTE, then filter; choosing between ROW_NUMBER, RANK and DENSE_RANK; keeping the latest row.",
    minutes: 15,
    xp: 90,
    level: "Advanced",
    steps: [
      {
        kind: "explain",
        title: "Rank, then filter",
        body:
          "\"The top 3 per department\", \"each customer's latest order\", \"the best-selling item in every category\": these are **top-N per group** questions, and one shape solves them all:\n\n" +
          sql(`
WITH ranked AS (
  SELECT *,
    DENSE_RANK() OVER (PARTITION BY dept ORDER BY pay DESC) AS r
  FROM staff
)
SELECT dept, name, pay
FROM ranked
WHERE r <= 3;
`) +
          "\n\nThe only real decision is **what ties should do**:\n\n" +
          "| function | ties | use it for |\n|---|---|---|\n| `ROW_NUMBER()` | broken arbitrarily (add a tie-breaker!) | exactly N rows; dedupe; the single latest row |\n| `RANK()` | share a rank, then skip | \"top N places\", like a race |\n| `DENSE_RANK()` | share a rank, no skip | \"the N highest **values**\", everyone with them |\n\n" +
          "Before window functions people wrote a correlated count: *keep a row if fewer than N distinct values in its group are bigger*. It still works, but it's slower and harder to read.\n\n**How to spot it:** *top / highest / latest / first … per / in each / for every*. Then ask: with a tie, should both rows come back?",
      },
      {
        kind: "question",
        title: "Who falls out of the top 2?",
        body: "Step through DENSE_RANK inside each genre `g`. At the stop, tap the first pop song that `dr <= 2` removes.",
        widget: {
          type: "iv-trace",
          props: {
            lang: "sql",
            title: "DENSE_RANK per genre, keep dr ≤ 2",
            frames: [
              { grid: songsGrid([]), code: SONGS_CODE, line: 3, note: "Two partitions, pop and rock, each sorted by plays `n`, highest first." },
              { grid: songsGrid([1, 1]), cells: [...rowN(1, 4, "active"), ...rowN(2, 4, "active")], line: 2, note: "A and B tie at 90: both get **1**." },
              { grid: songsGrid([1, 1, 2]), cells: [...rowN(1, 4, "done"), ...rowN(2, 4, "done"), ...rowN(3, 4, "active")], line: 2, note: "C (70) is the next distinct value: **2**. (RANK would say 3.)" },
              { cells: [...rowN(1, 4, "done"), ...rowN(2, 4, "done"), ...rowN(3, 4, "done")], line: 5, note: "Before D gets its rank:", pick: { prompt: "Which pop song is the first one `dr <= 2` removes? Tap its name.", answer: "4,1" } },
              { grid: songsGrid([1, 1, 2, 3, 1, 2]), cells: [...rowN(1, 4, "path"), ...rowN(2, 4, "path"), ...rowN(3, 4, "path"), ...rowN(4, 4, "done"), ...rowN(5, 4, "path"), ...rowN(6, 4, "path")], line: 5, note: "D is 3rd and drops out. Rock restarts at 1: E = 1, F = 2. Five rows survive." },
              { grid: [["g", "song", "n", "rn"], ["pop", "A", 90, 1], ["pop", "B", 90, 2], ["pop", "C", 70, 3], ["pop", "D", 50, 4], ["rock", "E", 80, 1], ["rock", "F", 60, 2]], cells: [...rowN(1, 4, "path"), ...rowN(2, 4, "path"), ...rowN(3, 4, "done"), ...rowN(4, 4, "done"), ...rowN(5, 4, "path"), ...rowN(6, 4, "path")], line: 2, note: "With `ROW_NUMBER()` instead, exactly two per genre survive and C is lost. Neither is wrong: the question decides." },
            ],
          },
        },
        question: { type: "widget", goal: { picked: true }, prompt: "Answer the pick.", hint: "DENSE_RANK gives A and B rank 1 and C rank 2. What rank does the next song get?" },
        explanation: "DENSE_RANK numbers distinct play counts: 90 → 1, 70 → 2, 50 → 3. Filtering `dr <= 2` keeps every song with one of the two highest counts, so D goes.",
      },
      {
        kind: "question",
        title: "Pick the function",
        body: "\"Show each team's members with the **three highest scores** in that team. If people tie on a score, all of them are shown, and the next score down still counts as one of the three.\" Which ranking function do you filter on?",
        question: {
          type: "choice",
          options: ["ROW_NUMBER()", "RANK()", "DENSE_RANK()", "NTILE(3)"],
          answer: 2,
          feedback: { 0: "ROW_NUMBER returns exactly 3 rows and drops tied people arbitrarily.", 1: "RANK skips after a tie, so the next score down could be ranked 4 and get lost.", 3: "NTILE splits the rows into 3 equal buckets; it doesn't rank values." },
          hint: "Ties share a number, and the numbering must not skip after them.",
        },
        explanation: "\"Three highest score values, all people with them\" is DENSE_RANK ≤ 3. RANK fits \"the first three places\" (a tie for 1st means no 2nd place), ROW_NUMBER fits \"exactly three rows\".",
      },
      {
        kind: "question",
        title: "RANK keeps fewer",
        body: "Same songs as the trace: pop has plays 90, 90, 70, 50. How many pop songs does `RANK() … <= 2` keep?",
        question: { type: "number", answer: 2, hint: "Write out RANK for 90, 90, 70, 50: it skips after the tie." },
        explanation: "RANK gives 1, 1, 3, 4, so only A and B are ≤ 2. DENSE_RANK kept three songs (1, 1, 2) and ROW_NUMBER keeps two (1, 2).",
      },
      {
        kind: "question",
        title: "Keep the latest row",
        body: "Keep only each user's **latest** login. Two logins of the same user can share a timestamp, and you need exactly one row per user. Which is safest?",
        question: {
          type: "choice",
          options: ["RANK() by time DESC and keep rank 1", "ROW_NUMBER() by time DESC, id DESC; keep 1", "Join MAX(time) per user back to the table", "GROUP BY user with ORDER BY time DESC"],
          answer: 1,
          feedback: { 0: "Two logins at the same time both get rank 1.", 2: "Both rows with the maximum time match the join.", 3: "GROUP BY can't pick a whole row; the other columns would come from an arbitrary row." },
          hint: "Which function never gives two rows the same number, and what makes its choice deterministic?",
        },
        explanation: "ROW_NUMBER always numbers 1, 2, 3 within a partition, and a tie-breaker (`id DESC`) makes the choice repeatable. This is the standard dedupe: number the rows, keep `rn = 1`.",
      },
      {
        kind: "code",
        title: "Hits per genre",
        body:
          "A music app's `songs`:\n\n" +
          txt(`
songs
 id | genre | title     | plays
----+-------+-----------+------
  1 | jazz  | Blue Hour | 40
  2 | jazz  | Low Tide  | 55
  3 | jazz  | Night Bus | 55
  4 | jazz  | Slow Rain | 30
  5 | jazz  | Tin Roof  | 40
  6 | folk  | Hill Song | 12
  7 | folk  | Old Road  | 20
  8 | folk  | River     | 7
  9 | soul  | Glow      | 99
`) +
          "\nFor each genre, return every song whose play count is one of the **two highest play counts** in that genre (ties all count). Columns `genre`, `title`, `plays`; order by `genre`, then `plays` descending, then `title`.",
        language: "sql",
        setup: `CREATE TABLE songs (id INTEGER PRIMARY KEY, genre TEXT, title TEXT, plays INTEGER);
INSERT INTO songs VALUES (1, 'jazz', 'Blue Hour', 40), (2, 'jazz', 'Low Tide', 55), (3, 'jazz', 'Night Bus', 55), (4, 'jazz', 'Slow Rain', 30), (5, 'jazz', 'Tin Roof', 40), (6, 'folk', 'Hill Song', 12), (7, 'folk', 'Old Road', 20), (8, 'folk', 'River', 7), (9, 'soul', 'Glow', 99);`,
        starter: `SELECT genre, title, plays
FROM songs
ORDER BY plays DESC
LIMIT 2;
`,
        solution: `WITH ranked AS (
  SELECT genre, title, plays,
    DENSE_RANK() OVER (PARTITION BY genre ORDER BY plays DESC) AS r
  FROM songs
)
SELECT genre, title, plays
FROM ranked
WHERE r <= 2
ORDER BY genre, plays DESC, title;
`,
        tests: [
          { id: "t1", description: "ties keep every song", assertionCode: `assertEqual(rows.filter((r) => r.genre === "jazz").map((r) => r.title), ["Low Tide", "Night Bus", "Blue Hour", "Tin Roof"], "jazz's two highest counts are 55 and 40, and two songs have each. ROW_NUMBER or RANK would lose some");` },
          { id: "t2", description: "every genre gets its own top two", assertionCode: `assertEqual(rows.filter((r) => r.genre === "folk").map((r) => r.title), ["Old Road", "Hill Song"], "folk's top counts are 20 and 12. Rank inside each genre with PARTITION BY");` },
          { id: "t3", description: "the whole list in order", assertionCode: `assertEqual(rows.map((r) => r.title), ["Old Road", "Hill Song", "Low Tide", "Night Bus", "Blue Hour", "Tin Roof", "Glow"], "folk, then jazz, then soul; highest plays first");` },
        ],
        hints: ["Rank inside each genre with `DENSE_RANK() OVER (PARTITION BY genre ORDER BY plays DESC)` in a CTE.", "Filter `WHERE r <= 2` outside the CTE, then sort."],
      },
      {
        kind: "code",
        title: "Where do they live now?",
        body:
          "Every move adds a row to `addresses`; a user who moved twice on one day has two rows with the same date, and the higher `id` is the later one:\n\n" +
          txt(`
addresses
 id | user_id | city  | moved_on
----+---------+-------+-----------
  1 | 10      | Porto | 2025-01-01
  2 | 10      | Lyon  | 2025-06-01
  3 | 11      | Oslo  | 2024-03-15
  4 | 12      | Pune  | 2025-02-02
  5 | 12      | Goa   | 2025-02-02
  6 | 11      | Bern  | 2023-12-31
  7 | 13      | Kyiv  | 2022-07-07
`) +
          "\nReturn exactly one row per user: `user_id` and their current `city`, ordered by `user_id`.",
        language: "sql",
        setup: `CREATE TABLE addresses (id INTEGER PRIMARY KEY, user_id INTEGER, city TEXT, moved_on TEXT);
INSERT INTO addresses VALUES (1, 10, 'Porto', '2025-01-01'), (2, 10, 'Lyon', '2025-06-01'), (3, 11, 'Oslo', '2024-03-15'), (4, 12, 'Pune', '2025-02-02'), (5, 12, 'Goa', '2025-02-02'), (6, 11, 'Bern', '2023-12-31'), (7, 13, 'Kyiv', '2022-07-07');`,
        starter: `SELECT a.user_id, a.city
FROM addresses a
JOIN (SELECT user_id, MAX(moved_on) AS last FROM addresses GROUP BY user_id) m
  ON m.user_id = a.user_id AND m.last = a.moved_on
ORDER BY a.user_id;
`,
        solution: `WITH numbered AS (
  SELECT user_id, city,
    ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY moved_on DESC, id DESC) AS rn
  FROM addresses
)
SELECT user_id, city
FROM numbered
WHERE rn = 1
ORDER BY user_id;
`,
        tests: [
          { id: "t1", description: "one row per user", assertionCode: `assertEqual(rows.map((r) => r.user_id), [10, 11, 12, 13], "Exactly one row for each of the four users. Joining on MAX(moved_on) gives user 12 two rows");` },
          { id: "t2", description: "same-day moves: the higher id wins", assertionCode: `const u = rows.filter((r) => r.user_id === 12);\nassert(u.length === 1 && u[0].city === "Goa", "User 12 moved to Pune and then Goa on the same day; Goa (id 5) is the later row");` },
          { id: "t3", description: "current cities", assertionCode: `assertEqual(rows.map((r) => r.city), ["Lyon", "Oslo", "Goa", "Kyiv"], "The latest city per user");` },
        ],
        hints: ["Number each user's rows newest first with ROW_NUMBER.", "Order the window by `moved_on DESC, id DESC` and keep `rn = 1`."],
      },
      {
        kind: "recap",
        points: [
          "Top-N per group: rank in a CTE with `PARTITION BY group ORDER BY measure DESC`, then `WHERE r <= N` outside.",
          "Decide what ties do: **ROW_NUMBER** exactly N rows, **RANK** places with gaps, **DENSE_RANK** the N highest values.",
          "Latest row per key: `ROW_NUMBER() … ORDER BY time DESC, id DESC` and keep 1. Always add a tie-breaker.",
          "Joining back on `MAX(...)` returns every tied row; that's a bug when you need exactly one.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 7. Dates, pivots and conditional aggregation ───────────────────────────────
  {
    id: "fnd-iv-database-7-dates-pivots",
    title: "Dates, pivots and conditional aggregation",
    summary: "Months with strftime, gaps with julianday, CASE inside SUM and AVG, and turning rows into columns.",
    minutes: 15,
    xp: 90,
    level: "Advanced",
    steps: [
      {
        kind: "explain",
        title: "Dates are text, CASE is a switch",
        body:
          "SQLite stores dates as ISO text (`'2026-03-14'`, `'2026-03-14 09:30'`), which sorts and compares correctly. A few functions do the rest:\n\n" +
          "| you want | SQLite | MySQL / Postgres say |\n|---|---|---|\n| the month | `strftime('%Y-%m', d)` | `DATE_FORMAT(d, '%Y-%m')` / `to_char` |\n| the date part | `date(d)` | `DATE(d)` |\n| days between | `julianday(b) - julianday(a)` | `DATEDIFF(b, a)` / `b - a` |\n| the next day | `date(d, '+1 day')` | `d + INTERVAL 1 DAY` |\n\n" +
          "**Conditional aggregation** puts a `CASE` inside an aggregate, so one pass can count several things at once:\n\n" +
          sql(`
SELECT team,
  SUM(CASE WHEN priority = 'high' THEN 1 ELSE 0 END) AS high,
  SUM(CASE WHEN priority = 'low'  THEN 1 ELSE 0 END) AS low,
  AVG(CASE WHEN closed THEN 1.0 ELSE 0 END)          AS closed_share
FROM tickets
GROUP BY team;
`) +
          "\n\nEach CASE becomes a column, so this is also how you **pivot** rows into columns. Two pitfalls: forget `ELSE 0` and an empty group sums to NULL; divide two integers and SQLite throws the fraction away (`2 / 3` is 0), so use `1.0` or `AVG`.\n\n**How to spot it:** *per month*, *within N days*, *share / rate / percentage*, *one column per …*.",
      },
      {
        kind: "question",
        title: "Where does the row go?",
        body: "Step through the pivot. The output totals are in the array. At the stop, tap the total that the next row adds to.",
        widget: {
          type: "iv-trace",
          props: {
            lang: "sql",
            title: "rows become columns",
            frames: [
              { grid: SALES_GRID, code: SALES_CODE, array: ["Jan tea 0", "Jan pie 0", "Feb tea 0", "Feb pie 0"], line: 5, note: "GROUP BY makes one output row per month; each CASE makes a column." },
              { cells: [{ r: 1, c: 0, tone: "active" }, { r: 1, c: 1, tone: "active" }, { r: 1, c: 2, tone: "active" }], array: ["Jan tea 5", "Jan pie 0", "Feb tea 0", "Feb pie 0"], highlight: [0], line: 2, note: "Jan, tea, 5: the tea CASE passes 5, the pie CASE gives 0." },
              { cells: [{ r: 2, c: 0, tone: "active" }, { r: 2, c: 1, tone: "active" }, { r: 2, c: 2, tone: "active" }], array: ["Jan tea 5", "Jan pie 8", "Feb tea 0", "Feb pie 0"], highlight: [1], line: 3, note: "Jan, pie, 8 goes to the pie column." },
              { cells: [{ r: 3, c: 0, tone: "active" }, { r: 3, c: 1, tone: "active" }, { r: 3, c: 2, tone: "active" }], array: ["Jan tea 5", "Jan pie 8", "Feb tea 3", "Feb pie 0"], highlight: [2], line: 2, note: "Feb, tea, 3 starts the Feb row." },
              { cells: [{ r: 4, c: 0, tone: "active" }, { r: 4, c: 1, tone: "active" }, { r: 4, c: 2, tone: "active" }], line: 2, note: "Row 4 is Jan, tea, 4.", pick: { prompt: "Which total does row 4 add to?", answer: 0, on: "array" } },
              { cells: [], array: ["Jan tea 9", "Jan pie 8", "Feb tea 3", "Feb pie 6"], highlight: [0, 3], line: 3, note: "Jan tea becomes 9, and the last row (Feb, pie, 6) fills Feb pie." },
              { array: ["Jan | 9 | 8", "Feb | 3 | 6"], line: 1, note: "The result: one row per month, a column per category. `mon | tea | pie`." },
            ],
          },
        },
        question: { type: "widget", goal: { picked: true }, prompt: "Answer the pick.", hint: "The row's month picks the output row; its category picks which CASE lets the amount through." },
        explanation: "Every row is seen by every CASE; only the one whose condition matches lets the amount through, the others add 0. Grouping by month then collects the sums into one row per month.",
      },
      {
        kind: "question",
        title: "Month keys",
        body: "What does `strftime('%Y-%m', '2026-07-04')` return?",
        question: {
          type: "choice",
          options: ["'2026-07'", "'07-2026'", "'2026-7'", "'July 2026'"],
          answer: 0,
          feedback: { 2: "`%m` is always two digits." },
          hint: "The format string is copied as is, with `%Y` replaced by the 4-digit year and `%m` by the 2-digit month.",
        },
        explanation: "`'2026-07'`: a year-month key that sorts in time order. Grouping by it gives monthly reports.",
      },
      {
        kind: "question",
        title: "Days between",
        body: "Find the value of `julianday('2026-03-01') - julianday('2026-02-01')`.",
        question: { type: "number", answer: 28, hint: "How many days does February 2026 have?" },
        explanation: "2026 is not a leap year, so February has 28 days. `julianday` turns a date into a day number, and subtracting two gives the days between, the SQLite stand-in for `DATEDIFF`.",
      },
      {
        kind: "question",
        title: "A share of rows",
        body: "Which expression gives the **fraction** of orders that were refunded (for example 0.25)?",
        question: {
          type: "choice",
          options: ["SUM(status = 'refunded') / COUNT(*)", "COUNT(status = 'refunded') * 1.0 / COUNT(*)", "AVG(CASE WHEN status = 'refunded' THEN 1.0 ELSE 0 END)", "AVG(status) with WHERE status = 'refunded'"],
          answer: 2,
          feedback: {
            0: "Both sides are integers, so SQLite divides without a fraction: 0.",
            1: "COUNT counts every non-NULL value, and FALSE (0) is not NULL, so this is always 1.0.",
            3: "The WHERE leaves only refunded rows, and AVG of text is meaningless.",
          },
          hint: "Turn each row into 1 or 0, then average. Watch integer division and what COUNT counts.",
        },
        explanation: "`AVG(CASE WHEN … THEN 1.0 ELSE 0 END)` averages ones and zeros, which is exactly the share. `ROUND(…, 2)` it for display.",
      },
      {
        kind: "code",
        title: "Monthly delivery report",
        body:
          "A shop's `orders` (times are text):\n\n" +
          txt(`
orders
 id | placed_at        | status
----+------------------+----------
  1 | 2026-01-05 10:00 | delivered
  2 | 2026-01-17 12:30 | cancelled
  3 | 2026-01-31 23:59 | delivered
  4 | 2026-02-01 00:10 | delivered
  5 | 2026-02-14 09:00 | returned
  6 | 2026-02-20 18:45 | cancelled
  7 | 2026-03-03 08:00 | delivered
  8 | 2026-02-28 15:00 | delivered
`) +
          "\nFor each month, return `month` (like `'2026-01'`), `orders` (how many were placed) and `delivered_share` (the fraction delivered, rounded to 2 decimals). Order by month.",
        language: "sql",
        setup: `CREATE TABLE orders (id INTEGER PRIMARY KEY, placed_at TEXT, status TEXT);
INSERT INTO orders VALUES (1, '2026-01-05 10:00', 'delivered'), (2, '2026-01-17 12:30', 'cancelled'), (3, '2026-01-31 23:59', 'delivered'), (4, '2026-02-01 00:10', 'delivered'), (5, '2026-02-14 09:00', 'returned'), (6, '2026-02-20 18:45', 'cancelled'), (7, '2026-03-03 08:00', 'delivered'), (8, '2026-02-28 15:00', 'delivered');`,
        starter: `SELECT placed_at AS month, COUNT(*) AS orders,
  SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) / COUNT(*) AS delivered_share
FROM orders
GROUP BY placed_at
ORDER BY month;
`,
        solution: `SELECT strftime('%Y-%m', placed_at) AS month,
  COUNT(*) AS orders,
  ROUND(AVG(CASE WHEN status = 'delivered' THEN 1.0 ELSE 0 END), 2) AS delivered_share
FROM orders
GROUP BY month
ORDER BY month;
`,
        tests: [
          { id: "t1", description: "one row per month", assertionCode: `assertEqual(rows.map((r) => r.month), ["2026-01", "2026-02", "2026-03"], "Group by strftime('%Y-%m', placed_at)");` },
          { id: "t2", description: "orders per month", assertionCode: `assertEqual(rows.map((r) => r.orders), [3, 4, 1], "January has 3 orders, February 4 (order 8 is in February too), March 1");` },
          { id: "t3", description: "shares are fractions, not integers", assertionCode: `assert(rows.length === 3, "Expected three months first");\nassert(rows[0].delivered_share !== 0, "January's share came out as 0: integer division. Multiply by 1.0 or use AVG");\nassertClose(rows[0].delivered_share, 0.67, 0.001, "January: 2 of 3 delivered");\nassertClose(rows[1].delivered_share, 0.5, 0.001, "February: 2 of 4 delivered");\nassertClose(rows[2].delivered_share, 1, 0.001, "March: 1 of 1 delivered");` },
        ],
        hints: ["`strftime('%Y-%m', placed_at)` turns a timestamp into its month.", "`ROUND(AVG(CASE WHEN status = 'delivered' THEN 1.0 ELSE 0 END), 2)`"],
      },
      {
        kind: "code",
        title: "Tickets by priority",
        body:
          "Support `tickets`:\n\n" +
          txt(`
tickets
 id | team | priority
----+------+---------
  1 | app  | high
  2 | app  | low
  3 | web  | mid
  4 | app  | high
  5 | data | low
  6 | web  | mid
  7 | web  | high
  8 | data | low
  9 | app  | mid
`) +
          "\nPivot it: one row per `team` with columns `low`, `mid` and `high` holding the number of tickets of that priority (0, not NULL, when there are none). Order by team.",
        language: "sql",
        setup: `CREATE TABLE tickets (id INTEGER PRIMARY KEY, team TEXT, priority TEXT);
INSERT INTO tickets VALUES (1, 'app', 'high'), (2, 'app', 'low'), (3, 'web', 'mid'), (4, 'app', 'high'), (5, 'data', 'low'), (6, 'web', 'mid'), (7, 'web', 'high'), (8, 'data', 'low'), (9, 'app', 'mid');`,
        starter: `SELECT team, priority, COUNT(*) AS n
FROM tickets
GROUP BY team, priority
ORDER BY team;
`,
        solution: `SELECT team,
  SUM(CASE WHEN priority = 'low'  THEN 1 ELSE 0 END) AS low,
  SUM(CASE WHEN priority = 'mid'  THEN 1 ELSE 0 END) AS mid,
  SUM(CASE WHEN priority = 'high' THEN 1 ELSE 0 END) AS high
FROM tickets
GROUP BY team
ORDER BY team;
`,
        tests: [
          { id: "t1", description: "one row per team", assertionCode: `assertEqual(rows.map((r) => r.team), ["app", "data", "web"], "Three teams, one row each");` },
          { id: "t2", description: "app's counts", assertionCode: `const app = rows.find((r) => r.team === "app");\nassert(app !== undefined, "No app row");\nassertEqual([app.low, app.mid, app.high], [1, 1, 2], "app has 1 low, 1 mid, 2 high");` },
          { id: "t3", description: "missing priorities are 0", assertionCode: `const d = rows.find((r) => r.team === "data");\nconst w = rows.find((r) => r.team === "web");\nassert(d !== undefined && w !== undefined, "Need data and web rows");\nassert(d.mid !== null && d.high !== null, "data has no mid or high tickets: that's 0, not NULL. Add ELSE 0");\nassertEqual([d.low, d.mid, d.high, w.low, w.mid, w.high], [2, 0, 0, 0, 2, 1], "data: 2, 0, 0 and web: 0, 2, 1");` },
        ],
        hints: ["One `SUM(CASE WHEN priority = '…' THEN 1 ELSE 0 END)` per column.", "Group by team only; the priorities become columns."],
      },
      {
        kind: "recap",
        points: [
          "SQLite dates are ISO text: `strftime('%Y-%m', d)` for months, `julianday(b) - julianday(a)` for days, `date(d, '+1 day')` to step.",
          "**Conditional aggregation**: `SUM(CASE WHEN cond THEN 1 ELSE 0 END)` counts matches; one per column makes a **pivot**.",
          "Shares and rates: `AVG(CASE WHEN cond THEN 1.0 ELSE 0 END)`. Integer / integer drops the fraction.",
          "Always write `ELSE 0`, or empty groups come out as NULL.",
          "Translate MySQL habits: `IF()` → `CASE`/`IIF`, `DATEDIFF` → `julianday`, `DATE_FORMAT` → `strftime`.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 8. Recursive CTEs ───────────────────────────────
  {
    id: "fnd-iv-database-8-recursive",
    title: "Recursive CTEs",
    summary: "WITH RECURSIVE: generate a series, fill missing days, and walk a tree or a chain of rows.",
    minutes: 16,
    xp: 100,
    level: "Professional",
    steps: [
      {
        kind: "explain",
        title: "A query that feeds itself",
        body:
          "A **recursive CTE** has two parts joined by `UNION ALL`:\n\n" +
          sql(`
WITH RECURSIVE n(i) AS (
  SELECT 1             -- anchor: the starting rows
  UNION ALL
  SELECT i + 1 FROM n  -- recursive part: built from the rows of the previous round
  WHERE i < 5
)
SELECT i FROM n;       -- 1, 2, 3, 4, 5
`) +
          "\n\nThe database runs the anchor, then runs the recursive part on **the rows the previous round produced**, again and again, and stops when a round produces nothing. Everything produced is the result.\n\nTwo uses cover most interview questions:\n\n- **Generate rows** that don't exist: numbers, or every day between two dates, so you can `LEFT JOIN` the real data and show the gaps as 0.\n- **Walk a hierarchy** stored as `parent_id`: an org chart, folders, categories, a chain of referrals. Carry a `depth` (or a path string) as you go.\n\nGuard against loops: always have a stopping `WHERE`, a depth limit, or use `UNION` (which drops rows already seen) when the data may contain a cycle.\n\n**How to spot it:** *all levels below*, *every ancestor*, *the full chain*, *each day in the range, including days with none*.",
      },
      {
        kind: "question",
        title: "Round by round",
        body: "Step through the recursive walk below the `docs` folder. At the stop, predict which folder the next round adds.",
        widget: {
          type: "iv-trace",
          props: {
            lang: "sql",
            title: "everything under docs",
            frames: [
              { tree: { nodes: FOLDER_NODES, active: ["docs"] }, code: FOLDER_CODE, line: 2, array: ["docs 0"], vars: { round: 0, new: "docs" }, note: "The anchor finds `docs` at depth 0." },
              { tree: { active: ["work", "cv"], done: ["docs"] }, line: 5, array: ["docs 0", "work 1", "cv 1"], vars: { round: 1, new: "work, cv" }, note: "Round 1 joins folders whose parent is in the **previous round** (docs): work and cv, depth 1." },
              { tree: { done: ["docs", "work", "cv"] }, line: 5, note: "Round 2 looks for children of work and cv.", pick: { prompt: "Which folder does round 2 add? Tap it.", answer: "q1", on: "tree" } },
              { tree: { active: ["q1"], done: ["docs", "work", "cv"] }, line: 5, array: ["docs 0", "work 1", "cv 1", "q1 2"], vars: { round: 2, new: "q1" }, note: "q1 is work's child: depth 2." },
              { tree: { done: ["docs", "work", "cv", "q1"] }, line: 7, vars: { round: 3, new: "nothing" }, note: "Round 3 finds no children of q1, so the recursion **stops**. pics and cats were never reached: they aren't below docs." },
            ],
          },
        },
        question: { type: "widget", goal: { picked: true }, prompt: "Answer the pick.", hint: "Round 2 only joins on the rows round 1 produced: work and cv. Who has one of them as a parent?" },
        explanation: "Each round only extends the rows from the round before, one level down. When a round adds nothing, the CTE is complete, here after three rounds.",
      },
      {
        kind: "question",
        title: "Count the series",
        body: sql("WITH RECURSIVE n(i) AS (\n  SELECT 1\n  UNION ALL\n  SELECT i + 2 FROM n WHERE i < 9\n)\nSELECT i FROM n;") + "\nHow many rows does it return?",
        question: { type: "number", answer: 5, hint: "Write the rows out: start at 1, add 2 while the previous value is under 9." },
        explanation: "1, 3, 5, 7, 9. From 7 the test `7 < 9` passes and makes 9; from 9 the test fails and the round adds nothing. The `WHERE` looks at the previous row, a classic off-by-one.",
      },
      {
        kind: "question",
        title: "When does it stop?",
        body: "What ends a recursive CTE?",
        question: {
          type: "choice",
          options: ["A fixed limit of 100 rounds", "The anchor returning NULL", "The first repeated row", "A round that adds no rows"],
          answer: 3,
          feedback: { 0: "SQLite and PostgreSQL have no round limit. SQL Server stops at 100 by default, but with an error, not a normal end.", 2: "UNION ALL happily repeats rows forever; only UNION drops them." },
          hint: "Each round works on the previous round's rows. What happens when there are none?",
        },
        explanation: "The recursion ends when a round produces an empty set. If your stopping condition never becomes false (or the data has a cycle), the query runs forever, so add a depth limit when in doubt.",
      },
      {
        kind: "question",
        title: "Cycles",
        body: "`follows(a, b)` contains A → B and B → A. You walk it recursively from A with `UNION ALL`. What keeps the walk from running forever?",
        question: {
          type: "choice",
          options: ["An ORDER BY in the recursive part", "UNION instead of UNION ALL, or a depth cap", "A GROUP BY in the anchor query", "Nothing; recursion never loops"],
          answer: 1,
          feedback: { 3: "With A → B → A the same rows come back every round." },
          hint: "Either stop producing rows you have already produced, or stop after a certain number of steps.",
        },
        explanation: "`UNION` discards rows identical to ones already produced, so a cycle dies out (as long as you don't carry an ever-growing depth in the row). Otherwise carry a `depth` column and add `WHERE depth < 10`.",
      },
      {
        kind: "code",
        title: "Fill the missing days",
        body:
          "Daily sign-ups, but days with none are simply missing:\n\n" +
          txt(`
signups
 day        | n
------------+---
 2026-04-01 | 3
 2026-04-02 | 5
 2026-04-05 | 2
 2026-04-06 | 1
`) +
          "\nReturn every day from the first to the last day in the table, with `day` and `n` (0 on days with no row), ordered by day. Generate the days with a recursive CTE, then LEFT JOIN.",
        language: "sql",
        setup: `CREATE TABLE signups (day TEXT PRIMARY KEY, n INTEGER);
INSERT INTO signups VALUES ('2026-04-01', 3), ('2026-04-02', 5), ('2026-04-05', 2), ('2026-04-06', 1);`,
        starter: `SELECT day, n
FROM signups
ORDER BY day;
`,
        solution: `WITH RECURSIVE days(day) AS (
  SELECT MIN(day) FROM signups
  UNION ALL
  SELECT date(day, '+1 day') FROM days
  WHERE day < (SELECT MAX(day) FROM signups)
)
SELECT d.day, COALESCE(s.n, 0) AS n
FROM days d
LEFT JOIN signups s ON s.day = d.day
ORDER BY d.day;
`,
        tests: [
          { id: "t1", description: "every day in the range", assertionCode: `assertEqual(rows.map((r) => r.day), ["2026-04-01", "2026-04-02", "2026-04-03", "2026-04-04", "2026-04-05", "2026-04-06"], "Six days, 1 to 6 April, with no extra day after the last");` },
          { id: "t2", description: "missing days are 0", assertionCode: `const gap = rows.filter((r) => r.day === "2026-04-03" || r.day === "2026-04-04");\nassert(gap.length === 2 && gap.every((r) => r.n === 0), "3 and 4 April have no sign-ups: n should be 0, not NULL (COALESCE)");` },
          { id: "t3", description: "real days keep their counts", assertionCode: `assertEqual(rows.map((r) => r.n), [3, 5, 0, 0, 2, 1], "The counts in day order");` },
        ],
        hints: ["Anchor: `SELECT MIN(day) FROM signups`. Recursive part: `SELECT date(day, '+1 day') FROM days WHERE day < (SELECT MAX(day) FROM signups)`.", "LEFT JOIN signups onto the generated days and `COALESCE(s.n, 0)`."],
      },
      {
        kind: "code",
        title: "Everything inside docs",
        body:
          "A file system stores each folder's parent:\n\n" +
          txt(`
folders
 id | name | parent_id
----+------+----------
  1 | root | NULL
  2 | docs | 1
  3 | pics | 1
  4 | work | 2
  5 | cv   | 2
  6 | q1   | 4
  7 | cats | 3
  8 | tax  | 4
  9 | old  | 6
`) +
          "\nReturn every folder **inside** `docs` at any depth (not docs itself), with `name` and `depth` (1 for a direct child of docs, 2 for a grandchild, …). Order by depth, then name.",
        language: "sql",
        setup: `CREATE TABLE folders (id INTEGER PRIMARY KEY, name TEXT, parent_id INTEGER);
INSERT INTO folders VALUES (1, 'root', NULL), (2, 'docs', 1), (3, 'pics', 1), (4, 'work', 2), (5, 'cv', 2), (6, 'q1', 4), (7, 'cats', 3), (8, 'tax', 4), (9, 'old', 6);`,
        starter: `SELECT name, 1 AS depth
FROM folders
WHERE parent_id = 2
ORDER BY name;
`,
        solution: `WITH RECURSIVE sub(id, name, depth) AS (
  SELECT id, name, 1 FROM folders
  WHERE parent_id = (SELECT id FROM folders WHERE name = 'docs')
  UNION ALL
  SELECT f.id, f.name, s.depth + 1
  FROM folders f
  JOIN sub s ON f.parent_id = s.id
)
SELECT name, depth
FROM sub
ORDER BY depth, name;
`,
        tests: [
          { id: "t1", description: "every level, not just the children", assertionCode: `assertEqual(rows.map((r) => r.name), ["cv", "work", "q1", "tax", "old"], "docs holds cv and work; work holds q1 and tax; q1 holds old");` },
          { id: "t2", description: "depths", assertionCode: `assertEqual(rows.map((r) => r.depth), [1, 1, 2, 2, 3], "Direct children are depth 1, grandchildren 2, and old is 3");` },
          { id: "t3", description: "all the way down, and only below docs", assertionCode: `const names = rows.map((r) => r.name);\nassert(names.includes("old"), "old is three levels inside docs (docs → work → q1 → old); keep walking until a round adds nothing");\nassert(!names.includes("docs") && !names.includes("cats") && !names.includes("pics"), "Leave out docs itself, and pics/cats, which are not inside docs");` },
        ],
        hints: ["Anchor: the children of docs, at depth 1.", "Recursive part: `JOIN sub s ON f.parent_id = s.id` and `s.depth + 1`."],
      },
      {
        kind: "recap",
        points: [
          "`WITH RECURSIVE` = an **anchor** query, `UNION ALL`, and a **recursive** query that reads the previous round's rows.",
          "It stops when a round adds no rows; make sure your `WHERE` (or a depth cap) gets there.",
          "Generate a series of numbers or days, then LEFT JOIN real data and `COALESCE` the gaps to 0.",
          "Walk a `parent_id` tree by joining children onto the previous level; carry `depth` or a path.",
          "Cycles loop forever with `UNION ALL`: use `UNION` or a depth limit.",
        ],
      },
    ],
  },
];
