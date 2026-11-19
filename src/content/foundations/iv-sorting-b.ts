import type { ConceptLesson } from "../../learn/types.ts";

/** Fenced Python block for lesson prose. */
const py = (code: string) => "~~~python\n" + code.trim() + "\n~~~";
/** Fenced plain-text block (diagrams, tables). */
const txt = (code: string) => "~~~text\n" + code.replace(/^\n+|\s+$/g, "") + "\n~~~";
/** Paragraphs joined with blank lines. */
const P = (...paras: string[]) => paras.join("\n\n");

// ── shared trace data ──
const RADIX_CODE = ["place = 1", "while place <= max(xs):", "    buckets = [[] for _ in range(10)]", "    for x in xs:", "        buckets[x // place % 10].append(x)", "    xs = [x for b in buckets for x in b]", "    place *= 10"];
const LOWER_CODE = ["lo, hi = 0, len(a)", "while lo < hi:", "    mid = (lo + hi) // 2", "    if a[mid] < x:", "        lo = mid + 1", "    else:", "        hi = mid", "return lo"];
const POWER_CODE = ["def power(b, n):", "    if n == 0: return 1", "    half = power(b, n // 2)", "    if n % 2 == 0: return half * half", "    return half * half * b"];
const POWER_TREE = [
  { id: "p13", label: "3^13" },
  { id: "p6", label: "3^6", parent: "p13" },
  { id: "p3", label: "3^3", parent: "p6" },
  { id: "p1", label: "3^1", parent: "p3" },
  { id: "p0", label: "3^0", parent: "p1" },
];
const SWEEP_CODE = ["events = [(s, +1) for s, e in bookings] + [(e, -1) for s, e in bookings]", "events.sort()          # at equal times, -1 sorts before +1", "now = best = 0", "for t, d in events:", "    now += d", "    best = max(best, now)"];

