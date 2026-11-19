import type { ConceptLesson } from "../../learn/types.ts";

/** Fenced Python block for lesson prose. */
const py = (code: string) => "~~~python\n" + code.trim() + "\n~~~";

// ── shared widget data ──
const COIN_CODE = [
  "dp = [1]                    # 0 coins: 0 heads for sure",
  "for coin in range(n):",
  "    new = [0] * (len(dp) + 1)",
  "    for k, pr in enumerate(dp):",
  "        new[k] += pr * (1 - p)      # tails",
  "        new[k + 1] += pr * p        # heads",
  "    dp = new",
];
const SHUFFLE_CODE = ["for i in range(n - 1, 0, -1):", "    j = random.randint(0, i)", "    items[i], items[j] = items[j], items[i]"];
const RESERVOIR_CODE = [
  "for i, item in enumerate(stream):    # i counts from 0",
  "    if i < k:",
  "        res.append(item)",
  "    else:",
  "        j = random.randint(0, i)",
  "        if j < k:",
  "            res[j] = item",
];
const DICE_GRID = Array.from({ length: 6 }, (_, r) => Array.from({ length: 6 }, (_, c) => r * 6 + c + 1));
const PLAYER_GRID = DICE_GRID.map((row) => row.map((x) => (x <= 30 ? ((x - 1) % 10) + 1 : "×")));
const REJECTED = Array.from({ length: 6 }, (_, c) => ({ r: 5, c, tone: "wall" as const }));
const REJECTION_CODE = ["while True:", "    x = (roll() - 1) * 6 + roll()     # 1 .. 36, all equally likely", "    if x <= 30:", "        return (x - 1) % 10 + 1       # 1 .. 10"];
const OPEN = "●";
const SHUT = "○";
const lockers = (open: number[]) => Array.from({ length: 9 }, (_, i) => (open.includes(i + 1) ? OPEN : SHUT));
const LOCKER_CODE = ["for p in range(1, n + 1):          # pass p", "    for k in range(p, n + 1, p):  # every p-th locker", "        toggle(k)"];

