import type { ConceptLesson } from "../../learn/types.ts";

/** Fenced JavaScript block for lesson prose. */
const js = (code: string) => "~~~js\n" + code.trim() + "\n~~~";

// Shared check helpers (pasted at the top of a check; checks run in the learner's scope, so names are local here).
const SLEEP = "const sleep = (ms) => new Promise((r) => setTimeout(r, ms));\n";

// ── trace data ──
const DEPOSIT_CODE = ["async function deposit(amount) {", "  const current = balance", "  await audit()", "  balance = current + amount", "}"];
const TWO_WORKERS = {
  nodes: [
    { id: "A", x: 22, y: 50 },
    { id: "B", x: 78, y: 50 },
  ],
  edges: [] as [string, string][],
};

const LOOP_CODE = ['console.log("A")', 'setTimeout(() => console.log("B"), 0)', 'Promise.resolve().then(() => console.log("C"))', 'queueMicrotask(() => console.log("D"))', 'console.log("E")'];
const LETTERS = {
  nodes: [
    { id: "A", x: 10, y: 50 },
    { id: "B", x: 30, y: 50 },
    { id: "C", x: 50, y: 50 },
    { id: "D", x: 70, y: 50 },
    { id: "E", x: 90, y: 50 },
  ],
  edges: [] as [string, string][],
};

const RELAY = {
  nodes: [
    { id: "R", x: 50, y: 12 },
    { id: "G", x: 86, y: 82 },
    { id: "B", x: 14, y: 82 },
  ],
  edges: [
    ["R", "G"],
    ["G", "B"],
    ["B", "R"],
  ] as [string, string][],
  directed: true,
};

const LOCK = {
  nodes: [
    { id: "M", x: 50, y: 50 },
    { id: "A", x: 12, y: 18 },
    { id: "B", x: 88, y: 18 },
    { id: "C", x: 50, y: 92 },
  ],
  edges: [
    ["A", "M"],
    ["B", "M"],
    ["C", "M"],
  ] as [string, string][],
};
const RUN_CODE = ["async run(fn) {", "  await this.lock()", "  try {", "    return await fn()", "  } finally {", "    this.unlock()", "  }", "}"];

