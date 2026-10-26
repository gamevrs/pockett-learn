import type { Lesson } from "@/engine/types";
import { js, md, T } from "./shared.ts";

/**
 * Chapter 4 (part 2): resilience, streams and the finished pipeline.
 * Match 1 has 12 events (3 goals for Falcons, 1 for Wolves, 5 fouls, 2 timeouts, 1 card); the events
 * route pages them with ?cursor=&limit=.
 */
export const chapter4b: Lesson[] = [
  // ───────────────────────────────────────── 12. retries, debounce, throttle
  {
    id: "event-arena-12-resilience",
    title: "Retries, debounce and throttle",
    minutes: 40,
    xp: 190,
    concepts: ["retry", "exponential backoff", "jitter", "transient errors", "debounce", "throttle", "stale responses"],
    learn: md`### Networks fail. Plan for it.

Requests fail all the time for reasons that go away by themselves: a server restarts, a router drops a packet, a service is briefly overloaded. A user should not see an error screen for a hiccup that a second attempt would have fixed. But not every failure is worth another try.

- **Transient** failures (try again): network errors, ¦502/503/504¦, ¦429 Too Many Requests¦, timeouts.
- **Permanent** failures (never retry): ¦400¦, ¦401¦, ¦403¦, ¦404¦, validation errors. Asking again gets the same answer.
- **Cancellation** is neither: the caller asked you to stop. Never retry an ¦AbortError¦.

Be careful with operations that change things: retrying a ¦POST /payments¦ may charge twice. Retry **idempotent** requests (reads, or writes protected by an idempotency key).

### Exponential backoff

Retrying instantly just hammers a struggling server. Wait a little, and wait **longer after each failure**:

~~~js
delay = baseDelay * factor ** (attempt - 1)     // 100, 200, 400, 800 ...
delay = Math.min(delay, maxDelay)                // but never wait more than a cap
~~~

If a thousand clients all failed at the same moment, they would also all retry at the same moment, over and over: a *thundering herd*. **Jitter** spreads them out by randomising each wait:

~~~js
delay = delay * (1 - jitter * Math.random())    // jitter 0 = none, 1 = anywhere from 0 to delay
~~~

Put these together in a reusable ¦retry(task, options)¦ that wraps *any* async function: the task, the policy (how many times, how long, which errors) and an ¦onRetry¦ hook for logging. Waiting must be **abortable**, otherwise a cancelled operation keeps sleeping for seconds before it notices.

~~~js
function abortableSleep(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(signal.reason);
    const timer = setTimeout(() => { signal?.removeEventListener("abort", onAbort); resolve(); }, ms);
    function onAbort() { clearTimeout(timer); reject(signal.reason); }
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}
~~~

### Typed errors help the policy

A plain ¦Error("HTTP 503")¦ forces you to parse text. A small subclass carries the facts:

~~~js
class HttpError extends Error {
  constructor(status, url) {
    super(¦HTTP \${status} for \${url}¦);
    this.name = "HttpError";
    this.status = status;
  }
}
~~~

Now ¦isTransient(error)¦ can look at ¦error.status¦.

### Debounce: wait until it goes quiet

Typing "ada" fires three key events. Searching after each one wastes requests and shows flickering results. **Debounce** delays the call until nothing has happened for ¦wait¦ ms: each new call restarts the timer.

~~~js
function debounce(fn, wait) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}
~~~

Use it for search boxes, auto-save and window-resize recalculation: anything where only the **final** value matters.

### Throttle: at most once per interval

A scroll or a refresh button can fire hundreds of times a second. **Throttle** lets the function run at most once per ¦interval¦: the first call runs right away (*leading edge*), calls in between are collapsed, and the **last** one runs when the interval ends (*trailing edge*) so the final state is not lost. Use it for scroll/drag handlers, rate-limited buttons and progress reports.

| | debounce | throttle |
| --- | --- | --- |
| runs | after calls stop | at a steady maximum rate |
| good for | search-as-you-type, auto-save | scroll, resize, refresh buttons |

Both are closures around a timer (lesson 2). Give them a ¦cancel()¦ so owners can clean up (lesson 8).

### Stale responses

Responses can arrive out of order. When a new search starts, **abort the previous request** (lesson 11) so an old answer can never overwrite a newer one.

### Testing time

Delays are painful to test. This course's virtual clock is the answer: ¦await sim.tick(300)¦ moves time forward without waiting, so a retry schedule of 100 + 200 + 400 ms or a 2 second throttle is verified in microseconds, and ¦Date.now()¦ moves with it. Code that reads the clock or timers through globals is easy to test; code that hides them is not.

### Common mistakes

- Retrying everything, including 4xx errors and non-idempotent writes.
- Retrying with no delay, no cap or no maximum number of attempts.
- A debounced function that loses its ¦this¦ or its latest arguments.
- Throttle without a trailing call, so the final value is dropped.
- Debouncing a click that the user expects an immediate reaction to.`,
    mission: md`Friday night, the tournament API wobbles under load: standings fail, then work, then fail again. The dashboard shows a red error banner for a one second blip, and the search box fires a request for every letter, which makes the blip worse.

Add resilience: retry transient failures with exponential backoff, debounce the player search, abort stale searches, and throttle the refresh button. In the scene, "Break the API" fails the next two standings requests; you can watch attempt 1, 2 and 3 appear with their backoff gaps.`,
    tasks: [
      "HttpError and retry(task, options): backoff, cap, jitter, shouldRetry, onRetry, abortable waits",
      "isTransient and fetchWithRetry(url, { signal }): retry 5xx, 429 and network errors; never 4xx or aborts",
      "debounce(fn, wait) with cancel/flush/pending, and throttle(fn, interval) with leading + trailing calls",
      "The search box (onSearchInput, debounced + stale requests aborted) and the throttled refreshStandings button",
    ],
    starterAdd: js`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 12: retries, debounce and throttle.

// An HTTP failure that remembers its status: error.name "HttpError", error.status, error.url,
// message "HTTP 503 for /api/standings".
class HttpError extends Error {
  // TODO
}

// A sleep that stops early: rejects with signal.reason if the signal aborts (also if it is already aborted).
function abortableSleep(ms, signal) {
  // TODO
}

// Run task(attempt) until it succeeds. attempt counts from 1.
// options: retries = 3 (so up to 4 attempts), baseDelay = 100, factor = 2, maxDelay = 5000,
//   jitter = 0 (0 to 1), random = Math.random, shouldRetry = (error, attempt) => true, onRetry({ attempt, delay, error }), signal
// After failed attempt n wait min(baseDelay * factor ** (n - 1), maxDelay) * (1 - jitter * random()), rounded to whole ms.
// Out of retries, or shouldRetry says no -> throw the error unchanged. Check signal?.throwIfAborted() before each attempt.
async function retry(task, options = {}) {
  // TODO
}

// Network failure (a TypeError whose message mentions fetch, network or "load failed"), HttpError 5xx, or 429.
function isTransient(error) {
  // TODO
}

// GET url as JSON; a response that is not ok throws an HttpError. Pass { signal } to fetch.
async function fetchJson(url, { signal } = {}) {
  // TODO
}

// fetchJson wrapped in retry: only transient errors are retried. options are passed on to retry (and options.signal to fetch).
function fetchWithRetry(url, options = {}) {
  // TODO
}

// debounce(fn, wait): call fn(...lastArgs) with the last this once wait ms pass without another call.
// The debounced function also has .cancel(), .flush() (run now if something is pending, return its result) and .pending().
function debounce(fn, wait = 250) {
  // TODO
}

// throttle(fn, interval): run on the first call at once, collapse calls inside the interval into ONE trailing call
// (with the latest arguments) when the interval ends. Use Date.now(). Has .cancel().
function throttle(fn, interval = 1000) {
  // TODO
}

// ── the player search box ──
const searchState = { query: "", results: [], loading: false, error: null, keystrokes: 0, searches: 0 };
let searchController = null;

// Search /api/players?q=<encoded query> with fetchWithRetry. Starting a search aborts the previous one.
// searches++ at the start; loading = true until it settles (only the newest search may change loading/results);
// an AbortError is not an error; other failures go into searchState.error.
async function runSearch(query) {
  // TODO
}

const debouncedSearch = undefined; // runSearch debounced by 300 ms

// Called on every keystroke: keystrokes++, remember the query, then debouncedSearch(query).
// A blank query cancels everything pending and clears results, loading and error instead.
function onSearchInput(query) {
  // TODO
}

function getSearchState() {
  return { ...searchState, results: [...searchState.results] };
}

// ── the refresh button ──
const refreshStats = { clicks: 0, runs: 0, rows: 0, error: null };

// A throttled (2000 ms) function that loads /api/standings with fetchWithRetry: runs++, then rows = how many rows came back,
// or error = the message.
const throttledRefresh = undefined;

// Called on every click: clicks++ and throttledRefresh().
function refreshStandings() {
  // TODO
}

function getRefreshStats() {
  return { ...refreshStats };
}
`,
    solutionAdd: js`class HttpError extends Error {
  constructor(status, url) {
    super(¦HTTP \${status} for \${url}¦);
    this.name = "HttpError";
    this.status = status;
    this.url = url;
  }
}

function abortableSleep(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason);
      return;
    }
    const onAbort = () => {
      clearTimeout(timer);
      reject(signal.reason);
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

async function retry(task, options = {}) {
  const { retries = 3, baseDelay = 100, factor = 2, maxDelay = 5000, jitter = 0, random = Math.random, shouldRetry = () => true, onRetry, signal } = options;
  for (let attempt = 1; ; attempt++) {
    signal?.throwIfAborted();
    try {
      return await task(attempt);
    } catch (error) {
      if (attempt > retries || !shouldRetry(error, attempt)) throw error;
      const capped = Math.min(baseDelay * factor ** (attempt - 1), maxDelay);
      const delay = Math.round(capped * (1 - jitter * random()));
      onRetry?.({ attempt, delay, error });
      await abortableSleep(delay, signal);
    }
  }
}

function isTransient(error) {
  if (error instanceof HttpError) return error.status >= 500 || error.status === 429;
  return error instanceof TypeError && /fetch|network|load failed/i.test(error.message);
}

async function fetchJson(url, { signal } = {}) {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new HttpError(response.status, url);
  return response.json();
}

function fetchWithRetry(url, options = {}) {
  return retry(() => fetchJson(url, { signal: options.signal }), { shouldRetry: isTransient, ...options });
}

function debounce(fn, wait = 250) {
  let timer = null;
  let lastArgs;
  let lastThis;
  const run = () => {
    timer = null;
    return fn.apply(lastThis, lastArgs);
  };
  function debounced(...args) {
    lastArgs = args;
    lastThis = this;
    clearTimeout(timer);
    timer = setTimeout(run, wait);
  }
  debounced.cancel = () => {
    clearTimeout(timer);
    timer = null;
  };
  debounced.flush = () => {
    if (timer === null) return undefined;
    clearTimeout(timer);
    return run();
  };
  debounced.pending = () => timer !== null;
  return debounced;
}

function throttle(fn, interval = 1000) {
  let lastRun = -Infinity;
  let timer = null;
  let lastArgs = null;
  let lastThis;
  const run = () => {
    timer = null;
    lastRun = Date.now();
    const args = lastArgs;
    lastArgs = null;
    fn.apply(lastThis, args);
  };
  function throttled(...args) {
    lastArgs = args;
    lastThis = this;
    const wait = interval - (Date.now() - lastRun);
    if (wait <= 0) {
      clearTimeout(timer);
      run();
    } else if (timer === null) {
      timer = setTimeout(run, wait);
    }
  }
  throttled.cancel = () => {
    clearTimeout(timer);
    timer = null;
    lastArgs = null;
  };
  return throttled;
}

const searchState = { query: "", results: [], loading: false, error: null, keystrokes: 0, searches: 0 };
let searchController = null;

async function runSearch(query) {
  searchController?.abort(); // a newer search makes the older answer irrelevant
  const controller = new AbortController();
  searchController = controller;
  searchState.searches++;
  searchState.loading = true;
  searchState.error = null;
  try {
    const players = await fetchWithRetry(¦/api/players?q=\${encodeURIComponent(query)}¦, { signal: controller.signal });
    searchState.results = players;
  } catch (error) {
    if (error.name !== "AbortError") searchState.error = error.message;
  } finally {
    if (searchController === controller) {
      searchController = null;
      searchState.loading = false;
    }
  }
}

const debouncedSearch = debounce(runSearch, 300);

function onSearchInput(query) {
  searchState.keystrokes++;
  searchState.query = query;
  if (!query.trim()) {
    debouncedSearch.cancel();
    searchController?.abort();
    searchController = null;
    Object.assign(searchState, { results: [], loading: false, error: null });
    return;
  }
  debouncedSearch(query);
}

function getSearchState() {
  return { ...searchState, results: [...searchState.results] };
}

const refreshStats = { clicks: 0, runs: 0, rows: 0, error: null };

const throttledRefresh = throttle(async () => {
  refreshStats.runs++;
  try {
    refreshStats.rows = (await fetchWithRetry("/api/standings")).length;
    refreshStats.error = null;
  } catch (error) {
    refreshStats.error = error.message;
  }
}, 2000);

function refreshStandings() {
  refreshStats.clicks++;
  throttledRefresh();
}

function getRefreshStats() {
  return { ...refreshStats };
}`,
    explanation:
      "retry owns the policy and knows nothing about HTTP: the task, the delay schedule, the error filter and the abort signal are all inputs. Waiting goes through abortableSleep so cancelling during a backoff rejects immediately, and the throwIfAborted check stops a cancelled loop from starting another attempt. fetchWithRetry plugs a transient-only filter into it, so a 404 fails at once but a 503 gets three more tries. debounce and throttle are closures around one timer; both keep the latest arguments and this so the call that finally runs is the freshest one. The search box composes everything: debounce limits requests, the controller aborts stale ones, and only the newest search is allowed to touch loading.",
    hints: [
      { id: "h1", title: "retry", content: "Destructure the options with defaults. Loop for (let attempt = 1; ; attempt++): signal?.throwIfAborted(); try { return await task(attempt); } catch (error) { if (attempt > retries || !shouldRetry(error, attempt)) throw error; compute delay = Math.round(Math.min(baseDelay * factor ** (attempt - 1), maxDelay) * (1 - jitter * random())); onRetry?.({ attempt, delay, error }); await abortableSleep(delay, signal); }" },
      { id: "h2", title: "Transient errors and the wrapper", content: "isTransient: if error instanceof HttpError return error.status >= 500 || error.status === 429; otherwise return error instanceof TypeError && /fetch|network|load failed/i.test(error.message). fetchWithRetry: return retry(() => fetchJson(url, { signal: options.signal }), { shouldRetry: isTransient, ...options })." },
      { id: "h3", title: "debounce, throttle, wiring", content: "debounce: keep timer, lastArgs, lastThis; each call clears the timer and sets a new one that runs fn.apply(lastThis, lastArgs). throttle: lastRun = -Infinity; wait = interval - (Date.now() - lastRun); if wait <= 0 run now, else if no timer yet set one for wait ms. Then const debouncedSearch = debounce(runSearch, 300) and const throttledRefresh = throttle(async () => {...}, 2000)." },
    ],
    tests: [
      {
        id: "t1",
        description: "retry: succeeds without waiting when the first attempt works",
        assertionCode: T(js`const attempts = [];
const t0 = sim.now();
const value = await retry(async (attempt) => { attempts.push(attempt); return "fine"; });
assertEqual(value, "fine", "the task's value is returned");
assertEqual(attempts, [1], "one attempt, numbered from 1");
assertEqual(sim.now() - t0, 0, "no waiting when nothing failed");`),
      },
      {
        id: "t2",
        description: "retry: waits 100, 200, 400 ms (exponential backoff) then gives up",
        assertionCode: T(js`let calls = 0;
const retries = [];
const failure = new Error("always down");
const t0 = sim.now();
const error = await assertRejects(retry(async () => { calls++; throw failure; }, { onRetry: (info) => retries.push([info.attempt, info.delay]) }), "always down", "gives up in the end");
assert(error === failure, "the very same error is rethrown, not a copy");
assertEqual(calls, 4, "the first try plus three retries");
assertEqual(retries, [[1, 100], [2, 200], [3, 400]], "onRetry gets the failed attempt number and the delay before the next one");
assertEqual(sim.now() - t0, 700, "100 + 200 + 400 ms of waiting");
let later = 0;
const ok = await retry(async (attempt) => { if (attempt < 3) throw new Error("not yet"); later = attempt; return "third time"; });
assertEqual([ok, later], ["third time", 3], "succeeds on the third attempt");`),
      },
      {
        id: "t3",
        description: "retry: respects maxDelay, factor, retries and shouldRetry",
        assertionCode: T(js`const delays = [];
await assertRejects(retry(async () => { throw new Error("x"); }, { retries: 4, baseDelay: 1000, factor: 10, maxDelay: 3000, onRetry: (i) => delays.push(i.delay) }), "x");
assertEqual(delays, [1000, 3000, 3000, 3000], "10x growth, capped at 3000");
let calls = 0;
await assertRejects(retry(async () => { calls++; throw new Error("y"); }, { retries: 0 }), "y");
assertEqual(calls, 1, "retries: 0 means a single attempt");
calls = 0;
const t0 = sim.now();
await assertRejects(retry(async () => { calls++; throw new TypeError("permanent"); }, { shouldRetry: (error) => !(error instanceof TypeError) }), "permanent");
assertEqual([calls, sim.now() - t0], [1, 0], "shouldRetry false stops immediately, with no waiting");
const seen = [];
await assertRejects(retry(async () => { throw new Error("z"); }, { retries: 2, shouldRetry: (error, attempt) => { seen.push(attempt); return true; } }), "z");
assertEqual(seen, [1, 2], "shouldRetry receives (error, attempt), and is not asked once the retries are used up");`),
      },
      {
        id: "t4",
        description: "retry: jitter spreads the delay, and an abort during a backoff ends it at once",
        assertionCode: T(js`const delays = [];
await assertRejects(retry(async () => { throw new Error("x"); }, { retries: 2, jitter: 1, random: () => 0.5, onRetry: (i) => delays.push(i.delay) }), "x");
assertEqual(delays, [50, 100], "jitter 1 with random() = 0.5 halves each delay");
const controller = new AbortController();
let calls = 0;
const run = retry(async () => { calls++; throw new Error("down"); }, { baseDelay: 1000, signal: controller.signal });
const outcome = assertRejects(run, undefined, "an abort rejects the retry loop");
await sim.tick(300);
controller.abort();
const error = await outcome;
assertEqual(error.name, "AbortError", "with the AbortError");
assertEqual(calls, 1, "no second attempt after the abort");
await sim.tick(5000);
assertEqual(calls, 1, "the sleeping timer was cancelled too");
const pre = new AbortController(); pre.abort();
await assertRejects(retry(async () => "never runs", { signal: pre.signal }), undefined, "an already aborted signal never starts");`),
      },
      {
        id: "t5",
        description: "HttpError and isTransient decide what is worth retrying",
        assertionCode: T(js`const e503 = new HttpError(503, "/api/x");
assert(e503 instanceof Error && e503.name === "HttpError" && e503.status === 503 && e503.url === "/api/x", "HttpError carries name, status and url");
assertEqual(e503.message, "HTTP 503 for /api/x", "message");
assert(isTransient(new HttpError(500, "/")) && isTransient(e503) && isTransient(new HttpError(429, "/")), "5xx and 429 are transient");
assert(!isTransient(new HttpError(404, "/")) && !isTransient(new HttpError(400, "/")) && !isTransient(new HttpError(401, "/")), "4xx are permanent");
assert(isTransient(new TypeError("Failed to fetch")), "a dropped connection is transient");
assert(!isTransient(new TypeError("x is not a function")), "a programming TypeError is a bug, not a network problem");
assert(!isTransient(new DOMException("aborted", "AbortError")), "cancellation is never retried");
assert(!isTransient(new Error("boom")), "unknown errors are not retried");`),
      },
      {
        id: "t6",
        description: "fetchWithRetry retries 503s with backoff and records every attempt",
        assertionCode: T(js`sim.network.failNext("/api/standings", 2, 503);
const t0 = sim.now();
const rows = await fetchWithRetry("/api/standings");
assertEqual(rows.length, 6, "the third attempt succeeds");
assertEqual(sim.now() - t0, 840, "180 (503) + 100 wait + 180 (503) + 200 wait + 180 (ok)");
const entries = sim.network.entries();
assertEqual(entries.map((e) => [e.attempt, e.status, e.code]), [[1, "http-error", 503], [2, "http-error", 503], [3, "ok", 200]], "three requests, numbered as attempts");
sim.network.failNext("/api/teams", 1, "network");
assertEqual((await fetchWithRetry("/api/teams")).length, 6, "a dropped connection is retried too");`),
      },
      {
        id: "t7",
        description: "fetchWithRetry does not retry permanent failures or aborts, and gives up after the retries",
        assertionCode: T(js`const t0 = sim.now();
const e = await assertRejects(fetchWithRetry("/api/matches/99"), "HTTP 404", "404 fails at once");
assertEqual([e.name, e.status], ["HttpError", 404], "as an HttpError");
assertEqual(sim.network.entries().length, 1, "one request only");
assertEqual(sim.now() - t0, 110, "no waiting");
sim.network.failNext("/api/standings", 10, 503);
const down = await assertRejects(fetchWithRetry("/api/standings", { retries: 2, baseDelay: 10 }), "HTTP 503", "still down after the retries");
assertEqual(down.status, 503, "the last HttpError");
assertEqual(sim.network.entries().filter((x) => x.url === "/api/standings").length, 3, "1 + 2 retries");
const controller = new AbortController();
const pending = assertRejects(fetchWithRetry("/api/standings", { signal: controller.signal }), undefined);
setTimeout(() => controller.abort(), 50);
const aborted = await pending;
assertEqual(aborted.name, "AbortError", "aborting the request aborts the retry loop with an AbortError");`),
      },
      {
        id: "t8",
        description: "debounce waits for quiet and keeps the last call",
        assertionCode: T(js`const calls = [];
const d = debounce((value) => calls.push(value), 100);
d("a"); await sim.tick(60);
d("ab"); await sim.tick(60);
d("abc");
assertEqual(calls, [], "each call restarts the timer");
assertEqual(d.pending(), true, "something is waiting");
await sim.tick(99);
assertEqual(calls, [], "99 ms after the last call is not enough");
await sim.tick(1);
assertEqual(calls, ["abc"], "exactly one call, with the LAST arguments");
assertEqual(d.pending(), false, "nothing waiting any more");
d("later"); await sim.tick(100);
assertEqual(calls, ["abc", "later"], "a new burst triggers a new call");
const holder = { n: 5, get: debounce(function () { calls.push(this.n); }, 10) };
holder.get(); await sim.tick(10);
assertEqual(calls[2], 5, "this is preserved");`),
      },
      {
        id: "t9",
        description: "debounce has cancel() and flush()",
        assertionCode: T(js`const calls = [];
const d = debounce((v) => { calls.push(v); return "ran " + v; }, 100);
d("x"); d.cancel();
await sim.tick(500);
assertEqual(calls, [], "cancel() drops the pending call");
assertEqual(d.pending(), false, "and clears pending()");
d("y");
assertEqual(d.flush(), "ran y", "flush() runs the pending call now and returns its result");
assertEqual(calls, ["y"], "it ran");
await sim.tick(500);
assertEqual(calls, ["y"], "and it does not run a second time");
assertEqual(d.flush(), undefined, "flush() with nothing pending does nothing");`),
      },
      {
        id: "t10",
        description: "throttle runs first at once, collapses the middle, and keeps the last call",
        assertionCode: T(js`const calls = [];
const t = throttle((value) => calls.push([value, Date.now() - start]), 1000);
const start = Date.now();
t("a");
assertEqual(calls, [["a", 0]], "the first call runs immediately (leading edge)");
await sim.tick(200); t("b");
await sim.tick(300); t("c");
assertEqual(calls.length, 1, "calls inside the interval are held back");
await sim.tick(499);
assertEqual(calls.length, 1, "still waiting at 999 ms");
await sim.tick(1);
assertEqual(calls, [["a", 0], ["c", 1000]], "at the end of the interval the LATEST call runs (trailing edge); b was dropped");
await sim.tick(2000); t("d");
assertEqual(calls[2], ["d", 3000], "after a quiet period the next call is immediate again");
t("e"); t.cancel();
await sim.tick(2000);
assertEqual(calls.length, 3, "cancel() drops the pending trailing call");`),
      },
      {
        id: "t11",
        description: "The search box debounces keystrokes into one request",
        assertionCode: T(js`Object.assign(searchState, { query: "", results: [], loading: false, error: null, keystrokes: 0, searches: 0 });
onSearchInput("a"); await sim.tick(100);
onSearchInput("ad"); await sim.tick(100);
onSearchInput("ada");
assertEqual(getSearchState().keystrokes, 3, "every keystroke is counted");
await sim.tick(299);
assertEqual(getSearchState().searches, 0, "no request while the user is still typing");
await sim.tick(1);
assertEqual([getSearchState().searches, getSearchState().loading], [1, true], "300 ms of quiet starts one search");
await sim.tick(150);
const state = getSearchState();
assertEqual(state.loading, false, "loading ends");
assertEqual(state.results.map((p) => p.name), ["Ada Okoro"], "results for 'ada'");
const requests = sim.network.entries().filter((e) => e.url.startsWith("/api/players"));
assertEqual(requests.map((e) => e.url), ["/api/players?q=ada"], "three keystrokes, one request");
onSearchInput("");
assertEqual(getSearchState().results, [], "a blank query clears the results");
assertEqual(sim.pending(), 0, "and leaves no timer behind");`),
      },
      {
        id: "t12",
        description: "A newer search aborts the older one, and failures land in searchState.error",
        assertionCode: T(js`Object.assign(searchState, { query: "", results: [], loading: false, error: null, keystrokes: 0, searches: 0 });
const first = runSearch("a");
const second = runSearch("hana");
await Promise.all([first, second]);
const log = sim.network.entries();
assertEqual(log.map((e) => e.status), ["aborted", "ok"], "the first request was cancelled, the second finished");
assertEqual(getSearchState().results.map((p) => p.name), ["Hana Sato"], "only the newest search's answer is shown");
assertEqual([getSearchState().loading, getSearchState().error, getSearchState().searches], [false, null, 2], "state");
sim.network.failNext("/api/players", 10, 404);
await runSearch("zzz");
assertEqual(getSearchState().error, "HTTP 404 for /api/players?q=zzz", "a failure is reported in searchState.error, not thrown");
assertEqual(getSearchState().loading, false, "and loading ends");`),
      },
      {
        id: "t13",
        description: "The refresh button is throttled to one run per two seconds",
        assertionCode: T(js`Object.assign(refreshStats, { clicks: 0, runs: 0, rows: 0, error: null });
for (let i = 0; i < 5; i++) { refreshStandings(); await sim.tick(300); }
assertEqual(getRefreshStats().clicks, 5, "all five clicks counted");
assertEqual(getRefreshStats().runs, 1, "but only the first started a refresh");
await sim.tick(500);
assertEqual(getRefreshStats().rows, 6, "the first refresh loaded the table");
await sim.tick(2000);
assertEqual(getRefreshStats().runs, 2, "the trailing call runs once the interval ends");
await sim.tick(300);
assertEqual(getRefreshStats().error, null, "no error");`),
      },
    ],
    unlocks: ["arena-retry"],
    checks: [
      {
        prompt: md`Which failures are worth retrying automatically? (Pick all that apply.)`,
        question: { type: "choice", options: ["503 Service Unavailable", "404 Not Found", "A dropped network connection", "400 Bad Request"], answer: [0, 2] },
        explanation: md`Transient problems (an overloaded server, a lost packet) often vanish on their own. A 404 or 400 is a permanent answer: the same request will get the same response, so retrying only adds load.`,
      },
      {
        prompt: md`With ¦baseDelay: 100¦ and ¦factor: 2¦, how many milliseconds does ¦retry¦ wait after the **third** failed attempt?`,
        question: { type: "number", answer: 400, unit: "ms" },
        explanation: md`The wait after failed attempt *n* is ¦100 * 2 ** (n - 1)¦: 100, 200, **400**. Exponential growth backs off quickly, and ¦maxDelay¦ stops it growing without limit.`,
      },
      {
        prompt: md`Which is the better tool for a search-as-you-type box, and which for a scroll handler?`,
        question: {
          type: "choice",
          options: ["Throttle for both", "Debounce for search, throttle for scroll", "Throttle for search, debounce for scroll", "Debounce for both"],
          answer: 1,
        },
        explanation: md`Search only cares about the final text once the user pauses, so **debounce**. A scroll handler should keep reacting while scrolling continues, just not hundreds of times a second, so **throttle**.`,
      },
    ],
  },

  // ───────────────────────────────────────── 13. iterators and generators
  {
    id: "event-arena-13-iterators",
    title: "Iterators, generators and async iterators",
    minutes: 40,
    xp: 200,
    concepts: ["iteration protocol", "Symbol.iterator", "generators", "yield*", "lazy evaluation", "async generators", "for await...of"],
    learn: md`### What for...of really does

Arrays, strings, Maps and Sets can all be used with ¦for...of¦, spread (¦[...x]¦) and destructuring. They share one small contract, the **iteration protocol**:

- An **iterable** is an object with a method named ¦[Symbol.iterator]¦ that returns an iterator.
- An **iterator** is an object with a ¦next()¦ method returning ¦{ value, done }¦. When ¦done¦ is ¦true¦ the sequence is over.

~~~js
function range(start, end) {
  let current = start;
  return {
    [Symbol.iterator]() { return this; },        // an iterator that is its own iterable
    next() {
      return current < end ? { value: current++, done: false } : { value: undefined, done: true };
    },
  };
}
[...range(0, 3)];          // [0, 1, 2]
for (const n of range(5, 8)) console.log(n);
~~~

Anything that follows the protocol plugs into the whole language. This is an interface (lesson 6) built into JavaScript, checked by duck typing. If the loop exits early (¦break¦, ¦return¦, an error) it calls the iterator's optional ¦return()¦ method so it can clean up.

### Generators: iterators you write as functions

Writing ¦next()¦ by hand is fiddly. A **generator function** (¦function*¦) writes the iterator for you. ¦yield¦ hands a value out and **pauses** the function right there until the next value is requested:

~~~js
function* range(start, end, step = 1) {
  for (let n = start; n < end; n += step) yield n;
}
function* naturals() {
  let n = 1;
  while (true) yield n++;      // an infinite sequence is fine: nothing runs until asked
}
~~~

Calling a generator function runs **none** of the body; it returns an iterator. This makes them **lazy**: values are produced one at a time, on demand. A pipeline of generators processes one item at a time through every stage, never building the intermediate arrays:

~~~js
function* take(iterable, n) {
  if (n <= 0) return;
  let count = 0;
  for (const item of iterable) {
    yield item;
    if (++count >= n) return;   // stop BEFORE pulling the next item
  }
}
[...take(filter(naturals(), isEven), 3)];   // [2, 4, 6]
~~~

Useful details:

- ¦yield* other¦ delegates to another iterable ("yield all of those").
- A class can be iterable with a generator method: ¦*[Symbol.iterator]() { yield* this.items; }¦.
- ¦try/finally¦ in a generator runs its ¦finally¦ when the consumer stops early (¦break¦ calls ¦return()¦). That is how generators release resources.
- ¦iterator.next(value)¦ can send a value back in: the ¦yield¦ expression evaluates to it (two-way communication, rarely needed).
- Modern JavaScript is adding built-in iterator helpers (¦.map¦, ¦.filter¦, ¦.take¦ directly on iterators), which are the standard version of what you write here.

### Async iterators: a sequence of promises

Now the data arrives **over time**: pages of results from the network, lines from a stream, messages from a socket. An **async iterator** is the same idea, with ¦next()¦ returning a **promise** of ¦{ value, done }¦, and an ¦[Symbol.asyncIterator]¦ method. The generator syntax is ¦async function*¦, and you consume it with ¦for await...of¦:

~~~js
async function* pages(url) {
  let cursor = 0;
  while (cursor !== null) {
    const page = await fetchJson(url + "?cursor=" + cursor);   // wait for the network...
    yield* page.items;                                         // ...then hand items out one by one
    cursor = page.next;
  }
}

for await (const event of pages("/api/matches/1/events")) {
  render(event);
  if (done) break;                  // stops fetching more pages
}
~~~

What you get for free:

- **Pull-based flow (backpressure).** The next page is requested only when the consumer asks for the next item, so a slow consumer never gets flooded and a quick ¦break¦ means no more requests.
- **Cleanup.** ¦break¦ or a thrown error calls ¦return()¦ and the generator's ¦finally¦ block runs.
- **Errors** in the producer surface as exceptions in the ¦for await¦ loop, so ¦try/catch¦ around the loop works.
- ¦for await¦ also accepts ordinary iterables (it awaits each value), and many platform APIs (streams) are async iterable.

### Common mistakes

- Expecting a generator to run when you call it. It starts at the first ¦next()¦.
- Reusing a generator: once exhausted it stays done. Call the function again for a fresh one.
- Forgetting ¦await¦ in ¦async function*¦ producers, or using ¦for...of¦ where ¦for await¦ is needed (you iterate promises instead of values).
- Collecting an infinite generator with ¦[...gen]¦ (it never ends). Limit it with ¦take¦ first.
- Loading everything into an array "to be safe" when the consumer only wants the first few items.`,
    mission: md`A finished match has dozens of events, and the API serves them a page at a time. A fan who scrubs through a replay wants the first goal now, not after every page has downloaded, and closing the replay should stop the downloads.

Build the toolkit: a hand-written iterator, lazy generators, an iterable ¦EventLog¦ class, and an async generator that streams a match page by page and cleans up when the consumer stops. The scene's Replay plays the stream into a list while the network panel shows one request per page.`,
    tasks: [
      "range(start, end, step): an iterator written by hand with next() and Symbol.iterator",
      "take, filterIter and mapIter generators, plus class EventLog with a generator [Symbol.iterator] and a lazy byType()",
      "async function* pagedEvents(matchId, { pageSize, signal }) with try/finally bookkeeping in streamStats, and collect(asyncIterable, limit)",
      "startReplay(matchId, paceMs) filling replayState one event at a time, and getReplay()",
    ],
    starterAdd: js`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 13: iterators, generators and async iterators.

// An iterator written by hand (no generator!): an object with next() and [Symbol.iterator]() { return this }.
//   [...range(0, 3)] -> [0, 1, 2]    [...range(10, 0, -5)] -> [10, 5]    range(0, Infinity) is allowed (lazy)
// step defaults to 1; a step of 0 would never finish -> throw new RangeError("step must not be 0").
function range(start, end, step = 1) {
  // TODO
}

// Generators (function*). They must be LAZY: take pulls only as many items as it yields.
function* take(iterable, count) {
  // TODO: at most count items; count <= 0 yields nothing
}
function* filterIter(iterable, predicate) {
  // TODO
}
function* mapIter(iterable, fn) {
  // TODO
}

// A list of events you can loop over with for...of, spread and destructuring.
//   log.add(event) returns the log (chainable); log.size; for (const e of log); log.byType("goal") is a LAZY generator.
class EventLog {
  // TODO
}

// Bookkeeping so we can see that streams get cleaned up.
const streamStats = { opened: 0, closed: 0 };

// Stream a match's events, a page at a time, as an async generator:
//   GET /api/matches/<id>/events?cursor=<n>&limit=<pageSize>  -> { items, next, total }   (next is null on the last page)
// Use fetchWithRetry (pass { signal }). Yield the items one by one (yield*). Fetch the next page ONLY when asked.
// streamStats.opened++ when the generator starts running, streamStats.closed++ when it ends for ANY reason (try/finally).
async function* pagedEvents(matchId, { pageSize = 5, signal } = {}) {
  // TODO
}

// Take items from an async iterable with for await. Stop (break) as soon as there are limit items. limit defaults to Infinity.
async function collect(asyncIterable, limit = Infinity) {
  // TODO
}

// What the replay panel shows.
const replayState = { matchId: null, events: [], done: true, error: null };

// Replay a match: reset replayState (done: false), then for await over pagedEvents(matchId, { pageSize: 4 }),
// pushing each event onto replayState.events. If paceMs > 0 wait paceMs (sleep) after each event.
// A failure goes into replayState.error (the message). Always set done = true at the end.
// Resolve with the number of events replayed.
async function startReplay(matchId, paceMs = 0) {
  // TODO
}

function getReplay() {
  return { ...replayState, events: [...replayState.events] };
}
`,
    solutionAdd: js`function range(start, end, step = 1) {
  if (step === 0) throw new RangeError("step must not be 0");
  let current = start;
  return {
    [Symbol.iterator]() {
      return this; // an iterator that is its own iterable
    },
    next() {
      const finished = step > 0 ? current >= end : current <= end;
      if (finished) return { value: undefined, done: true };
      const value = current;
      current += step;
      return { value, done: false };
    },
  };
}

function* take(iterable, count) {
  if (count <= 0) return;
  let taken = 0;
  for (const item of iterable) {
    yield item;
    if (++taken >= count) return; // stop before pulling one item too many
  }
}

function* filterIter(iterable, predicate) {
  for (const item of iterable) {
    if (predicate(item)) yield item;
  }
}

function* mapIter(iterable, fn) {
  for (const item of iterable) yield fn(item);
}

class EventLog {
  #events = [];

  add(event) {
    this.#events.push(event);
    return this;
  }

  get size() {
    return this.#events.length;
  }

  *[Symbol.iterator]() {
    yield* this.#events;
  }

  *byType(type) {
    for (const event of this) {
      if (event.type === type) yield event;
    }
  }
}

const streamStats = { opened: 0, closed: 0 };

async function* pagedEvents(matchId, { pageSize = 5, signal } = {}) {
  streamStats.opened++;
  try {
    let cursor = 0;
    while (cursor !== null) {
      const page = await fetchWithRetry(¦/api/matches/\${matchId}/events?cursor=\${cursor}&limit=\${pageSize}¦, { signal });
      yield* page.items;
      cursor = page.next;
    }
  } finally {
    streamStats.closed++; // runs when the stream ends, fails, or the consumer breaks out early
  }
}

async function collect(asyncIterable, limit = Infinity) {
  const items = [];
  if (limit <= 0) return items;
  for await (const item of asyncIterable) {
    items.push(item);
    if (items.length >= limit) break;
  }
  return items;
}

const replayState = { matchId: null, events: [], done: true, error: null };

async function startReplay(matchId, paceMs = 0) {
  Object.assign(replayState, { matchId, events: [], done: false, error: null });
  try {
    for await (const event of pagedEvents(matchId, { pageSize: 4 })) {
      replayState.events.push(event);
      if (paceMs > 0) await sleep(paceMs);
    }
  } catch (error) {
    replayState.error = error.message;
  } finally {
    replayState.done = true;
  }
  return replayState.events.length;
}

function getReplay() {
  return { ...replayState, events: [...replayState.events] };
}`,
    explanation:
      "range implements the protocol by hand so you can see it: next() returns { value, done } and Symbol.iterator returns the object itself, which is why for...of, spread and take all accept it. The generators are the same idea with less ceremony; take returns right after yielding its last item so it never pulls one element too many, and returning from inside for...of closes the source iterator (running its finally). EventLog gets for...of, spread and destructuring from a single generator method. pagedEvents is pull-based: a page is requested only when the consumer has used up the previous one, so collect(..., 6) costs two requests and collect(..., 3) costs one. The try/finally inside it is what makes cleanup reliable: it runs on completion, on an error and on break.",
    hints: [
      { id: "h1", title: "range and the generators", content: "range returns an object with [Symbol.iterator]() { return this } and next(): compute finished from the step direction, otherwise return { value: current, done: false } and advance current. take: if (count <= 0) return; let taken = 0; for (const item of iterable) { yield item; if (++taken >= count) return; }. filterIter and mapIter are one-line for...of loops with yield." },
      { id: "h2", title: "EventLog and pagedEvents", content: "EventLog: keep #events, add() pushes and returns this, *[Symbol.iterator]() { yield* this.#events; }, *byType(type) { for (const event of this) if (event.type === type) yield event; }. pagedEvents: streamStats.opened++; try { let cursor = 0; while (cursor !== null) { const page = await fetchWithRetry(`/api/matches/${matchId}/events?cursor=${cursor}&limit=${pageSize}`, { signal }); yield* page.items; cursor = page.next; } } finally { streamStats.closed++; }" },
      { id: "h3", title: "collect and replay", content: "collect: const items = []; if (limit <= 0) return items; for await (const item of asyncIterable) { items.push(item); if (items.length >= limit) break; } return items. startReplay: Object.assign(replayState, { matchId, events: [], done: false, error: null }); try { for await (const event of pagedEvents(...)) { push; if (paceMs > 0) await sleep(paceMs); } } catch (error) { replayState.error = error.message } finally { replayState.done = true }; return replayState.events.length." },
    ],
    tests: [
      {
        id: "t1",
        description: "range is a hand-written iterator",
        assertionCode: T(js`const it = range(0, 2);
assertEqual(it.next(), { value: 0, done: false }, "first next()");
assertEqual(it.next(), { value: 1, done: false }, "second next()");
const end = it.next();
assertEqual([end.value, end.done], [undefined, true], "then done");
assertEqual(it.next().done, true, "and it stays done");
assertEqual([...range(0, 4)], [0, 1, 2, 3], "spread works because of Symbol.iterator");
assertEqual([...range(10, 0, -5)], [10, 5], "a negative step counts down");
assertEqual([...range(5, 5)], [], "an empty range");
assertEqual([...range(3, 0)], [], "start past end with a positive step is empty");
assertEqual(typeof range(0, 1)[Symbol.iterator], "function", "it is iterable");
const seen = [];
for (const n of range(1, 4)) seen.push(n * 10);
assertEqual(seen, [10, 20, 30], "for...of works");
assertThrows(() => range(0, 5, 0), "step must not be 0", "step 0");`),
      },
      {
        id: "t2",
        description: "take, filterIter and mapIter are lazy and compose",
        assertionCode: T(js`assertEqual([...take(range(0, Infinity), 3)], [0, 1, 2], "take stops an infinite sequence");
assertEqual([...take([1, 2], 5)], [1, 2], "take of fewer items than asked");
assertEqual([...take([1, 2], 0)], [], "take 0 yields nothing");
const evens = filterIter(range(1, Infinity), (n) => n % 2 === 0);
const squares = mapIter(evens, (n) => n * n);
assertEqual([...take(squares, 3)], [4, 16, 36], "a lazy pipeline: filter, then map, then take");
assert(typeof take(range(0, 3), 1).next === "function", "take returns an iterator (it is a generator)");
const produced = [];
function* source() { for (let i = 1; ; i++) { produced.push(i); yield i; } }
assertEqual([...take(source(), 2)], [1, 2], "values");
assertEqual(produced, [1, 2], "take(…, 2) must pull exactly two items, not three");`),
      },
      {
        id: "t3",
        description: "Leaving early closes the source (its finally runs)",
        assertionCode: T(js`let closed = 0;
function* resource() {
  try { for (let i = 1; ; i++) yield i; } finally { closed++; }
}
[...take(resource(), 2)];
assertEqual(closed, 1, "take returns early, which closes the generator it was reading");
for (const n of filterIter(resource(), (x) => x > 1)) { if (n >= 3) break; }
assertEqual(closed, 2, "break inside for...of closes it as well");`),
      },
      {
        id: "t4",
        description: "EventLog is iterable and has a lazy byType",
        assertionCode: T(js`const log = new EventLog();
const a = _ev("goal", "fal", 5); const b = _ev("foul", "wol", 9); const c = _ev("goal", "wol", 20);
assert(log.add(a) === log, "add returns the log so calls chain");
log.add(b).add(c);
assertEqual(log.size, 3, "size");
assertEqual([...log].map((e) => e.minute), [5, 9, 20], "spread follows insertion order");
const seen = [];
for (const e of log) seen.push(e.type);
assertEqual(seen, ["goal", "foul", "goal"], "for...of");
const [first, second] = log;
assertEqual([first.minute, second.minute], [5, 9], "destructuring");
assertEqual([...log], [...log], "it can be iterated again and again");
assertEqual([...log.byType("goal")].map((e) => e.minute), [5, 20], "byType filters");
const lazy = log.byType("foul");
log.add(_ev("foul", "fal", 44));
assertEqual([...lazy].map((e) => e.minute), [9, 44], "byType is lazy: it sees events added before the first next()");
assertEqual(typeof log.byType("goal").next, "function", "byType returns an iterator");`),
      },
      {
        id: "t5",
        description: "pagedEvents streams every event, one page per request",
        assertionCode: T(js`const opened = streamStats.opened, closed = streamStats.closed;
const all = [];
for await (const event of pagedEvents(1)) all.push(event);
assertEqual(all.length, 12, "all twelve events of match 1");
assertEqual(all.map((e) => e.minute), [...all.map((e) => e.minute)].sort((x, y) => x - y), "in order");
const requests = sim.network.entries().filter((e) => e.url.startsWith("/api/matches/1/events"));
assertEqual(requests.map((e) => e.url), ["/api/matches/1/events?cursor=0&limit=5", "/api/matches/1/events?cursor=5&limit=5", "/api/matches/1/events?cursor=10&limit=5"], "three pages of five");
assertEqual([streamStats.opened - opened, streamStats.closed - closed], [1, 1], "the stream was opened and closed once");
const small = [];
for await (const event of pagedEvents(1, { pageSize: 12 })) small.push(event);
assertEqual(sim.network.entries().filter((e) => e.url.startsWith("/api/matches/1/events")).length, 4, "pageSize 12 needs a single request");`),
      },
      {
        id: "t6",
        description: "collect stops early: only the pages it needs are fetched",
        assertionCode: T(js`const opened = streamStats.opened, closed = streamStats.closed;
const three = await collect(pagedEvents(1), 3);
assertEqual(three.length, 3, "three events");
assertEqual(sim.network.entries().filter((e) => e.url.startsWith("/api/matches/1/events")).length, 1, "one page was enough");
const six = await collect(pagedEvents(1), 6);
assertEqual(six.length, 6, "six events");
assertEqual(sim.network.entries().filter((e) => e.url.startsWith("/api/matches/1/events")).length, 3, "the second collect needed two more pages (1 + 2 = 3 requests in total)");
assertEqual([streamStats.opened - opened, streamStats.closed - closed], [2, 2], "breaking out of for await closes the generator (finally ran)");
assertEqual(await collect(pagedEvents(1), 0), [], "limit 0 returns nothing");
assertEqual((await collect(pagedEvents(3))).length, 9, "without a limit it collects everything (match 3 has 9 events)");`),
      },
      {
        id: "t7",
        description: "Errors and aborts surface in the loop and still close the stream",
        assertionCode: T(js`const opened = streamStats.opened, closed = streamStats.closed;
const error = await assertRejects(collect(pagedEvents(99)), "HTTP 404", "an unknown match fails with the HttpError");
assertEqual(error.name, "HttpError", "the error type is kept");
sim.network.failNext("/api/matches/1/events?cursor=5", 1, 404);
const seen = [];
await assertRejects((async () => { for await (const e of pagedEvents(1)) seen.push(e); })(), "HTTP 404", "a failure on the second page");
assertEqual(seen.length, 5, "events from the first page were delivered before the failure");
const controller = new AbortController();
const stream = collect(pagedEvents(1, { signal: controller.signal }));
const outcome = assertRejects(stream, undefined);
await sim.tick(40);
controller.abort();
assertEqual((await outcome).name, "AbortError", "aborting rejects the loop with an AbortError");
assertEqual(streamStats.closed - closed, streamStats.opened - opened, "every opened stream was closed again, whatever happened");`),
      },
      {
        id: "t8",
        description: "startReplay fills replayState as the pages arrive",
        assertionCode: T(js`const run = startReplay(1);
assertEqual(getReplay().done, false, "running");
await sim.tick(85);
assertEqual(getReplay().events.length, 4, "after the first page (80 ms) four events are in");
await sim.tick(80);
assertEqual(getReplay().events.length, 8, "after the second page, eight");
const count = await run;
assertEqual(count, 12, "startReplay resolves with the number of events");
const state = getReplay();
assertEqual([state.matchId, state.done, state.error, state.events.length], [1, true, null, 12], "final state");
const copy = getReplay(); copy.events.push("junk");
assertEqual(getReplay().events.length, 12, "getReplay returns a copy");
const bad = await startReplay(99);
assertEqual(bad, 0, "an unknown match replays nothing");
assertEqual([getReplay().done, getReplay().error], [true, "HTTP 404 for /api/matches/99/events?cursor=0&limit=4"], "the failure is recorded, not thrown");
const t0 = sim.now();
await startReplay(3, 100);
assertEqual(sim.now() - t0, 3 * 80 + 9 * 100, "paceMs adds a pause after each of the 9 events of match 3, plus 3 page requests of 80 ms");`),
      },
    ],
    unlocks: ["arena-replay"],
    checks: [
      {
        prompt: md`~~~js
function* numbers() {
  console.log("start");
  yield 1;
  yield 2;
}
const it = numbers();
console.log("created");
it.next();
~~~
What is printed, in order?`,
        question: { type: "choice", options: ["start, created", "created, start", "created only", "start only"], answer: 1 },
        explanation: md`Calling a generator function runs none of its body: it just creates the iterator, so ¦created¦ prints first. The body starts running at the first ¦next()¦ and pauses at the first ¦yield¦.`,
      },
      {
        prompt: md`A consumer uses ¦for await (const e of pagedEvents(1))¦ and ¦break¦s after the 3rd event. What happens to the generator?`,
        question: {
          type: "choice",
          options: [
            "It keeps fetching pages in the background",
            "It is closed: ¦return()¦ is called, its ¦finally¦ block runs and no more pages are requested",
            "It throws an error",
            "It restarts from the first page",
          ],
          answer: 1,
        },
        explanation: md`Leaving a ¦for await¦ loop early calls the iterator's ¦return()¦. The generator resumes at the paused ¦yield¦ as if a ¦return¦ had happened there, runs its ¦finally¦ blocks and finishes, which is why putting cleanup in ¦finally¦ is reliable.`,
      },
    ],
  },

  // ───────────────────────────────────────── 14. the real-time pipeline
  {
    id: "event-arena-14-pipeline",
    title: "A real-time event pipeline",
    minutes: 45,
    xp: 260,
    concepts: ["pipeline stages", "backpressure", "error boundaries", "deduplication", "promise caching", "graceful shutdown"],
    learn: md`### Putting it all together

Real systems rarely call one function. They run a **pipeline**: events flow through a series of small stages, each doing one job, ending at the bus that your listeners subscribe to. You already own every ingredient:

| Piece | From |
| --- | --- |
| Stages as small, replaceable units with a shared contract | closures, duck typing (lessons 2, 6) |
| Combining behaviour from parts | higher-order functions (4) |
| Delivering results to unknown listeners, isolating crashes | EventEmitter and ArenaBus (7, 8) |
| Waiting without blocking, parallel vs sequential | event loop, promises, async/await (9-11) |
| Cancelling, retrying | AbortController, retry (11, 12) |
| Consuming a stream on demand | async iterators (13) |

### The design

~~~
source (async iterable) -> validate -> dedupe -> enrich -> bus.emit(type, event) -> listeners
~~~

**A stage is an object with a name and a ¦run(event)¦ function.** It returns the event (possibly changed), ¦null¦ to **drop** it, or throws to **fail**. ¦run¦ may be async. Because the contract is just "has ¦name¦ and ¦run¦" (duck typing), tests can pass tiny fake stages and you can add a stage without touching the pipeline.

**An error boundary per event.** One malformed event from a flaky feed must never stop the stream. The pipeline catches each failure, wraps it in a ¦PipelineError¦ that remembers *which stage* and *which event*, announces it on the bus as ¦"pipeline:error"¦ (not ¦"error"¦: that name throws when nobody listens) and carries on with the next event. This is the same idea as dead letters (lesson 8).

**Backpressure and order.** Using ¦for await¦ and awaiting each event's processing before pulling the next means events are handled **one at a time, in order**, and a slow stage naturally slows the source (the generator is only resumed when asked). If you start every event's work at once (¦Promise.all(events.map(process))¦), a slow event could be overtaken by a later one and memory could balloon. Choose concurrency deliberately: sequential is the safe default.

**Deduplication.** Feeds redeliver (retries, reconnects), so processing must be *idempotent*. A stage remembers recent event ids in a ¦Set¦ with a bounded window, so memory stays flat on an endless stream.

**Caching a promise, not a value.** Enrichment needs the team list. Fetching it per event would be absurd; caching only after it arrives lets ten simultaneous events start ten requests. Cache the **promise** instead, so all callers share one request, and forget it if it fails so the next call can retry:

~~~js
let teamsPromise = null;
function loadTeams() {
  teamsPromise ??= getJson("/api/teams").catch((error) => {
    teamsPromise = null;           // do not cache failures
    throw error;
  });
  return teamsPromise;
}
~~~

**Graceful shutdown.** A long-running feed needs an off switch: an ¦AbortController¦ whose signal is checked each loop. When aborted, the loop ends *normally* (an AbortError is the expected way to stop) and ¦finally¦ blocks release resources.

**Observability.** Count what happens: received, delivered, dropped, failed. When something looks wrong in production, counters are the first thing you check.

### Testing async pipelines

Everything here is testable without waiting because time is virtual: feed an array or a small async generator into ¦run¦, ¦await sim.tick(...)¦ for timing, break things with ¦sim.network.failNext¦ and assert on the stats and on what reached the bus.

### Where to go from here

You now know how JavaScript decides *when* code runs. Next steps in the real world: Web Workers for CPU-heavy work, streams (¦ReadableStream¦ is async iterable), WebSockets and Server-Sent Events as the real "live feed", a schema validator (zod, valibot) for the validate stage, and TypeScript to write the stage contract once and have the compiler check every stage.

### Common mistakes

- Letting one bad event reject the whole stream.
- Processing events concurrently when order matters.
- An unbounded "seen" set (a memory leak that appears after days).
- Caching a rejected promise forever.
- Emitting the special ¦"error"¦ event with no listener: it throws.
- Stopping a feed by ignoring its results instead of aborting its work.`,
    mission: md`Match day. Events pour in from a feed that sometimes sends garbage, sometimes sends the same goal twice, and always needs enriching with team details before the fans see it. You have the parts; now build the engine.

Create the validate, dedupe and enrich stages and the pipeline that runs them with error boundaries and counters. Start a feed from the replay source, stop it with an abort, and watch the scene's Pipeline panel: events flow through your stages, duplicates drop out, malformed ones land in the failure list, and the scoreboard still ticks because the pipeline finishes by emitting on your bus. In the scene, the live match itself now enters through your ¦processEvent¦.`,
    tasks: [
      "PipelineError, validateStage and createDedupeStage(window): stages are { name, run(event) }; null drops, a throw fails",
      "loadTeams() caches the promise (and forgets failures); enrichStage adds teamName, city and receivedAt",
      "createPipeline({ stages, bus }): process(event) -> \"delivered\" | \"dropped\" | \"failed\", run(source, { signal }) one at a time, stats()",
      "The arena pipeline: processEvent, pipelineStats, recentFailures, startFeed(matchId) and stopFeed()",
    ],
    starterAdd: js`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 14: the real-time pipeline. Everything from the course comes together here.
//
// A STAGE is an object { name, run(event) }. run may be async. It returns:
//   the event (maybe a new object)  -> carry on to the next stage
//   null or undefined               -> drop the event
// or it throws                      -> the event failed at this stage.

// error.stage is the stage name, error.event the raw event, error.cause the original error,
// message 'Stage "validate" failed: invalid event: unknown team zzz', name "PipelineError".
class PipelineError extends Error {
  // TODO
}

const EVENT_TYPES = ["goal", "foul", "timeout", "card"];

// Throws a TypeError("invalid event: <problem>") unless the event is an object with
//   a whole-number id, a type in EVENT_TYPES, a team in TEAM_NAMES (own keys only) and a minute from 0 to 130.
// Problems, in this order: "not an object", "id must be a whole number", "unknown type <type>",
//   "unknown team <team>", "minute must be between 0 and 130". Returns the event when it is fine.
const validateStage = {
  name: "validate",
  run(event) {
    // TODO
  },
};

// A fresh stage every call: remembers the last 'window' event ids; an id it has seen -> drop (null).
// When it remembers more than window ids it forgets the oldest.
function createDedupeStage(window = 500) {
  // TODO
}

// One shared request for the team list: cache the PROMISE, and forget it again if the request fails.
let teamsPromise = null;
function loadTeams() {
  // TODO (use getJson("/api/teams"))
}

// Returns a NEW event with teamName and city from the team list, plus receivedAt: Date.now(). Never changes its input.
const enrichStage = {
  name: "enrich",
  async run(event) {
    // TODO
  },
};

// The engine.
//   process(raw)  runs the stages in order (awaiting each) and resolves "delivered", "dropped" or "failed".
//       A throw in a stage: failed++ and bus.emit("pipeline:error", new PipelineError(stage.name, raw, error)), then stop for this event.
//       A drop: dropped++ . Otherwise bus.emit(event.type, event), delivered++.
//       received++ for every event, first thing.
//   run(source, { signal })  for await over source (async OR sync iterable), process each event BEFORE pulling the next,
//       signal?.throwIfAborted() each time round. An AbortError ends the loop normally; any other error is rethrown.
//       Resolves { received, delivered, dropped, failed, stopped } (stopped is true when it ended because of an abort).
//   stats()  a copy of the counters   reset()  zero them
function createPipeline({ stages, bus }) {
  // TODO
}

// ── the arena's own pipeline ──
const pipelineFailures = []; // newest 20: { stage, message, eventId }

// Record every "pipeline:error" announced on arena into pipelineFailures (keep the newest 20).
// (arena.on("pipeline:error", ...))

const pipeline = undefined; // createPipeline with validateStage, createDedupeStage(), enrichStage, publishing to arena

// What the scene calls for each live event.
function processEvent(event) {
  // TODO
}
function pipelineStats() {
  // TODO
}
function recentFailures() {
  // TODO: copies of pipelineFailures
}

// Replay a match through the pipeline: pagedEvents(matchId, { signal, pageSize: 4 }) -> pipeline.run.
// Starting a feed stops the previous one. Resolves with pipeline.run's result. stopFeed() aborts it and returns true
// (false when no feed is running).
let feedController = null;
function startFeed(matchId) {
  // TODO
}
function stopFeed() {
  // TODO
}
`,
    solutionAdd: js`class PipelineError extends Error {
  constructor(stage, event, cause) {
    super(¦Stage "\${stage}" failed: \${cause?.message ?? cause}¦, { cause });
    this.name = "PipelineError";
    this.stage = stage;
    this.event = event;
  }
}

const EVENT_TYPES = ["goal", "foul", "timeout", "card"];

const validateStage = {
  name: "validate",
  run(event) {
    let problem = null;
    if (!event || typeof event !== "object") problem = "not an object";
    else if (!Number.isInteger(event.id)) problem = "id must be a whole number";
    else if (!EVENT_TYPES.includes(event.type)) problem = ¦unknown type \${String(event.type)}¦;
    else if (!Object.hasOwn(TEAM_NAMES, event.team)) problem = ¦unknown team \${String(event.team)}¦;
    else if (!(Number.isFinite(event.minute) && event.minute >= 0 && event.minute <= 130)) problem = "minute must be between 0 and 130";
    if (problem) throw new TypeError(¦invalid event: \${problem}¦);
    return event;
  },
};

function createDedupeStage(window = 500) {
  const seen = new Set();
  return {
    name: "dedupe",
    run(event) {
      if (seen.has(event.id)) return null;
      seen.add(event.id);
      if (seen.size > window) seen.delete(seen.values().next().value); // forget the oldest id
      return event;
    },
  };
}

let teamsPromise = null;
function loadTeams() {
  teamsPromise ??= getJson("/api/teams").catch((error) => {
    teamsPromise = null; // never cache a failure
    throw error;
  });
  return teamsPromise;
}

const enrichStage = {
  name: "enrich",
  async run(event) {
    const teams = await loadTeams();
    const team = teams.find((candidate) => candidate.id === event.team);
    return { ...event, teamName: team?.name ?? TEAM_NAMES[event.team], city: team?.city ?? null, receivedAt: Date.now() };
  },
};

function createPipeline({ stages, bus }) {
  const stats = { received: 0, delivered: 0, dropped: 0, failed: 0 };

  async function process(raw) {
    stats.received++;
    let event = raw;
    for (const stage of stages) {
      try {
        event = await stage.run(event);
      } catch (error) {
        stats.failed++;
        bus.emit("pipeline:error", new PipelineError(stage.name, raw, error));
        return "failed";
      }
      if (event == null) {
        stats.dropped++;
        return "dropped";
      }
    }
    bus.emit(event.type, event);
    stats.delivered++;
    return "delivered";
  }

  async function run(source, { signal } = {}) {
    let stopped = false;
    try {
      // one event at a time: the next one is pulled only when this one is done (backpressure, and order is kept)
      for await (const raw of source) {
        signal?.throwIfAborted();
        await process(raw);
      }
    } catch (error) {
      if (error?.name !== "AbortError") throw error;
      stopped = true;
    }
    return { ...stats, stopped };
  }

  return {
    process,
    run,
    stats: () => ({ ...stats }),
    reset: () => Object.assign(stats, { received: 0, delivered: 0, dropped: 0, failed: 0 }),
  };
}

const pipelineFailures = [];

arena.on("pipeline:error", (failure) => {
  pipelineFailures.push({ stage: failure.stage, message: failure.message, eventId: failure.event?.id ?? null });
  if (pipelineFailures.length > 20) pipelineFailures.shift();
});

const pipeline = createPipeline({ stages: [validateStage, createDedupeStage(), enrichStage], bus: arena });

function processEvent(event) {
  return pipeline.process(event);
}

function pipelineStats() {
  return pipeline.stats();
}

function recentFailures() {
  return pipelineFailures.map((failure) => ({ ...failure }));
}

let feedController = null;

function startFeed(matchId) {
  stopFeed();
  const controller = new AbortController();
  feedController = controller;
  return pipeline.run(pagedEvents(matchId, { signal: controller.signal, pageSize: 4 }), { signal: controller.signal }).finally(() => {
    if (feedController === controller) feedController = null;
  });
}

function stopFeed() {
  if (!feedController) return false;
  feedController.abort();
  feedController = null;
  return true;
}`,
    explanation:
      "Each stage is a tiny object with one job, so adding or reordering stages never touches the engine. process is the error boundary: every failure becomes a PipelineError that remembers its stage and event, is announced on the bus and counted, and the next event is processed as if nothing happened. run uses for await plus an awaited process, so events are handled strictly one at a time and the source is only resumed when the pipeline is ready. Aborting ends the loop normally and still closes the source generator. loadTeams caches the promise so ten simultaneous events share one request, and clears it on failure so the next event retries. The finishing touch, bus.emit, hands the clean event to your scoreboard, stats desk and anything else subscribed: the pipeline knows nothing about them.",
    hints: [
      { id: "h1", title: "Stages", content: "PipelineError: super(`Stage \"${stage}\" failed: ${cause?.message ?? cause}`, { cause }), then set name, stage and event. validateStage.run: set let problem = null, check the five conditions in order (else-if chain) and throw new TypeError(`invalid event: ${problem}`) if one failed; otherwise return event. createDedupeStage: a Set of ids; after adding, if seen.size > window delete seen.values().next().value." },
      { id: "h2", title: "Cache the promise", content: "teamsPromise ??= getJson(\"/api/teams\").catch((error) => { teamsPromise = null; throw error; }); return teamsPromise. enrichStage.run: const teams = await loadTeams(); find the team by id; return { ...event, teamName, city, receivedAt: Date.now() }." },
      { id: "h3", title: "Engine and wiring", content: "process: stats.received++; loop over stages with try { event = await stage.run(event) } catch (error) { stats.failed++; bus.emit(\"pipeline:error\", new PipelineError(stage.name, raw, error)); return \"failed\" }, and if (event == null) { stats.dropped++; return \"dropped\" }. After the loop bus.emit(event.type, event); stats.delivered++; return \"delivered\". run: for await (const raw of source) { signal?.throwIfAborted(); await process(raw); } inside try/catch that swallows only AbortError." },
    ],
    tests: [
      {
        id: "t1",
        description: "validateStage accepts good events and explains bad ones",
        assertionCode: T(js`assertEqual(validateStage.name, "validate", "stage name");
const good = _ev("goal", "fal", 12);
assert(validateStage.run(good) === good, "a valid event is returned as it is");
assertThrows(() => validateStage.run(null), "invalid event: not an object", "null");
assertThrows(() => validateStage.run({ ...good, id: "7" }), "invalid event: id must be a whole number", "id");
assertThrows(() => validateStage.run({ ...good, type: "penalty" }), "invalid event: unknown type penalty", "type");
assertThrows(() => validateStage.run({ ...good, team: "zzz" }), "invalid event: unknown team zzz", "team");
assertThrows(() => validateStage.run({ ...good, team: "toString" }), "unknown team toString", "inherited keys are not teams");
assertThrows(() => validateStage.run({ ...good, minute: -1 }), "invalid event: minute must be between 0 and 130", "negative minute");
assertThrows(() => validateStage.run({ ...good, minute: 131 }), "minute must be between 0 and 130", "too late");
assertThrows(() => validateStage.run({ ...good, minute: "9" }), "TypeError", "text minute");
assertEqual(validateStage.run({ ...good, minute: 130 }).minute, 130, "130 is the last allowed minute");`),
      },
      {
        id: "t2",
        description: "createDedupeStage drops repeats within its window",
        assertionCode: T(js`const stage = createDedupeStage();
assertEqual(stage.name, "dedupe", "stage name");
const e1 = _ev("goal"); const e2 = _ev("foul");
assert(stage.run(e1) === e1 && stage.run(e2) === e2, "first sightings pass through");
assertEqual(stage.run(e1), null, "a repeat is dropped (null)");
assertEqual(stage.run({ ...e2 }), null, "a copy with the same id is a repeat too");
const other = createDedupeStage();
assert(other.run(e1) === e1, "each stage has its own memory");
const small = createDedupeStage(2);
const [a, b, c] = [_ev("goal"), _ev("goal"), _ev("goal")];
small.run(a); small.run(b); small.run(c);
assert(small.run(a) === a, "with a window of 2 the oldest id (a) was forgotten, so it passes again");
assertEqual(small.run(c), null, "but a recent one is still remembered");`),
      },
      {
        id: "t3",
        description: "loadTeams shares one request and never caches a failure",
        assertionCode: T(js`teamsPromise = null;
const [x, y, z] = await Promise.all([loadTeams(), loadTeams(), loadTeams()]);
assert(x === y && y === z, "all callers get the same list");
assertEqual(sim.network.entries().filter((e) => e.url === "/api/teams").length, 1, "three callers, one request");
await loadTeams();
assertEqual(sim.network.entries().filter((e) => e.url === "/api/teams").length, 1, "later calls reuse the cached promise");
teamsPromise = null;
sim.network.failNext("/api/teams", 1, 503);
await assertRejects(loadTeams(), "HTTP 503", "the first call fails");
assertEqual((await loadTeams()).length, 6, "the failure was not cached: the next call asks again");
teamsPromise = null;`),
      },
      {
        id: "t4",
        description: "enrichStage adds team details without changing its input",
        assertionCode: T(js`teamsPromise = null;
const input = { id: 5, type: "foul", team: "orc", minute: 33 };
const frozen = JSON.stringify(input);
const out = await enrichStage.run(input);
assertEqual([out.teamName, out.city], ["Orcas", "Oban"], "name and city from the team list");
assertEqual([out.id, out.type, out.minute], [5, "foul", 33], "the rest of the event is kept");
assertEqual(out.receivedAt, Date.now(), "receivedAt is the current time");
assert(out !== input && JSON.stringify(input) === frozen, "a new object is returned and the original is untouched");
assertEqual(enrichStage.name, "enrich", "stage name");
teamsPromise = null;`),
      },
      {
        id: "t5",
        description: "process reports delivered, dropped and failed, and emits only good events",
        assertionCode: T(js`const bus = new ArenaBus();
const delivered = [], failures = [];
bus.on("goal", (e) => delivered.push(e));
bus.on("foul", (e) => delivered.push(e));
bus.on("pipeline:error", (f) => failures.push(f));
const p = createPipeline({ stages: [validateStage, createDedupeStage(), enrichStage], bus });
const goal = _ev("goal", "fal", 10);
assertEqual(await p.process(goal), "delivered", "a good event");
assertEqual(await p.process(goal), "dropped", "the same id again");
assertEqual(await p.process({ id: 99, type: "goal", team: "zzz", minute: 5 }), "failed", "an invalid event");
assertEqual(await p.process(_ev("foul", "wol", 20)), "delivered", "the stream carries on after a failure");
assertEqual(p.stats(), { received: 4, delivered: 2, dropped: 1, failed: 1 }, "counters");
assertEqual(delivered.map((e) => [e.type, e.teamName]), [["goal", "Falcons"], ["foul", "Wolves"]], "listeners received the ENRICHED events");
assertEqual(failures.length, 1, "one pipeline:error announced");
const failure = failures[0];
assert(failure instanceof PipelineError && failure.stage === "validate", "a PipelineError that names the stage");
assertEqual(failure.message, 'Stage "validate" failed: invalid event: unknown team zzz', "message");
assert(failure.event.id === 99 && failure.cause instanceof TypeError, "it keeps the raw event and the cause");
p.reset();
assertEqual(p.stats().received, 0, "reset zeroes the counters");`),
      },
      {
        id: "t6",
        description: "A stage that throws late (async) only fails that event",
        assertionCode: T(js`const bus = new ArenaBus();
const seen = [];
bus.on("goal", (e) => seen.push(e.id));
const flaky = { name: "flaky", async run(event) { await sleep(5); if (event.minute === 13) throw new Error("kaput"); return event; } };
const p = createPipeline({ stages: [flaky], bus });
const results = [];
for (const minute of [10, 13, 20]) results.push(await p.process({ id: minute, type: "goal", team: "fal", minute }));
assertEqual(results, ["delivered", "failed", "delivered"], "outcomes");
assertEqual(seen, [10, 20], "only the good events reached the listeners");
assertEqual(p.stats().failed, 1, "one failure counted");
const cut = createPipeline({ stages: [{ name: "gate", run: (e) => (e.minute > 50 ? null : e) }], bus });
assertEqual([await cut.process({ id: 1, type: "goal", minute: 60 }), await cut.process({ id: 2, type: "goal", minute: 10 })], ["dropped", "delivered"], "undefined/null drops; a stage can be any plain object");`),
      },
      {
        id: "t7",
        description: "run processes a source one event at a time, in order",
        assertionCode: T(js`const bus = new ArenaBus();
const order = [];
bus.on("goal", (e) => order.push(e.id));
const slowFirst = { name: "slow", async run(event) { await sleep(event.id === 1 ? 100 : 0); return event; } };
const p = createPipeline({ stages: [slowFirst], bus });
const events = [1, 2, 3].map((id) => ({ id, type: "goal", team: "fal", minute: id }));
const result = await p.run(events);
assertEqual(order, [1, 2, 3], "event 1 is slow but must still be delivered first (do not process concurrently)");
assertEqual(result, { received: 3, delivered: 3, dropped: 0, failed: 0, stopped: false }, "run resolves with the stats");
async function* generated() { for (const e of events) { await sleep(10); yield { ...e, id: e.id + 10 }; } }
const second = await p.run(generated());
assertEqual([second.received, second.delivered], [6, 6], "an async generator works as a source (stats are cumulative)");
async function* broken() { yield events[0]; throw new Error("feed lost"); }
await assertRejects(p.run(broken()), "feed lost", "an error in the source itself is not swallowed");`),
      },
      {
        id: "t8",
        description: "run stops cleanly on abort and closes the source",
        assertionCode: T(js`const bus = new ArenaBus();
let closed = false;
async function* endless() {
  try { for (let id = 1; ; id++) { await sleep(10); yield { id, type: "goal", team: "fal", minute: 1 }; } } finally { closed = true; }
}
const p = createPipeline({ stages: [], bus });
const controller = new AbortController();
setTimeout(() => controller.abort(), 55);
const result = await p.run(endless(), { signal: controller.signal });
assertEqual(result.stopped, true, "stopped is true after an abort");
assertEqual(result.received, 5, "five events arrived in 55 ms");
assertEqual(closed, true, "the source generator was closed (its finally ran)");
const pre = new AbortController(); pre.abort();
const none = await createPipeline({ stages: [], bus }).run([{ id: 1, type: "goal", minute: 1 }], { signal: pre.signal });
assertEqual([none.received, none.stopped], [0, true], "an already aborted signal processes nothing");`),
      },
      {
        id: "t9",
        description: "The arena pipeline publishes to arena and records failures",
        assertionCode: T(js`scoreboard.reset(); resetReporters(); arena.clearLetters(); pipeline.reset(); pipelineFailures.length = 0;
assert(pipeline && typeof pipeline.process === "function", "pipeline should come from createPipeline");
assertEqual(await processEvent(_ev("goal", "lyn", 20, { id: 9001 })), "delivered", "a goal goes through");
assertEqual(scoreboard.score("lyn"), 1, "and the scoreboard (subscribed to arena) counted it");
assertEqual(summaries().goals, { lyn: 1 }, "and so did the goals reporter");
assertEqual(await processEvent(_ev("goal", "lyn", 20, { id: 9001 })), "dropped", "a duplicate");
assertEqual(scoreboard.score("lyn"), 1, "which does not count twice");
assertEqual(await processEvent({ type: "goal", team: "lyn" }), "failed", "garbage");
assertEqual(pipelineStats(), { received: 3, delivered: 1, dropped: 1, failed: 1 }, "stats");
const failures = recentFailures();
assertEqual(failures.length, 1, "one failure recorded");
assertEqual([failures[0].stage, failures[0].eventId], ["validate", null], "stage and event id (null when there is none)");
assert(failures[0].message.includes("invalid event: id must be a whole number"), "message: " + failures[0].message);
failures[0].stage = "tampered";
assertEqual(recentFailures()[0].stage, "validate", "recentFailures returns copies");
scoreboard.reset(); resetReporters(); pipeline.reset(); pipelineFailures.length = 0;`),
      },
      {
        id: "t10",
        description: "startFeed replays a match through the pipeline, stopFeed ends it",
        assertionCode: T(js`scoreboard.reset(); resetReporters(); pipeline.reset(); pipelineFailures.length = 0;
const result = await startFeed(1);
assertEqual([result.received, result.delivered, result.dropped, result.failed, result.stopped], [12, 12, 0, 0, false], "all twelve events of match 1 were delivered");
assertEqual([scoreboard.score("fal"), scoreboard.score("wol")], [3, 1], "the scoreboard shows the final score of the match, 3-1");
assertEqual(stopFeed(), false, "nothing to stop once the feed has finished");
pipeline.reset();
const running = startFeed(2);
await sim.tick(200);
assertEqual(stopFeed(), true, "a running feed can be stopped");
const partial = await running;
assertEqual(partial.stopped, true, "the feed ended because of the abort");
assert(partial.received >= 1 && partial.received < 12, "having processed only some of the 12 events: " + partial.received);
assertEqual(stopFeed(), false, "stopped feeds cannot be stopped again");
const first = startFeed(2);
const restarted = startFeed(2);
assertEqual((await first).stopped, true, "starting a feed stops the previous one");
await restarted;
scoreboard.reset(); resetReporters(); pipeline.reset(); pipelineFailures.length = 0;`),
      },
    ],
    unlocks: ["arena-pipeline"],
    checks: [
      {
        prompt: md`The pipeline loop is ¦for await (const raw of source) { await process(raw); }¦. Why is it better than ¦await Promise.all(events.map(process))¦ for a live feed?`,
        question: {
          type: "choice",
          options: [
            "It is faster because it runs everything at once",
            "Events are handled one at a time in order, and the source is only asked for the next event when the pipeline is ready (backpressure)",
            "It lets the same event be processed twice",
            "It avoids needing a bus",
          ],
          answer: 1,
        },
        explanation: md`Starting every event's work together can reorder results (a slow event is overtaken) and, on an endless feed, never stops allocating. Sequential ¦for await¦ keeps order and pulls from the source at the pipeline's own pace.`,
      },
      {
        prompt: md`¦loadTeams¦ stores the **promise** (¦teamsPromise ??= getJson(...)¦) rather than the finished list. What does that buy you?`,
        question: {
          type: "choice",
          options: [
            "Nothing: it is only a style choice",
            "Callers that arrive while the first request is still in flight share it instead of starting their own",
            "The list becomes immutable",
            "Errors are ignored",
          ],
          answer: 1,
        },
        explanation: md`Caching a value only helps after the response arrives. Caching the promise starts working at the first call, so a burst of simultaneous callers produces one request. Remember to forget a rejected promise so a failure is not cached forever.`,
      },
    ],
  },
];
