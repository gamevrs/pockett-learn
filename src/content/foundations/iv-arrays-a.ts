import type { ConceptLesson } from "../../learn/types.ts";

/** Fenced Python block for lesson prose. */
const py = (code: string) => "~~~python\n" + code.trim() + "\n~~~";
/** Fenced plain-text block (diagrams, tables). */
const txt = (code: string) => "~~~text\n" + code.replace(/^\n+|\s+$/g, "") + "\n~~~";

const CLIMB_CODE = ["low, best = alts[0], 0", "for a in alts[1:]:", "    best = max(best, a - low)", "    low = min(low, a)", "return best"];
const ALTS = [12, 9, 14, 7, 11, 16, 10];

const MIRROR_CODE = [
  "lo, hi = 0, len(s) - 1",
  "while lo < hi:",
  "    while lo < hi and not s[lo].isalnum(): lo += 1",
  "    while lo < hi and not s[hi].isalnum(): hi -= 1",
  "    if s[lo].lower() != s[hi].lower(): return False",
  "    lo, hi = lo + 1, hi - 1",
  "return True",
];
const MIRROR = ["a", ",", "␣", "b", ":", "␣", "B", "A"];

const PAIR_CODE = ["seen = {}", "for j, p in enumerate(prices):", "    if budget - p in seen:", "        return (seen[budget - p], j)", "    if p not in seen: seen[p] = j", "return None"];
const PRICES = [8, 3, 11, 5, 9, 7];

const SPELL_CODE = ["count = Counter(tiles)", "for ch in word:", "    count[ch] -= 1", "    if count[ch] < 0: return False", "return True"];
const WORD = ["t", "e", "e", "t", "h"];

