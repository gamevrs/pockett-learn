import type { Chapter } from "@/engine/types";
import { t } from "./tag.ts";

/**
 * Form Forge, chapter 3: When things go wrong.
 * Errors you throw and catch on purpose, and JSON going in and coming out.
 *
 * Authoring notes: see tag.ts.
 */

export const chapter3: Chapter = {
  id: "when-things-go-wrong",
  title: "When things go wrong",
  blurb: "Errors with names and causes, and JSON in both directions.",
  lessons: [
    // ───────────────────────── 8 ─────────────────────────
    {
      id: "form-forge-8-errors",
      title: "Errors you can read",
      minutes: 35,
      xp: 150,
      concepts: ["throw", "try / catch / finally", "Error subclasses", "error.cause", "rethrowing", "never swallow"],
      learn: t`### Errors are objects

When JavaScript cannot continue, it **throws** an error. If nothing catches it, the current function stops, then the caller stops, and so on up the call stack until the program (or the page's event handler) dies with a message. Errors are ordinary objects with three useful properties:

~~~js
try {
  null.length;
} catch (error) {
  error.name;      // "TypeError"          the kind of error
  error.message;   // "Cannot read properties of null (reading 'length')"
  error.stack;     // where it happened, as text
}
~~~

You raise your own with ^^throw^^. Always throw an ^^Error^^ (or a subclass), never a bare string: only an ^^Error^^ records a stack trace.

~~~js
function parseQuantity(text) {
  const n = Number(text);
  if (!Number.isInteger(n) || n < 1) throw new RangeError(^^Bad quantity: $\{text}^^);
  return n;
}
~~~

### try, catch, finally

~~~js
try {
  riskyThing();            // if this throws, the rest of the block is skipped
} catch (error) {
  handle(error);           // runs only after a throw
} finally {
  cleanUp();               // runs ALWAYS: after success, after a catch, even if the block returned or threw
}
~~~

^^finally^^ is for cleanup that must happen no matter what: releasing a lock, hiding a spinner, counting that an attempt finished. A ^^return^^ inside ^^try^^ still runs the ^^finally^^ first. (If your code does not use the error, you may write ^^catch {^^ without a name.)

### Your own error types

Give recurring problems their own class so callers can tell them apart:

~~~js
class ValidationError extends Error {
  constructor(message, { field = "", code = "invalid", cause } = {}) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = "ValidationError";    // otherwise it would say "Error"
    this.field = field;
    this.code = code;
  }
}

const err = new ValidationError("Enter an email", { field: "email", code: "required" });
err instanceof ValidationError;   // true
err instanceof Error;             // true
String(err);                      // "ValidationError: Enter an email"
~~~

Remember ^^super(...)^^ must run before you touch ^^this^^, and you must use ^^new^^ to create one.

### Catch only what you can handle

A bad email address is not a bug, it is a normal event: a shopper typed something wrong. A ^^TypeError^^ from reading a property of ^^undefined^^ is different: that is a **programming mistake**, and you want it to be loud, not hidden behind a friendly message. So catch the specific type and **rethrow everything else**:

~~~js
try {
  checkAddress(form);
} catch (error) {
  if (!(error instanceof ValidationError)) throw error;   // a bug: let it surface
  showMessage(error.message);
}
~~~

### Causes: keep the story

When a low-level failure is turned into a friendlier one, attach the original as the **cause** so nothing is lost. Without it, you replace a rich stack trace with a message string.

~~~js
try {
  JSON.parse(text);
} catch (cause) {
  throw new ValidationError("Your saved draft is damaged", { code: "corrupt", cause });
}
~~~

A debugger (and your own helper) can then walk ^^error.cause^^ down to the root reason.

### Throw or return?

- **Expected failures** that callers must handle (invalid input) can be thrown, or returned as data (for example ^^{ ok: false, error }^^). The "result object" style is easy to display and cannot be forgotten.
- **Impossible situations and bugs** should throw.
- Pick one convention per layer, and say so. A function that sometimes returns an error value and sometimes throws is a trap.

### Never swallow an error

The worst code in any codebase is an error handler that makes the problem vanish:

~~~js
try { save(order); } catch (e) {}                 // silence: the order is lost and nobody knows
try { save(order); } catch (e) { console.log(e) } // slightly better, but the program carries on as if it worked
~~~

Handle it (show a message, retry, fall back), or record it and rethrow. A catch block that does neither is a bug waiting to happen.

### Common mistakes

- **^^throw "oops"^^.** No stack trace, no ^^name^^, no ^^instanceof^^.
- **Forgetting ^^this.name^^**, so every custom error prints as ^^Error^^.
- **Wrapping a whole function in one huge ^^try^^.** Keep the protected block as small as possible, so you know what failed.
- **Catching ^^Error^^ broadly** and hiding bugs.
- **Rethrowing a new ^^Error(e.message)^^**, which throws away the stack. Pass ^^{ cause: e }^^ instead.
- **Counting on ^^finally^^ to change a return value** from ^^try^^: a ^^return^^ in ^^finally^^ overrides everything, which is rarely intended.`,
      mission: t`Payment fields are where bugs cost real money. The engine needs its own vocabulary of errors, so it can say "this expiry date is the wrong format" differently from "this card has expired", and so a genuine programming mistake never gets mistaken for a typo.

Build ValidationError, a helper that wraps a risky check and reports the outcome as plain data, and a counter that stays honest even when something blows up. When you Run, the **error console** appears: type an expiry date and watch the errors, their codes and their cause chains.`,
      tasks: [
        "class ValidationError extends Error with name, field and code, and an optional cause",
        "errorChain(error): [\"Name: message\", ...] following the cause links (stop after 10)",
        "assertExpiry(text, today) throws ValidationError('format' / 'expired'), using parseExpiry",
        "attempt(task) returns { ok, value } or { ok: false, error }, rethrows non-validation errors, and counts started / finished / failed (finally!)",
      ],
      starterAdd: t`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 8: errors with names, causes and clean-up.

// 1. A ValidationError is an Error with a field name and a machine-readable code.
//      new ValidationError("Enter a number", { field: "qty", code: "required", cause: original })
//    - name is "ValidationError"
//    - field defaults to "", code defaults to "invalid"
//    - pass cause to super ONLY when one was given (so "cause" in err is false otherwise)
class ValidationError extends Error {
  // TODO: constructor(message, { field, code, cause } = {})
}

// 2. ["ValidationError: outer", "TypeError: inner"]: the error, then its cause, then ITS cause...
//    A cause that is not an Error is added with String(cause) and ends the chain.
//    Stop after 10 entries so a circular chain cannot loop forever.
function errorChain(error) {
  // TODO
}

// 3. today is { year: 2026, month: 10 }. parseExpiry(text) gives { month, year } or null.
//    - not parseable:  throw ValidationError("Use the format MM/YY, like 08/28", field "expiry", code "format")
//    - already expired (a card works through the END of its month): throw
//        ValidationError("This card expired in 03/2024", field "expiry", code "expired")
//      (month padded to two digits with padStart)
//    - otherwise return the parsed { month, year }
function assertExpiry(text, today) {
  // TODO
}

// 4. Run task() and report what happened as data:
//      success:                 { ok: true, value: <what task returned> }
//      a ValidationError:       { ok: false, error: { name, message, field, code, chain } }
//      any other kind of error: it is a bug, so RETHROW it unchanged
//    The counters below must stay truthful: started++ when the attempt begins, failed++
//    for a ValidationError, and finished++ in a finally block, whatever happened.
const attempts = { started: 0, finished: 0, failed: 0 };
function attempt(task) {
  // TODO
}

// A copy of the counters (changing the copy must not change the real numbers).
function attemptStats() {
  // TODO
}

// The check the form calls: wrap assertExpiry in attempt.
function checkExpiry(text, today) {
  // TODO
}
`,
      solutionAdd: t`class ValidationError extends Error {
  constructor(message, { field = "", code = "invalid", cause } = {}) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = "ValidationError";
    this.field = field;
    this.code = code;
  }
}

function errorChain(error) {
  const chain = [];
  let current = error;
  while (current !== undefined && chain.length < 10) {
    if (current instanceof Error) {
      chain.push(^^$\{current.name}: $\{current.message}^^);
      current = current.cause;
    } else {
      chain.push(String(current));
      break;
    }
  }
  return chain;
}

function assertExpiry(text, today) {
  const expiry = parseExpiry(text);
  if (!expiry) {
    throw new ValidationError("Use the format MM/YY, like 08/28", { field: "expiry", code: "format" });
  }
  const expired = expiry.year < today.year || (expiry.year === today.year && expiry.month < today.month);
  if (expired) {
    throw new ValidationError(^^This card expired in $\{String(expiry.month).padStart(2, "0")}/$\{expiry.year}^^, { field: "expiry", code: "expired" });
  }
  return expiry;
}

const attempts = { started: 0, finished: 0, failed: 0 };

function attempt(task) {
  attempts.started++;
  try {
    return { ok: true, value: task() };
  } catch (error) {
    if (!(error instanceof ValidationError)) throw error;
    attempts.failed++;
    return {
      ok: false,
      error: { name: error.name, message: error.message, field: error.field, code: error.code, chain: errorChain(error) },
    };
  } finally {
    attempts.finished++;
  }
}

function attemptStats() {
  return { ...attempts };
}

function checkExpiry(text, today) {
  return attempt(() => assertExpiry(text, today));
}`,
      explanation:
        "ValidationError calls super() first, passes the cause along only when there is one (an explicit { cause: undefined } would still create a property), and then sets name, field and code. errorChain walks the cause links with a loop and a hard stop, so even a circular chain ends. assertExpiry reuses parseExpiry from the regex chapter and turns each kind of failure into a precise code, which is what a form needs to show the right message. attempt is the heart of the lesson: it counts the start, returns success as data, converts only ValidationError into data, and rethrows anything else because that would be a bug; finally runs in all three paths, so started and finished never drift apart.",
      hints: [
        {
          id: "h1",
          title: "The class",
          content:
            "constructor(message, { field = '', code = 'invalid', cause } = {}) { super(message, cause === undefined ? undefined : { cause }); this.name = 'ValidationError'; this.field = field; this.code = code; }",
        },
        {
          id: "h2",
          title: "Chain and expiry",
          content:
            "errorChain: let current = error; loop while current !== undefined and chain.length < 10; if it is an Error push name + ': ' + message and move to current.cause; otherwise push String(current) and break. assertExpiry: expired when expiry.year < today.year || (expiry.year === today.year && expiry.month < today.month).",
        },
        {
          id: "h3",
          title: "attempt",
          content:
            "attempts.started++ first. try { return { ok: true, value: task() }; } catch (error) { if (!(error instanceof ValidationError)) throw error; attempts.failed++; return { ok: false, error: {...} }; } finally { attempts.finished++; }. checkExpiry is a one-liner: return attempt(() => assertExpiry(text, today)).",
        },
      ],
      tests: [
        {
          id: "t1",
          description: "ValidationError is a proper Error with name, field and code",
          assertionCode: t`const err = new ValidationError("Enter an email", { field: "email", code: "required" });
assert(err instanceof Error, "ValidationError must extend Error");
assert(err instanceof ValidationError, "instanceof ValidationError should work (did you forget new or extends?)");
assert(err.name === "ValidationError", "name should be 'ValidationError' (set this.name in the constructor)");
assert(err.message === "Enter an email", "message should be the first argument");
assert(err.field === "email" && err.code === "required", "field and code should be stored");
assert(String(err) === "ValidationError: Enter an email", "String(err) should read 'ValidationError: Enter an email'");
assert(typeof err.stack === "string" && err.stack.length > 0, "An Error keeps its stack trace");
const plain = new ValidationError("x");
assert(plain.field === "" && plain.code === "invalid", "defaults: field '' and code 'invalid'");`,
        },
        {
          id: "t2",
          description: "ValidationError keeps its cause only when one is given",
          assertionCode: t`const inner = new TypeError("inner problem");
const outer = new ValidationError("outer", { cause: inner });
assert(outer.cause === inner, "The cause option should be stored as error.cause (pass { cause } to super)");
assert(!("cause" in new ValidationError("no cause")), "Without a cause there should be no cause property at all");`,
        },
        {
          id: "t3",
          description: "errorChain follows causes to the root",
          assertionCode: t`const root = new RangeError("root");
const mid = new TypeError("mid", { cause: root });
const top = new ValidationError("top", { cause: mid });
assertEqual(errorChain(top), ["ValidationError: top", "TypeError: mid", "RangeError: root"], "errorChain(top)");
assertEqual(errorChain(new Error("boom")), ["Error: boom"], "a single error");
assertEqual(errorChain(new Error("a", { cause: "plain text" })), ["Error: a", "plain text"], "a cause that is not an Error ends the chain as text");
const loop = new Error("loop");
loop.cause = loop;
assert(errorChain(loop).length === 10, "A circular chain must stop after 10 entries");`,
        },
        {
          id: "t4",
          description: "assertExpiry returns valid dates and throws coded ValidationErrors",
          assertionCode: t`const today = { year: 2026, month: 10 };
assertEqual(assertExpiry("12/30", today), { month: 12, year: 2030 }, "a future card");
assertEqual(assertExpiry("10/26", today), { month: 10, year: 2026 }, "a card is good through the END of its month");
function codeOf(text) {
  try {
    assertExpiry(text, today);
  } catch (error) {
    assert(error instanceof ValidationError, "assertExpiry should throw a ValidationError, got " + error.name);
    assert(error.field === "expiry", "The error's field should be 'expiry'");
    return error;
  }
  return null;
}
assert(codeOf("nonsense")?.code === "format", "Unparseable text should have code 'format'");
assert(codeOf("09/26")?.code === "expired", "Last month is expired");
assert(codeOf("01/20")?.code === "expired", "A past year is expired");
assert(codeOf("03/24")?.message === "This card expired in 03/2024", "The expired message should show month and year: 'This card expired in 03/2024'");
assert(codeOf("")?.message === "Use the format MM/YY, like 08/28", "The format message should be 'Use the format MM/YY, like 08/28'");`,
        },
        {
          id: "t5",
          description: "attempt reports successes and ValidationErrors as data",
          assertionCode: t`const good = attempt(() => 42);
assert(good.ok === true && good.value === 42, "A task that returns 42 should give { ok: true, value: 42 }");
const bad = attempt(() => {
  throw new ValidationError("Nope", { field: "qty", code: "range", cause: new RangeError("deep") });
});
assert(bad.ok === false, "A ValidationError should give ok: false");
assert(bad.error.name === "ValidationError" && bad.error.message === "Nope" && bad.error.field === "qty" && bad.error.code === "range", "error should carry name, message, field and code");
assertEqual(bad.error.chain, ["ValidationError: Nope", "RangeError: deep"], "error.chain should list the cause chain");`,
        },
        {
          id: "t6",
          description: "attempt rethrows real bugs instead of hiding them",
          assertionCode: t`let caught = null;
try {
  attempt(() => {
    const nothing = null;
    return nothing.value;
  });
} catch (error) {
  caught = error;
}
assert(caught instanceof TypeError, "A TypeError is a bug, not a validation problem: attempt must rethrow it unchanged");
let thrown = null;
try {
  attempt(() => {
    throw "a string";
  });
} catch (error) {
  thrown = error;
}
assert(thrown === "a string", "Even odd thrown values must pass straight through");`,
        },
        {
          id: "t7",
          description: "The counters stay truthful, because finally always runs",
          assertionCode: t`const before = attemptStats();
attempt(() => 1);
attempt(() => {
  throw new ValidationError("x");
});
try {
  attempt(() => {
    throw new Error("bug");
  });
} catch {}
const after = attemptStats();
assert(after.started - before.started === 3, "started should have gone up by 3");
assert(after.failed - before.failed === 1, "only the ValidationError counts as failed");
assert(after.finished - before.finished === 3, "finished must go up by 3, even for the attempt that threw (use finally)");
after.started = 999;
assert(attemptStats().started !== 999, "attemptStats() should return a COPY of the counters");`,
        },
        {
          id: "t8",
          description: "checkExpiry wraps assertExpiry with attempt",
          assertionCode: t`const today = { year: 2026, month: 10 };
const ok = checkExpiry("11/27", today);
assert(ok.ok === true && ok.value.month === 11 && ok.value.year === 2027, "A valid date should give { ok: true, value: { month, year } }");
const bad = checkExpiry("01/20", today);
assert(bad.ok === false && bad.error.code === "expired", "An old date should give ok: false with code 'expired'");
assert(checkExpiry("soon", today).error.code === "format", "Junk should give code 'format'");`,
        },
      ],
      checks: [
        {
          prompt: t`What does this print? ^^function f() { try { return "try"; } finally { console.log("finally"); } }  console.log(f());^^`,
          question: { type: "choice", options: ["try only", "finally, then try", "try, then finally", "finally only"], answer: 1 },
          explanation: "The return value is computed first, but the finally block still runs before the function actually returns, so 'finally' is logged first, then the caller logs 'try'.",
        },
        {
          prompt: t`Why does ^^attempt^^ rethrow errors that are not ValidationErrors?`,
          question: {
            type: "choice",
            options: [
              "To make the program slower",
              "Because a TypeError or similar is a programming bug that must stay visible, not be shown to shoppers as a validation message",
              "Because catch can only handle one error type",
              "Because ValidationError cannot be thrown twice",
            ],
            answer: 1,
          },
          explanation: "Expected problems (bad input) are handled; unexpected ones (bugs) must surface so they are noticed and fixed. Swallowing them hides defects.",
        },
        {
          prompt: t`When wrapping a low-level error in a friendlier one, what should you pass along?`,
          question: { type: "choice", options: ["new Error(e.message)", "Nothing; a new message is enough", "{ cause: e }", "e.stack as a string"], answer: 2 },
          explanation: "The cause option keeps the original error object (with its own stack) attached. new Error(e.message) throws that information away.",
        },
      ],
      unlocks: ["ff-errors"],
    },

    // ───────────────────────── 9 ─────────────────────────
    {
      id: "form-forge-9-json-in",
      title: "JSON in: parse without panic",
      minutes: 30,
      xp: 150,
      concepts: ["JSON syntax", "JSON.parse", "SyntaxError handling", "reviver", "parsing is not validating", "untrusted input"],
      learn: t`### What JSON is

**JSON** is a text format for data: it is how browsers and servers talk, how configs are stored, and how a half-finished form can be saved. It looks like JavaScript, but it is a strict, tiny subset:

~~~text
{
  "fullName": "Ada Lovelace",
  "newsletter": true,
  "postcode": "SW1A 1AA",
  "items": [{ "sku": "KB-01", "qty": 2 }],
  "coupon": null
}
~~~

- Keys and strings use **double quotes only**.
- Values are: object, array, string, number, ^^true^^, ^^false^^ or ^^null^^. That is all.
- **No** trailing commas, comments, single quotes, ^^undefined^^, ^^NaN^^, functions or dates.

### JSON.parse

~~~js
JSON.parse('{"qty": 2}');     // { qty: 2 }
JSON.parse("[1, 2, 3]");      // [1, 2, 3]
JSON.parse("true");           // true
JSON.parse('"hi"');           // "hi"
~~~

Bad text throws a **SyntaxError**. Because you did not write the text, always wrap the call:

~~~js
try {
  const data = JSON.parse(text);
} catch (error) {
  if (!(error instanceof SyntaxError)) throw error;
  // text was not JSON at all
}
~~~

Details worth knowing:

- The wording of the error message differs between browsers. Show your own friendly message, and keep the original as the ^^cause^^; do not parse the message with code.
- ^^JSON.parse(undefined)^^ throws (the text is "undefined"), but ^^JSON.parse(null)^^ quietly returns ^^null^^, and ^^JSON.parse(5)^^ returns ^^5^^. Check ^^typeof text === "string"^^ first.
- Numbers larger than 2^53 lose precision. IDs that big should travel as strings.
- Parsing never runs code. (Unlike ^^eval^^, which you should never use on data.)

### The reviver: transform while parsing

^^JSON.parse(text, reviver)^^ calls your function for every key/value pair, **innermost first**. Return a new value to replace it, the same value to keep it, or ^^undefined^^ to delete the key.

~~~js
JSON.parse('{"createdAt": "2026-01-02T10:00:00Z", "name": "Ada"}', (key, value) =>
  key.endsWith("At") ? new Date(value) : value,
);
// { createdAt: Date, name: "Ada" }
~~~

JSON has no date type, so dates travel as ISO 8601 strings (^^2026-01-02T10:00:00Z^^). Convert them in one place: the reviver. Remember it is also called for nested keys, so the same key name at any depth is affected, and the final call has the key ^^""^^ for the root.

### Parsing is not validating

This is the most important idea in this lesson. ^^JSON.parse^^ only proves the text is *well-formed*. It says nothing about whether the *content* is what you expect:

~~~js
const data = JSON.parse(userText);   // could be an array, a number, null, or an object with surprise keys
data.email.trim();                   // TypeError if data is null, or email is missing, or not a string
~~~

After parsing untrusted JSON, check its **shape**: is it an object, not an array or ^^null^^? Which keys do you accept? Is each value the right type? A safe pattern is an **allow-list**: build a new object from the keys you know about, and ignore everything else. That also defuses hostile keys such as ^^"__proto__"^^ or ^^"constructor"^^, which are just ordinary data to ^^JSON.parse^^ but can cause damage if you later merge the object into another one with a naive deep-merge.

### Common mistakes

- **No try/catch** around ^^JSON.parse^^ on data you did not write (localStorage, URL parameters, request bodies).
- **Using the parsed value without checking its shape.**
- **Parsing a value that is already an object**, for example ^^JSON.parse(response.data)^^ when it was parsed already (JSON.parse turns it into the text "[object Object]", which is not valid JSON).
- **Expecting dates or Maps to come back as Dates and Maps.** They come back as strings and plain objects.
- **Trusting size.** A huge payload can freeze a page. Limit what you accept.`,
      mission: t`Shoppers close tabs mid-checkout, so the form saves a draft as JSON and offers to restore it later. But that text sits in storage where anything can happen to it: extensions rewrite it, older versions of the site saved postcodes as numbers, and sometimes it is simply broken.

Write a safe reader that never crashes, turns problems into your ValidationError (with the original SyntaxError as its cause), and only lets known, correctly-typed fields through. When you Run, a **draft restore** panel appears: load a good draft, an old one, and a broken one, and see what your code makes of each.`,
      tasks: [
        "readJson(text, reviver): JSON.parse that throws ValidationError('json', cause) for bad text and ValidationError('type') for non-strings",
        "parseJson(text) using your attempt: { ok: true, value } or { ok: false, error }",
        "loadDraft(text): a reviver fixes numeric postcode/phone, the result must be an object, and only known string fields survive",
        "parseWithDates(text): a reviver turns ISO date strings under keys ending in 'At' into Date objects",
      ],
      starterAdd: t`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 9: read JSON that you cannot trust.

// 1. Parse text (with an optional reviver).
//    - text is not a string:          throw ValidationError("Expected JSON text", code "type")
//    - JSON.parse throws SyntaxError: throw ValidationError("That text is not valid JSON", code "json", cause = the SyntaxError)
//    - any other error: rethrow it
function readJson(text, reviver) {
  // TODO
}

// 2. Use your attempt() helper from lesson 8 so the answer is data:
//    { ok: true, value } or { ok: false, error: { name, message, field, code, chain } }
function parseJson(text) {
  // TODO
}

// 3. Older versions of the site saved postcode and phone as numbers.
//    Reviver rules: a numeric "postcode" becomes a string padded to 5 digits (2134 -> "02134"),
//    a numeric "phone" becomes a string; everything else is unchanged.
function draftReviver(key, value) {
  // TODO
}
//    loadDraft: parse with readJson + draftReviver inside attempt(). The data must be a plain
//    object (not an array, not null, not a number...) else throw ValidationError("A saved draft must be a JSON object", code "shape").
//    Return a NEW object with ONLY the keys that exist in DEFAULTS AND hold a string. Allow-list, never copy blindly!
function loadDraft(text) {
  // TODO
}

// 4. Parse text; any string under a key that ends with "At" (createdAt, paidAt...) and looks like
//    an ISO UTC timestamp becomes a Date. If it matches the pattern but is not a real date
//    (month 13...), leave the string alone. Use readJson, so bad text throws a ValidationError.
const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;
function parseWithDates(text) {
  // TODO
}
`,
      solutionAdd: t`function readJson(text, reviver) {
  if (typeof text !== "string") {
    throw new ValidationError("Expected JSON text", { code: "type" });
  }
  try {
    return JSON.parse(text, reviver);
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new ValidationError("That text is not valid JSON", { code: "json", cause: error });
    }
    throw error;
  }
}

function parseJson(text) {
  return attempt(() => readJson(text));
}

function draftReviver(key, value) {
  if (key === "postcode" && typeof value === "number") return String(value).padStart(5, "0");
  if (key === "phone" && typeof value === "number") return String(value);
  return value;
}

function loadDraft(text) {
  return attempt(() => {
    const data = readJson(text, draftReviver);
    if (data === null || typeof data !== "object" || Array.isArray(data)) {
      throw new ValidationError("A saved draft must be a JSON object", { code: "shape" });
    }
    return Object.fromEntries(
      Object.keys(DEFAULTS)
        .filter((key) => Object.hasOwn(data, key) && typeof data[key] === "string")
        .map((key) => [key, data[key]]),
    );
  });
}

const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;

function parseWithDates(text) {
  return readJson(text, (key, value) => {
    if (typeof value === "string" && key.endsWith("At") && ISO_UTC.test(value)) {
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? value : date;
    }
    return value;
  });
}`,
      explanation:
        "readJson is the one place that talks to JSON.parse: it checks the type first, converts the engine's SyntaxError into the project's ValidationError while keeping the original as its cause, and lets any other error pass. parseJson and loadDraft wrap it in attempt, so callers get data instead of exceptions. loadDraft shows 'parse, then validate the shape': the reviver repairs old data, the object check rejects arrays, null and primitives, and building a new object from the keys of DEFAULTS is an allow-list: extra keys (including a hostile __proto__) are never copied. parseWithDates uses a reviver to turn date strings into Date objects in one place, and it double-checks with getTime() because a string can look like a date and still be impossible.",
      hints: [
        {
          id: "h1",
          title: "readJson and parseJson",
          content:
            "readJson: if (typeof text !== 'string') throw ... ; then try { return JSON.parse(text, reviver); } catch (error) { if (error instanceof SyntaxError) throw new ValidationError('That text is not valid JSON', { code: 'json', cause: error }); throw error; }. parseJson: return attempt(() => readJson(text)).",
        },
        {
          id: "h2",
          title: "loadDraft",
          content:
            "Inside attempt(() => { ... }): const data = readJson(text, draftReviver); reject null / non-objects / arrays with a ValidationError (code 'shape'); then Object.keys(DEFAULTS).filter((key) => Object.hasOwn(data, key) && typeof data[key] === 'string').map((key) => [key, data[key]]) and Object.fromEntries(...).",
        },
        {
          id: "h3",
          title: "Dates",
          content:
            "In the reviver: if (typeof value === 'string' && key.endsWith('At') && ISO_UTC.test(value)) { const date = new Date(value); return Number.isNaN(date.getTime()) ? value : date; } return value; (remember the final return for every other pair!)",
        },
      ],
      tests: [
        {
          id: "t1",
          description: "readJson parses valid JSON and applies a reviver",
          assertionCode: t`assertEqual(readJson('{"a": 1, "b": [true, null]}'), { a: 1, b: [true, null] }, "plain JSON");
assert(readJson("null") === null, "'null' is valid JSON and parses to null");
assertEqual(readJson('{"a": 1, "b": {"a": 5}}', (key, value) => (typeof value === "number" ? value + 1 : value)), { a: 2, b: { a: 6 } }, "the reviver is called for nested values too");`,
        },
        {
          id: "t2",
          description: "readJson throws ValidationError('json') with the SyntaxError as cause",
          assertionCode: t`let caught = null;
try {
  readJson('{"a": 1,}');
} catch (error) {
  caught = error;
}
assert(caught instanceof ValidationError, "Bad JSON should throw a ValidationError, got " + (caught && caught.name));
assert(caught.code === "json", "code should be 'json'");
assert(caught.message === "That text is not valid JSON", "message should be 'That text is not valid JSON'");
assert(caught.cause instanceof SyntaxError, "The original SyntaxError should be kept as the cause");`,
        },
        {
          id: "t3",
          description: "readJson rejects non-strings before JSON.parse can misread them",
          assertionCode: t`for (const value of [undefined, null, 5, {}, [], true]) {
  let caught = null;
  try {
    readJson(value);
  } catch (error) {
    caught = error;
  }
  assert(caught instanceof ValidationError && caught.code === "type", "readJson(" + String(value) + ") should throw a ValidationError with code 'type' (JSON.parse(null) would quietly give null!)");
}`,
        },
        {
          id: "t4",
          description: "parseJson reports success and failure as data",
          assertionCode: t`assertEqual(parseJson('{"a": 1}'), { ok: true, value: { a: 1 } }, "good JSON");
const bad = parseJson("{'a': 1}");
assert(bad.ok === false, "Single quotes are not JSON: expected ok: false");
assert(bad.error.code === "json" && bad.error.name === "ValidationError", "The error should be a 'json' ValidationError");
assert(bad.error.chain.length === 2 && bad.error.chain[1].startsWith("SyntaxError"), "The chain should show the SyntaxError cause: " + JSON.stringify(bad.error.chain));
for (const text of ["", "undefined", "{a: 1}", "[1, 2,]", "// comment\n{}", '{"a": NaN}']) {
  assert(parseJson(text).ok === false, JSON.stringify(text) + " is not valid JSON");
}
assert(parseJson(undefined).error.code === "type", "A missing text is a 'type' error");`,
        },
        {
          id: "t5",
          description: "loadDraft keeps only known string fields",
          assertionCode: t`const result = loadDraft('{"email": "a@b.co", "city": "Leeds", "admin": true, "age": 30, "country": 5, "nested": {"email": "evil"}}');
assertEqual(result, { ok: true, value: { email: "a@b.co", city: "Leeds" } }, "unknown keys and non-string values must be dropped");`,
        },
        {
          id: "t6",
          description: "loadDraft repairs numeric postcodes and phones from older drafts",
          assertionCode: t`const result = loadDraft('{"postcode": 2134, "phone": 5551234567, "email": "a@b.co"}');
assertEqual(result, { ok: true, value: { postcode: "02134", phone: "5551234567", email: "a@b.co" } }, "numbers should become strings (a postcode is padded back to 5 digits)");`,
        },
        {
          id: "t7",
          description: "loadDraft rejects the wrong shape and broken text",
          assertionCode: t`for (const text of ["[1, 2]", "null", "42", '"a string"', "true"]) {
  const r = loadDraft(text);
  assert(r.ok === false && r.error.code === "shape", text + " is valid JSON but not a draft object: expected code 'shape'");
}
const broken = loadDraft('{"email": ');
assert(broken.ok === false && broken.error.code === "json", "Broken JSON should have code 'json'");
assert(loadDraft(null).ok === false && loadDraft(null).error.code === "type", "null is not text");`,
        },
        {
          id: "t8",
          description: "loadDraft ignores hostile keys such as __proto__",
          assertionCode: t`const result = loadDraft('{"__proto__": {"polluted": "yes"}, "constructor": {"x": 1}, "email": "a@b.co"}');
assert(result.ok === true, "Hostile keys are just data; the draft is still readable");
assertEqual(Object.keys(result.value), ["email"], "Only the allow-listed key should be copied");
assert(result.value.polluted === undefined && ({}).polluted === undefined, "Nothing may leak into prototypes");`,
        },
        {
          id: "t9",
          description: "parseWithDates turns ISO timestamps under *At keys into Dates",
          assertionCode: t`const data = parseWithDates('{"createdAt": "2026-01-02T03:04:05Z", "name": "2026-01-02T03:04:05Z", "inner": {"paidAt": "2026-02-03T00:00:00.500Z"}, "bad": 1}');
assert(data.createdAt instanceof Date, "createdAt should be a Date");
assert(data.createdAt.getTime() === Date.UTC(2026, 0, 2, 3, 4, 5), "createdAt should be 2026-01-02T03:04:05Z");
assert(data.inner.paidAt instanceof Date, "nested *At keys count too");
assert(data.name === "2026-01-02T03:04:05Z", "A key that does not end in At must stay a string");
assert(data.bad === 1, "Other values pass through unchanged");`,
        },
        {
          id: "t10",
          description: "parseWithDates leaves impossible dates alone and still rejects bad JSON",
          assertionCode: t`assertEqual(parseWithDates('{"createdAt": "2026-13-45T00:00:00Z"}'), { createdAt: "2026-13-45T00:00:00Z" }, "month 13 is not a date: keep the string");
assertEqual(parseWithDates('{"createdAt": "yesterday"}'), { createdAt: "yesterday" }, "not an ISO timestamp: keep the string");
let caught = null;
try {
  parseWithDates("nope");
} catch (error) {
  caught = error;
}
assert(caught instanceof ValidationError && caught.code === "json", "Bad JSON should throw a ValidationError");`,
        },
      ],
      checks: [
        {
          prompt: t`What does ^^JSON.parse(null)^^ return?`,
          question: { type: "choice", options: ["It throws a SyntaxError", "null", "undefined", "An empty object"], answer: 1 },
          explanation: "JSON.parse converts its argument to a string first. String(null) is 'null', which is valid JSON for the value null. That is why a typeof check on the text is worth having.",
        },
        {
          prompt: t`JSON.parse succeeded on user-supplied text. What must you still do before trusting the result?`,
          question: {
            type: "choice",
            options: [
              "Nothing: parse already validated it",
              "Check its shape and the type of each field you use, preferably by copying only allow-listed keys",
              "Call JSON.stringify on it",
              "Run it through eval",
            ],
            answer: 1,
          },
          explanation: "Parsing proves the text is well-formed, not that its contents are what you expect. Validate the shape and types, and build a new object from the keys you accept.",
        },
        {
          prompt: t`Which of these is valid JSON?`,
          question: {
            type: "choice",
            options: ["{ name: 'Ada' }", '{ "name": "Ada", }', '{ "name": "Ada" }', "{ \"name\": undefined }"],
            answer: 2,
          },
          explanation: "JSON requires double-quoted keys and strings, allows no trailing comma, and has no undefined. Only the third option follows all the rules.",
        },
      ],
      unlocks: ["ff-draft"],
    },

    // ───────────────────────── 10 ─────────────────────────
    {
      id: "form-forge-10-json-out",
      title: "JSON out: the payload",
      minutes: 30,
      xp: 160,
      concepts: ["JSON.stringify", "replacer", "indent", "toJSON", "Dates / undefined / NaN / BigInt pitfalls", "allow-list payloads"],
      learn: t`### Turning data into text

~~~js
JSON.stringify({ name: "Ada", qty: 2 });            // '{"name":"Ada","qty":2}'
JSON.stringify({ name: "Ada", qty: 2 }, null, 2);   // the same, pretty-printed with 2 spaces
~~~

The signature is ^^JSON.stringify(value, replacer, space)^^. The third argument is the indent (a number of spaces, up to 10, or a string like ^^"\t"^^). Pretty output is for people (logs, previews); send the compact form over the network.

### What gets lost on the way

Not everything fits in JSON, and ^^stringify^^ does not complain. Know the rules, because they cause real bugs:

~~~js
JSON.stringify({
  a: undefined,            // omitted from objects
  b: () => 1,              // functions: omitted
  c: Symbol("x"),          // symbols: omitted
  d: NaN,                  // becomes null
  e: Infinity,             // becomes null
  f: new Date(0),          // becomes "1970-01-01T00:00:00.000Z" (via its toJSON method)
  g: new Map([[1, 2]]),    // becomes {} (Maps and Sets do not serialise)
});
// {"d":null,"e":null,"f":"1970-01-01T00:00:00.000Z","g":{}}

JSON.stringify([undefined, () => 1]);      // "[null,null]"  (arrays keep their length)
JSON.stringify(undefined);                 // undefined (not a string!)
JSON.stringify(10n);                       // TypeError: BigInt cannot be serialised
~~~

An *invalid* Date has ^^toJSON()^^ returning ^^null^^, and a **circular** structure (an object that contains itself) throws a ^^TypeError^^. A common wrong turn is ^^JSON.parse(JSON.stringify(x))^^ as a "deep clone": it silently turns Dates into strings, drops ^^undefined^^, and turns ^^NaN^^ into ^^null^^. Use ^^structuredClone^^ for copies.

### toJSON: teach an object to serialise itself

If a value has a ^^toJSON()^^ method, ^^stringify^^ calls it and serialises the result instead. That is how ^^Date^^ works, and you can use it for your own classes:

~~~js
class Money {
  constructor(cents) { this.cents = cents; }
  toJSON() { return { cents: this.cents, currency: "USD" }; }
}
JSON.stringify({ total: new Money(1250) });   // {"total":{"cents":1250,"currency":"USD"}}
~~~

### The replacer: filter and transform

Pass a **function** ^^(key, value) => newValue^^ to be asked about every pair (outermost first). Return ^^undefined^^ to leave the key out, or a replacement to change it:

~~~js
JSON.stringify({ email: "a@b.co", password: "hunter2" }, (key, value) => (key === "password" ? undefined : value));
// {"email":"a@b.co"}
~~~

Or pass an **array of keys** as an allow-list: ^^JSON.stringify(user, ["name", "email"])^^ keeps only those keys, at any depth. The replacer sees the value *after* ^^toJSON^^ has run.

### Designing a payload

The request your form sends is a contract with the server. Good habits:

- **Build it explicitly.** Construct the payload object field by field, choosing exactly what goes in. That is an *allow-list*, and it is safer than starting from "everything the form has" and deleting secrets (a deny-list forgets the next secret).
- **Never send what the server must not store.** A full card number does not belong in your JSON at all (real sites hand it straight to a payment provider). We send only ^^cardLast4^^. A password is sent once, over HTTPS, to a login endpoint, and never logged.
- **Money in integer cents**, **dates as ISO UTC strings**, and **no meaningless empties** (omit absent optional fields rather than sending ^^""^^ or ^^null^^, unless the API says otherwise).
- **Stable shape.** The same keys, the same nesting, every time. Group related things: ^^customer^^, ^^shipping^^, ^^payment^^, ^^order^^.
- Content-type is ^^application/json^^; the body is the string from ^^stringify^^.

### Common mistakes

- **Assuming ^^stringify^^ throws on bad data.** It mostly silently drops things (Dates, undefined, NaN). Check what you produce.
- **Logging the payload with secrets in it.**
- **Stringifying twice**, producing a JSON string containing escaped JSON.
- **Sending floating-point money** (^^19.99 * 3^^ is ^^59.97^^... or ^^59.96999999999999^^). Use cents.
- **Relying on key order.** Objects keep insertion order (integer-like keys first), but consumers should not depend on it.`,
      mission: t`Time to send the order. The server expects a tidy JSON document: customer, shipping, payment, order and a timestamp. It must contain the cleaned-up values from the whole chapter so far (normalized phone, postcode, redacted notes), it must never contain a password, a CVC or a full card number, and money must travel as an exact object.

Write the serialiser, a Money class with toJSON, and buildPayload. When you Run, the **payload preview** appears next to the form and rewrites itself as the shopper types.`,
      tasks: [
        "SECRET_KEYS and serialize(value, indent = 2): a replacer that drops secrets, empty strings and non-finite numbers, and stringifies BigInt",
        "class Money with toJSON() returning { cents, currency: 'USD' }",
        "buildPayload(values, items, submittedAt): the cleaned values grouped into customer / shipping / payment / order, as JSON text",
        "Keep every secret out, and throw a ValidationError for an impossible submittedAt date",
      ],
      starterAdd: t`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 10: build the JSON the server receives.

// Keys that must never appear in a payload or a log.
const SECRET_KEYS = new Set(["password", "confirm", "cvc", "cardNumber"]);

// 1. JSON.stringify with a replacer function. For every (key, item) pair:
//      - a secret key  -> leave it out
//      - an empty string "" -> leave it out
//      - a number that is not finite (NaN, Infinity) -> leave it out
//      - a bigint -> its string form (JSON cannot hold BigInt)
//      - anything else unchanged
//    indent defaults to 2. JSON.stringify(undefined) is undefined, not text: always return a string
//    (use "null" in that case).
function serialize(value, indent = 2) {
  // TODO
}

// 2. Money travels as { "cents": 24400, "currency": "USD" }. Add a toJSON method.
class Money {
  constructor(cents) {
    this.cents = cents;
  }
  // TODO: toJSON()
}

// Helper (given): every basket line, with add-ons as their own lines (same quantity as their item).
function orderLines(items) {
  return items.flatMap(({ sku, qty, addOns = [] }) => [{ sku, qty }, ...addOns.map((addOn) => ({ sku: addOn.sku, qty }))]);
}

// 3. The request body, as serialized text. Start from v = withDefaults(values) and build:
//    {
//      customer: { fullName: cleanText, email: cleanText + lower case, username: cleanText,
//                  phone: formatPhone(...) },                 // omitted when it is null
//      shipping: { address: cleanText, city: titleCase, country,
//                  postcode: normalizePostcode(...) or the cleaned text if that gives null,
//                  note: cleanText with card numbers redacted },
//      payment:  { cardLast4: last four digits only, expiry: parseExpiry(...) },   // expiry omitted when null
//      order:    { items: orderLines(items), total: new Money(orderTotal(items)) },
//      submittedAt: new Date(submittedAt)
//    }
//    If submittedAt is not a valid date, throw ValidationError("submittedAt must be a valid date", field "submittedAt", code "date").
//    Then return serialize(payload). Note: serialize drops "" and secret keys for you.
function buildPayload(values, items, submittedAt) {
  // TODO
}
`,
      solutionAdd: t`const SECRET_KEYS = new Set(["password", "confirm", "cvc", "cardNumber"]);

function serialize(value, indent = 2) {
  const text = JSON.stringify(
    value,
    (key, item) => {
      if (SECRET_KEYS.has(key)) return undefined;
      if (item === "") return undefined;
      if (typeof item === "number" && !Number.isFinite(item)) return undefined;
      if (typeof item === "bigint") return item.toString();
      return item;
    },
    indent,
  );
  return text ?? "null";
}

class Money {
  constructor(cents) {
    this.cents = cents;
  }

  toJSON() {
    return { cents: this.cents, currency: "USD" };
  }
}

function orderLines(items) {
  return items.flatMap(({ sku, qty, addOns = [] }) => [{ sku, qty }, ...addOns.map((addOn) => ({ sku: addOn.sku, qty }))]);
}

function buildPayload(values, items, submittedAt) {
  const v = withDefaults(values);
  const submitted = new Date(submittedAt);
  if (Number.isNaN(submitted.getTime())) {
    throw new ValidationError("submittedAt must be a valid date", { field: "submittedAt", code: "date" });
  }
  const payload = {
    customer: {
      fullName: cleanText(v.fullName),
      email: cleanText(v.email).toLowerCase(),
      username: cleanText(v.username),
      phone: formatPhone(v.phone) ?? undefined,
    },
    shipping: {
      address: cleanText(v.address),
      city: titleCase(v.city),
      postcode: normalizePostcode(v.country, v.postcode) ?? cleanText(v.postcode),
      country: v.country,
      note: redactCards(cleanText(v.note)),
    },
    payment: {
      cardLast4: digitsOnly(v.cardNumber).slice(-4),
      expiry: parseExpiry(v.expiry) ?? undefined,
    },
    order: { items: orderLines(items), total: new Money(orderTotal(items)) },
    submittedAt: submitted,
  };
  return serialize(payload);
}`,
      explanation:
        "serialize centralises the rules of what may leave the building: the replacer is called for every pair, and returning undefined removes it, so secrets and empties can never slip into any payload built with it. JSON.stringify(undefined) is undefined, so the function falls back to 'null' to always return text. Money.toJSON gives the object a stable wire format. buildPayload builds the document explicitly, an allow-list of exactly the fields the server wants, using the cleaning and parsing functions from earlier lessons, so the payload is normalized rather than raw. Only the last four digits of the card are included, optional values that did not parse are set to undefined (so they vanish), and the date is validated before use because an invalid Date would serialise as null.",
      hints: [
        {
          id: "h1",
          title: "serialize",
          content:
            "const text = JSON.stringify(value, (key, item) => { ... }, indent); then return text ?? 'null'. Inside the replacer: return undefined to drop a pair, return item to keep it. Check SECRET_KEYS.has(key), item === '', typeof item === 'number' && !Number.isFinite(item), typeof item === 'bigint'.",
        },
        {
          id: "h2",
          title: "Money",
          content: "toJSON() { return { cents: this.cents, currency: 'USD' }; } sits inside the class, next to the constructor.",
        },
        {
          id: "h3",
          title: "buildPayload",
          content:
            "const v = withDefaults(values); const submitted = new Date(submittedAt); check Number.isNaN(submitted.getTime()). Then build the nested object: formatPhone(v.phone) ?? undefined drops a missing phone; cardLast4 is digitsOnly(v.cardNumber).slice(-4); postcode: normalizePostcode(v.country, v.postcode) ?? cleanText(v.postcode). Finish with return serialize(payload).",
        },
      ],
      tests: [
        {
          id: "t1",
          description: "serialize drops secrets, empty strings and non-finite numbers at any depth",
          assertionCode: t`const text = serialize({ email: "a@b.co", password: "hunter2", note: "", nested: { cvc: "123", ok: 1, bad: NaN, inf: Infinity, keep: "x" } }, 0);
assertEqual(JSON.parse(text), { email: "a@b.co", nested: { ok: 1, keep: "x" } }, "serialize(...) output");
assert(!text.includes("hunter2") && !text.includes("123"), "No secret may appear in the text");`,
        },
        {
          id: "t2",
          description: "serialize indents by default and can be compact",
          assertionCode: t`assert(serialize({ a: 1 }) === '{\n  "a": 1\n}', "The default indent should be 2 spaces");
assert(serialize({ a: 1 }, 0) === '{"a":1}', "Indent 0 should be compact");
assert(serialize({ a: [1, 2] }, 4).includes('\n    "a"'), "A custom indent should be used");`,
        },
        {
          id: "t3",
          description: "serialize copes with BigInt, Dates, undefined and other awkward values",
          assertionCode: t`const text = serialize({ big: 10n, when: new Date(Date.UTC(2026, 0, 2)), nothing: undefined, fn() {} }, 0);
assert(text === '{"big":"10","when":"2026-01-02T00:00:00.000Z"}', "Got " + text);
assert(typeof serialize(undefined) === "string", "serialize(undefined) must still return text, not undefined");`,
        },
        {
          id: "t4",
          description: "Money serialises through toJSON",
          assertionCode: t`assert(JSON.stringify(new Money(1250)) === '{"cents":1250,"currency":"USD"}', "Money(1250) should stringify to the object with cents and currency");
assert(JSON.stringify({ total: new Money(5) }) === '{"total":{"cents":5,"currency":"USD"}}', "Money nested in an object");
assert(new Money(7).cents === 7, "The constructor still stores cents");`,
        },
        {
          id: "t5",
          description: "buildPayload produces tidy, normalized, grouped JSON",
          assertionCode: t`const values = { fullName: "  ada   lovelace ", email: " Ada@Example.COM ", username: "ada_l", password: "hunter2hunter2", confirm: "hunter2hunter2", phone: "555 123 4567", address: " 12  High St ", city: "lONDON", postcode: "sw1a1aa", country: "GB", note: "", cardNumber: "4242 4242 4242 4242", expiry: "12/30", cvc: "123" };
const items = [
  { sku: "KB-01", name: "Keyboard", priceCents: 8900, qty: 1, addOns: [{ sku: "WR-02", name: "Wrist rest", priceCents: 1500 }] },
  { sku: "MS-07", name: "Mouse", priceCents: 2950, qty: 2, addOns: [] },
];
const text = buildPayload(values, items, "2026-10-26T12:00:00Z");
assert(typeof text === "string", "buildPayload should return the JSON text");
const body = JSON.parse(text);
assertEqual(body.customer, { fullName: "ada lovelace", email: "ada@example.com", username: "ada_l", phone: "(555) 123-4567" }, "customer");
assertEqual(body.shipping, { address: "12 High St", city: "London", postcode: "SW1A 1AA", country: "GB" }, "shipping (empty note is omitted)");
assertEqual(body.payment, { cardLast4: "4242", expiry: { month: 12, year: 2030 } }, "payment");
assertEqual(body.order, { items: [{ sku: "KB-01", qty: 1 }, { sku: "WR-02", qty: 1 }, { sku: "MS-07", qty: 2 }], total: { cents: 16300, currency: "USD" } }, "order");
assert(body.submittedAt === "2026-10-26T12:00:00.000Z", "submittedAt should be an ISO string, got " + body.submittedAt);
assert(text.includes('\n  "customer"'), "The payload should be pretty-printed with 2 spaces");`,
        },
        {
          id: "t6",
          description: "buildPayload never leaks secrets or full card numbers",
          assertionCode: t`const text = buildPayload({ password: "hunter2hunter2", confirm: "hunter2hunter2", cvc: "987", cardNumber: "4242 4242 4242 4242", note: "my card is 5555 5555 5555 4444 ok" }, [], "2026-10-26T12:00:00Z");
for (const secret of ["hunter2", "987", "4242 4242", "4242424242424242", "5555 5555", "5555555555554444", "password", "cvc", "cardNumber"]) {
  assert(!text.includes(secret), "The payload must not contain " + secret);
}
assert(text.includes("[card ending 4444]"), "A card number typed into the note should be redacted");
assert(JSON.parse(text).payment.cardLast4 === "4242", "The last four digits are fine to send");`,
        },
        {
          id: "t7",
          description: "buildPayload omits what is missing, and copes with an empty form",
          assertionCode: t`const body = JSON.parse(buildPayload({}, [], "2026-10-26T12:00:00Z"));
assert(body.customer === undefined || body.customer.phone === undefined, "No phone: the key must be omitted, not null");
assert(body.order.total.cents === 0 && body.order.items.length === 0, "An empty basket totals 0");
assert(body.shipping.country === "US", "withDefaults supplies the default country");
const withBadPhone = JSON.parse(buildPayload({ phone: "12" }, [], "2026-10-26T12:00:00Z"));
assert(!withBadPhone.customer || !("phone" in withBadPhone.customer), "An unparseable phone is left out, not sent as null");`,
        },
        {
          id: "t8",
          description: "buildPayload rejects an impossible date with a ValidationError",
          assertionCode: t`for (const bad of ["not a date", "2026-13-45", undefined]) {
  let caught = null;
  try {
    buildPayload({}, [], bad);
  } catch (error) {
    caught = error;
  }
  assert(caught instanceof ValidationError && caught.code === "date" && caught.field === "submittedAt", "submittedAt " + String(bad) + " should throw ValidationError (field submittedAt, code date)");
}`,
        },
      ],
      checks: [
        {
          prompt: t`What does ^^JSON.stringify({ a: undefined, b: NaN, c: [undefined] })^^ produce?`,
          question: {
            type: "choice",
            options: ['{"a":null,"b":null,"c":[null]}', '{"b":null,"c":[null]}', '{"b":"NaN","c":[]}', "It throws a TypeError"],
            answer: 1,
          },
          explanation: "Object properties holding undefined are omitted; NaN becomes null; undefined inside an array becomes null (arrays keep their length). Silent loss like this is why payload builders should be explicit.",
        },
        {
          prompt: t`Why build the payload explicitly instead of sending ^^JSON.stringify(allFormValues)^^ minus the password?`,
          question: {
            type: "choice",
            options: [
              "It is faster",
              "A deny-list forgets the next secret you add; an explicit allow-list only ever sends what you chose",
              "JSON cannot hold passwords",
              "stringify cannot accept objects with many keys",
            ],
            answer: 1,
          },
          explanation: "Deleting known-bad fields fails open: a new sensitive field leaks until someone remembers. Choosing exactly what to send fails closed.",
        },
        {
          prompt: t`What does ^^JSON.stringify(new Date("nonsense"))^^ give?`,
          question: { type: "choice", options: ['"Invalid Date"', "null", "undefined", "It throws a RangeError"], answer: 1 },
          explanation: "An invalid Date's toJSON returns null, so you silently send null. (Calling toISOString() on it would throw a RangeError.) That is why buildPayload checks getTime() first.",
        },
      ],
      unlocks: ["ff-payload"],
    },
  ],
};