/** Lessons 6 to 9 of "Sorting, searching and divide and conquer". */
export const ivSortingLessonsB: ConceptLesson[] = [
  // ─────────────────────────────── 6. Radix sort ───────────────────────────────
  {
    id: "fnd-iv-sorting-6-radix-sort",
    title: "Radix sort: one digit at a time",
    summary: "Stable passes from the last digit to the first sort numbers and fixed-length codes in O(d · (n + b)).",
    minutes: 11,
    xp: 70,
    level: "Advanced",
    steps: [
      {
        kind: "explain",
        title: "Least significant digit first",
        body: P(
          "Counting sort needs a small range. **Radix sort** gets around that by sorting on one **digit** at a time, each digit having only 10 possible values (or 256 for a byte, 26 for a letter).",
          "The surprising part is the order: start with the **last** digit (the ones), then the tens, then the hundreds. Each pass must be **stable**. After the pass on the tens, numbers with the same tens digit are still in ones order from the pass before, so they end up sorted by their last two digits. After the final pass they are sorted completely.",
          "With d digits in base b, every pass is a counting or bucket pass of O(n + b), so the total is **O(d · (n + b))**. For 32-bit numbers in base 256 that is 4 passes: linear in n.",
          "**How to spot it:** many integers or fixed-length strings (IDs, dates as `YYYYMMDD`, postcodes), and you need better than n log n, or the problem hints at sorting *digit by digit* or *character by character*.",
          "**Pitfalls:** negative numbers (sort them separately, or offset them), strings of different lengths (pad them, or go most-significant first), and forgetting that a non-stable pass breaks everything.",
        ),
      },
      {
        kind: "question",
        title: "Three passes",
        body: "Step through radix sort on seven numbers. Before each pass, tap the number that will come out **first** (or last, if asked).",
        widget: {
          type: "iv-trace",
          props: {
            title: "Radix sort, base 10",
            frames: [
              { array: [312, 45, 207, 518, 33, 140, 205], code: RADIX_CODE, line: 5, vars: { place: 1 }, note: "Pass 1 groups by the **ones** digit: 2, 5, 7, 8, 3, 0, 5.", pick: { prompt: "Which number comes first after the ones pass?", answer: 5 } },
              { array: [140, 312, 33, 45, 205, 207, 518], done: [0], line: 6, vars: { place: 1 }, note: "Ones digits now run 0, 2, 3, 5, 5, 7, 8. `45` stays before `205`: both end in 5, and 45 came first." },
              { line: 5, vars: { place: 10 }, note: "Pass 2 groups by the **tens** digit: 4, 1, 3, 4, 0, 0, 1.", pick: { prompt: "Which number comes first after the tens pass?", answer: 4 } },
              { array: [205, 207, 312, 518, 33, 140, 45], done: [0], line: 6, vars: { place: 10 }, note: "Within equal tens digits the ones order survived: `205` before `207`, `140` before `45`." },
              { line: 5, vars: { place: 100 }, note: "Pass 3 groups by the **hundreds** digit: 2, 2, 3, 5, 0, 1, 0.", pick: { prompt: "Which number comes **last** after the hundreds pass?", answer: 3 } },
              { array: [33, 45, 140, 205, 207, 312, 518], done: [0, 1, 2, 3, 4, 5, 6], line: 7, vars: { place: 1000 }, note: "Sorted after 3 passes, without comparing two numbers once." },
            ],
          },
        },
        question: { type: "widget", goal: { picked: true }, prompt: "Answer the three picks.", hint: "Look only at the digit for this pass; for ties, keep the order the numbers have now." },
        explanation: "Each pass is a stable bucket pass on one digit. Because ties keep the previous order, after pass p the numbers are sorted by their last p digits.",
      },
      {
        kind: "question",
        title: "Why stable?",
        body: "Why must every pass of radix sort be stable?",
        question: {
          type: "choice",
          options: [
            "Ties must keep the order earlier passes made.",
            "Because unstable sorts are always slower.",
            "So that it uses less memory per pass.",
            "Because each digit can be 0 to 9 only.",
          ],
          answer: 0,
          feedback: { 1: "Speed is not the issue; an unstable pass gives the wrong answer." },
          hint: "On the tens pass, 205 and 207 have the same tens digit. What decides which comes first?",
        },
        explanation: "When two numbers share the current digit, only the earlier passes know which is smaller. A stable pass keeps that order; an unstable one may scramble it, and the final list would be wrong.",
      },
      {
        kind: "question",
        title: "How many passes?",
        body: "You radix sort a million order numbers, each between 0 and 999,999, in base 10. How many passes does it take?",
        question: { type: "number", answer: 6, hint: "One pass per decimal digit of the largest number.", unit: "passes" },
        explanation: "999,999 has **6** digits, so 6 passes of about n + 10 steps each: around 6 million steps, against about 20 million comparisons for an n log n sort.",
      },
      {
        kind: "question",
        title: "The cost",
        body: "n numbers, each with d digits in base b. What does LSD radix sort cost?",
        question: {
          type: "choice",
          options: ["O(n log n), like any good sort", "O(n · b · d), one bucket per item", "O(d · (n + b)) time", "O(n + b), whatever d is"],
          answer: 2,
          hint: "How many passes are there, and what does one counting pass cost?",
        },
        explanation: "d passes, each a counting pass of O(n + b): **O(d · (n + b))**. With d and b fixed (say 32-bit keys, base 256) that is O(n).",
      },
      {
        kind: "code",
        title: "Radix sort",
        body: "Write `radix_sort(nums)` for whole numbers ≥ 0: base 10, least significant digit first, with 10 buckets per pass. Return a new sorted list (no `sorted`, no `.sort()`).",
        language: "python",
        starter: `def radix_sort(nums):
    xs = list(nums)
    # one bucket pass per digit, ones first
    return xs
`,
        solution: `def radix_sort(nums):
    xs = list(nums)
    if not xs:
        return xs
    place, biggest = 1, max(xs)
    while place <= biggest:
        buckets = [[] for _ in range(10)]
        for x in xs:
            buckets[x // place % 10].append(x)
        xs = [x for b in buckets for x in b]
        place *= 10
    return xs
`,
        tests: [
          { id: "t1", description: "the traced numbers", assertionCode: `_r = radix_sort([312, 45, 207, 518, 33, 140, 205])
assert _r == [33, 45, 140, 205, 207, 312, 518], f"expected [33, 45, 140, 205, 207, 312, 518], got {_r}"` },
          { id: "t2", description: "different lengths, zeros, duplicates", assertionCode: `_r = radix_sort([5, 0, 1000, 70, 5, 0, 99])
assert _r == [0, 0, 5, 5, 70, 99, 1000], f"expected [0, 0, 5, 5, 70, 99, 1000], got {_r}: keep passing until place is bigger than the largest number"
_r = radix_sort([])
assert _r == [], f"expected [], got {_r}"` },
          { id: "t3", description: "20,000 numbers up to a billion", assertionCode: `_xs = [(i * 2654435761) % 1000000007 for i in range(20000)]
_r = radix_sort(_xs)
assert isinstance(_r, list) and len(_r) == len(_xs), "every number must be in the output"
assert _r == sorted(_xs), "the output should be sorted"` },
        ],
        hints: ["Bucket of `x` on this pass: `x // place % 10`.", "After each pass, join the buckets in order (0 to 9) and multiply `place` by 10; stop when `place` is bigger than the maximum."],
      },
      {
        kind: "code",
        title: "Sort ticket codes",
        body: P(
          "Ticket codes are strings of the same length made of digits and capital letters, like `\"Q7X\"`. Write `sort_codes(codes)` with LSD radix sort: a stable bucket pass for each character position, from the **last** character to the first. Digits come before letters (as in normal string order).",
          py(`
ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"
ALPHABET.index("C")   # 12: the bucket for "C"
`),
        ),
        language: "python",
        starter: `ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"

def sort_codes(codes):
    xs = list(codes)
    # for each position from the last to the first: a stable bucket pass
    return xs
`,
        solution: `ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"

def sort_codes(codes):
    xs = list(codes)
    if not xs:
        return xs
    for pos in range(len(xs[0]) - 1, -1, -1):
        buckets = [[] for _ in ALPHABET]
        for code in xs:
            buckets[ALPHABET.index(code[pos])].append(code)
        xs = [c for b in buckets for c in b]
    return xs
`,
        tests: [
          { id: "t1", description: "a few codes", assertionCode: `_r = sort_codes(["Q7X", "A12", "Q1Z", "B00", "A1B"])
assert _r == ["A12", "A1B", "B00", "Q1Z", "Q7X"], f"expected ['A12', 'A1B', 'B00', 'Q1Z', 'Q7X'], got {_r}"` },
          { id: "t2", description: "digits before letters, duplicates kept", assertionCode: `_r = sort_codes(["Z9", "09", "Z0", "A9", "09"])
assert _r == ["09", "09", "A9", "Z0", "Z9"], f"expected ['09', '09', 'A9', 'Z0', 'Z9'], got {_r}"` },
          { id: "t3", description: "empty, and 12,000 codes", assertionCode: `_r = sort_codes([])
assert _r == [], f"expected [], got {_r}"
_A = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"
_xs = ["".join(_A[(i * k * 7 + k) % 36] for k in range(1, 6)) for i in range(12000)]
_r = sort_codes(_xs)
assert _r == sorted(_xs), "12,000 five-character codes should come out sorted"` },
        ],
        hints: ["Loop `pos` from `len(xs[0]) - 1` down to 0.", "On each pass, append every code to `buckets[ALPHABET.index(code[pos])]`, then join the buckets in order."],
      },
      {
        kind: "recap",
        points: [
          "**Radix sort** sorts by one digit per pass, **last digit first**, with a stable counting or bucket pass each time.",
          "Cost **O(d · (n + b))**: linear in n when the number of digits d and the base b are fixed.",
          "Stability is the whole trick: ties on the current digit keep the order earlier passes set.",
          "Spot it: many integers or fixed-length codes, and n log n is too slow. Watch out for negatives and uneven lengths.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 7. Binary search ───────────────────────────────
  {
    id: "fnd-iv-sorting-7-binary-search",
    title: "Binary search: bounds and searching the answer",
    summary: "First and last positions with half-open ranges, and binary search over the answer when feasibility is monotonic.",
    minutes: 13,
    xp: 80,
    level: "Advanced",
    steps: [
      {
        kind: "explain",
        title: "Two shapes of binary search",
        body: P(
          "You have met binary search for *is x in this sorted list?* (see *Data structures and algorithms*). Interviews use two sharper versions.",
          "**1. Bounds.** The **lower bound** of x is the first index whose value is ≥ x; the **upper bound** is the first index whose value is > x. Their difference counts how many times x appears, and everything in a range `[a, b]` is between `lower(a)` and `upper(b)`. Write them with a half-open window `[lo, hi)`: the loop runs `while lo < hi`, and no `mid` is ever skipped or repeated.",
          py(`
lo, hi = 0, len(a)
while lo < hi:
    mid = (lo + hi) // 2
    if a[mid] < x:
        lo = mid + 1     # the answer is right of mid
    else:
        hi = mid         # mid might be the answer
return lo
`),
          "Python has these built in: `bisect.bisect_left(a, x)` and `bisect.bisect_right(a, x)`.",
          "**2. Search the answer.** Sometimes nothing is sorted, but the *answer* is. *What is the smallest truck capacity that moves everything in 5 trips?* If capacity c works, every bigger capacity works too. That one-way switch from *fails* to *works* is all binary search needs: try the middle capacity with a quick O(n) check and throw away half of the candidates. Total **O(n log R)** for a range of R possible answers.",
          "**How to spot it:** *first* or *last position*, *how many between*, *smallest value such that*, *minimise the maximum*, *maximise the minimum*, or a huge range of possible answers with an easy yes/no check.",
          "**Pitfalls:** `lo = mid` with `while lo < hi` can loop forever; decide whether the window is closed `[lo, hi]` or half-open `[lo, hi)` and stick to it.",
        ),
      },
      {
        kind: "question",
        title: "Find the first 7",
        body: "Step through the lower bound of 7 in a list with three 7s. Answer the picks.",
        widget: {
          type: "iv-trace",
          props: {
            title: "Lower bound of 7",
            frames: [
              { array: [2, 4, 7, 7, 7, 9, 12, 15], pointers: { lo: 0, hi: 8 }, range: [0, 7], code: LOWER_CODE, line: 3, vars: { x: 7 }, note: "The window `[lo, hi)` is the whole list. `hi = 8` sits just past the end.", pick: { prompt: "`mid = (0 + 8) // 2`. Tap `mid`.", answer: 4 } },
              { pointers: { lo: 0, mid: 4, hi: 8 }, highlight: [4], range: [0, 7], line: 7, vars: { x: 7 }, note: "`a[4] = 7` is not less than 7, so the first 7 is here or further left: `hi = mid`." },
              { pointers: { lo: 0, hi: 4 }, range: [0, 3], line: 3, vars: { x: 7 }, note: "Window `[0, 4)`.", pick: { prompt: "Tap the new `mid`.", answer: 2 } },
              { pointers: { lo: 0, mid: 2, hi: 4 }, highlight: [2], range: [0, 3], line: 7, vars: { x: 7 }, note: "`a[2] = 7`: again `hi = mid`." },
              { pointers: { lo: 0, mid: 1, hi: 2 }, highlight: [1], range: [0, 1], line: 5, vars: { x: 7 }, note: "Window `[0, 2)`, `mid = 1`, `a[1] = 4 < 7`: the answer is right of mid.", pick: { prompt: "Where does `lo` go?", answer: 2 } },
              { pointers: { lo: 2, hi: 2 }, highlight: [2], done: [0, 1, 5, 6, 7], line: 8, vars: { x: 7 }, note: "`lo == hi == 2`: the first 7 is at **index 2**, after 3 looks." },
            ],
          },
        },
        question: { type: "widget", goal: { picked: true }, prompt: "Answer the three picks.", hint: "`mid` is `(lo + hi) // 2`; when `a[mid] < x`, `lo` jumps to `mid + 1`." },
        explanation: "The loop keeps one promise: the first index with `a[i] >= x` is always inside `[lo, hi]`. When the window is empty, `lo` is that index.",
      },
      {
        kind: "question",
        title: "Upper bound",
        body: "In the same list `[2, 4, 7, 7, 7, 9, 12, 15]`, find `bisect_right(a, 7)`: the first index whose value is **greater than** 7.",
        question: { type: "number", answer: 5, hint: "Find the last 7 and step one to the right." },
        explanation: "The 7s are at indexes 2, 3 and 4, so the first value above 7 is the 9 at index **5**. And 5 − 2 = 3 is how many 7s there are.",
      },
      {
        kind: "question",
        title: "When can you search the answer?",
        body: "You want the smallest daily reading speed (pages per day) that finishes a stack of books in 10 days. What makes binary search on the speed valid?",
        question: {
          type: "choice",
          options: [
            "The books must be sorted by page count first.",
            "The number of books must be a power of two.",
            "Every speed must be checked once to be safe.",
            "If one speed works, every faster speed works.",
          ],
          answer: 3,
          feedback: { 0: "The order of the books does not matter for the check; the answer space is what must be ordered." },
          hint: "Binary search needs a yes/no test that flips from no to yes exactly once.",
        },
        explanation: "The test *can I finish in 10 days at speed s?* is no for small s and yes from some point on, and never flips back. That **monotonic** test is what lets you throw away half of the speeds each time.",
      },
      {
        kind: "question",
        title: "The cost of searching the answer",
        body: "n items, answers between 1 and R, and the yes/no check is one pass over the items. What does the whole search cost?",
        question: {
          type: "choice",
          options: ["O(R · n)", "O(n log R)", "O(log n · log R)", "O(n + R)"],
          answer: 1,
          hint: "How many guesses does binary search make over R values, and what does one guess cost?",
        },
        explanation: "About log₂ R guesses, each an O(n) check: **O(n log R)**. With R up to 10⁹ that is only about 30 passes.",
      },
      {
        kind: "code",
        title: "Prices in a range",
        body: P(
          "`prices` is sorted. Write `count_between(prices, lo, hi)`: how many prices `p` satisfy `lo <= p <= hi`. Use two binary searches (the `bisect` module is fine).",
          "The last test asks 20,000 questions about 100,000 prices: a scan per question would take billions of steps.",
        ),
        language: "python",
        starter: `import bisect

def count_between(prices, lo, hi):
    # lower bound of lo, upper bound of hi
    pass
`,
        solution: `import bisect

def count_between(prices, lo, hi):
    return max(0, bisect.bisect_right(prices, hi) - bisect.bisect_left(prices, lo))
`,
        tests: [
          { id: "t1", description: "with duplicates at the edges", assertionCode: `_a = [2, 4, 7, 7, 7, 9, 12, 15]
_r = count_between(_a, 7, 12)
assert _r == 5, f"7, 7, 7, 9, 12 are in [7, 12], expected 5, got {_r}"
_r = count_between(_a, 5, 8)
assert _r == 3, f"expected 3 (the three 7s), got {_r}"` },
          { id: "t2", description: "nothing in range, everything in range", assertionCode: `_a = [2, 4, 7, 7, 7, 9, 12, 15]
for _lo, _hi, _want in [(10, 11, 0), (16, 99, 0), (-5, 1, 0), (0, 100, 8), (15, 15, 1)]:
    _r = count_between(_a, _lo, _hi)
    assert _r == _want, f"count_between(a, {_lo}, {_hi}) should be {_want}, got {_r}"` },
          { id: "t3", description: "empty list, and a backwards range", assertionCode: `_r = count_between([], 1, 5)
assert _r == 0, f"no prices gives 0, got {_r}"
_r = count_between([1, 2, 3], 3, 1)
assert _r == 0, f"lo > hi means nothing fits, got {_r}"` },
          { id: "t4", description: "20,000 questions", assertionCode: `import bisect as _b
_a = sorted((i * 7919) % 50021 for i in range(100000))
for _q in range(20000):
    _lo = (_q * 37) % 50021
    _hi = _lo + (_q * 13) % 500
    _want = _b.bisect_right(_a, _hi) - _b.bisect_left(_a, _lo)
    _r = count_between(_a, _lo, _hi)
    assert _r == _want, f"count_between(a, {_lo}, {_hi}) should be {_want}, got {_r}"` },
        ],
        hints: ["`bisect_left(prices, lo)` is the first index with a price ≥ lo; `bisect_right(prices, hi)` is the first index with a price > hi.", "The count is the difference of the two, but never below 0."],
      },
      {
        kind: "code",
        title: "Split a trail into days",
        body: P(
          "A trail is a list of segment lengths that must be walked in order. You will walk it in at most `days` days, each day covering one or more whole segments in a row. Write `shortest_longest_day(segments, days)`: the smallest possible length of the longest day.",
          py(`
shortest_longest_day([4, 3, 6, 2, 5], 2)   # 13: [4, 3, 6] then [2, 5]
`),
          "Binary search the answer between `max(segments)` and `sum(segments)`. For a guess `c`, walk greedily: keep adding segments to today until the next one would go over `c`, then start a new day. The guess works if you need at most `days` days. The last test has 8,000 segments.",
        ),
        language: "python",
        starter: `def shortest_longest_day(segments, days):
    def fits(c):
        # greedy: how many days are needed if no day may exceed c?
        return True

    lo, hi = max(segments), sum(segments)
    # binary search for the smallest c with fits(c)
    pass
`,
        solution: `def shortest_longest_day(segments, days):
    def fits(c):
        used, today = 1, 0
        for s in segments:
            if today + s > c:
                used += 1
                today = s
            else:
                today += s
        return used <= days

    lo, hi = max(segments), sum(segments)
    while lo < hi:
        mid = (lo + hi) // 2
        if fits(mid):
            hi = mid
        else:
            lo = mid + 1
    return lo
`,
        tests: [
          { id: "t1", description: "the example", assertionCode: `_r = shortest_longest_day([4, 3, 6, 2, 5], 2)
assert _r == 13, f"expected 13, got {_r}"
_r = shortest_longest_day([4, 3, 6, 2, 5], 3)
assert _r == 7, f"expected 7 ([4, 3] [6] [2, 5]), got {_r}"` },
          { id: "t2", description: "one day, or a day per segment", assertionCode: `_r = shortest_longest_day([4, 3, 6, 2, 5], 1)
assert _r == 20, f"in one day you walk everything: 20, got {_r}"
_r = shortest_longest_day([4, 3, 6, 2, 5], 9)
assert _r == 6, f"with plenty of days the longest single segment decides: 6, got {_r}"` },
          { id: "t3", description: "one segment", assertionCode: `_r = shortest_longest_day([42], 3)
assert _r == 42, f"expected 42, got {_r}"` },
          { id: "t4", description: "8,000 segments", assertionCode: `_segs = [(i * 37) % 101 + 1 for i in range(8000)]
_r = shortest_longest_day(_segs, 7)
assert _r == 58305, f"expected 58305, got {_r}"` },
        ],
        hints: ["In `fits(c)`, count days: when `today + s > c`, start a new day with `today = s`.", "Search with `while lo < hi`: if `fits(mid)`, the answer is `mid` or smaller (`hi = mid`), else `lo = mid + 1`."],
      },
      {
        kind: "recap",
        points: [
          "**Lower bound**: first index with value ≥ x; **upper bound**: first index with value > x. Write them half-open: `while lo < hi`, `lo = mid + 1` or `hi = mid`.",
          "`upper(b) - lower(a)` counts the values in `[a, b]`, in O(log n).",
          "**Search the answer** when a yes/no check is monotonic: O(n log R) for n items and R candidate answers.",
          "Spot it: *first/last position*, *smallest value such that*, *minimise the maximum*. Pitfall: mixing closed and half-open windows.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 8. Divide and conquer ───────────────────────────────
  {
    id: "fnd-iv-sorting-8-divide-and-conquer",
    title: "Divide and conquer",
    summary: "Split into independent halves, solve, combine; read the cost from the recurrence; fast powers and best runs.",
    minutes: 13,
    xp: 80,
    level: "Advanced",
    steps: [
      {
        kind: "explain",
        title: "Split, solve, combine",
        body: P(
          "**Divide and conquer** has three moves: **split** the problem into smaller pieces of the same kind, **solve** each piece recursively, and **combine** their answers. Merge sort and quickselect are both examples. The pieces are independent: no piece needs another piece's answer.",
          "The cost follows from a **recurrence**: the work for size n in terms of the work for the pieces.",
          txt(`
T(n) = 2T(n/2) + O(n)    -> O(n log n)   merge sort
T(n) = T(n/2) + O(1)     -> O(log n)     binary search, fast power
T(n) = 2T(n/2) + O(1)    -> O(n)         max of a list by halves
T(n) = T(n/2) + O(n)     -> O(n)         quickselect, on average
`),
          "Picture the calls as a tree: count the work on each level and the number of levels. Two halves with O(n) of combining per level and log n levels give n log n.",
          "**How to spot it:** a huge number that can be halved (*an exponent of 10¹⁸*), an answer that is *in the left half, in the right half, or across the middle*, or a structure that splits naturally (a list, a tree, a grid into quadrants).",
          "**Not to confuse with dynamic programming:** if the pieces overlap (the same smaller problem is needed again and again), remember the answers instead. That is the *Dynamic programming* module.",
        ),
      },
      {
        kind: "question",
        title: "A power in five calls",
        body: "To compute 3¹³, halve the exponent: 3¹³ = (3⁶)² × 3. Step through the calls and answer the picks.",
        widget: {
          type: "iv-trace",
          props: {
            title: "power(3, 13) by squaring",
            frames: [
              { tree: { nodes: POWER_TREE, active: ["p13"] }, code: POWER_CODE, line: 3, stacks: [{ label: "call stack", items: ["power(3, 13)"] }], vars: { n: 13 }, note: "`13` is not 0, so first get the power for half the exponent.", pick: { prompt: "Which call does `power(3, 13)` make?", answer: "p6" } },
              { tree: { active: ["p6"] }, line: 3, stacks: [{ label: "call stack", items: ["power(3, 13)", "power(3, 6)"] }], vars: { n: 6 }, note: "`13 // 2 = 6`. Then `6 // 2 = 3`." },
              { tree: { active: ["p0"] }, line: 2, stacks: [{ label: "call stack", items: ["power(3, 13)", "power(3, 6)", "power(3, 3)", "power(3, 1)", "power(3, 0)"] }], vars: { n: 0, returns: 1 }, note: "Down through `3` and `1` to `0`: the base case returns 1." },
              { tree: { active: ["p1"], done: ["p0"] }, line: 5, stacks: [{ label: "call stack", items: ["power(3, 13)", "power(3, 6)", "power(3, 3)", "power(3, 1)"] }], vars: { n: 1, half: 1, returns: 3 }, note: "`n = 1` is odd: `1 × 1 × 3 = 3`." },
              { tree: { active: ["p3"], done: ["p0", "p1"] }, line: 5, stacks: [{ label: "call stack", items: ["power(3, 13)", "power(3, 6)", "power(3, 3)"] }], vars: { n: 3, half: 3, returns: 27 }, note: "`n = 3` is odd: `3 × 3 × 3 = 27`." },
              { tree: { done: ["p0", "p1", "p3"] }, line: 4, stacks: [{ label: "call stack", items: ["power(3, 13)", "power(3, 6)"] }], vars: { half: 27 }, note: "`power(3, 3)` has returned 27.", pick: { prompt: "Which call finishes next?", answer: "p6" } },
              { tree: { active: ["p6"], done: ["p0", "p1", "p3"] }, line: 4, vars: { n: 6, half: 27, returns: 729 }, note: "`n = 6` is even: `27 × 27 = 729`." },
              { tree: { active: ["p13"], done: ["p0", "p1", "p3", "p6"] }, line: 5, stacks: [{ label: "call stack", items: ["power(3, 13)"] }], vars: { n: 13, half: 729, returns: 1594323 }, note: "`729 × 729 × 3 = 1,594,323`. Five calls instead of 13 multiplications, and the gap grows fast." },
            ],
          },
        },
        question: { type: "widget", goal: { picked: true }, prompt: "Answer both picks.", hint: "Each call asks for half the exponent, rounded down, and finishes only after that call has returned." },
        explanation: "One call per halving: T(n) = T(n/2) + O(1), which is **O(log n)** multiplications. Calling `power` **twice** for the half would be T(n) = 2T(n/2) + O(1) = O(n) again, so compute `half` once.",
      },
      {
        kind: "question",
        title: "A million",
        body: "How many calls does `power(b, 1000000)` make in total, counting the first call and the `n = 0` call?",
        question: { type: "number", answer: 21, hint: "Count how many times you can halve 1,000,000 (rounding down) before it reaches 0, and add the first call." },
        explanation: "1,000,000 → 500,000 → … → 3 → 1 → 0: the exponent is halved 20 times, so **21** calls. log₂ of a million is about 20.",
      },
      {
        kind: "question",
        title: "Read the recurrence",
        body: "A function splits a list into two halves, calls itself on both, and then does one O(n) pass to combine. What is its running time?",
        question: {
          type: "choice",
          options: ["O(n)", "O(log n)", "O(n log n)", "O(n²)"],
          answer: 2,
          feedback: { 0: "That would need the combine step to be O(1).", 3: "Each level of the call tree only does O(n) in total." },
          hint: "How many levels does the call tree have, and how much work is done on each level?",
        },
        explanation: "T(n) = 2T(n/2) + O(n): about log₂ n levels, each doing O(n) of combining across all its pieces, so **O(n log n)**, the same shape as merge sort.",
      },
      {
        kind: "question",
        title: "Divide and conquer, or remember?",
        body: "Computing the n-th Fibonacci number by `fib(n - 1) + fib(n - 2)` splits the problem in two too. Why is it *not* a good divide-and-conquer algorithm?",
        question: {
          type: "choice",
          options: [
            "The two calls overlap, so the same values are recomputed.",
            "Because it splits into two pieces instead of three.",
            "Because adding two numbers is too slow a combine step.",
            "Because the pieces are far too small to be useful.",
          ],
          answer: 0,
          hint: "Write out the calls for fib(5). Which ones appear more than once?",
        },
        explanation: "`fib(5)` needs `fib(4)` and `fib(3)`, and `fib(4)` needs `fib(3)` again: the pieces **overlap**, and the call tree grows exponentially. Overlapping pieces call for remembering answers (dynamic programming), not plain divide and conquer.",
      },
      {
        kind: "explain",
        title: "The best run: left, right or across",
        body: P(
          "Here is a classic combine step. Given daily profit changes, find the **best total over a run of consecutive days**. Split the days in half. The best run is either entirely in the left half, entirely in the right half, or it **crosses the middle**.",
          "The first two come from the recursive calls. The crossing run is the best run that *ends* at the middle (walk left from the middle, keeping the best running sum) plus the best run that *starts* just after it (walk right). That costs O(n), so the whole thing is T(n) = 2T(n/2) + O(n) = **O(n log n)**.",
          txt(`
changes:  3  -5   4  -1 | 2  -6   5
best ending at the middle:   4 - 1        = 3
best starting after it:      2            = 2
crossing: 3 + 2 = 5     (left alone: 4, right alone: 5)
answer: 5
`),
          "(A one-pass O(n) method, Kadane's algorithm, also exists and is covered under dynamic programming. The crossing idea is what generalises: closest pair of points, counting across halves, and more.)",
        ),
      },
      {
        kind: "code",
        title: "Powers of huge exponents",
        body: P(
          "Write `power_mod(base, exp, mod)`: `base` to the power `exp`, modulo `mod`, by halving the exponent. Take `% mod` after every multiplication so the numbers stay small. Do **not** use the built-in `pow` or `**` with the big exponent: the last test uses an exponent of 10¹⁸.",
          "Anything modulo 1 is 0, so `power_mod(5, 0, 1)` is 0.",
        ),
        language: "python",
        starter: `def power_mod(base, exp, mod):
    if exp == 0:
        return 1 % mod
    # half = power_mod(base, exp // 2, mod), then square it (and multiply by base if exp is odd)
    pass
`,
        solution: `def power_mod(base, exp, mod):
    if exp == 0:
        return 1 % mod
    half = power_mod(base, exp // 2, mod)
    result = half * half % mod
    if exp % 2 == 1:
        result = result * base % mod
    return result
`,
        tests: [
          { id: "t1", description: "small powers", assertionCode: `_r = power_mod(3, 13, 10**9)
assert _r == 1594323, f"3^13 = 1594323, got {_r}"
_r = power_mod(2, 10, 1000)
assert _r == 24, f"2^10 = 1024, and 1024 % 1000 = 24; got {_r}"` },
          { id: "t2", description: "exponent 0 and modulus 1", assertionCode: `_r = power_mod(7, 0, 13)
assert _r == 1, f"anything to the power 0 is 1, got {_r}"
_r = power_mod(5, 0, 1)
assert _r == 0, f"anything mod 1 is 0, got {_r}"
_r = power_mod(5, 3, 1)
assert _r == 0, f"anything mod 1 is 0, got {_r}"` },
          { id: "t3", description: "an exponent of 10^18, without pow()", assertionCode: `import builtins as _bi
_saved = _bi.pow
def _no_pow(*args):
    raise AssertionError("solve it by halving the exponent, without the built-in pow()")
_bi.pow = _no_pow
try:
    _r = power_mod(7, 10**18, 1000000007)
    _r2 = power_mod(2, 10**18, 998244353)
finally:
    _bi.pow = _saved
assert _r == 259616729, f"expected 259616729, got {_r}"
assert _r2 == 242199768, f"expected 242199768, got {_r2}"` },
        ],
        hints: ["Call `power_mod(base, exp // 2, mod)` **once** and store it in `half`.", "`half * half % mod`, then if `exp` is odd multiply by `base` and take `% mod` again."],
      },
      {
        kind: "code",
        title: "The best stretch of days",
        body: P(
          "Write `best_stretch(changes)`: the largest total of a run of one or more consecutive days. Use divide and conquer: best in the left half, best in the right half, or best crossing the middle. If every day is a loss, the answer is the smallest loss (a run has at least one day).",
          "The last test has 10,000 days, so checking every run (50 million of them) is far too slow.",
        ),
        language: "python",
        starter: `def best_stretch(changes):
    def solve(lo, hi):          # best run inside changes[lo..hi], inclusive
        if lo == hi:
            return changes[lo]
        mid = (lo + hi) // 2
        # left, right, and the best run crossing mid
        pass

    return solve(0, len(changes) - 1)
`,
        solution: `def best_stretch(changes):
    def solve(lo, hi):
        if lo == hi:
            return changes[lo]
        mid = (lo + hi) // 2
        left = solve(lo, mid)
        right = solve(mid + 1, hi)
        s, best_left = 0, float("-inf")
        for i in range(mid, lo - 1, -1):
            s += changes[i]
            best_left = max(best_left, s)
        s, best_right = 0, float("-inf")
        for i in range(mid + 1, hi + 1):
            s += changes[i]
            best_right = max(best_right, s)
        return max(left, right, best_left + best_right)

    return solve(0, len(changes) - 1)
`,
        tests: [
          { id: "t1", description: "the worked example", assertionCode: `_r = best_stretch([3, -5, 4, -1, 2, -6, 5])
assert _r == 5, f"expected 5 (4 - 1 + 2, or the 5 at the end), got {_r}"` },
          { id: "t2", description: "a run that crosses the middle", assertionCode: `_r = best_stretch([-2, 1, 3, 4, -1, -9])
assert _r == 8, f"expected 8 (1 + 3 + 4 across the middle), got {_r}"` },
          { id: "t3", description: "all losses, and one day", assertionCode: `_r = best_stretch([-4, -2, -7])
assert _r == -2, f"a run has at least one day, so expected -2, got {_r}"
_r = best_stretch([6])
assert _r == 6, f"expected 6, got {_r}"` },
          { id: "t4", description: "10,000 days", assertionCode: `_xs = [((i * 7919) % 2001) - 1000 for i in range(10000)]
_r = best_stretch(_xs)
assert _r == 8302, f"expected 8302, got {_r}"` },
        ],
        hints: ["`left = solve(lo, mid)` and `right = solve(mid + 1, hi)`.", "For the crossing run, walk from `mid` down to `lo` keeping the best running sum, do the same from `mid + 1` up to `hi`, and add the two bests."],
      },
      {
        kind: "recap",
        points: [
          "**Divide and conquer**: split into independent pieces, solve each recursively, combine.",
          "Read the cost from the recurrence: 2T(n/2) + O(n) is n log n; T(n/2) + O(1) is log n; 2T(n/2) + O(1) is n.",
          "Fast power: one call on half the exponent, O(log n). Compute `half` once, never twice.",
          "Many combine steps ask *left, right, or across the middle?*. Overlapping pieces mean dynamic programming instead.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 9. Sweep line ───────────────────────────────
  {
    id: "fnd-iv-sorting-9-sweep-line",
    title: "Sweep line: events in time order",
    summary: "Turn intervals into start and end events, sort them, and sweep with a counter or a running union.",
    minutes: 13,
    xp: 90,
    level: "Professional",
    steps: [
      {
        kind: "explain",
        title: "Walk through time",
        body: P(
          "Interval problems (bookings, shifts, meetings, train occupancy) often ask what happens *at the same time*. Comparing every pair of intervals is O(n²). A **sweep line** instead turns each interval into **events**, sorts them by time, and walks along the timeline once, keeping a little state: a counter, or the interval being built.",
          py(`
events = [(s, +1) for s, e in bookings] + [(e, -1) for s, e in bookings]
events.sort()                 # (4, -1) sorts before (4, +1)
now = best = 0
for t, d in events:
    now += d
    best = max(best, now)     # the most bookings open at once
`),
          "Sorting costs **O(n log n)** and the sweep O(n). A second form **merges** intervals: sort by start, keep extending the current block while the next one starts before it ends, and start a new block otherwise.",
          "**Ties decide correctness.** With half-open bookings `[start, end)`, one that ends at 4 and one that starts at 4 do not clash, so the end must be handled first. Sorting the tuples `(t, -1)` before `(t, +1)` does exactly that. With closed intervals it is the other way round.",
          "**How to spot it:** *overlapping*, *at the same time*, *how many rooms*, *busiest moment*, *merge*, *total covered*, *free slots*.",
        ),
      },
      {
        kind: "question",
        title: "Four bookings",
        body: "Bookings `[1, 4)`, `[2, 5)`, `[4, 7)` and `[6, 8)` become 8 events, sorted by time (`+` is a start, `−` an end). Step through the sweep and answer the picks.",
        widget: {
          type: "iv-trace",
          props: {
            title: "Counting open bookings",
            frames: [
              { array: ["1+", "2+", "4−", "4+", "5−", "6+", "7−", "8−"], code: SWEEP_CODE, line: 2, vars: { now: 0, best: 0 }, note: "Every start and end as an event, in time order." },
              { pointers: { t: 0 }, highlight: [0], line: 5, vars: { now: 1, best: 1 }, note: "Time 1: a booking opens. One room in use." },
              { done: [0], line: 4, vars: { now: 1, best: 1 }, note: "On to the next event.", pick: { prompt: "Tap the event that first brings the count to 2.", answer: 1 } },
              { pointers: { t: 1 }, highlight: [1], line: 6, vars: { now: 2, best: 2 }, note: "Time 2: two bookings open. Best so far 2." },
              { pointers: { t: 2 }, highlight: [2, 3], line: 4, vars: { now: 2, best: 2 }, note: "Two events at time 4. The first booking ends exactly when the third starts.", pick: { prompt: "Which event at time 4 must be handled first?", answer: 2 } },
              { pointers: { t: 2 }, highlight: [2], done: [0, 1], line: 5, vars: { now: 1, best: 2 }, note: "End first: down to 1." },
              { pointers: { t: 3 }, highlight: [3], done: [0, 1, 2], line: 5, vars: { now: 2, best: 2 }, note: "Then the start: back to 2, never 3. The room was free in time." },
              { pointers: { t: 5 }, highlight: [4, 5], done: [0, 1, 2, 3], line: 5, vars: { now: 2, best: 2 }, note: "Time 5 closes one, time 6 opens one: 1, then 2." },
              { done: [0, 1, 2, 3, 4, 5, 6, 7], line: 6, vars: { now: 0, best: 2 }, note: "The last two ends bring it to 0. **2 rooms** are enough." },
            ],
          },
        },
        question: { type: "widget", goal: { picked: true }, prompt: "Answer both picks.", hint: "A booking `[s, e)` is over at time e, so its end goes before a start at the same time." },
        explanation: "With the end handled first, the count never says 3, and 2 rooms are enough. Handling the start first would report 3, one room too many.",
      },
      {
        kind: "question",
        title: "Rooms for the morning",
        body: "Half-open bookings `[9, 12)`, `[10, 11)`, `[11, 13)` and `[12, 14)`. How many rooms are needed at the busiest moment?",
        question: { type: "number", answer: 2, hint: "List the events in order and remember that at equal times, ends go first.", unit: "rooms" },
        explanation: "At 10 there are 2 open. At 11 one ends and one starts: still 2. At 12 the same happens: still 2. So **2** rooms. Counting starts before ends would wrongly say 3.",
      },
      {
        kind: "question",
        title: "Closed intervals",
        body: "Now the intervals are **closed**: `[1, 4]` and `[4, 6]` both include time 4, so they *do* overlap at 4. How should events at the same time be ordered?",
        question: {
          type: "choice",
          options: [
            "Ends before starts, like half-open intervals.",
            "Starts before ends at the same time.",
            "By the length of the interval.",
            "It does not matter for closed intervals.",
          ],
          answer: 1,
          feedback: { 0: "Then the count drops before the second interval opens, and the overlap at 4 is missed.", 3: "It does matter: the order decides whether the count reaches 2 at time 4." },
          hint: "At time 4 both intervals are in use. Which event order lets the count reach 2?",
        },
        explanation: "Handle the **starts first** so both intervals are counted at time 4. With tuples, encode a start as `(t, 0)` and an end as `(t, 1)`. The tie rule is the most common bug in sweep-line answers.",
      },
      {
        kind: "question",
        title: "Merging, in order",
        body: "Put the steps for merging overlapping intervals into one list of separate blocks in the right order.",
        question: {
          type: "order",
          items: [
            "Sort the intervals by their start.",
            "Open a block with the first interval.",
            "If the next one starts before the block ends, extend the block's end.",
            "Otherwise close the block and open a new one.",
            "Close the last block at the end.",
          ],
          hint: "Nothing can be merged until the intervals are in start order.",
        },
        explanation: "Sorted by start, an interval can only overlap the block being built, never an earlier one. So one pass is enough: extend with `max(end, e)` or start a new block.",
      },
      {
        kind: "code",
        title: "How many rehearsal rooms?",
        body: P(
          "Bookings are half-open `(start, end)` pairs: a room is free again at `end`. Write `rooms_needed(bookings)`: the most bookings open at the same moment. No bookings needs 0 rooms.",
          "The last test has 30,000 bookings; sort the events once.",
        ),
        language: "python",
        starter: `def rooms_needed(bookings):
    events = []
    # a +1 event at each start, a -1 event at each end; ends first on ties
    pass
`,
        solution: `def rooms_needed(bookings):
    events = []
    for s, e in bookings:
        events.append((s, 1))
        events.append((e, -1))
    events.sort()
    now = best = 0
    for _, d in events:
        now += d
        best = max(best, now)
    return best
`,
        tests: [
          { id: "t1", description: "the traced bookings", assertionCode: `_r = rooms_needed([(1, 4), (2, 5), (4, 7), (6, 8)])
assert _r == 2, f"expected 2, got {_r}"` },
          { id: "t2", description: "back to back and nested", assertionCode: `_r = rooms_needed([(9, 12), (10, 11), (11, 13), (12, 14)])
assert _r == 2, f"expected 2: a booking ending at 11 frees the room for one starting at 11; got {_r}"
_r = rooms_needed([(1, 10), (2, 3), (4, 5), (2, 9)])
assert _r == 3, f"expected 3, got {_r}"` },
          { id: "t3", description: "none, one, and all at once", assertionCode: `_r = rooms_needed([])
assert _r == 0, f"no bookings needs 0 rooms, got {_r}"
_r = rooms_needed([(3, 4)])
assert _r == 1, f"expected 1, got {_r}"
_r = rooms_needed([(5, 6)] * 4)
assert _r == 4, f"four identical bookings need 4 rooms, got {_r}"` },
          { id: "t4", description: "30,000 bookings", assertionCode: `_b = [((i * 7919) % 30000, (i * 7919) % 30000 + (i * 31) % 500 + 1) for i in range(30000)]
_r = rooms_needed(_b)
assert _r == 275, f"expected 275, got {_r}"` },
        ],
        hints: ["Append `(start, 1)` and `(end, -1)` for each booking and sort: `(t, -1)` sorts before `(t, 1)`, so ends come first.", "Walk the events adding each `d` to a counter and keep the largest value it reaches."],
      },
      {
        kind: "code",
        title: "Total time covered",
        body: P(
          "Shifts are half-open `(start, end)` pairs and may overlap. Write `covered_time(shifts)`: how many time units have at least one person on shift. Merge overlapping or touching shifts, then add up the block lengths.",
          py(`
covered_time([(1, 4), (2, 6), (8, 10)])   # 5 + 2 = 7
`),
        ),
        language: "python",
        starter: `def covered_time(shifts):
    total = 0
    # sort by start, grow the current block while shifts overlap it
    return total
`,
        solution: `def covered_time(shifts):
    total = 0
    cur_s = cur_e = None
    for s, e in sorted(shifts):
        if cur_e is None or s > cur_e:
            if cur_e is not None:
                total += cur_e - cur_s
            cur_s, cur_e = s, e
        else:
            cur_e = max(cur_e, e)
    if cur_e is not None:
        total += cur_e - cur_s
    return total
`,
        tests: [
          { id: "t1", description: "the example", assertionCode: `_r = covered_time([(1, 4), (2, 6), (8, 10)])
assert _r == 7, f"[1, 6) and [8, 10) cover 5 + 2 = 7, got {_r}"` },
          { id: "t2", description: "unsorted, nested and touching", assertionCode: `_r = covered_time([(10, 12), (0, 5), (1, 2), (5, 7)])
assert _r == 9, f"[0, 7) and [10, 12) cover 9, got {_r}: a shift inside another adds nothing"
_r = covered_time([(0, 10), (2, 3)])
assert _r == 10, f"the second shift is inside the first: 10, got {_r}. Use max() for the block's end"` },
          { id: "t3", description: "no shifts, one shift", assertionCode: `_r = covered_time([])
assert _r == 0, f"expected 0, got {_r}"
_r = covered_time([(4, 9)])
assert _r == 5, f"expected 5, got {_r}"` },
          { id: "t4", description: "100,000 shifts", assertionCode: `_b = [((i * 7919) % 100000, (i * 7919) % 100000 + (i * 31) % 500 + 1) for i in range(100000)]
_r = covered_time(_b)
assert _r == 100451, f"expected 100451, got {_r}"` },
        ],
        hints: ["Loop over `sorted(shifts)`. If a shift starts after the current block's end, close the block (add its length) and start a new one.", "Otherwise the shift overlaps: `cur_e = max(cur_e, e)`. Do not forget to add the last block."],
      },
      {
        kind: "recap",
        points: [
          "**Sweep line**: turn intervals into start and end events, sort by time, walk once with a counter. O(n log n).",
          "**Ties matter**: half-open intervals handle ends before starts at the same time; closed intervals the opposite.",
          "**Merging**: sort by start, extend the current block with `max(end, e)` or start a new one.",
          "Spot it: *overlapping*, *at the same time*, *how many rooms*, *busiest moment*, *total covered*.",
        ],
      },
    ],
  },
];
