import type { Chapter } from "@/engine/types";
import { md, sql, t } from "./util.ts";

/**
 * Chapter 4: reports and truth.
 * Window-function statements and summary tables, time-series roll-ups with late data,
 * and data-quality checks plus a reconciliation against the processor.
 */
export const chapter4: Chapter = {
  id: "reports-and-truth",
  title: "Reports and truth",
  blurb: "Running balances, incremental summaries, roll-ups that survive late data, and checks that the books match reality.",
  lessons: [
    // ───────────────────────────── 14 ─────────────────────────────
    {
      id: "counting-house-14-statements",
      title: "Statements and trends",
      minutes: 28,
      xp: 160,
      concepts: ["running balance with SUM() OVER", "opening balance", "half-open periods", "LAG", "incremental summary table"],
      learn: md`### A report is a query over history

Every number on a statement is derived from posted lines. That is the payoff of the design in chapter 1: nobody has to trust a stored balance, because any balance can be re-derived and checked. This lesson turns the ledger into the two reports people actually read.

### The account statement: a running balance

A statement lists movements with the balance after each one. A window function computes it without a self-join:

~~~sql
SUM(l.credit_cents - l.debit_cents) OVER (ORDER BY e.posted_at, l.line_id) AS balance_cents
~~~

\`ORDER BY\` inside \`OVER\` makes the sum cumulative: every row sums itself and all rows before it. Two details matter. First, the ordering must be a **total order**: if two lines share a timestamp and you order by time alone, SQLite's default frame treats them as peers and gives them the *same* total. Add a unique tiebreaker (\`line_id\`). Second, a wallet is a liability, so its natural direction is credits minus debits; an asset account would flip the subtraction.

### Opening balance

A statement for February does not start at zero. It starts at **whatever the account held when February began**. Compute that once (the sum of everything dated before the period) and add it to the running movement:

~~~text
balance after a line = opening balance + movement up to and including that line
~~~

Keep the window over February's rows only; the opening balance carries the history. This is faster and keeps the statement's meaning stable.

### Periods are half-open

Always write a period as \`posted_at >= '2026-02-01' AND posted_at < '2026-03-01'\`. Never \`BETWEEN '2026-02-01' AND '2026-02-28 23:59:59'\` (it drops the last second, or the last fraction of one), never \`substr(posted_at, 1, 7) = '2026-02'\` on a column you would like to index. Half-open ranges tile exactly: every instant belongs to one period. Store timestamps in UTC and convert at the edge.

### Trends: LAG

Month-over-month is a comparison of a row with its predecessor, which is what \`LAG\` is for:

~~~sql
LAG(fees_cents) OVER (ORDER BY month) AS prev_fees_cents
~~~

The percentage is a presentation value, so a decimal is acceptable here (money stays in integers; ratios do not need to). Guard the first row, whose previous month is NULL.

### Summary tables: a cache you must keep honest

When a report is read far more than the ledger changes, keep a **summary table**: \`monthly_balances\` holds total debits and credits per tenant, account and month. It is *derived data*, a cache, and caches go stale. Rules that keep it trustworthy:

1. It must be **rebuildable** from the ledger at any time, and you should be able to prove it (a query comparing it with a fresh aggregate).
2. Refresh by **recomputing the affected keys from source** and overwriting (\`ON CONFLICT … DO UPDATE SET debit_cents = excluded.debit_cents\`), not by adding deltas. Recomputing is idempotent: a repeated or crashed run does no harm. Adding deltas double-counts the moment anything runs twice.
3. Track a **watermark** (\`summary_state.last_entry_id\`): the newest entry already folded in. Each refresh recomputes only the (tenant, account, month) keys touched by newer entries, then advances the watermark, ideally in the same transaction.
4. Beware **backdated entries**. An entry posted today with \`posted_at\` in February belongs to an old month. Key the refresh by the month of each new entry's *date*, not by "this month", or February silently goes stale.

### Common mistakes

- \`ORDER BY posted_at\` with no tiebreaker in the window.
- Treating entry_id order as time order. A backdated entry has a high id and an old date.
- Advancing the watermark before the refresh has succeeded.
- A refresh that rebuilds everything every time. That works, but it is the full scan you built the summary to avoid.`,
      mission: md`Odalys has asked for her February wallet statement, and the finance lead wants a month-over-month view of fee revenue. Reading the whole ledger for every request will not scale, so you will also build a monthly summary that refreshes incrementally, and then prove it handles a **late entry dated in February but posted today**.

The **Statements & trends** panel draws the running balance and the month-over-month movement.`,
      tasks: [
        "Odalys's wallet statement for February: each line with the running balance, starting from her opening balance",
        "Build monthly_balances and a summary_state watermark; fill it from the whole ledger with a recompute-and-overwrite upsert",
        "Post a late goodwill credit dated 2026-02-28 and refresh incrementally: only the touched account-months may be rewritten",
        "Fee revenue month over month with LAG",
      ],
      starterAdd: sql`-- ── ✏️ YOUR TURN ───────────────────────────
-- Lesson 14: statements and trends.
--
-- 1. Odalys's wallet (role 'wallet', owner = the member with handle 'odalys') for February 2026: one row per posted line
--    dated >= '2026-02-01' and < '2026-03-01', columns posted_at, memo, debit_cents, credit_cents, balance_cents.
--    balance_cents = her opening balance (everything posted before 2026-02-01, credits - debits) + the running movement
--    SUM(credit_cents - debit_cents) OVER (ORDER BY posted_at, line_id). Order the rows the same way.
--
-- 2. monthly_balances: tenant_id INTEGER NOT NULL, account_id INTEGER NOT NULL (references accounts), month TEXT NOT NULL ('YYYY-MM'),
--      debit_cents INTEGER NOT NULL, credit_cents INTEGER NOT NULL, PRIMARY KEY (tenant_id, account_id, month)
--    summary_state: name TEXT PRIMARY KEY, last_entry_id INTEGER NOT NULL; insert ('monthly_balances', 0)
--    Refresh = ONE statement: recompute the totals of every (tenant, account, month) that has a posted entry with
--      entry_id > the watermark, from ALL posted lines of that key, and upsert (ON CONFLICT ... DO UPDATE SET x = excluded.x).
--    Then move the watermark to the highest posted entry_id. Run the refresh once now: it builds everything.
--
-- 3. A goodwill credit arrives late: tenant 1, posted_at '2026-02-28 18:00:00', memo 'Late goodwill credit for Odalys Brandt',
--    ref_type 'manual'. Dr the 'credits' account 2000 / Cr Odalys's wallet 2000. Post it (draft, lines, post), then run the
--    SAME refresh statement again and move the watermark again. Only the touched account-months may be rewritten.
--
-- 4. Fee revenue (tenant 1's 'fees' account, credits - debits) by month from monthly_balances:
--    month, fees_cents, prev_fees_cents (LAG), change_pct = ROUND((fees - prev) * 100.0 / prev, 1), ordered by month.
`,
      solutionAdd: sql`-- 1. The February statement: opening balance + running movement
WITH wallet AS (
  SELECT account_id FROM accounts
  WHERE tenant_id = 1 AND role = 'wallet' AND owner_member_id = (SELECT member_id FROM members WHERE handle = 'odalys')
), opening AS (
  SELECT COALESCE(SUM(l.credit_cents - l.debit_cents), 0) AS cents
  FROM journal_lines AS l
  JOIN journal_entries AS e ON e.entry_id = l.entry_id
  WHERE e.status = 'posted' AND l.account_id = (SELECT account_id FROM wallet) AND e.posted_at < '2026-02-01'
)
SELECT
  e.posted_at,
  e.memo,
  l.debit_cents,
  l.credit_cents,
  (SELECT cents FROM opening) + SUM(l.credit_cents - l.debit_cents) OVER (ORDER BY e.posted_at, l.line_id) AS balance_cents
FROM journal_lines AS l
JOIN journal_entries AS e ON e.entry_id = l.entry_id
WHERE e.status = 'posted' AND l.account_id = (SELECT account_id FROM wallet)
  AND e.posted_at >= '2026-02-01' AND e.posted_at < '2026-03-01'
ORDER BY e.posted_at, l.line_id;

-- 2. The monthly summary and its watermark
CREATE TABLE monthly_balances (
  tenant_id INTEGER NOT NULL,
  account_id INTEGER NOT NULL REFERENCES accounts (account_id),
  month TEXT NOT NULL,
  debit_cents INTEGER NOT NULL,
  credit_cents INTEGER NOT NULL,
  PRIMARY KEY (tenant_id, account_id, month)
);

CREATE TABLE summary_state (
  name TEXT PRIMARY KEY,
  last_entry_id INTEGER NOT NULL
);
INSERT INTO summary_state VALUES ('monthly_balances', 0);

-- Refresh: recompute the touched keys from source and overwrite
INSERT INTO monthly_balances (tenant_id, account_id, month, debit_cents, credit_cents)
SELECT e.tenant_id, l.account_id, substr(e.posted_at, 1, 7), SUM(l.debit_cents), SUM(l.credit_cents)
FROM journal_lines AS l
JOIN journal_entries AS e ON e.entry_id = l.entry_id
WHERE e.status = 'posted'
  AND (e.tenant_id, l.account_id, substr(e.posted_at, 1, 7)) IN (
    SELECT e2.tenant_id, l2.account_id, substr(e2.posted_at, 1, 7)
    FROM journal_lines AS l2
    JOIN journal_entries AS e2 ON e2.entry_id = l2.entry_id
    WHERE e2.status = 'posted' AND e2.entry_id > (SELECT last_entry_id FROM summary_state WHERE name = 'monthly_balances')
  )
GROUP BY e.tenant_id, l.account_id, substr(e.posted_at, 1, 7)
ON CONFLICT (tenant_id, account_id, month) DO UPDATE
SET debit_cents = excluded.debit_cents, credit_cents = excluded.credit_cents;

UPDATE summary_state
SET last_entry_id = (SELECT MAX(entry_id) FROM journal_entries WHERE status = 'posted')
WHERE name = 'monthly_balances';

-- 3. A late entry for February, posted today
INSERT INTO journal_entries (tenant_id, posted_at, memo, ref_type)
VALUES (1, '2026-02-28 18:00:00', 'Late goodwill credit for Odalys Brandt', 'manual');

INSERT INTO journal_lines (entry_id, account_id, debit_cents, credit_cents)
VALUES
  ((SELECT MAX(entry_id) FROM journal_entries), (SELECT account_id FROM accounts WHERE tenant_id = 1 AND role = 'credits'), 2000, 0),
  ((SELECT MAX(entry_id) FROM journal_entries), (SELECT account_id FROM accounts WHERE tenant_id = 1 AND role = 'wallet' AND owner_member_id = (SELECT member_id FROM members WHERE handle = 'odalys')), 0, 2000);

UPDATE journal_entries SET status = 'posted' WHERE status = 'draft';

-- The same refresh again: it touches only (credits, 2026-02) and (Odalys's wallet, 2026-02)
INSERT INTO monthly_balances (tenant_id, account_id, month, debit_cents, credit_cents)
SELECT e.tenant_id, l.account_id, substr(e.posted_at, 1, 7), SUM(l.debit_cents), SUM(l.credit_cents)
FROM journal_lines AS l
JOIN journal_entries AS e ON e.entry_id = l.entry_id
WHERE e.status = 'posted'
  AND (e.tenant_id, l.account_id, substr(e.posted_at, 1, 7)) IN (
    SELECT e2.tenant_id, l2.account_id, substr(e2.posted_at, 1, 7)
    FROM journal_lines AS l2
    JOIN journal_entries AS e2 ON e2.entry_id = l2.entry_id
    WHERE e2.status = 'posted' AND e2.entry_id > (SELECT last_entry_id FROM summary_state WHERE name = 'monthly_balances')
  )
GROUP BY e.tenant_id, l.account_id, substr(e.posted_at, 1, 7)
ON CONFLICT (tenant_id, account_id, month) DO UPDATE
SET debit_cents = excluded.debit_cents, credit_cents = excluded.credit_cents;

UPDATE summary_state
SET last_entry_id = (SELECT MAX(entry_id) FROM journal_entries WHERE status = 'posted')
WHERE name = 'monthly_balances';

-- 4. Month over month
SELECT month, fees_cents, prev_fees_cents, ROUND((fees_cents - prev_fees_cents) * 100.0 / prev_fees_cents, 1) AS change_pct
FROM (
  SELECT mb.month, mb.credit_cents - mb.debit_cents AS fees_cents,
         LAG(mb.credit_cents - mb.debit_cents) OVER (ORDER BY mb.month) AS prev_fees_cents
  FROM monthly_balances AS mb
  JOIN accounts AS a ON a.account_id = mb.account_id
  WHERE a.tenant_id = 1 AND a.role = 'fees'
)
ORDER BY month;`,
      explanation:
        "The statement adds the opening balance (everything before February) to a running SUM over February's lines, ordered by a total order (posted_at, line_id). The summary refresh recomputes totals for every key touched by entries newer than the watermark and overwrites them, so it is idempotent. The first run builds all 58 keys; after the late February entry the same statement rewrites only the two keys it touched, which is why the backdated entry cannot leave February stale. LAG pairs each month with the previous one for the percentage.",
      hints: [
        { id: "h1", title: "Statement shape", content: "A CTE finds Odalys's wallet account; another sums credits - debits for posted lines before '2026-02-01' as the opening balance. The outer query selects February's lines and adds (SELECT cents FROM opening) + SUM(l.credit_cents - l.debit_cents) OVER (ORDER BY e.posted_at, l.line_id)." },
        { id: "h2", title: "Refresh by recomputing", content: "INSERT … SELECT tenant, account, substr(posted_at,1,7), SUM(debit), SUM(credit) … WHERE (tenant_id, account_id, month) IN (SELECT the keys of entries with entry_id > the watermark) GROUP BY the key ON CONFLICT (tenant_id, account_id, month) DO UPDATE SET debit_cents = excluded.debit_cents, credit_cents = excluded.credit_cents; Put a WHERE before ON CONFLICT: the one above has it." },
        { id: "h3", title: "The late entry and LAG", content: "Insert the draft header, then the two lines using (SELECT MAX(entry_id) FROM journal_entries) as the entry id, then UPDATE journal_entries SET status = 'posted' WHERE status = 'draft'. For the trend: LAG(credit_cents - debit_cents) OVER (ORDER BY month) inside a subquery, then compute change_pct outside." },
      ],
      tests: [
        {
          id: "t1",
          description: "The statement lists February's lines and the balance starts from the opening balance",
          assertionCode: t`const rs = need(["posted_at", "memo", "debit_cents", "credit_cents", "balance_cents"], "Add the statement: posted_at, memo, debit_cents, credit_cents, balance_cents", /over\s*\(/);
const got = objs(rs);
const acct = "(SELECT account_id FROM accounts WHERE tenant_id = 1 AND role = 'wallet' AND owner_member_id = (SELECT member_id FROM members WHERE handle = 'odalys'))";
const opening = num("SELECT COALESCE(SUM(l.credit_cents - l.debit_cents), 0) FROM journal_lines l JOIN journal_entries e ON e.entry_id = l.entry_id WHERE e.status = 'posted' AND l.account_id = " + acct + " AND e.posted_at < '2026-02-01'");
const lines = query("SELECT e.posted_at AS posted_at, e.memo AS memo, l.debit_cents AS d, l.credit_cents AS c FROM journal_lines l JOIN journal_entries e ON e.entry_id = l.entry_id WHERE e.status = 'posted' AND l.account_id = " + acct + " AND e.posted_at >= '2026-02-01' AND e.posted_at < '2026-03-01' AND e.memo NOT LIKE 'Late goodwill%' ORDER BY e.posted_at, l.line_id");
assert(opening > 0, "Setup data changed: Odalys should have an opening balance");
assertEqual(got.length, lines.length, "One row per posted February line (the late credit is posted later in the file, so it is not in this result)");
let run = opening;
lines.forEach((l, i) => {
  run += l.c - l.d;
  assertEqual(got[i].memo, l.memo, "Row " + (i + 1) + " memo");
  assertEqual(got[i].balance_cents, run, "balance_cents after row " + (i + 1) + " (" + l.memo + "): opening " + opening + " plus the movement so far");
});`,
        },
        {
          id: "t2",
          description: "monthly_balances equals a fresh aggregate of the ledger for every tenant, account and month",
          assertionCode: t`assert(has("table", "monthly_balances"), "Create monthly_balances");
for (const c of ["tenant_id", "account_id", "month", "debit_cents", "credit_cents"]) assert(cols("monthly_balances").includes(c), "monthly_balances needs a column named " + c);
const diff = num("SELECT COUNT(*) FROM (SELECT e.tenant_id AS t, l.account_id AS a, substr(e.posted_at, 1, 7) AS m, SUM(l.debit_cents) AS d, SUM(l.credit_cents) AS c FROM journal_lines l JOIN journal_entries e ON e.entry_id = l.entry_id WHERE e.status = 'posted' GROUP BY 1, 2, 3 EXCEPT SELECT tenant_id, account_id, month, debit_cents, credit_cents FROM monthly_balances)");
assertEqual(diff, 0, "Some account-months in the summary differ from the ledger (stale or missing)");
assertEqual(num("SELECT COUNT(*) FROM monthly_balances"), num("SELECT COUNT(*) FROM (SELECT 1 FROM journal_lines l JOIN journal_entries e ON e.entry_id = l.entry_id WHERE e.status = 'posted' GROUP BY e.tenant_id, l.account_id, substr(e.posted_at, 1, 7))"), "The summary must hold exactly one row per account-month that has postings");
assert(probe("INSERT INTO monthly_balances SELECT * FROM monthly_balances LIMIT 1") !== null, "A second row for the same tenant, account and month must be refused");`,
        },
        {
          id: "t3",
          description: "The late February entry was folded in incrementally: the second refresh rewrote only the touched keys",
          assertionCode: t`assertEqual(num("SELECT COUNT(*) FROM journal_entries WHERE memo = 'Late goodwill credit for Odalys Brandt' AND status = 'posted' AND posted_at = '2026-02-28 18:00:00' AND tenant_id = 1"), 1, "Post the late goodwill credit (dated 2026-02-28 18:00:00)");
assertEqual(num("SELECT SUM(l.debit_cents) FROM journal_lines l JOIN journal_entries e ON e.entry_id = l.entry_id WHERE e.memo = 'Late goodwill credit for Odalys Brandt'"), 2000, "The late credit is for 2000 cents");
const wm = one("SELECT last_entry_id FROM summary_state WHERE name = 'monthly_balances'");
assert(wm, "summary_state needs a row named monthly_balances");
assertEqual(wm.last_entry_id, num("SELECT MAX(entry_id) FROM journal_entries WHERE status = 'posted'"), "The watermark must point at the newest posted entry");
const refreshes = log.filter((e) => e.verb === "INSERT" && /monthly_balances/i.test(e.sql) && !/summary_state/i.test(e.sql) && e.changes > 0);
assert(refreshes.length >= 2, "Run the refresh twice (found " + refreshes.length + ")");
assert(refreshes[0].changes >= 20, "The first refresh should build the whole summary (it rewrote " + refreshes[0].changes + " rows)");
const last = refreshes[refreshes.length - 1].changes;
assert(last <= 4, "The second refresh should rewrite only the two touched account-months, but it rewrote " + last + " rows: recompute only keys with entry_id above the watermark");`,
        },
        {
          id: "t4",
          description: "Month over month shows each month's fee revenue, the previous month and the percentage change",
          assertionCode: t`const got = data(["month", "fees_cents", "prev_fees_cents", "change_pct"], "Add the trend: month, fees_cents, prev_fees_cents, change_pct", /lag\s*\(/);
const fees = query("SELECT substr(e.posted_at, 1, 7) AS m, SUM(l.credit_cents - l.debit_cents) AS f FROM journal_lines l JOIN journal_entries e ON e.entry_id = l.entry_id JOIN accounts a ON a.account_id = l.account_id WHERE e.status = 'posted' AND a.tenant_id = 1 AND a.role = 'fees' GROUP BY 1 ORDER BY 1");
assertEqual(got.length, fees.length, "One row per month");
fees.forEach((f, i) => {
  assertEqual(got[i].month, f.m, "month of row " + (i + 1));
  assertEqual(got[i].fees_cents, f.f, "fees_cents for " + f.m);
  if (i === 0) assert(got[i].prev_fees_cents === null, "The first month has no previous month");
  else {
    assertEqual(got[i].prev_fees_cents, fees[i - 1].f, "prev_fees_cents for " + f.m);
    assertClose(got[i].change_pct, Math.round(((f.f - fees[i - 1].f) * 1000) / fees[i - 1].f) / 10, 0.051, "change_pct for " + f.m);
  }
});`,
        },
      ],
      unlocks: ["ch-statement"],
      checks: [
        {
          prompt: "Why does the running-balance window order by `posted_at, line_id` rather than `posted_at` alone?",
          question: {
            type: "choice",
            options: [
              "Rows with the same timestamp would be treated as peers and share one running total",
              "line_id makes the SUM faster",
              "SQLite requires two ORDER BY columns in a window",
              "posted_at is not sortable",
            ],
            answer: 0,
          },
          explanation: "The default window frame includes all peers of the current row. A unique tiebreaker turns the order into a total order, so every line gets its own running balance.",
        },
        {
          prompt: "A summary table is refreshed with `SET debit_cents = debit_cents + excluded.debit_cents`. What goes wrong?",
          question: {
            type: "choice",
            options: [
              "Nothing: adding deltas is the idempotent way",
              "Running the refresh twice for the same entries double-counts them",
              "SQLite refuses to compile it",
              "It only breaks for backdated entries",
            ],
            answer: 1,
          },
          explanation: "Adding is not idempotent: a retry, a crash before the watermark moves, or an overlapping run counts the same entries again. Recomputing the key from source and overwriting is safe to repeat.",
        },
      ],
    },

    // ───────────────────────────── 15 ─────────────────────────────
    {
      id: "counting-house-15-rollups",
      title: "Roll-ups and late data",
      minutes: 30,
      xp: 170,
      concepts: ["time buckets", "additive measures", "watermark", "late-arriving events", "idempotent recompute"],
      learn: md`### Why roll up

\`card_attempts\` records every card attempt: about eleven hundred rows in a week, millions in a real month. The ops dashboard asks the same questions all day ("what is the approval rate per hour?"). Answering from raw events every time wastes work. A **roll-up table** stores one row per tenant per hour with pre-aggregated numbers, so the dashboard reads 24 rows instead of thousands.

### What to store: counts and sums, never rates

Store \`attempts\`, \`ok\`, \`declined\`, \`errors\`, \`ok_cents\` and \`latency_ms_sum\`. Do **not** store \`approval_pct\` or \`avg_latency\`. Counts and sums are *additive*: hours roll up into days by plain addition. Ratios are not: the average of two hourly averages is wrong whenever the hours have different volumes (one hour with 2 attempts and one with 200). Compute rates at read time from the additive columns.

### Buckets come from event time

An hour bucket is \`strftime('%Y-%m-%d %H:00:00', at)\` where \`at\` is **when the attempt happened**. Bucketing by when we *heard* about it would smear one hour's traffic across several.

### Late-arriving data

Two clocks are in play. \`at\` says when it happened; \`received_at\` says when it reached us. Phones go through tunnels, retries wait their turn, a partner uploads a batch the next morning. So events routinely arrive **after** the hour they belong to has been rolled up. A roll-up that only ever looks at "the current hour" quietly under-counts.

A run therefore processes by **arrival**: everything with \`received_at\` in \`(watermark, cutoff]\`. Two ways to fold in an event for an old hour:

- **Add a delta** to that bucket. Fast, but not idempotent: if a run is repeated or dies between the add and the watermark update, events count twice.
- **Recompute the bucket** from raw events and overwrite it. Slightly more work, but running it twice gives the same table. Prefer this until volume forces otherwise.

The recompute recipe: find the buckets touched by newly arrived events (\`(tenant_id, hour)\` pairs where \`received_at\` is above the watermark and up to the cutoff), recompute each of those buckets from **all** its events that have arrived by the cutoff, and upsert. Then move the watermark to the cutoff.

### Cutoff and watermark

The cutoff is a fixed instant you choose (not "whatever now is while the query runs), so a run is reproducible and nothing that arrives *during* the run is skipped by an off-by-one. The watermark lives in a table (\`rollup_state\`) and moves only after the writes succeeded; a crash leaves the old watermark, and the next run repairs the gap.

### Hours into days

Days are sums of hours, not a second scan of the raw events. Derive \`rollup_daily\` from \`rollup_hourly\` with the same upsert-and-overwrite pattern.

### Measuring lateness

A report of how many events arrive more than an hour late, per day, tells you how long you must keep re-rolling old buckets: if 99.9% of events arrive within six hours, rolling a bucket for 24 hours after its end is safe.

### Common mistakes

- Bucketing by \`received_at\`.
- Storing averages or percentages in the roll-up.
- Using \`>= watermark\` on one side and \`<= cutoff\` on the other, so events exactly at the boundary count twice or never. Use \`> watermark AND <= cutoff\`.
- Setting the watermark to the wall clock after the run, which skips events that arrived while it ran.`,
      mission: md`The ops dashboard times out because it aggregates a week of card attempts on every refresh. Build hourly roll-ups that run in two passes, the first at noon on 28 February and the second on the morning of 2 March, and prove the second pass **heals** the hours that late events belong to. Then derive daily numbers from the hourly ones.

The **Roll-ups & late data** panel compares the two runs and shows the daily approval rate and how much arrives late.`,
      tasks: [
        "Create rollup_hourly (primary key tenant_id + hour) and rollup_state with a watermark row",
        "Run 1 with cutoff '2026-02-28 12:00:00', then run 2 with cutoff '2026-03-02 08:00:00': recompute and overwrite every hour touched by newly arrived events, and move the watermark each time",
        "Show a summary row after each run, build rollup_daily from the hourly rows, then report tenant 1's daily approval rate and the share of events that arrive more than an hour late",
      ],
      starterAdd: sql`-- ── ✏️ YOUR TURN ───────────────────────────
-- Lesson 15: roll-ups and late data. card_attempts(attempt_id, tenant_id, at, received_at, status, amount_cents, latency_ms):
-- 'at' is when the attempt happened, 'received_at' when it reached us; status is 'ok', 'declined' or 'error'.
--
-- 1. rollup_hourly: tenant_id INTEGER NOT NULL, hour TEXT NOT NULL ('YYYY-MM-DD HH:00:00'), attempts, ok, declined, errors,
--      ok_cents (sum of amount_cents of ok attempts), latency_ms_sum: all INTEGER NOT NULL, PRIMARY KEY (tenant_id, hour)
--    rollup_state: name TEXT PRIMARY KEY, watermark TEXT NOT NULL; insert ('card_attempts_hourly', '1970-01-01 00:00:00')
--
-- 2. A run with a CUTOFF, in ONE upsert statement:
--      - find the (tenant_id, hour) buckets touched by events with received_at > watermark AND received_at <= cutoff
--      - recompute each of those buckets from ALL its events with received_at <= cutoff (bucket = strftime('%Y-%m-%d %H:00:00', at))
--      - ON CONFLICT (tenant_id, hour) DO UPDATE SET every column = excluded.<column>   (overwrite, never add)
--    then UPDATE rollup_state SET watermark = cutoff.
--    Run 1: cutoff '2026-02-28 12:00:00'. Then a result: stage 'after run 1', hours (rows in rollup_hourly), attempts (their SUM).
--    Run 2: the same statement with cutoff '2026-03-02 08:00:00'. Then a result: stage 'after run 2', hours, attempts.
--
-- 3. rollup_daily: the same columns but day TEXT ('YYYY-MM-DD') instead of hour, PRIMARY KEY (tenant_id, day), built from
--    rollup_hourly with an overwrite upsert (SUM of each additive column per tenant and day; remember WHERE true).
--    Report for tenant 1, ordered by day:
--      a) day, attempts, ok, approval_pct (ROUND(ok * 100.0 / attempts, 1)), ok_cents, avg_latency_ms (latency_ms_sum / attempts, integer)
--      b) day, total_events, late_events (received_at later than 1 hour after at), late_pct (ROUND(late * 100.0 / total, 1)),
--         from card_attempts, tenant 1, by the day of 'at'
`,
      solutionAdd: sql`-- 1. Roll-up tables
CREATE TABLE rollup_hourly (
  tenant_id INTEGER NOT NULL,
  hour TEXT NOT NULL,
  attempts INTEGER NOT NULL,
  ok INTEGER NOT NULL,
  declined INTEGER NOT NULL,
  errors INTEGER NOT NULL,
  ok_cents INTEGER NOT NULL,
  latency_ms_sum INTEGER NOT NULL,
  PRIMARY KEY (tenant_id, hour)
);

CREATE TABLE rollup_state (
  name TEXT PRIMARY KEY,
  watermark TEXT NOT NULL
);
INSERT INTO rollup_state VALUES ('card_attempts_hourly', '1970-01-01 00:00:00');

-- 2. Run 1: events that had arrived by noon on the 28th
INSERT INTO rollup_hourly (tenant_id, hour, attempts, ok, declined, errors, ok_cents, latency_ms_sum)
SELECT tenant_id, strftime('%Y-%m-%d %H:00:00', at) AS hour,
       COUNT(*), SUM(status = 'ok'), SUM(status = 'declined'), SUM(status = 'error'),
       SUM(CASE WHEN status = 'ok' THEN amount_cents ELSE 0 END), SUM(latency_ms)
FROM card_attempts
WHERE received_at <= '2026-02-28 12:00:00'
  AND (tenant_id, strftime('%Y-%m-%d %H:00:00', at)) IN (
    SELECT tenant_id, strftime('%Y-%m-%d %H:00:00', at)
    FROM card_attempts
    WHERE received_at > (SELECT watermark FROM rollup_state WHERE name = 'card_attempts_hourly')
      AND received_at <= '2026-02-28 12:00:00'
  )
GROUP BY tenant_id, hour
ON CONFLICT (tenant_id, hour) DO UPDATE
SET attempts = excluded.attempts, ok = excluded.ok, declined = excluded.declined, errors = excluded.errors,
    ok_cents = excluded.ok_cents, latency_ms_sum = excluded.latency_ms_sum;

UPDATE rollup_state SET watermark = '2026-02-28 12:00:00' WHERE name = 'card_attempts_hourly';

SELECT 'after run 1' AS stage, COUNT(*) AS hours, SUM(attempts) AS attempts FROM rollup_hourly;

-- Run 2: the late events land in hours that were already rolled up, so those hours are recomputed
INSERT INTO rollup_hourly (tenant_id, hour, attempts, ok, declined, errors, ok_cents, latency_ms_sum)
SELECT tenant_id, strftime('%Y-%m-%d %H:00:00', at) AS hour,
       COUNT(*), SUM(status = 'ok'), SUM(status = 'declined'), SUM(status = 'error'),
       SUM(CASE WHEN status = 'ok' THEN amount_cents ELSE 0 END), SUM(latency_ms)
FROM card_attempts
WHERE received_at <= '2026-03-02 08:00:00'
  AND (tenant_id, strftime('%Y-%m-%d %H:00:00', at)) IN (
    SELECT tenant_id, strftime('%Y-%m-%d %H:00:00', at)
    FROM card_attempts
    WHERE received_at > (SELECT watermark FROM rollup_state WHERE name = 'card_attempts_hourly')
      AND received_at <= '2026-03-02 08:00:00'
  )
GROUP BY tenant_id, hour
ON CONFLICT (tenant_id, hour) DO UPDATE
SET attempts = excluded.attempts, ok = excluded.ok, declined = excluded.declined, errors = excluded.errors,
    ok_cents = excluded.ok_cents, latency_ms_sum = excluded.latency_ms_sum;

UPDATE rollup_state SET watermark = '2026-03-02 08:00:00' WHERE name = 'card_attempts_hourly';

SELECT 'after run 2' AS stage, COUNT(*) AS hours, SUM(attempts) AS attempts FROM rollup_hourly;

-- 3. Days are sums of hours
CREATE TABLE rollup_daily (
  tenant_id INTEGER NOT NULL,
  day TEXT NOT NULL,
  attempts INTEGER NOT NULL,
  ok INTEGER NOT NULL,
  declined INTEGER NOT NULL,
  errors INTEGER NOT NULL,
  ok_cents INTEGER NOT NULL,
  latency_ms_sum INTEGER NOT NULL,
  PRIMARY KEY (tenant_id, day)
);

INSERT INTO rollup_daily (tenant_id, day, attempts, ok, declined, errors, ok_cents, latency_ms_sum)
SELECT tenant_id, substr(hour, 1, 10), SUM(attempts), SUM(ok), SUM(declined), SUM(errors), SUM(ok_cents), SUM(latency_ms_sum)
FROM rollup_hourly
WHERE true
GROUP BY tenant_id, substr(hour, 1, 10)
ON CONFLICT (tenant_id, day) DO UPDATE
SET attempts = excluded.attempts, ok = excluded.ok, declined = excluded.declined, errors = excluded.errors,
    ok_cents = excluded.ok_cents, latency_ms_sum = excluded.latency_ms_sum;

SELECT day, attempts, ok, ROUND(ok * 100.0 / attempts, 1) AS approval_pct, ok_cents, latency_ms_sum / attempts AS avg_latency_ms
FROM rollup_daily
WHERE tenant_id = 1
ORDER BY day;

SELECT substr(at, 1, 10) AS day, COUNT(*) AS total_events,
       SUM(received_at > datetime(at, '+1 hour')) AS late_events,
       ROUND(SUM(received_at > datetime(at, '+1 hour')) * 100.0 / COUNT(*), 1) AS late_pct
FROM card_attempts
WHERE tenant_id = 1
GROUP BY substr(at, 1, 10)
ORDER BY day;`,
      explanation:
        "Each run finds the buckets touched by events that arrived since the watermark, recomputes those buckets from every event received by the cutoff, and overwrites them, so a late event repairs an old hour instead of being missed, and running the same statement twice changes nothing. The first run only knows what had arrived by the 28th; the second also heals the hours the late events belong to, so its total equals the true count. Daily rows are sums of the additive hourly columns; approval rate and average latency are computed when read.",
      hints: [
        { id: "h1", title: "Touched buckets", content: "WHERE received_at <= <cutoff> AND (tenant_id, strftime('%Y-%m-%d %H:00:00', at)) IN (SELECT tenant_id, strftime('%Y-%m-%d %H:00:00', at) FROM card_attempts WHERE received_at > (SELECT watermark FROM rollup_state WHERE name = 'card_attempts_hourly') AND received_at <= <cutoff>) GROUP BY tenant_id, hour. Alias the bucket AS hour so ON CONFLICT (tenant_id, hour) lines up." },
        { id: "h2", title: "Overwrite, not add", content: "ON CONFLICT (tenant_id, hour) DO UPDATE SET attempts = excluded.attempts, ok = excluded.ok, declined = excluded.declined, errors = excluded.errors, ok_cents = excluded.ok_cents, latency_ms_sum = excluded.latency_ms_sum. Never 'attempts = attempts + excluded.attempts'. Then UPDATE rollup_state SET watermark = <cutoff>." },
        { id: "h3", title: "Booleans as numbers", content: "In SQLite a comparison is 0 or 1, so SUM(status = 'ok') counts the ok attempts and SUM(received_at > datetime(at, '+1 hour')) counts the late ones. Daily rows: SUM the additive columns of rollup_hourly GROUP BY tenant_id, substr(hour, 1, 10)." },
      ],
      tests: [
        {
          id: "t1",
          description: "The roll-up tables exist with a primary key per bucket and a watermark row",
          assertionCode: t`for (const c of ["tenant_id", "hour", "attempts", "ok", "declined", "errors", "ok_cents", "latency_ms_sum"]) assert(cols("rollup_hourly").includes(c), "rollup_hourly needs a column named " + c);
for (const c of ["tenant_id", "day", "attempts", "ok", "declined", "errors", "ok_cents", "latency_ms_sum"]) assert(cols("rollup_daily").includes(c), "rollup_daily needs a column named " + c);
assert(probe("INSERT INTO rollup_hourly SELECT * FROM rollup_hourly LIMIT 1") !== null, "A second row for the same tenant and hour must be refused (primary key)");
assert(probe("INSERT INTO rollup_daily SELECT * FROM rollup_daily LIMIT 1") !== null, "A second row for the same tenant and day must be refused (primary key)");
const st = one("SELECT watermark FROM rollup_state WHERE name = 'card_attempts_hourly'");
assert(st, "rollup_state needs a row named card_attempts_hourly");
assertEqual(st.watermark, "2026-03-02 08:00:00", "The watermark must end at the second cutoff");`,
        },
        {
          id: "t2",
          description: "After the second run every hour matches the raw events exactly: the late events healed the old buckets",
          assertionCode: t`const diff = num("SELECT COUNT(*) FROM (SELECT tenant_id, strftime('%Y-%m-%d %H:00:00', at) AS hour, COUNT(*) AS attempts, SUM(status = 'ok') AS ok, SUM(status = 'declined') AS declined, SUM(status = 'error') AS errors, SUM(CASE WHEN status = 'ok' THEN amount_cents ELSE 0 END) AS ok_cents, SUM(latency_ms) AS latency_ms_sum FROM card_attempts GROUP BY 1, 2 EXCEPT SELECT tenant_id, hour, attempts, ok, declined, errors, ok_cents, latency_ms_sum FROM rollup_hourly)");
assertEqual(diff, 0, "Some hours differ from a fresh aggregate of card_attempts (counted twice, or late events missed)");
assertEqual(num("SELECT COUNT(*) FROM rollup_hourly"), num("SELECT COUNT(*) FROM (SELECT 1 FROM card_attempts GROUP BY tenant_id, strftime('%Y-%m-%d %H:00:00', at))"), "One row per tenant and hour");`,
        },
        {
          id: "t3",
          description: "Run 1 saw only what had arrived by noon on the 28th; run 2 saw everything",
          assertionCode: t`const stage = (name) => { const rs = results.filter((r) => r.columns.includes("stage") && r.columns.includes("hours") && r.columns.includes("attempts") && r.rows.length === 1 && r.rows[0][r.columns.indexOf("stage")] === name).pop(); assert(rs, "Run the summary for stage '" + name + "' (stage, hours, attempts)"); return Object.fromEntries(rs.columns.map((c, i) => [c, rs.rows[0][i]])); };
const one_ = stage("after run 1");
const two_ = stage("after run 2");
assertEqual(one_.attempts, num("SELECT COUNT(*) FROM card_attempts WHERE received_at <= '2026-02-28 12:00:00'"), "After run 1 the roll-up holds exactly the events received by 2026-02-28 12:00:00");
assertEqual(two_.attempts, num("SELECT COUNT(*) FROM card_attempts WHERE received_at <= '2026-03-02 08:00:00'"), "After run 2 it holds every event received by 2026-03-02 08:00:00");
assert(two_.hours > one_.hours, "Run 2 adds the hours that came after the first cutoff");
assert(two_.attempts > one_.attempts, "Run 2 adds events");`,
        },
        {
          id: "t4",
          description: "Daily rows are sums of the hourly rows, and the daily report computes the rates on read",
          assertionCode: t`const bad = num("SELECT COUNT(*) FROM (SELECT tenant_id, substr(hour, 1, 10) AS day, SUM(attempts) AS attempts, SUM(ok) AS ok, SUM(declined) AS declined, SUM(errors) AS errors, SUM(ok_cents) AS ok_cents, SUM(latency_ms_sum) AS latency_ms_sum FROM rollup_hourly GROUP BY 1, 2 EXCEPT SELECT tenant_id, day, attempts, ok, declined, errors, ok_cents, latency_ms_sum FROM rollup_daily)");
assertEqual(bad, 0, "rollup_daily differs from the sums of rollup_hourly");
const got = data(["day", "attempts", "ok", "approval_pct", "ok_cents", "avg_latency_ms"], "Add the daily report: day, attempts, ok, approval_pct, ok_cents, avg_latency_ms");
const want = query("SELECT day, attempts, ok, ok_cents, latency_ms_sum / attempts AS avg_latency_ms, ROUND(ok * 100.0 / attempts, 1) AS approval_pct FROM rollup_daily WHERE tenant_id = 1 ORDER BY day");
assertEqual(got.length, want.length, "One row per day of tenant 1");
match(got, want, "day", ["attempts", "ok", "ok_cents", "avg_latency_ms"], "the daily report");
for (const w of want) assertClose(got.find((g) => g.day === w.day).approval_pct, w.approval_pct, 0.051, "approval_pct for " + w.day);
assert(!cols("rollup_daily").some((c) => /pct|rate|avg/.test(c)), "Store counts and sums in the roll-up, not rates or averages");`,
        },
        {
          id: "t5",
          description: "The lateness report counts events that arrive more than an hour after they happened",
          assertionCode: t`const got = data(["day", "total_events", "late_events", "late_pct"], "Add the lateness report: day, total_events, late_events, late_pct");
const want = query("SELECT substr(at, 1, 10) AS day, COUNT(*) AS total_events, SUM(received_at > datetime(at, '+1 hour')) AS late_events, ROUND(SUM(received_at > datetime(at, '+1 hour')) * 100.0 / COUNT(*), 1) AS late_pct FROM card_attempts WHERE tenant_id = 1 GROUP BY 1");
match(got, want, "day", ["total_events", "late_events"], "the lateness report");
for (const w of want) assertClose(got.find((g) => g.day === w.day).late_pct, w.late_pct, 0.051, "late_pct for " + w.day);
assert(want.reduce((a, w) => a + w.late_events, 0) > 20, "Setup data changed: there should be late events");`,
        },
      ],
      unlocks: ["ch-rollup"],
      checks: [
        {
          prompt: "Hour 14:00 averaged 200 ms over 2 attempts and 14:00's neighbour averaged 100 ms over 200 attempts. What is wrong with a daily average of `(200 + 100) / 2`?",
          question: {
            type: "choice",
            options: [
              "Nothing: it is the mean of the two",
              "It ignores the volumes: the true mean is about 101 ms, because almost all attempts were in the second hour",
              "It should be a sum, not a mean",
              "Averages cannot be computed in SQL",
            ],
            answer: 1,
          },
          explanation: "An average of averages weights an hour with 2 events the same as one with 200. Store the sum and the count and divide at read time: (2 × 200 + 200 × 100) / 202 ≈ 101.",
        },
        {
          prompt: "A late event for yesterday 14:00 arrives today. Why is recomputing that hour from raw events safer than adding 1 to the stored count?",
          question: {
            type: "choice",
            options: [
              "Recomputing is idempotent: running the job twice gives the same answer, whereas adding counts the event twice",
              "Adding is not allowed on old rows",
              "Recomputing is always faster",
              "Raw events cannot be added up",
            ],
            answer: 0,
          },
          explanation: "Jobs get retried and overlap. If the same event can be folded in twice, the table drifts. An overwrite derived from source is correct no matter how many times it runs.",
        },
      ],
    },

    // ───────────────────────────── 16 ─────────────────────────────
    {
      id: "counting-house-16-quality",
      title: "Checks and reconciliation",
      minutes: 28,
      xp: 170,
      concepts: ["data-quality checks as queries", "anti-joins", "FULL OUTER JOIN", "join fan-out", "reconciliation statuses"],
      learn: md`### Trust, then verify every night

Constraints and triggers stop the bad writes you thought of. They cannot catch a bug that writes plausible nonsense, a partner that sends garbage, or a rule nobody has imagined yet. For those you need **checks**: queries that count how many rows break an expectation, run on a schedule, each one expected to return zero.

Make every check the same shape so a dashboard can list them: a **name**, a **severity** and a **violation count**.

~~~sql
SELECT 'paid or refunded orders with no ledger entry' AS check_name, 'error' AS severity, COUNT(*) AS violations
FROM orders AS o
WHERE o.status IN ('paid', 'refunded')
  AND NOT EXISTS (SELECT 1 FROM journal_entries AS e WHERE e.ref_type = 'order' AND e.ref_id = o.order_id AND e.tenant_id = o.tenant_id)
~~~

Stack them with \`UNION ALL\`. Useful families:

- **Completeness**: every paid order has an entry (an anti-join with \`NOT EXISTS\`), every payout has a ledger entry.
- **Uniqueness**: no processor reference settled twice (\`GROUP BY … HAVING COUNT(*) > 1\`).
- **Referential and tenancy**: no line points at another tenant's account.
- **Freshness**: no drafts left open, no job stuck running past its lease.
- **Rule conformance**: every stored fee equals the 5% rule.

**Severity** is about response. An **error** means money may be wrong: stop and look now. A **warning** means a person should investigate soon. If everything is an error nobody reads them.

### Reconciliation: two records of the same truth

Your ledger is your account of what happened. The card processor's settlement file is theirs. They should agree, and you must never assume they do. **Reconciling** is matching the two by a shared key (the processor reference, per tenant) and classifying every line:

- **matched**: same reference, same amount;
- **amount_mismatch**: same reference, different amounts (a short-paid top-up);
- **not_settled_yet**: in the ledger, not in their file. Usually just timing: the processor pays out a few days late;
- **unknown_to_ledger**: in their file, not in the ledger. Money arrived that you cannot explain;
- **duplicate_settlement**: their file lists the same reference more than once.

Finding rows that exist on **only one side** needs a \`FULL OUTER JOIN\` (SQLite supports it). An \`INNER JOIN\` would silently drop exactly the rows you are hunting.

### The fan-out trap

If the processor file contains the same reference twice and you join it to the ledger directly, every ledger amount is **counted twice** and the totals look plausible. The cure is the one from Season Analytics: **aggregate each side to one row per key before joining**. Count the duplicates in the aggregate (\`COUNT(*) AS rows_seen\`), pick a single amount, then join one row to one row.

~~~sql
processor AS (
  SELECT tenant_id, processor_ref, COUNT(*) AS rows_seen, MAX(gross_cents) AS settled_cents
  FROM processor_settlements GROUP BY tenant_id, processor_ref
)
~~~

### Timing is not an error

"Not settled yet" is normal for yesterday's top-up and a problem for one that is three weeks old. Real reconciliations carry a grace window; here, your report simply labels them so a person can judge by date.

### Findings are not fixes

A reconciliation produces questions: why is this 1.00 short, who sent this payment? The answer is never an edit to history. It is an adjusting entry or a support ticket. The next lesson turns some of these findings into postings.

### Common mistakes

- \`INNER JOIN\` between the two sides.
- Joining before de-duplicating one side.
- Comparing across tenants because the join forgot \`tenant_id\`.
- Alerting on timing differences until nobody trusts the alert.`,
      mission: md`The month is almost over. Before anyone closes it, Fernhollow's finance lead wants to know whether the data can be trusted: a nightly list of checks, and a reconciliation of the ledger's card top-ups against the processor's settlement file.

The **Data quality** panel lists the checks by severity and sorts the reconciliation into matched and exceptions.`,
      tasks: [
        "Write the eight data-quality checks as one UNION ALL result: check_name, severity, violations",
        "Reconcile tenant 1's top-ups in the ledger against processor_settlements with a FULL OUTER JOIN, de-duplicated first, and classify every reference",
      ],
      starterAdd: sql`-- ── ✏️ YOUR TURN ───────────────────────────
-- Lesson 16: checks and reconciliation. processor_settlements(settlement_id, tenant_id, processor_ref, settled_on,
-- gross_cents, fee_cents, net_cents) is the processor's file. A top-up's ledger entry carries its processor reference in
-- journal_entries.external_ref (ref_type 'topup'), and its debit on the tenant's 'clearing' account is the amount.
--
-- 1. ONE query, columns check_name, severity, violations (a COUNT each), stacked with UNION ALL, these exact names:
--      'paid or refunded orders with no ledger entry'          error    orders (paid/refunded) with no journal entry of ref_type 'order'
--      'cancelled orders that reached the ledger'              error    cancelled orders that DO have an order entry
--      'top-ups with no ledger entry'                          error
--      'payouts with no ledger entry'                          error
--      'ledger lines pointing at another tenant''s account'    error    (note the doubled quote inside the string)
--      'draft entries left open'                               warning  journal_entries still in status 'draft'
--      'processor references settled more than once'           warning  (tenant_id, processor_ref) pairs with more than one settlement row
--      'orders whose fee breaks the 5% rule'                   warning  fee_cents <> (gross_cents * 500 + 5000) / 10000
--
-- 2. Reconcile tenant 1 (tenant_id = 1). Build two one-row-per-reference CTEs first:
--      ledger:    external_ref AS processor_ref, SUM of the clearing debit AS ledger_cents (posted top-up entries)
--      processor: processor_ref, COUNT(*) AS rows_seen, MAX(gross_cents) AS settled_cents
--    FULL OUTER JOIN them on processor_ref and return processor_ref, ledger_cents, settled_cents, status with status:
--      'unknown_to_ledger'    not in the ledger
--      'not_settled_yet'      in the ledger but not in the file
--      'duplicate_settlement' the file lists it more than once
--      'amount_mismatch'      amounts differ
--      'matched'              otherwise
--    Include every reference, matched ones too, ordered by status then processor_ref.
`,
      solutionAdd: sql`-- 1. The nightly checks
SELECT 'paid or refunded orders with no ledger entry' AS check_name, 'error' AS severity, COUNT(*) AS violations
FROM orders AS o
WHERE o.status IN ('paid', 'refunded')
  AND NOT EXISTS (SELECT 1 FROM journal_entries AS e WHERE e.tenant_id = o.tenant_id AND e.ref_type = 'order' AND e.ref_id = o.order_id)
UNION ALL
SELECT 'cancelled orders that reached the ledger', 'error', COUNT(*)
FROM orders AS o
WHERE o.status = 'cancelled'
  AND EXISTS (SELECT 1 FROM journal_entries AS e WHERE e.tenant_id = o.tenant_id AND e.ref_type = 'order' AND e.ref_id = o.order_id)
UNION ALL
SELECT 'top-ups with no ledger entry', 'error', COUNT(*)
FROM topups AS t
WHERE NOT EXISTS (SELECT 1 FROM journal_entries AS e WHERE e.tenant_id = t.tenant_id AND e.ref_type = 'topup' AND e.ref_id = t.topup_id)
UNION ALL
SELECT 'payouts with no ledger entry', 'error', COUNT(*)
FROM payouts AS p
WHERE NOT EXISTS (SELECT 1 FROM journal_entries AS e WHERE e.tenant_id = p.tenant_id AND e.ref_type = 'payout' AND e.ref_id = p.payout_id)
UNION ALL
SELECT 'ledger lines pointing at another tenant''s account', 'error', COUNT(*)
FROM journal_lines AS l
JOIN journal_entries AS e ON e.entry_id = l.entry_id
JOIN accounts AS a ON a.account_id = l.account_id
WHERE a.tenant_id <> e.tenant_id
UNION ALL
SELECT 'draft entries left open', 'warning', COUNT(*)
FROM journal_entries
WHERE status = 'draft'
UNION ALL
SELECT 'processor references settled more than once', 'warning', COUNT(*)
FROM (SELECT 1 FROM processor_settlements GROUP BY tenant_id, processor_ref HAVING COUNT(*) > 1)
UNION ALL
SELECT 'orders whose fee breaks the 5% rule', 'warning', COUNT(*)
FROM orders
WHERE fee_cents <> (gross_cents * 500 + 5000) / 10000;

-- 2. Reconciliation: ledger against the processor's file
WITH ledger AS (
  SELECT e.tenant_id, e.external_ref AS processor_ref, SUM(l.debit_cents) AS ledger_cents
  FROM journal_entries AS e
  JOIN journal_lines AS l ON l.entry_id = e.entry_id
  JOIN accounts AS a ON a.account_id = l.account_id AND a.role = 'clearing'
  WHERE e.status = 'posted' AND e.ref_type = 'topup' AND e.tenant_id = 1
  GROUP BY e.tenant_id, e.external_ref
), processor AS (
  SELECT tenant_id, processor_ref, COUNT(*) AS rows_seen, MAX(gross_cents) AS settled_cents
  FROM processor_settlements
  WHERE tenant_id = 1
  GROUP BY tenant_id, processor_ref
)
SELECT
  COALESCE(l.processor_ref, p.processor_ref) AS processor_ref,
  l.ledger_cents,
  p.settled_cents,
  CASE
    WHEN l.processor_ref IS NULL THEN 'unknown_to_ledger'
    WHEN p.processor_ref IS NULL THEN 'not_settled_yet'
    WHEN p.rows_seen > 1 THEN 'duplicate_settlement'
    WHEN l.ledger_cents <> p.settled_cents THEN 'amount_mismatch'
    ELSE 'matched'
  END AS status
FROM ledger AS l
FULL OUTER JOIN processor AS p ON p.tenant_id = l.tenant_id AND p.processor_ref = l.processor_ref
ORDER BY status, processor_ref;`,
      explanation:
        "Every check has the same three columns so a dashboard can list them; anti-joins (NOT EXISTS) find missing rows and GROUP BY … HAVING finds duplicates. The reconciliation first reduces each side to exactly one row per processor reference (counting how many settlement rows the file had), then FULL OUTER JOINs them, so references that exist on only one side survive, and the duplicate in the file cannot double the ledger amount. The CASE order matters: unknown and not-yet-settled are decided before comparing amounts.",
      hints: [
        { id: "h1", title: "Count with anti-joins", content: "Missing rows: SELECT … COUNT(*) FROM orders o WHERE o.status IN ('paid','refunded') AND NOT EXISTS (SELECT 1 FROM journal_entries e WHERE e.tenant_id = o.tenant_id AND e.ref_type = 'order' AND e.ref_id = o.order_id). Duplicates: SELECT COUNT(*) FROM (SELECT 1 FROM processor_settlements GROUP BY tenant_id, processor_ref HAVING COUNT(*) > 1). Inside a quoted name, write a quote twice: 'tenant''s'." },
        { id: "h2", title: "One row per key, then join", content: "WITH ledger AS (… GROUP BY e.external_ref), processor AS (SELECT tenant_id, processor_ref, COUNT(*) AS rows_seen, MAX(gross_cents) AS settled_cents FROM processor_settlements WHERE tenant_id = 1 GROUP BY tenant_id, processor_ref). Joining processor_settlements directly would double the ledger amount for the duplicated reference." },
        { id: "h3", title: "Both sides", content: "FROM ledger l FULL OUTER JOIN processor p ON p.tenant_id = l.tenant_id AND p.processor_ref = l.processor_ref. The reference to show is COALESCE(l.processor_ref, p.processor_ref). Decide the status with a CASE in this order: ledger missing, processor missing, rows_seen > 1, amounts differ, else matched." },
      ],
      tests: [
        {
          id: "t1",
          description: "All eight checks are listed with the agreed severity and the right violation counts",
          assertionCode: t`const got = data(["check_name", "severity", "violations"], "Add the checks: check_name, severity, violations");
const dupRefs = num("SELECT COUNT(*) FROM (SELECT 1 FROM processor_settlements GROUP BY tenant_id, processor_ref HAVING COUNT(*) > 1)");
const feeBreaks = num("SELECT COUNT(*) FROM orders WHERE fee_cents <> (gross_cents * 500 + 5000) / 10000");
assert(dupRefs === 1 && feeBreaks > 0, "Setup data changed");
const want = [
  ["paid or refunded orders with no ledger entry", "error", 0],
  ["cancelled orders that reached the ledger", "error", 0],
  ["top-ups with no ledger entry", "error", 0],
  ["payouts with no ledger entry", "error", 0],
  ["ledger lines pointing at another tenant's account", "error", 0],
  ["draft entries left open", "warning", 0],
  ["processor references settled more than once", "warning", dupRefs],
  ["orders whose fee breaks the 5% rule", "warning", feeBreaks],
];
assertEqual(got.length, want.length, "Eight checks");
for (const [name, severity, violations] of want) {
  const g = got.find((r) => r.check_name === name);
  assert(g, "Missing the check named '" + name + "'");
  assertEqual(g.severity, severity, "severity of '" + name + "'");
  assertEqual(g.violations, violations, "violations for '" + name + "'");
}`,
        },
        {
          id: "t2",
          description: "The reconciliation classifies every processor reference of tenant 1 without double counting",
          assertionCode: t`const got = data(["processor_ref", "ledger_cents", "settled_cents", "status"], "Add the reconciliation: processor_ref, ledger_cents, settled_cents, status", /full\s+(outer\s+)?join/);
const ledger = new Map(query("SELECT e.external_ref AS r, SUM(l.debit_cents) AS c FROM journal_entries e JOIN journal_lines l ON l.entry_id = e.entry_id JOIN accounts a ON a.account_id = l.account_id AND a.role = 'clearing' WHERE e.status = 'posted' AND e.ref_type = 'topup' AND e.tenant_id = 1 GROUP BY e.external_ref").map((x) => [x.r, x.c]));
const proc = new Map(query("SELECT processor_ref AS r, COUNT(*) AS n, MAX(gross_cents) AS g FROM processor_settlements WHERE tenant_id = 1 GROUP BY processor_ref").map((x) => [x.r, x]));
const refs = [...new Set([...ledger.keys(), ...proc.keys()])];
const want = refs.map((r) => {
  const l = ledger.has(r) ? ledger.get(r) : null;
  const p = proc.get(r);
  const s = p ? p.g : null;
  const status = l === null ? "unknown_to_ledger" : !p ? "not_settled_yet" : p.n > 1 ? "duplicate_settlement" : l !== s ? "amount_mismatch" : "matched";
  return { processor_ref: r, ledger_cents: l, settled_cents: s, status };
});
assertEqual(got.length, want.length, "One row per processor reference seen on either side (including the matched ones)");
match(got, want, "processor_ref", ["ledger_cents", "settled_cents", "status"], "the reconciliation");
const count = (st) => got.filter((g) => g.status === st).length;
assertEqual([count("amount_mismatch"), count("duplicate_settlement"), count("unknown_to_ledger")], [1, 1, 1], "One short-paid top-up, one duplicated settlement and one unknown payment");
assert(count("not_settled_yet") === 3, "Three recent top-ups have not settled yet");
const order = got.map((g) => g.status + "|" + g.processor_ref);
assertEqual(order, [...order].sort(), "Order by status, then processor_ref");`,
        },
      ],
      unlocks: ["ch-quality"],
      checks: [
        {
          prompt: "Why does the reconciliation use a FULL OUTER JOIN instead of an INNER JOIN?",
          question: {
            type: "choice",
            options: [
              "The exceptions are exactly the references that exist on only one side, and an INNER JOIN drops them",
              "FULL OUTER JOIN is faster",
              "INNER JOIN cannot compare amounts",
              "SQLite has no INNER JOIN on text keys",
            ],
            answer: 0,
          },
          explanation: "Matching rows are the boring ones. Unknown payments and top-ups that never settled appear on one side only, and only an outer join keeps them.",
        },
        {
          prompt: "The settlement file lists one reference twice, and you join it directly to the ledger. What happens to that top-up's ledger amount in the join result?",
          question: {
            type: "choice",
            options: [
              "It appears once, correctly",
              "It appears twice, so a sum over the join doubles it",
              "The join fails with an error",
              "It becomes NULL",
            ],
            answer: 1,
          },
          explanation: "A one-to-many join repeats the ledger row once per matching settlement row. Aggregate the many side to one row per key first, and keep the count of duplicates as a column.",
        },
      ],
    },
  ],
};
