import type { Chapter } from "@/engine/types";
import { md, sql, t } from "./util.ts";

/**
 * Chapter 5: change and close.
 * Evolving a live ledger with expand-backfill-contract migrations, then the capstone: settle,
 * lock the period and prove the books balance.
 */
export const chapter5: Chapter = {
  id: "change-and-close",
  title: "Change and close",
  blurb: "Change a live ledger without stopping it, then close the month and prove the books balance.",
  lessons: [
    // ───────────────────────────── 17 ─────────────────────────────
    {
      id: "counting-house-17-migrations",
      title: "Migrating a live ledger",
      minutes: 30,
      xp: 180,
      concepts: ["expand / backfill / contract", "batched backfill", "dual writes", "migration history & rollbacks", "scoping an immutability trigger"],
      learn: md`### You cannot turn the ledger off

A ledger has no quiet hour. Writers keep posting while you change the schema, and during a deploy old and new versions of the application run side by side. A migration that is only correct if everything stops is not a migration, it is an outage with a plan.

The discipline that makes change safe is **expand, backfill, contract**:

1. **Expand.** Add what the new design needs in a way the old code ignores: a new nullable column, a new table, a new index. Start writing the new thing alongside the old.
2. **Backfill.** Fill in history, in small batches, while the system keeps running.
3. **Contract.** Only when nothing reads the old shape any more, tighten: require the value, drop the old column. This is a separate release, never the same deploy as the expand.

Every step is small, can ship by itself, and can be rolled back until the next one starts.

### The change we will make

Entries need a human-readable **kind** (\`sale\`, \`topup\`, \`refund\`, \`payout\`, \`settlement\`, \`adjustment\`), derived today from \`ref_type\`, so reports can group by it without decoding a code. Three steps: add \`journal_entries.kind\`, backfill every existing entry, then require it.

### Dual writes first

If you backfill history while new rows keep arriving with \`kind\` empty, you are chasing a moving target. So **new rows must get the value from the start**. Here a trigger sets \`kind\` right after each insert (in an application you would change the code that writes the row; a trigger is the stand-in that works for every writer). Only after that is the backfill finite.

### Your own guard will block you

Lesson 3 froze posted entries with a trigger on *any* update. Now you must write \`kind\` on 190 posted entries, and the guard refuses. Do not drop the guard. **Narrow it** to the columns that are financial history: \`BEFORE UPDATE OF tenant_id, posted_at, memo, status, ref_type, ref_id, external_ref, reverses_entry_id\`. Classification metadata can now be added, while the columns that define the books stay frozen. Prove both halves: a refused statement on a protected column, an accepted one on \`kind\`. Weakening a safety rule is itself a change that deserves its own migration entry and a deliberate test.

### Backfill in batches

One \`UPDATE\` over the whole table is a long transaction: it holds locks, blocks writers, cannot be interrupted, and fails all-or-nothing. Backfill by **key ranges**:

~~~sql
UPDATE journal_entries SET kind = … WHERE kind IS NULL AND entry_id > 0 AND entry_id <= 70;
INSERT INTO backfill_log SELECT 1, 1, 70, changes();
~~~

Each batch is short, **resumable** (\`kind IS NULL\` skips finished work, so re-running does no harm) and measurable (the log shows progress and how many rows each batch touched).

### A history you can read and undo

Record every schema change in \`schema_migrations\`: a version number, a name, the phase, when it ran, the SQL that applied it and the SQL that **undoes** it. Write the rollback before you run the migration, because the day you need it is the worst day to invent it. Record with \`ON CONFLICT (version) DO NOTHING\` so replaying the script is safe. Some changes are not reversible (dropping data): say so, and require a backup first.

### What SQLite cannot do

\`ALTER TABLE … ADD COLUMN\` is instant and online. SQLite cannot change an existing column to \`NOT NULL\` or add a foreign key in place; the full fix is the "rebuild" recipe (create the new table, copy, drop, rename, inside a transaction, with foreign keys handled carefully). Here the contract step uses a trigger that refuses to set \`kind\` back to NULL, plus an index, and records itself. Other engines would run \`ALTER COLUMN … SET NOT NULL\`.

### Common mistakes

- A single giant backfill statement.
- Making the column required before every writer fills it.
- Expand and contract in the same deploy.
- No rollback written, or written but never tried.
- Disabling a protective trigger "just for the migration" and forgetting to turn it back on.`,
      mission: md`Finance wants to group the ledger by **kind**, and the column does not exist. The ledger cannot stop, and your own immutability trigger is going to fight you. Add \`kind\` the safe way: expand, backfill in three batches, then contract, with a versioned history and a rollback for each step.

The **Safe migrations** panel shows the timeline of versions and a progress bar for the backfill.`,
      tasks: [
        "Create schema_migrations and record the five earlier schema changes (versions 1 to 5) idempotently",
        "Expand: add journal_entries.kind, narrow the immutability trigger to the financial columns, and write kind automatically on new entries; show a protected column still refused",
        "Backfill kind for all existing entries in three batches by entry_id range, logging how many rows each batch changed",
        "Contract: refuse NULL kind, index it, record migrations 6 to 8 with rollbacks, then show the history and the remaining NULLs",
      ],
      starterAdd: sql`-- ── ✏️ YOUR TURN ───────────────────────────
-- Lesson 17: migrating a live ledger. kind is derived from ref_type:
--   'order' -> 'sale', 'topup' -> 'topup', 'refund' -> 'refund', 'payout' -> 'payout', 'settlement' -> 'settlement', anything else -> 'adjustment'
--
-- 1. schema_migrations: version INTEGER PRIMARY KEY, name TEXT NOT NULL, phase TEXT NOT NULL ('expand', 'backfill' or 'contract'),
--      applied_at TEXT NOT NULL, up_sql TEXT NOT NULL, down_sql TEXT NOT NULL
--    Record the history so far with INSERT ... ON CONFLICT (version) DO NOTHING (phase 'expand', applied_at '2026-03-02 09:00:00',
--    and any short up_sql / down_sql text that undoes it):
--      1 'create ledger tables'   2 'add ledger guard triggers'   3 'add idempotency keys and payouts'
--      4 'add the outbox'         5 'add members.deleted_at'
--
-- 2. Expand.
--    a) ALTER TABLE journal_entries ADD COLUMN kind TEXT;
--    b) Your lesson-3 trigger trg_entries_frozen_update refuses every UPDATE of a posted entry, so it would refuse the backfill.
--       DROP it and recreate it with the same name and message, but BEFORE UPDATE OF tenant_id, posted_at, memo, status, ref_type,
--       ref_id, external_ref, reverses_entry_id  (so kind stays writable).
--       Then prove the financial columns are still frozen: under  -- expect error  UPDATE journal_entries SET memo = 'edited' WHERE entry_id = 1
--    c) trg_entries_kind_on_insert: AFTER INSERT ON journal_entries WHEN NEW.kind IS NULL, set kind from ref_type as above (UPDATE ... WHERE entry_id = NEW.entry_id)
--
-- 3. backfill_log: batch INTEGER PRIMARY KEY, from_id INTEGER NOT NULL, to_id INTEGER NOT NULL, rows_updated INTEGER NOT NULL
--    Three batches, each an UPDATE ... SET kind = <the mapping> WHERE kind IS NULL AND entry_id > from-1 AND entry_id <= to, followed by
--    INSERT INTO backfill_log SELECT <batch>, <from>, <to>, changes();   Ranges: 1-70, 71-140, 141-210.
--
-- 4. Contract.
--    a) trg_entries_kind_required: BEFORE UPDATE OF kind ON journal_entries, abort when NEW.kind IS NULL
--    b) an index on journal_entries (tenant_id, kind, posted_at)
--    c) record migrations 6 'journal_entries.kind: add the column and write it on new rows' (expand), 7 '... backfill history in batches' (backfill),
--       8 '... require it and index it' (contract): applied_at = now, up_sql, and a down_sql that undoes it
--    d) version, name, phase, applied_at for every migration, ordered by version
--    e) remaining (entries whose kind is still NULL) and backfilled (the SUM of rows_updated in backfill_log)
`,
      solutionAdd: sql`-- 1. A history of schema changes
CREATE TABLE schema_migrations (
  version INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  phase TEXT NOT NULL CHECK (phase IN ('expand', 'backfill', 'contract')),
  applied_at TEXT NOT NULL,
  up_sql TEXT NOT NULL,
  down_sql TEXT NOT NULL
);

INSERT INTO schema_migrations (version, name, phase, applied_at, up_sql, down_sql) VALUES
  (1, 'create ledger tables', 'expand', '2026-03-02 09:00:00', 'CREATE TABLE journal_entries ...; CREATE TABLE journal_lines ...;', 'DROP TABLE journal_lines; DROP TABLE journal_entries;'),
  (2, 'add ledger guard triggers', 'expand', '2026-03-02 09:00:00', 'CREATE TRIGGER trg_post_checks ...;', 'DROP TRIGGER trg_post_checks;'),
  (3, 'add idempotency keys and payouts', 'expand', '2026-03-02 09:00:00', 'CREATE TABLE idempotency_keys ...; CREATE TABLE payouts ...;', 'DROP TABLE payouts; DROP TABLE idempotency_keys;'),
  (4, 'add the outbox', 'expand', '2026-03-02 09:00:00', 'CREATE TABLE outbox ...;', 'DROP TABLE outbox;'),
  (5, 'add members.deleted_at', 'expand', '2026-03-02 09:00:00', 'ALTER TABLE members ADD COLUMN deleted_at TEXT;', 'ALTER TABLE members DROP COLUMN deleted_at;')
ON CONFLICT (version) DO NOTHING;

-- 2. Expand: the column, a narrower freeze, and dual writes
ALTER TABLE journal_entries ADD COLUMN kind TEXT;

DROP TRIGGER trg_entries_frozen_update;
CREATE TRIGGER trg_entries_frozen_update
BEFORE UPDATE OF tenant_id, posted_at, memo, status, ref_type, ref_id, external_ref, reverses_entry_id ON journal_entries
WHEN OLD.status = 'posted'
BEGIN
  SELECT RAISE(ABORT, 'posted entries cannot be changed: post a reversal instead');
END;

-- The money columns are still frozen
-- expect error
UPDATE journal_entries SET memo = 'edited' WHERE entry_id = 1;

CREATE TRIGGER trg_entries_kind_on_insert
AFTER INSERT ON journal_entries
WHEN NEW.kind IS NULL
BEGIN
  UPDATE journal_entries
  SET kind = CASE NEW.ref_type
    WHEN 'order' THEN 'sale' WHEN 'topup' THEN 'topup' WHEN 'refund' THEN 'refund'
    WHEN 'payout' THEN 'payout' WHEN 'settlement' THEN 'settlement' ELSE 'adjustment' END
  WHERE entry_id = NEW.entry_id;
END;

-- 3. Backfill in batches
CREATE TABLE backfill_log (
  batch INTEGER PRIMARY KEY,
  from_id INTEGER NOT NULL,
  to_id INTEGER NOT NULL,
  rows_updated INTEGER NOT NULL
);

UPDATE journal_entries
SET kind = CASE ref_type
  WHEN 'order' THEN 'sale' WHEN 'topup' THEN 'topup' WHEN 'refund' THEN 'refund'
  WHEN 'payout' THEN 'payout' WHEN 'settlement' THEN 'settlement' ELSE 'adjustment' END
WHERE kind IS NULL AND entry_id > 0 AND entry_id <= 70;
INSERT INTO backfill_log SELECT 1, 1, 70, changes();

UPDATE journal_entries
SET kind = CASE ref_type
  WHEN 'order' THEN 'sale' WHEN 'topup' THEN 'topup' WHEN 'refund' THEN 'refund'
  WHEN 'payout' THEN 'payout' WHEN 'settlement' THEN 'settlement' ELSE 'adjustment' END
WHERE kind IS NULL AND entry_id > 70 AND entry_id <= 140;
INSERT INTO backfill_log SELECT 2, 71, 140, changes();

UPDATE journal_entries
SET kind = CASE ref_type
  WHEN 'order' THEN 'sale' WHEN 'topup' THEN 'topup' WHEN 'refund' THEN 'refund'
  WHEN 'payout' THEN 'payout' WHEN 'settlement' THEN 'settlement' ELSE 'adjustment' END
WHERE kind IS NULL AND entry_id > 140 AND entry_id <= 210;
INSERT INTO backfill_log SELECT 3, 141, 210, changes();

-- 4. Contract
CREATE TRIGGER trg_entries_kind_required
BEFORE UPDATE OF kind ON journal_entries
WHEN NEW.kind IS NULL
BEGIN
  SELECT RAISE(ABORT, 'kind is required');
END;

CREATE INDEX ix_entries_kind ON journal_entries (tenant_id, kind, posted_at);

INSERT INTO schema_migrations (version, name, phase, applied_at, up_sql, down_sql) VALUES
  (6, 'journal_entries.kind: add the column and write it on new rows', 'expand', (SELECT now FROM clock), 'ALTER TABLE journal_entries ADD COLUMN kind TEXT; CREATE TRIGGER trg_entries_kind_on_insert ...;', 'DROP TRIGGER trg_entries_kind_on_insert; ALTER TABLE journal_entries DROP COLUMN kind;'),
  (7, 'journal_entries.kind: backfill history in batches', 'backfill', (SELECT now FROM clock), 'UPDATE journal_entries SET kind = ... WHERE kind IS NULL AND entry_id BETWEEN ? AND ?;', 'UPDATE journal_entries SET kind = NULL;'),
  (8, 'journal_entries.kind: require it and index it', 'contract', (SELECT now FROM clock), 'CREATE TRIGGER trg_entries_kind_required ...; CREATE INDEX ix_entries_kind ...;', 'DROP INDEX ix_entries_kind; DROP TRIGGER trg_entries_kind_required;')
ON CONFLICT (version) DO NOTHING;

SELECT version, name, phase, applied_at FROM schema_migrations ORDER BY version;

SELECT COUNT(*) AS remaining, (SELECT SUM(rows_updated) FROM backfill_log) AS backfilled
FROM journal_entries
WHERE kind IS NULL;`,
      explanation:
        "The expand step is invisible to old code: a nullable column, a freeze narrowed to the money columns (with a refused UPDATE of memo to prove the narrowing did not open the door), and a trigger that fills kind on every new entry so the backfill has a finite target. The backfill walks entry_id ranges in short, resumable statements and logs changes() for each. Only then does the contract step refuse NULL, index the column and record versions 6 to 8, each with its rollback. A last query proves nothing is left to backfill.",
      hints: [
        { id: "h1", title: "Narrow, don't remove", content: "DROP TRIGGER trg_entries_frozen_update; then CREATE TRIGGER trg_entries_frozen_update BEFORE UPDATE OF tenant_id, posted_at, memo, status, ref_type, ref_id, external_ref, reverses_entry_id ON journal_entries WHEN OLD.status = 'posted' BEGIN SELECT RAISE(ABORT, '…'); END; An UPDATE that only touches kind no longer fires it." },
        { id: "h2", title: "A batch", content: "UPDATE journal_entries SET kind = CASE ref_type WHEN 'order' THEN 'sale' WHEN 'topup' THEN 'topup' WHEN 'refund' THEN 'refund' WHEN 'payout' THEN 'payout' WHEN 'settlement' THEN 'settlement' ELSE 'adjustment' END WHERE kind IS NULL AND entry_id > 0 AND entry_id <= 70; INSERT INTO backfill_log SELECT 1, 1, 70, changes(); Repeat with the other two ranges." },
        { id: "h3", title: "Record it", content: "INSERT INTO schema_migrations (version, name, phase, applied_at, up_sql, down_sql) VALUES (6, '…', 'expand', (SELECT now FROM clock), '…', '…'), (7, …), (8, …) ON CONFLICT (version) DO NOTHING; The down_sql of each is the SQL that exactly undoes it." },
      ],
      tests: [
        {
          id: "t1",
          description: "The migration history lists versions 1 to 8 with the right phases and a rollback for each",
          assertionCode: t`const rows2 = query("SELECT version, name, phase, up_sql, down_sql FROM schema_migrations ORDER BY version");
assertEqual(rows2.map((r) => r.version), [1, 2, 3, 4, 5, 6, 7, 8], "Versions 1 to 8");
assertEqual(rows2.map((r) => r.phase), ["expand", "expand", "expand", "expand", "expand", "expand", "backfill", "contract"], "Phases");
assertEqual(rows2.slice(0, 5).map((r) => r.name), ["create ledger tables", "add ledger guard triggers", "add idempotency keys and payouts", "add the outbox", "add members.deleted_at"], "Names of the first five migrations");
for (const r of rows2) assert(String(r.up_sql).length > 5 && String(r.down_sql).length > 5, "Migration " + r.version + " needs both an up_sql and a down_sql (the rollback)");
assert(/kind/i.test(rows2[5].name) && /backfill/i.test(rows2[6].name) && /index|require/i.test(rows2[7].name), "Name migrations 6, 7 and 8 after the kind column, its backfill, and the contract step");
assert(probe("INSERT INTO schema_migrations (version, name, phase, applied_at, up_sql, down_sql) VALUES (6, 'again', 'expand', 'x', 'x', 'x')") !== null, "A version can be recorded only once");
assert(probe("INSERT INTO schema_migrations (version, name, phase, applied_at, up_sql, down_sql) VALUES (99, 'x', 'sideways', 'x', 'x', 'x')") !== null, "phase must be expand, backfill or contract");`,
        },
        {
          id: "t2",
          description: "Expand: kind exists, new entries get it automatically, the money columns are still frozen but kind is writable",
          assertionCode: t`assert(cols("journal_entries").includes("kind"), "journal_entries needs a kind column");
const kindOf = (refType) => {
  query("SAVEPOINT kindprobe");
  query("INSERT INTO journal_entries (entry_id, tenant_id, posted_at, memo, ref_type, ref_id) VALUES (903, 1, '2026-03-01 00:00:00', 'probe', " + (refType === null ? "NULL" : "'" + refType + "'") + ", " + (refType === null ? "NULL" : "987654") + ")");
  const k = one("SELECT kind FROM journal_entries WHERE entry_id = 903").kind;
  query("ROLLBACK TO kindprobe");
  query("RELEASE kindprobe");
  return k;
};
assertEqual(kindOf("order"), "sale", "A new order entry should get kind 'sale' by itself");
assertEqual(kindOf("payout"), "payout", "A new payout entry should get kind 'payout'");
assertEqual(kindOf("manual"), "adjustment", "A new manual entry should get kind 'adjustment'");
assertEqual(kindOf(null), "adjustment", "An entry with no ref_type is an 'adjustment'");
for (const col of ["memo", "posted_at", "status", "ref_type", "tenant_id"]) assert(probe("UPDATE journal_entries SET " + col + " = " + col + " WHERE entry_id = 1") !== null, "Posted entries must stay frozen: UPDATE of " + col + " should still be refused");
assertEqual(probe("UPDATE journal_entries SET kind = 'adjustment' WHERE entry_id = 1"), null, "kind must be writable on a posted entry");
assert(refused(/posted entries cannot be changed|posted|frozen/i).some((e) => /^UPDATE journal_entries SET memo/i.test(e.sql)), "Show the memo edit being refused under -- expect error");
assertEqual(accepted().length, 0, "A statement under -- expect error was accepted");`,
        },
        {
          id: "t3",
          description: "Backfill: every entry has the right kind, done in several logged batches",
          assertionCode: t`assertEqual(num("SELECT COUNT(*) FROM journal_entries WHERE kind IS NULL"), 0, "Every entry needs a kind");
const bad = num("SELECT COUNT(*) FROM journal_entries WHERE kind <> CASE ref_type WHEN 'order' THEN 'sale' WHEN 'topup' THEN 'topup' WHEN 'refund' THEN 'refund' WHEN 'payout' THEN 'payout' WHEN 'settlement' THEN 'settlement' ELSE 'adjustment' END");
assertEqual(bad, 0, "kind must follow the mapping from ref_type");
const batches = query("SELECT batch, from_id, to_id, rows_updated FROM backfill_log ORDER BY batch");
assert(batches.length >= 3, "Backfill in at least three batches (found " + batches.length + ")");
assert(batches.every((b) => b.to_id - b.from_id + 1 <= 100), "Keep every batch to at most 100 entry ids");
assert(batches.every((b, i) => i === 0 || b.from_id === batches[i - 1].to_id + 1), "Batches must be contiguous ranges");
assertEqual(batches.reduce((a, b) => a + b.rows_updated, 0), num("SELECT COUNT(*) FROM journal_entries"), "The logged rows_updated must add up to the number of entries");
assert(batches.every((b) => b.rows_updated > 0), "Each batch should have updated something: check changes() is read right after the UPDATE");`,
        },
        {
          id: "t4",
          description: "Contract: kind can no longer be cleared, it is indexed, and nothing remains to backfill",
          assertionCode: t`assert(probe("UPDATE journal_entries SET kind = NULL WHERE entry_id = 1") !== null, "Setting kind back to NULL must be refused");
const ix = query("SELECT name FROM sqlite_master WHERE type = 'index' AND tbl_name = 'journal_entries' AND sql LIKE '%kind%'");
assert(ix.length >= 1, "Create an index on journal_entries that includes kind");
const r = data(["remaining", "backfilled"], "Finish with: remaining, backfilled")[0];
assertEqual(r.remaining, 0, "remaining");
assertEqual(r.backfilled, num("SELECT COUNT(*) FROM journal_entries"), "backfilled");`,
        },
        {
          id: "t5",
          description: "The migration list is shown in version order",
          assertionCode: t`const got = data(["version", "name", "phase", "applied_at"], "Add the list: version, name, phase, applied_at", /schema_migrations/);
assertEqual(got.length, 8, "Eight migrations");
assertEqual(got.map((r) => r.version), [1, 2, 3, 4, 5, 6, 7, 8], "Ordered by version");`,
        },
      ],
      unlocks: ["ch-migrations"],
      checks: [
        {
          prompt: "Why are 'expand' and 'contract' separate releases?",
          question: {
            type: "choice",
            options: [
              "While old code still runs, tightening (a required column, a dropped column) would break it; expanding is safe for both versions",
              "SQLite can only run one ALTER per release",
              "Contract steps are always irreversible",
              "It makes the migration table shorter",
            ],
            answer: 0,
          },
          explanation: "During a deploy old and new code coexist. Additions are invisible to old code; tightening is not. Splitting them keeps every intermediate state valid.",
        },
        {
          prompt: "You backfill with a single UPDATE of every row in a table that is still taking writes. Name one thing that goes wrong.",
          question: {
            type: "text",
            answer: ["locks", "long lock", "blocks writers", "long transaction", "it blocks writes", "holds locks", "cannot be resumed", "all or nothing", "lock"],
            placeholder: "one short phrase",
          },
          explanation: "A giant statement is one long transaction: it holds locks that block writers, cannot be interrupted or resumed, and either finishes entirely or rolls back entirely. Batches are short, resumable and measurable.",
        },
      ],
    },

    // ───────────────────────────── 18 ─────────────────────────────
    {
      id: "counting-house-18-close",
      title: "Month-end close",
      minutes: 36,
      xp: 260,
      concepts: ["settlement postings", "suspense accounts", "period lock", "independent proofs", "capstone"],
      learn: md`### What "closing the month" means

On the first working day of March, finance sends February to the owners. For the numbers in that report to mean anything, **nothing may change them afterwards**. Closing is the ritual that guarantees it:

1. **Get every input in.** Here, the processor's settlements for the month must be posted.
2. **Explain the differences.** Reconcile, and make sure what you cannot explain is parked somewhere visible, not hidden.
3. **Prove the books.** Re-derive the key totals from independent sources and check they equal the ledger.
4. **Lock the period.** No entry may be created or posted with a date inside a closed month.
5. **Report.** Only now is the statement final.

If something turns up later (a late invoice, a correction) it is posted in the **next open period**, with a note that it belongs to the previous one, or the period is formally reopened with sign-off. It is never an edit.

### Posting the processor's settlements

When the processor pays out, three things happen at once: cash arrives at the bank (the **net** amount), the processor keeps its **fee**, and the money it was holding for us (the **gross** amount) is no longer held. As an entry:

~~~text
Dr  Bank                     net
Dr  Card processing fees     fee
Cr  Card processor clearing  gross       (the processor owes us less)
~~~

Three rules turn the reconciliation into postings:

- **Post what actually arrived**, not what you expected. A short-paid top-up posts the smaller gross, so the clearing account keeps a visible residual until someone investigates. Do not "fix" it by posting the expected amount.
- **Money you cannot match** (the unknown reference) is not income and not a mistake you can ignore. It is a **liability you cannot attribute yet**. Credit it to the **suspense** account instead of clearing. Suspense is where unexplained money waits to be explained.
- **A duplicated row** in the processor's file is posted **once** (use the lowest settlement id), and the duplicate stays an open finding.

Posting is idempotent exactly as in lesson 2: \`ref_type = 'settlement'\`, \`ref_id\` = the settlement id, the unique index refuses a second booking, and the draft-lines-post sequence applies. Settlements exist for all three tenants; post them all, each to its own tenant's accounts. Date each entry \`settled_on || ' 12:00:00'\`.

### Locking the period

A table \`period_closes\` records which (tenant, month) is closed. Two triggers enforce it: one refuses to **insert** an entry dated in a closed month, one refuses to **post** one (a draft inserted before the close, or one whose date was edited into the closed month, must not slip through at the last step). Closing February for Fernhollow must not affect Saltmarsh, and must not stop Fernhollow from posting in March.

### Proofs: derive it a second way

A proof recomputes a total from a different source than the one being checked, and compares. Six of them hold the ledger honest:

- debits equal credits;
- assets equal liabilities plus equity plus profit (revenue minus expenses): the accounting equation;
- fee revenue equals the fees charged on paid orders;
- seller payables equal earnings (gross minus fee of paid orders) less payouts;
- suspense holds exactly the unidentified receipts;
- processor clearing equals the pre-funded float plus all top-ups, less the gross of settlements that matched a top-up.

When all six agree, the books balance. When one does not, you do not have a vague worry: you have a precise question to chase.

### This is the capstone

The brief below deliberately gives you the accounting rules and not the SQL. You have written every pattern you need: lookups by tenant and role, draft-lines-post, idempotent references, triggers that veto, independent aggregates and a final report.

### Common mistakes

- Posting expected amounts instead of received amounts.
- Crediting unidentified money to revenue.
- Locking only insert, so a pre-existing draft posts into the closed month.
- A proof computed from the ledger itself. It proves nothing.`,
      mission: md`It is the morning of 2 March. February must be closed for Fernhollow, and the owners want proof the books balance. The processor's settlements are in, but not yet in the ledger.

Post them, lock February for tenant 1, and prove the books six ways. When the six proofs agree, the **Month-end close** panel stamps the books as balanced.`,
      tasks: [
        "Post every distinct processor settlement of every tenant: Dr bank (net), Dr processing fees (fee), Cr clearing or suspense (gross), dated settled_on at 12:00:00",
        "Create period_closes with triggers that refuse inserting or posting an entry in a closed month, close February for tenant 1 as 'ops:rhea', and show a February entry being refused",
        "Run the six proofs for tenant 1: proof, expected_cents, actual_cents, ok",
      ],
      starterAdd: sql`-- ── ✏️ YOUR TURN ───────────────────────────
-- Lesson 18: the month-end close. The capstone: no step-by-step this time, only the rules.
--
-- 1. Settlements. processor_settlements has one row per payout from the card processor, for all three tenants, with
--    a possible duplicate row. For each DISTINCT (tenant_id, processor_ref) (use its lowest settlement_id) post ONE entry:
--      ref_type 'settlement', ref_id = settlement_id, external_ref = processor_ref, memo 'Processor settlement ' || processor_ref,
--      posted_at = settled_on || ' 12:00:00'
--      Dr the tenant's 'bank'        net_cents
--      Dr the tenant's 'processing'  fee_cents
--      Cr gross_cents to the tenant's 'clearing' account when a top-up with that processor reference exists in the ledger
--         (journal_entries ref_type 'topup', external_ref = processor_ref, same tenant); otherwise to its 'suspense' account
--    Post what the processor actually sent. Draft entries first, then lines, then post. Your guards apply.
--
-- 2. The period lock. period_closes: tenant_id INTEGER NOT NULL (references tenants), period TEXT NOT NULL ('YYYY-MM'),
--      closed_at TEXT NOT NULL, closed_by TEXT NOT NULL, PRIMARY KEY (tenant_id, period)
--    Two triggers on journal_entries: trg_period_locked_insert (BEFORE INSERT) and trg_period_locked_post (BEFORE UPDATE OF status,
--    only when NEW.status = 'posted') abort when period_closes has a row for the entry's tenant and substr(posted_at, 1, 7).
--    Close '2026-02' for tenant 1 (closed_at = now, closed_by 'ops:rhea'). Then, under  -- expect error , try to INSERT an entry
--    for tenant 1 dated '2026-02-27 10:00:00'.
--
-- 3. The six proofs for tenant 1, as ONE query with columns proof, expected_cents, actual_cents, ok (1 when equal). Derive "expected"
--    from the source tables, not from the ledger, and "actual" from v_trial_balance:
--      'debits equal credits'                                       expected = total credits, actual = total debits
--      'assets equal liabilities + equity + profit'                 expected = liability + equity + revenue balances - expense balances, actual = asset balances
--      'fee revenue equals the fees charged on orders'              expected = SUM(fee_cents) of paid orders, actual = the 'fees' account balance
--      'seller payables equal earnings less payouts'                expected = SUM(gross - fee) of paid orders - SUM(payouts), actual = the payable accounts' balances
--      'suspense holds exactly the unidentified receipts'           expected = gross of the distinct settlements with no matching top-up, actual = the 'suspense' balance
--      'processor clearing equals top-ups still waiting to settle'  expected = the float you posted by hand in lesson 1 (100000)
--                                                                    + all top-ups - the gross of distinct settlements that DO match a top-up, actual = the 'clearing' balance
`,
      solutionAdd: sql`-- 1. Post the processor's settlements, once per distinct reference
INSERT INTO journal_entries (tenant_id, posted_at, memo, ref_type, ref_id, external_ref)
SELECT s.tenant_id, s.settled_on || ' 12:00:00', 'Processor settlement ' || s.processor_ref, 'settlement', s.settlement_id, s.processor_ref
FROM processor_settlements AS s
WHERE s.settlement_id = (
  SELECT MIN(s2.settlement_id) FROM processor_settlements AS s2
  WHERE s2.tenant_id = s.tenant_id AND s2.processor_ref = s.processor_ref
)
ORDER BY s.settled_on, s.settlement_id;

INSERT INTO journal_lines (entry_id, account_id, debit_cents, credit_cents)
SELECT e.entry_id, a.account_id, s.net_cents, 0
FROM processor_settlements AS s
JOIN journal_entries AS e ON e.tenant_id = s.tenant_id AND e.ref_type = 'settlement' AND e.ref_id = s.settlement_id
JOIN accounts AS a ON a.tenant_id = s.tenant_id AND a.role = 'bank'
UNION ALL
SELECT e.entry_id, a.account_id, s.fee_cents, 0
FROM processor_settlements AS s
JOIN journal_entries AS e ON e.tenant_id = s.tenant_id AND e.ref_type = 'settlement' AND e.ref_id = s.settlement_id
JOIN accounts AS a ON a.tenant_id = s.tenant_id AND a.role = 'processing'
UNION ALL
SELECT e.entry_id, a.account_id, 0, s.gross_cents
FROM processor_settlements AS s
JOIN journal_entries AS e ON e.tenant_id = s.tenant_id AND e.ref_type = 'settlement' AND e.ref_id = s.settlement_id
JOIN accounts AS a ON a.tenant_id = s.tenant_id
 AND a.role = CASE WHEN EXISTS (
       SELECT 1 FROM journal_entries AS t WHERE t.tenant_id = s.tenant_id AND t.ref_type = 'topup' AND t.external_ref = s.processor_ref
     ) THEN 'clearing' ELSE 'suspense' END;

UPDATE journal_entries SET status = 'posted' WHERE status = 'draft';

-- 2. Lock the period
CREATE TABLE period_closes (
  tenant_id INTEGER NOT NULL REFERENCES tenants (tenant_id),
  period TEXT NOT NULL,
  closed_at TEXT NOT NULL,
  closed_by TEXT NOT NULL,
  PRIMARY KEY (tenant_id, period)
);

CREATE TRIGGER trg_period_locked_insert
BEFORE INSERT ON journal_entries
WHEN EXISTS (SELECT 1 FROM period_closes WHERE tenant_id = NEW.tenant_id AND period = substr(NEW.posted_at, 1, 7))
BEGIN
  SELECT RAISE(ABORT, 'that accounting period is closed');
END;

CREATE TRIGGER trg_period_locked_post
BEFORE UPDATE OF status ON journal_entries
WHEN NEW.status = 'posted'
 AND EXISTS (SELECT 1 FROM period_closes WHERE tenant_id = NEW.tenant_id AND period = substr(NEW.posted_at, 1, 7))
BEGIN
  SELECT RAISE(ABORT, 'that accounting period is closed');
END;

INSERT INTO period_closes (tenant_id, period, closed_at, closed_by)
VALUES (1, '2026-02', (SELECT now FROM clock), 'ops:rhea');

-- February is closed: a late entry is refused
-- expect error
INSERT INTO journal_entries (tenant_id, posted_at, memo, ref_type)
VALUES (1, '2026-02-27 10:00:00', 'a late invoice', 'manual');

-- 3. Prove the books six ways
SELECT proof, expected_cents, actual_cents, expected_cents = actual_cents AS ok
FROM (
  SELECT 'debits equal credits' AS proof, SUM(credit_cents) AS expected_cents, SUM(debit_cents) AS actual_cents
  FROM v_trial_balance WHERE tenant_id = 1
  UNION ALL
  SELECT 'assets equal liabilities + equity + profit',
         SUM(CASE WHEN kind IN ('liability', 'equity', 'revenue') THEN balance_cents WHEN kind = 'expense' THEN -balance_cents ELSE 0 END),
         SUM(CASE WHEN kind = 'asset' THEN balance_cents ELSE 0 END)
  FROM v_trial_balance WHERE tenant_id = 1
  UNION ALL
  SELECT 'fee revenue equals the fees charged on orders',
         (SELECT SUM(fee_cents) FROM orders WHERE tenant_id = 1 AND status = 'paid'),
         (SELECT balance_cents FROM v_trial_balance WHERE tenant_id = 1 AND code = '4000')
  UNION ALL
  SELECT 'seller payables equal earnings less payouts',
         (SELECT SUM(gross_cents - fee_cents) FROM orders WHERE tenant_id = 1 AND status = 'paid') - (SELECT SUM(amount_cents) FROM payouts WHERE tenant_id = 1),
         (SELECT SUM(balance_cents) FROM v_trial_balance WHERE tenant_id = 1 AND code = '2200')
  UNION ALL
  SELECT 'suspense holds exactly the unidentified receipts',
         (SELECT COALESCE(SUM(s.gross_cents), 0) FROM processor_settlements AS s
          WHERE s.tenant_id = 1 AND s.settlement_id = (SELECT MIN(settlement_id) FROM processor_settlements WHERE tenant_id = 1 AND processor_ref = s.processor_ref)
            AND NOT EXISTS (SELECT 1 FROM topups AS t WHERE t.tenant_id = 1 AND t.processor_ref = s.processor_ref)),
         (SELECT balance_cents FROM v_trial_balance WHERE tenant_id = 1 AND code = '2900')
  UNION ALL
  SELECT 'processor clearing equals top-ups still waiting to settle',
         100000 + (SELECT SUM(amount_cents) FROM topups WHERE tenant_id = 1)
           - (SELECT COALESCE(SUM(s.gross_cents), 0) FROM processor_settlements AS s
              WHERE s.tenant_id = 1 AND s.settlement_id = (SELECT MIN(settlement_id) FROM processor_settlements WHERE tenant_id = 1 AND processor_ref = s.processor_ref)
                AND EXISTS (SELECT 1 FROM topups AS t WHERE t.tenant_id = 1 AND t.processor_ref = s.processor_ref)),
         (SELECT balance_cents FROM v_trial_balance WHERE tenant_id = 1 AND code = '1100')
);`,
      explanation:
        "Each distinct settlement becomes one balanced entry that posts what the processor actually sent: net to the bank, the fee to expense, the gross out of clearing (or into suspense when no top-up matches), so the short-paid top-up leaves a visible residual in clearing and the unknown payment is parked as a liability. The period lock vetoes both inserting and posting into a closed month for that tenant only. The proofs compare totals recomputed from orders, payouts, top-ups and settlements against the ledger's own balances, and all six agree.",
      hints: [
        { id: "h1", title: "One entry per distinct reference", content: "Headers: INSERT INTO journal_entries … SELECT … FROM processor_settlements s WHERE s.settlement_id = (SELECT MIN(settlement_id) FROM processor_settlements WHERE tenant_id = s.tenant_id AND processor_ref = s.processor_ref). Lines: join back on tenant_id, ref_type 'settlement' and ref_id = settlement_id, one SELECT per line (bank, processing, clearing-or-suspense) stacked with UNION ALL." },
        { id: "h2", title: "Clearing or suspense", content: "The credit line's account role is CASE WHEN EXISTS (SELECT 1 FROM journal_entries t WHERE t.tenant_id = s.tenant_id AND t.ref_type = 'topup' AND t.external_ref = s.processor_ref) THEN 'clearing' ELSE 'suspense' END, joined as a.role = (that CASE) with a.tenant_id = s.tenant_id." },
        { id: "h3", title: "Locks and proofs", content: "Both triggers share the condition EXISTS (SELECT 1 FROM period_closes WHERE tenant_id = NEW.tenant_id AND period = substr(NEW.posted_at, 1, 7)). The proofs are UNION ALL rows of (name, expected, actual) inside a subquery; the outer query adds expected_cents = actual_cents AS ok. Balances come from v_trial_balance (balance_cents, filtered by tenant_id and code or kind)." },
      ],
      tests: [
        {
          id: "t1",
          description: "Every distinct settlement is posted once, to the right accounts, in the right amounts",
          assertionCode: t`const distinct = num("SELECT COUNT(*) FROM (SELECT 1 FROM processor_settlements GROUP BY tenant_id, processor_ref)");
assertEqual(num("SELECT COUNT(*) FROM journal_entries WHERE ref_type = 'settlement' AND status = 'posted'"), distinct, "One posted entry per distinct (tenant, processor_ref)");
assertEqual(num("SELECT COUNT(*) FROM journal_entries WHERE status = 'draft'"), 0, "No drafts may be left");
const bad = num("SELECT COUNT(*) FROM processor_settlements s JOIN journal_entries e ON e.tenant_id = s.tenant_id AND e.ref_type = 'settlement' AND e.ref_id = s.settlement_id WHERE e.external_ref <> s.processor_ref OR e.posted_at <> s.settled_on || ' 12:00:00' OR (SELECT COUNT(*) FROM journal_lines WHERE entry_id = e.entry_id) <> 3 OR (SELECT SUM(l.debit_cents) FROM journal_lines l JOIN accounts a ON a.account_id = l.account_id WHERE l.entry_id = e.entry_id AND a.role = 'bank') <> s.net_cents OR (SELECT SUM(l.debit_cents) FROM journal_lines l JOIN accounts a ON a.account_id = l.account_id WHERE l.entry_id = e.entry_id AND a.role = 'processing') <> s.fee_cents OR (SELECT SUM(l.credit_cents) FROM journal_lines l JOIN accounts a ON a.account_id = l.account_id WHERE l.entry_id = e.entry_id AND a.role = CASE WHEN EXISTS (SELECT 1 FROM journal_entries t WHERE t.tenant_id = s.tenant_id AND t.ref_type = 'topup' AND t.external_ref = s.processor_ref) THEN 'clearing' ELSE 'suspense' END) <> s.gross_cents");
assertEqual(bad, 0, "Settlement entries should be: Dr bank net, Dr processing fee, Cr clearing (or suspense when no top-up matches) gross, dated settled_on 12:00:00. Entries that differ");
assertEqual(num("SELECT COUNT(*) FROM journal_entries e JOIN processor_settlements s ON s.settlement_id = e.ref_id AND e.ref_type = 'settlement' WHERE s.settlement_id <> (SELECT MIN(settlement_id) FROM processor_settlements WHERE tenant_id = s.tenant_id AND processor_ref = s.processor_ref)"), 0, "A duplicated settlement row must be posted once, using the lowest settlement_id");
assertEqual(num("SELECT balance_cents FROM v_trial_balance WHERE tenant_id = 1 AND code = '2900'"), 3000, "The unidentified 3000 cents belong in suspense");`,
        },
        {
          id: "t2",
          description: "February is closed for tenant 1 only, for inserts and for posting, and a late entry was shown being refused",
          assertionCode: t`const c = one("SELECT tenant_id, period, closed_at, closed_by FROM period_closes");
assertEqual(num("SELECT COUNT(*) FROM period_closes"), 1, "Close exactly one period");
assertEqual([c.tenant_id, c.period, c.closed_by], [1, "2026-02", "ops:rhea"], "Close 2026-02 for tenant 1 as ops:rhea");
assertEqual(c.closed_at, one("SELECT now FROM clock").now, "closed_at should be the clock's now");
const head = (id, tenant, at) => "INSERT INTO journal_entries (entry_id, tenant_id, posted_at, memo) VALUES (" + id + ", " + tenant + ", '" + at + "', 'probe'); ";
const lines = (id) => "INSERT INTO journal_lines (entry_id, account_id, debit_cents) VALUES (" + id + ", (SELECT account_id FROM accounts WHERE tenant_id = 1 AND role = 'bank'), 100); INSERT INTO journal_lines (entry_id, account_id, credit_cents) VALUES (" + id + ", (SELECT account_id FROM accounts WHERE tenant_id = 1 AND role = 'equity'), 100); ";
const post = (id) => "UPDATE journal_entries SET status = 'posted' WHERE entry_id = " + id;
assert(probe(head(904, 1, "2026-02-27 10:00:00")) !== null, "Inserting a tenant-1 entry dated in February must be refused");
assertEqual(probe(head(904, 1, "2026-03-01 10:00:00") + lines(904) + post(904)), null, "March is still open for tenant 1: inserting and posting must work");
assertEqual(probe(head(904, 2, "2026-02-27 10:00:00")), null, "February is still open for other tenants");
assert(probe(head(904, 1, "2026-03-01 10:00:00") + lines(904) + "UPDATE journal_entries SET posted_at = '2026-02-15 10:00:00' WHERE entry_id = 904; " + post(904)) !== null, "A draft whose date is moved into February must not be postable");
assert(refused().some((e) => /^INSERT INTO journal_entries/i.test(e.sql)), "Show a February entry being refused under -- expect error");
assertEqual(accepted().length, 0, "A statement under -- expect error was accepted");`,
        },
        {
          id: "t3",
          description: "The six proofs agree: the books balance",
          assertionCode: t`const proofs = data(["proof", "expected_cents", "actual_cents", "ok"], "Finish with the proofs: proof, expected_cents, actual_cents, ok");
assert(proofs.length >= 6, "Run all six proofs (found " + proofs.length + ")");
for (const p of proofs) { assertEqual(p.actual_cents, p.expected_cents, "Proof '" + p.proof + "' does not agree"); assertEqual(p.ok, 1, "ok for '" + p.proof + "'"); }
const has_ = (v) => proofs.some((p) => p.expected_cents === v && p.actual_cents === v);
const debits = num("SELECT SUM(debit_cents) FROM v_trial_balance WHERE tenant_id = 1");
const fees = num("SELECT SUM(fee_cents) FROM orders WHERE tenant_id = 1 AND status = 'paid'");
const payables = num("SELECT SUM(gross_cents - fee_cents) FROM orders WHERE tenant_id = 1 AND status = 'paid'") - num("SELECT SUM(amount_cents) FROM payouts WHERE tenant_id = 1");
const clearing = 100000 + num("SELECT SUM(amount_cents) FROM topups WHERE tenant_id = 1") - num("SELECT SUM(s.gross_cents) FROM processor_settlements s WHERE s.tenant_id = 1 AND s.settlement_id = (SELECT MIN(settlement_id) FROM processor_settlements WHERE tenant_id = 1 AND processor_ref = s.processor_ref) AND EXISTS (SELECT 1 FROM topups t WHERE t.tenant_id = 1 AND t.processor_ref = s.processor_ref)");
assert(has_(debits), "A proof should show debits = credits = " + debits);
assert(has_(fees), "A proof should show fee revenue = " + fees + " from the orders table");
assert(has_(payables), "A proof should show seller payables = " + payables + " (earnings less payouts)");
assert(has_(3000), "A proof should show suspense = 3000");
assert(has_(clearing), "A proof should show clearing = " + clearing + " (float + top-ups - matched settlements)");
const equation = num("SELECT SUM(CASE WHEN kind = 'asset' THEN balance_cents ELSE 0 END) FROM v_trial_balance WHERE tenant_id = 1");
assert(has_(equation), "A proof should show assets = liabilities + equity + profit = " + equation);`,
        },
      ],
      unlocks: ["ch-close"],
      checks: [
        {
          prompt: "The processor paid 99.00 for a top-up the ledger recorded as 100.00. How should the settlement be posted?",
          question: {
            type: "choice",
            options: [
              "As 100.00, to match the top-up, so the books look clean",
              "As 99.00, what actually arrived, leaving a visible 1.00 residual in clearing until someone investigates",
              "Skip it until the processor corrects its file",
              "As 99.00 to revenue",
            ],
            answer: 1,
          },
          explanation: "The ledger records what happened, not what we hoped. The residual in clearing is the discrepancy made visible, and it is exactly what the reconciliation points at.",
        },
        {
          prompt: "Why must the period lock refuse the draft-to-posted flip as well as the insert?",
          question: {
            type: "choice",
            options: [
              "A draft created before the close, or one whose date is edited into the closed month, would otherwise post into it",
              "Because UPDATE triggers are faster",
              "SQLite cannot block INSERT",
              "Because posted entries have no date",
            ],
            answer: 0,
          },
          explanation: "Posting is the moment an entry becomes history. A lock that only watches inserts leaves a side door open for drafts that already exist.",
        },
      ],
    },
  ],
};
