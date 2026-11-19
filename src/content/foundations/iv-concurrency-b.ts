import type { ConceptLesson } from "../../learn/types.ts";

/** Fenced JavaScript block for lesson prose. */
const js = (code: string) => "~~~js\n" + code.trim() + "\n~~~";

const SLEEP = "const sleep = (ms) => new Promise((r) => setTimeout(r, ms));\n";

// ── trace data ──
const PIPE = {
  nodes: [
    { id: "P", x: 12, y: 50 },
    { id: "Q", x: 50, y: 50 },
    { id: "C", x: 88, y: 50 },
  ],
  edges: [
    ["P", "Q"],
    ["Q", "C"],
  ] as [string, string][],
  directed: true,
};

const TABLE = {
  nodes: [
    { id: "P0", x: 50, y: 8 },
    { id: "F1", x: 86, y: 29 },
    { id: "P1", x: 86, y: 71 },
    { id: "F2", x: 50, y: 92 },
    { id: "P2", x: 14, y: 71 },
    { id: "F0", x: 14, y: 29 },
  ],
  edges: [
    ["P0", "F0"],
    ["P0", "F1"],
    ["P1", "F1"],
    ["P1", "F2"],
    ["P2", "F2"],
    ["P2", "F0"],
  ] as [string, string][],
};

const HIKE = {
  nodes: [
    { id: "A", x: 18, y: 20 },
    { id: "B", x: 50, y: 20 },
    { id: "C", x: 82, y: 20 },
    { id: "X", x: 50, y: 86 },
  ],
  edges: [
    ["A", "X"],
    ["B", "X"],
    ["C", "X"],
  ] as [string, string][],
};

// The mutex learners built in the locks lesson, given in the deadlock starter.
const MUTEX_SRC = `class Mutex {
  constructor() {
    this.locked = false;
    this.waiters = [];
  }
  lock() {
    if (!this.locked) {
      this.locked = true;
      return Promise.resolve();
    }
    return new Promise((resolve) => this.waiters.push(resolve));
  }
  unlock() {
    const next = this.waiters.shift();
    if (next) next();
    else this.locked = false;
  }
}`;

const TRANSFER_HEAD = `const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

${MUTEX_SRC}

function makeAccount(id, balance) {
  return { id, balance, lock: new Mutex() };
}
`;

// check helper: resolves "done" if p settles within ms of virtual time, "stuck" otherwise
const WITHIN = 'const within = (p, ms) => Promise.race([p.then(() => "done"), sleep(ms).then(() => "stuck")]);\n';

