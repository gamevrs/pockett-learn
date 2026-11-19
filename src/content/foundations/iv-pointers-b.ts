import type { ConceptLesson } from "../../learn/types.ts";

/** Fenced Python block for lesson prose. */
const py = (code: string) => "~~~python\n" + code.trim() + "\n~~~";
/** Fenced plain-text block (diagrams, tables). */
const txt = (code: string) => "~~~text\n" + code.replace(/^\n+|\s+$/g, "") + "\n~~~";

const RING_CODE = ["def push(x):", "    if count == cap: return False", "    buf[(head + count) % cap] = x; count += 1", "def pop():", "    x = buf[head]; head = (head + 1) % cap; count -= 1", "    return x"];

const WMAX_CODE = ["for i, x in enumerate(nums):", "    while dq and nums[dq[-1]] <= x: dq.pop()", "    dq.append(i)", "    if dq[0] <= i - k: dq.popleft()", "    if i >= k - 1: out.append(nums[dq[0]])"];
const WNUMS = [4, 2, 12, 3, 8, 5, 1];
const dq = (items: string[]) => [{ label: "deque (index:value)", items, kind: "queue" as const }];

const REV_CODE = ["prev, cur = None, head", "while cur:", "    nxt = cur.next", "    cur.next = prev", "    prev, cur = cur, nxt", "return prev"];
const ROW = [
  { id: "1", x: 14, y: 50 },
  { id: "2", x: 38, y: 50 },
  { id: "3", x: 62, y: 50 },
  { id: "4", x: 86, y: 50 },
];

const UNLINK_CODE = ["def unlink(b):", "    b.prev.next = b.next", "    b.next.prev = b.prev", "    b.prev = b.next = None"];
const DLL_NODES = [
  { id: "H", x: 8, y: 36 },
  { id: "A", x: 30, y: 36 },
  { id: "B", x: 50, y: 80 },
  { id: "C", x: 70, y: 36 },
  { id: "T", x: 92, y: 36 },
];
const E = (pairs: string[]) => pairs.map((p) => [p[0], p[1]] as [string, string]);
const ENDS = ["HA", "AH", "CT", "TC"];

/** Hidden helpers for the singly linked list code steps (shown to the learner in the body). */
const LIST_SETUP = `class ListNode:
    def __init__(self, val, next=None):
        self.val = val
        self.next = next

def build(values):
    head = None
    for v in reversed(values):
        head = ListNode(v, head)
    return head

def to_list(head):
    out = []
    while head is not None:
        out.append(head.val)
        assert len(out) <= 1000000, "the list never ends: some node points back at an earlier one"
        head = head.next
    return out
`;

/** Hidden helpers for the doubly linked list code steps. */
const DLL_SETUP = `class Node:
    def __init__(self, val=None):
        self.val = val
        self.prev = None
        self.next = None

def make(values):
    head, tail = Node("HEAD"), Node("TAIL")
    head.next, tail.prev = tail, head
    for v in values:
        n = Node(v)
        n.prev, n.next = tail.prev, tail
        tail.prev.next = n
        tail.prev = n
    return head, tail

def forward(head):
    out, n = [], head.next
    while n is not None and n.next is not None:
        out.append(n.val)
        assert len(out) <= 1000000, "following next never reaches the tail"
        n = n.next
    return out

def backward(tail):
    out, n = [], tail.prev
    while n is not None and n.prev is not None:
        out.append(n.val)
        assert len(out) <= 1000000, "following prev never reaches the head"
        n = n.prev
    return out
`;

