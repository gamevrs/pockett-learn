import type { ConceptLesson } from "../../learn/types.ts";

/** Fenced Python block for lesson prose. */
const py = (s: string) => "~~~python\n" + s.trim() + "\n~~~";
/** Fenced plain-text block (tables, headers) for lesson prose. */
const txt = (s: string) => "~~~text\n" + s.trim() + "\n~~~";
/** Paragraphs joined with blank lines. */
const P = (...paras: string[]) => paras.join("\n\n");

/** Lessons 1 to 4 of "Remember the answer": why caches exist, the four patterns, expiry, eviction. */
export const cachingLessonsA: ConceptLesson[] = [
  // ─────────────────────────────── 1. Why remember anything ───────────────────────────────
  {
    id: "fnd-cache-1-why",
    title: "Why remember an answer",
    summary: "Latency numbers, hits and misses, and the arithmetic that makes a cache worth having.",
    minutes: 8,
    xp: 50,
    steps: [
      {
        kind: "explain",
        title: "Some answers cost more than others",
        body: P(
          "Every program spends its life asking for things: a value from memory, a row from a database, a page from another continent. The questions look alike in code, a function call or a line of SQL, but they are **not** alike in time.",
          "Tap each row. The bars are on a log scale, so each one is *many times* longer than the one above it. The note underneath stretches time until a single nanosecond lasts a whole second, so the numbers stop being abstract.",
        ),
        widget: { type: "cache-latency", props: { mode: "ladder" } },
      },
      {
        kind: "question",
        title: "At human speed",
        body: "Stretch time so that **1 nanosecond lasts 1 second**. A trip across an ocean takes 150 milliseconds in real life. About how long is that at this scale?",
        widget: { type: "cache-latency", props: { mode: "ladder" }, live: true },
        question: {
          type: "choice",
          options: ["About 2.5 minutes", "About 28 hours", "About 23 days", "About 4.7 years"],
          answer: 3,
        },
        explanation: "150 ms is 150,000,000 ns, so at one second per nanosecond it is 150 million seconds: roughly **4.7 years**. Reading from main memory in the same scale takes under two minutes. A program that waits for the far side of the ocean on every step is *living* in the slow part of that table.",
      },
      {
        kind: "explain",
        title: "A cache is a bet that the past repeats",
        body: P(
          "A **cache** is a small, fast place that keeps copies of answers you already paid for. When someone asks again, you hand back the copy instead of redoing the slow thing.",
          "Picture **Pantry**, a recipe app. The page for “weeknight lentil soup” is requested a thousand times an hour, and building it needs three database queries and a pass through a template. Build it once, keep the finished page for a while, and 999 of those requests cost almost nothing.",
          "Two words you will use all module:\n\n- A **hit** is a request the cache answers itself.\n- A **miss** is a request it can't, so the slow path runs (and usually the answer is stored on the way back).",
          "Every cache is a trade: you spend **space** and accept that the copy might be **out of date**, and in return you get **time**. The rest of this module is about making that trade on purpose.",
        ),
      },
      {
        kind: "explain",
        title: "The arithmetic of a cache",
        body: P(
          "Say a hit takes 1 ms and a miss takes 40 ms (the slow path, plus the small cost of checking the cache first). If a fraction `h` of requests are hits:",
          txt("average read  =  h × hit time  +  (1 − h) × miss time"),
          "Drag the hit rate. Notice the shape: going from 0% to 50% barely helps, but the last few percent near 100% matter enormously, because each miss is so much slower than a hit.",
        ),
        widget: { type: "cache-latency", props: { mode: "average", hitMs: 1, missMs: 40, initial: 50 } },
      },
      {
        kind: "question",
        title: "Aim for a number",
        body: "Hit takes 1 ms, miss takes 40 ms. Get the **average read** down to **5 ms or less**.",
        widget: { type: "cache-latency", props: { mode: "average", hitMs: 1, missMs: 40, initial: 20 } },
        question: { type: "widget", goal: { avgMax: 5 }, prompt: "Move the hit rate until the average is 5 ms or less." },
        explanation: "You need roughly a **90% hit rate**: 0.9 × 1 + 0.1 × 40 = 4.9 ms. Notice that 90% of requests being fast still leaves the average **five times** slower than a hit, because the 10% of slow ones carry most of the time.",
      },
      {
        kind: "question",
        title: "The last few percent",
        body: "Same numbers: hit 1 ms, miss 40 ms. What is the average read at a **99% hit rate**? (Answer in milliseconds.)",
        question: { type: "number", answer: 1.39, tolerance: 0.05, unit: "ms" },
        explanation: "0.99 × 1 + 0.01 × 40 = **1.39 ms**. Going from 90% to 99% cut the average from 4.9 ms to 1.39 ms, a 3.5× improvement from the last nine percentage points. That is why teams argue about “nines” of hit rate.",
      },
      {
        kind: "explain",
        title: "You have met caches before",
        body: P(
          "Caches are not an add-on invented for web apps. They are how fast things hide slow things at every level:",
          "- Your **CPU** keeps recently used memory in tiny caches on the chip, exactly the hierarchy from *The memory hierarchy* in the computer module.\n- Your **operating system** keeps recently read file pages in spare RAM.\n- **DNS resolvers** remember which address a name pointed to (see the DNS lesson in the network module).\n- Your **browser** keeps images and scripts so a revisit doesn't download them again.\n- A **CDN** keeps copies of your site in many cities.\n- A **database** keeps hot pages in memory, and your **application** can keep query results in something like Redis or Memcached.",
          "Same idea, different sizes and lifetimes. What changes as you go up the stack is the cost of being wrong: a CPU cache is kept correct by hardware; a cache you build yourself is kept correct by *you*.",
        ),
      },
      {
        kind: "question",
        title: "Fastest to slowest",
        body: "Put these in order, **fastest first**.",
        question: {
          type: "order",
          items: ["Read from the CPU's own cache", "Read from main memory", "Random read from an SSD", "Round trip inside one data center", "Round trip across an ocean"],
        },
        explanation: "Each step is a jump of one or more orders of magnitude: nanoseconds, then a hundred nanoseconds, then microseconds, then a fraction of a millisecond, then tens to hundreds of milliseconds. Each layer of caching exists to avoid reaching for the next layer down.",
      },
      {
        kind: "question",
        title: "When a cache can't help",
        body: "Which workload gets the **least** benefit from a cache in front of it?",
        question: {
          type: "choice",
          options: [
            "A product page viewed thousands of times a day",
            "A list of countries needed on every sign-up",
            "A search where every visitor types something no one has typed before",
            "A weather summary for a city, read by every visitor to the city page",
          ],
          answer: 2,
        },
        explanation: "A cache pays off through **repeats**. If nearly every request asks for something new, almost every request is a miss, and you've paid for the cache lookup and the memory for nothing. Before adding a cache, ask: *will the same question come back?*",
      },
      {
        kind: "code",
        title: "Build the smallest cache",
        body: "Write `make_cached(fn)`. It returns a wrapper that remembers answers: calling the wrapper with an argument it has seen before returns the stored answer **without calling `fn` again**. The wrapper must also count `wrapper.hits` and `wrapper.misses` (attributes on the function, both starting at 0).",
        language: "python",
        starter: `def make_cached(fn):
    # Return a wrapper around fn that remembers answers.
    # Count wrapper.hits and wrapper.misses.
    return fn
`,
        solution: `def make_cached(fn):
    store = {}

    def wrapper(x):
        if x in store:
            wrapper.hits += 1
            return store[x]
        wrapper.misses += 1
        store[x] = fn(x)
        return store[x]

    wrapper.hits = 0
    wrapper.misses = 0
    return wrapper
`,
        tests: [
          {
            id: "values",
            description: "Returns the same answers as the original function",
            assertionCode: `f = make_cached(lambda x: x * 2)\nassert f(3) == 6 and f(5) == 10, "the wrapper must return what fn returns"`,
          },
          {
            id: "calls",
            description: "Calls the slow function once per distinct argument",
            assertionCode: `calls = []\ndef slow(x):\n    calls.append(x)\n    return x + 100\nf = make_cached(slow)\nf(1); f(1); f(2); f(1); f(2)\nassert calls == [1, 2], f"slow() ran for {calls}, expected [1, 2]"`,
          },
          {
            id: "counts",
            description: "Counts hits and misses",
            assertionCode: `f = make_cached(lambda x: x)\nf("a"); f("a"); f("b"); f("a")\nassert f.hits == 2 and f.misses == 2, f"hits={f.hits}, misses={f.misses}; expected 2 and 2"`,
          },
          {
            id: "falsy",
            description: "Remembers answers that are 0 or None too",
            assertionCode: `calls = []\ndef g(x):\n    calls.append(x)\n    return 0\nf = make_cached(g)\nf(1); f(1)\nassert len(calls) == 1, "a stored answer of 0 is still a stored answer"`,
          },
        ],
        hints: ["Keep a dict outside the wrapper. Check `x in store` rather than testing the stored value, so a stored 0 or None still counts as a hit.", "Set `wrapper.hits = 0` and `wrapper.misses = 0` after defining `wrapper`, before you return it."],
      },
      {
        kind: "recap",
        points: [
          "A **cache** keeps copies of expensive answers close; a **hit** reuses one, a **miss** pays for the slow path.",
          "**Average time = h × hit time + (1 − h) × miss time**: the last few percent of hit rate matter most because misses are so slow.",
          "Latency spans a billion-fold range, from nanoseconds in a CPU to a hundred milliseconds across an ocean, which is why caching appears at every layer.",
          "A cache only helps when requests **repeat**; the price is space and the risk of serving an out-of-date copy.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 2. Four patterns ───────────────────────────────
  {
    id: "fnd-cache-2-patterns",
    title: "Four ways to wire a cache",
    summary: "Cache-aside, read-through, write-through and write-behind, and the consistency each one buys.",
    minutes: 10,
    xp: 60,
    steps: [
      {
        kind: "explain",
        title: "Who talks to whom?",
        body: P(
          "A cache sits between your code and a slower store, usually a database. The first design question is **who is responsible for the cache**: your application code, or the cache itself.",
          "The most common answer is **cache-aside** (also called lazy loading). The application checks the cache first. On a miss it reads the database, **stores the result in the cache itself**, and returns it. On a write it updates the database and **deletes** the cached entry, so the next read refills it with fresh data.",
          py(`
def get_price(event_id):
    price = cache.get(event_id)
    if price is None:                  # miss
        price = db.read(event_id)      # slow path
        cache.set(event_id, price)     # remember it
    return price

def set_price(event_id, price):
    db.write(event_id, price)          # the database is the truth
    cache.delete(event_id)             # next read refills
`),
          "Try it below on a single ticket price. Read it, raise it, read again, and follow the numbered steps.",
        ),
        widget: { type: "cache-patterns", props: { patterns: ["aside"], initial: "aside" } },
      },
      {
        kind: "question",
        title: "Make the app go back to the database",
        body: "With cache-aside: **read** the price (a miss), **raise** it, then **read** again. The database should be read **twice** in total.",
        widget: { type: "cache-patterns", props: { patterns: ["aside"], initial: "aside" } },
        question: { type: "widget", goal: { pattern: "aside", wrote: true, dbReads: 2 }, prompt: "Read, raise, read again." },
        explanation: "The write deleted the entry, so the second read missed and went to the database. Cache-aside is **simple and robust**: the cache holds only what has been asked for, and if the cache is empty or down, the app still works (slowly).",
      },
      {
        kind: "explain",
        title: "Read-through: the cache fetches for you",
        body: P(
          "In **read-through**, the app only ever talks to the cache. If the value is missing, the *cache* knows how to load it from the database, so loading logic lives in one place instead of being copied around the codebase.",
          "That tidiness has a catch. Reads go through the cache, but **writes go to the database** (the app can't ask the cache to do it), so nothing tells the cache its copy is old. It keeps serving the old value until its time to live ends.",
          "Pick read-through below and try to catch it serving an old price.",
        ),
        widget: { type: "cache-patterns", props: { patterns: ["through"], initial: "through" } },
      },
      {
        kind: "question",
        title: "Catch a stale read",
        body: "Make a reader receive a price that **disagrees with the database**. (Read first so the cache has something, then change the price, then read again.)",
        widget: { type: "cache-patterns", props: { patterns: ["through"], initial: "through" } },
        question: { type: "widget", goal: { pattern: "through", servedStale: true }, prompt: "Get a stale read." },
        explanation: "Reading, raising, then reading again returned the *old* price from the cache. Read-through alone gives you fast reads and lazy loading, but **no freshness guarantee** after writes: you need an expiry time or explicit invalidation to bound how wrong it can be.",
      },
      {
        kind: "explain",
        title: "Write-through: both at once",
        body: P(
          "**Write-through** closes that gap. Writes go to the cache, and the cache writes them to the database **before the write counts as finished**. Afterwards the cache and database agree.",
          "The price is write latency (a write waits for both) and cache space for data nobody may read again. In return, a reader who asks right after a write gets the new value from the cache, and the database never lags behind.",
          "Switch between patterns and compare what a write does in each.",
        ),
        widget: { type: "cache-patterns", props: { patterns: ["aside", "through", "wthrough"], initial: "wthrough" } },
      },
      {
        kind: "explain",
        title: "Write-behind: answer first, save later",
        body: P(
          "**Write-behind** (also called write-back) goes one step further: the write is acknowledged as soon as the **cache** has it, and the database is updated later in batches. Writes become very fast, and many updates to the same key can be merged into one database write.",
          "The danger is in the gap. Until the flush, the only copy of your newest data lives in the cache's **memory**. If that node crashes, those writes are gone, and nobody was told.",
          "Make a write, then press **Crash the cache** before flushing.",
        ),
        widget: { type: "cache-patterns", props: { patterns: ["behind"], initial: "behind" } },
      },
      {
        kind: "question",
        title: "Lose a write",
        body: "Use write-behind to **lose a price change for good**: write a new price, then crash the cache before it is flushed.",
        widget: { type: "cache-patterns", props: { patterns: ["behind"], initial: "behind" } },
        question: { type: "widget", goal: { pattern: "behind", lost: true }, prompt: "Raise the price, then crash the cache before flushing." },
        explanation: "The database never saw the new price and the cache's memory is gone, so the change vanished. Write-behind fits data where losing the last few seconds is acceptable (view counters, activity feeds) and is a poor fit for money or inventory.",
      },
      {
        kind: "question",
        title: "Match the job to the pattern",
        body: "A game server receives **50,000 score updates per second**. Players only see the leaderboard, and losing the last second of updates in a crash is acceptable. Which pattern fits best?",
        question: {
          type: "choice",
          options: [
            "Cache-aside, deleting the entry on every write",
            "Write-through, so the database is always current",
            "Write-behind, batching many updates into few database writes",
            "Read-through with no expiry",
          ],
          answer: 2,
        },
        explanation: "The database can't take 50,000 writes a second one by one, and the data tolerates a small loss window, so **write-behind** batches them. For a payments ledger the same choice would be a mistake: there, every acknowledged write must survive.",
      },
      {
        kind: "explain",
        title: "What each pattern promises",
        body: P(
          "Here is the comparison to keep. “Own write” means a reader who asks right after a write.",
          txt(`
pattern        own write seen   database freshness     main risk
cache-aside    yes (miss, refill) always current       race: stale refill (lesson 5)
read-through   NO, until expiry  always current        stale reads after writes
write-through  yes              always current        slower writes
write-behind   yes              lags behind cache     acknowledged writes can be lost
`),
          "None of them is “the right one”. **Cache-aside** is the default because it degrades gracefully, and the others are chosen when a specific property (centralised loading, instant consistency, write throughput) is worth their cost.",
        ),
      },
      {
        kind: "code",
        title: "Write cache-aside",
        body: "Implement the two halves of cache-aside for a dict-like `cache` and `db`. `read(key, cache, db)` returns the cached value, or reads `db`, stores the result in `cache` and returns it. `write(key, value, cache, db)` updates `db` and **deletes** the key from `cache` (it may not be there).",
        language: "python",
        starter: `def read(key, cache, db):
    # check the cache; on a miss read db and remember the answer
    return db[key]


def write(key, value, cache, db):
    # the database is the truth; the cache entry must go
    db[key] = value
`,
        solution: `def read(key, cache, db):
    if key in cache:
        return cache[key]
    value = db[key]
    cache[key] = value
    return value


def write(key, value, cache, db):
    db[key] = value
    cache.pop(key, None)
`,
        tests: [
          {
            id: "miss",
            description: "A miss reads the database and fills the cache",
            assertionCode: `db = {"soup": "v1"}\ncache = {}\nassert read("soup", cache, db) == "v1"\nassert cache == {"soup": "v1"}, f"cache should hold the value after a miss, has {cache}"`,
          },
          {
            id: "hit",
            description: "A hit does not touch the database",
            assertionCode: `class Spy(dict):\n    reads = 0\n    def __getitem__(self, k):\n        Spy.reads += 1\n        return dict.__getitem__(self, k)\n    def get(self, k, d=None):\n        Spy.reads += 1\n        return dict.get(self, k, d)\ndb = Spy({"soup": "v1"})\ncache = {}\nread("soup", cache, db); read("soup", cache, db); read("soup", cache, db)\nassert Spy.reads == 1, f"database was read {Spy.reads} times, expected 1"`,
          },
          {
            id: "write",
            description: "A write updates the database and removes the cache entry",
            assertionCode: `db = {"soup": "v1"}\ncache = {"soup": "v1"}\nwrite("soup", "v2", cache, db)\nassert db["soup"] == "v2", "the database must have the new value"\nassert "soup" not in cache, "the stale cache entry must be deleted"`,
          },
          {
            id: "refill",
            description: "The read after a write sees the new value",
            assertionCode: `db = {"soup": "v1"}\ncache = {}\nread("soup", cache, db)\nwrite("soup", "v2", cache, db)\nassert read("soup", cache, db) == "v2"`,
          },
          {
            id: "absent",
            description: "Writing a key that was never cached works",
            assertionCode: `db = {}\ncache = {}\nwrite("new", 1, cache, db)\nassert db == {"new": 1} and cache == {}`,
          },
        ],
        hints: ["For the write, change the database first, then remove the cache entry. `cache.pop(key, None)` doesn't fail when the key is absent.", "In `read`, store the value in the cache before you return it."],
      },
      {
        kind: "recap",
        points: [
          "**Cache-aside**: the app checks the cache, fills it on a miss, deletes the entry on a write. Simple, and it works if the cache is empty or down.",
          "**Read-through**: the cache loads missing values itself; on its own it can serve stale values after writes.",
          "**Write-through**: writes go via the cache to the database before returning: consistent, slower writes.",
          "**Write-behind**: the cache acknowledges first and saves later: fast, but acknowledged writes can be lost in a crash.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 3. TTL ───────────────────────────────
  {
    id: "fnd-cache-3-ttl",
    title: "Time to live",
    summary: "Expiry as a promise about staleness: choosing a TTL, absolute vs sliding, and lazy vs active removal.",
    minutes: 8,
    xp: 50,
    steps: [
      {
        kind: "explain",
        title: "How wrong are you allowed to be?",
        body: P(
          "Most cached answers carry a **time to live (TTL)**: after that many seconds the entry is treated as gone. The simplest invalidation strategy there is: *don't try to track every change; just bound how long a copy can be wrong.*",
          "Below, a recipe in Pantry is edited three times during a minute while readers arrive every two seconds. Each cell is one read: green is a fresh hit, **red** is a hit on an out-of-date copy, outlined is a miss that went to the database. Slide the TTL.",
        ),
        widget: { type: "cache-ttl", props: { changes: [14, 31, 47], initial: 20 } },
      },
      {
        kind: "question",
        title: "Two budgets at once",
        body: "Find a TTL that gives **3 or fewer stale reads** *and* **at most 10 database reads** over the minute.",
        widget: { type: "cache-ttl", props: { changes: [14, 31, 47], initial: 20 } },
        question: { type: "widget", goal: { staleMax: 3, dbReadsMax: 10 }, prompt: "Slide the TTL until both budgets are met." },
        explanation: "A short TTL is fresher but sends more reads to the database; a long one is cheaper but staler. The curve is **bumpy**, because it depends on *when* the edits happen relative to the expiry. TTL is a dial between two costs, and you choose by asking which one hurts more.",
      },
      {
        kind: "explain",
        title: "Picking a number",
        body: P(
          "Don't pick a TTL by feel. Ask: **how long could this be wrong before a person or a business rule would mind?** That is your *freshness budget*, and the TTL can't exceed it.",
          txt(`
data                              reasonable TTL    why
country and currency lists        1 day or more     changes once a year
recipe or article page            1 to 10 minutes   an edit can wait a few minutes
"trending" ranking                30 to 60 seconds  expensive to compute, nobody checks it
number of seats left (browsing)   2 to 5 seconds    "about 40 left" is fine
seats left (at purchase)          0: don't cache    a wrong number oversells
`),
          "Notice that the same fact (seats left) can have two different TTLs depending on **what the reader is about to do with it**.",
        ),
      },
      {
        kind: "explain",
        title: "Sliding expiry: a trap for shared data",
        body: P(
          "There are two ways to start the clock. **Absolute** expiry fixes the deadline when the entry is stored. **Sliding** expiry restarts the clock on every hit, so an entry that keeps being read never expires. Sliding is right for things like login sessions (“log me out after 30 idle minutes”).",
          "For data that someone else can change, sliding is dangerous. A popular entry gets hit constantly, so it *never* expires, and it stays out of date forever. Switch to sliding below and see what happens to the stale count.",
        ),
        widget: { type: "cache-ttl", props: { changes: [14, 31, 47], initial: 10, sliding: true } },
      },
      {
        kind: "question",
        title: "Count the damage",
        body: "Set the expiry style to **sliding** with a TTL of **10 seconds**. Out of 30 reads, how many are **stale**?",
        widget: { type: "cache-ttl", props: { changes: [14, 31, 47], initial: 10, sliding: true }, live: true },
        question: { type: "number", answer: 23, unit: "stale reads" },
        explanation: "**23**. The first read fills the cache, and then reads arrive every 2 seconds, faster than the 10-second TTL, so the clock keeps restarting. The recipe edit at 14 s is never seen. Use absolute expiry for shared data, and sliding only for per-user state like sessions.",
      },
      {
        kind: "question",
        title: "Which expiry?",
        body: "Which of these should use **sliding** expiry?",
        question: {
          type: "choice",
          options: [
            "A cached exchange rate",
            "A user's login session, kept alive while they're active",
            "A cached copy of a news homepage",
            "The result of an expensive report that changes hourly",
          ],
          answer: 1,
        },
        explanation: "A session belongs to *one* user and should live as long as that user keeps showing up. The other three are shared data that changes on someone else's schedule, so they need a hard deadline.",
      },
      {
        kind: "explain",
        title: "Expired is not the same as gone",
        body: P(
          "When the TTL passes, memory isn't instantly freed. Caches use two cleanup styles, usually together:",
          "- **Lazy expiry**: nothing happens until someone asks for the key. Then the cache notices it is past its deadline, drops it, and reports a miss. Cheap, but entries nobody asks for again sit around wasting memory.\n- **Active expiry**: a background sweeper periodically samples keys and removes the expired ones, so memory is reclaimed even for entries that are never read again.",
          "Practically: a TTL controls what *readers can see*, not exactly when memory comes back. Size your cache for the entries that are alive **plus** some that are dead but not yet swept.",
        ),
      },
      {
        kind: "question",
        title: "Order of a life",
        body: "Put the life of a cached entry with a TTL in order.",
        question: {
          type: "order",
          items: [
            "A miss: the value is read from the database and stored with a TTL",
            "Reads before the deadline are hits",
            "The deadline passes",
            "The next read finds the entry expired and counts as a miss",
            "The value is read again and stored with a fresh TTL",
          ],
        },
        explanation: "Notice the staleness window: the database may change at any moment after the first step, and readers won't see it until the fourth. The TTL is the **longest** that gap can last.",
      },
      {
        kind: "code",
        title: "A cache that forgets",
        body: "Write a `TTLCache` class. `TTLCache(ttl, clock)` takes a number of seconds and a `clock()` function that returns the current time in seconds (passed in so tests can control it). `set(key, value)` stores a value; `get(key)` returns it, or `None` if it was never stored **or** at least `ttl` seconds have passed since it was stored.",
        language: "python",
        starter: `class TTLCache:
    def __init__(self, ttl, clock):
        self.ttl = ttl
        self.clock = clock
        self.items = {}

    def set(self, key, value):
        pass

    def get(self, key):
        return None
`,
        solution: `class TTLCache:
    def __init__(self, ttl, clock):
        self.ttl = ttl
        self.clock = clock
        self.items = {}

    def set(self, key, value):
        self.items[key] = (value, self.clock())

    def get(self, key):
        if key not in self.items:
            return None
        value, stored_at = self.items[key]
        if self.clock() - stored_at >= self.ttl:
            del self.items[key]
            return None
        return value
`,
        tests: [
          {
            id: "fresh",
            description: "Returns a value before the TTL passes",
            assertionCode: `now = [0]\nc = TTLCache(10, lambda: now[0])\nc.set("a", 1)\nnow[0] = 9\nassert c.get("a") == 1, "still fresh at 9 seconds"`,
          },
          {
            id: "expired",
            description: "Returns None once ttl seconds have passed",
            assertionCode: `now = [0]\nc = TTLCache(10, lambda: now[0])\nc.set("a", 1)\nnow[0] = 10\nassert c.get("a") is None, "at exactly ttl seconds the entry is expired"`,
          },
          {
            id: "missing",
            description: "Unknown keys give None",
            assertionCode: `c = TTLCache(5, lambda: 0)\nassert c.get("nope") is None`,
          },
          {
            id: "reset",
            description: "Setting a key again restarts its clock",
            assertionCode: `now = [0]\nc = TTLCache(10, lambda: now[0])\nc.set("a", 1)\nnow[0] = 8\nc.set("a", 2)\nnow[0] = 15\nassert c.get("a") == 2, "re-setting at 8 s should live until 18 s"`,
          },
          {
            id: "independent",
            description: "Keys expire independently",
            assertionCode: `now = [0]\nc = TTLCache(10, lambda: now[0])\nc.set("a", 1)\nnow[0] = 6\nc.set("b", 2)\nnow[0] = 12\nassert c.get("a") is None and c.get("b") == 2`,
          },
        ],
        hints: ["Store a pair: the value and the time you stored it (`self.clock()`).", "In `get`, compare `self.clock() - stored_at` with `self.ttl`. At exactly `ttl` seconds the entry is expired (use `>=`)."],
      },
      {
        kind: "recap",
        points: [
          "A **TTL** bounds how stale a cached answer can be: it is a promise about the worst case, not a guarantee of freshness.",
          "Pick the TTL from the **freshness budget**: how long can this be wrong before someone minds? The same data can need different TTLs for browsing and for buying.",
          "**Sliding** expiry suits per-user state like sessions; for shared data it can keep a stale entry alive forever.",
          "Expiry can be **lazy** (checked on access) or **active** (swept in the background); a TTL controls what readers see, not exactly when memory is freed.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 4. Eviction ───────────────────────────────
  {
    id: "fnd-cache-4-eviction",
    title: "Making room",
    summary: "What to throw out when the cache is full: LRU, LFU and FIFO, and the scan that ruins them.",
    minutes: 9,
    xp: 55,
    steps: [
      {
        kind: "explain",
        title: "A cache that is full",
        body: P(
          "Memory is finite, so a cache has a size limit. When it is full and a new entry must go in, something has to **leave**. The rule that picks the victim is the **eviction policy**, and a good policy throws out whatever you were least likely to need again.",
          "Three classic policies:\n\n- **LRU** (least recently used): evict the entry that has gone longest without being touched.\n- **LFU** (least frequently used): evict the entry used the fewest times.\n- **FIFO** (first in, first out): evict the oldest arrival, ignoring how it's been used.",
          "Below is a cache with room for **3** entries. Tap the keys to request them and watch which card (leftmost, in red once the cache is full) is next to go. Try the script button to replay a fixed sequence.",
        ),
        widget: { type: "cache-evict", props: { capacity: 3, keys: ["A", "B", "C", "D", "E"], script: ["A", "B", "C", "A", "D", "B", "E"], policies: ["lru"], initial: "lru" } },
      },
      {
        kind: "question",
        title: "Who gets thrown out?",
        body: "Under **LRU** with room for 3, request **A, B, C, A, D** in that order. Make the cache throw out **B**.",
        widget: { type: "cache-evict", props: { capacity: 3, keys: ["A", "B", "C", "D", "E"], policies: ["lru"], initial: "lru" } },
        question: { type: "widget", goal: { policy: "lru", lastEvicted: "B" }, prompt: "Request A, B, C, A, D." },
        explanation: "Asking for **A** a second time made it the *most* recently used, so when D arrived the oldest-untouched entry was B. LRU bets that **what you used recently, you'll use again soon**: the same locality idea behind CPU caches.",
      },
      {
        kind: "question",
        title: "Predict, then check",
        body: "Now the same requests (A, B, C, A, D), but with **FIFO**. Which entry is evicted when D arrives?",
        widget: { type: "cache-evict", props: { capacity: 3, keys: ["A", "B", "C", "D", "E"], policies: ["lru", "fifo"], initial: "fifo" }, after: true },
        question: { type: "choice", options: ["A", "B", "C"], answer: 0 },
        explanation: "FIFO only looks at **arrival order**: A came in first, so A leaves, even though it was used a moment ago. That's FIFO's weakness. It's trivially cheap to run, which is its only real appeal.",
      },
      {
        kind: "explain",
        title: "Frequency instead of recency",
        body: P(
          "**LFU** keeps a counter per entry and evicts the lowest (ties go to the one used longest ago). It protects entries that are *consistently* popular, like the homepage, from being pushed out by a burst of one-off requests.",
          "It has its own flaw: an entry that was very popular last week keeps a high count and lingers long after nobody wants it, while a brand-new entry that's about to be popular starts at 1 and is the first to go. Real LFU implementations decay the counters over time.",
          "Switch to LFU below and replay the script.",
        ),
        widget: { type: "cache-evict", props: { capacity: 3, keys: ["A", "B", "C", "D", "E"], script: ["A", "A", "A", "B", "C", "D", "E"], policies: ["lru", "lfu", "fifo"], initial: "lfu" } },
      },
      {
        kind: "question",
        title: "Protecting the favourite",
        body: "Under **LFU** with room for 3, request **A, A, A, B, C, D**. The count of A is high, so it must survive. Which entry does the request for **D** evict? Do it in the widget.",
        widget: { type: "cache-evict", props: { capacity: 3, keys: ["A", "B", "C", "D", "E"], policies: ["lfu"], initial: "lfu" } },
        question: { type: "widget", goal: { policy: "lfu", lastEvicted: "B" }, prompt: "Request A, A, A, B, C, D." },
        explanation: "B and C were both used once, so the tie goes to the one used **longest ago**: B. A, with three uses, is safe. Under LRU or FIFO, this sequence would have let a burst of newcomers push A out.",
      },
      {
        kind: "explain",
        title: "The scan that ruins everything",
        body: P(
          "Imagine a nightly job that reads every recipe in the app once, to rebuild a search index. Each recipe is requested **one time**. Under plain LRU, every one of those one-off reads becomes the “most recently used” entry and pushes out the genuinely hot pages. When the job ends, the cache is full of things nobody will ask for again, and the hit rate collapses.",
          "That's **cache pollution**, and it's why real systems rarely run plain LRU. Common fixes: keep a separate small area for newcomers and promote an entry only if it is touched a second time (the idea behind **2Q** and segmented LRU); use an **admission policy** that refuses to cache keys seen only once; or just keep scans out of the cache by letting the batch job read the database directly.",
        ),
      },
      {
        kind: "question",
        title: "Spot the pollution",
        body: "A cache with plain LRU has a 90% hit rate all day, then drops to 20% for twenty minutes after a bulk export job runs. What's the most likely cause?",
        question: {
          type: "choice",
          options: [
            "The export job's one-off reads evicted the hot entries",
            "The TTLs are too long",
            "LFU would have performed worse",
            "The cache has too many hits",
          ],
          answer: 0,
        },
        explanation: "A burst of keys that will never be requested again pushed the valuable entries out, and the hot keys had to be reloaded afterwards. The cure is not a bigger cache; it's keeping one-off traffic from entering the cache (or from being promoted).",
      },
      {
        kind: "explain",
        title: "In real systems",
        body: P(
          "Two practical details. First, caches are limited by **bytes**, not by a count of entries, so a single 5 MB value can force out thousands of small ones. Measure size, and consider refusing to cache huge values.",
          "Second, exact LRU needs a linked list updated on **every** read, which is costly at high speed. Production caches such as Redis therefore use **approximate** LRU/LFU: sample a handful of keys and evict the worst of the sample. It is nearly as good for a fraction of the work. Eviction policy is a setting (for example `allkeys-lru` or `allkeys-lfu`), so you choose it by looking at your traffic, not by guessing.",
        ),
      },
      {
        kind: "code",
        title: "Write an LRU cache",
        body: "Build `LRUCache(capacity)` with `get(key)` and `put(key, value)`. `get` returns the value (or `None` when missing) and counts as a use. `put` stores a value, counts as a use, and when the cache would exceed `capacity`, evicts the **least recently used** key. Python dicts remember insertion order, which makes this shorter than it sounds.",
        language: "python",
        starter: `class LRUCache:
    def __init__(self, capacity):
        self.capacity = capacity
        self.data = {}

    def get(self, key):
        return None

    def put(self, key, value):
        pass
`,
        solution: `class LRUCache:
    def __init__(self, capacity):
        self.capacity = capacity
        self.data = {}

    def get(self, key):
        if key not in self.data:
            return None
        value = self.data.pop(key)
        self.data[key] = value
        return value

    def put(self, key, value):
        if key in self.data:
            self.data.pop(key)
        elif len(self.data) >= self.capacity:
            oldest = next(iter(self.data))
            del self.data[oldest]
        self.data[key] = value
`,
        tests: [
          {
            id: "basic",
            description: "Stores and returns values; missing keys give None",
            assertionCode: `c = LRUCache(2)\nc.put("a", 1)\nassert c.get("a") == 1 and c.get("zzz") is None`,
          },
          {
            id: "evict",
            description: "Evicts the least recently used key when full",
            assertionCode: `c = LRUCache(2)\nc.put("a", 1)\nc.put("b", 2)\nc.put("c", 3)\nassert c.get("a") is None, "a was the oldest and should be gone"\nassert c.get("b") == 2 and c.get("c") == 3`,
          },
          {
            id: "get-refreshes",
            description: "A get makes the key recently used",
            assertionCode: `c = LRUCache(2)\nc.put("a", 1)\nc.put("b", 2)\nc.get("a")\nc.put("c", 3)\nassert c.get("b") is None, "b is now the least recently used"\nassert c.get("a") == 1`,
          },
          {
            id: "update",
            description: "Updating a key keeps the size and refreshes it",
            assertionCode: `c = LRUCache(2)\nc.put("a", 1)\nc.put("b", 2)\nc.put("a", 10)\nc.put("c", 3)\nassert c.get("a") == 10, "updating a should keep it and make it recent"\nassert c.get("b") is None\nassert len(c.data) == 2`,
          },
          {
            id: "capacity-one",
            description: "Works with room for one entry",
            assertionCode: `c = LRUCache(1)\nc.put("a", 1)\nc.put("b", 2)\nassert c.get("a") is None and c.get("b") == 2`,
          },
        ],
        hints: ["To mark a key as recently used, remove it from the dict and put it back: it then sits at the end.", "The least recently used key is the first one: `next(iter(self.data))`.", "When updating an existing key, remove it first so you don't evict somebody else."],
      },
      {
        kind: "recap",
        points: [
          "When a cache is full it must **evict**. **LRU** drops what's gone unused longest, **LFU** the least-used, **FIFO** the oldest arrival.",
          "LRU is the usual default because recent use predicts future use; LFU protects consistently popular keys but needs counters to decay.",
          "A **scan** of one-off keys can flush the hot set from plain LRU; fix it with admission policies, two-tier schemes, or by keeping scans out of the cache.",
          "Real caches are limited by **bytes**, and use **approximate** eviction (sampling) because tracking exact order on every read is too costly.",
        ],
      },
    ],
  },
];
