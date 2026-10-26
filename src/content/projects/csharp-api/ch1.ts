import type { Chapter } from "@/engine/types";
import { TYPES_DIVIDER } from "../../../engine/compose.ts";
import { cs, js, md } from "./util.ts";

/**
 * Chapter 1: Requests, routes and pipelines. Model an HTTP exchange, route it by template, and wrap it in a middleware pipeline built from delegates.
 */

export const chapter1: Chapter = {
  id: "requests-and-pipelines",
  title: "Requests, routes and pipelines",
  blurb: "Model an HTTP exchange, route it by template, and wrap it in a middleware pipeline built from delegates.",
  lessons: [
    // ───────────────────────── 1 ─────────────────────────
    {
      id: "csharp-api-1-messages",
      title: "Requests, responses and the context",
      minutes: 35,
      xp: 170,
      concepts: ["HTTP messages", "status codes", "case-insensitive headers", "query strings", "URL decoding", "HttpContext", "System.Text.Json options"],
      learn: md`### A web API is a function from text to text

Strip away every framework and a web API is one idea: a **request** arrives as text, your code runs, and a **response** leaves as text. Everything you will build in this course (routing, middleware, dependency injection, authentication) is plumbing around that one exchange, so it pays to model the exchange properly before anything else.

A request has three parts:

~~~text
POST /bookings?notify=email HTTP/1.1        <- request line: method, target, protocol
Content-Type: application/json              <- headers: name/value metadata
Authorization: Bearer eyJ...

{"slotId":12,"climbers":2}                  <- body: optional payload
~~~

The **target** is a path plus an optional **query string**. The **method** says what the caller wants to do. Two properties of methods matter in production: whether a method is *safe* (it must not change anything: \`GET\`, \`HEAD\`) and whether it is *idempotent* (doing it twice has the same effect as doing it once: \`GET\`, \`PUT\`, \`DELETE\`, but **not** \`POST\`). Clients, proxies and load balancers retry idempotent requests automatically, so a \`GET\` that books a climbing slot is a bug waiting for a retry storm.

A response has a **status code**, headers and a body. The first digit is the contract: \`2xx\` worked, \`3xx\` look elsewhere (or "not modified"), \`4xx\` the caller got something wrong, \`5xx\` we did. Choosing the right class matters because monitoring, caches and retry logic all key off it.

### The recorded traffic

Crux Climbing runs three climbing gyms and sells session slots online. The platform team recorded a day of requests, and your program will replay them through everything you build. Each line of the recording looks like this:

~~~text
75 POST /bookings?x=1 | Content-Type: application/json | {"slotId":12,"climbers":2}
^  ^    ^                ^ headers (separated by "; ")      ^ body (starts with a brace)
|  |    target (path + query string)
|  method
arrival time in milliseconds
~~~

\`Capture.Section("smoke")\` hands you the raw lines of one labelled section. Turning a line into a typed \`Request\` is your first job, and it is a good one, because every mistake here is a mistake the whole platform inherits.

### Details that bite

- **Header names are case-insensitive.** \`X-Request-Id\`, \`x-request-id\` and \`X-REQUEST-ID\` are the same header. A plain \`Dictionary<string, string>\` is case-sensitive, so build it with \`StringComparer.OrdinalIgnoreCase\`. Forgetting this is the classic "works with curl, fails behind the proxy" bug: proxies are free to change the case of header names.
- **Split the target once.** The path ends at the *first* \`?\`. Use \`Split('?', 2)\` so a stray \`?\` inside a value cannot confuse you. Split each pair at the first \`=\` for the same reason.
- **Decode after splitting.** Percent-escapes such as \`%20\` and, in query strings, \`+\` mean a space. Decode each key and value *after* you have split on \`&\` and \`=\`, never before, or an encoded \`&\` (\`%26\`) inside a value would break the pair in two. \`Uri.UnescapeDataString\` decodes percent-escapes; replace \`+\` with a space first.
- **The method is case-sensitive on the wire** but forgiving input is friendlier: normalise with \`ToUpperInvariant()\`.

### One context per request

Later lessons need somewhere to hang per-request facts: the matched route, the signed-in user, a correlation id. Rather than passing a growing list of parameters everywhere, frameworks bundle them into one object created per request. We call ours \`HttpContext\`:

~~~csharp
class HttpContext(Request request)
{
    public Request Request { get; set; } = request;
    public Response Response { get; set; } = new();
    public Dictionary<string, object> Items { get; } = new();   // anything else, keyed by name
}
~~~

\`Request\` is a **record**: once parsed it should not change, and \`request with { Path = "/other" }\` makes a modified copy when a router needs one. \`Response\` is a mutable **class** because many layers will write to it (a status here, a header there). That asymmetry is deliberate: *inputs are values, outputs are accumulated*.

### Writing JSON

\`System.Text.Json\` is the built-in serializer. Two habits to start with: create **one** \`JsonSerializerOptions\` and reuse it (each new instance builds its own metadata cache, which is slow), and start from \`JsonSerializerDefaults.Web\`, which gives \`camelCase\` names and case-insensitive reading, the conventions JavaScript clients expect. Add a \`JsonStringEnumConverter\` so enums travel as readable names instead of numbers.

### Common mistakes

- Splitting on \`':'\` to read a header and breaking values that contain colons (a date or a URL). Split at the first \`": "\` only.
- Decoding the whole target first, then splitting.
- Using \`Headers["x"]\` and letting a missing header throw. Return \`null\` from a lookup helper and let callers decide.
- Letting one parse helper both read and write state. Keep \`Parse\` a pure function from text to \`Request\`.`,
      mission: md`Welcome to the platform team at **Crux Climbing**: three gyms, a few hundred climbers a day, and a booking site that has outgrown the quick script it started as. The team is rebuilding the HTTP layer by hand, piece by piece, so that everyone understands every part of it.

You will build it as one growing C# program. Every lesson you pass switches on a new part of the **operations console** beside your editor: requests flowing through middleware lanes, a route table, a dependency graph, rate-limit buckets, health lights and a request-day report.

First, the raw material. The platform team has recorded a short smoke test. Parse it into real \`Request\` objects and write your first \`Response\`. When this lesson passes, the **Console** and the **Request log** come alive.`,
      tasks: [
        "Write the Request record: Header(name) looks a header up ignoring case (null when missing) and Parse(line) builds a Request from one recorded line, with a decoded query dictionary and case-insensitive header dictionary",
        "Write Response (Status 200 by default, case-insensitive Headers, Body, WriteJson(status, value) setting Content-Type: application/json), HttpContext (Request, Response, Items) and a shared Json.Options (Web defaults, string enums)",
        "Parse every line of Capture.Section(\"smoke\"), print one summary line each and send the list with Board.Show(\"requests\", ...)",
        "Write a ping Response with WriteJson(200, new { status = \"ok\", service = \"crux-api\" }) and send it with Board.Show(\"response\", ...), adding lookup: the value of the second request's X-Request-Id found with a lower-case name",
      ],
      starterAdd: cs`using System.Reflection;
using System.Buffers.Text;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;

// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 1. Parse the recorded traffic and write a response.
//  1. Capture.Section("smoke") gives the raw lines. Parse each one with Request.Parse, print
//     "<At> ms  <Method> <Path>  (query n, headers n)", then Board.Show("requests", theList).
//  2. Build a Response, WriteJson(200, new { status = "ok", service = "crux-api" }) into it, print it and
//     Board.Show("response", new { pong.Status, pong.Headers, pong.Body, lookup = <the X-Request-Id of request 2, looked up in lower case> }).
Console.WriteLine("TODO: parse the smoke section here");

${TYPES_DIVIDER}

// ─── ✏️ YOUR TURN ─── the types. Request: Header(name) ignores case, Parse(line) splits "<at> <METHOD> <target> | headers | body".
record Request(int At, string Method, string Path, Dictionary<string, string> Query, Dictionary<string, string> Headers, string Body)
{
    public string Header(string name) => throw new NotImplementedException();
    public static Request Parse(string line) => throw new NotImplementedException();
}

// Response: Status (200), Headers (case-insensitive), Body, WriteJson(status, value). HttpContext: Request, Response, Items.
class Response { }
class HttpContext { }
static class Json { }

// Provided by pockett: Board.Show sends a value to the live console beside your editor, and
// Capture loads the recorded traffic your program replays. Leave both as they are.
static class Board
{
    static readonly JsonSerializerOptions Options = new(JsonSerializerDefaults.Web) { Converters = { new JsonStringEnumConverter() }, Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping };
    public static void Show(string key, object value) => Console.WriteLine("@scene " + JsonSerializer.Serialize(new Dictionary<string, object> { [key] = value }, Options));
}

static class Capture
{
    static readonly Dictionary<string, List<string>> sections = Read();
    public static List<string> Section(string name) => sections.GetValueOrDefault(name) ?? new();

    static Dictionary<string, List<string>> Read()
    {
        var result = new Dictionary<string, List<string>>();
        List<string> current = null;
        for (var line = Console.In.ReadLine(); line != null; line = Console.In.ReadLine())
            if (line.StartsWith("## ")) result[line[3..].Trim()] = current = new();
            else if (line.Trim().Length > 0) current?.Add(line);
        return result;
    }
}`,
      solutionAdd: cs`using System.Reflection;
using System.Buffers.Text;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;

// 1. requests and responses
var smoke = Capture.Section("smoke").Select(Request.Parse).ToList();
foreach (var r in smoke) Console.WriteLine($"{r.At,4} ms  {r.Method,-6} {r.Path}  (query {r.Query.Count}, headers {r.Headers.Count})");
var pong = new Response();
pong.WriteJson(200, new { status = "ok", service = "crux-api" });
Console.WriteLine($"{pong.Status} {pong.Body}");
Board.Show("requests", smoke);
Board.Show("response", new { pong.Status, pong.Headers, pong.Body, lookup = smoke[1].Header("x-request-id") });

${TYPES_DIVIDER}
record Request(int At, string Method, string Path, Dictionary<string, string> Query, Dictionary<string, string> Headers, string Body)
{
    public string Header(string name) => Headers.GetValueOrDefault(name);

    public static Request Parse(string line)
    {
        var parts = line.Split(" | ");
        var head = parts[0].Split(' ', 3);
        var target = head[2].Split('?', 2);
        var (query, headers, body) = (new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase), new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase), "");
        foreach (var pair in target.Length > 1 ? target[1].Split('&') : [])
        {
            var kv = pair.Split('=', 2);
            query[Decode(kv[0])] = kv.Length > 1 ? Decode(kv[1]) : "";
        }
        foreach (var part in parts.Skip(1))
            if (part.StartsWith('{')) body = part;
            else foreach (var h in part.Split("; ")) headers[h.Split(": ")[0]] = h.Split(": ", 2)[1];
        return new Request(int.Parse(head[0]), head[1].ToUpperInvariant(), target[0], query, headers, body);
    }

    static string Decode(string s) => Uri.UnescapeDataString(s.Replace('+', ' '));
}

class Response
{
    public int Status { get; set; } = 200;
    public Dictionary<string, string> Headers { get; } = new(StringComparer.OrdinalIgnoreCase);
    public string Body { get; set; } = "";

    public void WriteJson(int status, object value)
    {
        Status = status;
        Headers["Content-Type"] = "application/json";
        Body = JsonSerializer.Serialize(value, Json.Options);
    }
}

class HttpContext(Request request)
{
    public Request Request { get; set; } = request;
    public Response Response { get; set; } = new();
    public Dictionary<string, object> Items { get; } = new();
}

static class Json
{
    public static readonly JsonSerializerOptions Options = new(JsonSerializerDefaults.Web) { Converters = { new JsonStringEnumConverter() } };
}

// Provided by pockett: Board.Show sends a value to the live console beside your editor, and
// Capture loads the recorded traffic your program replays. Leave both as they are.
static class Board
{
    static readonly JsonSerializerOptions Options = new(JsonSerializerDefaults.Web) { Converters = { new JsonStringEnumConverter() }, Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping };
    public static void Show(string key, object value) => Console.WriteLine("@scene " + JsonSerializer.Serialize(new Dictionary<string, object> { [key] = value }, Options));
}

static class Capture
{
    static readonly Dictionary<string, List<string>> sections = Read();
    public static List<string> Section(string name) => sections.GetValueOrDefault(name) ?? new();

    static Dictionary<string, List<string>> Read()
    {
        var result = new Dictionary<string, List<string>>();
        List<string> current = null;
        for (var line = Console.In.ReadLine(); line != null; line = Console.In.ReadLine())
            if (line.StartsWith("## ")) result[line[3..].Trim()] = current = new();
            else if (line.Trim().Length > 0) current?.Add(line);
        return result;
    }
}`,
      explanation:
        "Request.Parse splits the line on \" | \", reads the arrival time, method and target from the first part, and splits the target at the first '?'. Each query pair is split at the first '=' and both halves are URL-decoded afterwards (with '+' turned into a space), so an encoded '&' inside a value cannot break a pair. Headers and the query go into dictionaries built with StringComparer.OrdinalIgnoreCase, which is why the lower-case lookup of X-Request-Id works. A part that starts with a brace is the body. Response.WriteJson serializes with one shared options object (Web defaults: camelCase) and sets the status and Content-Type together, so a status and the body that matches it can never drift apart.",
      hints: [
        { id: "h1", title: "Splitting the line", content: "var parts = line.Split(\" | \"); var head = parts[0].Split(' ', 3); // [at, method, target]. Then var target = head[2].Split('?', 2); target[0] is the path and target[1], when present, is the query string. Every later part is either a body (starts with '{') or a header list separated by \"; \"." },
        { id: "h2", title: "Case-insensitive dictionaries and decoding", content: "new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase) makes Headers[\"x-request-id\"] and Headers[\"X-Request-Id\"] the same entry. For each query pair: var kv = pair.Split('=', 2); store Decode(kv[0]) -> Decode(kv[1]) where Decode is Uri.UnescapeDataString(s.Replace('+', ' '))." },
        { id: "h3", title: "Response and the shared options", content: "public static readonly JsonSerializerOptions Options = new(JsonSerializerDefaults.Web) { Converters = { new JsonStringEnumConverter() } }; then WriteJson sets Status, Headers[\"Content-Type\"] = \"application/json\" and Body = JsonSerializer.Serialize(value, Json.Options). Header(name) is Headers.GetValueOrDefault(name)." },
      ],
      tests: [
        {
          id: "t1",
          description: "all five recorded requests are parsed with the right method and path",
          assertionCode: js`
assert(Array.isArray(scene.requests) && scene.requests.length >= 5, "Send the parsed requests first: Board.Show(\"requests\", list).");
assert(scene.response, "Send the response with Board.Show(\"response\", ...).");
assert(Array.isArray(scene.requests), "Send the parsed list with Board.Show(\"requests\", list).");
assertEqual(scene.requests.length, 5, "number of requests in the smoke section");
assertEqual(scene.requests.map((r) => r.method), ["GET", "GET", "POST", "GET", "GET"], "methods");
assertEqual(scene.requests.map((r) => r.path), ["/gyms/2", "/gyms/2/slots", "/bookings", "/slots/12", "/gyms/2/slots"], "paths (the query string is not part of the path)");`,
        },
        {
          id: "t2",
          description: "the query string becomes a dictionary",
          assertionCode: js`
assert(Array.isArray(scene.requests) && scene.requests.length >= 5, "Send the parsed requests first: Board.Show(\"requests\", list).");
assert(scene.response, "Send the response with Board.Show(\"response\", ...).");
const q = scene.requests[1].query;
assertEqual(q.day, "2031-06-14", "query value for day");
assertEqual(q.level, "beginner", "query value for level");
assertEqual(Object.keys(scene.requests[0].query).length, 0, "a request without a query string has an empty dictionary");`,
        },
        {
          id: "t3",
          description: "query keys and values are URL-decoded",
          assertionCode: js`
assert(Array.isArray(scene.requests) && scene.requests.length >= 5, "Send the parsed requests first: Board.Show(\"requests\", list).");
assert(scene.response, "Send the response with Board.Show(\"response\", ...).");
const q = scene.requests[4].query;
assertEqual(q.day, "Sat 14", "%20 must decode to a space");
assertEqual(q.note, "a b", "+ must decode to a space inside a query string");`,
        },
        {
          id: "t4",
          description: "headers are parsed and the lookup ignores case",
          assertionCode: js`
assert(Array.isArray(scene.requests) && scene.requests.length >= 5, "Send the parsed requests first: Board.Show(\"requests\", list).");
assert(scene.response, "Send the response with Board.Show(\"response\", ...).");
const h = scene.requests[1].headers;
assertEqual(Object.keys(h).length, 2, "request 2 carries two headers");
assert(Object.values(h).includes("r-17"), "the X-Request-Id value r-17 must be in the headers");
assertEqual(scene.response.lookup, "r-17", "Header(\"x-request-id\") must find X-Request-Id (case-insensitive lookup)");`,
        },
        {
          id: "t5",
          description: "the body of a POST is kept as text",
          assertionCode: js`
assert(Array.isArray(scene.requests) && scene.requests.length >= 5, "Send the parsed requests first: Board.Show(\"requests\", list).");
assert(scene.response, "Send the response with Board.Show(\"response\", ...).");
const body = JSON.parse(scene.requests[2].body);
assertEqual(body, { slotId: 12, climbers: 2 }, "body of the POST");
assertEqual(scene.requests[0].body, "", "a GET without a body has an empty body");`,
        },
        {
          id: "t6",
          description: "a Response writes JSON with the matching content type",
          assertionCode: js`
assert(Array.isArray(scene.requests) && scene.requests.length >= 5, "Send the parsed requests first: Board.Show(\"requests\", list).");
assert(scene.response, "Send the response with Board.Show(\"response\", ...).");
assertEqual(scene.response.status, 200, "status");
assertEqual(scene.response.headers["Content-Type"], "application/json", "Content-Type header");
assertEqual(JSON.parse(scene.response.body), { status: "ok", service: "crux-api" }, "body");`,
        },
        {
          id: "t7",
          description: "each request is also printed as a summary line",
          assertionCode: js`
assert(Array.isArray(scene.requests) && scene.requests.length >= 5, "Send the parsed requests first: Board.Show(\"requests\", list).");
assert(scene.response, "Send the response with Board.Show(\"response\", ...).");
assert(lines.some((l) => /^\s*40 ms\s+GET\s+\/gyms\/2\/slots\s+\(query 2, headers 2\)/.test(l)), "Print one line per request such as: 40 ms  GET    /gyms/2/slots  (query 2, headers 2)");
assertEqual(lines.filter((l) => /\(query \d+, headers \d+\)/.test(l)).length, 5, "one summary line per request");`,
        },
      ],
      unlocks: ["ca-console", "ca-requests"],
      checks: [
        {
          prompt: "Why is `Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)` the right container for headers?",
          question: {
            type: "choice",
            options: [
              "Header names are case-insensitive, and proxies may change their case",
              "It makes lookups faster than the default comparer",
              "It sorts the headers alphabetically",
              "It stops duplicate header values",
            ],
            answer: 0,
          },
          explanation: "`X-Request-Id` and `x-request-id` name the same header, and intermediaries are allowed to re-case names. A default dictionary compares ordinally and would treat them as different keys.",
        },
        {
          prompt: "A client sends `GET /gyms?city=Bristol%26Bath`. Which order gives the correct city value?",
          question: {
            type: "choice",
            options: [
              "Split on `&` and `=` first, then URL-decode each piece",
              "URL-decode the whole target first, then split on `&` and `=`",
              "Either order gives the same result",
              "Decode only the key, never the value",
            ],
            answer: 0,
          },
          explanation: "`%26` is an encoded ampersand that belongs to the value. Decoding first would turn it into a real `&` and split `Bristol&Bath` into two pairs. Always split on the structural characters, then decode the pieces.",
        },
        {
          prompt: "Which of these methods is NOT idempotent, so a client must not retry it blindly?",
          question: { type: "choice", options: ["GET", "PUT", "DELETE", "POST"], answer: 3 },
          explanation: "Repeating a `POST` usually repeats its effect (a second booking). `GET`, `PUT` and `DELETE` are defined so that doing them twice leaves the same final state. Lesson 10 makes `POST` safe to retry with idempotency keys.",
        },
      ],
    },
    // ───────────────────────── 2 ─────────────────────────
    {
      id: "csharp-api-2-routing",
      title: "Routing: templates and constraints",
      minutes: 40,
      xp: 190,
      concepts: ["route templates", "route parameters", "constraints", "specificity", "404 vs 405", "Allow header", "endpoint metadata"],
      learn: md`### Routing is a lookup with opinions

A router turns \`(method, path)\` into "run this handler with these values". The interesting part is not the lookup, it is the *opinions* a router holds about ambiguous cases. Get those opinions wrong and the symptoms are strange: the wrong handler runs, a valid URL is a 404, an invalid one reaches your code.

A **route template** mixes two kinds of segment:

~~~text
/gyms/{id:int}/slots
  |      |        |
literal  parameter literal
         with a constraint
~~~

- A **literal** segment must match exactly (we compare ignoring case, because URLs are mostly typed or generated by tools and \`/Gyms/3\` should not be a different resource).
- A **parameter** \`{name}\` matches any one non-empty segment and records its text under \`name\`.
- A **constraint** \`{name:int}\` adds a rule the text must satisfy before the segment counts as a match. Ours are \`int\` (digits only) and \`date\` (\`yyyy-MM-dd\`).

### Why constraints exist

Without constraints, \`/gyms/{id}\` also matches \`/gyms/search\`, and every handler has to defend itself against \`id = "banana"\`. Constraints move that defence into the router, where it is written once, and they let two templates share a shape without colliding: \`/gyms/{id:int}\` handles \`/gyms/7\` while \`/gyms/{city}\` handles \`/gyms/leeds\`.

A failed constraint means *this template does not match*. If nothing else matches either, the answer is **404**. That surprises people who expect a 400 "bad id", but think about what the URL means: \`/gyms/banana\` is not a malformed request for gym number banana, it is a path that does not exist. Reserve 400 for requests that reach a handler and then fail to bind.

### When several templates match: specificity

Imagine three templates registered side by side: \`/gyms/search\`, \`/gyms/{id:int}\` and \`/gyms/{city}\`. A request for \`/gyms/search\` fits the first and the third, so the router needs a rule. The usual one, and ours: **more specific wins**, compared segment by segment from the left. A literal beats a constrained parameter, which beats a plain parameter. Encode each segment as a digit (0 literal, 1 constrained, 2 plain) and read the digits as a base-3 number: the lowest number is the most specific template. Because routes are compared left to right, \`/gyms/search/{x}\` also outranks \`/gyms/{id}/{x}\`.

### 404 or 405?

There are two different ways to miss:

- **No template matches the path at all** is a *404 Not Found*.
- **A template matches the path, but not for this method** is a *405 Method Not Allowed*, and the response must carry an \`Allow\` header listing the methods that would work (\`Allow: GET, POST\`).

Collapsing both into 404 looks harmless and wastes hours: a client that sends \`DELETE /gyms/2\` is told the gym does not exist instead of "that verb isn't offered". Collect every endpoint whose *path* matches, then decide: if one of them has the right method, pick the most specific; otherwise, if any matched, answer 405 with the sorted, distinct method list; otherwise 404.

### Endpoints carry metadata

Your \`Endpoint\` record has a \`Metadata\` list and a \`With(...)\` method that appends to it and returns the endpoint. Nothing uses it yet. In later lessons, authorization policies, caching rules and other cross-cutting facts attach to endpoints this way, so that middleware can look at the endpoint a request is *about to* reach and decide what to do. Routing runs before the rest of the pipeline for exactly this reason.

### Common mistakes

- Comparing literals case-sensitively, then wondering why \`/Gyms\` 404s in production but not on your laptop.
- Checking the method before the path, which makes 405 impossible to produce.
- Letting the first registered template win. Registration order should not change behaviour.
- A router that accepts \`{id:int}\` but crashes on an empty segment (\`/gyms//slots\`). Split with \`RemoveEmptyEntries\` and treat the result as the real segment list; this also makes a trailing slash harmless.
- Using exceptions for non-matches. A router answers "no" millions of times; return \`null\` or a result object.`,
      mission: md`The booking site has one URL for everything and an \`if\` chain that nobody dares touch. The new design needs a real route table, and the first question from the front-desk team is the one routers always get: *what happens when someone types it wrong?*

The platform team prepared a harness. It registers seven routes and replays a labelled section of recorded requests through your router, printing how each one was matched. Make the routing decisions defensible: literals beat parameters, constraints reject early, a wrong verb is a 405, a missing path is a 404. When this lesson passes, the **Route table** lights up with the registered routes and every match.`,
      tasks: [
        "Write RouteMatch handling in Router.Match: collect every endpoint whose path matches, choose the lowest Rank among those with the right method (Found), otherwise MethodNotAllowed with a sorted distinct Allow list, otherwise NotFound",
        "Write Endpoint.TryMatch(parts): same segment count, literals equal ignoring case, {name} captured into a case-insensitive dictionary, {name:int} digits only, {name:date} a real yyyy-MM-dd date; return null when anything fails",
        "Write Endpoint.Rank (literal 0, constrained parameter 1, plain parameter 2, read as a base-3 number from left to right) and Router.Add",
        "Run the harness: all seven routes are registered, and the matches section shows /gyms/search choosing the literal route, /gyms/2 the int route and /gyms/leeds the plain parameter route",
      ],
      starterAdd: cs`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 2. The harness below is ready; write the Router (and what it needs) under the divider.
var router = new Router();
foreach (var template in new[] { "/gyms", "/gyms/{id:int}", "/gyms/{city}", "/gyms/search", "/gyms/{id:int}/slots", "/slots/{day:date}" }) router.Add("GET", template, ctx => Task.CompletedTask);
router.Add("POST", "/bookings", ctx => Task.CompletedTask);

var matches = Capture.Section("routing").Select(Request.Parse).Select(r => (Request: r, Match: router.Match(r.Method, r.Path))).ToList();
foreach (var (r, m) in matches) Console.WriteLine($"{r.Method,-6} {r.Path,-20} -> {m.Outcome} {m.Endpoint?.Template}");
Board.Show("routes", new
{
    table = router.Endpoints.Select(e => new { e.Method, e.Template }),
    matches = matches.Select(x => new { x.Request.Method, x.Request.Path, x.Match.Outcome, template = x.Match.Endpoint?.Template, x.Match.Values, x.Match.Allow }),
});

${TYPES_DIVIDER}

// ─── ✏️ YOUR TURN ─── Endpoint.TryMatch: segment by segment, literals compare ignoring case, {name} captures,
// {name:int} / {name:date} must pass their constraint. Rank: literal 0, constrained 1, plain 2, compared left to right.
// Router.Match: best Found by Rank for the method; else MethodNotAllowed (sorted Allow list); else NotFound.
delegate Task RequestDelegate(HttpContext ctx);
enum MatchOutcome { Found, NotFound, MethodNotAllowed }
record RouteMatch(MatchOutcome Outcome, Endpoint Endpoint = null, Dictionary<string, string> Values = null, string[] Allow = null);

record Endpoint(string Method, string Template, RequestDelegate Handler)
{
    public List<object> Metadata { get; } = new();
    public Endpoint With(object item) { Metadata.Add(item); return this; }
    public int Rank => 0;
    public Dictionary<string, string> TryMatch(string[] parts) => null;
}

class Router
{
    public List<Endpoint> Endpoints { get; } = new();
    public Endpoint Add(string method, string template, RequestDelegate handler) => throw new NotImplementedException();
    public RouteMatch Match(string method, string path) => throw new NotImplementedException();
}`,
      solutionAdd: cs`// 2. routing
var router = new Router();
foreach (var template in new[] { "/gyms", "/gyms/{id:int}", "/gyms/{city}", "/gyms/search", "/gyms/{id:int}/slots", "/slots/{day:date}" }) router.Add("GET", template, ctx => Task.CompletedTask);
router.Add("POST", "/bookings", ctx => Task.CompletedTask);

var matches = Capture.Section("routing").Select(Request.Parse).Select(r => (Request: r, Match: router.Match(r.Method, r.Path))).ToList();
foreach (var (r, m) in matches) Console.WriteLine($"{r.Method,-6} {r.Path,-20} -> {m.Outcome} {m.Endpoint?.Template}");
Board.Show("routes", new
{
    table = router.Endpoints.Select(e => new { e.Method, e.Template }),
    matches = matches.Select(x => new { x.Request.Method, x.Request.Path, x.Match.Outcome, template = x.Match.Endpoint?.Template, x.Match.Values, x.Match.Allow }),
});

${TYPES_DIVIDER}
delegate Task RequestDelegate(HttpContext ctx);

enum MatchOutcome { Found, NotFound, MethodNotAllowed }

record RouteMatch(MatchOutcome Outcome, Endpoint Endpoint = null, Dictionary<string, string> Values = null, string[] Allow = null);

record Endpoint(string Method, string Template, RequestDelegate Handler)
{
    public List<object> Metadata { get; } = new();
    public Endpoint With(object item) { Metadata.Add(item); return this; }

    string[] Segments => Template.Split('/', StringSplitOptions.RemoveEmptyEntries);

    // Lower wins: literal (0), constrained parameter (1), plain parameter (2).
    public int Rank => Segments.Aggregate(0, (rank, s) => rank * 3 + (!s.StartsWith('{') ? 0 : s.Contains(':') ? 1 : 2));

    public Dictionary<string, string> TryMatch(string[] parts)
    {
        if (parts.Length != Segments.Length) return null;
        var values = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        for (var i = 0; i < parts.Length; i++)
        {
            var seg = Segments[i];
            if (!seg.StartsWith('{')) { if (!seg.Equals(parts[i], StringComparison.OrdinalIgnoreCase)) return null; continue; }
            var spec = seg[1..^1].Split(':');
            if (spec.Length > 1 && !(spec[1] == "int" ? parts[i].All(char.IsAsciiDigit) : DateOnly.TryParseExact(parts[i], "yyyy-MM-dd", out _))) return null;
            values[spec[0]] = parts[i];
        }
        return values;
    }
}

class Router
{
    public List<Endpoint> Endpoints { get; } = new();

    public Endpoint Add(string method, string template, RequestDelegate handler)
    {
        var endpoint = new Endpoint(method, template, handler);
        Endpoints.Add(endpoint);
        return endpoint;
    }

    public RouteMatch Match(string method, string path)
    {
        var parts = path.Split('/', StringSplitOptions.RemoveEmptyEntries);
        var found = Endpoints.Select(e => (Endpoint: e, Values: e.TryMatch(parts))).Where(x => x.Values != null).ToList();
        var best = found.Where(x => x.Endpoint.Method == method).OrderBy(x => x.Endpoint.Rank).FirstOrDefault();
        return best.Endpoint != null ? new(MatchOutcome.Found, best.Endpoint, best.Values)
            : found.Count > 0 ? new(MatchOutcome.MethodNotAllowed, Allow: found.Select(x => x.Endpoint.Method).Distinct().Order().ToArray())
            : new(MatchOutcome.NotFound);
    }
}`,
      explanation:
        "TryMatch walks the template and the request path together: a literal segment must equal the request segment ignoring case, a parameter segment records its text, and a constraint is checked before the parameter is accepted. Rank turns the template into a number (0 for a literal, 1 for a constrained parameter, 2 for a plain one, most significant digit first), so ordering by Rank puts the most specific template first. Router.Match gathers every endpoint whose path matches, picks the best one for the requested method, and only if none has that method falls back to 405 (with the sorted distinct methods of the path matches as Allow) or 404. Trailing slashes and empty segments vanish because the path is split with RemoveEmptyEntries.",
      hints: [
        { id: "h1", title: "TryMatch", content: "string[] Segments => Template.Split('/', StringSplitOptions.RemoveEmptyEntries); In TryMatch return null if parts.Length != Segments.Length. For each segment: if it does not start with '{' it is a literal, so compare with seg.Equals(parts[i], StringComparison.OrdinalIgnoreCase). Otherwise var spec = seg[1..^1].Split(':'); spec[0] is the name and spec[1] (if present) is the constraint. Use parts[i].All(char.IsAsciiDigit) for int and DateOnly.TryParseExact(parts[i], \"yyyy-MM-dd\", out _) for date." },
        { id: "h2", title: "Rank", content: "public int Rank => Segments.Aggregate(0, (rank, s) => rank * 3 + (!s.StartsWith('{') ? 0 : s.Contains(':') ? 1 : 2)); Every template compared against another for the same path has the same number of segments, so this is a left-to-right comparison." },
        { id: "h3", title: "Match", content: "var parts = path.Split('/', StringSplitOptions.RemoveEmptyEntries); var found = Endpoints.Select(e => (Endpoint: e, Values: e.TryMatch(parts))).Where(x => x.Values != null).ToList(); var best = found.Where(x => x.Endpoint.Method == method).OrderBy(x => x.Endpoint.Rank).FirstOrDefault(); If best.Endpoint != null -> Found. Else if found.Count > 0 -> MethodNotAllowed with found.Select(x => x.Endpoint.Method).Distinct().Order().ToArray(). Else NotFound." },
      ],
      tests: [
        {
          id: "t1",
          description: "all seven routes are registered with their templates",
          assertionCode: js`
assert(scene.routes && Array.isArray(scene.routes.matches), "The harness sends the route table with Board.Show(\"routes\", ...): finish Router first.");
assert(scene.routes && Array.isArray(scene.routes.table), "The harness sends the table with Board.Show(\"routes\", ...). Make sure Router.Add stores each endpoint in Endpoints.");
assertEqual(scene.routes.table.length, 7, "number of registered routes");
assert(scene.routes.table.some((r) => r.method === "GET" && r.template === "/gyms/{id:int}/slots"), "GET /gyms/{id:int}/slots must be in the table");
assert(scene.routes.table.some((r) => r.method === "POST" && r.template === "/bookings"), "POST /bookings must be in the table");`,
        },
        {
          id: "t2",
          description: "a literal route beats a parameter route",
          assertionCode: js`
assert(scene.routes && Array.isArray(scene.routes.matches), "The harness sends the route table with Board.Show(\"routes\", ...): finish Router first.");
const m = scene.routes.matches.find((x) => x.path === "/gyms/search");
assertEqual(m.outcome, "Found", "outcome for /gyms/search");
assertEqual(m.template, "/gyms/search", "the literal template must win over /gyms/{id:int} and /gyms/{city}");`,
        },
        {
          id: "t3",
          description: "a constrained parameter beats a plain parameter, and values are captured",
          assertionCode: js`
assert(scene.routes && Array.isArray(scene.routes.matches), "The harness sends the route table with Board.Show(\"routes\", ...): finish Router first.");
const two = scene.routes.matches.find((x) => x.path === "/gyms/2");
assertEqual(two.template, "/gyms/{id:int}", "/gyms/2 must use the int route");
assertEqual(two.values, { id: "2" }, "captured values for /gyms/2");
const leeds = scene.routes.matches.find((x) => x.path === "/gyms/leeds");
assertEqual(leeds.template, "/gyms/{city}", "/gyms/leeds fails the int constraint, so the plain route handles it");
assertEqual(leeds.values, { city: "leeds" }, "captured values for /gyms/leeds");`,
        },
        {
          id: "t4",
          description: "a failed constraint means no match: 404, not an error",
          assertionCode: js`
assert(scene.routes && Array.isArray(scene.routes.matches), "The harness sends the route table with Board.Show(\"routes\", ...): finish Router first.");
for (const path of ["/gyms/abc/slots", "/slots/12", "/nowhere"]) {
  const m = scene.routes.matches.find((x) => x.path === path);
  assertEqual(m.outcome, "NotFound", "outcome for " + path);
}
const date = scene.routes.matches.find((x) => x.path === "/slots/2031-06-14");
assertEqual(date.outcome, "Found", "a real date satisfies {day:date}");
assertEqual(date.values, { day: "2031-06-14" }, "captured date");`,
        },
        {
          id: "t5",
          description: "the right path with the wrong method is a 405 that lists the allowed methods",
          assertionCode: js`
assert(scene.routes && Array.isArray(scene.routes.matches), "The harness sends the route table with Board.Show(\"routes\", ...): finish Router first.");
const del = scene.routes.matches.find((x) => x.method === "DELETE" && x.path === "/gyms/2");
assertEqual(del.outcome, "MethodNotAllowed", "DELETE /gyms/2");
assertEqual(del.allow, ["GET"], "Allow list for /gyms/2");
const post = scene.routes.matches.find((x) => x.method === "POST" && x.path === "/gyms/2/slots");
assertEqual(post.outcome, "MethodNotAllowed", "POST /gyms/2/slots");`,
        },
        {
          id: "t6",
          description: "matching ignores case and a trailing slash",
          assertionCode: js`
assert(scene.routes && Array.isArray(scene.routes.matches), "The harness sends the route table with Board.Show(\"routes\", ...): finish Router first.");
const m = scene.routes.matches.find((x) => x.path === "/Gyms/3/slots/");
assertEqual(m.outcome, "Found", "/Gyms/3/slots/");
assertEqual(m.template, "/gyms/{id:int}/slots", "template");
assertEqual(m.values, { id: "3" }, "values");`,
        },
        {
          id: "t7",
          description: "every match is printed as a line",
          assertionCode: js`
assert(scene.routes && Array.isArray(scene.routes.matches), "The harness sends the route table with Board.Show(\"routes\", ...): finish Router first.");
assert(lines.some((l) => /^GET\s+\/gyms\/search\s+-> Found \/gyms\/search$/.test(l.trim())), "Print lines like: GET    /gyms/search         -> Found /gyms/search");
assert(lines.some((l) => /^DELETE\s+\/gyms\/2\s+-> MethodNotAllowed/.test(l.trim())), "Print the 405 outcome too");`,
        },
      ],
      unlocks: ["ca-routes"],
      checks: [
        {
          prompt: "A client sends `DELETE /gyms/2`, but only `GET /gyms/{id:int}` exists. What should the router answer?",
          question: {
            type: "choice",
            options: ["404 Not Found", "405 Method Not Allowed with an Allow header", "400 Bad Request", "200 OK with an empty body"],
            answer: 1,
          },
          explanation: "The path exists, the verb is not offered. 405 plus `Allow: GET` tells the caller exactly what is possible. Answering 404 would hide a client bug as a missing resource.",
        },
        {
          prompt: "Which template is the most specific for the path `/gyms/search`?",
          question: {
            type: "choice",
            options: ["/gyms/{city}", "/gyms/{id:int}", "/gyms/search", "They are equally specific"],
            answer: 2,
          },
          explanation: "A literal segment beats a constrained parameter, which beats a plain one. (`{id:int}` would not match `search` at all, but the rule is what keeps `/gyms/search` working when someone adds a template like `{slug}`.)",
        },
        {
          prompt: "Two templates match the path `/gyms/search/5`: `/{a}/search/{x:int}` and `/gyms/{b}/{x:int}`. Compared left to right, which one wins?",
          question: {
            type: "choice",
            options: ["/{a}/search/{x:int}, because it has a literal in the middle", "/gyms/{b}/{x:int}, because its first segment is a literal", "They tie, so registration order decides", "Neither: this is a 405"],
            answer: 1,
          },
          explanation: "The first segment where the templates differ decides: `gyms` (literal, digit 0) beats `{a}` (plain parameter, digit 2). Counting literals would give a tie and make behaviour depend on registration order, which is exactly what a router must not do.",
        },
      ],
    },
    // ───────────────────────── 3 ─────────────────────────
    {
      id: "csharp-api-3-middleware",
      title: "The middleware pipeline",
      minutes: 45,
      xp: 210,
      concepts: ["delegates", "Use / Run / Map", "pipeline composition", "short-circuiting", "ordering", "exception flow", "async/await"],
      learn: md`### An onion built from delegates

Nearly every cross-cutting concern in a web API (error handling, logging, authentication, caching, timing) has the same shape: *do something before the real work, optionally call the real work, do something after*. Middleware gives that shape a type. A middleware is a function that receives the context and a delegate for **the rest of the pipeline**:

~~~csharp
delegate Task RequestDelegate(HttpContext ctx);                       // something that handles a request
delegate Task Middleware(HttpContext ctx, RequestDelegate next);      // wraps something that handles a request
~~~

Calling \`await next(ctx)\` runs everything further in. Code before that line sees the request on its way in, code after it sees the response on its way out, and *not* calling \`next\` **short-circuits** the pipeline: the request never reaches the endpoint.

~~~csharp
app.Use("timing", async (ctx, next) =>
{
    var started = clock.Now;       // way in
    await next(ctx);               // everything inside
    ctx.Response.Headers["X-Elapsed-Ms"] = (clock.Now - started).ToString();   // way out
});
~~~

### How the chain is built

You keep a list of middleware in registration order and fold it from the back. Start with the terminal delegate (the endpoint), then wrap it with the last middleware, wrap that with the one before, and so on. Each wrapper captures the delegate it wraps as its \`next\`:

~~~csharp
RequestDelegate pipeline = terminal;
foreach (var middleware in Enumerable.Reverse(chain))
{
    var next = pipeline;                       // copy: the lambda must capture this value,
    pipeline = c => middleware(c, next);       // not a variable that keeps changing
}
~~~

Forgetting the copy (\`next\`) is a well-known trap: all wrappers would end up calling the final value of the loop variable. After this loop, \`pipeline(ctx)\` runs the first middleware, which decides whether the second ever runs.

### Order is behaviour

Registration order is execution order on the way in and the reverse on the way out. That has consequences:

- **The error handler goes first (outermost)** so it can catch exceptions thrown by everything inside it. An error handler registered last only protects the endpoint.
- **Timing and logging go near the front** so they measure the work of everything inside them.
- **An authentication check must run before the handler it protects**, which is why it is a short-circuit: on failure it writes a 401 and returns without calling \`next\`.

An exception thrown inside the pipeline unwinds through every wrapper. Any code *after* \`await next(ctx)\` in the middlewares it passes through is skipped, unless it sits in a \`finally\`. That is why our \`timing\` middleware reports nothing for a request that crashed; if you need a measurement even then, put it in a \`finally\`.

### Use, Map and the terminal

- \`Use(name, middleware)\` appends to the chain.
- The **terminal** is not part of the chain. Our \`App.Run(ctx)\` first asks the router which endpoint matches and stores the result in \`ctx.Items["route"]\`, so middleware can see which endpoint is *about to* run, then executes the chain, and the last step calls the endpoint's handler (or sets 404 or 405).
- \`Map("/admin", configure)\` creates a **branch**: its own \`App\` with its own middleware and routes. When the path starts with the prefix (and the prefix ends at a segment boundary, so \`/administrator\` does not match \`/admin\`), the branch handles the request with the prefix removed from the path, then the original path is restored.

### async all the way

Handlers return \`Task\`. Never block on a task from inside a pipeline (\`.Result\`, \`.Wait()\`): under load it exhausts threads and under some synchronization contexts it deadlocks. Write \`async\`/\`await\` through the whole chain.

### Tracing the flow

To make the pipeline visible, your \`Use\` wrapper records the middleware's name in \`ctx.Trace()\` on the way in and \`"/" + name\` when it returns normally; the terminal records \`"endpoint"\`. The console draws these traces as lanes, so you can literally see where a request was cut short. (\`Trace\` is a small list stored in \`ctx.Items\`; \`Items\` exists for exactly this kind of cross-cutting data.)

### Common mistakes

- Calling \`next\` twice, or not at all when you meant to. Decide deliberately.
- Writing to the response *after* it has been sent (not an issue here, but the first thing you will hit with a real server).
- Catching \`Exception\` and returning its message to the client. Log the detail, return a generic message.
- Registering error handling last.
- Matching a branch prefix with \`StartsWith\` only.`,
      mission: md`Requests at Crux now cross several checkpoints: someone has to catch crashes, someone has to time things, and the ops tools under \`/admin\` must demand a key. Right now each endpoint repeats that code. You will pull it out into a pipeline of small, ordered, replaceable pieces.

The harness replays a labelled section of requests through your app: a normal read, a crashing endpoint, the admin area with a wrong key, with the right key, with an unknown admin path, a wrong verb and a missing path. The console draws the path each one took through the middleware lanes. When this lesson passes, the **Pipeline** panel lights up.`,
      tasks: [
        "Write the Middleware delegate, HttpException(status, message), and Clock (Now, Advance, AdvanceTo: AdvanceTo never moves time backwards)",
        "Write Middlewares.Errors: HttpException becomes its status with { error = message }, any other exception becomes 500 with { error = \"unexpected\" } and never leaks the exception text",
        "Write App: a router, Use(name, middleware) that records name / \"/\" + name in ctx.Trace(), MapGet, Map(prefix, configure) for branches, Run(ctx) that routes first then folds the chain around a terminal that records \"endpoint\" and runs the handler (404 or 405 with Allow otherwise), and Handle(request)",
        "Build the demo app (errors, timing, the /admin branch with its key check and /ping, /gyms/{id:int} costing 12 ms, /boom that throws) and call Lab.Replay(app, \"pipeline\", clock, trace: true)",
      ],
      starterAdd: cs`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 3. Build an App from middleware and replay the "pipeline" section through it.
//  var clock = new Clock();  var app = new App();
//  app.Use("errors", Middlewares.Errors);                      // outermost: turns exceptions into responses
//  app.Use("timing", ...)   // set X-Elapsed-Ms = clock.Now minus the time it started, after calling next
//  app.Map("/admin", admin => { admin.Use("admin-key", ...)  // 401 unless X-Admin-Key is "crux-ops"
//                               admin.MapGet("/ping", ...) }) // 200 { pong = true }
//  app.MapGet("/gyms/{id:int}", ...)   // clock.Advance(12) to pretend to work, then 200 { id = the route value }
//  app.MapGet("/boom", ctx => throw new InvalidOperationException("disk on fire"));
//  await Lab.Replay(app, "pipeline", clock, trace: true);

${TYPES_DIVIDER}

// ─── ✏️ YOUR TURN ─── Middleware, HttpException, Clock, Middlewares.Errors, App and the two ctx helpers.
delegate Task Middleware(HttpContext ctx, RequestDelegate next);
class HttpException { }
class Clock
{
    public long Now { get; }
    public void Advance(long ms) => throw new NotImplementedException();
    public void AdvanceTo(long ms) => throw new NotImplementedException();
}
static partial class Middlewares { }
class App
{
    public Router Router { get; } = new();
    public Task Run(HttpContext ctx) => throw new NotImplementedException();
}

static class HttpContextExtensions
{
    public static List<string> Trace(this HttpContext ctx) => throw new NotImplementedException();
    public static Dictionary<string, string> RouteValues(this HttpContext ctx) => throw new NotImplementedException();
}

// Provided by pockett: replays one section of the recorded traffic through an app. It prints each
// exchange and sends the whole list to the board under the section's name.
record Exchange(int At, string Method, string Path, int Status, Dictionary<string, string> Headers, string Body, List<string> Trace);

static class Lab
{
    public static async Task<List<Exchange>> Replay(App app, string section, Clock clock = null, bool trace = false)
    {
        var results = new List<Exchange>();
        foreach (var request in Capture.Section(section).Select(Request.Parse))
        {
            clock?.AdvanceTo(request.At);
            var ctx = new HttpContext(request);
            await app.Run(ctx);
            Console.WriteLine($"{request.At,6}  {request.Method,-6} {request.Path,-28} -> {ctx.Response.Status}");
            results.Add(new Exchange(request.At, request.Method, request.Path, ctx.Response.Status, ctx.Response.Headers, ctx.Response.Body, trace ? ctx.Trace() : null));
        }
        Board.Show(section, results);
        return results;
    }
}`,
      solutionAdd: cs`// 3. middleware
var clock = new Clock();
var app = new App();
app.Use("errors", Middlewares.Errors);
app.Use("timing", async (ctx, next) =>
{
    var started = clock.Now;
    await next(ctx);
    ctx.Response.Headers["X-Elapsed-Ms"] = (clock.Now - started).ToString();
});
app.Map("/admin", admin =>
{
    admin.Use("admin-key", async (ctx, next) =>
    {
        if (ctx.Request.Header("X-Admin-Key") != "crux-ops") throw new HttpException(401, "admin key required");
        await next(ctx);
    });
    admin.MapGet("/ping", ctx => { ctx.Response.WriteJson(200, new { pong = true }); return Task.CompletedTask; });
});
app.MapGet("/gyms/{id:int}", ctx => { clock.Advance(12); ctx.Response.WriteJson(200, new { id = ctx.RouteValues()["id"] }); return Task.CompletedTask; });
app.MapGet("/boom", ctx => throw new InvalidOperationException("disk on fire"));
await Lab.Replay(app, "pipeline", clock, trace: true);

${TYPES_DIVIDER}
delegate Task Middleware(HttpContext ctx, RequestDelegate next);

class HttpException(int status, string message) : Exception(message) { public int Status { get; } = status; }

class Clock
{
    public long Now { get; private set; }
    public void Advance(long ms) => Now += ms;
    public void AdvanceTo(long ms) => Now = Math.Max(Now, ms);
}

static partial class Middlewares
{
    public static async Task Errors(HttpContext ctx, RequestDelegate next)
    {
        try { await next(ctx); }
        catch (HttpException e) { ctx.Response.WriteJson(e.Status, new { error = e.Message }); }
        catch (Exception) { ctx.Response.WriteJson(500, new { error = "unexpected" }); }
    }
}

class App
{
    readonly List<(string Name, Middleware Run)> chain = new();
    public Router Router { get; } = new();

    public App Use(string name, Middleware middleware)
    {
        chain.Add((name, async (ctx, next) => { ctx.Trace().Add(name); await middleware(ctx, next); ctx.Trace().Add("/" + name); }));
        return this;
    }

    public Endpoint MapGet(string template, RequestDelegate handler) => Router.Add("GET", template, handler);

    // A branch has its own pipeline and routes, and sees the path with the prefix removed.
    public App Map(string prefix, Action<App> configure)
    {
        var branch = new App();
        configure(branch);
        return Use("map:" + prefix, async (ctx, next) =>
        {
            var original = ctx.Request;
            if (!original.Path.StartsWith(prefix, StringComparison.OrdinalIgnoreCase) || (original.Path.Length > prefix.Length && original.Path[prefix.Length] != '/')) { await next(ctx); return; }
            ctx.Request = original with { Path = original.Path[prefix.Length..] };
            try { await branch.Run(ctx); } finally { ctx.Request = original; }
        });
    }

    public async Task Run(HttpContext ctx)
    {
        var match = Router.Match(ctx.Request.Method, ctx.Request.Path);
        ctx.Items["route"] = match;
        RequestDelegate pipeline = async c =>
        {
            c.Trace().Add("endpoint");
            if (match.Outcome == MatchOutcome.Found) await match.Endpoint.Handler(c);
            else if (match.Outcome == MatchOutcome.NotFound) c.Response.Status = 404;
            else (c.Response.Status, c.Response.Headers["Allow"]) = (405, string.Join(", ", match.Allow));
        };
        foreach (var (_, middleware) in Enumerable.Reverse(chain))
        {
            var next = pipeline;
            pipeline = c => middleware(c, next);
        }
        await pipeline(ctx);
    }

    public async Task<Response> Handle(Request request)
    {
        var ctx = new HttpContext(request);
        await Run(ctx);
        return ctx.Response;
    }
}

static class HttpContextExtensions
{
    public static List<string> Trace(this HttpContext ctx) => (List<string>)(ctx.Items.TryGetValue("trace", out var t) ? t : ctx.Items["trace"] = new List<string>());
    public static Dictionary<string, string> RouteValues(this HttpContext ctx) => ((RouteMatch)ctx.Items["route"]).Values;
}

// Provided by pockett: replays one section of the recorded traffic through an app. It prints each
// exchange and sends the whole list to the board under the section's name.
record Exchange(int At, string Method, string Path, int Status, Dictionary<string, string> Headers, string Body, List<string> Trace);

static class Lab
{
    public static async Task<List<Exchange>> Replay(App app, string section, Clock clock = null, bool trace = false)
    {
        var results = new List<Exchange>();
        foreach (var request in Capture.Section(section).Select(Request.Parse))
        {
            clock?.AdvanceTo(request.At);
            var ctx = new HttpContext(request);
            await app.Run(ctx);
            Console.WriteLine($"{request.At,6}  {request.Method,-6} {request.Path,-28} -> {ctx.Response.Status}");
            results.Add(new Exchange(request.At, request.Method, request.Path, ctx.Response.Status, ctx.Response.Headers, ctx.Response.Body, trace ? ctx.Trace() : null));
        }
        Board.Show(section, results);
        return results;
    }
}`,
      explanation:
        "App.Run routes first (so middleware can inspect the matched endpoint), then folds the middleware list from the back around a terminal delegate. Each Use wrapper adds its name to the trace, awaits the middleware, and adds \"/name\" if the middleware returned normally, so the trace shows exactly where a request was short-circuited or crashed. The errors middleware sits outermost and converts exceptions into responses; HttpException carries a deliberate status, anything else becomes a generic 500 so internals never leak. The timing middleware reads the clock before and after next. The /admin branch is a separate App; when the path matches the prefix at a segment boundary it runs the branch with a shortened path and restores the original afterwards.",
      hints: [
        { id: "h1", title: "Use and the trace", content: "chain.Add((name, async (ctx, next) => { ctx.Trace().Add(name); await middleware(ctx, next); ctx.Trace().Add(\"/\" + name); })); Keep the chain as List<(string Name, Middleware Run)>. Trace() is (List<string>)(ctx.Items.TryGetValue(\"trace\", out var t) ? t : ctx.Items[\"trace\"] = new List<string>()). RouteValues() reads ((RouteMatch)ctx.Items[\"route\"]).Values." },
        { id: "h2", title: "Run: route first, then fold", content: "var match = Router.Match(ctx.Request.Method, ctx.Request.Path); ctx.Items[\"route\"] = match; RequestDelegate pipeline = async c => { c.Trace().Add(\"endpoint\"); if (match.Outcome == MatchOutcome.Found) await match.Endpoint.Handler(c); else if NotFound -> Status = 404; else Status = 405 and Headers[\"Allow\"] = string.Join(\", \", match.Allow); }; then foreach (var (_, middleware) in Enumerable.Reverse(chain)) { var next = pipeline; pipeline = c => middleware(c, next); } await pipeline(ctx);" },
        { id: "h3", title: "Map and the errors middleware", content: "Map(prefix, configure): var branch = new App(); configure(branch); return Use(\"map:\" + prefix, async (ctx, next) => { ... }); inside, if the path does not start with the prefix (ignoring case) or the character after the prefix is not '/', call await next(ctx) and return. Otherwise var original = ctx.Request; ctx.Request = original with { Path = original.Path[prefix.Length..] }; try { await branch.Run(ctx); } finally { ctx.Request = original; }. Errors: try { await next(ctx); } catch (HttpException e) { WriteJson(e.Status, new { error = e.Message }); } catch (Exception) { WriteJson(500, new { error = \"unexpected\" }); }" },
      ],
      tests: [
        {
          id: "t1",
          description: "middleware runs in registration order on the way in and reverse order on the way out",
          assertionCode: js`
assert(Array.isArray(scene.pipeline) && scene.pipeline.length >= 7, "Replay the section with Lab.Replay(app, \"pipeline\", clock, trace: true).");
assert(Array.isArray(scene.pipeline), "Replay the section with Lab.Replay(app, \"pipeline\", clock, trace: true) so the board receives the traces.");
const ok = scene.pipeline.find((e) => e.path === "/gyms/2");
assertEqual(ok.status, 200, "status of GET /gyms/2");
assertEqual(ok.trace.slice(0, 3), ["errors", "timing", "map:/admin"], "the way in follows registration order");
assertEqual(ok.trace.slice(-3), ["/map:/admin", "/timing", "/errors"], "the way out is the reverse");
assert(ok.trace.includes("endpoint"), "the endpoint runs in the middle");`,
        },
        {
          id: "t2",
          description: "the timing middleware measures the work inside it",
          assertionCode: js`
assert(Array.isArray(scene.pipeline) && scene.pipeline.length >= 7, "Replay the section with Lab.Replay(app, \"pipeline\", clock, trace: true).");
const ok = scene.pipeline.find((e) => e.path === "/gyms/2");
assertEqual(ok.headers["X-Elapsed-Ms"], "12", "X-Elapsed-Ms for the endpoint that advanced the clock by 12 ms");`,
        },
        {
          id: "t3",
          description: "a crash becomes a generic 500 and the exception text never leaks",
          assertionCode: js`
assert(Array.isArray(scene.pipeline) && scene.pipeline.length >= 7, "Replay the section with Lab.Replay(app, \"pipeline\", clock, trace: true).");
const boom = scene.pipeline.find((e) => e.path === "/boom");
assertEqual(boom.status, 500, "status of the crashing endpoint");
assertEqual(JSON.parse(boom.body), { error: "unexpected" }, "body");
assert(!boom.body.includes("disk"), "the exception message must not reach the client");`,
        },
        {
          id: "t4",
          description: "a middleware can short-circuit: the endpoint never runs",
          assertionCode: js`
assert(Array.isArray(scene.pipeline) && scene.pipeline.length >= 7, "Replay the section with Lab.Replay(app, \"pipeline\", clock, trace: true).");
const denied = scene.pipeline.find((e) => e.path === "/admin/ping" && e.status === 401);
assert(denied, "GET /admin/ping with the wrong key must answer 401");
assertEqual(JSON.parse(denied.body), { error: "admin key required" }, "body of the 401");
assert(denied.trace.includes("admin-key"), "the branch middleware ran");
assert(!denied.trace.includes("endpoint"), "the endpoint must not run after a short-circuit");`,
        },
        {
          id: "t5",
          description: "a branch has its own pipeline and routes, with the prefix removed",
          assertionCode: js`
assert(Array.isArray(scene.pipeline) && scene.pipeline.length >= 7, "Replay the section with Lab.Replay(app, \"pipeline\", clock, trace: true).");
const ok = scene.pipeline.find((e) => e.path === "/admin/ping" && e.status === 200);
assert(ok, "GET /admin/ping with the right key must answer 200");
assertEqual(JSON.parse(ok.body), { pong: true }, "body");
assert(ok.trace.indexOf("map:/admin") < ok.trace.indexOf("admin-key") && ok.trace.indexOf("admin-key") < ok.trace.indexOf("endpoint"), "branch middleware runs inside the Map step and before the endpoint");
const other = scene.pipeline.find((e) => e.path === "/admin/other");
assertEqual(other.status, 404, "an unknown path inside the branch is a 404 from the branch's router");`,
        },
        {
          id: "t6",
          description: "unknown paths are 404 and wrong verbs are 405 with an Allow header",
          assertionCode: js`
assert(Array.isArray(scene.pipeline) && scene.pipeline.length >= 7, "Replay the section with Lab.Replay(app, \"pipeline\", clock, trace: true).");
const missing = scene.pipeline.find((e) => e.path === "/nowhere");
assertEqual(missing.status, 404, "GET /nowhere");
const wrong = scene.pipeline.find((e) => e.method === "DELETE");
assertEqual(wrong.status, 405, "DELETE /gyms/2");
assertEqual(wrong.headers["Allow"], "GET", "Allow header");`,
        },
        {
          id: "t7",
          description: "every exchange is printed",
          assertionCode: js`
assert(Array.isArray(scene.pipeline) && scene.pipeline.length >= 7, "Replay the section with Lab.Replay(app, \"pipeline\", clock, trace: true).");
assert(lines.filter((l) => /->\s+\d{3}$/.test(l.trim()) && /\/(gyms\/2|boom|admin\/ping|admin\/other|nowhere)\s/.test(l)).length >= 7, "Lab.Replay prints one line per request; call it with the pipeline section");`,
        },
      ],
      unlocks: ["ca-pipeline"],
      checks: [
        {
          prompt: "A middleware writes a 401 and returns without calling `next`. What does that do?",
          question: {
            type: "choice",
            options: [
              "Short-circuits: nothing further in the pipeline runs, including the endpoint",
              "Skips only the next middleware",
              "Throws an exception",
              "Runs the endpoint anyway, then overwrites the response",
            ],
            answer: 0,
          },
          explanation: "`next` is the only way inward. If a middleware does not call it, everything inside is skipped. The middlewares *outside* it still run their after-`next` code, because control returns to them normally.",
        },
        {
          prompt: "Why must the error-handling middleware be registered first?",
          question: {
            type: "choice",
            options: [
              "An exception unwinds outwards, so only middleware outside the failing one can catch it",
              "It must run last on the way in",
              "Registration order does not matter for exceptions",
              "Because it modifies the router",
            ],
            answer: 0,
          },
          explanation: "Exceptions travel outwards through the wrappers. A handler registered last sits innermost and cannot see failures in anything registered before it.",
        },
        {
          prompt: "In the fold loop, why is `pipeline` copied into a local `next` before the new wrapper is built?",
          question: {
            type: "choice",
            options: [
              "The lambda captures the variable, so without a per-iteration copy every wrapper would call whatever the variable holds at the end of the loop",
              "Delegates cannot be assigned to themselves",
              "It makes the loop run in the right order",
              "It avoids allocating a closure",
            ],
            answer: 0,
          },
          explanation: "A lambda captures variables, not values. Capturing `pipeline` directly would make each wrapper call the *final* pipeline (itself), producing an infinite loop or the wrong chain. A per-iteration local gives each wrapper its own `next`.",
        },
      ],
    },
    // ───────────────────────── 4 ─────────────────────────
    {
      id: "csharp-api-4-di",
      title: "Dependency injection and lifetimes",
      minutes: 50,
      xp: 240,
      concepts: ["inversion of control", "constructor injection", "singleton / scoped / transient", "captive dependencies", "scopes per request", "reflection", "composition root"],
      learn: md`### Why a container at all

A class that creates its own collaborators (\`new SqlStore()\` inside \`BookingService\`) is welded to them: you cannot test it without a database, swap an implementation, or see what it depends on without reading its body. **Dependency injection** reverses that: a class *declares* what it needs in its constructor and something else supplies it. The "something else" is a **container**: a registry of "when someone asks for \`X\`, build it like this", plus the machinery to build object graphs for you.

The container is infrastructure, not magic. The whole idea fits in a page of reflection:

~~~csharp
var ctor = type.GetConstructors().MaxBy(c => c.GetParameters().Length);   // the greediest public constructor
var args = ctor.GetParameters().Select(p => Resolve(p.ParameterType));    // resolve each parameter, recursively
return ctor.Invoke(args.ToArray());
~~~

That recursion walks the **dependency graph**: asking for \`QuoteService\` asks for \`PriceList\` and \`RequestTally\`, which may ask for more.

### Lifetime is the real design decision

Registering a service means choosing how long an instance lives:

- **Singleton**: one instance for the whole application. Right for stateless helpers, caches and configuration. It must be thread-safe, because every request shares it.
- **Scoped**: one instance per *scope*, and a web server opens one scope per request. Right for things that represent "this request's work": a database context, the current user.
- **Transient**: a new instance every time it is asked for. Right for cheap, stateless helpers.

Your provider is a tree: the **root provider** owns singletons; each \`CreateScope()\` returns a child that shares the registrations and the root's singletons but keeps its own cache of scoped instances.

### The captive dependency

Lifetimes constrain who may depend on whom. A service may only depend on services that live **at least as long** as it does. Break that and you get a **captive dependency**: a singleton that takes a scoped service in its constructor keeps the *first request's* instance forever. Every later request then shares one database context (not thread-safe), or one user's identity (a security hole), or an object that was disposed long ago. It works in a one-user demo and corrupts data in production.

Your container will refuse it. While resolving, keep a stack of the descriptors currently being built. If you are about to build a scoped service and any singleton is on that stack, the caller is a singleton and the dependency is scoped: throw \`InvalidOperationException\` with a message naming both. Also refuse to resolve a scoped service from the root provider (there is no request to scope it to): the instance would be a singleton in disguise.

### Registration details worth getting right

- **Last registration wins.** Registering the same service twice replaces the first. That is how tests and later lessons override a default.
- **Interface to implementation**: \`Add<IBookingStore, SqlBookingStore>(Lifetime.Scoped)\` lets callers ask for the interface.
- **Factories** (\`p => new Thing(p.Get<Other>())\`) are for cases reflection cannot handle: values from configuration, decorators, or instances you built earlier.
- **Create(Type)** builds a class that is *not* registered, resolving its constructor from the container. Controllers will use it in the next lesson.

### What this container leaves out (and real ones do)

Circular dependencies (\`A\` needs \`B\` needs \`A\`) recurse until the stack overflows here; production containers detect them and print the cycle. Disposal is also missing: a real scope disposes the \`IDisposable\` instances it created when it ends. Build-time validation (checking the whole graph at startup instead of on first use) is the third big feature, and the best argument for validating in a test that builds your real container.

### Common mistakes

- Injecting a scoped service into a singleton ("it works on my machine").
- Using the container as a **service locator**: passing the provider into classes so they can \`Get<T>()\` whatever they like. Dependencies become invisible again. Resolve at the edges (the composition root, controllers) and pass things in.
- Constructors that do real work. Resolution should be cheap and predictable.
- Registering something as transient when it holds state that must be shared across a request.`,
      mission: md`The platform will soon need prices, a unit of work per request, an audit stamp for every outgoing email and, later, a database. Today they are constructed wherever they are used, and the unit tests for the booking code need a real store. You will build the container the rest of the platform hangs on.

A harness is provided. It registers four small services, opens two scopes, and then probes the container: are singletons shared, are scoped instances shared only within a scope, are transients always new, does constructor injection work, and does it refuse a **captive dependency** and a scoped service resolved from the root? When this lesson passes, the **Container** panel shows the graph with its lifetimes.`,
      tasks: [
        "Write Lifetime, Descriptor and ServiceCollection: Add<T>(lifetime, factory?) and Add<TService, TImpl>(lifetime); registering the same service again replaces the earlier descriptor",
        "Write ServiceProvider: Build() creates the root, CreateScope() a child sharing registrations and singletons, GetService(Type) resolves with a cache per lifetime (singletons in the root, scoped in the scope, transients never cached)",
        "Write Create(Type): pick the public constructor with the most parameters and resolve each parameter from the container; throw InvalidOperationException naming the missing type when a parameter has no registration. Add the Get<T>() extension",
        "Guard against lifetime mistakes: a scoped service requested while a singleton is being built throws \"Cannot consume scoped service 'X' from singleton 'Y'\", and a scoped service requested from the root throws \"Cannot resolve scoped service 'X' from the root provider\"",
      ],
      starterAdd: cs`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 4. The harness below is ready; write the container under the divider.
var services = new ServiceCollection()
    .Add<PriceList>(Lifetime.Singleton)
    .Add<RequestTally>(Lifetime.Scoped)
    .Add<QuoteService>(Lifetime.Scoped)
    .Add<AuditStamp>(Lifetime.Transient);
var root = services.Build();
var (scopeA, scopeB) = (root.CreateScope(), root.CreateScope());
var tallyA = scopeA.Get<RequestTally>();
string Try(ServiceCollection c, Func<ServiceProvider, object> use) { try { use(c.Build()); return "ok"; } catch (InvalidOperationException e) { return e.Message; } }
var captive = new ServiceCollection().Add<StaleCache>(Lifetime.Singleton).Add<RequestTally>(Lifetime.Scoped);
Board.Show("di", new
{
    services = services.Descriptors.Select(d => new { service = d.Service.Name, d.Lifetime, dependsOn = d.Impl.GetConstructors()[0].GetParameters().Select(p => p.ParameterType.Name) }),
    sameSingleton = ReferenceEquals(root.Get<PriceList>(), scopeB.Get<PriceList>()),
    sameWithinScope = ReferenceEquals(tallyA, scopeA.Get<RequestTally>()),
    sameAcrossScopes = ReferenceEquals(tallyA, scopeB.Get<RequestTally>()),
    sharedWithQuote = ReferenceEquals(tallyA, scopeA.Get<QuoteService>().Tally),
    transientsDiffer = !ReferenceEquals(scopeA.Get<AuditStamp>(), scopeA.Get<AuditStamp>()),
    rootScoped = Try(services, p => p.Get<RequestTally>()),
    captive = Try(captive, p => p.Get<StaleCache>()),
});

${TYPES_DIVIDER}

// ─── ✏️ YOUR TURN ─── Lifetime, Descriptor, ServiceCollection (Add replaces an earlier registration of the same service)
// and ServiceProvider: root + scopes, constructor injection with Create(Type), Get<T>(), and the two guard errors:
//   "Cannot consume scoped service 'X' from singleton 'Y'"   "Cannot resolve scoped service 'X' from the root provider"
enum Lifetime { Singleton, Scoped, Transient }
record Descriptor(Type Service, Type Impl, Lifetime Lifetime, Func<ServiceProvider, object> Factory);

class ServiceCollection
{
    public List<Descriptor> Descriptors { get; } = new();
    public ServiceCollection Add<TService, TImpl>(Lifetime lifetime) where TImpl : TService => throw new NotImplementedException();
    public ServiceCollection Add<T>(Lifetime lifetime, Func<ServiceProvider, T> factory = null) => throw new NotImplementedException();
    public ServiceProvider Build() => throw new NotImplementedException();
}

class ServiceProvider : IServiceProvider
{
    public ServiceProvider CreateScope() => throw new NotImplementedException();
    public object GetService(Type type) => throw new NotImplementedException();
    public object Create(Type type) => throw new NotImplementedException();
}

static class ServiceProviderExtensions
{
    public static T Get<T>(this ServiceProvider p) => throw new NotImplementedException();
}

// Provided: the small services the harness registers.
class PriceList { public int PerClimber => 10; }
class RequestTally;
class QuoteService(PriceList prices, RequestTally tally) { public RequestTally Tally { get; } = tally; }
class AuditStamp;
class StaleCache(RequestTally tally);`,
      solutionAdd: cs`// 4. dependency injection
var services = new ServiceCollection()
    .Add<PriceList>(Lifetime.Singleton)
    .Add<RequestTally>(Lifetime.Scoped)
    .Add<QuoteService>(Lifetime.Scoped)
    .Add<AuditStamp>(Lifetime.Transient);
var root = services.Build();
var (scopeA, scopeB) = (root.CreateScope(), root.CreateScope());
var tallyA = scopeA.Get<RequestTally>();
string Try(ServiceCollection c, Func<ServiceProvider, object> use) { try { use(c.Build()); return "ok"; } catch (InvalidOperationException e) { return e.Message; } }
var captive = new ServiceCollection().Add<StaleCache>(Lifetime.Singleton).Add<RequestTally>(Lifetime.Scoped);
Board.Show("di", new
{
    services = services.Descriptors.Select(d => new { service = d.Service.Name, d.Lifetime, dependsOn = d.Impl.GetConstructors()[0].GetParameters().Select(p => p.ParameterType.Name) }),
    sameSingleton = ReferenceEquals(root.Get<PriceList>(), scopeB.Get<PriceList>()),
    sameWithinScope = ReferenceEquals(tallyA, scopeA.Get<RequestTally>()),
    sameAcrossScopes = ReferenceEquals(tallyA, scopeB.Get<RequestTally>()),
    sharedWithQuote = ReferenceEquals(tallyA, scopeA.Get<QuoteService>().Tally),
    transientsDiffer = !ReferenceEquals(scopeA.Get<AuditStamp>(), scopeA.Get<AuditStamp>()),
    rootScoped = Try(services, p => p.Get<RequestTally>()),
    captive = Try(captive, p => p.Get<StaleCache>()),
});

${TYPES_DIVIDER}
enum Lifetime { Singleton, Scoped, Transient }
record Descriptor(Type Service, Type Impl, Lifetime Lifetime, Func<ServiceProvider, object> Factory);

class ServiceCollection
{
    public List<Descriptor> Descriptors { get; } = new();

    public ServiceCollection Add<TService, TImpl>(Lifetime lifetime) where TImpl : TService => Register(typeof(TService), typeof(TImpl), lifetime, null);
    public ServiceCollection Add<T>(Lifetime lifetime, Func<ServiceProvider, T> factory = null) => Register(typeof(T), typeof(T), lifetime, factory == null ? null : p => factory(p));

    ServiceCollection Register(Type service, Type impl, Lifetime lifetime, Func<ServiceProvider, object> factory)
    {
        Descriptors.RemoveAll(d => d.Service == service);
        Descriptors.Add(new Descriptor(service, impl, lifetime, factory));
        return this;
    }

    public ServiceProvider Build() => new(Descriptors.ToDictionary(d => d.Service), null);
}

class ServiceProvider : IServiceProvider
{
    readonly Dictionary<Type, Descriptor> map;
    readonly ServiceProvider root;
    readonly Dictionary<Type, object> cache = new();
    readonly List<Descriptor> chain = new();

    internal ServiceProvider(Dictionary<Type, Descriptor> map, ServiceProvider root) { this.map = map; this.root = root ?? this; }

    public ServiceProvider CreateScope() => new(map, root);
    public object GetService(Type type) => Resolve(type);

    object Resolve(Type type)
    {
        if (!map.TryGetValue(type, out var d)) return null;
        if (d.Lifetime == Lifetime.Scoped && chain.LastOrDefault(c => c.Lifetime == Lifetime.Singleton) is { } owner) throw new InvalidOperationException($"Cannot consume scoped service '{type.Name}' from singleton '{owner.Service.Name}'");
        if (d.Lifetime == Lifetime.Scoped && this == root) throw new InvalidOperationException($"Cannot resolve scoped service '{type.Name}' from the root provider");
        var home = d.Lifetime == Lifetime.Singleton ? root : this;
        if (d.Lifetime != Lifetime.Transient && home.cache.TryGetValue(type, out var existing)) return existing;
        chain.Add(d);
        try
        {
            var created = d.Factory?.Invoke(this) ?? Create(d.Impl);
            if (d.Lifetime != Lifetime.Transient) home.cache[type] = created;
            return created;
        }
        finally { chain.RemoveAt(chain.Count - 1); }
    }

    // Builds any class by resolving its constructor parameters from the container.
    public object Create(Type type)
    {
        var ctor = type.GetConstructors().MaxBy(c => c.GetParameters().Length);
        return ctor.Invoke(BindingFlags.DoNotWrapExceptions, null, ctor.GetParameters().Select(p => Resolve(p.ParameterType) ?? throw new InvalidOperationException($"No service for type '{p.ParameterType.Name}'")).ToArray(), null);
    }
}

static class ServiceProviderExtensions
{
    public static T Get<T>(this ServiceProvider p) => (T)(p.GetService(typeof(T)) ?? throw new InvalidOperationException($"No service for type '{typeof(T).Name}'"));
}

class PriceList { public int PerClimber => 10; }
class RequestTally;
class QuoteService(PriceList prices, RequestTally tally) { public RequestTally Tally { get; } = tally; }
class AuditStamp;
class StaleCache(RequestTally tally);`,
      explanation:
        "The provider resolves a type by looking up its descriptor, checking the lifetime rules, and then either returning a cached instance or building one. Singletons live in the root provider's cache and scoped instances in the scope's own, so two scopes get different RequestTally objects but the same PriceList. Transients are never cached. While a type is being built it is pushed on a chain; asking for a scoped service while a singleton sits on that chain is exactly a captive dependency and throws, and asking for a scoped service from the root throws a different error. Create picks the constructor with the most parameters and resolves each parameter recursively, which is how QuoteService receives PriceList and the scope's RequestTally.",
      hints: [
        { id: "h1", title: "Registration", content: "Register(Type service, Type impl, Lifetime l, Func<ServiceProvider, object> factory): Descriptors.RemoveAll(d => d.Service == service); Descriptors.Add(new Descriptor(...)); return this; Add<T>(lifetime, factory = null) calls it with typeof(T) twice and factory == null ? null : p => factory(p). Build() => new ServiceProvider(Descriptors.ToDictionary(d => d.Service), null)." },
        { id: "h2", title: "Resolve", content: "Keep: Dictionary<Type, Descriptor> map; ServiceProvider root (root ?? this); Dictionary<Type, object> cache; List<Descriptor> chain. var home = d.Lifetime == Lifetime.Singleton ? root : this; return home.cache[type] if present (not for transients). Otherwise chain.Add(d); try { create: d.Factory?.Invoke(this) ?? Create(d.Impl); store in home.cache unless transient; } finally { chain.RemoveAt(chain.Count - 1); }" },
        { id: "h3", title: "The two guards", content: "Before building a scoped descriptor: if (chain.LastOrDefault(c => c.Lifetime == Lifetime.Singleton) is { } owner) throw new InvalidOperationException($\"Cannot consume scoped service '{type.Name}' from singleton '{owner.Service.Name}'\"); Then: if (this == root) throw new InvalidOperationException($\"Cannot resolve scoped service '{type.Name}' from the root provider\"); Check the singleton one first, because a singleton built from the root would otherwise report the root error." },
      ],
      tests: [
        {
          id: "t1",
          description: "the four registrations are described with their lifetimes",
          assertionCode: js`
assert(scene.di && Array.isArray(scene.di.services) && scene.di.services.length === 4, "The harness sends the container with Board.Show(\"di\", ...): finish the container first.");
assert(scene.di && Array.isArray(scene.di.services), "The harness sends the container with Board.Show(\"di\", ...). Make sure ServiceCollection keeps its Descriptors.");
assertEqual(scene.di.services.map((s) => [s.service, s.lifetime]), [["PriceList", "Singleton"], ["RequestTally", "Scoped"], ["QuoteService", "Scoped"], ["AuditStamp", "Transient"]], "registrations in order");`,
        },
        {
          id: "t2",
          description: "a singleton is one instance shared by every scope",
          assertionCode: js`assert(scene.di && Array.isArray(scene.di.services) && scene.di.services.length === 4, "The harness sends the container with Board.Show(\"di\", ...): finish the container first.");
assertEqual(scene.di.sameSingleton, true, "root and a scope must see the same PriceList instance");`,
        },
        {
          id: "t3",
          description: "scoped means one instance per scope, different across scopes",
          assertionCode: js`
assert(scene.di && Array.isArray(scene.di.services) && scene.di.services.length === 4, "The harness sends the container with Board.Show(\"di\", ...): finish the container first.");
assertEqual(scene.di.sameWithinScope, true, "asking a scope twice for RequestTally returns the same object");
assertEqual(scene.di.sameAcrossScopes, false, "two scopes must get different RequestTally objects");`,
        },
        {
          id: "t4",
          description: "transient means a new instance every time",
          assertionCode: js`assert(scene.di && Array.isArray(scene.di.services) && scene.di.services.length === 4, "The harness sends the container with Board.Show(\"di\", ...): finish the container first.");
assertEqual(scene.di.transientsDiffer, true, "two requests for AuditStamp must give two different objects");`,
        },
        {
          id: "t5",
          description: "constructor injection builds the graph, sharing the scoped instance",
          assertionCode: js`
assert(scene.di && Array.isArray(scene.di.services) && scene.di.services.length === 4, "The harness sends the container with Board.Show(\"di\", ...): finish the container first.");
const quote = scene.di.services.find((s) => s.service === "QuoteService");
assertEqual(quote.dependsOn, ["PriceList", "RequestTally"], "QuoteService constructor parameters");
assertEqual(scene.di.sharedWithQuote, true, "the RequestTally injected into QuoteService must be the scope's own RequestTally");`,
        },
        {
          id: "t6",
          description: "a captive dependency is refused with a message naming both services",
          assertionCode: js`
assert(scene.di && Array.isArray(scene.di.services) && scene.di.services.length === 4, "The harness sends the container with Board.Show(\"di\", ...): finish the container first.");
const m = scene.di.captive;
assert(typeof m === "string" && m.includes("RequestTally") && m.includes("StaleCache"), "captive dependency message must name RequestTally and StaleCache, got: " + m);
assert(/singleton/i.test(m) && /scoped/i.test(m), "the message must say a scoped service was consumed from a singleton: " + m);`,
        },
        {
          id: "t7",
          description: "a scoped service cannot be resolved from the root provider",
          assertionCode: js`
assert(scene.di && Array.isArray(scene.di.services) && scene.di.services.length === 4, "The harness sends the container with Board.Show(\"di\", ...): finish the container first.");
const m = scene.di.rootScoped;
assert(typeof m === "string" && m !== "ok", "resolving a scoped service from the root must throw InvalidOperationException");
assert(m.includes("RequestTally") && /root/i.test(m), "the message must name the service and mention the root provider: " + m);`,
        },
      ],
      unlocks: ["ca-di"],
      checks: [
        {
          prompt: "A singleton `SlotCache` takes a scoped `DbContext` in its constructor. What actually happens in production if nothing stops it?",
          question: {
            type: "choice",
            options: [
              "Every request shares the one DbContext created for the first request",
              "A new DbContext is created for each call of SlotCache",
              "The DbContext is disposed after each request and rebuilt",
              "Nothing: the container hides the difference",
            ],
            answer: 0,
          },
          explanation: "The singleton is built once, so it captures whichever scoped instance existed at that moment and keeps it for the lifetime of the app: shared across requests and threads, long after its scope ended. That is why the container must reject the registration.",
        },
        {
          prompt: "Which lifetime suits a class that holds the signed-in user for the current request?",
          question: { type: "choice", options: ["Singleton", "Scoped", "Transient", "Any of them"], answer: 1 },
          explanation: "The user belongs to one request, and every class involved in that request should see the same value. Scoped gives exactly that. Singleton would leak one user's identity into the next request.",
        },
        {
          prompt: "Why is passing the `ServiceProvider` into a class so it can call `Get<T>()` later considered an anti-pattern?",
          question: {
            type: "choice",
            options: [
              "Its real dependencies become invisible, so it is hard to test and to reason about",
              "It is slower than constructor injection",
              "It is not allowed by the compiler",
              "It makes the class a singleton",
            ],
            answer: 0,
          },
          explanation: "With a service locator the constructor says nothing about what the class needs; you discover it by reading the body or by a runtime failure. Constructor parameters are documentation the compiler enforces.",
        },
      ],
    },
  ],
};
