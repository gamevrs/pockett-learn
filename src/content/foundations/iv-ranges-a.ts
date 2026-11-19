import type { ConceptLesson } from "../../learn/types.ts";

/** Fenced Python block for lesson prose. */
const py = (code: string) => "~~~python\n" + code.trim() + "\n~~~";

// ── shared trace data ──
const SEG_CODE = [
  "def query(node, lo, hi, l, r):",
  "    if r < lo or hi < l: return 0           # no overlap",
  "    if l <= lo and hi <= r: return t[node]  # fully inside",
  "    mid = (lo + hi) // 2",
  "    return query(left, lo, mid, l, r) + query(right, mid + 1, hi, l, r)",
];
const SEG_TREE = [
  { id: "0-7", label: "36" },
  { id: "0-3", label: "16", parent: "0-7", side: "L" as const },
  { id: "4-7", label: "20", parent: "0-7", side: "R" as const },
  { id: "0-1", label: "7", parent: "0-3", side: "L" as const },
  { id: "2-3", label: "9", parent: "0-3", side: "R" as const },
  { id: "4-5", label: "11", parent: "4-7", side: "L" as const },
  { id: "6-7", label: "9", parent: "4-7", side: "R" as const },
  { id: "i0", label: "5", parent: "0-1", side: "L" as const },
  { id: "i1", label: "2", parent: "0-1", side: "R" as const },
  { id: "i2", label: "8", parent: "2-3", side: "L" as const },
  { id: "i3", label: "1", parent: "2-3", side: "R" as const },
  { id: "i4", label: "4", parent: "4-5", side: "L" as const },
  { id: "i5", label: "7", parent: "4-5", side: "R" as const },
  { id: "i6", label: "3", parent: "6-7", side: "L" as const },
  { id: "i7", label: "6", parent: "6-7", side: "R" as const },
];

const BIT_CODE = ["def prefix(i):            # a[1] + ... + a[i]", "    s = 0", "    while i > 0:", "        s += tree[i]; i -= i & -i", "def add(i, delta):", "    while i <= n:", "        tree[i] += delta; i += i & -i"];
const BIT_ARRAY = [null, 3, 4, 4, 9, 5, 14, 2, 31];

const LRU_CODE = ["def get(key):", "    if key not in cache: return -1", "    move key to the most-recent end", "def put(key, value):", "    store value; move key to the most-recent end", "    if size > capacity: evict the least-recent key"];

