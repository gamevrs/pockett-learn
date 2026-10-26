import type { Chapter } from "@/engine/types";
import { md, sql, t } from "./util.ts";

/**
 * Chapter 1: the books.
 * A double-entry ledger from scratch: tables, bulk posting from business events, invariants that the
 * database enforces by itself, and money handled as integers.
 */
export const chapter1: Chapter = {
  id: "the-books",
  title: "The books",
  blurb: "A double-entry ledger that cannot be unbalanced: tables, bulk posting, guard triggers and integer money.",
  lessons: [
    // ───────────────────────────── 1 ─────────────────────────────
    {
      id: "counting-house-1-ledger",
      title: "Accounts, entries and lines",
      minutes: 28,
      xp: 120,
      concepts: ["double entry", "journal entries & lines", "generated columns", "derived balances", "CHECK constraints"],
      learn: md`### Money is a movement, not a number

The first design everyone reaches for is a \`balance_cents\` column on the member: a top-up adds to it, a purchase subtracts from it. It works for about a week. Then someone asks "why does Odalys have $12.34?" and the only honest answer is "because the column says so". There is no history to replay, two overlapping requests can overwrite each other's arithmetic, and when the number is wrong nothing tells you which change broke it.

Accountants fixed this centuries before databases existed: **never store the balance, store the movements, and derive the balance**. A movement is a **journal entry**. An entry is made of two or more **lines**, and each line either *debits* or *credits* one **account**. One rule holds the whole system up:

**In every entry, total debits equal total credits.**

### Accounts and their normal side

An account is a named bucket: "Bank", "Wallet · Odalys Brandt", "Marketplace fees". "Debit" and "credit" are not plus and minus. They are just *left* and *right*. Each kind of account has a **normal side**, the side on which it grows:

- **asset** (the bank, money the card processor is holding): grows with a debit
- **expense** (processing fees, member credits): grows with a debit
- **liability** (member wallets, seller payables): grows with a credit
- **equity** (founders' equity): grows with a credit
- **revenue** (marketplace fees): grows with a credit

A member's wallet is a **liability**: the co-op holds the money but *owes* it to the member. So when Odalys tops up $60.00 by card, the books say:

~~~text
Entry: card top-up
  Dr  Card processor clearing   6000   asset grows: the processor holds 60.00 for us
  Cr  Wallet · Odalys           6000   liability grows: we owe Odalys 60.00
~~~

and when she spends $24.50 with a seller who keeps $23.27 after a $1.23 fee:

~~~text
Entry: order
  Dr  Wallet · Odalys           2450   we owe her less
  Cr  Payable · seller          2327   we owe the seller more
  Cr  Marketplace fees           123   revenue we earned
~~~

Debits 2450, credits 2327 + 123 = 2450. Balanced.

### The two tables

~~~text
journal_entries   one row per movement: when, why, and where it came from
journal_lines     two or more rows per entry: which account, how much, on which side
~~~

Beyond the obvious columns, the header carries four fields worth understanding now:

- \`status\`: **draft** while lines are still being added, **posted** once the entry is part of history. Only posted entries count in any balance. Lesson 3 makes "posted" a one-way door.
- \`ref_type\` and \`ref_id\`: the business event this entry came from (\`order\` and the order id). Lesson 2 makes that pair unique so one event can never be booked twice.
- \`external_ref\`: the outside world's identifier (the card processor's reference), which is how we reconcile later.
- \`reverses_entry_id\`: history is never edited. A mistake is corrected by a *new* entry that mirrors the old one and points back at it.

A line stores \`debit_cents\` and \`credit_cents\` as two non-negative integers, exactly one of them above zero. That reads naturally in a statement, and the CHECK says it in one line. A **generated column** gives you the signed form for free:

~~~sql
net_cents INTEGER GENERATED ALWAYS AS (debit_cents - credit_cents) VIRTUAL
~~~

Nobody writes to it and it can never disagree with the two columns it is computed from.

### Balances are queries

A trial balance lists every account with its total debits and credits. It is a \`GROUP BY\` over the posted lines, wrapped in a view so every report shares one definition. Use a **LEFT JOIN** from \`accounts\` so idle accounts still appear, and put the "posted only" condition inside the joined part, not in \`WHERE\`, or the LEFT JOIN quietly turns into an inner join:

~~~sql
FROM accounts AS a
LEFT JOIN (
  journal_lines AS l
  JOIN journal_entries AS e ON e.entry_id = l.entry_id AND e.status = 'posted'
) ON l.account_id = a.account_id
~~~

If every entry balances, the debit column of the trial balance equals its credit column. That equality is the cheapest corruption alarm a finance system has.

### Proving the table says no

A ledger that accepts nonsense is not a ledger. As in Schema Studio, put the comment \`-- expect error\` on the line directly above a statement you *want* refused: the run records the refusal and carries on, and you get a warning if the database lets the bad row in. You will do this throughout the course; it turns "I think the constraint works" into evidence.

### Common mistakes

- One signed \`amount\` column plus a free-text "type". Nothing stops a line from claiming to be both, or neither.
- Counting draft entries in a balance. A half-built entry must be invisible.
- Typing account ids into SQL. Ids differ per tenant; look accounts up by \`tenant_id\` plus \`role\` (and owner, for wallets).
- Using \`REAL\` for money. Cents are integers. Always. Lesson 4 shows why.`,
      mission: md`You are the new data engineer at **Fernhollow Co-op Market**, a community marketplace where members top up wallets, buy from local growers and bakers, and sellers get paid out. The founders kept the books in a spreadsheet. The platform already has members, a chart of accounts and two months of orders, but **there is no ledger yet**.

Build the foundation: the two tables, three opening entries written by hand, and the trial balance. In the console this lights up the **Trial balance** panel, with a beam that glows when debits and credits match.`,
      tasks: [
        "Create journal_entries and journal_lines with the columns and CHECK constraints from the brief",
        "Hand-post three opening entries (ids 1 to 3) by looking accounts up with subqueries on role, mark them posted, then show two bad lines being refused (-- expect error)",
        "Create the view v_trial_balance, then query tenant 1's active accounts and their debit and credit totals",
      ],
      starterAdd: sql`-- ── ✏️ YOUR TURN ───────────────────────────
-- Lesson 1: the books.
-- The platform database is already loaded: tenants, members, accounts (a chart of accounts per tenant),
-- orders, topups, processor_settlements, payout_requests, card_attempts, jobs, clock and session_ctx.
-- Start with SELECT * FROM accounts: each row has a role ('bank', 'clearing', 'wallet', 'payable', 'equity',
-- 'credits', ...), a kind and a generated normal_side ('D' or 'C').
--
-- 1. Create the two ledger tables.
--    journal_entries
--      entry_id INTEGER PRIMARY KEY
--      tenant_id INTEGER NOT NULL, references tenants
--      posted_at TEXT NOT NULL, memo TEXT NOT NULL
--      status TEXT NOT NULL DEFAULT 'draft', CHECK it is 'draft' or 'posted'
--      ref_type TEXT, ref_id INTEGER, external_ref TEXT
--      reverses_entry_id INTEGER, references journal_entries
--    journal_lines
--      line_id INTEGER PRIMARY KEY
--      entry_id INTEGER NOT NULL, references journal_entries
--      account_id INTEGER NOT NULL, references accounts
--      debit_cents and credit_cents: INTEGER NOT NULL DEFAULT 0, each >= 0
--      net_cents: GENERATED ALWAYS AS (debit_cents - credit_cents) VIRTUAL
--      a table CHECK that exactly one of debit_cents / credit_cents is above zero
--
-- 2. Hand-post three entries for tenant 1 with ref_type 'manual'. Use the ids shown, find each account with a
--    subquery on role (never type an account id), then UPDATE all three to 'posted'.
--      1  2026-01-01 08:00:00  Opening capital from the founding members   Dr bank 500000   / Cr equity 500000
--      2  2026-01-01 08:05:00  Fund the card-processor float              Dr clearing 100000 / Cr bank 100000
--      3  2026-01-02 10:00:00  Welcome credit for Odalys Brandt            Dr credits 1000    / Cr her wallet 1000
--         (her wallet: role 'wallet' and owner_member_id = the member whose handle is 'odalys')
--    Then prove the lines are strict. Under a comment line  -- expect error  add two INSERTs into journal_lines for entry 1:
--      a) a line that is both a debit AND a credit (100 and 100) on the bank account
--      b) a line with debit 100 on an account_id that does not exist (999999)
--
-- 3. CREATE VIEW v_trial_balance: one row per account, idle ones included, with
--      account_id, tenant_id, code, name, kind, normal_side, debit_cents, credit_cents, balance_cents
--    balance_cents is on the account's normal side (debits - credits for 'D', credits - debits for 'C').
--    Only lines of POSTED entries count. Then run two queries on tenant 1:
--      a) code, name AS account, kind, debit_cents, credit_cents, balance_cents
--         for accounts with any activity, ordered by code, account_id
--      b) total_debits, total_credits, and balanced (1 when they are equal)
`,
      solutionAdd: sql`-- The ledger tables
CREATE TABLE journal_entries (
  entry_id INTEGER PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants (tenant_id),
  posted_at TEXT NOT NULL,
  memo TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'posted')),
  ref_type TEXT,
  ref_id INTEGER,
  external_ref TEXT,
  reverses_entry_id INTEGER REFERENCES journal_entries (entry_id)
);

CREATE TABLE journal_lines (
  line_id INTEGER PRIMARY KEY,
  entry_id INTEGER NOT NULL REFERENCES journal_entries (entry_id),
  account_id INTEGER NOT NULL REFERENCES accounts (account_id),
  debit_cents INTEGER NOT NULL DEFAULT 0 CHECK (debit_cents >= 0),
  credit_cents INTEGER NOT NULL DEFAULT 0 CHECK (credit_cents >= 0),
  net_cents INTEGER GENERATED ALWAYS AS (debit_cents - credit_cents) VIRTUAL,
  CHECK ((debit_cents > 0) <> (credit_cents > 0))
);

-- Three opening entries, written as drafts and posted together
INSERT INTO journal_entries (entry_id, tenant_id, posted_at, memo, ref_type) VALUES
  (1, 1, '2026-01-01 08:00:00', 'Opening capital from the founding members', 'manual'),
  (2, 1, '2026-01-01 08:05:00', 'Fund the card-processor float', 'manual'),
  (3, 1, '2026-01-02 10:00:00', 'Welcome credit for Odalys Brandt', 'manual');

INSERT INTO journal_lines (entry_id, account_id, debit_cents, credit_cents) VALUES
  (1, (SELECT account_id FROM accounts WHERE tenant_id = 1 AND role = 'bank'), 500000, 0),
  (1, (SELECT account_id FROM accounts WHERE tenant_id = 1 AND role = 'equity'), 0, 500000),
  (2, (SELECT account_id FROM accounts WHERE tenant_id = 1 AND role = 'clearing'), 100000, 0),
  (2, (SELECT account_id FROM accounts WHERE tenant_id = 1 AND role = 'bank'), 0, 100000),
  (3, (SELECT account_id FROM accounts WHERE tenant_id = 1 AND role = 'credits'), 1000, 0),
  (3, (SELECT account_id FROM accounts WHERE tenant_id = 1 AND role = 'wallet' AND owner_member_id = (SELECT member_id FROM members WHERE handle = 'odalys')), 0, 1000);

UPDATE journal_entries SET status = 'posted' WHERE entry_id IN (1, 2, 3);

-- Lines are strict: both of these must be refused
-- expect error
INSERT INTO journal_lines (entry_id, account_id, debit_cents, credit_cents)
VALUES (1, (SELECT account_id FROM accounts WHERE tenant_id = 1 AND role = 'bank'), 100, 100);

-- expect error
INSERT INTO journal_lines (entry_id, account_id, debit_cents, credit_cents)
VALUES (1, 999999, 100, 0);

-- The trial balance: one definition for every report
CREATE VIEW v_trial_balance AS
SELECT
  a.account_id,
  a.tenant_id,
  a.code,
  a.name,
  a.kind,
  a.normal_side,
  COALESCE(SUM(l.debit_cents), 0) AS debit_cents,
  COALESCE(SUM(l.credit_cents), 0) AS credit_cents,
  CASE a.normal_side WHEN 'D' THEN COALESCE(SUM(l.net_cents), 0) ELSE -COALESCE(SUM(l.net_cents), 0) END AS balance_cents
FROM accounts AS a
LEFT JOIN (
  journal_lines AS l
  JOIN journal_entries AS e ON e.entry_id = l.entry_id AND e.status = 'posted'
) ON l.account_id = a.account_id
GROUP BY a.account_id;

SELECT code, name AS account, kind, debit_cents, credit_cents, balance_cents
FROM v_trial_balance
WHERE tenant_id = 1 AND (debit_cents > 0 OR credit_cents > 0)
ORDER BY code, account_id;

SELECT SUM(debit_cents) AS total_debits, SUM(credit_cents) AS total_credits, SUM(debit_cents) = SUM(credit_cents) AS balanced
FROM v_trial_balance
WHERE tenant_id = 1;`,
      explanation:
        "The entry header says why and when; the lines say which accounts moved and by how much, and the CHECK makes every line exactly one-sided. Drafts are invisible until posted, so a half-built entry never shows up in a balance. The view LEFT JOINs from accounts and keeps the 'posted only' test inside the joined part, so idle accounts still appear and drafts never count. Because every entry balances, the debit total equals the credit total: the beam glows.",
      hints: [
        { id: "h1", title: "Two-sided lines", content: "Put the one-sided rule in a table-level CHECK: CHECK ((debit_cents > 0) <> (credit_cents > 0)). Comparisons give 0 or 1 in SQLite, so this is true only when exactly one side is positive. The generated column is: net_cents INTEGER GENERATED ALWAYS AS (debit_cents - credit_cents) VIRTUAL." },
        { id: "h2", title: "Find accounts by role", content: "Inside VALUES you can use scalar subqueries: (SELECT account_id FROM accounts WHERE tenant_id = 1 AND role = 'bank'). Odalys's wallet adds AND owner_member_id = (SELECT member_id FROM members WHERE handle = 'odalys'). Insert the headers first, then the lines, then UPDATE journal_entries SET status = 'posted'." },
        { id: "h3", title: "The view", content: "FROM accounts AS a LEFT JOIN (journal_lines AS l JOIN journal_entries AS e ON e.entry_id = l.entry_id AND e.status = 'posted') ON l.account_id = a.account_id, GROUP BY a.account_id. Wrap SUM() in COALESCE(…, 0) so idle accounts show 0, and use CASE a.normal_side WHEN 'D' THEN … ELSE … END for balance_cents." },
      ],
      tests: [
        {
          id: "t1",
          description: "journal_entries and journal_lines exist with the agreed columns",
          assertionCode: t`const e = cols("journal_entries");
for (const c of ["entry_id", "tenant_id", "posted_at", "memo", "status", "ref_type", "ref_id", "external_ref", "reverses_entry_id"]) assert(e.includes(c), "journal_entries needs a column named " + c);
const l = cols("journal_lines");
for (const c of ["line_id", "entry_id", "account_id", "debit_cents", "credit_cents", "net_cents"]) assert(l.includes(c), "journal_lines needs a column named " + c);
const g = one("SELECT debit_cents - credit_cents AS expected, net_cents AS got FROM journal_lines LIMIT 1");
assert(g, "Post some lines first (step 2)");
assertEqual(g.got, g.expected, "net_cents should be debit_cents - credit_cents (a generated column)");`,
        },
        {
          id: "t2",
          description: "The tables refuse nonsense: two-sided lines, empty lines, negatives, missing accounts or entries, unknown statuses",
          assertionCode: t`const acct = "(SELECT account_id FROM accounts WHERE tenant_id = 1 AND role = 'bank')";
const ins = (entry, account, d, c) => "INSERT INTO journal_lines (entry_id, account_id, debit_cents, credit_cents) VALUES (" + entry + ", " + account + ", " + d + ", " + c + ")";
assert(probe(ins(1, acct, 100, 100)) !== null, "A line with both a debit and a credit should be rejected");
assert(probe(ins(1, acct, 0, 0)) !== null, "A line with neither a debit nor a credit should be rejected");
assert(probe(ins(1, acct, -5, 0)) !== null, "A negative debit should be rejected");
assert(probe(ins(1, "999999", 100, 0)) !== null, "A line for an account that does not exist should be rejected (foreign key)");
assert(probe(ins(999999, acct, 100, 0)) !== null, "A line for an entry that does not exist should be rejected (foreign key)");
assert(probe("INSERT INTO journal_entries (tenant_id, posted_at, memo, status) VALUES (1, '2026-01-01 00:00:00', 'x', 'pending')") !== null, "status must be 'draft' or 'posted'");
assertEqual(probe(ins(1, acct, 100, 0)), null, "A normal debit line must still be accepted");
assertEqual(probe(ins(1, acct, 0, 100)), null, "A normal credit line must still be accepted");
assertEqual(accepted().length, 0, "A statement under -- expect error was accepted: the database let a bad line in");
assert(refused(/CHECK constraint failed/).length >= 1, "Mark an INSERT of a line that is both a debit and a credit with -- expect error: it should be refused by the CHECK");
assert(refused(/FOREIGN KEY constraint failed/).length >= 1, "Mark an INSERT of a line for account 999999 with -- expect error: it should be refused by the foreign key");`,
        },
        {
          id: "t3",
          description: "Entries 1, 2 and 3 are posted with the right accounts and amounts",
          assertionCode: t`const es = query("SELECT entry_id, tenant_id, status, ref_type, posted_at FROM journal_entries WHERE entry_id IN (1, 2, 3) ORDER BY entry_id");
assertEqual(es.length, 3, "Entries 1, 2 and 3 should exist");
for (const e of es) {
  assertEqual(e.tenant_id, 1, "Entry " + e.entry_id + " belongs to tenant 1");
  assertEqual(e.status, "posted", "Entry " + e.entry_id + " should be posted");
  assertEqual(e.ref_type, "manual", "Entry " + e.entry_id + " has ref_type 'manual'");
}
assertEqual(es.map((e) => e.posted_at), ["2026-01-01 08:00:00", "2026-01-01 08:05:00", "2026-01-02 10:00:00"], "posted_at of entries 1 to 3");
const lines = query("SELECT l.entry_id AS entry_id, a.role AS role, a.tenant_id AS tenant_id, a.owner_member_id AS owner, l.debit_cents AS d, l.credit_cents AS c FROM journal_lines l JOIN accounts a ON a.account_id = l.account_id WHERE l.entry_id IN (1, 2, 3)");
const got = lines.map((r) => r.entry_id + ":" + r.role + ":" + r.d + ":" + r.c).sort();
const want = ["1:bank:500000:0", "1:equity:0:500000", "2:bank:0:100000", "2:clearing:100000:0", "3:credits:1000:0", "3:wallet:0:1000"].sort();
assertEqual(got, want, "Lines of entries 1 to 3 (entry:role:debit:credit)");
assert(lines.every((r) => r.tenant_id === 1), "All three entries must use tenant 1's accounts");
const w = lines.find((r) => r.role === "wallet");
assertEqual(w.owner, one("SELECT member_id AS m FROM members WHERE handle = 'odalys'").m, "The wallet line belongs to Odalys");`,
        },
        {
          id: "t4",
          description: "v_trial_balance exists and the first query lists tenant 1's active accounts",
          assertionCode: t`assert(has("view", "v_trial_balance"), "Create the view v_trial_balance");
const got = data(["code", "account", "debit_cents", "credit_cents", "balance_cents"], "Run the trial balance: code, account, kind, debit_cents, credit_cents, balance_cents", /v_trial_balance/);
const want = query("SELECT a.code AS code, a.name AS account, SUM(l.debit_cents) AS debit_cents, SUM(l.credit_cents) AS credit_cents, CASE a.normal_side WHEN 'D' THEN SUM(l.debit_cents - l.credit_cents) ELSE SUM(l.credit_cents - l.debit_cents) END AS balance_cents FROM accounts a JOIN journal_lines l ON l.account_id = a.account_id JOIN journal_entries e ON e.entry_id = l.entry_id AND e.status = 'posted' WHERE a.tenant_id = 1 GROUP BY a.account_id");
match(got, want, "account", ["debit_cents", "credit_cents", "balance_cents"], "the trial balance");
const order = got.map((r) => r.code);
assertEqual(order, [...order].sort(), "Order the rows by code");`,
        },
        {
          id: "t5",
          description: "The totals row shows debits equal credits",
          assertionCode: t`const r = data(["total_debits", "total_credits", "balanced"], "Add the totals query: total_debits, total_credits, balanced", /v_trial_balance/)[0];
const want = one("SELECT SUM(l.debit_cents) AS d, SUM(l.credit_cents) AS c FROM journal_lines l JOIN journal_entries e ON e.entry_id = l.entry_id AND e.status = 'posted' JOIN accounts a ON a.account_id = l.account_id WHERE a.tenant_id = 1");
assertEqual(r.total_debits, want.d, "total_debits");
assertEqual(r.total_credits, want.c, "total_credits");
assertEqual(r.balanced, 1, "balanced should be 1 when the two totals are equal");`,
        },
      ],
      unlocks: ["ch-trial"],
      checks: [
        {
          prompt: "Odalys tops up her wallet with $60.00 by card. Which pair of lines records it?",
          question: {
            type: "choice",
            options: [
              "Debit her wallet 6000, credit the bank 6000",
              "Debit card processor clearing 6000, credit her wallet 6000",
              "Credit card processor clearing 6000, debit her wallet 6000",
              "Debit her wallet 6000, credit marketplace fees 6000",
            ],
            answer: 1,
          },
          explanation: "The processor now holds money for the co-op (an asset, which grows with a debit), and the co-op owes that money to Odalys (a liability, which grows with a credit). Her wallet is not 'plus 60' in one column; it is a credit balance that was built by a line.",
        },
        {
          prompt: "Why does the trial balance LEFT JOIN from accounts and test e.status inside the joined part instead of in WHERE?",
          question: {
            type: "choice",
            options: [
              "WHERE conditions on the right side of a LEFT JOIN turn it into an inner join and idle accounts disappear",
              "SQLite does not allow WHERE after a GROUP BY",
              "It makes the SUM faster",
              "Drafts cannot be filtered in WHERE",
            ],
            answer: 0,
          },
          explanation: "For an account with no posted lines the joined columns are NULL, and WHERE e.status = 'posted' would throw that row away. Keeping the condition in the ON part filters the lines but keeps every account.",
        },
      ],
    },

    // ───────────────────────────── 2 ─────────────────────────────
    {
      id: "counting-house-2-posting",
      title: "Posting in bulk",
      minutes: 28,
      xp: 130,
      concepts: ["INSERT … SELECT", "UNION ALL", "partial unique index", "draft then post", "joining by tenant, role and owner"],
      learn: md`### Posting is a translation job

Orders and top-ups are *business facts*: "Mateo bought honey for $12.99". Journal entries are *accounting facts*: which accounts moved. **Posting** translates the first into the second, and it is the busiest write path in any ledger. The wrong way is a loop that runs one statement per order. The right way, in SQL, is **one set-based statement per shape of entry**: the database is very good at joins, and a single statement is easy to reason about and easy to re-run.

### Exactly one entry per event

Posting jobs get re-run. A deploy dies half-way, an operator clicks twice, a scheduler fires twice. If nothing prevents it, an order is booked twice and the seller is paid twice. So every entry that comes from a business event records its source (\`ref_type\`, \`ref_id\`), and the database refuses a second entry for the same source:

~~~sql
CREATE UNIQUE INDEX ux_entries_source
  ON journal_entries (tenant_id, ref_type, ref_id)
  WHERE ref_id IS NOT NULL;
~~~

The \`WHERE\` makes it a **partial** index: only rows that actually have a source are constrained. Hand-written manual entries have no \`ref_id\` and are exempt. (In SQLite two NULLs never collide in a unique index anyway; the partial form states the intent and keeps the index smaller.) The tenant is in the key because order 7 of one tenant and order 7 of another are different events.

### Three steps, never one

~~~text
1. INSERT the entry headers      -> status 'draft'
2. INSERT the lines              -> still draft
3. UPDATE ... SET status='posted' only where the entry is complete and balanced
~~~

Splitting the work means a crash between steps leaves *drafts*, which do not count in any balance and are trivially cleaned up. Nothing half-built ever becomes history. Step 3 is also your safety net: it posts only entries that have at least two lines and whose debits equal credits. Anything that fails stays a draft and shows up in a query, which is much better than showing up in a lawsuit.

### The recipes

A **top-up** (card money arrives, sitting at the processor):

~~~text
Dr  clearing account of the tenant        amount
Cr  wallet of the member                  amount
~~~

An **order** (buyer pays from the wallet, seller earns, the co-op takes its fee):

~~~text
Dr  wallet of the buyer                   gross
Cr  payable of the seller                 gross - fee
Cr  fees account of the tenant            fee
~~~

Refunded orders were paid once, so they are posted like any other order; the refund itself is a later correction (lesson 3). Cancelled orders never moved money and never reach the ledger.

### Joining to the right account

Every account lookup joins on **tenant, role and (for wallets and payables) owner**. Drop the tenant condition and each tenant's bank account matches, so a line is produced three times and one of them lands on another tenant's books. The balanced-only UPDATE in step 3 is what saves you: the duplicated side makes the entry unbalanced, so it never posts. Treat leftover drafts as a bug report from the database.

### Order matters a little

Insert the headers in time order (a \`UNION ALL\` of both sources with one \`ORDER BY\` at the end) so entry ids grow with time. Nothing depends on it, but statements, exports and humans reading ids all appreciate it.

### Common mistakes

- Forgetting \`status IN ('paid', 'refunded')\` and booking cancelled orders.
- Writing the lines before the headers exist, so the lookup join finds nothing and the INSERT quietly adds zero rows. Always check counts afterwards.
- Posting everything with an unconditional \`UPDATE … SET status = 'posted'\` and losing the safety net.`,
      mission: md`The ledger exists and balances for three hand-made entries. Fernhollow has **two months of real activity** sitting in \`orders\` and \`topups\`. Translate all of it into journal entries in a handful of statements, in a way that can never book the same order twice, then check that the books still balance.

The **Posting run** panel shows how much each source moved; the **Trial balance** fills with wallets and seller payables.`,
      tasks: [
        "Create a partial unique index so a business event can only be booked once per tenant, and show a second booking of order 1 being refused",
        "Post every top-up and every paid or refunded order: headers, lines, then a balanced-only UPDATE",
        "Summarise the run by source, then re-run the trial balance and totals",
      ],
      starterAdd: sql`-- ── ✏️ YOUR TURN ───────────────────────────
-- Lesson 2: posting in bulk.
--
-- 1. A unique index on journal_entries (tenant_id, ref_type, ref_id), partial: only where ref_id IS NOT NULL.
--
-- 2. Post the business events. One statement per shape; use account lookups on tenant_id + role (+ owner).
--    Entry headers (draft), in time order, from BOTH sources in ONE INSERT (UNION ALL, one ORDER BY at the end):
--      every row of topups:   posted_at = received_at, memo 'Card top-up ' || processor_ref,
--                             ref_type 'topup', ref_id topup_id, external_ref processor_ref
--      orders with status 'paid' or 'refunded': posted_at = placed_at, memo 'Order #' || order_id,
--                             ref_type 'order', ref_id order_id
--    Lines for top-ups:  Dr the tenant's 'clearing' account / Cr the member's 'wallet' (owner_member_id = member_id)
--    Lines for orders:   Dr the buyer's 'wallet' gross_cents
--                        Cr the seller's 'payable' gross_cents - fee_cents
--                        Cr the tenant's 'fees' account fee_cents
--    Finally post ONLY entries that have at least two lines and whose debits equal credits.
--    Then try to book order 1 of tenant 1 a second time (an INSERT INTO journal_entries with ref_type 'order', ref_id 1)
--    under a comment line  -- expect error : the unique index must refuse it.
--
-- 3. Then run:
--      a) source, entries, lines, total_cents: one row per ref_type among posted entries
--         (entries = distinct entries, lines = journal lines, total_cents = the sum of debits)
--      b) the trial balance query from lesson 1 again (tenant 1), and the totals query again.
--         (Earlier queries ran before your new postings, so copy them down here.)
`,
      solutionAdd: sql`-- One business event, one entry
CREATE UNIQUE INDEX ux_entries_source
  ON journal_entries (tenant_id, ref_type, ref_id)
  WHERE ref_id IS NOT NULL;

-- Headers: top-ups and orders, in time order, all as drafts
INSERT INTO journal_entries (tenant_id, posted_at, memo, ref_type, ref_id, external_ref)
SELECT tenant_id, received_at AS posted_at, 'Card top-up ' || processor_ref, 'topup' AS ref_type, topup_id AS ref_id, processor_ref
FROM topups
UNION ALL
SELECT tenant_id, placed_at, 'Order #' || order_id, 'order', order_id, NULL
FROM orders
WHERE status IN ('paid', 'refunded')
ORDER BY posted_at, ref_type, ref_id;

-- Lines for top-ups
INSERT INTO journal_lines (entry_id, account_id, debit_cents, credit_cents)
SELECT e.entry_id, c.account_id, t.amount_cents, 0
FROM topups AS t
JOIN journal_entries AS e ON e.tenant_id = t.tenant_id AND e.ref_type = 'topup' AND e.ref_id = t.topup_id
JOIN accounts AS c ON c.tenant_id = t.tenant_id AND c.role = 'clearing'
UNION ALL
SELECT e.entry_id, w.account_id, 0, t.amount_cents
FROM topups AS t
JOIN journal_entries AS e ON e.tenant_id = t.tenant_id AND e.ref_type = 'topup' AND e.ref_id = t.topup_id
JOIN accounts AS w ON w.tenant_id = t.tenant_id AND w.role = 'wallet' AND w.owner_member_id = t.member_id;

-- Lines for orders
INSERT INTO journal_lines (entry_id, account_id, debit_cents, credit_cents)
SELECT e.entry_id, w.account_id, o.gross_cents, 0
FROM orders AS o
JOIN journal_entries AS e ON e.tenant_id = o.tenant_id AND e.ref_type = 'order' AND e.ref_id = o.order_id
JOIN accounts AS w ON w.tenant_id = o.tenant_id AND w.role = 'wallet' AND w.owner_member_id = o.buyer_id
UNION ALL
SELECT e.entry_id, p.account_id, 0, o.gross_cents - o.fee_cents
FROM orders AS o
JOIN journal_entries AS e ON e.tenant_id = o.tenant_id AND e.ref_type = 'order' AND e.ref_id = o.order_id
JOIN accounts AS p ON p.tenant_id = o.tenant_id AND p.role = 'payable' AND p.owner_member_id = o.seller_id
UNION ALL
SELECT e.entry_id, f.account_id, 0, o.fee_cents
FROM orders AS o
JOIN journal_entries AS e ON e.tenant_id = o.tenant_id AND e.ref_type = 'order' AND e.ref_id = o.order_id
JOIN accounts AS f ON f.tenant_id = o.tenant_id AND f.role = 'fees';

-- Post only what is complete and balanced
UPDATE journal_entries
SET status = 'posted'
WHERE status = 'draft'
  AND entry_id IN (
    SELECT entry_id FROM journal_lines
    GROUP BY entry_id
    HAVING COUNT(*) >= 2 AND SUM(debit_cents) = SUM(credit_cents)
  );

-- Booking an order twice is refused
-- expect error
INSERT INTO journal_entries (tenant_id, posted_at, memo, ref_type, ref_id)
VALUES (1, '2026-01-05 12:00:00', 'Order #1 again', 'order', 1);

SELECT e.ref_type AS source, COUNT(DISTINCT e.entry_id) AS entries, COUNT(*) AS lines, SUM(l.debit_cents) AS total_cents
FROM journal_entries AS e
JOIN journal_lines AS l ON l.entry_id = e.entry_id
WHERE e.status = 'posted'
GROUP BY e.ref_type
ORDER BY e.ref_type;

SELECT code, name AS account, kind, debit_cents, credit_cents, balance_cents
FROM v_trial_balance
WHERE tenant_id = 1 AND (debit_cents > 0 OR credit_cents > 0)
ORDER BY code, account_id;

SELECT SUM(debit_cents) AS total_debits, SUM(credit_cents) AS total_credits, SUM(debit_cents) = SUM(credit_cents) AS balanced
FROM v_trial_balance
WHERE tenant_id = 1;`,
      explanation:
        "The partial unique index turns a double-post into an error. Headers go in first as drafts (both sources in one ordered INSERT), then each shape of entry gets one INSERT … SELECT whose joins use tenant, role and owner. The closing UPDATE posts only entries with two or more lines whose debits equal credits, so anything wrong stays a visible draft instead of becoming history. Totals still match, now across hundreds of entries.",
      hints: [
        { id: "h1", title: "One ordered insert for both sources", content: "SELECT … FROM topups UNION ALL SELECT … FROM orders WHERE status IN ('paid','refunded') ORDER BY posted_at, ref_type, ref_id. In a compound SELECT the ORDER BY names the columns of the FIRST select, so alias them there: received_at AS posted_at, 'topup' AS ref_type, topup_id AS ref_id." },
        { id: "h2", title: "Find the entry again", content: "To attach lines, join journal_entries e ON e.tenant_id = o.tenant_id AND e.ref_type = 'order' AND e.ref_id = o.order_id. Then join accounts once per line you need, each on tenant_id AND role (AND owner_member_id for wallets and payables). Use UNION ALL to stack the 2 or 3 lines." },
        { id: "h3", title: "Post only what balances", content: "UPDATE journal_entries SET status = 'posted' WHERE status = 'draft' AND entry_id IN (SELECT entry_id FROM journal_lines GROUP BY entry_id HAVING COUNT(*) >= 2 AND SUM(debit_cents) = SUM(credit_cents)). Afterwards SELECT COUNT(*) FROM journal_entries WHERE status = 'draft' should be 0." },
      ],
      tests: [
        {
          id: "t1",
          description: "A business event can be booked only once, but manual entries are still allowed",
          assertionCode: t`const dup = probe("INSERT INTO journal_entries (tenant_id, posted_at, memo, ref_type, ref_id) SELECT tenant_id, posted_at, 'again', ref_type, ref_id FROM journal_entries WHERE ref_type = 'order' LIMIT 1");
assert(dup !== null, "Booking the same order a second time should be refused by a unique index on (tenant_id, ref_type, ref_id)");
assertEqual(probe("INSERT INTO journal_entries (tenant_id, posted_at, memo, ref_type) VALUES (1, '2026-01-01 00:00:00', 'manual one', 'manual'), (1, '2026-01-01 00:00:00', 'manual two', 'manual')"), null, "Manual entries have no ref_id and must stay unconstrained (make the index partial)");
const other = probe("INSERT INTO journal_entries (tenant_id, posted_at, memo, ref_type, ref_id) VALUES (2, '2026-01-01 00:00:00', 'x', 'order', 987654), (3, '2026-01-01 00:00:00', 'y', 'order', 987654)");
assertEqual(other, null, "The same ref_id in two different tenants is two different events");
assertEqual(accepted().length, 0, "A statement under -- expect error was accepted: the same order was booked twice");
assert(refused(/UNIQUE constraint failed/).length >= 1, "Add an INSERT that books order 1 again under -- expect error: the unique index should refuse it");`,
        },
        {
          id: "t2",
          description: "Every top-up and every paid or refunded order has exactly one posted entry, and nothing else was booked",
          assertionCode: t`assertEqual(num("SELECT COUNT(*) FROM journal_entries WHERE status = 'draft'"), 0, "No entry should be left as a draft");
const topups = num("SELECT COUNT(*) FROM topups");
const orders = num("SELECT COUNT(*) FROM orders WHERE status IN ('paid', 'refunded')");
assertEqual(num("SELECT COUNT(*) FROM journal_entries WHERE ref_type = 'topup'"), topups, "Posted top-up entries");
assertEqual(num("SELECT COUNT(*) FROM journal_entries WHERE ref_type = 'order'"), orders, "Posted order entries (paid and refunded orders only)");
assertEqual(num("SELECT COUNT(*) FROM orders o JOIN journal_entries e ON e.ref_type = 'order' AND e.ref_id = o.order_id AND e.tenant_id = o.tenant_id WHERE o.status = 'cancelled'"), 0, "Cancelled orders must not be booked");
assertEqual(num("SELECT COUNT(*) FROM journal_entries WHERE ref_type = 'order' AND tenant_id <> (SELECT tenant_id FROM orders WHERE order_id = ref_id)"), 0, "Each entry belongs to its order's tenant");`,
        },
        {
          id: "t3",
          description: "Lines hit the right accounts in the right amounts, inside the right tenant",
          assertionCode: t`assertEqual(num("SELECT COUNT(*) FROM (SELECT entry_id FROM journal_lines GROUP BY entry_id HAVING SUM(debit_cents) <> SUM(credit_cents))"), 0, "Every entry must balance");
assertEqual(num("SELECT COUNT(*) FROM journal_lines l JOIN journal_entries e ON e.entry_id = l.entry_id JOIN accounts a ON a.account_id = l.account_id WHERE a.tenant_id <> e.tenant_id"), 0, "A line points at another tenant's account: join accounts on tenant_id too");
const badOrders = num("SELECT COUNT(*) FROM orders o JOIN journal_entries e ON e.ref_type = 'order' AND e.ref_id = o.order_id AND e.tenant_id = o.tenant_id WHERE (SELECT COUNT(*) FROM journal_lines WHERE entry_id = e.entry_id) <> 3 OR (SELECT SUM(l.debit_cents) FROM journal_lines l JOIN accounts a ON a.account_id = l.account_id WHERE l.entry_id = e.entry_id AND a.role = 'wallet' AND a.owner_member_id = o.buyer_id) <> o.gross_cents OR (SELECT SUM(l.credit_cents) FROM journal_lines l JOIN accounts a ON a.account_id = l.account_id WHERE l.entry_id = e.entry_id AND a.role = 'payable' AND a.owner_member_id = o.seller_id) <> o.gross_cents - o.fee_cents OR (SELECT SUM(l.credit_cents) FROM journal_lines l JOIN accounts a ON a.account_id = l.account_id WHERE l.entry_id = e.entry_id AND a.role = 'fees') <> o.fee_cents");
assertEqual(badOrders, 0, "Order entries should be: Dr buyer wallet gross, Cr seller payable gross - fee, Cr fees fee. Entries that do not match");
const badTopups = num("SELECT COUNT(*) FROM topups t JOIN journal_entries e ON e.ref_type = 'topup' AND e.ref_id = t.topup_id AND e.tenant_id = t.tenant_id WHERE (SELECT COUNT(*) FROM journal_lines WHERE entry_id = e.entry_id) <> 2 OR (SELECT SUM(l.debit_cents) FROM journal_lines l JOIN accounts a ON a.account_id = l.account_id WHERE l.entry_id = e.entry_id AND a.role = 'clearing') <> t.amount_cents OR (SELECT SUM(l.credit_cents) FROM journal_lines l JOIN accounts a ON a.account_id = l.account_id WHERE l.entry_id = e.entry_id AND a.role = 'wallet' AND a.owner_member_id = t.member_id) <> t.amount_cents");
assertEqual(badTopups, 0, "Top-up entries should be: Dr clearing amount, Cr the member's wallet amount. Entries that do not match");`,
        },
        {
          id: "t4",
          description: "The posting summary has one row per source",
          assertionCode: t`const got = data(["source", "entries", "lines", "total_cents"], "Add the summary: source, entries, lines, total_cents");
const want = query("SELECT e.ref_type AS source, COUNT(DISTINCT e.entry_id) AS entries, COUNT(*) AS lines, SUM(l.debit_cents) AS total_cents FROM journal_entries e JOIN journal_lines l ON l.entry_id = e.entry_id WHERE e.status = 'posted' GROUP BY e.ref_type");
match(got, want, "source", ["entries", "lines", "total_cents"], "the posting summary");`,
        },
        {
          id: "t5",
          description: "The trial balance, run again after posting, shows every active account and still balances",
          assertionCode: t`const got = data(["code", "account", "debit_cents", "credit_cents", "balance_cents"], "Copy your trial balance query below the new postings", /v_trial_balance/);
const want = query("SELECT a.name AS account, SUM(l.debit_cents) AS debit_cents, SUM(l.credit_cents) AS credit_cents, CASE a.normal_side WHEN 'D' THEN SUM(l.debit_cents - l.credit_cents) ELSE SUM(l.credit_cents - l.debit_cents) END AS balance_cents FROM accounts a JOIN journal_lines l ON l.account_id = a.account_id JOIN journal_entries e ON e.entry_id = l.entry_id AND e.status = 'posted' WHERE a.tenant_id = 1 GROUP BY a.account_id");
match(got, want, "account", ["debit_cents", "credit_cents", "balance_cents"], "the trial balance after posting");
const tot = data(["total_debits", "total_credits", "balanced"], "Run the totals query again", /v_trial_balance/)[0];
assertEqual(tot.balanced, 1, "Debits should equal credits");
assert(tot.total_debits > 600000, "The totals look stale: copy the totals query below the new postings");`,
        },
      ],
      unlocks: ["ch-posting"],
      checks: [
        {
          prompt: "You forget the tenant condition when joining accounts for the 'clearing' role. What does the balanced-only UPDATE do with those top-up entries?",
          question: {
            type: "choice",
            options: [
              "Posts them: the extra lines cancel out",
              "Leaves them as drafts: the debit side is repeated once per tenant while the credit side is not, so they do not balance",
              "Deletes them",
              "Posts them but marks them with an error flag",
            ],
            answer: 1,
          },
          explanation: "The clearing join would match one account per tenant (three), producing three debit lines against one credit line. Debits no longer equal credits, so the HAVING clause skips the entry and it stays a draft you can find.",
        },
        {
          prompt: "Why insert headers and lines as drafts and post in a final UPDATE, instead of inserting everything as 'posted'?",
          question: {
            type: "text",
            answer: ["so a crash leaves drafts", "half-built entries stay invisible", "drafts do not count", "nothing half-built becomes history", "so nothing half built becomes history"],
            placeholder: "one short sentence",
          },
          explanation: "Posting is the single moment an entry becomes history. If the process dies between inserting the header and its lines, you are left with drafts that no balance counts, instead of a posted entry with missing lines.",
        },
      ],
    },

    // ───────────────────────────── 3 ─────────────────────────────
    {
      id: "counting-house-3-guards",
      title: "Make the database say no",
      minutes: 30,
      xp: 150,
      concepts: ["BEFORE triggers", "RAISE(ABORT)", "immutability", "balance invariants", "reversal entries"],
      learn: md`### Rules in the application are suggestions

Right now "an entry must balance" lives in your head and in one \`UPDATE\`. Every service that will ever write to the ledger has to remember it, forever, including the one-off script someone writes at 2 a.m. One forgetful writer and the books are wrong in a way that is expensive to find. So put the invariant where every writer must pass: **the database**.

A \`CHECK\` constraint sees one row. Rules about *sets* of rows (an entry's lines add up) need triggers. You already know the syntax; this lesson is about **which rules deserve a trigger, and where to hang it**.

### The posting gate

Lines arrive one at a time, so a trigger on line insert cannot know whether the entry will end up balanced. The moment that matters is the flip from draft to posted. A \`BEFORE UPDATE OF status\` trigger is the gate. It runs only when the status actually changes from \`draft\` to \`posted\`, and it can veto with \`RAISE(ABORT, message)\`: the statement fails, nothing changes, and the writer reads your message.

Three things to enforce at the gate:

1. **At least two lines.** A one-line entry can never balance, and a zero-line entry balances trivially (0 = 0), which is its own quiet bug.
2. **Debits equal credits.**
3. **No overdraft on protected accounts.** Wallets and payables are liabilities the co-op must never let go negative (\`allow_negative = 0\`). The balance *after* this entry is the posted balance plus this entry's own effect on the account, so the trigger computes both.

### Freeze history

Once an entry is posted it is part of the record. Make that physical:

- no new line may be added to a posted entry, no line of a posted entry may be updated or deleted (three triggers on \`journal_lines\`: insert, update, delete);
- a posted entry cannot be updated or deleted (two triggers on \`journal_entries\`);
- entries must be **created as drafts**. Without this, someone inserts a row with \`status = 'posted'\` directly and walks around the gate entirely.

That is six small triggers. Small is the point: each one is a single sentence you can say out loud and test.

### How do you fix a mistake, then? You reverse it

A **reversal entry** is a new entry, dated when the correction happened, that mirrors the original with every line's side swapped, and points back through \`reverses_entry_id\`. The original stays. The books show the mistake, the correction, and a net effect of zero. For a refund that is exactly what you want: the sale happened, and then it was undone.

~~~sql
INSERT INTO journal_lines (entry_id, account_id, debit_cents, credit_cents)
SELECT r.entry_id, l.account_id, l.credit_cents, l.debit_cents   -- swapped
FROM journal_entries AS r
JOIN journal_lines AS l ON l.entry_id = r.reverses_entry_id
WHERE ...
~~~

Reversals go through the same gate as everything else, so a refund that would overdraw a seller's payable is refused like any other bad entry.

### What triggers cost you

Triggers are invisible to anyone reading the application code, so name them consistently (\`trg_<table>_<rule>\`), keep each one tiny, and test them (the checks for this lesson attempt forbidden writes and expect them to fail). Do not hide *business* logic in them. Guards that protect an invariant are the sweet spot. Also remember a trigger only fires for the statements that touch the table; \`DROP TRIGGER\` is also a statement, so access to schema changes needs its own protection in a real deployment.

### Common mistakes

- Freezing only INSERT on lines. An UPDATE of \`debit_cents\` on a posted line is just as destructive.
- Checking balance with \`SUM(debit) - SUM(credit)\` and forgetting the entry has no lines yet (\`SUM\` is NULL, and \`NULL <> 0\` is not true). Count the lines first.
- Computing the overdraft test from the posted balance alone, which ignores the entry being posted.
- Letting posted entries be edited "just for the memo". Free-text fields are where fraud hides.`,
      mission: md`The books balance today because you were careful. Tomorrow someone else writes to them. Teach the database to refuse what you would refuse: unbalanced entries, edits to history, and overdrawn wallets.

Then use the machinery for real: four orders were **refunded** after they were booked. Reverse them, and prove with a dashboard of rules that every invariant reads zero. The **Invariant guards** panel shows each rule with its violation count.`,
      tasks: [
        "Freeze history: triggers that refuse changes to the lines and header of a posted entry, and refuse entries created as anything but drafts",
        "Add the posting gate: at least two lines, debits equal credits, and no overdraft of any account with allow_negative = 0",
        "Prove the guards bite: four statements marked -- expect error, one of them a one-line entry posted inside a transaction you roll back",
        "Reverse every refunded order with a mirror entry that goes through the gate, then list each rule with its violation count",
      ],
      starterAdd: sql`-- ── ✏️ YOUR TURN ───────────────────────────
-- Lesson 3: make the database say no.
--
-- 1. Freeze history. Create triggers (use RAISE(ABORT, 'a clear message')) so that:
--      - a line cannot be inserted into, updated in, or deleted from an entry whose status is 'posted'
--        (three triggers on journal_lines; for UPDATE look at both OLD.entry_id and NEW.entry_id)
--      - a posted entry cannot be updated or deleted (two triggers on journal_entries)
--      - an entry can only be INSERTed with status 'draft'
--
-- 2. The posting gate: ONE trigger BEFORE UPDATE OF status ON journal_entries, firing only when
--    OLD.status = 'draft' AND NEW.status = 'posted', that aborts when:
--      - the entry has fewer than 2 lines
--      - its debits and credits differ
--      - it would take an account with allow_negative = 0 below zero. The balance after posting is the account's
--        balance_cents in v_trial_balance PLUS this entry's effect on that account (for a 'D' account: debits - credits,
--        for a 'C' account: credits - debits; accounts.normal_side tells you which)
--
-- 3. Prove the guards. Each of these goes directly under a comment line  -- expect error  :
--      a) UPDATE journal_lines SET debit_cents = 1 WHERE line_id = 1          (a posted line)
--      b) DELETE FROM journal_entries WHERE entry_id = 1                      (a posted entry)
--      c) INSERT INTO journal_entries (...) with status 'posted'               (born posted)
--      d) the gate itself: BEGIN; insert a draft entry (id 900, tenant 1) with ONE line (debit 100 on the bank account);
--         then, under -- expect error, UPDATE it to 'posted'; then ROLLBACK;  (the draft disappears with the transaction)
--
-- 4. Four orders were refunded after they were booked (orders.status = 'refunded', refunded_at is set).
--    Reverse each one: a new draft entry (posted_at = refunded_at, memo 'Refund of order #<id>', ref_type 'refund',
--    ref_id = order_id, reverses_entry_id = the original order entry), lines copied from the original with the debit
--    and credit swapped, then post them. Your triggers now guard this too.
--    Then run ONE query with two columns, rule and violations, one row per rule, each counting how many things break it:
--      'unbalanced posted entries'
--      'posted entries with fewer than two lines'
--      'protected accounts below zero'           (accounts with allow_negative = 0 whose balance_cents < 0)
--      'refunds that do not mirror their original' (the refund's total debits differ from the original's)
`,
      solutionAdd: sql`-- Freeze history
CREATE TRIGGER trg_lines_frozen_insert
BEFORE INSERT ON journal_lines
WHEN EXISTS (SELECT 1 FROM journal_entries WHERE entry_id = NEW.entry_id AND status = 'posted')
BEGIN
  SELECT RAISE(ABORT, 'entry is posted: its lines are frozen');
END;

CREATE TRIGGER trg_lines_frozen_update
BEFORE UPDATE ON journal_lines
WHEN EXISTS (SELECT 1 FROM journal_entries WHERE entry_id IN (OLD.entry_id, NEW.entry_id) AND status = 'posted')
BEGIN
  SELECT RAISE(ABORT, 'entry is posted: its lines are frozen');
END;

CREATE TRIGGER trg_lines_frozen_delete
BEFORE DELETE ON journal_lines
WHEN EXISTS (SELECT 1 FROM journal_entries WHERE entry_id = OLD.entry_id AND status = 'posted')
BEGIN
  SELECT RAISE(ABORT, 'entry is posted: its lines are frozen');
END;

CREATE TRIGGER trg_entries_frozen_update
BEFORE UPDATE ON journal_entries
WHEN OLD.status = 'posted'
BEGIN
  SELECT RAISE(ABORT, 'posted entries cannot be changed: post a reversal instead');
END;

CREATE TRIGGER trg_entries_frozen_delete
BEFORE DELETE ON journal_entries
WHEN OLD.status = 'posted'
BEGIN
  SELECT RAISE(ABORT, 'posted entries cannot be deleted: post a reversal instead');
END;

CREATE TRIGGER trg_entries_start_as_draft
BEFORE INSERT ON journal_entries
WHEN NEW.status <> 'draft'
BEGIN
  SELECT RAISE(ABORT, 'entries are created as drafts and posted afterwards');
END;

-- The posting gate
CREATE TRIGGER trg_post_checks
BEFORE UPDATE OF status ON journal_entries
WHEN OLD.status = 'draft' AND NEW.status = 'posted'
BEGIN
  SELECT RAISE(ABORT, 'an entry needs at least two lines')
  WHERE (SELECT COUNT(*) FROM journal_lines WHERE entry_id = NEW.entry_id) < 2;

  SELECT RAISE(ABORT, 'debits and credits do not match')
  WHERE (SELECT SUM(debit_cents) - SUM(credit_cents) FROM journal_lines WHERE entry_id = NEW.entry_id) <> 0;

  SELECT RAISE(ABORT, 'this would take an account below zero')
  WHERE EXISTS (
    SELECT 1
    FROM journal_lines AS l
    JOIN accounts AS a ON a.account_id = l.account_id
    WHERE l.entry_id = NEW.entry_id
      AND a.allow_negative = 0
      AND (SELECT b.balance_cents FROM v_trial_balance AS b WHERE b.account_id = a.account_id)
          + (SELECT CASE a.normal_side WHEN 'D' THEN SUM(x.net_cents) ELSE -SUM(x.net_cents) END
             FROM journal_lines AS x WHERE x.entry_id = NEW.entry_id AND x.account_id = a.account_id) < 0
  );
END;

-- The guards say no
-- expect error
UPDATE journal_lines SET debit_cents = 1 WHERE line_id = 1;

-- expect error
DELETE FROM journal_entries WHERE entry_id = 1;

-- expect error
INSERT INTO journal_entries (tenant_id, posted_at, memo, status) VALUES (1, '2026-03-01 00:00:00', 'born posted', 'posted');

BEGIN;
INSERT INTO journal_entries (entry_id, tenant_id, posted_at, memo) VALUES (900, 1, '2026-03-01 00:00:00', 'a one-sided entry');
INSERT INTO journal_lines (entry_id, account_id, debit_cents)
VALUES (900, (SELECT account_id FROM accounts WHERE tenant_id = 1 AND role = 'bank'), 100);
-- expect error
UPDATE journal_entries SET status = 'posted' WHERE entry_id = 900;
ROLLBACK;

-- Refunds are reversals of the original order entries
INSERT INTO journal_entries (tenant_id, posted_at, memo, ref_type, ref_id, reverses_entry_id)
SELECT o.tenant_id, o.refunded_at, 'Refund of order #' || o.order_id, 'refund', o.order_id, e.entry_id
FROM orders AS o
JOIN journal_entries AS e ON e.tenant_id = o.tenant_id AND e.ref_type = 'order' AND e.ref_id = o.order_id
WHERE o.status = 'refunded'
ORDER BY o.refunded_at, o.order_id;

INSERT INTO journal_lines (entry_id, account_id, debit_cents, credit_cents)
SELECT r.entry_id, l.account_id, l.credit_cents, l.debit_cents
FROM journal_entries AS r
JOIN journal_lines AS l ON l.entry_id = r.reverses_entry_id
WHERE r.ref_type = 'refund' AND r.status = 'draft';

UPDATE journal_entries SET status = 'posted' WHERE status = 'draft';

-- The invariant dashboard
SELECT 'unbalanced posted entries' AS rule, COUNT(*) AS violations
FROM (
  SELECT l.entry_id
  FROM journal_lines AS l
  JOIN journal_entries AS e ON e.entry_id = l.entry_id
  WHERE e.status = 'posted'
  GROUP BY l.entry_id
  HAVING SUM(l.debit_cents) <> SUM(l.credit_cents)
)
UNION ALL
SELECT 'posted entries with fewer than two lines', COUNT(*)
FROM journal_entries AS e
WHERE e.status = 'posted' AND (SELECT COUNT(*) FROM journal_lines WHERE entry_id = e.entry_id) < 2
UNION ALL
SELECT 'protected accounts below zero', COUNT(*)
FROM v_trial_balance AS b
JOIN accounts AS a ON a.account_id = b.account_id
WHERE a.allow_negative = 0 AND b.balance_cents < 0
UNION ALL
SELECT 'refunds that do not mirror their original', COUNT(*)
FROM journal_entries AS r
WHERE r.reverses_entry_id IS NOT NULL
  AND (SELECT SUM(debit_cents) FROM journal_lines WHERE entry_id = r.entry_id)
      <> (SELECT SUM(debit_cents) FROM journal_lines WHERE entry_id = r.reverses_entry_id);`,
      explanation:
        "Six small triggers make a posted entry physically immutable and force every entry through the draft stage. The gate trigger fires only on the draft-to-posted flip and vetoes entries with fewer than two lines, unequal sides, or an after-posting balance below zero on a protected account (the account's current balance plus this entry's own effect). Corrections are new entries: each refund mirrors its original with the sides swapped and goes through the same gate, so the dashboard still reads zero everywhere.",
      hints: [
        { id: "h1", title: "Shape of a guard", content: "CREATE TRIGGER trg_lines_frozen_insert BEFORE INSERT ON journal_lines WHEN EXISTS (SELECT 1 FROM journal_entries WHERE entry_id = NEW.entry_id AND status = 'posted') BEGIN SELECT RAISE(ABORT, 'entry is posted: its lines are frozen'); END; Repeat for UPDATE (OLD.entry_id and NEW.entry_id) and DELETE (OLD)." },
        { id: "h2", title: "Gate with several rules", content: "One trigger body can hold several statements, each SELECT RAISE(ABORT, '…') WHERE <condition>;. Count lines first. For the overdraft rule compare (SELECT balance_cents FROM v_trial_balance WHERE account_id = a.account_id) + this entry's signed effect against 0, only for accounts with allow_negative = 0." },
        { id: "h3", title: "Mirror entries", content: "Insert the refund headers from orders JOIN journal_entries (the original order entry) with reverses_entry_id = e.entry_id, then INSERT lines SELECT r.entry_id, l.account_id, l.credit_cents, l.debit_cents FROM journal_entries r JOIN journal_lines l ON l.entry_id = r.reverses_entry_id WHERE r.ref_type = 'refund' AND r.status = 'draft', then UPDATE the drafts to 'posted'." },
      ],
      tests: [
        {
          id: "t1",
          description: "Posted entries are frozen: no changes to their lines or header, and no entries created as posted",
          assertionCode: t`const line = "(SELECT MIN(line_id) FROM journal_lines)";
assert(probe("UPDATE journal_lines SET debit_cents = debit_cents WHERE line_id = " + line) !== null, "A line of a posted entry must not be updatable");
assert(probe("DELETE FROM journal_lines WHERE line_id = " + line) !== null, "A line of a posted entry must not be deletable");
const acct = "(SELECT account_id FROM accounts WHERE tenant_id = 1 AND role = 'bank')";
assert(probe("INSERT INTO journal_lines (entry_id, account_id, debit_cents) VALUES (1, " + acct + ", 100)") !== null, "A new line must not be added to a posted entry");
assert(probe("UPDATE journal_entries SET memo = 'edited' WHERE entry_id = 1") !== null, "A posted entry must not be updatable");
assert(probe("DELETE FROM journal_entries WHERE entry_id = 1") !== null, "A posted entry must not be deletable");
assert(probe("INSERT INTO journal_entries (tenant_id, posted_at, memo, status) VALUES (1, '2026-03-01 00:00:00', 'sneaky', 'posted')") !== null, "An entry must not be creatable as already posted");
assertEqual(probe("INSERT INTO journal_entries (entry_id, tenant_id, posted_at, memo) VALUES (900001, 1, '2026-03-01 00:00:00', 'draft is fine')"), null, "A draft entry must still be creatable");
assertEqual(probe("INSERT INTO journal_entries (entry_id, tenant_id, posted_at, memo) VALUES (900001, 1, '2026-03-01 00:00:00', 'draft'); INSERT INTO journal_lines (entry_id, account_id, debit_cents) VALUES (900001, " + acct + ", 100); DELETE FROM journal_lines WHERE entry_id = 900001; DELETE FROM journal_entries WHERE entry_id = 900001"), null, "Drafts and their lines must stay editable and deletable");
assertEqual(accepted().length, 0, "A statement under -- expect error was accepted: a guard is missing");
const said = (re) => refused().some((e) => re.test(e.sql));
assert(said(/^UPDATE journal_lines/i), "Mark an UPDATE of a posted line with -- expect error: it should be refused");
assert(said(/^DELETE FROM journal_entries/i), "Mark a DELETE of a posted entry with -- expect error: it should be refused");
assert(said(/^INSERT INTO journal_entries.*posted/i), "Mark an INSERT of an entry that is born 'posted' with -- expect error: it should be refused");
assert(said(/^UPDATE journal_entries SET status/i), "Mark the UPDATE that posts the one-line entry with -- expect error: the gate should refuse it");
assertEqual(num("SELECT COUNT(*) FROM journal_entries WHERE entry_id = 900"), 0, "The demonstration entry must be rolled back, not left behind");`,
        },
        {
          id: "t2",
          description: "The posting gate refuses one-line entries, unbalanced entries and overdrafts, and accepts a good entry",
          assertionCode: t`const acct = (role, owner) => "(SELECT account_id FROM accounts WHERE tenant_id = 1 AND role = '" + role + "'" + (owner ? " AND owner_member_id = (SELECT member_id FROM members WHERE handle = '" + owner + "')" : "") + ")";
const head = "INSERT INTO journal_entries (entry_id, tenant_id, posted_at, memo) VALUES (900002, 1, '2026-03-01 00:00:00', 'probe'); ";
const line = (account, d, c) => "INSERT INTO journal_lines (entry_id, account_id, debit_cents, credit_cents) VALUES (900002, " + account + ", " + d + ", " + c + "); ";
const post = "UPDATE journal_entries SET status = 'posted' WHERE entry_id = 900002";
assert(probe(head + post) !== null, "An entry with no lines must not post");
assert(probe(head + line(acct("bank"), 100, 0) + post) !== null, "An entry with a single line must not post");
assert(probe(head + line(acct("bank"), 100, 0) + line(acct("equity"), 0, 90) + post) !== null, "An unbalanced entry must not post");
assert(probe(head + line(acct("wallet", "odalys"), 99999999, 0) + line(acct("bank"), 0, 99999999) + post) !== null, "An entry that overdraws a wallet (allow_negative = 0) must not post");
assertEqual(probe(head + line(acct("bank"), 100, 0) + line(acct("equity"), 0, 100) + post), null, "A balanced entry between unprotected accounts must post");
assertEqual(probe(head + line(acct("wallet", "odalys"), 1, 0) + line(acct("bank"), 0, 1) + post), null, "A small debit that leaves the wallet positive must post");
assertEqual(probe(head + line(acct("bank"), 500, 0) + line(acct("wallet", "odalys"), 0, 500) + post), null, "Crediting a wallet must post");`,
        },
        {
          id: "t3",
          description: "Every refunded order has exactly one posted reversal that mirrors the original",
          assertionCode: t`const refunded = num("SELECT COUNT(*) FROM orders WHERE status = 'refunded'");
assert(refunded > 0, "Setup data changed: there should be refunded orders");
assertEqual(num("SELECT COUNT(*) FROM journal_entries WHERE ref_type = 'refund' AND status = 'posted'"), refunded, "One posted refund entry per refunded order");
assertEqual(num("SELECT COUNT(*) FROM journal_entries r JOIN orders o ON o.order_id = r.ref_id AND o.tenant_id = r.tenant_id WHERE r.ref_type = 'refund' AND (o.status <> 'refunded' OR r.posted_at <> o.refunded_at)"), 0, "A refund entry is dated at refunded_at and belongs to a refunded order");
assertEqual(num("SELECT COUNT(*) FROM journal_entries r JOIN journal_entries o ON o.entry_id = r.reverses_entry_id WHERE r.ref_type = 'refund' AND (o.ref_type <> 'order' OR o.ref_id <> r.ref_id)"), 0, "reverses_entry_id must point at the order's own entry");
const leftovers = num("SELECT COUNT(*) FROM (SELECT l.account_id FROM journal_lines l JOIN journal_entries e ON e.entry_id = l.entry_id WHERE e.ref_type = 'refund' OR e.entry_id IN (SELECT reverses_entry_id FROM journal_entries WHERE reverses_entry_id IS NOT NULL) GROUP BY (CASE WHEN e.ref_type = 'refund' THEN e.reverses_entry_id ELSE e.entry_id END), l.account_id HAVING SUM(l.net_cents) <> 0)");
assertEqual(leftovers, 0, "An order entry plus its refund should net to zero on every account");`,
        },
        {
          id: "t4",
          description: "The rule dashboard lists every rule and all of them read zero",
          assertionCode: t`const rules = data(["rule", "violations"], "Add the dashboard: one row per rule with columns rule and violations");
assert(rules.length >= 4, "List all four rules (found " + rules.length + ")");
for (const r of rules) assertEqual(r.violations, 0, "Rule '" + r.rule + "' should have no violations");
const names = rules.map((r) => String(r.rule).toLowerCase()).join("|");
for (const part of ["unbalanced", "fewer than two", "below zero", "mirror"]) assert(names.includes(part), "Missing a rule about: " + part);`,
        },
      ],
      unlocks: ["ch-guards"],
      checks: [
        {
          prompt: "Why is the balance check done when the status flips to 'posted' and not when each line is inserted?",
          question: {
            type: "choice",
            options: [
              "Lines arrive one at a time, so the entry is legitimately unbalanced until the last one is in",
              "Triggers cannot fire on INSERT into journal_lines",
              "SQLite can only check balances on UPDATE",
              "It is faster",
            ],
            answer: 0,
          },
          explanation: "Halfway through writing an entry its debits and credits differ by design. The draft-to-posted flip is the one moment the writer declares 'this is complete', and it is where the rule can be enforced without false alarms.",
        },
        {
          prompt: "An accountant finds a posted sale with the wrong amount. What does the ledger do about it?",
          question: {
            type: "choice",
            options: [
              "UPDATE the line's amount and record who did it",
              "DELETE the entry and insert a corrected one",
              "Post a reversal that mirrors the entry (sides swapped), then post the corrected sale as a new entry",
              "Nothing: posted entries are final",
            ],
            answer: 2,
          },
          explanation: "History is append-only. The wrong sale, its reversal and the right sale are all visible, so an auditor can see exactly what was believed when.",
        },
      ],
    },

    // ───────────────────────────── 4 ─────────────────────────────
    {
      id: "counting-house-4-money",
      title: "Money that adds up",
      minutes: 26,
      xp: 130,
      concepts: ["integer cents", "rounding policy", "largest remainder", "currency minor units", "never REAL for money"],
      learn: md`### Why cents are integers

Open any SQL prompt and try this: \`SELECT 0.1 + 0.2 = 0.3;\` The answer is 0. Floating point cannot represent most decimal fractions exactly, and a ledger that sums thousands of them will drift by amounts too small to see and too large to ignore. The rule is old and absolute: **money is stored as an integer count of the smallest unit** (cents for dollars and euros), in an \`INTEGER\` column, and every calculation stays in integers until the moment a human reads it.

Integers in SQLite are 64-bit, so you can add up a few trillion dollars before anything overflows. The danger is not size, it is *division*.

### Division rounds, and the policy is yours

In SQLite, \`7 / 2\` is \`3\`: integer division truncates toward zero (and \`-7 / 2\` is \`-3\`). \`ROUND(2.675, 2)\` is \`2.68\` on paper but its REAL input is really \`2.67499999…\`, so results surprise people. Whenever a calculation can produce a fraction of a cent (a percentage fee, an exchange rate, a split) you must decide **how it rounds** and write it down:

- **half up**: 0.5 cents goes up. Easy to explain, slightly favours the receiver.
- **truncate**: always down. Simple, always favours the payer.
- **half even** ("banker's rounding"): halves go to the nearest even cent. Unbiased over millions of operations, harder to write in SQL.

Pockett's fee is 5.00% rounded half up. In pure integers that is \`(gross_cents * 500 + 5000) / 10000\`: multiply first (to keep precision), add half the divisor (5000 is half of 10000), then let the truncating division finish. **Multiply before you divide**, and never introduce a decimal literal such as \`0.05\`.

The old checkout truncated. For most baskets that makes no difference, and for some it is a cent short. Cents add up: finding them is a query.

### Splitting without losing a cent

Share $100.01 among three sellers in proportion to their sales and you get fractions: \`33.34, 33.33, 33.34\` rounded naively can total \`100.02\`. The **largest remainder method** never loses or invents a cent:

1. Give every party the floor of its exact share.
2. Count the cents left over (pot minus what you gave out).
3. Hand those leftover cents, one each, to the parties with the largest fractional remainders (break ties by a stable key).

In SQL: integer division gives the floor (\`pot * weight / total_weight\`), the modulo \`%\` gives the numerator of the remainder, and \`ROW_NUMBER() OVER (ORDER BY remainder DESC, name)\` ranks them. A window \`SUM(base) OVER ()\` gives the total handed out without a self-join.

### Currencies have different minor units

Dollars, euros and pounds have 2 decimal places. The yen has 0. The Kuwaiti dinar has 3. So "1500" is $15.00 but ¥1500 and 1.500 KWD. Store the **currency code beside the amount**, keep a table of minor units, and never \`SUM\` across currencies (a total of dollars and yen is a number with no meaning). Display is the only place a decimal point appears, and it is built from the integer with division and modulo, padding the remainder with zeros:

~~~sql
-- 5 cents in a 2-decimal currency: whole = 0, remainder = 5, padded to '05'  ->  0.05
(abs(c) / divisor) || '.' || substr('000', 1, minor_units - length(abs(c) % divisor)) || (abs(c) % divisor)
~~~

(Convert between currencies the same way: store the rate as an integer such as millionths, multiply first, add half the divisor, divide.)

### Common mistakes

- \`ROUND(gross_cents * 0.05)\`: a REAL in the middle of the arithmetic. Use integers end to end.
- Dividing before multiplying: \`gross_cents / 100 * 5\` throws the cents away first.
- Formatting by dividing by 100.0 and printing the REAL. It looks right until it doesn't.
- Rounding each share independently when the total has to match.`,
      mission: md`Finance noticed that fee revenue looks a little low. You suspect the old checkout truncated fees instead of rounding them. Prove it with a query, measure the shortfall, then build the two money helpers the payout and report code will need: a **fair split** that never loses a cent, and a **formatter** that respects each currency.

The **Money desk** panel shows the fee audit, the split and the formatted amounts.`,
      tasks: [
        "Audit fees: list orders of tenant 1 whose stored fee differs from the 5% half-up rule (integers only), then total the shortfall",
        "Split a 10001-cent community grant across tenant 1's sellers in proportion to their February sales, with the largest remainder method",
        "Format cents as text using the currencies table, so 1234 KWD shows as 1.234 and -5 USD as -0.05",
      ],
      starterAdd: sql`-- ── ✏️ YOUR TURN ───────────────────────────
-- Lesson 4: money that adds up. Integers only: no decimal literals such as 0.05 anywhere below.
--
-- 1. Fee audit for tenant 1. The rule is 5.00% rounded half up: (gross_cents * 500 + 5000) / 10000.
--    a) order_id, gross_cents, stored_fee_cents (orders.fee_cents), correct_fee_cents, diff_cents (stored - correct)
--       for orders whose stored fee is wrong, ordered by order_id
--    b) one row: orders_wrong (how many) and shortfall_cents (how many cents the platform undercharged, a positive number)
--
-- 2. A community grant of 10001 cents is shared among tenant 1's sellers in proportion to their February 2026 sales
--    (orders with status 'paid', placed_at >= '2026-02-01' and < '2026-03-01'; weight = SUM of gross_cents per seller handle).
--    Largest remainder: floor shares first, then the leftover cents to the biggest remainders (ties: seller handle A to Z).
--    Columns: seller (the member handle), weight_cents, share_cents. The shares must add up to exactly 10001.
--
-- 3. Format money. Join these samples to the currencies table and build display text from divisor and minor_units:
--      WITH samples (currency, amount_cents) AS (
--        VALUES ('USD', 123456), ('USD', -5), ('JPY', 1500), ('KWD', 1234), ('KWD', -5), ('EUR', 0)
--      )
--    Columns: currency, amount_cents, display. Expected displays: 1234.56, -0.05, 1500, 1.234, -0.005, 0.00
`,
      solutionAdd: sql`-- 1. Which fees are wrong, and by how much in total?
SELECT
  order_id,
  gross_cents,
  fee_cents AS stored_fee_cents,
  (gross_cents * 500 + 5000) / 10000 AS correct_fee_cents,
  fee_cents - (gross_cents * 500 + 5000) / 10000 AS diff_cents
FROM orders
WHERE tenant_id = 1 AND fee_cents <> (gross_cents * 500 + 5000) / 10000
ORDER BY order_id;

SELECT COUNT(*) AS orders_wrong, -COALESCE(SUM(fee_cents - (gross_cents * 500 + 5000) / 10000), 0) AS shortfall_cents
FROM orders
WHERE tenant_id = 1 AND fee_cents <> (gross_cents * 500 + 5000) / 10000;

-- 2. A fair split: largest remainder method
WITH sales AS (
  SELECT m.handle AS seller, SUM(o.gross_cents) AS weight_cents
  FROM orders AS o
  JOIN members AS m ON m.member_id = o.seller_id
  WHERE o.tenant_id = 1 AND o.status = 'paid' AND o.placed_at >= '2026-02-01' AND o.placed_at < '2026-03-01'
  GROUP BY m.handle
), parts AS (
  SELECT seller, weight_cents,
         10001 * weight_cents / (SELECT SUM(weight_cents) FROM sales) AS base_cents,
         10001 * weight_cents % (SELECT SUM(weight_cents) FROM sales) AS remainder
  FROM sales
), ranked AS (
  SELECT *, ROW_NUMBER() OVER (ORDER BY remainder DESC, seller) AS rn, 10001 - SUM(base_cents) OVER () AS leftover
  FROM parts
)
SELECT seller, weight_cents, base_cents + (rn <= leftover) AS share_cents
FROM ranked
ORDER BY seller;

-- 3. Display text per currency
WITH samples (currency, amount_cents) AS (
  VALUES ('USD', 123456), ('USD', -5), ('JPY', 1500), ('KWD', 1234), ('KWD', -5), ('EUR', 0)
)
SELECT
  s.currency,
  s.amount_cents,
  CASE WHEN s.amount_cents < 0 THEN '-' ELSE '' END
    || (abs(s.amount_cents) / c.divisor)
    || CASE WHEN c.minor_units = 0 THEN ''
            ELSE '.' || substr('000', 1, c.minor_units - length(abs(s.amount_cents) % c.divisor)) || (abs(s.amount_cents) % c.divisor)
       END AS display
FROM samples AS s
JOIN currencies AS c ON c.code = s.currency;`,
      explanation:
        "Everything stays in integers: the half-up fee is (gross * 500 + 5000) / 10000, the audit finds the orders where the old truncating checkout came out a cent short, and the shortfall is just a sum. The split gives every seller the floor of an exact proportional share (multiply first, then divide), counts the cents left over, and awards them to the largest remainders, so the shares total exactly 10001. Formatting uses the currency's divisor for the whole part and its minor_units to left-pad the remainder with zeros.",
      hints: [
        { id: "h1", title: "Half up in integers", content: "correct = (gross_cents * 500 + 5000) / 10000. Multiply first, add half the divisor, then divide: SQLite truncates integer division. The audit is WHERE tenant_id = 1 AND fee_cents <> that expression; the shortfall is -SUM(stored - correct) over the same rows." },
        { id: "h2", title: "Largest remainder in three CTEs", content: "sales(seller, weight_cents) → parts(base_cents = 10001 * weight_cents / total, remainder = 10001 * weight_cents % total) → ranked(ROW_NUMBER() OVER (ORDER BY remainder DESC, seller) AS rn, 10001 - SUM(base_cents) OVER () AS leftover). Final share = base_cents + (rn <= leftover): a comparison is 1 or 0 in SQLite." },
        { id: "h3", title: "Zero-padding the remainder", content: "whole = abs(cents) / divisor; frac = abs(cents) % divisor; pad with substr('000', 1, minor_units - length(frac)) || frac. Only add the dot when minor_units > 0 (yen has none), and put '-' in front when the amount is negative." },
      ],
      tests: [
        {
          id: "t1",
          description: "The fee audit lists exactly the orders whose stored fee breaks the half-up rule",
          assertionCode: t`const rs = need(["order_id", "stored_fee_cents", "correct_fee_cents", "diff_cents"], "Add the audit: order_id, gross_cents, stored_fee_cents, correct_fee_cents, diff_cents");
assert(!/\d\.\d/.test(sqlOf(rs)), "Use integer arithmetic only: no decimal literals like 0.05");
const got = objs(rs);
const want = query("SELECT order_id, fee_cents AS stored_fee_cents, (gross_cents * 500 + 5000) / 10000 AS correct_fee_cents, fee_cents - (gross_cents * 500 + 5000) / 10000 AS diff_cents FROM orders WHERE tenant_id = 1 AND fee_cents <> (gross_cents * 500 + 5000) / 10000");
assert(want.length > 0, "Setup data changed: there should be wrong fees");
match(got, want, "order_id", ["stored_fee_cents", "correct_fee_cents", "diff_cents"], "the fee audit");`,
        },
        {
          id: "t2",
          description: "The shortfall row counts the wrong orders and totals the missing cents",
          assertionCode: t`const r = data(["orders_wrong", "shortfall_cents"], "Add the totals: one row with orders_wrong and shortfall_cents")[0];
const want = one("SELECT COUNT(*) AS n, -SUM(fee_cents - (gross_cents * 500 + 5000) / 10000) AS s FROM orders WHERE tenant_id = 1 AND fee_cents <> (gross_cents * 500 + 5000) / 10000");
assertEqual(r.orders_wrong, want.n, "orders_wrong");
assertEqual(r.shortfall_cents, want.s, "shortfall_cents (positive when the platform charged too little)");`,
        },
        {
          id: "t3",
          description: "The 10001-cent grant is split by the largest remainder method and adds up exactly",
          assertionCode: t`const rs = need(["seller", "weight_cents", "share_cents"], "Add the split: seller, weight_cents, share_cents");
assert(!/\d\.\d/.test(sqlOf(rs)), "Use integer arithmetic only: no decimal literals");
const got = objs(rs);
assertEqual(got.reduce((a, r) => a + r.share_cents, 0), 10001, "The shares must add up to exactly 10001 cents");
const sales = query("SELECT m.handle AS seller, SUM(o.gross_cents) AS w FROM orders o JOIN members m ON m.member_id = o.seller_id WHERE o.tenant_id = 1 AND o.status = 'paid' AND o.placed_at >= '2026-02-01' AND o.placed_at < '2026-03-01' GROUP BY m.handle");
const total = sales.reduce((a, r) => a + r.w, 0);
const parts = sales.map((r) => ({ seller: r.seller, weight_cents: r.w, base: Math.floor((10001 * r.w) / total), rem: (10001 * r.w) % total }));
let left = 10001 - parts.reduce((a, p) => a + p.base, 0);
const order = [...parts].sort((a, b) => b.rem - a.rem || (a.seller < b.seller ? -1 : 1));
const want = parts.map((p) => ({ seller: p.seller, weight_cents: p.weight_cents, share_cents: p.base + (order.indexOf(p) < left ? 1 : 0) }));
match(got, want, "seller", ["weight_cents", "share_cents"], "the split");`,
        },
        {
          id: "t4",
          description: "Amounts are formatted using each currency's minor units",
          assertionCode: t`const got = data(["currency", "amount_cents", "display"], "Add the formatter: currency, amount_cents, display");
const want = [["USD", 123456, "1234.56"], ["USD", -5, "-0.05"], ["JPY", 1500, "1500"], ["KWD", 1234, "1.234"], ["KWD", -5, "-0.005"], ["EUR", 0, "0.00"]];
assertEqual(got.length, want.length, "One row per sample");
for (const [c, a, d] of want) {
  const g = got.find((r) => r.currency === c && r.amount_cents === a);
  assert(g, "Missing the sample " + c + " " + a);
  assertEqual(String(g.display), d, "display for " + c + " " + a);
}
assert(/currencies/.test(sqlOf(need(["currency", "amount_cents", "display"]))), "Build the text from the currencies table (divisor and minor_units), not from hard-coded 100s");`,
        },
      ],
      unlocks: ["ch-money"],
      checks: [
        {
          prompt: "What does `SELECT -7 / 2;` return in SQLite?",
          question: { type: "number", answer: -3 },
          explanation: "Integer division truncates toward zero, so -7 / 2 is -3, not -4. That is why a rounding rule has to be written out explicitly rather than assumed.",
        },
        {
          prompt: "Why must a fair split use the largest remainder method rather than rounding each share on its own?",
          question: {
            type: "choice",
            options: [
              "Independent rounding can make the shares add up to more or less than the pot",
              "ROUND does not work on integers",
              "Window functions are required for any split",
              "It is the only way to avoid division by zero",
            ],
            answer: 0,
          },
          explanation: "Three shares of 33.335 each round to 33.34, a total one cent too high. Giving out the floors and then distributing the leftover cents guarantees the total, and the parties with the largest remainders are the ones treated most fairly by the rounding.",
        },
      ],
    },
  ],
};
