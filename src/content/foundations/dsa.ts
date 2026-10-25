import type { ConceptLesson, Module } from "../../learn/types.ts";

/** Fenced Python block for lesson prose. */
const py = (code: string) => "~~~python\n" + code.trim() + "\n~~~";
/** Fenced plain-text block (diagrams, tables). */
const txt = (code: string) => "~~~text\n" + code.replace(/^\n+|\s+$/g, "") + "\n~~~";

// ── shared widget data ──
const ANIMALS8 = ["cat", "dog", "cow", "pig", "hen", "ant", "owl", "fox"];
const SORTED15 = [3, 8, 12, 17, 21, 29, 33, 42, 50, 56, 61, 68, 74, 81, 95];
const BST7 = [50, 30, 70, 20, 40, 60, 80];
const GRAPH = {
  nodes: [
    { id: "A", x: 8, y: 50 },
    { id: "B", x: 30, y: 16 },
    { id: "C", x: 30, y: 84 },
    { id: "D", x: 52, y: 46 },
    { id: "E", x: 56, y: 88 },
    { id: "F", x: 74, y: 16 },
    { id: "G", x: 78, y: 74 },
    { id: "H", x: 93, y: 44 },
  ],
  edges: [
    ["A", "B"],
    ["A", "C"],
    ["B", "D"],
    ["B", "F"],
    ["C", "D"],
    ["C", "E"],
    ["D", "F"],
    ["D", "G"],
    ["E", "G"],
    ["F", "H"],
    ["G", "H"],
  ],
  start: "A",
};
const MAZE = ["S..#....", ".#.#.##.", ".#...#..", ".####.#.", "......#G"];

