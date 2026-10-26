import type { Chapter } from "@/engine/types";
import { TYPES_DIVIDER } from "../../../engine/compose.ts";
import { cs, js, md } from "./util.ts";

/**
 * Chapter 5: Shipping with confidence. Roll out features gradually, test through the front door, evolve the API and read a whole day back.
 */

export const chapter5: Chapter = {
  id: "shipping",
  title: "Shipping with confidence",
  blurb: "Roll out features gradually, test through the front door, evolve the API and read a whole day back.",
  lessons: [
    // ───────────────────────── 16 ─────────────────────────
    {
      id: "csharp-api-16-flags",
      title: "Feature flags with a stable rollout",
      minutes: 40,
      xp: 210,
      concepts: ["feature flags", "percentage rollout", "stable hashing", "allow / deny lists", "kill switch", "string.GetHashCode pitfall", "cohorts"],
      learn: md`### Deploying is not releasing

Shipping code and exposing a feature are two different decisions. A **feature flag** keeps code that is already deployed switched off (or on for a few people) until you choose otherwise. That separation buys you four things: you can merge unfinished work safely, release to 1 % of members and watch the dashboards before 100 %, turn something off in a second when it misbehaves (the **kill switch**), and run different experiences for different groups.

A flag is a small rule: *for this member, is feature X on?* The API exposes the answer for the signed-in member (\`GET /me/flags\`) so the web app and the phone app can adapt, and server code can ask the same question before choosing a code path.

### The rollout must be stable

The tempting implementation is \`Random.Shared.Next(100) < percent\`. It is also a bug: refresh the page and the feature flickers on and off, because every request re-rolls the dice. A member must get **the same answer every time**, and as you raise the percentage from 10 to 25, everyone who already had the feature must **keep** it (a *monotonic* rollout). So the decision must be a pure function of the flag and the member:

~~~csharp
bucket = hash("waitlist:" + memberId) % 100      // 0..99, fixed for this member and flag
on = bucket < percent
~~~

Raising \`percent\` only ever adds members whose bucket is in the new range, so the 10 % cohort is contained in the 25 % cohort, which is contained in the 50 % cohort.

### Which hash? Not \`GetHashCode\`

On modern .NET, \`string.GetHashCode()\` is **randomised per process**: the same string hashes differently after a restart and differs between servers, precisely to prevent hash-flooding attacks. A flag built on it would flip for everybody on every deploy and disagree between instances. Use a hash with a *specified* output. We take SHA-256 of \`"<flag>:<memberId>"\`, read the first four bytes as an unsigned integer and take it modulo 100. It is not used for security here, only because it spreads inputs uniformly and is identical everywhere.

### Why the flag name is in the hash

If the bucket depended on the member id alone, the same 10 % of members would be first in line for *every* feature, and your most adventurous cohort would also be the one that sees every bug. Mixing the flag name into the hash gives each flag an **independent** cohort.

### Overrides and precedence

Percentages are blunt. You also need to say "these members, always" and "never these". Define the order once and write it down:

1. an unknown flag is **off** (a typo must not enable anything);
2. **deny list** wins: a member on it never gets the feature, whatever the percentage;
3. **allow list** next: staff and beta testers get it regardless;
4. otherwise the **percentage** decides.

A kill switch is just \`percent = 0\` with the allow list emptied.

### Housekeeping

- Flags are **temporary**. Once a feature is at 100 % and stable, delete the flag and the dead branch. Old flags are untested code paths waiting to hurt.
- **Test both branches.** The off path is the one you will rely on in an emergency.
- Do not use flags for **security**; authorization (lesson 8) is a different mechanism with different guarantees.
- Evaluate flags **once per request** where you can, and log which variant a request saw: when something breaks, you need to know whether the flag was involved.
- Where the rules come from matters in production (a config service, cached and refreshed). Ours are hard-coded in a module so the lesson stays deterministic.

### Common mistakes

- Random per request.
- \`GetHashCode()\` for bucketing.
- The same cohort for every flag.
- Letting the allow list beat the deny list so a banned member can regain access.
- Flags that are never removed.`,
      mission: md`The product team wants a **waitlist** for full sessions, but not for everyone on day one: 20 % of members first, then more as support confirms nothing is on fire. They also want a new pricing screen that must never show for member 3 (a corporate account with a contract), and a beta map that only staff member 11 can see.

You will write the flag evaluator and expose the answers at \`GET /me/flags\`. The harness measures the rollout curve over a thousand synthetic members, checks that growing the percentage never removes anyone, and asks the live API what five different members see. When this lesson passes, the **Feature flags** panel lights up.`,
      tasks: [
        "Write Flags.Bucket(name, memberId): SHA-256 of \"<name>:<memberId>\" as UTF-8 bytes, the first four bytes read as a little-endian unsigned integer (BitConverter.ToUInt32), modulo 100",
        "Write Flags.IsOn(name, memberId): an unknown flag is off; the deny list wins; then the allow list; otherwise the member is in when Bucket(...) < Percent",
        "Register the \"flags\" module from the starter comment (the Flags instance as a singleton service and GET /me/flags requiring the member policy) and run the harness",
      ],
      starterAdd: cs`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 16. Roll features out gradually. Register the module; the harness measures the rollout and asks the API what each member sees.
//  Platform.Add("flags", Phase.Endpoints, api => {
//      var flags = new Flags([new Flag("waitlist", 20), new Flag("new-pricing", 60, Deny: [3]), new Flag("beta-map", 0, Allow: [11]), new Flag("dark-mode", 0)]);
//      api.Services.Add(Lifetime.Singleton, _ => flags);
//      api.App.MapGet("/me/flags", (ICurrentUser user, Flags flags) => flags.Definitions.ToDictionary(f => f.Name, f => flags.IsOn(f.Name, user.MemberId))).With(new Authorize("member")); });
var steps = new[] { 10, 25, 50, 100 }.Select(percent => (percent, on: Enumerable.Range(1, 1000).Where(id => new Flags([new Flag("waitlist", percent)]).IsOn("waitlist", id)).ToList())).ToList();
Board.Show("rollout", new { steps = steps.Select(s => new { s.percent, on = s.on.Count }), stable = steps.Zip(steps.Skip(1), (a, b) => !a.on.Except(b.on).Any()).All(ok => ok) });
await Platform.Build().Replay("flags");

${TYPES_DIVIDER}

// ─── ✏️ YOUR TURN ─── Flags.IsOn(name, memberId): unknown flag is off; Deny wins, then Allow, then the percentage.
// Bucket(name, memberId) = first 4 bytes (little-endian uint) of SHA-256("<name>:<memberId>"), modulo 100; on when Bucket < Percent.
record Flag(string Name, int Percent, int[] Allow = null, int[] Deny = null);

class Flags(IEnumerable<Flag> definitions)
{
    public List<Flag> Definitions { get; } = definitions.ToList();
    public bool IsOn(string name, int memberId) => throw new NotImplementedException();
    public static int Bucket(string name, int memberId) => throw new NotImplementedException();
}`,
      solutionAdd: cs`// 16. feature flags
Platform.Add("flags", Phase.Endpoints, api =>
{
    var flags = new Flags([new Flag("waitlist", 20), new Flag("new-pricing", 60, Deny: [3]), new Flag("beta-map", 0, Allow: [11]), new Flag("dark-mode", 0)]);
    api.Services.Add(Lifetime.Singleton, _ => flags);
    api.App.MapGet("/me/flags", (ICurrentUser user, Flags flags) => flags.Definitions.ToDictionary(f => f.Name, f => flags.IsOn(f.Name, user.MemberId))).With(new Authorize("member"));
});
var steps = new[] { 10, 25, 50, 100 }.Select(percent => (percent, on: Enumerable.Range(1, 1000).Where(id => new Flags([new Flag("waitlist", percent)]).IsOn("waitlist", id)).ToList())).ToList();
Board.Show("rollout", new { steps = steps.Select(s => new { s.percent, on = s.on.Count }), stable = steps.Zip(steps.Skip(1), (a, b) => !a.on.Except(b.on).Any()).All(ok => ok) });
await Platform.Build().Replay("flags");

${TYPES_DIVIDER}
record Flag(string Name, int Percent, int[] Allow = null, int[] Deny = null);

class Flags(IEnumerable<Flag> definitions)
{
    public List<Flag> Definitions { get; } = definitions.ToList();

    public bool IsOn(string name, int memberId)
    {
        var flag = Definitions.FirstOrDefault(f => f.Name == name);
        if (flag == null || flag.Deny?.Contains(memberId) == true) return false;
        return flag.Allow?.Contains(memberId) == true || Bucket(name, memberId) < flag.Percent;
    }

    public static int Bucket(string name, int memberId) => (int)(BitConverter.ToUInt32(SHA256.HashData(Encoding.UTF8.GetBytes($"{name}:{memberId}"))) % 100);
}`,
      explanation:
        "Bucket turns (flag, member) into a number from 0 to 99 that never changes: a SHA-256 of the flag name and member id, its first four bytes as an unsigned integer, modulo 100. IsOn applies the rules in a fixed order: unknown flag off, deny list, allow list, then Bucket < Percent. Because the bucket depends only on the flag and the member, raising the percentage only adds members (the harness checks that each cohort is contained in the next), and because the flag name is part of the hash, different flags give different cohorts. The /me/flags endpoint asks the singleton Flags for every definition using the signed-in member's id from ICurrentUser.",
      hints: [
        { id: "h1", title: "Bucket", content: "public static int Bucket(string name, int memberId) => (int)(BitConverter.ToUInt32(SHA256.HashData(Encoding.UTF8.GetBytes($\"{name}:{memberId}\"))) % 100);  BitConverter.ToUInt32(byte[]) reads the first four bytes (little-endian on x86/ARM64, which is what every .NET host uses)." },
        { id: "h2", title: "IsOn", content: "var flag = Definitions.FirstOrDefault(f => f.Name == name); if (flag == null || flag.Deny?.Contains(memberId) == true) return false; return flag.Allow?.Contains(memberId) == true || Bucket(name, memberId) < flag.Percent;" },
        { id: "h3", title: "The module", content: "Phase.Endpoints is fine. The handler takes (ICurrentUser user, Flags flags): the binder resolves both from the request's scope, so Flags must be registered: api.Services.Add(Lifetime.Singleton, _ => flags). Return flags.Definitions.ToDictionary(f => f.Name, f => flags.IsOn(f.Name, user.MemberId)). Add .With(new Authorize(\"member\")) because /me is not under the /bookings prefix that lesson 8 protected." },
      ],
      tests: [
        {
          id: "t1",
          description: "the rollout percentage is reflected across a thousand members",
          assertionCode: js`
assert(scene.rollout && Array.isArray(scene.rollout.steps) && Array.isArray(scene.flags) && scene.flags.length >= 6, "Register the module; the harness sends the rollout and replays \"flags\".");
assert(scene.rollout && Array.isArray(scene.rollout.steps), "The harness sends Board.Show(\"rollout\", ...).");
const on = scene.rollout.steps.map((s) => s.on);
assert(on[0] >= 60 && on[0] <= 140, "10% of 1000 should be about 100, got " + on[0]);
assert(on[1] >= 200 && on[1] <= 300, "25% of 1000 should be about 250, got " + on[1]);
assert(on[2] >= 440 && on[2] <= 560, "50% of 1000 should be about 500, got " + on[2]);
assertEqual(on[3], 1000, "100% means everyone");`,
        },
        {
          id: "t2",
          description: "raising the percentage never removes a member who already had the feature",
          assertionCode: js`assert(scene.rollout && Array.isArray(scene.rollout.steps) && Array.isArray(scene.flags) && scene.flags.length >= 6, "Register the module; the harness sends the rollout and replays \"flags\".");
assertEqual(scene.rollout.stable, true, "the 10% cohort must be inside the 25% cohort, which must be inside the 50% cohort, ...");`,
        },
        {
          id: "t3",
          description: "the same member gets the same answer, and the flag name decides the cohort",
          assertionCode: js`
assert(scene.rollout && Array.isArray(scene.rollout.steps) && Array.isArray(scene.flags) && scene.flags.length >= 6, "Register the module; the harness sends the rollout and replays \"flags\".");
assert(Array.isArray(scene.flags), "Replay the section with Platform.Build().Replay(\"flags\").");
const body = (i) => JSON.parse(scene.flags[i].body);
assertEqual(body(0).waitlist, true, "member 3 (mika) is inside the 20% waitlist cohort");
assertEqual(body(1).waitlist, true, "member 4 (noor)");
assertEqual(body(2).waitlist, false, "member 5 (tomas) is outside it");
assertEqual(body(4)["new-pricing"], true, "member 1 (ola) is inside the 60% pricing cohort");`,
        },
        {
          id: "t4",
          description: "the deny list beats the percentage",
          assertionCode: js`
assert(scene.rollout && Array.isArray(scene.rollout.steps) && Array.isArray(scene.flags) && scene.flags.length >= 6, "Register the module; the harness sends the rollout and replays \"flags\".");
const mika = JSON.parse(scene.flags[0].body);
assertEqual(mika["new-pricing"], false, "member 3 is denied new-pricing even though a 60% flag would include their bucket");
const noor = JSON.parse(scene.flags[1].body);
assertEqual(noor["new-pricing"], true, "while member 4 gets it");`,
        },
        {
          id: "t5",
          description: "the allow list works even at 0 percent",
          assertionCode: js`
assert(scene.rollout && Array.isArray(scene.rollout.steps) && Array.isArray(scene.flags) && scene.flags.length >= 6, "Register the module; the harness sends the rollout and replays \"flags\".");
const ravi = JSON.parse(scene.flags[3].body);
assertEqual(ravi["beta-map"], true, "member 11 is on the beta-map allow list");
assertEqual(JSON.parse(scene.flags[0].body)["beta-map"], false, "nobody else is");`,
        },
        {
          id: "t6",
          description: "0 percent is a kill switch",
          assertionCode: js`assert(scene.rollout && Array.isArray(scene.rollout.steps) && Array.isArray(scene.flags) && scene.flags.length >= 6, "Register the module; the harness sends the rollout and replays \"flags\".");
assert(scene.flags.slice(0, 5).every((e) => JSON.parse(e.body)["dark-mode"] === false), "dark-mode is at 0%, so it is off for every member");`,
        },
        {
          id: "t7",
          description: "anonymous callers cannot read /me/flags",
          assertionCode: js`assert(scene.rollout && Array.isArray(scene.rollout.steps) && Array.isArray(scene.flags) && scene.flags.length >= 6, "Register the module; the harness sends the rollout and replays \"flags\".");
assertEqual(scene.flags[5].status, 401, "GET /me/flags without a token");`,
        },
      ],
      unlocks: ["ca-flags"],
      checks: [
        {
          prompt: "Why must a percentage rollout not use `Random.Shared.Next(100) < percent` per request?",
          question: {
            type: "choice",
            options: [
              "The same member would see the feature flicker on and off between requests",
              "Random is too slow",
              "It cannot produce numbers below 100",
              "It makes the percentage inexact on average",
            ],
            answer: 0,
          },
          explanation: "Each request would re-roll. A member must get a stable answer, so the decision has to be a pure function of the flag and the member.",
        },
        {
          prompt: "What is wrong with bucketing members by `memberId.GetHashCode()` or `(\"waitlist:\" + id).GetHashCode()`?",
          question: {
            type: "choice",
            options: [
              "String hash codes are randomised per process, so answers change on restart and differ between servers",
              "GetHashCode is always 0 for ints",
              "It cannot be taken modulo 100",
              "It is too slow for a web request",
            ],
            answer: 0,
          },
          explanation: "On modern .NET `string.GetHashCode()` uses a per-process random seed. A flag built on it would silently re-shuffle every cohort on each deploy and disagree between instances. Use a hash with a specified output.",
        },
        {
          prompt: "A member is on a flag's deny list *and* its allow list. What should the evaluator do?",
          question: { type: "choice", options: ["Treat the flag as off: deny wins", "Treat the flag as on: allow wins", "Throw an exception", "Fall back to the percentage"], answer: 0 },
          explanation: "A precedence rule is only useful if it is written down and the safe side wins. Deny is the safer default: removing access is the cautious mistake, granting it is the risky one.",
        },
      ],
    },
    // ───────────────────────── 17 ─────────────────────────
    {
      id: "csharp-api-17-testing",
      title: "Testing the API through the front door",
      minutes: 50,
      xp: 270,
      concepts: ["in-process integration tests", "fresh composition per test", "arrange-act-assert", "assertions with messages", "deterministic time", "testing failure paths"],
      learn: md`### What to test, and how

Unit tests check a class in isolation; they are fast and precise but say little about whether the pieces fit together. End-to-end tests drive a deployed system; they say a lot and are slow and brittle. For an API, the best value sits between: **in-process request tests**. You build the *whole* application in memory, send it a real request object, and assert on the real response. No network, no ports, no browser, and yet routing, middleware, binding, validation, authorization, the unit of work and error handling all run for real. A bug in how two lessons connect shows up here and nowhere else.

You already have what makes this cheap. Because the platform is built from modules, \`Platform.Build()\` returns a complete, independent application in a few microseconds. That is a **composition root** you can call from a test. Because time is injected, nothing sleeps. And \`App.Handle(request)\` is the front door.

### One platform per test

Each test must start from a known world. Build a fresh platform for every test:

~~~csharp
foreach (var (name, body) in tests)
{
    try { await body(Platform.Build()); /* passed */ }
    catch (AssertionException e) { /* failed: show the message */ }
    catch (Exception e) { /* broke: show the type and message */ }
}
~~~

Shared state between tests is the root of flaky suites: test B passes only because test A ran first, or fails because A left a booking behind. A fresh \`Platform.Build()\` means "booking 1" is *always* the first booking of this test, so assertions can be exact.

### Arrange, act, assert

Every test has three beats. **Arrange**: get the system into the state under test (book a slot as Mika). **Act**: do the one thing being tested (Noor requests Mika's booking). **Assert**: check the observable outcome (the answer is 404). Keep each test focused on one behaviour and name it as a sentence describing that behaviour: \`"nobody reads someone else's booking"\` reads as documentation, and a red test then tells you exactly which promise broke.

### Assert on behaviour, not internals

Assert on what a client can see: status, headers, body, and (where the point is a side effect) the stored data. Do not reach into private fields. If you can only prove the behaviour by peeking inside, the behaviour is probably not well defined yet.

Good failure messages matter. \`Assert.Equal(409, res.Status, "second booking")\` should fail as \`second booking: expected 409, got 201\`. A bare \`false\` forces the reader to open the test and guess.

### Test the unhappy paths as hard as the happy one

Production incidents live in the failure paths: an expired token, a double submit, a stale version, a full slot, a body with the wrong shape. Each earlier lesson added such a path; a test per path is how they stay true when someone changes the pipeline order or a middleware next quarter. Notice that these tests would have caught real bugs from this course: swap two middleware phases and the right test fails immediately.

### Determinism

- Time comes from the platform's \`Clock\`. A test that needs "an hour later" calls \`api.Clock.Advance\`; it never sleeps.
- No randomness without a seed or an injected source.
- No shared static state. (A static list that all tests append to is the same bug as a shared database.)

### Writing the tiny framework

Real frameworks (xUnit, NUnit, MSTest) do exactly this, plus discovery, parallelism and reporting. Yours is about twenty lines, and writing it once demystifies them: a list of named bodies, a loop, a try/catch that separates *the assertion failed* from *the test crashed*, and a result record. The harness also feeds your runner two deliberately broken tests to prove it reports failures and exceptions instead of crashing itself.

### Common mistakes

- Reusing one application across tests.
- Asserting only on the status code and never on the body or headers.
- Tests that depend on the order they run in.
- Catching all exceptions and reporting every failure the same way, losing the difference between a failed assertion and a crash.
- Using \`Thread.Sleep\` to "wait for" time.`,
      mission: md`Three of last month's production bugs shipped because someone reordered the middleware and nothing failed. The team has plenty of unit tests for individual classes and none that sends a request through the whole stack. The new rule is that every behaviour a client can see has a test that proves it.

You will write a tiny test framework and a first suite of five in-process request tests that cover booking, capacity, ownership, retries and validation. The harness also runs two deliberately broken tests through your runner to check that failures and crashes are reported rather than thrown. When this lesson passes, the **Test results** panel lights up.`,
      tasks: [
        "Write Assert.Equal<T>(expected, actual, what) (throw AssertionException \"<what>: expected <expected>, got <actual>\" when they differ) and Assert.True(condition, what)",
        "Write Tests.Run(params (string Name, Func<Api, Task> Body)[]): for every test build a fresh Platform.Build(), run the body, and record a TestResult: passed, or the AssertionException message, or \"<ExceptionType>: <message>\" for any other exception; print PASS or FAIL plus the name to the console",
        "Write Tests.Send(api, method, path, who, body, headers): build one request line in the recorded format (arrival time = api.Clock.Now; an Authorization: Bearer token issued by the platform's TokenService for the named member: mika = 3, noor = 4, ravi = staff 11) and return api.App.Handle(Request.Parse(line))",
        "Write at least five tests in the Tests.Run call from the starter comment and make them pass",
      ],
      starterAdd: cs`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 17. Test the API through its front door, each test against a freshly built platform. Write at least five tests inside Tests.Run, e.g.
//  "a member can book a slot" (201 + Location), "a full slot answers 409", "nobody reads someone else's booking" (404 for noor, 200 for ravi),
//  "a retried POST books once" (same Idempotency-Key twice, one row in the database), "bad input is a 422 problem that names the field".
// api.Send(method, path, who, body, headers...) sends one request as "mika" (member 3), "noor" (4), "ravi" (staff) or anonymously (who = null).
const string Climb = """{"slotId":21,"climbers":1,"name":"Mika"}""";
var results = await Tests.Run(
    // ("a member can book a slot", async api => { ... }),
);
Board.Show("tests", results);
Board.Show("testProof", await Tests.Run(("fails on purpose", api => { Assert.Equal(1, 2, "arithmetic"); return Task.CompletedTask; }), ("throws unexpectedly", api => throw new InvalidOperationException("boom"))));

${TYPES_DIVIDER}

// ─── ✏️ YOUR TURN ─── Assert.Equal / Assert.True throw AssertionException("<what>: expected <x>, got <y>"). Tests.Run builds Platform.Build() for every test,
// records TestResult(name, passed, failure) (an AssertionException message, or "<ExceptionType>: <message>" for anything else) and prints PASS/FAIL lines.
// Send turns its arguments into a recorded-format line (arrival time = the platform clock, Authorization: Bearer <token> for a named member) and handles it.
class AssertionException(string message) : Exception(message);
record TestResult(string Name, bool Passed, string Failure);

static class Assert
{
    public static void Equal<T>(T expected, T actual, string what) => throw new NotImplementedException();
    public static void True(bool condition, string what) => throw new NotImplementedException();
}

static class Tests
{
    public static Task<List<TestResult>> Run(params (string Name, Func<Api, Task> Body)[] tests) => throw new NotImplementedException();
    public static Task<Response> Send(this Api api, string method, string path, string who = null, string body = "", params string[] headers) => throw new NotImplementedException();
}`,
      solutionAdd: cs`// 17. testing the API
const string Climb = """{"slotId":21,"climbers":1,"name":"Mika"}""";
var results = await Tests.Run(
    ("a member can book a slot", async api =>
    {
        var res = await api.Send("POST", "/bookings", "mika", Climb);
        Assert.Equal(201, res.Status, "status");
        Assert.True(res.Headers["Location"].StartsWith("/bookings/"), "Location points at the new booking");
    }),
    ("a full slot answers 409", async api =>
    {
        await api.Send("POST", "/bookings", "mika", """{"slotId":21,"climbers":6,"name":"Mika"}""");
        Assert.Equal(409, (await api.Send("POST", "/bookings", "noor", Climb)).Status, "status");
    }),
    ("nobody reads someone else's booking", async api =>
    {
        await api.Send("POST", "/bookings", "mika", Climb);
        Assert.Equal(404, (await api.Send("GET", "/bookings/1", "noor")).Status, "another member");
        Assert.Equal(200, (await api.Send("GET", "/bookings/1", "ravi")).Status, "staff");
    }),
    ("a retried POST books once", async api =>
    {
        var first = await api.Send("POST", "/bookings", "mika", Climb, "Idempotency-Key: k-1");
        var again = await api.Send("POST", "/bookings", "mika", Climb, "Idempotency-Key: k-1");
        Assert.Equal(first.Body, again.Body, "same answer");
        Assert.Equal(1, new DbContext(api.Part<Database>("db")).Set<Booking>().Count(), "bookings stored");
    }),
    ("bad input is a 422 problem that names the field", async api =>
    {
        var res = await api.Send("POST", "/bookings", "mika", """{"slotId":21,"climbers":0,"name":"Mika"}""");
        Assert.Equal(422, res.Status, "status");
        Assert.True(res.Body.Contains("climbers"), "the problem names the field");
    }));
Board.Show("tests", results);
Board.Show("testProof", await Tests.Run(("fails on purpose", api => { Assert.Equal(1, 2, "arithmetic"); return Task.CompletedTask; }), ("throws unexpectedly", api => throw new InvalidOperationException("boom"))));

${TYPES_DIVIDER}
class AssertionException(string message) : Exception(message);
record TestResult(string Name, bool Passed, string Failure);

static class Assert
{
    public static void Equal<T>(T expected, T actual, string what) { if (!EqualityComparer<T>.Default.Equals(expected, actual)) throw new AssertionException($"{what}: expected {expected}, got {actual}"); }
    public static void True(bool condition, string what) { if (!condition) throw new AssertionException(what); }
}

static class Tests
{
    public static async Task<List<TestResult>> Run(params (string Name, Func<Api, Task> Body)[] tests)
    {
        var results = new List<TestResult>();
        foreach (var (name, body) in tests)
        {
            try { await body(Platform.Build()); results.Add(new(name, true, null)); }
            catch (Exception e) { results.Add(new(name, false, e is AssertionException ? e.Message : e.GetType().Name + ": " + e.Message)); }
            Console.WriteLine($"{(results[^1].Passed ? "PASS" : "FAIL")}  {name}");
        }
        return results;
    }

    // Sends one request in-process as a named member (mika, noor, ravi = staff), or anonymously.
    public static Task<Response> Send(this Api api, string method, string path, string who = null, string body = "", params string[] headers)
    {
        var all = headers.ToList();
        if (who != null) all.Add("Authorization: Bearer " + api.Part<TokenService>("tokens").Issue(new Principal(who switch { "mika" => 3, "noor" => 4, _ => 11 }, who == "ravi" ? "staff" : "member", 9_000_000)));
        return api.App.Handle(Request.Parse($"{api.Clock.Now} {method} {path}" + (all.Count > 0 ? " | " + string.Join("; ", all) : "") + (body != "" ? " | " + body : "")));
    }
}`,
      explanation:
        "Tests.Run builds a brand new platform for every test body, so each test starts with an empty database, a fresh rate limiter and an idempotency ledger that has never seen a key: booking 1 is always its own first booking. Assertions throw a dedicated exception with a message that names what was checked; the runner reports that message for a failed assertion and \"Type: message\" for anything else, so a crash can never be mistaken for a clean failure. Send builds a line in the recorded format and passes it through Request.Parse and App.Handle, so tests use exactly the code path the traffic replay does. The five tests each pin one promise from an earlier lesson: creation with a Location header, the capacity conflict, ownership, the idempotent retry and the validation problem.",
      hints: [
        { id: "h1", title: "Assertions and the runner", content: "Equal: if (!EqualityComparer<T>.Default.Equals(expected, actual)) throw new AssertionException($\"{what}: expected {expected}, got {actual}\"); Tests.Run: var results = new List<TestResult>(); foreach (var (name, body) in tests) { try { await body(Platform.Build()); results.Add(new(name, true, null)); } catch (Exception e) { results.Add(new(name, false, e is AssertionException ? e.Message : e.GetType().Name + \": \" + e.Message)); } Console.WriteLine($\"{(results[^1].Passed ? \"PASS\" : \"FAIL\")}  {name}\"); } return results;  Declare Run as async Task<List<TestResult>>." },
        { id: "h2", title: "Send", content: "var all = headers.ToList(); if (who != null) all.Add(\"Authorization: Bearer \" + api.Part<TokenService>(\"tokens\").Issue(new Principal(who switch { \"mika\" => 3, \"noor\" => 4, _ => 11 }, who == \"ravi\" ? \"staff\" : \"member\", 9_000_000))); return api.App.Handle(Request.Parse($\"{api.Clock.Now} {method} {path}\" + (all.Count > 0 ? \" | \" + string.Join(\"; \", all) : \"\") + (body != \"\" ? \" | \" + body : \"\"))); The recorded format puts headers (separated by \\\"; \\\") in the second part and the JSON body in the third." },
        { id: "h3", title: "The five tests", content: "1) POST /bookings as mika with Climb -> Assert.Equal(201, res.Status, ...) and res.Headers[\"Location\"].StartsWith(\"/bookings/\"). 2) mika books 6 climbers of slot 21, then noor books 1 -> 409. 3) mika books, noor GETs /bookings/1 -> 404, ravi -> 200. 4) POST twice with \"Idempotency-Key: k-1\" as extra header: the two bodies are equal and new DbContext(api.Part<Database>(\"db\")).Set<Booking>().Count() is 1. 5) POST climbers 0 -> 422 and the body contains \"climbers\". Each test gets its own fresh platform, so booking ids restart at 1." },
      ],
      tests: [
        {
          id: "t1",
          description: "your suite has at least five tests and each one has a name",
          assertionCode: js`
assert(Array.isArray(scene.tests) && Array.isArray(scene.testProof) && scene.testProof.length === 2, "Send the results with Board.Show(\"tests\", results); the harness sends testProof.");
assert(Array.isArray(scene.tests), "Send the results with Board.Show(\"tests\", results).");
assert(scene.tests.length >= 5, "write at least five tests, found " + scene.tests.length);
assert(scene.tests.every((t) => typeof t.name === "string" && t.name.trim().length >= 8), "name every test with a sentence that says what the API promises");`,
        },
        {
          id: "t2",
          description: "every test in your suite passes",
          assertionCode: js`
assert(Array.isArray(scene.tests) && Array.isArray(scene.testProof) && scene.testProof.length === 2, "Send the results with Board.Show(\"tests\", results); the harness sends testProof.");
const failed = scene.tests.filter((t) => !t.passed);
assertEqual(failed.map((t) => t.name + ": " + t.failure), [], "failing tests");`,
        },
        {
          id: "t3",
          description: "the runner prints PASS or FAIL for each test",
          assertionCode: js`
assert(Array.isArray(scene.tests) && Array.isArray(scene.testProof) && scene.testProof.length === 2, "Send the results with Board.Show(\"tests\", results); the harness sends testProof.");
assert(lines.filter((l) => l.startsWith("PASS")).length >= 5, "print a line starting with PASS for every passing test");
assertEqual(lines.filter((l) => l.startsWith("FAIL")).length, 2, "only the two deliberately broken harness tests may print FAIL");`,
        },
        {
          id: "t4",
          description: "a failed assertion is reported with what was expected and what happened",
          assertionCode: js`
assert(Array.isArray(scene.tests) && Array.isArray(scene.testProof) && scene.testProof.length === 2, "Send the results with Board.Show(\"tests\", results); the harness sends testProof.");
assert(Array.isArray(scene.testProof) && scene.testProof.length === 2, "the harness runs two broken tests through your runner and sends Board.Show(\"testProof\", ...).");
const [failed] = scene.testProof;
assertEqual(failed.passed, false, "the broken test must be reported as failed, not thrown");
assert(/arithmetic/.test(failed.failure) && /1/.test(failed.failure) && /2/.test(failed.failure), "the failure message should name what was checked and show expected 1 and actual 2, got: " + failed.failure);`,
        },
        {
          id: "t5",
          description: "an unexpected exception is a failure that names its type",
          assertionCode: js`
assert(Array.isArray(scene.tests) && Array.isArray(scene.testProof) && scene.testProof.length === 2, "Send the results with Board.Show(\"tests\", results); the harness sends testProof.");
const crashed = scene.testProof[1];
assertEqual(crashed.passed, false, "the throwing test must be reported as failed");
assert(/InvalidOperationException/.test(crashed.failure) && /boom/.test(crashed.failure), "a crash is reported as <ExceptionType>: <message>, got: " + crashed.failure);`,
        },
      ],
      unlocks: ["ca-tests"],
      checks: [
        {
          prompt: "Why does `Tests.Run` build a new `Platform` for every test instead of one for the whole suite?",
          question: {
            type: "choice",
            options: [
              "So no test can depend on, or be broken by, state another test left behind",
              "Because a platform can only handle one request",
              "To make the suite slower on purpose",
              "Because the database is read-only",
            ],
            answer: 0,
          },
          explanation: "Shared state makes suites order-dependent and flaky. A fresh composition per test makes every test start from the same empty world, so assertions about ids, counts and limits are exact.",
        },
        {
          prompt: "Which assertion style makes a failing test the most useful to whoever has to fix it?",
          question: {
            type: "choice",
            options: [
              "Assert.Equal(409, res.Status, \"second booking of a full slot\") reporting what was expected and what happened",
              "Assert.True(res.Status == 409, \"failed\")",
              "A try/catch that ignores the result",
              "Printing the response and reading it by eye",
            ],
            answer: 0,
          },
          explanation: "A message that names the behaviour plus expected and actual values tells the reader what broke before they open the test.",
        },
        {
          prompt: "Your test needs \"two minutes later\" to check that an idempotency key has expired. What should it do?",
          question: {
            type: "choice",
            options: [
              "Advance the platform's injected Clock by two minutes",
              "Thread.Sleep for two minutes",
              "Skip the test",
              "Change the system clock of the machine",
            ],
            answer: 0,
          },
          explanation: "Time is an input. With an injected clock the test moves time forward instantly and deterministically; sleeping makes the suite slow and still racy.",
        },
      ],
    },
    // ───────────────────────── 18 ─────────────────────────
    {
      id: "csharp-api-18-versions",
      title: "Versioning and pagination",
      minutes: 40,
      xp: 220,
      concepts: ["API versioning", "path versions", "breaking vs additive changes", "pagination", "stable ordering", "clamping page size", "next links"],
      learn: md`### An API is a promise

Once a mobile app is in people's pockets you cannot update it on demand, so every response shape you have shipped is a promise that lasts as long as the oldest installed app. Evolving the API without breaking that promise is a design skill of its own.

**Additive changes are safe**: a new optional field in a response, a new endpoint, a new optional query parameter. Well-written clients ignore what they do not understand. **Breaking changes are not**: removing or renaming a field, changing a type, tightening validation, changing the meaning of a status code, or (as we do here) changing the *envelope* of a list from a bare array to an object with items and paging information. When you must break, you version.

### Ways to version

- **In the path**: \`/v2/slots\`. Obvious, easy to route, easy to cache and to log. The version is part of the URL, so every client picks it consciously. (This is what we build.)
- **In a header or media type**: \`Accept: application/vnd.crux.v2+json\`. Keeps URLs clean, but is invisible in logs and easy to forget in tests, and (in our design) routing has already happened before middleware could read it.
- **In a query parameter**: \`?api-version=2\`. Simple, but pollutes every URL and cache key.

Whichever you choose, the discipline matters more: keep old versions working for a **published period**, announce retirement with response headers (\`Deprecation\`, \`Sunset\`, and a \`Link\` to the successor), measure who still calls the old version, and only then remove it. Do not version the whole API for one change; version the resource that changed, and keep the old code path a thin adapter over the same domain logic.

### Why pagination exists

\`GET /v2/slots\` for a chain with thousands of sessions cannot return everything: it is slow, huge, and the client only shows twenty rows anyway. So list endpoints return a **page** plus information about where to go next. The envelope for v2:

~~~json
{ "items": [...], "pageNumber": 2, "pageSize": 2, "total": 5, "next": "/v2/slots?page=3&pageSize=2" }
~~~

Clients follow \`next\` until it is \`null\`; they never build page URLs themselves, so you can change the scheme later.

### The rules that make pages trustworthy

1. **Stable ordering.** A page is a slice of an *ordered* list. If the order is not deterministic (two slots with the same time swap places between calls) a client paging through sees duplicates and gaps. Always end the sort with a unique tiebreaker such as the id: \`OrderBy(day).ThenBy(time).ThenBy(id)\`.
2. **Clamp the inputs.** \`pageSize=1000000\` is an attack on your memory; \`page=0\` or negative is a typo. Clamp page to at least 1 and page size to a maximum (50), and pick a sensible default. Clamp rather than reject for recoverable mistakes, but still reject values that cannot be parsed at all (\`page=x\` is a 400 from the binder).
3. **Report the total** so the UI can show "page 2 of 3", and make \`next\` null on the last page so clients know when to stop.
4. **Carry the filters in the link.** If the request had \`gymId=1\`, the next link must too, or page 2 silently switches to a different list.

### Offset versus cursor

Page numbers (offset pagination) are simple, and what we build, but they have a known flaw: if rows are inserted while a client is paging, items shift between pages and are seen twice or missed. **Cursor (keyset) pagination** ("give me the 20 items after id 4711") is stable under inserts and fast on large tables because the database seeks instead of skipping. Use offsets for small, mostly static lists and cursors for big, busy ones.

### Common mistakes

- Paging an unordered collection.
- No upper limit on page size.
- Next links that drop the filters.
- Breaking a v1 response "because nobody uses that field".
- Versioning everything instead of the thing that changed.`,
      mission: md`The mobile team wants the slot list to come with paging, and the web team wants totals for a progress indicator. Both mean changing the shape of the response from a plain array, which would break every installed copy of the old app.

You will leave \`/gyms/{id}/slots\` exactly as it is and add **\`/v2/slots\`**: a stable-ordered, filterable, pageable list with an envelope and next links. The recording replays eight requests: the old v1 list, pages one to three, an absurd page size, a filtered page, a page number of zero and a page number that is not a number. When this lesson passes, the **Versions & paging** panel lights up.`,
      tasks: [
        "Write Page<T> (Items, PageNumber, PageSize, Total, Next) and PagingExtensions.Paged: clamp page to at least 1 and pageSize to 1..50, take the slice, and make Next null on the last page",
        "Write SlotsV2Controller at v2/slots with List(int? gymId = null, int page = 1, int pageSize = 3): filter by gym, order by Day, Time, Id, and build the next link as /v2/slots?page=<n>&pageSize=<size> plus &gymId=<id> when filtering",
        "Register the \"v2\" module from the starter comment and run the harness",
      ],
      starterAdd: cs`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 18. Add a v2 slot list with pages. Register the module; the harness replays "versions" (v1 gym slots, then v2 pages).
//  Platform.Add("v2", Phase.Endpoints, api => api.App.MapControllers(typeof(SlotsV2Controller)));
await Platform.Build().Replay("versions");

${TYPES_DIVIDER}

// ─── ✏️ YOUR TURN ─── Page<T>, Paged(page, pageSize, link): page >= 1, pageSize clamped to 1..50, Next is null on the last page.
// SlotsV2Controller at /v2/slots: List(int? gymId = null, int page = 1, int pageSize = 3), ordered by Day, Time, Id, with a stable Next link
// that repeats pageSize and gymId.
record Page<T>(List<T> Items, int PageNumber, int PageSize, int Total, string Next);

static class PagingExtensions
{
    public static Page<T> Paged<T>(this IEnumerable<T> source, int page, int pageSize, Func<int, int, string> link) => throw new NotImplementedException();
}

[Route("v2/slots")]
class SlotsV2Controller(Catalog catalog)
{
}`,
      solutionAdd: cs`// 18. versions and pagination
Platform.Add("v2", Phase.Endpoints, api => api.App.MapControllers(typeof(SlotsV2Controller)));
await Platform.Build().Replay("versions");

${TYPES_DIVIDER}
record Page<T>(List<T> Items, int PageNumber, int PageSize, int Total, string Next);

static class PagingExtensions
{
    public static Page<T> Paged<T>(this IEnumerable<T> source, int page, int pageSize, Func<int, int, string> link)
    {
        (page, pageSize) = (Math.Max(page, 1), Math.Clamp(pageSize, 1, 50));
        var all = source.ToList();
        return new Page<T>(all.Skip((page - 1) * pageSize).Take(pageSize).ToList(), page, pageSize, all.Count, page * pageSize < all.Count ? link(page + 1, pageSize) : null);
    }
}

[Route("v2/slots")]
class SlotsV2Controller(Catalog catalog)
{
    [HttpGet]
    public Page<Slot> List(int? gymId = null, int page = 1, int pageSize = 3) =>
        catalog.Slots.Where(s => gymId == null || s.GymId == gymId).OrderBy(s => s.Day).ThenBy(s => s.Time).ThenBy(s => s.Id)
            .Paged(page, pageSize, (p, size) => $"/v2/slots?page={p}&pageSize={size}" + (gymId != null ? $"&gymId={gymId}" : ""));
}`,
      explanation:
        "Paged normalises its inputs first (page at least 1, page size between 1 and 50), skips (page - 1) * pageSize items, takes pageSize, and reports Total from the full list. Next is a link only when more items remain after this page. The controller orders by day, then time, then id, so the order never depends on insertion order or ties, and builds the link with the filters included so following Next keeps the same list. The old /gyms/{id}/slots route is untouched, so v1 clients keep their plain array.",
      hints: [
        { id: "h1", title: "Paged", content: "(page, pageSize) = (Math.Max(page, 1), Math.Clamp(pageSize, 1, 50)); var all = source.ToList(); return new Page<T>(all.Skip((page - 1) * pageSize).Take(pageSize).ToList(), page, pageSize, all.Count, page * pageSize < all.Count ? link(page + 1, pageSize) : null);" },
        { id: "h2", title: "The controller", content: "[HttpGet] public Page<Slot> List(int? gymId = null, int page = 1, int pageSize = 3) => catalog.Slots.Where(s => gymId == null || s.GymId == gymId).OrderBy(s => s.Day).ThenBy(s => s.Time).ThenBy(s => s.Id).Paged(page, pageSize, (p, size) => $\"/v2/slots?page={p}&pageSize={size}\" + (gymId != null ? $\"&gymId={gymId}\" : \"\")); The binder already turns page=x into a 400 and a missing value into the default." },
        { id: "h3", title: "What the recording expects", content: "The five slots sorted by day, time, id are 11, 21, 31, 12 and 22. With pageSize=2 the pages are [11, 21], [31, 12] and [22]; the last page has no next link. pageSize=500 is clamped to 50 and returns everything. page=0 behaves as page 1." },
      ],
      tests: [
        {
          id: "t1",
          description: "the v1 list keeps its plain array",
          assertionCode: js`
assert(Array.isArray(scene.versions) && scene.versions.length >= 8, "Register the module and replay: await Platform.Build().Replay(\"versions\").");
assert(Array.isArray(scene.versions), "Replay the section with Platform.Build().Replay(\"versions\").");
const v1 = scene.versions[0];
assertEqual(v1.status, 200, "GET /gyms/2/slots");
assert(Array.isArray(JSON.parse(v1.body)), "v1 must still return a bare array");`,
        },
        {
          id: "t2",
          description: "v2 returns an envelope with a page of items, the total and a next link",
          assertionCode: js`
assert(Array.isArray(scene.versions) && scene.versions.length >= 8, "Register the module and replay: await Platform.Build().Replay(\"versions\").");
const p = JSON.parse(scene.versions[1].body);
assertEqual(p.items.map((s) => s.id), [11, 21], "first page of two, ordered by day, time and id");
assertEqual([p.pageNumber, p.pageSize, p.total], [1, 2, 5], "page number, size and total");
assertEqual(p.next, "/v2/slots?page=2&pageSize=2", "next link");`,
        },
        {
          id: "t3",
          description: "following the pages covers every item once, and the last page has no next link",
          assertionCode: js`
assert(Array.isArray(scene.versions) && scene.versions.length >= 8, "Register the module and replay: await Platform.Build().Replay(\"versions\").");
const pages = [2, 3, 4].map((i) => JSON.parse(scene.versions[i].body));
assertEqual(JSON.parse(scene.versions[2].body).items.map((s) => s.id), [31, 12], "second page");
assertEqual(JSON.parse(scene.versions[3].body).items.map((s) => s.id), [22], "third page");
assertEqual(JSON.parse(scene.versions[3].body).next, null, "no next link on the last page");`,
        },
        {
          id: "t4",
          description: "page size is clamped to a maximum of 50",
          assertionCode: js`
assert(Array.isArray(scene.versions) && scene.versions.length >= 8, "Register the module and replay: await Platform.Build().Replay(\"versions\").");
const p = JSON.parse(scene.versions[4].body);
assertEqual(p.pageSize, 50, "pageSize=500 is clamped");
assertEqual(p.items.length, 5, "everything fits on one page");
assertEqual(p.next, null, "so there is no next link");`,
        },
        {
          id: "t5",
          description: "filters apply to the total and are carried in the next link",
          assertionCode: js`
assert(Array.isArray(scene.versions) && scene.versions.length >= 8, "Register the module and replay: await Platform.Build().Replay(\"versions\").");
const p = JSON.parse(scene.versions[5].body);
assertEqual([p.total, p.items.map((s) => s.id)], [2, [11]], "gym 1 has two slots; page size 1 shows the first");
assert(p.next.includes("gymId=1") && p.next.includes("page=2"), "next must keep the filter, got " + p.next);`,
        },
        {
          id: "t6",
          description: "page 0 is treated as page 1, and a non-numeric page is a 400",
          assertionCode: js`
assert(Array.isArray(scene.versions) && scene.versions.length >= 8, "Register the module and replay: await Platform.Build().Replay(\"versions\").");
assertEqual(JSON.parse(scene.versions[6].body).pageNumber, 1, "page=0 becomes page 1");
const bad = scene.versions[7];
assertEqual(bad.status, 400, "page=x cannot be bound");
assertEqual(JSON.parse(bad.body).title, "Bad Request", "as a problem document");`,
        },
      ],
      unlocks: ["ca-versions"],
      checks: [
        {
          prompt: "Which of these is a breaking change to an existing response?",
          question: {
            type: "choice",
            options: [
              "Changing a list from a bare array to an object with an `items` array",
              "Adding a new optional field `notes` to a booking",
              "Adding a new endpoint",
              "Accepting an extra optional query parameter",
            ],
            answer: 0,
          },
          explanation: "Existing clients parse the old shape and would crash on the new one. The other three are additive: well-behaved clients ignore what they do not know.",
        },
        {
          prompt: "Why must the slot list be ordered by a unique tiebreaker such as the id?",
          question: {
            type: "choice",
            options: [
              "Otherwise rows with equal sort keys may swap places between requests and a client paging through sees duplicates and gaps",
              "Because ids are faster to sort",
              "To make the JSON smaller",
              "Pages need ids to be numbered",
            ],
            answer: 0,
          },
          explanation: "A page is a slice of an ordered sequence. If the order is not total, two requests can slice differently. A unique last sort key makes the order deterministic.",
        },
        {
          prompt: "Rows are being inserted while a client reads pages 1, 2, 3 using page numbers. What can go wrong, and what avoids it?",
          question: {
            type: "choice",
            options: [
              "Items shift between pages so some are seen twice or missed; cursor (keyset) pagination avoids this",
              "Nothing: page numbers are stable",
              "The server crashes; add a lock",
              "Totals become negative; round them",
            ],
            answer: 0,
          },
          explanation: "With offsets, an insert before the current position pushes later rows down a page. Cursors ask for \"items after this id\", which is unaffected by inserts earlier in the list.",
        },
      ],
    },
    // ───────────────────────── 19 ─────────────────────────
    {
      id: "csharp-api-19-capstone",
      title: "Capstone: a request day, read back",
      minutes: 50,
      xp: 400,
      concepts: ["end-to-end replay", "operational report", "percentiles", "correlation across logs", "invariants", "mapping to ASP.NET Core"],
      learn: md`### Everything at once

For eighteen lessons each feature met a hand-picked section of traffic. Production does not work like that. A real day is a mixture: members booking while a scraper hammers the gym list, a stale token next to a forged one, a health probe in between, an overbooked slot, a retry, a crash. The features you built interact through shared middleware, one clock, one database and one log stream, and the only honest test of the platform is to run a realistic day through all of it at once.

The recording \`day\` has 43 requests spread over fifteen seconds. Your \`Platform.Build()\` already contains every module you wrote, in the right phases. The harness replays the day, then runs the outbox worker twice (once during a mailer outage and once after recovery). Your task is the last piece of operations work: **turn raw exchanges and telemetry into a report a human can act on.**

### What an operations report answers

Read it like an on-call engineer on Monday morning.

- **Volume and shape**: how many requests, and how many ended in each status. A day with no 4xx is as suspicious as a day full of 5xx.
- **Latency**: p50 and p95 from the histogram of lesson 12. The median tells you the typical experience; p95 tells you what the unlucky one in twenty gets.
- **Protection working**: how many requests were rate-limited (the scraper), replayed from the idempotency ledger (the retry), or answered 304 (the cache). These are the numbers that prove the middleware earned its keep.
- **Contention and access**: conflicts (409: stale versions and full slots) and denied requests (401 and 403). A sudden rise in 401 can be an expired deploy-time secret; a rise in 409 can be a UI that sends stale versions.
- **Side effects**: how many outbox messages were sent and how many ended up dead-lettered. A growing \`Dead\` count is somebody's task for tomorrow morning.
- **Failures with a trail**: for every 500, the path, the correlation id the client saw, and everything the platform logged under that id. This is the payoff of lesson 12: a client quotes \`web-9001\`, and the report (like a log search) walks straight from that id to the unhandled exception.

Notice what the report does *not* count as a failure: 503 from the startup probe is the probe doing its job. Define "failure" precisely, because a dashboard that cries wolf is ignored.

### Invariants

A good end-to-end run also checks things that must *always* hold, whatever the traffic: no slot over capacity, no booking visible to the wrong member, no duplicate booking from a retried key, every booking has a matching outbox message. Your report's numbers imply several of them (one replayed request, one stale-version conflict, no 5xx except the deliberate drill). When you assert on a whole day, assert on invariants and key totals, not on every line, so the test stays meaningful when traffic changes.

### How this maps to ASP.NET Core

You rebuilt, by hand, the architecture of the .NET web stack. Knowing the names will make the real framework feel familiar:

| In this course | In ASP.NET Core |
| --- | --- |
| \`Request\`, \`Response\`, \`HttpContext\` | \`HttpRequest\`, \`HttpResponse\`, \`HttpContext\` |
| \`Router\`, templates, constraints | endpoint routing, route templates and constraints |
| \`App.Use\`, \`Map\`, the fold over delegates | \`app.Use\`, \`app.Map\`, the request delegate pipeline |
| \`ServiceCollection\`, \`ServiceProvider\`, lifetimes | \`IServiceCollection\`, \`IServiceProvider\`, \`ValidateScopes\` |
| \`Binder\`, \`MapControllers\`, attributes | model binding, \`[ApiController]\`, attribute routing, minimal APIs |
| \`ProblemDetails\`, \`Problems\` middleware | \`ProblemDetails\`, \`IExceptionHandler\` / status code pages |
| \`DbContext\`, snapshot compare, row version | EF Core change tracker, \`[Timestamp]\` concurrency tokens |
| \`TokenService\`, policies, \`Authorize\` metadata | JWT bearer authentication, authorization policies, endpoint metadata |
| \`RateLimiter\`, token bucket | the built-in rate limiting middleware |
| \`IdempotencyLedger\` | custom middleware or filters (not built in) |
| \`UseEtag\`, \`Cache-Control\` | response caching, conditional requests |
| \`Logger\`, scopes, \`Metrics\` | \`ILogger\`, \`BeginScope\`, \`System.Diagnostics.Metrics\`, OpenTelemetry |
| \`HealthChecks\`, three probes | \`AddHealthChecks\`, \`MapHealthChecks\`, probe tags |
| \`Resilient\`, \`CircuitBreaker\` | Polly / \`Microsoft.Extensions.Http.Resilience\` |
| outbox + worker | outbox libraries, \`BackgroundService\` |
| \`Platform.Build()\` in a test | \`WebApplicationFactory<T>\` |

The names differ; the ideas and failure modes are the ones you have now met.

### Common mistakes

- Averages instead of percentiles in the summary.
- Counting every 5xx as a failure without asking which were expected.
- Reporting totals with no way to reach the individual request.
- Asserting on whole days line by line instead of on invariants and key numbers.`,
      mission: md`It is Monday. The Saturday request day has been replayed through the finished platform and the on-call lead asks for one thing: *"Tell me what happened, and whether anything needs my attention."*

Build the report. You have the 43 exchanges, the metrics, the log and the database. Group the statuses, read the latency percentiles, count what the protection layers did, summarise the outbox, and trace every crash back to its log trail via the correlation id. When this lesson passes, the **Day report** lights up and every system on the console is live.`,
      tasks: [
        "Build the report object with: requests (the number of exchanges), byStatus (dictionary from status text to count, ordered by status), p50 and p95 from the Metrics histogram",
        "Add the protection counts: rateLimited (429), replayed (responses carrying Idempotent-Replayed), notModified (304), conflicts (409) and denied (401 and 403)",
        "Add outbox (the number of OutboxMessage rows per Status, read through a new DbContext) and failures: for every exchange with status 500 an object with path, correlationId (its X-Request-Id header) and trail (the messages of the log events with that correlationId)",
        "Print one summary line that includes \"<requests> requests\" and send the report with Board.Show(\"report\", report)",
      ],
      starterAdd: cs`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 19. Replay a whole request day through the finished platform, then read it back. The replay and the two outbox runs are ready;
// below them build report (an object, then Board.Show("report", report)) with these members, computed from exchanges, the metrics, the logger and the database:
//   requests, byStatus (status text -> count), p50, p95, rateLimited (429s), replayed (Idempotent-Replayed responses), notModified (304s),
//   conflicts (409s), denied (401s and 403s), outbox (message status -> count) and failures (every 500: path, correlationId, trail = the messages logged under that id).
// Print one summary line that contains "<n> requests".
var day = Platform.Build();
var exchanges = await day.Replay("day");
var (mailer, metrics, logger) = (day.Part<Mailer>("mailer"), day.Part<Metrics>("metrics"), day.Part<Logger>("logger"));
mailer.Down = true;
await day.Deliver(30_000);
mailer.Down = false;
await day.Deliver(60_000);
Console.WriteLine("TODO: build the report here");`,
      solutionAdd: cs`// 19. the capstone
var day = Platform.Build();
var exchanges = await day.Replay("day");
var (mailer, metrics, logger) = (day.Part<Mailer>("mailer"), day.Part<Metrics>("metrics"), day.Part<Logger>("logger"));
mailer.Down = true;
await day.Deliver(30_000);
mailer.Down = false;
await day.Deliver(60_000);
int Count(Func<Exchange, bool> match) => exchanges.Count(match);
var report = new
{
    requests = exchanges.Count,
    byStatus = exchanges.GroupBy(e => e.Status).OrderBy(g => g.Key).ToDictionary(g => g.Key.ToString(), g => g.Count()),
    p50 = metrics.Percentile(0.5),
    p95 = metrics.Percentile(0.95),
    rateLimited = Count(e => e.Status == 429),
    replayed = Count(e => e.Headers.ContainsKey("Idempotent-Replayed")),
    notModified = Count(e => e.Status == 304),
    conflicts = Count(e => e.Status == 409),
    denied = Count(e => e.Status is 401 or 403),
    outbox = new DbContext(day.Part<Database>("db")).Set<OutboxMessage>().GroupBy(m => m.Status).ToDictionary(g => g.Key, g => g.Count()),
    failures = exchanges.Where(e => e.Status == 500).Select(e => new { e.Path, correlationId = e.Headers["X-Request-Id"], trail = logger.Events.Where(l => (string)l.Props["correlationId"] == e.Headers["X-Request-Id"]).Select(l => l.Message) }),
};
Console.WriteLine($"{report.requests} requests, p95 {report.p95} ms, outbox {string.Join(", ", report.outbox.Select(s => $"{s.Key} {s.Value}"))}");
Board.Show("report", report);`,
      explanation:
        "The report is computed entirely from artefacts the platform already produced. Status counts come from grouping the exchanges, percentiles from the latency histogram, and the protection counts from filtering exchanges (429, 304, the Idempotent-Replayed header, 409, 401/403). The outbox summary reads OutboxMessage rows through a fresh DbContext and groups them by Status after the two worker runs. For failures, each 500 exchange carries its X-Request-Id header, and the logger holds every event under that correlation id, so the trail (started, unhandled exception, finished) can be reconstructed for exactly that request without the client ever having seen more than a generic problem document.",
      hints: [
        { id: "h1", title: "Counting", content: "int Count(Func<Exchange, bool> match) => exchanges.Count(match); byStatus = exchanges.GroupBy(e => e.Status).OrderBy(g => g.Key).ToDictionary(g => g.Key.ToString(), g => g.Count()); denied = Count(e => e.Status is 401 or 403); replayed = Count(e => e.Headers.ContainsKey(\"Idempotent-Replayed\")); p95 = metrics.Percentile(0.95)." },
        { id: "h2", title: "Outbox and failures", content: "outbox = new DbContext(day.Part<Database>(\"db\")).Set<OutboxMessage>().GroupBy(m => m.Status).ToDictionary(g => g.Key, g => g.Count()); failures = exchanges.Where(e => e.Status == 500).Select(e => new { e.Path, correlationId = e.Headers[\"X-Request-Id\"], trail = logger.Events.Where(l => (string)l.Props[\"correlationId\"] == e.Headers[\"X-Request-Id\"]).Select(l => l.Message) }). Only 500s count: the 503s are the startup and readiness probes doing their job." },
        { id: "h3", title: "Shape of the result", content: "Build an anonymous object: var report = new { requests = exchanges.Count, byStatus = ..., p50 = ..., p95 = ..., rateLimited = ..., replayed = ..., notModified = ..., conflicts = ..., denied = ..., outbox = ..., failures = ... }; Console.WriteLine($\"{report.requests} requests, p95 {report.p95} ms, outbox ...\"); Board.Show(\"report\", report);" },
      ],
      tests: [
        {
          id: "t1",
          description: "the whole recorded day was replayed through the platform",
          assertionCode: js`
assert(Array.isArray(scene.day) && scene.day.length === 43 && scene.report, "Build the report and send it with Board.Show(\"report\", report).");
assert(Array.isArray(scene.day), "The harness replays the day with day.Replay(\"day\").");
assertEqual(scene.day.length, 43, "number of requests in the recorded day");`,
        },
        {
          id: "t2",
          description: "the report counts requests and groups them by status",
          assertionCode: js`
assert(Array.isArray(scene.day) && scene.day.length === 43 && scene.report, "Build the report and send it with Board.Show(\"report\", report).");
assert(scene.report, "Send the report with Board.Show(\"report\", report).");
assertEqual(scene.report.requests, 43, "requests");
assertEqual(scene.report.byStatus, { "200": 18, "201": 6, "304": 2, "401": 3, "403": 1, "404": 2, "405": 1, "409": 3, "422": 1, "429": 3, "500": 1, "503": 2 }, "requests per status");`,
        },
        {
          id: "t3",
          description: "latency percentiles come from the histogram",
          assertionCode: js`assert(Array.isArray(scene.day) && scene.day.length === 43 && scene.report, "Build the report and send it with Board.Show(\"report\", report).");
assertEqual([scene.report.p50, scene.report.p95], [5, 50], "p50 and p95 in milliseconds (bucket upper bounds)");`,
        },
        {
          id: "t4",
          description: "the protection layers are visible: rate limit, idempotent replay, cache",
          assertionCode: js`
assert(Array.isArray(scene.day) && scene.day.length === 43 && scene.report, "Build the report and send it with Board.Show(\"report\", report).");
assertEqual(scene.report.rateLimited, 3, "the scraper's requests beyond its bucket");
assertEqual(scene.report.replayed, 1, "the retried booking was replayed, not repeated");
assertEqual(scene.report.notModified, 2, "conditional GETs answered with 304");`,
        },
        {
          id: "t5",
          description: "contention and access problems are counted",
          assertionCode: js`
assert(Array.isArray(scene.day) && scene.day.length === 43 && scene.report, "Build the report and send it with Board.Show(\"report\", report).");
assertEqual(scene.report.conflicts, 3, "409s: a full slot, a stale version and the conflict drill");
assertEqual(scene.report.denied, 4, "401s (no token, forged, expired) plus one 403");`,
        },
        {
          id: "t6",
          description: "the outbox is summarised after the outage and the recovery",
          assertionCode: js`assert(Array.isArray(scene.day) && scene.day.length === 43 && scene.report, "Build the report and send it with Board.Show(\"report\", report).");
assertEqual(scene.report.outbox, { Sent: 4, Dead: 1 }, "four confirmations sent, one dead letter (the invalid address)");`,
        },
        {
          id: "t7",
          description: "every crash is traced from the id the client saw to the log trail",
          assertionCode: js`
assert(Array.isArray(scene.day) && scene.day.length === 43 && scene.report, "Build the report and send it with Board.Show(\"report\", report).");
assertEqual(scene.report.failures.length, 1, "only the crash drill is a 500");
const f = scene.report.failures[0];
assertEqual([f.path, f.correlationId], ["/drill/crash", "web-9001"], "path and the caller's own request id");
assertEqual(f.trail, ["request started", "unhandled exception", "request finished"], "the log events recorded under that id");`,
        },
        {
          id: "t8",
          description: "a summary line is printed",
          assertionCode: js`assert(Array.isArray(scene.day) && scene.day.length === 43 && scene.report, "Build the report and send it with Board.Show(\"report\", report).");
assert(lines.some((l) => /^43 requests/.test(l.trim())), "Print a line starting with the request count, e.g. \"43 requests, p95 50 ms, ...\"");`,
        },
      ],
      unlocks: ["ca-report"],
      checks: [
        {
          prompt: "The report lists 503 responses from the startup probe. Should they count as \"failures\"?",
          question: {
            type: "choice",
            options: [
              "No: they are the probe reporting an expected, temporary state; failures should mean unexpected server errors",
              "Yes: every 5xx is a failure",
              "Only if there are more than two",
              "Only in production",
            ],
            answer: 0,
          },
          explanation: "A report that flags expected behaviour trains people to ignore it. Define failure precisely (here: unexpected 500s with a stack of logs) and keep probe results as their own signal.",
        },
        {
          prompt: "A member quotes request id `web-9001` to support. What lets you find what happened inside the platform?",
          question: {
            type: "choice",
            options: [
              "Every log event of that request carries the same correlation id from the log scope",
              "Searching all logs for the member's name",
              "Restarting the server",
              "The status code",
            ],
            answer: 0,
          },
          explanation: "The correlation id is the thread through the whole request: it is echoed in the response header, stamped on every event by the log scope, and therefore the key you search by.",
        },
        {
          prompt: "Which is the better assertion for a test that replays a whole day?",
          question: {
            type: "choice",
            options: [
              "Key totals and invariants (one replay, no double booking, only the drill returned 500)",
              "The exact text of every response body",
              "Only that the replay did not crash",
              "The total run time",
            ],
            answer: 0,
          },
          explanation: "Whole-day tests stay valuable when they pin the behaviours that must always hold and the headline numbers, instead of breaking whenever an unrelated field is added to a response.",
        },
      ],
    },
  ],
};
