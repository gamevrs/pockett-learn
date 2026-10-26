import type { Chapter } from "@/engine/types";
import { t } from "./tag.ts";

/**
 * Form Forge, chapter 2: Pattern matching.
 * Regular expressions in JavaScript: tests, captures and replacements, lookaheads, and safe escaping.
 *
 * Authoring notes: see tag.ts. Regexes are written exactly as in real code; ^^ is a backtick.
 */

export const chapter2: Chapter = {
  id: "pattern-matching",
  title: "Pattern matching",
  blurb: "Regular expressions: recognise, extract and rewrite text, and use them safely.",
  lessons: [
    // ───────────────────────── 5 ─────────────────────────
    {
      id: "form-forge-5-regex-basics",
      title: "Regular expressions: is it the right shape?",
      minutes: 30,
      xp: 130,
      concepts: ["regex literals vs RegExp", "character classes", "anchors", "quantifiers", "flags", "test()", "lastIndex trap"],
      learn: t`### A pattern for text

A **regular expression** (regex) describes a *shape* of text, and the engine tells you whether some text has that shape. "Three digits", "something, an at-sign, something, a dot, something": those are shapes. Regexes are not magic and not always the right tool, but for checking the format of short strings they are the standard.

JavaScript has a regex literal, written between slashes, and a constructor:

~~~js
const literal = /\d{3}/;                  // the usual way: checked when the file loads
const built = new RegExp("\\d{3}");       // built from a string at run time
~~~

Use the literal whenever the pattern is fixed. The constructor is for patterns assembled from variables (see lesson 7). Notice the doubled backslash: inside a *string*, ^^"\d"^^ is just ^^"d"^^, so you must write ^^"\\d"^^. A regex literal has no such problem.

### The building blocks

- A plain letter or digit matches itself: ^^/cat/^^.
- ^^.^^ matches any one character except a line break. To match an actual dot, escape it: ^^\.^^. The characters that need escaping are ^^. * + ? ^ $ { } ( ) | [ ] \^^ and ^^/^^ in a literal.
- **Character classes** match one character out of a set: ^^[abc]^^, a range ^^[a-z0-9]^^, or a negation ^^[^\s@]^^ ("anything that is not whitespace or @").
- **Shorthands**: ^^\d^^ is a digit 0-9, ^^\w^^ is a letter, digit or underscore (ASCII only: it does *not* match é), ^^\s^^ is whitespace. The capital forms ^^\D \W \S^^ mean the opposite.
- **Anchors**: ^^~^^^ is the start of the text and ^^$^^ is the end. ^^\b^^ is a word boundary.
- **Quantifiers** say how many: ^^?^^ (zero or one), ^^*^^ (zero or more), ^^+^^ (one or more), ^^{3}^^ (exactly three), ^^{2,5}^^ (two to five), ^^{3,}^^ (three or more). A quantifier applies to the thing just before it.
- **Alternation** with ^^|^^: ^^/cat|dog/^^. **Groups** with ^^( )^^ let a quantifier or ^^|^^ apply to several characters: ^^/(ab)+/^^.

~~~js
/^\d{3}$/.test("123");      // true
/^\d{3}$/.test("1234");     // false
/\d{3}/.test("a1234b");     // true  !!  no anchors, so a 3-digit piece anywhere is enough
~~~

### Anchors are not optional

That last line is the number one regex validation bug. Without ^^~^^^ and ^^$^^ a regex answers "does this *contain* the shape?", not "*is* this the shape?". For checking a whole field, anchor both ends. In JavaScript, ^^$^^ means the very end of the text (so ^^/^\d+$/.test("12\n")^^ is ^^false^^, which is what you want).

### Flags

Flags go after the closing slash.

- ^^i^^ ignore case: ^^/yes/i^^ matches "YES".
- ^^g^^ global: find all matches, not just the first (matters for ^^match^^, ^^replace^^, ^^matchAll^^).
- ^^m^^ multiline: ^^~^^^ and ^^$^^ match at each line break.
- ^^s^^ dotAll: ^^.^^ also matches line breaks.
- ^^u^^ Unicode: treat text as code points and allow ^^\p{...}^^ property classes. Use it whenever non-English text is possible.
- ^^y^^ sticky: match only at a position you control.

### test, and its stateful trap

^^regex.test(text)^^ returns ^^true^^ or ^^false^^. Other helpers take a regex too: ^^text.match(re)^^, ^^text.replace(re, ...)^^, ^^text.split(re)^^, ^^text.search(re)^^.

Now the trap. A regex with the **^^g^^ or ^^y^^ flag remembers where it stopped** in a property called ^^lastIndex^^, and ^^test^^ starts from there next time:

~~~js
const re = /a/g;
re.test("a");   // true
re.test("a");   // false !!  it resumed after the first "a" and found nothing
re.test("a");   // true again (it wrapped around)
~~~

A validator that reuses a module-level regex with ^^g^^ will pass and fail the *same input* on alternating calls. For a yes/no test, leave ^^g^^ off.

### A practical email check

You cannot truly validate an email address with a regex: the real grammar is enormous, and a perfectly formatted address can still be dead. The professional approach is a **lenient shape check** (catch typos and obvious junk), then **send a confirmation email**, which proves the address works and belongs to the person. A good lenient pattern: no spaces or at-signs in the pieces, exactly one at-sign, a dot in the domain.

~~~js
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
~~~

Read it left to right: start, one or more non-space-non-at characters, an @, more of the same, a literal dot, at least two more, end.

### Common mistakes

- **Forgetting anchors**, so "abc123xyz" passes a "digits only" check.
- **Leaving ^^g^^ on a shared regex** used with ^^test^^.
- **Forgetting that ^^\w^^ and ^^\d^^ are ASCII-only.** ^^/^\w+$/.test("café")^^ is false.
- **Writing ^^new RegExp("\d+")^^**, which is really ^^/d+/^^. Double the backslash, or use ^^String.raw^^.
- **Over-engineering.** A 300-character regex for names or emails is a maintenance bomb. Check the shape; verify the rest another way.`,
      mission: t`The form's first line of defence: is that even the right *shape* of text? An email without an @, a username with spaces, a CVC with letters: all of these can be rejected in microseconds, before anything else is attempted.

Write the shape checks as regular expressions. When you Run, every box gets a live tick or cross as you type, and the rule panel shows which of your patterns fired on each keystroke.`,
      tasks: [
        "EMAIL_RE and isEmail(value): lenient shape, at most 254 characters, no whitespace anywhere",
        "USERNAME_RE and isUsername(value): 3 to 20 characters, starts with a letter, then letters, digits, _ or -, case-insensitive",
        "CVC_RE and isCvc(value): exactly 3 or 4 digits",
        "isCardNumber(value): digits with optional spaces or dashes, 13 to 19 digits in all, passing the Luhn check",
      ],
      starterAdd: t`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 5: shape checks with regular expressions.
// Rules of thumb: anchor both ends (^ and $), never use the g flag for a yes/no test,
// and always check typeof value === "string" first: form data may be anything.

// 1. Something@something.something, with no whitespace or extra @ anywhere.
const EMAIL_RE = /TODO/;
function isEmail(value) {
  // TODO: a string, at most 254 characters, that matches EMAIL_RE
}

// 2. 3-20 characters; the first is a letter; the rest are letters, digits, _ or -.
//    Capitals are fine (use a flag for that).
const USERNAME_RE = /TODO/;
function isUsername(value) {
  // TODO
}

// 3. Three or four digits.
const CVC_RE = /TODO/;
function isCvc(value) {
  // TODO
}

// 4. A card number as typed: digits, spaces and dashes only (nothing else!),
//    13-19 digits once cleaned, and luhnCheck must pass.
//    You already wrote digitsOnly and luhnCheck.
function isCardNumber(value) {
  // TODO
}
`,
      solutionAdd: t`const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function isEmail(value) {
  return typeof value === "string" && value.length <= 254 && EMAIL_RE.test(value);
}

const USERNAME_RE = /^[a-z][a-z0-9_-]{2,19}$/i;

function isUsername(value) {
  return typeof value === "string" && USERNAME_RE.test(value);
}

const CVC_RE = /^\d{3,4}$/;

function isCvc(value) {
  return typeof value === "string" && CVC_RE.test(value);
}

function isCardNumber(value) {
  if (typeof value !== "string" || !/^[\d -]+$/.test(value)) return false;
  const digits = digitsOnly(value);
  return /^\d{13,19}$/.test(digits) && luhnCheck(digits);
}`,
      explanation:
        "Each check follows the same recipe: confirm the value is a string, then test it against an anchored pattern with no g flag, so the answer depends only on the input. EMAIL_RE uses negated classes ([^\\s@]) so whitespace and extra @ signs can never sneak in; the length cap protects against absurd input. USERNAME_RE needs the i flag because the class only lists lowercase a-z. isCardNumber is a pipeline: reject any character outside digits, spaces and dashes, clean to digits, check the length with a second regex, and finish with Luhn so typos are caught.",
      hints: [
        {
          id: "h1",
          title: "Email and CVC",
          content:
            "EMAIL_RE = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]{2,}$/ . CVC_RE = /^\\d{3,4}$/ . Remember typeof value === 'string' before calling .test(), and value.length <= 254 for the email.",
        },
        {
          id: "h2",
          title: "Username",
          content:
            "Start with a letter, then 2 to 19 more characters from letters, digits, underscore and hyphen: /^[a-z][a-z0-9_-]{2,19}$/i . The i flag makes [a-z] accept capitals. Put the hyphen last inside the brackets so it is not read as a range.",
        },
        {
          id: "h3",
          title: "Card number",
          content:
            "Reject early with /^[\\d -]+$/.test(value) (the set contains digits, a space and a dash). Then digits = digitsOnly(value) and return /^\\d{13,19}$/.test(digits) && luhnCheck(digits).",
        },
      ],
      tests: [
        {
          id: "t1",
          description: "isEmail accepts normal addresses",
          assertionCode: t`for (const good of ["ada@example.com", "ada+shop@mail.example.co.uk", "a.b-c_d@sub.domain.org", "josé@exämple.com"]) {
  assert(isEmail(good) === true, good + " should be accepted as an email");
}`,
        },
        {
          id: "t2",
          description: "isEmail rejects the wrong shape and anything with whitespace",
          assertionCode: t`for (const bad of ["", "ada", "ada@", "@example.com", "ada@example", "ada@example.c", "ada@@example.com", "a b@example.com", "ada@exam ple.com", " ada@example.com", "ada@example.com ", "ada@example.com\nBcc: evil@example.org"]) {
  assert(isEmail(bad) === false, JSON.stringify(bad) + " should be rejected");
}
assert(isEmail("a".repeat(250) + "@b.co") === false, "More than 254 characters is too long to be an email");`,
        },
        {
          id: "t3",
          description: "isEmail ignores non-strings and gives the same answer every time",
          assertionCode: t`assert(isEmail(null) === false && isEmail(undefined) === false && isEmail(42) === false && isEmail({}) === false, "Non-strings are not emails, and must not crash");
assert(isEmail("ada@example.com") === true, "first call");
assert(isEmail("ada@example.com") === true, "second call: a regex with the g flag would fail here");
assert(isEmail("ada@example.com") === true, "third call");
assert(EMAIL_RE instanceof RegExp && !EMAIL_RE.global && !EMAIL_RE.sticky, "EMAIL_RE must be a RegExp without the g or y flags");`,
        },
        {
          id: "t4",
          description: "isUsername enforces length, first letter and allowed characters",
          assertionCode: t`for (const good of ["ada", "Ada_Lovelace", "ada-99", "a1_", "x".repeat(20)]) {
  assert(isUsername(good) === true, good + " should be a valid username");
}
for (const bad of ["", "ab", "1ada", "_ada", "-ada", "ada lovelace", "ada!", "x".repeat(21), "ada\n", "adá"]) {
  assert(isUsername(bad) === false, JSON.stringify(bad) + " should be rejected");
}
assert(isUsername(null) === false && isUsername(12345) === false, "Non-strings are rejected");`,
        },
        {
          id: "t5",
          description: "isCvc wants exactly 3 or 4 digits",
          assertionCode: t`assert(isCvc("123") === true && isCvc("1234") === true, "3 and 4 digits are fine");
for (const bad of ["", "12", "12345", "12a", "1 23", " 123", "123\n", "١٢٣"]) {
  assert(isCvc(bad) === false, JSON.stringify(bad) + " should be rejected");
}
assert(isCvc(123) === false, "A number is not a string of digits");`,
        },
        {
          id: "t6",
          description: "isCardNumber combines format, length and the Luhn check",
          assertionCode: t`assert(isCardNumber("4242424242424242") === true, "plain digits");
assert(isCardNumber("4242 4242 4242 4242") === true, "spaces are allowed");
assert(isCardNumber("4242-4242-4242-4242") === true, "dashes are allowed");
assert(isCardNumber("4242424242424241") === false, "bad check digit");
assert(isCardNumber("4242 4242 4242 424x") === false, "a letter is not allowed");
assert(isCardNumber("424242") === false, "too short");
assert(isCardNumber("4".repeat(30)) === false, "too long");
assert(isCardNumber("") === false && isCardNumber(null) === false && isCardNumber(4242424242424242) === false, "empty and non-string input");`,
        },
      ],
      checks: [
        {
          prompt: t`^^const re = /a/g;^^ then ^^re.test("a")^^ is called twice in a row. What do the two calls return?`,
          question: { type: "choice", options: ["true, true", "true, false", "false, true", "false, false"], answer: 1 },
          explanation: "With the g flag the regex keeps lastIndex between calls. After the first match lastIndex is 1, so the second call starts at the end of 'a' and finds nothing (and resets). Leave g off for yes/no tests.",
        },
        {
          prompt: t`You check a whole field with ^^/\d{3}/.test(value)^^. Which input wrongly passes?`,
          question: { type: "choice", options: ["123", "abc", "x123y", "12"], answer: 2 },
          explanation: "Without ^ and $ the pattern only has to find three digits somewhere. 'x123y' contains them, so it passes. Use /^\\d{3}$/ to require the whole value to be exactly three digits.",
        },
        {
          prompt: t`What regex does ^^new RegExp("\d+")^^ build?`,
          question: { type: "choice", options: ["One or more digits, /\\d+/", "The letter d one or more times, /d+/", "It throws a SyntaxError", "A backslash followed by d"], answer: 1 },
          explanation: "In a normal string the escape \\d is just d, so the regex source is 'd+'. Write new RegExp('\\\\d+'), or use a regex literal, or String.raw.",
        },
      ],
      unlocks: ["ff-patterns"],
    },

    // ───────────────────────── 6 ─────────────────────────
    {
      id: "form-forge-6-regex-groups",
      title: "Groups, replace and formatting",
      minutes: 35,
      xp: 150,
      concepts: ["capture groups", "named groups", "match / matchAll / exec", "replace with $<name>", "replace callbacks", "Object.hasOwn", "g flag"],
      learn: t`### Capturing: pull the pieces out

Parentheses do two jobs. They group, and they **capture**: the text each group matched is saved for you. Add a name with ^^(?<name>...)^^ and the capture is easy to read back.

~~~js
const m = /^(?<month>\d{1,2})\/(?<year>\d{2})$/.exec("08/27");
m[0];             // "08/27"   the whole match
m[1];             // "08"      group 1
m.groups.month;   // "08"
m.groups.year;    // "27"
~~~

Prefer **named groups**: the pattern documents itself, and adding a group later does not renumber everything. If you need grouping without capturing, write ^^(?:...)^^.

### Three ways to ask

- ^^re.exec(text)^^ returns a match object (with ^^index^^ and ^^groups^^) or ^^null^^.
- ^^text.match(re)^^ *without* ^^g^^ does the same as ^^exec^^. *With* ^^g^^ it returns an array of **all matched strings** (no groups), or ^^null^^ if none.
- ^^text.matchAll(re)^^ requires ^^g^^ and gives an iterator of full match objects, groups included. Spread it into an array.

~~~js
const text = "Call 555-0100 or 555-0199.";
const re = /(?<prefix>\d{3})-(?<line>\d{4})/g;
[...text.matchAll(re)].map((m) => m.groups.line);
// ["0100", "0199"]
~~~

Common bugs: ^^match^^ returns ^^null^^ on a miss, so ^^text.match(re).length^^ can crash (use ^^?? []^^ or ^^?.^^); and a group that did not take part in the match (an optional one) is ^^undefined^^, not ^^""^^.

### Rewriting with replace

~~~js
const re = /(?<y>\d{4})-(?<m>\d{2})-(?<d>\d{2})/;
"2027-08-15".replace(re, "$<d>/$<m>/$<y>");   // "15/08/2027"
"a-b-c".replace(/-/g, "+");           // "a+b+c"  (without g only the first - changes)
"a-b-c".replaceAll("-", "+");         // same, no regex needed
~~~

In the replacement string, ^^$1^^ ^^$2^^ insert numbered groups, ^^$<name>^^ inserts a named one, ^^$&^^ the whole match, and ^^$$^^ a literal dollar sign. For anything cleverer, pass a **function**; it receives the match and its groups and returns the replacement:

~~~js
const double = (n) => String(Number(n) * 2);
"5 and 12".replace(/\d+/g, double);   // "10 and 24"
~~~

^^replaceAll^^ with a regex insists on the ^^g^^ flag and throws a ^^TypeError^^ without it.

### The g flag, again

A ^^g^^ regex is fine for ^^replace^^, ^^match^^ and ^^matchAll^^: they reset or copy the state themselves. It is only ^^test^^ and ^^exec^^ in a loop that carry ^^lastIndex^^ around. Keep that in mind when a regex lives at module level.

### Greedy and lazy quantifiers

Quantifiers are **greedy**: they take as much as they can and then give back. ^^/<.+>/^^ on ^^"<b>hi</b>"^^ matches the whole string. Add ^^?^^ to make it **lazy**: ^^/<.+?>/^^ stops at the first ^^>^^.

### Rules as data (and a security habit)

A neat design: keep per-country rules in an object, each with its own pattern and formatter, and look up the rule by country code. But **a user-supplied key is not safe to look up directly**:

~~~js
const RULES = { US: { /* ... */ } };
RULES["US"];            // the rule
RULES["__proto__"];     // Object.prototype !! it is "found"
RULES["constructor"];   // the Object function, also "found"
Object.hasOwn(RULES, "constructor");   // false: only OWN keys count
~~~

Always check ^^Object.hasOwn(obj, key)^^ before using a key that came from outside. (You can also build the table as a ^^Map^^, or with ^^Object.create(null)^^.)

### Common mistakes

- **Using ^^match^^ with ^^g^^ and expecting groups.** Use ^^matchAll^^.
- **Forgetting that optional groups can be ^^undefined^^.**
- **Counting groups by number** in a long pattern. Name them.
- **Parsing nested structures** (HTML, JSON, code) with a regex. Use a real parser.
- **Forgetting that ^^replace^^ with a string pattern changes only the first match.**`,
      mission: t`Shoppers type phone numbers every way imaginable, postcodes in whatever case they like, and card expiry dates with or without spaces. The engine has to recognise each, pull out the parts, and rewrite them into one canonical format. It also has to notice when someone pastes a full card number into the free-text delivery note and black it out before it is ever stored.

When you Run, the phone, postcode and expiry boxes show their normalized form as you type, and the note box redacts card numbers.`,
      tasks: [
        "formatPhone(raw): 10 digits (a leading 1 is allowed) become (555) 123-4567, else null; use named groups and replace",
        "normalizePostcode(country, raw): US, GB and CA rules kept as data; unknown countries (and keys like __proto__) give null",
        "parseExpiry(text): '08/27' or '8 / 2027' become { month: 8, year: 2027 }, else null",
        "redactCards(note) swaps card-like digit runs for [card ending 4242], and countCardNumbers(note) counts them",
      ],
      starterAdd: t`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 6: parse and rewrite text with groups.

// 1. Phone numbers (North American). Drop everything that is not a digit, and drop a
//    leading country code 1 if there are 11 digits. If exactly 10 digits remain, rewrite
//    them as "(555) 123-4567" using PHONE_RE's named groups; otherwise return null.
const PHONE_RE = /TODO/;
function formatPhone(raw) {
  // TODO
}

// 2. Postcodes. One entry per country: a pattern with NAMED groups, and a format function
//    that receives match.groups. Patterns are case-insensitive for GB and CA.
//      US: 12345 or 12345-6789 (the dash or a space or nothing may separate the plus-4)  -> "12345" / "12345-6789"
//      GB: like sw1a1aa or SW1A 1AA     -> "SW1A 1AA"   (outward code, space, inward code)
//          outward: 1-2 letters, a digit, then one optional letter or digit. inward: digit + 2 letters
//      CA: like k1a0b1 or K1A 0B1       -> "K1A 0B1"    (letter digit letter, space, digit letter digit)
const POSTCODE_RULES = {
  US: { pattern: /TODO/, format: (groups) => "TODO" },
  GB: { pattern: /TODO/i, format: (groups) => "TODO" },
  CA: { pattern: /TODO/i, format: (groups) => "TODO" },
};
function normalizePostcode(country, raw) {
  // TODO: return null for an unknown country (use Object.hasOwn!) or a postcode that does not match.
  // Run the text through cleanText() first.
}

// 3. Card expiry: a month 1-12 (one or two digits), a slash or dash (spaces allowed around it),
//    then a 2- or 4-digit year. "08/27", "8 / 2027", "12-30" -> { month: 8, year: 2027 } ...
//    Two-digit years mean 2000 + year. Anything else gives null.
const EXPIRY_RE = /TODO/;
function parseExpiry(text) {
  // TODO
}

// 4. Card-like numbers hiding in free text: 13-19 digits that may be separated by single
//    spaces or dashes, standing on their own (use \b). This regex needs the g flag.
const CARD_RUN_RE = /TODO/g;
//    Replace each one with "[card ending 4242]" (its last four digits) using a replace callback.
function redactCards(text) {
  // TODO
}
//    How many card-like numbers does the text contain? (matchAll)
function countCardNumbers(text) {
  // TODO
}
`,
      solutionAdd: t`const PHONE_RE = /^(?<area>\d{3})(?<exchange>\d{3})(?<line>\d{4})$/;

function formatPhone(raw) {
  let digits = digitsOnly(raw);
  if (digits.length === 11 && digits.startsWith("1")) digits = digits.slice(1);
  if (!PHONE_RE.test(digits)) return null;
  return digits.replace(PHONE_RE, "($<area>) $<exchange>-$<line>");
}

const POSTCODE_RULES = {
  US: {
    pattern: /^(?<zip>\d{5})(?:[-\s]?(?<plus4>\d{4}))?$/,
    format: ({ zip, plus4 }) => (plus4 ? ^^$\{zip}-$\{plus4}^^ : zip),
  },
  GB: {
    pattern: /^(?<outward>[A-Z]{1,2}\d[A-Z\d]?)\s*(?<inward>\d[A-Z]{2})$/i,
    format: ({ outward, inward }) => ^^$\{outward} $\{inward}^^.toUpperCase(),
  },
  CA: {
    pattern: /^(?<fsa>[A-Z]\d[A-Z])\s*(?<ldu>\d[A-Z]\d)$/i,
    format: ({ fsa, ldu }) => ^^$\{fsa} $\{ldu}^^.toUpperCase(),
  },
};

function normalizePostcode(country, raw) {
  if (!Object.hasOwn(POSTCODE_RULES, country)) return null;
  const { pattern, format } = POSTCODE_RULES[country];
  const match = pattern.exec(cleanText(raw));
  return match ? format(match.groups) : null;
}

const EXPIRY_RE = /^(?<month>0?[1-9]|1[0-2])\s*[/-]\s*(?<year>\d{4}|\d{2})$/;

function parseExpiry(text) {
  const match = EXPIRY_RE.exec(cleanText(text));
  if (!match) return null;
  const month = Number(match.groups.month);
  const year = Number(match.groups.year);
  return { month, year: year < 100 ? 2000 + year : year };
}

const CARD_RUN_RE = /\b(?:\d[ -]?){12,18}\d\b/g;

function redactCards(text) {
  return String(text ?? "").replace(CARD_RUN_RE, (run) => ^^[card ending $\{digitsOnly(run).slice(-4)}]^^);
}

function countCardNumbers(text) {
  return [...String(text ?? "").matchAll(CARD_RUN_RE)].length;
}`,
      explanation:
        "formatPhone cleans first (digitsOnly), trims a leading country code, tests the digits against a regex with named groups, and rewrites them with $<name> placeholders in replace(), so the formatting lives in one readable template. POSTCODE_RULES is rules-as-data: each country is an object with a pattern and a format function that receives match.groups; Object.hasOwn guards the lookup so 'constructor' or '__proto__' cannot be mistaken for a country. parseExpiry uses named groups and converts them to numbers (a two-digit year becomes 2000 + year). The card-run regex has the g flag, which is exactly what replace and matchAll want; neither depends on stale lastIndex state, but test() would. The replace callback receives the whole match, from which the last four digits are taken.",
      hints: [
        {
          id: "h1",
          title: "Phone",
          content:
            "PHONE_RE = /^(?<area>\\d{3})(?<exchange>\\d{3})(?<line>\\d{4})$/ . After cleaning with digitsOnly (and slicing off a leading 1 when there are 11 digits), return null if the regex fails, else digits.replace(PHONE_RE, '($<area>) $<exchange>-$<line>').",
        },
        {
          id: "h2",
          title: "Postcodes and expiry",
          content:
            "Each rule's format receives match.groups, so destructure: format: ({ outward, inward }) => ... . In normalizePostcode: if (!Object.hasOwn(POSTCODE_RULES, country)) return null; then pattern.exec(cleanText(raw)) and format(match.groups). Expiry: /^(?<month>0?[1-9]|1[0-2])\\s*[/-]\\s*(?<year>\\d{4}|\\d{2})$/ then Number() both groups.",
        },
        {
          id: "h3",
          title: "Redacting",
          content:
            "CARD_RUN_RE = /\\b(?:\\d[ -]?){12,18}\\d\\b/g : up to 18 digits each optionally followed by one space or dash, then a final digit, between word boundaries. redactCards: String(text ?? '').replace(CARD_RUN_RE, (run) => ...). countCardNumbers: [...String(text ?? '').matchAll(CARD_RUN_RE)].length .",
        },
      ],
      tests: [
        {
          id: "t1",
          description: "formatPhone rewrites 10 digits into (555) 123-4567",
          assertionCode: t`assertEqual(formatPhone("5551234567"), "(555) 123-4567", "plain digits");
assertEqual(formatPhone("555-123-4567"), "(555) 123-4567", "dashes");
assertEqual(formatPhone("(555) 123 4567"), "(555) 123-4567", "brackets and spaces");
assertEqual(formatPhone("+1 555 123 4567"), "(555) 123-4567", "leading +1 country code");
assertEqual(formatPhone("1-555-123-4567"), "(555) 123-4567", "leading 1");`,
        },
        {
          id: "t2",
          description: "formatPhone returns null for anything that is not a 10-digit number",
          assertionCode: t`for (const bad of ["", "12345", "555-123-456", "555 123 45678", "call me", "+44 20 7946 0958", "25551234567"]) {
  assert(formatPhone(bad) === null, JSON.stringify(bad) + " should give null");
}
assert(formatPhone(null) === null && formatPhone(undefined) === null, "null and undefined give null");
assert(formatPhone("5551234567") === formatPhone("5551234567"), "Same input, same answer on every call");`,
        },
        {
          id: "t3",
          description: "normalizePostcode formats US codes",
          assertionCode: t`assertEqual(normalizePostcode("US", "90210"), "90210", "5-digit ZIP");
assertEqual(normalizePostcode("US", "90210-1234"), "90210-1234", "ZIP+4 with a dash");
assertEqual(normalizePostcode("US", "902101234"), "90210-1234", "ZIP+4 with no separator");
assertEqual(normalizePostcode("US", " 90210 1234 "), "90210-1234", "ZIP+4 with a space, and surrounding spaces");
assert(normalizePostcode("US", "9021") === null && normalizePostcode("US", "9021A") === null && normalizePostcode("US", "902101") === null, "Wrong digit counts give null");`,
        },
        {
          id: "t4",
          description: "normalizePostcode formats GB and CA codes in upper case",
          assertionCode: t`assertEqual(normalizePostcode("GB", "sw1a1aa"), "SW1A 1AA", "GB without a space, lower case");
assertEqual(normalizePostcode("GB", "M1   1ae"), "M1 1AE", "GB with extra spaces");
assertEqual(normalizePostcode("GB", "EC1A 1BB"), "EC1A 1BB", "GB already tidy");
assertEqual(normalizePostcode("CA", "k1a0b1"), "K1A 0B1", "CA lower case, no space");
assertEqual(normalizePostcode("CA", "K1A  0B1"), "K1A 0B1", "CA with a double space");
assert(normalizePostcode("GB", "12345") === null && normalizePostcode("CA", "12345") === null, "US-style codes are not valid GB or CA codes");`,
        },
        {
          id: "t5",
          description: "normalizePostcode is safe against unknown countries and hostile keys",
          assertionCode: t`for (const country of ["FR", "", "us", undefined, null, "constructor", "__proto__", "toString", "hasOwnProperty"]) {
  assert(normalizePostcode(country, "12345") === null, "Country " + JSON.stringify(country) + " is not supported: expected null (and no crash). Use Object.hasOwn.");
}
assert(normalizePostcode("US", null) === null && normalizePostcode("US", undefined) === null, "A missing postcode gives null");`,
        },
        {
          id: "t6",
          description: "parseExpiry reads months and 2- or 4-digit years",
          assertionCode: t`assertEqual(parseExpiry("08/27"), { month: 8, year: 2027 }, "08/27");
assertEqual(parseExpiry("8 / 2027"), { month: 8, year: 2027 }, "8 / 2027");
assertEqual(parseExpiry("12-30"), { month: 12, year: 2030 }, "12-30");
assertEqual(parseExpiry(" 1/31 "), { month: 1, year: 2031 }, "1/31 with spaces around");`,
        },
        {
          id: "t7",
          description: "parseExpiry rejects impossible dates",
          assertionCode: t`for (const bad of ["", "13/27", "00/27", "0/27", "12/7", "12/270", "12/", "/27", "1227", "ab/cd", "12/27/28"]) {
  assert(parseExpiry(bad) === null, JSON.stringify(bad) + " should give null");
}
assert(parseExpiry(null) === null && parseExpiry(undefined) === null, "null and undefined give null");`,
        },
        {
          id: "t8",
          description: "redactCards replaces card-like numbers and leaves other text alone",
          assertionCode: t`assertEqual(redactCards("Card 4242 4242 4242 4242 please"), "Card [card ending 4242] please", "spaced card number");
assertEqual(redactCards("4111-1111-1111-1111"), "[card ending 1111]", "dashed card number");
assertEqual(redactCards("Call 555-123-4567 after 6pm, order 12345"), "Call 555-123-4567 after 6pm, order 12345", "phone and short numbers must stay");
assertEqual(redactCards("a 4242424242424242 b 5555555555554444 c"), "a [card ending 4242] b [card ending 4444] c", "two cards in one note");
assertEqual(redactCards(null), "", "null becomes an empty string");
const note = "pay with 4242 4242 4242 4242";
assert(redactCards(note) === redactCards(note), "Calling twice must give the same answer (watch out for lastIndex)");`,
        },
        {
          id: "t9",
          description: "countCardNumbers counts every card-like number",
          assertionCode: t`assert(countCardNumbers("nothing here") === 0, "No digits, no cards");
assert(countCardNumbers("4242 4242 4242 4242") === 1, "one card");
assert(countCardNumbers("a 4242424242424242 b 5555-5555-5555-4444") === 2, "two cards");
assert(countCardNumbers("call 5551234567") === 0, "A 10-digit phone number is not a card");
assert(countCardNumbers(undefined) === 0, "undefined has none");
assert(countCardNumbers("4242 4242 4242 4242") === countCardNumbers("4242 4242 4242 4242"), "Same answer twice");`,
        },
      ],
      checks: [
        {
          prompt: t`^^"cat".match(/(?<first>c)(a)(t)/).groups.first^^ is...`,
          question: { type: "text", answer: ["c", '"c"'], placeholder: "the value" },
          explanation: "The named group 'first' captured the letter c. Named groups appear under match.groups; numbered access (m[1]) still works too.",
        },
        {
          prompt: t`Which call needs the ^^g^^ flag or it throws a TypeError?`,
          question: { type: "choice", options: ["text.match(re)", "text.matchAll(re)", "re.test(text)", "re.exec(text)"], answer: 1 },
          explanation: "matchAll (and replaceAll with a regex) insist on g, because they are defined as 'find every match'. match, test and exec work with or without it.",
        },
        {
          prompt: t`A rules object is ^^{ US: {...} }^^. Why is ^^rules[country]^^ risky when ^^country^^ comes from the user?`,
          question: {
            type: "choice",
            options: [
              "Property lookups are slow",
              "Inherited keys like 'constructor' or '__proto__' look like real entries",
              "Keys must be numbers",
              "It throws if the key is missing",
            ],
            answer: 1,
          },
          explanation: "Plain objects inherit properties from Object.prototype, so rules['constructor'] finds something. Guard with Object.hasOwn(rules, country), or use a Map.",
        },
      ],
      unlocks: ["ff-format"],
    },

    // ───────────────────────── 7 ─────────────────────────
    {
      id: "form-forge-7-regex-advanced",
      title: "Lookaheads, passwords and safe patterns",
      minutes: 35,
      xp: 160,
      concepts: ["lookahead / lookbehind", "Unicode \\p{}", "backreferences", "escaping user input", "building RegExp", "ReDoS"],
      learn: t`### Lookahead: check without consuming

A **lookahead** asks "does this pattern follow here?" and then *moves nowhere*. It is a zero-width check.

- ^^(?=...)^^ positive lookahead: must be followed by ...
- ^^(?!...)^^ negative lookahead: must NOT be followed by ...
- ^^(?<=...)^^ and ^^(?<!...)^^: the same idea looking backwards (lookbehind).

~~~js
/\d+(?= dollars)/.exec("20 dollars")[0];    // "20"   (the word is checked but not matched)
/foo(?!bar)/.test("foobar");                // false
/(?<!\w)cat/.test("concat");                // false: a letter comes before "cat"
~~~

### The password-rules trick

"A password needs a lowercase letter, an uppercase letter, a digit *and* a symbol." One pattern cannot easily say "all of these in any order", but several lookaheads, all anchored at the start, can: each one scans the whole text independently, from position 0.

~~~js
const hasLower = /^(?=.*[a-z])/;
const hasDigit = /^(?=.*\d)/;
const both = /^(?=.*[a-z])(?=.*\d).+$/;   // all the lookaheads must hold
~~~

A caution: ^^.^^ does not match line breaks. To mean "any character at all" write ^^[\s\S]^^ (or use the ^^s^^ flag).

**Be honest about password policy.** Composition rules are a weak proxy. Current guidance (for example from NIST) favours *length*, allowing long passphrases and spaces, refusing known-breached and common passwords, and *not* forcing arbitrary symbols. Our strength meter combines both views for teaching, but a real service would also check a breached-password list. And remember: never trim or silently alter a password.

### Unicode: \p{...} and the u flag

Rules written as ^^[a-z]^^ miss ä, ñ and Я. With the ^^u^^ flag you can use **property escapes**:

- ^^\p{L}^^ any letter, ^^\p{Ll}^^ lowercase letter, ^^\p{Lu}^^ uppercase letter
- ^^\p{N}^^ or ^^\p{Nd}^^ digits (any script), ^^\p{P}^^ punctuation, ^^\p{Emoji}^^ and so on

~~~js
/\p{Lu}/u.test("Ärger");     // true
/[^\p{L}\p{N}\s]/u.test("hello world");   // false: no symbols
~~~

With ^^u^^, ^^.^^ and ranges also work on whole code points, so an emoji counts as one character, not two.

### Backreferences

^^\1^^ means "the same text that group 1 matched". ^^/(.)\1{2,}/u^^ finds any character repeated three times in a row ("aaa", "111"), a handy "lazy password" detector.

### Escaping user input

When the search term comes from a person, building a regex from it is dangerous: ^^new RegExp(userText)^^ treats their text as *pattern syntax*. Typing ^^a.c^^ matches "abc", and typing ^^(^^ makes ^^new RegExp^^ throw. The cure is to **escape** every special character first:

~~~js
const SPECIAL = /[.*+?^$\{}()|[\]\\]/g;

function escapeRegExp(text) {
  // "\\$&" = a backslash, then the matched character
  return text.replace(SPECIAL, "\\$&");
}
~~~

Then use the escaped text as a literal chunk. And for building patterns with backslashes in them, ^^String.raw^^ lets you skip the doubling:

~~~js
const word = escapeRegExp(userWord);
const re = new RegExp(String.raw^^(?<!\w)$\{word}(?!\w)^^, "iu");
~~~

(If you only need "does this text contain that text?", ^^text.includes(userText)^^ needs no regex at all.)

### When regexes bite back: catastrophic backtracking

A regex that nests quantifiers over overlapping things, like ^^/^(a+)+$/^^, can take **exponential time** on a nearly-matching input (about thirty letter a's followed by one exclamation mark can freeze a tab for minutes). This is called ReDoS, regular expression denial of service, and it is a real attack: one request with the right string pins a server. Protect yourself:

- avoid nested or overlapping quantifiers, especially ^^(x+)+^^, ^^(x*)*^^ and ^^(a|a)*^^;
- **cap the length of the input before running any regex on it** (an email cannot be 10,000 characters long);
- keep patterns simple and test them with hostile input, which is what the Fuzz button will do.

### Common mistakes

- **Building a pattern from raw user text** without escaping.
- **Using ^^[a-z]^^ for "letters"** in an international product.
- **Putting a lookahead in the middle** of the pattern when you meant it at the start.
- **Forgetting the ^^u^^ flag**, then wondering why ^^\p{L}^^ is a syntax error.
- **Trusting a regex from the internet** without checking it for nested quantifiers.`,
      mission: t`The sign-up form needs a password meter that reacts on every keystroke, a checklist of what is still missing, and a block-list of reserved usernames (admin, root, c++...) that cannot be bypassed by clever punctuation.

Build the password rules from lookaheads, score them, and make the block-list safe against special characters. When you Run, the password box grows a strength meter with a live checklist, and the username box refuses reserved words.`,
      tasks: [
        "PASSWORD_RULES: one anchored lookahead pattern per rule (length, lower, upper, digit, symbol), Unicode-aware",
        "passwordRules(password): the rules as [{ id, label, ok }], with no state kept between calls",
        "passwordScore(password): 0 to 4, with penalties for repeats and common passwords",
        "escapeRegExp(text) and containsBanned(text, words): a safe whole-word, case-insensitive block-list",
      ],
      starterAdd: t`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 7: lookaheads, scoring, and escaping.

// Words that can never be usernames. Note c++ contains characters that mean something in a regex!
const RESERVED = ["admin", "root", "support", "staff", "c++"];

// A tiny stand-in for a breached-password list (real services check a big one).
const COMMON_PASSWORDS = new Set(["password", "password1", "password123", "123456", "12345678", "qwerty", "letmein", "iloveyou", "welcome1", "admin123"]);

// 1. One lookahead pattern per rule, each starting with ^ so it checks the WHOLE text.
//    Use the u flag so \p{...} works, [\s\S] for "any character", and no g flag.
//      length: 10 or more characters (counted as code points)
//      lower:  some lowercase letter (\p{Ll})      upper: some uppercase letter (\p{Lu})
//      digit:  some digit (\p{Nd})
//      symbol: something that is not a letter, a number or whitespace: [^\p{L}\p{N}\s]
const PASSWORD_RULES = [
  { id: "length", label: "At least 10 characters", pattern: /TODO/u },
  { id: "lower", label: "A lowercase letter", pattern: /TODO/u },
  { id: "upper", label: "An uppercase letter", pattern: /TODO/u },
  { id: "digit", label: "A number", pattern: /TODO/u },
  { id: "symbol", label: "A symbol or punctuation mark", pattern: /TODO/u },
];

// 2. [{ id, label, ok }] for every rule, in order. Coerce the input with String(password ?? "").
function passwordRules(password) {
  // TODO
}

// 3. A score from 0 (very weak) to 4 (strong):
//      - empty text scores 0
//      - start from (number of rules passed) - 1
//      - three or more of the same character in a row (a backreference!): minus 1
//      - if the "length" rule fails, the score can be at most 1
//      - 16 or more characters (code points): plus 1
//      - a password in COMMON_PASSWORDS (compare lower-cased): always 0
//      - finally keep the score within 0 to 4
function passwordScore(password) {
  // TODO
}

// 4a. Put a backslash in front of every character that has a meaning in a regex: . * + ? ^ $ { } ( ) | [ ] \
function escapeRegExp(text) {
  // TODO
}

// 4b. true if text contains any of the words as a WHOLE word, ignoring case.
//     "Whole word" here: not directly touching another letter or digit (\p{L} / \p{N}), so
//     "my-admin" is banned but "administrator" is not. Escape every word first!
//     Build the RegExp with String.raw, flags "iu". No words (or only blanks) -> false.
function containsBanned(text, words) {
  // TODO
}
`,
      solutionAdd: t`const RESERVED = ["admin", "root", "support", "staff", "c++"];

const COMMON_PASSWORDS = new Set(["password", "password1", "password123", "123456", "12345678", "qwerty", "letmein", "iloveyou", "welcome1", "admin123"]);

const PASSWORD_RULES = [
  { id: "length", label: "At least 10 characters", pattern: /^(?=[\s\S]{10,}$)/u },
  { id: "lower", label: "A lowercase letter", pattern: /^(?=[\s\S]*\p{Ll})/u },
  { id: "upper", label: "An uppercase letter", pattern: /^(?=[\s\S]*\p{Lu})/u },
  { id: "digit", label: "A number", pattern: /^(?=[\s\S]*\p{Nd})/u },
  { id: "symbol", label: "A symbol or punctuation mark", pattern: /^(?=[\s\S]*[^\p{L}\p{N}\s])/u },
];

function passwordRules(password) {
  const text = String(password ?? "");
  return PASSWORD_RULES.map(({ id, label, pattern }) => ({ id, label, ok: pattern.test(text) }));
}

function passwordScore(password) {
  const text = String(password ?? "");
  if (text === "") return 0;
  if (COMMON_PASSWORDS.has(text.toLowerCase())) return 0;
  const rules = passwordRules(text);
  let score = rules.filter((rule) => rule.ok).length - 1;
  if (/(.)\1{2,}/u.test(text)) score -= 1;
  if (!rules.find((rule) => rule.id === "length").ok) score = Math.min(score, 1);
  if ([...text].length >= 16) score += 1;
  return Math.min(4, Math.max(0, score));
}

function escapeRegExp(text) {
  return String(text).replace(/[.*+?^$\{}()|[\]\\]/g, "\\$&");
}

function containsBanned(text, words) {
  const alternatives = (words ?? []).map((word) => escapeRegExp(String(word).trim())).filter(Boolean);
  if (alternatives.length === 0) return false;
  const pattern = new RegExp(String.raw^^(?<![\p{L}\p{N}])(?:$\{alternatives.join("|")})(?![\p{L}\p{N}])^^, "iu");
  return pattern.test(String(text ?? ""));
}`,
      explanation:
        "Each password rule is a lookahead anchored at ^: it scans the entire text from the start, asserts that the property exists somewhere, and consumes nothing, so the rules are independent and the order does not matter. Property escapes (\\p{Ll}, \\p{Lu}, \\p{Nd}) with the u flag make the rules fair to non-English passwords, and none of the patterns has the g flag, so test() is stateless. passwordScore starts from the number of rules passed, applies a backreference-based penalty for repeated characters, caps short passwords, rewards long passphrases and zeroes out common passwords. escapeRegExp prefixes every syntax character with a backslash using $& (the matched character). containsBanned escapes each word before gluing them into one alternation, wraps the alternation in lookbehind and lookahead so only whole words match, and builds the RegExp with String.raw so the backslashes need no doubling.",
      hints: [
        {
          id: "h1",
          title: "Rule patterns",
          content:
            "length: /^(?=[\\s\\S]{10,}$)/u . The others have the same shape: /^(?=[\\s\\S]*\\p{Ll})/u says 'from the start, looking ahead, there is any amount of anything and then a lowercase letter'. Use \\p{Lu} for upper, \\p{Nd} for digits and [^\\p{L}\\p{N}\\s] for the symbol.",
        },
        {
          id: "h2",
          title: "Score",
          content:
            "Work down the list in order. Early-return 0 for empty and for common passwords. Then let score = passedCount - 1; subtract 1 if /(.)\\1{2,}/u.test(text); cap with Math.min(score, 1) if the length rule is not ok; add 1 if [...text].length >= 16; and clamp with Math.min(4, Math.max(0, score)).",
        },
        {
          id: "h3",
          title: "Escaping and the block-list",
          content:
            "escapeRegExp: String(text).replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&'). containsBanned: map the words through escapeRegExp, drop empty ones, join with '|', and wrap: String.raw followed by a template with (?<![\\p{L}\\p{N}])(?:${alternatives.join('|')})(?![\\p{L}\\p{N}]) , then new RegExp(thatString, 'iu').",
        },
      ],
      tests: [
        {
          id: "t1",
          description: "passwordRules reports each rule with id, label and ok",
          assertionCode: t`const rules = passwordRules("Tr0ub4dor&3");
assert(Array.isArray(rules) && rules.length === 5, "passwordRules should return 5 rules");
assertEqual(rules.map((r) => r.id), ["length", "lower", "upper", "digit", "symbol"], "rule ids in order");
assert(rules.every((r) => typeof r.label === "string" && r.label.length > 0), "every rule needs a label");
assert(rules.every((r) => r.ok === true), "Tr0ub4dor&3 satisfies every rule");`,
        },
        {
          id: "t2",
          description: "Each rule fails and passes on the right input",
          assertionCode: t`const ok = (pw) => Object.fromEntries(passwordRules(pw).map((r) => [r.id, r.ok]));
assertEqual(ok("abcdefghij"), { length: true, lower: true, upper: false, digit: false, symbol: false }, "only lowercase, 10 long");
assertEqual(ok("ABC"), { length: false, lower: false, upper: true, digit: false, symbol: false }, "only uppercase");
assertEqual(ok("12345"), { length: false, lower: false, upper: false, digit: true, symbol: false }, "only digits");
assertEqual(ok("!? "), { length: false, lower: false, upper: false, digit: false, symbol: true }, "punctuation counts as symbols, a space does not");
assertEqual(ok(""), { length: false, lower: false, upper: false, digit: false, symbol: false }, "empty");
assertEqual(ok(null), { length: false, lower: false, upper: false, digit: false, symbol: false }, "null must not crash");`,
        },
        {
          id: "t3",
          description: "Rules understand Unicode letters, emoji and line breaks",
          assertionCode: t`const ok = (pw) => Object.fromEntries(passwordRules(pw).map((r) => [r.id, r.ok]));
assert(ok("Ärger").lower && ok("Ärger").upper, "Ä is an uppercase letter and rger are lowercase: \\p{Lu} and \\p{Ll} handle accents");
assert(ok("пароль").lower === true && ok("ПАРОЛЬ").upper === true, "Cyrillic letters have case too");
assert(ok("🔥").symbol === true, "An emoji is a symbol");
assert(ok("😀".repeat(10)).length === true && ok("😀".repeat(9)).length === false, "Length counts code points, so 10 emoji is long enough");
assert(ok("abcde\nfghij").length === true && ok("ab\ncd\nA1!").length === false, "A newline is a character like any other (use [\\s\\S], not .)");
const again = passwordRules("Abcdefghi1!");
assert(passwordRules("Abcdefghi1!").every((r, i) => r.ok === again[i].ok), "Same input must give the same answer every time (no g flag)");`,
        },
        {
          id: "t4",
          description: "passwordScore ranks passwords from 0 to 4",
          assertionCode: t`assert(passwordScore("") === 0 && passwordScore(null) === 0, "empty is 0");
assert(passwordScore("abc") === 0, "abc is 0");
assert(passwordScore("Passw0rd!") === 1, "9 characters: four rules pass (3), but a short password is capped at 1");
assert(passwordScore("Tr0ub4dor&3") === 4, "11 characters with every rule is 4");
assert(passwordScore("abcdefghijkl") === 1, "Only the length and lowercase rules pass: 2 rules - 1 = 1");`,
        },
        {
          id: "t5",
          description: "passwordScore penalises repeats, rewards length, and bans common passwords",
          assertionCode: t`assertEqual(passwordScore("Password1"), 0, "a common password is always 0");
assertEqual(passwordScore("PASSWORD"), 0, "common after lower-casing");
assertEqual(passwordScore("Tr0ub4dooor&3"), 3, "three o's in a row cost one point: 5 rules passed (4) - 1");
assertEqual(passwordScore("correct horse battery staple"), 2, "a long lowercase passphrase: 2 rules passed (1), plus 1 for 16 or more characters");
assertEqual(passwordScore("Correct Horse Battery Staple 9!"), 4, "long with upper, lower, digit and symbol is 4 (and clamped to 4)");`,
        },
        {
          id: "t6",
          description: "escapeRegExp neutralises every special character",
          assertionCode: t`assertEqual(escapeRegExp("a.b*c"), "a\\.b\\*c", "escapeRegExp('a.b*c')");
assertEqual(escapeRegExp("plain"), "plain", "nothing to escape");
assertEqual(escapeRegExp(""), "", "empty");
for (const ch of ".*+?^$\{}()|[]\\") {
  const re = new RegExp("^" + escapeRegExp(ch) + "$");
  assert(re.test(ch), "The escaped regex for " + ch + " should match exactly " + ch);
  assert(!re.test("x"), "The escaped regex for " + ch + " should not match x");
}
assert(new RegExp(escapeRegExp("(1+1)=2")).test("so (1+1)=2 is true"), "Escaped text works as a literal");`,
        },
        {
          id: "t7",
          description: "containsBanned finds whole words, case-insensitively",
          assertionCode: t`assert(containsBanned("admin", RESERVED) === true, "admin is reserved");
assert(containsBanned("ADMIN", RESERVED) === true, "case does not matter");
assert(containsBanned("my-admin-page", RESERVED) === true, "punctuation around a word counts as a boundary");
assert(containsBanned("support_team", ["support"]) === true, "An underscore is not a letter or digit, so it counts as a boundary: support_team contains the word support");
assert(containsBanned("administrator", RESERVED) === false, "administrator is not the word admin");
assert(containsBanned("rooted", ["root"]) === false, "rooted contains root but is another word");
assert(containsBanned("ada", RESERVED) === false, "ada is fine");`,
        },
        {
          id: "t8",
          description: "containsBanned escapes the words, so special characters stay literal",
          assertionCode: t`assert(containsBanned("i love c++ a lot", ["c++"]) === true, "c++ must be matched literally");
assert(containsBanned("abc", ["a.c"]) === false, "The dot in a.c must not mean 'any character'");
assert(containsBanned("a.c", ["a.c"]) === true, "but a.c itself is a match");
assert(containsBanned("anything", ["("]) === false, "A lone ( must not make new RegExp throw");
assert(containsBanned("anything", []) === false && containsBanned("anything", ["", "  "]) === false, "No usable words means false");
assert(containsBanned(null, RESERVED) === false, "null text is fine");`,
        },
      ],
      checks: [
        {
          prompt: t`What does the lookahead in ^^/foo(?=bar)/^^ do to the match ^^"foobar".match(...)[0]^^ ?`,
          question: { type: "choice", options: ["It returns 'foobar'", "It returns 'foo': bar is checked but not consumed", "It returns 'bar'", "It returns null"], answer: 1 },
          explanation: "A lookahead asserts that what follows matches but does not include it in the result. The match is just 'foo'. That is why several lookaheads can inspect the same text independently.",
        },
        {
          prompt: t`You build ^^new RegExp(userInput)^^ for a search box. What is the main danger?`,
          question: {
            type: "choice",
            options: [
              "Regexes cannot take variables",
              "The user's text is treated as pattern syntax: it can match too much, throw a SyntaxError, or trigger catastrophic backtracking",
              "It is always slower than includes()",
              "It changes the user's text",
            ],
            answer: 1,
          },
          explanation: "Characters like . * ( [ have special meaning. Escape the text first (or avoid the regex and use includes()). It is both a correctness bug and a security issue.",
        },
        {
          prompt: t`Which defence helps most against catastrophic backtracking (ReDoS)?`,
          question: {
            type: "choice",
            options: ["Adding the g flag", "Limiting the input length and avoiding nested quantifiers like (a+)+", "Using test() instead of match()", "Lower-casing the input"],
            answer: 1,
          },
          explanation: "Exponential blow-up needs both an ambiguous pattern and a long input. Cap the length before the regex runs, and keep patterns free of overlapping nested repetition.",
        },
      ],
      unlocks: ["ff-password"],
    },
  ],
};
