import type { ConceptLesson } from "../../learn/types.ts";

/** Fenced JavaScript block for lesson prose. */
const js = (code: string) => "~~~js\n" + code.trim() + "\n~~~";

// check helpers: a promise that resolves (or rejects) with v after ms of virtual time
const DELAYS = 'const after = (ms, v) => new Promise((r) => setTimeout(() => r(v), ms));\nconst failAfter = (ms, msg) => new Promise((_, rej) => setTimeout(() => rej(new Error(msg)), ms));\n';

// ── trace data ──
const COMPOSE_CODE = ["const slug = pipe(trim, lower, dashes)", 'slug("  Hello World ")', "", "const slug2 = compose(trim, lower, dashes)"];

const EQ_TREE = [
  { id: "r", label: "{ }" },
  { id: "user", label: "user", parent: "r" },
  { id: "n", label: "n", parent: "r" },
  { id: "name", label: "name", parent: "user" },
  { id: "tags", label: "tags", parent: "user" },
  { id: "t0", label: "[0]", parent: "tags" },
  { id: "t1", label: "[1]", parent: "tags" },
];
const EQ_CODE = ["deepEqual(a, b):", "    if a is not an object: return same(a, b)", "    if key lists differ: return false", "    for each key k:", "        if not deepEqual(a[k], b[k]): return false", "    return true"];

const FLAT_TREE = [
  { id: "r", label: "[ ]" },
  { id: "x1", label: "1", parent: "r" },
  { id: "b", label: "[ ]", parent: "r" },
  { id: "x5", label: "5", parent: "r" },
  { id: "x2", label: "2", parent: "b" },
  { id: "d", label: "[ ]", parent: "b" },
  { id: "x3", label: "3", parent: "d" },
  { id: "e", label: "[ ]", parent: "d" },
  { id: "x4", label: "4", parent: "e" },
];

