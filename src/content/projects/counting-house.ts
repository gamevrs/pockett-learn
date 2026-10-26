import type { Project } from "@/engine/types";
import { buildSetup } from "./counting-house/seed.ts";
import { chapter1 } from "./counting-house/ch1.ts";
import { chapter2 } from "./counting-house/ch2.ts";
import { chapter3 } from "./counting-house/ch3.ts";
import { chapter4 } from "./counting-house/ch4.ts";
import { chapter5 } from "./counting-house/ch5.ts";

/**
 * Counting House: the data core of a community marketplace, built one production habit at a time.
 * The learner is the data engineer for Fernhollow Co-op Market (three tenants share the platform).
 * One growing query.sql file builds the ledger, the retry-proof payment paths, the queue, the audit
 * trail and the month-end close.
 *
 * The hidden `setup` (counting-house/seed.ts) builds the platform database from a seeded simulation:
 * tenants, a chart of accounts, members, two months of orders and top-ups, a processor settlement
 * file, a stream of payout requests (with client retries), a job-queue snapshot and card traffic.
 * The scene (src/scenes/counting-house) gets every result set the file produced and picks one per
 * panel by the columns it returns, so a panel lights up when the learner's query has the shape the
 * lesson asks for:
 *
 *   ch-trial       code, account, kind, debit_cents, credit_cents, balance_cents   (+ total_debits, total_credits, balanced)
 *   ch-posting     source, entries, lines, total_cents
 *   ch-guards      rule, violations
 *   ch-money       order_id, stored_fee_cents, correct_fee_cents · orders_wrong, shortfall_cents ·
 *                  seller, weight_cents, share_cents · currency, amount_cents, display
 *   ch-idem        req_id, idem_key, seller_id, amount_cents, outcome · outcome, requests, cents
 *   ch-outbox      event_id, topic, aggregate_id, status (+ created_at, sent_at) · claim: event_id, topic, aggregate_id, claimed_by
 *   ch-queue       job_id, kind, state (+ priority, attempts, max_attempts, run_at, locked_by, lease_until, last_error)
 *   ch-dead        job_id, kind, attempts, max_attempts, last_error
 *   ch-audit       audit_id, at, actor, table_name, row_id, field, old_value, new_value
 *   ch-retention   store, purged, kept
 *   ch-tenants     as_tenant, entries, lines, debits_cents (one per tenant) · lookup, rows_returned
 *   ch-plans       EXPLAIN QUERY PLAN results (id, parent, notused, detail), paired by statement
 *   ch-pages       entry_id, posted_at, memo, line_count, total_cents · page, entry_id, posted_at, memo
 *   ch-statement   posted_at, memo, debit_cents, credit_cents, balance_cents · month, fees_cents, prev_fees_cents, change_pct
 *   ch-rollup      stage, hours, attempts · day, attempts, ok, approval_pct, ok_cents, avg_latency_ms · day, total_events, late_events, late_pct
 *   ch-quality     check_name, severity, violations · processor_ref, ledger_cents, settled_cents, status
 *   ch-migrations  version, name, phase, applied_at · remaining, backfilled
 *   ch-close       proof, expected_cents, actual_cents, ok
 */
export const countingHouse: Project = {
  slug: "counting-house",
  language: "sql",
  setup: buildSetup(),
  prerequisites: ["schema-studio"],
  title: "Counting House",
  tagline: "Engineer a marketplace's money: ledgers, safe retries, queues, audit trails and a month-end close.",
  pitch:
    "Schema Studio taught you to design a safe database. Counting House is where that database has to survive a busy Monday. You are the data engineer for Fernhollow Co-op Market, a community marketplace where members top up wallets, buy from growers and bakers, and sellers get paid out. Each lesson adds one production habit to a single SQL file: a double-entry ledger that refuses to go out of balance, payouts that survive client retries, a transactional outbox, a job queue with leases and dead letters, an audit trail, tenant isolation, indexes you can prove, and reports that close the month. By the end the console shows the books balancing.",
  emoji: "🏛️",
  difficulty: "Professional",
  hours: 8,
  sceneId: "counting-house",
  accent: { from: "#a3e635", to: "#3f6212" },
  controls: [],
  skills: [
    "double-entry ledger",
    "triggers as invariants",
    "integer money",
    "idempotency keys",
    "outbox pattern",
    "job queues & leases",
    "audit logs",
    "soft delete & retention",
    "multi-tenant isolation",
    "query plans & keyset paging",
    "window-function statements",
    "incremental roll-ups",
    "reconciliation",
    "expand–contract migrations",
  ],
  features: [
    { id: "ch-trial", title: "Trial balance", blurb: "Every account's debits and credits, with the balance beam that glows when they match.", emoji: "⚖️" },
    { id: "ch-posting", title: "Posting run", blurb: "Orders and top-ups turned into balanced journal entries in bulk.", emoji: "📥" },
    { id: "ch-guards", title: "Invariant guards", blurb: "The rules the database enforces on its own, and the violations they leave at zero.", emoji: "🛡️" },
    { id: "ch-money", title: "Money desk", blurb: "Integer cents: fee audits, fair splits and amounts formatted per currency.", emoji: "💱" },
    { id: "ch-idem", title: "Idempotency desk", blurb: "A stream of retried requests: executed once, replayed, or rejected as a conflict.", emoji: "🔁" },
    { id: "ch-outbox", title: "Outbox relay", blurb: "Events written with the business row and relayed in order.", emoji: "📤" },
    { id: "ch-queue", title: "Job queue", blurb: "Queued, running, done and dead jobs with leases and attempts.", emoji: "🧾" },
    { id: "ch-dead", title: "Dead letters", blurb: "Poison jobs parked with their last error, ready to inspect or replay.", emoji: "☠️" },
    { id: "ch-audit", title: "Audit trail", blurb: "Who changed what, and when, with before and after values.", emoji: "🕵️" },
    { id: "ch-retention", title: "Retention sweep", blurb: "What was purged, what was kept, and a log of every sweep.", emoji: "🧹" },
    { id: "ch-tenants", title: "Tenant isolation", blurb: "Switch tenants and prove each one sees only its own rows.", emoji: "🏘️" },
    { id: "ch-plans", title: "Query plans", blurb: "EXPLAIN QUERY PLAN before and after each index, side by side.", emoji: "🔍" },
    { id: "ch-pages", title: "Pages without N+1", blurb: "One set-based query, then keyset pages that never skip or repeat a row.", emoji: "📄" },
    { id: "ch-statement", title: "Statements & trends", blurb: "A running-balance statement and month-over-month movement.", emoji: "📈" },
    { id: "ch-rollup", title: "Roll-ups & late data", blurb: "Hourly and daily roll-ups that heal when late events arrive.", emoji: "⏱️" },
    { id: "ch-quality", title: "Data quality", blurb: "Invariant checks and a reconciliation of the ledger against the processor.", emoji: "🧪" },
    { id: "ch-migrations", title: "Safe migrations", blurb: "Expand, backfill in batches, contract: a versioned history with rollbacks.", emoji: "🚚" },
    { id: "ch-close", title: "Month-end close", blurb: "Settle, lock the period and prove the books balance.", emoji: "🔒" },
  ],
  chapters: [chapter1, chapter2, chapter3, chapter4, chapter5],
};