export const concurrencyLessonsA: ConceptLesson[] = [
  // ─────────────────────────────── 1. Interleavings and races ───────────────────────────────
  {
    id: "fnd-iv-concurrency-1-races",
    title: "Interleavings and races",
    summary: "Why two tasks that each look correct can lose an update, and where JavaScript lets that happen.",
    minutes: 10,
    xp: 60,
    level: "Beginner",
    steps: [
      {
        kind: "explain",
        title: "Two things in flight",
        body:
          "**Concurrency** means several tasks are in progress at once and take turns. **Parallelism** means they really run at the same instant, on different CPU cores. You can have the first without the second.\n\n" +
          "JavaScript runs your code on **one thread**. An `async` function runs without interruption until it reaches an `await`; there it pauses, and the **event loop** runs other work until the awaited thing is ready. So in JavaScript, other code can only cut in **at an `await`**.\n\n" +
          "That is still enough for a bug. Two deposits run at once:\n\n" +
          js(`
let balance = 100;

async function deposit(amount) {
  const current = balance;      // read
  await audit();                // pause: other code runs here
  balance = current + amount;   // write, using the old read
}

await Promise.all([deposit(10), deposit(20)]);
console.log(balance);           // 120, not 130
`) +
          "\nBoth deposits read 100 before either writes. The result depends on how the steps **interleave**, and that is a **race condition**.\n\n" +
          "**How to spot it:** shared state (a counter, a balance, a seat map), the words *at the same time*, *two requests*, *in parallel*, and a read and a write with an `await` between them.",
      },
      {
        kind: "question",
        title: "Step through the lost update",
        body: "Two workers run `deposit` on the same balance: A adds 10, B adds 20. Step through and answer the picks.",
        widget: {
          type: "iv-trace",
          props: {
            lang: "javascript",
            title: "deposit(10) and deposit(20) at the same time",
            frames: [
              { graph: { ...TWO_WORKERS, active: ["A"] }, code: DEPOSIT_CODE, line: 2, vars: { balance: 100, "A.current": 100, "B.current": "-" }, stacks: [{ label: "paused at await", items: [], kind: "queue" }], note: "A starts and reads `balance`: **100**." },
              { graph: { active: [] }, line: 3, stacks: [{ label: "paused at await", items: ["A"], kind: "queue" }], note: "A reaches `await audit()` and pauses. The event loop is free to run something else." },
              { graph: { active: ["B"] }, line: 2, vars: { balance: 100, "A.current": 100, "B.current": 100 }, note: "B starts and reads `balance`. A has not written yet, so B also sees **100**." },
              { graph: { active: [] }, line: 3, stacks: [{ label: "paused at await", items: ["A", "B"], kind: "queue" }], note: "B pauses too. Both workers now hold the same old value." },
              { graph: { active: [] }, line: 3, note: "The audits finish in the order they started.", pick: { prompt: "Which worker resumes first?", answer: "A" } },
              { graph: { active: ["A"] }, line: 4, vars: { balance: 110, "A.current": 100, "B.current": 100 }, stacks: [{ label: "paused at await", items: ["B"], kind: "queue" }], note: "A writes `100 + 10 = 110`. So far so good." },
              { graph: { active: [], done: ["A"] }, line: 4, note: "One worker still has to write.", pick: { prompt: "Whose write decides the final balance?", answer: "B" } },
              { graph: { active: ["B"], done: ["A"] }, line: 4, vars: { balance: 120, "A.current": 100, "B.current": 100 }, stacks: [{ label: "paused at await", items: [], kind: "queue" }], note: "B writes its stale `100 + 20 = 120`, wiping out A's work. That is a **lost update**: 130 was expected." },
              {
                graph: { active: [], done: ["A", "B"] },
                code: ["async function deposit(amount) {", "  await audit()", "  balance = balance + amount", "}"],
                line: 3,
                vars: { balance: 130 },
                note: "The fix: do the read and the write **with no `await` between them**. Nothing can cut in, so each deposit sees the latest balance.",
              },
            ],
          },
        },
        question: { type: "widget", goal: { picked: true }, prompt: "Answer both picks.", hint: "Paused workers resume in the order they paused; the last write wins." },
        explanation: "Each worker's own steps are fine. The bug is the gap between the read and the write: the other worker ran inside it. Whoever writes last decides the result, and the other update is lost.",
      },
      {
        kind: "question",
        title: "Three at once",
        body: "The balance is 50. Three workers each call the buggy `deposit(5)`, and all three read the balance before any audit finishes. Find the final balance.",
        question: { type: "number", answer: 55, hint: "What value did every worker read, and what does each one write back?" },
        explanation: "All three read 50, and each writes `50 + 5 = 55`. Three deposits, but only one counts: the final balance is **55** instead of 65.",
      },
      {
        kind: "question",
        title: "Which deposit is safe?",
        body: "In JavaScript, which version of `deposit` can never lose an update?",
        question: {
          type: "choice",
          options: [
            "Read `balance`, await the audit, then write the saved value plus `amount`.",
            "Await the audit, then run `balance += amount` with no await after it.",
            "Read `balance` twice before the await, to make sure it is fresh.",
            "Wrap the read in `setTimeout(..., 0)` so it happens a little later.",
          ],
          answer: 1,
          feedback: {
            0: "That is the buggy version: another deposit can run during the await and its write gets overwritten.",
            2: "Reading twice before the await does not help: the gap is after the read, during the await.",
            3: "A timer only moves the read later; there is still an await between the read and the write.",
          },
          hint: "Find the version where nothing else can run between the read and the write.",
        },
        explanation: "`balance += amount` reads and writes in one synchronous step. With no `await` in between, no other task can run there, so every deposit adds to the latest value.",
      },
      {
        kind: "question",
        title: "Threads are stricter",
        body: "In Java, two real threads each run `count++` a million times on a shared `int`. There is no `await` anywhere. Is it safe?",
        question: {
          type: "choice",
          options: [
            "Yes: `count++` is a single line, so it runs in one go.",
            "Yes: only an `await` can interrupt running code.",
            "No: `count++` is read, add, write, and threads can switch in between.",
            "Yes, as long as the machine only has one CPU core.",
          ],
          answer: 2,
          feedback: {
            0: "One line of source is several machine steps. A thread can be paused after the read.",
            1: "That is true for JavaScript's single thread, not for threads, which the OS can pause anywhere.",
            3: "Even on one core the OS switches threads at any moment, including between the read and the write.",
          },
          hint: "With threads the operating system decides when to switch, not your code.",
        },
        explanation: "Threads can be paused between **any** two machine steps, so `count++` itself is a race. Java uses `synchronized`, a lock, or `AtomicInteger`; Python threads use `threading.Lock`; Go uses `sync.Mutex` or `sync/atomic`. JavaScript's single thread is why a race there needs an `await` in the gap.",
      },
      {
        kind: "code",
        title: "The last items in stock",
        body:
          "A shop keeps its stock in `store.stock`. `sell(qty)` must call `await warehouseCheck()` (it takes 50 ms), then sell **only if there is enough stock**: take `qty` off and return `true`, or change nothing and return `false`.\n\n" +
          "The starter checks the stock and remembers it **before** the await, so two sales running at once both see the old value. Fix it. Sales must still run at the same time (do not make them wait for each other).",
        language: "javascript",
        starter: `const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const store = { stock: 10 };

// A slow call to the warehouse (50 ms).
async function warehouseCheck() {
  await sleep(50);
}

async function sell(qty) {
  const before = store.stock;
  if (before < qty) return false;
  await warehouseCheck();
  store.stock = before - qty;
  return true;
}
`,
        solution: `const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const store = { stock: 10 };

// A slow call to the warehouse (50 ms).
async function warehouseCheck() {
  await sleep(50);
}

async function sell(qty) {
  await warehouseCheck();
  // decide and write with no await in between
  if (store.stock < qty) return false;
  store.stock -= qty;
  return true;
}
`,
        tests: [
          {
            id: "t1",
            description: "two sales at once both count",
            assertionCode: 'store.stock = 10;\nconst out = await Promise.all([sell(2), sell(3)]);\nassertEqual(out, [true, true], "Both sales fit in 10 items");\nassertEqual(store.stock, 5, "10 - 2 - 3 is 5; if you got 7 or 8, one sale overwrote the other");',
          },
          {
            id: "t2",
            description: "never oversells the last items",
            assertionCode:
              'store.stock = 4;\nconst out = await Promise.all([sell(3), sell(3)]);\nassertEqual(out.filter(Boolean).length, 1, "Only one of two sales of 3 fits in 4 items (got results " + JSON.stringify(out) + ")");\nassertEqual(store.stock, 1, "4 - 3 leaves 1 item");',
          },
          {
            id: "t3",
            description: "five sales run together and all count",
            assertionCode:
              SLEEP +
              'store.stock = 10;\nconst t0 = sim.now();\nconst out = await Promise.all([sell(2), sell(2), sell(2), sell(2), sell(2)]);\nassertEqual(store.stock, 0, "Five sales of 2 empty a stock of 10");\nassertEqual(out, [true, true, true, true, true], "Every sale fits");\nassertEqual(sim.now() - t0, 50, "The sales run at the same time, so all five take 50 ms, not 250 ms");',
          },
        ],
        hints: ["Which value of `store.stock` does the second sale see when it resumes after the await?", "Await the warehouse first, then check and update `store.stock` in one go, with no await in between."],
      },
      {
        kind: "recap",
        points: [
          "**Concurrency** is tasks taking turns; **parallelism** is running at the same instant on several cores.",
          "In JavaScript, one thread runs your code and other tasks can only cut in at an `await`.",
          "A **race** is a read and a write of shared state with a gap between them; the last write wins and the other update is lost.",
          "Fix it in JavaScript by keeping check-and-update in one synchronous step after the await, or with a lock when the gap is unavoidable.",
          "Threads (Python, Java, Go) can switch between any two machine steps, so even `count++` needs a lock or an atomic there.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 2. Ordering with promises and events ───────────────────────────────
  {
    id: "fnd-iv-concurrency-2-ordering",
    title: "Ordering with promises and the event loop",
    summary: "Synchronous code, microtasks and timers, and how to make one task wait for another.",
    minutes: 10,
    xp: 60,
    level: "Beginner",
    steps: [
      {
        kind: "explain",
        title: "The event loop's three lines",
        body:
          "JavaScript runs one piece of code at a time, from start to finish. What runs next comes from queues:\n\n" +
          "1. **Synchronous code**: the script (or callback) that is running now always finishes first.\n" +
          "2. **Microtasks**: promise callbacks (`.then`, the code after an `await`) and `queueMicrotask`. After each piece of code, the loop runs **every** microtask, including new ones added meanwhile.\n" +
          "3. **Tasks** (macrotasks): timers (`setTimeout`), network replies, clicks. The loop takes **one**, runs it, then drains the microtasks again.\n\n" +
          js(`
console.log("start");
setTimeout(() => console.log("timer"), 0);
Promise.resolve().then(() => console.log("promise"));
console.log("end");
// start, end, promise, timer
`) +
          "\nA `setTimeout` of 0 ms still waits for the current code and every microtask.\n\n" +
          "**Ordering** between tasks is the other half: if `bake` must not start until `mix` has *finished*, `bake` has to **await a promise that `mix` resolves**. In Python's `asyncio` this is an `asyncio.Event`; with threads it is `threading.Event` (Python), a `CountDownLatch` (Java) or closing a channel (Go).\n\n" +
          "**How to spot it:** *must run after*, *in this order*, *wait until X is ready*, or a puzzle that asks what a snippet prints.",
      },
      {
        kind: "question",
        title: "Predict the event loop",
        body: "Step through this script. Each node is one `console.log`. At each stop, tap the letter that prints next.",
        widget: {
          type: "iv-trace",
          props: {
            lang: "javascript",
            title: "Sync, microtasks, then timers",
            frames: [
              { graph: { ...LETTERS, done: ["A"] }, code: LOOP_CODE, line: 1, array: ["A", null, null, null, null], stacks: [{ label: "microtasks", items: [], kind: "queue" }, { label: "timers", items: [], kind: "queue" }], note: "Line 1 runs right away: **A** prints." },
              { graph: { done: ["A"] }, line: 2, stacks: [{ label: "microtasks", items: [], kind: "queue" }, { label: "timers", items: ["B"], kind: "queue" }], note: "`setTimeout` only *schedules* B in the timer queue, even with 0 ms." },
              { graph: { done: ["A"] }, line: 3, stacks: [{ label: "microtasks", items: ["C"], kind: "queue" }, { label: "timers", items: ["B"], kind: "queue" }], note: "The promise is already resolved, so its `.then` callback C joins the microtask queue." },
              { graph: { done: ["A"] }, line: 4, stacks: [{ label: "microtasks", items: ["C", "D"], kind: "queue" }, { label: "timers", items: ["B"], kind: "queue" }], note: "`queueMicrotask` puts D behind C." },
              { graph: { done: ["A"] }, line: 5, note: "The script still has a line left.", pick: { prompt: "What prints next?", answer: "E" } },
              { graph: { done: ["A", "E"] }, array: ["A", "E", null, null, null], note: "**E** prints; it is plain synchronous code. The script is finished, so the call stack is empty." },
              { graph: { done: ["A", "E"] }, note: "The loop now looks at its queues.", pick: { prompt: "Which callback runs next?", answer: "C" } },
              { graph: { done: ["A", "E", "C"] }, array: ["A", "E", "C", null, null], stacks: [{ label: "microtasks", items: ["D"], kind: "queue" }, { label: "timers", items: ["B"], kind: "queue" }], note: "**C** prints: microtasks come before timers." },
              { graph: { done: ["A", "E", "C"] }, note: "D waits in the microtasks, B in the timers.", pick: { prompt: "And next?", answer: "D" } },
              { graph: { done: ["A", "E", "C", "D"] }, array: ["A", "E", "C", "D", null], stacks: [{ label: "microtasks", items: [], kind: "queue" }, { label: "timers", items: ["B"], kind: "queue" }], note: "**D** prints. The microtask queue is empty at last." },
              { graph: { done: ["A", "E", "C", "D", "B"] }, array: ["A", "E", "C", "D", "B"], stacks: [{ label: "microtasks", items: [], kind: "queue" }, { label: "timers", items: [], kind: "queue" }], note: "Only now does the loop take a timer: **B**. The output is `A E C D B`." },
            ],
          },
        },
        question: { type: "widget", goal: { picked: true }, prompt: "Answer all three picks.", hint: "Finish the synchronous script first, then every microtask, and only then a timer." },
        explanation: "Synchronous code always finishes first. Then every microtask runs, in the order they were queued. A timer runs only when both are empty, however short its delay.",
      },
      {
        kind: "question",
        title: "Where await resumes",
        body: "Put the lines in the order this program prints them.\n\n" +
          js(`
async function job() {
  console.log("job starts");
  await null;
  console.log("job resumes");
}
console.log("start");
setTimeout(() => console.log("timer"), 0);
job();
console.log("end");
`),
        question: { type: "order", items: ["start", "job starts", "end", "job resumes", "timer"], hint: "An async function runs synchronously up to its first await; the rest is a microtask." },
        explanation: "`job()` runs right away until `await null`, so *job starts* prints before *end*. The rest of `job` is a microtask, so it runs after the script but before the timer.",
      },
      {
        kind: "question",
        title: "One after another, or together?",
        body: "`sleep(ms)` resolves after `ms` milliseconds. How many ms does this take in total?\n\n" + js(`
await sleep(100);
await sleep(200);
`),
        question: { type: "number", answer: 300, unit: "ms", hint: "The second sleep only starts once the first has finished." },
        explanation: "Each `await` waits before the next line starts, so the sleeps run back to back: **300 ms**. `await Promise.all([sleep(100), sleep(200)])` starts both at once and takes 200 ms.",
      },
      {
        kind: "question",
        title: "Results and timing",
        body: "`load(1)` takes 300 ms and `load(2)` takes 100 ms. Both start at the same moment: `await Promise.all([load(1), load(2)])`. What do you get, and when?",
        question: {
          type: "choice",
          options: ["[r2, r1] after 300 ms, fastest first", "[r1, r2] after 400 ms", "[r2, r1] after 100 ms", "[r1, r2] after 300 ms"],
          answer: 3,
          feedback: {
            0: "`Promise.all` keeps the order of its input array, not the order of finishing.",
            1: "They run at the same time, so the wait is the longest one, not the sum.",
            2: "`Promise.all` waits for every promise, so it cannot finish before the slowest one.",
          },
          hint: "Think about which order `Promise.all` returns results in, and what it waits for.",
        },
        explanation: "`Promise.all` resolves when the **slowest** input does (300 ms), with results in the **input order**, whichever finished first.",
      },
      {
        kind: "code",
        title: "The bakery line",
        body:
          "Three stations bake bread: `mix`, then `bake`, then `box`. Write `createBakery()`, which returns an object with three methods. Each takes a function `fn` (sync or async) and returns a promise that resolves once `fn` has finished.\n\n" +
          "- `mix(fn)` runs `fn` straight away.\n- `bake(fn)` must not start `fn` until mix's `fn` has **finished**.\n- `box(fn)` must not start `fn` until bake's `fn` has finished.\n\n" +
          "The methods can be called in **any order**, each once. Hint: a promise you resolve by hand makes a good \"done\" signal:\n\n" +
          js(`
let markDone;
const done = new Promise((resolve) => (markDone = resolve));
// later: markDone(); anyone awaiting done continues
`),
        language: "javascript",
        starter: `function createBakery() {
  return {
    async mix(fn) {
      // run fn
    },
    async bake(fn) {
      // wait until mix's fn has finished, then run fn
    },
    async box(fn) {
      // wait until bake's fn has finished, then run fn
    },
  };
}
`,
        solution: `function createBakery() {
  let mixed, baked;
  const mixDone = new Promise((resolve) => (mixed = resolve));
  const bakeDone = new Promise((resolve) => (baked = resolve));
  return {
    async mix(fn) {
      await fn();
      mixed();
    },
    async bake(fn) {
      await mixDone;
      await fn();
      baked();
    },
    async box(fn) {
      await bakeDone;
      await fn();
    },
  };
}
`,
        tests: [
          {
            id: "t1",
            description: "called backwards, still runs in order",
            assertionCode:
              'const log = [];\nconst b = createBakery();\nawait Promise.all([b.box(() => log.push("box")), b.bake(() => log.push("bake")), b.mix(() => log.push("mix"))]);\nassertEqual(log, ["mix", "bake", "box"], "The stations run mix, bake, box whatever order they were called in");',
          },
          {
            id: "t2",
            description: "waits for slow steps to finish",
            assertionCode:
              SLEEP +
              'const log = [];\nconst b = createBakery();\nconst t0 = sim.now();\nlet boxedAt = -1;\nawait Promise.all([\n  b.bake(async () => { log.push("bake starts"); await sleep(50); log.push("bake ends"); }),\n  b.box(() => { log.push("box"); boxedAt = sim.now() - t0; }),\n  b.mix(async () => { log.push("mix starts"); await sleep(100); log.push("mix ends"); }),\n]);\nassertEqual(log, ["mix starts", "mix ends", "bake starts", "bake ends", "box"], "Each station waits for the previous one to FINISH, not just to start");\nassertEqual(boxedAt, 150, "Boxing happens after 100 ms of mixing and 50 ms of baking");',
          },
          {
            id: "t3",
            description: "nothing runs before mix",
            assertionCode:
              'const log = [];\nconst b = createBakery();\nconst later = Promise.all([b.bake(() => log.push("bake")), b.box(() => log.push("box"))]);\nawait sim.tick(1000);\nassertEqual(log, [], "bake and box must keep waiting while nobody has mixed");\nawait b.mix(() => log.push("mix"));\nawait later;\nassertEqual(log, ["mix", "bake", "box"], "Once mix runs, the others follow in order");',
          },
        ],
        hints: ["Make two promises in `createBakery`, one for \"mixing is done\" and one for \"baking is done\", and keep their resolve functions.", "`bake` awaits the first promise, awaits its own `fn`, then resolves the second."],
      },
      {
        kind: "recap",
        points: [
          "The event loop runs the current code to the end, then **every** microtask, then **one** task such as a timer.",
          "Promise callbacks and the code after an `await` are microtasks; `setTimeout(fn, 0)` is a task and runs later.",
          "An async function runs synchronously until its first `await`.",
          "`Promise.all` resolves when the slowest input does, with results in input order.",
          "To make B wait for A, have B await a promise that A resolves (an *event*; `threading.Event`, `CountDownLatch` or a closed channel elsewhere).",
        ],
      },
    ],
  },

  // ─────────────────────────────── 3. Taking turns ───────────────────────────────
  {
    id: "fnd-iv-concurrency-3-turns",
    title: "Taking turns",
    summary: "Make workers strictly alternate by handing a turn from one to the next.",
    minutes: 10,
    xp: 70,
    level: "Intermediate",
    steps: [
      {
        kind: "explain",
        title: "Pass the baton",
        body:
          "Some problems need workers to **alternate** exactly: *ping, pong, ping, pong*, or three printers that go red, green, blue, red… Each worker runs its own loop, at its own speed, yet the output must come out in turn.\n\n" +
          "Think of a relay baton. Only the worker holding it may act. When it is done, it hands the baton to the next worker and waits to get it back. In JavaScript, a worker that is not on turn **awaits a promise**, and the worker that passes the turn **resolves** it:\n\n" +
          js(`
let turn = "ping";
const waiting = {};             // name -> resolve function

function myTurn(name) {
  if (turn === name) return Promise.resolve();
  return new Promise((resolve) => (waiting[name] = resolve));
}

function pass(next) {
  turn = next;
  waiting[next]?.();            // wake the next worker if it is waiting
  delete waiting[next];
}
`) +
          "\nWith threads the same idea uses two semaphores (one starts at 1, one at 0) or a condition variable with a `turn` field: Python `threading.Semaphore` or `Condition`, Java `Semaphore` or `wait`/`notifyAll`, Go two unbuffered channels that hand a token back and forth.\n\n" +
          "**How to spot it:** *alternate*, *in turn*, *strictly A then B*, *print in order from several workers*.",
      },
      {
        kind: "question",
        title: "Who holds the baton?",
        body: "Three workers R, G and B take turns in that order. R's job takes 30 ms, G's 10 ms and B's 20 ms. Step through and tap whoever acts next.",
        widget: {
          type: "iv-trace",
          props: {
            title: "Turns go R → G → B → R",
            frames: [
              { graph: { ...RELAY, active: ["R"] }, vars: { time: 0, turn: "R" }, array: ["R", null, null, null], note: "R holds the first turn and starts its 30 ms job. G and B are waiting on their promises." },
              { graph: { active: ["R"] }, vars: { time: 30, turn: "R" }, note: "R finishes at 30 ms and passes the turn.", pick: { prompt: "Who acts next?", answer: "G" } },
              { graph: { active: ["G"], done: ["R"], activeEdges: [["R", "G"]] }, vars: { time: 30, turn: "G" }, array: ["R", "G", null, null], note: "G wakes up and runs its 10 ms job." },
              { graph: { active: ["G"], done: ["R"] }, vars: { time: 40, turn: "G" }, note: "G is done at 40 ms. R is quick to get back in line, but it is not R's turn.", pick: { prompt: "Who acts next?", answer: "B" } },
              { graph: { active: ["B"], done: ["R", "G"], activeEdges: [["G", "B"]] }, vars: { time: 40, turn: "B" }, array: ["R", "G", "B", null], note: "B runs from 40 to 60 ms while R waits." },
              { graph: { active: ["B"] }, vars: { time: 60, turn: "B" }, note: "B passes the turn on.", pick: { prompt: "Who acts next?", answer: "R" } },
              { graph: { active: ["R"], activeEdges: [["B", "R"]] }, vars: { time: 60, turn: "R" }, array: ["R", "G", "B", "R"], note: "Back to R: one full round took 30 + 10 + 20 = **60 ms**. Turns add up; the workers never overlap." },
            ],
          },
        },
        question: { type: "widget", goal: { picked: true }, prompt: "Answer the three picks.", hint: "The turn order is fixed: R, then G, then B, then R again." },
        explanation: "Whoever is ready first does not matter. The turn moves along a fixed cycle, and each worker waits for it, so the output order is exact and the round time is the sum of the jobs.",
      },
      {
        kind: "question",
        title: "How long does it take?",
        body: "Worker A's job takes 10 ms and worker B's takes 100 ms. They strictly alternate A, B, A, B… for 3 rounds each. Find the total time in ms.",
        question: { type: "number", answer: 330, unit: "ms", hint: "Only one worker acts at a time, so the jobs never overlap." },
        explanation: "Strict turns mean no overlap: each round is 10 + 100 = 110 ms, and 3 rounds take **330 ms**. Alternation trades speed for order.",
      },
      {
        kind: "question",
        title: "Why not just loop?",
        body: "Someone writes the wait as a busy loop: `while (turn !== \"B\") {}`. What happens in JavaScript?",
        question: {
          type: "choice",
          options: [
            "The loop never yields, so no other code runs to change `turn`.",
            "It works, but uses more CPU than a promise would.",
            "It works only if the loop has a `try`/`catch` around it.",
            "It throws an error the first time `turn` is wrong.",
          ],
          answer: 0,
          feedback: {
            1: "On threads a spin loop burns CPU but can work. JavaScript has one thread, so the loop blocks the very code that would change `turn`.",
            2: "Error handling does not change the problem: the loop never gives the thread away.",
            3: "Nothing throws. The loop just runs forever.",
          },
          hint: "On one thread, who could change `turn` while the loop is spinning?",
        },
        explanation: "A synchronous loop never reaches an `await`, so the event loop never gets the thread back and the other worker never runs. The page freezes. Waiting must be done by awaiting a promise.",
      },
      {
        kind: "code",
        title: "A turn keeper",
        body:
          "Write `createTurns(order)`. `order` is a list of worker names, such as `[\"red\", \"green\", \"blue\"]`. It returns an object with:\n\n" +
          "- `myTurn(name)`: a promise that resolves once it is `name`'s turn (right away if it already is). The first turn belongs to `order[0]`.\n" +
          "- `done()`: the current worker is finished; the turn moves to the next name in `order`, going back to the start after the last.\n\n" +
          "Each worker waits for at most one turn at a time. The checks run loops like this:\n\n" +
          js(`
async function worker(name, rounds, ms) {
  for (let i = 0; i < rounds; i++) {
    await turns.myTurn(name);
    log.push(name);
    await sleep(ms);   // the job
    turns.done();
  }
}
`),
        language: "javascript",
        starter: `function createTurns(order) {
  return {
    myTurn(name) {
      // resolve when it is name's turn
      return Promise.resolve();
    },
    done() {
      // move the turn to the next name in order, and wake that worker if it is waiting
    },
  };
}
`,
        solution: `function createTurns(order) {
  let index = 0;
  const waiting = new Map(); // name -> resolve

  function wakeCurrent() {
    const name = order[index];
    const resolve = waiting.get(name);
    if (resolve) {
      waiting.delete(name);
      resolve();
    }
  }

  return {
    myTurn(name) {
      return new Promise((resolve) => {
        waiting.set(name, resolve);
        wakeCurrent();
      });
    },
    done() {
      index = (index + 1) % order.length;
      wakeCurrent();
    },
  };
}
`,
        tests: [
          {
            id: "t1",
            description: "two workers alternate",
            assertionCode:
              SLEEP +
              'const log = [];\nconst turns = createTurns(["tick", "tock"]);\nasync function worker(name, rounds, ms) {\n  for (let i = 0; i < rounds; i++) { await turns.myTurn(name); log.push(name); await sleep(ms); turns.done(); }\n}\nawait Promise.all([worker("tock", 3, 10), worker("tick", 3, 50)]);\nassertEqual(log, ["tick", "tock", "tick", "tock", "tick", "tock"], "tick has the first turn, then they alternate, even though tock is started first and is faster");',
          },
          {
            id: "t2",
            description: "three workers, exact timing",
            assertionCode:
              SLEEP +
              'const log = [];\nconst turns = createTurns(["red", "green", "blue"]);\nasync function worker(name, rounds, ms) {\n  for (let i = 0; i < rounds; i++) { await turns.myTurn(name); log.push(name + "@" + (sim.now() - t0)); await sleep(ms); turns.done(); }\n}\nconst t0 = sim.now();\nawait Promise.all([worker("blue", 2, 20), worker("green", 2, 10), worker("red", 2, 30)]);\nassertEqual(log, ["red@0", "green@30", "blue@40", "red@60", "green@90", "blue@100"], "Each worker starts the moment the previous one passes the turn");\nassertEqual(sim.now() - t0, 120, "Two rounds of 30 + 10 + 20 ms take 120 ms");',
          },
          {
            id: "t3",
            description: "waits for a latecomer whose turn it is",
            assertionCode:
              SLEEP +
              'const log = [];\nconst turns = createTurns(["a", "b"]);\nasync function worker(name, rounds) {\n  for (let i = 0; i < rounds; i++) { await turns.myTurn(name); log.push(name + "@" + (sim.now() - t0)); turns.done(); }\n}\nconst t0 = sim.now();\nconst early = worker("b", 2);\nawait sleep(100);\nassertEqual(log, [], "b must wait: the first turn is a\'s, and a has not arrived yet");\nawait Promise.all([early, worker("a", 2)]);\nassertEqual(log, ["a@100", "b@100", "a@100", "b@100"], "Once a arrives they alternate a, b, a, b");',
          },
        ],
        hints: ["Keep the index of whose turn it is, and a Map from a waiting worker's name to its resolve function.", "Both `myTurn` and `done` end the same way: if the worker whose turn it now is is waiting, resolve it."],
      },
      {
        kind: "recap",
        points: [
          "Strict alternation is a baton: only the worker on turn acts, then it hands the turn to the next one.",
          "In JavaScript a waiting worker awaits a promise; passing the turn resolves the next worker's promise.",
          "Never busy-wait in JavaScript: a synchronous loop blocks the only thread, so the turn can never change.",
          "With threads use two semaphores or a condition variable with a `turn` field; in Go, hand a token over unbuffered channels.",
          "Turns never overlap, so the time is the sum of every job.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 4. Locks ───────────────────────────────
  {
    id: "fnd-iv-concurrency-4-mutex",
    title: "Locks and mutexes",
    summary: "One task at a time in a critical section, a fair queue of waiters, and always unlocking in finally.",
    minutes: 12,
    xp: 70,
    level: "Intermediate",
    steps: [
      {
        kind: "explain",
        title: "One at a time",
        body:
          "Sometimes the gap between read and write cannot be removed: you read a file, `await` a network call, then write the file. The code from the read to the write is a **critical section**, and only one task may be inside it at once.\n\n" +
          "A **mutex** (mutual exclusion lock) guards it. `lock()` lets you in if the lock is free; otherwise you wait in a **queue**. `unlock()` lets the next waiter in. Always unlock in `finally`, so an error cannot leave the lock held forever:\n\n" +
          js(`
await mutex.lock();
try {
  const doc = await load();
  doc.count++;
  await save(doc);
} finally {
  mutex.unlock();
}
`) +
          "\nA first-come, first-served queue makes the lock **fair**: nobody waits forever while others keep cutting in.\n\n" +
          "Other languages: Python `threading.Lock` (`with lock:`) and `asyncio.Lock` (`async with lock:`), Java `synchronized` or `ReentrantLock` with `try`/`finally`, Go `sync.Mutex` with `defer mu.Unlock()`. A mutex like ours is **not reentrant**: if the holder calls `lock()` again it waits for itself forever.\n\n" +
          "**How to spot it:** a shared resource (file, account, cache entry) and an `await` that has to sit between the read and the write. Keep the section short; everything inside it runs one task at a time.",
      },
      {
        kind: "question",
        title: "Who gets the lock?",
        body: "Three tasks A, B and C share the mutex M. Step through and tap the task that holds M next.",
        widget: {
          type: "iv-trace",
          props: {
            lang: "javascript",
            title: "A mutex with a waiting queue",
            frames: [
              { graph: { ...LOCK, active: ["A"], activeEdges: [["A", "M"]] }, code: RUN_CODE, line: 2, stacks: [{ label: "waiting for M", items: [], kind: "queue" }], vars: { locked: true, holder: "A" }, note: "A calls `lock()`. M is free, so A goes straight in." },
              { graph: { active: ["A"], activeEdges: [["A", "M"]] }, line: 2, stacks: [{ label: "waiting for M", items: ["C"], kind: "queue" }], note: "C calls `lock()`. M is held, so C joins the queue." },
              { graph: { active: ["A"], activeEdges: [["A", "M"]] }, line: 2, stacks: [{ label: "waiting for M", items: ["C", "B"], kind: "queue" }], note: "B calls `lock()` a moment later and queues behind C." },
              { graph: { done: ["A"] }, line: 6, vars: { locked: true, holder: "-" }, note: "A finishes and calls `unlock()`.", pick: { prompt: "Who holds M next?", answer: "C" } },
              { graph: { active: ["C"], done: ["A"], activeEdges: [["C", "M"]] }, line: 4, stacks: [{ label: "waiting for M", items: ["B"], kind: "queue" }], vars: { locked: true, holder: "C" }, note: "C was first in the queue. `unlock()` hands M straight to it, so M never looks free in between." },
              { graph: { active: ["C"], done: ["A"], activeEdges: [["C", "M"]] }, line: 4, note: "C's `fn` throws an error!" },
              { graph: { done: ["A", "C"] }, line: 6, note: "The error passes through `finally`, which still runs `unlock()`.", pick: { prompt: "Who holds M next?", answer: "B" } },
              { graph: { active: ["B"], done: ["A", "C"], activeEdges: [["B", "M"]] }, line: 4, stacks: [{ label: "waiting for M", items: [], kind: "queue" }], vars: { locked: true, holder: "B" }, note: "B gets M. Without `finally`, C's error would have left M locked and B waiting forever." },
            ],
          },
        },
        question: { type: "widget", goal: { picked: true }, prompt: "Answer both picks.", hint: "The queue is first come, first served, and `finally` always runs." },
        explanation: "Waiters get the lock in the order they asked for it. Handing the lock straight to the next waiter (instead of marking it free) stops a newcomer from jumping the queue, and `finally` guarantees the release.",
      },
      {
        kind: "question",
        title: "A lock makes a queue",
        body: "Three tasks start at 0 ms. Each first does 50 ms of work **outside** the lock, then holds the lock for 100 ms. Find the time in ms when the last one finishes.",
        question: { type: "number", answer: 350, unit: "ms", hint: "The outside work overlaps; the locked parts happen one after another." },
        explanation: "All three reach the lock at 50 ms. Then they go one at a time: 50–150, 150–250, 250–**350 ms**. That is why critical sections should be as short as possible.",
      },
      {
        kind: "question",
        title: "Forgetting finally",
        body: "A task runs `await m.lock(); await risky(); m.unlock();` and `risky()` throws. What happens to the other tasks waiting for `m`?",
        question: {
          type: "choice",
          options: [
            "The lock frees itself when the error is thrown.",
            "The next waiter gets the lock after a short timeout.",
            "Only the task that threw gets stuck; the others go on.",
            "They wait forever: `unlock()` never runs.",
          ],
          answer: 3,
          feedback: {
            0: "A lock is just data; nothing unlocks it except a call to `unlock()`.",
            1: "There is no timeout unless you build one.",
            2: "The task that threw is finished; it is the waiters behind it that hang.",
          },
          hint: "What line is skipped when `risky()` throws?",
        },
        explanation: "The error jumps past `m.unlock()`, so the lock stays held and everyone in the queue waits forever. Put the unlock in `finally` (or Python's `with`, Go's `defer`).",
      },
      {
        kind: "code",
        title: "Build a mutex",
        body:
          "Write a `Mutex` class:\n\n" +
          "- `lock()` returns a promise: it resolves now if the lock is free, otherwise once it is this caller's turn (first come, first served).\n" +
          "- `unlock()` lets the next waiter in, or marks the lock free if nobody waits.\n" +
          "- `run(fn)` locks, awaits `fn()`, unlocks **even if `fn` throws**, and returns (or rethrows) what `fn` gave.",
        language: "javascript",
        starter: `class Mutex {
  constructor() {
    // your fields here
  }

  lock() {
    // resolve now if free, otherwise wait your turn
    return Promise.resolve();
  }

  unlock() {
    // let the next waiter in, or mark the lock free
  }

  async run(fn) {
    // lock, run fn, always unlock, return fn's result
    return fn();
  }
}
`,
        solution: `class Mutex {
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
    if (next) next(); // hand the lock straight over: it stays locked
    else this.locked = false;
  }

  async run(fn) {
    await this.lock();
    try {
      return await fn();
    } finally {
      this.unlock();
    }
  }
}
`,
        tests: [
          {
            id: "t1",
            description: "no lost updates",
            assertionCode:
              SLEEP +
              'const m = new Mutex();\nlet count = 0;\nconst bump = () => m.run(async () => { const c = count; await sleep(10); count = c + 1; });\nawait Promise.all([bump(), bump(), bump(), bump(), bump()]);\nassertEqual(count, 5, "Five increments inside the lock give 5; a smaller number means two tasks were inside at once");',
          },
          {
            id: "t2",
            description: "first come, first served, one at a time",
            assertionCode:
              SLEEP +
              'const m = new Mutex();\nconst log = [];\nconst t0 = sim.now();\nconst job = (name, ms) => m.run(async () => { await sleep(ms); log.push(name + "@" + (sim.now() - t0)); return name; });\nconst out = await Promise.all([job("A", 50), job("B", 10), job("C", 30), job("D", 5)]);\nassertEqual(log, ["A@50", "B@60", "C@90", "D@95"], "Tasks hold the lock one after another, in the order they asked");\nassertEqual(out, ["A", "B", "C", "D"], "run(fn) returns what fn returned");',
          },
          {
            id: "t3",
            description: "an error still releases the lock",
            assertionCode:
              SLEEP +
              'const m = new Mutex();\nconst t0 = sim.now();\nconst bad = m.run(async () => { await sleep(10); throw new Error("boom"); });\nlet startedAt = -1;\nconst good = m.run(async () => { startedAt = sim.now() - t0; return "ok"; });\nawait assertRejects(bad, "boom", "run(fn) passes fn\'s error on");\nassertEqual(await good, "ok", "The next task still gets the lock after an error");\nassertEqual(startedAt, 10, "The second task waits for the first to finish (10 ms), even though the first one failed");',
          },
          {
            id: "t4",
            description: "lock() waits while the lock is held",
            assertionCode:
              'const m = new Mutex();\nawait m.lock();\nlet got = false;\nm.lock().then(() => { got = true; });\nawait sim.tick(100);\nassert(!got, "A second lock() must wait while the first holder has not unlocked");\nm.unlock();\nawait sim.flush();\nassert(got, "unlock() lets the waiting caller in");',
          },
        ],
        hints: ["Keep a `locked` flag and an array of resolve functions for the waiters.", "In `unlock`, if someone waits, resolve the first one and leave `locked` true; it now belongs to them."],
      },
      {
        kind: "recap",
        points: [
          "A **critical section** is code that touches shared state across an `await`; a **mutex** lets one task in at a time.",
          "Waiters queue first come, first served; `unlock()` hands the lock straight to the next one.",
          "Always unlock in `finally` (`with` in Python, `defer` in Go), or one error freezes everyone behind it.",
          "Locked sections run one after another, so keep them short.",
          "A simple mutex is not reentrant: locking it again from inside waits forever.",
        ],
      },
    ],
  },
];
