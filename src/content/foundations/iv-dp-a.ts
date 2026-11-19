import type { ConceptLesson } from "../../learn/types.ts";

/** Fenced Python block for lesson prose. */
const py = (code: string) => "~~~python\n" + code.trim() + "\n~~~";

// ── shared trace data ──
const MEMO_CODE = ["memo = {}", "def ways(n):", "    if n <= 1: return 1", "    if n in memo: return memo[n]", "    memo[n] = ways(n - 1) + ways(n - 2)", "    return memo[n]"];
const MEMO_TREE = [
  { id: "w5", label: "5" },
  { id: "w4", label: "4", parent: "w5", side: "L" as const },
  { id: "w3m", label: "3", parent: "w5", side: "R" as const },
  { id: "w3", label: "3", parent: "w4", side: "L" as const },
  { id: "w2m", label: "2", parent: "w4", side: "R" as const },
  { id: "w2", label: "2", parent: "w3", side: "L" as const },
  { id: "w1b", label: "1", parent: "w3", side: "R" as const },
  { id: "w1a", label: "1", parent: "w2", side: "L" as const },
  { id: "w0", label: "0", parent: "w2", side: "R" as const },
];

const TIPS_CODE = ["best = [0] * n", "for i in range(n):", "    skip = best[i - 1] if i >= 1 else 0", "    take = tips[i] + (best[i - 2] if i >= 2 else 0)", "    best[i] = max(skip, take)"];

const LCS_CODE = ["for i in 1..len(a):", "  for j in 1..len(b):", "    if a[i-1] == b[j-1]:", "      dp[i][j] = dp[i-1][j-1] + 1", "    else:", "      dp[i][j] = max(dp[i-1][j], dp[i][j-1])"];
const LCS_HEAD = ["", "", "A", "C", "R", "E"];

const BOOK_CODE = ["meetings.sort(key=end)", "last_end = -infinity", "for m in meetings:", "    if m.start >= last_end:", "        keep(m); last_end = m.end"];
const BOOKINGS = ["1-4", "3-5", "0-6", "5-7", "3-9", "5-9", "6-10", "8-11"];

const SUBSET_CODE = ["def go(i, total):", "    if total > 5: return        # prune", "    if i == len(items):", "        if total == 5: found()", "        return", "    go(i + 1, total + items[i])  # take", "    go(i + 1, total)             # skip"];
const SUBSET_TREE = [
  { id: "r", label: "0" },
  { id: "a", label: "4", parent: "r", side: "L" as const },
  { id: "b", label: "0", parent: "r", side: "R" as const },
  { id: "aa", label: "7", parent: "a", side: "L" as const },
  { id: "ab", label: "4", parent: "a", side: "R" as const },
  { id: "aba", label: "6", parent: "ab", side: "L" as const },
  { id: "abb", label: "4", parent: "ab", side: "R" as const },
  { id: "ba", label: "3", parent: "b", side: "L" as const },
  { id: "bb", label: "0", parent: "b", side: "R" as const },
  { id: "baa", label: "5", parent: "ba", side: "L" as const },
  { id: "bab", label: "3", parent: "ba", side: "R" as const },
  { id: "bba", label: "2", parent: "bb", side: "L" as const },
  { id: "bbb", label: "0", parent: "bb", side: "R" as const },
];

