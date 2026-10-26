import type { Chapter } from "@/engine/types";
import { TYPES_DIVIDER } from "../../../engine/compose.ts";
import { cs, js, md } from "./util.ts";
import { chapter5b } from "./ch5b.ts";

export const chapter5: Chapter = {
  id: "resilience",
  title: "Resilience and wiring",
  blurb: "Survive flaky parts, release what you borrow, wire components together and run the whole show.",
  lessons: [
    // ───────────────────────── 14 ─────────────────────────
    {
      id: "csharp-delegates-14-retry",
      title: "Retry, backoff and jitter",
      minutes: 40,
      xp: 220,
      concepts: ["retry", "exponential backoff", "jitter", "deadlines", "generic delegates", "policy composition", "idempotence"],
      learn: md`### Most failures are short

The fog machine at Lantern Hall needs a moment to heat. Ask for fog while it is cold and it refuses; ask again a second later and it works. Giving up after the first refusal throws away a show that was one breath from fine. Asking a thousand times a second is just as foolish, because you keep a struggling machine busy saying no. A **retry policy** sits between the two: try again, politely, a bounded number of times.

The interesting question is where that logic lives. If every call site grows its own \`for\` loop and \`try/catch\`, you get a dozen slightly different retry loops and no way to change them together. A better design writes the policy **once, as a value**, and wraps any operation in it.

### Operations and policies are delegates

Two small generic delegate types do the job:

~~~csharp
delegate Task<T> Operation<T>(CancellationToken token);
delegate Operation<T> Policy<T>(Operation<T> inner);
~~~

An \`Operation<T>\` is "something you can start": hand it a cancellation token, get a task of \`T\`. A \`Policy<T>\` is a function from an operation to a new operation. It never runs anything itself; it builds a wrapper that behaves like \`inner\` plus something extra.

Why not use \`Func<CancellationToken, Task<T>>\` directly? It would work, but the names document intent, and the compiler treats two delegate types with identical shapes as strangers (see the mistakes below). A policy that returns a policy would otherwise be an unreadable pile of angle brackets.

Here is the whole shape with nothing in it but bookkeeping:

~~~csharp
Policy<T> Logged<T>(List<string> notes)
{
    return inner => async token =>
    {
        notes.Add("start");
        T result = await inner(token);
        notes.Add("end");
        return result;
    };
}
~~~

Read it from the outside in. \`Logged\` takes its settings (\`notes\`). It returns a lambda that takes \`inner\`. That returns a lambda that takes \`token\`. Three layers of "later": configuration time, wrapping time, run time. Each layer is a closure, so the innermost lambda quietly keeps \`notes\` and \`inner\` alive. Two wrapped operations get two separate captured copies, which is what you want.

### Retry: when and how often

~~~csharp
for (int attempt = 1; ; attempt++)
{
    try { return await inner(token); }
    catch (Exception ex) when (ex is not OperationCanceledException)
    {
        if (attempt >= maxAttempts) throw;
        // ...wait, then loop
    }
}
~~~

Three decisions are hiding in those few lines.

1. **Only retry what is safe to repeat.** Setting a lamp to level 80 twice is harmless: the operation is *idempotent*. "Add one to tickets sold" or "charge the card" is not; if the first attempt actually succeeded but the reply was lost, a retry doubles the damage. Retry reads and idempotent writes freely; for the rest, add an idempotency key or do not retry.
2. **Bound the attempts.** An unbounded retry is an outage with extra steps. After \`maxAttempts\` the original exception is rethrown with \`throw;\` so the stack trace survives.
3. **Never retry cancellation.** If someone pulled the plug, the filter \`when (ex is not OperationCanceledException)\` lets the cancellation escape. Retrying would mean disobeying a direct order.

### Backoff: wait longer each time

Retrying instantly is rarely useful: the machine that just refused you has not changed. Waiting the same time between every try is better but wasteful if recovery takes a while. **Exponential backoff** doubles the ceiling after each failure. With a base of 4 ms the ceilings are 4, 8, 16, 32 and so on. In code the doubling is a bit shift:

~~~csharp
int ceiling = baseDelayMs * (1 << (attempt - 1));   // attempt 1: x1, attempt 2: x2, attempt 3: x4
~~~

Early retries are quick, in case the hiccup was brief; later ones give a slower recovery room to finish, and the load you put on the failing part falls off quickly.

### Jitter: stop everyone retrying together

Picture thirty dimmer channels that all lose contact with the same rack at the same instant. With pure backoff (ceiling 4, then 8, then 16) every one of them retries at exactly 4 ms, then exactly 12 ms, then exactly 28 ms. The rack, just recovering, is hit by a wave of thirty calls in a single millisecond, three times in a row. This pile-on is called a **thundering herd**, and backoff alone makes it rhythmic rather than gentle.

**Jitter** adds randomness so the herd spreads out. A simple version, "equal jitter", keeps half of the ceiling fixed and randomises the other half:

~~~csharp
int wait = ceiling / 2 + jitter.Next(ceiling / 2 + 1);   // between ceiling/2 and ceiling
~~~

For ceiling 4 that is 2 to 4 ms: the thirty channels now land on three different milliseconds, roughly ten per millisecond instead of thirty. For ceiling 8 it is 4 to 8 ms, five milliseconds, about six per millisecond. Same average patience, a far flatter load.

The lessons pass in \`new Random(7)\` so a run repeats exactly. In a real application use \`Random.Shared\`; an ordinary \`Random\` object is not safe to use from several threads at once.

### Deadlines: one attempt cannot take forever

A retry loop around an operation that hangs just waits forever, politely. So each attempt also gets a deadline. Lesson 12's \`WithTimeout\` becomes a policy:

~~~csharp
Policy<T> Deadline<T>(int milliseconds)
{
    return inner => token => WithTimeout(t => inner(t), milliseconds, token);
}
~~~

The lambda \`t => inner(t)\` adapts our \`Operation<T>\` to the plain \`Func\` that \`WithTimeout\` expects. Two things matter here.

First, **order decides meaning**. Put \`Deadline\` *inside* \`Retry\` and every attempt gets its own 25 ms. Put it *outside* and 25 ms is the budget for the whole operation, pauses between attempts included, so a later attempt may be cut off mid-flight. Neither is wrong, but you must choose on purpose.

Second, **a deadline is only a request**. Cancelling a token cannot stop code that never looks at it. An operation like \`await Task.Delay(150)\` with no token passed in will cheerfully finish after 150 ms even under a 20 ms deadline and return its value as if nothing happened. Every operation you wrap must pass its token on to whatever it awaits.

### Composing with Wrap

A list of policies is more readable than nested calls, so \`Wrap\` applies them for you. The list is written **outer to inner**, and the loop walks it backwards so the last policy touches the operation first:

~~~csharp
Operation<string> fog = Wrap<string>(SprayFog,
    Retry<string>(4, 4, new Random(7), fogLog),
    Deadline<string>(50));
~~~

Read it as: a retrying wrapper around a deadline wrapper around \`SprayFog\`. The method group \`SprayFog\` converts to \`Operation<string>\` because its signature matches, delegates as values once more. Every policy returned by \`Retry\` and \`Deadline\` is itself just a value you can store, pass around and reuse for another operation.

### Reading what happened

\`Retry\` records an \`Attempt(Number, Outcome, WaitMs)\` per try: "failed: fog machine busy (call 1)" with the pause that followed, then finally "ok". The last failure of an exhausted retry is logged too, with a wait of 0, because nothing follows it. That log is what the Retry ladder panel draws.

### Common mistakes

- **Leaving out the type argument.** The compiler cannot infer \`T\` from the arguments of \`Retry\`, since none of them mentions it: \`Program.cs(2,29): error CS0411: The type arguments for method 'Retry<T>(int, int, Random, List<Attempt>)' cannot be inferred from the usage. Try specifying the type arguments explicitly.\` Write \`Retry<string>(...)\`.
- **Mixing delegate types.** Assigning a \`Func<CancellationToken, Task<string>>\` to an \`Operation<string>\` fails even though the shapes match: \`error CS0029: Cannot implicitly convert type 'System.Func<System.Threading.CancellationToken, System.Threading.Tasks.Task<string>>' to 'Operation<string>'\`. Use a lambda or method group directly, or wrap it: \`token => plain(token)\`.
- **Forgetting to apply the policy.** \`Operation<string> o = Retry<string>(...);\` hands an operation-shaped slot a policy: \`error CS0029: Cannot implicitly convert type 'Policy<string>' to 'Operation<string>'\`. Pass the policy to \`Wrap\` (or call it with the inner operation).
- **A loop that can fall out of a lambda.** If the retry loop has a condition, the compiler sees a path with no return: \`error CS1643: Not all code paths return a value in lambda expression of type 'Operation<int>'\`. An endless \`for (...; ; ...)\` that only leaves by \`return\` or \`throw\` has no such path.
- **Forgetting \`async\` on the lambda.** \`await\` inside a plain lambda gives \`error CS4034: The 'await' operator can only be used within an async lambda expression. Consider marking this lambda expression with the 'async' modifier.\`
- **Retrying something that must not repeat**, or wrapping an operation that ignores its token so the deadline never fires. Neither produces an error message, which is why they are worth a deliberate look.`,
      mission: md`Opening night is close, and Odile Marsh has had enough of the fog machine. It coughs and refuses its first two sprays every time it is switched on, and Wen's fly bar sometimes hangs halfway up. Tobias keeps pressing the button by hand. Odile wants the desk to do the polite thing on its own: try again, wait a little longer each time, never all at once, and give up cleanly if a part simply does not answer.

You will write the retry and deadline policies as reusable values, then wrap the fog machine and the fly bar in them. When the lesson passes, the **Retry ladder** lights up on the board: every attempt as a rung, with the pause that followed it.`,
      tasks: [
        "Under the divider declare delegate Task<T> Operation<T>(CancellationToken token); delegate Operation<T> Policy<T>(Operation<T> inner); and record Attempt(int Number, string Outcome, int WaitMs);",
        "Write generic local functions Policy<T> Deadline<T>(int milliseconds) (reuse your WithTimeout), Policy<T> Retry<T>(int maxAttempts, int baseDelayMs, Random jitter, List<Attempt> log) and Operation<T> Wrap<T>(Operation<T> operation, params Policy<T>[] outerToInner). Retry logs Attempt(attempt, \"ok\", 0) on success; on a failure other than cancellation it logs Attempt(attempt, $\"failed: {ex.Message}\", wait) with wait = ceiling / 2 + jitter.Next(ceiling / 2 + 1) and ceiling = baseDelayMs * (1 << (attempt - 1)), pauses with Task.Delay(wait, token) and tries again. On the last allowed attempt it logs the failure with WaitMs 0 and rethrows. Wrap applies the policies so the first one in the list is the outermost",
        "Add int fogCalls and async Task<string> SprayFog(CancellationToken token): count the call, await Task.Delay(3, token), throw InvalidOperationException($\"fog machine busy (call {fogCalls})\") for the first two calls, otherwise return \"fog released\". Build List<Attempt> fogLog and Operation<string> fog = Wrap<string>(SprayFog, Retry<string>(4, 4, new Random(7), fogLog), Deadline<string>(50)), await fog(CancellationToken.None) into string fogResult, print $\"{fogResult} after {fogLog.Count} attempts\", then one line per Attempt shot: $\"  attempt {shot.Number}: {shot.Outcome}\" plus $\", waiting {shot.WaitMs} ms\" when WaitMs is above 0 (two leading spaces)",
        "Add async Task<string> SlowFlyBar(CancellationToken token) that awaits Task.Delay(200, token) and returns \"never arrives\". Build List<Attempt> slowLog and Operation<string> slow = Wrap<string>(SlowFlyBar, Retry<string>(2, 4, new Random(7), slowLog), Deadline<string>(25)). Await it inside a try, catch TimeoutException into string slowOutcome (start it as \"returned\") and print $\"slow fly bar: {slowOutcome}, tried {slowLog.Count} times\"",
        "Finish with Desk.Show(\"retry\", new { fog = fogLog, fogResult, slow = slowLog, slowOutcome });",
      ],
      starterAdd: cs`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 14: retries, backoff, jitter and deadlines. Add your code below, in this order.
// 1. Below the divider declare the delegate types Operation<T> and Policy<T> and the record Attempt.
// 2. Local functions (they can sit anywhere among the statements, here is fine):
//      Policy<T> Deadline<T>(int milliseconds)       -> inner => token => WithTimeout(t => inner(t), milliseconds, token)
//      Policy<T> Retry<T>(int maxAttempts, int baseDelayMs, Random jitter, List<Attempt> log)
//          return inner => async token => { for (int attempt = 1; ; attempt++) { try { ... } catch (...) when (...) { ... } } };
//          success: log Attempt(attempt, "ok", 0) and return the result
//          failure (not cancellation): attempt >= maxAttempts -> log with WaitMs 0 and rethrow with "throw;"
//                                       otherwise ceiling = baseDelayMs * (1 << (attempt - 1)); wait = ceiling / 2 + jitter.Next(ceiling / 2 + 1);
//                                       log Attempt(attempt, $"failed: {ex.Message}", wait); await Task.Delay(wait, token);
//      Operation<T> Wrap<T>(Operation<T> operation, params Policy<T>[] outerToInner)  -> apply the list from the last item back to the first
// 3. SprayFog (fails its first two calls), fogLog, fog = Wrap<string>(SprayFog, Retry<string>(4, 4, new Random(7), fogLog), Deadline<string>(50))
//    Print:  fog released after 3 attempts   then one "  attempt N: ..." line per Attempt.
// 4. SlowFlyBar (200 ms), slowLog, slow = Wrap<string>(SlowFlyBar, Retry<string>(2, 4, new Random(7), slowLog), Deadline<string>(25))
//    Print:  slow fly bar: gave up after 25 ms, tried 2 times
// 5. Desk.Show("retry", new { fog = fogLog, fogResult, slow = slowLog, slowOutcome });

${TYPES_DIVIDER}

// ─── ✏️ YOUR TURN ─── declare the delegate types and the record here.
//   delegate Task<T> Operation<T>(CancellationToken token);
//   delegate Operation<T> Policy<T>(Operation<T> inner);
//   record Attempt(int Number, string Outcome, int WaitMs);
`,
      solutionAdd: cs`// Lesson 14: retries, backoff, jitter and deadlines.
Policy<T> Deadline<T>(int milliseconds)
{
    return inner => token => WithTimeout(t => inner(t), milliseconds, token);
}

Policy<T> Retry<T>(int maxAttempts, int baseDelayMs, Random jitter, List<Attempt> log)
{
    return inner => async token =>
    {
        for (int attempt = 1; ; attempt++)
        {
            try
            {
                T result = await inner(token);
                log.Add(new Attempt(attempt, "ok", 0));
                return result;
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                if (attempt >= maxAttempts)
                {
                    log.Add(new Attempt(attempt, $"failed: {ex.Message}", 0));
                    throw;
                }
                int ceiling = baseDelayMs * (1 << (attempt - 1));
                int wait = ceiling / 2 + jitter.Next(ceiling / 2 + 1);
                log.Add(new Attempt(attempt, $"failed: {ex.Message}", wait));
                await Task.Delay(wait, token);
            }
        }
    };
}

Operation<T> Wrap<T>(Operation<T> operation, params Policy<T>[] outerToInner)
{
    Operation<T> wrapped = operation;
    for (int layer = outerToInner.Length - 1; layer >= 0; layer--)
    {
        wrapped = outerToInner[layer](wrapped);
    }
    return wrapped;
}

int fogCalls = 0;
async Task<string> SprayFog(CancellationToken token)
{
    fogCalls++;
    await Task.Delay(3, token);
    if (fogCalls <= 2)
    {
        throw new InvalidOperationException($"fog machine busy (call {fogCalls})");
    }
    return "fog released";
}

List<Attempt> fogLog = new();
Operation<string> fog = Wrap<string>(SprayFog, Retry<string>(4, 4, new Random(7), fogLog), Deadline<string>(50));
string fogResult = await fog(CancellationToken.None);
Console.WriteLine($"{fogResult} after {fogLog.Count} attempts");
foreach (Attempt shot in fogLog)
{
    string pause = shot.WaitMs > 0 ? $", waiting {shot.WaitMs} ms" : "";
    Console.WriteLine($"  attempt {shot.Number}: {shot.Outcome}{pause}");
}

async Task<string> SlowFlyBar(CancellationToken token)
{
    await Task.Delay(200, token);
    return "never arrives";
}

List<Attempt> slowLog = new();
Operation<string> slow = Wrap<string>(SlowFlyBar, Retry<string>(2, 4, new Random(7), slowLog), Deadline<string>(25));
string slowOutcome = "returned";
try
{
    await slow(CancellationToken.None);
}
catch (TimeoutException ex)
{
    slowOutcome = ex.Message;
}
Console.WriteLine($"slow fly bar: {slowOutcome}, tried {slowLog.Count} times");

Desk.Show("retry", new { fog = fogLog, fogResult, slow = slowLog, slowOutcome });

${TYPES_DIVIDER}

delegate Task<T> Operation<T>(CancellationToken token);

delegate Operation<T> Policy<T>(Operation<T> inner);

record Attempt(int Number, string Outcome, int WaitMs);`,
      explanation:
        "Operation<T> and Policy<T> turn behaviour into composable values: a policy takes an operation and returns a wrapped one, so Wrap can stack Retry and Deadline around SprayFog without either knowing about the other. Retry loops inside the wrapper: each failure that is not a cancellation is logged, the pause is half the doubled ceiling plus a random half (backoff with jitter), and the last allowed attempt rethrows the original exception. SprayFog fails twice and succeeds on call three, so the log holds two failures with waits in 2 to 4 ms and 4 to 8 ms and then an ok. Because Deadline sits inside Retry, SlowFlyBar gets a fresh 25 ms for each of its two attempts; WithTimeout turns each cancellation into a TimeoutException, which Retry treats as an ordinary failure, and the second one escapes to the caller.",
      hints: [
        { id: "h1", title: "Three layers of later", content: "A policy is a method that returns inner => async token => { ... }. The loop and the try/catch go in the innermost lambda. Write Deadline first: it is a single line that calls WithTimeout." },
        { id: "h2", title: "Shape of Retry", content: "for (int attempt = 1; ; attempt++) { try { T result = await inner(token); log.Add(...ok...); return result; } catch (Exception ex) when (ex is not OperationCanceledException) { if (attempt >= maxAttempts) { log.Add(...failed, 0); throw; } compute ceiling and wait; log.Add(...failed, wait); await Task.Delay(wait, token); } }" },
        { id: "h3", title: "Wrap, and the order of the list", content: "Operation<T> wrapped = operation; for (int layer = outerToInner.Length - 1; layer >= 0; layer--) { wrapped = outerToInner[layer](wrapped); } return wrapped; Then Wrap<string>(SprayFog, Retry<string>(4, 4, new Random(7), fogLog), Deadline<string>(50)) puts Retry on the outside. Remember the type argument: Retry<string>, not Retry." },
      ],
      tests: [
        {
          id: "t1",
          description: "the fog machine succeeds on the third attempt",
          assertionCode: js`
assert(lines.includes("fog released after 3 attempts"), 'No line is exactly "fog released after 3 attempts". Print $"{fogResult} after {fogLog.Count} attempts" after awaiting fog(CancellationToken.None). SprayFog fails its first two calls, so Retry should need three attempts.');
assertEqual(scene.retry?.fogResult, "fog released", "Show fogResult in the retry payload (Desk.Show(\"retry\", new { fog = fogLog, fogResult, slow = slowLog, slowOutcome }))");`,
        },
        {
          id: "t2",
          description: "every attempt is logged, with backoff that grows and jitter inside its range",
          assertionCode: js`
const fog = scene.retry?.fog;
assert(Array.isArray(fog) && fog.length === 3, "scene.retry.fog should hold 3 Attempt records (two failures and the success). Send fogLog in the retry payload.");
assertEqual(fog.map((a) => a.number), [1, 2, 3], "Attempt numbers should be 1, 2, 3");
assert(fog[0].outcome === "failed: fog machine busy (call 1)", "Attempt 1 outcome should be \"failed: \" plus the exception message, got: " + fog[0].outcome);
assert(fog[1].outcome === "failed: fog machine busy (call 2)", "Attempt 2 outcome should be \"failed: fog machine busy (call 2)\", got: " + fog[1].outcome);
assertEqual(fog[2].outcome, "ok", "The last attempt should be logged as \"ok\"");
assertEqual(fog[2].waitMs, 0, "A successful attempt has WaitMs 0");
assert(fog[0].waitMs >= 2 && fog[0].waitMs <= 4, "After attempt 1 (base 4 ms) the wait should be between 2 and 4 ms: ceiling / 2 + jitter.Next(ceiling / 2 + 1) with ceiling = 4. Got " + fog[0].waitMs);
assert(fog[1].waitMs >= 4 && fog[1].waitMs <= 8, "After attempt 2 the ceiling doubles to 8, so the wait should be between 4 and 8 ms. Got " + fog[1].waitMs + ". Use baseDelayMs * (1 << (attempt - 1)) for the ceiling.");
assert(fog[1].waitMs >= fog[0].waitMs, "Backoff: the second pause should not be shorter than the first.");`,
        },
        {
          id: "t3",
          description: "each attempt is printed on its own indented line",
          assertionCode: js`
assert(lines.some((l) => /^  attempt 1: failed: fog machine busy \(call 1\), waiting \d+ ms$/.test(l)), 'Expected a line like "  attempt 1: failed: fog machine busy (call 1), waiting 3 ms" (two leading spaces, then the wait). Build it from shot.Number, shot.Outcome and shot.WaitMs.');
assert(lines.some((l) => /^  attempt 2: failed: fog machine busy \(call 2\), waiting \d+ ms$/.test(l)), 'Expected a line like "  attempt 2: failed: fog machine busy (call 2), waiting 6 ms".');
assert(lines.includes("  attempt 3: ok"), 'Expected the line "  attempt 3: ok" with no "waiting" part when WaitMs is 0.');`,
        },
        {
          id: "t4",
          description: "a deadline applies to each attempt and the last failure reaches the caller",
          assertionCode: js`
assert(lines.includes("slow fly bar: gave up after 25 ms, tried 2 times"), 'No line is exactly "slow fly bar: gave up after 25 ms, tried 2 times". SlowFlyBar takes 200 ms, Deadline<string>(25) sits inside Retry<string>(2, ...), and the final TimeoutException must be caught and its Message stored in slowOutcome.');
assertEqual(scene.retry?.slowOutcome, "gave up after 25 ms", "slowOutcome in the payload");
const slow = scene.retry?.slow;
assert(Array.isArray(slow) && slow.length === 2, "scene.retry.slow should hold 2 Attempt records, one per try.");
assert(slow[0].outcome === "failed: gave up after 25 ms", "The first slow attempt should be logged as \"failed: gave up after 25 ms\", got: " + slow[0].outcome);
assert(slow[0].waitMs >= 2 && slow[0].waitMs <= 4, "The pause after the first slow attempt should be 2 to 4 ms, got " + slow[0].waitMs);
assertEqual(slow[1].waitMs, 0, "The final failed attempt is logged with WaitMs 0 (nothing follows it) and the exception is rethrown");`,
        },
        {
          id: "t5",
          description: "the policies are generic values that Wrap can stack",
          assertionCode: js`
assert(lines.some((l) => l.startsWith("fog released after")), "Run the fog machine through Wrap first.");
assert(lines.some((l) => l.startsWith("slow fly bar:")), "Run the slow fly bar through Wrap too: it needs its own Retry and Deadline.");
assert(Array.isArray(scene.retry?.fog) && Array.isArray(scene.retry?.slow), "Send both logs: Desk.Show(\"retry\", new { fog = fogLog, fogResult, slow = slowLog, slowOutcome });");
assert(scene.retry.slow.length < 3, "Retry<string>(2, ...) must stop after 2 attempts, not keep trying.");`,
        },
      ],
      unlocks: ["fl-retry"],
      checks: [
        {
          prompt: "Which of these is the safest to retry automatically after a timeout, when you cannot tell whether the first attempt actually happened?",
          question: {
            type: "choice",
            options: [
              "Setting the dimmer for the stage-left wash to level 80",
              "Adding 1 to the tickets-sold counter",
              "Charging an audience member's card for a ticket",
              "Texting the cast that the half-hour call has started",
            ],
            answer: 0,
          },
          explanation: "Setting a value is idempotent: doing it twice leaves the same result as doing it once. Incrementing, charging and messaging all change the world each time, so a retry after a lost reply can double the effect. Retry those only with an idempotency key that lets the receiver recognise a repeat.",
        },
        {
          prompt: "Fifty clients all fail at the same instant and retry using exponential backoff with **no jitter**. What does the struggling service see?",
          question: {
            type: "choice",
            options: [
              "All fifty calls again at the same moments (for example 4 ms, then 12 ms, then 28 ms later), in lockstep waves",
              "A perfectly smooth trickle, because the delays double",
              "Fifty calls spread evenly over the first 4 ms",
              "No further calls, because backoff gives up after the first failure",
            ],
            answer: 0,
          },
          explanation: "Identical clients with identical delays stay synchronised forever: backoff spaces the waves further apart but each wave is still the whole herd. Jitter breaks the symmetry by giving each client a slightly different wait, which flattens the waves into a spread.",
        },
        {
          prompt: "baseDelayMs is 4 and attempt 3 has just failed. What is the ceiling in milliseconds, using `baseDelayMs * (1 << (attempt - 1))`?",
          question: { type: "number", answer: 16, unit: "ms" },
          explanation: "`1 << 2` is 4, and 4 * 4 = 16. The ceilings run 4, 8, 16, 32: each failure doubles the room the service is given to recover.",
        },
      ],
    },
    // ───────────────────────── 15 ─────────────────────────
    {
      id: "csharp-delegates-15-breaker",
      title: "Circuit breaker and bulkhead",
      minutes: 45,
      xp: 240,
      concepts: ["circuit breaker", "state machine", "injected clock", "fail fast", "bulkhead", "SemaphoreSlim", "policy order"],
      learn: md`### When retrying makes things worse

Last lesson taught the desk to knock again, politely. That is the right answer to a hiccup and the wrong answer to a **dead part**. If the projector's power supply has failed, every retry waits out its pauses, fails anyway, and holds a task and a slot while it does. Worse, a flood of callers each running their own retry loop keeps leaning on a machine that might recover sooner if left alone.

A **circuit breaker** is the household fuse box taught to reset itself. After enough consecutive failures it stops sending calls through at all: they are refused instantly with an exception, for a cool-down period. Then it carefully tests whether the part is back.

### Three states

- **Closed**: calls pass through to the operation and consecutive failures are counted. When the count reaches the threshold the breaker becomes Open.
- **Open**: calls are refused at once and the operation is not touched. Once the cool-down has elapsed, the next caller turns the breaker HalfOpen.
- **HalfOpen**: calls are allowed through as a trial. One success makes it Closed again; one failure makes it Open again and restarts the cool-down.

Why a middle state at all? Going straight from Open back to Closed would send the full crowd back at a part that may still be broken, and the breaker would trip again after a burst of damage. HalfOpen means "prove it": one success is evidence, one failure sends us straight back with the timer reset. (Our breaker lets every caller through while HalfOpen. Production-grade ones admit a single probe at a time. The state machine is the same.)

Threshold 3 and cool-down 10 gives this story: three faults in a row open the breaker; the fourth press is refused without touching the projector; ten ticks later the next press is a trial, which fails and re-opens it; ten more ticks, another trial, which succeeds and closes it. Every move is recorded as text such as \`Closed -> Open\`, which is exactly what the Breaker panel draws.

### Time is a dependency, so inject it

The breaker must know "has the cool-down passed?". The tempting answer is to read \`DateTime.UtcNow\` inside it. Then your demo has to actually wait, and a test of "ten ticks later" is slow and flaky. Instead the constructor takes the clock as a delegate:

~~~csharp
long fakeNow = 0;
CircuitBreaker breaker = new(3, 10, () => fakeNow);   // threshold, cool-down, clock
...
fakeNow += 10;                                         // time passes, instantly
~~~

The lambda \`() => fakeNow\` is a closure over the *variable*, not its current value (lesson 2 again). Every time the breaker asks for the time it reads whatever \`fakeNow\` holds right then. Passing \`fakeNow\` itself would freeze the clock at 0 forever, and the compiler stops you, as the mistakes section shows. The same trick will come back in the wiring lesson: when a component takes the things it depends on from outside, it can be driven by a fake in a rehearsal.

### The breaker as a policy

The state machine lives in a small class; the policy simply consults it around the call:

~~~csharp
if (!circuit.TryEnter()) throw new BrokenCircuitException();   // fail fast
try
{
    T result = await inner(token);
    circuit.RecordSuccess();
    return result;
}
catch (Exception ex) when (ex is not OperationCanceledException)
{
    circuit.RecordFailure();
    throw;
}
~~~

Two details. The refusal is thrown *before* the \`try\`, so the breaker never counts its own rejections as failures. And cancellation is not a fault of the part: someone chose to stop, so it neither opens nor closes anything.

Callers meet \`BrokenCircuitException\` as a distinct, cheap, immediate signal. They can show "projector offline" or fall back to something else rather than wait. An unhandled one ends the program like any other exception: \`Unhandled exception. BrokenCircuitException: circuit open\`.

### Bulkhead: one slow thing must not sink the ship

A ship's bulkheads keep a leak in one compartment from flooding the rest. In software the shared compartment is usually a limited resource such as threads, connections or, here, the single operator who can run the spotlights. If the follow-spot system turns slow and every task in the program piles up waiting for it, nothing else gets served either.

A **bulkhead policy** caps how many calls may be inside an operation at once, and says no to the rest immediately:

~~~csharp
SemaphoreSlim slots = new(maxParallel);
...
if (!slots.Wait(0)) throw new BulkheadFullException(maxParallel);
try { return await inner(token); }
finally { slots.Release(); }
~~~

\`Wait(0)\` means "take a slot only if one is free right now" and returns \`false\` otherwise, without blocking. The \`finally\` is not optional: if a failed call forgot to release, the slots would leak one by one until every caller is rejected forever. Note that \`slots\` is created once per call to \`Bulkhead<T>\`, not per call to the operation, so all callers of the wrapped operation share it. Queueing callers instead of rejecting them is a legitimate alternative (\`WaitAsync\`), but then the queue itself needs a bound.

### Which order?

The list you give \`Wrap\` goes outer to inner, and the order changes meaning:

- **Breaker outside Retry**: the breaker sees one outcome per *logical* call, after all retries have been used up. Three failed operations open it.
- **Breaker inside Retry**: it sees every individual attempt, so three attempts of a single call can open it, and later retries then meet an instant refusal.
- **Bulkhead outside Retry** means a slot is held for the whole retry loop; the count is "operations in flight". Inside, a slot is held only while an attempt runs, and a retrying operation can lose its place between attempts.
- **Deadline innermost** gives each attempt its own budget; outermost it caps the entire operation.

There is no universal winner. Decide what you want each policy to count, then choose the order. The final lesson makes that choice for the whole show.

### Common mistakes

- **Passing the clock by value.** \`new CircuitBreaker(3, 10, fakeNow)\` fails with \`error CS1503: Argument 3: cannot convert from 'long' to 'System.Func<long>'\`. The parameter wants a function that returns the time: \`() => fakeNow\`.
- **Changing state from outside.** The breaker owns its state, which is why \`State\` has a private setter. \`breaker.State = BreakerState.Open;\` fails with \`error CS0272: The property or indexer 'CircuitBreaker.State' cannot be used in this context because the set accessor is inaccessible\`. Only the methods you gave it may move it.
- **Catching in the wrong order.** Writing \`catch (Exception)\` above \`catch (BrokenCircuitException)\` is rejected: \`error CS0160: A previous catch clause already catches all exceptions of this or of a super type ('Exception')\`. List specific exceptions first.
- **Counting rejections as failures.** If the breaker's own \`BrokenCircuitException\` is thrown inside the \`try\`, it increments the failure count and the circuit can never recover. Throw it before the \`try\`.
- **Forgetting \`Release\` in a \`finally\`.** No message appears; calls just start being rejected for no visible reason once enough have failed.
- **Never handling the exception.** A breaker that nobody catches turns an outage into a crash. Handle \`BrokenCircuitException\` where the call is made.`,
      mission: md`The projector that paints the painted moon onto the cyclorama failed three times during tech rehearsal, and each time the desk spent seconds retrying a dead power supply while the follow-spots stalled behind it. Odile Marsh wants the desk to notice, stop asking, check back only after a cool-down, and never let one slow system hold up the others.

You will write a circuit breaker and a bulkhead as policies that slot into the same \`Wrap\` as last lesson's retry and deadline. When the lesson passes, the **Breaker and bulkhead** panel lights up on the board: the state machine's path from Closed to Open to HalfOpen and back, and the callers the bulkhead turned away.`,
      tasks: [
        "Under the divider declare enum BreakerState { Closed, Open, HalfOpen } and class CircuitBreaker with constructor (int threshold, long openFor, Func<long> clock), BreakerState State { get; private set; } starting Closed, List<string> Transitions { get; } (each move adds $\"{State} -> {next}\", for example \"Closed -> Open\") and the methods bool TryEnter(), void RecordSuccess() and void RecordFailure(). TryEnter refuses (false) while Open and fewer than openFor ticks have passed since it opened; once they have, it moves to HalfOpen and allows the call. RecordSuccess resets the failure count and moves to Closed unless already there. RecordFailure counts it and, when HalfOpen or the count has reached the threshold, records the open time from clock() and moves to Open. Also declare class BrokenCircuitException : Exception (message \"circuit open\") and class BulkheadFullException : Exception with a constructor taking int limit",
        "Above the divider add long fakeNow = 0; and the generic local functions Policy<T> Breaker<T>(CircuitBreaker circuit) (throw BrokenCircuitException before the try when TryEnter is false; record success or failure around the call; never count OperationCanceledException) and Policy<T> Bulkhead<T>(int maxParallel) (one SemaphoreSlim per policy; if (!slots.Wait(0)) throw new BulkheadFullException(maxParallel); release in a finally)",
        "Build CircuitBreaker breaker = new(3, 10, () => fakeNow); int projectorCalls and async Task<string> Projector(CancellationToken token): count the call, await Task.Delay(1, token), throw InvalidOperationException($\"projector fault {projectorCalls}\") for the first four calls, otherwise return \"projector on\". Then Operation<string> guardedProjector = Wrap<string>(Projector, Breaker<string>(breaker)); List<string> outcomes; and async Task PressProjector() that awaits guardedProjector(CancellationToken.None) and adds \"ok\", or \"rejected\" for BrokenCircuitException, or \"failed\" for InvalidOperationException",
        "Run the script: PressProjector three times, print $\"after three faults the breaker is {breaker.State}\", press once, add 10 to fakeNow, press twice, add 10 to fakeNow, press twice. Print \"outcomes: \" + string.Join(\", \", outcomes), \"transitions: \" + string.Join(\"; \", breaker.Transitions) and $\"the projector itself was called {projectorCalls} times\"",
        "Add async Task<string> SlowSpot(CancellationToken token) (await Task.Delay(20, token), return \"lit\"), Operation<string> limited = Wrap<string>(SlowSpot, Bulkhead<string>(2)) and async Task<string> Caller() that returns the result or \"rejected\" on BulkheadFullException. Start three at once with string[] crowd = await Task.WhenAll(Caller(), Caller(), Caller()); and print \"three at once, two slots: \" + string.Join(\", \", crowd). Finish with Desk.Show(\"breaker\", new { outcomes, transitions = breaker.Transitions, finalState = breaker.State.ToString(), serviceCalls = projectorCalls, bulkhead = crowd });",
      ],
      starterAdd: cs`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 15: circuit breaker and bulkhead. Add your code below, in this order.
// 1. Below the divider: enum BreakerState, class CircuitBreaker, class BrokenCircuitException, class BulkheadFullException.
//      CircuitBreaker(int threshold, long openFor, Func<long> clock)
//        State { get; private set; } = Closed;   Transitions { get; } = new();   fields: failures, openedAt
//        bool TryEnter()      Open and clock() - openedAt < openFor -> false; Open and cooled down -> MoveTo(HalfOpen); return true
//        void RecordSuccess() failures = 0; if not Closed -> MoveTo(Closed)
//        void RecordFailure() failures++; if HalfOpen or failures >= threshold -> openedAt = clock(); MoveTo(Open)
//        void MoveTo(BreakerState next)   Transitions.Add($"{State} -> {next}"); State = next;
// 2. Here: long fakeNow = 0;  Policy<T> Breaker<T>(CircuitBreaker circuit)  Policy<T> Bulkhead<T>(int maxParallel)
// 3. breaker = new(3, 10, () => fakeNow), Projector (fails its first four calls), guardedProjector, outcomes, PressProjector.
//    Script: press x3, print the state line, press, fakeNow += 10, press x2, fakeNow += 10, press x2, then print the three summary lines.
//      after three faults the breaker is Open
//      outcomes: failed, failed, failed, rejected, failed, rejected, ok, ok
//      transitions: Closed -> Open; Open -> HalfOpen; HalfOpen -> Open; Open -> HalfOpen; HalfOpen -> Closed
//      the projector itself was called 6 times
// 4. SlowSpot, limited = Wrap<string>(SlowSpot, Bulkhead<string>(2)), Caller(), crowd = await Task.WhenAll(Caller(), Caller(), Caller());
//      three at once, two slots: lit, lit, rejected
// 5. Desk.Show("breaker", new { outcomes, transitions = breaker.Transitions, finalState = breaker.State.ToString(), serviceCalls = projectorCalls, bulkhead = crowd });

${TYPES_DIVIDER}

// ─── ✏️ YOUR TURN ─── declare the breaker and the two exceptions here.
//   enum BreakerState { Closed, Open, HalfOpen }
//   class CircuitBreaker { ... }
//   class BrokenCircuitException : Exception { ... }
//   class BulkheadFullException : Exception { ... }
`,
      solutionAdd: cs`// Lesson 15: circuit breaker and bulkhead.
long fakeNow = 0;

Policy<T> Breaker<T>(CircuitBreaker circuit)
{
    return inner => async token =>
    {
        if (!circuit.TryEnter())
        {
            throw new BrokenCircuitException();
        }
        try
        {
            T result = await inner(token);
            circuit.RecordSuccess();
            return result;
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            circuit.RecordFailure();
            throw;
        }
    };
}

Policy<T> Bulkhead<T>(int maxParallel)
{
    SemaphoreSlim slots = new(maxParallel);
    return inner => async token =>
    {
        if (!slots.Wait(0))
        {
            throw new BulkheadFullException(maxParallel);
        }
        try
        {
            return await inner(token);
        }
        finally
        {
            slots.Release();
        }
    };
}

CircuitBreaker breaker = new(3, 10, () => fakeNow);
int projectorCalls = 0;
async Task<string> Projector(CancellationToken token)
{
    projectorCalls++;
    await Task.Delay(1, token);
    if (projectorCalls <= 4)
    {
        throw new InvalidOperationException($"projector fault {projectorCalls}");
    }
    return "projector on";
}

Operation<string> guardedProjector = Wrap<string>(Projector, Breaker<string>(breaker));
List<string> outcomes = new();

async Task PressProjector()
{
    try
    {
        await guardedProjector(CancellationToken.None);
        outcomes.Add("ok");
    }
    catch (BrokenCircuitException)
    {
        outcomes.Add("rejected");
    }
    catch (InvalidOperationException)
    {
        outcomes.Add("failed");
    }
}

await PressProjector();
await PressProjector();
await PressProjector();
Console.WriteLine($"after three faults the breaker is {breaker.State}");
await PressProjector();
fakeNow += 10;
await PressProjector();
await PressProjector();
fakeNow += 10;
await PressProjector();
await PressProjector();
Console.WriteLine("outcomes: " + string.Join(", ", outcomes));
Console.WriteLine("transitions: " + string.Join("; ", breaker.Transitions));
Console.WriteLine($"the projector itself was called {projectorCalls} times");

async Task<string> SlowSpot(CancellationToken token)
{
    await Task.Delay(20, token);
    return "lit";
}

Operation<string> limited = Wrap<string>(SlowSpot, Bulkhead<string>(2));
async Task<string> Caller()
{
    try
    {
        return await limited(CancellationToken.None);
    }
    catch (BulkheadFullException)
    {
        return "rejected";
    }
}

string[] crowd = await Task.WhenAll(Caller(), Caller(), Caller());
Console.WriteLine("three at once, two slots: " + string.Join(", ", crowd));

Desk.Show("breaker", new
{
    outcomes,
    transitions = breaker.Transitions,
    finalState = breaker.State.ToString(),
    serviceCalls = projectorCalls,
    bulkhead = crowd,
});

${TYPES_DIVIDER}

enum BreakerState
{
    Closed,
    Open,
    HalfOpen,
}

class CircuitBreaker
{
    readonly int threshold;
    readonly long openFor;
    readonly Func<long> clock;
    int failures;
    long openedAt;

    public BreakerState State { get; private set; } = BreakerState.Closed;
    public List<string> Transitions { get; } = new();

    public CircuitBreaker(int threshold, long openFor, Func<long> clock)
    {
        this.threshold = threshold;
        this.openFor = openFor;
        this.clock = clock;
    }

    public bool TryEnter()
    {
        if (State == BreakerState.Open)
        {
            if (clock() - openedAt < openFor)
            {
                return false;
            }
            MoveTo(BreakerState.HalfOpen);
        }
        return true;
    }

    public void RecordSuccess()
    {
        failures = 0;
        if (State != BreakerState.Closed)
        {
            MoveTo(BreakerState.Closed);
        }
    }

    public void RecordFailure()
    {
        failures++;
        if (State == BreakerState.HalfOpen || failures >= threshold)
        {
            openedAt = clock();
            MoveTo(BreakerState.Open);
        }
    }

    void MoveTo(BreakerState next)
    {
        Transitions.Add($"{State} -> {next}");
        State = next;
    }
}

class BrokenCircuitException : Exception
{
    public BrokenCircuitException() : base("circuit open")
    {
    }
}

class BulkheadFullException : Exception
{
    public BulkheadFullException(int limit) : base($"bulkhead full ({limit} at once)")
    {
    }
}`,
      explanation:
        "The CircuitBreaker class is a three-state machine that only its own methods can move: three consecutive failures while Closed open it, TryEnter refuses calls until the injected clock shows the cool-down has passed, and the first caller after that finds it HalfOpen, where one success closes it and one failure re-opens it with a fresh timer. Breaker<T> turns that into a policy by asking TryEnter before the call (throwing BrokenCircuitException outside the try so rejections are never counted) and recording the outcome after it. The scripted presses therefore give failed, failed, failed, rejected, failed, rejected, ok, ok, and the projector is only really called six times because two presses were refused. Bulkhead<T> uses SemaphoreSlim.Wait(0) as a non-blocking try-acquire, releases in a finally, and so lets two of three simultaneous callers into SlowSpot while the third is turned away immediately.",
      hints: [
        { id: "h1", title: "Start with the state machine", content: "Write CircuitBreaker first and keep every state change in one private method, MoveTo(BreakerState next), that records the transition text and then assigns State. TryEnter, RecordSuccess and RecordFailure each decide only whether to call MoveTo." },
        { id: "h2", title: "Shape of the two policies", content: "Breaker<T>: return inner => async token => { if (!circuit.TryEnter()) throw new BrokenCircuitException(); try { T result = await inner(token); circuit.RecordSuccess(); return result; } catch (Exception ex) when (ex is not OperationCanceledException) { circuit.RecordFailure(); throw; } }; Bulkhead<T> creates SemaphoreSlim slots = new(maxParallel); before the return, then Wait(0) / try / finally Release." },
        { id: "h3", title: "The script and the clock", content: "The clock argument is a function: new(3, 10, () => fakeNow). Press three times, print the state, press once more (rejected), fakeNow += 10, press twice (trial fails, then rejected), fakeNow += 10, press twice (trial succeeds, then ok). If your outcomes differ, print breaker.Transitions after each press to see which move happened." },
      ],
      tests: [
        {
          id: "t1",
          description: "three consecutive failures open the breaker",
          assertionCode: js`
assert(lines.includes("after three faults the breaker is Open"), 'No line is exactly "after three faults the breaker is Open". Press the projector three times (it fails each time), then print $"after three faults the breaker is {breaker.State}". If it says Closed, RecordFailure is not moving to Open at the threshold.');`,
        },
        {
          id: "t2",
          description: "a refused call is rejected instantly and the clock lets a trial through",
          assertionCode: js`
assert(lines.includes("outcomes: failed, failed, failed, rejected, failed, rejected, ok, ok"), 'Expected the line "outcomes: failed, failed, failed, rejected, failed, rejected, ok, ok". Presses 1 to 3 fail, press 4 is rejected while Open, after fakeNow += 10 press 5 is a failing trial, press 6 is rejected again, and after another 10 press 7 succeeds and press 8 is ok. Got: ' + (lines.find((l) => l.startsWith("outcomes:")) ?? "no outcomes line"));
assertEqual(scene.breaker?.outcomes, ["failed", "failed", "failed", "rejected", "failed", "rejected", "ok", "ok"], "scene.breaker.outcomes");`,
        },
        {
          id: "t3",
          description: "the breaker walks Closed, Open, HalfOpen and back, and records every move",
          assertionCode: js`
const want = ["Closed -> Open", "Open -> HalfOpen", "HalfOpen -> Open", "Open -> HalfOpen", "HalfOpen -> Closed"];
assert(lines.includes("transitions: " + want.join("; ")), 'Expected the line "transitions: ' + want.join("; ") + '". Record each move in CircuitBreaker.Transitions as $"{State} -> {next}" before changing State. Got: ' + (lines.find((l) => l.startsWith("transitions:")) ?? "no transitions line"));
assertEqual(scene.breaker?.transitions, want, "scene.breaker.transitions");
assertEqual(scene.breaker?.finalState, "Closed", "scene.breaker.finalState: after the successful trial the breaker is Closed again");`,
        },
        {
          id: "t4",
          description: "rejected calls never reach the projector",
          assertionCode: js`
assert(lines.includes("the projector itself was called 6 times"), 'Expected "the projector itself was called 6 times": 8 presses minus 2 that were rejected by the open breaker. If you see 8, the breaker is calling the operation even while Open.');
assertEqual(scene.breaker?.serviceCalls, 6, "scene.breaker.serviceCalls");`,
        },
        {
          id: "t5",
          description: "the bulkhead lets two callers in and rejects the third at once",
          assertionCode: js`
assert(lines.includes("three at once, two slots: lit, lit, rejected"), 'Expected "three at once, two slots: lit, lit, rejected". Bulkhead<string>(2) must use slots.Wait(0) so a full bulkhead throws BulkheadFullException immediately instead of waiting, and Caller() must turn that exception into "rejected". Got: ' + (lines.find((l) => l.startsWith("three at once")) ?? "no such line"));
assertEqual(scene.breaker?.bulkhead, ["lit", "lit", "rejected"], "scene.breaker.bulkhead");`,
        },
      ],
      unlocks: ["fl-breaker"],
      checks: [
        {
          prompt: "Why does the breaker move to HalfOpen after the cool-down instead of going straight back to Closed?",
          question: {
            type: "choice",
            options: [
              "So that a single trial call can prove the part has recovered before the whole crowd is sent back at it",
              "Because C# cannot move directly between two states",
              "To make the cool-down last twice as long",
              "So that failures stop being counted",
            ],
            answer: 0,
          },
          explanation: "Closed means 'trusted'. After a failure we do not yet know the part is healthy, so HalfOpen lets a probe through. If it succeeds the breaker closes; if it fails the breaker re-opens with a fresh cool-down, having risked one call instead of a flood.",
        },
        {
          prompt: "A policy stack is written `Wrap(op, Breaker(b), Retry(3, ...))`. The operation fails every time, and each logical call makes three attempts. How many failures does the breaker count per logical call?",
          question: {
            type: "choice",
            options: [
              "One: it is outside Retry, so it only sees the final outcome after the attempts are used up",
              "Three: it sees every attempt",
              "Zero: breakers ignore exceptions",
              "Two: the first attempt is free",
            ],
            answer: 0,
          },
          explanation: "The first policy in the list is the outermost. Breaker wraps Retry, so Retry swallows the first two failures and only the third escapes to the breaker as a single failure. Swapping the order would make the breaker count each attempt.",
        },
        {
          prompt: "A bulkhead allows 2 callers at once and rejects the rest immediately. Five callers start together and each holds its slot for 20 ms. How many are rejected?",
          question: { type: "number", answer: 3 },
          explanation: "Two get a slot and run; the other three find none free at the moment they ask and throw at once. Nobody waits and nothing queues, so a slow operation cannot pile up unlimited work behind it.",
        },
      ],
    },
    ...chapter5b,
  ],
};
