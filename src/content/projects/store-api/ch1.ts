import type { Lesson } from "@/engine/types";
import { py, T } from "./shared.ts";

/** Chapter 1: On the wire. HTTP basics, a router of your own, and one place for errors. */
export const chapter1: Lesson[] = [
  // ───────────────────────────────────────── 1. request in, response out
  {
    id: "store-api-1-handle",
    title: "Request in, response out",
    minutes: 20,
    xp: 90,
    concepts: ["HTTP", "REST", "status codes", "headers", "JSON"],
    learn: `### An API is a conversation

When a shop's website shows products, the page does not own them. It asks a server ("give me the products") and the server answers. Each question is a **request**, each answer a **response**, and the language they speak is **HTTP**. An **API** is the agreed vocabulary of that conversation. In this project you write the *server* side: the code that a website, a phone app or another service talks to.

On the wire an exchange is just text:

~~~http
GET /products/3?currency=usd HTTP/1.1
Accept: application/json

HTTP/1.1 200 OK
Content-Type: application/json

{"id": 3, "name": "Studio Headphones", "price_cents": 12900}
~~~

The first block is the **request**: a *method* (what to do), a *target* (a path plus an optional \`?query\`), *headers* (metadata) and sometimes a *body*. The second block is the **response**: a *status code*, headers and a body.

### Resources and URLs

A REST-style API models things as **resources** named by nouns: \`/products\` is the collection, \`/products/3\` is one member. The URL says *what*, the method says *what to do with it*. So you do not invent \`/getProduct\` or \`/deleteProduct\`; you use \`GET /products/3\` and \`DELETE /products/3\`.

### Methods and what they promise

- \`GET\` reads. It is **safe** (changes nothing), so browsers, caches and crawlers may call it freely.
- \`POST\` creates something or triggers an action. Not safe, and **not idempotent**: sending it twice can create two things.
- \`PUT\` replaces a resource with the body you send. **Idempotent**.
- \`PATCH\` changes part of a resource.
- \`DELETE\` removes it. **Idempotent**: after the first call it is gone, and calling again leaves it gone.

*Idempotent* means "doing it ten times leaves the same state as doing it once". That is what makes retries safe after a dropped connection, so it matters a lot in practice.

### Status codes: the answer in one number

- \`200 OK\` it worked, here is the result. \`201 Created\` a new resource exists. \`204 No Content\` it worked and there is nothing to send back.
- \`400 Bad Request\` the request is malformed (broken JSON, a non-numeric page). \`401 Unauthorized\` really means "not authenticated: who are you?". \`403 Forbidden\` "I know who you are, and no". \`404 Not Found\` no such resource. \`409 Conflict\` the request clashes with current state (a duplicate SKU). \`422 Unprocessable\` the JSON parsed but the data is not valid.
- \`500 Internal Server Error\` our bug, not the client's.

The first digit is the class: 2xx success, 4xx the client got something wrong, 5xx the server did. Clients make decisions from the status, so a failed request must never come back as \`200\` with an error hidden in the body.

### Headers, bodies and statelessness

**Headers** carry metadata: \`Content-Type: application/json\` says how to read the body, \`Authorization\` carries credentials, \`Location\` points at a created resource. Header names are case-insensitive. **JSON** is the usual body format: it maps cleanly onto Python dicts and lists.

HTTP is **stateless**: every request must contain everything the server needs. The server does not remember "this is the same person as a minute ago", so a client sends its credentials with every call. That is what lets you run ten identical servers behind a load balancer.

### The model we use here

A real server listens on a network port. In these lessons the demo plays the HTTP client for you and calls your function directly. A request is a dict and a response is a dict:

~~~python
request  = {"method": "GET", "path": "/health?verbose=1", "headers": {}, "body": None}
response = {"status": 200, "headers": {"Content-Type": "application/json"}, "body": {"status": "ok"}}
~~~

Your job is \`handle(request) -> response\`. Real frameworks do the same job after a web server has parsed the bytes: **Flask** and **Django** hand your view a request object, **FastAPI** hands your function already-parsed arguments, and they all turn what you return into a response.

### Common mistakes

- Comparing the whole \`path\` to a route: the query string (\`?x=1\`) is part of the target but not part of the path.
- Returning a Python object that is not plain JSON data (a \`sqlite3.Row\`, a \`set\`, a \`datetime\`).
- Sending \`Content-Type: application/json\` on a response with no body.`,
    mission: `The shop's website, the mobile app and the warehouse scanner all want to talk to one backend. Before any product exists, the backend must prove it is alive and know how to say "no such thing".

Write the response builder and a first \`handle()\` that answers \`GET /health\` and returns a clean 404 for everything else. As soon as you Run, the API console lights up and you can send it real requests.`,
    tasks: [
      "json_response(status, body, headers): a dict with status, headers and body; set Content-Type: application/json only when there is a body",
      "handle(request): GET /health returns 200 with {\"status\": \"ok\"}",
      "Every other request returns 404 with {\"error\": {\"code\": \"not_found\", \"message\": ...}} naming the missing path",
      "Ignore the ?query part when comparing paths",
    ],
    starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 1: request in, response out.
#
# A request is a dict:  {"method": "GET", "path": "/health", "headers": {}, "body": None}
# A response is a dict: {"status": 200, "headers": {...}, "body": {...}}


def json_response(status, body=None, headers=None):
    """Build a response dict. Add Content-Type: application/json when there is a body."""
    ...


def handle(request):
    """Turn one request into one response. Support GET /health; answer 404 for anything else."""
    ...
`,
    solutionAdd: py`def json_response(status, body=None, headers=None):
    """Build the response dict every handler returns: {status, headers, body}."""
    merged = {}
    if body is not None:
        merged["Content-Type"] = "application/json"
    merged.update(headers or {})
    return {"status": status, "headers": merged, "body": body}


def handle(request):
    """Turn one request into one response."""
    method = request["method"]
    path = request["path"].split("?", 1)[0]  # the query string is not part of the path
    if method == "GET" and path == "/health":
        return json_response(200, {"status": "ok"})
    return json_response(404, {"error": {"code": "not_found", "message": f"No route for {method} {path}"}})`,
    explanation:
      "A response is just data: a status, headers and a body. json_response keeps that shape in one place so no handler has to remember it. handle() is the whole API in miniature: look at the method and path, decide, answer. Splitting the target on '?' separates the path from the query string, which will matter as soon as clients start filtering and paging.",
    hints: [
      { id: "h1", title: "The response shape", content: 'Return {"status": status, "headers": merged, "body": body}. Build `merged` from {} and add "Content-Type" only if body is not None, then merged.update(headers or {}).' },
      { id: "h2", title: "Strip the query", content: 'path = request["path"].split("?", 1)[0] keeps only what is before the first question mark.' },
      { id: "h3", title: "The 404 body", content: 'return json_response(404, {"error": {"code": "not_found", "message": f"No route for {method} {path}"}})' },
    ],
    tests: [
      {
        id: "t1",
        description: "json_response builds status, headers and body",
        assertionCode: T(py`r = json_response(200, {"a": 1})
assert r["status"] == 200, "json_response(200, ...) should set status to 200"
assert r["body"] == {"a": 1}, "The body should be exactly what was passed in"
assert _hdr(r, "Content-Type") == "application/json", "A response with a body needs the header Content-Type: application/json"`),
      },
      {
        id: "t2",
        description: "No body means no Content-Type; extra headers are kept",
        assertionCode: T(py`r = json_response(204)
assert r["status"] == 204 and r["body"] is None, "json_response(204) should have body None"
assert _hdr(r, "Content-Type") is None, "A response without a body should not claim a Content-Type"
r = json_response(201, {"id": 1}, {"Location": "/products/1"})
assert _hdr(r, "Location") == "/products/1", "Extra headers passed in should be kept"
assert _hdr(r, "Content-Type") == "application/json", "...and Content-Type should still be set when there is a body"`),
      },
      {
        id: "t3",
        description: "GET /health answers 200 with {status: ok}",
        assertionCode: T(py`r = _c("GET", "/health")
assert r["status"] == 200, "GET /health should return status 200, got " + str(r["status"])
assert r["body"] == {"status": "ok"}, 'The body should be exactly {"status": "ok"}'
assert _hdr(r, "Content-Type") == "application/json", "Send Content-Type: application/json with a JSON body"`),
      },
      {
        id: "t4",
        description: "Unknown paths answer 404 with an error object",
        assertionCode: T(py`r = _c("GET", "/nope")
assert r["status"] == 404, "An unknown path should return 404, got " + str(r["status"])
assert _code(r) == "not_found", 'Error bodies look like {"error": {"code": "not_found", "message": "..."}}'
assert "/nope" in r["body"]["error"]["message"], "The error message should mention the path that was not found"`),
      },
      {
        id: "t5",
        description: "The query string is ignored when matching the path",
        assertionCode: T(py`r = _c("GET", "/health?verbose=1")
assert r["status"] == 200, "GET /health?verbose=1 is still the /health path (got " + str(r["status"]) + "). Split off the part after '?' before comparing."`),
      },
      {
        id: "t6",
        description: "A request with no headers or body keys still works",
        assertionCode: T(py`r = handle({"method": "GET", "path": "/health"})
assert r["status"] == 200, "handle() should not require 'headers' or 'body' keys for GET /health"
r = handle({"method": "GET", "path": "/missing"})
assert r["status"] == 404`),
      },
    ],
    unlocks: ["store-console"],
    checks: [
      {
        prompt: "A phone's connection drops while it sends `PUT /products/5`, so it sends the same request again. Why is that safe?",
        question: {
          type: "choice",
          options: [
            "PUT is idempotent: applying it twice leaves the same result as once",
            "PUT is safe, so it never changes any data",
            "Servers automatically ignore duplicate requests",
            "PUT always answers 204, so the client cannot tell",
          ],
          answer: 0,
        },
        explanation:
          "Idempotent means repeating the request leaves the same state as doing it once, so a blind retry is fine. It is not the same as *safe*: a PUT does change data, it just changes it to the same thing again. `POST` is the dangerous one to retry.",
      },
      {
        prompt: "Why does every request carry its own credentials, instead of the server remembering who you are?",
        question: {
          type: "choice",
          options: [
            "HTTP is stateless, so any server instance can answer any request",
            "Browsers forget everything between requests",
            "JSON cannot store sessions",
            "It makes responses smaller",
          ],
          answer: 0,
        },
        explanation:
          "A stateless protocol means each request is self-contained. Nothing in the server's memory is needed to understand it, so you can run many identical servers and a restart loses nothing.",
      },
      {
        prompt: "The client asks for a product that does not exist. Which response is correct?",
        question: {
          type: "choice",
          options: [
            "Status 404 with an error object in the body",
            "Status 200 with {\"error\": \"not found\"} in the body",
            "Status 500, because the lookup failed",
            "Status 204 with no body",
          ],
          answer: 0,
        },
        explanation:
          "Clients, caches and monitoring tools read the status code first. A 200 that hides a failure in the body looks like success to all of them. A missing resource is the client's request problem (4xx), not a server fault (5xx).",
      },
    ],
  },

  // ───────────────────────────────────────── 2. router
  {
    id: "store-api-2-router",
    title: "A router of your own",
    minutes: 30,
    xp: 140,
    concepts: ["routing", "decorators", "path parameters", "regex", "middleware", "404 vs 405"],
    learn: `### Why a router?

The if-chain from lesson 1 does not scale: a real API has dozens of endpoints. A **router** keeps a table of *(method, pattern, handler)* and picks the right row for each request. It is the heart of every web framework, and you are going to write one.

~~~python
app = App()

@app.get("/health")
def health(request):
    return json_response(200, {"status": "ok"})
~~~

\`@app.get(...)\` is a **decorator factory**: calling it returns a function that registers the handler and hands it back unchanged. The same idea in the big frameworks:

~~~python
# Flask
@app.route("/products/<int:product_id>", methods=["GET"])
def show(product_id): ...

# FastAPI
@app.get("/products/{product_id}")
def show(product_id: int): ...

# Django (urls.py)
path("products/<int:product_id>/", views.show)
~~~

### Path parameters

A pattern such as \`/products/{product_id:int}\` has a hole. We turn the pattern into a regular expression with a **named group**:

~~~python
import re
rx = re.compile(r"^/products/(?P<product_id>[0-9]+)$")
m = rx.match("/products/42")
m.groupdict()          # {'product_id': '42'}  (always text; convert with int())
~~~

Three details make it correct. Anchor the regex with \`^\` and \`$\` or \`/products/12abc\` would match. \`re.escape\` the literal parts, or the dot in \`/openapi.json\` matches any character. And a plain \`{name}\` must not match a slash, so \`/files/a/b\` is not \`name = "a/b"\`. A type converter (\`int\`) both restricts what matches (\`/products/abc\` is simply a 404) and converts the text to a number for the handler.

### 404 or 405?

If *no* route matches the path, the answer is **404 Not Found**. If a route matches the path but not the method (\`DELETE /health\`), the answer is **405 Method Not Allowed**, with an \`Allow\` header listing what *is* allowed. Clients can tell "wrong URL" from "wrong verb".

### Middleware: the onion

Some jobs apply to every request: turn crashes into responses, check credentials, add headers. **Middleware** wraps the handler. Each layer is a function \`middleware(request, call_next)\` that can act before, call \`call_next(request)\`, act after, or return early without calling it.

~~~python
def timing(request, call_next):
    response = call_next(request)       # run everything inside this layer
    response["headers"]["X-Seen"] = "yes"
    return response
~~~

The first middleware registered is the **outermost** layer. To build the chain, wrap from the inside out. Careful with closures in a loop: a \`lambda\` inside the loop would capture the loop *variable*, not its value at that moment. A tiny helper function (\`bind\`) gives each layer its own variables.

### What handlers receive

\`normalize()\` turns the raw request into one predictable shape: upper-case method, path without the query, the query string on its own, **lower-cased** header names (HTTP header names are case-insensitive), and slots for \`params\`, \`route\` and \`user\` that later steps fill in.

### Common mistakes

- Forgetting to anchor the regex, or to escape literal characters.
- The closure-in-a-loop bug when building the middleware chain.
- Treating path parameters as numbers before converting them: they arrive as text.
- Registering the same route twice and keeping both. Here a second registration of the same method and pattern **replaces** the first, so you can upgrade a handler later in the project.`,
    mission: `One \`if\` per endpoint will not survive a full shop API. Build the framework core now: a registry of routes, path parameters, proper 404 and 405 answers, and a middleware chain that later lessons use for error handling and security.

Your router replaces the hand-written \`handle()\` from lesson 1. After Run you can try \`POST /health\` in the console and see a real 405.`,
    tasks: [
      "error_response(): the one error shape {\"error\": {\"code\", \"message\", \"details\"?}} with optional headers",
      "compile_pattern() turns /products/{product_id:int} into a regex and converters; normalize() cleans up the raw request",
      "App.route (a decorator that replaces an earlier route with the same method and pattern), App.use, and bind() for the middleware chain",
      "App.find() and App.handle(): match, convert params, answer 404 or 405 with an Allow header, run the middleware chain; then register GET /health and make handle() delegate to the app",
    ],
    starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 2: build the router. It replaces the if-chain in handle() from lesson 1.
import re
from urllib.parse import unquote, urlsplit

# kind -> (regex for one path segment, function that converts the matched text)
CONVERTERS = {"str": (r"[^/]+", str), "int": (r"[0-9]+", int)}


def error_response(status, code, message, details=None, headers=None):
    """Every error answers with {"error": {"code": ..., "message": ..., "details": ... (only if given)}}."""
    ...


def compile_pattern(pattern):
    """'/products/{product_id:int}' -> (compiled regex, {'product_id': int}).

    Split the pattern on {...}; escape the literal pieces; turn each {name} or {name:kind}
    into a named group built from CONVERTERS. Anchor the whole regex with ^ and $."""
    ...


def normalize(request):
    """Copy a raw request into: method (upper-case), path (no query), query_string,
    headers (lower-case names), body, params ({}), route (None), user (None)."""
    ...


def bind(middleware, call_next):
    """Return a one-argument function that calls middleware(request, call_next)."""
    ...


class App:
    def __init__(self):
        self.routes = []
        self.middleware = []

    def route(self, method, pattern):
        """Decorator factory. Store a dict per route (method, pattern, regex, converters, handler).
        A second route with the same method and pattern replaces the first. Return the handler."""
        ...

    def get(self, pattern):
        return self.route("GET", pattern)

    def post(self, pattern):
        return self.route("POST", pattern)

    def put(self, pattern):
        return self.route("PUT", pattern)

    def patch(self, pattern):
        return self.route("PATCH", pattern)

    def delete(self, pattern):
        return self.route("DELETE", pattern)

    def use(self, middleware):
        """Add a middleware. The first one added is the outermost layer."""
        ...

    def find(self, request):
        """Return (route, params, allowed_methods): the route matching method and path with its
        converted params, or route None plus the methods that match the path alone."""
        ...

    def handle(self, request):
        """normalize, find the route, fill request['params'] and request['route'], then run the
        middleware chain around the handler. With no route, the 'handler' answers 404 or 405 + Allow."""
        ...


app = App()

# TODO: register GET /health on app with a decorator, answering {"status": "ok"}


def handle(request):
    """Hand every request to the app. (This replaces the lesson 1 version.)"""
    ...
`,
    solutionAdd: py`import re
from urllib.parse import unquote, urlsplit

# kind -> (regex for one path segment, function that converts the matched text)
CONVERTERS = {"str": (r"[^/]+", str), "int": (r"[0-9]+", int)}


def error_response(status, code, message, details=None, headers=None):
    """The one error shape every endpoint uses: {"error": {"code", "message", "details"?}}."""
    error = {"code": code, "message": message}
    if details:
        error["details"] = details
    return json_response(status, {"error": error}, headers)


def compile_pattern(pattern):
    """'/products/{product_id:int}' -> (compiled regex, {'product_id': int})."""
    converters = {}
    parts = []
    for piece in re.split(r"(\{[^}]+\})", pattern):
        if piece.startswith("{"):
            name, _, kind = piece[1:-1].partition(":")
            regex, convert = CONVERTERS[kind or "str"]
            converters[name] = convert
            parts.append(f"(?P<{name}>{regex})")
        else:
            parts.append(re.escape(piece))
    return re.compile("^" + "".join(parts) + "$"), converters


def normalize(request):
    """Copy a raw request into the one shape every handler and middleware relies on."""
    target = urlsplit(request.get("path") or "/")
    return {
        "method": str(request.get("method") or "GET").upper(),
        "path": target.path or "/",
        "query_string": target.query,
        "headers": {str(k).lower(): v for k, v in (request.get("headers") or {}).items()},
        "body": request.get("body"),
        "params": {},
        "route": None,
        "user": None,
    }


def bind(middleware, call_next):
    """Give each middleware layer its own call_next (a lambda in the loop would share one)."""
    return lambda request: middleware(request, call_next)


def no_route(request, allowed):
    """The terminal 'handler' used when nothing matched: 405 if the path exists, else 404."""
    if allowed:
        return error_response(
            405,
            "method_not_allowed",
            f"{request['method']} is not allowed on {request['path']}",
            headers={"Allow": ", ".join(sorted(allowed))},
        )
    return error_response(404, "not_found", f"No route for {request['method']} {request['path']}")


class App:
    def __init__(self):
        self.routes = []
        self.middleware = []

    def route(self, method, pattern):
        def register(handler):
            method_name = method.upper()
            regex, converters = compile_pattern(pattern)
            # registering the same method + pattern again replaces the old route
            self.routes = [r for r in self.routes if (r["method"], r["pattern"]) != (method_name, pattern)]
            self.routes.append(
                {"method": method_name, "pattern": pattern, "regex": regex, "converters": converters, "handler": handler}
            )
            return handler

        return register

    def get(self, pattern):
        return self.route("GET", pattern)

    def post(self, pattern):
        return self.route("POST", pattern)

    def put(self, pattern):
        return self.route("PUT", pattern)

    def patch(self, pattern):
        return self.route("PATCH", pattern)

    def delete(self, pattern):
        return self.route("DELETE", pattern)

    def use(self, middleware):
        """Add a middleware layer. The first one added is the outermost."""
        self.middleware.append(middleware)

    def find(self, request):
        allowed = set()
        for route in self.routes:
            match = route["regex"].match(request["path"])
            if not match:
                continue
            if route["method"] != request["method"]:
                allowed.add(route["method"])
                continue
            params = {name: route["converters"][name](unquote(text)) for name, text in match.groupdict().items()}
            return route, params, allowed
        return None, None, allowed

    def handle(self, request):
        request = normalize(request)
        route, params, allowed = self.find(request)
        if route:
            request["params"] = params
            request["route"] = route["pattern"]
            call_next = route["handler"]
        else:
            call_next = lambda req: no_route(req, allowed)
        for middleware in reversed(self.middleware):
            call_next = bind(middleware, call_next)
        return call_next(request)


app = App()


@app.get("/health")
def health(request):
    """Liveness probe: is the API up?"""
    return json_response(200, {"status": "ok"})


def handle(request):
    """The entry point the outside world calls. Everything goes through the app."""
    return app.handle(request)`,
    explanation:
      "compile_pattern turns the human-friendly pattern into a regex with named groups and remembers how to convert each one. App.route is a decorator factory: it registers the handler and returns it unchanged, so the function stays callable. App.handle normalizes the request, finds the route, then wraps the handler in the middleware layers from the inside out, so the first layer added is the outermost. When nothing matches, the same chain still runs around a handler that answers 404 or 405, which keeps behaviour like logging and error handling uniform for every response.",
    hints: [
      { id: "h1", title: "Pattern to regex", content: 'for piece in re.split(r"(\\{[^}]+\\})", pattern): pieces that start with "{" are parameters (name, _, kind = piece[1:-1].partition(":")); everything else goes through re.escape. Join the parts and wrap them in "^" ... "$".' },
      { id: "h2", title: "The chain", content: "Start with call_next = the handler. Then for middleware in reversed(self.middleware): call_next = bind(middleware, call_next). bind returns lambda request: middleware(request, call_next)." },
      { id: "h3", title: "405 vs 404", content: 'While looping over routes, if the regex matches the path but the method differs, add route["method"] to a set and keep looking. At the end: empty set means 404, otherwise 405 with headers={"Allow": ", ".join(sorted(allowed))}.' },
    ],
    tests: [
      {
        id: "t1",
        description: "error_response builds the standard error object",
        assertionCode: T(py`r = error_response(404, "not_found", "Nope")
assert r["status"] == 404 and r["body"] == {"error": {"code": "not_found", "message": "Nope"}}, "error_response(404, 'not_found', 'Nope') should have the body {'error': {'code': 'not_found', 'message': 'Nope'}}"
r = error_response(422, "validation_error", "Bad", [{"field": "sku", "message": "required"}], {"X-Test": "1"})
assert r["body"]["error"]["details"] == [{"field": "sku", "message": "required"}], "details should be added under error['details']"
assert _hdr(r, "X-Test") == "1", "extra headers should be passed through"`),
      },
      {
        id: "t2",
        description: "Decorators register handlers and return them unchanged",
        assertionCode: T(py`a = App()

@a.route("GET", "/ping")
def ping(request):
    return json_response(200, {"pong": True})

assert callable(ping) and ping.__name__ == "ping", "The decorator must return the original function"
r = a.handle({"method": "GET", "path": "/ping"})
assert r["status"] == 200 and r["body"] == {"pong": True}, "A registered GET route should be called"
@a.post("/things")
def make(request):
    return json_response(201, {"made": True})
assert a.handle({"method": "POST", "path": "/things"})["status"] == 201, "app.post should register a POST route"
assert a.handle({"method": "get", "path": "/ping"})["status"] == 200, "Method names are case-insensitive"`),
      },
      {
        id: "t3",
        description: "Typed path parameters are converted; bad ones are 404",
        assertionCode: T(py`a = App()
seen = {}

@a.get("/items/{item_id:int}")
def item(request):
    seen.update(request["params"])
    return json_response(200, request["params"])

r = a.handle({"method": "GET", "path": "/items/42"})
assert r["status"] == 200 and seen["item_id"] == 42 and type(seen["item_id"]) is int, "{item_id:int} should give the handler the int 42"
assert a.handle({"method": "GET", "path": "/items/abc"})["status"] == 404, "/items/abc must not match an int parameter"
assert a.handle({"method": "GET", "path": "/items/12abc"})["status"] == 404, "Anchor the regex so /items/12abc does not match"
assert a.handle({"method": "GET", "path": "/items/-1"})["status"] == 404, "A negative number is not a valid id here"`),
      },
      {
        id: "t4",
        description: "String parameters stay inside one path segment and are decoded",
        assertionCode: T(py`a = App()

@a.get("/tags/{name}")
def tag(request):
    return json_response(200, request["params"])

assert a.handle({"method": "GET", "path": "/tags/blue%20mug"})["body"] == {"name": "blue mug"}, "Percent-encoded text should be decoded (unquote)"
assert a.handle({"method": "GET", "path": "/tags/a/b"})["status"] == 404, "{name} must not match across a slash"

@a.get("/openapi.json")
def doc(request):
    return json_response(200, {})
assert a.handle({"method": "GET", "path": "/openapi.json"})["status"] == 200
assert a.handle({"method": "GET", "path": "/openapiXjson"})["status"] == 404, "Escape literal text with re.escape so '.' is not a wildcard"`),
      },
      {
        id: "t5",
        description: "A wrong method on a known path is 405 with an Allow header",
        assertionCode: T(py`a = App()

@a.get("/items/{item_id:int}")
def get_item(request):
    return json_response(200, {})

@a.delete("/items/{item_id:int}")
def del_item(request):
    return json_response(204)

r = a.handle({"method": "PUT", "path": "/items/3"})
assert r["status"] == 405, "PUT /items/3 matches a path but not a method, so answer 405, got " + str(r["status"])
assert _code(r) == "method_not_allowed", "The error code should be method_not_allowed"
assert _hdr(r, "Allow") == "DELETE, GET", "Allow should list the allowed methods, sorted: DELETE, GET (got " + repr(_hdr(r, "Allow")) + ")"
assert a.handle({"method": "GET", "path": "/nothing"})["status"] == 404, "An unknown path is still 404"`),
      },
      {
        id: "t6",
        description: "Handlers see a normalized request",
        assertionCode: T(py`a = App()
box = {}

@a.get("/echo")
def echo(request):
    box.update(request)
    return json_response(200, {})

a.handle({"method": "GET", "path": "/echo?x=1&y=two", "headers": {"X-Token": "abc", "Accept": "text/plain"}})
assert box["path"] == "/echo", "request['path'] should not include the query string"
assert box["query_string"] == "x=1&y=two", "request['query_string'] should hold everything after the '?'"
assert box["headers"].get("x-token") == "abc", "Header names should be lower-cased in request['headers']"
assert box["route"] == "/echo" and box["params"] == {} and box["user"] is None and box["body"] is None, "Expected route, params, user and body keys"`),
      },
      {
        id: "t7",
        description: "Middleware wraps handlers; the first one added is outermost",
        assertionCode: T(py`a = App()
order = []

def outer(request, call_next):
    order.append("outer in")
    response = call_next(request)
    order.append("outer out")
    response["headers"]["X-Outer"] = "1"
    return response

def inner(request, call_next):
    order.append("inner in")
    response = call_next(request)
    order.append("inner out")
    return response

a.use(outer)
a.use(inner)

@a.get("/x")
def x(request):
    order.append("handler")
    return json_response(200, {})

r = a.handle({"method": "GET", "path": "/x"})
assert order == ["outer in", "inner in", "handler", "inner out", "outer out"], "Expected the onion order outer in, inner in, handler, inner out, outer out but got " + str(order)
assert _hdr(r, "X-Outer") == "1", "A middleware can change the response on its way out"

def gate(request, call_next):
    return json_response(429, {"slow": "down"})
b = App()
b.use(gate)

@b.get("/y")
def y(request):
    raise AssertionError("the handler must not run when a middleware returns early")

assert b.handle({"method": "GET", "path": "/y"})["status"] == 429, "A middleware may return a response without calling call_next"`),
      },
      {
        id: "t8",
        description: "Registering a route again replaces it; middleware also wraps 404s",
        assertionCode: T(py`a = App()

@a.get("/x")
def one(request):
    return json_response(200, {"v": 1})

@a.get("/x")
def two(request):
    return json_response(200, {"v": 2})

assert a.handle({"method": "GET", "path": "/x"})["body"] == {"v": 2}, "The newer handler should win"
assert len([r for r in a.routes if r["pattern"] == "/x"]) == 1, "There should be a single GET /x route"
seen = []
a.use(lambda request, call_next: (seen.append(request["path"]), call_next(request))[1])
assert a.handle({"method": "GET", "path": "/missing"})["status"] == 404
assert seen == ["/missing"], "Middleware should run for 404 responses too"`),
      },
      {
        id: "t9",
        description: "handle() serves GET /health through the app; other methods get 405",
        assertionCode: T(py`r = _c("GET", "/health")
assert r["status"] == 200 and r["body"] == {"status": "ok"}, "GET /health should still return 200 {'status': 'ok'}"
r = _c("GET", "/nothing/here")
assert r["status"] == 404 and _code(r) == "not_found"
r = _c("POST", "/health")
assert r["status"] == 405, "POST /health exists as a path but not for POST, so 405"
assert _hdr(r, "Allow") == "GET", "Allow should be GET"
assert callable(app.get) and isinstance(app, App), "Create the app with app = App()"`),
      },
    ],
    unlocks: ["store-routes"],
    checks: [
      {
        prompt: "`DELETE /health` arrives but only `GET /health` is registered. What should the router answer?",
        question: {
          type: "choice",
          options: [
            "405 Method Not Allowed with an Allow: GET header",
            "404 Not Found",
            "400 Bad Request",
            "200 OK with an empty body",
          ],
          answer: 0,
        },
        explanation:
          "The path exists, so 404 would be misleading. 405 tells the client the verb is wrong, and the `Allow` header tells it which verbs would work.",
      },
      {
        prompt: "You register middleware A, then B, then C with `app.use`. In what order does a request pass through them?",
        question: { type: "order", items: ["A", "B", "C"] },
        explanation:
          "The first middleware added is the outermost layer, so the request enters A, then B, then C, then the handler. The response travels back out in reverse: C, B, A. That is why error handling is registered first.",
      },
      {
        prompt: "Why does the middleware chain use a helper like `bind(middleware, call_next)` instead of a `lambda` written directly inside the `for` loop?",
        question: {
          type: "choice",
          options: [
            "A lambda in the loop captures the loop variables, so every layer would call the last middleware",
            "Lambdas cannot take two arguments",
            "bind makes the middleware run faster",
            "Python forbids defining functions inside loops",
          ],
          answer: 0,
        },
        explanation:
          "Closures capture variables, not values. By the time the lambdas run, the loop has finished and the variables hold their last values. A helper function creates a new scope per layer, so each one keeps its own `middleware` and `call_next`.",
      },
    ],
  },

  // ───────────────────────────────────────── 3. errors
  {
    id: "store-api-3-errors",
    title: "One place for errors",
    minutes: 25,
    xp: 120,
    concepts: ["exceptions", "error middleware", "500 vs 4xx", "logging", "not leaking internals"],
    learn: `### Two kinds of failure

Some failures are the **client's** doing: asking for a product that does not exist, sending a bad page number. The right answer is a precise 4xx. Others are **ours**: a bug, a failed query, a typo. The right answer is a 500, and the client should learn nothing about the internals.

If every handler checks and returns errors itself, you get repetitive code and missed cases. A better design uses exceptions:

~~~python
raise ApiError(404, "not_found", "Product 7 does not exist")
~~~

Raise it from anywhere (a handler, a helper, deep in the database layer). The one outermost middleware catches it and builds the response. That is **central error handling**.

### The shape of the middleware

~~~python
def errors_middleware(request, call_next):
    try:
        return call_next(request)
    except ApiError as err:
        ...        # expected: answer with err.status and the error object
    except Exception as exc:
        ...        # unexpected: log it, answer a generic 500
~~~

Order matters in \`except\`: the specific \`ApiError\` first, then the catch-all. Note \`except Exception\` and not a bare \`except:\`: a bare one also swallows things like \`KeyboardInterrupt\`.

### Never leak internals

The 500 body should say only that something went wrong. A stack trace, a SQL fragment or a file path in a response hands attackers a map. But the details are valuable to *you*, so record them server side (here an in-memory \`ERROR_LOG\`; in production a logger or an error tracker like Sentry).

### A forgotten return

Handlers return a response dict. If one forgets to, Python gives \`None\`, and the layer above would crash in a confusing way. Check what comes back and turn a bad return into a 500 with a clear log entry.

### In the frameworks

~~~python
# Flask
abort(404)                      # raises an HTTP exception
@app.errorhandler(Exception)    # one place to answer it

# FastAPI
raise HTTPException(status_code=404, detail="not found")
@app.exception_handler(MyError)

# Django
raise Http404("no such product")   # plus handler500 and middleware
~~~

### Common mistakes

- \`except Exception: pass\`, which hides bugs completely.
- Returning \`str(exc)\` to the client (it often contains table names or paths).
- Answering \`200\` with an error in the body, or a \`500\` for something the client caused.
- Registering the error middleware last: errors raised by *outer* layers then escape it.`,
    mission: `Right now one unexpected bug in any handler would crash the whole call. The shop cannot work that way: a bad request should get a clean JSON error and a bug should get a safe 500 while the details go to the server log.

Add an \`ApiError\` exception and an error middleware that guarantees \`handle()\` always returns a proper response. The request log pane marks these server-side errors for you.`,
    tasks: [
      "ApiError(status, code, message, details=None, headers=None): an exception carrying everything an error response needs",
      "errors_middleware(request, call_next): ApiError becomes its error_response; any other exception is appended to ERROR_LOG and becomes a generic 500 {\"code\": \"internal_error\"}",
      "A handler that returns something other than a response dict must also become a 500",
      "Register it with app.use, and add recent_errors() returning the last 20 log entries",
    ],
    starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 3: one place for errors.
import traceback

ERROR_LOG = []  # server-side only: what really went wrong (never sent to the client)


class ApiError(Exception):
    """An error the client should hear about. Raise it anywhere."""

    # TODO: __init__(self, status, code, message, details=None, headers=None)
    #       keep every argument as an attribute with the same name
    pass


def errors_middleware(request, call_next):
    """Outermost layer. ApiError -> its status and error object. Anything else -> log it,
    answer 500 with code "internal_error" and a generic message. A non-dict return -> 500 too."""
    ...


# TODO: register errors_middleware on the app with app.use(...)


def recent_errors():
    """The last 20 entries of ERROR_LOG (the demo's request log shows them next to 500s)."""
    ...
`,
    solutionAdd: py`import traceback

ERROR_LOG = []  # server-side only: what really went wrong (never sent to the client)


class ApiError(Exception):
    """An error the client should hear about. Raise it anywhere; errors_middleware answers it."""

    def __init__(self, status, code, message, details=None, headers=None):
        super().__init__(message)
        self.status = status
        self.code = code
        self.message = message
        self.details = details
        self.headers = headers


def errors_middleware(request, call_next):
    """Outermost layer: no exception escapes as a crash, every failure becomes a JSON response."""
    try:
        response = call_next(request)
        if not isinstance(response, dict) or "status" not in response:
            raise TypeError(f"{request['method']} {request['path']} returned {type(response).__name__}, not a response dict")
        return response
    except ApiError as err:
        return error_response(err.status, err.code, err.message, err.details, err.headers)
    except Exception as exc:
        ERROR_LOG.append(
            {
                "request": f"{request['method']} {request['path']}",
                "type": type(exc).__name__,
                "message": str(exc),
                "trace": traceback.format_exc(),
            }
        )
        return error_response(500, "internal_error", "Something went wrong on our side.")


app.use(errors_middleware)


def recent_errors():
    """The last 20 server-side error entries."""
    return ERROR_LOG[-20:]`,
    explanation:
      "ApiError carries a status, a stable machine-readable code and a human message. errors_middleware sits outside every other layer, so whatever a handler or an inner layer raises ends up as a response. Expected errors keep their own status. Unexpected ones are logged with full detail on the server and answered with an anonymous 500, so the client learns nothing about your internals. Checking the return type catches the classic forgotten 'return'.",
    hints: [
      { id: "h1", title: "The exception", content: "Call super().__init__(message) and then store status, code, message, details and headers as attributes so the middleware can read them." },
      { id: "h2", title: "Catch order", content: "try: ... return call_next(request)  except ApiError as err: return error_response(err.status, err.code, err.message, err.details, err.headers)  except Exception as exc: (log, then return a 500)." },
      { id: "h3", title: "Forgotten return", content: 'After response = call_next(request), check isinstance(response, dict) and "status" in response. If not, raise a TypeError inside the try, so the generic handler logs it and answers 500.' },
    ],
    tests: [
      {
        id: "t1",
        description: "ApiError is an exception that carries its fields",
        assertionCode: T(py`e = ApiError(404, "not_found", "Gone")
assert isinstance(e, Exception), "ApiError must inherit from Exception"
assert (e.status, e.code, e.message) == (404, "not_found", "Gone"), "ApiError should keep status, code and message as attributes"
assert e.details is None and e.headers is None, "details and headers default to None"
e = ApiError(409, "conflict", "Dup", details=[{"field": "sku"}], headers={"X-A": "1"})
assert e.details == [{"field": "sku"}] and e.headers == {"X-A": "1"}`),
      },
      {
        id: "t2",
        description: "An ApiError becomes its own error response",
        assertionCode: T(py`a = App()
a.use(errors_middleware)

@a.get("/clash")
def clash(request):
    raise ApiError(409, "conflict", "Already there", details=[{"field": "sku", "message": "taken"}], headers={"X-Why": "dup"})

r = a.handle({"method": "GET", "path": "/clash"})
assert r["status"] == 409, "ApiError(409, ...) should produce status 409, got " + str(r["status"])
assert r["body"]["error"]["code"] == "conflict" and r["body"]["error"]["message"] == "Already there"
assert r["body"]["error"]["details"] == [{"field": "sku", "message": "taken"}], "details should be included"
assert _hdr(r, "X-Why") == "dup", "headers on the ApiError should reach the response"`),
      },
      {
        id: "t3",
        description: "Unexpected exceptions become a safe 500 and are logged",
        assertionCode: T(py`import json
a = App()
a.use(errors_middleware)

@a.get("/boom")
def boom(request):
    raise ValueError("secret table is users_v2")

before = len(ERROR_LOG)
r = a.handle({"method": "GET", "path": "/boom"})
assert r["status"] == 500, "An unexpected exception should become status 500, got " + str(r["status"])
assert r["body"]["error"]["code"] == "internal_error", 'The error code should be "internal_error"'
assert "secret" not in json.dumps(r["body"]) and "ValueError" not in json.dumps(r["body"]), "Never put exception text or types in the response body"
assert len(ERROR_LOG) == before + 1, "Append one entry to ERROR_LOG for each unexpected exception"
assert ERROR_LOG[-1]["type"] == "ValueError" and "secret" in ERROR_LOG[-1]["message"], "The log entry should keep the exception type and message"`),
      },
      {
        id: "t4",
        description: "A handler that forgets to return gives a 500, not a crash",
        assertionCode: T(py`a = App()
a.use(errors_middleware)

@a.get("/forgot")
def forgot(request):
    json_response(200, {"ok": True})   # no return!

r = a.handle({"method": "GET", "path": "/forgot"})
assert r["status"] == 500, "A handler returning None should produce a 500 response, got " + str(r["status"])
assert ERROR_LOG[-1]["type"] == "TypeError", "Raise a TypeError for a bad return value so it is logged"`),
      },
      {
        id: "t5",
        description: "Normal responses pass through; inner middleware errors are caught too",
        assertionCode: T(py`a = App()
a.use(errors_middleware)

def faulty(request, call_next):
    raise RuntimeError("inner layer broke")

a.use(faulty)

@a.get("/fine")
def fine(request):
    return json_response(200, {"fine": True})

r = a.handle({"method": "GET", "path": "/fine"})
assert r["status"] == 500, "errors_middleware must be the outer layer and also catch errors from middleware inside it"
b = App()
b.use(errors_middleware)

@b.get("/fine")
def fine2(request):
    return json_response(200, {"fine": True})
assert b.handle({"method": "GET", "path": "/fine"}) == {"status": 200, "headers": {"Content-Type": "application/json"}, "body": {"fine": True}}, "A good response must pass through unchanged"`),
      },
      {
        id: "t6",
        description: "The real app is protected and recent_errors() reports",
        assertionCode: T(py`assert errors_middleware in app.middleware, "Register the middleware with app.use(errors_middleware)"

@app.get("/__crash")
def crash(request):
    return {}["missing"]

r = _c("GET", "/__crash")
assert r["status"] == 500 and _code(r) == "internal_error", "handle() must answer 500 for a crashing route"
errors = recent_errors()
assert isinstance(errors, list) and errors and errors[-1]["type"] == "KeyError", "recent_errors() should return the latest log entries"
for i in range(30):
    _c("GET", "/__crash")
assert len(recent_errors()) == 20, "recent_errors() returns at most the last 20 entries"
app.routes = [r for r in app.routes if r["pattern"] != "/__crash"]`),
      },
    ],
    unlocks: ["store-errors"],
    checks: [
      {
        prompt: "A handler hits a bug and raises `KeyError: 'sku'`. What should the client receive?",
        question: {
          type: "choice",
          options: [
            "A 500 with a generic message, while the details are logged on the server",
            "A 500 whose body contains the traceback, to help debugging",
            "A 400 saying KeyError: 'sku'",
            "A 200 with an empty body",
          ],
          answer: 0,
        },
        explanation:
          "A bug is the server's fault, so 5xx. The body stays generic because tracebacks and exception text reveal internals. Your log keeps everything you need to fix it.",
      },
      {
        prompt: "Why does `errors_middleware` have to be the **outermost** layer?",
        question: {
          type: "choice",
          options: [
            "So it also catches exceptions raised by every middleware inside it",
            "So it runs last, after the response is built",
            "Because Python requires the first middleware to handle errors",
            "So the handler never runs",
          ],
          answer: 0,
        },
        explanation:
          "A `try/except` only protects the code it wraps. Layers outside it are not covered. Registering error handling first puts it around everything else.",
      },
    ],
  },
];
