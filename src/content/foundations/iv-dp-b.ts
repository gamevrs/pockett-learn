import type { ConceptLesson } from "../../learn/types.ts";

/** Fenced Python block for lesson prose. */
const py = (code: string) => "~~~python\n" + code.trim() + "\n~~~";

// ── shared trace data ──
const POP_CODE = ["count = 0", "while mask:", "    mask &= mask - 1   # clear the lowest 1 bit", "    count += 1"];

const MITM_CODE = ["left = all sums of the first half", "right = sorted(all sums of the second half)", "for s in left:", "    need = target - s", "    count += how many times need is in right"];

const GAME_CODE = ["win[0] = False", "for n in 1..N:", "    win[n] = any(not win[n - m]", "                 for m in moves if m <= n)"];

const MINIMAX_CODE = ["def value(node, maxing, alpha, beta):", "    if leaf: return node", "    for child in node:", "        v = value(child, not maxing, alpha, beta)", "        update best, alpha (max) or beta (min)", "        if alpha >= beta: break   # prune"];
const MINIMAX_TREE = [
  { id: "R", label: "max" },
  { id: "A", label: "min", parent: "R" },
  { id: "B", label: "min", parent: "R" },
  { id: "C", label: "min", parent: "R" },
  { id: "a1", label: "5", parent: "A" },
  { id: "a2", label: "9", parent: "A" },
  { id: "a3", label: "4", parent: "A" },
  { id: "b1", label: "7", parent: "B" },
  { id: "b2", label: "8", parent: "B" },
  { id: "c1", label: "1", parent: "C" },
  { id: "c2", label: "10", parent: "C" },
  { id: "c3", label: "6", parent: "C" },
];

