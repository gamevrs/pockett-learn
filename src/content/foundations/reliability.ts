import type { Module } from "../../learn/types.ts";

/** Fenced Python block for lesson prose. */
const py = (s: string) => "```python\n" + s.trim() + "\n```";
/** Fenced plain-text block (requests, tables) for lesson prose. */
const text = (s: string) => "```text\n" + s.trim() + "\n```";

/** Module: reliability. What goes wrong when programs talk over a network, and the habits that keep a system standing. */
export const reliabilityModule: Module = {
  id: "reliability",
  part: "systems",
  title: "Failure is normal",
  blurb: "Timeouts, deadlines, retries, backoff, idempotency, circuit breakers, bulkheads and fallbacks: building clients that survive broken dependencies.",
  icon: "lifebuoy",
  lessons: [
    // ─────────────────────────────── 1. Failure is normal ───────────────────────────────
    {
      id: "fnd-rel-1-failure",
      title: "Failure is normal",
      summary: "Why a call across a network can fail in ways a function call never does, and why slow and dead look the same.",
      minutes: 7,
      xp: 50,
      steps: [
        {
          kind: "explain",
          title: "A function call, stretched across a network",
          body: "Inside one program, calling a function ends in one of two ways: it **returns**, or it **throws**. Either way you know what happened.\n\nPut a network in the middle and that certainty goes. Your call becomes a **message** to another computer, and that computer may be busy, rebooting, unreachable, or perfectly fine but sitting behind a cable somebody just kicked.\n\nSystems built from many machines have a special kind of breakage called **partial failure**: *some* parts stop working while the rest carry on. Nobody switches the whole thing off for you. You have to notice, and decide what to do.",
        },
        {
          kind: "question",
          title: "Silence",
          body: "Your app sends “book seat 14C” to a server. A long time passes and **no reply arrives**. Which statements are true? Pick all that apply.",
          question: {
            type: "choice",
            options: [
              "The server never received the request",
              "The server may have booked the seat",
              "The reply may still be on its way, just slow",
              "The server has crashed",
            ],
            answer: [1, 2],
          },
          explanation: "From the app's side, silence fits many stories. The request may have been lost, **or** processed with the reply lost, **or** processed slowly. The server may have crashed, or may be fine. “May have booked the seat” and “may still be on its way” are the two you can never rule out; the other two are only possibilities.",
        },
        {
          kind: "explain",
          title: "Four worlds, one symptom",
          body: "Here is a request to a parcel tracker: *mark parcel #4417 as delivered*. Pick each of the four things that can really happen, and move your app's **timeout** around.\n\nWatch the two boxes at the bottom: *what your app knows* against *what really happened*. They only agree when an answer arrives in time.",
          widget: { type: "rel-slowdead", live: true },
        },
        {
          kind: "question",
          title: "Done, but you don't know it",
          body: "Set things up so that your app **times out**, even though the parcel **was marked delivered**.",
          widget: { type: "rel-slowdead" },
          question: { type: "widget", goal: { ambiguous: true } },
          explanation: "Two of the worlds do it: the *slow* answer (when your timeout is shorter than 1.4 s) and the *lost* answer (at any timeout). The work is done, yet your app sees exactly what it would see if nothing had happened. That is the heart of this whole module: **a timeout tells you that you stopped waiting, not that the work failed.**",
        },
        {
          kind: "explain",
          title: "Three kinds of failure, one of them nasty",
          body: "Not all failures are equally hard to deal with:\n\n- **Refused**: the connection is rejected straight away (nothing is listening). Fast and clear.\n- **An error answer**: the server replies *“503, try later”*. Fast and clear: you even know it did nothing.\n- **Silence**: the connection opens, or the request leaves, and then nothing. Slow, and you can't tell what state the world is in.\n\nSilence is the one that takes systems down. While you wait, you are holding a thread, a connection, memory. A *dead* dependency costs you almost nothing; a *slow* one costs you something every second.",
        },
        {
          kind: "question",
          title: "The hard one",
          body: "Which of these is the hardest for a client to handle well?",
          question: {
            type: "choice",
            options: [
              "The connection is refused immediately",
              "The server answers 500 within a few milliseconds",
              "The server accepts the connection, then goes quiet",
              "The name lookup fails at once",
            ],
            answer: 2,
          },
          explanation: "The other three fail **fast** and tell you something. A server that accepts the connection and then says nothing leaves you waiting for an unknown time, unsure whether the request was even read. Everything in the next lessons (timeouts, deadlines, retries, idempotency) exists to cope with that silence.",
        },
        {
          kind: "question",
          title: "Nines multiply",
          body: "One user action touches **5 services in a row**, and each one works **99.9%** of the time (three nines, a very good service). About how many out of **10,000** such actions fail?",
          question: { type: "number", answer: 50, tolerance: 3 },
          explanation: "0.999⁵ ≈ 0.995, so about **0.5%** of actions fail, roughly 50 in 10,000. Each extra dependency in a chain makes the whole thing a little less reliable than its weakest part. With dozens of dependencies, “something is failing right now” is the normal state, which is why we design for it.",
        },
        {
          kind: "recap",
          points: [
            "Across a network a call can succeed, fail cleanly, or **vanish**; **partial failure** means some parts fail while others carry on.",
            "A **timeout** means *you* stopped waiting. It does not tell you whether the work happened.",
            "**Silence** (slow or lost answers) is harder than fast, clear failures, and it ties up your resources while you wait.",
            "Reliability multiplies down: every dependency in a chain lowers the odds that the whole chain works.",
          ],
        },
      ],
    },

    // ─────────────────────────────── 2. Timeouts ───────────────────────────────
    {
      id: "fnd-rel-2-timeouts",
      title: "Timeouts",
      summary: "Why waiting forever is a bug, how a hung call can freeze unrelated pages, and how to choose a number.",
      minutes: 8,
      xp: 60,
      steps: [
        {
          kind: "explain",
          title: "Waiting forever is a bug",
          body: "A call with **no timeout** is a promise to wait as long as the other side likes. If the other side never answers, you wait for ever, and some popular HTTP libraries behave exactly like this by default.\n\nThe damage isn't your one stuck call. It's everything that stuck call is *holding*: a worker thread, a connection from a pool, a bit of memory, perhaps a database lock. Hold enough of them and nothing else can run.",
        },
        {
          kind: "explain",
          title: "Watch the workers",
          body: "A small web app has **20 workers**. Its checkout page calls a payment partner at 4 requests a second. At second 10 the partner stops answering. The chart shows busy workers each second. Switch the timeout and watch.\n\nNotice the last line: the **/about** page doesn't talk to the partner at all, but it needs a worker too.",
          widget: { type: "rel-hang", props: { initial: "none" }, live: true },
        },
        {
          kind: "question",
          title: "Keep the pool alive",
          body: "Choose a timeout so the **pool never fills up**, and the site stays up even while the partner is hanging.",
          widget: { type: "rel-hang", props: { initial: "10" } },
          question: { type: "widget", goal: { neverFull: true } },
          explanation: "At 4 checkouts a second, a timeout of 1 s pins about 4 workers and 3 s pins about 12. Past 4 s the stuck calls need more workers than exist. The rule of thumb: **arrival rate × timeout must stay well below your pool size.** A timeout that is *too long* protects nothing.",
        },
        {
          kind: "question",
          title: "How many workers?",
          body: "Calls arrive at **4 per second**, and each one hangs for **6 seconds** before its timeout fires. About how many workers are stuck at any moment?",
          question: { type: "number", answer: 24 },
          explanation: "4 per second × 6 seconds = **24** calls in flight. That is more than a 20-worker pool, so it is already full. This relationship (in-flight = arrival rate × time in system) is called **Little's law**, and you'll meet it again when we talk about traffic.",
        },
        {
          kind: "explain",
          title: "More than one clock",
          body: "“The timeout” is really several, and a good client sets each one:\n\n- **Connect timeout**: how long to wait for the connection to open. Short: reaching a healthy server takes milliseconds.\n- **Read timeout**: how long to wait for the response once the request is sent. Set it from what the call really needs.\n- **Total timeout**: an overall cap on the whole exchange, so a trickle of bytes can't keep a call alive for ever.\n\nIn Python's `requests` library the first two look like this:\n\n" + py("requests.get(url, timeout=(3, 10))   # 3 s to connect, 10 s to read a response"),
        },
        {
          kind: "question",
          title: "Which clock?",
          body: "A server accepts your connection instantly, reads your request, and then never sends a response. Which timeout rescues you?",
          question: { type: "choice", options: ["The connect timeout", "The read timeout", "The DNS timeout", "None: only the server can end it"], answer: 1 },
          explanation: "Connecting **worked**, so the connect timeout never fires. It's the **read** (response) timeout that gives up on a connection that is open but silent. That's why setting only a connect timeout leaves the most common hang uncovered.",
        },
        {
          kind: "explain",
          title: "Choosing the number",
          body: "Too short and healthy-but-slow calls fail (and, as you'll see, their retries add more load). Too long and a dying dependency eats your pool. So measure, don't guess.\n\nLook at how long calls *really* take, using percentiles: the **p99** is the time that 99 out of 100 calls beat. A common recipe is to set the timeout at a small multiple of the p99: enough headroom for a bad day, still far below your pool's limit.",
        },
        {
          kind: "question",
          title: "Pick one",
          body: "A call has these latencies: median **40 ms**, p99 **300 ms**, p99.9 **900 ms**. The caller's pool is small and the user is waiting. Which timeout is the best fit?",
          question: { type: "choice", options: ["30 seconds, to be generous", "About 1 second", "50 milliseconds, to be snappy", "No timeout: the median is tiny"], answer: 1 },
          explanation: "About **1 s** clears even the slow tail (p99.9 is 0.9 s) while releasing resources quickly. 50 ms would fail more than half of the p99 calls on a healthy day. 30 s would let a dead dependency pin your pool for 30× longer than any healthy call ever takes.",
        },
        {
          kind: "code",
          title: "Timeout from samples",
          body: "Write `pick_timeout(samples_ms)`: it returns **twice the 99th percentile** of the latency samples, in milliseconds.\n\nUse the *nearest-rank* method: sort the samples; the p99 is the value at position `ceil(0.99 × n)` (counting from 1). For 100 samples that is the 99th smallest, so one terrible outlier at the end doesn't set your timeout.",
          language: "python",
          starter: "def pick_timeout(samples_ms):\n    ordered = sorted(samples_ms)\n    # nearest rank: position ceil(0.99 * n), counting from 1\n    return ordered[-1] * 2\n",
          solution: "def pick_timeout(samples_ms):\n    ordered = sorted(samples_ms)\n    rank = -(-99 * len(ordered) // 100)  # ceil(0.99 * n) with whole numbers\n    return ordered[rank - 1] * 2\n",
          tests: [
            { id: "hundred", description: "samples 1..100 give 2 × 99", assertionCode: `assert pick_timeout(list(range(1, 101))) == 198, f"got {pick_timeout(list(range(1, 101)))!r}"` },
            { id: "outlier", description: "one slow outlier does not set the timeout", assertionCode: `s = [10] * 99 + [5000]\nassert pick_timeout(s) == 20, f"got {pick_timeout(s)!r}"` },
            { id: "small", description: "with 10 samples the p99 is the slowest", assertionCode: `assert pick_timeout([5, 1, 9, 3, 7, 2, 8, 4, 6, 10]) == 20, "10 samples: rank is ceil(9.9) = 10"` },
            { id: "unsorted", description: "the order of the samples does not matter", assertionCode: `s = list(range(200, 0, -1))\nassert pick_timeout(s) == 396, f"got {pick_timeout(s)!r}"` },
          ],
          hints: ["`sorted(samples)` puts them in order. For n samples the rank is `ceil(0.99 * n)`; with whole numbers that is `-(-99 * n // 100)`.", "Positions count from 1, but Python lists count from 0, so use `ordered[rank - 1]`."],
        },
        {
          kind: "recap",
          points: [
            "A call with no timeout waits as long as the other side likes, and holds a worker, a connection and memory the whole time.",
            "One hung dependency can freeze **unrelated** pages by filling the shared pool: in-flight = **arrival rate × time held**.",
            "Set a **connect** timeout, a **read** timeout and a **total** cap; the read timeout is the one that rescues you from silence.",
            "Choose timeouts from measured latency (a small multiple of the p99), not from habit.",
          ],
        },
      ],
    },

    // ─────────────────────────────── 3. Deadlines ───────────────────────────────
    {
      id: "fnd-rel-3-deadlines",
      title: "Deadlines that travel",
      summary: "Why per-call timeouts add up the wrong way down a chain of services, and how one deadline fixes it.",
      minutes: 7,
      xp: 55,
      steps: [
        {
          kind: "explain",
          title: "Timeouts stack the wrong way",
          body: "A shopper taps **Buy**. The request goes Gateway → Orders → Inventory → Warehouse. Each service gives its downstream call a sensible timeout of 5 seconds.\n\nBut the shopper's patience is **4 seconds**. After that they've closed the tab. Nobody told Orders or Inventory or the Warehouse, though. Each one keeps waiting on *its own* 5-second clock, working for a result nobody wants.",
        },
        {
          kind: "explain",
          title: "Watch the work after they leave",
          body: "Each bar is one service's busy time for this request. The dashed line is the moment the shopper gives up. **Red** is work still running afterwards.\n\nSlide the warehouse's latency up and watch the red grow.",
          widget: { type: "rel-deadline", props: { mode: "percall", lockMode: true, latency: 6 }, live: true },
        },
        {
          kind: "question",
          title: "Wasted work",
          body: "With **per-call timeouts**, make the services burn **at least 4 seconds of work in total** after the shopper has left.",
          widget: { type: "rel-deadline", props: { mode: "percall", lockMode: true, latency: 1 } },
          question: { type: "widget", goal: { mode: "percall", minWasted: 4 } },
          explanation: "Once the warehouse takes longer than the shopper will wait, every service above it keeps its worker busy until its own timeout fires, and the warehouse keeps going until it is done. Four services each wasting a second or two adds up quickly, and that is *per request* during an incident.",
        },
        {
          kind: "explain",
          title: "A deadline is a time, not a duration",
          body: "The fix is to stop thinking in “how long may *this* call take?” and think in **“by when must the whole request be finished?”**\n\nThe gateway computes one **deadline** (now + 4 s) and passes it along with the request. Every service:\n\n1. works out how much time is **left** (deadline − now),\n2. uses that, minus a little for the trip home, as its downstream timeout, and\n3. gives up straight away if nothing is left.\n\nBetween machines whose clocks may disagree, systems usually pass the **remaining time** (“3.2 s left”) rather than a clock reading, and each hop subtracts what it has used. gRPC does exactly this with its deadlines.",
        },
        {
          kind: "question",
          title: "One deadline for all",
          body: "Switch to **One deadline** and make the warehouse slow (**5 s or more**). How much work can you make run after the shopper has left?",
          widget: { type: "rel-deadline", props: { mode: "percall", latency: 3 } },
          question: { type: "widget", goal: { mode: "deadline", minLatency: 5, maxWasted: 0 } },
          explanation: "With the deadline passed down, all four services stop together at 4 s. The shopper still gets an error (the warehouse really is too slow), but nobody keeps working for a ghost. Workers are freed at once, so the *next* request finds capacity.",
        },
        {
          kind: "question",
          title: "How much is left?",
          body: "The gateway's budget is **4 s**. The gateway spent **0.3 s** and Orders spent **0.5 s** before calling Inventory. What is the most time (in seconds) Inventory's call to the warehouse should be given?",
          question: { type: "number", answer: 3.2, tolerance: 0.05, unit: "s" },
          explanation: "4 − 0.3 − 0.5 = **3.2 s** at most, and a bit less in practice, to leave time for the reply to travel back up the chain. Each hop shrinks the budget; the budget never grows on the way down.",
        },
        {
          kind: "question",
          title: "Too late to start",
          body: "A service receives a request with only **300 ms** left on its deadline. The work it needs takes about 500 ms plus a downstream call. What should it do?",
          question: {
            type: "choice",
            options: ["Start anyway, it might be quick this time", "Fail at once with “deadline exceeded”", "Call downstream with a fresh 5-second timeout", "Ask the caller to extend the deadline"],
            answer: 1,
          },
          explanation: "The caller will give up in 300 ms, so any work you start is wasted work. Failing **immediately** frees your worker and tells the caller the truth. A fresh timeout would undo the whole point of a shared deadline.",
        },
        {
          kind: "code",
          title: "Time left for a child call",
          body: "Write `child_timeout(deadline, now, reserve)`. It returns the timeout (in seconds) to give a downstream call: the time left until `deadline`, minus a `reserve` kept for the trip back. If nothing would be left (zero or less), return `None` to say “don't even start”.",
          language: "python",
          starter: "def child_timeout(deadline, now, reserve):\n    left = deadline - now\n    return left\n",
          solution: "def child_timeout(deadline, now, reserve):\n    left = deadline - now - reserve\n    if left <= 0:\n        return None\n    return left\n",
          tests: [
            { id: "plenty", description: "10 - 7 - 0.5 leaves 2.5 s", assertionCode: `assert abs(child_timeout(10, 7, 0.5) - 2.5) < 1e-9, f"got {child_timeout(10, 7, 0.5)!r}"` },
            { id: "tight", description: "less than the reserve left: None", assertionCode: `assert child_timeout(10, 9.8, 0.5) is None, f"got {child_timeout(10, 9.8, 0.5)!r}"` },
            { id: "now", description: "at the deadline: None", assertionCode: `assert child_timeout(10, 10, 0) is None, f"got {child_timeout(10, 10, 0)!r}"` },
            { id: "late", description: "after the deadline: None", assertionCode: `assert child_timeout(10, 12, 0.1) is None, f"got {child_timeout(10, 12, 0.1)!r}"` },
          ],
          hints: ["Subtract both `now` and `reserve` from `deadline`.", "If the result is zero or negative, return `None` instead of a number."],
        },
        {
          kind: "recap",
          points: [
            "Per-call timeouts don't know how long the **user** will wait; callees keep working for callers who have gone.",
            "A **deadline** is “finish by this moment”. It travels with the request and shrinks at every hop.",
            "Pass the **remaining time** between machines so clock differences don't matter.",
            "If the budget is spent, **fail immediately**; starting work that nobody will read is the most expensive kind of waste.",
          ],
        },
      ],
    },

    // ─────────────────────────────── 4. Retries ───────────────────────────────
    {
      id: "fnd-rel-4-retries",
      title: "Retries: what's worth repeating",
      summary: "A retry is a bet that the failure was temporary. Learn which errors to retry, which never to, and which operations are safe to repeat.",
      minutes: 7,
      xp: 55,
      steps: [
        {
          kind: "explain",
          title: "A retry is a bet",
          body: "Many failures are **transient**: a server restarting, a packet lost, a briefly overloaded node. Trying again a moment later often just works, and that is why every serious client retries.\n\nBut a retry is only a good bet when the failure is *temporary*. If the request is wrong, sending it again just fails again, wasting time and load. So the first skill is telling the two apart.",
        },
        {
          kind: "question",
          title: "Sort the failures",
          body: "Each of these just happened to your client. Decide what it should do next.",
          widget: {
            type: "rel-sort",
            props: {
              buckets: [
                { id: "retry", label: "Retry soon" },
                { id: "wait", label: "Wait as told, then retry" },
                { id: "stop", label: "Don't retry" },
              ],
              items: [
                { id: "400", text: "400 Bad Request", mono: true, bucket: "stop", why: "The request itself is malformed. The same bytes will get the same answer." },
                { id: "404", text: "404 Not Found", mono: true, bucket: "stop", why: "That thing isn't there. Asking again won't make it appear." },
                { id: "429", text: "429 Too Many Requests · Retry-After: 30", mono: true, bucket: "wait", why: "You're being rate-limited, and the server told you how long to wait. Hurrying makes it worse." },
                { id: "503", text: "503 Service Unavailable · Retry-After: 5", mono: true, bucket: "wait", why: "The server asked you to come back in 5 seconds, so do exactly that." },
                { id: "502", text: "502 Bad Gateway", mono: true, bucket: "retry", why: "A proxy couldn't reach its backend; that is usually brief." },
                { id: "reset", text: "Connection reset by peer", bucket: "retry", why: "The connection broke, which says nothing about the request. A new connection often works." },
                { id: "422", text: "422 Unprocessable: “email is not valid”", mono: true, bucket: "stop", why: "Your data failed validation. Only changing the data can fix it." },
                { id: "401", text: "401 Unauthorized", mono: true, bucket: "stop", why: "Your credentials are wrong or expired. Repeating the call won't help; refreshing the credentials might, but that's a different action." },
              ],
            },
          },
          question: { type: "widget", goal: { done: true } },
          explanation: "The pattern: **client errors (4xx)** mean *you* sent something wrong, so don't retry (except 408 and 429, where the server is asking you to slow down or try again). **Server and network errors** (502, 503, 504, resets, timeouts) are often temporary, so retry with a wait. If the server tells you how long to wait (`Retry-After`), obey it.",
        },
        {
          kind: "question",
          title: "Not like a GET",
          body: "A `POST /charge-card` call times out. Is it safe to retry it exactly the way you'd retry a `GET /parcel/4417`?",
          question: {
            type: "choice",
            options: ["Yes, a retry is a retry", "No: the first charge may already have gone through, so a retry could charge twice", "Yes, because the card company deduplicates", "No: POST can never be retried"],
            answer: 1,
          },
          explanation: "A timeout doesn't say the server did nothing, so the first charge may well have gone through. Reading data twice is harmless; **charging twice isn't**. Whether an operation is safe to repeat is the second question to ask before every retry, and the lesson on idempotency shows how to make it safe.",
        },
        {
          kind: "explain",
          title: "The three questions",
          body: "Before retrying, ask:\n\n1. **Is the failure likely temporary?** (Not a 400, not a 404.)\n2. **Is the operation safe to repeat?** (Reads, or writes made safe.)\n3. **Is there budget left?** (Time before the deadline; room before you overload the service.)\n\nThe HTTP standard marks some methods as **idempotent**, meaning repeating them has the same effect as doing them once: `GET`, `PUT`, `DELETE` (and `HEAD`, `OPTIONS`). `POST` is the usual suspect: it often *creates* something.",
        },
        {
          kind: "question",
          title: "Safe to repeat",
          body: "Which of these HTTP methods are **idempotent by definition**? Pick all that apply.",
          question: { type: "choice", options: ["GET: fetch a record", "POST: create a record", "PUT: replace a record with this exact content", "DELETE: remove a record"], answer: [0, 2, 3] },
          explanation: "Setting a record to a fixed value (`PUT`) leaves the same result however many times you do it; so does deleting something (gone is gone). `POST` creates a *new* thing every time, so two POSTs can make two records.",
        },
        {
          kind: "question",
          title: "What about 500?",
          body: "A server answers **500 Internal Server Error**. A sensible default policy for your client is…",
          question: {
            type: "choice",
            options: [
              "Retry forever until it works",
              "Retry a couple of times with a growing pause, then give up",
              "Never retry any 5xx",
              "Retry instantly, as fast as possible",
            ],
            answer: 1,
          },
          explanation: "Some 500s are momentary (a node hiccuped), but many are **bugs that repeat** for the same input. A small, limited number of paced retries catches the first kind without hammering the second. Unlimited or instant retries turn a bug into an outage.",
        },
        {
          kind: "code",
          title: "The retry decision",
          body: "Write `should_retry(status, attempt, max_attempts)`.\n\n- `status` is an HTTP status code, or `None` when the call failed at the network level (reset, timeout).\n- Retry only for `None` or for **408, 429, 502, 503, 504**.\n- Stop once `attempt` has reached `max_attempts` (`attempt` counts the tries already made).",
          language: "python",
          starter: "RETRYABLE = {408, 429, 502, 503, 504}\n\n\ndef should_retry(status, attempt, max_attempts):\n    return attempt < max_attempts\n",
          solution: "RETRYABLE = {408, 429, 502, 503, 504}\n\n\ndef should_retry(status, attempt, max_attempts):\n    if attempt >= max_attempts:\n        return False\n    return status is None or status in RETRYABLE\n",
          tests: [
            { id: "network", description: "a network error is retried", assertionCode: `assert should_retry(None, 1, 3) is True, "network failures are worth another try"` },
            { id: "503", description: "503 on the second try, three allowed", assertionCode: `assert should_retry(503, 2, 3) is True, "503 is temporary and a try is left"` },
            { id: "budget", description: "no attempts left: stop", assertionCode: `assert should_retry(503, 3, 3) is False, "3 tries already made"` },
            { id: "404", description: "404 is never retried", assertionCode: `assert should_retry(404, 1, 3) is False, "the thing doesn't exist"` },
            { id: "400", description: "400 is never retried", assertionCode: `assert should_retry(400, 1, 3) is False, "bad request stays bad"` },
            { id: "200", description: "success needs no retry", assertionCode: `assert should_retry(200, 1, 3) is False, "it worked"` },
            { id: "429", description: "429 is retried (after a wait)", assertionCode: `assert should_retry(429, 1, 5) is True, "rate limited: try later"` },
          ],
          hints: ["Check the attempt limit first: if `attempt >= max_attempts`, return `False`.", "`status is None or status in RETRYABLE`"],
        },
        {
          kind: "recap",
          points: [
            "A retry is a bet that the failure is **temporary**. Retry network errors, timeouts and 408/429/502/503/504; don't retry 400, 401, 404 or 422.",
            "Obey **`Retry-After`** when the server sends it.",
            "Only retry operations that are **safe to repeat** (idempotent): GET, PUT and DELETE by definition, POST only with extra care.",
            "Always cap the number of attempts. Unlimited retries turn bugs into outages.",
          ],
        },
      ],
    },

    // ─────────────────────────────── 5. Backoff and jitter ───────────────────────────────
    {
      id: "fnd-rel-5-backoff",
      title: "Backoff and jitter",
      summary: "How long to wait between retries: growing delays, caps, and a pinch of randomness so clients don't move in lockstep.",
      minutes: 8,
      xp: 60,
      steps: [
        {
          kind: "explain",
          title: "Don't ask again immediately",
          body: "Failures that fix themselves usually need a moment: a process restarts, a failover completes, a queue drains. Asking again 1 ms later mostly gets the same answer and adds load to a system that's struggling.\n\nSo each retry waits a bit **longer** than the last. The classic recipe is **exponential backoff**: the wait doubles with every failure (`base × 2 × 2 × …`), up to a **cap** so it never grows silly.",
        },
        {
          kind: "explain",
          title: "Fixed against doubling",
          body: "Each row is the wait *after* that failure. With **fixed** every row is the same. With **exponential** they double until they hit the cap. Change the base, the cap and the number of attempts.",
          widget: { type: "rel-backoff", props: { strategies: ["fixed", "exp"], strategy: "exp", base: 500, cap: 8000, attempts: 6 }, live: true },
        },
        {
          kind: "question",
          title: "Do the doubling",
          body: "Base delay **200 ms**, doubling after each failure, no cap. How long (in ms) is the wait after the **5th** failure?",
          question: { type: "number", answer: 3200, unit: "ms" },
          explanation: "200 → 400 → 800 → 1,600 → **3,200 ms**. That's `200 × 2⁴`. Without a cap, wait number 10 would be over 100 seconds, which is why you always set one.",
        },
        {
          kind: "question",
          title: "Tame the tail",
          body: "Use **exponential** with at least **6 attempts**, and set the cap so that **no single wait is longer than 5 seconds**.",
          widget: { type: "rel-backoff", props: { strategies: ["fixed", "exp"], strategy: "exp", base: 500, cap: 20000, attempts: 3 } },
          question: { type: "widget", goal: { strategy: "exp", maxWait: 5000, minAttempts: 6 } },
          explanation: "A cap of 5 s (or lower) with 6 attempts: 0.5, 1, 2, 4, 5, 5 seconds. The cap keeps a user-facing call responsive and bounds the total time spent retrying.",
        },
        {
          kind: "explain",
          title: "The problem with doubling",
          body: "Imagine 1,000 phones all lose their connection at the same instant. With plain exponential backoff they all wait 1 s, **all** retry together, all wait 2 s, **all** retry together... The delays are perfectly synchronised, so the server sees a spike every time.\n\nThe cure is **jitter**: add randomness so the herd spreads out.\n\n- **Full jitter**: wait a random time between 0 and the ceiling.\n- **Equal jitter**: wait half the ceiling, plus a random amount up to the other half.\n\nTry them. Each *Roll again* draws new random waits.",
          widget: { type: "rel-backoff", props: { strategies: ["exp", "full", "equal"], strategy: "full", base: 500, cap: 8000, attempts: 6 }, live: true },
        },
        {
          kind: "question",
          title: "What jitter is for",
          body: "Why does adding jitter help when many clients fail at the same moment?",
          question: {
            type: "choice",
            options: [
              "It makes the total waiting time shorter for everyone",
              "It spreads the retries out in time, so they don't all land together",
              "It guarantees the next retry succeeds",
              "It lets clients skip the cap",
            ],
            answer: 1,
          },
          explanation: "Jitter doesn't make anyone's wait shorter or guarantee success. What it removes is **synchronisation**: instead of a spike of 1,000 requests at the same instant, the server sees a gentle stream. You'll see this in the next lesson's retry-storm chart.",
        },
        {
          kind: "code",
          title: "Delay with jitter",
          body: "Write `backoff_delay(attempt, base, cap, rand)` for **full jitter**. `attempt` counts failures from 1. The ceiling is `min(cap, base × 2^(attempt-1))`; the delay is that ceiling times `rand` (a number in [0, 1) passed in, so tests are predictable).",
          language: "python",
          starter: "def backoff_delay(attempt, base, cap, rand):\n    return base * 2 ** (attempt - 1)\n",
          solution: "def backoff_delay(attempt, base, cap, rand):\n    ceiling = min(cap, base * 2 ** (attempt - 1))\n    return rand * ceiling\n",
          tests: [
            { id: "first", description: "attempt 1, half a roll", assertionCode: `assert abs(backoff_delay(1, 0.5, 10, 0.5) - 0.25) < 1e-9, f"got {backoff_delay(1, 0.5, 10, 0.5)!r}"` },
            { id: "grows", description: "attempt 4 doubles three times", assertionCode: `assert abs(backoff_delay(4, 0.5, 10, 1.0) - 4.0) < 1e-9, f"got {backoff_delay(4, 0.5, 10, 1.0)!r}"` },
            { id: "cap", description: "the cap limits the ceiling", assertionCode: `assert abs(backoff_delay(10, 0.5, 10, 1.0) - 10.0) < 1e-9, f"got {backoff_delay(10, 0.5, 10, 1.0)!r}"` },
            { id: "zero", description: "a roll of 0 means no wait", assertionCode: `assert backoff_delay(3, 1, 100, 0.0) == 0, "0 * ceiling is 0"` },
          ],
          hints: ["First compute the ceiling: `min(cap, base * 2 ** (attempt - 1))`.", "Then multiply by `rand`."],
        },
        {
          kind: "code",
          title: "The retry loop",
          body: "Write `call_with_retry(fn, max_attempts, sleep, delay_for)`.\n\nCall `fn()`. If it raises an exception, wait with `sleep(delay_for(attempt))` (where `attempt` is the number of the try that just failed, starting at 1) and try again. Return `fn`'s result as soon as one works. If every attempt fails, raise the **last** exception, with no sleep after the final failure.",
          language: "python",
          starter: "def call_with_retry(fn, max_attempts, sleep, delay_for):\n    return fn()\n",
          solution: "def call_with_retry(fn, max_attempts, sleep, delay_for):\n    for attempt in range(1, max_attempts + 1):\n        try:\n            return fn()\n        except Exception:\n            if attempt == max_attempts:\n                raise\n            sleep(delay_for(attempt))\n",
          tests: [
            { id: "first", description: "works first time: no sleeping", assertionCode: `slept = []\nr = call_with_retry(lambda: "ok", 3, slept.append, lambda a: a * 10)\nassert r == "ok" and slept == [], f"got {r!r}, slept {slept!r}"` },
            {
              id: "flaky",
              description: "fails twice, then works",
              assertionCode: `calls = []\ndef flaky():\n    calls.append(1)\n    if len(calls) < 3:\n        raise ConnectionError("down")\n    return "ok"\nslept = []\nr = call_with_retry(flaky, 5, slept.append, lambda a: a * 10)\nassert r == "ok", f"got {r!r}"\nassert slept == [10, 20], f"slept {slept!r}"`,
            },
            {
              id: "giveup",
              description: "always fails: raises after max_attempts tries",
              assertionCode: `calls = []\ndef broken():\n    calls.append(1)\n    raise TimeoutError("nope")\nslept = []\ntry:\n    call_with_retry(broken, 3, slept.append, lambda a: a)\n    raise AssertionError("should have raised")\nexcept TimeoutError:\n    pass\nassert len(calls) == 3, f"{len(calls)} calls"\nassert slept == [1, 2], f"slept {slept!r}"`,
            },
          ],
          hints: ["`for attempt in range(1, max_attempts + 1):` with `try: return fn()`.", "In the `except` branch: if this was the last attempt, `raise`; otherwise `sleep(delay_for(attempt))`."],
        },
        {
          kind: "recap",
          points: [
            "Wait **longer after each failure**: exponential backoff doubles the delay, up to a **cap**.",
            "Without randomness, clients that fail together retry together. **Jitter** spreads them out.",
            "Full jitter: wait a random time from 0 up to `min(cap, base × 2^(n-1))`.",
            "Always bound the **number of attempts** as well as each wait.",
          ],
        },
      ],
    },
    // ─────────────────────────────── 6. Retry storms ───────────────────────────────
    {
      id: "fnd-rel-6-storms",
      title: "Retry storms and budgets",
      summary: "How retries can finish off a service that was only wobbling, and how a retry budget caps the damage.",
      minutes: 8,
      xp: 65,
      steps: [
        {
          kind: "explain",
          title: "Friendly fire",
          body: "Tickets for the derby go on sale at noon, and **200 fans** all tap Buy inside the same second. The ticket service can absorb **80 requests a second**. The rest get errors, and every fan's app does what we taught it: it retries.\n\nBut retries are *more load*, arriving at a service that is already the one in trouble. If they arrive in lockstep, or too fast, the retries themselves can keep the service down long after the original crowd would have drained. This is a **retry storm**.",
        },
        {
          kind: "explain",
          title: "Sale day",
          body: "The chart shows attempts per second reaching the ticket service. The dashed line is its capacity. Try each retry policy in turn: *Retry at once*, *Fixed 2 s*, *Exponential*, and *Exponential + jitter*.\n\nWatch the **retry peak** and **gave up** readouts. (When the service gets more than twice its capacity in a moment, it thrashes and absorbs even less in the next.)",
          widget: { type: "rel-storm", props: { policy: "fixed", clients: 200 }, live: true },
        },
        {
          kind: "question",
          title: "Calm the herd",
          body: "Choose the policy that leaves **nobody** giving up and keeps the retries to **at most 100 attempts a second** (capacity is 80).",
          widget: { type: "rel-storm", props: { policy: "fixed", clients: 200 } },
          question: { type: "widget", goal: { maxLost: 0, maxRetryPeak: 100 } },
          explanation: "Only **exponential backoff with jitter** keeps the retries inside the service's capacity. “Fixed 2 s” and plain “Exponential” bunch everyone up: all the fans who failed together wait the same time and come back together. Retrying at once is the worst: it uses up all the attempts within the first second, while the service is still buried.",
        },
        {
          kind: "explain",
          title: "Retries multiply across layers",
          body: "Real systems have layers: the app calls the **API**, the API calls the **service**, the service calls the **database**. If each layer retries up to 3 times *independently*, the database sees up to 3 × 3 × 3 requests for one user tap.\n\n" + text("app  → API        3 tries\nAPI  → service    3 tries each\nsvc  → database  3 tries each\n\nworst case at the database: 3 × 3 × 3 = 27 requests\nfor ONE tap on the screen") + "\nA struggling database gets **27× the load** exactly when it can least take it.",
        },
        {
          kind: "question",
          title: "Count the pile-up",
          body: "Four layers, each allowed **4 attempts** (the first try plus 3 retries). In the worst case, how many requests reach the deepest layer for one user action?",
          question: { type: "number", answer: 256 },
          explanation: "4 × 4 × 4 × 4 = **256**. Retries *multiply* going down. This is why large systems pick **one** place to retry (usually closest to the failing call, or at the edge) and let the other layers fail fast.",
        },
        {
          kind: "question",
          title: "Where does the retry live?",
          body: "In a three-layer stack, which retry policy is the safest default?",
          question: {
            type: "choice",
            options: [
              "Every layer retries 3 times, to be safe",
              "One layer retries; the others pass the failure straight up",
              "No layer ever retries",
              "Only the user retries, by pressing the button",
            ],
            answer: 1,
          },
          explanation: "One deliberate place keeps the total predictable (here, 3 tries instead of 27). The others should return errors quickly and leave it to the retrying layer. Having **no** retries makes every blip visible to users; having them **everywhere** multiplies load.",
        },
        {
          kind: "explain",
          title: "A retry budget",
          body: "Backoff and jitter spread retries out. A **retry budget** *limits* them: allow retries only up to a small fraction of your normal traffic, say **10%**.\n\nIn a quiet moment, a failed request retries freely. When a dependency has completely failed, every request wants to retry, but only the first 10% are allowed. The rest fail straight away. The extra load on the sick service is capped at **1.1× normal**, instead of 3× or 27×.",
        },
        {
          kind: "question",
          title: "Do the sum",
          body: "Normal traffic is **1,000 requests a minute**, with a **10%** retry budget. A dependency fails completely, and every request would love to retry 3 times. At most how many requests a minute reach that dependency now?",
          question: { type: "number", answer: 1100 },
          explanation: "1,000 first attempts plus at most **100** budgeted retries = **1,100**. Without the budget, retrying 3 times would send up to 4,000. The budget doesn't make the failure disappear; it keeps your retries from becoming the second outage.",
        },
        {
          kind: "code",
          title: "Write the budget",
          body: "Complete `RetryBudget`. `record_request()` counts a normal request. `can_retry()` answers whether one more retry is allowed: it's allowed while retries (counting this one) stay **within `ratio × requests`**. When it says yes, it counts that retry.",
          language: "python",
          starter: "class RetryBudget:\n    def __init__(self, ratio):\n        self.ratio = ratio\n        self.requests = 0\n        self.retries = 0\n\n    def record_request(self):\n        self.requests += 1\n\n    def can_retry(self):\n        return True\n",
          solution: "class RetryBudget:\n    def __init__(self, ratio):\n        self.ratio = ratio\n        self.requests = 0\n        self.retries = 0\n\n    def record_request(self):\n        self.requests += 1\n\n    def can_retry(self):\n        if self.retries + 1 <= self.ratio * self.requests:\n            self.retries += 1\n            return True\n        return False\n",
          tests: [
            { id: "none", description: "no traffic yet: no retries", assertionCode: `b = RetryBudget(0.25)\nassert b.can_retry() is False, "nothing has been requested yet"` },
            {
              id: "quarter",
              description: "4 requests earn one retry",
              assertionCode: `b = RetryBudget(0.25)\nfor _ in range(4):\n    b.record_request()\nassert b.can_retry() is True, "4 requests at 25% = 1 retry"\nassert b.can_retry() is False, "the budget is spent"`,
            },
            {
              id: "grows",
              description: "more traffic earns more retries",
              assertionCode: `b = RetryBudget(0.25)\nfor _ in range(8):\n    b.record_request()\nanswers = [b.can_retry() for _ in range(4)]\nassert answers == [True, True, False, False], f"got {answers!r}"`,
            },
            {
              id: "refill",
              description: "later requests refill it",
              assertionCode: `b = RetryBudget(0.5)\nfor _ in range(2):\n    b.record_request()\nassert b.can_retry() is True\nassert b.can_retry() is False\nfor _ in range(2):\n    b.record_request()\nassert b.can_retry() is True, "2 more requests earn another retry"`,
            },
          ],
          hints: ["A retry is allowed if `self.retries + 1 <= self.ratio * self.requests`.", "Remember to add one to `self.retries` when you say yes."],
        },
        {
          kind: "recap",
          points: [
            "Retries are **extra load** on a service that is already in trouble. Synchronised or instant retries can keep it down.",
            "**Jitter** spreads retries out; **exponential backoff** slows them down.",
            "Retries **multiply across layers** (3 × 3 × 3 = 27). Retry in one place and let the rest fail fast.",
            "A **retry budget** (e.g. retries ≤ 10% of requests) caps the extra load no matter how bad the failure is.",
          ],
        },
      ],
    },

    // ─────────────────────────────── 7. Idempotency ───────────────────────────────
    {
      id: "fnd-rel-7-idempotency",
      title: "Idempotency",
      summary: "Making a repeat harmless: idempotency keys, stored results, and what “exactly once” really means.",
      minutes: 9,
      xp: 70,
      steps: [
        {
          kind: "explain",
          title: "Doing it twice",
          body: "A timeout leaves you with a question you cannot answer: *did it happen?* If you retry, and it had happened, you do it twice.\n\nAn operation is **idempotent** if doing it twice has the **same effect as doing it once**. Setting a thermostat to 21° is idempotent; “raise the temperature by 1°” is not. If every write were idempotent, retrying would always be safe, so we try to make them so.",
        },
        {
          kind: "question",
          title: "Which are naturally safe?",
          body: "Which of these operations are **naturally idempotent**? Pick all that apply.",
          question: {
            type: "choice",
            options: [
              "Set seat 14C's owner to Maya",
              "Add €10 to Maya's balance",
              "Delete order #77",
              "Append a line to the audit log",
              "Send Maya an SMS",
            ],
            answer: [0, 2],
          },
          explanation: "“Set to a value” and “delete” leave the same final state however often you do them. “Add”, “append” and “send” each change the world *again* every time. Those are the ones that need protection.",
        },
        {
          kind: "explain",
          title: "Pay twice",
          body: "A fan buys a €40 ticket. The service charges the card and replies, but the reply is lost. The phone shows an error, so the fan taps **Retry**.\n\nTurn on **Lose next reply**, press *Buy ticket*, then *Retry*, and look at the card charges.",
          widget: { type: "rel-idem", props: { mode: "none", lockMode: true }, live: true },
        },
        {
          kind: "question",
          title: "Charged twice",
          body: "Reproduce the double charge: buy **one** ticket with the reply lost, retry, and end up with **2 charges**.",
          widget: { type: "rel-idem", props: { mode: "none", lockMode: true } },
          question: { type: "widget", goal: { mode: "none", charges: 2, retried: true } },
          explanation: "To the server, the retry looked exactly like a second purchase: same shape, no way to tell. Nothing was “broken”; the protocol just had no way to say *this is the same attempt as before*.",
        },
        {
          kind: "explain",
          title: "The idempotency key",
          body: "The fix is to let the client say it. For each *intention* (“buy this ticket”), the client generates a random **idempotency key** once, and sends it with every attempt of that intention.\n\nThe server keeps a table: **key → the result it produced**. When a request arrives with a key it has seen, it doesn't do the work again. It returns the stored result. The retry now means *“give me the answer to the thing I already asked”*.",
        },
        {
          kind: "question",
          title: "Safe retry",
          body: "Switch to **With a key** and run the same story: one ticket, reply lost, retry. Finish with exactly **1 charge**, after the server has seen the repeat.",
          widget: { type: "rel-idem", props: { mode: "none" } },
          question: { type: "widget", goal: { mode: "key", charges: 1, retried: true, duplicateArrived: true } },
          explanation: "The retry reached the server, which found the key in its table and replied with the stored receipt: **no second charge**. The fan sees a normal success. Notice what the *client* did differently: nothing but send the same key again.",
        },
        {
          kind: "question",
          title: "Who makes the key?",
          body: "Where should an idempotency key come from?",
          question: {
            type: "choice",
            options: [
              "The server, when it first receives the request",
              "The client, once per user intention, reused on every retry of it",
              "The client, freshly generated for every attempt",
              "The customer's card number",
            ],
            answer: 1,
          },
          explanation: "Only the client knows that attempt 2 is a retry of attempt 1. If the server made the key, it couldn't tell the client's retry from a new request. A fresh key per attempt would defeat the purpose; a card number would make every purchase on that card look like a duplicate.",
        },
        {
          kind: "explain",
          title: "Details that matter",
          body: "Servers that take idempotency seriously also:\n\n- **Store the key and the result together**, in the same transaction as the work, so a crash can't leave one without the other.\n- Handle **two copies at the same time**: the second one waits for, or is told about, the first (an HTTP 409 is common).\n- **Reject a reused key with a different request** (same key, different amount): that is a client bug, not a retry.\n- Forget keys after a while (a day is typical).\n\nAnd what about “**exactly once**”? A network can lose, repeat or delay any message, so a message can't be *physically* delivered exactly once. What you can get is **at-least-once delivery** (keep trying until acknowledged) plus **idempotent handling** (ignore repeats). Together they give exactly-once *effect*.",
        },
        {
          kind: "question",
          title: "Exactly once",
          body: "A vendor promises “exactly-once processing”. What can that honestly mean?",
          question: {
            type: "choice",
            options: [
              "Each message crosses the network exactly one time",
              "Messages may arrive more than once, but the effect is applied once, thanks to deduplication",
              "No failure can ever happen",
              "Messages are never retried",
            ],
            answer: 1,
          },
          explanation: "It means the **effect** happens once, built from at-least-once delivery and idempotent handling (often by remembering the IDs of messages already processed). It never means that the wire carried a message just once.",
        },
        {
          kind: "code",
          title: "Remember the key",
          body: "Finish `PaymentService.pay(key, amount)`. Each *new* key charges once: append the amount to `self.charges` and return a receipt `{\"receipt\": n, \"amount\": amount}` where `n` is the number of charges so far. A key it has **already seen** must not charge again; it returns the receipt stored the first time.",
          language: "python",
          starter: "class PaymentService:\n    def __init__(self):\n        self.charges = []   # amounts actually taken from cards\n        self.seen = {}      # idempotency key -> receipt\n\n    def pay(self, key, amount):\n        self.charges.append(amount)\n        return {\"receipt\": len(self.charges), \"amount\": amount}\n",
          solution: "class PaymentService:\n    def __init__(self):\n        self.charges = []   # amounts actually taken from cards\n        self.seen = {}      # idempotency key -> receipt\n\n    def pay(self, key, amount):\n        if key in self.seen:\n            return self.seen[key]\n        self.charges.append(amount)\n        receipt = {\"receipt\": len(self.charges), \"amount\": amount}\n        self.seen[key] = receipt\n        return receipt\n",
          tests: [
            { id: "once", description: "a repeated key charges once", assertionCode: `s = PaymentService()\ns.pay("k1", 40)\ns.pay("k1", 40)\nassert s.charges == [40], f"charges {s.charges!r}"` },
            { id: "same-receipt", description: "the repeat returns the first receipt", assertionCode: `s = PaymentService()\na = s.pay("k1", 40)\nb = s.pay("k1", 40)\nassert a == b == {"receipt": 1, "amount": 40}, f"{a!r} {b!r}"` },
            { id: "two", description: "different keys are different purchases", assertionCode: `s = PaymentService()\ns.pay("k1", 40)\nr = s.pay("k2", 25)\nassert s.charges == [40, 25], f"charges {s.charges!r}"\nassert r["receipt"] == 2, f"got {r!r}"` },
            { id: "later", description: "an old key still works after other purchases", assertionCode: `s = PaymentService()\ns.pay("a", 10)\ns.pay("b", 20)\nr = s.pay("a", 10)\nassert r["receipt"] == 1 and s.charges == [10, 20], f"{r!r} {s.charges!r}"` },
          ],
          hints: ["At the top of `pay`, check `if key in self.seen:` and return what is stored.", "After charging, save the receipt: `self.seen[key] = receipt`."],
        },
        {
          kind: "recap",
          points: [
            "An operation is **idempotent** when doing it twice equals doing it once. “Set” and “delete” are; “add” and “send” aren't.",
            "The client makes one **idempotency key per intention** and reuses it on every retry.",
            "The server stores **key → result** (atomically with the work) and returns the stored result for a repeat.",
            "“**Exactly once**” in practice = at-least-once delivery + idempotent handling: the *effect* happens once.",
          ],
        },
      ],
    },

    // ─────────────────────────────── 8. Circuit breakers ───────────────────────────────
    {
      id: "fnd-rel-8-breakers",
      title: "Circuit breakers",
      summary: "Stop calling something that is clearly down, fail fast instead, and test the water now and then.",
      minutes: 9,
      xp: 70,
      steps: [
        {
          kind: "explain",
          title: "Stop knocking on a locked door",
          body: "Timeouts and backoff make each failed call cheaper, but you still make the call, wait for the failure, and only then give up. If the dependency has been down for five minutes, every one of your users pays that wait, and the sick service gets no peace to recover.\n\nA **circuit breaker** watches the recent calls. After enough failures in a row, it **opens**: from then on calls are refused *immediately*, without touching the dependency. After a cool-down, it lets a single test call through to see if things are better.\n\nThink of a receptionist who, after five unanswered calls to an office, stops transferring visitors there and tries the line once every few minutes.",
        },
        {
          kind: "explain",
          title: "Three states",
          body: "- **Closed**: normal. Calls go through; the breaker counts failures in a row.\n- **Open**: the dependency is considered down. Every call is refused instantly, until the cool-down has passed.\n- **Half-open**: the cool-down is over. One **test call** is let through. If it works, the breaker **closes**; if it fails, it **opens** again and the cool-down restarts.",
        },
        {
          kind: "explain",
          title: "Play with one",
          body: "Send some requests while the dependency is healthy. Then flip it to **failing** and keep sending. Use *Wait 1 s* to move the clock, or turn on *Auto*. Try changing how many failures trip it, and how long the cool-down is.",
          widget: { type: "rel-breaker", props: { threshold: 3, cooldown: 4 }, live: true },
        },
        {
          kind: "question",
          title: "Trip it",
          body: "Make the breaker **open**.",
          widget: { type: "rel-breaker", props: { threshold: 3, cooldown: 4, fixed: true } },
          question: { type: "widget", goal: { everOpened: true } },
          explanation: "Three failures in a row tripped it. From that point the log shows requests being **refused at once**, with no call made to the dependency: fast failures for users, and quiet for the struggling service.",
        },
        {
          kind: "question",
          title: "The full cycle",
          body: "Now the whole story: trip the breaker, **heal the dependency**, let the cool-down pass, and send a request so the breaker **closes again**.",
          widget: { type: "rel-breaker", props: { threshold: 3, cooldown: 4, fixed: true } },
          question: { type: "widget", goal: { everOpened: true, recovered: true } },
          explanation: "The breaker moved closed → open → half-open → closed. While open it protected the dependency and the callers' time; the test call is how it noticed the recovery without any human involved.",
        },
        {
          kind: "question",
          title: "What the caller gets",
          body: "While a breaker is **open**, what should a caller receive?",
          question: {
            type: "choice",
            options: ["It waits for its normal timeout, then fails", "An immediate failure, or a fallback answer", "A retry loop until the breaker closes", "A made-up success"],
            answer: 1,
          },
          explanation: "The whole point is to **fail fast**: no waiting, no worker held. The caller can show an error right away or, better, serve a fallback (a cached or default answer, which is the topic of the next lesson).",
        },
        {
          kind: "question",
          title: "Why only one test?",
          body: "In the half-open state, why does the breaker let only **one** (or very few) calls through, instead of opening the floodgates?",
          question: {
            type: "choice",
            options: [
              "To avoid slamming a service that is only just recovering with the full traffic at once",
              "To save memory in the breaker",
              "Because a half-open breaker is broken",
              "To make the logs shorter",
            ],
            answer: 0,
          },
          explanation: "A service coming back from an outage is fragile, with cold caches and empty connection pools. One careful probe tells you whether it has recovered, and if not, costs almost nothing.",
        },
        {
          kind: "question",
          title: "Tuning",
          body: "A breaker is set to open after **just 2 failures in a row**. What's the most likely problem in production?",
          question: {
            type: "choice",
            options: [
              "It trips on harmless blips, cutting off a dependency that was fine",
              "It never trips",
              "It makes calls slower",
              "It can't be closed again",
            ],
            answer: 0,
          },
          explanation: "A hair-trigger breaker turns a pair of unlucky packets into a self-inflicted outage. Real breakers usually look at a **rate** over a window (for example 50% failures over the last 20 calls, with a minimum number of calls) rather than a handful of failures.",
        },
        {
          kind: "code",
          title: "Build the breaker",
          body: "Complete `CircuitBreaker` (time is passed in, so tests are predictable).\n\n- `allow(now)`: **closed** → `True`. **Open** → `False`, unless `now - opened_at >= cooldown`: then become **half-open** and return `True` (that call is the test). **Half-open** with a test already out → `False`.\n- `record(ok, now)`: report how an allowed call went. Closed: a success resets the failure count; a failure adds one and opens the breaker at `threshold` (remember `opened_at = now`). Half-open: success → closed (count reset); failure → open again with `opened_at = now`.",
          language: "python",
          starter: "class CircuitBreaker:\n    def __init__(self, threshold, cooldown):\n        self.threshold = threshold\n        self.cooldown = cooldown\n        self.state = \"closed\"\n        self.failures = 0\n        self.opened_at = 0\n        self.test_out = False\n\n    def allow(self, now):\n        return True\n\n    def record(self, ok, now):\n        pass\n",
          solution: "class CircuitBreaker:\n    def __init__(self, threshold, cooldown):\n        self.threshold = threshold\n        self.cooldown = cooldown\n        self.state = \"closed\"\n        self.failures = 0\n        self.opened_at = 0\n        self.test_out = False\n\n    def allow(self, now):\n        if self.state == \"closed\":\n            return True\n        if self.state == \"open\":\n            if now - self.opened_at >= self.cooldown:\n                self.state = \"half\"\n                self.test_out = True\n                return True\n            return False\n        # half-open: only one test call at a time\n        if self.test_out:\n            return False\n        self.test_out = True\n        return True\n\n    def record(self, ok, now):\n        if self.state == \"half\":\n            self.test_out = False\n            if ok:\n                self.state = \"closed\"\n                self.failures = 0\n            else:\n                self.state = \"open\"\n                self.opened_at = now\n            return\n        if ok:\n            self.failures = 0\n        else:\n            self.failures += 1\n            if self.failures >= self.threshold:\n                self.state = \"open\"\n                self.opened_at = now\n",
          tests: [
            {
              id: "trips",
              description: "opens after `threshold` failures in a row",
              assertionCode: `b = CircuitBreaker(3, 10)\nfor t in range(3):\n    assert b.allow(t) is True, "closed lets calls through"\n    b.record(False, t)\nassert b.state == "open", f"state is {b.state!r}"\nassert b.allow(3) is False, "open refuses calls"`,
            },
            {
              id: "reset",
              description: "a success resets the count",
              assertionCode: `b = CircuitBreaker(3, 10)\nfor ok in [False, False, True, False, False]:\n    b.allow(0)\n    b.record(ok, 0)\nassert b.state == "closed", f"state is {b.state!r}"`,
            },
            {
              id: "half",
              description: "after the cool-down, one test call is allowed",
              assertionCode: `b = CircuitBreaker(2, 10)\nfor t in range(2):\n    b.allow(t)\n    b.record(False, t)\nassert b.allow(5) is False, "still cooling down"\nassert b.allow(11) is True, "cool-down over: the test call"\nassert b.state == "half", f"state is {b.state!r}"\nassert b.allow(11) is False, "only one test at a time"`,
            },
            {
              id: "closes",
              description: "a good test call closes the breaker",
              assertionCode: `b = CircuitBreaker(2, 10)\nfor t in range(2):\n    b.allow(t)\n    b.record(False, t)\nb.allow(20)\nb.record(True, 20)\nassert b.state == "closed", f"state is {b.state!r}"\nassert b.allow(21) is True`,
            },
            {
              id: "reopens",
              description: "a bad test call opens it again, restarting the cool-down",
              assertionCode: `b = CircuitBreaker(2, 10)\nfor t in range(2):\n    b.allow(t)\n    b.record(False, t)\nb.allow(20)\nb.record(False, 20)\nassert b.state == "open", f"state is {b.state!r}"\nassert b.allow(25) is False, "cool-down restarted at 20"\nassert b.allow(30) is True, "10 s after the failed test"`,
            },
          ],
          hints: ["`allow` has three cases, one per state. In `open`, compare `now - self.opened_at` with `self.cooldown`.", "`test_out` remembers that a test call is in flight. Set it when you hand out the test, clear it in `record`."],
        },
        {
          kind: "recap",
          points: [
            "A **circuit breaker** stops calls to a dependency that is clearly failing, so callers fail fast and the dependency can rest.",
            "**Closed** (normal, counting failures) → **open** (refuse instantly) → **half-open** (one test call) → closed again if it works.",
            "While open, return an error or a **fallback** at once; never make callers wait.",
            "Tune it: too jumpy trips on blips, too slow protects nobody. Real breakers judge failure *rates* over a window.",
          ],
        },
      ],
    },

    // ─────────────────────────────── 9. Bulkheads and fallbacks ───────────────────────────────
    {
      id: "fnd-rel-9-isolation",
      title: "Bulkheads and fallbacks",
      summary: "Keep one failing part from sinking the rest, and decide what each feature does when its dependency is gone.",
      minutes: 9,
      xp: 70,
      steps: [
        {
          kind: "explain",
          title: "Compartments",
          body: "Ships are built with watertight walls called **bulkheads**, so a hole floods one compartment and not the whole hull. Software borrows the idea: give each dependency, feature or customer its **own** slice of the scarce things (threads, connections, queue space, memory), so one going wrong can only drain its own slice.\n\nWithout it, everything shares one pool, and the loudest problem takes everything.",
        },
        {
          kind: "explain",
          title: "One pool, two features",
          body: "A server has **12 threads**. Every second, 3 payment requests and 3 recommendation requests arrive. Payments finish in 1 s. Switch on *Recommendations is slow*, so that each takes 20 s. Press **Run** in the shared pool and watch who starves.",
          widget: { type: "rel-bulkhead", props: { split: false, slow: false }, live: true },
        },
        {
          kind: "question",
          title: "Wall it off",
          body: "Make recommendations slow, use **separate pools**, and run for at least **15 seconds**. Payments should still be served at least **95%** of the time.",
          widget: { type: "rel-bulkhead", props: { split: false, slow: false } },
          question: { type: "widget", goal: { split: true, slow: true, minT: 15, minPayRate: 0.95 } },
          explanation: "Recommendations can now only fill their own 4 threads. They'll turn away most of their own traffic, which is the right place for the pain, while payments keep all 8 of theirs. **The failure is contained.**",
        },
        {
          kind: "question",
          title: "Spot the bulkheads",
          body: "Which of these are bulkheads? Pick all that apply.",
          question: {
            type: "choice",
            options: [
              "A separate database connection pool for the reporting queries",
              "A cap of 10 concurrent requests per customer",
              "A retry with jitter",
              "Running the image-resizing code in its own process",
            ],
            answer: [0, 1, 3],
          },
          explanation: "A bulkhead is any **boundary that limits how much of a shared resource one party can use**: separate pools, per-tenant concurrency limits, separate processes or machines. Retry-with-jitter is a different tool: it shapes *when* you try, not *how much* of a shared thing you may use.",
        },
        {
          kind: "explain",
          title: "Fallbacks: a weaker answer beats none",
          body: "Isolation limits the damage. A **fallback** decides what the user sees when a dependency has already failed. The idea is **graceful degradation**: lose features one at a time, not the whole page.\n\nFor each feature ask: *is it essential, or nice to have?* Then choose:\n\n- **Hide it** (reviews, recommendations).\n- Show a **saved copy** (yesterday's reviews, labelled).\n- Show a **safe default** (a generic greeting, best-sellers).\n- **Queue it for later** (send the email when the mail service is back).\n- **Fail clearly** only for what truly can't be faked.",
        },
        {
          kind: "explain",
          title: "Build the page",
          body: "This product page is assembled from five services. Knock some down and choose what each section does when it's gone. The preview shows what the shopper sees.",
          widget: { type: "rel-degrade", live: true },
        },
        {
          kind: "question",
          title: "Three down, still selling",
          body: "Knock out **at least three** services, including **Reviews** and **Recommendations**, and set up the fallbacks so the page still loads and the shopper **can still buy**.",
          widget: { type: "rel-degrade" },
          question: { type: "widget", goal: { pageOk: true, buyWorks: true, minDown: 3, mustBeDown: ["reviews", "recs"] } },
          explanation: "Reviews and recommendations are decoration; the page works without them. The *price* is the careful one: the page can show a saved copy of it, as long as checkout confirms the real price again. Degrading is a design decision made **per feature**, ahead of time.",
        },
        {
          kind: "question",
          title: "A dangerous fallback",
          body: "The pricing service is down. Which fallback is the **dangerous** one?",
          question: {
            type: "choice",
            options: [
              "Show the last known price, marked as such, and re-check at checkout",
              "Show a default price of €0.00 so the page still looks complete",
              "Disable the Buy button and say “prices temporarily unavailable”",
              "Show the saved price and block checkout until pricing answers",
            ],
            answer: 1,
          },
          explanation: "A fallback must never invent facts that cost money. Showing a price of €0.00 (or any made-up value) is worse than an error. Good fallbacks are **honest** (labelled saved copies) or **safe** (something that can't do harm, like a hidden section).",
        },
        {
          kind: "question",
          title: "Untested fallbacks",
          body: "A fallback path has existed for two years but has never actually run in production. How much should you trust it?",
          question: {
            type: "choice",
            options: ["Fully: it was reviewed once", "Very little: code that never runs usually has bugs waiting", "Completely, because it is simple", "It does not matter"],
            answer: 1,
          },
          explanation: "Rarely-run code rots: its cache has expired, its config is wrong, its dependency changed. Teams **test fallbacks on purpose** by switching a dependency off in staging, and sometimes in production, to prove the degraded mode still works.",
        },
        {
          kind: "recap",
          points: [
            "A **bulkhead** gives each dependency, feature or customer its own slice of a shared resource, so one failure can't use up everything.",
            "A slow dependency is more dangerous than a dead one, because it holds threads and connections.",
            "A **fallback** is what a feature does when its dependency is gone: hide, saved copy, safe default, queue for later, or fail clearly.",
            "Decide **per feature** what degrades and how, never invent facts (like prices), and **test** the degraded path.",
          ],
        },
      ],
    },

    // ─────────────────────────────── 10. A resilient client ───────────────────────────────
    {
      id: "fnd-rel-10-resilient",
      title: "A resilient client",
      summary: "Put the layers in the right order, test them against flaky, slow, dead and hung dependencies, and write the core as code.",
      minutes: 10,
      xp: 80,
      steps: [
        {
          kind: "explain",
          title: "The layers work together",
          body: "You now have a toolbox. None of the tools is enough alone:\n\n- **Timeouts** keep a stuck call from holding you.\n- **Retries with backoff and jitter** fix short, random failures.\n- A **retry budget** and a **deadline** stop retries from running away.\n- A **circuit breaker** stops pointless calls to something that is down.\n- A **fallback** gives the user something anyway.\n\nThe skill is in how they stack up. In pseudo-code, one call looks like this:\n\n" + py("def get_price(item):\n    if breaker.is_open():                  # fail fast, no call at all\n        return fallback(item)\n    for attempt in range(1, 4):            # bounded by the overall deadline\n        try:\n            return call(item, timeout=0.5) # each attempt has its own timeout\n        except Exception:\n            breaker.record_failure()\n            sleep(jittered_backoff(attempt))\n    return fallback(item)                  # everything failed: the weaker answer"),
        },
        {
          kind: "question",
          title: "Order the steps",
          body: "Put what happens to a single request in the order it happens when the dependency is misbehaving.",
          question: {
            type: "order",
            items: [
              "Ask the circuit breaker whether calling is allowed at all",
              "Make the call with a short per-attempt timeout",
              "The attempt fails or times out, so wait a jittered, growing pause",
              "Try again, while the retry budget and the deadline allow it",
              "Out of attempts: serve the saved-copy fallback",
            ],
          },
          explanation: "The breaker goes first, because there is no point starting an attempt it would refuse. The timeout lives inside each attempt. Retries stay inside the deadline and the budget. The fallback is last: the answer of last resort.",
        },
        {
          kind: "explain",
          title: "The chaos lab",
          body: "200 shoppers' requests pass through a client that depends on a flaky service. Pick a kind of trouble, then switch protections on and off. Each square is one shopper: **green** got an answer, **amber** got a saved copy, **red** got an error.\n\nStart with the **Outage** and nothing switched on. Then add the protections one at a time and watch which readouts change.",
          widget: { type: "rel-client", props: { scenario: "outage" }, live: true },
        },
        {
          kind: "question",
          title: "Random failures",
          body: "Under **Flaky** (3 in 10 calls fail at random), make shoppers see **at least 97%** successes with **no more than 1.5 calls** per shopper.",
          widget: { type: "rel-client", props: { scenario: "flaky" } },
          question: { type: "widget", goal: { scenario: "flaky", minServed: 0.97, maxAmplification: 1.5 } },
          explanation: "For random, short failures, **retries** are the tool: a call that fails 30% of the time still succeeds on one of 3 tries 97% of the time, at an average cost of about 1.35 calls per shopper. Timeouts and breakers don't help here; nothing is slow or down.",
        },
        {
          kind: "question",
          title: "A real outage",
          body: "Under **Outage** (the dependency refuses every call for 15 seconds), reach **99%** of shoppers served, with the **circuit breaker** and **fallback** switched on, making **at most 1 call per shopper** on average.",
          widget: { type: "rel-client", props: { scenario: "outage" } },
          question: { type: "widget", goal: { scenario: "outage", minServed: 0.99, maxAmplification: 1, breaker: true, fallback: true } },
          explanation: "Retries can't fix a dead dependency (they just add calls). The **breaker** stops the pointless calls (fewer than one per shopper, since open-breaker requests make none), and the **fallback** gives every shopper something. Notice that nothing here makes the dependency come back; it only keeps *you* standing until it does.",
        },
        {
          kind: "question",
          title: "The hang",
          body: "Under **Hang** (calls are accepted but never answered), the slowest 5% of shoppers wait the full 3 seconds. Which single protection brings the wait down to a fraction of a second? Try each one.",
          widget: { type: "rel-client", props: { scenario: "hang" }, live: true },
          question: { type: "choice", options: ["Retries with jitter", "A timeout", "A saved-copy fallback", "None can"], answer: 1 },
          explanation: "Only a **timeout** makes a hung call give up early, since retries and fallbacks both have to *wait* for the first attempt to fail before they can act. This is why a timeout is the first line of defence, and the others build on it.",
        },
        {
          kind: "explain",
          title: "Proving it works",
          body: "None of this is worth anything if you haven't seen it fire. Teams prove their protections by **breaking things on purpose**: injecting latency, errors and outages in staging (and carefully in production), during planned **game days**.\n\nAnd they watch the protections in their dashboards: how often the breaker opens, how many retries are spent, how many answers come from fallbacks. A breaker that never opens might be great, or might be misconfigured. You only know if you've tested it.",
        },
        {
          kind: "code",
          title: "The core in code",
          body: "Write `resilient_get(fetch, cache, key, attempts)`.\n\nTry `fetch(key)` up to `attempts` times. On the first success, store the value in `cache[key]` and return `(value, \"live\")`. If every attempt raises an exception, return `(cache[key], \"cache\")` when a saved copy exists; otherwise raise the last exception.",
          language: "python",
          starter: "def resilient_get(fetch, cache, key, attempts):\n    return (fetch(key), \"live\")\n",
          solution: "def resilient_get(fetch, cache, key, attempts):\n    last = None\n    for _ in range(attempts):\n        try:\n            value = fetch(key)\n        except Exception as err:\n            last = err\n            continue\n        cache[key] = value\n        return (value, \"live\")\n    if key in cache:\n        return (cache[key], \"cache\")\n    raise last\n",
          tests: [
            { id: "live", description: "success is returned and saved", assertionCode: `cache = {}\nr = resilient_get(lambda k: k.upper(), cache, "milk", 3)\nassert r == ("MILK", "live"), f"got {r!r}"\nassert cache == {"milk": "MILK"}, f"cache {cache!r}"` },
            {
              id: "retry",
              description: "retries before giving up",
              assertionCode: `calls = []\ndef flaky(k):\n    calls.append(k)\n    if len(calls) < 3:\n        raise ConnectionError("blip")\n    return 42\nr = resilient_get(flaky, {}, "x", 3)\nassert r == (42, "live"), f"got {r!r}"\nassert len(calls) == 3, f"{len(calls)} calls"`,
            },
            {
              id: "fallback",
              description: "falls back to the saved copy",
              assertionCode: `def dead(k):\n    raise TimeoutError("down")\ncache = {"x": "old"}\nr = resilient_get(dead, cache, "x", 2)\nassert r == ("old", "cache"), f"got {r!r}"`,
            },
            {
              id: "nothing",
              description: "no saved copy: the error is raised",
              assertionCode: `def dead(k):\n    raise TimeoutError("down")\ntry:\n    resilient_get(dead, {}, "x", 2)\n    raise AssertionError("should have raised")\nexcept TimeoutError:\n    pass`,
            },
            {
              id: "attempts",
              description: "stops after the allowed number of tries",
              assertionCode: `calls = []\ndef dead(k):\n    calls.append(1)\n    raise ValueError("no")\ntry:\n    resilient_get(dead, {}, "x", 4)\nexcept ValueError:\n    pass\nassert len(calls) == 4, f"{len(calls)} calls"`,
            },
          ],
          hints: ["Loop `for _ in range(attempts)`; use `try`/`except Exception as err` and remember `err` as `last`.", "After the loop: `if key in cache:` return the saved copy, otherwise `raise last`."],
        },
        {
          kind: "recap",
          points: [
            "Each tool fixes a **different** problem: timeouts for silence, retries for blips, breakers for outages, bulkheads for contagion, fallbacks for the user.",
            "Order them well: breaker first, then a per-attempt timeout inside bounded retries (budget and deadline), fallback last.",
            "Retries can't revive a dead dependency; a **breaker plus a fallback** keeps you standing until it returns.",
            "Break things on purpose: protections you have never seen fire are protections you cannot trust.",
          ],
        },
      ],
    },
  ],
};
