import type { ConceptLesson } from "../../learn/types.ts";
import { TREE_HELP, TREE_SETUP } from "./iv-trees-a.ts";

/** Fenced Python block for lesson prose. */
const py = (code: string) => "~~~python\n" + code.trim() + "\n~~~";
/** Fenced plain-text block (diagrams, tables). */
const txt = (code: string) => "~~~text\n" + code.replace(/^\n+|\s+$/g, "") + "\n~~~";
/** Paragraphs joined with blank lines. */
const P = (...paras: string[]) => paras.join("\n\n");

// ── shared trace data ──
const BST_NODES = [
  { id: "20", label: "20" },
  { id: "10", label: "10", parent: "20", side: "L" as const },
  { id: "30", label: "30", parent: "20", side: "R" as const },
  { id: "5", label: "5", parent: "10", side: "L" as const },
  { id: "25", label: "25", parent: "10", side: "R" as const },
  { id: "26", label: "26", parent: "30", side: "L" as const },
  { id: "35", label: "35", parent: "30", side: "R" as const },
];
const BOUNDS_CODE = ["def ok(node, low, high):", "    if node is None: return True", "    if not (low < node.val < high): return False", "    return ok(node.left, low, node.val) and ok(node.right, node.val, high)"];

/** A heap drawn as a tree: node `i<k>` is list position k, labelled with its value. */
const heapTree = (values: number[]) =>
  values.map((v, i) => (i === 0 ? { id: "i0", label: String(v) } : { id: `i${i}`, label: String(v), parent: `i${(i - 1) >> 1}`, side: (i % 2 === 1 ? "L" : "R") as "L" | "R" }));
const SIFT_CODE = ["heap.append(x)", "i = len(heap) - 1", "while i > 0 and heap[(i - 1) // 2] > heap[i]:", "    p = (i - 1) // 2", "    heap[i], heap[p] = heap[p], heap[i]", "    i = p"];

const TRIE_BASE = [
  { id: "root", label: "·" },
  { id: "c", label: "c", parent: "root" },
  { id: "ca", label: "a", parent: "c" },
  { id: "car", label: "r", parent: "ca" },
];
const TRIE_FULL = [
  ...TRIE_BASE,
  { id: "cat", label: "t", parent: "ca" },
  { id: "cart", label: "t", parent: "car" },
  { id: "d", label: "d", parent: "root" },
  { id: "do", label: "o", parent: "d" },
  { id: "dog", label: "g", parent: "do" },
];
const TRIE_CODE = ["node = root", "for ch in word:", "    if ch not in node.kids:", "        node.kids[ch] = TrieNode()", "    node = node.kids[ch]", "node.end = True"];
const FLOOR_CODE = ["i = bisect_right(a, x)      # first value > x", "floor = a[i - 1] if i > 0 else None", "j = bisect_left(a, x)       # first value >= x", "ceiling = a[j] if j < len(a) else None"];