export const ivDpLessonsB: ConceptLesson[] = [
  // ─────────────────────────────── 6. Bitmasks ───────────────────────────────
  {
    id: "fnd-iv-dp-6-bitmask",
    title: "Bitmasks and DP over subsets",
    summary: "Store a set of up to ~20 items in one integer, and run DP over every subset.",
    minutes: 16,
    xp: 90,
    level: "Advanced",
    steps: [
      {
        kind: "explain",
        title: "A set in one number",
        body:
          "A **bitmask** stores a subset of `n` items in one integer: bit `i` is 1 when item `i` is in the set. With `n ≤ 20` or so, every subset is a number from `0` to `2ⁿ - 1`, so you can loop over all of them, or use them as table indexes.\n\nThe moves you need:\n\n" +
          py(`
mask | (1 << i)        # add item i
mask & ~(1 << i)       # remove item i
mask >> i & 1          # is item i in? (1 or 0)
mask & (mask - 1)      # drop the lowest 1 bit
mask & -mask           # keep only the lowest 1 bit
bin(mask).count("1")   # how many items (int.bit_count() in 3.10+)
full = (1 << n) - 1    # every item
`) +
          "\n**How to spot it:** a small `n` (up to about 20), and *visit all*, *assign each … to one …*, *every subset*, or a state that must remember **which** items are used, not just how many.",
      },
      {
        kind: "question",
        title: "Clear the lowest bit",
        body: "Counting 1 bits by clearing the lowest one each pass (Kernighan's trick). The cells are bits 0 to 5 of `mask`, **lowest first**, so `44 = 0b101100` shows as `0 0 1 1 0 1`. Tap the bit each pass clears.",
        widget: {
          type: "iv-trace",
          props: {
            title: "mask &= mask - 1",
            frames: [
              { array: [0, 0, 1, 1, 0, 1], highlight: [2, 3, 5], code: POP_CODE, line: 1, vars: { mask: "0b101100 = 44", count: 0 }, note: "Bits 2, 3 and 5 are set." },
              { highlight: [2, 3, 5], line: 3, vars: { mask: "0b101100 = 44", "mask - 1": "0b101011 = 43", count: 0 }, note: "`mask - 1` turns the lowest 1 into 0 and every 0 below it into 1.", pick: { prompt: "Which bit does `mask & (mask - 1)` clear?", answer: 2 } },
              { array: [0, 0, 0, 1, 0, 1], highlight: [3, 5], done: [2], line: 4, vars: { mask: "0b101000 = 40", count: 1 }, note: "The AND keeps the bits both numbers share: everything except bit 2." },
              { highlight: [3, 5], done: [2], line: 3, vars: { mask: "0b101000 = 40", "mask - 1": "0b100111 = 39", count: 1 }, note: "Next pass.", pick: { prompt: "Which bit is cleared now?", answer: 3 } },
              { array: [0, 0, 0, 0, 0, 1], highlight: [5], done: [2, 3], line: 4, vars: { mask: "0b100000 = 32", count: 2 }, note: "Bit 3 is gone." },
              { array: [0, 0, 0, 0, 0, 0], done: [2, 3, 5], line: 2, vars: { mask: 0, count: 3 }, note: "Bit 5 goes next and `mask` is 0, so the loop stops: **3** set bits in 3 passes, one per 1 bit." },
            ],
          },
        },
        question: { type: "widget", goal: { picked: true }, prompt: "Answer both picks.", hint: "Subtracting 1 borrows from the lowest 1 bit, so that is the bit the AND removes." },
        explanation: "`mask & (mask - 1)` always removes exactly the lowest set bit. It also tests for a power of two: `x > 0 and x & (x - 1) == 0`.",
      },
      {
        kind: "question",
        title: "Is item i in?",
        body: "Which expression is 1 when item `i` is in `mask` and 0 when it is not?",
        question: {
          type: "choice",
          options: ["`mask >> i & 1`", "`mask & i`", "`mask | (1 << i)`", "`mask ^ i`"],
          answer: 0,
          feedback: { 1: "`mask & i` uses i as a mask itself; i = 3 tests bits 0 and 1, not bit 3.", 2: "`|` adds item i; the result is never 0.", 3: "`^` with i flips the bits of the number i, not bit i." },
          hint: "Move bit i down to position 0, then keep only that position.",
        },
        explanation: "`mask >> i` shifts bit i to the bottom and `& 1` keeps it. `mask & (1 << i)` also works as a truth test, but gives `1 << i` rather than 1.",
      },
      {
        kind: "explain",
        title: "DP over subsets",
        body:
          "A delivery van starts at city 0, must visit every city once and come back; `dist[a][b]` is the drive from a to b. Trying every order is (n - 1)! routes: 39 million for 12 cities.\n\nThe **Held-Karp** DP notices that the future only depends on *which* cities are done and *where you are*, not on the order you took:\n\n" +
          py(`
# dp[mask][last] = shortest drive that starts at 0, visits exactly the cities in mask, ends at last
dp[1][0] = 0                                  # only city 0, standing at city 0
for mask in range(1 << n):
    for last in cities in mask:
        for nxt not in mask:
            new = mask | (1 << nxt)
            dp[new][nxt] = min(dp[new][nxt], dp[mask][last] + dist[last][nxt])
answer = min(dp[full][last] + dist[last][0] for last in 1..n-1)
`) +
          "\nMasks only grow, so looping them in increasing order fills every state before it is read. There are 2ⁿ · n states with n choices each: **O(2ⁿ · n²)** time, **O(2ⁿ · n)** memory. For 12 cities that is about 600,000 steps instead of 39 million routes.\n\nOther subset DPs: assign n jobs to n workers (`dp[mask]` = best cost with the jobs in `mask` given to the first `popcount(mask)` workers, O(2ⁿ · n)), and iterating the submasks of a mask with `sub = (sub - 1) & mask`.",
      },
      {
        kind: "question",
        title: "Held-Karp's cost",
        body: "How does the Held-Karp DP's running time grow with the number of cities n?",
        question: {
          type: "choice",
          options: ["O(n! · n)", "O(n³)", "O(2ⁿ · n)", "O(2ⁿ · n²)"],
          answer: 3,
          feedback: { 0: "That is trying every order and adding up each route, which the DP avoids.", 1: "Polynomial time for this problem would be a huge surprise: it is NP-hard.", 2: "2ⁿ · n is the number of states, but each state tries up to n next cities." },
          hint: "Count the states (mask, last) and the work per state.",
        },
        explanation: "2ⁿ masks × n last cities × n next cities = **O(2ⁿ · n²)**. Still exponential, but 2²⁰ · 400 ≈ 4 · 10⁸ is reachable where 19! ≈ 1.2 · 10¹⁷ is not.",
      },
      {
        kind: "code",
        title: "Every subset, by mask",
        body: "Write `mask_subsets(items)`: all subsets of `items`, as lists, in mask order: the subset for mask 0, then mask 1, up to `2ⁿ - 1`. Inside a subset, keep the items in their original order. Use a loop over masks, not recursion or `itertools`.",
        language: "python",
        starter: `def mask_subsets(items):
    n = len(items)
    out = []
    # for each mask from 0 to 2**n - 1, collect the items whose bit is set
    return out
`,
        solution: `def mask_subsets(items):
    n = len(items)
    out = []
    for mask in range(1 << n):
        out.append([items[i] for i in range(n) if mask >> i & 1])
    return out
`,
        tests: [
          { id: "t1", description: "no items, one item", assertionCode: `r = (mask_subsets([]), mask_subsets(["a"]))\nassert r == ([[]], [[], ["a"]]), f"expected ([[]], [[], ['a']]): the empty set is mask 0; got {r}"` },
          { id: "t2", description: "three items in mask order", assertionCode: `r = mask_subsets(["a", "b", "c"])\nexp = [[], ["a"], ["b"], ["a", "b"], ["c"], ["a", "c"], ["b", "c"], ["a", "b", "c"]]\nassert r == exp, f"expected {exp}, got {r}: mask 3 = 0b011 holds items 0 and 1"` },
          { id: "t3", description: "ten items", assertionCode: `items = list(range(10))\nr = mask_subsets(items)\nassert len(r) == 1024, f"10 items have 1024 subsets, got {len(r)}"\nassert r[1023] == items and r[512] == [9] and r[5] == [0, 2], f"mask 1023 is everything, 512 is [9], 5 is [0, 2]; got {r[1023]}, {r[512]}, {r[5]}"` },
        ],
        hints: ["`for mask in range(1 << n):` loops over every subset.", "Item i is in the subset when `mask >> i & 1` is 1."],
      },
      {
        kind: "code",
        title: "The delivery round",
        body: "Write `shortest_tour(dist)`: the shortest round trip that starts at city 0, visits every city exactly once and returns to 0. `dist[a][b]` is the drive from a to b (it may differ from `dist[b][a]`). One city needs no driving: return 0.\n\nThe last test has 12 cities: trying every order takes far too long, Held-Karp is instant.",
        language: "python",
        starter: `def shortest_tour(dist):
    n = len(dist)
    INF = float("inf")
    # dp[mask][last] = shortest drive from 0 through exactly the cities in mask, ending at last
    return 0
`,
        solution: `def shortest_tour(dist):
    n = len(dist)
    if n == 1:
        return 0
    INF = float("inf")
    full = 1 << n
    dp = [[INF] * n for _ in range(full)]
    dp[1][0] = 0
    for mask in range(full):
        if not mask & 1:
            continue
        row = dp[mask]
        for last in range(n):
            cost = row[last]
            if cost == INF:
                continue
            for nxt in range(n):
                if mask >> nxt & 1:
                    continue
                new = mask | (1 << nxt)
                if cost + dist[last][nxt] < dp[new][nxt]:
                    dp[new][nxt] = cost + dist[last][nxt]
    return min(dp[full - 1][last] + dist[last][0] for last in range(1, n))
`,
        tests: [
          { id: "t1", description: "one and two cities", assertionCode: `r = (shortest_tour([[0]]), shortest_tour([[0, 3], [5, 0]]))\nassert r == (0, 8), f"expected (0, 8): one city needs no drive, two cities are 3 there and 5 back; got {r}"` },
          { id: "t2", description: "four cities", assertionCode: `d = [[0, 4, 9, 5], [4, 0, 3, 7], [9, 3, 0, 2], [5, 7, 2, 0]]\nr = shortest_tour(d)\nassert r == 14, f"expected 14 (0 -> 1 -> 2 -> 3 -> 0 = 4 + 3 + 2 + 5), got {r}"` },
          { id: "t3", description: "one-way roads", assertionCode: `d = [[0, 1, 9], [9, 0, 1], [1, 9, 0]]\nr = shortest_tour(d)\nassert r == 3, f"expected 3 (0 -> 1 -> 2 -> 0), got {r}: dist[a][b] and dist[b][a] can differ"` },
          { id: "t4", description: "twelve cities, fast", assertionCode: `import random\nrng = random.Random(42)\nd = [[0 if i == j else rng.randint(1, 99) for j in range(12)] for i in range(12)]\nr = shortest_tour(d)\nassert r == 158, f"expected 158 for the 12 random cities, got {r}"` },
        ],
        hints: ["Make `dp = [[INF] * n for _ in range(1 << n)]` and set `dp[1][0] = 0`.", "Loop masks upwards; from each reachable `(mask, last)` try every `nxt` not in `mask`. Finish with `min(dp[full][last] + dist[last][0])`."],
      },
      {
        kind: "recap",
        points: [
          "A **bitmask** is a subset of up to ~20 items in one integer: bit i set means item i is in.",
          "Know the moves: `1 << i`, `mask >> i & 1`, `mask | bit`, `mask & (mask - 1)` (drop lowest 1), `mask & -mask` (keep lowest 1).",
          "Loop `range(1 << n)` to see every subset; masks only grow when you add items, so increasing order is a valid DP order.",
          "**Held-Karp**: `dp[mask][last]`, O(2ⁿ · n²) instead of n! orders.",
          "Spot it: small n, and a state that must remember **which** items are used.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 7. Meet in the middle ───────────────────────────────
  {
    id: "fnd-iv-dp-7-meet-in-the-middle",
    title: "Meet in the middle",
    summary: "Split a 2ⁿ search into two 2ⁿᐟ² halves and combine them with sorting or hashing.",
    minutes: 14,
    xp: 90,
    level: "Advanced",
    steps: [
      {
        kind: "explain",
        title: "Half the exponent",
        body:
          "Some searches really do need every subset. With 40 items that is 2⁴⁰ ≈ 10¹² subsets: hopeless. **Meet in the middle** splits the items into two halves of 20:\n\n1. List every subset sum of the left half: 2²⁰ ≈ 1 million.\n2. List every subset sum of the right half, and **sort** it (or put it in a hash map).\n3. A subset of all 40 items is a left part plus a right part. For each left sum `s`, look up the partner you need, `target - s`, in the right list: a binary search or a dictionary lookup.\n\nTotal work about **O(2ⁿᐟ² · n)**: two million sums and a sort, instead of a trillion.\n\n**How to spot it:** n is around 30 to 45 (too big for 2ⁿ, too small to need anything cleverer), the numbers are huge so a DP table over sums won't fit, and the answer combines two independent parts.",
      },
      {
        kind: "question",
        title: "Find the partner",
        body: "Items `[3, 5, 6, 9]`, target 14. Left half `[3, 5]` has sums 0, 3, 5, 8. The array shows the right half `[6, 9]`'s sums, sorted. For each left sum, tap the right sum that completes 14.",
        widget: {
          type: "iv-trace",
          props: {
            title: "Subsets of [3, 5, 6, 9] that make 14",
            frames: [
              { array: [0, 6, 9, 15], code: MITM_CODE, line: 2, vars: { left: "0, 3, 5, 8", count: 0 }, note: "Right half sums, sorted: 0 (take nothing), 6, 9, 15 (6 + 9)." },
              { array: [0, 6, 9, 15], range: [0, 3], line: 4, vars: { s: 0, need: 14, count: 0 }, note: "`s = 0`: need 14. Binary search finds no 14." },
              { range: [0, 3], line: 4, vars: { s: 3, need: 11, count: 0 }, note: "`s = 3`: need 11. Not there either." },
              { range: [0, 3], line: 4, vars: { s: 5, need: 9, count: 0 }, note: "`s = 5` (take the 5).", pick: { prompt: "Which right sum completes 14?", answer: 2 } },
              { highlight: [2], line: 5, vars: { s: 5, need: 9, count: 1 }, note: "5 + 9 = 14: one subset, `{5, 9}`." },
              { range: [0, 3], line: 4, vars: { s: 8, need: 6, count: 1 }, note: "`s = 8` (take 3 and 5).", pick: { prompt: "And now?", answer: 1 } },
              { highlight: [1], line: 5, vars: { s: 8, need: 6, count: 2 }, note: "8 + 6 = 14: `{3, 5, 6}`. **2 subsets** in total." },
            ],
          },
        },
        question: { type: "widget", goal: { picked: true }, prompt: "Answer both picks.", hint: "The partner is target minus the left sum." },
        explanation: "Every subset of all four items is one left subset plus one right subset, so checking each left sum against the sorted right sums finds every answer exactly once.",
      },
      {
        kind: "question",
        title: "How many per half?",
        body: "With 40 items split 20 and 20, how many subset sums does **one** half list (including the empty subset)?",
        question: { type: "number", answer: 1048576, unit: "sums", hint: "Each of the 20 items in that half is either in or out." },
        explanation: "2²⁰ = **1,048,576**. Two halves make about 2 million sums, against 2⁴⁰ ≈ 1.1 trillion subsets for the full search.",
      },
      {
        kind: "explain",
        title: "Building the halves",
        body:
          "Build all sums of a list by doubling: each new item adds itself to every sum so far.\n\n" +
          py(`
def all_sums(ws):
    sums = [0]
    for w in ws:
        sums += [s + w for s in sums]
    return sums            # 2 ** len(ws) sums
`) +
          "\nThen combine with whatever the question needs:\n- **count** subsets hitting `target` exactly: put the right sums in a `Counter`, add `right[target - s]` for each left sum;\n- **best sum at most `cap`**: sort the right sums; for each left sum `s ≤ cap`, `bisect_right(right, cap - s) - 1` finds the biggest partner that fits;\n- **closest to target**: the same binary search, checking the neighbour on each side.\n\nPitfalls: forgetting the empty subset (0) on either side, counting duplicates wrongly (equal sums from different subsets are different subsets when counting), and splitting into very unequal halves (2³⁰ on one side is no better).",
      },
      {
        kind: "question",
        title: "Why sort one half?",
        body: "In the *best sum at most cap* version, why sort the right half's sums?",
        question: {
          type: "choice",
          options: ["So the left sums come out in order too", "So the empty subset is removed first", "So the best partner is a binary search away", "So both halves have the same size"],
          answer: 2,
          feedback: { 0: "The left sums can stay in any order; each is looked up on its own.", 1: "The empty subset (0) must stay: it means taking nothing from that half.", 3: "Sorting does not change how many sums there are." },
          hint: "For one left sum, you want the largest right sum that is at most `cap - s`. What makes that fast?",
        },
        explanation: "Sorted, the largest right sum ≤ `cap - s` is one `bisect` away: O(log) per left sum, O(2ⁿᐟ² · n) overall. Without sorting, each lookup would scan all 2ⁿᐟ² sums.",
      },
      {
        kind: "code",
        title: "Count exact loads",
        body: "A crane can lift crates with weights `weights`. Write `count_exact(weights, target)`: how many subsets of crates (by position, so equal weights are different crates) weigh exactly `target`? The empty subset weighs 0.\n\nThe last test has 30 crates: 2³⁰ subsets (over a billion) is far too many, two halves of 2¹⁵ are fine. (With small weights a table over sums would also work; meet in the middle works for any size.)",
        language: "python",
        starter: `from collections import Counter

def count_exact(weights, target):
    half = len(weights) // 2
    # all sums of each half, then pair them up
    return 0
`,
        solution: `from collections import Counter

def all_sums(ws):
    sums = [0]
    for w in ws:
        sums += [s + w for s in sums]
    return sums

def count_exact(weights, target):
    half = len(weights) // 2
    left = all_sums(weights[:half])
    right = Counter(all_sums(weights[half:]))
    return sum(right[target - s] for s in left)
`,
        tests: [
          { id: "t1", description: "the empty subset counts", assertionCode: `r = (count_exact([], 0), count_exact([], 5), count_exact([4], 4))\nassert r == (1, 0, 1), f"expected (1, 0, 1): the empty subset weighs 0; got {r}"` },
          { id: "t2", description: "the example", assertionCode: `r = count_exact([3, 5, 6, 9], 14)\nassert r == 2, f"expected 2 ({{5, 9}} and {{3, 5, 6}}), got {r}"` },
          { id: "t3", description: "equal weights are different crates", assertionCode: `r = (count_exact([2, 2, 2], 4), count_exact([1, 2, 3, 4, 5, 6], 10))\nassert r == (3, 5), f"expected (3, 5): any 2 of the three 2s make 4; got {r}"` },
          { id: "t4", description: "30 crates", assertionCode: `import random\nrng = random.Random(2026)\nws = [rng.randint(1, 1000) for _ in range(30)]\nr = count_exact(ws, sum(ws) // 2)\nassert r == 236884, f"expected 236884, got {r}"` },
        ],
        hints: ["Write `all_sums(ws)` by doubling: start with `[0]`, and for each weight add it to every sum so far.", "`right = Counter(all_sums(second half))`, then add up `right[target - s]` over the left sums."],
      },
      {
        kind: "code",
        title: "Heaviest load under the limit",
        body: "Same crane, now with a weight limit. Write `best_under(weights, cap)`: the heaviest total of any subset that is at most `cap` (0 if nothing fits). The weights are huge, so a table over sums is out of the question; the last test has 30 crates.",
        language: "python",
        starter: `from bisect import bisect_right

def best_under(weights, cap):
    half = len(weights) // 2
    # left sums, sorted right sums, then one binary search per left sum
    return 0
`,
        solution: `from bisect import bisect_right

def all_sums(ws):
    sums = [0]
    for w in ws:
        sums += [s + w for s in sums]
    return sums

def best_under(weights, cap):
    half = len(weights) // 2
    left = all_sums(weights[:half])
    right = sorted(all_sums(weights[half:]))
    best = 0
    for s in left:
        if s > cap:
            continue
        i = bisect_right(right, cap - s) - 1
        best = max(best, s + right[i])
    return best
`,
        tests: [
          { id: "t1", description: "small cases", assertionCode: `r = (best_under([7], 7), best_under([7], 5), best_under([5, 5, 5], 9))\nassert r == (7, 0, 5), f"expected (7, 0, 5), got {r}"` },
          { id: "t2", description: "an exact fit", assertionCode: `r = best_under([4, 8, 15, 16, 23, 42], 50)\nassert r == 50, f"expected 50 (4 + 23 + 15 + 8), got {r}"` },
          { id: "t3", description: "20 huge weights", assertionCode: `import random\nrng = random.Random(99)\nws = [rng.randint(10**12, 10**13) for _ in range(20)]\nr = best_under(ws, sum(ws) // 3)\nassert r == 31369411506115, f"expected 31369411506115, got {r}"` },
          { id: "t4", description: "30 huge weights, fast", assertionCode: `import random\nrng = random.Random(7)\nws = [rng.randint(10**12, 10**13) for _ in range(30)]\nr = best_under(ws, sum(ws) // 3)\nassert r == 52530386089113, f"expected 52530386089113, got {r}"` },
        ],
        hints: ["Sort the right half's sums. For a left sum `s ≤ cap`, `bisect_right(right, cap - s) - 1` is the index of the biggest partner that fits.", "That index is never -1, because the right half always contains 0."],
      },
      {
        kind: "recap",
        points: [
          "**Meet in the middle** turns one 2ⁿ search into two 2ⁿᐟ² lists plus a combine step: about O(2ⁿᐟ² · n).",
          "Build each half's sums by doubling; keep the empty subset (0) in both.",
          "Combine with a `Counter` (exact counts) or a sorted list and `bisect` (best under a limit, closest).",
          "Spot it: n around 30 to 45, numbers too big for a DP table, two independent halves.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 8. Game theory ───────────────────────────────
  {
    id: "fnd-iv-dp-8-game-theory",
    title: "Game theory: winning and losing positions",
    summary: "Who wins with perfect play? Label positions win or lose, and meet Nim's XOR rule.",
    minutes: 14,
    xp: 90,
    level: "Advanced",
    steps: [
      {
        kind: "explain",
        title: "Win, lose, and the move that matters",
        body:
          "A typical interview game: two players take turns, both play **perfectly**, and the one who can't move loses. Who wins?\n\nLabel every position from the point of view of the player about to move:\n- a position is **winning** (W) if **some** move leads to a losing position for the opponent;\n- it is **losing** (L) if **every** move leads to a winning one (or there is no move at all).\n\nThat is a DP: positions with fewer coins, stones or cells are labelled first.\n\n**How to spot it:** *two players*, *take turns*, *both play optimally*, *can the first player win*. Small examples usually show a pattern (a period, or a parity), and a full DP proves it.",
      },
      {
        kind: "question",
        title: "Take 1, 3 or 4 coins",
        body: "A pile of coins; a move takes 1, 3 or 4. Cell `n` is the label for a pile of `n` coins. Step through the table and tap the pile size a winning player should leave behind.",
        widget: {
          type: "iv-trace",
          props: {
            title: "Moves {1, 3, 4}",
            frames: [
              { array: ["L", null, null, null, null, null, null, null, null, null], code: GAME_CODE, line: 1, note: "0 coins: no move, so the player to move loses: **L**." },
              { array: ["L", "W", "L", "W", "W", null, null, null, null, null], line: 3, note: "1, 3, 4: take everything and leave 0 (L), so W. From 2 the only move leaves 1, a W for the opponent, so 2 is **L**." },
              { array: ["L", "W", "L", "W", "W", "W", null, null, null, null], pointers: { n: 5 }, highlight: [4, 2, 1], line: 3, note: "5 coins can leave 4, 2 or 1. Leaving 2 (an L) wins, so 5 is W." },
              { pointers: { n: 6 }, highlight: [5, 3, 2], line: 3, note: "6 coins can leave 5, 3 or 2.", pick: { prompt: "Which pile size should the player at 6 leave?", answer: 2 } },
              { array: ["L", "W", "L", "W", "W", "W", "W", "L", null, null], pointers: { n: 7 }, highlight: [6, 4, 3], line: 3, note: "6 is W (take 4). From 7 every move leaves a W (6, 4 or 3), so 7 is **L**." },
              { pointers: { n: 8 }, highlight: [7, 5, 4], line: 3, note: "8 coins can leave 7, 5 or 4.", pick: { prompt: "Which pile size should the player at 8 leave?", answer: 7 } },
              { array: ["L", "W", "L", "W", "W", "W", "W", "L", "W", "L"], done: [0, 2, 7, 9], line: 4, note: "The losing sizes are 0, 2, 7, 9, …: they repeat every 7 (n % 7 is 0 or 2). The first player wins unless the pile is one of those." },
            ],
          },
        },
        question: { type: "widget", goal: { picked: true }, prompt: "Answer both picks.", hint: "A winning move hands the opponent an L position." },
        explanation: "W means *at least one* move to an L; L means *every* move goes to a W. Filling the table bottom-up is O(N × number of moves).",
      },
      {
        kind: "explain",
        title: "Nim and the XOR rule",
        body:
          "**Nim**: several piles; a move takes any number (at least 1) from **one** pile; whoever can't move loses. Bouton's theorem says the player to move loses exactly when the **XOR** of all pile sizes is 0.\n\n" +
          py(`
from functools import reduce
from operator import xor

def first_wins(piles):
    return reduce(xor, piles, 0) != 0
`) +
          "\nWhy: from XOR 0, any move changes one pile, so the XOR becomes nonzero. From a nonzero XOR `x`, pick a pile `p` with `p ^ x < p` (one with the top bit of `x` set) and shrink it to `p ^ x`: the XOR becomes 0.\n\nThe **Sprague-Grundy theorem** generalises this: every position of an impartial game (both players have the same moves) has a **Grundy number**, the smallest non-negative number not among its options' Grundy numbers (the *mex*). L positions have Grundy 0, and a sum of independent games has the XOR of their numbers.\n\nPitfalls: assuming the player who *takes the last item* loses when the rules say they win (read the rules twice), and guessing a pattern from three cases without checking more.",
      },
      {
        kind: "question",
        title: "XOR the piles",
        body: "Nim with piles 3, 4 and 5. Find the XOR of the three pile sizes.",
        question: { type: "number", answer: 2, hint: "Write them in binary (011, 100, 101) and XOR column by column: a column gives 1 when it has an odd number of 1s." },
        explanation: "011 ^ 100 = 111, and 111 ^ 101 = **010 = 2**. Not 0, so the first player wins: shrink the pile of 3 to `3 ^ 2 = 1`, leaving 1, 4, 5 (XOR 0).",
      },
      {
        kind: "question",
        title: "Who wins?",
        body: "Nim with piles 2, 5 and 7, both players perfect. Who wins?",
        question: {
          type: "choice",
          options: ["The first player, by emptying the 7", "The second player", "The first player, by taking 1 from the 2", "Whoever takes from the biggest pile"],
          answer: 1,
          feedback: { 0: "Emptying the 7 leaves 2 and 5: XOR 7, a winning position for the opponent.", 2: "That leaves 1, 5, 7: XOR 3, a win for the opponent.", 3: "Pile size alone does not decide Nim; the XOR of all piles does." },
          hint: "Compute 2 ^ 5 ^ 7.",
        },
        explanation: "2 ^ 5 = 7 and 7 ^ 7 = **0**: the first player is in a losing position. Whatever they do, the second player can restore XOR 0.",
      },
      {
        kind: "code",
        title: "Can the first player win?",
        body: "A pile has `n` coins and a move takes any amount listed in `moves` (each at least 1). The player who can't move loses. Write `first_player_wins(n, moves)`: `True` if the player to move wins with perfect play. Fill a table from 0 up to `n`.",
        language: "python",
        starter: `def first_player_wins(n, moves):
    # win[k] is True if the player to move with k coins can force a win
    return True
`,
        solution: `def first_player_wins(n, moves):
    win = [False] * (n + 1)
    for k in range(1, n + 1):
        win[k] = any(m <= k and not win[k - m] for m in moves)
    return win[n]
`,
        tests: [
          { id: "t1", description: "moves {1, 3, 4}, piles 0 to 9", assertionCode: `r = [first_player_wins(n, [1, 3, 4]) for n in range(10)]\nexp = [False, True, False, True, True, True, True, False, True, False]\nassert r == exp, f"expected {exp}, got {r}"` },
          { id: "t2", description: "no move possible", assertionCode: `r = [first_player_wins(n, [2, 5]) for n in range(5)]\nassert r == [False, False, True, True, False], f"with moves [2, 5]: 0 and 1 coins allow no move (lose); expected [False, False, True, True, False], got {r}"` },
          { id: "t3", description: "big piles", assertionCode: `r = (first_player_wins(10002, [1, 3, 4]), first_player_wins(10003, [1, 3, 4]), first_player_wins(10000, [2, 5]), first_player_wins(10001, [2, 5]))\nassert r == (True, False, False, True), f"expected (True, False, False, True), got {r}"` },
        ],
        hints: ["`win[0]` is False: no move.", "`win[k] = any(m <= k and not win[k - m] for m in moves)`."],
      },
      {
        kind: "code",
        title: "Find the winning Nim move",
        body: "Write `nim_move(piles)`: return a winning move as `(index, new_size)` (shrink `piles[index]` to `new_size`, which must be smaller), or `None` if the player to move is losing. Any winning move is accepted.",
        language: "python",
        starter: `def nim_move(piles):
    x = 0
    # XOR all the piles; if it is 0 there is no winning move
    # otherwise shrink a pile p where p ^ x < p down to p ^ x
    return (0, 0)
`,
        solution: `def nim_move(piles):
    x = 0
    for p in piles:
        x ^= p
    if x == 0:
        return None
    for i, p in enumerate(piles):
        if p ^ x < p:
            return (i, p ^ x)
`,
        tests: [
          {
            id: "t1",
            description: "3, 4, 5",
            assertionCode: `piles = [3, 4, 5]\nr = nim_move(piles)\nassert isinstance(r, tuple) and len(r) == 2, f"expected an (index, new_size) pair, got {r}"\ni, k = r\nassert 0 <= i < 3 and 0 <= k < piles[i], f"{r} is not a legal move: new_size must be smaller than piles[i]"\nafter = piles[:i] + [k] + piles[i + 1:]\nassert after[0] ^ after[1] ^ after[2] == 0, f"after {r} the piles are {after}, whose XOR is not 0"`,
          },
          { id: "t2", description: "losing positions", assertionCode: `r = (nim_move([1, 1]), nim_move([]), nim_move([2, 5, 7]))\nassert r == (None, None, None), f"[1, 1], [] and [2, 5, 7] all have XOR 0, so expected (None, None, None); got {r}"` },
          {
            id: "t3",
            description: "empty a pile, and five piles",
            assertionCode: `for piles in ([0, 0, 7], [12, 7, 9, 30, 18]):\n    r = nim_move(piles)\n    assert isinstance(r, tuple) and len(r) == 2, f"{piles}: expected an (index, new_size) pair, got {r}"\n    i, k = r\n    assert 0 <= i < len(piles) and 0 <= k < piles[i], f"{piles}: {r} is not a legal move"\n    x = 0\n    for p in piles[:i] + [k] + piles[i + 1:]:\n        x ^= p\n    assert x == 0, f"{piles}: after {r} the XOR is {x}, not 0"`,
          },
        ],
        hints: ["XOR all piles into `x`. If `x == 0`, return `None`.", "Find a pile with `p ^ x < p` and return `(i, p ^ x)`."],
      },
      {
        kind: "recap",
        points: [
          "Label positions from the mover's view: **W** if some move reaches an L, **L** if every move reaches a W (or none exists).",
          "Fill the labels bottom-up like any DP; patterns (periods) often appear, but prove them with the table.",
          "**Nim**: the mover loses exactly when the XOR of the piles is 0; to win, shrink a pile p to `p ^ x`.",
          "**Sprague-Grundy**: Grundy number = mex of the options; independent games combine by XOR.",
          "Spot it: *two players*, *take turns*, *play optimally*, *who wins*.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 9. Minimax ───────────────────────────────
  {
    id: "fnd-iv-dp-9-minimax",
    title: "Minimax and alpha-beta pruning",
    summary: "Score games where one side maximises and the other minimises, and skip branches that can't matter.",
    minutes: 15,
    xp: 90,
    level: "Advanced",
    steps: [
      {
        kind: "explain",
        title: "My best against your best",
        body:
          "Win/lose labels are not enough when the game has a **score**. **Minimax** assumes both players are perfect: at your turn you pick the move with the **highest** final score, at the opponent's turn they pick the **lowest**.\n\n" +
          py(`
def minimax(node, maximizing):
    if is_leaf(node):
        return score(node)
    values = [minimax(child, not maximizing) for child in children(node)]
    return max(values) if maximizing else min(values)
`) +
          "\nThe full search is **O(bᵈ)** for branching factor b and depth d. Two ways to make it smaller:\n- **alpha-beta pruning** skips branches that can't change the answer (next);\n- when positions repeat, memoize them: then it is a DP.\n\n**How to spot it:** *two players*, *both play optimally*, *maximum score the first player can guarantee*, game trees, tic-tac-toe style boards, and *take from either end* games.",
      },
      {
        kind: "question",
        title: "Back the values up",
        body: "MAX moves first, then MIN replies; the leaves are final scores. Step through minimax with alpha-beta and tap the nodes it chooses or skips.",
        widget: {
          type: "iv-trace",
          props: {
            title: "Minimax with alpha-beta",
            frames: [
              { tree: { nodes: MINIMAX_TREE, active: ["R"] }, code: MINIMAX_CODE, line: 1, vars: { alpha: "-∞", A: "?", B: "?", C: "?" }, note: "`alpha` is the best score MAX is already sure of. It starts at minus infinity." },
              { tree: { active: ["A", "a1", "a2", "a3"], done: [] }, line: 4, note: "MIN at A sees all three leaves: 5, 9 and 4.", pick: { prompt: "Which leaf does MIN choose at A?", answer: "a3" } },
              { tree: { active: ["B", "b1", "b2"], done: ["A", "a1", "a2", "a3"] }, line: 5, vars: { alpha: 4, A: 4, B: "?", C: "?" }, note: "A is worth 4, so MAX can already get 4: `alpha = 4`. At B, MIN sees 7 and 8." },
              { tree: { active: ["C", "c1"], done: ["A", "a1", "a2", "a3", "B", "b1", "b2"] }, line: 6, vars: { alpha: 7, A: 4, B: 7, C: "≤ 1" }, note: "B is worth 7: `alpha = 7`. C's first leaf is 1, so C is worth **at most** 1, already below 7.", pick: { prompt: "Which leaf is the first one alpha-beta can skip?", answer: "c2" } },
              { tree: { active: ["R"], done: ["A", "a1", "a2", "a3", "B", "b1", "b2", "C", "c1"] }, line: 6, vars: { alpha: 7, A: 4, B: 7, C: "≤ 1" }, note: "10 and 6 are pruned: whatever they are, MIN would pick 1 or less at C, and MAX never goes there.", pick: { prompt: "Which child does MAX choose?", answer: "B" } },
              { tree: { active: ["B", "b1"], done: ["R", "A", "a1", "a2", "a3", "C", "c1"] }, line: 5, vars: { alpha: 7, A: 4, B: 7, C: "≤ 1", value: 7 }, note: "The game is worth **7**: MAX plays to B, MIN answers 7. Two of the eight leaves were never looked at." },
            ],
          },
        },
        question: { type: "widget", goal: { picked: true }, prompt: "Answer all three picks.", hint: "MIN takes the smallest leaf; MAX takes the child with the largest value; a MIN node already below alpha can stop." },
        explanation: "Plain minimax gives the same 7. Alpha-beta only skips work: at C, MIN already has 1, and MAX has 7 elsewhere, so nothing under C can matter.",
      },
      {
        kind: "question",
        title: "Your turn",
        body: "MAX moves first and chooses among three MIN nodes with leaves `[6, 2]`, `[3, 8, 5]` and `[9, 4]`. Find the value of the game.",
        question: { type: "number", answer: 4, hint: "Take the minimum of each group first, then the maximum of those." },
        explanation: "The MIN nodes are worth 2, 3 and 4, and MAX picks the best: **4**. Note MAX does not chase the 9: MIN would answer with the 4.",
      },
      {
        kind: "explain",
        title: "Alpha-beta, and games as DP",
        body:
          "**Alpha-beta** carries two bounds down the tree: `alpha`, the best score MAX can already guarantee, and `beta`, the best (lowest) MIN can guarantee. When `alpha >= beta` at a node, the players would never let the game reach it, so stop looking at its children. The answer is the same as plain minimax.\n\nWith good move ordering (best moves first), alpha-beta examines about **O(b^(d/2))** nodes: it can search roughly twice as deep in the same time. With bad ordering it prunes nothing.\n\nMany interview games are minimax with repeated positions, so they become DP. *Coins in a row; each turn take the leftmost or rightmost; what is the best final margin (my total minus yours)?* The state is the remaining range `i..j`:\n\n" +
          py(`
# margin(i, j) = best (mover's total - other's total) on coins[i..j]
margin(i, j) = max(coins[i] - margin(i + 1, j),
                   coins[j] - margin(i, j - 1))
`) +
          "\nSubtracting the opponent's best margin is minimax in one line (this trick is called **negamax**). O(n²) states, O(1) each: **O(n²)**. Pitfall: taking the bigger end greedily; with `[8, 15, 3, 7]` that loses.",
      },
      {
        kind: "question",
        title: "What alpha-beta buys",
        body: "With the best possible move ordering, roughly how many nodes does alpha-beta examine in a tree with branching factor b and depth d?",
        question: {
          type: "choice",
          options: ["O(bᵈ), the same as minimax", "O(b · d)", "O(b^(d/2))", "O(d^b)"],
          answer: 2,
          feedback: { 0: "That is the worst case (bad ordering); with good ordering far more is pruned.", 1: "That would mean looking at one path plus its siblings; MIN's replies must still be checked.", 3: "The exponent is the depth, not the branching factor." },
          hint: "With perfect ordering it can search about twice as deep in the same time.",
        },
        explanation: "**O(b^(d/2))**, the square root of minimax's bᵈ. That is why chess programs care so much about trying the most promising moves first.",
      },
      {
        kind: "code",
        title: "Score a game tree",
        body: "A game tree is nested lists: an `int` is a leaf score, a list is a position whose items are the positions after each move. Write `minimax(tree, maximizing=True)`: the value of the game when the player to move at the top maximises (or minimises, if `maximizing` is False) and the players alternate at each level. Leaves may sit at different depths.",
        language: "python",
        starter: `def minimax(tree, maximizing=True):
    # a leaf is an int; otherwise score every child with the other player to move
    return 0
`,
        solution: `def minimax(tree, maximizing=True):
    if isinstance(tree, int):
        return tree
    values = [minimax(child, not maximizing) for child in tree]
    return max(values) if maximizing else min(values)
`,
        tests: [
          { id: "t1", description: "a single leaf", assertionCode: `r = (minimax(7), minimax(-3, False))\nassert r == (7, -3), f"a leaf is its own score: expected (7, -3), got {r}"` },
          { id: "t2", description: "the example tree", assertionCode: `t = [[5, 9, 4], [7, 8], [1, 10, 6]]\nr = (minimax(t), minimax(t, False))\nassert r == (7, 8), f"expected 7 when MAX moves first and 8 when MIN does, got {r}"` },
          { id: "t3", description: "uneven depths", assertionCode: `t = [[[3, 6], [2]], [[7, 1], [4, 8]], 9]\nr = (minimax(t), minimax(t, False))\nassert r == (9, 3), f"expected (9, 3), got {r}: a leaf right under the root counts too"` },
        ],
        hints: ["If `tree` is an `int`, return it.", "Otherwise score each child with `not maximizing`, then return the `max` or the `min`."],
      },
      {
        kind: "code",
        title: "Coins at both ends",
        body: "Coins lie in a row with values `coins`. Two players take turns; each turn takes the leftmost **or** the rightmost coin. Write `best_margin(coins)`: with both playing perfectly, the first player's total minus the second player's total. Taking the bigger end is not always best. The last test has 300 coins, so use a table (or a memo) over the range `i..j`.",
        language: "python",
        starter: `def best_margin(coins):
    n = len(coins)
    # margin[i][j] = best (mover - other) on coins[i..j]
    return 0
`,
        solution: `def best_margin(coins):
    n = len(coins)
    if n == 0:
        return 0
    margin = [[0] * n for _ in range(n)]
    for i in range(n - 1, -1, -1):
        margin[i][i] = coins[i]
        for j in range(i + 1, n):
            margin[i][j] = max(coins[i] - margin[i + 1][j], coins[j] - margin[i][j - 1])
    return margin[0][n - 1]
`,
        tests: [
          { id: "t1", description: "no coins, one coin", assertionCode: `r = (best_margin([]), best_margin([7]))\nassert r == (0, 7), f"expected (0, 7), got {r}"` },
          { id: "t2", description: "the first player can lose", assertionCode: `r = best_margin([1, 5, 2])\nassert r == -2, f"best_margin([1, 5, 2]) should be -2: whichever end you take, the opponent takes the 5; got {r}"` },
          { id: "t3", description: "greedy fails", assertionCode: `r = (best_margin([8, 15, 3, 7]), best_margin([3, 9, 1, 2]), best_margin([2, 7, 9, 4, 4]))\nassert r == (11, 7, 4), f"expected (11, 7, 4), got {r}: on [8, 15, 3, 7], taking the 8 lets the opponent take the 15"` },
          { id: "t4", description: "300 coins", assertionCode: `import random\nrng = random.Random(5)\ncoins = [rng.randint(1, 100) for _ in range(300)]\nr = best_margin(coins)\nassert r == 415, f"expected 415, got {r}"` },
        ],
        hints: ["`margin[i][i] = coins[i]`: one coin, the mover takes it.", "Fill `i` from the end down and `j` from `i + 1` up: `margin[i][j] = max(coins[i] - margin[i+1][j], coins[j] - margin[i][j-1])`."],
      },
      {
        kind: "recap",
        points: [
          "**Minimax**: MAX picks the largest child value, MIN the smallest; values are backed up from the leaves.",
          "**Alpha-beta** prunes when `alpha >= beta`; same answer, about O(b^(d/2)) nodes with good move ordering.",
          "**Negamax**: score a position as `my gain - opponent's best margin` from the next position.",
          "When positions repeat, memoize or tabulate: *take from either end* is an O(n²) interval DP.",
          "Spot it: scores instead of plain win/lose, *both play optimally*, *maximum the first player can guarantee*.",
        ],
      },
    ],
  },
];
