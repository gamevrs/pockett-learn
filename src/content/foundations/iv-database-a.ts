import type { ConceptLesson } from "../../learn/types.ts";

/** Fenced SQL block for lesson prose. */
const sql = (code: string) => "~~~sql\n" + code.trim() + "\n~~~";
/** Fenced plain-text block (tables the learner cannot see because they live in a hidden setup). */
const txt = (code: string) => "~~~text\n" + code.replace(/^\n+|\s+$/g, "") + "\n~~~";

// ── trace data ──
const MEMBERS_GRID = [
  ["id", "name", "ref"],
  [1, "Ana", "NULL"],
  [2, "Bo", 1],
  [3, "Cy", 2],
  [4, "Dee", "NULL"],
  [5, "Eli", 3],
];
const MEMBERS_CODE = ["SELECT name", "FROM members", "WHERE ref <> 2;"];

/** Tones for a whole grid row (3 columns). */
const row3 = (r: number, tone: "active" | "done" | "path") => [0, 1, 2].map((c) => ({ r, c, tone }));

const PETS_GRID = [
  ["id", "pet", "own"],
  [1, "Rex", 1],
  [2, "Tom", 3],
  [3, "Bea", 1],
  [4, "Kit", "NULL"],
];
const PETS_CODE = ["SELECT p.pet, o.name", "FROM pets p", "LEFT JOIN owners o", "  ON o.id = p.own;"];
const OWNERS_VARS = { "owner 1": "Ana", "owner 2": "Raj", "owner 3": "Lu" };

const ORDERS_GRID = [
  ["id", "shop", "amt"],
  [1, "N", 30],
  [2, "S", 25],
  [3, "N", 40],
  [4, "E", 90],
  [5, "S", 15],
];
const ORDERS_CODE = ["SELECT shop, SUM(amt) AS total", "FROM orders", "GROUP BY shop", "HAVING SUM(amt) >= 50;"];

const STAFF_GRID = [
  ["name", "dept", "pay"],
  ["Ana", "ops", 50],
  ["Bo", "ops", 70],
  ["Cy", "dev", 90],
  ["Dee", "dev", 60],
  ["Eli", "dev", 75],
];
const STAFF_CODE = ["SELECT name FROM staff s", "WHERE pay > (", "  SELECT AVG(pay) FROM staff", "  WHERE dept = s.dept", ");"];

