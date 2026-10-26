import type { Chapter } from "@/engine/types";
import { md, sql, t } from "./util.ts";

/**
 * Chapter 4: change without breaking.
 * Upserts and RETURNING, JSON and generated columns, expand-contract migrations, and a booking schema
 * that cannot collide.
 */
export const chapter4: Chapter = {
  id: "change-safely",
  title: "Change without breaking",
  blurb: "Write-or-update in one statement, flexible JSON, schema changes that never stop the app, and a booking schema that cannot collide.",
  lessons: [
    // ───────────────────────────── 13 ─────────────────────────────
    {
      id: "schema-studio-13-upsert",
      title: "Upserts and RETURNING",
      minutes: 24,
      xp: 140,
      concepts: ["INSERT ... ON CONFLICT DO UPDATE", "DO NOTHING", "excluded.", "RETURNING", "idempotent writes"],
      learn: md`### "Insert it, or update it if it's already there"

The obvious way to write that is two steps: look for the row, then insert or update depending on what you found. It has two problems. It is **racy**: two sessions can both see "not there" and both insert. And it is **chatty**: two statements where one will do.

SQLite (like Postgres) has the answer built in: an **upsert**.

~~~sql
INSERT INTO tool_day (tool_id, day, sessions, minutes)
VALUES (3, '2026-03-04', 2, 90)
ON CONFLICT (tool_id, day) DO UPDATE
  SET sessions = excluded.sessions,
      minutes  = excluded.minutes;
~~~

- \`ON CONFLICT (tool_id, day)\` names the unique key (primary key, unique constraint, or unique index) whose violation should be handled instead of raising an error.
- \`DO UPDATE SET ...\` runs against the **existing** row. There, a bare column name (\`sessions\`) is the existing row's value and \`excluded.sessions\` is the value you tried to insert.
- \`DO NOTHING\` simply skips the row.
- You can add a \`WHERE\` to \`DO UPDATE\`: it only updates when the condition is true, otherwise the existing row is left alone. "A newer date wins" is one \`WHERE\` away.

If the conflict is on a different key than the one you named, you still get the normal error. And the target must match a real unique index: otherwise SQLite says \`ON CONFLICT clause does not match any PRIMARY KEY or UNIQUE constraint\`.

### Two kinds of upsert

- **Set from the source** (\`SET minutes = excluded.minutes\`): run it twice and you get the same result. This is *idempotent*, and it is what you want for a rollup that a scheduled job might retry.
- **Accumulate** (\`SET minutes = minutes + excluded.minutes\`): run it twice and you double count. Right for counters that feed from an event stream, dangerous for anything that can be replayed.

### Not the same as INSERT OR REPLACE

\`INSERT OR REPLACE\` **deletes** the conflicting row and inserts a new one. That gives it a new rowid, wipes every column you did not mention, and can fire cascading deletes through foreign keys. Upsert updates in place. Prefer upsert.

(One parsing quirk: when the source is a \`SELECT\`, give it a \`WHERE\` clause, even \`WHERE true\`, or the parser cannot tell where \`ON CONFLICT\` begins. The nightly rollup below already has one.)

### RETURNING: get the rows back

~~~sql
INSERT INTO booking (member_id, tool_id, starts_at, ends_at)
VALUES (2, 4, '2026-04-01 10:00:00', '2026-04-01 11:00:00')
RETURNING id, status;
~~~

\`INSERT\`, \`UPDATE\` and \`DELETE\` can all end in \`RETURNING\`, which returns the rows the statement really wrote, including values you did not supply: the generated \`id\`, defaults like \`status = 'confirmed'\`. It replaces the fragile \`last_insert_rowid()\`, which is per connection and gets confused by triggers.

Two things to remember:

- It returns only rows that were **actually written**. An upsert that hit \`DO NOTHING\`, or a \`DO UPDATE ... WHERE\` whose condition was false, returns **nothing for that row**. That is useful information (it tells you the insert was a no-op) and a classic source of "why is my result empty?".
- It shows the row as the statement wrote it, before any trigger that fires afterwards changes it.

### Common mistakes

- Using accumulating upserts for jobs that can be retried.
- Upserting on columns that are not covered by a unique index.
- Expecting \`RETURNING\` to give a row back when the row was skipped.`,
      mission: md`Three jobs where "write or update" is the whole point.

**Nightly rollup.** Management wants a per-tool, per-day summary without scanning bookings all the time. Create **\`tool_day\`** (\`STRICT\`, \`WITHOUT ROWID\`): \`tool_id\` (required, references \`tool\`, cascade on delete), \`day\` (required text date), \`sessions\` and \`minutes\` (required whole numbers), primary key \`(tool_id, day)\`. Fill it from the completed bookings with an upsert that **sets** the values from the source, and run that same statement **twice**: the table must come out the same. Finish with \`SELECT COUNT(*) AS days_rolled_up, SUM(sessions) AS sessions, SUM(minutes) AS minutes FROM tool_day\`.

**Certificate renewals.** Three renewals arrive: Odile and the table saw on 2026-04-01 (newer than hers, so update); Kofi and the table saw on 2020-01-01 (older, so ignore); Kofi and the CNC router (FB-03) on 2026-04-01 (new pair, so insert). One upsert, updating only when the new date is **later**, ending in \`RETURNING member_id, tool_id, certified_on\`. Only two rows should come back.

**Get-or-create.** Try to register \`kofi.adeyemi@mail.example\` again as badge B-3000, "Kofi Again": \`ON CONFLICT (email) DO NOTHING RETURNING id\` (nothing comes back). Then register **Wren Calloway**, \`wren.calloway@mail.example\`, badge B-3001, plan Casual, the same way (\`RETURNING id, email\`).

**A booking with its id.** Book Kofi on the 3D printer (FB-02) on 2026-04-01 from 10:00 to 11:00 and \`RETURNING id, tool_id, starts_at, status\`.`,
      tasks: [
        "Create tool_day and fill it with an idempotent upsert (run it twice), then SELECT days_rolled_up, sessions, minutes",
        "Renewals: one INSERT ... ON CONFLICT (member_id, tool_id) DO UPDATE ... WHERE excluded.certified_on > certification.certified_on RETURNING member_id, tool_id, certified_on",
        "Get-or-create: 'Kofi Again' with DO NOTHING RETURNING id (zero rows), then Wren Calloway with RETURNING id, email",
        "A booking for Kofi on FB-02, 2026-04-01 10:00 to 11:00, RETURNING id, tool_id, starts_at, status",
      ],
      starterAdd: sql`-- ── ✏️ YOUR TURN ───────────────────────────
-- Lesson 13: upserts and RETURNING.
--
-- 1. CREATE TABLE tool_day (tool_id INTEGER NOT NULL REFERENCES tool (id) ON DELETE CASCADE, day TEXT NOT NULL,
--      sessions INTEGER NOT NULL, minutes INTEGER NOT NULL, PRIMARY KEY (tool_id, day)) STRICT, WITHOUT ROWID;
--    INSERT INTO tool_day (tool_id, day, sessions, minutes)
--    SELECT tool_id, date(starts_at), COUNT(*), SUM(minutes) FROM booking WHERE status = 'completed' GROUP BY tool_id, date(starts_at)
--    ON CONFLICT (tool_id, day) DO UPDATE SET sessions = excluded.sessions, minutes = excluded.minutes;
--    (minutes of a booking: (strftime('%s', ends_at) - strftime('%s', starts_at)) / 60.)  Run the same INSERT a second time.
--    Then:  SELECT COUNT(*) AS days_rolled_up, SUM(sessions) AS sessions, SUM(minutes) AS minutes FROM tool_day;
--
-- 2. Renewals (Odile/WD-01 2026-04-01, Kofi/WD-01 2020-01-01, Kofi/FB-03 2026-04-01) in one INSERT ... VALUES (...), (...), (...)
--    ON CONFLICT (member_id, tool_id) DO UPDATE SET certified_on = excluded.certified_on
--    WHERE excluded.certified_on > certification.certified_on RETURNING member_id, tool_id, certified_on;
--
-- 3. INSERT INTO member (email, badge_no, full_name, plan_id) VALUES ('kofi.adeyemi@mail.example', 'B-3000', 'Kofi Again', ...)
--      ON CONFLICT (email) DO NOTHING RETURNING id;
--    and the same for Wren Calloway (B-3001, Casual) with RETURNING id, email.
--
-- 4. INSERT INTO booking (...) VALUES (Kofi, FB-02, '2026-04-01 10:00:00', '2026-04-01 11:00:00') RETURNING id, tool_id, starts_at, status;
`,
      solutionAdd: sql`CREATE TABLE tool_day (
  tool_id  INTEGER NOT NULL REFERENCES tool (id) ON DELETE CASCADE,
  day      TEXT    NOT NULL,
  sessions INTEGER NOT NULL,
  minutes  INTEGER NOT NULL,
  PRIMARY KEY (tool_id, day)
) STRICT, WITHOUT ROWID;

-- The nightly rollup, safe to run twice
INSERT INTO tool_day (tool_id, day, sessions, minutes)
SELECT tool_id, date(starts_at), COUNT(*), SUM((strftime('%s', ends_at) - strftime('%s', starts_at)) / 60)
FROM booking
WHERE status = 'completed'
GROUP BY tool_id, date(starts_at)
ON CONFLICT (tool_id, day) DO UPDATE SET sessions = excluded.sessions, minutes = excluded.minutes;

INSERT INTO tool_day (tool_id, day, sessions, minutes)
SELECT tool_id, date(starts_at), COUNT(*), SUM((strftime('%s', ends_at) - strftime('%s', starts_at)) / 60)
FROM booking
WHERE status = 'completed'
GROUP BY tool_id, date(starts_at)
ON CONFLICT (tool_id, day) DO UPDATE SET sessions = excluded.sessions, minutes = excluded.minutes;

SELECT COUNT(*) AS days_rolled_up, SUM(sessions) AS sessions, SUM(minutes) AS minutes FROM tool_day;

-- Renewals: a newer date wins, an older one is ignored, a new pair is inserted
INSERT INTO certification (member_id, tool_id, certified_on) VALUES
  ((SELECT id FROM member WHERE badge_no = 'B-1001'), (SELECT id FROM tool WHERE asset_tag = 'WD-01'), '2026-04-01'),
  ((SELECT id FROM member WHERE badge_no = 'B-1002'), (SELECT id FROM tool WHERE asset_tag = 'WD-01'), '2020-01-01'),
  ((SELECT id FROM member WHERE badge_no = 'B-1002'), (SELECT id FROM tool WHERE asset_tag = 'FB-03'), '2026-04-01')
ON CONFLICT (member_id, tool_id) DO UPDATE SET certified_on = excluded.certified_on
  WHERE excluded.certified_on > certification.certified_on
RETURNING member_id, tool_id, certified_on;

-- Get-or-create: DO NOTHING returns nothing for the row it skipped
INSERT INTO member (email, badge_no, full_name, plan_id)
VALUES ('kofi.adeyemi@mail.example', 'B-3000', 'Kofi Again', 1)
ON CONFLICT (email) DO NOTHING
RETURNING id;

INSERT INTO member (email, badge_no, full_name, plan_id)
VALUES ('wren.calloway@mail.example', 'B-3001', 'Wren Calloway', (SELECT id FROM plan WHERE name = 'Casual'))
ON CONFLICT (email) DO NOTHING
RETURNING id, email;

-- A booking, with the id the database chose
INSERT INTO booking (member_id, tool_id, starts_at, ends_at)
VALUES ((SELECT id FROM member WHERE badge_no = 'B-1002'), (SELECT id FROM tool WHERE asset_tag = 'FB-02'), '2026-04-01 10:00:00', '2026-04-01 11:00:00')
RETURNING id, tool_id, starts_at, status;`,
      explanation:
        "The rollup sets its values from the source, so running it twice leaves the table unchanged; an accumulating upsert would have doubled every number. The renewal upsert has a WHERE on DO UPDATE, so the older date is skipped and, because RETURNING only reports rows actually written, only two rows come back. The DO NOTHING insert returns zero rows for the existing e-mail and one for the new member, and the booking's RETURNING hands back the generated id and the default status.",
      hints: [
        { id: "h1", title: "excluded", content: "In ON CONFLICT ... DO UPDATE SET, excluded.col is the value you tried to insert and the bare column is the stored value. Setting from excluded makes the statement idempotent; writing  minutes = minutes + excluded.minutes  would not be." },
        { id: "h2", title: "Only update when newer", content: "ON CONFLICT (member_id, tool_id) DO UPDATE SET certified_on = excluded.certified_on WHERE excluded.certified_on > certification.certified_on  — the WHERE decides whether the update happens; if false the row is untouched and is not returned." },
        { id: "h3", title: "Empty is an answer", content: "A RETURNING after DO NOTHING on a conflict returns zero rows. That is the point: it tells you nothing was written. Keep the statement in your file anyway; the scene shows 'nothing was written'." },
      ],
      tests: [
        {
          id: "t1",
          description: "tool_day has the right shape",
          assertionCode: t`assert(exists("tool_day"), "Create the table tool_day");
for (const c of ["tool_id", "day", "sessions", "minutes"]) {
  const k = col("tool_day", c);
  assert(k && k.notnull === 1, "tool_day." + c + " must exist and be NOT NULL");
}
assert(col("tool_day", "tool_id").pk > 0 && col("tool_day", "day").pk > 0, "PRIMARY KEY (tool_id, day)");
const k = fks("tool_day").find((f) => f.from === "tool_id");
assert(k && k.table === "tool" && String(k.on_delete).toUpperCase() === "CASCADE", "tool_day.tool_id should reference tool ON DELETE CASCADE");
const tl = all("PRAGMA table_list").find((r) => r.name === "tool_day");
assert(tl && tl.strict === 1 && tl.wr === 1, "tool_day should be STRICT and WITHOUT ROWID");`,
        },
        {
          id: "t2",
          description: "The rollup is right, and running it twice changed nothing",
          assertionCode: t`const want = all("SELECT tool_id, date(starts_at) AS day, COUNT(*) AS sessions, SUM((strftime('%s', ends_at) - strftime('%s', starts_at)) / 60) AS minutes FROM booking WHERE status = 'completed' GROUP BY tool_id, date(starts_at)");
const got = all("SELECT tool_id, day, sessions, minutes FROM tool_day");
assertEqual(got.length, want.length, "Rows in tool_day (one per tool and day with completed bookings)");
for (const w of want) {
  const g = got.find((r) => r.tool_id === w.tool_id && r.day === w.day);
  assert(g && g.sessions === w.sessions && g.minutes === w.minutes, "tool_day for tool " + w.tool_id + " on " + w.day + ": expected " + w.sessions + " sessions / " + w.minutes + " minutes" + (g ? ", got " + g.sessions + " / " + g.minutes + " (an accumulating upsert double counts when run twice)" : ", row missing"));
}
const runs = log.filter((e) => e.verb === "INSERT" && /tool_day/i.test(e.sql) && !e.error);
assert(runs.length >= 2, "Run the rollup statement twice to see that it is idempotent (found " + runs.length + " run)");
const r = data(["days_rolled_up", "sessions", "minutes"], "Add SELECT COUNT(*) AS days_rolled_up, SUM(sessions) AS sessions, SUM(minutes) AS minutes FROM tool_day", /tool_day/)[0];
assert(r.days_rolled_up === want.length && r.sessions === want.reduce((a, b) => a + b.sessions, 0) && r.minutes === want.reduce((a, b) => a + b.minutes, 0), "Your summary row does not match the table");`,
        },
        {
          id: "t3",
          description: "Renewals: the newer date won, the older one lost, the new pair arrived, and only two rows came back",
          assertionCode: t`const rs = need(["member_id", "tool_id", "certified_on"], "Add RETURNING member_id, tool_id, certified_on to your renewals upsert", /returning/, /select\s+member_id/);
const ret = objs(rs);
assertEqual(ret.length, 2, "Rows RETURNING gave back (the older renewal must be skipped: add a WHERE to DO UPDATE)");
const cert = (b, tag) => (one("SELECT c.certified_on FROM certification c JOIN member m ON m.id = c.member_id JOIN tool t ON t.id = c.tool_id WHERE m.badge_no = '" + b + "' AND t.asset_tag = '" + tag + "'") || {}).certified_on;
assertEqual(cert("B-1001", "WD-01"), "2026-04-01", "Odile's table-saw certificate (newer date should win)");
assert(cert("B-1002", "WD-01") && cert("B-1002", "WD-01") !== "2020-01-01", "Kofi's table-saw certificate must keep its newer date");
assertEqual(cert("B-1002", "FB-03"), "2026-04-01", "Kofi's new CNC router certificate");`,
        },
        {
          id: "t4",
          description: "Get-or-create: the existing e-mail returned nothing, the new member did",
          assertionCode: t`const sets = results.filter((r) => /returning/.test(sqlOf(r)) && /into\s+member/.test(sqlOf(r)));
assert(sets.length >= 2, "Run two member upserts that end in RETURNING (Kofi Again, then Wren Calloway)");
const noRows = sets.find((r) => r.rows.length === 0);
const withRow = sets.find((r) => r.rows.length === 1 && r.columns.includes("email"));
assert(noRows, "The DO NOTHING insert for the existing e-mail should return zero rows");
assert(withRow, "The insert for Wren should return one row with id and email (RETURNING id, email)");
assertEqual(withRow.rows[0][withRow.columns.indexOf("email")], "wren.calloway@mail.example", "Returned e-mail");
assertEqual(num("SELECT COUNT(*) FROM member WHERE badge_no = 'B-3000'"), 0, "'Kofi Again' must not exist");
assertEqual(one("SELECT p.name AS plan, m.full_name FROM member m JOIN plan p ON p.id = m.plan_id WHERE m.badge_no = 'B-3001'"), { plan: "Casual", full_name: "Wren Calloway" }, "Wren's row");
assertEqual(one("SELECT full_name FROM member WHERE email = 'kofi.adeyemi@mail.example'").full_name, "Kofi Adeyemi", "Kofi's own row must be untouched");`,
        },
        {
          id: "t5",
          description: "The new booking came back with its generated id and default status",
          assertionCode: t`const rs = need(["id", "tool_id", "starts_at", "status"], "End your booking INSERT with RETURNING id, tool_id, starts_at, status", /into\s+booking/);
assertEqual(rs.rows.length, 1, "Rows returned by the booking insert");
const r = objs(rs)[0];
assertEqual(r.starts_at, "2026-04-01 10:00:00", "Returned starts_at");
assertEqual(r.status, "confirmed", "Returned status (the column default)");
const b = one("SELECT b.id, t.asset_tag, m.badge_no FROM booking b JOIN tool t ON t.id = b.tool_id JOIN member m ON m.id = b.member_id WHERE b.id = " + r.id);
assertEqual(b, { id: r.id, asset_tag: "FB-02", badge_no: "B-1002" }, "The row behind the returned id");`,
        },
      ],
      unlocks: ["ss-upsert"],
      checks: [
        {
          prompt: "A nightly job sets `minutes = excluded.minutes` in its upsert. The scheduler retries it after a timeout. What happens to the numbers?",
          question: { type: "choice", options: ["They double", "They stay correct: the statement is idempotent", "The retry fails with a constraint error"], answer: 1 },
          explanation: "Setting values from the source gives the same result however many times it runs. `SET minutes = minutes + excluded.minutes` would add them again on every retry.",
        },
        {
          prompt: "An `INSERT ... ON CONFLICT DO NOTHING RETURNING id` hits a conflict. What does RETURNING give back?",
          question: { type: "choice", options: ["The id of the existing row", "NULL", "Nothing: no row was written"], answer: 2 },
          explanation: "RETURNING reports rows the statement actually wrote. A skipped row is not reported, so an empty result means 'nothing happened'. To get the existing id, SELECT it.",
        },
      ],
    },

    // ───────────────────────────── 14 ─────────────────────────────
    {
      id: "schema-studio-14-json",
      title: "JSON columns and generated columns",
      minutes: 26,
      xp: 150,
      concepts: ["JSON in TEXT", "json_valid CHECK", "->> and json_extract", "json_each, json_group_array", "generated columns", "indexing a JSON field"],
      learn: md`### When a table per attribute is too much

A laser has a bed size and a wattage. A kiln has a maximum temperature. A 3D printer has a nozzle diameter. A sewing machine has none of those. If every one of these became a column on \`tool\`, most rows would be mostly NULL. If each became its own table, you would be writing joins to read a spec sheet.

For attributes that **vary by row, are read mostly as a whole, and are rarely joined or constrained**, a JSON document in a \`TEXT\` column is a reasonable middle:

~~~sql
ALTER TABLE tool ADD COLUMN specs TEXT NOT NULL DEFAULT '{}'
  CONSTRAINT specs_is_json CHECK (json_valid(specs));
~~~

SQLite stores JSON as text, and has a set of functions that read and build it. The \`CHECK (json_valid(...))\` is the safety net: without it any string can be written, and the first query that parses it fails with \`malformed JSON\`.

### Reading JSON

~~~sql
specs ->> '$.power_w'                -- SQL value: 60  (number), 'acrylic' (text)
specs -> '$.materials'               -- JSON text: ["acrylic","plywood"]
json_extract(specs, '$.bed_mm[0]')   -- 600: the first element
~~~

- Paths start at \`$\`. \`.key\` picks a field, \`[n]\` an array element.
- **\`->>\` gives you a real SQL value** you can compare, sort and index. **\`->\` gives you JSON text** (strings keep their quotes). Use \`->>\` for filtering.
- A missing key returns \`NULL\`, not an error.

### Turning arrays into rows

\`json_each\` is a table-valued function: it unnests an object or array into rows with \`key\` and \`value\` columns.

~~~sql
SELECT t.asset_tag
FROM tool t
WHERE EXISTS (SELECT 1 FROM json_each(t.specs, '$.materials') WHERE value = 'plywood');
~~~

The mirror image is the aggregate \`json_group_array(x)\`, which folds rows into one JSON array (and \`json_group_object(k, v)\` into an object). To change a document use \`json_set\`, \`json_remove\` or \`json_patch\`; they return the new text, so you assign it back with \`UPDATE\`.

### What JSON gives up

- **No foreign keys, no uniqueness, no types** inside the document. The database cannot promise that \`power_w\` is always a number.
- Updating one field rewrites the whole document.
- A condition on a JSON field cannot use an ordinary index... unless you promote the field.

Rule of thumb: if you filter, sort, join or aggregate on a field *all the time*, it deserves a real column. If it is just descriptive detail that travels with the row, JSON is fine.

### Generated columns: a computed column that can be indexed

A **generated column** is defined by an expression over the same row. You never write to it.

~~~sql
ALTER TABLE tool ADD COLUMN power_w INTEGER
  GENERATED ALWAYS AS (specs ->> '$.power_w') VIRTUAL;
CREATE INDEX tool_power ON tool (power_w);
~~~

- \`VIRTUAL\` columns are computed when read and take no space in the table; \`STORED\` ones are computed on write. (\`ALTER TABLE ADD COLUMN\` can only add a virtual one.)
- You **can index a generated column**; the index stores the computed values. That is how you keep a flexible document *and* get a fast search on one field of it.
- The expression must be deterministic.
- Trying to write to it fails: \`cannot UPDATE generated column "power_w"\`.

Query the generated column by name (\`WHERE power_w >= 1500\`) and the planner can use the index.

### Reading the errors

- \`CHECK constraint failed: specs_is_json\`: you tried to store text that is not valid JSON.
- \`malformed JSON\`: a JSON function was given something it cannot parse (a document stored before the check existed, or a bad literal).
- \`cannot UPDATE generated column "power_w"\`: change \`specs\` instead.

### Common mistakes

- JSON as a dumping ground for data you will later need to join on.
- Comparing \`->\` output to a number (it is JSON text).
- Forgetting the \`json_valid\` check.`,
      mission: md`The workshop wants a spec sheet for its machines, and a way to ask "which tools draw a lot of power".

1. Add **\`specs\`** to \`tool\`: \`TEXT NOT NULL DEFAULT '{}'\` with a named check \`specs_is_json CHECK (json_valid(specs))\`.
2. Fill it, building each document with \`json_object\` / \`json_array\`:
   - **FB-01** Laser cutter: \`power_w\` 60, \`bed_mm\` [600, 400], \`materials\` ["acrylic", "plywood", "leather"]
   - **FB-03** CNC router: \`power_w\` 1500, \`bed_mm\` [1200, 1200], \`materials\` ["plywood", "aluminium", "foam"]
   - **FB-02** 3D printer: \`nozzle_mm\` 0.4, \`materials\` ["PLA", "PETG"]
   - **WD-01** Table saw: \`power_w\` 1800, \`blade_mm\` 254
   - **MT-01** MIG welder: \`power_w\` 5500, \`wire_mm\` 0.9
   - **CL-02** Kiln: \`power_w\` 7000, \`max_temp_c\` 1280
3. Mark \`-- expect error\` an UPDATE that writes \`'{oops'\` into a tool's specs.
4. Ask three questions: tools with \`power_w\` of 1500 or more (\`asset_tag\`, \`power_w\`, biggest first, ties by tag); tools that accept plywood (\`asset_tag\`, \`name\`, by tag); and for every workshop the JSON array of its tool names in alphabetical order (\`workshop_code\`, \`tools\`, by code).
5. Promote the hot field: add the **virtual generated column** \`power_w\` (\`specs ->> '$.power_w'\`), index it as \`tool_power\`, mark \`-- expect error\` an attempt to write it directly, and explain \`SELECT asset_tag, power_w FROM tool WHERE power_w >= 1500\`.`,
      tasks: [
        "ALTER TABLE tool ADD COLUMN specs (TEXT NOT NULL DEFAULT '{}') with CONSTRAINT specs_is_json CHECK (json_valid(specs)), then UPDATE the six tools with json_object / json_array documents",
        "Mark -- expect error: UPDATE tool SET specs = '{oops' WHERE asset_tag = 'WD-02'",
        "Three queries: power_w >= 1500 via ->> (asset_tag, power_w); tools whose materials include plywood via json_each (asset_tag, name); json_group_array of tool names per workshop (workshop_code, tools)",
        "Add the virtual generated column power_w, CREATE INDEX tool_power, mark an UPDATE of power_w with -- expect error, and EXPLAIN QUERY PLAN the power_w >= 1500 query",
      ],
      starterAdd: sql`-- ── ✏️ YOUR TURN ───────────────────────────
-- Lesson 14: JSON columns and generated columns.
--
-- 1. ALTER TABLE tool ADD COLUMN specs TEXT NOT NULL DEFAULT '{}' CONSTRAINT specs_is_json CHECK (json_valid(specs));
--    Then six UPDATEs (one per tool) with  specs = json_object('power_w', 60, 'bed_mm', json_array(600, 400), ...)
--    Documents are listed in the mission.
--
-- 2. -- expect error  above  UPDATE tool SET specs = '{oops' WHERE asset_tag = 'WD-02';
--
-- 3. Queries:
--      asset_tag, power_w          WHERE specs ->> '$.power_w' >= 1500   ORDER BY power_w DESC, asset_tag
--      asset_tag, name             WHERE EXISTS (SELECT 1 FROM json_each(t.specs, '$.materials') WHERE value = 'plywood')  ORDER BY asset_tag
--      workshop_code, tools        json_group_array(name) per workshop, names in alphabetical order, ORDER BY workshop_code
--                                  (sort first in a subquery:  FROM (SELECT workshop_code, name FROM tool ORDER BY name))
--
-- 4. ALTER TABLE tool ADD COLUMN power_w INTEGER GENERATED ALWAYS AS (specs ->> '$.power_w') VIRTUAL;
--    CREATE INDEX tool_power ON tool (power_w);
--    -- expect error  above  UPDATE tool SET power_w = 1 WHERE asset_tag = 'WD-02';
--    EXPLAIN QUERY PLAN SELECT asset_tag, power_w FROM tool WHERE power_w >= 1500;
`,
      solutionAdd: sql`ALTER TABLE tool ADD COLUMN specs TEXT NOT NULL DEFAULT '{}'
  CONSTRAINT specs_is_json CHECK (json_valid(specs));

UPDATE tool SET specs = json_object('power_w', 60, 'bed_mm', json_array(600, 400), 'materials', json_array('acrylic', 'plywood', 'leather')) WHERE asset_tag = 'FB-01';
UPDATE tool SET specs = json_object('power_w', 1500, 'bed_mm', json_array(1200, 1200), 'materials', json_array('plywood', 'aluminium', 'foam')) WHERE asset_tag = 'FB-03';
UPDATE tool SET specs = json_object('nozzle_mm', 0.4, 'materials', json_array('PLA', 'PETG')) WHERE asset_tag = 'FB-02';
UPDATE tool SET specs = json_object('power_w', 1800, 'blade_mm', 254) WHERE asset_tag = 'WD-01';
UPDATE tool SET specs = json_object('power_w', 5500, 'wire_mm', 0.9) WHERE asset_tag = 'MT-01';
UPDATE tool SET specs = json_object('power_w', 7000, 'max_temp_c', 1280) WHERE asset_tag = 'CL-02';

-- expect error
UPDATE tool SET specs = '{oops' WHERE asset_tag = 'WD-02';

SELECT asset_tag, specs ->> '$.power_w' AS power_w
FROM tool
WHERE specs ->> '$.power_w' >= 1500
ORDER BY power_w DESC, asset_tag;

SELECT t.asset_tag, t.name
FROM tool t
WHERE EXISTS (SELECT 1 FROM json_each(t.specs, '$.materials') WHERE value = 'plywood')
ORDER BY t.asset_tag;

SELECT workshop_code, json_group_array(name) AS tools
FROM (SELECT workshop_code, name FROM tool ORDER BY name)
GROUP BY workshop_code
ORDER BY workshop_code;

ALTER TABLE tool ADD COLUMN power_w INTEGER GENERATED ALWAYS AS (specs ->> '$.power_w') VIRTUAL;
CREATE INDEX tool_power ON tool (power_w);

-- expect error
UPDATE tool SET power_w = 1 WHERE asset_tag = 'WD-02';

EXPLAIN QUERY PLAN
SELECT asset_tag, power_w FROM tool WHERE power_w >= 1500;`,
      explanation:
        "The json_valid CHECK refuses text that is not JSON, ->> returns real SQL values you can compare and sort, json_each unnests the materials array for the plywood question, and json_group_array folds names back into one array per workshop. The generated column promotes one hot field out of the document, and because a generated column can be indexed, the final plan is a SEARCH on tool_power, while the document keeps its flexibility.",
      hints: [
        { id: "h1", title: "->> versus ->", content: "specs ->> '$.power_w' returns the number 1500 (a SQL value), so  >= 1500  compares numerically and ORDER BY sorts numerically. specs -> '$.power_w' returns the JSON text '1500'." },
        { id: "h2", title: "Arrays to rows", content: "json_each(t.specs, '$.materials') produces one row per array element in a column called value. WHERE EXISTS (SELECT 1 FROM json_each(t.specs, '$.materials') WHERE value = 'plywood') keeps the tools where any element matches." },
        { id: "h3", title: "Sorted array", content: "json_group_array keeps the order the rows arrive in, so sort in a subquery first: SELECT workshop_code, json_group_array(name) FROM (SELECT workshop_code, name FROM tool ORDER BY name) GROUP BY workshop_code." },
      ],
      tests: [
        {
          id: "t1",
          description: "tool.specs holds valid JSON only",
          assertionCode: t`const k = col("tool", "specs");
assert(k, "ALTER TABLE tool ADD COLUMN specs ...");
assert(k.notnull === 1 && String(k.dflt_value).replace(/'/g, "") === "{}", "tool.specs should be NOT NULL DEFAULT '{}'");
const err = probe("UPDATE tool SET specs = '{oops' WHERE asset_tag = 'WD-01'");
assert(err, "Invalid JSON must be refused");
assert(/json_valid\(\s*specs\s*\)/i.test(ddl("tool")), "tool.specs needs CHECK (json_valid(specs))");
assert(probe("UPDATE tool SET specs = '{\"a\": 1}' WHERE asset_tag = 'WD-01'") === null, "Valid JSON should be accepted");
assert(refused(/CHECK constraint failed/).length >= 1, "Mark the '{oops' UPDATE with -- expect error");
assert(accepted().length === 0, "One of your -- expect error statements was accepted: it should have been refused");`,
        },
        {
          id: "t2",
          description: "The six spec sheets are stored as the right JSON",
          assertionCode: t`const spec = (tag) => JSON.parse(one("SELECT specs FROM tool WHERE asset_tag = '" + tag + "'").specs);
assertEqual(spec("FB-01"), { power_w: 60, bed_mm: [600, 400], materials: ["acrylic", "plywood", "leather"] }, "Laser cutter specs");
assertEqual(spec("FB-03"), { power_w: 1500, bed_mm: [1200, 1200], materials: ["plywood", "aluminium", "foam"] }, "CNC router specs");
assertEqual(spec("FB-02"), { nozzle_mm: 0.4, materials: ["PLA", "PETG"] }, "3D printer specs");
assertEqual(spec("WD-01"), { power_w: 1800, blade_mm: 254 }, "Table saw specs");
assertEqual(spec("MT-01"), { power_w: 5500, wire_mm: 0.9 }, "MIG welder specs");
assertEqual(spec("CL-02"), { power_w: 7000, max_temp_c: 1280 }, "Kiln specs");
assertEqual(num("SELECT COUNT(*) FROM tool WHERE specs = '{}'"), num("SELECT COUNT(*) FROM tool") - 6, "Every other tool keeps the empty default document");`,
        },
        {
          id: "t3",
          description: "The power, plywood and per-workshop questions are answered",
          assertionCode: t`const hot = data(["asset_tag", "power_w"], "Add the power query: asset_tag, power_w", /(->>|json_extract)/, /json_each/);
assertEqual(hot.map((r) => r.asset_tag + ":" + r.power_w), ["CL-02:7000", "MT-01:5500", "WD-01:1800", "FB-03:1500"], "Tools drawing 1500 W or more, biggest first");
const ply = data(["asset_tag", "name"], "Add the plywood query: asset_tag, name", /json_each/);
assertEqual(ply.map((r) => r.asset_tag), ["FB-01", "FB-03"], "Tools that accept plywood");
const grp = data(["workshop_code", "tools"], "Add the per-workshop query: workshop_code, tools", /json_group_array/);
assertEqual(grp.length, num("SELECT COUNT(*) FROM workshop"), "One row per workshop");
for (const g of grp) {
  const arr = JSON.parse(g.tools);
  const want = all("SELECT name FROM tool WHERE workshop_code = '" + g.workshop_code + "' ORDER BY name").map((r) => r.name);
  assertEqual(arr, want, "Tool names for " + g.workshop_code + " (alphabetical)");
}
assertEqual(grp.map((g) => g.workshop_code), grp.map((g) => g.workshop_code).slice().sort(), "Rows ordered by workshop_code");`,
        },
        {
          id: "t4",
          description: "power_w is a virtual generated column with its own index, used by the plan",
          assertionCode: t`const k = col("tool", "power_w");
assert(k, "ALTER TABLE tool ADD COLUMN power_w INTEGER GENERATED ALWAYS AS (...) VIRTUAL");
assertEqual(k.hidden, 2, "tool.power_w should be a VIRTUAL generated column");
assertEqual(num("SELECT power_w FROM tool WHERE asset_tag = 'MT-01'"), 5500, "power_w for the welder");
assert(num("SELECT COUNT(*) FROM tool WHERE power_w IS NULL") === num("SELECT COUNT(*) FROM tool WHERE specs ->> '$.power_w' IS NULL"), "power_w should be NULL exactly where the document has no power_w");
const ix = indexes("tool").find((i) => indexCols(i.name).join() === "power_w");
assert(ix, "Create an index on power_w (tool_power)");
const err = probe("UPDATE tool SET power_w = 1 WHERE asset_tag = 'WD-02'");
assert(err && /generated/i.test(err), "Writing a generated column must fail, got: " + err);
const d = planFor(/power_w\s*>=/);
assert(d, "Explain: SELECT asset_tag, power_w FROM tool WHERE power_w >= 1500");
assert(d.includes(ix.name), "The plan should use " + ix.name + ", got: " + d);`,
        },
      ],
      unlocks: ["ss-json"],
      checks: [
        {
          prompt: "`specs -> '$.power_w'` versus `specs ->> '$.power_w'`: which one should you use in a `WHERE power >= 1500` comparison?",
          question: { type: "choice", options: ["->, because it keeps the JSON type", "->>, because it returns a real SQL number", "Either: they are identical"], answer: 1 },
          explanation: "`->>` unwraps to a SQL value (a number for a JSON number, text for a string). `->` returns JSON text, so comparisons and sorting would be on strings.",
        },
        {
          prompt: "You often search tools by wattage. What is the lightest way to make that fast without moving the data out of the JSON?",
          question: {
            type: "choice",
            options: [
              "Add a virtual generated column over specs ->> '$.power_w' and index it",
              "Store the wattage twice and keep both copies in sync by hand",
              "Nothing: JSON fields cannot be indexed in any form",
            ],
            answer: 0,
          },
          explanation: "A generated column is computed from the document, so it cannot drift from it, and it can carry an ordinary index.",
        },
      ],
    },

    // ───────────────────────────── 15 ─────────────────────────────
    {
      id: "schema-studio-15-migrations",
      title: "Migrations without downtime",
      minutes: 32,
      xp: 170,
      concepts: ["expand / backfill / switch / contract", "schema_migrations", "versioned scripts", "transactional DDL", "DROP COLUMN limits"],
      learn: md`### The schema must change after launch

Today \`member.phone\` is one nullable text column. Next month a member has a mobile and a landline and the front desk wants to know which is primary. That needs a table (\`member_phone\`), and a real database has to get there while the website is up, other developers' code is running, and nobody is awake to babysit it.

Changing a column in one step is dangerous in two ways: code that expects the old shape breaks the moment you change it, and a script that stops halfway leaves a schema nobody planned. The standard answer is the **expand and contract** pattern (also called *parallel change*), done in four steps that can each ship, and be undone, on their own:

1. **Expand.** Add the new structure *next to* the old one. Nothing that used the old shape notices.
2. **Backfill and dual-write.** Copy existing data into the new structure, and keep both in step for as long as both are in use (a trigger, or the application writing twice).
3. **Switch reads.** Point readers at the new structure. If readers go through a **view**, this is one \`DROP VIEW\` plus \`CREATE VIEW\` in a transaction, with the same column names, so the consumers do not change at all. This is the real payoff of lesson 10's "stable interface".
4. **Contract.** When nothing reads or writes the old structure, remove the dual-write triggers and the old column.

Notice the order. The risky, irreversible step (dropping data) is last, and by then you have had time to find out whether the new shape works.

### Migrations as numbered, recorded scripts

Each step is a **migration**: a small script with a version number. A \`schema_migrations\` table records which have been applied:

~~~sql
CREATE TABLE schema_migrations (
  version    INTEGER PRIMARY KEY,
  name       TEXT NOT NULL UNIQUE,
  applied_at TEXT NOT NULL DEFAULT (datetime('now'))
) STRICT;
~~~

The rules that keep a team sane:

- **Append-only.** Never edit a migration that has run anywhere. Mistakes get a *new* migration.
- **One transaction each**, ending with the \`INSERT INTO schema_migrations\`. In SQLite even \`CREATE TABLE\` and \`ALTER TABLE\` roll back, so the change and its record either both happen or neither does. A migration that dies halfway leaves no scar.
- A runner applies every migration whose version is above the highest recorded one, in order. The blocks in your file are those scripts, run top to bottom.

### What SQLite's ALTER TABLE can and can't do

It can: \`RENAME TABLE\`, \`RENAME COLUMN\`, \`ADD COLUMN\` (a \`NOT NULL\` one needs a non-NULL default; no \`PRIMARY KEY\` or \`UNIQUE\`), and \`DROP COLUMN\`, but only if nothing else mentions the column.

~~~sql
ALTER TABLE member DROP COLUMN phone;
~~~

fails with \`error in view v_member_contact after drop column: no such column: phone\` while the view still reads it, or the same for a trigger that mentions it. A column that is a \`PRIMARY KEY\`, is \`UNIQUE\`, is indexed, or is used in a constraint cannot be dropped either (\`cannot drop UNIQUE column\`). That is **why contract comes last**: you first remove everything that depends on the column, then the column.

For everything else (change a column's type, add a CHECK to an existing column, change a foreign key) SQLite documents a table **rebuild**: create the new table, copy the rows over, drop the old one, rename the new one, recreate its indexes, triggers and views, all inside a transaction and with \`PRAGMA foreign_keys = OFF\` around it. It is the same expand-and-contract idea with the whole table as the unit.

### A failing migration is a gift, if it's atomic

You will end the lesson with a deliberately broken migration 6. Its last statement fails; the \`ROLLBACK\` removes the half-built table *and* the half-written \`schema_migrations\` row. Compare that with a runner that applies statements one at a time without a transaction: you would be left with a table that exists, a version that was never recorded, and a re-run that fails with \`table member_note already exists\`.

(The statement that fails: \`ALTER TABLE member ADD COLUMN pronouns TEXT NOT NULL\` is refused with \`Cannot add a NOT NULL column with default value NULL\`, because 24 existing rows would have nothing to hold.)

### Common mistakes

- Dropping the old column in the same release that adds the new one.
- Editing an old migration instead of adding a new one.
- Running migrations without a transaction.
- Forgetting a dual-write path, so rows created while the migration runs miss the new table.`,
      mission: md`Members now have more than one phone number. Move \`member.phone\` into a new table **without ever breaking the contact list** that the front desk reads through a view.

First the bookkeeping: create **\`schema_migrations\`** as above and record the schema you have built so far as version **1**, named \`baseline\`.

Then five migrations, **each in its own \`BEGIN\` ... \`COMMIT\`**, each recorded:

- **2 expand.** Create \`member_phone\` (\`STRICT\`): \`id\`, \`member_id\` (required, references \`member\`, cascade), \`number\` (required text), \`is_primary\` (required, default 0, only 0 or 1), plus a unique partial index so each member has at most one primary number. Create the view **\`v_member_contact\`** (\`member_id\`, \`full_name\`, \`email\`, \`phone\`) reading the *old* column. Record it. Then \`SELECT * FROM v_member_contact ORDER BY member_id\`: that is your "before".
- **3 backfill and dual-write.** Copy every non-NULL phone into \`member_phone\` as primary. Add two triggers so the old and new shapes stay in step while both exist: after a member is **inserted** with a phone, and after \`member.phone\` **changes**, write the primary number to \`member_phone\`.
- **4 switch reads.** Inside a transaction, replace \`v_member_contact\` with a version reading \`member_phone\`, **with identical columns**. Then run the same SELECT again: the "after" must equal the "before".
- **5 contract.** Drop both triggers, then \`ALTER TABLE member DROP COLUMN phone\`.
- **6 broken on purpose.** \`BEGIN\`; create a table \`member_note\`; record version 6; then, marked \`-- expect error\`, \`ALTER TABLE member ADD COLUMN pronouns TEXT NOT NULL\`; \`ROLLBACK\`.

Finish with \`SELECT version, name FROM schema_migrations ORDER BY version\`: five rows, no sixth.`,
      tasks: [
        "Create schema_migrations and record version 1 'baseline'. Migration 2 (expand): member_phone, its unique partial index, and the old-shape view v_member_contact; run the 'before' SELECT",
        "Migration 3: backfill member_phone from member.phone and add the two dual-write triggers. Migration 4: DROP VIEW and recreate v_member_contact from member_phone; run the 'after' SELECT",
        "Migration 5 (contract): drop both triggers and ALTER TABLE member DROP COLUMN phone. Each of 2-5 in its own BEGIN ... COMMIT with its schema_migrations row",
        "Migration 6: BEGIN, create member_note, record version 6, a marked -- expect error ALTER that fails, ROLLBACK; then SELECT version, name FROM schema_migrations ORDER BY version",
      ],
      starterAdd: sql`-- ── ✏️ YOUR TURN ───────────────────────────
-- Lesson 15: migrations without downtime (expand / backfill / switch / contract).
--
-- 0. CREATE TABLE schema_migrations (version INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE,
--      applied_at TEXT NOT NULL DEFAULT (datetime('now'))) STRICT;
--    INSERT INTO schema_migrations (version, name) VALUES (1, 'baseline');
--
-- 2. BEGIN; CREATE TABLE member_phone (...) STRICT; CREATE UNIQUE INDEX ... ON member_phone (member_id) WHERE is_primary = 1;
--    CREATE VIEW v_member_contact AS SELECT id AS member_id, full_name, email, phone FROM member;
--    INSERT INTO schema_migrations ... (2, ...); COMMIT;     then   SELECT * FROM v_member_contact ORDER BY member_id;
--
-- 3. BEGIN; INSERT INTO member_phone (member_id, number, is_primary) SELECT id, phone, 1 FROM member WHERE phone IS NOT NULL;
--    two triggers: AFTER INSERT ON member WHEN NEW.phone IS NOT NULL ...; AFTER UPDATE OF phone ON member WHEN NEW.phone IS NOT OLD.phone ...
--    (the update trigger deletes the old primary row, then inserts the new one if the phone is not NULL)
--    INSERT INTO schema_migrations ... (3, ...); COMMIT;
--
-- 4. BEGIN; DROP VIEW v_member_contact; CREATE VIEW v_member_contact AS ... member LEFT JOIN member_phone ON primary ...  (same four columns!)
--    INSERT INTO schema_migrations ... (4, ...); COMMIT;     then the same SELECT again.
--
-- 5. BEGIN; DROP TRIGGER ...; DROP TRIGGER ...; ALTER TABLE member DROP COLUMN phone; INSERT ... (5, ...); COMMIT;
--
-- 6. BEGIN; CREATE TABLE member_note (...); INSERT ... (6, 'add_member_note');
--    -- expect error  above  ALTER TABLE member ADD COLUMN pronouns TEXT NOT NULL;
--    ROLLBACK;     then   SELECT version, name FROM schema_migrations ORDER BY version;
`,
      solutionAdd: sql`CREATE TABLE schema_migrations (
  version    INTEGER PRIMARY KEY,
  name       TEXT    NOT NULL UNIQUE,
  applied_at TEXT    NOT NULL DEFAULT (datetime('now'))
) STRICT;

INSERT INTO schema_migrations (version, name) VALUES (1, 'baseline');

-- 0002 EXPAND: add the new shape next to the old one
BEGIN;
CREATE TABLE member_phone (
  id         INTEGER PRIMARY KEY,
  member_id  INTEGER NOT NULL REFERENCES member (id) ON DELETE CASCADE,
  number     TEXT    NOT NULL,
  is_primary INTEGER NOT NULL DEFAULT 0 CHECK (is_primary IN (0, 1))
) STRICT;
CREATE UNIQUE INDEX member_one_primary_phone ON member_phone (member_id) WHERE is_primary = 1;
CREATE VIEW v_member_contact AS
SELECT id AS member_id, full_name, email, phone FROM member;
INSERT INTO schema_migrations (version, name) VALUES (2, 'expand_member_phone');
COMMIT;

SELECT * FROM v_member_contact ORDER BY member_id;

-- 0003 BACKFILL and keep both shapes in step (dual write)
BEGIN;
INSERT INTO member_phone (member_id, number, is_primary)
SELECT id, phone, 1 FROM member WHERE phone IS NOT NULL;

CREATE TRIGGER member_phone_copy_new AFTER INSERT ON member WHEN NEW.phone IS NOT NULL
BEGIN
  INSERT INTO member_phone (member_id, number, is_primary) VALUES (NEW.id, NEW.phone, 1);
END;

CREATE TRIGGER member_phone_copy_change AFTER UPDATE OF phone ON member WHEN NEW.phone IS NOT OLD.phone
BEGIN
  DELETE FROM member_phone WHERE member_id = NEW.id AND is_primary = 1;
  INSERT INTO member_phone (member_id, number, is_primary) SELECT NEW.id, NEW.phone, 1 WHERE NEW.phone IS NOT NULL;
END;
INSERT INTO schema_migrations (version, name) VALUES (3, 'backfill_member_phone');
COMMIT;

-- 0004 SWITCH READS: the view keeps its columns, only its source changes
BEGIN;
DROP VIEW v_member_contact;
CREATE VIEW v_member_contact AS
SELECT m.id AS member_id, m.full_name, m.email, p.number AS phone
FROM member m
LEFT JOIN member_phone p ON p.member_id = m.id AND p.is_primary = 1;
INSERT INTO schema_migrations (version, name) VALUES (4, 'read_phone_from_member_phone');
COMMIT;

SELECT * FROM v_member_contact ORDER BY member_id;

-- 0005 CONTRACT: remove the old column
BEGIN;
DROP TRIGGER member_phone_copy_new;
DROP TRIGGER member_phone_copy_change;
ALTER TABLE member DROP COLUMN phone;
INSERT INTO schema_migrations (version, name) VALUES (5, 'contract_drop_member_phone');
COMMIT;

-- 0006 is broken on purpose: the whole script rolls back
BEGIN;
CREATE TABLE member_note (member_id INTEGER NOT NULL REFERENCES member (id), body TEXT NOT NULL) STRICT;
INSERT INTO schema_migrations (version, name) VALUES (6, 'add_member_note');
-- expect error
ALTER TABLE member ADD COLUMN pronouns TEXT NOT NULL;
ROLLBACK;

SELECT version, name FROM schema_migrations ORDER BY version;`,
      explanation:
        "Each migration is one transaction that ends by recording itself, so the change and its record can only exist together. The new table is added beside the old column (expand), filled and kept in step by two triggers (backfill and dual-write), and the view is switched to read it with the same columns, so the before and after SELECTs are identical. Only then are the triggers and the old column removed (contract), because DROP COLUMN refuses while a view or trigger still mentions it. The broken migration 6 rolled back completely: no member_note table, no version 6.",
      hints: [
        { id: "h1", title: "One migration, one transaction", content: "BEGIN; <the change>; INSERT INTO schema_migrations (version, name) VALUES (N, '...'); COMMIT;  If anything in the middle fails you ROLLBACK and neither the change nor its record exists." },
        { id: "h2", title: "Switch with the same columns", content: "DROP VIEW v_member_contact; CREATE VIEW v_member_contact AS SELECT m.id AS member_id, m.full_name, m.email, p.number AS phone FROM member m LEFT JOIN member_phone p ON p.member_id = m.id AND p.is_primary = 1;  A LEFT JOIN keeps members without a phone." },
        { id: "h3", title: "Contract in the right order", content: "DROP TRIGGER both triggers first, and make sure no view mentions member.phone (migration 4 did that). Only then ALTER TABLE member DROP COLUMN phone succeeds." },
      ],
      tests: [
        {
          id: "t1",
          description: "schema_migrations records versions 1 to 5, in order, with unique names",
          assertionCode: t`assert(exists("schema_migrations"), "Create the table schema_migrations");
assert(col("schema_migrations", "version").pk === 1, "schema_migrations.version should be the PRIMARY KEY");
assert(col("schema_migrations", "name").notnull === 1, "schema_migrations.name must be NOT NULL");
assert(indexes("schema_migrations").some((i) => i.unique === 1 && indexCols(i.name).join() === "name"), "schema_migrations.name should be UNIQUE");
assert(/datetime\(\s*'now'\s*\)/i.test(String(col("schema_migrations", "applied_at").dflt_value)), "schema_migrations.applied_at should DEFAULT (datetime('now'))");
assertEqual(all("SELECT version FROM schema_migrations ORDER BY version").map((r) => r.version), [1, 2, 3, 4, 5], "Recorded versions (migration 6 must not be recorded)");
assert(all("SELECT name FROM schema_migrations").every((r) => String(r.name).trim().length > 0), "Every migration needs a name");`,
        },
        {
          id: "t2",
          description: "member_phone holds every phone number, one primary per member",
          assertionCode: t`assert(exists("member_phone"), "Create the table member_phone");
for (const c of ["id", "member_id", "number", "is_primary"]) assert(col("member_phone", c), "member_phone needs a column called " + c);
for (const c of ["member_id", "number", "is_primary"]) assert(col("member_phone", c).notnull === 1, "member_phone." + c + " must be NOT NULL");
const k = fks("member_phone").find((f) => f.from === "member_id");
assert(k && k.table === "member" && String(k.on_delete).toUpperCase() === "CASCADE", "member_phone.member_id should reference member ON DELETE CASCADE");
const withPhone = num("SELECT COUNT(DISTINCT lower(trim(member_email))) FROM legacy_sheet WHERE member_phone IS NOT NULL");
assertEqual(num("SELECT COUNT(*) FROM member_phone"), withPhone, "Phone numbers copied (one per member who had one)");
assertEqual(num("SELECT COUNT(*) FROM member_phone WHERE is_primary = 1"), withPhone, "Every copied number should be primary");
assertEqual(num("SELECT COUNT(*) FROM member_phone p JOIN member m ON m.id = p.member_id JOIN legacy_sheet s ON lower(trim(s.member_email)) = m.email WHERE s.member_phone <> p.number"), 0, "Numbers that differ from the sheet");
const err = probe("INSERT INTO member_phone (member_id, number, is_primary) VALUES (1, '555-9999', 1)");
assert(err && /UNIQUE/.test(err), "A second primary number for the same member must be refused (unique partial index), got: " + err);
assert(probe("INSERT INTO member_phone (member_id, number, is_primary) VALUES (1, '555-9999', 0)") === null, "A second, non-primary number is fine");
assert(/CHECK/.test(probe("INSERT INTO member_phone (member_id, number, is_primary) VALUES (1, '555-9998', 2)") || ""), "is_primary must be 0 or 1");`,
        },
        {
          id: "t3",
          description: "The old column and its dual-write triggers are gone",
          assertionCode: t`assert(!cols("member").some((c) => c.name === "phone"), "member.phone should have been dropped by migration 5");
assertEqual(all("SELECT name FROM sqlite_master WHERE type = 'trigger' AND sql LIKE '%phone%'").length, 0, "No trigger should still mention phone");
assert(log.filter((e) => e.verb === "CREATE" && /create\s+trigger/i.test(e.sql) && /member_phone|phone/i.test(e.sql)).length >= 2, "Migration 3 should create two dual-write triggers");
assert(log.filter((e) => e.verb === "DROP" && /drop\s+trigger/i.test(e.sql)).length >= 2, "Migration 5 should drop the two triggers");
assert(probe("INSERT INTO member (email, badge_no, full_name) VALUES ('after.migration@mail.example', 'B-7300', 'After Migration')") === null, "New members can still be added without a phone column");`,
        },
        {
          id: "t4",
          description: "The contact view returned exactly the same data before and after the switch",
          assertionCode: t`const sets = results.filter((r) => /v_member_contact/.test(sqlOf(r)) && ["member_id", "full_name", "email", "phone"].every((c) => r.columns.includes(c)));
assert(sets.length >= 2, "Run SELECT * FROM v_member_contact ORDER BY member_id twice: once after migration 2 (before) and once after migration 4 (after)");
assertEqual(JSON.stringify(sets[sets.length - 1].rows), JSON.stringify(sets[0].rows), "The view's rows should be identical before and after the switch");
assertEqual(cols("v_member_contact").map((c) => c.name), ["member_id", "full_name", "email", "phone"], "Columns of v_member_contact (unchanged by the migration)");
const bad = num("SELECT COUNT(*) FROM v_member_contact v LEFT JOIN member_phone p ON p.member_id = v.member_id AND p.is_primary = 1 WHERE v.phone IS NOT p.number");
assertEqual(bad, 0, "The view should now read the phone from member_phone");
assertEqual(num("SELECT COUNT(*) FROM v_member_contact"), num("SELECT COUNT(*) FROM member"), "Every member appears in the contact view, even without a phone (LEFT JOIN)");`,
        },
        {
          id: "t5",
          description: "Each migration was its own transaction, and the broken one rolled back completely",
          assertionCode: t`const tx = log.map((e) => (e.verb === "ROLLBACK" && /\bto\b/i.test(e.sql) ? "ROLLBACK TO" : e.verb)).filter((v) => ["BEGIN", "COMMIT", "ROLLBACK"].includes(v));
assert(tx.filter((v) => v === "COMMIT").length >= 4, "Migrations 2, 3, 4 and 5 should each end in COMMIT (found " + tx.filter((v) => v === "COMMIT").length + ")");
assert(tx.filter((v) => v === "BEGIN").length >= 5, "Each migration (2 to 6) should start with its own BEGIN");
assertEqual(tx[tx.length - 1], "ROLLBACK", "The broken migration 6 should end with ROLLBACK");
assert(!exists("member_note"), "member_note must not exist: the rollback should have removed it");
assert(!cols("member").some((c) => c.name === "pronouns"), "member.pronouns must not exist");
assert(refused(/NOT NULL column with default value NULL/).length >= 1, "Mark the failing ALTER TABLE ... ADD COLUMN pronouns TEXT NOT NULL with -- expect error");
let open = true;
try { query("BEGIN"); open = false; query("ROLLBACK"); } catch (e) { open = true; }
assert(!open, "A transaction was left open at the end of your file");
const last = data(["version", "name"], "End with SELECT version, name FROM schema_migrations ORDER BY version", /schema_migrations/);
assertEqual(last.map((r) => r.version), [1, 2, 3, 4, 5], "Your final read-back of schema_migrations");`,
        },
      ],
      unlocks: ["ss-migrations"],
      checks: [
        {
          prompt: "Why is dropping the old column the LAST step of expand-and-contract?",
          question: {
            type: "choice",
            options: [
              "SQLite can only drop columns at the end of a script",
              "It is the one step you cannot undo, and by then you have had time to prove the new structure works",
              "Dropping a column makes the new table slower",
            ],
            answer: 1,
          },
          explanation: "Expand, backfill and switch can each be reversed. Dropping data cannot. Doing it last, once nothing reads the old column, means you can still roll the whole change back until that moment.",
        },
        {
          prompt: "Migration 6 fails halfway through its transaction and you ROLLBACK. Why is there no half-created `member_note` table?",
          question: {
            type: "choice",
            options: [
              "SQLite deletes empty tables at the end of every run",
              "CREATE TABLE and ALTER TABLE are transactional in SQLite, so the rollback undid them too",
              "The failed ALTER TABLE cleans up after itself",
            ],
            answer: 1,
          },
          explanation: "In SQLite, schema changes are part of the transaction like any other write. That makes 'change the schema and record the version' a single atomic step.",
        },
      ],
    },

    // ───────────────────────────── 16 ─────────────────────────────
    {
      id: "schema-studio-16-bookings",
      title: "Capstone: bookings that cannot collide",
      minutes: 40,
      xp: 220,
      concepts: ["audit before enforcing", "interval overlap", "slot table with a composite key", "triggers for house rules", "reporting from the slots"],
      learn: md`### Make the collision impossible, not unlikely

The founders' hardest rule: **a tool can never be double-booked.** There are three ways to enforce it, and they are not equally strong.

1. **Check in the application** ("is it free? then book it"). Two requests arrive together, both see "free", both insert. The check and the write are separate steps, and any script that bypasses the app bypasses the rule.
2. **Check in a trigger** (look for an overlapping booking, raise if there is one). Better: it runs for every writer. In SQLite, where one connection writes at a time, it is reliable, but it is still a *check* the database performs in code you wrote and must keep correct for every way a row can change.
3. **Turn the collision into a key violation.** Give each half hour a tool can be held its own row, with \`PRIMARY KEY (tool_id, slot_start)\`. Two bookings cannot hold the same slot because two rows cannot share a key. There is no code path that gets around a primary key.

This lesson uses the third as the lock and triggers only to keep the slots in step with the bookings.

### Overlap, precisely

Two time ranges overlap when each starts before the other ends:

~~~sql
a.starts_at < b.ends_at AND b.starts_at < a.ends_at
~~~

With *half-open* ranges (a booking holds its start, not its end) a booking that ends at 11:00 and one that starts at 11:00 do **not** collide. Always test the boundary cases: back-to-back, identical, one inside the other, one that straddles.

### Audit before you enforce

You cannot add a rule on top of data that already breaks it: the slot table's key would refuse the very first conflicting booking during the backfill. The professional order is always:

1. **Find** the violators (a self-join with \`b.id > a.id\` so each pair appears once).
2. **Decide** a policy. Here: keep the earlier entry, cancel the later one (the sheet's duplicate).
3. **Fix**, then **prove** zero violators remain.
4. **Only then** enforce.

### Slots and the recursive CTE

A one-hour booking at 10:00 holds the slots 10:00 and 10:30. Generating them is a loop, which in SQL is a recursive CTE (you met it in the previous project):

~~~sql
WITH RECURSIVE s (slot) AS (
  SELECT '2026-04-01 10:00:00'
  UNION ALL
  SELECT datetime(slot, '+30 minutes') FROM s WHERE datetime(slot, '+30 minutes') < '2026-04-01 11:00:00'
)
SELECT slot FROM s;
~~~

A trigger body cannot start with \`WITH\`, but SQLite accepts one inside a subquery, so the trigger wraps it: \`INSERT ... SELECT ... FROM ( WITH RECURSIVE ... SELECT slot FROM s )\`.

Slots need bookings on the half hour, which is exactly what the half-hour trigger enforces.

### House rules as BEFORE INSERT triggers

The remaining rules each get a small trigger with a message a person could act on:

- the member must hold the induction for a tool that needs one,
- the tool must be in service (the repair workflow from lesson 11 now pays off),
- a session may not be longer than the tool allows,
- bookings start and end on the half hour.

Test each rule on its own: if a probe breaks two rules at once, SQLite fires whichever trigger it likes first, and the message you see is not guaranteed.

### Derived copies drift

\`tool_day\` from lesson 13 is a copy computed from bookings. You just cancelled some. Rerun the idempotent rollup and it catches up (this is also why it was written to be rerun).

### Common mistakes

- Enforcing before auditing, then wondering why the migration dies.
- Treating \`ends_at <= starts_at\` and equal boundaries sloppily, so back-to-back bookings collide.
- Testing only the happy path. A rule is only as good as the probes that tried to break it.`,
      mission: md`Make Lantern Yard's calendar collision-proof, then report on it.

1. **Audit.** Find every pair of overlapping, non-cancelled bookings on the same tool: \`first_id\`, \`second_id\` (the larger id), \`asset_tag\`, \`first_starts\`, \`second_starts\`. Then **cancel the later booking of each pair** (\`status = 'cancelled'\`), and prove it worked with one row: \`double_bookings_left\` (it must be 0).
2. **Slots.** Create \`booking_slot\` (\`STRICT\`, \`WITHOUT ROWID\`): \`tool_id\` (references \`tool\`), \`slot_start\` (text), \`booking_id\` (references \`booking\`, cascade), \`PRIMARY KEY (tool_id, slot_start)\`. Backfill it from every booking that is **not cancelled** with a recursive CTE (a booking holds each half hour from its start up to, not including, its end).
3. **Keep it in step.** A trigger after a booking is inserted (not cancelled) adds its slots; a trigger after a booking's tool, times or status change removes its old slots and adds the new ones (if it is not cancelled). A cancellation therefore frees the slots.
4. **House rules**, four \`BEFORE INSERT\` triggers: missing induction, tool out of service, session too long for the tool, not on the half hour.
5. **Break it.** Five statements marked \`-- expect error\`, each breaking **one** thing: a double booking (FB-02, 2026-04-01 10:30 to 11:30, overlapping Kofi's booking from lesson 13), an uncertified member on an induction tool (Wren, B-3001, on WD-01), a booking on the laser while it is in repair (Kofi, B-1002, on FB-01), a five-hour session on TX-01, and one starting at 09:10 on TX-01. Then a good booking (member 1, FB-02, 11:00 to 12:00), **cancel** Kofi's 10:00 booking, and book the freed half hour (member 1, FB-02, 10:30 to 11:00).
6. **Catch up.** Re-run your lesson-13 rollup upsert so \`tool_day\` matches the cancelled bookings.
7. **Report.** For every tool: \`asset_tag\`, \`name\`, \`workshop\` (the workshop's name), \`booked_hours\` (slots held, divided by 2), and \`share_pct\` (its share of all slots held, rounded to one decimal), most booked first, ties by tag.`,
      tasks: [
        "Audit overlaps (first_id, second_id, asset_tag, first_starts, second_starts), cancel the later booking of each pair, then SELECT COUNT(*) AS double_bookings_left",
        "Create booking_slot with PRIMARY KEY (tool_id, slot_start) and backfill it with a recursive CTE from all non-cancelled bookings",
        "Create the triggers that add slots on insert and rebuild them when tool_id, starts_at, ends_at or status changes, plus the four BEFORE INSERT house rules",
        "Five marked -- expect error probes (double booking, no induction, tool in repair, too long, off the half hour), then book, cancel and rebook; re-run the lesson-13 rollup upsert",
        "Report: asset_tag, name, workshop, booked_hours, share_pct for every tool, most booked first",
      ],
      starterAdd: sql`-- ── ✏️ YOUR TURN ───────────────────────────
-- Lesson 16 (capstone): bookings that cannot collide.
--
-- 1. Audit. Pairs of non-cancelled bookings on the same tool that overlap (b.id > a.id so each pair shows once):
--      JOIN booking b ON b.tool_id = a.tool_id AND b.id > a.id AND b.starts_at < a.ends_at AND a.starts_at < b.ends_at
--    Columns: first_id, second_id, asset_tag, first_starts, second_starts.
--    Then UPDATE booking SET status = 'cancelled' for the SECOND booking of every pair (keep the earlier entry),
--    and SELECT COUNT(*) AS double_bookings_left (same join) -- it must be 0.
--
-- 2. CREATE TABLE booking_slot (tool_id INTEGER NOT NULL REFERENCES tool (id), slot_start TEXT NOT NULL,
--      booking_id INTEGER NOT NULL REFERENCES booking (id) ON DELETE CASCADE, PRIMARY KEY (tool_id, slot_start)) STRICT, WITHOUT ROWID;
--    Backfill with WITH RECURSIVE s (booking_id, tool_id, slot, ends_at) AS (... UNION ALL SELECT ..., datetime(slot, '+30 minutes'), ...
--    WHERE datetime(slot, '+30 minutes') < ends_at) INSERT INTO booking_slot SELECT tool_id, slot, booking_id FROM s;
--
-- 3. Triggers: AFTER INSERT ON booking WHEN NEW.status <> 'cancelled'  -> insert NEW's slots (a trigger can't start with WITH,
--    so:  INSERT INTO booking_slot (...) SELECT NEW.tool_id, slot, NEW.id FROM ( WITH RECURSIVE s (slot) AS (...) SELECT slot FROM s );
--    AFTER UPDATE OF tool_id, starts_at, ends_at, status ON booking -> DELETE its old slots, insert the new ones unless cancelled.
--    BEFORE INSERT ON booking, one trigger per rule, each with a clear RAISE(ABORT, '...') message:
--      induction (tool.needs_induction = 1 and no certification row), tool.status <> 'ready',
--      minutes > tool.max_session_minutes, start or end not at :00 or :30 (strftime('%M:%S', ...)).
--
-- 4. Probes, each marked  -- expect error  and breaking ONE rule (see the mission), then the good booking,
--    UPDATE booking SET status = 'cancelled' for Kofi's FB-02 10:00 booking, and the rebooking of 10:30-11:00.
--    Re-run your lesson-13 rollup upsert (INSERT INTO tool_day ... ON CONFLICT ... DO UPDATE ...).
--
-- 5. Report: asset_tag, name, workshop, booked_hours, share_pct  (LEFT JOIN booking_slot, GROUP BY tool).
`,
      solutionAdd: sql`-- 1. Find the double bookings already in the data
SELECT a.id AS first_id, b.id AS second_id, t.asset_tag, a.starts_at AS first_starts, b.starts_at AS second_starts
FROM booking a
JOIN booking b ON b.tool_id = a.tool_id AND b.id > a.id AND b.starts_at < a.ends_at AND a.starts_at < b.ends_at
JOIN tool t ON t.id = a.tool_id
WHERE a.status <> 'cancelled' AND b.status <> 'cancelled'
ORDER BY a.id;

-- 2. Keep the earlier entry; the later one was a duplicate
UPDATE booking SET status = 'cancelled'
WHERE id IN (
  SELECT b.id
  FROM booking a
  JOIN booking b ON b.tool_id = a.tool_id AND b.id > a.id AND b.starts_at < a.ends_at AND a.starts_at < b.ends_at
  WHERE a.status <> 'cancelled' AND b.status <> 'cancelled'
);

SELECT COUNT(*) AS double_bookings_left
FROM booking a
JOIN booking b ON b.tool_id = a.tool_id AND b.id > a.id AND b.starts_at < a.ends_at AND a.starts_at < b.ends_at
WHERE a.status <> 'cancelled' AND b.status <> 'cancelled';

-- 3. One row per half hour a tool is held: the primary key is the lock
CREATE TABLE booking_slot (
  tool_id    INTEGER NOT NULL REFERENCES tool (id),
  slot_start TEXT    NOT NULL,
  booking_id INTEGER NOT NULL REFERENCES booking (id) ON DELETE CASCADE,
  PRIMARY KEY (tool_id, slot_start)
) STRICT, WITHOUT ROWID;

WITH RECURSIVE s (booking_id, tool_id, slot, ends_at) AS (
  SELECT id, tool_id, starts_at, ends_at FROM booking WHERE status <> 'cancelled'
  UNION ALL
  SELECT booking_id, tool_id, datetime(slot, '+30 minutes'), ends_at FROM s WHERE datetime(slot, '+30 minutes') < ends_at
)
INSERT INTO booking_slot (tool_id, slot_start, booking_id)
SELECT tool_id, slot, booking_id FROM s;

-- 4. Keep the slots in step with the bookings
CREATE TRIGGER booking_hold_slots AFTER INSERT ON booking WHEN NEW.status <> 'cancelled'
BEGIN
  INSERT INTO booking_slot (tool_id, slot_start, booking_id)
  SELECT NEW.tool_id, slot, NEW.id
  FROM (
    WITH RECURSIVE s (slot) AS (
      SELECT NEW.starts_at
      UNION ALL
      SELECT datetime(slot, '+30 minutes') FROM s WHERE datetime(slot, '+30 minutes') < NEW.ends_at
    )
    SELECT slot FROM s
  );
END;

CREATE TRIGGER booking_move_slots AFTER UPDATE OF tool_id, starts_at, ends_at, status ON booking
BEGIN
  DELETE FROM booking_slot WHERE booking_id = NEW.id;
  INSERT INTO booking_slot (tool_id, slot_start, booking_id)
  SELECT NEW.tool_id, slot, NEW.id
  FROM (
    WITH RECURSIVE s (slot) AS (
      SELECT NEW.starts_at
      UNION ALL
      SELECT datetime(slot, '+30 minutes') FROM s WHERE datetime(slot, '+30 minutes') < NEW.ends_at
    )
    SELECT slot FROM s
  )
  WHERE NEW.status <> 'cancelled';
END;

-- 5. The other house rules, as BEFORE INSERT triggers
CREATE TRIGGER booking_needs_certificate BEFORE INSERT ON booking
WHEN (SELECT needs_induction FROM tool WHERE id = NEW.tool_id) = 1
 AND NOT EXISTS (SELECT 1 FROM certification c WHERE c.member_id = NEW.member_id AND c.tool_id = NEW.tool_id)
BEGIN
  SELECT RAISE(ABORT, 'member has not completed the induction for this tool');
END;

CREATE TRIGGER booking_tool_in_service BEFORE INSERT ON booking
WHEN (SELECT status FROM tool WHERE id = NEW.tool_id) <> 'ready'
BEGIN
  SELECT RAISE(ABORT, 'tool is out of service');
END;

CREATE TRIGGER booking_not_too_long BEFORE INSERT ON booking
WHEN (strftime('%s', NEW.ends_at) - strftime('%s', NEW.starts_at)) / 60 > (SELECT max_session_minutes FROM tool WHERE id = NEW.tool_id)
BEGIN
  SELECT RAISE(ABORT, 'session is longer than this tool allows');
END;

CREATE TRIGGER booking_on_the_half_hour BEFORE INSERT ON booking
WHEN strftime('%M:%S', NEW.starts_at) NOT IN ('00:00', '30:00') OR strftime('%M:%S', NEW.ends_at) NOT IN ('00:00', '30:00')
BEGIN
  SELECT RAISE(ABORT, 'bookings start and end on the hour or half hour');
END;

-- 6. Try to break it
-- expect error
INSERT INTO booking (member_id, tool_id, starts_at, ends_at)
VALUES (1, (SELECT id FROM tool WHERE asset_tag = 'FB-02'), '2026-04-01 10:30:00', '2026-04-01 11:30:00');

-- expect error
INSERT INTO booking (member_id, tool_id, starts_at, ends_at)
VALUES ((SELECT id FROM member WHERE badge_no = 'B-3001'), (SELECT id FROM tool WHERE asset_tag = 'WD-01'), '2026-04-02 10:00:00', '2026-04-02 11:00:00');

-- expect error
INSERT INTO booking (member_id, tool_id, starts_at, ends_at)
VALUES ((SELECT id FROM member WHERE badge_no = 'B-1002'), (SELECT id FROM tool WHERE asset_tag = 'FB-01'), '2026-04-02 10:00:00', '2026-04-02 11:00:00');

-- expect error
INSERT INTO booking (member_id, tool_id, starts_at, ends_at)
VALUES (1, (SELECT id FROM tool WHERE asset_tag = 'TX-01'), '2026-04-02 09:00:00', '2026-04-02 14:00:00');

-- expect error
INSERT INTO booking (member_id, tool_id, starts_at, ends_at)
VALUES (1, (SELECT id FROM tool WHERE asset_tag = 'TX-01'), '2026-04-02 09:10:00', '2026-04-02 10:00:00');

-- 7. A good booking, a cancellation that frees the slots, and a rebooking
INSERT INTO booking (member_id, tool_id, starts_at, ends_at)
VALUES (1, (SELECT id FROM tool WHERE asset_tag = 'FB-02'), '2026-04-01 11:00:00', '2026-04-01 12:00:00');

UPDATE booking SET status = 'cancelled'
WHERE tool_id = (SELECT id FROM tool WHERE asset_tag = 'FB-02') AND starts_at = '2026-04-01 10:00:00';

INSERT INTO booking (member_id, tool_id, starts_at, ends_at)
VALUES (1, (SELECT id FROM tool WHERE asset_tag = 'FB-02'), '2026-04-01 10:30:00', '2026-04-01 11:00:00');

-- 8. Catch the derived copy up with the cancelled bookings
INSERT INTO tool_day (tool_id, day, sessions, minutes)
SELECT tool_id, date(starts_at), COUNT(*), SUM((strftime('%s', ends_at) - strftime('%s', starts_at)) / 60)
FROM booking
WHERE status = 'completed'
GROUP BY tool_id, date(starts_at)
ON CONFLICT (tool_id, day) DO UPDATE SET sessions = excluded.sessions, minutes = excluded.minutes;

-- 9. The report
SELECT
  t.asset_tag,
  t.name,
  w.name AS workshop,
  COUNT(s.slot_start) / 2.0 AS booked_hours,
  ROUND(100.0 * COUNT(s.slot_start) / (SELECT COUNT(*) FROM booking_slot), 1) AS share_pct
FROM tool t
JOIN workshop w ON w.code = t.workshop_code
LEFT JOIN booking_slot s ON s.tool_id = t.id
GROUP BY t.id
ORDER BY booked_hours DESC, t.asset_tag;`,
      explanation:
        "The audit found the double bookings the paper calendar had allowed, the policy cancelled the later entry of each pair, and only then could the slot table's primary key be loaded: it is now impossible for two bookings to hold the same half hour, however the row arrives. Triggers keep the slots in step (so a cancellation frees them), four small BEFORE INSERT triggers enforce the house rules with readable messages, and the report counts slots, which are the ground truth for utilisation.",
      hints: [
        { id: "h1", title: "Each pair once", content: "JOIN booking b ON b.tool_id = a.tool_id AND b.id > a.id AND b.starts_at < a.ends_at AND a.starts_at < b.ends_at  — the b.id > a.id condition stops a pair appearing twice, and < (not <=) lets back-to-back bookings through. Add WHERE a.status <> 'cancelled' AND b.status <> 'cancelled'." },
        { id: "h2", title: "Generate the slots", content: "WITH RECURSIVE s (booking_id, tool_id, slot, ends_at) AS (SELECT id, tool_id, starts_at, ends_at FROM booking WHERE status <> 'cancelled' UNION ALL SELECT booking_id, tool_id, datetime(slot, '+30 minutes'), ends_at FROM s WHERE datetime(slot, '+30 minutes') < ends_at) INSERT INTO booking_slot (tool_id, slot_start, booking_id) SELECT tool_id, slot, booking_id FROM s;" },
        { id: "h3", title: "Triggers and WITH", content: "A trigger body cannot begin with WITH, but a subquery can contain one: INSERT INTO booking_slot (...) SELECT NEW.tool_id, slot, NEW.id FROM ( WITH RECURSIVE s (slot) AS (SELECT NEW.starts_at UNION ALL SELECT datetime(slot, '+30 minutes') FROM s WHERE datetime(slot, '+30 minutes') < NEW.ends_at) SELECT slot FROM s ); For the UPDATE trigger, DELETE the booking's slots first." },
      ],
      tests: [
        {
          id: "t1",
          description: "The audit found the double bookings, and none are left",
          assertionCode: t`const sheet = all("SELECT entry_id, tool_tag, session_date || ' ' || start_time AS s, datetime(session_date || ' ' || start_time, '+' || minutes || ' minutes') AS e FROM legacy_sheet WHERE note IS NULL OR note <> 'cancelled by member'");
const pairs = [];
for (const a of sheet) for (const b of sheet) if (b.entry_id > a.entry_id && a.tool_tag === b.tool_tag && b.s.slice(0, 16) < a.e.slice(0, 16) && a.s.slice(0, 16) < b.e.slice(0, 16)) pairs.push(b.entry_id);
assert(pairs.length >= 2, "(course data check) the sheet should contain double bookings");
const audit = results.find((r) => ["first_id", "second_id", "asset_tag", "first_starts", "second_starts"].every((c) => r.columns.includes(c)));
assert(audit, "Add the audit query: first_id, second_id, asset_tag, first_starts, second_starts");
const second = objs(audit).map((r) => r.second_id).sort((x, y) => x - y);
assertEqual(second, pairs.sort((x, y) => x - y), "second_id of every double booking found by your audit (each pair once, later booking second)");
const left = data(["double_bookings_left"], "Add SELECT COUNT(*) AS double_bookings_left ... after cancelling")[0];
assertEqual(left.double_bookings_left, 0, "double_bookings_left");
assertEqual(num("SELECT COUNT(*) FROM booking a JOIN booking b ON b.tool_id = a.tool_id AND b.id > a.id AND b.starts_at < a.ends_at AND a.starts_at < b.ends_at WHERE a.status <> 'cancelled' AND b.status <> 'cancelled'"), 0, "Overlapping non-cancelled bookings still in the table");
for (const id of pairs) assertEqual(one("SELECT status FROM booking WHERE id = " + id).status, "cancelled", "The later booking " + id + " of a pair should be cancelled");`,
        },
        {
          id: "t2",
          description: "booking_slot is keyed on (tool_id, slot_start) and holds every half hour of every live booking",
          assertionCode: t`assert(exists("booking_slot"), "Create the table booking_slot");
for (const c of ["tool_id", "slot_start", "booking_id"]) {
  const k = col("booking_slot", c);
  assert(k && k.notnull === 1, "booking_slot." + c + " must exist and be NOT NULL");
}
assert(col("booking_slot", "tool_id").pk > 0 && col("booking_slot", "slot_start").pk > 0 && col("booking_slot", "booking_id").pk === 0, "PRIMARY KEY (tool_id, slot_start): the booking id is NOT part of the key");
const k = fks("booking_slot").find((f) => f.from === "booking_id");
assert(k && k.table === "booking" && String(k.on_delete).toUpperCase() === "CASCADE", "booking_slot.booking_id should reference booking ON DELETE CASCADE");
const tl = all("PRAGMA table_list").find((r) => r.name === "booking_slot");
assert(tl && tl.strict === 1 && tl.wr === 1, "booking_slot should be STRICT and WITHOUT ROWID");
const want = num("SELECT SUM((strftime('%s', ends_at) - strftime('%s', starts_at)) / 1800) FROM booking WHERE status <> 'cancelled'");
assertEqual(num("SELECT COUNT(*) FROM booking_slot"), want, "Slots held (one per half hour of every booking that is not cancelled)");
assertEqual(num("SELECT COUNT(*) FROM booking b WHERE b.status = 'cancelled' AND EXISTS (SELECT 1 FROM booking_slot s WHERE s.booking_id = b.id)"), 0, "Cancelled bookings must hold no slots");
const sample = all("SELECT slot_start FROM booking_slot WHERE booking_id = 3 ORDER BY slot_start").map((r) => r.slot_start);
const b3 = one("SELECT starts_at, ends_at FROM booking WHERE id = 3");
if (one("SELECT status FROM booking WHERE id = 3").status !== "cancelled") assert(sample[0] === b3.starts_at && sample.length === (Date.parse(b3.ends_at.replace(" ", "T") + "Z") - Date.parse(b3.starts_at.replace(" ", "T") + "Z")) / 1800000, "Booking 3 should hold slots from " + b3.starts_at + " in half-hour steps up to (not including) " + b3.ends_at);`,
        },
        {
          id: "t3",
          description: "A double booking is impossible, back-to-back is fine, and a cancellation frees the slots",
          assertionCode: t`const tool = one("SELECT id FROM tool WHERE asset_tag = 'FB-02'").id;
const ins = (a, b, who) => "INSERT INTO booking (member_id, tool_id, starts_at, ends_at) VALUES (" + (who || 1) + ", " + tool + ", '" + a + "', '" + b + "')";
sandbox(() => {
  query(ins("2026-09-01 10:00:00", "2026-09-01 11:00:00"));
  assert(probe(ins("2026-09-01 10:30:00", "2026-09-01 11:30:00")) !== null, "A booking that overlaps an existing one must be refused");
  assert(probe(ins("2026-09-01 09:30:00", "2026-09-01 10:30:00")) !== null, "A booking that overlaps the start of an existing one must be refused");
  assert(probe(ins("2026-09-01 10:00:00", "2026-09-01 11:00:00")) !== null, "An identical booking must be refused");
  assert(probe(ins("2026-09-01 10:30:00", "2026-09-01 11:00:00")) !== null, "A booking inside an existing one must be refused");
  assert(probe(ins("2026-09-01 11:00:00", "2026-09-01 12:00:00")) === null, "Back-to-back bookings (one ends 11:00, the next starts 11:00) must be allowed");
  assertEqual(num("SELECT COUNT(*) FROM booking_slot WHERE tool_id = " + tool + " AND slot_start >= '2026-09-01 10:00:00' AND slot_start < '2026-09-01 11:00:00'"), 2, "A one-hour booking holds two slots");
  query("UPDATE booking SET status = 'cancelled' WHERE tool_id = " + tool + " AND starts_at = '2026-09-01 10:00:00'");
  assertEqual(num("SELECT COUNT(*) FROM booking_slot WHERE tool_id = " + tool + " AND slot_start >= '2026-09-01 10:00:00' AND slot_start < '2026-09-01 11:00:00'"), 0, "Cancelling must free the slots");
  assert(probe(ins("2026-09-01 10:30:00", "2026-09-01 11:00:00")) === null, "After the cancellation the freed half hour can be booked again");
});
sandbox(() => {
  query(ins("2026-09-02 10:00:00", "2026-09-02 11:00:00"));
  query(ins("2026-09-02 13:00:00", "2026-09-02 14:00:00"));
  const err = probe("UPDATE booking SET starts_at = '2026-09-02 13:00:00', ends_at = '2026-09-02 14:00:00' WHERE tool_id = " + tool + " AND starts_at = '2026-09-02 10:00:00'");
  assert(err !== null, "Moving a booking onto an occupied time must be refused");
  query("UPDATE booking SET starts_at = '2026-09-02 15:00:00', ends_at = '2026-09-02 16:00:00' WHERE tool_id = " + tool + " AND starts_at = '2026-09-02 10:00:00'");
  assertEqual(num("SELECT COUNT(*) FROM booking_slot WHERE tool_id = " + tool + " AND slot_start = '2026-09-02 10:00:00'"), 0, "Moving a booking must release its old slots");
  assertEqual(num("SELECT COUNT(*) FROM booking_slot WHERE tool_id = " + tool + " AND slot_start = '2026-09-02 15:30:00'"), 1, "Moving a booking must take its new slots");
});
sandbox(() => {
  query(ins("2026-09-03 10:00:00", "2026-09-03 11:00:00"));
  query("DELETE FROM booking WHERE tool_id = " + tool + " AND starts_at = '2026-09-03 10:00:00'");
  assertEqual(num("SELECT COUNT(*) FROM booking_slot WHERE tool_id = " + tool + " AND slot_start = '2026-09-03 10:00:00'"), 0, "Deleting a booking must remove its slots (ON DELETE CASCADE)");
});`,
        },
        {
          id: "t4",
          description: "Each house rule refuses its own offender, and a good booking is accepted",
          assertionCode: t`const book = (who, tag, a, b) => "INSERT INTO booking (member_id, tool_id, starts_at, ends_at) VALUES ((SELECT id FROM member WHERE badge_no = '" + who + "'), (SELECT id FROM tool WHERE asset_tag = '" + tag + "'), '" + a + "', '" + b + "')";
assert(probe(book("B-1001", "TX-01", "2026-09-10 09:00:00", "2026-09-10 10:00:00")) === null, "A normal booking (Odile, sewing machine, one hour) should be accepted");
let err = probe(book("B-3001", "WD-01", "2026-09-10 09:00:00", "2026-09-10 10:00:00"));
assert(err !== null, "A member without the induction must be refused on the table saw");
err = probe(book("B-1002", "FB-01", "2026-09-10 09:00:00", "2026-09-10 10:00:00"));
assert(err !== null, "A booking on a tool in repair must be refused (the laser has an open ticket)");
err = probe(book("B-1001", "TX-01", "2026-09-10 09:00:00", "2026-09-10 14:00:00"));
assert(err !== null, "A five-hour session on a tool that allows 240 minutes must be refused");
err = probe(book("B-1001", "TX-01", "2026-09-10 09:10:00", "2026-09-10 10:00:00"));
assert(err !== null, "A booking that starts at 09:10 must be refused");
err = probe(book("B-1001", "TX-01", "2026-09-10 09:00:00", "2026-09-10 09:50:00"));
assert(err !== null, "A booking that ends at 09:50 must be refused");
sandbox(() => {
  query("INSERT INTO certification (member_id, tool_id, certified_on) VALUES ((SELECT id FROM member WHERE badge_no = 'B-3001'), (SELECT id FROM tool WHERE asset_tag = 'WD-01'), '2026-09-01')");
  assert(probe(book("B-3001", "WD-01", "2026-09-10 09:00:00", "2026-09-10 10:00:00")) === null, "Once certified, the same member can book the table saw");
});`,
        },
        {
          id: "t5",
          description: "You recorded five refusals, re-ran the rollup, and the report matches the slots",
          assertionCode: t`assert(accepted().length === 0, "One of your -- expect error statements was accepted: it should have been refused");
const bookingRefusals = refused().filter((e) => /into\s+booking/i.test(e.sql));
assert(bookingRefusals.length >= 5, "Mark five rule-breaking booking INSERTs with -- expect error (found " + bookingRefusals.length + ")");
assert(new Set(bookingRefusals.map((e) => e.error)).size >= 5, "Your five refused bookings should break five different rules (found messages: " + [...new Set(bookingRefusals.map((e) => e.error))].join(" / ") + ")");
const day = all("SELECT tool_id, date(starts_at) AS day, COUNT(*) AS sessions FROM booking WHERE status = 'completed' GROUP BY 1, 2");
assertEqual(num("SELECT COUNT(*) FROM tool_day"), day.length, "tool_day rows (re-run the lesson-13 rollup after cancelling the duplicates)");
for (const d of day) assertEqual(one("SELECT sessions FROM tool_day WHERE tool_id = " + d.tool_id + " AND day = '" + d.day + "'").sessions, d.sessions, "tool_day.sessions for tool " + d.tool_id + " on " + d.day);
const rs = data(["asset_tag", "name", "workshop", "booked_hours", "share_pct"], "Add the report: asset_tag, name, workshop, booked_hours, share_pct", /booking_slot/);
assertEqual(rs.length, num("SELECT COUNT(*) FROM tool"), "One report row per tool");
const total = num("SELECT COUNT(*) FROM booking_slot");
let sum = 0;
rs.forEach((r, i) => {
  const slots = num("SELECT COUNT(*) FROM booking_slot s JOIN tool t ON t.id = s.tool_id WHERE t.asset_tag = '" + r.asset_tag + "'");
  assertClose(r.booked_hours, slots / 2, 1e-9, "booked_hours for " + r.asset_tag);
  assertClose(r.share_pct, Math.round((1000 * slots) / total) / 10, 0.051, "share_pct for " + r.asset_tag);
  assertEqual(r.workshop, one("SELECT w.name AS n FROM tool t JOIN workshop w ON w.code = t.workshop_code WHERE t.asset_tag = '" + r.asset_tag + "'").n, "workshop name for " + r.asset_tag);
  sum += r.share_pct;
  if (i > 0) assert(rs[i - 1].booked_hours >= r.booked_hours, "Order by booked_hours, most booked first");
});
assert(Math.abs(sum - 100) < 0.6, "The shares should add up to about 100%, got " + sum);`,
        },
      ],
      unlocks: ["ss-bookings"],
      checks: [
        {
          prompt: "Why is a `PRIMARY KEY (tool_id, slot_start)` on a slot table a stronger guarantee against double-booking than an app-level availability check?",
          question: {
            type: "choice",
            options: [
              "It is faster than a SELECT",
              "Two rows cannot share a key, so there is no way to hold the same slot twice, however the row arrives",
              "It also checks the member's induction",
            ],
            answer: 1,
          },
          explanation: "A check-then-insert has a gap between the check and the write. A key violation has no gap: the database either has a row with that key or it doesn't, no matter which program, script or retry tries to write it.",
        },
        {
          prompt: "Booking A is 10:00 to 11:00 and booking B is 11:00 to 12:00 on the same tool. With the overlap test `a.starts_at < b.ends_at AND b.starts_at < a.ends_at`, do they collide?",
          question: { type: "choice", options: ["Yes: they touch at 11:00", "No: A ends exactly when B starts, and 11:00 < 11:00 is false", "Only if B was booked first"], answer: 1 },
          explanation: "Treating a booking as the half-open range [start, end) lets back-to-back sessions coexist. The strict < comparisons encode that boundary decision, which is why you test the edges explicitly.",
        },
        {
          prompt: "Why audit and cancel the existing double bookings BEFORE creating and loading `booking_slot`?",
          question: {
            type: "choice",
            options: [
              "The slot table would refuse the very first conflicting booking while being loaded, because its key forbids the overlap",
              "SQLite forbids creating a table while overlapping rows exist",
              "Cancelled bookings are faster to copy",
            ],
            answer: 0,
          },
          explanation: "A constraint can only be added on top of data that already satisfies it. Find the violators, apply a policy, prove none remain, then enforce.",
        },
      ],
    },
  ],
};
