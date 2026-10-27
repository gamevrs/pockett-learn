import type { Chapter } from "@/engine/types";
import { md, sql, t } from "./util.ts";

/**
 * Chapter 2: safe to retry.
 * Idempotency keys, the transactional outbox, a leased job queue with retries and dead letters,
 * and an audit trail: the machinery that makes a payment system survive failure.
 */
export const chapter2: Chapter = {
  id: "safe-to-retry",
  title: "Safe to retry",
  blurb: "Retried requests, reliable events, leased jobs and an audit trail: failure-proofing in SQL.",
  lessons: [
    // ───────────────────────────── 5 ─────────────────────────────
    {
      id: "counting-house-5-idempotency",
      title: "Retries that cannot double-pay",
      minutes: 28,
      xp: 160,
      concepts: ["idempotency keys", "INSERT … ON CONFLICT DO NOTHING", "request fingerprints", "claim then act", "one write path"],
      learn: md`### Retries are normal; duplicates are a bug

Networks lose *responses* as often as requests. A seller taps "Pay me $41.00". The server pays, the reply is lost, the app times out and sends the same request again. Without protection the seller is paid twice. Phones, load balancers, queues and well-meaning client libraries all retry, so design every write on the assumption that **each request will arrive more than once**.

### A key that names the intent

The client invents one unique **idempotency key** per *intent* (one tap of the button, not one network attempt) and sends it with every attempt. The server records the first outcome for each key and answers repeats from the record. For a request with key K and body B there are exactly three cases:

- **K is new**: execute it, and store the result under K.
- **K is known and B is the same**: it is a retry. **Replay** the stored result and do no work.
- **K is known but B is different**: the client has reused a key for a different intent. Refuse loudly. Guessing which one it "really" meant is how money moves wrongly.

To tell "same" from "different" you keep a **fingerprint** (a hash) of the request body next to the key. The gateway computes it; the database just compares.

### Claim first, then act

The order of operations is the whole trick. Do not *look* for the key and then insert it: two simultaneous attempts both look, both find nothing, both insert work. Instead **claim the key with one atomic statement** and let the primary key decide who won:

~~~sql
INSERT INTO idempotency_keys (tenant_id, idem_key, request_hash, first_req_id, created_at)
VALUES (1, 'po-7-0201', 'be37a400b', 1, '2026-02-01 10:06:50')
ON CONFLICT (tenant_id, idem_key) DO NOTHING
RETURNING idem_key;
~~~

One row back means you own the key: go and do the work. No rows back means somebody else got there first: read their stored result (replay) or compare fingerprints (conflict). The key is scoped by tenant, because two co-ops may well generate the same string.

### What the table holds

The key (tenant plus string), the request fingerprint, the id of the first request, a state (\`in_progress\` while the owner works, \`done\` afterwards), the stored response as JSON, and a timestamp. A key stuck in \`in_progress\` means the owner died; the next two lessons give you leases to deal with that.

Keys are **not** forever: they expire (lesson 10). So the payout also carries the key and is \`UNIQUE (tenant_id, idem_key)\` itself. Even if the keys table were purged, a late retry still cannot create a second payout. Notice there is deliberately no foreign key from payouts to keys: a cache that expires must not be pinned by the record it protects.

### One write path

A payout moves money, so it must always reach the ledger. Instead of trusting every caller to post the entry afterwards, hang an \`AFTER INSERT\` trigger on \`payouts\` that creates the draft entry, its two lines (debit the seller's payable, credit the bank) and posts it. Now there is exactly one way to pay a seller. If the posting gate refuses (the payable would go negative), the whole \`INSERT\` fails and no payout row exists: a statement is atomic. The cost is that this logic is invisible to someone reading application code, so use it sparingly and name it clearly.

### Doing a whole stream at once

\`INSERT … SELECT … ORDER BY req_id ON CONFLICT … DO NOTHING\` processes rows in order, so the **first** request for each key wins. One parsing wrinkle: when an INSERT takes its rows from a SELECT, SQLite wants a \`WHERE\` before \`ON CONFLICT\` (write \`WHERE true\` if you have no condition).

### Common mistakes

- A new key for every *attempt*. That is a retry button that double-pays.
- No fingerprint. A mutated retry silently "succeeds" with the old result, and the client believes it paid $75 when it paid $41.
- Check-then-insert. It works in testing and fails under load, which is the only time it matters.
- Keeping the response only in memory. After a restart, retries re-execute.`,
      mission: md`Sellers request payouts through an API, and the mobile app retries whenever the network hiccups. Last month **29 requests** arrived, but there were only **13 real intents** behind them. Two clients even reused a key for a different amount.

Build the idempotency layer: claim each key once, pay each intent once, store the responses, and then classify every request as executed, replayed or conflict. The **Idempotency desk** shows the stream, and how much money a missing key would have double-paid.`,
      tasks: [
        "Create idempotency_keys (primary key on tenant and key) and payouts (unique per tenant and key)",
        "Add the trigger that posts every new payout to the ledger: Dr the seller's payable, Cr the bank",
        "Claim keys from payout_requests (first request wins), pay each claimed key once, and store each response on its key",
        "Classify all 29 requests as executed, replayed or conflict, then summarise by outcome",
        "Show a second payout for an already-used key being refused (-- expect error)",
      ],
      starterAdd: sql`-- ── ✏️ YOUR TURN ───────────────────────────
-- Lesson 5: retries that cannot double-pay.
-- payout_requests is the API's request log (req_id, tenant_id, idem_key, seller_id, amount_cents, body_hash, requested_at).
--
-- 1. Create the tables.
--    idempotency_keys: tenant_id INTEGER NOT NULL (references tenants), idem_key TEXT NOT NULL, request_hash TEXT NOT NULL,
--      first_req_id INTEGER NOT NULL, state TEXT NOT NULL DEFAULT 'in_progress' ('in_progress' or 'done'),
--      response_json TEXT, created_at TEXT NOT NULL, PRIMARY KEY (tenant_id, idem_key)
--    payouts: payout_id INTEGER PRIMARY KEY, tenant_id INTEGER NOT NULL, seller_id INTEGER NOT NULL (references members),
--      amount_cents INTEGER NOT NULL (> 0), idem_key TEXT NOT NULL, created_at TEXT NOT NULL, UNIQUE (tenant_id, idem_key)
--      (no foreign key to idempotency_keys: keys expire, payouts do not)
--
-- 2. trg_payout_posts: AFTER INSERT ON payouts, create the ledger entry (ref_type 'payout', ref_id = the payout id,
--    memo 'Payout #<id>', posted_at = created_at), its two lines (Dr the seller's 'payable' account, Cr the tenant's 'bank'
--    account, both for amount_cents) and post it. Look the entry up by tenant_id + ref_type + ref_id.
--
-- 3. Run the stream:
--    a) claim keys: INSERT INTO idempotency_keys ... SELECT from payout_requests ORDER BY req_id ... ON CONFLICT DO NOTHING
--       (request_hash = body_hash, first_req_id = req_id, created_at = requested_at; remember WHERE true)
--    b) pay: INSERT INTO payouts for each key that has no payout yet, using that key's FIRST request
--    c) store the response: set state 'done' and response_json = json_object('payout_id', ..., 'status', 'created', 'amount_cents', ...)
--       on every key (UPDATE ... FROM payouts)
--
-- 4. Classify every request, ordered by req_id:
--    a) req_id, idem_key, seller_id, amount_cents, outcome
--       outcome: 'executed' for the request that claimed the key, 'replayed' for later ones with the same body_hash,
--       'conflict' for later ones with a different body_hash
--    b) outcome, requests, cents: how many requests and how many cents per outcome, ordered by outcome
--
-- 5. The belt and braces: under a comment line  -- expect error  INSERT a second payout for tenant 1 with
--    idem_key 'po-7-0201' (any seller and amount). The UNIQUE (tenant_id, idem_key) must refuse it.
`,
      solutionAdd: sql`-- The key table and the payouts
CREATE TABLE idempotency_keys (
  tenant_id INTEGER NOT NULL REFERENCES tenants (tenant_id),
  idem_key TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  first_req_id INTEGER NOT NULL,
  state TEXT NOT NULL DEFAULT 'in_progress' CHECK (state IN ('in_progress', 'done')),
  response_json TEXT,
  created_at TEXT NOT NULL,
  PRIMARY KEY (tenant_id, idem_key)
);

CREATE TABLE payouts (
  payout_id INTEGER PRIMARY KEY,
  tenant_id INTEGER NOT NULL,
  seller_id INTEGER NOT NULL REFERENCES members (member_id),
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  idem_key TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (tenant_id, idem_key)
);

-- One write path: a payout is always a ledger entry
CREATE TRIGGER trg_payout_posts
AFTER INSERT ON payouts
BEGIN
  INSERT INTO journal_entries (tenant_id, posted_at, memo, ref_type, ref_id)
  VALUES (NEW.tenant_id, NEW.created_at, 'Payout #' || NEW.payout_id, 'payout', NEW.payout_id);

  INSERT INTO journal_lines (entry_id, account_id, debit_cents, credit_cents)
  SELECT e.entry_id, a.account_id, NEW.amount_cents, 0
  FROM journal_entries AS e, accounts AS a
  WHERE e.tenant_id = NEW.tenant_id AND e.ref_type = 'payout' AND e.ref_id = NEW.payout_id
    AND a.tenant_id = NEW.tenant_id AND a.role = 'payable' AND a.owner_member_id = NEW.seller_id
  UNION ALL
  SELECT e.entry_id, a.account_id, 0, NEW.amount_cents
  FROM journal_entries AS e, accounts AS a
  WHERE e.tenant_id = NEW.tenant_id AND e.ref_type = 'payout' AND e.ref_id = NEW.payout_id
    AND a.tenant_id = NEW.tenant_id AND a.role = 'bank';

  UPDATE journal_entries SET status = 'posted'
  WHERE tenant_id = NEW.tenant_id AND ref_type = 'payout' AND ref_id = NEW.payout_id;
END;

-- Claim: the first request for each key wins
INSERT INTO idempotency_keys (tenant_id, idem_key, request_hash, first_req_id, created_at)
SELECT tenant_id, idem_key, body_hash, req_id, requested_at
FROM payout_requests
WHERE true
ORDER BY req_id
ON CONFLICT (tenant_id, idem_key) DO NOTHING;

-- Act: one payout per claimed key, from that key's first request
INSERT INTO payouts (tenant_id, seller_id, amount_cents, idem_key, created_at)
SELECT r.tenant_id, r.seller_id, r.amount_cents, r.idem_key, r.requested_at
FROM idempotency_keys AS k
JOIN payout_requests AS r ON r.req_id = k.first_req_id
WHERE NOT EXISTS (SELECT 1 FROM payouts AS p WHERE p.tenant_id = k.tenant_id AND p.idem_key = k.idem_key)
ORDER BY r.req_id;

-- Remember the answer so retries can be replayed
UPDATE idempotency_keys
SET state = 'done',
    response_json = json_object('payout_id', p.payout_id, 'status', 'created', 'amount_cents', p.amount_cents)
FROM payouts AS p
WHERE p.tenant_id = idempotency_keys.tenant_id AND p.idem_key = idempotency_keys.idem_key;

-- What happened to each request?
SELECT
  r.req_id,
  r.idem_key,
  r.seller_id,
  r.amount_cents,
  CASE
    WHEN r.req_id = k.first_req_id THEN 'executed'
    WHEN r.body_hash = k.request_hash THEN 'replayed'
    ELSE 'conflict'
  END AS outcome
FROM payout_requests AS r
JOIN idempotency_keys AS k ON k.tenant_id = r.tenant_id AND k.idem_key = r.idem_key
ORDER BY r.req_id;

SELECT outcome, COUNT(*) AS requests, SUM(amount_cents) AS cents
FROM (
  SELECT r.amount_cents,
         CASE WHEN r.req_id = k.first_req_id THEN 'executed' WHEN r.body_hash = k.request_hash THEN 'replayed' ELSE 'conflict' END AS outcome
  FROM payout_requests AS r
  JOIN idempotency_keys AS k ON k.tenant_id = r.tenant_id AND k.idem_key = r.idem_key
)
GROUP BY outcome
ORDER BY outcome;

-- Even a buggy caller cannot pay the same key twice
-- expect error
INSERT INTO payouts (tenant_id, seller_id, amount_cents, idem_key, created_at)
VALUES (1, (SELECT member_id FROM members WHERE handle = 'marlowe'), 4100, 'po-7-0201', '2026-03-02 09:00:00');`,
      explanation:
        "The primary key on (tenant_id, idem_key) is the referee: a claim is an INSERT … ON CONFLICT DO NOTHING, and processing requests in req_id order means the first request for each key owns it. Payments are created from each key's first request only, so thirteen intents become thirteen payouts however many retries arrived, and the trigger turns every payout into a posted ledger entry in the same statement. Comparing a later request's body_hash to the key's stored request_hash separates harmless replays from conflicts, and the replayed cents are exactly the money a missing key would have double-paid.",
      hints: [
        { id: "h1", title: "Claim in one statement", content: "INSERT INTO idempotency_keys (tenant_id, idem_key, request_hash, first_req_id, created_at) SELECT tenant_id, idem_key, body_hash, req_id, requested_at FROM payout_requests WHERE true ORDER BY req_id ON CONFLICT (tenant_id, idem_key) DO NOTHING; The WHERE true stops SQLite reading ON as part of a join." },
        { id: "h2", title: "Trigger body", content: "Inside the trigger: INSERT the draft entry with VALUES (NEW.tenant_id, NEW.created_at, 'Payout #' || NEW.payout_id, 'payout', NEW.payout_id); then INSERT INTO journal_lines … SELECT e.entry_id, a.account_id, … FROM journal_entries e, accounts a WHERE e.ref_id = NEW.payout_id … (UNION ALL for the second line); then UPDATE journal_entries SET status = 'posted' WHERE the same tenant/ref." },
        { id: "h3", title: "Pay and classify", content: "Pay: SELECT from idempotency_keys k JOIN payout_requests r ON r.req_id = k.first_req_id WHERE NOT EXISTS (a payout with that tenant and key). Store: UPDATE idempotency_keys SET state = 'done', response_json = json_object(…) FROM payouts p WHERE p.tenant_id = idempotency_keys.tenant_id AND p.idem_key = idempotency_keys.idem_key. Classify: CASE WHEN r.req_id = k.first_req_id THEN 'executed' WHEN r.body_hash = k.request_hash THEN 'replayed' ELSE 'conflict' END." },
      ],
      tests: [
        {
          id: "t1",
          description: "Both tables exist and refuse a second claim, a second payout, and a bad amount",
          assertionCode: t`for (const c of ["tenant_id", "idem_key", "request_hash", "first_req_id", "state", "response_json", "created_at"]) assert(cols("idempotency_keys").includes(c), "idempotency_keys needs a column named " + c);
for (const c of ["payout_id", "tenant_id", "seller_id", "amount_cents", "idem_key", "created_at"]) assert(cols("payouts").includes(c), "payouts needs a column named " + c);
assert(probe("INSERT INTO idempotency_keys (tenant_id, idem_key, request_hash, first_req_id, created_at) SELECT tenant_id, idem_key, 'x', 1, created_at FROM idempotency_keys LIMIT 1") !== null, "Claiming the same key twice in one tenant must be refused (primary key on tenant_id + idem_key)");
assertEqual(probe("INSERT INTO idempotency_keys (tenant_id, idem_key, request_hash, first_req_id, created_at) SELECT 2, idem_key, 'x', 1, created_at FROM idempotency_keys WHERE tenant_id = 1 LIMIT 1"), null, "The same key string in another tenant is a different key");
assert(probe("INSERT INTO payouts (tenant_id, seller_id, amount_cents, idem_key, created_at) SELECT tenant_id, seller_id, amount_cents, idem_key, created_at FROM payouts LIMIT 1") !== null, "A second payout for the same tenant and key must be refused");
assert(probe("INSERT INTO payouts (tenant_id, seller_id, amount_cents, idem_key, created_at) VALUES (1, 7, 0, 'zero-probe', '2026-03-02 09:00:00')") !== null, "A payout of 0 cents must be refused");
assertEqual(accepted().length, 0, "A statement under -- expect error was accepted: a second payout for the same key got in");
assert(refused(/UNIQUE constraint failed: payouts/).length >= 1, "Add an INSERT of a second payout for key 'po-7-0201' under -- expect error: the unique constraint should refuse it");`,
        },
        {
          id: "t2",
          description: "Each of the 13 intents claimed its key once, on its first request",
          assertionCode: t`const intents = num("SELECT COUNT(*) FROM (SELECT 1 FROM payout_requests GROUP BY tenant_id, idem_key)");
assertEqual(num("SELECT COUNT(*) FROM idempotency_keys"), intents, "One key row per distinct (tenant, key) in payout_requests");
const bad = num("SELECT COUNT(*) FROM idempotency_keys k WHERE k.first_req_id <> (SELECT MIN(req_id) FROM payout_requests r WHERE r.tenant_id = k.tenant_id AND r.idem_key = k.idem_key) OR k.request_hash <> (SELECT body_hash FROM payout_requests r WHERE r.req_id = k.first_req_id)");
assertEqual(bad, 0, "Every key must be owned by its first request (lowest req_id) and keep that request's body_hash");`,
        },
        {
          id: "t3",
          description: "One payout per intent, using the first request's seller, amount and time, and conflicts never pay",
          assertionCode: t`const intents = num("SELECT COUNT(*) FROM idempotency_keys");
assertEqual(num("SELECT COUNT(*) FROM payouts"), intents, "Exactly one payout per key");
const good = num("SELECT COUNT(*) FROM payouts p JOIN idempotency_keys k ON k.tenant_id = p.tenant_id AND k.idem_key = p.idem_key JOIN payout_requests r ON r.req_id = k.first_req_id WHERE p.seller_id = r.seller_id AND p.amount_cents = r.amount_cents AND p.created_at = r.requested_at");
assertEqual(good, intents, "Each payout should copy seller_id, amount_cents and requested_at from the key's first request");
const conflictMoney = num("SELECT COUNT(*) FROM payouts p JOIN payout_requests r ON r.tenant_id = p.tenant_id AND r.idem_key = p.idem_key AND r.amount_cents = p.amount_cents WHERE r.body_hash <> (SELECT request_hash FROM idempotency_keys k WHERE k.tenant_id = p.tenant_id AND k.idem_key = p.idem_key)");
assertEqual(conflictMoney, 0, "A conflicting request (same key, different body) must never be what gets paid");`,
        },
        {
          id: "t4",
          description: "Every payout is a posted ledger entry, born with the payout, and an overdrawing payout is refused whole",
          assertionCode: t`const n = num("SELECT COUNT(*) FROM payouts");
assertEqual(num("SELECT COUNT(*) FROM journal_entries WHERE ref_type = 'payout' AND status = 'posted'"), n, "One posted ledger entry per payout");
const bad = num("SELECT COUNT(*) FROM payouts p JOIN journal_entries e ON e.tenant_id = p.tenant_id AND e.ref_type = 'payout' AND e.ref_id = p.payout_id WHERE e.posted_at <> p.created_at OR (SELECT SUM(l.debit_cents) FROM journal_lines l JOIN accounts a ON a.account_id = l.account_id WHERE l.entry_id = e.entry_id AND a.role = 'payable' AND a.owner_member_id = p.seller_id) <> p.amount_cents OR (SELECT SUM(l.credit_cents) FROM journal_lines l JOIN accounts a ON a.account_id = l.account_id WHERE l.entry_id = e.entry_id AND a.role = 'bank') <> p.amount_cents OR (SELECT COUNT(*) FROM journal_lines WHERE entry_id = e.entry_id) <> 2");
assertEqual(bad, 0, "A payout entry is: Dr the seller's payable, Cr the bank, same amount, dated created_at. Entries that differ");
const key = "INSERT INTO idempotency_keys (tenant_id, idem_key, request_hash, first_req_id, created_at) VALUES (1, 'probe-key', 'h', 0, '2026-03-02 09:00:00'); ";
const pay = (cents) => "INSERT INTO payouts (tenant_id, seller_id, amount_cents, idem_key, created_at) VALUES (1, (SELECT member_id FROM members WHERE handle = 'marlowe'), " + cents + ", 'probe-key', '2026-03-02 09:00:00')";
assert(probe(key + pay(99999999)) !== null, "A payout bigger than the seller's payable balance must be refused (the posting gate vetoes it)");
assertEqual(probe(key + pay(100)), null, "A small payout must be accepted and posted");`,
        },
        {
          id: "t5",
          description: "Every key stores its response as JSON for replay",
          assertionCode: t`assertEqual(num("SELECT COUNT(*) FROM idempotency_keys WHERE state <> 'done' OR response_json IS NULL OR NOT json_valid(response_json)"), 0, "Every key should be 'done' with a valid JSON response_json");
const bad = num("SELECT COUNT(*) FROM idempotency_keys k JOIN payouts p ON p.tenant_id = k.tenant_id AND p.idem_key = k.idem_key WHERE json_extract(k.response_json, '$.payout_id') <> p.payout_id OR json_extract(k.response_json, '$.amount_cents') <> p.amount_cents OR json_extract(k.response_json, '$.status') <> 'created'");
assertEqual(bad, 0, "response_json should hold payout_id, status 'created' and amount_cents of the payout it describes");`,
        },
        {
          id: "t6",
          description: "All 29 requests are classified, and the summary shows how much a missing key would have double-paid",
          assertionCode: t`const reqs = query("SELECT req_id, tenant_id, idem_key, body_hash, amount_cents FROM payout_requests ORDER BY req_id");
const first = new Map();
const want = reqs.map((r) => {
  const k = r.tenant_id + "/" + r.idem_key;
  let outcome;
  if (!first.has(k)) { first.set(k, r); outcome = "executed"; } else outcome = first.get(k).body_hash === r.body_hash ? "replayed" : "conflict";
  return { req_id: r.req_id, outcome, amount_cents: r.amount_cents };
});
const got = data(["req_id", "idem_key", "seller_id", "amount_cents", "outcome"], "Add the classification: req_id, idem_key, seller_id, amount_cents, outcome");
match(got, want, "req_id", ["outcome"], "the request stream");
const sum = data(["outcome", "requests", "cents"], "Add the summary: outcome, requests, cents");
for (const o of ["executed", "replayed", "conflict"]) {
  const rows = want.filter((w) => w.outcome === o);
  const g = sum.find((s) => s.outcome === o);
  assert(g, "Summary is missing the outcome " + o);
  assertEqual(g.requests, rows.length, "requests for " + o);
  assertEqual(g.cents, rows.reduce((a, r) => a + r.amount_cents, 0), "cents for " + o);
}`,
        },
      ],
      unlocks: ["ch-idem"],
      checks: [
        {
          prompt: "A request arrives with a key you have already seen, but its amount differs from the first request. What should the server do?",
          question: {
            type: "choice",
            options: [
              "Replay the stored response: the key matches",
              "Execute it as a new payment",
              "Refuse it as a conflict: the key was reused for a different request",
              "Ignore the key and treat the request as new",
            ],
            answer: 2,
          },
          explanation: "A key names one intent. The same key with a different body means the client has a bug, and guessing which version it meant moves money on a hunch. Refuse, and make the problem visible.",
        },
        {
          prompt: "Why is `SELECT … WHERE idem_key = ?` followed by an `INSERT` not a safe way to claim a key?",
          question: {
            type: "text",
            answer: ["race", "race condition", "two requests can both see nothing", "both requests see no row", "concurrent requests both pass the check"],
            placeholder: "one or two words",
          },
          explanation: "Two simultaneous attempts can both run the SELECT before either INSERT happens, both find nothing, and both do the work. A single INSERT … ON CONFLICT lets the primary key arbitrate.",
        },
      ],
    },

    // ───────────────────────────── 6 ─────────────────────────────
    {
      id: "counting-house-6-outbox",
      title: "Write once, announce reliably",
      minutes: 28,
      xp: 150,
      concepts: ["transactional outbox", "BEGIN / COMMIT / ROLLBACK", "UPDATE … RETURNING", "at-least-once delivery", "claim and mark"],
      learn: md`### The dual-write trap

After a seller is paid, other systems need to hear about it: the email service, the analytics pipeline, the search index. The naive code does two things: \`INSERT\` the payout, then tell the message broker. Two things means two ways to fail:

- crash **between** them and the payout exists but nobody was told;
- swap the order and the world hears about a payout that then failed to save.

No transaction spans your database and a broker, so you cannot make both writes atomic directly.

### The outbox pattern

Make it **one** write. Put the event in a table, in the **same transaction** as the business row. The database now guarantees that "the payout exists" and "its event exists" are a single fact: either both are committed or neither is. A separate **relay** process reads the outbox and publishes. Publishing is outside the transaction, so it can be retried until it works.

~~~text
 request ──► BEGIN
              INSERT payouts ...        (the business row)
              INSERT outbox  ...        (the event: same transaction)
             COMMIT
 relay   ──► claim a few pending events ──► publish them ──► mark them sent
~~~

### Designing the table

An event row needs: a monotonic \`event_id\` (the relay's ordering key), what it is about (\`aggregate_type\`, \`aggregate_id\`), a \`topic\`, a JSON \`payload\` (guarded with \`CHECK (json_valid(payload))\` so garbage never gets in), \`created_at\`, and delivery bookkeeping: \`status\` (\`pending\`, \`claimed\`, \`sent\`), who claimed it and when, and when it was sent. Keep payloads **self-contained** ("payout 12 for 4800 cents went to seller 9"), not pointers to rows that may change before anyone reads them.

You can write the event from application code or with an \`AFTER INSERT\` trigger. The trigger version means no code path can forget, and it also gives you a clean way to emit events for rows that existed before you introduced the pattern: a **backfill** that inserts an event for every payout that lacks one (use \`NOT EXISTS\`, so running it twice adds nothing).

### Delivery is at least once

The relay publishes, then marks the event sent. If it crashes in between, the event goes out again after restart. So **consumers must tolerate duplicates**, and \`event_id\` is the natural dedupe key: it is the idempotency idea from the last lesson applied on the receiving side. Exactly-once is not something you get from the transport; you build it from at-least-once plus idempotent handling.

### Claiming a batch

Two relays must never publish the same event at the same moment, so claiming is one atomic statement, ordered by \`event_id\` so each aggregate's events stay in order:

~~~sql
UPDATE outbox
SET status = 'claimed', claimed_by = 'relay-1', claimed_at = (SELECT now FROM clock)
WHERE event_id IN (SELECT event_id FROM outbox WHERE status = 'pending' ORDER BY event_id LIMIT 5)
  AND status = 'pending'
RETURNING event_id, topic, aggregate_id, claimed_by;
~~~

The trailing \`AND status = 'pending'\` is a **guard**: if another relay changed a row first, it no longer matches. \`RETURNING\` hands the claimed rows straight back, so there is no separate SELECT to race with. After publishing, mark them sent, restricted to your own claim (\`claimed_by = 'relay-1'\`). A relay that dies after claiming leaves events stuck in \`claimed\`; a sweeper that puts old claims back to \`pending\` is the same lease idea you will meet in the next lesson.

### Transactions in practice

\`BEGIN\` … \`COMMIT\` makes a group of statements atomic. \`ROLLBACK\` throws the group away, including every row the triggers added along the way. That is what you want to see when something goes wrong in the middle:

~~~sql
BEGIN;
INSERT INTO payouts (...) VALUES (...);   -- trigger posts the entry and writes the event
ROLLBACK;                                  -- all of it vanishes together
~~~

### Common mistakes

- Publishing to the broker *inside* the transaction. A slow broker then holds your database locks.
- Ordering by timestamp instead of \`event_id\`. Timestamps tie and drift; a sequence does not.
- Deleting events the moment they are sent. Keep them for replay and debugging, and purge on a schedule (lesson 10).
- Selecting pending events and then updating them. That is the race the guarded UPDATE exists to close.`,
      mission: md`Payouts now reach the ledger reliably, but nobody tells the rest of the platform. Add a transactional outbox: every payout (new and historic) gets an event written by the database itself, and a relay claims and marks them in order.

The **Outbox relay** panel shows the feed with pending, claimed and sent events, and the relay moving a batch.`,
      tasks: [
        "Create the outbox table and an AFTER INSERT trigger on payouts that writes a 'payout.created' event with a JSON payload",
        "Backfill events for the payouts that already exist, then commit one new payout and roll back another, each in a transaction",
        "Claim the five oldest pending events as relay-1 with RETURNING, mark them sent, and show the whole feed",
      ],
      starterAdd: sql`-- ── ✏️ YOUR TURN ───────────────────────────
-- Lesson 6: write once, announce reliably.
--
-- 1. outbox: event_id INTEGER PRIMARY KEY, tenant_id INTEGER NOT NULL, aggregate_type TEXT NOT NULL,
--    aggregate_id INTEGER NOT NULL, topic TEXT NOT NULL, payload TEXT NOT NULL (CHECK json_valid(payload)),
--    created_at TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending' ('pending', 'claimed' or 'sent'),
--    claimed_by TEXT, claimed_at TEXT, sent_at TEXT
--    trg_payout_outbox: AFTER INSERT ON payouts writes (aggregate_type 'payout', aggregate_id = payout_id,
--    topic 'payout.created', created_at = the payout's created_at, payload =
--    json_object('payout_id', ..., 'seller_id', ..., 'amount_cents', ...)).
--
-- 2. Backfill: add the same event for every payout that has none yet (NOT EXISTS), ordered by payout_id.
--    Then two transactions (the clock table holds "now"; use (SELECT now FROM clock) as created_at):
--      COMMIT:   key 'po-7-0302' (tenant 1, request_hash 'b0c0ffee1', first_req_id 30) and a 2500-cent payout to seller 'marlowe'
--      ROLLBACK: key 'po-8-0302' (tenant 1, request_hash 'b0c0ffee2', first_req_id 31) and an 1800-cent payout to seller 'brindle'
--    Each transaction inserts the key row and then the payout. The rolled-back one must leave NO trace.
--
-- 3. Relay 'relay-1':
--    a) claim the 5 oldest pending events (ORDER BY event_id LIMIT 5) in ONE guarded UPDATE: status 'claimed',
--       claimed_by 'relay-1', claimed_at = now, RETURNING event_id, topic, aggregate_id, claimed_by
--    b) mark relay-1's claimed events as sent (sent_at = now), guarded by claimed_by
--    c) SELECT event_id, topic, aggregate_id, status, created_at, sent_at for the whole outbox ordered by event_id
`,
      solutionAdd: sql`-- The outbox, written by the database itself
CREATE TABLE outbox (
  event_id INTEGER PRIMARY KEY,
  tenant_id INTEGER NOT NULL,
  aggregate_type TEXT NOT NULL,
  aggregate_id INTEGER NOT NULL,
  topic TEXT NOT NULL,
  payload TEXT NOT NULL CHECK (json_valid(payload)),
  created_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'claimed', 'sent')),
  claimed_by TEXT,
  claimed_at TEXT,
  sent_at TEXT
);

CREATE TRIGGER trg_payout_outbox
AFTER INSERT ON payouts
BEGIN
  INSERT INTO outbox (tenant_id, aggregate_type, aggregate_id, topic, payload, created_at)
  VALUES (
    NEW.tenant_id, 'payout', NEW.payout_id, 'payout.created',
    json_object('payout_id', NEW.payout_id, 'seller_id', NEW.seller_id, 'amount_cents', NEW.amount_cents),
    NEW.created_at
  );
END;

-- Events for the payouts that predate the trigger
INSERT INTO outbox (tenant_id, aggregate_type, aggregate_id, topic, payload, created_at)
SELECT p.tenant_id, 'payout', p.payout_id, 'payout.created',
       json_object('payout_id', p.payout_id, 'seller_id', p.seller_id, 'amount_cents', p.amount_cents),
       p.created_at
FROM payouts AS p
WHERE NOT EXISTS (SELECT 1 FROM outbox AS o WHERE o.aggregate_type = 'payout' AND o.aggregate_id = p.payout_id)
ORDER BY p.payout_id;

-- One payout that commits: the row, its ledger entry and its event arrive together
BEGIN;
INSERT INTO idempotency_keys (tenant_id, idem_key, request_hash, first_req_id, created_at)
VALUES (1, 'po-7-0302', 'b0c0ffee1', 30, (SELECT now FROM clock));
INSERT INTO payouts (tenant_id, seller_id, amount_cents, idem_key, created_at)
VALUES (1, (SELECT member_id FROM members WHERE handle = 'marlowe'), 2500, 'po-7-0302', (SELECT now FROM clock));
COMMIT;

-- One that rolls back: nothing remains, not even the event
BEGIN;
INSERT INTO idempotency_keys (tenant_id, idem_key, request_hash, first_req_id, created_at)
VALUES (1, 'po-8-0302', 'b0c0ffee2', 31, (SELECT now FROM clock));
INSERT INTO payouts (tenant_id, seller_id, amount_cents, idem_key, created_at)
VALUES (1, (SELECT member_id FROM members WHERE handle = 'brindle'), 1800, 'po-8-0302', (SELECT now FROM clock));
ROLLBACK;

-- The relay: claim a batch, then mark it sent
UPDATE outbox
SET status = 'claimed', claimed_by = 'relay-1', claimed_at = (SELECT now FROM clock)
WHERE event_id IN (SELECT event_id FROM outbox WHERE status = 'pending' ORDER BY event_id LIMIT 5)
  AND status = 'pending'
RETURNING event_id, topic, aggregate_id, claimed_by;

UPDATE outbox
SET status = 'sent', sent_at = (SELECT now FROM clock)
WHERE claimed_by = 'relay-1' AND status = 'claimed';

SELECT event_id, topic, aggregate_id, status, created_at, sent_at
FROM outbox
ORDER BY event_id;`,
      explanation:
        "The trigger writes the event in the same statement as the payout, so the two are committed or rolled back together; the rolled-back transaction leaves no key, payout, ledger entry or event. The backfill uses NOT EXISTS so it can run twice safely. The relay claims with a single guarded UPDATE … RETURNING ordered by event_id, so two relays cannot take the same event and each aggregate's events stay in order, then marks only its own claims as sent.",
      hints: [
        { id: "h1", title: "Trigger plus backfill", content: "The trigger's INSERT and the backfill's INSERT … SELECT build the same json_object('payout_id', …, 'seller_id', …, 'amount_cents', …). The backfill selects FROM payouts p WHERE NOT EXISTS (SELECT 1 FROM outbox o WHERE o.aggregate_type = 'payout' AND o.aggregate_id = p.payout_id) ORDER BY p.payout_id." },
        { id: "h2", title: "Transactions", content: "BEGIN; INSERT INTO idempotency_keys …; INSERT INTO payouts …; COMMIT; then the same shape ending in ROLLBACK;. Look up the seller with (SELECT member_id FROM members WHERE handle = 'marlowe') and use (SELECT now FROM clock) for created_at." },
        { id: "h3", title: "Guarded claim", content: "UPDATE outbox SET status = 'claimed', claimed_by = 'relay-1', claimed_at = (SELECT now FROM clock) WHERE event_id IN (SELECT event_id FROM outbox WHERE status = 'pending' ORDER BY event_id LIMIT 5) AND status = 'pending' RETURNING event_id, topic, aggregate_id, claimed_by;" },
      ],
      tests: [
        {
          id: "t1",
          description: "The outbox only accepts valid JSON payloads and known statuses",
          assertionCode: t`for (const c of ["event_id", "tenant_id", "aggregate_type", "aggregate_id", "topic", "payload", "created_at", "status", "claimed_by", "claimed_at", "sent_at"]) assert(cols("outbox").includes(c), "outbox needs a column named " + c);
const base = "INSERT INTO outbox (tenant_id, aggregate_type, aggregate_id, topic, payload, created_at";
assert(probe(base + ") VALUES (1, 'payout', 1, 't', 'not json', '2026-03-02 09:00:00')") !== null, "A payload that is not valid JSON must be refused");
assert(probe(base + ", status) VALUES (1, 'payout', 1, 't', '{}', '2026-03-02 09:00:00', 'lost')") !== null, "status must be pending, claimed or sent");
assertEqual(probe(base + ") VALUES (1, 'payout', 1, 't', '{}', '2026-03-02 09:00:00')"), null, "A valid event must be accepted");`,
        },
        {
          id: "t2",
          description: "Every payout has exactly one event with a matching JSON payload",
          assertionCode: t`const n = num("SELECT COUNT(*) FROM payouts");
assertEqual(num("SELECT COUNT(*) FROM outbox WHERE aggregate_type = 'payout' AND topic = 'payout.created'"), n, "One 'payout.created' event per payout");
assertEqual(num("SELECT COUNT(*) FROM (SELECT aggregate_id FROM outbox WHERE aggregate_type = 'payout' GROUP BY aggregate_id HAVING COUNT(*) > 1)"), 0, "No payout may have two events");
const bad = num("SELECT COUNT(*) FROM payouts p JOIN outbox o ON o.aggregate_type = 'payout' AND o.aggregate_id = p.payout_id WHERE json_extract(o.payload, '$.payout_id') <> p.payout_id OR json_extract(o.payload, '$.seller_id') <> p.seller_id OR json_extract(o.payload, '$.amount_cents') <> p.amount_cents OR o.created_at <> p.created_at OR o.tenant_id <> p.tenant_id");
assertEqual(bad, 0, "Payload (payout_id, seller_id, amount_cents), created_at and tenant_id must mirror the payout. Events that differ");
assert(probe("INSERT INTO idempotency_keys (tenant_id, idem_key, request_hash, first_req_id, created_at) VALUES (1, 'probe-ob', 'h', 0, '2026-03-02 09:00:00'); INSERT INTO payouts (tenant_id, seller_id, amount_cents, idem_key, created_at) VALUES (1, (SELECT member_id FROM members WHERE handle = 'marlowe'), 100, 'probe-ob', '2026-03-02 09:00:00')") === null, "A fresh payout must be accepted (and write its own event)");`,
        },
        {
          id: "t3",
          description: "The committed transaction left its payout, entry and event; the rolled-back one left nothing",
          assertionCode: t`assertEqual(num("SELECT COUNT(*) FROM payouts WHERE idem_key = 'po-7-0302' AND amount_cents = 2500"), 1, "The committed payout should exist");
assertEqual(num("SELECT COUNT(*) FROM idempotency_keys WHERE idem_key = 'po-7-0302'"), 1, "The committed key should exist");
assertEqual(num("SELECT COUNT(*) FROM outbox o JOIN payouts p ON p.payout_id = o.aggregate_id WHERE o.aggregate_type = 'payout' AND p.idem_key = 'po-7-0302'"), 1, "The committed payout should have an event");
assertEqual(num("SELECT COUNT(*) FROM journal_entries e JOIN payouts p ON p.payout_id = e.ref_id AND e.ref_type = 'payout' WHERE p.idem_key = 'po-7-0302' AND e.status = 'posted'"), 1, "The committed payout should be in the ledger");
assertEqual(num("SELECT COUNT(*) FROM payouts WHERE idem_key = 'po-8-0302'"), 0, "The rolled-back payout must not exist");
assertEqual(num("SELECT COUNT(*) FROM idempotency_keys WHERE idem_key = 'po-8-0302'"), 0, "The rolled-back key must not exist");
assertEqual(num("SELECT COUNT(*) FROM outbox"), num("SELECT COUNT(*) FROM payouts"), "The outbox and payouts must stay one-to-one: a rollback undoes the event too");
const claimed = find(["event_id", "claimed_by"], /update/);
assert(claimed, "Run the claim as an UPDATE … RETURNING so you can see the batch");`,
        },
        {
          id: "t4",
          description: "relay-1 claimed and sent the five oldest events, in order, and the rest are still pending",
          assertionCode: t`const sent = query("SELECT event_id, claimed_by, sent_at FROM outbox WHERE status = 'sent' ORDER BY event_id");
assertEqual(sent.length, 5, "Exactly five events should be sent");
const oldest = query("SELECT event_id FROM outbox ORDER BY event_id LIMIT 5").map((r) => r.event_id);
assertEqual(sent.map((r) => r.event_id), oldest, "The five OLDEST events (lowest event_id) should be the ones sent");
for (const r of sent) { assertEqual(r.claimed_by, "relay-1", "claimed_by on event " + r.event_id); assert(r.sent_at, "sent_at should be set on event " + r.event_id); }
assertEqual(num("SELECT COUNT(*) FROM outbox WHERE status = 'claimed'"), 0, "Nothing should be left claimed");
assertEqual(num("SELECT COUNT(*) FROM outbox WHERE status = 'pending' AND (claimed_by IS NOT NULL OR sent_at IS NOT NULL)"), 0, "Pending events must be untouched");
const rs = find(["event_id", "topic", "aggregate_id", "claimed_by"], /update/);
assert(rs && rs.rows.length === 5, "The claim UPDATE … RETURNING should return the 5 claimed rows");
assert(rs.rows.every((r) => r[rs.columns.indexOf("claimed_by")] === "relay-1"), "RETURNING shows claimed_by relay-1");`,
        },
        {
          id: "t5",
          description: "The feed lists the whole outbox with each event's status",
          assertionCode: t`const feed = data(["event_id", "topic", "aggregate_id", "status", "created_at", "sent_at"], "Finish with the feed: event_id, topic, aggregate_id, status, created_at, sent_at", /from\s+outbox/, /update/);
const want = query("SELECT event_id, status FROM outbox");
match(feed, want, "event_id", ["status"], "the outbox feed");`,
        },
      ],
      unlocks: ["ch-outbox"],
      checks: [
        {
          prompt: "The relay publishes an event to the broker, then crashes before marking it sent. What happens after restart?",
          question: {
            type: "choice",
            options: [
              "The event is lost",
              "The event is published again, so consumers must handle duplicates",
              "The database detects the publish and marks it sent",
              "The payout is rolled back",
            ],
            answer: 1,
          },
          explanation: "The relay cannot know the publish succeeded, so it retries: delivery is at least once. Consumers dedupe on event_id.",
        },
        {
          prompt: "Why write the event in the same transaction as the payout instead of publishing right after COMMIT?",
          question: {
            type: "choice",
            options: [
              "A crash between COMMIT and the publish would lose the event, with nothing left to retry from",
              "Publishing after COMMIT is slower",
              "Brokers cannot receive messages after a COMMIT",
              "It lets you skip the ledger",
            ],
            answer: 0,
          },
          explanation: "If the event is a row committed with the payout, the relay can always find it again. If it only exists in memory after the commit, a crash erases the intention to tell anyone.",
        },
      ],
    },

    // ───────────────────────────── 7 ─────────────────────────────
    {
      id: "counting-house-7-queue",
      title: "A job queue with leases",
      minutes: 28,
      xp: 160,
      concepts: ["UPDATE … RETURNING claim", "compare-and-set guards", "leases / visibility timeout", "dedupe keys", "fencing a zombie worker"],
      learn: md`### A queue is a table with rules

Some work does not belong in the request that triggered it: emailing a receipt, rendering a statement, syncing a directory. Put the work in a **jobs table** and let workers drain it. Using the database as the queue has a real advantage: you can enqueue in the same transaction as the business change (the outbox idea again), and there is nothing extra to run. It stops being a good idea at very high throughput; below that, it is hard to beat.

A job moves through \`queued → running → done\`, or to \`dead\` if it keeps failing. The columns that run the show:

- \`run_at\`: not before this time (this is how delays and backoff work);
- \`priority\`: higher goes first;
- \`attempts\` and \`max_attempts\`: how many tries it has used and may use;
- \`locked_by\` and \`lease_until\`: which worker owns it, and until when.

### Enqueue idempotently

Enqueueing must be as retry-safe as everything else. Each job carries a \`dedupe_key\` (\`receipt:1042\` means "the receipt for order 1042") with a unique index per tenant, so \`INSERT … ON CONFLICT DO NOTHING\` makes "enqueue it" safe to call twice. Use \`json_object\` to build the payload so it is always valid JSON.

### The claim: the statement that matters

~~~sql
UPDATE jobs
SET state = 'running', locked_by = 'worker-a',
    lease_until = datetime((SELECT now FROM clock), '+60 seconds'),
    attempts = attempts + 1
WHERE job_id IN (
    SELECT job_id FROM jobs
    WHERE state = 'queued' AND run_at <= (SELECT now FROM clock)
    ORDER BY priority DESC, run_at, job_id
    LIMIT 3
  )
  AND state = 'queued'
RETURNING job_id, kind, state, locked_by, lease_until, attempts;
~~~

Read it as a contract. **One statement**, so no other writer can slip between "find" and "take". The trailing \`AND state = 'queued'\` is a **compare-and-set**: if a competing worker took the row a moment earlier, it no longer qualifies and is skipped. \`RETURNING\` gives the worker what it just took with no second query. (PostgreSQL spells the same intent \`FOR UPDATE SKIP LOCKED\`.) The ordering is deliberate: priority first, then oldest due time, then job id, so ties are resolved the same way every time and no job starves.

\`attempts\` is incremented **at claim time**, not at completion. If a worker crashes mid-job, that attempt still counts; otherwise a job that kills its worker every time would retry for ever.

### Leases

A claim is a promise to finish before \`lease_until\`, or to renew it. If the worker dies, nobody has to notice: when the lease passes, the job becomes recoverable by a reaper (next lesson). The lease length should be a few times the normal job duration; long-running jobs renew ("heartbeat") with a guarded UPDATE. Without a lease, one crashed worker holds its jobs hostage for ever.

### Finishing: only if you still own it

~~~sql
UPDATE jobs SET state = 'done', finished_at = ..., locked_by = NULL, lease_until = NULL
WHERE job_id = ? AND locked_by = 'worker-a' AND state = 'running' AND lease_until > now;
~~~

The extra conditions fence off **zombie workers**: a worker that was slow, lost its lease, and woke up to report success for a job that someone else is now running. If this UPDATE changes **zero rows**, the worker has lost the job and must discard its result. Always look at the number of rows changed.

### Time is an input

Every statement above reads "now" from the \`clock\` table instead of calling a wall clock. Real systems pass time in as a parameter for the same reason: queries become repeatable, and you can test "what happens ten minutes from now" by changing one row.

### Common mistakes

- \`SELECT\` the next job, then \`UPDATE\` it. Two workers read the same row.
- No ordering, so a steady stream of new work starves old jobs.
- Completing without \`locked_by\`, letting a zombie overwrite the real owner's result.
- Counting attempts on success only.`,
      mission: md`It is a Monday morning and the job runner is busy. Receipts for last week's orders need to go out, two workers are polling, and you own the SQL that makes sure no job runs twice at the same time.

Enqueue the missing receipts without duplicating any, let worker-a and worker-b claim from the same queue, and have worker-a report its finished jobs. The **Job queue** panel shows the lanes: queued, running, done and dead.`,
      tasks: [
        "Enqueue 'send_receipt' jobs for tenant 1's paid orders since 2026-02-20, safely (dedupe_key 'receipt:<order_id>', ON CONFLICT DO NOTHING)",
        "Let worker-a and then worker-b each claim three due jobs with a 60-second lease, using one guarded UPDATE … RETURNING each",
        "Finish worker-a's send_receipt jobs (guarded by owner and lease), then list the whole queue",
      ],
      starterAdd: sql`-- ── ✏️ YOUR TURN ───────────────────────────
-- Lesson 7: a job queue with leases. The jobs table already exists (SELECT * FROM jobs ORDER BY job_id) and a few
-- workers have been busy this morning. "Now" is (SELECT now FROM clock): never use a wall clock.
--
-- 1. Enqueue one 'send_receipt' job for every paid order of tenant 1 placed on or after '2026-02-20'.
--    tenant_id from the order, payload = json_object('order_id', order_id), dedupe_key = 'receipt:' || order_id,
--    run_at and created_at = now. Orders that already have a job must be skipped silently (ON CONFLICT DO NOTHING).
--
-- 2. Two workers claim from the same queue. Each is ONE statement:
--      UPDATE jobs SET state = 'running', locked_by = '<worker>', lease_until = now + 60 seconds, attempts = attempts + 1
--      WHERE job_id IN (3 due queued jobs: state = 'queued' AND run_at <= now, ORDER BY priority DESC, run_at, job_id LIMIT 3)
--        AND state = 'queued'
--      RETURNING job_id, kind, state, locked_by, lease_until, attempts
--    Run it for 'worker-a', then again for 'worker-b'. Their job sets must not overlap.
--
-- 3. worker-a reports success for its 'send_receipt' jobs: state 'done', finished_at = now, locked_by and lease_until
--    cleared. Guard it: only rows with locked_by = 'worker-a', state 'running' and a lease that has not expired.
--    Finish with the queue board:
--      job_id, kind, state, priority, attempts, max_attempts, run_at, locked_by, lease_until, last_error
--    for every job, ordered by job_id.
`,
      solutionAdd: sql`-- Enqueue safely: calling this twice adds nothing
INSERT INTO jobs (tenant_id, kind, payload, dedupe_key, run_at, created_at)
SELECT o.tenant_id, 'send_receipt', json_object('order_id', o.order_id), 'receipt:' || o.order_id,
       (SELECT now FROM clock), (SELECT now FROM clock)
FROM orders AS o
WHERE o.tenant_id = 1 AND o.status = 'paid' AND o.placed_at >= '2026-02-20'
ORDER BY o.order_id
ON CONFLICT DO NOTHING;

-- worker-a claims
UPDATE jobs
SET state = 'running',
    locked_by = 'worker-a',
    lease_until = datetime((SELECT now FROM clock), '+60 seconds'),
    attempts = attempts + 1
WHERE job_id IN (
    SELECT job_id FROM jobs
    WHERE state = 'queued' AND run_at <= (SELECT now FROM clock)
    ORDER BY priority DESC, run_at, job_id
    LIMIT 3
  )
  AND state = 'queued'
RETURNING job_id, kind, state, locked_by, lease_until, attempts;

-- worker-b claims from the same queue
UPDATE jobs
SET state = 'running',
    locked_by = 'worker-b',
    lease_until = datetime((SELECT now FROM clock), '+60 seconds'),
    attempts = attempts + 1
WHERE job_id IN (
    SELECT job_id FROM jobs
    WHERE state = 'queued' AND run_at <= (SELECT now FROM clock)
    ORDER BY priority DESC, run_at, job_id
    LIMIT 3
  )
  AND state = 'queued'
RETURNING job_id, kind, state, locked_by, lease_until, attempts;

-- worker-a finishes what it still owns
UPDATE jobs
SET state = 'done', finished_at = (SELECT now FROM clock), locked_by = NULL, lease_until = NULL
WHERE locked_by = 'worker-a' AND state = 'running' AND kind = 'send_receipt'
  AND lease_until > (SELECT now FROM clock);

-- The board
SELECT job_id, kind, state, priority, attempts, max_attempts, run_at, locked_by, lease_until, last_error
FROM jobs
ORDER BY job_id;`,
      explanation:
        "The enqueue is idempotent because the unique dedupe_key index turns repeats into silent no-ops (some receipts already had jobs). Each claim is a single UPDATE: the subquery picks the best due jobs by priority, due time and id, and the outer state = 'queued' guard makes the take a compare-and-set, so worker-b can never receive a job worker-a already holds. attempts rises at claim time so a crash still costs an attempt. Completion is fenced by owner, state and lease, so a worker that lost its lease changes zero rows instead of overwriting the new owner's work.",
      hints: [
        { id: "h1", title: "Skip what exists", content: "INSERT INTO jobs (tenant_id, kind, payload, dedupe_key, run_at, created_at) SELECT … FROM orders WHERE tenant_id = 1 AND status = 'paid' AND placed_at >= '2026-02-20' ORDER BY order_id ON CONFLICT DO NOTHING; The unique index jobs_dedupe on (tenant_id, dedupe_key) is what makes the conflict fire." },
        { id: "h2", title: "Claim shape", content: "UPDATE jobs SET state = 'running', locked_by = 'worker-a', lease_until = datetime((SELECT now FROM clock), '+60 seconds'), attempts = attempts + 1 WHERE job_id IN (SELECT job_id FROM jobs WHERE state = 'queued' AND run_at <= (SELECT now FROM clock) ORDER BY priority DESC, run_at, job_id LIMIT 3) AND state = 'queued' RETURNING job_id, kind, state, locked_by, lease_until, attempts; Copy it for worker-b." },
        { id: "h3", title: "Fenced completion", content: "UPDATE jobs SET state = 'done', finished_at = (SELECT now FROM clock), locked_by = NULL, lease_until = NULL WHERE locked_by = 'worker-a' AND state = 'running' AND kind = 'send_receipt' AND lease_until > (SELECT now FROM clock);" },
      ],
      tests: [
        {
          id: "t1",
          description: "Every paid order since 2026-02-20 has exactly one receipt job, built with the agreed key and payload",
          assertionCode: t`const orders = query("SELECT order_id, tenant_id FROM orders WHERE tenant_id = 1 AND status = 'paid' AND placed_at >= '2026-02-20' ORDER BY order_id");
assert(orders.length > 5, "Setup data changed");
for (const o of orders) {
  const js = query("SELECT job_id, kind, dedupe_key, json_extract(payload, '$.order_id') AS oid FROM jobs WHERE dedupe_key = 'receipt:" + o.order_id + "' AND tenant_id = 1");
  assertEqual(js.length, 1, "Order " + o.order_id + " should have exactly one receipt job (dedupe_key 'receipt:" + o.order_id + "')");
  assertEqual(js[0].kind, "send_receipt", "kind of the job for order " + o.order_id);
  assertEqual(js[0].oid, o.order_id, "payload.order_id of the job for order " + o.order_id);
}
assertEqual(num("SELECT COUNT(*) FROM jobs WHERE kind = 'send_receipt' AND dedupe_key IS NULL"), 0, "Every receipt job needs a dedupe_key");
assert(probe("INSERT INTO jobs (tenant_id, kind, payload, dedupe_key, run_at, created_at) VALUES (1, 'send_receipt', '{}', 'receipt:" + orders[0].order_id + "', '2026-03-02 09:00:00', '2026-03-02 09:00:00')") !== null, "The dedupe index must refuse a second job for the same order");`,
        },
        {
          id: "t2",
          description: "worker-a and worker-b each claimed three jobs with a 60-second lease; the sets are disjoint and are the best ones",
          assertionCode: t`const claims = results.filter((r) => ["job_id", "locked_by", "lease_until", "attempts"].every((c) => r.columns.includes(c)) && /^\s*(--[^\n]*\n\s*)*update/i.test(r.sql));
const a = claims.find((r) => r.rows.some((x) => x[r.columns.indexOf("locked_by")] === "worker-a"));
const b = claims.find((r) => r.rows.some((x) => x[r.columns.indexOf("locked_by")] === "worker-b"));
assert(a, "Run worker-a's claim as UPDATE … RETURNING job_id, kind, state, locked_by, lease_until, attempts");
assert(b, "Run worker-b's claim as UPDATE … RETURNING job_id, kind, state, locked_by, lease_until, attempts");
const ids = (rs) => rs.rows.map((x) => x[rs.columns.indexOf("job_id")]);
assertEqual(ids(a).length, 3, "worker-a claims three jobs");
assertEqual(ids(b).length, 3, "worker-b claims three jobs");
assert(!ids(a).some((id) => ids(b).includes(id)), "The two workers must not share a job");
const now = one("SELECT now FROM clock").now;
for (const rs of [a, b]) for (const row of rs.rows) {
  assertEqual(row[rs.columns.indexOf("lease_until")], one("SELECT datetime('" + now + "', '+60 seconds') AS d").d, "lease_until is now + 60 seconds");
  assertEqual(row[rs.columns.indexOf("state")], "running", "claimed jobs are running");
}
const rank = (id) => { const j = one("SELECT priority, run_at, job_id FROM jobs WHERE job_id = " + id); return [-j.priority, j.run_at, j.job_id]; };
const before = (x, y) => (x[0] !== y[0] ? x[0] < y[0] : x[1] !== y[1] ? x[1] < y[1] : x[2] < y[2]);
const claimed = [...ids(a), ...ids(b)];
const worstClaimed = claimed.map(rank).reduce((w, r) => (before(w, r) ? r : w));
const queued = query("SELECT job_id FROM jobs WHERE state = 'queued' AND run_at <= '" + now + "'").map((r) => r.job_id);
for (const id of queued) assert(before(worstClaimed, rank(id)), "Job " + id + " is queued and due but ranks ahead of a claimed job: order by priority DESC, run_at, job_id");
assert(ids(a).every((id) => ids(b).every((j) => before(rank(id), rank(j)))), "worker-a claimed first, so every job of worker-a should outrank every job of worker-b");`,
        },
        {
          id: "t3",
          description: "worker-a's receipt jobs are done, its other job is still running, and worker-b still holds its three",
          assertionCode: t`const claims = results.filter((r) => ["job_id", "locked_by"].every((c) => r.columns.includes(c)) && /^\s*(--[^\n]*\n\s*)*update/i.test(r.sql));
const ofWorker = (w) => { const rs = claims.find((r) => r.rows.some((x) => x[r.columns.indexOf("locked_by")] === w)); return rs ? rs.rows.map((x) => x[rs.columns.indexOf("job_id")]) : []; };
const a = ofWorker("worker-a");
const b = ofWorker("worker-b");
assert(a.length === 3 && b.length === 3, "Claim the jobs first");
for (const id of a) {
  const j = one("SELECT kind, state, finished_at, locked_by, lease_until FROM jobs WHERE job_id = " + id);
  if (j.kind === "send_receipt") {
    assertEqual(j.state, "done", "Job " + id + " (a receipt) should be done");
    assert(j.finished_at, "Job " + id + " needs finished_at");
    assert(j.locked_by === null && j.lease_until === null, "Job " + id + " should release its lock");
  } else {
    assertEqual(j.state, "running", "Job " + id + " is not a receipt, so it is still running");
    assertEqual(j.locked_by, "worker-a", "Job " + id + " still belongs to worker-a");
  }
}
for (const id of b) { const j = one("SELECT state, locked_by FROM jobs WHERE job_id = " + id); assertEqual(j.state, "running", "worker-b has not finished job " + id); assertEqual(j.locked_by, "worker-b", "owner of job " + id); }`,
        },
        {
          id: "t4",
          description: "The queue board lists every job with its state",
          assertionCode: t`const board = data(["job_id", "kind", "state", "priority", "attempts", "max_attempts", "run_at", "locked_by", "lease_until", "last_error"], "Finish with the board: job_id, kind, state, priority, attempts, max_attempts, run_at, locked_by, lease_until, last_error", /from\s+jobs/, /update/);
const want = query("SELECT job_id, state, attempts, locked_by FROM jobs");
match(board, want, "job_id", ["state", "attempts", "locked_by"], "the queue board");`,
        },
      ],
      unlocks: ["ch-queue"],
      checks: [
        {
          prompt: "Why does the claim end with `AND state = 'queued'` even though the subquery already selects only queued jobs?",
          question: {
            type: "choice",
            options: [
              "It is redundant; it only makes the query easier to read",
              "Between the subquery picking a job and the UPDATE taking it, another worker may have claimed it; the guard makes the take a compare-and-set",
              "SQLite requires every UPDATE to repeat its WHERE conditions",
              "It makes RETURNING work",
            ],
            answer: 1,
          },
          explanation: "The guard turns 'find then take' into an atomic check-and-take. A row that changed in the meantime simply does not match, so two workers can never end up holding the same job.",
        },
        {
          prompt: "A slow worker finishes after its lease expired and another worker re-claimed the job. Its completion UPDATE (guarded by locked_by and lease_until) changes how many rows?",
          question: { type: "number", answer: 0 },
          explanation: "The row now belongs to someone else and the lease check fails, so zero rows change. The slow worker must treat 'zero rows' as 'I lost this job' and throw its result away.",
        },
      ],
    },

    // ───────────────────────────── 8 ─────────────────────────────
    {
      id: "counting-house-8-retries",
      title: "Retries, backoff and dead letters",
      minutes: 28,
      xp: 160,
      concepts: ["exponential backoff", "lease reaper", "dead-letter queue", "poison jobs", "manual replay"],
      learn: md`### Failure is a state, not an exception

A job can fail in three ways, and each needs a different response:

1. **The worker says it failed** (the mail provider answered "try again later"). Record the error, put the job back with a delay.
2. **The worker disappeared** (crash, deploy, lost network). Nobody reports anything; the lease just runs out.
3. **The job can never succeed** (the address does not exist, the template has a bug). It will fail again and again however long you wait: a **poison job**.

A queue that only knows "run again" turns the third kind into an infinite loop that eats a worker for ever. A good queue gives every job a **budget** (\`max_attempts\`) and a destination when the budget is spent: the **dead-letter** state. Dead jobs stop consuming workers and wait, with their last error, for a human.

### Backoff: wait longer each time

Retrying instantly hammers a service that is already struggling. **Exponential backoff** doubles the wait every attempt: 60 s, 120 s, 240 s and so on, up to a cap. In SQL, with the attempt count already incremented at claim time:

~~~sql
run_at = datetime(now, '+' || MIN(900, 30 * (1 << attempts)) || ' seconds')
~~~

\`1 << attempts\` is 2 to the power of attempts (a bit shift), \`MIN(900, …)\` caps the delay at fifteen minutes. In production you would add a little random **jitter** so a thousand failed jobs do not all retry in the same second; SQLite has no per-row randomness you can rely on for repeatable lessons, so we keep the formula exact.

### The reaper: recovering abandoned work

Case 2 needs something to *notice*. A **reaper** is just another statement, run periodically:

~~~sql
UPDATE jobs
SET state = CASE WHEN attempts >= max_attempts THEN 'dead' ELSE 'queued' END,
    run_at = <backoff>, locked_by = NULL, lease_until = NULL, last_error = COALESCE(last_error, 'lease expired')
WHERE state = 'running' AND lease_until < now
RETURNING job_id, state, attempts, run_at;
~~~

Because \`attempts\` was incremented when the job was claimed, a job whose workers keep dying runs out of budget even though no worker ever *reported* a failure. That is what stops a crash-looping poison job. Jobs whose lease is still in the future are left alone: their workers are alive.

The same \`CASE\` appears in the explicit-failure path (case 1). The difference is only the guard: a failure report must come from the owner (\`locked_by\`) with an unexpired lease.

### Looking at dead letters

A dead job is not deleted. It is a record that says "this needs a person". A dead-letter query lists the job, how many attempts it used and its last error. After the bug is fixed you **replay** it: back to \`queued\`, attempts reset, \`run_at\` now. Replay jobs deliberately and individually: blindly requeueing everything just recreates the pile-up that put them there.

### Common mistakes

- Backoff computed from the wrong counter (attempts before the increment gives a delay that is half what you meant).
- A reaper that requeues without checking the budget. Poison jobs then never die.
- Resetting \`attempts\` on every requeue, which defeats the budget.
- A dead-letter state nobody looks at. Alert on it, or it is a graveyard.`,
      mission: md`The 09:00 queue has problems. Mail provider throttling bounced worker-b's receipts, and three other jobs are sitting in \`running\` with leases that expired long ago, because their workers never came back. One of them has already used five of five attempts on a mailbox that does not exist.

Teach the queue to fail properly: back off, reap abandoned work, dead-letter the poison, and replay the one job that is fixable. The **Dead letters** panel collects what is left.`,
      tasks: [
        "Report worker-b's three running jobs as failed with a backoff (state back to queued, or dead when the budget is spent), guarded by owner and lease",
        "Advance the clock by 15 minutes, then reap every running job whose lease has expired: requeue with backoff, or dead-letter when attempts have reached max_attempts",
        "List the dead letters, then replay the dead 'render_statement' job and show the full queue board",
      ],
      starterAdd: sql`-- ── ✏️ YOUR TURN ───────────────────────────
-- Lesson 8: retries, backoff and dead letters.
-- Backoff in seconds = MIN(900, 30 * (1 << attempts)), counted from now. attempts was already incremented at claim time.
--
-- 1. worker-b's mail provider throttled it. Report ALL of worker-b's running 'send_receipt' jobs as failed in one UPDATE:
--      state = 'dead' if attempts >= max_attempts, otherwise 'queued'
--      run_at = now + backoff, last_error = 'smtp 421: mailbox provider is throttling us', locked_by and lease_until cleared
--    Guard it: locked_by = 'worker-b', state = 'running', lease_until still in the future.
--    RETURNING job_id, state, attempts, run_at
--
-- 2. Fifteen minutes pass: UPDATE clock SET now = datetime(now, '+15 minutes').
--    Then the reaper, ONE statement over every job with state = 'running' and lease_until < now:
--      state = 'dead' if attempts >= max_attempts (and set finished_at = now), otherwise 'queued'
--      run_at = now + the same backoff, locked_by and lease_until cleared,
--      last_error = COALESCE(last_error, 'lease expired')
--    RETURNING job_id, state, attempts, run_at, last_error
--    (jobs whose lease is still valid must be left alone)
--
-- 3. a) the dead letters: job_id, kind, attempts, max_attempts, last_error for jobs in state 'dead', ordered by job_id
--       (do not select the state column)
--    b) replay the dead 'render_statement' job (the template bug is fixed): state 'queued', attempts 0, run_at now,
--       finished_at cleared, last_error = 'replayed by hand after the template fix'. RETURNING job_id, state, attempts
--    c) the queue board again: job_id, kind, state, priority, attempts, max_attempts, run_at, locked_by, lease_until, last_error
`,
      solutionAdd: sql`-- worker-b reports a failure: back off, or dead-letter if the budget is spent
UPDATE jobs
SET state = CASE WHEN attempts >= max_attempts THEN 'dead' ELSE 'queued' END,
    run_at = datetime((SELECT now FROM clock), '+' || MIN(900, 30 * (1 << attempts)) || ' seconds'),
    last_error = 'smtp 421: mailbox provider is throttling us',
    locked_by = NULL,
    lease_until = NULL
WHERE locked_by = 'worker-b' AND state = 'running' AND kind = 'send_receipt'
  AND lease_until > (SELECT now FROM clock)
RETURNING job_id, state, attempts, run_at;

-- Time passes
UPDATE clock SET now = datetime(now, '+15 minutes');

-- The reaper: abandoned work goes back to the queue or to the dead letters
UPDATE jobs
SET state = CASE WHEN attempts >= max_attempts THEN 'dead' ELSE 'queued' END,
    run_at = datetime((SELECT now FROM clock), '+' || MIN(900, 30 * (1 << attempts)) || ' seconds'),
    last_error = COALESCE(last_error, 'lease expired'),
    locked_by = NULL,
    lease_until = NULL,
    finished_at = CASE WHEN attempts >= max_attempts THEN (SELECT now FROM clock) END
WHERE state = 'running' AND lease_until < (SELECT now FROM clock)
RETURNING job_id, state, attempts, run_at, last_error;

-- The dead letters
SELECT job_id, kind, attempts, max_attempts, last_error
FROM jobs
WHERE state = 'dead'
ORDER BY job_id;

-- Replay the one that is fixable
UPDATE jobs
SET state = 'queued', attempts = 0, run_at = (SELECT now FROM clock), finished_at = NULL,
    last_error = 'replayed by hand after the template fix'
WHERE state = 'dead' AND kind = 'render_statement'
RETURNING job_id, state, attempts;

SELECT job_id, kind, state, priority, attempts, max_attempts, run_at, locked_by, lease_until, last_error
FROM jobs
ORDER BY job_id;`,
      explanation:
        "The failure report and the reaper share one CASE: when attempts has reached max_attempts the job is dead-lettered, otherwise it is requeued after an exponential delay (30 seconds doubled per attempt, capped at 900). Attempts were counted at claim time, so the poison job that kept killing workers is out of budget even though nobody ever reported a failure. The reaper only touches expired leases, so the long-running job whose lease is still valid survives. Replay is a deliberate single-job reset, not a blanket requeue.",
      hints: [
        { id: "h1", title: "One expression for both paths", content: "SET state = CASE WHEN attempts >= max_attempts THEN 'dead' ELSE 'queued' END, run_at = datetime((SELECT now FROM clock), '+' || MIN(900, 30 * (1 << attempts)) || ' seconds'). The failure report adds AND locked_by = 'worker-b' AND lease_until > now; the reaper uses WHERE state = 'running' AND lease_until < now." },
        { id: "h2", title: "Order of the file", content: "Report the failure BEFORE you move the clock, otherwise worker-b's leases have already expired and the guard (lease_until > now) matches nothing. After UPDATE clock SET now = datetime(now, '+15 minutes') run the reaper." },
        { id: "h3", title: "Dead letters and replay", content: "SELECT job_id, kind, attempts, max_attempts, last_error FROM jobs WHERE state = 'dead' ORDER BY job_id; Replay: UPDATE jobs SET state = 'queued', attempts = 0, run_at = (SELECT now FROM clock), finished_at = NULL, last_error = '…' WHERE state = 'dead' AND kind = 'render_statement' RETURNING job_id, state, attempts;" },
      ],
      tests: [
        {
          id: "t1",
          description: "worker-b's throttled jobs were requeued with a backoff and the SMTP error",
          assertionCode: t`const js = query("SELECT job_id, state, attempts, run_at, last_error, locked_by, lease_until FROM jobs WHERE last_error = 'smtp 421: mailbox provider is throttling us' ORDER BY job_id");
assertEqual(js.length, 3, "worker-b's three receipts should carry the SMTP error");
for (const j of js) {
  assertEqual(j.state, "queued", "Job " + j.job_id + " still has attempts left, so it goes back to queued");
  assertEqual(j.run_at, "2026-03-02 09:01:00", "Job " + j.job_id + " run_at: now (09:00:00) + 30 * 2^attempts seconds with attempts = " + j.attempts);
  assert(j.locked_by === null && j.lease_until === null, "Job " + j.job_id + " must release its lock");
}
const rs = find(["job_id", "state", "attempts", "run_at"], /locked_by\s*=\s*'worker-b'/);
assert(rs && rs.rows.length === 3, "Run the failure report as UPDATE … RETURNING job_id, state, attempts, run_at (3 rows)");`,
        },
        {
          id: "t2",
          description: "The clock moved 15 minutes and the reaper left no expired lease behind",
          assertionCode: t`assertEqual(one("SELECT now FROM clock").now, "2026-03-02 09:15:00", "The clock should now read 09:15:00");
assertEqual(num("SELECT COUNT(*) FROM jobs WHERE state = 'running' AND lease_until < (SELECT now FROM clock)"), 0, "No running job may keep an expired lease");
const live = query("SELECT job_id, locked_by FROM jobs WHERE state = 'running'");
assertEqual(live.map((j) => j.job_id), [5], "Only job 5, whose lease runs until 09:20:00, should still be running");
assertEqual(live[0].locked_by, "worker-a", "Job 5 still belongs to worker-a");`,
        },
        {
          id: "t3",
          description: "Abandoned jobs got the right backoff, and the out-of-budget poison job was dead-lettered",
          assertionCode: t`const j = (id) => one("SELECT state, attempts, max_attempts, run_at, last_error, locked_by, finished_at FROM jobs WHERE job_id = " + id);
const backoff = (attempts) => one("SELECT datetime('2026-03-02 09:15:00', '+' || MIN(900, 30 * (1 << " + attempts + ")) || ' seconds') AS d").d;
for (const id of [6, 7, 12]) {
  const r = j(id);
  assertEqual(r.state, "queued", "Job " + id + " still has budget, so it is requeued");
  assertEqual(r.run_at, backoff(r.attempts), "Job " + id + " run_at = now + MIN(900, 30 * 2^attempts) with attempts = " + r.attempts);
  assertEqual(r.last_error, "lease expired", "Job " + id + " last_error");
  assert(r.locked_by === null, "Job " + id + " must release its lock");
}
const poison = j(8);
assertEqual(poison.state, "dead", "Job 8 has used 5 of 5 attempts: dead-letter it");
assert(String(poison.last_error).includes("mailbox does not exist"), "Dead-lettering keeps the original last_error");
assert(poison.finished_at, "A dead job gets finished_at");
const rs = find(["job_id", "state", "attempts", "run_at", "last_error"], /lease_until\s*<\s*/);
assert(rs && rs.rows.length >= 4, "Run the reaper as UPDATE … RETURNING job_id, state, attempts, run_at, last_error");`,
        },
        {
          id: "t4",
          description: "The dead-letter list shows both poison jobs with their errors, and only one is replayed",
          assertionCode: t`const dead = data(["job_id", "kind", "attempts", "max_attempts", "last_error"], "Add the dead letters: job_id, kind, attempts, max_attempts, last_error", /state\s*=\s*'dead'/, /update/);
assertEqual(dead.map((r) => r.job_id), [8, 9], "At that moment jobs 8 and 9 are dead");
assert(dead.every((r) => r.attempts >= r.max_attempts && r.last_error), "Dead jobs have spent their budget and carry an error");
const replayed = one("SELECT state, attempts, run_at, last_error, finished_at FROM jobs WHERE job_id = 9");
assertEqual(replayed.state, "queued", "Job 9 (render_statement) is replayed");
assertEqual(replayed.attempts, 0, "A replay resets attempts");
assertEqual(replayed.run_at, "2026-03-02 09:15:00", "A replay is due now");
assert(replayed.finished_at === null, "A replay clears finished_at");
assertEqual(num("SELECT COUNT(*) FROM jobs WHERE state = 'dead'"), 1, "Only the unreplayable send_receipt job stays dead");
assertEqual(one("SELECT kind FROM jobs WHERE state = 'dead'").kind, "send_receipt", "The remaining dead job is the poison receipt");`,
        },
        {
          id: "t5",
          description: "The queue board matches the database",
          assertionCode: t`assert(num("SELECT COUNT(*) FROM jobs WHERE state = 'dead'") === 1, "Finish the lesson's updates first (only the poison job should still be dead), then show the board");
const board = data(["job_id", "kind", "state", "attempts", "max_attempts", "run_at", "locked_by", "lease_until", "last_error"], "Finish with the board: job_id, kind, state, priority, attempts, max_attempts, run_at, locked_by, lease_until, last_error", /from\s+jobs/, /update|where/);
const want = query("SELECT job_id, state, attempts, run_at FROM jobs");
match(board, want, "job_id", ["state", "attempts", "run_at"], "the queue board");`,
        },
      ],
      unlocks: ["ch-dead"],
      checks: [
        {
          prompt: "Why is `attempts` incremented when a job is claimed rather than when it fails?",
          question: {
            type: "choice",
            options: [
              "So a worker that crashes without reporting anything still uses up an attempt",
              "Because UPDATE cannot change two columns at once",
              "To make backoff faster",
              "It makes no difference",
            ],
            answer: 0,
          },
          explanation: "A job that kills its worker never reports a failure. If attempts only counted reported failures, it would be retried for ever. Counting at claim time means every start is charged.",
        },
        {
          prompt: "What is the point of a dead-letter state instead of simply retrying for ever?",
          question: {
            type: "choice",
            options: [
              "Poison jobs stop consuming workers and wait, with their last error, for a person to decide",
              "It frees disk space",
              "Dead jobs run faster",
              "It hides failures from dashboards",
            ],
            answer: 0,
          },
          explanation: "A job that can never succeed would otherwise occupy a worker slot every cycle. Parking it keeps the queue healthy and keeps the evidence for debugging.",
        },
      ],
    },

    // ───────────────────────────── 9 ─────────────────────────────
    {
      id: "counting-house-9-audit",
      title: "An audit trail you can trust",
      minutes: 26,
      xp: 150,
      concepts: ["audit triggers", "actor context", "json_object before/after", "append-only log", "json_each"],
      learn: md`### What an audit trail answers

Sooner or later someone asks: *who changed this seller's payout method last Tuesday? what was it before? was it a person or a script?* Logs scattered across services rarely answer that. The database sees every change to a row at the moment it happens, so it is the most reliable place to record **who, what and when**.

### Who: tell the database

A pooled database connection does not know which human or service is behind a statement. The application must say so, once per request, in a place the triggers can read. Here that place is the \`session_ctx\` table:

~~~sql
UPDATE session_ctx SET actor = 'ops:rhea';
~~~

(PostgreSQL has \`SET LOCAL\` for the same job.) Use a naming convention that tells you *what kind* of actor it is: \`api:seller-portal\`, \`ops:rhea\`, \`job:fraud-sweep\`, \`system:console\`. The audit column is \`NOT NULL\`, so a writer that forgot to set an actor fails loudly rather than leaving an anonymous change.

### What: only the fields that matter

A trigger can capture the whole row, but you should not. The audit log is **append-only**, so anything you copy into it cannot be removed later. If you copy names and emails there, you have created personal data that can never be erased, which collides with the right to be forgotten (lesson 10). Audit the fields whose change matters to the business: status, payout method, limits, flags. Capture them as JSON with \`json_object\`, once before and once after:

~~~sql
json_object('status', OLD.status, 'payout_method', OLD.payout_method)   -- before
json_object('status', NEW.status, 'payout_method', NEW.payout_method)   -- after
~~~

### When: from the same clock as everything else

Read the timestamp from the injected \`clock\` so audit entries line up with every other time in the system, and tests can pin them.

### Only real changes

\`AFTER UPDATE OF status, payout_method\` fires whenever those columns appear in the UPDATE, even if the value stayed the same. Add a \`WHEN\` guard that compares old and new with the **NULL-safe** operator \`IS NOT\`: \`WHEN OLD.status IS NOT NEW.status OR OLD.payout_method IS NOT NEW.payout_method\`. With \`<>\` a change from NULL to a value would evaluate to NULL (not true) and be missed.

### The log must not be editable

A trail that anyone can rewrite proves nothing. Two triggers on \`audit_log\` abort every UPDATE and DELETE. In a real deployment you add database permissions, copies shipped to storage the application cannot touch, and sometimes a hash chain over rows; the trigger is the first and cheapest lock.

### Reading the trail

Before and after live in JSON, but people want one line per changed field. \`json_each\` turns an object into rows (\`key\`, \`value\`), and \`json_extract\` pulls the matching value from the after-image:

~~~sql
SELECT a.audit_id, a.actor, j.key AS field, j.value AS old_value,
       json_extract(a.after_json, '$.' || j.key) AS new_value
FROM audit_log AS a, json_each(a.before_json) AS j
WHERE j.value IS NOT json_extract(a.after_json, '$.' || j.key);
~~~

### Common mistakes

- Auditing every column of every table. The log becomes noise nobody reads.
- Storing personal data in an immutable log.
- Forgetting that a row trigger fires once per row: a bulk UPDATE of 10 000 rows writes 10 000 audit rows. Know your volumes.
- Writing the actor from the application only on some code paths. Make the column \`NOT NULL\` so the gap is an error.`,
      mission: md`A seller changed their payout method, a member was suspended and reinstated, and an operator relaxed a safety setting on an account. Right now nothing records any of it.

Build the audit trail, then make those changes as three different actors and read the history back, one line per changed field. The **Audit trail** panel shows who changed what and when.`,
      tasks: [
        "Create audit_log and AFTER UPDATE triggers on members (status, payout_method) and accounts (allow_negative), plus triggers that make the log append-only",
        "Replay the day's changes as their real actors: the seller portal, ops, and a fraud-sweep job",
        "Query the trail so each changed field is one row with its old and new value",
        "Try to rewrite history (an UPDATE and a DELETE on audit_log) under -- expect error and watch both be refused",
      ],
      starterAdd: sql`-- ── ✏️ YOUR TURN ───────────────────────────
-- Lesson 9: an audit trail you can trust. session_ctx (id, actor, tenant_id) holds the current actor.
--
-- 1. audit_log: audit_id INTEGER PRIMARY KEY, tenant_id INTEGER NOT NULL, at TEXT NOT NULL, actor TEXT NOT NULL,
--      table_name TEXT NOT NULL, row_id INTEGER NOT NULL, action TEXT NOT NULL ('insert', 'update' or 'delete'),
--      before_json TEXT and after_json TEXT (both NULL or valid JSON)
--    Triggers (all AFTER UPDATE OF …, firing only when a value really changed, using IS NOT):
--      trg_audit_members:  members.status or members.payout_method.
--         row_id = member_id, before/after = json_object('status', …, 'payout_method', …)
--      trg_audit_accounts: accounts.allow_negative.
--         row_id = account_id, before/after = json_object('allow_negative', …)
--      at = (SELECT now FROM clock), actor = (SELECT actor FROM session_ctx), action 'update'
--    Plus trg_audit_append_only_update and trg_audit_append_only_delete: BEFORE UPDATE / DELETE on audit_log, always abort.
--
-- 2. Make the day's changes, setting the actor first each time (UPDATE session_ctx SET actor = '...'):
--      'api:seller-portal': member 'kestrel' payout_method becomes 'paused'
--      'ops:rhea':          member 'tansy' status becomes 'suspended'; and tenant 1's 'clearing' account gets allow_negative = 1
--      'job:fraud-sweep':   member 'tansy' status becomes 'active' again
--    Finish by setting the actor back to 'system:console'.
--
-- 3. The trail, one row per changed field, ordered by audit_id:
--      audit_id, at, actor, table_name, row_id, field, old_value, new_value
--    (explode before_json with json_each and compare with the same key in after_json using IS NOT)
--
-- 4. Tamper with the evidence: under  -- expect error  try UPDATE audit_log SET actor = 'nobody', and under a second
--    -- expect error  try DELETE FROM audit_log. Both must be refused.
`,
      solutionAdd: sql`-- The log and the triggers that fill it
CREATE TABLE audit_log (
  audit_id INTEGER PRIMARY KEY,
  tenant_id INTEGER NOT NULL,
  at TEXT NOT NULL,
  actor TEXT NOT NULL,
  table_name TEXT NOT NULL,
  row_id INTEGER NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('insert', 'update', 'delete')),
  before_json TEXT CHECK (before_json IS NULL OR json_valid(before_json)),
  after_json TEXT CHECK (after_json IS NULL OR json_valid(after_json))
);

CREATE TRIGGER trg_audit_members
AFTER UPDATE OF status, payout_method ON members
WHEN OLD.status IS NOT NEW.status OR OLD.payout_method IS NOT NEW.payout_method
BEGIN
  INSERT INTO audit_log (tenant_id, at, actor, table_name, row_id, action, before_json, after_json)
  VALUES (
    NEW.tenant_id,
    (SELECT now FROM clock),
    (SELECT actor FROM session_ctx),
    'members',
    NEW.member_id,
    'update',
    json_object('status', OLD.status, 'payout_method', OLD.payout_method),
    json_object('status', NEW.status, 'payout_method', NEW.payout_method)
  );
END;

CREATE TRIGGER trg_audit_accounts
AFTER UPDATE OF allow_negative ON accounts
WHEN OLD.allow_negative IS NOT NEW.allow_negative
BEGIN
  INSERT INTO audit_log (tenant_id, at, actor, table_name, row_id, action, before_json, after_json)
  VALUES (
    NEW.tenant_id,
    (SELECT now FROM clock),
    (SELECT actor FROM session_ctx),
    'accounts',
    NEW.account_id,
    'update',
    json_object('allow_negative', OLD.allow_negative),
    json_object('allow_negative', NEW.allow_negative)
  );
END;

CREATE TRIGGER trg_audit_append_only_update
BEFORE UPDATE ON audit_log
BEGIN
  SELECT RAISE(ABORT, 'the audit log is append-only');
END;

CREATE TRIGGER trg_audit_append_only_delete
BEFORE DELETE ON audit_log
BEGIN
  SELECT RAISE(ABORT, 'the audit log is append-only');
END;

-- The day's changes, each under its own actor
UPDATE session_ctx SET actor = 'api:seller-portal';
UPDATE members SET payout_method = 'paused' WHERE handle = 'kestrel';

UPDATE session_ctx SET actor = 'ops:rhea';
UPDATE members SET status = 'suspended' WHERE handle = 'tansy';
UPDATE accounts SET allow_negative = 1 WHERE tenant_id = 1 AND role = 'clearing';

UPDATE session_ctx SET actor = 'job:fraud-sweep';
UPDATE members SET status = 'active' WHERE handle = 'tansy';

UPDATE session_ctx SET actor = 'system:console';

-- Read the trail: one line per changed field
SELECT a.audit_id, a.at, a.actor, a.table_name, a.row_id,
       j.key AS field,
       j.value AS old_value,
       json_extract(a.after_json, '$.' || j.key) AS new_value
FROM audit_log AS a, json_each(a.before_json) AS j
WHERE a.action = 'update' AND j.value IS NOT json_extract(a.after_json, '$.' || j.key)
ORDER BY a.audit_id;

-- Nobody can rewrite history
-- expect error
UPDATE audit_log SET actor = 'nobody';

-- expect error
DELETE FROM audit_log;`,
      explanation:
        "The triggers read who from session_ctx and when from the clock, and record only the audited fields as before and after JSON. The WHEN guards use IS NOT so a NULL-to-value change is caught and a no-op update writes nothing. Two BEFORE triggers make the log append-only. json_each turns each before-image into key/value rows and json_extract finds the same key in the after-image, so each changed field becomes one readable line.",
      hints: [
        { id: "h1", title: "A guarded audit trigger", content: "CREATE TRIGGER trg_audit_members AFTER UPDATE OF status, payout_method ON members WHEN OLD.status IS NOT NEW.status OR OLD.payout_method IS NOT NEW.payout_method BEGIN INSERT INTO audit_log (tenant_id, at, actor, table_name, row_id, action, before_json, after_json) VALUES (NEW.tenant_id, (SELECT now FROM clock), (SELECT actor FROM session_ctx), 'members', NEW.member_id, 'update', json_object(…OLD…), json_object(…NEW…)); END;" },
        { id: "h2", title: "Append-only", content: "CREATE TRIGGER trg_audit_append_only_update BEFORE UPDATE ON audit_log BEGIN SELECT RAISE(ABORT, 'the audit log is append-only'); END; and the same for DELETE." },
        { id: "h3", title: "One row per field", content: "FROM audit_log a, json_each(a.before_json) j gives key and value of each before-field. new_value is json_extract(a.after_json, '$.' || j.key). Keep only rows where j.value IS NOT json_extract(a.after_json, '$.' || j.key)." },
      ],
      tests: [
        {
          id: "t1",
          description: "audit_log exists with the agreed columns and cannot be edited or deleted",
          assertionCode: t`for (const c of ["audit_id", "tenant_id", "at", "actor", "table_name", "row_id", "action", "before_json", "after_json"]) assert(cols("audit_log").includes(c), "audit_log needs a column named " + c);
assert(probe("UPDATE audit_log SET actor = 'someone else'") !== null, "The audit log must refuse UPDATE");
assert(probe("DELETE FROM audit_log") !== null, "The audit log must refuse DELETE");
assert(probe("INSERT INTO audit_log (tenant_id, at, actor, table_name, row_id, action, before_json) VALUES (1, 'x', 'a', 't', 1, 'update', 'not json')") !== null, "before_json must be NULL or valid JSON");
assert(probe("INSERT INTO audit_log (tenant_id, at, actor, table_name, row_id, action) VALUES (1, 'x', 'a', 't', 1, 'rename')") !== null, "action must be insert, update or delete");
assert(probe("INSERT INTO audit_log (tenant_id, at, actor, table_name, row_id, action) VALUES (1, 'x', NULL, 't', 1, 'update')") !== null, "actor must not be NULL");
assertEqual(accepted().length, 0, "A statement under -- expect error was accepted: the audit log can be edited");
assert(refused().filter((e) => /audit_log/i.test(e.sql)).length >= 2, "Show two refusals with -- expect error: an UPDATE and a DELETE on audit_log");`,
        },
        {
          id: "t2",
          description: "The triggers record real changes only, with the actor and clock time, and ignore no-op updates",
          assertionCode: t`const count = () => num("SELECT COUNT(*) FROM audit_log");
query("SAVEPOINT noop");
const before = count();
query("UPDATE members SET status = status, payout_method = payout_method WHERE handle = 'odalys'");
query("UPDATE accounts SET allow_negative = allow_negative WHERE role = 'bank'");
const after = count();
query("ROLLBACK TO noop");
query("RELEASE noop");
assertEqual(after, before, "An UPDATE that changes nothing must not write audit rows");
assertEqual(num("SELECT COUNT(*) FROM audit_log"), 4, "The day's four real changes should be in the log, and nothing else");
const nullCase = probe("UPDATE members SET payout_method = 'paused' WHERE handle = 'odalys'; UPDATE members SET payout_method = NULL WHERE handle = 'odalys'");
assertEqual(nullCase, null, "Changing a NULL payout method to a value and back must be allowed");`,
        },
        {
          id: "t3",
          description: "The four changes are on record with the right actors, rows and values, and the actor was reset",
          assertionCode: t`const trail = query("SELECT audit_id, at, actor, tenant_id, table_name, row_id, action, before_json, after_json FROM audit_log ORDER BY audit_id");
assertEqual(trail.length, 4, "Four audit rows");
const kestrel = one("SELECT member_id AS id FROM members WHERE handle = 'kestrel'").id;
const tansy = one("SELECT member_id AS id FROM members WHERE handle = 'tansy'").id;
const clearing = one("SELECT account_id AS id FROM accounts WHERE tenant_id = 1 AND role = 'clearing'").id;
const want = [
  ["api:seller-portal", "members", kestrel, "payout_method", "bank_transfer", "paused"],
  ["ops:rhea", "members", tansy, "status", "active", "suspended"],
  ["ops:rhea", "accounts", clearing, "allow_negative", 0, 1],
  ["job:fraud-sweep", "members", tansy, "status", "suspended", "active"],
];
const now = one("SELECT now FROM clock").now;
trail.forEach((r, i) => {
  const [actor, table, id, field, was, now_] = want[i];
  assertEqual(r.actor, actor, "actor of audit row " + (i + 1));
  assertEqual(r.table_name, table, "table_name of audit row " + (i + 1));
  assertEqual(r.row_id, id, "row_id of audit row " + (i + 1));
  assertEqual(r.action, "update", "action of audit row " + (i + 1));
  assertEqual(r.tenant_id, 1, "tenant_id of audit row " + (i + 1));
  assertEqual(r.at, now, "at should come from the clock table");
  assertEqual(JSON.parse(r.before_json)[field], was, "before_json." + field + " of audit row " + (i + 1));
  assertEqual(JSON.parse(r.after_json)[field], now_, "after_json." + field + " of audit row " + (i + 1));
});
assertEqual(one("SELECT actor FROM session_ctx").actor, "system:console", "Set the actor back to 'system:console' when you are done");`,
        },
        {
          id: "t4",
          description: "The trail query shows one row per changed field with old and new values",
          assertionCode: t`const got = data(["audit_id", "at", "actor", "table_name", "row_id", "field", "old_value", "new_value"], "Add the trail: audit_id, at, actor, table_name, row_id, field, old_value, new_value", /json_each/);
assertEqual(got.length, 4, "Four changed fields, so four rows");
const first = got.find((r) => r.field === "payout_method");
assert(first, "A row for the payout_method change");
assertEqual(String(first.old_value), "bank_transfer", "old_value of payout_method");
assertEqual(String(first.new_value), "paused", "new_value of payout_method");
const flag = got.find((r) => r.field === "allow_negative");
assert(flag, "A row for the allow_negative change");
assertEqual(String(flag.old_value) + ">" + String(flag.new_value), "0>1", "allow_negative old and new");
const tansy = got.filter((r) => r.row_id === one("SELECT member_id AS id FROM members WHERE handle = 'tansy'").id).sort((a, b) => a.audit_id - b.audit_id);
assertEqual(tansy.map((r) => String(r.old_value) + ">" + String(r.new_value)), ["active>suspended", "suspended>active"], "Tansy's status history");
assertEqual(got.map((r) => r.audit_id), [...got.map((r) => r.audit_id)].sort((a, b) => a - b), "Order by audit_id");`,
        },
      ],
      unlocks: ["ch-audit"],
      checks: [
        {
          prompt: "Why compare with `OLD.status IS NOT NEW.status` instead of `OLD.status <> NEW.status`?",
          question: {
            type: "choice",
            options: [
              "IS NOT treats NULL as an ordinary value, so a change from NULL to something is detected",
              "<> is not allowed inside triggers",
              "IS NOT is faster",
              "<> compares text case-insensitively",
            ],
            answer: 0,
          },
          explanation: "With <>, comparing NULL to a value gives NULL (neither true nor false), so the WHEN guard would skip a real change from or to NULL. IS NOT is the NULL-safe comparison.",
        },
        {
          prompt: "Why should the audit trigger NOT copy a member's name and email into the log?",
          question: {
            type: "choice",
            options: [
              "The log is append-only, so personal data copied into it could never be erased when a member asks to be forgotten",
              "JSON cannot hold text with spaces",
              "It would make the trigger slower",
              "Names change too often",
            ],
            answer: 0,
          },
          explanation: "Immutability is the point of an audit log, and it is also the problem for personal data. Record that something changed, not the personal data itself.",
        },
      ],
    },
  ],
};
