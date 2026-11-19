import type { ConceptLesson } from "../../learn/types.ts";

/** Fenced Python block for lesson prose. */
const py = (code: string) => "~~~python\n" + code.trim() + "\n~~~";
/** Fenced plain-text block (diagrams, tables). */
const txt = (code: string) => "~~~text\n" + code.replace(/^\n+|\s+$/g, "") + "\n~~~";

const DEDUPE_CODE = ["w = 1", "for r in range(1, len(nums)):", "    if nums[r] != nums[w - 1]:", "        nums[w] = nums[r]", "        w += 1", "return w"];

const WINDOW_CODE = ["last, left, best = {}, 0, 0", "for right, x in enumerate(songs):", "    if x in last and last[x] >= left:", "        left = last[x] + 1", "    last[x] = right", "    best = max(best, right - left + 1)"];
const SONGS = ["A", "B", "C", "A", "D", "B", "E"];

const RPN_CODE = ["for tok in tokens:", "    if tok in OPS:", "        a = stack.pop(); b = stack.pop()", "        stack.append(apply(tok, b, a))", "    else:", "        stack.append(int(tok))", "return stack[-1]"];
const TOKENS = ["4", "2", "3", "*", "+", "5", "-"];

const NGE_CODE = ["res, stack = [0] * len(p), []", "for i, x in enumerate(p):", "    while stack and p[stack[-1]] < x:", "        j = stack.pop()", "        res[j] = i - j", "    stack.append(i)"];
const DAYS = [5, 3, 4, 2, 6, 1];
const st = (items: string[]) => [{ label: "stack (index:price)", items }];