/** Lessons 6 to 9 of "Trees, heaps and tries". */
export const ivTreesLessonsB: ConceptLesson[] = [
  // ─────────────────────────────── 6. Binary search trees ───────────────────────────────
  {
    id: "fnd-iv-trees-6-bst",
    title: "Binary search trees: the whole-subtree rule",
    summary: "Validate with bounds, use in-order for sorted order and k-th smallest, and prune range queries.",
    minutes: 12,
    xp: 80,
    level: "Advanced",
    steps: [
      {
        kind: "explain",
        title: "Smaller left, bigger right, all the way down",
        body: P(
          "A **binary search tree** (BST) keeps one rule at every node: every value in its **left subtree** is smaller, and every value in its **right subtree** is bigger. (See *Data structures and algorithms* for search and insert.) Searching, inserting and deleting walk one path: **O(h)**, which is O(log n) when the tree is balanced and O(n) when it degenerates into a chain (for example after inserting sorted values).",
          "The rule is about **whole subtrees**, not just children. That is the classic trap when checking a BST: comparing each node only with its own children misses a value deep on the left that is bigger than an ancestor. The fix is to pass **bounds** down: going left, the current value becomes the new upper bound; going right, the new lower bound.",
          py(`
def ok(node, low, high):
    if node is None:
        return True
    if not (low < node.val < high):
        return False
    return ok(node.left, low, node.val) and ok(node.right, node.val, high)

ok(root, float("-inf"), float("inf"))
`),
          "Two more facts do a lot of work. An **in-order** walk of a BST visits values in **sorted order**, so the k-th smallest is the k-th node of an in-order walk (stop early). And a **range query** can **prune**: if a node is below the range, nothing on its left can be in it either.",
          "**How to spot it:** *BST*, *sorted order from a tree*, *k-th smallest*, *closest value*, *values between lo and hi*, *successor*, *validate*.",
        ),
      },
      {
        kind: "question",
        title: "Spot the broken rule",
        body: "Step through the bounds check on this tree. Every parent-child pair looks fine; one node still breaks the BST rule.",
        widget: {
          type: "iv-trace",
          props: {
            title: "Validating with bounds",
            frames: [
              { tree: { nodes: BST_NODES, active: ["20"] }, code: BOUNDS_CODE, line: 3, vars: { low: "-inf", high: "inf" }, note: "The root can be anything: 20 passes." },
              { tree: { active: ["10"], done: ["20"] }, line: 4, vars: { low: "-inf", high: 20 }, note: "Going left from 20: everything here must be below 20. 10 passes." },
              { tree: { active: ["5"], done: ["20", "10"] }, line: 3, vars: { low: "-inf", high: 10 }, note: "Left again: below 10. 5 passes." },
              { tree: { done: ["20", "10", "5"] }, line: 4, vars: { low: 10, high: 20 }, note: "Now 10's right child: it must be **above 10** and still **below 20**.", pick: { prompt: "Tap the node that breaks the rule.", answer: "25" } },
              { tree: { active: ["25"], done: ["20", "10", "5"] }, line: 3, vars: { low: 10, high: 20, "node.val": 25 }, note: "25 > 10 looks fine next to its parent, but 25 is on 20's **left**, and 25 > 20. Not a BST." },
            ],
          },
        },
        question: { type: "widget", goal: { picked: true }, prompt: "Answer the pick.", hint: "Every node on 20's left must be smaller than 20, however deep it is." },
        explanation: "Only the bounds catch it: 25 sits where only values between 10 and 20 may go. A check of each node against its children alone would say *valid*.",
      },
      {
        kind: "question",
        title: "The children-only check",
        body: "A check that only tests `node.left.val < node.val < node.right.val` at each node returns *valid* for the tree above. Which kind of mistake can it never catch?",
        question: {
          type: "choice",
          options: [
            "A left child that is bigger than its parent.",
            "A deep value on the wrong side of an ancestor.",
            "A right child that is smaller than its parent.",
            "A tree whose root has only one child.",
          ],
          answer: 1,
          hint: "Which nodes does the children-only check never compare with each other?",
        },
        explanation: "It never compares a node with its **grandparent** or anything higher, so a value that is fine locally but on the wrong side of an ancestor slips through. Bounds carry every ancestor's limit down.",
      },
      {
        kind: "question",
        title: "The third smallest",
        body: P(
          "Find the **3rd smallest** value in this BST.",
          txt(`
        41
       /  \\
     20    65
    /  \\     \\
  11    29    91
        /
      23
`),
        ),
        question: { type: "number", answer: 23, hint: "An in-order walk (left, node, right) lists the values in sorted order." },
        explanation: "In-order: 11, 20, **23**, 29, 41, 65, 91. A walk that counts nodes can stop at the third one without visiting the rest.",
      },
      {
        kind: "question",
        title: "Sorted inserts",
        body: "You insert 1, 2, 3, …, 10,000 into an empty plain BST (no rebalancing), then search for 10,000. How does the search behave?",
        question: {
          type: "choice",
          options: [
            "About 14 steps: O(log n).",
            "One step: the newest value sits at the root.",
            "About 100 steps: O(√n).",
            "About 10,000 steps: the tree is a chain.",
          ],
          answer: 3,
          hint: "Where does each new, bigger value go?",
        },
        explanation: "Each value is bigger than all before it, so it becomes the right child of the last one: a chain of height n. Search is **O(n)**. Balanced trees (red-black, AVL) rotate to keep the height O(log n).",
      },
      {
        kind: "code",
        title: "Check a search tree",
        body: P(
          "Write `is_bst(root)`: True if the tree follows the BST rule with **strictly** smaller values on the left and strictly bigger on the right (so duplicates make it False). An empty tree is a BST. Values can be negative.",
          TREE_HELP,
        ),
        language: "python",
        setup: TREE_SETUP,
        starter: `def is_bst(root):
    def ok(node, low, high):
        # every value must be strictly between low and high
        pass

    return ok(root, float("-inf"), float("inf"))
`,
        solution: `def is_bst(root):
    def ok(node, low, high):
        if node is None:
            return True
        if not (low < node.val < high):
            return False
        return ok(node.left, low, node.val) and ok(node.right, node.val, high)

    return ok(root, float("-inf"), float("inf"))
`,
        tests: [
          { id: "t1", description: "a valid tree", assertionCode: `_r = is_bst(build([20, 10, 30, 5, 15, 26, 35]))
assert _r is True, f"expected True, got {_r}"` },
          { id: "t2", description: "the deep trap", assertionCode: `_r = is_bst(build([20, 10, 30, 5, 25, 26, 35]))
assert _r is False, f"25 is on 20's left but bigger than 20: expected False, got {_r}"
_r = is_bst(build([20, 10, 30, 5, 15, 18, 35]))
assert _r is False, f"18 is on 20's right but smaller than 20: expected False, got {_r}"` },
          { id: "t3", description: "duplicates are not allowed", assertionCode: `_r = is_bst(build([5, 5]))
assert _r is False, f"a left child equal to its parent is not strictly smaller: expected False, got {_r}"
_r = is_bst(build([5, None, 5]))
assert _r is False, f"expected False, got {_r}"` },
          { id: "t4", description: "negative values and an empty tree", assertionCode: `_r = is_bst(build([-3, -7, 4, -9, -5]))
assert _r is True, f"expected True: start the bounds at -inf and inf, not 0; got {_r}"
_r = is_bst(None)
assert _r is True, f"an empty tree is a BST, got {_r}"` },
        ],
        hints: ["`ok(None, ...)` is True. A node fails if it is not strictly between `low` and `high`.", "Going left the upper bound becomes `node.val`; going right the lower bound does."],
      },
      {
        kind: "code",
        title: "Sum of a price range",
        body: P(
          "A BST holds product prices. Write `sum_in_range(root, lo, hi)`: the total of all values `v` with `lo <= v <= hi`. **Prune**: when a node is below `lo`, skip its left subtree; when it is above `hi`, skip its right subtree.",
          "The last test asks 2,000 narrow questions of a tree with 65,535 nodes: walking the whole tree each time would take minutes.",
          TREE_HELP,
        ),
        language: "python",
        setup: TREE_SETUP,
        starter: `def sum_in_range(root, lo, hi):
    # only go left when node.val > lo, only go right when node.val < hi
    pass
`,
        solution: `def sum_in_range(root, lo, hi):
    if root is None:
        return 0
    total = root.val if lo <= root.val <= hi else 0
    if root.val > lo:
        total += sum_in_range(root.left, lo, hi)
    if root.val < hi:
        total += sum_in_range(root.right, lo, hi)
    return total
`,
        tests: [
          { id: "t1", description: "a small tree", assertionCode: `_t = build([10, 5, 15, 3, 7, None, 18])
_r = sum_in_range(_t, 7, 15)
assert _r == 32, f"7 + 10 + 15 = 32, got {_r}"
_r = sum_in_range(_t, 0, 100)
assert _r == 58, f"everything: 58, got {_r}"` },
          { id: "t2", description: "nothing in range, and an empty tree", assertionCode: `_t = build([10, 5, 15, 3, 7, None, 18])
_r = sum_in_range(_t, 11, 14)
assert _r == 0, f"no value is between 11 and 14, got {_r}"
_r = sum_in_range(None, 1, 5)
assert _r == 0, f"an empty tree gives 0, got {_r}"
_r = sum_in_range(_t, 3, 3)
assert _r == 3, f"just the 3, got {_r}"` },
          { id: "t3", description: "2,000 narrow ranges on 65,535 nodes", assertionCode: `def _bal(lo, hi):
    if lo > hi:
        return None
    m = (lo + hi) // 2
    return Node(m * 2, _bal(lo, m - 1), _bal(m + 1, hi))
_t = _bal(0, 65534)
for _q in range(2000):
    _a = (_q * 97) % 130000
    _want = sum(range(_a + _a % 2, _a + 21, 2))
    _r = sum_in_range(_t, _a, _a + 20)
    assert _r == _want, f"sum_in_range(t, {_a}, {_a + 20}) should be {_want}, got {_r}"` },
        ],
        hints: ["Add the node's value only if it is inside `[lo, hi]`.", "Recurse left only if `node.val > lo`, and right only if `node.val < hi`."],
      },
      {
        kind: "recap",
        points: [
          "BST rule: **every** value in the left subtree is smaller, every value in the right subtree bigger.",
          "Validate by passing **bounds** down; checking only children misses deep mistakes.",
          "**In-order** is sorted order: k-th smallest is the k-th in-order node. Range queries **prune** whole subtrees.",
          "Operations are O(h): log n when balanced, n for a chain (sorted inserts without rebalancing).",
        ],
      },
    ],
  },

  // ─────────────────────────────── 7. Heaps ───────────────────────────────
  {
    id: "fnd-iv-trees-7-heap",
    title: "Heaps and priority queues",
    summary: "A tree packed into a list: push and pop in O(log n), top-k with a small heap, and k-way merging.",
    minutes: 13,
    xp: 80,
    level: "Advanced",
    steps: [
      {
        kind: "explain",
        title: "Always know the smallest",
        body: P(
          "A **priority queue** hands you the smallest (or largest) item whenever you ask, while items keep arriving. A **binary heap** does it with a complete binary tree stored in a plain list: the children of position `i` are `2i + 1` and `2i + 2`, and its parent is `(i - 1) // 2`. The **heap rule**: every parent is ≤ its children, so the smallest item is always at index 0.",
          "- **push**: append at the end, then **sift up**: swap with the parent while the parent is bigger. O(log n).\n- **pop**: take index 0, move the last item to the top, then **sift down**: swap with the smaller child while it is bigger. O(log n).\n- **peek** at index 0: O(1). **heapify** a whole list: O(n).",
          "Python's `heapq` works on a normal list and is a **min-heap**. For a max-heap, push `-x`. To order records, push tuples `(priority, tie_breaker, item)`.",
          py(`
import heapq
h = []
heapq.heappush(h, 5); heapq.heappush(h, 2); heapq.heappush(h, 8)
heapq.heappop(h)       # 2
h[0]                   # 5, the smallest left
`),
          "Patterns: **top k** with a heap of size k, O(n log k); **k-way merge** of sorted lists, O(N log k); *always process the earliest or cheapest next* (schedulers, Dijkstra); two heaps for a **running median**.",
          "**How to spot it:** *k largest*, *k closest*, *merge k sorted*, *next earliest*, *cheapest so far*, *median of a stream*.",
        ),
      },
      {
        kind: "question",
        title: "Push and pop",
        body: "The heap `[3, 5, 4, 9, 7, 8]` is shown as a list and as the tree it stands for. Step through a push and a pop and answer the picks.",
        widget: {
          type: "iv-trace",
          props: {
            title: "Sift up, sift down",
            frames: [
              { array: [3, 5, 4, 9, 7, 8], tree: { nodes: heapTree([3, 5, 4, 9, 7, 8]), active: ["i0"] }, code: SIFT_CODE, line: 1, note: "Each parent is ≤ its children; the smallest, 3, is at the root." },
              { array: [3, 5, 4, 9, 7, 8, 2], highlight: [6], tree: { nodes: heapTree([3, 5, 4, 9, 7, 8, 2]), active: ["i6"] }, line: 3, vars: { i: 6 }, note: "Push 2: it goes at the end, index 6.", pick: { prompt: "Which position is 2 compared with first?", answer: "i2" } },
              { array: [3, 5, 2, 9, 7, 8, 4], highlight: [2], tree: { nodes: heapTree([3, 5, 2, 9, 7, 8, 4]), active: ["i2"] }, line: 5, vars: { i: 2 }, note: "Parent `(6 - 1) // 2 = 2` holds 4 > 2: swap." },
              { line: 3, vars: { i: 2 }, note: "Keep sifting up.", pick: { prompt: "Which position is compared next?", answer: "i0" } },
              { array: [2, 5, 3, 9, 7, 8, 4], highlight: [0], tree: { nodes: heapTree([2, 5, 3, 9, 7, 8, 4]), active: ["i0"] }, line: 6, vars: { i: 0 }, note: "3 > 2: swap again. 2 is the new root after 2 swaps: never more than the heap's height." },
              { array: [4, 5, 3, 9, 7, 8], highlight: [0], tree: { nodes: heapTree([4, 5, 3, 9, 7, 8]), active: ["i0"] }, vars: { popped: 2 }, note: "Pop: take the 2, move the last item (4) to the root, and sift it down.", pick: { prompt: "Which child does 4 swap with?", answer: "i2" } },
              { array: [3, 5, 4, 9, 7, 8], highlight: [2], tree: { nodes: heapTree([3, 5, 4, 9, 7, 8]), active: ["i2"], done: ["i0"] }, vars: { popped: 2 }, note: "Swap with the **smaller** child, 3. 4's only child is 8, so it stops: the heap is back." },
            ],
          },
        },
        question: { type: "widget", goal: { picked: true }, prompt: "Answer the three picks.", hint: "The parent of position i is `(i - 1) // 2`; sifting down swaps with the smaller child." },
        explanation: "Both moves walk one path between the root and a leaf: **O(log n)**. Swapping with the smaller child is what keeps the parent ≤ both children.",
      },
      {
        kind: "question",
        title: "Parents in a list",
        body: "In a heap stored as a list, find the index of the parent of the item at index **13**.",
        question: { type: "number", answer: 6, hint: "Use `(i - 1) // 2`." },
        explanation: "`(13 - 1) // 2 =` **6**. Check: the children of 6 are `2 · 6 + 1 = 13` and `14`. No pointers are needed; the shape is all arithmetic.",
      },
      {
        kind: "question",
        title: "The k largest",
        body: "To keep the **k largest** of a million numbers as they stream past, you keep a heap of size k. Which kind, and why?",
        question: {
          type: "choice",
          options: [
            "A min-heap: its top is the weakest of the k kept.",
            "A max-heap: its top is the largest seen.",
            "A min-heap of all million numbers.",
            "A max-heap of size k, popped at the end.",
          ],
          answer: 0,
          feedback: { 1: "Knowing the largest does not tell you which kept item to throw out.", 2: "That works but costs O(n) memory and O(n log n) time." },
          hint: "When a new number arrives, which of the k kept numbers might it replace?",
        },
        explanation: "A new number belongs in the top k only if it beats the **smallest** kept one, which a min-heap shows at index 0. Replace it in O(log k): **O(n log k)** total with only k items in memory.",
      },
      {
        kind: "question",
        title: "Building a heap",
        body: "You have n numbers in a list and want a heap. What does `heapq.heapify(list)` cost, compared with n pushes?",
        question: {
          type: "choice",
          options: [
            "Both O(n log n)",
            "Both O(n)",
            "heapify O(n), n pushes O(n log n)",
            "heapify O(n log n), pushes O(n)",
          ],
          answer: 2,
          hint: "Most nodes of a heap are near the bottom, where sifting down is short.",
        },
        explanation: "heapify sifts down from the middle of the list backwards. Half the nodes are leaves (no work), a quarter move at most one level, and so on: the sum is **O(n)**. n separate pushes are O(n log n).",
      },
      {
        kind: "code",
        title: "The k biggest orders",
        body: "Write `k_largest(nums, k)`: the `k` largest values, biggest first. Keep a **min-heap of size k** while you read the numbers once. `k = 0` gives `[]`, and if `k` is bigger than the list, return everything.",
        language: "python",
        starter: `import heapq

def k_largest(nums, k):
    heap = []
    # keep at most k items; the smallest kept one is heap[0]
    pass
`,
        solution: `import heapq

def k_largest(nums, k):
    if k <= 0:
        return []
    heap = []
    for x in nums:
        if len(heap) < k:
            heapq.heappush(heap, x)
        elif x > heap[0]:
            heapq.heapreplace(heap, x)
    return sorted(heap, reverse=True)
`,
        tests: [
          { id: "t1", description: "a few orders", assertionCode: `_r = k_largest([5, 1, 9, 3, 7], 2)
assert _r == [9, 7], f"expected [9, 7], got {_r}"` },
          { id: "t2", description: "duplicates and negatives", assertionCode: `_r = k_largest([4, -1, 4, 4, -8], 2)
assert _r == [4, 4], f"expected [4, 4], got {_r}"
_r = k_largest([-5, -2, -9], 1)
assert _r == [-2], f"expected [-2], got {_r}"` },
          { id: "t3", description: "k = 0 and k bigger than the list", assertionCode: `_r = k_largest([3, 1, 2], 5)
assert _r == [3, 2, 1], f"expected everything, biggest first: [3, 2, 1], got {_r}"
_r = k_largest([3, 1, 2], 0)
assert _r == [], f"k = 0 gives [], got {_r}"` },
          { id: "t4", description: "200,000 orders", assertionCode: `_xs = [(i * 7919) % 1000003 for i in range(200000)]
_r = k_largest(_xs, 5)
assert _r == sorted(_xs, reverse=True)[:5], f"expected {sorted(_xs, reverse=True)[:5]}, got {_r}"` },
        ],
        hints: ["Push while the heap has fewer than `k` items.", "After that, if `x > heap[0]`, `heapq.heapreplace(heap, x)` pops the smallest and pushes `x`. Return `sorted(heap, reverse=True)`."],
      },
      {
        kind: "code",
        title: "Merge the feeds",
        body: P(
          "Several sensors each send a **sorted** list of timestamps. Write `merge_feeds(feeds)`: one sorted list with every timestamp. Keep a heap with the **front** item of each feed as `(value, feed_index, position)`; pop the smallest, then push the next item from the same feed.",
          "With N timestamps in k feeds that is **O(N log k)**.",
        ),
        language: "python",
        starter: `import heapq

def merge_feeds(feeds):
    heap = []
    # push (feed[0], i, 0) for each non-empty feed, then pop and refill
    pass
`,
        solution: `import heapq

def merge_feeds(feeds):
    heap = [(feed[0], i, 0) for i, feed in enumerate(feeds) if feed]
    heapq.heapify(heap)
    out = []
    while heap:
        value, i, pos = heapq.heappop(heap)
        out.append(value)
        if pos + 1 < len(feeds[i]):
            heapq.heappush(heap, (feeds[i][pos + 1], i, pos + 1))
    return out
`,
        tests: [
          { id: "t1", description: "three feeds", assertionCode: `_r = merge_feeds([[1, 4, 9], [2, 3, 10], [5]])
assert _r == [1, 2, 3, 4, 5, 9, 10], f"expected [1, 2, 3, 4, 5, 9, 10], got {_r}"` },
          { id: "t2", description: "empty feeds and duplicates", assertionCode: `_r = merge_feeds([[], [3, 3], [], [1, 3]])
assert _r == [1, 3, 3, 3], f"expected [1, 3, 3, 3], got {_r}: skip empty feeds"
_r = merge_feeds([])
assert _r == [], f"no feeds gives [], got {_r}"` },
          { id: "t3", description: "one feed", assertionCode: `_r = merge_feeds([[2, 5, 8]])
assert _r == [2, 5, 8], f"expected [2, 5, 8], got {_r}"` },
          { id: "t4", description: "500 feeds of 200", assertionCode: `_feeds = [sorted((i * 31 + j * 7919) % 100003 for j in range(200)) for i in range(500)]
_r = merge_feeds(_feeds)
assert _r == sorted(x for f in _feeds for x in f), "500 feeds should merge into one sorted list"` },
        ],
        hints: ["Start the heap with `(feed[0], i, 0)` for every feed that is not empty.", "Pop `(value, i, pos)`, append `value`, and if feed `i` has an item at `pos + 1`, push it."],
      },
      {
        kind: "recap",
        points: [
          "A **binary heap** is a complete tree in a list: children of `i` at `2i + 1`, `2i + 2`; parent at `(i - 1) // 2`.",
          "push and pop are **O(log n)** (sift up, sift down with the smaller child), peek O(1), heapify O(n).",
          "`heapq` is a min-heap: negate for max, use tuples for priorities with tie-breakers.",
          "Top k: a **min-heap of size k**, O(n log k). Merging k sorted lists: a heap of fronts, O(N log k).",
        ],
      },
    ],
  },

  // ─────────────────────────────── 8. Tries ───────────────────────────────
  {
    id: "fnd-iv-trees-8-trie",
    title: "Tries: trees of prefixes",
    summary: "One letter per edge: insert and look up in O(length), count words by prefix, and autocomplete.",
    minutes: 12,
    xp: 80,
    level: "Advanced",
    steps: [
      {
        kind: "explain",
        title: "Spell your way down",
        body: P(
          "A **trie** (from re*trie*val, often said *try*) stores words in a tree where each edge is one letter. The path from the root spells a **prefix**; a node is flagged when a whole word ends there. Words that share a beginning share nodes: *car*, *cart* and *cat* all go through `c` and `ca`.",
          py(`
class TrieNode:
    def __init__(self):
        self.kids = {}      # letter -> TrieNode
        self.end = False    # does a word end here?
`),
          "Inserting or looking up a word of length L walks L nodes: **O(L)**, however many words are stored. Memory is at most one node per letter of all words, less when they share prefixes.",
          "A hash set can also say *is this word here?* in O(L), but not *how many words start with `ca`?* or *list every word starting with `ca`* without scanning everything. A trie answers prefix questions by walking to the prefix's node and looking only below it. Store a **count** in each node (words passing through) and prefix counts are O(L) too.",
          "**How to spot it:** *prefix*, *starts with*, *autocomplete*, *dictionary of words*, *word search on a grid with many words*, *longest common prefix*. (Bits work too: a trie over binary digits answers *maximum XOR* questions.)",
        ),
      },
      {
        kind: "question",
        title: "Build and search",
        body: "Insert *car*, *cat*, *cart* and *dog*, then run two searches. Greyed nodes are word ends.",
        widget: {
          type: "iv-trace",
          props: {
            title: "A trie of four words",
            frames: [
              { tree: { nodes: TRIE_BASE, active: ["c", "ca", "car"], done: ["car"] }, code: TRIE_CODE, line: 6, vars: { word: "car" }, note: "Insert *car*: three new nodes; the last one is marked as a word end." },
              { tree: { active: ["c"], done: ["car"] }, line: 5, vars: { word: "cat" }, note: "Insert *cat*: `c` and `a` already exist, so walk down them.", pick: { prompt: "Which node does the new `t` hang from?", answer: "ca" } },
              { tree: { nodes: TRIE_FULL, active: ["cat", "cart", "dog"], done: ["car", "cat", "cart", "dog"] }, line: 6, vars: { word: "cart, dog" }, note: "*cat* adds one node, *cart* one under `car`, *dog* a new branch of three." },
              { tree: { active: ["root", "c", "ca"], done: ["car", "cat", "cart", "dog"] }, line: 5, vars: { search: "ca" }, note: "Search *ca*: the path exists, but `ca` is not a word end. Not a word, though it **is** a prefix of three words." },
              { tree: { active: ["root"], done: ["car", "cat", "cart", "dog"] }, line: 3, vars: { search: "cop" }, note: "Search *cop*: follow the letters while you can.", pick: { prompt: "Tap the last node the search reaches before it falls off.", answer: "c" } },
              { tree: { active: ["c"], done: ["car", "cat", "cart", "dog"] }, line: 3, vars: { search: "cop", found: false }, note: "`c` has no child `o`: *cop* is not stored, after one step, without looking at any other word." },
            ],
          },
        },
        question: { type: "widget", goal: { picked: true }, prompt: "Answer both picks.", hint: "Follow one letter per edge from the root; a word shares nodes with earlier words for as long as their letters agree." },
        explanation: "Every operation follows the letters of one word, so its cost depends on the word's length, not on how many words are stored.",
      },
      {
        kind: "question",
        title: "Count the nodes",
        body: "Insert *tea*, *ten*, *to* and *inn* into an empty trie. How many nodes are there, **not** counting the root?",
        question: { type: "number", answer: 8, hint: "Shared prefixes share nodes: list the distinct prefixes.", unit: "nodes" },
        explanation: "The distinct prefixes are t, te, tea, ten, to, i, in, inn: **8** nodes, against 11 letters in total. The saving grows with many words sharing beginnings.",
      },
      {
        kind: "question",
        title: "A word or a prefix?",
        body: "After inserting only *cart*, what do `has(\"car\")` and `starts_with(\"car\")` return?",
        question: {
          type: "choice",
          options: [
            "Both True: the letters are all there.",
            "`has` is False, `starts_with` is True.",
            "`has` is True, `starts_with` is False.",
            "Both False: car was never inserted.",
          ],
          answer: 1,
          hint: "Both walk to the same node. What does `has` check there that `starts_with` does not?",
        },
        explanation: "Both reach the `r` node. `starts_with` only needs the path to exist; `has` also needs the node's **end** flag, which only `t` has. Forgetting the flag is the classic trie bug.",
      },
      {
        kind: "question",
        title: "The cost",
        body: "A trie holds a million words. What does looking up one word of length L cost?",
        question: {
          type: "choice",
          options: ["O(log n), like a balanced tree", "O(n · L): every word is checked", "O(n), one step per word", "O(L), one step per letter"],
          answer: 3,
          hint: "How many nodes does a lookup visit?",
        },
        explanation: "One node per letter: **O(L)**, the same with ten words or a million. That is why tries power autocomplete and spell checkers.",
      },
      {
        kind: "code",
        title: "A word book",
        body: P(
          "Write a trie class `WordBook` with:",
          "- `add(word)`: store the word (adding a word that is already stored changes nothing);\n- `has(word)`: True only if that exact word was added;\n- `count_prefix(prefix)`: how many stored words start with `prefix` (the empty prefix counts all of them).",
          "Keep a counter in every node of how many words pass through it, so `count_prefix` only walks the prefix. The last test adds 20,000 words and asks 20,000 questions.",
        ),
        language: "python",
        starter: `class TrieNode:
    def __init__(self):
        self.kids = {}
        self.end = False
        self.passing = 0   # how many stored words go through this node

class WordBook:
    def __init__(self):
        self.root = TrieNode()

    def add(self, word):
        pass

    def has(self, word):
        pass

    def count_prefix(self, prefix):
        pass
`,
        solution: `class TrieNode:
    def __init__(self):
        self.kids = {}
        self.end = False
        self.passing = 0

class WordBook:
    def __init__(self):
        self.root = TrieNode()

    def _walk(self, s):
        node = self.root
        for ch in s:
            node = node.kids.get(ch)
            if node is None:
                return None
        return node

    def add(self, word):
        if self.has(word):
            return
        node = self.root
        node.passing += 1
        for ch in word:
            if ch not in node.kids:
                node.kids[ch] = TrieNode()
            node = node.kids[ch]
            node.passing += 1
        node.end = True

    def has(self, word):
        node = self._walk(word)
        return node is not None and node.end

    def count_prefix(self, prefix):
        node = self._walk(prefix)
        return 0 if node is None else node.passing
`,
        tests: [
          { id: "t1", description: "words and prefixes", assertionCode: `_b = WordBook()
for _w in ["car", "cat", "cart", "dog"]:
    _b.add(_w)
assert _b.has("cart") is True and _b.has("dog") is True, "cart and dog were added"
assert not _b.has("ca"), "ca is only a prefix, not a word: check the end flag"
assert not _b.has("cars"), "cars was never added"` },
          { id: "t2", description: "counting by prefix", assertionCode: `_b = WordBook()
for _w in ["car", "cat", "cart", "dog"]:
    _b.add(_w)
for _p, _want in [("ca", 3), ("car", 2), ("d", 1), ("x", 0), ("cart", 1), ("", 4)]:
    _r = _b.count_prefix(_p)
    assert _r == _want, f"count_prefix({_p!r}) should be {_want}, got {_r}"` },
          { id: "t3", description: "adding a word twice", assertionCode: `_b = WordBook()
_b.add("tea")
_b.add("tea")
_b.add("ten")
_r = _b.count_prefix("te")
assert _r == 2, f"tea was added twice but stored once: expected 2, got {_r}"` },
          { id: "t4", description: "20,000 words, 20,000 questions", assertionCode: `from collections import Counter as _C
_words = ["".join("abcdefgh"[(i * k * 7 + k * k) % 8] for k in range(1, 7)) for i in range(20000)]
_b = WordBook()
for _w in _words:
    _b.add(_w)
_pref = _C(w[:j] for w in set(_words) for j in range(1, 4))
for _i in range(20000):
    _p = _words[_i][: 1 + _i % 3]
    _r = _b.count_prefix(_p)
    assert _r == _pref[_p], f"count_prefix({_p!r}) should be {_pref[_p]}, got {_r}"` },
        ],
        hints: ["Write a helper that walks the letters of a string and returns the node it ends on, or None.", "In `add`, return early if the word is already there; otherwise add 1 to `passing` on the root and on every node along the word, and set `end` on the last."],
      },
      {
        kind: "code",
        title: "Autocomplete",
        body: P(
          "Write `suggest(words, prefix, limit=3)`: build a trie of `words`, walk to the prefix, and return up to `limit` stored words that start with it, in **alphabetical** order. Visit children in sorted letter order and stop once you have enough.",
          py(`
suggest(["car", "card", "care", "cat", "dog"], "ca")   # ["car", "card", "care"]
`),
        ),
        language: "python",
        starter: `def suggest(words, prefix, limit=3):
    root = {}
    END = "$"            # key that marks a word end inside a node dict
    # 1. insert every word (nested dicts)
    # 2. walk to the prefix
    # 3. depth-first in sorted order, collecting words
    pass
`,
        solution: `def suggest(words, prefix, limit=3):
    root = {}
    END = "$"
    for w in words:
        node = root
        for ch in w:
            node = node.setdefault(ch, {})
        node[END] = True
    node = root
    for ch in prefix:
        if ch not in node:
            return []
        node = node[ch]
    out = []

    def dfs(node, path):
        if len(out) == limit:
            return
        if END in node:
            out.append(path)
        for ch in sorted(k for k in node if k != END):
            dfs(node[ch], path + ch)

    dfs(node, prefix)
    return out
`,
        tests: [
          { id: "t1", description: "the example", assertionCode: `_r = suggest(["car", "card", "care", "cat", "dog"], "ca")
assert _r == ["car", "card", "care"], f"expected ['car', 'card', 'care'], got {_r}"` },
          { id: "t2", description: "a bigger limit, and the prefix itself is a word", assertionCode: `_r = suggest(["cat", "car", "dog", "care", "card"], "c", limit=10)
assert _r == ["car", "card", "care", "cat"], f"expected ['car', 'card', 'care', 'cat'], got {_r}"
_r = suggest(["do", "dog", "dot"], "do")
assert _r == ["do", "dog", "dot"], f"expected ['do', 'dog', 'dot'], got {_r}"` },
          { id: "t3", description: "no match", assertionCode: `_r = suggest(["car", "dog"], "x")
assert _r == [], f"expected [], got {_r}"
_r = suggest(["car"], "cars")
assert _r == [], f"expected [], got {_r}"` },
        ],
        hints: ["Insert with `node = node.setdefault(ch, {})` and mark the end with `node[END] = True`.", "From the prefix's node, depth-first: record `path` when `END in node`, then visit `sorted` child letters, stopping when you have `limit` words."],
      },
      {
        kind: "recap",
        points: [
          "A **trie** stores words one letter per edge; shared prefixes share nodes; an **end** flag marks whole words.",
          "Insert and lookup cost **O(L)** for a word of length L, independent of how many words are stored.",
          "A **count per node** answers *how many words start with p* in O(L); a sorted DFS below the prefix gives autocomplete.",
          "Spot it: *prefix*, *starts with*, *autocomplete*, *many words at once*. Pitfall: confusing *is a word* with *is a prefix*.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 9. Ordered sets ───────────────────────────────
  {
    id: "fnd-iv-trees-9-ordered-set",
    title: "Ordered sets: floor, ceiling and neighbours",
    summary: "Keep values sorted while they change: floor and ceiling queries, booking checks, nearest earlier values.",
    minutes: 13,
    xp: 90,
    level: "Professional",
    steps: [
      {
        kind: "explain",
        title: "A set that stays sorted",
        body: P(
          "A hash set answers *is x here?* but knows nothing about order. An **ordered set** keeps its values sorted while you insert and delete, and answers the questions a hash set cannot:",
          "- **floor(x)**: the largest value ≤ x; **ceiling(x)**: the smallest value ≥ x;\n- the minimum, the maximum, and the values in order;\n- the neighbours of a value (its predecessor and successor).",
          "In Java this is `TreeSet`/`TreeMap` and in C++ `std::set`/`std::map`: a balanced binary search tree (a red-black tree) with every operation in **O(log n)**.",
          "Python has no built-in one. The usual tool is a **sorted list plus `bisect`**: finding a position is O(log n), and `bisect.insort` inserts at that position, which shifts the items after it: O(n) in theory, but a fast memory move, fine for up to about 10⁵ items. (Many judges also offer the third-party `sortedcontainers.SortedList` with O(log n) operations.) A heap is not a substitute: it knows its minimum, but cannot answer floor or delete an arbitrary item quickly.",
          py(`
from bisect import bisect_left, bisect_right, insort
a = [3, 8, 12, 17, 25, 31]
i = bisect_right(a, 20); a[i - 1]   # floor(20) = 17
j = bisect_left(a, 20);  a[j]       # ceiling(20) = 25
insort(a, 20)                       # [3, 8, 12, 17, 20, 25, 31]
`),
          "**How to spot it:** *closest existing value*, *next larger*, *does the new interval overlap any booked one*, *nearest earlier reading*, *k-th in a changing set*, *sliding window with order*.",
        ),
      },
      {
        kind: "question",
        title: "Floor and ceiling",
        body: "Step through floor and ceiling queries on a sorted list and answer the picks.",
        widget: {
          type: "iv-trace",
          props: {
            title: "bisect on a sorted list",
            frames: [
              { array: [3, 8, 12, 17, 25, 31], code: FLOOR_CODE, line: 1, vars: { x: 20 }, note: "Query `x = 20`. It is not in the list.", pick: { prompt: "Tap the floor of 20: the largest value ≤ 20.", answer: 3 } },
              { pointers: { i: 4 }, highlight: [3], line: 2, vars: { x: 20, i: 4, floor: 17 }, note: "`bisect_right` gives `i = 4`, the first value above 20, so the floor is just before it: `a[3] = 17`." },
              { pointers: { i: 4 }, line: 3, vars: { x: 20, floor: 17 }, note: "Now the ceiling.", pick: { prompt: "Tap the ceiling of 20: the smallest value ≥ 20.", answer: 4 } },
              { pointers: { j: 4 }, highlight: [4], line: 4, vars: { x: 20, floor: 17, ceiling: 25 }, note: "`bisect_left` gives `j = 4`: `a[4] = 25`." },
              { line: 1, vars: { x: 12 }, note: "Query `x = 12`, which **is** in the list.", pick: { prompt: "Tap the floor of 12.", answer: 2 } },
              { pointers: { i: 3 }, highlight: [2], line: 2, vars: { x: 12, i: 3, floor: 12 }, note: "`bisect_right(a, 12) = 3`, so the floor is `a[2] = 12` itself. Floor and ceiling of a present value are the value." },
              { array: [3, 8, 12, 17, 20, 25, 31], highlight: [4], done: [5, 6], vars: { inserted: 20 }, note: "`insort(a, 20)` finds index 4 in O(log n) and shifts 25 and 31 right." },
            ],
          },
        },
        question: { type: "widget", goal: { picked: true }, prompt: "Answer the three picks.", hint: "Floor: the last value that is not bigger than x. Ceiling: the first value that is not smaller than x." },
        explanation: "`bisect_right(a, x) - 1` is the floor's index and `bisect_left(a, x)` the ceiling's. Check both ends: no floor when the index is −1, no ceiling when it equals `len(a)`.",
      },
      {
        kind: "question",
        title: "Which structure?",
        body: "You need to insert values, delete **any** value, and ask *what is the smallest value ≥ x?*, all in O(log n). Which structure fits?",
        question: {
          type: "choice",
          options: ["A balanced binary search tree", "A binary min-heap of the values", "A hash set of the values", "A plain unsorted Python list"],
          answer: 0,
          feedback: { 1: "A heap only knows its minimum; ceiling(x) would need a full scan.", 2: "A hash set has no order at all.", 3: "Every query would be a scan: O(n)." },
          hint: "Which of these keeps the values in order?",
        },
        explanation: "A **balanced BST** (what `TreeSet` and `std::set` are) does all three in O(log n). In Python you approximate it with a sorted list and `bisect`, or `SortedList`.",
      },
      {
        kind: "question",
        title: "Upper bound by hand",
        body: "Find `bisect_right([2, 4, 4, 4, 9], 4)`.",
        question: { type: "number", answer: 4, hint: "The first index whose value is bigger than 4." },
        explanation: "The 4s are at indexes 1 to 3, so the first value above 4 is the 9 at index **4**. The floor of 4 is then `a[3]`, the last 4.",
      },
      {
        kind: "question",
        title: "The cost of insort",
        body: "What does one `bisect.insort(a, x)` cost on a Python list of n items?",
        question: {
          type: "choice",
          options: [
            "O(1): appending is constant time.",
            "O(log n) in total.",
            "O(log n) to find, O(n) to shift.",
            "O(n log n): it re-sorts the list.",
          ],
          answer: 2,
          hint: "Finding the spot is a binary search. What has to happen to the items after it?",
        },
        explanation: "The binary search is **O(log n)**, but inserting into the middle of a list shifts everything after it: **O(n)**. That shift is a fast block copy, so it is fine for interview sizes; a balanced tree would make the whole thing O(log n).",
      },
      {
        kind: "code",
        title: "Book the studio",
        body: P(
          "A recording studio takes half-open bookings `[start, end)`. Write a class `Studio` with `book(start, end)`: if the booking overlaps none of the accepted ones, accept it and return True; otherwise return False. Touching is fine: `[10, 20)` and `[20, 30)` do not overlap.",
          "Keep the accepted starts (and their ends) sorted. Only the two **neighbours** of the new start can overlap it: the booking just before (does it end after `start`?) and the one just after (does it begin before `end`?). The last test makes 22,000 requests.",
        ),
        language: "python",
        starter: `import bisect

class Studio:
    def __init__(self):
        self.starts = []   # sorted
        self.ends = []     # ends[i] belongs to starts[i]

    def book(self, start, end):
        # find where start would go, check the neighbour on each side
        pass
`,
        solution: `import bisect

class Studio:
    def __init__(self):
        self.starts = []
        self.ends = []

    def book(self, start, end):
        i = bisect.bisect_right(self.starts, start)
        if i > 0 and self.ends[i - 1] > start:
            return False
        if i < len(self.starts) and self.starts[i] < end:
            return False
        self.starts.insert(i, start)
        self.ends.insert(i, end)
        return True
`,
        tests: [
          { id: "t1", description: "accept, reject, touch", assertionCode: `_s = Studio()
for _b, _want in [((10, 20), True), ((15, 25), False), ((20, 30), True), ((5, 10), True), ((5, 11), False), ((9, 10), False)]:
    _r = _s.book(*_b)
    assert _r is _want, f"book{_b} should be {_want}, got {_r}"` },
          { id: "t2", description: "a booking inside or around another", assertionCode: `_s = Studio()
assert _s.book(100, 200) is True, "the first booking is always accepted"
for _b in [(120, 130), (50, 300), (100, 200), (199, 201)]:
    _r = _s.book(*_b)
    assert _r is False, f"book{_b} overlaps [100, 200), expected False, got {_r}"
assert _s.book(0, 100) is True and _s.book(200, 250) is True, "bookings that only touch are fine"` },
          { id: "t3", description: "out-of-order requests", assertionCode: `_s = Studio()
_got = [_s.book(*b) for b in [(50, 60), (10, 20), (30, 40), (20, 30), (35, 36), (0, 10)]]
assert _got == [True, True, True, True, False, True], f"expected [True, True, True, True, False, True], got {_got}"` },
          { id: "t4", description: "22,000 requests", assertionCode: `_s = Studio()
for _i in range(20000):
    _st = ((_i * 7919) % 20000) * 10
    assert _s.book(_st, _st + 5) is True, f"[{_st}, {_st + 5}) overlaps nothing"
for _i in range(2000):
    _st = ((_i * 13) % 20000) * 10 + 2
    assert _s.book(_st, _st + 1) is False, f"[{_st}, {_st + 1}) lies inside an accepted booking"` },
        ],
        hints: ["`i = bisect.bisect_right(self.starts, start)`: bookings before `i` start at or before `start`.", "Reject if `self.ends[i - 1] > start` or `self.starts[i] < end` (check that those indexes exist), otherwise insert at `i` in both lists."],
      },
      {
        kind: "code",
        title: "The nearest earlier reading",
        body: P(
          "A thermometer logs whole-number readings. For each reading after the first, find how close it is to the **nearest earlier** reading. Write `closest_earlier(readings)`: a list of the same length with `None` first, then the smallest absolute difference to any earlier reading.",
          py(`
closest_earlier([5, 1, 9, 6])   # [None, 4, 4, 1]
`),
          "Keep the earlier readings in a sorted list; only the floor and ceiling of the new reading matter. The last test has 20,000 readings: comparing with all earlier ones is 200 million checks.",
        ),
        language: "python",
        starter: `import bisect

def closest_earlier(readings):
    seen, out = [], []
    # for each reading: look at its neighbours in seen, then insort it
    pass
`,
        solution: `import bisect

def closest_earlier(readings):
    seen, out = [], []
    for r in readings:
        if not seen:
            out.append(None)
        else:
            j = bisect.bisect_left(seen, r)
            best = None
            for k in (j - 1, j):
                if 0 <= k < len(seen):
                    d = abs(seen[k] - r)
                    if best is None or d < best:
                        best = d
            out.append(best)
        bisect.insort(seen, r)
    return out
`,
        tests: [
          { id: "t1", description: "the example", assertionCode: `_r = closest_earlier([5, 1, 9, 6])
assert _r == [None, 4, 4, 1], f"expected [None, 4, 4, 1], got {_r}"` },
          { id: "t2", description: "repeats and negatives", assertionCode: `_r = closest_earlier([3, 3, -2, 10, -1])
assert _r == [None, 0, 5, 7, 1], f"expected [None, 0, 5, 7, 1], got {_r}"` },
          { id: "t3", description: "empty and one reading", assertionCode: `_r = closest_earlier([7])
assert _r == [None], f"expected [None], got {_r}"
_r = closest_earlier([])
assert _r == [], f"expected [], got {_r}"` },
          { id: "t4", description: "20,000 readings", assertionCode: `_xs = [(i * i * 7919 + i * 31) % 1000003 for i in range(20000)]
_r = closest_earlier(_xs)
assert isinstance(_r, list) and len(_r) == 20000, "one answer per reading"
assert _r[:6] == [None, 7950, 23788, 39626, 55464, 71302], f"the first answers should be [None, 7950, 23788, 39626, 55464, 71302], got {_r[:6]}"
assert _r[-1] == 24 and sum(_r[1:]) == 4586356, f"expected the last answer 24 and a total of 4586356, got {_r[-1]} and {sum(_r[1:])}"` },
        ],
        hints: ["`j = bisect.bisect_left(seen, r)`: the candidates are `seen[j - 1]` (floor side) and `seen[j]` (ceiling side), when they exist.", "Append the smaller difference (or None for the very first reading), then `bisect.insort(seen, r)`."],
      },
      {
        kind: "recap",
        points: [
          "An **ordered set** keeps values sorted under inserts and deletes: floor, ceiling, neighbours, min and max.",
          "Balanced BSTs (`TreeSet`, `std::set`) do it in O(log n). In Python: a sorted list with `bisect` (O(log n) search, O(n) insert) or `SortedList`.",
          "`bisect_right(a, x) - 1` is the floor index, `bisect_left(a, x)` the ceiling index; check both ends.",
          "Overlap and *nearest* questions only need the **neighbours** of the new value, not every stored value.",
        ],
      },
    ],
  },
];
