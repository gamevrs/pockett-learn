import type { Module } from "../../learn/types.ts";

/** Fenced plain-text block (log lines, headers, output) for lesson prose. */
const text = (s: string) => "```text\n" + s.trim() + "\n```";
const py = (s: string) => "```python\n" + s.trim() + "\n```";

/**
 * Module: observability. How to know what a running system is doing: the three signals, structured
 * logs, metrics and percentiles, RED/USE, tracing, SLOs and error budgets, alerting and dashboards,
 * incident response, and capacity testing.
 */
export const observabilityModule: Module = {
  id: "observability",
  part: "systems",
  title: "Knowing what's happening",
  blurb: "Logs, metrics and traces, structured logging, percentiles, RED and USE, SLOs and error budgets, alerting, dashboards, incident response and load testing.",
  icon: "activity",
  lessons: [
    // ─────────────────────────────── 1. The three signals ───────────────────────────────
    {
      id: "fnd-obs-1-signals",
      title: "Logs, metrics and traces",
      summary: "Three kinds of evidence a running system can give you, what each is good at, and how they fit together.",
      minutes: 8,
      xp: 45,
      steps: [
        {
          kind: "explain",
          title: "A system you cannot see",
          body: "When your code runs on your own laptop you can see everything: add a print, set a breakpoint, poke at it. In production the code runs on machines you may never touch, for thousands of people at once, and the only evidence of what it is doing is whatever it *chooses to report*.\n\n**Observability** is how well you can understand what is happening inside a system from the outside, using the data it emits. The goal is not a pile of dashboards. The goal is being able to ask a question you did not think of in advance (\"why are only travellers on the early flights seeing errors?\") and answer it from the data you already have.\n\nSystems emit three main kinds of evidence, and each is good at a different job.",
        },
        {
          kind: "explain",
          title: "One incident, three views",
          body: "The boarding-pass service has become slow for some travellers. Open each tab and look at what that signal offers, and just as important, what it cannot tell you.",
          widget: { type: "obs-signals", props: { tab: "logs" } },
        },
        {
          kind: "question",
          title: "Look at everything",
          body: "Open all three tabs: **Logs**, **Metrics** and **Traces**.",
          widget: { type: "obs-signals", props: { tab: "logs" } },
          question: { type: "widget", hint: "Open each of the three tabs once.", goal: { all: true } },
          explanation: "**Logs** record events (a story you can read), **metrics** are numbers aggregated over time (a shape you can graph), and **traces** follow one request through many services (a path you can follow). Each hides what the others show.",
        },
        {
          kind: "question",
          title: "Which signal answers it?",
          body: "\"How many travellers hit an error in the last ten minutes, and is it getting worse?\" Which signal is built for this?",
          question: {
            type: "choice",
            options: ["Metrics: a counted, aggregated number over time", "A single trace", "Reading logs by eye", "None: you cannot know this in production"],
            answer: 0,
          },
          explanation: "A metric such as a counter of failed check-ins answers \"how many, and which way is it heading\" cheaply and instantly. Logs could be searched and counted, but at far greater cost; a trace shows one request, not a total.",
        },
        {
          kind: "question",
          title: "And this one?",
          body: "\"Booking BK-4410 failed. Where, inside the system, did its three seconds go?\" Which signal answers it best?",
          question: {
            type: "choice",
            options: ["A metric of average latency", "A trace of that request, showing the time spent in each service", "The total number of bookings", "A dashboard of CPU use"],
            answer: 1,
          },
          explanation: "Only a **trace** keeps the structure of one request across services: gateway, database, seat service. Its waterfall shows the seat-service call taking nearly all of the time. An average blends that single booking into thousands of fast ones.",
        },
        {
          kind: "explain",
          title: "They work as a team",
          body: "In a real investigation the signals take turns:\n\n1. A **metric** alert says the error rate is high.\n2. A dashboard of metrics, split by route and region, narrows it to the seat-reservation step.\n3. A **trace** of one failing request shows the seat-service call timing out.\n4. That service's **logs**, found using the same request id, give the exact error message.\n\nWhat ties them together is a shared **identifier**: the request id or trace id written into every log line and attached to every span. Without it each signal is a separate island.\n\nThe signals also differ in cost. Metrics are the cheapest per unit of insight (they are pre-aggregated). Logs are the most expensive at volume. Traces are usually **sampled**: you keep a fraction of requests, often favouring slow or failed ones.",
        },
        {
          kind: "question",
          title: "The usual order",
          body: "Put a typical investigation in order.",
          question: {
            type: "order",
            items: [
              "An alert fires because the checkout error rate is above its limit",
              "A dashboard split by route shows the failures are all in seat reservation",
              "A trace of a failing request shows the seat-service call timing out",
              "That service's logs, found by request id, give the exact error",
              "After the fix, the error-rate metric returns to normal",
            ],
          },
          explanation: "You move from wide and cheap (a metric that something is wrong) to narrow and detailed (a log line about one event), and you come back to the metric to prove it worked. Starting with the most detailed signal means searching for a needle without knowing which haystack.",
        },
        {
          kind: "question",
          title: "Cut the bill",
          body: "Observability costs money, and you must reduce the bill by about 80% without losing the ability to alert on problems. What do you trim first?",
          question: {
            type: "choice",
            options: [
              "Metrics, because they are the most expensive",
              "Debug-level logs and the share of traces you keep, while keeping the metrics",
              "Everything equally",
              "The alerts",
            ],
            answer: 1,
          },
          explanation: "Metrics are small and drive your alerts, so they are the last thing to cut. Verbose logs and full-detail traces dominate cost; sampling traces and dropping routine debug lines saves most of the money while leaving the early-warning system intact.",
        },
        {
          kind: "recap",
          points: [
            "**Observability** means being able to answer new questions about a running system from the data it emits.",
            "**Logs** tell the story of individual events; **metrics** show numbers and trends cheaply; **traces** follow one request across services.",
            "A shared **request or trace id** is what lets you jump between them.",
            "Work from wide and cheap (metrics) to narrow and detailed (logs), and sample the expensive signals.",
          ],
        },
      ],
    },

    // ─────────────────────────────── 2. Structured logging ───────────────────────────────
    {
      id: "fnd-obs-2-logs",
      title: "Structured logging",
      summary: "Why log lines should be data, not prose: stable fields, levels, request ids, and what must never be logged.",
      minutes: 9,
      xp: 50,
      steps: [
        {
          kind: "explain",
          title: "A message to a stranger",
          body: "Every log line is a note to whoever reads it later, and that person is usually tired, in a hurry, and has never seen this code. They will not read your logs. They will *search* them.\n\nA **plain-text** log line is a sentence: \"checkout failed for order 5521 in eu-west, payment provider timed out\". It is lovely to read once and almost impossible to query, because every developer phrases the same event differently.\n\nTry it on a real-looking slice of a delivery app's log: 36 events over three minutes, some of them checkout failures. Search for a word and see what you find.",
          widget: { type: "obs-logs", props: { mode: "plain", lockMode: true } },
        },
        {
          kind: "question",
          title: "The undercount",
          body: "Searching the plain text for `timeout` found only some of the failed checkouts. Why?",
          question: {
            type: "choice",
            options: [
              "The search is broken",
              "The same event was written in different words (\"timed out\", \"took too long\"), and a text search only finds the wording you guessed",
              "Logs are deleted after a minute",
              "Only errors can contain the word timeout",
            ],
            answer: 1,
          },
          explanation: "Free text has no schema. Four lines describing one kind of failure used three different phrasings, and the region was in a different position each time. Anything built on guessing the wording silently misses data.",
        },
        {
          kind: "explain",
          title: "Same events, with fields",
          body: "**Structured logging** writes each event as a record of named fields, usually one JSON object per line. The words still exist (a `msg` field), but everything you might filter or count is its own field with a stable name and type.\n\nSwitch to **Structured** below and filter. Questions that were guesswork become exact.",
          widget: { type: "obs-logs", props: { mode: "structured" } },
        },
        {
          kind: "question",
          title: "Count them properly",
          body: "Switch to **Structured** mode and filter the events down to the **failed checkouts in eu-west**. Set the filters so the list shows exactly those events; the count appears above it.",
          widget: { type: "obs-logs", props: { mode: "plain" } },
          question: { type: "widget", hint: "Filter by status and region until the list shows only the matching events.", goal: { mode: "structured", shown: 4 } },
          explanation: "Level = error, route = /checkout, region = eu-west leaves **4** events, and you can trust the count because no filter depends on anybody's choice of words. (The unrelated error in us-east dropped out too.)",
        },
        {
          kind: "explain",
          title: "What a good record contains",
          body: "A good structured log line has:\n\n- A **timestamp**, in UTC and a standard format.\n- A **level**: `debug` for detail you rarely want, `info` for normal milestones, `warn` for something odd that was handled, `error` for something that failed and needs attention. Do not log expected situations (\"user typed a wrong password\") as errors, or real errors drown.\n- A short, constant **message** (\"payment timed out\") with the variable parts as **fields** (`order_id`, `provider`, `ms`), never glued into the sentence.\n- **Stable key names** used the same way everywhere: `region` is always `region`, never `reg` in one service and `datacenter` in another.\n- A **request id** (also called a correlation id) generated at the edge and passed down to every service, so that all lines for one request can be gathered with a single filter.\n\n" +
            text(`
{"ts":"2026-03-04T12:01:10Z","level":"error","msg":"payment timed out",
 "request_id":"r-1098","order_id":5521,"provider":"payfast","region":"eu-west","ms":3012}
`),
        },
        {
          kind: "question",
          title: "Which line would you want?",
          body: "Which of these is the **best log line** for a failed payment?",
          question: {
            type: "choice",
            options: [
              "`ERROR something went wrong`",
              "`Payment for order 5521 by sam@example.com with card 4111111111111111 failed!!`",
              "`{\"level\": \"error\", \"msg\": \"payment failed\", \"request_id\": \"r-1098\", \"order_id\": 5521, \"provider\": \"payfast\", \"ms\": 3012}`",
              "`payment failed (see earlier lines)`",
            ],
            answer: 2,
          },
          explanation: "It is machine-filterable, has a constant message with the details as fields, carries the request id to tie it to the rest of the request, and holds no secrets. The first says nothing, the second leaks an email address and a card number, and the last forces a reader to hunt.",
        },
        {
          kind: "explain",
          title: "What must never be logged",
          body: "Logs are copied to many systems, kept for months, and read by many people, including people who should never see a customer's data. So there is a short list of things that do **not** belong in a log line:\n\n- **Secrets**: passwords, API keys, session tokens, the `Authorization` header.\n- **Payment data**: card numbers and security codes.\n- **Personal data**: email addresses, phone numbers, home addresses, health details. Log an opaque id (`user_id: 8821`) instead and look the person up where access is controlled.\n\nThe safest design uses an **allow-list**: log only fields you have chosen, rather than dumping a whole request object and trying to scrub it afterwards. Redaction helpers are a seat belt, not an excuse.",
        },
        {
          kind: "question",
          title: "Safe to log?",
          body: "Which of these fields are **safe** to put in a log line? Pick all that apply.",
          question: {
            type: "choice",
            options: ["`order_id: 5521`", "`password: \"hunter2\"`", "`card_number: \"4111 1111 1111 1111\"`", "`user_id: 8821` (an opaque number)", "`Authorization: Bearer eyJ...`"],
            answer: [0, 3],
          },
          explanation: "Opaque identifiers let you follow a case without exposing a person. Passwords, card numbers and bearer tokens are credentials: anyone who can read the log can use them.",
        },
        {
          kind: "code",
          title: "Write the logger",
          body: "Write `make_logger(request_id, sink)`. It returns a function `log(level, message, **fields)`. Each call appends **one dictionary** to the list `sink` with the keys `level`, `message` and `request_id`, plus every extra field. Any field whose name is in `SENSITIVE` must have its value replaced by the string `\"[redacted]\"`.\n\n" +
            py(`
sink = []
log = make_logger("r-77", sink)
log("info", "order placed", order_id=5521, email="sam@example.com")
# sink[0] == {"level": "info", "message": "order placed", "request_id": "r-77",
#             "order_id": 5521, "email": "[redacted]"}
`),
          language: "python",
          starter: `SENSITIVE = {"password", "token", "card_number", "email"}

def make_logger(request_id, sink):
    def log(level, message, **fields):
        # TODO: build the entry, redact SENSITIVE fields, append it to sink
        pass
    return log
`,
          solution: `SENSITIVE = {"password", "token", "card_number", "email"}

def make_logger(request_id, sink):
    def log(level, message, **fields):
        entry = {"level": level, "message": message, "request_id": request_id}
        for key, value in fields.items():
            entry[key] = "[redacted]" if key in SENSITIVE else value
        sink.append(entry)
    return log
`,
          tests: [
            {
              id: "t1",
              description: "Writes level, message, request id and the extra fields",
              assertionCode: `_sink = []\n_log = make_logger("r-1", _sink)\n_log("info", "order placed", order_id=5521, region="eu-west")\nassert _sink == [{"level": "info", "message": "order placed", "request_id": "r-1", "order_id": 5521, "region": "eu-west"}], f"Got {_sink}"`,
            },
            {
              id: "t2",
              description: "Redacts sensitive fields but keeps the key",
              assertionCode: `_sink = []\n_log = make_logger("r-2", _sink)\n_log("warn", "login", email="sam@example.com", token="abc", user_id=7)\n_e = _sink[0]\nassert _e["email"] == "[redacted]" and _e["token"] == "[redacted]", f"Sensitive values must be redacted, got {_e}"\nassert _e["user_id"] == 7, "Non-sensitive fields stay as they are"`,
            },
            {
              id: "t3",
              description: "Appends one entry per call, in order",
              assertionCode: `_sink = []\n_log = make_logger("r-3", _sink)\n_log("info", "first")\n_log("error", "second", ms=40)\nassert [e["message"] for e in _sink] == ["first", "second"], f"Got {_sink}"`,
            },
            {
              id: "t4",
              description: "Each logger stamps its own request id",
              assertionCode: `_sink = []\n_a = make_logger("r-a", _sink)\n_b = make_logger("r-b", _sink)\n_a("info", "one")\n_b("info", "two")\nassert [e["request_id"] for e in _sink] == ["r-a", "r-b"], f"Got {_sink}"`,
            },
          ],
          hints: ["Start the entry as a dictionary with the three fixed keys, then loop over `fields.items()`.", "Inside the loop: `entry[key] = \"[redacted]\" if key in SENSITIVE else value`."],
        },
        {
          kind: "recap",
          points: [
            "Log **events as records with named fields** (one JSON object per line), not prose: free text can only be searched, not queried.",
            "Use a **constant message**, **stable key names**, sensible **levels**, and put variable details in fields.",
            "Put a **request id** on every line so one request's whole story can be collected with one filter.",
            "**Never log secrets, payment data or personal data**; prefer an allow-list of fields and opaque ids.",
          ],
        },
      ],
    },

    // ─────────────────────────────── 3. Metrics ───────────────────────────────
    {
      id: "fnd-obs-3-metrics",
      title: "Metrics: counters, gauges and histograms",
      summary: "Numbers over time: the three instruments, why a counter must be read as a rate, and the cardinality trap.",
      minutes: 8,
      xp: 45,
      steps: [
        {
          kind: "explain",
          title: "Numbers, measured again and again",
          body: "A **metric** is a named number that a service reports over and over, so you get a line over time instead of a single value. Each report carries **labels** (also called tags or dimensions) that say which slice it describes:\n\n" +
            text(`
http_requests_total{route="/checkout", status="500", region="eu-west"}  4172
`) +
            "\nA metrics system stores a **time series** for each distinct combination of name and labels, sampled every 10 or 15 seconds. Because the data is already aggregated, it costs very little to keep for months and graphs load instantly. That is why alerts are built on metrics.",
        },
        {
          kind: "explain",
          title: "Three instruments",
          body: "Almost every metric is one of three kinds:\n\n- **Counter**: a number that only goes **up** (it resets to zero when the process restarts). Orders placed, errors, bytes sent. You read it as a *rate*: how fast is it growing?\n- **Gauge**: a number that goes **up and down**, a reading of *now*. Items in a queue, memory in use, connections open, temperature.\n- **Histogram**: counts how many measurements fell into each of a set of **buckets** (under 100 ms, under 250 ms, under 500 ms...). It is how you capture the *spread* of durations or sizes, so you can later ask for percentiles.",
        },
        {
          kind: "question",
          title: "Pick the instrument",
          body: "A restaurant-ordering service wants to track (a) how many orders are waiting in the kitchen queue **right now**, (b) the **total** number of orders ever placed, and (c) how long each order takes to prepare. Which pairing is right?",
          question: {
            type: "choice",
            options: [
              "(a) counter, (b) gauge, (c) histogram",
              "(a) gauge, (b) counter, (c) histogram",
              "(a) histogram, (b) counter, (c) gauge",
              "(a) gauge, (b) histogram, (c) counter",
            ],
            answer: 1,
          },
          explanation: "A queue length rises and falls: **gauge**. A running total only increases: **counter**. A duration per order is a distribution you want percentiles of: **histogram**.",
        },
        {
          kind: "explain",
          title: "A counter is read as a rate",
          body: "The raw value of a counter is rarely interesting: \"4,210 orders since the server last started\" tells you nothing about *now*. What you graph is its **rate of change**: orders per second.\n\nThere is one wrinkle. When the process restarts, its counter starts again at zero. A careless difference between two samples then produces a huge negative number. A proper rate function notices a drop and treats it as a reset: the new value is how much it has grown since the restart.\n\nTry the three views of the same 12 samples. The server restarts halfway.",
          widget: { type: "obs-counter", props: { view: "raw" } },
        },
        {
          kind: "question",
          title: "See the real pace",
          body: "Choose the view that shows the shop's **true order rate** despite the restart.",
          widget: { type: "obs-counter", props: { view: "raw" } },
          question: { type: "widget", hint: "A rate view looks at the change per second, so a counter reset does not fool it.", goal: { view: "rate" } },
          explanation: "The reset-aware rate shows a steady three orders a second with no trace of the restart. The naive difference invents a huge negative spike (the counter \"dropped\" by 153), which would wreck any average or alert built on it.",
        },
        {
          kind: "question",
          title: "Do the arithmetic",
          body: "A counter reads **4,210** at the 100-second mark and **4,570** at the 160-second mark, with no restart in between. How many orders per second is that?",
          question: { type: "number", hint: "Rate = increase ÷ seconds between the two readings.", answer: 6, unit: "per second" },
          explanation: "(4,570 − 4,210) ÷ (160 − 100) = 360 ÷ 60 = **6 orders per second**. A rate is always a *change divided by the time it took*.",
        },
        {
          kind: "explain",
          title: "The cardinality trap",
          body: "Every distinct combination of label values becomes a separate time series that must be stored and indexed. So labels must have a **small, bounded** set of values: `route` (a few dozen), `status` (a handful), `region` (a few). Count the combinations: 30 routes x 5 statuses x 4 regions is 600 series. Fine.\n\nNow add `user_id` as a label with a million users: 600 million series, and the metrics system falls over (and your bill with it). This explosion is called **high cardinality**. The rule of thumb: put *unbounded* things (user ids, order ids, full URLs, error messages) in **logs and traces**, never in metric labels.",
        },
        {
          kind: "question",
          title: "Per customer?",
          body: "Support asks: \"how many failed payments did customer 8821 have today?\" Where should that data live?",
          question: {
            type: "choice",
            options: [
              "A metric with a `user_id` label, one series per customer",
              "In logs or traces keyed by user id; keep metric labels bounded (route, status, region)",
              "A gauge named after the user",
              "Nowhere: it can't be measured",
            ],
            answer: 1,
          },
          explanation: "Per-customer detail is high-cardinality, which is exactly what logs and traces handle well. Metrics answer the aggregate question (\"what share of payments fail?\") cheaply; the specific question is a log search.",
        },
        {
          kind: "code",
          title: "Compute a rate",
          body: "Write `rate(samples)` for a counter. `samples` is a list of `(time_in_seconds, value)` pairs in time order. Return the average increase per second from the first sample to the last, treating any **drop** in value as a **reset**: the value after the drop is the growth since the restart.\n\n" +
            py(`
rate([(0, 100), (10, 130), (20, 160)])   # 3.0
rate([(0, 100), (10, 190), (20, 40)])    # (90 + 40) / 20 = 6.5   (reset between 10s and 20s)
`),
          language: "python",
          starter: `def rate(samples):
    total_increase = 0
    for i in range(1, len(samples)):
        previous = samples[i - 1][1]
        current = samples[i][1]
        # TODO: add the growth between these two samples,
        # counting a drop (current < previous) as a reset
    seconds = samples[-1][0] - samples[0][0]
    return total_increase / seconds
`,
          solution: `def rate(samples):
    total_increase = 0
    for i in range(1, len(samples)):
        previous = samples[i - 1][1]
        current = samples[i][1]
        if current >= previous:
            total_increase += current - previous
        else:
            total_increase += current
    seconds = samples[-1][0] - samples[0][0]
    return total_increase / seconds
`,
          tests: [
            { id: "t1", description: "A steady counter", assertionCode: `_r = rate([(0, 100), (10, 130), (20, 160)])\nassert _r == 3.0, f"Expected 3.0, got {_r}"` },
            { id: "t2", description: "Handles a restart (the counter drops)", assertionCode: `_r = rate([(0, 100), (10, 190), (20, 40)])\nassert _r == 6.5, f"Expected 6.5 (90 + 40 over 20 s), got {_r}"` },
            { id: "t3", description: "A flat counter has rate zero", assertionCode: `_r = rate([(0, 5), (30, 5)])\nassert _r == 0, f"Expected 0, got {_r}"` },
            { id: "t4", description: "Several resets", assertionCode: `_r = rate([(0, 50), (10, 20), (20, 80), (30, 10)])\nassert _r == (20 + 60 + 10) / 30, f"Expected {(20 + 60 + 10) / 30}, got {_r}"` },
          ],
          hints: ["If `current >= previous` the growth is `current - previous`.", "Otherwise the counter restarted from zero, so the growth is just `current`."],
        },
        {
          kind: "recap",
          points: [
            "A **metric** is a named number sampled over time, sliced by **labels**; it is cheap, aggregated and the right basis for alerts.",
            "**Counter** (only up), **gauge** (up and down), **histogram** (a distribution in buckets).",
            "Read counters as a **rate**, with resets handled: change divided by time.",
            "Keep labels **low-cardinality**; unbounded detail like user ids belongs in logs and traces.",
          ],
        },
      ],
    },

    // ─────────────────────────────── 4. Percentiles ───────────────────────────────
    {
      id: "fnd-obs-4-percentiles",
      title: "Percentiles, not averages",
      summary: "Why the average hides the people who suffer, how p50, p95 and p99 work, and why the tail reaches almost everyone.",
      minutes: 8,
      xp: 45,
      steps: [
        {
          kind: "explain",
          title: "The politely lying average",
          body: "Ninety-nine requests take 100 ms and one takes 10 seconds. The **average** is about 199 ms: a number that describes *nobody*. Ninety-nine people had a quick page. One person stared at a spinner for ten seconds, and the average neither shows that person nor tells you they exist.\n\n**Percentiles** answer a better question: *what delay do most people stay under?*\n\n- **p50** (the median): half the requests are faster than this.\n- **p95**: 95 out of 100 are faster; the slowest 5 are slower.\n- **p99**: 99 out of 100 are faster. One in a hundred is slower.\n\nThe high percentiles are called the **tail**, and the tail is where timeouts, retries and angry users live. Below, 200 requests are drawn as a histogram on a log scale. Add very slow requests and see which numbers notice.",
          widget: { type: "obs-percentiles", props: { slow: 0 } },
        },
        {
          kind: "question",
          title: "A healthy average, a sick tail",
          body: "Make the **mean under 300 ms** while the **p99 is over one second**.",
          widget: { type: "obs-percentiles", props: { slow: 0 } },
          question: { type: "widget", hint: "A few very slow requests drag p99 up while the mean barely moves.", goal: { maxMean: 300, minP99: 1000 } },
          explanation: "With just three to five slow requests out of 200 (about 2% of traffic) the mean barely climbs, because the slow ones are outnumbered. p99 jumps to several seconds. A dashboard that shows only the average would call this a healthy service.",
        },
        {
          kind: "question",
          title: "Work one out",
          body: "Ten request times, already sorted, in milliseconds: **12, 15, 15, 18, 20, 22, 25, 31, 48, 950**. Using the *nearest-rank* method (the p-th percentile is the value at position ⌈p% × count⌉), what is **p90**?",
          question: { type: "number", hint: "Nearest rank: the p90 of 10 values sits at position ⌈0.9 × 10⌉.", answer: 48, unit: "ms" },
          explanation: "90% of 10 is 9, so p90 is the **9th** value: 48 ms. The single 950 ms outlier is the 10th value and only appears at p100 (the maximum). That is exactly how a percentile ignores one freak but still sees a *pattern* of slow requests.",
        },
        {
          kind: "explain",
          title: "Why p99 touches almost everyone",
          body: "\"Only 1% of requests are that slow\" sounds negligible. But a single page view rarely makes one request. It often makes **twenty or fifty** calls to different backends, and the page is only as fast as its slowest call.\n\nIf each call independently has a 1% chance of landing in the slow tail, a page that makes *n* calls has a `1 - 0.99^n` chance of hitting at least one slow call. Drag the slider to see how a rare event turns common.",
          widget: { type: "obs-percentiles", props: { slow: 4, fanout: true, calls: 20 } },
        },
        {
          kind: "question",
          title: "Fifty calls",
          body: "A page makes **50** backend calls. Each has an independent 1% chance of being slower than the p99. About what percentage of page views meet at least one such slow call?",
          question: { type: "number", hint: "The chance that none are slow is 0.99 multiplied by itself 50 times.", answer: 40, tolerance: 3, unit: "%" },
          explanation: "The chance *all 50* are fast is 0.99^50, about 0.605, so at least one is slow about **40%** of the time. This is why teams chase p99 and p99.9 of backend calls: at scale the tail is the typical experience.",
        },
        {
          kind: "question",
          title: "Combining servers",
          body: "Server A reports a p95 of 200 ms and server B reports a p95 of 400 ms. A teammate says \"the fleet's p95 is 300 ms: the average of the two\". Is that right?",
          question: {
            type: "choice",
            options: [
              "Yes: averaging is the standard way to combine percentiles",
              "No: you cannot get a fleet percentile from per-server percentiles; you have to merge the underlying data (for example the histogram buckets) and calculate again",
              "It is always the larger one, 400 ms",
              "It is always the smaller one, 200 ms",
            ],
            answer: 1,
          },
          explanation: "A percentile describes the shape of one set of data, and the shape of the combined set depends on how many requests each server handled and how its slow ones are distributed. Averaging percentiles gives a number that matches nothing. This is a main reason metrics systems store **histograms**: buckets can be added together across machines.",
        },
        {
          kind: "code",
          title: "Write percentile()",
          body: "Write `percentile(values, p)` using the **nearest-rank** method: sort the values, then return the value at 1-based position `ceil(p / 100 * n)`. (Python's `math.ceil` rounds up.) For an empty list return `0`.\n\n" +
            py(`
percentile([12, 15, 15, 18, 20, 22, 25, 31, 48, 950], 90)   # 48
percentile([4, 8, 1], 50)                                    # 4
`),
          language: "python",
          starter: `import math

def percentile(values, p):
    if not values:
        return 0
    ordered = sorted(values)
    # TODO: find the 1-based rank = ceil(p / 100 * len(ordered))
    # and return the value at that rank
    return ordered[0]
`,
          solution: `import math

def percentile(values, p):
    if not values:
        return 0
    ordered = sorted(values)
    rank = math.ceil(p / 100 * len(ordered))
    return ordered[max(rank, 1) - 1]
`,
          tests: [
            { id: "t1", description: "p90 of ten values", assertionCode: `_r = percentile([12, 15, 15, 18, 20, 22, 25, 31, 48, 950], 90)\nassert _r == 48, f"Expected 48, got {_r}"` },
            { id: "t2", description: "Sorts the values first", assertionCode: `_r = percentile([4, 8, 1], 50)\nassert _r == 4, f"The median of [1, 4, 8] is 4, got {_r}"` },
            { id: "t3", description: "p100 is the maximum, p1 of a short list is the minimum", assertionCode: `assert percentile([5, 1, 9, 3], 100) == 9, "p100 should be the largest value"\nassert percentile([5, 1, 9, 3], 1) == 1, "p1 of four values should still be the smallest"` },
            { id: "t4", description: "p99 of 100 values catches the second-largest", assertionCode: `_vals = list(range(1, 101))\nassert percentile(_vals, 99) == 99, f"p99 of 1..100 should be 99, got {percentile(_vals, 99)}"\nassert percentile([], 95) == 0, "An empty list gives 0"` },
          ],
          hints: ["`rank = math.ceil(p / 100 * len(ordered))` is a 1-based position.", "Lists are 0-based, so index `rank - 1`; guard against a rank of 0 with `max(rank, 1)`."],
        },
        {
          kind: "recap",
          points: [
            "The **average** is dragged around by outliers and describes nobody; **percentiles** say what share of requests stay under a delay.",
            "**p50** is the typical request, **p95/p99** the tail: where timeouts, retries and complaints come from.",
            "A page that fans out to many calls meets the tail often: `1 - 0.99^n` for n calls.",
            "Never average percentiles across servers: store **histograms** and merge the buckets.",
          ],
        },
      ],
    },

    // ─────────────────────────────── 5. RED and USE ───────────────────────────────
    {
      id: "fnd-obs-5-red-use",
      title: "RED and USE",
      summary: "Two short checklists that tell you which handful of numbers to look at first: one for services, one for resources.",
      minutes: 8,
      xp: 45,
      steps: [
        {
          kind: "explain",
          title: "Which numbers first?",
          body: "A production system can emit thousands of metrics. When something is wrong, staring at all of them is hopeless. Two small checklists, one from each side of the system, tell you where to look first.\n\n**RED** describes a *service*, from the point of view of the people using it:\n\n- **R**ate: how many requests per second arrive?\n- **E**rrors: how many of them fail?\n- **D**uration: how long do they take (as percentiles)?\n\n**USE** describes each *resource* a service depends on (CPU, memory, disk, network, a connection pool, a queue):\n\n- **U**tilization: how much of its capacity is in use, on average?\n- **S**aturation: how much extra work is *waiting* because it cannot keep up?\n- **E**rrors: is it reporting faults (dropped packets, failed reads, timeouts)?\n\nRED tells you *whether users are hurting*. USE tells you *which resource is the reason*.",
        },
        {
          kind: "explain",
          title: "Find the limit",
          body: "A web service runs on four resources. Raise the load until the top panel (RED) turns red, then read the table (USE) to see what is actually running out. Tap **This is the limit** on the resource you think it is.",
          widget: { type: "obs-bottleneck", props: { load: 80 } },
        },
        {
          kind: "question",
          title: "Mark the bottleneck",
          body: "Push the load past **160 requests per second**, find the resource behind the damage, and mark it.",
          widget: { type: "obs-bottleneck", props: { load: 80 } },
          question: { type: "widget", hint: "Raise the load above 160 and see which resource saturates first.", goal: { correct: true, minLoad: 160 } },
          explanation: "The **database connection pool** hit 100% first, work started queueing behind it (saturation), and requests began failing with timeouts. The CPU, disk and network all had room to spare: adding web servers would have changed nothing.",
        },
        {
          kind: "question",
          title: "The comfortable CPU",
          body: "Users report slow, failing checkouts. Every web server's CPU graph sits at 40%. What should you conclude?",
          question: {
            type: "choice",
            options: [
              "The servers are fine, so the problem must be the users' internet",
              "CPU is not the limit; check the saturation of the other resources (connections, queues, disk, network)",
              "Add more CPU anyway",
              "Restart everything",
            ],
            answer: 1,
          },
          explanation: "A low reading on one resource only rules out that resource. Work through the USE list for every dependency and look for the one with a queue or high utilization. A system is as fast as its tightest constraint, which is often not the CPU.",
        },
        {
          kind: "explain",
          title: "Utilization is not saturation",
          body: "These two get confused all the time:\n\n- **Utilization** is *how busy* a resource is over time: \"the disk was busy 60% of the last minute\".\n- **Saturation** is *how much work is waiting* for it: \"31 disk operations are queued\".\n\nA resource can be only 60% utilized **on average** and still be saturated in bursts: ten seconds at 100% with a queue, fifty seconds idle. And a resource at 100% utilization with nothing waiting is merely well used. Saturation, the queue, is the earlier and more reliable warning, because waiting is exactly what the user experiences as latency.\n\nThe third letter, **errors**, covers the resource's own faults: a disk with read errors, a network card dropping packets, a process killed for using too much memory.",
        },
        {
          kind: "question",
          title: "Which is the stronger warning?",
          body: "Two database pools. Pool A is **100% busy with no queries waiting**. Pool B is **70% busy with 40 queries waiting**. Which one is more likely to be hurting users?",
          question: {
            type: "choice",
            options: [
              "Pool A: 100% is always worse than 70%",
              "Pool B: work is waiting, and waiting is delay the users feel",
              "Neither: only error counts matter",
              "They are identical",
            ],
            answer: 1,
          },
          explanation: "Pool A is fully used but keeping up. Pool B has bursts that exceed capacity, so requests pile up and wait. Watch the queue, not just the utilization percentage.",
        },
        {
          kind: "code",
          title: "Summarise with RED",
          body: "Write `red(requests, window_s)`. `requests` is a list of dictionaries with `\"status\"` (an HTTP status code) and `\"ms\"` (duration) for everything served in a window of `window_s` seconds. Return a dictionary with:\n\n- `rate`: requests per second (`len(requests) / window_s`)\n- `error_ratio`: the fraction with a status of **500 or above** (client errors like 404 are not the service's fault); `0` if there are no requests\n- `p95`: the nearest-rank 95th percentile of `ms` (`0` if there are no requests)\n\nA `percentile` helper is provided.",
          language: "python",
          starter: `import math

def percentile(values, p):
    ordered = sorted(values)
    rank = math.ceil(p / 100 * len(ordered))
    return ordered[max(rank, 1) - 1]

def red(requests, window_s):
    # TODO: rate, error_ratio (status >= 500), p95 of "ms"
    return {"rate": 0, "error_ratio": 0, "p95": 0}
`,
          solution: `import math

def percentile(values, p):
    ordered = sorted(values)
    rank = math.ceil(p / 100 * len(ordered))
    return ordered[max(rank, 1) - 1]

def red(requests, window_s):
    if not requests:
        return {"rate": 0, "error_ratio": 0, "p95": 0}
    errors = sum(1 for r in requests if r["status"] >= 500)
    return {
        "rate": len(requests) / window_s,
        "error_ratio": errors / len(requests),
        "p95": percentile([r["ms"] for r in requests], 95),
    }
`,
          tests: [
            {
              id: "t1",
              description: "Rate is requests per second",
              assertionCode: `_reqs = [{"status": 200, "ms": 10}] * 10\n_r = red(_reqs, 5)\nassert _r["rate"] == 2.0, f"10 requests in 5 s is 2.0 per second, got {_r['rate']}"`,
            },
            {
              id: "t2",
              description: "Only 5xx counts as an error",
              assertionCode: `_reqs = [{"status": 200, "ms": 5}] * 6 + [{"status": 404, "ms": 5}] * 2 + [{"status": 500, "ms": 5}, {"status": 503, "ms": 5}]\n_r = red(_reqs, 10)\nassert _r["error_ratio"] == 0.2, f"2 of 10 are 5xx, expected 0.2, got {_r['error_ratio']}"`,
            },
            {
              id: "t3",
              description: "p95 comes from the durations",
              assertionCode: `_reqs = [{"status": 200, "ms": ms} for ms in list(range(10, 210, 10))]\n_r = red(_reqs, 20)\nassert _r["p95"] == 190, f"p95 of 10..200 (20 values) is the 19th value, 190; got {_r['p95']}"`,
            },
            { id: "t4", description: "No requests gives zeros", assertionCode: `assert red([], 60) == {"rate": 0, "error_ratio": 0, "p95": 0}, "An empty window should give all zeros"` },
          ],
          hints: ["Count errors with `sum(1 for r in requests if r[\"status\"] >= 500)`.", "Build the list of durations with a comprehension and hand it to `percentile(..., 95)`."],
        },
        {
          kind: "recap",
          points: [
            "**RED** (Rate, Errors, Duration) describes what users get from a **service**; start there to see whether anyone is hurting.",
            "**USE** (Utilization, Saturation, Errors) describes each **resource**; use it to find which one is the limit.",
            "**Saturation** (work waiting) warns earlier than utilization and matches what users feel as delay.",
            "A system is only as fast as its tightest resource; a calm CPU says nothing about the connection pool.",
          ],
        },
      ],
    },

    // ─────────────────────────────── 6. Tracing ───────────────────────────────
    {
      id: "fnd-obs-6-tracing",
      title: "Distributed tracing",
      summary: "Following one request across services: spans, the waterfall, self time, context propagation and sampling.",
      minutes: 9,
      xp: 50,
      steps: [
        {
          kind: "explain",
          title: "One request, many machines",
          body: "Placing a food order touches a gateway, an order service, an inventory service, a pricing service and a payments service. Each keeps its own logs and its own graphs. When an order feels slow, no single service's view tells you where the time went: each one only knows about its own slice.\n\n**Distributed tracing** reconstructs the whole journey. A **trace** is the record of one request. It is made of **spans**: each span is one unit of work (a function, a database query, a call to another service) with a **name**, a **start time**, a **duration** and a **parent** span that caused it. All spans in one trace share a **trace id**. Drawn on a timeline, a trace becomes a **waterfall**.\n\nTap spans in the waterfall below to see how much time each one spent on its own work.",
          widget: { type: "obs-trace", props: { toggles: [] } },
        },
        {
          kind: "question",
          title: "Find the slow hop",
          body: "Tap the span where the request spent the **most time doing its own work**.",
          widget: { type: "obs-trace", props: { toggles: [] } },
          question: { type: "widget", hint: "Look for the span with the widest bar of its own time, not counting its children.", goal: { slowest: true } },
          explanation: "The call to the payment provider's API takes 340 ms with nothing beneath it: all of that is the provider (and the network to it). Every span above it, `charge`, `create_order`, `POST /orders`, is long only because it is *waiting* for this one.",
        },
        {
          kind: "question",
          title: "The longest bar",
          body: "The very top span, `POST /orders` in the gateway, is the longest bar in the waterfall. Is the gateway the slow part?",
          question: {
            type: "choice",
            options: [
              "Yes, the longest bar is always the culprit",
              "No: a span's duration includes everything it waited for; look at *self time*, the duration minus its children",
              "Only if it is red",
              "Yes, because it is first in the list",
            ],
            answer: 1,
          },
          explanation: "A parent span covers all of its children, so parents are naturally longest. The question that finds the problem is \"where is time spent *and not explained by a deeper span*?\" That is the span's **self time**.",
        },
        {
          kind: "explain",
          title: "Passing the baton",
          body: "How does the inventory service know its work belongs to *this* trace? The caller tells it. When one service calls another, it adds the trace id and its own current span id to the request, usually as an HTTP header such as `traceparent`:\n\n" +
            text(`
traceparent: 00-9a3c1e7d5b2f4086a1c4e3d2f7b05c68-5d1e8a4c20b7f396-01
             │  └─ trace id (32 hex)             └─ parent span id (16 hex)
             └─ version
`) +
            "\nThe receiver reads it, creates a **child span** whose parent is that span id, and passes the same trace id along to anything *it* calls. This hand-over is **context propagation**. It must happen at every hop, including calls through message queues (put the id in the message headers) and background jobs.\n\nOne service that forgets breaks the chain: everything after it starts a brand-new, disconnected trace.",
        },
        {
          kind: "question",
          title: "Break the chain",
          body: "Switch **Pass the trace id along** off and look at what happens to the services after the order service.",
          widget: { type: "obs-trace", props: { toggles: ["propagate"] } },
          question: { type: "widget", hint: "Turn off passing the trace id and see what happens downstream.", goal: { propagate: false } },
          explanation: "Without the header, inventory, pricing and payments each start their own unrelated traces. The main trace now shows `create_order` mysteriously idle for most of its life, and the real cause is sitting in three other traces nobody can connect. A partially instrumented system can be worse than none, because it misleads.",
        },
        {
          kind: "question",
          title: "Do the slow calls need to be slow?",
          body: "In the waterfall the stock check and the price quote run one after the other, though neither needs the other's result. Switch on **parallel** and get the whole request under **540 ms**.",
          widget: { type: "obs-trace", props: { toggles: ["parallel"] } },
          question: { type: "widget", hint: "Independent calls can run at the same time instead of one after another.", goal: { parallel: true, maxTotal: 540 } },
          explanation: "Making the two independent calls at the same time hides the shorter one behind the longer, saving about 90 ms. The shape of a waterfall (a staircase where there could be a block) is how you spot work that can be done in parallel.",
        },
        {
          kind: "explain",
          title: "You cannot keep them all",
          body: "A busy service handles thousands of requests a second, and each request may create dozens of spans. Storing everything would cost more than the service itself, so traces are **sampled**:\n\n- **Head sampling** decides at the very start of a request (\"keep 1%\"). It is cheap and simple, but it decides before knowing whether the request will turn out interesting, so most rare failures are thrown away.\n- **Tail sampling** buffers a trace's spans and decides after it finishes: keep everything that was slow or errored, and a small share of the ordinary ones. It costs more to run, and it keeps the traces you will actually want.",
        },
        {
          kind: "code",
          title: "Pass the header on",
          body: "Write `child_header(header, new_span_id, new_trace_id)` for a service that has just received a request.\n\nA valid header looks like `00-<trace id>-<span id>-01`: four parts joined by `-`, a version of `\"00\"`, a trace id of 32 characters and a span id of 16 characters. If `header` is valid, return a new header with the **same trace id** and `new_span_id` as the span. If it is missing (`None`) or malformed, start a new trace: use `new_trace_id`.",
          language: "python",
          starter: `def child_header(header, new_span_id, new_trace_id):
    # TODO: parse the header; if it is valid keep its trace id,
    # otherwise start a new trace with new_trace_id
    return "00-" + new_trace_id + "-" + new_span_id + "-01"
`,
          solution: `def child_header(header, new_span_id, new_trace_id):
    trace_id = new_trace_id
    if header:
        parts = header.split("-")
        if len(parts) == 4 and parts[0] == "00" and len(parts[1]) == 32 and len(parts[2]) == 16:
            trace_id = parts[1]
    return "00-" + trace_id + "-" + new_span_id + "-01"
`,
          tests: [
            {
              id: "t1",
              description: "Keeps the incoming trace id and swaps in the new span id",
              assertionCode: `_t = "9a3c1e7d5b2f4086a1c4e3d2f7b05c68"\n_h = "00-" + _t + "-5d1e8a4c20b7f396-01"\n_r = child_header(_h, "1122334455667788", "f" * 32)\nassert _r == "00-" + _t + "-1122334455667788-01", f"Got {_r}"`,
            },
            {
              id: "t2",
              description: "No header: starts a new trace",
              assertionCode: `_r = child_header(None, "1122334455667788", "a" * 32)\nassert _r == "00-" + "a" * 32 + "-1122334455667788-01", f"Got {_r}"`,
            },
            {
              id: "t3",
              description: "A malformed header is ignored, not trusted",
              assertionCode: `for _bad in ["garbage", "00-short-5d1e8a4c20b7f396-01", "01-" + "b" * 32 + "-5d1e8a4c20b7f396-01", "00-" + "b" * 32 + "-tooshort-01"]:\n    _r = child_header(_bad, "1122334455667788", "c" * 32)\n    assert _r == "00-" + "c" * 32 + "-1122334455667788-01", f"Header {_bad!r} should start a new trace, got {_r}"`,
            },
          ],
          hints: ["`header.split(\"-\")` gives the four parts; check the count, the version and the two lengths.", "Start with `trace_id = new_trace_id` and only replace it when the header passes every check."],
        },
        {
          kind: "recap",
          points: [
            "A **trace** is one request's journey; **spans** are its timed steps with parents, drawn as a **waterfall**.",
            "Find the slow hop by **self time** (duration minus children), not by the longest bar.",
            "**Context propagation** passes the trace id (`traceparent`) on every call, including queues; one missing hop breaks the trace.",
            "**Sample** traces: head sampling is cheap but blind, tail sampling keeps the slow and failed ones.",
          ],
        },
      ],
    },

    // ─────────────────────────────── 7. SLOs ───────────────────────────────
    {
      id: "fnd-obs-7-slo",
      title: "SLIs, SLOs and error budgets",
      summary: "Deciding how reliable is reliable enough, measuring it, and turning the gap into a budget a team can spend.",
      minutes: 10,
      xp: 55,
      steps: [
        {
          kind: "explain",
          title: "How good is good enough?",
          body: "Perfect reliability is impossible, and chasing it is ruinously expensive: each extra \"nine\" of availability costs many times the one before. It is also often pointless. If a person's phone connection fails more often than your API does, making the API ten times better changes nothing they notice.\n\nSo teams decide, deliberately, how reliable a service *needs* to be. Three terms make the conversation precise:\n\n- An **SLI** (service level indicator) is a *measurement* of how well the service is doing, as a ratio of good events to valid events. Example: *the share of storm alerts delivered to phones within 60 seconds*.\n- An **SLO** (service level objective) is the *target* for that SLI over a window of time. Example: *99.9% of alerts within 60 seconds, over 30 days*.\n- An **SLA** (service level agreement) is a *contract* with consequences if you miss, such as refunds. It is usually looser than the internal SLO, so you have room to fix things before you owe anyone money.",
        },
        {
          kind: "question",
          title: "Which one is the SLI?",
          body: "A weather-alert API texts people when a storm warning is issued. Which statement is an **SLI**, a measurement rather than a target or a contract?",
          question: {
            type: "choice",
            options: [
              "\"In the last hour, 99.95% of alerts reached phones within 60 seconds.\"",
              "\"We aim for 99.9% of alerts within 60 seconds each month.\"",
              "\"If fewer than 99.5% arrive in time, customers get a month's fees back.\"",
              "\"Alerts should be fast.\"",
            ],
            answer: 0,
          },
          explanation: "The first is a *measured* value. The second states a target (an SLO), the third is a contractual promise with a penalty (an SLA), and the fourth is a wish with no number.",
        },
        {
          kind: "question",
          title: "What does 99.9% mean in minutes?",
          body: "The SLO is **99.9% availability over 30 days**. If the service were completely down, how many minutes of downtime would use up the whole allowance?",
          question: { type: "number", hint: "The allowance is the remaining 0.1% of 30 days, in minutes.", answer: 43.2, tolerance: 0.5, unit: "minutes" },
          explanation: "30 days is 43,200 minutes. 0.1% of that is **43.2 minutes**. Every additional nine divides it by ten: 99.99% allows only 4.3 minutes a month, which is less than the time it takes a person to be paged and open a laptop.",
        },
        {
          kind: "explain",
          title: "The error budget",
          body: "If the SLO is 99.9%, then **0.1% of requests are allowed to fail** over the window. That allowance is the **error budget**: `budget = 1 - SLO`.\n\nThe budget changes a vague argument (\"should we launch faster, or be more careful?\") into arithmetic everyone shares:\n\n- **Budget left**: you have room. Ship that risky migration, run the experiment, move fast.\n- **Budget nearly spent**: slow down and pay attention to reliability.\n- **Budget gone**: the usual policy is to pause feature launches and spend the team's time on reliability until the window recovers.\n\nBelow, a weather-alert API sends a million alerts a day. Four incidents and a trickle of everyday errors spend the budget over 30 days. Change the SLO and switch incidents on and off.",
          widget: { type: "obs-budget", props: { slo: 99.9 } },
        },
        {
          kind: "question",
          title: "The strictest target this month meets",
          body: "With **all four incidents on**, which is the **strictest SLO** the team would still have met this month?",
          widget: { type: "obs-budget", props: { slo: 99.9 } },
          question: { type: "widget", hint: "With every incident on, check which targets still have budget left.", goal: { slo: 99.5, allIncidents: true, exhausted: false } },
          explanation: "At 99.9% the month's failures (about 35,800) overshoot the 30,000 allowed, so the budget runs out on day 25. At 99.5% the team has 150,000 to spend and still ends the month with about three quarters of it. The right SLO is the one you can reliably keep, not the most impressive number.",
        },
        {
          kind: "question",
          title: "Sixty percent left on day ten",
          body: "On day 10 of the window the team has used 40% of its error budget. A risky database migration is ready to ship. What does the budget suggest?",
          question: {
            type: "choice",
            options: [
              "Never ship it: any risk is too much",
              "There is room to take a measured risk: ship it with a canary and a rollback plan, and watch the budget",
              "Ignore the budget, it only applies at day 30",
              "Delete the SLO",
            ],
            answer: 1,
          },
          explanation: "The budget exists to be *spent* on useful things. A service with a budget that is always unspent is probably being run too cautiously. A healthy balance spends most of it on launches and small incidents, and none on avoidable big ones.",
        },
        {
          kind: "explain",
          title: "Burn rate",
          body: "Looking at the budget only at the end of the month is too late. What you want to know is how *fast* it is draining. The **burn rate** is the current error ratio divided by the budget ratio:\n\n" +
            text(`
burn rate = (current error ratio) / (1 - SLO)

SLO 99.9%  ->  budget ratio 0.001
errors at 0.1%   -> burn rate 1    (exactly on budget by day 30)
errors at 1.4%   -> burn rate 14   (the whole month's budget gone in about 2 days)
`) +
            "\nA burn rate of 1 means \"on track to spend exactly the budget by the end\". A burn rate above 1 means you will run out early. Alerts built on burn rate (the next lesson) page you when the budget is draining dangerously fast, long before it is empty.",
        },
        {
          kind: "code",
          title: "Do the budget arithmetic",
          body: "Write two functions.\n\n- `budget_report(slo, total, bad)`: `slo` is a fraction such as `0.999`, `total` the number of requests in the window and `bad` the number that failed. Return a dictionary: `allowed` (the integer number of failures allowed: `round((1 - slo) * total)`), `remaining` (`allowed - bad`, which can go negative) and `remaining_pct` (`remaining / allowed * 100` rounded to 1 decimal).\n- `burn_rate(error_ratio, slo)`: `error_ratio / (1 - slo)`, rounded to 2 decimals.",
          language: "python",
          starter: `def budget_report(slo, total, bad):
    allowed = 0   # TODO
    remaining = 0   # TODO
    remaining_pct = 0.0   # TODO
    return {"allowed": allowed, "remaining": remaining, "remaining_pct": remaining_pct}

def burn_rate(error_ratio, slo):
    return 0   # TODO
`,
          solution: `def budget_report(slo, total, bad):
    allowed = round((1 - slo) * total)
    remaining = allowed - bad
    remaining_pct = round(remaining / allowed * 100, 1)
    return {"allowed": allowed, "remaining": remaining, "remaining_pct": remaining_pct}

def burn_rate(error_ratio, slo):
    return round(error_ratio / (1 - slo), 2)
`,
          tests: [
            { id: "t1", description: "A million requests at 99.9% allows 1,000 failures", assertionCode: `_r = budget_report(0.999, 1_000_000, 400)\nassert _r == {"allowed": 1000, "remaining": 600, "remaining_pct": 60.0}, f"Got {_r}"` },
            { id: "t2", description: "An overspent budget goes negative", assertionCode: `_r = budget_report(0.99, 100_000, 1500)\nassert _r == {"allowed": 1000, "remaining": -500, "remaining_pct": -50.0}, f"Got {_r}"` },
            { id: "t3", description: "Burn rate of 1 means exactly on budget", assertionCode: `assert burn_rate(0.001, 0.999) == 1.0, f"0.1% errors against a 99.9% SLO is burn rate 1, got {burn_rate(0.001, 0.999)}"` },
            { id: "t4", description: "A fast burn", assertionCode: `assert burn_rate(0.0144, 0.999) == 14.4, f"Expected 14.4, got {burn_rate(0.0144, 0.999)}"\nassert burn_rate(0, 0.99) == 0, "No errors means no burn"` },
          ],
          hints: ["`round((1 - slo) * total)` avoids tiny floating-point leftovers like 1000.0000000000009.", "Compute `remaining_pct` from `remaining` and `allowed`, then `round(..., 1)`."],
        },
        {
          kind: "recap",
          points: [
            "An **SLI** measures good events over valid events; an **SLO** is the target for it over a window; an **SLA** is a contract with penalties, usually looser.",
            "Every extra nine divides the allowed downtime by ten: 99.9% is 43 minutes a month, 99.99% about 4.",
            "The **error budget** is `1 - SLO`: a shared, numerical answer to \"can we afford to take this risk?\".",
            "**Burn rate** shows how fast the budget is draining, and is the best basis for alerts.",
          ],
        },
      ],
    },

    // ─────────────────────────────── 8. Alerting and dashboards ───────────────────────────────
    {
      id: "fnd-obs-8-alerting",
      title: "Alerting and dashboards",
      summary: "Page on symptoms, not causes; avoid alert fatigue; build dashboards that answer questions someone will really ask.",
      minutes: 10,
      xp: 55,
      steps: [
        {
          kind: "explain",
          title: "An alert spends a human's attention",
          body: "A **page** is a request that interrupts a person, perhaps asleep, to do something *now*. That is expensive, so a page should satisfy three tests:\n\n1. **Urgent**: it cannot wait until morning.\n2. **Actionable**: there is something a human can do about it.\n3. **Real**: it reflects genuine user harm, not a number that looks scary.\n\nAnything that fails these belongs somewhere gentler: a ticket for tomorrow, a chat message, a dashboard. Teams that page on everything end up with **alert fatigue**: so many false and trivial pages that people stop trusting the pager and slow-walk the real ones.",
        },
        {
          kind: "question",
          title: "Should it page at 3 a.m.?",
          body: "Which of these deserve a page right now? Pick all that apply.",
          question: {
            type: "choice",
            options: [
              "Checkout is failing for 8% of users and the error budget is burning fast",
              "One web server's CPU has been at 95% for five minutes, and users see no change",
              "A disk is 85% full and grows about 1% a week",
              "No payment has succeeded anywhere for ten minutes",
            ],
            answer: [0, 3],
          },
          explanation: "The two pages are things users feel *now* and that need a person. A busy CPU with no user impact is a graph to look at later; a disk with months of runway is a ticket. If a condition is urgent only on paper, it should not wake anyone.",
        },
        {
          kind: "explain",
          title: "Cause or symptom?",
          body: "A **cause** alert watches an internal measurement you *guessed* might matter: CPU, memory, a queue length. A **symptom** alert watches what users actually experience: error rate, latency, \"no successful orders\".\n\nTry both on one real day. The CPU alert is tempting, but the day's one real incident was a payment provider failing, and the servers did nothing but wait, so their CPU stayed normal. Meanwhile batch jobs make CPU spike harmlessly during the day. Pick a signal, drag the threshold, and choose how long the condition must hold before it pages.",
          widget: { type: "obs-alerts", props: { signal: "cpu" } },
        },
        {
          kind: "question",
          title: "A pager you can trust",
          body: "Configure an alert that **pages for the real incident** and produces **no false alarms**, using the error rate.",
          widget: { type: "obs-alerts", props: { signal: "cpu" } },
          question: { type: "widget", hint: "Alert on the error rate with a threshold above the normal noise but below the real incident.", goal: { signal: "errors", caught: true, maxFalse: 0 } },
          explanation: "On the error rate, a threshold well above the everyday wobble, plus a requirement that it **stays** over the line for ten minutes, ignores the one-sample blips and still catches the real incident within minutes. CPU can never do both: the batch jobs reach 95%, and the real incident never touches it.",
        },
        {
          kind: "question",
          title: "Forty pages a week",
          body: "A team's on-call engineer gets about 40 pages a week, and 36 of them need no action. What is the right response?",
          question: {
            type: "choice",
            options: [
              "Ask the engineer to be more disciplined about answering every page",
              "Treat the 36 as bugs in the alerts: delete them, move them to tickets, or fix their thresholds, so every page means something",
              "Turn off paging at night",
              "Add more alerts, to be safe",
            ],
            answer: 1,
          },
          explanation: "A page that needs no action is a defect in the alert, not in the person. Every noisy alert should be retired, tuned or demoted, because the cost is paid in lost trust: the one night it matters, the page looks like all the others.",
        },
        {
          kind: "explain",
          title: "Alerting on the budget",
          body: "The best symptom alerts are built on the **error budget**. Instead of \"errors above 2%\", ask \"is the budget burning fast enough to matter?\" and use **two windows** so you are both fast and sure:\n\n- **Page** when the burn rate is high over the last *hour* **and** still high over the last *five minutes*. A big problem that is happening now.\n- **Ticket** when the burn rate is merely above 1 over a few *days*. A slow leak that will bite, but not tonight.\n\nThe long window ensures it is serious, the short one ensures it is not over already. A burn rate of 14.4 sustained for an hour spends 2% of a 30-day budget, and is a classic page threshold.",
        },
        {
          kind: "explain",
          title: "Dashboards that answer questions",
          body: "A dashboard is not a place to display everything you can measure. It is the answer sheet for questions someone will actually ask, usually in a hurry. Start with the questions, then add only the panels that answer them.\n\nGood habits: put **user-facing health** (RED, SLO status) at the top, then one panel per resource that could be the limit (USE); show **deploy and flag markers** on the time axis so \"what changed?\" is a glance; break key numbers down by the dimension you will want (route, region); keep the same time range and scale across graphs. Leave out vanity charts that make a screen feel busy and a person feel informed but answer nothing.",
        },
        {
          kind: "question",
          title: "Build the 3 a.m. dashboard",
          body: "Choose **at most six panels** that, between them, answer all five of the on-call engineer's questions.",
          widget: { type: "obs-dashboard", props: { max: 6 } },
          question: { type: "widget", hint: "One panel can answer more than one question. Choose panels that overlap.", goal: { all: true, maxPanels: 6 } },
          explanation: "You needed health (error rate or latency), traffic, change markers, a breakdown to say *where*, and one saturation panel for headroom. The forty-host CPU grid, the log-volume graph, the five-year uptime figure and the pod-memory grid are all true, all impressive, and none of them answers a question you had.",
        },
        {
          kind: "code",
          title: "Write the paging rule",
          body: "Write `should_page(slo, ratio_1h, ratio_5m, threshold=14.4)` using two windows. `ratio_1h` and `ratio_5m` are the error ratios over the last hour and the last five minutes. Compute each **burn rate** as `ratio / (1 - slo)`, rounded to 6 decimals, and return `True` only if **both** are at least `threshold`.",
          language: "python",
          starter: `def should_page(slo, ratio_1h, ratio_5m, threshold=14.4):
    # TODO: burn rate for each window; page only when both reach the threshold
    return False
`,
          solution: `def should_page(slo, ratio_1h, ratio_5m, threshold=14.4):
    budget = 1 - slo
    burn_1h = round(ratio_1h / budget, 6)
    burn_5m = round(ratio_5m / budget, 6)
    return burn_1h >= threshold and burn_5m >= threshold
`,
          tests: [
            { id: "t1", description: "Pages when both windows burn fast", assertionCode: `assert should_page(0.999, 0.02, 0.03) is True, "20x and 30x burn: page"` },
            { id: "t2", description: "Does not page if it has already recovered in the last 5 minutes", assertionCode: `assert should_page(0.999, 0.02, 0.0005) is False, "The last hour was bad but the last five minutes are fine"` },
            { id: "t3", description: "Does not page for a slow burn", assertionCode: `assert should_page(0.999, 0.005, 0.005) is False, "Burn rate 5 is a ticket, not a page"` },
            { id: "t4", description: "Exactly at the threshold pages", assertionCode: `assert should_page(0.999, 0.0144, 0.0144) is True, "A burn rate of exactly 14.4 meets the threshold"` },
          ],
          hints: ["The budget ratio is `1 - slo`; divide each error ratio by it.", "`round(x, 6)` removes floating-point noise so exactly-14.4 compares correctly."],
        },
        {
          kind: "recap",
          points: [
            "A page must be **urgent, actionable and real**; everything else is a ticket or a dashboard.",
            "Alert on **symptoms** users feel (error rate, latency, no successful orders), not on guessed **causes** like CPU.",
            "Require the condition to **hold for a while** and use **burn rate over two windows** to be fast and sure.",
            "**Alert fatigue** is a defect in the alerts. Build dashboards from the **questions** an on-call engineer will ask.",
          ],
        },
      ],
    },

    // ─────────────────────────────── 9. Incident response ───────────────────────────────
    {
      id: "fnd-obs-9-incidents",
      title: "Incident response",
      summary: "Detect, mitigate, communicate, learn: how to run an outage calmly and what a blameless review looks like.",
      minutes: 9,
      xp: 50,
      steps: [
        {
          kind: "explain",
          title: "When it breaks anyway",
          body: "However careful the team, things will break. An **incident** is an unplanned event that degrades the service enough to need a coordinated response. What separates a calm hour from a chaotic night is rarely cleverness; it is having rehearsed the same four jobs:\n\n- **Detect**: find out quickly, ideally from your own alerts and not from customers.\n- **Mitigate**: stop the harm *now*, by whatever is fastest and safest.\n- **Communicate**: keep the people affected, and the rest of the company, informed.\n- **Learn**: afterwards, understand why it happened and change the system so it is less likely or less costly next time.\n\nEven a small team should name one person who is **in charge** of the incident (the incident commander). Their job is to coordinate, decide and keep the thread, *not* to debug; it is hard to do both.",
        },
        {
          kind: "explain",
          title: "Sort the actions",
          body: "Here are eight things that happen during one incident. Tap an action, then tap the phase it belongs to.",
          widget: { type: "obs-incident", props: {} },
        },
        {
          kind: "question",
          title: "Put each in its phase",
          body: "Sort all eight actions into **Detect**, **Mitigate**, **Communicate** and **Learn**.",
          widget: { type: "obs-incident", props: {} },
          question: { type: "widget", hint: "Detect finds the problem, mitigate stops the pain, communicate informs people, learn is the review afterwards.", goal: { all: true } },
          explanation: "Notice that *mitigate* has nothing to do with finding the cause: rolling back and failing over are about stopping harm. *Learn* happens after the fire is out, which is when there is time to think and no adrenaline to distort it.",
        },
        {
          kind: "question",
          title: "Fix it or stop it?",
          body: "The error rate has been 15% since the 14:00 deploy. You suspect a memory leak in the new code but are not sure. What do you do first?",
          question: {
            type: "choice",
            options: [
              "Keep reading code until you find the leak, then ship a fix",
              "Roll back the release (or turn off its feature flag) now, and investigate once users are safe",
              "Wait ten more minutes to see if it improves",
              "Restart every server",
            ],
            answer: 1,
          },
          explanation: "Mitigation does not need a diagnosis. If a recent change is the likely trigger and reverting is safe, revert first: harm stops in minutes, and you can study the bad version at leisure in a quiet environment.",
        },
        {
          kind: "explain",
          title: "Saying it out loud",
          body: "Silence is what turns an incident into a crisis. People who cannot tell whether anyone is working on it will start guessing, escalating, or working on it themselves. Good communication is simple and regular:\n\n- Post updates on a **fixed cadence** (say every 30 minutes), **even when the news is \"no change\"**.\n- Say **what users are experiencing**, **what you are doing**, and **when the next update is**.\n- Keep to facts. Do not guess a cause in public, and do not promise a fix time you cannot control.\n- Use one place for the incident's discussion, separate from general chatter, so latecomers can catch up.",
        },
        {
          kind: "question",
          title: "The best status update",
          body: "Which is the best message to post on the status page?",
          question: {
            type: "choice",
            options: [
              "\"We are aware of some issues.\"",
              "\"A developer's bad deploy broke checkout. It should be fixed very soon.\"",
              "\"Since 14:02 about one in seven checkouts is failing. We have rolled back the 14:00 release and are watching the error rate. Next update at 14:45.\"",
              "\"All systems operational.\" (posted while checkouts are failing)",
            ],
            answer: 2,
          },
          explanation: "It states the impact in plain terms, what has been done, and when to expect more, without blaming anyone or guessing. The first says nothing, the second blames and promises, and the last is simply untrue.",
        },
        {
          kind: "explain",
          title: "The blameless review",
          body: "A few days later the team meets to understand the incident. The aim is to learn how the *system* allowed it, not to find someone to punish, because people who fear blame hide information, and hidden information is the raw material of the next outage.\n\nA good review writes a **timeline** (what happened, when, and what people knew at the time), identifies **contributing factors** (several, almost never just one), and ends with **action items that have an owner and a date**. \"The engineer made a mistake\" is where the investigation *starts*. The useful questions come next: why was it easy to make that mistake? Why was nothing there to catch it?",
        },
        {
          kind: "question",
          title: "Which sentence is blameless?",
          body: "Two draft sentences from a review. Which one is the blameless, useful kind?",
          question: {
            type: "choice",
            options: [
              "\"Sam pushed a bad config and took the site down.\"",
              "\"The config tool accepted a value outside the valid range with no review or staged rollout, so one typo reached every region at once.\"",
              "\"Everyone should be more careful with config changes.\"",
              "\"This was just bad luck.\"",
            ],
            answer: 1,
          },
          explanation: "It names the *conditions* that let a typo become an outage, each of which can be fixed (validation, review, staged rollout). Blaming a person fixes nothing, asking for more carefulness is not a mechanism, and calling it luck guarantees a repeat.",
        },
        {
          kind: "code",
          title: "Measure the response",
          body: "Times below are minutes since midnight. Write two functions.\n\n- `incident_times(e)`: `e` has `started`, `detected`, `mitigated` and `resolved`. Return `{\"time_to_detect\": detected - started, \"time_to_mitigate\": mitigated - started, \"total\": resolved - started}`.\n- `mttr(incidents)`: the **mean time to resolve**: the average of `resolved - started` over a list of such dictionaries, rounded to 1 decimal. Return `0` for an empty list.",
          language: "python",
          starter: `def incident_times(e):
    return {"time_to_detect": 0, "time_to_mitigate": 0, "total": 0}   # TODO

def mttr(incidents):
    return 0   # TODO
`,
          solution: `def incident_times(e):
    return {
        "time_to_detect": e["detected"] - e["started"],
        "time_to_mitigate": e["mitigated"] - e["started"],
        "total": e["resolved"] - e["started"],
    }

def mttr(incidents):
    if not incidents:
        return 0
    return round(sum(i["resolved"] - i["started"] for i in incidents) / len(incidents), 1)
`,
          tests: [
            { id: "t1", description: "Time to detect, mitigate and resolve", assertionCode: `_r = incident_times({"started": 840, "detected": 847, "mitigated": 862, "resolved": 905})\nassert _r == {"time_to_detect": 7, "time_to_mitigate": 22, "total": 65}, f"Got {_r}"` },
            { id: "t2", description: "MTTR is the mean of the totals", assertionCode: `_r = mttr([{"started": 0, "resolved": 30}, {"started": 100, "resolved": 145}, {"started": 200, "resolved": 220}])\nassert _r == 31.7, f"(30 + 45 + 20) / 3 is 31.7, got {_r}"` },
            { id: "t3", description: "No incidents, no MTTR", assertionCode: `assert mttr([]) == 0, "An empty list should give 0"` },
          ],
          hints: ["Each value is just a subtraction from `e[\"started\"]`.", "`sum(...) / len(incidents)` then `round(..., 1)`."],
        },
        {
          kind: "recap",
          points: [
            "Incident response is four jobs: **detect, mitigate, communicate, learn**; one person coordinates.",
            "**Mitigate before you diagnose**: rollback, flag off or failover stops harm without needing a root cause.",
            "Update on a **regular cadence** with impact, action and next-update time; do not speculate or blame.",
            "A **blameless review** asks why the system made the mistake easy, and ends in owned, dated action items.",
          ],
        },
      ],
    },

    // ─────────────────────────────── 10. Capacity and load testing ───────────────────────────────
    {
      id: "fnd-obs-10-capacity",
      title: "Capacity and performance testing",
      summary: "Load, stress, soak and spike tests; the hockey-stick latency curve; Little's law; and how many servers you really need.",
      minutes: 9,
      xp: 50,
      steps: [
        {
          kind: "explain",
          title: "Will it hold on the big day?",
          body: "You will not find out how a service behaves under pressure by reading its code. You find out by putting it under pressure on purpose, somewhere it is safe to fail. The kinds of **performance test** answer different questions:\n\n- **Load test**: run the traffic you *expect* at peak. Does it meet its targets?\n- **Stress test**: keep raising load *past* the expected peak until it breaks. Where is the limit, and *how* does it fail (gracefully, or in a heap)?\n- **Soak test**: run at a moderate, steady load for many hours. Does anything leak or degrade over time (memory, connections, disk)?\n- **Spike test**: jump suddenly from low to high. Do autoscaling, queues and caches cope with a sudden crowd?",
        },
        {
          kind: "question",
          title: "Which test?",
          body: "You suspect a slow memory leak: the service seems healthy for a few hours and then falls over. Which test is designed to expose it?",
          question: {
            type: "choice",
            options: ["Load test with a short burst", "Soak test: moderate load for many hours", "Spike test", "Stress test that ends after two minutes"],
            answer: 1,
          },
          explanation: "A leak needs *time* to accumulate, so only a long run reveals it. Short tests, however heavy, finish before the memory graph has a chance to climb.",
        },
        {
          kind: "explain",
          title: "The hockey stick",
          body: "Every load test of a normal system draws the same shape. At low load, latency is flat: requests are served as they arrive. As the servers get busier, requests increasingly arrive while others are being handled, and start to **queue**. Latency bends upward, slowly at first and then violently: the **knee** of the curve. Past 100% utilization, work arrives faster than it can be done, the queue grows without end, and requests fail.\n\nDrag the load and change the number of instances. Keep the dot inside the green zone.",
          widget: { type: "obs-loadtest", props: { load: 60, instances: 1 } },
        },
        {
          kind: "question",
          title: "Survive 200 requests a second",
          body: "Offer **at least 200 requests per second** and keep **p95 under 500 ms with no failures**. How many instances do you need?",
          widget: { type: "obs-loadtest", props: { load: 60, instances: 1 } },
          question: { type: "widget", hint: "Add instances until p95 stays under 500 ms with no failures at 200 requests a second.", goal: { withinSlo: true, minLoad: 200 } },
          explanation: "Four instances (280 requests/s of capacity) keep 200/s at about 71% busy and p95 near 420 ms. Three instances could technically serve 200/s (210 capacity) but would be 95% busy, deep in the steep part of the curve, with no room for a spike or a failed instance.",
        },
        {
          kind: "question",
          title: "Why does it slow down before it is full?",
          body: "At 70% utilization the servers are not even close to maxed out, yet latency has already doubled. Why?",
          question: {
            type: "choice",
            options: [
              "The network is failing",
              "Requests arrive at random, so sometimes several land together and wait behind each other; the busier the system, the more likely and the longer the queues",
              "Servers get slower the longer they run",
              "The load testing tool is lying",
            ],
            answer: 1,
          },
          explanation: "Arrivals are bursty, not evenly spaced. When a server is mostly idle a burst is absorbed in a moment; when it is mostly busy there is little slack to catch up, so waiting piles up. That is why capacity planning aims for roughly 50 to 70% utilization at peak, not 95%.",
        },
        {
          kind: "explain",
          title: "Little's law",
          body: "There is a beautiful bit of arithmetic that holds for any stable queue:\n\n" +
            text(`
requests in the system = arrival rate x average time in the system

200 requests/s x 0.25 s  =  50 requests in flight at any moment
`) +
            "\nIt is called **Little's law**, and it is how you size things that hold a request while it works: how many worker threads, database connections or open sockets you need. If the average time per request doubles, so does the number you hold, even though traffic did not change: this is why a slow dependency exhausts a connection pool.",
        },
        {
          kind: "question",
          title: "How many at once?",
          body: "A service handles **300 requests per second**, and each takes **120 ms** on average from arrival to reply. How many requests are in flight at once, on average?",
          question: { type: "number", hint: "Requests in flight = requests per second × seconds each one takes.", answer: 36 },
          explanation: "300 x 0.120 = **36**. A pool of 20 database connections would be hopelessly small here, even though each query is quick.",
        },
        {
          kind: "explain",
          title: "Tests that tell the truth",
          body: "A load test only helps if it resembles reality:\n\n- Use a realistic **mix** of requests and realistic data (a test that hammers one cached page proves nothing).\n- Measure **percentiles**, not averages, and measure *what a user would see*.\n- Include the **dependencies**: a service that is fast with a fake database may crawl with the real one.\n- Use an **open-loop** generator that sends requests on a schedule whether or not earlier ones finished. A tool that waits for each reply before sending the next quietly slows itself down exactly when the system struggles, and *hides* the slow period.\n- Test somewhere production-like, never casually on production itself.",
        },
        {
          kind: "code",
          title: "Size the fleet",
          body: "Write `capacity_needed(peak_rps, per_instance_rps, target_util=0.6, spare=1)`. Each instance can serve `per_instance_rps` at full tilt, but you only want to run it at `target_util` (a fraction) at peak. Return the number of instances needed to carry `peak_rps` at that utilization, rounded **up**, plus `spare` extra instances so a failure does not push the rest into the knee.\n\n(Hint: round the division to 6 decimals before `math.ceil`, so floating-point noise cannot add a phantom instance.)",
          language: "python",
          starter: `import math

def capacity_needed(peak_rps, per_instance_rps, target_util=0.6, spare=1):
    # TODO: ceil(peak / (per_instance * target_util)), then add the spares
    return 0
`,
          solution: `import math

def capacity_needed(peak_rps, per_instance_rps, target_util=0.6, spare=1):
    needed = math.ceil(round(peak_rps / (per_instance_rps * target_util), 6))
    return needed + spare
`,
          tests: [
            { id: "t1", description: "420 requests/s at 60% of 70 each", assertionCode: `_r = capacity_needed(420, 70)\nassert _r == 11, f"420 / 42 = 10, plus 1 spare = 11, got {_r}"` },
            { id: "t2", description: "Rounds up, not down", assertionCode: `_r = capacity_needed(100, 70, 0.7)\nassert _r == 4, f"100 / 49 is 2.04, so 3 instances, plus 1 spare = 4, got {_r}"` },
            { id: "t3", description: "Spares can be zero", assertionCode: `_r = capacity_needed(100, 70, 0.7, spare=0)\nassert _r == 3, f"Expected 3, got {_r}"` },
          ],
          hints: ["One instance carries `per_instance_rps * target_util` comfortably.", "`math.ceil` rounds up; add `spare` afterwards."],
        },
        {
          kind: "recap",
          points: [
            "**Load**, **stress**, **soak** and **spike** tests answer different questions: expected peak, where and how it breaks, slow leaks, sudden crowds.",
            "Latency follows a **hockey stick**: flat, then a knee, then failure past 100%. Plan for roughly 50 to 70% busy at peak, with headroom for a failure.",
            "**Little's law**: in flight = rate x time. It sizes pools and worker counts, and explains why a slow dependency exhausts them.",
            "Test with realistic traffic, real dependencies, percentiles and an open-loop generator.",
          ],
        },
      ],
    },
  ],
};