export const ivDatabaseLessonsA: ConceptLesson[] = [
  // ─────────────────────────────── 1. Filtering and NULLs ───────────────────────────────
  {
    id: "fnd-iv-database-1-filtering",
    title: "Filtering and NULLs",
    summary: "WHERE, three-valued logic, IS NULL, COALESCE and the NOT IN trap.",
    minutes: 12,
    xp: 70,
    level: "Beginner",
    steps: [
      {
        kind: "explain",
        title: "WHERE keeps the rows that are TRUE",
        body:
          "Most SQL interview questions start with a filter: `WHERE` looks at one row at a time and keeps it only if the condition is **TRUE**.\n\nThe catch is **NULL**, which means \"no value\" or \"unknown\". Any comparison with NULL (`=`, `<>`, `<`, even `NULL = NULL`) gives a third answer, **UNKNOWN**, and WHERE throws UNKNOWN rows away just like FALSE ones. This is called **three-valued logic**.\n\n" +
          sql(`
SELECT name FROM members WHERE ref = NULL;    -- always empty
SELECT name FROM members WHERE ref IS NULL;   -- the right test
SELECT name, COALESCE(ref, 0) AS ref FROM members;  -- NULL shown as 0
`) +
          "\n\n- `IS NULL` / `IS NOT NULL` are the only reliable tests for a missing value.\n- `COALESCE(a, b, …)` returns the first argument that isn't NULL: handy for defaults.\n- `AND`/`OR` follow the same rules: `UNKNOWN OR TRUE` is TRUE, `UNKNOWN AND TRUE` stays UNKNOWN.\n\n**How to spot it:** a column that \"may be empty\", or words like *not referred*, *without*, *no manager*. Every time you write `<>` or `NOT`, ask what happens to the NULL rows.",
      },
      {
        kind: "explain",
        title: "Watch `<> 2` lose rows",
        body: "The table `members` records who referred whom (`ref` is the referrer's id, NULL for nobody). We want everyone **not** referred by member 2. Step through the filter one row at a time. The first row is the column names; a kept row turns blue, a dropped row turns grey.",
        widget: {
          type: "iv-trace",
          props: {
            lang: "sql",
            title: "WHERE ref <> 2, row by row",
            frames: [
              { grid: MEMBERS_GRID, code: MEMBERS_CODE, line: 3, cells: row3(1, "active"), vars: { test: "NULL <> 2", result: "UNKNOWN" }, note: "Ana has no referrer. `NULL <> 2` is not TRUE, it is **UNKNOWN**." },
              { cells: [...row3(1, "done"), ...row3(2, "active")], line: 3, vars: { test: "1 <> 2", result: "TRUE" }, note: "Ana was dropped. Bo's `1 <> 2` is TRUE, so Bo is kept." },
              { cells: [...row3(1, "done"), ...row3(2, "path"), ...row3(3, "active")], line: 3, vars: { test: "2 <> 2", result: "FALSE" }, note: "Cy was referred by 2: FALSE, dropped. That one we wanted." },
              {
                cells: [...row3(1, "done"), ...row3(2, "path"), ...row3(3, "done"), ...row3(4, "active")],
                line: 3,
                vars: { test: "NULL <> 2", result: "UNKNOWN" },
                note: "Dee has no referrer either, so she is dropped too.",
                pick: { prompt: "Which member is the next one WHERE keeps? Tap their name.", answer: "5,1" },
              },
              { cells: [...row3(1, "done"), ...row3(2, "path"), ...row3(3, "done"), ...row3(4, "done"), ...row3(5, "path")], vars: { result: "Bo, Eli" }, note: "Only **Bo and Eli** came back. Ana and Dee were never referred by 2, yet they vanished." },
              {
                code: ["SELECT name", "FROM members", "WHERE ref <> 2", "   OR ref IS NULL;"],
                line: 4,
                cells: [...row3(1, "path"), ...row3(2, "path"), ...row3(3, "done"), ...row3(4, "path"), ...row3(5, "path")],
                vars: { result: "Ana, Bo, Dee, Eli" },
                note: "The fix: say what you want for NULL out loud with `OR ref IS NULL`. (`COALESCE(ref, 0) <> 2` works too.)",
              },
            ],
          },
        },
      },
      {
        kind: "question",
        title: "NULL meets NULL",
        body: "What does `NULL = NULL` evaluate to in SQL?",
        question: {
          type: "choice",
          options: ["TRUE, they are the same", "FALSE, they differ", "UNKNOWN (shown as NULL)", "It raises an error"],
          answer: 2,
          feedback: { 0: "NULL means 'unknown'. Two unknowns are not known to be equal.", 3: "It runs fine; it just never comes out TRUE." },
          hint: "Think of NULL as 'I don't know'. Is 'I don't know' equal to 'I don't know'?",
        },
        explanation: "Any comparison with NULL is UNKNOWN, including `NULL = NULL`. That's why you test with `IS NULL`, and why `WHERE x = NULL` returns nothing.",
      },
      {
        kind: "question",
        title: "Count the survivors",
        body: "`bonuses` has 6 rows. Its `amount` column is NULL in 2 rows, 5 in 1 row and 0 in 3 rows.\n\n" + sql("SELECT * FROM bonuses WHERE amount < 3;") + "\nHow many rows does it return?",
        question: { type: "number", answer: 3, hint: "Check each kind of row: does `NULL < 3` come out TRUE?" },
        explanation: "Only the three rows with 0 pass. `5 < 3` is FALSE and `NULL < 3` is UNKNOWN, so both kinds are dropped. To include the missing ones too, write `WHERE amount < 3 OR amount IS NULL`.",
      },
      {
        kind: "question",
        title: "The NOT IN trap",
        body: "`banned(user_id)` holds the values 4, 7 and NULL. `users` has ids 1, 4, 7 and 9.\n\n" + sql("SELECT id FROM users\nWHERE id NOT IN (SELECT user_id FROM banned);") + "\nWhat comes back?",
        question: {
          type: "choice",
          options: ["Users 1 and 9", "No rows at all", "All four users", "Users 4 and 7 only"],
          answer: 1,
          feedback: { 0: "That's what we meant, but the NULL in the list changes it. Expand NOT IN into a chain of <> tests." },
          hint: "`x NOT IN (4, 7, NULL)` means `x <> 4 AND x <> 7 AND x <> NULL`. What is the last part?",
        },
        explanation: "`x <> NULL` is UNKNOWN, so the whole AND chain can never be TRUE and every row is dropped. Use `NOT EXISTS (SELECT 1 FROM banned b WHERE b.user_id = u.id)`, or add `WHERE user_id IS NOT NULL` inside the subquery. Interviewers love this one.",
      },
      {
        kind: "code",
        title: "Fix the referral report",
        body:
          "The table `shoppers` records who referred each shopper:\n\n" +
          txt(`
shoppers
 id | name  | referred_by
----+-------+------------
  1 | Mia   | NULL
  2 | Noah  | NULL
  3 | Olu   | 2
  4 | Pia   | 1
  5 | Quinn | 2
  6 | Ravi  | NULL
  7 | Sana  | 4
`) +
          "\nThe starter query should list the `name` of every shopper who was **not** referred by shopper 2 (including shoppers nobody referred), ordered by `id`. It misses some. Fix it.",
        language: "sql",
        setup: `CREATE TABLE shoppers (id INTEGER PRIMARY KEY, name TEXT, referred_by INTEGER);
INSERT INTO shoppers VALUES (1, 'Mia', NULL), (2, 'Noah', NULL), (3, 'Olu', 2), (4, 'Pia', 1), (5, 'Quinn', 2), (6, 'Ravi', NULL), (7, 'Sana', 4);`,
        starter: `SELECT name
FROM shoppers
WHERE referred_by <> 2
ORDER BY id;
`,
        solution: `SELECT name
FROM shoppers
WHERE referred_by <> 2 OR referred_by IS NULL
ORDER BY id;
`,
        tests: [
          { id: "t1", description: "shoppers nobody referred are included", assertionCode: `const names = rows.map((r) => r.name);\nassert(["Mia", "Noah", "Ravi"].every((n) => names.includes(n)), "Mia, Noah and Ravi have referred_by = NULL, so they were not referred by 2 and belong in the list (got " + names.join(", ") + ")");` },
          { id: "t2", description: "five shoppers", assertionCode: `assertEqual(rows.length, 5, "Everyone except Olu and Quinn (the two referred by shopper 2) should be listed");` },
          { id: "t3", description: "the exact list, ordered by id", assertionCode: `assertEqual(rows.map((r) => r.name), ["Mia", "Noah", "Pia", "Ravi", "Sana"], "Expected five names in id order");` },
        ],
        hints: ["`referred_by <> 2` is UNKNOWN when referred_by is NULL, so those rows are dropped.", "Add `OR referred_by IS NULL`, or compare `COALESCE(referred_by, 0) <> 2`."],
      },
      {
        kind: "code",
        title: "Who owns the urgent tickets?",
        body:
          "The table `tickets`:\n\n" +
          txt(`
tickets
 id | title       | assignee | priority
----+-------------+----------+---------
  1 | Login fails | kim      | 3
  2 | Typo        | NULL     | 1
  3 | Slow page   | lee      | 1
  4 | Crash       | NULL     | 4
  5 | Old docs    | kim      | NULL
  6 | Dark mode   | NULL     | NULL
`) +
          "\nReturn `id` and `owner` for every ticket that is **unassigned** or has `priority` of 3 or more, ordered by `id`. `owner` is the assignee, or the text `'nobody'` when there is none. The starter has two NULL bugs.",
        language: "sql",
        setup: `CREATE TABLE tickets (id INTEGER PRIMARY KEY, title TEXT, assignee TEXT, priority INTEGER);
INSERT INTO tickets VALUES (1, 'Login fails', 'kim', 3), (2, 'Typo', NULL, 1), (3, 'Slow page', 'lee', 1), (4, 'Crash', NULL, 4), (5, 'Old docs', 'kim', NULL), (6, 'Dark mode', NULL, NULL);`,
        starter: `SELECT id, assignee AS owner
FROM tickets
WHERE assignee = NULL OR priority >= 3
ORDER BY id;
`,
        solution: `SELECT id, COALESCE(assignee, 'nobody') AS owner
FROM tickets
WHERE assignee IS NULL OR priority >= 3
ORDER BY id;
`,
        tests: [
          { id: "t1", description: "the right tickets", assertionCode: `assertEqual(rows.map((r) => r.id), [1, 2, 4, 6], "Tickets 2, 4 and 6 are unassigned and ticket 1 has priority 3. Ticket 5 (no priority) is neither. Did you test the NULL with IS NULL?");` },
          { id: "t2", description: "owner is never NULL", assertionCode: `assert(rows.length > 0 && rows.every((r) => r.owner !== null), "Every row needs an owner: use COALESCE(assignee, 'nobody')");` },
          { id: "t3", description: "owner values", assertionCode: `assertEqual(rows.map((r) => r.owner), ["kim", "nobody", "nobody", "nobody"], "Owners in id order");` },
        ],
        hints: ["`assignee = NULL` is never TRUE. Which operator tests for a missing value?", "Wrap the column in `COALESCE(assignee, 'nobody')` and keep the alias `owner`."],
      },
      {
        kind: "recap",
        points: [
          "WHERE keeps only rows where the condition is **TRUE**; FALSE and **UNKNOWN** rows are both dropped.",
          "Any comparison with NULL is UNKNOWN, even `NULL = NULL`. Test with `IS NULL` / `IS NOT NULL`.",
          "`COALESCE(x, default)` fills in a value for display or comparison.",
          "`NOT IN (subquery)` returns nothing if the subquery yields a NULL; prefer `NOT EXISTS`.",
          "How to spot it: optional columns plus `<>`, `NOT` or \"without\". Always ask where the NULL rows go.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 2. Joins ───────────────────────────────
  {
    id: "fnd-iv-database-2-joins",
    title: "Joins: inner, left, self and anti",
    summary: "Matching rows across tables, keeping the unmatched ones, joining a table to itself, and finding what's missing.",
    minutes: 14,
    xp: 80,
    level: "Beginner",
    steps: [
      {
        kind: "explain",
        title: "Four joins you will meet",
        body:
          "A **join** pairs each row of one table with the rows of another that satisfy the `ON` condition.\n\n" +
          "| join | keeps |\n|---|---|\n| `INNER JOIN` (or just `JOIN`) | only pairs that match |\n| `LEFT JOIN` | every left row; the right side is NULL when nothing matches |\n| self join | a table joined to itself with two aliases (employee → manager) |\n| anti-join | left rows with **no** match: `LEFT JOIN … WHERE right.id IS NULL`, or `NOT EXISTS` |\n\n" +
          sql(`
-- every author, with their books if any
SELECT a.name, b.title
FROM authors a
LEFT JOIN books b ON b.author_id = a.id;
`) +
          "\n\nTwo things trip people up. A join **multiplies**: a left row with three matches comes out three times. And in a LEFT JOIN, a condition on the right table belongs in `ON`; in `WHERE` it throws away the NULL rows and quietly turns the join back into an inner join.\n\n**How to spot it:** *for each X show its Y* (join), *including those with none* (left join), *compare a row with another row of the same table* (self join), *never*, *without any*, *who has not* (anti-join).",
      },
      {
        kind: "question",
        title: "Which pet gets NULLs?",
        body: "The grid is the `pets` table; the owners table is in the variables box. Step through the LEFT JOIN. At the stop, predict the row that comes out with no owner.",
        widget: {
          type: "iv-trace",
          props: {
            lang: "sql",
            title: "pets LEFT JOIN owners",
            frames: [
              { grid: PETS_GRID, code: PETS_CODE, vars: OWNERS_VARS, array: [], line: 3, note: "The left table drives: every pet will produce at least one output row." },
              {
                cells: [],
                note: "Before we start: one pet will find no owner.",
                pick: { prompt: "Which pet comes out with NULL for the owner's name? Tap its name.", answer: "4,1", on: "grid" },
              },
              { cells: row3(1, "active"), array: ["Rex·Ana"], line: 4, note: "Rex has `own = 1`, which matches owner 1, Ana." },
              { cells: [...row3(1, "done"), ...row3(2, "active")], array: ["Rex·Ana", "Tom·Lu"], line: 4, note: "Tom's 3 matches Lu." },
              { cells: [...row3(1, "done"), ...row3(2, "done"), ...row3(3, "active")], array: ["Rex·Ana", "Tom·Lu", "Bea·Ana"], line: 4, note: "Bea is Ana's too. Ana now appears twice in the output: joins repeat rows." },
              { cells: [...row3(1, "done"), ...row3(2, "done"), ...row3(3, "done"), ...row3(4, "active")], array: ["Rex·Ana", "Tom·Lu", "Bea·Ana", "Kit·NULL"], line: 4, note: "Kit has `own = NULL`. `o.id = NULL` matches nothing, so LEFT JOIN keeps Kit with **NULL**s." },
              { cells: [...row3(1, "done"), ...row3(2, "done"), ...row3(3, "done"), ...row3(4, "path")], array: ["Kit·NULL"], code: [...PETS_CODE.slice(0, 3), "  ON o.id = p.own", "WHERE o.id IS NULL;"], line: 5, note: "Add `WHERE o.id IS NULL` and only the unmatched rows stay: that's an **anti-join**. Raj, who has no pet, never shows up: he is on the right side." },
            ],
          },
        },
        question: { type: "widget", goal: { picked: true }, prompt: "Answer the pick.", hint: "A pet with no matching owner row is the one whose `own` matches no id. NULL matches nothing." },
        explanation: "LEFT JOIN keeps every row of the left table. Kit's `own` is NULL, and `o.id = NULL` is never TRUE, so Kit is padded with NULLs. Filtering those NULLs (`WHERE o.id IS NULL`) is the standard anti-join.",
      },
      {
        kind: "question",
        title: "How many rows?",
        body: "Table `a` has three rows with `k` = 1, 1, 2. Table `b` has four rows with `k` = 1, 1, 1, 3.\n\n" + sql("SELECT * FROM a JOIN b ON a.k = b.k;") + "\nHow many rows does it return?",
        question: { type: "number", answer: 6, hint: "Each 1 in `a` pairs with every 1 in `b`. The 2 and the 3 match nothing." },
        explanation: "2 rows × 3 rows with k = 1 gives 6 pairs; the 2 and the 3 have no partner. Duplicate keys multiply, which is how joins silently inflate a SUM. Aggregate first or join on a unique key.",
      },
      {
        kind: "question",
        title: "ON or WHERE?",
        body: "You want **every** customer, together with their orders from 2026 (customers with no 2026 orders should still appear, with NULLs).\n\n" + sql("SELECT c.name, o.id\nFROM customers c\nLEFT JOIN orders o ON o.customer_id = c.id\n-- where does  o.year = 2026  go?"),
        question: {
          type: "choice",
          options: ["In the ON clause, with AND", "In a WHERE clause at the end", "In a GROUP BY o.year", "Either one, the result is the same"],
          answer: 0,
          feedback: {
            1: "WHERE runs after the join. For customers with no 2026 orders, o.year is NULL, the test is UNKNOWN, and they disappear.",
            3: "Not for a LEFT JOIN: WHERE drops the NULL-padded rows.",
          },
          hint: "Which clause decides what *matches*, and which one filters the joined rows afterwards?",
        },
        explanation: "`LEFT JOIN orders o ON o.customer_id = c.id AND o.year = 2026` only matches 2026 orders and still keeps every customer. The same test in WHERE removes customers without such orders: it becomes an inner join.",
      },
      {
        kind: "question",
        title: "Authors with no books",
        body: "Which `FROM` part lists the authors who have **no** books?\n\n" + sql("SELECT a.name\nFROM authors a\n-- ???"),
        question: {
          type: "choice",
          options: [
            "JOIN books b ON b.author_id = a.id WHERE b.id IS NULL",
            "LEFT JOIN books b ON b.author_id = a.id WHERE b.id IS NOT NULL",
            "LEFT JOIN books b ON b.author_id = a.id AND b.id IS NULL",
            "LEFT JOIN books b ON b.author_id = a.id WHERE b.id IS NULL",
          ],
          answer: 3,
          feedback: {
            0: "An inner join never produces NULL for b.id, so this returns nothing.",
            1: "That keeps the authors who do have books.",
            2: "The extra ON test makes nothing match, so every author comes back with NULLs.",
          },
          hint: "First keep everyone with a LEFT JOIN, then keep the rows where the right side came back empty.",
        },
        explanation: "LEFT JOIN pads authors without books with NULLs; `WHERE b.id IS NULL` keeps exactly those. `NOT EXISTS (SELECT 1 FROM books b WHERE b.author_id = a.id)` is the other standard way.",
      },
      {
        kind: "code",
        title: "Who handed nothing in?",
        body:
          "Two tables:\n\n" +
          txt(`
students              submissions
 id | name             id | student_id | task
----+------            ----+------------+-----
  1 | Ava               1 | 1          | t1
  2 | Ben               2 | 1          | t2
  3 | Cleo              3 | 3          | t1
  4 | Dev               4 | NULL       | t3
  5 | Eko               5 | 5          | t2
`) +
          "\nReturn the `name` of every student with **no** submissions, ordered by name. Submission 4 lost its student (NULL); make sure that doesn't break your query.",
        language: "sql",
        setup: `CREATE TABLE students (id INTEGER PRIMARY KEY, name TEXT);
CREATE TABLE submissions (id INTEGER PRIMARY KEY, student_id INTEGER, task TEXT);
INSERT INTO students VALUES (1, 'Ava'), (2, 'Ben'), (3, 'Cleo'), (4, 'Dev'), (5, 'Eko');
INSERT INTO submissions VALUES (1, 1, 't1'), (2, 1, 't2'), (3, 3, 't1'), (4, NULL, 't3'), (5, 5, 't2');`,
        starter: `SELECT s.name
FROM students s
JOIN submissions x ON x.student_id = s.id
ORDER BY s.name;
`,
        solution: `SELECT s.name
FROM students s
LEFT JOIN submissions x ON x.student_id = s.id
WHERE x.id IS NULL
ORDER BY s.name;
`,
        tests: [
          { id: "t1", description: "finds the students with nothing handed in", assertionCode: `assert(rows.length > 0, "No rows came back. If you used NOT IN, the NULL student_id makes it return nothing: use a LEFT JOIN or NOT EXISTS");\nassertEqual(rows.map((r) => r.name), ["Ben", "Dev"], "Ben and Dev have no submissions");` },
          { id: "t2", description: "each student appears once", assertionCode: `const names = rows.map((r) => r.name);\nassertEqual(names.length, new Set(names).size, "No student should be listed twice");` },
          { id: "t3", description: "students who handed something in are left out", assertionCode: `assert(!rows.some((r) => r.name === "Ava" || r.name === "Cleo" || r.name === "Eko"), "Ava, Cleo and Eko each have a submission, so they don't belong in the list");` },
        ],
        hints: ["Keep every student with a LEFT JOIN, then keep the rows where the submission side is NULL.", "Test a column that is never NULL in a real match, such as `x.id`."],
      },
      {
        kind: "code",
        title: "Mentors who joined later",
        body:
          "In the club table `members`, `mentor_id` points at another member (NULL for no mentor):\n\n" +
          txt(`
members
 id | name | joined     | mentor_id
----+------+------------+----------
  1 | Ada  | 2024-01-10 | NULL
  2 | Bao  | 2024-03-02 | 1
  3 | Cal  | 2023-11-20 | 1
  4 | Dina | 2024-02-01 | 2
  5 | Eve  | 2024-05-05 | 2
  6 | Finn | 2024-01-10 | 1
`) +
          "\nReturn `member` and `mentor` (both names) for every member whose mentor joined **after** they did, ordered by member name. Dates are ISO text, so they compare correctly as strings.",
        language: "sql",
        setup: `CREATE TABLE members (id INTEGER PRIMARY KEY, name TEXT, joined TEXT, mentor_id INTEGER);
INSERT INTO members VALUES (1, 'Ada', '2024-01-10', NULL), (2, 'Bao', '2024-03-02', 1), (3, 'Cal', '2023-11-20', 1), (4, 'Dina', '2024-02-01', 2), (5, 'Eve', '2024-05-05', 2), (6, 'Finn', '2024-01-10', 1);`,
        starter: `SELECT name AS member
FROM members
ORDER BY name;
`,
        solution: `SELECT m.name AS member, t.name AS mentor
FROM members m
JOIN members t ON t.id = m.mentor_id
WHERE t.joined > m.joined
ORDER BY m.name;
`,
        tests: [
          { id: "t1", description: "columns member and mentor", assertionCode: `assert(result !== null && result.columns.join(",") === "member,mentor", "Return two columns, member then mentor (got " + (result ? result.columns.join(", ") : "nothing") + ")");` },
          { id: "t2", description: "the right pairs", assertionCode: `assertEqual(rows.map((r) => r.member + "-" + r.mentor), ["Cal-Ada", "Dina-Bao"], "Cal joined before Ada, Dina before Bao");` },
          { id: "t3", description: "joining on the same day is not 'after'", assertionCode: `assert(!rows.some((r) => r.member === "Finn"), "Finn and Ada joined the same day, so Ada did not join after Finn: use >, not >=");` },
        ],
        hints: ["Use the table twice: `members m` for the member and `members t` for the mentor.", "Join with `t.id = m.mentor_id`, then compare `t.joined > m.joined`."],
      },
      {
        kind: "recap",
        points: [
          "`JOIN` keeps matching pairs; `LEFT JOIN` keeps every left row and pads missing matches with NULL.",
          "Joins multiply rows on duplicate keys: 2 × 3 matches make 6 rows.",
          "In a LEFT JOIN, filters on the right table go in `ON`; in WHERE they undo the LEFT.",
          "**Anti-join**: `LEFT JOIN … WHERE right.id IS NULL` or `NOT EXISTS`; avoid `NOT IN` when NULLs are possible.",
          "**Self join**: alias the same table twice to compare a row with the row it points at.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 3. GROUP BY and HAVING ───────────────────────────────
  {
    id: "fnd-iv-database-3-grouping",
    title: "Grouping and HAVING",
    summary: "One row per group, the aggregates, WHERE before and HAVING after, and the 'has every item' pattern.",
    minutes: 14,
    xp: 80,
    level: "Intermediate",
    steps: [
      {
        kind: "explain",
        title: "Squash rows into groups",
        body:
          "`GROUP BY` sorts rows into buckets by one or more columns and produces **one output row per bucket**. Each output column must be a grouping column or an **aggregate** over the bucket: `COUNT`, `SUM`, `AVG`, `MIN`, `MAX`.\n\n" +
          "| aggregate | note |\n|---|---|\n| `COUNT(*)` | rows in the group |\n| `COUNT(col)` | rows where col is **not NULL** |\n| `COUNT(DISTINCT col)` | different non-NULL values |\n| `SUM`, `AVG`, `MIN`, `MAX` | ignore NULLs |\n\n" +
          "A query runs in this logical order, which explains most errors:\n\n" +
          txt("FROM / JOIN  →  WHERE  →  GROUP BY  →  HAVING  →  SELECT  →  ORDER BY  →  LIMIT") +
          "\n\nSo `WHERE` filters **rows** before they are grouped, and `HAVING` filters **groups** after the aggregates exist. You can't use `COUNT(*)` in WHERE.\n\n**How to spot it:** *per*, *for each*, *how many*, *total*, *at least N*, *more than one*. \"At least\" over groups almost always means HAVING.",
      },
      {
        kind: "question",
        title: "Which group fails HAVING?",
        body: "Step through the rows going into their buckets. At the stop, tap the group that HAVING removes.",
        widget: {
          type: "iv-trace",
          props: {
            lang: "sql",
            title: "GROUP BY shop HAVING SUM(amt) >= 50",
            frames: [
              { grid: ORDERS_GRID, code: ORDERS_CODE, line: 3, cells: row3(1, "active"), vars: { N: 30 }, note: "Row 1 starts bucket **N** with 30." },
              { cells: [...row3(1, "done"), ...row3(2, "active")], vars: { N: 30, S: 25 }, line: 3, note: "Row 2 starts bucket **S**." },
              { cells: [...row3(1, "done"), ...row3(2, "done"), ...row3(3, "active")], vars: { N: 70, S: 25 }, line: 3, note: "Row 3 is N again: 30 + 40 = 70." },
              { cells: [...row3(1, "done"), ...row3(2, "done"), ...row3(3, "done"), ...row3(4, "active")], vars: { N: 70, S: 25, E: 90 }, line: 3, note: "Row 4 starts bucket **E** with 90." },
              { cells: [...row3(1, "done"), ...row3(2, "done"), ...row3(3, "done"), ...row3(4, "done"), ...row3(5, "active")], vars: { N: 70, S: 40, E: 90 }, line: 3, note: "Row 5 lands in S: 25 + 15 = 40. Every row is in a bucket." },
              { cells: [], array: ["N 70", "S 40", "E 90"], line: 4, note: "Three groups, one row each. Now HAVING tests each **group**.", pick: { prompt: "Which group does `HAVING SUM(amt) >= 50` remove?", answer: 1, on: "array" } },
              { array: ["N 70", "E 90"], done: [], line: 1, note: "S is gone. Without an ORDER BY the order of groups is not guaranteed; add `ORDER BY total DESC` if it matters." },
            ],
          },
        },
        question: { type: "widget", goal: { picked: true }, prompt: "Answer the pick.", hint: "HAVING compares each group's total with 50." },
        explanation: "GROUP BY made one row per shop and HAVING tested the totals: S has 40, under 50. WHERE couldn't do this, because the total doesn't exist until the rows are grouped.",
      },
      {
        kind: "question",
        title: "Put the clauses in running order",
        body: "Put these clauses in the order the database logically evaluates them.",
        question: { type: "order", items: ["FROM", "WHERE", "GROUP BY", "HAVING", "SELECT", "ORDER BY", "LIMIT"], hint: "Rows must exist before they're filtered, groups before they're filtered, and the output before it's sorted." },
        explanation: "FROM builds the rows, WHERE filters them, GROUP BY buckets them, HAVING filters buckets, SELECT computes the output columns (that's why many databases reject a SELECT alias in WHERE), ORDER BY sorts, LIMIT cuts.",
      },
      {
        kind: "question",
        title: "COUNT a column",
        body: "`pay` has 5 rows; `bonus` is NULL in 2 of them.\n\n" + sql("SELECT COUNT(bonus) FROM pay;") + "\nWhat number does it return?",
        question: { type: "number", answer: 3, hint: "COUNT(column) only counts values that are present." },
        explanation: "`COUNT(bonus)` skips NULLs, so it's 3. `COUNT(*)` would be 5. Picking the wrong one is a classic off-by-NULL bug in \"how many users have…\" questions.",
      },
      {
        kind: "question",
        title: "Filter rows, then groups",
        body: "Count only orders over 10, and keep shops with **more than 3** such orders. Which pair of clauses does it?",
        question: {
          type: "choice",
          options: ["HAVING amt > 10 AND COUNT(*) > 3", "WHERE amt > 10 AND COUNT(*) > 3", "WHERE amt > 10 … HAVING COUNT(*) > 3", "WHERE COUNT(*) > 3 … HAVING amt > 10"],
          answer: 2,
          feedback: { 1: "COUNT(*) doesn't exist yet when WHERE runs; this is an error.", 3: "Backwards: WHERE runs before any count exists." },
          hint: "Which test is about one row, and which is about a whole group?",
        },
        explanation: "`amt > 10` is about single rows: WHERE, before grouping. `COUNT(*) > 3` is about groups: HAVING, after grouping.",
      },
      {
        kind: "code",
        title: "Busy cities",
        body:
          "The table `rides`:\n\n" +
          txt(`
rides
 id | rider | city    | status    | fare
----+-------+---------+-----------+-----
  1 | ana   | Lagos   | done      | 12
  2 | ben   | Lagos   | done      | 8
  3 | cy    | Accra   | done      | 20
  4 | ana   | Lagos   | cancelled | 0
  5 | dee   | Accra   | done      | 15
  6 | eli   | Accra   | done      | 5
  7 | fay   | Nairobi | done      | 30
  8 | gus   | Lagos   | done      | 10
  9 | hal   | Nairobi | done      | 25
 10 | ivy   | Accra   | cancelled | 0
 11 | jo    | Nairobi | cancelled | 0
`) +
          "\nCount only rides with status `'done'`. For each city with **at least 3** done rides, return `city`, `rides` (the count) and `total` (the sum of fares), biggest total first.",
        language: "sql",
        setup: `CREATE TABLE rides (id INTEGER PRIMARY KEY, rider TEXT, city TEXT, status TEXT, fare INTEGER);
INSERT INTO rides VALUES (1, 'ana', 'Lagos', 'done', 12), (2, 'ben', 'Lagos', 'done', 8), (3, 'cy', 'Accra', 'done', 20), (4, 'ana', 'Lagos', 'cancelled', 0), (5, 'dee', 'Accra', 'done', 15), (6, 'eli', 'Accra', 'done', 5), (7, 'fay', 'Nairobi', 'done', 30), (8, 'gus', 'Lagos', 'done', 10), (9, 'hal', 'Nairobi', 'done', 25), (10, 'ivy', 'Accra', 'cancelled', 0), (11, 'jo', 'Nairobi', 'cancelled', 0);`,
        starter: `SELECT city, COUNT(*) AS rides, SUM(fare) AS total
FROM rides
GROUP BY city;
`,
        solution: `SELECT city, COUNT(*) AS rides, SUM(fare) AS total
FROM rides
WHERE status = 'done'
GROUP BY city
HAVING COUNT(*) >= 3
ORDER BY total DESC;
`,
        tests: [
          { id: "t1", description: "only cities with 3 done rides", assertionCode: `assert(!rows.some((r) => r.city === "Nairobi"), "Nairobi has only 2 done rides; its cancelled ride must not count");\nassertEqual(rows.map((r) => r.city), ["Accra", "Lagos"], "Accra and Lagos, biggest total first");` },
          { id: "t2", description: "ride counts skip cancellations", assertionCode: `assertEqual(rows.map((r) => r.rides), [3, 3], "Each of the two cities has 3 done rides");` },
          { id: "t3", description: "totals", assertionCode: `assertEqual(rows.map((r) => r.total), [40, 30], "Accra's fares add up to 40, Lagos's to 30");` },
        ],
        hints: ["Filter the cancelled rides with WHERE before grouping.", "Then `HAVING COUNT(*) >= 3` and `ORDER BY total DESC`."],
      },
      {
        kind: "code",
        title: "Passed every course",
        body:
          "A school records each pass, and a retake that passes again adds another row:\n\n" +
          txt(`
courses        passed
 code           student | code
------         ---------+-----
 A1             mo      | A1
 B2             mo      | B2
 C3             mo      | C3
                mo      | A1
                ny      | A1
                ny      | B2
                ny      | B2
                ny      | A1
                oz      | C3
                oz      | B2
                oz      | A1
                pe      | A1
                pe      | B2
                pe      | X9
`) +
          "\nReturn the `student` names who passed **every** course in `courses`, ordered by name. `X9` is an old code that is no longer a course. This is the \"has all of them\" pattern: count what each one has and compare it with the total.",
        language: "sql",
        setup: `CREATE TABLE courses (code TEXT PRIMARY KEY);
CREATE TABLE passed (student TEXT, code TEXT);
INSERT INTO courses VALUES ('A1'), ('B2'), ('C3');
INSERT INTO passed VALUES ('mo', 'A1'), ('mo', 'B2'), ('mo', 'C3'), ('mo', 'A1'), ('ny', 'A1'), ('ny', 'B2'), ('ny', 'B2'), ('ny', 'A1'), ('oz', 'C3'), ('oz', 'B2'), ('oz', 'A1'), ('pe', 'A1'), ('pe', 'B2'), ('pe', 'X9');`,
        starter: `SELECT student
FROM passed
GROUP BY student
HAVING COUNT(*) = 3
ORDER BY student;
`,
        solution: `SELECT student
FROM passed
WHERE code IN (SELECT code FROM courses)
GROUP BY student
HAVING COUNT(DISTINCT code) = (SELECT COUNT(*) FROM courses)
ORDER BY student;
`,
        tests: [
          { id: "t1", description: "a retake doesn't hurt", assertionCode: `assert(rows.some((r) => r.student === "mo"), "mo passed A1, B2 and C3 (A1 twice). Count DISTINCT codes, not rows");` },
          { id: "t2", description: "codes that aren't courses don't count", assertionCode: `assert(!rows.some((r) => r.student === "pe"), "pe has 3 different codes, but X9 isn't a course. Keep only codes that are in courses");` },
          { id: "t3", description: "the exact list", assertionCode: `assertEqual(rows.map((r) => r.student), ["mo", "oz"], "mo and oz passed all three courses");` },
        ],
        hints: ["COUNT(*) counts rows, so retakes inflate it. What counts different values?", "Filter with `WHERE code IN (SELECT code FROM courses)`, then compare `COUNT(DISTINCT code)` with `(SELECT COUNT(*) FROM courses)`."],
      },
      {
        kind: "recap",
        points: [
          "`GROUP BY` gives one row per group; every other output column must be an aggregate.",
          "`COUNT(*)` counts rows, `COUNT(col)` skips NULLs, `COUNT(DISTINCT col)` counts different values.",
          "Logical order: FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY → LIMIT.",
          "WHERE filters rows before grouping; **HAVING** filters groups after.",
          "\"Has every X\": filter to valid X, then `HAVING COUNT(DISTINCT x) = (SELECT COUNT(*) FROM xs)`.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 4. Subqueries and CTEs ───────────────────────────────
  {
    id: "fnd-iv-database-4-subqueries",
    title: "Subqueries and CTEs",
    summary: "Scalar, IN and correlated subqueries, EXISTS, and naming steps with WITH.",
    minutes: 15,
    xp: 90,
    level: "Intermediate",
    steps: [
      {
        kind: "explain",
        title: "A query inside a query",
        body:
          "A **subquery** is a `SELECT` in brackets used as a value or a table:\n\n" +
          "| kind | example | returns |\n|---|---|---|\n| scalar | `(SELECT MAX(pay) FROM staff)` | one value (NULL if no rows) |\n| list | `id IN (SELECT user_id FROM bans)` | a column to test against |\n| `EXISTS` | `EXISTS (SELECT 1 FROM orders o WHERE o.cid = c.id)` | TRUE if any row comes back |\n| derived table | `FROM (SELECT …) AS t` | a whole table |\n\n" +
          "A **correlated** subquery mentions the outer row (`o.cid = c.id` above), so conceptually it runs again for every outer row. That's how you compare a row with its own group.\n\n" +
          "A **CTE** (common table expression) gives a subquery a name up front, so a long query reads top to bottom:\n\n" +
          sql(`
WITH totals AS (
  SELECT customer, SUM(total) AS spend
  FROM orders GROUP BY customer
)
SELECT customer, spend
FROM totals
WHERE spend > (SELECT AVG(spend) FROM totals);
`) +
          "\n\n**How to spot it:** *above the average*, *the highest*, *the N-th*, *compared with their department*: one value or group computed first, then used to filter. Two-step questions read best as CTEs.",
      },
      {
        kind: "question",
        title: "Above their own department",
        body: "Step through the correlated subquery: for each person, the inner query averages pay in **their** department. At the stop, predict who passes.",
        widget: {
          type: "iv-trace",
          props: {
            lang: "sql",
            title: "pay above the department average",
            frames: [
              { grid: STAFF_GRID, code: STAFF_CODE, line: 4, cells: row3(1, "active"), vars: { dept: "ops", avg: 60, pay: 50 }, note: "Ana is in ops. The inner query averages ops: (50 + 70) / 2 = 60. 50 is not more: dropped." },
              { cells: [...row3(1, "done"), ...row3(2, "active")], vars: { dept: "ops", avg: 60, pay: 70 }, line: 2, note: "Bo: ops again, average 60. 70 > 60, kept." },
              { cells: [...row3(1, "done"), ...row3(2, "path")], vars: { dept: "dev", avg: 75 }, line: 4, note: "The next three are in dev. The inner query re-runs: (90 + 60 + 75) / 3 = 75.", pick: { prompt: "Which dev person has pay above 75? Tap their name.", answer: "3,0" } },
              { cells: [...row3(1, "done"), ...row3(2, "path"), ...row3(3, "path"), ...row3(4, "done"), ...row3(5, "active")], vars: { dept: "dev", avg: 75, pay: 75 }, line: 2, note: "Cy (90) is kept, Dee (60) is not, and Eli's 75 is **equal** to the average, not above it." },
              { cells: [...row3(1, "done"), ...row3(2, "path"), ...row3(3, "path"), ...row3(4, "done"), ...row3(5, "done")], vars: { result: "Bo, Cy" }, note: "Result: **Bo, Cy**. A database usually computes each department's average once and reuses it, but the meaning is \"per row\"." },
            ],
          },
        },
        question: { type: "widget", goal: { picked: true }, prompt: "Answer the pick.", hint: "Compare each dev salary with 75; only a strictly larger one passes." },
        explanation: "The correlated subquery `WHERE dept = s.dept` looks at the outer row's department, so each person is compared with their own department's average. The same result comes from a CTE of averages joined back on dept, or a window function, which you'll meet next.",
      },
      {
        kind: "question",
        title: "How often does it run?",
        body: "In this query, how often does the inner `SELECT` run, conceptually?\n\n" + sql("SELECT c.name FROM customers c\nWHERE EXISTS (SELECT 1 FROM orders o WHERE o.cid = c.id);"),
        question: {
          type: "choice",
          options: ["Once, before the outer query starts", "Once for every customer row", "Once per order in the orders table", "Only for customers with a NULL id"],
          answer: 1,
          feedback: { 0: "That's true of an uncorrelated subquery. This one mentions c.id from the outer row." },
          hint: "Does the inner query mention a column from the outer query?",
        },
        explanation: "It refers to `c.id`, so it is **correlated**: its answer depends on the outer row, and conceptually it runs once per customer. EXISTS can stop at the first matching order, which makes it cheap with an index on `orders.cid`.",
      },
      {
        kind: "question",
        title: "OFFSET on duplicates",
        body: "`scores(v)` holds 90, 85, 85, 70 and 60.\n\n" + sql("SELECT v FROM scores ORDER BY v DESC LIMIT 1 OFFSET 2;") + "\nFind the value it returns.",
        question: { type: "number", answer: 85, hint: "Sort descending, skip two rows, take the next one. Duplicates are separate rows." },
        explanation: "Sorted: 90, 85, 85, 70, 60. Skipping two rows lands on the second 85. If the question asks for the third-highest **distinct** value, write `SELECT DISTINCT v … LIMIT 1 OFFSET 2`, which gives 70.",
      },
      {
        kind: "question",
        title: "What a CTE is",
        body: "In `WITH t AS (SELECT …) SELECT … FROM t`, what is `t`?",
        question: {
          type: "choice",
          options: ["A named query, usable like a table here", "A new table saved in the database", "An index that speeds up the inner query", "A view that later queries can use"],
          answer: 0,
          feedback: { 1: "Nothing is stored; the CTE only lives for the one statement.", 3: "A view outlives the statement; a CTE doesn't." },
          hint: "Does `t` still exist after the statement finishes?",
        },
        explanation: "A CTE is a named subquery scoped to one statement. It can be referenced several times (as `totals` was above), which a plain derived table can't, and it makes multi-step answers readable.",
      },
      {
        kind: "code",
        title: "Silver and bronze scores",
        body:
          "The arcade table `runs`:\n\n" +
          txt(`
runs
 player | score
--------+------
 a      | 300
 b      | 450
 c      | 450
 d      | 380
 e      | 300
 f      | 220
`) +
          "\nReturn **one row** with two columns: `second` and `third`, the second- and third-highest **distinct** scores. If a score didn't exist it should come out as NULL, so compute each one with a scalar subquery (a scalar subquery that finds no row gives NULL, while a bare `LIMIT`/`OFFSET` query would return no row at all).",
        language: "sql",
        setup: `CREATE TABLE runs (player TEXT, score INTEGER);
INSERT INTO runs VALUES ('a', 300), ('b', 450), ('c', 450), ('d', 380), ('e', 300), ('f', 220);`,
        starter: `SELECT score AS second, score AS third
FROM runs
ORDER BY score DESC;
`,
        solution: `SELECT
  (SELECT DISTINCT score FROM runs ORDER BY score DESC LIMIT 1 OFFSET 1) AS second,
  (SELECT DISTINCT score FROM runs ORDER BY score DESC LIMIT 1 OFFSET 2) AS third;
`,
        tests: [
          { id: "t1", description: "exactly one row", assertionCode: `assert(rows.length === 1, "Return exactly one row with both values side by side (got " + rows.length + " rows)");` },
          { id: "t2", description: "second is 380", assertionCode: `assert(rows[0]?.second !== 450, "450 appears twice, but as a distinct value it is only the highest. Use DISTINCT");\nassertEqual(rows[0]?.second, 380, "Distinct scores are 450, 380, 300, 220, so second is 380");` },
          { id: "t3", description: "third is 300", assertionCode: `assertEqual(rows[0]?.third, 300, "The third distinct score is 300 (OFFSET 2 skips 450 and 380)");` },
        ],
        hints: ["`SELECT DISTINCT score FROM runs ORDER BY score DESC` lists each score once. OFFSET 1 skips the first.", "`SELECT (SELECT … LIMIT 1 OFFSET 1) AS second, (SELECT … LIMIT 1 OFFSET 2) AS third;`"],
      },
      {
        kind: "code",
        title: "Big spenders",
        body:
          "The table `orders`:\n\n" +
          txt(`
orders
 id | customer | total
----+----------+------
  1 | ana      | 40
  2 | ana      | 60
  3 | bo       | 60
  4 | cy       | 35
  5 | cy       | 35
  6 | cy       | 35
  7 | cy       | 35
  8 | dee      | 20
`) +
          "\nReturn `customer` and `spend` (their total) for customers whose spend is above the **average spend per customer**, biggest spend first. Careful: that's not the same as the average order.",
        language: "sql",
        setup: `CREATE TABLE orders (id INTEGER PRIMARY KEY, customer TEXT, total INTEGER);
INSERT INTO orders VALUES (1, 'ana', 40), (2, 'ana', 60), (3, 'bo', 60), (4, 'cy', 35), (5, 'cy', 35), (6, 'cy', 35), (7, 'cy', 35), (8, 'dee', 20);`,
        starter: `SELECT customer, SUM(total) AS spend
FROM orders
GROUP BY customer
HAVING SUM(total) > (SELECT AVG(total) FROM orders)
ORDER BY spend DESC;
`,
        solution: `WITH totals AS (
  SELECT customer, SUM(total) AS spend
  FROM orders
  GROUP BY customer
)
SELECT customer, spend
FROM totals
WHERE spend > (SELECT AVG(spend) FROM totals)
ORDER BY spend DESC;
`,
        tests: [
          { id: "t1", description: "the average is per customer", assertionCode: `assert(!rows.some((r) => r.customer === "bo"), "bo's 60 beats the average order (40) but not the average customer (320 / 4 = 80)");` },
          { id: "t2", description: "the right customers, biggest first", assertionCode: `assertEqual(rows.map((r) => r.customer), ["cy", "ana"], "cy (140) and ana (100) are above 80");` },
          { id: "t3", description: "spend values", assertionCode: `assertEqual(rows.map((r) => r.spend), [140, 100], "spend is each customer's total");` },
        ],
        hints: ["Make a CTE `totals` with one row per customer first.", "Then compare `spend` with `(SELECT AVG(spend) FROM totals)`."],
      },
      {
        kind: "recap",
        points: [
          "A **scalar subquery** gives one value, and NULL when it finds no row: perfect for \"N-th highest or NULL\".",
          "`IN (subquery)` tests membership; `EXISTS` tests whether any row matches and is NULL-safe.",
          "A **correlated** subquery refers to the outer row, so it compares each row with its own group.",
          "A **CTE** (`WITH name AS (…)`) names a step; use it for two-step questions like \"above the average total\".",
          "Watch the level of the average: per row and per group are different numbers.",
        ],
      },
    ],
  },
];
