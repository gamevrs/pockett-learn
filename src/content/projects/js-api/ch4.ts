import type { Lesson } from "@/engine/types";
import { js, md, T } from "./shared.ts";

/** Chapter 4: Speed and resilience. HTTP caching, calling upstreams safely, a circuit breaker and graceful shutdown. */
export const chapter4: Lesson[] = [
  // ───────────────────────────────────────── 13. HTTP caching
  {
    id: "js-api-13-caching",
    title: "ETags and conditional requests",
    minutes: 40,
    xp: 200,
    concepts: ["ETag", "If-None-Match", "304 Not Modified", "Cache-Control", "Vary", "If-Match and 412"],
    learn: md`### The fastest request is the one you do not repeat

A kiosk redraws its station list every few seconds. Nearly every time, nothing changed. Sending the same 3 KB of JSON again wastes bandwidth, battery and server time. HTTP has a built-in answer that every browser, proxy and HTTP library understands: **validators** and **conditional requests**.

### The ETag handshake

1. The first response carries an ¦ETag¦ header: a short fingerprint of the exact representation, like ¦"9f3a1c02"¦ (quotes included).
2. The client keeps the body and the ETag. Next time it asks again with ¦If-None-Match: "9f3a1c02"¦ ("send it only if it is *not* still this version").
3. If the fingerprint still matches, the server answers **304 Not Modified** with **no body**. The client reuses what it has. If not, a normal 200 with a new ETag.

A 304 still costs a request, but it is tiny, and the server can skip building the payload in more advanced designs. For our in-memory handlers we compute the response first and then decide.

The fingerprint must be a pure function of the content. We hash a **canonical** form of the body (sorted keys, so key order cannot change the tag) with FNV-1a, a simple non-cryptographic 32-bit hash. An ETag does not need to resist attackers; it needs to be cheap and change when the content changes.

### Matching rules

¦If-None-Match¦ can hold a list (¦"a", "b"¦), the wildcard ¦*¦, and "weak" tags prefixed ¦W/¦ (equivalent in meaning but not byte for byte). For GET, weak comparison is correct: strip any ¦W/¦ on both sides before comparing.

### Cache-Control: who may store it, for how long

- ¦public, max-age=30¦: any cache (browser, CDN) may reuse it for 30 seconds *without asking*. Suitable for the station list that anyone may read.
- ¦private, max-age=0, must-revalidate¦: only the user's own browser may keep it, and it must check back every time (that is what the ETag is for). Anything that depends on the caller's identity - responses to an authenticated request - belongs here, because a shared cache must never hand Ana's data to Ben.
- ¦no-store¦: do not keep it at all. Use it for errors: a cached 404 or 500 would keep haunting people after the problem is fixed.

Add ¦Vary: authorization¦ so caches know the response depends on that header.

### The same tag protects writes: If-Match

Two mechanics open the same station form, both edit, both save. The second save silently erases the first: the **lost update** problem. If the client sends ¦If-Match: "9f3a1c02"¦ with its PATCH ("apply this only if it is still that version"), the server compares with the current tag and answers **412 Precondition Failed** on mismatch. No locks, no database transactions: the version the client *saw* travels with the change. This is **optimistic concurrency**.

### Where it plugs in

A global middleware lets the route run (¦await next()¦) and then post-processes successful GET responses: tag, policy, 304 if the validator matches. It must not touch POSTs, errors or empty bodies. ¦ifMatch¦ is a small route guard for the write routes.

### Common mistakes

- Putting a timestamp or a random value in the ETag, so it never matches.
- ¦public¦ on a response that varies by user.
- Forgetting that a 304 must still send the ETag and Cache-Control headers, and must not send a body or a content-type.
- Caching error responses.
- Strong-versus-weak confusion: do not require byte equality for If-None-Match.`,
    mission: md`The station kiosks poll ¦/stations¦ every five seconds, one thousand kiosks, all day. Almost all of that traffic is identical bytes. And twice this week two mechanics edited the same station and one of them lost their change.

Teach your API to say "nothing changed" and to refuse edits made against stale data. The control room's cache panel counts 200s and 304s and shows the saved bytes.`,
    tasks: [
      "fnv1a(text) and etagFor(body) (canonical JSON, quoted)",
      "etagMatches(header, etag): lists, wildcard and weak tags",
      "conditionalGet middleware: ETag, Cache-Control (public / private / no-store), Vary, 304 without body",
      "ifMatch(loadEtag) guard answering 412 for stale writes, attached to PUT and PATCH of stations",
    ],
    starterAdd: js`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 13: validators and conditional requests.

// 32-bit FNV-1a hash as 8 lowercase hex digits (zero padded).
//   start 0x811c9dc5; for each UTF-16 code unit: hash ^= unit; hash = Math.imul(hash, 0x01000193) >>> 0
//   fnv1a("") === "811c9dc5", fnv1a("a") === "e40c292c", fnv1a("foobar") === "bf9cf968"
function fnv1a(text) {
  // TODO
}

// The strong ETag of a body: its canonicalJson (lesson 11) hashed and wrapped in double quotes, e.g. "\"9f3a1c02\"".
function etagFor(body) {
  // TODO
}

// Does an If-None-Match / If-Match header value match this etag?
//   undefined -> false;  "*" -> true;  otherwise a comma separated list of tags: trim each, ignore a W/ prefix on either side, compare
function etagMatches(header, etag) {
  // TODO
}

// What Cache-Control to send for this request's response:
//   an authenticated request (req.user)         -> "private, max-age=0, must-revalidate"
//   a path starting with /stations or /bikes     -> "public, max-age=30"
//   anything else                                -> "no-cache"
function cachePolicy(req) {
  // TODO
}

// Global middleware, after the rest of the chain ran (await next()):
//   - error responses (status >= 400): cache-control "no-store" and nothing else
//   - GET with status 200 and a body: set etag (etagFor(res.payload)), cache-control (cachePolicy) and vary "authorization";
//     when etagMatches(req.header("if-none-match"), etag): status 304, drop the body and the content-type
//   - everything else is left alone
async function conditionalGet(req, res, next) {
  // TODO
}

// TODO: app.use(conditionalGet);

// Route guard for optimistic concurrency. loadEtag(req) is async and returns the CURRENT etag of the target, or undefined when it does not exist.
//   no If-Match header, or the target does not exist (the handler will answer 404)  -> carry on
//   header present and not matching the current etag (etagMatches)                  -> HttpError 412, code "precondition_failed",
//                                                                                      message "The resource changed since you fetched it"
// The returned function is named ifMatch.
function ifMatch(loadEtag) {
  // TODO
}

const stationEtag = async (req) => {
  const found = await db.stations.get(req.params.id);
  return found ? etagFor(found) : undefined;
};
// TODO: router.before for PUT and PATCH /stations/:id with ifMatch(stationEtag)
`,
    solutionAdd: js`function fnv1a(text) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

function etagFor(body) {
  return ¦"\${fnv1a(canonicalJson(body))}"¦;
}

function etagMatches(header, etag) {
  if (header === undefined) return false;
  if (header.trim() === "*") return true;
  const strip = (tag) => tag.trim().replace(/^W\//, "");
  return header.split(",").some((candidate) => strip(candidate) === strip(etag));
}

function cachePolicy(req) {
  if (req.user) return "private, max-age=0, must-revalidate";
  if (req.path.startsWith("/stations") || req.path.startsWith("/bikes")) return "public, max-age=30";
  return "no-cache";
}

async function conditionalGet(req, res, next) {
  await next();
  if (res.statusCode >= 400) {
    res.set("cache-control", "no-store");
    return;
  }
  if (req.method !== "GET" || res.statusCode !== 200 || res.payload === undefined) return;
  const etag = etagFor(res.payload);
  res.set("etag", etag);
  res.set("cache-control", cachePolicy(req));
  res.set("vary", "authorization");
  if (etagMatches(req.header("if-none-match"), etag)) {
    res.status(304);
    res.payload = undefined;
    delete res.headers["content-type"];
  }
}

app.use(conditionalGet);

function ifMatch(loadEtag) {
  return async function ifMatch(req, res, next) {
    const header = req.header("if-match");
    if (header === undefined) return next();
    const current = await loadEtag(req);
    if (current !== undefined && !etagMatches(header, current)) {
      throw new HttpError(412, "The resource changed since you fetched it", { code: "precondition_failed" });
    }
    return next();
  };
}

const stationEtag = async (req) => {
  const found = await db.stations.get(req.params.id);
  return found ? etagFor(found) : undefined;
};
router.before("PUT", "/stations/:id", ifMatch(stationEtag));
router.before("PATCH", "/stations/:id", ifMatch(stationEtag));`,
    explanation:
      "fnv1a is the textbook 32-bit FNV-1a loop; etagFor feeds it the canonical JSON from lesson 11 so key order cannot change the tag. etagMatches handles the three shapes of the header (missing, wildcard, list with optional weak prefixes). conditionalGet runs after the route: it tags successful GET bodies, picks a cache policy that is private for authenticated calls, and converts a matching validator into a bodiless 304 while keeping the ETag and Cache-Control headers; errors are marked no-store. ifMatch compares the client's version with the current one before the write runs and refuses with 412 if the resource moved on, which is optimistic concurrency without locks.",
    hints: [
      { id: "h1", title: "Hash and tag", content: "let hash = 0x811c9dc5; loop over text.charCodeAt(i): hash ^= code; hash = Math.imul(hash, 0x01000193) >>> 0. Return hash.toString(16).padStart(8, \"0\"). etagFor wraps the result in double quotes: '\"' + fnv1a(canonicalJson(body)) + '\"'." },
      { id: "h2", title: "Matching", content: "if (header === undefined) return false; if (header.trim() === \"*\") return true; const strip = (t) => t.trim().replace(/^W\\//, \"\"); return header.split(\",\").some((c) => strip(c) === strip(etag))." },
      { id: "h3", title: "The middleware", content: "await next() first. If res.statusCode >= 400 set cache-control: no-store and return. Only for GET + 200 + res.payload !== undefined compute the etag, set etag, cache-control and vary, and if it matches If-None-Match call res.status(304), set res.payload = undefined and delete res.headers[\"content-type\"]." },
    ],
    tests: [
      {
        id: "t1",
        description: "fnv1a and etagFor",
        assertionCode: T(js`assertEqual(fnv1a(""), "811c9dc5", "offset basis");
assertEqual(fnv1a("a"), "e40c292c");
assertEqual(fnv1a("foobar"), "bf9cf968");
assertEqual(fnv1a("é").length, 8, "always 8 digits");
const tag = etagFor({ a: 1, b: [1, 2] });
assert(/^"[0-9a-f]{8}"$/.test(tag), "a quoted 8-digit tag: " + tag);
assertEqual(etagFor({ b: [1, 2], a: 1 }), tag, "key order does not change the tag");
assert(etagFor({ a: 2, b: [1, 2] }) !== tag, "content changes do");
assertEqual(etagFor([1, 2, 3]), etagFor([1, 2, 3]));`),
      },
      {
        id: "t2",
        description: "etagMatches: lists, wildcard and weak tags",
        assertionCode: T(js`const tag = '"abc12345"';
assertEqual(etagMatches(undefined, tag), false);
assertEqual(etagMatches(tag, tag), true);
assertEqual(etagMatches('"other"', tag), false);
assertEqual(etagMatches("*", tag), true);
assertEqual(etagMatches('"x", "abc12345" , "y"', tag), true, "a list with spaces");
assertEqual(etagMatches('"x","y"', tag), false);
assertEqual(etagMatches('W/"abc12345"', tag), true, "a weak tag matches the strong one");
assertEqual(etagMatches(tag, 'W/"abc12345"'), true, "and the other way round");
assertEqual(etagMatches("abc12345", tag), false, "unquoted garbage does not match");`),
      },
      {
        id: "t3",
        description: "cachePolicy depends on who is asking and what",
        assertionCode: T(js`const mk = (path, user) => { const req = new HttpRequest({ url: path }); req.user = user ?? null; return req; };
assertEqual(cachePolicy(mk("/stations")), "public, max-age=30");
assertEqual(cachePolicy(mk("/stations/st-01/bikes")), "public, max-age=30");
assertEqual(cachePolicy(mk("/bikes?kind=electric")), "public, max-age=30");
assertEqual(cachePolicy(mk("/stations", { id: "u-ana", role: "rider" })), "private, max-age=0, must-revalidate", "personalised responses are never public");
assertEqual(cachePolicy(mk("/rentals", { id: "u-ana", role: "rider" })), "private, max-age=0, must-revalidate");
assertEqual(cachePolicy(mk("/health/live")), "no-cache");`),
      },
      {
        id: "t4",
        description: "conditionalGet: tags GETs, answers 304, leaves other responses alone",
        assertionCode: T(js`const make = (method, url, headers, respond) => { const req = new HttpRequest({ method, url, headers }); const res = new HttpResponse(); return { req, res, run: () => conditionalGet(req, res, async () => respond(res)) }; };
const body = { id: "st-01", name: "Harbour Gate" };
let t = make("GET", "/stations/st-01", {}, (res) => res.json(body));
await t.run();
assertEqual(t.res.statusCode, 200);
assertEqual(t.res.get("etag"), etagFor(body));
assertEqual(t.res.get("cache-control"), "public, max-age=30");
assertEqual(t.res.get("vary"), "authorization");
assertEqual(t.res.payload, body, "a normal 200 keeps its body");
t = make("GET", "/stations/st-01", { "If-None-Match": etagFor(body) }, (res) => res.json(body));
await t.run();
assertEqual(t.res.statusCode, 304, "matching validator: not modified");
const plain = t.res.toPlain();
assertEqual(plain.body, null, "no body in a 304");
assertEqual(plain.headers["content-type"], undefined, "and no content-type");
assertEqual([plain.headers.etag, plain.headers["cache-control"]], [etagFor(body), "public, max-age=30"], "but the validators and policy are still sent");
t = make("GET", "/stations/st-01", { "if-none-match": '"stale"' }, (res) => res.json(body));
await t.run();
assertEqual(t.res.statusCode, 200, "a stale validator gets the full answer");
t = make("POST", "/stations", { "if-none-match": "*" }, (res) => res.status(201).json(body));
await t.run();
assertEqual([t.res.statusCode, t.res.get("etag")], [201, undefined], "only GET is tagged");
t = make("GET", "/stations/zzz", {}, (res) => res.status(404).json({ detail: "x" }));
await t.run();
assertEqual([t.res.get("cache-control"), t.res.get("etag")], ["no-store", undefined], "errors are never cached");
t = make("GET", "/nothing", {}, (res) => res.status(204).end());
await t.run();
assertEqual(t.res.get("etag"), undefined, "no payload, no tag");`),
      },
      {
        id: "t5",
        description: "The real app: repeat reads become 304s until the data changes",
        assertionCode: T(js`db.reset();
const first = await call("GET", "/stations/st-02");
assertEqual(first.status, 200);
assert(/^"[0-9a-f]{8}"$/.test(first.headers.etag), "an ETag is sent: " + first.headers.etag);
assertEqual(first.headers["cache-control"], "public, max-age=30");
const again = await call("GET", "/stations/st-02", { headers: { "if-none-match": first.headers.etag } });
assertEqual(again.status, 304);
assertEqual(again.body, null);
assertEqual(again.headers.etag, first.headers.etag);
const list1 = await call("GET", "/stations");
const list2 = await call("GET", "/stations", { headers: { "if-none-match": list1.headers.etag } });
assertEqual(list2.status, 304, "lists are tagged too");
const patched = await call("PATCH", "/stations/st-02", { body: { capacity: 15 }, as: "u-mia" });
assertEqual(patched.status, 200);
const after = await call("GET", "/stations/st-02", { headers: { "if-none-match": first.headers.etag } });
assertEqual(after.status, 200, "the old validator no longer matches after the change");
assert(after.headers.etag !== first.headers.etag && after.body.capacity === 15, "a new tag and the new data");
const listAfter = await call("GET", "/stations", { headers: { "if-none-match": list1.headers.etag } });
assertEqual(listAfter.status, 200, "and the list changed too");
const mine = await call("GET", "/stations/st-02", { as: "u-ana" });
assertEqual(mine.headers["cache-control"], "private, max-age=0, must-revalidate", "authenticated responses are private");
const missing = await call("GET", "/stations/st-99");
assertEqual(missing.headers["cache-control"], "no-store");
assertEqual(missing.headers["content-type"], "application/problem+json");`),
      },
      {
        id: "t6",
        description: "If-Match: stale writes are refused with 412",
        assertionCode: T(js`db.reset();
const seen = await call("GET", "/stations/st-05");
const tag = seen.headers.etag;
const ok = await call("PATCH", "/stations/st-05", { body: { capacity: 11 }, headers: { "if-match": tag }, as: "u-mia" });
assertEqual(ok.status, 200, "the version the client saw is still current");
const stale = await call("PATCH", "/stations/st-05", { body: { capacity: 12 }, headers: { "if-match": tag }, as: "u-mia" });
assertEqual(stale.status, 412, "the second writer used an out-of-date tag");
assertEqual(stale.body.type, "https://dockline.example/problems/precondition-failed");
assertEqual((await call("GET", "/stations/st-05")).body.capacity, 11, "the stale write changed nothing");
const fresh = (await call("GET", "/stations/st-05")).headers.etag;
assertEqual((await call("PUT", "/stations/st-05", { body: { name: "Foundry Square", zone: "east", capacity: 13 }, headers: { "if-match": fresh }, as: "u-mia" })).status, 200, "PUT honours it too");
assertEqual((await call("PATCH", "/stations/st-05", { body: { capacity: 14 }, as: "u-mia" })).status, 200, "no If-Match header: last write wins, as before");
assertEqual((await call("PATCH", "/stations/st-05", { body: { capacity: 15 }, headers: { "if-match": "*" }, as: "u-mia" })).status, 200, "* means any existing version");
assertEqual((await call("PATCH", "/stations/st-77", { body: { capacity: 15 }, headers: { "if-match": tag }, as: "u-mia" })).status, 404, "a missing station is still a 404, not a 412");`),
      },
    ],
    unlocks: ["api-cache"],
    checks: [
      {
        prompt: md`A response to an authenticated request is sent with ¦Cache-Control: public, max-age=60¦ and a shared CDN stores it. What can go wrong?`,
        question: {
          type: "choice",
          options: [
            "Nothing, CDNs are careful",
            "The CDN may serve Ana's personalised response to Ben, because public says any cache may reuse it",
            "The response becomes larger",
            "The ETag stops working",
          ],
          answer: 1,
        },
        explanation: md`¦public¦ is a statement that the response is the same for everyone. Anything derived from the caller's identity must be ¦private¦ (or ¦no-store¦).`,
      },
      {
        prompt: md`What does ¦If-Match¦ protect against that ¦If-None-Match¦ does not?`,
        question: {
          type: "choice",
          options: [
            "Slow reads",
            "Lost updates: a write based on out-of-date data is refused with 412 instead of silently overwriting someone else's change",
            "Unauthorised access",
            "Large payloads",
          ],
          answer: 1,
        },
        explanation: md`The same fingerprint serves two jobs: on reads it avoids resending, on writes it proves the client edited the version it thinks it did.`,
      },
    ],
  },

  // ───────────────────────────────────────── 14. Outbound calls
  {
    id: "js-api-14-outbound",
    title: "Calling upstreams: timeouts and retries",
    minutes: 50,
    xp: 230,
    concepts: ["timeouts", "AbortSignal.timeout", "exponential backoff", "full jitter", "retry budget", "Retry-After", "retryable errors"],
    learn: md`### Your API is somebody else's client

The station screens show a weather note for each zone. The forecast comes from a partner's service, and that service is, like all services, sometimes slow, sometimes failing, sometimes gone. How you call it decides whether *their* bad minute becomes *your* outage.

### Rule 1: every outbound call has a deadline

A request without a timeout waits as long as the other side lets it. While it waits, your handler waits, your rider waits, memory is held, and under load those waiting requests pile up until you run out of capacity. Always set a deadline. In modern JavaScript: ¦fetch(url, { signal: AbortSignal.timeout(800) })¦. When the timer fires, the fetch rejects with a ¦TimeoutError¦. Pick the number from what a real user would tolerate, not from what the upstream usually takes.

### Rule 2: retry only what is worth retrying

A failure falls into one of two bins:

- **Transient**: the call timed out, the connection dropped, the upstream said 502, 503, 504 or 429. Trying again may well work.
- **Permanent**: 400, 401, 403, 404, malformed answers. Trying again changes nothing and only adds load.

Also retry only operations that are **safe to repeat** (a GET, or a POST protected by an idempotency key, lesson 11).

### Rule 3: back off, with jitter

Retrying immediately turns a short blip into a stampede. **Exponential backoff** waits longer after each failure: ¦base * 2^attempt¦ (100 ms, 200 ms, 400 ms...) up to a cap. But if a thousand clients all failed at the same moment and all wait exactly 200 ms, they all come back at the same moment, again. **Jitter** spreads them out. With **full jitter** each client waits a random time between 0 and the exponential ceiling:

~~~js
delay = Math.floor(random() * Math.min(maxMs, baseMs * 2 ** attempt));
~~~

Make ¦random¦ a parameter (defaulting to ¦Math.random¦) so tests can pick the value and check the arithmetic exactly.

### Rule 4: respect ¦Retry-After¦

If the upstream says "come back in 3 seconds", ignoring it is rude and pointless. Use the larger of your backoff and its hint, but if it asks for longer than your cap, give up rather than hold a rider's request for half a minute.

### Rule 5: a retry budget

Retries multiply load exactly when the upstream is struggling: three attempts per call means 3x the traffic at the worst moment. A **retry budget** limits the amplification: retries may add at most, say, 20% on top of the request volume (plus a small floor so a quiet service can still retry). When the budget is empty, fail fast. Our budget counts requests and retries since it was created; real ones use a sliding window.

### What the rider sees

If everything fails, translate the problem to your own vocabulary: **504 Gateway Timeout** when it was a timeout, **502 Bad Gateway** when the upstream was unreachable or answered badly. Never forward the upstream's raw error or status as your own.

### Common mistakes

- No timeout, or a timeout longer than the caller's.
- Retrying 400s and 404s.
- Fixed-interval retries from many clients (thundering herd).
- Unlimited retries "until it works".
- Retrying a non-idempotent write with no key.`,
    mission: md`The partner weather feed is flaky: last Friday it failed for four minutes and every station screen in the city froze waiting for it, because Dockline had no deadline and retried instantly in a loop that doubled the partner's load.

Write the careful client: a timeout on every call, jittered exponential backoff, a retry budget, and a ¦/stations/:id/forecast¦ route that uses them. The control room draws each attempt as a bar in a waterfall and lets you make the upstream fail or crawl.`,
    tasks: [
      "class UpstreamError and fetchJson(url, { timeoutMs }): deadline via AbortSignal.timeout, classifies failures as retryable or not, reads Retry-After",
      "backoffDelay(attempt, options): exponential with full jitter and a cap, random injectable",
      "class RetryBudget and withRetry(fn, options): retries, backoff, retry-after, budget, give up rules",
      "GET /stations/:id/forecast via getForecast(zone), failures mapped to 502 / 504; loadForecast is the seam lesson 15 replaces",
    ],
    starterAdd: js`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 14: calling someone else's service.

// A failed outbound call.
//   new UpstreamError("upstream answered 503", { status: 503, retryable: true, retryAfterMs: 2000, timeout: false })
// Properties: name "UpstreamError", message, status (undefined by default), retryable (false), retryAfterMs (undefined), timeout (false).
class UpstreamError extends Error {
  constructor(message, options = {}) {
    // TODO
  }
}

// GET url and parse the JSON, with a deadline.
//   - pass signal: AbortSignal.timeout(timeoutMs) to fetch (default 800 ms)
//   - the fetch rejects with an error named "TimeoutError" -> UpstreamError("timed out after <ms>ms", { retryable: true, timeout: true })
//   - any other rejection (the connection dropped) -> UpstreamError("could not reach the service", { retryable: true })
//   - status 429 or >= 500 -> UpstreamError("upstream answered <status>", { status, retryable: true, retryAfterMs }) where retryAfterMs comes from
//     the retry-after header (whole seconds * 1000) when it is present
//   - any other non-2xx status -> UpstreamError("upstream answered <status>", { status }) (not retryable)
//   - a 2xx body that is not JSON -> UpstreamError("upstream sent an unreadable answer") (not retryable)
async function fetchJson(url, options = {}) {
  // TODO
}

// Full jitter: Math.floor(random() * Math.min(maxMs, baseMs * 2 ** attempt)). attempt starts at 0.
// options: { baseMs = 100, maxMs = 2000, random = Math.random }
function backoffDelay(attempt, options = {}) {
  // TODO
}

// Retries may add at most 'ratio' of the request volume, plus a floor so quiet periods can still retry.
//   noteRequest(): count a request.   tryAcquire(): a new retry is allowed while retries + 1 <= floor + ratio * requests (count it and return true), otherwise false
//   reset(): back to zero.  Defaults: ratio 0.2, floor 3.
class RetryBudget {
  constructor(options = {}) {
    // TODO
  }
  noteRequest() {
    // TODO
  }
  tryAcquire() {
    // TODO
  }
  reset() {
    // TODO
  }
}

// Run fn(attempt) and retry transient failures.
//   options: { retries = 3, baseMs = 100, maxMs = 2000, random = Math.random, budget, sleep (default: the global sleep), shouldRetry = (err) => err.retryable === true }
//   - call budget?.noteRequest() once at the start
//   - on an error: give up (rethrow) when attempts are used up (attempt >= retries), shouldRetry says no, the budget refuses (budget.tryAcquire() is false),
//     or err.retryAfterMs is greater than maxMs
//   - otherwise wait Math.max(backoffDelay(attempt, ...), err.retryAfterMs ?? 0) with sleep and try again
//   - return the first success
async function withRetry(fn, options = {}) {
  // TODO
}

const forecastBudget = new RetryBudget();

// The partner feed at /upstream/forecast/<zone>: JSON like { zone, tempC, rain, windKph }. Deadline 800 ms; two retries, base 100 ms, cap 1000 ms, shared budget.
async function getForecast(zone) {
  // TODO
}

// Map a failed outbound call to what OUR callers see. UpstreamError with timeout -> HttpError 504, code "upstream_timeout",
// "The weather service did not answer in time"; any other UpstreamError -> HttpError 502, code "upstream_failed", "The weather service is unavailable".
// Anything else is returned unchanged.
function upstreamToHttp(err) {
  // TODO
}

// Lesson 15 replaces this seam. It returns the forecast with source "live".
let loadForecast = async (zone) => ({ ...(await getForecast(zone)), source: "live" });

// 200 with the forecast for the station's zone; 404 for an unknown station; failures go through upstreamToHttp.
router.get("/stations/:id/forecast", async function stationForecast(req, res) {
  // TODO
});
`,
    solutionAdd: js`class UpstreamError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = "UpstreamError";
    this.status = options.status;
    this.retryable = options.retryable ?? false;
    this.retryAfterMs = options.retryAfterMs;
    this.timeout = options.timeout ?? false;
  }
}

async function fetchJson(url, options = {}) {
  const timeoutMs = options.timeoutMs ?? 800;
  let response;
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
  } catch (err) {
    if (err?.name === "TimeoutError") throw new UpstreamError(¦timed out after \${timeoutMs}ms¦, { retryable: true, timeout: true });
    throw new UpstreamError("could not reach the service", { retryable: true });
  }
  if (!response.ok) {
    const retryable = response.status === 429 || response.status >= 500;
    const seconds = Number(response.headers.get("retry-after"));
    const retryAfterMs = retryable && response.headers.has("retry-after") && Number.isFinite(seconds) ? seconds * 1000 : undefined;
    throw new UpstreamError(¦upstream answered \${response.status}¦, { status: response.status, retryable, retryAfterMs });
  }
  try {
    return await response.json();
  } catch {
    throw new UpstreamError("upstream sent an unreadable answer");
  }
}

function backoffDelay(attempt, options = {}) {
  const { baseMs = 100, maxMs = 2000, random = Math.random } = options;
  return Math.floor(random() * Math.min(maxMs, baseMs * 2 ** attempt));
}

class RetryBudget {
  #ratio;
  #floor;
  #requests = 0;
  #retries = 0;

  constructor(options = {}) {
    this.#ratio = options.ratio ?? 0.2;
    this.#floor = options.floor ?? 3;
  }

  noteRequest() {
    this.#requests++;
  }

  tryAcquire() {
    if (this.#retries + 1 <= this.#floor + this.#ratio * this.#requests) {
      this.#retries++;
      return true;
    }
    return false;
  }

  reset() {
    this.#requests = 0;
    this.#retries = 0;
  }
}

async function withRetry(fn, options = {}) {
  const { retries = 3, baseMs = 100, maxMs = 2000, random = Math.random, budget, shouldRetry = (err) => err?.retryable === true } = options;
  const pause = options.sleep ?? sleep;
  budget?.noteRequest();
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn(attempt);
    } catch (err) {
      if (attempt >= retries || !shouldRetry(err)) throw err;
      if (err?.retryAfterMs !== undefined && err.retryAfterMs > maxMs) throw err;
      if (budget && !budget.tryAcquire()) throw err;
      await pause(Math.max(backoffDelay(attempt, { baseMs, maxMs, random }), err?.retryAfterMs ?? 0));
    }
  }
}

const forecastBudget = new RetryBudget();

async function getForecast(zone) {
  return withRetry(() => fetchJson(¦/upstream/forecast/\${encodeURIComponent(zone)}¦, { timeoutMs: 800 }), {
    retries: 2,
    baseMs: 100,
    maxMs: 1000,
    budget: forecastBudget,
  });
}

function upstreamToHttp(err) {
  if (!(err instanceof UpstreamError)) return err;
  if (err.timeout) return new HttpError(504, "The weather service did not answer in time", { code: "upstream_timeout" });
  return new HttpError(502, "The weather service is unavailable", { code: "upstream_failed" });
}

let loadForecast = async (zone) => ({ ...(await getForecast(zone)), source: "live" });

router.get("/stations/:id/forecast", async function stationForecast(req, res) {
  const found = await db.stations.get(req.params.id);
  if (!found) throw stationNotFound(req.params.id);
  try {
    res.json(await loadForecast(found.zone));
  } catch (err) {
    throw upstreamToHttp(err);
  }
});`,
    explanation:
      "fetchJson puts a deadline on the call with AbortSignal.timeout and sorts every failure into retryable or permanent, so the retry logic never has to look at raw responses. backoffDelay is the full-jitter formula with an injectable random. RetryBudget is two counters: retries are allowed while they stay under a floor plus a fraction of the request volume. withRetry ties it together: it gives up when attempts, the retry policy, the upstream's own Retry-After or the budget say so, and otherwise sleeps the larger of the jittered backoff and the hint. The route translates upstream failures into 502/504 so the rider never sees the partner's vocabulary.",
    hints: [
      { id: "h1", title: "fetchJson", content: "try { response = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) }) } catch (err) { if (err?.name === \"TimeoutError\") throw new UpstreamError(..., { retryable: true, timeout: true }); throw new UpstreamError(\"could not reach the service\", { retryable: true }) }. Then check response.ok; retryable means status === 429 || status >= 500. Retry-After: Number(response.headers.get(\"retry-after\")) * 1000 when the header exists." },
      { id: "h2", title: "withRetry", content: "budget?.noteRequest(); for (let attempt = 0; ; attempt++) { try { return await fn(attempt); } catch (err) { if (attempt >= retries || !shouldRetry(err)) throw err; if (err.retryAfterMs !== undefined && err.retryAfterMs > maxMs) throw err; if (budget && !budget.tryAcquire()) throw err; await sleep(Math.max(backoffDelay(attempt, { baseMs, maxMs, random }), err.retryAfterMs ?? 0)); } }" },
      { id: "h3", title: "The route", content: "getForecast(zone) = withRetry(() => fetchJson(\"/upstream/forecast/\" + encodeURIComponent(zone), { timeoutMs: 800 }), { retries: 2, baseMs: 100, maxMs: 1000, budget: forecastBudget }). The route finds the station (stationNotFound(id) if missing), then try { res.json(await loadForecast(station.zone)) } catch (err) { throw upstreamToHttp(err) }." },
    ],
    tests: [
      {
        id: "t1",
        description: "backoffDelay: exponential ceiling, cap and jitter",
        assertionCode: T(js`const top = () => 0.999999;
const zero = () => 0;
const half = () => 0.5;
assertEqual(backoffDelay(0, { random: top }), 99, "attempt 0: ceiling 100 ms, almost all of it");
assertEqual(backoffDelay(1, { random: top }), 199);
assertEqual(backoffDelay(2, { random: top }), 399);
assertEqual(backoffDelay(3, { random: half }), 400, "half of 800");
assertEqual(backoffDelay(10, { random: top, maxMs: 2000 }), 1999, "the cap stops the growth");
assertEqual(backoffDelay(0, { random: zero }), 0, "full jitter can pick zero");
assertEqual(backoffDelay(2, { random: half, baseMs: 50, maxMs: 5000 }), 100, "custom base");
let all = new Set();
for (let i = 0; i < 40; i++) all.add(backoffDelay(5));
assert(all.size > 5, "with the real Math.random the delays spread out");
for (const d of all) assert(d >= 0 && d < 2000, "inside [0, cap): " + d);`),
      },
      {
        id: "t2",
        description: "RetryBudget limits the extra load",
        assertionCode: T(js`const b = new RetryBudget({ ratio: 0.5, floor: 1 });
b.noteRequest();
assertEqual(b.tryAcquire(), true, "1 request: floor 1 + 0.5 allows one retry");
assertEqual(b.tryAcquire(), false, "a second would exceed 1.5");
b.noteRequest(); b.noteRequest();
assertEqual(b.tryAcquire(), true, "3 requests raise the allowance to 2.5");
assertEqual(b.tryAcquire(), false);
b.reset();
assertEqual(b.tryAcquire(), true, "after reset the floor applies again");
const dflt = new RetryBudget();
let granted = 0;
for (let i = 0; i < 20; i++) if (dflt.tryAcquire()) granted++;
assertEqual(granted, 3, "defaults: ratio 0.2 and floor 3, so with no requests only the floor");
for (let i = 0; i < 50; i++) dflt.noteRequest();
for (let i = 0; i < 20; i++) if (dflt.tryAcquire()) granted++;
assertEqual(granted, 13, "50 requests allow 10 more retries");`),
      },
      {
        id: "t3",
        description: "fetchJson: success and the failure classes",
        assertionCode: T(js`const ok = await fetchJson("/upstream/forecast/waterfront");
assertEqual(ok.zone, "waterfront");
assert(typeof ok.tempC === "number", "parsed JSON");
sim.network.failNext("/upstream/forecast", 1, 503);
const e503 = await assertRejects(fetchJson("/upstream/forecast/park"), "503");
assert(e503 instanceof UpstreamError, "an UpstreamError");
assertEqual([e503.status, e503.retryable, e503.timeout], [503, true, false]);
sim.network.failNext("/upstream/forecast", 1, 429);
assertEqual((await assertRejects(fetchJson("/upstream/forecast/park"), "429")).retryable, true, "429 is retryable");
sim.network.failNext("/upstream/forecast", 1, 404);
const e404 = await assertRejects(fetchJson("/upstream/forecast/park"), "404");
assertEqual([e404.status, e404.retryable], [404, false], "a 404 will not improve by asking again");
sim.network.failNext("/upstream/forecast", 1, "network");
const dropped = await assertRejects(fetchJson("/upstream/forecast/park"), "could not reach");
assertEqual([dropped.retryable, dropped.timeout], [true, false]);
const before = Date.now();
sim.network.failNext("/upstream/forecast", 1, "hang");
const slow = await assertRejects(fetchJson("/upstream/forecast/park", { timeoutMs: 300 }), "timed out after 300ms");
assertEqual([slow.retryable, slow.timeout], [true, true]);
assert(Date.now() - before >= 300 && Date.now() - before < 400, "it gave up at the deadline, not later: " + (Date.now() - before));
sim.network.setLatency("/upstream/forecast", 5000);
const crawl = await assertRejects(fetchJson("/upstream/forecast/park"), "timed out after 800ms");
assertEqual(crawl.timeout, true, "the default deadline is 800 ms");`),
      },
      {
        id: "t4",
        description: "fetchJson: Retry-After and unreadable answers",
        assertionCode: T(js`const realFetch = fetch;
const fake = (status, headers, body) => { fetch = async () => ({ ok: status >= 200 && status < 300, status, headers: { get: (n) => headers[n.toLowerCase()] ?? null, has: (n) => n.toLowerCase() in headers }, json: async () => { if (body === undefined) throw new SyntaxError("bad json"); return body; } }); };
try {
  fake(503, { "retry-after": "3" });
  const e = await assertRejects(fetchJson("/x"), "503");
  assertEqual([e.retryable, e.retryAfterMs], [true, 3000], "Retry-After seconds become milliseconds");
  fake(503, {});
  assertEqual((await assertRejects(fetchJson("/x"), "503")).retryAfterMs, undefined, "no header: no hint");
  fake(400, { "retry-after": "3" });
  assertEqual((await assertRejects(fetchJson("/x"), "400")).retryAfterMs, undefined, "hints only matter for retryable failures");
  fake(200, {}, undefined);
  const bad = await assertRejects(fetchJson("/x"), "unreadable");
  assertEqual(bad.retryable, false, "a garbled answer is not worth repeating");
  fake(200, {}, { ok: 1 });
  assertEqual(await fetchJson("/x"), { ok: 1 });
} finally { fetch = realFetch; }`),
      },
      {
        id: "t5",
        description: "withRetry: waits, jitter, give-up rules and the budget",
        assertionCode: T(js`const waits = [];
const pause = async (ms) => { waits.push(ms); };
const transient = () => new UpstreamError("blip", { status: 503, retryable: true });
let calls = 0;
const flaky = async (attempt) => { calls++; if (attempt < 2) throw transient(); return "done"; };
const result = await withRetry(flaky, { sleep: pause, random: () => 0.5, baseMs: 100, maxMs: 2000 });
assertEqual([result, calls], ["done", 3], "succeeds on the third attempt");
assertEqual(waits, [50, 100], "half of 100 then half of 200: exponential, jittered");
calls = 0; waits.length = 0;
await assertRejects(withRetry(async () => { calls++; throw transient(); }, { retries: 2, sleep: pause, random: () => 0.5 }), "blip");
assertEqual([calls, waits.length], [3, 2], "retries: 2 means three attempts in all");
calls = 0;
await assertRejects(withRetry(async () => { calls++; throw new UpstreamError("nope", { status: 404 }); }, { sleep: pause }), "nope");
assertEqual(calls, 1, "a permanent failure is not retried");
waits.length = 0; calls = 0;
const hinted = async (attempt) => { calls++; if (attempt === 0) throw new UpstreamError("slow down", { retryable: true, retryAfterMs: 1500 }); return "ok"; };
assertEqual(await withRetry(hinted, { sleep: pause, random: () => 0, maxMs: 2000 }), "ok");
assertEqual(waits, [1500], "the upstream's Retry-After beats a small backoff");
calls = 0;
await assertRejects(withRetry(async () => { calls++; throw new UpstreamError("busy", { retryable: true, retryAfterMs: 30_000 }); }, { sleep: pause, maxMs: 2000 }), "busy");
assertEqual(calls, 1, "a hint beyond the cap means give up now");
const budget = new RetryBudget({ ratio: 0, floor: 1 });
calls = 0;
await assertRejects(withRetry(async () => { calls++; throw transient(); }, { retries: 5, sleep: pause, budget }), "blip");
assertEqual(calls, 2, "the budget allowed exactly one retry");
await assertRejects(withRetry(async () => { calls++; throw transient(); }, { retries: 5, sleep: pause, budget }), "blip");
assertEqual(calls, 3, "and the next call got none: one attempt only");
calls = 0;
await assertRejects(withRetry(async () => { calls++; throw new Error("custom"); }, { sleep: pause, shouldRetry: () => true, retries: 1 }), "custom");
assertEqual(calls, 2, "shouldRetry can be overridden");`),
      },
      {
        id: "t6",
        description: "withRetry really sleeps on the clock",
        assertionCode: T(js`const start = Date.now();
let n = 0;
await withRetry(async () => { n++; if (n < 3) throw new UpstreamError("x", { retryable: true }); return 1; }, { random: () => 0.999999, baseMs: 100, maxMs: 2000 });
const took = Date.now() - start;
assert(took >= 250 && took <= 300, "waited about 99 + 199 ms of virtual time, got " + took);`),
      },
      {
        id: "t7",
        description: "GET /stations/:id/forecast: retries hide a blip, deadlines and outages become 504 / 502",
        assertionCode: T(js`db.reset();
forecastBudget.reset();
const ok = await call("GET", "/stations/st-01/forecast");
assertEqual(ok.status, 200);
assertEqual([ok.body.zone, ok.body.source], ["waterfront", "live"]);
assert(typeof ok.body.tempC === "number" && typeof ok.body.windKph === "number", "the partner's fields come through");
sim.network.reset();
sim.network.failNext("/upstream/forecast", 2, 503);
const healed = await call("GET", "/stations/st-01/forecast");
assertEqual(healed.status, 200, "two failures, third attempt works: the rider never noticed");
const attempts = sim.network.entries().filter((e) => e.url.startsWith("/upstream/forecast"));
assertEqual(attempts.map((e) => e.code), [503, 503, 200], "three attempts on the wire");
sim.network.reset();
sim.network.failNext("/upstream/forecast", 10, 503);
const down = await call("GET", "/stations/st-01/forecast");
assertEqual([down.status, down.body.type], [502, "https://dockline.example/problems/upstream-failed"]);
assert(!JSON.stringify(down.body).includes("503"), "the partner's status is not forwarded");
sim.network.reset();
sim.network.setLatency("/upstream/forecast", 5000);
forecastBudget.reset();
const slow = await call("GET", "/stations/st-01/forecast");
assertEqual([slow.status, slow.body.type], [504, "https://dockline.example/problems/upstream-timeout"]);
assertEqual((await call("GET", "/stations/st-99/forecast")).status, 404, "unknown station");
assertEqual(typeof loadForecast, "function", "loadForecast is the seam lesson 15 replaces");`),
      },
    ],
    unlocks: ["api-retry"],
    checks: [
      {
        prompt: md`Why use random jitter in addition to exponential backoff?`,
        question: {
          type: "choice",
          options: [
            "To make logs harder to read",
            "Without it every client that failed together retries together, so the upstream is hit by synchronised waves; randomness spreads the retries out",
            "Because Math.random is faster than a timer",
            "To make waits shorter on average than the base delay",
          ],
          answer: 1,
        },
        explanation: md`Exponential backoff reduces load over time; jitter removes the correlation between clients. Together they turn a stampede into a trickle.`,
      },
      {
        prompt: md`Which of these should be retried by default?`,
        question: {
          type: "choice",
          options: ["404 Not Found", "400 Bad Request", "A connection reset or a 503", "403 Forbidden"],
          answer: 2,
        },
        explanation: md`Retries are for failures that may be gone a moment later. A 4xx says the request itself is wrong; sending it again only adds load.`,
      },
    ],
  },

  // ───────────────────────────────────────── 15. Circuit breaker
  {
    id: "js-api-15-breaker",
    title: "A circuit breaker and graceful fallbacks",
    minutes: 45,
    xp: 220,
    concepts: ["circuit breaker", "closed / open / half-open", "fail fast", "fallback", "graceful degradation", "bulkheads"],
    learn: md`### Retries are not enough

Retries help with blips. When the upstream is truly down they make things worse: every incoming request now spends 3 attempts and about a second finding out what we already know. Threads, sockets and riders' patience are burnt on calls that cannot succeed, and the hammering can prevent the upstream from recovering.

A **circuit breaker** (named after the electrical device) remembers recent failures and, once there are too many, **stops calling** for a while. Callers get an immediate answer instead of waiting for a timeout.

### Three states

~~~
CLOSED --too many failures--> OPEN
  ^                            |
  |                     cooldown over
  |                            v
  +---probe succeeds---- HALF-OPEN
      (probe fails: back to OPEN)
~~~

- **closed**: normal. Calls go through; consecutive failures are counted, and any success resets the count.
- **open**: calls are **rejected immediately** with a ¦CircuitOpenError¦ without touching the upstream. After ¦cooldownMs¦ the breaker moves on.
- **half-open**: the upstream gets a chance to prove itself. Exactly **one probe** call is let through; concurrent calls are still rejected. A successful probe closes the breaker; a failed probe re-opens it for another cooldown.

The breaker reads time from a function (default ¦Date.now¦) so tests control the clock. State moves lazily: nobody needs a timer to flip it to half-open; the next call looks at the clock and decides.

### What counts as a failure?

Only things that say "the upstream is unwell": timeouts, dropped connections, 5xx. A 404 means the upstream answered perfectly well. An ¦isFailure¦ predicate decides, and a non-failure error closes the breaker if it was probing, because the service obviously responded.

### Where the breaker sits relative to retries

Wrap the *whole retried call*: the breaker counts one failure when all attempts have failed, not one per attempt. With retries inside, a threshold of 2 means two consecutive requests that each exhausted their retries.

### Fallbacks: degrade, do not die

When the breaker is open (or the call failed) the route does not have to fail. A weather note is nice-to-have: serve the **last good value** from memory marked ¦source: "fallback"¦, or a neutral placeholder if there is none. The rider's screen still works. Deciding what a sensible degraded answer is belongs to each feature; for payments the right fallback might be an honest error.

### Observability

A breaker state that nobody can see is a mystery. Expose a ¦snapshot()¦ (state, failures, threshold, when it opened) and log transitions. Operators want to know the moment a dependency trips.

### Common mistakes

- One shared breaker for unrelated upstreams (one flaky service shuts off healthy ones). Use one per dependency.
- Counting 4xx client errors as upstream failures.
- Letting a whole herd through at half-open instead of a single probe.
- Fallbacks that hide the failure from monitoring.`,
    mission: md`The partner feed went down for twenty minutes last night. With retries alone, every station screen request still burned a second waiting before giving up, and the pile-up slowed the stations list for everyone.

Add a breaker around the forecast call and a fallback that serves the last good forecast. When you break the upstream in the control room, you will watch the breaker count failures, trip open, probe after the cooldown and close again.`,
    tasks: [
      "class CircuitOpenError and class CircuitBreaker: closed / open / half-open, one probe, injectable clock, isFailure, snapshot()",
      "forecastBreaker with threshold 2 and a 4 second cooldown; breakerState() exposes the snapshot",
      "loadForecast fallback: last good forecast per zone marked source \"fallback\", or a neutral placeholder",
    ],
    starterAdd: js`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 15: stop calling what is broken.

class CircuitOpenError extends Error {
  constructor(message) {
    super(message);
    this.name = "CircuitOpenError";
  }
}

class CircuitBreaker {
  // options: { failureThreshold = 3, cooldownMs = 5000, isFailure = (err) => true, now = () => Date.now() }
  constructor(options = {}) {
    // TODO
  }

  // "closed" | "open" | "half-open".
  //  open becomes half-open once now() - openedAt >= cooldownMs (computed on the fly; reading state changes nothing)
  get state() {
    // TODO
  }

  // Run fn through the breaker.
  //  - open: throw new CircuitOpenError("circuit open") without calling fn
  //  - half-open: only ONE call (the probe) may run at a time; a call that arrives while the probe is running is rejected with CircuitOpenError
  //  - fn succeeds: failures = 0 and the breaker closes
  //  - fn throws an error that isFailure(err): while closed count it and open the breaker at failureThreshold consecutive failures;
  //    a failed probe opens it again (openedAt = now()) - the error is rethrown
  //  - fn throws an error that is NOT a failure: the upstream did answer, so treat it as a success for the breaker, then rethrow
  async exec(fn) {
    // TODO
  }

  // { state, failures, threshold, openedAt (ms timestamp or null when closed), cooldownMs }
  snapshot() {
    // TODO
  }
}

// Only a sick upstream trips the breaker; "404 not found" means it answered.
const forecastBreaker = new CircuitBreaker({
  failureThreshold: 2,
  cooldownMs: 4000,
  isFailure: (err) => !(err instanceof UpstreamError) || err.retryable,
});

// The control room reads this.
function breakerState() {
  return forecastBreaker.snapshot();
}

// Last good forecast per zone.
const lastForecast = new Map();

// Replace the seam of lesson 14: loadForecast = async (zone) => ...
//   try forecastBreaker.exec(() => getForecast(zone)); remember the result in lastForecast; return { ...forecast, source: "live" }
//   when the call fails with a CircuitOpenError or an UpstreamError: return the remembered forecast with source "fallback",
//   or { zone, tempC: null, rain: null, windKph: null, source: "fallback" } when there is none; any other error is rethrown
// TODO
`,
    solutionAdd: js`class CircuitOpenError extends Error {
  constructor(message) {
    super(message);
    this.name = "CircuitOpenError";
  }
}

class CircuitBreaker {
  #threshold;
  #cooldownMs;
  #isFailure;
  #now;
  #failures = 0;
  #openedAt = null;
  #probing = false;

  constructor(options = {}) {
    this.#threshold = options.failureThreshold ?? 3;
    this.#cooldownMs = options.cooldownMs ?? 5000;
    this.#isFailure = options.isFailure ?? (() => true);
    this.#now = options.now ?? (() => Date.now());
  }

  get state() {
    if (this.#openedAt === null) return "closed";
    return this.#now() - this.#openedAt >= this.#cooldownMs ? "half-open" : "open";
  }

  async exec(fn) {
    const state = this.state;
    if (state === "open") throw new CircuitOpenError("circuit open");
    const probe = state === "half-open";
    if (probe) {
      if (this.#probing) throw new CircuitOpenError("circuit open: a probe is already running");
      this.#probing = true;
    }
    try {
      const value = await fn();
      this.#failures = 0;
      this.#openedAt = null;
      return value;
    } catch (err) {
      if (!this.#isFailure(err)) {
        this.#failures = 0;
        this.#openedAt = null;
      } else if (probe) {
        this.#openedAt = this.#now();
      } else if (++this.#failures >= this.#threshold) {
        this.#openedAt = this.#now();
      }
      throw err;
    } finally {
      if (probe) this.#probing = false;
    }
  }

  snapshot() {
    return { state: this.state, failures: this.#failures, threshold: this.#threshold, openedAt: this.#openedAt, cooldownMs: this.#cooldownMs };
  }
}

const forecastBreaker = new CircuitBreaker({
  failureThreshold: 2,
  cooldownMs: 4000,
  isFailure: (err) => !(err instanceof UpstreamError) || err.retryable,
});

function breakerState() {
  return forecastBreaker.snapshot();
}

const lastForecast = new Map();

loadForecast = async (zone) => {
  try {
    const live = await forecastBreaker.exec(() => getForecast(zone));
    lastForecast.set(zone, live);
    return { ...live, source: "live" };
  } catch (err) {
    if (!(err instanceof CircuitOpenError) && !(err instanceof UpstreamError)) throw err;
    const stale = lastForecast.get(zone);
    return stale ? { ...stale, source: "fallback" } : { zone, tempC: null, rain: null, windKph: null, source: "fallback" };
  }
};`,
    explanation:
      "The breaker derives its state from two facts, when it opened and what time it is, so no timers are needed: after the cooldown the next caller sees 'half-open'. exec lets exactly one probe through in that state; success clears everything, a genuine failure re-opens it, and an error that is not a failure (the upstream did answer) counts as proof of life. Wrapping the retried getForecast means one breaker failure is one request whose retries were all used up. The new loadForecast turns both breaker rejections and exhausted retries into a degraded but useful answer: the last good value or an explicit placeholder, always labelled as a fallback.",
    hints: [
      { id: "h1", title: "State from facts", content: "Keep #failures, #openedAt (null when closed) and #probing. get state(): if #openedAt === null return \"closed\"; return this.#now() - this.#openedAt >= this.#cooldownMs ? \"half-open\" : \"open\"." },
      { id: "h2", title: "exec", content: "const state = this.state; if open throw CircuitOpenError. const probe = state === \"half-open\"; if (probe) { if (this.#probing) throw ...; this.#probing = true }. try { const v = await fn(); reset failures and openedAt; return v } catch (err) { if (!isFailure(err)) reset; else if (probe) openedAt = now(); else if (++failures >= threshold) openedAt = now(); throw err } finally { if (probe) this.#probing = false }." },
      { id: "h3", title: "The fallback", content: "loadForecast = async (zone) => { try { const live = await forecastBreaker.exec(() => getForecast(zone)); lastForecast.set(zone, live); return { ...live, source: \"live\" }; } catch (err) { if (!(err instanceof CircuitOpenError) && !(err instanceof UpstreamError)) throw err; const stale = lastForecast.get(zone); return stale ? { ...stale, source: \"fallback\" } : { zone, tempC: null, rain: null, windKph: null, source: \"fallback\" }; } }" },
    ],
    tests: [
      {
        id: "t1",
        description: "CircuitBreaker: closed counts consecutive failures and opens at the threshold",
        assertionCode: T(js`let clock = 0;
const breaker = new CircuitBreaker({ failureThreshold: 3, cooldownMs: 1000, now: () => clock });
const boom = async () => { throw new Error("down"); };
const fine = async () => "ok";
assertEqual(breaker.state, "closed");
assertEqual(await breaker.exec(fine), "ok", "calls pass through and return the value");
await assertRejects(breaker.exec(boom), "down");
await assertRejects(breaker.exec(boom), "down");
assertEqual([breaker.state, breaker.snapshot().failures], ["closed", 2], "two failures: still closed");
assertEqual(await breaker.exec(fine), "ok");
assertEqual(breaker.snapshot().failures, 0, "a success resets the count: only CONSECUTIVE failures trip it");
for (let i = 0; i < 3; i++) await assertRejects(breaker.exec(boom), "down");
assertEqual(breaker.state, "open", "three in a row open it");
assertEqual(breaker.snapshot(), { state: "open", failures: 3, threshold: 3, openedAt: 0, cooldownMs: 1000 });`),
      },
      {
        id: "t2",
        description: "CircuitBreaker: open fails fast, half-open lets one probe through",
        assertionCode: T(js`let clock = 100;
const breaker = new CircuitBreaker({ failureThreshold: 1, cooldownMs: 1000, now: () => clock });
let calls = 0;
const fail = async () => { calls++; throw new Error("down"); };
await assertRejects(breaker.exec(fail), "down");
assertEqual(breaker.state, "open");
clock = 1099;
const rejected = await assertRejects(breaker.exec(fail), "circuit open");
assert(rejected instanceof CircuitOpenError, "a CircuitOpenError, not the upstream's");
assertEqual(calls, 1, "the upstream was NOT called while open");
clock = 1100;
assertEqual(breaker.state, "half-open", "after the cooldown the next call may probe");
let release;
const slowProbe = breaker.exec(() => new Promise((resolve) => { calls++; release = resolve; }));
assertEqual(calls, 2, "the probe is running");
const second = await assertRejects(breaker.exec(fail), "probe");
assert(second instanceof CircuitOpenError && calls === 2, "a second call during the probe is rejected, not sent");
release("alive");
assertEqual(await slowProbe, "alive");
assertEqual([breaker.state, breaker.snapshot().failures, breaker.snapshot().openedAt], ["closed", 0, null], "a successful probe closes the breaker");`),
      },
      {
        id: "t3",
        description: "CircuitBreaker: a failed probe re-opens; non-failures do not count",
        assertionCode: T(js`let clock = 0;
const breaker = new CircuitBreaker({ failureThreshold: 2, cooldownMs: 500, now: () => clock, isFailure: (err) => err.status !== 404 });
const down = async () => { throw Object.assign(new Error("5xx"), { status: 503 }); };
const missing = async () => { throw Object.assign(new Error("gone"), { status: 404 }); };
for (let i = 0; i < 5; i++) await assertRejects(breaker.exec(missing), "gone");
assertEqual([breaker.state, breaker.snapshot().failures], ["closed", 0], "404s are the upstream working: never counted");
await assertRejects(breaker.exec(down), "5xx");
await assertRejects(breaker.exec(down), "5xx");
assertEqual(breaker.state, "open");
clock = 500;
await assertRejects(breaker.exec(down), "5xx");
assertEqual(breaker.state, "open", "the probe failed: open again");
assertEqual(breaker.snapshot().openedAt, 500, "with a fresh cooldown that starts now");
clock = 999;
await assertRejects(breaker.exec(down), "circuit open");
clock = 1000;
await assertRejects(breaker.exec(missing), "gone");
assertEqual(breaker.state, "closed", "a probe that got a 404 proves the service is alive: closed");`),
      },
      {
        id: "t4",
        description: "forecastBreaker is configured, and breakerState() reports it",
        assertionCode: T(js`const s = breakerState();
assertEqual(Object.keys(s).sort(), ["cooldownMs", "failures", "openedAt", "state", "threshold"]);
assertEqual([s.threshold, s.cooldownMs], [2, 4000]);
assert(forecastBreaker instanceof CircuitBreaker);
assertEqual(forecastBreaker.state, "closed");`),
      },
      {
        id: "t5",
        description: "The route survives a dead partner: fallbacks, fail-fast and recovery",
        assertionCode: T(js`db.reset();
sim.network.reset();
forecastBudget.reset();
lastForecast.clear();
const live = await call("GET", "/stations/st-01/forecast");
assertEqual([live.status, live.body.source], [200, "live"]);
const knownTemp = live.body.tempC;
sim.network.failNext("/upstream/forecast", 100, 503);
forecastBudget.reset();
const f1 = await call("GET", "/stations/st-01/forecast");
assertEqual([f1.status, f1.body.source, f1.body.tempC], [200, "fallback", knownTemp], "the upstream is down but the rider still gets the last good forecast");
forecastBudget.reset();
const f2 = await call("GET", "/stations/st-01/forecast");
assertEqual(f2.body.source, "fallback");
assertEqual(breakerState().state, "open", "two failed requests trip the breaker");
const wireBefore = sim.network.entries().length;
const f3 = await call("GET", "/stations/st-01/forecast");
assertEqual(f3.body.source, "fallback");
assertEqual(sim.network.entries().length, wireBefore, "while open nothing is sent upstream: fail fast");
const placeholder = await call("GET", "/stations/st-04/forecast");
assertEqual([placeholder.status, placeholder.body.source, placeholder.body.tempC, placeholder.body.zone], [200, "fallback", null, "park"], "no last good value: an honest placeholder");
sim.network.reset();
await sim.tick(4000);
assertEqual(breakerState().state, "half-open", "after the cooldown");
const probe = await call("GET", "/stations/st-01/forecast");
assertEqual([probe.body.source, breakerState().state], ["live", "closed"], "the probe succeeded: live data and a closed breaker");`),
      },
    ],
    unlocks: ["api-breaker"],
    checks: [
      {
        prompt: md`The breaker is open and its cooldown has just passed. Ten requests arrive at the same instant. How many should reach the upstream?`,
        question: { type: "choice", options: ["All ten", "None", "Exactly one probe; the others are rejected until it finishes", "Five"], answer: 2 },
        explanation: md`Half-open is a careful test, not a reopening of the floodgates. One probe tells you whether the upstream recovered; sending ten would hit it hardest exactly when it may be fragile.`,
      },
      {
        prompt: md`Why do the retries sit INSIDE the breaker call rather than around it?`,
        question: {
          type: "choice",
          options: [
            "Order does not matter",
            "So the breaker counts one failure per request whose retries were all exhausted, instead of tripping on single blips that a retry would have fixed",
            "Because retries cannot run after a breaker",
            "To make requests slower",
          ],
          answer: 1,
        },
        explanation: md`Retries absorb brief trouble; the breaker reacts to sustained trouble. Counting individual attempts would make the breaker twitchy.`,
      },
    ],
  },

  // ───────────────────────────────────────── 16. Graceful shutdown
  {
    id: "js-api-16-shutdown",
    title: "Graceful shutdown and health probes",
    minutes: 45,
    xp: 220,
    concepts: ["graceful shutdown", "draining", "in-flight requests", "readiness vs liveness", "resource closing order", "grace period"],
    learn: md`### Stopping is a feature

Servers get stopped all the time: a deploy replaces them, the platform scales down, the machine is retired. If the process is simply killed, whatever it was doing is cut off mid-sentence: a rider's unlock request half done, a database write unconfirmed, a response never sent. A **graceful shutdown** turns "kill" into a short, orderly sequence:

1. **Stop accepting new work.** New requests get a clear *"not now, try another instance"* answer (503 with ¦Retry-After¦ and ¦Connection: close¦) so a load balancer retries elsewhere.
2. **Drain in-flight work.** Requests already being processed are allowed to finish, up to a **grace period** (say 5 to 30 seconds). Anything still running after that is abandoned and counted.
3. **Close resources in reverse order of creation.** The last thing opened is the first to close: stop the HTTP listener, then the database connections, then flush the logs. Closing the database before the last request finishes would turn that request into an error.
4. **Report** what happened (drained or not, how many abandoned, what was closed). Operators need to see whether deploys are clean.

On a real server the trigger is an operating-system signal, ¦SIGTERM¦. Here the ¦shutdown()¦ function plays that role.

### Counting in-flight requests

A middleware at the front increments a counter when a request enters and decrements it in ¦finally¦ (so errors count too). When the counter reaches zero, anything waiting for the drain is woken up. The first line of defence against forgetting to decrement is using ¦try / finally¦.

### Health probes: liveness and readiness

Orchestrators ask two different questions:

- **Liveness** (¦/health/live¦): "is the process stuck? should I restart it?" It should stay 200 as long as the process can answer. If it failed during a shutdown, the platform would kill the very instance that is carefully draining.
- **Readiness** (¦/health/ready¦): "should I send traffic here?" It turns **503 as soon as shutdown starts**, so the load balancer stops routing new requests, which is exactly what makes draining possible.

Probes themselves are never rejected by the shutdown gate.

### Idempotent and re-entrant

A deploy script may deliver the signal twice. ¦shutdown()¦ must not run the closers twice: the second call returns the same pending result. A failing closer must not prevent the others from running: catch, log, continue.

### Time is part of the design

The grace period must be shorter than whatever your platform allows before it force-kills you, and longer than your slowest legitimate request. A request that outlives it is **abandoned**; if that happens regularly, your timeouts (lesson 14) are too generous.

### Common mistakes

- ¦process.exit()¦ right after receiving the signal.
- Readiness that stays green while draining.
- Closing the database first.
- A drain that waits forever.
- Counting requests without ¦finally¦, so one exception leaves the counter stuck above zero.`,
    mission: md`Deploy night: the new version rolls out and every instance is killed instantly. Riders in the middle of unlocking see errors; two rentals were created but never confirmed. From now on a retiring instance says "go elsewhere" to newcomers, lets its current requests finish, and shuts its resources down in order.

Build the lifecycle manager. The control room has a Shut down button: watch in-flight requests drain while newcomers get 503s, then press Restart.`,
    tasks: [
      "class Lifecycle: in-flight counter, state running / draining / closed, onClose(name, fn), shutdown({ graceMs }) once only, restart()",
      "middleware(): rejects new work with 503 + retry-after + connection: close while not running (health probes pass), counts in-flight requests with try / finally",
      "GET /health/ready (503 when not running), and the hooks lifecycleState(), shutdown(), restart()",
      "register close hooks in startup order so they run in reverse: database, then http",
    ],
    starterAdd: js`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 16: stop without dropping anyone.

class Lifecycle {
  // state: "running" -> "draining" -> "closed". inFlight: requests currently being processed.
  get state() {
    // TODO
  }

  get inFlight() {
    // TODO
  }

  // Register a resource to close at shutdown. fn may be async.
  onClose(name, fn) {
    // TODO
  }

  // A middleware function NAMED lifecycleGate:
  //   paths starting with /health always pass straight through (probes are never turned away)
  //   state is not "running": throw HttpError 503, code "shutting_down", message "The server is shutting down",
  //     headers { "retry-after": "5", connection: "close" }
  //   otherwise count the request as in flight for the duration of await next() (use try / finally),
  //   and when the count returns to zero wake whoever waits for the drain
  middleware() {
    // TODO
  }

  // Begin shutting down and resolve with a report { drained, abandoned, closed }.
  //  1. state = "draining"
  //  2. wait until inFlight is 0 or graceMs (default 5000) has passed: drained = true when it reached 0 in time. Clean the timer up when the drain wins.
  //  3. abandoned = the in-flight count at that moment
  //  4. run the registered close hooks in REVERSE order, awaiting each; a hook that throws is logged with log.error and skipped; closed = names that finished
  //  5. state = "closed"
  // Calling shutdown again (even while it runs) returns the SAME promise.
  shutdown(options = {}) {
    // TODO
  }

  // Back to "running" and forget the previous shutdown so it can happen again.
  restart() {
    // TODO
  }
}

const lifecycle = new Lifecycle();

// Close in reverse order of opening: start the log, then the database, then the HTTP listener.
lifecycle.onClose("logs", () => log.info("shutdown complete"));
lifecycle.onClose("database", async () => { await sleep(20); });
lifecycle.onClose("http", async () => { await sleep(10); });

// The control room reads and drives these.
function lifecycleState() {
  return { state: lifecycle.state, inFlight: lifecycle.inFlight };
}
function shutdown() {
  return lifecycle.shutdown();
}
function restart() {
  lifecycle.restart();
}

// TODO: put the gate in front of the rate limiter: app.use(lifecycle.middleware(), { before: "rateLimit" });

// GET /health/ready: 200 { status: "ready" } while running, otherwise HttpError 503 with code "not_ready" and message "Draining: send traffic elsewhere".
router.get("/health/ready", function readiness(req, res) {
  // TODO
});
`,
    solutionAdd: js`class Lifecycle {
  #state = "running";
  #inFlight = 0;
  #idleWaiters = [];
  #closers = [];
  #pending = null;

  get state() {
    return this.#state;
  }

  get inFlight() {
    return this.#inFlight;
  }

  onClose(name, fn) {
    this.#closers.push({ name, fn });
  }

  middleware() {
    const self = this;
    return async function lifecycleGate(req, res, next) {
      if (req.path.startsWith("/health")) return next();
      if (self.#state !== "running") {
        throw new HttpError(503, "The server is shutting down", { code: "shutting_down", headers: { "retry-after": "5", connection: "close" } });
      }
      self.#inFlight++;
      try {
        await next();
      } finally {
        self.#inFlight--;
        if (self.#inFlight === 0) self.#idleWaiters.splice(0).forEach((wake) => wake());
      }
    };
  }

  shutdown(options = {}) {
    if (!this.#pending) this.#pending = this.#run(options.graceMs ?? 5000);
    return this.#pending;
  }

  async #run(graceMs) {
    this.#state = "draining";
    let drained = this.#inFlight === 0;
    if (!drained) {
      let timer;
      drained = await Promise.race([
        new Promise((resolve) => this.#idleWaiters.push(() => resolve(true))),
        new Promise((resolve) => {
          timer = setTimeout(() => resolve(false), graceMs);
        }),
      ]);
      clearTimeout(timer);
    }
    const abandoned = this.#inFlight;
    const closed = [];
    for (const { name, fn } of [...this.#closers].reverse()) {
      try {
        await fn();
        closed.push(name);
      } catch (err) {
        log.error("close hook failed", { name, error: err.message });
      }
    }
    this.#state = "closed";
    return { drained, abandoned, closed };
  }

  restart() {
    this.#state = "running";
    this.#pending = null;
  }
}

const lifecycle = new Lifecycle();

lifecycle.onClose("logs", () => log.info("shutdown complete"));
lifecycle.onClose("database", async () => { await sleep(20); });
lifecycle.onClose("http", async () => { await sleep(10); });

function lifecycleState() {
  return { state: lifecycle.state, inFlight: lifecycle.inFlight };
}
function shutdown() {
  return lifecycle.shutdown();
}
function restart() {
  lifecycle.restart();
}

app.use(lifecycle.middleware(), { before: "rateLimit" });

router.get("/health/ready", function readiness(req, res) {
  if (lifecycle.state !== "running") throw new HttpError(503, "Draining: send traffic elsewhere", { code: "not_ready" });
  res.json({ status: "ready" });
});`,
    explanation:
      "Lifecycle keeps a state, an in-flight counter, a list of waiters and the close hooks. The gate rejects new work whenever the state is not 'running' (but never probes), and counts accepted requests inside try/finally so the counter always comes back down and the last finisher wakes the drain. shutdown races 'in-flight reached zero' against a grace timer, cleans the timer up when the drain wins, then closes resources in reverse order of registration, tolerating a failing hook, and finally marks the server closed. Storing the promise makes a second call share the first result, so a duplicated signal cannot close things twice. Readiness reports 503 as soon as the state leaves running, while liveness keeps answering 200.",
    hints: [
      { id: "h1", title: "The gate", content: "return async function lifecycleGate(req, res, next) { if (req.path.startsWith(\"/health\")) return next(); if (self.#state !== \"running\") throw new HttpError(503, ..., { code: \"shutting_down\", headers: { \"retry-after\": \"5\", connection: \"close\" } }); self.#inFlight++; try { await next(); } finally { self.#inFlight--; if (self.#inFlight === 0) wake the waiters } } - define const self = this above it so the inner function can reach the private fields." },
      { id: "h2", title: "Draining", content: "In the async runner: state = \"draining\"; let drained = inFlight === 0; if not, await Promise.race of (a promise whose resolver you push into #idleWaiters, resolving true) and (a promise that resolves false from setTimeout(..., graceMs)). clearTimeout afterwards. abandoned = inFlight right then." },
      { id: "h3", title: "Closing", content: "for (const { name, fn } of [...this.#closers].reverse()) { try { await fn(); closed.push(name); } catch (err) { log.error(\"close hook failed\", { name, error: err.message }); } }. Store the whole run in this.#pending the first time and return it for later calls; restart() clears it." },
    ],
    tests: [
      {
        id: "t1",
        description: "The gate counts in-flight work and always decrements",
        assertionCode: T(js`const lc = new Lifecycle();
const gate = lc.middleware();
assertEqual(gate.name, "lifecycleGate");
assertEqual([lc.state, lc.inFlight], ["running", 0]);
const req = (path = "/stations") => new HttpRequest({ url: path });
let release;
const running = gate(req(), new HttpResponse(), () => new Promise((resolve) => { release = resolve; }));
assertEqual(lc.inFlight, 1, "counted while the request is being processed");
const second = gate(req(), new HttpResponse(), () => new Promise(() => {}));
assertEqual(lc.inFlight, 2);
release();
await running;
assertEqual(lc.inFlight, 1, "decremented when it finishes");
await assertRejects(gate(req(), new HttpResponse(), async () => { throw new Error("handler blew up"); }), "blew up");
assertEqual(lc.inFlight, 1, "and also when the handler throws (try / finally)");`),
      },
      {
        id: "t2",
        description: "While draining: new work gets 503, health probes pass",
        assertionCode: T(js`const lc = new Lifecycle();
lc.onClose("db", async () => { await sleep(10); });
const gate = lc.middleware();
const shutting = lc.shutdown();
assertEqual(lc.state, "draining", "draining begins immediately and lasts until the resources are closed");
const err = await assertRejects(gate(new HttpRequest({ url: "/stations" }), new HttpResponse(), async () => {}), "shutting down");
assert(err instanceof HttpError, "an HttpError");
assertEqual([err.status, err.code], [503, "shutting_down"]);
assertEqual(err.headers, { "retry-after": "5", connection: "close" });
let probed = false;
await gate(new HttpRequest({ url: "/health/live" }), new HttpResponse(), async () => { probed = true; });
assertEqual(probed, true, "probes are never turned away");
await shutting;
assertEqual(lc.state, "closed");
await assertRejects(gate(new HttpRequest({ url: "/stations" }), new HttpResponse(), async () => {}), "shutting down");`),
      },
      {
        id: "t3",
        description: "shutdown waits for in-flight requests, then closes resources in reverse order",
        assertionCode: T(js`const lc = new Lifecycle();
const gate = lc.middleware();
const order = [];
lc.onClose("first-opened", () => order.push("first-opened"));
lc.onClose("second-opened", async () => { await sleep(10); order.push("second-opened"); });
lc.onClose("last-opened", () => order.push("last-opened"));
let release;
const work = gate(new HttpRequest({ url: "/x" }), new HttpResponse(), () => new Promise((resolve) => { release = () => { order.push("request finished"); resolve(); }; }));
let settled = false;
const report = lc.shutdown().then((r) => { settled = true; return r; });
await sim.tick(2000);
assertEqual(settled, false, "shutdown waits while a request is still running");
assertEqual(order, [], "and nothing is closed yet");
release();
await work;
const result = await report;
assertEqual(result, { drained: true, abandoned: 0, closed: ["last-opened", "second-opened", "first-opened"] });
assertEqual(order, ["request finished", "last-opened", "second-opened", "first-opened"], "the request finished BEFORE any resource closed; closing is reverse order");
assertEqual(sim.pending(), 0, "no grace timer is left behind");`),
      },
      {
        id: "t4",
        description: "shutdown gives up after the grace period and counts what it abandoned",
        assertionCode: T(js`const lc = new Lifecycle();
const gate = lc.middleware();
let closedAt = null;
lc.onClose("db", () => { closedAt = Date.now(); });
const stuck = [1, 2].map(() => gate(new HttpRequest({ url: "/slow" }), new HttpResponse(), () => new Promise(() => {})));
const start = Date.now();
const result = await lc.shutdown({ graceMs: 3000 });
assertEqual(result, { drained: false, abandoned: 2, closed: ["db"] });
assert(Date.now() - start >= 3000 && Date.now() - start < 3100, "it waited the grace period, not longer: " + (Date.now() - start));
assert(closedAt - start >= 3000, "resources were closed only after the grace period");
const idle = new Lifecycle();
const quick = Date.now();
assertEqual((await idle.shutdown({ graceMs: 3000 })).drained, true, "with nothing in flight it is immediate");
assertEqual(Date.now(), quick);`),
      },
      {
        id: "t5",
        description: "shutdown is shared, tolerant and restartable",
        assertionCode: T(js`const lc = new Lifecycle();
const calls = [];
lc.onClose("a", () => calls.push("a"));
lc.onClose("broken", () => { throw new Error("cannot close"); });
lc.onClose("c", () => calls.push("c"));
const p1 = lc.shutdown();
const p2 = lc.shutdown();
assert(p1 === p2, "a second call returns the same promise");
const result = await p1;
assertEqual(result.closed, ["c", "a"], "the broken hook is skipped and the others still ran");
assertEqual(calls, ["c", "a"]);
assertEqual(await lc.shutdown(), result, "after finishing, still the same report and no second run");
assertEqual(calls.length, 2);
const logged = recentLogs(5).some((e) => e.msg === "close hook failed" && e.name === "broken");
assert(logged, "the failing hook was logged");
lc.restart();
assertEqual(lc.state, "running");
const again = await lc.shutdown();
assertEqual(calls, ["c", "a", "c", "a"], "after restart() it can shut down again");`),
      },
      {
        id: "t6",
        description: "The real app: drain in-flight requests, turn newcomers away, probes tell the truth",
        assertionCode: T(js`restart();
db.reset();
const ready = await call("GET", "/health/ready");
assertEqual([ready.status, ready.body], [200, { status: "ready" }]);
assertEqual(lifecycleState(), { state: "running", inFlight: 0 });
assert(listMiddleware().indexOf("lifecycleGate") !== -1 && listMiddleware().indexOf("lifecycleGate") < listMiddleware().indexOf("rateLimit"), "the gate sits in front of the rate limiter: " + listMiddleware().join(", "));
const realGet = db.stations.get;
db.stations.get = async (id) => { await sleep(300); return realGet.call(db.stations, id); };
let during, late, live, notReady, report;
try {
  const slow = call("GET", "/stations/st-01");
  await sim.tick(50);
  assertEqual(lifecycleState().inFlight, 1, "one request is in flight");
  const down = shutdown();
  assertEqual(lifecycleState().state, "draining");
  late = await call("GET", "/stations/st-02");
  live = await call("GET", "/health/live");
  notReady = await call("GET", "/health/ready");
  during = await slow;
  report = await down;
} finally { db.stations.get = realGet; }
assertEqual(during.status, 200, "the request that was already running finished normally");
assertEqual(late.status, 503, "a newcomer is turned away");
assertEqual([late.headers["retry-after"], late.headers.connection], ["5", "close"]);
assertEqual(late.body.type, "https://dockline.example/problems/shutting-down");
assertEqual(live.status, 200, "liveness stays green");
assertEqual([notReady.status, notReady.body.type], [503, "https://dockline.example/problems/not-ready"], "readiness goes red at once");
assertEqual(report, { drained: true, abandoned: 0, closed: ["http", "database", "logs"] }, "resources close in reverse order of opening");
assertEqual(lifecycleState(), { state: "closed", inFlight: 0 });
assertEqual((await call("GET", "/stations/st-03")).status, 503, "closed means closed");
restart();
assertEqual((await call("GET", "/stations/st-03")).status, 200, "after a restart traffic flows again");
assertEqual((await call("GET", "/health/ready")).status, 200);`),
      },
    ],
    unlocks: ["api-shutdown"],
    checks: [
      {
        prompt: md`During a deploy the old instance has started draining. Which probe should fail immediately, and which must keep passing?`,
        question: {
          type: "choice",
          options: [
            "Liveness fails, readiness passes",
            "Readiness fails (stop sending traffic), liveness passes (do not kill me while I finish)",
            "Both fail",
            "Both pass",
          ],
          answer: 1,
        },
        explanation: md`Readiness controls routing and liveness controls restarts. Failing liveness during a drain would make the platform kill the instance halfway through finishing its work.`,
      },
      {
        prompt: md`Resources are opened in the order: logs, database, HTTP listener. In which order should they be closed?`,
        question: {
          type: "choice",
          options: ["logs, database, http", "database, logs, http", "http, database, logs", "Any order"],
          answer: 2,
        },
        explanation: md`Reverse order of creation: stop taking requests first, then close what the requests were using, and flush the logs last so they can describe the whole shutdown.`,
      },
    ],
  },
];
