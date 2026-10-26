import type { Chapter } from "@/engine/types";
import { md, sql, t } from "./util.ts";

/**
 * Chapter 2: relationships and speed.
 * Foreign keys, normalising a messy sheet, junction tables, and indexes you can read in a query plan.
 */
export const chapter2: Chapter = {
  id: "relationships",
  title: "Relationships and speed",
  blurb: "Link tables with foreign keys, split a messy spreadsheet into clean tables, and make lookups fast.",
  lessons: [
    // ───────────────────────────── 5 ─────────────────────────────
    {
      id: "schema-studio-5-links",
      title: "Foreign keys",
      minutes: 26,
      xp: 130,
      concepts: ["FOREIGN KEY", "PRAGMA foreign_keys", "ON DELETE CASCADE / RESTRICT / SET NULL", "foreign_key_check"],
      learn: md`### A promise about two tables

A **foreign key** says: "the value in this column must exist as a key in that other table". Without one, nothing stops a booking from naming member 999 who never existed, or a repair ticket from outliving the tool it was about. Orphan rows like that quietly break every report that joins across them.

~~~sql
member_id INTEGER NOT NULL REFERENCES member (id) ON DELETE RESTRICT
~~~

The table holding the column is the **child**; the table it points at is the **parent**. The parent column has to be its \`PRIMARY KEY\` or carry a \`UNIQUE\` constraint, otherwise SQLite reports \`foreign key mismatch\`.

### SQLite ships with the safety off

Here is the surprise promised in lesson 3. The \`REFERENCES\` clauses you wrote in \`member\` and \`tool\` were stored faithfully, and **ignored**. SQLite enforces foreign keys only when told to, once per connection:

~~~sql
PRAGMA foreign_keys = ON;
~~~

The default is off for historical reasons (databases created before foreign keys existed must keep working). Two consequences:

1. **Every connection must switch it on**, usually in your connection set-up code. A forgotten pragma means a perfectly declared schema that enforces nothing.
2. The pragma is a silent no-op **inside a transaction**. Set it first, before any \`BEGIN\`.

\`PRAGMA foreign_key_check;\` lists the rows that *already* violate a key (child table, row id, parent table, which key). It works whether or not enforcement is on, so it is how you audit data that arrived while the safety was off.

### What happens to the children when a parent goes?

You choose, per key, with \`ON DELETE\` (and \`ON UPDATE\` for key changes):

- **\`NO ACTION\`** (the default): refuse if children exist, checked when the statement finishes.
- **\`RESTRICT\`**: refuse straight away. In practice the same refusal; it matters only for deferred constraints.
- **\`CASCADE\`**: delete the children too. Very convenient, very dangerous: one \`DELETE\` can silently remove thousands of rows.
- **\`SET NULL\`**: keep the children, forget the link. The child column must allow NULL.
- **\`SET DEFAULT\`**: reset the child to its column default.

How to choose: ask what the child **means** without its parent.

- A repair *ticket* about a tool that no longer exists is meaningless: \`CASCADE\`.
- A *booking* is the record of money that changed hands. Deleting a member must not erase it: \`RESTRICT\`, and use a status (\`closed\`) instead of deleting people.
- The *volunteer who reported* a ticket is nice to know but not essential: \`SET NULL\`.

### Details that bite

- **A NULL in a child key column means "no parent"** and is allowed unless the column is \`NOT NULL\`. That is how optional links work (\`reported_by\`).
- **Child columns are not indexed for you.** Deleting a parent has to find its children; with no index on the child column that is a full scan of the child table, for every deleted parent row. Index child key columns that matter (lesson 8).
- **Insert parents before children**, delete children before parents.

### Reading the errors

\`FOREIGN KEY constraint failed\` is all you get: no table, no column, no value. When a script has several keys, find the culprit by running the statement alone or by auditing with \`PRAGMA foreign_key_check\`. The other message you may meet is \`foreign key mismatch - "booking" referencing "member"\`: the parent column is not a key.

### Common mistakes

- Believing the schema is protected because the \`CREATE TABLE\` has \`REFERENCES\` in it.
- \`ON DELETE CASCADE\` on anything that is a financial or legal record.
- Testing with the pragma on and shipping with it off (or the other way round).`,
      mission: md`Prove first that the keys you declared have been doing nothing, then switch them on and build the two tables that depend on them.

**\`booking\`** (\`STRICT\`): \`id\`; \`member_id\` and \`tool_id\`, required, pointing at \`member\` and \`tool\` with \`ON DELETE RESTRICT\`; \`starts_at\` and \`ends_at\`, required text timestamps; \`status\`, required, default \`confirmed\`, one of \`confirmed\`, \`completed\`, \`cancelled\`, \`no_show\`; and a rule that a booking **ends after it starts**.

**\`maintenance_ticket\`** (\`STRICT\`): \`id\`; \`tool_id\` required, \`ON DELETE CASCADE\`; \`reported_by\` optional, pointing at \`member\`, \`ON DELETE SET NULL\`; \`opened_at\` required; \`closed_at\` optional but never before \`opened_at\`; \`summary\` required.

Then demonstrate each action on throw-away rows and **clean up after yourself**: when the lesson ends the database should contain the two founders and three tools, and no bookings or tickets.`,
      tasks: [
        "While keys are still off: insert a member with plan_id 99, run PRAGMA foreign_key_check to catch it, then delete that member",
        "PRAGMA foreign_keys = ON, then a marked -- expect error: the same orphan insert is now refused. Create booking and maintenance_ticket",
        "CASCADE demo: a scratch tool 'ZZ-99' gets a ticket, delete the tool, SELECT COUNT(*) AS tickets_left FROM maintenance_ticket. Also mark -- expect error a booking for member 999",
        "RESTRICT demo: book member 1 on tool 1, then a marked -- expect error deleting member 1; remove the booking. SET NULL demo: a temp volunteer reports a ticket, delete the volunteer, SELECT summary, reported_by, then delete the ticket",
      ],
      starterAdd: sql`-- ── ✏️ YOUR TURN ───────────────────────────
-- Lesson 5: foreign keys.
--
-- 1. Foreign keys are still OFF. Insert a member with plan_id = 99 (no such plan):
--      INSERT INTO member (email, badge_no, full_name, plan_id) VALUES ('ghost@mail.example', 'B-9999', 'Ghost Member', 99);
--    It works. Catch it:  PRAGMA foreign_key_check;   then delete the ghost again.
--
-- 2. PRAGMA foreign_keys = ON;   then repeat the ghost insert with  -- expect error  above it.
--    CREATE TABLE booking (...) STRICT and CREATE TABLE maintenance_ticket (...) STRICT per the mission.
--
-- 3. CASCADE: INSERT a scratch tool ('ZZ-99', 'Scratch bench', 'WOOD', 100), give it a ticket,
--    DELETE the tool, then  SELECT COUNT(*) AS tickets_left FROM maintenance_ticket;
--    Also:  -- expect error  on a booking whose member_id is 999.
--
-- 4. RESTRICT: INSERT a booking for member 1 on tool 1 (2026-02-02 10:00 to 11:00),
--    then  -- expect error  on  DELETE FROM member WHERE id = 1;  and remove the booking again.
--    SET NULL: insert a member 'Temp Volunteer' (badge B-8888), a ticket on tool 1 that they reported,
--    delete the volunteer, then  SELECT summary, reported_by FROM maintenance_ticket;
--    and finally delete the ticket so the table is empty again.
`,
      solutionAdd: sql`-- Foreign keys are off until the connection is told otherwise
INSERT INTO member (email, badge_no, full_name, plan_id) VALUES ('ghost@mail.example', 'B-9999', 'Ghost Member', 99);
PRAGMA foreign_key_check;
DELETE FROM member WHERE badge_no = 'B-9999';

PRAGMA foreign_keys = ON;

-- expect error
INSERT INTO member (email, badge_no, full_name, plan_id) VALUES ('ghost@mail.example', 'B-9999', 'Ghost Member', 99);

CREATE TABLE booking (
  id        INTEGER PRIMARY KEY,
  member_id INTEGER NOT NULL REFERENCES member (id) ON DELETE RESTRICT,
  tool_id   INTEGER NOT NULL REFERENCES tool (id) ON DELETE RESTRICT,
  starts_at TEXT    NOT NULL,
  ends_at   TEXT    NOT NULL,
  status    TEXT    NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'completed', 'cancelled', 'no_show')),
  CHECK (ends_at > starts_at)
) STRICT;

CREATE TABLE maintenance_ticket (
  id          INTEGER PRIMARY KEY,
  tool_id     INTEGER NOT NULL REFERENCES tool (id) ON DELETE CASCADE,
  reported_by INTEGER REFERENCES member (id) ON DELETE SET NULL,
  opened_at   TEXT    NOT NULL,
  closed_at   TEXT,
  summary     TEXT    NOT NULL,
  CHECK (closed_at IS NULL OR closed_at >= opened_at)
) STRICT;

-- expect error
INSERT INTO booking (member_id, tool_id, starts_at, ends_at) VALUES (999, 1, '2026-02-02 10:00:00', '2026-02-02 11:00:00');

-- CASCADE: a ticket cannot outlive its tool
INSERT INTO tool (asset_tag, name, workshop_code, hourly_rate_cents) VALUES ('ZZ-99', 'Scratch bench', 'WOOD', 100);
INSERT INTO maintenance_ticket (tool_id, opened_at, summary)
VALUES ((SELECT id FROM tool WHERE asset_tag = 'ZZ-99'), '2026-02-01 09:00:00', 'Wobbly leg');
DELETE FROM tool WHERE asset_tag = 'ZZ-99';
SELECT COUNT(*) AS tickets_left FROM maintenance_ticket;

-- RESTRICT: a member with history cannot be deleted
INSERT INTO booking (member_id, tool_id, starts_at, ends_at)
VALUES (1, 1, '2026-02-02 10:00:00', '2026-02-02 11:00:00');
-- expect error
DELETE FROM member WHERE id = 1;
DELETE FROM booking WHERE starts_at = '2026-02-02 10:00:00';

-- SET NULL: the ticket stays, the reporter is forgotten
INSERT INTO member (email, badge_no, full_name) VALUES ('temp@mail.example', 'B-8888', 'Temp Volunteer');
INSERT INTO maintenance_ticket (tool_id, reported_by, opened_at, summary)
VALUES (1, (SELECT id FROM member WHERE badge_no = 'B-8888'), '2026-02-03 09:00:00', 'Fence out of square');
DELETE FROM member WHERE badge_no = 'B-8888';
SELECT summary, reported_by FROM maintenance_ticket;
DELETE FROM maintenance_ticket;`,
      explanation:
        "While enforcement was off, the orphan went in, and foreign_key_check found it afterwards. With the pragma on, the same insert is refused. CASCADE removed the scratch tool's ticket with it, RESTRICT stopped the deletion of a member who has bookings, and SET NULL kept the ticket but forgot who reported it. Each action matches what the child means without its parent.",
      hints: [
        { id: "h1", title: "The pragma", content: "PRAGMA foreign_keys = ON;  must run before any BEGIN, and again on every new connection. PRAGMA foreign_key_check; returns one row per orphan: table, rowid, parent, fkid." },
        { id: "h2", title: "Actions go on the column", content: "member_id INTEGER NOT NULL REFERENCES member (id) ON DELETE RESTRICT, ... reported_by INTEGER REFERENCES member (id) ON DELETE SET NULL (nullable!), ... tool_id INTEGER NOT NULL REFERENCES tool (id) ON DELETE CASCADE." },
        { id: "h3", title: "Cleaning up", content: "A statement marked -- expect error that gets refused changes nothing, so the only rows to remove are the ones that were accepted: the scratch booking, the volunteer's ticket (the volunteer and the scratch tool were deleted by the demos themselves)." },
      ],
      tests: [
        {
          id: "t1",
          description: "Foreign key enforcement is switched on",
          assertionCode: t`assertEqual(num("PRAGMA foreign_keys"), 1, "PRAGMA foreign_keys (put PRAGMA foreign_keys = ON; in your file, outside any transaction)");
assert(probe("INSERT INTO member (email, badge_no, full_name, plan_id) VALUES ('x@mail.example', 'B-7000', 'X', 99)") !== null, "A member with a plan that does not exist must be refused");`,
        },
        {
          id: "t2",
          description: "booking has its two RESTRICT keys, a status rule and an end-after-start rule",
          assertionCode: t`assert(exists("booking"), "Create the table booking");
for (const c of ["id", "member_id", "tool_id", "starts_at", "ends_at", "status"]) assert(col("booking", c), "booking needs a column called " + c);
for (const c of ["member_id", "tool_id", "starts_at", "ends_at", "status"]) assert(col("booking", c).notnull === 1, "booking." + c + " must be NOT NULL");
assertEqual(String(col("booking", "status").dflt_value).replace(/'/g, ""), "confirmed", "Default status of a booking");
const k = fks("booking");
const m = k.find((f) => f.from === "member_id");
const tl = k.find((f) => f.from === "tool_id");
assert(m && m.table === "member" && String(m.on_delete).toUpperCase() === "RESTRICT", "booking.member_id should reference member ON DELETE RESTRICT");
assert(tl && tl.table === "tool" && String(tl.on_delete).toUpperCase() === "RESTRICT", "booking.tool_id should reference tool ON DELETE RESTRICT");
const ok = "INSERT INTO booking (member_id, tool_id, starts_at, ends_at, status) VALUES (1, 1, '2026-05-01 10:00:00', '2026-05-01 11:00:00', 'confirmed')";
assert(probe(ok) === null, "A normal booking should be accepted: " + probe(ok));
assert(/CHECK/.test(probe(ok.replace("'2026-05-01 11:00:00'", "'2026-05-01 09:00:00'")) || ""), "A booking that ends before it starts must be refused (CHECK)");
assert(/CHECK/.test(probe(ok.replace("'confirmed')", "'sleeping')")) || ""), "booking.status must be one of confirmed / completed / cancelled / no_show");`,
        },
        {
          id: "t3",
          description: "maintenance_ticket has CASCADE on its tool, SET NULL on its reporter and a closing-date rule",
          assertionCode: t`assert(exists("maintenance_ticket"), "Create the table maintenance_ticket");
for (const c of ["id", "tool_id", "reported_by", "opened_at", "closed_at", "summary"]) assert(col("maintenance_ticket", c), "maintenance_ticket needs a column called " + c);
assert(col("maintenance_ticket", "reported_by").notnull === 0, "reported_by is optional (it must be nullable for SET NULL to work)");
assert(col("maintenance_ticket", "closed_at").notnull === 0, "closed_at stays empty until the ticket is closed");
const k = fks("maintenance_ticket");
const a = k.find((f) => f.from === "tool_id");
const b = k.find((f) => f.from === "reported_by");
assert(a && a.table === "tool" && String(a.on_delete).toUpperCase() === "CASCADE", "maintenance_ticket.tool_id should reference tool ON DELETE CASCADE");
assert(b && b.table === "member" && String(b.on_delete).toUpperCase() === "SET NULL", "maintenance_ticket.reported_by should reference member ON DELETE SET NULL");
const err = probe("INSERT INTO maintenance_ticket (tool_id, opened_at, closed_at, summary) VALUES (1, '2026-05-02 10:00:00', '2026-05-01 10:00:00', 'time travel')");
assert(err && /CHECK/.test(err), "A ticket closed before it was opened must be refused (CHECK)");`,
        },
        {
          id: "t4",
          description: "Each action really does what it says",
          assertionCode: t`sandbox(() => {
  query("INSERT INTO tool (asset_tag, name, workshop_code, hourly_rate_cents) VALUES ('T-CASC', 'Cascade probe', 'WOOD', 100)");
  query("INSERT INTO maintenance_ticket (tool_id, opened_at, summary) VALUES ((SELECT id FROM tool WHERE asset_tag = 'T-CASC'), '2026-05-01 09:00:00', 'x')");
  query("DELETE FROM tool WHERE asset_tag = 'T-CASC'");
  assertEqual(num("SELECT COUNT(*) FROM maintenance_ticket WHERE summary = 'x'"), 0, "Tickets left after their tool was deleted");
});
sandbox(() => {
  query("INSERT INTO booking (member_id, tool_id, starts_at, ends_at) VALUES (1, 1, '2026-05-01 10:00:00', '2026-05-01 11:00:00')");
  const err = (() => { try { query("DELETE FROM member WHERE id = 1"); return null; } catch (e) { return String(e.message); } })();
  assert(err && /FOREIGN KEY/.test(err), "Deleting a member who has bookings must be refused");
});
sandbox(() => {
  query("INSERT INTO member (email, badge_no, full_name) VALUES ('v@mail.example', 'B-7001', 'V')");
  query("INSERT INTO maintenance_ticket (tool_id, reported_by, opened_at, summary) VALUES (1, (SELECT id FROM member WHERE badge_no = 'B-7001'), '2026-05-01 09:00:00', 'y')");
  query("DELETE FROM member WHERE badge_no = 'B-7001'");
  const r = one("SELECT COUNT(*) AS n, MAX(reported_by) AS who FROM maintenance_ticket WHERE summary = 'y'");
  assert(r.n === 1 && r.who === null, "The ticket should survive with reported_by = NULL");
});`,
        },
        {
          id: "t5",
          description: "You caught the orphan, saw keys refuse, and left the database clean",
          assertionCode: t`const fc = need(["table", "rowid", "parent", "fkid"], "Run PRAGMA foreign_key_check while the orphan exists");
assert(fc.rows.length >= 1 && fc.rows[0][0] === "member" && fc.rows[0][2] === "plan", "foreign_key_check should report the ghost member's plan_id (child table member, parent plan)");
assertEqual(all("PRAGMA foreign_key_check").length, 0, "Orphan rows left in the database");
assert(accepted().length === 0, "One of your -- expect error statements was accepted: it should have been refused");
assert(refused(/FOREIGN KEY constraint failed/).length >= 3, "Mark three refused statements with -- expect error: the ghost member, a booking for member 999, and deleting member 1");
const left = data(["tickets_left"], "Add SELECT COUNT(*) AS tickets_left FROM maintenance_ticket after deleting the scratch tool")[0];
assertEqual(left.tickets_left, 0, "tickets_left");
const sn = data(["summary", "reported_by"], "Add SELECT summary, reported_by FROM maintenance_ticket after deleting the volunteer");
assert(sn.length === 1 && sn[0].reported_by === null, "The ticket should remain, with reported_by NULL");
assertEqual([num("SELECT COUNT(*) FROM member"), num("SELECT COUNT(*) FROM tool"), num("SELECT COUNT(*) FROM booking"), num("SELECT COUNT(*) FROM maintenance_ticket")], [2, 3, 0, 0], "Rows left in member, tool, booking, maintenance_ticket (clean up your scratch rows)");`,
        },
      ],
      unlocks: ["ss-links"],
      checks: [
        {
          prompt: "Your schema declares `REFERENCES plan (id)` but you never ran `PRAGMA foreign_keys = ON`. What happens when you insert a member with `plan_id = 99` and no such plan exists?",
          question: { type: "choice", options: ["It is refused: the REFERENCES clause is enough", "It is accepted: enforcement is off by default in SQLite", "It is accepted and plan_id becomes NULL"], answer: 1 },
          explanation: "The clause is stored but not enforced until the connection turns the pragma on. PRAGMA foreign_key_check will still list such orphans.",
        },
        {
          prompt: "Which action fits `maintenance_ticket.reported_by`, the volunteer who first reported the fault?",
          question: { type: "choice", options: ["ON DELETE CASCADE", "ON DELETE RESTRICT", "ON DELETE SET NULL"], answer: 2 },
          explanation: "The ticket is still meaningful if the reporter leaves: keep it and forget who raised it. CASCADE would erase repair history; RESTRICT would stop you removing a member for a trivial reason.",
        },
      ],
    },

    // ───────────────────────────── 6 ─────────────────────────────
    {
      id: "schema-studio-6-normal",
      title: "Normalising a messy sheet",
      minutes: 32,
      xp: 160,
      concepts: ["functional dependencies", "1NF / 2NF / 3NF", "update anomalies", "INSERT ... SELECT", "reconciliation", "when to denormalise"],
      learn: md`### Why the spreadsheet disagrees with itself

\`legacy_sheet\` has one row per tool session, and every row repeats facts that are not about the session at all: the member's name and phone, the tool's rate, the workshop's name, the plan's fee. Repeating a fact is how a database starts lying to you:

- **Update anomaly.** The Maker plan costs 4500. It is typed on dozens of rows. Someone retyped three of them as 4800, and now the sheet says two different things about the same plan. Which is true? Nothing in the data can tell you.
- **Insert anomaly.** You cannot record a new tool until somebody uses it, because tools only exist inside session rows.
- **Delete anomaly.** Delete a member's only session and you lose their phone number with it.

Normalising means moving each fact to the one place where it is stored once.

### Functional dependencies: the question behind every normal form

"\`tool_tag\` determines \`tool_name\`" means: whenever two rows have the same tag, they have the same name. Written \`tool_tag → tool_name\`. The thing on the left is a **determinant**. Good keys are determinants of everything else in their table.

You can test a dependency against real data with a group-and-count that must come back **empty** if it holds:

~~~sql
SELECT tool_tag
FROM legacy_sheet
GROUP BY tool_tag
HAVING COUNT(DISTINCT tool_name) > 1;
~~~

Any row returned is a *violation*: one tag with two different names.

### The normal forms in plain words

A famous one-liner: every column must tell you a fact about **the key, the whole key, and nothing but the key**.

- **1NF: one value per cell, and rows you can tell apart.** The \`certified_tools\` column holds a *list* (\`'WD-01, FB-01'\`). You cannot join on it, count it, or enforce it. Lists become rows (lesson 7).
- **2NF: depend on the whole key.** A session is identified by who, which tool and when. \`member_name\` depends only on *who*, \`tool_rate_cents\` only on *which tool*: partial dependencies. Move them to \`member\` and \`tool\`.
- **3NF: depend on nothing but the key.** \`plan_fee_cents\` depends on \`plan_name\`, which depends on the member. \`workshop_name\` depends on \`workshop_code\`, which depends on the tool. A fact that hangs off another non-key fact belongs in its own table (\`plan\`, \`workshop\`).

Decomposing is mechanical: each determinant becomes the key of a new table, the things it determines move with it, and the original table keeps just the key as a foreign key. A good decomposition is **lossless**: joining the pieces gives back exactly the original rows. That is what the reconciliation query at the end checks.

### When to denormalise (on purpose)

Copying a fact is sometimes right, and the difference from a spreadsheet is that you *decide*, you name the source of truth, and you keep the copy in step:

- **A snapshot that must not change.** The price a member paid last March. If the tool's rate rises, history must not rewrite itself, so a booking or invoice line stores the rate it was charged.
- **A read-heavy summary** that would otherwise be recomputed constantly (a count, a total), maintained by a trigger or a nightly job (lessons 11 and 13).

The mistake is *accidental* duplication: no owner, no rule for staying in sync.

### INSERT ... SELECT, and its sharp edges

~~~sql
INSERT OR IGNORE INTO member (email, badge_no, full_name)
SELECT lower(trim(member_email)), badge_no, member_name
FROM legacy_sheet
GROUP BY lower(trim(member_email));
~~~

- SQLite allows **bare columns in a grouped query**: \`badge_no\` is not in the \`GROUP BY\`, so SQLite picks it from one arbitrary row of the group. That is fine when the column is constant per group (which a dependency test just proved) and dangerous otherwise. Other databases reject the query.
- \`INSERT OR IGNORE\` skips any row that breaks a \`UNIQUE\`, \`NOT NULL\` or \`CHECK\` rule, **silently**. It is right when "already there" is the only possible reason for a conflict (the founders are already members). It is wrong as a general "make errors go away" switch.
- To find the foreign key for a row, **look it up by its natural key**: \`(SELECT id FROM plan WHERE name = plan_name)\`, or a join. An inner \`JOIN\` that finds no match drops the row without a word, so always finish with a reconciliation: count rows in, count rows out.

### Common mistakes

- Normalising by reflex into a table per column. Stop when each fact lives once.
- Trusting a dependency because it "should" hold, instead of testing it.
- Importing without a reconciliation, then discovering months later that 4 rows never arrived.`,
      mission: md`Time to retire the spreadsheet. Its facts belong in the tables you built, and the founders (already members) must not be duplicated.

**1. Audit.** Before moving anything, test five dependencies and count how many groups violate each. One row per dependency, columns \`dependency\` and \`violations\`, with exactly these labels:

- \`tool_tag -> tool_rate_cents\`
- \`tool_tag -> workshop_code\`
- \`workshop_code -> workshop_name\`
- \`badge_no -> plan_name\`
- \`plan_name -> plan_fee_cents\`

Four of them should come back clean. One will not, and it tells you the sheet is lying about a price.

**2. Members.** One row per person, e-mail trimmed and lower-cased, plan looked up by name, \`joined_on\` = the date of their first session. The founders are already there.

**3. Tools.** One row per asset tag, with the name, workshop and rate from the sheet. Afterwards set \`max_session_minutes\` to 240 for every tool (the sheet contains three-hour sessions), and mark the seven tools that need an induction: **WD-01, WD-02, MT-01, MT-02, FB-01, FB-03, CL-02**.

**4. Bookings.** One booking per sheet row. \`starts_at\` is the date and start time as a timestamp (\`'2026-01-05 10:30:00'\`), \`ends_at\` adds the minutes. A note "cancelled by member" becomes status \`cancelled\`, "no show" becomes \`no_show\`, everything else \`completed\`.

**5. Reconcile.** One row: \`sheet_rows\`, \`bookings\`, \`sheet_minutes\`, \`booked_minutes\`. The pairs must match.`,
      tasks: [
        "Audit: five rows with columns dependency and violations, using the five labels in the mission",
        "Import members with INSERT OR IGNORE ... SELECT, grouped by the cleaned e-mail, ordered by badge_no",
        "Import tools (OR IGNORE keeps your three), then UPDATE max_session_minutes to 240 for all, and needs_induction = 1 for the seven listed tags",
        "Import one booking per sheet row, then the reconciliation row (sheet_rows, bookings, sheet_minutes, booked_minutes)",
      ],
      starterAdd: sql`-- ── ✏️ YOUR TURN ───────────────────────────
-- Lesson 6: normalising the spreadsheet.
--
-- 1. Audit. Five rows, columns  dependency, violations  (UNION ALL of five queries).
--    Each counts the groups that break the dependency:
--      SELECT COUNT(*) FROM (SELECT tool_tag FROM legacy_sheet GROUP BY tool_tag HAVING COUNT(DISTINCT tool_name) > 1)
--    Labels: 'tool_tag -> tool_rate_cents', 'tool_tag -> workshop_code', 'workshop_code -> workshop_name',
--            'badge_no -> plan_name', 'plan_name -> plan_fee_cents'
--
-- 2. Members: INSERT OR IGNORE INTO member (email, badge_no, full_name, phone, plan_id, joined_on)
--    SELECT ... FROM legacy_sheet GROUP BY lower(trim(member_email)) ORDER BY badge_no;
--    email = the cleaned e-mail, plan_id = (SELECT id FROM plan WHERE name = plan_name), joined_on = MIN(session_date).
--
-- 3. Tools: INSERT OR IGNORE INTO tool (asset_tag, name, workshop_code, hourly_rate_cents) SELECT ... GROUP BY tool_tag;
--    then  UPDATE tool SET max_session_minutes = 240;
--    and   UPDATE tool SET needs_induction = 1 WHERE asset_tag IN ('WD-01', 'WD-02', 'MT-01', 'MT-02', 'FB-01', 'FB-03', 'CL-02');
--
-- 4. Bookings: INSERT INTO booking (member_id, tool_id, starts_at, ends_at, status)
--    SELECT ... FROM legacy_sheet s JOIN member m ON ... JOIN tool t ON ...  ORDER BY s.entry_id;
--    starts_at = datetime(s.session_date || ' ' || s.start_time)
--    ends_at   = datetime(s.session_date || ' ' || s.start_time, '+' || s.minutes || ' minutes')
--    status    = CASE s.note WHEN 'cancelled by member' THEN 'cancelled' WHEN 'no show' THEN 'no_show' ELSE 'completed' END
--
-- 5. Reconcile: one row  sheet_rows, bookings, sheet_minutes, booked_minutes.
--    Minutes between two timestamps: (strftime('%s', ends_at) - strftime('%s', starts_at)) / 60
`,
      solutionAdd: sql`-- Which facts does the sheet repeat, and does it repeat them consistently?
SELECT 'tool_tag -> tool_rate_cents' AS dependency, COUNT(*) AS violations
FROM (SELECT tool_tag FROM legacy_sheet GROUP BY tool_tag HAVING COUNT(DISTINCT tool_rate_cents) > 1)
UNION ALL
SELECT 'tool_tag -> workshop_code', COUNT(*)
FROM (SELECT tool_tag FROM legacy_sheet GROUP BY tool_tag HAVING COUNT(DISTINCT workshop_code) > 1)
UNION ALL
SELECT 'workshop_code -> workshop_name', COUNT(*)
FROM (SELECT workshop_code FROM legacy_sheet GROUP BY workshop_code HAVING COUNT(DISTINCT workshop_name) > 1)
UNION ALL
SELECT 'badge_no -> plan_name', COUNT(*)
FROM (SELECT badge_no FROM legacy_sheet GROUP BY badge_no HAVING COUNT(DISTINCT plan_name) > 1)
UNION ALL
SELECT 'plan_name -> plan_fee_cents', COUNT(*)
FROM (SELECT plan_name FROM legacy_sheet GROUP BY plan_name HAVING COUNT(DISTINCT plan_fee_cents) > 1);

-- Members: one row per person, e-mail tidied, plan looked up by name
INSERT OR IGNORE INTO member (email, badge_no, full_name, phone, plan_id, joined_on)
SELECT
  lower(trim(member_email)),
  badge_no,
  member_name,
  member_phone,
  (SELECT id FROM plan WHERE name = plan_name),
  MIN(session_date)
FROM legacy_sheet
GROUP BY lower(trim(member_email))
ORDER BY badge_no;

-- Tools: one row per asset tag
INSERT OR IGNORE INTO tool (asset_tag, name, workshop_code, hourly_rate_cents)
SELECT tool_tag, MIN(tool_name), MIN(workshop_code), MIN(tool_rate_cents)
FROM legacy_sheet
GROUP BY tool_tag
ORDER BY tool_tag;

UPDATE tool SET max_session_minutes = 240;
UPDATE tool SET needs_induction = 1
WHERE asset_tag IN ('WD-01', 'WD-02', 'MT-01', 'MT-02', 'FB-01', 'FB-03', 'CL-02');

-- Bookings: one row per spreadsheet row
INSERT INTO booking (member_id, tool_id, starts_at, ends_at, status)
SELECT
  m.id,
  t.id,
  datetime(s.session_date || ' ' || s.start_time),
  datetime(s.session_date || ' ' || s.start_time, '+' || s.minutes || ' minutes'),
  CASE s.note WHEN 'cancelled by member' THEN 'cancelled' WHEN 'no show' THEN 'no_show' ELSE 'completed' END
FROM legacy_sheet s
JOIN member m ON m.email = lower(trim(s.member_email))
JOIN tool t ON t.asset_tag = s.tool_tag
ORDER BY s.entry_id;

-- Reconciliation: nothing lost on the way
SELECT
  (SELECT COUNT(*) FROM legacy_sheet) AS sheet_rows,
  (SELECT COUNT(*) FROM booking) AS bookings,
  (SELECT SUM(minutes) FROM legacy_sheet) AS sheet_minutes,
  (SELECT SUM((strftime('%s', ends_at) - strftime('%s', starts_at)) / 60) FROM booking) AS booked_minutes;`,
      explanation:
        "The audit shows every dependency holds except plan_name -> plan_fee_cents: the sheet gives Maker two different fees, which is exactly the update anomaly normalising removes. Each fact now lives once: people in member, tools in tool (with the rate stored once), sessions in booking. OR IGNORE was safe for members and tools because the only conflict possible was 'already there'. The reconciliation proves the decomposition lost neither rows nor minutes.",
      hints: [
        { id: "h1", title: "One audit row", content: "SELECT 'plan_name -> plan_fee_cents' AS dependency, COUNT(*) AS violations FROM (SELECT plan_name FROM legacy_sheet GROUP BY plan_name HAVING COUNT(DISTINCT plan_fee_cents) > 1)  Repeat for the other four and join them with UNION ALL." },
        { id: "h2", title: "Members", content: "Group by lower(trim(member_email)). The columns not in the GROUP BY (badge_no, member_name, member_phone, plan_name) are constant per person, so SQLite's bare-column rule is safe here. MIN(session_date) gives the first visit." },
        { id: "h3", title: "Bookings", content: "Join sheet to member on member.email = lower(trim(s.member_email)) and to tool on tool.asset_tag = s.tool_tag. If the final count is short, an inner join dropped rows: check the e-mail normalisation." },
      ],
      tests: [
        {
          id: "t1",
          description: "The audit finds the one dependency the sheet breaks",
          assertionCode: t`const rs = data(["dependency", "violations"], "Add the audit: columns dependency and violations");
const want = {
  "tool_tag -> tool_rate_cents": num("SELECT COUNT(*) FROM (SELECT tool_tag FROM legacy_sheet GROUP BY tool_tag HAVING COUNT(DISTINCT tool_rate_cents) > 1)"),
  "tool_tag -> workshop_code": num("SELECT COUNT(*) FROM (SELECT tool_tag FROM legacy_sheet GROUP BY tool_tag HAVING COUNT(DISTINCT workshop_code) > 1)"),
  "workshop_code -> workshop_name": num("SELECT COUNT(*) FROM (SELECT workshop_code FROM legacy_sheet GROUP BY workshop_code HAVING COUNT(DISTINCT workshop_name) > 1)"),
  "badge_no -> plan_name": num("SELECT COUNT(*) FROM (SELECT badge_no FROM legacy_sheet GROUP BY badge_no HAVING COUNT(DISTINCT plan_name) > 1)"),
  "plan_name -> plan_fee_cents": num("SELECT COUNT(*) FROM (SELECT plan_name FROM legacy_sheet GROUP BY plan_name HAVING COUNT(DISTINCT plan_fee_cents) > 1)"),
};
assertEqual(rs.length, 5, "Number of dependencies audited");
for (const [label, n] of Object.entries(want)) {
  const r = rs.find((x) => String(x.dependency).trim() === label);
  assert(r, "No audit row labelled '" + label + "'");
  assertEqual(r.violations, n, "Violations for " + label);
}`,
        },
        {
          id: "t2",
          description: "Every person is a member exactly once, with a tidy e-mail and the right plan",
          assertionCode: t`const people = num("SELECT COUNT(DISTINCT lower(trim(member_email))) FROM legacy_sheet");
assertEqual(num("SELECT COUNT(*) FROM member"), people, "Members (one per person in the sheet, the founders included)");
assertEqual(num("SELECT COUNT(DISTINCT lower(trim(email))) FROM member"), people, "Distinct e-mails after tidying (is anyone in twice?)");
assertEqual(num("SELECT COUNT(*) FROM member WHERE email <> lower(trim(email))"), 0, "Every member e-mail should be trimmed and lower-case");
assertEqual(num("SELECT COUNT(*) FROM member WHERE plan_id IS NULL"), 0, "Every member needs a plan (look it up by name)");
const wrong = num("SELECT COUNT(*) FROM member m JOIN plan p ON p.id = m.plan_id WHERE m.id > 2 AND p.name <> (SELECT plan_name FROM legacy_sheet s WHERE lower(trim(s.member_email)) = m.email LIMIT 1)");
assertEqual(wrong, 0, "Members whose plan differs from the sheet");
assertEqual(num("SELECT COUNT(*) FROM member m WHERE m.id > 2 AND m.joined_on <> (SELECT MIN(session_date) FROM legacy_sheet s WHERE lower(trim(s.member_email)) = m.email)"), 0, "joined_on should be the date of each person's first session");
assertEqual(all("SELECT joined_on FROM member WHERE id <= 2").map((r) => r.joined_on), ["2024-03-01", "2024-03-01"], "The founders must keep their original rows");`,
        },
        {
          id: "t3",
          description: "Eleven tools, one per asset tag, with the right rates, limits and induction flags",
          assertionCode: t`assertEqual(num("SELECT COUNT(*) FROM tool"), num("SELECT COUNT(DISTINCT tool_tag) FROM legacy_sheet"), "Tools (one per asset tag in the sheet)");
assertEqual(num("SELECT COUNT(*) FROM tool x JOIN (SELECT tool_tag, MIN(tool_rate_cents) AS r, MIN(workshop_code) AS w, MIN(tool_name) AS n FROM legacy_sheet GROUP BY tool_tag) s ON s.tool_tag = x.asset_tag WHERE x.hourly_rate_cents = s.r AND x.workshop_code = s.w AND x.name = s.n"), num("SELECT COUNT(*) FROM tool"), "Tools whose name, workshop and rate match the sheet");
assertEqual(num("SELECT COUNT(*) FROM tool WHERE max_session_minutes <> 240"), 0, "Every tool should allow 240-minute sessions");
assertEqual(all("SELECT asset_tag FROM tool WHERE needs_induction = 1 ORDER BY asset_tag").map((r) => r.asset_tag), ["CL-02", "FB-01", "FB-03", "MT-01", "MT-02", "WD-01", "WD-02"], "Tools that need an induction");`,
        },
        {
          id: "t4",
          description: "One booking per sheet row, with real timestamps and the right statuses",
          assertionCode: t`const n = num("SELECT COUNT(*) FROM legacy_sheet");
assertEqual(num("SELECT COUNT(*) FROM booking"), n, "Bookings (one per sheet row)");
assertEqual(num("SELECT COUNT(*) FROM booking b JOIN legacy_sheet s ON s.entry_id = b.id WHERE b.starts_at = datetime(s.session_date || ' ' || s.start_time) AND b.ends_at = datetime(s.session_date || ' ' || s.start_time, '+' || s.minutes || ' minutes')"), n, "Bookings whose start and end match the sheet row with the same number (insert them in entry_id order)");
const st = (s) => num("SELECT COUNT(*) FROM booking WHERE status = '" + s + "'");
assertEqual(st("cancelled"), num("SELECT COUNT(*) FROM legacy_sheet WHERE note = 'cancelled by member'"), "Cancelled bookings");
assertEqual(st("no_show"), num("SELECT COUNT(*) FROM legacy_sheet WHERE note = 'no show'"), "No-show bookings");
assertEqual(st("completed"), num("SELECT COUNT(*) FROM legacy_sheet WHERE note IS NULL"), "Completed bookings");
assertEqual(num("SELECT COUNT(*) FROM booking b JOIN legacy_sheet s ON s.entry_id = b.id JOIN member m ON m.id = b.member_id JOIN tool t ON t.id = b.tool_id WHERE m.email = lower(trim(s.member_email)) AND t.asset_tag = s.tool_tag"), n, "Bookings that point at the same member and tool as their sheet row");
assertEqual(all("PRAGMA foreign_key_check").length, 0, "Orphan rows after the import");`,
        },
        {
          id: "t5",
          description: "The reconciliation row shows nothing was lost",
          assertionCode: t`const r = data(["sheet_rows", "bookings", "sheet_minutes", "booked_minutes"], "Add the reconciliation row: sheet_rows, bookings, sheet_minutes, booked_minutes")[0];
assertEqual(r.sheet_rows, num("SELECT COUNT(*) FROM legacy_sheet"), "sheet_rows");
assertEqual(r.bookings, r.sheet_rows, "bookings should equal sheet_rows");
assertEqual(r.sheet_minutes, num("SELECT SUM(minutes) FROM legacy_sheet"), "sheet_minutes");
assertEqual(r.booked_minutes, r.sheet_minutes, "booked_minutes should equal sheet_minutes");`,
        },
      ],
      unlocks: ["ss-refactor"],
      checks: [
        {
          prompt: "In the sheet, `plan_fee_cents` depends on `plan_name`, and `plan_name` depends on the member. Which normal form does storing `plan_fee_cents` on every session row break?",
          question: { type: "choice", options: ["1NF: the cell holds a list", "2NF only", "3NF: a non-key fact depends on another non-key fact"], answer: 2 },
          explanation: "The fee is a fact about the plan, reached through another non-key column (plan_name). Move it to a plan table where it is stored once and cannot disagree with itself.",
        },
        {
          prompt: "Why is `INSERT OR IGNORE` acceptable for the founders but a bad habit in general?",
          question: {
            type: "choice",
            options: [
              "It is slower than a normal INSERT",
              "It silently skips any row that breaks UNIQUE, NOT NULL or CHECK, hiding problems you wanted to hear about",
              "It deletes the existing row",
            ],
            answer: 1,
          },
          explanation: "When 'the row already exists' is the only conflict you can imagine, ignoring it is exactly what you want. But a NOT NULL or CHECK violation is skipped just as quietly, so keep the shortcut for cases where nothing else can go wrong, and reconcile counts afterwards.",
        },
      ],
    },

    // ───────────────────────────── 7 ─────────────────────────────
    {
      id: "schema-studio-7-junction",
      title: "Many-to-many with a junction table",
      minutes: 26,
      xp: 130,
      concepts: ["junction table", "composite primary key", "WITHOUT ROWID", "splitting a list cell", "reverse-lookup index"],
      learn: md`### Why you can't put N:M in a column

A member holds certificates for many tools, and a tool has many certified members. Try to store that in either table and you get a list in a cell (breaks 1NF, cannot be joined or constrained) or a row copied per pair (breaks everything else). The model has a third thing in it: **the certificate itself**, one per pair. It gets a table of its own: a **junction table** (also: link table, bridge table, associative table).

~~~sql
CREATE TABLE certification (
  member_id    INTEGER NOT NULL REFERENCES member (id) ON DELETE CASCADE,
  tool_id      INTEGER NOT NULL REFERENCES tool (id)   ON DELETE CASCADE,
  certified_on TEXT    NOT NULL,
  PRIMARY KEY (member_id, tool_id)
) STRICT, WITHOUT ROWID;
~~~

Design choices worth understanding:

- **The primary key is the pair.** A member either holds a certificate for a tool or does not. \`PRIMARY KEY (member_id, tool_id)\` makes a duplicate impossible, and you need no separate \`id\`: a surrogate would just give you a second way to be wrong (two rows for one pair with different ids).
- **Both columns are foreign keys**, usually with \`CASCADE\`: a certificate is meaningless once either side is gone.
- **The table can carry its own facts.** \`certified_on\` belongs to the pair, not to a member or a tool. When a junction accumulates facts and its own history (a booking has start, end, status, price) it has grown into a full entity, and that is a good sign, not a problem.
- **\`WITHOUT ROWID\`** stores the table *as* its primary-key index instead of keeping a hidden row number plus a separate index. For narrow tables keyed by a composite key it saves space and one lookup. It requires an explicit \`PRIMARY KEY\`, and it is not worth it for wide rows.

### The index you have to add yourself

The primary key is sorted by \`(member_id, tool_id)\`, so "which tools does member 5 hold?" is fast. "Which members hold the table saw?" starts from the *second* column and cannot use that ordering. Add the reverse index: \`CREATE INDEX certification_by_tool ON certification (tool_id);\`. (Why leading columns matter is the heart of lesson 8.)

### Untangling a list cell

The sheet stores each member's certificates as text such as \`'WD-01, MT-02'\` (and sometimes \`'WD-01,MT-02'\`, with no space). One neat way to turn that into rows is to dress it as a JSON array and let \`json_each\` unnest it:

~~~sql
SELECT j.value
FROM legacy_sheet s,
     json_each('["' || replace(replace(s.certified_tools, ' ', ''), ',', '","') || '"]') AS j;
~~~

\`replace\` strips the spaces and turns every comma into \`","\`, so \`WD-01,MT-02\` becomes \`["WD-01","MT-02"]\`. A NULL list gives NULL, and \`json_each(NULL)\` yields no rows, which is exactly right for someone with no certificates.

### Let the constraints find the dirty data

In the sheet, one member's list says \`FB-1\` where the tool is \`FB-01\`. If you look the tool up with a subquery (\`SELECT id FROM tool WHERE asset_tag = ...\`), that tag finds nothing, the subquery returns \`NULL\`, and \`tool_id NOT NULL\` refuses the insert with \`NOT NULL constraint failed: certification.tool_id\`. That is the schema doing its job. Decide deliberately what to do about the bad value (here: it is clearly a typo, repair it) instead of letting an inner join discard it.

Notice the contrast: an inner \`JOIN\` on the tag would have quietly **dropped** the pair, and the member would have lost a certificate nobody noticed.

### Common mistakes

- Giving the junction an \`id\` and forgetting the unique pair.
- Forgetting the second index, then wondering why "everyone certified on X" is slow.
- Using \`ON DELETE CASCADE\` on a junction that is really a financial record.
- Counting through a junction with an inner join and silently excluding the zero rows (use \`LEFT JOIN\`).`,
      mission: md`The sheet's \`certified_tools\` column is the last 1NF violation. Fix it.

Create **\`certification\`** as shown above (\`STRICT\`, \`WITHOUT ROWID\`, composite primary key, both keys \`ON DELETE CASCADE\`) plus the reverse index \`certification_by_tool\`. Then fill it from the sheet: one row per member per tool, with \`certified_on\` = the member's \`joined_on\` for now (the sheet does not know better).

The list for one member contains a typo, \`FB-1\`: it means \`FB-01\`. Repair it as you load. Do **not** drop it.

Then ask the junction two questions:

- For each tool that needs an induction: how many members hold it? (\`asset_tag\`, \`name\`, \`certified_members\`; most certified first, ties by tag; include tools nobody has)
- For each member with at least one certificate: which ones? (\`full_name\`, \`certified_on\` as a list of tags; the member with the most first, ties by name)`,
      tasks: [
        "Create certification (composite primary key, both keys ON DELETE CASCADE, STRICT, WITHOUT ROWID) and the index certification_by_tool on tool_id",
        "Load it from legacy_sheet with json_each, repairing the FB-1 typo. Use a subquery to find tool_id so a bad tag would be refused, not dropped",
        "Mark -- expect error: certifying Odile (member 1) for the table saw a second time",
        "Report A: asset_tag, name, certified_members for every tool that needs an induction. Report B: full_name, certified_on (a list of tags) per certified member",
      ],
      starterAdd: sql`-- ── ✏️ YOUR TURN ───────────────────────────
-- Lesson 7: many-to-many.
--
-- 1. CREATE TABLE certification (member_id, tool_id, certified_on, PRIMARY KEY (member_id, tool_id)) STRICT, WITHOUT ROWID;
--    both keys REFERENCES ... ON DELETE CASCADE.   Then:  CREATE INDEX certification_by_tool ON certification (tool_id);
--
-- 2. Load it. For every sheet row, split certified_tools into tags:
--      FROM legacy_sheet s, json_each('["' || replace(replace(s.certified_tools, ' ', ''), ',', '","') || '"]') AS j
--    j.value is one tag. Join the member by cleaned e-mail; find tool_id with a SUBQUERY on tool.asset_tag
--    (so an unknown tag is refused, not silently dropped). Repair 'FB-1' -> 'FB-01'. SELECT DISTINCT,
--    because every session repeats the member's list. certified_on = member.joined_on.
--
-- 3. Mark with  -- expect error:  INSERT INTO certification ... for member 1 and tool WD-01 (already certified).
--
-- 4. Report A  (asset_tag, name, certified_members): every tool with needs_induction = 1, LEFT JOIN so tools
--    nobody holds still appear, ORDER BY certified_members DESC, asset_tag.
--    Report B  (full_name, certified_on): GROUP_CONCAT(tool.asset_tag, ' ') per member, most certificates first, then name.
`,
      solutionAdd: sql`CREATE TABLE certification (
  member_id    INTEGER NOT NULL REFERENCES member (id) ON DELETE CASCADE,
  tool_id      INTEGER NOT NULL REFERENCES tool (id) ON DELETE CASCADE,
  certified_on TEXT    NOT NULL,
  PRIMARY KEY (member_id, tool_id)
) STRICT, WITHOUT ROWID;

CREATE INDEX certification_by_tool ON certification (tool_id);

INSERT INTO certification (member_id, tool_id, certified_on)
SELECT DISTINCT
  m.id,
  (SELECT t.id FROM tool t WHERE t.asset_tag = CASE j.value WHEN 'FB-1' THEN 'FB-01' ELSE j.value END),
  m.joined_on
FROM legacy_sheet s
JOIN member m ON m.email = lower(trim(s.member_email))
JOIN json_each('["' || replace(replace(s.certified_tools, ' ', ''), ',', '","') || '"]') j;

-- expect error
INSERT INTO certification (member_id, tool_id, certified_on) VALUES (1, (SELECT id FROM tool WHERE asset_tag = 'WD-01'), '2026-03-01');

SELECT t.asset_tag, t.name, COUNT(c.member_id) AS certified_members
FROM tool t
LEFT JOIN certification c ON c.tool_id = t.id
WHERE t.needs_induction = 1
GROUP BY t.id
ORDER BY certified_members DESC, t.asset_tag;

SELECT m.full_name, GROUP_CONCAT(t.asset_tag, ' ') AS certified_on
FROM member m
JOIN certification c ON c.member_id = m.id
JOIN tool t ON t.id = c.tool_id
GROUP BY m.id
ORDER BY COUNT(*) DESC, m.full_name;`,
      explanation:
        "The pair is the primary key, so a duplicate certificate is impossible, and both keys cascade because a certificate means nothing without its member or its tool. Looking the tool up with a subquery made the typo visible instead of letting an inner join drop it; repairing 'FB-1' keeps that member's certificate. The reverse index serves 'who holds this tool', which the primary key's column order cannot.",
      hints: [
        { id: "h1", title: "Unnest the list", content: "FROM legacy_sheet s JOIN member m ON m.email = lower(trim(s.member_email)) JOIN json_each('[\"' || replace(replace(s.certified_tools, ' ', ''), ',', '\",\"') || '\"]') j  — j.value is one tag per row. SELECT DISTINCT removes the repeats across a member's sessions." },
        { id: "h2", title: "Find the tool, don't join it", content: "(SELECT t.id FROM tool t WHERE t.asset_tag = CASE j.value WHEN 'FB-1' THEN 'FB-01' ELSE j.value END) returns NULL for an unknown tag, and tool_id NOT NULL then refuses the row. An inner JOIN would have lost it without a word." },
        { id: "h3", title: "Count with zeros", content: "Report A starts from tool and LEFT JOINs certification, so a tool nobody holds shows 0: SELECT t.asset_tag, t.name, COUNT(c.member_id) ... WHERE t.needs_induction = 1 GROUP BY t.id." },
      ],
      tests: [
        {
          id: "t1",
          description: "certification is a junction: composite key, cascading keys, WITHOUT ROWID and a reverse index",
          assertionCode: t`assert(exists("certification"), "Create the table certification");
for (const c of ["member_id", "tool_id", "certified_on"]) {
  const k = col("certification", c);
  assert(k && k.notnull === 1, "certification." + c + " must exist and be NOT NULL");
}
assert(col("certification", "member_id").pk > 0 && col("certification", "tool_id").pk > 0, "PRIMARY KEY (member_id, tool_id): both columns belong to the key");
assert(!cols("certification").some((c) => c.name === "id"), "A junction table needs no surrogate id: the pair is the key");
const k = fks("certification");
const a = k.find((f) => f.from === "member_id");
const b = k.find((f) => f.from === "tool_id");
assert(a && a.table === "member" && String(a.on_delete).toUpperCase() === "CASCADE", "certification.member_id should reference member ON DELETE CASCADE");
assert(b && b.table === "tool" && String(b.on_delete).toUpperCase() === "CASCADE", "certification.tool_id should reference tool ON DELETE CASCADE");
const tl = all("PRAGMA table_list").find((r) => r.name === "certification");
assert(tl && tl.strict === 1 && tl.wr === 1, "certification should be STRICT and WITHOUT ROWID: ) STRICT, WITHOUT ROWID;");
assert(indexes("certification").some((i) => i.origin === "c" && indexCols(i.name)[0] === "tool_id"), "Add an index that starts with tool_id, so 'who holds this tool' is fast (certification_by_tool)");`,
        },
        {
          id: "t2",
          description: "Every certificate in the sheet is a row, the FB-1 typo repaired, nothing invented",
          assertionCode: t`const sheet = all("SELECT DISTINCT lower(trim(member_email)) AS email, certified_tools FROM legacy_sheet WHERE certified_tools IS NOT NULL");
const want = new Set();
for (const r of sheet) for (const tag of r.certified_tools.split(",").map((x) => x.trim())) want.add(r.email + " | " + (tag === "FB-1" ? "FB-01" : tag));
const got = new Set(all("SELECT m.email AS email, t.asset_tag AS tag FROM certification c JOIN member m ON m.id = c.member_id JOIN tool t ON t.id = c.tool_id").map((r) => r.email + " | " + r.tag));
for (const w of want) assert(got.has(w), "Missing certificate: " + w + (w.endsWith("FB-01") ? " (did you repair the FB-1 typo?)" : ""));
for (const g of got) assert(want.has(g), "A certificate that is not in the sheet: " + g);
assertEqual(num("SELECT COUNT(*) FROM certification WHERE certified_on IS NULL OR certified_on = ''"), 0, "certified_on must be filled");
assertEqual(num("SELECT COUNT(*) FROM certification c JOIN member m ON m.id = c.member_id WHERE c.certified_on <> m.joined_on"), 0, "certified_on should be the member's joined_on for now");`,
        },
        {
          id: "t3",
          description: "The pair can only exist once",
          assertionCode: t`const err = probe("INSERT INTO certification (member_id, tool_id, certified_on) VALUES (1, (SELECT id FROM tool WHERE asset_tag = 'WD-01'), '2026-03-01')");
assert(err && /UNIQUE/.test(err), "Certifying the same member for the same tool twice must be refused (UNIQUE), got: " + err);
assert(accepted().length === 0, "One of your -- expect error statements was accepted: it should have been refused");
assert(refused(/UNIQUE constraint failed: certification\./).length >= 1, "Mark a duplicate certification INSERT with -- expect error");`,
        },
        {
          id: "t4",
          description: "Report A counts certified members per tool, tools nobody holds included",
          assertionCode: t`const rs = data(["asset_tag", "name", "certified_members"], "Add report A: asset_tag, name, certified_members", /certification/);
const want = all("SELECT t.asset_tag, t.name, COUNT(c.member_id) AS certified_members FROM tool t LEFT JOIN certification c ON c.tool_id = t.id WHERE t.needs_induction = 1 GROUP BY t.id ORDER BY certified_members DESC, t.asset_tag");
assertEqual(rs.length, want.length, "Rows in report A (every tool that needs an induction)");
rs.forEach((r, i) => assert(r.asset_tag === want[i].asset_tag && r.certified_members === want[i].certified_members, "Report A row " + (i + 1) + ": expected " + want[i].asset_tag + " with " + want[i].certified_members + ", got " + r.asset_tag + " with " + r.certified_members));`,
        },
        {
          id: "t5",
          description: "Report B lists each certified member's tags, most certificates first",
          assertionCode: t`const rs = data(["full_name", "certified_on"], "Add report B: full_name, certified_on", /certification/, /certified_members/);
const want = all("SELECT m.full_name, COUNT(*) AS n FROM member m JOIN certification c ON c.member_id = m.id GROUP BY m.id ORDER BY n DESC, m.full_name");
assertEqual(rs.length, want.length, "Rows in report B (members with at least one certificate)");
rs.forEach((r, i) => {
  assertEqual(r.full_name, want[i].full_name, "Report B row " + (i + 1) + " (most certificates first, ties by name)");
  const tags = String(r.certified_on).split(/[ ,]+/).filter(Boolean);
  assertEqual(tags.length, want[i].n, "Number of tags listed for " + r.full_name);
});`,
        },
      ],
      unlocks: ["ss-junction"],
      checks: [
        {
          prompt: "Why does `certification` have no `id` column of its own?",
          question: {
            type: "choice",
            options: [
              "SQLite does not allow ids on WITHOUT ROWID tables",
              "The pair (member_id, tool_id) already identifies a certificate, and a second id would let the same pair exist twice",
              "Junction tables can never be referenced by other tables",
            ],
            answer: 1,
          },
          explanation: "Identity comes from the pair. A surrogate key would not be wrong in itself, but you would then still need a unique constraint on the pair, and without it two rows for one pair would sit side by side with different ids.",
        },
        {
          prompt: "You look a tool up with a scalar subquery and one tag does not exist. With `tool_id INTEGER NOT NULL`, what happens to the INSERT?",
          question: { type: "choice", options: ["The row is skipped quietly", "The subquery returns NULL and the NOT NULL constraint refuses the statement", "The row is inserted with tool_id 0"], answer: 1 },
          explanation: "A scalar subquery with no match returns NULL. NOT NULL then turns a silent data-quality problem into a loud error you must decide about. An inner JOIN, by contrast, would have dropped the row without a word.",
        },
      ],
    },

    // ───────────────────────────── 8 ─────────────────────────────
    {
      id: "schema-studio-8-indexes",
      title: "Indexes and query plans",
      minutes: 30,
      xp: 150,
      concepts: ["B-tree index", "EXPLAIN QUERY PLAN", "SCAN vs SEARCH", "composite index column order", "covering index", "cost of indexes"],
      learn: md`### The problem an index solves

\`door_log\` holds 9,000 swipes from the badge reader at the front door, and it grows by a hundred a day. To answer "who came in on 14 February?" with no index, SQLite reads **every row** and tests each one. That is a *scan*. At 9,000 rows nobody notices. At 90 million, your page hangs.

An **index** is a second, sorted copy of one or more columns, kept as a B-tree, with a pointer back to the row. Finding a value in a sorted structure takes a handful of steps instead of a pass over everything: a *search*.

~~~sql
CREATE INDEX door_log_time ON door_log (swiped_at);
~~~

### Ask the database what it will do

You do not guess whether an index is used; you ask:

~~~sql
EXPLAIN QUERY PLAN
SELECT id, badge_no FROM door_log
WHERE swiped_at >= '2026-02-14' AND swiped_at < '2026-02-15';
~~~

The answer is a few lines of text. Learn to read four phrases:

- \`SCAN door_log\`: read the whole table. Fine for small tables, a red flag for big ones.
- \`SEARCH door_log USING INDEX door_log_time (swiped_at>? AND swiped_at<?)\`: jump into the index at the start of the range and walk to its end. The text in brackets shows which parts of your \`WHERE\` the index handled.
- \`USING COVERING INDEX\`: the index alone held every column the query needed, so the table was never touched at all. The fastest kind.
- \`USE TEMP B-TREE FOR ORDER BY\`: SQLite had to sort the results itself because no index supplied the order.

### Composite indexes: order is everything

An index on \`(badge_no, swiped_at)\` is sorted by badge first, then by time *within* each badge, like a phone book sorted by surname then first name. It can answer:

- all swipes for one badge, **fast** (leading column)
- all swipes for one badge in a date range, **fast** (leading equality, then a range on the next column)
- all swipes on a date, **not usefully**: the dates are scattered across every badge, like looking for everyone called Anna in a phone book sorted by surname.

The rule of thumb: put **equality** columns first, then at most one **range** column. An index is usable only through its **leftmost prefix**.

### Covering indexes

If the query only needs columns that are *in the index*, SQLite never reads the table. \`SELECT swiped_at FROM door_log WHERE badge_no = ?\` is covered by \`(badge_no, swiped_at)\`. Select \`reader\` too and the index is no longer enough, so it has to fetch the rows. Selecting only what you need is a performance feature.

### Indexes are not free

- Every \`INSERT\`, \`UPDATE\` and \`DELETE\` must update **every** index on the table. Ten indexes make writes roughly ten times more work.
- Indexes take disk space and cache.
- An index on a column with only a few distinct values (a 0/1 flag) rarely helps: it still points at half the table.

So index for the queries you actually run, check the plan, and remove indexes nothing uses.

### When the planner won't use your index

- A function wrapped around the column: \`WHERE substr(swiped_at, 1, 10) = '2026-02-14'\` hides the column (lesson 9 fixes that).
- A leading wildcard: \`LIKE '%saw'\`.
- Comparing text to a number, or two different collations.
- Low selectivity: if most rows match, a scan is cheaper than a million index hops.

Two last notes: your primary keys and \`UNIQUE\` constraints are already indexes, and **foreign-key child columns are not**. If you often delete or look up through a child key, index it.

### Common mistakes

- Creating an index and never running \`EXPLAIN QUERY PLAN\` to see if it is used.
- One index per column "just in case" instead of a composite for the real query.
- Putting the range column before the equality column.`,
      mission: md`The front-door log is the biggest table you have and the founders ask three questions of it all day:

1. *Who swiped in on a given day?* (a time range)
2. *When did one member come and go in a month?* (one badge, a time range)
3. *When did one member swipe, full stop?* (one badge, and only the time is needed)

Measure first, then fix. For each question, look at the plan before and after you add an index. Use these queries (feel free to change the dates):

- Day: \`SELECT id, badge_no, swiped_at FROM door_log WHERE swiped_at >= '2026-02-14' AND swiped_at < '2026-02-15'\`
- Member and month: \`SELECT id, swiped_at, reader FROM door_log WHERE badge_no = 'B-1007' AND swiped_at >= '2026-02-01' AND swiped_at < '2026-03-01'\`
- Covered: \`SELECT swiped_at FROM door_log WHERE badge_no = 'B-1007'\``,
      tasks: [
        "EXPLAIN QUERY PLAN for the day query: it should say SCAN. Then CREATE INDEX door_log_time ON door_log (swiped_at) and explain the same query again",
        "CREATE INDEX door_log_badge_time ON door_log (badge_no, swiped_at) and explain the member-and-month query",
        "Explain the covered query (only swiped_at, filtered by badge_no): it should be a COVERING INDEX search",
        "SELECT COUNT(*) AS door_log_indexes FROM pragma_index_list('door_log') to see what you are paying to maintain",
      ],
      starterAdd: sql`-- ── ✏️ YOUR TURN ───────────────────────────
-- Lesson 8: indexes and query plans.
--
-- 1. The day query, before and after.
--      EXPLAIN QUERY PLAN SELECT id, badge_no, swiped_at FROM door_log
--      WHERE swiped_at >= '2026-02-14' AND swiped_at < '2026-02-15';
--    Read it (SCAN). Then CREATE INDEX door_log_time ON door_log (swiped_at); and EXPLAIN the SAME query again (SEARCH).
--
-- 2. One member in one month: first create the composite index (equality column first, range column second):
--      CREATE INDEX door_log_badge_time ON door_log (badge_no, swiped_at);
--    then EXPLAIN QUERY PLAN SELECT id, swiped_at, reader FROM door_log
--         WHERE badge_no = 'B-1007' AND swiped_at >= '2026-02-01' AND swiped_at < '2026-03-01';
--
-- 3. A covered query: EXPLAIN QUERY PLAN SELECT swiped_at FROM door_log WHERE badge_no = 'B-1007';
--
-- 4. What it costs:  SELECT COUNT(*) AS door_log_indexes FROM pragma_index_list('door_log');
`,
      solutionAdd: sql`EXPLAIN QUERY PLAN
SELECT id, badge_no, swiped_at FROM door_log
WHERE swiped_at >= '2026-02-14' AND swiped_at < '2026-02-15';

CREATE INDEX door_log_time ON door_log (swiped_at);

EXPLAIN QUERY PLAN
SELECT id, badge_no, swiped_at FROM door_log
WHERE swiped_at >= '2026-02-14' AND swiped_at < '2026-02-15';

CREATE INDEX door_log_badge_time ON door_log (badge_no, swiped_at);

EXPLAIN QUERY PLAN
SELECT id, swiped_at, reader FROM door_log
WHERE badge_no = 'B-1007' AND swiped_at >= '2026-02-01' AND swiped_at < '2026-03-01';

EXPLAIN QUERY PLAN
SELECT swiped_at FROM door_log WHERE badge_no = 'B-1007';

SELECT COUNT(*) AS door_log_indexes FROM pragma_index_list('door_log');`,
      explanation:
        "Without an index the day query is a SCAN of all 9,000 rows; with an index on swiped_at the same query becomes a SEARCH over just that day's range. The composite index on (badge_no, swiped_at) serves the equality-then-range query, because badge_no (equality) leads. The covered query never touches the table at all, since the index holds both the filter column and the selected column. Each of those indexes now has to be maintained on every future swipe.",
      hints: [
        { id: "h1", title: "Same query twice", content: "Run EXPLAIN QUERY PLAN on the identical SELECT before and after CREATE INDEX. The first plan says SCAN door_log, the second says SEARCH door_log USING INDEX door_log_time (swiped_at>? AND swiped_at<?)." },
        { id: "h2", title: "Order the columns", content: "CREATE INDEX door_log_badge_time ON door_log (badge_no, swiped_at);  badge_no is compared with = so it goes first; swiped_at is a range so it comes second. The plan's brackets should show badge_no=? AND swiped_at>? AND swiped_at<?." },
        { id: "h3", title: "Covering", content: "If the SELECT list only names columns that are in the index (badge_no, swiped_at), the plan says USING COVERING INDEX. Add reader to the SELECT list and it no longer can." },
      ],
      tests: [
        {
          id: "t1",
          description: "Before the index, filtering by time is a SCAN",
          assertionCode: t`const before = plans().find((p) => /door_log/.test(p.sql) && /swiped_at/.test(p.sql) && !/badge_no\s*=/.test(p.sql) && p.details.some((d) => /^SCAN door_log/.test(d)));
assert(before, "Run EXPLAIN QUERY PLAN on the day query BEFORE creating any index on door_log: its plan should say SCAN door_log");`,
        },
        {
          id: "t2",
          description: "An index on swiped_at turns the same query into a SEARCH",
          assertionCode: t`assert(indexes("door_log").some((i) => indexCols(i.name)[0] === "swiped_at"), "Create an index whose first column is swiped_at (door_log_time)");
const all_ = plans().filter((p) => /door_log/.test(p.sql) && /swiped_at/.test(p.sql) && !/badge_no\s*=/.test(p.sql));
const firstScan = all_.findIndex((p) => p.details.some((d) => /^SCAN door_log/.test(d)));
const lastSearch = all_.map((p, i) => (p.details.some((d) => /^SEARCH door_log USING (COVERING )?INDEX \w+ \(swiped_at/.test(d)) ? i : -1)).filter((i) => i >= 0).pop();
assert(lastSearch !== undefined, "Explain the day query again AFTER creating the index: it should say SEARCH door_log USING INDEX ... (swiped_at>? AND swiped_at<?)");
assert(lastSearch > firstScan, "The SEARCH plan should come after the SCAN plan in your file");`,
        },
        {
          id: "t3",
          description: "The composite index puts the equality column first, and the planner uses both columns",
          assertionCode: t`const ix = indexes("door_log").find((i) => indexCols(i.name).slice(0, 2).join() === "badge_no,swiped_at");
assert(ix, "Create a composite index on (badge_no, swiped_at), in that order");
const p = planFor(/badge_no/) && plans().filter((x) => /badge_no/.test(x.sql) && /swiped_at\s*(>|<|between)/.test(x.sql));
assert(p && p.length, "Run EXPLAIN QUERY PLAN on the member-and-month query (badge_no equal, swiped_at in a range)");
const d = p[p.length - 1].details.join(" | ");
assert(/^SEARCH door_log USING (COVERING )?INDEX \w+ \(badge_no=\? AND swiped_at/.test(d), "The plan should search with badge_no=? first and then the swiped_at range, got: " + d);`,
        },
        {
          id: "t4",
          description: "A query that only needs swiped_at is answered from the index alone",
          assertionCode: t`const p = plans().filter((x) => /badge_no\s*=/.test(x.sql) && !/swiped_at\s*(>|<|between)/.test(x.sql) && !/reader/.test(x.sql));
assert(p.length, "Explain: SELECT swiped_at FROM door_log WHERE badge_no = 'B-1007'");
assert(p[p.length - 1].details.some((d) => /USING COVERING INDEX/.test(d)), "That query should be a COVERING INDEX search, got: " + p[p.length - 1].details.join(" | "));`,
        },
        {
          id: "t5",
          description: "You counted the indexes door_log now has to maintain",
          assertionCode: t`const r = data(["door_log_indexes"], "Add SELECT COUNT(*) AS door_log_indexes FROM pragma_index_list('door_log')")[0];
assertEqual(r.door_log_indexes, indexes("door_log").length, "door_log_indexes");
assert(r.door_log_indexes >= 2, "door_log should have at least your two indexes");`,
        },
      ],
      unlocks: ["ss-plan"],
      checks: [
        {
          prompt: "A table has an index on `(badge_no, swiped_at)`. Which query can use it as a SEARCH?",
          question: {
            type: "choice",
            options: [
              "WHERE swiped_at >= '2026-02-14'  (no badge condition)",
              "WHERE badge_no = 'B-1007'",
              "WHERE swiped_at = '2026-02-14 09:00:00' AND reader = 'front'",
            ],
            answer: 1,
          },
          explanation: "A composite index works through its leftmost prefix. badge_no is the leading column, so a condition on it alone can use the index; a condition on swiped_at alone cannot, as the times are scattered across every badge.",
        },
        {
          prompt: "Which plan line means the query was answered without ever reading the table itself?",
          question: {
            type: "choice",
            options: ["SCAN door_log", "SEARCH door_log USING INDEX door_log_time (swiped_at>?)", "SEARCH door_log USING COVERING INDEX door_log_badge_time (badge_no=?)"],
            answer: 2,
          },
          explanation: "COVERING INDEX means every column the query needed was stored in the index, so SQLite never looked up the table rows.",
        },
        {
          prompt: "What is the main cost of adding more and more indexes to a busy table?",
          question: { type: "choice", options: ["Reads get slower", "Every write must update every index", "SELECT statements need more memory"], answer: 1 },
          explanation: "Each INSERT, UPDATE or DELETE has to maintain all the table's indexes, so write cost grows with the number of indexes (plus disk space). Keep the ones the plan shows you really use.",
        },
      ],
    },
  ],
};