export const ivDpLessonsA: ConceptLesson[] = [
  // ─────────────────────────────── 1. Memoization ───────────────────────────────
  {
    id: "fnd-iv-dp-1-memoization",
    title: "Memoization: never solve the same thing twice",
    summary: "Cache a recursive function's answers so overlapping subproblems are solved once.",
    minutes: 12,
    xp: 60,
    level: "Intermediate",
    steps: [
      {
        kind: "explain",
        title: "Recursion that repeats itself",
        body:
          "Many problems have a natural recursive answer. Count the ways to climb `n` steps taking 1 or 2 at a time: the last move was a 1 or a 2, so `ways(n) = ways(n - 1) + ways(n - 2)`.\n\n" +
          py(`
def ways(n):
    if n <= 1:
        return 1
    return ways(n - 1) + ways(n - 2)
`) +
          "\nIt is correct, but slow. `ways(5)` calls `ways(3)` twice and `ways(2)` three times, and the repeats double with every extra step: about **O(2ⁿ)** calls.\n\n**Memoization** fixes it: keep a dictionary of answers you have already worked out (the **memo**). Before doing any work, look the argument up. After working something out, store it. Each distinct argument is now solved once.\n\n**How to spot it:** a recursive definition where the same arguments come back again and again (**overlapping subproblems**), and phrases like *number of ways*, *minimum cost*, *can you reach*.",
      },
      {
        kind: "question",
        title: "Watch the memo work",
        body: "Step through `ways(5)` with a memo. Calls go left (`n - 1`) first, then right (`n - 2`). At each stop, tap the call that is answered straight from the memo.",
        widget: {
          type: "iv-trace",
          props: {
            title: "ways(5) with a memo",
            frames: [
              { tree: { nodes: MEMO_TREE, active: ["w5"] }, code: MEMO_CODE, line: 5, stacks: [{ label: "call stack", items: ["ways(5)"] }], vars: { memo: "{}" }, note: "`ways(5)` needs `ways(4)` and `ways(3)`. The left call runs first." },
              { tree: { active: ["w2"], done: [] }, line: 5, stacks: [{ label: "call stack", items: ["ways(5)", "ways(4)", "ways(3)", "ways(2)"] }], note: "Down the left side: 4, then 3, then 2. Nothing is in the memo yet." },
              { tree: { active: ["w1a", "w0"] }, line: 3, vars: { memo: "{2: 2}" }, note: "`ways(1)` and `ways(0)` are base cases (1 each), so `ways(2) = 2`. Store it." },
              { tree: { active: ["w1b"], done: ["w2", "w1a", "w0"] }, line: 3, stacks: [{ label: "call stack", items: ["ways(5)", "ways(4)", "ways(3)"] }], vars: { memo: "{2: 2, 3: 3}" }, note: "Back in `ways(3)`: its right call `ways(1)` is a base case. `ways(3) = 2 + 1 = 3`. Store it." },
              { tree: { active: ["w4"], done: ["w3", "w2", "w1a", "w0", "w1b"] }, line: 5, stacks: [{ label: "call stack", items: ["ways(5)", "ways(4)"] }], note: "Back in `ways(4)`. Its left call is done; the right call comes next.", pick: { prompt: "Which call is answered from the memo, with no work below it?", answer: "w2m" } },
              { tree: { active: ["w2m"], done: ["w3", "w2", "w1a", "w0", "w1b"] }, line: 4, vars: { memo: "{2: 2, 3: 3, 4: 5}" }, note: "`ways(2)` is already in the memo: return 2 at once. `ways(4) = 3 + 2 = 5`." },
              { tree: { active: ["w5"], done: ["w4", "w3", "w2", "w1a", "w0", "w1b", "w2m"] }, line: 5, stacks: [{ label: "call stack", items: ["ways(5)"] }], note: "Back at the top. One call is left.", pick: { prompt: "Which other call is a memo hit?", answer: "w3m" } },
              { tree: { done: ["w5", "w4", "w3", "w2", "w1a", "w0", "w1b", "w2m", "w3m"] }, line: 6, stacks: [{ label: "call stack", items: [] }], vars: { memo: "{2: 2, 3: 3, 4: 5, 5: 8}" }, note: "`ways(5) = 5 + 3 = **8**`, in 9 calls. Without the memo it takes 15, and the gap grows fast." },
            ],
          },
        },
        question: { type: "widget", goal: { picked: true }, prompt: "Answer both picks.", hint: "A memo hit is a call whose argument was already stored earlier in the trace." },
        explanation: "Each value from 2 to 5 is computed once; every later call with the same argument is a dictionary lookup. That turns an exponential tree into a short chain.",
      },
      {
        kind: "question",
        title: "Count the waste",
        body: "Without a memo, `ways(n)` makes 1 call for `n ≤ 1`, and otherwise 1 call plus all the calls of `ways(n - 1)` and `ways(n - 2)`. `ways(5)` makes 15 calls. How many calls does `ways(6)` make in total?",
        question: { type: "number", answer: 25, unit: "calls", hint: "Build the counts up from small n: calls(n) = 1 + calls(n − 1) + calls(n − 2), starting from 1 and 1." },
        explanation: "The counts go 1, 1, 3, 5, 9, 15, **25**. They grow like the answers themselves, roughly ×1.6 per step: `ways(40)` would make over 300 million calls. With the memo, `ways(6)` makes only 11.",
      },
      {
        kind: "question",
        title: "Cost with a memo",
        body: "With the memo in place, how does the total work of `ways(n)` grow?",
        question: {
          type: "choice",
          options: ["O(2ⁿ): it is still the same recursion", "O(n): each value is computed once", "O(n²): every call scans the memo", "O(log n): it halves each time"],
          answer: 1,
          feedback: { 0: "The recursion is the same, but repeated calls stop at the memo lookup instead of exploring again.", 2: "A dictionary lookup takes O(1) on average; it does not scan.", 3: "The argument drops by 1 or 2, not by half." },
          hint: "Count the distinct arguments, and the work for each when its answer is not stored yet.",
        },
        explanation: "There are n + 1 distinct arguments and each does O(1) work besides its two calls, so time is **O(n)**. The memo also takes **O(n)** space, plus O(n) for the call stack.",
      },
      {
        kind: "explain",
        title: "Rules and pitfalls",
        body:
          "Memoization is safe only for a **pure** function: the answer depends on the arguments alone, and calling it changes nothing. In Python the standard tool is `functools.cache` (or `lru_cache`), which needs **hashable** arguments: numbers, strings, tuples, not lists or dicts.\n\n" +
          py(`
from functools import cache

@cache
def ways(n):
    if n <= 1:
        return 1
    return ways(n - 1) + ways(n - 2)
`) +
          "\nWhen an argument is not hashable (a dict of prices, a grid), write an **inner function** over the parts that change, and keep the memo in a local dictionary:\n\n" +
          py(`
def solve(n, prices):          # prices is a dict, so not hashable
    memo = {}
    def go(m):                 # only m changes between calls
        if m in memo:
            return memo[m]
        ...
        memo[m] = answer
        return answer
    return go(n)
`) +
          "\nPitfalls:\n- A memo kept at module level survives between test calls with different inputs. Create it inside the function.\n- Very deep recursion (thousands of levels) can hit Python's recursion limit; then fill a table bottom-up instead (the next lesson).\n- Time = number of distinct states × work per state. Always count both.",
      },
      {
        kind: "question",
        title: "Safe to memoize?",
        body: "Which of these functions would give **wrong** results if you memoized it?",
        question: {
          type: "choice",
          options: ["`price(n)`: the best price for n metres of ribbon", "`steps(r, c)`: fewest moves from a cell to the exit", "`next_ticket()`: a new ticket number on each call", "`ways(n)`: hiking plans that cover n km"],
          answer: 2,
          feedback: { 0: "The best price for n metres depends only on n (and the fixed price list), so caching it is safe.", 1: "The fewest moves from a cell is fixed for a fixed maze, so caching it is safe.", 3: "The number of plans for n km never changes, so caching it is safe." },
          hint: "A memo returns the stored answer for the same arguments. Which function is supposed to return something different each time it is called with the same arguments?",
        },
        explanation: "`next_ticket()` has no arguments and must return a **new** number on every call; a memo would hand back the first ticket forever. Memoize only pure functions.",
      },
      {
        kind: "code",
        title: "Hiking plans",
        body: "A hiker covers **1, 2 or 3 km** each day. Write `hike_ways(n)`: how many different day-by-day plans cover **exactly** `n` km? Order matters (1 then 2 is a different plan from 2 then 1), and `hike_ways(0)` is 1: the empty plan.\n\nUse recursion with a memo (or a table). The last test asks for 50 km, which plain recursion would take hours to count.",
        language: "python",
        starter: `def hike_ways(n):
    # the last day was 1, 2 or 3 km long, so add up the plans for the km before it
    # remember each answer so it is worked out only once
    return 0
`,
        solution: `from functools import cache

@cache
def hike_ways(n):
    if n < 0:
        return 0
    if n == 0:
        return 1
    return hike_ways(n - 1) + hike_ways(n - 2) + hike_ways(n - 3)
`,
        tests: [
          { id: "t1", description: "0 km: one (empty) plan", assertionCode: `r = hike_ways(0)\nassert r == 1, f"hike_ways(0) should be 1 (the plan with no days), got {r}"` },
          { id: "t2", description: "4 km has 7 plans", assertionCode: `r = hike_ways(4)\nassert r == 7, f"hike_ways(4) should be 7 (1111, 112, 121, 211, 22, 13, 31), got {r}"` },
          { id: "t3", description: "1 to 7 km", assertionCode: `r = [hike_ways(n) for n in range(1, 8)]\nassert r == [1, 2, 4, 7, 13, 24, 44], f"for 1..7 km expected [1, 2, 4, 7, 13, 24, 44], got {r}"` },
          { id: "t4", description: "50 km, fast", assertionCode: `r = hike_ways(50)\nassert r == 10562230626642, f"hike_ways(50) should be 10562230626642, got {r}: without a memo this takes far too long"` },
        ],
        hints: ["Base cases: 0 km has 1 plan, and a negative distance has 0 plans.", "`hike_ways(n) = hike_ways(n - 1) + hike_ways(n - 2) + hike_ways(n - 3)`; put `@cache` from `functools` on the function."],
      },
      {
        kind: "code",
        title: "Selling ribbon",
        body: "A shop sells ribbon in fixed lengths: `prices` maps a length in metres to what a piece of that length sells for, e.g. `{1: 2, 2: 5, 3: 7}`. Write `best_price(n, prices)`: the most money you can get by cutting a ribbon of `n` metres into pieces of listed lengths (use any length as often as you like). Leftover ribbon that matches no length is worth nothing.\n\n`prices` is a dict, so it can't go through `@cache`: memoize an inner function of the remaining length instead.",
        language: "python",
        starter: `def best_price(n, prices):
    memo = {}

    def go(m):
        # the best money from m metres: try every piece length that fits
        return 0

    return go(n)
`,
        solution: `def best_price(n, prices):
    memo = {}

    def go(m):
        if m in memo:
            return memo[m]
        best = 0  # selling nothing more is always allowed
        for length, price in prices.items():
            if length <= m:
                best = max(best, price + go(m - length))
        memo[m] = best
        return best

    return go(n)
`,
        tests: [
          { id: "t1", description: "4 metres", assertionCode: `r = best_price(4, {1: 2, 2: 5, 3: 7, 4: 8})\nassert r == 10, f"best_price(4, ...) should be 10 (two 2 m pieces at 5 each), got {r}"` },
          { id: "t2", description: "9 metres", assertionCode: `r = best_price(9, {1: 2, 2: 5, 3: 7, 4: 8})\nassert r == 22, f"best_price(9, ...) should be 22, got {r}"` },
          { id: "t3", description: "leftover is worth nothing", assertionCode: `p = {3: 4, 5: 9}\nr = (best_price(2, p), best_price(7, p), best_price(11, p))\nassert r == (0, 9, 18), f"with prices {{3: 4, 5: 9}}: 2 m, 7 m and 11 m should give (0, 9, 18), got {r}"` },
          { id: "t4", description: "300 metres, fast", assertionCode: `r = best_price(300, {1: 1, 7: 10, 13: 20})\nassert r == 461, f"best_price(300, ...) should be 461, got {r}: is every remaining length worked out only once?"` },
        ],
        hints: ["`go(0)` is 0. For `go(m)`, try each `length <= m`: `price + go(m - length)`, and keep the best (start from 0 for a leftover).", "Check `memo` at the top of `go` and store the answer before returning it."],
      },
      {
        kind: "recap",
        points: [
          "**Memoization** caches a recursive function's answers so each distinct argument is solved once.",
          "It pays off when subproblems **overlap**: the same arguments come back many times.",
          "Cost = number of distinct states × work per state: `ways(n)` drops from O(2ⁿ) to **O(n)**.",
          "Only memoize **pure** functions. `@cache` needs hashable arguments; otherwise memoize an inner function in a local dict.",
          "Spot it: *number of ways*, *minimum cost*, *can you reach*, and a recursion with repeating arguments.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 2. 1-D dynamic programming ───────────────────────────────
  {
    id: "fnd-iv-dp-2-dp-1d",
    title: "Dynamic programming in one dimension",
    summary: "Fill a table from small to big: state, choice, base case and order.",
    minutes: 14,
    xp: 70,
    level: "Intermediate",
    steps: [
      {
        kind: "explain",
        title: "From the bottom up",
        body:
          "**Dynamic programming** (DP) is memoization turned around. Instead of recursing from the big problem down, you fill a table from the smallest subproblem up, so every value you need is already there.\n\nFour questions design any DP:\n1. **State:** what does `best[i]` mean? Write it as a sentence.\n2. **Choice:** what is decided at step `i`, and what earlier states does each option use?\n3. **Base case:** the values you know without any choice.\n4. **Order:** fill states so that the ones you read are already done.\n\nA busker plays at most one evening at a time, never **two evenings in a row** (the voice needs a rest), and evening `i` earns `tips[i]`. State: `best[i]` = the most money from evenings `0..i`. Choice at evening `i`: skip it (`best[i - 1]`) or play it (`tips[i] + best[i - 2]`).\n\n**How to spot it:** a line of items (days, houses, cells, letters) where a choice at each one limits the next, and the question asks for a maximum, minimum or count.",
      },
      {
        kind: "question",
        title: "Fill the table",
        body: "The top row holds the tips for six evenings, the bottom row `best[i]`. Step through and tap the cell each *play this evening* option reads from.",
        widget: {
          type: "iv-trace",
          props: {
            title: "No two evenings in a row",
            frames: [
              { grid: [[3, 8, 4, 6, 9, 2], ["", "", "", "", "", ""]], code: TIPS_CODE, line: 1, note: "Top row: `tips`. Bottom row: `best[i]`, the most money from evenings 0 to i." },
              { grid: [[3, 8, 4, 6, 9, 2], [3, "", "", "", "", ""]], cells: [{ r: 0, c: 0, tone: "active" }, { r: 1, c: 0, tone: "path" }], line: 5, vars: { i: 0, skip: 0, take: 3 }, note: "Evening 0: play it for 3." },
              { grid: [[3, 8, 4, 6, 9, 2], [3, 8, "", "", "", ""]], cells: [{ r: 0, c: 1, tone: "active" }, { r: 1, c: 1, tone: "path" }], vars: { i: 1, skip: 3, take: 8 }, note: "Evening 1: skip it (3) or play it alone (8). `best[1] = 8`." },
              { cells: [{ r: 0, c: 2, tone: "active" }, { r: 1, c: 0, tone: "done" }, { r: 1, c: 1, tone: "done" }], line: 4, vars: { i: 2, skip: 8, take: "?" }, note: "Evening 2 earns 4. Playing it means evening 1 was skipped.", pick: { prompt: "To play evening 2, which `best` cell do you add its 4 tips to?", answer: "1,0" } },
              { grid: [[3, 8, 4, 6, 9, 2], [3, 8, 8, "", "", ""]], cells: [{ r: 0, c: 2, tone: "active" }, { r: 1, c: 0, tone: "path" }, { r: 1, c: 2, tone: "path" }], line: 5, vars: { i: 2, skip: 8, take: 7 }, note: "Play: `4 + best[0] = 7`. Skip: `best[1] = 8`. Skipping wins, `best[2] = 8`." },
              { grid: [[3, 8, 4, 6, 9, 2], [3, 8, 8, 14, "", ""]], cells: [{ r: 0, c: 3, tone: "active" }, { r: 1, c: 1, tone: "path" }, { r: 1, c: 3, tone: "path" }], vars: { i: 3, skip: 8, take: 14 }, note: "Evening 3: play for `6 + best[1] = 14`, more than skipping (8)." },
              { cells: [{ r: 0, c: 4, tone: "active" }], line: 4, vars: { i: 4, skip: 14, take: "?" }, note: "Evening 4 earns 9.", pick: { prompt: "Which `best` cell does the *play* option for evening 4 read?", answer: "1,2" } },
              { grid: [[3, 8, 4, 6, 9, 2], [3, 8, 8, 14, 17, ""]], cells: [{ r: 0, c: 4, tone: "active" }, { r: 1, c: 2, tone: "path" }, { r: 1, c: 4, tone: "path" }], line: 5, vars: { i: 4, skip: 14, take: 17 }, note: "`9 + best[2] = 17` beats skipping (14)." },
              { grid: [[3, 8, 4, 6, 9, 2], [3, 8, 8, 14, 17, 17]], cells: [{ r: 1, c: 5, tone: "done" }], vars: { i: 5, skip: 17, take: 16 }, note: "Evening 5: `2 + 14 = 16` loses to skipping (17). The answer is **17**: evenings 1 and 4 (8 + 9)." },
            ],
          },
        },
        question: { type: "widget", goal: { picked: true }, prompt: "Answer both picks.", hint: "Playing evening i rules out evening i − 1, so its tips add to the best total two cells back." },
        explanation: "Each cell is filled from cells already filled: `best[i] = max(best[i - 1], tips[i] + best[i - 2])`. One pass, **O(n)** time.",
      },
      {
        kind: "question",
        title: "Your turn",
        body: "Tips for four evenings are `[5, 1, 1, 5]`, still never two in a row. Find the most the busker can earn.",
        question: { type: "number", answer: 10, hint: "Fill best[0..3] with best[i] = max(best[i − 1], tips[i] + best[i − 2])." },
        explanation: "`best` = 5, 5, 6, **10**: play evenings 0 and 3. Taking every other evening from the start (5 + 1 = 6) is not enough; the table tries both choices everywhere.",
      },
      {
        kind: "explain",
        title: "Shrink the table, and other 1-D shapes",
        body:
          "`best[i]` reads only the last two cells, so two variables are enough: **O(1)** extra space.\n\n" +
          py(`
def best_tips(tips):
    two_back, one_back = 0, 0
    for t in tips:
        two_back, one_back = one_back, max(one_back, t + two_back)
    return one_back
`) +
          "\nOther shapes you meet in interviews:\n- **Reach `n` with steps from a set** (coins, stamps, jumps): `dp[x] = min over steps s of dp[x - s] + 1`. That is O(n × number of steps).\n- **Best block ending here** (Kadane's algorithm): `here = max(x, here + x)`, then keep the best `here`.\n- **Longest increasing run of picks**: `dp[i] = 1 + max(dp[j] for j < i with a[j] < a[i])`, O(n²) (O(n log n) with binary search).\n\nPitfalls: an unclear state sentence (write it down first), forgetting the base case, and reading a cell that is not filled yet.",
      },
      {
        kind: "question",
        title: "Name the state",
        body: "A robot walks along cells `0..n-1`. From a cell it may move 1 or 2 cells forward, and landing on cell `i` costs `fee[i]`. It starts on cell 0 (paying its fee) and must land on the last cell. Which state leads to a clean DP?",
        question: {
          type: "choice",
          options: ["`dp[i]` = the fee of cell i", "`dp[i]` = number of moves made so far", "`dp[i]` = cheapest total cost to land on cell i", "`dp[i]` = the biggest fee seen so far"],
          answer: 2,
          feedback: { 0: "That is the input itself; it does not tell you anything about the best way to get there.", 1: "Moves made does not decide the cost; the goal is the cheapest total.", 3: "The biggest fee says nothing about the cheapest route." },
          hint: "The state should answer the question for a smaller piece of the problem, so the final cell holds the final answer.",
        },
        explanation: "`dp[i] = fee[i] + min(dp[i - 1], dp[i - 2])`, with `dp[0] = fee[0]` and `dp[1] = fee[0] + fee[1]` (cell 1 can only be reached from cell 0). The answer is `dp[n - 1]`.",
      },
      {
        kind: "code",
        title: "The busker's best",
        body: "Write `best_tips(tips)`: the most money from a list of evening tips if the busker never plays two evenings in a row. An empty list earns 0. Aim for one pass and O(1) extra space.",
        language: "python",
        starter: `def best_tips(tips):
    # keep the best totals up to the evening before last and up to the last evening
    return 0
`,
        solution: `def best_tips(tips):
    two_back, one_back = 0, 0
    for t in tips:
        two_back, one_back = one_back, max(one_back, t + two_back)
    return one_back
`,
        tests: [
          { id: "t1", description: "no evenings, one evening", assertionCode: `r = (best_tips([]), best_tips([5]))\nassert r == (0, 5), f"best_tips([]) and best_tips([5]) should be (0, 5), got {r}"` },
          { id: "t2", description: "a mixed week", assertionCode: `r = best_tips([4, 1, 2, 7, 5, 3, 1])\nassert r == 14, f"best_tips([4, 1, 2, 7, 5, 3, 1]) should be 14 (4 + 2 + 5 + ... try the table), got {r}"` },
          { id: "t3", description: "every other evening is not enough", assertionCode: `r = best_tips([10, 1, 1, 10, 1, 1, 10])\nassert r == 30, f"best_tips([10, 1, 1, 10, 1, 1, 10]) should be 30 (evenings 0, 3, 6), got {r}: taking all even or all odd evenings is not the rule"` },
          { id: "t4", description: "100,000 evenings", assertionCode: `r = best_tips([1] * 100000)\nassert r == 50000, f"100,000 evenings of 1 should give 50000, got {r}"` },
        ],
        hints: ["Keep two numbers: the best total up to the evening before last, and up to the last evening.", "For each `t`: the new best is `max(one_back, t + two_back)`; then shift the two variables along."],
      },
      {
        kind: "code",
        title: "Fewest stamps",
        body: "A parcel needs postage of exactly `amount` cents, and you have unlimited stamps of each value in `values`. Write `fewest_stamps(values, amount)`: the fewest stamps that add up to exactly `amount`, or `-1` if it can't be done. `amount` 0 needs 0 stamps.\n\nTaking the biggest stamp that fits is **not** always right: with values `[1, 4, 5]` and 8 cents, biggest-first uses 5 + 1 + 1 + 1, but 4 + 4 is two stamps.",
        language: "python",
        starter: `def fewest_stamps(values, amount):
    # dp[x] = fewest stamps for exactly x cents
    return -1
`,
        solution: `def fewest_stamps(values, amount):
    INF = float("inf")
    dp = [0] + [INF] * amount
    for x in range(1, amount + 1):
        for v in values:
            if v <= x and dp[x - v] + 1 < dp[x]:
                dp[x] = dp[x - v] + 1
    return -1 if dp[amount] == INF else dp[amount]
`,
        tests: [
          { id: "t1", description: "beats biggest-first", assertionCode: `r = fewest_stamps([1, 4, 5], 8)\nassert r == 2, f"fewest_stamps([1, 4, 5], 8) should be 2 (4 + 4), got {r}"` },
          { id: "t2", description: "impossible and zero", assertionCode: `r = (fewest_stamps([3, 7], 5), fewest_stamps([3, 7], 0))\nassert r == (-1, 0), f"[3, 7] can't make 5 (-1) and makes 0 with no stamps (0); got {r}"` },
          { id: "t3", description: "a mix", assertionCode: `r = fewest_stamps([5, 7], 24)\nassert r == 4, f"fewest_stamps([5, 7], 24) should be 4 (5 + 5 + 7 + 7), got {r}"` },
          { id: "t4", description: "a big amount", assertionCode: `r = fewest_stamps([6, 10, 15], 9999)\nassert r == 669, f"fewest_stamps([6, 10, 15], 9999) should be 669, got {r}"` },
        ],
        hints: ["`dp[0] = 0`; every other amount starts as infinity (not reachable yet).", "For each x from 1 up, try every stamp v ≤ x: `dp[x] = min(dp[x], dp[x - v] + 1)`."],
      },
      {
        kind: "recap",
        points: [
          "**DP** fills a table from the smallest subproblem up: state, choice, base case, order.",
          "Write the **state** as a sentence first: `best[i]` = the most money from evenings 0..i.",
          "When a cell reads only the last few cells, keep just those: O(1) space.",
          "Common 1-D shapes: no-two-adjacent picks, reach-an-amount (`dp[x - s] + 1`), Kadane's best block, longest increasing picks.",
          "Spot it: a line of items, a choice at each that limits the next, and *max*, *min* or *how many ways*.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 3. 2-D dynamic programming ───────────────────────────────
  {
    id: "fnd-iv-dp-3-dp-2d",
    title: "Two-dimensional DP: grids, knapsacks and strings",
    summary: "When the state needs two numbers: two strings, or items and a capacity.",
    minutes: 16,
    xp: 80,
    level: "Intermediate",
    steps: [
      {
        kind: "explain",
        title: "When one index is not enough",
        body:
          "Some problems need two numbers to describe a subproblem, so the table becomes a grid `dp[i][j]`. Three families cover most interviews:\n\n- **Grids:** `dp[r][c]` = the best (or number of) ways to reach cell (r, c). It reads the cell above and the cell to the left.\n- **Two strings:** `dp[i][j]` = the answer for the first `i` letters of `a` and the first `j` letters of `b`. Longest common subsequence and edit distance are the classics.\n- **Knapsack:** `dp[i][c]` = the best value using the first `i` items with capacity `c`. Each item is either taken (`dp[i-1][c - w] + v`) or not (`dp[i-1][c]`).\n\nThe table has (rows × columns) cells and each does O(1) work, so these run in **O(n × m)**.\n\n**How to spot it:** two sequences to compare or align, a grid to cross, or items to pick under a budget or weight limit.",
      },
      {
        kind: "question",
        title: "Longest common subsequence",
        body: "A **subsequence** keeps letters in order but may skip some. Step through the table for the longest one shared by `CAKE` (rows) and `ACRE` (columns). Tap the cell each match builds on.",
        widget: {
          type: "iv-trace",
          props: {
            title: "LCS of CAKE and ACRE",
            frames: [
              { grid: [LCS_HEAD, ["", 0, 0, 0, 0, 0], ["C", 0, "", "", "", ""], ["A", 0, "", "", "", ""], ["K", 0, "", "", "", ""], ["E", 0, "", "", "", ""]], code: LCS_CODE, line: 1, note: "`dp[i][j]` = LCS length of the first i letters of CAKE and the first j of ACRE. Row and column 0 (empty prefixes) are 0." },
              { grid: [LCS_HEAD, ["", 0, 0, 0, 0, 0], ["C", 0, 0, "", "", ""], ["A", 0, "", "", "", ""], ["K", 0, "", "", "", ""], ["E", 0, "", "", "", ""]], cells: [{ r: 2, c: 2, tone: "path" }, { r: 2, c: 3, tone: "active" }], line: 3, note: "C vs A: no match, so 0. Next, C vs C: a match.", pick: { prompt: "A match adds 1 to which cell?", answer: "1,2" } },
              { grid: [LCS_HEAD, ["", 0, 0, 0, 0, 0], ["C", 0, 0, 1, 1, 1], ["A", 0, "", "", "", ""], ["K", 0, "", "", "", ""], ["E", 0, "", "", "", ""]], cells: [{ r: 1, c: 2, tone: "done" }, { r: 2, c: 3, tone: "path" }], line: 4, note: "`dp[1][2] = dp[0][1] + 1 = 1`: the diagonal, both letters used up. R and E don't match C, so they copy the bigger of top and left: 1." },
              { grid: [LCS_HEAD, ["", 0, 0, 0, 0, 0], ["C", 0, 0, 1, 1, 1], ["A", 0, 1, 1, 1, 1], ["K", 0, 1, 1, 1, 1], ["E", 0, "", "", "", ""]], cells: [{ r: 3, c: 2, tone: "path" }], line: 6, note: "Row A: A matches A (diagonal 0 + 1). Row K matches nothing and copies 1s." },
              { grid: [LCS_HEAD, ["", 0, 0, 0, 0, 0], ["C", 0, 0, 1, 1, 1], ["A", 0, 1, 1, 1, 1], ["K", 0, 1, 1, 1, 1], ["E", 0, 1, 1, 1, ""]], cells: [{ r: 5, c: 5, tone: "active" }], line: 3, note: "Row E: no match until the last column. E meets E.", pick: { prompt: "Which cell does the final match build on?", answer: "4,4" } },
              { grid: [LCS_HEAD, ["", 0, 0, 0, 0, 0], ["C", 0, 0, 1, 1, 1], ["A", 0, 1, 1, 1, 1], ["K", 0, 1, 1, 1, 1], ["E", 0, 1, 1, 1, 2]], cells: [{ r: 4, c: 4, tone: "done" }, { r: 5, c: 5, tone: "path" }], line: 4, note: "`dp[4][4] = dp[3][3] + 1 = **2**`. A longest common subsequence is `CE` (or `AE`)." },
            ],
          },
        },
        question: { type: "widget", goal: { picked: true }, prompt: "Answer both picks.", hint: "When the letters match, both are used up: step back one row and one column." },
        explanation: "Match: `dp[i][j] = dp[i-1][j-1] + 1`. No match: drop a letter from one word, `max(dp[i-1][j], dp[i][j-1])`. The answer sits in the bottom-right cell.",
      },
      {
        kind: "question",
        title: "Paths across a grid",
        body: "A courier crosses a grid of 3 rows and 4 columns from the top-left corner to the bottom-right, moving only right or down. With `dp[r][c] = dp[r-1][c] + dp[r][c-1]` (and 1 along the top row and left column), how many different routes are there?",
        question: { type: "number", answer: 10, unit: "routes", hint: "Fill the grid row by row: the top row and left column are all 1, every other cell is the one above plus the one to the left." },
        explanation: "Rows: `1 1 1 1`, `1 2 3 4`, `1 3 6 10`. So **10** routes. (It is also C(5, 2): 5 moves, choose which 2 go down.)",
      },
      {
        kind: "explain",
        title: "Knapsack in one row",
        body:
          "The **0/1 knapsack**: items with weights and values, a bag with capacity `C`, each item taken at most once. Row `i` reads only row `i - 1`, so one row of size `C + 1` is enough, **if** you loop the capacity **downwards**:\n\n" +
          py(`
def pack(items, capacity):
    dp = [0] * (capacity + 1)        # dp[c] = best value with capacity c
    for weight, value in items:
        for c in range(capacity, weight - 1, -1):   # high to low!
            dp[c] = max(dp[c], dp[c - weight] + value)
    return dp[capacity]
`) +
          "\nTime **O(n × C)**, space **O(C)**. Note that this is *pseudo-polynomial*: it depends on the size of the number C, not just the number of items.\n\nEdit distance (fewest single-letter inserts, deletes or replacements turning `a` into `b`) has the same shape as LCS: if the letters match, `dp[i][j] = dp[i-1][j-1]`; otherwise `1 + min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1])` for delete, insert and replace. Row 0 is `0, 1, 2, …` (insert everything) and column 0 likewise.\n\nPitfalls: off-by-one between `dp` indexes and string indexes (`a[i-1]` is the i-th letter), and the loop direction in the one-row knapsack.",
      },
      {
        kind: "question",
        title: "Why downwards?",
        body: "In the one-row knapsack, what goes wrong if the capacity loop runs **upwards** (`for c in range(weight, capacity + 1)`)?",
        question: {
          type: "choice",
          options: ["Nothing: the order of c does not matter", "It reads cells not computed yet and crashes", "It runs in O(n² × C) time instead", "An item can be packed more than once"],
          answer: 3,
          feedback: { 0: "It does matter: an upward loop reads `dp[c - weight]` after it was already updated in this same pass.", 1: "Every cell holds a number from the start, so nothing crashes; the values are just wrong.", 2: "The loops are the same size either way; only the values read change." },
          hint: "Going up, `dp[c - weight]` may already include the current item. What does adding the item again mean?",
        },
        explanation: "Upwards, `dp[c - weight]` was updated earlier in the same pass, so it may already contain this item, and adding it again packs it twice. That is exactly the **unbounded** knapsack (unlimited copies), which is right for stamps or ribbon but wrong here.",
      },
      {
        kind: "code",
        title: "Pack the carry-on",
        body: "Write `pack(items, capacity)`: `items` is a list of `(weight, value)` pairs, and each item fits in the bag at most once. Return the largest total value whose total weight is at most `capacity`.",
        language: "python",
        starter: `def pack(items, capacity):
    # dp[c] = best value with capacity c, using the items seen so far
    return 0
`,
        solution: `def pack(items, capacity):
    dp = [0] * (capacity + 1)
    for weight, value in items:
        for c in range(capacity, weight - 1, -1):
            dp[c] = max(dp[c], dp[c - weight] + value)
    return dp[capacity]
`,
        tests: [
          { id: "t1", description: "no items, no room, one item", assertionCode: `r = (pack([], 10), pack([(3, 4)], 0), pack([(3, 4)], 3))\nassert r == (0, 0, 4), f"no items, capacity 0, and one item that just fits should give (0, 0, 4); got {r}"` },
          { id: "t2", description: "each item at most once", assertionCode: `r = pack([(2, 3)], 4)\nassert r == 3, f"pack([(2, 3)], 4) should be 3: the one item can't be packed twice; got {r}"` },
          { id: "t3", description: "best value per kilo is not the rule", assertionCode: `r = pack([(6, 30), (3, 14), (4, 16), (2, 9)], 10)\nassert r == 46, f"should be 46 (weights 6 + 4), got {r}: grabbing the best value per kilo first gives only 44"` },
          { id: "t4", description: "100 items, capacity 1000", assertionCode: `import random\nrng = random.Random(7)\nitems = [(rng.randint(1, 60), rng.randint(1, 100)) for _ in range(100)]\nr = pack(items, 1000)\nassert r == 3370, f"expected 3370 for the 100 random items, got {r}"` },
        ],
        hints: ["Start with `dp = [0] * (capacity + 1)`: with nothing packed, every capacity is worth 0.", "For each item, loop `c` from `capacity` down to `weight`: `dp[c] = max(dp[c], dp[c - weight] + value)`."],
      },
      {
        kind: "code",
        title: "Typo distance",
        body: "A spell checker ranks suggestions by **edit distance**: the fewest single-letter inserts, deletes or replacements that turn `a` into `b`. Write `typo_distance(a, b)`.\n\nFor example `flaw` → `lawn` is 2: delete the `f`, then add `n` at the end.",
        language: "python",
        starter: `def typo_distance(a, b):
    # dp[i][j] = edits to turn the first i letters of a into the first j letters of b
    return 0
`,
        solution: `def typo_distance(a, b):
    m, n = len(a), len(b)
    dp = [[0] * (n + 1) for _ in range(m + 1)]
    for i in range(m + 1):
        dp[i][0] = i
    for j in range(n + 1):
        dp[0][j] = j
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if a[i - 1] == b[j - 1]:
                dp[i][j] = dp[i - 1][j - 1]
            else:
                dp[i][j] = 1 + min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
    return dp[m][n]
`,
        tests: [
          { id: "t1", description: "empty words", assertionCode: `r = (typo_distance("", "abc"), typo_distance("abc", ""), typo_distance("same", "same"))\nassert r == (3, 3, 0), f"expected (3, 3, 0) for '' to 'abc', 'abc' to '' and 'same' to 'same'; got {r}"` },
          { id: "t2", description: "flaw to lawn", assertionCode: `r = typo_distance("flaw", "lawn")\nassert r == 2, f"typo_distance('flaw', 'lawn') should be 2, got {r}"` },
          { id: "t3", description: "same length, different letters", assertionCode: `r = typo_distance("garden", "danger")\nassert r == 4, f"typo_distance('garden', 'danger') should be 4, got {r}: length difference alone is not the answer"` },
          { id: "t4", description: "swapped letters and an extra one", assertionCode: `r = (typo_distance("receive", "recieve"), typo_distance("plane", "planet"))\nassert r == (2, 1), f"expected (2, 1), got {r}"` },
        ],
        hints: ["Row 0 is `0, 1, 2, …` and column 0 the same: turning a prefix into an empty word (or back) takes one edit per letter.", "If `a[i-1] == b[j-1]`, copy the diagonal; otherwise `1 + min(top, left, diagonal)`."],
      },
      {
        kind: "recap",
        points: [
          "2-D DP: the state needs two numbers, so the table is a grid, usually **O(n × m)** time.",
          "Grid paths read the cell above and to the left; string DPs compare `a[i-1]` with `b[j-1]` and step diagonally on a match.",
          "**0/1 knapsack**: take or skip each item; with one row, loop the capacity **downwards** so each item is used once.",
          "Edit distance: match → diagonal; otherwise 1 + min(delete, insert, replace).",
          "Spot it: two strings to compare, a grid to cross, items to pick under a weight or budget limit.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 4. Greedy ───────────────────────────────
  {
    id: "fnd-iv-dp-4-greedy",
    title: "Greedy: the best move now, and proving it",
    summary: "Make the locally best choice and never look back, when an exchange argument says it is safe.",
    minutes: 13,
    xp: 70,
    level: "Intermediate",
    steps: [
      {
        kind: "explain",
        title: "Take the best option and move on",
        body:
          "A **greedy** algorithm makes the choice that looks best right now and never revisits it. It is usually a sort followed by one pass: **O(n log n)**.\n\nThe catch: greedy is only correct for some problems, and the wrong greedy rule looks just as convincing as the right one. So in an interview, say the rule *and* why it is safe.\n\nThe classic: a meeting room, a list of booking requests `(start, end)`, and you want to accept as many as possible without overlaps. Candidate rules:\n- earliest **start** first?\n- **shortest** booking first?\n- earliest **end** first?\n\nOnly the last one is always right. Finishing as early as possible leaves the most room for everything else.\n\n**How to spot it:** intervals, deadlines, *minimum number of …* or *maximum number of …* where sorting by one key makes the choice obvious. If small examples break every simple rule, reach for DP instead.",
      },
      {
        kind: "question",
        title: "Earliest end first",
        body: "Bookings are sorted by end time. Keep a booking if it starts at or after the end of the last one kept. Tap the next booking that gets kept.",
        widget: {
          type: "iv-trace",
          props: {
            title: "Most bookings in one room",
            frames: [
              { array: BOOKINGS, code: BOOK_CODE, line: 1, vars: { last_end: "-∞", kept: 0 }, note: "Bookings `start-end`, sorted by end time." },
              { array: BOOKINGS, highlight: [0], line: 5, vars: { last_end: 4, kept: 1 }, note: "`1-4` ends first: keep it. The room is busy until 4." },
              { highlight: [0], done: [], line: 4, vars: { last_end: 4, kept: 1 }, note: "Walk on: a booking can be kept only if it starts at 4 or later.", pick: { prompt: "Which booking is kept next?", answer: 3 } },
              { highlight: [0, 3], done: [1, 2], line: 5, vars: { last_end: 7, kept: 2 }, note: "`3-5` and `0-6` start before 4: skipped. `5-7` fits: keep it. Busy until 7." },
              { highlight: [0, 3], done: [1, 2], line: 4, vars: { last_end: 7, kept: 2 }, note: "Now a booking must start at 7 or later.", pick: { prompt: "Which booking is kept next?", answer: 7 } },
              { highlight: [0, 3, 7], done: [1, 2, 4, 5, 6], line: 5, vars: { last_end: 11, kept: 3 }, note: "`3-9`, `5-9` and `6-10` start too early; `8-11` fits. **3 bookings**, and no choice could fit 4." },
            ],
          },
        },
        question: { type: "widget", goal: { picked: true }, prompt: "Answer both picks.", hint: "Skip every booking that starts before `last_end`; keep the first one that doesn't." },
        explanation: "One pass after sorting, so **O(n log n)**. Each kept booking is the one that frees the room soonest among those still possible.",
      },
      {
        kind: "question",
        title: "Which rule breaks?",
        body: "Bookings `0-5`, `4-7` and `6-11`. Which greedy rule keeps only **one** of them, when two are possible?",
        question: {
          type: "choice",
          options: ["Shortest booking first", "Earliest end first", "Latest start first", "Try all subsets"],
          answer: 0,
          feedback: { 1: "Earliest end keeps `0-5`, then `6-11`: two, the best possible.", 2: "Latest start keeps `6-11`, then `0-5` (it ends before 6): two. It is the mirror image of earliest end.", 3: "Trying all subsets is slow, but it does find the two." },
          hint: "Find the shortest booking. Which others does it overlap?",
        },
        explanation: "`4-7` is the shortest (3 hours) but overlaps both others, so shortest-first keeps just one. One counterexample is enough to kill a greedy rule; that is the fastest way to test a rule in an interview.",
      },
      {
        kind: "explain",
        title: "Why it works: the exchange argument",
        body:
          "To prove a greedy rule, show that any best solution can be **swapped** into the greedy one without getting worse.\n\nFor earliest end: take any best schedule. Its first booking ends no earlier than the greedy pick `g` (g ends first of all). Replace that first booking with `g`: g ends sooner, so it overlaps nothing the old one didn't. Same count, and now it starts like greedy. Repeat for the rest.\n\nWhere greedy fails, DP usually works. Stamps with values `[1, 3, 4]` and 6 cents: biggest-first takes 4 + 1 + 1, but 3 + 3 is better. (For a currency like 1, 2, 5, 10 greedy happens to be right, which is why the bug hides.)\n\nGreedy patterns that are safe:\n- interval scheduling by earliest end; fewest points to hit every interval (sort by end too);\n- pairing the heaviest remaining with the lightest when at most two share (sort, two pointers);\n- jump or fuel problems: track the farthest reach so far;\n- Huffman coding, Dijkstra, Prim and Kruskal are greedy algorithms too.",
      },
      {
        kind: "question",
        title: "Greedy stamps",
        body: "Stamps come in 1, 3 and 4 cents. Biggest-that-fits-first makes 6 cents. How many stamps does it use?",
        question: { type: "number", answer: 3, unit: "stamps", hint: "Take a 4, then see what is left and take the biggest stamp that fits again." },
        explanation: "4, then 1, then 1: **3 stamps**, while 3 + 3 needs only 2. When a greedy rule fails on a small case, the problem wants DP (the *Fewest stamps* code step in the 1-D DP lesson).",
      },
      {
        kind: "code",
        title: "Most bookings",
        body: "Write `max_bookings(slots)`: `slots` is a list of `(start, end)` pairs with `start < end`, in any order. Return the largest number of bookings one room can hold with no overlaps. A booking may start exactly when another ends.",
        language: "python",
        starter: `def max_bookings(slots):
    # sort by the safe key, then keep every booking that starts after the last kept one ends
    return 0
`,
        solution: `def max_bookings(slots):
    count = 0
    last_end = float("-inf")
    for start, end in sorted(slots, key=lambda s: s[1]):
        if start >= last_end:
            count += 1
            last_end = end
    return count
`,
        tests: [
          { id: "t1", description: "none, and back to back", assertionCode: `r = (max_bookings([]), max_bookings([(1, 2), (2, 3), (3, 4)]))\nassert r == (0, 3), f"expected 0 for no bookings and 3 for back-to-back ones, got {r}"` },
          { id: "t2", description: "one long booking", assertionCode: `r = max_bookings([(0, 10), (1, 2), (2, 3), (3, 4), (5, 6)])\nassert r == 4, f"expected 4, got {r}: sorting by start keeps (0, 10) and blocks the rest"` },
          { id: "t3", description: "shortest first fails here", assertionCode: `r = max_bookings([(4, 7), (0, 5), (6, 11)])\nassert r == 2, f"expected 2 ((0, 5) and (6, 11)), got {r}"` },
          { id: "t4", description: "unsorted mix", assertionCode: `r = max_bookings([(5, 7), (1, 4), (3, 5), (0, 6), (3, 9), (5, 9), (6, 10), (8, 11)])\nassert r == 3, f"expected 3, got {r}"` },
        ],
        hints: ["Sort by end time: `sorted(slots, key=lambda s: s[1])`.", "Keep `last_end`; a booking fits when `start >= last_end`, and then `last_end = end`."],
      },
      {
        kind: "code",
        title: "Fewest tents",
        body: "Hikers share tents. A tent holds **at most two** hikers, and their total weight of kit must be at most `limit`. Write `fewest_tents(kit, limit)`: the fewest tents for everyone (every single weight is at most `limit`).\n\nGreedy rule: sort, then the heaviest hiker left shares with the lightest one left if they fit; otherwise the heaviest goes alone.",
        language: "python",
        starter: `def fewest_tents(kit, limit):
    # sort, then pair the heaviest left with the lightest left when they fit
    return 0
`,
        solution: `def fewest_tents(kit, limit):
    kit = sorted(kit)
    lo, hi = 0, len(kit) - 1
    tents = 0
    while lo <= hi:
        if lo < hi and kit[lo] + kit[hi] <= limit:
            lo += 1
        hi -= 1
        tents += 1
    return tents
`,
        tests: [
          { id: "t1", description: "nobody, one hiker", assertionCode: `r = (fewest_tents([], 100), fewest_tents([50], 100))\nassert r == (0, 1), f"expected (0, 1), got {r}"` },
          { id: "t2", description: "pairs that fit", assertionCode: `r = fewest_tents([30, 70, 40, 60], 100)\nassert r == 2, f"expected 2 (30+70, 40+60), got {r}"` },
          { id: "t3", description: "neighbours in sorted order are the wrong pairs", assertionCode: `r = fewest_tents([10, 20, 30, 90], 100)\nassert r == 2, f"expected 2 (90+10, 30+20), got {r}"` },
          { id: "t4", description: "odd one out and full tents", assertionCode: `r = (fewest_tents([50, 50, 50, 50, 50], 100), fewest_tents([90, 90, 90], 100), fewest_tents([60, 30, 45, 55, 20, 80], 100))\nassert r == (3, 3, 3), f"expected (3, 3, 3), got {r}"` },
        ],
        hints: ["Sort `kit`, and keep two indexes: `lo` at the lightest, `hi` at the heaviest.", "Each round fills one tent: the heaviest always goes in; the lightest joins only if the two fit."],
      },
      {
        kind: "recap",
        points: [
          "**Greedy**: sort by the right key, then make the locally best choice in one pass, usually **O(n log n)**.",
          "Test a rule with small counterexamples first; one failure kills it.",
          "Prove it with an **exchange argument**: swap a best solution's choice for the greedy one without losing anything.",
          "Safe classics: earliest end for intervals, heaviest-with-lightest pairing, farthest reach for jumps.",
          "When every simple rule breaks (stamps 1, 3, 4), switch to DP.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 5. Backtracking ───────────────────────────────
  {
    id: "fnd-iv-dp-5-backtracking",
    title: "Backtracking: try, recurse, undo",
    summary: "Explore every choice with depth-first search, and prune branches that can't work.",
    minutes: 14,
    xp: 80,
    level: "Advanced",
    steps: [
      {
        kind: "explain",
        title: "Search every option, cleverly",
        body:
          "When a problem asks for **all** the answers (every team, every arrangement, every way to fill a board), you have to try options. **Backtracking** does it as a depth-first walk over a tree of choices:\n\n" +
          py(`
def backtrack(path, choices):
    if is_complete(path):
        record(path[:])          # copy it: path keeps changing
        return
    for c in choices:
        if allowed(path, c):
            path.append(c)       # choose
            backtrack(path, ...) # explore
            path.pop()           # un-choose
`) +
          "\nThe **choose, explore, un-choose** rhythm lets one list serve the whole search. **Pruning** (returning early when a branch can't succeed) is what makes it fast in practice.\n\nSizes to know: there are 2ⁿ subsets, n! orderings, and C(n, k) teams of k. Writing each answer out costs up to n more, so subsets are O(2ⁿ · n).\n\n**How to spot it:** *list all*, *every combination*, *all arrangements*, puzzles (n-queens, sudoku, word search), and small limits like n ≤ 15.",
      },
      {
        kind: "question",
        title: "Pick items that sum to 5",
        body: "Items are `[4, 3, 2]`. Each level decides one item: left takes it, right skips it. Node labels are the running total; a total over 5 is pruned at once. Tap where the search goes next.",
        widget: {
          type: "iv-trace",
          props: {
            title: "Subsets of [4, 3, 2] with total 5",
            frames: [
              { tree: { nodes: SUBSET_TREE, active: ["r"] }, code: SUBSET_CODE, line: 1, stacks: [{ label: "path", items: [] }], note: "Start with nothing taken, total 0." },
              { tree: { active: ["a"], done: ["r"] }, line: 6, stacks: [{ label: "path", items: [4] }], note: "Take 4: total 4." },
              { tree: { active: ["aa"], done: ["r", "a"] }, line: 2, stacks: [{ label: "path", items: [4, 3] }], note: "Take 3: total 7, over 5. Prune: return at once, and pop the 3.", pick: { prompt: "Where does the search go after backing out of the 7?", answer: "ab" } },
              { tree: { active: ["ab"], done: ["r", "a", "aa"] }, line: 7, stacks: [{ label: "path", items: [4] }], note: "Skip 3: still 4. Taking 2 makes 6 (pruned), skipping it ends at 4, not 5." },
              { tree: { active: ["b"], done: ["r", "a", "aa", "ab", "aba", "abb"] }, line: 7, stacks: [{ label: "path", items: [] }], note: "Everything under *take 4* is done. Back at the root, skip 4: total 0.", pick: { prompt: "Which node is the first solution the search reaches?", answer: "baa" } },
              { tree: { active: ["baa"], done: ["r", "a", "aa", "ab", "aba", "abb", "b", "ba"] }, line: 4, stacks: [{ label: "path", items: [3, 2] }], note: "Take 3, take 2: total 5 with every item decided. Record a **copy** of `[3, 2]`." },
              { tree: { done: ["r", "a", "aa", "ab", "aba", "abb", "b", "ba", "baa", "bab", "bb", "bba", "bbb"] }, line: 5, stacks: [{ label: "path", items: [] }], note: "The rest of the tree finds nothing else. Pruning cut off the 7 and the 6 early; on bigger inputs that saves whole subtrees." },
            ],
          },
        },
        question: { type: "widget", goal: { picked: true }, prompt: "Answer both picks.", hint: "Depth-first: finish everything below a node, left (take) before right (skip), before moving on." },
        explanation: "The search visits the choice tree depth-first, keeps one shared `path`, and cuts any branch whose total is already too big.",
      },
      {
        kind: "question",
        title: "How many subsets?",
        body: "Each of 5 items is either taken or skipped. How many different subsets (including the empty one) does a full search visit at the bottom of the tree?",
        question: { type: "number", answer: 32, unit: "subsets", hint: "Every item doubles the number of branches." },
        explanation: "2 × 2 × 2 × 2 × 2 = **32** = 2⁵. Each extra item doubles the work, which is why backtracking needs small inputs, or strong pruning.",
      },
      {
        kind: "explain",
        title: "Teams, duplicates and pruning",
        body:
          "Choosing teams of `k` from a list: loop over the next candidate from a `start` index, so each team is built in one order only:\n\n" +
          py(`
def teams(names, k):
    out, path = [], []
    def go(start):
        if len(path) == k:
            out.append(path[:])
            return
        for i in range(start, len(names)):
            path.append(names[i])
            go(i + 1)          # later names only: no repeats
            path.pop()
    go(0)
    return out
`) +
          "\nWhen the input has **duplicates** and the answer must not repeat, sort first and skip a value equal to the one before it **at the same depth**: `if i > start and items[i] == items[i - 1]: continue`.\n\nPrune when you can: if the items are sorted and `items[i]` is already over the remaining budget, every later one is too, so `break`.\n\nPitfalls: recording `path` itself instead of a copy (every answer ends up as the same emptied list), forgetting the `pop`, and using a `set` of answers to hide duplicates (slow, and it still explores every duplicate branch).",
      },
      {
        kind: "question",
        title: "Why pop?",
        body: "In the template, what goes wrong if you delete the `path.pop()` line?",
        question: {
          type: "choice",
          options: ["Nothing; Python frees the list itself", "Choices pile up from branches already left", "The recursion never reaches a base case", "Only the first answer is ever recorded"],
          answer: 1,
          feedback: { 0: "Python frees a list only when nothing refers to it; `path` is shared by every call and stays alive.", 2: "The base case still triggers (often too early), because `path` only grows.", 3: "Answers are still recorded, but they contain choices from other branches." },
          hint: "Every call shares the same `path` list. After exploring a choice, what should `path` look like for the next sibling?",
        },
        explanation: "`path` is one list shared by the whole search. Without `pop`, a choice made in one branch is still there when the next branch starts, so later answers contain items they never chose.",
      },
      {
        kind: "code",
        title: "Every team of k",
        body: "Write `choose_team(names, k)`: every team of exactly `k` different people from `names`, as lists. Keep names in their original order inside a team, and list teams in the order the template produces (by the first member's position, then the second's, …). Write the backtracking yourself instead of using `itertools`.",
        language: "python",
        starter: `def choose_team(names, k):
    out, path = [], []
    # go(start): try each later name as the next member, then undo
    return out
`,
        solution: `def choose_team(names, k):
    out, path = [], []

    def go(start):
        if len(path) == k:
            out.append(path[:])
            return
        for i in range(start, len(names)):
            if len(names) - i < k - len(path):
                break  # not enough names left
            path.append(names[i])
            go(i + 1)
            path.pop()

    go(0)
    return out
`,
        tests: [
          { id: "t1", description: "pairs from four", assertionCode: `r = choose_team(["ana", "ben", "cy", "dee"], 2)\nexp = [["ana", "ben"], ["ana", "cy"], ["ana", "dee"], ["ben", "cy"], ["ben", "dee"], ["cy", "dee"]]\nassert r == exp, f"expected {exp}, got {r}"` },
          { id: "t2", description: "k = 0, and k too big", assertionCode: `r = (choose_team(["ana", "ben"], 0), choose_team(["ana", "ben"], 3))\nassert r == ([[]], []), f"k = 0 has one empty team [[]]; k bigger than the list has none []; got {r}"` },
          { id: "t3", description: "copies, not the same list", assertionCode: `r = choose_team(["x", "y", "z"], 3)\nassert r == [["x", "y", "z"]], f"expected [['x', 'y', 'z']], got {r}: did you append path itself instead of a copy?"` },
          { id: "t4", description: "120 teams of 3 from 10", assertionCode: `names = [chr(97 + i) for i in range(10)]\nr = choose_team(names, 3)\nassert len(r) == 120 and len({tuple(t) for t in r}) == 120, f"expected 120 different teams, got {len(r)} ({len({tuple(t) for t in r})} different)"\nassert r[0] == ["a", "b", "c"] and r[-1] == ["h", "i", "j"], f"teams should run from ['a', 'b', 'c'] to ['h', 'i', 'j'], got {r[0]} ... {r[-1]}"` },
        ],
        hints: ["Inside `go(start)`: when `len(path) == k`, append `path[:]` and return.", "Otherwise loop `i` from `start`: append `names[i]`, call `go(i + 1)`, then `pop()`."],
      },
      {
        kind: "code",
        title: "Baskets on budget",
        body: "A shop shelf has items with prices `prices` (some prices repeat). Write `exact_baskets(prices, budget)`: every different basket whose prices add up to exactly `budget`, each shelf item used at most once. Return each basket as a sorted list of prices, and the baskets sorted. Two baskets with the same prices count once.\n\nSort first, skip a repeated price at the same depth, and stop a loop once a price is over what is left.",
        language: "python",
        starter: `def exact_baskets(prices, budget):
    prices = sorted(prices)
    out, path = [], []
    # go(start, left): try each later price that fits; skip repeats at the same depth
    return out
`,
        solution: `def exact_baskets(prices, budget):
    prices = sorted(prices)
    out, path = [], []

    def go(start, left):
        if left == 0:
            out.append(path[:])
            return
        for i in range(start, len(prices)):
            if i > start and prices[i] == prices[i - 1]:
                continue
            if prices[i] > left:
                break
            path.append(prices[i])
            go(i + 1, left - prices[i])
            path.pop()

    go(0, budget)
    return out
`,
        tests: [
          { id: "t1", description: "repeated prices", assertionCode: `r = exact_baskets([2, 5, 2, 1, 2], 5)\nassert r == [[1, 2, 2], [5]], f"expected [[1, 2, 2], [5]], got {r}"` },
          { id: "t2", description: "several baskets", assertionCode: `r = exact_baskets([3, 1, 3, 5, 1, 1], 8)\nassert r == [[1, 1, 1, 5], [1, 1, 3, 3], [3, 5]], f"expected [[1, 1, 1, 5], [1, 1, 3, 3], [3, 5]], got {r}"` },
          { id: "t3", description: "nothing fits, budget 0", assertionCode: `r = (exact_baskets([4, 6], 3), exact_baskets([7, 3], 0))\nassert r == ([], [[]]), f"no basket makes 3 ([]); the empty basket makes 0 ([[]]); got {r}"` },
          { id: "t4", description: "many equal prices", assertionCode: `r = exact_baskets([1] * 20, 10)\nassert r == [[1] * 10], f"twenty 1s and budget 10 have exactly one different basket, got {len(r)} baskets"` },
        ],
        hints: ["`go(start, left)`: if `left == 0`, record a copy of `path`.", "In the loop, `continue` when `i > start and prices[i] == prices[i - 1]`, and `break` when `prices[i] > left`."],
      },
      {
        kind: "recap",
        points: [
          "**Backtracking** is depth-first search over choices: **choose, explore, un-choose** with one shared `path`.",
          "Record a **copy** of `path`; always undo a choice before trying the next one.",
          "Loop from a `start` index to build each combination once; sort and skip equal neighbours to avoid duplicate answers.",
          "**Prune** branches that can't succeed; output sizes are 2ⁿ subsets, n! orderings, C(n, k) teams.",
          "Spot it: *list all*, *every combination or arrangement*, puzzles, and small n.",
        ],
      },
    ],
  },
];