export const mathLessonsB: ConceptLesson[] = [
  // ─────────────────────────────── 6. Probability and statistics ───────────────────────────────
  {
    id: "fnd-iv-math-6-probability",
    title: "Probability and statistics",
    summary: "Complements, expected value and its linearity, probability DP, and mean, median and mode.",
    minutes: 12,
    xp: 70,
    level: "Intermediate",
    steps: [
      {
        kind: "explain",
        title: "The rules you need",
        body:
          "With equally likely outcomes, **probability** = favourable outcomes / all outcomes. Then a handful of rules carry most interview questions:\n\n" +
          "- **Complement:** P(at least one) = 1 − P(none). Much easier than adding up all the \"at least\" cases.\n" +
          "- **Independent** events multiply: two coin flips both heads is 1/2 · 1/2. Events that can't happen together add.\n" +
          "- **Expected value** is the probability-weighted average: E[X] = Σ value · P(value). **Linearity:** E[X + Y] = E[X] + E[Y], even when X and Y depend on each other. Split a count into 0/1 indicators and add their probabilities.\n" +
          "- Waiting for a success of probability p takes **1/p** tries on average.\n" +
          "- **Probability DP:** when outcomes build up step by step, keep an array of probabilities per state and update it each step, instead of listing every path.\n\n" +
          "For data, the **mean** is the sum over the count; the **median** is the middle value after sorting (the average of the two middle ones for an even count); the **mode** is the most frequent value. The median ignores outliers; the mean doesn't.\n\n" +
          "**How to spot it:** \"probability that\", \"expected number\", \"on average\", \"at least one\", \"median\", answers with a tolerance like 10⁻⁵.",
      },
      {
        kind: "question",
        title: "Heads, coin by coin",
        body: "dp[k] is the probability of exactly k heads so far. Each new fair coin moves every state to k (tails) or k + 1 (heads), each with probability 1/2. Step through four coins.",
        widget: {
          type: "iv-trace",
          props: {
            title: "Probability of k heads",
            frames: [
              { array: ["1"], code: COIN_CODE, line: 1, vars: { coins: 0 }, note: "No coins yet: 0 heads with probability 1. The index is the number of heads." },
              { array: ["1/2", "1/2"], line: 7, vars: { coins: 1 }, note: "One coin: 0 or 1 heads, half each." },
              { array: ["?", "?", "?"], line: 4, vars: { coins: 2 }, note: "Index 0 = no heads, 1 = one head, 2 = two heads.", pick: { prompt: "After two coins, which count of heads is most likely?", answer: 1 } },
              { array: ["1/4", "1/2", "1/4"], highlight: [1], line: 7, vars: { coins: 2 }, note: "One head arrives two ways: from 0 heads then heads, or from 1 head then tails. `1/4 + 1/4 = 1/2`." },
              { array: ["1/8", "3/8", "3/8", "1/8"], line: 7, vars: { coins: 3 }, note: "Three coins: each entry is half the one above-left plus half the one above." },
              { array: ["?", "?", "?", "?", "?"], line: 4, vars: { coins: 4 }, note: "One more coin.", pick: { prompt: "After four coins, which count is most likely?", answer: 2 } },
              { array: ["1/16", "4/16", "6/16", "4/16", "1/16"], highlight: [2], line: 7, vars: { coins: 4 }, note: "The numerators are **1 4 6 4 1**, a row of Pascal's triangle: P(2 heads) = 6/16 = 0.375. O(n²) work for n coins instead of 2ⁿ paths." },
            ],
          },
        },
        question: { type: "widget", goal: { picked: true }, prompt: "Answer both picks.", hint: "The middle counts can be reached in the most ways, so they collect the most probability." },
        explanation: "Each step spreads every state's probability over its two successors. For a fair coin that's Pascal's rule divided by 2ⁿ; for a biased coin the same DP just uses p and 1 − p.",
      },
      {
        kind: "question",
        title: "At least one six",
        body: "You roll a die twice. Find the probability of at least one six, as a decimal.",
        question: { type: "number", answer: 0.3056, tolerance: 0.005, hint: "Work out the chance of no six at all, then subtract it from 1." },
        explanation: "No six twice: (5/6)² = 25/36. So at least one six is 1 − 25/36 = 11/36 ≈ **0.306**. Adding 1/6 + 1/6 would count the double six twice.",
      },
      {
        kind: "question",
        title: "Waiting for a six",
        body: "You roll a die until the first six. On average, how many rolls does it take?",
        question: { type: "number", answer: 6, unit: "rolls", hint: "A success with probability p takes 1/p tries on average." },
        explanation: "Success probability 1/6 per roll, so the expected wait is 1 / (1/6) = **6** rolls.",
      },
      {
        kind: "question",
        title: "The cloakroom mix-up",
        body: "Ten guests leave their coats; at the end the coats are handed back in a uniformly random order. What is the expected number of guests who get their own coat back?",
        question: {
          type: "choice",
          options: ["0", "1/10", "1", "5"],
          answer: 2,
          feedback: { 0: "Sometimes nobody does, but often someone does: the average is above 0.", 1: "That's the chance for one particular guest; there are ten of them.", 3: "That would need each guest to have a 1/2 chance." },
          hint: "Each guest gets their own coat with probability 1/10. Linearity lets you add those up even though the events depend on each other.",
        },
        explanation: "Let X_i be 1 if guest i gets their coat. E[X_i] = 1/10, and by linearity E[X_1 + … + X_10] = 10 · 1/10 = **1**, for any number of guests.",
      },
      {
        kind: "question",
        title: "A typical salary",
        body: "A start-up pays nine people about £40k each and its founder £2m. You want one number for \"what a typical person here earns\". Which should you report?",
        question: {
          type: "choice",
          options: ["The mean", "The median", "The largest value", "The mean of the smallest and largest"],
          answer: 1,
          feedback: { 0: "The mean is about £236k: no employee earns anything like that.", 3: "That's about £1m, even further from typical." },
          hint: "One of these measures doesn't move when a single extreme value gets more extreme.",
        },
        explanation: "The median is the middle value, £40k, and the founder's salary can't drag it. The mean (≈ £236k) is pulled far up by one outlier.",
      },
      {
        kind: "code",
        title: "Heads distribution",
        body: "A game flips a biased coin (heads with probability `p`) `n` times. Write `heads_distribution(n, p)`: a list of n + 1 floats where entry k is the probability of exactly k heads. Use the DP from the trace.",
        language: "python",
        starter: `def heads_distribution(n, p):
    # dp[k] = probability of k heads so far; start with dp = [1.0]
    return []
`,
        solution: `def heads_distribution(n, p):
    dp = [1.0]
    for _ in range(n):
        new = [0.0] * (len(dp) + 1)
        for k, pr in enumerate(dp):
            new[k] += pr * (1 - p)
            new[k + 1] += pr * p
        dp = new
    return dp
`,
        tests: [
          { id: "t1", description: "no flips", assertionCode: `_r = heads_distribution(0, 0.5)\nassert isinstance(_r, list) and len(_r) == 1 and abs(_r[0] - 1) < 1e-9, f"with no flips, 0 heads is certain: expected [1.0], got {_r}"` },
          { id: "t2", description: "three fair flips", assertionCode: `_r = heads_distribution(3, 0.5)\n_want = [0.125, 0.375, 0.375, 0.125]\nassert isinstance(_r, list) and len(_r) == 4, f"expected 4 entries, got {_r}"\nassert all(abs(a - b) < 1e-9 for a, b in zip(_r, _want)), f"expected {_want}, got {_r}"` },
          { id: "t3", description: "a biased coin", assertionCode: `_r = heads_distribution(2, 0.3)\n_want = [0.49, 0.42, 0.09]\nassert isinstance(_r, list) and len(_r) == 3, f"expected 3 entries, got {_r}"\nassert all(abs(a - b) < 1e-9 for a, b in zip(_r, _want)), f"two flips with p = 0.3: expected {_want} (0.7², 2·0.3·0.7, 0.3²), got {_r}"` },
          { id: "t4", description: "four hundred flips", assertionCode: `import math\n_r = heads_distribution(400, 0.5)\nassert isinstance(_r, list) and len(_r) == 401, "expected 401 entries"\nassert abs(sum(_r) - 1) < 1e-6, f"the probabilities should add up to 1, got {sum(_r)}"\n_want = math.comb(400, 200) / 2**400\nassert abs(_r[200] - _want) < 1e-9, f"P(200 heads) should be about {_want:.6f}, got {_r[200]}"` },
        ],
        hints: ["Each round, make a list one longer. Entry k gets `pr * (1 - p)` from old k (tails) and `pr * p` from old k - 1 (heads)."],
      },
      {
        kind: "code",
        title: "Summary numbers",
        body: "Write `summary(nums)` for a non-empty list of numbers, returning a tuple `(mean, median, mode)`. The median of an even count is the average of the two middle values; if several values tie for most frequent, the mode is the **smallest** of them.",
        language: "python",
        starter: `def summary(nums):
    # mean: sum / count; median: middle of the SORTED list; mode: most frequent (smallest on ties)
    pass
`,
        solution: `def summary(nums):
    s = sorted(nums)
    n = len(s)
    mean = sum(s) / n
    if n % 2 == 1:
        median = s[n // 2]
    else:
        median = (s[n // 2 - 1] + s[n // 2]) / 2
    counts = {}
    for x in s:
        counts[x] = counts.get(x, 0) + 1
    top = max(counts.values())
    mode = min(x for x, c in counts.items() if c == top)
    return (mean, median, mode)
`,
        tests: [
          { id: "t1", description: "an unsorted odd-length list", assertionCode: `_r = summary([3, 1, 2])\nassert _r is not None and tuple(_r) == (2, 2, 1), f"summary([3, 1, 2]) should be (2.0, 2, 1): sort before taking the middle, and ties go to the smallest. Got {_r}"` },
          { id: "t2", description: "an even-length list", assertionCode: `_r = summary([4, 1, 3, 2])\nassert _r is not None and tuple(_r) == (2.5, 2.5, 1), f"summary([4, 1, 3, 2]) should be (2.5, 2.5, 1), got {_r}"` },
          { id: "t3", description: "negatives and a clear mode", assertionCode: `_r = summary([-2, 7, -2, 1])\nassert _r is not None and tuple(_r) == (1, -0.5, -2), f"summary([-2, 7, -2, 1]) should be (1.0, -0.5, -2), got {_r}"` },
          { id: "t4", description: "one value", assertionCode: `_r = summary([5])\nassert _r is not None and tuple(_r) == (5, 5, 5), f"summary([5]) should be (5.0, 5, 5), got {_r}"` },
        ],
        hints: ["Sort a copy first: `s = sorted(nums)`. For an even length n the middle values are `s[n // 2 - 1]` and `s[n // 2]`.", "Count with a dict, find the top count, then take `min` of the values with that count."],
      },
      {
        kind: "recap",
        points: [
          "P(at least one) = 1 − P(none); independent events multiply.",
          "**Linearity of expectation:** split a count into 0/1 indicators and add their probabilities, dependent or not.",
          "Waiting for a probability-p success takes 1/p tries on average.",
          "**Probability DP** keeps one probability per state and updates it step by step.",
          "Median: sort, then the middle (or the average of the two middles). It resists outliers; the mean doesn't.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 7. Randomized ───────────────────────────────
  {
    id: "fnd-iv-math-7-randomized",
    title: "Randomized algorithms: shuffles and weighted picks",
    summary: "Las Vegas and Monte Carlo, the Fisher–Yates shuffle and why the naive one is biased, random pivots, and weighted picks.",
    minutes: 12,
    xp: 80,
    level: "Advanced",
    steps: [
      {
        kind: "explain",
        title: "Using randomness on purpose",
        body:
          "A **randomized algorithm** flips coins as it runs. Two kinds:\n\n" +
          "- **Las Vegas:** always correct, the running time is random. Quicksort or quickselect with a **random pivot** take O(n log n) / O(n) on average for *every* input, because no fixed input can force bad pivots every time.\n" +
          "- **Monte Carlo:** fixed running time, small chance of a wrong answer, which repeating shrinks. Example: a random-number primality test.\n\n" +
          "Two patterns come up constantly:\n\n" +
          "- **Fisher–Yates shuffle:** walk i from the end; swap item i with a uniformly random j in `0..i`. O(n), and every ordering has probability exactly 1/n!.\n" +
          "- **Weighted pick:** build prefix sums of the weights, draw `x = random() * total`, and binary-search for the first prefix sum greater than x. O(n) setup, O(log n) per pick.\n\n" +
          py(`
import bisect, itertools, random
prefix = list(itertools.accumulate([1, 3, 6]))   # [1, 4, 10]
x = random.random() * prefix[-1]                 # 0 <= x < 10
i = bisect.bisect_right(prefix, x)               # 0 with prob 1/10, 1 with 3/10, 2 with 6/10
`) +
          "\n\nIn tests, call `random.seed(…)` so a randomized run is repeatable.\n\n" +
          "**How to spot it:** \"return a random … with equal probability\", \"shuffle\", \"pick in proportion to its weight\", \"expected time\", a pivot that must not be predictable.",
      },
      {
        kind: "question",
        title: "Fisher–Yates, step by step",
        body: "The random draws are fixed here so you can follow them. Everything right of `i` is already final. At each pick, tap the cell that moves into position `i`.",
        widget: {
          type: "iv-trace",
          props: {
            title: "Shuffling five cards",
            frames: [
              { array: ["A", "B", "C", "D", "E"], code: SHUFFLE_CODE, line: 1, note: "Walk `i` from the last position down to 1." },
              { pointers: { i: 4 }, range: [0, 4], line: 2, vars: { i: 4, j: 1 }, note: "`j` is drawn from the shaded range 0..4. It came out as 1.", pick: { prompt: "Which cell swaps into position 4?", answer: 1 } },
              { array: ["A", "E", "C", "D", "B"], pointers: { i: 4 }, highlight: [1, 4], done: [4], line: 3, note: "B and E swap. Position 4 is now final." },
              { pointers: { i: 3 }, range: [0, 3], done: [4], line: 2, vars: { i: 3, j: 3 }, note: "`j = 3 = i`: D stays put. Drawing i itself must be allowed, or D could never end where it started." },
              { pointers: { i: 2 }, range: [0, 2], done: [3, 4], line: 2, vars: { i: 2, j: 0 }, note: "Now i = 2, and the draw is j = 0.", pick: { prompt: "Which cell moves into position 2?", answer: 0 } },
              { array: ["C", "E", "A", "D", "B"], pointers: { i: 2 }, highlight: [0, 2], done: [2, 3, 4], line: 3, note: "A and C swap." },
              { array: ["E", "C", "A", "D", "B"], pointers: { i: 1 }, highlight: [0, 1], done: [1, 2, 3, 4], line: 3, vars: { i: 1, j: 0 }, note: "Last draw: j = 0, swap." },
              { done: [0, 1, 2, 3, 4], line: 1, vars: {}, note: "Draws with 5, 4, 3 and 2 choices: 5 · 4 · 3 · 2 = 120 = 5! equally likely runs, one for each ordering. **Uniform.**" },
            ],
          },
        },
        question: { type: "widget", goal: { picked: true }, prompt: "Answer both picks.", hint: "j is an index: the item sitting at index j trades places with the item at index i." },
        explanation: "Fisher–Yates fixes one position per step, choosing its item uniformly from those not yet placed. That's exactly drawing a random ordering one card at a time.",
      },
      {
        kind: "question",
        title: "The naive shuffle",
        body: "A tempting shuffle: for **every** i, swap item i with `randint(0, n - 1)`, a random position in the whole list. For n = 3, how many equally likely sequences of draws are there?",
        question: { type: "number", answer: 27, unit: "sequences", hint: "Three draws, each with three possible values." },
        explanation: "3 · 3 · 3 = **27** equally likely runs, but there are only 3! = 6 orderings.",
      },
      {
        kind: "question",
        title: "So why is it biased?",
        body: "Following on: the naive shuffle has 27 equally likely runs and there are 6 orderings. Why can't all six orderings be equally likely?",
        question: {
          type: "choice",
          options: ["27 runs can't split evenly over 6 orderings", "It swaps too few times to mix the cards", "Python's randint is not random enough", "The first card never moves"],
          answer: 0,
          feedback: { 1: "It makes n swaps, one more than Fisher–Yates.", 2: "Even with a perfect random source it's biased.", 3: "The first card moves in many runs." },
          hint: "Each ordering collects a whole number of the equally likely runs. Can 27 runs be shared equally among 6 orderings?",
        },
        explanation: "Each ordering gets a whole number of the 27 runs, and 27 / 6 is not a whole number, so some orderings get 5 runs and others 4. In general nⁿ is not divisible by n!, so the bias never goes away.",
      },
      {
        kind: "question",
        title: "Random pivots",
        body: "Quicksort picks a uniformly random pivot each time. What can you say about its running time on an already sorted array of n items?",
        question: {
          type: "choice",
          options: ["Always O(n²): sorted input is its worst case", "Always exactly n log₂ n comparisons", "O(n log n) expected; O(n²) possible but very unlikely", "O(n) expected, since the input is already sorted"],
          answer: 2,
          feedback: { 0: "That's true for quicksort with the *first* element as pivot, not a random one.", 3: "Quicksort still compares items; sorted input doesn't make it linear." },
          hint: "With random pivots, the input order no longer decides which pivots get chosen.",
        },
        explanation: "The randomness is inside the algorithm, so every input, sorted or not, gets the same O(n log n) **expected** time. A run of bad pivots is still possible but astronomically unlikely for large n. That's a Las Vegas algorithm.",
      },
      {
        kind: "code",
        title: "A fair shuffle",
        body: "A music app shuffles playlists. Write `shuffle(items)` that shuffles the list **in place** with Fisher–Yates using `random.randint`, and returns nothing. Don't call `random.shuffle` or `random.sample`. The checks shuffle tens of thousands of times and count how often each ordering appears.",
        language: "python",
        starter: `import random

def shuffle(items):
    # for i from the last index down to 1: pick j in 0..i, swap items[i] and items[j]
    pass
`,
        solution: `import random

def shuffle(items):
    for i in range(len(items) - 1, 0, -1):
        j = random.randint(0, i)
        items[i], items[j] = items[j], items[i]
`,
        tests: [
          {
            id: "t1",
            description: "shuffles in place",
            assertionCode: `import random
random.seed(1)
_items = list(range(10))
_r = shuffle(_items)
assert _r is None, "shuffle in place and return nothing, like random.shuffle does"
assert sorted(_items) == list(range(10)), f"the list should hold the same values in a new order, got {_items}"
assert _items != list(range(10)), "the list came back in its original order: nothing was swapped"
_e, _o = [], [7]
shuffle(_e)
shuffle(_o)
assert _e == [] and _o == [7], "an empty list and a one-item list should come back unchanged"`,
          },
          {
            id: "t2",
            description: "all six orderings of 3 items equally often",
            assertionCode: `import random
random.seed(2026)
_seen = {}
for _ in range(30000):
    _a = [0, 1, 2]
    shuffle(_a)
    _seen[tuple(_a)] = _seen.get(tuple(_a), 0) + 1
assert len(_seen) == 6, f"all 6 orderings should appear, saw {len(_seen)}: does j range over 0..i, including i?"
_bad = {k: v for k, v in _seen.items() if abs(v - 5000) > 300}
assert not _bad, f"each ordering should appear about 5000 times in 30000 shuffles; these are off: {_bad}. Draw j from 0..i, not from the whole list."`,
          },
          {
            id: "t3",
            description: "every card can land anywhere",
            assertionCode: `import random
random.seed(77)
_pos = {}
for _ in range(20000):
    _a = [0, 1, 2, 3]
    shuffle(_a)
    for _p, _v in enumerate(_a):
        _pos[(_v, _p)] = _pos.get((_v, _p), 0) + 1
assert len(_pos) == 16, "every card should be able to end in every position"
_bad = {k: v for k, v in _pos.items() if abs(v - 5000) > 300}
assert not _bad, f"each card should land in each position about 5000 times; these (card, position) pairs are off: {_bad}"`,
          },
        ],
        hints: ["`for i in range(len(items) - 1, 0, -1):` then `j = random.randint(0, i)` (inclusive) and swap.", "If some orderings never appear, you probably excluded i itself; if they're uneven, you're drawing from the whole list."],
      },
      {
        kind: "code",
        title: "Weighted picks",
        body: "A quiz picks the next question in proportion to how often you got it wrong. Write `make_picker(weights, rand=random.random)` that does the setup once and returns a function `pick()` giving an index. Item i owns the slice `[prefix before i, prefix before i + weights[i])` of the range `0 .. total`; draw `x = rand() * total` and return the item whose slice contains x, using binary search (`bisect`). Weights are non-negative and at least one is positive. The last check makes 20,000 picks from 20,000 weights.",
        language: "python",
        starter: `import bisect
import random

def make_picker(weights, rand=random.random):
    # Setup: prefix sums of the weights.
    def pick():
        # x = rand() * total; return the index whose slice holds x
        return 0
    return pick
`,
        solution: `import bisect
import random

def make_picker(weights, rand=random.random):
    prefix = []
    total = 0
    for w in weights:
        total += w
        prefix.append(total)
    def pick():
        x = rand() * total
        return bisect.bisect_right(prefix, x)
    return pick
`,
        tests: [
          {
            id: "t1",
            description: "draws land in the right slices",
            assertionCode: `_vals = iter([0.05, 0.15, 0.39, 0.4, 0.999])
_pick = make_picker([1, 3, 6], rand=lambda: next(_vals))
assert callable(_pick), "make_picker should return a function"
_got = [_pick() for _ in range(5)]
assert _got == [0, 1, 1, 2, 2], f"with weights [1, 3, 6] (slices [0,1) [1,4) [4,10)), draws x = 0.5, 1.5, 3.9, 4.0, 9.99 should give [0, 1, 1, 2, 2], got {_got}"`,
          },
          {
            id: "t2",
            description: "zero weights are never picked",
            assertionCode: `_vals = iter([0.0, 0.49, 0.5, 0.99])
_pick = make_picker([0, 5, 0, 5], rand=lambda: next(_vals))
assert callable(_pick), "make_picker should return a function"
_got = [_pick() for _ in range(4)]
assert _got == [1, 1, 3, 3], f"weights [0, 5, 0, 5]: items 0 and 2 own empty slices, so expected [1, 1, 3, 3], got {_got}"`,
          },
          {
            id: "t3",
            description: "proportions, and speed",
            assertionCode: `import random
random.seed(5)
_pick = make_picker([1, 3, 6])
assert callable(_pick), "make_picker should return a function"
_c = [0, 0, 0]
for _ in range(30000):
    _c[_pick()] += 1
assert all(abs(_c[i] / 30000 - w) < 0.02 for i, w in enumerate([0.1, 0.3, 0.6])), f"expected about 10%, 30%, 60%, got {_c}"
_big = make_picker([i % 7 + 1 for i in range(20000)])
_out = [_big() for _ in range(20000)]
assert all(0 <= i < 20000 for i in _out), "every pick should be a valid index"`,
          },
        ],
        hints: ["Build `prefix` once, outside `pick`, so it isn't rebuilt on every call.", "`bisect.bisect_right(prefix, x)` is the first index whose prefix sum is greater than x."],
      },
      {
        kind: "recap",
        points: [
          "**Las Vegas** algorithms are always right with random running time (random-pivot quicksort); **Monte Carlo** ones run in fixed time and are rarely wrong.",
          "**Fisher–Yates:** for i from n − 1 down to 1, swap with `randint(0, i)`. Uniform, O(n).",
          "Drawing from the whole list every time is biased: nⁿ runs can't split evenly over n! orderings.",
          "**Weighted pick:** prefix sums + `bisect_right` on `random() * total`, O(log n) per pick.",
          "Seed the generator in tests so random runs are repeatable.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 8. Reservoir sampling ───────────────────────────────
  {
    id: "fnd-iv-math-8-reservoir",
    title: "Reservoir sampling",
    summary: "Pick k items uniformly from a stream of unknown length, in one pass and O(k) memory.",
    minutes: 10,
    xp: 80,
    level: "Advanced",
    steps: [
      {
        kind: "explain",
        title: "Sampling a stream",
        body:
          "You see items one at a time, you don't know how many will come, and you can't store them all: a log, a linked list, a sensor feed. You want k of them, every item equally likely to be chosen.\n\n" +
          "**Reservoir sampling** (Algorithm R) keeps a reservoir of k items:\n\n" +
          py(`
res = []
for i, item in enumerate(stream):      # i = 0, 1, 2, ...
    if i < k:
        res.append(item)               # the first k go straight in
    else:
        j = random.randint(0, i)       # i + 1 equally likely values
        if j < k:
            res[j] = item              # probability k / (i + 1)
`) +
          "\n\nWhy it's fair: the item at position i (counting from 1 now) gets in with probability k/i. Each later item j replaces it with probability (k/j) · (1/k) = 1/j, so it survives with (j − 1)/j. Multiply over j = i + 1 … n and the product telescopes:\n\n" +
          "k/i · i/(i+1) · (i+1)/(i+2) · … · (n−1)/n = **k/n**, the same for every item.\n\n" +
          "One pass, O(k) memory, and at any moment the reservoir is a fair sample of everything seen so far.\n\n" +
          "**How to spot it:** \"stream\", \"unknown length\", \"too big to fit in memory\", \"random node of a linked list using O(1) space\", \"each item with equal probability\".",
      },
      {
        kind: "question",
        title: "Fill and replace",
        body: "k = 2, a stream of six songs, and fixed draws so you can follow along. At each pick, tap the song that gets pushed out of the reservoir.",
        widget: {
          type: "iv-trace",
          props: {
            title: "Keeping 2 songs from a stream",
            frames: [
              { array: ["A", "B", "C", "D", "E", "F"], pointers: { i: 0 }, highlight: [0], stacks: [{ label: "reservoir", items: ["A"], kind: "queue" }], code: RESERVOIR_CODE, line: 3, vars: { k: 2 }, note: "The first k = 2 songs go straight in." },
              { pointers: { i: 1 }, highlight: [1], stacks: [{ label: "reservoir", items: ["A", "B"], kind: "queue" }], line: 3, note: "Now the reservoir is full: slot 0 holds A, slot 1 holds B." },
              { pointers: { i: 2 }, highlight: [2], stacks: [{ label: "reservoir", items: ["A", "C"], kind: "queue" }], line: 7, vars: { k: 2, j: 1 }, note: "C: `j = randint(0, 2)` gave 1 < 2, so C takes slot 1 and B is out. C got in with probability 2/3." },
              { pointers: { i: 3 }, highlight: [3], line: 6, vars: { k: 2, j: 3 }, note: "D: j = 3 is not < 2, so D is skipped. (It had a 2/4 chance.)" },
              { pointers: { i: 4 }, highlight: [4], line: 6, vars: { k: 2, j: 0 }, note: "E arrives and the draw is j = 0.", pick: { prompt: "Which song gets pushed out?", answer: 0 } },
              { pointers: { i: 4 }, highlight: [4], stacks: [{ label: "reservoir", items: ["E", "C"], kind: "queue" }], line: 7, note: "E takes slot 0: A is gone." },
              { pointers: { i: 5 }, highlight: [5], line: 6, vars: { k: 2, j: 1 }, note: "F arrives and the draw is j = 1.", pick: { prompt: "Which song is pushed out now?", answer: 2 } },
              { pointers: { i: 5 }, highlight: [5], stacks: [{ label: "reservoir", items: ["E", "F"], kind: "queue" }], line: 7, vars: { k: 2 }, note: "F replaces C. The sample is **E, F**; over all possible draws, every song ends up in it with probability 2/6." },
            ],
          },
        },
        question: { type: "widget", goal: { picked: true }, prompt: "Answer both picks.", hint: "j names a slot. Look at which song sits in that slot right now." },
        explanation: "Only slots matter: a draw j < k overwrites slot j, whatever song is there. Late songs get in less often (k/i), but early songs had more chances to be pushed out, and the two effects balance exactly.",
      },
      {
        kind: "question",
        title: "One song from five",
        body: "With k = 1 and a stream of 5 songs, find the probability that the **3rd** song is the one kept at the end.",
        question: { type: "number", answer: 0.2, tolerance: 0.001, hint: "It gets in with probability 1/3, then must survive songs 4 and 5." },
        explanation: "1/3 · (3/4) · (4/5) = 1/5 = **0.2**, the same as every other song.",
      },
      {
        kind: "question",
        title: "Getting in",
        body: "k = 3. The 10th item of the stream arrives. Find the probability that it enters the reservoir.",
        question: { type: "number", answer: 0.3, tolerance: 0.001, hint: "j is drawn from 10 equally likely values, and the item enters when j is one of the k smallest." },
        explanation: "`j = randint(0, 9)` has 10 values and 3 of them (0, 1, 2) are below k: **3/10**.",
      },
      {
        kind: "question",
        title: "Memory",
        body: "The stream has n items and you keep k. How much memory does reservoir sampling need?",
        question: {
          type: "choice",
          options: ["O(n): it has to store the stream", "O(n − k)", "O(log n) for the counter only", "O(k), plus a counter"],
          answer: 3,
          feedback: { 0: "That's exactly what it avoids: each item is looked at once and then forgotten unless it's in the reservoir.", 2: "The counter is tiny, but the k kept items need room too." },
          hint: "What does the loop keep between one item and the next?",
        },
        explanation: "Only the k reservoir items and the count i survive from one item to the next: **O(k)**. That's why it works on streams too big for memory.",
      },
      {
        kind: "code",
        title: "One random line",
        body: "A server picks a random line from a log it reads only once. Write `pick_one(stream)`: return one item chosen uniformly from the iterable `stream` (it might be a generator, so no `len` and no indexing), or `None` if it's empty. Keep only the current choice: the i-th item (from 1) replaces it with probability 1/i.",
        language: "python",
        starter: `import random

def pick_one(stream):
    # Count items as they arrive; replace the choice with probability 1 / count.
    return None
`,
        solution: `import random

def pick_one(stream):
    choice = None
    for i, item in enumerate(stream, start=1):
        if random.randint(1, i) == 1:
            choice = item
    return choice
`,
        tests: [
          { id: "t1", description: "empty and one-item streams", assertionCode: `_r = pick_one(iter([]))\nassert _r is None, f"an empty stream should give None, got {_r}"\n_r = pick_one(iter(["only"]))\nassert _r == "only", f"a one-item stream should give that item, got {_r}"` },
          { id: "t2", description: "works on a generator", assertionCode: `import random\nrandom.seed(3)\n_r = pick_one(x for x in "abc")\nassert _r in ("a", "b", "c"), f"should return one of the stream's items, got {_r}"` },
          {
            id: "t3",
            description: "every item equally likely",
            assertionCode: `import random
random.seed(8)
_c = {}
for _ in range(25000):
    _x = pick_one(iter(range(5)))
    _c[_x] = _c.get(_x, 0) + 1
_bad = {k: v for k, v in _c.items() if abs(v - 5000) > 300}
assert len(_c) == 5 and not _bad, f"each of 5 items should be picked about 5000 times in 25000 runs, got {_c}"`,
          },
        ],
        hints: ["`for i, item in enumerate(stream, start=1):` and replace the choice when `random.randint(1, i) == 1`."],
      },
      {
        kind: "code",
        title: "A sample of k",
        body: "Write `sample_k(stream, k)`: k distinct items (by position) chosen uniformly from the iterable, as a list in any order. If the stream has fewer than k items, return all of them. Use Algorithm R from the explanation: the checks count how often each item is chosen.",
        language: "python",
        starter: `import random

def sample_k(stream, k):
    res = []
    # fill res with the first k items, then replace with probability k / (i + 1)
    return res
`,
        solution: `import random

def sample_k(stream, k):
    res = []
    for i, item in enumerate(stream):
        if i < k:
            res.append(item)
        else:
            j = random.randint(0, i)
            if j < k:
                res[j] = item
    return res
`,
        tests: [
          { id: "t1", description: "a short stream returns everything", assertionCode: `_r = sample_k(iter([1, 2]), 5)\nassert _r is not None and sorted(_r) == [1, 2], f"with only 2 items and k = 5, return both, got {_r}"` },
          { id: "t2", description: "k distinct items from the stream", assertionCode: `import random\nrandom.seed(4)\n_r = sample_k((x for x in range(10)), 3)\nassert _r is not None and len(_r) == 3 and len(set(_r)) == 3 and all(0 <= x < 10 for x in _r), f"expected 3 different items from 0..9, got {_r}"` },
          {
            id: "t3",
            description: "every item chosen equally often",
            assertionCode: `import random
random.seed(9)
_c = {}
for _ in range(15000):
    for _x in sample_k(iter(range(6)), 2):
        _c[_x] = _c.get(_x, 0) + 1
_bad = {k: v for k, v in _c.items() if abs(v - 5000) > 300}
assert len(_c) == 6 and not _bad, f"each of 6 items should be in a 2-item sample about 5000 times in 15000 runs, got {_c}. For item i (from 0), draw j from 0..i inclusive."`,
          },
          { id: "t4", description: "a long stream, one pass", assertionCode: `import random\nrandom.seed(10)\n_r = sample_k((x * x for x in range(50000)), 4)\nassert _r is not None and len(_r) == 4 and len(set(_r)) == 4, f"expected 4 different squares, got {_r}"` },
        ],
        hints: ["For the item at 0-based index i ≥ k, draw `j = random.randint(0, i)`; if `j < k`, it replaces `res[j]`.", "If late items are picked too often, check that the draw includes i itself."],
      },
      {
        kind: "recap",
        points: [
          "**Reservoir sampling** keeps k items from a stream of unknown length: one pass, O(k) memory.",
          "Item i (from 1) enters with probability k/i and replaces a random slot; it survives each later item j with probability (j − 1)/j.",
          "The product telescopes to k/n: every item is equally likely.",
          "k = 1 is the classic \"random line\" or \"random node of a linked list\" trick.",
          "Spot it: \"stream\", \"unknown length\", \"can't store everything\", \"equal probability\".",
        ],
      },
    ],
  },

  // ─────────────────────────────── 9. Rejection sampling ───────────────────────────────
  {
    id: "fnd-iv-math-9-rejection",
    title: "Rejection sampling",
    summary: "Build a uniform choice from a different random source: sample a bigger space and throw away the leftovers.",
    minutes: 10,
    xp: 80,
    level: "Advanced",
    steps: [
      {
        kind: "explain",
        title: "Sample big, throw away the rest",
        body:
          "You have one kind of randomness and need another. A die gives 1..6, but you need a fair pick from 10 players. A random point in a square, but you need one in a circle.\n\n" +
          "**Rejection sampling:** draw from a bigger space whose outcomes are all equally likely, keep the draw if it lands in the part you want, otherwise draw again. The kept draws are uniform over the target, because every kept outcome was equally likely to begin with.\n\n" +
          "- Two dice give `x = (a − 1) · 6 + b`, each of 1..36 equally likely. Keep x ≤ 30 and answer `(x − 1) % 10 + 1`: each player owns exactly 3 of the 30 kept values.\n" +
          "- A point in the square [−1, 1]² is inside the unit disc with probability π/4; keep it only then.\n\n" +
          "If a draw is accepted with probability q, you need **1/q** draws on average. Pick the biggest kept region you can: keeping 30 of 36 beats keeping 10 of 36.\n\n" +
          "Don't just use `x % 10` on all 36: some players would own 4 values and others 3. And for the disc, a random angle and a random radius crowd points near the centre.\n\n" +
          "**How to spot it:** \"using only `randX()`, implement `randY()`\", \"uniform point inside a circle\", \"each outcome with equal probability\" from an awkward source.",
      },
      {
        kind: "question",
        title: "Ten players from two dice",
        body: "Each square is one pair of rolls (row = first die, column = second). Follow two attempts and tap the square each pair of rolls lands on.",
        widget: {
          type: "iv-trace",
          props: {
            title: "Two dice, one of 10 players",
            frames: [
              { grid: DICE_GRID, code: REJECTION_CODE, line: 2, note: "Two rolls pick one of 36 squares, all equally likely: `x = (a − 1) · 6 + b`." },
              { cells: REJECTED, line: 3, note: "36 doesn't split into 10 equal parts, so the last row, 31..36, is **rejected**." },
              { grid: PLAYER_GRID, cells: REJECTED, line: 4, note: "The other 30 squares map to players with `(x − 1) % 10 + 1`: each player owns exactly **3** squares." },
              { cells: REJECTED, line: 2, vars: { a: 6, b: 2 }, note: "First attempt: the dice show 6, then 2.", pick: { prompt: "Tap the square for rolls 6 and 2.", answer: "5,1" } },
              { cells: [...REJECTED.filter((c) => c.c !== 1), { r: 5, c: 1, tone: "active" }], line: 3, vars: { a: 6, b: 2, x: 32 }, note: "x = 32 is in the rejected row: roll both dice again." },
              { cells: REJECTED, line: 2, vars: { a: 2, b: 3 }, note: "Second attempt: 2, then 3.", pick: { prompt: "Tap the square for rolls 2 and 3.", answer: "1,2" } },
              { cells: [...REJECTED, { r: 1, c: 2, tone: "path" }], line: 4, vars: { a: 2, b: 3, x: 9 }, note: "x = 9 is kept: **player 9**. A pair is accepted with probability 30/36." },
            ],
          },
        },
        question: { type: "widget", goal: { picked: true }, prompt: "Answer both picks.", hint: "The row is the first roll and the column is the second, both counted from 1." },
        explanation: "Every kept square is equally likely and each player owns 3 of them, so each player is chosen with probability exactly 1/10. The rejected row only costs time.",
      },
      {
        kind: "question",
        title: "How many rolls?",
        body: "Each attempt uses two rolls and succeeds with probability 30/36. On average, how many die rolls does one pick of a player take?",
        question: { type: "number", answer: 2.4, tolerance: 0.01, unit: "rolls", hint: "Attempts needed on average are 1 / (30/36); each attempt is two rolls." },
        explanation: "36/30 = 1.2 attempts on average, times 2 rolls = **2.4** rolls.",
      },
      {
        kind: "question",
        title: "Why not just use %?",
        body: "Skip the rejection: take any x in 1..36 and answer `(x − 1) % 10 + 1`. What goes wrong?",
        question: {
          type: "choice",
          options: ["Nothing: % spreads the values evenly", "Player 10 can never be chosen", "Players 1–6 own 4 squares, the rest only 3", "Some values come out bigger than 10"],
          answer: 2,
          feedback: { 0: "36 values into 10 groups can't be even: 36 isn't a multiple of 10.", 1: "x = 10, 20 and 30 all give player 10.", 3: "`% 10` keeps the answer in 0..9, so it's always 1..10." },
          hint: "Write out which players 31, 32 … 36 would map to.",
        },
        explanation: "31..36 map to players 1..6, giving them 4 squares out of 36 (probability 1/9) and players 7–10 only 3 (1/12). That's exactly the bias rejection removes.",
      },
      {
        kind: "question",
        title: "Darts in a square",
        body: "You pick uniform points in the square from (−1, −1) to (1, 1) and keep those inside the circle of radius 1. Find the fraction of points kept, to two decimal places.",
        question: { type: "number", answer: 0.785, tolerance: 0.01, hint: "Divide the circle's area by the square's area." },
        explanation: "The circle has area π and the square 4, so π/4 ≈ **0.785** are kept, and it takes about 4/π ≈ 1.27 tries per point.",
      },
      {
        kind: "code",
        title: "Pick a player",
        body: "A board game has a six-sided die and 10 players. Write `pick_player(roll)`, where `roll()` returns 1..6 uniformly, returning a uniform player 1..10. Use exactly the scheme from the trace: `x = (roll() - 1) * 6 + roll()`, reject x > 30, answer `(x - 1) % 10 + 1`. The checks feed scripted rolls, so stick to that order.",
        language: "python",
        starter: `def pick_player(roll):
    x = (roll() - 1) * 6 + roll()
    return (x - 1) % 10 + 1
`,
        solution: `def pick_player(roll):
    while True:
        x = (roll() - 1) * 6 + roll()
        if x <= 30:
            return (x - 1) % 10 + 1
`,
        tests: [
          {
            id: "t1",
            description: "scripted rolls",
            assertionCode: `def _script(*vals):
    it = iter(vals)
    def roll():
        for v in it:
            return v
        raise AssertionError("pick_player rolled more times than it needed to")
    return roll
for _rolls, _want in [((1, 1), 1), ((5, 6), 10), ((6, 2, 2, 3), 9), ((6, 6, 6, 1, 1, 4), 4)]:
    _r = pick_player(_script(*_rolls))
    assert _r == _want, f"rolls {_rolls} should give player {_want}, got {_r}: x > 30 means roll both dice again"`,
          },
          {
            id: "t2",
            description: "every player equally likely",
            assertionCode: `import random
random.seed(11)
_c = {}
for _ in range(30000):
    _p = pick_player(lambda: random.randint(1, 6))
    _c[_p] = _c.get(_p, 0) + 1
_bad = {k: v for k, v in _c.items() if abs(v - 3000) > 250}
assert sorted(_c) == list(range(1, 11)) and not _bad, f"each player should come up about 3000 times in 30000 picks, got {dict(sorted(_c.items()))}"`,
          },
          {
            id: "t3",
            description: "about 2.4 rolls per pick",
            assertionCode: `import random
random.seed(12)
_n = [0]
def _roll():
    _n[0] += 1
    return random.randint(1, 6)
for _ in range(20000):
    pick_player(_roll)
_avg = _n[0] / 20000
assert abs(_avg - 2.4) < 0.05, f"rejecting 6 of 36 pairs should average 2.4 rolls per pick, got {_avg:.3f}"`,
          },
        ],
        hints: ["Wrap the two rolls in `while True:` and only `return` when `x <= 30`."],
      },
      {
        kind: "code",
        title: "A dart in a circle",
        body: "Write `point_in_disc(rand)`, where `rand()` returns a uniform float in [0, 1), returning a point `(x, y)` uniform inside the unit circle. Draw `x = 2 * rand() - 1`, then `y = 2 * rand() - 1`, and keep the point only if `x * x + y * y <= 1`. (A random angle with a random radius is **not** uniform: it bunches points near the centre.)",
        language: "python",
        starter: `import math

def point_in_disc(rand):
    # This crowds the centre. Replace it with rejection from the square.
    r = rand()
    t = 2 * math.pi * rand()
    return (r * math.cos(t), r * math.sin(t))
`,
        solution: `def point_in_disc(rand):
    while True:
        x = 2 * rand() - 1
        y = 2 * rand() - 1
        if x * x + y * y <= 1:
            return (x, y)
`,
        tests: [
          {
            id: "t1",
            description: "scripted draws",
            assertionCode: `_vals = iter([0.95, 0.95, 0.5, 0.75])
_p = point_in_disc(lambda: next(_vals))
assert _p is not None and len(_p) == 2, f"return a pair (x, y), got {_p}"
assert abs(_p[0] - 0.0) < 1e-9 and abs(_p[1] - 0.5) < 1e-9, f"(0.9, 0.9) is outside the circle and must be rejected; the next draws give (0.0, 0.5). Got {_p}"`,
          },
          {
            id: "t2",
            description: "inside, with the right spread",
            assertionCode: `import random
random.seed(13)
_pts = [point_in_disc(random.random) for _ in range(40000)]
assert all(x * x + y * y <= 1 + 1e-12 for x, y in _pts), "every point should be inside the unit circle"
_m = sum(x * x + y * y for x, y in _pts) / len(_pts)
assert abs(_m - 0.5) < 0.02, f"for uniform points the average squared distance from the centre is 0.5, got {_m:.3f}"`,
          },
          {
            id: "t3",
            description: "the inner circle gets a quarter",
            assertionCode: `import random
random.seed(14)
_pts = [point_in_disc(random.random) for _ in range(40000)]
_share = sum(1 for x, y in _pts if x * x + y * y <= 0.25) / len(_pts)
assert abs(_share - 0.25) < 0.02, f"the circle of radius 0.5 has a quarter of the area, so about 25% of points belong there; got {_share:.1%}"`,
          },
        ],
        hints: ["Loop: draw x, then y, from `2 * rand() - 1`; return as soon as `x * x + y * y <= 1`."],
      },
      {
        kind: "recap",
        points: [
          "**Rejection sampling:** draw from a bigger uniform space, keep only the target part, retry otherwise. Kept draws are uniform.",
          "Acceptance probability q means 1/q attempts on average; keep as much of the space as divides evenly.",
          "Two dice → 36 outcomes; keep 30, map each to one of 10 players three times.",
          "`%` on a range that isn't a multiple is biased; a random radius isn't uniform over a disc.",
          "Spot it: \"implement randY using only randX\", \"uniform point in a circle\".",
        ],
      },
    ],
  },

  // ─────────────────────────────── 10. Brainteasers ───────────────────────────────
  {
    id: "fnd-iv-math-10-brainteasers",
    title: "Brainteasers: find the pattern",
    summary: "Small cases, invariants, symmetry and pigeonholes: puzzles whose code is one line once you see why.",
    minutes: 10,
    xp: 80,
    level: "Advanced",
    steps: [
      {
        kind: "explain",
        title: "Tools for puzzles",
        body:
          "**Brainteaser** problems usually have an O(1) answer hiding behind a simulation that would take forever. Four tools find it:\n\n" +
          "- **Try small cases** and look for the pattern, then explain *why* it holds before you trust it.\n" +
          "- **Invariants:** a quantity no move can change (parity, a sum, a remainder). If the start and the goal differ in it, the goal is impossible.\n" +
          "- **Symmetry:** two things that swap identities are the same as two that pass through each other.\n" +
          "- **Pigeonhole:** n + 1 items in n boxes put two in one box.\n\n" +
          "Game puzzles work backwards: a position is **losing** if every move leads to a winning position for the opponent. In \"take 1 to 3 matches, whoever takes the last wins\", 0 is lost for the player to move, so 1–3 are won, 4 is lost (every move leaves 1–3), and so on: you lose exactly when the count is a multiple of 4. Leave your opponent on multiples of 4.\n\n" +
          "**How to spot it:** a huge n (10⁹ or more) with an O(1) answer expected, \"who wins if both play perfectly\", toggling, \"is it possible\".",
      },
      {
        kind: "question",
        title: "The locker corridor",
        body: "Nine lockers start shut. Pass p toggles every p-th locker (p, 2p, 3p …), for p = 1 … 9. Step through the first passes, then predict the end.",
        widget: {
          type: "iv-trace",
          props: {
            title: "Nine lockers, nine passes",
            frames: [
              { array: lockers([]), code: LOCKER_CODE, line: 1, vars: { pass: 0 }, note: "Lockers 1..9 (index 0 is locker 1). ○ shut, ● open." },
              { array: lockers([1, 2, 3, 4, 5, 6, 7, 8, 9]), highlight: [0, 1, 2, 3, 4, 5, 6, 7, 8], line: 3, vars: { pass: 1 }, note: "Pass 1 opens every locker." },
              { array: lockers([1, 3, 5, 7, 9]), highlight: [1, 3, 5, 7], line: 3, vars: { pass: 2 }, note: "Pass 2 toggles 2, 4, 6, 8 back to shut." },
              { array: lockers([1, 5, 6, 7]), highlight: [2, 5, 8], line: 3, vars: { pass: 3 }, note: "Pass 3 toggles 3, 6, 9." },
              { line: 1, note: "Locker k is toggled once for every divisor of k. Divisors come in pairs (2 × 6 = 12) unless k is a square (3 × 3 = 9).", pick: { prompt: "After all nine passes, which locker is open besides 1 and 4?", answer: 8 } },
              { array: lockers([1, 4, 9]), highlight: [0, 3, 8], line: 1, vars: { pass: 9 }, note: "Only **1, 4 and 9** are open: the squares, the only numbers with an odd count of divisors." },
            ],
          },
        },
        question: { type: "widget", goal: { picked: true }, prompt: "Answer the pick.", hint: "A locker ends open when it was toggled an odd number of times. Which numbers have an odd number of divisors?" },
        explanation: "Each divisor d of k pairs with k/d. Only for a perfect square does a divisor pair with itself, so only squares are toggled an odd number of times. With n lockers, ⌊√n⌋ stay open.",
      },
      {
        kind: "question",
        title: "A hundred lockers",
        body: "Same corridor with 100 lockers and 100 passes. How many lockers are open at the end?",
        question: { type: "number", answer: 10, unit: "lockers", hint: "Count the perfect squares from 1 to 100." },
        explanation: "1, 4, 9 … 100: **10** squares, so 10 open lockers.",
      },
      {
        kind: "question",
        title: "Twenty matches",
        body: "There are 20 matches on the table. Players take turns removing 1, 2 or 3; whoever takes the last match wins. Both play perfectly. Who wins?",
        question: {
          type: "choice",
          options: ["The first player, by taking 1", "The first player, by taking 3", "Whoever takes the 10th match", "The second player"],
          answer: 3,
          feedback: { 0: "Taking 1 leaves 19; the opponent takes 3 and leaves 16, a multiple of 4.", 1: "Taking 3 leaves 17; the opponent takes 1 and leaves 16." },
          hint: "Multiples of 4 are losing positions for the player about to move. Is 20 one of them?",
        },
        explanation: "20 is a multiple of 4. Whatever the first player takes (t), the second takes 4 − t and leaves 16, then 12, 8, 4, 0. The **second player** wins.",
      },
      {
        kind: "question",
        title: "Socks in the dark",
        body: "A drawer holds plenty of black, white and grey socks. In the dark, how many socks must you take out to be **sure** of a matching pair?",
        question: { type: "number", answer: 4, unit: "socks", hint: "How many socks could you take with no two the same colour?" },
        explanation: "Three socks could be one of each colour. A 4th must repeat one of the 3 colours: pigeonhole, **4**.",
      },
      {
        kind: "question",
        title: "Ants on a stick",
        body: "Ants stand on a 1-metre stick, each walking left or right at 1 metre per minute. When two ants meet they both turn around. Ants fall off at the ends. What is the longest time before every ant has fallen off, however they start?",
        question: {
          type: "choice",
          options: ["1 minute", "2 minutes", "It depends on how many ants there are", "They might never all fall off"],
          answer: 0,
          feedback: { 1: "Bouncing feels like it should slow them down, but it doesn't change where the ants as a group are.", 2: "The answer doesn't depend on the count. Try imagining the ants as unlabelled.", 3: "Every ant is always moving, and the stick is finite." },
          hint: "Two ants bouncing off each other look exactly like two ants walking straight through each other, if you ignore which ant is which.",
        },
        explanation: "Swap the labels at every meeting and the ants simply pass through each other. Each \"walker\" then goes straight off an end within 1 metre of walking: at most **1 minute**.",
      },
      {
        kind: "code",
        title: "Matches, any rules",
        body: "Generalise the game: players take 1 to `max_take` matches; whoever takes the last wins. Write `first_player_wins(matches, max_take)` returning `True` if the player to move wins with perfect play. The checks compare with a brute-force game search for small cases, then use 10¹⁸ matches, so find the pattern.",
        language: "python",
        starter: `def first_player_wins(matches, max_take):
    # Try small cases by hand: which counts lose for the player to move?
    return True
`,
        solution: `def first_player_wins(matches, max_take):
    return matches % (max_take + 1) != 0
`,
        tests: [
          {
            id: "t1",
            description: "matches a brute-force search on small games",
            assertionCode: `def _brute(n, m):
    win = [False] * (n + 1)
    for i in range(1, n + 1):
        win[i] = any(not win[i - t] for t in range(1, min(m, i) + 1))
    return win[n]
for _m in range(1, 6):
    for _n in range(0, 31):
        _r = first_player_wins(_n, _m)
        assert _r == _brute(_n, _m), f"first_player_wins({_n}, {_m}) should be {_brute(_n, _m)}, got {_r}"`,
          },
          { id: "t2", description: "take one at a time", assertionCode: `assert first_player_wins(7, 1) is True, "with max_take = 1 the players alternate single matches: 7 is odd, so the first player takes the last"\nassert first_player_wins(8, 1) is False, "8 single matches: the second player takes the last one"` },
          { id: "t3", description: "a huge pile", assertionCode: `_r = first_player_wins(10**18, 3)\nassert _r is False, f"10**18 is a multiple of 4, so the player to move loses; got {_r}"\n_r = first_player_wins(10**18 + 1, 3)\nassert _r is True, f"10**18 + 1 leaves a remainder: take 1 and win; got {_r}"` },
        ],
        hints: ["With max_take = 3 the losing counts are 0, 4, 8, 12 … What are they for max_take = 2?", "The losing counts are the multiples of max_take + 1."],
      },
      {
        kind: "code",
        title: "Lockers at scale",
        body: "Write `open_lockers(n)`: how many of n lockers are open after the n passes from the trace? n goes up to 10¹⁸, so no simulation, and watch out for `math.sqrt`: a float can't hold every integer that large exactly. `math.isqrt` is exact.",
        language: "python",
        starter: `import math

def open_lockers(n):
    # Which lockers end open? How many of them are there up to n?
    return 0
`,
        solution: `import math

def open_lockers(n):
    return math.isqrt(n)
`,
        tests: [
          { id: "t1", description: "small corridors", assertionCode: `for _n, _want in [(0, 0), (1, 1), (3, 1), (4, 2), (10, 3), (100, 10)]:\n    _r = open_lockers(_n)\n    assert _r == _want, f"open_lockers({_n}) should be {_want}, got {_r}"` },
          { id: "t2", description: "a trillion lockers", assertionCode: `_r = open_lockers(10**12)\nassert _r == 10**6, f"open_lockers(10**12) should be 1000000, got {_r}"` },
          { id: "t3", description: "just below a huge square", assertionCode: `_r = open_lockers(10**18 - 1)\nassert _r == 999999999, f"10**18 - 1 is just below (10**9)**2, so the answer is 999999999; got {_r}. Floats round 10**18 - 1 up to 10**18: use math.isqrt."` },
        ],
        hints: ["The open lockers are the perfect squares 1, 4, 9 … ≤ n. How many squares are there up to n?", "`math.isqrt(n)` is the exact integer square root, rounded down."],
      },
      {
        kind: "recap",
        points: [
          "Try small cases, find the pattern, then prove it before coding it.",
          "**Invariants** (parity, remainders) show what can never change; **symmetry** swaps a hard picture for an easy one.",
          "**Pigeonhole:** n + 1 items in n boxes share a box.",
          "Take-away games: a position loses when every move leads to a win; with 1..m per turn, multiples of m + 1 lose.",
          "Toggled by divisors means only squares stay on; count them with `math.isqrt`, never a float `sqrt` on huge numbers.",
        ],
      },
    ],
  },
];
