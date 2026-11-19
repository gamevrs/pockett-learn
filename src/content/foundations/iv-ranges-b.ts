import type { ConceptLesson } from "../../learn/types.ts";

/** Fenced Python block for lesson prose. */
const py = (code: string) => "~~~python\n" + code.trim() + "\n~~~";

// ── shared trace data ──
const FLAT_CODE = ["def flatten(nested):", "    for x in nested:", "        if isinstance(x, int):", "            yield x", "        else:", "            yield from flatten(x)"];
const FLAT_TREE = [
  { id: "root", label: "[ ]" },
  { id: "n1", label: "1", parent: "root" },
  { id: "l1", label: "[ ]", parent: "root" },
  { id: "e", label: "[ ]", parent: "root" },
  { id: "n5", label: "5", parent: "root" },
  { id: "n2", label: "2", parent: "l1" },
  { id: "l2", label: "[ ]", parent: "l1" },
  { id: "n3", label: "3", parent: "l2" },
  { id: "n4", label: "4", parent: "l2" },
];

const MEDIAN_CODE = ["push x onto low (a max-heap)", "move low's top to high (a min-heap)", "if len(high) > len(low): move high's top back to low", "median = low top, or the mean of both tops"];
const STREAM = [8, 2, 5, 9, 7, 1];

const LED_CODE = ["lo, hi = 0, n - 1", "while lo < hi:", "    mid = (lo + hi) // 2", "    if ask(mid): hi = mid     # broken: answer is mid or left", "    else: lo = mid + 1        # fine: answer is right of mid", "return lo"];

const LED_JUDGE = `import math

def make_led_judge(n, first):
    """A hidden strip of n LEDs; LEDs first..n-1 are broken. Returns (ask, calls)."""
    calls = []
    def ask(i):
        assert isinstance(i, int) and 0 <= i < n, f"ask({i!r}) is outside 0..{n - 1}"
        calls.append(i)
        return i >= first
    return ask, calls
`;

const HILL_JUDGE = `import math

def make_hill_judge(n, peak):
    """A hidden hill of n points, highest at peak. Returns (ask, calls)."""
    calls = []
    def ask(i):
        assert isinstance(i, int) and 0 <= i < n, f"ask({i!r}) is outside 0..{n - 1}"
        calls.append(i)
        return 1000000 - abs(i - peak) * 7
    return ask, calls
`;

