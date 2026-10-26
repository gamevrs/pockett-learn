import type { Chapter } from "@/engine/types";
import { md, sql, t } from "./util.ts";

/**
 * Chapter 3: keeping, isolating and speeding up the data.
 * Soft delete, erasure and retention; tenant isolation; query plans and indexes; N+1 and keyset paging.
 */
export const chapter3: Chapter = {
  id: "isolation-and-speed",
  title: "Isolation, retention and speed",
  blurb: "What to delete, what to keep, how tenants stay apart, and how to prove a query is fast.",
  lessons: [
    // ───────────────────────────── 10 ─────────────────────────────
    {
      id: "counting-house-10-retention",
      title: "Delete, hide or keep",
      minutes: 26,
      xp: 150,
      concepts: ["soft delete", "partial unique index", "pseudonymisation", "retention sweeps", "changes()"],
      learn: md`### Three kinds of "gone"

When something leaves a system there are three honest options, and they are not interchangeable:

- **Hard delete**: the row is removed. Right for caches, expired tokens and finished operational records. Wrong for anything other rows point at.
- **Soft delete**: the row stays but is marked hidden (\`deleted_at\`). Right when the thing is part of history but should disappear from the product.
- **Anonymise** (pseudonymise): the row stays, the personal data inside it is replaced. Right when the law says a person must be forgotten and also says the books must be kept.

Which one applies is decided by four pressures: **legal retention** (accounting records must be kept for years), **privacy** (a person can ask to be erased), **referential integrity** (other rows point at this one) and **operational hygiene** (logs and caches should not grow for ever).

### Why a member cannot be hard-deleted

Hollis Greer is leaving the co-op. His wallet is at zero, but his id appears on orders, on an account, and in the ledger lines behind them. Delete him and the foreign keys refuse, which is the database doing its job. Even if you removed the constraints, you would be destroying the evidence that a sale ever happened. So Hollis is **soft-deleted** now and **anonymised** later.

~~~sql
ALTER TABLE members ADD COLUMN deleted_at TEXT;
UPDATE members SET deleted_at = (SELECT now FROM clock) WHERE handle = 'hollis';
~~~

Soft delete has a famous failure: someone writes a query and forgets \`WHERE deleted_at IS NULL\`, and departed members get emails, show up in counts and keep voting. Make the safe path the easy path: a view \`v_active_members\` that filters for you, and make the application read through it.

### Unique means unique among the living

Hollis's handle \`hollis\` is taken until someone says otherwise, even though he has left. A **partial unique index** keeps handles unique only among live members, so the name can be reused:

~~~sql
CREATE UNIQUE INDEX ux_members_handle_live ON members (tenant_id, handle) WHERE deleted_at IS NULL;
~~~

### Erasing the person, keeping the ledger

When the erasure request is due, replace what identifies him: \`display_name\` becomes \`Former member #6\`, \`email\` becomes NULL. Then go and look for the *other* places the name leaked. The wallet account is called "Wallet · Hollis Greer", a perfectly innocent label that is personal data. (You kept personal data out of the audit log last lesson for exactly this reason.) Ids and amounts are not personal data and stay, so every ledger line still adds up.

### Retention sweeps

Operational tables must not grow for ever. Two of yours qualify: **idempotency keys** (nobody retries a seven-day-old request) and **sent outbox events**. Rules for sweeping safely:

- delete only what is **finished**: done keys, sent events. An old event that is still pending is a bug to investigate, never garbage;
- choose the window on purpose: keys must outlive the longest retry a client could plausibly attempt; events must outlive the slowest consumer you might want to replay;
- delete in **batches** (\`WHERE rowid IN (SELECT rowid … LIMIT 100)\`) so one sweep never holds a long lock;
- **log every sweep**. Right after the DELETE, \`changes()\` returns how many rows it removed, so \`INSERT INTO retention_runs … SELECT …, changes()\` records it in one statement.

### Common mistakes

- Soft delete with no view and no discipline.
- A plain \`UNIQUE\` on a soft-deletable column, which makes the old row block the new one for ever.
- Anonymising the person row and leaving their name in a label, a memo or a log.
- Sweeping by age alone and deleting events that never reached the broker.`,
      mission: md`Hollis Greer has left the co-op and has asked to be forgotten, and the idempotency table and outbox are growing without limit. Remove the person without breaking the books, then put the housekeeping on a schedule you can audit.

The **Retention sweep** panel shows what each sweep purged and what it kept.`,
      tasks: [
        "Soft-delete Hollis (deleted_at, a v_active_members view, a partial unique handle index), reuse his handle for a new member, and show a hard delete being refused",
        "Erase his personal data: pseudonymise the member row and the label of his wallet account, leaving every ledger line intact",
        "Sweep idempotency keys and sent outbox events older than 7 days in batches, log each sweep in retention_runs, and report purged and kept",
      ],
      starterAdd: sql`-- ── ✏️ YOUR TURN ───────────────────────────
-- Lesson 10: delete, hide or keep. "Now" is (SELECT now FROM clock).
--
-- 1. Soft delete.
--    a) ALTER TABLE members ADD COLUMN deleted_at TEXT;  then set deleted_at = now for the member with handle 'hollis'
--    b) under  -- expect error  try to hard delete him (DELETE FROM members WHERE handle = 'hollis'): the foreign keys refuse
--    c) CREATE VIEW v_active_members AS every column of members where deleted_at IS NULL
--    d) a partial UNIQUE index on members (tenant_id, handle) WHERE deleted_at IS NULL
--    e) a new member can now take the handle: INSERT tenant 1, handle 'hollis', display_name 'Hollis Gray',
--       email 'hollis.gray@example.test', role 'buyer', joined_on '2026-03-02'
--
-- 2. Erase the departed member (every member with deleted_at set): display_name = 'Former member #' || member_id,
--    email = NULL. Also rename the wallet account(s) they own to 'Wallet · Former member #' || owner_member_id.
--
-- 3. Retention.
--    retention_runs: run_id INTEGER PRIMARY KEY, run_at TEXT NOT NULL, store TEXT NOT NULL, purged INTEGER NOT NULL
--    a) delete idempotency_keys that are state 'done' and created more than 7 days before now, at most 100 per sweep
--       (WHERE rowid IN (SELECT rowid ... LIMIT 100)); then INSERT INTO retention_runs ... SELECT now, 'idempotency_keys', changes()
--    b) the same for outbox rows with status 'sent' and created_at more than 7 days before now (store 'outbox'); never touch pending ones
--    c) store, purged, kept: one row per retention_runs row ordered by run_id; kept = how many rows the store holds now
`,
      solutionAdd: sql`-- Soft delete: hide the member, keep the history
ALTER TABLE members ADD COLUMN deleted_at TEXT;

UPDATE members SET deleted_at = (SELECT now FROM clock) WHERE handle = 'hollis';

-- Hard delete is refused: orders, accounts and ledger lines point at him
-- expect error
DELETE FROM members WHERE handle = 'hollis';

CREATE VIEW v_active_members AS
SELECT * FROM members WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX ux_members_handle_live ON members (tenant_id, handle) WHERE deleted_at IS NULL;

INSERT INTO members (tenant_id, handle, display_name, email, role, joined_on)
VALUES (1, 'hollis', 'Hollis Gray', 'hollis.gray@example.test', 'buyer', '2026-03-02');

-- Erase the person, keep the ids and the ledger
UPDATE members
SET display_name = 'Former member #' || member_id, email = NULL
WHERE deleted_at IS NOT NULL;

UPDATE accounts
SET name = 'Wallet · Former member #' || owner_member_id
WHERE owner_member_id IN (SELECT member_id FROM members WHERE deleted_at IS NOT NULL);

-- Retention sweeps, logged
CREATE TABLE retention_runs (
  run_id INTEGER PRIMARY KEY,
  run_at TEXT NOT NULL,
  store TEXT NOT NULL,
  purged INTEGER NOT NULL
);

DELETE FROM idempotency_keys
WHERE rowid IN (
  SELECT rowid FROM idempotency_keys
  WHERE state = 'done' AND created_at < datetime((SELECT now FROM clock), '-7 days')
  ORDER BY created_at
  LIMIT 100
);
INSERT INTO retention_runs (run_at, store, purged) SELECT (SELECT now FROM clock), 'idempotency_keys', changes();

DELETE FROM outbox
WHERE rowid IN (
  SELECT rowid FROM outbox
  WHERE status = 'sent' AND created_at < datetime((SELECT now FROM clock), '-7 days')
  ORDER BY event_id
  LIMIT 100
);
INSERT INTO retention_runs (run_at, store, purged) SELECT (SELECT now FROM clock), 'outbox', changes();

SELECT store, purged,
  CASE store
    WHEN 'idempotency_keys' THEN (SELECT COUNT(*) FROM idempotency_keys)
    WHEN 'outbox' THEN (SELECT COUNT(*) FROM outbox)
  END AS kept
FROM retention_runs
ORDER BY run_id;`,
      explanation:
        "A soft delete keeps every foreign key satisfied, and the view plus the partial unique index make hidden rows invisible and let the handle be reused. Pseudonymising replaces what identifies the person (including the label on his wallet account) while ids and amounts stay, so the ledger is untouched. The sweeps delete only finished rows, in batches, and record changes() immediately after each DELETE; the pending events that are old enough to qualify by age are deliberately left alone.",
      hints: [
        { id: "h1", title: "Soft delete pieces", content: "ALTER TABLE members ADD COLUMN deleted_at TEXT; UPDATE members SET deleted_at = (SELECT now FROM clock) WHERE handle = 'hollis'; CREATE UNIQUE INDEX ux_members_handle_live ON members (tenant_id, handle) WHERE deleted_at IS NULL; The refused DELETE goes right after the UPDATE, under -- expect error." },
        { id: "h2", title: "Erasure reaches the labels", content: "UPDATE members SET display_name = 'Former member #' || member_id, email = NULL WHERE deleted_at IS NOT NULL; then UPDATE accounts SET name = 'Wallet · Former member #' || owner_member_id WHERE owner_member_id IN (SELECT member_id FROM members WHERE deleted_at IS NOT NULL);" },
        { id: "h3", title: "Sweep and log", content: "DELETE FROM idempotency_keys WHERE rowid IN (SELECT rowid FROM idempotency_keys WHERE state = 'done' AND created_at < datetime((SELECT now FROM clock), '-7 days') LIMIT 100); then INSERT INTO retention_runs (run_at, store, purged) SELECT (SELECT now FROM clock), 'idempotency_keys', changes(); changes() must be read in the very next statement." },
      ],
      tests: [
        {
          id: "t1",
          description: "Hollis is hidden, not deleted: the view hides him, his handle is free again and a hard delete is refused",
          assertionCode: t`assert(cols("members").includes("deleted_at"), "members needs a deleted_at column");
const old = one("SELECT member_id, deleted_at FROM members WHERE member_id = 6");
assert(old && old.deleted_at, "Member 6 (Hollis) must still exist, with deleted_at set");
assertEqual(num("SELECT COUNT(*) FROM members WHERE deleted_at IS NOT NULL"), 1, "Only Hollis is soft-deleted");
assert(has("view", "v_active_members"), "Create the view v_active_members");
assertEqual(num("SELECT COUNT(*) FROM v_active_members WHERE member_id = 6"), 0, "The view must hide the departed member");
assertEqual(num("SELECT COUNT(*) FROM v_active_members"), num("SELECT COUNT(*) FROM members WHERE deleted_at IS NULL"), "The view shows exactly the live members");
const fresh = one("SELECT member_id, tenant_id, display_name FROM members WHERE handle = 'hollis' AND deleted_at IS NULL");
assert(fresh && fresh.member_id !== 6, "A new live member with the handle 'hollis' should exist");
assert(probe("INSERT INTO members (tenant_id, handle, display_name, role, joined_on) VALUES (1, 'hollis', 'Third Hollis', 'buyer', '2026-03-02')") !== null, "Two LIVE members cannot share a handle in a tenant");
assertEqual(probe("INSERT INTO members (tenant_id, handle, display_name, role, joined_on) VALUES (2, 'hollis', 'Other tenant', 'buyer', '2026-03-02')"), null, "The same handle in another tenant is fine");
assert(refused(/FOREIGN KEY constraint failed/).some((e) => /^DELETE FROM members/i.test(e.sql)), "Show the hard delete being refused: DELETE FROM members WHERE handle = 'hollis' under -- expect error");
assertEqual(accepted().length, 0, "A statement under -- expect error was accepted");`,
        },
        {
          id: "t2",
          description: "The departed member is pseudonymised everywhere, and the ledger is untouched",
          assertionCode: t`const m = one("SELECT display_name, email, handle FROM members WHERE member_id = 6");
assert(!/hollis|greer/i.test(m.display_name), "display_name still identifies him: " + m.display_name);
assert(m.email === null, "email must be NULL after erasure");
const a = query("SELECT name FROM accounts WHERE owner_member_id = 6");
assert(a.length >= 1, "His wallet account must still exist");
for (const x of a) assert(!/hollis|greer/i.test(x.name), "The wallet label still contains his name: " + x.name);
assert(num("SELECT COUNT(*) FROM journal_lines l JOIN accounts a ON a.account_id = l.account_id WHERE a.owner_member_id = 6") > 0, "His ledger lines must still exist");
assertEqual(num("SELECT COUNT(*) FROM orders WHERE buyer_id = 6"), num("SELECT COUNT(*) FROM orders WHERE buyer_id = 6 AND tenant_id = 1"), "Orders are untouched");
const live = one("SELECT display_name FROM members WHERE handle = 'hollis' AND deleted_at IS NULL");
assertEqual(live.display_name, "Hollis Gray", "The new member must not be erased");
assertEqual(num("SELECT COUNT(*) FROM members WHERE display_name LIKE 'Former member #%'"), 1, "Exactly one member is pseudonymised");`,
        },
        {
          id: "t3",
          description: "Both stores were swept: only finished rows older than 7 days went, in a logged run each",
          assertionCode: t`assert(has("table", "retention_runs"), "Create the retention_runs table");
const runs = query("SELECT store, purged FROM retention_runs ORDER BY run_id");
assertEqual(runs.map((r) => r.store), ["idempotency_keys", "outbox"], "One logged run per store, in that order");
const cutoff = "datetime((SELECT now FROM clock), '-7 days')";
const oldPayouts = num("SELECT COUNT(*) FROM payouts WHERE created_at < " + cutoff);
assert(oldPayouts > 0, "Setup data changed");
assertEqual(runs[0].purged, oldPayouts, "purged keys: every done key older than 7 days");
assertEqual(num("SELECT COUNT(*) FROM idempotency_keys"), num("SELECT COUNT(*) FROM payouts WHERE created_at >= " + cutoff), "Only keys younger than 7 days remain");
assertEqual(runs[1].purged, 5, "purged events: the five sent events (all older than 7 days)");
assertEqual(num("SELECT COUNT(*) FROM outbox WHERE status = 'sent'"), 0, "No old sent events remain");
assert(num("SELECT COUNT(*) FROM outbox WHERE status = 'pending' AND created_at < " + cutoff) > 0, "Old PENDING events must be kept: they were never delivered");
assertEqual(num("SELECT COUNT(*) FROM outbox"), num("SELECT COUNT(*) FROM payouts") - 5, "Nothing else may be deleted from the outbox");`,
        },
        {
          id: "t4",
          description: "The report shows purged and kept per store",
          assertionCode: t`const got = data(["store", "purged", "kept"], "Add the report: store, purged, kept", /retention_runs/);
assertEqual(got.length, 2, "One row per sweep");
const kept = { idempotency_keys: num("SELECT COUNT(*) FROM idempotency_keys"), outbox: num("SELECT COUNT(*) FROM outbox") };
const logged = Object.fromEntries(query("SELECT store, purged FROM retention_runs").map((r) => [r.store, r.purged]));
for (const g of got) { assertEqual(g.kept, kept[g.store], "kept for " + g.store); assertEqual(g.purged, logged[g.store], "purged for " + g.store); }`,
        },
      ],
      unlocks: ["ch-retention"],
      checks: [
        {
          prompt: "Why can Hollis not simply be hard-deleted from `members`?",
          question: {
            type: "choice",
            options: [
              "Orders, accounts and ledger lines reference him, and the books must be kept",
              "SQLite does not support DELETE on tables with triggers",
              "Soft deletes are always faster",
              "Members are protected by the audit log",
            ],
            answer: 0,
          },
          explanation: "The foreign keys protect you from creating orphans, and accounting rules require the records to be kept anyway. The person is hidden now and anonymised on request; the row and its ids stay.",
        },
        {
          prompt: "Why must a sweep skip outbox events that are old but still `pending`?",
          question: {
            type: "choice",
            options: [
              "An old pending event was never delivered: deleting it silently loses a notification instead of exposing the stuck relay",
              "Pending events cannot be deleted in SQLite",
              "They are needed for foreign keys",
              "Pending events are already counted as sent",
            ],
            answer: 0,
          },
          explanation: "Age alone is not the criterion. Only finished work is garbage. Unfinished old work is a symptom to alert on.",
        },
      ],
    },

    // ───────────────────────────── 11 ─────────────────────────────
    {
      id: "counting-house-11-tenants",
      title: "Many co-ops, one database",
      minutes: 28,
      xp: 170,
      concepts: ["tenant isolation", "composite foreign keys", "scoped views", "session context", "IDOR"],
      learn: md`### The mistake that ends companies

Fernhollow, Saltmarsh and Kiln Street share one database. The nightmare is not a hacker; it is a missing \`WHERE\`. A route like \`GET /entries/1042\` runs \`SELECT * FROM journal_entries WHERE entry_id = 1042\`. Ids are guessable. Nothing in that query ties the id to the caller's tenant, so a member of one co-op reads another co-op's books by changing a number in the URL. This class of bug has a name, **IDOR** (insecure direct object reference), and it is the most common serious flaw in multi-tenant software.

### Defence in layers

No single measure is enough, so stack them:

1. **\`tenant_id\` on every row, \`NOT NULL\`, from day one.** (The tables you built have it.)
2. **Make foreign keys prove ownership, not just existence.** A normal foreign key says "this account exists". It does not say "this account belongs to the same tenant as the entry". Today a line in Fernhollow's entry can point at a Saltmarsh account, and nothing complains. For *new* tables, use a **composite** foreign key that includes the tenant: \`FOREIGN KEY (tenant_id, member_id) REFERENCES members (tenant_id, member_id)\` (the parent needs a unique index on exactly those columns). For *existing* tables SQLite cannot add a foreign key afterwards without rebuilding the table (lesson 17), so you guard them with triggers.
3. **Scoped views.** Application code reads through views that apply the caller's tenant for it, so forgetting the filter is impossible:

~~~sql
CREATE VIEW v_entries AS
SELECT * FROM journal_entries WHERE tenant_id = (SELECT tenant_id FROM session_ctx);
~~~

4. **Tests that attack.** Set the context to one tenant and look for another's rows.

### Where the tenant comes from

The context row (\`session_ctx\`) is set by the server *after authentication*, from the caller's credentials. It is never a request parameter, a header the client controls or a default. PostgreSQL has row-level security to enforce this inside the engine; here the views play that role, and the application's database user would be allowed to read only the views.

### Cross-tenant joins are leaks too

A view over \`journal_lines\` that forgets to filter through its entry leaks every tenant's lines. Build child views from parent views (\`v_lines\` joins \`v_entries\`) so the scope is inherited. The same discipline applies to caches (key them by tenant), to background jobs (they get an explicit tenant, never a default) and to admin dashboards (a separate, deliberate, audited role).

### Cheap wins that help twice

Leading an index with \`tenant_id\` makes queries both faster and harder to write unscoped. Putting the tenant in the key of every idempotency record, as you did, stops one tenant's key from colliding with another's.

### Common mistakes

- Trusting a \`tenant_id\` query parameter.
- Scoping the parent table but joining an unscoped child.
- Using a global unique constraint on something that is only unique per tenant (or the reverse).
- Checking isolation only for reads. Test that writes cannot cross tenants either.`,
      mission: md`Three co-ops share this database, and today nothing stops a ledger line in one tenant from pointing at another's account. Close the hole, build the first table with ownership-proving keys, give the application views that cannot be queried unscoped, and prove each tenant sees only itself.

The **Tenant isolation** panel is a tenant switcher with a leak detector.`,
      tasks: [
        "Add triggers that refuse a journal line whose account belongs to a different tenant than its entry (on insert and on update), and show one being refused inside a transaction you roll back",
        "Create bank_destinations with a composite foreign key (tenant_id, member_id), fill it for every seller, and show a cross-tenant destination being refused",
        "Create tenant-scoped views v_entries, v_lines and v_balances, then query each tenant's counts as that tenant (ending back on tenant 1)",
        "Compare an unscoped lookup of another tenant's entry with the scoped one, and count any cross-tenant lines",
      ],
      starterAdd: sql`-- ── ✏️ YOUR TURN ───────────────────────────
-- Lesson 11: many co-ops, one database. The caller's tenant lives in session_ctx (id, actor, tenant_id).
--
-- 1. Cross-tenant guard: trg_lines_same_tenant_insert (BEFORE INSERT ON journal_lines) and trg_lines_same_tenant_update
--    (BEFORE UPDATE OF entry_id, account_id) abort when the account's tenant_id is not the entry's tenant_id (use IS NOT).
--    Show it working: BEGIN; insert a draft entry (id 901) for tenant 2; then under  -- expect error  insert a line on it
--    that debits tenant 1's 'bank' account; ROLLBACK;
--
-- 2. bank_destinations: destination_id INTEGER PRIMARY KEY, tenant_id INTEGER NOT NULL, member_id INTEGER NOT NULL,
--    label TEXT NOT NULL, account_last4 TEXT NOT NULL, and FOREIGN KEY (tenant_id, member_id) REFERENCES members (tenant_id, member_id)
--    (the parent needs a UNIQUE index on members (tenant_id, member_id) first).
--    Insert one destination per seller: label = display_name || ' · main account',
--    account_last4 = printf('%04d', member_id * 1373 % 10000).
--    Then, under  -- expect error , insert a destination for tenant 2 that belongs to member 'marlowe' (who is in tenant 1).
--
-- 3. Scoped views (each reads the tenant from session_ctx): v_entries (journal_entries), v_lines (journal_lines of v_entries),
--    v_balances (v_trial_balance rows). Then, for tenants 1, 2 and 3 in turn: UPDATE session_ctx SET tenant_id = N and run
--      as_tenant (read from session_ctx), entries (rows in v_entries), lines (rows in v_lines), debits_cents (SUM of debit_cents in v_balances)
--    Finish with  UPDATE session_ctx SET tenant_id = 1.
--
-- 4. a) lookup, rows_returned: two rows. 'unscoped lookup' counts journal_entries rows with entry_id = the lowest entry id of tenant 2;
--       'scoped lookup' counts v_entries rows with that same id (as tenant 1 it should find nothing)
--    b) cross_tenant_lines: how many lines point at an account of a different tenant than their entry (should be 0)
`,
      solutionAdd: sql`-- Lines may only touch accounts of their own tenant
CREATE TRIGGER trg_lines_same_tenant_insert
BEFORE INSERT ON journal_lines
WHEN (SELECT tenant_id FROM accounts WHERE account_id = NEW.account_id)
     IS NOT (SELECT tenant_id FROM journal_entries WHERE entry_id = NEW.entry_id)
BEGIN
  SELECT RAISE(ABORT, 'that account belongs to a different tenant');
END;

CREATE TRIGGER trg_lines_same_tenant_update
BEFORE UPDATE OF entry_id, account_id ON journal_lines
WHEN (SELECT tenant_id FROM accounts WHERE account_id = NEW.account_id)
     IS NOT (SELECT tenant_id FROM journal_entries WHERE entry_id = NEW.entry_id)
BEGIN
  SELECT RAISE(ABORT, 'that account belongs to a different tenant');
END;

BEGIN;
INSERT INTO journal_entries (entry_id, tenant_id, posted_at, memo) VALUES (901, 2, '2026-03-01 00:00:00', 'cross-tenant attempt');
-- expect error
INSERT INTO journal_lines (entry_id, account_id, debit_cents)
VALUES (901, (SELECT account_id FROM accounts WHERE tenant_id = 1 AND role = 'bank'), 100);
ROLLBACK;

-- A table whose key proves ownership
CREATE UNIQUE INDEX ux_members_tenant_member ON members (tenant_id, member_id);

CREATE TABLE bank_destinations (
  destination_id INTEGER PRIMARY KEY,
  tenant_id INTEGER NOT NULL,
  member_id INTEGER NOT NULL,
  label TEXT NOT NULL,
  account_last4 TEXT NOT NULL,
  FOREIGN KEY (tenant_id, member_id) REFERENCES members (tenant_id, member_id)
);

INSERT INTO bank_destinations (tenant_id, member_id, label, account_last4)
SELECT tenant_id, member_id, display_name || ' · main account', printf('%04d', member_id * 1373 % 10000)
FROM members
WHERE role = 'seller';

-- expect error
INSERT INTO bank_destinations (tenant_id, member_id, label, account_last4)
VALUES (2, (SELECT member_id FROM members WHERE handle = 'marlowe'), 'someone else''s seller', '0000');

-- Views that cannot be queried unscoped
CREATE VIEW v_entries AS
SELECT * FROM journal_entries WHERE tenant_id = (SELECT tenant_id FROM session_ctx);

CREATE VIEW v_lines AS
SELECT l.* FROM journal_lines AS l JOIN v_entries AS e ON e.entry_id = l.entry_id;

CREATE VIEW v_balances AS
SELECT * FROM v_trial_balance WHERE tenant_id = (SELECT tenant_id FROM session_ctx);

-- The tenant switcher
UPDATE session_ctx SET tenant_id = 1;
SELECT (SELECT tenant_id FROM session_ctx) AS as_tenant, (SELECT COUNT(*) FROM v_entries) AS entries, (SELECT COUNT(*) FROM v_lines) AS lines, (SELECT SUM(debit_cents) FROM v_balances) AS debits_cents;

UPDATE session_ctx SET tenant_id = 2;
SELECT (SELECT tenant_id FROM session_ctx) AS as_tenant, (SELECT COUNT(*) FROM v_entries) AS entries, (SELECT COUNT(*) FROM v_lines) AS lines, (SELECT SUM(debit_cents) FROM v_balances) AS debits_cents;

UPDATE session_ctx SET tenant_id = 3;
SELECT (SELECT tenant_id FROM session_ctx) AS as_tenant, (SELECT COUNT(*) FROM v_entries) AS entries, (SELECT COUNT(*) FROM v_lines) AS lines, (SELECT SUM(debit_cents) FROM v_balances) AS debits_cents;

UPDATE session_ctx SET tenant_id = 1;

-- The IDOR test: someone else's entry, asked for by id
SELECT 'unscoped lookup' AS lookup, COUNT(*) AS rows_returned
FROM journal_entries
WHERE entry_id = (SELECT MIN(entry_id) FROM journal_entries WHERE tenant_id = 2)
UNION ALL
SELECT 'scoped lookup', COUNT(*)
FROM v_entries
WHERE entry_id = (SELECT MIN(entry_id) FROM journal_entries WHERE tenant_id = 2);

SELECT COUNT(*) AS cross_tenant_lines
FROM journal_lines AS l
JOIN journal_entries AS e ON e.entry_id = l.entry_id
JOIN accounts AS a ON a.account_id = l.account_id
WHERE a.tenant_id <> e.tenant_id;`,
      explanation:
        "The triggers close the gap a plain foreign key leaves: existence is checked by the FK, ownership by the trigger. bank_destinations does it declaratively with a composite key, which the engine enforces on every write. The views read the tenant from session_ctx, v_lines inherits its scope from v_entries, and running the same counts as three different tenants shows the row sets partition the data. The unscoped lookup leaks one row; the scoped lookup finds nothing.",
      hints: [
        { id: "h1", title: "Guard with IS NOT", content: "CREATE TRIGGER … BEFORE INSERT ON journal_lines WHEN (SELECT tenant_id FROM accounts WHERE account_id = NEW.account_id) IS NOT (SELECT tenant_id FROM journal_entries WHERE entry_id = NEW.entry_id) BEGIN SELECT RAISE(ABORT, '…'); END; For UPDATE use BEFORE UPDATE OF entry_id, account_id. The demonstration needs a draft entry of tenant 2, so do it inside BEGIN … ROLLBACK." },
        { id: "h2", title: "Composite keys", content: "CREATE UNIQUE INDEX ux_members_tenant_member ON members (tenant_id, member_id); then in bank_destinations: FOREIGN KEY (tenant_id, member_id) REFERENCES members (tenant_id, member_id). A destination for tenant 2 + a tenant-1 member has no matching parent row, so it is refused." },
        { id: "h3", title: "Switcher", content: "Run UPDATE session_ctx SET tenant_id = 2; then SELECT (SELECT tenant_id FROM session_ctx) AS as_tenant, (SELECT COUNT(*) FROM v_entries) AS entries, (SELECT COUNT(*) FROM v_lines) AS lines, (SELECT SUM(debit_cents) FROM v_balances) AS debits_cents; once per tenant, and end with tenant_id = 1 again." },
      ],
      tests: [
        {
          id: "t1",
          description: "A line cannot touch another tenant's account, on insert or on update, but same-tenant lines still work",
          assertionCode: t`const bank1 = "(SELECT account_id FROM accounts WHERE tenant_id = 1 AND role = 'bank')";
const bank2 = "(SELECT account_id FROM accounts WHERE tenant_id = 2 AND role = 'bank')";
const head = "INSERT INTO journal_entries (entry_id, tenant_id, posted_at, memo) VALUES (902, 2, '2026-03-01 00:00:00', 'probe'); ";
assert(probe(head + "INSERT INTO journal_lines (entry_id, account_id, debit_cents) VALUES (902, " + bank1 + ", 100)") !== null, "A tenant-2 entry must not accept a line on a tenant-1 account");
assertEqual(probe(head + "INSERT INTO journal_lines (entry_id, account_id, debit_cents) VALUES (902, " + bank2 + ", 100)"), null, "A tenant-2 entry must accept a line on a tenant-2 account");
assert(probe(head + "INSERT INTO journal_lines (entry_id, account_id, debit_cents) VALUES (902, " + bank2 + ", 100); UPDATE journal_lines SET account_id = " + bank1 + " WHERE entry_id = 902") !== null, "Re-pointing a line at another tenant's account must be refused too");
assertEqual(num("SELECT COUNT(*) FROM journal_entries WHERE entry_id = 901"), 0, "The demonstration entry must be rolled back");
assert(refused().some((e) => /^INSERT INTO journal_lines/i.test(e.sql)), "Show the cross-tenant line being refused under -- expect error");`,
        },
        {
          id: "t2",
          description: "bank_destinations proves ownership with a composite foreign key and has one row per seller",
          assertionCode: t`const fks = query("PRAGMA foreign_key_list(bank_destinations)");
assert(fks.some((f) => f.table === "members") && fks.filter((f) => f.table === "members").length >= 2, "bank_destinations needs a COMPOSITE foreign key to members (tenant_id, member_id)");
assertEqual(num("SELECT COUNT(*) FROM bank_destinations"), num("SELECT COUNT(*) FROM members WHERE role = 'seller'"), "One destination per seller");
const bad = num("SELECT COUNT(*) FROM bank_destinations d JOIN members m ON m.member_id = d.member_id WHERE d.tenant_id <> m.tenant_id OR d.label <> m.display_name || ' · main account' OR d.account_last4 <> printf('%04d', m.member_id * 1373 % 10000)");
assertEqual(bad, 0, "Destinations: label = display_name || ' · main account', account_last4 = printf('%04d', member_id * 1373 % 10000), same tenant as the member");
assert(probe("INSERT INTO bank_destinations (tenant_id, member_id, label, account_last4) VALUES (2, (SELECT member_id FROM members WHERE handle = 'marlowe'), 'x', '0000')") !== null, "A destination whose tenant differs from its member's must be refused");
assertEqual(probe("INSERT INTO bank_destinations (tenant_id, member_id, label, account_last4) VALUES (1, (SELECT member_id FROM members WHERE handle = 'marlowe'), 'second', '0001')"), null, "A destination in the member's own tenant is fine");
assert(refused(/FOREIGN KEY constraint failed/).some((e) => /^INSERT INTO bank_destinations/i.test(e.sql)), "Show the cross-tenant destination being refused under -- expect error");
assertEqual(accepted().length, 0, "A statement under -- expect error was accepted");`,
        },
        {
          id: "t3",
          description: "The scoped views return only the current tenant's rows, whoever the current tenant is",
          assertionCode: t`for (const v of ["v_entries", "v_lines", "v_balances"]) assert(has("view", v), "Create the view " + v);
for (const tenant of [1, 2, 3]) {
  query("SAVEPOINT scope");
  query("UPDATE session_ctx SET tenant_id = " + tenant);
  const entries = num("SELECT COUNT(*) FROM v_entries");
  const foreign = num("SELECT COUNT(*) FROM v_entries WHERE tenant_id <> " + tenant);
  const lines = num("SELECT COUNT(*) FROM v_lines");
  const balances = num("SELECT COUNT(*) FROM v_balances WHERE tenant_id <> " + tenant);
  query("ROLLBACK TO scope");
  query("RELEASE scope");
  assertEqual(entries, num("SELECT COUNT(*) FROM journal_entries WHERE tenant_id = " + tenant), "v_entries as tenant " + tenant);
  assertEqual(foreign, 0, "v_entries leaked another tenant's rows as tenant " + tenant);
  assertEqual(lines, num("SELECT COUNT(*) FROM journal_lines l JOIN journal_entries e ON e.entry_id = l.entry_id WHERE e.tenant_id = " + tenant), "v_lines as tenant " + tenant);
  assertEqual(balances, 0, "v_balances leaked another tenant's accounts as tenant " + tenant);
}`,
        },
        {
          id: "t4",
          description: "The tenant switcher shows each tenant's own counts, and the session ends on tenant 1",
          assertionCode: t`const sets = results.filter((r) => ["as_tenant", "entries", "lines", "debits_cents"].every((c) => r.columns.includes(c)));
for (const tenant of [1, 2, 3]) {
  const rs = sets.filter((r) => r.rows.length === 1 && r.rows[0][r.columns.indexOf("as_tenant")] === tenant).pop();
  assert(rs, "Run the counts as tenant " + tenant + " (a result with as_tenant = " + tenant + ")");
  const row = Object.fromEntries(rs.columns.map((c, i) => [c, rs.rows[0][i]]));
  assertEqual(row.entries, num("SELECT COUNT(*) FROM journal_entries WHERE tenant_id = " + tenant), "entries as tenant " + tenant);
  assertEqual(row.lines, num("SELECT COUNT(*) FROM journal_lines l JOIN journal_entries e ON e.entry_id = l.entry_id WHERE e.tenant_id = " + tenant), "lines as tenant " + tenant);
  assertEqual(row.debits_cents, num("SELECT SUM(l.debit_cents) FROM journal_lines l JOIN journal_entries e ON e.entry_id = l.entry_id WHERE e.status = 'posted' AND e.tenant_id = " + tenant), "debits_cents as tenant " + tenant);
}
assertEqual(one("SELECT tenant_id AS t FROM session_ctx").t, 1, "Finish with UPDATE session_ctx SET tenant_id = 1");`,
        },
        {
          id: "t5",
          description: "The IDOR comparison leaks through the unscoped lookup only, and no line crosses tenants",
          assertionCode: t`const rows2 = data(["lookup", "rows_returned"], "Add the lookup comparison: lookup, rows_returned");
assertEqual(rows2.length, 2, "Two rows: unscoped and scoped");
const un = rows2.find((r) => /unscoped/i.test(r.lookup));
const sc = rows2.find((r) => /^scoped/i.test(r.lookup));
assert(un && sc, "Name the rows 'unscoped lookup' and 'scoped lookup'");
assertEqual(un.rows_returned, 1, "The unscoped lookup finds the other tenant's entry (that is the leak)");
assertEqual(sc.rows_returned, 0, "The scoped lookup, as tenant 1, finds nothing");
const x = data(["cross_tenant_lines"], "Add: SELECT COUNT(*) AS cross_tenant_lines …")[0];
assertEqual(x.cross_tenant_lines, 0, "No line should point at another tenant's account");`,
        },
      ],
      unlocks: ["ch-tenants"],
      checks: [
        {
          prompt: "A foreign key from journal_lines.account_id to accounts(account_id) is in place. Why can a Fernhollow line still point at a Saltmarsh account?",
          question: {
            type: "choice",
            options: [
              "The foreign key only checks that the account exists, not whose it is",
              "Foreign keys are ignored in multi-tenant databases",
              "Saltmarsh accounts are visible to every tenant by design",
              "The line's tenant_id column overrides the key",
            ],
            answer: 0,
          },
          explanation: "A single-column key proves existence. Ownership needs the tenant in the key (a composite foreign key) or a trigger that compares the two tenants.",
        },
        {
          prompt: "Where should the tenant in `session_ctx` come from?",
          question: {
            type: "choice",
            options: [
              "A tenant_id parameter in the request URL",
              "A header the client sends",
              "The server, derived from the caller's authenticated credentials",
              "The most recently used tenant",
            ],
            answer: 2,
          },
          explanation: "Anything the client controls can be changed by an attacker. The tenant must be established server-side after authentication, and views, caches and jobs all inherit it from there.",
        },
      ],
    },

    // ───────────────────────────── 12 ─────────────────────────────
    {
      id: "counting-house-12-plans",
      title: "Prove the index helps",
      minutes: 26,
      xp: 160,
      concepts: ["EXPLAIN QUERY PLAN", "composite index order", "covering index", "partial index", "SCAN vs SEARCH"],
      learn: md`### Do not guess; read the plan

When a query is slow, the instinct is to add an index. Sometimes that is right and sometimes it adds write cost for nothing. The way to know is to ask the database how it will run the query:

~~~sql
EXPLAIN QUERY PLAN
SELECT SUM(debit_cents) AS debits FROM journal_lines WHERE account_id = 3;
~~~

The answer is a few lines of text. Learn to read four phrases:

- **SCAN table**: reads every row. Fine for tiny tables; the thing to eliminate on hot paths of big ones.
- **SEARCH table USING INDEX …**: jumps straight to the matching rows through an index.
- **… USING COVERING INDEX …**: the index holds every column the query needs, so the table itself is never read.
- **USE TEMP B-TREE FOR ORDER BY**: SQLite had to sort the results itself because no index delivered them in order.

Run the plan **before** and **after** creating an index, on the same statement. The pair is your proof.

### Foreign keys are not indexed

A foreign key constrains writes; it does not speed reads. \`journal_lines.account_id\` references accounts, yet nothing indexes it, so "what is this account's balance?" scans every line in the ledger. Index the columns you filter and join on, not just the ones with constraints.

### Column order in a composite index

A composite index is sorted by its first column, then by the second inside each first value, and so on. It helps a query for a **left prefix**:

- **equality columns first**, then the range or ordering column: \`(tenant_id, status, posted_at)\` serves \`tenant_id = ? AND status = ? AND posted_at >= ? ORDER BY posted_at\`: jump to the tenant/status block, walk it in time order, no sort;
- the same columns the other way round, \`(posted_at, tenant_id, status)\`, cannot jump anywhere useful for that query.

### Covering indexes

If the index also contains \`debit_cents\` and \`credit_cents\`, the sums can be computed from the index alone: \`(account_id, debit_cents, credit_cents)\`. The price is a wider index to maintain; reserve it for hot, narrow queries.

### Partial indexes for hot subsets

The job queue grows by thousands of finished jobs a day, but workers only care about the queued ones. An index \`ON jobs (priority DESC, run_at, job_id) WHERE state = 'queued'\` contains only queued rows, so it stays tiny however long the history grows, and it is already in the order the claim query wants. The plan says \`SCAN jobs USING COVERING INDEX …\`, and here SCAN is fine: it walks a short index in order and stops at \`LIMIT\`.

### Indexes are not free

Every \`INSERT\`, \`UPDATE\` of an indexed column and \`DELETE\` must maintain every index on the table. Ten speculative indexes can make writes several times slower for no read benefit. Add one for a measured query, prove it with the plan, and drop the ones nothing uses.

### Things that defeat an index

Wrapping the column in a function (\`WHERE lower(email) = …\`, \`WHERE substr(posted_at, 1, 7) = '2026-02'\`, \`WHERE date(posted_at) = …\`) hides it from the index. Rewrite as a range (\`posted_at >= '2026-02-01' AND posted_at < '2026-03-01'\`) or create an index on the expression itself.

### Common mistakes

- Judging by one plan. SQLite's choice depends on the data; re-check after large changes, and run \`ANALYZE\` to refresh its statistics.
- Treating every SCAN as a bug. Scanning a 12-row table, or an ordered partial index under a \`LIMIT\`, is cheap.
- Indexing a low-selectivity column alone (a status with three values).`,
      mission: md`Support reports three slow places: an account balance lookup, February's statement list and the job claim query. You will not guess. For each, capture the plan, create the index you believe fixes it, capture the plan again, and let the two outputs argue your case.

The **Query plans** panel lays each before and after side by side, with an estimate of the rows read.`,
      tasks: [
        "Account balance: EXPLAIN the lookup of one account's debits and credits, add a covering index, EXPLAIN again",
        "February list: EXPLAIN the tenant/status/date-range query, add the composite index in the right column order, EXPLAIN again",
        "Job claim: EXPLAIN the claim ordering, add a partial index on the queued jobs, EXPLAIN again",
      ],
      starterAdd: sql`-- ── ✏️ YOUR TURN ───────────────────────────
-- Lesson 12: prove the index helps. For each hot path: EXPLAIN QUERY PLAN the statement, CREATE INDEX, then run the
-- IDENTICAL EXPLAIN QUERY PLAN statement again so the panel can show before and after. Name your indexes ix_...
--
-- 1. Account balance (account 3 is Odalys's wallet):
--      EXPLAIN QUERY PLAN
--      SELECT SUM(debit_cents) AS debits, SUM(credit_cents) AS credits FROM journal_lines WHERE account_id = 3;
--    Make the plan say COVERING INDEX: the index must hold account_id and both sums' columns.
--
-- 2. February's posted entries for tenant 1:
--      EXPLAIN QUERY PLAN
--      SELECT entry_id, memo FROM journal_entries
--      WHERE tenant_id = 1 AND status = 'posted' AND posted_at >= '2026-02-01' AND posted_at < '2026-03-01'
--      ORDER BY posted_at;
--    Equality columns first, then the range/ordering column. The temp b-tree for ORDER BY must disappear.
--
-- 3. The job claim ordering:
--      EXPLAIN QUERY PLAN
--      SELECT job_id FROM jobs
--      WHERE state = 'queued' AND run_at <= '2026-03-02 09:15:00'
--      ORDER BY priority DESC, run_at, job_id
--      LIMIT 3;
--    A PARTIAL index containing only the queued jobs, in the order the claim wants: (priority DESC, run_at, job_id).
`,
      solutionAdd: sql`-- 1. One account's balance
EXPLAIN QUERY PLAN
SELECT SUM(debit_cents) AS debits, SUM(credit_cents) AS credits FROM journal_lines WHERE account_id = 3;

CREATE INDEX ix_lines_account ON journal_lines (account_id, debit_cents, credit_cents);

EXPLAIN QUERY PLAN
SELECT SUM(debit_cents) AS debits, SUM(credit_cents) AS credits FROM journal_lines WHERE account_id = 3;

-- 2. A month of posted entries for one tenant
EXPLAIN QUERY PLAN
SELECT entry_id, memo FROM journal_entries
WHERE tenant_id = 1 AND status = 'posted' AND posted_at >= '2026-02-01' AND posted_at < '2026-03-01'
ORDER BY posted_at;

CREATE INDEX ix_entries_tenant_time ON journal_entries (tenant_id, status, posted_at);

EXPLAIN QUERY PLAN
SELECT entry_id, memo FROM journal_entries
WHERE tenant_id = 1 AND status = 'posted' AND posted_at >= '2026-02-01' AND posted_at < '2026-03-01'
ORDER BY posted_at;

-- 3. The job claim
EXPLAIN QUERY PLAN
SELECT job_id FROM jobs
WHERE state = 'queued' AND run_at <= '2026-03-02 09:15:00'
ORDER BY priority DESC, run_at, job_id
LIMIT 3;

CREATE INDEX ix_jobs_due ON jobs (priority DESC, run_at, job_id) WHERE state = 'queued';

EXPLAIN QUERY PLAN
SELECT job_id FROM jobs
WHERE state = 'queued' AND run_at <= '2026-03-02 09:15:00'
ORDER BY priority DESC, run_at, job_id
LIMIT 3;`,
      explanation:
        "Before any index, the balance lookup scans every ledger line, the monthly list scans the entries table and sorts with a temp b-tree, and the claim scans every job and sorts. A covering index on (account_id, debit_cents, credit_cents) answers the sums from the index alone. Putting the equality columns (tenant_id, status) before the range column (posted_at) lets SQLite jump to a block that is already in date order, so the sort disappears. The partial index holds only queued jobs in claim order, so the claim walks a short, pre-sorted index and stops at LIMIT 3.",
      hints: [
        { id: "h1", title: "Same statement twice", content: "Copy the EXPLAIN QUERY PLAN statement exactly (same text, same literals) above and below your CREATE INDEX so the two plans can be compared. Account balance index: (account_id, debit_cents, credit_cents)." },
        { id: "h2", title: "Order of columns", content: "Equality columns come first: CREATE INDEX ix_entries_tenant_time ON journal_entries (tenant_id, status, posted_at). If the plan still says USE TEMP B-TREE FOR ORDER BY, the range column is not last or a column is missing." },
        { id: "h3", title: "Partial index", content: "CREATE INDEX ix_jobs_due ON jobs (priority DESC, run_at, job_id) WHERE state = 'queued'; the query must repeat state = 'queued' literally for SQLite to be allowed to use a partial index." },
      ],
      tests: [
        {
          id: "t1",
          description: "Account balance: the plan went from a full scan to a covering-index search",
          assertionCode: t`const norm = (s) => strip(s).replace(/explain\s+query\s+plan/i, "").replace(/\s+/g, " ").trim().toLowerCase();
const plans = results.filter((r) => r.columns.includes("detail") && r.columns.includes("parent"));
const mine = plans.filter((r) => norm(r.sql).includes("from journal_lines where account_id = 3"));
assert(mine.length >= 2, "Run EXPLAIN QUERY PLAN for the account balance before and after the index (found " + mine.length + ")");
const text = (r) => r.rows.map((x) => x[r.columns.indexOf("detail")]).join(" | ");
assert(/SCAN journal_lines/.test(text(mine[0])), "The first plan should show the full scan, got: " + text(mine[0]));
assert(/SEARCH journal_lines USING COVERING INDEX/.test(text(mine[mine.length - 1])), "The last plan should be a SEARCH … USING COVERING INDEX, got: " + text(mine[mine.length - 1]));
assert(/COVERING INDEX/.test(plan("SELECT SUM(debit_cents) AS debits, SUM(credit_cents) AS credits FROM journal_lines WHERE account_id = 3")), "The index must still cover the query in the finished database");`,
        },
        {
          id: "t2",
          description: "Monthly list: equality columns first, so the search needs no temp b-tree for ORDER BY",
          assertionCode: t`const norm = (s) => strip(s).replace(/explain\s+query\s+plan/i, "").replace(/\s+/g, " ").trim().toLowerCase();
const plans = results.filter((r) => r.columns.includes("detail") && r.columns.includes("parent"));
const mine = plans.filter((r) => norm(r.sql).includes("from journal_entries where tenant_id = 1 and status = 'posted' and posted_at >="));
assert(mine.length >= 2, "Run EXPLAIN QUERY PLAN for the February list before and after the index (found " + mine.length + ")");
const text = (r) => r.rows.map((x) => x[r.columns.indexOf("detail")]).join(" | ");
assert(/SCAN journal_entries/.test(text(mine[0])) && /TEMP B-TREE/.test(text(mine[0])), "The first plan should be a scan plus a temp b-tree, got: " + text(mine[0]));
const last = text(mine[mine.length - 1]);
assert(/SEARCH journal_entries USING (COVERING )?INDEX/.test(last), "The last plan should SEARCH journal_entries using an index, got: " + last);
assert(!/TEMP B-TREE/.test(last), "The last plan must not need a temp b-tree: put tenant_id and status before posted_at. Got: " + last);
const p = plan("SELECT entry_id, memo FROM journal_entries WHERE tenant_id = 1 AND status = 'posted' AND posted_at >= '2026-02-01' AND posted_at < '2026-03-01' ORDER BY posted_at");
assert(/SEARCH/.test(p) && !/TEMP B-TREE/.test(p), "The finished database must still use the index without sorting: " + p);`,
        },
        {
          id: "t3",
          description: "Job claim: a partial index over the queued jobs removes the scan and the sort",
          assertionCode: t`const norm = (s) => strip(s).replace(/explain\s+query\s+plan/i, "").replace(/\s+/g, " ").trim().toLowerCase();
const plans = results.filter((r) => r.columns.includes("detail") && r.columns.includes("parent"));
const mine = plans.filter((r) => norm(r.sql).includes("from jobs where state = 'queued' and run_at <="));
assert(mine.length >= 2, "Run EXPLAIN QUERY PLAN for the job claim before and after the index (found " + mine.length + ")");
const text = (r) => r.rows.map((x) => x[r.columns.indexOf("detail")]).join(" | ");
assert(/TEMP B-TREE/.test(text(mine[0])), "The first plan should need a temp b-tree for the ordering, got: " + text(mine[0]));
const last = text(mine[mine.length - 1]);
assert(/USING (COVERING )?INDEX/.test(last) && !/TEMP B-TREE/.test(last), "The last plan should walk an index in order with no sort, got: " + last);
const idx = query("SELECT name, sql FROM sqlite_master WHERE type = 'index' AND tbl_name = 'jobs' AND sql LIKE '%queued%'");
assert(idx.length >= 1 && /where\s+state\s*=\s*'queued'/i.test(idx[0].sql), "Create a PARTIAL index: ... WHERE state = 'queued'");
assert(/priority\s+desc/i.test(idx[0].sql), "Index priority DESC first, as the claim orders by it");`,
        },
        {
          id: "t4",
          description: "Only the indexes you needed exist on these tables, with sensible names",
          assertionCode: t`const mine = query("SELECT name, tbl_name FROM sqlite_master WHERE type = 'index' AND name LIKE 'ix\\_%' ESCAPE '\\'");
assert(mine.length >= 3, "Name your three indexes ix_… (found " + mine.length + ")");
assert(mine.length <= 5, "Every index costs writes. You created " + mine.length + " ix_ indexes: keep only the ones a plan justifies");
for (const tbl of ["journal_lines", "journal_entries", "jobs"]) assert(mine.some((m) => m.tbl_name === tbl), "No ix_ index found on " + tbl);`,
        },
      ],
      unlocks: ["ch-plans"],
      checks: [
        {
          prompt: "A query filters on `tenant_id = ? AND status = ?` and sorts by `posted_at`. Which composite index serves it without a sort?",
          question: {
            type: "choice",
            options: [
              "(posted_at, tenant_id, status)",
              "(tenant_id, status, posted_at)",
              "(status, posted_at)",
              "(posted_at)",
            ],
            answer: 1,
          },
          explanation: "Equality columns first jump to the right block; inside it, rows are already in posted_at order. Starting with posted_at cannot use the two equality conditions to jump anywhere.",
        },
        {
          prompt: "`SCAN jobs USING COVERING INDEX ix_jobs_due` appears in the plan. Is the scan a problem?",
          question: {
            type: "choice",
            options: [
              "Yes: every SCAN means reading the whole table",
              "No: it walks a small partial index that is already in claim order, and LIMIT stops it early",
              "Yes: covering indexes always scan",
              "No: SCAN and SEARCH mean the same thing",
            ],
            answer: 1,
          },
          explanation: "SCAN of the table is the red flag. Scanning a short, ordered, partial index and stopping at LIMIT reads only a handful of entries.",
        },
      ],
    },

    // ───────────────────────────── 13 ─────────────────────────────
    {
      id: "counting-house-13-pages",
      title: "No N+1, no OFFSET",
      minutes: 26,
      xp: 150,
      concepts: ["N+1 queries", "set-based aggregation", "keyset pagination", "row-value comparison", "stable cursors"],
      learn: md`### The N+1 problem

The statements screen shows twenty entries, each with its number of lines and its total. The obvious code asks once for the entries, then loops and asks twenty more times, once per entry: **N+1 queries**. Every query is a network round trip plus parsing and planning. At 8 ms each, a page of 200 entries takes 1.6 seconds of pure waiting, and ORMs make it easy to write without noticing.

The cure is to ask for the whole shape at once. SQL is built for it: one \`JOIN\` and one \`GROUP BY\` return every entry with its totals in a single pass.

~~~sql
SELECT e.entry_id, e.posted_at, e.memo, COUNT(*) AS line_count, SUM(l.debit_cents) AS total_cents
FROM journal_entries AS e
JOIN journal_lines AS l ON l.entry_id = e.entry_id
WHERE …
GROUP BY e.entry_id
~~~

When the loop genuinely cannot be avoided, batch it: fetch the children for many parents with one \`WHERE entry_id IN (…)\` instead of one query per parent. A good habit is to count the queries a request makes and fail a test when the count grows with the data.

### Why OFFSET pagination breaks

\`LIMIT 20 OFFSET 4000\` has to find the first 4000 rows and throw them away before returning 20, so each deeper page costs more than the last. Worse, the pages are not stable: if a new entry is inserted between two page loads, everything shifts by one, and the reader sees a row twice or never.

### Keyset (seek) pagination

Instead of "skip 4000", say "give me what comes **after the last row I saw**". The client carries the last row's sort key (the *cursor*) to the next request:

~~~sql
SELECT entry_id, posted_at, memo
FROM journal_entries
WHERE tenant_id = 1 AND status = 'posted'
  AND (posted_at, entry_id) < ('2026-02-26 09:16:37', 163)
ORDER BY posted_at DESC, entry_id DESC
LIMIT 8;
~~~

The parenthesised pair is a **row value**: SQLite compares it lexicographically (first the dates, and only on a tie the ids). Because many entries share a timestamp, the key needs a unique tiebreaker, here \`entry_id\`; sorting by \`posted_at\` alone would skip or repeat rows at page boundaries. The cost of every page is the same, and a row inserted meanwhile cannot shift what you have already read.

The trade-off is honest: you cannot jump to "page 37", only to the next or previous page. That is exactly what feeds, statements and infinite scroll need.

### Index and verify

The index from the last lesson (\`tenant_id, status, posted_at\`, with the primary key implicitly appended) delivers rows in precisely this order, so the page query needs no scan and no sort. Verify by reading the plan, not by hoping.

### Common mistakes

- A cursor on a non-unique column alone.
- Mixing \`ASC\` and \`DESC\` inside a row-value comparison. The comparison assumes one direction for all columns; for mixed directions spell the condition out with \`OR\`.
- Using \`OFFSET\` "just for the first few pages". It becomes the deep-page problem the day someone scrolls.
- Forgetting the tenant condition, so one tenant's cursor pages through another's data.`,
      mission: md`The statements page is slow and sometimes shows an entry twice. It loads the entries, then runs one extra query for each entry's totals, and it pages with OFFSET while payouts and top-ups keep arriving.

Replace the N+1 with one set-based query, then page through tenant 1's posted entries by cursor, newest first, eight at a time, without ever using OFFSET.`,
      tasks: [
        "One query returns every posted entry of tenant 1 since 2026-02-24 with its line_count and total_cents",
        "Page 1: the 8 newest posted entries of tenant 1 (posted_at DESC, entry_id DESC), with a page column",
        "Pages 2 and 3 by keyset cursor taken from the last row of the previous page, then EXPLAIN page 2 to prove it needs no scan and no sort",
      ],
      starterAdd: sql`-- ── ✏️ YOUR TURN ───────────────────────────
-- Lesson 13: no N+1, no OFFSET.
--
-- 1. The whole statements list in ONE query (no per-entry queries): for tenant 1's posted entries with
--    posted_at >= '2026-02-24', return entry_id, posted_at, memo, line_count (number of lines), total_cents (sum of debit_cents),
--    ordered by posted_at, entry_id.
--
-- 2. Page 1: 1 AS page, entry_id, posted_at, memo for tenant 1's posted entries, newest first
--    (ORDER BY posted_at DESC, entry_id DESC), LIMIT 8.
--
-- 3. Run page 1, look at its LAST row, and copy that row's posted_at and entry_id into page 2 as the cursor:
--      AND (posted_at, entry_id) < ('<posted_at of the last row of page 1>', <entry_id of that row>)
--    with the same ORDER BY and LIMIT 8, selecting 2 AS page. Then do the same for page 3 from page 2's last row.
--    No OFFSET anywhere. Finally run EXPLAIN QUERY PLAN on your page 2 statement: it must show no SCAN and no TEMP B-TREE
--    (if it does, add an index on journal_entries (tenant_id, status, posted_at, entry_id)).
`,
      solutionAdd: sql`-- 1. The whole list at once
SELECT e.entry_id, e.posted_at, e.memo, COUNT(*) AS line_count, SUM(l.debit_cents) AS total_cents
FROM journal_entries AS e
JOIN journal_lines AS l ON l.entry_id = e.entry_id
WHERE e.tenant_id = 1 AND e.status = 'posted' AND e.posted_at >= '2026-02-24'
GROUP BY e.entry_id
ORDER BY e.posted_at, e.entry_id;

-- 2. Page 1
SELECT 1 AS page, entry_id, posted_at, memo
FROM journal_entries
WHERE tenant_id = 1 AND status = 'posted'
ORDER BY posted_at DESC, entry_id DESC
LIMIT 8;

-- 3. Pages 2 and 3: seek past the last row seen
SELECT 2 AS page, entry_id, posted_at, memo
FROM journal_entries
WHERE tenant_id = 1 AND status = 'posted'
  AND (posted_at, entry_id) < ('2026-02-26 09:16:37', 163)
ORDER BY posted_at DESC, entry_id DESC
LIMIT 8;

SELECT 3 AS page, entry_id, posted_at, memo
FROM journal_entries
WHERE tenant_id = 1 AND status = 'posted'
  AND (posted_at, entry_id) < ('2026-02-24 10:51:07', 175)
ORDER BY posted_at DESC, entry_id DESC
LIMIT 8;

EXPLAIN QUERY PLAN
SELECT 2 AS page, entry_id, posted_at, memo
FROM journal_entries
WHERE tenant_id = 1 AND status = 'posted'
  AND (posted_at, entry_id) < ('2026-02-26 09:16:37', 163)
ORDER BY posted_at DESC, entry_id DESC
LIMIT 8;`,
      explanation:
        "One JOIN with GROUP BY returns every entry's line count and total in a single pass, so the number of queries no longer grows with the number of entries. Each page after the first filters on the row value (posted_at, entry_id) being smaller than the last row seen and orders the same way, so the pages tile the sequence exactly, one cost per page, and a row inserted meanwhile cannot move what was already read. The tenant/status/time index delivers rows in that order, so the plan is a SEARCH with no sort.",
      hints: [
        { id: "h1", title: "One pass", content: "JOIN journal_lines l ON l.entry_id = e.entry_id, then GROUP BY e.entry_id with COUNT(*) AS line_count and SUM(l.debit_cents) AS total_cents. Selecting e.posted_at and e.memo next to the GROUP BY is fine: they are the same for every line of the entry." },
        { id: "h2", title: "The cursor", content: "Run page 1 and read its last row, e.g. ('2026-02-26 09:16:37', 163) in the reference data (yours should match if your entries were posted in the same order). Page 2 adds AND (posted_at, entry_id) < ('2026-02-26 09:16:37', 163) and keeps ORDER BY posted_at DESC, entry_id DESC LIMIT 8." },
        { id: "h3", title: "Prove it", content: "EXPLAIN QUERY PLAN + the page 2 statement. You want a line like SEARCH journal_entries USING INDEX … and no 'USE TEMP B-TREE FOR ORDER BY'. If you see SCAN, create an index on journal_entries (tenant_id, status, posted_at, entry_id)." },
      ],
      tests: [
        {
          id: "t1",
          description: "One set-based query lists every entry with its line count and total",
          assertionCode: t`const rs = need(["entry_id", "line_count", "total_cents"], "Add the single query: entry_id, posted_at, memo, line_count, total_cents");
assert(/group\s+by/.test(sqlOf(rs)), "Aggregate with GROUP BY in one query");
assert(!/offset/.test(sqlOf(rs)), "No OFFSET");
const got = objs(rs);
const want = query("SELECT e.entry_id AS entry_id, COUNT(*) AS line_count, SUM(l.debit_cents) AS total_cents FROM journal_entries e JOIN journal_lines l ON l.entry_id = e.entry_id WHERE e.tenant_id = 1 AND e.status = 'posted' AND e.posted_at >= '2026-02-24' GROUP BY e.entry_id");
match(got, want, "entry_id", ["line_count", "total_cents"], "the statements list");
const ordered = got.map((r) => r.posted_at + " " + String(r.entry_id).padStart(8, "0"));
assertEqual(ordered, [...ordered].sort(), "Order by posted_at, entry_id");`,
        },
        {
          id: "t2",
          description: "Pages 1, 2 and 3 tile the newest 24 posted entries exactly: no gap and no repeat",
          assertionCode: t`const order = query("SELECT entry_id FROM journal_entries WHERE tenant_id = 1 AND status = 'posted' ORDER BY posted_at DESC, entry_id DESC LIMIT 24").map((r) => r.entry_id);
const pageOf = (n) => {
  const rs = results.filter((r) => r.columns.includes("page") && r.columns.includes("entry_id") && r.rows.length > 0 && r.rows[0][r.columns.indexOf("page")] === n).pop();
  assert(rs, "Run page " + n + " (a result whose page column is " + n + ")");
  return rs;
};
const ids = (rs) => rs.rows.map((r) => r[rs.columns.indexOf("entry_id")]);
const p1 = pageOf(1), p2 = pageOf(2), p3 = pageOf(3);
assertEqual(ids(p1), order.slice(0, 8), "Page 1 should be the 8 newest posted entries");
assertEqual(ids(p2), order.slice(8, 16), "Page 2 should continue exactly after page 1's last row");
assertEqual(ids(p3), order.slice(16, 24), "Page 3 should continue exactly after page 2's last row");
for (const rs of [p2, p3]) {
  const s = sqlOf(rs);
  assert(!/offset/.test(s), "Pages 2 and 3 must not use OFFSET");
  assert(/posted_at/.test(s) && /entry_id/.test(s) && /</.test(s.replace(/<=/g, "")), "Seek with a comparison on (posted_at, entry_id)");
}`,
        },
        {
          id: "t3",
          description: "Page 2 is a pure index search: no scan, no sort",
          assertionCode: t`const p2 = results.filter((r) => r.columns.includes("page") && r.rows.length > 0 && r.rows[0][r.columns.indexOf("page")] === 2).pop();
assert(p2, "Run page 2 first");
const planText = plan(p2.sql);
assert(/SEARCH journal_entries USING/.test(planText), "Page 2 should SEARCH journal_entries using an index, got: " + planText);
assert(!/SCAN/.test(planText), "Page 2 must not SCAN, got: " + planText);
assert(!/TEMP B-TREE/.test(planText), "Page 2 must not sort with a temp b-tree, got: " + planText);
const shown = results.filter((r) => r.columns.includes("detail") && /page/i.test(r.sql) && /\(\s*posted_at\s*,\s*entry_id\s*\)/i.test(r.sql));
assert(shown.length >= 1, "Run EXPLAIN QUERY PLAN on your page 2 statement so the plan is on screen");`,
        },
      ],
      unlocks: ["ch-pages"],
      checks: [
        {
          prompt: "Why does the cursor have to include `entry_id` and not just `posted_at`?",
          question: {
            type: "choice",
            options: [
              "Many entries share one timestamp, so posted_at alone can skip or repeat rows at a page boundary",
              "SQLite cannot compare dates",
              "entry_id makes the query faster",
              "It is only needed for the first page",
            ],
            answer: 0,
          },
          explanation: "A cursor must identify exactly one position in a total order. posted_at ties are broken by the unique id, so 'after this row' has one meaning.",
        },
        {
          prompt: "A new entry is posted between two page loads. With OFFSET paging the reader may see an entry twice. What does keyset paging do?",
          question: {
            type: "choice",
            options: [
              "The same thing: both methods shift",
              "It continues exactly after the last row the reader saw, unaffected by the insert",
              "It refuses to page until the insert finishes",
              "It sorts the new entry into the middle of the next page",
            ],
            answer: 1,
          },
          explanation: "The cursor is a position in the data, not a count from the top, so rows inserted above it cannot move what is below it.",
        },
      ],
    },
  ],
};
