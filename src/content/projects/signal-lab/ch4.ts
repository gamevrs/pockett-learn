import type { Chapter } from "@/engine/types";
import { md, py } from "./util.ts";

/**
 * Chapter 4: Rank, count, ship. Sorting with key functions, Counter and defaultdict, and a final
 * lesson that composes the whole decoder from small single-purpose functions.
 */

export const chapter4: Chapter = {
  id: "ship",
  title: "Rank, count, ship",
  blurb: "Order the signals, count the stations, and assemble the whole pipeline from small clean functions.",
  lessons: [
    // ───────────────────────── 12 ─────────────────────────
    {
      id: "signal-lab-12-sorting",
      title: "Sorting with keys",
      minutes: 18,
      xp: 150,
      concepts: ["sorted vs sort", "key functions", "lambda", "multi-key sorts", "reverse", "stability", "min / max with key"],
      learn: md`### sorted() and .sort()

~~~python
nums = [3, 1, 2]
sorted(nums)                  # [1, 2, 3]   a NEW list; nums is untouched
sorted(nums, reverse=True)    # [3, 2, 1]
nums.sort()                   # sorts IN PLACE and returns None
~~~

The classic bug is \`ordered = nums.sort()\`: \`ordered\` is \`None\`. When the list belongs to someone else (a function argument!) use \`sorted\`, which never changes it.

### The key function

By default Python compares the items themselves. For records, strings with mixed case, or anything else you want to rank differently, pass \`key=\`: a function that receives **one item** and returns the value to compare.

~~~python
words = ["delta", "Echo", "bravo"]
sorted(words)                    # ['Echo', 'bravo', 'delta']   capitals sort before lower case
sorted(words, key=str.lower)     # ['bravo', 'delta', 'Echo']
sorted(words, key=len)           # ['Echo', 'delta', 'bravo']
~~~

For a record you usually write the key as a **lambda**, a one-expression anonymous function:

~~~python
sorted(records, key=lambda r: r["snr"])      # weakest signal first
~~~

\`lambda r: r["snr"]\` means exactly the same as \`def f(r): return r["snr"]\`. If the logic needs more than one expression, write a normal \`def\`. (\`operator.itemgetter("snr")\` is another way to write this key.)

### Reverse, and several keys at once

\`reverse=True\` flips the order. To sort by several things, make the key a **tuple**: Python compares tuples element by element, so the second item only matters when the first ties.

~~~python
sorted(records, key=lambda r: (r["call"], r["stamp"]))     # by station, then by time
sorted(records, key=lambda r: (r["call"], -r["snr"]))      # by station, strongest first within each
~~~

For numbers you can mix directions by negating one of them. (Text cannot be negated; sort in two passes instead, see stability.)

### Sorting is stable

Items whose keys are equal keep their original relative order. That has two consequences. You can sort in several passes (secondary key first, then primary), and \`reverse=True\` keeps ties in their original order, which is **not** the same as sorting and then reversing the list with \`[::-1]\`.

### min and max take a key too

~~~python
max(records, key=lambda r: r["snr"])                    # the loudest record itself
max(records, key=lambda r: r["snr"], default=None)      # None instead of an error on empty input
~~~

### Dates in logs

ISO 8601 stamps (\`2087-03-14T02:17:45Z\`) are year first, zero-padded and fixed width, so plain **string** order is time order. A format like \`14/03/2087\` sorts wrongly as text. This is one of the best reasons to log in ISO format.

### Common mistakes

- Using the result of \`list.sort()\`.
- Sorting strings that look like numbers: \`sorted(["10", "9"])\` is \`['10', '9']\`. Convert with \`key=int\`.
- Mixing types: \`sorted([3, "a"])\` raises \`TypeError\`.
- Calling the key function yourself: \`key=len\` not \`key=len()\`.`,
      mission: md`The control room wants rankings: the strongest signals right now, a station-by-station listing with each station's best signal first, the single loudest transmission, and a timeline.

The **Strongest signals** panel lights up with your \`strongest\` ranking: bars scale with SNR, and the best signal wears the lime marker.`,
      tasks: [
        "strongest(records, n=5): the top n good records by snr, strongest first (a new list; do not touch the input)",
        "by_station(records): good records ordered by call sign, and within a station strongest first (a tuple key)",
        "loudest(records): the single good record with the highest snr, or None when there is none",
        "timeline(records, newest_first=False): good records in time order using the stamp text, optionally reversed",
      ],
      starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 12: sorting with keys. Build on good(records) from the last lesson.

def strongest(records, n=5):
    # top n good records, highest snr first. Do not change the list you were given.
    ...

def by_station(records):
    # good records sorted by call sign, and within a call sign strongest snr first
    ...

def loudest(records):
    # the good record with the highest snr, or None if there are no good records
    ...

def timeline(records, newest_first=False):
    # good records in time order. ISO stamps sort correctly as plain text.
    ...`,
      solutionAdd: py`def strongest(records, n=5):
    return sorted(good(records), key=lambda r: r["snr"], reverse=True)[:n]

def by_station(records):
    return sorted(good(records), key=lambda r: (r["call"], -r["snr"]))

def loudest(records):
    return max(good(records), key=lambda r: r["snr"], default=None)

def timeline(records, newest_first=False):
    return sorted(good(records), key=lambda r: r["stamp"], reverse=newest_first)`,
      explanation:
        "Each function is a one-liner once good() has filtered the records. strongest sorts with a lambda key and reverse=True, then slices the first n: sorted() builds a new list, so the caller's list is never reordered. by_station uses a tuple key and negates the number so that the strongest comes first within each station while the text sorts normally. loudest uses max with key and a default, which is cleaner than sorting everything just to take one. timeline works because ISO stamps are fixed width and most-significant-first.",
      hints: [
        { id: "h1", title: "key and reverse", content: "sorted(good(records), key=lambda r: r[\"snr\"], reverse=True) gives strongest first. Slice with [:n] to keep n of them." },
        { id: "h2", title: "Tuple keys", content: "A tuple key compares left to right: key=lambda r: (r[\"call\"], -r[\"snr\"]) sorts by call sign, and within one call sign by snr descending (the minus flips the number)." },
        { id: "h3", title: "max and ISO text", content: "max(good(records), key=lambda r: r[\"snr\"], default=None) returns None for an empty list instead of raising. timeline: sorted(..., key=lambda r: r[\"stamp\"], reverse=newest_first)." },
      ],
      tests: [
        {
          id: "t1",
          description: "strongest returns the top n by snr, highest first",
          assertionCode: py`
def rec(call, snr, stamp="2087-03-14T02:17:45Z", valid=True):
    return {"ok": True, "stamp": stamp, "call": call, "freq": 1420.4, "az": 1.0, "el": 2.0, "snr": snr, "message": "m", "valid": valid}
recs = [rec("KX-204", 10.0), rec("VR-077", 27.1), rec("NB-310", -3.0), rec("OR-512", 15.0), rec("LM-148", 24.1), rec("TN-099", 99.0, valid=False), {"ok": False, "error": "x", "raw": "y"}]
got = strongest(recs, 3)
assert [r["call"] for r in got] == ["VR-077", "LM-148", "OR-512"], f"the top 3 good signals are VR-077, LM-148, OR-512 (the invalid 99.0 does not count) but got {[r['call'] for r in got]!r}"
assert len(strongest(recs)) == 5, "n defaults to 5, and there are exactly 5 good records"
assert strongest([], 3) == [], "empty input gives an empty list"
`,
        },
        {
          id: "t2",
          description: "strongest does not reorder the caller's list, and keeps ties in original order",
          assertionCode: py`
def rec(call, snr):
    return {"ok": True, "stamp": "s", "call": call, "freq": 1.0, "az": 1.0, "el": 2.0, "snr": snr, "message": "m", "valid": True}
recs = [rec("AA-111", 5.0), rec("BB-222", 9.0), rec("CC-333", 9.0), rec("DD-444", 1.0)]
copy = list(recs)
got = strongest(recs, 4)
assert recs == copy, "strongest must not sort the list it was given in place; use sorted(), not .sort()"
assert [r["call"] for r in got] == ["BB-222", "CC-333", "AA-111", "DD-444"], f"records with equal snr should stay in their original order (BB before CC); sorted(..., reverse=True) does that. Got {[r['call'] for r in got]!r}"
`,
        },
        {
          id: "t3",
          description: "by_station groups by call sign with the strongest first inside each",
          assertionCode: py`
def rec(call, snr):
    return {"ok": True, "stamp": "s", "call": call, "freq": 1.0, "az": 1.0, "el": 2.0, "snr": snr, "message": "m", "valid": True}
recs = [rec("VR-077", 20.0), rec("KX-204", 10.0), rec("VR-077", 27.0), rec("KX-204", 18.0), rec("AA-001", 1.0)]
got = [(r["call"], r["snr"]) for r in by_station(recs)]
want = [("AA-001", 1.0), ("KX-204", 18.0), ("KX-204", 10.0), ("VR-077", 27.0), ("VR-077", 20.0)]
assert got == want, f"expected {want!r} but got {got!r}. Use a tuple key: (call, -snr)"
`,
        },
        {
          id: "t4",
          description: "loudest returns the best good record, or None",
          assertionCode: py`
def rec(call, snr, valid=True):
    return {"ok": True, "stamp": "s", "call": call, "freq": 1.0, "az": 1.0, "el": 2.0, "snr": snr, "message": "m", "valid": valid}
a, b, c = rec("KX-204", 10.0), rec("VR-077", 27.1), rec("ZZ-999", 80.0, valid=False)
assert loudest([a, b, c]) == b, "the loudest GOOD record is VR-077 (ZZ-999 has a bad checksum)"
assert loudest([]) is None, "no records: return None, not an exception"
assert loudest([c, {"ok": False, "error": "x", "raw": "y"}]) is None, "with no good records the answer is None"
`,
        },
        {
          id: "t5",
          description: "timeline orders by stamp, oldest or newest first",
          assertionCode: py`
def rec(call, stamp):
    return {"ok": True, "stamp": stamp, "call": call, "freq": 1.0, "az": 1.0, "el": 2.0, "snr": 3.0, "message": "m", "valid": True}
recs = [rec("B", "2087-03-14T02:17:48Z"), rec("C", "2087-03-14T09:00:00Z"), rec("A", "2087-03-14T02:17:45Z")]
assert [r["call"] for r in timeline(recs)] == ["A", "B", "C"], f"oldest first expected A, B, C but got {[r['call'] for r in timeline(recs)]!r}"
assert [r["call"] for r in timeline(recs, newest_first=True)] == ["C", "B", "A"], "newest_first=True should reverse the order"
`,
        },
      ],
      unlocks: ["sl-ranking"],
      checks: [
        {
          prompt: "What does `ordered = [3, 1, 2].sort()` store in `ordered`?",
          question: { type: "choice", options: ["`None`", "`[1, 2, 3]`", "`[3, 1, 2]`", "A generator"], answer: 0 },
          explanation: "`list.sort()` sorts in place and returns `None`. Use `sorted(...)` when you want the sorted list back.",
        },
        {
          prompt: "Which key sorts records by call sign A to Z, and within a call sign by highest snr first?",
          question: {
            type: "choice",
            options: [
              "`lambda r: (r[\"call\"], -r[\"snr\"])`",
              "`lambda r: (r[\"snr\"], r[\"call\"])`",
              "`lambda r: r[\"call\"] + r[\"snr\"]`",
              "`lambda r: -r[\"call\"]`",
            ],
            answer: 0,
          },
          explanation: "Tuples compare left to right: first by call sign, and only on a tie by the second item. Negating a number flips its direction. (Adding a string and a number would raise a `TypeError`.)",
        },
        {
          prompt: "Why can a plain string sort put ISO stamps like `2087-03-14T02:17:45Z` in chronological order?",
          question: {
            type: "choice",
            options: [
              "They are fixed width and go from the most significant unit (year) to the least",
              "Because Python knows they are dates",
              "Because they end in Z",
              "It can't; you must parse them first",
            ],
            answer: 0,
          },
          explanation: "Comparing text goes character by character, so a format that starts with the year and zero-pads every field compares exactly like time does.",
        },
      ],
    },

    // ───────────────────────── 13 ─────────────────────────
    {
      id: "signal-lab-13-counting",
      title: "Counting & grouping",
      minutes: 18,
      xp: 160,
      concepts: ["collections.Counter", "most_common", "defaultdict", "grouping", "dict comprehension over groups"],
      learn: md`### Counting by hand is repetitive

~~~python
counts = {}
for call in calls:
    counts[call] = counts.get(call, 0) + 1
~~~

This works, but you write it every time. The standard library has a tool for it.

### collections.Counter

A \`Counter\` is a dict that counts. Give it any iterable and it tallies the items.

~~~python
from collections import Counter

c = Counter(["KX-204", "VR-077", "KX-204"])    # Counter({'KX-204': 2, 'VR-077': 1})
c["KX-204"]            # 2
c["ZZ-999"]            # 0       a missing key counts as zero (no KeyError)
c.most_common(1)       # [('KX-204', 2)]    the n biggest, as (item, count) pairs
c.update(["VR-077"])   # add more counts later
~~~

Feed it a generator to count a property of records: \`Counter(r["call"] for r in records)\`. Counters of the same kind can be added together, and \`Counter("hello")\` counts letters, so be careful to pass a list of words if you meant words. Items with equal counts keep the order in which they were first seen.

### collections.defaultdict

A \`defaultdict\` creates a missing value on first access, using a **factory** function you provide. It makes "group items by key" a three-liner.

~~~python
from collections import defaultdict

groups = defaultdict(list)
for r in records:
    groups[r["call"]].append(r)        # no "if key not in groups" needed
~~~

Other useful factories: \`int\` (starts at 0), \`set\`, or \`lambda: [0, 0]\`.

One trap: **reading** a missing key also creates it (\`groups["ZZ-999"]\` adds an empty list). Use \`in\` or \`.get()\` to look without creating, and return a plain \`dict(groups)\` from your functions so callers do not trip over it.

### Group, then summarise

Grouping and comprehensions fit together: group first, then build a dict from the groups.

~~~python
{call: round(sum(r["snr"] for r in rs) / len(rs), 1) for call, rs in groups.items()}
~~~

### Common mistakes

- Counting the letters of a string when you meant its words (\`Counter(text)\` versus \`Counter(text.split())\`).
- Forgetting that \`most_common()\` returns pairs, which become two-item lists in JSON.
- Dividing by the group size without being sure it is not zero. (Groups made by \`defaultdict\` always have at least one item, but a group made by hand might not.)
- Changing a dictionary while looping over it.`,
      mission: md`Who is talking the most? Who is the strongest on average? What words keep showing up in the messages? Counters and grouping answer all three.

The **Top senders** leaderboard lights up: bars from your \`top_senders\` Counter, each station's average SNR from \`average_snr\`, and the most common words in the messages from \`hot_words\`.`,
      tasks: [
        "top_senders(records, n=3): the n most common call signs among good records as (call, count) pairs, using Counter and most_common",
        "group_by_call(records): a plain dict of call sign to the list of its good records (defaultdict(list))",
        "average_snr(records): a dict of call sign to its average snr, rounded to 1 decimal (a dict comprehension over the groups)",
        "hot_words(records, n=5): the n most common words in good messages (lower case, letters only, STOP_WORDS removed) as (word, count) pairs",
      ],
      starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 13: counting and grouping.
from collections import Counter, defaultdict

STOP_WORDS = {"a", "an", "the", "on", "of", "to", "and", "is", "in"}

def top_senders(records, n=3):
    # [("KX-204", 5), ("VR-077", 4), ...] biggest counts first, among good records
    ...

def group_by_call(records):
    # {"KX-204": [rec, rec, ...], ...}  a plain dict, built with defaultdict(list)
    ...

def average_snr(records):
    # {"KX-204": 17.4, ...}  average snr per station, 1 decimal
    ...

def hot_words(records, n=5):
    # the most common words in the good messages, lower case, letters only,
    # skipping STOP_WORDS.  [("relay", 4), ("nominal", 3), ...]
    ...`,
      solutionAdd: py`from collections import Counter, defaultdict

STOP_WORDS = {"a", "an", "the", "on", "of", "to", "and", "is", "in"}

def top_senders(records, n=3):
    return Counter(r["call"] for r in good(records)).most_common(n)

def group_by_call(records):
    groups = defaultdict(list)
    for r in good(records):
        groups[r["call"]].append(r)
    return dict(groups)

def average_snr(records):
    return {
        call: round(sum(r["snr"] for r in rs) / len(rs), 1)
        for call, rs in group_by_call(records).items()
    }

def hot_words(records, n=5):
    words = Counter()
    for r in good(records):
        found = re.findall(r"[a-z]+", r["message"].lower())
        words.update(w for w in found if w not in STOP_WORDS)
    return words.most_common(n)`,
      explanation:
        "Counter tallies a generator of call signs in one expression and most_common(n) does the ranking. defaultdict(list) removes the 'is this key new?' branch from grouping, and dict(groups) hands back an ordinary dict. average_snr reuses group_by_call instead of repeating the loop, which is the pay-off of small functions. hot_words shows Counter.update with a generator: re.findall pulls out letters-only words from the lower-cased message (so '[ack]' contributes 'ack' and digits are ignored), and the filter drops the noise words.",
      hints: [
        { id: "h1", title: "Counter", content: "Counter(r[\"call\"] for r in good(records)).most_common(n) gives the (call, count) pairs, biggest first." },
        { id: "h2", title: "Groups", content: "groups = defaultdict(list); for r in good(records): groups[r[\"call\"]].append(r); return dict(groups). Then average_snr is {call: round(sum(...) / len(rs), 1) for call, rs in group_by_call(records).items()}." },
        { id: "h3", title: "Words", content: "words = Counter(); for each good record: found = re.findall(r\"[a-z]+\", r[\"message\"].lower()); words.update(w for w in found if w not in STOP_WORDS). Return words.most_common(n)." },
      ],
      tests: [
        {
          id: "t1",
          description: "top_senders ranks stations by message count",
          assertionCode: py`
def rec(call, valid=True, message="m", snr=1.0):
    return {"ok": True, "stamp": "s", "call": call, "freq": 1.0, "az": 1.0, "el": 2.0, "snr": snr, "message": message, "valid": valid}
recs = [rec("KX-204"), rec("VR-077"), rec("KX-204"), rec("NB-310"), rec("KX-204"), rec("VR-077"), rec("ZZ-999", valid=False), rec("ZZ-999", valid=False), rec("ZZ-999", valid=False), rec("ZZ-999", valid=False), {"ok": False, "error": "x", "raw": "y"}]
got = [tuple(p) for p in top_senders(recs, 2)]
assert got == [("KX-204", 3), ("VR-077", 2)], f"expected [('KX-204', 3), ('VR-077', 2)] but got {got!r}. Only good records count"
assert len(top_senders(recs)) == 3, "n defaults to 3"
assert top_senders([]) == [], "no records, no senders"
`,
        },
        {
          id: "t2",
          description: "top_senders keeps first-seen order for ties",
          assertionCode: py`
def rec(call):
    return {"ok": True, "stamp": "s", "call": call, "freq": 1.0, "az": 1.0, "el": 2.0, "snr": 1.0, "message": "m", "valid": True}
got = [tuple(p) for p in top_senders([rec("BB-222"), rec("AA-111"), rec("BB-222"), rec("AA-111"), rec("CC-333")], 3)]
assert got == [("BB-222", 2), ("AA-111", 2), ("CC-333", 1)], f"a tie keeps the station seen first on top: got {got!r}"
`,
        },
        {
          id: "t3",
          description: "group_by_call returns a plain dict of record lists",
          assertionCode: py`
def rec(call, snr, valid=True):
    return {"ok": True, "stamp": "s", "call": call, "freq": 1.0, "az": 1.0, "el": 2.0, "snr": snr, "message": "m", "valid": valid}
a, b, c, d = rec("KX-204", 10.0), rec("VR-077", 20.0), rec("KX-204", 14.0), rec("VR-077", 99.0, valid=False)
got = group_by_call([a, b, c, d])
assert type(got) is dict, f"return a plain dict (dict(groups)), not {type(got).__name__}"
assert got == {"KX-204": [a, c], "VR-077": [b]}, f"expected each station's good records in order, got {got!r}"
assert "ZZ-999" not in got and len(got) == 2, "reading a missing key from the result must not invent a group"
assert group_by_call([]) == {}
`,
        },
        {
          id: "t4",
          description: "average_snr gives each station's mean to 1 decimal",
          assertionCode: py`
def rec(call, snr, valid=True):
    return {"ok": True, "stamp": "s", "call": call, "freq": 1.0, "az": 1.0, "el": 2.0, "snr": snr, "message": "m", "valid": valid}
got = average_snr([rec("KX-204", 10.0), rec("VR-077", 20.0), rec("KX-204", 15.0), rec("KX-204", 11.0), rec("ZZ-999", 99.0, valid=False)])
assert got == {"KX-204": 12.0, "VR-077": 20.0}, f"expected {{'KX-204': 12.0, 'VR-077': 20.0}} but got {got!r}"
got = average_snr([rec("AA-111", 1.0), rec("AA-111", 2.0), rec("AA-111", 2.0)])
assert got == {"AA-111": 1.7}, f"(1+2+2)/3 = 1.666... should round to 1.7 but got {got!r}"
assert average_snr([]) == {}, "no records, no averages"
`,
        },
        {
          id: "t5",
          description: "hot_words counts lower-case words and skips stop words and numbers",
          assertionCode: py`
def rec(message, valid=True):
    return {"ok": True, "stamp": "s", "call": "KX-204", "freq": 1.0, "az": 1.0, "el": 2.0, "snr": 1.0, "message": message, "valid": valid}
recs = [rec("Kepler relay online"), rec("Relay handoff [ack]"), rec("The relay is on band 4"), rec("Beacon 7 nominal"), rec("Beacon 3 NOMINAL"), rec("Ignored relay relay relay", valid=False)]
got = [tuple(p) for p in hot_words(recs, 3)]
assert got == [("relay", 3), ("beacon", 2), ("nominal", 2)], f"expected [('relay', 3), ('beacon', 2), ('nominal', 2)] but got {got!r}"
words = dict(hot_words(recs, 50))
assert "the" not in words and "is" not in words and "on" not in words, "STOP_WORDS must be skipped"
assert "4" not in words and "7" not in words, "only words made of letters count, not digits"
assert "ack" in words, "a tag such as [ack] still contributes the word ack"
assert hot_words([]) == [], "no records, no words"
`,
        },
      ],
      unlocks: ["sl-leaderboard"],
      checks: [
        {
          prompt: "What does `Counter([\"a\", \"b\", \"a\"])[\"z\"]` return?",
          question: { type: "number", answer: 0 },
          explanation: "A `Counter` returns `0` for items it has never seen instead of raising `KeyError`, which is what you want for counts. (It does not add the key either.)",
        },
        {
          prompt: "What is the catch with reading `groups[\"ZZ-999\"]` on a `defaultdict(list)` when that key is absent?",
          question: {
            type: "choice",
            options: [
              "It creates an empty list under that key, so merely looking changes the dictionary",
              "It raises a KeyError",
              "It returns None",
              "It deletes the dictionary",
            ],
            answer: 0,
          },
          explanation: "A `defaultdict` creates the value on any missing access. Use `\"ZZ-999\" in groups` or `groups.get(\"ZZ-999\")` to look without creating, and convert to a plain `dict` before returning.",
        },
        {
          prompt: "You want to count how often each WORD appears in `text`. Which is right?",
          question: { type: "choice", options: ["`Counter(text.split())`", "`Counter(text)`", "`Counter(len(text))`", "`defaultdict(text)`"], answer: 0 },
          explanation: "`Counter(text)` would count individual characters. `text.split()` turns it into a list of words first.",
        },
      ],
    },

    // ───────────────────────── 14 ─────────────────────────
    {
      id: "signal-lab-14-pipeline",
      title: "The whole pipeline",
      minutes: 22,
      xp: 220,
      concepts: ["small functions", "pure functions", "separating logic from output", "composition", "docstrings", "report formatting"],
      learn: md`### Look at what you built

~~~text
raw line  ->  scrub  ->  LINE_RE  ->  to_number  ->  checksum  ->  record
records   ->  good   ->  strongest / top_senders / sky_points / mean_snr
~~~

Nothing in that chain is clever. Each step is a **small function that does one job** and can be tested alone: that is why this course's tests could target them one at a time. The final step is to assemble them into one entry point.

### Habits of tidy programs

1. **One job per function, and a name that says it.** \`scrub\`, \`parse_line\`, \`good\`: verbs and nouns, not \`process\` or \`do_stuff\`. If you need "and" to describe it, split it.
2. **Return data; print at the edges.** Logic functions return values (dicts, lists, numbers). Only the outermost layer formats text and prints. That is why \`summarize\` returns a dict and a separate \`format_report\` turns it into text: the dashboard can use the dict, the terminal can use the text.
3. **Prefer pure functions.** Same input, same output, no hidden globals, no changing the arguments. They are trivial to test and to reuse.
4. **Name your constants.** \`MAX_PATTERN\`, \`STOP_WORDS\`, \`NOISE\` instead of bare numbers and strings scattered through the code.
5. **Handle the failure at the boundary.** \`parse_record\` turns bad input into a clear record once, so everything after it can assume clean data.
6. **Write the why, not the what.** A docstring states the purpose and surprises; the code already says what it does.

~~~python
def good(records):
    """Records that parsed AND passed their checksum. Everything downstream trusts these."""
    return [r for r in records if r["ok"] and r["valid"]]
~~~

### Report formatting

Format with specs instead of manual padding, and compute the numbers first:

~~~python
rate = decoded / total if total else 0.0       # guard the division
f"{'decoded':<11}: {decoded} ({rate:.1%})"      # 'decoded    : 3 (60.0%)'
f"{' TITLE ':=^30}"                              # '============ TITLE ============'
~~~

(Notice the different quotes: inside an f-string delimited by \`"\`, the dictionary key or text uses \`'\`.)

A useful sanity check on any report: the parts must add up to the whole. Here \`total == decoded + malformed + corrupt\`.

### Where to go from here

Try refactoring \`parse_all\` into a one-line list comprehension, then run the tests: if they still pass, you changed the structure without changing the behaviour. That safety net is the whole point of small, tested functions. The next projects build on this: handling errors properly, reading JSON and files, then classes and design patterns.

### Common mistakes

- One giant function that parses, counts and prints.
- \`print\` inside logic, so nothing can reuse the result.
- Mutating a list that the caller still needs.
- Copy-pasting a block instead of calling a function.
- Skipping the empty-input case: no lines, no records, no division by zero.`,
      mission: md`The last piece is the control-room summary: one call turns a pile of raw lines into totals and a printable report, using only the functions you already wrote.

When it passes, the **Mission report** panel shows your \`format_report\` output for the live feed, and the whole radio console is running on code you wrote.`,
      tasks: [
        "banner(title, width=34): the upper-cased title with a space either side, centred in width columns and padded with = signs",
        "summarize(lines): parse everything and return a dict with total, decoded, malformed, corrupt, stations, top_sender, loudest and mean_snr",
        "format_report(summary): return the multi-line report text (banner, then one aligned label: value row per figure); it must cope with zero lines",
        "End the file by printing format_report(summarize(SAMPLE_FEED))",
      ],
      starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 14: the whole pipeline. Compose the functions you already have.

def banner(title, width=34):
    # banner("signal lab", 20) -> "==== SIGNAL LAB ===="
    ...

def summarize(lines):
    # Run the whole pipeline on raw lines and return a plain dict:
    #   total      how many lines
    #   decoded    good records (parsed AND checksum valid)
    #   malformed  lines that did not parse
    #   corrupt    parsed but failed the checksum
    #   stations   how many different stations among the good records
    #   top_sender call sign with the most good messages, or None
    #   loudest    call sign of the strongest good record, or None
    #   mean_snr   average snr of the good records (0.0 if none)
    ...

def format_report(summary):
    # Return text such as:
    #   ======= SIGNAL LAB REPORT ========
    #   lines      : 8
    #   decoded    : 4 (50.0%)
    #   malformed  : 3
    #   corrupt    : 1
    #   stations   : 3
    #   top sender : KX-204
    #   loudest    : VR-077
    #   mean SNR   : +21.5 dB
    # Zero lines must not crash (use 0.0 for the rate); a missing sender or loudest shows "-".
    ...

# Finally, print the report for SAMPLE_FEED (from lesson 10):
`,
      solutionAdd: py`def banner(title, width=34):
    text = f" {title.upper()} "
    return f"{text:=^{width}}"

def summarize(lines):
    """Run the whole pipeline over raw lines and return plain totals."""
    records = parse_all(lines)
    decoded = good(records)
    malformed = [r for r in records if not r["ok"]]
    top = top_senders(records, 1)
    best = loudest(records)
    return {
        "total": len(records),
        "decoded": len(decoded),
        "malformed": len(malformed),
        "corrupt": len(records) - len(decoded) - len(malformed),
        "stations": len(unique_calls(records)),
        "top_sender": top[0][0] if top else None,
        "loudest": best["call"] if best else None,
        "mean_snr": mean_snr(records),
    }

def format_report(summary):
    total = summary["total"]
    rate = summary["decoded"] / total if total else 0.0
    rows = [
        ("lines", summary["total"]),
        ("decoded", f"{summary['decoded']} ({rate:.1%})"),
        ("malformed", summary["malformed"]),
        ("corrupt", summary["corrupt"]),
        ("stations", summary["stations"]),
        ("top sender", summary["top_sender"] or "-"),
        ("loudest", summary["loudest"] or "-"),
        ("mean SNR", f"{summary['mean_snr']:+.1f} dB"),
    ]
    lines = [banner("Signal Lab report")]
    for label, value in rows:
        lines.append(f"{label:<11}: {value}")
    return "\n".join(lines)

print(format_report(summarize(SAMPLE_FEED)))`,
      explanation:
        "Nothing here is new machinery: summarize calls parse_all once and then asks the small functions you wrote for each figure, so every number has exactly one definition. corrupt is derived by subtraction, which also guarantees that total = decoded + malformed + corrupt. format_report only formats: the rate is computed with a guard, the figures are a list of (label, value) pairs so that one loop lays them out with the same alignment spec, and a missing sender becomes '-' with the 'or' trick. banner reuses a nested format spec, where the width itself is a variable.",
      hints: [
        { id: "h1", title: "banner", content: "Build the padded text first: text = f\" {title.upper()} \". Then centre it with fill: f\"{text:=^{width}}\" (= is the fill, ^ is centre, and the width comes from a nested {width})." },
        { id: "h2", title: "summarize", content: "records = parse_all(lines); decoded = good(records); malformed is the records whose \"ok\" is False. corrupt = len(records) - len(decoded) - len(malformed). Use top_senders(records, 1), loudest(records), unique_calls(records) and mean_snr(records)." },
        { id: "h3", title: "format_report", content: "rate = summary[\"decoded\"] / total if total else 0.0. Build a list of (label, value) rows, then lines.append(f\"{label:<11}: {value}\") for each. Join with \"\\n\". Finish the file with print(format_report(summarize(SAMPLE_FEED)))." },
      ],
      tests: [
        {
          id: "t1",
          description: "banner centres the upper-cased title between = signs",
          assertionCode: py`
assert banner("signal lab", 20) == "==== SIGNAL LAB ====", f"banner('signal lab', 20) should be '==== SIGNAL LAB ====' but is {banner('signal lab', 20)!r}"
got = banner("Report", 30)
assert len(got) == 30 and " REPORT " in got and got.startswith("=") and got.endswith("="), f"a width of 30 should give a 30-character line with ' REPORT ' in the middle: {got!r}"
assert len(banner("x")) == 34, "the default width is 34"
`,
        },
        {
          id: "t2",
          description: "summarize totals add up and name the stars of the feed",
          assertionCode: py`
lines = [
    '2087-03-14T02:17:45Z  ~^~  kx-204 @ 1420.405mhz  az=047.5 el=+32.0  snr=18.2dB  "Kepler relay online"  #45 ~^~  ',
    '2087-03-14T02:17:48Z\t^^  VR-077@1421.200MHZ\taz=134.8   EL=+57.0  SNR=26.8 dB "Beacon 3 nominal"\t#a9 ^^\r\n',
    '2087-03-14T02:17:51Z  ~^~ ### CARRIER LOST ### ~^~ ',
    '2087-03-14T02:17:54Z ~~ nb-310 @ 1419.850mhz az=210.8 el=+19.3 snr=6.0db "Telemetry burst [ack]" #FF ~~',
]
got = summarize(lines)
assert isinstance(got, dict), "summarize should return a dict"
want = {"total": 4, "decoded": 2, "malformed": 1, "corrupt": 1, "stations": 2, "top_sender": "KX-204", "loudest": "VR-077", "mean_snr": 22.5}
for key, value in want.items():
    assert got.get(key) == value, f"summary[{key!r}] should be {value!r} but is {got.get(key)!r}"
assert got["total"] == got["decoded"] + got["malformed"] + got["corrupt"], "the parts must add up to the total"
`,
        },
        {
          id: "t3",
          description: "summarize copes with an empty feed",
          assertionCode: py`
got = summarize([])
want = {"total": 0, "decoded": 0, "malformed": 0, "corrupt": 0, "stations": 0, "top_sender": None, "loudest": None, "mean_snr": 0.0}
for key, value in want.items():
    assert got.get(key) == value, f"for an empty feed summary[{key!r}] should be {value!r} but is {got.get(key)!r}"
`,
        },
        {
          id: "t4",
          description: "format_report lays out every figure",
          assertionCode: py`
summary = {"total": 4, "decoded": 2, "malformed": 1, "corrupt": 1, "stations": 2, "top_sender": "KX-204", "loudest": "VR-077", "mean_snr": 22.5}
text = format_report(summary)
assert isinstance(text, str), "format_report should return a string, not print it"
assert "SIGNAL LAB REPORT" in text, "the report starts with the banner"
for want in ["lines", "decoded", "50.0%", "malformed", "corrupt", "stations", "KX-204", "VR-077", "+22.5 dB"]:
    assert want in text, f"the report should contain {want!r}. Got:\n{text}"
assert len(text.splitlines()) == 9, f"expected a banner plus 8 rows (9 lines) but got {len(text.splitlines())}"
`,
        },
        {
          id: "t5",
          description: "format_report handles zero lines and missing stations",
          assertionCode: py`
empty = {"total": 0, "decoded": 0, "malformed": 0, "corrupt": 0, "stations": 0, "top_sender": None, "loudest": None, "mean_snr": 0.0}
text = format_report(empty)
assert "0.0%" in text, "with zero lines the rate is 0.0%, not a ZeroDivisionError"
assert text.count("-") >= 2 and "None" not in text, "a missing top sender or loudest station should be shown as '-', not 'None'"
`,
        },
        {
          id: "t6",
          description: "the file prints the finished report",
          assertionCode: py`
assert "SIGNAL LAB REPORT" in __stdout__, "end your file with print(format_report(summarize(SAMPLE_FEED))) so the report appears in the console"
assert "decoded" in __stdout__ and "mean SNR" in __stdout__, "the printed report should show the decoded and mean SNR rows"
`,
        },
      ],
      unlocks: ["sl-report"],
      checks: [
        {
          prompt: "Why does `summarize` return a dict and leave the text to `format_report`?",
          question: {
            type: "choice",
            options: [
              "The numbers can be reused by other code (like a dashboard) and the formatting can change without touching the logic",
              "Dicts are faster than strings",
              "Python forbids printing inside functions",
              "format_report would not work otherwise",
            ],
            answer: 0,
          },
          explanation: "Separating logic from presentation keeps each part simple and reusable. A function that only returns data is also much easier to test.",
        },
        {
          prompt: "Which change makes a function \"more pure\"?",
          question: {
            type: "choice",
            options: [
              "Return a new list instead of sorting the argument in place",
              "Add a global counter of calls",
              "Print the result as well as returning it",
              "Read the current time inside it",
            ],
            answer: 0,
          },
          explanation: "A pure function's result depends only on its arguments and it changes nothing else. Mutating the caller's list, using globals, printing or reading the clock all break that.",
        },
        {
          prompt: "Our report guarantees `total == decoded + malformed + corrupt`. Why is that a useful property?",
          question: {
            type: "choice",
            options: [
              "It is a built-in sanity check: if the parts don't add up, a line was lost or counted twice",
              "It makes the report shorter",
              "It is required by the f-string syntax",
              "It speeds up parsing",
            ],
            answer: 0,
          },
          explanation: "Invariants such as 'the parts sum to the whole' catch classification bugs immediately. You can assert them in tests.",
        },
      ],
    },
  ],
};