export const ivRangesLessonsA: ConceptLesson[] = [
  // ─────────────────────────────── 1. Segment tree ───────────────────────────────
  {
    id: "fnd-iv-ranges-1-segment-tree",
    title: "Segment trees: range queries with updates",
    summary: "Sum or minimum over any range, and point updates, both in O(log n).",
    minutes: 16,
    xp: 90,
    level: "Advanced",
    steps: [
      {
        kind: "explain",
        title: "Fast ranges that keep changing",
        body:
          "A scoreboard holds `n` numbers. You get a mix of two requests: *set position i to v*, and *what is the total (or minimum) of positions l..r?*\n\n- A plain list: update O(1), range query O(n).\n- Prefix sums: query O(1), but one update shifts every later prefix: O(n).\n\nWith many of both, each is too slow. A **segment tree** gets **O(log n)** for both. It is a binary tree over the positions: each leaf is one value, and each inner node stores the sum (or min, or max) of the range below it. The root covers everything.\n\n- **Query l..r:** walk down from the root. A node fully inside `l..r` answers for its whole range at once; a node outside is skipped; a node that only overlaps is split into its two children. At most about 4 nodes per level are touched: O(log n).\n- **Update i:** change the leaf, then fix the nodes on its path to the root: O(log n).\n\n**How to spot it:** *range sum / min / max* plus *updates*, many queries (10⁵ and up), or *count of … in a range* that changes over time.",
      },
      {
        kind: "question",
        title: "Answer a range query",
        body: "Values `[5, 2, 8, 1, 4, 7, 3, 6]` at positions 0 to 7; every node shows the sum of its range. Query the sum of positions **2..6**. Tap each node that is fully inside the range and answers for it.",
        widget: {
          type: "iv-trace",
          props: {
            title: "Sum of positions 2..6",
            frames: [
              { tree: { nodes: SEG_TREE, active: ["0-7"] }, code: SEG_CODE, line: 1, vars: { "l..r": "2..6", total: 0 }, note: "The root covers 0..7: it overlaps 2..6 but is not inside it, so split." },
              { tree: { active: ["0-3"], done: ["0-1"] }, line: 4, vars: { "l..r": "2..6", total: 0 }, note: "The left child covers 0..3, again only partly inside. Its own left child (0..1) is outside: skipped.", pick: { prompt: "Which node under 0..3 lies fully inside 2..6?", answer: "2-3" } },
              { tree: { active: ["2-3"], done: ["0-1"] }, line: 3, vars: { "l..r": "2..6", total: 9 }, note: "The node over 2..3 is fully inside: add its 9 without going lower." },
              { tree: { active: ["4-7"], done: ["0-1", "2-3"] }, line: 4, vars: { "l..r": "2..6", total: 9 }, note: "Right child of the root: 4..7, partly inside. Split it.", pick: { prompt: "Which node under 4..7 lies fully inside 2..6?", answer: "4-5" } },
              { tree: { active: ["6-7"], done: ["0-1", "2-3", "4-5"] }, line: 4, vars: { "l..r": "2..6", total: 20 }, note: "4..5 is inside: add 11. Then 6..7 is only partly inside.", pick: { prompt: "Which node finishes the range?", answer: "i6" } },
              { tree: { active: ["2-3", "4-5", "i6"], done: ["0-1", "i7"] }, line: 3, vars: { "l..r": "2..6", total: 23 }, note: "Position 6 adds 3; position 7 is outside. Total `9 + 11 + 3 = **23**` from 3 nodes, not 5 separate values." },
            ],
          },
        },
        question: { type: "widget", goal: { picked: true }, prompt: "Answer all three picks.", hint: "A node answers for its whole range when that range sits completely inside 2..6." },
        explanation: "Any range splits into O(log n) nodes that are fully inside it, so a query adds a handful of stored sums instead of every value.",
      },
      {
        kind: "question",
        title: "Why not prefix sums?",
        body: "Prefix sums answer any range sum in O(1). What makes them a poor fit when values change often?",
        question: {
          type: "choice",
          options: ["An update must rewrite O(n) prefix sums", "They can't handle negative numbers", "Each query becomes O(log n)", "They need O(n²) memory"],
          answer: 0,
          feedback: { 1: "Prefix sums work fine with negative numbers.", 2: "Queries stay O(1); the problem is elsewhere.", 3: "Prefix sums take O(n) memory: one number per position." },
          hint: "Changing a[i] changes every prefix that includes position i.",
        },
        explanation: "Every prefix from i to the end includes a[i], so one update rewrites up to n prefix sums. The segment tree touches only the O(log n) nodes above the changed leaf.",
      },
      {
        kind: "question",
        title: "Count the nodes",
        body: "A segment tree over 8 values has 8 leaves, then 4, 2 and 1 nodes above them. How many nodes does it have in total?",
        question: { type: "number", answer: 15, unit: "nodes", hint: "Add up the levels." },
        explanation: "8 + 4 + 2 + 1 = **15** = 2n − 1. That is why the array version below uses `2n` slots (slot 0 unused). Recursive versions often allocate `4n` to be safe when n is not a power of two.",
      },
      {
        kind: "explain",
        title: "The compact array version",
        body:
          "You don't need node objects. Put the leaves at `t[n..2n-1]`; node `i` has children `2i` and `2i + 1`, so its parent is `i // 2`:\n\n" +
          py(`
class RangeSum:
    def __init__(self, values):
        self.n = n = len(values)
        self.t = [0] * n + list(values)
        for i in range(n - 1, 0, -1):          # build parents, bottom up: O(n)
            self.t[i] = self.t[2 * i] + self.t[2 * i + 1]

    def update(self, i, value):                # O(log n)
        i += self.n
        self.t[i] = value
        while i > 1:
            i //= 2
            self.t[i] = self.t[2 * i] + self.t[2 * i + 1]

    def query(self, l, r):                     # sum of l..r inclusive, O(log n)
        total = 0
        l += self.n
        r += self.n + 1                        # half-open [l, r)
        while l < r:
            if l & 1:                          # l is a right child: take it, step right
                total += self.t[l]
                l += 1
            if r & 1:                          # r - 1 is a left child's right neighbour
                r -= 1
                total += self.t[r]
            l //= 2
            r //= 2
        return total
`) +
          "\nIt works for any n, not just powers of two. For a minimum, replace `+` by `min` and start `total` at `float('inf')`: each operation needs its **identity** (0 for sum, +∞ for min, −∞ for max).\n\nRange *updates* (add v to all of l..r) need **lazy propagation**: store pending updates on nodes and push them down only when needed. Mention it if asked; it is rarely required in full.\n\nPitfalls: inclusive vs half-open ranges, the wrong identity, and forgetting to rebuild parents after an update.",
      },
      {
        kind: "code",
        title: "Range sums",
        body: "Write the class `RangeSum(values)` with `update(i, value)` (set position i) and `query(l, r)` (the sum of positions l..r, inclusive). Both must be O(log n). `values` has at least one element.",
        language: "python",
        starter: `class RangeSum:
    def __init__(self, values):
        self.n = len(values)
        # t[n..2n-1] are the leaves; t[i] = t[2i] + t[2i+1]

    def update(self, i, value):
        pass

    def query(self, l, r):
        return 0
`,
        solution: `class RangeSum:
    def __init__(self, values):
        self.n = n = len(values)
        self.t = [0] * n + list(values)
        for i in range(n - 1, 0, -1):
            self.t[i] = self.t[2 * i] + self.t[2 * i + 1]

    def update(self, i, value):
        i += self.n
        self.t[i] = value
        while i > 1:
            i //= 2
            self.t[i] = self.t[2 * i] + self.t[2 * i + 1]

    def query(self, l, r):
        total = 0
        l += self.n
        r += self.n + 1
        while l < r:
            if l & 1:
                total += self.t[l]
                l += 1
            if r & 1:
                r -= 1
                total += self.t[r]
            l //= 2
            r //= 2
        return total
`,
        tests: [
          { id: "t1", description: "queries on the example", assertionCode: `s = RangeSum([5, 2, 8, 1, 4, 7, 3, 6])\nr = (s.query(2, 6), s.query(0, 7), s.query(3, 3))\nassert r == (23, 36, 1), f"expected (23, 36, 1) for 2..6, 0..7 and 3..3, got {r}"` },
          { id: "t2", description: "after updates", assertionCode: `s = RangeSum([5, 2, 8, 1, 4, 7, 3, 6])\ns.update(4, 10)\ns.update(0, -5)\nr = (s.query(2, 6), s.query(0, 1))\nassert r == (29, -3), f"after setting position 4 to 10 and position 0 to -5, expected (29, -3), got {r}"` },
          { id: "t3", description: "one value, odd length", assertionCode: `a = RangeSum([9])\nb = RangeSum([1, 2, 3, 4, 5])\nr = (a.query(0, 0), b.query(1, 3), b.query(0, 4))\nassert r == (9, 9, 15), f"expected (9, 9, 15), got {r}: n does not have to be a power of two"` },
          { id: "t4", description: "5,000 random operations", assertionCode: `import random\nrng = random.Random(11)\nvals = [rng.randint(-50, 50) for _ in range(301)]\ns = RangeSum(vals)\nfor step in range(5000):\n    if rng.random() < 0.5:\n        i, v = rng.randrange(301), rng.randint(-50, 50)\n        vals[i] = v\n        s.update(i, v)\n    else:\n        l = rng.randrange(301)\n        r = rng.randrange(l, 301)\n        got, want = s.query(l, r), sum(vals[l:r + 1])\n        assert got == want, f"step {step}: query({l}, {r}) gave {got}, expected {want}"` },
        ],
        hints: ["Store `self.t = [0] * n + list(values)` and fill `t[i] = t[2i] + t[2i + 1]` for i from n − 1 down to 1.", "In `query`, shift both ends by n, make r exclusive, and climb: take `t[l]` when l is odd, `t[r - 1]` when r is odd, then halve both."],
      },
      {
        kind: "code",
        title: "Cheapest in a range",
        body: "A price board needs the **cheapest** price in any range of positions, while prices change. Write `RangeMin(values)` with `update(i, value)` and `query(l, r)` returning the minimum of positions l..r inclusive, both O(log n). It is the same tree with a different combine step and identity.",
        language: "python",
        starter: `class RangeMin:
    def __init__(self, values):
        self.n = len(values)

    def update(self, i, value):
        pass

    def query(self, l, r):
        return 0
`,
        solution: `class RangeMin:
    def __init__(self, values):
        self.n = n = len(values)
        self.t = [float("inf")] * n + list(values)
        for i in range(n - 1, 0, -1):
            self.t[i] = min(self.t[2 * i], self.t[2 * i + 1])

    def update(self, i, value):
        i += self.n
        self.t[i] = value
        while i > 1:
            i //= 2
            self.t[i] = min(self.t[2 * i], self.t[2 * i + 1])

    def query(self, l, r):
        best = float("inf")
        l += self.n
        r += self.n + 1
        while l < r:
            if l & 1:
                best = min(best, self.t[l])
                l += 1
            if r & 1:
                r -= 1
                best = min(best, self.t[r])
            l //= 2
            r //= 2
        return best
`,
        tests: [
          { id: "t1", description: "minimum of ranges", assertionCode: `m = RangeMin([7, 3, 9, 4, 8, 6])\nr = (m.query(0, 5), m.query(2, 4), m.query(4, 5))\nassert r == (3, 4, 6), f"expected (3, 4, 6), got {r}"` },
          { id: "t2", description: "updates up and down", assertionCode: `m = RangeMin([7, 3, 9, 4, 8, 6])\nm.update(1, 10)\nm.update(5, 2)\nr = (m.query(0, 2), m.query(0, 5), m.query(3, 4))\nassert r == (7, 2, 4), f"after setting position 1 to 10 and 5 to 2, expected (7, 2, 4), got {r}"` },
          { id: "t3", description: "single value", assertionCode: `m = RangeMin([42])\nm.update(0, 17)\nr = m.query(0, 0)\nassert r == 17, f"expected 17, got {r}"` },
          { id: "t4", description: "5,000 random operations", assertionCode: `import random\nrng = random.Random(3)\nvals = [rng.randint(1, 1000) for _ in range(257)]\nm = RangeMin(vals)\nfor step in range(5000):\n    if rng.random() < 0.5:\n        i, v = rng.randrange(257), rng.randint(1, 1000)\n        vals[i] = v\n        m.update(i, v)\n    else:\n        l = rng.randrange(257)\n        r = rng.randrange(l, 257)\n        got, want = m.query(l, r), min(vals[l:r + 1])\n        assert got == want, f"step {step}: query({l}, {r}) gave {got}, expected {want}"` },
        ],
        hints: ["Copy `RangeSum`, replacing `+` with `min`.", "The identity for `min` is `float('inf')`: use it for the unused slots and as the starting answer."],
      },
      {
        kind: "recap",
        points: [
          "A **segment tree** stores the combined value (sum, min, max) of every range in a binary tree over the positions.",
          "Query and point update are both **O(log n)**; building is O(n); memory about 2n (array) or 4n (recursive).",
          "A query takes nodes fully inside the range, skips nodes outside, and splits the rest.",
          "Swap the combine step and its **identity** (0 for sum, ∞ for min) to answer other questions.",
          "Spot it: range queries mixed with updates, many of each.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 2. Fenwick tree ───────────────────────────────
  {
    id: "fnd-iv-ranges-2-fenwick",
    title: "Binary indexed (Fenwick) trees",
    summary: "Prefix sums with updates in a few lines, driven by the lowest set bit.",
    minutes: 15,
    xp: 90,
    level: "Advanced",
    steps: [
      {
        kind: "explain",
        title: "Prefix sums that can change",
        body:
          "A **Fenwick tree** (binary indexed tree, BIT) does one job: prefix sums with point updates, both **O(log n)**, in an array the size of the input and about ten lines of code. A range sum is `prefix(r) - prefix(l - 1)`.\n\nThe trick is the **lowest set bit**, `i & -i` (12 = `1100` → 4). The tree is **1-indexed**, and `tree[i]` stores the sum of the `i & -i` values ending at position `i`:\n\n- `tree[6]` covers positions 5..6 (lowbit 2);\n- `tree[4]` covers 1..4 (lowbit 4);\n- `tree[7]` covers just 7 (lowbit 1).\n\nTo get `prefix(i)`, add `tree[i]` and jump to `i - (i & -i)` until 0. To add to position `i`, add to `tree[i]` and jump to `i + (i & -i)` until past n. Each jump clears or carries one bit, so both take O(log n).\n\n**How to spot it:** running counts or sums with updates, *how many earlier items are smaller/larger* (inversions, ranks), and frequency tables over values.",
      },
      {
        kind: "question",
        title: "Follow the jumps",
        body: "Values `a[1..8] = [3, 1, 4, 1, 5, 9, 2, 6]`; the array shows `tree[0..8]` (slot 0 unused). First compute `prefix(7)`, then `add(3, 2)`. Tap the next index each loop visits.",
        widget: {
          type: "iv-trace",
          props: {
            title: "Fenwick jumps",
            frames: [
              { array: BIT_ARRAY, code: BIT_CODE, line: 1, vars: { i: 7, s: 0 }, note: "`tree[i]` holds the sum of the last `i & -i` values up to i: `tree[6] = 5 + 9`, `tree[8]` = everything." },
              { pointers: { i: 7 }, highlight: [7], line: 4, vars: { i: 7, s: 2 }, note: "`prefix(7)`: add `tree[7] = 2`. `7 & -7 = 1`.", pick: { prompt: "Which index does `i -= i & -i` jump to?", answer: 6 } },
              { pointers: { i: 6 }, highlight: [6], done: [7], line: 4, vars: { i: 6, s: 16 }, note: "Add `tree[6] = 14` (positions 5..6). `6 & -6 = 2`.", pick: { prompt: "Where next?", answer: 4 } },
              { pointers: { i: 4 }, highlight: [4], done: [6, 7], line: 3, vars: { i: 0, s: 25 }, note: "Add `tree[4] = 9` (positions 1..4); 4 − 4 = 0 stops the loop. `prefix(7) = 2 + 14 + 9 = **25**`, from 3 cells." },
              { array: [null, 3, 4, 6, 9, 5, 14, 2, 31], pointers: { i: 3 }, highlight: [3], line: 7, vars: { i: 3, delta: 2 }, note: "Now `add(3, 2)`: `tree[3]` becomes 6. `3 & -3 = 1`.", pick: { prompt: "Which index does `i += i & -i` reach?", answer: 4 } },
              { array: [null, 3, 4, 6, 11, 5, 14, 2, 31], pointers: { i: 4 }, highlight: [4], done: [3], line: 7, vars: { i: 4, delta: 2 }, note: "`tree[4]` covers 1..4, so it includes position 3: now 11.", pick: { prompt: "And next?", answer: 8 } },
              { array: [null, 3, 4, 6, 11, 5, 14, 2, 33], pointers: { i: 8 }, highlight: [8], done: [3, 4], line: 6, vars: { i: 16, delta: 2 }, note: "`tree[8]` becomes 33; 16 is past n = 8, so stop. Only cells whose range contains position 3 changed." },
            ],
          },
        },
        question: { type: "widget", goal: { picked: true }, prompt: "Answer all four picks.", hint: "Work out `i & -i` (the lowest 1 bit of i), then subtract it for a prefix or add it for an update." },
        explanation: "A prefix query strips the lowest bit each step (7 → 6 → 4 → 0); an update adds it (3 → 4 → 8 → 16). Both take at most about log₂ n steps.",
      },
      {
        kind: "question",
        title: "Lowest set bit",
        body: "Find the value of `12 & -12`.",
        question: { type: "number", answer: 4, hint: "Write 12 in binary and keep only its lowest 1 bit." },
        explanation: "12 = `1100`; its lowest 1 bit is worth **4**. In two's complement, `-12` flips all bits of 12 and adds 1, which leaves exactly that bit in common.",
      },
      {
        kind: "explain",
        title: "The code, and when to pick it",
        body:
          py(`
class Fenwick:
    def __init__(self, n):
        self.n = n
        self.tree = [0] * (n + 1)          # 1-indexed

    def add(self, i, delta):               # position i, 0-indexed outside
        i += 1
        while i <= self.n:
            self.tree[i] += delta
            i += i & -i

    def prefix(self, i):                   # a[0] + ... + a[i]
        i += 1
        s = 0
        while i > 0:
            s += self.tree[i]
            i -= i & -i
        return s
`) +
          "\nBuilding it with n calls to `add` is O(n log n).\n\n**Counting inversions** (pairs `i < j` with `a[i] > a[j]`): walk the list; for each value, the earlier values greater than it are `seen - prefix(rank)`; then `add(rank, 1)`. Map values to ranks `0..k-1` first (**coordinate compression**) so the tree has one slot per distinct value. O(n log n) instead of O(n²).\n\nFenwick or segment tree? Fenwick is shorter and faster for sums and counts. It is awkward for **min/max with arbitrary updates** (a minimum can't be *un-added*), where the segment tree is the right tool.\n\nPitfalls: index 0 (`0 & -0` is 0, so a 0-indexed loop never moves; shift by one), and mixing up *add delta* with *set value* (to set, add `value - old`).",
      },
      {
        kind: "question",
        title: "Pick the tool",
        body: "Which job is a Fenwick tree a **poor** fit for?",
        question: {
          type: "choice",
          options: ["Prefix sums with point updates", "Counting inversions in a list", "Range sums as prefix(r) − prefix(l − 1)", "Range minimum with arbitrary updates"],
          answer: 3,
          feedback: { 0: "That is exactly what it is built for.", 1: "Inversions are a classic Fenwick job: count earlier greater values with prefix sums over ranks.", 2: "Range sums come straight from two prefix sums." },
          hint: "Fenwick cells are combined by adding and subtracting. Which operation can't be undone that way?",
        },
        explanation: "Sums can be split as `prefix(r) - prefix(l - 1)`, but minimums can't be subtracted, and raising a value can't be undone in the cells that stored the old minimum. Use a segment tree for range min/max.",
      },
      {
        kind: "code",
        title: "A Fenwick tree",
        body: "Write `Fenwick(n)` for positions `0..n-1` (all 0 at the start) with `add(i, delta)`, `prefix(i)` (the sum of positions 0..i; `prefix(-1)` is 0) and `range_sum(l, r)` (positions l..r inclusive). All O(log n).",
        language: "python",
        starter: `class Fenwick:
    def __init__(self, n):
        self.n = n
        self.tree = [0] * (n + 1)  # 1-indexed inside

    def add(self, i, delta):
        pass

    def prefix(self, i):
        return 0

    def range_sum(self, l, r):
        return 0
`,
        solution: `class Fenwick:
    def __init__(self, n):
        self.n = n
        self.tree = [0] * (n + 1)

    def add(self, i, delta):
        i += 1
        while i <= self.n:
            self.tree[i] += delta
            i += i & -i

    def prefix(self, i):
        i += 1
        s = 0
        while i > 0:
            s += self.tree[i]
            i -= i & -i
        return s

    def range_sum(self, l, r):
        return self.prefix(r) - self.prefix(l - 1)
`,
        tests: [
          { id: "t1", description: "the example values", assertionCode: `f = Fenwick(8)\nfor i, v in enumerate([3, 1, 4, 1, 5, 9, 2, 6]):\n    f.add(i, v)\nr = (f.prefix(6), f.prefix(-1), f.range_sum(4, 5), f.range_sum(0, 7))\nassert r == (25, 0, 14, 31), f"expected (25, 0, 14, 31) for prefix(6), prefix(-1), range_sum(4, 5), range_sum(0, 7); got {r}"` },
          { id: "t2", description: "adds pile up, negatives too", assertionCode: `f = Fenwick(5)\nf.add(2, 10)\nf.add(2, -4)\nf.add(4, 7)\nr = (f.prefix(1), f.prefix(2), f.range_sum(2, 4), f.range_sum(3, 3))\nassert r == (0, 6, 13, 0), f"expected (0, 6, 13, 0), got {r}"` },
          { id: "t3", description: "3,000 random operations", assertionCode: `import random\nrng = random.Random(8)\nn = 200\nvals = [0] * n\nf = Fenwick(n)\nfor step in range(3000):\n    if rng.random() < 0.5:\n        i, d = rng.randrange(n), rng.randint(-20, 20)\n        vals[i] += d\n        f.add(i, d)\n    else:\n        l = rng.randrange(n)\n        r = rng.randrange(l, n)\n        got, want = f.range_sum(l, r), sum(vals[l:r + 1])\n        assert got == want, f"step {step}: range_sum({l}, {r}) gave {got}, expected {want}"` },
        ],
        hints: ["Shift to 1-indexed with `i += 1` at the top of `add` and `prefix`.", "`add` climbs with `i += i & -i` while `i <= n`; `prefix` falls with `i -= i & -i` while `i > 0`; `range_sum` is `prefix(r) - prefix(l - 1)`."],
      },
      {
        kind: "code",
        title: "Overtakes in a race",
        body: "Runners cross a checkpoint in some order; `times` lists their finishing times at the line in that crossing order. Each pair where an earlier-crossing runner has a **strictly greater** time later is an *overtake*. Write `count_inversions(times)`: the number of pairs `i < j` with `times[i] > times[j]`.\n\nThe last test has 8,000 runners: comparing every pair takes too long, a Fenwick tree over ranks is quick.",
        language: "python",
        starter: `def count_inversions(times):
    # rank the values, then for each one count the earlier, greater values with a Fenwick tree
    return 0
`,
        solution: `def count_inversions(times):
    ranks = {v: r for r, v in enumerate(sorted(set(times)))}
    n = len(ranks)
    tree = [0] * (n + 1)
    seen = 0
    total = 0
    for v in times:
        r = ranks[v] + 1
        # how many earlier values are <= v
        i, le = r, 0
        while i > 0:
            le += tree[i]
            i -= i & -i
        total += seen - le
        i = r
        while i <= n:
            tree[i] += 1
            i += i & -i
        seen += 1
    return total
`,
        tests: [
          { id: "t1", description: "small lists", assertionCode: `r = (count_inversions([]), count_inversions([1, 2, 3]), count_inversions([3, 1, 2]))\nassert r == (0, 0, 2), f"expected (0, 0, 2), got {r}"` },
          { id: "t2", description: "equal times are not overtakes", assertionCode: `r = (count_inversions([2, 2, 1]), count_inversions([5, 5, 5]))\nassert r == (2, 0), f"expected (2, 0): only strictly greater counts; got {r}"` },
          { id: "t3", description: "random list against pair counting", assertionCode: `import random\nrng = random.Random(4)\nts = [rng.randint(1, 60) for _ in range(300)]\nwant = sum(1 for i in range(300) for j in range(i + 1, 300) if ts[i] > ts[j])\nr = count_inversions(ts)\nassert r == want, f"expected {want}, got {r}"` },
          { id: "t4", description: "8,000 runners, all reversed", assertionCode: `r = count_inversions(list(range(8000, 0, -1)))\nassert r == 31996000, f"a fully reversed list of 8,000 has 8000 * 7999 / 2 = 31996000 pairs, got {r}"` },
        ],
        hints: ["Rank the values: `ranks = {v: r for r, v in enumerate(sorted(set(times)))}`.", "For each value: earlier values greater than it = (values seen so far) − (earlier values ≤ it, a Fenwick prefix). Then add 1 at its rank."],
      },
      {
        kind: "recap",
        points: [
          "A **Fenwick tree** gives prefix sums with point updates in O(log n), in n + 1 cells.",
          "`i & -i` is the lowest set bit: subtract it to walk a prefix, add it to walk an update.",
          "It is 1-indexed; shift 0-indexed positions by one, or the loops never move.",
          "Range sum = `prefix(r) - prefix(l - 1)`; inversions = earlier values minus earlier values ≤ x, over compressed ranks.",
          "Choose a segment tree instead for range min/max with arbitrary updates.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 3. Design ───────────────────────────────
  {
    id: "fnd-iv-ranges-3-design",
    title: "Design problems: an LRU cache and a rate limiter",
    summary: "Combine a hash map with an ordered structure so every operation is O(1).",
    minutes: 15,
    xp: 90,
    level: "Advanced",
    steps: [
      {
        kind: "explain",
        title: "Pick structures for the operations",
        body:
          "*Design a …* questions give you a class and its methods, and a target cost for each. The work is choosing data structures so **every** method hits its target, then writing it cleanly.\n\nA good routine:\n1. List the methods and the cost each must have (usually O(1) or O(log n)).\n2. For each method, ask which lookup it needs: by key (hash map), by order (linked list, deque), by smallest (heap), by rank (sorted structure).\n3. If no single structure does it all, **combine two** and keep them in sync.\n\nThe classic: an **LRU cache** (least recently used). `get(key)` returns the value or -1; `put(key, value)` stores it; when full, `put` evicts the key used longest ago. Both O(1). A hash map finds keys in O(1) but knows nothing about recency; a **doubly linked list** keeps keys in recency order and can unlink any node in O(1) if you can find it. Together: map from key to list node.\n\n**How to spot it:** *implement a class*, *design a …*, with methods and cost targets.",
      },
      {
        kind: "question",
        title: "Who gets evicted?",
        body: "An LRU cache with capacity 3. The array shows keys from **least** recent (left) to **most** recent (right). Predict each eviction.",
        widget: {
          type: "iv-trace",
          props: {
            title: "LRU cache, capacity 3",
            frames: [
              { array: ["a"], code: LRU_CODE, line: 5, vars: { capacity: 3, size: 1 }, note: "`put(a, 1)`." },
              { array: ["a", "b", "c"], line: 5, vars: { capacity: 3, size: 3 }, note: "`put(b, 2)`, `put(c, 3)`. The cache is full; `a` is the least recent." },
              { array: ["a", "b", "c"], line: 3, note: "Next: `get(a)`, then `put(d, 4)`.", pick: { prompt: "Which key will `put(d, 4)` evict?", answer: 1 } },
              { array: ["c", "a", "d"], highlight: [1, 2], line: 6, vars: { capacity: 3, size: 3, evicted: "b" }, note: "`get(a)` made `a` the most recent: `b, c, a`. Then `put(d)` evicted `b`: **c, a, d**." },
              { array: ["c", "a", "d"], line: 5, note: "Next: `put(c, 30)` (c is already there), then `put(e, 5)`.", pick: { prompt: "Which key will `put(e, 5)` evict?", answer: 1 } },
              { array: ["d", "c", "e"], highlight: [1, 2], line: 6, vars: { capacity: 3, size: 3, evicted: "a" }, note: "Updating `c` also refreshed it: `a, d, c`. So `put(e)` evicted `a`: **d, c, e**." },
            ],
          },
        },
        question: { type: "widget", goal: { picked: true }, prompt: "Answer both picks.", hint: "Every get or put of a key moves it to the most-recent end; the leftmost key goes first." },
        explanation: "Reads count as use, and so do updates of an existing key. Forgetting either one is the most common LRU bug.",
      },
      {
        kind: "question",
        title: "Which structures?",
        body: "Which combination gives O(1) `get` and `put` for an LRU cache?",
        question: {
          type: "choice",
          options: ["A sorted array searched by binary search", "A heap ordered by each key's last-use time", "A hash map pointing into a doubly linked list", "A stack of keys with the newest on top"],
          answer: 2,
          feedback: { 0: "Binary search finds a key in O(log n), and moving it to the end shifts O(n) items.", 1: "Each touch changes a key's time, and fixing its place in the heap is O(log n) (plus finding it).", 3: "A stack can't remove the oldest key from the bottom, or move a key from the middle, in O(1)." },
          hint: "One structure must find a key fast; the other must move any key to the front, and drop the oldest, fast.",
        },
        explanation: "The map finds the node in O(1); the doubly linked list unlinks it and re-links it at the recent end in O(1), and drops the oldest from the other end. Python's `OrderedDict` is exactly this pair (`move_to_end`, `popitem(last=False)`).",
      },
      {
        kind: "explain",
        title: "Writing it",
        body:
          "With `OrderedDict` the whole cache is short. Interviewers sometimes ask for the linked list by hand; use **sentinel** head and tail nodes so you never special-case an empty list.\n\n" +
          py(`
from collections import OrderedDict

class LRUCache:
    def __init__(self, capacity):
        self.capacity = capacity
        self.data = OrderedDict()            # oldest first

    def get(self, key):
        if key not in self.data:
            return -1
        self.data.move_to_end(key)           # now the most recent
        return self.data[key]

    def put(self, key, value):
        self.data[key] = value
        self.data.move_to_end(key)
        if len(self.data) > self.capacity:
            self.data.popitem(last=False)    # drop the oldest
`) +
          "\nThe same thinking designs a **rate limiter**: *allow at most `limit` requests in any `window` seconds*. The method needs the requests inside the window, oldest first, dropping old ones from the front: a **deque** of times. Each request is pushed once and popped once, so `allow` is O(1) amortised.\n\nPitfalls: not refreshing on `get` or on updating an existing key; evicting before inserting (a full cache updating an existing key must not evict); and in rate limiters, counting **denied** requests (decide, and say so).",
      },
      {
        kind: "question",
        title: "Trace it",
        body: "Capacity 2: `put(1, 'a')`, `put(2, 'b')`, `get(1)`, `put(3, 'c')`, then `get(2)`. What does the last `get(2)` return? (A miss returns -1.)",
        question: { type: "number", answer: -1, hint: "After `get(1)`, which of keys 1 and 2 is the least recent when key 3 arrives?" },
        explanation: "`get(1)` makes key 1 the most recent, so `put(3)` evicts key 2. `get(2)` is a miss: **-1**.",
      },
      {
        kind: "code",
        title: "An LRU cache",
        body: "Write `LRUCache(capacity)` with `get(key)` (the value, or -1 if missing) and `put(key, value)`, both O(1). Reads and updates count as use; when a new key would go over capacity, evict the least recently used key. You may use `OrderedDict` or build the linked list yourself.",
        language: "python",
        starter: `class LRUCache:
    def __init__(self, capacity):
        self.capacity = capacity

    def get(self, key):
        return -1

    def put(self, key, value):
        pass
`,
        solution: `from collections import OrderedDict

class LRUCache:
    def __init__(self, capacity):
        self.capacity = capacity
        self.data = OrderedDict()

    def get(self, key):
        if key not in self.data:
            return -1
        self.data.move_to_end(key)
        return self.data[key]

    def put(self, key, value):
        self.data[key] = value
        self.data.move_to_end(key)
        if len(self.data) > self.capacity:
            self.data.popitem(last=False)
`,
        tests: [
          { id: "t1", description: "evicts the least recent", assertionCode: `c = LRUCache(2)\nc.put(1, "a"); c.put(2, "b"); c.put(3, "c")\nr = (c.get(1), c.get(2), c.get(3))\nassert r == (-1, "b", "c"), f"after putting 1, 2, 3 into capacity 2, expected (-1, 'b', 'c'), got {r}"` },
          { id: "t2", description: "get refreshes", assertionCode: `c = LRUCache(2)\nc.put(1, "a"); c.put(2, "b")\nc.get(1)\nc.put(3, "c")\nr = (c.get(1), c.get(2), c.get(3))\nassert r == ("a", -1, "c"), f"get(1) should protect key 1, so key 2 is evicted: expected ('a', -1, 'c'), got {r}"` },
          { id: "t3", description: "updating refreshes and does not evict", assertionCode: `c = LRUCache(2)\nc.put(1, "a"); c.put(2, "b")\nc.put(1, "A")\nr1 = (c.get(1), c.get(2))\nc.put(3, "c")\nr2 = (c.get(1), c.get(2), c.get(3))\nassert r1 == ("A", "b"), f"updating key 1 in a full cache must keep both keys: expected ('A', 'b'), got {r1}"\nassert r2 == (-1, "b", "c"), f"after get(1), get(2), key 1 is the least recent: expected (-1, 'b', 'c'), got {r2}"` },
          { id: "t4", description: "capacity 1 and 4,000 random operations", assertionCode: `import random\nc = LRUCache(1)\nc.put("x", 1); c.put("y", 2)\nassert (c.get("x"), c.get("y")) == (-1, 2), "capacity 1 keeps only the newest key"\nrng = random.Random(21)\nc = LRUCache(5)\nmodel = []  # [key, value], oldest first\nfor step in range(4000):\n    k = rng.randrange(9)\n    if rng.random() < 0.5:\n        hit = [p for p in model if p[0] == k]\n        want = hit[0][1] if hit else -1\n        if hit:\n            model.remove(hit[0]); model.append(hit[0])\n        got = c.get(k)\n        assert got == want, f"step {step}: get({k}) gave {got}, expected {want}"\n    else:\n        model = [p for p in model if p[0] != k] + [[k, step]]\n        if len(model) > 5:\n            model.pop(0)\n        c.put(k, step)` },
        ],
        hints: ["`OrderedDict` keeps insertion order: `move_to_end(key)` marks a key as most recent, `popitem(last=False)` removes the oldest.", "In `put`, store the value and move it to the end first, then evict only if the size is over capacity."],
      },
      {
        kind: "code",
        title: "A rate limiter",
        body: "An API allows at most `limit` requests in any `window` seconds. Write `RateLimiter(limit, window)` with `allow(t)`: `t` is the request time in whole seconds (never decreasing). Allow the request (return `True` and remember it) if fewer than `limit` **allowed** requests have times in `(t - window, t]`; otherwise return `False`. Denied requests are not remembered.",
        language: "python",
        starter: `from collections import deque

class RateLimiter:
    def __init__(self, limit, window):
        self.limit = limit
        self.window = window

    def allow(self, t):
        # drop times that left the window, then compare the count with the limit
        return True
`,
        solution: `from collections import deque

class RateLimiter:
    def __init__(self, limit, window):
        self.limit = limit
        self.window = window
        self.times = deque()

    def allow(self, t):
        while self.times and self.times[0] <= t - self.window:
            self.times.popleft()
        if len(self.times) < self.limit:
            self.times.append(t)
            return True
        return False
`,
        tests: [
          { id: "t1", description: "the limit within a window", assertionCode: `rl = RateLimiter(3, 10)\nr = [rl.allow(t) for t in (1, 2, 3, 4)]\nassert r == [True, True, True, False], f"3 per 10 s: expected [True, True, True, False] at 1, 2, 3, 4; got {r}"` },
          { id: "t2", description: "old requests leave the window", assertionCode: `rl = RateLimiter(3, 10)\nfor t in (1, 2, 3):\n    rl.allow(t)\nr = [rl.allow(t) for t in (10, 11, 12, 13, 14)]\nassert r == [False, True, True, True, False], f"the request at 1 leaves the window at 11: expected [False, True, True, True, False] at 10..14; got {r}"` },
          { id: "t3", description: "denied requests do not count", assertionCode: `rl = RateLimiter(1, 5)\nr = [rl.allow(t) for t in (0, 1, 2, 3, 4, 5, 6)]\nassert r == [True, False, False, False, False, True, False], f"limit 1 per 5 s: expected [True, False, False, False, False, True, False]; got {r}"` },
          { id: "t4", description: "same second, and many requests", assertionCode: `rl = RateLimiter(2, 1)\nr = [rl.allow(7), rl.allow(7), rl.allow(7), rl.allow(8)]\nassert r == [True, True, False, True], f"2 per 1 s: expected [True, True, False, True], got {r}"\nrl = RateLimiter(100, 60)\nok = sum(rl.allow(t // 10) for t in range(40000))\nassert ok == 6700, f"expected 6700 allowed of 40,000 requests (100 per minute over 4,000 s), got {ok}"` },
        ],
        hints: ["Keep a `deque` of allowed times. A time `s` is still inside the window while `s > t - window`.", "Pop from the left while `times[0] <= t - window`; then allow (and append) only if `len(times) < limit`."],
      },
      {
        kind: "recap",
        points: [
          "Design questions: list each method's cost target, then choose (and combine) structures to meet them.",
          "**LRU cache** = hash map + doubly linked list (Python: `OrderedDict`), O(1) get and put.",
          "Reads and updates both refresh recency; evict only when a **new** key overflows.",
          "**Rate limiter**: a deque of allowed times in the window, each pushed and popped once.",
          "Say your choices out loud: what counts, what is evicted, what happens on ties.",
        ],
      },
    ],
  },
];
