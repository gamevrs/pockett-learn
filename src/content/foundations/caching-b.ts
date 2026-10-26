import type { ConceptLesson } from "../../learn/types.ts";

/** Fenced plain-text block (tables, headers) for lesson prose. */
const txt = (s: string) => "~~~text\n" + s.trim() + "\n~~~";
/** Paragraphs joined with blank lines. */
const P = (...paras: string[]) => paras.join("\n\n");

/** Lessons 5 to 7 of "Remember the answer": invalidation races, stampedes, reading hit rate. */
export const cachingLessonsB: ConceptLesson[] = [
  // ─────────────────────────────── 5. Invalidation ───────────────────────────────
  {
    id: "fnd-cache-5-invalidation",
    title: "Why invalidation is hard",
    summary: "Two copies of one fact, and the race between a refill and an update that leaves the cache wrong.",
    minutes: 10,
    xp: 60,
    steps: [
      {
        kind: "explain",
        title: "Two copies, one truth",
        body: P(
          "A cache means a fact now lives in **two places**. Whenever the original changes, the copy is wrong until someone fixes it. That fixing is **invalidation**, and the trouble is that the two places can't change at the same instant.",
          "The usual toolbox:\n\n- **Let it expire** (a TTL): accept a bounded amount of staleness.\n- **Delete on write**: after changing the database, remove the cache entry.\n- **Update on write**: after changing the database, put the new value in the cache.\n- **Announce changes**: the database publishes “row 42 changed” and cache owners react.\n- **Never overwrite**: put a version in the key, so new data gets a new key.",
          "Delete-on-write looks airtight. Let's attack it.",
        ),
      },
      {
        kind: "explain",
        title: "A reader and a writer, five steps",
        body: P(
          "The Encore ticket site shows **seats left: 12**. The cache entry just expired, so a *reader* is about to refill it, while a *writer* sells a seat. Each side has a few separate steps, and the steps of the two sides can interleave in many ways.",
          "Reader: **(1)** miss, **(2)** read the seat count from the database, **(3)** store it in the cache.\nWriter: **(1)** write 11 to the database, **(2)** delete the cache entry.",
          "Press the Run buttons to choose the order. The counter shows how many of the ten possible orders end with a wrong cache.",
        ),
        widget: { type: "cache-race", props: { strategies: ["delete-after"], initial: "delete-after" } },
      },
      {
        kind: "question",
        title: "Break it",
        body: "Find the order that leaves the cache **wrong**: the cache says 12, the database says 11, and nothing will fix it until the entry expires. (Hint: let the reader read the database first, then let the whole writer run, then let the reader finish.)",
        widget: { type: "cache-race", props: { strategies: ["delete-after"], initial: "delete-after" } },
        question: { type: "widget", goal: { strategy: "delete-after", stale: true }, prompt: "Run R1, R2, W1, W2, R3 in that order." },
        explanation: "The reader read **12** *before* the sale, the writer finished completely, and then the reader stored its **old** 12 *after* the delete. The delete had nothing to delete yet, so the stale value slipped in behind it. The fix looked correct on paper and fails because two sequences interleaved.",
      },
      {
        kind: "question",
        title: "How rare is it?",
        body: "Under “write the database, then delete the entry”, how many of the **10** possible orders end with a stale cache?",
        widget: { type: "cache-race", props: { strategies: ["delete-after"], initial: "delete-after" }, live: true },
        question: { type: "number", answer: 1 },
        explanation: "Just **1 of 10**: the reader must read before the write and store after the delete. That is why this bug survives testing. But a busy site runs millions of these races a day, and each one that goes wrong stays wrong until the TTL ends. Rare and permanent is a bad combination.",
      },
      {
        kind: "explain",
        title: "The other orders are worse",
        body: P(
          "What if the writer deletes the entry **first**, then writes the database? It feels safer: no stale copy can survive a delete. But a reader that arrives between the two steps misses, reads the *old* database row, and caches it, and then the writer changes the row. And what if the writer *updates* the cache instead of deleting? Then a slow reader's old value can overwrite it.",
          "Switch strategies and count how many of the ten orders end stale for each.",
        ),
        widget: { type: "cache-race", props: { strategies: ["delete-after", "delete-before", "update-after"], initial: "delete-before" } },
      },
      {
        kind: "question",
        title: "Count them",
        body: "If the writer **deletes the entry first** and then writes the database, how many of the 10 orders end stale?",
        widget: { type: "cache-race", props: { strategies: ["delete-after", "delete-before", "update-after"], initial: "delete-before" }, live: true },
        question: { type: "number", answer: 6 },
        explanation: "**6 of 10.** Deleting before the write widens the window, because a reader can refill the entry from the old row at any point until the database changes. “Write first, then delete” is the better default, but even it isn't perfect.",
      },
      {
        kind: "explain",
        title: "Make the race harmless",
        body: P(
          "You can't stop readers and writers from overlapping, so make the overlap **safe**. The trick below gives every value a **version**. When the writer invalidates, it leaves behind a small marker saying “version 2 exists”. A reader that read version 1 is only allowed to store if no *newer* version has been seen. The slow reader's late store is simply refused.",
          "Pick the versioned strategy, then run the dangerous order again.",
        ),
        widget: { type: "cache-race", props: { strategies: ["delete-after", "versioned"], initial: "versioned" } },
      },
      {
        kind: "question",
        title: "Zero stale orders",
        body: "Choose the **versioned** writer and run an interleaving to the end. The counter should say **0 of 10**.",
        widget: { type: "cache-race", props: { strategies: ["delete-after", "versioned"], initial: "delete-after" } },
        question: { type: "widget", goal: { strategy: "versioned", safe: true, done: true }, prompt: "Switch to the versioned strategy and run all five steps." },
        explanation: "With a version check, no order ends stale. The cost: the cache must store a version with each value (or a marker), and the store step becomes a *compare-and-set* instead of a plain write. Many caches support this natively (Memcached's `cas`, Redis scripts or transactions).",
      },
      {
        kind: "explain",
        title: "A tool for each situation",
        body: P(
          "In practice you combine several defences instead of looking for one perfect one:",
          txt(`
technique                     what it fixes                    what it costs
TTL on every entry            any bug: bounds the damage       extra database reads
delete after the write        simple, usually enough           the rare race above
versioned values / markers    late refills overwriting new     compare-and-set support
versioned keys (recipe:42:v7) no invalidation needed at all    old keys linger until evicted
change events (CDC, pub/sub)  cross-service invalidation       another system to run
delayed second delete         catches the straggling refill    a timer; still a guess
`),
          "A **TTL on everything** is the seatbelt: whatever else goes wrong, no entry is wrong for longer than the TTL. Treat explicit invalidation as an optimisation on top of that, not a replacement for it.",
          "And the best invalidation strategy is often to **cache less**: data that must be exact the instant it changes (an account balance, the last seat) is better read from the source of truth.",
        ),
      },
      {
        kind: "question",
        title: "Reduce the damage",
        body: "A cached value is occasionally left stale by races you can't fully eliminate. Which changes **limit how long** a wrong value stays? Pick all that apply.",
        question: {
          type: "choice",
          options: [
            "Give every entry a short time to live",
            "Put a version in the key so a new write uses a new key",
            "Remove the TTL so entries are only changed on writes",
            "Make the writer delete the cache entry before writing the database",
          ],
          answer: [0, 1],
        },
        explanation: "A short TTL caps the length of any mistake, and versioned keys avoid the mistake by never overwriting. Removing the TTL makes one lost invalidation permanent, and deleting *before* the write is the order that went stale in 6 of 10 interleavings.",
      },
      {
        kind: "code",
        title: "The version guard",
        body: "The cache is a dict mapping a key to a pair `(version, value)`. Write three functions.\n\n- `invalidate(cache, key, version)` leaves a **marker**: the entry becomes `(version, None)`.\n- `set_if_newer(cache, key, value, version)` stores `(version, value)` **unless** the cache already holds a *higher* version for that key. It returns `True` if it stored and `False` if it refused.\n- `get(cache, key)` returns the value, or `None` if there is no entry or only a marker.",
        language: "python",
        starter: `def invalidate(cache, key, version):
    pass


def set_if_newer(cache, key, value, version):
    return False


def get(cache, key):
    return None
`,
        solution: `def invalidate(cache, key, version):
    cache[key] = (version, None)


def set_if_newer(cache, key, value, version):
    if key in cache and cache[key][0] > version:
        return False
    cache[key] = (version, value)
    return True


def get(cache, key):
    if key not in cache:
        return None
    return cache[key][1]
`,
        tests: [
          {
            id: "store",
            description: "Stores into an empty cache and reads it back",
            assertionCode: `c = {}\nassert set_if_newer(c, "seats", 12, 1) is True\nassert get(c, "seats") == 12`,
          },
          {
            id: "marker",
            description: "invalidate leaves a marker that reads as None",
            assertionCode: `c = {}\nset_if_newer(c, "seats", 12, 1)\ninvalidate(c, "seats", 2)\nassert get(c, "seats") is None\nassert c["seats"] == (2, None)`,
          },
          {
            id: "refuse",
            description: "A reader holding an older version is refused",
            assertionCode: `c = {}\ninvalidate(c, "seats", 2)\nassert set_if_newer(c, "seats", 12, 1) is False, "version 1 must not overwrite the version-2 marker"\nassert get(c, "seats") is None`,
          },
          {
            id: "accept",
            description: "A reader holding the current version may fill",
            assertionCode: `c = {}\ninvalidate(c, "seats", 2)\nassert set_if_newer(c, "seats", 11, 2) is True\nassert get(c, "seats") == 11`,
          },
          {
            id: "newer",
            description: "A newer version replaces an older one",
            assertionCode: `c = {}\nset_if_newer(c, "a", "old", 1)\nassert set_if_newer(c, "a", "new", 3) is True\nassert get(c, "a") == "new"`,
          },
        ],
        hints: ["The cache entry is `(version, value)`, so `cache[key][0]` is its version.", "Refuse only when the stored version is strictly greater than the one offered; an equal version is allowed."],
      },
      {
        kind: "recap",
        points: [
          "A cache is a second copy, so every write creates a window where the copy is wrong: **invalidation** is about shrinking and surviving that window.",
          "“Write the database, then delete the entry” is a good default, but a slow reader can still refill the old value **after** the delete.",
          "Make races harmless with **versions** (compare-and-set refills, versioned keys), and bound the damage with a **TTL on every entry**.",
          "Don't cache what must be exact at the instant it changes; read it from the source of truth.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 6. Stampede ───────────────────────────────
  {
    id: "fnd-cache-6-stampede",
    title: "The stampede",
    summary: "When a hot entry expires, everyone rebuilds it at once. Locks, jitter and refreshing early.",
    minutes: 10,
    xp: 60,
    steps: [
      {
        kind: "explain",
        title: "Everyone arrives at the same second",
        body: P(
          "Encore's “what's on tonight” page takes **2 seconds** to build from the database and is cached for 10 seconds. It gets five requests a second. Think about the moment the entry expires: request one misses and starts rebuilding. For the next 2 seconds, while the rebuild runs, requests two, three, four... *also* miss, and each one starts the same expensive query.",
          "That's a **cache stampede** (a thundering herd, or dog-pile): many requests for the same missing entry all go to the database together, often at the exact moment it is already slow. A slow database means longer rebuilds, which means more requests piling in. It can spiral.",
          "The chart plots database queries per second for **24 popular pages**, all cached at second 0, as if the cache was just flushed by a deploy. The database copes with 15 queries a second. Watch the first expiry.",
        ),
        widget: { type: "cache-stampede", props: { tools: [], initial: {} } },
      },
      {
        kind: "question",
        title: "How bad?",
        body: "With no protection, how many queries hit the database in the **busiest single second**?",
        widget: { type: "cache-stampede", props: { tools: [], initial: {} }, live: true },
        question: { type: "number", answer: 120, unit: "queries" },
        explanation: "24 pages × 5 requests per second = **120** queries in one second, eight times what the database can take. Each page needed only *one* rebuild, but every request that arrived during the rebuild ran its own copy.",
      },
      {
        kind: "explain",
        title: "Fix one: let one request rebuild",
        body: P(
          "Make the herd wait. When a request misses, it takes a **lock** (or records “I'm rebuilding this”) for that key. Requests that arrive while it is held either wait for the answer or are served the old value. Only one query per key ever reaches the database. This is called **request coalescing** or **single flight**.",
          "Turn on the lock below and compare the total number of queries.",
        ),
        widget: { type: "cache-stampede", props: { tools: ["lock"], initial: {} } },
      },
      {
        kind: "question",
        title: "Cut the waste",
        body: "Using only the **lock**, bring the total queries over the 40 seconds below **80**.",
        widget: { type: "cache-stampede", props: { tools: ["lock"], initial: {} } },
        question: { type: "widget", goal: { lock: true, totalMax: 80 }, prompt: "Turn on the lock." },
        explanation: "From about 720 queries down to 72: one per page per expiry. But look at the chart again. The peak is still **24**, over the limit of 15, because all 24 pages still expire in the same second. The lock removed the duplicates, not the synchronisation.",
      },
      {
        kind: "explain",
        title: "Fix two: don't expire together",
        body: P(
          "Entries that were stored at the same moment with the same TTL expire at the same moment. **Jitter** adds a small random amount to each TTL (say ±30%), so the expiries spread out and the rebuilds arrive as a trickle instead of a wave.",
          "Combine lock and jitter, or try jitter alone, and find a setup that keeps the busiest second at or under the limit.",
        ),
        widget: { type: "cache-stampede", props: { tools: ["lock", "jitter"], initial: {} } },
      },
      {
        kind: "question",
        title: "Under the limit",
        body: "Turn on whichever protections you need so the busiest second stays **at 15 queries or fewer**.",
        widget: { type: "cache-stampede", props: { tools: ["lock", "jitter", "early"], initial: {} } },
        question: { type: "widget", goal: { peakMax: 15 }, prompt: "Combine protections to get the peak under 15." },
        explanation: "You need both ideas: **fewer duplicates** (lock) *and* **less synchronisation** (jitter). The lock alone leaves a 24-query spike, and jitter alone still lets each page's herd run its duplicate queries. Defences in layers are the norm in caching.",
      },
      {
        kind: "explain",
        title: "Fix three: refresh before it expires",
        body: P(
          "Why wait for the miss at all? With **early refresh**, a request that finds an entry close to expiry (say in the last 20% of its life) starts rebuilding it in the background while still returning the current copy. The entry is replaced before readers ever see a miss, so nobody waits.",
          "Variants: **refresh-ahead** with a timer, **probabilistic early expiry** (each read has a small chance of refreshing that grows as the deadline nears, so no timer or lock is needed), and **stale-while-revalidate**: serve the expired value once more while one request refreshes it.",
          "Try early refresh alone, then early refresh with jitter.",
        ),
        widget: { type: "cache-stampede", props: { tools: ["lock", "jitter", "early"], initial: { early: true } } },
      },
      {
        kind: "question",
        title: "Which defence for which problem?",
        body: "Match the symptom to the best fix: *“Right after every deploy flushes the cache, the database spikes to ten times normal load for about ten seconds, then calms down.”*",
        question: {
          type: "choice",
          options: [
            "Make every TTL longer",
            "Warm the cache before sending traffic to the new version, and add jitter",
            "Switch from LRU to LFU",
            "Remove the cache and read the database directly",
          ],
          answer: 1,
        },
        explanation: "An empty cache means every key misses together: a **cold-start stampede**. Pre-warm the hottest keys before the new version takes traffic, and jitter the TTLs so the first expiries don't line up. A longer TTL only delays the next spike.",
      },
      {
        kind: "code",
        title: "Single flight",
        body: "Write `count_fetches(arrivals, fetch_secs)`. `arrivals` is a sorted list of the times (in seconds) at which requests for **one** missing key arrive. A rebuild takes `fetch_secs` seconds. A request that arrives while a rebuild is still running **joins** it instead of starting another. Return how many rebuilds are started. A request that arrives at the exact moment a rebuild finishes starts a new one.",
        language: "python",
        starter: `def count_fetches(arrivals, fetch_secs):
    # each request starts a fetch: that is the stampede
    return len(arrivals)
`,
        solution: `def count_fetches(arrivals, fetch_secs):
    fetches = 0
    busy_until = None
    for t in arrivals:
        if busy_until is None or t >= busy_until:
            fetches += 1
            busy_until = t + fetch_secs
    return fetches
`,
        tests: [
          {
            id: "herd",
            description: "Ten requests inside one 2-second rebuild start just one fetch",
            assertionCode: `assert count_fetches([0, 0.1, 0.3, 0.5, 0.9, 1.0, 1.2, 1.5, 1.7, 1.9], 2) == 1`,
          },
          {
            id: "spread",
            description: "Widely spaced requests each need their own fetch",
            assertionCode: `assert count_fetches([0, 5, 10], 2) == 3`,
          },
          {
            id: "mixed",
            description: "A second herd after the first rebuild finished starts a second fetch",
            assertionCode: `assert count_fetches([0, 0.5, 1, 3, 3.5, 4], 2) == 2, "two bursts, two fetches"`,
          },
          {
            id: "boundary",
            description: "A request exactly at the finish time starts a new fetch",
            assertionCode: `assert count_fetches([0, 2], 2) == 2`,
          },
          {
            id: "empty",
            description: "No requests, no fetches",
            assertionCode: `assert count_fetches([], 2) == 0`,
          },
        ],
        hints: ["Remember when the current rebuild finishes: `busy_until`.", "A request starts a new fetch only if nothing is running (`busy_until` is None) or `t >= busy_until`."],
      },
      {
        kind: "code",
        title: "Add jitter",
        body: "Write `jittered_ttl(base, key, spread)` so different keys get slightly different TTLs, but the **same key always gets the same one** (so tests and debugging are predictable). Compute `fraction = (sum of the character codes of key) % 100 / 100`, then return `base * (1 - spread + 2 * spread * fraction)`, rounded to 2 decimals. With `spread = 0.3` the TTL lands between 70% and 130% of `base`.",
        language: "python",
        starter: `def jittered_ttl(base, key, spread):
    return base
`,
        solution: `def jittered_ttl(base, key, spread):
    fraction = (sum(ord(c) for c in key) % 100) / 100
    return round(base * (1 - spread + 2 * spread * fraction), 2)
`,
        tests: [
          {
            id: "range",
            description: "Stays between (1 - spread) and (1 + spread) times the base",
            assertionCode: `for k in ["a", "recipe:1", "recipe:2", "zzz", "home", "trending", "x" * 40]:\n    t = jittered_ttl(100, k, 0.3)\n    assert 70 <= t <= 130, f"{k!r} gave {t}"`,
          },
          {
            id: "exact",
            description: "Matches the formula for the key 'a'",
            assertionCode: `# ord('a') = 97 -> fraction 0.97 -> 100 * (0.7 + 0.6 * 0.97) = 128.2\nassert jittered_ttl(100, "a", 0.3) == 128.2, f"got {jittered_ttl(100, 'a', 0.3)}"`,
          },
          {
            id: "stable",
            description: "The same key always gets the same TTL",
            assertionCode: `assert jittered_ttl(60, "home", 0.2) == jittered_ttl(60, "home", 0.2)`,
          },
          {
            id: "spreads",
            description: "Different keys are spread out, not identical",
            assertionCode: `vals = {jittered_ttl(100, f"page:{i}", 0.3) for i in range(20)}\nassert len(vals) >= 10, f"only {len(vals)} different TTLs for 20 keys"`,
          },
          {
            id: "none",
            description: "A spread of 0 means no jitter",
            assertionCode: `assert jittered_ttl(50, "anything", 0) == 50`,
          },
        ],
        hints: ["`sum(ord(c) for c in key)` adds up the character codes.", "Use `round(value, 2)` on the final number."],
      },
      {
        kind: "recap",
        points: [
          "A **stampede** happens when many requests find the same entry missing and all rebuild it at once, hammering the database exactly when it is slowest.",
          "**Single flight** (a lock or in-flight marker) lets one request rebuild while the others wait or get the old value.",
          "**Jitter** spreads expiry times so many keys don't expire together; the lock and jitter solve different halves of the problem.",
          "**Refreshing early** (or serving stale while revalidating) rebuilds before readers ever see a miss. **Warm** the cache before sending traffic after a deploy or restart.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 7. Hit rate ───────────────────────────────
  {
    id: "fnd-cache-7-hit-rate",
    title: "What hit rate tells you",
    summary: "What drives hit rate (size, key cardinality, popularity skew, cold starts) and what it hides.",
    minutes: 9,
    xp: 55,
    steps: [
      {
        kind: "explain",
        title: "One number everyone watches",
        body: P(
          "**Hit rate** is hits divided by total lookups. It's the first number on every cache dashboard because it's easy to read and it tracks the thing you want: fewer trips to the slow path.",
          txt(`
hit rate = hits / (hits + misses)
miss rate = 1 − hit rate
`),
          "Below is an LRU cache in front of a catalog of 1,000 items, with 1,000 requests per second. The bars show the hit rate of each batch of 200 requests. Change the size of the cache and see what moves.",
        ),
        widget: { type: "cache-hitrate", props: { keys: 1000, size: 100, skewed: true, cold: false, controls: ["size"] } },
      },
      {
        kind: "question",
        title: "Buy a bigger cache",
        body: "With 1,000 distinct items and some items much more popular than others, find a cache size that gives a hit rate of **80% or more**.",
        widget: { type: "cache-hitrate", props: { keys: 1000, size: 50, skewed: true, cold: false, controls: ["size"] } },
        question: { type: "widget", goal: { keys: 1000, skewed: true, hitMin: 80 }, prompt: "Raise the cache size." },
        explanation: "Storing **half** the catalog (500 entries) reaches about 87%, because popular items sit at the front of the line. Cache size has *diminishing returns*: the first entries you keep are the most requested, and each extra slot buys less than the last.",
      },
      {
        kind: "explain",
        title: "Popularity decides everything",
        body: P(
          "A cache works because **a few keys get most of the requests**: a skewed (“long tail”) popularity. If every key is equally likely, the cache can only hit when it happens to hold the one you asked for, so the hit rate is simply *entries ÷ keys*.",
          "Turn off the skew below. The same cache, the same catalog, a very different result.",
        ),
        widget: { type: "cache-hitrate", props: { keys: 1000, size: 100, skewed: false, cold: false, controls: ["skew"] } },
      },
      {
        kind: "question",
        title: "Equal popularity",
        body: "1,000 items, all equally popular, room for **100**. What hit rate (in %) should you expect?",
        widget: { type: "cache-hitrate", props: { keys: 1000, size: 100, skewed: false, cold: false, controls: ["skew"] }, live: true },
        question: { type: "number", answer: 10, tolerance: 2, unit: "%" },
        explanation: "About **10%**: 100 slots out of 1,000 equally likely keys. With no popular keys to favour, a cache is only as good as its coverage. That's why key *cardinality* (how many distinct keys exist) matters: caching a query keyed by user id × timestamp × filters creates an enormous key space where nothing repeats.",
      },
      {
        kind: "explain",
        title: "Small percentages, large loads",
        body: P(
          "Hit rate is a percentage of a big number, so small changes matter. At 1,000 requests a second:",
          txt(`
hit rate   misses per second (to the database)
90%        100
95%         50
99%         10
99.9%        1
`),
          "Going from 95% to 99% sounds like four points; for the database it's a **five-fold** drop. When you size the database, you size it for the *miss* rate, so the question is never “is 95% good?”, it is “what happens to the database if it falls to 90%?”",
        ),
      },
      {
        kind: "question",
        title: "Do the sum",
        body: "At 1,000 requests per second, a cache hit rate of **99%** sends how many requests per second to the database?",
        question: { type: "number", answer: 10, unit: "per second" },
        explanation: "1% of 1,000 is **10**. If an incident drops the hit rate to 90%, that becomes 100: ten times as many queries from a change that looks small on a graph.",
      },
      {
        kind: "explain",
        title: "Cold starts",
        body: P(
          "A cache that has just started is **cold**: it holds nothing, so the first requests all miss. The hit rate climbs as the cache fills, and during that climb the database takes the full load. That's how a restart, a deploy or a failover can knock over a database that was fine yesterday.",
          "Tick “Start with an empty cache” below and watch the early bars. The cache is the same; only its starting contents change.",
        ),
        widget: { type: "cache-hitrate", props: { keys: 1000, size: 1000, skewed: true, cold: true, controls: ["cold"] } },
      },
      {
        kind: "question",
        title: "First moments",
        body: "A cache with room for the whole catalog is restarted empty. Is it correct to say “its hit rate will be 100% as soon as it's back”?",
        widget: { type: "cache-hitrate", props: { keys: 1000, size: 1000, skewed: true, cold: true, controls: ["cold"] }, live: true },
        question: {
          type: "choice",
          options: [
            "Yes, because the cache is big enough for everything",
            "No: it must first be filled by misses, so the early hit rate is much lower",
            "Yes, because popular keys are loaded first",
            "No: a cache can never reach 100%",
          ],
          answer: 1,
        },
        explanation: "Capacity is only the *ceiling*. Every key still has to miss once to get in. Plan for cold starts: warm the cache from a list of hot keys, bring caches up gradually behind a load balancer, and make sure the database can survive the first minute.",
      },
      {
        kind: "explain",
        title: "What a good hit rate hides",
        body: P(
          "Hit rate counts *requests*, not *cost*. Compare two caches:\n\n- A cache of small product thumbnails with a **95%** hit rate, where a miss costs 5 ms.\n- A cache of monthly sales reports with a **45%** hit rate, where a miss costs 800 ms of database work.",
          "The report cache is saving far more time and database load, despite the unimpressive percentage. Change the cost of a miss below and look at “Waiting avoided”.",
          "Other things a single number hides: a high hit rate on **stale** data (fast and wrong), a healthy average but a terrible **miss latency** at the 99th percentile, and one rarely-used feature with a 0% hit rate hidden inside a healthy overall average. Track hit rate **per kind of key**, not just overall.",
        ),
        widget: { type: "cache-hitrate", props: { keys: 5000, size: 100, skewed: true, cold: false, missMs: 800, controls: ["cost"] } },
      },
      {
        kind: "question",
        title: "Which cache earns its keep?",
        body: "Cache A: hit rate 87%, a miss costs 5 ms. Cache B: hit rate 45%, a miss costs 800 ms. At the same request rate, which one saves more total waiting?",
        question: {
          type: "choice",
          options: ["Cache A, because 87% beats 45%", "Cache B, because each hit avoids a far more expensive miss", "They save the same", "Neither saves anything"],
          answer: 1,
        },
        explanation: "Time saved ≈ hits × cost of a miss. A: 0.87 × 5 = 4.4 ms per request. B: 0.45 × 800 = 360 ms per request. **Cache B is worth about 80× more**, which is why you cache the expensive things first even if their hit rate looks modest.",
      },
      {
        kind: "code",
        title: "Read a log",
        body: "A cache writes one letter per lookup: `H` for a hit, `M` for a miss. Write `summarize(log, hit_ms, miss_ms)` that returns a dict with `hit_rate` (a fraction between 0 and 1, rounded to 3 decimals) and `avg_ms` (the average time per lookup, rounded to 2 decimals). For an empty log return `hit_rate` 0 and `avg_ms` 0.",
        language: "python",
        starter: `def summarize(log, hit_ms, miss_ms):
    return {"hit_rate": 0, "avg_ms": 0}
`,
        solution: `def summarize(log, hit_ms, miss_ms):
    if not log:
        return {"hit_rate": 0, "avg_ms": 0}
    hits = log.count("H")
    misses = log.count("M")
    total = hits + misses
    avg = (hits * hit_ms + misses * miss_ms) / total
    return {"hit_rate": round(hits / total, 3), "avg_ms": round(avg, 2)}
`,
        tests: [
          {
            id: "ninety",
            description: "9 hits and 1 miss",
            assertionCode: `r = summarize("HHHHHHHHHM", 1, 40)\nassert r["hit_rate"] == 0.9, r\nassert r["avg_ms"] == 4.9, r`,
          },
          {
            id: "mostly-miss",
            description: "1 hit and 3 misses",
            assertionCode: `r = summarize("MMHM", 2, 100)\nassert r["hit_rate"] == 0.25, r\nassert r["avg_ms"] == 75.5, r`,
          },
          {
            id: "thirds",
            description: "Rounds the hit rate to 3 decimals",
            assertionCode: `r = summarize("HMM", 1, 10)\nassert r["hit_rate"] == 0.333, r`,
          },
          {
            id: "empty",
            description: "An empty log gives zeros",
            assertionCode: `assert summarize("", 1, 40) == {"hit_rate": 0, "avg_ms": 0}`,
          },
        ],
        hints: ["`log.count('H')` counts the hits.", "avg = (hits × hit_ms + misses × miss_ms) / total lookups."],
      },
      {
        kind: "recap",
        points: [
          "**Hit rate** = hits ÷ lookups. It's driven by cache **size**, the number of distinct **keys**, and how **skewed** popularity is.",
          "With skewed popularity a small cache covers a lot; with uniform popularity the hit rate is just entries ÷ keys.",
          "Size the database for the **miss rate**: 95% → 99% is a five-fold drop in database load.",
          "A **cold** cache misses everything at first. Hit rate ignores **cost**: time saved ≈ hits × cost of a miss, so measure per kind of key, and watch latency and staleness too.",
        ],
      },
    ],
  },
];
