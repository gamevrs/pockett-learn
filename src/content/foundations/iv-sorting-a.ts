import type { ConceptLesson } from "../../learn/types.ts";

/** Fenced Python block for lesson prose. */
const py = (code: string) => "~~~python\n" + code.trim() + "\n~~~";
/** Fenced plain-text block (diagrams, tables). */
const txt = (code: string) => "~~~text\n" + code.replace(/^\n+|\s+$/g, "") + "\n~~~";
/** Paragraphs joined with blank lines. */
const P = (...paras: string[]) => paras.join("\n\n");

// ── shared trace data ──
const GAP_CODE = ["xs = sorted(prices)", "best = float('inf')", "for i in range(1, len(xs)):", "    gap = xs[i] - xs[i - 1]", "    best = min(best, gap)", "return best"];
const MERGE_CODE = ["i, j, out = 0, 0, []", "while i < len(a) and j < len(b):", "    if a[i] <= b[j]:", "        out.append(a[i]); i += 1", "    else:", "        out.append(b[j]); j += 1", "out += a[i:] + b[j:]"];
const LOMUTO_CODE = ["pivot = a[hi]", "i = lo", "for j in range(lo, hi):", "    if a[j] < pivot:", "        a[i], a[j] = a[j], a[i]", "        i += 1", "a[i], a[hi] = a[hi], a[i]", "return i"];
const COUNT_CODE = ["count = [0] * k", "for x in nums:", "    count[x] += 1", "out = []", "for v in range(k):", "    out += [v] * count[v]"];
const FREQ_CODE = ["freq = Counter(plays)", "buckets = [[] for _ in range(len(plays) + 1)]", "for song, c in freq.items():", "    buckets[c].append(song)", "for c in range(len(plays), 0, -1):", "    take songs from buckets[c]"];

