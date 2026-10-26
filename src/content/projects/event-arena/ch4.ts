import type { Lesson } from "@/engine/types";
import { js, md, T } from "./shared.ts";

/**
 * Chapter 4 (part 1): The async arena. Promises, then async/await with cancellation.
 *
 * The simulated API (fetch("/api/...")) is described in src/engine/runtimes/javascript/sim-api.ts:
 *   /api/teams (90 ms)  /api/matches (120)  /api/matches/:id (110)  /api/matches/:id/events?cursor&limit (80)
 *   /api/standings (180)  /api/players?q (150)  /api/flaky (fails twice, then works)  /api/slow (3000)
 * In tests, time is virtual: sim.now() reports it, sim.tick(ms) advances it and
 * sim.network.failNext(urlPrefix, times, 503 | "network" | "hang") breaks the next requests.
 */
export const chapter4a: Lesson[] = [
  // ───────────────────────────────────────── 10. promises
  {
    id: "event-arena-10-promises",
    title: "Promises",
    minutes: 38,
    xp: 180,
    concepts: ["Promise states", "then / catch / finally", "chaining", "Promise.all", "allSettled", "race", "any", "fetch"],
    learn: md`### A value that isn't here yet

Last lesson ended in a pyramid of callbacks. A **Promise** is an object that stands for a value that will arrive later (or an error that will arrive instead). You get it immediately, you attach what should happen next, and the event loop calls you back.

A promise is always in exactly one of three states:

- **pending**: still waiting;
- **fulfilled**: finished with a value;
- **rejected**: finished with a reason (usually an ¦Error¦).

Fulfilled and rejected are both **settled**, and settling happens **once**: a settled promise never changes.

### Creating one

~~~js
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
~~~

The function you pass to ¦new Promise¦ (the *executor*) runs immediately and receives two functions. Call ¦resolve(value)¦ to fulfil, ¦reject(error)¦ to reject. If the executor throws, the promise rejects. This is how you wrap a callback API: *promisify* it. Most of the time you will not create promises by hand: ¦fetch¦, ¦response.json()¦ and every ¦async¦ function give them to you. ¦Promise.resolve(x)¦ and ¦Promise.reject(e)¦ make settled ones.

### Consuming: then, catch, finally

~~~js
fetch("/api/teams")
  .then((response) => response.json())     // runs when fulfilled
  .then((teams) => teams.length)           // gets the previous step's return value
  .catch((error) => console.log("failed", error.message))   // runs if ANY step above rejected
  .finally(() => console.log("done"));     // runs either way; its return value is ignored
~~~

Every one of these methods **returns a new promise**, which is what makes chaining work, and the rules are simple:

- Whatever you **return** from a ¦then¦ callback becomes the next promise's value. If you return a *promise*, the chain waits for it (it is flattened).
- If a callback **throws**, the next promise rejects, and the rejection skips ahead to the nearest ¦catch¦.
- A ¦catch¦ that returns normally **recovers**: the chain continues fulfilled.
- ¦finally¦ passes the value or error through untouched; use it for cleanup (hide a spinner, decrement a counter).

The #1 bug: forgetting to ¦return¦ inside a ¦then¦. Without it the next step runs immediately with ¦undefined¦ and the inner promise is ignored.

Promise callbacks are **microtasks** (last lesson): they never run synchronously, even if the promise is already settled.

### fetch and HTTP errors

¦fetch¦ rejects only when the request could not be made at all (offline, dropped connection). A ¦404¦ or ¦500¦ is a **fulfilled** promise with ¦response.ok === false¦. Always check:

~~~js
if (!response.ok) throw new Error("HTTP " + response.status);
~~~

(In this course ¦fetch¦ talks to a simulated tournament API: a fixed set of ¦/api/...¦ routes with realistic latency that you can break on purpose. No real network is touched.)

### Doing several things at once

Starting independent requests together and waiting for all of them takes as long as the **slowest**, not the sum. Four combinators cover almost everything:

- ¦Promise.all([...])¦: fulfils with all results, in order; **rejects as soon as one rejects** (fail fast).
- ¦Promise.allSettled([...])¦: waits for everything and never rejects; gives ¦{ status, value | reason }¦ for each. Use it when partial success is useful.
- ¦Promise.race([...])¦: settles like the **first** to settle, win or lose. Handy for timeouts.
- ¦Promise.any([...])¦: fulfils with the **first success**, ignoring failures; rejects with an ¦AggregateError¦ (¦.errors¦) only if all fail.

~~~js
const [matches, standings] = await Promise.all([getJson("/api/matches"), getJson("/api/standings")]);
~~~

Careful: ¦race¦ and ¦any¦ do **not cancel** the losers. They keep running (and the timer in a race keeps ticking). Cancellation is lesson 11.

### Unhandled rejections

A rejected promise that nobody handles is a bug: it is reported as an *unhandled rejection* (and in this course it stops your program with an error). Every chain should end in a ¦catch¦, or be returned/awaited by something that handles it.

### Common mistakes

- Not returning inside ¦then¦, or nesting ¦then¦ inside ¦then¦ instead of chaining (a callback pyramid again).
- Forgetting the ¦response.ok¦ check.
- Using ¦new Promise¦ around something that already returns a promise (the *explicit construction anti-pattern*).
- Awaiting independent work one after another when ¦Promise.all¦ would run it together.
- Leaving a chain without ¦catch¦.`,
    mission: md`The arena dashboard needs data from the tournament API: matches, standings, teams. Each is a separate request, each can be slow or fail, and the screen must not wait for them one at a time.

Wrap ¦fetch¦ in a small ¦getJson¦ that turns HTTP errors into rejections and counts requests in flight, then compose it: load everything in parallel, keep what works when something fails, and take the first mirror that answers. The new Network panel sends these requests and draws each one as a bar on a timeline.`,
    tasks: [
      "sleep(ms) and getJson(url, options): reject on HTTP errors, and use .finally to keep an inFlight() counter honest",
      "loadDashboard(): matches, standings and teams in parallel with Promise.all",
      "loadAvailable(urls) with allSettled (good data plus a failed list) and fastest(urls) with Promise.any",
      "withTimeout(promise, ms) with Promise.race that cleans up its timer",
    ],
    starterAdd: js`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 10: promises.
//
// fetch("/api/...") talks to the simulated tournament API. Useful routes:
//   /api/teams (90 ms)  /api/matches (120 ms)  /api/matches/3 (110 ms)  /api/standings (180 ms)  /api/slow (3 s)

// A promise that fulfils (with undefined) after ms milliseconds.
const sleep = (ms) => {
  // TODO
};

let activeRequests = 0;
function inFlight() {
  return activeRequests;
}

// fetch(url, options) -> parsed JSON.
//   - A response that is not ok must REJECT: new Error("HTTP 404 for /api/matches/99")
//   - Network failures reject as they are (a TypeError).
//   - activeRequests goes up when the request starts and down when it settles, success or failure (.finally).
function getJson(url, options = {}) {
  // TODO
}

// All three at once. Fulfils with { matches, standings, teams }; rejects if any request fails.
function loadDashboard() {
  // TODO
}

// Request every url in parallel and keep what works. Always fulfils with
//   { data: [ ...parsed bodies, in url order ], failed: [ { url, reason: "<error message>" }, ... ] }
function loadAvailable(urls) {
  // TODO
}

// Fulfil with the first url that answers successfully; failures are ignored unless every url fails
// (then reject with the AggregateError that Promise.any gives you).
function fastest(urls) {
  // TODO
}

// Settle like promise, but reject with new Error("Timed out after 50ms") if it takes longer than ms.
// Clear the timer as soon as promise settles (Promise.race + finally).
function withTimeout(promise, ms) {
  // TODO
}
`,
    solutionAdd: js`const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let activeRequests = 0;
function inFlight() {
  return activeRequests;
}

function getJson(url, options = {}) {
  activeRequests++;
  return fetch(url, options)
    .then((response) => {
      // fetch only rejects for network failures: HTTP errors need an explicit check
      if (!response.ok) throw new Error(¦HTTP \${response.status} for \${url}¦);
      return response.json();
    })
    .finally(() => {
      activeRequests--;
    });
}

function loadDashboard() {
  return Promise.all([getJson("/api/matches"), getJson("/api/standings"), getJson("/api/teams")]).then(([matches, standings, teams]) => ({
    matches,
    standings,
    teams,
  }));
}

function loadAvailable(urls) {
  return Promise.allSettled(urls.map((url) => getJson(url))).then((results) => {
    const data = [];
    const failed = [];
    results.forEach((result, index) => {
      if (result.status === "fulfilled") data.push(result.value);
      else failed.push({ url: urls[index], reason: result.reason.message });
    });
    return { data, failed };
  });
}

function fastest(urls) {
  return Promise.any(urls.map((url) => getJson(url)));
}

function withTimeout(promise, ms) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(¦Timed out after \${ms}ms¦)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}`,
    explanation:
      "getJson is the one place that knows how fetch fails: it converts a not-ok response into a rejection, and its finally keeps the in-flight counter right whether the request worked or not. loadDashboard starts all three requests before waiting, so the whole thing takes as long as the slowest (180 ms), not 390 ms. allSettled never rejects, so partial results survive; any ignores failures until one succeeds. withTimeout races the work against a timer and clears that timer in finally so no stray timeout is left behind. Note what none of them do: the slow request keeps running after it lost the race. That is exactly what AbortController fixes next lesson.",
    hints: [
      { id: "h1", title: "sleep and getJson", content: "sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)). getJson: activeRequests++, then return fetch(url, options).then((response) => { if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`); return response.json(); }).finally(() => { activeRequests--; })." },
      { id: "h2", title: "Combinators", content: "loadDashboard: Promise.all([getJson(...), getJson(...), getJson(...)]).then(([matches, standings, teams]) => ({ matches, standings, teams })). loadAvailable: Promise.allSettled(urls.map((url) => getJson(url))), then loop over results: status === \"fulfilled\" has .value, otherwise .reason.message. fastest: Promise.any(urls.map(...))." },
      { id: "h3", title: "withTimeout", content: "let timer; const timeout = new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(`Timed out after ${ms}ms`)), ms); }); return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));" },
    ],
    tests: [
      {
        id: "t1",
        description: "sleep resolves after the delay",
        assertionCode: T(js`const t0 = sim.now();
const result = await sleep(250);
assertEqual(sim.now() - t0, 250, "sleep(250) should wait 250 ms");
assertEqual(result, undefined, "sleep fulfils with nothing");
const p = sleep(10);
assert(p instanceof Promise, "sleep returns a promise");
await p;`),
      },
      {
        id: "t2",
        description: "getJson returns the parsed body and tracks requests in flight",
        assertionCode: T(js`assertEqual(inFlight(), 0, "nothing in flight at the start");
const pending = getJson("/api/teams");
assertEqual(inFlight(), 1, "inFlight() counts a request as soon as it starts");
const teams = await pending;
assertEqual(teams.length, 6, "six teams");
assertEqual(teams[0].name, "Falcons", "parsed JSON, not a Response");
assertEqual(inFlight(), 0, "back to zero when it settles");
const two = [getJson("/api/teams"), getJson("/api/matches")];
assertEqual(inFlight(), 2, "two at once");
await Promise.all(two);
assertEqual(inFlight(), 0, "and zero again");`),
      },
      {
        id: "t3",
        description: "HTTP errors become rejections; the counter still recovers",
        assertionCode: T(js`await assertRejects(getJson("/api/matches/99"), "HTTP 404 for /api/matches/99", "a 404 must reject (fetch alone would fulfil)");
sim.network.failNext("/api/standings", 1, 503);
await assertRejects(getJson("/api/standings"), "HTTP 503 for /api/standings", "a 503");
sim.network.failNext("/api/teams", 1, "network");
const error = await assertRejects(getJson("/api/teams"), "Failed to fetch", "a dropped connection rejects too");
assertEqual(error.name, "TypeError", "network failures are passed through unchanged");
assertEqual(inFlight(), 0, "finally must decrement the counter even after failures");
assertEqual((await getJson("/api/teams")).length, 6, "and the next request works");`),
      },
      {
        id: "t4",
        description: "loadDashboard loads everything in parallel",
        assertionCode: T(js`const t0 = sim.now();
const dashboard = await loadDashboard();
const elapsed = sim.now() - t0;
assertEqual(Object.keys(dashboard).sort(), ["matches", "standings", "teams"], "the three resources");
assertEqual([dashboard.matches.length, dashboard.standings.length, dashboard.teams.length], [4, 6, 6], "their sizes");
assertEqual(elapsed, 180, "parallel loading takes as long as the slowest request (standings, 180 ms), not the sum of all three (390 ms)");
sim.network.failNext("/api/standings", 1, 500);
await assertRejects(loadDashboard(), "HTTP 500", "Promise.all rejects when one request fails");
assertEqual(inFlight(), 0, "nothing is left counted as in flight");`),
      },
      {
        id: "t5",
        description: "loadAvailable keeps what works and reports what failed",
        assertionCode: T(js`const t0 = sim.now();
const result = await loadAvailable(["/api/teams", "/api/matches/99", "/api/standings", "/api/matches/3"]);
assertEqual(result.data.length, 3, "three requests worked");
assertEqual(result.data[0].length, 6, "data keeps the url order: teams first");
assertEqual(result.data[2].id, 3, "match 3 is the last good one");
assertEqual(result.failed, [{ url: "/api/matches/99", reason: "HTTP 404 for /api/matches/99" }], "the failed list names the url and the reason");
assertEqual(sim.now() - t0, 180, "still parallel");
assertEqual(await loadAvailable([]), { data: [], failed: [] }, "no urls, no problem");
const bad = await loadAvailable(["/api/matches/98", "/api/matches/99"]);
assertEqual([bad.data.length, bad.failed.length], [0, 2], "all failing still fulfils");`),
      },
      {
        id: "t6",
        description: "fastest takes the first success and ignores quicker failures",
        assertionCode: T(js`const t0 = sim.now();
const teams = await fastest(["/api/slow", "/api/teams"]);
assertEqual(teams.length, 6, "the quick mirror wins");
assertEqual(sim.now() - t0, 90, "we did not wait for the 3 second one");
const standings = await fastest(["/api/matches/99", "/api/standings"]);
assertEqual(standings.length, 6, "a mirror that fails first (404 at 110 ms) is ignored while another may still succeed");
const error = await assertRejects(fastest(["/api/matches/98", "/api/matches/99"]), undefined, "all failing rejects");
assertEqual(error.name, "AggregateError", "with an AggregateError from Promise.any");
assertEqual(error.errors.length, 2, "holding every failure");`),
      },
      {
        id: "t7",
        description: "withTimeout races the work against a timer and cleans up",
        assertionCode: T(js`const before = sim.pending();
assertEqual(await withTimeout(sleep(10).then(() => "ok"), 50), "ok", "fast work passes through its value");
assertEqual(sim.pending(), before, "the timeout timer is cleared when the work wins");
await assertRejects(withTimeout(sleep(500), 50), "Timed out after 50ms", "slow work times out");
const failure = new Error("inner failure");
const reason = await assertRejects(withTimeout(Promise.reject(failure), 50), "inner failure", "the work's own error passes through");
assert(reason === failure, "the original error object is rejected, not a copy");`),
      },
    ],
    unlocks: ["arena-network"],
    checks: [
      {
        prompt: md`~~~js
Promise.resolve(1)
  .then((x) => { throw new Error("x"); })
  .then(() => "a")
  .catch(() => "b")
  .then(console.log);
~~~
What does this print?`,
        question: { type: "choice", options: ["a", "b", "Error: x", "Nothing: the chain stops at the throw"], answer: 1 },
        explanation: md`The throw rejects the promise returned by the first ¦then¦. The second ¦then¦ has no rejection handler, so the rejection passes through it. The ¦catch¦ handles it and returns ¦"b"¦, which *recovers* the chain, so the last ¦then¦ receives ¦"b"¦.`,
      },
      {
        prompt: md`You request four URLs with ¦Promise.all¦ and the second one fails after 50 ms while the others are still loading. What happens?`,
        question: {
          type: "choice",
          options: [
            "The promise waits for all four, then rejects",
            "The promise rejects immediately with that error (the other requests keep running but their results are ignored)",
            "The promise fulfils with three results and one hole",
            "The other three requests are cancelled automatically",
          ],
          answer: 1,
        },
        explanation: md`¦Promise.all¦ fails fast. It does not cancel the other requests (nothing in promises can): they finish quietly and their results are dropped. If you want every outcome use ¦Promise.allSettled¦; if you want to stop the others, you need an ¦AbortController¦.`,
      },
      {
        prompt: md`¦fetch("/api/matches/99")¦ gets a 404 response. What is the promise's state?`,
        question: { type: "choice", options: ["Rejected, with an error", "Fulfilled, with ¦response.ok === false¦", "Pending forever", "It throws synchronously"], answer: 1 },
        explanation: md`The request itself worked: the server answered. ¦fetch¦ rejects only when no response could be obtained. That is why ¦getJson¦ checks ¦response.ok¦ and throws for you.`,
      },
    ],
  },

  // ───────────────────────────────────────── 11. async/await + AbortController
  {
    id: "event-arena-11-async-await",
    title: "async/await and cancellation",
    minutes: 38,
    xp: 190,
    concepts: ["async / await", "try / catch / finally", "parallel vs sequential", "AbortController", "error cause", "timeouts"],
    learn: md`### Promises that read like normal code

¦async¦ and ¦await¦ are syntax on top of promises. They let you write asynchronous steps in a straight line:

~~~js
async function loadTeams() {
  const response = await fetch("/api/teams");
  if (!response.ok) throw new Error("HTTP " + response.status);
  return response.json();
}
~~~

- An ¦async¦ function **always returns a promise**. A ¦return¦ value fulfils it; a ¦throw¦ rejects it.
- ¦await promise¦ pauses **this function** (not the thread) until the promise settles, then gives you its value, or throws its rejection. Everything after the ¦await¦ runs as a microtask. The caller carries on in the meantime (lesson 9: the part before the first ¦await¦ runs synchronously).
- You can ¦await¦ any value; non-promises just continue on the next microtask. ¦await¦ works at the top level of this course's code files, too.

### Errors: the try/catch you already know

Because a rejected ¦await¦ **throws**, ordinary error handling works:

~~~js
async function safeTeams() {
  try {
    return await loadTeams();     // await INSIDE try, or the catch will not see the rejection
  } catch (error) {
    console.log("could not load:", error.message);
    return [];
  } finally {
    hideSpinner();                // always runs
  }
}
~~~

Wrap errors with context when you rethrow, and keep the original with the **cause** option: ¦throw new Error("Could not load match 3", { cause: error })¦.

### Sequential or parallel: you choose

~~~js
// sequential: 110 + 90 + 80 = 280 ms
const match = await getJson("/api/matches/1");
const teams = await getJson("/api/teams");
const events = await getJson("/api/matches/1/events");

// parallel: only as slow as the slowest (110 ms), because all requests start before any await
const [match, teams, events] = await Promise.all([getJson(...), getJson(...), getJson(...)]);
~~~

Sequential is right when a step needs the previous result (you need the match before you know which teams to look up). Otherwise start the work together. Two traps:

- ¦items.forEach(async (id) => { await load(id); })¦ does **not** wait: ¦forEach¦ ignores the promises. Use a ¦for...of¦ loop with ¦await¦ for sequential, or ¦await Promise.all(items.map(load))¦ for parallel.
- ¦await¦ inside a loop makes it sequential. That is sometimes exactly what you want (rate limits, ordering) and sometimes an accident.

### Cancelling: AbortController

Promises cannot be cancelled, but the *work behind them* can be told to stop. The standard tool is the **AbortController**:

~~~js
const controller = new AbortController();
fetch("/api/slow", { signal: controller.signal })      // hand the signal to the work
  .catch((error) => console.log(error.name));          // "AbortError"

controller.abort();                                      // later: please stop
~~~

- ¦controller.signal¦ is an ¦AbortSignal¦: ¦signal.aborted¦ (boolean), ¦signal.reason¦ (what was passed to ¦abort(reason)¦, by default an ¦AbortError¦ ¦DOMException¦) and an ¦"abort"¦ event.
- ¦signal.throwIfAborted()¦ throws the reason if already aborted, handy at the top of a loop.
- ¦AbortSignal.timeout(ms)¦ makes a signal that aborts itself after a delay. ¦AbortSignal.any([a, b])¦ combines signals.
- ¦fetch¦ rejects with the signal's reason. **Cancellation is not a failure**: check ¦error.name === "AbortError"¦ and don't show it to users as an error.

Why bother? A user leaves a page, types a new search, or you hit a time limit: finishing the old request wastes bandwidth and, worse, a **stale response** can arrive after a newer one and overwrite it. Pass the signal down through every layer so each can stop, and clean up in ¦finally¦. Aborting is a *request*: the code must cooperate by passing the signal on or checking it.

### A timeout built from an abort

~~~js
async function fetchWithTimeout(url, ms) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new DOMException("Timed out", "TimeoutError")), ms);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);          // never leave the timer behind
  }
}
~~~

Unlike the ¦Promise.race¦ timeout of lesson 10, this one actually stops the request.

### Common mistakes

- ¦return promise¦ without ¦await¦ inside a ¦try¦ (the ¦catch¦ never sees the rejection).
- A ¦forEach¦ with an ¦async¦ callback.
- Sequential ¦await¦s for independent work.
- Treating ¦AbortError¦ as a bug (or swallowing every error because one kind is expected).
- Forgetting to clear a timer or remove a listener in ¦finally¦.`,
    mission: md`When a fan opens a match page the dashboard needs the match, both team profiles and the first events, and it needs them quickly. When the fan hits Back, or opens a different match, the old requests must stop: nothing is worse than yesterday's match flashing onto today's screen.

Write the match-centre loader with ¦async/await¦, give it a cancellation switch, add a hard time limit, and wrap it so the UI always gets a tidy result object instead of a surprise exception. The Network panel gains Cancel and timeout buttons, and you can watch aborted requests turn grey.`,
    tasks: [
      "async loadMatchCentre(id, { signal }): the match first, then teams and events in parallel; wrap failures with context and a cause, but never wrap an AbortError",
      "async fetchWithTimeout(url, ms): an AbortController and a timer that is always cleared",
      "startLoad(id) / cancelLoad(id): a registry of controllers; starting a load for the same match cancels the previous one",
      "async safeLoad(id): returns { ok, data | error, cancelled, ms } and never throws",
    ],
    starterAdd: js`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 11: async/await and cancellation.
// (getJson(url, { signal }) from lesson 10 already passes options to fetch.)

// Load everything for one match page. Resolves with
//   { match, home, away, events, total }
// match: GET /api/matches/:id
// home / away: the team objects from GET /api/teams that match match.home / match.away
// events: the items of GET /api/matches/:id/events?limit=5 ; total: the page's total count
// Fetch the match first (you need it), then teams and events TOGETHER (Promise.all).
// Pass options.signal to every request.
// Any failure except an abort -> throw new Error("Could not load match 99: <original message>", { cause: original }).
// An AbortError must be rethrown untouched.
async function loadMatchCentre(id, { signal } = {}) {
  // TODO
}

// GET url as JSON, but give up after ms: abort the request with new DOMException("Timed out after 500ms", "TimeoutError").
// Clear the timer when the request settles.
async function fetchWithTimeout(url, ms) {
  // TODO
}

// One AbortController per running load, by match id.
const controllers = new Map();

// Start loading a match page and return the promise.
//   - If a load for this id is already running, abort it first (the newest request wins).
//   - Forget the controller when this load settles (only if it is still the registered one).
function startLoad(id) {
  // TODO
}

// Abort the running load for this id. Return true if there was one, false otherwise.
function cancelLoad(id) {
  // TODO
}

// Never throws. Resolves with one of
//   { ok: true, data, ms }
//   { ok: false, cancelled: false, error: "<message>", ms }
//   { ok: false, cancelled: true, error: "Cancelled", ms }
// ms is how long it took (Date.now() difference). Use startLoad.
async function safeLoad(id) {
  // TODO
}
`,
    solutionAdd: js`async function loadMatchCentre(id, { signal } = {}) {
  try {
    const match = await getJson(¦/api/matches/\${id}¦, { signal });
    // independent of each other: start both before waiting
    const [teams, page] = await Promise.all([
      getJson("/api/teams", { signal }),
      getJson(¦/api/matches/\${id}/events?limit=5¦, { signal }),
    ]);
    return {
      match,
      home: teams.find((team) => team.id === match.home),
      away: teams.find((team) => team.id === match.away),
      events: page.items,
      total: page.total,
    };
  } catch (error) {
    if (error.name === "AbortError") throw error; // cancelling is not a failure
    throw new Error(¦Could not load match \${id}: \${error.message}¦, { cause: error });
  }
}

async function fetchWithTimeout(url, ms) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new DOMException(¦Timed out after \${ms}ms¦, "TimeoutError")), ms);
  try {
    return await getJson(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

const controllers = new Map();

function startLoad(id) {
  controllers.get(id)?.abort();
  const controller = new AbortController();
  controllers.set(id, controller);
  return loadMatchCentre(id, { signal: controller.signal }).finally(() => {
    if (controllers.get(id) === controller) controllers.delete(id);
  });
}

function cancelLoad(id) {
  const controller = controllers.get(id);
  if (!controller) return false;
  controllers.delete(id);
  controller.abort();
  return true;
}

async function safeLoad(id) {
  const started = Date.now();
  const elapsed = () => Date.now() - started;
  try {
    const data = await startLoad(id);
    return { ok: true, data, ms: elapsed() };
  } catch (error) {
    if (error.name === "AbortError") return { ok: false, cancelled: true, error: "Cancelled", ms: elapsed() };
    return { ok: false, cancelled: false, error: error.message, ms: elapsed() };
  }
}`,
    explanation:
      "loadMatchCentre awaits the match because it needs match.home, then starts teams and events together. The catch keeps the original error as cause and adds context, but lets AbortError through unchanged so callers can tell \"cancelled\" from \"broken\". fetchWithTimeout aborts the real request (unlike a Promise.race timeout) and clears its timer in finally. startLoad aborts any older load for the same match, and the finally only removes its own controller so a newer one is never deleted by an older load finishing late. safeLoad turns the three outcomes into plain data, so UI code needs no try/catch.",
    hints: [
      { id: "h1", title: "loadMatchCentre", content: "Inside one try: const match = await getJson(`/api/matches/${id}`, { signal }); then const [teams, page] = await Promise.all([getJson(\"/api/teams\", { signal }), getJson(`/api/matches/${id}/events?limit=5`, { signal })]). Build the result with teams.find(...). In the catch: if (error.name === \"AbortError\") throw error; otherwise throw new Error(`Could not load match ${id}: ${error.message}`, { cause: error })." },
      { id: "h2", title: "Timeout and registry", content: "fetchWithTimeout: const controller = new AbortController(); const timer = setTimeout(() => controller.abort(new DOMException(`Timed out after ${ms}ms`, \"TimeoutError\")), ms); try { return await getJson(url, { signal: controller.signal }); } finally { clearTimeout(timer); }. startLoad: controllers.get(id)?.abort(), create and store a new controller, return loadMatchCentre(...).finally(() => { if (controllers.get(id) === controller) controllers.delete(id); })." },
      { id: "h3", title: "cancel and safe", content: "cancelLoad: const controller = controllers.get(id); if (!controller) return false; controllers.delete(id); controller.abort(); return true. safeLoad: const started = Date.now(); try { const data = await startLoad(id); return { ok: true, data, ms: ... } } catch (error) { if (error.name === \"AbortError\") return { ok: false, cancelled: true, error: \"Cancelled\", ms: ... }; return { ok: false, cancelled: false, error: error.message, ms: ... }; }" },
    ],
    tests: [
      {
        id: "t1",
        description: "loadMatchCentre returns the match, both teams and the first events",
        assertionCode: T(js`const t0 = sim.now();
const centre = await loadMatchCentre(1);
const elapsed = sim.now() - t0;
assertEqual(centre.match.id, 1, "the match");
assertEqual([centre.home.name, centre.away.name], ["Falcons", "Wolves"], "home and away team objects");
assertEqual(centre.events.length, 5, "the first five events");
assertEqual(centre.total, 12, "the total number of events");
assertEqual(elapsed, 200, "match (110 ms) first, then teams (90 ms) and events (80 ms) TOGETHER: 200 ms. A fully sequential version takes 280 ms");`),
      },
      {
        id: "t2",
        description: "Failures are wrapped with context and keep their cause",
        assertionCode: T(js`const notFound = await assertRejects(loadMatchCentre(99), "Could not load match 99: HTTP 404 for /api/matches/99", "unknown match");
assert(notFound.cause instanceof Error && notFound.cause.message === "HTTP 404 for /api/matches/99", "the original error is kept as error.cause");
sim.network.failNext("/api/matches/1/events", 1, 503);
await assertRejects(loadMatchCentre(1), "Could not load match 1: HTTP 503", "a failing events request");
sim.network.failNext("/api/teams", 1, "network");
const offline = await assertRejects(loadMatchCentre(2), "Could not load match 2: Failed to fetch", "a dropped connection");
assertEqual(offline.cause.name, "TypeError", "cause keeps the original TypeError");`),
      },
      {
        id: "t3",
        description: "An aborted load rejects with the AbortError itself",
        assertionCode: T(js`const controller = new AbortController();
const promise = loadMatchCentre(1, { signal: controller.signal });
setTimeout(() => controller.abort(), 50);
const error = await assertRejects(promise, undefined, "aborting must reject the load");
assertEqual(error.name, "AbortError", "an AbortError must not be wrapped in 'Could not load...'");
assertEqual(sim.network.entries()[0].status, "aborted", "the in-flight request was really cancelled (is options.signal passed to getJson?)");
const already = new AbortController(); already.abort();
const e2 = await assertRejects(loadMatchCentre(1, { signal: already.signal }), undefined, "already aborted");
assertEqual(e2.name, "AbortError", "an already aborted signal rejects too");`),
      },
      {
        id: "t4",
        description: "fetchWithTimeout aborts the request and cleans its timer",
        assertionCode: T(js`const before = sim.pending();
const teams = await fetchWithTimeout("/api/teams", 500);
assertEqual(teams.length, 6, "fast requests succeed");
assertEqual(sim.pending(), before, "the timer is cleared after success");
const t0 = sim.now();
const error = await assertRejects(fetchWithTimeout("/api/slow", 500), "Timed out after 500ms", "slow requests time out");
assertEqual(error.name, "TimeoutError", "named TimeoutError");
assertEqual(sim.now() - t0, 500, "after exactly 500 ms");
const slow = sim.network.entries().find((e) => e.url === "/api/slow");
assertEqual(slow.status, "aborted", "the request itself was cancelled, not just ignored");
assertEqual(sim.pending(), before, "and nothing is left pending");`),
      },
      {
        id: "t5",
        description: "startLoad and cancelLoad manage one controller per match",
        assertionCode: T(js`const run = startLoad(2);
const expectCancelled = assertRejects(run, undefined, "a cancelled load rejects");
assertEqual(controllers.size, 1, "the running load is registered");
assertEqual(cancelLoad(2), true, "cancelLoad finds it");
const error = await expectCancelled;
assertEqual(error.name, "AbortError", "with an AbortError");
assertEqual(cancelLoad(2), false, "nothing left to cancel");
assertEqual(controllers.size, 0, "the registry is empty");
const ok = await startLoad(1);
assertEqual(ok.match.id, 1, "a load that finishes resolves normally");
assertEqual(controllers.size, 0, "and removes its controller");`),
      },
      {
        id: "t6",
        description: "Starting a load for the same match cancels the older one",
        assertionCode: T(js`const first = startLoad(1);
const firstOutcome = first.then(() => "finished", (e) => e.name);
await sim.tick(30);
const second = startLoad(1);
assertEqual(await firstOutcome, "AbortError", "the older load was aborted");
const data = await second;
assertEqual(data.match.id, 1, "the newer load completes");
assertEqual(controllers.size, 0, "the older load finishing late must not delete the newer one's controller, and the newer one cleans up after itself");`),
      },
      {
        id: "t7",
        description: "safeLoad never throws and describes every outcome",
        assertionCode: T(js`const good = await safeLoad(1);
assertEqual(good.ok, true, "success");
assertEqual(good.data.match.id, 1, "carries the data");
assertEqual(good.ms, 200, "and how long it took (virtual ms)");
const bad = await safeLoad(99);
assertEqual([bad.ok, bad.cancelled, bad.error], [false, false, "Could not load match 99: HTTP 404 for /api/matches/99"], "failure");
const pending = safeLoad(2);
cancelLoad(2);
const cancelled = await pending;
assertEqual([cancelled.ok, cancelled.cancelled, cancelled.error], [false, true, "Cancelled"], "cancellation is its own outcome");
assertEqual(typeof cancelled.ms, "number", "every outcome reports ms");`),
      },
    ],
    unlocks: ["arena-cancel"],
    checks: [
      {
        prompt: md`~~~js
const ids = [1, 2, 3];
ids.forEach(async (id) => {
  await loadMatchCentre(id);
});
console.log("done");
~~~
When does ¦"done"¦ print?`,
        question: { type: "choice", options: ["After all three matches have loaded", "Immediately, before the matches finish loading", "Never: forEach throws on async callbacks", "After the first match loads"], answer: 1 },
        explanation: md`¦forEach¦ calls each callback and ignores the promise it returns, so the loop finishes at once. To wait use ¦await Promise.all(ids.map(loadMatchCentre))¦ (parallel) or a ¦for...of¦ loop with ¦await¦ (one by one).`,
      },
      {
        prompt: md`A user starts a search, then types a new letter, so a second search starts. The first response arrives *after* the second and overwrites it. How does ¦AbortController¦ fix this?`,
        question: {
          type: "choice",
          options: [
            "It makes responses arrive in order",
            "Aborting the first request when the second starts means the stale response never arrives",
            "It slows the second request down",
            "It deletes the first response from the cache",
          ],
          answer: 1,
        },
        explanation: md`Network responses can arrive out of order. Cancelling the older request guarantees only the newest one can update the screen. (A second defence is to remember which request is current and ignore any other.)`,
      },
    ],
  },
];