export const ivPointersLessonsB: ConceptLesson[] = [
  // ─────────────────────────────── 5. Queue ───────────────────────────────
  {
    id: "fnd-iv-pointers-5-queue",
    title: "Queues: rings and recent windows",
    summary: "First in, first out with a fixed ring buffer, and a deque that forgets old events.",
    minutes: 11,
    xp: 70,
    level: "Advanced",
    steps: [
      {
        kind: "explain",
        title: "Oldest first",
        body: "A **queue** serves items in arrival order: first in, first out. In Python use `collections.deque`: `append` and `popleft` are both O(1), while `list.pop(0)` shifts every item, O(n). (The basics are in *Stacks and queues* in *Data structures and algorithms*; breadth-first search, the most famous queue user, is in the graphs and trees modules.)\n\nTwo interview patterns:\n\n- **Ring buffer**: a queue with a **fixed capacity** stored in a plain array. Keep `head` (the oldest item) and `count`; the next free slot is `(head + count) % cap`. Indexes wrap round, so nothing ever shifts. Logs, audio buffers and network cards work this way.\n- **Recent window**: events arrive in time order; keep them in a deque and `popleft` the ones that have become too old. Each event is added once and removed once, so the work is O(1) on average per event.\n\n**How to spot it:** *in the order they arrive*, *first come, first served*, *in the last N seconds*, *fixed-size buffer*, *round by round*.\n\n**Pitfalls:** with only `head` and `tail`, a full ring and an empty ring look the same; keep a `count`. And drop old events from the **front** only, because that's where the oldest are.",
      },
      {
        kind: "question",
        title: "Round the ring",
        body: "A ring buffer with 5 slots. Push `a b c`, pop once, then push `d e f`. Predict where `f` lands.",
        widget: {
          type: "iv-trace",
          props: {
            title: "A ring buffer, capacity 5",
            frames: [
              { array: ["a", "b", "c", null, null], pointers: { head: 0 }, highlight: [0, 1, 2], code: RING_CODE, line: 3, vars: { head: 0, count: 3 }, note: "Three pushes fill slots 0, 1 and 2." },
              { array: [null, "b", "c", null, null], pointers: { head: 1 }, done: [0], line: 5, vars: { head: 1, count: 2 }, note: "Pop returns `a`, the oldest, and `head` moves to 1. Nothing shifts." },
              { array: [null, "b", "c", "d", "e"], pointers: { head: 1 }, highlight: [3, 4], line: 3, vars: { head: 1, count: 4 }, note: "`d` and `e` go in slots `(1 + 2) % 5 = 3` and `(1 + 3) % 5 = 4`." },
              { pointers: { head: 1 }, line: 3, note: "Now push `f`.", pick: { prompt: "Which slot does `f` go into?", answer: 0 } },
              { array: ["f", "b", "c", "d", "e"], pointers: { head: 1 }, highlight: [0], line: 3, vars: { head: 1, count: 5 }, note: "`(1 + 4) % 5 = 0`: it wraps round to the front. Now `count == cap`, so the next push returns False." },
            ],
          },
        },
        question: { type: "widget", goal: { picked: true }, prompt: "Answer the pick.", hint: "The next slot is (head + count) % capacity." },
        explanation: "With `head = 1` and `count = 4`, the next slot is (1 + 4) % 5 = 0. The `%` lets the queue run forever in the same 5 slots, and the oldest item is still `b`, at `head`.",
      },
      {
        kind: "question",
        title: "Where does it go?",
        body: "A ring buffer has capacity 8, `head = 6` and `count = 5`. At which index will the next push be written?",
        question: { type: "number", answer: 3, hint: "Compute (head + count) % capacity." },
        explanation: "(6 + 5) % 8 = 11 % 8 = **3**. The items live in slots 6, 7, 0, 1, 2, so slot 3 is the first free one.",
      },
      {
        kind: "question",
        title: "Forget from the front",
        body: "A counter keeps request times in a deque and, on each new request, drops the ones that are too old. Why is it enough to drop from the **front** only?",
        question: {
          type: "choice",
          options: ["Times arrive in order, so the oldest are at the front", "Deques can only remove from the front", "Old requests are rare, so it doesn't matter", "The back holds the oldest requests"],
          answer: 0,
          feedback: { 1: "A deque removes from both ends in O(1).", 3: "New requests join at the back." },
          hint: "Which end holds the earliest time?",
        },
        explanation: "Because times only increase, the deque is sorted: everything too old forms a block at the **front**. Pop from the front until the front is recent enough, and stop. Each request is popped once, so it's O(1) amortised.",
      },
      {
        kind: "code",
        title: "A ring buffer",
        body: "Finish `RingBuffer`. It stores up to `capacity` items in the fixed list `self.buf` (don't grow it):\n\n- `push(x)`: add at the back; return `True`, or `False` if it's full;\n- `pop()`: remove and return the oldest item, or `None` if empty;\n- `size()`: how many items it holds.",
        language: "python",
        starter: `class RingBuffer:
    def __init__(self, capacity):
        self.buf = [None] * capacity
        self.head = 0      # index of the oldest item
        self.count = 0     # how many items are stored

    def push(self, x):
        pass

    def pop(self):
        pass

    def size(self):
        pass
`,
        solution: `class RingBuffer:
    def __init__(self, capacity):
        self.buf = [None] * capacity
        self.head = 0
        self.count = 0

    def push(self, x):
        if self.count == len(self.buf):
            return False
        self.buf[(self.head + self.count) % len(self.buf)] = x
        self.count += 1
        return True

    def pop(self):
        if self.count == 0:
            return None
        x = self.buf[self.head]
        self.buf[self.head] = None
        self.head = (self.head + 1) % len(self.buf)
        self.count -= 1
        return x

    def size(self):
        return self.count
`,
        tests: [
          { id: "t1", description: "Oldest first", assertionCode: `_rb = RingBuffer(5)\nfor _x in "abc":\n    assert _rb.push(_x) is True, "push should return True while there is room"\n_out = [_rb.pop(), _rb.pop()]\nassert _out == ["a", "b"], f"pop should give the oldest items first: expected ['a', 'b'], got {_out}"\nassert _rb.size() == 1, f"one item left: expected size 1, got {_rb.size()}"` },
          { id: "t2", description: "Full and empty", assertionCode: `_rb = RingBuffer(2)\nassert _rb.push(1) is True and _rb.push(2) is True, "two pushes fit in capacity 2"\nassert _rb.push(3) is False, "a full buffer should refuse a push (return False)"\nassert _rb.pop() == 1 and _rb.pop() == 2, "pops should give 1 then 2"\nassert _rb.pop() is None, "pop on an empty buffer should return None"` },
          { id: "t3", description: "Wrapping round many times", assertionCode: `_rb = RingBuffer(3)\n_rb.push(0)\nfor _i in range(1, 1000):\n    assert _rb.push(_i) is True, f"push {_i} should fit"\n    _x = _rb.pop()\n    assert _x == _i - 1, f"expected {_i - 1}, got {_x}"\nassert len(_rb.buf) == 3, f"the buffer should keep its 3 slots, but now has {len(_rb.buf)}"` },
          { id: "t4", description: "Capacity 1", assertionCode: `_rb = RingBuffer(1)\nassert _rb.push("x") is True and _rb.push("y") is False, "capacity 1 holds one item"\nassert _rb.pop() == "x" and _rb.push("y") is True and _rb.pop() == "y", "after a pop there's room again"\nassert _rb.size() == 0, "empty again: size 0"` },
        ],
        hints: ["Full means `self.count == len(self.buf)`; the free slot is `(self.head + self.count) % len(self.buf)`.", "`pop` reads `self.buf[self.head]`, then moves `head` forward with `% len(self.buf)` and lowers `count`."],
      },
      {
        kind: "code",
        title: "Hits in the last window",
        body: "Write `RecentLog(window)` with a method `hit(t)`: record a hit at time `t` (times never go down) and return how many recorded hits, including this one, are **recent**: a hit at time `s` is recent if `t - s < window`. Up to 200,000 hits, so use a deque and drop old hits from the front.",
        language: "python",
        starter: `from collections import deque

class RecentLog:
    def __init__(self, window):
        self.window = window
        self.times = deque()

    def hit(self, t):
        # add t, drop old hits from the front, return how many are left
        pass
`,
        solution: `from collections import deque

class RecentLog:
    def __init__(self, window):
        self.window = window
        self.times = deque()

    def hit(self, t):
        self.times.append(t)
        while t - self.times[0] >= self.window:
            self.times.popleft()
        return len(self.times)
`,
        tests: [
          { id: "t1", description: "A 1000 ms window", assertionCode: `_log = RecentLog(1000)\n_r = [_log.hit(t) for t in [1, 500, 1000, 1001, 2500]]\nassert _r == [1, 2, 3, 3, 1], f"expected [1, 2, 3, 3, 1], got {_r}. At 1001 the hit at 1 is exactly 1000 old, which no longer counts"` },
          { id: "t2", description: "Hits at the same time", assertionCode: `_log = RecentLog(10)\n_r = [_log.hit(t) for t in [5, 5, 5, 15]]\nassert _r == [1, 2, 3, 1], f"expected [1, 2, 3, 1], got {_r}"` },
          { id: "t3", description: "A window of 1", assertionCode: `_log = RecentLog(1)\n_r = [_log.hit(t) for t in [1, 2, 2, 3]]\nassert _r == [1, 1, 2, 1], f"only hits at the same instant count: expected [1, 1, 2, 1], got {_r}"` },
          { id: "t4", description: "200,000 hits", assertionCode: `_log = RecentLog(100000)\n_r = [_log.hit(t) for t in range(200000)]\nassert _r is not None and _r[99999] == 100000 and _r[-1] == 100000 and _r[5] == 6, f"expected counts that grow to 100000 and stay there, got {_r[5]}, {_r[99999]}, {_r[-1]}"` },
        ],
        hints: ["Append `t` first, so the deque is never empty when you look at `self.times[0]`.", "`while t - self.times[0] >= self.window: self.times.popleft()`, then return `len(self.times)`."],
      },
      {
        kind: "recap",
        points: [
          "A **queue** serves oldest first; use `deque` (`append`, `popleft`), never `list.pop(0)`.",
          "**Ring buffer**: a fixed array, `head` and `count`; the next slot is `(head + count) % cap`. Keep a count so full and empty differ.",
          "**Recent window**: events arrive in time order, so drop stale ones from the front; each is added and removed once.",
          "Be exact about the boundary: is something exactly `window` old still recent? Test it.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 6. Monotonic Queue ───────────────────────────────
  {
    id: "fnd-iv-pointers-6-monotonic-queue",
    title: "Monotonic queues: the max of every window",
    summary: "A deque of candidates, sorted by value, gives each window's maximum in O(1) amortised.",
    minutes: 13,
    xp: 80,
    level: "Advanced",
    steps: [
      {
        kind: "explain",
        title: "Only keep candidates",
        body: "\"What is the maximum of every window of k items?\" Recomputing `max` for each window costs O(n·k). A **monotonic queue** does it in O(n).\n\nKeep a deque of **indexes** whose values are **decreasing** from front to back. They are the only items that could still become a window's maximum:\n\n1. When `x` arrives, pop from the **back** every index whose value is `<= x`. They are older *and* not bigger, so they can never be a maximum again while `x` is in the window.\n2. Push `x`'s index at the back.\n3. If the index at the **front** has slid out of the window (`<= i - k`), pop it from the front.\n4. The front is now the maximum of the current window.\n\nEach index enters and leaves once: O(n) time, O(k) memory. For window minimums, flip the comparison. Two deques (one for max, one for min) let a **variable** window check `max - min` as it slides.\n\n**How to spot it:** *maximum / minimum of every window*, *longest stretch where max − min ≤ limit*, a DP step that needs *the best of the last k values*.\n\n**Pitfall:** store **indexes**, not values; otherwise you can't tell when the front has left the window.",
      },
      {
        kind: "question",
        title: "Window maximum, k = 3",
        body: "The deque shows `index:value`, front first. Step through and answer the picks.",
        widget: {
          type: "iv-trace",
          props: {
            title: "Sliding window maximum",
            frames: [
              { array: WNUMS, pointers: { i: 1 }, range: [0, 1], code: WMAX_CODE, line: 3, stacks: dq(["0:4", "1:2"]), vars: { out: "[]" }, note: "4, then 2: 2 is smaller, so it joins the back. Values decrease front to back." },
              { pointers: { i: 2 }, range: [0, 2], highlight: [2], line: 5, stacks: dq(["2:12"]), vars: { out: "[12]" }, note: "12 pops both from the back: they can never beat 12 again. The first full window's max is **12**." },
              { pointers: { i: 3 }, range: [1, 3], line: 5, stacks: dq(["2:12", "3:3"]), vars: { out: "[12, 12]" }, note: "3 waits behind 12. Max still 12." },
              { pointers: { i: 4 }, range: [2, 4], highlight: [4], line: 2, note: "8 arrives.", pick: { prompt: "Which index does 8 pop from the back of the deque?", answer: 3 } },
              { pointers: { i: 4 }, range: [2, 4], line: 5, stacks: dq(["2:12", "4:8"]), vars: { out: "[12, 12, 12]" }, note: "3 is gone; 8 waits behind 12, which is still in the window." },
              { pointers: { i: 5 }, range: [3, 5], highlight: [5], line: 4, stacks: dq(["2:12", "4:8", "5:5"]), note: "5 joins the back. Now the window is indexes 3 to 5.", pick: { prompt: "Which index has slid out and leaves from the front?", answer: 2 } },
              { pointers: { i: 6 }, range: [4, 6], done: [0, 1, 2, 3], line: 5, stacks: dq(["4:8", "5:5", "6:1"]), vars: { out: "[12, 12, 12, 8, 8]" }, note: "12 left from the front; 8 is the max of the last two windows: **[12, 12, 12, 8, 8]**." },
            ],
          },
        },
        question: { type: "widget", goal: { picked: true }, prompt: "Answer both picks.", hint: "The back loses every value that isn't bigger than the newcomer; the front loses an index once it is i − k or less." },
        explanation: "8 pops index 3 (value 3) because a smaller, older value can never be a maximum again. At i = 5 the window starts at 3, so index 2 (the 12) is out. Each index is pushed and popped once.",
      },
      {
        kind: "question",
        title: "Indexes, not values",
        body: "Why does the deque store indexes instead of the values themselves?",
        question: {
          type: "choice",
          options: ["Indexes use less memory than values", "To tell when the front has left the window", "Values can't be compared in a deque", "So the output comes out sorted"],
          answer: 1,
          feedback: { 0: "Both are one entry each; memory isn't the reason.", 3: "The output follows the windows' order, not sorted order." },
          hint: "What does step 3, the check on the front, need to know?",
        },
        explanation: "The front must leave once its position is `<= i - k`, and only an index tells you its position. With repeated values, a value alone can't say which copy it is.",
      },
      {
        kind: "question",
        title: "How many windows?",
        body: "For 10 numbers and k = 4, how many maximums does the function return?",
        question: { type: "number", answer: 7, unit: "maximums", hint: "Windows start at index 0, 1, … up to the last start that still fits 4 items." },
        explanation: "The last window starts at 10 − 4 = 6, so starts 0 to 6 give **7** windows: n − k + 1.",
      },
      {
        kind: "code",
        title: "Window maximums",
        body: "Write `window_max(nums, k)`: the list of maximums of every window of `k` consecutive numbers (`1 <= k <= len(nums)`). Up to 100,000 numbers with k = 50,000, so calling `max` on every window is far too slow.",
        language: "python",
        starter: `from collections import deque

def window_max(nums, k):
    dq, out = deque(), []   # dq holds indexes; their values decrease front to back
    # for each i: pop smaller-or-equal from the back, push i,
    # drop the front if it left the window, record nums[dq[0]]
    pass
`,
        solution: `from collections import deque

def window_max(nums, k):
    dq, out = deque(), []
    for i, x in enumerate(nums):
        while dq and nums[dq[-1]] <= x:
            dq.pop()
        dq.append(i)
        if dq[0] <= i - k:
            dq.popleft()
        if i >= k - 1:
            out.append(nums[dq[0]])
    return out
`,
        tests: [
          { id: "t1", description: "The traced example", assertionCode: `_r = window_max([4, 2, 12, 3, 8, 5, 1], 3)\nassert _r == [12, 12, 12, 8, 8], f"expected [12, 12, 12, 8, 8], got {_r}"` },
          { id: "t2", description: "k = 1 and k = n", assertionCode: `_r = window_max([3, -1, 2], 1)\nassert _r == [3, -1, 2], f"k = 1 gives the numbers themselves: expected [3, -1, 2], got {_r}"\n_r = window_max([3, -1, 2], 3)\nassert _r == [3], f"k = n gives one maximum: expected [3], got {_r}"` },
          { id: "t3", description: "Repeated values", assertionCode: `_r = window_max([5, 5, 5, 1], 2)\nassert _r == [5, 5, 5], f"expected [5, 5, 5], got {_r}"` },
          { id: "t4", description: "The front expires", assertionCode: `_r = window_max([9, 1, 2, 3, 4], 2)\nassert _r == [9, 2, 3, 4], f"9 must leave once it slides out: expected [9, 2, 3, 4], got {_r}"` },
          { id: "t5", description: "100,000 falling numbers", assertionCode: `_n = list(range(100000, 0, -1))\n_r = window_max(_n, 50000)\n_want = [100000 - i for i in range(50001)]\nassert _r == _want, "wrong maximums on the big input" if _r is not None and len(_r) == len(_want) else f"expected {len(_want)} maximums, got {None if _r is None else len(_r)}"` },
        ],
        hints: ["`while dq and nums[dq[-1]] <= x: dq.pop()`, then `dq.append(i)`.", "`if dq[0] <= i - k: dq.popleft()`; once `i >= k - 1`, append `nums[dq[0]]`."],
      },
      {
        kind: "code",
        title: "The calmest stretch",
        body: "A thermometer logs `temps`. Write `longest_calm(temps, limit)`: the length of the longest run of consecutive readings whose highest and lowest differ by **at most** `limit`.\n\nUse a sliding window with **two** monotonic deques: one with decreasing values (its front is the window max) and one with increasing values (its front is the min). While `max - min > limit`, move `left` forward and drop fronts that fall out. Up to 50,000 readings.",
        language: "python",
        starter: `from collections import deque

def longest_calm(temps, limit):
    hi, lo = deque(), deque()   # indexes: hi values decrease, lo values increase
    left = best = 0
    # for each right: update both deques, shrink while max - min > limit, measure
    pass
`,
        solution: `from collections import deque

def longest_calm(temps, limit):
    hi, lo = deque(), deque()
    left = best = 0
    for right, x in enumerate(temps):
        while hi and temps[hi[-1]] < x:
            hi.pop()
        hi.append(right)
        while lo and temps[lo[-1]] > x:
            lo.pop()
        lo.append(right)
        while temps[hi[0]] - temps[lo[0]] > limit:
            left += 1
            if hi[0] < left:
                hi.popleft()
            if lo[0] < left:
                lo.popleft()
        best = max(best, right - left + 1)
    return best
`,
        tests: [
          { id: "t1", description: "A short log", assertionCode: `_r = longest_calm([3, 9, 6, 7, 2, 4], 3)\nassert _r == 3, f"9, 6, 7 spans 3: expected 3, got {_r}"` },
          { id: "t2", description: "A longer calm run", assertionCode: `_r = longest_calm([1, 5, 6, 7, 8, 10, 6, 5, 6], 4)\nassert _r == 5, f"6, 7, 8, 10, 6 spans 4: expected 5, got {_r}"` },
          { id: "t3", description: "Limit 0 means equal readings", assertionCode: `_r = longest_calm([1, 2, 2, 2, 3, 3], 0)\nassert _r == 3, f"three 2s in a row: expected 3, got {_r}"\n_r = longest_calm([4, 4, 4], 0)\nassert _r == 3, f"all equal: expected 3, got {_r}"` },
          { id: "t4", description: "One reading, and none", assertionCode: `_r = longest_calm([5], 0)\nassert _r == 1, f"a single reading is calm: expected 1, got {_r}"\n_r = longest_calm([], 3)\nassert _r == 0, f"no readings: expected 0, got {_r}"` },
          { id: "t5", description: "Negative temperatures", assertionCode: `_r = longest_calm([-3, -1, -4, 2, 0, 1], 3)\nassert _r == 3, f"-3, -1, -4 and 2, 0, 1 both span 3: expected 3, got {_r}"` },
          { id: "t6", description: "50,000 readings", assertionCode: `_r = longest_calm([i % 10 for i in range(50000)], 9)\nassert _r == 50000, f"every reading is within 0..9: expected 50000, got {_r}"\n_r = longest_calm([i % 10 for i in range(50000)], 8)\nassert _r == 9, f"with limit 8 a run can't hold both 0 and 9: expected 9, got {_r}"` },
        ],
        hints: ["Keep `hi` decreasing (pop while the back is smaller than x) and `lo` increasing (pop while the back is bigger).", "While `temps[hi[0]] - temps[lo[0]] > limit`: `left += 1`, and pop each front whose index is now below `left`."],
      },
      {
        kind: "recap",
        points: [
          "A **monotonic queue** is a deque of candidate indexes kept in sorted order of value.",
          "Window max: pop the back while it's `<=` the newcomer, push, drop the front once it's `<= i - k`; the front is the max.",
          "Every index enters and leaves once: O(n) for all windows, instead of O(n·k).",
          "Store indexes so you know when the front expires. Flip the comparison for minimums.",
          "Two deques (max and min) let a variable window check `max − min` in O(1) as it slides.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 7. Linked List ───────────────────────────────
  {
    id: "fnd-iv-pointers-7-linked-list",
    title: "Linked lists: re-pointing arrows",
    summary: "Reverse in place, merge with a dummy head, and use fast and slow pointers for middles and loops.",
    minutes: 13,
    xp: 80,
    level: "Advanced",
    steps: [
      {
        kind: "explain",
        title: "Three tools for every list problem",
        body: "A singly **linked list** is a chain of nodes, each with a `val` and a `next` pointer (see *Arrays and linked lists* in *Data structures and algorithms*). Interview list problems are about re-pointing arrows **in place** with O(1) extra memory. Three tools cover almost all of them:\n\n- **Save before you re-point.** To reverse, keep `prev` and `cur`; save `nxt = cur.next` before writing `cur.next = prev`, or the rest of the list is lost.\n- **A dummy head.** When the head itself might change (merging, deleting), start with a fake node `dummy` and build after it; return `dummy.next`. No special case for the first node.\n- **Fast and slow pointers.** Move `slow` one step and `fast` two. When `fast` reaches the end, `slow` is in the **middle**. If the list has a **loop**, `fast` laps `slow` and they meet (Floyd's cycle detection).\n\n" +
          py(`
slow = fast = head
while fast and fast.next:        # check both before jumping two
    slow, fast = slow.next, fast.next.next
`) +
          "\n**How to spot it:** *linked list*, *in place*, *O(1) memory*, *reverse*, *middle*, *cycle*, *merge sorted lists*, *k-th from the end* (move one pointer k ahead, then both together).\n\n**Pitfalls:** `None` checks (`fast and fast.next`); returning the old head after a reversal; recursion on a 100,000-node list blows Python's recursion limit, so iterate.",
      },
      {
        kind: "question",
        title: "Reverse 1 → 2 → 3 → 4",
        body: "Each step saves `nxt`, points `cur` back at `prev`, and moves both along. The lit node is `cur`. Answer the picks.",
        widget: {
          type: "iv-trace",
          props: {
            title: "Iterative reversal",
            frames: [
              { graph: { nodes: ROW, edges: E(["12", "23", "34"]), directed: true, active: ["1"] }, code: REV_CODE, line: 1, vars: { prev: "None", cur: 1, nxt: "-" }, note: "`prev = None`, `cur = head`." },
              { graph: { edges: E(["23", "34"]), active: ["2"], done: ["1"] }, line: 5, vars: { prev: 1, cur: 2, nxt: 2 }, note: "Saved `nxt = 2`, pointed 1 at `prev` (None), then moved `prev = 1`, `cur = 2`." },
              { graph: { edges: E(["21", "34"]), active: ["3"], done: ["1", "2"], activeEdges: [["2", "1"]] }, line: 4, vars: { prev: 2, cur: 3, nxt: 3 }, note: "2 now points back at 1. Next up is 3.", pick: { prompt: "After this step, which node does 3 point to?", answer: "2" } },
              { graph: { edges: E(["21", "32"]), active: ["4"], done: ["1", "2", "3"], activeEdges: [["3", "2"]] }, line: 5, vars: { prev: 3, cur: 4, nxt: 4 }, note: "3 points at 2. The only link to 4 was saved in `nxt` first." },
              { graph: { edges: E(["21", "32"]), active: ["4"], done: ["1", "2", "3"] }, line: 6, note: "One more step, then `cur` becomes None and the loop ends.", pick: { prompt: "Which node does the function return as the new head?", answer: "4" } },
              { graph: { edges: E(["21", "32", "43"]), done: ["1", "2", "3", "4"], activeEdges: [["4", "3"]] }, line: 6, vars: { prev: 4, cur: "None", nxt: "None" }, note: "Return `prev` = **4**: 4 → 3 → 2 → 1. O(n) time, O(1) memory, no new nodes." },
            ],
          },
        },
        question: { type: "widget", goal: { picked: true }, prompt: "Answer both picks.", hint: "`cur.next = prev`: each node ends up pointing at the node that came before it." },
        explanation: "3's `next` becomes `prev`, which is 2. At the end `cur` is None and `prev` holds the old tail, 4, which is the new head. Returning `head` (still node 1) is the classic bug: it's now the last node.",
      },
      {
        kind: "question",
        title: "Why they meet",
        body: "In Floyd's cycle detection, `slow` moves 1 step and `fast` moves 2. Why must they meet if the list has a loop?",
        question: {
          type: "choice",
          options: ["Inside the loop the gap closes by 1 each step", "Fast eventually stops at the last node", "The loop always has an even length", "Slow waits at the start of the loop"],
          answer: 0,
          feedback: { 1: "In a loop there is no last node: fast never stops.", 2: "Loops can have any length." },
          hint: "Once both are in the loop, think about the distance from fast to slow, measured forwards.",
        },
        explanation: "Each step `fast` gains exactly one node on `slow`, so the gap shrinks 1 at a time and can't jump over zero. They meet within one lap: O(n) time and O(1) memory, unlike a set of seen nodes (O(n) memory).",
      },
      {
        kind: "question",
        title: "Find the middle",
        body: "A list has 7 nodes. `slow` and `fast` start at the head and the loop runs `while fast and fast.next`. How many steps does `slow` take before the loop stops?",
        question: { type: "number", answer: 3, unit: "steps", hint: "fast visits nodes 0, 2, 4, 6. When it's on the last node, fast.next is None." },
        explanation: "`fast` goes 0 → 2 → 4 → 6 in three steps and then stops, so `slow` took **3** steps and sits on node 3, the middle of 0..6.",
      },
      {
        kind: "code",
        title: "Reverse in place",
        body: "`ListNode(val, next=None)`, `build(values)` (a list from Python values) and `to_list(head)` are already defined. Write `reverse(head)`: reverse the list by re-pointing the existing nodes and return the new head. Lists can have 100,000 nodes, so use a loop, not recursion.",
        language: "python",
        setup: LIST_SETUP,
        starter: `def reverse(head):
    prev, cur = None, head
    # save nxt, point cur back at prev, move both along
    pass
`,
        solution: `def reverse(head):
    prev, cur = None, head
    while cur:
        nxt = cur.next
        cur.next = prev
        prev, cur = cur, nxt
    return prev
`,
        tests: [
          { id: "t1", description: "Four nodes", assertionCode: `_r = reverse(build([1, 2, 3, 4]))\nassert _r is not None, "reverse should return the new head, not None"\nassert to_list(_r) == [4, 3, 2, 1], f"expected [4, 3, 2, 1], got {to_list(_r)}"` },
          { id: "t2", description: "The same nodes, re-pointed", assertionCode: `_h = build(["a", "b", "c"])\n_last = _h.next.next\n_r = reverse(_h)\nassert _r is _last, "the old last node should be the new head: re-point the nodes, don't make new ones"\nassert _h.next is None, "the old head is now the tail, so its next must be None"` },
          { id: "t3", description: "One node, and none", assertionCode: `_n = ListNode(7)\n_r = reverse(_n)\nassert _r is _n and _n.next is None, "a single node is its own reverse"\nassert reverse(None) is None, "an empty list stays empty (None)"` },
          { id: "t4", description: "100,000 nodes", assertionCode: `_r = reverse(build(list(range(100000))))\nassert _r is not None and _r.val == 99999, "the new head should hold 99999"\n_vals = to_list(_r)\nassert _vals == list(range(99999, -1, -1)), f"wrong order after reversing 100000 nodes (got {len(_vals)} values)"` },
        ],
        hints: ["`while cur:` save `nxt = cur.next`, then `cur.next = prev`.", "Move on with `prev, cur = cur, nxt`, and return `prev` after the loop."],
      },
      {
        kind: "code",
        title: "Merge two sorted lists",
        body: "Two delivery routes are linked lists sorted by stop number. Write `merge(a, b)`: one sorted list made by re-linking the existing nodes (when values tie, take from `a` first). Start from a dummy node so the head needs no special case. `ListNode`, `build` and `to_list` are defined.",
        language: "python",
        setup: LIST_SETUP,
        starter: `def merge(a, b):
    dummy = tail = ListNode(None)
    # attach the smaller front node to tail, advance; then attach what's left
    pass
`,
        solution: `def merge(a, b):
    dummy = tail = ListNode(None)
    while a and b:
        if a.val <= b.val:
            tail.next, a = a, a.next
        else:
            tail.next, b = b, b.next
        tail = tail.next
    tail.next = a if a else b
    return dummy.next
`,
        tests: [
          { id: "t1", description: "Interleaved", assertionCode: `_r = merge(build([1, 4, 6]), build([2, 3, 7]))\nassert to_list(_r) == [1, 2, 3, 4, 6, 7], f"expected [1, 2, 3, 4, 6, 7], got {to_list(_r)}"` },
          { id: "t2", description: "One side empty", assertionCode: `_r = merge(None, build([1, 2]))\nassert to_list(_r) == [1, 2], f"expected [1, 2], got {to_list(_r)}"\n_r = merge(build([5]), None)\nassert to_list(_r) == [5], f"expected [5], got {to_list(_r)}"` },
          { id: "t3", description: "Ties take from a first", assertionCode: `_a, _b = build([1, 1]), build([1])\n_r = merge(_a, _b)\nassert _r is _a, "with equal values, the first node should come from a"\nassert to_list(_r) == [1, 1, 1], f"expected [1, 1, 1], got {to_list(_r)}"` },
          { id: "t4", description: "Both empty, and different lengths", assertionCode: `assert merge(None, None) is None, "two empty lists merge to None"\n_r = merge(build([10, 20, 30, 40]), build([25]))\nassert to_list(_r) == [10, 20, 25, 30, 40], f"expected [10, 20, 25, 30, 40], got {to_list(_r)}"` },
          { id: "t5", description: "Two 50,000-node lists", assertionCode: `_r = merge(build(list(range(0, 100000, 2))), build(list(range(1, 100000, 2))))\nassert to_list(_r) == list(range(100000)), "expected 0..99999 in order"` },
        ],
        hints: ["While both lists have nodes, attach the smaller front node to `tail.next` and advance that list and `tail`.", "When one list runs out, attach the rest of the other in one go: `tail.next = a if a else b`. Return `dummy.next`."],
      },
      {
        kind: "recap",
        points: [
          "List problems are about re-pointing arrows in place: **save `next` before you overwrite it**.",
          "Reverse with `prev`, `cur`, `nxt`; return `prev`, not the old head.",
          "A **dummy head** removes the special case when the first node can change; return `dummy.next`.",
          "**Fast and slow** pointers: the middle when fast stops, a loop when they meet (O(1) memory).",
          "Check `fast and fast.next` before jumping two; iterate instead of recursing on long lists.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 8. Doubly-Linked List ───────────────────────────────
  {
    id: "fnd-iv-pointers-8-doubly-linked-list",
    title: "Doubly linked lists: O(1) from the middle",
    summary: "Sentinels, four-pointer surgery, and a dict of nodes for constant-time remove and move.",
    minutes: 14,
    xp: 90,
    level: "Professional",
    steps: [
      {
        kind: "explain",
        title: "Links both ways",
        body: "In a **doubly linked list** each node has `prev` and `next`. Given a node, you can remove it in O(1) without walking from the head, because its neighbours are right there:\n\n" +
          py(`
node.prev.next = node.next
node.next.prev = node.prev
`) +
          "\nTwo ideas make it robust:\n\n- **Sentinels**: a fake `head` before the first node and a fake `tail` after the last. Every real node then always has a `prev` and a `next`, so insert and remove never need an `if node is None` check, even on an empty list.\n- **A dict of nodes**: map each key to its node. Then *find* is O(1) (the dict) and *remove* or *move to the front* is O(1) (the pointers). This pair is how LRU caches, browser history, text editors and playlists get O(1) per operation; you'll build a cache in the design lessons.\n\n" +
          txt(`
HEAD <-> A <-> B <-> C <-> TAIL        index = {"A": node A, "B": node B, ...}
`) +
          "\n**How to spot it:** *remove from the middle in O(1)*, *move to the front*, *most / least recently used*, *go back and forward*, *O(1) per operation*.\n\n**Pitfalls:** four pointers change on every insert; overwrite them in a safe order. And when you remove a node, remove its dict entry too.",
      },
      {
        kind: "question",
        title: "Lift B out",
        body: "Each line is a pair of arrows: `next` one way, `prev` the other. To remove B, two of its neighbours' pointers must skip it. Answer the picks.",
        widget: {
          type: "iv-trace",
          props: {
            title: "Unlinking a node",
            frames: [
              { graph: { nodes: DLL_NODES, edges: E([...ENDS, "AB", "BA", "BC", "CB"]), directed: true, active: ["B"] }, code: UNLINK_CODE, line: 1, note: "We already hold B (from a dict), so there's no walk from the head. H and T are sentinels." },
              { graph: { active: ["B"] }, line: 2, note: "First fix the node before B.", pick: { prompt: "`b.prev` is A. Which node should A's `next` point to?", answer: "C" } },
              { graph: { edges: E([...ENDS, "AC", "BA", "BC", "CB"]), active: ["B"], activeEdges: [["A", "C"]] }, line: 2, note: "`b.prev.next = b.next`: A's `next` skips straight to C. Walking forwards no longer reaches B." },
              { graph: { active: ["B"] }, line: 3, note: "Walking backwards from C still reaches B.", pick: { prompt: "Which node should C's `prev` point to?", answer: "A" } },
              { graph: { edges: E([...ENDS, "AC", "CA", "BA", "BC"]), active: ["B"], activeEdges: [["C", "A"]] }, line: 3, note: "`b.next.prev = b.prev`. Nobody points at B any more." },
              { graph: { edges: E([...ENDS, "AC", "CA"]), done: ["B"] }, line: 4, note: "Clearing B's own pointers is optional, but it stops bugs from following them. Two writes, **O(1)**, at any position." },
            ],
          },
        },
        question: { type: "widget", goal: { picked: true }, prompt: "Answer both picks.", hint: "After the removal, A and C must point at each other." },
        explanation: "A's `next` becomes C and C's `prev` becomes A. Thanks to the sentinels, B always has both neighbours, even if it were the only real node.",
      },
      {
        kind: "question",
        title: "Order matters",
        body: "To insert a new node `x` after node `a`, you run these four lines in some order. Which one breaks the insert if it runs **first**?",
        question: {
          type: "choice",
          options: ["`x.prev = a`", "`x.next = a.next`", "`a.next.prev = x`", "`a.next = x`"],
          answer: 3,
          feedback: { 0: "`x` is new, so setting its own pointers first is harmless.", 1: "Reading `a.next` first is exactly right: it's still the old neighbour.", 2: "`a.next` is still the old neighbour here, so this correctly points it back at `x`." },
          hint: "Three of the lines read `a.next`. Which line changes it?",
        },
        explanation: "`a.next = x` overwrites the only way to reach the old neighbour. Afterwards `x.next = a.next` makes `x` point at itself. Read `a.next` (or save it in a variable) before you overwrite it.",
      },
      {
        kind: "question",
        title: "Why sentinels?",
        body: "Why give the list a fake `head` and `tail` node?",
        question: {
          type: "choice",
          options: ["They store the list's length", "They make the list sorted", "Every real node always has two neighbours", "They let Python free memory sooner"],
          answer: 2,
          feedback: { 0: "They hold no data; a length would be a separate counter.", 1: "Sentinels say nothing about order." },
          hint: "Think about removing the first or last real node without sentinels.",
        },
        explanation: "Without sentinels, removing the first node means updating a `head` variable, removing the last means updating `tail`, and an empty list is a third case. With them, the same two lines work everywhere.",
      },
      {
        kind: "code",
        title: "Insert and unlink",
        body: "Defined for you: `Node(val)` with `prev` and `next`; `make(values)` builds a list with sentinels and returns `(head, tail)`; `forward(head)` and `backward(tail)` list the values in each direction (so both sets of pointers are checked).\n\nWrite `insert_after(node, val)`, which creates a node holding `val` right after `node` and returns it, and `unlink(node)`, which removes `node` from its list.",
        language: "python",
        setup: DLL_SETUP,
        starter: `def insert_after(node, val):
    x = Node(val)
    # set x's two pointers, then fix the two neighbours (careful with the order)
    pass

def unlink(node):
    # make node's neighbours point at each other
    pass
`,
        solution: `def insert_after(node, val):
    x = Node(val)
    x.prev, x.next = node, node.next
    node.next.prev = x
    node.next = x
    return x

def unlink(node):
    node.prev.next = node.next
    node.next.prev = node.prev
    node.prev = node.next = None
`,
        tests: [
          { id: "t1", description: "Insert in the middle", assertionCode: `_h, _t = make(["a", "c"])\n_x = insert_after(_h.next, "b")\nassert _x is not None and _x.val == "b", "insert_after should return the new node"\nassert forward(_h) == ["a", "b", "c"], f"forwards: expected ['a', 'b', 'c'], got {forward(_h)}"\nassert backward(_t) == ["c", "b", "a"], f"backwards: expected ['c', 'b', 'a'], got {backward(_t)}: check the prev pointers"` },
          { id: "t2", description: "Insert into an empty list", assertionCode: `_h, _t = make([])\n_x = insert_after(_h, 1)\nassert _x is not None and forward(_h) == [1] and backward(_t) == [1], f"expected [1] both ways, got {forward(_h)} and {backward(_t)}"` },
          { id: "t3", description: "Unlink from the middle", assertionCode: `_h, _t = make(["a", "b", "c"])\n_b = _h.next.next\nunlink(_b)\nassert forward(_h) == ["a", "c"], f"forwards: expected ['a', 'c'], got {forward(_h)}"\nassert backward(_t) == ["c", "a"], f"backwards: expected ['c', 'a'], got {backward(_t)}"` },
          { id: "t4", description: "Unlink the only node, then reuse the list", assertionCode: `_h, _t = make(["x"])\nunlink(_h.next)\nassert forward(_h) == [] and backward(_t) == [], f"expected an empty list, got {forward(_h)} and {backward(_t)}"\n_y = insert_after(_h, "y")\nassert _y is not None and forward(_h) == ["y"] and backward(_t) == ["y"], "inserting after unlinking should still work"` },
        ],
        hints: ["In `insert_after`: `x.prev, x.next = node, node.next`, then `node.next.prev = x`, and only then `node.next = x`.", "In `unlink`: `node.prev.next = node.next` and `node.next.prev = node.prev`."],
      },
      {
        kind: "code",
        title: "An O(1) playlist",
        body: "Build `Playlist` with a doubly linked list plus a dict `song → node` (`Node` from the last step is defined):\n\n- `add(song)`: put a new song at the end (a song is never added twice);\n- `remove(song)`: take it out; return `True`, or `False` if it isn't there;\n- `move_to_front(song)`: move it to the start; return `True`, or `False` if it isn't there;\n- `order()`: the songs from first to last, as a list.\n\nEvery operation except `order` must be O(1): the checks run 60,000 moves.",
        language: "python",
        setup: DLL_SETUP,
        starter: `class Playlist:
    def __init__(self):
        self.head, self.tail = Node(), Node()   # sentinels
        self.head.next, self.tail.prev = self.tail, self.head
        self.nodes = {}                         # song -> its node

    def add(self, song):
        pass

    def remove(self, song):
        pass

    def move_to_front(self, song):
        pass

    def order(self):
        pass
`,
        solution: `class Playlist:
    def __init__(self):
        self.head, self.tail = Node(), Node()
        self.head.next, self.tail.prev = self.tail, self.head
        self.nodes = {}

    def _insert_after(self, node, x):
        x.prev, x.next = node, node.next
        node.next.prev = x
        node.next = x

    def _unlink(self, x):
        x.prev.next = x.next
        x.next.prev = x.prev

    def add(self, song):
        x = Node(song)
        self.nodes[song] = x
        self._insert_after(self.tail.prev, x)

    def remove(self, song):
        x = self.nodes.pop(song, None)
        if x is None:
            return False
        self._unlink(x)
        return True

    def move_to_front(self, song):
        x = self.nodes.get(song)
        if x is None:
            return False
        self._unlink(x)
        self._insert_after(self.head, x)
        return True

    def order(self):
        out, n = [], self.head.next
        while n is not self.tail:
            out.append(n.val)
            n = n.next
        return out
`,
        tests: [
          { id: "t1", description: "Add keeps the order", assertionCode: `_p = Playlist()\nfor _s in ["intro", "verse", "outro"]:\n    _p.add(_s)\n_r = _p.order()\nassert _r == ["intro", "verse", "outro"], f"expected ['intro', 'verse', 'outro'], got {_r}"` },
          { id: "t2", description: "Remove", assertionCode: `_p = Playlist()\nfor _s in "abc":\n    _p.add(_s)\nassert _p.remove("b") is True, "removing a song that's there returns True"\nassert _p.order() == ["a", "c"], f"expected ['a', 'c'], got {_p.order()}"\nassert _p.remove("b") is False, "removing it again returns False"\nassert _p.remove("zzz") is False, "removing an unknown song returns False"` },
          { id: "t3", description: "Move to front", assertionCode: `_p = Playlist()\nfor _s in "abcd":\n    _p.add(_s)\nassert _p.move_to_front("c") is True, "moving a song that's there returns True"\nassert _p.order() == ["c", "a", "b", "d"], f"expected ['c', 'a', 'b', 'd'], got {_p.order()}"\nassert _p.move_to_front("c") is True and _p.order() == ["c", "a", "b", "d"], "moving the first song keeps the order"\nassert _p.move_to_front("q") is False, "an unknown song returns False"` },
          { id: "t4", description: "Remove everything, then add again", assertionCode: `_p = Playlist()\n_p.add("x")\n_p.add("y")\nassert _p.remove("x") is True and _p.remove("y") is True, "both removes should succeed"\nassert _p.order() == [], f"expected [], got {_p.order()}"\n_p.add("x")\nassert _p.order() == ["x"], f"a removed song can be added again: expected ['x'], got {_p.order()}"` },
          { id: "t5", description: "60,000 moves", assertionCode: `_p = Playlist()\nfor _i in range(60000):\n    _p.add(_i)\nfor _i in range(60000):\n    _p.move_to_front(_i)\nfor _i in range(0, 60000, 2):\n    _p.remove(_i)\n_r = _p.order()\nassert _r == list(range(59999, 0, -2)), "expected the odd songs, newest move first" if _r is not None else "order() returned None"` },
        ],
        hints: ["`add` creates a `Node(song)`, stores it in `self.nodes`, and inserts it before `self.tail` (after `self.tail.prev`).", "Write two helpers, `_insert_after(node, x)` and `_unlink(x)`; `move_to_front` is unlink, then insert after `self.head`."],
      },
      {
        kind: "recap",
        points: [
          "A **doubly linked list** removes any node you hold in O(1): its neighbours point at each other.",
          "**Sentinels** (fake head and tail) remove every empty-list and end-of-list special case.",
          "On insert, read `a.next` before overwriting it; four pointers change.",
          "**Dict + doubly linked list** = O(1) find, remove and move: the core of LRU caches, history and playlists.",
          "Keep the dict in sync: delete the key when you unlink its node.",
        ],
      },
    ],
  },
];
