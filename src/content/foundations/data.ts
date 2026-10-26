import type { ConceptLesson, Module } from "../../learn/types.ts";

/** Fenced code blocks for lesson prose. */
const sql = (code: string) => "~~~sql\n" + code.trim() + "\n~~~";
const py = (code: string) => "~~~python\n" + code.trim() + "\n~~~";
const txt = (code: string) => "~~~text\n" + code.replace(/^\n+|\s+$/g, "") + "\n~~~";

/** The ticket table every SQL exercise starts from (built for the learner in the starter code). */
const TICKETS_SEED = `-- 3,000 concert tickets, built for you:
CREATE TABLE tickets (id INTEGER PRIMARY KEY, order_no INT, venue TEXT, show_date TEXT, status TEXT, price INT);
WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM n WHERE i < 3000)
INSERT INTO tickets (order_no, venue, show_date, status, price)
SELECT i * 7, CASE i % 3 WHEN 0 THEN 'Hall A' WHEN 1 THEN 'Hall B' ELSE 'Arena' END,
       date('2027-01-01', '+' || (i % 300) || ' days'), CASE WHEN i % 50 = 0 THEN 'open' ELSE 'sold' END, 40 + i % 60 FROM n;
`;

const lessons: ConceptLesson[] = [
  // ─────────────────────────────── 1. How an index finds a row ───────────────────────────────
  {
    id: "fnd-data-1-index-btree",
    title: "How an index finds a row",
    summary: "Pages, full scans, and the B-tree that finds one row in three page reads.",
    minutes: 12,
    xp: 70,
    steps: [
      {
        kind: "explain",
        title: "The cost is pages, not rows",
        body: "A database does not read a table one row at a time. It stores rows in **pages**: fixed-size blocks, usually 8 KB, that each hold a few dozen to a few hundred rows. Asking the disk (or the cache) for a page is the unit of work, so the useful question about any query is: **how many pages does it have to touch?**\n\nYour concert-ticket site has a `tickets` table. The simplest way to find order number 651 is to open the first page, look through its rows, open the next page, and carry on until the order turns up. That is a **full scan**. Try it on this tiny table of 64 rows, 4 per page.",
        widget: { type: "data-btree", props: { mode: "scan", fixedMode: true } },
      },
      {
        kind: "question",
        title: "Count the pages",
        body: "Order **651** is already picked below. Keep pressing 'Read next page' until the scan finds it. How many pages did it read?",
        widget: { type: "data-btree", props: { mode: "scan", fixedMode: true, key0: 651 }, live: true },
        question: { type: "number", answer: 15 },
        explanation: "Order 651 sits on page **15** of 16, so the scan read 15 pages: everything before it, plus its own. A missing order would have cost all 16, because the scan can only be sure after the last page. And this table is tiny: a million-row table would need around ten thousand page reads for the same job.",
      },
      {
        kind: "explain",
        title: "A second, sorted structure",
        body: "An **index** is a separate structure, kept in sorted order by one or more columns, that tells the database where rows live. The usual shape is a **B-tree**: a tree where every node is a page full of sorted keys.\n\n- A **leaf** page holds keys in order, each with a pointer to its row.\n- An **internal** page holds boundary keys and pointers to child pages: 'keys up to 255 are down this branch, keys up to 399 down that one'.\n- A lookup starts at the **root**, follows one branch per level, and ends at one leaf.\n\nThe tree below has 64 keys, 4 children per node and three levels. Switch to the index and read it page by page: the first read is always the root.",
        widget: { type: "data-btree", props: { mode: "index", fixedMode: true } },
      },
      {
        kind: "question",
        title: "Look up something that is not there",
        body: "Use the index to look up order **340** and read pages until it finishes. (There is no order 340: orders here go ...336, 345...)",
        widget: { type: "data-btree", props: { mode: "index", fixedMode: true, key0: 340 } },
        question: { type: "widget", goal: { mode: "index", key: 340, done: true }, prompt: "Finish the lookup for order 340." },
        explanation: "The index finished with a firm 'not here' after **3 page reads**: root, middle, leaf. The leaf where 340 would live is sorted, so seeing 336 followed by 345 proves there is no 340. A scan could only have said so after the last page.",
      },
      {
        kind: "question",
        title: "How many pages was that?",
        body: "A lookup in this index, found or not found, reads how many pages?",
        question: { type: "number", answer: 3 },
        explanation: "**Three**: one page per level of the tree. The cost of an index lookup is the tree's **depth**, and that stays small even as the table grows, as the next step shows.",
      },
      {
        kind: "explain",
        title: "Depth grows by one when the table grows a thousand-fold",
        body: "Each index page holds many keys: with 8 KB pages and small keys, 200 or more. So each level of the tree multiplies how many rows you can reach by about 200:\n\n" +
          txt(`
1 level   (root only)    ~       200 rows
2 levels                 ~    40,000 rows
3 levels                 ~ 8,000,000 rows
4 levels                 ~ 1.6 billion rows
`) +
          "\nDepth is roughly the logarithm of the row count, base 'keys per page'. Slide the table size up and compare the pages a scan needs (100 rows per page) with the pages the index needs.",
        widget: { type: "data-btree", props: { mode: "index", fixedMode: true, scale: true } },
      },
      {
        kind: "question",
        title: "A thousand times bigger",
        body: "Your table grows from 1 million rows to **1 billion** (a thousand times more). With about 200 keys per index page, how much slower is an index lookup?",
        question: {
          type: "choice",
          options: ["About a thousand times slower", "About twice as slow", "About one page read more", "No change at all: it's a constant"],
          answer: 2,
        },
        explanation: "Going from 3 levels to 4 means **one extra page read**. A scan, meanwhile, got a thousand times slower. That gap is why a lookup by key on a huge table can still take milliseconds.",
      },
      {
        kind: "question",
        title: "The lookup, in order",
        body: "Put the steps of an index lookup in order.",
        question: {
          type: "order",
          items: [
            "Read the root page and pick the child whose key range contains the target",
            "Read that middle page and pick the child leaf that covers the target",
            "Read the leaf and search its sorted keys for the target",
            "Follow the leaf's pointer to the row in the table",
          ],
        },
        explanation: "One page per level, each time narrowing the search to a single child, then one hop to the row itself. Every step can skip huge parts of the data because the keys are **sorted**.",
      },
      {
        kind: "explain",
        title: "Nothing is free",
        body: "An index is a trade. It makes **reads by that key** fast, and in return:\n\n- **Writes get slower.** Every INSERT, UPDATE of an indexed column and DELETE must also change the index, and sometimes split a full page in two.\n- **It costs space.** A big index can be as large as the table.\n- **It only helps queries shaped like it.** An index on `order_no` does nothing for a search by `venue`.\n- **It is not always used.** If a query wants most of a table, reading it straight through beats hopping through a tree for every row. The query planner makes that call, and the next lessons show you how to watch it.\n\nThe skill is picking the few indexes your real queries need, not indexing every column.",
      },
      {
        kind: "code",
        title: "How many levels?",
        body: "Write `index_depth(rows, fanout)`: the number of levels (and so page reads) a B-tree needs to cover `rows` keys when each page has `fanout` children. One level reaches `fanout` rows, two levels reach `fanout * fanout`, and so on. The smallest answer is 1.",
        language: "python",
        starter: `def index_depth(rows, fanout):
    # how many levels until fanout ** levels reaches rows?
    return 0
`,
        solution: `def index_depth(rows, fanout):
    levels = 1
    reach = fanout
    while reach < rows:
        reach *= fanout
        levels += 1
    return levels
`,
        tests: [
          { id: "t1", description: "64 rows, 4 children per page: 3 levels", assertionCode: `assert index_depth(64, 4) == 3, f"index_depth(64, 4) should be 3, got {index_depth(64, 4)}"` },
          { id: "t2", description: "1,000,000 rows, 200 per page: 3 levels", assertionCode: `assert index_depth(1_000_000, 200) == 3, f"expected 3, got {index_depth(1_000_000, 200)}"` },
          { id: "t3", description: "1,000,000,000 rows, 200 per page: 4 levels", assertionCode: `assert index_depth(1_000_000_000, 200) == 4, f"expected 4, got {index_depth(1_000_000_000, 200)}"` },
          { id: "t4", description: "Always at least one level", assertionCode: `assert index_depth(1, 50) == 1 and index_depth(10, 10) == 1 and index_depth(11, 10) == 2, "10 rows fit in one level of 10; 11 need two"` },
        ],
        hints: ["Start with levels = 1 and reach = fanout.", "While reach < rows, multiply reach by fanout and add one level."],
      },
      {
        kind: "code",
        title: "Turn a scan into a seek",
        body: "SQLite can tell you how it plans to run a query: put `EXPLAIN QUERY PLAN` in front of it. The plan below says `SCAN tickets`: every row is read. Add one statement, **before** the EXPLAIN line, that creates an index on `order_no`, and the plan should change to a `SEARCH`.",
        language: "sql",
        starter: TICKETS_SEED + `
-- Add your CREATE INDEX statement here:

EXPLAIN QUERY PLAN
SELECT * FROM tickets WHERE order_no = 4200;
`,
        solution: TICKETS_SEED + `
CREATE INDEX idx_tickets_order_no ON tickets (order_no);

EXPLAIN QUERY PLAN
SELECT * FROM tickets WHERE order_no = 4200;
`,
        tests: [
          { id: "t1", description: "The plan is a SEARCH, not a SCAN", assertionCode: `assert(rows.length > 0 && rows.some((r) => /SEARCH/.test(String(r.detail))), "The plan still has no SEARCH. Did the CREATE INDEX come before the EXPLAIN line?")` },
          { id: "t2", description: "It uses an index on order_no", assertionCode: `assert(rows.some((r) => /USING (COVERING )?INDEX/.test(String(r.detail)) && /order_no/.test(String(r.detail))), "The plan should say USING INDEX ... (order_no=?)")` },
          { id: "t3", description: "The table is untouched", assertionCode: `assertEqual(query("SELECT COUNT(*) AS n FROM tickets")[0].n, 3000, "tickets should still have 3000 rows")` },
        ],
        hints: ["CREATE INDEX a_name ON tickets (order_no);", "Statements run top to bottom, so the index must exist before EXPLAIN QUERY PLAN runs."],
      },
      {
        kind: "recap",
        points: [
          "A database reads **pages**, not rows; the cost of a query is the number of pages it touches.",
          "A **full scan** reads every page. An **index** is a sorted B-tree, so a lookup reads one page per level: usually 3 or 4, even for a billion rows.",
          "Index depth grows with the **logarithm** of the table size, so a thousand-fold bigger table costs about one more page.",
          "Indexes cost write time and space, and only help queries shaped like their key.",
          "`EXPLAIN QUERY PLAN` shows whether a query will `SCAN` the table or `SEARCH` an index.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 2. Choosing the right index ───────────────────────────────
  {
    id: "fnd-data-2-index-kinds",
    title: "Choosing the right index",
    summary: "Column order, partial, expression and covering indexes, plus the inverted and block-range ideas.",
    minutes: 14,
    xp: 80,
    steps: [
      {
        kind: "explain",
        title: "An index is sorted by its first column first",
        body: "An index on **two columns** is not two indexes. It is one sorted list, ordered by the first column, then by the second inside each group of equal first values:\n\n" +
          txt(`
index on (venue, show_date)

Arena   2027-03-11
Arena   2027-03-12
Hall A  2027-03-11
Hall A  2027-03-12   <- every Hall A entry sits together,
Hall A  2027-03-13      and its dates are in order
Hall B  2027-03-11
`) +
          "\nThat has a sharp consequence, the **leftmost prefix rule**: the index can narrow a search using its first column, and then its second, and so on, but only if each earlier column is pinned down. Below is a million-row `tickets` table and a query that only knows the **date**. Try each index and watch how many entries it has to walk.",
        widget: { type: "data-indexes", props: { scenario: "prefix" } },
      },
      {
        kind: "question",
        title: "Find the index that can start from the date",
        body: "Pick the index that lets the database **seek** to the date instead of scanning the table.",
        widget: { type: "data-indexes", props: { scenario: "prefix" } },
        question: { type: "widget", goal: { scenario: "prefix", kind: "seek" }, prompt: "Choose an index that turns the SCAN into a SEARCH." },
        explanation: "Only the index that **starts with show_date** can be entered from a date alone. (venue, show_date) is sorted by venue first, so the dates are scattered through it: with no venue to jump to, it is no use. The same two columns, in the other order, make a completely different index.",
      },
      {
        kind: "explain",
        title: "Equality first, then one range",
        body: "Real queries mix tests. A good rule of thumb for composite indexes: put the columns tested with **=** first, and the column tested with a **range** (BETWEEN, <, >) last. A range column can narrow the search, but once the index is walking a range the later columns are no longer in one tidy run, so they cannot narrow it further.\n\nThis query wants Hall A, one week. Compare (venue, show_date) with (show_date, venue).",
        widget: { type: "data-indexes", props: { scenario: "range" } },
      },
      {
        kind: "question",
        title: "Order the columns",
        body: "Which index reads the fewest entries for the Hall A, one-week query?",
        widget: { type: "data-indexes", props: { scenario: "range" } },
        question: { type: "widget", goal: { scenario: "range", index: "venue_date" }, prompt: "Pick the best of the four indexes." },
        explanation: "(venue, show_date): jump to Hall A, then to the first day of the week inside it, then read seven days in a row: about 960 entries. (show_date, venue) can only use the date range, so it walks every venue's tickets for that week, about 19,000 entries, and checks the venue on each.",
      },
      {
        kind: "question",
        title: "Which queries can use it?",
        body: "A table has an index on **(a, b, c)**. Which of these queries can use it to *start* a seek (the index may only help with some of the columns)?",
        question: {
          type: "choice",
          options: ["WHERE a = 1", "WHERE b = 2", "WHERE a = 1 AND c = 3", "WHERE b = 2 AND c = 3", "WHERE a = 1 AND b = 2"],
          answer: [0, 2, 4],
        },
        explanation: "Anything that pins down **a** can start the seek. In 'a = 1 AND c = 3' the index narrows on a, then c is checked on each match, because b is missing and breaks the chain. Queries that skip **a** altogether (b alone, or b and c) cannot start anywhere in this index.",
      },
      {
        kind: "explain",
        title: "Index only the rows you search",
        body: "Most tickets on the site are sold. Only about 2% are 'open', and the checkout page only ever asks for open ones. A **partial index** (SQL Server calls it a filtered index) holds entries for just those rows:\n\n" +
          sql(`
CREATE INDEX idx_open_by_date ON tickets (show_date)
  WHERE status = 'open';
`) +
          "\nIt is 50 times smaller than a full index, so it fits in memory, and inserting a sold ticket does not touch it at all. The catch: the planner can only use it when the query's own WHERE clause includes the same condition.",
        widget: { type: "data-indexes", props: { scenario: "partial" } },
      },
      {
        kind: "question",
        title: "Smallest wins",
        body: "The checkout query asks for open tickets on one date. Which index does the least work?",
        widget: { type: "data-indexes", props: { scenario: "partial" } },
        question: { type: "widget", goal: { scenario: "partial", workMax: 200 }, prompt: "Choose the index that reads under 200 entries in total." },
        explanation: "The partial index stores only open tickets, ordered by date: jumping to one date reads about 55 entries. The others either match far more rows (status alone: a quarter of the table) or have to hold every ticket (show_date, show_date + status).",
      },
      {
        kind: "explain",
        title: "Indexes on expressions",
        body: "The sign-up form compares e-mail addresses ignoring case, so queries look like `WHERE lower(email) = 'ana@example.com'`. An ordinary index on `email` is sorted by the stored text, not by its lower-case version, so it cannot help: the database would have to compute lower() for every row.\n\nAn **expression index** stores the computed value instead:\n\n" +
          sql(`
CREATE INDEX idx_email_lower ON tickets (lower(email));
`) +
          "\nThe query must use the **same expression**. The same trap appears whenever a function wraps an indexed column (`WHERE year(show_date) = 2027`): the index sorts show_date, not year(show_date).",
        widget: { type: "data-indexes", props: { scenario: "expr" } },
      },
      {
        kind: "question",
        title: "Never touch the table",
        body: "This query only needs two columns, `show_date` and `price`, for a venue. An index normally tells the database *where* the rows are, and then it fetches each one from the table. A **covering index** holds every column the query needs, so the table is skipped entirely. Choose the index that covers it.",
        widget: { type: "data-indexes", props: { scenario: "covering" } },
        question: { type: "widget", goal: { scenario: "covering", kind: "covering" }, prompt: "Pick the index that covers the query." },
        explanation: "(venue, show_date, price) holds venue to find the rows and the two columns the query returns, so there are **0 table fetches**: half the work. The cost is a wider index to store and update. PostgreSQL spells this INCLUDE; in SQLite (and most others) you simply add the columns to the end of the key.",
      },
      {
        kind: "explain",
        title: "Beyond B-trees: inverted indexes",
        body: "A B-tree is great for 'this value' and 'this range'. But a recipe app has a different question: **which recipes contain chickpea, garlic and harissa?** Each recipe holds *many* ingredients, and a B-tree sorts one value per row.\n\nAn **inverted index** flips the table: for every ingredient it keeps a sorted list of the recipe numbers that use it. Finding recipes with several ingredients is then a quick merge of short lists. PostgreSQL's GIN indexes work this way (for arrays, JSON and full-text words), and so do search engines. The price is slow writes, because one recipe adds entries to many lists.",
        widget: { type: "data-inverted" },
      },
      {
        kind: "question",
        title: "Intersect the lists",
        body: "Pick **chickpea**, **garlic** and **harissa**. Which one recipe has all three?",
        widget: { type: "data-inverted" },
        question: { type: "widget", goal: { matches: [2], tagsMin: 3 }, prompt: "Select the three ingredients and look at the match." },
        explanation: "chickpea → 1, 2. garlic → 1, 2, 4, 5, 8. harissa → 2, 5. Only recipe **2** (the harissa carrot tray bake) is in all three lists. No recipe was opened to decide that.",
      },
      {
        kind: "explain",
        title: "Beyond B-trees: block-range indexes",
        body: "Some tables are huge and **append-only**: a log of door scans, sensor readings, payments. Rows arrive in time order, and queries ask for a time window. A **block-range index** (PostgreSQL calls it BRIN) stores just one tiny summary per block of rows: the smallest and largest value inside it. A query skips every block whose range cannot overlap what it wants.\n\nIt is thousands of times smaller than a B-tree, and nearly free to maintain. But it only works if the table's **physical order follows the column**. Flip the switch to see what happens when it does not.",
        widget: { type: "data-brin" },
      },
      {
        kind: "question",
        title: "When the order is lost",
        body: "Store the rows in random order and look at how many of the 12 blocks the query must read.",
        widget: { type: "data-brin" },
        question: { type: "widget", goal: { sorted: false, blocksMin: 9 }, prompt: "Switch to random order and see the damage." },
        explanation: "With rows in random order each block spans nearly the whole time range, so its min and max rule out almost nothing: **all or nearly all blocks are read**. A block-range index is a bet on the physical layout.",
      },
      {
        kind: "question",
        title: "Pick the technique",
        body: "A table of 2 billion door-scan events grows by appending, and dashboards ask for 'events between 6pm and 7pm last Friday'. Which index is the best fit?",
        question: {
          type: "choice",
          options: ["A B-tree on every column", "A block-range index on the timestamp", "An inverted index on the timestamp", "No index: always scan"],
          answer: 1,
        },
        explanation: "Append-only data queried by time window is exactly the block-range index's niche: tiny and cheap to keep, and the data is already in time order. A B-tree would work but costs far more space and write time.",
      },
      {
        kind: "code",
        title: "Fix the column order",
        body: "Someone created an index on **(show_date, venue)** for the Hall A, one-week query, and the plan still doesn't narrow by venue. Replace it with an index in the better order so the plan seeks on **both** `venue=?` and the date range.",
        language: "sql",
        starter: TICKETS_SEED + `
-- Someone's first guess:
CREATE INDEX idx_date_venue ON tickets (show_date, venue);

EXPLAIN QUERY PLAN
SELECT * FROM tickets
WHERE venue = 'Hall A' AND show_date BETWEEN '2027-03-01' AND '2027-03-07';
`,
        solution: TICKETS_SEED + `
DROP INDEX IF EXISTS idx_date_venue;
CREATE INDEX idx_venue_date ON tickets (venue, show_date);

EXPLAIN QUERY PLAN
SELECT * FROM tickets
WHERE venue = 'Hall A' AND show_date BETWEEN '2027-03-01' AND '2027-03-07';
`,
        tests: [
          { id: "t1", description: "The plan seeks using the index", assertionCode: `assert(rows.some((r) => /SEARCH/.test(String(r.detail))), "The plan should be a SEARCH using an index")` },
          { id: "t2", description: "It narrows on venue first (venue=?)", assertionCode: `assert(rows.some((r) => /venue=\\?/.test(String(r.detail))), "The plan should mention venue=?: put the equality column first in the index")` },
          { id: "t3", description: "And on the date range too", assertionCode: `assert(rows.some((r) => /show_date>\\?/.test(String(r.detail))), "The plan should also narrow with the show_date range")` },
        ],
        hints: ["Equality columns first, the range column last.", "You may drop the old index first (DROP INDEX idx_date_venue;) so the planner has only one good choice."],
      },
      {
        kind: "recap",
        points: [
          "A composite index is sorted by its **first column first**: queries must pin down the leading columns to use it (the leftmost prefix rule).",
          "Put **equality** columns before the **range** column.",
          "A **partial** index covers only the rows you query, a lot smaller. An **expression** index stores a computed value, and the query must use the same expression.",
          "A **covering** index holds every column the query reads, so the table is never touched.",
          "**Inverted** (GIN-style) indexes answer 'which rows contain these items'; **block-range** (BRIN-style) indexes summarise blocks and need data stored in the order you query.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 3. Reading a query plan ───────────────────────────────
  {
    id: "fnd-data-3-query-plans",
    title: "Reading a query plan",
    summary: "Scan versus seek, how joins run, and what it means when estimated and actual rows disagree.",
    minutes: 13,
    xp: 80,
    steps: [
      {
        kind: "explain",
        title: "The planner decides; EXPLAIN tells you",
        body: "You write **what** you want; the database's **query planner** picks **how** to get it. It weighs the available indexes, guesses how many rows each step produces, and chooses the plan it thinks is cheapest. `EXPLAIN` prints that plan so you can check the guess.\n\nSQLite's plans are short and easy to read:\n\n" +
          txt(`
SEARCH tickets USING INDEX idx_venue (venue=?)
USE TEMP B-TREE FOR ORDER BY
`) +
          "\nThe words to know:\n\n- **SCAN** table: reads every row.\n- **SEARCH** … **USING INDEX**: jumps through an index (the condition in brackets is what it seeks on).\n- **USING COVERING INDEX**: the index alone answers it; the table is skipped.\n- **USE TEMP B-TREE FOR ORDER BY**: rows came out in the wrong order, so they are sorted separately.\n\nPostgreSQL and MySQL use different words (Seq Scan, Index Scan, Index Only Scan, filesort) for the same ideas, and they add estimated and actual row counts, which we meet in a minute.",
      },
      {
        kind: "question",
        title: "Read this plan",
        body: txt(`
SEARCH tickets USING INDEX idx_venue (venue=?)
USE TEMP B-TREE FOR ORDER BY
`) + "\nWhat is the database doing?",
        question: {
          type: "choice",
          options: [
            "Reading every ticket, then sorting them",
            "Jumping to one venue's tickets through the index, then sorting those rows because the index doesn't deliver them in the requested order",
            "Reading only the index and never the table",
            "Joining two tables with a temporary tree",
          ],
          answer: 1,
        },
        explanation: "SEARCH ... USING INDEX means a seek on `venue`, so not a full read. The extra line says the ORDER BY column isn't the index's next column, so the rows needed a separate sort. A later exercise removes that sort.",
      },
      {
        kind: "code",
        title: "Don't hide the column",
        body: "This query finds tickets for March 2027. There is an index on `show_date`, yet the plan is a `SCAN`: wrapping the column in `strftime()` means the database must compute it for every row, so it cannot use a sorted list of the *stored* dates. Rewrite the WHERE clause as a **range on the bare column**, so the plan becomes a SEARCH on `idx_date`.",
        language: "sql",
        starter: TICKETS_SEED + `
CREATE INDEX idx_date ON tickets (show_date);

EXPLAIN QUERY PLAN
SELECT * FROM tickets
WHERE strftime('%Y-%m', show_date) = '2027-03';
`,
        solution: TICKETS_SEED + `
CREATE INDEX idx_date ON tickets (show_date);

EXPLAIN QUERY PLAN
SELECT * FROM tickets
WHERE show_date >= '2027-03-01' AND show_date < '2027-04-01';
`,
        tests: [
          { id: "t1", description: "The plan is a SEARCH", assertionCode: `assert(rows.some((r) => /SEARCH/.test(String(r.detail))), "Still scanning: compare show_date itself, not a function of it")` },
          { id: "t2", description: "It uses idx_date on show_date", assertionCode: `assert(rows.some((r) => /idx_date/.test(String(r.detail)) && /show_date/.test(String(r.detail))), "The plan should use idx_date with a show_date range")` },
          { id: "t3", description: "No full SCAN of tickets remains", assertionCode: `assert(!rows.some((r) => /SCAN/.test(String(r.detail))), "The plan should not SCAN tickets")` },
        ],
        hints: ["March is every date from 2027-03-01 up to, but not including, 2027-04-01.", "WHERE show_date >= '2027-03-01' AND show_date < '2027-04-01'"],
      },
      {
        kind: "code",
        title: "Remove the sort",
        body: "The query below returns Hall A's tickets in date order. The plan seeks on venue, then needs `USE TEMP B-TREE FOR ORDER BY`. Add an index so the rows come out of the index **already in date order** and the extra sort disappears.",
        language: "sql",
        starter: TICKETS_SEED + `
CREATE INDEX idx_venue ON tickets (venue);

EXPLAIN QUERY PLAN
SELECT * FROM tickets WHERE venue = 'Hall A' ORDER BY show_date;
`,
        solution: TICKETS_SEED + `
CREATE INDEX idx_venue_date ON tickets (venue, show_date);

EXPLAIN QUERY PLAN
SELECT * FROM tickets WHERE venue = 'Hall A' ORDER BY show_date;
`,
        tests: [
          { id: "t1", description: "The plan seeks on venue", assertionCode: `assert(rows.some((r) => /SEARCH/.test(String(r.detail)) && /venue=\\?/.test(String(r.detail))), "The plan should SEARCH on venue=?")` },
          { id: "t2", description: "No separate sort step", assertionCode: `assert(!rows.some((r) => /TEMP B-TREE/.test(String(r.detail))), "There is still a USE TEMP B-TREE FOR ORDER BY: the index needs show_date right after venue")` },
        ],
        hints: ["Within one venue, a (venue, show_date) index is already sorted by date.", "Drop the old venue-only index if the planner keeps preferring it."],
      },
      {
        kind: "explain",
        title: "Three ways to join",
        body: "A join combines two tables, and there is more than one way to do it. We will join the **refunded orders** (after the filter, A rows) to the million-row `tickets` table, which has an index on `order_id`:\n\n- **Nested loop**: for each refunded order, seek its tickets in the index. Cost grows with A, and every seek is a random page read.\n- **Hash join**: read every ticket once, in a straight line, and look each one up in an in-memory hash of the orders. Cost is the size of the big table, almost regardless of A.\n- **Merge join**: if both sides arrive sorted by the join key, walk them side by side like a zip. Cheap if the sorting is free, expensive if it must be done first.\n\nNo strategy always wins. The best depends on **how many rows reach the join**. Slide the real row count up and watch the winner change.",
        widget: { type: "data-plan", props: { fixedStats: true } },
      },
      {
        kind: "question",
        title: "Find the crossover",
        body: "With accurate statistics, the planner picks a nested loop for a handful of orders. Slide the number of refunded orders up until the planner switches to a **hash join**.",
        widget: { type: "data-plan", props: { fixedStats: true } },
        question: { type: "widget", goal: { stale: false, pick: "hash" }, prompt: "Slide until the planner picks a hash join." },
        explanation: "Around 40,000 orders the random seeks of a nested loop cost more than reading the whole table once. Both plans are 'right' at their size, and a planner that knows the size chooses well. Whether it *knows* is the next question.",
      },
      {
        kind: "explain",
        title: "Estimated versus actual rows",
        body: "The planner never counts rows before it runs a query: it relies on **statistics**, a small summary of each column's values that the database collects periodically (ANALYZE in SQLite and PostgreSQL). Statistics go stale. After a bulk import, a big delete or a change in what customers do, the table no longer looks like its summary, and the planner's **estimated rows** drift away from the **actual rows**.\n\nPostgreSQL's `EXPLAIN ANALYZE` prints both numbers on every step. The pattern to hunt for is **a step whose estimate is off by 10× or more**: everything above it was planned around a lie. Switch the statistics to stale below and watch the plan.",
        widget: { type: "data-plan", props: { stale: true, actual: 2000 } },
      },
      {
        kind: "question",
        title: "Make a stale plan hurt",
        body: "The stale statistics say 'about 12 refunded orders'. Find a real row count at which following that estimate makes the query **at least 3 times more expensive** than the best plan.",
        widget: { type: "data-plan", props: { stale: true, actual: 2000 } },
        question: { type: "widget", goal: { stale: true, slowdownMin: 3 }, prompt: "Slide the real count until the stale plan is 3× or worse." },
        explanation: "Planning for 12 rows, the planner picked a nested loop, which is perfect for 12 and terrible for 300,000 (hundreds of thousands of random seeks). The plan is not wrong for its inputs; its **inputs** were wrong.",
      },
      {
        kind: "question",
        title: "Where to look first",
        body: "A report ran in 200 ms for months. After a nightly job loaded ten million new rows, it takes 90 seconds. Nothing else changed. What do you check first?",
        question: {
          type: "choice",
          options: [
            "Whether the planner's statistics are out of date: compare estimated and actual rows in the plan, then re-ANALYZE",
            "Upgrade the server's CPU",
            "Rewrite the report in a different language",
            "Add an index to every column in the table",
          ],
          answer: 0,
        },
        explanation: "A sudden slowdown right after a big data change is the classic signature of stale statistics (or a plan that no longer fits the data). Compare estimated and actual rows, refresh statistics, then look at indexes. Hardware or a rewrite wouldn't touch the cause.",
      },
      {
        kind: "recap",
        points: [
          "The planner chooses **how**; `EXPLAIN` shows it. `SCAN` reads the whole table, `SEARCH ... USING INDEX` seeks, `COVERING INDEX` skips the table.",
          "Wrapping an indexed column in a function usually hides it from the index: compare the **bare column** to a range.",
          "An index in the right order can also remove an **ORDER BY sort**.",
          "Joins run as a **nested loop**, **hash join** or **merge join**; which is cheapest depends on how many rows reach the join.",
          "The planner works from **estimates**. When estimated and actual rows differ a lot, suspect stale statistics.",
        ],
      },
    ],
  },
  // ─────────────────────────────── 4. Transactions and isolation ───────────────────────────────
  {
    id: "fnd-data-4-transactions",
    title: "Transactions and isolation",
    summary: "All-or-nothing writes, and the bugs that appear when two transactions overlap.",
    minutes: 15,
    xp: 90,
    steps: [
      {
        kind: "explain",
        title: "A bundle that succeeds or fails together",
        body: "Buying two seats means several writes: mark seat 14 as sold, mark seat 15 as sold, record the payment, reduce the stock. If the server dies halfway, you do not want fourteen sold and no payment. A **transaction** wraps the writes in `BEGIN ... COMMIT`, and the database promises the **ACID** properties:\n\n- **Atomic**: all of it happens, or none of it. A crash or a ROLLBACK undoes the lot.\n- **Consistent**: the data never breaks a rule the database knows about (constraints, unique indexes, foreign keys).\n- **Isolated**: transactions running at the same time do not trip over each other's half-finished work.\n- **Durable**: once COMMIT returns, the change survives a power cut.\n\nThree of those are mostly 'it just works'. **Isolation** is the one with settings, and the one that causes subtle bugs.",
      },
      {
        kind: "question",
        title: "Which letter?",
        body: "The server reports 'COMMIT OK' to the buyer, then loses power half a second later. After restart the purchase is still there. Which property is that?",
        question: { type: "choice", options: ["Atomicity", "Consistency", "Isolation", "Durability"], answer: 3 },
        explanation: "**Durability**: a committed change is on stable storage (the database writes it to a log and flushes it before saying OK), so a crash afterwards cannot lose it.",
      },
      {
        kind: "explain",
        title: "Isolation is a dial",
        body: "Perfect isolation (every transaction behaves as if it ran alone) is expensive, so databases offer weaker, faster levels. Each level is a promise about **which anomalies cannot happen**. In the sequencer below, two transactions each have a few statements. **You** choose which one moves next; click the highlighted statement to run it. Try the **Dirty read** scenario: a box-office clerk raises a seat's price to 90 and then rolls it back, while a customer asks the price.",
        widget: { type: "data-isolation", props: { scenario: "dirty", level: "ru" } },
      },
      {
        kind: "question",
        title: "Quote a price that never existed",
        body: "At **Uncommitted** isolation, press 'Play the unlucky order' (or step through yourself) and see what the customer is told.",
        widget: { type: "data-isolation", props: { scenario: "dirty", level: "ru" } },
        question: { type: "widget", goal: { scenario: "dirty", level: "ru", anomaly: true, done: true }, prompt: "Cause a dirty read at the lowest level." },
        explanation: "A **dirty read**: the customer's transaction read a value that another transaction had written but not committed, and that value then vanished in a rollback. Nearly every database refuses to do this by default; the lowest level exists for rare cases where approximate answers are fine.",
      },
      {
        kind: "question",
        title: "Close the door",
        body: "Now find a level where the same unlucky order is harmless. Change the level, play the order again, and make the verdict green.",
        widget: { type: "data-isolation", props: { scenario: "dirty", level: "ru" } },
        question: { type: "widget", goal: { scenario: "dirty", anomaly: false, done: true }, prompt: "Choose a level where the customer is quoted a real price." },
        explanation: "From **Committed** upward, reads only see committed data, so an unfinished (and later undone) write is invisible. Committed is the default in PostgreSQL, Oracle and SQL Server.",
      },
      {
        kind: "explain",
        title: "Two reads, two answers",
        body: "The next anomaly is subtler. A sales report reads the day's ticket count twice (once for the headline, once for a chart footer) while a sale commits in between. At **Committed**, each read sees the latest committed value, so the report disagrees with itself: a **non-repeatable read**. At **Repeatable read**, a transaction sees one **snapshot** of the data, frozen when it began, and both reads agree.",
        widget: { type: "data-isolation", props: { scenario: "repeat", level: "rc" } },
      },
      {
        kind: "question",
        title: "Make the report agree with itself",
        body: "Play the unlucky order at Committed to see the mismatch. Then change the level so the same order produces a consistent report.",
        widget: { type: "data-isolation", props: { scenario: "repeat", level: "rc" } },
        question: { type: "widget", goal: { scenario: "repeat", anomaly: false, done: true }, prompt: "Get a consistent report." },
        explanation: "A snapshot (Repeatable read or Serializable) gives the report one frozen view of the data. The trade-off: the report may be a few seconds out of date by the time it finishes, which is exactly what a report wants.",
      },
      {
        kind: "explain",
        title: "The lost update",
        body: "Now the one that costs real money. Two buyers each read how many tickets are left (10), subtract one in application code, and write the result back. The first writes 9, the second also writes 9 (it never saw the first buyer's change), and one sale evaporates. This **lost update** is possible at Committed. At Repeatable read the second writer is *rejected* instead (its row changed since its snapshot) and must retry.",
        widget: { type: "data-isolation", props: { scenario: "lost", level: "rc" } },
      },
      {
        kind: "question",
        title: "Lose a sale",
        body: "At **Committed**, play the unlucky order and watch two successful purchases leave only one ticket gone.",
        widget: { type: "data-isolation", props: { scenario: "lost", level: "rc" } },
        question: { type: "widget", goal: { scenario: "lost", level: "rc", anomaly: true, done: true }, prompt: "Make the lost update happen." },
        explanation: "Both buyers read 10, both wrote 9. Neither transaction did anything wrong by the rules of Committed. The bug is **read, compute in the app, write back**: the read was stale by the time of the write.",
      },
      {
        kind: "explain",
        title: "Four ways to stop a lost update",
        body: "Fixes, from simplest to heaviest:\n\n1. **Let the database do the arithmetic**, in one atomic statement: `UPDATE stock SET seats_left = seats_left - 1 WHERE show_id = 1 AND seats_left > 0`. No read-then-write gap exists.\n2. **Lock what you read**: `SELECT ... FOR UPDATE` makes the second buyer wait until the first commits.\n3. **Compare-and-set** (optimistic concurrency): store a `version` number; update only `WHERE version = :the_one_I_read`, and treat 0 rows changed as 'someone beat me, try again'.\n4. **Use a stricter level** (Repeatable read or Serializable) and retry on failure.\n\nThe first one needs no extra machinery. Practise it.",
      },
      {
        kind: "code",
        title: "Sell the last seat, safely",
        body: "Two buyers both try to take the **last** seat (`seats_left` is 1, and the column refuses to go below 0). The second `UPDATE` currently crashes the whole script. Change both statements so that each one only subtracts **if a seat is left**: the first sells it, the second quietly changes nothing, and no error occurs.",
        language: "sql",
        starter: `CREATE TABLE stock (
  show_id INTEGER PRIMARY KEY,
  seats_left INTEGER NOT NULL CHECK (seats_left >= 0)
);
INSERT INTO stock VALUES (1, 1);   -- one seat left

UPDATE stock SET seats_left = seats_left - 1 WHERE show_id = 1;   -- buyer A
UPDATE stock SET seats_left = seats_left - 1 WHERE show_id = 1;   -- buyer B

SELECT seats_left FROM stock WHERE show_id = 1;
`,
        solution: `CREATE TABLE stock (
  show_id INTEGER PRIMARY KEY,
  seats_left INTEGER NOT NULL CHECK (seats_left >= 0)
);
INSERT INTO stock VALUES (1, 1);   -- one seat left

UPDATE stock SET seats_left = seats_left - 1 WHERE show_id = 1 AND seats_left > 0;   -- buyer A
UPDATE stock SET seats_left = seats_left - 1 WHERE show_id = 1 AND seats_left > 0;   -- buyer B

SELECT seats_left FROM stock WHERE show_id = 1;
`,
        tests: [
          { id: "t1", description: "The script runs without an error", assertionCode: `assert(rows.length === 1, "the final SELECT should return one row")` },
          { id: "t2", description: "The stock ends at 0, never negative", assertionCode: `assertEqual(rows[0].seats_left, 0, "seats_left should be 0")` },
          { id: "t3", description: "Exactly one of the two updates changed a row", assertionCode: `assertEqual((stdout.match(/UPDATE ok · 1 row changed/g) || []).length, 1, "exactly one buyer should get the seat")` },
        ],
        hints: ["Add a condition to each UPDATE's WHERE clause.", "AND seats_left > 0"],
      },
      {
        kind: "code",
        title: "Compare and set",
        body: "The optimistic version of the same fix. A `row` is a dict like `{'value': 10, 'version': 1}`. Write `save_if_unchanged(row, expected_version, new_value)`: if the row's version still equals `expected_version`, store `new_value`, add 1 to the version and return `True`; otherwise leave the row alone and return `False` (somebody else got there first).",
        language: "python",
        starter: `def save_if_unchanged(row, expected_version, new_value):
    # only write if nobody changed the row since we read it
    return False
`,
        solution: `def save_if_unchanged(row, expected_version, new_value):
    if row["version"] != expected_version:
        return False
    row["value"] = new_value
    row["version"] += 1
    return True
`,
        tests: [
          { id: "t1", description: "Saves when the version matches", assertionCode: `row = {"value": 10, "version": 1}\nok = save_if_unchanged(row, 1, 9)\nassert ok is True and row == {"value": 9, "version": 2}, f"expected a save, got {ok} and {row}"` },
          { id: "t2", description: "Refuses a stale version and leaves the row alone", assertionCode: `row = {"value": 10, "version": 3}\nok = save_if_unchanged(row, 2, 99)\nassert ok is False and row == {"value": 10, "version": 3}, f"a stale writer must not change the row: {ok}, {row}"` },
          { id: "t3", description: "Two buyers who both read version 1: only the first wins", assertionCode: `row = {"value": 10, "version": 1}\na = save_if_unchanged(row, 1, 9)\nb = save_if_unchanged(row, 1, 9)\nassert (a, b) == (True, False) and row["value"] == 9, f"got {a}, {b}, {row}"` },
        ],
        hints: ["Compare row['version'] with expected_version first.", "On success, bump the version so the next stale writer is caught."],
      },
      {
        kind: "explain",
        title: "Write skew: the rule nobody checked together",
        body: "The strangest anomaly. The gate rule is 'at least one scanner stays on duty'. Ana and Ben each check that the other is on duty and then each leaves, by updating **their own row**. Their writes touch different rows, so there is no write conflict, and even a frozen snapshot (Repeatable read) will not catch it: each transaction was correct about the world *it saw*. Both commit, and nobody is at the gate. This is **write skew**.\n\nOnly **Serializable** stops it: it notices that each transaction read something the other changed, and rejects one at commit.",
        widget: { type: "data-isolation", props: { scenario: "skew", level: "rr" } },
      },
      {
        kind: "question",
        title: "Empty the gate",
        body: "At **Repeatable**, play the unlucky order and see both scanners leave.",
        widget: { type: "data-isolation", props: { scenario: "skew", level: "rr" } },
        question: { type: "widget", goal: { scenario: "skew", level: "rr", anomaly: true, done: true }, prompt: "Cause write skew at Repeatable read." },
        explanation: "The snapshot did its job perfectly: each scanner saw a consistent picture in which the other was still on duty. The picture was simply outdated by commit time. Snapshots stop you reading changing data; they do not stop two decisions from invalidating each other.",
      },
      {
        kind: "question",
        title: "Keep someone on the gate",
        body: "Now choose the level where the rule always holds for the same unlucky order. One transaction will be rejected.",
        widget: { type: "data-isolation", props: { scenario: "skew", level: "rr" } },
        question: { type: "widget", goal: { scenario: "skew", level: "ser", anomaly: false, aborted: true, done: true }, prompt: "Make the rule hold, and let one transaction be rejected." },
        explanation: "At **Serializable** the database found no one-after-the-other order of the two transactions that could produce what they read, so it aborted the second. The price of the strongest level is exactly this: some transactions fail, and the application must be ready to retry.",
      },
      {
        kind: "question",
        title: "After a serialization failure",
        body: "The database rejects your transaction with 'could not serialize access'. What should the application do?",
        question: {
          type: "choice",
          options: [
            "Show the user a fatal error and give up",
            "Re-run the whole transaction from BEGIN, re-reading the data, usually a few times at most",
            "Re-run only the statement that failed",
            "Switch to a weaker isolation level and ignore it",
          ],
          answer: 1,
        },
        explanation: "Retry the **whole** transaction: the decision made from the old reads is no longer valid, so it has to start over with fresh reads. Strict isolation levels turn silent data bugs into loud, retryable errors; your code needs a retry loop to benefit.",
      },
      {
        kind: "recap",
        points: [
          "A **transaction** makes several writes atomic. **Isolation** decides what concurrent transactions can see of each other.",
          "**Dirty read**: seeing uncommitted work. **Non-repeatable read**: the same read gives two answers. **Lost update**: read, compute, write back overwrites a newer value. **Write skew**: two decisions each valid alone break a rule together.",
          "Committed stops dirty reads; Repeatable read adds a stable snapshot (and often rejects lost updates); only Serializable stops write skew.",
          "Prefer a single atomic UPDATE or compare-and-set to read-then-write in application code.",
          "Stricter levels fail loudly: build a **retry loop** around whole transactions. Engines differ in the details, so check your database's documentation.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 5. Connection pooling ───────────────────────────────
  {
    id: "fnd-data-5-pooling",
    title: "Connection pooling",
    summary: "Why connections are expensive, how to size a pool, and how serverless apps overwhelm a database.",
    minutes: 12,
    xp: 70,
    steps: [
      {
        kind: "explain",
        title: "A connection is a small piece of heavy machinery",
        body: "Before your app can run one query, it must open a **connection**: a network round trip (or several), a TLS handshake, a login, and then the database sets up a session for you. In PostgreSQL each connection is a whole **operating-system process**, with a few megabytes of memory of its own. Opening one costs tens of milliseconds, and the server can only hold a few hundred at a time.\n\nA typical query takes 5 ms. If you open a fresh connection for every request, most of your time (and the database's) goes into the handshake. So apps keep connections open and **reuse** them: that is a **connection pool**.",
      },
      {
        kind: "question",
        title: "The overhead",
        body: "Opening a connection takes 30 ms, and the query itself takes 5 ms. What percentage of each request's database time is just connecting? (Round to a whole number.)",
        question: { type: "number", answer: 86, tolerance: 1, unit: "%" },
        explanation: "30 of 35 ms, which is about **86%**. A pool pays the 30 ms once and then reuses the connection thousands of times.",
      },
      {
        kind: "explain",
        title: "A pool is a queue with N seats",
        body: "A pool opens N connections and hands them out. A request that needs one while all N are busy **waits** in line. That is a feature: it limits how many queries hit the database at once. But if the line gets long enough, requests time out.\n\nThe simulator below throws 12 seconds of traffic at a database with 8 CPU cores. Right now the pool is too small. Find a size that gets every request through.",
        widget: { type: "data-pool", props: { modes: ["pool"], pool: 2, rate: 200, queryMs: 20 } },
      },
      {
        kind: "question",
        title: "Size it right",
        body: "200 requests per second, each query 20 ms. Set the pool size so that **no request fails**, while keeping the pool at 16 or smaller.",
        widget: { type: "data-pool", props: { modes: ["pool"], pool: 2, rate: 200, queryMs: 20 } },
        question: { type: "widget", goal: { mode: "pool", failedMax: 0, poolMax: 16 }, prompt: "Find a pool size that drops nothing." },
        explanation: "At 200 requests a second and 20 ms per query, about 4 queries are running at any instant, so a pool of 5 or 6 is already enough, with a little room for bursts. You do not need hundreds of connections.",
      },
      {
        kind: "explain",
        title: "How to size a pool",
        body: "There is a simple law behind that answer. **Little's law**: the average number of things in a system equals the arrival rate times the time each one spends there.\n\n" +
          txt(`
busy connections  =  requests per second  x  seconds per query
                  =  200  x  0.020  =  4
`) +
          "\nAdd headroom for bursts and slow queries (1.5 to 2 times is typical) and you have a pool size. And a bigger pool is **not** better: the database has a limited number of CPU cores and disk heads. Once more queries run at once than the machine can serve, they just share the same resources and each one gets slower, while the extra connections eat memory. Try a huge pool under heavy traffic.",
        widget: { type: "data-pool", props: { modes: ["pool"], pool: 100, rate: 400, queryMs: 20 } },
      },
      {
        kind: "question",
        title: "Big pools do not fix overload",
        body: "Set the pool to **80 or more** and the traffic to **500 requests per second or more**. Some requests will still fail: the database was the bottleneck, not the pool.",
        widget: { type: "data-pool", props: { modes: ["pool"], pool: 100, rate: 400, queryMs: 20 } },
        question: { type: "widget", goal: { mode: "pool", poolMin: 80, rateMin: 500, failedMin: 1 }, prompt: "Overload a database that has an enormous pool." },
        explanation: "With 8 cores serving 20 ms queries, the machine can finish about 400 queries a second no matter how many connections wait on it. A giant pool just moves the queue from your app into the database, where it costs memory and makes every query slower. The fixes are fewer or cheaper queries, a cache, a read replica, or a bigger machine.",
      },
      {
        kind: "question",
        title: "Little's law at work",
        body: "A service handles **500 requests per second**, and each one holds a connection for **40 ms**. On average, how many connections are busy?",
        question: { type: "number", answer: 20, unit: "connections" },
        explanation: "500 x 0.040 = **20** busy connections on average. A pool of 30 gives 50% headroom.",
      },
      {
        kind: "explain",
        title: "The serverless connection storm",
        body: "Serverless functions change the picture. Each function instance may be its own little process with **no shared pool**, and a traffic spike makes the platform start *many* instances at once. If every instance opens its own connection, the database sees hundreds of simultaneous logins, pays the handshake cost for each, and finally hits its **maximum connections** limit and starts refusing them.\n\nThe cure is an external **pooler** (PgBouncer, a managed proxy) that sits between the functions and the database. Thousands of short-lived client connections go to the pooler; the pooler keeps a **small, stable set** of real connections to the database and lends them out. Compare the two below while a sale opens (triple traffic for 3 seconds).",
        widget: { type: "data-pool", props: { modes: ["direct", "pooler"], mode: "direct", pool: 10, rate: 200, queryMs: 20, spike: true } },
      },
      {
        kind: "question",
        title: "Put a pooler in front",
        body: "Switch from 'Serverless, no pool' to **'Serverless + pooler'** while the sale spike is on, and get through with no failures.",
        widget: { type: "data-pool", props: { modes: ["direct", "pooler"], mode: "direct", pool: 10, rate: 200, queryMs: 20, spike: true } },
        question: { type: "widget", goal: { mode: "pooler", failedMax: 0, spike: true, rateMin: 200 }, prompt: "Survive the spike with a pooler." },
        explanation: "The pooler absorbed hundreds of client connections and fed the database through 10 real ones. The spike just made requests wait a little in the pooler's line instead of exploding the database.",
      },
      {
        kind: "explain",
        title: "Session pooling or transaction pooling",
        body: "A pooler can lend a server connection out in two ways:\n\n- **Session pooling**: a client keeps one server connection from connect to disconnect. Everything works, but you save little: a connection sits idle whenever its client is idle.\n- **Transaction pooling**: a server connection is lent only for the length of one transaction, then returned. A few dozen real connections can serve thousands of clients. This is what serverless needs.\n\nThe catch: with transaction pooling consecutive transactions from one client may run on **different** server connections, so anything that lives in the *session* quietly stops working: `SET` commands, session-level advisory locks, `LISTEN/NOTIFY`, temporary tables and (in some setups) prepared statements.",
      },
      {
        kind: "question",
        title: "What breaks?",
        body: "Behind a **transaction-mode** pooler, which of these are likely to misbehave?",
        question: {
          type: "choice",
          options: [
            "A plain INSERT inside BEGIN ... COMMIT",
            "SET search_path = shop at the start of the connection, relied on by later queries",
            "A session-level advisory lock held across several transactions",
            "A temporary table created in one transaction and read in the next",
          ],
          answer: [1, 2, 3],
        },
        explanation: "All three of the session-dependent ones break, because the next transaction may be on a different server connection that never saw the SET, doesn't hold the lock, and has no such temp table. A self-contained transaction is fine. The fix is to keep session state out of your code, or to set what you need inside each transaction.",
      },
      {
        kind: "question",
        title: "Fleet arithmetic",
        body: "Your database allows **100** connections, and you reserve 10 for admins and migrations. You run **12** app servers, each with its own pool. What is the largest pool size each server can have? (Whole number.)",
        question: { type: "number", answer: 7, unit: "connections each" },
        explanation: "(100 - 10) / 12 = 7.5, so **7** each. Total pool size across the fleet is `servers x pool size`, and it must stay under the database's limit, including during deploys when old and new instances overlap.",
      },
      {
        kind: "code",
        title: "A pool-size calculator",
        body: "Write `pool_size(rps, query_ms, headroom=1.5)`: the number of connections to open for `rps` requests per second with queries of `query_ms` milliseconds. Use Little's law (busy = rps x seconds per query), multiply by `headroom`, and round **up** to a whole number, never below 1. Hint: `import math` has `math.ceil`.",
        language: "python",
        starter: `import math

def pool_size(rps, query_ms, headroom=1.5):
    return 0
`,
        solution: `import math

def pool_size(rps, query_ms, headroom=1.5):
    busy = rps * query_ms / 1000
    return max(1, math.ceil(busy * headroom))
`,
        tests: [
          { id: "t1", description: "200 req/s at 20 ms with 1.5x headroom: 6", assertionCode: `assert pool_size(200, 20) == 6, f"pool_size(200, 20) should be 6, got {pool_size(200, 20)}"` },
          { id: "t2", description: "500 req/s at 40 ms: 30", assertionCode: `assert pool_size(500, 40) == 30, f"expected 30, got {pool_size(500, 40)}"` },
          { id: "t3", description: "A trickle still needs one connection", assertionCode: `assert pool_size(1, 5) == 1, "at least one connection"` },
          { id: "t4", description: "Headroom is a parameter", assertionCode: `assert pool_size(100, 10, 2) == 2, f"100 req/s x 10 ms x 2 = 2, got {pool_size(100, 10, 2)}"` },
        ],
        hints: ["busy = rps * query_ms / 1000", "math.ceil(busy * headroom), and max(1, ...)"],
      },
      {
        kind: "recap",
        points: [
          "Opening a connection is slow and heavy (handshake, login, often a whole server process), so apps **reuse** connections through a pool.",
          "Busy connections = **requests per second x seconds per query** (Little's law). Add headroom of 1.5-2x.",
          "A bigger pool does not add database capacity; past the machine's cores it only adds memory use and slower queries.",
          "Serverless instances without a shared pool cause **connection storms**. Put a pooler such as PgBouncer in front, usually in **transaction mode**.",
          "Transaction pooling breaks session state (SET, session locks, temp tables). Total pool size across all servers must stay under the database's connection limit.",
        ],
      },
    ],
  },
  // ─────────────────────────────── 6. Migrating without downtime ───────────────────────────────
  {
    id: "fnd-data-6-migrations",
    title: "Changing the schema without downtime",
    summary: "Expand, backfill, switch, contract: how to rename a column while the site keeps serving traffic.",
    minutes: 13,
    xp: 80,
    steps: [
      {
        kind: "explain",
        title: "Two versions of your code, one database",
        body: "Changing a table sounds like a quick job: rename a column and update the code. The trouble is that a deploy is not instant. Your site runs on eight servers, and they are replaced a few at a time. For several minutes **old code and new code run at the same time against the same database**. Any schema change has to work for both.\n\nLet us rename `orders.total` (a decimal, in euros) to `orders.total_cents` (a whole number). The most direct way is to do it in one go. Step through it and watch the failing servers (red).",
        widget: { type: "data-migrate", props: { mode: "bigbang" } },
      },
      {
        kind: "question",
        title: "Feel the outage",
        body: "Step through the one-big-change plan to the end. How bad does it get at the worst moment?",
        widget: { type: "data-migrate", props: { mode: "bigbang" } },
        question: { type: "widget", goal: { mode: "bigbang", worstMin: 100, phase: 3 }, prompt: "Walk through all four phases." },
        explanation: "The moment the column is renamed, **every** server still on the old version fails on every order request: 100% errors until the rollout finishes. And there is no clean way back, because the old code needs the old column name.",
      },
      {
        kind: "explain",
        title: "Expand, migrate, contract",
        body: "The safe pattern splits one risky change into several that are each safe on their own. Three phases:\n\n1. **Expand**: add the new thing next to the old one, without removing or changing anything. Old code does not notice.\n2. **Migrate**: get the data and the code across. The new code writes **both**; a **backfill** copies old rows; then readers switch to the new column.\n3. **Contract**: when nothing uses the old thing, delete it.\n\nEvery step can be deployed alone and rolled back alone. Walk through it, and run the backfill batches yourself.",
        widget: { type: "data-migrate", props: { mode: "expand" } },
      },
      {
        kind: "question",
        title: "Finish the migration with zero errors",
        body: "Step all the way through expand, migrate and contract.",
        widget: { type: "data-migrate", props: { mode: "expand" } },
        question: { type: "widget", goal: { mode: "expand", finished: true, worstMax: 0 }, prompt: "Reach the last phase." },
        explanation: "Seven small steps, **zero failed requests**, and a safe rollback at each of the first five. It takes longer than one ALTER TABLE, but it is the version that does not page anyone at 3 a.m.",
      },
      {
        kind: "question",
        title: "Put them in order",
        body: "Order the steps of the rename.",
        question: {
          type: "order",
          items: [
            "Add the new nullable column",
            "Deploy code that writes both columns",
            "Backfill the old rows in batches",
            "Deploy code that reads the new column",
            "Deploy code that stops writing the old column",
            "Drop the old column",
          ],
        },
        explanation: "Dual writes come **before** the backfill so that no row can be missed: rows written after dual-write starts are already correct, and the backfill only has to cover the older ones. The drop comes last, once nothing reads or writes the old column.",
      },
      {
        kind: "explain",
        title: "Backfills in small batches",
        body: "A single `UPDATE orders SET total_cents = ...` over 200 million rows would hold locks for a long time, bloat the transaction log, and make replicas fall behind. A **backfill** instead walks the table in small, ordered batches, a few thousand rows at a time, each in its own short transaction, pausing between batches if the database is busy.\n\nTwo habits make a backfill safe: it should be **idempotent** (only touch rows that are still NULL, so re-running it is harmless), and **resumable** (remember the last id so a crash doesn't mean starting over).",
      },
      {
        kind: "code",
        title: "Plan the batches",
        body: "Write `backfill_ranges(max_id, batch_size)` that returns the list of `(first_id, last_id)` pairs, inclusive, needed to cover ids `1` to `max_id` in batches of `batch_size`. The last batch may be shorter. For `max_id` 10 and batch size 4 that is `[(1, 4), (5, 8), (9, 10)]`.",
        language: "python",
        starter: `def backfill_ranges(max_id, batch_size):
    ranges = []
    return ranges
`,
        solution: `def backfill_ranges(max_id, batch_size):
    ranges = []
    start = 1
    while start <= max_id:
        end = min(start + batch_size - 1, max_id)
        ranges.append((start, end))
        start = end + 1
    return ranges
`,
        tests: [
          { id: "t1", description: "10 rows in batches of 4", assertionCode: `assert backfill_ranges(10, 4) == [(1, 4), (5, 8), (9, 10)], f"got {backfill_ranges(10, 4)}"` },
          { id: "t2", description: "An exact fit has no short batch", assertionCode: `assert backfill_ranges(8, 4) == [(1, 4), (5, 8)], f"got {backfill_ranges(8, 4)}"` },
          { id: "t3", description: "An empty table needs no batches", assertionCode: `assert backfill_ranges(0, 5) == [], "no rows, no batches"` },
          { id: "t4", description: "Every id is covered exactly once", assertionCode: `r = backfill_ranges(1003, 100)\ncovered = [i for a, b in r for i in range(a, b + 1)]\nassert covered == list(range(1, 1004)), "the ranges must cover 1..1003 with no gaps or overlaps"` },
        ],
        hints: ["Loop while start <= max_id.", "end = min(start + batch_size - 1, max_id), then continue from end + 1."],
      },
      {
        kind: "code",
        title: "Write one batch",
        body: "The `orders` table has the new empty column `total_cents`. Write **one batch** of the backfill: set `total_cents` to the total in cents (`ROUND(total * 100)`) for orders with `id` from 1 to 100 **that don't have a value yet**. Rows 101 and up must stay untouched.",
        language: "sql",
        starter: `CREATE TABLE orders (id INTEGER PRIMARY KEY, total REAL, total_cents INTEGER);
WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM n WHERE i < 300)
INSERT INTO orders (total) SELECT 10 + i * 1.37 FROM n;

-- Your batch (ids 1 to 100):


SELECT COUNT(*) AS filled FROM orders WHERE total_cents IS NOT NULL;
`,
        solution: `CREATE TABLE orders (id INTEGER PRIMARY KEY, total REAL, total_cents INTEGER);
WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM n WHERE i < 300)
INSERT INTO orders (total) SELECT 10 + i * 1.37 FROM n;

UPDATE orders
SET total_cents = CAST(ROUND(total * 100) AS INTEGER)
WHERE id BETWEEN 1 AND 100 AND total_cents IS NULL;

SELECT COUNT(*) AS filled FROM orders WHERE total_cents IS NOT NULL;
`,
        tests: [
          { id: "t1", description: "Exactly 100 rows are filled", assertionCode: `assertEqual(rows[0].filled, 100, "exactly the 100 rows of this batch should be filled")` },
          { id: "t2", description: "The values are the totals in cents", assertionCode: `const bad = query("SELECT COUNT(*) AS n FROM orders WHERE id <= 100 AND (total_cents IS NULL OR total_cents <> CAST(ROUND(total * 100) AS INTEGER))")[0].n;\nassertEqual(bad, 0, "each filled row should hold ROUND(total * 100)")` },
          { id: "t3", description: "Later rows are untouched", assertionCode: `assertEqual(query("SELECT COUNT(*) AS n FROM orders WHERE id > 100 AND total_cents IS NOT NULL")[0].n, 0, "rows above 100 must stay NULL")` },
        ],
        hints: ["UPDATE orders SET total_cents = ... WHERE id BETWEEN 1 AND 100 AND total_cents IS NULL;", "ROUND(total * 100) gives the cents."],
      },
      {
        kind: "explain",
        title: "Dangerous statements",
        body: "Some schema changes are much more dangerous on a big, busy table than they look:\n\n- Adding a column with a **default** or **NOT NULL** can rewrite the whole table on older database versions, holding a lock all the way. Add it nullable, backfill, then add the constraint.\n- A plain **CREATE INDEX** blocks writes while it builds. Use the online variant (PostgreSQL's `CREATE INDEX CONCURRENTLY`).\n- Adding a **foreign key or check constraint** validates every existing row under a lock. Add it as 'not validated' first, then validate in the background.\n- **Changing a column's type** often rewrites the table. Treat it like a rename: add a new column, migrate, drop.\n- Any DDL can queue behind a long-running query, and then **block every query that arrives after it**. Set a lock timeout so the migration gives up instead of freezing the site.",
      },
      {
        kind: "question",
        title: "Safe in a single deploy?",
        body: "Which of these can generally be done in one step while the old code is still running?",
        question: {
          type: "choice",
          options: [
            "Add a new nullable column the old code ignores",
            "Rename a column the old code reads",
            "Drop a column the old code still selects",
            "Change a column's type from text to integer in place",
          ],
          answer: 0,
        },
        explanation: "A new nullable column breaks nobody. Renames, drops and type changes all break code that still expects the old shape, so they need the expand, migrate, contract treatment.",
      },
      {
        kind: "question",
        title: "The point of no return",
        body: "Version 4 of the app has been live for an hour and a bug appears. Which statement is true?",
        question: {
          type: "choice",
          options: [
            "Rolling back to v3 is safe, because v3 still reads the new column and the old column has not been dropped",
            "Nothing can be rolled back once the backfill ran",
            "You must restore the database from a backup to roll back any step",
            "Rolling back to v1 is just as safe as rolling back to v3",
          ],
          answer: 0,
        },
        explanation: "Until the contract step, the old column still exists, so you can roll back the application one version at a time (not all the way: v1 and v2 would read a stale old column once v4 stopped writing it). The drop is the only truly irreversible step, which is why it waits.",
      },
      {
        kind: "recap",
        points: [
          "During a deploy, **old and new code run together**, so every schema change must work for both.",
          "Use **expand, migrate, contract**: add alongside, dual-write, backfill, switch reads, stop writing the old, then drop it.",
          "Backfill in **small, idempotent, resumable batches** instead of one giant UPDATE.",
          "Watch for operations that lock: defaults, constraints, plain CREATE INDEX, type changes. Use online variants and a lock timeout.",
          "Each step has a rollback until the **contract** step, which is the point of no return, so it waits.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 7. Replication ───────────────────────────────
  {
    id: "fnd-data-7-replication",
    title: "Replicas, lag and read-your-writes",
    summary: "Copying data to followers, why they fall behind, and how to stop users seeing a stale past.",
    minutes: 12,
    xp: 70,
    steps: [
      {
        kind: "explain",
        title: "One writer, many readers",
        body: "One database server has limits: it can fail, and it can only answer so many questions. The standard answer is **replication**: one **leader** (primary) accepts all the writes, and one or more **followers** (replicas) receive a copy of every change and serve reads. Followers give you:\n\n- **More read capacity**: spread the SELECTs across several machines.\n- **Failover**: if the leader dies, promote a follower.\n- **Locality**: a replica near your users answers faster.\n- **Backups and analytics** without disturbing the leader.\n\nThe leader streams its write log to the followers. When does the leader tell the client 'done'? In **synchronous** replication, only after a follower has also stored the change: safe but slower, and one slow follower stalls writes. In **asynchronous** replication, right away, and followers catch up **a moment later**: fast, but followers are always a little behind. That gap is **replication lag**.",
      },
      {
        kind: "question",
        title: "A crash right after COMMIT",
        body: "With **asynchronous** replication the leader acknowledges a payment and then crashes before sending it to any follower. A follower is promoted. What may have happened to the payment?",
        question: {
          type: "choice",
          options: [
            "Nothing: every committed write is always on every follower",
            "It may be missing on the new leader, even though the customer was told it succeeded",
            "It is duplicated on the new leader",
            "The followers refuse to be promoted",
          ],
          answer: 1,
        },
        explanation: "That is the price of asynchronous replication: a window of acknowledged-but-unreplicated writes. Synchronous (or semi-synchronous, one follower must confirm) closes the window at the cost of write latency.",
      },
      {
        kind: "explain",
        title: "Paid, but the page says unpaid",
        body: "Lag is invisible when everything reads from the leader. It shows up when a read lands on a follower that has not caught up. The classic bug: a customer pays, the app redirects to 'My orders', that page reads from a follower, and the order still shows **unpaid**. The customer pays again.\n\nBelow, a leader and two followers (B is further away, so it lags more). Press **Pay**, then **Refresh** a few times with reads sent to 'Any follower'. Red dots are reads that missed the payment.",
        widget: { type: "data-replica", props: { route: "follower", lag: 400, routes: ["follower"] } },
      },
      {
        kind: "question",
        title: "Cause a stale read",
        body: "Pay for the ticket and see a stale page.",
        widget: { type: "data-replica", props: { route: "follower", lag: 400, routes: ["follower"] } },
        question: { type: "widget", goal: { anyStale: true }, prompt: "Get at least one stale read." },
        explanation: "The write took effect on the leader at t = 0, but the page was drawn from a follower that would not have it for another 400 ms or more. The data was never lost, only late.",
      },
      {
        kind: "explain",
        title: "Read your own writes",
        body: "The guarantee users actually expect is **read-your-writes**: after I change something, I see my change. Three common ways to give it:\n\n1. **Read from the leader** for a short while after a write (for this user, or for this record). Simple; the 'short while' must be longer than your worst lag.\n2. **Track a position**: remember the log position of the user's last write, and only read from a follower that has reached it. If none has, wait a moment or fall back to the leader.\n3. **Send some reads to the leader always**: anything where staleness hurts (payment status, inventory at checkout), and keep followers for the rest.\n\nTry rule 1 (leader for 1.5 seconds after your own write) and find where it stops being enough.",
        widget: { type: "data-replica", props: { route: "sticky", lag: 300, routes: ["follower", "sticky", "token"] } },
      },
      {
        kind: "question",
        title: "Beat the sticky window",
        body: "'Leader for 1.5 seconds after a write' is safe only if followers catch up within 1.5 seconds. Raise the lag until the rule breaks, then refresh until you have **7 reads** and a stale one.",
        widget: { type: "data-replica", props: { route: "sticky", lag: 300, routes: ["sticky"], fixedLag: false } },
        question: { type: "widget", goal: { route: "sticky", lagMin: 1100, readsMin: 7, anyStale: true }, prompt: "Find a lag where 'leader for 1.5 s' still serves a stale read." },
        explanation: "Once the window closes, reads go to followers; with a lag above about a second, the further follower is still behind after 1.5 seconds. A timing rule is a guess about lag. If lag spikes (a big batch job, a slow network), the guess fails.",
      },
      {
        kind: "question",
        title: "Wait for your write",
        body: "Now try 'Follower, but wait for your write': the read goes to a follower but waits until that follower has your change. Use a lag of **600 ms or more**, refresh at least twice, and see no stale reads.",
        widget: { type: "data-replica", props: { route: "token", lag: 300, routes: ["token"] } },
        question: { type: "widget", goal: { route: "token", lagMin: 600, readsMin: 2, anyStale: false }, prompt: "No stale read, even with high lag." },
        explanation: "Waiting for the replica to reach your write's position is correct at any lag. The cost shows in the list: the first read now takes as long as the lag. A good implementation waits a bounded time and then falls back to the leader.",
      },
      {
        kind: "explain",
        title: "Going back in time",
        body: "A second guarantee is **monotonic reads**: once I have seen something, I should never see an older state. With reads bouncing between followers that lag differently, you can see the payment on one refresh and *lose* it on the next. Stickiness helps: pin each user's session to the same follower, so the data they see only moves forward.\n\nThis is the everyday meaning of **eventual consistency**: if writes stop, all replicas converge. Until then, different readers may see different versions, and your app must decide where that is acceptable (a like-count) and where it is not (a bank balance).",
        widget: { type: "data-replica", props: { route: "follower", lag: 600, routes: ["follower"] } },
      },
      {
        kind: "question",
        title: "See time go backwards",
        body: "Pay, then refresh until a page shows the payment and a *later* page forgets it. (Hint: a lag between about 500 and 740 ms does it with 'Any follower'.)",
        widget: { type: "data-replica", props: { route: "follower", lag: 600, routes: ["follower"] } },
        question: { type: "widget", goal: { backwards: true }, prompt: "Make a refresh show an older state than the one before." },
        explanation: "Follower A had your payment at the third read, but follower B, further behind, did not at the fourth. Each follower is individually consistent; it's the *switching* between them that moves you backwards.",
      },
      {
        kind: "question",
        title: "How far behind?",
        body: "The leader commits **500 writes per second**, and a follower is **300 ms** behind. How many writes has the follower not applied yet, on average?",
        question: { type: "number", answer: 150, unit: "writes" },
        explanation: "500 writes/s x 0.3 s = **150** writes in flight. If lag grows (the follower can't apply writes as fast as they arrive), that number grows without bound until someone notices, which is why replication lag is something you graph and alert on.",
      },
      {
        kind: "code",
        title: "Choose a node",
        body: "Write `choose_node(now_ms, last_write_ms, window_ms=2000)`. A user who wrote **less than `window_ms` ago** must read from the `\"leader\"`. Otherwise (or if they have never written, `last_write_ms` is `None`) they may use a `\"follower\"`. A write exactly `window_ms` ago counts as old enough for a follower.",
        language: "python",
        starter: `def choose_node(now_ms, last_write_ms, window_ms=2000):
    return "follower"
`,
        solution: `def choose_node(now_ms, last_write_ms, window_ms=2000):
    if last_write_ms is not None and now_ms - last_write_ms < window_ms:
        return "leader"
    return "follower"
`,
        tests: [
          { id: "t1", description: "Just wrote: read from the leader", assertionCode: `assert choose_node(10_500, 10_000) == "leader", "a write 500 ms ago needs the leader"` },
          { id: "t2", description: "Wrote long ago: a follower is fine", assertionCode: `assert choose_node(20_000, 10_000) == "follower", "a write 10 s ago can use a follower"` },
          { id: "t3", description: "Never wrote: a follower is fine", assertionCode: `assert choose_node(5_000, None) == "follower", "no write on record means follower"` },
          { id: "t4", description: "The boundary and a custom window", assertionCode: `assert choose_node(12_000, 10_000) == "follower", "exactly 2000 ms ago is old enough"\nassert choose_node(12_000, 10_000, window_ms=5000) == "leader", "a 5 s window keeps this user on the leader"` },
        ],
        hints: ["Check for None first: you can't subtract it.", "Use < window_ms for 'recent'."],
      },
      {
        kind: "recap",
        points: [
          "**Replication** copies the leader's writes to followers for read capacity, failover and locality.",
          "**Asynchronous** replication is fast but leaves a **lag**; acknowledged writes can be lost in a failover. **Synchronous** closes that window at a cost in latency.",
          "A read from a lagging follower can miss your own write: fix with **read-your-writes** (leader after writes, position tracking, or waiting).",
          "Bouncing between followers can show data going **backwards**: keep a user on one follower (monotonic reads).",
          "**Eventually consistent** means 'converges when writes stop'. Decide, per feature, whether stale is acceptable.",
        ],
      },
    ],
  },
  // ─────────────────────────────── 8. Many regions ───────────────────────────────
  {
    id: "fnd-data-8-multiregion",
    title: "Many regions, one truth",
    summary: "Active-passive versus active-active, what a network cut does, and how conflicts get merged.",
    minutes: 13,
    xp: 80,
    steps: [
      {
        kind: "explain",
        title: "The speed of light is not negotiable",
        body: "Your users are in Frankfurt and Singapore. Light in fibre covers about 200,000 km a second, and Singapore is nearly 10,000 km away along real cable routes, so even in a perfect straight line a round trip takes about **100 milliseconds**, and real cable routes and routers push it to roughly **170**, however good your hardware is. A page that needs a few sequential database round trips to the other side of the world spends most of its time waiting on physics.\n\nSo companies put data in **several regions**: for speed (a copy near each user group), for survival (a whole region can go dark), and sometimes for law (some data must stay in one country). What it costs you is **simplicity**: the same record now lives in places that cannot instantly agree.",
      },
      {
        kind: "question",
        title: "The price of distance",
        body: "A page in Singapore makes **4 sequential queries** to a database in Frankfurt, 170 ms away each round trip. How long does it wait on the network alone, in milliseconds?",
        question: { type: "number", answer: 680, unit: "ms" },
        explanation: "4 x 170 = **680 ms** before any query even runs. Putting data near the user, or doing fewer round trips, is the only cure; faster servers cannot help.",
      },
      {
        kind: "explain",
        title: "Active-passive",
        body: "The simplest multi-region design has **one home region for writes**. This is **active-passive** (or primary/replica across regions). Frankfurt takes every write; Singapore holds a read replica and **forwards** any write it receives. Reads in Singapore are fast and slightly stale; writes from Singapore pay the 170 ms trip.\n\nIf the primary region fails, you **fail over**: promote the replica, point traffic at it, and accept that a few of the latest writes may be gone (the replication lag from the last lesson).\n\nNow cut the link between regions and try to write from Singapore.",
        widget: { type: "data-regions", props: { mode: "ap", type: "counter", fixedMode: true, fixedType: true } },
      },
      {
        kind: "question",
        title: "Write while cut off",
        body: "Cut the link, then sell a ticket **in Singapore**.",
        widget: { type: "data-regions", props: { mode: "ap", type: "counter", fixedMode: true, fixedType: true } },
        question: { type: "widget", goal: { mode: "ap", partition: true, rejectedMin: 1 }, prompt: "Cut the link and get a write refused." },
        explanation: "Singapore **refused** the write: it cannot reach the one place that is allowed to accept it. That is a deliberate choice of consistency over availability. Frankfurt is still fine and nothing can disagree, but from Singapore's side the feature is down until the link returns.",
      },
      {
        kind: "explain",
        title: "Active-active",
        body: "Some systems cannot accept 'down in Singapore'. In **active-active**, every region accepts writes, locally and fast (about 5 ms), and the regions exchange their changes in the background. During a partition both sides keep working, which is great for availability, and means two regions can change the **same record** without seeing each other's change. When the link returns, the system must **reconcile**.\n\nThe simplest rule is **last write wins** (LWW): compare timestamps and keep the newest. Try it with a ticket counter: cut the link, sell tickets in both regions, then reconnect.",
        widget: { type: "data-regions", props: { mode: "aa", type: "counter", strategy: "lww", fixedMode: true, fixedType: true } },
      },
      {
        kind: "question",
        title: "Lose some sales",
        body: "Cut the link, sell tickets in **both** regions, reconnect, and watch how many accepted sales vanish under last-write-wins.",
        widget: { type: "data-regions", props: { mode: "aa", type: "counter", strategy: "lww", fixedMode: true, fixedType: true } },
        question: { type: "widget", goal: { mode: "aa", strategy: "lww", diverged: true, partition: false, lostMin: 1 }, prompt: "Produce lost writes with last-write-wins." },
        explanation: "Each region's counter said, say, '2 sold'. LWW kept the newer *whole value* and threw the other away, though the two regions had sold different tickets. Every customer was told 'success'. This is the dangerous part of LWW: it silently discards correct data.",
      },
      {
        kind: "explain",
        title: "Merge instead of overwrite",
        body: "Some data has a natural way to combine. A counter of sales can simply be **added up**: if Frankfurt sold 2 and Singapore sold 3, the answer is 5. A set of notes can be **unioned**. Data types designed so that every replica converges to the same answer, whatever order the changes arrive in, are called **CRDTs** (conflict-free replicated data types).\n\nSwitch the merge rule to *merge by data type* and repeat the experiment.",
        widget: { type: "data-regions", props: { mode: "aa", type: "counter", strategy: "merge", fixedMode: true, fixedType: true } },
      },
      {
        kind: "question",
        title: "Lose nothing",
        body: "Cut the link, sell in both regions, reconnect: with merging, no sale may be lost.",
        widget: { type: "data-regions", props: { mode: "aa", type: "counter", strategy: "merge", fixedMode: true, fixedType: true } },
        question: { type: "widget", goal: { strategy: "merge", diverged: true, partition: false, lost: 0 }, prompt: "Diverge, reconnect, and keep every sale." },
        explanation: "Both regions' sales are summed after the reconnect. The total is right and there are no silent losses. Note what this does *not* solve: a rule like 'never sell more tickets than seats exist' can still be broken while the regions are apart, because neither can see the other's sales.",
      },
      {
        kind: "explain",
        title: "Not everything merges",
        body: "A **single value** (the show's capacity, someone's display name) has no natural merge: if Frankfurt sets 500 and Singapore sets 450 while apart, 'add them' means nothing, and any pick throws one edit away. The system can do one of:\n\n- **Last write wins** and accept the loss (fine for 'last seen' timestamps, bad for money),\n- **Keep both** and surface the conflict to application code or a person,\n- **Avoid the conflict by design**: give each record a single **home region** that alone accepts writes for it (each customer lives in one region). Other regions can still read it, but conflicts on that record cannot happen.\n\nTry the single value with a merge rule that cannot decide.",
        widget: { type: "data-regions", props: { mode: "aa", type: "value", strategy: "merge", fixedMode: true, fixedType: true } },
      },
      {
        kind: "question",
        title: "Create a real conflict",
        body: "Cut the link, set the capacity in **both** regions, and reconnect.",
        widget: { type: "data-regions", props: { mode: "aa", type: "value", strategy: "merge", fixedMode: true, fixedType: true } },
        question: { type: "widget", goal: { type: "value", diverged: true, partition: false, conflict: true }, prompt: "Produce a conflict that no rule can resolve." },
        explanation: "Two correct, concurrent edits to one value. The database cannot know whether 500 or 450 is right. This is a business question, which is why active-active designs spend so much effort on modelling data so that conflicts are rare or mergeable.",
      },
      {
        kind: "question",
        title: "Which design avoids the conflict?",
        body: "Customers' shopping carts live in two regions. Which design guarantees that two regions never write the same cart concurrently?",
        question: {
          type: "choice",
          options: [
            "Use last-write-wins and trust the clocks",
            "Give each cart a home region that alone accepts its writes, and route that customer's writes there",
            "Make every region accept writes for every cart and merge later",
            "Run the regions with no network link at all",
          ],
          answer: 1,
        },
        explanation: "**Home-region ownership** removes the concurrency instead of resolving it. Costs: a customer travelling far from their home region pays the latency for writes, and if their home region goes down, they need failover for just their data.",
      },
      {
        kind: "code",
        title: "A counter that merges",
        body: "A counter that merges safely keeps one number **per region**: `{\"fra\": 3, \"sin\": 2}`, where each region only ever increases its own entry. Write `merge(a, b)`, which takes the larger entry for every region, and `total(counter)`, which adds the entries. Don't change `a` or `b`.",
        language: "python",
        starter: `def merge(a, b):
    return {}

def total(counter):
    return 0
`,
        solution: `def merge(a, b):
    out = {}
    for region in set(a) | set(b):
        out[region] = max(a.get(region, 0), b.get(region, 0))
    return out

def total(counter):
    return sum(counter.values())
`,
        tests: [
          { id: "t1", description: "Different regions are combined", assertionCode: `assert merge({"fra": 3}, {"sin": 2}) == {"fra": 3, "sin": 2}, f"got {merge({'fra': 3}, {'sin': 2})}"` },
          { id: "t2", description: "The larger entry wins per region", assertionCode: `assert merge({"fra": 3, "sin": 1}, {"fra": 2, "sin": 4}) == {"fra": 3, "sin": 4}, "per region, keep the max"` },
          { id: "t3", description: "total adds the regions", assertionCode: `assert total({"fra": 3, "sin": 4}) == 7 and total({}) == 0, "total of {'fra': 3, 'sin': 4} is 7"` },
          { id: "t4", description: "Merging is order-independent, repeatable, and leaves inputs alone", assertionCode: `a = {"fra": 5, "sin": 2}\nb = {"sin": 9, "ams": 1}\nassert merge(a, b) == merge(b, a), "merge(a, b) must equal merge(b, a)"\nassert merge(a, a) == a, "merging a copy of itself changes nothing"\nassert a == {"fra": 5, "sin": 2} and b == {"sin": 9, "ams": 1}, "do not modify the inputs"` },
        ],
        hints: ["Loop over every region in either dict.", "a.get(region, 0) gives 0 for a missing region; keep the max of the two."],
      },
      {
        kind: "recap",
        points: [
          "Distance costs **time** (about 170 ms Frankfurt-Singapore round trip) that no hardware can remove, so data moves closer to users.",
          "**Active-passive**: one region takes writes. Simple and consistent, but remote writes are slow and a cut link means refused writes.",
          "**Active-active**: every region takes writes locally. Fast and available, but concurrent edits must be reconciled.",
          "**Last write wins** silently drops data. Counters and sets can **merge**; a single value cannot, so conflicts need design (or a person).",
          "The cleanest fix is often **ownership**: give each record one home region so conflicts cannot occur.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 9. The outbox pattern ───────────────────────────────
  {
    id: "fnd-data-9-outbox",
    title: "Writing data and events together",
    summary: "The dual-write problem, the outbox table, and at-least-once delivery with idempotent consumers.",
    minutes: 12,
    xp: 75,
    steps: [
      {
        kind: "explain",
        title: "Two systems, two writes",
        body: "When a customer places an order, the order service must do two things: **save the order** in its database, and **announce** 'order placed' on a message broker so the mail service can send a confirmation and the stock service can update. Written naively:\n\n" +
          py(`
save_order(order)          # write 1: the database
publish("order_placed")    # write 2: the broker
`) +
          "\nThe database and the broker are separate systems. There is no transaction that spans both. Between the two lines the process can crash, the network can fail, or the broker can be down. This is the **dual-write problem**.",
      },
      {
        kind: "question",
        title: "Crash between the lines",
        body: "The process crashes after `save_order` succeeds and before `publish` runs. What state is the system in afterwards?",
        question: {
          type: "choice",
          options: [
            "Everything rolled back automatically",
            "The order exists, but no event was ever sent: no confirmation e-mail, stock never updated",
            "The event was sent twice",
            "The broker holds the event until the app restarts",
          ],
          answer: 1,
        },
        explanation: "Nothing connects the two writes, so there is no automatic rollback. The order is real, the event never existed, and nothing will notice. Swap the order of the lines and the opposite happens: an event for an order that doesn't exist.",
      },
      {
        kind: "explain",
        title: "Make the failure visible",
        body: "Place a couple of orders. Then turn on a failure and place another one. Watch the readout 'Events lost forever'.",
        widget: { type: "data-outbox", props: { mode: "dual", fixedMode: true } },
      },
      {
        kind: "question",
        title: "Lose an event",
        body: "Place at least 3 orders, with a failure switched on for at least one of them, so that an order exists with no event.",
        widget: { type: "data-outbox", props: { mode: "dual", fixedMode: true } },
        question: { type: "widget", goal: { mode: "dual", ordersMin: 3, missingMin: 1 }, prompt: "Create an order whose event is lost." },
        explanation: "Retrying the publish in the app doesn't truly fix it either, because if the process itself dies there is nobody left to retry. The record of 'this event still needs sending' has to live somewhere **durable**, and the most durable place at hand is the database.",
      },
      {
        kind: "explain",
        title: "The outbox",
        body: "The **transactional outbox** pattern uses the one thing a database is good at: atomic transactions. In the *same* transaction as the order, insert a row into an **outbox** table describing the event:\n\n" +
          sql(`
BEGIN;
INSERT INTO orders (id, customer, total) VALUES (42, 'ana', 8000);
INSERT INTO outbox (event_id, type, payload, sent)
  VALUES ('evt-42', 'order_placed', '{"order":42}', false);
COMMIT;   -- both rows exist, or neither does
`) +
          "\nA separate **relay** process polls (or tails the database's change log for) unsent outbox rows, publishes each to the broker, and marks it sent. If the relay is slow or the broker is down, rows simply wait. Now the data and the intent to announce it are saved **atomically**. Place orders, run the relay, and try the failures.",
        widget: { type: "data-outbox", props: { mode: "outbox", fixedMode: true } },
      },
      {
        kind: "question",
        title: "Nothing lost",
        body: "Place at least 3 orders (switch on 'App crashes mid-transaction' or 'Broker is down' for some), then run the relay until every event is published.",
        widget: { type: "data-outbox", props: { mode: "outbox", fixedMode: true } },
        question: { type: "widget", goal: { mode: "outbox", ordersMin: 3, missingMax: 0, waitingMax: 0 }, prompt: "Get 3 orders published with no event lost." },
        explanation: "A crash mid-transaction rolls back both rows, so the customer gets an error and retries: no half-saved state. A broker outage just leaves rows unsent until the relay can reach it. Either way, **no order exists without an event waiting or delivered**.",
      },
      {
        kind: "explain",
        title: "At-least-once, so expect duplicates",
        body: "The relay does two things that can't be atomic: publish to the broker, then mark the row sent. If it crashes in between, the row stays 'unsent' and the next run publishes it **again**. We could mark first and publish second, but then a crash loses the event. Losing is worse than repeating, so outbox relays choose **at-least-once** delivery.\n\nThe consumers therefore have to be **idempotent**: handling the same event twice must have the same effect as once. The usual technique is to give every event a unique id and have the consumer remember the ids it has processed. Turn on 'Relay crashes before marking sent' and see a customer get two e-mails; then tick 'Mail service ignores repeats'.",
        widget: { type: "data-outbox", props: { mode: "outbox", fixedMode: true } },
      },
      {
        kind: "question",
        title: "Duplicates, defused",
        body: "Tick 'Mail service ignores repeats', make the relay crash after publishing at least once, then run it again. The broker will receive a repeat, yet no customer gets a second e-mail.",
        widget: { type: "data-outbox", props: { mode: "outbox", fixedMode: true } },
        question: { type: "widget", goal: { mode: "outbox", idempotent: true, repeatsMin: 1, duplicatesMax: 0, ordersMin: 1 }, prompt: "Cause a repeated delivery and let the consumer absorb it." },
        explanation: "The event was delivered twice (**at-least-once**), but the second time the mail service recognised the event id and did nothing, so the effect happened **exactly once**. 'Exactly-once' in practice means at-least-once delivery plus an idempotent receiver.",
      },
      {
        kind: "question",
        title: "Publish first or mark first?",
        body: "Why does the relay publish the event **before** marking the outbox row as sent?",
        question: {
          type: "choice",
          options: [
            "It's faster",
            "If it crashed between the two steps, publishing first risks a duplicate, which idempotent consumers absorb; marking first would risk a lost event, which nothing can repair",
            "Brokers refuse events for rows already marked sent",
            "There is no difference",
          ],
          answer: 1,
        },
        explanation: "Of the two failure modes, a **duplicate** is recoverable with an idempotent consumer, and a **lost** event is not. Design every step so its failure leaves you in the recoverable state.",
      },
      {
        kind: "code",
        title: "Write the relay",
        body: "Write `relay(outbox, publish)`. `outbox` is a list of rows like `{\"id\": 1, \"sent\": False}`. Go through the **unsent** rows in order: call `publish(row[\"id\"])`, and only if it succeeds set `row[\"sent\"] = True`. If `publish` raises an exception, **stop** (leave that row and every later row unsent). Return the list of ids published successfully.",
        language: "python",
        starter: `def relay(outbox, publish):
    published = []
    return published
`,
        solution: `def relay(outbox, publish):
    published = []
    for row in outbox:
        if row["sent"]:
            continue
        try:
            publish(row["id"])
        except Exception:
            break
        row["sent"] = True
        published.append(row["id"])
    return published
`,
        tests: [
          { id: "t1", description: "Publishes every unsent row, in order, and marks them", assertionCode: `box = [{"id": 1, "sent": False}, {"id": 2, "sent": False}]\nseen = []\nout = relay(box, seen.append)\nassert out == [1, 2] and seen == [1, 2] and all(r["sent"] for r in box), f"got {out}, {seen}, {box}"` },
          { id: "t2", description: "Skips rows already sent", assertionCode: `box = [{"id": 1, "sent": True}, {"id": 2, "sent": False}]\nseen = []\nout = relay(box, seen.append)\nassert out == [2] and seen == [2], f"row 1 was already sent; got {out}, {seen}"` },
          { id: "t3", description: "A failing publish stops the run and leaves that row unsent", assertionCode: `box = [{"id": 1, "sent": False}, {"id": 2, "sent": False}, {"id": 3, "sent": False}]\ndef flaky(i):\n    if i == 2:\n        raise ConnectionError("broker down")\nout = relay(box, flaky)\nassert out == [1], f"only 1 was published, got {out}"\nassert [r["sent"] for r in box] == [True, False, False], f"rows 2 and 3 must stay unsent: {box}"` },
          { id: "t4", description: "A later run picks up where it stopped", assertionCode: `box = [{"id": 1, "sent": True}, {"id": 2, "sent": False}, {"id": 3, "sent": False}]\nseen = []\nassert relay(box, seen.append) == [2, 3] and seen == [2, 3], "the next run should publish 2 and 3"` },
        ],
        hints: ["Loop over the rows; skip those with sent True.", "Wrap publish in try/except and break on failure, before setting sent."],
      },
      {
        kind: "code",
        title: "An idempotent consumer",
        body: "Write `handle_once(event_id, seen, action)`. If `event_id` is already in the set `seen`, do nothing and return `False`. Otherwise call `action(event_id)`, add the id to `seen`, and return `True`. (Add the id **after** the action succeeds, so a crash inside the action can be retried.)",
        language: "python",
        starter: `def handle_once(event_id, seen, action):
    return False
`,
        solution: `def handle_once(event_id, seen, action):
    if event_id in seen:
        return False
    action(event_id)
    seen.add(event_id)
    return True
`,
        tests: [
          { id: "t1", description: "The first delivery runs the action", assertionCode: `seen = set()\nsent = []\nr = handle_once("evt-1", seen, sent.append)\nassert r is True and sent == ["evt-1"] and "evt-1" in seen, f"got {r}, {sent}, {seen}"` },
          { id: "t2", description: "A repeat does nothing", assertionCode: `seen = set()\nsent = []\nhandle_once("evt-1", seen, sent.append)\nr = handle_once("evt-1", seen, sent.append)\nassert r is False and sent == ["evt-1"], f"the repeat must be ignored: {r}, {sent}"` },
          { id: "t3", description: "A failed action is not remembered, so it can be retried", assertionCode: `seen = set()\ndef boom(_):\n    raise RuntimeError("mail server down")\ntry:\n    handle_once("evt-9", seen, boom)\nexcept RuntimeError:\n    pass\nassert "evt-9" not in seen, "do not mark the event as seen if the action failed"` },
        ],
        hints: ["Check 'if event_id in seen' first.", "Call action() before seen.add()."],
      },
      {
        kind: "recap",
        points: [
          "Saving data and announcing it are **two writes in two systems**: a crash between them leaves an order with no event (the dual-write problem).",
          "The **outbox** pattern writes the order and an outbox row in **one transaction**. A relay publishes unsent rows later and marks them sent.",
          "Publish before marking sent: a crash then causes a **duplicate**, never a lost event. That is **at-least-once** delivery.",
          "Consumers must be **idempotent**: give events unique ids and remember which were handled.",
          "Alternatives to polling the outbox: tail the database's change log (change data capture) to publish.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 10. Long-running work and boring technology ───────────────────────────────
  {
    id: "fnd-data-10-queues-boring",
    title: "Queues, workflows and boring technology",
    summary: "Running multi-step jobs that survive crashes, and when a new data store is actually justified.",
    minutes: 14,
    xp: 85,
    steps: [
      {
        kind: "explain",
        title: "Work that outlives a request",
        body: "Fulfilling a ticket order takes four steps: charge the card, reserve the seats, e-mail the tickets, mark the order done. You cannot do all that while the customer's browser waits, and it must finish even if a server restarts in the middle. So the web request just **puts a message on a queue** ('fulfil order 42') and answers quickly; a **worker** picks the message up and does the job.\n\nA queue gives you decoupling and smoothing (a burst of orders waits its turn). Its delivery rules are worth knowing: a worker **receives** a message, does the work, then **acknowledges** it. If the worker dies before acknowledging, the queue assumes failure and, after a **visibility timeout**, hands the message to another worker. After a few failed tries it moves to a **dead-letter queue** for humans. That's **at-least-once** delivery again: a job can run more than once.",
      },
      {
        kind: "explain",
        title: "A crash in the middle of the job",
        body: "Run the four steps as one queue message. Kill the worker right after a step and watch what the retry does. Then turn on idempotency keys (each step records 'I already did this for order 42' and skips itself).",
        widget: { type: "data-workflow", props: { mode: "queue", fixedMode: true } },
      },
      {
        kind: "question",
        title: "Charge the card twice",
        body: "Kill the worker after **'charge the card'** with idempotency keys off, and see what the retry costs the customer.",
        widget: { type: "data-workflow", props: { mode: "queue", fixedMode: true } },
        question: { type: "widget", goal: { mode: "queue", crash: true, status: "double-charge" }, prompt: "Cause a double charge." },
        explanation: "The worker charged the card, died before acknowledging, and the retry started from the top, so the customer was charged again. At-least-once delivery plus a non-idempotent step equals a double charge. Idempotency keys (or a unique request id sent to the payment provider) are what make retries safe.",
      },
      {
        kind: "explain",
        title: "A durable workflow",
        body: "A queue message knows nothing about progress. A **durable workflow** engine (Temporal, AWS Step Functions, Azure Durable Functions and similar) keeps a **history** of every step that finished. After a crash it resumes at the step that was running; it does not repeat the earlier ones. It can also wait for days (a payment settling, a human approval) without holding a process open, and when a step fails for good it can run **compensations** (a refund) for the steps already done. That structure is called a **saga**.\n\nSwitch to the workflow engine and make the seats sell out during the job.",
        widget: { type: "data-workflow", props: { mode: "workflow", fixedMode: true } },
      },
      {
        kind: "question",
        title: "Fail cleanly",
        body: "With the **workflow** engine, make the seats sell out after the card is charged, and see how the system ends up.",
        widget: { type: "data-workflow", props: { mode: "workflow", fixedMode: true } },
        question: { type: "widget", goal: { mode: "workflow", soldOut: true, status: "refunded" }, prompt: "Let the saga compensate." },
        explanation: "The charge had succeeded, the seat reservation failed for good, so the engine ran the **compensation**: a refund. Without it (the queue version) the message ends in a dead-letter queue with the money taken and no tickets, waiting for a human.",
      },
      {
        kind: "question",
        title: "Idempotency still matters",
        body: "Compare the two modes with a crash after the charge. Find a setup with a crash where the customer is charged **at most once**.",
        widget: { type: "data-workflow", props: { mode: "queue" } },
        question: { type: "widget", goal: { crash: true, idempotent: true, chargesMax: 1 }, prompt: "Crash the worker and still charge only once." },
        explanation: "Even a workflow engine re-runs the interrupted step after a crash (it cannot know whether the card was charged). **Idempotency keys** make that re-run harmless. Workflows reduce how much is repeated; idempotency makes repeats safe.",
      },
      {
        kind: "question",
        title: "Queue or workflow?",
        body: "Which job is the best fit for a **plain queue** with a retrying worker?",
        question: {
          type: "choice",
          options: [
            "Resize one uploaded photo into three thumbnails (a single, safe-to-repeat step)",
            "Onboard a new venue over three weeks: collect documents, wait for a human to approve, sign a contract, then go live",
            "Charge a card, reserve seats, e-mail, with refunds if any step fails",
            "A month-long subscription lifecycle with reminders, retries and cancellations",
          ],
          answer: 0,
        },
        explanation: "A single idempotent step is exactly what a queue is for. Multi-step, long-lived processes with waiting, human steps and undo logic are where a workflow engine (or a hand-built state machine in your database) earns its complexity.",
      },
      {
        kind: "code",
        title: "Undo what was done",
        body: "Write `run_saga(steps, fail_at=None)`. `steps` is a list of `(name, undo_name)` pairs, e.g. `[(\"charge\", \"refund\"), (\"reserve\", \"release\")]`. Run them in order and return a log of strings: `\"do <name>\"` for each success. The step whose index equals `fail_at` fails: log `\"fail <name>\"`, then log `\"undo <undo_name>\"` for every **earlier** step, newest first, and stop.",
        language: "python",
        starter: `def run_saga(steps, fail_at=None):
    log = []
    return log
`,
        solution: `def run_saga(steps, fail_at=None):
    log = []
    done = []
    for i, (name, undo) in enumerate(steps):
        if i == fail_at:
            log.append("fail " + name)
            for earlier in reversed(done):
                log.append("undo " + earlier)
            return log
        log.append("do " + name)
        done.append(undo)
    return log
`,
        tests: [
          { id: "t1", description: "No failure: every step runs", assertionCode: `steps = [("charge", "refund"), ("reserve", "release"), ("email", "unsend")]\nassert run_saga(steps) == ["do charge", "do reserve", "do email"], f"got {run_saga(steps)}"` },
          { id: "t2", description: "Failure in the middle undoes earlier steps", assertionCode: `steps = [("charge", "refund"), ("reserve", "release"), ("email", "unsend")]\nassert run_saga(steps, fail_at=1) == ["do charge", "fail reserve", "undo refund"], f"got {run_saga(steps, fail_at=1)}"` },
          { id: "t3", description: "Undo happens newest first", assertionCode: `steps = [("charge", "refund"), ("reserve", "release"), ("email", "unsend")]\nassert run_saga(steps, fail_at=2) == ["do charge", "do reserve", "fail email", "undo release", "undo refund"], f"got {run_saga(steps, fail_at=2)}"` },
          { id: "t4", description: "A failure at the first step has nothing to undo", assertionCode: `assert run_saga([("charge", "refund")], fail_at=0) == ["fail charge"], "nothing to undo"` },
        ],
        hints: ["Remember each finished step's undo name in a list.", "On failure, loop over that list in reverse."],
      },
      {
        kind: "explain",
        title: "Choose boring technology",
        body: "Everything so far used one relational database for almost everything, and there is a reason that is a good default. Every new kind of data store you add must be **learned, deployed, monitored, backed up, secured, upgraded and debugged at 3 a.m.**, and its data must be kept in step with the rest. A sensible team gives itself only a small budget for novelty and spends it on what makes the product different, not on the database.\n\nA mature relational database (PostgreSQL, MySQL, SQLite for small things) already does: transactions, indexes, JSON documents, full-text search, geospatial queries, queues (`SELECT ... FOR UPDATE SKIP LOCKED`), scheduled jobs, and enough scale for the vast majority of products.\n\nThe rule is not 'never use anything else'. It is: **start boring, measure, and move only when evidence shows the boring option can't meet a stated requirement.** Judge six workloads on their numbers.",
        widget: { type: "data-boring" },
      },
      {
        kind: "question",
        title: "Let the numbers decide",
        body: "Decide all six: keep the relational database, or adopt something specialised.",
        widget: { type: "data-boring" },
        question: { type: "widget", goal: {}, prompt: "Get all six right." },
        explanation: "Four of the six were solved by what you already had; the two that weren't had numbers (two million writes a second, forty petabytes of blobs) that no single relational node can serve. Notice that the strongest arguments were *quantities*, never names of products.",
      },
      {
        kind: "question",
        title: "The best reason to add a new data store",
        body: "Which is the strongest reason to introduce a new kind of database into a system?",
        question: {
          type: "choice",
          options: [
            "A conference talk made it sound exciting",
            "Measurements show the current database cannot meet a specific throughput, latency or size requirement, and the new one demonstrably does",
            "Another team in the company uses it",
            "It's newer and therefore faster",
          ],
          answer: 1,
        },
        explanation: "A measured gap between a stated requirement and what you have is the only reason that survives scrutiny, and it comes with a benchmark you can re-run. Everything else is fashion.",
      },
      {
        kind: "recap",
        points: [
          "Long jobs go on a **queue**: acknowledge after the work, retry on failure, dead-letter after too many failures. Delivery is **at-least-once**, so steps must be idempotent.",
          "A **durable workflow** records finished steps, resumes after crashes, waits for long periods and runs **compensations** (a saga) when a step fails for good.",
          "Idempotency keys make retries safe in both designs.",
          "**Choose boring technology**: default to a relational database and move only when measurements show it cannot meet a stated requirement.",
          "Every new data store is a permanent operational cost: learn it, run it, secure it, back it up, keep it in sync.",
        ],
      },
    ],
  },
];

export const dataModule: Module = {
  id: "data",
  part: "systems",
  title: "Databases under load",
  blurb: "Indexes, query plans, transactions, connection pools, safe migrations, replicas, regions, the outbox pattern and when to stay boring.",
  icon: "database",
  lessons,
};