export const ivRangesLessonsB: ConceptLesson[] = [
  // ─────────────────────────────── 4. Iterators ───────────────────────────────
  {
    id: "fnd-iv-ranges-4-iterator",
    title: "Iterators: one value at a time",
    summary: "Design iterators that peek, flatten and stay lazy, using Python's iterator protocol and generators.",
    minutes: 14,
    xp: 90,
    level: "Advanced",
    steps: [
      {
        kind: "explain",
        title: "Next, and is there more?",
        body:
          "An **iterator** hands out values one at a time and remembers where it is. Interview versions ask you to wrap something (nested lists, several lists, a tree) behind two methods, usually `next()` and `has_next()`, and to do it **lazily**: work out each value only when asked, so memory stays small and even endless inputs work.\n\nIn Python an iterator is any object with `__next__` (raising `StopIteration` at the end) and `__iter__` returning itself. The easy way to write one is a **generator**: a function with `yield`. It pauses at each `yield` and resumes on the next request.\n\n" +
          py(`
def evens(limit):
    n = 0
    while n < limit:
        yield n          # pause here; resume on the next request
        n += 2

it = evens(5)
next(it), next(it), next(it)   # (0, 2, 4); one more next() raises StopIteration
`) +
          "\n**How to spot it:** *implement an iterator*, *next / has_next*, *peek*, *flatten*, *round-robin across lists*, or *the input is too big to copy*.",
      },
      {
        kind: "question",
        title: "Flatten, lazily",
        body: "`flatten([1, [2, [3, 4]], [], 5])` walks the nesting depth-first and yields each number as it reaches it. At each stop, tap the number that comes out next.",
        widget: {
          type: "iv-trace",
          props: {
            title: "flatten([1, [2, [3, 4]], [], 5])",
            frames: [
              { tree: { nodes: FLAT_TREE, active: ["n1"] }, code: FLAT_CODE, line: 4, stacks: [{ label: "generators", items: ["outer"] }], vars: { "yielded so far": "1" }, note: "The outer generator's first item is 1: yield it and pause." },
              { tree: { active: ["l1"], done: ["n1"] }, line: 6, stacks: [{ label: "generators", items: ["outer", "[2, [3, 4]]"] }], note: "The next item is a list, so `yield from` starts an inner generator on it.", pick: { prompt: "Which number comes out next?", answer: "n2" } },
              { tree: { active: ["n2"], done: ["n1"] }, line: 4, vars: { "yielded so far": "1 2" }, note: "2 is yielded, passed straight up through `yield from`." },
              { tree: { active: ["n3", "n4"], done: ["n1", "n2"] }, line: 4, stacks: [{ label: "generators", items: ["outer", "[2, [3, 4]]", "[3, 4]"] }], vars: { "yielded so far": "1 2 3 4" }, note: "One level deeper: 3, then 4, each on its own request." },
              { tree: { active: ["e"], done: ["n1", "n2", "n3", "n4", "l1", "l2"] }, line: 2, stacks: [{ label: "generators", items: ["outer", "[]"] }], note: "Both inner generators are used up. The next item, `[]`, starts a generator that yields nothing.", pick: { prompt: "Which number comes out next?", answer: "n5" } },
              { tree: { active: ["n5"], done: ["n1", "n2", "n3", "n4", "l1", "l2", "e"] }, line: 4, stacks: [{ label: "generators", items: ["outer"] }], vars: { "yielded so far": "1 2 3 4 5" }, note: "5. The stack of paused generators is the recursion's call stack, kept alive between requests." },
            ],
          },
        },
        question: { type: "widget", goal: { picked: true }, prompt: "Answer both picks.", hint: "Depth-first, left to right; an empty list produces nothing." },
        explanation: "The generator only goes as deep as it needs for the next value. Memory is the current nesting depth, not the total size.",
      },
      {
        kind: "question",
        title: "Count what comes out",
        body: "How many numbers does `flatten([[], [[]], [1, [2, []]], 3])` yield?",
        question: { type: "number", answer: 3, unit: "numbers", hint: "Ignore the empty lists; count only the integers, however deep." },
        explanation: "Only 1, 2 and 3 are numbers: **3**. Empty lists, even nested ones, are a classic edge case: a `has_next` that just checks *is there another item at this level* would say yes for `[[]]` and then have nothing to give.",
      },
      {
        kind: "explain",
        title: "has_next without consuming",
        body:
          "Python iterators have no `has_next`: the only way to know if there is more is to *take* the next value. So a wrapper that offers `peek()` or `has_next()` must **buffer** one value:\n\n" +
          py(`
_EMPTY = object()                    # a marker no real value can equal

class Peeker:
    def __init__(self, iterable):
        self.it = iter(iterable)
        self.buf = _EMPTY

    def _fill(self):
        if self.buf is _EMPTY:
            self.buf = next(self.it, _EMPTY)

    def has_next(self):
        self._fill()
        return self.buf is not _EMPTY
`) +
          "\nThe private marker matters: using `None` as *nothing buffered* breaks as soon as the data contains `None` (or, with a truthiness test, `0` or `''`).\n\nOther designs on the same idea: **round-robin** over several iterators (a queue of iterators; take one value, put the iterator back if it has more), **merge sorted iterators** (a heap of each iterator's next value), and **tree iterators** (an explicit stack, so `next` is O(1) amortised and memory O(height)).\n\nPitfalls: building the whole list in `__init__` (not lazy; breaks on endless input), `has_next` that advances, and recursion that recomputes from the start on each call.",
      },
      {
        kind: "question",
        title: "Spot the bug",
        body: "A `Peeker` stores the buffered value in `self.buf`, uses `None` to mean *nothing buffered*, and `has_next()` returns `self.buf is not None` after filling. On which input does it go wrong?",
        question: {
          type: "choice",
          options: ["An empty list", "A list of strings", "A list with one item", "A list containing None"],
          answer: 3,
          feedback: { 0: "An empty list leaves the buffer at None and `has_next()` says False, which is right.", 1: "Strings are never None, so they buffer fine.", 2: "One item buffers and reports correctly." },
          hint: "Which value would the wrapper mistake for *nothing buffered*?",
        },
        explanation: "When the next real value is `None`, the wrapper can't tell it from an empty buffer, so `has_next()` says False in the middle of the data. Use a private marker such as `object()`.",
      },
      {
        kind: "code",
        title: "A peeking iterator",
        body: "Write `Peeker(iterable)` with `peek()` (the next value without using it up), `next()` (the next value, used up) and `has_next()`. It must work on one-pass iterators (generators), pull at most **one** value ahead, and handle any values, including `None`, `0` and `False`. You may assume `peek()` and `next()` are only called when `has_next()` is True.",
        language: "python",
        starter: `_EMPTY = object()

class Peeker:
    def __init__(self, iterable):
        self.it = iter(iterable)
        self.buf = _EMPTY

    def has_next(self):
        return False

    def peek(self):
        return None

    def next(self):
        return None
`,
        solution: `_EMPTY = object()

class Peeker:
    def __init__(self, iterable):
        self.it = iter(iterable)
        self.buf = _EMPTY

    def _fill(self):
        if self.buf is _EMPTY:
            self.buf = next(self.it, _EMPTY)

    def has_next(self):
        self._fill()
        return self.buf is not _EMPTY

    def peek(self):
        self._fill()
        return self.buf

    def next(self):
        self._fill()
        value, self.buf = self.buf, _EMPTY
        return value
`,
        tests: [
          { id: "t1", description: "peek, then next", assertionCode: `p = Peeker([10, 20, 30])\nr = (p.peek(), p.peek(), p.next(), p.next(), p.peek(), p.has_next(), p.next(), p.has_next())\nassert r == (10, 10, 10, 20, 30, True, 30, False), f"expected (10, 10, 10, 20, 30, True, 30, False), got {r}"` },
          { id: "t2", description: "falsy values and None", assertionCode: `p = Peeker([0, None, False, ""])\nout = []\nwhile p.has_next():\n    out.append(p.next())\nassert out == [0, None, False, ""], f"expected [0, None, False, ''], got {out}: is None or 0 being treated as the end?"` },
          { id: "t3", description: "one-pass and at most one ahead", assertionCode: `pulled = []\ndef gen():\n    for i in range(1, 100):\n        pulled.append(i)\n        yield i * i\np = Peeker(gen())\nr = (p.has_next(), p.peek(), p.next(), p.peek())\nassert r == (True, 1, 1, 4), f"expected (True, 1, 1, 4), got {r}"\nassert pulled == [1, 2], f"the generator should have been asked for 2 values so far, but was asked for {len(pulled)}"` },
          { id: "t4", description: "empty input", assertionCode: `r = (Peeker([]).has_next(), Peeker(iter(())).has_next(), Peeker([None]).has_next())\nassert r == (False, False, True), f"expected (False, False, True), got {r}"` },
        ],
        hints: ["Write a helper `_fill()` that pulls one value into `self.buf` only when it is `_EMPTY`: `next(self.it, _EMPTY)`.", "`next()` fills, then returns the buffered value and resets `self.buf` to `_EMPTY`."],
      },
      {
        kind: "code",
        title: "Flatten anything",
        body: "Write a generator `flatten(nested)`: `nested` is a list (or any iterable) whose items are `int`s or more iterables, to any depth. Yield the ints in order, **lazily**: the last test puts an endless counter inside and takes only the first few values.",
        language: "python",
        starter: `def flatten(nested):
    # an int is yielded; anything else is flattened in turn
    return []
`,
        solution: `def flatten(nested):
    for x in nested:
        if isinstance(x, int):
            yield x
        else:
            yield from flatten(x)
`,
        tests: [
          { id: "t1", description: "the example", assertionCode: `r = list(flatten([1, [2, [3, 4]], [], 5]))\nassert r == [1, 2, 3, 4, 5], f"expected [1, 2, 3, 4, 5], got {r}"` },
          { id: "t2", description: "empty lists everywhere", assertionCode: `r = (list(flatten([[], [[]], [1, [2, []]], 3])), list(flatten([[[[7]]]])))\nassert r == ([1, 2, 3], [7]), f"expected ([1, 2, 3], [7]), got {r}"` },
          { id: "t3", description: "deep nesting", assertionCode: `x = [0]\nfor i in range(1, 60):\n    x = [x, i]\nr = list(flatten(x))\nassert r == list(range(60)), f"expected 0..59 in order, got {r[:5]}... ({len(r)} values)"` },
          { id: "t4", description: "lazy: an endless counter inside", assertionCode: `from itertools import count, islice\nr = list(islice(flatten([[1, [2]], count(10)]), 5))\nassert r == [1, 2, 10, 11, 12], f"expected [1, 2, 10, 11, 12], got {r}"` },
        ],
        hints: ["Loop over `nested`; `yield x` when `isinstance(x, int)`.", "Otherwise `yield from flatten(x)`: it passes the inner values up one at a time."],
      },
      {
        kind: "recap",
        points: [
          "An **iterator** hands out one value per request; a **generator** (`yield`) is the easiest way to write one.",
          "Stay **lazy**: compute each value on demand, so memory is small and endless inputs work.",
          "`has_next`/`peek` must **buffer** one value, marked with a private sentinel, never `None`.",
          "Flatten with `yield from`; round-robin with a queue of iterators; merge sorted iterators with a heap.",
          "Spot it: *implement an iterator*, *next / has_next*, *peek*, *flatten*, input too big to copy.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 5. Data streams ───────────────────────────────
  {
    id: "fnd-iv-ranges-5-data-stream",
    title: "Data streams: answers after every value",
    summary: "Running averages and medians with a deque and two heaps, in small memory and fast updates.",
    minutes: 15,
    xp: 90,
    level: "Advanced",
    steps: [
      {
        kind: "explain",
        title: "Values keep arriving",
        body:
          "In a **data stream** problem, values arrive one at a time and you must answer after each: the average of the last k, the median so far, the most frequent item, whether a value was seen. Recomputing from scratch each time is too slow, and sometimes the stream is too big to keep.\n\nThe move is to keep a small **summary** that updates in O(1) or O(log n):\n- **running total / count** for averages; a **deque** plus a running sum for the last k values;\n- **two heaps** for the median: a max-heap `low` with the smaller half and a min-heap `high` with the larger half;\n- a **Counter** plus a heap for top-k; a **set** for *seen before*; reservoir sampling for a random sample (see the maths module).\n\n**How to spot it:** *stream*, *add a number and return …*, *after each insertion*, class methods like `add` and `find_median`, or input too big for memory.",
      },
      {
        kind: "question",
        title: "Median with two heaps",
        body: "Numbers arrive: 8, 2, 5, 9, 7, 1. `low` keeps the smaller half (top = largest), `high` the larger half (top = smallest), and `low` may hold one extra. Before each pick, tap the stream value that will be the median.",
        widget: {
          type: "iv-trace",
          props: {
            title: "Running median",
            frames: [
              { array: STREAM, highlight: [0], code: MEDIAN_CODE, line: 4, stacks: [{ label: "low (max-heap)", items: [8], kind: "heap" }, { label: "high (min-heap)", items: [], kind: "heap" }], vars: { median: 8 }, note: "8 arrives. One value: the median is 8." },
              { highlight: [1], range: [0, 1], line: 4, stacks: [{ label: "low (max-heap)", items: [2], kind: "heap" }, { label: "high (min-heap)", items: [8], kind: "heap" }], vars: { median: 5 }, note: "2 arrives: push to low, move low's top (8) to high. Even count: the mean of 2 and 8 is 5." },
              { highlight: [2], range: [0, 2], line: 1, note: "5 arrives.", pick: { prompt: "Which stream value is the median of the first three?", answer: 2 } },
              { highlight: [2], range: [0, 2], line: 3, stacks: [{ label: "low (max-heap)", items: [5, 2], kind: "heap" }, { label: "high (min-heap)", items: [8], kind: "heap" }], vars: { median: 5 }, note: "5 goes to low, then up to high (5 < 8, so high's top becomes 5), then high is too big and 5 comes back. low's top is the median: **5**." },
              { highlight: [3], range: [0, 3], line: 4, stacks: [{ label: "low (max-heap)", items: [5, 2], kind: "heap" }, { label: "high (min-heap)", items: [8, 9], kind: "heap" }], vars: { median: 6.5 }, note: "9 arrives and ends up in high. Even count: (5 + 8) / 2 = 6.5." },
              { highlight: [4], range: [0, 4], line: 1, note: "7 arrives.", pick: { prompt: "Which stream value is the median of the first five?", answer: 4 } },
              { highlight: [4], range: [0, 4], line: 3, stacks: [{ label: "low (max-heap)", items: [7, 5, 2], kind: "heap" }, { label: "high (min-heap)", items: [8, 9], kind: "heap" }], vars: { median: 7 }, note: "7 goes up to high (top 7), high is too big, 7 comes back to low. Median **7**." },
              { highlight: [5], range: [0, 5], line: 4, stacks: [{ label: "low (max-heap)", items: [5, 2, 1], kind: "heap" }, { label: "high (min-heap)", items: [7, 8, 9], kind: "heap" }], vars: { median: 6 }, note: "1 arrives: low's top 7 moves up to high. (5 + 7) / 2 = **6**. Each step was a few heap operations: O(log n)." },
            ],
          },
        },
        question: { type: "widget", goal: { picked: true }, prompt: "Answer both picks.", hint: "Sort the values seen so far in your head; with an odd count the median is the middle one." },
        explanation: "Every value in `low` is ≤ every value in `high`, and the sizes differ by at most one, so the median is always at the tops: O(1) to read, O(log n) to add.",
      },
      {
        kind: "question",
        title: "Why two heaps?",
        body: "You could keep every value in a sorted Python list with `bisect.insort` and read the middle. Why is the two-heap version better for a long stream?",
        question: {
          type: "choice",
          options: ["Heaps keep every value in sorted order", "insort shifts O(n) items on each insert", "Heaps need less memory than a list", "bisect does not work on integers"],
          answer: 1,
          feedback: { 0: "A heap only guarantees its top; the rest is not sorted, and it does not need to be.", 2: "Both keep all n values; memory is the same order.", 3: "bisect works on any sortable values." },
          hint: "Finding the spot is a binary search; what does putting the value there cost?",
        },
        explanation: "`insort` finds the position in O(log n), but inserting into a list shifts everything after it: **O(n)** per value, O(n²) for the stream. Two heaps make each add O(log n).",
      },
      {
        kind: "explain",
        title: "The two classes",
        body:
          py(`
from collections import deque
import heapq

class MovingAverage:                   # average of the last k values
    def __init__(self, k):
        self.k, self.window, self.total = k, deque(), 0

    def add(self, x):
        self.window.append(x)
        self.total += x
        if len(self.window) > self.k:
            self.total -= self.window.popleft()
        return self.total / len(self.window)

class MedianKeeper:
    def __init__(self):
        self.low, self.high = [], []   # low stores negatives: Python has only min-heaps

    def add(self, x):
        heapq.heappush(self.low, -x)
        heapq.heappush(self.high, -heapq.heappop(self.low))
        if len(self.high) > len(self.low):
            heapq.heappush(self.low, -heapq.heappop(self.high))
`) +
          "\nThe push-then-move dance keeps both rules (every low ≤ every high, sizes within one) without any case analysis.\n\nPitfalls: forgetting that Python's `heapq` is a **min**-heap (store negatives for a max-heap), integer division in an average (use `/`), and recomputing `sum(window)` on every add (O(k) each).",
      },
      {
        kind: "question",
        title: "Window of three",
        body: "A `MovingAverage(3)` receives 4, 8, 6 and then 10. What does the fourth `add` return?",
        question: { type: "number", answer: 8, hint: "Only the last three values count." },
        explanation: "The window is 8, 6, 10 (the 4 has dropped out): 24 / 3 = **8**.",
      },
      {
        kind: "code",
        title: "Moving average",
        body: "Write `MovingAverage(k)` with `add(x)`, which returns the average of the last `k` values added (or of all of them while fewer than `k` have arrived). Each `add` must be O(1): keep a running total instead of summing the window.",
        language: "python",
        starter: `from collections import deque

class MovingAverage:
    def __init__(self, k):
        self.k = k

    def add(self, x):
        return 0
`,
        solution: `from collections import deque

class MovingAverage:
    def __init__(self, k):
        self.k = k
        self.window = deque()
        self.total = 0

    def add(self, x):
        self.window.append(x)
        self.total += x
        if len(self.window) > self.k:
            self.total -= self.window.popleft()
        return self.total / len(self.window)
`,
        tests: [
          { id: "t1", description: "window of three", assertionCode: `m = MovingAverage(3)\nr = [m.add(x) for x in (4, 8, 6, 10)]\nassert r == [4, 6, 6, 8], f"expected [4.0, 6.0, 6.0, 8.0], got {r}"` },
          { id: "t2", description: "not integer division", assertionCode: `m = MovingAverage(2)\nr = [m.add(x) for x in (1, 2, 4)]\nassert all(abs(a - b) < 1e-9 for a, b in zip(r, [1, 1.5, 3])) and len(r) == 3, f"expected [1.0, 1.5, 3.0], got {r}"` },
          { id: "t3", description: "k = 1 and negatives", assertionCode: `m = MovingAverage(1)\nr = [m.add(x) for x in (5, -3, 7)]\nassert r == [5, -3, 7], f"with k = 1 each add returns the value itself: expected [5, -3, 7], got {r}"\nm = MovingAverage(4)\nr = [m.add(x) for x in (-2, -4, 6, 0, 10)]\nassert r == [-2, -3, 0, 0, 3], f"expected [-2, -3, 0, 0, 3], got {r}"` },
          { id: "t4", description: "a long stream", assertionCode: `m = MovingAverage(1000)\nlast = None\nfor x in range(40000):\n    last = m.add(x)\nassert abs(last - 39499.5) < 1e-6, f"the last 1000 of 0..39999 average 39499.5, got {last}"` },
        ],
        hints: ["Keep a `deque` of the window and a running `total`.", "Append and add; if the window is longer than `k`, subtract `popleft()`; return `total / len(window)`."],
      },
      {
        kind: "code",
        title: "Running median",
        body: "Write `MedianKeeper()` with `add(x)` and `median()`: the median of everything added so far (the middle value, or the mean of the two middle values for an even count). `add` must be O(log n) and `median` O(1). Use two heaps.",
        language: "python",
        starter: `import heapq

class MedianKeeper:
    def __init__(self):
        self.low = []   # max-heap of the smaller half (store negatives)
        self.high = []  # min-heap of the larger half

    def add(self, x):
        pass

    def median(self):
        return 0
`,
        solution: `import heapq

class MedianKeeper:
    def __init__(self):
        self.low = []
        self.high = []

    def add(self, x):
        heapq.heappush(self.low, -x)
        heapq.heappush(self.high, -heapq.heappop(self.low))
        if len(self.high) > len(self.low):
            heapq.heappush(self.low, -heapq.heappop(self.high))

    def median(self):
        if len(self.low) > len(self.high):
            return -self.low[0]
        return (-self.low[0] + self.high[0]) / 2
`,
        tests: [
          { id: "t1", description: "the example stream", assertionCode: `m = MedianKeeper()\nr = []\nfor x in (8, 2, 5, 9, 7, 1):\n    m.add(x)\n    r.append(m.median())\nassert r == [8, 5, 5, 6.5, 7, 6], f"expected [8, 5, 5, 6.5, 7, 6], got {r}"` },
          { id: "t2", description: "negatives and repeats", assertionCode: `m = MedianKeeper()\nr = []\nfor x in (-5, -5, 3, -5, 10, 3):\n    m.add(x)\n    r.append(m.median())\nassert r == [-5, -5, -5, -5, -5, -1], f"expected [-5, -5, -5, -5, -5, -1.0], got {r}"` },
          { id: "t3", description: "3,000 random values against sorting", assertionCode: `import random\nrng = random.Random(17)\nm = MedianKeeper()\nseen = []\nfor step in range(3000):\n    x = rng.randint(-1000, 1000)\n    m.add(x)\n    seen.append(x)\n    if step % 250 == 0 or step == 2999:\n        s = sorted(seen)\n        k = len(s)\n        want = s[k // 2] if k % 2 else (s[k // 2 - 1] + s[k // 2]) / 2\n        got = m.median()\n        assert got == want, f"after {k} values the median should be {want}, got {got}"` },
        ],
        hints: ["Push to `low` (as `-x`), then move low's top to `high`; if `high` is now bigger, move its top back.", "`median()`: `-low[0]` when low is bigger, else the mean of `-low[0]` and `high[0]`."],
      },
      {
        kind: "recap",
        points: [
          "Stream problems keep a small **summary** that updates per value instead of recomputing.",
          "Last-k average: a **deque** and a running total, O(1) per value.",
          "Running median: **two heaps** (max-heap of the low half, min-heap of the high half), O(log n) add, O(1) read.",
          "Python's `heapq` is a min-heap; store negatives for a max-heap.",
          "Spot it: *stream*, *after each insertion*, `add` + `find…` methods, input too big to keep.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 6. Interactive problems ───────────────────────────────
  {
    id: "fnd-iv-ranges-6-interactive",
    title: "Interactive problems: ask the judge",
    summary: "The data is hidden behind a question function with a budget; spend each question to halve what you don't know.",
    minutes: 15,
    xp: 90,
    level: "Advanced",
    steps: [
      {
        kind: "explain",
        title: "You can only ask",
        body:
          "In an **interactive** problem you never see the input. A judge holds it and you call a function, here `ask(i)`, that answers one small question. There is a **budget**: usually about log₂ n questions, so reading everything is not allowed.\n\nEvery answer should cut the possibilities as much as it can. With yes/no answers the best you can do is **halve** them, so binary search is the default tool: about ⌈log₂ n⌉ questions.\n\nHabits that help:\n- Write down what is still possible (an interval `lo..hi`) and make each question split it.\n- Never ask the same thing twice: store answers if you might need them again.\n- Check the edges: n = 1 needs no question at all.\n- Count your questions against the budget **before** coding.\n\n**How to spot it:** *you may call `guess` / `query` / `compare` at most … times*, *the array is hidden*, *the judge answers higher/lower*.",
      },
      {
        kind: "question",
        title: "Find the first broken LED",
        body: "A strip of 8 LEDs (0 to 7). From some LED on, all are broken; `ask(i)` says whether LED i is broken. `?` marks LEDs not asked about yet. Tap the LED the search asks about next.",
        widget: {
          type: "iv-trace",
          props: {
            title: "First broken LED, n = 8",
            frames: [
              { array: ["?", "?", "?", "?", "?", "?", "?", "?"], pointers: { lo: 0, hi: 7 }, range: [0, 7], code: LED_CODE, line: 1, vars: { questions: 0 }, note: "The first broken LED could be any of 0..7 (LED 7 is broken for sure)." },
              { pointers: { lo: 0, hi: 7 }, range: [0, 7], line: 3, note: "Ask about the middle.", pick: { prompt: "Which LED does `mid = (lo + hi) // 2` pick?", answer: 3 } },
              { array: ["?", "?", "?", "ok", "?", "?", "?", "?"], pointers: { lo: 4, hi: 7 }, range: [4, 7], done: [0, 1, 2, 3], line: 5, vars: { questions: 1 }, note: "LED 3 is fine, so every LED up to 3 is fine: `lo = 4`." },
              { pointers: { lo: 4, hi: 7 }, range: [4, 7], done: [0, 1, 2, 3], line: 3, note: "Four candidates left.", pick: { prompt: "Which LED is asked about next?", answer: 5 } },
              { array: ["?", "?", "?", "ok", "?", "bad", "?", "?"], pointers: { lo: 4, hi: 5 }, range: [4, 5], done: [0, 1, 2, 3, 6, 7], line: 4, vars: { questions: 2 }, note: "LED 5 is broken: the first broken one is 5 or earlier, so `hi = 5`." },
              { pointers: { lo: 4, hi: 5 }, range: [4, 5], done: [0, 1, 2, 3, 6, 7], line: 3, note: "Two candidates.", pick: { prompt: "Which LED is asked about next?", answer: 4 } },
              { array: ["?", "?", "?", "ok", "ok", "bad", "?", "?"], pointers: { lo: 5, hi: 5 }, highlight: [5], done: [0, 1, 2, 3, 4, 6, 7], line: 6, vars: { questions: 3 }, note: "LED 4 is fine, so `lo = hi = 5`: the answer is **LED 5**, after 3 questions = log₂ 8." },
            ],
          },
        },
        question: { type: "widget", goal: { picked: true }, prompt: "Answer all three picks.", hint: "The next question is always the middle of what is still possible: (lo + hi) // 2." },
        explanation: "Each answer halves the candidates: 8 → 4 → 2 → 1. Asking LEDs in order could take 7 questions; on a million LEDs, 20 against a million.",
      },
      {
        kind: "question",
        title: "The budget",
        body: "The strip has 1,000,000 LEDs. At most how many questions does the halving search need?",
        question: { type: "number", answer: 20, unit: "questions", hint: "How many times can you halve a million before one candidate is left? 2¹⁰ is about a thousand." },
        explanation: "2²⁰ = 1,048,576 ≥ 1,000,000, so **20** questions: ⌈log₂ n⌉.",
      },
      {
        kind: "explain",
        title: "More than yes or no",
        body:
          "Sometimes the answer is a number, not a yes/no. A hidden **hill**: heights strictly rise to a peak, then strictly fall. Asking one height tells you nothing alone, but comparing two neighbours tells you which **side** of the peak you are on:\n\n" +
          py(`
lo, hi = 0, n - 1
while lo < hi:
    mid = (lo + hi) // 2
    if ask(mid) < ask(mid + 1):   # still climbing: the peak is to the right
        lo = mid + 1
    else:                         # going down: the peak is mid or to its left
        hi = mid
return lo
`) +
          "\nThat is 2 questions per halving: at most 2⌈log₂ n⌉. (Ternary search also works on a hill, but it needs more questions per step.)\n\nOther interactive shapes: guessing a hidden number with *higher/lower* answers (binary search on values), finding a hidden permutation with comparisons (a sort that counts comparisons), and finding a marked item with group questions (ask about half the candidates at once).\n\nPitfalls: an off-by-one that loops forever when `lo + 1 == hi`, asking for `mid + 1` past the end, and spending questions on things you already know.",
      },
      {
        kind: "question",
        title: "Choose the strategy",
        body: "The judge allows 20 questions on a hidden hill of 1,000 points. Which approach fits the budget?",
        question: {
          type: "choice",
          options: ["Ask every point and keep the highest", "Ask 20 random points and keep the highest", "Ask the middle point twice, then step", "Compare `mid` with `mid + 1` and halve"],
          answer: 3,
          feedback: { 0: "That is 1,000 questions, far over the budget.", 1: "Random points will usually miss the peak.", 2: "Asking the same point twice gives the same answer: a wasted question." },
          hint: "Which comparison tells you which side of the peak you are on?",
        },
        explanation: "Comparing neighbours halves the range with 2 questions: ⌈log₂ 1000⌉ = 10 halvings, 20 questions. Exactly the budget.",
      },
      {
        kind: "code",
        title: "First broken LED",
        body: "Write `first_broken(n, ask)`: LEDs are numbered `0..n-1`, and from some LED on all are broken (LED `n - 1` always is). `ask(i)` returns `True` if LED i is broken. Return the first broken LED using at most ⌈log₂ n⌉ questions.\n\nThe tests build a hidden strip with `make_led_judge(n, first)`, which returns `ask` and a list of the LEDs you asked about.",
        language: "python",
        setup: LED_JUDGE,
        starter: `def first_broken(n, ask):
    lo, hi = 0, n - 1
    # halve lo..hi until one LED is left
    return 0
`,
        solution: `def first_broken(n, ask):
    lo, hi = 0, n - 1
    while lo < hi:
        mid = (lo + hi) // 2
        if ask(mid):
            hi = mid
        else:
            lo = mid + 1
    return lo
`,
        tests: [
          { id: "t1", description: "the example strip", assertionCode: `ask, calls = make_led_judge(8, 5)\nr = first_broken(8, ask)\nassert r == 5, f"expected LED 5, got {r}"\nassert len(calls) <= 3, f"8 LEDs need at most 3 questions, you asked {len(calls)}: {calls}"` },
          { id: "t2", description: "the edges", assertionCode: `for n, first in ((1, 0), (2, 1), (9, 0), (9, 8)):\n    ask, calls = make_led_judge(n, first)\n    r = first_broken(n, ask)\n    budget = math.ceil(math.log2(n)) if n > 1 else 0\n    assert r == first, f"n = {n}: expected LED {first}, got {r}"\n    assert len(calls) <= budget, f"n = {n}: the budget is {budget} questions, you asked {len(calls)}"` },
          { id: "t3", description: "a million LEDs, 20 questions", assertionCode: `for first in (0, 1, 123456, 999998, 999999):\n    ask, calls = make_led_judge(1000000, first)\n    r = first_broken(1000000, ask)\n    assert r == first, f"expected LED {first}, got {r}"\n    assert len(calls) <= 20, f"a million LEDs allow 20 questions, you asked {len(calls)}"` },
        ],
        hints: ["Keep `lo, hi` as the LEDs that could still be the first broken one; stop when they meet.", "If `ask(mid)` is True the answer is `mid` or earlier (`hi = mid`); otherwise it is after `mid` (`lo = mid + 1`)."],
      },
      {
        kind: "code",
        title: "Top of the hidden hill",
        body: "Write `hill_top(n, ask)`: a hidden hill has points `0..n-1` whose heights strictly rise to a peak and then strictly fall (the peak may be at either end). `ask(i)` returns the height of point i. Return the peak's index using at most 2⌈log₂ n⌉ questions.\n\nThe tests use `make_hill_judge(n, peak)`, which returns `ask` and the list of points you asked about.",
        language: "python",
        setup: HILL_JUDGE,
        starter: `def hill_top(n, ask):
    lo, hi = 0, n - 1
    # compare mid with mid + 1 to see which side of the peak you are on
    return 0
`,
        solution: `def hill_top(n, ask):
    lo, hi = 0, n - 1
    while lo < hi:
        mid = (lo + hi) // 2
        if ask(mid) < ask(mid + 1):
            lo = mid + 1
        else:
            hi = mid
    return lo
`,
        tests: [
          { id: "t1", description: "a small hill", assertionCode: `ask, calls = make_hill_judge(10, 6)\nr = hill_top(10, ask)\nassert r == 6, f"expected the peak at 6, got {r}"\nassert len(calls) <= 8, f"10 points allow 2 * 4 = 8 questions, you asked {len(calls)}"` },
          { id: "t2", description: "peaks at the ends, tiny hills", assertionCode: `for n, peak in ((1, 0), (2, 1), (2, 0), (7, 0), (7, 6)):\n    ask, calls = make_hill_judge(n, peak)\n    r = hill_top(n, ask)\n    budget = 2 * math.ceil(math.log2(n)) if n > 1 else 0\n    assert r == peak, f"n = {n}: expected the peak at {peak}, got {r}"\n    assert len(calls) <= budget, f"n = {n}: the budget is {budget} questions, you asked {len(calls)}"` },
          { id: "t3", description: "a million points, 40 questions", assertionCode: `for peak in (1, 500000, 777777, 999998):\n    ask, calls = make_hill_judge(1000000, peak)\n    r = hill_top(1000000, ask)\n    assert r == peak, f"expected the peak at {peak}, got {r}"\n    assert len(calls) <= 40, f"a million points allow 40 questions, you asked {len(calls)}"` },
        ],
        hints: ["While `lo < hi`, look at `mid = (lo + hi) // 2` and its right neighbour.", "If `ask(mid) < ask(mid + 1)` the peak is right of mid (`lo = mid + 1`), otherwise it is mid or left (`hi = mid`)."],
      },
      {
        kind: "recap",
        points: [
          "**Interactive** problems hide the data behind a question function with a budget, usually about log₂ n.",
          "Track what is still possible and make every question split it; yes/no answers at best **halve** it.",
          "First-true searches: `hi = mid` on yes, `lo = mid + 1` on no; ⌈log₂ n⌉ questions.",
          "A hill: compare `mid` with `mid + 1` to learn the side; 2 questions per halving.",
          "Never ask twice, handle n = 1 with no questions, and check the budget before you code.",
        ],
      },
    ],
  },
];
