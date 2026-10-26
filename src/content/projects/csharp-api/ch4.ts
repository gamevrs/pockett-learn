import type { Chapter } from "@/engine/types";
import { TYPES_DIVIDER } from "../../../engine/compose.ts";
import { cs, js, md } from "./util.ts";

/**
 * Chapter 4: Operating the platform. See what the API is doing, report its health, survive a flaky upstream and deliver side effects reliably.
 */

export const chapter4: Chapter = {
  id: "operating-the-platform",
  title: "Operating the platform",
  blurb: "See what the API is doing, report its health, survive a flaky upstream and deliver side effects reliably.",
  lessons: [
    // ───────────────────────── 12 ─────────────────────────
    {
      id: "csharp-api-12-observability",
      title: "Structured logs, correlation ids and metrics",
      minutes: 55,
      xp: 280,
      concepts: ["structured logging", "log scopes", "AsyncLocal", "correlation ids", "counters", "latency histograms", "percentiles"],
      learn: md`### Three questions about a running system

When something is wrong at 2 a.m., you ask three things: *what happened to this request?* (logs), *how is the system doing overall?* (metrics), and *where did the time go?* (traces). This lesson builds the first two, and the habit that ties everything together: the **correlation id**.

### Structured logs

A log line like \`"User 3 booked slot 12 in 18ms"\` can only be searched with text matching. A **structured** event keeps the facts as fields:

~~~json
{ "at": 100218, "level": "Info", "message": "request finished",
  "props": { "correlationId": "web-4411", "status": 200, "ms": 18 } }
~~~

Now "show me every request slower than 400 ms that ended in an error" is a query, not a regex. The message is a stable template (\`request finished\`), the variable parts are properties, and a log platform can group by message and filter by property.

Choose levels honestly: **Information** for normal flow, **Warning** for something wrong that the system handled (a 4xx caused by the caller), **Error** for something wrong that the system could not handle (an exception, a 5xx). If everything is an error, nothing is.

### Correlation ids and scopes

A single booking touches the pipeline, a controller, the unit of work and (later) an outbound call. To read the story you must be able to find *all* the events belonging to one request. A **correlation id** is a label attached to every event of a request. Passing it through every method signature is hopeless, so frameworks use a **log scope**: a property bag that applies to everything logged until the scope ends.

~~~csharp
using var scope = log.BeginScope("correlationId", id);
log.Log(LogLevel.Info, "request started");        // carries correlationId automatically
~~~

To make a scope follow code across \`await\`, store it in an \`AsyncLocal<T>\`. A plain \`[ThreadStatic]\` field or a \`ThreadLocal\` would be lost the moment an \`await\` resumes on a different thread, silently dropping the id from your logs exactly when the interesting asynchronous work happens. \`AsyncLocal\` flows down the async call chain, and assignments made inside a callee do not leak back up to its caller, which is what makes nested scopes behave: a child scope copies its parent's properties, adds its own, and on disposal restores the parent.

Honour a correlation id sent by the caller (\`X-Request-Id\`) so a trace can span services; otherwise generate one. In production validate an inbound id (length, characters) before logging it, or it becomes a **log injection** vector. Return the id in the response header so a user reporting a problem can quote it.

### Never log

Tokens, passwords, full request bodies, and personal data. Logs are copied to many places with weaker access control than your database. Log identifiers (member id), not secrets.

### Metrics: counters and histograms

Metrics are numbers aggregated over time; they are cheap, so you can record every request. Two kinds cover most needs:

- A **counter** only goes up: \`requests_2xx\`, \`requests_4xx\`, \`requests_5xx\`. A dashboard turns the counter into a rate and an alert watches the error share.
- A **histogram** records how a value (here, latency) is *distributed*. We use fixed bucket bounds (5, 10, 25, 50, 100, 250, 500, 1000 ms, plus one for "more"); each observation increments the first bucket whose bound is at least the value.

Why not just average latency? Because an average hides the experience of the unlucky. Ten requests at 10 ms and one at 5 seconds average 464 ms, which describes nobody. **Percentiles** answer "how slow is slow for the worst few percent": p95 is the latency that 95 % of requests beat. From a histogram you can only estimate a percentile (the upper bound of the bucket where the cumulative count crosses the target), but that is enough to alert on. Keep metric **labels low-cardinality**: a counter per status class is fine, a counter per member id is a memory leak.

### Where this middleware lives

Observability goes **outermost**. It must see requests that are rejected by authentication, throttled by the rate limiter, or turned into problem documents, and it must read the *final* status after the problems middleware has rendered it. That is why its phase is \`Phase.Observe\`, before everything else. It also reads the exception that the problems middleware stashed in \`ctx.Items["exception"]\` (lesson 6) and logs it at Error level under the same correlation id: the generic 500 the client saw and the detailed event the operator reads are connected by that id.

### Common mistakes

- Logging a formatted string instead of a message template plus properties.
- Losing the id across \`await\` by using thread-static state.
- Averages instead of percentiles.
- A label with unbounded values (user ids, full URLs with ids) on a metric.
- Putting observability inside the error handler, so failures are logged with the wrong status or not at all.`,
      mission: md`Last Saturday the booking page slowed to a crawl for ten minutes and nobody could say why. The logs were free text, the only metric was "server is up", and the one stack trace anyone found could not be tied to a customer's complaint.

You will give the platform a voice: structured events with a correlation id on every line, counters per status class and a latency histogram with p50 and p95. The recording replays eleven requests, with simulated work times from 3 ms to 480 ms, one honouring a caller's own request id, and one that crashes. When this lesson passes, the **Log stream** and the **Latency histogram** panels light up.`,
      tasks: [
        "Write Logger: Events, BeginScope(key, value) (an AsyncLocal property bag; a child copies its parent and disposal restores the parent) and Log(level, message, params props) which merges the current scope with the given properties and records a LogEvent stamped with clock.Now",
        "Write Metrics: Count(name), Observe(ms) (increment the first bucket whose bound is >= ms, or the last bucket) and Percentile(p) (the upper bound of the bucket where the cumulative count first reaches ceil(total * p))",
        "Write UseObservability: id = the caller's X-Request-Id or \"req-0001\", \"req-0002\"... (a counter that only moves for generated ids), echo it in the X-Request-Id response header, open a correlationId scope, log \"request started\" (method, path), await next, log \"unhandled exception\" (type, error) when ctx.Items[\"exception\"] is set, log \"request finished\" (status, ms) at Info / Warning (4xx) / Error (5xx), count requests_<n>xx and observe the elapsed milliseconds",
        "Register the \"observability\" module at Phase.Observe and run the harness",
      ],
      starterAdd: cs`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 12. See what the platform is doing. Register the module, then the harness replays "ops" and sends the telemetry.
//  Platform.Add("observability", Phase.Observe, api => { var (logger, metrics) = (new Logger(api.Clock), new Metrics());
//      (api.Parts["logger"], api.Parts["metrics"]) = (logger, metrics);  api.App.UseObservability(logger, metrics, api.Clock); });
Platform.Add("simulated-work", Phase.Cache + 1, api => api.App.Use("work", async (ctx, next) => { api.Clock.Advance(int.Parse(ctx.Request.Header("X-Sim-Ms") ?? "5")); await next(ctx); }));
var observed = Platform.Build();
await observed.Replay("ops");
var (log, metric) = (observed.Part<Logger>("logger"), observed.Part<Metrics>("metrics"));
Board.Show("telemetry", new { logs = log.Events, counters = metric.Counters, bounds = Metrics.Bounds, counts = metric.Buckets, p50 = metric.Percentile(0.5), p95 = metric.Percentile(0.95) });

${TYPES_DIVIDER}

// ─── ✏️ YOUR TURN ─── Logger (BeginScope keeps properties in an AsyncLocal, Log merges them), Metrics (Count, Observe, Percentile)
// and UseObservability: X-Request-Id (reuse the caller's, else "req-0001", "req-0002"...), a scope with correlationId, started/finished events, counters, histogram.
enum LogLevel { Info, Warning, Error }
record LogEvent(long At, LogLevel Level, string Message, Dictionary<string, object> Props);

class Logger(Clock clock)
{
    public List<LogEvent> Events { get; } = new();
    public IDisposable BeginScope(string key, object value) => throw new NotImplementedException();
    public void Log(LogLevel level, string message, params (string Key, object Value)[] props) => throw new NotImplementedException();
}

class Metrics
{
    public static readonly int[] Bounds = { 5, 10, 25, 50, 100, 250, 500, 1000 };
    public Dictionary<string, long> Counters { get; } = new();
    public long[] Buckets { get; } = new long[Bounds.Length + 1];
    public void Count(string name) => throw new NotImplementedException();
    public void Observe(long ms) => throw new NotImplementedException();
    public int Percentile(double p) => throw new NotImplementedException();
}

static class ObservabilityExtensions
{
    public static App UseObservability(this App app, Logger log, Metrics metrics, Clock clock) => throw new NotImplementedException();
}`,
      solutionAdd: cs`// 12. logs and metrics
Platform.Add("observability", Phase.Observe, api =>
{
    var (logger, metrics) = (new Logger(api.Clock), new Metrics());
    (api.Parts["logger"], api.Parts["metrics"]) = (logger, metrics);
    api.App.UseObservability(logger, metrics, api.Clock);
});
Platform.Add("simulated-work", Phase.Cache + 1, api => api.App.Use("work", async (ctx, next) => { api.Clock.Advance(int.Parse(ctx.Request.Header("X-Sim-Ms") ?? "5")); await next(ctx); }));
var observed = Platform.Build();
await observed.Replay("ops");
var (log, metric) = (observed.Part<Logger>("logger"), observed.Part<Metrics>("metrics"));
Board.Show("telemetry", new { logs = log.Events, counters = metric.Counters, bounds = Metrics.Bounds, counts = metric.Buckets, p50 = metric.Percentile(0.5), p95 = metric.Percentile(0.95) });

${TYPES_DIVIDER}
enum LogLevel { Info, Warning, Error }
record LogEvent(long At, LogLevel Level, string Message, Dictionary<string, object> Props);

class Logger(Clock clock)
{
    static readonly AsyncLocal<Dictionary<string, object>> Scope = new();
    sealed class Restore(Action undo) : IDisposable { public void Dispose() => undo(); }
    public List<LogEvent> Events { get; } = new();

    public IDisposable BeginScope(string key, object value)
    {
        var parent = Scope.Value;
        Scope.Value = new Dictionary<string, object>(parent ?? new()) { [key] = value };
        return new Restore(() => Scope.Value = parent);
    }

    public void Log(LogLevel level, string message, params (string Key, object Value)[] props)
    {
        var all = new Dictionary<string, object>(Scope.Value ?? new());
        foreach (var (key, value) in props) all[key] = value;
        Events.Add(new LogEvent(clock.Now, level, message, all));
    }
}

class Metrics
{
    public static readonly int[] Bounds = { 5, 10, 25, 50, 100, 250, 500, 1000 };
    public Dictionary<string, long> Counters { get; } = new();
    public long[] Buckets { get; } = new long[Bounds.Length + 1];

    public void Count(string name) => Counters[name] = Counters.GetValueOrDefault(name) + 1;
    public void Observe(long ms) { var i = Array.FindIndex(Bounds, b => ms <= b); Buckets[i < 0 ? Bounds.Length : i]++; }

    public int Percentile(double p)
    {
        var target = Math.Ceiling(Buckets.Sum() * p);
        long seen = 0;
        for (var i = 0; i < Buckets.Length; i++)
            if ((seen += Buckets[i]) >= target) return i < Bounds.Length ? Bounds[i] : int.MaxValue;
        return 0;
    }
}

static class ObservabilityExtensions
{
    public static App UseObservability(this App app, Logger log, Metrics metrics, Clock clock)
    {
        var sequence = 0;
        return app.Use("observability", async (ctx, next) =>
        {
            var id = ctx.Request.Header("X-Request-Id") ?? $"req-{++sequence:0000}";
            ctx.Response.Headers["X-Request-Id"] = id;
            using var scope = log.BeginScope("correlationId", id);
            var started = clock.Now;
            log.Log(LogLevel.Info, "request started", ("method", ctx.Request.Method), ("path", ctx.Request.Path));
            await next(ctx);
            var status = ctx.Response.Status;
            if (ctx.Items.GetValueOrDefault("exception") is Exception e) log.Log(LogLevel.Error, "unhandled exception", ("type", e.GetType().Name), ("error", e.Message));
            log.Log(status >= 500 ? LogLevel.Error : status >= 400 ? LogLevel.Warning : LogLevel.Info, "request finished", ("status", status), ("ms", clock.Now - started));
            metrics.Count($"requests_{status / 100}xx");
            metrics.Observe(clock.Now - started);
        });
    }
}`,
      explanation:
        "UseObservability is registered at the outermost phase, so it brackets everything else, including rejections and the problem documents. It chooses a correlation id (the caller's or a generated req-NNNN), opens a log scope with it, and from then on every event logged during the request carries the id automatically because the scope lives in an AsyncLocal. After the rest of the pipeline returns, it reads the final status, logs the stashed exception if there is one, logs the finished event with the right level, counts the status class and drops the elapsed time into the histogram. Percentile walks the buckets until the cumulative count reaches ceil(total * p) and reports that bucket's upper bound.",
      hints: [
        { id: "h1", title: "Scopes with AsyncLocal", content: "static readonly AsyncLocal<Dictionary<string, object>> Scope = new(); BeginScope: var parent = Scope.Value; Scope.Value = new Dictionary<string, object>(parent ?? new()) { [key] = value }; return a small IDisposable that sets Scope.Value = parent when disposed (sealed class Restore(Action undo) : IDisposable { public void Dispose() => undo(); }). Log: var all = new Dictionary<string, object>(Scope.Value ?? new()); foreach (var (k, v) in props) all[k] = v; Events.Add(new LogEvent(clock.Now, level, message, all));" },
        { id: "h2", title: "Metrics", content: "Count: Counters[name] = Counters.GetValueOrDefault(name) + 1; Observe: var i = Array.FindIndex(Bounds, b => ms <= b); Buckets[i < 0 ? Bounds.Length : i]++; Percentile: var target = Math.Ceiling(Buckets.Sum() * p); long seen = 0; for (var i = 0; i < Buckets.Length; i++) if ((seen += Buckets[i]) >= target) return i < Bounds.Length ? Bounds[i] : int.MaxValue; return 0;" },
        { id: "h3", title: "The middleware", content: "var sequence = 0; return app.Use(\"observability\", async (ctx, next) => { var id = ctx.Request.Header(\"X-Request-Id\") ?? $\"req-{++sequence:0000}\"; ctx.Response.Headers[\"X-Request-Id\"] = id; using var scope = log.BeginScope(\"correlationId\", id); var started = clock.Now; log.Log(LogLevel.Info, \"request started\", (\"method\", ctx.Request.Method), (\"path\", ctx.Request.Path)); await next(ctx); var status = ctx.Response.Status; if (ctx.Items.GetValueOrDefault(\"exception\") is Exception e) log.Log(LogLevel.Error, \"unhandled exception\", (\"type\", e.GetType().Name), (\"error\", e.Message)); log.Log(status >= 500 ? LogLevel.Error : status >= 400 ? LogLevel.Warning : LogLevel.Info, \"request finished\", (\"status\", status), (\"ms\", clock.Now - started)); metrics.Count($\"requests_{status / 100}xx\"); metrics.Observe(clock.Now - started); });" },
      ],
      tests: [
        {
          id: "t1",
          description: "every response carries a request id: the caller's if given, a generated one otherwise",
          assertionCode: js`
assert(Array.isArray(scene.ops) && scene.ops.length >= 11 && scene.telemetry && Array.isArray(scene.telemetry.logs), "Register the module, replay \"ops\" and send Board.Show(\"telemetry\", ...).");
assert(Array.isArray(scene.ops), "Replay the section with observed.Replay(\"ops\").");
assertEqual(scene.ops[0].headers["X-Request-Id"], "req-0001", "first generated id");
assertEqual(scene.ops[1].headers["X-Request-Id"], "web-4411", "an inbound X-Request-Id is honoured");
assertEqual(scene.ops[2].headers["X-Request-Id"], "req-0002", "the counter only advances for generated ids");`,
        },
        {
          id: "t2",
          description: "each request logs a started and a finished event under the same correlation id",
          assertionCode: js`
assert(Array.isArray(scene.ops) && scene.ops.length >= 11 && scene.telemetry && Array.isArray(scene.telemetry.logs), "Register the module, replay \"ops\" and send Board.Show(\"telemetry\", ...).");
assert(scene.telemetry && Array.isArray(scene.telemetry.logs), "Send the telemetry with Board.Show(\"telemetry\", ...).");
const mine = scene.telemetry.logs.filter((e) => e.props.correlationId === "web-4411");
assertEqual(mine.map((e) => e.message), ["request started", "request finished"], "events for request web-4411");
assertEqual(mine[0].props.path, "/gyms/2/slots", "started carries the path");
assertEqual([mine[1].props.status, mine[1].props.ms, mine[1].level], [200, 18, "Info"], "finished carries status, elapsed ms and an Info level");`,
        },
        {
          id: "t3",
          description: "the scope puts the id on every event without passing it around",
          assertionCode: js`
assert(Array.isArray(scene.ops) && scene.ops.length >= 11 && scene.telemetry && Array.isArray(scene.telemetry.logs), "Register the module, replay \"ops\" and send Board.Show(\"telemetry\", ...).");
const logs = scene.telemetry.logs;
assert(logs.length >= 22, "11 requests make at least 22 events, got " + logs.length);
assert(logs.every((e) => typeof e.props.correlationId === "string" && e.props.correlationId.length > 0), "every event must carry correlationId from the scope");`,
        },
        {
          id: "t4",
          description: "levels follow the outcome: 4xx is a warning, 5xx an error",
          assertionCode: js`
assert(Array.isArray(scene.ops) && scene.ops.length >= 11 && scene.telemetry && Array.isArray(scene.telemetry.logs), "Register the module, replay \"ops\" and send Board.Show(\"telemetry\", ...).");
const done = scene.telemetry.logs.filter((e) => e.message === "request finished");
const level = (status) => done.filter((e) => e.props.status === status).map((e) => e.level);
assertEqual(level(404), ["Warning", "Warning"], "the two 404s");
assertEqual(level(405), ["Warning"], "the 405");
assertEqual(level(500), ["Error"], "the crash");`,
        },
        {
          id: "t5",
          description: "an unhandled exception is logged in full under the same id the client received",
          assertionCode: js`
assert(Array.isArray(scene.ops) && scene.ops.length >= 11 && scene.telemetry && Array.isArray(scene.telemetry.logs), "Register the module, replay \"ops\" and send Board.Show(\"telemetry\", ...).");
const crash = scene.ops[5];
assertEqual(crash.status, 500, "GET /drill/crash");
assertEqual(crash.headers["X-Request-Id"], "web-4412", "the caller's id is echoed");
const events = scene.telemetry.logs.filter((e) => e.props.correlationId === "web-4412");
const err = events.find((e) => e.message === "unhandled exception");
assert(err, "log an \"unhandled exception\" event for the crash");
assertEqual(err.level, "Error", "level");
assertEqual(err.props.type, "InvalidOperationException", "exception type is recorded");
assert(!crash.body.includes("secret"), "but the client body still reveals nothing");`,
        },
        {
          id: "t6",
          description: "counters group responses by status class",
          assertionCode: js`assert(Array.isArray(scene.ops) && scene.ops.length >= 11 && scene.telemetry && Array.isArray(scene.telemetry.logs), "Register the module, replay \"ops\" and send Board.Show(\"telemetry\", ...).");
assertEqual(scene.telemetry.counters, { requests_2xx: 7, requests_4xx: 3, requests_5xx: 1 }, "counters after 11 requests");`,
        },
        {
          id: "t7",
          description: "latencies land in histogram buckets",
          assertionCode: js`
assert(Array.isArray(scene.ops) && scene.ops.length >= 11 && scene.telemetry && Array.isArray(scene.telemetry.logs), "Register the module, replay \"ops\" and send Board.Show(\"telemetry\", ...).");
assertEqual(scene.telemetry.bounds, [5, 10, 25, 50, 100, 250, 500, 1000], "bucket bounds");
assertEqual(scene.telemetry.counts, [3, 3, 2, 1, 1, 0, 1, 0, 0], "observations per bucket (the 480 ms request lands in the 500 bucket)");`,
        },
        {
          id: "t8",
          description: "p50 and p95 are estimated from the buckets",
          assertionCode: js`
assert(Array.isArray(scene.ops) && scene.ops.length >= 11 && scene.telemetry && Array.isArray(scene.telemetry.logs), "Register the module, replay \"ops\" and send Board.Show(\"telemetry\", ...).");
assertEqual(scene.telemetry.p50, 10, "median request finishes within 10 ms");
assertEqual(scene.telemetry.p95, 500, "the slowest request pulls p95 up to the 500 ms bucket");`,
        },
      ],
      unlocks: ["ca-logs", "ca-latency"],
      checks: [
        {
          prompt: "Ten requests take 10 ms and one takes 5 000 ms. The average is about 464 ms. Which statement is true?",
          question: {
            type: "choice",
            options: [
              "The average describes none of the requests; the median and p95 tell the real story",
              "The average is the best single summary",
              "p95 would also be about 464 ms",
              "Percentiles cannot be computed from histograms",
            ],
            answer: 0,
          },
          explanation: "Averages smear outliers across everything. The median (10 ms) says what typical users get; p95 (here the slow bucket) says what unlucky ones get. Alert on percentiles, not averages.",
        },
        {
          prompt: "Why is the correlation id stored in an `AsyncLocal` instead of a `[ThreadStatic]` field?",
          question: {
            type: "choice",
            options: [
              "After an `await` the code may resume on another thread; AsyncLocal follows the async flow and thread-static state does not",
              "AsyncLocal is faster",
              "ThreadStatic fields cannot hold dictionaries",
              "AsyncLocal is required for logging",
            ],
            answer: 0,
          },
          explanation: "With thread-static storage the id would vanish whenever a continuation runs on a different thread, i.e. exactly around asynchronous I/O. AsyncLocal is flowed by the runtime along with the execution context.",
        },
        {
          prompt: "Which metric label is a bad idea?",
          question: {
            type: "choice",
            options: ["The member id on a request counter", "The status class (2xx, 4xx, 5xx)", "The HTTP method", "The route template (/bookings/{id})"],
            answer: 0,
          },
          explanation: "Every distinct label value creates a new time series. A label per member (or per raw URL with ids) grows without bound and eventually takes the metrics system down. Use the route *template*, not the path.",
        },
      ],
    },
    // ───────────────────────── 13 ─────────────────────────
    {
      id: "csharp-api-13-health",
      title: "Health checks: live, ready, startup",
      minutes: 40,
      xp: 220,
      concepts: ["liveness", "readiness", "startup probes", "Healthy / Degraded / Unhealthy", "aggregating checks", "graceful degradation", "no-store"],
      learn: md`### Three probes, three decisions

An orchestrator (Kubernetes, a cloud load balancer, a process manager) watches your service by calling small endpoints. Each asks a different question, because each leads to a different *action*:

- **Liveness**: *is the process alive and able to make progress?* If it fails, the orchestrator **restarts** the instance.
- **Readiness**: *should this instance receive traffic right now?* If it fails, the load balancer **stops sending requests** to it, but leaves it running so it can recover.
- **Startup**: *has the application finished booting?* While it fails, the orchestrator holds off the other two. Warming a cache or running migrations can take a minute, and a liveness probe that starts too early would kill the instance before it ever came up.

Keeping the three separate is the whole lesson. The expensive mistakes are all about putting a check on the wrong one.

### The classic mistake: dependencies in liveness

Suppose the database goes down for 30 seconds. If liveness checks the database, every instance fails liveness, the orchestrator restarts *all of them*, and when the database comes back your fleet is in a boot loop, cold caches and all. The restart helped nobody: the instances were fine, the dependency was not. So \`/health/live\` runs **no dependency checks**. If the code that answers it runs, the process is alive; that is the entire test.

Dependencies belong in **readiness**. A failed database check removes the instance from rotation (it could not serve a booking anyway) and puts it back as soon as the database returns. Even so, be careful with *shared* dependencies: if every instance depends on the same failing service, every instance goes unready and the load balancer has nothing left to send traffic to, turning a partial outage into a total one. That is the case for the third status.

### Healthy, Degraded, Unhealthy

A check returns one of three:

- **Healthy**: fine.
- **Unhealthy**: cannot do its job; readiness is **503**.
- **Degraded**: working but impaired. Confirmation emails are delayed, a cache is cold. Readiness stays **200** (the instance should still take traffic; most requests work), and the body says what is wrong so dashboards and humans can see it.

Choose per dependency: the database is required to book anything (Unhealthy), the mailer is not (Degraded), because bookings can still be taken and emails will catch up through the outbox in lesson 15.

### Aggregating

Run every check with the requested tag and take the **worst** status: \`Unhealthy\` beats \`Degraded\` beats \`Healthy\`. Because the enum is ordered (Healthy < Degraded < Unhealthy), the worst is simply the maximum. List each check in the response body (\`name\`, \`status\`, \`description\`) so an operator sees *which* dependency is failing.

Two safety rules for the checks themselves: a check that **throws** is Unhealthy (the check failing to run is itself a finding), and checks should be **fast and bounded**: a health probe that hangs for 30 seconds is worse than one that fails. In production wrap each check in a timeout.

### Details

- Responses carry \`Cache-Control: no-store\`; a cached health answer is a lie.
- Probe endpoints are **exempt** from rate limiting and authentication (you wrote the exemption in lesson 9): the orchestrator is not a member.
- They expose little detail to the public internet: in a real deployment health bodies are for internal networks.
- Our clock drives the demo outages (the database "fails" between 5 000 and 7 000 ms), so the result is the same on every run.

### Common mistakes

- Dependency checks in liveness.
- One endpoint for everything.
- Treating "optional dependency down" as unready.
- Health checks that mutate state or are expensive.
- Forgetting that a check can throw.`,
      mission: md`During the last deploy the instances took 90 seconds to warm their slot cache, the load balancer sent them traffic after 5, and members saw errors for a minute and a half. Two weeks earlier a short database blip made the orchestrator restart every instance at once. Both incidents trace back to one missing idea: a single "health" endpoint cannot answer three different questions.

You will build the three probes. The recording replays ten calls over eight virtual seconds while the clock moves through a warm-up period, a database outage and a window where email delivery is delayed. When this lesson passes, the **Health board** lights up.`,
      tasks: [
        "Write HealthChecks.Add and Run(tag): execute the checks with that tag, treat a throwing check as Unhealthy (\"the check itself failed\"), return the worst status and one entry (name, status, description) per check",
        "Write MapHealth: GET /health/live (always Healthy, no checks), GET /health/ready and GET /health/startup (the checks with those tags); answer 503 for Unhealthy and 200 otherwise, with body { status, checks } and Cache-Control: no-store",
        "Register the \"health\" module from the starter comment: warm-up (startup and ready) until 2000 ms, database unhealthy from 5000 to 7000 ms, mailer degraded from 6000 to 9000 ms",
      ],
      starterAdd: cs`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 13. Three probes. Register the module, then the harness replays "health".
//  Platform.Add("health", Phase.Endpoints, api => { var clock = api.Clock;
//      api.App.MapHealth(new HealthChecks()
//          .Add("warm-up",  "startup", () => clock.Now >= 2000 ? new(Health.Healthy) : new(Health.Unhealthy, "slot cache is still loading"))
//          .Add("warm-up",  "ready",   (the same check))
//          .Add("database", "ready",   () => clock.Now is >= 5000 and < 7000 ? new(Health.Unhealthy, "connection refused") : new(Health.Healthy))
//          .Add("mailer",   "ready",   () => clock.Now is >= 6000 and < 9000 ? new(Health.Degraded, "confirmation emails are delayed") : new(Health.Healthy))); });
await Platform.Build().Replay("health");

${TYPES_DIVIDER}

// ─── ✏️ YOUR TURN ─── HealthChecks.Run(tag): run the checks with that tag (a throwing check counts as Unhealthy), return the worst status and an entry per check.
// MapHealth: /health/live runs no checks (always Healthy), /health/ready and /health/startup run their tag; Unhealthy is 503, otherwise 200; Cache-Control: no-store.
enum Health { Healthy, Degraded, Unhealthy }
record HealthResult(Health Status, string Description = null);
record HealthCheck(string Name, string Tag, Func<HealthResult> Run);

class HealthChecks
{
    public List<HealthCheck> All { get; } = new();
    public HealthChecks Add(string name, string tag, Func<HealthResult> run) => throw new NotImplementedException();
    public (Health Status, List<object> Entries) Run(string tag) => throw new NotImplementedException();
}

static class HealthExtensions
{
    public static App MapHealth(this App app, HealthChecks checks) => throw new NotImplementedException();
}`,
      solutionAdd: cs`// 13. health checks
Platform.Add("health", Phase.Endpoints, api =>
{
    var clock = api.Clock;
    api.App.MapHealth(new HealthChecks()
        .Add("warm-up", "startup", () => clock.Now >= 2000 ? new(Health.Healthy) : new(Health.Unhealthy, "slot cache is still loading"))
        .Add("warm-up", "ready", () => clock.Now >= 2000 ? new(Health.Healthy) : new(Health.Unhealthy, "slot cache is still loading"))
        .Add("database", "ready", () => clock.Now is >= 5000 and < 7000 ? new(Health.Unhealthy, "connection refused") : new(Health.Healthy))
        .Add("mailer", "ready", () => clock.Now is >= 6000 and < 9000 ? new(Health.Degraded, "confirmation emails are delayed") : new(Health.Healthy)));
});
await Platform.Build().Replay("health");

${TYPES_DIVIDER}
enum Health { Healthy, Degraded, Unhealthy }
record HealthResult(Health Status, string Description = null);
record HealthCheck(string Name, string Tag, Func<HealthResult> Run);

class HealthChecks
{
    public List<HealthCheck> All { get; } = new();
    public HealthChecks Add(string name, string tag, Func<HealthResult> run) { All.Add(new HealthCheck(name, tag, run)); return this; }

    public (Health Status, List<object> Entries) Run(string tag)
    {
        var entries = new List<object>();
        var worst = Health.Healthy;
        foreach (var check in All.Where(c => c.Tag == tag))
        {
            HealthResult result;
            try { result = check.Run(); } catch (Exception) { result = new HealthResult(Health.Unhealthy, "the check itself failed"); }
            if (result.Status > worst) worst = result.Status;
            entries.Add(new { check.Name, result.Status, result.Description });
        }
        return (worst, entries);
    }
}

static class HealthExtensions
{
    public static App MapHealth(this App app, HealthChecks checks)
    {
        app.MapGet("/health/live", ctx => Report(ctx, Health.Healthy, new List<object>()));
        foreach (var tag in new[] { "ready", "startup" })
            app.MapGet("/health/" + tag, ctx => { var (status, entries) = checks.Run(tag); return Report(ctx, status, entries); });
        return app;
    }

    static Task Report(HttpContext ctx, Health status, List<object> entries)
    {
        ctx.Response.WriteJson(status == Health.Unhealthy ? 503 : 200, new { status, checks = entries });
        ctx.Response.Headers["Cache-Control"] = "no-store";
        return Task.CompletedTask;
    }
}`,
      explanation:
        "HealthChecks keeps a flat list of named, tagged checks. Run(tag) executes only the checks with that tag, converts an exception into an Unhealthy result, and takes the maximum of the statuses (the enum order makes the worst the largest). MapHealth registers three GET routes: live runs no checks at all, so it answers 200 even while the database is down and never causes a restart; ready and startup run their tagged checks. Unhealthy becomes 503, while Degraded stays 200 but is visible in the body. Every response is marked no-store because a cached probe result is meaningless.",
      hints: [
        { id: "h1", title: "Run", content: "var entries = new List<object>(); var worst = Health.Healthy; foreach (var check in All.Where(c => c.Tag == tag)) { HealthResult result; try { result = check.Run(); } catch (Exception) { result = new HealthResult(Health.Unhealthy, \"the check itself failed\"); } if (result.Status > worst) worst = result.Status; entries.Add(new { check.Name, result.Status, result.Description }); } return (worst, entries);" },
        { id: "h2", title: "The three endpoints", content: "app.MapGet(\"/health/live\", ctx => Report(ctx, Health.Healthy, new List<object>())); foreach (var tag in new[] { \"ready\", \"startup\" }) app.MapGet(\"/health/\" + tag, ctx => { var (status, entries) = checks.Run(tag); return Report(ctx, status, entries); });  Report: ctx.Response.WriteJson(status == Health.Unhealthy ? 503 : 200, new { status, checks = entries }); ctx.Response.Headers[\"Cache-Control\"] = \"no-store\"; return Task.CompletedTask;  Careful: the lambda captures the loop variable tag, which is fine because foreach gives a fresh variable per iteration." },
        { id: "h3", title: "Reading the timeline", content: "At 100 ms the warm-up is not done: startup is 503. At 2500 ms it is done: startup is 200. Readiness includes the same warm-up check plus the database and the mailer. At 5500 ms the database is unhealthy: ready is 503 but live is still 200. At 7500 ms the database is back but the mailer is degraded: ready is 200 and the body status is Degraded." },
      ],
      tests: [
        {
          id: "t1",
          description: "liveness always answers 200 and runs no checks",
          assertionCode: js`
assert(Array.isArray(scene.health) && scene.health.length >= 10, "Register the module and replay: await Platform.Build().Replay(\"health\").");
assert(Array.isArray(scene.health), "Replay the section with Platform.Build().Replay(\"health\").");
const live = scene.health[0];
assertEqual(live.status, 200, "GET /health/live at 0 ms");
assertEqual(JSON.parse(live.body), { status: "Healthy", checks: [] }, "no checks run for liveness");
assertEqual(scene.health[7].status, 200, "liveness stays 200 at 5600 ms while the database is down");`,
        },
        {
          id: "t2",
          description: "startup is 503 until warm-up finishes",
          assertionCode: js`
assert(Array.isArray(scene.health) && scene.health.length >= 10, "Register the module and replay: await Platform.Build().Replay(\"health\").");
assertEqual([scene.health[1].status, scene.health[3].status], [503, 503], "startup at 100 ms and 1500 ms");
assertEqual(scene.health[4].status, 200, "startup at 2500 ms");
const body = JSON.parse(scene.health[1].body);
assertEqual(body.checks.map((c) => c.name), ["warm-up"], "startup runs only the startup checks");
assertEqual(body.checks[0].description, "slot cache is still loading", "the failing check explains itself");`,
        },
        {
          id: "t3",
          description: "readiness waits for warm-up and then passes",
          assertionCode: js`
assert(Array.isArray(scene.health) && scene.health.length >= 10, "Register the module and replay: await Platform.Build().Replay(\"health\").");
assertEqual(scene.health[2].status, 503, "ready at 200 ms (still warming)");
const ok = scene.health[5];
assertEqual(ok.status, 200, "ready at 3000 ms");
assertEqual(JSON.parse(ok.body).status, "Healthy", "overall status");
assertEqual(JSON.parse(ok.body).checks.map((c) => c.name), ["warm-up", "database", "mailer"], "readiness runs the ready checks in registration order");`,
        },
        {
          id: "t4",
          description: "a failing dependency makes the instance unready",
          assertionCode: js`
assert(Array.isArray(scene.health) && scene.health.length >= 10, "Register the module and replay: await Platform.Build().Replay(\"health\").");
const down = scene.health[6];
assertEqual(down.status, 503, "ready at 5500 ms, database unhealthy");
const body = JSON.parse(down.body);
assertEqual(body.status, "Unhealthy", "overall status");
const db = body.checks.find((c) => c.name === "database");
assertEqual([db.status, db.description], ["Unhealthy", "connection refused"], "the failing check is named");`,
        },
        {
          id: "t5",
          description: "the worst status wins when several checks are impaired",
          assertionCode: js`
assert(Array.isArray(scene.health) && scene.health.length >= 10, "Register the module and replay: await Platform.Build().Replay(\"health\").");
const both = JSON.parse(scene.health[8].body);
assertEqual(scene.health[8].status, 503, "ready at 6500 ms");
assertEqual(both.status, "Unhealthy", "Unhealthy beats Degraded");
assertEqual(both.checks.find((c) => c.name === "mailer").status, "Degraded", "the mailer check is still listed");`,
        },
        {
          id: "t6",
          description: "degraded still serves traffic but says what is wrong",
          assertionCode: js`
assert(Array.isArray(scene.health) && scene.health.length >= 10, "Register the module and replay: await Platform.Build().Replay(\"health\").");
const degraded = scene.health[9];
assertEqual(degraded.status, 200, "ready at 7500 ms stays 200");
const body = JSON.parse(degraded.body);
assertEqual(body.status, "Degraded", "but the body reports it");
assertEqual(body.checks.find((c) => c.name === "mailer").description, "confirmation emails are delayed", "description");`,
        },
        {
          id: "t7",
          description: "probe answers are never cached",
          assertionCode: js`assert(Array.isArray(scene.health) && scene.health.length >= 10, "Register the module and replay: await Platform.Build().Replay(\"health\").");
assert(scene.health.every((e) => e.headers["Cache-Control"] === "no-store"), "every health response must carry Cache-Control: no-store");`,
        },
      ],
      unlocks: ["ca-health"],
      checks: [
        {
          prompt: "The database is down. Which probe results are right for an instance?",
          question: {
            type: "choice",
            options: [
              "Liveness 200, readiness 503",
              "Liveness 503, readiness 503",
              "Liveness 503, readiness 200",
              "Liveness 200, readiness 200",
            ],
            answer: 0,
          },
          explanation: "The process is fine, so liveness passes and no restart happens. It cannot serve bookings, so readiness fails and the load balancer routes around it until the database returns.",
        },
        {
          prompt: "Why does a startup probe exist at all, when readiness already says \"not ready yet\"?",
          question: {
            type: "choice",
            options: [
              "So a slow boot is not mistaken for a hang and killed by the liveness probe",
              "To warm the cache",
              "To replace the readiness probe",
              "To check the database",
            ],
            answer: 0,
          },
          explanation: "While the startup probe is failing the orchestrator suppresses liveness and readiness, giving a slow application time to finish booting without being restarted.",
        },
        {
          prompt: "The mailer is down but bookings still work, because confirmations queue in an outbox. What should its health check return?",
          question: { type: "choice", options: ["Degraded", "Unhealthy", "Healthy", "Throw an exception"], answer: 0 },
          explanation: "An optional dependency should not take the whole instance out of rotation. Degraded keeps readiness at 200 while making the impairment visible to dashboards.",
        },
      ],
    },
    // ───────────────────────── 14 ─────────────────────────
    {
      id: "csharp-api-14-resilience",
      title: "Timeouts, retries with jitter and a circuit breaker",
      minutes: 55,
      xp: 290,
      concepts: ["timeouts", "retries", "exponential backoff", "jitter", "circuit breaker", "closed / open / half-open", "failing fast", "transient vs permanent failures"],
      learn: md`### Your API is only as reliable as what it calls

Booking confirmations go out through an email provider that you do not control. It will be slow sometimes, it will fail sometimes, and occasionally it will be down for minutes. If every request that touches it simply waits and hopes, a slow provider becomes a slow site: threads pile up behind a dependency that cannot answer, the pile reaches your own limits, and a problem in a minor system takes down your major one. **Resilience patterns** exist to contain that damage. Three of them compose into a very effective default.

### 1. Timeouts: never wait forever

Every outbound call needs a deadline. Without one, "the provider is slow" means "my request is stuck", and so is the one behind it. Choose the timeout from what the caller can tolerate, not from what the provider claims. A call that exceeds it is treated as **failed**; you pay the timeout, not the full latency. (In our simulation the clock advances by the timeout when a call is too slow, which is exactly what a real timeout buys you.)

### 2. Retries: only for transient failures

Some failures go away if you try again (a 503, a timeout, a dropped connection) and some never do (a 422 because the address is malformed: \`bounce@nowhere\` is not going to deliver on the third attempt either). A retry policy must tell them apart:

- **5xx and timeouts** are *transient*: retry.
- **4xx** are *permanent*: report them, do not retry, and do **not** count them against the upstream's health (they are your fault, not its).
- Only retry operations that are **safe to repeat**: idempotent requests, or POSTs with an idempotency key (lesson 10).

### Backoff and jitter

Retrying immediately, in a tight loop, hammers a service that is already struggling. **Exponential backoff** waits longer after each failure: \`baseMs × 2^(attempt − 1)\`, so 100 ms, then 200 ms, then 400 ms. That alone is not enough. If a thousand clients all failed at the same moment, they will all retry at the same moments, producing synchronized waves: a **thundering herd**. **Jitter** randomises the delay so the herd spreads out. Ours is \`baseMs × 2^(attempt − 1) × (0.5 + jitter())\`, where \`jitter()\` returns a number in \`[0, 1)\`. We inject it as a function so a test can supply a constant and get exact, repeatable timings (the harness uses \`() => 0.5\`), while production would pass \`Random.Shared.NextDouble\`.

Retries multiply. If a request passes through three layers that each retry three times, one user action can become 27 calls. Retry in one place, and cap the total.

### 3. The circuit breaker: stop asking a service that cannot answer

Even with sensible retries, sending traffic to a dead service wastes time and keeps it from recovering. A **circuit breaker** watches the results and, after enough consecutive failures, **trips**: for a while it fails every call *immediately*, without touching the network. Three states:

- **Closed**: normal. Calls go through; failures are counted, a success resets the count.
- **Open**: tripped. Calls are **rejected at once** ("rejected", zero attempts, zero time). After \`openMs\` the breaker moves to half-open.
- **Half-open**: one probe call is allowed through. If it succeeds the breaker **closes**; if it fails the breaker **opens again** for another \`openMs\`.

~~~text
Closed --(3 consecutive failures)--> Open --(1200 ms pass)--> Half-open --probe ok--> Closed
                                                                  \--probe fails--> Open
~~~

In the recording you can watch it happen. The mailer goes down at 1 s; one call retries three times and trips the breaker; the next four calls are rejected instantly (no calls reach the upstream at all); the first probe lands during the slow window and times out, which re-opens the breaker; and the probe after that finds a healthy mailer and closes it. Of 14 operations only 9 actual sends reached the provider.

### What the caller gets

Because rejection is immediate and explicit, the code that called \`Run\` can decide: queue the work for later (the outbox does exactly that in lesson 15), return a degraded answer, or surface an error. The breaker state is also a fine health signal: an open breaker makes the mailer check "Degraded".

### Common mistakes

- No timeout, or a timeout longer than the caller's own.
- Retrying 4xx responses.
- Retrying without backoff, or with backoff but without jitter.
- Retrying at every layer.
- Counting client errors as upstream failures, which trips the breaker because of your own bad data.
- A breaker that never lets a probe through, so it can never close.`,
      mission: md`The email provider had a bad hour last month. Every booking request waited for it, the site slowed to a crawl, and the on-call engineer's most memorable observation was that *nothing was actually broken on our side*. The team decided the platform will no longer let one flaky dependency set the pace for everything else.

You will write the circuit breaker and the resilient caller. The harness feeds fourteen sends through them while a simulated mailer is healthy, then down, then slow, then healthy again, and the console draws the timeline of results with the breaker's state. When this lesson passes, the **Upstream calls** panel lights up.`,
      tasks: [
        "Write CircuitBreaker: State (Closed while failures < threshold; Open until openMs after it tripped; then HalfOpen), Allow() (false only when Open), Success() (reset the failure count) and Failure() (count it, and when the threshold is reached remember clock.Now + openMs)",
        "Write Resilient.Run: for each attempt ask the breaker (\"rejected\" with attempts so far when Open); call; a latency above timeoutMs costs timeoutMs and counts as a timeout; a 5xx or timeout is a transient failure (breaker.Failure, then wait baseMs * 2^(attempt-1) * (0.5 + jitter()) ms on the clock and retry, up to retries extra attempts, then \"failed\"); a 4xx is permanent: no retry, no breaker failure, Outcome(\"failed\", attempt, permanent: true); a success calls breaker.Success and returns \"ok\"",
        "Run the harness and read the timeline: healthy calls take one attempt, the outage costs three, an open breaker rejects without touching the upstream, and a half-open probe either closes the breaker or re-opens it",
      ],
      starterAdd: cs`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 14. Call the flaky mailer through a timeout, retries and a circuit breaker. The harness is ready: 14 sends, 400 ms apart,
// while the mailer is healthy (0-1000 ms), down (1000-3000 ms), slow (3000-3500 ms) and healthy again.
var callClock = new Clock();
var upstream = new Mailer();
var breaker = new CircuitBreaker(callClock, threshold: 3, openMs: 1200);
var resilient = new Resilient(callClock, breaker, timeoutMs: 300, retries: 2, baseMs: 100, jitter: () => 0.5);
var calls = new List<object>();
for (var i = 0; i < 14; i++)
{
    callClock.AdvanceTo(i * 400);
    var begun = callClock.Now;
    (upstream.Down, upstream.LatencyMs) = (begun is >= 1000 and < 3000, begun is >= 3000 and < 3500 ? 900 : 40);
    var outcome = await resilient.Run(() => upstream.Send($"msg-{i}"));
    calls.Add(new { i, at = begun, outcome.Result, outcome.Attempts, spentMs = callClock.Now - begun, breaker = breaker.State });
}
Board.Show("resilience", new { calls, upstreamCalls = upstream.Calls });

${TYPES_DIVIDER}

// ─── ✏️ YOUR TURN ─── CircuitBreaker: State is Closed below the failure threshold, Open until openMs have passed since it tripped, then HalfOpen
// (one probe is allowed through). Success resets the count; Failure counts and trips. Resilient.Run: loop attempts; ask the breaker first
// ("rejected"); a call slower than timeoutMs costs timeoutMs and is a failure; 5xx is a failure; 4xx is permanent (no retry, not the upstream's fault);
// after a failure wait baseMs * 2^(attempt-1) * (0.5 + jitter()) ms on the clock and try again, up to retries extra attempts.
class CircuitBreaker(Clock clock, int threshold, long openMs)
{
    public string State => throw new NotImplementedException();
    public bool Allow() => throw new NotImplementedException();
    public void Success() => throw new NotImplementedException();
    public void Failure() => throw new NotImplementedException();
}

class Resilient(Clock clock, CircuitBreaker breaker, int timeoutMs, int retries, int baseMs, Func<double> jitter)
{
    public Task<Outcome> Run(Func<Task<(int Status, int LatencyMs)>> call) => throw new NotImplementedException();
}

// Provided: the result type and the simulated upstream. Tests flip Down and LatencyMs to stage outages and slow days.
record Outcome(string Result, int Attempts, bool Permanent = false);

// A simulated upstream mailer. Tests flip Down and LatencyMs to stage outages and slow days.
class Mailer
{
    public int Calls { get; private set; }
    public bool Down { get; set; }
    public int LatencyMs { get; set; } = 40;
    public Action<int> OnSend { get; set; }

    public Task<(int Status, int LatencyMs)> Send(string message)
    {
        Calls++;
        OnSend?.Invoke(Calls);
        return Task.FromResult(message.Contains("bounce") ? (422, 30) : Down ? (503, 60) : (200, LatencyMs));
    }
}`,
      solutionAdd: cs`// 14. resilient calls
var callClock = new Clock();
var upstream = new Mailer();
var breaker = new CircuitBreaker(callClock, threshold: 3, openMs: 1200);
var resilient = new Resilient(callClock, breaker, timeoutMs: 300, retries: 2, baseMs: 100, jitter: () => 0.5);
var calls = new List<object>();
for (var i = 0; i < 14; i++)
{
    callClock.AdvanceTo(i * 400);
    var begun = callClock.Now;
    (upstream.Down, upstream.LatencyMs) = (begun is >= 1000 and < 3000, begun is >= 3000 and < 3500 ? 900 : 40);
    var outcome = await resilient.Run(() => upstream.Send($"msg-{i}"));
    calls.Add(new { i, at = begun, outcome.Result, outcome.Attempts, spentMs = callClock.Now - begun, breaker = breaker.State });
}
Board.Show("resilience", new { calls, upstreamCalls = upstream.Calls });

${TYPES_DIVIDER}
record Outcome(string Result, int Attempts, bool Permanent = false);

// A simulated upstream mailer. Tests flip Down and LatencyMs to stage outages and slow days.
class Mailer
{
    public int Calls { get; private set; }
    public bool Down { get; set; }
    public int LatencyMs { get; set; } = 40;
    public Action<int> OnSend { get; set; }

    public Task<(int Status, int LatencyMs)> Send(string message)
    {
        Calls++;
        OnSend?.Invoke(Calls);
        return Task.FromResult(message.Contains("bounce") ? (422, 30) : Down ? (503, 60) : (200, LatencyMs));
    }
}

class CircuitBreaker(Clock clock, int threshold, long openMs)
{
    int failures;
    long openUntil;
    public string State => failures < threshold ? "Closed" : clock.Now < openUntil ? "Open" : "HalfOpen";
    public bool Allow() => State != "Open";
    public void Success() => failures = 0;
    public void Failure() { if (++failures >= threshold) openUntil = clock.Now + openMs; }
}

class Resilient(Clock clock, CircuitBreaker breaker, int timeoutMs, int retries, int baseMs, Func<double> jitter)
{
    public async Task<Outcome> Run(Func<Task<(int Status, int LatencyMs)>> call)
    {
        for (var attempt = 1; ; attempt++)
        {
            if (!breaker.Allow()) return new Outcome("rejected", attempt - 1);
            var (status, latency) = await call();
            var timedOut = latency > timeoutMs;
            clock.Advance(timedOut ? timeoutMs : latency);
            if (!timedOut && status < 500)
            {
                if (status < 400) breaker.Success();
                return new Outcome(status < 400 ? "ok" : "failed", attempt, status >= 400);
            }
            breaker.Failure();
            if (attempt > retries) return new Outcome("failed", attempt);
            clock.Advance((long)(baseMs * Math.Pow(2, attempt - 1) * (0.5 + jitter())));
        }
    }
}`,
      explanation:
        "Run loops over attempts. It first asks the breaker whether a call may go out; if the breaker is open the answer is an immediate \"rejected\". Otherwise it calls the upstream and advances the clock by the latency, or by the timeout if the call was slower. A result under 500 that is not a timeout ends the loop: success closes the failure count, while a 4xx is returned as a permanent failure that does not count against the upstream. A 5xx or a timeout is recorded with the breaker; if retries remain the clock advances by the jittered exponential delay and the loop repeats. The breaker computes its state from the failure count and the time it tripped, so after openMs it becomes HalfOpen and lets exactly the next call through as a probe: a success resets it to Closed, a failure trips it again.",
      hints: [
        { id: "h1", title: "The breaker", content: "int failures; long openUntil; State => failures < threshold ? \"Closed\" : clock.Now < openUntil ? \"Open\" : \"HalfOpen\"; Allow() => State != \"Open\"; Success() => failures = 0; Failure() { if (++failures >= threshold) openUntil = clock.Now + openMs; }  A failed half-open probe keeps failures at or above the threshold, so Failure() trips it again." },
        { id: "h2", title: "The loop", content: "for (var attempt = 1; ; attempt++) { if (!breaker.Allow()) return new Outcome(\"rejected\", attempt - 1); var (status, latency) = await call(); var timedOut = latency > timeoutMs; clock.Advance(timedOut ? timeoutMs : latency); if (!timedOut && status < 500) { if (status < 400) breaker.Success(); return new Outcome(status < 400 ? \"ok\" : \"failed\", attempt, status >= 400); } breaker.Failure(); if (attempt > retries) return new Outcome(\"failed\", attempt); clock.Advance((long)(baseMs * Math.Pow(2, attempt - 1) * (0.5 + jitter()))); }" },
        { id: "h3", title: "Reading the numbers", content: "With jitter 0.5 the waits are exactly 100 ms and 200 ms, so the outage call costs 3 x 60 ms of upstream latency plus 300 ms of waiting: 480 ms in 3 attempts. The breaker trips on the third failure, stays open for 1200 ms (so the next four calls are rejected with zero attempts), reaches half-open for the call at 3200 ms, whose probe is slow and times out after 300 ms, trips again, and is rejected on its second attempt (attempts = 1). The probe at 4800 ms succeeds and the breaker closes." },
      ],
      tests: [
        {
          id: "t1",
          description: "while the upstream is healthy every call succeeds on the first attempt",
          assertionCode: js`
assert(scene.resilience && Array.isArray(scene.resilience.calls) && scene.resilience.calls.length >= 14, "The harness sends Board.Show(\"resilience\", ...): finish CircuitBreaker and Resilient first.");
assert(scene.resilience && Array.isArray(scene.resilience.calls), "The harness sends Board.Show(\"resilience\", ...).");
const healthy = scene.resilience.calls.slice(0, 3);
assertEqual(healthy.map((c) => [c.result, c.attempts, c.breaker]), [["ok", 1, "Closed"], ["ok", 1, "Closed"], ["ok", 1, "Closed"]], "first three sends");
assertEqual(healthy.map((c) => c.spentMs), [40, 40, 40], "each costs the upstream's 40 ms latency");`,
        },
        {
          id: "t2",
          description: "an outage is retried with growing delays and then reported as failed",
          assertionCode: js`
assert(scene.resilience && Array.isArray(scene.resilience.calls) && scene.resilience.calls.length >= 14, "The harness sends Board.Show(\"resilience\", ...): finish CircuitBreaker and Resilient first.");
const outage = scene.resilience.calls[3];
assertEqual([outage.result, outage.attempts], ["failed", 3], "one try plus two retries");
assert(outage.spentMs >= 400 && outage.spentMs <= 600, "three 60 ms calls plus waits of about 100 and 200 ms should cost about 480 ms, got " + outage.spentMs);`,
        },
        {
          id: "t3",
          description: "three consecutive failures trip the breaker",
          assertionCode: js`assert(scene.resilience && Array.isArray(scene.resilience.calls) && scene.resilience.calls.length >= 14, "The harness sends Board.Show(\"resilience\", ...): finish CircuitBreaker and Resilient first.");
assertEqual(scene.resilience.calls[3].breaker, "Open", "breaker state after the failed call");`,
        },
        {
          id: "t4",
          description: "an open breaker rejects calls instantly without touching the upstream",
          assertionCode: js`
assert(scene.resilience && Array.isArray(scene.resilience.calls) && scene.resilience.calls.length >= 14, "The harness sends Board.Show(\"resilience\", ...): finish CircuitBreaker and Resilient first.");
for (const i of [4, 5, 6, 7]) {
  const c = scene.resilience.calls[i];
  assertEqual([c.result, c.attempts, c.spentMs, c.breaker], ["rejected", 0, 0, "Open"], "call " + i + " while the breaker is open");
}`,
        },
        {
          id: "t5",
          description: "after the open period one probe goes out; if it fails the breaker opens again",
          assertionCode: js`
assert(scene.resilience && Array.isArray(scene.resilience.calls) && scene.resilience.calls.length >= 14, "The harness sends Board.Show(\"resilience\", ...): finish CircuitBreaker and Resilient first.");
const probe = scene.resilience.calls[8];
assertEqual(probe.result, "rejected", "the call at 3200 ms ends rejected: its probe failed and the breaker re-opened");
assertEqual(probe.attempts, 1, "exactly one probe reached the upstream");
assert(probe.spentMs >= 300, "the slow probe cost the full timeout, got " + probe.spentMs);
assertEqual(scene.resilience.calls[9].breaker, "Open", "still open afterwards");`,
        },
        {
          id: "t6",
          description: "a successful probe closes the breaker and traffic resumes",
          assertionCode: js`
assert(scene.resilience && Array.isArray(scene.resilience.calls) && scene.resilience.calls.length >= 14, "The harness sends Board.Show(\"resilience\", ...): finish CircuitBreaker and Resilient first.");
const [recovered, after] = [scene.resilience.calls[12], scene.resilience.calls[13]];
assertEqual([recovered.result, recovered.attempts, recovered.breaker], ["ok", 1, "Closed"], "the probe at 4800 ms succeeds");
assertEqual([after.result, after.breaker], ["ok", "Closed"], "and the next call is normal");`,
        },
        {
          id: "t7",
          description: "the breaker saved most of the calls a naive client would have made",
          assertionCode: js`assert(scene.resilience && Array.isArray(scene.resilience.calls) && scene.resilience.calls.length >= 14, "The harness sends Board.Show(\"resilience\", ...): finish CircuitBreaker and Resilient first.");
assertEqual(scene.resilience.upstreamCalls, 9, "3 healthy + 3 retried + 1 failed probe + 2 after recovery; the other 5 operations never reached the upstream");`,
        },
      ],
      unlocks: ["ca-resilience"],
      checks: [
        {
          prompt: "The mailer answers `422` (the address is invalid). What should the resilience policy do?",
          question: {
            type: "choice",
            options: [
              "Return the failure at once: retrying cannot help, and it is not evidence the mailer is unhealthy",
              "Retry three times with backoff",
              "Trip the circuit breaker",
              "Treat it as a timeout",
            ],
            answer: 0,
          },
          explanation: "A 4xx is a permanent, caller-side failure. Retrying wastes time; counting it against the breaker would let a handful of bad addresses shut off email for everyone.",
        },
        {
          prompt: "Why add jitter to exponential backoff?",
          question: {
            type: "choice",
            options: [
              "So many clients that failed together do not all retry together",
              "To make retries faster",
              "To avoid timeouts",
              "So the delay is always an integer",
            ],
            answer: 0,
          },
          explanation: "Without jitter, clients that failed at the same instant wait the same time and hit the recovering service in synchronized waves (a thundering herd). Randomness spreads them out.",
        },
        {
          prompt: "An open breaker moves to half-open after `openMs`. What does half-open allow?",
          question: {
            type: "choice",
            options: [
              "A probe call: success closes the breaker, failure opens it again",
              "All traffic, as if it were closed",
              "No calls until someone resets it by hand",
              "Only retries, never first attempts",
            ],
            answer: 0,
          },
          explanation: "Half-open is a cautious test. One call is let through; its outcome decides whether to resume normal traffic or to back off again.",
        },
      ],
    },
    // ───────────────────────── 15 ─────────────────────────
    {
      id: "csharp-api-15-outbox",
      title: "The outbox and a worker that shuts down gracefully",
      minutes: 60,
      xp: 310,
      concepts: ["dual-write problem", "transactional outbox", "at-least-once delivery", "dead letters", "background worker", "CancellationToken", "graceful shutdown", "partial methods"],
      learn: md`### The dual-write problem

Creating a booking should send a confirmation email. The obvious code does two things in a row:

~~~csharp
db.SaveChanges();          // 1. the booking is committed
await mailer.Send(...);    // 2. the email is sent
~~~

Two systems, no shared transaction, so there is a gap between the two lines. If the process dies there (a deploy, an out-of-memory kill, a power cut), the booking exists and the email never goes out, and nothing anywhere remembers that it should have. Swap the order and you can send an email for a booking that was never saved. You cannot make "write to my database" and "call another service" atomic. What you *can* do is make the **intent to send** part of the database commit.

### The transactional outbox

Instead of sending, the request **writes a message row to an \`Outbox\` table in the same unit of work** as the booking. Both rows commit together or neither does. A separate **worker** later reads pending messages and delivers them. The request path no longer depends on the email provider at all: the provider can be down for an hour and bookings still succeed. The email becomes *eventually* consistent with the booking, which is exactly the right trade here.

In our code the unit of work offers an extension point: \`SaveChanges\` calls a **partial method**, \`Saving(added)\`, after new rows have ids. \`DbContext\` is a \`partial class\`, so lesson 15 adds the other half in new code without touching lesson 7's text:

~~~csharp
partial class DbContext
{
    partial void Saving(List<Entity> added) { /* for each added Booking, Add(new OutboxMessage { ... }) */ }
}
~~~

(A partial method with no implementation is simply removed by the compiler, which is why lessons 7 to 14 never noticed it. Entity Framework offers the same seam as \`SaveChanges\` interceptors, and domain-driven designs call the idea *domain events*.)

### At-least-once, so be idempotent

The worker marks a message \`Sent\` *after* the provider accepted it. If it crashes between those two moments, the next run sends it again. The outbox therefore guarantees **at least once**, never exactly once. The remedy is the one from lesson 10: the receiver (or the call itself) should be idempotent: send the outbox message id as an idempotency key and a duplicate becomes a no-op.

### Failures: retry, back off, give up

The worker records an \`Attempts\` count and a \`NotBefore\` time on each message:

- **Success**: status \`Sent\`.
- **Permanent failure** (the provider says the address is invalid): retrying is pointless. Status **\`Dead\`**, the *dead-letter* state: parked for a human, not retried automatically. Without one, a single poison message is retried forever and blocks everything behind it.
- **Transient failure** (provider down): leave it \`Pending\`, count the attempt, and set \`NotBefore\` a little in the future, growing with each attempt (**backoff** at the message level, on top of the call-level retries from lesson 14), until \`maxAttempts\` is reached, then \`Dead\`.

Save after **every** message. If the worker is killed after the third of ten, those three must not be sent again, and the other seven must still be pending.

### Graceful shutdown with a CancellationToken

Hosts stop workers by signalling a \`CancellationToken\` (a deploy sends SIGTERM and gives you a grace period). **Cancellation is cooperative**: nothing is aborted; your code has to notice. The rule that gives clean shutdowns is: **check the token between units of work, never in the middle of one.** The worker checks \`stop.IsCancellationRequested\` before *starting* each message and returns; a message already in flight finishes, is saved, and only then does the worker exit. Notice what we deliberately do **not** do: pass the stopping token into the send call. That would abandon a half-sent message, the exact state we are trying to avoid. The token controls *whether to begin*, not whether to finish.

In the harness the first run is "killed" by a token that is cancelled while the third message is being sent. The third still completes (\`Sent\`), the other three stay \`Pending\`, and the next run picks up exactly where the last stopped.

### In production

A real worker is a hosted service (\`BackgroundService\`) with a loop that waits for new work (a signal, or a delay) and honours the token in that wait too. Poll frequently or nudge the worker after each commit. Run several workers by claiming rows (\`UPDATE ... WHERE status='Pending' LIMIT n\` with a lock), and monitor the age of the oldest pending message, which is the number that tells you the email system is behind.

### Common mistakes

- Sending directly from the request "just this once".
- Marking the message sent *before* it is sent.
- Retrying a permanent failure forever.
- Passing the shutdown token into the work, abandoning it half done.
- Saving only at the end of the batch.
- Assuming exactly-once delivery.`,
      mission: md`A deploy during a busy morning killed the web process between "booking saved" and "email sent". Forty members had confirmed bookings and no confirmation, and nobody noticed until they arrived confused. The team's decision: **never send from the request path again**.

You will make bookings write outbox messages in the same commit and write the worker that delivers them. The harness books six guests through the API, then starts the worker three times: it is interrupted by a shutdown signal while sending the third message, it runs again during a mailer outage (one guest has a bad address), and it runs once more after the mailer recovers. When this lesson passes, the **Outbox** panel lights up.`,
      tasks: [
        "Finish the partial DbContext: implement Saving(added) so each added Booking also adds an OutboxMessage { Topic = \"booking-confirmed\", Payload = the guest's name }",
        "Write OutboxWorker.RunAsync(stop): load the Pending messages that are due (NotBefore <= clock.Now); before starting each one return if stop.IsCancellationRequested; send it through the resilient caller (do not pass the token into the send); Attempts++; Sent on \"ok\"; Dead when the failure is permanent or Attempts >= maxAttempts; otherwise NotBefore = clock.Now + 500 * Attempts; SaveChanges after every message",
        "Register the \"outbox\" module from the starter comment and run the harness; read the three queue snapshots on the console",
      ],
      starterAdd: cs`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 15. Confirmation emails go through an outbox. Register the module; the harness books six guests through the API, then runs the worker three times:
// stopped by a shutdown signal mid-batch, during a mailer outage, and after recovery.
//  Platform.Add("outbox", Phase.Endpoints, api => { var mailer = new Mailer(); api.Parts["mailer"] = mailer;
//      api.Parts["worker"] = (Func<OutboxWorker>)(() => new OutboxWorker(api.Part<Database>("db"),
//          new Resilient(api.Clock, new CircuitBreaker(api.Clock, 99, 1000), 300, 1, 100, () => 0.5), mailer, api.Clock, maxAttempts: 3)); });
var shipping = Platform.Build();
await shipping.Replay("outbox");
var (shippingMailer, shippingDb) = (shipping.Part<Mailer>("mailer"), shipping.Part<Database>("db"));
List<object> Queue() => new DbContext(shippingDb).Set<OutboxMessage>().Select(m => (object)new { m.Id, m.Payload, m.Status, m.Attempts }).ToList();

var before = Queue();
var term = new CancellationTokenSource();
shippingMailer.OnSend = n => { if (n == 3) term.Cancel(); };
await shipping.Deliver(0, term.Token);
var afterShutdown = Queue();
(shippingMailer.OnSend, shippingMailer.Down) = (null, true);
await shipping.Deliver(10_000);
var duringOutage = Queue();
shippingMailer.Down = false;
await shipping.Deliver(20_000);
Board.Show("outboxQueue", new { before, afterShutdown, duringOutage, final = Queue(), calls = shippingMailer.Calls });

${TYPES_DIVIDER}

// ─── ✏️ YOUR TURN ─── 1) the partial DbContext hook Saving(added): add one OutboxMessage { Topic = "booking-confirmed", Payload = booking.Name } per added Booking,
// so it is committed in the same SaveChanges as the booking. 2) OutboxWorker.RunAsync(stop): for each Pending message that is due (NotBefore <= clock.Now),
// stop before starting a new one if stop is requested; send it through the resilient caller; Attempts++; Sent on success; Dead when the failure is permanent or
// Attempts >= maxAttempts; otherwise NotBefore = now + 500 * Attempts; SaveChanges after every message.
partial class DbContext
{
}

class OutboxWorker(Database store, Resilient mailer, Mailer upstream, Clock clock, int maxAttempts)
{
    public Task RunAsync(CancellationToken stop) => throw new NotImplementedException();
}

// Provided: the message row, and the helper that starts a fresh worker at a given time (a process restart) and waits for it to stop.
class OutboxMessage : Entity
{
    public string Topic { get; set; }
    public string Payload { get; set; }
    public string Status { get; set; } = "Pending";
    public int Attempts { get; set; }
    public long NotBefore { get; set; }
}

static class OutboxExtensions
{
    public static async Task Deliver(this Api api, long at, CancellationToken stop = default)
    {
        api.Clock.AdvanceTo(at);
        await api.Part<Func<OutboxWorker>>("worker")().RunAsync(stop);
    }
}`,
      solutionAdd: cs`// 15. outbox and worker
Platform.Add("outbox", Phase.Endpoints, api =>
{
    var mailer = new Mailer();
    api.Parts["mailer"] = mailer;
    api.Parts["worker"] = (Func<OutboxWorker>)(() => new OutboxWorker(api.Part<Database>("db"), new Resilient(api.Clock, new CircuitBreaker(api.Clock, 99, 1000), 300, 1, 100, () => 0.5), mailer, api.Clock, maxAttempts: 3));
});
var shipping = Platform.Build();
await shipping.Replay("outbox");
var (shippingMailer, shippingDb) = (shipping.Part<Mailer>("mailer"), shipping.Part<Database>("db"));
List<object> Queue() => new DbContext(shippingDb).Set<OutboxMessage>().Select(m => (object)new { m.Id, m.Payload, m.Status, m.Attempts }).ToList();

var before = Queue();
var term = new CancellationTokenSource();
shippingMailer.OnSend = n => { if (n == 3) term.Cancel(); };
await shipping.Deliver(0, term.Token);
var afterShutdown = Queue();
(shippingMailer.OnSend, shippingMailer.Down) = (null, true);
await shipping.Deliver(10_000);
var duringOutage = Queue();
shippingMailer.Down = false;
await shipping.Deliver(20_000);
Board.Show("outboxQueue", new { before, afterShutdown, duringOutage, final = Queue(), calls = shippingMailer.Calls });

${TYPES_DIVIDER}
static class OutboxExtensions
{
    public static async Task Deliver(this Api api, long at, CancellationToken stop = default)
    {
        api.Clock.AdvanceTo(at);
        await api.Part<Func<OutboxWorker>>("worker")().RunAsync(stop);
    }
}

class OutboxMessage : Entity
{
    public string Topic { get; set; }
    public string Payload { get; set; }
    public string Status { get; set; } = "Pending";
    public int Attempts { get; set; }
    public long NotBefore { get; set; }
}

// Runs inside SaveChanges, so the message is committed with the booking or not at all.
partial class DbContext
{
    partial void Saving(List<Entity> added)
    {
        foreach (var booking in added.OfType<Booking>()) Add(new OutboxMessage { Topic = "booking-confirmed", Payload = booking.Name });
    }
}

class OutboxWorker(Database store, Resilient mailer, Mailer upstream, Clock clock, int maxAttempts)
{
    // One pass over everything that is due. A real host would call this on a timer or when a new message arrives.
    public async Task RunAsync(CancellationToken stop)
    {
        var unit = new DbContext(store);
        foreach (var message in unit.Set<OutboxMessage>().Where(m => m.Status == "Pending" && m.NotBefore <= clock.Now).ToList())
        {
            if (stop.IsCancellationRequested) return;
            var outcome = await mailer.Run(() => upstream.Send(message.Payload));
            message.Attempts++;
            if (outcome.Result == "ok") message.Status = "Sent";
            else if (outcome.Permanent || message.Attempts >= maxAttempts) message.Status = "Dead";
            else message.NotBefore = clock.Now + 500 * message.Attempts;
            unit.SaveChanges();
        }
    }
}`,
      explanation:
        "Because SaveChanges calls the Saving hook after ids are assigned and before it writes, the OutboxMessage rows are tracked and written in the same commit as the bookings: a booking without its message (or the reverse) cannot exist. The worker loads the messages that are due and handles them one at a time. It checks the stop token only before starting a message, so a message in flight is completed and saved, and a shutdown leaves the rest untouched for the next run. The result of each send decides the next state: Sent, Dead for a permanent failure (a bad address) or too many attempts, or back to Pending with a later NotBefore. Saving after every message makes progress durable, so a crash loses at most the one message being processed (which will be sent again, hence at-least-once delivery).",
      hints: [
        { id: "h1", title: "The hook", content: "partial class DbContext { partial void Saving(List<Entity> added) { foreach (var booking in added.OfType<Booking>()) Add(new OutboxMessage { Topic = \"booking-confirmed\", Payload = booking.Name }); } }  You do not call Saving yourself: lesson 7's SaveChanges does, once the new rows have ids." },
        { id: "h2", title: "The worker loop", content: "var unit = new DbContext(store); foreach (var message in unit.Set<OutboxMessage>().Where(m => m.Status == \"Pending\" && m.NotBefore <= clock.Now).ToList()) { if (stop.IsCancellationRequested) return; var outcome = await mailer.Run(() => upstream.Send(message.Payload)); message.Attempts++; if (outcome.Result == \"ok\") message.Status = \"Sent\"; else if (outcome.Permanent || message.Attempts >= maxAttempts) message.Status = \"Dead\"; else message.NotBefore = clock.Now + 500 * message.Attempts; unit.SaveChanges(); }  Make RunAsync async Task. The ToList() materializes the due messages before the loop starts changing them." },
        { id: "h3", title: "Reading the three snapshots", content: "Run 1: the harness cancels the token while message 3 is being sent. Message 3 finishes and is saved as Sent, then the loop sees the token and stops: messages 4 to 6 are untouched (Pending, 0 attempts). Run 2 (mailer down): the bounce address is a permanent failure and goes Dead after one attempt; messages 5 and 6 get a transient failure, so they stay Pending with Attempts = 1 and a later NotBefore. Run 3 (recovered, later): 5 and 6 are due again and become Sent with Attempts = 2; the dead one stays Dead." },
      ],
      tests: [
        {
          id: "t1",
          description: "the API commits an outbox message together with every booking",
          assertionCode: js`
assert(Array.isArray(scene.outbox) && scene.outboxQueue && scene.outboxQueue.final, "Register the module; the harness sends Board.Show(\"outboxQueue\", ...).");
assert(Array.isArray(scene.outbox), "Replay the section with shipping.Replay(\"outbox\").");
assert(scene.outbox.every((e) => e.status === 201), "all six bookings are created");
const q = scene.outboxQueue;
assert(q && Array.isArray(q.before), "The harness sends Board.Show(\"outboxQueue\", ...).");
assertEqual(q.before.map((m) => m.payload), ["Ana", "Ben", "Cleo", "bounce@nowhere", "Eli", "Fay"], "one message per booking, in order");
assert(q.before.every((m) => m.status === "Pending" && m.attempts === 0), "nothing has been delivered yet");`,
        },
        {
          id: "t2",
          description: "a shutdown signal stops the worker between messages, not in the middle of one",
          assertionCode: js`
assert(Array.isArray(scene.outbox) && scene.outboxQueue && scene.outboxQueue.final, "Register the module; the harness sends Board.Show(\"outboxQueue\", ...).");
const q = scene.outboxQueue;
assertEqual(q.afterShutdown.map((m) => m.status), ["Sent", "Sent", "Sent", "Pending", "Pending", "Pending"], "the message in flight when the token was cancelled still completes");
assertEqual(q.afterShutdown[2].attempts, 1, "message 3 was sent once");
assert(q.afterShutdown.slice(3).every((m) => m.attempts === 0), "the rest were never started");`,
        },
        {
          id: "t3",
          description: "a permanent failure goes straight to the dead-letter state",
          assertionCode: js`
assert(Array.isArray(scene.outbox) && scene.outboxQueue && scene.outboxQueue.final, "Register the module; the harness sends Board.Show(\"outboxQueue\", ...).");
const bounce = scene.outboxQueue.duringOutage[3];
assertEqual([bounce.payload, bounce.status, bounce.attempts], ["bounce@nowhere", "Dead", 1], "an invalid address is not retried");
assertEqual(scene.outboxQueue.final[3].status, "Dead", "and it stays dead");`,
        },
        {
          id: "t4",
          description: "transient failures stay pending, with the attempt counted",
          assertionCode: js`
assert(Array.isArray(scene.outbox) && scene.outboxQueue && scene.outboxQueue.final, "Register the module; the harness sends Board.Show(\"outboxQueue\", ...).");
const [eli, fay] = [scene.outboxQueue.duringOutage[4], scene.outboxQueue.duringOutage[5]];
assertEqual([eli.status, eli.attempts], ["Pending", 1], "Eli during the outage");
assertEqual([fay.status, fay.attempts], ["Pending", 1], "Fay during the outage");`,
        },
        {
          id: "t5",
          description: "after the mailer recovers, the pending messages are delivered",
          assertionCode: js`
assert(Array.isArray(scene.outbox) && scene.outboxQueue && scene.outboxQueue.final, "Register the module; the harness sends Board.Show(\"outboxQueue\", ...).");
const final = scene.outboxQueue.final;
assertEqual(final.map((m) => m.status), ["Sent", "Sent", "Sent", "Dead", "Sent", "Sent"], "final states");
assertEqual([final[4].attempts, final[5].attempts], [2, 2], "second attempt succeeded");`,
        },
        {
          id: "t6",
          description: "retries inside one attempt are counted by the caller, not the queue",
          assertionCode: js`assert(Array.isArray(scene.outbox) && scene.outboxQueue && scene.outboxQueue.final, "Register the module; the harness sends Board.Show(\"outboxQueue\", ...).");
assertEqual(scene.outboxQueue.calls, 10, "3 sends, then 1 + 2 + 2 during the outage (the resilient caller retries once), then 2");`,
        },
      ],
      unlocks: ["ca-outbox"],
      checks: [
        {
          prompt: "Why write the outbox row in the same `SaveChanges` as the booking instead of sending the email right after saving?",
          question: {
            type: "choice",
            options: [
              "A crash between the two steps would lose the email; one commit makes booking and message appear together or not at all",
              "Because email providers require a database transaction",
              "To make the email faster",
              "To avoid serialization",
            ],
            answer: 0,
          },
          explanation: "You cannot make a database commit and an external call atomic. Recording the intent in the database makes the booking and the obligation to notify inseparable, and a worker can always finish the job later.",
        },
        {
          prompt: "A worker marks a message `Sent` only after the provider accepts it, and may crash right after sending. What delivery guarantee does this give?",
          question: { type: "choice", options: ["At least once", "At most once", "Exactly once", "None"], answer: 0 },
          explanation: "A crash between the send and the status update means the next run sends the message again. So the receiver must tolerate duplicates, ideally through an idempotency key such as the outbox message id.",
        },
        {
          prompt: "On shutdown the worker is handed a cancelled token. Where should it check the token?",
          question: {
            type: "choice",
            options: [
              "Before starting each message, never in the middle of one",
              "Inside the provider call, to abort it immediately",
              "Only at the end of the batch",
              "Nowhere: the host kills the process anyway",
            ],
            answer: 0,
          },
          explanation: "Cancellation is cooperative. Checking between units of work lets the current message finish and be saved, so a restart resumes cleanly. Passing the token into the send could abandon it half done.",
        },
      ],
    },
  ],
};
