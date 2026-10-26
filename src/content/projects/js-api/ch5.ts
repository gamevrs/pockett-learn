import type { Lesson } from "@/engine/types";
import { js, md, T } from "./shared.ts";

/** Chapter 5: Proof and the graph endpoint. Table-driven API tests, then a tiny query language parsed and executed. */
export const chapter5: Lesson[] = [
  // ───────────────────────────────────────── 17. Table-driven tests
  {
    id: "js-api-17-tests",
    title: "Table-driven API tests",
    minutes: 45,
    xp: 220,
    concepts: ["table-driven tests", "contract testing", "subset matching", "test isolation", "mutation sanity check"],
    learn: md`### Prove it works, every time

You have built a lot of behaviour: routing, validation, auth, idempotency, limits, caching. Every one of those can be broken by a change that looks harmless, and none of them will tell you. **Automated tests** are the alarm system. For an API there is a lovely property: the whole program is a function from request to response, so the most valuable tests simply **send requests to ¦handle()¦ and check the answers**. No sockets, no browser, no mocks of your own code. They run in milliseconds and test the real stack: middleware, router, validation, repository.

### Test the contract, not the implementation

What a client depends on is the **contract**: the status code, a few key headers, the shape and important values of the body, the problem ¦type¦. What it does *not* depend on is the exact wording of ¦detail¦, extra fields you add next month, or how many middleware ran. A good API test asserts the former and ignores the latter, so refactors do not break tests and real regressions do.

That calls for **subset matching**: the expected body is a *pattern*, and extra keys in the real body are fine. Where a value is unpredictable (an id, a timestamp) use a **matcher**: "any string", "text matching a regular expression", "an array of 8 items". Arrays must match in length because adding or losing an element is a behaviour change.

### Table-driven tests

Many API tests have the same shape: send this, expect that. Writing each as separate code repeats boilerplate and hides what is covered. Put the cases in a **table** (an array of plain objects) and write the runner once:

~~~js
{ name: "a rider cannot create stations", as: "u-ana",
  request: { method: "POST", url: "/stations", body: { name: "Dock", zone: "park", capacity: 8 } },
  expect: { status: 403 } }
~~~

Adding a case is one object. A failing case names itself. The table reads like a specification.

### Isolation

Cases must not influence each other. Before each one the runner **resets the database**; each case gets its own client address so rate limits do not leak between them; logging in as a role happens inside the runner (a case says ¦as: "u-ana"¦, it does not care how tokens work). A test that passes only after another test ran is a bug waiting for a reorder.

### Determinism

No real clock, no real randomness, no real network. In these tests time is something you control, so a test can fast-forward past a token's expiry or a cooldown. If a test needs a pause, move the clock; never wait.

### Does the suite catch anything?

A suite that passes against a broken implementation is worse than none, because it creates false confidence. A cheap sanity check borrowed from *mutation testing*: replace the real ¦handle¦ with a deliberately wrong one that answers ¦200 {}¦ to everything and confirm that almost every case fails. If a case still passes, its expectation was too weak to mean anything.

### What to cover

Aim at behaviours, not lines: each status code you promise (200, 201, 304, 400, 401, 403, 404, 409, 412), the happy path of every resource, one case per rule worth protecting (the security ones above all), and one case for every bug you ever fix, named after the bug.

### Common mistakes

- Asserting full-body equality, so adding a field breaks twenty tests.
- Matching on message text.
- Tests that depend on run order or leftover data.
- Real sleeps.
- Only testing the happy path.`,
    mission: md`The next engineer to touch Dockline should be able to change anything and know within a second whether they broke the promises you made. Build a small, honest test harness for the API and write the suite that guards it.

The control room's Test lab shows each case of your suite as a tile, green when it passes and red with the failing detail when it does not.`,
    tasks: [
      "matches(actual, expected): subset matching with matchers, collecting readable failure messages with paths",
      "runCases(cases, { send, reset }): isolation (reset, own ip, login via the case's role), crash handling, results",
      "write the rest of the suite: at least eleven cases that cover 200, 201, 304, 400, 401, 403, 404, 409 and 412 (the listed behaviours)",
      "runSuite() exposes the report to the control room",
    ],
    starterAdd: js`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 17: a test harness for the API.

// ── given: matchers ──
const show = (value) => {
  const text = JSON.stringify(value);
  return text === undefined ? "undefined" : text.length > 70 ? text.slice(0, 67) + "..." : text;
};
class Matcher {
  constructor(description, test) {
    this.description = description;
    this.test = test;
  }
}
const is = {
  string: () => new Matcher("a string", (v) => typeof v === "string"),
  number: () => new Matcher("a number", (v) => typeof v === "number"),
  oneOf: (...values) => new Matcher(¦one of \${values.map(show).join(", ")}¦, (v) => values.includes(v)),
  matching: (regex) => new Matcher(¦text matching \${regex}¦, (v) => typeof v === "string" && regex.test(v)),
  absent: () => new Matcher("absent", (v) => v === undefined),
  arrayOf: (count) => new Matcher(¦an array of \${count} items¦, (v) => Array.isArray(v) && v.length === count),
};

// Compare 'actual' with the pattern 'expected' and return a list of problems (empty = match).
//   Matcher             -> expected.test(actual); problem "<path>: expected <description>, got <show(actual)>"
//   array               -> actual must be an array of the same length; compare element by element, paths like "items[2]"
//   plain object        -> actual must be an object; every key of expected must match (EXTRA keys in actual are fine), paths like "body.page.total"
//   anything else       -> strict equality; problem "<path>: expected <show(expected)>, got <show(actual)>"
//   an empty path is shown as "value"; type problems read "<path>: expected an array, got ..." / "expected an object, got ..."
function matches(actual, expected, path = "") {
  // TODO
}

// A case: { name, as?: riderId, request: { method, url, headers?, body? }, expect: { status, headers?, body? } }
const SUITE_PINS = { "u-ana": "4821", "u-ben": "7390", "u-mia": "1156", "u-root": "9034" };

// Run every case in order and return { total, passed, results: [{ name, ok, failures: [string] }] }.
// For case number i (from 0):
//   - call options.reset() first (default: () => db.reset())
//   - the client address is "10.200.0." + (i + 1) for the login AND the request
//   - when the case has 'as', log in first: send POST /auth/token { riderId, pin: SUITE_PINS[riderId] } through options.send and add
//     the header authorization: "Bearer <token>"; a failed login is the failure "login as <id> failed with status <status>" (skip the request)
//   - send the request with options.send (default: handle) as { method, url, headers, body, ip }
//   - compare: status (strict), expect.headers (matches against the response headers) and expect.body (matches against the response body),
//     prefixing header problems with "headers." and body problems with "body" (so "body.page.total")
//   - an exception while sending is the failure "request crashed: <message>"
async function runCases(cases, options = {}) {
  // TODO
}

// ── the suite ──
// Three cases are given. Write at least eight more (see the list below) so the suite covers
// the status codes 200, 201, 304, 400, 401, 403, 404, 409 and 412.
const suite = [
  { name: "lists all eight stations", request: { method: "GET", url: "/stations" }, expect: { status: 200, body: { items: is.arrayOf(8), page: { total: 8 } } } },
  { name: "reads one station", request: { method: "GET", url: "/stations/st-03" }, expect: { status: 200, body: { id: "st-03", name: "Tram Depot", capacity: 14 } } },
  {
    name: "an unknown station is a problem document",
    request: { method: "GET", url: "/stations/st-99" },
    expect: { status: 404, headers: { "content-type": "application/problem+json" }, body: { type: is.matching(/\/not-found$/), status: 404, requestId: is.matching(/^req-/) } },
  },
  // TODO more cases, for example:
  //   - an admin posting { name: "x", zone: "moon" } to /stations gets 400 and an errors array of 3
  //   - a rider (u-ana) creating a valid station gets 403
  //   - GET /rentals with no login gets 401 and a www-authenticate header starting with Bearer
  //   - u-ana renting bk-109 WITHOUT an idempotency-key gets 400 (type ending idempotency-key-required)
  //   - u-ana renting bk-109 WITH the header idempotency-key: "suite-rent-0001" gets 201 with riderId u-ana, returnedAt null and a location header /rentals/rt-...
  //   - u-ben reading rental rt-1001 (Ana's) gets 404
  //   - GET /stations/st-01 with if-none-match: "*" gets 304 and a null body
  //   - u-mia PATCHing st-01 { capacity: 13 } with if-match: "\"stale\"" gets 412
  //   - u-root deleting st-03 (bikes docked) gets 409
  //   - GET /health/ready gets 200
];

// The control room calls this.
async function runSuite() {
  // TODO: return runCases(suite)
}
`,
    solutionAdd: js`const show = (value) => {
  const text = JSON.stringify(value);
  return text === undefined ? "undefined" : text.length > 70 ? text.slice(0, 67) + "..." : text;
};
class Matcher {
  constructor(description, test) {
    this.description = description;
    this.test = test;
  }
}
const is = {
  string: () => new Matcher("a string", (v) => typeof v === "string"),
  number: () => new Matcher("a number", (v) => typeof v === "number"),
  oneOf: (...values) => new Matcher(¦one of \${values.map(show).join(", ")}¦, (v) => values.includes(v)),
  matching: (regex) => new Matcher(¦text matching \${regex}¦, (v) => typeof v === "string" && regex.test(v)),
  absent: () => new Matcher("absent", (v) => v === undefined),
  arrayOf: (count) => new Matcher(¦an array of \${count} items¦, (v) => Array.isArray(v) && v.length === count),
};

function matches(actual, expected, path = "") {
  const label = path || "value";
  if (expected instanceof Matcher) {
    return expected.test(actual) ? [] : [¦\${label}: expected \${expected.description}, got \${show(actual)}¦];
  }
  if (Array.isArray(expected)) {
    if (!Array.isArray(actual)) return [¦\${label}: expected an array, got \${show(actual)}¦];
    if (actual.length !== expected.length) return [¦\${label}: expected \${expected.length} items, got \${actual.length}¦];
    return expected.flatMap((item, i) => matches(actual[i], item, ¦\${path}[\${i}]¦));
  }
  if (expected !== null && typeof expected === "object") {
    if (actual === null || typeof actual !== "object" || Array.isArray(actual)) return [¦\${label}: expected an object, got \${show(actual)}¦];
    return Object.entries(expected).flatMap(([key, value]) => matches(actual[key], value, path ? ¦\${path}.\${key}¦ : key));
  }
  return actual === expected ? [] : [¦\${label}: expected \${show(expected)}, got \${show(actual)}¦];
}

const SUITE_PINS = { "u-ana": "4821", "u-ben": "7390", "u-mia": "1156", "u-root": "9034" };

async function runCases(cases, options = {}) {
  const send = options.send ?? handle;
  const reset = options.reset ?? (() => db.reset());
  const results = [];
  for (const [i, testCase] of cases.entries()) {
    reset();
    const ip = ¦10.200.0.\${i + 1}¦;
    const failures = [];
    try {
      const headers = { ...(testCase.request.headers ?? {}) };
      let ready = true;
      if (testCase.as) {
        const login = await send({ method: "POST", url: "/auth/token", headers: {}, body: { riderId: testCase.as, pin: SUITE_PINS[testCase.as] }, ip });
        if (login.status !== 200) {
          failures.push(¦login as \${testCase.as} failed with status \${login.status}¦);
          ready = false;
        } else {
          headers.authorization = ¦Bearer \${login.body.token}¦;
        }
      }
      if (ready) {
        const { method, url, body } = testCase.request;
        const response = await send({ method, url, headers, body, ip });
        const expected = testCase.expect;
        if (response.status !== expected.status) failures.push(¦status: expected \${expected.status}, got \${response.status}¦);
        if (expected.headers) failures.push(...matches(response.headers, expected.headers, "headers"));
        if (expected.body !== undefined) failures.push(...matches(response.body, expected.body, "body"));
      }
    } catch (err) {
      failures.push(¦request crashed: \${err.message}¦);
    }
    results.push({ name: testCase.name, ok: failures.length === 0, failures });
  }
  return { total: results.length, passed: results.filter((r) => r.ok).length, results };
}

const suite = [
  { name: "lists all eight stations", request: { method: "GET", url: "/stations" }, expect: { status: 200, body: { items: is.arrayOf(8), page: { total: 8 } } } },
  { name: "reads one station", request: { method: "GET", url: "/stations/st-03" }, expect: { status: 200, body: { id: "st-03", name: "Tram Depot", capacity: 14 } } },
  {
    name: "an unknown station is a problem document",
    request: { method: "GET", url: "/stations/st-99" },
    expect: { status: 404, headers: { "content-type": "application/problem+json" }, body: { type: is.matching(/\/not-found$/), status: 404, requestId: is.matching(/^req-/) } },
  },
  {
    name: "a bad station body lists every field problem",
    as: "u-root",
    request: { method: "POST", url: "/stations", body: { name: "x", zone: "moon" } },
    expect: { status: 400, body: { type: is.matching(/validation-failed$/), errors: is.arrayOf(3) } },
  },
  {
    name: "a rider cannot create stations",
    as: "u-ana",
    request: { method: "POST", url: "/stations", body: { name: "Canal Steps", zone: "old-town", capacity: 9 } },
    expect: { status: 403, body: { type: is.matching(/forbidden$/) } },
  },
  {
    name: "anonymous callers are asked to log in",
    request: { method: "GET", url: "/rentals" },
    expect: { status: 401, headers: { "www-authenticate": is.matching(/^Bearer/) } },
  },
  {
    name: "renting without an idempotency key is refused",
    as: "u-ana",
    request: { method: "POST", url: "/rentals", body: { bikeId: "bk-109" } },
    expect: { status: 400, body: { type: is.matching(/idempotency-key-required$/) } },
  },
  {
    name: "a rider can rent an available bike",
    as: "u-ana",
    request: { method: "POST", url: "/rentals", headers: { "idempotency-key": "suite-rent-0001" }, body: { bikeId: "bk-109" } },
    expect: { status: 201, headers: { location: is.matching(/^\/rentals\/rt-/) }, body: { riderId: "u-ana", bikeId: "bk-109", returnedAt: null } },
  },
  {
    name: "someone else's rental looks missing",
    as: "u-ben",
    request: { method: "GET", url: "/rentals/rt-1001" },
    expect: { status: 404 },
  },
  {
    name: "a matching validator gets a 304",
    request: { method: "GET", url: "/stations/st-01", headers: { "if-none-match": "*" } },
    expect: { status: 304, body: null },
  },
  {
    name: "a stale edit is refused with 412",
    as: "u-mia",
    request: { method: "PATCH", url: "/stations/st-01", headers: { "if-match": '"stale"' }, body: { capacity: 13 } },
    expect: { status: 412 },
  },
  {
    name: "a station with bikes docked cannot be deleted",
    as: "u-root",
    request: { method: "DELETE", url: "/stations/st-03" },
    expect: { status: 409 },
  },
  { name: "the readiness probe is green", request: { method: "GET", url: "/health/ready" }, expect: { status: 200, body: { status: "ready" } } },
];

async function runSuite() {
  return runCases(suite);
}`,
    explanation:
      "matches walks the pattern recursively and reports every mismatch with a readable path, treating matchers, arrays and objects differently: arrays must have the same length, objects are matched as subsets so new fields never break old tests. runCases is the isolation machinery: reset before each case, a private client address, a login performed by the harness when a case names a role, and every problem (status, headers, body, crashes) collected as a string so the control room can display it. The suite is just data; each case documents one promise of the API.",
    hints: [
      { id: "h1", title: "matches", content: "Handle expected in this order: Matcher instance (expected.test(actual)), array (check Array.isArray and length, then flatMap over the items with path + \"[\" + i + \"]\"), non-null object (check the actual is a non-null non-array object, then flatMap over Object.entries(expected) with path joined by a dot), and finally strict equality. Use path || \"value\" for the label." },
      { id: "h2", title: "runCases", content: "for (const [i, testCase] of cases.entries()) { reset(); const ip = \"10.200.0.\" + (i + 1); const failures = []; try { ...login if testCase.as..., const response = await send({ method, url, headers, body, ip }); if (response.status !== expected.status) failures.push(...); if (expected.headers) failures.push(...matches(response.headers, expected.headers, \"headers\")); if (expected.body !== undefined) failures.push(...matches(response.body, expected.body, \"body\")); } catch (err) { failures.push(\"request crashed: \" + err.message) } results.push({ name, ok: failures.length === 0, failures }) }." },
      { id: "h3", title: "Cases", content: "Each case is plain data. For the 304 case send headers { \"if-none-match\": \"*\" } to GET /stations/st-01 and expect { status: 304, body: null }. For the 412 case log in as u-mia and send the header if-match with the value '\"stale\"'. Expect the problem type with is.matching(/forbidden$/) style matchers rather than full URLs." },
    ],
    tests: [
      {
        id: "t1",
        description: "matches: strict values, objects as subsets, arrays by length, matchers",
        assertionCode: T(js`assertEqual(matches(5, 5), []);
assertEqual(matches(5, 6), ["value: expected 6, got 5"]);
assertEqual(matches("a", "a", "name"), []);
assertEqual(matches("a", "b", "name"), ['name: expected "b", got "a"']);
assertEqual(matches(null, null), []);
assertEqual(matches(undefined, null), ["value: expected null, got undefined"]);
assertEqual(matches({ a: 1, b: 2, extra: true }, { a: 1 }), [], "extra keys in the real body are fine");
assertEqual(matches({ a: { b: { c: 1, d: 2 } } }, { a: { b: { c: 2 } } }), ["a.b.c: expected 2, got 1"], "nested path");
assertEqual(matches({ a: 1 }, { b: 1 }), ["b: expected 1, got undefined"], "a missing key is a mismatch");
assertEqual(matches([1, 2, 3], [1, 2, 3]), []);
assertEqual(matches([1, 2], [1, 2, 3]), ["value: expected 3 items, got 2"]);
assertEqual(matches({ items: [{ id: 1 }, { id: 2 }] }, { items: [{ id: 1 }, { id: 3 }] }), ["items[1].id: expected 3, got 2"], "paths into arrays");
assertEqual(matches("text", { a: 1 }), ["value: expected an object, got \"text\""]);
assertEqual(matches([1], { a: 1 }), ["value: expected an object, got [1]"], "an array is not an object here");
assertEqual(matches({ a: 1 }, [1]), ["value: expected an array, got {\"a\":1}"]);
assertEqual(matches(null, { a: 1 }), ["value: expected an object, got null"]);
assertEqual(matches({ a: 1, b: 2 }, { a: 2, b: 3 }).length, 2, "every mismatch is reported");`),
      },
      {
        id: "t2",
        description: "matchers describe what they expect",
        assertionCode: T(js`assertEqual(matches("x", is.string()), []);
assertEqual(matches(5, is.string()), ["value: expected a string, got 5"]);
assertEqual(matches(5, is.number()), []);
assertEqual(matches("req-000001", is.matching(/^req-\d{6}$/)), []);
assertEqual(matches("nope", is.matching(/^req-/)), ['value: expected text matching /^req-/, got "nope"']);
assertEqual(matches(7, is.matching(/7/)), ["value: expected text matching /7/, got 7"], "matching only accepts strings");
assertEqual(matches(2, is.oneOf(1, 2, 3)), []);
assertEqual(matches(4, is.oneOf(1, 2, 3)), ["value: expected one of 1, 2, 3, got 4"]);
assertEqual(matches(undefined, is.absent()), []);
assertEqual(matches("here", { k: is.absent() }).length, 1);
assertEqual(matches({ k: 1 }, { k: is.absent() }), ["k: expected absent, got 1"]);
assertEqual(matches([1, 2], is.arrayOf(2)), []);
assertEqual(matches([1], is.arrayOf(2)), ["value: expected an array of 2 items, got [1]"]);
assertEqual(matches({ list: [1, 2, 3] }, { list: is.arrayOf(3) }), []);`),
      },
      {
        id: "t3",
        description: "runCases: isolation, logins, comparison and reports",
        assertionCode: T(js`const seen = [];
let resets = 0;
const send = async (raw) => {
  seen.push(raw);
  if (raw.url === "/auth/token") return raw.body.riderId === "u-ghost" ? { status: 401, headers: {}, body: {} } : { status: 200, headers: {}, body: { token: "T-" + raw.body.riderId } };
  if (raw.url === "/boom") throw new Error("kaboom");
  return { status: raw.url === "/missing" ? 404 : 200, headers: { "content-type": "application/json", "x-extra": "1" }, body: { id: 7, name: "Dock", extra: [1, 2] }, trace: [] };
};
const cases = [
  { name: "passes", request: { method: "GET", url: "/a" }, expect: { status: 200, headers: { "content-type": "application/json" }, body: { id: 7 } } },
  { name: "wrong status", request: { method: "GET", url: "/missing" }, expect: { status: 200 } },
  { name: "wrong body", request: { method: "GET", url: "/a" }, expect: { status: 200, body: { id: 8, extra: [1, 3] } } },
  { name: "wrong header", request: { method: "GET", url: "/a" }, expect: { status: 200, headers: { "content-type": "text/html" } } },
  { name: "logged in", as: "u-ana", request: { method: "POST", url: "/b", body: { n: 1 }, headers: { "x-keep": "1" } }, expect: { status: 200 } },
  { name: "login fails", as: "u-ghost", request: { method: "GET", url: "/c" }, expect: { status: 200 } },
  { name: "crashes", request: { method: "GET", url: "/boom" }, expect: { status: 200 } },
];
const report = await runCases(cases, { send, reset: () => { resets++; } });
assertEqual([report.total, report.passed], [7, 2], "seven cases, two pass");
assertEqual(report.results.map((r) => r.ok), [true, false, false, false, true, false, false]);
assertEqual(resets, 7, "reset runs before every case");
assertEqual(report.results[1].failures, ["status: expected 200, got 404"]);
assertEqual(report.results[2].failures, ["body.id: expected 8, got 7", "body.extra[1]: expected 3, got 2"]);
assertEqual(report.results[3].failures, ['headers.content-type: expected "text/html", got "application/json"']);
assertEqual(report.results[5].failures, ["login as u-ghost failed with status 401"]);
assertEqual(report.results[6].failures, ["request crashed: kaboom"]);
const real = seen.filter((r) => r.url !== "/auth/token");
const loginCall = seen.find((r) => r.url === "/auth/token" && r.body.riderId === "u-ana");
assertEqual(loginCall.body.pin, "4821", "the harness knows the pins");
const loggedIn = real.find((r) => r.url === "/b");
assertEqual([loggedIn.headers.authorization, loggedIn.headers["x-keep"], loggedIn.body, loggedIn.method], ["Bearer T-u-ana", "1", { n: 1 }, "POST"], "the token is added, other headers and the body are kept");
assertEqual(loginCall.ip, loggedIn.ip, "login and request share the case's address");
assertEqual(new Set(real.map((r) => r.ip)).size, real.length, "every case has its own client address");
assert(!seen.some((r) => r.url === "/c"), "a failed login skips the request");`),
      },
      {
        id: "t4",
        description: "runCases defaults to the real app and resets its database",
        assertionCode: T(js`await db.stations.remove("st-08");
await db.stations.update("st-01", { name: "Changed" });
const report = await runCases([
  { name: "back to the seed", request: { method: "GET", url: "/stations/st-01" }, expect: { status: 200, body: { name: "Harbour Gate" } } },
  { name: "and st-08 is back", request: { method: "GET", url: "/stations/st-08" }, expect: { status: 200 } },
]);
assertEqual(report.passed, 2, "the default reset is db.reset(): " + JSON.stringify(report.results));`),
      },
      {
        id: "t5",
        description: "The suite passes against your API and exposes its report",
        assertionCode: T(js`const report = await runSuite();
assertEqual(report.total, suite.length, "runSuite runs the whole table");
const failing = report.results.filter((r) => !r.ok).map((r) => r.name + " -> " + r.failures.join("; "));
assertEqual(failing, [], "every case of the suite should pass");
assert(report.total >= 11, "write at least eleven cases, found " + report.total);
for (const r of report.results) assertEqual(Object.keys(r).sort(), ["failures", "name", "ok"], "each result has name, ok and failures");
assertEqual(new Set(suite.map((c) => c.name)).size, suite.length, "case names are unique");
const again = await runSuite();
assertEqual(again.passed, again.total, "and it passes again when run a second time");`),
      },
      {
        id: "t6",
        description: "The suite is meaningful: it covers the status codes and fails against a broken API",
        assertionCode: T(js`const statuses = new Set(suite.map((c) => c.expect.status));
for (const code of [200, 201, 304, 400, 401, 403, 404, 409, 412]) assert(statuses.has(code), "no case expects status " + code);
const roles = new Set(suite.map((c) => c.as).filter(Boolean));
assert(roles.has("u-ana") && roles.has("u-root"), "cases should exercise at least a rider and an admin");
const broken = await runCases(suite, { send: async () => ({ status: 200, headers: {}, body: {}, trace: [] }) });
assert(broken.passed <= 2, "a server that answers 200 {} to everything must fail almost every case, but " + broken.passed + " passed: " + broken.results.filter((r) => r.ok).map((r) => r.name).join(", "));
const lax = await runCases(suite, { send: async () => ({ status: 404, headers: {}, body: null, trace: [] }) });
assert(lax.passed <= 3, "a server that answers 404 to everything must fail almost every case, but " + lax.passed + " passed");
for (const c of suite) assert(c.expect.body !== undefined || c.expect.headers !== undefined || [304, 404, 412, 409, 403].includes(c.expect.status), "case '" + c.name + "' only checks a status that a lazy server could return");`),
      },
    ],
    unlocks: ["api-tests"],
    checks: [
      {
        prompt: md`A test compares the whole error body with ¦assertEqual¦ including the ¦detail¦ sentence. Next week someone fixes a typo in the message. What happens, and what is the lesson?`,
        question: {
          type: "choice",
          options: [
            "Nothing, messages are part of the contract",
            "The test fails although behaviour did not change; assert the contract (status, type, key fields) and use subset matching so wording is free to improve",
            "The typo cannot be fixed",
            "The test passes silently",
          ],
          answer: 1,
        },
        explanation: md`Over-specified tests punish harmless edits and teach people to ignore failures. Assert what clients rely on, and nothing more.`,
      },
      {
        prompt: md`Why does the harness reset the database and use a fresh client address for every case?`,
        question: {
          type: "choice",
          options: [
            "To make the suite slower on purpose",
            "So cases cannot affect each other through leftover data or shared rate-limit budgets, and can run in any order",
            "Because reset() is required by the router",
            "Because addresses must be unique per URL",
          ],
          answer: 1,
        },
        explanation: md`Hidden coupling between tests produces failures that depend on order and are hard to reproduce. Isolation makes every failure local and repeatable.`,
      },
    ],
  },

  // ───────────────────────────────────────── 18. Query parser
  {
    id: "js-api-18-graph-parse",
    title: "A tiny graph query language: the parser",
    minutes: 45,
    xp: 230,
    concepts: ["tokenizing", "recursive descent parsing", "AST", "syntax errors with positions", "depth limits", "over- and under-fetching"],
    learn: md`### Why a query language at all

REST gives you fixed shapes. ¦GET /stations/st-03¦ returns whatever fields the server decided on, and ¦GET /stations/st-03/bikes¦ is a second round trip. A phone on a bad connection wants *exactly* the station name and the battery levels of its bikes, in one request. That is **over-fetching** (more than you need), **under-fetching** (needs several calls) and it is the problem GraphQL-style APIs address: the client sends a *query* describing the shape of the data it wants, and the server returns exactly that shape.

~~~
{
  station(id: "st-03") {
    name
    bikes { id battery }
  }
}
~~~

You will build an honest, small version over the data you already have. It supports queries only (no mutations, variables, fragments, aliases or introspection), which is enough to learn the real mechanics, and the mechanics are the interesting part. This lesson is the front half: turn text into a tree. The next lesson executes the tree.

### Step 1: tokenizing

A **tokenizer** (lexer) turns characters into **tokens**: the words of the language. Ours has:

- **punctuation**: ¦{ } ( ) :¦
- **names**: letters, digits and underscores, not starting with a digit (¦station¦, ¦id¦, ¦query¦, ¦true¦)
- **numbers**: ¦-12¦, ¦3¦ (int) and ¦2.5¦ (float)
- **strings**: double-quoted, with ¦\"¦, ¦\\¦ and ¦\n¦ escapes
- whitespace, commas and ¦# comments¦ to the end of the line are **ignored** (in this language commas are optional separators)
- an ¦eof¦ marker at the end makes the parser simpler.

Each token remembers its **line and column** so errors can point at the exact spot: ¦Syntax Error: Expected "}" but found end of input (3:1)¦. Good error positions are what make a language usable.

### Step 2: parsing by recursive descent

The grammar is tiny:

~~~
document      := ("query" Name?)? selectionSet
selectionSet  := "{" selection+ "}"
selection     := Name arguments? selectionSet?
arguments     := "(" (Name ":" value)+ ")"
value         := String | Int | Float | true | false | null
~~~

**Recursive descent** writes one function per grammar rule, and the rules call each other: ¦parseSelectionSet¦ calls ¦parseSelection¦ which calls ¦parseSelectionSet¦ again for nested fields. A small helper pair does the bookkeeping: ¦peek()¦ looks at the current token, ¦expect(type, value)¦ consumes it or throws a syntax error.

The result is an **abstract syntax tree**: plain data, no text left:

~~~js
{ operation: "query", selections: [
    { name: "station", args: { id: "st-03" }, selections: [
        { name: "name", args: {}, selections: [] },
        { name: "bikes", args: {}, selections: [ { name: "id", ... }, { name: "battery", ... } ] } ] } ] }
~~~

A field with no braces has ¦selections: []¦: it is a leaf.

### Limits are part of the design

Anything that parses untrusted text must bound its work. A malicious query can nest a thousand levels deep and blow the stack, or be megabytes long. We cap **nesting depth** (here 8 levels) and report it as a normal syntax error. The server also caps query length when it validates the request body.

### Errors

Every problem throws ¦GraphSyntaxError¦ (a ¦SyntaxError¦ with ¦line¦ and ¦column¦). Typical cases: an unexpected character, an unterminated string, a missing ¦}¦, an empty selection set, text after the document, or asking for a ¦mutation¦ we do not support.

### Common mistakes

- Treating the parser as the place to validate against a schema. Parsing only checks *grammar*; knowing that ¦station¦ exists is the next lesson.
- Losing position information, which makes every error message useless.
- Unbounded recursion.
- Regexes for the whole language instead of a tokenizer plus a parser: they cannot count nested braces.`,
    mission: md`The mobile team wants one request per screen, not four. They proposed a query endpoint where the app describes exactly which fields it needs. Before anything can answer such a query, something has to read it.

Build the tokenizer and the parser, with proper error positions. The control room's query parser panel shows the tree your function builds from a query you type, or the exact line and column of your syntax error.`,
    tasks: [
      "tokenize(source): punctuation, names, ints, floats, strings with escapes; ignore whitespace, commas and comments; line and column on every token; eof marker",
      "parseGraph(source): selection sets, nested fields, arguments, optional query keyword and name; a tree of { name, args, selections }",
      "GraphSyntaxError messages with positions for bad characters, unterminated strings, missing braces, empty selections, trailing text, unsupported operations and deep nesting (8 levels)",
    ],
    starterAdd: js`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 18: reading a query.

// given: every problem is reported with a position
class GraphSyntaxError extends SyntaxError {
  constructor(message, line, column) {
    super(¦Syntax Error: \${message} (\${line}:\${column})¦);
    this.name = "GraphSyntaxError";
    this.line = line;
    this.column = column;
  }
}

const GRAPH_MAX_DEPTH = 8;

// Turn the text into tokens: { type, value, line, column }  (line and column count from 1)
//   type "punct"   value one of  {  }  (  )  :
//   type "name"    value the text, matching [_A-Za-z][_0-9A-Za-z]*
//   type "int"     value a Number  (-?digits)         type "float"  value a Number  (-?digits.digits)
//   type "string"  value the text without quotes, escapes \" \\ \n resolved
//   a final { type: "eof", value: "", line, column } token
// Skipped: spaces, tabs, line breaks, commas and "# comments" up to the end of the line.
// Errors (GraphSyntaxError at the position of the problem):
//   an unterminated string                      "Unterminated string"
//   a bad escape like \q                        "Invalid escape sequence \q"   (message uses the character after the backslash)
//   any other unexpected character              "Unexpected character \"@\""
function tokenize(source) {
  // TODO
}

// Parse a query into a tree and return it:
//   { operation: "query", selections: [ { name, args: {}, selections: [] } ] }
// - an optional leading  query  keyword with an optional name:  query StationInfo { ... }
// - the words mutation and subscription: GraphSyntaxError "Only queries are supported"
// - a selection set must contain at least one field: "Expected a field name" at the closing brace
// - arguments: ( name: value ... ), at least one; values are string, int, float, true, false, null (JS values)
// - nesting deeper than GRAPH_MAX_DEPTH levels: GraphSyntaxError ¦Query is nested too deeply (max 8 levels)¦ at the offending brace
// - after the closing brace of the document there must be nothing: "Unexpected \"x\" after the end of the query"
// - missing pieces use the form  Expected "}" but found "x"  / Expected "}" but found end of input
// Errors point at the token that was found instead.
function parseGraph(source) {
  // TODO
}
`,
    solutionAdd: js`class GraphSyntaxError extends SyntaxError {
  constructor(message, line, column) {
    super(¦Syntax Error: \${message} (\${line}:\${column})¦);
    this.name = "GraphSyntaxError";
    this.line = line;
    this.column = column;
  }
}

const GRAPH_MAX_DEPTH = 8;

function tokenize(source) {
  const tokens = [];
  let i = 0;
  let line = 1;
  let column = 1;
  const advance = (count = 1) => {
    for (let k = 0; k < count; k++) {
      if (source[i] === "\n") {
        line++;
        column = 1;
      } else column++;
      i++;
    }
  };
  while (i < source.length) {
    const ch = source[i];
    if (ch === " " || ch === "\t" || ch === "\r" || ch === "\n" || ch === ",") {
      advance();
      continue;
    }
    if (ch === "#") {
      while (i < source.length && source[i] !== "\n") advance();
      continue;
    }
    const at = { line, column };
    if ("{}():".includes(ch)) {
      tokens.push({ type: "punct", value: ch, ...at });
      advance();
    } else if (/[_A-Za-z]/.test(ch)) {
      let end = i;
      while (end < source.length && /[_0-9A-Za-z]/.test(source[end])) end++;
      tokens.push({ type: "name", value: source.slice(i, end), ...at });
      advance(end - i);
    } else if (/[0-9]/.test(ch) || (ch === "-" && /[0-9]/.test(source[i + 1] ?? ""))) {
      const match = /^-?[0-9]+(\.[0-9]+)?/.exec(source.slice(i));
      tokens.push({ type: match[1] ? "float" : "int", value: Number(match[0]), ...at });
      advance(match[0].length);
    } else if (ch === '"') {
      advance();
      let text = "";
      for (;;) {
        if (i >= source.length || source[i] === "\n") throw new GraphSyntaxError("Unterminated string", at.line, at.column);
        const c = source[i];
        if (c === '"') {
          advance();
          break;
        }
        if (c === "\\") {
          const next = source[i + 1];
          const escapes = { '"': '"', "\\": "\\", n: "\n" };
          if (next === undefined || !(next in escapes)) throw new GraphSyntaxError(¦Invalid escape sequence \\\${next ?? ""}¦, line, column);
          text += escapes[next];
          advance(2);
        } else {
          text += c;
          advance();
        }
      }
      tokens.push({ type: "string", value: text, ...at });
    } else {
      throw new GraphSyntaxError(¦Unexpected character "\${ch}"¦, line, column);
    }
  }
  tokens.push({ type: "eof", value: "", line, column });
  return tokens;
}

function parseGraph(source) {
  const tokens = tokenize(String(source));
  let pos = 0;
  const peek = () => tokens[pos];
  const found = (token) => (token.type === "eof" ? "end of input" : ¦"\${token.value}"¦);
  const fail = (message, token = peek()) => {
    throw new GraphSyntaxError(message, token.line, token.column);
  };
  const expectPunct = (value) => {
    const token = peek();
    if (token.type !== "punct" || token.value !== value) fail(¦Expected "\${value}" but found \${found(token)}¦);
    pos++;
    return token;
  };

  function parseValue() {
    const token = peek();
    pos++;
    if (token.type === "string" || token.type === "int" || token.type === "float") return token.value;
    if (token.type === "name" && token.value === "true") return true;
    if (token.type === "name" && token.value === "false") return false;
    if (token.type === "name" && token.value === "null") return null;
    return fail(¦Expected a value but found \${found(token)}¦, token);
  }

  function parseArguments() {
    const args = {};
    expectPunct("(");
    do {
      const name = peek();
      if (name.type !== "name") fail(¦Expected an argument name but found \${found(name)}¦);
      pos++;
      expectPunct(":");
      args[name.value] = parseValue();
    } while (peek().type === "name");
    expectPunct(")");
    return args;
  }

  function parseSelectionSet(depth) {
    const open = expectPunct("{");
    if (depth > GRAPH_MAX_DEPTH) fail(¦Query is nested too deeply (max \${GRAPH_MAX_DEPTH} levels)¦, open);
    const selections = [];
    while (peek().type === "name") {
      const name = peek().value;
      pos++;
      const args = peek().type === "punct" && peek().value === "(" ? parseArguments() : {};
      const children = peek().type === "punct" && peek().value === "{" ? parseSelectionSet(depth + 1) : [];
      selections.push({ name, args, selections: children });
    }
    if (selections.length === 0) fail("Expected a field name but found " + found(peek()));
    expectPunct("}");
    return selections;
  }

  const first = peek();
  if (first.type === "name") {
    if (first.value === "mutation" || first.value === "subscription") fail("Only queries are supported");
    if (first.value !== "query") fail(¦Expected "{" or "query" but found \${found(first)}¦);
    pos++;
    if (peek().type === "name") pos++;
  } else if (first.type !== "punct" || first.value !== "{") {
    fail(¦Expected "{" or "query" but found \${found(first)}¦);
  }
  const selections = parseSelectionSet(1);
  if (peek().type !== "eof") fail(¦Unexpected \${found(peek())} after the end of the query¦);
  return { operation: "query", selections };
}`,
    explanation:
      "tokenize is a single pass with a position cursor that keeps line and column in step, recognising each token kind by its first character and throwing a positioned error for anything it cannot classify. parseGraph is recursive descent: parseSelectionSet loops over fields, each of which may take arguments and a nested selection set, so the recursion mirrors the nesting of the query. The depth counter bounds the recursion, expectPunct centralises 'consume or complain' with a consistent message, and the final eof check rejects trailing text. The result is plain data, which is exactly what the executor in the next lesson will walk.",
    hints: [
      { id: "h1", title: "Tokenizer loop", content: "Keep i, line and column and an advance(count) helper that updates line/column (reset column on a newline). In a while loop: skip whitespace, commas and # comments; record const at = { line, column } BEFORE consuming; branch on the first character: punctuation, /[_A-Za-z]/ for names (extend while /[_0-9A-Za-z]/), a digit or '-' followed by a digit for numbers (use /^-?[0-9]+(\\.[0-9]+)?/ on the rest), '\"' for strings." },
      { id: "h2", title: "Parser helpers", content: "peek() returns tokens[pos]. expectPunct(value) checks type punct and the value, otherwise throws GraphSyntaxError('Expected \"}\" but found ' + (eof ? 'end of input' : '\"' + value + '\"'), token.line, token.column), and advances. parseSelectionSet(depth): expectPunct('{'), loop while peek().type === 'name' building { name, args, selections }, fail on an empty list, expectPunct('}')." },
      { id: "h3", title: "Arguments and the top", content: "parseArguments: expect '(', then repeat name, ':' and a value (string/int/float token values, or the names true/false/null) while the next token is a name, then expect ')'. At the top: an optional name token 'query' (plus an optional operation name); 'mutation' or 'subscription' is the 'Only queries are supported' error. After the selection set the next token must be eof." },
    ],
    tests: [
      {
        id: "t1",
        description: "tokenize: kinds, values and positions",
        assertionCode: T(js`const toks = tokenize('{ station(id: "st-03", n: -4, r: 2.5) }');
assertEqual(toks.map((t) => t.type), ["punct", "name", "punct", "name", "punct", "string", "name", "punct", "int", "name", "punct", "float", "punct", "punct", "eof"]);
assertEqual(toks.map((t) => t.value), ["{", "station", "(", "id", ":", "st-03", "n", ":", -4, "r", ":", 2.5, ")", "}", ""], "commas are separators and vanish");
assertEqual([toks[1].line, toks[1].column], [1, 3], "station starts at column 3");
assertEqual([toks[5].line, toks[5].column], [1, 15], "a string token points at its opening quote");
const multi = tokenize("{\n  name # trailing comment\n  ids\n}");
assertEqual(multi.filter((t) => t.type === "name").map((t) => [t.value, t.line, t.column]), [["name", 2, 3], ["ids", 3, 3]], "lines and columns across line breaks; comments are skipped");
assertEqual(tokenize("")[0], { type: "eof", value: "", line: 1, column: 1 }, "empty input is just eof");
assertEqual(tokenize("   ,, ,").length, 1);`),
      },
      {
        id: "t2",
        description: "tokenize: strings, escapes and numbers",
        assertionCode: T(js`const value = (src) => tokenize(src)[0].value;
assertEqual(value('"plain text"'), "plain text");
assertEqual(value('"say \\"hi\\""'), 'say "hi"', "escaped quote");
assertEqual(value('"a\\\\b"'), "a\\b", "escaped backslash");
assertEqual(value('"line\\nbreak"'), "line\nbreak", "escaped newline");
assertEqual(value('""'), "");
assertEqual(tokenize("0")[0], { type: "int", value: 0, line: 1, column: 1 });
assertEqual(tokenize("-12")[0].value, -12);
assertEqual(tokenize("3.25")[0].type, "float");
assertEqual(tokenize("_under_score9")[0], { type: "name", value: "_under_score9", line: 1, column: 1 });
assertEqual(tokenize("12ab").map((t) => t.type), ["int", "name", "eof"], "digits then letters are two tokens");`),
      },
      {
        id: "t3",
        description: "tokenize: errors point at the problem",
        assertionCode: T(js`const err = (src) => assertThrows(() => tokenize(src), "Syntax Error");
let e = err('{ name: "oops }');
assertEqual([e.message, e.line, e.column], ['Syntax Error: Unterminated string (1:9)', 1, 9], "position of the opening quote");
e = err("{ a @ b }");
assertEqual([e.message, e.line, e.column], ['Syntax Error: Unexpected character "@" (1:5)', 1, 5]);
e = err("{\n  a\n  $x\n}");
assertEqual([e.line, e.column], [3, 3], "line and column after line breaks");
e = err('"bad \\q escape"');
assert(e.message.includes("Invalid escape sequence") && e.message.includes("q"), e.message);
assert(e instanceof SyntaxError && e.name === "GraphSyntaxError", "it is a SyntaxError named GraphSyntaxError");
assertEqual(err('"line one\nline two"').message.includes("Unterminated"), true, "a string cannot span lines");`),
      },
      {
        id: "t4",
        description: "parseGraph: fields, nesting and the optional query keyword",
        assertionCode: T(js`const leaf = (name) => ({ name, args: {}, selections: [] });
assertEqual(parseGraph("{ stations }"), { operation: "query", selections: [leaf("stations")] });
assertEqual(parseGraph("{ a b c }").selections.map((s) => s.name), ["a", "b", "c"], "whitespace separates fields");
assertEqual(parseGraph("{ a, b, c, }").selections.map((s) => s.name), ["a", "b", "c"], "commas are optional separators");
const tree = parseGraph(\`
  query StationInfo {
    station {
      name
      bikes { id battery }
    }
  }\`);
assertEqual(tree, { operation: "query", selections: [{ name: "station", args: {}, selections: [leaf("name"), { name: "bikes", args: {}, selections: [leaf("id"), leaf("battery")] }] }] });
assertEqual(parseGraph("query { a }").selections.length, 1, "query without a name");
assertEqual(parseGraph("# a comment\n{ a }").selections[0].name, "a");
const plain = JSON.parse(JSON.stringify(tree));
assertEqual(plain, tree, "the result is plain JSON data");`),
      },
      {
        id: "t5",
        description: "parseGraph: arguments of every value type",
        assertionCode: T(js`const args = (src) => parseGraph(src).selections[0].args;
assertEqual(args('{ station(id: "st-03") }'), { id: "st-03" });
assertEqual(args("{ stations(zone: \"central\", limit: 5, ratio: 0.5, all: true, none: null, off: false, neg: -2) }"), { zone: "central", limit: 5, ratio: 0.5, all: true, none: null, off: false, neg: -2 });
assertEqual(args('{ bikes(kind: "electric" status: "available") { id } }'), { kind: "electric", status: "available" }, "commas between arguments are optional");
assertEqual(parseGraph('{ station(id: "a") { bikes(status: "rented") { id } } }').selections[0].selections[0].args, { status: "rented" }, "arguments on nested fields");
assertEqual(args('{ s(text: "a \\"quoted\\" word") }'), { text: 'a "quoted" word' });`),
      },
      {
        id: "t6",
        description: "parseGraph: syntax errors say what and where",
        assertionCode: T(js`const err = (src) => assertThrows(() => parseGraph(src), "Syntax Error");
assertEqual(err("{ station { name }").message, "Syntax Error: Expected \"}\" but found end of input (1:19)");
assertEqual(err("{ }").message, "Syntax Error: Expected a field name but found \"}\" (1:3)", "an empty selection set");
assertEqual(err("{ a } extra").message, "Syntax Error: Unexpected \"extra\" after the end of the query (1:7)");
assertEqual(err("station { name }").message, "Syntax Error: Expected \"{\" or \"query\" but found \"station\" (1:1)");
assertEqual(err("mutation { a }").message, "Syntax Error: Only queries are supported (1:1)");
assertEqual(err("subscription { a }").message.includes("Only queries"), true);
assertEqual(err("{ a(id) }").message, "Syntax Error: Expected \":\" but found \")\" (1:7)");
assertEqual(err("{ a(id: ) }").message, "Syntax Error: Expected a value but found \")\" (1:9)");
assertEqual(err("{ a() }").message, "Syntax Error: Expected an argument name but found \")\" (1:5)", "arguments need at least one entry");
assertEqual(err("").message, "Syntax Error: Expected \"{\" or \"query\" but found end of input (1:1)");
const multi = err("{\n  a {\n    b\n  \n}");
assertEqual([multi.line, multi.column], [5, 2], "errors across lines");
assertEqual(err("{ a(id: \"x\" }").message, "Syntax Error: Expected \")\" but found \"}\" (1:13)");`),
      },
      {
        id: "t7",
        description: "parseGraph limits nesting depth",
        assertionCode: T(js`const nest = (depth) => "{ a ".repeat(depth) + "b " + "}".repeat(depth);
assertEqual(parseGraph(nest(8)).selections[0].name, "a", "eight levels are allowed");
const e = assertThrows(() => parseGraph(nest(9)), "nested too deeply");
assertEqual(e.message.includes("max 8 levels"), true, e.message);
assert(e instanceof GraphSyntaxError, "reported like any other syntax error");
const huge = nest(5000);
let caught;
try { parseGraph(huge); } catch (err) { caught = err; }
assert(caught instanceof GraphSyntaxError, "a 5000-level query is refused cleanly, not with a stack overflow: " + caught);`),
      },
      {
        id: "t8",
        description: "The parser is available to the control room",
        assertionCode: T(js`assertEqual(typeof parseGraph, "function");
const tree = parseGraph('{ station(id: "st-01") { name } }');
assertEqual(tree.selections[0].args.id, "st-01");
assertEqual(tree.selections[0].selections[0].name, "name");`),
      },
    ],
    unlocks: ["api-graph-query"],
    checks: [
      {
        prompt: md`Why does a parser for nested braces need recursion (or an explicit stack) instead of a single regular expression?`,
        question: {
          type: "choice",
          options: [
            "Regular expressions are too slow",
            "Matching arbitrarily deep nesting requires remembering how many levels are open, which a regular expression cannot count",
            "JavaScript regular expressions cannot match braces",
            "Because queries contain strings",
          ],
          answer: 1,
        },
        explanation: md`Nesting is a counting problem. Recursive descent gets its memory for free from the call stack: each open brace is a function call waiting to see its closing brace.`,
      },
      {
        prompt: md`Why is there a maximum nesting depth in a parser that reads text from strangers?`,
        question: {
          type: "choice",
          options: [
            "Deep queries are ugly",
            "A hostile query with thousands of levels could exhaust the call stack or the CPU, so the work any one request can cause must be bounded",
            "Because graphs cannot be deeper than 8",
            "To make the parser faster for normal queries",
          ],
          answer: 1,
        },
        explanation: md`Every input-driven loop or recursion needs a ceiling. Limits turn a possible outage into an ordinary, cheap error response.`,
      },
    ],
  },

  // ───────────────────────────────────────── 19. Query executor and endpoint
  {
    id: "js-api-19-graph-run",
    title: "Executing queries over resolvers",
    minutes: 55,
    xp: 260,
    concepts: ["schema", "resolvers", "field selection", "validation before execution", "partial results", "query depth", "N+1"],
    learn: md`### From a tree to data

You have an AST. Executing it means walking the tree and, for each field, asking "what is the value of this field on this object?". Two ingredients make that work.

### The schema

A **schema** names the types and their fields. Ours is a plain object:

~~~js
const graphSchema = {
  Query:   { station: { type: "Station", args: { id: "String!" }, resolve: (_, args) => db.stations.get(args.id) }, ... },
  Station: { name: "String", capacity: "Int", bikes: { type: "[Bike]", resolve: (station) => bikesAt(station.id) } },
  Bike:    { id: "String", battery: "Int", station: { type: "Station", resolve: (bike) => ... } },
};
~~~

A field is either a bare type name (read the property of the same name from the parent object) or an object with a ¦type¦, optional ¦args¦ (each ¦"String"¦, ¦"Int"¦ or ¦"Boolean"¦, with ¦!¦ meaning required) and an optional ¦resolve(parent, args)¦ function. ¦[Bike]¦ means a list of bikes. The root type is ¦Query¦, and its fields are the entry points.

### Resolvers

A **resolver** is a function that produces the value of one field, given the parent object and the arguments. The ¦Station.bikes¦ resolver looks up bikes by the parent station's id; ¦Bike.station¦ goes back the other way. The graph is just a set of functions that know how to hop from one object to related ones, and a query is a route through them.

### Execution

For the object currently being resolved, process every requested field **concurrently** (sibling fields are independent, so resolve them together with ¦Promise.all¦) and assemble a result object containing **only the requested keys**. If a field's value is another object, recurse into its selections; if it is a list, do this for every element; if it is a scalar, return it.

### Validate before executing

A query that asks for fields that do not exist should fail **without running any resolver**. A validation pass walks the tree against the schema and collects messages: ¦Cannot query field "colour" on type "Station"¦, missing required arguments, unknown arguments, wrong argument types, a missing sub-selection on an object field (¦station¦ alone is meaningless), a sub-selection on a scalar. Invalid query: response is just ¦{ errors }¦.

### Errors and partial results

During execution a resolver can fail (the database is down for one lookup). GraphQL's answer is deliberately forgiving: that field becomes ¦null¦, an entry with its ¦message¦ and ¦path¦ goes into an ¦errors¦ array, and **everything else is still returned**. A client can show what it got. Messages must be safe: an unexpected exception is reported as ¦Internal error¦ (and logged), not with its text.

### HTTP

All queries go to **one endpoint**, ¦POST /graphql¦ with ¦{ "query": "..." }¦, and the HTTP status is **200 even when the body contains errors**, because the transport worked. That is a real convention with real consequences: monitoring must look inside the body, and an ordinary HTTP cache is useless for POST. Authentication, rate limits and validation of the request body still apply as usual.

### Production concerns you now understand

- **Depth and cost limits**: a query can ask for ¦stations { bikes { station { bikes { station ... } } } }¦, an amplifier that fetches the whole database. Cap depth (we use 5) before executing.
- **The N+1 problem**: ¦stations { bikes { id } }¦ runs one resolver for stations and then one lookup *per station*. Real servers batch these lookups (the DataLoader pattern). Ours is honest about the cost by keeping it visible.
- What we left out: variables, aliases, fragments, mutations, subscriptions, introspection, non-null enforcement. The mechanics of each build on what you have just written.

### Common mistakes

- Running resolvers for fields that fail validation.
- Letting one failing field fail the whole response.
- Returning resolver exception messages to the client.
- No depth limit.
- Using 4xx statuses for GraphQL errors in one place and 200 in another.`,
    mission: md`The mobile team has their query language. Give it an engine: a schema over stations and bikes, resolvers that read your repositories, validation that rejects nonsense before touching the database, and a single endpoint.

The control room's Graph console lets you type a query, run it and read the data and errors that come back, including the partial results when one resolver breaks.`,
    tasks: [
      "graphSchema with Query, Station and Bike types and resolvers over the repositories",
      "validateGraph(tree): unknown fields, missing or unknown or mistyped arguments, selection rules, depth limit",
      "executeGraph(source): parse, validate, resolve siblings concurrently, return only requested fields, partial results with error paths",
      "POST /graphql, always 200 with { data, errors? }, body validated before use",
    ],
    starterAdd: js`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 19: answering queries.

const GRAPH_MAX_QUERY_DEPTH = 5; // levels of selection sets (the top level counts as 1)

// ── the schema ──
// A field is a type name ("String", "Int", "Boolean", a type of this schema, or a list like "[Bike]")
// or { type, args?: { name: "String!" | "Int" | ... }, resolve?(parent, args) }.
// Without resolve the value is parent[fieldName]. Query is the root type: its resolvers receive undefined as the parent.
const graphSchema = {
  Query: {
    // TODO: station(id: String!) -> Station (db.stations.get)
    //       stations(zone: String)  -> [Station] (all stations, or only those in the zone)
    //       bike(id: String!)       -> Bike (db.bikes.get)
    //       bikes(kind: String, status: String) -> [Bike] (filtered)
  },
  Station: {
    id: "String",
    name: "String",
    zone: "String",
    capacity: "Int",
    // TODO: bikes -> [Bike]  the bikes whose stationId is this station's id
    // TODO: available -> Int the number of bikes at this station with status "available"
  },
  Bike: {
    id: "String",
    kind: "String",
    battery: "Int",
    status: "String",
    // TODO: station -> Station  the bike's station, or null while it is rented (stationId is null)
  },
};

const isScalar = (type) => ["String", "Int", "Boolean"].includes(type);
const baseType = (type) => type.replace(/[\[\]!]/g, "");

// Check a parsed query against the schema WITHOUT running anything. Return a list of { message, path } (empty = valid):
//   unknown field          ¦Cannot query field "colour" on type "Station".¦
//   unknown argument       ¦Unknown argument "limit" on field "Query.stations".¦
//   missing required arg   ¦Argument "id" of type "String!" is required on field "Query.station".¦
//   wrong argument type    ¦Argument "id" on field "Query.station" must be a String.¦   (Int: a whole number, Boolean: true / false)
//   object field without a selection   ¦Field "station" of type "Station" must have a selection of subfields.¦
//   scalar field with a selection      ¦Field "name" of type "String" must not have a selection of subfields.¦
//   deeper than GRAPH_MAX_QUERY_DEPTH  ¦Query is too deep (max 5 levels).¦  (path of the field that goes too deep)
// path is the list of field names from the root, e.g. ["station", "colour"]. Skip the children of a field that is already wrong.
function validateGraph(tree) {
  // TODO
}

// Run a query and return { data } or { data, errors } or (invalid / unparsable) just { errors }.
//   - parseGraph throws a GraphSyntaxError -> { errors: [{ message: error.message }] }
//   - validateGraph problems -> { errors } and NO resolver runs
//   - otherwise resolve: all sibling fields concurrently (Promise.all); the result object holds only the requested fields (keys in query order);
//     null stays null; lists resolve every element; object values recurse into the selections
//   - a resolver that throws: that field becomes null and { message, path } is added to errors, where path includes list positions
//     like ["stations", 2, "bikes"]; the message is the error's message for an HttpError, and "Internal error" for anything else
//     (log the real one with log.error)
//   - { data, errors } only when there is at least one error, otherwise { data }
async function executeGraph(source) {
  // TODO
}

// POST /graphql with { query } (a string, required, at most 2000 characters). Answers 200 with whatever executeGraph returns.
router.post("/graphql", async function graphql(req, res) {
  // TODO
});

// TODO: router.before("POST", "/graphql", validateBody(...))
`,
    solutionAdd: js`const GRAPH_MAX_QUERY_DEPTH = 5;

const graphSchema = {
  Query: {
    station: { type: "Station", args: { id: "String!" }, resolve: (_, args) => db.stations.get(args.id) },
    stations: {
      type: "[Station]",
      args: { zone: "String" },
      resolve: async (_, args) => (await db.stations.list()).filter((s) => args.zone === undefined || s.zone === args.zone),
    },
    bike: { type: "Bike", args: { id: "String!" }, resolve: (_, args) => db.bikes.get(args.id) },
    bikes: {
      type: "[Bike]",
      args: { kind: "String", status: "String" },
      resolve: async (_, args) =>
        (await db.bikes.list()).filter((b) => (args.kind === undefined || b.kind === args.kind) && (args.status === undefined || b.status === args.status)),
    },
  },
  Station: {
    id: "String",
    name: "String",
    zone: "String",
    capacity: "Int",
    bikes: { type: "[Bike]", resolve: async (station) => (await db.bikes.list()).filter((b) => b.stationId === station.id) },
    available: {
      type: "Int",
      resolve: async (station) => (await db.bikes.list()).filter((b) => b.stationId === station.id && b.status === "available").length,
    },
  },
  Bike: {
    id: "String",
    kind: "String",
    battery: "Int",
    status: "String",
    station: { type: "Station", resolve: (bike) => (bike.stationId ? db.stations.get(bike.stationId) : null) },
  },
};

const isScalar = (type) => ["String", "Int", "Boolean"].includes(type);
const baseType = (type) => type.replace(/[\[\]!]/g, "");
const fieldDef = (def) => (typeof def === "string" ? { type: def } : def);

function argumentTypeOk(type, value) {
  const base = baseType(type);
  if (base === "String") return typeof value === "string";
  if (base === "Int") return Number.isInteger(value);
  if (base === "Boolean") return typeof value === "boolean";
  return false;
}

function validateGraph(tree) {
  const problems = [];
  const visit = (selections, typeName, path, depth) => {
    for (const sel of selections) {
      const here = [...path, sel.name];
      const raw = graphSchema[typeName]?.[sel.name];
      if (raw === undefined) {
        problems.push({ message: ¦Cannot query field "\${sel.name}" on type "\${typeName}".¦, path: here });
        continue;
      }
      const def = fieldDef(raw);
      const where = ¦\${typeName}.\${sel.name}¦;
      let ok = true;
      for (const name of Object.keys(sel.args)) {
        if (!def.args || !(name in def.args)) {
          problems.push({ message: ¦Unknown argument "\${name}" on field "\${where}".¦, path: here });
          ok = false;
        } else if (sel.args[name] !== null && !argumentTypeOk(def.args[name], sel.args[name])) {
          problems.push({ message: ¦Argument "\${name}" on field "\${where}" must be a \${baseType(def.args[name])}.¦, path: here });
          ok = false;
        }
      }
      for (const [name, type] of Object.entries(def.args ?? {})) {
        if (type.endsWith("!") && (sel.args[name] === undefined || sel.args[name] === null)) {
          problems.push({ message: ¦Argument "\${name}" of type "\${type}" is required on field "\${where}".¦, path: here });
          ok = false;
        }
      }
      const scalar = isScalar(baseType(def.type));
      if (scalar && sel.selections.length > 0) {
        problems.push({ message: ¦Field "\${sel.name}" of type "\${def.type}" must not have a selection of subfields.¦, path: here });
        ok = false;
      }
      if (!scalar && sel.selections.length === 0) {
        problems.push({ message: ¦Field "\${sel.name}" of type "\${def.type}" must have a selection of subfields.¦, path: here });
        ok = false;
      }
      if (ok && !scalar) {
        if (depth >= GRAPH_MAX_QUERY_DEPTH) problems.push({ message: ¦Query is too deep (max \${GRAPH_MAX_QUERY_DEPTH} levels).¦, path: here });
        else visit(sel.selections, baseType(def.type), here, depth + 1);
      }
    }
  };
  visit(tree.selections, "Query", [], 1);
  return problems;
}

async function executeGraph(source) {
  let tree;
  try {
    tree = parseGraph(source);
  } catch (err) {
    if (err instanceof GraphSyntaxError) return { errors: [{ message: err.message }] };
    throw err;
  }
  const invalid = validateGraph(tree);
  if (invalid.length > 0) return { errors: invalid };

  const errors = [];
  const complete = async (type, value, sel, path) => {
    if (value === null || value === undefined) return null;
    if (type.startsWith("[")) return Promise.all(value.map((item, i) => complete(type.slice(1, -1), item, sel, [...path, i])));
    const base = baseType(type);
    if (isScalar(base)) return value;
    return resolveSelections(sel.selections, base, value, path);
  };
  const resolveField = async (sel, parentType, parent, path) => {
    const def = fieldDef(graphSchema[parentType][sel.name]);
    try {
      const raw = def.resolve ? await def.resolve(parent, sel.args) : parent?.[sel.name];
      return await complete(def.type, raw, sel, path);
    } catch (err) {
      if (!(err instanceof HttpError)) log.error("graph resolver failed", { field: ¦\${parentType}.\${sel.name}¦, error: err.message });
      errors.push({ message: err instanceof HttpError ? err.message : "Internal error", path });
      return null;
    }
  };
  const resolveSelections = async (selections, typeName, parent, path) => {
    const entries = await Promise.all(selections.map(async (sel) => [sel.name, await resolveField(sel, typeName, parent, [...path, sel.name])]));
    return Object.fromEntries(entries);
  };

  const data = await resolveSelections(tree.selections, "Query", undefined, []);
  return errors.length > 0 ? { data, errors } : { data };
}

router.post("/graphql", async function graphql(req, res) {
  res.json(await executeGraph(req.valid.query));
});

router.before("POST", "/graphql", validateBody({ query: { type: "string", required: true, max: 2000 } }));`,
    explanation:
      "The schema is data, so validation and execution are two generic walkers over it. validateGraph never calls a resolver: it checks fields, argument names, types and required-ness, and the object-versus-scalar selection rules, and stops descending at the first wrong field, with a depth ceiling. executeGraph resolves every sibling field concurrently with Promise.all, and builds the result from the requested fields only. complete handles null, lists and nested objects; a failing resolver is contained at its own field (null plus an error with a path, message masked unless it is an HttpError) so the rest of the response survives. The route adds only request-body validation; the status is 200 because GraphQL carries its errors in the body.",
    hints: [
      { id: "h1", title: "The schema", content: "Query.station: { type: \"Station\", args: { id: \"String!\" }, resolve: (_, args) => db.stations.get(args.id) }. For lists, filter inside async resolvers: (await db.stations.list()).filter(...). Station.bikes: { type: \"[Bike]\", resolve: async (station) => (await db.bikes.list()).filter((b) => b.stationId === station.id) }. Bike.station returns null when bike.stationId is null." },
      { id: "h2", title: "validateGraph", content: "A recursive visit(selections, typeName, path, depth). For each selection look up graphSchema[typeName][sel.name]; no definition -> 'Cannot query field' and continue. Normalise a string definition to { type }. Check sel.args against def.args (unknown name, type, missing required ones with a trailing !). A scalar base type (strip [ ] and !) must have no sub-selection, an object type must have one. Recurse into baseType(def.type) with depth + 1, and report 'too deep' when depth is already GRAPH_MAX_QUERY_DEPTH." },
      { id: "h3", title: "executeGraph", content: "resolveSelections(selections, typeName, parent, path) = Object.fromEntries(await Promise.all(selections.map(async (sel) => [sel.name, await resolveField(...)]))). resolveField calls def.resolve(parent, sel.args) (or parent[sel.name]) inside try/catch and passes the result to complete(), which returns null for null, maps lists with Promise.all, returns scalars unchanged and recurses for object types. On a catch push { message, path } and return null." },
    ],
    tests: [
      {
        id: "t1",
        description: "Simple queries return exactly the requested fields",
        assertionCode: T(js`db.reset();
const result = await executeGraph('{ station(id: "st-03") { name capacity } }');
assertEqual(result, { data: { station: { name: "Tram Depot", capacity: 14 } } }, "only name and capacity, nothing else");
assertEqual(Object.keys((await executeGraph('{ station(id: "st-03") { capacity name } }')).data.station), ["capacity", "name"], "keys follow the query order");
const list = await executeGraph('{ stations(zone: "central") { id name } }');
assertEqual(list.data.stations, [{ id: "st-03", name: "Tram Depot" }, { id: "st-08", name: "Rail Hall" }]);
assertEqual((await executeGraph("{ stations { id } }")).data.stations.length, 8);
assertEqual((await executeGraph('{ bike(id: "bk-102") { kind battery status } }')).data.bike, { kind: "electric", battery: 88, status: "available" });
assertEqual((await executeGraph('{ bikes(kind: "electric", status: "service") { id } }')).data.bikes, [], "no electric bike is in service");
assertEqual((await executeGraph('{ bike(id: "bk-107") { id } }')).data.bike, { id: "bk-107" });`),
      },
      {
        id: "t2",
        description: "Relations: nested fields in one request, in both directions",
        assertionCode: T(js`db.reset();
const r = await executeGraph('{ station(id: "st-01") { name available bikes { id kind } } }');
assertEqual(r.data.station.name, "Harbour Gate");
assertEqual(r.data.station.available, 4);
assertEqual(r.data.station.bikes, [{ id: "bk-101", kind: "classic" }, { id: "bk-102", kind: "electric" }, { id: "bk-103", kind: "classic" }, { id: "bk-104", kind: "electric" }]);
const back = await executeGraph('{ bike(id: "bk-111") { battery station { name zone } } }');
assertEqual(back.data.bike, { battery: 12, station: { name: "Tram Depot", zone: "central" } }, "from a bike back to its station");
const deep = await executeGraph('{ stations(zone: "park") { name bikes { id station { id } } } }');
assertEqual(deep.data.stations, [{ name: "Botanic Steps", bikes: [{ id: "bk-113", station: { id: "st-04" } }, { id: "bk-114", station: { id: "st-04" } }] }]);
assertEqual((await executeGraph('{ station(id: "st-02") { available } }')).data.station.available, 2, "bk-107 is in service, so only two are available");
await db.bikes.update("bk-109", { stationId: null, status: "rented" });
assertEqual((await executeGraph('{ bike(id: "bk-109") { station { name } } }')).data.bike.station, null, "a rented bike has no station: null");
assertEqual((await executeGraph('{ station(id: "st-99") { name } }')).data.station, null, "an unknown id is null, not an error");`),
      },
      {
        id: "t3",
        description: "Invalid queries are rejected before any resolver runs",
        assertionCode: T(js`db.reset();
let resolverCalls = 0;
const real = db.stations.get;
db.stations.get = async (id) => { resolverCalls++; return real.call(db.stations, id); };
const msgs = async (q) => (await executeGraph(q)).errors?.map((e) => e.message);
try {
  assertEqual(await msgs('{ station(id: "st-01") { colour } }'), ['Cannot query field "colour" on type "Station".']);
  assertEqual(await msgs("{ nothing }"), ['Cannot query field "nothing" on type "Query".']);
  assertEqual(await msgs("{ station { name } }"), ['Argument "id" of type "String!" is required on field "Query.station".']);
  assertEqual(await msgs('{ station(id: "a", limit: 2) { name } }'), ['Unknown argument "limit" on field "Query.station".']);
  assertEqual(await msgs("{ station(id: 5) { name } }"), ['Argument "id" on field "Query.station" must be a String.']);
  assertEqual(await msgs('{ stations(zone: true) { id } }'), ['Argument "zone" on field "Query.stations" must be a String.']);
  assertEqual(await msgs('{ station(id: "st-01") }'), ['Field "station" of type "Station" must have a selection of subfields.']);
  assertEqual(await msgs('{ station(id: "st-01") { name { first } } }'), ['Field "name" of type "String" must not have a selection of subfields.']);
  assertEqual(await msgs('{ station(id: "st-01") { name colour size } }'), ['Cannot query field "colour" on type "Station".', 'Cannot query field "size" on type "Station".'], "every problem is reported");
  const result = await executeGraph('{ station(id: "st-01") { colour } }');
  assertEqual(Object.keys(result), ["errors"], "an invalid query has no data key at all");
  assertEqual(result.errors[0].path, ["station", "colour"], "errors carry their path");
  assertEqual(resolverCalls, 0, "no resolver ran for any invalid query");
} finally { db.stations.get = real; }`),
      },
      {
        id: "t4",
        description: "Syntax errors and depth limits",
        assertionCode: T(js`const syntax = await executeGraph("{ station(id: ) }");
assertEqual(Object.keys(syntax), ["errors"]);
assert(syntax.errors[0].message.startsWith("Syntax Error:"), syntax.errors[0].message);
const nested = (levels) => "{ stations ".repeat(0) + 'stations { bikes { station { bikes { station { id } } } } }';
const ok = await executeGraph("{ stations { bikes { station { bikes { id } } } } }");
assertEqual(ok.errors, undefined, "five levels of selections are fine");
const tooDeep = await executeGraph("{ stations { bikes { station { bikes { station { id } } } } } }");
assertEqual(tooDeep.errors.map((e) => e.message), ["Query is too deep (max 5 levels)."], "a sixth level is refused before running anything");
assertEqual(tooDeep.data, undefined);`),
      },
      {
        id: "t5",
        description: "A failing resolver nulls its field and reports a path; the rest survives",
        assertionCode: T(js`db.reset();
logBuffer.length = 0;
const real = db.bikes.list;
db.bikes.list = async () => { throw new Error("connection to 10.0.0.9 refused, password=hunter2"); };
let r;
try { r = await executeGraph('{ station(id: "st-03") { name bikes { id } available } stations(zone: "park") { id } }'); } finally { db.bikes.list = real; }
assertEqual(r.data.station.name, "Tram Depot", "healthy fields are still returned");
assertEqual([r.data.station.bikes, r.data.station.available], [null, null], "the failing fields are null");
assertEqual(r.data.stations, [{ id: "st-04" }], "and so is the unrelated root field");
assertEqual(r.errors.length, 2);
assertEqual(r.errors.map((e) => e.path).sort(), [["station", "available"], ["station", "bikes"]]);
assertEqual(r.errors.every((e) => e.message === "Internal error"), true, "unexpected failures never leak their text");
assert(!JSON.stringify(r).includes("hunter2"));
assert(recentLogs(10).some((e) => String(e.error).includes("hunter2")), "but the real message is logged");
const lists = await (async () => {
  db.bikes.list = async () => { throw new HttpError(503, "Fleet service is busy"); };
  try { return await executeGraph("{ stations(zone: \"park\") { id bikes { id } } }"); } finally { db.bikes.list = real; }
})();
assertEqual(lists.errors, [{ message: "Fleet service is busy", path: ["stations", 0, "bikes"] }], "HttpError messages are safe to show, and list positions appear in the path");
logBuffer.length = 0;`),
      },
      {
        id: "t6",
        description: "Sibling fields are resolved concurrently",
        assertionCode: T(js`db.reset();
const realGet = db.stations.get;
const realList = db.bikes.list;
db.stations.get = async (id) => { await sleep(100); return realGet.call(db.stations, id); };
db.bikes.list = async () => { await sleep(100); return realList.call(db.bikes); };
const start = Date.now();
let r;
try { r = await executeGraph('{ station(id: "st-01") { name } bikes(kind: "electric") { id } }'); } finally { db.stations.get = realGet; db.bikes.list = realList; }
const took = Date.now() - start;
assertEqual(r.data.station.name, "Harbour Gate");
assertEqual(r.data.bikes.length, 11);
assert(took < 150, "two 100 ms lookups side by side should take about 100 ms, not 200: took " + took);`),
      },
      {
        id: "t7",
        description: "POST /graphql: one endpoint, always 200, body validated",
        assertionCode: T(js`db.reset();
const ok = await call("POST", "/graphql", { body: { query: '{ station(id: "st-05") { name zone } }' } });
assertEqual(ok.status, 200);
assertEqual(ok.body, { data: { station: { name: "Foundry Square", zone: "east" } } });
const bad = await call("POST", "/graphql", { body: { query: "{ station(id: \"st-05\") { colour } }" } });
assertEqual(bad.status, 200, "GraphQL errors travel in a 200 response");
assertEqual(bad.body.errors[0].message, 'Cannot query field "colour" on type "Station".');
const syntax = await call("POST", "/graphql", { body: { query: "{ oops" } });
assertEqual([syntax.status, typeof syntax.body.errors[0].message], [200, "string"]);
const missing = await call("POST", "/graphql", { body: {} });
assertEqual([missing.status, missing.body.errors[0].field], [400, "query"], "a missing query is an ordinary 400");
assertEqual((await call("POST", "/graphql", { body: { query: 5 } })).status, 400);
assertEqual((await call("POST", "/graphql", { body: { query: "{ stations { id } }", extra: 1 } })).status, 400, "unknown request fields are refused");
assertEqual((await call("POST", "/graphql", { body: { query: "{ " + "a ".repeat(1500) + "}" } })).status, 400, "queries over 2000 characters are refused before parsing");
assertEqual((await call("GET", "/graphql")).status, 405, "only POST is routed");
assert(ok.trace.includes("graphql"), "the handler shows in the trace");
const viaText = await call("POST", "/graphql", { body: JSON.stringify({ query: "{ stations { id } }" }), headers: { "content-type": "application/json" } });
assertEqual(viaText.body.data.stations.length, 8, "a JSON text body works too");`),
      },
    ],
    unlocks: ["api-graph"],
    checks: [
      {
        prompt: md`A query contains a typo: ¦{ station(id: "st-01") { nmae } }¦. What should the server do?`,
        question: {
          type: "choice",
          options: [
            "Run the station resolver and return null for nmae",
            "Reject it during validation with a clear message, before any resolver runs",
            "Return a 500",
            "Ignore the field and return an empty object",
          ],
          answer: 1,
        },
        explanation: md`Validation is a pure check against the schema. Failing early is cheaper, safer (no database work for garbage) and gives the client a precise error.`,
      },
      {
        prompt: md`One resolver in a query throws. Why does GraphQL still answer 200 with the other fields filled in and an errors entry?`,
        question: {
          type: "choice",
          options: [
            "Because HTTP forbids error statuses on POST",
            "A client rendering a screen from many fields is better served by partial data plus a precise error with a path than by losing everything because one field failed",
            "To hide the problem from monitoring",
            "Because resolvers cannot fail",
          ],
          answer: 1,
        },
        explanation: md`Fields are independent units of data. Partial results let a client degrade gracefully, at the price that monitoring has to read the body instead of just the status line.`,
      },
    ],
  },
];
