import type { ConceptLesson } from "../../learn/types.ts";

/** Fenced plain-text block (headers, tables) for lesson prose. */
const txt = (s: string) => "~~~text\n" + s.trim() + "\n~~~";
/** Paragraphs joined with blank lines. */
const P = (...paras: string[]) => paras.join("\n\n");

/** Lessons 8 to 10 of "Remember the answer": HTTP caching, shared caches and CDNs, judgment. */
export const cachingLessonsC: ConceptLesson[] = [
  // ─────────────────────────────── 8. HTTP caching ───────────────────────────────
  {
    id: "fnd-cache-8-http",
    title: "Caching in the browser",
    summary: "Cache-Control, ETag and 304, Last-Modified, and stale-while-revalidate: caching by headers.",
    minutes: 11,
    xp: 65,
    steps: [
      {
        kind: "explain",
        title: "The web has a cache built in",
        body: P(
          "Every browser keeps a cache of the responses it has fetched, and every server decides how that cache may behave by adding **headers** to its responses. No code in the page: just a few lines of metadata.",
          "When a browser needs a URL it has seen before, there are three possible outcomes:\n\n1. **Use the stored copy** without asking anyone (the copy is *fresh*).\n2. **Ask the server “has it changed?”** and reuse the copy if the answer is no (**revalidation**).\n3. **Download it all again.**",
          "Play with the playground below. Choose headers on the left, then load the page, wait, and publish new versions. Every load adds a line to the log explaining what the browser did.",
        ),
        widget: { type: "cache-http", props: { initial: "none" } },
      },
      {
        kind: "question",
        title: "Zero requests",
        body: "Choose a Cache-Control header so that **after the first download, the next two loads send no request at all**.",
        widget: { type: "cache-http", props: { initial: "none" } },
        question: { type: "widget", goal: { nCacheMin: 2 }, prompt: "Load the page three times with a header that allows reuse." },
        explanation: "`Cache-Control: max-age=60` says “this response is fresh for 60 seconds”. While it is fresh the browser answers from its own cache in zero milliseconds, with no network at all. It's the fastest request there is: the one you never make.",
      },
      {
        kind: "explain",
        title: "The directives that matter",
        body: P(
          "`Cache-Control` takes a comma-separated list of directives. The ones you will meet constantly:",
          txt(`
max-age=N        fresh for N seconds; reuse without asking
s-maxage=N       like max-age, but only for shared caches (CDNs)
no-cache         you may KEEP it, but must ask the server before each reuse
no-store         do not keep it at all
public / private shared caches may keep it / only the user's own browser may
immutable        it will never change: don't even revalidate
stale-while-revalidate=N   may show a stale copy for N seconds while refreshing
`),
          "The name **no-cache** is a famous trap: it does *not* mean “don't cache”. It means “cache it, but revalidate every time”. The directive that really forbids storing is **no-store**.",
        ),
      },
      {
        kind: "question",
        title: "Read the header",
        body: "Which header asks the browser to **store** a response but **check with the server before every reuse**?",
        question: {
          type: "choice",
          options: ["Cache-Control: no-store", "Cache-Control: no-cache", "Cache-Control: max-age=0, private", "Cache-Control: immutable"],
          answer: 1,
        },
        explanation: "**no-cache** stores the response and forces revalidation. `no-store` never stores it (use it for pages with sensitive data), and `immutable` is the opposite of revalidating. (`max-age=0` also makes it immediately stale, but `no-cache` states the intent directly.)",
      },
      {
        kind: "explain",
        title: "Asking “has it changed?”",
        body: P(
          "When a stored copy isn't fresh, the browser needn't download everything again. It can send a **conditional request** carrying a *validator* from the old response:\n\n- an **ETag**: an opaque fingerprint of the content, such as `\"v7\"`. The browser sends it back as `If-None-Match: \"v7\"`.\n- a **Last-Modified** date, sent back as `If-Modified-Since`.",
          "If nothing changed, the server replies **304 Not Modified** with *no body*, only headers. The browser reuses its copy. If the page did change, the server answers a normal **200** with the new content.",
          txt(`
GET /menu HTTP/1.1
If-None-Match: "v7"

HTTP/1.1 304 Not Modified      (a few hundred bytes, no body)
ETag: "v7"
`),
          "A 304 still costs a round trip, but not the transfer of the page.",
        ),
      },
      {
        kind: "question",
        title: "Make a 304",
        body: "Use **no-cache** with a validator so that **two loads in a row come back as 304 Not Modified**, and no reader ever sees an out-of-date version.",
        widget: { type: "cache-http", props: { initial: "none" } },
        question: { type: "widget", goal: { cc: "no-cache", n304Min: 2, everStale: false }, prompt: "Pick no-cache, turn on ETag, and load the page three times." },
        explanation: "The first load downloaded the page; every later load asked “has it changed?” and got a tiny 304. The reader always sees the latest version, and you saved the bandwidth. Without an ETag or Last-Modified, `no-cache` can't revalidate, so it would download the whole page every time.",
      },
      {
        kind: "question",
        title: "Count the bytes",
        body: "A page is **48 kB**. A 304 response is about **0.3 kB**. The browser loads it once and then revalidates **9 more times** (all 304). How many kB cross the network in total?",
        question: { type: "number", answer: 50.7, tolerance: 0.1, unit: "kB" },
        explanation: "48 + 9 × 0.3 = **50.7 kB**, versus 480 kB for ten full downloads. Revalidation is cheap in bytes but not in latency: each one is still a round trip. To avoid even that, the response needs a `max-age`.",
      },
      {
        kind: "explain",
        title: "Fast now, fresh soon",
        body: P(
          "`max-age` gives speed but may show an old page for up to that long after an edit. `no-cache` is always fresh but always waits for the server. **stale-while-revalidate** splits the difference: after the copy goes stale, the browser may still show it **immediately** for an extra window, and refreshes it in the background so the *next* visit is current.",
          "Pick the last option, `max-age=60 + swr=30`, below. Load, wait 60 seconds, and load again.",
        ),
        widget: { type: "cache-http", props: { initial: "swr", directives: ["max-age", "swr"], etag: true } },
      },
      {
        kind: "question",
        title: "Instant but a little old",
        body: "Using `max-age=60` with `stale-while-revalidate=30`, produce a load that is **served stale from the cache while a refresh happens in the background**.",
        widget: { type: "cache-http", props: { initial: "swr", directives: ["max-age", "swr"], etag: true } },
        question: { type: "widget", goal: { cc: "swr", nStaleMin: 1 }, prompt: "Load, wait 60 s, load again." },
        explanation: "At 60 s the copy was no longer fresh but still inside the 30-second stale window, so the browser showed it at once and revalidated behind the scenes. The reader never waited, and the next load shows the current page. It's a great fit for content where “a minute old” is fine and waiting is not.",
      },
      {
        kind: "explain",
        title: "The cost of being fresh for a minute",
        body: P(
          "The price of `max-age` is that **you can't call it back**. Once a browser has a fresh copy, nothing you do on the server reaches it until the minute is up. Publish an update and some visitors keep seeing the old one.",
          "Try it: choose `max-age=60`, load the page, publish a new version, and load again.",
        ),
        widget: { type: "cache-http", props: { initial: "max-age", directives: ["max-age", "no-cache"], etag: true } },
      },
      {
        kind: "question",
        title: "Cause an old page",
        body: "With `max-age=60`, make a visitor see an **out-of-date version**.",
        widget: { type: "cache-http", props: { initial: "none" } },
        question: { type: "widget", goal: { cc: "max-age", everStale: true }, prompt: "Load, publish a new version, load again." },
        explanation: "The second load was still inside the 60 seconds, so it came straight from cache and showed the old version while the server already had a new one. The fix isn't a shorter TTL, it's a different strategy for files that change often: see the next step.",
      },
      {
        kind: "explain",
        title: "The cache-forever trick",
        body: P(
          "Static files such as scripts, styles and images can be cached for **a year** if their URL changes whenever their content does. Build tools do this by putting a content hash in the file name: `app.3f9a1c.js`. A new build produces `app.b7e204.js`, which is a different URL, so no cached copy can ever be wrong.",
          txt(`
/assets/app.3f9a1c.js   Cache-Control: public, max-age=31536000, immutable
/index.html             Cache-Control: no-cache          (always revalidate)
`),
          "The HTML page is the one thing with a fixed URL, so it revalidates every time. Inside it are the new hashed URLs. This is **cache busting via versioned keys**, the same idea as `recipe:42:v7` in the invalidation lesson, applied to the web.",
        ),
      },
      {
        kind: "question",
        title: "Pick the headers",
        body: "Your site serves `/assets/site.7d41f0.css` (the hash changes whenever the file does) and the page `/index.html` that links to it. Which pairing is best?",
        question: {
          type: "choice",
          options: [
            "Both: no-store",
            "CSS: max-age=60. HTML: max-age=31536000",
            "CSS: max-age=31536000, immutable. HTML: no-cache",
            "Both: max-age=31536000",
          ],
          answer: 2,
        },
        explanation: "Hashed files never change under the same URL, so they can be kept for a year. The HTML must be revalidated each time so visitors learn about the newest hashed URLs. Caching the HTML for a year (the last option) would pin visitors to the old CSS forever.",
      },
      {
        kind: "code",
        title: "Be the server",
        body: "Write `respond(request_headers, etag, body)` for a server. `request_headers` is a dict. If it has an `If-None-Match` header whose value matches `etag` (it may be a comma-separated list, may include a `W/` weak prefix on each tag, or be `*`), return `(304, \"\")`. Otherwise return `(200, body)`. `etag` is the current tag with its quotes, for example `'\"v7\"'`.",
        language: "python",
        starter: `def respond(request_headers, etag, body):
    return (200, body)
`,
        solution: `def respond(request_headers, etag, body):
    sent = request_headers.get("If-None-Match")
    if sent is not None:
        tags = [t.strip() for t in sent.split(",")]
        tags = [t[2:] if t.startswith("W/") else t for t in tags]
        if "*" in tags or etag in tags:
            return (304, "")
    return (200, body)
`,
        tests: [
          { id: "first", description: "No validator: full response", assertionCode: `assert respond({}, '"v7"', "<html>") == (200, "<html>")` },
          { id: "same", description: "Matching tag: 304 with an empty body", assertionCode: `assert respond({"If-None-Match": '"v7"'}, '"v7"', "<html>") == (304, "")` },
          { id: "changed", description: "A different tag: full response", assertionCode: `assert respond({"If-None-Match": '"v6"'}, '"v7"', "<html>") == (200, "<html>")` },
          { id: "list", description: "A list of tags where one matches", assertionCode: `assert respond({"If-None-Match": '"v5", "v7"'}, '"v7"', "x") == (304, "")` },
          { id: "weak", description: "A weak validator prefix is ignored", assertionCode: `assert respond({"If-None-Match": 'W/"v7"'}, '"v7"', "x") == (304, "")` },
          { id: "star", description: "* matches any current version", assertionCode: `assert respond({"If-None-Match": "*"}, '"v7"', "x") == (304, "")` },
        ],
        hints: ["Split the header value on commas and strip spaces.", "Remove a leading `W/` from each tag before comparing with `etag`."],
      },
      {
        kind: "recap",
        points: [
          "HTTP caching is controlled by **response headers**: `Cache-Control: max-age` makes a copy fresh, so the browser sends no request at all.",
          "**no-cache** means “store it, but revalidate before each use”; **no-store** means “never keep it”.",
          "**ETag / Last-Modified** let a browser ask “changed?”; the server answers **304 Not Modified** with no body when it hasn't.",
          "**stale-while-revalidate** shows a slightly old copy instantly and refreshes in the background. Use **hashed file names + immutable** for assets and **no-cache** for the HTML that points at them.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 9. Shared caches ───────────────────────────────
  {
    id: "fnd-cache-9-shared",
    title: "Shared caches and CDNs",
    summary: "Private vs shared caches, how a CDN edge serves from nearby, and how pages leak when headers are wrong.",
    minutes: 10,
    xp: 60,
    steps: [
      {
        kind: "explain",
        title: "A cache for everybody",
        body: P(
          "The browser's cache belongs to **one person**. But between the browser and your server there can be caches serving **many** people: a company proxy, your hosting platform's cache, and above all a **CDN** (content delivery network).",
          "A CDN runs servers in many cities, called **edges** or points of presence (POPs). A visitor's request goes to the nearest edge. If the edge has a fresh copy, it answers in a few milliseconds; if not, it fetches from your **origin** (your own server), keeps the answer and serves the next visitor from it.",
          "Below, the origin is in Virginia and three edges stand in Frankfurt, Singapore and São Paulo. The logo image is sent with `public, max-age=3600`. Tap people to send requests and watch which ones go all the way to the origin.",
        ),
        widget: { type: "cache-cdn", props: { resources: ["logo"], initial: "logo", editable: false } },
      },
      {
        kind: "question",
        title: "Let the edge help",
        body: "Ana and Bruno are both near Frankfurt. Send **Ana's** request and then **Bruno's** so that the edge answers Bruno on its own.",
        widget: { type: "cache-cdn", props: { resources: ["logo"], initial: "logo", editable: false } },
        question: { type: "widget", goal: { resource: "logo", edgeHitsMin: 1, requestsMin: 2 }, prompt: "Ask as Ana, then as Bruno." },
        explanation: "Ana's request was a miss: it travelled to Virginia and back, and Frankfurt kept the answer. Bruno's request was a **hit** served in about 20 ms. Note that Chen in Singapore would still miss: **each edge fills itself separately**, so a new asset is slow once per region.",
      },
      {
        kind: "explain",
        title: "Private or public?",
        body: P(
          "Not every response is fit for strangers. The headers say which caches may keep a response:\n\n- **public**: any cache, including shared ones, may store it.\n- **private**: only the user's own browser may. Shared caches must not.\n- **no-store**: nobody stores it.\n- **s-maxage**: a freshness time that applies only to shared caches (it overrides `max-age` there).",
          "Now the dangerous case. The account page shows *each person's* details. The site owner, wanting speed, sends it as `public, s-maxage=30`. Pick the account page and that header, then ask as Ana (Frankfurt) and as Bruno (Frankfurt).",
        ),
        widget: { type: "cache-cdn", props: { resources: ["account"], initial: "account" } },
      },
      {
        kind: "question",
        title: "Cause a leak",
        body: "Make the CDN **hand one person's account page to somebody else**.",
        widget: { type: "cache-cdn", props: { resources: ["account"], initial: "account" } },
        question: { type: "widget", goal: { resource: "account", leaked: true }, prompt: "Make the account page shared, then ask as Ana and as Bruno." },
        explanation: "With `public`, Frankfurt's edge stored Ana's page and gave the same copy to Bruno. This has really happened to large sites, usually through one over-eager caching rule. The edge can't tell that a page is personal; **you** have to tell it with `private` or `no-store`.",
      },
      {
        kind: "question",
        title: "Fix it",
        body: "Set the account page to the header that stops shared caches from keeping it while still letting the user's browser keep a copy, then send **three requests** to confirm nobody leaks.",
        widget: { type: "cache-cdn", props: { resources: ["account"], initial: "account", header: "public, s-maxage=30" } },
        question: { type: "widget", goal: { resource: "account", header: "private", requestsMin: 3, leaked: false }, prompt: "Choose the private header and send three requests." },
        explanation: "With `private`, every request went to the origin (slower, but correct), and the *user's own browser* can still cache it. Use `no-store` instead for pages so sensitive that even the browser shouldn't keep them, such as a bank statement.",
      },
      {
        kind: "explain",
        title: "Same URL, different answer: Vary",
        body: P(
          "Sometimes one URL really does have several versions: compressed or not, English or German. The **Vary** header tells caches which request headers change the answer, so they can store one copy per variant:",
          txt(`
Vary: Accept-Encoding           gzip and plain copies kept separately
Vary: Accept-Language           one copy per language
Vary: Cookie                    one copy per cookie value (!)
`),
          "Careful with the last one. If a cookie is unique to each visitor, `Vary: Cookie` makes a *separate* copy for every person, so the shared cache almost never hits. Every extra `Vary` header multiplies the number of copies and divides the hit rate.",
        ),
      },
      {
        kind: "question",
        title: "The cookie trap",
        body: "A public article page is sent with `Vary: Cookie`, and every visitor has a unique session cookie. What happens to the CDN's hit rate for that page?",
        question: {
          type: "choice",
          options: [
            "It goes up, because cookies identify the page better",
            "It collapses toward zero: each visitor gets their own cached variant",
            "It is unchanged",
            "The page is no longer cached on the visitor's own browser",
          ],
          answer: 1,
        },
        explanation: "A shared cache keyed on a per-person value works as a per-person cache that nobody else can reuse. If the page is truly the same for everyone, drop the cookie (and `Vary: Cookie`) from that response, or serve it from a path that does not set cookies.",
      },
      {
        kind: "explain",
        title: "Getting stale content out of the world",
        body: P(
          "A year-long `max-age` is great for hashed assets and awful for a news feed. Pick the feed in the widget, send a request as Ana, press **Change it at the origin**, and send another. The edge still holds the old version, and the card turns red.",
          "To fix that you can **purge** (also called invalidate): tell the CDN to delete its copies of a URL, or of everything tagged with a label (surrogate keys). A purge is a cache invalidation for the whole planet, with all the races from the invalidation lesson, so the safest approach is still a **short `s-maxage`** for dynamic data and **versioned URLs** for static data.",
        ),
        widget: { type: "cache-cdn", props: { resources: ["feed"], initial: "feed" } },
      },
      {
        kind: "question",
        title: "Cause a stale edge",
        body: "With the feed on `public, s-maxage=30`, make a visitor receive an **out-of-date feed** from the edge.",
        widget: { type: "cache-cdn", props: { resources: ["feed"], initial: "feed" } },
        question: { type: "widget", goal: { resource: "feed", staleServed: true }, prompt: "Request, change it at the origin, request again from the same edge." },
        explanation: "The edge still had a fresh (by its clock) copy of the old version, so it served it. Within 30 seconds of the edit, the CDN can lie. If that's too long, shorten `s-maxage`, purge on publish, or don't cache the feed at the edge.",
      },
      {
        kind: "question",
        title: "Safe or not for a shared cache?",
        body: "Which of these responses is **safe** to mark `public` so a CDN may store and share it? Pick all that apply.",
        question: {
          type: "choice",
          options: [
            "The site's logo and style sheet",
            "A page that greets the visitor by name",
            "A JSON list of upcoming concerts, the same for everyone",
            "A response that sets a login session cookie",
          ],
          answer: [0, 2],
        },
        explanation: "Safe means **identical for every visitor and containing nothing secret**: the logo, the style sheet and the public concert list. A page with the visitor's name is personal, and a response that sets a session cookie would hand that cookie to the next visitor if a shared cache stored it.",
      },
      {
        kind: "code",
        title: "Header policy",
        body: "Write `cache_headers(path, personal)` that returns the `Cache-Control` value for a response, using these rules in order:\n\n1. If `personal` is true: `\"private, no-store\"`.\n2. If the path starts with `/assets/`: `\"public, max-age=31536000, immutable\"`.\n3. If the path starts with `/api/`: `\"public, s-maxage=30\"`.\n4. If the path is `/` or ends with `.html`: `\"no-cache\"`.\n5. Anything else: `\"public, max-age=300\"`.",
        language: "python",
        starter: `def cache_headers(path, personal):
    return "no-store"
`,
        solution: `def cache_headers(path, personal):
    if personal:
        return "private, no-store"
    if path.startswith("/assets/"):
        return "public, max-age=31536000, immutable"
    if path.startswith("/api/"):
        return "public, s-maxage=30"
    if path == "/" or path.endswith(".html"):
        return "no-cache"
    return "public, max-age=300"
`,
        tests: [
          { id: "personal", description: "Personal pages are never shared", assertionCode: `assert cache_headers("/account", True) == "private, no-store"\nassert cache_headers("/assets/app.js", True) == "private, no-store", "personal wins over the path rules"` },
          { id: "assets", description: "Hashed assets are cached for a year", assertionCode: `assert cache_headers("/assets/app.3f9a1c.js", False) == "public, max-age=31536000, immutable"` },
          { id: "api", description: "API responses get a short shared lifetime", assertionCode: `assert cache_headers("/api/concerts", False) == "public, s-maxage=30"` },
          { id: "html", description: "HTML is revalidated", assertionCode: `assert cache_headers("/", False) == "no-cache"\nassert cache_headers("/about.html", False) == "no-cache"` },
          { id: "other", description: "Everything else gets five minutes", assertionCode: `assert cache_headers("/logo.png", False) == "public, max-age=300"` },
        ],
        hints: ["Check `personal` first: it must win over every path rule.", "`path.startswith('/assets/')` and `path.endswith('.html')` do the matching."],
      },
      {
        kind: "recap",
        points: [
          "A **private** cache serves one user (the browser); a **shared** cache (proxy, CDN) serves many. `private` and `no-store` keep personal responses out of shared caches.",
          "A **CDN** serves from an edge near the visitor; each edge fills itself, so a new asset is slow once per region.",
          "`Vary` multiplies the copies a cache keeps. A per-visitor header such as `Vary: Cookie` destroys the hit rate.",
          "Dynamic data needs a short `s-maxage` or a **purge**; static data should use **versioned URLs** with a very long lifetime.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 10. Judgment ───────────────────────────────
  {
    id: "fnd-cache-10-judgment",
    title: "When not to cache",
    summary: "A cache adds moving parts. What to try first, what to leave uncached, and the mistakes that leak data.",
    minutes: 9,
    xp: 55,
    steps: [
      {
        kind: "explain",
        title: "A cache is not free",
        body: P(
          "Adding a cache feels like a free speed-up, but you've taken on real costs:\n\n- **Staleness**: some users will see old answers.\n- **A new failure mode**: if the cache disappears, can the database survive the full load?\n- **Complexity**: invalidation, keys, warming, eviction, one more thing to monitor.\n- **Hard-to-reproduce bugs**: “it works for me” because your cache entry is fresh and theirs isn't.\n- **Memory** and money.",
          "So the question is never “can I cache this?” (almost anything can be) but **“should I?”** Work through six cases from Encore. For each one, decide how long, if at all, to cache it. The facts on each card are what to reason from.",
        ),
        widget: { type: "cache-decide" },
      },
      {
        kind: "question",
        title: "Your verdicts",
        body: "Get all six right. Each wrong pick tells you what to think about instead.",
        widget: { type: "cache-decide" },
        question: { type: "widget", goal: { all: true }, prompt: "Decide all six cases correctly." },
        explanation: "The pattern: cache what is **read often, changes rarely, is the same for many people and tolerates being a little old**. Leave uncached what is personal, rarely re-read, security-critical or must be exact at the moment of use. And note that the sixth case caches a **“not found”**, which people forget: negative caching protects the database from repeat misses.",
      },
      {
        kind: "explain",
        title: "Try these first",
        body: P(
          "A cache hides slowness; sometimes the better move is to remove it. Before adding one to a slow page, check:\n\n1. **Is the query slow because it's missing an index?** A cache over a query that scans a million rows just hides a bug, and every miss is still terrible. (The next module covers indexes and query plans.)\n2. **Is it doing too much work per request?** Fetching 200 rows to show 10, or one query per item in a loop (the “N+1” pattern), can be cut by 10× with no cache.\n3. **Is the response bigger than it needs to be?** Compression and fewer fields help everyone.\n4. **Is the data really shared and re-read?** Check the hit rate you would get before you build anything.",
          "Cache after you understand why it's slow. A cache on top of a slow query makes the *typical* request fast and leaves the *rare* one (the cold miss) as awful as before.",
        ),
      },
      {
        kind: "question",
        title: "The cache is down",
        body: "Your Redis cache has an outage. Requests that used to hit it now go to the database, which can only handle a fraction of the load. What's the most sensible behaviour for the app?",
        question: {
          type: "choice",
          options: [
            "Retry the cache in a tight loop until it's back",
            "Fall back to the database but limit concurrent queries and shed load or serve a degraded page, instead of letting every request through",
            "Let every request go straight to the database; it'll cope",
            "Return an error for every request until the cache recovers",
          ],
          answer: 1,
        },
        explanation: "A cache that has become load-bearing is a dependency like any other. Plan for its absence with the tools from the reliability module: timeouts, circuit breakers, and **load shedding** so the database isn't buried by the sudden miss storm. If the answer to “what if the cache is gone?” is “everything falls over”, the cache is now a single point of failure.",
      },
      {
        kind: "explain",
        title: "Keys: where caches leak",
        body: P(
          "A cache is a dictionary, and **the key decides who gets which answer**. Most cache security bugs are key bugs:\n\n- **Missing the user.** A key like `account_page` shared by every user returns one person's page to the next.\n- **Missing the tenant.** In a multi-tenant app, `report:2024` must be `tenant:42:report:2024`.\n- **Sloppy normalisation.** `?a=1&b=2` and `?b=2&a=1` are the same request but different keys, which wastes space; the reverse mistake (dropping a parameter that matters) serves the wrong data.\n- **Caching errors.** An error response stored for a minute turns a one-second blip into a minute-long outage.",
          "Treat key construction like a security boundary: write it in **one function**, with tests, and don't build keys by hand in a dozen places.",
        ),
      },
      {
        kind: "question",
        title: "Spot the bug",
        body: "A cache key is built as `\"dashboard:\" + date`. Every logged-in user sees a dashboard computed from their own data. What goes wrong?",
        question: {
          type: "choice",
          options: [
            "Nothing: dates are unique enough",
            "The first user to load the dashboard that day fills the entry, and everyone else is shown their data",
            "Only the TTL would be affected",
            "The cache would evict entries too quickly",
          ],
          answer: 1,
        },
        explanation: "The key identifies the **day** but not the **user**, so the first person's dashboard is served to everybody. Add whatever makes the answer different (the user, the tenant, the language, the filters) to the key, or don't cache a personal page in a shared cache at all.",
      },
      {
        kind: "code",
        title: "A key builder",
        body: "Write `make_key(tenant, path, params, user=None)` that builds a cache key:\n\n- Start with `tenant + \":\" + path`.\n- If `params` (a dict) is not empty, append `\"?\"` and the parameters as `name=value` pairs **sorted by name** and joined with `\"&\"`.\n- If `user` is not `None`, append `\"|u=\"` and the user.\n\nSo `make_key(\"acme\", \"/report\", {\"b\": 2, \"a\": 1}, \"ana\")` is `\"acme:/report?a=1&b=2|u=ana\"`.",
        language: "python",
        starter: `def make_key(tenant, path, params, user=None):
    return path
`,
        solution: `def make_key(tenant, path, params, user=None):
    key = tenant + ":" + path
    if params:
        pairs = [f"{name}={params[name]}" for name in sorted(params)]
        key += "?" + "&".join(pairs)
    if user is not None:
        key += "|u=" + str(user)
    return key
`,
        tests: [
          { id: "plain", description: "Tenant and path only", assertionCode: `assert make_key("acme", "/home", {}) == "acme:/home", make_key("acme", "/home", {})` },
          { id: "sorted", description: "Parameters are sorted by name", assertionCode: `assert make_key("acme", "/report", {"b": 2, "a": 1}) == "acme:/report?a=1&b=2"` },
          { id: "order", description: "Parameter order doesn't change the key", assertionCode: `assert make_key("t", "/x", {"a": 1, "b": 2}) == make_key("t", "/x", {"b": 2, "a": 1})` },
          { id: "user", description: "A user is appended", assertionCode: `assert make_key("acme", "/report", {"b": 2, "a": 1}, "ana") == "acme:/report?a=1&b=2|u=ana"` },
          { id: "tenants", description: "Different tenants never share a key", assertionCode: `assert make_key("acme", "/home", {}) != make_key("globex", "/home", {})` },
          { id: "nouser", description: "Without a user there is no |u= part", assertionCode: `assert "|u=" not in make_key("acme", "/home", {"a": 1})` },
        ],
        hints: ["Build a list of `f\"{name}={params[name]}\"` for `sorted(params)`, then `\"&\".join(...)`.", "Only add `?` when `params` is not empty, and `|u=` when `user` is not None."],
      },
      {
        kind: "question",
        title: "A plan for the slow dashboard",
        body: "Encore's organiser dashboard takes 6 seconds. It runs one query that scans a 40-million-row table with no index on the filter column, and every organiser sees different data. What's the best first move?",
        question: {
          type: "choice",
          options: [
            "Put the whole page in a shared CDN cache for an hour",
            "Add an index (and check the query plan) so the query is fast on its own, then cache only if still needed",
            "Increase the cache TTL to a week",
            "Cache each organiser's page in write-behind mode",
          ],
          answer: 1,
        },
        explanation: "The page is per-organiser, so a shared cache would leak data, and a cache wouldn't fix the underlying scan: each miss would still take 6 seconds. Start by fixing the query. You'll learn how in the next module, where *indexes and query plans* get their own lessons.",
      },
      {
        kind: "recap",
        points: [
          "Cache **read-heavy, slow-changing, widely shared** data that tolerates staleness; don't cache what's personal, rarely re-read, security-critical or must be exact when used.",
          "**Fix the slowness first** (index, N+1, over-fetching); a cache over a bad query leaves every miss terrible.",
          "Plan for the cache being **gone**: a cache the database can't live without is a single point of failure.",
          "**Keys are a security boundary**: include user, tenant, language and every parameter that changes the answer, built in one tested function, and cache errors only briefly if at all.",
        ],
      },
    ],
  },
];
