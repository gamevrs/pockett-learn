import type { Lesson } from "@/engine/types";
import { js, md, T } from "./shared.ts";

/** Chapter 1: Requests and routing. The front door of the API: objects, a middleware pipeline, a router and a log. */
export const chapter1: Lesson[] = [
  // ───────────────────────────────────────── 1. Requests and responses
  {
    id: "js-api-1-wire",
    title: "Requests, responses and the front door",
    minutes: 30,
    xp: 150,
    concepts: ["HTTP anatomy", "normalising input", "query strings", "buffered responses", "never crash"],
    learn: md`### What a server really handles

Strip away sockets, TLS and frameworks and an HTTP server is a function: it receives **a request** and must produce **a response**. A request is only four things:

- a **method** (¦GET¦, ¦POST¦, ...) saying what the caller wants to do,
- a **target**: a path plus an optional query string, like ¦/stations?zone=central&limit=3¦,
- **headers**: small name/value facts about the request (who is asking, what format they speak),
- an optional **body**.

A response is a **status code**, headers and an optional body. Everything else in this course (routing, auth, caching, retries) is policy layered on that one idea.

Requests in this project are plain objects. The control room on the right fires them at your function:

~~~js
handle({ method: "GET", url: "/stations?zone=central", headers: { Accept: "application/json" }, body: undefined, ip: "10.0.0.7" })
// -> { status: 200, headers: { "content-type": "application/json" }, body: [...], trace: [...] }
~~~

That is exactly the seam where a real framework meets the operating system, so everything you build is the real thing, minus the plumbing.

### Normalise at the door

Raw input is messy: header names arrive as ¦Content-Type¦, ¦content-type¦ or ¦CONTENT-TYPE¦; methods in any case; query strings percent-encoded. If every route has to cope with that, every route will get it subtly wrong. A request object does the cleanup **once**, at the door:

- the method is upper-cased, and the path is split from the query string;
- header names are lower-cased (HTTP says they are case-insensitive), with a ¦header(name)¦ lookup that does not care about case;
- the query string becomes an object, so handlers read ¦req.query.limit¦ instead of slicing strings.

### Query strings are hostile input

A query string is chosen by whoever is calling. Two habits keep it from hurting you:

1. **Decoding can throw.** ¦decodeURIComponent("%E0%A4%A")¦ raises ¦URIError¦. A request must never be able to crash the server, so a bad escape is kept as typed instead.
2. **Keys can be nasty.** ¦?__proto__=x&constructor=y¦ is a valid query. If you collect keys into a normal ¦{}¦ and then test ¦key in out¦, names inherited from ¦Object.prototype¦ confuse the logic, and in older code that pattern led to real prototype-pollution bugs. Use ¦Object.create(null)¦ (an object with no prototype) and ¦Object.hasOwn¦.

Repeated keys (¦?tag=a&tag=b¦) become an array; a single key stays a plain string. Be deliberate about that: later code will check ¦Array.isArray¦.

### A response you build up, then send once

Handlers run through several layers, and layers on the way out may still want to add a header (a timing, a request id). So the response is a **buffered object**: ¦res.status(201)¦, ¦res.set("x-trace", "1")¦ and ¦res.json(body)¦ fill it in, and only at the very end does ¦toPlain()¦ turn it into the plain object the caller sees.

The classic bug in this style of code is **answering twice**: two code paths both call ¦res.json¦ and the second one silently wins (or in a real server throws "headers already sent"). Your ¦HttpResponse¦ should make that mistake loud: once sent, another send throws.

### The front door never throws

¦handle¦ is the one function every caller touches. If anything inside throws, the caller must still get a well-formed answer: a ¦500¦ with a generic message. The error text stays out of the response (it can leak file paths and internals); a later lesson logs it properly instead.

The scaffold below gives you ¦handle¦ and a ¦pipeline¦ it calls. The pipeline is a ¦let¦ on purpose: lesson 2 replaces it with the real thing.

### Common mistakes

- Comparing header names without lower-casing them (¦headers["Content-Type"]¦ works until it does not).
- Using ¦split("=")¦ for pairs: values may contain ¦=¦. Split on the first one only.
- Treating a single repeated parameter as a string sometimes and an array other times without noticing.
- Letting a handler error reach the caller verbatim.`,
    mission: md`Dockline runs a city bike-share: eight stations, two dozen bikes, riders who unlock a bike with a phone. The mobile app, the station kiosks and the operations dashboard all speak to one HTTP API, and tonight you start writing it from nothing, in plain JavaScript.

The control room already fires traffic at ¦handle()¦. Give it something solid to work with: a request object that cleans up what arrives, and a response object that collects what you want to say. Once both exist, every request gets a proper answer (even if, for now, it is a polite 404).`,
    tasks: [
      "parseQuery(search): decode a query string into an object; repeated keys become arrays; bad escapes survive; no prototype surprises",
      "class HttpRequest: normalised method, path, query, headers (lower-case) with header(name), body, ip, plus params / id / user placeholders",
      "class HttpResponse: status(), set(), get(), json(), text(), end(), a guard against answering twice, and toPlain()",
    ],
    starterAdd: js`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 1: the objects every request and response is made of.

// Decode one piece of a query string: "+" means a space, then percent-decoding.
// A malformed escape (like "%E0%A4%A") must NOT throw: return the text unchanged.
function decodePart(text) {
  // TODO
}

// Turn "zone=central&limit=3&tag=a&tag=b&flag" into
//   { zone: "central", limit: "3", tag: ["a", "b"], flag: "" }
// - a leading "?" is allowed and ignored; empty pairs ("a=1&&b=2") are skipped
// - split each pair at the FIRST "=" only; a key without "=" gets the value ""
// - the first value stays a string; a repeated key turns into an array of strings
// - collect into Object.create(null) and test keys with Object.hasOwn, so "__proto__" or
//   "constructor" in the query string are just ordinary keys
function parseQuery(search) {
  // TODO
}

// What the rest of the program sees of an incoming request.
class HttpRequest {
  // raw looks like { method: "get", url: "/stations?zone=central", headers: { Accept: "x" }, body, ip }
  // Set these properties:
  //   method   upper-case ("GET" if missing)
  //   path     the url without its query string ("/" if empty)
  //   query    parseQuery of the part after the first "?"
  //   headers  a plain object with every name lower-cased and every value a string
  //   body     raw.body, or null when absent
  //   ip       raw.ip, or "unknown"
  //   params   {}  (the router fills this in)      id    null  (a later lesson sets it)
  //   user     null (authentication fills this in) startedAt  Date.now() when the request arrived
  constructor(raw = {}) {
    // TODO
  }

  // Case-insensitive header lookup: req.header("Content-Type"). Undefined when absent.
  header(name) {
    // TODO
  }
}

// The answer being assembled. Nothing leaves until toPlain().
class HttpResponse {
  // Properties to create: statusCode = 200, headers = {}, payload = undefined, sent = false, trace = [] (a list of names the pipeline fills in)

  // Set the status code and return this (so calls chain). Not an integer from 100 to 599 -> throw a RangeError.
  status(code) {
    // TODO
  }

  // Set a header (names stored lower-case), return this.
  set(name, value) {
    // TODO
  }

  // Read a header (any case), undefined when absent.
  get(name) {
    // TODO
  }

  // Send a JSON body: sets content-type to "application/json", stores the payload, marks the response as sent.
  // If the response was already sent: throw new Error("Response already sent").
  json(body) {
    // TODO
  }

  // Send text: content-type "text/plain; charset=utf-8". Same already-sent rule.
  text(body) {
    // TODO
  }

  // Send no body at all (204 and friends): marks the response as sent. Same already-sent rule.
  end() {
    // TODO
  }

  // The plain object the caller receives:
  //   { status, headers: (a copy), body: (payload, or null when there is none), trace: (a copy) }
  toPlain() {
    // TODO
  }
}

// ── given: the front door ──
// pipeline decides what to do with a request. It is a "let" because lesson 2 swaps in the real one.
let pipeline = async (req, res) => {
  res.status(404).json({ error: ¦No route for \${req.method} \${req.path}¦ });
};

// handle() is the only function the control room calls. It must never throw.
async function handle(raw) {
  let res = new HttpResponse();
  try {
    await pipeline(new HttpRequest(raw ?? {}), res);
  } catch {
    res = new HttpResponse();
    res.status(500).json({ error: "Internal Server Error" });
  }
  return res.toPlain();
}
`,
    solutionAdd: js`function decodePart(text) {
  try {
    return decodeURIComponent(text.replaceAll("+", " "));
  } catch {
    return text;
  }
}

function parseQuery(search) {
  const out = Object.create(null);
  const text = String(search ?? "").replace(/^\?/, "");
  for (const pair of text.split("&")) {
    if (!pair) continue;
    const eq = pair.indexOf("=");
    const key = decodePart(eq === -1 ? pair : pair.slice(0, eq));
    const value = eq === -1 ? "" : decodePart(pair.slice(eq + 1));
    if (!Object.hasOwn(out, key)) out[key] = value;
    else out[key] = [].concat(out[key], value);
  }
  return out;
}

class HttpRequest {
  constructor(raw = {}) {
    const url = String(raw.url ?? "/");
    const cut = url.indexOf("?");
    this.method = String(raw.method ?? "GET").toUpperCase();
    this.path = (cut === -1 ? url : url.slice(0, cut)) || "/";
    this.query = parseQuery(cut === -1 ? "" : url.slice(cut + 1));
    this.headers = {};
    for (const [name, value] of Object.entries(raw.headers ?? {})) this.headers[name.toLowerCase()] = String(value);
    this.body = raw.body ?? null;
    this.ip = raw.ip ?? "unknown";
    this.params = {};
    this.id = null;
    this.user = null;
    this.startedAt = Date.now();
  }

  header(name) {
    return this.headers[String(name).toLowerCase()];
  }
}

class HttpResponse {
  statusCode = 200;
  headers = {};
  payload = undefined;
  sent = false;
  trace = [];

  status(code) {
    if (!Number.isInteger(code) || code < 100 || code > 599) throw new RangeError(¦Invalid status code: \${code}¦);
    this.statusCode = code;
    return this;
  }

  set(name, value) {
    this.headers[String(name).toLowerCase()] = String(value);
    return this;
  }

  get(name) {
    return this.headers[String(name).toLowerCase()];
  }

  #seal() {
    if (this.sent) throw new Error("Response already sent");
    this.sent = true;
  }

  json(body) {
    this.#seal();
    this.set("content-type", "application/json");
    this.payload = body;
    return this;
  }

  text(body) {
    this.#seal();
    this.set("content-type", "text/plain; charset=utf-8");
    this.payload = String(body);
    return this;
  }

  end() {
    this.#seal();
    return this;
  }

  toPlain() {
    return { status: this.statusCode, headers: { ...this.headers }, body: this.payload === undefined ? null : this.payload, trace: [...this.trace] };
  }
}

let pipeline = async (req, res) => {
  res.status(404).json({ error: ¦No route for \${req.method} \${req.path}¦ });
};

async function handle(raw) {
  let res = new HttpResponse();
  try {
    await pipeline(new HttpRequest(raw ?? {}), res);
  } catch {
    res = new HttpResponse();
    res.status(500).json({ error: "Internal Server Error" });
  }
  return res.toPlain();
}`,
    explanation:
      "parseQuery walks the pairs, splits each at the first equals sign, decodes both halves safely and stores them in a prototype-less object, upgrading a repeated key to an array. HttpRequest does all normalisation once, so everything downstream can trust lower-case headers and a parsed query. HttpResponse is a buffer with a one-shot seal: the first json/text/end marks it sent and any second attempt throws, which turns the double-answer bug from a silent overwrite into an immediate failure. handle wraps the pipeline so the caller always gets a plain object, even when something inside explodes.",
    hints: [
      { id: "h1", title: "parseQuery", content: "Loop over text.split(\"&\"), skip empty pairs, find const eq = pair.indexOf(\"=\"). key = decodePart(eq === -1 ? pair : pair.slice(0, eq)); value = eq === -1 ? \"\" : decodePart(pair.slice(eq + 1)). Store in const out = Object.create(null): if (!Object.hasOwn(out, key)) out[key] = value; else out[key] = [].concat(out[key], value)." },
      { id: "h2", title: "The request", content: "Split the url at the first \"?\": const cut = url.indexOf(\"?\"). path is the part before it (or \"/\" if that is empty), query is parseQuery(url.slice(cut + 1)). Copy headers with Object.entries(raw.headers ?? {}) into a new object using name.toLowerCase() and String(value). header(name) is this.headers[String(name).toLowerCase()]." },
      { id: "h3", title: "The response", content: "Keep a private #seal() that throws new Error(\"Response already sent\") if this.sent is true and otherwise sets it. json, text and end call it first. status() validates with Number.isInteger and the 100..599 range and returns this. toPlain returns { status: this.statusCode, headers: { ...this.headers }, body: this.payload === undefined ? null : this.payload, trace: [...this.trace] }." },
    ],
    tests: [
      {
        id: "t1",
        description: "parseQuery: pairs, flags, empty input and a leading ?",
        assertionCode: T(js`assertEqual({ ...parseQuery("zone=central&limit=3") }, { zone: "central", limit: "3" }, "two simple pairs");
assertEqual({ ...parseQuery("") }, {}, "empty string");
assertEqual({ ...parseQuery(undefined) }, {}, "undefined");
assertEqual({ ...parseQuery("?a=1") }, { a: "1" }, "a leading ? is ignored");
assertEqual({ ...parseQuery("a=1&&b=2&") }, { a: "1", b: "2" }, "empty pairs are skipped");
assertEqual({ ...parseQuery("flag&x=") }, { flag: "", x: "" }, "a key without = or with nothing after it has the value empty string");
assertEqual({ ...parseQuery("token=abc=def==") }, { token: "abc=def==" }, "only the first = separates key from value");`),
      },
      {
        id: "t2",
        description: "parseQuery: repeated keys become arrays, escapes are decoded",
        assertionCode: T(js`assertEqual({ ...parseQuery("tag=a&tag=b&tag=c") }, { tag: ["a", "b", "c"] }, "three values for one key");
assertEqual({ ...parseQuery("one=1&tag=a") }, { one: "1", tag: "a" }, "a key given once stays a string");
assertEqual({ ...parseQuery("name=Harbour%20Gate&city=Old+Town") }, { name: "Harbour Gate", city: "Old Town" }, "percent escapes and + are decoded");
assertEqual({ ...parseQuery("a%26b=c%3Dd") }, { "a&b": "c=d" }, "keys are decoded too");`),
      },
      {
        id: "t3",
        description: "parseQuery: a bad escape never throws and odd key names are harmless",
        assertionCode: T(js`let q;
try { q = parseQuery("bad=%E0%A4%A&ok=1"); } catch (e) { throw new Error("parseQuery threw " + e.name + " on a malformed escape; keep the text as typed instead"); }
assertEqual(q.bad, "%E0%A4%A", "the malformed value is kept as typed");
assertEqual(q.ok, "1", "other pairs are unaffected");
const evil = parseQuery("__proto__=x&constructor=y&toString=z&constructor=w");
assertEqual(Object.keys(evil).sort(), ["__proto__", "constructor", "toString"], "these are just three ordinary keys");
assertEqual(evil.constructor, ["y", "w"], "a repeated 'constructor' becomes an array like any other key");
assertEqual(evil.toString, "z", "toString is data, not the inherited function");
assert(({}).polluted === undefined && Object.getPrototypeOf({}) === Object.prototype, "Object.prototype must be untouched");`),
      },
      {
        id: "t4",
        description: "HttpRequest: method, path, query, header names and defaults",
        assertionCode: T(js`const req = new HttpRequest({ method: "post", url: "/stations/st-03?zone=central&tag=a&tag=b", headers: { "Content-Type": "application/json", "X-Request-ID": 42 }, body: { a: 1 }, ip: "10.0.0.7" });
assertEqual(req.method, "POST", "method is upper-cased");
assertEqual(req.path, "/stations/st-03", "path has no query string");
assertEqual({ ...req.query }, { zone: "central", tag: ["a", "b"] }, "query is parsed");
assertEqual(req.headers["content-type"], "application/json", "header names are lower-cased");
assertEqual(req.header("CONTENT-type"), "application/json", "header() ignores case");
assertEqual(req.header("x-request-id"), "42", "header values are strings");
assertEqual(req.header("authorization"), undefined, "a missing header is undefined");
assertEqual(req.body, { a: 1 }, "body is kept");
assertEqual(req.ip, "10.0.0.7", "ip is kept");
assertEqual(req.params, {}, "params start empty");
assertEqual([req.id, req.user], [null, null], "id and user start as null");
assertEqual(typeof req.startedAt, "number", "startedAt is a timestamp");
const bare = new HttpRequest();
assertEqual([bare.method, bare.path, bare.body, bare.ip], ["GET", "/", null, "unknown"], "an empty request has sensible defaults");
assertEqual(new HttpRequest({ url: "?a=1" }).path, "/", "no path part means /");`),
      },
      {
        id: "t5",
        description: "HttpResponse: chainable builder with validation",
        assertionCode: T(js`const res = new HttpResponse();
assertEqual(res.statusCode, 200, "default status is 200");
assertEqual(res.sent, false, "nothing sent yet");
assert(res.status(201) === res, "status() returns the response so calls chain");
assertEqual(res.statusCode, 201);
assert(res.set("X-Trace-Id", "abc") === res, "set() chains");
assertEqual(res.get("x-trace-id"), "abc", "names are stored lower-case");
assertEqual(res.get("X-TRACE-ID"), "abc", "get() ignores case");
assertEqual(res.get("nope"), undefined);
assertThrows(() => res.status(99), "RangeError", "99 is not a status code");
assertThrows(() => res.status(600), "RangeError");
assertThrows(() => res.status("200"), "RangeError", "a string is not an integer");
assertThrows(() => res.status(200.5), "RangeError");
assertEqual(res.statusCode, 201, "a rejected status leaves the old one in place");`),
      },
      {
        id: "t6",
        description: "HttpResponse: sending once, and toPlain()",
        assertionCode: T(js`const res = new HttpResponse();
res.status(201).json({ id: 7 });
assertEqual(res.sent, true, "json() marks the response as sent");
assertEqual(res.get("content-type"), "application/json");
assertThrows(() => res.json({ again: true }), "already sent", "answering twice must be loud");
assertThrows(() => res.text("again"), "already sent");
assertThrows(() => res.end(), "already sent");
res.set("x-late", "1");
assertEqual(res.toPlain(), { status: 201, headers: { "content-type": "application/json", "x-late": "1" }, body: { id: 7 }, trace: [] }, "headers can still be added after sending because the response is buffered");
const plain = res.toPlain();
plain.headers.hacked = "1";
assertEqual(res.get("hacked"), undefined, "toPlain returns a copy of the headers");
const t = new HttpResponse().text("hello");
assertEqual([t.get("content-type"), t.toPlain().body], ["text/plain; charset=utf-8", "hello"]);
const e = new HttpResponse().status(204).end();
assertEqual(e.toPlain().body, null, "no body is null");
assertEqual(e.sent, true);`),
      },
      {
        id: "t7",
        description: "handle() always returns a plain answer and never throws",
        assertionCode: T(js`const r = await handle({ method: "get", url: "/nowhere?x=1", headers: { Accept: "*/*" }, ip: "10.1.1.1" });
assertEqual(r.status, 404, "nothing is routed yet, so 404");
assertEqual(typeof r.headers, "object");
assertEqual(Array.isArray(r.trace), true, "trace is an array");
assert(r.body && typeof r.body.error === "string", "the body explains what happened");
for (const junk of [undefined, null, {}, { url: 42 }, { method: 5, headers: null }]) {
  const out = await handle(junk);
  assert(Number.isInteger(out.status), "handle(" + JSON.stringify(junk) + ") must still produce a status");
}
const real = pipeline;
pipeline = async () => { throw new Error("secret database password is hunter2"); };
let boom;
try { boom = await handle({ method: "GET", url: "/" }); } finally { pipeline = real; }
assertEqual(boom.status, 500, "a crash inside becomes a 500");
assert(!JSON.stringify(boom).includes("hunter2"), "the error text must not leak to the caller");`),
      },
    ],
    unlocks: ["api-wire"],
    checks: [
      {
        prompt: md`A caller sends ¦GET /stations?zone=old&zone=central¦. What should ¦req.query.zone¦ be, with the rules from this lesson?`,
        question: { type: "choice", options: ["\"old\"", "\"central\"", "[\"old\", \"central\"]", "undefined"], answer: 2 },
        explanation: md`A repeated key becomes an array of strings in the order given. Silently keeping only the first or the last value hides what the caller sent, and later lessons (filters, validation) will decide explicitly whether an array is acceptable.`,
      },
      {
        prompt: md`Why is it risky to collect query keys in a plain ¦{}¦ and test them with ¦key in out¦?`,
        question: {
          type: "choice",
          options: [
            "Plain objects are slower than arrays",
            "Names like constructor or __proto__ are already present through the prototype chain, so the caller can confuse your logic or even pollute shared objects",
            "The in operator only works on Maps",
            "Query keys must always be numbers",
          ],
          answer: 1,
        },
        explanation: md`Attacker-chosen keys meet inherited properties. A prototype-less object plus ¦Object.hasOwn¦ makes every key an ordinary key and removes the whole class of bug.`,
      },
    ],
  },

  // ───────────────────────────────────────── 2. Middleware pipeline
  {
    id: "js-api-2-pipeline",
    title: "The middleware pipeline",
    minutes: 40,
    xp: 180,
    concepts: ["middleware", "next()", "onion model", "error handling", "ordering"],
    learn: md`### Cross-cutting concerns need a home

Every request needs the same chores: attach an id, log it, check who is calling, limit abuse, parse the body, add security headers, convert errors into answers. If each route repeated them, the routes would drown in chores and one forgotten line would be a security hole.

The standard answer is the **middleware pipeline**: a list of small functions, each with the signature ¦(req, res, next)¦. A middleware may do work, then call ¦next()¦ to hand the request to the next one, or **stop the chain** by answering itself.

~~~js
async function timing(req, res, next) {
  const started = Date.now();
  await next();                                   // everything after me runs inside this await
  res.set("x-took", ¦\${Date.now() - started}ms¦);   // ...and I get the last word on the way out
}
~~~

### The onion

Because ¦next()¦ returns a Promise for "the rest of the chain", code **before** ¦await next()¦ runs on the way in and code **after** it runs on the way out, in reverse order, like the layers of an onion:

~~~
a (in) -> b (in) -> handler -> b (out) -> a (out)
~~~

That shape is what makes logging, timing and caching possible: they need to see the finished response.

### Rules that keep a pipeline sane

- **Ordering is behaviour.** Rate limiting before authentication, logging before both. Register order is run order, and a later lesson will need ¦use(fn, { before: "name" })¦ to slot a middleware in front of an existing one.
- **next() at most once.** Calling it twice would run the rest of the chain twice. Detect it and fail loudly.
- **Always await next().** Without ¦await¦ the onion collapses: "after" code runs before the handler finished.
- **A terminal handler** sits at the end (the router, in the next lesson). If nothing answered, that is a bug, so the pipeline turns it into a clear 500 instead of leaving the caller hanging.

### Errors become answers where they happen

What should happen when a handler throws? Two designs exist. In one, the exception climbs up through every middleware until something catches it, so any layer that wants to inspect the final status has to wrap ¦next()¦ in its own try/catch. In the other, **an error is converted into a response at the point it is thrown**, and the layers above simply see a normal finished response. We use the second: ¦compose¦ takes an ¦onError(err, req, res)¦ function and calls it for anything a middleware throws. The access log of lesson 4 will be glad.

That ¦onError¦ function decides how failures look to callers. It uses an ¦HttpError¦ class for failures the caller should hear about (a status, a safe message, optional headers such as ¦Retry-After¦) and treats everything else as a **bug**: always a 500 with a generic message, because the real message of an unexpected exception may contain file paths, SQL or secrets.

### Wiring a first middleware

Security headers are the classic first one: a few static response headers that tell browsers not to guess content types (¦x-content-type-options: nosniff¦), not to be framed (¦x-frame-options: DENY¦) and not to leak the page address (¦referrer-policy: no-referrer¦). It does its work before ¦next()¦ and does not care about anything after it.

### Common mistakes

- Forgetting ¦return next()¦ or ¦await next()¦, then wondering why timing code reports zero.
- A middleware that neither answers nor calls ¦next()¦: the request just ends. Here the pipeline reports it as a 500.
- Sending a response and then calling ¦next()¦ anyway, so a later layer tries to answer too.
- Catching an error, logging it, and carrying on as if it succeeded.`,
    mission: md`A single ¦pipeline¦ function cannot hold what a production API needs. Dockline's first real requirement is boring and important: every answer carries security headers, every failure becomes a clean response, and the order of things is under your control.

Build the pipeline: ¦compose¦ for the onion, ¦HttpError¦ for failures the caller should see, and an ¦App¦ that holds the middleware list. When it is in place, the control room draws one lane per middleware and shows each request flowing through them.`,
    tasks: [
      "class HttpError(status, message, { code, headers, details }) extends Error",
      "compose(stack, { terminal, onError }): the onion, next() once, errors handed to onError at the throw point, names recorded in res.trace",
      "class App: use(fn, { before }), mount(terminal), onError(handler), middlewareNames(), run(req, res)",
      "securityHeaders middleware, registered with app.use, and the pipeline switched over to app.run",
    ],
    starterAdd: js`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 2: a middleware pipeline.

// A failure the caller is allowed to hear about.
//   new HttpError(404, "Station st-99 does not exist", { code: "not_found", headers: { "x-hint": "1" }, details: { id: "st-99" } })
// Properties: name = "HttpError", status, message, code (default undefined), headers (default {}), details (default undefined).
class HttpError extends Error {
  constructor(status, message, options = {}) {
    // TODO
  }
}

// Build one function that runs a list of middleware as an onion.
//   const run = compose([a, b], { terminal, onError });  await run(req, res);
// - each middleware is called as fn(req, res, next); the terminal (if any) runs after the last one
// - before calling a function push its name onto res.trace (use fn.name, or "anonymous")
// - next() runs the rest of the chain and returns a Promise
// - calling next() twice from the same middleware: throw new Error("next() called more than once in the same middleware")
// - if a function throws or rejects: when onError is given, await onError(err, req, res) and carry on as normal
//   (the layers above see a finished response); when onError is missing, let the error propagate
function compose(stack, { terminal, onError } = {}) {
  // TODO
}

class App {
  // Add a middleware to the end of the list. { before: "name" } puts it right before the first middleware with that function name
  // (no such name -> throw new Error(¦use(): no middleware named "\${name}" to go before¦)).
  // Not a function -> throw new TypeError("middleware must be a function, got <typeof>"). Return this.
  use(fn, options = {}) {
    // TODO
  }

  // The terminal handler: the last stop, after every middleware. Return this.
  mount(handler) {
    // TODO
  }

  // Replace the error handler. Return this.
  onError(handler) {
    // TODO
  }

  // ["securityHeaders", ...] in run order ("anonymous" for unnamed functions)
  middlewareNames() {
    // TODO
  }

  // Run one request through compose(...) using the terminal (notFound when none was mounted) and the error handler.
  // If everything finished but nobody sent a response, treat that as a bug: hand new Error("No middleware produced a response") to the error handler.
  // If the error handler itself throws, let it propagate (handle() turns that into a 500).
  async run(req, res) {
    // TODO
  }
}

// ── given: the default behaviour ──
// The last stop when no router is mounted.
function notFound(req) {
  throw new HttpError(404, ¦No route for \${req.method} \${req.path}¦, { code: "not_found" });
}

// Known failures keep their message (and any extra details); everything else is a bug and says nothing about itself.
function defaultErrorHandler(err, req, res) {
  if (res.sent) return;
  const known = err instanceof HttpError;
  res.status(known ? err.status : 500);
  if (known) for (const [name, value] of Object.entries(err.headers)) res.set(name, value);
  res.json({ error: known ? err.message : "Internal Server Error", ...(known ? err.details : {}) });
}

const app = new App();
pipeline = (req, res) => app.run(req, res);

// The control room reads this to draw one lane per middleware.
function listMiddleware() {
  return app.middlewareNames();
}

// Static headers that harden every response. Does its work, then hands on with next().
function securityHeaders(req, res, next) {
  // TODO: x-content-type-options: nosniff, x-frame-options: DENY, referrer-policy: no-referrer
}

// TODO: register it: app.use(securityHeaders);
`,
    solutionAdd: js`class HttpError extends Error {
  constructor(status, message, options = {}) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.code = options.code;
    this.headers = options.headers ?? {};
    this.details = options.details;
  }
}

function compose(stack, { terminal, onError } = {}) {
  return function run(req, res) {
    let last = -1;
    const dispatch = async (i) => {
      if (i <= last) throw new Error("next() called more than once in the same middleware");
      last = i;
      const fn = i < stack.length ? stack[i] : terminal;
      if (!fn) return;
      res.trace.push(fn.name || "anonymous");
      try {
        await fn(req, res, () => dispatch(i + 1));
      } catch (err) {
        if (!onError) throw err;
        await onError(err, req, res);
      }
    };
    return dispatch(0);
  };
}

class App {
  #stack = [];
  #terminal = null;
  #onError = null;

  use(fn, options = {}) {
    if (typeof fn !== "function") throw new TypeError(¦middleware must be a function, got \${typeof fn}¦);
    if (options.before === undefined) {
      this.#stack.push(fn);
    } else {
      const at = this.#stack.findIndex((m) => m.name === options.before);
      if (at === -1) throw new Error(¦use(): no middleware named "\${options.before}" to go before¦);
      this.#stack.splice(at, 0, fn);
    }
    return this;
  }

  mount(handler) {
    this.#terminal = handler;
    return this;
  }

  onError(handler) {
    this.#onError = handler;
    return this;
  }

  middlewareNames() {
    return this.#stack.map((fn) => fn.name || "anonymous");
  }

  async run(req, res) {
    const onError = this.#onError ?? defaultErrorHandler;
    const chain = compose(this.#stack, { terminal: this.#terminal ?? notFound, onError });
    await chain(req, res);
    if (!res.sent) await onError(new Error("No middleware produced a response"), req, res);
  }
}

function notFound(req) {
  throw new HttpError(404, ¦No route for \${req.method} \${req.path}¦, { code: "not_found" });
}

function defaultErrorHandler(err, req, res) {
  if (res.sent) return;
  const known = err instanceof HttpError;
  res.status(known ? err.status : 500);
  if (known) for (const [name, value] of Object.entries(err.headers)) res.set(name, value);
  res.json({ error: known ? err.message : "Internal Server Error", ...(known ? err.details : {}) });
}

const app = new App();
pipeline = (req, res) => app.run(req, res);

function listMiddleware() {
  return app.middlewareNames();
}

function securityHeaders(req, res, next) {
  res.set("x-content-type-options", "nosniff");
  res.set("x-frame-options", "DENY");
  res.set("referrer-policy", "no-referrer");
  return next();
}

app.use(securityHeaders);`,
    explanation:
      "compose is a recursive dispatcher: dispatch(i) runs middleware i with a next that dispatches i+1, and the 'last' index detects a second next() call. Because each call is wrapped in try/catch, a throw is handed to onError right where it happened and the dispatcher returns normally, so the middleware above sees a finished response instead of an exception. App stores the list, supports slotting a middleware before a named one, and adds the safety net for a chain that never answered. securityHeaders sets its headers first and passes control on.",
    hints: [
      { id: "h1", title: "compose", content: "Keep let last = -1 inside the returned function and write const dispatch = async (i) => { if (i <= last) throw ...; last = i; const fn = i < stack.length ? stack[i] : terminal; if (!fn) return; res.trace.push(fn.name || \"anonymous\"); try { await fn(req, res, () => dispatch(i + 1)); } catch (err) { if (!onError) throw err; await onError(err, req, res); } }; return dispatch(0)." },
      { id: "h2", title: "use with before", content: "const at = this.#stack.findIndex((m) => m.name === options.before); if (at === -1) throw ...; this.#stack.splice(at, 0, fn). Without before, this.#stack.push(fn). Both paths end with return this." },
      { id: "h3", title: "App.run", content: "const onError = this.#onError ?? defaultErrorHandler; const chain = compose(this.#stack, { terminal: this.#terminal ?? notFound, onError }); await chain(req, res); then if (!res.sent) await onError(new Error(\"No middleware produced a response\"), req, res)." },
    ],
    tests: [
      {
        id: "t1",
        description: "HttpError carries a status, message and options",
        assertionCode: T(js`const e = new HttpError(404, "Station st-99 does not exist", { code: "not_found", headers: { "x-hint": "1" }, details: { id: "st-99" } });
assert(e instanceof Error, "HttpError extends Error");
assertEqual([e.name, e.status, e.message, e.code], ["HttpError", 404, "Station st-99 does not exist", "not_found"]);
assertEqual(e.headers, { "x-hint": "1" });
assertEqual(e.details, { id: "st-99" });
const bare = new HttpError(500, "x");
assertEqual([bare.code, bare.headers, bare.details], [undefined, {}, undefined], "options are optional");
assert(typeof bare.stack === "string", "it has a stack like any Error");`),
      },
      {
        id: "t2",
        description: "compose runs middleware as an onion and records the trace",
        assertionCode: T(js`const log = [];
const req = new HttpRequest({ url: "/" });
const res = new HttpResponse();
async function first(req, res, next) { log.push("first in"); await next(); log.push("first out"); }
async function second(req, res, next) { log.push("second in"); await next(); log.push("second out"); }
function last(req, res) { log.push("terminal"); res.json({ ok: true }); }
await compose([first, second], { terminal: last })(req, res);
assertEqual(log, ["first in", "second in", "terminal", "second out", "first out"], "in order, then back out in reverse");
assertEqual(res.trace, ["first", "second", "last"], "names of the functions that ran, in order");
assertEqual(res.toPlain().body, { ok: true });`),
      },
      {
        id: "t3",
        description: "A middleware can stop the chain by answering itself",
        assertionCode: T(js`const calls = [];
function gate(req, res) { calls.push("gate"); res.status(401).json({ no: true }); }
function never() { calls.push("never"); }
const res = new HttpResponse();
await compose([gate, never], { terminal: never })(new HttpRequest({}), res);
assertEqual(calls, ["gate"], "nothing after the gate runs when it does not call next()");
assertEqual(res.statusCode, 401);
const anon = new HttpResponse();
await compose([(r, s, next) => next()])(new HttpRequest({}), anon);
assertEqual(anon.trace, ["anonymous"], "unnamed functions are traced as anonymous");`),
      },
      {
        id: "t4",
        description: "Calling next() twice is an error",
        assertionCode: T(js`async function greedy(req, res, next) { await next(); await next(); }
const res = new HttpResponse();
const out = [];
await assertRejects(compose([greedy], { terminal: () => out.push("t") })(new HttpRequest({}), res), "more than once");
assertEqual(out.length, 1, "the rest of the chain only ran once");`),
      },
      {
        id: "t5",
        description: "Errors are handed to onError where they happen",
        assertionCode: T(js`const seen = [];
async function outer(req, res, next) { seen.push("outer in"); await next(); seen.push("outer sees status " + res.statusCode); }
function bad() { throw new HttpError(418, "teapot"); }
const onError = (err, req, res) => { seen.push("onError " + err.message); res.status(err.status ?? 500).json({ error: err.message }); };
const res = new HttpResponse();
await compose([outer, bad], { onError })(new HttpRequest({}), res);
assertEqual(seen, ["outer in", "onError teapot", "outer sees status 418"], "the outer layer carries on normally and sees the converted response");
const asyncBad = async () => { await Promise.resolve(); throw new Error("late"); };
const res2 = new HttpResponse();
await compose([asyncBad], { onError })(new HttpRequest({}), res2);
assertEqual(res2.toPlain().body, { error: "late" }, "rejections are handled too");
await assertRejects(compose([bad])(new HttpRequest({}), new HttpResponse()), "teapot", "without onError the error propagates");`),
      },
      {
        id: "t6",
        description: "App: use, before, names and argument checks",
        assertionCode: T(js`const a = new App();
function one() {} function two() {} function three() {}
assert(a.use(one) === a, "use() returns the app");
a.use(two).use(three, { before: "two" });
assertEqual(a.middlewareNames(), ["one", "three", "two"], "before puts it in front of the named middleware");
a.use(() => {});
assertEqual(a.middlewareNames().at(-1), "anonymous");
assertThrows(() => a.use(one, { before: "missing" }), 'no middleware named "missing"');
assertThrows(() => a.use("nope"), "must be a function");
assertEqual(a.middlewareNames().length, 4, "failed calls change nothing");
assert(a.mount(() => {}) === a && a.onError(() => {}) === a, "mount and onError return the app");`),
      },
      {
        id: "t7",
        description: "App.run: terminal, 404, missing answers and errors",
        assertionCode: T(js`const run = async (app, url = "/x") => { const res = new HttpResponse(); await app.run(new HttpRequest({ url }), res); return res.toPlain(); };
const empty = await run(new App());
assertEqual(empty.status, 404, "with nothing mounted the answer is 404");
assertEqual(empty.body, { error: "No route for GET /x" });
const mounted = await run(new App().mount((req, res) => res.json({ hi: req.path })));
assertEqual(mounted.body, { hi: "/x" }, "the terminal handler answers");
const silent = await run(new App().mount(() => {}));
assertEqual(silent.status, 500, "a chain that never answers is a bug: 500");
const withHeaders = await run(new App().mount(() => { throw new HttpError(429, "slow down", { headers: { "retry-after": "3" } }); }));
assertEqual([withHeaders.status, withHeaders.headers["retry-after"], withHeaders.body], [429, "3", { error: "slow down" }], "HttpError status, headers and message reach the caller");
const crash = await run(new App().mount(() => { throw new Error("password=hunter2"); }));
assertEqual(crash.status, 500);
assert(!JSON.stringify(crash).includes("hunter2"), "unexpected errors never leak their message");
const custom = await run(new App().mount(() => { throw new Error("x"); }).onError((e, req, res) => res.status(503).json({ custom: true })));
assertEqual([custom.status, custom.body], [503, { custom: true }], "onError replaces the handler");`),
      },
      {
        id: "t8",
        description: "The real app: securityHeaders is registered and handle() goes through the pipeline",
        assertionCode: T(js`assert(listMiddleware().includes("securityHeaders"), "register securityHeaders with app.use");
const r = await handle({ method: "GET", url: "/anything" });
assertEqual(r.status, 404);
assertEqual(r.headers["x-content-type-options"], "nosniff");
assertEqual(r.headers["x-frame-options"], "DENY");
assertEqual(r.headers["referrer-policy"], "no-referrer");
assertEqual(r.trace, ["securityHeaders", "notFound"], "the trace shows the lane the request travelled");
assertEqual(r.body, { error: "No route for GET /anything" });`),
      },
    ],
    unlocks: ["api-pipeline"],
    checks: [
      {
        prompt: md`~~~js
async function a(req, res, next) { console.log("a1"); await next(); console.log("a2"); }
async function b(req, res, next) { console.log("b1"); await next(); console.log("b2"); }
~~~
With the pipeline ¦[a, b]¦ and a terminal that logs ¦T¦, what is printed?`,
        question: { type: "choice", options: ["a1 b1 T b2 a2", "a1 a2 b1 b2 T", "a1 b1 b2 a2 T", "T a1 b1 b2 a2"], answer: 0 },
        explanation: md`Code before ¦await next()¦ runs on the way in, in registration order; code after it runs on the way out in reverse. That symmetry is why a logger placed first can see the final status of everything inside it.`,
      },
      {
        prompt: md`Why does ¦compose¦ convert a thrown error into a response at the point it was thrown, instead of letting it travel up through every middleware?`,
        question: {
          type: "choice",
          options: [
            "Exceptions cannot cross an await",
            "So the layers above (logging, timing, caching) always see a normal finished response and never need their own try/catch",
            "It makes the handler run faster",
            "Because HTTP forbids exceptions",
          ],
          answer: 1,
        },
        explanation: md`One place decides what a failure looks like, and every outer layer keeps its simple "after next()" code. The alternative works too, but each layer that needs the final status would have to wrap ¦next()¦ in its own try/catch.`,
      },
    ],
  },

  // ───────────────────────────────────────── 3. Router
  {
    id: "js-api-3-router",
    title: "A router with path parameters",
    minutes: 40,
    xp: 180,
    concepts: ["path matching", "path parameters", "404 vs 405", "specificity", "route policies"],
    learn: md`### From a path to a handler

The pipeline can run code for every request. The **router** answers the next question: which handler is this request for? It maps ¦(method, path)¦ to a function, and extracts the variable parts of the path (the **parameters**):

~~~js
router.get("/stations/:id", getStation);       // GET /stations/st-03  ->  req.params = { id: "st-03" }
router.get("/stations/:id/bikes", listBikes);  // GET /stations/st-03/bikes
~~~

### Matching, step by step

A pattern is split on ¦/¦ into segments. A segment starting with ¦:¦ is a parameter and matches any single non-empty piece; every other segment must be equal. Segment counts must match too, so ¦/stations/:id¦ never matches ¦/stations/st-03/bikes¦. Parameter values are **percent-decoded** (¦Harbour%20Gate¦ becomes ¦Harbour Gate¦) - safely, since a bad escape must not throw. Trailing and doubled slashes are ignored.

### When more than one route matches

Given ¦GET /stations/nearby¦, both ¦/stations/nearby¦ and ¦/stations/:id¦ match. A sane router prefers the more **specific** one: compare segment by segment from the left and let a literal beat a parameter. Registration order must not decide this, or moving a line would change behaviour.

### 404 is not 405

- No pattern matches the path at all: **404 Not Found**.
- The path exists but not for this method: **405 Method Not Allowed**, and the response *must* include an ¦Allow¦ header listing the methods that do work. A caller that sees only 404 for ¦DELETE /stations¦ will go looking for a typo in the URL instead of the verb.

### Fail at startup, not at 3 a.m.

Registering the same method and path twice, a pattern without a leading slash, or a duplicate parameter name are programmer errors. The router throws immediately while the program is being assembled, so the mistake shows up the first time anyone starts the server, not when a certain request arrives in production.

### Route-level policies with before()

Most routes need extra steps that other routes do not: validate this body, require this role, check an idempotency key. Instead of wrapping each handler by hand, give the router a small policy hook:

~~~js
router.before("POST", "/stations", requireRole("admin"));
~~~

¦before(method, pattern, ...middleware)¦ attaches middleware to an **existing** route, placing it in front of everything already attached to it. Later lessons use it to bolt on validation, authentication rules and caching preconditions *at the end of the file*, where the whole security story can be read in one place. Because the newest attachment runs first, you add an outer check (authorisation) after an inner one (validation) and the order comes out right: who are you, then is your input sane.

The router itself is just another middleware, mounted as the pipeline's terminal.

### Common mistakes

- Matching with an ever-growing regular expression instead of segments: unreadable and slow to debug.
- Letting the first registered route win, which makes order of registration a hidden behaviour.
- Returning 404 for a wrong method.
- Forgetting that ¦:id¦ is a **string**; ¦"7" !== 7¦.`,
    mission: md`Dockline's API is a set of resources: stations, bikes, rentals. The mobile app asks for ¦/stations/st-03/bikes¦; the kiosks ask for ¦/health/live¦. Build the router that turns each path into the right handler and parameters, and says the correct thing when it cannot.

Mount it into your pipeline, register the first real routes, and the control room's route map lights up: every route you add appears there and counts the traffic it receives.`,
    tasks: [
      "class Router: add / get / post / put / patch / delete with startup checks (bad pattern, duplicates)",
      "match(method, path): params, literal-over-parameter specificity, 405 with the allowed methods, null for 404",
      "before(method, pattern, ...middleware) and list()",
      "middleware(): a function named router that sets req.params and req.route, runs the route's chain, and throws 404/405 HttpErrors",
      "mount it on the app and register GET /health/live",
    ],
    starterAdd: js`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 3: a router.

class Router {
  // Register a route. method is one of GET POST PUT PATCH DELETE (otherwise throw a TypeError).
  // pattern must start with "/" and may contain :params. Throw an Error for:
  //   - a pattern that does not start with "/"
  //   - an empty or repeated parameter name ("/a/:/b", "/a/:id/b/:id")
  //   - the same method + pattern registered twice: ¦Route already registered: GET /stations¦
  // handlers: one or more functions (req, res, next); anything else is a TypeError. Return this.
  // Keep each route as { method, pattern, segments, guards: [], handlers }.
  add(method, pattern, ...handlers) {
    // TODO
  }

  get(pattern, ...handlers) { return this.add("GET", pattern, ...handlers); }
  post(pattern, ...handlers) { return this.add("POST", pattern, ...handlers); }
  put(pattern, ...handlers) { return this.add("PUT", pattern, ...handlers); }
  patch(pattern, ...handlers) { return this.add("PATCH", pattern, ...handlers); }
  delete(pattern, ...handlers) { return this.add("DELETE", pattern, ...handlers); }

  // Attach middleware to an EXISTING route, in front of everything already attached (guards first, newest first).
  // before("POST", "/x", a, b) runs a then b. Unknown route -> throw new Error(¦before(): no route POST /x¦). Return this.
  before(method, pattern, ...middleware) {
    // TODO
  }

  // [{ method: "GET", path: "/stations/:id" }, ...] in registration order.
  list() {
    // TODO
  }

  // Find the route for a request.
  //  - a route matches when it has the same number of segments and every literal segment is equal
  //    (":name" matches any piece; values are percent-decoded safely; empty segments are ignored)
  //  - several routes match: the one whose first differing segment is a literal wins ("/stations/nearby" beats "/stations/:id")
  //  - return { route, params }              when a route for this method matches (params is a plain object)
  //  - return { allowed: ["GET", "POST"] }   when the path matches routes but not for this method (sorted, no duplicates)
  //  - return null                           when no route matches the path at all
  match(method, path) {
    // TODO
  }

  // The middleware that mounts this router: a function NAMED router (it shows up in the trace under that name).
  //  - 404: throw new HttpError(404, ¦No route for GET /x¦, { code: "not_found" })
  //  - 405: throw new HttpError(405, ¦POST is not allowed on /x¦, { code: "method_not_allowed", headers: { allow: "GET, HEAD" } })
  //  - found: set req.params and req.route (the pattern), then run the route's guards followed by its handlers with compose(...)
  middleware() {
    // TODO
  }
}

const router = new Router();
app.mount(router.middleware());

// The control room reads this to draw the route map.
function listRoutes() {
  return router.list();
}

// TODO: register GET /health/live. A named function liveness(req, res) that answers { status: "ok" }.
`,
    solutionAdd: js`const ROUTER_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"];
const splitPath = (path) => String(path).split("/").filter(Boolean);

class Router {
  #routes = [];

  add(method, pattern, ...handlers) {
    if (!ROUTER_METHODS.includes(method)) throw new TypeError(¦Unsupported method: \${method}¦);
    if (typeof pattern !== "string" || !pattern.startsWith("/")) throw new Error(¦Route pattern must start with "/": \${pattern}¦);
    if (handlers.length === 0 || handlers.some((h) => typeof h !== "function")) throw new TypeError(¦\${method} \${pattern} needs one or more handler functions¦);
    const segments = splitPath(pattern).map((s) => (s.startsWith(":") ? { param: s.slice(1) } : { literal: s }));
    const names = segments.filter((s) => s.param !== undefined).map((s) => s.param);
    if (names.some((n) => !n) || new Set(names).size !== names.length) throw new Error(¦Bad parameter name in \${pattern}¦);
    if (this.#routes.some((r) => r.method === method && r.pattern === pattern)) throw new Error(¦Route already registered: \${method} \${pattern}¦);
    this.#routes.push({ method, pattern, segments, guards: [], handlers });
    return this;
  }

  get(pattern, ...handlers) { return this.add("GET", pattern, ...handlers); }
  post(pattern, ...handlers) { return this.add("POST", pattern, ...handlers); }
  put(pattern, ...handlers) { return this.add("PUT", pattern, ...handlers); }
  patch(pattern, ...handlers) { return this.add("PATCH", pattern, ...handlers); }
  delete(pattern, ...handlers) { return this.add("DELETE", pattern, ...handlers); }

  before(method, pattern, ...middleware) {
    const route = this.#routes.find((r) => r.method === method && r.pattern === pattern);
    if (!route) throw new Error(¦before(): no route \${method} \${pattern}¦);
    route.guards.unshift(...middleware);
    return this;
  }

  list() {
    return this.#routes.map((r) => ({ method: r.method, path: r.pattern }));
  }

  match(method, path) {
    const pieces = splitPath(path);
    const hits = [];
    for (const route of this.#routes) {
      if (route.segments.length !== pieces.length) continue;
      const params = {};
      let ok = true;
      route.segments.forEach((seg, i) => {
        if (seg.param !== undefined) params[seg.param] = decodePart(pieces[i].replaceAll("+", "%2B"));
        else if (seg.literal !== pieces[i]) ok = false;
      });
      if (ok) hits.push({ route, params });
    }
    if (hits.length === 0) return null;
    const mine = hits.filter((h) => h.route.method === method);
    if (mine.length === 0) return { allowed: [...new Set(hits.map((h) => h.route.method))].sort() };
    mine.sort((a, b) => {
      for (let i = 0; i < a.route.segments.length; i++) {
        const la = a.route.segments[i].literal !== undefined;
        const lb = b.route.segments[i].literal !== undefined;
        if (la !== lb) return la ? -1 : 1;
      }
      return 0;
    });
    return mine[0];
  }

  middleware() {
    const self = this;
    return async function router(req, res) {
      const found = self.match(req.method, req.path);
      if (found === null) throw new HttpError(404, ¦No route for \${req.method} \${req.path}¦, { code: "not_found" });
      if (found.allowed) {
        throw new HttpError(405, ¦\${req.method} is not allowed on \${req.path}¦, { code: "method_not_allowed", headers: { allow: found.allowed.join(", ") } });
      }
      req.params = found.params;
      req.route = found.route.pattern;
      await compose([...found.route.guards, ...found.route.handlers])(req, res);
    };
  }
}

const router = new Router();
app.mount(router.middleware());

function listRoutes() {
  return router.list();
}

router.get("/health/live", function liveness(req, res) {
  res.json({ status: "ok" });
});`,
    explanation:
      "Patterns are compiled into segments once, at registration, where mistakes are rejected immediately. match counts segments, compares literals, collects decoded parameters, and then breaks ties by comparing segment kinds from the left, so '/stations/nearby' beats '/stations/:id' whatever the registration order. It distinguishes 'nothing matches this path' (null, 404) from 'the path matches other methods' (the allowed list, 405 with an Allow header). before() puts policy middleware in front of a route's guards, which lets later lessons attach checks in a single place. The router middleware wires everything: it throws HttpErrors for 404/405, fills req.params and runs the route chain with compose.",
    hints: [
      { id: "h1", title: "Segments", content: "const splitPath = (p) => p.split(\"/\").filter(Boolean). At registration turn each pattern segment into { param: name } when it starts with \":\" and { literal: text } otherwise. Check names for emptiness and duplicates with a Set, and refuse duplicate method+pattern pairs." },
      { id: "h2", title: "match", content: "Loop over the routes: skip those with a different segment count, then for each segment either store params[name] = decodePart(piece) or require equality. Collect hits. No hits -> null. No hit with this method -> { allowed: [...new Set(methods)].sort() }. Otherwise sort the hits so that, at the first segment where kinds differ, the literal one comes first, and take the first." },
      { id: "h3", title: "middleware()", content: "return async function router(req, res) { ... } (a named function expression, so the trace says \"router\"). Throw the HttpErrors for null and allowed; otherwise req.params = found.params; req.route = found.route.pattern; await compose([...found.route.guards, ...found.route.handlers])(req, res)." },
    ],
    tests: [
      {
        id: "t1",
        description: "add: registration rules fail fast",
        assertionCode: T(js`const r = new Router();
assert(r.get("/a", () => {}) === r, "registration returns the router");
assertThrows(() => r.get("/a", () => {}), "Route already registered: GET /a");
r.post("/a", () => {});
assertThrows(() => r.get("no-slash", () => {}), "must start with");
assertThrows(() => r.get("/x/:id/y/:id", () => {}), "parameter", "a repeated parameter name");
assertThrows(() => r.get("/x/:/y", () => {}), "parameter", "an empty parameter name");
assertThrows(() => r.get("/x"), "handler", "at least one handler");
assertThrows(() => r.get("/x", "nope"), "handler");
assertThrows(() => r.add("TRACE", "/x", () => {}), "TypeError");
assertEqual(r.list(), [{ method: "GET", path: "/a" }, { method: "POST", path: "/a" }], "list() shows what was registered, in order");`),
      },
      {
        id: "t2",
        description: "match: parameters and segment counts",
        assertionCode: T(js`const r = new Router();
const h = () => {};
r.get("/stations/:id", h).get("/stations/:id/bikes/:bikeId", h).get("/stations", h);
const m = r.match("GET", "/stations/st-03");
assertEqual(m.params, { id: "st-03" });
assert(m.route.handlers[0] === h, "the match carries the route and its handlers");
assertEqual(r.match("GET", "/stations/st-03/bikes/bk-9").params, { id: "st-03", bikeId: "bk-9" }, "two parameters");
assertEqual(r.match("GET", "/stations/Harbour%20Gate").params, { id: "Harbour Gate" }, "values are decoded");
assertEqual(r.match("GET", "/stations/a%E0%A4%A").params, { id: "a%E0%A4%A" }, "a bad escape does not throw");
assertEqual(r.match("GET", "/stations/st-03/").params, { id: "st-03" }, "a trailing slash is ignored");
assertEqual(r.match("GET", "//stations///st-03").params, { id: "st-03" }, "doubled slashes too");
assertEqual(r.match("GET", "/stations/st-03/bikes"), null, "different segment count: no match");
assertEqual(r.match("GET", "/Stations"), null, "paths are case sensitive");
assert(r.match("GET", "/stations").route.pattern === "/stations");`),
      },
      {
        id: "t3",
        description: "match: literals beat parameters whatever the registration order",
        assertionCode: T(js`for (const order of [0, 1]) {
  const r = new Router();
  const lit = () => "literal";
  const par = () => "param";
  if (order === 0) { r.get("/stations/nearby", lit); r.get("/stations/:id", par); } else { r.get("/stations/:id", par); r.get("/stations/nearby", lit); }
  assert(r.match("GET", "/stations/nearby").route.handlers[0] === lit, "the literal route must win (registered " + (order === 0 ? "first" : "second") + ")");
  assert(r.match("GET", "/stations/st-01").route.handlers[0] === par, "other values fall through to the parameter");
}
const r = new Router();
const a = () => {}, b = () => {};
r.get("/a/:x/c", a); r.get("/a/b/:y", b);
assert(r.match("GET", "/a/b/c").route.handlers[0] === b, "compared left to right: the second segment is a literal in the second route");`),
      },
      {
        id: "t4",
        description: "match: 405 lists the allowed methods, 404 is null",
        assertionCode: T(js`const r = new Router();
const h = () => {};
r.get("/stations/:id", h).patch("/stations/:id", h).delete("/stations/:id", h).get("/stations", h).post("/stations", h);
assertEqual(r.match("PUT", "/stations/st-01"), { allowed: ["DELETE", "GET", "PATCH"] }, "sorted allowed methods");
assertEqual(r.match("DELETE", "/stations"), { allowed: ["GET", "POST"] });
assertEqual(r.match("GET", "/bikes"), null, "unknown path");
assert(r.match("POST", "/stations").route, "a match for the method returns the route");`),
      },
      {
        id: "t5",
        description: "before() attaches guards in front of existing ones",
        assertionCode: T(js`const calls = [];
const mk = (name) => { const f = (req, res, next) => { calls.push(name); return next(); }; return f; };
const r = new Router();
r.post("/x", (req, res) => { calls.push("handler"); res.json({ ok: 1 }); });
assertThrows(() => r.before("POST", "/missing", mk("z")), "no route POST /missing");
r.before("POST", "/x", mk("a"), mk("b"));
r.before("POST", "/x", mk("outer"));
const app2 = new App().mount(r.middleware());
const res = new HttpResponse();
await app2.run(new HttpRequest({ method: "POST", url: "/x" }), res);
assertEqual(calls, ["outer", "a", "b", "handler"], "the newest attachment runs first, then the older ones, then the handler");`),
      },
      {
        id: "t6",
        description: "middleware(): runs the route, sets req.params / req.route, and reports 404 / 405",
        assertionCode: T(js`const r = new Router();
r.get("/stations/:id", function show(req, res) { res.json({ id: req.params.id, route: req.route }); });
const app2 = new App().mount(r.middleware());
const run = async (method, url) => { const res = new HttpResponse(); await app2.run(new HttpRequest({ method, url }), res); return res.toPlain(); };
const ok = await run("GET", "/stations/st-05");
assertEqual(ok.body, { id: "st-05", route: "/stations/:id" });
assertEqual(ok.trace, ["router", "show"], "the trace names the router and the handler");
const missing = await run("GET", "/nope");
assertEqual(missing.status, 404);
const wrong = await run("POST", "/stations/st-05");
assertEqual(wrong.status, 405);
assertEqual(wrong.headers.allow, "GET", "405 must say which methods work");
assert(typeof r.middleware().name === "string" && r.middleware().name === "router", "the middleware function is named router");`),
      },
      {
        id: "t7",
        description: "The real app serves GET /health/live through the router",
        assertionCode: T(js`const live = await handle({ method: "GET", url: "/health/live" });
assertEqual(live.status, 200);
assertEqual(live.body, { status: "ok" });
assertEqual(live.trace, ["securityHeaders", "router", "liveness"]);
const wrong = await handle({ method: "POST", url: "/health/live" });
assertEqual(wrong.status, 405);
assertEqual(wrong.headers.allow, "GET");
const unknown = await handle({ method: "GET", url: "/health/nope" });
assertEqual(unknown.status, 404);
assert(listRoutes().some((x) => x.method === "GET" && x.path === "/health/live"), "listRoutes() reports the route");`),
      },
    ],
    unlocks: ["api-routes"],
    checks: [
      {
        prompt: md`A client sends ¦DELETE /stations¦ but only ¦GET¦ and ¦POST¦ are registered for that path. Which answer is correct?`,
        question: { type: "choice", options: ["404 Not Found", "405 Method Not Allowed with an Allow: GET, POST header", "400 Bad Request", "200 with an empty list"], answer: 1 },
        explanation: md`The path exists, so 404 would send the caller hunting for a typo. 405 plus ¦Allow¦ tells them the URL is right and the verb is wrong.`,
      },
      {
        prompt: md`Two routes match ¦GET /stations/nearby¦: ¦/stations/:id¦ (registered first) and ¦/stations/nearby¦. Which should win, and why?`,
        question: {
          type: "choice",
          options: [
            "/stations/:id, because it was registered first",
            "/stations/nearby, because a literal is more specific than a parameter and registration order must not change behaviour",
            "Whichever has the shorter name",
            "Neither: it is a configuration error",
          ],
          answer: 1,
        },
        explanation: md`Specificity makes routing independent of the order of lines in a file, so reorganising code can never silently change which handler runs.`,
      },
    ],
  },

  // ───────────────────────────────────────── 4. Request ids and structured logs
  {
    id: "js-api-4-logs",
    title: "Request ids and structured logs",
    minutes: 35,
    xp: 170,
    concepts: ["structured logging", "correlation ids", "log levels", "redaction", "timing"],
    learn: md`### Logs are for people at 3 a.m.

When something goes wrong in production, the evidence is the log. A line like ¦Error saving station¦ tells you nothing; you need to know **which request**, **what it asked for**, **what it answered** and **how long it took**. Two habits make that possible.

### 1. Every request gets an id

A **correlation id** (request id) is a short unique string attached to a request at the door, written into every log line about it, and echoed to the caller in an ¦x-request-id¦ header. When a rider reports "my unlock failed at 18:02", support asks for the id and finds every line, across every layer, for exactly that request.

Callers (or a gateway in front of you) may already have an id and send it in. Accepting it is useful: the id then follows the request across several services. But it is **untrusted input** written straight into your logs. Accept it only when it matches a strict pattern (letters, digits, ¦-¦ and ¦_¦, 8 to 64 characters); otherwise make your own. Otherwise a caller can plant a line break and forge fake log entries.

### 2. Logs are data, not sentences

A **structured** log entry is one JSON object per event, not a formatted string:

~~~js
{ time: "2026-01-15T18:02:11.412Z", level: "info", msg: "request completed", reqId: "req-000042", method: "GET", path: "/stations", status: 200, ms: 14 }
~~~

Machines can filter by ¦status >= 500¦, group by ¦path¦ or chart ¦ms¦ without regular expressions. The logger has **levels** (debug, info, warn, error) with a threshold so debug noise can be switched off, and **child loggers** that carry fixed fields: ¦log.child({ reqId })¦ stamps the id on everything it writes without anyone passing it around.

### Never log secrets

Entries get copied to log stores, dashboards and tickets. The logger **redacts** sensitive keys (authorization headers, tokens, passwords, PINs) wherever they appear in the fields you pass, including inside nested objects. Do it in the logger itself, centrally, because "remember to remove it" fails the day someone adds a field.

### One access-log line per request

The access log is a middleware placed near the top. It lets the request run (¦await next()¦), then writes one entry with the method, path, status and duration. Since your pipeline converts errors into responses where they are thrown, this single place sees the real final status of every request, including failures. Pick the level from the status: 5xx is an ¦error¦, 4xx a ¦warn¦, the rest ¦info¦. It also sets an ¦x-response-time¦ header, which the control room uses to draw latency.

Time comes from ¦Date.now()¦. Use the same clock everywhere; tests that fast-forward time then see sensible durations.

### Common mistakes

- Logging with string concatenation, so nothing can be queried.
- Logging whole request bodies (personal data, passwords).
- An unbounded log array in memory. Keep a ring buffer; ship logs elsewhere in real life.
- A request id that is guessable and trusted for security. It is for correlation only.`,
    mission: md`Last night a rider was charged for a rental that never started, and nobody could say which request did it. Operations wants every request traceable: an id on the way in, one structured line on the way out, secrets never visible.

Build the logger, the id middleware and the access log. The control room's log panel streams your entries and charts the response times you measure.`,
    tasks: [
      "redact(value): deep copy with sensitive keys replaced by \"[redacted]\"",
      "class Logger: levels with a threshold, child(bindings), entries pushed to a sink; recentLogs(n) reads the ring buffer",
      "requestId middleware: accept a safe incoming x-request-id or generate req-000001 style ids; sets req.id, req.log and the response header",
      "accessLog middleware: one entry per request with method, path, status and ms; sets x-response-time; wire both in front of securityHeaders",
    ],
    starterAdd: js`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 4: request ids and structured logs.

const LOG_LIMIT = 200;
const logBuffer = [];
// given: the default sink keeps the newest LOG_LIMIT entries (a ring buffer)
function bufferSink(entry) {
  logBuffer.push(entry);
  if (logBuffer.length > LOG_LIMIT) logBuffer.shift();
}

// The control room reads this: the newest n entries, oldest first.
function recentLogs(n = 20) {
  // TODO
}

const SENSITIVE_KEYS = ["authorization", "password", "pin", "token", "secret", "cookie"];

// Return a deep copy of value where any object key (case-insensitive) in SENSITIVE_KEYS has the value "[redacted]".
// Arrays and nested objects are walked; primitives are returned as they are. Never change the input.
function redact(value) {
  // TODO
}

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };

class Logger {
  // options: { level: "info", bindings: {}, sink: bufferSink }
  constructor(options = {}) {
    // TODO
  }

  // A logger that adds extra fixed fields to every entry (and shares this logger's level and sink).
  child(bindings) {
    // TODO
  }

  // log.info("request completed", { status: 200 }) writes, if the level is at or above the threshold:
  //   { time: new Date().toISOString(), level, msg, ...bindings, ...redact(fields) }
  // Provide debug, info, warn and error.
  debug(msg, fields) { /* TODO */ }
  info(msg, fields) { /* TODO */ }
  warn(msg, fields) { /* TODO */ }
  error(msg, fields) { /* TODO */ }
}

const log = new Logger({ bindings: { service: "dockline" } });

// Give every request an id. Accept an incoming x-request-id only if it matches /^[A-Za-z0-9_-]{8,64}$/,
// otherwise generate "req-" + a 6-digit counter ("req-000001", "req-000002", ...).
// Set req.id, req.log = log.child({ reqId }) and the response header x-request-id.
let requestCounter = 0;
function requestId(req, res, next) {
  // TODO
}

// One structured line per finished request, after the rest of the chain ran:
//   message "request completed", fields { method, path, status, ms }; ms = Date.now() - req.startedAt
//   level: error for status >= 500, warn for >= 400, otherwise info. Also set the response header x-response-time to "<ms>ms".
async function accessLog(req, res, next) {
  // TODO
}

// TODO: register both in front of securityHeaders, in this order: requestId, then accessLog.
//   app.use(requestId, { before: "securityHeaders" });
//   app.use(accessLog, { before: "securityHeaders" });
`,
    solutionAdd: js`const LOG_LIMIT = 200;
const logBuffer = [];
function bufferSink(entry) {
  logBuffer.push(entry);
  if (logBuffer.length > LOG_LIMIT) logBuffer.shift();
}

function recentLogs(n = 20) {
  return logBuffer.slice(-n);
}

const SENSITIVE_KEYS = ["authorization", "password", "pin", "token", "secret", "cookie"];

function redact(value) {
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === "object") {
    const out = {};
    for (const [key, inner] of Object.entries(value)) out[key] = SENSITIVE_KEYS.includes(key.toLowerCase()) ? "[redacted]" : redact(inner);
    return out;
  }
  return value;
}

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };

class Logger {
  #level;
  #bindings;
  #sink;

  constructor(options = {}) {
    this.#level = options.level ?? "info";
    this.#bindings = options.bindings ?? {};
    this.#sink = options.sink ?? bufferSink;
  }

  child(bindings) {
    return new Logger({ level: this.#level, bindings: { ...this.#bindings, ...bindings }, sink: this.#sink });
  }

  #write(level, msg, fields) {
    if (LEVELS[level] < LEVELS[this.#level]) return;
    this.#sink({ time: new Date().toISOString(), level, msg, ...this.#bindings, ...redact(fields ?? {}) });
  }

  debug(msg, fields) { this.#write("debug", msg, fields); }
  info(msg, fields) { this.#write("info", msg, fields); }
  warn(msg, fields) { this.#write("warn", msg, fields); }
  error(msg, fields) { this.#write("error", msg, fields); }
}

const log = new Logger({ bindings: { service: "dockline" } });

let requestCounter = 0;
function requestId(req, res, next) {
  const incoming = req.header("x-request-id");
  req.id = incoming && /^[A-Za-z0-9_-]{8,64}$/.test(incoming) ? incoming : ¦req-\${String(++requestCounter).padStart(6, "0")}¦;
  req.log = log.child({ reqId: req.id });
  res.set("x-request-id", req.id);
  return next();
}

async function accessLog(req, res, next) {
  await next();
  const ms = Date.now() - req.startedAt;
  res.set("x-response-time", ¦\${ms}ms¦);
  const level = res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "info";
  req.log[level]("request completed", { method: req.method, path: req.path, status: res.statusCode, ms });
}

app.use(requestId, { before: "securityHeaders" });
app.use(accessLog, { before: "securityHeaders" });`,
    explanation:
      "redact walks arrays and objects building a copy, replacing the value of any sensitive key. Logger keeps its level, fixed bindings and sink privately; child() makes a new logger with merged bindings and the same sink; every write checks the threshold, builds the entry from time, level, message, bindings and redacted fields and hands it to the sink. requestId trusts an incoming id only when it matches a strict pattern, and otherwise numbers requests. accessLog awaits the rest of the chain, so the status it logs is the final one, then measures the duration with the same Date.now clock and writes one line at a level that depends on the status.",
    hints: [
      { id: "h1", title: "redact", content: "if (Array.isArray(value)) return value.map(redact); if (value && typeof value === \"object\") { const out = {}; for (const [k, v] of Object.entries(value)) out[k] = SENSITIVE_KEYS.includes(k.toLowerCase()) ? \"[redacted]\" : redact(v); return out; } return value;" },
      { id: "h2", title: "Logger", content: "Store #level, #bindings, #sink from the options. A private #write(level, msg, fields) returns early when LEVELS[level] < LEVELS[this.#level], otherwise calls this.#sink({ time: new Date().toISOString(), level, msg, ...this.#bindings, ...redact(fields ?? {}) }). child() returns new Logger({ level, bindings: { ...this.#bindings, ...bindings }, sink }). recentLogs(n) is logBuffer.slice(-n)." },
      { id: "h3", title: "The middleware", content: "requestId: const incoming = req.header(\"x-request-id\"); use it if it exists and /^[A-Za-z0-9_-]{8,64}$/.test(incoming), else \"req-\" + String(++requestCounter).padStart(6, \"0\"). accessLog: await next() first, then compute ms, set the header and call req.log[level](\"request completed\", { method, path, status, ms }) with the level chosen from res.statusCode." },
    ],
    tests: [
      {
        id: "t1",
        description: "redact hides secrets everywhere without touching the input",
        assertionCode: T(js`const input = { user: "ana", Authorization: "Bearer abc", nested: { PIN: "4821", list: [{ token: "t" }, 5, "x"] }, ok: [1, 2] };
const copy = JSON.stringify(input);
const out = redact(input);
assertEqual(out, { user: "ana", Authorization: "[redacted]", nested: { PIN: "[redacted]", list: [{ token: "[redacted]" }, 5, "x"] }, ok: [1, 2] });
assertEqual(JSON.stringify(input), copy, "the original must stay unchanged");
assertEqual(redact("plain"), "plain");
assertEqual(redact(null), null);
assertEqual(redact(7), 7);`),
      },
      {
        id: "t2",
        description: "Logger: levels, bindings, child loggers and time",
        assertionCode: T(js`const lines = [];
const base = new Logger({ level: "warn", bindings: { service: "x" }, sink: (e) => lines.push(e) });
base.debug("no"); base.info("no");
assertEqual(lines.length, 0, "below the threshold nothing is written");
base.warn("careful", { code: 7, password: "p" });
assertEqual(lines.length, 1);
const e = lines[0];
assertEqual([e.level, e.msg, e.service, e.code, e.password], ["warn", "careful", "x", 7, "[redacted]"], "fields are merged and redacted");
assert(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(e.time), "time is an ISO timestamp: " + e.time);
const kid = base.child({ reqId: "r1" });
kid.error("boom");
assertEqual([lines[1].reqId, lines[1].service, lines[1].level], ["r1", "x", "error"], "children keep the parent's bindings and add their own");
kid.info("filtered");
assertEqual(lines.length, 2, "children share the threshold");
const chatty = new Logger({ level: "debug", sink: (x) => lines.push(x) });
chatty.debug("now it shows");
assertEqual(lines.at(-1).msg, "now it shows");`),
      },
      {
        id: "t3",
        description: "The default sink is a bounded ring buffer read by recentLogs",
        assertionCode: T(js`logBuffer.length = 0;
for (let i = 0; i < LOG_LIMIT + 20; i++) log.info("tick", { i });
assertEqual(logBuffer.length, LOG_LIMIT, "only the newest entries are kept");
assertEqual(recentLogs(2).map((x) => x.i), [LOG_LIMIT + 18, LOG_LIMIT + 19], "newest last");
assertEqual(recentLogs(500).length, LOG_LIMIT);
assertEqual(recentLogs()[0].service, "dockline", "the shared logger carries the service name");
logBuffer.length = 0;`),
      },
      {
        id: "t4",
        description: "requestId: generate, accept safe ids, reject unsafe ones",
        assertionCode: T(js`const run = async (headers) => { const req = new HttpRequest({ url: "/", headers }); const res = new HttpResponse(); let called = false; await requestId(req, res, async () => { called = true; }); return { req, res, called }; };
const a = await run({});
const b = await run({});
assert(/^req-\d{6}$/.test(a.req.id), "generated ids look like req-000001: " + a.req.id);
assert(a.req.id !== b.req.id, "every request gets a new id");
assertEqual(Number(b.req.id.slice(4)), Number(a.req.id.slice(4)) + 1, "ids count up");
assertEqual(a.res.get("x-request-id"), a.req.id, "the id is echoed to the caller");
assertEqual(a.called, true, "it hands on to the next middleware");
assert(typeof a.req.log.info === "function", "req.log is a child logger");
const kept = await run({ "X-Request-ID": "gateway-7f3a9c21" });
assertEqual(kept.req.id, "gateway-7f3a9c21", "a well-formed incoming id is kept");
for (const bad of ["short", "has space in it", "x".repeat(65), "evil\nid-1234567", "<script>alert(1)</script>"]) {
  const r = await run({ "x-request-id": bad });
  assert(/^req-\d{6}$/.test(r.req.id), "unsafe incoming id " + JSON.stringify(bad) + " must be replaced, got " + r.req.id);
}`),
      },
      {
        id: "t5",
        description: "accessLog: one entry per request with final status and duration",
        assertionCode: T(js`const entries = [];
const probe = new Logger({ sink: (e) => entries.push(e) });
const mkReq = () => { const req = new HttpRequest({ method: "GET", url: "/stations?x=1" }); req.log = probe; return req; };
const res = new HttpResponse();
const req = mkReq();
await accessLog(req, res, async () => { await new Promise((r) => setTimeout(r, 40)); res.status(201).json({}); });
assertEqual(entries.length, 1, "exactly one line");
const e = entries[0];
assertEqual([e.msg, e.level, e.method, e.path, e.status], ["request completed", "info", "GET", "/stations", 201]);
assert(e.ms >= 40 && e.ms < 100, "ms measures the time the rest of the chain took, got " + e.ms);
assertEqual(res.get("x-response-time"), e.ms + "ms");
const r404 = new HttpResponse(); await accessLog(mkReq(), r404, async () => { r404.status(404).json({}); });
const r500 = new HttpResponse(); await accessLog(mkReq(), r500, async () => { r500.status(503).json({}); });
assertEqual(entries.slice(1).map((x) => [x.status, x.level]), [[404, "warn"], [503, "error"]], "level depends on the status");`),
      },
      {
        id: "t6",
        description: "The real app: ids, response times and access-log lines",
        assertionCode: T(js`logBuffer.length = 0;
assertEqual(listMiddleware(), ["requestId", "accessLog", "securityHeaders"], "ids first, then the access log, then security headers");
const ok = await handle({ method: "GET", url: "/health/live?probe=1", headers: { "x-request-id": "probe-abcdef12" } });
assertEqual(ok.headers["x-request-id"], "probe-abcdef12");
assert(/^\d+ms$/.test(ok.headers["x-response-time"]), "x-response-time looks like 12ms: " + ok.headers["x-response-time"]);
assertEqual(ok.trace, ["requestId", "accessLog", "securityHeaders", "router", "liveness"]);
const miss = await handle({ method: "GET", url: "/missing" });
assertEqual(miss.status, 404);
assert(/^req-\d{6}$/.test(miss.headers["x-request-id"]), "an error response has an id too");
const lines = recentLogs(5);
assertEqual(lines.length, 2, "one line per request");
assertEqual([lines[0].reqId, lines[0].status, lines[0].level], ["probe-abcdef12", 200, "info"]);
assertEqual([lines[1].reqId, lines[1].status, lines[1].level, lines[1].path], [miss.headers["x-request-id"], 404, "warn", "/missing"], "the failure is logged with its final status");
logBuffer.length = 0;`),
      },
    ],
    unlocks: ["api-logs"],
    checks: [
      {
        prompt: md`A caller sends ¦x-request-id: abc¿\ndef¦ style garbage with a line break in it. Why do we replace ids that fail the pattern rather than logging them?`,
        question: {
          type: "choice",
          options: [
            "Logs cannot store letters",
            "An untrusted value written into logs can forge extra log lines or inject markup into dashboards",
            "Request ids must be numbers",
            "It makes requests faster",
          ],
          answer: 1,
        },
        explanation: md`Anything a caller controls and you write into a log or page is an injection vector. A strict allow-list pattern is the simplest defence.`,
      },
      {
        prompt: md`Why does the access log sit near the top of the pipeline and write after ¦await next()¦?`,
        question: {
          type: "choice",
          options: [
            "So it can see the final status and duration of everything inside it, including errors converted to responses",
            "Because logging must happen before the router for speed",
            "Because middleware after next() are skipped for errors",
            "Because Date.now() only works after next()",
          ],
          answer: 0,
        },
        explanation: md`The onion lets the outermost layers measure the whole request. Written at the top, one line per request is guaranteed and it reflects what the caller really got.`,
      },
    ],
  },
];