export const ivArraysLessonsA: ConceptLesson[] = [
  // ─────────────────────────────── 1. Array ───────────────────────────────
  {
    id: "fnd-iv-arrays-1-array",
    title: "Arrays: one pass, a running answer",
    summary: "Carry a little state through a single scan, and rearrange in place without extra lists.",
    minutes: 10,
    xp: 60,
    level: "Beginner",
    steps: [
      {
        kind: "explain",
        title: "What an array problem is really asking",
        body: "An **array** gives you any index in O(1), adding at the end in O(1), and inserting or deleting in the middle in O(n), because everything after the spot shifts. (The *Data structures and algorithms* module has the basics.)\n\nMost interview array problems have a brute force that checks every pair: two nested loops, O(n²). The better answer is usually **one pass** from left to right that carries a small amount of state: the best answer so far, the smallest value so far, a count. The question to ask is:\n\n> What do I need to remember about everything to my left, so I never have to look back?\n\n**How to spot it:** the problem says *subarray*, *contiguous*, *in place*, *O(1) extra space*, or *earlier day / later day*. The input is a plain list and n can be large (10⁵ or more), so O(n²) is too slow.",
      },
      {
        kind: "question",
        title: "The biggest climb",
        body: "A hiker logs the altitude once a day. What's the biggest climb from one day to any **later** day? For each day, the best climb that ends today is *today minus the lowest point so far*. Step through it and answer the pick.",
        widget: {
          type: "iv-trace",
          props: {
            title: "Biggest climb in an altitude log",
            frames: [
              { array: ALTS, pointers: { i: 0 }, highlight: [0], code: CLIMB_CODE, line: 1, vars: { low: 12, best: 0 }, note: "Start: the lowest point so far is day 0, and no climb yet." },
              { pointers: { i: 1 }, highlight: [1], line: 4, vars: { low: 9, best: 0 }, note: "Day 1: `9 - 12` is a drop, so `best` stays 0. 9 is the new low." },
              { pointers: { i: 2 }, highlight: [1, 2], line: 3, vars: { low: 9, best: 5 }, note: "Day 2: `14 - 9 = 5`. A new best." },
              { pointers: { i: 3 }, highlight: [3], line: 4, vars: { low: 7, best: 5 }, note: "Day 3: a drop again; 7 is the new low." },
              { pointers: { i: 4 }, highlight: [3, 4], line: 3, vars: { low: 7, best: 5 }, note: "Day 4: `11 - 7 = 4`, not better than 5." },
              { pointers: { i: 5 }, highlight: [5], line: 3, vars: { low: 7, best: 5 }, note: "Day 5 reaches 16, the highest yet.", pick: { prompt: "The best climb to 16 starts at the lowest point so far. Tap that day.", answer: 3 } },
              { pointers: { i: 5 }, highlight: [3, 5], range: [3, 5], line: 3, vars: { low: 7, best: 9 }, note: "`16 - 7 = 9`: the new best." },
              { pointers: { i: 6 }, highlight: [6], done: [0, 1, 2, 3, 4, 5], line: 5, vars: { low: 7, best: 9 }, note: "Day 6: `10 - 7 = 3`. Done: the answer is **9**, one pass, two variables." },
            ],
          },
        },
        question: { type: "widget", goal: { picked: true }, prompt: "Answer the pick.", hint: "The climb has to start on an earlier day, and the lowest earlier point gives the biggest difference." },
        explanation: "Day 3 (altitude 7) is the lowest point before day 5, so the climb is 16 − 7 = 9. Remembering only `low` and `best` replaces checking all n(n − 1)/2 pairs.",
      },
      {
        kind: "question",
        title: "Run it in your head",
        body: "Apply the same two variables to the log `[5, 3, 8, 1, 6, 2]`. Find the biggest climb.",
        question: { type: "number", answer: 5, hint: "Track the lowest point so far, and at each day compare today minus that low with the best." },
        explanation: "Low 5, then 3; at 8 the climb is 8 − 3 = 5. Low drops to 1; at 6 the climb is 6 − 1 = 5 again, a tie. The answer is **5**. Two different climbs give it, but you only need the size.",
      },
      {
        kind: "question",
        title: "The hidden second loop",
        body: "Your loop looks like one pass, but one line inside it makes the whole thing O(n²) on a big list. Which one?",
        question: {
          type: "choice",
          options: ["`best = max(best, a - low)`", "`if a in seen:` (seen is a list)", "`low = min(low, a)`", "`x = alts[i]` (any index)"],
          answer: 1,
          feedback: { 0: "`max` of two numbers is one step.", 2: "`min` of two numbers is one step.", 3: "Indexing an array is O(1)." },
          hint: "Look for a line that has to walk through a whole list each time it runs.",
        },
        explanation: "`in` on a **list** scans it from the start, O(n), so doing it once per item costs O(n²). Use a `set` for membership (O(1) on average), as the hash table lesson shows.",
      },
      {
        kind: "explain",
        title: "Rearranging in place",
        body: "Some problems say **in place**: change the list you were given, with O(1) extra memory, instead of building a new one. The workhorse is the **swap**, and the classic trick is **reversal**.\n\nTo rotate a list right by `k` (every item moves k places right, the last ones wrap round to the front), reverse three times:\n\n" +
          txt(`
start, k = 3          1 2 3 4 5 6 7
reverse everything    7 6 5 4 3 2 1
reverse first k       5 6 7 4 3 2 1
reverse the rest      5 6 7 1 2 3 4
`) +
          "\nEach reversal is a loop that swaps the two ends and walks inwards:\n\n" +
          py(`
def reverse(nums, lo, hi):        # inclusive bounds
    while lo < hi:
        nums[lo], nums[hi] = nums[hi], nums[lo]
        lo, hi = lo + 1, hi - 1
`) +
          "\n**Pitfalls:** `k` can be bigger than the length, so use `k % n` first, and `n` can be 0, so check that before dividing. Writing `nums = nums[-k:] + nums[:-k]` inside a function makes a *new* list and leaves the caller's list unchanged.",
      },
      {
        kind: "question",
        title: "The middle reversal",
        body: "Rotating `[1, 2, 3, 4, 5]` right by 2: after reversing everything you have `[5, 4, 3, 2, 1]`. What does the list look like after you reverse the **first 2** items?",
        question: { type: "choice", options: ["`[5, 4, 1, 2, 3]`", "`[1, 2, 3, 4, 5]`", "`[4, 5, 3, 2, 1]`", "`[3, 4, 5, 1, 2]`"], answer: 2, feedback: { 0: "That reverses the last three items, which is the third step.", 3: "That rotates the other way: right by 2 should end as [4, 5, 1, 2, 3]." }, hint: "Only positions 0 and 1 change: swap them." },
        explanation: "Reversing the first two turns `5, 4` into `4, 5`: **[4, 5, 3, 2, 1]**. Reversing the remaining three then gives `[4, 5, 1, 2, 3]`, the list rotated right by 2.",
      },
      {
        kind: "code",
        title: "Biggest climb",
        body: "Write `biggest_climb(alts)`: the largest `alts[j] - alts[i]` with `i < j`, or `0` if the log never climbs (or has fewer than two days). Altitudes can be negative (below sea level). Logs can hold 30,000 days, so checking every pair is too slow.",
        language: "python",
        starter: `def biggest_climb(alts):
    # one pass: remember the lowest point so far and the best climb so far
    pass
`,
        solution: `def biggest_climb(alts):
    if not alts:
        return 0
    low, best = alts[0], 0
    for a in alts[1:]:
        best = max(best, a - low)
        low = min(low, a)
    return best
`,
        tests: [
          { id: "t1", description: "The example log", assertionCode: `_r = biggest_climb([12, 9, 14, 7, 11, 16, 10])\nassert _r == 9, f"expected 9 (from 7 up to 16), got {_r}"` },
          { id: "t2", description: "A log that only goes down", assertionCode: `_r = biggest_climb([9, 7, 4, 1])\nassert _r == 0, f"a log that never climbs should give 0, got {_r}"` },
          { id: "t3", description: "One day, or none", assertionCode: `_r = biggest_climb([5])\nassert _r == 0, f"one day has no climb: expected 0, got {_r}"\n_r = biggest_climb([])\nassert _r == 0, f"an empty log should give 0, got {_r}"` },
          { id: "t4", description: "Below sea level", assertionCode: `_r = biggest_climb([-5, -12, -3])\nassert _r == 9, f"expected 9 (from -12 up to -3), got {_r}"` },
          { id: "t5", description: "30,000 days in one pass", assertionCode: `_alts = list(range(30000, 0, -1)) + [50000]\n_r = biggest_climb(_alts)\nassert _r == 49999, f"expected 49999 (from 1 up to 50000), got {_r}"` },
        ],
        hints: ["Start with `low = alts[0]` and `best = 0`, and guard the empty list first.", "For each later altitude `a`: update `best` with `a - low` first, then update `low`."],
      },
      {
        kind: "code",
        title: "Rotate a playlist in place",
        body: "Write `rotate(nums, k)`: move every item `k` places to the right, wrapping round, by changing `nums` **itself** (return nothing). `k` can be larger than the list, and the list can be empty. Use the three reversals.",
        language: "python",
        starter: `def rotate(nums, k):
    # change nums itself: three reversals
    pass
`,
        solution: `def rotate(nums, k):
    n = len(nums)
    if n == 0:
        return
    k %= n

    def reverse(lo, hi):
        while lo < hi:
            nums[lo], nums[hi] = nums[hi], nums[lo]
            lo, hi = lo + 1, hi - 1

    reverse(0, n - 1)
    reverse(0, k - 1)
    reverse(k, n - 1)
`,
        tests: [
          { id: "t1", description: "Rotate 7 songs by 3", assertionCode: `_a = [1, 2, 3, 4, 5, 6, 7]\nrotate(_a, 3)\nassert _a == [5, 6, 7, 1, 2, 3, 4], f"expected [5, 6, 7, 1, 2, 3, 4], got {_a}: change the list you were given, don't build a new one"` },
          { id: "t2", description: "k bigger than the list", assertionCode: `_a = ["x", "y", "z"]\nrotate(_a, 4)\nassert _a == ["z", "x", "y"], f"rotating 3 items by 4 is the same as by 1: expected ['z', 'x', 'y'], got {_a}"` },
          { id: "t3", description: "Full turns are skipped", assertionCode: `_a = [4, 5, 6]\nrotate(_a, 7)\nassert _a == [6, 4, 5], f"7 = two full turns + 1: expected [6, 4, 5], got {_a}"\nrotate(_a, 0)\nassert _a == [6, 4, 5], f"k = 0 should change nothing, got {_a}"` },
          { id: "t4", description: "Empty and tiny lists", assertionCode: `_a = []\nrotate(_a, 5)\nassert _a == [], f"expected [], got {_a}: check n before k % n"\n_a = [1, 2]\nrotate(_a, 1)\nassert _a == [2, 1], f"rotating [1, 2] by 1 gives [2, 1], got {_a}"` },
        ],
        hints: ["Work out `n = len(nums)`, return early if it is 0, then `k %= n`.", "Write a small `reverse(lo, hi)` that swaps ends and walks inwards, and call it on the whole list, then on `0..k-1`, then on `k..n-1`."],
      },
      {
        kind: "recap",
        points: [
          "Look for **one pass with a running answer**: ask what you must remember about the items to your left.",
          "The biggest later-minus-earlier difference only needs `low` and `best`: O(n) time, O(1) space.",
          "`x in some_list` inside a loop quietly makes it O(n²); use a set.",
          "**In place** means change the given list with O(1) extra memory: swaps and reversals. Rotate right by k = reverse all, reverse first k, reverse the rest.",
          "Edge cases to test every time: empty list, one item, all decreasing, negatives, k ≥ n.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 2. String ───────────────────────────────
  {
    id: "fnd-iv-arrays-2-string",
    title: "Strings: characters, builders and mirrors",
    summary: "Strings as arrays of characters, building them cheaply, and checking from both ends.",
    minutes: 9,
    xp: 60,
    level: "Beginner",
    steps: [
      {
        kind: "explain",
        title: "A string is an array you can't change",
        body: "A **string** is an array of characters: `s[i]` is O(1) and `len(s)` is O(1). In Python (and Java, JavaScript, C#) strings are **immutable**: `s + t` builds a brand new string, copying every character. So:\n\n- comparing two strings or slicing `s[a:b]` costs O(length), not O(1);\n- building a long result with `out += piece` in a loop *can* cost O(n²) in total. Collect the pieces in a list and `\"\".join(parts)` once at the end: O(n).\n\nUseful tools: `ch.isalnum()` (letter or digit), `ch.lower()`, and `ord(ch) - ord(\"a\")`, which turns `a`…`z` into 0…25 so a letter can index a list of 26 counters.\n\n**How to spot it:** *palindrome*, *ignoring case and punctuation*, *reverse the words*, *compress*, *encode*. Ask whether you can work from both ends at once, and whether you are copying strings inside a loop.",
      },
      {
        kind: "question",
        title: "Does it read the same backwards?",
        body: "Check `\"a, b: BA\"` reads the same backwards, ignoring case and anything that isn't a letter or digit. Two indexes start at the ends, skip junk, and compare. (`␣` is a space.) Answer the picks as you go.",
        widget: {
          type: "iv-trace",
          props: {
            title: "Mirror check from both ends",
            frames: [
              { array: MIRROR, pointers: { lo: 0, hi: 7 }, highlight: [0, 7], code: MIRROR_CODE, line: 5, note: "`a` and `A` match once both are lower case." },
              { pointers: { lo: 1, hi: 6 }, highlight: [1], line: 3, note: "Both move in. `lo` lands on a comma, which doesn't count.", pick: { prompt: "`lo` skips characters that aren't letters or digits. Where does it stop?", answer: 3 } },
              { pointers: { lo: 3, hi: 6 }, highlight: [3, 6], done: [0, 1, 2, 7], line: 5, note: "`lo` skipped `,` and the space. `b` and `B` match." },
              { pointers: { lo: 4, hi: 5 }, highlight: [4], done: [0, 1, 2, 3, 6, 7], line: 3, note: "Both move in again. `lo` is on `:`.", pick: { prompt: "`lo` skips while `lo < hi`. Where does it stop?", answer: 5 } },
              { pointers: { lo: 5, hi: 5 }, done: [0, 1, 2, 3, 4, 6, 7], line: 7, note: "`lo` met `hi`. A character always matches itself, so nothing can fail now: it **is** a mirror." },
            ],
          },
        },
        question: { type: "widget", goal: { picked: true }, prompt: "Answer both picks.", hint: "Skip every character that isn't a letter or digit, but never let `lo` pass `hi`." },
        explanation: "Working from both ends uses O(1) extra space. Building a cleaned copy (`\"abba\"`) and comparing it with its reverse also works, but uses O(n) memory.",
      },
      {
        kind: "question",
        title: "Letters as numbers",
        body: "To count letters in a list of 26 slots, you turn a letter into an index with `ord(ch) - ord(\"a\")`. Find the index for `\"d\"`.",
        question: { type: "number", answer: 3, hint: "`a` is index 0 and each next letter is one more." },
        explanation: "`ord(\"d\") - ord(\"a\")` is 100 − 97 = **3**. The character codes of `a` to `z` are consecutive, so the subtraction works for every lower-case letter.",
      },
      {
        kind: "question",
        title: "Building the answer",
        body: "You build a 100,000-character result one piece at a time. Why collect the pieces in a list and call `\"\".join(parts)` once?",
        question: {
          type: "choice",
          options: ["`join` sorts the pieces, which `+=` does not.", "Lists use less memory than strings do.", "`+=` changes the original string in place.", "Each `+=` may copy the whole string so far."],
          answer: 3,
          feedback: { 0: "`join` keeps the pieces in order; it never sorts.", 2: "Strings are immutable: `+=` makes a new string." },
          hint: "Strings can't change. Think about what `out = out + piece` has to create every time.",
        },
        explanation: "Because strings are immutable, `out + piece` builds a new string and copies everything so far. Over n pieces that adds up to about n²/2 copies. `join` measures the total length once and copies each character once: O(n). (CPython sometimes optimises `+=`, but don't rely on it, and other languages don't.)",
      },
      {
        kind: "code",
        title: "Mirror check",
        body: "Write `is_mirror(s)`: True when `s` reads the same forwards and backwards once you ignore case and every character that isn't a letter or digit. Use two indexes, no cleaned copy.",
        language: "python",
        starter: `def is_mirror(s):
    lo, hi = 0, len(s) - 1
    # skip junk from both ends, compare lower-case letters, walk inwards
    pass
`,
        solution: `def is_mirror(s):
    lo, hi = 0, len(s) - 1
    while lo < hi:
        while lo < hi and not s[lo].isalnum():
            lo += 1
        while lo < hi and not s[hi].isalnum():
            hi -= 1
        if s[lo].lower() != s[hi].lower():
            return False
        lo, hi = lo + 1, hi - 1
    return True
`,
        tests: [
          { id: "t1", description: "The traced example", assertionCode: `_r = is_mirror("a, b: BA")\nassert _r is True, f"'a, b: BA' is a mirror once junk is skipped, got {_r}"` },
          { id: "t2", description: "One letter makes the difference", assertionCode: `_r = is_mirror("Top spot")\nassert _r is True, f"'topspot' reads the same both ways: expected True, got {_r}"\n_r = is_mirror("Top spots!")\nassert _r is False, f"'topspots' reversed is 'stopspot': expected False, got {_r}"` },
          { id: "t3", description: "Empty and junk-only strings", assertionCode: `assert is_mirror("") is True, "an empty string is a mirror"\nassert is_mirror(".,! ?") is True, "a string with no letters or digits is a mirror"` },
          { id: "t4", description: "Digits count, and differ from letters", assertionCode: `_r = is_mirror("0P")\nassert _r is False, f"'0' and 'p' are different characters: expected False, got {_r}"\nassert is_mirror("1 2 1") is True, "'121' is a mirror"` },
          { id: "t5", description: "A longer sentence", assertionCode: `assert is_mirror("Step on no pets!") is True, "'steponnopets' reads the same both ways"` },
        ],
        hints: ["Inside `while lo < hi`, first move `lo` right and `hi` left past characters where `isalnum()` is False.", "Compare `s[lo].lower()` with `s[hi].lower()`; if they differ return False, otherwise step both inwards."],
      },
      {
        kind: "code",
        title: "Squash repeats",
        body: "A sign printer saves ink by writing each run of repeated characters once, followed by the run length, but only when the run is longer than 1. Write `squash(s)`:\n\n" +
          py(`
squash("aaabcc")      # "a3bc2"
squash("abc")         # "abc"
squash("z" * 12)      # "z12"
`) +
          "\nBuild the result with a list and `join`.",
        language: "python",
        starter: `def squash(s):
    parts = []
    # walk the runs; add the character, then the length if it is above 1
    return "".join(parts)
`,
        solution: `def squash(s):
    parts = []
    i = 0
    while i < len(s):
        j = i
        while j < len(s) and s[j] == s[i]:
            j += 1
        parts.append(s[i])
        if j - i > 1:
            parts.append(str(j - i))
        i = j
    return "".join(parts)
`,
        tests: [
          { id: "t1", description: "Mixed runs", assertionCode: `_r = squash("aaabcc")\nassert _r == "a3bc2", f"expected 'a3bc2', got {_r!r}"` },
          { id: "t2", description: "No repeats stay as they are", assertionCode: `_r = squash("abc")\nassert _r == "abc", f"runs of 1 get no number: expected 'abc', got {_r!r}"` },
          { id: "t3", description: "A run of 12 needs two digits", assertionCode: `_r = squash("z" * 12)\nassert _r == "z12", f"expected 'z12', got {_r!r}"` },
          { id: "t4", description: "Empty string, and the last run", assertionCode: `assert squash("") == "", "squash('') should be ''"\n_r = squash("abbb")\nassert _r == "ab3", f"don't forget the run at the very end: expected 'ab3', got {_r!r}"` },
          { id: "t5", description: "The same letter in separate runs", assertionCode: `_r = squash("aabaa")\nassert _r == "a2ba2", f"runs only count neighbours: expected 'a2ba2', got {_r!r}"` },
        ],
        hints: ["Use `i` for the start of a run and move `j` forward while `s[j] == s[i]`; the run length is `j - i`.", "After handling a run, jump `i = j`. That way the final run is handled inside the loop too."],
      },
      {
        kind: "recap",
        points: [
          "A string is an **immutable** array of characters: indexing is O(1), but slicing, comparing and `+` copy, O(length).",
          "Build results in a list and `\"\".join` once; repeated `+=` can be O(n²).",
          "Two indexes from both ends check mirrors in O(n) time and O(1) space. Skip junk, but never let them cross.",
          "`ord(ch) - ord(\"a\")` maps letters to 0–25 for counting.",
          "Test empty strings, junk-only strings, digits next to letters, and the last run.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 3. Hash Table ───────────────────────────────
  {
    id: "fnd-iv-arrays-3-hash-table",
    title: "Hash tables: remember what you've seen",
    summary: "Trade memory for time: look up complements, duplicates and runs in O(1) each.",
    minutes: 11,
    xp: 70,
    level: "Beginner",
    steps: [
      {
        kind: "explain",
        title: "Ask the table, not the list",
        body: "A **hash table** (Python's `dict` and `set`) adds and finds a key in O(1) time on average. (See *Hash maps* in *Data structures and algorithms* for how hashing works.) In interviews it is the most common way to turn an O(n²) pair search into O(n).\n\nThe pattern: walk the list once, and for each item **ask the table about something you saw earlier**, then record the current item.\n\n- *Is there an earlier item that completes me?* Store values → index, look up `target - x`.\n- *Have I seen this before?* A set of values.\n- *Which items belong together?* A dict from a key (sorted letters, a remainder) → list of items.\n\n**How to spot it:** *find two that…*, *any duplicate*, *first repeat*, *group*, an **unsorted** input, and an O(n) target.\n\n**Pitfalls:** keys must be hashable (a `tuple` or string, never a `list`); look up **before** you store, or an item can pair with itself; the worst case is O(n) per lookup when many keys collide, so say \"O(1) on average\".",
      },
      {
        kind: "question",
        title: "Two items, one budget",
        body: "Find two different items in `prices` that cost exactly 16 together. For each price `p`, look up `16 - p` among the earlier ones, then store `p → index`. Answer the pick.",
        widget: {
          type: "iv-trace",
          props: {
            title: "Complement lookup, budget 16",
            frames: [
              { array: PRICES, pointers: { j: 0 }, highlight: [0], code: PAIR_CODE, line: 3, vars: { need: 8, seen: "{}" }, note: "8 needs another 8. The table is empty, so there's no match, even though 8 + 8 = 16: this item can't pair with itself." },
              { pointers: { j: 1 }, highlight: [1], done: [0], line: 5, vars: { need: 13, seen: "{8: 0}" }, note: "3 needs 13: not seen. Store 3." },
              { pointers: { j: 2 }, highlight: [2], done: [0, 1], line: 5, vars: { need: 5, seen: "{8: 0, 3: 1}" }, note: "11 needs 5: not seen. Store 11." },
              { pointers: { j: 3 }, highlight: [3], done: [0, 1, 2], line: 3, vars: { need: 11, seen: "{8: 0, 3: 1, 11: 2}" }, note: "5 needs 11, and 11 is in the table.", pick: { prompt: "Tap the item that 5 pairs with.", answer: 2 } },
              { pointers: { j: 3 }, highlight: [2, 3], line: 4, vars: { need: 11, seen: "{8: 0, 3: 1, 11: 2}" }, note: "Return **(2, 3)**: 11 + 5 = 16, found after 4 lookups instead of comparing every pair." },
            ],
          },
        },
        question: { type: "widget", goal: { picked: true }, prompt: "Answer the pick.", hint: "Look in the `seen` table for the price that 5 needs." },
        explanation: "`seen[11]` is 2, so the pair is (2, 3). Each item costs one lookup and one insert: O(n) time and O(n) memory, instead of O(n²) time.",
      },
      {
        kind: "question",
        title: "Why look before storing?",
        body: "In the loop, you look up `budget - p` **before** adding `p` to the table. What goes wrong if you store first?",
        question: {
          type: "choice",
          options: ["An item can pair with itself, like 8 + 8 = 16.", "The loop becomes O(n²).", "Duplicate prices are lost from the table.", "Nothing: the order of the two lines doesn't matter."],
          answer: 0,
          feedback: { 1: "Both orders do one lookup and one insert per item.", 3: "Try budget 16 with a single 8 in the list." },
          hint: "Imagine the list holds a single 8 and the budget is 16.",
        },
        explanation: "If 8 is stored first, the lookup for `16 - 8` finds that very same 8 and returns a pair of one item. Looking first means the table only ever holds **earlier** items.",
      },
      {
        kind: "question",
        title: "A key that groups",
        body: "You want to group words that use exactly the same letters (`\"listen\"` and `\"silent\"`) in a dict. Which key works?",
        question: {
          type: "choice",
          options: ["`sorted(word)`", "`frozenset(word)`", "`\"\".join(sorted(word))`", "`word.lower()[::-1]`"],
          answer: 2,
          feedback: { 0: "`sorted` returns a list, and a list can't be a dict key: it isn't hashable.", 1: "A set forgets how often each letter appears, so `\"aab\"` and `\"abb\"` would share a key.", 3: "Reversing keeps the letters in their order, so `\"silent\"` and `\"listen\"` still differ." },
          hint: "The key must be the same for both words, different for other words, and hashable.",
        },
        explanation: "Sorting the letters gives the same `\"eilnst\"` for every rearrangement, and joining makes it a hashable string. Sorting costs O(k log k) per word of length k. A tuple of 26 letter counts works too, in O(k).",
      },
      {
        kind: "code",
        title: "Two items, one budget",
        body: "Write `find_pair(prices, budget)`: return a tuple `(i, j)` with `i < j` and `prices[i] + prices[j] == budget`, or `None`. If several pairs work, return the one with the **smallest `j`**, and for that `j` the **smallest `i`**. Lists can hold 50,000 prices, so one pass with a dict.",
        language: "python",
        starter: `def find_pair(prices, budget):
    seen = {}   # price -> index where it first appeared
    pass
`,
        solution: `def find_pair(prices, budget):
    seen = {}
    for j, p in enumerate(prices):
        if budget - p in seen:
            return (seen[budget - p], j)
        if p not in seen:
            seen[p] = j
    return None
`,
        tests: [
          { id: "t1", description: "The traced example", assertionCode: `_r = find_pair([8, 3, 11, 5, 9, 7], 16)\nassert _r is not None and tuple(_r) == (2, 3), f"expected (2, 3), got {_r}"` },
          { id: "t2", description: "Never pair an item with itself", assertionCode: `_r = find_pair([8, 1, 8], 16)\nassert _r is not None and tuple(_r) == (0, 2), f"two different 8s make 16: expected (0, 2), got {_r}"\n_r = find_pair([8, 1, 2], 16)\nassert _r is None, f"one 8 can't be used twice: expected None, got {_r}"\nassert find_pair([], 5) is None, "an empty list has no pair"` },
          { id: "t3", description: "Equal prices can pair", assertionCode: `_r = find_pair([4, 4], 8)\nassert _r is not None and tuple(_r) == (0, 1), f"two different 4s make 8: expected (0, 1), got {_r}"` },
          { id: "t4", description: "Keep the earliest index for repeats", assertionCode: `_r = find_pair([3, 3, 9, 5], 12)\nassert _r is not None and tuple(_r) == (0, 2), f"9 pairs with the first 3: expected (0, 2), got {_r}. Don't overwrite an index that is already stored"` },
          { id: "t5", description: "50,000 prices in one pass", assertionCode: `_p = [2 * i for i in range(50000)] + [1]\n_r = find_pair(_p, 99999)\nassert _r is not None and tuple(_r) == (49999, 50000), f"expected (49999, 50000), got {_r}"` },
        ],
        hints: ["Loop with `for j, p in enumerate(prices)`; if `budget - p` is already a key, you've found `(seen[budget - p], j)`.", "Only store `p` when it isn't already in `seen`, so the earliest index wins."],
      },
      {
        kind: "code",
        title: "Longest run of badge numbers",
        body: "Visitors scanned their badges in random order. Write `longest_streak(nums)`: the length of the longest run of **consecutive integers** among the numbers (like 4, 5, 6, 7), in any order. Repeats count once. Up to 100,000 numbers, so aim for O(n).\n\nPut everything in a set. Only start counting from a number `x` whose `x - 1` is **not** in the set: that's the bottom of a run, so each run is walked once.",
        language: "python",
        starter: `def longest_streak(nums):
    have = set(nums)
    best = 0
    # start only where x - 1 is missing, then walk up x + 1, x + 2, ...
    return best
`,
        solution: `def longest_streak(nums):
    have = set(nums)
    best = 0
    for x in have:
        if x - 1 not in have:
            y = x
            while y + 1 in have:
                y += 1
            best = max(best, y - x + 1)
    return best
`,
        tests: [
          { id: "t1", description: "Two runs, the longer wins", assertionCode: `_r = longest_streak([10, 4, 12, 11, 5, 13, 6, 3, 2])\nassert _r == 5, f"2, 3, 4, 5, 6 is a run of 5 (10..13 is only 4): got {_r}"` },
          { id: "t2", description: "Empty and single", assertionCode: `assert longest_streak([]) == 0, "no numbers: the answer is 0"\nassert longest_streak([42]) == 1, "one number is a run of 1"` },
          { id: "t3", description: "Repeats and negatives", assertionCode: `_r = longest_streak([7, 7, 8, 8])\nassert _r == 2, f"repeats count once: 7, 8 is a run of 2, got {_r}"\n_r = longest_streak([-1, 0, 1, -3])\nassert _r == 3, f"-1, 0, 1 is a run of 3, got {_r}"` },
          { id: "t4", description: "100,000 shuffled numbers", assertionCode: `_n = [(i * 7919) % 100000 for i in range(100000)]\n_r = longest_streak(_n)\nassert _r == 100000, f"0..99999 shuffled is one run of 100000, got {_r}. Only start counting at the bottom of a run"` },
        ],
        hints: ["`if x - 1 not in have:` means x starts a run; otherwise skip it, because the walk from the run's bottom will count it.", "From a start, walk `y` up while `y + 1 in have`; the run length is `y - x + 1`."],
      },
      {
        kind: "recap",
        points: [
          "A **hash table** gives O(1) average lookups: walk once, ask the table about earlier items, then store the current one.",
          "Complement lookup (`target - x`) finds pairs in O(n) time and O(n) memory.",
          "Look **before** you store so an item never pairs with itself; store only the first index if the earliest pair must win.",
          "Group with a hashable key: sorted letters as a string, or a tuple of counts.",
          "With a set, start a walk only at the bottom of a run so the whole scan stays O(n).",
        ],
      },
    ],
  },

  // ─────────────────────────────── 4. Counting ───────────────────────────────
  {
    id: "fnd-iv-arrays-4-counting",
    title: "Counting: tally instead of compare",
    summary: "Counters, 26-slot arrays and majority votes: answer \"enough?\" and \"how many?\" in one pass.",
    minutes: 10,
    xp: 70,
    level: "Intermediate",
    steps: [
      {
        kind: "explain",
        title: "Tallies answer \"enough\"",
        body: "**Counting** means building a tally, value → how many times it appears, and then answering questions with arithmetic on the tally instead of comparing items with each other.\n\n" +
          py(`
from collections import Counter
Counter("banana")            # Counter({'a': 3, 'n': 2, 'b': 1})

counts = [0] * 26            # lower-case letters only
for ch in "banana":
    counts[ord(ch) - ord("a")] += 1
`) +
          "\nTwo words use the same letters exactly when their tallies are equal: that's O(n), better than sorting both, O(n log n). \"Can I build B out of A?\" becomes: count A, then subtract B's letters; if any count drops below zero, no.\n\n**How to spot it:** *anagram*, *rearrange*, *enough letters / pieces*, *most frequent*, *appears more than*. The values come from a small set (letters, digits, colours), so the tally is small.\n\n**Pitfall:** a fixed list of 26 counters breaks on capitals, spaces or accents. Use a `Counter` unless the problem promises lower-case letters.",
      },
      {
        kind: "question",
        title: "Spell it with tiles",
        body: "Can the tiles `theta` spell the word `teeth`? The tally starts at `t:2 h:1 e:1 a:1`. Each letter of the word uses one tile. Predict where it fails.",
        widget: {
          type: "iv-trace",
          props: {
            title: "Spending a tally",
            frames: [
              { array: WORD, code: SPELL_CODE, line: 1, vars: { t: 2, h: 1, e: 1, a: 1 }, note: "The tally of the tiles `theta`. Now spend one tile per letter of `teeth`.", pick: { prompt: "Which letter of the word will be the first one with no tile left?", answer: 2 } },
              { pointers: { ch: 0 }, highlight: [0], line: 3, vars: { t: 1, h: 1, e: 1, a: 1 }, note: "`t` uses one of the two t tiles." },
              { pointers: { ch: 1 }, highlight: [1], done: [0], line: 3, vars: { t: 1, h: 1, e: 0, a: 1 }, note: "`e` uses the only e tile." },
              { pointers: { ch: 2 }, highlight: [2], done: [0, 1], line: 4, vars: { t: 1, h: 1, e: -1, a: 1 }, note: "The second `e` drives the count to **-1**: return False. We never needed to look at the rest." },
            ],
          },
        },
        question: { type: "widget", goal: { picked: true }, prompt: "Answer the pick.", hint: "How many e tiles are there, and how many e's does the word need?" },
        explanation: "The tiles hold one `e` but `teeth` needs two, so the second `e` (index 2) fails. Counting costs O(len(tiles) + len(word)), with no nested loop.",
      },
      {
        kind: "question",
        title: "How many are missing?",
        body: "With tiles `test`, you want to spell `settee`. How many extra tiles do you need?",
        question: { type: "number", answer: 2, hint: "Count each letter in the word, subtract the tiles' counts, and add up only the shortfalls." },
        explanation: "`settee` needs s:1, e:3, t:2. The tiles give t:2, e:1, s:1. Only `e` is short, by **2**. `Counter(word) - Counter(tiles)` computes exactly this (it drops zero and negative counts).",
      },
      {
        kind: "question",
        title: "The cost of an anagram check",
        body: "You compare two lower-case words of length n by filling two lists of 26 counters and comparing the lists. What does it cost?",
        question: {
          type: "choice",
          options: ["O(n log n) time, O(n) space", "O(n²) time, O(1) space", "O(n) time, O(n) space", "O(n) time, O(1) extra space"],
          answer: 3,
          feedback: { 0: "That's the cost of sorting both words.", 2: "The tally has 26 slots however long the words are." },
          hint: "Filling the counters touches each letter once. How big are the counter lists?",
        },
        explanation: "Each letter is counted once: O(n) time. The two lists always have 26 slots, a constant, so the extra space is **O(1)**. For an unbounded alphabet (any Unicode), a `Counter` costs O(k) space for k distinct characters.",
      },
      {
        kind: "code",
        title: "Spell it with tiles",
        body: "Write `can_spell(tiles, word)`: True when every letter of `word` can be taken from `tiles`, each tile used at most once. Both are strings of any characters (treat upper and lower case as different).",
        language: "python",
        starter: `from collections import Counter

def can_spell(tiles, word):
    count = Counter(tiles)
    # spend one tile per letter of word
    pass
`,
        solution: `from collections import Counter

def can_spell(tiles, word):
    count = Counter(tiles)
    for ch in word:
        count[ch] -= 1
        if count[ch] < 0:
            return False
    return True
`,
        tests: [
          { id: "t1", description: "Not enough e tiles", assertionCode: `_r = can_spell("theta", "teeth")\nassert _r is False, f"theta has one e, teeth needs two: expected False, got {_r}"` },
          { id: "t2", description: "Enough of everything", assertionCode: `_r = can_spell("aabbcx", "abcab")\nassert _r is True, f"aabbcx covers abcab: expected True, got {_r}"` },
          { id: "t3", description: "An empty word always works", assertionCode: `assert can_spell("", "") is True, "an empty word needs no tiles"\nassert can_spell("abc", "") is True, "an empty word needs no tiles"` },
          { id: "t4", description: "A letter that isn't there at all", assertionCode: `_r = can_spell("aaaa", "ab")\nassert _r is False, f"there is no b tile: expected False, got {_r}"` },
          { id: "t5", description: "Case matters", assertionCode: `_r = can_spell("abc", "Abc")\nassert _r is False, f"'A' is a different tile from 'a': expected False, got {_r}"` },
        ],
        hints: ["A `Counter` returns 0 for a missing key, so `count[ch] -= 1` works even for letters that were never in the tiles.", "As soon as a count goes below zero, return False; if the loop finishes, return True."],
      },
      {
        kind: "code",
        title: "A clear winner",
        body: "A vote has a **clear winner** when one choice gets **more than half** of all votes. Write `majority(votes)`: that choice, or `None` if nobody has more than half (exactly half is not enough). Votes can be any hashable values.",
        language: "python",
        starter: `from collections import Counter

def majority(votes):
    # count, then check the top count against half the votes
    pass
`,
        solution: `from collections import Counter

def majority(votes):
    if not votes:
        return None
    choice, n = Counter(votes).most_common(1)[0]
    return choice if n * 2 > len(votes) else None
`,
        tests: [
          { id: "t1", description: "A clear winner", assertionCode: `_r = majority([2, 1, 2, 3, 2])\nassert _r == 2, f"2 has 3 of 5 votes: expected 2, got {_r}"` },
          { id: "t2", description: "Exactly half is not a majority", assertionCode: `_r = majority(["red", "red", "blue"])\nassert _r == "red", f"red has 2 of 3 votes: expected 'red', got {_r}"\n_r = majority(["red", "red", "blue", "green"])\nassert _r is None, f"red has 2 of 4, which isn't more than half: expected None, got {_r}"` },
          { id: "t3", description: "One vote, and none", assertionCode: `assert majority(["tea"]) == "tea", "a single vote is a majority"\nassert majority([]) is None, "no votes, no winner"` },
          { id: "t4", description: "The most votes isn't always a majority", assertionCode: `_r = majority([1, 1, 1, 2, 3])\nassert _r == 1, f"1 has 3 of 5 votes: expected 1, got {_r}"\n_r = majority([1, 1, 2, 3, 4])\nassert _r is None, f"1 leads with 2 of 5, but that isn't more than half: expected None, got {_r}"` },
          { id: "t5", description: "A big vote", assertionCode: `_v = ["b"] * 50001 + ["a"] * 50000\n_r = majority(_v)\nassert _r == "b", f"b has 50001 of 100001 votes: expected 'b', got {_r}"` },
        ],
        hints: ["`Counter(votes).most_common(1)` gives `[(choice, count)]` for the top choice; handle an empty list first.", "Compare with `count * 2 > len(votes)` to avoid fractions and to make exactly half fail."],
      },
      {
        kind: "recap",
        points: [
          "**Counting** builds a tally once, then answers with arithmetic: equal tallies mean anagrams, negative counts mean not enough.",
          "A list of 26 counters is O(1) space for lower-case letters; use `Counter` for anything wider.",
          "`Counter(a) - Counter(b)` gives the shortfalls; `most_common(1)` gives the leader.",
          "\"More than half\" is `count * 2 > n`. The leader isn't automatically a majority.",
          "Bonus: the Boyer–Moore vote finds a guaranteed majority in O(1) space by pairing off different votes.",
        ],
      },
    ],
  },
];
