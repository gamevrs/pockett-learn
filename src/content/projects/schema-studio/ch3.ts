import type { Chapter } from "@/engine/types";
import { md, sql, t } from "./util.ts";

/**
 * Chapter 3: guard rails and atomic changes.
 * Partial and expression indexes, views, triggers, transactions.
 */
export const chapter3: Chapter = {
  id: "guard-rails",
  title: "Guard rails and atomic changes",
  blurb: "Smarter indexes, views as an interface, triggers that keep rules and records, and transactions that change many things at once.",
  lessons: [
    // ───────────────────────────── 9 ─────────────────────────────
    {
      id: "schema-studio-9-smart",
      title: "Partial and expression indexes",
      minutes: 24,
      xp: 140,
      concepts: ["partial index (WHERE)", "unique partial index", "expression index", "matching the query to the index"],
      learn: md`### An index does not have to cover every row

A normal index has one entry for every row. A **partial index** has entries only for rows that satisfy a \`WHERE\` condition you give it:

~~~sql
CREATE INDEX door_log_ins ON door_log (badge_no, swiped_at) WHERE direction = 'in';
~~~

That index is half the size, cheaper to maintain, and ideal when the queries you care about only ever look at one slice ("open tickets", "unpaid invoices", "active members"). The catch: the planner uses it only when it can **prove** the query's \`WHERE\` implies the index's \`WHERE\`. A query that asks for \`direction = 'in'\` qualifies; one without that filter does not, and falls back to another index or a scan.

### A unique partial index is a business rule in disguise

\`UNIQUE\` plus a \`WHERE\` says "unique among the rows that match". That expresses rules a plain \`UNIQUE\` cannot:

~~~sql
CREATE UNIQUE INDEX one_open_ticket_per_tool
  ON maintenance_ticket (tool_id) WHERE closed_at IS NULL;
~~~

A tool may have **any number of closed tickets**, but at most **one open one**. Close it, and a new one may be opened. No trigger, no application code, and no race: the database cannot be talked out of it. The same trick gives you "one active subscription per customer", "one primary phone per member", "one default address".

### Expression indexes: index what you search for

If you search on \`lower(email)\` or \`date(swiped_at)\`, index *that*, not the raw column:

~~~sql
CREATE UNIQUE INDEX member_email_ci ON member (lower(email));
CREATE INDEX door_log_day ON door_log (date(swiped_at));
~~~

The first closes the hole you found in lesson 3: two e-mails that differ only in capitals are now the same entry, and the second is refused. (Had you known at design time, \`email TEXT COLLATE NOCASE UNIQUE\` would also have worked; an expression index is how you add it to a table that already exists.) The second makes "swipes on a given date" a lookup instead of a scan.

Rules to remember:

- The expression must be **deterministic**: \`lower()\` and \`date(col)\` are; \`date('now')\` and \`random()\` are not, and are refused.
- The planner matches the expression **textually**. The index on \`date(swiped_at)\` helps \`WHERE date(swiped_at) = '2026-02-14'\`. It does **not** help \`WHERE substr(swiped_at, 1, 10) = '2026-02-14'\`, which means the same thing to you but a different expression to the planner. Write the query exactly the way you indexed it.

### Check, don't hope

Both kinds show up in \`EXPLAIN QUERY PLAN\` just like any index. An expression index prints its key as \`<expr>\`: \`SEARCH door_log USING INDEX door_log_day (<expr>=?)\`.

### Reading the errors

- \`UNIQUE constraint failed: maintenance_ticket.tool_id\`: a second open ticket for the same tool.
- \`UNIQUE constraint failed: index 'member_email_ci'\`: a unique *expression* index has no column to name, so the message names the index. Name your indexes well, since this is all the user sees.
- Creating a unique index on data that already contains duplicates fails. Clean first, then create.

### Common mistakes

- Writing a partial index and then querying without the condition.
- Indexing \`lower(email)\` but searching on \`email\`.
- Forgetting that a unique partial index only protects rows inside its \`WHERE\`.`,
      mission: md`Three upgrades, one for each kind of index.

**Repair tickets.** Add these three: WD-01 (the table saw), opened 2026-01-20 09:00:00, closed 2026-01-22 17:00:00, reported by member 1, "Blade replaced"; FB-01 (the laser), opened 2026-03-10 10:00:00, still open, reported by member 2, "Laser tube losing power"; and later, WD-01 again, opened 2026-03-11 08:00:00, still open, no reporter, "Fence loose". A tool may have many closed tickets but only **one open ticket at a time**: enforce it with a unique partial index called \`one_open_ticket_per_tool\`, and prove a second open FB-01 ticket is refused.

**E-mail case.** Create the unique expression index \`member_email_ci\` on \`lower(email)\`, and prove the upper-case impostor is now refused.

**Door log.** Create the partial index \`door_log_ins\` for entries only, and \`door_log_day\` on \`date(swiped_at)\`. Explain these queries and read the plans:

- \`SELECT swiped_at FROM door_log WHERE direction = 'in' AND badge_no = 'B-1003' AND swiped_at >= '2026-03-01'\` (should use \`door_log_ins\`)
- \`SELECT COUNT(*) FROM door_log WHERE date(swiped_at) = '2026-02-14'\` (should SEARCH \`door_log_day\`)
- \`SELECT COUNT(*) FROM door_log WHERE substr(swiped_at, 1, 10) = '2026-02-14'\` (the same question phrased differently: it will not use the index)`,
      tasks: [
        "Insert the three tickets, create the unique partial index one_open_ticket_per_tool, and mark -- expect error a second open ticket for FB-01",
        "Create the unique expression index member_email_ci ON member (lower(email)) and mark -- expect error the upper-case impostor (badge B-2004)",
        "Create door_log_ins (partial, WHERE direction = 'in') and explain the entries-only query",
        "Create door_log_day on date(swiped_at) and explain the date() query and the substr() query: SEARCH versus SCAN",
      ],
      starterAdd: sql`-- ── ✏️ YOUR TURN ───────────────────────────
-- Lesson 9: partial and expression indexes.
--
-- 1. Tickets. INSERT the three tickets from the mission (look the tools up by asset_tag).
--    CREATE UNIQUE INDEX one_open_ticket_per_tool ON maintenance_ticket (tool_id) WHERE closed_at IS NULL;
--    Put  -- expect error  above an INSERT of a second open ticket for FB-01.
--
-- 2. CREATE UNIQUE INDEX member_email_ci ON member (lower(email));
--    -- expect error  above an INSERT of 'ODILE.MERCER@mail.example' with badge 'B-2004' and name 'Imposter Three'.
--
-- 3. CREATE INDEX door_log_ins ON door_log (badge_no, swiped_at) WHERE direction = 'in';
--    EXPLAIN QUERY PLAN SELECT swiped_at FROM door_log WHERE direction = 'in' AND badge_no = 'B-1003' AND swiped_at >= '2026-03-01';
--
-- 4. CREATE INDEX door_log_day ON door_log (date(swiped_at));
--    EXPLAIN QUERY PLAN SELECT COUNT(*) FROM door_log WHERE date(swiped_at) = '2026-02-14';
--    EXPLAIN QUERY PLAN SELECT COUNT(*) FROM door_log WHERE substr(swiped_at, 1, 10) = '2026-02-14';
`,
      solutionAdd: sql`INSERT INTO maintenance_ticket (tool_id, reported_by, opened_at, closed_at, summary) VALUES
  ((SELECT id FROM tool WHERE asset_tag = 'WD-01'), 1, '2026-01-20 09:00:00', '2026-01-22 17:00:00', 'Blade replaced'),
  ((SELECT id FROM tool WHERE asset_tag = 'FB-01'), 2, '2026-03-10 10:00:00', NULL, 'Laser tube losing power');

CREATE UNIQUE INDEX one_open_ticket_per_tool ON maintenance_ticket (tool_id) WHERE closed_at IS NULL;

-- expect error
INSERT INTO maintenance_ticket (tool_id, opened_at, summary)
VALUES ((SELECT id FROM tool WHERE asset_tag = 'FB-01'), '2026-03-11 08:00:00', 'Mirror dirty');

INSERT INTO maintenance_ticket (tool_id, opened_at, summary)
VALUES ((SELECT id FROM tool WHERE asset_tag = 'WD-01'), '2026-03-11 08:00:00', 'Fence loose');

CREATE UNIQUE INDEX member_email_ci ON member (lower(email));

-- expect error
INSERT INTO member (email, badge_no, full_name) VALUES ('ODILE.MERCER@mail.example', 'B-2004', 'Imposter Three');

CREATE INDEX door_log_ins ON door_log (badge_no, swiped_at) WHERE direction = 'in';
CREATE INDEX door_log_day ON door_log (date(swiped_at));

EXPLAIN QUERY PLAN
SELECT swiped_at FROM door_log WHERE direction = 'in' AND badge_no = 'B-1003' AND swiped_at >= '2026-03-01';

EXPLAIN QUERY PLAN
SELECT COUNT(*) FROM door_log WHERE date(swiped_at) = '2026-02-14';

EXPLAIN QUERY PLAN
SELECT COUNT(*) FROM door_log WHERE substr(swiped_at, 1, 10) = '2026-02-14';`,
      explanation:
        "The unique partial index lets a tool have unlimited closed tickets but only one open one, a rule no plain UNIQUE could express. The expression index makes e-mail uniqueness case-insensitive, and its refusal names the index because there is no column to name. The partial index is only chosen for the query that repeats its condition, and the date() index is only chosen when the query uses exactly date(swiped_at): substr() does the same job to a human but is a different expression to the planner, so it scans.",
      hints: [
        { id: "h1", title: "One open ticket", content: "CREATE UNIQUE INDEX one_open_ticket_per_tool ON maintenance_ticket (tool_id) WHERE closed_at IS NULL;  Create it after inserting the two existing tickets (they satisfy the rule), then the second open FB-01 ticket is refused." },
        { id: "h2", title: "Case-insensitive", content: "CREATE UNIQUE INDEX member_email_ci ON member (lower(email));  The error for a violation reads UNIQUE constraint failed: index 'member_email_ci'." },
        { id: "h3", title: "Same words as the index", content: "The planner only uses an expression index when the query contains the identical expression. Index date(swiped_at), query date(swiped_at). A partial index is only used when the query repeats its WHERE (direction = 'in')." },
      ],
      tests: [
        {
          id: "t1",
          description: "The three tickets are in, two of them still open",
          assertionCode: t`const rs = all("SELECT t.asset_tag AS tag, k.summary, k.closed_at, k.reported_by FROM maintenance_ticket k JOIN tool t ON t.id = k.tool_id ORDER BY k.opened_at");
assertEqual(rs.length, 3, "Tickets");
assertEqual(rs.map((r) => r.summary), ["Blade replaced", "Laser tube losing power", "Fence loose"], "Ticket summaries in the order opened");
assertEqual(rs.map((r) => r.tag), ["WD-01", "FB-01", "WD-01"], "Tools the tickets are about");
assert(rs[0].closed_at === "2026-01-22 17:00:00" && rs[1].closed_at === null && rs[2].closed_at === null, "Only the first ticket is closed");
assert(rs[0].reported_by === 1 && rs[1].reported_by === 2 && rs[2].reported_by === null, "Reporters: member 1, member 2, nobody");`,
        },
        {
          id: "t2",
          description: "A tool can have many closed tickets but only one open one",
          assertionCode: t`assert(indexes("maintenance_ticket").some((i) => i.unique === 1 && i.partial === 1 && indexCols(i.name).join() === "tool_id"), "Create a UNIQUE index on maintenance_ticket (tool_id) with a WHERE clause (a partial index)");
const open = (tag) => "INSERT INTO maintenance_ticket (tool_id, opened_at, summary) VALUES ((SELECT id FROM tool WHERE asset_tag = '" + tag + "'), '2026-04-01 08:00:00', 'probe')";
const err = probe(open("FB-01"));
assert(err && /UNIQUE/.test(err), "A second OPEN ticket on the laser must be refused (UNIQUE), got: " + err);
assert(probe(open("FB-02")) === null, "An open ticket on a tool with no open ticket should be accepted");
const closed = "INSERT INTO maintenance_ticket (tool_id, opened_at, closed_at, summary) VALUES ((SELECT id FROM tool WHERE asset_tag = 'FB-01'), '2026-02-01 08:00:00', '2026-02-02 08:00:00', 'probe')";
assert(probe(closed) === null, "Closed tickets are unlimited: a closed ticket on the laser should be accepted");`,
        },
        {
          id: "t3",
          description: "E-mail uniqueness now ignores capitals",
          assertionCode: t`const err = probe("INSERT INTO member (email, badge_no, full_name) VALUES ('ODILE.MERCER@mail.example', 'B-7100', 'Probe')");
assert(err && /UNIQUE/.test(err), "An e-mail that differs only in capitals must be refused, got: " + err);
assert(indexes("member").some((i) => i.unique === 1 && /lower\(\s*email\s*\)/.test(ddl(i.name))), "Create a UNIQUE index on lower(email)");
assert(probe("INSERT INTO member (email, badge_no, full_name) VALUES ('brand.new@mail.example', 'B-7101', 'Probe')") === null, "A genuinely new e-mail must still be accepted");
assert(refused(/UNIQUE constraint failed: (index 'member_email_ci'|member\.email)/).length >= 1, "Mark the upper-case impostor INSERT with -- expect error");`,
        },
        {
          id: "t4",
          description: "The partial index serves the entries-only query",
          assertionCode: t`const partial = indexes("door_log").filter((i) => i.partial === 1).map((i) => i.name);
assert(partial.length, "Create a partial index on door_log: CREATE INDEX door_log_ins ON door_log (badge_no, swiped_at) WHERE direction = 'in'");
assert(/direction\s*=\s*'in'/.test(ddl(partial[0])), "The partial index should cover only rows WHERE direction = 'in'");
const d = planFor(/direction\s*=\s*'in'/);
assert(d, "Explain the query that filters on direction = 'in' and badge_no");
assert(partial.some((n) => d.includes(n)), "That query's plan should use your partial index (" + partial.join(", ") + "), got: " + d);`,
        },
        {
          id: "t5",
          description: "date(swiped_at) is searched through its index, substr() is not",
          assertionCode: t`const ix = indexes("door_log").find((i) => /date\(\s*swiped_at\s*\)/.test(ddl(i.name)));
assert(ix, "Create an index on the expression date(swiped_at)");
const d = planFor(/date\(\s*swiped_at\s*\)\s*=/);
assert(d, "Explain: SELECT COUNT(*) FROM door_log WHERE date(swiped_at) = '2026-02-14'");
assert(new RegExp("SEARCH door_log USING (COVERING )?INDEX " + ix.name).test(d), "The date() query should SEARCH through " + ix.name + ", got: " + d);
const s = planFor(/substr\(\s*swiped_at/);
if (s) assert(/^SCAN/.test(s), "The substr() version should not use the date index, got: " + s);`,
        },
      ],
      unlocks: ["ss-smart-indexes"],
      checks: [
        {
          prompt: "`CREATE UNIQUE INDEX one_open ON maintenance_ticket (tool_id) WHERE closed_at IS NULL` is in place. Which insert is refused?",
          question: {
            type: "choice",
            options: [
              "A third closed ticket for tool 5",
              "A second open ticket (closed_at is NULL) for tool 5 while one is already open",
              "An open ticket for tool 6 when tool 5 has one open",
            ],
            answer: 1,
          },
          explanation: "The index only contains rows where closed_at IS NULL, and within those rows each tool_id may appear once. Closed tickets are not in the index at all, so there can be as many as you like.",
        },
        {
          prompt: "You index `date(swiped_at)`. Which query can use the index?",
          question: {
            type: "choice",
            options: [
              "WHERE date(swiped_at) = '2026-02-14'",
              "WHERE substr(swiped_at, 1, 10) = '2026-02-14'",
              "WHERE swiped_at LIKE '2026-02-14%'",
            ],
            answer: 0,
          },
          explanation: "The planner matches the expression exactly. substr(...) means the same thing to a person but is a different expression, so it cannot use the date index.",
        },
      ],
    },

    // ───────────────────────────── 10 ─────────────────────────────
    {
      id: "schema-studio-10-views",
      title: "Views as a stable interface",
      minutes: 22,
      xp: 130,
      concepts: ["CREATE VIEW", "hiding joins and columns", "stable interface", "view pitfalls"],
      learn: md`### A saved question with a name

A **view** stores a \`SELECT\` under a name and lets you query it like a table. It holds no data of its own; every time you read it, the query runs.

~~~sql
CREATE VIEW v_member_directory AS
SELECT m.id AS member_id, m.full_name, p.name AS plan_name, m.status
FROM member m
LEFT JOIN plan p ON p.id = m.plan_id;
~~~

Then \`SELECT * FROM v_member_directory\` is all anyone writes. That is worth far more than saving keystrokes.

### Why views are an interface

Think of your tables as the **private** shape of the data, and views as the **public** one. Reports, dashboards and other teams should read views, because then you are free to change what is behind them:

- **One definition of "the join".** Everybody who needs booking details with the member's name, the tool and the workshop gets the same join, written once. Without it, five analysts write five slightly different joins and five different revenue totals.
- **One definition of a derived value.** \`minutes\` and \`cost_cents\` are computed once in the view. When pricing rules change, you change one place.
- **Hiding columns.** The directory view has no e-mail, phone or badge number, so a screen that only needs names cannot leak them. (SQLite has no per-user permissions, so this protects through your application's discipline, not by itself. In databases with roles, a view plus a grant is real access control.)
- **Absorbing change.** In lesson 15 you will move phone numbers into a new table and keep a view returning the same columns. The queries built on it never notice.

### Rules of thumb

- **Name the columns you expose**, in the view, with \`AS\`. Avoid \`SELECT *\` in a view: it silently changes shape when a table does, and it can also stop you dropping a column later because the view still depends on it.
- **Give views a prefix** (\`v_\`) so nobody mistakes one for a table.
- **A view is not faster.** There is no stored result and you cannot index a view; the planner expands it into the underlying query and uses the underlying tables' indexes. (Other databases have *materialised* views that do store results; SQLite does not.)
- **Views read, tables write.** A SQLite view is read-only unless you add \`INSTEAD OF\` triggers.
- **Beware of fan-out.** If a view joins in a table with many rows per booking (tickets, certificates), each booking appears several times and sums double-count. Aggregate in a subquery per measure, as \`v_tool_board\` does below.
- Views can be built on views; keep the chain short or it becomes hard to debug.

### Reading the errors

\`no such table: main.v_booking_detail\` means the view does not exist (or was dropped). \`no such column: ...\` inside a view is reported **when you query it**, not when you create it: SQLite checks the definition lazily, so test every new view with a query. Changing a view means \`DROP VIEW\` then \`CREATE VIEW\` again.

### Common mistakes

- \`SELECT *\` views.
- Putting business logic in five different views that slowly disagree.
- Assuming a view hides data from someone who can open the database file.`,
      mission: md`Lantern Yard's treasurer wants the numbers, and she does not want to learn your table layout. Give her three views, and a report built on them.

1. **\`v_member_directory\`**: \`member_id\`, \`full_name\`, \`plan_name\`, \`status\`, \`joined_on\`. Every member appears (a member with no plan shows NULL). No e-mail, phone or badge.
2. **\`v_booking_detail\`**: \`booking_id\`, \`member_name\`, \`asset_tag\`, \`tool_name\`, \`workshop_name\`, \`starts_at\`, \`ends_at\`, \`minutes\`, \`cost_cents\`, \`status\`. \`minutes\` is the length of the booking; \`cost_cents\` is minutes times the tool's hourly rate divided by 60 (whole cents).
3. **\`v_tool_board\`**: \`tool_id\`, \`asset_tag\`, \`name\`, \`status\`, \`sessions\` (completed bookings), \`minutes_used\` (minutes of completed bookings, 0 if none) and \`open_tickets\`. Use one subquery per measure so nothing is counted twice.

Then use them, never the base tables:

- **Revenue by workshop:** \`workshop_name\`, \`sessions\`, \`minutes\`, \`revenue_cents\` from \`v_booking_detail\`, completed bookings only, biggest revenue first.
- **A glance at the directory:** the first five active members from \`v_member_directory\`, in id order.`,
      tasks: [
        "Create v_member_directory (no e-mail, phone or badge) and v_booking_detail (with minutes and cost_cents)",
        "Create v_tool_board with one correlated subquery per measure: sessions, minutes_used, open_tickets",
        "Revenue report from v_booking_detail: workshop_name, sessions, minutes, revenue_cents, completed only, ordered by revenue_cents DESC",
        "SELECT * FROM v_member_directory WHERE status = 'active' ORDER BY member_id LIMIT 5",
      ],
      starterAdd: sql`-- ── ✏️ YOUR TURN ───────────────────────────
-- Lesson 10: views as a stable interface.
--
-- 1. CREATE VIEW v_member_directory AS ...   columns: member_id, full_name, plan_name, status, joined_on  (LEFT JOIN plan)
--    CREATE VIEW v_booking_detail AS ...     columns: booking_id, member_name, asset_tag, tool_name, workshop_name,
--                                             starts_at, ends_at, minutes, cost_cents, status
--      minutes    = (strftime('%s', ends_at) - strftime('%s', starts_at)) / 60
--      cost_cents = minutes * tool.hourly_rate_cents / 60   (integer maths, so multiply BEFORE you divide by 60)
--
-- 2. CREATE VIEW v_tool_board AS ...  columns: tool_id, asset_tag, name, status, sessions, minutes_used, open_tickets
--    One scalar subquery per measure (completed bookings, their minutes via v_booking_detail, tickets with closed_at IS NULL).
--
-- 3. Revenue by workshop, reading ONLY the view:
--      workshop_name, sessions, minutes, revenue_cents    (status = 'completed', ORDER BY revenue_cents DESC)
--
-- 4. SELECT * FROM v_member_directory WHERE status = 'active' ORDER BY member_id LIMIT 5;
`,
      solutionAdd: sql`CREATE VIEW v_member_directory AS
SELECT
  m.id AS member_id,
  m.full_name,
  p.name AS plan_name,
  m.status,
  m.joined_on
FROM member m
LEFT JOIN plan p ON p.id = m.plan_id;

CREATE VIEW v_booking_detail AS
SELECT
  b.id AS booking_id,
  m.full_name AS member_name,
  t.asset_tag,
  t.name AS tool_name,
  w.name AS workshop_name,
  b.starts_at,
  b.ends_at,
  (strftime('%s', b.ends_at) - strftime('%s', b.starts_at)) / 60 AS minutes,
  (strftime('%s', b.ends_at) - strftime('%s', b.starts_at)) / 60 * t.hourly_rate_cents / 60 AS cost_cents,
  b.status
FROM booking b
JOIN member m ON m.id = b.member_id
JOIN tool t ON t.id = b.tool_id
JOIN workshop w ON w.code = t.workshop_code;

CREATE VIEW v_tool_board AS
SELECT
  t.id AS tool_id,
  t.asset_tag,
  t.name,
  t.status,
  (SELECT COUNT(*) FROM booking b WHERE b.tool_id = t.id AND b.status = 'completed') AS sessions,
  (SELECT COALESCE(SUM(d.minutes), 0) FROM v_booking_detail d WHERE d.asset_tag = t.asset_tag AND d.status = 'completed') AS minutes_used,
  (SELECT COUNT(*) FROM maintenance_ticket k WHERE k.tool_id = t.id AND k.closed_at IS NULL) AS open_tickets
FROM tool t;

SELECT workshop_name, COUNT(*) AS sessions, SUM(minutes) AS minutes, SUM(cost_cents) AS revenue_cents
FROM v_booking_detail
WHERE status = 'completed'
GROUP BY workshop_name
ORDER BY revenue_cents DESC;

SELECT * FROM v_member_directory WHERE status = 'active' ORDER BY member_id LIMIT 5;`,
      explanation:
        "Each view exposes named columns and hides the joins: the directory omits personal details, v_booking_detail computes minutes and cost in one place, and v_tool_board uses a subquery per measure so completed sessions, minutes and open tickets cannot multiply each other. The revenue report only reads the view, which means pricing or table changes behind it would not touch the report.",
      hints: [
        { id: "h1", title: "Integer cost", content: "cost_cents = (strftime('%s', b.ends_at) - strftime('%s', b.starts_at)) / 60 * t.hourly_rate_cents / 60 — the first / 60 gives minutes, then multiply by the hourly rate and divide by 60 again. Multiplying before the last division keeps whole cents." },
        { id: "h2", title: "No fan-out", content: "v_tool_board must not JOIN booking and maintenance_ticket together (a tool with 8 bookings and 2 tickets would give 16 rows). Use one (SELECT COUNT(*) ...) subquery per column instead." },
        { id: "h3", title: "Read from the view", content: "The revenue report is a plain SELECT ... FROM v_booking_detail WHERE status = 'completed' GROUP BY workshop_name — no joins at all, which is the point." },
      ],
      tests: [
        {
          id: "t1",
          description: "v_member_directory shows every member without personal details",
          assertionCode: t`assert(exists("v_member_directory"), "Create the view v_member_directory");
const c = cols("v_member_directory").map((x) => x.name);
assertEqual(c, ["member_id", "full_name", "plan_name", "status", "joined_on"], "Columns of v_member_directory (exactly these, in this order)");
assertEqual(num("SELECT COUNT(*) FROM v_member_directory"), num("SELECT COUNT(*) FROM member"), "Rows in v_member_directory (every member, even one without a plan)");
const r = one("SELECT d.full_name, d.plan_name FROM v_member_directory d WHERE d.member_id = 1");
assertEqual(r, { full_name: "Odile Mercer", plan_name: "Studio" }, "Odile's directory entry");
assert(one("SELECT type FROM sqlite_master WHERE name = 'v_member_directory'").type === "view", "v_member_directory should be a VIEW");`,
        },
        {
          id: "t2",
          description: "v_booking_detail has one row per booking with the right minutes and cost",
          assertionCode: t`assert(exists("v_booking_detail"), "Create the view v_booking_detail");
assertEqual(cols("v_booking_detail").map((x) => x.name), ["booking_id", "member_name", "asset_tag", "tool_name", "workshop_name", "starts_at", "ends_at", "minutes", "cost_cents", "status"], "Columns of v_booking_detail");
assertEqual(num("SELECT COUNT(*) FROM v_booking_detail"), num("SELECT COUNT(*) FROM booking"), "Rows in v_booking_detail (one per booking)");
const bad = num("SELECT COUNT(*) FROM v_booking_detail d JOIN booking b ON b.id = d.booking_id JOIN tool t ON t.id = b.tool_id JOIN member m ON m.id = b.member_id WHERE d.minutes <> (strftime('%s', b.ends_at) - strftime('%s', b.starts_at)) / 60 OR d.cost_cents <> (strftime('%s', b.ends_at) - strftime('%s', b.starts_at)) / 60 * t.hourly_rate_cents / 60 OR d.member_name <> m.full_name OR d.asset_tag <> t.asset_tag");
assertEqual(bad, 0, "Rows of v_booking_detail with a wrong minutes, cost_cents, member_name or asset_tag");
assert(one("SELECT workshop_name FROM v_booking_detail WHERE booking_id = 1").workshop_name.length > 0, "workshop_name should come from the workshop table");`,
        },
        {
          id: "t3",
          description: "v_tool_board counts each measure once",
          assertionCode: t`assert(exists("v_tool_board"), "Create the view v_tool_board");
assertEqual(cols("v_tool_board").map((x) => x.name), ["tool_id", "asset_tag", "name", "status", "sessions", "minutes_used", "open_tickets"], "Columns of v_tool_board");
assertEqual(num("SELECT COUNT(*) FROM v_tool_board"), num("SELECT COUNT(*) FROM tool"), "Rows in v_tool_board (one per tool)");
const bad = num("SELECT COUNT(*) FROM v_tool_board v WHERE v.sessions <> (SELECT COUNT(*) FROM booking b WHERE b.tool_id = v.tool_id AND b.status = 'completed') OR v.minutes_used <> COALESCE((SELECT SUM((strftime('%s', b.ends_at) - strftime('%s', b.starts_at)) / 60) FROM booking b WHERE b.tool_id = v.tool_id AND b.status = 'completed'), 0) OR v.open_tickets <> (SELECT COUNT(*) FROM maintenance_ticket k WHERE k.tool_id = v.tool_id AND k.closed_at IS NULL)");
assertEqual(bad, 0, "Tools whose sessions, minutes_used or open_tickets are wrong (a join that multiplies rows is the usual cause)");
assert(one("SELECT minutes_used FROM v_tool_board v WHERE sessions = 0 LIMIT 1") === undefined || one("SELECT minutes_used FROM v_tool_board v WHERE sessions = 0 LIMIT 1").minutes_used === 0, "A tool with no sessions should show minutes_used 0, not NULL");`,
        },
        {
          id: "t4",
          description: "The revenue report reads from the view and adds up",
          assertionCode: t`const rs = data(["workshop_name", "sessions", "minutes", "revenue_cents"], "Add the revenue report: workshop_name, sessions, minutes, revenue_cents", /v_booking_detail/);
const want = all("SELECT workshop_name, COUNT(*) AS sessions, SUM(minutes) AS minutes, SUM(cost_cents) AS revenue_cents FROM v_booking_detail WHERE status = 'completed' GROUP BY workshop_name ORDER BY revenue_cents DESC");
assertEqual(rs.length, want.length, "Workshops in the report");
rs.forEach((r, i) => {
  assertEqual(r.workshop_name, want[i].workshop_name, "Row " + (i + 1) + " (biggest revenue first)");
  assert(r.sessions === want[i].sessions && r.minutes === want[i].minutes && r.revenue_cents === want[i].revenue_cents, r.workshop_name + ": expected " + want[i].sessions + " sessions, " + want[i].minutes + " minutes, " + want[i].revenue_cents + " cents; got " + r.sessions + ", " + r.minutes + ", " + r.revenue_cents);
});`,
        },
        {
          id: "t5",
          description: "The directory glance returns the first five active members",
          assertionCode: t`const rs = data(["member_id", "full_name", "plan_name", "status", "joined_on"], "Add SELECT * FROM v_member_directory WHERE status = 'active' ORDER BY member_id LIMIT 5", /v_member_directory/);
assertEqual(rs.length, 5, "Rows returned");
assertEqual(rs.map((r) => r.member_id), [1, 2, 3, 4, 5], "member_ids (active members in id order)");
assert(rs.every((r) => r.status === "active"), "Only active members");`,
        },
      ],
      unlocks: ["ss-views"],
      checks: [
        {
          prompt: "Why do the lessons recommend naming the columns in a view instead of `SELECT *`?",
          question: {
            type: "choice",
            options: [
              "SELECT * is not allowed in views",
              "The view silently changes shape when the table changes, and it can stop you dropping a column later",
              "Named columns make the view faster",
            ],
            answer: 1,
          },
          explanation: "A view is a contract with whoever reads it. Listing the columns makes the contract explicit; SELECT * lets every future ALTER TABLE leak into your public interface.",
        },
        {
          prompt: "Does creating `v_booking_detail` make revenue queries faster?",
          question: { type: "choice", options: ["Yes: the result is stored", "Yes: SQLite indexes views", "No: it is a saved query that runs each time"], answer: 2 },
          explanation: "SQLite views are not materialised and cannot be indexed. They exist for consistency and convenience; speed comes from indexes on the underlying tables.",
        },
      ],
    },

    // ───────────────────────────── 11 ─────────────────────────────
    {
      id: "schema-studio-11-triggers",
      title: "Triggers: audit trails and derived data",
      minutes: 30,
      xp: 160,
      concepts: ["CREATE TRIGGER", "BEFORE / AFTER", "OLD and NEW", "WHEN", "RAISE", "trigger pitfalls"],
      learn: md`### Code that lives with the data

A **trigger** is a small piece of SQL the database runs by itself when a row is inserted, updated or deleted:

~~~sql
CREATE TRIGGER tool_status_audit
AFTER UPDATE OF status ON tool
WHEN OLD.status IS NOT NEW.status
BEGIN
  INSERT INTO audit_log (table_name, row_id, action, old_value, new_value)
  VALUES ('tool', NEW.id, 'status', OLD.status, NEW.status);
END;
~~~

Read it in four parts:

- **When:** \`BEFORE\` or \`AFTER\` the change (or \`INSTEAD OF\`, for views), and \`INSERT\`, \`UPDATE [OF columns]\` or \`DELETE\`, on one table.
- **Which rows:** SQLite triggers fire **once per affected row**. An optional \`WHEN\` condition filters them.
- **What it can see:** \`NEW.col\` is the row after the change (inserts, updates); \`OLD.col\` is the row before (updates, deletes).
- **What it does:** one or more statements between \`BEGIN\` and \`END\`. A \`BEFORE\` trigger can also call \`SELECT RAISE(ABORT, 'message')\` to refuse the whole statement with your own error text.

### Three good uses

1. **Audit trails.** Record who changed what to what. Every path that touches the table (the app, an import script, a manual fix at midnight) is covered, which application code can never promise.
2. **Derived data.** Keep a fact in step with the facts it is computed from: when a repair ticket opens, the tool's status becomes \`repair\`; when the last open ticket closes, it goes back to \`ready\`.
3. **Rules CHECK cannot hold.** A \`CHECK\` sees only its own row. "Only active members may book" needs to look at the member table, so it is a \`BEFORE INSERT\` trigger that raises.

### Pitfalls (read these twice)

- **A trigger never looks back.** It runs for changes made *after* it exists. The tickets inserted last lesson are already open, so their tools are still \`ready\` and no trigger will ever fix that. You must repair existing data by hand, once.
- **\`UPDATE OF status\` fires when \`status\` is in the \`SET\` list, even if the value did not change.** Guard with \`WHEN OLD.status IS NOT NEW.status\` or your audit log fills with non-events. (Use \`IS NOT\`, not \`<>\`: it treats NULL sanely.)
- **Order is not guaranteed.** If two triggers fire on the same event, do not rely on which goes first. Never write a rule that only works in one order.
- **They are invisible.** A statement that looks like it touches one table changes three. Keep triggers few, small and documented, and put a test around each. Prefer a declarative constraint (type, \`CHECK\`, foreign key, unique index) whenever one can express the rule.
- **Chains.** Opening a ticket updates a tool, which fires the audit trigger. That nesting is normal and it is allowed; just be aware of it. Recursion on the same table needs \`PRAGMA recursive_triggers\` and is rarely a good idea.
- **Bulk changes are per row.** A thousand-row \`UPDATE\` runs the trigger body a thousand times.
- **\`INSERT OR REPLACE\` deletes then inserts**, but SQLite does not run delete triggers for the replaced row unless \`recursive_triggers\` is on.

### Reading the errors

Your own: \`SELECT RAISE(ABORT, 'member is not active')\` surfaces as the error text, so write messages a stranger could act on. \`no such table\` inside a trigger body appears when the trigger *fires*, not when it is created.

### Common mistakes

- Expecting a trigger to fix old rows.
- An audit trigger without a \`WHEN\`, logging non-changes.
- Using a trigger where a unique index or foreign key would do.`,
      mission: md`Lantern Yard needs a trustworthy history and a workflow that runs itself.

Create **\`audit_log\`** (\`STRICT\`): \`id\`, \`at\` (required text, default \`datetime('now')\`), \`table_name\`, \`row_id\` (whole number), \`action\` (all three required), and \`old_value\`, \`new_value\` (text, may be empty).

Then four automatic behaviours:

1. **Tool status changes are audited.** After a tool's \`status\` really changes, add a row: \`'tool'\`, the tool id, \`'status'\`, old and new value.
2. **Member status changes are audited** the same way (\`'member'\`).
3. **Opening a ticket flags the tool.** After inserting a ticket that is still open, set its tool to \`repair\` (if it was \`ready\`).
4. **Closing the last open ticket frees the tool.** After a ticket gets a \`closed_at\`, set the tool back to \`ready\` if it was in \`repair\` and has no other open ticket.

And a rule no CHECK can hold: **5.** a booking by a member whose status is not \`active\` is refused with the message \`member is not active\`.

Now the part everybody forgets: two tools already have open tickets (from lesson 9) but were never flagged. Fix them by hand with one UPDATE and watch the audit trail appear on its own. Then close the table saw's ticket, open and close a ticket on the pottery wheel (CL-01, opened 2026-03-13 09:00:00, closed 15:00:00), pause Kofi (badge B-1002), mark a booking attempt for him \`-- expect error\`, and make him active again. Finish by reading the audit log back.`,
      tasks: [
        "Create audit_log and the four triggers (tool and member status audits, ticket opened, ticket closed), each with a WHEN where it needs one",
        "Create the BEFORE INSERT trigger on booking that refuses inactive members with 'member is not active'",
        "UPDATE the tools that already have open tickets to 'repair', close WD-01's open ticket, open and close a CL-01 ticket",
        "Pause Kofi, mark a booking for him -- expect error, make him active again, then SELECT table_name, row_id, action, old_value, new_value FROM audit_log ORDER BY id",
      ],
      starterAdd: sql`-- ── ✏️ YOUR TURN ───────────────────────────
-- Lesson 11: triggers.
--
-- 1. CREATE TABLE audit_log (...) STRICT  (see the mission for the columns).
--
-- 2. Triggers:
--    CREATE TRIGGER tool_status_audit   AFTER UPDATE OF status ON tool   WHEN OLD.status IS NOT NEW.status BEGIN ... END;
--    CREATE TRIGGER member_status_audit AFTER UPDATE OF status ON member WHEN OLD.status IS NOT NEW.status BEGIN ... END;
--    CREATE TRIGGER ticket_opened AFTER INSERT ON maintenance_ticket WHEN NEW.closed_at IS NULL BEGIN UPDATE tool ... END;
--    CREATE TRIGGER ticket_closed AFTER UPDATE OF closed_at ON maintenance_ticket
--      WHEN OLD.closed_at IS NULL AND NEW.closed_at IS NOT NULL BEGIN UPDATE tool ... (only if no OTHER open ticket) END;
--    CREATE TRIGGER booking_needs_active_member BEFORE INSERT ON booking
--      WHEN (SELECT status FROM member WHERE id = NEW.member_id) <> 'active'
--      BEGIN SELECT RAISE(ABORT, 'member is not active'); END;
--
-- 3. The triggers don't look back. Repair the tools that already have an open ticket:
--      UPDATE tool SET status = 'repair' WHERE id IN (SELECT tool_id FROM maintenance_ticket WHERE closed_at IS NULL);
--    Then close WD-01's open ticket (set closed_at = '2026-03-12 16:00:00').
--    Open a ticket on CL-01 (opened_at '2026-03-13 09:00:00', summary 'Wheel head wobbles') and close it ('2026-03-13 15:00:00').
--
-- 4. UPDATE member SET status = 'paused' WHERE badge_no = 'B-1002';
--    -- expect error  above an INSERT INTO booking for Kofi (any tool, 2026-04-01 10:00 to 11:00)
--    UPDATE member SET status = 'active' WHERE badge_no = 'B-1002';
--    SELECT table_name, row_id, action, old_value, new_value FROM audit_log ORDER BY id;
`,
      solutionAdd: sql`CREATE TABLE audit_log (
  id         INTEGER PRIMARY KEY,
  at         TEXT    NOT NULL DEFAULT (datetime('now')),
  table_name TEXT    NOT NULL,
  row_id     INTEGER NOT NULL,
  action     TEXT    NOT NULL,
  old_value  TEXT,
  new_value  TEXT
) STRICT;

CREATE TRIGGER tool_status_audit
AFTER UPDATE OF status ON tool
WHEN OLD.status IS NOT NEW.status
BEGIN
  INSERT INTO audit_log (table_name, row_id, action, old_value, new_value)
  VALUES ('tool', NEW.id, 'status', OLD.status, NEW.status);
END;

CREATE TRIGGER member_status_audit
AFTER UPDATE OF status ON member
WHEN OLD.status IS NOT NEW.status
BEGIN
  INSERT INTO audit_log (table_name, row_id, action, old_value, new_value)
  VALUES ('member', NEW.id, 'status', OLD.status, NEW.status);
END;

CREATE TRIGGER ticket_opened
AFTER INSERT ON maintenance_ticket
WHEN NEW.closed_at IS NULL
BEGIN
  UPDATE tool SET status = 'repair' WHERE id = NEW.tool_id AND status = 'ready';
END;

CREATE TRIGGER ticket_closed
AFTER UPDATE OF closed_at ON maintenance_ticket
WHEN OLD.closed_at IS NULL AND NEW.closed_at IS NOT NULL
BEGIN
  UPDATE tool SET status = 'ready'
  WHERE id = NEW.tool_id
    AND status = 'repair'
    AND NOT EXISTS (SELECT 1 FROM maintenance_ticket k WHERE k.tool_id = NEW.tool_id AND k.closed_at IS NULL);
END;

CREATE TRIGGER booking_needs_active_member
BEFORE INSERT ON booking
WHEN (SELECT status FROM member WHERE id = NEW.member_id) <> 'active'
BEGIN
  SELECT RAISE(ABORT, 'member is not active');
END;

-- Tickets that were already open before the triggers existed: fix the tools by hand
UPDATE tool SET status = 'repair'
WHERE id IN (SELECT tool_id FROM maintenance_ticket WHERE closed_at IS NULL) AND status = 'ready';

-- Close one ticket and watch the tool come back
UPDATE maintenance_ticket SET closed_at = '2026-03-12 16:00:00'
WHERE closed_at IS NULL AND tool_id = (SELECT id FROM tool WHERE asset_tag = 'WD-01');

-- Open a fresh one on another tool, then close it
INSERT INTO maintenance_ticket (tool_id, opened_at, summary)
VALUES ((SELECT id FROM tool WHERE asset_tag = 'CL-01'), '2026-03-13 09:00:00', 'Wheel head wobbles');
UPDATE maintenance_ticket SET closed_at = '2026-03-13 15:00:00'
WHERE closed_at IS NULL AND tool_id = (SELECT id FROM tool WHERE asset_tag = 'CL-01');

-- A rule a CHECK cannot express: only active members may book
UPDATE member SET status = 'paused' WHERE badge_no = 'B-1002';
-- expect error
INSERT INTO booking (member_id, tool_id, starts_at, ends_at)
VALUES ((SELECT id FROM member WHERE badge_no = 'B-1002'), (SELECT id FROM tool WHERE asset_tag = 'FB-02'), '2026-04-01 10:00:00', '2026-04-01 11:00:00');
UPDATE member SET status = 'active' WHERE badge_no = 'B-1002';

SELECT table_name, row_id, action, old_value, new_value FROM audit_log ORDER BY id;`,
      explanation:
        "Two triggers audit status changes, but only when the value really changed (the WHEN guard), two more keep a tool's status in step with its tickets, and a BEFORE trigger refuses bookings by inactive members, which a CHECK could not do because it needs the member table. The first UPDATE repaired the tickets that were open before the triggers existed, because a trigger only reacts to changes made after it was created, and that repair itself produced audit rows automatically.",
      hints: [
        { id: "h1", title: "Guard the audit", content: "AFTER UPDATE OF status ON tool WHEN OLD.status IS NOT NEW.status BEGIN INSERT INTO audit_log (...) VALUES ('tool', NEW.id, 'status', OLD.status, NEW.status); END;  Without the WHEN, UPDATE tool SET status = status would log a change that never happened." },
        { id: "h2", title: "Last open ticket", content: "In ticket_closed set the tool to 'ready' only AND NOT EXISTS (SELECT 1 FROM maintenance_ticket k WHERE k.tool_id = NEW.tool_id AND k.closed_at IS NULL), so closing one of two tickets does not free the tool." },
        { id: "h3", title: "Refuse with a message", content: "A BEFORE trigger body of  SELECT RAISE(ABORT, 'member is not active');  makes the INSERT fail with exactly that text. Put the member check in the trigger's WHEN clause." },
      ],
      tests: [
        {
          id: "t1",
          description: "audit_log has the right shape",
          assertionCode: t`assert(exists("audit_log"), "Create the table audit_log");
for (const c of ["id", "at", "table_name", "row_id", "action", "old_value", "new_value"]) assert(col("audit_log", c), "audit_log needs a column called " + c);
for (const c of ["at", "table_name", "row_id", "action"]) assert(col("audit_log", c).notnull === 1, "audit_log." + c + " must be NOT NULL");
assert(/datetime\(\s*'now'\s*\)/i.test(String(col("audit_log", "at").dflt_value)), "audit_log.at should DEFAULT (datetime('now'))");
assert(col("audit_log", "old_value").notnull === 0 && col("audit_log", "new_value").notnull === 0, "old_value and new_value may be empty");
const tl = all("PRAGMA table_list").find((r) => r.name === "audit_log");
assert(tl && tl.strict === 1, "audit_log should be STRICT");`,
        },
        {
          id: "t2",
          description: "Opening and closing tickets moves the tool between ready and repair, with an audit row each time",
          assertionCode: t`sandbox(() => {
  const tool = one("SELECT id FROM tool WHERE asset_tag = 'FB-02'").id;
  const before = num("SELECT COUNT(*) FROM audit_log");
  query("INSERT INTO maintenance_ticket (tool_id, opened_at, summary) VALUES (" + tool + ", '2026-05-01 09:00:00', 'a')");
  assertEqual(one("SELECT status FROM tool WHERE id = " + tool).status, "repair", "Tool status right after a ticket is opened");
  assertEqual(num("SELECT COUNT(*) FROM audit_log") - before, 1, "Audit rows written by opening the ticket");
  const a = one("SELECT table_name, row_id, action, old_value, new_value FROM audit_log ORDER BY id DESC LIMIT 1");
  assertEqual(a, { table_name: "tool", row_id: tool, action: "status", old_value: "ready", new_value: "repair" }, "The audit row");
  query("UPDATE maintenance_ticket SET closed_at = '2026-05-01 12:00:00' WHERE summary = 'a'");
  assertEqual(one("SELECT status FROM tool WHERE id = " + tool).status, "ready", "Tool status after its only ticket is closed");
  assertEqual(num("SELECT COUNT(*) FROM audit_log") - before, 2, "Audit rows after open and close");
});
sandbox(() => {
  const tool = one("SELECT id FROM tool WHERE asset_tag = 'CL-01'").id;
  const had = num("SELECT COUNT(*) FROM audit_log WHERE table_name = 'tool' AND row_id = " + tool);
  query("INSERT INTO maintenance_ticket (tool_id, opened_at, closed_at, summary) VALUES (" + tool + ", '2026-05-01 09:00:00', '2026-05-01 10:00:00', 'old')");
  assertEqual(one("SELECT status FROM tool WHERE id = " + tool).status, "ready", "A ticket that is inserted already closed must not flag the tool");
  query("INSERT INTO maintenance_ticket (tool_id, opened_at, summary) VALUES (" + tool + ", '2026-05-02 09:00:00', 'b')");
  query("UPDATE tool SET status = status WHERE id = " + tool);
  const n = num("SELECT COUNT(*) FROM audit_log WHERE table_name = 'tool' AND row_id = " + tool) - had;
  assertEqual(n, 1, "Audit rows for this tool: an UPDATE that changes nothing must not be logged (add a WHEN guard)");
});`,
        },
        {
          id: "t3",
          description: "Closing one of two open tickets leaves the tool in repair; member changes are audited",
          assertionCode: t`sandbox(() => {
  const tool = one("SELECT id FROM tool WHERE asset_tag = 'TX-01'").id;
  query("DROP INDEX IF EXISTS one_open_ticket_per_tool");
  query("INSERT INTO maintenance_ticket (tool_id, opened_at, summary) VALUES (" + tool + ", '2026-05-01 09:00:00', 'one')");
  query("INSERT INTO maintenance_ticket (tool_id, opened_at, summary) VALUES (" + tool + ", '2026-05-01 09:05:00', 'two')");
  query("UPDATE maintenance_ticket SET closed_at = '2026-05-01 10:00:00' WHERE summary = 'one'");
  assertEqual(one("SELECT status FROM tool WHERE id = " + tool).status, "repair", "The tool still has an open ticket, so it must stay in repair");
  query("UPDATE maintenance_ticket SET closed_at = '2026-05-01 11:00:00' WHERE summary = 'two'");
  assertEqual(one("SELECT status FROM tool WHERE id = " + tool).status, "ready", "Both tickets closed: the tool is ready again");
});
sandbox(() => {
  const before = num("SELECT COUNT(*) FROM audit_log");
  query("UPDATE member SET status = 'closed' WHERE id = 2");
  const a = one("SELECT table_name, row_id, action, old_value, new_value FROM audit_log ORDER BY id DESC LIMIT 1");
  assertEqual(a, { table_name: "member", row_id: 2, action: "status", old_value: "active", new_value: "closed" }, "The audit row for a member status change");
  query("UPDATE member SET status = 'closed' WHERE id = 2");
  assertEqual(num("SELECT COUNT(*) FROM audit_log") - before, 1, "Setting the same status again must not write another audit row");
});`,
        },
        {
          id: "t4",
          description: "The tools that were already in trouble were repaired by hand, and nothing else is stuck",
          assertionCode: t`assertEqual(num("SELECT COUNT(*) FROM tool t WHERE EXISTS (SELECT 1 FROM maintenance_ticket k WHERE k.tool_id = t.id AND k.closed_at IS NULL) AND t.status <> 'repair'"), 0, "Tools with an open ticket that are not marked repair (the triggers never looked back: fix them with an UPDATE)");
assertEqual(num("SELECT COUNT(*) FROM tool t WHERE t.status = 'repair' AND NOT EXISTS (SELECT 1 FROM maintenance_ticket k WHERE k.tool_id = t.id AND k.closed_at IS NULL)"), 0, "Tools stuck in repair with no open ticket");
assertEqual(one("SELECT status FROM tool WHERE asset_tag = 'FB-01'").status, "repair", "The laser still has an open ticket");
assertEqual(one("SELECT status FROM tool WHERE asset_tag = 'WD-01'").status, "ready", "The table saw's ticket was closed");
assertEqual(num("SELECT COUNT(*) FROM maintenance_ticket WHERE closed_at IS NULL"), 1, "Open tickets at the end of the lesson");
assertEqual(num("SELECT COUNT(*) FROM maintenance_ticket t JOIN tool x ON x.id = t.tool_id WHERE x.asset_tag = 'CL-01' AND t.opened_at = '2026-03-13 09:00:00' AND t.closed_at = '2026-03-13 15:00:00'"), 1, "The CL-01 ticket should have been opened and closed");`,
        },
        {
          id: "t5",
          description: "Inactive members cannot book, with a message people can act on, and the audit feed reads back",
          assertionCode: t`const base = (st) => "INSERT INTO booking (member_id, tool_id, starts_at, ends_at) VALUES ((SELECT id FROM member WHERE badge_no = 'B-1002'), (SELECT id FROM tool WHERE asset_tag = 'FB-02'), '2026-06-01 10:00:00', '2026-06-01 11:00:00')";
sandbox(() => {
  query("UPDATE member SET status = 'paused' WHERE badge_no = 'B-1002'");
  const err = probe(base());
  assert(err && /member is not active/.test(err), "A paused member's booking must be refused with 'member is not active', got: " + err);
});
assert(probe(base()) === null, "An active member's booking should be accepted: " + probe(base()));
assert(accepted().length === 0, "One of your -- expect error statements was accepted: it should have been refused");
assert(refused(/member is not active/).length >= 1, "Mark the paused member's booking INSERT with -- expect error");
const feed = data(["table_name", "row_id", "action", "old_value", "new_value"], "Finish with SELECT table_name, row_id, action, old_value, new_value FROM audit_log ORDER BY id", /audit_log/);
assertEqual(feed.length, num("SELECT COUNT(*) FROM audit_log"), "Rows in your audit read-back");
const sig = feed.map((r) => r.table_name + "#" + r.row_id + " " + r.old_value + ">" + r.new_value);
for (const want of ["tool#1 ready>repair", "tool#5 ready>repair", "tool#1 repair>ready", "tool#3 ready>repair", "tool#3 repair>ready", "member#2 active>paused", "member#2 paused>active"]) assert(sig.includes(want), "The audit trail should contain: " + want);`,
        },
      ],
      unlocks: ["ss-audit"],
      checks: [
        {
          prompt: "Your triggers exist, but two tools already had open tickets before you created them. What state are those tools in?",
          question: {
            type: "choice",
            options: [
              "'repair': triggers run on existing rows when created",
              "Unchanged: a trigger only reacts to changes made after it exists, so you must repair them yourself",
              "'retired': SQLite resets unknown states",
            ],
            answer: 1,
          },
          explanation: "Triggers are event handlers, not retroactive rules. When you add one to a database with existing data, plan a one-off repair statement.",
        },
        {
          prompt: "Why does the audit trigger have `WHEN OLD.status IS NOT NEW.status`?",
          question: {
            type: "choice",
            options: [
              "`UPDATE OF status` fires whenever status appears in the SET list, even if the value stayed the same",
              "Without it the trigger could never fire",
              "SQLite requires a WHEN on every AFTER trigger",
            ],
            answer: 0,
          },
          explanation: "UPDATE tool SET status = status touches the column without changing it. The guard keeps non-events out of the audit trail; IS NOT (rather than <>) also behaves correctly when a value is NULL.",
        },
      ],
    },

    // ───────────────────────────── 12 ─────────────────────────────
    {
      id: "schema-studio-12-transactions",
      title: "Transactions and savepoints",
      minutes: 26,
      xp: 150,
      concepts: ["BEGIN / COMMIT / ROLLBACK", "atomicity", "errors inside a transaction", "SAVEPOINT / ROLLBACK TO / RELEASE", "transactional DDL"],
      learn: md`### All or nothing

Some changes are really one change in several pieces. Gift 60 minutes of tool time from Odile to Kofi: Odile's balance goes **down**, Kofi's goes **up**. If the first half succeeds and the second one fails, 60 minutes have vanished. A **transaction** groups statements so they take effect together or not at all.

~~~sql
BEGIN;
INSERT INTO credit_ledger (member_id, minutes, reason) VALUES (1, -60, 'gift to Kofi');
INSERT INTO credit_ledger (member_id, minutes, reason) VALUES (2,  60, 'gift from Odile');
COMMIT;      -- make both permanent
~~~

\`ROLLBACK\` instead of \`COMMIT\` throws every change since \`BEGIN\` away. This is the **A** in ACID: *atomic*. (The others: *consistent*, the constraints still hold; *isolated*, other connections do not see half-done work; *durable*, once committed it survives a crash.)

### Autocommit: you are always in a transaction

Outside an explicit \`BEGIN\`, SQLite wraps **each statement** in its own tiny transaction. That is why a single \`UPDATE\` is always all-or-nothing, and also why two separate statements are not. Explicit transactions are for when the unit of work is bigger than one statement.

### The part that surprises everyone: a failed statement does not end the transaction

When a statement fails inside a transaction (a constraint violation, say), SQLite undoes **that statement's** changes and leaves the transaction **open**. Everything earlier in the transaction is still pending. If your code just carries on, the half-finished gift is committed later. After an error you must decide, explicitly: \`ROLLBACK\` the lot, or fix the problem and carry on.

### Savepoints: undo part of a transaction

~~~sql
BEGIN;
INSERT ...;                -- the main work
SAVEPOINT extra;           -- bookmark
INSERT ...;                -- optional bonus: this one fails
ROLLBACK TO extra;         -- undo back to the bookmark; transaction continues
INSERT ...;                -- a different bonus
RELEASE extra;             -- forget the bookmark, keep the work
COMMIT;
~~~

\`ROLLBACK TO name\` does **not** end the transaction and does not remove the savepoint (you can roll back to it again); \`RELEASE name\` just discards the bookmark and merges its work into the surrounding transaction. Nothing is permanent until the outermost \`COMMIT\`.

### DDL is transactional too

In SQLite, \`CREATE TABLE\`, \`ALTER TABLE\` and \`DROP\` can sit inside a transaction and be rolled back along with the data. Many databases cannot do that. You will use it in lesson 15 to make schema changes all-or-nothing.

### Design: ledgers beat counters

Why does the project keep a **ledger** (a row per movement) instead of a \`balance\` column you add to and subtract from? A counter loses history, and two overlapping updates can overwrite each other. A ledger only ever *appends*; the balance is \`SUM(minutes)\`. Auditing a dispute is a \`SELECT\`. Accountants have done it this way for five hundred years.

### Good habits

- Keep transactions **short**. SQLite allows one writer at a time; a transaction held open while you "wait for the user" blocks everyone.
- \`BEGIN IMMEDIATE\` takes the write lock up front, so a read-then-write sequence cannot be overtaken by someone else's write.
- Do not put \`PRAGMA foreign_keys\` inside a transaction (it is ignored there).

### Reading the errors

- \`cannot start a transaction within a transaction\`: a second \`BEGIN\` before the first finished (use savepoints to nest).
- \`cannot commit - no transaction is active\` / \`cannot rollback - no transaction is active\`: the transaction was already ended, or never begun.
- \`no such savepoint: extra\`: you released it or never created it.

### Common mistakes

- Carrying on after an error inside a transaction without a \`ROLLBACK\`.
- Forgetting the closing \`COMMIT\` so the transaction is still open at the end of the script.
- Believing \`ROLLBACK TO\` ends the transaction.`,
      mission: md`Members can lend each other tool time. Keep it honest with a ledger.

Create **\`credit_ledger\`** (\`STRICT\`): \`id\`; \`member_id\` (required, a foreign key to \`member\`); \`minutes\` (required, never zero); \`reason\` (required text).

1. **Allowances.** Every member on a plan with included minutes gets one ledger row for them, reason \`April allowance\` (one \`INSERT ... SELECT\` over member and plan).
2. **A gift, committed.** In one transaction: Odile (B-1001) gives 60 minutes to Kofi (B-1002): a row of -60 for her, +60 for him.
3. **A gift that goes wrong.** Start a transaction, debit Odile 45, then try to credit member **9999** (who does not exist), marked \`-- expect error\`. Then \`ROLLBACK\`. The debit must vanish.
4. **A savepoint.** In one transaction give Kofi a +30 "volunteer bonus"; make a savepoint; try a **0**-minute row (marked \`-- expect error\`, the column forbids it); \`ROLLBACK TO\` the savepoint; add a +15 "cleaned the kiln" row; \`RELEASE\` the savepoint; \`COMMIT\`.
5. **Report.** Balances: \`full_name\`, \`balance\` (the sum of minutes), biggest first, ties by name, top six.`,
      tasks: [
        "Create credit_ledger and load one 'April allowance' row per member whose plan includes minutes",
        "Transaction 1: BEGIN, Odile -60, Kofi +60, COMMIT. Transaction 2: BEGIN, Odile -45, a marked -- expect error credit to member 9999, ROLLBACK",
        "Transaction 3: BEGIN, Kofi +30, SAVEPOINT extra, a marked -- expect error zero-minute row, ROLLBACK TO extra, Kofi +15, RELEASE extra, COMMIT",
        "Report: SELECT full_name, SUM(minutes) AS balance ... top six by balance DESC, then name",
      ],
      starterAdd: sql`-- ── ✏️ YOUR TURN ───────────────────────────
-- Lesson 12: transactions and savepoints.
--
-- 1. CREATE TABLE credit_ledger (id INTEGER PRIMARY KEY, member_id INTEGER NOT NULL REFERENCES member (id),
--      minutes INTEGER NOT NULL CHECK (minutes <> 0), reason TEXT NOT NULL) STRICT;
--    INSERT INTO credit_ledger (member_id, minutes, reason)
--    SELECT m.id, p.included_minutes, 'April allowance' FROM member m JOIN plan p ON p.id = m.plan_id WHERE p.included_minutes > 0;
--
-- 2. A gift that works:
--      BEGIN;  (-60 for Odile, B-1001)  (+60 for Kofi, B-1002)  COMMIT;
--
-- 3. A gift that fails halfway:
--      BEGIN;  (-45 for Odile)
--      -- expect error     (+45 for member 9999)
--      ROLLBACK;
--
-- 4. A savepoint:
--      BEGIN;  (+30 for Kofi, 'volunteer bonus')  SAVEPOINT extra;
--      -- expect error     (0 minutes for Kofi)
--      ROLLBACK TO extra;  (+15 for Kofi, 'cleaned the kiln')  RELEASE extra;  COMMIT;
--
-- 5. Report: full_name, balance  (SUM of minutes per member), ORDER BY balance DESC, full_name, LIMIT 6.
--    Always end with no transaction left open!
`,
      solutionAdd: sql`CREATE TABLE credit_ledger (
  id        INTEGER PRIMARY KEY,
  member_id INTEGER NOT NULL REFERENCES member (id),
  minutes   INTEGER NOT NULL CHECK (minutes <> 0),
  reason    TEXT    NOT NULL
) STRICT;

INSERT INTO credit_ledger (member_id, minutes, reason)
SELECT m.id, p.included_minutes, 'April allowance'
FROM member m
JOIN plan p ON p.id = m.plan_id
WHERE p.included_minutes > 0;

-- A gift: both halves or neither
BEGIN;
INSERT INTO credit_ledger (member_id, minutes, reason)
VALUES ((SELECT id FROM member WHERE badge_no = 'B-1001'), -60, 'gift to Kofi');
INSERT INTO credit_ledger (member_id, minutes, reason)
VALUES ((SELECT id FROM member WHERE badge_no = 'B-1002'), 60, 'gift from Odile');
COMMIT;

-- A gift that goes wrong halfway
BEGIN;
INSERT INTO credit_ledger (member_id, minutes, reason)
VALUES ((SELECT id FROM member WHERE badge_no = 'B-1001'), -45, 'gift to nobody');
-- expect error
INSERT INTO credit_ledger (member_id, minutes, reason) VALUES (9999, 45, 'gift from Odile');
ROLLBACK;

-- Undo only the part that failed
BEGIN;
INSERT INTO credit_ledger (member_id, minutes, reason)
VALUES ((SELECT id FROM member WHERE badge_no = 'B-1002'), 30, 'volunteer bonus');
SAVEPOINT extra;
-- expect error
INSERT INTO credit_ledger (member_id, minutes, reason)
VALUES ((SELECT id FROM member WHERE badge_no = 'B-1002'), 0, 'zero is not a change');
ROLLBACK TO extra;
INSERT INTO credit_ledger (member_id, minutes, reason)
VALUES ((SELECT id FROM member WHERE badge_no = 'B-1002'), 15, 'cleaned the kiln');
RELEASE extra;
COMMIT;

SELECT m.full_name, SUM(l.minutes) AS balance
FROM credit_ledger l
JOIN member m ON m.id = l.member_id
GROUP BY m.id
ORDER BY balance DESC, m.full_name
LIMIT 6;`,
      explanation:
        "The first gift commits both ledger rows together. In the second, the credit to the missing member is refused, but the debit before it is still pending, so the ROLLBACK is what removes it: a failed statement does not end a transaction. The savepoint lets the zero-minute row be undone without losing the +30 bonus earlier in the same transaction, and RELEASE then merges the savepoint's work into the transaction that COMMIT makes permanent. The balance is a SUM over an append-only ledger.",
      hints: [
        { id: "h1", title: "Allowances in one statement", content: "INSERT INTO credit_ledger (member_id, minutes, reason) SELECT m.id, p.included_minutes, 'April allowance' FROM member m JOIN plan p ON p.id = m.plan_id WHERE p.included_minutes > 0;  Drop-in members (0 minutes) are filtered out, and the CHECK would refuse a 0 anyway." },
        { id: "h2", title: "The failed gift", content: "After the refused statement the transaction is STILL OPEN with the -45 pending. Only the ROLLBACK removes it. If you COMMIT instead, Odile loses 45 minutes to nobody." },
        { id: "h3", title: "Savepoint order", content: "BEGIN; INSERT 30; SAVEPOINT extra; (refused 0-minute insert); ROLLBACK TO extra; INSERT 15; RELEASE extra; COMMIT;  ROLLBACK TO leaves the transaction open, which is why the 15 can still be added and committed." },
      ],
      tests: [
        {
          id: "t1",
          description: "credit_ledger has the right shape and every allowance was credited",
          assertionCode: t`assert(exists("credit_ledger"), "Create the table credit_ledger");
for (const c of ["id", "member_id", "minutes", "reason"]) assert(col("credit_ledger", c), "credit_ledger needs a column called " + c);
for (const c of ["member_id", "minutes", "reason"]) assert(col("credit_ledger", c).notnull === 1, "credit_ledger." + c + " must be NOT NULL");
const k = fks("credit_ledger");
assert(k.some((f) => f.from === "member_id" && f.table === "member"), "credit_ledger.member_id should reference member");
assert(/CHECK/.test(probe("INSERT INTO credit_ledger (member_id, minutes, reason) VALUES (1, 0, 'zero')") || ""), "A ledger row of 0 minutes must be refused (CHECK)");
const want = num("SELECT COUNT(*) FROM member m JOIN plan p ON p.id = m.plan_id WHERE p.included_minutes > 0");
assertEqual(num("SELECT COUNT(*) FROM credit_ledger WHERE reason = 'April allowance'"), want, "April allowance rows (one per member whose plan includes minutes)");
assertEqual(num("SELECT COUNT(*) FROM credit_ledger l JOIN member m ON m.id = l.member_id JOIN plan p ON p.id = m.plan_id WHERE l.reason = 'April allowance' AND l.minutes <> p.included_minutes"), 0, "Allowance rows with the wrong number of minutes");`,
        },
        {
          id: "t2",
          description: "The committed gift moved 60 minutes from Odile to Kofi, both rows or neither",
          assertionCode: t`const gifts = all("SELECT m.badge_no, l.minutes FROM credit_ledger l JOIN member m ON m.id = l.member_id WHERE l.reason <> 'April allowance' AND l.minutes IN (-60, 60) ORDER BY l.id");
assertEqual(gifts.map((g) => g.badge_no + ":" + g.minutes), ["B-1001:-60", "B-1002:60"], "The committed gift (Odile -60, then Kofi +60)");`,
        },
        {
          id: "t3",
          description: "The failed gift left no trace: it was rolled back",
          assertionCode: t`assertEqual(num("SELECT COUNT(*) FROM credit_ledger WHERE minutes = -45"), 0, "The -45 debit should have been rolled back (a refused statement does not end the transaction: you must ROLLBACK)");
assertEqual(num("SELECT COUNT(*) FROM credit_ledger WHERE member_id = 9999"), 0, "Nothing may point at member 9999");
assert(refused(/FOREIGN KEY constraint failed/).length >= 1, "Mark the credit to member 9999 with -- expect error");`,
        },
        {
          id: "t4",
          description: "The savepoint kept the good rows and dropped the bad one",
          assertionCode: t`const kofi = all("SELECT l.minutes FROM credit_ledger l JOIN member m ON m.id = l.member_id WHERE m.badge_no = 'B-1002' AND l.reason <> 'April allowance' AND l.minutes <> 60 ORDER BY l.id").map((r) => r.minutes);
assertEqual(kofi, [30, 15], "Kofi's bonus rows (+30 volunteer bonus, then +15 cleaned the kiln)");
assert(refused(/CHECK constraint failed/).length >= 1, "Mark the 0-minute row with -- expect error");
assert(accepted().length === 0, "One of your -- expect error statements was accepted: it should have been refused");`,
        },
        {
          id: "t5",
          description: "The transactions ran in the right order, none is left open, and the balances add up",
          assertionCode: t`const seq = log.map((e) => (e.verb === "ROLLBACK" && /\bto\b/i.test(e.sql) ? "ROLLBACK TO" : e.verb)).filter((v) => ["BEGIN", "COMMIT", "ROLLBACK", "ROLLBACK TO", "SAVEPOINT", "RELEASE"].includes(v));
const hasInOrder = (want) => { let i = 0; for (const v of seq) if (v === want[i]) i++; return i === want.length; };
assert(hasInOrder(["BEGIN", "COMMIT", "BEGIN", "ROLLBACK", "BEGIN", "SAVEPOINT", "ROLLBACK TO", "RELEASE", "COMMIT"]), "Your transactions should run in this order: BEGIN..COMMIT (gift), BEGIN..ROLLBACK (failed gift), BEGIN..SAVEPOINT..ROLLBACK TO..RELEASE..COMMIT (bonuses). Yours: " + seq.join(", "));
let open = true;
try { query("BEGIN"); open = false; query("ROLLBACK"); } catch (e) { open = true; }
assert(!open, "A transaction was left open at the end of your file: finish every BEGIN with COMMIT or ROLLBACK");
const total = num("SELECT SUM(minutes) FROM credit_ledger");
assertEqual(total, num("SELECT SUM(p.included_minutes) FROM member m JOIN plan p ON p.id = m.plan_id") + 45, "Sum of the whole ledger: allowances, plus the two bonuses (45); the gift nets to zero and the failed gift leaves nothing");
const rs = data(["full_name", "balance"], "Add the balance report: full_name, balance", /credit_ledger/);
const want = all("SELECT m.full_name, SUM(l.minutes) AS balance FROM credit_ledger l JOIN member m ON m.id = l.member_id GROUP BY m.id ORDER BY balance DESC, m.full_name LIMIT 6");
assertEqual(rs.length, 6, "Rows in the balance report (top six)");
rs.forEach((r, i) => assert(r.full_name === want[i].full_name && r.balance === want[i].balance, "Balance report row " + (i + 1) + ": expected " + want[i].full_name + " " + want[i].balance + ", got " + r.full_name + " " + r.balance));`,
        },
      ],
      unlocks: ["ss-tx"],
      checks: [
        {
          prompt: "Inside `BEGIN`, one INSERT fails with a constraint error. What state is the transaction in?",
          question: {
            type: "choice",
            options: [
              "Rolled back automatically: everything since BEGIN is undone",
              "Still open: only the failed statement was undone and earlier changes are pending",
              "Committed up to the failed statement",
            ],
            answer: 1,
          },
          explanation: "A failed statement undoes its own effects and leaves the transaction open. Code that ignores the error and later commits makes the half-finished work permanent, so handle the error explicitly with ROLLBACK (or ROLLBACK TO a savepoint).",
        },
        {
          prompt: "After `ROLLBACK TO extra`, can you still add rows and `COMMIT`?",
          question: { type: "choice", options: ["Yes: the transaction is still open", "No: ROLLBACK TO ends the transaction", "Only after a new BEGIN"], answer: 0 },
          explanation: "ROLLBACK TO undoes work back to the savepoint but keeps the transaction (and the savepoint) alive. RELEASE discards the savepoint, and COMMIT makes everything permanent.",
        },
      ],
    },
  ],
};