export const ivPointersLessonsA: ConceptLesson[] = [
  // ─────────────────────────────── 1. Two Pointers ───────────────────────────────
  {
    id: "fnd-iv-pointers-1-two-pointers",
    title: "Two pointers: squeeze and compact",
    summary: "Opposite ends on sorted data, and a read/write pair that filters a list in place.",
    minutes: 10,
    xp: 60,
    level: "Beginner",
    steps: [
      {
        kind: "explain",
        title: "Two indexes instead of two loops",
        body: "**Two pointers** means walking one list with two indexes at once, so a pair search that would take two nested loops (O(n²)) takes one pass (O(n)) and O(1) extra memory. There are two shapes:\n\n- **Opposite ends** on **sorted** data: `lo` starts at the left, `hi` at the right. Compare `nums[lo] + nums[hi]` with the target. Too big? Then `hi` is too big for *every* remaining `lo`, so `hi -= 1` throws away a whole row of pairs at once. Too small? `lo += 1`.\n- **Same direction**: a **read** pointer `r` visits every item, a **write** pointer `w` marks where the next kept item goes. This filters or compacts a list in place.\n\n" +
          txt(`
opposite ends          same direction
lo ->        <- hi      w ->
[1  3  4  6  8  11]     [1  1  2  3  3]
                         r ->
`) +
          "\n**How to spot it:** *sorted array*, *pair / triple with sum*, *in place*, *remove duplicates*, *move all X to the end*, *merge two sorted lists*.\n\n**Pitfalls:** opposite ends only works because the data is sorted (sort first if allowed: O(n log n)); use `lo < hi`, not `<=`, so an item isn't paired with itself.",
      },
      {
        kind: "question",
        title: "Compact the duplicates",
        body: "Remove repeats from a **sorted** list in place. `r` reads every item; `w` is where the next new value is written. Answer the picks.",
        widget: {
          type: "iv-trace",
          props: {
            title: "Read and write pointers",
            frames: [
              { array: [1, 1, 2, 3, 3, 3, 5], pointers: { w: 1, r: 1 }, highlight: [0, 1], code: DEDUPE_CODE, line: 3, vars: { w: 1 }, note: "`nums[0]` is always kept. `r = 1` holds 1, the same as the last kept value: skip." },
              { pointers: { w: 1, r: 2 }, highlight: [2], line: 4, note: "2 is new: write it at `w`, then `w` moves on." },
              { array: [1, 2, 2, 3, 3, 3, 5], pointers: { w: 2, r: 3 }, highlight: [3], done: [0, 1], line: 3, vars: { w: 2 }, note: "`r` reads 3.", pick: { prompt: "`nums[r]` is compared with the last kept value. Tap that cell.", answer: 1 } },
              { array: [1, 2, 3, 3, 3, 3, 5], pointers: { w: 3, r: 4 }, highlight: [2, 4], done: [0, 1, 2], line: 3, vars: { w: 3 }, note: "3 was new and is now at index 2. `r = 4` and `r = 5` hold 3 again: both skipped." },
              { pointers: { r: 6 }, highlight: [6], done: [0, 1, 2], line: 4, vars: {}, note: "`r` reads 5, which is new.", pick: { prompt: "Tap the cell where 5 is written.", answer: 3 } },
              { array: [1, 2, 3, 5, 3, 3, 5], pointers: { w: 4 }, done: [0, 1, 2, 3], line: 6, vars: { w: 4 }, note: "Return **4**: the first 4 cells are `1 2 3 5`. What's left after them doesn't matter." },
            ],
          },
        },
        question: { type: "widget", goal: { picked: true }, prompt: "Answer both picks.", hint: "`w` always points just past the last value that was kept." },
        explanation: "The last kept value sits at `w - 1`, and a new value is written at `w`. Each item is read once: O(n) time, O(1) extra memory.",
      },
      {
        kind: "question",
        title: "Why it's safe to move hi",
        body: "In the opposite-ends search on sorted data, `nums[lo] + nums[hi]` is bigger than the target, so you move `hi` left. Why can't the pair you're looking for use this `hi`?",
        question: {
          type: "choice",
          options: ["Because `hi` has been checked once already", "Every remaining `lo` is at least as big, so the sum stays too big", "Because `lo` will catch up with it anyway", "It could; the method is a heuristic that may miss pairs"],
          answer: 1,
          feedback: { 0: "Being checked once isn't enough: it's the sorted order that rules out the other pairs.", 3: "It never misses: each move rules out only pairs that are provably too big or too small." },
          hint: "The list is sorted. What do you know about every value from `lo` to the right?",
        },
        explanation: "Everything right of `lo` is ≥ `nums[lo]`, so `nums[hi]` plus any of them is still too big. That one comparison rules out a whole row of pairs, which is why the loop runs at most n − 1 times.",
      },
      {
        kind: "question",
        title: "How many steps?",
        body: "The opposite-ends loop moves exactly one pointer per step and stops when `lo` meets `hi`. For a list of 1,000 items, at most how many times does the loop body run?",
        question: { type: "number", answer: 999, unit: "steps", hint: "The gap between `lo` and `hi` starts at 999 and shrinks by one every step." },
        explanation: "`hi - lo` starts at 999 and drops by 1 each step, so at most **999** steps. Compare with 499,500 pairs for the nested loops.",
      },
      {
        kind: "code",
        title: "Compact in place",
        body: "Write `dedupe(nums)`: `nums` is sorted. Change it in place so its first `k` items are the distinct values in order, and return `k`. Don't build a new list.",
        language: "python",
        starter: `def dedupe(nums):
    # w = where the next new value goes; r reads every item
    pass
`,
        solution: `def dedupe(nums):
    if not nums:
        return 0
    w = 1
    for r in range(1, len(nums)):
        if nums[r] != nums[w - 1]:
            nums[w] = nums[r]
            w += 1
    return w
`,
        tests: [
          { id: "t1", description: "The traced list", assertionCode: `_a = [1, 1, 2, 3, 3, 3, 5]\n_k = dedupe(_a)\nassert _k == 4, f"expected k = 4, got {_k}"\nassert _a[:4] == [1, 2, 3, 5], f"the first 4 items should be [1, 2, 3, 5], got {_a[:4]}: write into nums itself"` },
          { id: "t2", description: "Empty and single", assertionCode: `_k = dedupe([7])\nassert _k == 1, f"one item: expected 1, got {_k}"\n_k = dedupe([])\nassert _k == 0, f"an empty list: expected 0, got {_k}"` },
          { id: "t3", description: "All the same", assertionCode: `_a = [2, 2, 2, 2]\n_k = dedupe(_a)\nassert _k == 1 and _a[0] == 2, f"expected k = 1 with 2 first, got k = {_k}, list {_a}"` },
          { id: "t4", description: "Negatives and no repeats", assertionCode: `_a = [-3, -3, -1, 0, 0]\n_k = dedupe(_a)\nassert _k == 3 and _a[:3] == [-3, -1, 0], f"expected 3 and [-3, -1, 0], got {_k} and {_a[:3] if isinstance(_k, int) else _a}"\n_a = [1, 2, 3]\nassert dedupe(_a) == 3 and _a == [1, 2, 3], "a list without repeats stays as it is"` },
        ],
        hints: ["Keep `nums[0]`, start `w = 1`, and loop `r` from 1. Guard the empty list first.", "When `nums[r] != nums[w - 1]`, copy it to `nums[w]` and add 1 to `w`."],
      },
      {
        kind: "code",
        title: "Pairs within budget",
        body: "Two friends each pick one gift from a **sorted** price list. Write `count_pairs(prices, limit)`: how many pairs `i < j` have `prices[i] + prices[j] <= limit`? Up to 50,000 prices, so no nested loops.\n\nWith `lo` and `hi` at the ends: if `prices[lo] + prices[hi] <= limit`, then `lo` pairs with **every** index from `lo + 1` to `hi`, which is `hi - lo` pairs at once. Count them and move `lo` right. Otherwise move `hi` left.",
        language: "python",
        starter: `def count_pairs(prices, limit):
    lo, hi, count = 0, len(prices) - 1, 0
    # squeeze from both ends
    pass
`,
        solution: `def count_pairs(prices, limit):
    lo, hi, count = 0, len(prices) - 1, 0
    while lo < hi:
        if prices[lo] + prices[hi] <= limit:
            count += hi - lo
            lo += 1
        else:
            hi -= 1
    return count
`,
        tests: [
          { id: "t1", description: "Five prices", assertionCode: `_r = count_pairs([1, 2, 3, 4, 5], 6)\nassert _r == 6, f"(1,2) (1,3) (1,4) (1,5) (2,3) (2,4): expected 6, got {_r}"` },
          { id: "t2", description: "Exactly at the limit counts", assertionCode: `_r = count_pairs([5, 5], 10)\nassert _r == 1, f"5 + 5 = 10 is within 10: expected 1, got {_r}"\n_r = count_pairs([5, 5], 9)\nassert _r == 0, f"5 + 5 is over 9: expected 0, got {_r}"` },
          { id: "t3", description: "Negatives and repeats", assertionCode: `_r = count_pairs([-3, -1, 2, 4], 0)\nassert _r == 2, f"-3-1 and -3+2 are within 0: expected 2, got {_r}"\n_r = count_pairs([1, 1, 1, 1], 2)\nassert _r == 6, f"all 6 pairs of four 1s: expected 6, got {_r}"` },
          { id: "t4", description: "Fewer than two prices", assertionCode: `_r = count_pairs([3], 10)\nassert _r == 0, f"one price makes no pair: expected 0, got {_r}"\nassert count_pairs([], 10) == 0, "no prices, no pairs"` },
          { id: "t5", description: "50,000 prices", assertionCode: `_r = count_pairs(list(range(50000)), 50000)\nassert _r == 625024999, f"expected 625024999, got {_r}"` },
        ],
        hints: ["Loop `while lo < hi`.", "When the pair fits, add `hi - lo` (lo with each of lo+1..hi) and move `lo`; otherwise move `hi`."],
      },
      {
        kind: "recap",
        points: [
          "**Two pointers** turn an O(n²) pair search into one O(n) pass with O(1) memory.",
          "**Opposite ends** need sorted data: too big → `hi -= 1`, too small → `lo += 1`; each move rules out a whole row of pairs.",
          "**Read/write** pointers filter or compact in place: `r` visits everything, `w` marks the next slot to keep.",
          "Counting trick: when `nums[lo] + nums[hi]` fits, all `hi - lo` pairs with `lo` fit.",
          "Use `lo < hi` so an item never pairs with itself; test empty, single, all-equal and negative inputs.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 2. Sliding Window ───────────────────────────────
  {
    id: "fnd-iv-pointers-2-sliding-window",
    title: "Sliding windows: grow, then shrink",
    summary: "Fixed and variable windows over contiguous slices, each index entering and leaving once.",
    minutes: 11,
    xp: 70,
    level: "Intermediate",
    steps: [
      {
        kind: "explain",
        title: "A window that slides",
        body: "A **sliding window** is a contiguous slice `nums[left..right]` that moves along the list. Instead of recomputing each slice from scratch, you update the answer as one item **enters** on the right and one **leaves** on the left.\n\n- **Fixed size k:** add `nums[right]`, subtract `nums[right - k]`. Every window costs O(1).\n- **Variable size:** move `right` one step at a time; while the window breaks the rule, move `left` forward. Both pointers only go forward, so the total work is O(n) even though there's a loop inside the loop.\n\n" +
          py(`
left = 0
for right in range(len(nums)):
    add(nums[right])
    while window_is_bad():
        remove(nums[left]); left += 1
    best = max(best, right - left + 1)
`) +
          "\nIt works when shrinking a bad window can make it good, and never the other way round: all-positive sums, distinct items, *at most k* of something.\n\n**How to spot it:** *contiguous*, *substring*, *subarray*, *longest / shortest*, *at most k*, *every window of k days*.\n\n**Pitfall:** with **negative** numbers a sum window has no such rule (adding an item can lower the sum), so use prefix sums instead.",
      },
      {
        kind: "question",
        title: "No song twice",
        body: "Find the longest stretch of a playlist with no song repeated. `last` remembers where each song was last seen; on a repeat inside the window, `left` jumps just past it. Answer the picks.",
        widget: {
          type: "iv-trace",
          props: {
            title: "Longest stretch without a repeat",
            frames: [
              { array: SONGS, pointers: { left: 0, right: 2 }, range: [0, 2], code: WINDOW_CODE, line: 6, vars: { best: 3 }, note: "A, B, C are all different: the window grows to length 3." },
              { pointers: { left: 0, right: 3 }, range: [0, 2], highlight: [0, 3], line: 3, vars: { best: 3, "last[A]": 0 }, note: "A again, and its last copy (index 0) is inside the window.", pick: { prompt: "Where does `left` jump to?", answer: 1 } },
              { pointers: { left: 1, right: 4 }, range: [1, 4], line: 6, vars: { best: 4 }, note: "`left = 1`. Then D joins: B C A D, length 4." },
              { pointers: { left: 1, right: 5 }, range: [1, 4], highlight: [1, 5], line: 3, vars: { best: 4, "last[B]": 1 }, note: "B repeats; its last copy is at index 1.", pick: { prompt: "Where does `left` jump to now?", answer: 2 } },
              { pointers: { left: 2, right: 6 }, range: [2, 6], line: 6, vars: { best: 5 }, note: "`left = 2`, then E joins: C A D B E, length **5**. Each pointer only moved forward." },
            ],
          },
        },
        question: { type: "widget", goal: { picked: true }, prompt: "Answer both picks.", hint: "`left` moves to one past the earlier copy of the repeated song." },
        explanation: "On a repeat, the window must lose the earlier copy, so `left = last[x] + 1`. The check `last[x] >= left` matters: a copy that already left the window is not a repeat.",
      },
      {
        kind: "question",
        title: "Why it's still O(n)",
        body: "The general variable window has a `while` loop inside the `for` loop. Why is the total work O(n) and not O(n²)?",
        question: {
          type: "choice",
          options: ["The `while` loop runs at most once per item", "Python optimises nested loops", "`left` only moves forward, n times in total", "The window never grows past k"],
          answer: 2,
          feedback: { 0: "It can run many times for one item; it's the total over all items that's bounded.", 3: "A variable window can grow to the whole list." },
          hint: "Count how many times `left` can move across the whole run, not per item.",
        },
        explanation: "`left` starts at 0 and never moves back, so across the entire run it moves at most n times. Add `right`'s n moves: about 2n steps, **O(n)**.",
      },
      {
        kind: "question",
        title: "Where windows fail",
        body: "Which of these can **not** be solved with a plain sliding window?",
        question: {
          type: "choice",
          options: ["Longest stretch with at most 2 kinds of fruit", "Shortest slice of positive numbers with sum ≥ 50", "Biggest total over any 7 consecutive days", "Number of slices summing to 0, with negatives"],
          answer: 3,
          feedback: { 0: "Too many kinds? Shrink from the left until there are 2.", 1: "With positive numbers, shrinking only lowers the sum, so the rule holds.", 2: "A fixed window of size 7: add one day, drop one day." },
          hint: "Look for the one where adding an item can make the sum go either up or down.",
        },
        explanation: "With negative numbers, a too-big sum might shrink by adding more items, so there's no rule for when to move `left`. Counting slices that sum to a target with negatives is the **prefix sum + dict** pattern.",
      },
      {
        kind: "code",
        title: "Best k-day stretch",
        body: "Write `best_stretch(sales, k)`: the largest total of any `k` consecutive days (`1 <= k <= len(sales)`). Sales can be negative. Up to 100,000 days with k = 50,000, so slide a fixed window: don't re-add each window.",
        language: "python",
        starter: `def best_stretch(sales, k):
    window = sum(sales[:k])
    # slide: add sales[i], drop sales[i - k]
    pass
`,
        solution: `def best_stretch(sales, k):
    window = sum(sales[:k])
    best = window
    for i in range(k, len(sales)):
        window += sales[i] - sales[i - k]
        best = max(best, window)
    return best
`,
        tests: [
          { id: "t1", description: "Two-day windows", assertionCode: `_r = best_stretch([4, 2, -1, 6, 3], 2)\nassert _r == 9, f"6 + 3 = 9 is the best pair of days, got {_r}"` },
          { id: "t2", description: "All negative", assertionCode: `_r = best_stretch([-5, -2, -9], 2)\nassert _r == -7, f"-5 + -2 = -7 is the best: don't start best at 0, got {_r}"` },
          { id: "t3", description: "k = 1 and k = n", assertionCode: `_r = best_stretch([3, 8, 1], 1)\nassert _r == 8, f"k = 1 is the best single day: expected 8, got {_r}"\n_r = best_stretch([3, 8, 1], 3)\nassert _r == 12, f"k = n is the whole total: expected 12, got {_r}"` },
          { id: "t4", description: "100,000 days, k = 50,000", assertionCode: `_s = [(i * 37) % 101 - 50 for i in range(100000)]\n_r = best_stretch(_s, 50000)\nassert _r == 82, f"expected 82, got {_r}"` },
        ],
        hints: ["Start `best` at the first window's total, not at 0.", "For `i` from `k` on: `window += sales[i] - sales[i - k]`, then update `best`."],
      },
      {
        kind: "code",
        title: "No song twice",
        body: "Write `longest_unique(songs)`: the length of the longest stretch of consecutive songs with no song repeated. Use `last` (song → last index) and jump `left` past a repeat, but only if that copy is still inside the window.",
        language: "python",
        starter: `def longest_unique(songs):
    last, left, best = {}, 0, 0
    # for each right: jump left past a repeat inside the window, record, measure
    pass
`,
        solution: `def longest_unique(songs):
    last, left, best = {}, 0, 0
    for right, x in enumerate(songs):
        if x in last and last[x] >= left:
            left = last[x] + 1
        last[x] = right
        best = max(best, right - left + 1)
    return best
`,
        tests: [
          { id: "t1", description: "The traced playlist", assertionCode: `_r = longest_unique(["A", "B", "C", "A", "D", "B", "E"])\nassert _r == 5, f"C A D B E has length 5, got {_r}"` },
          { id: "t2", description: "Empty and all the same", assertionCode: `_r = longest_unique(["x"] * 5)\nassert _r == 1, f"one song on repeat: expected 1, got {_r}"\n_r = longest_unique([])\nassert _r == 0, f"no songs: expected 0, got {_r}"` },
          { id: "t3", description: "A copy outside the window is not a repeat", assertionCode: `_r = longest_unique(["a", "b", "b", "a"])\nassert _r == 2, f"expected 2 ('b a'), got {_r}. When the second 'a' arrives, the first is no longer in the window: left must not jump back"` },
          { id: "t4", description: "Repeats far apart", assertionCode: `_r = longest_unique(["a", "b", "a", "b", "c"])\nassert _r == 3, f"'a b c' at the end: expected 3, got {_r}"` },
          { id: "t5", description: "100,000 songs", assertionCode: `_r = longest_unique([i % 1000 for i in range(100000)])\nassert _r == 1000, f"1000 different songs on a loop: expected 1000, got {_r}"` },
        ],
        hints: ["`if x in last and last[x] >= left: left = last[x] + 1`.", "Always record `last[x] = right`, then `best = max(best, right - left + 1)`."],
      },
      {
        kind: "recap",
        points: [
          "A **sliding window** updates the answer as items enter and leave, instead of recomputing every slice.",
          "Fixed size k: `window += new - old`. Start `best` at the first window, not 0.",
          "Variable size: grow with `right`, shrink with `left` while the rule is broken. Both only move forward: O(n).",
          "Jump `left` with a last-seen dict, but never backwards: check `last[x] >= left`.",
          "Windows need a monotone rule; with negative numbers, reach for prefix sums.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 3. Stack ───────────────────────────────
  {
    id: "fnd-iv-pointers-3-stack",
    title: "Stacks: the most recent unfinished thing",
    summary: "Evaluate postfix expressions and normalise paths by pushing and popping.",
    minutes: 10,
    xp: 70,
    level: "Intermediate",
    steps: [
      {
        kind: "explain",
        title: "When the newest thing matters most",
        body: "A **stack** (last in, first out) is the right tool whenever the item you need next is the **most recent one that isn't finished yet**: the last opened bracket, the last folder you entered, the last number you read. (*Stacks and queues* in *Data structures and algorithms* covers push, pop and bracket matching.)\n\nTwo interview classics:\n\n- **Postfix (reverse Polish) expressions** like `4 2 3 * +`: numbers are pushed; an operator pops two numbers, combines them and pushes the result. No brackets or precedence rules needed.\n- **Paths** like `/home/kai/../docs`: each folder name is pushed, `..` pops, `.` and empty parts are skipped.\n\n**How to spot it:** *nested*, *matching*, *undo*, *backspace*, *evaluate*, *parse*, *simplify a path*, *decode* `3[ab]`.\n\n**Pitfalls:** popping an empty stack; operand order for `-` and `/` (the **first** pop is the **right-hand** operand); Python's `//` rounds down (`-7 // 2` is `-4`), while many problems want division that truncates towards zero.",
      },
      {
        kind: "question",
        title: "Evaluate 4 2 3 * + 5 -",
        body: "Numbers are pushed; an operator pops two values and pushes the result. Step through it and answer the pick.",
        widget: {
          type: "iv-trace",
          props: {
            title: "Postfix evaluation",
            frames: [
              { array: TOKENS, pointers: { tok: 0 }, highlight: [0], code: RPN_CODE, line: 6, stacks: [{ label: "stack", items: [4] }], note: "`4` is a number: push it." },
              { pointers: { tok: 2 }, highlight: [1, 2], done: [0], line: 6, stacks: [{ label: "stack", items: [4, 2, 3] }], note: "`2` and `3` are pushed too." },
              { done: [0, 1, 2], line: 2, note: "Keep reading tokens.", pick: { prompt: "Which token is the first one that pops values off the stack?", answer: 3 } },
              { pointers: { tok: 3 }, highlight: [3], done: [0, 1, 2], line: 4, stacks: [{ label: "stack", items: [4, 6] }], vars: { a: 3, b: 2 }, note: "`*` pops `a = 3`, then `b = 2`, and pushes `b * a = 6`." },
              { pointers: { tok: 4 }, highlight: [4], done: [0, 1, 2, 3], line: 4, stacks: [{ label: "stack", items: [10] }], vars: { a: 6, b: 4 }, note: "`+` pops 6 and 4 and pushes 10." },
              { pointers: { tok: 6 }, highlight: [5, 6], done: [0, 1, 2, 3, 4], line: 4, stacks: [{ label: "stack", items: [5] }], vars: { a: 5, b: 10 }, note: "Push 5, then `-` pops `a = 5`, `b = 10` and pushes `b - a = 5`. The answer is **5**." },
            ],
          },
        },
        question: { type: "widget", goal: { picked: true }, prompt: "Answer the pick.", hint: "Numbers are only pushed; look for the first operator." },
        explanation: "`*` at index 3 is the first operator. Each token is pushed or popped a constant number of times: O(n) time, and the stack never holds more than n values.",
      },
      {
        kind: "question",
        title: "Which way round?",
        body: "The stack holds `10` and then `5` (5 on top), and the next token is `-`. What gets pushed?",
        question: { type: "choice", options: ["-5", "15", "50", "5"], answer: 3, feedback: { 0: "That's 5 − 10: the first value popped is the right-hand side.", 1: "That's +, not −." }, hint: "The first pop is the value pushed last, and it goes on the right of the operator." },
        explanation: "`a = pop()` gives 5 and `b = pop()` gives 10; the expression was `10 5 -`, meaning 10 − 5 = **5**. Swapping them is the most common bug in this problem.",
      },
      {
        kind: "question",
        title: "How deep?",
        body: "While evaluating `1 2 3 4 + + +`, find the largest number of values on the stack at any moment.",
        question: { type: "number", answer: 4, unit: "values", hint: "All four numbers are pushed before the first operator arrives." },
        explanation: "All **4** numbers are on the stack before the first `+`; each `+` then takes the count down by one. The worst case is O(n) memory.",
      },
      {
        kind: "code",
        title: "A postfix calculator",
        body: "Write `evaluate(tokens)`: tokens are integer strings (possibly negative, like `\"-7\"`) and the operators `+ - * /`. Division **truncates towards zero**, so `-7 / 2` is `-3`. The expression is always valid.",
        language: "python",
        starter: `def evaluate(tokens):
    stack = []
    for tok in tokens:
        if tok in ("+", "-", "*", "/"):
            # pop a (right side) then b (left side); push the result
            pass
        else:
            stack.append(int(tok))
    return None
`,
        solution: `def evaluate(tokens):
    stack = []
    for tok in tokens:
        if tok in ("+", "-", "*", "/"):
            a = stack.pop()
            b = stack.pop()
            if tok == "+":
                stack.append(b + a)
            elif tok == "-":
                stack.append(b - a)
            elif tok == "*":
                stack.append(b * a)
            else:
                q = abs(b) // abs(a)
                stack.append(q if (a < 0) == (b < 0) else -q)
        else:
            stack.append(int(tok))
    return stack[-1]
`,
        tests: [
          { id: "t1", description: "The traced expression", assertionCode: `_r = evaluate(["4", "2", "3", "*", "+", "5", "-"])\nassert _r == 5, f"4 + 2 * 3 - 5 = 5, got {_r}"` },
          { id: "t2", description: "Operand order", assertionCode: `_r = evaluate(["3", "10", "-"])\nassert _r == -7, f"3 10 - means 3 - 10 = -7, got {_r}: the first pop is the right-hand side"` },
          { id: "t3", description: "Division truncates towards zero", assertionCode: `_r = evaluate(["7", "2", "/"])\nassert _r == 3, f"7 / 2 is 3, got {_r}"\n_r = evaluate(["-7", "2", "/"])\nassert _r == -3, f"-7 / 2 truncates to -3 (Python's // gives -4), got {_r}"\n_r = evaluate(["7", "-2", "/"])\nassert _r == -3, f"7 / -2 truncates to -3, got {_r}"` },
          { id: "t4", description: "A lone number and nesting", assertionCode: `_r = evaluate(["42"])\nassert _r == 42, f"a single number is its own value: expected 42, got {_r}"\n_r = evaluate(["2", "3", "4", "*", "5", "+", "*"])\nassert _r == 34, f"2 * (3 * 4 + 5) = 34, got {_r}"` },
        ],
        hints: ["`a = stack.pop()` then `b = stack.pop()`; the result is `b op a`.", "For `/`, divide the absolute values with `//`, then make it negative if exactly one of `a` and `b` is negative. Return `stack[-1]` at the end."],
      },
      {
        kind: "code",
        title: "Tidy a path",
        body: "Write `simplify(path)` for an absolute Unix path: split on `/`, skip empty parts and `.`, let `..` go up one folder (but never above `/`), and keep every other name, even `...`. Return the tidy path, which always starts with `/` and never ends with one (unless it is just `/`).\n\n" +
          py(`
simplify("/home//kai/./docs/../photos/")   # "/home/kai/photos"
`),
        language: "python",
        starter: `def simplify(path):
    stack = []
    for part in path.split("/"):
        # skip "" and ".", pop on "..", push names
        pass
    return None
`,
        solution: `def simplify(path):
    stack = []
    for part in path.split("/"):
        if part in ("", "."):
            continue
        if part == "..":
            if stack:
                stack.pop()
        else:
            stack.append(part)
    return "/" + "/".join(stack)
`,
        tests: [
          { id: "t1", description: "The example", assertionCode: `_r = simplify("/home//kai/./docs/../photos/")\nassert _r == "/home/kai/photos", f"expected '/home/kai/photos', got {_r!r}"` },
          { id: "t2", description: "Never above the root", assertionCode: `_r = simplify("/../")\nassert _r == "/", f"expected '/', got {_r!r}: '..' at the root stays at the root"\n_r = simplify("/a/b/../../..")\nassert _r == "/", f"expected '/', got {_r!r}"` },
          { id: "t3", description: "Three dots is a name", assertionCode: `_r = simplify("/.../x")\nassert _r == "/.../x", f"'...' is an ordinary folder name: expected '/.../x', got {_r!r}"` },
          { id: "t4", description: "Up and over", assertionCode: `_r = simplify("/a/./b/../../c/")\nassert _r == "/c", f"expected '/c', got {_r!r}"\n_r = simplify("/")\nassert _r == "/", f"the root stays '/', got {_r!r}"` },
        ],
        hints: ["`continue` on `\"\"` and `\".\"`; on `\"..\"` pop only if the stack isn't empty.", "Join the stack with `/` and put one `/` in front: `\"/\" + \"/\".join(stack)`."],
      },
      {
        kind: "recap",
        points: [
          "Use a **stack** when the next thing you need is the most recent unfinished one.",
          "Postfix: push numbers; an operator pops `a` (right) then `b` (left) and pushes `b op a`.",
          "Truncating division is not Python's `//` for negatives: divide absolute values and fix the sign.",
          "Paths: skip `\"\"` and `.`, pop on `..` (if anything is there), push names; join with `/`.",
          "Each item is pushed and popped at most once: O(n) time, O(n) memory.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 4. Monotonic Stack ───────────────────────────────
  {
    id: "fnd-iv-pointers-4-monotonic-stack",
    title: "Monotonic stacks: the next bigger thing",
    summary: "Keep a sorted stack of waiting indexes to find next-greater values and largest rectangles in O(n).",
    minutes: 13,
    xp: 80,
    level: "Advanced",
    steps: [
      {
        kind: "explain",
        title: "A stack of people still waiting",
        body: "\"For each day, how many days until a higher price?\" The brute force scans forward from every day: O(n²). A **monotonic stack** does it in one pass.\n\nKeep a stack of **indexes still waiting** for a higher price. Their prices are **decreasing** from bottom to top (a monotonic order). When a new price arrives, every waiting index on top with a *lower* price has just found its answer: pop it and record the distance. Then push the new day; it waits too.\n\nEach index is pushed once and popped at most once, so the whole thing is O(n), even with a `while` inside the `for`.\n\nVariants:\n\n- **Next smaller**: keep prices *increasing* and pop when the new one is smaller.\n- **Previous greater**: after popping, whatever is on top is the nearest bigger value to the left.\n- **Largest rectangle under a skyline**: an increasing stack; when a bar is popped, the new top and the current index are the first lower bars on each side, which gives its widest rectangle.\n\n**How to spot it:** *next greater / warmer / higher*, *how many days until*, *nearest smaller to the left*, *how many can it see*, *largest rectangle*.",
      },
      {
        kind: "question",
        title: "Days until a higher price",
        body: "Prices for 6 days. The stack keeps waiting days (shown as `index:price`); a higher price pops everything lower on top. Answer the picks.",
        widget: {
          type: "iv-trace",
          props: {
            title: "Next higher price",
            frames: [
              { array: DAYS, pointers: { i: 1 }, highlight: [1], code: NGE_CODE, line: 6, stacks: st(["0:5", "1:3"]), vars: { res: "[0, 0, 0, 0, 0, 0]" }, note: "Day 0 waits. Day 1 (3) isn't higher than 5, so it waits on top." },
              { pointers: { i: 2 }, highlight: [2], line: 3, note: "Day 2 has price 4.", pick: { prompt: "Which day gets its answer when 4 arrives?", answer: 1 } },
              { pointers: { i: 3 }, highlight: [3], done: [1], line: 6, stacks: st(["0:5", "2:4", "3:2"]), vars: { res: "[0, 1, 0, 0, 0, 0]" }, note: "Day 1 popped with answer `2 - 1 = 1`; 4 is below 5, so day 2 waits. Day 3 (2) waits too. Prices on the stack go down: 5, 4, 2." },
              { pointers: { i: 4 }, highlight: [4], done: [1], line: 3, note: "Day 4 has price 6, higher than everything waiting.", pick: { prompt: "Pops come off the top first. Which day is popped **last**?", answer: 0 } },
              { pointers: { i: 5 }, highlight: [5], done: [0, 1, 2, 3], line: 6, stacks: st(["4:6", "5:1"]), vars: { res: "[4, 1, 2, 1, 0, 0]" }, note: "6 popped days 3, 2, 0 (answers 1, 2, 4). Day 5 (1) waits on top of day 4. Nobody is left to pop them, so they keep 0: **[4, 1, 2, 1, 0, 0]**." },
            ],
          },
        },
        question: { type: "widget", goal: { picked: true }, prompt: "Answer both picks.", hint: "A waiting day is popped as soon as a strictly higher price arrives; the stack is popped from the top down." },
        explanation: "4 beats only day 1's price of 3. Then 6 beats 2, 4 and 5, popping from the top: day 3, day 2, and last day 0. Every index goes on and comes off once: O(n).",
      },
      {
        kind: "question",
        title: "Why one pass is enough",
        body: "The loop has a `while` that can pop many indexes for one new price. Why is the total still O(n)?",
        question: {
          type: "choice",
          options: ["The stack never holds more than 2 items", "Each index is pushed once and popped at most once", "The `while` stops after the first pop", "Prices are bounded, so the stack is small"],
          answer: 1,
          feedback: { 0: "On falling prices the stack holds every day.", 2: "It keeps popping while the top is lower." },
          hint: "Count the pushes and pops over the whole run instead of per step.",
        },
        explanation: "n pushes and at most n pops in total, so at most 2n stack operations: **O(n)**. This *amortised* argument is the key to every monotonic stack.",
      },
      {
        kind: "question",
        title: "Next smaller instead",
        body: "Now you want, for each day, the next day with a **lower** price. How should the waiting prices be ordered on the stack, from bottom to top?",
        question: {
          type: "choice",
          options: ["Decreasing, as before", "Increasing from bottom to top", "Sorted by index only", "In any order, as long as you scan right to left"],
          answer: 1,
          feedback: { 0: "That order finds the next *greater* value.", 2: "Indexes are always increasing on the stack; it's the prices that matter." },
          hint: "A waiting day is popped by a lower price. What does the stack look like if nothing has been popped?",
        },
        explanation: "Pop while the top's price is **greater** than the new one; what remains is increasing from bottom to top. Flip the comparison and you flip the order.",
      },
      {
        kind: "code",
        title: "Days until a higher price",
        body: "Write `wait_for_higher(prices)`: for each day, how many days until a **strictly** higher price, or 0 if none comes. Up to 50,000 days, and falling prices make the brute force quadratic.",
        language: "python",
        starter: `def wait_for_higher(prices):
    res, stack = [0] * len(prices), []   # stack holds waiting indexes
    # pop every waiting index with a lower price, then push i
    pass
`,
        solution: `def wait_for_higher(prices):
    res, stack = [0] * len(prices), []
    for i, x in enumerate(prices):
        while stack and prices[stack[-1]] < x:
            j = stack.pop()
            res[j] = i - j
        stack.append(i)
    return res
`,
        tests: [
          { id: "t1", description: "The traced prices", assertionCode: `_r = wait_for_higher([5, 3, 4, 2, 6, 1])\nassert _r == [4, 1, 2, 1, 0, 0], f"expected [4, 1, 2, 1, 0, 0], got {_r}"` },
          { id: "t2", description: "Equal is not higher", assertionCode: `_r = wait_for_higher([3, 3, 3])\nassert _r == [0, 0, 0], f"an equal price doesn't count: expected [0, 0, 0], got {_r}"\n_r = wait_for_higher([1, 2, 3])\nassert _r == [1, 1, 0], f"rising prices: expected [1, 1, 0], got {_r}"` },
          { id: "t3", description: "Mixed, and empty", assertionCode: `_r = wait_for_higher([7, 1, 5, 3, 6, 4, 8])\nassert _r == [6, 1, 2, 1, 2, 1, 0], f"expected [6, 1, 2, 1, 2, 1, 0], got {_r}"\nassert wait_for_higher([]) == [], "no days: expected []"` },
          { id: "t4", description: "50,000 falling days", assertionCode: `_p = list(range(50000, 0, -1)) + [10**6]\n_r = wait_for_higher(_p)\n_want = [50000 - i for i in range(50000)] + [0]\nassert _r == _want, "every falling day waits for the final peak" if _r is not None and len(_r) == len(_want) else f"expected {len(_want)} answers, got {None if _r is None else len(_r)}"` },
        ],
        hints: ["`while stack and prices[stack[-1]] < x:` pop `j` and set `res[j] = i - j`.", "After the while loop, push `i`; return `res` at the end."],
      },
      {
        kind: "code",
        title: "The widest banner",
        body: "A street has buildings of width 1 and the given `heights`. A rectangular banner hangs flat against the fronts, touching the ground, and can't stick out above any building it covers. Write `largest_banner(heights)`: the largest area.\n\n" +
          txt(`
heights 5 4 1 6 6 6 2   ->  18  (height 6 across the three 6s)
`) +
          "\nKeep an **increasing** stack of indexes. When a lower bar (or the end) arrives, pop each taller bar `j`: its rectangle spans from just after the new stack top to just before `i`, so its width is `i - (stack[-1] + 1)`, or `i` if the stack is empty. Up to 50,000 buildings.",
        language: "python",
        starter: `def largest_banner(heights):
    stack, best = [], 0
    for i in range(len(heights) + 1):
        h = heights[i] if i < len(heights) else 0   # a 0 at the end flushes the stack
        # pop taller bars, measure each one's widest rectangle, then push i
        pass
    return None
`,
        solution: `def largest_banner(heights):
    stack, best = [], 0
    for i in range(len(heights) + 1):
        h = heights[i] if i < len(heights) else 0
        while stack and heights[stack[-1]] >= h:
            j = stack.pop()
            left = stack[-1] + 1 if stack else 0
            best = max(best, heights[j] * (i - left))
        stack.append(i)
    return best
`,
        tests: [
          { id: "t1", description: "Three tall buildings", assertionCode: `_r = largest_banner([5, 4, 1, 6, 6, 6, 2])\nassert _r == 18, f"height 6 across three buildings: expected 18, got {_r}"` },
          { id: "t2", description: "A wide low banner can win", assertionCode: `_r = largest_banner([3, 1, 4, 4, 2, 5])\nassert _r == 8, f"expected 8 (4 x 2, or 2 x 4), got {_r}"\n_r = largest_banner([2, 2, 2, 2])\nassert _r == 8, f"equal heights: 2 x 4 = 8, got {_r}"` },
          { id: "t3", description: "One building, none, and zeros", assertionCode: `_r = largest_banner([7])\nassert _r == 7, f"one building: expected 7, got {_r}"\nassert largest_banner([]) == 0, "no buildings: expected 0"\nassert largest_banner([0, 0]) == 0, "zero heights: expected 0"` },
          { id: "t4", description: "Rising heights", assertionCode: `_r = largest_banner([1, 2, 3, 4, 5])\nassert _r == 9, f"3 x 3 from the last three: expected 9, got {_r}"` },
          { id: "t5", description: "50,000 buildings", assertionCode: `_r = largest_banner(list(range(1, 50001)))\nassert _r == 625025000, f"expected 625025000, got {_r}"` },
        ],
        hints: ["Pop while `heights[stack[-1]] >= h`; the popped bar `j` is the shortest in its rectangle.", "Its left edge is `stack[-1] + 1` after the pop (or 0 if the stack is empty) and its right edge is `i - 1`, so the area is `heights[j] * (i - left)`."],
      },
      {
        kind: "recap",
        points: [
          "A **monotonic stack** holds indexes still waiting for an answer, kept in sorted order of value.",
          "Next greater: keep values decreasing; a bigger arrival pops and answers everything lower. Next smaller: the reverse.",
          "Each index is pushed once and popped once: O(n), however many pops one step does.",
          "Largest rectangle: an increasing stack; a popped bar spans from the new top + 1 to the current index − 1.",
          "Push a sentinel (a 0 height, or a final pass) to flush whatever is still waiting.",
        ],
      },
    ],
  },
];