/** Lessons 1 to 5 of "Sorting, searching and divide and conquer". */
export const ivSortingLessonsA: ConceptLesson[] = [
  // ─────────────────────────────── 1. Sorting as a tool ───────────────────────────────
  {
    id: "fnd-iv-sorting-1-sorting",
    title: "Sorting as a first move",
    summary: "Sort first and related items end up side by side: closest pairs, duplicates, ties and custom keys.",
    minutes: 10,
    xp: 60,
    level: "Beginner",
    steps: [
      {
        kind: "explain",
        title: "Sort, then look at neighbours",
        body: P(
          "Many interview problems get easy the moment the data is in order. After sorting, things that are *close* or *equal* sit next to each other, so one pass over neighbours replaces a check of every pair. That turns an **O(n²)** pair search into **O(n log n)** for the sort plus **O(n)** for the scan.",
          "Python's `sorted(xs)` returns a new list and `xs.sort()` sorts in place. Both use Timsort: **O(n log n)** in the worst case, and very fast on data that is already partly sorted. Both take a `key` function, and both are **stable**: items with equal keys keep their original order. (See *Data structures and algorithms* for how the simple sorts work.)",
          py(`
words.sort(key=len)                          # shortest first
people.sort(key=lambda p: (-p.score, p.name))  # score high to low, then name A to Z
`),
          "**How to spot it:** the problem says *closest*, *duplicate*, *group the same*, *in order of*, *schedule* or *overlap*, and n is up to about a million, so n log n is fine.",
          "**Pitfalls:** sorting throws away the original positions (sort `(value, index)` pairs if you need them), and it costs n log n, so it is the wrong move when the problem demands O(n).",
        ),
      },
      {
        kind: "question",
        title: "The two closest prices",
        body: "A market stall wants the two prices that are closest together. Step through the sort-then-scan idea, and answer the two picks.",
        widget: {
          type: "iv-trace",
          props: {
            title: "Smallest gap between two prices",
            frames: [
              { array: [21, 8, 30, 3, 15, 9, 22], code: GAP_CODE, line: 1, vars: { best: "inf" }, note: "The prices as they arrive. The closest two could be anywhere." },
              { array: [3, 8, 9, 15, 21, 22, 30], line: 1, note: "Sorted. Now the closest pair **must** be two neighbours." },
              { highlight: [0, 1], line: 5, vars: { i: 1, gap: 5, best: 5 }, note: "`8 - 3 = 5`. Best so far: 5." },
              { highlight: [1, 2], line: 5, vars: { i: 2, gap: 1, best: 1 }, note: "`9 - 8 = 1`. Best so far: 1." },
              { highlight: [2, 3], line: 5, vars: { i: 3, gap: 6, best: 1 }, note: "`15 - 9 = 6`. Best stays 1." },
              { highlight: [4], line: 4, vars: { i: 4, gap: "?", best: 1 }, note: "Now `i = 4`, so `xs[4] = 21` is the right-hand cell.", pick: { prompt: "Which cell is `21` compared with?", answer: 3 } },
              { highlight: [3, 4], line: 5, vars: { i: 4, gap: 6, best: 1 }, note: "`21 - 15 = 6`. Best stays 1." },
              { highlight: [4, 5], line: 5, vars: { i: 5, gap: 1, best: 1 }, note: "`22 - 21 = 1`: a tie with the best, so nothing changes." },
              { highlight: [5, 6], line: 5, vars: { i: 6, gap: 8, best: 1 }, note: "`30 - 22 = 8`. The scan is over." },
              { done: [0, 1, 2, 3, 4, 5, 6], line: 6, note: "Six neighbour checks instead of 21 pair checks.", pick: { prompt: "Tap the right-hand cell of the first pair that gave the answer 1.", answer: 2 } },
            ],
          },
        },
        question: { type: "widget", goal: { picked: true }, prompt: "Answer both picks.", hint: "After sorting, each step compares a cell with the one just before it." },
        explanation: "After sorting, the answer is **1** (8 and 9, and also 21 and 22). Only neighbours are compared: n − 1 checks after an n log n sort.",
      },
      {
        kind: "question",
        title: "Why neighbours are enough",
        body: "In a sorted list, why can the closest pair never be two items that are *not* next to each other?",
        question: {
          type: "choice",
          options: [
            "Because sorting removes the duplicates first.",
            "Because Timsort compares neighbours while it sorts.",
            "Any item between them is closer to each of them.",
            "Because the list has an even number of items.",
          ],
          answer: 2,
          feedback: { 0: "Sorting keeps duplicates; a duplicate pair is a gap of 0, which neighbours find too.", 1: "How the sort works inside does not matter; the claim is about the sorted result." },
          hint: "Take sorted values a ≤ b ≤ c. Compare c − a with b − a.",
        },
        explanation: "If a ≤ b ≤ c, then b − a ≤ c − a and c − b ≤ c − a. Skipping over b never gives a smaller gap, so the best pair is always adjacent.",
      },
      {
        kind: "question",
        title: "Two-part keys",
        body: "Players are `(name, score)` tuples. You want the highest score first and, for equal scores, names from A to Z. Which call does it?",
        question: {
          type: "choice",
          options: [
            "sorted(players, key=lambda p: (p[1], p[0]), reverse=True)",
            "sorted(players, key=lambda p: (-p[1], p[0]))",
            "sorted(players, key=lambda p: p[1] + p[0])",
            "sorted(players, key=lambda p: (p[0], -p[1]))",
          ],
          answer: 1,
          feedback: {
            0: "`reverse=True` flips both parts, so equal scores would come out Z to A.",
            2: "A number plus a string is a TypeError in Python.",
            3: "This sorts by name first; the score only breaks ties between equal names.",
          },
          hint: "A tuple key compares its first part first. Negating a number flips its order without touching the second part.",
        },
        explanation: "The key `(-score, name)` sorts by score high to low (the negation), then by name A to Z for ties. `reverse=True` would flip the names too.",
      },
      {
        kind: "question",
        title: "Stable sorts stack up",
        body: "You sort a staff list by **name**, then sort the result by **team** with a stable sort. What does the final list look like?",
        question: {
          type: "choice",
          options: [
            "Sorted by name only: the second sort is undone.",
            "Grouped by team, but names inside a team are random.",
            "Sorted by team, and the first sort is lost entirely.",
            "Grouped by team, names A to Z inside each team.",
          ],
          answer: 3,
          hint: "Stable means equal keys keep the order they already had.",
        },
        explanation: "The second sort groups by team. Inside a team every key is equal, so a stable sort keeps their previous order, which was by name. Sorting by the *least* important key first is an old trick; a tuple key does the same in one pass.",
      },
      {
        kind: "question",
        title: "What sorting saves",
        body: "With 1,000 prices, checking **every pair** for the smallest gap needs n(n − 1)/2 comparisons. How many is that?",
        question: { type: "number", answer: 499500, hint: "Work out 1,000 × 999 and halve it.", unit: "comparisons" },
        explanation: "1,000 × 999 / 2 = **499,500**. Sorting costs about n log₂ n ≈ 10,000 comparisons, and the neighbour scan 999 more: about 45 times less work, and the gap widens as n grows.",
      },
      {
        kind: "code",
        title: "Closest two prices",
        body: P(
          "Write `smallest_gap(prices)`: the smallest difference between any two prices in the list (it has at least two). Duplicates give a gap of 0.",
          "The last test has 50,000 prices, so checking every pair (over a billion checks) will run out of time. Sort first.",
        ),
        language: "python",
        starter: `def smallest_gap(prices):
    # sort, then compare each price with its neighbour
    pass
`,
        solution: `def smallest_gap(prices):
    xs = sorted(prices)
    best = float("inf")
    for i in range(1, len(xs)):
        best = min(best, xs[i] - xs[i - 1])
    return best
`,
        tests: [
          { id: "t1", description: "the market example", assertionCode: `_r = smallest_gap([21, 8, 30, 3, 15, 9, 22])
assert _r == 1, f"expected 1 (8 and 9), got {_r}"` },
          { id: "t2", description: "two prices", assertionCode: `_r = smallest_gap([40, 12])
assert _r == 28, f"expected 28, got {_r}: the order in the input should not matter"` },
          { id: "t3", description: "duplicates and negatives", assertionCode: `_r = smallest_gap([5, -3, 9, 5])
assert _r == 0, f"two prices of 5 give a gap of 0, got {_r}"
_r = smallest_gap([-10, -4, 7])
assert _r == 6, f"expected 6 (-10 and -4), got {_r}"` },
          { id: "t4", description: "50,000 prices", assertionCode: `_xs = [(i * 7919) % 1000003 * 3 for i in range(50000)]
_xs.append(_xs[1234] + 1)
_r = smallest_gap(_xs)
assert _r == 1, f"expected 1, got {_r}"` },
        ],
        hints: ["`xs = sorted(prices)`, then loop `i` from 1 and look at `xs[i] - xs[i - 1]`.", "Keep the smallest difference you have seen in a variable that starts at `float('inf')`."],
      },
      {
        kind: "code",
        title: "The leaderboard",
        body: P(
          "Write `leaderboard(players)`. Each player is a `(name, score)` tuple. Return just the **names**, highest score first. Equal scores go in alphabetical order.",
          py(`
leaderboard([("zoe", 40), ("ann", 55), ("bob", 40)])
# ["ann", "bob", "zoe"]
`),
        ),
        language: "python",
        starter: `def leaderboard(players):
    # sort with a key, then keep only the names
    return [name for name, score in players]
`,
        solution: `def leaderboard(players):
    ranked = sorted(players, key=lambda p: (-p[1], p[0]))
    return [name for name, score in ranked]
`,
        tests: [
          { id: "t1", description: "the example", assertionCode: `_r = leaderboard([("zoe", 40), ("ann", 55), ("bob", 40)])
assert _r == ["ann", "bob", "zoe"], f"expected ['ann', 'bob', 'zoe'], got {_r}"` },
          { id: "t2", description: "ties are alphabetical, not reversed", assertionCode: `_r = leaderboard([("cy", 7), ("al", 7), ("bo", 7), ("di", 9)])
assert _r == ["di", "al", "bo", "cy"], f"expected ['di', 'al', 'bo', 'cy'], got {_r}: reverse=True would also flip the names"` },
          { id: "t3", description: "negative scores and an empty board", assertionCode: `_r = leaderboard([("a", -5), ("b", 0), ("c", -1)])
assert _r == ["b", "c", "a"], f"expected ['b', 'c', 'a'], got {_r}"
_r = leaderboard([])
assert _r == [], f"an empty board gives [], got {_r}"` },
        ],
        hints: ["A key of `(-score, name)` sorts by score high to low, then by name.", "`sorted(players, key=lambda p: (-p[1], p[0]))`, then take `p[0]` of each."],
      },
      {
        kind: "recap",
        points: [
          "Sorting puts close and equal items **side by side**, so a neighbour scan replaces an all-pairs check: O(n log n) instead of O(n²).",
          "Python's sort is **stable** and takes a `key`; a tuple key with a negated number gives mixed directions.",
          "Spot it: *closest*, *duplicates*, *group*, *in order of*, *schedule*.",
          "Pitfalls: sorting loses the original indexes, and n log n is too slow when the task demands O(n).",
        ],
      },
    ],
  },

  // ─────────────────────────────── 2. Merge sort ───────────────────────────────
  {
    id: "fnd-iv-sorting-2-merge-sort",
    title: "Merge sort and counting across halves",
    summary: "Split, sort the halves, merge with two pointers, and count out-of-order pairs while you merge.",
    minutes: 12,
    xp: 70,
    level: "Intermediate",
    steps: [
      {
        kind: "explain",
        title: "Split, sort, merge",
        body: P(
          "**Merge sort** splits the list in half, sorts each half the same way, and then **merges** the two sorted halves. A list of one item is already sorted, so the splitting stops there.",
          py(`
def merge_sort(xs):
    if len(xs) <= 1:
        return xs
    mid = len(xs) // 2
    return merge(merge_sort(xs[:mid]), merge_sort(xs[mid:]))
`),
          "Halving gives about **log₂ n** levels, and merging all the pieces on one level touches each item once, so the total is **O(n log n)** in every case: best, worst and average. It needs **O(n)** extra memory for the merged lists.",
          "Taking from the left half when two items are equal (`<=`) keeps it **stable**. Merge sort is the natural choice for linked lists (no random access needed) and for data too big for memory (merge sorted chunks from disk).",
          "**How to spot it in an interview:** besides plain sorting, the *merge step* can count things between the two halves: pairs that are out of order, or how many later items are smaller than each item.",
        ),
      },
      {
        kind: "question",
        title: "One merge, step by step",
        body: "The left half `[2, 5, 8]` and the right half `[1, 6, 9]` are already sorted (shown side by side). At each stop, tap the value that goes to the output next.",
        widget: {
          type: "iv-trace",
          props: {
            title: "Merging two sorted halves",
            frames: [
              { array: [2, 5, 8, 1, 6, 9], pointers: { i: 0, j: 3 }, highlight: [0, 3], code: MERGE_CODE, line: 3, stacks: [{ label: "out", items: [], kind: "queue" }], note: "Compare the front of each half: `2` and `1`.", pick: { prompt: "Which value goes to the output first?", answer: 3 } },
              { pointers: { i: 0, j: 4 }, highlight: [0, 4], done: [3], line: 6, stacks: [{ label: "out", items: [1], kind: "queue" }], note: "`1` is smaller, so it goes out and `j` moves on. Now `2` against `6`." },
              { pointers: { i: 1, j: 4 }, highlight: [1, 4], done: [0, 3], line: 4, stacks: [{ label: "out", items: [1, 2], kind: "queue" }], note: "`2` went out. Now `5` against `6`.", pick: { prompt: "Which value goes next?", answer: 1 } },
              { pointers: { i: 2, j: 4 }, highlight: [2, 4], done: [0, 1, 3], line: 3, stacks: [{ label: "out", items: [1, 2, 5], kind: "queue" }], note: "`5` went out. Now `8` against `6`.", pick: { prompt: "And next?", answer: 4 } },
              { pointers: { i: 2, j: 5 }, highlight: [2, 5], done: [0, 1, 3, 4], line: 6, stacks: [{ label: "out", items: [1, 2, 5, 6], kind: "queue" }], note: "`6` went out. `8` against `9`: take `8`." },
              { pointers: { j: 5 }, highlight: [5], done: [0, 1, 2, 3, 4], line: 7, stacks: [{ label: "out", items: [1, 2, 5, 6, 8], kind: "queue" }], note: "The left half is used up. Whatever is left on the right is already sorted, so copy it." },
              { done: [0, 1, 2, 3, 4, 5], line: 7, stacks: [{ label: "out", items: [1, 2, 5, 6, 8, 9], kind: "queue" }], note: "Merged: **[1, 2, 5, 6, 8, 9]**, one comparison per item taken (at most)." },
            ],
          },
        },
        question: { type: "widget", goal: { picked: true }, prompt: "Answer the three picks.", hint: "Only the two front items can be the next smallest; take the smaller one." },
        explanation: "Each step compares only the two fronts and takes the smaller, so a merge of n items is **O(n)**. When one side runs out, the rest of the other side is copied as it is.",
      },
      {
        kind: "question",
        title: "How deep?",
        body: "Merge sort splits a list of **16** items in half again and again until every piece has one item. How many levels of merging does it take to put them back together?",
        question: { type: "number", answer: 4, hint: "How many times can you halve 16 before you reach 1?", unit: "levels" },
        explanation: "16 → 8 → 4 → 2 → 1 is four halvings, so **4** levels of merges (1s into 2s, 2s into 4s, 4s into 8s, 8s into 16). Each level touches all 16 items: 16 × 4 = n log₂ n.",
      },
      {
        kind: "question",
        title: "`<=` or `<`?",
        body: "In the merge, the test is `if a[i] <= b[j]`. What happens if you change it to `<`?",
        question: {
          type: "choice",
          options: [
            "It still sorts, but equal items may swap order: not stable.",
            "It stops sorting correctly when there are duplicates.",
            "It becomes faster, since fewer items are compared.",
            "Nothing at all changes; the two are the same.",
          ],
          answer: 0,
          feedback: { 1: "Equal items still come out next to each other, so the result is sorted.", 2: "Exactly the same number of comparisons happen." },
          hint: "Think about two equal keys, one in each half. Which one leaves first in each version?",
        },
        explanation: "With `<`, a tie takes the right-hand item first, so equal items can swap their original order. The output is still sorted; it is just no longer **stable**, which matters when sorting records by one field.",
      },
      {
        kind: "explain",
        title: "Counting out-of-order pairs",
        body: P(
          "An **inversion** is a pair of positions `i < j` with `xs[i] > xs[j]`. It measures how far a list is from sorted: 0 for sorted, n(n − 1)/2 for reversed. Two people's rankings of the same films disagree on exactly as many pairs as there are inversions.",
          "Checking all pairs is O(n²). The merge step counts them for free: when an item from the **right** half is taken, every item still waiting in the **left** half is bigger than it and came before it. That is `len(a) - i` inversions at once.",
          txt(`
left  [2, 5, 8]    right [1, 6, 9]
take 1 from right: 2, 5, 8 still wait   -> +3
take 2, take 5 from left                -> +0
take 6 from right: 8 still waits        -> +1
take 8, take 9                          -> +0
pairs between the halves: 4
`),
          "Add the inversions inside each half (counted by the recursive calls) and you get the total in **O(n log n)**.",
        ),
      },
      {
        kind: "question",
        title: "Count them by hand",
        body: "How many inversions does `[4, 1, 3, 2]` have? (Pairs of positions where the earlier value is bigger.)",
        question: { type: "number", answer: 4, hint: "List every pair (earlier, later) and keep the ones where the earlier value is bigger.", unit: "pairs" },
        explanation: "(4, 1), (4, 3), (4, 2) and (3, 2): **4** inversions. (1, 3), (1, 2) are in order.",
      },
      {
        kind: "code",
        title: "Write the merge",
        body: "Write `merge(a, b)`: both lists are sorted; return one sorted list with every item of both. Do it with two pointers in one pass (no `sorted`, no `.sort()`). Keep it stable: on a tie, take from `a` first.",
        language: "python",
        starter: `def merge(a, b):
    i, j, out = 0, 0, []
    # walk both lists, always taking the smaller front item
    return out
`,
        solution: `def merge(a, b):
    i, j, out = 0, 0, []
    while i < len(a) and j < len(b):
        if a[i] <= b[j]:
            out.append(a[i])
            i += 1
        else:
            out.append(b[j])
            j += 1
    out.extend(a[i:])
    out.extend(b[j:])
    return out
`,
        tests: [
          { id: "t1", description: "the traced example", assertionCode: `_r = merge([2, 5, 8], [1, 6, 9])
assert _r == [1, 2, 5, 6, 8, 9], f"expected [1, 2, 5, 6, 8, 9], got {_r}"` },
          { id: "t2", description: "one side empty, or uneven lengths", assertionCode: `_r = merge([], [3, 4])
assert _r == [3, 4], f"merge([], [3, 4]) should be [3, 4], got {_r}: copy what is left"
_r = merge([1, 2, 10, 11, 12], [5])
assert _r == [1, 2, 5, 10, 11, 12], f"expected [1, 2, 5, 10, 11, 12], got {_r}"` },
          { id: "t3", description: "duplicates and negatives", assertionCode: `_r = merge([-3, 0, 0, 7], [-3, 0, 8])
assert _r == [-3, -3, 0, 0, 0, 7, 8], f"expected [-3, -3, 0, 0, 0, 7, 8], got {_r}"` },
          { id: "t4", description: "stable on ties", assertionCode: `class _K:
    def __init__(self, k, tag): self.k, self.tag = k, tag
    def __le__(self, o): return self.k <= o.k
    def __lt__(self, o): return self.k < o.k
_r = merge([_K(1, "a1"), _K(2, "a2")], [_K(1, "b1"), _K(2, "b2")])
_tags = [x.tag for x in _r] if isinstance(_r, list) else _r
assert _tags == ["a1", "b1", "a2", "b2"], f"expected tags a1 b1 a2 b2, got {_tags}: on a tie take from a first"` },
        ],
        hints: ["Loop while both `i < len(a)` and `j < len(b)`; append the smaller front item and move that pointer.", "After the loop one list is used up; add `a[i:]` and `b[j:]`."],
      },
      {
        kind: "code",
        title: "How much do two rankings disagree?",
        body: P(
          "Two friends rank the same films. After relabelling, your friend's list is a list of distinct numbers, and every pair that is out of order is a pair you disagree on. Write `disagreements(order)`: the number of inversions.",
          "The last test has 6,000 films (about 18 million pairs), so count them during a merge sort instead of checking pairs.",
        ),
        language: "python",
        starter: `def disagreements(order):
    # merge sort the list; while merging, when you take from the
    # right half, add the number of items still waiting on the left
    pass
`,
        solution: `def disagreements(order):
    def sort(xs):
        if len(xs) <= 1:
            return xs, 0
        mid = len(xs) // 2
        a, ca = sort(xs[:mid])
        b, cb = sort(xs[mid:])
        out, i, j, c = [], 0, 0, ca + cb
        while i < len(a) and j < len(b):
            if a[i] <= b[j]:
                out.append(a[i])
                i += 1
            else:
                out.append(b[j])
                j += 1
                c += len(a) - i
        out.extend(a[i:])
        out.extend(b[j:])
        return out, c

    return sort(list(order))[1]
`,
        tests: [
          { id: "t1", description: "small lists", assertionCode: `_r = disagreements([2, 4, 1, 3, 5])
assert _r == 3, f"expected 3: (2,1), (4,1), (4,3); got {_r}"
_r = disagreements([4, 1, 3, 2])
assert _r == 4, f"expected 4, got {_r}"` },
          { id: "t2", description: "sorted, empty and one item", assertionCode: `for _xs, _want in [([1, 2, 3], 0), ([], 0), ([9], 0)]:
    _r = disagreements(_xs)
    assert _r == _want, f"disagreements({_xs}) should be {_want}, got {_r}"` },
          { id: "t3", description: "fully reversed", assertionCode: `_r = disagreements([5, 4, 3, 2, 1])
assert _r == 10, f"a reversed list of 5 has 5*4/2 = 10 inversions, got {_r}"` },
          { id: "t4", description: "6,000 films", assertionCode: `_xs = [(i * 7919) % 6007 for i in range(6000)]
_r = disagreements(_xs)
assert _r == 8994146, f"expected 8994146, got {_r}"
_r = disagreements(list(range(6000, 0, -1)))
assert _r == 17997000, f"a reversed list of 6,000 has 17997000 inversions, got {_r}"` },
        ],
        hints: ["Write a helper that returns `(sorted_list, count)` for a list, and call it on each half.", "In the merge, when `b[j]` is taken, every one of `a[i:]` is bigger and came earlier: add `len(a) - i`."],
      },
      {
        kind: "recap",
        points: [
          "**Merge sort**: split in half, sort each half, merge with two pointers. O(n log n) always, O(n) extra memory, stable with `<=`.",
          "A merge of two sorted lists is O(n) and is a pattern of its own (merging sorted logs, lists, files).",
          "The merge step can **count across the halves**: taking from the right adds `len(left) - i` inversions.",
          "Spot it: *how many pairs are out of order*, *how many later items are smaller*, *sort a linked list*.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 3. Quickselect ───────────────────────────────
  {
    id: "fnd-iv-sorting-3-quickselect",
    title: "Quickselect: the k-th smallest without sorting",
    summary: "Partition around a pivot, keep only the side that holds the answer, and get O(n) on average.",
    minutes: 12,
    xp: 70,
    level: "Intermediate",
    steps: [
      {
        kind: "explain",
        title: "Partition, then keep one side",
        body: P(
          "To find the **k-th smallest** item you do not need the whole list in order. **Partitioning** picks a **pivot** and rearranges the list so everything smaller is on its left and everything else on its right. The pivot then sits exactly where it would be after a full sort, at some index `p`.",
          "If `p` is the index you want, you are done. If not, the answer is on **one** side, so you only continue there. That is **quickselect**. Quicksort would recurse into both sides; quickselect throws one away.",
          "On average each round keeps about half: n + n/2 + n/4 + … ≈ **2n**, so **O(n)**. With unlucky pivots (the largest every time, for example the last item of a sorted list) each round only removes one item: **O(n²)**. Choosing the pivot **at random** makes that practically impossible.",
          "**How to spot it:** *k-th largest*, *k-th smallest*, *median*, *the k closest* when their order does not matter. Alternatives: sort, O(n log n); a heap of size k, O(n log k).",
          "**Pitfalls:** the k-th **largest** is index `n - k` in ascending order. Many equal values make a two-way partition slow, so split into *less*, *equal* and *greater*.",
        ),
      },
      {
        kind: "question",
        title: "A partition, step by step",
        body: "This is the Lomuto partition: the pivot is the last item, and `i` marks where the next small item goes. Step through it and answer the picks.",
        widget: {
          type: "iv-trace",
          props: {
            title: "Partition around the pivot 5",
            frames: [
              { array: [7, 2, 9, 4, 3, 8, 5], pointers: { i: 0, j: 0 }, highlight: [0, 6], code: LOMUTO_CODE, line: 4, vars: { pivot: 5 }, note: "Pivot `5`. `7 < 5`? No, so nothing moves." },
              { pointers: { i: 0, j: 1 }, highlight: [1], line: 5, note: "`2 < 5`: swap it into position `i`, then move `i` on." },
              { array: [2, 7, 9, 4, 3, 8, 5], pointers: { i: 1, j: 2 }, highlight: [2], line: 4, note: "`2` is in place. `9 < 5`? No." },
              { pointers: { i: 1, j: 3 }, highlight: [3], line: 5, note: "`4 < 5`, so it swaps with the cell at `i`.", pick: { prompt: "Which index does `4` move to?", answer: 1 } },
              { array: [2, 4, 9, 7, 3, 8, 5], pointers: { i: 2, j: 4 }, highlight: [4], line: 5, note: "`3 < 5`: swap with index 2." },
              { array: [2, 4, 3, 7, 9, 8, 5], pointers: { i: 3, j: 5 }, highlight: [5], line: 4, note: "`8 < 5`? No. The loop is over." },
              { pointers: { i: 3 }, highlight: [3, 6], line: 7, note: "Everything left of `i` is smaller than 5. Swap the pivot into place.", pick: { prompt: "Where does the pivot end up?", answer: 3 } },
              { array: [2, 4, 3, 5, 9, 8, 7], highlight: [3], done: [3], line: 8, note: "`5` is at index 3: the 4th smallest, exactly where a full sort would put it. Left: smaller. Right: bigger." },
            ],
          },
        },
        question: { type: "widget", goal: { picked: true }, prompt: "Answer both picks.", hint: "Small items are swapped into position `i`, and the pivot finally swaps into `i` too." },
        explanation: "One pass, n − 1 comparisons, and the pivot lands at its final index. The two sides are *not* sorted, and quickselect never needs them to be.",
      },
      {
        kind: "question",
        title: "Which side next?",
        body: "After that partition the list is `[2, 4, 3, 5, 9, 8, 7]` with the pivot at index 3. You want the **2nd largest** value. What does quickselect do next?",
        question: {
          type: "choice",
          options: [
            "Return 5: the pivot is always the answer.",
            "Partition the left part, indexes 0 to 2.",
            "Partition both parts and compare the results.",
            "Partition the right part, indexes 4 to 6.",
          ],
          answer: 3,
          feedback: { 1: "The 2nd largest of 7 items is at ascending index 7 − 2 = 5, which is right of the pivot." },
          hint: "The 2nd largest of 7 is the item that would sit at index 7 − 2 in sorted order. Is that left or right of 3?",
        },
        explanation: "The target index is 7 − 2 = **5**, and 5 > 3, so only indexes 4 to 6 can hold it. (It is 8.) The left side is never looked at again.",
      },
      {
        kind: "question",
        title: "The bad day",
        body: "Quickselect always uses the **last** item as the pivot. Which input makes it slowest when you ask for the smallest item?",
        question: {
          type: "choice",
          options: [
            "A list in random order.",
            "A list that is already sorted.",
            "A list where the smallest item is first.",
            "A short list of only three items.",
          ],
          answer: 1,
          hint: "On which input is the last item the biggest every time, so a partition only removes one item?",
        },
        explanation: "On sorted input the last item is the maximum, so each partition peels off one item: n + (n − 1) + … = **O(n²)**. A random pivot fixes this; so does shuffling first.",
      },
      {
        kind: "question",
        title: "Halving the work",
        body: "If each partition keeps half of what is left, quickselect on 1,000 items looks at about 1,000 + 500 + 250 + … items in total. Find that total, roughly.",
        question: { type: "number", answer: 2000, tolerance: 10, hint: "1 + 1/2 + 1/4 + … adds up to 2.", unit: "looks" },
        explanation: "The halves add up to almost **2,000**: twice n. That is why the average is O(n), even though one partition alone is already O(n).",
      },
      {
        kind: "code",
        title: "Write the partition",
        body: P(
          "Write `partition(a, lo, hi)`: use `a[hi]` as the pivot, rearrange `a[lo..hi]` **in place** so that items smaller than the pivot come first, put the pivot right after them, and return the pivot's new index. Do not touch anything outside `lo..hi`.",
          py(`
a = [7, 2, 9, 4, 3, 8, 5]
partition(a, 0, 6)   # 3, and a[:3] are all < 5, a[4:] are all >= 5
`),
        ),
        language: "python",
        starter: `def partition(a, lo, hi):
    pivot = a[hi]
    i = lo
    # move every item smaller than pivot to position i, then place the pivot
    pass
`,
        solution: `def partition(a, lo, hi):
    pivot = a[hi]
    i = lo
    for j in range(lo, hi):
        if a[j] < pivot:
            a[i], a[j] = a[j], a[i]
            i += 1
    a[i], a[hi] = a[hi], a[i]
    return i
`,
        tests: [
          { id: "t1", description: "the traced example", assertionCode: `_a = [7, 2, 9, 4, 3, 8, 5]
_p = partition(_a, 0, 6)
assert _p == 3, f"the pivot 5 should end at index 3, got {_p}"
assert _a[3] == 5 and all(x < 5 for x in _a[:3]) and all(x >= 5 for x in _a[4:]), f"expected smaller items, then 5, then the rest; got {_a}"` },
          { id: "t2", description: "only the lo..hi part moves", assertionCode: `_a = [100, 9, 1, 8, 2, 6, -100]
_p = partition(_a, 1, 5)
assert _p == 3, f"pivot 6 has two smaller items in a[1..5], so it lands at index 3; got {_p}"
assert _a[0] == 100 and _a[6] == -100, f"items outside lo..hi must not move, got {_a}"
assert sorted(_a[1:6]) == [1, 2, 6, 8, 9] and all(x < 6 for x in _a[1:3]) and all(x >= 6 for x in _a[4:6]), f"got {_a}"` },
          { id: "t3", description: "pivot is the smallest or the largest", assertionCode: `_a = [4, 5, 6, 1]
_p = partition(_a, 0, 3)
assert _p == 0 and _a[0] == 1, f"pivot 1 is the smallest, so it lands at 0; got index {_p}, list {_a}"
_a = [4, 2, 3, 9]
_p = partition(_a, 0, 3)
assert _p == 3 and _a[3] == 9, f"pivot 9 is the largest, so it stays at 3; got index {_p}, list {_a}"` },
          { id: "t4", description: "duplicates of the pivot", assertionCode: `_a = [5, 1, 5, 2, 5]
_p = partition(_a, 0, 4)
assert _p == 2 and _a[2] == 5, f"two items are smaller than 5, so the pivot lands at 2; got index {_p}, list {_a}"
assert sorted(_a) == [1, 2, 5, 5, 5], f"no items may be lost or added, got {_a}"` },
        ],
        hints: ["Loop `j` from `lo` to `hi - 1`. When `a[j] < pivot`, swap `a[i]` and `a[j]` and add one to `i`.", "After the loop, swap `a[i]` with `a[hi]` and return `i`."],
      },
      {
        kind: "code",
        title: "The k-th cheapest flight",
        body: P(
          "Write `kth_smallest(prices, k)`: the k-th smallest price (`k = 1` is the cheapest). Use quickselect with a **random** pivot and split into *less*, *equal* and *greater* so repeated prices stay fast. Do not change the list you are given.",
          "The last tests are 50,000 sorted prices and 50,000 equal prices: a last-item pivot or a two-way split would take far too long.",
        ),
        language: "python",
        starter: `import random

def kth_smallest(prices, k):
    # pick a random pivot, split into less / equal / greater,
    # then keep only the part that holds the k-th item
    pass
`,
        solution: `import random

def kth_smallest(prices, k):
    xs = prices
    while True:
        pivot = random.choice(xs)
        less = [x for x in xs if x < pivot]
        equal = [x for x in xs if x == pivot]
        if k <= len(less):
            xs = less
        elif k <= len(less) + len(equal):
            return pivot
        else:
            k -= len(less) + len(equal)
            xs = [x for x in xs if x > pivot]
`,
        tests: [
          { id: "t1", description: "every k of a small list", assertionCode: `_xs = [7, 2, 9, 4, 3, 8, 5]
for _k in range(1, 8):
    _r = kth_smallest(_xs, _k)
    assert _r == sorted(_xs)[_k - 1], f"kth_smallest({_xs}, {_k}) should be {sorted(_xs)[_k - 1]}, got {_r}"
assert _xs == [7, 2, 9, 4, 3, 8, 5], "the input list must not change"` },
          { id: "t2", description: "one item, negatives and duplicates", assertionCode: `_r = kth_smallest([42], 1)
assert _r == 42, f"expected 42, got {_r}"
_r = kth_smallest([3, -1, 3, -1, 0], 3)
assert _r == 0, f"sorted it is [-1, -1, 0, 3, 3], so the 3rd is 0; got {_r}"
_r = kth_smallest([3, -1, 3, -1, 0], 5)
assert _r == 3, f"the 5th smallest is 3, got {_r}"` },
          { id: "t3", description: "50,000 sorted prices", assertionCode: `_xs = list(range(50000))
_r = kth_smallest(_xs, 1)
assert _r == 0, f"expected 0, got {_r}"
_r = kth_smallest(_xs, 31337)
assert _r == 31336, f"expected 31336, got {_r}"` },
          { id: "t4", description: "50,000 equal prices", assertionCode: `_r = kth_smallest([7] * 50000, 25000)
assert _r == 7, f"expected 7, got {_r}: put the items equal to the pivot in their own group"` },
        ],
        hints: ["`pivot = random.choice(xs)`, then build `less`, `equal` and `greater` with list comprehensions.", "If `k <= len(less)` look in `less`; if it is within the equal group, return the pivot; otherwise subtract both sizes from `k` and look in `greater`."],
      },
      {
        kind: "recap",
        points: [
          "**Partition** puts the pivot at its final sorted index with smaller items on the left, in one O(n) pass.",
          "**Quickselect** keeps only the side that holds index k: O(n) on average, O(n²) with bad pivots, so pick the pivot at random.",
          "The k-th **largest** is ascending index `n - k`. Many duplicates need a three-way split.",
          "Spot it: *k-th smallest or largest*, *median*, *k closest in any order*. Compare with sorting (n log n) and a size-k heap (n log k).",
        ],
      },
    ],
  },

  // ─────────────────────────────── 4. Counting sort ───────────────────────────────
  {
    id: "fnd-iv-sorting-4-counting-sort",
    title: "Counting sort: when keys are small numbers",
    summary: "Count each value, then rebuild: O(n + k) with no comparisons, and stable with prefix sums.",
    minutes: 10,
    xp: 60,
    level: "Intermediate",
    steps: [
      {
        kind: "explain",
        title: "Count instead of compare",
        body: P(
          "Comparison sorts cannot beat about n log n comparisons. But if every value is a small whole number, say a score from 0 to 100, you do not need to compare at all. **Counting sort** makes a list of `k` counters, one per possible value, counts how often each value appears, and writes the values out in order.",
          py(`
count = [0] * 101
for s in scores:
    count[s] += 1
out = []
for v in range(101):
    out += [v] * count[v]
`),
          "That is **O(n + k)** time and **O(k)** extra space. When k is small (ages, letters, exam marks, days of the month) it beats any comparison sort.",
          "**How to spot it:** the statement bounds the values: *between 0 and 100*, *lowercase letters*, *at most 1,000*. Also when you only need counts per value, not a full sort.",
          "**Pitfalls:** values up to 10⁹ need a billion counters, so do not. Negative values need an offset: use `count[x - lo]` where `lo` is the minimum.",
        ),
      },
      {
        kind: "question",
        title: "Fill the counters",
        body: "The values are `[3, 1, 4, 1, 0, 3, 3]`, all between 0 and 4, so there are 5 counters (shown as the array). Step through the counting and answer the picks.",
        widget: {
          type: "iv-trace",
          props: {
            title: "Counting values from 0 to 4",
            frames: [
              { array: [0, 0, 0, 0, 0], code: COUNT_CODE, line: 1, vars: { x: "-" }, note: "One counter per possible value, all 0. Index = value." },
              { array: [0, 0, 0, 1, 0], highlight: [3], line: 3, vars: { x: 3 }, note: "`x = 3`: add one to `count[3]`." },
              { array: [0, 1, 0, 1, 0], highlight: [1], line: 3, vars: { x: 1 }, note: "`x = 1`." },
              { line: 3, vars: { x: 4 }, note: "Next value: 4.", pick: { prompt: "Which counter goes up for `x = 4`?", answer: 4 } },
              { array: [0, 1, 0, 1, 1], highlight: [4], line: 3, vars: { x: 4 }, note: "`count[4]` is 1." },
              { array: [1, 2, 0, 3, 1], highlight: [0, 1, 3], line: 3, vars: { x: "done" }, note: "After `1, 0, 3, 3`: the counts are 1, 2, 0, 3, 1." },
              { line: 6, vars: { out: "0 1 1" }, note: "Write the values out: one `0`, two `1`s. `count[2]` is 0, so it writes nothing.", pick: { prompt: "Which counter writes the next value?", answer: 3 } },
              { done: [0, 1, 2, 3, 4], line: 6, vars: { out: "0 1 1 3 3 3 4" }, note: "Sorted: **[0, 1, 1, 3, 3, 3, 4]** with 7 + 5 steps and no comparisons." },
            ],
          },
        },
        question: { type: "widget", goal: { picked: true }, prompt: "Answer both picks.", hint: "The counter's index is the value itself." },
        explanation: "One pass counts, one pass over the k counters writes. Empty counters, like `count[2]`, cost a step but write nothing.",
      },
      {
        kind: "explain",
        title: "Keeping records in order: prefix sums",
        body: P(
          "Writing `[v] * count[v]` works for bare numbers. To sort **records** by a small key (parcels by floor, people by age) you must move the records themselves, and keep equal keys in their original order so the sort is **stable**.",
          "Turn the counts into **starting positions** with a running total, then walk the input from left to right and drop each record at its key's position, moving that position on by one.",
          txt(`
value:   0  1  2  3  4
count:   1  2  0  3  1
start:   0  1  3  3  6     (start[v] = how many records have a smaller key)
`),
          "Stability is what lets counting sort be the inner step of radix sort (two lessons on).",
        ),
      },
      {
        kind: "question",
        title: "Where does the first 3 go?",
        body: "With the counts above (1, 2, 0, 3, 1 for values 0 to 4), at which output index does the **first** record with key 3 land? Type the index.",
        question: { type: "number", answer: 3, hint: "Count how many records have a key smaller than 3." },
        explanation: "Keys 0, 1 and 2 account for 1 + 2 + 0 = **3** records, so the first 3 goes to index 3, the next to 4 and the last to 5.",
      },
      {
        kind: "question",
        title: "Wrong tool",
        body: "For which input is counting sort a **bad** idea?",
        question: {
          type: "choice",
          options: [
            "A million ages of people, from 0 to 120.",
            "The letters of a long text, a to z.",
            "Ten thousand IDs between 1 and 4 billion.",
            "Exam marks from 0 to 100 for a whole country.",
          ],
          answer: 2,
          hint: "Compare k, the number of possible values, with n.",
        },
        explanation: "Four billion counters for ten thousand items is a huge waste: k dwarfs n. Use a comparison sort there, or radix sort.",
      },
      {
        kind: "question",
        title: "The cost",
        body: "n values, each a whole number from 0 to k − 1. What does counting sort cost?",
        question: {
          type: "choice",
          options: ["O(n + k) time, O(k) extra space", "O(n log n) time, O(1) extra space", "O(n · k) time, O(n) extra space", "O(k log k) time, O(n) extra space"],
          answer: 0,
          hint: "One pass over the n values, one pass over the k counters.",
        },
        explanation: "Counting is O(n), writing out visits all k counters, so **O(n + k)**, with O(k) for the counters (plus O(n) for the output when sorting records).",
      },
      {
        kind: "code",
        title: "Sort exam marks",
        body: "Write `sort_marks(marks)`: every mark is a whole number from 0 to 100. Return them sorted, using counting (no `sorted`, no `.sort()`).",
        language: "python",
        starter: `def sort_marks(marks):
    count = [0] * 101
    # count each mark, then write them out in order
    return []
`,
        solution: `def sort_marks(marks):
    count = [0] * 101
    for m in marks:
        count[m] += 1
    out = []
    for v in range(101):
        out.extend([v] * count[v])
    return out
`,
        tests: [
          { id: "t1", description: "a small class", assertionCode: `_r = sort_marks([72, 15, 100, 0, 72, 64])
assert _r == [0, 15, 64, 72, 72, 100], f"expected [0, 15, 64, 72, 72, 100], got {_r}"` },
          { id: "t2", description: "empty and all equal", assertionCode: `_r = sort_marks([])
assert _r == [], f"no marks gives [], got {_r}"
_r = sort_marks([50, 50, 50])
assert _r == [50, 50, 50], f"expected [50, 50, 50], got {_r}"` },
          { id: "t3", description: "200,000 marks", assertionCode: `_xs = [(i * 37) % 101 for i in range(200000)]
_r = sort_marks(_xs)
assert isinstance(_r, list) and len(_r) == 200000, "every mark must be in the output"
assert _r == sorted(_xs), "the output should be sorted"` },
        ],
        hints: ["`count[m] += 1` for each mark.", "Then for each value `v` from 0 to 100, add `count[v]` copies of `v` to the output."],
      },
      {
        kind: "code",
        title: "Parcels by floor",
        body: P(
          "A delivery robot gets parcels as `(parcel_id, floor)` pairs, floors from 0 to `top`. Write `by_floor(parcels, top)`: the parcel ids ordered by floor, keeping the original order for parcels on the same floor. Use counts and starting positions.",
          py(`
by_floor([("p1", 2), ("p2", 0), ("p3", 2), ("p4", 1)], 2)
# ["p2", "p4", "p1", "p3"]
`),
        ),
        language: "python",
        starter: `def by_floor(parcels, top):
    count = [0] * (top + 1)
    # 1. count parcels per floor
    # 2. turn counts into starting positions
    # 3. place each parcel at its floor's position
    return [pid for pid, floor in parcels]
`,
        solution: `def by_floor(parcels, top):
    count = [0] * (top + 1)
    for _, floor in parcels:
        count[floor] += 1
    start, total = [0] * (top + 1), 0
    for f in range(top + 1):
        start[f] = total
        total += count[f]
    out = [None] * len(parcels)
    for pid, floor in parcels:
        out[start[floor]] = pid
        start[floor] += 1
    return out
`,
        tests: [
          { id: "t1", description: "the example", assertionCode: `_r = by_floor([("p1", 2), ("p2", 0), ("p3", 2), ("p4", 1)], 2)
assert _r == ["p2", "p4", "p1", "p3"], f"expected ['p2', 'p4', 'p1', 'p3'], got {_r}"` },
          { id: "t2", description: "same floor keeps arrival order", assertionCode: `_r = by_floor([("z", 1), ("a", 1), ("m", 0), ("b", 1)], 3)
assert _r == ["m", "z", "a", "b"], f"expected ['m', 'z', 'a', 'b'], got {_r}: ids on one floor stay in arrival order, not alphabetical"` },
          { id: "t3", description: "no parcels, and empty floors", assertionCode: `_r = by_floor([], 5)
assert _r == [], f"expected [], got {_r}"
_r = by_floor([("x", 5), ("y", 0)], 5)
assert _r == ["y", "x"], f"expected ['y', 'x'], got {_r}"` },
        ],
        hints: ["`start[f]` is the number of parcels on floors below `f`: a running total of the counts.", "Walk the parcels in order: `out[start[floor]] = pid`, then `start[floor] += 1`."],
      },
      {
        kind: "recap",
        points: [
          "**Counting sort**: one counter per possible value, count, then write out. **O(n + k)**, no comparisons.",
          "To sort records stably, turn counts into **starting positions** (a running total) and place items left to right.",
          "Spot it: values are bounded and small (*0 to 100*, *a to z*, *ages*).",
          "Pitfalls: a huge range k wastes memory and time; negatives need an offset.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 5. Bucket sort ───────────────────────────────
  {
    id: "fnd-iv-sorting-5-bucket-sort",
    title: "Buckets: by range and by frequency",
    summary: "Spread items into buckets: the k most frequent in O(n), and the widest gap with the pigeonhole trick.",
    minutes: 12,
    xp: 70,
    level: "Advanced",
    steps: [
      {
        kind: "explain",
        title: "Spread them out",
        body: P(
          "**Bucket sort** divides the range of values into buckets, drops each item into its bucket, sorts each (small) bucket, and joins them. For values spread evenly, each bucket holds a handful and the whole thing is **O(n)** on average. If the data is lopsided and everything lands in one bucket, you are back to an ordinary sort.",
          "In interviews the bucket idea shows up in two clever forms:",
          "- **Frequency buckets.** A count is between 1 and n, so make n + 1 buckets indexed by count, put each item in the bucket for its count, and read from the top. The k most frequent items come out in **O(n)**, with no sort.\n- **Pigeonhole buckets.** n values spread over a range leave n − 1 gaps, so the widest gap is at least range / (n − 1). Make buckets that narrow and the widest gap can never be inside one bucket: you only need each bucket's min and max.",
          "**How to spot it:** *top k most frequent*, *most common*, *largest gap between sorted values in linear time*, uniformly spread values.",
        ),
      },
      {
        kind: "question",
        title: "The most played songs",
        body: "A radio log has 7 plays: `a b a c a b d`. Step through the frequency buckets and answer the pick.",
        widget: {
          type: "iv-trace",
          props: {
            title: "Buckets indexed by play count",
            frames: [
              { array: [null, null, null, null, null, null, null, null], code: FREQ_CODE, line: 2, vars: { a: 3, b: 2, c: 1, d: 1 }, note: "Counts first (a 3, b 2, c 1, d 1). A count is at most 7, so 8 buckets, index = count." },
              { array: [null, null, null, "a", null, null, null, null], highlight: [3], line: 4, note: "`a` played 3 times: bucket 3." },
              { line: 4, note: "Next is `b`.", pick: { prompt: "Which bucket does `b` go into?", answer: 2 } },
              { array: [null, "c d", "b", "a", null, null, null, null], highlight: [1, 2], line: 4, note: "`b` in bucket 2; `c` and `d` share bucket 1." },
              { range: [3, 7], highlight: [3], line: 6, vars: { top: "a" }, note: "For the top 2, walk down from bucket 7. Buckets 7 to 4 are empty; bucket 3 gives `a`." },
              { range: [2, 7], highlight: [2], done: [3], line: 6, vars: { top: "a b" }, note: "Bucket 2 gives `b`. Two found: **a, b**. No sort needed." },
            ],
          },
        },
        question: { type: "widget", goal: { picked: true }, prompt: "Answer the pick.", hint: "The bucket index is the play count." },
        explanation: "Counting is O(n), the buckets are O(n), and the walk down is O(n): the top k in **O(n)**, beating sort (n log n) and a heap (n log k).",
      },
      {
        kind: "question",
        title: "Why n + 1 buckets?",
        body: "For frequency buckets over a list of n items, why are n + 1 buckets always enough?",
        question: {
          type: "choice",
          options: [
            "Because there are at most n different items.",
            "No item can appear more than n times.",
            "Because Python lists start at index 0 and end at n.",
            "Because each bucket holds at most one item.",
          ],
          answer: 1,
          feedback: { 3: "One bucket can hold many items with the same count, like `c d` in the trace." },
          hint: "The bucket index is a count. What is the biggest count possible?",
        },
        explanation: "A count can be anything from 1 to n (one item repeated n times), so indexes 0 to n cover every case. Bucket 0 is simply never used.",
      },
      {
        kind: "question",
        title: "The pigeonhole bound",
        body: "Five readings lie between 10 and 50 (10 and 50 are among them). Sorted, there are four gaps between neighbours. Find the smallest value the **widest** gap could possibly have.",
        question: { type: "number", answer: 10, hint: "Four gaps add up to 50 − 10. Can they all be smaller than the average?" },
        explanation: "The four gaps add up to 40, so at least one is ≥ 40 / 4 = **10** (with 10, 20, 30, 40, 50 they are all exactly 10). Buckets of width 10 therefore never hide the widest gap inside them.",
      },
      {
        kind: "question",
        title: "When buckets fail",
        body: "Bucket sort with 100 equal-width buckets over the range of the data. Which input is the worst for it?",
        question: {
          type: "choice",
          options: [
            "Values spread evenly between 0 and 1.",
            "Values that are already sorted.",
            "Only ten values in total.",
            "999 values near 0 and one value of a million.",
          ],
          answer: 3,
          hint: "Bucket sort is fast when each bucket gets a few items. When does one bucket get almost all of them?",
        },
        explanation: "The range is 0 to a million, so each bucket is 10,000 wide and the 999 small values all fall into bucket 0. That bucket needs a full sort: the O(n) promise only holds for evenly spread data.",
      },
      {
        kind: "code",
        title: "Top songs of the week",
        body: P(
          "Write `most_played(plays, k)`: the `k` songs that appear most often in `plays`, most plays first. Songs with the same count go in alphabetical order. Use frequency buckets (a `Counter` is fine for counting).",
          py(`
most_played(["a", "b", "a", "c", "a", "b", "d"], 3)
# ["a", "b", "c"]
`),
        ),
        language: "python",
        starter: `from collections import Counter

def most_played(plays, k):
    freq = Counter(plays)
    buckets = [[] for _ in range(len(plays) + 1)]
    # put each song in the bucket for its count, then walk down from the top
    return []
`,
        solution: `from collections import Counter

def most_played(plays, k):
    freq = Counter(plays)
    buckets = [[] for _ in range(len(plays) + 1)]
    for song, c in freq.items():
        buckets[c].append(song)
    out = []
    for c in range(len(plays), 0, -1):
        for song in sorted(buckets[c]):
            if len(out) == k:
                return out
            out.append(song)
    return out
`,
        tests: [
          { id: "t1", description: "the radio log", assertionCode: `_r = most_played(["a", "b", "a", "c", "a", "b", "d"], 3)
assert _r == ["a", "b", "c"], f"expected ['a', 'b', 'c'] (c and d tie, c first), got {_r}"` },
          { id: "t2", description: "k larger than the number of songs, and k = 0", assertionCode: `_r = most_played(["x", "y", "x"], 5)
assert _r == ["x", "y"], f"only two songs exist, expected ['x', 'y'], got {_r}"
_r = most_played(["x", "y", "x"], 0)
assert _r == [], f"k = 0 gives [], got {_r}"` },
          { id: "t3", description: "ties are alphabetical", assertionCode: `_r = most_played(["delta", "alpha", "charlie", "bravo", "charlie", "alpha"], 2)
assert _r == ["alpha", "charlie"], f"alpha and charlie both have 2 plays; expected ['alpha', 'charlie'], got {_r}"` },
          { id: "t4", description: "100,000 plays", assertionCode: `_plays = ["s" + str((i * i) % 997) for i in range(100000)]
_r = most_played(_plays, 1)
_c = Counter(_plays)
_best = min(_c, key=lambda s: (-_c[s], s))
assert _r == [_best], f"expected [{_best!r}], got {_r}"` },
        ],
        hints: ["`buckets[c].append(song)` for each song and its count `c`.", "Walk `c` from `len(plays)` down to 1, take songs from `sorted(buckets[c])`, and stop once you have `k`."],
      },
      {
        kind: "code",
        title: "The widest gap",
        body: P(
          "Write `widest_gap(readings)`: the largest difference between two neighbours once the readings are in sorted order. Fewer than two readings gives 0. Readings are whole numbers.",
          "Aim for O(n) with the pigeonhole trick: make `n - 1` buckets over the range, keep only each bucket's smallest and largest value, and compare each non-empty bucket's min with the previous non-empty bucket's max.",
        ),
        language: "python",
        starter: `def widest_gap(readings):
    if len(readings) < 2:
        return 0
    lo, hi = min(readings), max(readings)
    # buckets of width about (hi - lo) / (n - 1): track min and max per bucket
    pass
`,
        solution: `def widest_gap(readings):
    n = len(readings)
    if n < 2:
        return 0
    lo, hi = min(readings), max(readings)
    if lo == hi:
        return 0
    size = max(1, (hi - lo) // (n - 1))
    count = (hi - lo) // size + 1
    mins = [None] * count
    maxs = [None] * count
    for x in readings:
        b = (x - lo) // size
        if mins[b] is None or x < mins[b]:
            mins[b] = x
        if maxs[b] is None or x > maxs[b]:
            maxs[b] = x
    best, prev = 0, lo
    for b in range(count):
        if mins[b] is not None:
            best = max(best, mins[b] - prev)
            prev = maxs[b]
    return best
`,
        tests: [
          { id: "t1", description: "a few readings", assertionCode: `_r = widest_gap([13, 2, 40, 9, 21])
assert _r == 19, f"sorted: 2 9 13 21 40, widest gap 21 to 40 = 19; got {_r}"` },
          { id: "t2", description: "fewer than two, or all equal", assertionCode: `for _xs, _want in [([], 0), ([5], 0), ([4, 4, 4], 0)]:
    _r = widest_gap(_xs)
    assert _r == _want, f"widest_gap({_xs}) should be {_want}, got {_r}"` },
          { id: "t3", description: "negatives and duplicates", assertionCode: `_r = widest_gap([-10, 3, 3, -4, 0])
assert _r == 6, f"sorted: -10 -4 0 3 3, widest gap is 6; got {_r}"
_r = widest_gap([1, 1000000])
assert _r == 999999, f"expected 999999, got {_r}"` },
          { id: "t4", description: "evenly spaced and a big list", assertionCode: `_r = widest_gap([10, 20, 30, 40, 50])
assert _r == 10, f"expected 10, got {_r}"
_xs = [(i * 7919) % 100003 for i in range(25000)]
_s = sorted(_xs)
_want = max(b - a for a, b in zip(_s, _s[1:]))
_r = widest_gap(_xs)
assert _r == _want, f"expected {_want}, got {_r}"` },
        ],
        hints: ["Bucket of `x` is `(x - lo) // size` with `size = max(1, (hi - lo) // (n - 1))`.", "The widest gap is between buckets: walk the buckets in order and compare each bucket's min with the max of the last non-empty one."],
      },
      {
        kind: "recap",
        points: [
          "**Bucket sort**: drop items into range buckets, sort the small buckets, join. O(n) on average for evenly spread data, no better than a normal sort for lopsided data.",
          "**Frequency buckets** (index = count, n + 1 of them) give the k most frequent items in O(n).",
          "**Pigeonhole**: n values leave n − 1 gaps, so the widest is at least range / (n − 1); with buckets that narrow, only bucket mins and maxes matter.",
          "Spot it: *top k frequent*, *most common*, *largest gap in linear time*.",
        ],
      },
    ],
  },
];