export const concurrencyLessonsB: ConceptLesson[] = [
  // ─────────────────────────────── 5. Semaphores and worker pools ───────────────────────────────
  {
    id: "fnd-iv-concurrency-5-semaphores",
    title: "Semaphores and worker pools",
    summary: "Let at most N tasks run at once with a counting semaphore or a pool of N workers.",
    minutes: 12,
    xp: 80,
    level: "Intermediate",
    steps: [
      {
        kind: "explain",
        title: "N at a time",
        body:
          "A mutex lets one task in. A **semaphore** lets in up to **N**. It holds N **permits**: `acquire()` takes one, or waits in a queue if none are left; `release()` gives one back and wakes the longest waiter. A mutex is a semaphore with one permit.\n\n" +
          "You need it whenever a resource has a limit: an API that allows 3 requests at once, 10 database connections, 4 CPU-heavy jobs.\n\n" +
          "A **worker pool** is the other common shape: start N workers, and each one keeps taking the next job from a shared list until it is empty.\n\n" +
          js(`
async function worker() {
  while (next < jobs.length) {
    const i = next++;            // safe: no await between read and bump
    results[i] = await jobs[i]();
  }
}
await Promise.all([worker(), worker(), worker()]);   // 3 at a time
`) +
          "\nOther languages: Python `threading.Semaphore`, `asyncio.Semaphore` and `ThreadPoolExecutor(max_workers=N)`; Java `Semaphore` and `Executors.newFixedThreadPool(n)`; Go a buffered channel used as a semaphore (`sem := make(chan struct{}, n)`) or `errgroup` with `SetLimit(n)`. With threads, `next++` needs a lock or an atomic counter.\n\n" +
          "**How to spot it:** *at most N at once*, *rate limit*, *connection pool*, *limit concurrency*, *batch downloads*.",
      },
      {
        kind: "question",
        title: "Two permits, five downloads",
        body: "A pool runs at most 2 downloads at once. Durations: a 300 ms, b 100, c 200, d 100, e 150, started in that order. Step through and answer the picks.",
        widget: {
          type: "iv-trace",
          props: {
            title: "Semaphore with 2 permits",
            frames: [
              { array: ["a", "b", "c", "d", "e"], highlight: [0, 1], vars: { time: 0, permits: 0 }, stacks: [{ label: "waiting", items: ["c", "d", "e"], kind: "queue" }], note: "a and b take the two permits at 0 ms. c, d and e wait in line." },
              { highlight: [0], done: [1], vars: { time: 100, permits: 1 }, note: "b finishes at 100 ms and releases its permit.", pick: { prompt: "Which download starts next?", answer: 2 } },
              { highlight: [0, 2], done: [1], vars: { time: 100, permits: 0 }, stacks: [{ label: "waiting", items: ["d", "e"], kind: "queue" }], note: "c, the longest waiter, gets the permit and runs 100–300 ms." },
              { highlight: [3, 4], done: [0, 1, 2], vars: { time: 300, permits: 0 }, stacks: [{ label: "waiting", items: [], kind: "queue" }], note: "a and c both finish at 300 ms. d and e take their permits." },
              { highlight: [4], done: [0, 1, 2, 3], vars: { time: 400, permits: 1 }, note: "d is done at 400 ms.", pick: { prompt: "Which download is the last to finish?", answer: 4 } },
              { done: [0, 1, 2, 3, 4], vars: { time: 450, permits: 2 }, note: "e finishes at **450 ms**. With no limit the batch would take 300 ms (the longest job); one at a time, 850 ms." },
            ],
          },
        },
        question: { type: "widget", goal: { picked: true }, prompt: "Answer both picks.", hint: "A freed permit goes to the task that has waited longest." },
        explanation: "The limit turns the batch into two lanes. Each time a job ends, the next one in line takes its lane, so the total depends on how the jobs pack into the lanes.",
      },
      {
        kind: "question",
        title: "Three lanes",
        body: "Same downloads (a 300, b 100, c 200, d 100, e 150 ms, in that order), but now 3 may run at once. Find when the last one finishes, in ms.",
        question: { type: "number", answer: 350, unit: "ms", hint: "Start a, b and c at 0 ms, then give each freed permit to the next download in line." },
        explanation: "a, b, c start at 0. b ends at 100 and d runs 100–200. c and d end at 200, so e runs 200–350, while a ends at 300. The last finish is **350 ms**.",
      },
      {
        kind: "question",
        title: "Why next++ is safe here",
        body: "In the JavaScript worker pool, every worker runs `const i = next++` on the same counter. Why can two workers never get the same `i`?",
        question: {
          type: "choice",
          options: [
            "Because `++` is an atomic CPU instruction in every language.",
            "There is no await between reading and bumping `next`.",
            "Because `Promise.all` runs the workers one at a time.",
            "Because each worker gets its own copy of `next`.",
          ],
          answer: 1,
          feedback: {
            0: "In Java or C, `next++` on a shared variable is a read and a write that threads can split. It is not atomic.",
            2: "`Promise.all` does not serialize anything: the workers really are interleaved, at their awaits.",
            3: "They share one variable; that is the point of the shared counter.",
          },
          hint: "Remember where JavaScript lets other code run.",
        },
        explanation: "Other code can only run at an `await`. Reading `next` and storing `next + 1` happen in one synchronous step, so each worker claims a different index. With threads you would use `AtomicInteger.getAndIncrement()`, a lock, or a channel of jobs.",
      },
      {
        kind: "code",
        title: "A counting semaphore",
        body:
          "Write a `Semaphore` class. `new Semaphore(n)` starts with `n` permits.\n\n" +
          "- `acquire()` returns a promise: it takes a permit and resolves now if one is free, otherwise it waits. Waiters are served first come, first served.\n" +
          "- `release()` gives a permit back: if someone waits, the permit goes straight to the longest waiter; otherwise it is added to the free count.\n\n" +
          "`n` may be 0: then every `acquire()` waits for a `release()`.",
        language: "javascript",
        starter: `class Semaphore {
  constructor(permits) {
    this.permits = permits;
  }

  acquire() {
    // take a permit now, or wait for one (first come, first served)
    return Promise.resolve();
  }

  release() {
    // give a permit back: wake the longest waiter, or add it to the free count
  }
}
`,
        solution: `class Semaphore {
  constructor(permits) {
    this.permits = permits;
    this.waiters = [];
  }

  acquire() {
    if (this.permits > 0) {
      this.permits--;
      return Promise.resolve();
    }
    return new Promise((resolve) => this.waiters.push(resolve));
  }

  release() {
    const next = this.waiters.shift();
    if (next) next(); // the permit passes straight to the waiter
    else this.permits++;
  }
}
`,
        tests: [
          {
            id: "t1",
            description: "never more than n at once",
            assertionCode:
              SLEEP +
              'const s = new Semaphore(2);\nlet running = 0, peak = 0;\nconst job = async () => { await s.acquire(); running++; peak = Math.max(peak, running); await sleep(100); running--; s.release(); };\nconst t0 = sim.now();\nawait Promise.all([job(), job(), job(), job(), job(), job()]);\nassertEqual(peak, 2, "With 2 permits, exactly 2 jobs should run together at the busiest moment");\nassertEqual(sim.now() - t0, 300, "Six 100 ms jobs, two at a time, take 300 ms");',
          },
          {
            id: "t2",
            description: "waiters are served in order",
            assertionCode:
              SLEEP +
              'const s = new Semaphore(2);\nconst log = [];\nconst t0 = sim.now();\nconst job = async (name, ms) => { await s.acquire(); log.push(name + "@" + (sim.now() - t0)); await sleep(ms); s.release(); };\nawait Promise.all([job("a", 300), job("b", 100), job("c", 200), job("d", 100), job("e", 150)]);\nassertEqual(log, ["a@0", "b@0", "c@100", "d@300", "e@300"], "Each freed permit goes to the job that has waited longest");',
          },
          {
            id: "t3",
            description: "zero permits: acquire waits for a release",
            assertionCode:
              'const s = new Semaphore(0);\nlet got = 0;\ns.acquire().then(() => got++);\ns.acquire().then(() => got++);\nawait sim.tick(50);\nassertEqual(got, 0, "With no permits, acquire() must wait");\ns.release();\nawait sim.flush();\nassertEqual(got, 1, "One release lets exactly one waiter in");\ns.release();\nawait sim.flush();\nassertEqual(got, 2, "A second release lets the other one in");',
          },
        ],
        hints: ["Keep the free count and an array of resolve functions for the callers that are waiting.", "In `release`, if the waiting list is not empty, resolve its first entry and do not touch the count."],
      },
      {
        kind: "code",
        title: "A limited map",
        body:
          "Write `mapLimit(items, limit, fn)`. `fn(item, index)` returns a promise. Run `fn` on every item with **at most `limit` running at once**, and resolve with the results **in the order of `items`**.\n\n" +
          "If any call rejects, `mapLimit` rejects with that error as soon as it happens, and **starts no new items** after it. An empty list resolves to `[]`.",
        language: "javascript",
        starter: `async function mapLimit(items, limit, fn) {
  // your code here
  return [];
}
`,
        solution: `async function mapLimit(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  let failed = false;

  async function worker() {
    while (!failed && next < items.length) {
      const i = next++;
      try {
        results[i] = await fn(items[i], i);
      } catch (err) {
        failed = true;
        throw err;
      }
    }
  }

  const workers = [];
  for (let w = 0; w < Math.min(limit, items.length); w++) workers.push(worker());
  await Promise.all(workers);
  return results;
}
`,
        tests: [
          {
            id: "t1",
            description: "results in input order",
            assertionCode:
              SLEEP +
              'const out = await mapLimit([300, 100, 200], 2, async (ms, i) => { await sleep(ms); return ms + ":" + i; });\nassertEqual(out, ["300:0", "100:1", "200:2"], "Results follow the order of items, not the order they finish in");\nassertEqual(await mapLimit([], 3, async (x) => x), [], "An empty list gives []");',
          },
          {
            id: "t2",
            description: "at most limit at once",
            assertionCode:
              SLEEP +
              'let running = 0, peak = 0;\nconst t0 = sim.now();\nconst out = await mapLimit([300, 100, 200, 100, 150], 2, async (ms) => { running++; peak = Math.max(peak, running); await sleep(ms); running--; return ms; });\nassertEqual(out, [300, 100, 200, 100, 150], "Every item gives its result");\nassertEqual(peak, 2, "Exactly 2 calls should be running at the busiest moment");\nassertEqual(sim.now() - t0, 450, "Two lanes: the batch takes 450 ms");',
          },
          {
            id: "t3",
            description: "stops after a failure",
            assertionCode:
              SLEEP +
              'const started = [];\nconst t0 = sim.now();\nconst p = mapLimit([1, 2, 3, 4, 5], 2, async (n) => { started.push(n); await sleep(n === 2 ? 50 : 100); if (n === 2) throw new Error("item 2 failed"); return n; });\nawait assertRejects(p, "item 2 failed", "mapLimit should reject with the error of the call that failed");\nassertEqual(sim.now() - t0, 50, "Reject as soon as item 2 fails (50 ms), without waiting for the others");\nawait sim.tick(1000);\nassertEqual(started, [1, 2], "After a failure, no new items should be started");',
          },
        ],
        hints: ["Start `Math.min(limit, items.length)` workers; each one loops, claiming the next index with `next++`.", "Keep a `failed` flag: set it when a call throws, rethrow, and make the loop stop when it is set."],
      },
      {
        kind: "recap",
        points: [
          "A **semaphore** holds N permits: `acquire` takes one or waits, `release` hands one back to the longest waiter.",
          "A mutex is a semaphore with one permit.",
          "A **worker pool** is N workers pulling from a shared index or queue; results go back by index to keep their order.",
          "In JavaScript `next++` is safe between awaits; with threads it needs an atomic or a lock.",
          "Total time depends on how jobs pack into the N lanes, somewhere between the longest job and the sum of all jobs.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 6. Producer and consumer ───────────────────────────────
  {
    id: "fnd-iv-concurrency-6-producer-consumer",
    title: "Producer and consumer: a bounded queue",
    summary: "A buffer that makes fast producers wait when it is full and consumers wait when it is empty.",
    minutes: 12,
    xp: 90,
    level: "Advanced",
    steps: [
      {
        kind: "explain",
        title: "A buffer with two kinds of waiting",
        body:
          "**Producers** make work (uploaded photos, log lines, orders) and **consumers** process it. A queue between them lets each side run at its own speed. If the queue has no limit and producers are faster, it grows until memory runs out, so real systems use a **bounded queue** with a fixed **capacity**:\n\n" +
          "- `put(item)` waits while the queue is **full**.\n- `take()` waits while the queue is **empty**.\n\n" +
          "Making a fast producer wait is called **back-pressure**: the slow side sets the pace.\n\n" +
          "The queue keeps two lists of waiters. When an item arrives and a consumer is already waiting, hand it over directly. When an item is taken and a producer is waiting for space, let that producer's item in.\n\n" +
          js(`
const q = new BoundedQueue(2);
await q.put("a");
await q.put("b");
const p = q.put("c");     // full: p stays pending
await q.take();           // "a"; now "c" moves in and p resolves
`) +
          "\nEvery language has one: Python `queue.Queue(maxsize=n)` for threads and `asyncio.Queue(maxsize=n)`, Java `ArrayBlockingQueue` (`put` and `take` block), Go a **buffered channel** `make(chan Job, n)`: a send blocks when it is full, a receive blocks when it is empty.\n\n" +
          "**How to spot it:** *producer*, *consumer*, *buffer*, *pipeline stage*, *back-pressure*, *blocking queue*, *jobs arrive faster than they are processed*.",
      },
      {
        kind: "question",
        title: "Who is blocked?",
        body: "Producer P puts items into a queue Q of capacity 2; consumer C takes them. Step through and tap the worker that has to wait.",
        widget: {
          type: "iv-trace",
          props: {
            title: "Bounded queue, capacity 2",
            frames: [
              { graph: { ...PIPE, active: ["P"], activeEdges: [["P", "Q"]] }, stacks: [{ label: "Q", items: [1], kind: "queue" }, { label: "waiting puts", items: [], kind: "queue" }, { label: "waiting takes", items: [], kind: "queue" }], vars: { size: 1, capacity: 2 }, note: "P puts 1. There is room, so `put` resolves at once." },
              { graph: { active: ["P"], activeEdges: [["P", "Q"]] }, stacks: [{ label: "Q", items: [1, 2], kind: "queue" }, { label: "waiting puts", items: [], kind: "queue" }, { label: "waiting takes", items: [], kind: "queue" }], vars: { size: 2, capacity: 2 }, note: "P puts 2. The queue is now full." },
              { graph: { active: [] }, note: "P wants to put 3.", pick: { prompt: "The queue is full. Who has to wait?", answer: "P" } },
              { graph: { active: [] }, stacks: [{ label: "Q", items: [1, 2], kind: "queue" }, { label: "waiting puts", items: [3], kind: "queue" }, { label: "waiting takes", items: [], kind: "queue" }], note: "P's `put(3)` is pending: back-pressure. P cannot make more work until C catches up." },
              { graph: { active: ["C"], activeEdges: [["Q", "C"]] }, stacks: [{ label: "Q", items: [2, 3], kind: "queue" }, { label: "waiting puts", items: [], kind: "queue" }, { label: "waiting takes", items: [], kind: "queue" }], note: "C takes 1. That frees a slot, so the waiting 3 moves in and P's `put` resolves." },
              { graph: { active: ["C"], activeEdges: [["Q", "C"]] }, stacks: [{ label: "Q", items: [], kind: "queue" }, { label: "waiting puts", items: [], kind: "queue" }, { label: "waiting takes", items: [], kind: "queue" }], vars: { size: 0, capacity: 2 }, note: "C takes 2, then 3. The queue is empty and P is busy making the next item." },
              { graph: { active: [] }, note: "C calls `take()` again.", pick: { prompt: "The queue is empty. Who waits now?", answer: "C" } },
              { graph: { active: ["P"], activeEdges: [["P", "Q"], ["Q", "C"]] }, stacks: [{ label: "Q", items: [], kind: "queue" }, { label: "waiting puts", items: [], kind: "queue" }, { label: "waiting takes", items: ["C"], kind: "queue" }], note: "When P puts 4, a consumer is already waiting, so 4 goes **straight to C** without sitting in the queue." },
            ],
          },
        },
        question: { type: "widget", goal: { picked: true }, prompt: "Answer both picks.", hint: "Producers wait on a full queue; consumers wait on an empty one." },
        explanation: "The queue makes whichever side is ahead wait. A full queue pauses producers, an empty one pauses consumers, and an item can skip the buffer when someone is already waiting for it.",
      },
      {
        kind: "question",
        title: "How many fit?",
        body: "A bounded queue has capacity 3 and starts empty. A producer calls `put` for items 1 to 5 at once, and nobody takes anything. Find how many of the five `put` promises have resolved.",
        question: { type: "number", answer: 3, hint: "Each item that fits in the queue resolves its put; the rest wait for space." },
        explanation: "Items 1, 2 and 3 fit, so those **3** puts resolve. Puts 4 and 5 stay pending until a consumer takes something.",
      },
      {
        kind: "question",
        title: "Why bound it?",
        body: "A web server puts every incoming upload in a queue for a slow image resizer. What does a capacity limit buy you?",
        question: {
          type: "choice",
          options: [
            "Uploads get resized faster.",
            "The resizer can skip images it has already seen.",
            "Items come out in a different, smarter order.",
            "Memory stays bounded; producers slow to the consumer's pace.",
          ],
          answer: 3,
          feedback: {
            0: "The resizer works at the same speed either way; the limit only changes who waits.",
            1: "A queue does not remove duplicates; that would be a set or a cache.",
            2: "A queue keeps first in, first out order whether or not it is bounded.",
          },
          hint: "Think about what happens over an hour if items arrive faster than they leave.",
        },
        explanation: "Without a limit, a producer that is faster than the consumer fills memory until the process dies. A bound turns the overload into waiting (back-pressure), which can travel back to the client as *slow down* or *try again later*.",
      },
      {
        kind: "code",
        title: "Build a bounded queue",
        body:
          "Write a `BoundedQueue` class. `new BoundedQueue(capacity)` starts empty, with `capacity` at least 1.\n\n" +
          "- `put(item)` returns a promise. If a `take()` is waiting, give it the item directly. Otherwise, if there is room, add the item at the back. Otherwise wait for space. Waiting puts get in first come, first served, in the order they were called.\n" +
          "- `take()` returns a promise for the front item, waiting if the queue is empty. When it frees a slot and a put is waiting, that put's item moves in and its promise resolves.\n" +
          "- `size` is the number of items in the queue.",
        language: "javascript",
        starter: `class BoundedQueue {
  constructor(capacity) {
    this.capacity = capacity;
    this.items = [];
  }

  get size() {
    return this.items.length;
  }

  async put(item) {
    // wait while the queue is full, then add item at the back
  }

  async take() {
    // wait while the queue is empty, then remove and return the front item
  }
}
`,
        solution: `class BoundedQueue {
  constructor(capacity) {
    this.capacity = capacity;
    this.items = [];
    this.takers = []; // resolve functions of take() calls waiting for an item
    this.putters = []; // { item, resolve } of put() calls waiting for space
  }

  get size() {
    return this.items.length;
  }

  put(item) {
    const taker = this.takers.shift();
    if (taker) {
      taker(item); // hand it over directly
      return Promise.resolve();
    }
    if (this.items.length < this.capacity) {
      this.items.push(item);
      return Promise.resolve();
    }
    return new Promise((resolve) => this.putters.push({ item, resolve }));
  }

  take() {
    if (this.items.length === 0) {
      return new Promise((resolve) => this.takers.push(resolve));
    }
    const item = this.items.shift();
    const putter = this.putters.shift();
    if (putter) {
      this.items.push(putter.item);
      putter.resolve();
    }
    return Promise.resolve(item);
  }
}
`,
        tests: [
          {
            id: "t1",
            description: "first in, first out, never over capacity",
            assertionCode:
              SLEEP +
              'const q = new BoundedQueue(2);\nlet biggest = 0;\nconst out = [];\nconst producer = async () => { for (let i = 1; i <= 5; i++) { await q.put(i); biggest = Math.max(biggest, q.size); } };\nconst consumer = async () => { for (let i = 0; i < 5; i++) { out.push(await q.take()); await sleep(10); } };\nawait Promise.all([producer(), consumer()]);\nassertEqual(out, [1, 2, 3, 4, 5], "Items come out in the order they went in");\nassert(biggest <= 2, "The queue held " + biggest + " items, more than its capacity of 2");',
          },
          {
            id: "t2",
            description: "put waits while the queue is full",
            assertionCode:
              'const q = new BoundedQueue(2);\nawait q.put("a");\nawait q.put("b");\nconst done = { c: false, d: false };\nq.put("c").then(() => { done.c = true; });\nq.put("d").then(() => { done.d = true; });\nawait sim.tick(100);\nassert(!done.c && !done.d, "The queue is full, so put(\\"c\\") and put(\\"d\\") must wait");\nassertEqual(await q.take(), "a", "take() returns the front item");\nawait sim.flush();\nassert(done.c && !done.d, "One take frees one slot: c gets in first, d keeps waiting");\nassertEqual(await q.take(), "b", "Then b");\nawait sim.flush();\nassert(done.d, "The next take lets d in");\nassertEqual([await q.take(), await q.take()], ["c", "d"], "The waiting items come out in the order they were put");',
          },
          {
            id: "t3",
            description: "take waits for an item",
            assertionCode:
              'const q = new BoundedQueue(3);\nlet got = "nothing yet";\nq.take().then((v) => { got = v; });\nawait sim.tick(100);\nassertEqual(got, "nothing yet", "take() on an empty queue must wait");\nawait q.put("x");\nawait sim.flush();\nassertEqual(got, "x", "put() hands the item to the waiting take()");\nassertEqual(q.size, 0, "An item handed straight to a waiting take() does not stay in the queue");',
          },
          {
            id: "t4",
            description: "three consumers share the work",
            assertionCode:
              SLEEP +
              'const q = new BoundedQueue(2);\nconst seen = [];\nconst t0 = sim.now();\nconst consumer = async () => { for (let i = 0; i < 2; i++) { seen.push(await q.take()); await sleep(30); } };\nconst producer = async () => { for (let i = 1; i <= 6; i++) { await sleep(10); await q.put(i); } };\nawait Promise.all([consumer(), consumer(), consumer(), producer()]);\nassertEqual([...seen].sort((a, b) => a - b), [1, 2, 3, 4, 5, 6], "Every item is taken exactly once");\nassertEqual(sim.now() - t0, 90, "Items arrive every 10 ms and each takes 30 ms to process: done at 90 ms");',
          },
        ],
        hints: ["Keep two waiting lists: resolve functions of takes waiting for an item, and {item, resolve} pairs of puts waiting for space.", "In `put`, check for a waiting take first. In `take`, after removing the front item, move one waiting put's item in and resolve it."],
      },
      {
        kind: "recap",
        points: [
          "A **bounded queue** sits between producers and consumers: `put` waits when it is full, `take` waits when it is empty.",
          "Waiting producers are **back-pressure**: the slow side sets the pace and memory stays bounded.",
          "Keep two FIFO waiting lists; hand an item straight to a waiting consumer, and let a waiting producer in when a slot frees.",
          "The same tool is `queue.Queue` / `asyncio.Queue` in Python, `ArrayBlockingQueue` in Java and a buffered channel in Go.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 7. Deadlock ───────────────────────────────
  {
    id: "fnd-iv-concurrency-7-deadlock",
    title: "Deadlock and the dining philosophers",
    summary: "The four conditions behind a deadlock, and breaking the cycle with a global lock order.",
    minutes: 12,
    xp: 90,
    level: "Advanced",
    steps: [
      {
        kind: "explain",
        title: "Waiting in a circle",
        body:
          "A **deadlock** is a group of tasks that each wait for something another one in the group holds. Nobody can move, ever. Two transfers show it:\n\n" +
          js(`
async function transfer(from, to, amount) {
  await from.lock.lock();
  await to.lock.lock();      // A→B holds A, wants B; B→A holds B, wants A
  // ...
}
transfer(a, b, 30);
transfer(b, a, 10);           // both wait forever
`) +
          "\nA deadlock needs all four **Coffman conditions** at once:\n\n" +
          "1. **Mutual exclusion**: a resource has one holder at a time.\n2. **Hold and wait**: a task keeps what it has while waiting for more.\n3. **No preemption**: nobody can take a lock away from its holder.\n4. **Circular wait**: there is a cycle of tasks, each waiting on the next.\n\n" +
          "Break any one and deadlock is impossible. The usual fix breaks the **cycle**: give every lock a rank and always take locks in rank order (for example by account id). Other fixes: take all the locks at once or none (`tryLock` and back off), or limit how many tasks compete.\n\n" +
          "How it looks: in JavaScript, promises that never settle and a program that just stops. Go reports `fatal error: all goroutines are asleep - deadlock!` when everything is blocked; a Java thread dump says *Found one Java-level deadlock*; Python threads simply hang.\n\n" +
          "**How to spot it:** two or more locks taken in a different order on different paths, *transfer between accounts*, *philosophers and forks*, *hangs under load*.",
      },
      {
        kind: "question",
        title: "Three philosophers",
        body: "Three philosophers sit at a round table with a fork between each pair. P0 needs F0 and F1, P1 needs F1 and F2, P2 needs F2 and F0. Step through and answer the picks.",
        widget: {
          type: "iv-trace",
          props: {
            title: "Dining philosophers",
            frames: [
              { graph: { ...TABLE }, vars: { P0: "-", P1: "-", P2: "-" }, note: "The first rule: *pick up your left fork (F with your number), then your right one*." },
              { graph: { active: ["F0", "F1", "F2"], activeEdges: [["P0", "F0"], ["P1", "F1"], ["P2", "F2"]] }, vars: { P0: "has F0, wants F1", P1: "has F1, wants F2", P2: "has F2, wants F0" }, note: "All three grab their left fork at the same moment." },
              { graph: { active: ["P0", "P1", "P2"], activeEdges: [["P0", "F0"], ["P1", "F1"], ["P2", "F2"]] }, note: "Each one now waits for the fork the next one holds: P0 → P1 → P2 → P0. A **cycle**: nobody ever eats. Deadlock." },
              { graph: {}, vars: { P0: "F0 then F1", P1: "F1 then F2", P2: "? then ?" }, note: "New rule: *always pick up the lower-numbered fork first*.", pick: { prompt: "Which philosopher now reaches for a different fork first?", answer: "P2" } },
              { graph: { active: ["F0", "F1"], activeEdges: [["P0", "F0"], ["P1", "F1"]] }, vars: { P0: "has F0, wants F1", P1: "has F1, wants F2", P2: "wants F0" }, note: "P2's forks are F2 and F0, so it reaches for F0 first. P0 got F0, so P2 waits **holding nothing**." },
              { graph: { active: ["F0", "F1"], activeEdges: [["P0", "F0"], ["P1", "F1"]] }, note: "F2 is still on the table.", pick: { prompt: "Who eats first?", answer: "P1" } },
              { graph: { active: ["P1"], activeEdges: [["P1", "F1"], ["P1", "F2"], ["P0", "F0"]] }, vars: { P0: "has F0, wants F1", P1: "eating", P2: "wants F0" }, note: "P1 takes F2 and eats, then puts both forks down." },
              { graph: { active: ["P0"], done: ["P1"], activeEdges: [["P0", "F0"], ["P0", "F1"]] }, vars: { P0: "eating", P1: "done", P2: "wants F0" }, note: "P0 gets F1 and eats. When it is done, P2 gets F0 and F2. Everyone eats: with a fixed order there can be no cycle." },
            ],
          },
        },
        question: { type: "widget", goal: { picked: true }, prompt: "Answer both picks.", hint: "Under the new rule each philosopher compares the numbers of its two forks." },
        explanation: "When everyone takes locks in the same global order, a cycle cannot form: whoever holds the highest-ranked lock in play is never waiting on anyone, so it finishes and frees the others.",
      },
      {
        kind: "question",
        title: "Which condition breaks?",
        body: "Taking locks in a fixed global order prevents deadlock. Which of the four conditions does it remove?",
        question: {
          type: "choice",
          options: ["Mutual exclusion", "Circular wait", "No preemption", "Hold and wait"],
          answer: 1,
          feedback: {
            0: "Each lock still has one holder at a time.",
            2: "Nobody takes a lock away from its holder; holders still release on their own.",
            3: "A task still holds its first lock while it waits for the second.",
          },
          hint: "Tasks still hold one lock while waiting for another. What can no longer form?",
        },
        explanation: "With one order, every wait points from a lower rank to a higher one, so the waits can never loop back: **circular wait** is gone.",
      },
      {
        kind: "question",
        title: "Send one away",
        body: "Five philosophers, five forks, everyone takes the left fork first. A waiter lets only some of them sit down at a time. Find the largest number that can sit at once with no possible deadlock.",
        question: { type: "number", answer: 4, hint: "A deadlock needs every philosopher at the table holding one fork. What if one seat stays empty?" },
        explanation: "With **4** seated and 5 forks, at least one philosopher can always get both forks, eat and free them. That is a semaphore with n − 1 permits breaking the cycle.",
      },
      {
        kind: "code",
        title: "Transfers that cannot deadlock",
        body:
          "Each account has a unique `id` and its own `lock` (the `Mutex` from the locks lesson). `transfer(from, to, amount)` must hold **both** locks while it checks and writes the balances. As written, two transfers in opposite directions deadlock.\n\n" +
          "Fix `transfer` so that no mix of transfers can deadlock: lock the two accounts in a fixed order, the smaller `id` first. Keep both sleeps, and keep both locks held while balances change. `from` and `to` are always different accounts.",
        language: "javascript",
        starter:
          TRANSFER_HEAD +
          `
async function transfer(from, to, amount) {
  await from.lock.lock();
  await sleep(10); // checking the sender's limits
  await to.lock.lock();
  try {
    await sleep(10); // writing the ledger
    from.balance -= amount;
    to.balance += amount;
  } finally {
    to.lock.unlock();
    from.lock.unlock();
  }
}
`,
        solution:
          TRANSFER_HEAD +
          `
async function transfer(from, to, amount) {
  // always lock the smaller id first, so the waits can never form a cycle
  const [first, second] = from.id < to.id ? [from, to] : [to, from];
  await first.lock.lock();
  await sleep(10); // checking the sender's limits
  await second.lock.lock();
  try {
    await sleep(10); // writing the ledger
    from.balance -= amount;
    to.balance += amount;
  } finally {
    second.lock.unlock();
    first.lock.unlock();
  }
}
`,
        tests: [
          {
            id: "t1",
            description: "opposite transfers both finish",
            assertionCode:
              SLEEP +
              WITHIN +
              'const a = makeAccount("A", 100), b = makeAccount("B", 100);\nconst t0 = sim.now();\nconst r = await within(Promise.all([transfer(a, b, 30), transfer(b, a, 10)]), 5000);\nassertEqual(r, "done", "Deadlock: A→B and B→A were still waiting for each other after 5 s. Lock the smaller id first");\nassertEqual([a.balance, b.balance], [80, 120], "A sends 30 and gets 10 back");\nassertEqual(sim.now() - t0, 40, "Both transfers use both accounts, so they take turns: 20 ms each");',
          },
          {
            id: "t2",
            description: "a ring of three transfers finishes",
            assertionCode:
              SLEEP +
              WITHIN +
              'const a = makeAccount("A", 100), b = makeAccount("B", 100), c = makeAccount("C", 100);\nconst r = await within(Promise.all([transfer(a, b, 10), transfer(b, c, 20), transfer(c, a, 30)]), 5000);\nassertEqual(r, "done", "Deadlock: A→B, B→C and C→A were waiting in a circle after 5 s");\nassertEqual([a.balance, b.balance, c.balance], [120, 90, 90], "Each account sends and receives once");',
          },
          {
            id: "t3",
            description: "a busy mix of transfers",
            assertionCode:
              SLEEP +
              WITHIN +
              'const acc = { A: makeAccount("A", 100), B: makeAccount("B", 100), C: makeAccount("C", 100), D: makeAccount("D", 100) };\nconst moves = [["A", "B", 5], ["B", "A", 7], ["C", "D", 11], ["D", "C", 13], ["A", "C", 17], ["D", "B", 19], ["B", "D", 23], ["C", "A", 29]];\nconst r = await within(Promise.all(moves.map(([f, t, n]) => transfer(acc[f], acc[t], n))), 5000);\nassertEqual(r, "done", "Deadlock: some of the 8 transfers never finished");\nassertEqual(["A", "B", "C", "D"].map((k) => acc[k].balance), [114, 94, 90, 102], "Every transfer moves its amount exactly once");',
          },
        ],
        hints: ["Work out which of the two accounts has the smaller `id`; that one is always locked first.", "Only the lock order changes: subtract from `from` and add to `to` as before."],
      },
      {
        kind: "recap",
        points: [
          "A **deadlock** is a cycle of tasks, each waiting for something the next one holds.",
          "It needs mutual exclusion, hold and wait, no preemption and circular wait; remove one and it cannot happen.",
          "The standard fix is a **global lock order** (by id, by address): every task takes its locks lowest first.",
          "Alternatives: take all locks or none (`tryLock` and back off), or let at most n − 1 of n tasks compete.",
          "Symptoms: promises that never settle in JavaScript, Go's *all goroutines are asleep*, a Java thread dump, a silent hang in Python.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 8. Barriers ───────────────────────────────
  {
    id: "fnd-iv-concurrency-8-barriers",
    title: "Barriers",
    summary: "Make a group of workers wait for each other at a checkpoint, round after round.",
    minutes: 12,
    xp: 100,
    level: "Professional",
    steps: [
      {
        kind: "explain",
        title: "Nobody goes on until everyone arrives",
        body:
          "A **barrier** is a meeting point for a fixed group of N workers. Each one calls `await barrier.wait()`. The first N − 1 wait; when the N-th arrives, **all** of them continue together.\n\n" +
          "It fits work done in **rounds** (phases): every worker updates its part of a simulation, then all must finish round 1 before anyone reads the results in round 2. A **cyclic** barrier resets itself after it opens, so the same object works for the next round.\n\n" +
          js(`
for (let round = 0; round < 3; round++) {
  await computeMyPart(round);
  await barrier.wait();     // wait for the whole group
}
`) +
          "\nThe classic pitfall: a fast worker leaves round 1 and reaches the barrier for round 2 before the slow ones have even left round 1. Its arrival must count for **round 2**, not top up round 1. Starting a fresh waiting list the moment the barrier opens keeps the rounds apart.\n\n" +
          "A **latch** is the one-shot cousin: it opens after N events and stays open. Java has `CountDownLatch`, `CyclicBarrier` and `Phaser`; Python `threading.Barrier(n)`; in Go a `sync.WaitGroup` waits for N goroutines to finish (latch-like), and rounds are often built with channels.\n\n" +
          "**How to spot it:** *rounds*, *phases*, *wait for all workers before continuing*, *start together*, *every step must finish before the next*.",
      },
      {
        kind: "question",
        title: "Who opens the barrier?",
        body: "Three hikers A, B and C meet at checkpoint X at the end of each stage. Stage 1 takes A 20 min, B 80 and C 50. Stage 2 takes A 70, B 10 and C 40. Step through and tap the hiker who opens the barrier.",
        widget: {
          type: "iv-trace",
          props: {
            title: "A barrier for 3",
            frames: [
              { graph: { ...HIKE, active: ["A", "B", "C"] }, vars: { time: 0, round: 0, arrived: "0 of 3" }, stacks: [{ label: "waiting at X", items: [], kind: "queue" }], note: "Everyone sets off on stage 1." },
              { graph: { active: ["B", "C"], activeEdges: [["A", "X"]] }, vars: { time: 20, round: 0, arrived: "1 of 3" }, stacks: [{ label: "waiting at X", items: ["A"], kind: "queue" }], note: "A arrives at 20 and waits." },
              { graph: { active: ["B"], activeEdges: [["A", "X"], ["C", "X"]] }, vars: { time: 50, round: 0, arrived: "2 of 3" }, stacks: [{ label: "waiting at X", items: ["A", "C"], kind: "queue" }], note: "C arrives at 50 and waits too." },
              { graph: { active: ["B"], activeEdges: [["A", "X"], ["C", "X"]] }, note: "Two of three are here.", pick: { prompt: "Which hiker opens the barrier?", answer: "B" } },
              { graph: { active: ["A", "B", "C"] }, vars: { time: 80, round: 1, arrived: "0 of 3" }, stacks: [{ label: "waiting at X", items: [], kind: "queue" }], note: "B arrives at 80: that is 3 of 3. All three are released together and round 1 starts with an **empty** waiting list." },
              { graph: { active: ["A", "C"], activeEdges: [["B", "X"]] }, vars: { time: 90, round: 1, arrived: "1 of 3" }, stacks: [{ label: "waiting at X", items: ["B"], kind: "queue" }], note: "B is fast this time and arrives at 90. It counts towards round 1, not round 0." },
              { graph: { active: ["A"], activeEdges: [["B", "X"], ["C", "X"]] }, vars: { time: 120, round: 1, arrived: "2 of 3" }, stacks: [{ label: "waiting at X", items: ["B", "C"], kind: "queue" }], note: "C arrives at 120.", pick: { prompt: "Who opens the barrier this time?", answer: "A" } },
              { graph: { active: ["A", "B", "C"] }, vars: { time: 150, round: 2, arrived: "0 of 3" }, stacks: [{ label: "waiting at X", items: [], kind: "queue" }], note: "A arrives at 80 + 70 = **150** and everyone moves on. Each round lasts as long as its slowest worker." },
            ],
          },
        },
        question: { type: "widget", goal: { picked: true }, prompt: "Answer both picks.", hint: "The barrier opens when the last member of the group arrives." },
        explanation: "The last arrival opens the barrier, so every round takes as long as its slowest worker. A fresh waiting list per round keeps an early arrival for the next round from being counted in the old one.",
      },
      {
        kind: "question",
        title: "Rounds add up",
        body: "Three workers, two rounds, with a barrier after each round. Round times: A 30 and 10 ms, B 15 and 60 ms, C 45 and 20 ms. Find when round 2's barrier opens, in ms.",
        question: { type: "number", answer: 105, unit: "ms", hint: "Each round starts when the previous barrier opens and ends with its slowest worker." },
        explanation: "Round 1 ends when the slowest worker, C, arrives at 45 ms. Round 2 starts there and its slowest worker is B with 60 ms: 45 + 60 = **105 ms**. Without the barrier, A would be done at 40 ms, but it would have read results that were not ready.",
      },
      {
        kind: "question",
        title: "Latch or barrier?",
        body: "A test starts 5 server instances and must wait until all of them report *ready* before it sends a request. The servers keep running afterwards. Which tool fits best?",
        question: {
          type: "choice",
          options: [
            "A cyclic barrier that the 5 servers wait on each round.",
            "A mutex around the request.",
            "A latch: count 5 ready events, then open for good.",
            "A bounded queue of capacity 5.",
          ],
          answer: 2,
          feedback: {
            0: "The servers do not need to wait for each other or meet again; only the test waits, once.",
            1: "A mutex stops two tasks entering a section at once; it does not wait for 5 events.",
            3: "A queue passes items along; it does not wait until all 5 have happened.",
          },
          hint: "Who needs to wait here, and how many times?",
        },
        explanation: "Only the test waits, and only once, for 5 events: that is a **latch** (Java `CountDownLatch`, Go `WaitGroup`). A barrier is for a group whose members all wait for each other, usually round after round.",
      },
      {
        kind: "code",
        title: "A reusable barrier",
        body:
          "Write a `Barrier` class. `new Barrier(parties)` is a meeting point for `parties` workers.\n\n" +
          "- `wait()` returns a promise. It stays pending until `parties` calls of `wait()` have arrived in the current round; then all of them resolve **together**, with the round number (0 for the first round, 1 for the next, …).\n" +
          "- The barrier is **reusable**: after it opens, the next `parties` calls form the next round.",
        language: "javascript",
        starter: `class Barrier {
  constructor(parties) {
    this.parties = parties;
  }

  wait() {
    // wait until \`parties\` callers have arrived, then resolve them all with the round number
    return Promise.resolve();
  }
}
`,
        solution: `class Barrier {
  constructor(parties) {
    this.parties = parties;
    this.round = 0;
    this.waiting = [];
  }

  wait() {
    return new Promise((resolve) => {
      this.waiting.push(resolve);
      if (this.waiting.length === this.parties) {
        const everyone = this.waiting;
        const round = this.round;
        this.waiting = []; // later arrivals belong to the next round
        this.round++;
        for (const release of everyone) release(round);
      }
    });
  }
}
`,
        tests: [
          {
            id: "t1",
            description: "everyone leaves when the last one arrives",
            assertionCode:
              SLEEP +
              'const b = new Barrier(3);\nconst t0 = sim.now();\nconst left = [];\nconst hiker = async (name, ms) => { await sleep(ms); const round = await b.wait(); left.push(name + "@" + (sim.now() - t0) + "#" + round); };\nawait Promise.all([hiker("A", 20), hiker("B", 80), hiker("C", 50)]);\nassertEqual(left.length, 3, "All three should get through");\nassert(left.every((s) => s.endsWith("@80#0")), "All three leave at 80 ms (when B, the last, arrives) with round 0; got " + JSON.stringify(left));',
          },
          {
            id: "t2",
            description: "nobody passes early",
            assertionCode:
              'const b = new Barrier(2);\nlet passed = false;\nb.wait().then(() => { passed = true; });\nawait sim.tick(1000);\nassert(!passed, "With 1 of 2 arrived, wait() must keep waiting");\nconst second = b.wait();\nawait sim.flush();\nassert(passed, "The second arrival opens the barrier for the first one too");\nassertEqual(await second, 0, "The first round is round 0");',
          },
          {
            id: "t3",
            description: "rounds stay separate",
            assertionCode:
              SLEEP +
              'const b = new Barrier(3);\nconst t0 = sim.now();\nconst log = { A: [], B: [], C: [] };\nconst worker = async (name, times) => { for (const ms of times) { await sleep(ms); const round = await b.wait(); log[name].push((sim.now() - t0) + "#" + round); } };\nawait Promise.all([worker("A", [20, 70, 10]), worker("B", [80, 10, 10]), worker("C", [50, 40, 60])]);\nconst expected = ["80#0", "150#1", "210#2"];\nassertEqual(log.A, expected, "A leaves each round when the slowest worker of that round arrives");\nassertEqual(log.B, expected, "B is fast in rounds 1 and 2 but must still wait for the others");\nassertEqual(log.C, expected, "C leaves with everyone else");',
          },
          {
            id: "t4",
            description: "a barrier for one opens at once",
            assertionCode: 'const b = new Barrier(1);\nassertEqual(await b.wait(), 0, "A barrier for 1 opens on every call: first round 0");\nassertEqual(await b.wait(), 1, "then round 1");',
          },
        ],
        hints: ["Keep the list of resolve functions for the current round and a round counter.", "When the list reaches `parties`, swap in a new empty list and bump the round before resolving everyone in the old list."],
      },
      {
        kind: "recap",
        points: [
          "A **barrier** holds a group of N workers until all N have arrived, then releases them together.",
          "A **cyclic** barrier resets after it opens; start a fresh waiting list so early arrivals count for the next round.",
          "Each round lasts as long as its slowest worker.",
          "A **latch** opens once after N events (`CountDownLatch`, Go's `WaitGroup`); a barrier is for peers that meet round after round (`CyclicBarrier`, Python's `threading.Barrier`).",
        ],
      },
    ],
  },
];
