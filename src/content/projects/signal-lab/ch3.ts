import type { Chapter } from "@/engine/types";
import { md, py } from "./util.ts";

/**
 * Chapter 3: Make sense of it. Turn matched strings into typed records without crashing on bad
 * input (basic try/except only; the next project goes deep on exceptions), then reshape the
 * records with comprehensions.
 *
 * A record is {"ok": True, "stamp", "call", "freq", "az", "el", "snr", "message", "valid"} or
 * {"ok": False, "error", "raw"}. "good" records are ok AND have a valid checksum.
 */

export const chapter3: Chapter = {
  id: "records",
  title: "Make sense of it",
  blurb: "From matched text to trustworthy records, and then to the shapes the dashboard needs.",
  lessons: [
    // ───────────────────────── 10 ─────────────────────────
    {
      id: "signal-lab-10-parse",
      title: "Parse with care",
      minutes: 20,
      xp: 150,
      concepts: ["float() and ValueError", "try / except", "raise", "validation layers", "result records"],
      learn: md`### Strings are not data yet

The master pattern gives you text: \`"047.5"\`, not the number 47.5. Real programs need **typed records** with a stable shape.

~~~python
record = {"call": "KX-204", "az": 47.5, "valid": True}
~~~

### float() is the real number check

A pattern like \`[\d.]+\` describes the *shape* "digits and dots". It happily accepts \`4.7.1\`, which is not a number. \`float()\` is the judge:

~~~python
float("18.2")      # 18.2
float("4.7.1")     # ValueError: could not convert string to float: '4.7.1'
~~~

### try / except

Code inside \`try:\` runs normally. If it raises an error of the type you listed, Python jumps to the matching \`except\` block instead of crashing.

~~~python
try:
    value = float(text)
except ValueError:
    value = None
~~~

Rules of thumb for now (the next project goes much deeper):

- Catch the **specific** error you expect (\`ValueError\`). A bare \`except:\` hides typos and even Ctrl-C.
- Keep the \`try\` block small: only the lines that can raise the error you expect.
- Never swallow an error silently. Either handle it meaningfully or let it surface.

You can raise your own errors with a clear message, and catch the error object with \`as\`:

~~~python
def check_az(az):
    if not 0 <= az <= 360:       # chained comparison: low <= x <= high
        raise ValueError(f"az out of range: {az}")
    return az

try:
    check_az(400)
except ValueError as exc:
    print(exc)                   # az out of range: 400
~~~

### Validation has layers

1. **Shape**: does the text look right? (regex)
2. **Type**: can it become a number? (\`float\`)
3. **Range**: is the number plausible? (a comparison)
4. **Integrity**: did it arrive intact? (the checksum)

Each layer catches mistakes the one before it cannot.

### Never let one bad line stop the stream

A decoder that raises on the first malformed line is useless on a live feed. Instead, a parser can return a **result record** that says whether it worked:

~~~python
{"ok": True,  "call": "KX-204", "snr": 18.2, ...}
{"ok": False, "error": "az is not a number: '4.7.1'", "raw": "<the original line>"}
~~~

The caller (and the alert board) decides what to do. Keep the original line in the failure so a human can look at it.

### Common mistakes

- \`except:\` or \`except Exception:\` around a whole function, hiding real bugs.
- Testing a number with \`if value:\`. A bearing of \`0.0\` is valid but falsy. Compare with \`is None\` when you mean "missing".
- Silently returning a default (like \`0\`) for bad data, so it looks real.
- Throwing away the original input, then not knowing why a record failed.`,
      mission: md`Everything the master pattern returns is still text, and some of it is garbage that merely *looks* right: \`az=4.7.1\`, an elevation of +95 degrees, a message mangled in transit.

Convert, range-check and verify each line, and turn failures into records instead of crashes. The **Alert board** lights up: malformed lines and checksum failures appear with the reason your code gave.`,
      tasks: [
        "to_number(text, name, low, high): convert with float(), raising ValueError(f\"{name} ...\") when it is not a number or is outside low..high",
        "parse_record(raw): use parse_line, convert freq/az/el/snr with to_number, upper-case the call sign, and add \"valid\" (does checksum(message) match the claimed checksum?)",
        "parse_record returns {\"ok\": False, \"error\": ..., \"raw\": raw} for an unreadable line or a bad number; it never raises",
        "parse_all(lines): parse_record for every line, in order",
      ],
      starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 10: parse with care. Eight raw lines to experiment on:
SAMPLE_FEED = [
    '2087-03-14T02:17:45Z  ~^~  kx-204 @ 1420.405mhz  az=047.5 el=+32.0  snr=18.2dB  "Kepler relay online"  #45 ~^~  ',
    '2087-03-14T02:17:48Z\t^^  VR-077@1421.200MHZ\taz=134.8   EL=+57.0  SNR=26.8 dB "Beacon 3 nominal"\t#a9 ^^\r\n',
    '2087-03-14T02:17:51Z  ~^~ ### CARRIER LOST ### ~^~ ',
    '2087-03-14T02:17:54Z ~~ nb-310 @ 1419.850mhz az=210.8 el=+19.3 snr=6.0db "Telemetry burst [ack]" #FF ~~',
    '2087-03-14T02:17:57Z ~~ tn-099 @ 1418.3mhz az=4.7.1 el=+21.0 snr=11.8dB "Ping" #8E ~~',
    '2087-03-14T02:18:00Z  ^~^ or-512 @ 1422.592mhz az=291.8 el=+95.0 snr=13.9dB "Orion array tracking" #B9 ^~^',
    '2087-03-14T02:18:03Z ~^~ kx-204 @ 1420.409mhz az=044.7 el=+34.7 snr=16.7dB "BEACON 7 nominal" #0d ~^~',
    '2087-03-14T02:18:06Z ~^~ lm-148 @ 1425.0mhz az=097.7 el=+70.5 snr=24.1dB "Pulse detected near Vega" #d4 ~^~',
]

def to_number(text, name, low, high):
    # float(text); if that fails, or the number is outside low..high (inclusive),
    # raise ValueError with a message that starts with the field name, e.g. "az out of range: 400.0"
    ...

def parse_record(raw):
    # good line  -> {"ok": True, "stamp": ..., "call": "KX-204", "freq": 1420.405, "az": 47.5, "el": 32.0,
    #                "snr": 18.2, "message": "Kepler relay online", "valid": True}
    #   valid is True when checksum(message) equals the claimed checksum (compare in upper case)
    # unreadable or bad number -> {"ok": False, "error": "<why>", "raw": raw}
    # Ranges: freq 100..20000, az 0..360, el -90..90, snr -60..90.   Never raise!
    ...

def parse_all(lines):
    # parse_record for every line, same order
    ...`,
      solutionAdd: py`SAMPLE_FEED = [
    '2087-03-14T02:17:45Z  ~^~  kx-204 @ 1420.405mhz  az=047.5 el=+32.0  snr=18.2dB  "Kepler relay online"  #45 ~^~  ',
    '2087-03-14T02:17:48Z\t^^  VR-077@1421.200MHZ\taz=134.8   EL=+57.0  SNR=26.8 dB "Beacon 3 nominal"\t#a9 ^^\r\n',
    '2087-03-14T02:17:51Z  ~^~ ### CARRIER LOST ### ~^~ ',
    '2087-03-14T02:17:54Z ~~ nb-310 @ 1419.850mhz az=210.8 el=+19.3 snr=6.0db "Telemetry burst [ack]" #FF ~~',
    '2087-03-14T02:17:57Z ~~ tn-099 @ 1418.3mhz az=4.7.1 el=+21.0 snr=11.8dB "Ping" #8E ~~',
    '2087-03-14T02:18:00Z  ^~^ or-512 @ 1422.592mhz az=291.8 el=+95.0 snr=13.9dB "Orion array tracking" #B9 ^~^',
    '2087-03-14T02:18:03Z ~^~ kx-204 @ 1420.409mhz az=044.7 el=+34.7 snr=16.7dB "BEACON 7 nominal" #0d ~^~',
    '2087-03-14T02:18:06Z ~^~ lm-148 @ 1425.0mhz az=097.7 el=+70.5 snr=24.1dB "Pulse detected near Vega" #d4 ~^~',
]

def to_number(text, name, low, high):
    try:
        value = float(text)
    except ValueError:
        raise ValueError(f"{name} is not a number: {text!r}")
    if not low <= value <= high:
        raise ValueError(f"{name} out of range: {value}")
    return value

def parse_record(raw):
    fields = parse_line(raw)
    if fields is None:
        return {"ok": False, "error": "unreadable line", "raw": raw}
    try:
        record = {
            "ok": True,
            "stamp": fields["stamp"],
            "call": fields["call"].upper(),
            "freq": to_number(fields["freq"], "freq", 100, 20000),
            "az": to_number(fields["az"], "az", 0, 360),
            "el": to_number(fields["el"], "el", -90, 90),
            "snr": to_number(fields["snr"], "snr", -60, 90),
            "message": fields["message"],
        }
    except ValueError as exc:
        return {"ok": False, "error": str(exc), "raw": raw}
    record["valid"] = checksum(record["message"]) == fields["checksum"].upper()
    return record

def parse_all(lines):
    records = []
    for line in lines:
        records.append(parse_record(line))
    return records`,
      explanation:
        "to_number does two jobs and speaks one language: whatever goes wrong, the caller sees a ValueError whose message begins with the field name. The try block in it is tiny (just float). parse_record then wraps all four conversions in one try, because any one of them may raise and the response is the same: a failure record that keeps the original line. The checksum comparison lives outside the try because it cannot raise, and the record is built only after every field passed. A 'not low <= value <= high' test also rejects NaN, which compares false with everything. parse_all just applies the one-line parser to every line in order.",
      hints: [
        { id: "h1", title: "to_number", content: "try: value = float(text) / except ValueError: raise ValueError(f\"{name} is not a number: {text!r}\"). Then if not low <= value <= high: raise ValueError(f\"{name} out of range: {value}\"). Finally return value." },
        { id: "h2", title: "parse_record outline", content: "fields = parse_line(raw); if it is None return the failure dict. Otherwise build the record inside try, converting each number with to_number, and catch ValueError as exc to return {\"ok\": False, \"error\": str(exc), \"raw\": raw}." },
        { id: "h3", title: "valid and parse_all", content: "After the try/except: record[\"valid\"] = checksum(record[\"message\"]) == fields[\"checksum\"].upper(). parse_all: make a list, append parse_record(line) in a for loop, return it." },
      ],
      tests: [
        {
          id: "t1",
          description: "to_number converts valid text and accepts the limits",
          assertionCode: py`
assert to_number("18.2", "snr", -60, 90) == 18.2, "to_number('18.2', ...) should be 18.2"
assert type(to_number("18", "snr", -60, 90)) is float, "to_number should return a float"
assert to_number("0", "az", 0, 360) == 0.0 and to_number("360", "az", 0, 360) == 360.0, "the limits themselves are allowed (use <=)"
assert to_number("-3.4", "snr", -60, 90) == -3.4, "negative numbers are fine when the range allows them"
`,
        },
        {
          id: "t2",
          description: "to_number raises ValueError that names the field",
          assertionCode: py`
try:
    to_number("4.7.1", "az", 0, 360)
except ValueError as exc:
    assert "az" in str(exc), f"the error message should mention the field name 'az' but is {str(exc)!r}"
else:
    assert False, "to_number('4.7.1', 'az', 0, 360) should raise ValueError"
try:
    to_number("95", "el", -90, 90)
except ValueError as exc:
    assert "el" in str(exc), f"the error message should mention 'el' but is {str(exc)!r}"
else:
    assert False, "an elevation of 95 is outside -90..90 and should raise ValueError"
try:
    to_number("nan", "snr", -60, 90)
except ValueError:
    pass
else:
    assert False, "'nan' converts to a float but is not a usable number; it must be rejected too"
`,
        },
        {
          id: "t3",
          description: "parse_record builds a typed record from a good line",
          assertionCode: py`
line = '2087-03-14T02:17:45Z  ~^~  kx-204 @ 1420.405mhz  az=047.5 el=+32.0  snr=18.2dB  "Kepler relay online"  #45 ~^~  '
want = {"ok": True, "stamp": "2087-03-14T02:17:45Z", "call": "KX-204", "freq": 1420.405, "az": 47.5, "el": 32.0, "snr": 18.2, "message": "Kepler relay online", "valid": True}
got = parse_record(line)
assert isinstance(got, dict), "parse_record must return a dict"
for key, value in want.items():
    assert got.get(key) == value, f"record[{key!r}] should be {value!r} but is {got.get(key)!r}"
assert type(got["az"]) is float and type(got["valid"]) is bool, "az should be a float and valid a bool"
`,
        },
        {
          id: "t4",
          description: "a checksum mismatch still parses but is not valid; lower-case hex is fine",
          assertionCode: py`
bad = parse_record('2087-03-14T02:17:54Z ~~ nb-310 @ 1419.850mhz az=210.8 el=+19.3 snr=6.0db "Telemetry burst [ack]" #FF ~~')
assert bad.get("ok") is True and bad.get("valid") is False, f"the message is readable but the checksum FF does not match: expected ok True, valid False, got {bad!r}"
good = parse_record('2087-03-14T02:17:48Z\t^^  VR-077@1421.200MHZ\taz=134.8   EL=+57.0  SNR=26.8 dB "Beacon 3 nominal"\t#a9 ^^\r\n')
assert good.get("ok") is True and good.get("valid") is True, f"'#a9' is the checksum for this message (compare in upper case): {good!r}"
`,
        },
        {
          id: "t5",
          description: "unreadable lines and bad numbers become failure records",
          assertionCode: py`
junk = '2087-03-14T02:17:51Z  ~^~ ### CARRIER LOST ### ~^~ '
got = parse_record(junk)
assert got.get("ok") is False and got.get("raw") == junk, f"an unreadable line should give ok False and keep the original text in 'raw': {got!r}"
assert isinstance(got.get("error"), str) and got["error"], "failure records need a non-empty error message"
line = '2087-03-14T02:17:57Z ~~ tn-099 @ 1418.3mhz az=4.7.1 el=+21.0 snr=11.8dB "Ping" #8E ~~'
got = parse_record(line)
assert got.get("ok") is False and "az" in got.get("error", ""), f"az=4.7.1 is not a number; the error should mention az: {got!r}"
line = '2087-03-14T02:18:00Z  ^~^ or-512 @ 1422.592mhz az=291.8 el=+95.0 snr=13.9dB "Orion array tracking" #B9 ^~^'
got = parse_record(line)
assert got.get("ok") is False and "el" in got.get("error", ""), f"el=+95 is out of range; the error should mention el: {got!r}"
`,
        },
        {
          id: "t6",
          description: "parse_record never raises, whatever it is given",
          assertionCode: py`
for odd in ["", "x", "\n", "2087-03-14T02:17:45Z", "2087-03-14T02:17:45Z   ", "☃ snowman", "#" * 50]:
    try:
        got = parse_record(odd)
    except Exception as exc:
        assert False, f"parse_record({odd!r}) raised {type(exc).__name__}: {exc}. A feed must never be stopped by one bad line"
    assert got.get("ok") is False, f"parse_record({odd!r}) should return ok False"
`,
        },
        {
          id: "t7",
          description: "parse_all keeps order and handles an empty feed",
          assertionCode: py`
lines = ['2087-03-14T02:17:45Z kx-204 @ 1420.405mhz az=047.5 el=+32.0 snr=18.2dB "Kepler relay online" #45', 'garbage', '2087-03-14T02:17:48Z vr-077 @ 1421.2mhz az=134.8 el=+57.0 snr=26.8dB "Beacon 3 nominal" #a9']
got = parse_all(lines)
assert len(got) == 3, f"parse_all should return one record per line (3) but returned {len(got)}"
assert [r["ok"] for r in got] == [True, False, True], "the records must be in the same order as the lines"
assert got[2]["call"] == "VR-077"
assert parse_all([]) == [], "an empty feed gives an empty list"
`,
        },
      ],
      unlocks: ["sl-alerts"],
      checks: [
        {
          prompt: "Why is a bare `except:` considered bad practice?",
          question: {
            type: "choice",
            options: [
              "It also catches typos, bugs and even Ctrl-C, hiding real problems",
              "It is a syntax error",
              "It is slower",
              "It only works once",
            ],
            answer: 0,
          },
          explanation: "Catch the specific exception you expect. Anything else is a bug you want to see, not hide.",
        },
        {
          prompt: "`az` is `0.0` (due north) and you write `if az:`. What happens?",
          question: {
            type: "choice",
            options: [
              "It is treated as missing, because 0.0 is falsy",
              "It works as expected",
              "It raises a ValueError",
              "It becomes None",
            ],
            answer: 0,
          },
          explanation: "`0`, `0.0`, `\"\"`, `[]` and `None` are all falsy. When you mean \"is it missing?\" write `if az is None:`.",
        },
        {
          prompt: "A regex says `az=4.7.1` is fine (`[\\d.]+`). Which layer rejects it?",
          question: { type: "choice", options: ["Converting with `float()`", "The checksum", "`strip()`", "Nothing can"], answer: 0 },
          explanation: "A pattern checks the shape of text. `float(\"4.7.1\")` raises `ValueError`, which is what lets us reject it.",
        },
      ],
    },

    // ───────────────────────── 11 ─────────────────────────
    {
      id: "signal-lab-11-comprehensions",
      title: "Comprehensions",
      minutes: 20,
      xp: 150,
      concepts: ["list comprehensions", "filtering", "dict comprehensions", "set comprehensions", "generator expressions", "any / all / sum"],
      learn: md`### A loop that builds a list, in one line

~~~python
squares = []
for n in range(5):
    squares.append(n * n)

squares = [n * n for n in range(5)]      # the same thing: [0, 1, 4, 9, 16]
~~~

The shape is **\`[expression for item in iterable if condition]\`**. Read it as: "give me *expression*, for each *item* in *iterable*, but only when *condition* holds".

~~~python
[n for n in range(10) if n % 2 == 0]               # [0, 2, 4, 6, 8]
[r["snr"] for r in records]                        # just the signal strengths
["loud" if s > 20 else "quiet" for s in snrs]      # if/else INSIDE the expression
~~~

Two different \`if\`s: a trailing \`if\` **filters** items out; an \`if ... else\` in front **chooses a value** for each item.

A comprehension may have a second \`for\`, which reads like nested loops from left to right: \`[(a, b) for a in "xy" for b in (1, 2)]\`. More than two clauses is a sign to use a normal loop.

### Dict and set comprehensions

Curly braces build dicts and sets.

~~~python
{call: len(call) for call in ["KX-204", "VR-077"]}    # {'KX-204': 6, 'VR-077': 6}
{r["call"] for r in records}                           # a set: each call sign once
{r["call"]: r for r in records}                        # later records overwrite earlier ones
~~~

Remember that \`{}\` on its own is an empty **dict**; an empty set is \`set()\`. Sets have no order, so convert with \`sorted(...)\` when you need a stable list.

### Generator expressions

Swap the brackets for parentheses and you get a **generator**: it produces items one at a time and never builds the list. When it is the only argument of a function, the parentheses double up and you can drop them.

~~~python
sum(r["snr"] for r in records)               # no list needed, no extra brackets
any(r["snr"] > 25 for r in records)          # stops at the first True
all(r["valid"] for r in records)             # stops at the first False
max((r["snr"] for r in records), default=0)  # default avoids an error on empty input
~~~

A generator is **single use**: \`g = (n for n in range(3)); list(g); list(g)\` gives \`[0, 1, 2]\` and then \`[]\`.

### When a comprehension is the wrong tool

- You are calling something for its side effect (\`print\`, \`append\` somewhere else): use a plain loop.
- You need more than one \`for\` plus a condition, or the line no longer fits comfortably: use a loop or a small helper function.
- You only need to loop once over a huge input: use a generator rather than materialising a list.

### Common mistakes

- Dividing by \`len(...)\` of an empty list when computing a mean.
- \`max([])\` raising \`ValueError\`: pass \`default=\` or check first.
- Forgetting that \`{ ... : ... for ... }\` keeps only the **last** value for a repeated key.
- Reusing a spent generator and silently getting nothing.`,
      mission: md`The records are typed now, but the dashboard needs particular shapes: a list of points for the **sky map**, the newest record per station, the set of stations heard, and an average signal strength.

Write them as comprehensions. The **Sky map** lights up: azimuth runs clockwise from north around the rim, elevation puts a source closer to the centre (zenith) the higher it is, and the dot size grows with signal strength. A slider sets the minimum SNR you pass to \`sky_points\`.`,
      tasks: [
        "good(records): the records that parsed (ok) and whose checksum is valid, as a list comprehension",
        "sky_points(records, min_snr=0): for each good record with snr >= min_snr, a dict with just call, az, el and snr",
        "latest_by_call(records) as a dict comprehension (later records win) and unique_calls(records) as a set comprehension, both over good records",
        "mean_snr(records): the average snr of the good records, rounded to 1 decimal, using a generator expression; 0.0 when there are none",
      ],
      starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 11: comprehensions.

def good(records):
    # records with ok True AND valid True, in order   (list comprehension)
    ...

def sky_points(records, min_snr=0):
    # [{"call": "KX-204", "az": 47.5, "el": 32.0, "snr": 18.2}, ...] for good records with snr >= min_snr
    ...

def latest_by_call(records):
    # {"KX-204": <its last good record>, ...}   (dict comprehension)
    ...

def unique_calls(records):
    # the set of call signs among good records   (set comprehension)
    ...

def mean_snr(records):
    # average snr of good records, rounded to 1 decimal. No good records -> 0.0
    # Use a generator expression inside sum(), not a list.
    ...`,
      solutionAdd: py`def good(records):
    return [r for r in records if r["ok"] and r["valid"]]

def sky_points(records, min_snr=0):
    return [
        {"call": r["call"], "az": r["az"], "el": r["el"], "snr": r["snr"]}
        for r in good(records)
        if r["snr"] >= min_snr
    ]

def latest_by_call(records):
    return {r["call"]: r for r in good(records)}

def unique_calls(records):
    return {r["call"] for r in good(records)}

def mean_snr(records):
    usable = good(records)
    if not usable:
        return 0.0
    return round(sum(r["snr"] for r in usable) / len(usable), 1)`,
      explanation:
        "good is the foundation: every other function filters through it, so there is exactly one definition of 'trustworthy'. Note that r['ok'] is checked first: failure records have no 'valid' key, and 'and' stops before looking. sky_points both filters (trailing if) and reshapes (the dict in front). The dict comprehension relies on later keys overwriting earlier ones, which is exactly 'latest wins' for a time-ordered feed; the set comprehension collapses duplicates. mean_snr feeds a generator straight into sum() so no temporary list of numbers exists, and guards against dividing by zero.",
      hints: [
        { id: "h1", title: "good", content: "[r for r in records if r[\"ok\"] and r[\"valid\"]]. Put r[\"ok\"] first: failure records have no \"valid\" key." },
        { id: "h2", title: "Reshaping", content: "sky_points: [{\"call\": r[\"call\"], \"az\": r[\"az\"], ...} for r in good(records) if r[\"snr\"] >= min_snr]. Dict comprehension: {r[\"call\"]: r for r in good(records)}. Set: {r[\"call\"] for r in good(records)}." },
        { id: "h3", title: "The mean", content: "usable = good(records); if not usable: return 0.0. Then round(sum(r[\"snr\"] for r in usable) / len(usable), 1). No square brackets inside sum()." },
      ],
      tests: [
        {
          id: "t1",
          description: "good keeps only parsed, checksum-valid records, in order",
          assertionCode: py`
def rec(call, snr, valid=True, az=10.0, el=20.0, stamp="2087-03-14T02:17:45Z", message="hello"):
    return {"ok": True, "stamp": stamp, "call": call, "freq": 1420.4, "az": az, "el": el, "snr": snr, "message": message, "valid": valid}
fail = {"ok": False, "error": "unreadable line", "raw": "###"}
a, b, c = rec("KX-204", 10.0), rec("VR-077", 20.0, valid=False), rec("NB-310", 5.0)
got = good([a, fail, b, c])
assert got == [a, c], f"good should keep only the records that parsed AND have a valid checksum, in order: expected 2 records (KX-204, NB-310) but got {[r.get('call') for r in got]!r}"
assert good([]) == [], "no records gives an empty list"
assert good([fail]) == [], "a failure record has no 'valid' key; check r['ok'] first"
`,
        },
        {
          id: "t2",
          description: "sky_points keeps just call, az, el and snr, and applies the SNR floor",
          assertionCode: py`
def rec(call, snr, valid=True, az=10.0, el=20.0):
    return {"ok": True, "stamp": "2087-03-14T02:17:45Z", "call": call, "freq": 1420.4, "az": az, "el": el, "snr": snr, "message": "hello", "valid": valid}
recs = [rec("KX-204", 18.2, az=47.5, el=32.0), rec("NB-310", -3.0, az=210.8, el=19.3), rec("VR-077", 26.8, valid=False), {"ok": False, "error": "x", "raw": "y"}]
got = sky_points(recs)
assert got == [{"call": "KX-204", "az": 47.5, "el": 32.0, "snr": 18.2}], f"by default only snr >= 0 counts, and only the four keys call, az, el, snr belong in each point: got {got!r}"
got = sky_points(recs, -10)
assert [p["call"] for p in got] == ["KX-204", "NB-310"], f"with min_snr=-10 both valid records should appear: got {[p['call'] for p in got]!r}"
assert sky_points(recs, 100) == [], "nothing is that strong, so the list is empty"
`,
        },
        {
          id: "t3",
          description: "latest_by_call keeps the newest good record per station",
          assertionCode: py`
def rec(call, snr, stamp, valid=True):
    return {"ok": True, "stamp": stamp, "call": call, "freq": 1420.4, "az": 1.0, "el": 2.0, "snr": snr, "message": "m", "valid": valid}
r1, r2, r3, r4 = rec("KX-204", 10.0, "02"), rec("VR-077", 20.0, "03"), rec("KX-204", 30.0, "04"), rec("VR-077", 99.0, "05", valid=False)
got = latest_by_call([r1, r2, r3, r4])
assert isinstance(got, dict), "latest_by_call should return a dict"
assert set(got) == {"KX-204", "VR-077"}, f"keys should be the call signs, got {sorted(got)!r}"
assert got["KX-204"] == r3, "the later KX-204 record should replace the earlier one"
assert got["VR-077"] == r2, "the invalid VR-077 record must be ignored, so the last GOOD one (r2) wins"
`,
        },
        {
          id: "t4",
          description: "unique_calls returns a set of stations heard",
          assertionCode: py`
def rec(call, valid=True):
    return {"ok": True, "stamp": "s", "call": call, "freq": 1.0, "az": 1.0, "el": 2.0, "snr": 3.0, "message": "m", "valid": valid}
got = unique_calls([rec("KX-204"), rec("VR-077"), rec("KX-204"), rec("ZZ-999", valid=False), {"ok": False, "error": "x", "raw": "y"}])
assert isinstance(got, set), f"unique_calls should return a set, not {type(got).__name__}"
assert got == {"KX-204", "VR-077"}, f"expected {{'KX-204', 'VR-077'}} (each station once, bad records ignored) but got {got!r}"
assert unique_calls([]) == set(), "no records means an empty set"
`,
        },
        {
          id: "t5",
          description: "mean_snr averages good records, rounds to 1 decimal, and survives empty input",
          assertionCode: py`
def rec(snr, valid=True):
    return {"ok": True, "stamp": "s", "call": "KX-204", "freq": 1.0, "az": 1.0, "el": 2.0, "snr": snr, "message": "m", "valid": valid}
assert mean_snr([rec(18.2), rec(26.8)]) == 22.5, f"(18.2 + 26.8) / 2 is 22.5 but got {mean_snr([rec(18.2), rec(26.8)])!r}"
assert mean_snr([rec(10.0), rec(11.0), rec(11.0)]) == 10.7, "10.666... rounds to 10.7"
assert mean_snr([rec(10.0), rec(90.0, valid=False), {"ok": False, "error": "x", "raw": "y"}]) == 10.0, "invalid and failed records do not count"
assert mean_snr([]) == 0.0, "no good records: return 0.0 instead of dividing by zero"
`,
        },
      ],
      unlocks: ["sl-skymap"],
      checks: [
        {
          prompt: "What is the difference between the two `if`s in `[\"hi\" if n > 5 else \"lo\" for n in nums if n != 0]`?",
          question: {
            type: "choice",
            options: [
              "The first `if ... else` chooses each item's value; the trailing `if` drops items",
              "They do the same thing",
              "The first is a syntax error",
              "The trailing `if` chooses the value and the first drops items",
            ],
            answer: 0,
          },
          explanation: "A conditional expression in front decides **what** each item becomes (and needs an `else`). A trailing `if` decides **whether** the item is included at all.",
        },
        {
          prompt: "Why is `sum(r[\"snr\"] for r in recs)` preferable to `sum([r[\"snr\"] for r in recs])` on a huge feed?",
          question: {
            type: "choice",
            options: [
              "The generator version never builds the intermediate list, so it uses constant memory",
              "It gives a different answer",
              "Lists cannot be summed",
              "It is the only one that works",
            ],
            answer: 0,
          },
          explanation: "Both give the same total, but the generator hands `sum` one value at a time instead of storing all of them first.",
        },
        {
          prompt: "What does `{r[\"call\"]: r for r in recs}` do when two records share a call sign?",
          question: { type: "choice", options: ["The later one overwrites the earlier one", "It raises a KeyError", "It keeps both in a list", "It keeps the first one"], answer: 0 },
          explanation: "A dict has one value per key, and a comprehension assigns in order, so the last record for each key survives. That is how we get \"latest per station\".",
        },
      ],
    },
  ],
};
