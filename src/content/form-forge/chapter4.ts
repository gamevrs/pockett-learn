import type { Chapter } from "@/engine/types";
import { t } from "./tag.ts";

/**
 * Form Forge, chapter 4: The validation engine.
 * Rules as data, validators built from small functions, trust boundaries, and a schema that drives it all.
 *
 * Authoring notes: see tag.ts. Rule signature used throughout: test(value, values, context) -> boolean,
 * where context is { today: { year, month } }. The clock is never read inside a rule: it is passed in.
 */

export const chapter4: Chapter = {
  id: "validation-engine",
  title: "The validation engine",
  blurb: "Rules as data, validators from small parts, a server that trusts nobody, and one schema to run it all.",
  lessons: [
    // ───────────────────────── 11 ─────────────────────────
    {
      id: "form-forge-11-rules-as-data",
      title: "Rules as data",
      minutes: 35,
      xp: 170,
      concepts: ["rules as data", "collect all errors", "error messages", "pure functions", "passing context in", "separating what from how"],
      learn: t`### The if-ladder problem

The first version of every validator looks like this:

~~~js
function validateEmail(value) {
  if (value === "") return "Enter your email";
  if (!isEmail(value)) return "That doesn't look like an email";
  return null;
}
function validateUsername(value) { /* another ladder */ }
function validatePassword(value) { /* and another */ }
~~~

It works, until you need to show *every* problem at once, list the requirements next to the field, reuse a rule on the server, or generate a "what's wrong" summary. Each of those means rewriting every ladder. The cure is to separate **what the rules are** from **how they run**.

### A rule is a small object

~~~js
{ id: "format", message: "That doesn't look like an email", test: (value) => isEmail(value) }
~~~

- ^^id^^: a stable machine name (for tests, analytics, translations).
- ^^message^^: what a human reads. Say how to fix it, not how they failed.
- ^^test^^: a function returning ^^true^^ when the value is acceptable.

A field has an **array of rules**, and the whole form has an object keyed by field name: ^^{ email: [rule, rule], username: [rule, rule, rule] }^^. Now one small engine can run *any* field, and the table of rules is plain data that you can read, test, list in a UI, or load from a file.

### Run them all, report them all

~~~js
function checkField(name, values) {
  const rules = FIELD_RULES[name] ?? [];
  return rules.map(({ id, message, test }) => ({ id, message, ok: test(values[name], values) }));
}
~~~

This returns a **result for every rule**, passed or failed. From that one list you can derive anything: the failing messages, a checklist with green ticks, a count. Compare with stopping at the first error: that forces shoppers to fix one thing, submit, and meet the next.

The principle: **collect all the errors for a field** (so the user fixes everything in one pass), but present them kindly: the most important one first, not a wall of red.

### The rule signature: (value, values, context)

Some rules need more than the field itself:

- **Other fields.** A postcode is only valid for a *country*; a confirmation must equal the *password*. So ^^test^^ also receives all the values.
- **The outside world.** "Not expired" needs today's date. Don't call ^^new Date()^^ inside a rule: pass what you need in a ^^context^^ object. That makes the rule **pure**: the same inputs always give the same answer, so it is trivial to test (fix the date in the test), and it behaves the same on the server.

~~~js
{ id: "expired", message: "This card has expired", test: (value, values, { today }) => !isExpired(value, today) }
~~~

### Good messages

- Say what to do: "Use 3 to 20 letters, numbers, _ or -", not "Invalid username".
- Name the field's job, not the regex. Never expose pattern syntax.
- Don't blame: "Enter a valid card number", not "You entered a wrong number".
- Be specific when it's cheap ("Add a number") and general when specifics would leak ("Incorrect email or password").
- Keep the **id** stable even when copy changes.

### When to validate

On **blur** (leaving a field) and on **submit** is the sweet spot. Validating on every keystroke is fine for *helpful* feedback (a password meter) but shouting "invalid email!" after the first letter is hostile. Show an error for an empty field only after the shopper has tried to leave it or submit.

### Common mistakes

- **Returning after the first failure** when a user would prefer the whole list.
- **A rule that reads the clock, a global or the DOM**, so it can't be tested or reused on the server.
- **Mixing ^^null^^, ^^""^^ and ^^undefined^^** as "empty": decide on one meaning and normalise first.
- **Putting rule data and message text in the UI** instead of with the rules.
- **Looking up ^^FIELD_RULES[name]^^ with a user-controlled name** without ^^Object.hasOwn^^.`,
      mission: t`Up to now your checks are separate functions the form happens to call. The real engine needs them as a **table**: every field has an ordered list of rules, and one small runner can execute them all, report every failure, and feed any display, from a red message under the box to a checklist.

Build the table for all the fields from earlier lessons, plus the runner. When you Run, the form lights up: each field shows every problem at once, a **rule trace** lists the rules firing on each keystroke, and the submit button counts what is still wrong.`,
      tasks: [
        "FIELD_RULES: a rule list for each field (fullName and email are given; add username, password, phone, address, city, postcode, cardNumber, expiry and cvc)",
        "checkField(name, values, context): a { id, message, ok } result for every rule of a field (unknown names, even '__proto__', give [])",
        "fieldErrors(name, values, context): just the messages of the failing rules",
        "validateAll(values, names, context): an object of field name to messages, only for fields that have problems",
      ],
      starterAdd: t`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 11: the rules table and its runner.
// A rule is { id, message, test } and test(value, values, context) returns true when the value is fine.
//   value   - this field's value ("" when missing)
//   values  - ALL the form values (for rules like "postcode depends on country")
//   context - { today: { year, month } } so no rule ever reads the clock itself

// Today's month, used when no context is passed in.
function currentMonth() {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

const isPresent = (value) => cleanText(value) !== "";

const FIELD_RULES = {
  fullName: [
    { id: "required", message: "Enter your full name", test: isPresent },
    {
      id: "length",
      message: "Use between 2 and 80 characters",
      test: (value) => {
        const length = [...cleanText(value)].length;
        return length >= 2 && length <= 80;
      },
    },
  ],
  email: [
    { id: "required", message: "Enter your email address", test: isPresent },
    { id: "format", message: "That doesn't look like an email address", test: (value) => isEmail(cleanText(value)) },
  ],

  // TODO username:   required (message "Choose a username")
  //                  format   (isUsername of the cleaned text; "Use 3-20 letters, numbers, _ or -, starting with a letter")
  //                  reserved (NOT containsBanned(value, RESERVED); "That username is reserved")
  // TODO password:   required ("Choose a password"), then one rule per entry of PASSWORD_RULES
  //                  (id and message from the entry; test with its pattern on String(value))
  // TODO phone:      format only: fine when blank, otherwise formatPhone must succeed ("Use a 10-digit phone number")
  // TODO address:    required ("Enter your street address"), length of at most 120 characters ("Keep the address under 120 characters")
  // TODO city:       required ("Enter your city")
  // TODO postcode:   required ("Enter your postcode"); format: normalizePostcode(values.country, value) must not be null
  //                  ("That postcode doesn't match the country")
  // TODO cardNumber: required ("Enter your card number"); format: isCardNumber of the cleaned text ("Enter a valid card number")
  // TODO expiry:     required ("Enter the expiry date"); format: parseExpiry must succeed ("Use the format MM/YY");
  //                  expired: passes when the date does not parse (format reports that) or is not expired.
  //                  Use checkExpiry(value, context.today): fail only for code "expired" ("This card has expired")
  // TODO cvc:        required ("Enter the security code"); format: isCvc of the cleaned text ("Use 3 or 4 digits")
};

// Run every rule of one field and report each: [{ id, message, ok }].
// - Unknown field names (including "__proto__", "constructor") have no rules: return [].
// - The value is values[name], or "" when missing. values itself may be missing.
// - ok must be a real boolean.
function checkField(name, values, context = { today: currentMonth() }) {
  // TODO
}

// Only the messages of the rules that failed, in order.
function fieldErrors(name, values, context) {
  // TODO
}

// { fieldName: [messages] } for the given names (default: every field in FIELD_RULES),
// including ONLY fields that have at least one problem. Object.fromEntries helps.
function validateAll(values, names = Object.keys(FIELD_RULES), context) {
  // TODO
}
`,
      solutionAdd: t`function currentMonth() {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

const isPresent = (value) => cleanText(value) !== "";

const FIELD_RULES = {
  fullName: [
    { id: "required", message: "Enter your full name", test: isPresent },
    {
      id: "length",
      message: "Use between 2 and 80 characters",
      test: (value) => {
        const length = [...cleanText(value)].length;
        return length >= 2 && length <= 80;
      },
    },
  ],
  email: [
    { id: "required", message: "Enter your email address", test: isPresent },
    { id: "format", message: "That doesn't look like an email address", test: (value) => isEmail(cleanText(value)) },
  ],
  username: [
    { id: "required", message: "Choose a username", test: isPresent },
    { id: "format", message: "Use 3-20 letters, numbers, _ or -, starting with a letter", test: (value) => isUsername(cleanText(value)) },
    { id: "reserved", message: "That username is reserved", test: (value) => !containsBanned(value, RESERVED) },
  ],
  password: [
    { id: "required", message: "Choose a password", test: (value) => String(value) !== "" },
    ...PASSWORD_RULES.map((rule) => ({ id: rule.id, message: rule.label, test: (value) => rule.pattern.test(String(value)) })),
  ],
  phone: [{ id: "format", message: "Use a 10-digit phone number", test: (value) => !isPresent(value) || formatPhone(value) !== null }],
  address: [
    { id: "required", message: "Enter your street address", test: isPresent },
    { id: "length", message: "Keep the address under 120 characters", test: (value) => [...cleanText(value)].length <= 120 },
  ],
  city: [{ id: "required", message: "Enter your city", test: isPresent }],
  postcode: [
    { id: "required", message: "Enter your postcode", test: isPresent },
    { id: "format", message: "That postcode doesn't match the country", test: (value, values) => normalizePostcode(values.country, value) !== null },
  ],
  cardNumber: [
    { id: "required", message: "Enter your card number", test: isPresent },
    { id: "format", message: "Enter a valid card number", test: (value) => isCardNumber(cleanText(value)) },
  ],
  expiry: [
    { id: "required", message: "Enter the expiry date", test: isPresent },
    { id: "format", message: "Use the format MM/YY", test: (value) => parseExpiry(value) !== null },
    {
      id: "expired",
      message: "This card has expired",
      test: (value, values, context) => {
        const result = checkExpiry(value, context.today);
        return result.ok || result.error.code !== "expired";
      },
    },
  ],
  cvc: [
    { id: "required", message: "Enter the security code", test: isPresent },
    { id: "format", message: "Use 3 or 4 digits", test: (value) => isCvc(cleanText(value)) },
  ],
};

function checkField(name, values, context = { today: currentMonth() }) {
  const rules = Object.hasOwn(FIELD_RULES, name) ? FIELD_RULES[name] : [];
  const value = values?.[name] ?? "";
  return rules.map(({ id, message, test }) => ({ id, message, ok: Boolean(test(value, values ?? {}, context)) }));
}

function fieldErrors(name, values, context) {
  return checkField(name, values, context)
    .filter((result) => !result.ok)
    .map((result) => result.message);
}

function validateAll(values, names = Object.keys(FIELD_RULES), context) {
  return Object.fromEntries(names.map((name) => [name, fieldErrors(name, values, context)]).filter(([, messages]) => messages.length > 0));
}`,
      explanation:
        "FIELD_RULES is the whole policy in one readable table: add a rule by adding an object, with no new control flow. checkField is the only place that runs rules: it looks the field up safely (Object.hasOwn), supplies a default for a missing value, and returns a result per rule, so every other function is a one-line view of it: fieldErrors filters and maps, validateAll runs fieldErrors for each name and keeps the non-empty ones. Rules receive the other values (postcode needs the country) and a context object for the date, so they stay pure and testable. The expiry rule reuses checkExpiry from the errors lesson and only complains about 'expired', leaving 'format' to its own rule, so a typo does not produce two confusing messages.",
      hints: [
        {
          id: "h1",
          title: "The remaining rules",
          content:
            "Copy the shape of the given ones. For password: [{ id: 'required', ... }, ...PASSWORD_RULES.map((rule) => ({ id: rule.id, message: rule.label, test: (value) => rule.pattern.test(String(value)) }))]. For phone: test: (value) => !isPresent(value) || formatPhone(value) !== null. For postcode: test: (value, values) => normalizePostcode(values.country, value) !== null.",
        },
        {
          id: "h2",
          title: "expired",
          content:
            "test: (value, values, context) => { const result = checkExpiry(value, context.today); return result.ok || result.error.code !== 'expired'; } : a bad format is reported by the 'format' rule, so this one passes in that case.",
        },
        {
          id: "h3",
          title: "The runner",
          content:
            "checkField: const rules = Object.hasOwn(FIELD_RULES, name) ? FIELD_RULES[name] : []; const value = values?.[name] ?? ''; return rules.map(({ id, message, test }) => ({ id, message, ok: Boolean(test(value, values ?? {}, context)) })). fieldErrors filters !ok then maps to message. validateAll: Object.fromEntries(names.map((name) => [name, fieldErrors(name, values, context)]).filter(([, messages]) => messages.length > 0)).",
        },
      ],
      tests: [
        {
          id: "t1",
          description: "checkField returns a result for every rule, passed or failed",
          assertionCode: t`const ctx = { today: { year: 2026, month: 10 } };
const results = checkField("email", { email: "ada@example.com" }, ctx);
assert(Array.isArray(results) && results.length >= 2, "checkField should return an array with one entry per rule");
assert(results.every((r) => typeof r.id === "string" && typeof r.message === "string" && typeof r.ok === "boolean"), "Each result needs a string id, a string message and a boolean ok");
assert(results.every((r) => r.ok), "A good email passes every rule");
const bad = checkField("email", { email: "nope" }, ctx);
assert(bad.some((r) => r.id === "format" && r.ok === false) && bad.some((r) => r.id === "required" && r.ok === true), "'nope' is present but badly formed: required passes, format fails");`,
        },
        {
          id: "t2",
          description: "Unknown fields and hostile names have no rules",
          assertionCode: t`for (const name of ["nothing", "", "constructor", "__proto__", "toString", undefined]) {
  assertEqual(checkField(name, { email: "x" }), [], "checkField(" + JSON.stringify(name) + ") should be an empty array");
}
assertEqual(fieldErrors("nothing", {}), [], "fieldErrors of an unknown field");
assertEqual(checkField("email", undefined).length >= 2, true, "Missing values must not crash checkField");`,
        },
        {
          id: "t3",
          description: "All problems of a field are collected, in rule order",
          assertionCode: t`const ctx = { today: { year: 2026, month: 10 } };
const errors = fieldErrors("password", { password: "abc" }, ctx);
assert(errors.length === 4, "'abc' fails length, upper, digit and symbol: expected 4 messages, got " + errors.length + " (" + JSON.stringify(errors) + ")");
assertEqual(fieldErrors("password", { password: "" }, ctx).length, 6, "An empty password fails required plus all five rules");
assertEqual(fieldErrors("password", { password: "Tr0ub4dor&3" }, ctx), [], "A strong password has no errors");
assert(fieldErrors("fullName", { fullName: "A" }, ctx).length === 1 && fieldErrors("fullName", { fullName: "" }, ctx).length === 2, "A single letter fails only the length rule; an empty name fails required and length");`,
        },
        {
          id: "t4",
          description: "Username, phone and address rules",
          assertionCode: t`const ctx = { today: { year: 2026, month: 10 } };
assertEqual(fieldErrors("username", { username: "ada_l" }, ctx), [], "ada_l is fine");
assert(fieldErrors("username", { username: "admin" }, ctx).some((m) => m.includes("reserved")), "admin is reserved: the message should say so");
assert(fieldErrors("username", { username: "a" }, ctx).length === 1, "'a' fails only the format rule");
assert(fieldErrors("username", { username: "" }, ctx).length >= 1, "An empty username fails required");
assertEqual(fieldErrors("phone", { phone: "" }, ctx), [], "A blank phone is fine: it is optional");
assertEqual(fieldErrors("phone", { phone: "(555) 123-4567" }, ctx), [], "A real phone is fine");
assert(fieldErrors("phone", { phone: "12" }, ctx).length === 1, "A short phone has one problem");
assertEqual(fieldErrors("address", { address: "12 High St" }, ctx), [], "an ordinary address");
assert(fieldErrors("address", { address: "x".repeat(121) }, ctx).length === 1, "121 characters is too long");
assert(fieldErrors("address", { address: "  " }, ctx).length >= 1 && fieldErrors("city", { city: "" }, ctx).length === 1, "Blank address and city are required");`,
        },
        {
          id: "t5",
          description: "The postcode rule depends on the country",
          assertionCode: t`const ctx = { today: { year: 2026, month: 10 } };
assertEqual(fieldErrors("postcode", { postcode: "SW1A 1AA", country: "GB" }, ctx), [], "a GB postcode with country GB");
assert(fieldErrors("postcode", { postcode: "SW1A 1AA", country: "US" }, ctx).length === 1, "the same text is wrong for the US");
assertEqual(fieldErrors("postcode", { postcode: "90210", country: "US" }, ctx), [], "a US ZIP");
assert(fieldErrors("postcode", { postcode: "90210", country: "constructor" }, ctx).length === 1, "A hostile country must just fail the rule, not crash");`,
        },
        {
          id: "t6",
          description: "Card number, CVC and expiry rules (with the date passed in)",
          assertionCode: t`const ctx = { today: { year: 2026, month: 10 } };
assertEqual(fieldErrors("cardNumber", { cardNumber: "4242 4242 4242 4242" }, ctx), [], "a valid test card");
assert(fieldErrors("cardNumber", { cardNumber: "4242 4242 4242 4241" }, ctx).length === 1, "a typo fails the Luhn check");
assertEqual(fieldErrors("cvc", { cvc: "123" }, ctx), [], "a 3-digit CVC");
assert(fieldErrors("cvc", { cvc: "12" }, ctx).length === 1, "a 2-digit CVC");
assertEqual(fieldErrors("expiry", { expiry: "12/30" }, ctx), [], "a future date");
assertEqual(fieldErrors("expiry", { expiry: "10/26" }, ctx), [], "this month is still valid");
const old = checkField("expiry", { expiry: "01/20" }, ctx);
assertEqual(old.filter((r) => !r.ok).map((r) => r.id), ["expired"], "An old date fails ONLY the expired rule");
const junk = checkField("expiry", { expiry: "soon" }, ctx);
assertEqual(junk.filter((r) => !r.ok).map((r) => r.id), ["format"], "Unparseable text fails ONLY the format rule (not 'expired' as well)");
assertEqual(checkField("expiry", { expiry: "" }, ctx).filter((r) => !r.ok).map((r) => r.id), ["required", "format"], "An empty date fails required and format, nothing else");
assert(fieldErrors("expiry", { expiry: "01/27" }, { today: { year: 2027, month: 2 } }).length === 1, "The same date is expired in a later context: the clock comes from the context");`,
        },
        {
          id: "t7",
          description: "validateAll lists only fields that have problems",
          assertionCode: t`const ctx = { today: { year: 2026, month: 10 } };
const values = { fullName: "Ada Lovelace", email: "ada@example.com", username: "ada_l", password: "Tr0ub4dor&3", phone: "", address: "12 High St", city: "London", postcode: "SW1A 1AA", country: "GB", cardNumber: "4242 4242 4242 4242", expiry: "12/30", cvc: "123" };
assertEqual(validateAll(values, undefined, ctx), {}, "A fully valid form has no errors");
const errors = validateAll({ ...values, email: "nope", cvc: "" }, undefined, ctx);
assertEqual(Object.keys(errors), ["email", "cvc"], "Only the two broken fields should be listed");
assert(errors.email.length === 1 && errors.cvc.length === 2, "cvc is empty, so required and format both fail");
assertEqual(Object.keys(validateAll({}, ["email", "city"], ctx)), ["email", "city"], "validateAll can be limited to some names");
assertEqual(validateAll({ email: "nope" }, ["city"], ctx).email, undefined, "Fields that were not asked for must not appear");`,
        },
      ],
      checks: [
        {
          prompt: t`A rule needs "today". Why pass it in a ^^context^^ instead of calling ^^new Date()^^ inside the rule?`,
          question: {
            type: "choice",
            options: [
              "new Date() is not allowed in functions",
              "The rule becomes pure: the same inputs give the same answer, so it is easy to test and behaves the same on the server",
              "It is faster",
              "Rules cannot return booleans otherwise",
            ],
            answer: 1,
          },
          explanation: "A rule that reads the clock gives different answers on different days and is painful to test. Passing the date makes tests deterministic and lets the server decide what 'today' means.",
        },
        {
          prompt: t`Which design lets you show a full list of problems for a field?`,
          question: {
            type: "choice",
            options: [
              "Return the first failing message from an if/else ladder",
              "Run every rule and keep each result, then filter for the failures",
              "Throw an exception at the first problem",
              "Use one huge regular expression",
            ],
            answer: 1,
          },
          explanation: "Keeping a result per rule lets you derive anything: all messages, a checklist, a count. A ladder or an exception stops at the first problem.",
        },
      ],
      unlocks: ["ff-rules"],
    },

    // ───────────────────────── 12 ─────────────────────────
    {
      id: "form-forge-12-compose",
      title: "Validators from small parts",
      minutes: 35,
      xp: 170,
      concepts: ["higher-order functions", "closures", "factories", "composition", "modules: export / import", "stateless regexes"],
      learn: t`### Stop copying rules, start generating them

Look at the table you wrote: ^^required^^ appears eight times with only the message changing, and every "at most N characters" rule is a copy of the last. When things repeat with small differences, write a **function that makes them**: a *factory*.

~~~js
const required = (message = "This field is required") => ({
  id: "required",
  message,
  test: (value) => cleanText(value) !== "",
});

const maxLength = (n, message = ^^Use at most $\{n} characters^^) => ({
  id: "maxLength",
  message,
  test: (value) => [...cleanText(value)].length <= n,
});

maxLength(120, "Keep the address under 120 characters");   // a ready-made rule
~~~

Notice that ^^maxLength^^ returns an object whose ^^test^^ function *remembers* ^^n^^ after ^^maxLength^^ has finished. That is a **closure**: an inner function keeps access to the variables around it. Closures are the reason factories work, and you will use them constantly.

### Functions that take or return functions

A function that takes or returns another function is a **higher-order function**. Array methods like ^^map^^ are higher-order functions that *take* callbacks. Factories *return* functions. A third kind does both: a **combinator** takes a rule and returns a modified rule.

~~~js
const optional = (rule) => ({
  ...rule,                                                    // keep id and message
  test: (value, values, context) => cleanText(value) === "" || rule.test(value, values, context),
});

optional(matches(EMAIL_RE, "Not an email"));   // only checked when something was typed
~~~

Small, single-purpose pieces that snap together are far easier to trust than big ones. You can read ^^[required(), optional(matches(...))]^^ out loud and it tells the whole story. Compare that with an equivalent 12-line ladder.

### The stateless-regex rule, built in

Your factories take a regex from the caller. If that regex has the ^^g^^ or ^^y^^ flag, ^^test^^ will start remembering ^^lastIndex^^ and give alternating answers. A good factory defends itself by making its own copy without those flags:

~~~js
const safe = new RegExp(pattern.source, pattern.flags.replace(/[gy]/g, ""));
~~~

### Modules: where these functions would live

In a real project you would not keep this in one file. Each piece lives in a **module**: a file with its own private scope. It chooses what to share with ^^export^^, and other files bring things in with ^^import^^:

~~~js
// validators.js
export const required = (message) => ({ /* ... */ });
export const maxLength = (n, message) => ({ /* ... */ });

// signup.js
import { required, maxLength } from "./validators.js";
~~~

- **Named exports** (^^export const x^^) are imported by name in braces. The importing file must use that name (it can rename with ^^import { x as y }^^). A module can have many.
- A **default export** (^^export default thing^^) is the module's one main value, imported under any name you like: ^^import thing from "./thing.js"^^. Convenient, but because the importing file picks the name, different files may call it different things. Many teams prefer named exports for exactly that reason.
- Everything *not* exported stays private. That is how a module hides its helpers.
- Modules run **once**, the first time they are imported, and everyone shares that single instance. Module-level variables are therefore shared state: the ^^attempts^^ counter you wrote earlier would be one counter for the entire app.
- Older Node code uses ^^require()^^ and ^^module.exports^^ (CommonJS). New code, in browsers and Node, uses ^^import^^ and ^^export^^ (ES modules). You can also load a module on demand with ^^await import("./big.js")^^.

In this course everything lives in one growing file, but think of each lesson as its own module. This matters most for one reason: **validators written as pure functions in a module can be imported by both the browser and the server**. One definition, two places, no drift. You will use exactly that idea next lesson.

### Common mistakes

- **Mutating a rule passed in** instead of returning a new one (note the ^^{ ...rule, test }^^ spread in ^^optional^^).
- **Forgetting to return the object** from an arrow function: ^^() => { id: "x" }^^ is a block with a label, not an object. Wrap object literals in parentheses: ^^() => ({ id: "x" })^^.
- **Sharing mutable defaults** between calls.
- **Capturing a loop variable by mistake** with ^^var^^. Use ^^const^^ and ^^let^^.
- **Circular imports** (a imports b imports a). Move shared code into a third module.`,
      mission: t`The rule table works, but it is full of copy-paste, and it can't yet express "must match the password field", "must be one of these countries", or "only check this if something was typed". It also reports two errors for an empty email (missing *and* malformed), which feels like shouting.

Build a small library of validator factories and combinators, then use it to add rules for the confirmation, country and note boxes and to tidy two of the older fields. When you Run, those three boxes get live validation, and the empty-email noise disappears.`,
      tasks: [
        "required(message), minLength(n, message), maxLength(n, message): rule factories (length counted in code points)",
        "matches(pattern, message, id) (safe with g/y regexes), oneOf(options, message) and sameAs(otherName, message)",
        "optional(rule): a combinator that skips the rule when the value is blank",
        "Add FIELD_RULES.confirm, .country and .note, and rebuild .email and .username so empty input gives only one message",
      ],
      starterAdd: t`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 12: validators made from small parts.
// Every factory returns a rule: { id, message, test(value, values, context) }.

// A value counts as "blank" when cleanText(value) is "".

// required: id "required"; test fails for blank values. Default message "This field is required".
const required = (message = "This field is required") => {
  // TODO
};

// minLength / maxLength: ids "minLength" / "maxLength". Count code points of the cleaned text
// ([...cleanText(value)].length). Default messages: "Use at least N characters" / "Use at most N characters".
const minLength = (n, message) => {
  // TODO
};
const maxLength = (n, message) => {
  // TODO
};

// matches: passes when the CLEANED value matches pattern. id defaults to "format".
// The pattern may have the g or y flag: build a private copy without those flags, so repeated
// calls always give the same answer.
const matches = (pattern, message, id = "format") => {
  // TODO
};

// oneOf: passes when options.includes(value) (strictly, no cleaning). id "oneOf". Default message
// "Choose one of the listed options".
const oneOf = (options, message) => {
  // TODO
};

// sameAs: passes when value === values[otherName] (raw, no cleaning: passwords are exact). id "sameAs".
// Default message "The two values do not match".
const sameAs = (otherName, message) => {
  // TODO
};

// optional(rule): a NEW rule like the given one (same id and message) that passes automatically
// when the value is blank, and otherwise runs the original test (passing all three arguments).
const optional = (rule) => {
  // TODO
};

// Now use them. Add three more fields to the table (the form has them, the table did not):
//   confirm: required("Re-enter your password"), then sameAs("password", "The passwords don't match")
//   country: oneOf(["US", "GB", "CA"], "Choose US, GB or CA")
//   note:    maxLength(200, "Keep the note under 200 characters")
// TODO FIELD_RULES.confirm = ...
// TODO FIELD_RULES.country = ...
// TODO FIELD_RULES.note = ...

// And tidy two old ones so that an EMPTY box gives just "required", not "required" plus "format":
//   email:    required("Enter your email address"), maxLength(254, "That email address is too long"),
//             optional(matches(EMAIL_RE, "That doesn't look like an email address"))
//   username: required("Choose a username"),
//             optional(matches(USERNAME_RE, "Use 3-20 letters, numbers, _ or -, starting with a letter")),
//             optional(a rule with id "reserved": NOT containsBanned(value, RESERVED), "That username is reserved")
// TODO FIELD_RULES.email = ...
// TODO FIELD_RULES.username = ...
`,
      solutionAdd: t`const required = (message = "This field is required") => ({
  id: "required",
  message,
  test: (value) => cleanText(value) !== "",
});

const minLength = (n, message = ^^Use at least $\{n} characters^^) => ({
  id: "minLength",
  message,
  test: (value) => [...cleanText(value)].length >= n,
});

const maxLength = (n, message = ^^Use at most $\{n} characters^^) => ({
  id: "maxLength",
  message,
  test: (value) => [...cleanText(value)].length <= n,
});

const matches = (pattern, message, id = "format") => {
  const safe = new RegExp(pattern.source, pattern.flags.replace(/[gy]/g, ""));
  return { id, message, test: (value) => safe.test(cleanText(value)) };
};

const oneOf = (options, message = "Choose one of the listed options") => ({
  id: "oneOf",
  message,
  test: (value) => options.includes(value),
});

const sameAs = (otherName, message = "The two values do not match") => ({
  id: "sameAs",
  message,
  test: (value, values) => value === values?.[otherName],
});

const optional = (rule) => ({
  ...rule,
  test: (value, values, context) => cleanText(value) === "" || rule.test(value, values, context),
});

FIELD_RULES.confirm = [required("Re-enter your password"), sameAs("password", "The passwords don't match")];
FIELD_RULES.country = [oneOf(["US", "GB", "CA"], "Choose US, GB or CA")];
FIELD_RULES.note = [maxLength(200, "Keep the note under 200 characters")];

FIELD_RULES.email = [
  required("Enter your email address"),
  maxLength(254, "That email address is too long"),
  optional(matches(EMAIL_RE, "That doesn't look like an email address")),
];
FIELD_RULES.username = [
  required("Choose a username"),
  optional(matches(USERNAME_RE, "Use 3-20 letters, numbers, _ or -, starting with a letter")),
  optional({ id: "reserved", message: "That username is reserved", test: (value) => !containsBanned(value, RESERVED) }),
];`,
      explanation:
        "Each factory returns a rule object whose test closes over the arguments (n, pattern, options...), so one definition produces any number of rules. matches builds a private copy of the regex without g/y, so the rule gives the same answer on every call whatever the caller passed in. optional is a combinator: it spreads the original rule (keeping id and message), replaces only the test, and forwards all three arguments. Because emptiness is now handled by required alone, 'format' style rules wrapped in optional stay quiet on a blank box. Adding confirm, country and note to FIELD_RULES is just data: the runner from the last lesson handles them with no changes.",
      hints: [
        {
          id: "h1",
          title: "Factories",
          content:
            "Each one returns an object: const required = (message = 'This field is required') => ({ id: 'required', message, test: (value) => cleanText(value) !== '' }); Note the parentheses around the braces, or JavaScript reads them as a function body. minLength/maxLength use [...cleanText(value)].length and a default message built in the parameter list.",
        },
        {
          id: "h2",
          title: "matches, oneOf, sameAs, optional",
          content:
            "matches: const safe = new RegExp(pattern.source, pattern.flags.replace(/[gy]/g, '')); return { id, message, test: (value) => safe.test(cleanText(value)) }. sameAs: test: (value, values) => value === values?.[otherName]. optional: ({ ...rule, test: (value, values, context) => cleanText(value) === '' || rule.test(value, values, context) }).",
        },
        {
          id: "h3",
          title: "Using them",
          content:
            "FIELD_RULES is an ordinary object, so FIELD_RULES.confirm = [required('Re-enter your password'), sameAs('password', \"The passwords don't match\")]; adds a field and FIELD_RULES.email = [...] replaces one. For the 'reserved' rule write the object by hand and wrap it: optional({ id: 'reserved', message: '...', test: (value) => !containsBanned(value, RESERVED) }).",
        },
      ],
      tests: [
        {
          id: "t1",
          description: "required, minLength and maxLength build working rules",
          assertionCode: t`const r = required("Fill me");
assert(r.id === "required" && r.message === "Fill me" && typeof r.test === "function", "required(message) should return { id: 'required', message, test }");
assert(r.test("x") === true && r.test("  ") === false && r.test("") === false && r.test(null) === false && r.test(undefined) === false, "required: blank values fail, text passes");
assert(required().message === "This field is required", "Default message for required");
const min = minLength(3);
assert(min.id === "minLength" && min.message === "Use at least 3 characters", "minLength(3) default id and message");
assert(min.test("abc") === true && min.test("ab") === false && min.test("  ab  ") === false, "minLength measures the cleaned text");
assert(min.test("😀😀😀") === true, "Length counts code points: three emoji is length 3");
const max = maxLength(2, "Too long");
assert(max.id === "maxLength" && max.message === "Too long", "maxLength id and custom message");
assert(max.test("ab") === true && max.test("abc") === false && max.test("") === true, "maxLength boundaries");
assert(maxLength(5).message === "Use at most 5 characters", "maxLength default message");`,
        },
        {
          id: "t2",
          description: "matches tests the cleaned value and is safe with global regexes",
          assertionCode: t`const rule = matches(/^\d+$/, "Digits only");
assert(rule.id === "format" && rule.message === "Digits only", "matches defaults to id 'format'");
assert(rule.test("123") === true && rule.test(" 123 ") === true && rule.test("12a") === false, "matches runs on the cleaned text");
assert(matches(/a/, "m", "letter").id === "letter", "A custom id can be given");
const sticky = matches(/a/g, "has an a");
assert(sticky.test("a") === true && sticky.test("a") === true && sticky.test("a") === true, "A regex with the g flag must not make the rule alternate (copy it without g/y)");
const original = /a/g;
matches(original, "x").test("a");
assert(original.lastIndex === 0, "The caller's regex must not be touched");`,
        },
        {
          id: "t3",
          description: "oneOf and sameAs compare exactly",
          assertionCode: t`const rule = oneOf(["US", "GB"], "Pick one");
assert(rule.id === "oneOf" && rule.message === "Pick one", "oneOf id and message");
assert(rule.test("US") === true && rule.test("us") === false && rule.test("FR") === false && rule.test("") === false, "oneOf is exact");
assert(oneOf(["a"]).message === "Choose one of the listed options", "oneOf default message");
const same = sameAs("password", "Must match");
assert(same.id === "sameAs" && same.message === "Must match", "sameAs id and message");
assert(same.test("abc", { password: "abc" }) === true, "equal values pass");
assert(same.test("abc", { password: "abd" }) === false, "different values fail");
assert(same.test("abc ", { password: "abc" }) === false, "No trimming: passwords are exact");
assert(same.test("", {}) === false && same.test("abc", undefined) === false, "A missing other value must not crash and must not match text");
assert(sameAs("x").message === "The two values do not match", "sameAs default message");`,
        },
        {
          id: "t4",
          description: "optional skips blank values and keeps the rule's identity",
          assertionCode: t`const base = { id: "digits", message: "Digits only", test: (value) => /^\d+$/.test(value) };
const wrapped = optional(base);
assert(wrapped !== base && wrapped.id === "digits" && wrapped.message === "Digits only", "optional should return a NEW rule with the same id and message");
assert(base.test("") === false, "The original rule must be left alone (don't edit it in place)");
assert(wrapped.test("") === true && wrapped.test("   ") === true, "Blank passes");
assert(wrapped.test("12") === true && wrapped.test("ab") === false, "Non-blank values still run the original test");
const seen = [];
optional({ id: "x", message: "m", test: (...args) => { seen.push(args.length); return true; } }).test("v", { a: 1 }, { today: 1 });
assert(seen[0] === 3, "All three arguments (value, values, context) must reach the wrapped test");`,
        },
        {
          id: "t5",
          description: "confirm, country and note are now validated",
          assertionCode: t`const ctx = { today: { year: 2026, month: 10 } };
assertEqual(fieldErrors("confirm", { password: "abc", confirm: "abc" }, ctx), [], "matching confirmation");
const mismatch = fieldErrors("confirm", { password: "abc", confirm: "abd" }, ctx);
assert(mismatch.length === 1 && mismatch[0] === "The passwords don't match", "A different confirmation should say: The passwords don't match");
assert(fieldErrors("confirm", { password: "abc", confirm: "" }, ctx).length >= 1, "An empty confirmation is an error");
assertEqual(fieldErrors("country", { country: "GB" }, ctx), [], "GB is allowed");
assert(fieldErrors("country", { country: "FR" }, ctx).length === 1, "FR is not allowed");
assert(fieldErrors("country", { country: "" }, ctx).length === 1, "an empty country is not allowed");
assertEqual(fieldErrors("note", { note: "" }, ctx), [], "an empty note is fine");
assertEqual(fieldErrors("note", { note: "x".repeat(200) }, ctx), [], "200 characters is the limit");
assert(fieldErrors("note", { note: "x".repeat(201) }, ctx).length === 1, "201 characters is too long");`,
        },
        {
          id: "t6",
          description: "email and username give one clear message for an empty box",
          assertionCode: t`const ctx = { today: { year: 2026, month: 10 } };
assertEqual(fieldErrors("email", { email: "" }, ctx), ["Enter your email address"], "An empty email should say only: Enter your email address");
assertEqual(fieldErrors("email", { email: "nope" }, ctx), ["That doesn't look like an email address"], "A bad email gives only the format message");
assertEqual(fieldErrors("email", { email: "ada@example.com" }, ctx), [], "A good email");
assert(fieldErrors("email", { email: "a".repeat(250) + "@b.co" }, ctx).length >= 1, "A 255-character email is too long");
assertEqual(fieldErrors("username", { username: "" }, ctx), ["Choose a username"], "An empty username gives only: Choose a username");
assertEqual(fieldErrors("username", { username: "ada_l" }, ctx), [], "a good username");
assertEqual(fieldErrors("username", { username: "admin" }, ctx), ["That username is reserved"], "admin is reserved (and otherwise well-formed)");
assertEqual(fieldErrors("username", { username: "1a" }, ctx), ["Use 3-20 letters, numbers, _ or -, starting with a letter"], "a malformed username");`,
        },
      ],
      checks: [
        {
          prompt: t`In ^^const maxLength = (n) => ({ test: (v) => v.length <= n })^^, how does ^^test^^ still know ^^n^^ after ^^maxLength^^ has returned?`,
          question: { type: "choice", options: ["n is a global variable", "A closure: the inner function keeps access to the variables around it", "JavaScript re-runs maxLength each time", "n is copied onto the string"], answer: 1 },
          explanation: "The inner arrow function closes over n. Each call to maxLength creates a fresh n, and each returned test function keeps its own.",
        },
        {
          prompt: t`What is the difference between a named export and a default export?`,
          question: {
            type: "choice",
            options: [
              "Named exports are private; default exports are public",
              "A module can have many named exports, imported by name in braces; it has at most one default export, which the importer can name freely",
              "Default exports run faster",
              "Named exports only work in browsers",
            ],
            answer: 1,
          },
          explanation: "import { required } from './v.js' needs the exact exported name (it can be renamed with 'as'), while import anything from './thing.js' takes whatever the single default export is. Many teams prefer named exports because names stay consistent across files.",
        },
        {
          prompt: t`Why does ^^optional(rule)^^ return ^^{ ...rule, test: ... }^^ instead of editing ^^rule.test^^ directly?`,
          question: {
            type: "choice",
            options: [
              "Spread is required syntax",
              "So the original rule is left unchanged: it may be used elsewhere without the optional behaviour",
              "Because objects are frozen",
              "Because test cannot be reassigned in JavaScript",
            ],
            answer: 1,
          },
          explanation: "Mutating a shared object changes every place that uses it. Building a new object is safe and keeps the combinator reusable.",
        },
      ],
      unlocks: ["ff-compose"],
    },

    // ───────────────────────── 13 ─────────────────────────
    {
      id: "form-forge-13-trust",
      title: "Never trust the client",
      minutes: 40,
      xp: 190,
      concepts: ["sanitize vs validate vs escape", "XSS", "server-side validation", "allow-lists", "never trust totals", "Unicode tricks"],
      learn: t`### Three different jobs

People mix these up, and the mix-ups cause security holes.

- **Validate** = decide whether input is acceptable, and reject it if not. ("This is not a valid postcode.")
- **Sanitize / normalize** = clean up input you are willing to accept. (Trim, normalise Unicode, strip control characters, cap the length.)
- **Escape / encode** = make a value safe for a particular *destination* when you output it. HTML needs ^^<^^ turned into ^^&lt;^^. A URL needs percent-encoding. A database needs parameters. A shell needs quoting. The right encoding depends on where the text is going.

The rule of thumb: **validate and clean on the way in, escape on the way out, in the way that destination needs.** Storing the raw, validated text and escaping when you display it is more robust than trying to "make it safe" once and hoping every future use is the same.

### XSS in one paragraph

Suppose a shopper types ^^<script>steal(document.cookie)</script>^^ as their name, and a page later assigns that name to ^^element.innerHTML^^. The browser runs it. That is **cross-site scripting**: your page executes an attacker's code with your users' privileges. Defences:

- Insert text with ^^textContent^^ (or a framework that escapes for you, like React) so it is *text*, never markup. Danger signs are ^^innerHTML^^, ^^dangerouslySetInnerHTML^^ and ^^document.write^^.
- Where you must produce an HTML string, **escape** it: replace ^^&^^ ^^<^^ ^^>^^ ^^"^^ ^^'^^ with entities, in a single pass.
- Add a Content-Security-Policy header as a safety net.
- Never "sanitize" by deleting the word "script"; attackers have a thousand other tricks.

The same thinking covers **SQL injection** (use parameterised queries, never string-join user text into SQL), **command injection**, and **path traversal** (^^../../etc/passwd^^).

### Text tricks to know about

- **Invisible characters.** Zero-width spaces (U+200B), the byte-order mark and ASCII control characters look like nothing but break comparisons and logs. Strip them.
- **Bidirectional overrides** (U+202A to U+202E, U+2066 to U+2069) can make text *display* backwards or disguise file names and addresses ("Trojan Source"). Strip these. Ordinary right-to-left languages like Arabic and Hebrew do **not** need them, so legitimate text is unaffected.
- **Lookalikes.** Unicode has thousands of characters that look like Latin letters. Normalise (NFC), and for identifiers such as usernames consider restricting to a safe set, as our username rule does.
- **Huge input.** Cap lengths so nobody can send you 50 MB in a name field. Count **code points**, not UTF-16 units, so you do not cut an emoji in half.
- **Silent damage.** Truncating or stripping without telling the user can hide a typo or change meaning. Use it as a safety net on the server, and validate length visibly in the form.

Never alter passwords: no trimming, no case change, no length cap that drops characters (hash them, don't clean them).

### The client is not a security boundary

Everything in the browser belongs to the person using it. Anyone can open the developer tools, edit your JavaScript, skip your validation, or send a request with ^^curl^^ that never touches your form at all. **Client-side validation exists for the user's convenience: quick, friendly feedback. It is not security.** The server must validate every request again, from scratch, as if it came from a stranger, because it did.

That means the server:

- re-checks **every field** with the same rules (this is why pure validators shared between client and server are so valuable);
- accepts only the fields it knows (**allow-list**): ignore the rest, which also stops "mass assignment" attacks where extra keys like ^^isAdmin: true^^ get stored;
- checks **types and ranges** ("quantity" must be a whole number from 1 to 99: not -3, not 1.5, not 1e9);
- **never assumes the values that matter are honest**. A price or a total in the request is a *claim*. Look the price up in your own catalogue and recompute the total;
- answers with the right status: ^^400^^ when the request is malformed (not even JSON), ^^422^^ when it is well-formed but fails validation, ^^201^^ when something was created;
- returns errors in a stable shape the client can display, without leaking internals.

### Common mistakes

- **"We validate in the form, so we're safe."**
- **Escaping on input and then again on output** (double-encoded ^^&amp;amp;^^), or not at all on one path.
- **Trusting hidden fields, cookies or prices** sent by the browser.
- **Blocking with a blacklist** ("no <script>") instead of allowing known-good shapes.
- **Returning detailed errors** that reveal your database or file layout.`,
      mission: t`The checkout works beautifully in the browser, and that is exactly the problem: anyone can bypass it. A shopper's browser could send the order with the total changed to one cent, a negative quantity, a made-up SKU, or a name full of tricky characters.

Build the server's side of the conversation: an HTML escaper, a sanitiser for hostile text, and a request handler that re-validates everything and recomputes the money from its own catalogue. When you Run, the **server checkpoint** appears. You can edit the JSON the "browser" would send, as an attacker would, and see what your server says.`,
      tasks: [
        "escapeHtml(text): replace & < > \" ' in a single pass (null becomes an empty string)",
        "sanitizeValues(values): every default field as a string, cleaned of control, zero-width and bidi-override characters, normalized, capped at 200 code points (never touch passwords, never coerce objects)",
        "handleSubmit(bodyText): 400 for bad JSON, 422 with errors for invalid data, 201 with the recomputed total otherwise",
        "Recompute the money from CATALOG: reject unknown SKUs, bad quantities and a total that does not add up",
      ],
      starterAdd: t`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 13: the server that trusts nobody.

// The server's own price list (cents). The browser's prices are only claims!
const CATALOG = { "KB-01": 8900, "MS-07": 2950, "CB-12": 1200, "WR-02": 1500 };

// 1. Make text safe to put inside HTML: & < > " ' become &amp; &lt; &gt; &quot; &#39;
//    Do it in ONE pass with a lookup table (a second pass would escape the & of an earlier entity).
const HTML_ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
function escapeHtml(text) {
  // TODO (null / undefined become "")
}

// 2. Characters to strip: ASCII controls (except tab, newline, carriage return), the zero-width
//    characters U+200B-U+200D, U+2060, U+FEFF, and the bidirectional overrides U+202A-U+202E and U+2066-U+2069.
const INVISIBLE_RE = /TODO/g;
const MAX_LENGTH = 200;
//    sanitizeValues returns a NEW object with exactly the keys of DEFAULTS:
//      - start from withDefaults(values); a value that is not a string becomes that key's default
//        (never coerce objects or arrays into text)
//      - "password" and "confirm" are returned exactly as given
//      - every other string: strip INVISIBLE_RE, cleanText it, and keep at most MAX_LENGTH code points
function sanitizeValues(values) {
  // TODO
}

// 3. The request handler. bodyText is the raw JSON text a client sent. Return { status, errors } or { status, total }.
//      - not valid JSON, or not a JSON object:  { status: 400, errors: { body: ["..."] } }
//      - otherwise gather the fields from body.customer, body.shipping:
//          fullName, email, username, phone (customer);  address, city, postcode, country, note (shipping)
//        sanitize them, then validateAll(flat, CLIENT_FIELDS, context). Sections may be missing or null.
//      - payment: payment.cardLast4 must be exactly four digits (error key "payment"),
//        and payment.expiry { month, year } must pass checkExpiry (error key "expiry" with the message)
//      - order.items must be an array of at most 50 lines. Each line needs a sku that is a real key of
//        CATALOG (Object.hasOwn!) and a whole-number qty from 1 to 99. (error key "order")
//        When all lines are fine, recompute the total from CATALOG and require order.total.cents to equal it.
//      - any errors: { status: 422, errors }.  none: { status: 201, total: { cents, currency: "USD" } }
const CLIENT_FIELDS = ["fullName", "email", "username", "phone", "address", "city", "postcode", "country", "note"];
function handleSubmit(bodyText, context = { today: currentMonth() }) {
  // TODO
}
`,
      solutionAdd: t`const CATALOG = { "KB-01": 8900, "MS-07": 2950, "CB-12": 1200, "WR-02": 1500 };

const HTML_ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

function escapeHtml(text) {
  return String(text ?? "").replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);
}

const INVISIBLE_RE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u200b-\u200d\u2060\ufeff\u202a-\u202e\u2066-\u2069]/g;
const MAX_LENGTH = 200;

function sanitizeValues(values) {
  const merged = withDefaults(values);
  return Object.fromEntries(
    Object.entries(merged).map(([key, value]) => {
      if (typeof value !== "string") return [key, DEFAULTS[key]];
      if (key === "password" || key === "confirm") return [key, value];
      const cleaned = cleanText(value.replace(INVISIBLE_RE, ""));
      return [key, [...cleaned].slice(0, MAX_LENGTH).join("")];
    }),
  );
}

const CLIENT_FIELDS = ["fullName", "email", "username", "phone", "address", "city", "postcode", "country", "note"];

function checkLines(order) {
  const lines = order?.items;
  if (!Array.isArray(lines) || lines.length === 0) return { problems: ["Add at least one item"], total: null };
  if (lines.length > 50) return { problems: ["Too many order lines"], total: null };
  const problems = [];
  let total = 0;
  for (const line of lines) {
    const known = Object.hasOwn(CATALOG, line?.sku);
    const qtyOk = Number.isInteger(line?.qty) && line.qty >= 1 && line.qty <= 99;
    if (!known) problems.push(^^Unknown item: $\{escapeHtml(String(line?.sku).slice(0, 30))}^^);
    else if (!qtyOk) problems.push(^^Bad quantity for $\{line.sku}^^);
    else total += CATALOG[line.sku] * line.qty;
  }
  if (problems.length === 0 && order.total?.cents !== total) problems.push("The total does not match the items");
  return { problems, total };
}

function handleSubmit(bodyText, context = { today: currentMonth() }) {
  const parsed = parseJson(bodyText);
  if (!parsed.ok) return { status: 400, errors: { body: [parsed.error.message] } };
  const body = parsed.value;
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return { status: 400, errors: { body: ["The request body must be a JSON object"] } };
  }

  const { customer, shipping, payment, order } = body;
  const flat = sanitizeValues({
    fullName: customer?.fullName,
    email: customer?.email,
    username: customer?.username,
    phone: customer?.phone,
    address: shipping?.address,
    city: shipping?.city,
    postcode: shipping?.postcode,
    country: shipping?.country,
    note: shipping?.note,
  });
  const errors = validateAll(flat, CLIENT_FIELDS, context);

  if (!/^\d{4}$/.test(String(payment?.cardLast4))) errors.payment = ["cardLast4 must be four digits"];
  const expiry = checkExpiry(^^$\{payment?.expiry?.month}/$\{payment?.expiry?.year}^^, context.today);
  if (!expiry.ok) errors.expiry = [expiry.error.message];

  const { problems, total } = checkLines(order);
  if (problems.length > 0) errors.order = problems;

  if (Object.keys(errors).length > 0) return { status: 422, errors };
  return { status: 201, total: { cents: total, currency: "USD" } };
}`,
      explanation:
        "escapeHtml uses one regex pass with a lookup table, so each character is replaced exactly once. sanitizeValues builds on withDefaults, refuses to turn objects into strings, leaves passwords alone, removes invisible and direction-override characters, normalises with cleanText and caps by code points so no emoji is split. handleSubmit is a series of independent defences: the body must parse and be an object (400); every text field goes through sanitize and the same FIELD_RULES the browser uses (shared validators, no drift); the expiry and last four digits are checked; and the order is rebuilt from the server's own CATALOG, so a tampered price, an unknown SKU, a negative or fractional quantity or a lying total can never be accepted. Optional chaining throughout means a hostile body produces a 422 or 400, never an exception.",
      hints: [
        {
          id: "h1",
          title: "Escaping and stripping",
          content:
            "escapeHtml: String(text ?? '').replace(/[&<>\"']/g, (char) => HTML_ESCAPES[char]). INVISIBLE_RE is one character class with ranges: /[\\u0000-\\u0008\\u000B\\u000C\\u000E-\\u001F\\u007F\\u200B-\\u200D\\u2060\\uFEFF\\u202A-\\u202E\\u2066-\\u2069]/g . Tab, newline and carriage return (U+0009, U+000A, U+000D) are skipped by the ranges.",
        },
        {
          id: "h2",
          title: "sanitizeValues",
          content:
            "const merged = withDefaults(values); then Object.fromEntries(Object.entries(merged).map(([key, value]) => ...)). If typeof value !== 'string' use DEFAULTS[key]; if the key is password or confirm return it unchanged; otherwise cleanText(value.replace(INVISIBLE_RE, '')) and [...cleaned].slice(0, MAX_LENGTH).join('').",
        },
        {
          id: "h3",
          title: "handleSubmit",
          content:
            "Use parseJson from lesson 9. Flatten with optional chaining: customer?.email etc. Run validateAll(sanitizeValues({...}), CLIENT_FIELDS, context). For the order: loop over order.items, check Object.hasOwn(CATALOG, line?.sku) and Number.isInteger(line?.qty) with 1..99, add CATALOG[line.sku] * line.qty to a total, then compare with order.total?.cents. Return 400 / 422 / 201.",
        },
      ],
      tests: [
        {
          id: "t1",
          description: "escapeHtml neutralises markup in a single pass",
          assertionCode: t`assertEqual(escapeHtml('<script>alert("x")</script>'), "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;", "script tag");
assertEqual(escapeHtml("Tom & Jerry's"), "Tom &amp; Jerry&#39;s", "ampersand and apostrophe");
assertEqual(escapeHtml("&lt;"), "&amp;lt;", "Escaping is not idempotent: an existing entity is escaped (once)");
assertEqual(escapeHtml("plain text"), "plain text", "nothing to escape");
assertEqual(escapeHtml(null), "", "null becomes an empty string");
assertEqual(escapeHtml(undefined), "", "undefined becomes an empty string");
assertEqual(escapeHtml(42), "42", "numbers become text");`,
        },
        {
          id: "t2",
          description: "sanitizeValues returns every field as a clean string",
          assertionCode: t`const result = sanitizeValues({ fullName: "  Ada   Lovelace ", email: "a@b.co", city: "cafe\u0301", note: "line1\n\n  line2", extra: "drop me" });
assertEqual(Object.keys(result), Object.keys(DEFAULTS), "The result has exactly the keys of DEFAULTS");
assert(result.fullName === "Ada Lovelace", "text is trimmed and collapsed");
assert(result.city === "café", "text is normalized to NFC");
assert(result.note === "line1 line2", "whitespace runs collapse");
assert(result.country === "US" && result.phone === "", "missing fields take their defaults");
assert(!("extra" in result), "unknown keys are dropped");`,
        },
        {
          id: "t3",
          description: "sanitizeValues strips invisible and direction-override characters",
          assertionCode: t`const sneaky = "ad\u200bmin\u0000\u0007\u202eevil\u2066x\ufeff";
const result = sanitizeValues({ username: sneaky });
assert(result.username === "adminevilx", "Zero-width, control and bidi-override characters must be removed, got " + JSON.stringify(result.username));
const arabic = "مرحبا بالعالم";
assert(sanitizeValues({ fullName: arabic }).fullName === arabic, "Ordinary right-to-left text must survive untouched");
assert(sanitizeValues({ fullName: "tab\there" }).fullName === "tab here", "A tab is whitespace, not a control character to delete");`,
        },
        {
          id: "t4",
          description: "sanitizeValues caps length by code points",
          assertionCode: t`const result = sanitizeValues({ note: "😀".repeat(300), address: "a".repeat(500) });
assert(result.note === "😀".repeat(200), "300 emoji must be cut to exactly 200 emoji, never in the middle of one");
assert(result.address.length === 200, "500 characters are cut to 200");
assert(sanitizeValues({ note: "x".repeat(200) }).note.length === 200, "Exactly 200 is kept");`,
        },
        {
          id: "t5",
          description: "sanitizeValues never touches passwords or coerces objects",
          assertionCode: t`const long = " " + "p".repeat(300) + " ";
const result = sanitizeValues({ password: long, confirm: "  spaced  ", email: { toString: () => "evil" }, city: ["a", "b"], phone: 5551234567, country: null });
assert(result.password === long, "A password must come back exactly as given: no trimming, no truncating");
assert(result.confirm === "  spaced  ", "confirm too");
assert(result.email === "" && result.city === "" && result.phone === "", "Objects, arrays and numbers are not strings: use the default instead of coercing");
assert(result.country === "US", "null falls back to the default country");
const once = sanitizeValues({ fullName: "  a  b  ", note: "x\u200by" });
assertEqual(sanitizeValues(once), once, "sanitizeValues should be idempotent: cleaning clean data changes nothing");`,
        },
        {
          id: "t6",
          description: "handleSubmit accepts an honest order and recomputes the total",
          assertionCode: t`const ctx = { today: { year: 2026, month: 10 } };
const items = [
  { sku: "KB-01", name: "Keyboard", priceCents: 8900, qty: 1, addOns: [{ sku: "WR-02", name: "Wrist rest", priceCents: 1500 }] },
  { sku: "MS-07", name: "Mouse", priceCents: 2950, qty: 2, addOns: [] },
];
const values = { fullName: "Ada Lovelace", email: "ada@example.com", username: "ada_l", password: "Tr0ub4dor&3", confirm: "Tr0ub4dor&3", phone: "5551234567", address: "12 High St", city: "London", postcode: "SW1A 1AA", country: "GB", cardNumber: "4242424242424242", expiry: "12/30", cvc: "123" };
const body = buildPayload(values, items, "2026-10-26T12:00:00Z");
assertEqual(handleSubmit(body, ctx), { status: 201, total: { cents: 16300, currency: "USD" } }, "an honest order");`,
        },
        {
          id: "t7",
          description: "handleSubmit refuses a tampered total, price, SKU or quantity",
          assertionCode: t`const ctx = { today: { year: 2026, month: 10 } };
const good = {
  customer: { fullName: "Ada Lovelace", email: "ada@example.com", username: "ada_l" },
  shipping: { address: "12 High St", city: "London", postcode: "SW1A 1AA", country: "GB" },
  payment: { cardLast4: "4242", expiry: { month: 12, year: 2030 } },
  order: { items: [{ sku: "KB-01", qty: 1 }, { sku: "MS-07", qty: 2 }], total: { cents: 14800, currency: "USD" } },
};
const send = (change) => handleSubmit(JSON.stringify(change(structuredClone(good))), ctx);
assert(send((b) => b).status === 201, "(setup) the untouched request is accepted");
const cheap = send((b) => { b.order.total.cents = 1; return b; });
assert(cheap.status === 422 && Array.isArray(cheap.errors.order), "A total that does not match the items must be rejected under errors.order");
assert(send((b) => { b.order.items[0].sku = "FAKE-9"; return b; }).status === 422, "An unknown SKU is rejected");
assert(send((b) => { b.order.items[0].sku = "__proto__"; return b; }).status === 422, "A hostile SKU such as __proto__ is rejected (use Object.hasOwn)");
for (const qty of [-3, 0, 1.5, 100, "2", null, 1e9]) {
  assert(send((b) => { b.order.items[1].qty = qty; return b; }).status === 422, "Quantity " + JSON.stringify(qty) + " must be rejected");
}
assert(send((b) => { b.order.items = []; return b; }).status === 422, "An empty order is rejected");
assert(send((b) => { b.order.items = "everything"; return b; }).status === 422, "Items that are not an array are rejected");`,
        },
        {
          id: "t8",
          description: "handleSubmit re-validates every field on the server",
          assertionCode: t`const ctx = { today: { year: 2026, month: 10 } };
const good = {
  customer: { fullName: "Ada Lovelace", email: "ada@example.com", username: "ada_l" },
  shipping: { address: "12 High St", city: "London", postcode: "SW1A 1AA", country: "GB" },
  payment: { cardLast4: "4242", expiry: { month: 12, year: 2030 } },
  order: { items: [{ sku: "CB-12", qty: 1 }], total: { cents: 1200, currency: "USD" } },
};
const send = (change) => handleSubmit(JSON.stringify(change(structuredClone(good))), ctx);
const badEmail = send((b) => { b.customer.email = "not an email"; return b; });
assert(badEmail.status === 422 && badEmail.errors.email.length >= 1, "A bad email must be reported under errors.email");
const reserved = send((b) => { b.customer.username = "admin"; return b; });
assert(reserved.status === 422 && reserved.errors.username, "A reserved username must be rejected by the server too");
assert(send((b) => { b.shipping.postcode = "90210"; return b; }).errors.postcode, "A US postcode with country GB must be rejected");
assert(send((b) => { b.shipping.country = "XX"; return b; }).errors.country, "An unsupported country must be rejected");
assert(send((b) => { b.payment.expiry = { month: 1, year: 2020 }; return b; }).errors.expiry, "An expired card must be rejected under errors.expiry");
assert(send((b) => { b.payment.cardLast4 = "42"; return b; }).errors.payment, "cardLast4 must be exactly four digits");
const many = send((b) => { b.customer.email = ""; b.customer.fullName = ""; b.shipping.city = ""; return b; });
assert(Object.keys(many.errors).length >= 3, "All the problems are reported together, not just the first");`,
        },
        {
          id: "t9",
          description: "handleSubmit answers 400 for malformed requests and never throws",
          assertionCode: t`const ctx = { today: { year: 2026, month: 10 } };
for (const text of ["", "{not json", "null", "[]", "5", '"hello"', undefined, null]) {
  const response = handleSubmit(text, ctx);
  assert(response.status === 400 && Array.isArray(response.errors.body), "Malformed body " + JSON.stringify(text) + " should answer 400 with errors.body");
}
for (const text of ["{}", '{"customer":null,"shipping":5,"payment":"x","order":[]}', '{"order":{"items":[null,5,"x",{}]}}', '{"customer":{"email":{"a":1}},"__proto__":{"x":1}}']) {
  let response;
  try {
    response = handleSubmit(text, ctx);
  } catch (error) {
    throw new Error("handleSubmit must not throw, but crashed on " + text + ": " + error.name + ": " + error.message);
  }
  assert(response.status === 422, "A hostile but well-formed body " + text + " should answer 422, got " + response.status);
}`,
        },
      ],
      checks: [
        {
          prompt: t`A shopper bypasses your form and sends the request with ^^curl^^. Which statement is true?`,
          question: {
            type: "choice",
            options: [
              "The form's validation still protects the server",
              "Only the server's own validation can protect it, so the server must check everything again",
              "HTTPS validates the request body",
              "curl requests are always rejected by browsers",
            ],
            answer: 1,
          },
          explanation: "Client-side checks run in code the user controls. They help honest users, and they stop nobody who is willing to skip them. The server is the only trustworthy place for enforcement.",
        },
        {
          prompt: t`The request says ^^total: { cents: 1 }^^ for a basket worth 163 dollars. What should the server do?`,
          question: {
            type: "choice",
            options: [
              "Charge 1 cent: the client knows best",
              "Recompute the total from its own catalogue and reject (or ignore) the client's number",
              "Round it to the nearest dollar",
              "Accept it and hope",
            ],
            answer: 1,
          },
          explanation: "Anything the client sends about money is a claim. Prices live on the server; the total is derived from them.",
        },
        {
          prompt: t`Where should user text be HTML-escaped?`,
          question: {
            type: "choice",
            options: [
              "Once, when it is first typed in, forever after",
              "At the moment it is written into HTML, using the escaping that destination needs",
              "Never, if the input was validated",
              "Only in the database",
            ],
            answer: 1,
          },
          explanation: "Escaping depends on where text goes (HTML, URL, SQL, shell). Do it at the output boundary, in the way that destination requires; storing the validated raw text keeps every future use possible.",
        },
      ],
      unlocks: ["ff-secure"],
    },

    // ───────────────────────── 14 ─────────────────────────
    {
      id: "form-forge-14-schema",
      title: "Capstone: the schema-driven validator",
      minutes: 45,
      xp: 260,
      concepts: ["schemas", "fail-fast configuration errors", "normalize then validate", "cross-field & conditional rules", "pipelines", "testing"],
      learn: t`### From a table of rules to a schema

Your rules table already knows the *checks*. A real **schema** also describes how each field is *prepared* and when it applies:

~~~js
const SCHEMA = defineSchema({
  email: {
    normalize: (value) => cleanText(value).toLowerCase(),   // tidy first
    rules: [required(), optional(matches(EMAIL_RE, "Not an email"))],
  },
  postcode: {
    normalize: (value, all) => normalizePostcode(all.country, value) ?? cleanText(value),   // can read other fields
    rules: FIELD_RULES.postcode,
  },
  vatNumber: {
    when: (values) => values.accountType === "business",    // only applies to businesses
    rules: [required("Enter your VAT number")],
  },
});
~~~

A schema is **data plus one generic function**. ^^validateForm(values, schema)^^ does not know about emails or postcodes: it just loops over the schema. That is the payoff of everything in this chapter. The same engine can validate a sign-up form, a profile, an API request, or a config file; to add a field you add an entry, not code.

### Normalize, then validate

Order matters: first turn raw input into its tidy shape, then judge the tidy shape. ("  ADA@Example.com " is a fine email once cleaned.) Normalising has a rule of its own, though: **it must never turn invalid input into valid input**. If a card-number normaliser deleted every non-digit, then "4242 4242 4242 4242x" would become a valid number and the typo would vanish. Only normalise when the input already has the expected character set; otherwise just clean it and let the rules complain.

### Fail fast on programmer mistakes

There are two quite different kinds of problem:

- A **shopper** typed something invalid. Expected. Report it politely, as data.
- A **developer** wrote a broken schema: a rule with no ^^test^^, a ^^when^^ that isn't a function. Unexpected, and nobody can fix it at run time. **Throw immediately**, with a clear message, when the schema is *defined*, not three weeks later on the first Friday-evening order.

That is why ^^defineSchema^^ validates the schema itself and throws a ^^TypeError^^ (a programming error, deliberately *not* a ^^ValidationError^^, which is reserved for user input).

### One pipeline

The full journey of an order, using everything you've built:

1. **Client:** ^^validateForm^^ normalises and checks the values. Errors? Show them (all at once) and stop.
2. **Client:** ^^buildPayload^^ makes the secret-free JSON.
3. **Network:** the JSON text travels.
4. **Server:** ^^handleSubmit^^ parses, sanitises, **re-validates with the same rules**, and recomputes the money.
5. **Server:** answers ^^201^^ or ^^422^^ and the client displays the result.

The rules are defined once and used on both sides.

### Testing validators

Pure functions are a joy to test: no setup, no mocks. A good test suite for a validator checks, for each rule: a clearly valid value, a clearly invalid one, the **boundaries** (exactly the limit, one over), **empty / missing / wrong-type** input, and **hostile** input (huge strings, emoji, markup, ^^__proto__^^). That is precisely what the Fuzz button does for you: it throws strange input at every function you wrote and shows what it breaks. Run it after this lesson. It is humbling and very educational.

### Common mistakes

- **Validating before normalising** (rejecting " ADA@x.com").
- **A normaliser that fixes errors** it should have reported.
- **Letting a broken schema fail silently** at the first use.
- **Different rules on client and server**, copied by hand. Share one definition.
- **Forgetting that cross-field rules read the normalised values**, not the raw ones.`,
      mission: t`Everything you've built now comes together. One schema describes the whole checkout form: how each field is tidied and which rules judge it, and one generic function runs it. A final ^^submitForm^^ drives the entire journey from keystrokes to a 201 from the server.

Build the schema engine and the pipeline, then press **Fuzz it** and see how your code copes with emoji, right-to-left text, enormous strings and script tags. When you Run, the **Submit** button sends the order through your whole pipeline.`,
      tasks: [
        "defineSchema(spec): throw a TypeError for a malformed schema (rules not an array, a rule without id / message / test, normalize or when not functions), otherwise return the schema",
        "SCHEMA: one entry per field of DEFAULTS, with sensible normalizers (card numbers must not be 'repaired') and the rules from FIELD_RULES",
        "validateForm(values, schema, context): normalize every field, then run the rules (skipping fields whose when() is false), returning { valid, errors, values }",
        "submitForm(values, items, submittedAt): validate, build the payload, send it to handleSubmit, and report { ok, stage, status, ... }",
      ],
      starterAdd: t`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 14: the schema, the engine, and the whole pipeline.
//
// A schema maps field names to:
//   { normalize?: (value, allRawValues) => tidyValue,   // optional
//     when?:      (normalizedValues) => boolean,        // optional: skip the field's rules if false
//     rules:      [ { id, message, test } ... ] }       // required array

// 1. Check the schema ITSELF. Throw a TypeError (message mentions the field name, e.g.
//    Schema field "email" needs a rules array) when, for any field:
//      - rules is not an array
//      - a rule lacks a string id, a string message or a function test
//      - normalize exists but is not a function, or when exists but is not a function
//    Otherwise return the schema untouched.
function defineSchema(spec) {
  // TODO
}

// 2. The checkout form's schema: one entry for EVERY key of DEFAULTS. Reuse FIELD_RULES.
//    Normalizers:
//      fullName, username, address, expiry, cvc: cleanText         email: cleanText + lower case
//      city: titleCase                                             note: cleanText, then redactCards
//      phone: formatPhone(value) when it works, else cleanText(value)
//      postcode: normalizePostcode(all.country, value) when it works, else cleanText(value)
//      cardNumber: formatCardNumber(value) ONLY when cleanText(value) is purely digits, spaces and dashes
//                  (/^[\d -]+$/); otherwise cleanText(value). Never "repair" 4242 4242 4242 4242x !
//      password, confirm, country: no normalizer (passwords are exact)
const SCHEMA = defineSchema({
  // TODO
});

// 3. The generic engine. For every field in the schema:
//      - raw = values?.[name] ?? ""
//      - normalized value = field.normalize ? field.normalize(raw, values ?? {}) : raw
//    THEN, using the normalized values of ALL fields:
//      - skip a field if it has a when() that returns false
//      - otherwise run its rules: test(normalized[name], normalized, context); collect the messages of the failures
//    Return { valid: boolean, errors: { name: [messages] } (only failing fields), values: normalized }.
function validateForm(values, schema = SCHEMA, context = { today: currentMonth() }) {
  // TODO
}

// 4. The whole journey.
//      - validateForm(values, SCHEMA, context). Invalid? return { ok: false, status: 422, stage: "client", errors }
//      - buildPayload(normalizedValues, items, submittedAt) inside attempt(): if it fails (for example a bad
//        date) return { ok: false, status: 400, stage: "client", errors: { submittedAt: [message] } }
//      - handleSubmit(body, context): return { ok: status === 201, stage: "server", ...response, body }
//    The context defaults to the month of submittedAt (use contextFor below).
function contextFor(submittedAt) {
  const date = new Date(submittedAt);
  return { today: { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 } };
}
function submitForm(values, items, submittedAt, context = contextFor(submittedAt)) {
  // TODO
}
`,
      solutionAdd: t`function defineSchema(spec) {
  for (const [name, field] of Object.entries(spec)) {
    if (!Array.isArray(field?.rules)) throw new TypeError(^^Schema field "$\{name}" needs a rules array^^);
    if (field.normalize !== undefined && typeof field.normalize !== "function") {
      throw new TypeError(^^Schema field "$\{name}": normalize must be a function^^);
    }
    if (field.when !== undefined && typeof field.when !== "function") {
      throw new TypeError(^^Schema field "$\{name}": when must be a function^^);
    }
    for (const rule of field.rules) {
      if (typeof rule?.id !== "string" || typeof rule?.message !== "string" || typeof rule?.test !== "function") {
        throw new TypeError(^^Schema field "$\{name}" has a malformed rule^^);
      }
    }
  }
  return spec;
}

const SCHEMA = defineSchema({
  fullName: { normalize: cleanText, rules: FIELD_RULES.fullName },
  email: { normalize: (value) => cleanText(value).toLowerCase(), rules: FIELD_RULES.email },
  username: { normalize: cleanText, rules: FIELD_RULES.username },
  password: { rules: FIELD_RULES.password },
  confirm: { rules: FIELD_RULES.confirm },
  phone: { normalize: (value) => formatPhone(value) ?? cleanText(value), rules: FIELD_RULES.phone },
  address: { normalize: cleanText, rules: FIELD_RULES.address },
  city: { normalize: titleCase, rules: FIELD_RULES.city },
  postcode: { normalize: (value, all) => normalizePostcode(all.country, value) ?? cleanText(value), rules: FIELD_RULES.postcode },
  country: { rules: FIELD_RULES.country },
  note: { normalize: (value) => redactCards(cleanText(value)), rules: FIELD_RULES.note },
  cardNumber: { normalize: (value) => (/^[\d -]+$/.test(cleanText(value)) ? formatCardNumber(value) : cleanText(value)), rules: FIELD_RULES.cardNumber },
  expiry: { normalize: cleanText, rules: FIELD_RULES.expiry },
  cvc: { normalize: cleanText, rules: FIELD_RULES.cvc },
});

function validateForm(values, schema = SCHEMA, context = { today: currentMonth() }) {
  const source = values ?? {};
  const normalized = {};
  for (const [name, field] of Object.entries(schema)) {
    const raw = source[name] ?? "";
    normalized[name] = field.normalize ? field.normalize(raw, source) : raw;
  }
  const errors = {};
  for (const [name, field] of Object.entries(schema)) {
    if (field.when && !field.when(normalized)) continue;
    const messages = field.rules.filter((rule) => !rule.test(normalized[name], normalized, context)).map((rule) => rule.message);
    if (messages.length > 0) errors[name] = messages;
  }
  return { valid: Object.keys(errors).length === 0, errors, values: normalized };
}

function contextFor(submittedAt) {
  const date = new Date(submittedAt);
  return { today: { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 } };
}

function submitForm(values, items, submittedAt, context = contextFor(submittedAt)) {
  const checked = validateForm(values, SCHEMA, context);
  if (!checked.valid) return { ok: false, status: 422, stage: "client", errors: checked.errors };
  const built = attempt(() => buildPayload(checked.values, items, submittedAt));
  if (!built.ok) return { ok: false, status: 400, stage: "client", errors: { submittedAt: [built.error.message] } };
  const response = handleSubmit(built.value, context);
  return { ok: response.status === 201, stage: "server", ...response, body: built.value };
}`,
      explanation:
        "defineSchema is the fail-fast guard: it uses TypeError, not ValidationError, because a malformed schema is a programming mistake, and it names the field so the fix is obvious. SCHEMA reuses FIELD_RULES by reference and only adds the 'prepare' half; the card normaliser refuses to repair text containing letters, so 4242...x stays invalid. validateForm is completely generic: pass 1 normalises every field (normalisers may read the raw values of other fields, like the country for a postcode), pass 2 runs the rules against the normalised values, honouring when(). submitForm strings the chapter together: client-side validation, payload building (wrapped in attempt so a bad date becomes data), then the server, which independently re-validates the very same payload.",
      hints: [
        {
          id: "h1",
          title: "defineSchema",
          content:
            "Loop with for (const [name, field] of Object.entries(spec)). Check Array.isArray(field?.rules); then for each rule check typeof rule?.id === 'string' and so on. Throw new TypeError(...) with the field name in the message. Finish with return spec.",
        },
        {
          id: "h2",
          title: "SCHEMA and validateForm",
          content:
            "SCHEMA: { fullName: { normalize: cleanText, rules: FIELD_RULES.fullName }, ... } for each key of DEFAULTS. validateForm has two loops over Object.entries(schema): the first fills normalized[name]; the second skips fields where field.when && !field.when(normalized) and otherwise collects field.rules.filter((rule) => !rule.test(normalized[name], normalized, context)).map((rule) => rule.message).",
        },
        {
          id: "h3",
          title: "submitForm",
          content:
            "const checked = validateForm(values, SCHEMA, context); return early if !checked.valid. const built = attempt(() => buildPayload(checked.values, items, submittedAt)); if (!built.ok) return {..., status: 400, errors: { submittedAt: [built.error.message] }}. Then const response = handleSubmit(built.value, context); return { ok: response.status === 201, stage: 'server', ...response, body: built.value }.",
        },
      ],
      tests: [
        {
          id: "t1",
          description: "defineSchema accepts a good schema and returns it",
          assertionCode: t`const spec = {
  a: { rules: [{ id: "x", message: "m", test: () => true }] },
  b: { normalize: (v) => v, when: () => true, rules: [] },
};
assert(defineSchema(spec) === spec, "defineSchema should return the schema it was given");
assertEqual(defineSchema({}), {}, "an empty schema is allowed");`,
        },
        {
          id: "t2",
          description: "defineSchema throws a TypeError naming the broken field",
          assertionCode: t`const rule = { id: "x", message: "m", test: () => true };
const broken = {
  "rules is missing": { a: {} },
  "rules is not an array": { a: { rules: rule } },
  "a rule has no test": { a: { rules: [{ id: "x", message: "m" }] } },
  "a rule has no id": { a: { rules: [{ message: "m", test: () => true }] } },
  "a rule message is not text": { a: { rules: [{ id: "x", message: 5, test: () => true }] } },
  "normalize is not a function": { a: { normalize: "trim", rules: [rule] } },
  "when is not a function": { a: { when: true, rules: [rule] } },
};
for (const [why, spec] of Object.entries(broken)) {
  let caught = null;
  try {
    defineSchema(spec);
  } catch (error) {
    caught = error;
  }
  assert(caught instanceof TypeError, "Expected a TypeError when " + why + ", got " + (caught ? caught.name : "no error"));
  assert(caught.message.includes('"a"'), "The message should name the field (\"a\") when " + why + ". Got: " + caught.message);
}`,
        },
        {
          id: "t3",
          description: "SCHEMA covers every form field",
          assertionCode: t`assertEqual(Object.keys(SCHEMA).sort(), Object.keys(DEFAULTS).sort(), "SCHEMA needs exactly one entry per key of DEFAULTS");
for (const [name, field] of Object.entries(SCHEMA)) {
  assert(Array.isArray(field.rules), name + " needs a rules array");
}`,
        },
        {
          id: "t4",
          description: "validateForm works on any schema: normalize first, then validate",
          assertionCode: t`const schema = defineSchema({
  name: { normalize: (v) => String(v).trim().toUpperCase(), rules: [{ id: "len", message: "too short", test: (v) => v.length >= 3 }] },
  extra: { rules: [{ id: "any", message: "needs something", test: (v) => v !== "" }] },
});
const ok = validateForm({ name: "  abc ", extra: "x", ignored: "me" }, schema, { today: { year: 2026, month: 10 } });
assertEqual(ok, { valid: true, errors: {}, values: { name: "ABC", extra: "x" } }, "valid result (unknown input keys are dropped, name is normalized)");
const bad = validateForm({ name: " a " }, schema, { today: { year: 2026, month: 10 } });
assertEqual(bad.valid, false, "invalid");
assertEqual(bad.errors, { name: ["too short"], extra: ["needs something"] }, "errors are collected for every failing field");
assertEqual(bad.values, { name: "A", extra: "" }, "missing values become empty strings before rules run");`,
        },
        {
          id: "t5",
          description: "validateForm honours when() and passes all values to the rules",
          assertionCode: t`const schema = defineSchema({
  type: { rules: [] },
  vat: { when: (values) => values.type === "business", rules: [{ id: "required", message: "VAT needed", test: (v) => v !== "" }] },
  confirm: { rules: [{ id: "same", message: "must match", test: (v, all) => v === all.vat }] },
});
const ctx = { today: { year: 2026, month: 10 } };
assertEqual(validateForm({ type: "person", vat: "", confirm: "" }, schema, ctx).errors, {}, "VAT is not required for a person");
assertEqual(validateForm({ type: "business", vat: "", confirm: "" }, schema, ctx).errors, { vat: ["VAT needed"] }, "VAT is required for a business");
assertEqual(validateForm({ type: "person", vat: "A", confirm: "B" }, schema, ctx).errors, { confirm: ["must match"] }, "cross-field rules see the other values");`,
        },
        {
          id: "t6",
          description: "The checkout SCHEMA normalizes good input",
          assertionCode: t`const ctx = { today: { year: 2026, month: 10 } };
const values = { fullName: "  Ada   Lovelace ", email: " ADA@Example.com ", username: "ada_l", password: "Tr0ub4dor&3", confirm: "Tr0ub4dor&3", phone: "555.123.4567", address: " 12  High St ", city: "lONDON", postcode: "sw1a1aa", country: "GB", note: "", cardNumber: "4242-4242-4242-4242", expiry: " 12 / 30 ", cvc: "123" };
const result = validateForm(values, SCHEMA, ctx);
assertEqual(result.errors, {}, "this form is valid");
assert(result.valid === true, "valid should be true");
assertEqual(result.values.fullName, "Ada Lovelace", "fullName");
assertEqual(result.values.email, "ada@example.com", "email is lower-cased");
assertEqual(result.values.phone, "(555) 123-4567", "phone is formatted");
assertEqual(result.values.city, "London", "city is title-cased");
assertEqual(result.values.postcode, "SW1A 1AA", "postcode uses the country");
assertEqual(result.values.cardNumber, "4242 4242 4242 4242", "card number is grouped");
assertEqual(result.values.expiry, "12 / 30", "expiry is cleaned");
assertEqual(result.values.password, "Tr0ub4dor&3", "passwords are untouched");`,
        },
        {
          id: "t7",
          description: "The checkout SCHEMA reports every problem, and never repairs a bad card number",
          assertionCode: t`const ctx = { today: { year: 2026, month: 10 } };
const values = { fullName: "", email: "nope", username: "admin", password: "abc", confirm: "abd", phone: "12", address: "", city: "", postcode: "123", country: "FR", note: "x".repeat(201), cardNumber: "4242 4242 4242 4241", expiry: "01/20", cvc: "1" };
const { valid, errors } = validateForm(values, SCHEMA, ctx);
assert(valid === false, "this form is invalid");
assertEqual(Object.keys(errors).sort(), Object.keys(DEFAULTS).sort(), "Every field here has a problem, and all of them are reported at once");
const typo = validateForm({ cardNumber: "4242 4242 4242 4242x" }, SCHEMA, ctx);
assert(typo.errors.cardNumber && typo.errors.cardNumber.length >= 1, "A card number with a stray letter must be rejected, not silently repaired");
assert(typo.values.cardNumber.includes("x"), "The normalized card number should keep the offending letter");`,
        },
        {
          id: "t8",
          description: "validateForm survives hostile input",
          assertionCode: t`const ctx = { today: { year: 2026, month: 10 } };
for (const input of [null, undefined, {}, [], 42, "text", { fullName: {}, email: [], password: null, country: "__proto__", postcode: Symbol.iterator.toString(), note: "<script>x</script>".repeat(1000) }]) {
  let result;
  try {
    result = validateForm(input, SCHEMA, ctx);
  } catch (error) {
    throw new Error("validateForm must not throw for " + JSON.stringify(input) + ": " + error.name + ": " + error.message);
  }
  assert(result.valid === false && typeof result.errors === "object", "Junk input is simply invalid");
}`,
        },
        {
          id: "t9",
          description: "submitForm runs the whole pipeline to a 201",
          assertionCode: t`const items = [
  { sku: "KB-01", name: "Keyboard", priceCents: 8900, qty: 1, addOns: [{ sku: "WR-02", name: "Wrist rest", priceCents: 1500 }] },
  { sku: "MS-07", name: "Mouse", priceCents: 2950, qty: 2, addOns: [] },
];
const values = { fullName: "Ada Lovelace", email: "ada@example.com", username: "ada_l", password: "Tr0ub4dor&3", confirm: "Tr0ub4dor&3", phone: "5551234567", address: "12 High St", city: "london", postcode: "sw1a1aa", country: "GB", note: "", cardNumber: "4242 4242 4242 4242", expiry: "12/30", cvc: "123" };
const result = submitForm(values, items, "2026-10-26T12:00:00Z");
assert(result.ok === true && result.status === 201 && result.stage === "server", "Expected ok, status 201, stage 'server'; got " + JSON.stringify({ ok: result.ok, status: result.status, stage: result.stage, errors: result.errors }));
assertEqual(result.total, { cents: 16300, currency: "USD" }, "The server's recomputed total");
const body = JSON.parse(result.body);
assert(body.shipping.city === "London" && body.shipping.postcode === "SW1A 1AA", "The payload contains the normalized values");
for (const secret of ["Tr0ub4dor", "4242 4242", "4242424242424242", '"cvc"']) {
  assert(!result.body.includes(secret), "The body must not contain " + secret);
}`,
        },
        {
          id: "t10",
          description: "submitForm stops at the client for invalid forms and handles a bad date",
          assertionCode: t`const bad = submitForm({ email: "nope" }, [], "2026-10-26T12:00:00Z");
assert(bad.ok === false && bad.status === 422 && bad.stage === "client", "An invalid form should stop at the client with status 422");
assert(bad.errors.email && bad.errors.fullName, "...and list the errors, all of them");
assert(bad.body === undefined, "No request body is built for an invalid form");
const values = { fullName: "Ada Lovelace", email: "ada@example.com", username: "ada_l", password: "Tr0ub4dor&3", confirm: "Tr0ub4dor&3", address: "12 High St", city: "London", postcode: "SW1A 1AA", country: "GB", cardNumber: "4242 4242 4242 4242", expiry: "12/30", cvc: "123" };
const noItems = submitForm(values, [], "2026-10-26T12:00:00Z");
assert(noItems.ok === false && noItems.stage === "server" && noItems.status === 422 && noItems.errors.order, "A valid form with an empty basket gets past the client but the server refuses it (errors.order)");
const badDate = submitForm(values, [{ sku: "CB-12", name: "Cable", priceCents: 1200, qty: 1 }], "yesterday");
assert(badDate.ok === false && badDate.status === 400 && badDate.stage === "client" && badDate.errors.submittedAt, "An impossible submittedAt should give status 400 with errors.submittedAt");`,
        },
      ],
      checks: [
        {
          prompt: t`Why does ^^defineSchema^^ throw a ^^TypeError^^ for a malformed schema, rather than returning an error object like the validators do?`,
          question: {
            type: "choice",
            options: [
              "TypeErrors are faster",
              "A broken schema is a programmer mistake, not user input: it should fail loudly at definition time, not be handled",
              "Schemas are always user input",
              "Returning objects is not allowed for schemas",
            ],
            answer: 1,
          },
          explanation: "Invalid input from a person is normal and reported as data. A malformed schema is a bug in the program, and the earlier it blows up (at definition), the cheaper it is to find.",
        },
        {
          prompt: t`Why must a normaliser never "repair" a card number by deleting every non-digit?`,
          question: {
            type: "choice",
            options: [
              "It would be slow",
              "It could turn an invalid entry into a valid-looking one, hiding the shopper's typo",
              "Card numbers contain letters",
              "Because spaces are required",
            ],
            answer: 1,
          },
          explanation: "Normalising is about tidying formatting. If it also fixes content, errors that should be reported silently disappear and the user is charged on a number they did not mean.",
        },
        {
          prompt: t`The browser and the server use the same ^^FIELD_RULES^^. What is the main benefit?`,
          question: {
            type: "choice",
            options: [
              "The server can skip validation",
              "A single definition means client feedback and server enforcement cannot drift apart",
              "It makes requests smaller",
              "It removes the need for tests",
            ],
            answer: 1,
          },
          explanation: "Shared pure rules give users instant feedback while the server still enforces the same policy on every request. The server must still run them; sharing is for consistency, not a replacement for enforcement.",
        },
      ],
      unlocks: ["ff-schema"],
    },
  ],
};