export const javascriptLessonsB: ConceptLesson[] = [
  // ─────────────────────────────── 6. Promise combinators ───────────────────────────────
  {
    id: "fnd-iv-javascript-6-promises",
    title: "Promise.all, race and allSettled from scratch",
    summary: "How the promise combinators decide when to settle, and building them and a timeout yourself.",
    minutes: 14,
    xp: 90,
    level: "Advanced",
    steps: [
      {
        kind: "explain",
        title: "Four ways to wait for many",
        body:
          "Given several promises started together, the combinators differ in **when** they settle and **with what**:\n\n" +
          "| combinator | fulfils | rejects |\n|---|---|---|\n" +
          "| `Promise.all` | when **all** fulfil, with the values in input order | as soon as **one** rejects |\n" +
          "| `Promise.race` | with the **first** to settle, if it fulfilled | with the first to settle, if it rejected |\n" +
          "| `Promise.allSettled` | when all have settled, with `{ status, value }` or `{ status, reason }` each | never |\n" +
          "| `Promise.any` | with the **first** to fulfil | only if all reject, with an `AggregateError` |\n\n" +
          "Writing one yourself follows the same plan: return a `new Promise`; wrap every input with `Promise.resolve(x)` so plain values work; attach `.then` to each; store results **by index**; count how many are done.\n\n" +
          js(`
function withTimeout(promise, ms) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error("timeout")), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}
`) +
          "\nA timeout is a race against a timer, and the timer must be **cleared** when the real promise wins, or it keeps the process busy. Note that a timeout does not stop the slow work; it only stops you waiting for it (use an `AbortController` to cancel a `fetch`).\n\n" +
          "Elsewhere: Python `asyncio.gather` (like `all`), `asyncio.wait_for` (a timeout) and `asyncio.wait(..., return_when=FIRST_COMPLETED)`; Java `CompletableFuture.allOf` / `anyOf` and `orTimeout`; Go `errgroup` and `select` with `time.After`.\n\n" +
          "**How to spot it:** *implement Promise.all*, *wait for all requests*, *first response wins*, *fail if it takes longer than N ms*, *collect successes and failures*.",
      },
      {
        kind: "question",
        title: "Who decides?",
        body: "Three promises start at 0 ms: p0 fulfils with \"a\" at 300 ms, p1 rejects with \"x\" at 200 ms, p2 fulfils with \"c\" at 100 ms. Step through and tap the promise that decides each combinator.",
        widget: {
          type: "iv-trace",
          props: {
            title: "Settling over time",
            frames: [
              { array: ["p0", "p1", "p2"], vars: { time: 0, p0: "pending", p1: "pending", p2: "pending" }, note: "All three are pending." },
              { done: [2], vars: { time: 100, p0: "pending", p1: "pending", p2: "fulfilled c" }, note: "At 100 ms, p2 fulfils with \"c\".", pick: { prompt: "Which input decides `Promise.race`?", answer: 2 } },
              { done: [2], highlight: [2], note: "`race` takes the first to settle: it fulfils with **\"c\"** at 100 ms. `any` also gives \"c\": the first to *fulfil*." },
              { done: [1, 2], vars: { time: 200, p0: "pending", p1: "rejected x", p2: "fulfilled c" }, note: "At 200 ms, p1 rejects.", pick: { prompt: "Which input makes `Promise.all` settle?", answer: 1 } },
              { done: [1, 2], highlight: [1], note: "`all` rejects with **x** at 200 ms, without waiting for p0. p0 keeps running; nobody waits for it any more." },
              { done: [1, 2], vars: { time: 200, p0: "pending", p1: "rejected x", p2: "fulfilled c" }, note: "`allSettled` never rejects. It needs every outcome.", pick: { prompt: "Tap the input whose settling finishes `allSettled`.", answer: 0 } },
              { done: [0, 1, 2], highlight: [0], vars: { time: 300, p0: "fulfilled a", p1: "rejected x", p2: "fulfilled c" }, note: "At 300 ms `allSettled` fulfils with `[{fulfilled, a}, {rejected, x}, {fulfilled, c}]`, in input order." },
            ],
          },
        },
        question: { type: "widget", goal: { picked: true }, prompt: "Answer all three picks.", hint: "race: first to settle. all: everything fulfils, or the first rejection. allSettled: the last to settle." },
        explanation: "Each combinator watches the same inputs but stops at a different moment: `race` at the first settle, `all` at the first rejection (or the last fulfil), `allSettled` at the last settle.",
      },
      {
        kind: "question",
        title: "Everyone fails",
        body: "All the promises passed to `Promise.any` reject. What happens?",
        question: {
          type: "choice",
          options: ["It fulfils with undefined.", "It rejects with an AggregateError.", "It rejects with the first reason.", "It stays pending forever and never settles."],
          answer: 1,
          feedback: {
            0: "`any` only fulfils with a value that one of the inputs actually fulfilled with.",
            2: "That is what `race` or `all` would do with an early rejection; `any` waits for all of them.",
            3: "It settles once every input has settled.",
          },
          hint: "`any` is looking for one success. What can it report once there is no chance of one?",
        },
        explanation: "`Promise.any` keeps waiting while a success is still possible. When the last input rejects, it rejects with an **AggregateError** whose `errors` array lists every reason.",
      },
      {
        kind: "question",
        title: "When does it reject?",
        body: "`Promise.all([sleep(100), sleep(250), failAfter(50)])`, where `failAfter(50)` rejects after 50 ms. Find the time in ms when the `all` promise rejects.",
        question: { type: "number", answer: 50, unit: "ms", hint: "`all` does not wait for the others once something fails." },
        explanation: "`Promise.all` rejects as soon as any input rejects: at **50 ms**. The two sleeps still finish later, but their results are ignored.",
      },
      {
        kind: "code",
        title: "Promise.all from scratch",
        body:
          "Write `promiseAll(items)` without using `Promise.all`, `allSettled`, `any` or `race`. `items` is an array of promises **or plain values**. Return a promise that:\n\n" +
          "- fulfils with all the values **in input order**, once every item has fulfilled;\n- rejects as soon as **any** item rejects, with that reason;\n- fulfils with `[]` right away for an empty array.",
        language: "javascript",
        starter: `function promiseAll(items) {
  return new Promise((resolve, reject) => {
    // your code here
    resolve([]);
  });
}
`,
        solution: `function promiseAll(items) {
  return new Promise((resolve, reject) => {
    const results = new Array(items.length);
    let left = items.length;
    if (left === 0) return resolve(results);
    items.forEach((item, i) => {
      Promise.resolve(item).then((value) => {
        results[i] = value;
        left--;
        if (left === 0) resolve(results);
      }, reject);
    });
  });
}
`,
        tests: [
          {
            id: "t1",
            description: "values in input order",
            assertionCode: DELAYS + 'const t0 = sim.now();\nconst out = await promiseAll([after(300, "a"), "b", after(100, "c")]);\nassertEqual(out, ["a", "b", "c"], "Results follow the input order; plain values pass straight through");\nassertEqual(sim.now() - t0, 300, "It waits for the slowest item, 300 ms");',
          },
          {
            id: "t2",
            description: "rejects at the first failure",
            assertionCode: DELAYS + 'const t0 = sim.now();\nawait assertRejects(promiseAll([after(300, "a"), failAfter(50, "card declined"), after(100, "c")]), "card declined", "promiseAll should reject with the failing item\'s reason");\nassertEqual(sim.now() - t0, 50, "Reject at 50 ms, as soon as the failure happens");',
          },
          {
            id: "t3",
            description: "empty and plain inputs",
            assertionCode:
              'assertEqual(await promiseAll([]), [], "An empty list fulfils with []");\nassertEqual(await promiseAll([42, "x", null]), [42, "x", null], "Plain values are treated as already fulfilled");\nassert(!/Promise\\.(all|allSettled|any|race)\\b/.test(String(promiseAll)), "Build it from .then instead of calling Promise.all or friends");',
          },
        ],
        hints: ["Keep a `results` array and a counter of items still to finish; wrap each item with `Promise.resolve(item)`.", "In each `.then`, store the value at its index; when the counter reaches 0, resolve. Pass `reject` as the error handler."],
      },
      {
        kind: "code",
        title: "allSettled and a timeout",
        body:
          "Write two functions.\n\n" +
          "`allSettled(items)` (without `Promise.allSettled`): fulfils once every item has settled, with one object per item, in input order: `{ status: \"fulfilled\", value }` or `{ status: \"rejected\", reason }`. It never rejects.\n\n" +
          "`withTimeout(promise, ms)`: settles like `promise` if that happens within `ms`; otherwise rejects at exactly `ms` with `new Error(\"timeout\")`. Clear your timer once `promise` settles first.",
        language: "javascript",
        starter: `async function allSettled(items) {
  // your code here
  return [];
}

async function withTimeout(promise, ms) {
  // your code here
}
`,
        solution: `function allSettled(items) {
  return Promise.all(
    items.map((item) =>
      Promise.resolve(item).then(
        (value) => ({ status: "fulfilled", value }),
        (reason) => ({ status: "rejected", reason }),
      ),
    ),
  );
}

function withTimeout(promise, ms) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error("timeout")), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}
`,
        tests: [
          {
            id: "t1",
            description: "allSettled reports every outcome",
            assertionCode:
              DELAYS +
              'const t0 = sim.now();\nconst out = await allSettled([after(300, "a"), failAfter(200, "x"), "c"]);\nassertEqual(out.map((r) => r.status), ["fulfilled", "rejected", "fulfilled"], "One result per item, in input order");\nassertEqual([out[0].value, out[1].reason && out[1].reason.message, out[2].value], ["a", "x", "c"], "Fulfilled results carry value, rejected ones carry reason");\nassertEqual(sim.now() - t0, 300, "It waits for the last item to settle");',
          },
          {
            id: "t2",
            description: "withTimeout lets a fast promise through",
            assertionCode: DELAYS + 'const t0 = sim.now();\nassertEqual(await withTimeout(after(100, "fast"), 200), "fast", "A promise that wins the race gives its own value");\nassertEqual(sim.now() - t0, 100, "...as soon as it is ready");\nassertEqual(sim.pending(), 0, "The timeout timer should be cleared once the promise has won");',
          },
          {
            id: "t3",
            description: "withTimeout rejects a slow promise on time",
            assertionCode: DELAYS + 'const t0 = sim.now();\nawait assertRejects(withTimeout(after(1000, "slow"), 200), "timeout", "A promise slower than ms should reject with Error(\\"timeout\\")");\nassertEqual(sim.now() - t0, 200, "Reject at exactly 200 ms");',
          },
          {
            id: "t4",
            description: "withTimeout passes a rejection on",
            assertionCode: DELAYS + 'await assertRejects(withTimeout(failAfter(50, "not found"), 200), "not found", "A rejection that comes before the timeout keeps its own reason");\nassertEqual(sim.pending(), 0, "and the timer is cleared");',
          },
        ],
        hints: ["For `allSettled`, turn each item into a promise that always fulfils, using both arguments of `.then`.", "For `withTimeout`, race the promise against a timer promise and clear the timer in `.finally`."],
      },
      {
        kind: "recap",
        points: [
          "`all`: every value in input order, or the first rejection. `race`: the first to settle. `allSettled`: every outcome, never rejects. `any`: the first success, or an `AggregateError`.",
          "To build one: `new Promise`, `Promise.resolve(item)` for each input, results stored by index, a counter of what is left.",
          "A timeout is a race against a timer; clear the timer when the real promise wins.",
          "Timing out a promise does not stop the work behind it; cancel with an `AbortController` when you can.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 7. Event emitter ───────────────────────────────
  {
    id: "fnd-iv-javascript-7-event-emitter",
    title: "Event emitter",
    summary: "on, off, once and emit: a publish/subscribe hub, and the edge cases interviewers probe.",
    minutes: 12,
    xp: 90,
    level: "Advanced",
    steps: [
      {
        kind: "explain",
        title: "Publish and subscribe",
        body:
          "An **event emitter** lets parts of a program talk without knowing each other. Listeners **subscribe** to an event name; whoever **emits** that event calls every listener with the event's data.\n\n" +
          js(`
const bus = new Emitter();
const off = bus.on("saved", (doc) => console.log("saved", doc.id));
bus.once("saved", () => console.log("first save!"));
bus.emit("saved", { id: 7 });   // both listeners run
bus.emit("saved", { id: 8 });   // only the first
off();                            // unsubscribe
`) +
          "\nInside, it is a `Map` from event name to an array of listeners. The details that matter:\n\n" +
          "- Listeners run **in the order they subscribed**, with the arguments passed to `emit`.\n" +
          "- `on` returns an **unsubscribe** function, so callers do not have to keep the listener around. Forgetting to unsubscribe is a classic memory leak.\n" +
          "- `once` wraps the listener so it removes itself before running.\n" +
          "- **Copy** the listener array before looping in `emit`. If a listener unsubscribes during the loop, changing the array you are walking skips the next listener.\n\n" +
          "The same pattern is Node's `EventEmitter`, the DOM's `addEventListener`, the Observer pattern in Java, signals in Python libraries, and channels or callback lists in Go.\n\n" +
          "**How to spot it:** *implement an event emitter*, *pub/sub*, *subscribe and unsubscribe*, *notify listeners*, *on / off / once*.",
      },
      {
        kind: "question",
        title: "Emitting save",
        body: "Three listeners subscribed to `\"save\"` in this order: `log`, `sync`, and `ping`, which was added with `once`. Step through two emits and answer the picks.",
        widget: {
          type: "iv-trace",
          props: {
            title: "Listeners for \"save\"",
            frames: [
              { array: ["log", "sync", "ping"], vars: { emit: 1 }, stacks: [{ label: "copy being called", items: ["log", "sync", "ping"], kind: "queue" }], note: "`emit(\"save\")` copies the listener list, then calls each one in turn." },
              { vars: { emit: 1 }, note: "The order is the order of subscribing.", pick: { prompt: "Which listener runs first?", answer: 0 } },
              { highlight: [0], done: [], stacks: [{ label: "copy being called", items: ["sync", "ping"], kind: "queue" }], note: "`log` runs. Then `sync` runs." },
              { highlight: [2], done: [0, 1], stacks: [{ label: "copy being called", items: ["ping"], kind: "queue" }], note: "`ping` was added with `once`: its wrapper removes it from the real list, then calls it. Because `emit` walks a **copy**, removing it changes nothing in this loop." },
              { array: ["log", "sync"], vars: { emit: 2 }, stacks: [{ label: "copy being called", items: ["log", "sync"], kind: "queue" }], note: "Second `emit(\"save\")`: the list now holds two listeners.", pick: { prompt: "Which listener is now the last to run?", answer: 1 } },
              { done: [0, 1], stacks: [{ label: "copy being called", items: [], kind: "queue" }], note: "`log` and `sync` run; `ping` is gone. Over the two emits, listeners ran **5** times." },
            ],
          },
        },
        question: { type: "widget", goal: { picked: true }, prompt: "Answer both picks.", hint: "Listeners run in subscription order, and a `once` listener is gone after its first run." },
        explanation: "`emit` calls a snapshot of the listeners in subscription order. A `once` listener removes itself on its first call, so later emits never see it.",
      },
      {
        kind: "question",
        title: "Why copy the list?",
        body: "Listener A unsubscribes itself when it runs. `emit` loops over the **live** array by index instead of a copy. What goes wrong?",
        question: {
          type: "choice",
          options: ["A runs twice.", "Nothing: removing during a loop is safe.", "The listener after A is skipped.", "emit throws a TypeError."],
          answer: 2,
          feedback: {
            0: "Removing A shifts the others forwards; nothing makes A run again.",
            1: "Removing element i shifts element i + 1 into slot i, and the loop moves on to i + 1.",
            3: "The loop just reads a shorter array; no error is thrown.",
          },
          hint: "Picture the array after A is removed, and where the loop index goes next.",
        },
        explanation: "Removing A moves the next listener into A's slot; the loop then steps to the following slot and **skips** it. Looping over a copy (`[...listeners]`) avoids that.",
      },
      {
        kind: "question",
        title: "Count the calls",
        body: "Four listeners are subscribed to `\"tick\"`; the first was added with `once`, the other three with `on`. Then `emit(\"tick\")` is called three times. Find how many listener calls happen in total.",
        question: { type: "number", answer: 10, hint: "The once listener runs on the first emit only." },
        explanation: "First emit: 4 calls. Second and third: 3 each. That is 4 + 3 + 3 = **10**.",
      },
      {
        kind: "code",
        title: "Build an emitter",
        body:
          "Write a class `Emitter` with:\n\n" +
          "- `on(event, fn)`: subscribe; returns a function that unsubscribes this listener.\n" +
          "- `off(event, fn)`: unsubscribe `fn` from `event` (do nothing if it is not there).\n" +
          "- `once(event, fn)`: like `on`, but `fn` runs at most once; also returns an unsubscribe function.\n" +
          "- `emit(event, ...args)`: call the event's listeners in subscription order with `args`; return `true` if there were any listeners, else `false`.\n\n" +
          "A listener that unsubscribes (itself or another) during an `emit` must not change which listeners that same `emit` calls.",
        language: "javascript",
        starter: `class Emitter {
  constructor() {
    this.listeners = new Map(); // event name -> array of functions
  }

  on(event, fn) {
    // your code here
    return () => {};
  }

  off(event, fn) {}

  once(event, fn) {
    return () => {};
  }

  emit(event, ...args) {
    return false;
  }
}
`,
        solution: `class Emitter {
  constructor() {
    this.listeners = new Map(); // event name -> array of functions
  }

  on(event, fn) {
    if (!this.listeners.has(event)) this.listeners.set(event, []);
    this.listeners.get(event).push(fn);
    return () => this.off(event, fn);
  }

  off(event, fn) {
    const list = this.listeners.get(event);
    if (!list) return;
    const i = list.indexOf(fn);
    if (i !== -1) list.splice(i, 1);
  }

  once(event, fn) {
    const wrapper = (...args) => {
      this.off(event, wrapper);
      fn(...args);
    };
    return this.on(event, wrapper);
  }

  emit(event, ...args) {
    const list = this.listeners.get(event);
    if (!list || list.length === 0) return false;
    for (const fn of [...list]) fn(...args);
    return true;
  }
}
`,
        tests: [
          {
            id: "t1",
            description: "listeners run in order with the arguments",
            assertionCode:
              'const e = new Emitter();\nconst log = [];\ne.on("save", (id, by) => log.push("log " + id + " " + by));\ne.on("save", (id) => log.push("sync " + id));\nassertEqual(e.emit("save", 7, "ada"), true, "emit returns true when there are listeners");\nassertEqual(log, ["log 7 ada", "sync 7"], "Listeners run in the order they subscribed, with emit\'s arguments");\nassertEqual(e.emit("nothing"), false, "emit returns false for an event with no listeners");',
          },
          {
            id: "t2",
            description: "unsubscribe and off",
            assertionCode:
              'const e = new Emitter();\nconst log = [];\nconst a = () => log.push("a");\nconst b = () => log.push("b");\nconst stopA = e.on("x", a);\ne.on("x", b);\ne.emit("x");\nstopA();\ne.emit("x");\ne.off("x", b);\nassertEqual(e.emit("x"), false, "After both are removed, nobody is listening");\nassertEqual(log, ["a", "b", "b"], "The function returned by on() removes that listener; off() removes another");',
          },
          {
            id: "t3",
            description: "once runs once",
            assertionCode:
              'const e = new Emitter();\nconst log = [];\ne.once("ready", (v) => log.push("first " + v));\ne.on("ready", (v) => log.push("always " + v));\nconst cancel = e.once("ready", () => log.push("never"));\ncancel();\ne.emit("ready", 1);\ne.emit("ready", 2);\nassertEqual(log, ["first 1", "always 1", "always 2"], "A once listener runs on the first emit only; a cancelled once never runs");',
          },
          {
            id: "t4",
            description: "unsubscribing during emit skips nobody",
            assertionCode:
              'const e = new Emitter();\nconst log = [];\nconst stop = e.on("go", () => { log.push("a"); stop(); });\ne.on("go", () => log.push("b"));\ne.on("go", () => log.push("c"));\ne.emit("go");\ne.emit("go");\nassertEqual(log, ["a", "b", "c", "b", "c"], "a removes itself during the first emit; b and c must still run that time");',
          },
        ],
        hints: ["Store an array per event in the Map; `on` pushes and returns `() => this.off(event, fn)`.", "For `once`, subscribe a wrapper that calls `off` on itself before calling `fn`. In `emit`, loop over `[...list]`."],
      },
      {
        kind: "recap",
        points: [
          "An **event emitter** maps event names to listener lists: `on` adds, `off` removes, `emit` calls them in order.",
          "Return an unsubscribe function from `on` and `once`; leaked listeners are a common memory leak.",
          "`once` subscribes a wrapper that removes itself before calling the real listener.",
          "Loop over a **copy** in `emit`, so listeners that unsubscribe during the call do not make others get skipped.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 8. Currying and composition ───────────────────────────────
  {
    id: "fnd-iv-javascript-8-curry-compose",
    title: "Currying and composition",
    summary: "Turn f(a, b, c) into f(a)(b)(c), and chain small functions with pipe and compose.",
    minutes: 12,
    xp: 90,
    level: "Advanced",
    steps: [
      {
        kind: "explain",
        title: "Functions that wait for more",
        body:
          "**Currying** turns a function of several arguments into one that takes them a few at a time. `curry(fn)` keeps collecting arguments until it has `fn.length` of them (the number of declared parameters), then calls `fn`:\n\n" +
          js(`
const price = curry((rate, qty, unit) => rate * qty * unit);
const withVat = price(1.2);        // waits for qty and unit
withVat(3)(10);                     // 36
withVat(2, 5);                      // 12
`) +
          "\nEvery partial call must return a **new** function with its own collected arguments. A shared array is the classic bug: `withVat(3)` would then leak into `withVat(2, 5)`.\n\n" +
          "**Composition** chains small functions into one. `pipe(f, g, h)(x)` is `h(g(f(x)))`: left to right, the order you read. `compose(f, g, h)(x)` is `f(g(h(x)))`: right to left, like maths. Both are a `reduce` over the list of functions.\n\n" +
          "Elsewhere: Python `functools.partial` for fixing arguments; Java `Function.andThen` (pipe order) and `compose`; Go uses closures.\n\n" +
          "**How to spot it:** *implement curry*, *partial application*, *pipe / compose*, *build a function from steps*, *point-free*.",
      },
      {
        kind: "question",
        title: "Which runs first?",
        body: "`trim` removes outer spaces, `lower` lower-cases, `dashes` turns spaces into dashes. Step through `pipe` and `compose` and answer the picks.",
        widget: {
          type: "iv-trace",
          props: {
            title: "pipe and compose",
            frames: [
              { array: ["trim", "lower", "dashes"], code: COMPOSE_CODE, line: 1, vars: { value: '"  Hello World "' }, note: "`pipe` lists the steps in the order they run." },
              { line: 2, note: "Call `slug(\"  Hello World \")`.", pick: { prompt: "Which function runs first?", answer: 0 } },
              { line: 2, highlight: [0], vars: { value: '"Hello World"' }, note: "`trim` runs first." },
              { line: 2, highlight: [1], done: [0], vars: { value: '"hello world"' }, note: "Then `lower`." },
              { line: 2, highlight: [2], done: [0, 1], vars: { value: '"hello-world"' }, note: "Then `dashes`: **\"hello-world\"**." },
              { line: 4, vars: { value: '"  Hello World "' }, note: "`compose` reads like maths: `compose(f, g, h)(x)` is `f(g(h(x)))`.", pick: { prompt: "With `compose(trim, lower, dashes)`, which function runs first?", answer: 2 } },
              { line: 4, highlight: [2], vars: { value: '"--hello-world-"' }, note: "`dashes` runs first and turns the outer spaces into dashes, so `lower` and then `trim` find no spaces left to remove: **\"--hello-world-\"**. Same functions, other order, other result." },
            ],
          },
        },
        question: { type: "widget", goal: { picked: true }, prompt: "Answer both picks.", hint: "pipe goes left to right; compose goes right to left." },
        explanation: "`pipe` applies the functions in the order written; `compose` applies the last one first. When the steps do not commute (trim before dashes or not) the order changes the answer.",
      },
      {
        kind: "question",
        title: "Partial calls",
        body: "`const add = curry((a, b, c) => a + b + c);` Which call does **not** give 6?",
        question: {
          type: "choice",
          options: ["add(1)(2)(3)", "add(1, 2)(3)", "add(1)(2, 3)", "add(1)(2)"],
          answer: 3,
          feedback: {
            0: "Three arguments, one at a time: 1 + 2 + 3 = 6.",
            1: "Two, then one: all three arrive, so it adds up to 6.",
            2: "One, then two: still three in total, so 6.",
          },
          hint: "`curry` calls the function only when it has collected `fn.length` arguments.",
        },
        explanation: "`add(1)(2)` has only two of the three arguments, so it returns **a function** still waiting for `c`. Any grouping that adds up to three arguments gives 6.",
      },
      {
        kind: "question",
        title: "Order matters",
        body: "Find the value of `compose((x) => x + 1, (x) => x * 2)(5)`.",
        question: { type: "number", answer: 11, hint: "compose runs the right-most function first." },
        explanation: "Right to left: `5 * 2 = 10`, then `10 + 1 = 11`. `pipe` with the same functions would give `(5 + 1) * 2 = 12`.",
      },
      {
        kind: "code",
        title: "curry",
        body:
          "Write `curry(fn)`. The returned function collects arguments over any number of calls. As soon as it has at least `fn.length` arguments, it calls `fn` with all of them and returns the result; otherwise it returns a function waiting for more.\n\n" +
          "Each partial function must be **reusable**: calling it twice with different arguments gives independent results.",
        language: "javascript",
        starter: `function curry(fn) {
  return function curried(...args) {
    // call fn once enough arguments have arrived, otherwise wait for more
    return fn(...args);
  };
}
`,
        solution: `function curry(fn) {
  return function curried(...args) {
    if (args.length >= fn.length) return fn(...args);
    return (...more) => curried(...args, ...more);
  };
}
`,
        tests: [
          {
            id: "t1",
            description: "one argument at a time",
            assertionCode: 'const add3 = curry((a, b, c) => a + b + c);\nconst s1 = add3(1);\nassert(typeof s1 === "function", "add3(1) should return a function waiting for b and c");\nconst s2 = s1(2);\nassert(typeof s2 === "function", "add3(1)(2) should still be waiting for c");\nassertEqual(s2(3), 6, "add3(1)(2)(3) is 6");',
          },
          {
            id: "t2",
            description: "any grouping works",
            assertionCode: 'const vol = curry((w, h, d) => w * h * d);\nconst a = vol(2, 3);\nassert(typeof a === "function", "vol(2, 3) should wait for d");\nassertEqual(a(4), 24, "vol(2, 3)(4)");\nconst b = vol(2);\nassert(typeof b === "function", "vol(2) should wait for h and d");\nassertEqual(b(3, 4), 24, "vol(2)(3, 4)");\nassertEqual(vol(2, 3, 4), 24, "All at once also works");',
          },
          {
            id: "t3",
            description: "partials are reusable",
            assertionCode: 'const price = curry((rate, qty, unit) => rate * qty * unit);\nconst vat = price(2);\nassert(typeof vat === "function", "price(2) should return a function");\nconst first = vat(3);\nassert(typeof first === "function", "vat(3) should wait for unit");\nassertEqual(first(10), 60, "2 * 3 * 10");\nconst second = vat(5);\nassert(typeof second === "function", "vat(5) should also wait for unit");\nassertEqual(second(1), 10, "2 * 5 * 1: the earlier vat(3) must not leak into this call");\nassertEqual(first(1), 6, "and first still remembers its own 3");',
          },
        ],
        hints: ["Compare `args.length` with `fn.length`: enough means call `fn`, too few means return a new function.", "The new function is `(...more) => curried(...args, ...more)`: it builds a fresh argument list instead of pushing onto a shared one."],
      },
      {
        kind: "code",
        title: "pipe and compose",
        body:
          "Write `pipe(...fns)` and `compose(...fns)`. Each returns a function of `(...args)`:\n\n" +
          "- `pipe` calls the **first** function with all of `args`, then passes each result to the next function, left to right;\n" +
          "- `compose` does the same right to left: the **last** function gets `args`.\n\n" +
          "With no functions at all, both return their first argument unchanged.",
        language: "javascript",
        starter: `function pipe(...fns) {
  return (...args) => args[0];
}

function compose(...fns) {
  return (...args) => args[0];
}
`,
        solution: `function pipe(...fns) {
  return (...args) => {
    if (fns.length === 0) return args[0];
    const [first, ...rest] = fns;
    return rest.reduce((value, fn) => fn(value), first(...args));
  };
}

function compose(...fns) {
  return pipe(...[...fns].reverse());
}
`,
        tests: [
          { id: "t1", description: "pipe runs left to right", assertionCode: 'const inc = (x) => x + 1, dbl = (x) => x * 2;\nassertEqual(pipe(inc, dbl)(5), 12, "pipe(inc, dbl)(5) is dbl(inc(5)) = 12");\nassertEqual(pipe(dbl, inc, String)(5), "11", "Three steps, in order: 5 * 2 + 1, then String");' },
          { id: "t2", description: "compose runs right to left", assertionCode: 'const inc = (x) => x + 1, dbl = (x) => x * 2;\nassertEqual(compose(inc, dbl)(5), 11, "compose(inc, dbl)(5) is inc(dbl(5)) = 11");\nconst fns = [inc, dbl];\ncompose(...fns)(1);\nassertEqual(fns, [inc, dbl], "compose must not reorder the caller\'s array");' },
          {
            id: "t3",
            description: "several arguments, and no functions",
            assertionCode: 'const add = (a, b) => a + b, dbl = (x) => x * 2;\nassertEqual(pipe(add, dbl)(2, 3), 10, "The first step of pipe gets every argument: (2 + 3) * 2");\nassertEqual(compose(dbl, add)(2, 3), 10, "The last step of compose gets every argument");\nassertEqual([pipe()(7), compose()(7)], [7, 7], "With no functions, return the argument unchanged");',
          },
        ],
        hints: ["Call the first function with `...args`, then `reduce` over the rest, feeding each result to the next.", "`compose` is `pipe` with the functions reversed; copy the array before reversing it."],
      },
      {
        kind: "recap",
        points: [
          "**Currying** collects arguments until there are `fn.length` of them, then calls `fn`.",
          "Each partial call must build a **new** argument list; a shared one leaks between calls.",
          "`pipe(f, g)(x)` is `g(f(x))` (left to right); `compose(f, g)(x)` is `f(g(x))` (right to left).",
          "Both are a `reduce` over the functions; only the first step to run gets all the arguments.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 9. Deep equal and deep clone ───────────────────────────────
  {
    id: "fnd-iv-javascript-9-deep-equal-clone",
    title: "Deep equal and deep clone",
    summary: "Compare and copy nested objects by structure, with NaN, Dates and cycles handled.",
    minutes: 14,
    xp: 100,
    level: "Professional",
    steps: [
      {
        kind: "explain",
        title: "Same contents, not the same object",
        body:
          "`===` on objects asks *is this the same object in memory?*, so `{ a: 1 } === { a: 1 }` is `false`. **Deep equality** asks whether two values have the same **structure and contents**. The recursion:\n\n" +
          "1. If either side is not an object (or is `null`), compare directly. Decide on the edge cases: treat `NaN` as equal to `NaN` (`Object.is` does), and `0` as equal to `-0`.\n" +
          "2. An array never equals a plain object, even with the same keys. Two `Date`s are equal when their times are.\n" +
          "3. The two objects need the same number of own keys, and every key must be deeply equal on both sides.\n\n" +
          "A **deep clone** copies every nested object and array, so changing the copy never touches the original. `JSON.parse(JSON.stringify(x))` is the quick hack, and it is lossy: `Date`s become strings, `undefined` and functions disappear, and a cycle throws. Modern runtimes have `structuredClone`, but interviews want the recursion. To handle **cycles** and shared references, keep a `WeakMap` from each original object to its copy, and check it before copying.\n\n" +
          js(`
const user = { name: "Ada" };
user.self = user;              // a cycle
const copy = deepClone(user);
copy.self === copy;            // true: the cycle is copied, not followed forever
`) +
          "\nElsewhere: Python's `==` is already deep for lists and dicts, and `copy.deepcopy` keeps a `memo` dict for exactly the cycle problem; Java uses `equals` (often generated) and copy constructors; Go has `reflect.DeepEqual`.\n\n" +
          "**How to spot it:** *compare two objects*, *isEqual*, *clone without sharing*, *nested*, *circular reference*.",
      },
      {
        kind: "question",
        title: "Where do they differ?",
        body: "`deepEqual(a, b)` with `a = { user: { name: \"Ada\", tags: [\"x\", \"y\"] }, n: 1 }` and `b` the same except `tags: [\"x\", \"z\"]`. The tree is `a`'s structure; keys are visited in order, depth first. Answer the picks.",
        widget: {
          type: "iv-trace",
          props: {
            title: "Depth-first comparison",
            frames: [
              { tree: { nodes: EQ_TREE, active: ["r"] }, code: EQ_CODE, line: 3, note: "Both sides are objects with the keys `user` and `n`. Go into the keys in order." },
              { tree: { active: ["user"] }, line: 5, note: "`user` is an object on both sides with keys `name` and `tags`: recurse." },
              { tree: { active: ["name"] }, line: 2, note: "`\"Ada\"` and `\"Ada\"` are not objects, so compare them directly: equal." },
              { tree: { done: ["name"] }, line: 4, note: "Next key of `user`.", pick: { prompt: "Which node is compared next?", answer: "tags" } },
              { tree: { active: ["tags"], done: ["name"] }, line: 3, note: "Two arrays of length 2. Compare index by index." },
              { tree: { active: ["t0"], done: ["name"] }, line: 2, note: "`[0]`: `\"x\"` and `\"x\"`, equal.", pick: { prompt: "Which node reveals the difference?", answer: "t1" } },
              { tree: { active: ["t1"], done: ["name", "t0"] }, line: 5, note: "`\"y\"` and `\"z\"` differ, so `false` travels back up. `n` is **never visited**: deep equal stops at the first difference." },
            ],
          },
        },
        question: { type: "widget", goal: { picked: true }, prompt: "Answer both picks.", hint: "Finish all of `user` before moving on to `n`, and go into keys in order." },
        explanation: "Deep equality is a depth-first walk over both structures at once. It can return as soon as one pair differs, so the cost is at most the size of the smaller value.",
      },
      {
        kind: "question",
        title: "The JSON shortcut",
        body: "What does `JSON.parse(JSON.stringify({ when: new Date(0), note: undefined, n: 1 }))` give?",
        question: {
          type: "choice",
          options: ['{ when: "1970-01-01T00:00:00.000Z", n: 1 }', "{ when: Date(0), note: undefined, n: 1 }", "{ when: {}, n: 1 }", "It throws a TypeError"],
          answer: 0,
          feedback: {
            1: "JSON has no Date type and no `undefined`, so neither survives the round trip.",
            2: "A Date has a `toJSON` method that turns it into an ISO string, not an empty object.",
            3: "Only cycles (and BigInt) make `JSON.stringify` throw. This one has neither.",
          },
          hint: "JSON only knows strings, numbers, booleans, null, arrays and plain objects.",
        },
        explanation: "The Date becomes an ISO **string** and the `undefined` key is dropped. That is why a JSON round trip is not a real deep clone.",
      },
      {
        kind: "question",
        title: "Why a WeakMap?",
        body: "A deep clone keeps a `WeakMap` from each original object to its copy and checks it before copying. What would happen without it?",
        question: {
          type: "choice",
          options: [
            "Dates would be copied as strings.",
            "A cycle would recurse forever and shared objects would split.",
            "Arrays would be copied as plain objects.",
            "The clone would be slower but otherwise identical.",
          ],
          answer: 1,
          feedback: {
            0: "Dates are handled by their own `instanceof Date` check, not by the map.",
            2: "Arrays are handled by `Array.isArray`, not by the map.",
            3: "It is not just speed: a cycle never finishes, and shared objects lose their sharing.",
          },
          hint: "Think of an object that contains itself, or one object referenced from two places.",
        },
        explanation: "Without the map, `obj.self = obj` makes the clone recurse until the stack overflows, and an object referenced twice is copied twice, so the copy no longer shares it. The map fixes both: an object seen before maps to its existing copy.",
      },
      {
        kind: "code",
        title: "deepEqual",
        body:
          "Write `deepEqual(a, b)` for primitives, `null`, arrays, plain objects and `Date`s:\n\n" +
          "- not objects (or `null`): equal if `a === b`, or both are `NaN`;\n" +
          "- an array only equals an array; a `Date` only equals a `Date` with the same time;\n" +
          "- otherwise the same number of own keys, and every key deeply equal on both sides.",
        language: "javascript",
        starter: `function deepEqual(a, b) {
  return a === b;
}
`,
        solution: `function deepEqual(a, b) {
  if (a === b) return true;
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) {
    return Number.isNaN(a) && Number.isNaN(b);
  }
  if (a instanceof Date || b instanceof Date) {
    return a instanceof Date && b instanceof Date && a.getTime() === b.getTime();
  }
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  return keysA.every((k) => Object.prototype.hasOwnProperty.call(b, k) && deepEqual(a[k], b[k]));
}
`,
        tests: [
          {
            id: "t1",
            description: "nested objects",
            assertionCode: 'const a = { user: { name: "Ada", tags: ["x", "y"] }, n: 1 };\nassertEqual(deepEqual(a, { user: { name: "Ada", tags: ["x", "y"] }, n: 1 }), true, "Same structure and contents: equal");\nassertEqual(deepEqual(a, { user: { name: "Ada", tags: ["x", "z"] }, n: 1 }), false, "A different nested value: not equal");',
          },
          {
            id: "t2",
            description: "shapes and key counts",
            assertionCode: 'assertEqual(deepEqual([1, [2, 3]], [1, [2, 3]]), true, "Nested arrays with the same items are equal");\nassertEqual(deepEqual([1, 2], { 0: 1, 1: 2 }), false, "An array never equals a plain object");\nassertEqual(deepEqual({ a: 1 }, { a: 1, b: undefined }), false, "A missing key is not the same as a key set to undefined");\nassertEqual(deepEqual({ a: 1, b: 2 }, { b: 2, a: 1 }), true, "Key order does not matter");',
          },
          { id: "t3", description: "NaN and Dates", assertionCode: 'assertEqual(deepEqual(NaN, NaN), true, "Treat NaN as equal to NaN");\nassertEqual(deepEqual({ v: NaN }, { v: NaN }), true, "...also inside objects");\nassertEqual(deepEqual(new Date(5), new Date(5)), true, "Dates with the same time are equal");\nassertEqual(deepEqual(new Date(5), new Date(6)), false, "Different times are not");\nassertEqual(deepEqual(new Date(5), {}), false, "A Date is not a plain object");' },
          { id: "t4", description: "null and mixed types", assertionCode: 'assertEqual(deepEqual({ a: null }, { a: null }), true, "null equals null");\nassertEqual(deepEqual(null, {}), false, "null is not an empty object");\nassertEqual(deepEqual({ a: {} }, { a: null }), false, "...even nested");\nassertEqual(deepEqual(1, "1"), false, "A number is not a string");' },
        ],
        hints: ["Handle the non-object cases first (including `null`, whose `typeof` is \"object\"), then Dates, then arrays versus objects.", "Compare `Object.keys` lengths, then check every key of `a` exists in `b` and recurse on its value."],
      },
      {
        kind: "code",
        title: "deepClone with cycles",
        body:
          "Write `deepClone(value)`:\n\n" +
          "- primitives and `null` are returned as they are;\n- a `Date` becomes a new `Date` with the same time;\n- arrays and plain objects are copied recursively, so the copy shares nothing with the original;\n" +
          "- **cycles and shared references** are kept: if an object appears twice in the original, it appears as one copied object twice in the clone. Use a `WeakMap` from original to copy.",
        language: "javascript",
        starter: `function deepClone(value, seen = new WeakMap()) {
  return value;
}
`,
        solution: `function deepClone(value, seen = new WeakMap()) {
  if (typeof value !== "object" || value === null) return value;
  if (value instanceof Date) return new Date(value.getTime());
  if (seen.has(value)) return seen.get(value);
  const copy = Array.isArray(value) ? [] : {};
  seen.set(value, copy); // before recursing, so cycles find it
  for (const key of Object.keys(value)) copy[key] = deepClone(value[key], seen);
  return copy;
}
`,
        tests: [
          {
            id: "t1",
            description: "a nested copy shares nothing",
            assertionCode: 'const order = { id: 1, items: [{ sku: "a", qty: 2 }], meta: { tags: ["new"] } };\nconst copy = deepClone(order);\nassert(copy !== order && copy.items !== order.items && copy.items[0] !== order.items[0] && copy.meta.tags !== order.meta.tags, "Every nested object and array should be a new one");\ncopy.items[0].qty = 99;\ncopy.meta.tags.push("sale");\nassertEqual(order, { id: 1, items: [{ sku: "a", qty: 2 }], meta: { tags: ["new"] } }, "Changing the copy must not change the original");\nassert(Array.isArray(copy.items), "Arrays stay arrays");',
          },
          { id: "t2", description: "Dates are copied as Dates", assertionCode: 'const o = { when: new Date(1234) };\nconst c = deepClone(o);\nassert(c.when instanceof Date, "A Date should be copied as a Date");\nassert(c.when !== o.when, "...a new Date object");\nassertEqual(c.when.getTime(), 1234, "with the same time");' },
          {
            id: "t3",
            description: "cycles and shared references",
            assertionCode: 'const node = { name: "root" };\nnode.self = node;\nconst c = deepClone(node);\nassert(c !== node, "The clone is a new object");\nassert(c.self === c, "A cycle in the original becomes a cycle in the copy");\nconst shared = { x: 1 };\nconst pair = deepClone({ left: shared, right: shared });\nassert(pair.left === pair.right, "An object used twice is copied once and used twice");\nassert(pair.left !== shared, "...and it is a copy");',
          },
          { id: "t4", description: "primitives pass through", assertionCode: 'assertEqual([deepClone(5), deepClone("s"), deepClone(null), deepClone(undefined), deepClone(true)], [5, "s", null, undefined, true], "Primitives come back unchanged");\nconst arr = [1, [2]];\nconst c = deepClone(arr);\nassert(c !== arr && c[1] !== arr[1], "An array is copied, nested arrays too");' },
        ],
        hints: ["Return primitives and copy Dates first; then look the object up in `seen` before copying it.", "Create the empty copy and put it in `seen` **before** you recurse into its keys, so a cycle finds the copy in progress."],
      },
      {
        kind: "recap",
        points: [
          "`===` compares object identity; **deep equality** compares structure and contents recursively.",
          "Decide the edge cases out loud: NaN, arrays versus objects, Dates, missing keys versus `undefined`, `null`.",
          "A JSON round trip is not a real clone: Dates become strings, `undefined` vanishes, cycles throw.",
          "A real **deep clone** recurses and keeps a `WeakMap` from original to copy, registered before recursing, so cycles and shared objects survive.",
          "Python's `copy.deepcopy` uses the same memo idea; Go's `reflect.DeepEqual` is the deep-equal side.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 10. Utilities ───────────────────────────────
  {
    id: "fnd-iv-javascript-10-utilities",
    title: "Array and object utilities",
    summary: "chunk, flatten, groupBy and a safe nested get: small helpers with sharp edge cases.",
    minutes: 14,
    xp: 100,
    level: "Professional",
    steps: [
      {
        kind: "explain",
        title: "The lodash round",
        body:
          "Many interviews ask for a few small helpers, the kind a utility library provides. Each is a short loop; the marks are in the edge cases.\n\n" +
          "- **`chunk(arr, size)`**: split into groups of `size`; the last group may be shorter. `chunk([1,2,3,4,5], 2)` is `[[1,2],[3,4],[5]]`.\n" +
          "- **`flatten(arr, depth = 1)`**: open nested arrays up to `depth` levels; `Infinity` opens all. Recursion with `depth - 1` is the clean way. Avoid building the result with repeated `concat`, which copies the whole result each time.\n" +
          "- **`groupBy(items, key)`**: an object from key to the items with that key, in their original order. `key` may be a function or a property name.\n" +
          "- **`get(obj, path, fallback)`**: read `\"order.items[0].sku\"` without crashing on a missing step, and return `fallback` only when the value is really missing, not when it is `0` or `\"\"`.\n\n" +
          js(`
groupBy(["ant", "bee", "cat", "auk"], (w) => w[0]);
// { a: ["ant", "auk"], b: ["bee"], c: ["cat"] }
get({ order: { items: [{ sku: "x1" }] } }, "order.items[0].sku");  // "x1"
`) +
          "\nAll of these are O(n) in the size of the input. Modern JavaScript has some built in (`arr.flat(depth)`, `Object.groupBy`). Elsewhere: Python `itertools.batched` (3.12) for chunks and `collections.defaultdict(list)` for grouping; Java `Collectors.groupingBy`; Go `slices.Chunk` (1.23).\n\n" +
          "**How to spot it:** *implement chunk / flatten / groupBy*, *split into batches*, *nested arrays*, *safe property access*, *lodash*.",
      },
      {
        kind: "question",
        title: "How deep does it go?",
        body: "`flatten([1, [2, [3, [4]]], 5], 2)`. Each `[ ]` node is an array; the tree shows how they nest. Answer the picks.",
        widget: {
          type: "iv-trace",
          props: {
            title: "Flatten to depth 2",
            frames: [
              { tree: { nodes: FLAT_TREE, active: ["r"] }, vars: { depth: 2 }, stacks: [{ label: "output", items: [], kind: "queue" }], note: "Walk the top array with depth 2." },
              { tree: { active: ["x1"] }, vars: { depth: 2 }, stacks: [{ label: "output", items: [1], kind: "queue" }], note: "`1` is not an array: copy it to the output." },
              { tree: { active: ["b"] }, vars: { depth: 2 }, note: "An array and depth is 2 > 0, so open it and recurse with depth 1." },
              { tree: { active: ["x2"], done: ["b"] }, vars: { depth: 1 }, stacks: [{ label: "output", items: [1, 2], kind: "queue" }], note: "`2` goes to the output." },
              { tree: { active: ["d"], done: ["b"] }, vars: { depth: 1 }, note: "Another array, depth 1 > 0: open it, recurse with depth 0." },
              { tree: { active: ["x3"], done: ["b", "d"] }, vars: { depth: 0 }, stacks: [{ label: "output", items: [1, 2, 3], kind: "queue" }], note: "`3` goes to the output. Next comes one more array, at depth 0.", pick: { prompt: "Which node is copied to the output as a whole array?", answer: "e" } },
              { tree: { active: ["e"], done: ["b", "d"] }, vars: { depth: 0 }, stacks: [{ label: "output", items: [1, 2, 3, "[4]"], kind: "queue" }], note: "Depth 0 means *do not open*: `[4]` is pushed as it is." },
              { tree: { active: ["x5"], done: ["b", "d", "e"] }, vars: { depth: 2 }, note: "Back at the top, with its own depth 2.", pick: { prompt: "Which node goes into the output last?", answer: "x5" } },
              { tree: { done: ["b", "d", "e", "x5"] }, stacks: [{ label: "output", items: [1, 2, 3, "[4]", 5], kind: "queue" }], note: "Result: `[1, 2, 3, [4], 5]`. With depth `Infinity` it would be `[1, 2, 3, 4, 5]`." },
            ],
          },
        },
        question: { type: "widget", goal: { picked: true }, prompt: "Answer both picks.", hint: "Each level of recursion has one less depth; at depth 0 arrays are not opened." },
        explanation: "The depth counts how many levels of nesting to open. Each recursive call gets `depth - 1`, and at 0 an array is copied whole. Each call keeps its own depth, so after returning, the top level carries on with 2.",
      },
      {
        kind: "question",
        title: "Batches",
        body: "An upload sends 10 photos in batches with `chunk(photos, 3)`. Find how many batches there are.",
        question: { type: "number", answer: 4, hint: "Three full batches, plus whatever is left over." },
        explanation: "3 + 3 + 3 + 1: **4** batches, the last with one photo. In general `Math.ceil(n / size)`.",
      },
      {
        kind: "question",
        title: "A groupBy trap",
        body: "In Python, `itertools.groupby(words, key=first_letter)` on `[\"ant\", \"bee\", \"auk\"]` gives the groups `a`, `b`, `a` (two separate `a` groups). Why?",
        question: {
          type: "choice",
          options: [
            "It needs the key function to return numbers.",
            "It sorts the words by length first.",
            "It only groups consecutive items with the same key.",
            "It skips the first item of each group.",
          ],
          answer: 2,
          feedback: {
            0: "Any key that can be compared with `==` works, strings included.",
            1: "It does not sort at all; that is exactly the issue.",
            3: "Every item appears in some group.",
          },
          hint: "Look at where the two words starting with a sit in the list.",
        },
        explanation: "`itertools.groupby` starts a new group whenever the key changes, so it only merges **neighbours**: sort by the key first, or use a `defaultdict(list)` like a JavaScript `groupBy`.",
      },
      {
        kind: "code",
        title: "chunk and flatten",
        body:
          "Write two functions (no `.flat`):\n\n" +
          "- `chunk(arr, size)`: groups of `size` items, in order; the last group may be shorter. `size` is at least 1; an empty array gives `[]`.\n" +
          "- `flatten(arr, depth = 1)`: a new array with nested arrays opened up to `depth` levels (`Infinity` opens everything). Do not change `arr`.",
        language: "javascript",
        starter: `function chunk(arr, size) {
  return [];
}

function flatten(arr, depth = 1) {
  return arr;
}
`,
        solution: `function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function flatten(arr, depth = 1) {
  const out = [];
  for (const item of arr) {
    if (Array.isArray(item) && depth > 0) out.push(...flatten(item, depth - 1));
    else out.push(item);
  }
  return out;
}
`,
        tests: [
          { id: "t1", description: "chunk", assertionCode: 'assertEqual(chunk([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]], "The last group may be shorter");\nassertEqual(chunk(["a", "b"], 5), [["a", "b"]], "A size bigger than the array gives one group");\nassertEqual(chunk([], 3), [], "An empty array gives []");\nassertEqual(chunk([1, 2, 3], 1), [[1], [2], [3]], "Size 1 gives single-item groups");' },
          { id: "t2", description: "flatten one level by default", assertionCode: 'const input = [1, [2, [3, [4]]], 5];\nassertEqual(flatten(input), [1, 2, [3, [4]], 5], "With the default depth of 1, only the first level opens");\nassertEqual(input, [1, [2, [3, [4]]], 5], "The input must not change");\nassert(!/\\.flat\\s*\\(/.test(String(flatten)), "Write the recursion yourself instead of calling .flat");' },
          { id: "t3", description: "flatten to a depth", assertionCode: 'const input = [1, [2, [3, [4]]], 5];\nassertEqual(flatten(input, 2), [1, 2, 3, [4], 5], "Depth 2 opens two levels");\nassertEqual(flatten(input, Infinity), [1, 2, 3, 4, 5], "Infinity opens every level");\nassertEqual(flatten([[], [[]], 0], Infinity), [0], "Empty arrays disappear when opened");' },
        ],
        hints: ["For `chunk`, step `i` by `size` and push `arr.slice(i, i + size)`.", "For `flatten`, loop over the items: an array with `depth > 0` is replaced by `flatten(item, depth - 1)`'s items; anything else is pushed as it is."],
      },
      {
        kind: "code",
        title: "groupBy and get",
        body:
          "Write two functions:\n\n" +
          "- `groupBy(items, key)`: a plain object mapping each key to the array of items with that key, in their original order. `key` is a function `(item) => key`, or a **string** naming a property.\n" +
          "- `get(obj, path, fallback)`: follow a path like `\"order.items[0].sku\"` (dots, and `[n]` for array indexes). Return the value found, or `fallback` if any step is missing (`undefined` or `null` on the way). A value of `0`, `\"\"` or `false` counts as found.",
        language: "javascript",
        starter: `function groupBy(items, key) {
  return {};
}

function get(obj, path, fallback) {
  return fallback;
}
`,
        solution: `function groupBy(items, key) {
  const keyOf = typeof key === "function" ? key : (item) => item[key];
  const out = {};
  for (const item of items) {
    const k = keyOf(item);
    if (!Object.prototype.hasOwnProperty.call(out, k)) out[k] = [];
    out[k].push(item);
  }
  return out;
}

function get(obj, path, fallback) {
  const steps = path.replace(/\\[(\\d+)\\]/g, ".$1").split(".").filter(Boolean);
  let value = obj;
  for (const step of steps) {
    if (value === undefined || value === null) return fallback;
    value = value[step];
  }
  return value === undefined ? fallback : value;
}
`,
        tests: [
          {
            id: "t1",
            description: "groupBy with a function",
            assertionCode: 'const out = groupBy(["ant", "bee", "cat", "auk", "bat"], (w) => w[0]);\nassertEqual(out, { a: ["ant", "auk"], b: ["bee", "bat"], c: ["cat"] }, "Group by first letter, keeping the original order inside each group");\nassertEqual(groupBy([1.5, 2.1, 1.9], Math.floor), { 1: [1.5, 1.9], 2: [2.1] }, "Numbers make keys too");',
          },
          {
            id: "t2",
            description: "groupBy with a property name",
            assertionCode: 'const orders = [{ id: 1, status: "paid" }, { id: 2, status: "open" }, { id: 3, status: "paid" }];\nconst out = groupBy(orders, "status");\nassertEqual(Object.keys(out), ["paid", "open"], "Keys appear in the order first seen");\nassertEqual(out.paid && out.paid.map((o) => o.id), [1, 3], "A string key names the property to group by");\nassertEqual(groupBy([], "status"), {}, "No items, no groups");',
          },
          {
            id: "t3",
            description: "get follows a path",
            assertionCode: 'const data = { order: { items: [{ sku: "x1", qty: 0 }], note: "" } };\nassertEqual(get(data, "order.items[0].sku"), "x1", "Dots and [n] indexes");\nassertEqual(get(data, "order.items.0.sku"), "x1", "A plain number step works as an index too");\nassertEqual(get(data, "order.items[0].qty", 5), 0, "0 is a real value, not missing");\nassertEqual(get(data, "order.note", "none"), "", "So is the empty string");',
          },
          {
            id: "t4",
            description: "get falls back without crashing",
            assertionCode: 'const data = { order: { items: [], owner: null } };\nassertEqual(get(data, "order.items[3].sku", "?"), "?", "A missing index falls back");\nassertEqual(get(data, "order.owner.name", "nobody"), "nobody", "null on the way falls back instead of throwing");\nassertEqual(get(data, "customer.email"), undefined, "With no fallback given, a missing value is undefined");\nassertEqual(get(data, "order.items", null), [], "An empty array is found");',
          },
        ],
        hints: ["For `groupBy`, turn a string key into `(item) => item[key]` first, then push each item into `out[k]`, creating the array the first time.", "For `get`, rewrite `[n]` as `.n`, split on dots, and walk one step at a time, stopping with `fallback` at `undefined` or `null`."],
      },
      {
        kind: "recap",
        points: [
          "`chunk` steps by `size` with `slice`; the last group may be shorter.",
          "`flatten` recurses with `depth - 1` and copies arrays whole at depth 0; `Infinity` opens everything.",
          "`groupBy` builds an object of arrays in input order; accept a function or a property name.",
          "`get` walks a path step by step and falls back only on `undefined` or `null`, never on `0` or `\"\"`.",
          "Python's `itertools.groupby` only merges neighbours; sort first or use a dict of lists.",
        ],
      },
    ],
  },
];
