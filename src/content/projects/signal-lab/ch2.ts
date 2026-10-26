import type { Chapter } from "@/engine/types";
import { md, py } from "./util.ts";

/**
 * Chapter 2: Pattern hunting. Regular expressions with the `re` module, from first patterns to
 * a compiled, commented, verbose master pattern and a live search. Builds on the chapter-1
 * functions (scrub, STAMP_LEN) and finishes with when NOT to reach for a regex.
 */

export const chapter2: Chapter = {
  id: "patterns",
  title: "Pattern hunting",
  blurb: "Describe the shape of the data once, and let the regex engine find it everywhere.",
  lessons: [
    // ───────────────────────── 5 ─────────────────────────
    {
      id: "signal-lab-5-patterns",
      title: "First patterns",
      minutes: 18,
      xp: 110,
      concepts: ["re.search / match / fullmatch / findall", "character classes", "quantifiers", "anchors", "raw strings"],
      learn: md`### Describe a shape, not a spelling

String methods look for exact text. A **regular expression** (regex) describes a *shape*: "two letters, a dash, three digits". Python's engine for them lives in the \`re\` module.

~~~python
import re
~~~

Always write patterns as **raw strings** (\`r"..."\`). Regex is full of backslashes, and without the \`r\` Python would try to read \`\d\` as one of its own escape sequences.

### Four functions you will use constantly

~~~python
re.search(r"\d+", "snr=18dB")       # finds the first match ANYWHERE
re.match(r"\d+", "snr=18dB")        # None: match() only tries at the very START
re.fullmatch(r"\d+", "18")          # the WHOLE string must fit the pattern
re.findall(r"\d+", "az=47 el=32")   # ['47', '32']  every match, as a list of strings
~~~

\`search\`, \`match\` and \`fullmatch\` return either a **match object** or \`None\`. A match object is truthy and \`None\` is falsy, so \`if re.search(...):\` works. The match object remembers what matched: \`m.group()\` is the text, \`m.span()\` is its position.

~~~python
m = re.search(r"\d+", "snr=18dB")
m.group()    # '18'
m.span()     # (4, 6)
~~~

### The building blocks

- **Literals** match themselves: \`snr\` matches the three letters s, n, r.
- \`.\` matches any one character except a newline.
- **Classes**: \`\d\` a digit, \`\w\` a letter, digit or underscore, \`\s\` whitespace. Capital letters mean the opposite: \`\D\` \`\W\` \`\S\`.
- **Sets**: \`[abc]\` one of a, b or c; \`[A-Z]\` a range; \`[^"]\` anything except a double quote. Inside a set most special characters are plain: \`[.]\` is a literal dot, and a \`-\` at the end (\`[+-]\`) is a literal dash.
- **Quantifiers** say how many: \`?\` zero or one, \`*\` zero or more, \`+\` one or more, \`{3}\` exactly three, \`{2,4}\` two to four, \`{2,}\` two or more.
- **Anchors** pin a position: \`^\` start, \`$\` end, \`\b\` the edge of a word.
- A backslash makes a special character literal: \`\.\` is a real dot, \`\[\` a real bracket.

~~~python
re.fullmatch(r"[A-Za-z]{2}-\d{3}", "KX-204")   # a match
re.fullmatch(r"[A-Za-z]{2}-\d{3}", "KX-20")    # None: only two digits
re.findall(r"[+-]?\d+\.?\d*", "az=047.5 el=+32.0 snr=-3.4dB")
# ['047.5', '+32.0', '-3.4']     optional sign, digits, optional dot, optional digits
~~~

Read that last pattern left to right: \`[+-]?\` an optional sign, \`\d+\` one or more digits, \`\.?\` an optional literal dot, \`\d*\` any number of digits after it.

### search, match or fullmatch?

- \`search\`: "is it in there somewhere?"
- \`match\`: "does it **start** with this?" (same as \`search\` with a \`^\` in front)
- \`fullmatch\`: "is the **entire** string exactly this?" (same as \`^...$\`). Use it to validate.

### Common mistakes

- Forgetting the \`r\`: it often works by accident, then breaks on \`\b\` (a backspace character in a normal string!).
- Using \`match\` when you meant \`search\`, and wondering why a pattern that is clearly in the text returns \`None\`.
- An unescaped dot: \`1.5\` also matches \`1x5\`. Write \`1\.5\`.
- Returning the match object when you meant a True/False answer. Compare to \`None\`: \`return re.search(...) is not None\`.
- \`\d\` matches digits from other scripts too (for example Arabic-Indic digits). Add \`re.ASCII\` or use \`[0-9]\` when only 0 to 9 are acceptable.`,
      mission: md`Plain string methods got the first fields out, but the call-sign check in lesson 3 was clumsy and fragile. Time to describe shapes directly.

Build four small detectors: is this a valid call sign, which numbers does a line contain, does a line begin with a proper stamp, and does it end with a checksum tag. The **Pattern scanner** lights up: it highlights every number your \`find_numbers\` found and shows STAMP, CALL and CHK health lights from your detectors. Watch what it does to the number inside a call sign: that is a lesson in itself.`,
      tasks: [
        "valid_call(text): True only if the whole text is two letters, a dash and three digits (fullmatch)",
        "find_numbers(text): every number in the text as a list of strings, keeping an optional sign and decimals (findall)",
        "starts_with_stamp(raw): True if the line begins with a stamp like 2087-03-14T02:17:45Z (match)",
        "has_checksum(text): True if the text ends with # and two hex digits, ignoring trailing spaces (search with an anchor)",
      ],
      starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 5: first patterns. Use raw strings (r"...") for every pattern.
import re

def valid_call(text):
    # "KX-204" -> True.  "KX-20", "K1-204", " KX-204" -> False  (use fullmatch)
    ...

def find_numbers(text):
    # "az=047.5 el=+32.0 snr=-3.4dB" -> ["047.5", "+32.0", "-3.4"]  (use findall)
    ...

def starts_with_stamp(raw):
    # True if raw begins with a stamp like 2087-03-14T02:17:45Z  (use match)
    ...

def has_checksum(text):
    # True if text ends with # and two hex digits, trailing spaces allowed
    # '... "Ping" #8E' -> True,  '... "Ping" #8' -> False   (use search and $)
    ...`,
      solutionAdd: py`import re

def valid_call(text):
    return re.fullmatch(r"[A-Za-z]{2}-\d{3}", text) is not None

def find_numbers(text):
    return re.findall(r"[+-]?\d+\.?\d*", text)

def starts_with_stamp(raw):
    return re.match(r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z", raw) is not None

def has_checksum(text):
    return re.search(r"#[0-9A-Fa-f]{2}\s*$", text) is not None`,
      explanation:
        "fullmatch needs the whole string to fit, so it rejects extra characters on either side without any anchors. findall returns every non-overlapping match as plain strings: the optional sign, digits, optional dot and optional decimals cover all the readings. match only tries at position 0, so it is the right call for 'begins with'. The checksum test uses search with $ so the tag must sit at the end, with \\s* allowing trailing spaces. Notice find_numbers also catches the -204 inside a call sign: a pattern knows shape, not meaning, and the next lesson shows how anchoring and groups narrow it down.",
      hints: [
        { id: "h1", title: "Shapes", content: "A call sign is [A-Za-z]{2} then a literal dash then \\d{3}. Wrap them in re.fullmatch(pattern, text) and compare the result with None." },
        { id: "h2", title: "Numbers and stamps", content: "Numbers: [+-]?\\d+\\.?\\d* with re.findall. Stamp: \\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}Z with re.match, which only tries at the start." },
        { id: "h3", title: "The checksum tag", content: "#[0-9A-Fa-f]{2}\\s*$ with re.search: a hash, two hex characters, optional trailing whitespace, then the end of the string. Return the comparison `is not None` so you get True or False." },
      ],
      tests: [
        {
          id: "t1",
          description: "valid_call accepts exactly two letters, a dash and three digits",
          assertionCode: py`
for good in ["KX-204", "kx-204", "ab-000", "Tn-099"]:
    assert valid_call(good) is True, f"valid_call({good!r}) should be True"
for bad in ["KX-20", "KX-2045", " KX-204", "KX-204 ", "K1-204", "KX204", "KXX-204", "KX-20A", "KX-204\n", ""]:
    assert valid_call(bad) is False, f"valid_call({bad!r}) should be False. fullmatch needs the WHOLE text to fit the pattern"
`,
        },
        {
          id: "t2",
          description: "find_numbers returns every number with its sign and decimals",
          assertionCode: py`
got = find_numbers("az=047.5 el=+32.0 snr=-3.4dB")
assert got == ["047.5", "+32.0", "-3.4"], f"expected ['047.5', '+32.0', '-3.4'] but got {got!r}"
assert find_numbers("1420.405mhz") == ["1420.405"], f"find_numbers('1420.405mhz') should be ['1420.405'] but got {find_numbers('1420.405mhz')!r}"
assert find_numbers("x=7 y=12") == ["7", "12"], "whole numbers count too"
assert find_numbers("no digits at all") == [], "no numbers should give an empty list"
`,
        },
        {
          id: "t3",
          description: "starts_with_stamp only looks at the beginning of the line",
          assertionCode: py`
assert starts_with_stamp('2087-03-14T02:17:45Z  ~^~ kx-204') is True, "a line that begins with a proper stamp should be True"
assert starts_with_stamp('  2087-03-14T02:17:45Z kx-204') is False, "a stamp after leading spaces is not at the start"
assert starts_with_stamp('kx-204 2087-03-14T02:17:45Z') is False, "a stamp in the middle does not count (match anchors at the start; search would not)"
assert starts_with_stamp('2087-3-14T02:17:45Z') is False, "the month needs two digits"
assert starts_with_stamp('') is False
`,
        },
        {
          id: "t4",
          description: "has_checksum needs # and two hex digits at the very end",
          assertionCode: py`
assert has_checksum('kx-204 "Ping" #8E') is True, "'#8E' at the end should be True"
assert has_checksum('kx-204 "Ping" #8e   ') is True, "lower-case hex and trailing spaces are fine"
assert has_checksum('kx-204 "Ping" #8') is False, "one hex digit is not enough"
assert has_checksum('kx-204 "Ping" #8EA') is False, "three characters after the # is too many (the tag must be exactly two)"
assert has_checksum('kx-204 "#12 Ping"') is False, "a # in the middle of the line is not a checksum tag"
assert has_checksum('kx-204 "Ping" #GG') is False, "G is not a hex digit"
`,
        },
      ],
      unlocks: ["sl-scanner"],
      checks: [
        {
          prompt: "`re.match(r\"\\d+\", \"snr=18dB\")` returns `None`. Why?",
          question: {
            type: "choice",
            options: [
              "`match` only tries at the start of the string, and the text starts with `s`",
              "`\\d` does not match digits",
              "The string has no digits",
              "`match` needs the `re.I` flag",
            ],
            answer: 0,
          },
          explanation: "`match` is anchored at position 0. `re.search` would find the `18`. A good habit: reach for `search` unless you specifically mean \"starts with\".",
        },
        {
          prompt: "Which pattern, used with `fullmatch`, accepts `KX-204` but not `KX-2044`?",
          question: {
            type: "choice",
            options: ["`[A-Z]{2}-\\d{3}`", "`[A-Z]+-\\d+`", "`.*-\\d{3}`", "`[A-Z]{2}-\\d{3,}`"],
            answer: 0,
          },
          explanation: "`\\d{3}` means exactly three digits. `\\d+` and `\\d{3,}` accept any number of them, and `.*` accepts anything before the dash.",
        },
        {
          prompt: "What does `re.findall(r\"\\d+\", \"az=47 el=32\")` return? (type the list, for example `['a']`)",
          question: { type: "text", answer: ["['47', '32']", "[\"47\", \"32\"]", "['47','32']"], placeholder: "a Python list" },
          explanation: "`findall` returns every match as a string, in order: `['47', '32']`. The numbers are still text; convert with `int()` or `float()`.",
        },
      ],
    },

    // ───────────────────────── 6 ─────────────────────────
    {
      id: "signal-lab-6-groups",
      title: "Groups & captures",
      minutes: 20,
      xp: 120,
      concepts: ["capture groups", "named groups", "groupdict", "alternation", "non-capturing groups", "finditer"],
      learn: md`### Parentheses capture

Wrap part of a pattern in \`( )\` and the engine remembers what matched there.

~~~python
m = re.search(r"az=(\d+\.?\d*)\s+el=([+-]?\d+\.?\d*)", "az=047.5 el=+32.0")
m.group(0)    # 'az=047.5 el=+32.0'   group 0 is the whole match
m.group(1)    # '047.5'
m.group(2)    # '+32.0'
m.groups()    # ('047.5', '+32.0')
~~~

Groups are numbered by their **opening** parenthesis, left to right. That gets confusing quickly, which is why we name them.

### Named groups: \`(?P<name>...)\`

~~~python
m = re.search(r"az=(?P<az>[\d.]+)\s+el=(?P<el>[+-]?[\d.]+)", "az=047.5 el=+32.0")
m["az"]            # '047.5'      (or m.group("az"))
m.groupdict()      # {'az': '047.5', 'el': '+32.0'}
~~~

\`groupdict()\` hands you a ready-made dictionary, which is exactly the shape we want for a parsed record. A group that did not take part in the match gives \`None\`. Captured values are always **strings**; convert them yourself.

### Alternation and grouping

\`|\` means "or", and it has the lowest precedence of all: \`^beacon|pulse$\` means "starts with beacon" **or** "ends with pulse". Use a group to say what you mean:

~~~python
re.match(r"(beacon|pulse|telemetry)\b", "Pulse detected", re.IGNORECASE).group(1)   # 'Pulse'
~~~

If you only need grouping (for a quantifier or an alternation) and do not want to capture, use a **non-capturing group** \`(?:...)\`. It keeps numbering and \`findall\` results tidy:

~~~python
re.search(r"(?P<n>\d+(?:\.\d+)?)", "snr=18.2").group("n")    # '18.2'  the decimals are optional
~~~

### findall with groups, and finditer

\`findall\` changes what it returns when the pattern has groups: no groups gives the whole matches, one group gives that group's text, several give tuples. When you need positions or several groups at once, use \`finditer\`, which yields match objects:

~~~python
for m in re.finditer(r"\[(\w+)\]", "Handoff [ack] [relay]"):
    print(m.group(1), m.span())
# ack (8, 13)
# relay (14, 21)
~~~

### A first peek at flags

A third argument changes how the pattern behaves. \`re.IGNORECASE\` (or \`re.I\`) ignores letter case, so \`az=\` also matches \`AZ=\`. Lesson 8 covers all the flags.

### Common mistakes

- Calling \`.group()\` on \`None\` (\`AttributeError: 'NoneType' object has no attribute 'group'\`). Check the match first.
- \`m.group(3)\` when the pattern has only two groups (\`IndexError\`).
- Relying on group numbers in a long pattern. Name them.
- Forgetting that captured numbers are still text.`,
      mission: md`The scanner can tell that numbers exist; now pull out *which* number is which. One pattern with named groups can read the whole header of a message: call sign, frequency, azimuth, elevation and signal strength, in a single pass.

The **Field extractor** colours each field of the cleaned line with the group your pattern captured. You will also classify what kind of message it is and mark every \`[tag]\` by position.`,
      tasks: [
        "parse_fields(clean): one pattern with named groups call, freq, az, el, snr; return groupdict() (all strings) or None if the line does not fit",
        "message_kind(message): the first word if it is beacon, pulse, telemetry or handoff (lower-case), otherwise \"other\"",
        "tag_spans(message): the (start, end) span of every [word] tag, using finditer",
      ],
      starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 6: groups and captures.

def parse_fields(clean):
    # Read the header of a cleaned line such as:
    #   kx-204 @ 1420.405mhz az=047.5 el=+32.0 snr=18.2dB "Kepler relay online" #45
    # Return {"call": "kx-204", "freq": "1420.405", "az": "047.5", "el": "+32.0", "snr": "18.2"}
    # (exactly those five keys, all strings), or None if the line does not fit.
    # Hints: spaces around the @ vary; units are mhz and db in any case; az= and el= may be upper case.
    ...

def message_kind(message):
    # "Beacon 3 nominal" -> "beacon".  "Antenna sweep complete" -> "other"
    # Only the FIRST word counts, and it must be a whole word ("Pulsed" is "other")
    ...

def tag_spans(message):
    # "Handoff accepted [ack] [relay]" -> [(17, 22), (23, 30)]
    ...`,
      solutionAdd: py`def parse_fields(clean):
    m = re.search(
        r"(?P<call>[a-z]{2}-\d{3})\s*@\s*(?P<freq>\d+(?:\.\d+)?)\s*mhz"
        r"\s+az=(?P<az>[\d.]+)\s+el=(?P<el>[+-]?[\d.]+)\s+snr=(?P<snr>[+-]?[\d.]+)\s*db",
        clean,
        re.IGNORECASE,
    )
    return m.groupdict() if m else None

def message_kind(message):
    m = re.match(r"(beacon|pulse|telemetry|handoff)\b", message, re.IGNORECASE)
    return m.group(1).lower() if m else "other"

def tag_spans(message):
    spans = []
    for m in re.finditer(r"\[\w+\]", message):
        spans.append(m.span())
    return spans`,
      explanation:
        "The long pattern is two adjacent raw strings, which Python joins into one. Every field has a name, and \\s* absorbs the unpredictable spacing around @ and before the units. re.IGNORECASE makes the letters, the units and az=/EL= case-blind in one go. groupdict() returns the dictionary directly, and the conditional expression turns a failed match (None) into None instead of crashing. message_kind uses match (start of string) with an alternation inside a group and \\b so that 'Pulsed' does not count as 'pulse'. finditer gives match objects, and span() is the position of each tag.",
      hints: [
        { id: "h1", title: "Build it in pieces", content: "Start with just (?P<call>[a-z]{2}-\\d{3}) and test it, then add \\s*@\\s*(?P<freq>...). Add one field at a time. Pass re.IGNORECASE as the third argument to re.search." },
        { id: "h2", title: "Numbers", content: "freq: \\d+(?:\\.\\d+)?  then \\s*mhz. az: [\\d.]+  el and snr: [+-]?[\\d.]+  then \\s*db after snr. Return m.groupdict() if m else None." },
        { id: "h3", title: "Kind and spans", content: "message_kind: re.match(r\"(beacon|pulse|telemetry|handoff)\\b\", message, re.IGNORECASE), then m.group(1).lower(). tag_spans: loop over re.finditer(r\"\\[\\w+\\]\", message) and append m.span()." },
      ],
      tests: [
        {
          id: "t1",
          description: "parse_fields reads the header into named groups",
          assertionCode: py`
got = parse_fields('kx-204 @ 1420.405mhz az=047.5 el=+32.0 snr=18.2dB "Kepler relay online" #45')
want = {"call": "kx-204", "freq": "1420.405", "az": "047.5", "el": "+32.0", "snr": "18.2"}
assert got == want, f"expected {want!r} but got {got!r}. Use exactly the five group names call, freq, az, el, snr"
`,
        },
        {
          id: "t2",
          description: "parse_fields copes with spacing, case and signs",
          assertionCode: py`
got = parse_fields('VR-077@1421.200MHZ AZ=134.8 EL=57.0 SNR=+27.1 DB "Beacon 3 nominal" #a9')
want = {"call": "VR-077", "freq": "1421.200", "az": "134.8", "el": "57.0", "snr": "+27.1"}
assert got == want, f"expected {want!r} but got {got!r}. Allow \\s* around @ and before the units, and use re.IGNORECASE"
got = parse_fields('nb-310 @  1419.850 mhz az=210.8 el=+19.3 snr=-6.0 db "Signal weak [retry]" #34')
assert got and got["snr"] == "-6.0" and got["freq"] == "1419.850", f"negative snr or a space before the unit broke the pattern: {got!r}"
`,
        },
        {
          id: "t3",
          description: "parse_fields returns None when the line does not fit",
          assertionCode: py`
assert parse_fields("### CARRIER LOST ###") is None, "a line with no fields should give None"
assert parse_fields("") is None, "an empty string should give None, not crash"
assert parse_fields("kx-204 @ 1420.405mhz az=047.5") is None, "a truncated line (no el or snr) should give None"
`,
        },
        {
          id: "t4",
          description: "message_kind recognises the leading word only",
          assertionCode: py`
cases = {"Beacon 3 nominal": "beacon", "PULSE detected near Vega": "pulse", "Telemetry burst [ack]": "telemetry", "Handoff accepted [ack]": "handoff", "Antenna sweep complete": "other", "A faint beacon": "other", "Pulsed laser test": "other", "": "other"}
for text, want in cases.items():
    got = message_kind(text)
    assert got == want, f"message_kind({text!r}) should be {want!r} but returned {got!r}"
`,
        },
        {
          id: "t5",
          description: "tag_spans reports where each [tag] sits",
          assertionCode: py`
got = [tuple(s) for s in tag_spans("Handoff accepted [ack] [relay]")]
assert got == [(17, 22), (23, 30)], f"expected [(17, 22), (23, 30)] but got {got!r}"
assert tag_spans("No tags here") == [], "no tags should give an empty list"
got = [tuple(s) for s in tag_spans("[ok]")]
assert got == [(0, 4)], f"a tag at the very start: expected [(0, 4)] but got {got!r}"
`,
        },
      ],
      unlocks: ["sl-fields"],
      checks: [
        {
          prompt: "For `m = re.search(r\"(\\d+)-(\\d+)\", \"ab 12-345\")`, what is `m.group(2)`?",
          question: { type: "text", answer: ["345", "'345'", "\"345\""], placeholder: "the text of the group" },
          explanation: "Group 1 is `12` and group 2 is `345`. Group 0 would be the whole match, `12-345`. Captured values are strings.",
        },
        {
          prompt: "Why use `(?:...)` instead of `(...)` for the optional decimals in `(?P<n>\\d+(?:\\.\\d+)?)`?",
          question: {
            type: "choice",
            options: [
              "It groups for the `?` without creating an extra numbered group to track or return",
              "It makes the match faster by 10x",
              "It makes the pattern case-insensitive",
              "It is required for optional parts",
            ],
            answer: 0,
          },
          explanation: "A non-capturing group has the grouping power (so `?` applies to the whole `.digits` part) but stays out of `groups()` and `findall` results.",
        },
        {
          prompt: "What does `^beacon|pulse$` match?",
          question: {
            type: "choice",
            options: [
              "Text that starts with beacon, OR text that ends with pulse",
              "Text that is exactly beacon or exactly pulse",
              "Only text that starts with beacon and ends with pulse",
              "Nothing: it is invalid",
            ],
            answer: 0,
          },
          explanation: "`|` splits the whole pattern at the top level. To mean \"exactly one of the two words\" write `^(?:beacon|pulse)$`.",
        },
      ],
    },

    // ───────────────────────── 7 ─────────────────────────
    {
      id: "signal-lab-7-sub",
      title: "Search & replace",
      minutes: 16,
      xp: 120,
      concepts: ["re.sub", "backreferences", "function replacement", "re.split", "subn"],
      learn: md`### re.sub(pattern, replacement, text)

\`sub\` finds every match and swaps it for the replacement.

~~~python
re.sub(r"\d", "#", "KX-204")                      # 'KX-###'
re.sub(r"\s+", " ", "a   b \t c")                 # 'a b c'
re.sub(r"(\w+)@(\w+)", r"\2 at \1", "kx@relay")   # 'relay at kx'
~~~

In the replacement text, \`\1\`, \`\2\` ... paste what a group captured (a **backreference**), and \`\g<name>\` does the same for a named group. Write \`\g<1>0\` when a literal digit follows, so Python does not read \`\10\` as group ten. A \`count=\` argument limits how many replacements happen, and \`re.subn\` returns \`(new_text, number_of_replacements)\`:

~~~python
re.subn(r"\d", "#", "a1b22")      # ('a#b##', 3)
~~~

### A function as the replacement

When the new text has to be *computed*, pass a function. It receives the match object and returns the replacement string.

~~~python
def double(m):
    return str(int(m.group()) * 2)

re.sub(r"\d+", double, "5 apples and 12 pears")    # '10 apples and 24 pears'
~~~

A \`lambda\` is a tiny one-line function, ideal here: \`re.sub(r"\d+", lambda m: str(int(m[0]) * 2), text)\`. The function must return a **string**, not a number.

### re.split

\`str.split\` cuts on a fixed piece of text. \`re.split\` cuts wherever a pattern matches.

~~~python
re.split(r"\s*[;|]\s*", "a ; b|c")     # ['a', 'b', 'c']
~~~

If the pattern contains a capturing group, the separators are **kept** in the result: \`re.split(r"(\d)", "a1b2c")\` gives \`['a', '1', 'b', '2', 'c']\`. Trailing separators leave an empty string at the end, so strip them first if you do not want one.

### Common mistakes

- Passing flags as the fourth positional argument of \`re.sub\`. That slot is \`count\`! Write \`flags=re.IGNORECASE\`. (\`re.sub("a", "X", "aaa", re.I)\` replaces only 2 letters.)
- A replacement function that returns a number instead of a string.
- Forgetting the \`r\` on a replacement such as \`r"\1-***"\`.
- Using \`sub\` when a plain \`str.replace\` would do. If the text is fixed, \`replace\` is simpler and faster.`,
      mission: md`The observatory wants to publish a **public-release copy** of the feed: call signs are classified (only the two-letter prefix may be shown) and the units must be written properly as ' MHz' and ' dB'. Messages from relays also pack several readings into one line, separated by semicolons or bars.

The **Release copy** panel shows your cleaned line next to the version your \`redact_callsigns\` and \`tidy_units\` produce.`,
      tasks: [
        "redact_callsigns(text): replace the three digits of every call sign with *** (KX-204 becomes KX-***), keeping the letters as typed; use a backreference",
        "tidy_units(text): write every number followed by mhz or db (any case, any spacing) as number, one space, then MHz or dB; use a function replacement and the UNITS dict",
        "split_fields(text): split on semicolons or bars with optional spaces around them; ignore delimiters at the edges",
      ],
      starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 7: search and replace.
UNITS = {"mhz": "MHz", "db": "dB"}

def redact_callsigns(text):
    # "kx-204 @ 1420.405mhz" -> "kx-*** @ 1420.405mhz"
    # Only whole call signs (LL-DDD): "VR-0771" is not a call sign and stays as it is.
    ...

def tidy_units(text):
    # "1420.405mhz az=047.5 snr=18.2DB" -> "1420.405 MHz az=047.5 snr=18.2 dB"
    # Use a function as the replacement and look the unit up in UNITS.
    ...

def split_fields(text):
    # "kx-204 ok ; vr-077 ok|nb-310 ok" -> ["kx-204 ok", "vr-077 ok", "nb-310 ok"]
    ...`,
      solutionAdd: py`UNITS = {"mhz": "MHz", "db": "dB"}

def redact_callsigns(text):
    return re.sub(r"\b([A-Za-z]{2})-\d{3}\b", r"\1-***", text)

def tidy_units(text):
    return re.sub(
        r"(?P<num>\d+(?:\.\d+)?)\s*(?P<unit>mhz|db)\b",
        lambda m: m["num"] + " " + UNITS[m["unit"].lower()],
        text,
        flags=re.IGNORECASE,
    )

def split_fields(text):
    return re.split(r"\s*[;|]\s*", text.strip(" ;|"))`,
      explanation:
        "In redact_callsigns the group keeps the two letters exactly as written and \\1 pastes them back before the three stars; \\b on both sides stops it from nibbling at longer words and numbers. tidy_units needs a function because the replacement depends on the match: it normalises the unit through the UNITS dict after lower-casing it, and the flags are passed by keyword so they cannot be mistaken for count. split_fields uses re.split because the separators vary (semicolon or bar, with any spacing); stripping the delimiter characters first avoids an empty string at the end.",
      hints: [
        { id: "h1", title: "Backreference", content: "re.sub(r\"\\b([A-Za-z]{2})-\\d{3}\\b\", r\"\\1-***\", text). The group captures the letters and \\1 pastes them back." },
        { id: "h2", title: "Function replacement", content: "The replacement can be a lambda: lambda m: m[\"num\"] + \" \" + UNITS[m[\"unit\"].lower()]. Use groups named num and unit, and pass flags=re.IGNORECASE as a keyword." },
        { id: "h3", title: "Splitting", content: "re.split(r\"\\s*[;|]\\s*\", ...) splits on a semicolon or bar plus any spaces around it. Call text.strip(\" ;|\") first so delimiters at the edges leave no empty pieces." },
      ],
      tests: [
        {
          id: "t1",
          description: "redact_callsigns hides the digits and keeps the letters",
          assertionCode: py`
got = redact_callsigns("kx-204 @ 1420.405mhz")
assert got == "kx-*** @ 1420.405mhz", f"expected 'kx-*** @ 1420.405mhz' but got {got!r}"
got = redact_callsigns("KX-204 handed off to VR-077")
assert got == "KX-*** handed off to VR-***", f"every call sign must be redacted, keeping each one's own letters: got {got!r}"
`,
        },
        {
          id: "t2",
          description: "redact_callsigns leaves look-alikes alone",
          assertionCode: py`
for text in ["VR-0771 is not a call sign", "plain text", "snr=-204dB", ""]:
    got = redact_callsigns(text)
    assert got == text, f"{text!r} contains no call sign and should be unchanged, but became {got!r}. Add \\b at both ends of the pattern"
`,
        },
        {
          id: "t3",
          description: "tidy_units normalises mhz and db in any case",
          assertionCode: py`
got = tidy_units("1420.405mhz az=047.5 el=+32.0 snr=18.2dB")
assert got == "1420.405 MHz az=047.5 el=+32.0 snr=18.2 dB", f"expected '1420.405 MHz az=047.5 el=+32.0 snr=18.2 dB' but got {got!r}"
got = tidy_units("1421.2 MHZ and 27.1 DB")
assert got == "1421.2 MHz and 27.1 dB", f"spacing and case should both be normalised: got {got!r}"
`,
        },
        {
          id: "t4",
          description: "tidy_units only touches real units",
          assertionCode: py`
for text in ["no units here", "az=047.5", "a dbx b", "3dbx"]:
    got = tidy_units(text)
    assert got == text, f"{text!r} has no unit and should be unchanged, but became {got!r}. End the unit with \\b"
`,
        },
        {
          id: "t5",
          description: "split_fields splits on ; or | and ignores edge delimiters",
          assertionCode: py`
got = split_fields("kx-204 ok ; vr-077 ok|nb-310 ok")
assert got == ["kx-204 ok", "vr-077 ok", "nb-310 ok"], f"got {got!r}"
got = split_fields(" kx-204 ok ; ")
assert got == ["kx-204 ok"], f"delimiters at the edges should not create empty pieces: got {got!r}"
assert split_fields("single") == ["single"], "text without a delimiter is a single piece"
`,
        },
      ],
      unlocks: ["sl-release"],
      checks: [
        {
          prompt: "What does `re.sub(r\"(\\w+)@(\\w+)\", r\"\\2 at \\1\", \"kx@relay\")` return?",
          question: { type: "text", answer: ["relay at kx"], placeholder: "the new text" },
          explanation: "Group 1 captured `kx`, group 2 captured `relay`, and the replacement swaps them: `relay at kx`.",
        },
        {
          prompt: "Why does `re.sub(\"a\", \"X\", \"aaa\", re.I)` give `XXa` instead of `XXX`?",
          question: {
            type: "choice",
            options: [
              "The fourth positional argument of `re.sub` is `count`, and `re.I` is the number 2",
              "`re.I` makes only the first two matches count",
              "`sub` stops after two letters by default",
              "Case-insensitive mode is not available in `sub`",
            ],
            answer: 0,
          },
          explanation: "`re.IGNORECASE` is a flag whose value is 2, so it was silently used as `count=2`. Always pass `flags=re.IGNORECASE` by keyword to `sub`, `subn` and `split`.",
        },
        {
          prompt: "A replacement function passed to `re.sub` must return what type?",
          question: { type: "choice", options: ["A string", "An int", "A match object", "A list"], answer: 0 },
          explanation: "`sub` pastes the function's return value into the text, so it has to be a `str`. Convert numbers with `str()` or an f-string.",
        },
      ],
    },

    // ───────────────────────── 8 ─────────────────────────
    {
      id: "signal-lab-8-compile",
      title: "The master pattern",
      minutes: 22,
      xp: 140,
      concepts: ["re.compile", "flags", "re.VERBOSE", "greedy vs lazy", "re.escape", "re.MULTILINE"],
      learn: md`### Compile once, name it

\`re.compile\` turns a pattern string into a reusable **pattern object** with the same methods (\`search\`, \`match\`, \`fullmatch\`, \`findall\`, \`finditer\`, \`sub\`, \`split\`). Put it in a module-level constant: you build it once, give it a good name, and the flags travel with it.

~~~python
SNR_RE = re.compile(r"snr=(?P<snr>[+-]?[\d.]+)", re.IGNORECASE)
SNR_RE.search("SNR=-3.4dB")["snr"]     # '-3.4'
~~~

(Python also caches the patterns you pass to \`re.search\` and friends, so compiling is mostly about **clarity and reuse**, not speed.)

### Flags

- \`re.IGNORECASE\` (\`re.I\`): letters match in either case.
- \`re.MULTILINE\` (\`re.M\`): \`^\` and \`$\` match at the start and end of **every line**, not just of the whole string.
- \`re.DOTALL\` (\`re.S\`): \`.\` also matches a newline.
- \`re.VERBOSE\` (\`re.X\`): whitespace inside the pattern is ignored and \`#\` starts a comment, so big patterns can be laid out and explained.

Combine flags with \`|\`:

~~~python
re.findall(r"^\w+", "alpha one\nbeta two")                  # ['alpha']
re.findall(r"^\w+", "alpha one\nbeta two", re.MULTILINE)    # ['alpha', 'beta']
~~~

### Verbose patterns

A long one-line pattern is unreadable and unreviewable. With \`re.VERBOSE\` you can break it up and comment it. Two traps: a literal \`#\` must be written \`\#\` and a literal space \`\ \` (or put them in a set such as \`[ ]\`), because unescaped ones are treated as layout.

~~~python
SNR_RE = re.compile(r"""
    snr=              # the label
    (?P<snr>
        [+-]?         # optional sign
        [\d.]+        # digits and dots
    )
    \s*db             # unit, optional space
""", re.IGNORECASE | re.VERBOSE)
~~~

### Greedy versus lazy

Quantifiers are **greedy**: they grab as much as they can, then give characters back only if the rest of the pattern needs them. Add a \`?\` to make a quantifier **lazy** (\`*?\`, \`+?\`, \`{2,5}?\`): it takes as little as possible.

~~~python
text = "[ack] Kepler [relay]"
re.findall(r"\[(.*)\]", text)        # ['ack] Kepler [relay']   greedy: first [ to the LAST ]
re.findall(r"\[(.*?)\]", text)       # ['ack', 'relay']          lazy: stop at the first ]
re.findall(r"\[([^\]]*)\]", text)    # ['ack', 'relay']          a negated set says it even better
~~~

When you can say "anything except the closing character", prefer the negated set: it is clearer and avoids a lot of backtracking.

### Matching user text literally: re.escape

If a pattern is built from text you did not write, special characters change its meaning. \`re.escape\` backslashes everything special so the text is matched literally.

~~~python
re.escape("1420.405")        # '1420\\.405'
re.search("1420.405", "1420x405")              # matches! the dot is a wildcard
re.search(re.escape("1420.405"), "1420x405")   # None
~~~

### Common mistakes

- A greedy \`.*\` that swallows far more than you wanted.
- Forgetting that \`#\` and spaces are ignored in VERBOSE mode.
- \`^\` and \`$\` only touching the ends of the whole string until you add \`re.MULTILINE\`.
- Building a pattern from user input without \`re.escape\`.`,
      mission: md`Four partial patterns later, it is time for the real thing: **one compiled, commented master pattern** that reads an entire message in a single pass. Then use it to build \`parse_line\`: raw line in, record of fields out.

The **Parsed records** table fills up with whatever \`parse_line\` produces. Lines that do not fit are shown as gaps, ready for the alert board in the next chapter.`,
      tasks: [
        "LINE_RE: a compiled VERBOSE, IGNORECASE pattern with named groups call, freq, az, el, snr, message (lazy) and checksum, anchored to the whole cleaned line",
        "parse_line(raw): scrub the raw line, match LINE_RE, return its groupdict() plus a \"stamp\" key taken from the raw line, or None",
        "tags(message): every [tag] name as a list of strings, using a lazy group",
        "mentions(text, phrase): True if phrase appears in text, any case, treated as literal text (re.escape)",
        "stamps_in(block): every stamp that starts a line of a multi-line block of log text",
      ],
      starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 8: the master pattern.

LINE_RE = ...
# re.compile a VERBOSE + IGNORECASE pattern for a whole cleaned line:
#   kx-204 @ 1420.405mhz az=047.5 el=+32.0 snr=18.2dB "Kepler relay online" #45
# named groups: call, freq, az, el, snr, message (lazy, between the quotes), checksum
# Remember: in VERBOSE mode a literal # must be written \#

def parse_line(raw):
    # scrub(raw), match LINE_RE, return the groupdict() plus "stamp": the first 20 chars of raw
    # return None if the line does not fit
    ...

def tags(message):
    # "[ack] Kepler relay online [relay]" -> ["ack", "relay"]
    ...

def mentions(text, phrase):
    # True if phrase is in text, ignoring case, treating phrase as plain text
    # mentions("freq 1420.405", "1420.405") -> True,  mentions("freq 1420x405", "1420.405") -> False
    ...

def stamps_in(block):
    # all stamps (like 2087-03-14T02:17:45Z) at the START of a line in a multi-line block of text
    ...`,
      solutionAdd: py`LINE_RE = re.compile(
    r"""
    ^\s*
    (?P<call>[a-z]{2}-\d{3})      \s*@\s*
    (?P<freq>[\d.]+)              \s*mhz   \s+
    az=(?P<az>[\d.]+)             \s+
    el=(?P<el>[+-]?[\d.]+)        \s+
    snr=(?P<snr>[+-]?[\d.]+)      \s*db    \s+
    "(?P<message>.*?)"            \s+
    \#(?P<checksum>[0-9a-f]{2})   # the checksum tag
    \s*$
    """,
    re.IGNORECASE | re.VERBOSE,
)

def parse_line(raw):
    m = LINE_RE.match(scrub(raw))
    if m is None:
        return None
    fields = m.groupdict()
    fields["stamp"] = raw[:STAMP_LEN]
    return fields

def tags(message):
    return re.findall(r"\[(.*?)\]", message)

def mentions(text, phrase):
    return re.search(re.escape(phrase), text, re.IGNORECASE) is not None

def stamps_in(block):
    return re.findall(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z", block, re.MULTILINE)`,
      explanation:
        "LINE_RE reads like a form: one field per row, comments allowed, spacing free, and re.VERBOSE keeps the layout out of the match. The \\# is needed because an unescaped # would start a comment. The lazy .*? stops at the first closing quote that is followed by whitespace and the checksum tag. parse_line chains your earlier work: scrub first, then match, then add the stamp that scrub removed. tags uses a lazy group so each tag is separate. mentions escapes the phrase so a dot in 1420.405 is just a dot, and stamps_in needs re.MULTILINE so ^ matches at every line start.",
      hints: [
        { id: "h1", title: "Verbose layout", content: "Use a triple-quoted raw string and one field per row, for example: (?P<call>[a-z]{2}-\\d{3}) \\s*@\\s*  then the next field. Pass re.IGNORECASE | re.VERBOSE as the second argument to re.compile." },
        { id: "h2", title: "The rest of the rows", content: "freq: (?P<freq>[\\d.]+) \\s*mhz \\s+   az=(?P<az>[\\d.]+) \\s+   el=(?P<el>[+-]?[\\d.]+) \\s+   snr=(?P<snr>[+-]?[\\d.]+) \\s*db \\s+   \"(?P<message>.*?)\" \\s+   \\#(?P<checksum>[0-9a-f]{2})   then \\s*$ at the end." },
        { id: "h3", title: "The helpers", content: "parse_line: m = LINE_RE.match(scrub(raw)); if m is None return None; fields = m.groupdict(); fields[\"stamp\"] = raw[:STAMP_LEN]. tags: re.findall(r\"\\[(.*?)\\]\", message). mentions: re.search(re.escape(phrase), text, re.IGNORECASE). stamps_in: findall with ^ and re.MULTILINE." },
      ],
      tests: [
        {
          id: "t1",
          description: "LINE_RE is a compiled VERBOSE, IGNORECASE pattern with the right group names",
          assertionCode: py`
import re as _re
assert isinstance(LINE_RE, _re.Pattern), "LINE_RE should be the result of re.compile(...)"
assert LINE_RE.flags & _re.IGNORECASE, "compile LINE_RE with re.IGNORECASE so units and labels can be in any case"
assert LINE_RE.flags & _re.VERBOSE, "compile LINE_RE with re.VERBOSE (and lay the pattern out with comments)"
want = {"call", "freq", "az", "el", "snr", "message", "checksum"}
assert set(LINE_RE.groupindex) == want, f"LINE_RE should have exactly these named groups {sorted(want)} but has {sorted(LINE_RE.groupindex)}"
`,
        },
        {
          id: "t2",
          description: "parse_line turns a raw line into a dict of fields (as strings)",
          assertionCode: py`
line = '2087-03-14T02:17:45Z  ~^~  kx-204 @ 1420.405mhz  az=047.5 el=+32.0  snr=18.2dB  "Kepler relay online"  #45 ~^~  '
want = {"stamp": "2087-03-14T02:17:45Z", "call": "kx-204", "freq": "1420.405", "az": "047.5", "el": "+32.0", "snr": "18.2", "message": "Kepler relay online", "checksum": "45"}
got = parse_line(line)
assert got == want, f"expected {want!r} but got {got!r}"
`,
        },
        {
          id: "t3",
          description: "parse_line copes with tabs, upper case and Windows line endings",
          assertionCode: py`
line = '2087-03-14T02:18:10Z\t^^  VR-077@1421.200MHZ\taz=134.8   EL=+57.0  SNR=27.1 dB "Beacon 3 nominal"\t#a9 ^^\r\n'
got = parse_line(line)
assert got is not None, "this line is messy but valid; parse_line returned None"
assert got["call"] == "VR-077" and got["freq"] == "1421.200" and got["snr"] == "27.1", f"fields were wrong: {got!r}"
assert got["message"] == "Beacon 3 nominal" and got["checksum"] == "a9", f"message and checksum should keep their original text: {got!r}"
line = '2087-03-14T02:20:00Z ~~ or-512 @ 1422.592mhz az=291.8 el=+38.7 snr=13.9dB "Handoff accepted [ack] [relay]" #91 ~~'
got = parse_line(line)
assert got and got["message"] == "Handoff accepted [ack] [relay]", f"the message should be everything between the quotes: {got!r}"
`,
        },
        {
          id: "t4",
          description: "parse_line returns None for lines that do not fit",
          assertionCode: py`
for line in ['2087-03-14T02:19:02Z  ~^~ ### CARRIER LOST ### ~^~ ', '2087-03-14T02:19:02Z', '', '2087-03-14T02:19:02Z ~~ vr-077 @ 1421.2 ~~', '2087-03-14T02:19:02Z kx-204 @ 1420.405mhz az=047.5 el=+32.0 snr=18.2dB "no checksum"']:
    assert parse_line(line) is None, f"parse_line should return None for {line!r}"
`,
        },
        {
          id: "t5",
          description: "tags lists every tag, and lazy matching keeps them separate",
          assertionCode: py`
assert tags("[ack] Kepler relay online [relay]") == ["ack", "relay"], f"got {tags('[ack] Kepler relay online [relay]')!r}; a greedy .* would return one giant piece"
assert tags("[a] [b] [c]") == ["a", "b", "c"]
assert tags("no tags") == []
`,
        },
        {
          id: "t6",
          description: "mentions is case-insensitive and treats the phrase literally",
          assertionCode: py`
assert mentions("Solar flare warning [urgent]", "[URGENT]") is True, "square brackets in the phrase must be matched literally (re.escape)"
assert mentions("freq 1420.405", "1420.405") is True
assert mentions("freq 1420x405", "1420.405") is False, "the dot in the phrase is a plain dot, not a wildcard"
assert mentions("abc", "(") is False, "a phrase with regex symbols must not crash"
`,
        },
        {
          id: "t7",
          description: "stamps_in finds stamps at the start of every line",
          assertionCode: py`
block = "2087-03-14T02:17:45Z kx-204\n  junk 2087-03-14T09:00:00Z\n2087-03-14T02:17:48Z vr-077"
got = stamps_in(block)
assert got == ["2087-03-14T02:17:45Z", "2087-03-14T02:17:48Z"], f"expected the two stamps that START a line but got {got!r}. Remember re.MULTILINE"
`,
        },
      ],
      unlocks: ["sl-records"],
      checks: [
        {
          prompt: "`re.findall(r\"\\[(.*)\\]\", \"[a] and [b]\")` returns one item. What is it?",
          question: {
            type: "choice",
            options: ["`'a] and [b'`", "`'a'`", "`'b'`", "`'[a] and [b]'`"],
            answer: 0,
          },
          explanation: "Greedy `.*` runs to the end of the text and backs off to the **last** `]`, so one match swallows everything between the first `[` and the last `]`. `.*?` or `[^\\]]*` gives `['a', 'b']`.",
        },
        {
          prompt: "In a `re.VERBOSE` pattern, how do you match a literal `#`?",
          question: { type: "choice", options: ["Write `\\#` (or put it in a set like `[#]`)", "Write `#` as normal", "You cannot", "Write `##`"], answer: 0 },
          explanation: "In verbose mode an unescaped `#` starts a comment that runs to the end of the line. Escape it, or put it in a character set. The same goes for a literal space.",
        },
        {
          prompt: "Why wrap user-typed text in `re.escape()` before using it in a pattern?",
          question: {
            type: "choice",
            options: [
              "So characters like `.` `(` and `[` are matched literally instead of acting as regex syntax",
              "It makes the match faster",
              "It makes the match case-insensitive",
              "It converts the text to a raw string",
            ],
            answer: 0,
          },
          explanation: "Without it, typing `1.5` also matches `1x5`, and typing `(` raises `re.error`. `re.escape` turns the text into a pattern that matches exactly itself.",
        },
      ],
    },

    // ───────────────────────── 9 ─────────────────────────
    {
      id: "signal-lab-9-search",
      title: "Live search (and when not to regex)",
      minutes: 20,
      xp: 140,
      concepts: ["match objects", "re.error", "plain search vs regex", "ReDoS", "choosing the right tool"],
      learn: md`### The search box

An operator types into a box and the console must highlight matching lines. They might type \`beacon\` (plain text), or \`[a-z]{2}-\d{3}\` (a pattern), or half a pattern such as \`(\`, which is not valid. Your function has to handle all three without crashing.

### Invalid patterns raise \`re.error\`

~~~python
re.compile("(")      # re.error: missing ), unterminated subpattern at position 0
~~~

Catch it with \`try\` / \`except\`. The next project goes deep on exceptions; for now just remember the shape:

~~~python
try:
    pattern = re.compile(query)
except re.error:
    return None          # tell the caller the pattern is no good
~~~

### Match objects tell you where

\`m.start()\`, \`m.end()\` and \`m.span()\` give positions, so the console can highlight exactly the matching part of each line. Note that a pattern such as \`x*\` can match the empty string: a perfectly valid match with \`start == end\`.

### When NOT to use a regex

Regex is a power tool, and power tools are not for every job.

- **Plain text.** If the question is "does it contain this word?" then \`in\`, \`startswith\`, \`endswith\`, \`find\` and \`split\` are faster, clearer and cannot be fooled by special characters.
- **Real formats.** Do not parse JSON, CSV, HTML or URLs with regex. Use \`json\`, \`csv\`, an HTML parser, \`urllib.parse\`. Regex cannot handle nesting (balanced brackets) and these formats have corner cases you will miss. Dates: find them with a pattern if you must, but *validate* them with \`datetime.strptime\`.
- **Meaning, not shape.** \`\d{1,3}\` happily accepts \`999\` as a bearing. A regex checks the shape of the text; range checks belong in code (next chapter).
- **Readability.** A pattern nobody can read is a bug waiting to happen. Use \`re.VERBOSE\`, name your groups, or split the job into two simple steps.

### Speed and safety

Some patterns are slow on purpose-built input. Nested quantifiers such as \`(a+)+$\` try an exponential number of ways to match a string like \`"aaaaaaaaaaaaaaaaaaaaaaaaaaaaab"\`: 22 letters already take a noticeable fraction of a second and every extra letter doubles it. This is called **catastrophic backtracking**, and attackers use it (ReDoS) against servers that accept patterns or run risky patterns on user text. Python's \`re\` has no built-in timeout, so the defences are yours: keep patterns simple, avoid nested quantifiers around overlapping choices, anchor patterns, and **cap the size of what users may send**.

### Common mistakes

- Compiling user input without catching \`re.error\`.
- Searching with a regex when \`query in line\` was enough.
- Forgetting that an empty pattern matches everything.
- Trusting a pattern to validate numbers or dates.`,
      mission: md`Operators need to search the live feed. Build the search the console will call: given the cleaned lines and a query, report which lines match and where. Plain words take the fast, safe path; anything containing regex symbols is compiled as a pattern; bad or oversized patterns are refused politely instead of crashing the dashboard.

The **Search console** lights up: type in the box and your \`search\` function filters the stream live and highlights each match.`,
      tasks: [
        "is_plain(query): True when the query contains none of the regex symbols . ^ $ * + ? { } [ ] \\ | ( )",
        "search(lines, query): return a list of {\"index\", \"start\", \"end\"} for every matching line; a blank query gives []",
        "Plain queries use find() on lower-cased text; other queries are compiled with re.IGNORECASE",
        "Return None (not a crash) for an invalid pattern, or one longer than MAX_PATTERN characters",
      ],
      starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 9: live search, and knowing when not to use a regex.
MAX_PATTERN = 80

def is_plain(query):
    # True if query has none of the regex symbols  . ^ $ * + ? { } [ ] \ | ( )
    ...

def search(lines, query):
    # For every line that matches, add {"index": i, "start": s, "end": e} (positions of the match).
    #  - a blank query -> []
    #  - a query longer than MAX_PATTERN, or an invalid pattern -> None
    #  - plain queries: use lower-case find(), no regex at all
    #  - other queries: compile with re.IGNORECASE (catch re.error)
    ...`,
      solutionAdd: py`MAX_PATTERN = 80

def is_plain(query):
    return re.search(r"[.^$*+?{}\[\]\\|()]", query) is None

def search(lines, query):
    query = query.strip()
    if not query:
        return []
    if len(query) > MAX_PATTERN:
        return None
    pattern = None
    if not is_plain(query):
        try:
            pattern = re.compile(query, re.IGNORECASE)
        except re.error:
            return None
    hits = []
    for index, line in enumerate(lines):
        if pattern is None:
            start = line.lower().find(query.lower())
            span = (start, start + len(query)) if start != -1 else None
        else:
            m = pattern.search(line)
            span = m.span() if m else None
        if span:
            hits.append({"index": index, "start": span[0], "end": span[1]})
    return hits`,
      explanation:
        "is_plain is itself a tiny regex: a set listing the special characters (with the ones that need escaping inside a set written with backslashes). search normalises the query, refuses empty or oversized input, and chooses a tool: plain text goes through str.find on lower-cased copies, which is fast and cannot be confused by symbols; anything else is compiled once, outside the loop, with the re.error handled. Both branches produce the same (start, end) span, so the rest of the function does not care which tool found it. Returning None means 'this query is unusable' and [] means 'valid but nothing matched', a distinction the console shows differently.",
      hints: [
        { id: "h1", title: "is_plain", content: "Search for one of the special characters with a set: re.search(r\"[.^$*+?{}\\[\\]\\\\|()]\", query) is None. Inside a set, [ ] and \\ still need a backslash." },
        { id: "h2", title: "Order of checks", content: "strip the query; return [] if empty; return None if len(query) > MAX_PATTERN; for non-plain queries compile inside try/except re.error and return None on failure." },
        { id: "h3", title: "One loop", content: "Loop with enumerate(lines). Plain: start = line.lower().find(query.lower()), span is (start, start + len(query)) unless start is -1. Regex: m = pattern.search(line), span = m.span(). Append {\"index\": ..., \"start\": ..., \"end\": ...}." },
      ],
      tests: [
        {
          id: "t1",
          description: "is_plain spots regex symbols",
          assertionCode: py`
for q in ["beacon", "1420 405", "kx-204", ""]:
    assert is_plain(q) is True, f"is_plain({q!r}) should be True: it has no regex symbols"
for q in ["be.con", "[urgent]", "a|b", "^kx", "ping$", "(", "x*", "a+b", "a?", "a{2}", "back\\slash"]:
    assert is_plain(q) is False, f"is_plain({q!r}) should be False: it contains a regex symbol"
`,
        },
        {
          id: "t2",
          description: "plain queries find text in any case and report positions",
          assertionCode: py`
lines = ["kx-204 Kepler relay online", "vr-077 Beacon 3 nominal", "BEACON 7 nominal", "tn-099 Ping"]
got = search(lines, "beacon")
want = [{"index": 1, "start": 7, "end": 13}, {"index": 2, "start": 0, "end": 6}]
assert got == want, f"search(lines, 'beacon') should be {want!r} but returned {got!r}"
assert search(lines, "no such text") == [], "no match is an empty list, not None"
`,
        },
        {
          id: "t3",
          description: "regex queries work and are case-insensitive",
          assertionCode: py`
lines = ["kx-204 Kepler relay online", "vr-077 Beacon 3 nominal", "BEACON 7 nominal", "tn-099 Ping"]
got = search(lines, r"[a-z]{2}-\d{3}")
assert [h["index"] for h in got] == [0, 1, 3], f"call-sign pattern should hit lines 0, 1 and 3 but hit {[h['index'] for h in got]!r}"
assert all((h["start"], h["end"]) == (0, 6) for h in got), f"each call sign spans (0, 6): {got!r}"
got = search(lines, "ping|relay")
assert [(h["index"], h["start"], h["end"]) for h in got] == [(0, 14, 19), (3, 7, 11)], f"alternation spans were wrong: {got!r}"
got = search(lines, "BEA.ON")
assert [h["index"] for h in got] == [1, 2], f"'BEA.ON' should match both beacon lines whatever their case, got {got!r}"
`,
        },
        {
          id: "t4",
          description: "blank, invalid and oversized queries are handled without crashing",
          assertionCode: py`
lines = ["kx-204 Kepler relay online"]
assert search(lines, "") == [] and search(lines, "   ") == [], "a blank query matches nothing: return []"
assert search(lines, "(") is None, "'(' is not a valid pattern: return None instead of raising"
assert search(lines, "[a-") is None, "an unfinished set is invalid: return None"
assert search(lines, "a" * 81) is None, "queries over MAX_PATTERN characters are refused with None"
`,
        },
        {
          id: "t5",
          description: "search leaves the input list alone and works on an empty feed",
          assertionCode: py`
lines = ["b one", "a two"]
before = list(lines)
search(lines, "o")
assert lines == before, "search must not change the list it was given"
assert search([], "anything") == [], "no lines means no hits"
`,
        },
      ],
      unlocks: ["sl-search"],
      checks: [
        {
          prompt: "Which job is best done WITHOUT a regular expression?",
          question: {
            type: "choice",
            options: [
              "Checking whether a message contains the word `urgent`",
              "Pulling every call sign out of a log",
              "Splitting text wherever `;` or `|` appears",
              "Finding all stamps at the start of a line",
            ],
            answer: 0,
          },
          explanation: "A simple substring test (`\"urgent\" in text.lower()`) is faster, clearer and can't be confused by special characters. The other three describe shapes or variable separators, where a pattern earns its keep.",
        },
        {
          prompt: "Why can `\\d{1,3}` not be trusted to validate an azimuth bearing?",
          question: {
            type: "choice",
            options: [
              "It checks the shape (1 to 3 digits) but accepts 999, which is not a valid bearing",
              "It is too slow",
              "It does not match zero",
              "It only matches letters",
            ],
            answer: 0,
          },
          explanation: "Regex checks shape, not meaning. Convert to a number and test the range (0 to 360) in code.",
        },
        {
          prompt: "What is the difference between `search` returning `[]` and returning `None` in our function?",
          question: {
            type: "choice",
            options: [
              "`[]` means the query was fine but nothing matched; `None` means the query itself was unusable",
              "They mean the same thing",
              "`None` means everything matched",
              "`[]` means the pattern was invalid",
            ],
            answer: 0,
          },
          explanation: "Using different return values for different situations lets the caller (the dashboard) say \"no results\" versus \"invalid pattern\".",
        },
      ],
    },
  ],
};