const lessons: ConceptLesson[] = [
  // ─────────────────────────────── 1. What an algorithm is ───────────────────────────────
  {
    id: "fnd-dsa-1-algorithms",
    title: "What an algorithm is",
    summary: "Precise steps that always work, and why we count steps instead of seconds.",
    minutes: 6,
    xp: 40,
    steps: [
      {
        kind: "explain",
        title: "A recipe a computer can follow",
        body: "An **algorithm** is a list of steps precise enough that anyone, or anything, can follow them and get the right answer. You already know a few: how to do long division, or how to find a word in a dictionary.\n\nHere's a tiny problem to play with. Eight cards lie face down and you want the **largest** number. Turn some over.",
        widget: { type: "dsa-cards", props: { values: [14, 3, 27, 9, 31, 6, 22, 18], mode: "max" } },
      },
      {
        kind: "question",
        title: "Be the algorithm",
        body: "New cards. Find the largest, and only say so when you're **sure**. Each card you turn over counts as one look.",
        widget: { type: "dsa-cards", props: { values: [12, 7, 25, 4, 19, 30, 2, 16], mode: "max" } },
        question: { type: "widget", goal: { correct: true }, prompt: "Find the largest card." },
        explanation: "The only way to be **sure** is to look at every card: any card still face down could be the biggest one. So 8 cards take 8 looks. Remembering the *best so far* as you go is exactly how a computer does it.",
      },
      {
        kind: "question",
        title: "Precise enough?",
        body: "Which of these instructions is precise enough to be an algorithm for finding the largest card?",
        question: {
          type: "choice",
          options: [
            "Look over the cards and pick the one that seems biggest.",
            "Hold the first card. Turn over the others one at a time, and whenever one is bigger than the card you hold, hold that one instead. When none are left, the card you hold is the answer.",
            "Turn over cards until you find a big one.",
            "Pick the middle card, since it's probably about average.",
          ],
          answer: 1,
        },
        explanation: "Only the second says exactly what to do at every moment **and when to stop**. \"Seems biggest\" and \"a big one\" need judgement, and a computer has none: it can only follow exact steps.",
      },
      {
        kind: "question",
        title: "Right for every input",
        body: "A shortcut: *look at the first 3 cards and answer the largest of those.* On the cards [9, 4, 7, 2, 1] it answers 9, which is right. Is it a correct algorithm?",
        question: {
          type: "choice",
          options: [
            "Yes: it gave the right answer.",
            "No: on other cards, like [1, 2, 3, 8], it answers 3 instead of 8.",
            "Yes, as long as there are at least 3 cards.",
            "No, because it's too fast.",
          ],
          answer: 1,
        },
        explanation: "An algorithm is **correct** only if it's right for *every* possible input. One success proves nothing; a single input where it fails (a **counterexample**) proves it wrong.",
      },
      {
        kind: "explain",
        title: "Count steps, not seconds",
        body: "How fast is an algorithm? You could time it, but the same program runs faster on a new laptop than an old phone, and slower when the computer is busy.\n\nSo instead we count **steps**: the basic action it repeats, like looking at one card or comparing two numbers. Here's the hold-the-biggest algorithm in Python. Each pass of the loop looks at one card:\n\n" +
          py(`
def largest(cards):
    best = cards[0]          # hold the first card
    for card in cards:       # one look per card
        if card > best:
            best = card      # hold the bigger one
    return best
`),
      },
      {
        kind: "question",
        title: "A bigger pile",
        body: "How many cards does `largest` look at to find the largest of **1,000** cards?",
        question: { type: "number", answer: 1000, tolerance: 1, unit: "looks" },
        explanation: "One look per card: **1,000**. The loop body runs once for each card, so double the cards and you double the work, on any computer.",
      },
      {
        kind: "question",
        title: "A fair comparison",
        body: "Ana's program finds the largest of a million numbers in 0.2 seconds. Ben's, on a different computer, takes 0.5 seconds. What can you conclude?",
        question: {
          type: "choice",
          options: [
            "Ana's algorithm is better.",
            "Ben's algorithm is better.",
            "Nothing yet: the computers differ. Count the steps each algorithm takes to compare them fairly.",
            "They must be using the same algorithm.",
          ],
          answer: 2,
        },
        explanation: "Seconds mix up the algorithm with the machine it ran on. Ana might simply have a faster computer. Counting steps compares the **algorithms** themselves, and that count is the same everywhere.",
      },
      {
        kind: "code",
        title: "Find the bug",
        body: "This `largest` passes a quick test: `largest([3, 9, 2])` gives 9. But it isn't correct for **every** input. Work out which input it gets wrong, then fix it. (No built-in `max`: write the steps yourself.)",
        language: "python",
        starter: `def largest(nums):
    best = 0
    for n in nums:
        if n > best:
            best = n
    return best
`,
        solution: `def largest(nums):
    best = nums[0]
    for n in nums:
        if n > best:
            best = n
    return best
`,
        tests: [
          { id: "t1", description: "largest([3, 9, 2]) is 9", assertionCode: `_r = largest([3, 9, 2])\nassert _r == 9, f"largest([3, 9, 2]) should be 9, got {_r}"` },
          { id: "t2", description: "Works when every number is negative", assertionCode: `_r = largest([-5, -2, -9])\nassert _r == -2, f"largest([-5, -2, -9]) should be -2, got {_r}: what does best start as?"` },
          { id: "t3", description: "Works for a single number", assertionCode: `_r = largest([7])\nassert _r == 7, f"largest([7]) should be 7, got {_r}"` },
          { id: "t4", description: "Works with repeats", assertionCode: `_r = largest([4, 4, 1])\nassert _r == 4, f"largest([4, 4, 1]) should be 4, got {_r}"` },
        ],
        hints: ["Try a list where every number is below zero. Which number does `best` start as, and does any card ever beat it?", "Start with a card that's really in the list: `best = nums[0]`."],
      },
      {
        kind: "recap",
        points: [
          "An **algorithm** is a finite list of precise steps that solves a problem.",
          "It's **correct** only if it's right for every input; one counterexample shows it's wrong.",
          "We judge speed by **counting steps** (looks, comparisons), not seconds, so the computer doesn't matter.",
          "Finding the largest of n items takes about n steps: every item has to be looked at.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 2. Big-O ───────────────────────────────
  {
    id: "fnd-dsa-2-big-o",
    title: "Big-O: how work grows",
    summary: "Growth rates, dropping constants, best and worst cases, and spotting nested loops.",
    minutes: 8,
    xp: 50,
    steps: [
      {
        kind: "explain",
        title: "Work as n grows",
        body: "The size of the input is called **n**: the number of items in a list, letters in a text, users in an app. The question that matters is how the number of steps **grows** as n grows.\n\nChange n and watch how many times the marked line runs.",
        widget: { type: "dsa-opcount", props: { shape: "single", initial: 4 } },
      },
      {
        kind: "question",
        title: "A loop inside a loop",
        body: "Now one loop sits inside another. With **n = 5**, how many times does `compare(a, b)` run?",
        widget: { type: "dsa-opcount", props: { shape: "nested", initial: 5, hideCount: true } },
        question: { type: "number", answer: 25, unit: "times" },
        explanation: "For each of the 5 values of `a`, the inner loop runs all 5 values of `b`: 5 × 5 = **25**. Try n = 10: 100 runs. Double n and the work **quadruples**.",
      },
      {
        kind: "explain",
        title: "Growth families",
        body: "Most algorithms fall into a few growth families, written in **Big-O** notation:\n\n- **O(1)** constant: the same work whatever n is.\n- **O(log n)** logarithmic: doubling n adds just one step.\n- **O(n)** linear: twice the items, twice the work.\n- **O(n log n)**: a little more than linear (good sorting).\n- **O(n²)** quadratic: twice the items, four times the work.\n\nDrag n and watch them pull apart, then try a really big n.",
        widget: { type: "dsa-growth", props: { max: 64, initial: 16, showTime: true, presets: [1000, 1000000] } },
      },
      {
        kind: "question",
        title: "Constants lose in the end",
        body: "Algorithm A does a lot of work per item: **100n** steps. Algorithm B takes **n²** steps. For small inputs B is faster. Drag n until **A** becomes the faster one.",
        widget: {
          type: "dsa-growth",
          props: {
            curves: [
              { id: "a", label: "A: 100n", f: "n", k: 100 },
              { id: "b", label: "B: n²", f: "n2" },
            ],
            max: 200,
            initial: 20,
            yMax: 40000,
          },
        },
        question: { type: "widget", goal: { cheaper: "a", than: "b" }, prompt: "Find an n where A takes fewer steps than B." },
        explanation: "They tie at n = 100 (100 × 100 = 100²). After that B's n² pulls away: at n = 1,000, A takes 100,000 steps and B a million. That's why Big-O ignores constant factors: for big inputs, the **growth rate** decides.",
      },
      {
        kind: "question",
        title: "Drop the small stuff",
        body: "Big-O keeps only the fastest-growing part and drops constant factors: 3n + 5 is O(n), and n² + n is O(n²).\n\nAn algorithm takes **2n² + 50n + 7** steps. What is it in Big-O?",
        question: { type: "choice", options: ["O(2n² + 50n + 7)", "O(n²)", "O(n)", "O(50n)"], answer: 1 },
        explanation: "For big n the n² part dwarfs the rest: at n = 1,000, 2n² is 2,000,000 while 50n is only 50,000. Drop the smaller terms and the factor 2, and you're left with **O(n²)**.",
      },
      {
        kind: "question",
        title: "Each pair once",
        body: "This version compares each **pair** only once: the inner loop starts just after `i`. With **n = 6**, how many comparisons?",
        widget: { type: "dsa-opcount", props: { shape: "triangle", initial: 6, hideCount: true } },
        question: { type: "number", answer: 15, unit: "comparisons" },
        explanation: "5 + 4 + 3 + 2 + 1 + 0 = **15**, which is n(n − 1)/2. That's about half of n², but a half is just a constant factor, so it's still **O(n²)**: double n and the work still roughly quadruples.",
      },
      {
        kind: "question",
        title: "Halving",
        body: "This loop halves n on every pass. Try a few values of n. What's its Big-O?",
        widget: { type: "dsa-opcount", props: { shape: "halving", initial: 64 }, live: true },
        question: { type: "choice", options: ["O(1)", "O(log n)", "O(n)", "O(n²)"], answer: 1 },
        explanation: "Each pass halves n, so it runs about log₂ n times: 6 times for 64, 10 for 1,024, and only about 20 for a million. Doubling n adds **one** pass. That's **O(log n)**, and it's the reason searching sorted data is so fast.",
      },
      {
        kind: "question",
        title: "Spot the cost",
        body: "What's the worst-case Big-O of this function?\n\n" +
          py(`
def has_duplicate(items):
    for i in range(len(items)):
        for j in range(len(items)):
            if i != j and items[i] == items[j]:
                return True
    return False
`),
        question: { type: "choice", options: ["O(1)", "O(log n)", "O(n)", "O(n²)"], answer: 3 },
        explanation: "Two loops over the same list, one inside the other: n × n checks when there's no duplicate and it never returns early. Nested loops over the input are the classic sign of **O(n²)**. (A later lesson does this in O(n) with a set.)",
      },
      {
        kind: "question",
        title: "Best and worst",
        body: "Checking a list item by item for a name takes 1 step if it's first, but n steps if it's last or missing. When we call this search **O(n)**, which case are we describing?",
        question: { type: "choice", options: ["The best case", "The worst case", "The case where the list is empty", "The average of all cases, always"], answer: 1 },
        explanation: "Big-O usually describes the **worst case**: a promise that it never takes more than about n steps, however unlucky you are. The best case (it's first!) is luck, and tells you little.",
      },
      {
        kind: "recap",
        points: [
          "**n** is the input size; Big-O describes how the step count **grows** with n.",
          "Common families, fastest first: O(1), O(log n), O(n), O(n log n), O(n²).",
          "Drop constant factors and smaller terms: 2n² + 50n + 7 is O(n²).",
          "Nested loops over the input usually mean O(n²); halving each step means O(log n).",
          "Big-O normally describes the **worst case**.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 3. Arrays and linked lists ───────────────────────────────
  {
    id: "fnd-dsa-3-arrays-lists",
    title: "Arrays and linked lists",
    summary: "Side by side or linked by arrows: why reading and inserting cost different things.",
    minutes: 7,
    xp: 50,
    steps: [
      {
        kind: "explain",
        title: "Side by side",
        body: "A **data structure** is a way of arranging data in memory so that certain jobs are fast. The simplest is the **array**: items in neighbouring memory cells. (Python's `list` is an array underneath.)\n\nBecause the cells are evenly spaced, the computer finds any item with one sum: *start + index × size*. Read the front, middle and end: always one step.",
        widget: { type: "dsa-arraylist", props: { show: "array", ops: ["read"], items: [3, 8, 5, 1, 6], initialAt: "middle" } },
      },
      {
        kind: "question",
        title: "Do the sum",
        body: "An array of 4-byte numbers starts at address **100**. At what address is the item at **index 5**?",
        question: { type: "number", answer: 120 },
        explanation: "100 + 5 × 4 = **120**. No searching at all, whatever the array's length: that's why `items[5]` is **O(1)**.",
      },
      {
        kind: "question",
        title: "Make room at the front",
        body: "Now **insert** at the front of this 5-item array: every item has to shift one cell right to make room. Try it, then think bigger: inserting at the front of a **1,000-item** array, how many items move?",
        widget: { type: "dsa-arraylist", props: { show: "array", ops: ["insert"], items: [3, 8, 5, 1, 6], initialAt: "front" }, live: true },
        question: { type: "number", answer: 1000, unit: "items" },
        explanation: "All **1,000** shift right, just as all 5 did here. Inserting at the front of an n-item array moves n items: **O(n)**. Try the end instead: nothing moves, so adding at the end is O(1).",
      },
      {
        kind: "explain",
        title: "Linked by arrows",
        body: "A **linked list** keeps each item in its own **node**, wherever memory is free. Each node holds its value and the **address of the next node**: an arrow. The list only remembers where the first node, the **head**, is.\n\nInserting at the front is easy: make a node, point it at the old head, move head. Nobody shifts. Try it, and try reading the end.",
        widget: { type: "dsa-arraylist", props: { show: "list", ops: ["insert", "read"], items: [3, 8, 5, 1, 6] } },
      },
      {
        kind: "question",
        title: "Follow the arrows",
        body: "Reading the middle of this 7-node list means starting at head and following links. Try it. Now a list of 1,000 nodes: to read the item at **index 500**, how many links do you follow?",
        widget: { type: "dsa-arraylist", props: { show: "list", ops: ["read"], items: [3, 8, 5, 1, 6, 4, 9], initialAt: "middle" }, live: true },
        question: { type: "number", answer: 500, unit: "links" },
        explanation: "The node addresses are scattered, so there's no sum to jump with. From the head you follow one link per step: index 0 → 1 → 2 → … → 500, so **500** links. Reading index i costs i hops: **O(n)** for a linked list, O(1) for an array.",
      },
      {
        kind: "question",
        title: "Where the list wins",
        body: "Here are both, holding the same items. Find an operation where the **linked list** does less work than the array.",
        widget: { type: "dsa-arraylist", props: { show: "both", items: [3, 8, 5, 1, 6] } },
        question: { type: "widget", goal: { cheaper: "list" }, prompt: "Run an operation where the list needs fewer steps." },
        explanation: "At the **front** the list wins big: it re-points one or two arrows while the array shifts every item, and the longer the list, the bigger the gap. In the middle it's close: the list walks halfway along, and the array shifts half the items.",
      },
      {
        kind: "question",
        title: "Where the array wins",
        body: "Now find one where the **array** does less work.",
        widget: { type: "dsa-arraylist", props: { show: "both", items: [3, 8, 5, 1, 6], initialOp: "read" } },
        question: { type: "widget", goal: { cheaper: "array" }, prompt: "Run an operation where the array needs fewer steps." },
        explanation: "Reading by index (one jump against following links), and adding at the end (nothing to shift, while the list walks to its last node; some linked lists also keep a pointer to the tail to fix that).",
      },
      {
        kind: "question",
        title: "Python lists",
        body: "A Python list (an array) holds 1,000,000 items. Which line is slow?",
        question: { type: "choice", options: ["`items.append(x)`", "`items[500000]`", "`items.insert(0, x)`", "`len(items)`"], answer: 2 },
        explanation: "`insert(0, x)` shifts all million items to make room: O(n). Appending, indexing and `len` are all O(1). If you need fast adds at the front, Python has `collections.deque`, which you'll meet with queues.",
      },
      {
        kind: "code",
        title: "Walk a linked list",
        body: "Here's a linked list built from dicts: each node has a `\"value\"` and a `\"next\"` (the next node, or `None` at the end). Finish `to_list(head)` so it follows the links and returns the values as a Python list.\n\n" +
          py(`
c = {"value": 5, "next": None}
b = {"value": 8, "next": c}
a = {"value": 3, "next": b}
to_list(a)   # [3, 8, 5]
`),
        language: "python",
        starter: `def to_list(head):
    values = []
    node = head
    # TODO: while there is a node, add its value
    # and move on to node["next"]
    return values
`,
        solution: `def to_list(head):
    values = []
    node = head
    while node is not None:
        values.append(node["value"])
        node = node["next"]
    return values
`,
        tests: [
          {
            id: "t1",
            description: "Follows three nodes",
            assertionCode: `_c = {"value": 5, "next": None}\n_b = {"value": 8, "next": _c}\n_a = {"value": 3, "next": _b}\n_r = to_list(_a)\nassert _r == [3, 8, 5], f"to_list should give [3, 8, 5], got {_r}"`,
          },
          { id: "t2", description: "A single node", assertionCode: `_r = to_list({"value": 42, "next": None})\nassert _r == [42], f"Expected [42], got {_r}"` },
          { id: "t3", description: "An empty list (head is None)", assertionCode: `_r = to_list(None)\nassert _r == [], f"to_list(None) should be [], got {_r}"` },
        ],
        hints: ["Loop with `while node is not None:`.", "Inside the loop: `values.append(node[\"value\"])`, then `node = node[\"next\"]` to follow the arrow."],
      },
      {
        kind: "recap",
        points: [
          "An **array** stores items side by side: reading any index is O(1), inserting at the front shifts everything, O(n).",
          "A **linked list** stores nodes anywhere, each pointing at the next: inserting at the front is O(1), reading index i takes i hops, O(n).",
          "Neither is best: pick the one whose fast operations match what your program does most.",
          "Python's `list` is an array: `append` and `items[i]` are fast, `insert(0, x)` is slow.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 4. Stacks and queues ───────────────────────────────
  {
    id: "fnd-dsa-4-stacks-queues",
    title: "Stacks and queues",
    summary: "Last in, first out and first in, first out: undo, the call stack and print queues.",
    minutes: 7,
    xp: 50,
    steps: [
      {
        kind: "explain",
        title: "A stack of plates",
        body: "A **stack** only lets you add or remove at one end, the **top**. The last thing on is the first thing off: **LIFO**, last in, first out.\n\nA Python list makes a fine stack: `append` pushes onto the top and `pop()` takes the top off, both O(1). Push a few and pop them.",
        widget: { type: "dsa-stackqueue", props: { kind: "stack", incoming: ["A", "B", "C", "D", "E"] } },
      },
      {
        kind: "question",
        title: "Undo",
        body: "An editor keeps its **undo history** as a stack: every action is pushed. Do all four actions, then undo **twice**.",
        widget: {
          type: "dsa-stackqueue",
          props: { kind: "stack", incoming: ["type Hello", "type world", "make bold", "add link"], addLabel: "Do", removeLabel: "Undo", outLabel: "Undone", varName: "history" },
        },
        question: { type: "widget", goal: { removed: ["add link", "make bold"], items: ["type Hello", "type world"] }, prompt: "Do all four, then undo twice." },
        explanation: "Undo always reverses the **most recent** action first: *add link*, then *make bold*. A stack hands you exactly that order without any searching.",
      },
      {
        kind: "question",
        title: "Predict the pops",
        body: "Start with an empty stack: push 1, push 2, push 3, pop, push 4, pop, pop. What came out, in order?",
        question: { type: "choice", options: ["3, 4, 2", "1, 2, 3", "3, 2, 1", "4, 3, 2"], answer: 0 },
        explanation: "After pushing 1, 2, 3 the top is 3, so the first pop gives **3**. Push 4: it's the new top, so the next pop gives **4**. Then 2 is on top: **2**. Only 1 is left.",
      },
      {
        kind: "question",
        title: "You've met one already",
        body: "Remember the **call stack**? `main()` calls `a()`, which calls `b()`. Which function finishes first?",
        question: { type: "choice", options: ["main", "a", "b", "They all finish together"], answer: 2 },
        explanation: "Each call pushes a frame. `b`'s frame went on last, so it's on top: `b` returns first and its frame pops, then `a`, then `main`. Recursion works the same way: the deepest call returns first.",
      },
      {
        kind: "explain",
        title: "A queue",
        body: "A **queue** is a line at a shop: join at the **back**, leave from the **front**. First in, first out: **FIFO**.\n\nA plain list is a poor queue, because `pop(0)` shifts everything left: O(n). Python's `collections.deque` adds and removes at both ends in O(1): `append` to join, `popleft()` to leave.",
        widget: { type: "dsa-stackqueue", props: { kind: "queue", incoming: ["essay.pdf", "photo.jpg", "ticket.pdf", "map.png"], addLabel: "Send", removeLabel: "Print next", outLabel: "Printed", varName: "jobs" } },
      },
      {
        kind: "question",
        title: "The print queue",
        body: "Three people send work to one printer: **essay.pdf**, then **photo.jpg**, then **ticket.pdf**. Send all three, then print until **photo.jpg** has come out.",
        widget: { type: "dsa-stackqueue", props: { kind: "queue", incoming: ["essay.pdf", "photo.jpg", "ticket.pdf"], addLabel: "Send", removeLabel: "Print next", outLabel: "Printed", varName: "jobs" } },
        question: { type: "widget", goal: { removed: ["essay.pdf", "photo.jpg"] }, prompt: "Print until photo.jpg is done." },
        explanation: "A queue serves jobs in arrival order, so the essay prints first and the photo second. That's fair: with a stack the newest job would always jump ahead, and the first sender might wait forever.",
      },
      {
        kind: "question",
        title: "Stack or queue?",
        body: "Tap a card, then tap the structure that fits it.",
        widget: {
          type: "pattern-sorter",
          props: {
            buckets: [
              { id: "stack", label: "Stack", hint: "newest first" },
              { id: "queue", label: "Queue", hint: "oldest first" },
            ],
            items: [
              { id: "back", text: "A browser's Back button" },
              { id: "support", text: "Callers waiting for a support line" },
              { id: "undo", text: "Undo in a drawing app" },
              { id: "playlist", text: "An \"up next\" playlist" },
              { id: "brackets", text: "Checking that brackets match" },
              { id: "server", text: "Requests waiting for a busy server" },
            ],
            answer: { back: "stack", undo: "stack", brackets: "stack", support: "queue", playlist: "queue", server: "queue" },
          },
        },
        question: { type: "widget", goal: { placed: { back: "stack", undo: "stack", brackets: "stack", support: "queue", playlist: "queue", server: "queue" } } },
        explanation: "**Stacks** fit anything that returns to the most recent thing: going back, undoing, closing the most recently opened bracket. **Queues** fit anything that should be served in arrival order: callers, songs, requests.",
      },
      {
        kind: "code",
        title: "Do the brackets match?",
        body: "Write `balanced(text)`: True when every `(` and `[` is closed by the right bracket in the right order. Push each opener; on each closer, the top of the stack must be its partner.\n\n- `\"([])\"` → True\n- `\"([)]\"` → False (closed in the wrong order)\n- `\"((\"` → False (never closed)",
        language: "python",
        starter: `def balanced(text):
    partner = {")": "(", "]": "["}
    stack = []
    for ch in text:
        if ch in "([":
            stack.append(ch)
        elif ch in ")]":
            # TODO: if the stack is empty, or the top isn't
            # partner[ch], the brackets don't match
            pass
    # TODO: it only balances if no opener is left over
    return True
`,
        solution: `def balanced(text):
    partner = {")": "(", "]": "["}
    stack = []
    for ch in text:
        if ch in "([":
            stack.append(ch)
        elif ch in ")]":
            if not stack or stack.pop() != partner[ch]:
                return False
    return len(stack) == 0
`,
        tests: [
          { id: "t1", description: "\"([])\" is balanced", assertionCode: `assert balanced("([])") is True, "balanced(\\"([])\\") should be True"` },
          { id: "t2", description: "\"([)]\" closes in the wrong order", assertionCode: `assert balanced("([)]") is False, "balanced(\\"([)]\\") should be False: ) arrives while [ is on top"` },
          { id: "t3", description: "\"((\" is never closed", assertionCode: `assert balanced("((") is False, "balanced(\\"((\\") should be False: openers are left on the stack"` },
          { id: "t4", description: "\"())\" closes one too many", assertionCode: `assert balanced("())") is False, "balanced(\\"())\\") should be False: the last ) finds an empty stack"` },
          { id: "t5", description: "Other characters are ignored", assertionCode: `assert balanced("a[b(c)d]e") is True and balanced("") is True, "Letters don't matter, and an empty text is balanced"` },
        ],
        hints: ["On a closer: `if not stack or stack.pop() != partner[ch]: return False`.", "After the loop, `return len(stack) == 0`: any opener still on the stack was never closed."],
      },
      {
        kind: "recap",
        points: [
          "A **stack** adds and removes at the top: last in, first out. A Python list with `append` / `pop()` is one.",
          "Stacks power undo, Back buttons, bracket matching and the call stack.",
          "A **queue** adds at the back and removes from the front: first in, first out. Use `collections.deque` with `append` / `popleft()`.",
          "Queues serve things fairly in arrival order: print jobs, callers, server requests.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 5. Hash maps ───────────────────────────────
  {
    id: "fnd-dsa-5-hash-maps",
    title: "Hash maps",
    summary: "Hashing keys into buckets: why dict and set lookups take about one step.",
    minutes: 8,
    xp: 60,
    steps: [
      {
        kind: "explain",
        title: "Jump straight there",
        body: "Finding one contact in an unsorted list of a million could take a million looks. A **hash map** (Python's `dict`) does it in about one.\n\nThe trick: a **hash function** turns the key into a number, and that number picks a **bucket**. Ours is simple: add up the letter codes, then take the remainder when dividing by the number of buckets (`%`). Add some keys and see where they land.",
        widget: { type: "dsa-hashmap", props: { keys: ["cat", "dog", "cow", "hen", "bee", "fox"], allowCustom: true } },
      },
      {
        kind: "question",
        title: "Where does pig go?",
        body: "The letters `p`, `i`, `g` have codes 112, 105 and 103. With **8** buckets, which bucket does **pig** land in?",
        question: { type: "number", answer: 0 },
        explanation: "112 + 105 + 103 = 320, and 320 % 8 = **0** (320 is exactly 40 × 8). The same key always hashes to the same bucket, which is what lets the map find it again later.",
      },
      {
        kind: "question",
        title: "A collision",
        body: "When two keys land in the same bucket, that's a **collision**. Add keys until you cause one.",
        widget: { type: "dsa-hashmap", props: { keys: ["cat", "dog", "cow", "pig", "hen", "ant", "owl"] } },
        question: { type: "widget", goal: { collision: true }, prompt: "Get two keys into one bucket." },
        explanation: "With more possible keys than buckets, collisions can't be avoided. The bucket simply holds a short list, a **chain**, of every key that landed there. Real hash functions spread keys far more evenly than ours, but they collide sometimes too.",
      },
      {
        kind: "explain",
        title: "Looking a key up",
        body: "To look a key up, the map hashes it, goes straight to that **one** bucket, and compares only the keys chained there. The other buckets are never touched. Look up a few, including keys that aren't in the map.",
        widget: { type: "dsa-hashmap", props: { initial: ANIMALS8, actions: ["lookup"], lookupKeys: ["emu", "yak", "elk"] } },
      },
      {
        kind: "question",
        title: "A miss is quick too",
        body: "**yak** isn't in the map. How many keys does the map compare before it knows?",
        widget: { type: "dsa-hashmap", props: { initial: ANIMALS8, actions: ["lookup"], lookupKeys: ["emu", "yak", "elk"] }, live: true },
        question: { type: "number", answer: 1, unit: "keys" },
        explanation: "yak hashes to 325 % 8 = 5. Bucket 5 holds only fox, so **one** comparison and the map knows yak is missing. A plain list would have had to check all 8 keys to be sure.",
      },
      {
        kind: "question",
        title: "Growing the map",
        body: "As keys pile in, chains get longer and lookups slow down. So when a map gets too full, it **grows**: it makes more buckets and re-hashes every key. Grow this one and see what happens to the longest chain.",
        widget: { type: "dsa-hashmap", props: { initial: ANIMALS8, allowResize: true } },
        question: { type: "widget", goal: { bucketsMin: 16, longestMax: 1 }, prompt: "Grow the map until no bucket holds more than one key." },
        explanation: "With 16 buckets, `% 16` spreads these keys out and every one sits alone. Python's `dict` grows by itself whenever it gets about two-thirds full, so chains stay short and lookups stay about **O(1)** on average. (Inside, Python handles collisions by probing for a nearby free slot rather than chaining, but the idea is the same.)",
      },
      {
        kind: "question",
        title: "List or set?",
        body: "`names` holds a million usernames. Which check is fast?",
        question: {
          type: "choice",
          options: ["`\"ada\" in names` when names is a list", "`\"ada\" in names` when names is a set", "Both are equally fast", "Neither: `in` always checks every item"],
          answer: 1,
        },
        explanation: "A **set** is a hash map with keys and no values: `in` hashes \"ada\" and checks one bucket, about O(1). On a **list**, `in` compares item by item: O(n), up to a million comparisons.",
      },
      {
        kind: "question",
        title: "Keys must not change",
        body: "`{[1, 2]: \"x\"}` fails with *TypeError: unhashable type: 'list'*. Why won't Python let a list be a key?",
        question: {
          type: "choice",
          options: [
            "Lists are too long to hash.",
            "A list can change after it's stored. Its hash would change too, and the map would look in the wrong bucket.",
            "Dictionary keys must be strings.",
            "Lists can't be compared with ==.",
          ],
          answer: 1,
        },
        explanation: "The bucket is picked from the key's hash when it's stored. If the key could change later, its hash would point somewhere else and the entry would be lost. So keys must be **immutable**: strings, numbers, tuples. (Values can be anything.)",
      },
      {
        kind: "code",
        title: "Count the words",
        body: "Counting is a perfect job for a dict: the word is the key, its count is the value. Finish `count_words(text)` so it returns how many times each word appears.\n\n" + py(`count_words("the cat saw the hat")\n# {"the": 2, "cat": 1, "saw": 1, "hat": 1}`),
        language: "python",
        starter: `def count_words(text):
    counts = {}
    for word in text.split():
        # TODO: add 1 to this word's count
        # (start it at 0 the first time you see it)
        pass
    return counts
`,
        solution: `def count_words(text):
    counts = {}
    for word in text.split():
        counts[word] = counts.get(word, 0) + 1
    return counts
`,
        tests: [
          { id: "t1", description: "Counts repeated words", assertionCode: `_r = count_words("the cat saw the hat")\nassert _r == {"the": 2, "cat": 1, "saw": 1, "hat": 1}, f"Got {_r}"` },
          { id: "t2", description: "One word many times", assertionCode: `_r = count_words("ho ho ho")\nassert _r == {"ho": 3}, f"count_words(\\"ho ho ho\\") should be {{'ho': 3}}, got {_r}"` },
          { id: "t3", description: "Empty text gives an empty dict", assertionCode: `_r = count_words("")\nassert _r == {}, f"count_words(\\"\\") should be {{}}, got {_r}"` },
        ],
        hints: ["`counts.get(word, 0)` gives the count so far, or 0 if the word is new.", "`counts[word] = counts.get(word, 0) + 1`"],
      },
      {
        kind: "recap",
        points: [
          "A **hash function** turns a key into a number that picks a bucket, so a lookup goes straight to one place.",
          "Keys that land in the same bucket **collide** and share it; lookups still check only that bucket.",
          "Maps **grow** and re-hash as they fill, so lookups, inserts and deletes stay about O(1) on average.",
          "Python's `dict` and `set` are hash maps: `in` on a set is O(1), on a list O(n). Keys must be immutable.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 6. Searching ───────────────────────────────
  {
    id: "fnd-dsa-6-searching",
    title: "Linear and binary search",
    summary: "Check every item, or halve the problem each time, as long as the data is sorted.",
    minutes: 7,
    xp: 60,
    steps: [
      {
        kind: "question",
        title: "Linear search",
        body: "The simplest search checks items one after another until it finds the target: **linear search**. It works on any list. Find **61**.",
        widget: { type: "dsa-cards", props: { values: [17, 42, 8, 33, 75, 5, 29, 61, 12, 50], mode: "find", target: 61 } },
        question: { type: "widget", goal: { found: true }, prompt: "Turn cards over until you find 61." },
        explanation: "With the cards in no particular order, each look tells you nothing about the others. So you check them one by one: about half of them on average, and **all** of them if the target is last or missing.",
      },
      {
        kind: "question",
        title: "The worst case",
        body: "Linear search on a list of **1,000** items. In the worst case, how many items does it check?",
        question: { type: "number", answer: 1000, unit: "items" },
        explanation: "If the target is last or not there at all, it checks every one of the **1,000**. Linear search is **O(n)**.",
      },
      {
        kind: "explain",
        title: "Sorted changes everything",
        body: "If the cards are **in order**, one look tells you a lot. Turn over a card: if it's smaller than the target, the target must be to its right, and every card on its left is ruled out at once.\n\nThe best card to try is the **middle** one, because then whatever it says, half the cards are gone. That's **binary search**. Find 21, using the helper if you like.",
        widget: { type: "dsa-cards", props: { values: SORTED15, mode: "find", target: 21, helper: true } },
      },
      {
        kind: "question",
        title: "Four looks",
        body: "Find **61** in **at most 4 looks**. Each time, turn over the middle of the cards still in play.",
        widget: { type: "dsa-cards", props: { values: SORTED15, mode: "find", target: 61 } },
        question: { type: "widget", goal: { found: true, maxLooks: 4 }, prompt: "Find 61 in 4 looks or fewer." },
        explanation: "Middle first (42: too small), then the middle of the right half (68: too big), then 56, then **61**. Each look halves what's left, 15 → 7 → 3 → 1, so 4 looks are always enough for 15 sorted cards. Linear search might need 15.",
      },
      {
        kind: "question",
        title: "Guess the number",
        body: "I'm thinking of a number from 1 to 100. Find it in **7 guesses or fewer**. No luck involved: the number dodges lucky guesses, so only a good strategy works.",
        widget: { type: "dsa-guess", props: { max: 100, maxGuesses: 7 } },
        question: { type: "widget", goal: { found: true, maxGuesses: 7 }, prompt: "Find the number in 7 guesses or fewer." },
        explanation: "Guess the middle of what's left every time: 100 possibilities → 50 → 25 → 12 → 6 → 3 → 1. Seven halvings are always enough because 2⁷ = 128 ≥ 100. Guessing 1, 2, 3… could take 100.",
      },
      {
        kind: "question",
        title: "A million",
        body: "Each guess halves the range. At most how many guesses does binary search need for a number from 1 to **1,000,000**?",
        question: { type: "number", answer: 20, unit: "guesses" },
        explanation: "2²⁰ = 1,048,576, which is at least a million, so **20** halvings always get down to one number. That's **O(log n)**: going from a thousand to a million numbers only adds 10 guesses.",
      },
      {
        kind: "question",
        title: "The fine print",
        body: "Someone runs binary search for **2** on the *unsorted* list [7, 9, 5, 2, 1]. It looks at the middle item, 5, and since 2 is smaller it searches only the left part, [7, 9]. What does it report?",
        question: { type: "choice", options: ["Found, at index 3", "Not found, even though 2 is in the list", "It crashes with an error", "It sorts the list first, then finds it"], answer: 1 },
        explanation: "Binary search **trusts** the order: seeing 5, it assumes everything smaller is on the left. Here 2 sits on the right, so it's never looked at. Binary search needs **sorted** data. Sorting first costs O(n log n), which pays off when you search the same data many times.",
      },
      {
        kind: "code",
        title: "Write binary search",
        body: "`binary_search(items, target)` should return the index of `target` in the sorted list `items`, or -1 if it's missing. The starter is linear search: correct, but it reads far too many items. Keep two markers, `lo` and `hi`, around the part that could still hold the target, and check the middle each time.\n\nThe tests search a list of 100,000 numbers and count how many items you read: 40 at most.",
        language: "python",
        starter: `def binary_search(items, target):
    for i in range(len(items)):
        if items[i] == target:
            return i
    return -1
`,
        solution: `def binary_search(items, target):
    lo = 0
    hi = len(items) - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        value = items[mid]
        if value == target:
            return mid
        if value < target:
            lo = mid + 1
        else:
            hi = mid - 1
    return -1
`,
        tests: [
          { id: "t1", description: "Finds items in a small list", assertionCode: `_a = [3, 8, 12, 17, 21, 29, 33]\nfor _i, _v in enumerate(_a):\n    assert binary_search(_a, _v) == _i, f"binary_search({_a}, {_v}) should be {_i}"` },
          { id: "t2", description: "Returns -1 when the target is missing", assertionCode: `assert binary_search([3, 8, 12, 17], 10) == -1, "10 isn't there: return -1"\nassert binary_search([3, 8, 12, 17], 99) == -1, "99 isn't there: return -1"\nassert binary_search([], 5) == -1, "An empty list holds nothing: return -1"` },
          {
            id: "t3",
            description: "Reads at most 40 items out of 100,000",
            assertionCode: `class _Counting(list):
    reads = 0
    def __getitem__(self, i):
        _Counting.reads += 1
        return list.__getitem__(self, i)
    def __iter__(self):
        for i in range(len(self)):
            yield self[i]
    def __contains__(self, x):
        return any(v == x for v in self)
    def index(self, *a):
        _Counting.reads += len(self)
        return list.index(self, *a)
_big = _Counting(range(0, 200000, 2))
_got = binary_search(_big, 123456)
assert _got == 61728, f"binary_search should find 123456 at index 61728, got {_got}"
assert _Counting.reads <= 40, f"Your search read {_Counting.reads} items. Binary search needs only about 17: check the middle and halve the range each time"`,
          },
        ],
        hints: [
          "Start with `lo = 0` and `hi = len(items) - 1`, and loop `while lo <= hi:`.",
          "`mid = (lo + hi) // 2`. If `items[mid]` is too small, the target is right of mid: `lo = mid + 1`. If too big: `hi = mid - 1`.",
        ],
      },
      {
        kind: "recap",
        points: [
          "**Linear search** checks items one by one: works on anything, O(n).",
          "**Binary search** checks the middle and throws away half each time: O(log n), 20 steps for a million items.",
          "Binary search only works on **sorted** data; on unsorted data it can miss items that are there.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 7. Sorting ───────────────────────────────
  {
    id: "fnd-dsa-7-sorting",
    title: "Sorting",
    summary: "Selection, bubble and insertion sort, then merge sort's divide and conquer.",
    minutes: 9,
    xp: 60,
    steps: [
      {
        kind: "question",
        title: "Sort it yourself",
        body: "Sorting puts items in order, which is what makes binary search possible. Sort these bars from shortest to tallest: tap a bar, then another, to swap them.",
        widget: { type: "dsa-sort", props: { manual: true, values: [4, 7, 1, 6, 3, 5, 2] } },
        question: { type: "widget", goal: { sorted: true }, prompt: "Sort the bars, smallest on the left." },
        explanation: "However you did it, you probably found the smallest bar and moved it to the front, then the next smallest, and so on. That's a real algorithm: **selection sort**. Next, a computer does it while counting its steps.",
      },
      {
        kind: "explain",
        title: "Selection sort",
        body: "Selection sort repeats one simple job: scan the unsorted part for the **smallest** item, then swap it to the front of that part. Each pass fixes one more item in its final place (green). Step through it.",
        widget: { type: "dsa-sort", props: { algorithm: "selection", values: [5, 2, 8, 1, 9, 3, 7, 4] } },
      },
      {
        kind: "question",
        title: "Count the comparisons",
        body: "With 8 items, the first pass compares 7 pairs to find the smallest, the next pass 6, and so on. How many comparisons in total? (Step to the end to check.)",
        widget: { type: "dsa-sort", props: { algorithm: "selection", values: [5, 2, 8, 1, 9, 3, 7, 4] }, live: true },
        question: { type: "number", answer: 28, unit: "comparisons" },
        explanation: "7 + 6 + 5 + 4 + 3 + 2 + 1 = **28**, which is n(n − 1)/2: **O(n²)**. Selection sort makes 28 comparisons for any 8 items, even ones that are already sorted.",
      },
      {
        kind: "explain",
        title: "Two more simple sorts",
        body: "**Bubble sort** walks along comparing neighbours and swaps any pair in the wrong order, so the biggest item bubbles to the end on each pass.\n\n**Insertion sort** takes the items one at a time and slides each one left into place among those already sorted, the way many people sort a hand of cards. Switch between them.",
        widget: { type: "dsa-sort", props: { choose: ["bubble", "insertion", "selection"], algorithm: "bubble", values: [5, 2, 8, 1, 9, 3, 7, 4] } },
      },
      {
        kind: "question",
        title: "Already sorted",
        body: "You give insertion sort a list that's **already sorted**, 1 to 8. How many comparisons does it make? Try it in the table: set the input to *Sorted*.",
        widget: { type: "dsa-sort", props: { table: true, initialN: 8 }, live: true },
        question: {
          type: "choice",
          options: ["28, the same as always", "7: each new item is compared once with its left neighbour and stays put", "0: it notices the list is sorted", "64"],
          answer: 1,
        },
        explanation: "Each item is compared with its neighbour once, found to be in place, and left alone: **7** comparisons, so insertion sort is O(n) on sorted or nearly sorted data. Its worst case, reversed input, is still O(n²).",
      },
      {
        kind: "explain",
        title: "Divide and conquer",
        body: "**Merge sort** uses a different idea, *divide and conquer*:\n\n- **Split** the list in half, and keep splitting until every piece has one item. A one-item list is already sorted.\n- **Merge** the pieces back in pairs. To merge two sorted lists, compare their front items, take the smaller, and repeat.\n\nStep through it and watch the sorted runs double: 1, 2, 4, 8.",
        widget: { type: "dsa-sort", props: { algorithm: "merge", values: [5, 2, 8, 1, 9, 3, 7, 4] } },
      },
      {
        kind: "question",
        title: "One merge",
        body: "How many comparisons does it take to merge [1, 4, 7] and [2, 3, 9]?",
        question: { type: "number", answer: 5, unit: "comparisons" },
        explanation: "1 vs 2 → take 1. 4 vs 2 → 2. 4 vs 3 → 3. 4 vs 9 → 4. 7 vs 9 → 7. Now the left list is empty, so 9 is copied with no comparison: **5**. A merge needs at most one comparison per item, so it's O(n).",
      },
      {
        kind: "question",
        title: "The race",
        body: "Splitting n items down to single items takes about log₂ n levels (8 → 4 → 2 → 1 is 3 levels), and each level of merging costs about n comparisons, so merge sort is **O(n log n)**. Race the four sorts as n grows.\n\nPython's `sorted()` uses Timsort, a merge-sort relative. Roughly how many comparisons for **1,000,000** items?",
        widget: { type: "dsa-sort", props: { table: true, initialN: 64 }, live: true },
        question: { type: "choice", options: ["About 20 million (n log₂ n)", "About 500 billion (n²/2)", "About 1 million (n)", "About 20 (log₂ n)"], answer: 0 },
        explanation: "n log₂ n ≈ 1,000,000 × 20 = **20 million**. Selection sort would need about 500 billion, some 25,000 times more. In fact no sort that works by comparing items can beat about n log n comparisons in the worst case.",
      },
      {
        kind: "code",
        title: "Merge two sorted lists",
        body: "Write the heart of merge sort: `merge(a, b)` takes two **sorted** lists and returns one sorted list with every item from both. Compare the front items, take the smaller, repeat; when one list runs out, add the rest of the other. (Don't call `sorted`: the point is that merging is O(n).)",
        language: "python",
        starter: `def merge(a, b):
    result = []
    i = 0   # next item to take from a
    j = 0   # next item to take from b
    # TODO: while both lists have items left,
    # append the smaller front item and move past it.
    # Then add whatever is left of a and of b.
    return a + b
`,
        solution: `def merge(a, b):
    result = []
    i = 0
    j = 0
    while i < len(a) and j < len(b):
        if a[i] <= b[j]:
            result.append(a[i])
            i += 1
        else:
            result.append(b[j])
            j += 1
    result.extend(a[i:])
    result.extend(b[j:])
    return result
`,
        tests: [
          { id: "t1", description: "merge([1, 4, 7], [2, 3, 9])", assertionCode: `_r = merge([1, 4, 7], [2, 3, 9])\nassert _r == [1, 2, 3, 4, 7, 9], f"Expected [1, 2, 3, 4, 7, 9], got {_r}"` },
          { id: "t2", description: "One list runs out early", assertionCode: `_r = merge([10, 20], [1, 2, 3])\nassert _r == [1, 2, 3, 10, 20], f"Expected [1, 2, 3, 10, 20], got {_r}"` },
          { id: "t3", description: "Empty lists and repeats", assertionCode: `assert merge([], [5]) == [5], "merge([], [5]) should be [5]"\nassert merge([2, 2], [2]) == [2, 2, 2], "merge([2, 2], [2]) should be [2, 2, 2]"` },
        ],
        hints: ["Loop `while i < len(a) and j < len(b):` and compare `a[i]` with `b[j]`.", "After the loop one list is used up: `result.extend(a[i:])` and `result.extend(b[j:])` add the leftovers."],
      },
      {
        kind: "recap",
        points: [
          "**Selection**, **bubble** and **insertion** sort are simple but O(n²); insertion sort is fast on nearly sorted data.",
          "**Merge sort** splits the list in halves, then merges sorted halves: O(n log n).",
          "Merging two sorted lists takes at most one comparison per item.",
          "For a million items, n log n is about 20 million steps against n² ≈ a trillion: use the built-in `sorted()`.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 8. Trees ───────────────────────────────
  {
    id: "fnd-dsa-8-trees",
    title: "Trees and binary search trees",
    summary: "Roots, children and leaves; searching and inserting by going left or right.",
    minutes: 8,
    xp: 60,
    steps: [
      {
        kind: "explain",
        title: "Trees",
        body: "A **tree** stores items in a hierarchy. The top item is the **root**. Each item can have **children** below it, and items with no children are **leaves**. Your files and folders form a tree:\n\n" +
          txt(`
Documents
├── school
│   ├── essay.txt
│   └── notes.txt
└── photos
    └── beach.jpg
`),
      },
      {
        kind: "question",
        title: "Find the leaves",
        body: "In that tree, which items are **leaves**?",
        question: { type: "choice", options: ["Only Documents", "school and photos", "essay.txt, notes.txt and beach.jpg", "All of them"], answer: 2 },
        explanation: "Leaves have no children: the three files. Documents is the **root**, and school and photos are in between: each has a parent above and children below.",
      },
      {
        kind: "explain",
        title: "Binary search trees",
        body: "In a **binary search tree** (BST) each node has at most two children, and one rule holds everywhere: **smaller values go left, bigger values go right**. To insert, start at the root and go left or right at each node until you reach an empty spot. Insert some values.",
        widget: { type: "dsa-bst", props: { initial: BST7, values: [10, 45, 90, 35, 55] } },
      },
      {
        kind: "question",
        title: "Where will 65 go?",
        body: "Predict where **65** lands, then insert it to check.",
        widget: { type: "dsa-bst", props: { initial: BST7, values: [65] }, live: true },
        question: { type: "choice", options: ["Right child of 50", "Left child of 70", "Right child of 60", "Left child of 80"], answer: 2 },
        explanation: "65 > 50, so go right to 70. 65 < 70, so go left to 60. 65 > 60, so go right, and that spot is empty: 65 becomes the **right child of 60**.",
      },
      {
        kind: "question",
        title: "Searching",
        body: "Searching follows the same left-or-right path. How many nodes does a search for **40** visit, counting 40 itself?",
        widget: { type: "dsa-bst", props: { initial: BST7, modes: ["search"], searchValues: [80, 45, 65] }, live: true },
        question: { type: "number", answer: 3, unit: "nodes" },
        explanation: "50 → 30 → **40**: 3 nodes. Each comparison rules out a whole side of the tree, just like binary search rules out half a list. Search for 45 or 65 in the widget: a missing value ends at an empty spot.",
      },
      {
        kind: "question",
        title: "Sorted input",
        body: "Every comparison moves one level down, so the number of **levels** is the most a search can take. Start from an empty tree and insert **10, 20, 30, 40, 50** in that order. What shape appears?",
        widget: { type: "dsa-bst", props: { values: [10, 20, 30, 40, 50] } },
        question: { type: "widget", goal: { count: 5, levels: 5 }, prompt: "Insert all five, smallest first." },
        explanation: "Each value is bigger than everything before it, so it always goes right: the tree becomes a **chain**, really just a linked list. Searching it takes up to n steps, O(n), and the tree's advantage is gone.",
      },
      {
        kind: "question",
        title: "Make it bushy",
        body: "Same five values, but now you choose the order. Build a tree with only **3 levels**.",
        widget: { type: "dsa-bst", props: { values: [10, 20, 30, 40, 50] } },
        question: { type: "widget", goal: { count: 5, levels: 3 }, prompt: "Insert all five so the tree has 3 levels." },
        explanation: "Start in the middle: 30 as the root, then 20 and 40, then 10 and 50 (or 10 then 20, and so on). Real libraries use **self-balancing** trees, such as red-black and AVL trees, which rearrange themselves on every insert so the levels stay near log₂ n.",
      },
      {
        kind: "question",
        title: "A million values",
        body: "A perfectly balanced BST holds 1,000,000 values. About how many comparisons does a search need, at most?",
        question: { type: "choice", options: ["About 20", "About 1,000", "About 500,000", "About 1,000,000"], answer: 0 },
        explanation: "Each level doubles the room: 20 levels hold over a million nodes (2²⁰ − 1), so about **20** comparisons. That matches binary search on a sorted list, but a tree can also **insert** in O(log n), with no shifting.",
      },
      {
        kind: "code",
        title: "Search a BST",
        body: "Each node is a dict with a `\"value\"`, a `\"left\"` and a `\"right\"` (a child node, or `None`). Finish `contains(node, target)`: go left or right at each node until you find the target or hit `None`.\n\n" +
          py(`
tree = {"value": 50,
        "left":  {"value": 30, "left": None, "right": None},
        "right": {"value": 70, "left": None, "right": None}}
contains(tree, 30)   # True
contains(tree, 65)   # False
`),
        language: "python",
        starter: `def contains(node, target):
    if node is None:
        return False
    # TODO: if target is smaller than node["value"], search the
    # left side; if bigger, the right side
    return target == node["value"]
`,
        solution: `def contains(node, target):
    while node is not None:
        if target == node["value"]:
            return True
        if target < node["value"]:
            node = node["left"]
        else:
            node = node["right"]
    return False
`,
        tests: [
          {
            id: "t1",
            description: "Finds values on both sides and deep down",
            assertionCode: `def _bst(vals):
    root = None
    for v in vals:
        new = {"value": v, "left": None, "right": None}
        if root is None:
            root = new
            continue
        cur = root
        while True:
            side = "left" if v < cur["value"] else "right"
            if cur[side] is None:
                cur[side] = new
                break
            cur = cur[side]
    return root
_t = _bst([50, 30, 70, 20, 40, 60, 80, 65])
for _v in [50, 30, 70, 20, 40, 60, 80, 65]:
    assert contains(_t, _v) is True, f"{_v} is in the tree, but contains returned False"`,
          },
          {
            id: "t2",
            description: "Says False for missing values",
            assertionCode: `_t = {"value": 50, "left": {"value": 30, "left": None, "right": None}, "right": {"value": 70, "left": None, "right": None}}
for _v in [10, 45, 65, 99]:
    assert contains(_t, _v) is False, f"{_v} isn't in the tree"
assert contains(None, 5) is False, "An empty tree contains nothing"`,
          },
        ],
        hints: ["Loop `while node is not None:` (or call `contains` again on a child: recursion works too).", "If `target < node[\"value\"]`, move to `node[\"left\"]`; otherwise to `node[\"right\"]`."],
      },
      {
        kind: "recap",
        points: [
          "A **tree** has a root, children and leaves; files and folders are one.",
          "In a **BST**, smaller values go left and bigger go right, at every node.",
          "Search and insert follow one path down: as many steps as the tree has **levels**.",
          "Balanced, that's O(log n); inserting sorted data makes a chain, O(n). Real libraries keep trees balanced.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 9. Graphs and BFS ───────────────────────────────
  {
    id: "fnd-dsa-9-graphs",
    title: "Graphs and breadth-first search",
    summary: "Nodes and edges, and finding shortest routes layer by layer.",
    minutes: 9,
    xp: 70,
    steps: [
      {
        kind: "explain",
        title: "Graphs",
        body: "A **graph** is a set of **nodes** joined by **edges**. Towns and roads, people and friendships, web pages and links: all graphs. (Trees and linked lists are special kinds of graph.)\n\nTap a dashed neighbour to walk from A.",
        widget: { type: "dsa-graph", props: GRAPH },
      },
      {
        kind: "question",
        title: "Fewest edges",
        body: "Find a route from **A** to **H** that uses as few edges as you can.",
        widget: { type: "dsa-graph", props: { ...GRAPH, target: "H" } },
        question: { type: "widget", goal: { to: "H", maxEdges: 3 }, prompt: "Reach H in as few edges as possible." },
        explanation: "A → B → F → H uses **3** edges, and no route is shorter. But how could a program be *sure* it's the shortest, without trying every possible route? Hold that thought.",
      },
      {
        kind: "question",
        title: "Graphs in Python",
        body: "Programs usually store a graph as a dict from each node to a list of its neighbours:\n\n" +
          py(`
graph = {
    "A": ["B", "C"],
    "B": ["A", "D", "F"],
    "E": ["C", "G"],
    "H": ["F", "G"],
    # ...
}
`) +
          "\n\nThe roads go both ways. Which code adds a new road between **E** and **H**?",
        question: {
          type: "choice",
          options: ["`graph[\"E\"].append(\"H\")`", "`graph[\"E\"].append(\"H\")` and `graph[\"H\"].append(\"E\")`", "`graph[\"E\"] = \"H\"`", "`graph[\"E\"] = [\"H\"]`"],
          answer: 1,
        },
        explanation: "A two-way edge appears in **both** nodes' lists, so add H to E's and E to H's. The last two options replace E's list and lose its old roads.",
      },
      {
        kind: "explain",
        title: "Breadth-first search",
        body: "**Breadth-first search** (BFS) finds shortest routes by exploring in **layers**: first every node 1 edge from the start, then every node 2 edges away, and so on. It keeps a **queue** of nodes to visit, so nodes are handled in the order they were discovered.\n\nBecause of that order, the first time BFS reaches a node is always by a shortest route. Step through the layers.",
        widget: { type: "dsa-graph", props: { ...GRAPH, modes: ["bfs"] } },
      },
      {
        kind: "question",
        title: "How far is G?",
        body: "How many edges is the shortest route from A to **G**?",
        widget: { type: "dsa-graph", props: { ...GRAPH, modes: ["bfs"] }, live: true },
        question: { type: "number", answer: 3, unit: "edges" },
        explanation: "G first appears in layer **3** (for example A → B → D → G, or A → C → E → G). BFS found every node within 2 edges in earlier layers, and G wasn't among them, so no route shorter than 3 exists.",
      },
      {
        kind: "explain",
        title: "A grid is a graph",
        body: "A grid is a graph too: each open cell is a node with edges to the cells up, down, left and right. BFS on a grid spreads out like a ripple, and the number in each cell is its distance from **S**. Step it.",
        widget: { type: "dsa-grid", props: { map: ["S.....", ".##.#.", "...#..", ".#...G"] } },
      },
      {
        kind: "question",
        title: "Through the maze",
        body: "Run BFS on this maze. How many moves is the shortest path from S to G?",
        widget: { type: "dsa-grid", props: { map: MAZE }, live: true },
        question: { type: "number", answer: 15, unit: "moves" },
        explanation: "G is first reached in layer **15**, and the path lights up. BFS never guesses: by the time it reaches G it has explored every cell closer than 15 moves, so nothing shorter exists.",
      },
      {
        kind: "question",
        title: "Build a detour",
        body: "This room is open: S to G takes 11 moves. Tap cells to add walls so the shortest path is **at least 15 moves**, but G can still be reached.",
        widget: { type: "dsa-grid", props: { map: ["S......", ".......", ".......", ".......", ".......", "......G"], editable: true } },
        question: { type: "widget", goal: { distanceMin: 15 }, prompt: "Make the shortest path 15 moves or longer." },
        explanation: "A wall that blocks the direct way forces a detour, and BFS finds the shortest detour around it. Wall G off completely and the frontier empties before reaching it: BFS can also prove there's **no** route.",
      },
      {
        kind: "code",
        title: "BFS in Python",
        body: "Finish `distance(graph, start, goal)`: the fewest edges from start to goal, or -1 if there's no route. The queue and the `dist` dict are set up; when you take a node off the queue, give each **unseen** neighbour a distance one more than the node's, and queue it.",
        language: "python",
        starter: `from collections import deque

def distance(graph, start, goal):
    dist = {start: 0}
    queue = deque([start])
    while queue:
        node = queue.popleft()
        if node == goal:
            return dist[node]
        for nb in graph[node]:
            # TODO: if nb has no distance yet, set it to
            # dist[node] + 1 and add nb to the queue
            pass
    return -1
`,
        solution: `from collections import deque

def distance(graph, start, goal):
    dist = {start: 0}
    queue = deque([start])
    while queue:
        node = queue.popleft()
        if node == goal:
            return dist[node]
        for nb in graph[node]:
            if nb not in dist:
                dist[nb] = dist[node] + 1
                queue.append(nb)
    return -1
`,
        tests: [
          {
            id: "t1",
            description: "Shortest routes in the lesson's graph",
            assertionCode: `_g = {"A": ["B", "C"], "B": ["A", "D", "F"], "C": ["A", "D", "E"], "D": ["B", "C", "F", "G"], "E": ["C", "G"], "F": ["B", "D", "H"], "G": ["D", "E", "H"], "H": ["F", "G"]}
for _to, _want in [("A", 0), ("C", 1), ("D", 2), ("G", 3), ("H", 3)]:
    _got = distance(_g, "A", _to)
    assert _got == _want, f"distance(graph, 'A', '{_to}') should be {_want}, got {_got}"`,
          },
          { id: "t2", description: "Returns -1 when there's no route", assertionCode: `_g = {"A": ["B"], "B": ["A"], "C": []}\n_got = distance(_g, "A", "C")\nassert _got == -1, f"C can't be reached from A: expected -1, got {_got}"` },
          { id: "t3", description: "Finds the short way round a loop", assertionCode: `_g = {1: [2, 6], 2: [1, 3], 3: [2, 4], 4: [3, 5], 5: [4, 6], 6: [5, 1]}\n_got = distance(_g, 1, 5)\nassert _got == 2, f"1 → 6 → 5 is 2 edges, got {_got}"` },
        ],
        hints: ["Inside the for loop: `if nb not in dist:`.", "Then `dist[nb] = dist[node] + 1` and `queue.append(nb)`."],
      },
      {
        kind: "recap",
        points: [
          "A **graph** is nodes joined by edges; in Python, a dict from each node to its list of neighbours.",
          "**BFS** explores in layers using a queue: everything 1 edge away, then 2, then 3.",
          "The first time BFS reaches a node is by a **shortest** route (counting edges).",
          "Grids and mazes are graphs, so BFS finds shortest paths through them too, or proves there's none.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 10. Choosing a data structure ───────────────────────────────
  {
    id: "fnd-dsa-10-choosing",
    title: "Choosing a data structure",
    summary: "Match the job to the structure whose fast operations fit it.",
    minutes: 7,
    xp: 60,
    steps: [
      {
        kind: "explain",
        title: "Your toolbox",
        body: "Every structure is fast at some jobs and slow at others. The skill is matching the job to the structure:\n\n" +
          txt(`
structure     fast                        slow
list          read by index, append       search, insert at front
dict / set    look up, add, remove a key  anything about order
stack         push / pop the newest       reaching older items
queue         add at back, take front     reaching the middle
sorted list   binary search, O(log n)     inserting (shifts)
balanced BST  search and insert, log n    more code, more memory
graph + BFS   fewest steps between nodes  (a model, not a box)
`),
      },
      {
        kind: "question",
        title: "Sort the jobs",
        body: "Which built-in structure fits each job best? Tap a card, then its structure.",
        widget: {
          type: "pattern-sorter",
          props: {
            buckets: [
              { id: "list", label: "List", hint: "ordered, by index" },
              { id: "dict", label: "Dict or set", hint: "look up by key" },
              { id: "stack", label: "Stack", hint: "newest first" },
              { id: "queue", label: "Queue", hint: "oldest first" },
            ],
            items: [
              { id: "phone", text: "A phone book: name → number" },
              { id: "chapters", text: "The chapters of a book, in order" },
              { id: "orders", text: "Takeaway orders, cooked in arrival order" },
              { id: "undo", text: "Ctrl+Z in a text editor" },
              { id: "taken", text: "Is this username already taken?" },
              { id: "top", text: "Scores to show as row 1, row 2, row 3…" },
              { id: "jobs", text: "Files waiting to upload, one at a time" },
              { id: "back", text: "Retracing your steps in a maze" },
            ],
            answer: { phone: "dict", taken: "dict", chapters: "list", top: "list", orders: "queue", jobs: "queue", undo: "stack", back: "stack" },
          },
        },
        question: { type: "widget", goal: { placed: { phone: "dict", taken: "dict", chapters: "list", top: "list", orders: "queue", jobs: "queue", undo: "stack", back: "stack" } } },
        explanation: "Looking things up by name or checking membership: **dict or set**. Keeping things in a fixed order to read by position: **list**. Serving in arrival order: **queue**. Going back to the most recent thing: **stack**.",
      },
      {
        kind: "question",
        title: "The spell checker",
        body: "A spell checker checks every word you type against 200,000 dictionary words. What should it keep the dictionary in?",
        question: { type: "choice", options: ["A list, checked with `in`", "A set", "A stack", "A queue"], answer: 1 },
        explanation: "Each check is a membership test, and a **set** answers it in about one step. A list would compare up to 200,000 words for every word you type. (A sorted list with binary search would also work: about 18 steps.)",
      },
      {
        kind: "question",
        title: "Counting sales",
        body: "You have 10 million sales records, each with a product name. You want the number of sales for each product. What's the best plan?",
        question: {
          type: "choice",
          options: [
            "For each product, loop over all the sales and count its matches",
            "One pass over the sales, adding 1 to a dict entry keyed by product",
            "Sort the sales, then binary search for each product",
            "Push every sale onto a stack",
          ],
          answer: 1,
        },
        explanation: "One pass with a **dict** is O(n): 10 million quick updates. Looping over all sales once per product is O(products × n), which with thousands of products means billions of steps. Sorting first works but costs O(n log n) before you even start counting.",
      },
      {
        kind: "question",
        title: "Train changes",
        body: "A travel app wants the route with the **fewest changes** between two stations on a train network. What fits?",
        question: { type: "choice", options: ["A sorted list of station names", "A graph of stations and lines, searched with BFS", "A stack of stations", "A hash map from station to its name length"], answer: 1 },
        explanation: "Stations are **nodes** and direct connections are **edges**, so \"fewest changes\" is a shortest route in a graph, exactly what **BFS** finds. (When edges have different lengths, like travel times, apps use Dijkstra's algorithm, a cousin of BFS.)",
      },
      {
        kind: "question",
        title: "Any duplicates?",
        body: "You need to know whether any two of 100,000 user IDs are the same. Which approach is fastest?",
        question: {
          type: "choice",
          options: ["Compare every ID with every other ID: O(n²)", "Add each ID to a set, stopping if it's already there: O(n)", "Binary search the unsorted list for each ID", "Put them in a queue and dequeue them all"],
          answer: 1,
        },
        explanation: "With a **set**, each ID costs about one step to check and add, so 100,000 IDs take about 100,000 steps. Comparing every pair is about 5 billion comparisons. Binary search fails on unsorted data.",
      },
      {
        kind: "question",
        title: "Read many, change never",
        body: "A list of 1,000,000 sorted postcodes never changes, and the app checks thousands of postcodes against it every second. What's a good way to check one?",
        question: { type: "choice", options: ["Linear search, item by item", "Binary search on the sorted list", "Pop items off it like a stack until you find it", "Sort it again before each check"], answer: 1 },
        explanation: "It's already sorted and never changes, so **binary search** answers each check in about 20 steps with no extra memory. (A set would work too, at about one step per check, at the cost of building it first.) Re-sorting before every check would waste O(n log n) each time.",
      },
      {
        kind: "code",
        title: "The first repeat",
        body: "Write `first_repeat(words)`: return the first word that appears for a **second** time, or `None` if no word repeats. Keep the words you've already seen in a **set**, so each check is about one step and the whole thing is O(n).\n\n" + py(`first_repeat(["to", "be", "or", "not", "to", "be"])   # "to"`),
        language: "python",
        starter: `def first_repeat(words):
    seen = set()
    for w in words:
        # TODO: if w is already in seen, it's the first repeat.
        # Otherwise remember it.
        pass
    return None
`,
        solution: `def first_repeat(words):
    seen = set()
    for w in words:
        if w in seen:
            return w
        seen.add(w)
    return None
`,
        tests: [
          { id: "t1", description: "Finds the first word seen twice", assertionCode: `_r = first_repeat(["to", "be", "or", "not", "to", "be"])\nassert _r == "to", f"Expected 'to', got {_r!r}"` },
          { id: "t2", description: "The first second sighting wins", assertionCode: `_r = first_repeat(["b", "a", "a", "b"])\nassert _r == "a", f"'a' is seen twice (at index 2) before 'b' is (at index 3): expected 'a', got {_r!r}"` },
          { id: "t3", description: "None when nothing repeats", assertionCode: `assert first_repeat(["x", "y", "z"]) is None, "No word repeats: return None"\nassert first_repeat([]) is None, "An empty list has no repeats"` },
        ],
        hints: ["`if w in seen: return w`", "Otherwise `seen.add(w)`, so later copies are spotted."],
      },
      {
        kind: "recap",
        points: [
          "Choose a structure by the operations your program does **most**, and their Big-O.",
          "Membership or lookup by key: **dict / set**. Order and position: **list**. Most recent first: **stack**. Arrival order: **queue**.",
          "Searching sorted data that rarely changes: **binary search**. Shortest routes: a **graph** with **BFS**.",
          "A good choice often turns O(n²) into O(n), the difference between hours and a blink.",
        ],
      },
    ],
  },
];

export const dsaModule: Module = {
  id: "dsa",
  part: "program",
  title: "Data structures and algorithms",
  blurb: "Big-O, arrays and linked lists, stacks and queues, hash maps, trees, searching and sorting.",
  icon: "tree",
  lessons,
};
