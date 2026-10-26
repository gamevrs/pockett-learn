import type { Chapter } from "@/engine/types";
import { md, sql, t } from "./util.ts";

/**
 * Chapter 1: sketch to schema.
 * From a one-page brief to a model, then tables with types, keys and business rules.
 */
export const chapter1: Chapter = {
  id: "design",
  title: "Sketch to schema",
  blurb: "Turn a one-page brief into a model, then into tables that already refuse the obvious mistakes.",
  lessons: [
    // ───────────────────────────── 1 ─────────────────────────────
    {
      id: "schema-studio-1-model",
      title: "From brief to model",
      minutes: 20,
      xp: 100,
      concepts: ["entities vs attributes", "relationships", "cardinality (1:N, N:M)", "evidence from existing data"],
      learn: md`### A database starts as a sentence

Nobody should type \`CREATE TABLE\` before they can say, in plain words, **what exists** and **how those things relate**. That is a *model*. It is cheap to change today and very expensive to change after a year of data lives in it.

Read a brief like a detective reads a witness statement: underline the **nouns**, then the **verbs** that connect them.

- A noun that has its own facts and its own identity is an **entity**. It becomes a table later. *A member has a name, an e-mail, a plan. Members can be told apart.*
- A noun that is just a fact about something else is an **attribute**. It becomes a column. *A phone number is a fact about a member.* (Unless members may have several and each needs a label: then it starts to behave like an entity, and you will meet exactly that in the migration lesson.)
- A verb between two entities is a **relationship**. *A member books a tool.*

### Cardinality: how many on each side?

Read every relationship **in both directions** and finish each sentence with "one" or "many":

- One plan covers many members. Each member is on one plan. That is **one-to-many**, written \`1:N\`, with the "one" side first: \`plan 1:N member\`.
- One member can hold certificates for many tools, and one tool can have many certified members. That is **many-to-many**, \`N:M\`.
- \`1:1\` exists too (a member and their locker key), but it is rarer than people expect: if two things are always created and deleted together they are usually one table.

The direction decides where a column goes. In a \`1:N\` the "many" side holds a **foreign key** pointing at the "one" side: members point at their plan, never the other way round, because a plan cannot store "a list of members" in one cell. And an \`N:M\` can never be stored in a column at all: it needs a table of its own, which is lesson 7.

### Don't just trust the data, but do interrogate it

When a system already exists (here: a shared spreadsheet) its rows are *evidence*. They cannot prove a rule, only contradict one: if the sheet shows one tool in two workshops, either the rule is wrong or the sheet is. Questions like "what is the largest number of X per Y we ever see?" are answered with a group-and-count, then a \`MAX\` over the counts:

~~~sql
WITH per_member AS (
  SELECT COUNT(DISTINCT plan_name) AS n
  FROM legacy_sheet
  GROUP BY lower(trim(member_email))
)
SELECT MAX(n) AS plans_per_member FROM per_member;
~~~

Notice \`lower(trim(member_email))\`. Humans typed this spreadsheet, so the same person appears as \`Kofi.Adeyemi@Mail.example\` and \`kofi.adeyemi@mail.example \` (with a trailing space). *Counting people means deciding what makes two rows the same person* before you count. Skip that step and you will have more "members" than anyone ever signed up.

### A model can be a result set

You do not need a drawing tool. A tiny \`SELECT\` of literal rows is a perfectly good way to write a model down, and the Studio on the right will draw it as a dashed blueprint:

~~~sql
SELECT 'plan' AS a, 'member' AS b, '1:N' AS cardinality
UNION ALL SELECT 'workshop', 'tool', '1:N';
~~~

### Common mistakes

- **Making an entity out of a value.** "Colour" is not a table unless colours have facts of their own.
- **Storing a list in a cell** (\`'WD-01, FB-01'\`). If the question has "many" in it, you need rows, not commas.
- **Drawing the arrow the wrong way** and putting the key on the wrong table. Say the sentence out loud both ways before you commit.
- **Modelling the report instead of the world.** "Monthly revenue" is a query over bookings and plans, not a thing that exists.`,
      mission: md`Welcome to **Lantern Yard**, a community workshop with a woodshop, a metal bay, a fab lab, a textile loft and a clay room. For two years it has run on one shared spreadsheet and a badge reader on the front door. The founders have hired you to give it a real database.

Here is their brief, word for word:

- A **member** has an e-mail address and a badge card, and is on exactly one membership **plan** (Drop-in, Casual, Maker or Studio). Many members share a plan.
- The yard has **workshops**. Every **tool** lives in exactly one workshop.
- Some tools (saws, the laser, the kiln) need an induction first. A member who completed the induction is *certified* for that tool. A member can hold many certificates and a tool has many certified members.
- Members **book** a tool for a time slot. A booking belongs to one member and one tool; a member and a tool can have many bookings over time.
- Tools break. Every repair **ticket** is about one tool, and a tool can have many tickets over its life.

The old spreadsheet is already in your database as \`legacy_sheet\`: one row per tool session. You will use these table names all through the project: \`plan\`, \`member\`, \`workshop\`, \`tool\`, \`booking\`, \`maintenance_ticket\`.

First, get to know the sheet. Then write the model down.`,
      tasks: [
        "Census: one row with sessions, members, tools, workshops and plans in legacy_sheet. Count a person once, by their trimmed lower-case e-mail",
        "Evidence: one row with workshops_per_tool, plans_per_member, tools_per_member and members_per_tool: the largest group the sheet ever shows",
        "The model: one row per relationship with columns a, b, cardinality. Put the 'one' side first in every 1:N; the N:M row can go either way",
      ],
      starterAdd: sql`-- ── ✏️ YOUR TURN ───────────────────────────
-- Lesson 1: from brief to model.
-- The old spreadsheet is the table legacy_sheet (one row per tool session).
-- Peek at it first:  SELECT * FROM legacy_sheet LIMIT 5;
--
-- 1. Census. ONE row, columns: sessions, members, tools, workshops, plans.
--    Count each person once: group them by lower(trim(member_email)).
--
-- 2. Evidence. ONE row, columns:
--      workshops_per_tool   the most workshops any single tool_tag appears in
--      plans_per_member     the most plans any single person appears on
--      tools_per_member     the most different tools any single person used
--      members_per_tool     the most different people any single tool was used by
--    Hint: GROUP BY first, COUNT(DISTINCT ...) per group, then MAX over the groups.
--
-- 3. The model. One row per relationship from the brief, columns: a, b, cardinality.
--    Use the table names plan, member, workshop, tool, booking, maintenance_ticket.
--    For a 1:N put the "one" side in column a. The certificate relationship is 'N:M'.
`,
      solutionAdd: sql`-- Census of the old spreadsheet
SELECT
  COUNT(*) AS sessions,
  COUNT(DISTINCT lower(trim(member_email))) AS members,
  COUNT(DISTINCT tool_tag) AS tools,
  COUNT(DISTINCT workshop_code) AS workshops,
  COUNT(DISTINCT plan_name) AS plans
FROM legacy_sheet;

-- Evidence for the cardinalities: the largest group the sheet ever shows
WITH
  shops_per_tool AS (SELECT COUNT(DISTINCT workshop_code) AS n FROM legacy_sheet GROUP BY tool_tag),
  plans_per_member AS (SELECT COUNT(DISTINCT plan_name) AS n FROM legacy_sheet GROUP BY lower(trim(member_email))),
  tools_per_member AS (SELECT COUNT(DISTINCT tool_tag) AS n FROM legacy_sheet GROUP BY lower(trim(member_email))),
  members_per_tool AS (SELECT COUNT(DISTINCT lower(trim(member_email))) AS n FROM legacy_sheet GROUP BY tool_tag)
SELECT
  (SELECT MAX(n) FROM shops_per_tool) AS workshops_per_tool,
  (SELECT MAX(n) FROM plans_per_member) AS plans_per_member,
  (SELECT MAX(n) FROM tools_per_member) AS tools_per_member,
  (SELECT MAX(n) FROM members_per_tool) AS members_per_tool;

-- The model: one row per relationship, the "one" side first
SELECT 'plan' AS a, 'member' AS b, '1:N' AS cardinality
UNION ALL SELECT 'workshop', 'tool', '1:N'
UNION ALL SELECT 'member', 'booking', '1:N'
UNION ALL SELECT 'tool', 'booking', '1:N'
UNION ALL SELECT 'tool', 'maintenance_ticket', '1:N'
UNION ALL SELECT 'member', 'tool', 'N:M';`,
      explanation:
        "The census counts people by a cleaned-up e-mail, because three spellings of one address would otherwise look like three members. The evidence query groups first and takes the MAX of the group sizes: a maximum of 1 supports a '1:N' (many tools, one workshop each), a maximum above 1 in both directions is the signature of an N:M. The model rows put the 'one' side first, because the 'many' side will hold the foreign key.",
      hints: [
        { id: "h1", title: "Count people once", content: "COUNT(DISTINCT lower(trim(member_email))) counts each person once however their e-mail was typed. Plain COUNT(DISTINCT member_email) would count the spelling variants separately." },
        { id: "h2", title: "Group, then MAX", content: "For 'workshops per tool': WITH shops_per_tool AS (SELECT COUNT(DISTINCT workshop_code) AS n FROM legacy_sheet GROUP BY tool_tag) SELECT MAX(n) FROM shops_per_tool. Do the same for the other three, and put the four scalar subqueries in one SELECT." },
        { id: "h3", title: "Write the model as rows", content: "SELECT 'plan' AS a, 'member' AS b, '1:N' AS cardinality UNION ALL SELECT 'workshop', 'tool', '1:N' UNION ALL ... Six rows in all: five '1:N' lines (plan>member, workshop>tool, member>booking, tool>booking, tool>maintenance_ticket) and one 'N:M' (member, tool)." },
      ],
      tests: [
        {
          id: "t1",
          description: "The census counts sessions, people, tools, workshops and plans",
          assertionCode: t`const got = data(["sessions", "members", "tools", "workshops", "plans"], "Add the census: one row with sessions, members, tools, workshops, plans")[0];
const want = one("SELECT COUNT(*) AS sessions, COUNT(DISTINCT lower(trim(member_email))) AS members, COUNT(DISTINCT tool_tag) AS tools, COUNT(DISTINCT workshop_code) AS workshops, COUNT(DISTINCT plan_name) AS plans FROM legacy_sheet");
for (const k of ["sessions", "members", "tools", "workshops", "plans"]) {
  assert(got[k] === want[k], k + " should be " + want[k] + (k === "members" ? " (count each person once: trim and lower-case the e-mail before counting)" : "") + ", got " + got[k]);
}`,
        },
        {
          id: "t2",
          description: "The evidence query reports the largest group sizes",
          assertionCode: t`const got = data(["workshops_per_tool", "plans_per_member", "tools_per_member", "members_per_tool"], "Add the evidence query: one row with workshops_per_tool, plans_per_member, tools_per_member, members_per_tool")[0];
const q = (s) => num("SELECT MAX(n) FROM (" + s + ")");
const want = {
  workshops_per_tool: q("SELECT COUNT(DISTINCT workshop_code) AS n FROM legacy_sheet GROUP BY tool_tag"),
  plans_per_member: q("SELECT COUNT(DISTINCT plan_name) AS n FROM legacy_sheet GROUP BY lower(trim(member_email))"),
  tools_per_member: q("SELECT COUNT(DISTINCT tool_tag) AS n FROM legacy_sheet GROUP BY lower(trim(member_email))"),
  members_per_tool: q("SELECT COUNT(DISTINCT lower(trim(member_email))) AS n FROM legacy_sheet GROUP BY tool_tag"),
};
for (const k of Object.keys(want)) assert(got[k] === want[k], k + " should be " + want[k] + ", got " + got[k] + (k.endsWith("_per_member") || k === "members_per_tool" ? " (remember to normalise the e-mail first)" : ""));`,
        },
        {
          id: "t3",
          description: "The model has the six relationships, with the 'one' side first",
          assertionCode: t`const rs = data(["a", "b", "cardinality"], "Add the model: rows with the columns a, b, cardinality");
const clean = (v) => String(v).trim().toLowerCase();
const key = (a, b, c) => (c === "n:m" ? [a, b].sort().join(" ~ ") + " | n:m" : a + " > " + b + " | " + c);
const got = rs.map((r) => key(clean(r.a), clean(r.b), clean(r.cardinality)));
const want = [["plan", "member", "1:n"], ["workshop", "tool", "1:n"], ["member", "booking", "1:n"], ["tool", "booking", "1:n"], ["tool", "maintenance_ticket", "1:n"], ["member", "tool", "n:m"]];
for (const [a, b, c] of want) {
  if (got.includes(key(a, b, c))) continue;
  if (c === "1:n" && got.includes(key(b, a, c))) assert(false, "'" + a + "' and '" + b + "' are the right pair, but the 'one' side is '" + a + "': one " + a + " has many " + b + "s");
  assert(false, "The brief says " + (c === "n:m" ? a + " and " + b + " are many-to-many" : "one " + a + " has many " + b + " rows") + ". That row is missing.");
}
assertEqual(got.length, want.length, "Number of relationships in your model (the brief has exactly six)");`,
        },
      ],
      unlocks: ["ss-sketch"],
      checks: [
        {
          prompt: "The brief says every tool lives in exactly one workshop. Which relationship is that, and where does the foreign key go?",
          question: {
            type: "choice",
            options: [
              "workshop 1:N tool, and the key goes on tool (each tool points at its workshop)",
              "workshop 1:N tool, and the key goes on workshop (each workshop lists its tools)",
              "N:M, so it needs a third table",
            ],
            answer: 0,
          },
          explanation: "One workshop has many tools, each tool has one workshop. The 'many' side carries the key: a tool row can hold one workshop code in a single cell, but a workshop row cannot hold a list of tools in a single cell.",
        },
        {
          prompt: "Why does the census count people with `lower(trim(member_email))` instead of plain `member_email`?",
          question: {
            type: "choice",
            options: [
              "To make the query faster",
              "Because the same person was typed with different capitals and stray spaces, which plain COUNT(DISTINCT) would count as different people",
              "SQLite requires functions inside COUNT",
            ],
            answer: 1,
          },
          explanation: "Identity is a modelling decision. Before counting rows you decide what makes two of them 'the same thing': here, the same mailbox, however it was typed.",
        },
      ],
    },

    // ───────────────────────────── 2 ─────────────────────────────
    {
      id: "schema-studio-2-tables",
      title: "Your first tables",
      minutes: 22,
      xp: 110,
      concepts: ["CREATE TABLE", "column types & STRICT", "NOT NULL", "DEFAULT", "INSERT with a column list"],
      learn: md`### Anatomy of a table

~~~sql
CREATE TABLE plan (
  id                INTEGER PRIMARY KEY,
  name              TEXT    NOT NULL,
  monthly_fee_cents INTEGER NOT NULL DEFAULT 0
) STRICT;
~~~

Each column line is **name, type, constraints**. A constraint is a promise the database keeps for you on every write, from every program, forever. That is the whole point of putting rules in the schema instead of in application code: the app is not the only thing that will ever talk to this database (a script, an import, a colleague's quick fix will too).

### Types: SQLite is different, on purpose

Most databases reject a word in a number column. SQLite, by default, **accepts almost anything**: a column has a *type affinity*, a preference, not a rule. Put \`'42'\` into an \`INTEGER\` column and it is quietly converted to the number 42. Put \`'abc'\` there and it is stored as text, in the "integer" column, with no complaint. That surprises people who arrive from Postgres, and it has caused real data bugs.

You can opt into the strict behaviour per table with the \`STRICT\` keyword after the closing parenthesis. A strict table allows only the types \`INTEGER\`, \`REAL\`, \`TEXT\`, \`BLOB\` and \`ANY\`, and refuses a value that cannot be stored as the declared type. In this project every table you design is \`STRICT\`.

Pragmatic choices that hold up for years:

- **Money: whole cents in an \`INTEGER\`.** \`REAL\` is binary floating point; \`0.1 + 0.2\` is not \`0.3\`. Cents never drift.
- **Dates and times: \`TEXT\` in ISO-8601** (\`'2026-03-04 18:00:00'\`). They sort correctly as text and SQLite's date functions read them. There is no date type to fight.
- **Yes/no: \`INTEGER\` 0 or 1** (you will add a \`CHECK\` for it in lesson 4). SQLite has no boolean type.
- **Measurements: \`REAL\`.** Floor area in square metres is a measurement, not money.

### NOT NULL and DEFAULT

\`NULL\` means "unknown or not applicable", and it is infectious: \`NULL = NULL\` is not true, \`NULL + 1\` is \`NULL\`. A column that is allowed to be \`NULL\` forces every query that touches it to think about that case. **Make a column \`NOT NULL\` unless "we genuinely may not know" is a normal state.** A workshop's floor area may be unmeasured (nullable). Its name may not.

\`DEFAULT\` supplies a value when an \`INSERT\` leaves the column out. Use a constant (\`DEFAULT 6\`) or a parenthesised expression (\`DEFAULT (date('now'))\`). Defaults and \`NOT NULL\` are a natural pair: "if you do not tell me, here is the sensible value".

### Insert with a column list

~~~sql
INSERT INTO plan (name, monthly_fee_cents) VALUES ('Casual', 2500);
~~~

Always name the columns. \`INSERT INTO plan VALUES (...)\` depends on column order, which breaks the day someone adds a column.

### Telling the Studio you expect a refusal

A good schema *rejects* things, so you need a way to show it doing so without stopping your script. Put a comment line \`-- expect error\` directly above a statement. If the database refuses it, the run records the refusal (and the Studio's firewall panel shows the reason) and carries on. If the database *accepts* it, you get a warning, which is precisely the bug you wanted to find.

### What the errors mean

- \`NOT NULL constraint failed: plan.name\`: you left out a required column, or passed \`NULL\`.
- \`cannot store TEXT value in INTEGER column plan.monthly_fee_cents\`: the strict type check, with the table and column in the message.
- \`table plan already exists\`: re-running a \`CREATE TABLE\` in the same database. Here the database is rebuilt on every run, so this means you wrote the statement twice.
- \`table plan has 5 columns but 4 values were supplied\`: positional \`INSERT\` with the wrong number of values; a column list prevents it.

### Common mistakes

- Using \`REAL\` for prices.
- Leaving columns nullable "just in case". Every nullable column is a question your future queries must answer.
- \`CREATE TABLE IF NOT EXISTS\` to make an error disappear. It does nothing when the table exists, so it hides a schema that differs from the one you thought you had.`,
      mission: md`Time to build. Two small tables first, the ones everything else will point at:

**\`plan\`** is what a member pays for.

- \`id\`, the identifier (\`INTEGER PRIMARY KEY\`: the next lesson explains it properly)
- \`name\`, required text
- \`monthly_fee_cents\`, required whole number, default 0
- \`included_minutes\`, required whole number of tool minutes per month, default 0
- \`active\`, required 0 or 1, default 1

**\`workshop\`** is a room.

- \`code\`, a short text code that identifies it (\`TEXT PRIMARY KEY\`)
- \`name\`, required text
- \`floor_m2\`, a measurement, may be unknown
- \`capacity\`, required whole number of people, default 6

Both are \`STRICT\`. Load these rows (the fee and minutes are what the spreadsheet says people pay):

- Plans: **Drop-in** (0 cents, 0 minutes), **Casual** (2500, 240), **Maker** (4500, 600), **Studio** (8500, 1800). Let \`active\` fall back to its default.
- Workshops: **WOOD** Woodshop 68.5 m², capacity 8; **METL** Metal Bay 54 m², capacity 6; **FAB** Fab Lab 72.25 m², capacity 10; **TEXT** Textile Loft 41 m²; **CLAY** Clay Room 38.5 m². Leave \`capacity\` out for the last two, so the default does its job.

Then watch the tables defend themselves, and see what a *non*-strict table does instead.`,
      tasks: [
        "Create the STRICT tables plan and workshop with the columns, NOT NULL and DEFAULT rules above",
        "Insert the four plans and five workshops (leave capacity out for TEXT and CLAY)",
        "Mark two statements with -- expect error: a plan without a name, and a plan whose monthly_fee_cents is the text 'ten euros'",
        "Create a TEMP table affinity_demo (n INTEGER) with the values '42', 'abc' and 4.5, then SELECT n AS value, typeof(n) AS stored_as",
      ],
      starterAdd: sql`-- ── ✏️ YOUR TURN ───────────────────────────
-- Lesson 2: your first tables.
--
-- 1. CREATE TABLE plan (...) STRICT and CREATE TABLE workshop (...) STRICT, as described in the mission.
--    Money in whole cents, NOT NULL where the mission says required, DEFAULTs where it gives one.
--
-- 2. Insert the 4 plans and the 5 workshops. Always list the columns.
--
-- 3. A good table refuses bad rows. Put the comment  -- expect error  on its own line directly
--    above each of these two statements:
--      - an INSERT into plan that gives no name
--      - an INSERT into plan whose monthly_fee_cents is the text 'ten euros'
--
-- 4. What does a table WITHOUT strict typing do? Create a TEMP table:
--      CREATE TEMP TABLE affinity_demo (n INTEGER);
--    insert the values '42', 'abc' and 4.5 (three rows), then
--      SELECT n AS value, typeof(n) AS stored_as FROM affinity_demo;
`,
      solutionAdd: sql`CREATE TABLE plan (
  id                INTEGER PRIMARY KEY,
  name              TEXT    NOT NULL,
  monthly_fee_cents INTEGER NOT NULL DEFAULT 0,
  included_minutes  INTEGER NOT NULL DEFAULT 0,
  active            INTEGER NOT NULL DEFAULT 1
) STRICT;

CREATE TABLE workshop (
  code     TEXT    PRIMARY KEY,
  name     TEXT    NOT NULL,
  floor_m2 REAL,
  capacity INTEGER NOT NULL DEFAULT 6
) STRICT;

INSERT INTO plan (name, monthly_fee_cents, included_minutes) VALUES
  ('Drop-in', 0, 0),
  ('Casual', 2500, 240),
  ('Maker', 4500, 600),
  ('Studio', 8500, 1800);

INSERT INTO workshop (code, name, floor_m2, capacity) VALUES
  ('WOOD', 'Woodshop', 68.5, 8),
  ('METL', 'Metal Bay', 54, 6),
  ('FAB', 'Fab Lab', 72.25, 10);
INSERT INTO workshop (code, name, floor_m2) VALUES
  ('TEXT', 'Textile Loft', 41),
  ('CLAY', 'Clay Room', 38.5);

-- expect error
INSERT INTO plan (monthly_fee_cents) VALUES (1000);

-- expect error
INSERT INTO plan (name, monthly_fee_cents) VALUES ('Weekend', 'ten euros');

-- What a table WITHOUT strict typing does with the same kind of value
CREATE TEMP TABLE affinity_demo (n INTEGER);
INSERT INTO affinity_demo VALUES ('42'), ('abc'), (4.5);
SELECT n AS value, typeof(n) AS stored_as FROM affinity_demo;`,
      explanation:
        "STRICT makes the declared types real: the 'ten euros' insert is refused with a message naming the column, while the non-strict temp table quietly keeps '42' as the integer 42 and 'abc' as text. NOT NULL turned the missing name away, and DEFAULT filled in the capacity and the fee when the INSERT left them out. Money is whole cents so it never drifts.",
      hints: [
        { id: "h1", title: "Table skeleton", content: "CREATE TABLE plan (id INTEGER PRIMARY KEY, name TEXT NOT NULL, monthly_fee_cents INTEGER NOT NULL DEFAULT 0, included_minutes INTEGER NOT NULL DEFAULT 0, active INTEGER NOT NULL DEFAULT 1) STRICT;  The word STRICT goes after the closing parenthesis." },
        { id: "h2", title: "Letting defaults work", content: "A column you leave out of the INSERT's column list gets its DEFAULT. Insert TEXT and CLAY with INSERT INTO workshop (code, name, floor_m2) VALUES (...) so capacity becomes 6." },
        { id: "h3", title: "Where the marker goes", content: "The line  -- expect error  must be directly above the statement it is about (blank lines are fine, other statements in between are not). A refusal is then printed as REJECTED, as expected." },
      ],
      tests: [
        {
          id: "t1",
          description: "plan is a STRICT table with the right columns, NOT NULLs and defaults",
          assertionCode: t`assert(exists("plan"), "Create the table plan");
const spec = { id: "INTEGER", name: "TEXT", monthly_fee_cents: "INTEGER", included_minutes: "INTEGER", active: "INTEGER" };
for (const [c, ty] of Object.entries(spec)) {
  const k = col("plan", c);
  assert(k, "plan needs a column called " + c);
  assertEqual(String(k.type).toUpperCase(), ty, "Type of plan." + c);
}
assert(col("plan", "id").pk === 1, "plan.id should be the PRIMARY KEY");
assert(col("plan", "name").notnull === 1, "plan.name must be NOT NULL");
assert(col("plan", "monthly_fee_cents").notnull === 1 && String(col("plan", "monthly_fee_cents").dflt_value) === "0", "plan.monthly_fee_cents: NOT NULL DEFAULT 0");
assert(col("plan", "included_minutes").notnull === 1 && String(col("plan", "included_minutes").dflt_value) === "0", "plan.included_minutes: NOT NULL DEFAULT 0");
assert(col("plan", "active").notnull === 1 && String(col("plan", "active").dflt_value) === "1", "plan.active: NOT NULL DEFAULT 1");
const tl = all("PRAGMA table_list").find((r) => r.name === "plan");
assert(tl && tl.strict === 1, "Add STRICT after the closing parenthesis of CREATE TABLE plan");`,
        },
        {
          id: "t2",
          description: "workshop is a STRICT table keyed by a text code",
          assertionCode: t`assert(exists("workshop"), "Create the table workshop");
const spec = { code: "TEXT", name: "TEXT", floor_m2: "REAL", capacity: "INTEGER" };
for (const [c, ty] of Object.entries(spec)) {
  const k = col("workshop", c);
  assert(k, "workshop needs a column called " + c);
  assertEqual(String(k.type).toUpperCase(), ty, "Type of workshop." + c);
}
assert(col("workshop", "code").pk === 1, "workshop.code should be the PRIMARY KEY");
assert(col("workshop", "name").notnull === 1, "workshop.name must be NOT NULL");
assert(col("workshop", "floor_m2").notnull === 0, "workshop.floor_m2 may be unknown: leave it nullable");
assert(col("workshop", "capacity").notnull === 1 && String(col("workshop", "capacity").dflt_value) === "6", "workshop.capacity: NOT NULL DEFAULT 6");
const tl = all("PRAGMA table_list").find((r) => r.name === "workshop");
assert(tl && tl.strict === 1, "Add STRICT to CREATE TABLE workshop");`,
        },
        {
          id: "t3",
          description: "The four plans and five workshops are loaded (defaults used where asked)",
          assertionCode: t`const pl = all("SELECT name, monthly_fee_cents, included_minutes, active FROM plan ORDER BY id");
assertEqual(pl.map((p) => p.name), ["Drop-in", "Casual", "Maker", "Studio"], "Plans, in the order given");
assertEqual(pl.map((p) => p.monthly_fee_cents), [0, 2500, 4500, 8500], "monthly_fee_cents");
assertEqual(pl.map((p) => p.included_minutes), [0, 240, 600, 1800], "included_minutes");
assert(pl.every((p) => p.active === 1), "active should default to 1");
const shops = all("SELECT code, name, floor_m2, capacity FROM workshop ORDER BY code");
assertEqual(shops.map((s) => s.code), ["CLAY", "FAB", "METL", "TEXT", "WOOD"], "Workshop codes");
const by = Object.fromEntries(shops.map((s) => [s.code, s]));
assertEqual([by.WOOD.capacity, by.METL.capacity, by.FAB.capacity], [8, 6, 10], "Capacities of WOOD, METL, FAB");
assert(by.TEXT.capacity === 6 && by.CLAY.capacity === 6, "TEXT and CLAY should get capacity 6 from the DEFAULT");
assert(by.FAB.floor_m2 === 72.25 && by.CLAY.floor_m2 === 38.5, "floor_m2 values");`,
        },
        {
          id: "t4",
          description: "Two bad plan rows were refused for the right reasons",
          assertionCode: t`assert(accepted().length === 0, "One of your -- expect error statements was accepted by the database: it should have been refused");
assert(refused(/NOT NULL constraint failed: plan\.name/).length >= 1, "Mark an INSERT into plan without a name with -- expect error: it should be refused with NOT NULL constraint failed: plan.name");
assert(refused(/cannot store TEXT value in INTEGER column plan\./).length >= 1, "Mark an INSERT of the text 'ten euros' into plan.monthly_fee_cents with -- expect error");
assert(probe("INSERT INTO plan (name) VALUES (NULL)"), "plan.name must refuse NULL");
assert(probe("INSERT INTO plan (name, active) VALUES ('X', 'yes')"), "STRICT should refuse the text 'yes' in an INTEGER column");`,
        },
        {
          id: "t5",
          description: "The temp table shows what a non-strict column keeps",
          assertionCode: t`const rs = data(["value", "stored_as"], "Add: SELECT n AS value, typeof(n) AS stored_as FROM affinity_demo", /affinity_demo/);
assertEqual(rs.length, 3, "Rows in the affinity demo");
assertEqual(rs.map((r) => String(r.value) + ":" + r.stored_as), ["42:integer", "abc:text", "4.5:real"], "What each value was stored as");`,
        },
      ],
      unlocks: ["ss-tables", "ss-firewall"],
      checks: [
        {
          prompt: "In a non-strict `INTEGER` column, what does SQLite do with the text `'abc'`?",
          question: {
            type: "choice",
            options: ["Rejects it with an error", "Converts it to 0", "Stores it as text and says nothing"],
            answer: 2,
          },
          explanation: "A type name only gives the column an affinity: SQLite tries to convert a value (so '42' becomes 42) and keeps it as it is when it can't (so 'abc' stays text). STRICT turns the preference into a rule.",
        },
        {
          prompt: "A tool costs 18.50 an hour. Which column definition is the safest for storing the price?",
          question: {
            type: "choice",
            options: ["hourly_rate REAL", "hourly_rate_cents INTEGER", "hourly_rate TEXT"],
            answer: 1,
          },
          explanation: "Whole cents (1850) are exact integers: addition never drifts and two prices compare reliably. REAL is binary floating point, where 0.1 + 0.2 is not exactly 0.3.",
        },
      ],
    },

    // ───────────────────────────── 3 ─────────────────────────────
    {
      id: "schema-studio-3-keys",
      title: "Keys and uniqueness",
      minutes: 24,
      xp: 120,
      concepts: ["primary key", "natural vs surrogate keys", "UNIQUE", "unique indexes", "case-sensitive uniqueness"],
      learn: md`### What makes a row *that* row?

A **primary key** is the column (or columns) that identifies one row for the rest of its life. Everything else in the database refers to a row by its key, so a key has to be **unique, never NULL, and never change**.

There are two schools, and a good designer uses both on purpose.

**Natural keys** come from the real world: a workshop's short code \`WOOD\`, a tool's asset tag \`WD-01\`, an ISBN. They are readable (a booking that says \`WOOD\` explains itself) and they cost no extra column. But the real world edits itself: tags get re-stickered, companies rename codes. A key that *must never change* but *can* is a time bomb, because every row that refers to it must change in step.

**Surrogate keys** are invented by the database: an integer that means nothing. It never changes, because nobody has a reason to touch it. The cost is that it tells a human nothing, and that you must still protect the real-world uniqueness separately.

Rule of thumb used in this project:

- A short, stable, human-meaningful code that the business itself owns (\`workshop.code\`) can be the key.
- Anything that describes a **person or a changeable thing** (\`member\`, \`tool\`) gets a surrogate \`id\`, and its natural identifiers (\`email\`, \`asset_tag\`) become **UNIQUE** columns. Those are called *alternate keys*: also unique, just not the one other tables point at.

### INTEGER PRIMARY KEY is special in SQLite

A column declared exactly \`INTEGER PRIMARY KEY\` becomes an alias for SQLite's internal row number (\`rowid\`). Leave it out of an \`INSERT\` and the database assigns the next free number. It is the fastest possible lookup, because the key *is* the row's address. Two details worth knowing:

- Without \`AUTOINCREMENT\`, SQLite may **reuse** the id of the most recently deleted row. If an old id is stored somewhere outside the database (an e-mail, a PDF receipt) it can end up pointing at a different row. \`AUTOINCREMENT\` prevents reuse at a small bookkeeping cost.
- The type must be spelled exactly \`INTEGER\`. \`INT PRIMARY KEY\` is an ordinary column with a unique index, not the fast alias.

### UNIQUE

\`UNIQUE\` says "no two rows may have the same value here". It is enforced with an index, which is why creating one is the same as creating an index (a theme of lesson 8). Three things catch people out:

1. **\`NULL\` is never equal to \`NULL\`**, so a nullable \`UNIQUE\` column may contain many NULLs. If a value is required, say so with \`NOT NULL\` as well.
2. **Text uniqueness is case-sensitive by default.** \`'Odile.Mercer@mail.example'\` and \`'odile.mercer@mail.example'\` are different strings, so both are accepted. You will fix that properly with an expression index in lesson 9; for now you will *see* it happen.
3. You can add a unique rule to an existing table without rebuilding it, because it is just an index: \`CREATE UNIQUE INDEX plan_name_uq ON plan (name);\`

### Reading the errors

- \`UNIQUE constraint failed: member.email\`: a second row with that e-mail. The message names table and column, and for a multi-column unique constraint lists them all.
- \`NOT NULL constraint failed: member.email\`: the key was missing.
- If a unique index already has to hold two equal values when you *create* it, creating it fails. Clean the data first.

### A forward reference

The \`member\` table below has a column \`plan_id INTEGER REFERENCES plan (id)\`. That clause declares a **foreign key**. It reads naturally, and it is the right shape, but lesson 5 will show you something surprising about whether SQLite is actually enforcing it right now.

### Common mistakes

- Using an e-mail address as a primary key. People change addresses; every row that points at them has to follow.
- Adding a surrogate \`id\` and forgetting to declare the natural identifier \`UNIQUE\`. Now the same person can exist five times with five ids.
- Believing \`UNIQUE\` on a text column ignores case or surrounding spaces. It does not.`,
      mission: md`Plans and workshops exist; now the people. Create **\`member\`** (a \`STRICT\` table):

- \`id\`: surrogate key, \`INTEGER PRIMARY KEY\`
- \`email\`: required and unique
- \`badge_no\`: the number on their door card, required and unique
- \`full_name\`: required
- \`phone\`: may be missing
- \`plan_id\`: which plan they are on, \`INTEGER REFERENCES plan (id)\`
- \`joined_on\`: required, defaults to today's date: \`DEFAULT (date('now'))\`

Also make plan names unique with a separate unique index called \`plan_name_uq\` (the table already exists, so use \`CREATE UNIQUE INDEX\`).

The two founders are the first members. Look the plan up by name instead of typing its number:

- **Odile Mercer**, \`odile.mercer@mail.example\`, badge \`B-1001\`, phone \`555-0101\`, plan Studio, joined \`2024-03-01\`
- **Kofi Adeyemi**, \`kofi.adeyemi@mail.example\`, badge \`B-1002\`, phone \`555-0102\`, plan Maker, joined \`2024-03-01\`

Then prove the keys work, and discover what they do **not** catch.`,
      tasks: [
        "Create the STRICT table member and the unique index plan_name_uq on plan(name)",
        "Insert the two founders, finding plan_id with a subquery on the plan name",
        "Three statements marked -- expect error: a duplicate e-mail, a NULL e-mail, and a second plan called 'Maker'",
        "Insert 'ODILE.MERCER@mail.example' with badge B-2003 (it gets through!), SELECT COUNT(*) AS members_now, delete that badge, then SELECT COUNT(*) AS members_after",
      ],
      starterAdd: sql`-- ── ✏️ YOUR TURN ───────────────────────────
-- Lesson 3: keys and uniqueness.
--
-- 1. CREATE TABLE member (...) STRICT as described in the mission:
--    id INTEGER PRIMARY KEY, email and badge_no NOT NULL UNIQUE, full_name NOT NULL,
--    phone, plan_id INTEGER REFERENCES plan (id), joined_on NOT NULL DEFAULT (date('now')).
--    Then: CREATE UNIQUE INDEX plan_name_uq ON plan (name);
--
-- 2. Insert Odile Mercer (Studio) and Kofi Adeyemi (Maker) with their details from the mission.
--    plan_id: (SELECT id FROM plan WHERE name = 'Studio')  -- no magic numbers
--
-- 3. Three statements, each with  -- expect error  directly above it:
--    - a second member with Odile's e-mail          -> UNIQUE
--    - a member whose e-mail is NULL                -> NOT NULL
--    - a second plan named 'Maker'                  -> UNIQUE (the index you just made)
--
-- 4. Case sensitivity. Insert a member with e-mail 'ODILE.MERCER@mail.example', badge 'B-2003',
--    name 'Imposter Two' (NOT marked expect error: it will be accepted).
--    Then   SELECT COUNT(*) AS members_now FROM member;
--    delete that badge, and   SELECT COUNT(*) AS members_after FROM member;
`,
      solutionAdd: sql`CREATE TABLE member (
  id        INTEGER PRIMARY KEY,
  email     TEXT NOT NULL UNIQUE,
  badge_no  TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  phone     TEXT,
  plan_id   INTEGER REFERENCES plan (id),
  joined_on TEXT NOT NULL DEFAULT (date('now'))
) STRICT;

CREATE UNIQUE INDEX plan_name_uq ON plan (name);

INSERT INTO member (email, badge_no, full_name, phone, plan_id, joined_on) VALUES
  ('odile.mercer@mail.example', 'B-1001', 'Odile Mercer', '555-0101', (SELECT id FROM plan WHERE name = 'Studio'), '2024-03-01'),
  ('kofi.adeyemi@mail.example', 'B-1002', 'Kofi Adeyemi', '555-0102', (SELECT id FROM plan WHERE name = 'Maker'), '2024-03-01');

-- expect error
INSERT INTO member (email, badge_no, full_name) VALUES ('odile.mercer@mail.example', 'B-2001', 'Imposter One');

-- expect error
INSERT INTO member (email, badge_no, full_name) VALUES (NULL, 'B-2002', 'No Address');

-- expect error
INSERT INTO plan (name) VALUES ('Maker');

-- UNIQUE compares bytes: a differently capitalised e-mail is accepted
INSERT INTO member (email, badge_no, full_name) VALUES ('ODILE.MERCER@mail.example', 'B-2003', 'Imposter Two');
SELECT COUNT(*) AS members_now FROM member;
DELETE FROM member WHERE badge_no = 'B-2003';
SELECT COUNT(*) AS members_after FROM member;`,
      explanation:
        "The surrogate id identifies the row; email and badge_no are alternate keys protected by UNIQUE, and the unique index does the same for plan names on a table that already existed. The duplicate and NULL inserts are turned away, but the upper-case copy of Odile's address is accepted, because UNIQUE compares text byte for byte. You deleted the impostor, and lesson 9 will close the gap for good with an expression index.",
      hints: [
        { id: "h1", title: "Required and unique", content: "A required unique column is written  email TEXT NOT NULL UNIQUE. UNIQUE alone would still allow many NULLs." },
        { id: "h2", title: "Look the plan up", content: "INSERT INTO member (...) VALUES (..., (SELECT id FROM plan WHERE name = 'Studio'), ...)  A scalar subquery works anywhere a value does." },
        { id: "h3", title: "Both counts", content: "The two SELECT COUNT(*) queries must use the aliases members_now and members_after. The first returns 3 (the impostor got in), the second 2." },
      ],
      tests: [
        {
          id: "t1",
          description: "member is a STRICT table with a surrogate key and the right NOT NULLs",
          assertionCode: t`assert(exists("member"), "Create the table member");
const spec = { id: "INTEGER", email: "TEXT", badge_no: "TEXT", full_name: "TEXT", phone: "TEXT", plan_id: "INTEGER", joined_on: "TEXT" };
for (const [c, ty] of Object.entries(spec)) {
  const k = col("member", c);
  assert(k, "member needs a column called " + c);
  assertEqual(String(k.type).toUpperCase(), ty, "Type of member." + c);
}
assert(col("member", "id").pk === 1, "member.id should be the PRIMARY KEY");
for (const c of ["email", "badge_no", "full_name", "joined_on"]) assert(col("member", c).notnull === 1, "member." + c + " must be NOT NULL");
assert(col("member", "phone").notnull === 0, "member.phone may be missing");
assert(/date\(\s*'now'\s*\)/i.test(String(col("member", "joined_on").dflt_value)), "member.joined_on should DEFAULT (date('now'))");
const tl = all("PRAGMA table_list").find((r) => r.name === "member");
assert(tl && tl.strict === 1, "Add STRICT to CREATE TABLE member");`,
        },
        {
          id: "t2",
          description: "Duplicate e-mails, duplicate badges and duplicate plan names are all refused",
          assertionCode: t`const base = "INSERT INTO member (email, badge_no, full_name) VALUES ";
assert(/UNIQUE/.test(probe(base + "('odile.mercer@mail.example', 'B-7771', 'Copy')") || ""), "A second member with the same e-mail must be refused (UNIQUE)");
assert(/UNIQUE/.test(probe(base + "('someone.new@mail.example', 'B-1001', 'Copy')") || ""), "A second member with the same badge number must be refused (UNIQUE)");
assert(/NOT NULL/.test(probe(base + "(NULL, 'B-7772', 'Copy')") || ""), "A member without an e-mail must be refused (NOT NULL)");
assert(/UNIQUE/.test(probe("INSERT INTO plan (name) VALUES ('Maker')") || ""), "Two plans may not share a name: create the unique index plan_name_uq");
assert(exists("plan_name_uq"), "The unique index should be called plan_name_uq");`,
        },
        {
          id: "t3",
          description: "The two founders are in, on the right plans",
          assertionCode: t`const got = all("SELECT m.email, m.badge_no, m.full_name, m.phone, p.name AS plan, m.joined_on FROM member m LEFT JOIN plan p ON p.id = m.plan_id ORDER BY m.id");
assertEqual(got.length, 2, "Members after this lesson");
assertEqual(got[0], { email: "odile.mercer@mail.example", badge_no: "B-1001", full_name: "Odile Mercer", phone: "555-0101", plan: "Studio", joined_on: "2024-03-01" }, "First founder");
assertEqual(got[1], { email: "kofi.adeyemi@mail.example", badge_no: "B-1002", full_name: "Kofi Adeyemi", phone: "555-0102", plan: "Maker", joined_on: "2024-03-01" }, "Second founder");`,
        },
        {
          id: "t4",
          description: "Three refusals were recorded: UNIQUE on e-mail, NOT NULL, UNIQUE on plan name",
          assertionCode: t`assert(accepted().length === 0, "One of your -- expect error statements was accepted: it should have been refused");
assert(refused(/UNIQUE constraint failed: member\.email/).length >= 1, "Mark a duplicate-e-mail INSERT with -- expect error");
assert(refused(/NOT NULL constraint failed: member\.email/).length >= 1, "Mark an INSERT with a NULL e-mail with -- expect error");
assert(refused(/UNIQUE constraint failed: plan\.name/).length >= 1, "Mark the second 'Maker' plan with -- expect error");`,
        },
        {
          id: "t5",
          description: "You showed that UNIQUE is case-sensitive, then cleaned up",
          assertionCode: t`const a = data(["members_now"], "Add SELECT COUNT(*) AS members_now FROM member after inserting the upper-case copy")[0];
const b = data(["members_after"], "Add SELECT COUNT(*) AS members_after FROM member after deleting the copy")[0];
assertEqual(a.members_now, 3, "members_now (the upper-case copy should have got in)");
assertEqual(b.members_after, 2, "members_after");
assertEqual(num("SELECT COUNT(*) FROM member"), 2, "Members left at the end: delete the impostor again");`,
        },
      ],
      unlocks: ["ss-keys"],
      checks: [
        {
          prompt: "Why is `email` a poor primary key for `member`, even though it is unique?",
          question: {
            type: "choice",
            options: [
              "E-mail addresses are too long to index",
              "Primary keys must be numbers",
              "People change their address, and every row that points at the member would have to change with it",
            ],
            answer: 2,
          },
          explanation: "A key is what other rows point at, so it must never change. Keep the e-mail UNIQUE as an alternate key, and let a meaningless integer id be the thing that other tables reference.",
        },
        {
          prompt: "A column is declared `badge_no TEXT UNIQUE` (no NOT NULL). How many rows can have `badge_no` equal to NULL?",
          question: { type: "choice", options: ["Only one", "Any number: NULL is never equal to NULL", "None"], answer: 1 },
          explanation: "UNIQUE compares values, and NULL is 'unknown', which is never equal to another unknown. If a value is required, add NOT NULL; UNIQUE alone does not forbid missing values.",
        },
      ],
    },

    // ───────────────────────────── 4 ─────────────────────────────
    {
      id: "schema-studio-4-rules",
      title: "Business rules with CHECK",
      minutes: 24,
      xp: 120,
      concepts: ["CHECK constraints", "named constraints", "NULL passes a CHECK", "ADD COLUMN with a rule", "what CHECK cannot do"],
      learn: md`### Rules that look at the values

\`NOT NULL\`, types and uniqueness cover structure. Plenty of rules are about the *values themselves*: a price is not negative, a status is one of four words, a session is between half an hour and eight hours. That is what \`CHECK\` is for.

~~~sql
hourly_rate_cents INTEGER NOT NULL CHECK (hourly_rate_cents >= 0)
~~~

The expression is evaluated for each row you insert or update. If it is **false**, the write is refused.

### The NULL trap

A CHECK refuses a row only when the expression is **false**. When it evaluates to **NULL** (unknown) the row passes. So \`CHECK (n > 0)\` happily accepts a NULL \`n\`, because \`NULL > 0\` is NULL, not false. The cure is a separate \`NOT NULL\`. You will see this happen on a throwaway table at the end of the lesson. It is the number one reason a "validated" column turns out to contain garbage.

### Column rules and table rules

A rule about one column can sit on the column. A rule that compares **several columns of the same row** belongs at the end of the table, as a *table constraint*:

~~~sql
CHECK (closed_at IS NULL OR closed_at >= opened_at)
~~~

### Give your rules names

~~~sql
hourly_rate_cents INTEGER NOT NULL
  CONSTRAINT rate_not_negative CHECK (hourly_rate_cents >= 0)
~~~

An unnamed rule fails with \`CHECK constraint failed: hourly_rate_cents >= 0\`; a named one with \`CHECK constraint failed: rate_not_negative\`. Names turn error messages into documentation: they show up in logs, in the Studio's firewall panel, and in the bug report from someone who has never seen your schema.

### Typical tools

- **Ranges:** \`BETWEEN 30 AND 480\` (both ends included).
- **Sets:** \`status IN ('ready', 'repair', 'retired')\`. Handy and readable. If the list changes often or carries data of its own (a label, a colour), use a lookup table and a foreign key instead (lesson 5).
- **Flags:** \`needs_induction IN (0, 1)\`. SQLite has no boolean, so the constraint *is* the boolean.
- **Arithmetic:** \`max_session_minutes % 30 = 0\` keeps sessions on the half hour. This will matter a lot in the last lesson.

### What a CHECK cannot do

It sees **only the row being written**. It cannot look at another table ("this member must be active"), run a subquery, or count other rows ("at most three open tickets"). Those rules need a foreign key, a unique index, or a trigger (lessons 5, 9 and 11).

### Adding rules to a table that already exists

SQLite's \`ALTER TABLE\` is deliberately small. You **can** add a new column, with its own CHECK:

~~~sql
ALTER TABLE member ADD COLUMN status TEXT NOT NULL DEFAULT 'active'
  CONSTRAINT member_status_known CHECK (status IN ('active', 'paused', 'closed'));
~~~

(A new \`NOT NULL\` column needs a \`DEFAULT\`, otherwise the existing rows would have nothing to hold.) You **cannot** add a CHECK to a column that already exists, nor drop one. That takes a table rebuild, which is the subject of lesson 15. Another reason to get the rules into the first \`CREATE TABLE\`.

### Reading the errors

\`CHECK constraint failed: rate_not_negative\` names the rule. For an unnamed one SQLite prints the expression text instead. Either way the whole statement is rolled back, including rows earlier in the same multi-row \`INSERT\`.

### Common mistakes

- Relying on a CHECK to stop NULL (it will not).
- Hard-coding a list in a CHECK that business people edit weekly.
- Putting a rule in the application only. Then the import script, the admin console and the next developer all get to break it.`,
      mission: md`Now the tools. The founders' rules, from the brief and from years of arguments:

- Every tool has an **asset tag** (unique), a **name**, and lives in a **workshop** (\`workshop_code\`, which will point at \`workshop.code\`).
- The **hourly rate** is in cents and can never be negative.
- A **session** on a tool lasts from 30 minutes to 8 hours (480), always a whole number of **half hours**. \`max_session_minutes\` is the longest booking allowed; default 120.
- \`needs_induction\` is a yes/no flag, default 0.
- A tool's **status** is \`ready\`, \`repair\` or \`retired\`, default \`ready\`.

Create **\`tool\`** (\`STRICT\`) with those rules as named \`CHECK\` constraints, then give members a **status** too: \`active\`, \`paused\` or \`closed\`, default \`active\`, added to the existing table with \`ALTER TABLE\`.

Load three tools: **WD-01** Table saw (WOOD, 1800 cents/h, needs induction), **FB-02** 3D printer (FAB, 600), **CL-01** Pottery wheel (CLAY, 400). The rest arrive from the spreadsheet in lesson 6.

Finally, try to break every rule, and see the NULL trap for yourself.`,
      tasks: [
        "Create the STRICT table tool with a unique asset_tag, workshop_code, and named CHECKs for rate, session length, half-hour sessions, the induction flag and status",
        "ALTER TABLE member to add a status column with its own named CHECK",
        "Insert the three tools, then four statements marked -- expect error: a negative rate, status 'haunted', a 50-minute session limit, and member status 'banned'",
        "Create a TEMP table null_demo (n INTEGER CHECK (n > 0)), insert a NULL, and SELECT COUNT(*) AS rows_that_passed",
      ],
      starterAdd: sql`-- ── ✏️ YOUR TURN ───────────────────────────
-- Lesson 4: business rules with CHECK.
--
-- 1. CREATE TABLE tool (...) STRICT:
--      id INTEGER PRIMARY KEY
--      asset_tag TEXT NOT NULL UNIQUE
--      name TEXT NOT NULL
--      workshop_code TEXT NOT NULL REFERENCES workshop (code)
--      hourly_rate_cents INTEGER NOT NULL, never negative
--      max_session_minutes INTEGER NOT NULL DEFAULT 120, from 30 to 480, a multiple of 30
--      needs_induction INTEGER NOT NULL DEFAULT 0, only 0 or 1
--      status TEXT NOT NULL DEFAULT 'ready', one of ready / repair / retired
--    Give each rule a name:  CONSTRAINT rate_not_negative CHECK (...)
--    A rule that is about one column can sit on the column; the half-hour rule can be a table constraint.
--
-- 2. ALTER TABLE member ADD COLUMN status ... DEFAULT 'active' with a CHECK (active / paused / closed).
--
-- 3. Insert WD-01 Table saw (WOOD, 1800, needs induction), FB-02 3D printer (FAB, 600),
--    CL-01 Pottery wheel (CLAY, 400).
--
-- 4. Four statements, each with  -- expect error  directly above:
--      a tool with hourly_rate_cents = -500
--      a tool with status 'haunted'
--      a tool with max_session_minutes = 50
--      UPDATE member SET status = 'banned' WHERE badge_no = 'B-1001'
--
-- 5. The NULL trap:
--      CREATE TEMP TABLE null_demo (n INTEGER CHECK (n > 0));
--      INSERT INTO null_demo VALUES (NULL);
--      SELECT COUNT(*) AS rows_that_passed FROM null_demo;
`,
      solutionAdd: sql`CREATE TABLE tool (
  id                  INTEGER PRIMARY KEY,
  asset_tag           TEXT    NOT NULL UNIQUE,
  name                TEXT    NOT NULL,
  workshop_code       TEXT    NOT NULL REFERENCES workshop (code),
  hourly_rate_cents   INTEGER NOT NULL CONSTRAINT rate_not_negative CHECK (hourly_rate_cents >= 0),
  max_session_minutes INTEGER NOT NULL DEFAULT 120 CONSTRAINT session_length_sane CHECK (max_session_minutes BETWEEN 30 AND 480),
  needs_induction     INTEGER NOT NULL DEFAULT 0 CONSTRAINT induction_is_flag CHECK (needs_induction IN (0, 1)),
  status              TEXT    NOT NULL DEFAULT 'ready' CONSTRAINT tool_status_known CHECK (status IN ('ready', 'repair', 'retired')),
  CONSTRAINT slots_of_half_hour CHECK (max_session_minutes % 30 = 0)
) STRICT;

ALTER TABLE member ADD COLUMN status TEXT NOT NULL DEFAULT 'active'
  CONSTRAINT member_status_known CHECK (status IN ('active', 'paused', 'closed'));

INSERT INTO tool (asset_tag, name, workshop_code, hourly_rate_cents, needs_induction) VALUES
  ('WD-01', 'Table saw', 'WOOD', 1800, 1),
  ('FB-02', '3D printer', 'FAB', 600, 0),
  ('CL-01', 'Pottery wheel', 'CLAY', 400, 0);

-- expect error
INSERT INTO tool (asset_tag, name, workshop_code, hourly_rate_cents) VALUES ('XX-01', 'Free money machine', 'FAB', -500);

-- expect error
INSERT INTO tool (asset_tag, name, workshop_code, hourly_rate_cents, status) VALUES ('XX-02', 'Mystery box', 'FAB', 500, 'haunted');

-- expect error
INSERT INTO tool (asset_tag, name, workshop_code, hourly_rate_cents, max_session_minutes) VALUES ('XX-03', 'Odd slot', 'FAB', 500, 50);

-- expect error
UPDATE member SET status = 'banned' WHERE badge_no = 'B-1001';

-- A CHECK that sees NULL does not fail
CREATE TEMP TABLE null_demo (n INTEGER CHECK (n > 0));
INSERT INTO null_demo VALUES (NULL);
SELECT COUNT(*) AS rows_that_passed FROM null_demo;`,
      explanation:
        "Each rule is a named CHECK, so the refusals read 'rate_not_negative' or 'slots_of_half_hour' instead of a bare expression. The half-hour rule is a table constraint because it names a column on its own row, and the member status rule arrived through ALTER TABLE ADD COLUMN, the only way SQLite lets you add a rule to an existing table. The NULL demo shows why NOT NULL has to sit next to any CHECK that must not let a missing value through.",
      hints: [
        { id: "h1", title: "Column constraint, named", content: "hourly_rate_cents INTEGER NOT NULL CONSTRAINT rate_not_negative CHECK (hourly_rate_cents >= 0)  The CONSTRAINT name comes right before the CHECK it names." },
        { id: "h2", title: "Half hours", content: "max_session_minutes % 30 = 0 is true for 30, 60, 90... and false for 50. Put it in a table constraint at the end of the column list: CONSTRAINT slots_of_half_hour CHECK (max_session_minutes % 30 = 0)." },
        { id: "h3", title: "ALTER with a rule", content: "ALTER TABLE member ADD COLUMN status TEXT NOT NULL DEFAULT 'active' CONSTRAINT member_status_known CHECK (status IN ('active', 'paused', 'closed'));  The DEFAULT is required for a new NOT NULL column." },
      ],
      tests: [
        {
          id: "t1",
          description: "tool is a STRICT table with the right columns, keys and defaults",
          assertionCode: t`assert(exists("tool"), "Create the table tool");
const spec = { id: "INTEGER", asset_tag: "TEXT", name: "TEXT", workshop_code: "TEXT", hourly_rate_cents: "INTEGER", max_session_minutes: "INTEGER", needs_induction: "INTEGER", status: "TEXT" };
for (const [c, ty] of Object.entries(spec)) {
  const k = col("tool", c);
  assert(k, "tool needs a column called " + c);
  assertEqual(String(k.type).toUpperCase(), ty, "Type of tool." + c);
  if (c !== "id") assert(k.notnull === 1, "tool." + c + " must be NOT NULL");
}
assert(col("tool", "id").pk === 1, "tool.id should be the PRIMARY KEY");
assertEqual(String(col("tool", "max_session_minutes").dflt_value), "120", "Default of max_session_minutes");
assertEqual(String(col("tool", "needs_induction").dflt_value), "0", "Default of needs_induction");
assertEqual(String(col("tool", "status").dflt_value).replace(/'/g, ""), "ready", "Default of status");
assert(indexes("tool").some((i) => i.unique === 1 && indexCols(i.name).join() === "asset_tag"), "tool.asset_tag should be UNIQUE");
const tl = all("PRAGMA table_list").find((r) => r.name === "tool");
assert(tl && tl.strict === 1, "Add STRICT to CREATE TABLE tool");`,
        },
        {
          id: "t2",
          description: "Every business rule on tool refuses a row that breaks it",
          assertionCode: t`const base = (over) => {
  const row = Object.assign({ asset_tag: "PR-01", name: "Probe", workshop_code: "WOOD", hourly_rate_cents: 500 }, over);
  const cs = Object.keys(row);
  return "INSERT INTO tool (" + cs.join(", ") + ") VALUES (" + cs.map((c) => (typeof row[c] === "number" ? row[c] : "'" + row[c] + "'")).join(", ") + ")";
};
assert(probe(base({})) === null, "A normal tool row should be accepted");
const bad = [
  [{ hourly_rate_cents: -1 }, "a negative hourly rate"],
  [{ status: "haunted" }, "a status that is not ready / repair / retired"],
  [{ max_session_minutes: 50 }, "a session limit that is not a multiple of 30"],
  [{ max_session_minutes: 0 }, "a session limit of 0"],
  [{ max_session_minutes: 600 }, "a session limit above 8 hours"],
  [{ needs_induction: 2 }, "needs_induction = 2"],
];
for (const [over, what] of bad) {
  const err = probe(base(over));
  assert(err && /CHECK/.test(err), "tool should refuse " + what + " with a CHECK constraint" + (err ? " (got: " + err + ")" : " (it was accepted)"));
}
assert(/NOT NULL/.test(probe("INSERT INTO tool (asset_tag, name, workshop_code, hourly_rate_cents) VALUES ('PR-02', 'Probe', 'WOOD', NULL)") || ""), "A NULL rate must be refused (NOT NULL: a CHECK alone lets NULL through)");`,
        },
        {
          id: "t3",
          description: "member has a status column with its own rule",
          assertionCode: t`const k = col("member", "status");
assert(k, "ALTER TABLE member ADD COLUMN status ...");
assert(k.notnull === 1 && String(k.dflt_value).replace(/'/g, "") === "active", "member.status should be NOT NULL DEFAULT 'active'");
assert(all("SELECT status FROM member").every((r) => r.status === "active"), "Existing members should have become 'active'");
const err = probe("UPDATE member SET status = 'banned' WHERE id = 1");
assert(err && /CHECK/.test(err), "member.status should only allow active / paused / closed (CHECK)");
assert(probe("UPDATE member SET status = 'paused' WHERE id = 1") === null, "'paused' is a valid status");`,
        },
        {
          id: "t4",
          description: "The three tools are loaded and four bad rows were refused by CHECKs",
          assertionCode: t`const got = all("SELECT asset_tag, name, workshop_code, hourly_rate_cents, needs_induction, max_session_minutes, status FROM tool ORDER BY asset_tag");
assertEqual(got.map((r) => r.asset_tag), ["CL-01", "FB-02", "WD-01"], "Tools loaded");
const by = Object.fromEntries(got.map((r) => [r.asset_tag, r]));
assertEqual([by["WD-01"].hourly_rate_cents, by["FB-02"].hourly_rate_cents, by["CL-01"].hourly_rate_cents], [1800, 600, 400], "Hourly rates");
assert(by["WD-01"].needs_induction === 1 && by["FB-02"].needs_induction === 0, "Only the table saw needs an induction");
assert(got.every((r) => r.status === "ready" && r.max_session_minutes === 120), "Defaults: status ready, 120 minutes");
assert(accepted().length === 0, "One of your -- expect error statements was accepted: it should have been refused");
assert(refused(/CHECK constraint failed/).length >= 4, "Mark four rule-breaking statements with -- expect error (negative rate, status 'haunted', 50 minutes, member status 'banned')");`,
        },
        {
          id: "t5",
          description: "The NULL trap: a CHECK lets NULL through",
          assertionCode: t`const rs = data(["rows_that_passed"], "Add SELECT COUNT(*) AS rows_that_passed FROM null_demo", /null_demo/)[0];
assertEqual(rs.rows_that_passed, 1, "The NULL row should have passed the CHECK (n > 0), because NULL > 0 is NULL, not false");`,
        },
      ],
      unlocks: ["ss-checks"],
      checks: [
        {
          prompt: "`CHECK (rate >= 0)` is on a nullable column `rate`. What happens when you insert a row with `rate` = NULL?",
          question: { type: "choice", options: ["It is refused", "It is accepted", "It is stored as 0"], answer: 1 },
          explanation: "A CHECK only refuses a row when its expression is false. NULL >= 0 is NULL (unknown), and unknown passes. Add NOT NULL when a missing value must be refused.",
        },
        {
          prompt: "Which of these rules can a CHECK constraint **not** express?",
          question: {
            type: "choice",
            options: [
              "A tool's hourly rate is never negative",
              "A booking ends after it starts (two columns of the same row)",
              "A member may only book if their row in the member table says status = 'active'",
            ],
            answer: 2,
          },
          explanation: "CHECK sees only the row being written. A rule that needs to look at another table needs a foreign key, a unique index, or a trigger (you will use all three).",
        },
      ],
    },
  ],
};
