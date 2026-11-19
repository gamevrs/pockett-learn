import type { ConceptLesson } from "../../learn/types.ts";

/** Fenced Python block for lesson prose. */
const py = (code: string) => "~~~python\n" + code.trim() + "\n~~~";

// ── shared trace data ──
const COMP_CODE = [
  "for s in range(n):",
  "    if seen[s]: continue",
  "    groups += 1",
  "    seen[s] = True; stack = [s]",
  "    while stack:",
  "        u = stack.pop()",
  "        for v in adj[u]:",
  "            if not seen[v]:",
  "                seen[v] = True; stack.append(v)",
];
const COMP_GRAPH = {
  nodes: [
    { id: "A", x: 8, y: 22 },
    { id: "B", x: 32, y: 8 },
    { id: "C", x: 12, y: 82 },
    { id: "D", x: 36, y: 64 },
    { id: "E", x: 58, y: 18 },
    { id: "F", x: 86, y: 10 },
    { id: "G", x: 62, y: 86 },
    { id: "H", x: 90, y: 72 },
  ],
  edges: [
    ["A", "B"],
    ["A", "C"],
    ["B", "D"],
    ["C", "D"],
    ["E", "F"],
    ["G", "H"],
  ] as [string, string][],
};

const KAHN_CODE = [
  "queue = deque(v for v in nodes if indeg[v] == 0)",
  "while queue:",
  "    u = queue.popleft(); order.append(u)",
  "    for v in adj[u]:",
  "        indeg[v] -= 1",
  "        if indeg[v] == 0: queue.append(v)",
];
const KAHN_GRAPH = {
  nodes: [
    { id: "D", x: 8, y: 20 },
    { id: "F", x: 8, y: 80 },
    { id: "A", x: 38, y: 20 },
    { id: "C", x: 38, y: 80 },
    { id: "E", x: 66, y: 50 },
    { id: "B", x: 92, y: 50 },
  ],
  edges: [
    ["D", "A"],
    ["F", "A"],
    ["F", "C"],
    ["A", "E"],
    ["C", "E"],
    ["E", "B"],
  ] as [string, string][],
  directed: true,
};

const DSU_CODE = [
  "def find(x):",
  "    while parent[x] != x:",
  "        parent[x] = parent[parent[x]]",
  "        x = parent[x]",
  "    return x",
  "def union(a, b):",
  "    ra, rb = find(a), find(b)",
  "    if ra == rb: return False",
  "    if size[ra] < size[rb]: ra, rb = rb, ra",
  "    parent[rb] = ra; size[ra] += size[rb]",
  "    return True",
];
/** A forest drawn from a parent array (roots have parent[i] == i). */
const forest = (parent: number[]) => parent.map((p, i) => (p === i ? { id: String(i), label: String(i) } : { id: String(i), label: String(i), parent: String(p) }));

const DIJ_CODE = [
  "dist = {start: 0}; heap = [(0, start)]",
  "while heap:",
  "    d, u = heappop(heap)",
  "    if d > dist[u]: continue      # stale entry",
  "    for v, w in adj[u]:",
  "        if d + w < dist.get(v, INF):",
  "            dist[v] = d + w",
  "            heappush(heap, (d + w, v))",
];
const DIJ_GRAPH = {
  nodes: [
    { id: "S", x: 8, y: 50 },
    { id: "A", x: 34, y: 12 },
    { id: "B", x: 34, y: 88 },
    { id: "C", x: 62, y: 38 },
    { id: "D", x: 66, y: 90 },
    { id: "E", x: 92, y: 56 },
  ],
  edges: [
    ["S", "A", 4],
    ["S", "B", 1],
    ["B", "A", 2],
    ["A", "C", 1],
    ["B", "C", 5],
    ["C", "D", 3],
    ["B", "D", 8],
    ["D", "E", 1],
    ["C", "E", 6],
  ] as [string, string, number][],
};

/** Lessons 1 to 4 of "Graphs": representations and components, topological sort, union-find, shortest paths. */
export const ivGraphsLessonsA: ConceptLesson[] = [
  // ─────────────────────────────── 1. Graph theory basics ───────────────────────────────
  {
    id: "fnd-iv-graphs-1-graph-theory",
    title: "Graphs: storage, degree and components",
    summary: "Edge lists, adjacency lists and matrices, the handshake rule, and counting connected groups without recursion.",
    level: "Beginner",
    minutes: 12,
    xp: 60,
    steps: [
      {
        kind: "explain",
        title: "Spotting a graph",
        body: "A **graph** is a set of things (**vertices**, or nodes) and the links between them (**edges**). An edge can be two-way (**undirected**: a friendship, a road) or one-way (**directed**: \"follows\", \"must come before\"). It can carry a **weight** (a distance, a price, a time).\n\nInterview problems rarely say \"graph\". Listen for these words instead:\n\n- *connected, linked, reachable, network, friends, routes, cables, flights*\n- *depends on, must happen before, prerequisite*\n- a grid where you step to neighbouring squares (each square is a node, each step an edge)\n\nOnce you see the graph, most problems become a standard walk: breadth-first search (BFS), depth-first search (DFS), or one of the algorithms in this module. The *Data structures and algorithms* module shows BFS from scratch; here we go further.\n\nTwo letters you will see in every complexity: **V** is the number of vertices and **E** the number of edges.",
      },
      {
        kind: "explain",
        title: "Three ways to store one",
        body: "Problems usually hand you an **edge list**: `[(0, 1), (1, 2), ...]`. That's easy to read but slow to ask \"who are 1's neighbours?\", so the first thing you write is almost always an **adjacency list**:\n\n" +
          py(`
def build(n, edges):
    adj = [[] for _ in range(n)]      # one list per node
    for a, b in edges:
        adj[a].append(b)
        adj[b].append(a)              # leave this out if edges are one-way
    return adj
`) +
          "\n\n| Storage | Space | Neighbours of u | Is (u, v) an edge? |\n| --- | --- | --- | --- |\n| Edge list | O(E) | O(E) | O(E) |\n| Adjacency list | O(V + E) | O(degree of u) | O(degree of u) |\n| Adjacency matrix (V × V grid of 0/1) | O(V²) | O(V) | O(1) |\n\nUse the list by default. A matrix only pays off when the graph is small or **dense** (almost every pair is linked).",
      },
      {
        kind: "question",
        title: "Pick the storage",
        body: "A social app has 100,000 users and 300,000 friendships. You need to visit each user's friends many times. How do you store the graph?",
        question: {
          type: "choice",
          options: ["An adjacency matrix, for O(1) edge checks", "An adjacency list per user", "Only the edge list, as given", "A sorted array of user ids"],
          answer: 1,
          feedback: {
            0: "100,000 × 100,000 is ten billion cells, almost all zeros. That will not fit in memory.",
            2: "Finding one user's friends would mean scanning all 300,000 edges every time.",
            3: "The ids alone don't say who is friends with whom.",
          },
          hint: "Compare V² with V + E for these numbers.",
        },
        explanation: "An **adjacency list** takes O(V + E), about 700,000 entries here (each friendship is stored twice), and lists a user's friends in time proportional to how many they have. The matrix would need 10¹⁰ cells.",
      },
      {
        kind: "question",
        title: "The handshake rule",
        body: "The **degree** of a node is how many edges touch it. Every undirected edge has two ends, so the degrees always add up to **2 × E** (the handshake rule). In a directed graph each node has an **in-degree** (arrows in) and an **out-degree** (arrows out), and both totals equal E.\n\nA delivery map has 6 depots joined by 9 two-way roads. Find the sum of all the depots' degrees.",
        question: { type: "number", answer: 18, hint: "Each road adds one to the degree of each of its two ends." },
        explanation: "Each of the 9 roads counts once at each end: 2 × 9 = **18**, whatever the layout. A handy check: the number of odd-degree nodes is always even, because the total is even.",
      },
      {
        kind: "explain",
        title: "Connected components",
        body: "A **connected component** is a group of nodes that can all reach each other, and nothing outside it. Counting them is a classic: \"how many friend groups?\", \"how many islands?\", \"how many separate networks?\".\n\nThe pattern is an **outer loop over every node** wrapped around a walk:\n\n1. Go through the nodes in order.\n2. Skip any node you have already seen.\n3. An unseen node starts a **new group**: walk from it (DFS or BFS) and mark everything you reach.\n\nEvery node and every edge is handled a constant number of times, so it is **O(V + E)**.\n\n**Pitfall:** a recursive DFS goes one call deeper per step. On a long chain of 100,000 nodes, Python stops at about 1,000 calls with a `RecursionError`. Use an explicit **stack** (a list you `append` to and `pop` from) instead.",
      },
      {
        kind: "question",
        title: "Count the groups",
        body: "Step through the count on this graph. Neighbours are pushed in alphabetical order, and the stack pops its **last** item first. At each stop, tap the node the question asks for.",
        widget: {
          type: "iv-trace",
          props: {
            title: "Counting connected components",
            frames: [
              { graph: { ...COMP_GRAPH, active: ["A"] }, code: COMP_CODE, line: 3, stacks: [{ label: "stack", items: ["A"] }], vars: { groups: 1, seen: "A" }, note: "The outer loop starts at A. It is unseen, so a **new group** begins." },
              { graph: { active: ["A"], activeEdges: [["A", "B"], ["A", "C"]] }, line: 9, stacks: [{ label: "stack", items: ["B", "C"] }], vars: { groups: 1, seen: "A B C" }, note: "Pop A. Its neighbours B and C are unseen: mark them and push them." },
              { graph: { done: ["A"] }, line: 6, note: "The stack holds B, C.", pick: { prompt: "Which node does `stack.pop()` take next?", answer: "C" } },
              { graph: { active: ["C"], done: ["A"], activeEdges: [["C", "D"]] }, line: 9, stacks: [{ label: "stack", items: ["B", "D"] }], vars: { groups: 1, seen: "A B C D" }, note: "C came off the top. A is seen already; D is new, so it is pushed." },
              { graph: { active: ["D"], done: ["A", "C"] }, line: 7, stacks: [{ label: "stack", items: ["B"] }], note: "Pop D. Both its neighbours, B and C, are seen. Nothing new." },
              { graph: { active: ["B"], done: ["A", "C", "D"] }, line: 5, stacks: [{ label: "stack", items: [] }], note: "Pop B. Nothing new, and the stack is empty: group 1 is **A B C D**." },
              { graph: { done: ["A", "B", "C", "D"] }, line: 2, note: "Back in the outer loop: B, C and D are skipped because they are seen.", pick: { prompt: "Which node starts the second group?", answer: "E" } },
              { graph: { active: ["E", "F"], done: ["A", "B", "C", "D"], activeEdges: [["E", "F"]] }, line: 3, vars: { groups: 2, seen: "A B C D E F" }, note: "E starts group 2, and the walk reaches F." },
              { graph: { active: ["G", "H"], done: ["A", "B", "C", "D", "E", "F"], activeEdges: [["G", "H"]] }, line: 3, vars: { groups: 3, seen: "all 8" }, note: "F is skipped; G starts group 3 and reaches H. H is skipped. The answer is **3 groups**." },
            ],
          },
        },
        question: { type: "widget", goal: { picked: true }, prompt: "Answer both picks.", hint: "A stack is last in, first out; the outer loop only stops at nodes nobody has reached yet." },
        explanation: "Each unseen node the outer loop meets starts exactly one group, and the walk from it marks the whole group so it is never counted twice.",
      },
      {
        kind: "question",
        title: "What it costs",
        body: "With an adjacency list, what is the running time of counting components this way?",
        question: {
          type: "choice",
          options: ["O(V × E)", "O(V²)", "O(E log V)", "O(V + E)"],
          answer: 3,
          feedback: {
            0: "Each walk only covers its own group, and no node is walked twice.",
            1: "That is what an adjacency matrix would cost, because each row scan is O(V).",
            2: "There is no sorting or heap here.",
          },
          hint: "How many times is each node pushed, and how many times is each edge looked at?",
        },
        explanation: "Each node is pushed once (it is marked seen when pushed) and each edge is checked once from each end: **O(V + E)**.",
      },
      {
        kind: "code",
        title: "Count the friend groups",
        body: "Write `count_groups(n, links)`. There are `n` people, numbered `0` to `n - 1`, and `links` is a list of two-way friendships `(a, b)`. Return how many separate friend groups there are (a person with no friends is a group of one).\n\nOne test is a chain of 20,000 people, so use an explicit stack, not recursion.\n\n" +
          py(`
count_groups(5, [(0, 1), (3, 4)])   # 3: {0, 1}, {2}, {3, 4}
count_groups(3, [])                 # 3
`),
        language: "python",
        starter: `def count_groups(n, links):
    adj = [[] for _ in range(n)]
    for a, b in links:
        adj[a].append(b)
        adj[b].append(a)
    groups = 0
    # outer loop over every person; an unseen person starts a new group
    return groups
`,
        solution: `def count_groups(n, links):
    adj = [[] for _ in range(n)]
    for a, b in links:
        adj[a].append(b)
        adj[b].append(a)
    groups = 0
    seen = [False] * n
    for s in range(n):
        if seen[s]:
            continue
        groups += 1
        seen[s] = True
        stack = [s]
        while stack:
            u = stack.pop()
            for v in adj[u]:
                if not seen[v]:
                    seen[v] = True
                    stack.append(v)
    return groups
`,
        tests: [
          { id: "t1", description: "three groups", assertionCode: `_r = count_groups(8, [(0, 1), (1, 2), (3, 4), (5, 6), (6, 7), (7, 5)])\nassert _r == 3, f"expected 3 groups ({{0,1,2}}, {{3,4}}, {{5,6,7}}), got {_r}"` },
          { id: "t2", description: "nobody linked: everyone alone", assertionCode: `_r = count_groups(4, [])\nassert _r == 4, f"with no links each of the 4 people is a group, got {_r}"\n_r = count_groups(0, [])\nassert _r == 0, f"no people means no groups, got {_r}"` },
          { id: "t3", description: "repeated links and a self-link", assertionCode: `_r = count_groups(3, [(0, 1), (1, 0), (0, 1), (2, 2)])\nassert _r == 2, f"duplicate links and a person linked to themself change nothing: expected 2, got {_r}"` },
          { id: "t4", description: "a chain of 20,000 people", assertionCode: `_n = 20000\n_r = count_groups(_n, [(i, i + 1) for i in range(_n - 1)])\nassert _r == 1, f"a single long chain is one group, got {_r}"` },
        ],
        hints: ["Keep a `seen` list. For each person `s` not yet seen: add one to `groups`, then walk from `s` with a stack.", "Mark a node as seen when you push it, not when you pop it, so it can't be pushed twice."],
      },
      {
        kind: "code",
        title: "Is the cable plan a tree?",
        body: "A **tree** is a graph that is connected and has no loops. With n nodes, a tree always has exactly **n − 1** edges. The reverse is not true: n − 1 edges can also make a loop in one place and leave someone cut off somewhere else.\n\nWrite `is_tree(n, links)` for `n` offices (n is at least 1) and two-way `links`: check the edge count **and** that every office is connected. Checking only one of the two is the classic mistake.",
        language: "python",
        starter: `def is_tree(n, links):
    # 1. exactly n - 1 links?
    # 2. does a walk from office 0 reach all n offices?
    return None
`,
        solution: `def is_tree(n, links):
    if len(links) != n - 1:
        return False
    adj = [[] for _ in range(n)]
    for a, b in links:
        adj[a].append(b)
        adj[b].append(a)
    seen = {0}
    stack = [0]
    while stack:
        u = stack.pop()
        for v in adj[u]:
            if v not in seen:
                seen.add(v)
                stack.append(v)
    return len(seen) == n
`,
        tests: [
          { id: "t1", description: "a real tree", assertionCode: `_r = is_tree(5, [(0, 1), (0, 2), (2, 3), (2, 4)])\nassert _r is True, f"4 links joining all 5 offices with no loop is a tree, got {_r}"` },
          { id: "t2", description: "right count, but a loop and a lonely office", assertionCode: `_r = is_tree(4, [(0, 1), (1, 2), (2, 0)])\nassert _r is False, f"0-1-2 form a loop and office 3 is cut off: not a tree, got {_r}"` },
          { id: "t3", description: "one office, no links", assertionCode: `_r = is_tree(1, [])\nassert _r is True, f"a single office is a tree, got {_r}"` },
          { id: "t4", description: "connected, but one link too many", assertionCode: `_r = is_tree(3, [(0, 1), (1, 2), (2, 0)])\nassert _r is False, f"3 links on 3 offices must make a loop, got {_r}"` },
        ],
        hints: ["Keep the edge-count check, then walk from office 0 and count how many offices you reach.", "With exactly n − 1 edges, \"connected\" alone already rules out a loop."],
      },
      {
        kind: "recap",
        points: [
          "Listen for *connected, depends on, routes, network* and grids: they are graphs in disguise.",
          "Build an **adjacency list** first: O(V + E) space, fast neighbour lists. A matrix costs O(V²).",
          "Undirected degrees add up to **2E**; in a directed graph the in-degrees and the out-degrees each add up to E.",
          "Count **components** with an outer loop plus a walk from each unseen node: O(V + E).",
          "Use an explicit stack in Python: recursion breaks at about 1,000 levels.",
          "A **tree** has n − 1 edges *and* is connected.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 2. Topological sort ───────────────────────────────
  {
    id: "fnd-iv-graphs-2-topological-sort",
    title: "Topological sort: doing things in order",
    summary: "Kahn's in-degree queue, the DFS finishing order, spotting cycles, and the longest path through a task plan.",
    level: "Intermediate",
    minutes: 12,
    xp: 70,
    steps: [
      {
        kind: "explain",
        title: "Before and after",
        body: "A directed graph with no cycles is a **DAG** (directed acyclic graph). A **topological order** lists its nodes so that every edge `u → v` has `u` before `v`: a valid order to do tasks that depend on each other.\n\nSignal words: *prerequisites, must be done before, depends on, build order, install order, can every task be finished?*\n\n**Kahn's algorithm** works with **in-degrees** (how many arrows point into each node):\n\n1. Put every node with in-degree 0 in a queue: nothing has to come before them.\n2. Take a node out and add it to the order. For each arrow it has, lower the target's in-degree by 1.\n3. A target that reaches 0 is now free: queue it.\n\nIf the order ends up shorter than the number of nodes, the leftovers are stuck waiting on each other: there is a **cycle**, and no valid order exists. It runs in **O(V + E)**.",
      },
      {
        kind: "question",
        title: "Run Kahn's algorithm",
        body: "Six build steps; an arrow means \"must finish before\". Step through Kahn's algorithm and tap the node each question asks for.",
        widget: {
          type: "iv-trace",
          props: {
            title: "Kahn's algorithm",
            frames: [
              { graph: { ...KAHN_GRAPH, active: ["D", "F"] }, code: KAHN_CODE, line: 1, stacks: [{ label: "queue", items: ["D", "F"], kind: "queue" }], vars: { "in-degree": "A2 C1 E2 B1", order: "" }, note: "D and F have no arrows coming in, so both start in the queue." },
              { graph: { active: ["D"] }, line: 5, note: "Take D out and follow its one arrow.", pick: { prompt: "Whose in-degree goes down?", answer: "A" } },
              { graph: { done: ["D"], active: ["F"], activeEdges: [["F", "A"], ["F", "C"]] }, line: 6, stacks: [{ label: "queue", items: ["A", "C"], kind: "queue" }], vars: { "in-degree": "A0 C0 E2 B1", order: "D F" }, note: "A dropped to 1. Then F comes out: A and C both drop to 0 and join the queue." },
              { graph: { done: ["D", "F"], active: ["A"], activeEdges: [["A", "E"]] }, line: 5, stacks: [{ label: "queue", items: ["C"], kind: "queue" }], vars: { "in-degree": "E1 B1", order: "D F A" }, note: "A comes out; E drops to 1. E still waits for C." },
              { graph: { done: ["D", "F", "A"] }, line: 3, note: "The queue holds only C.", pick: { prompt: "After C comes out, which node joins the queue?", answer: "E" } },
              { graph: { done: ["D", "F", "A", "C"], active: ["E"], activeEdges: [["C", "E"]] }, line: 6, stacks: [{ label: "queue", items: ["E"], kind: "queue" }], vars: { "in-degree": "E0 B1", order: "D F A C" }, note: "C's arrow takes E to 0, so E joins." },
              { graph: { done: ["D", "F", "A", "C", "E", "B"] }, line: 2, stacks: [{ label: "queue", items: [], kind: "queue" }], vars: { "in-degree": "all 0", order: "D F A C E B" }, note: "E frees B, B comes out, the queue is empty. All 6 nodes are in the order: **D F A C E B**." },
            ],
          },
        },
        question: { type: "widget", goal: { picked: true }, prompt: "Answer both picks.", hint: "A node joins the queue only when its last remaining arrow in has been used up." },
        explanation: "Every node joins the queue exactly once, at the moment all its prerequisites are done. That's why the order is always valid.",
      },
      {
        kind: "question",
        title: "Stuck halfway",
        body: "On a graph of 7 tasks, Kahn's algorithm stops with only 4 tasks in its order and an empty queue. What does that tell you?",
        question: {
          type: "choice",
          options: ["The 3 missing tasks have no prerequisites", "The queue was too small", "The other 3 tasks include a cycle", "The order is still valid; add the 3 at the end"],
          answer: 2,
          feedback: {
            0: "Tasks with no prerequisites start in the queue, so they would be in the order.",
            1: "A queue never runs out of room; it simply emptied.",
            3: "The 3 tasks all still have unmet prerequisites, so no position for them is valid.",
          },
          hint: "Why would a task's in-degree never reach 0?",
        },
        explanation: "The leftovers each still wait on another leftover, and following those waits must eventually loop back: a **cycle**. That's the standard \"can all tasks be finished?\" check: compare `len(order)` with the node count.",
      },
      {
        kind: "question",
        title: "Order the release",
        body: "A release has five jobs. **lint** runs before **compile**. **compile** runs before **test**. **lint** also runs before **test**. **test** runs before **package**, and **package** before **deploy**. Put the jobs in the only valid order.",
        question: { type: "order", items: ["lint", "compile", "test", "package", "deploy"], hint: "Find the job nothing has to come before, write it down, cross out its arrows, and repeat." },
        explanation: "Only lint has in-degree 0 at the start. Removing it frees compile, then test, then package, then deploy. When the queue never holds more than one node, the topological order is unique.",
      },
      {
        kind: "question",
        title: "The DFS way",
        body: "The other classic method runs a DFS and records each node when it **finishes** (after all its descendants are done), then **reverses** that list. Why does the reversed finishing order work?",
        question: {
          type: "choice",
          options: ["DFS visits nodes in alphabetical order", "A node finishes only after everything it points to", "Reversing a list sorts it by in-degree", "Every DAG has exactly one finishing order"],
          answer: 1,
          feedback: {
            0: "The visiting order depends on the edges, not the names.",
            2: "Reversing doesn't sort anything; it flips the order.",
            3: "Different start nodes give different finishing orders, and all of them work.",
          },
          hint: "Think about `u → v`: when DFS is at u, can u finish before v does?",
        },
        explanation: "For an edge `u → v` in a DAG, v always finishes before u (either DFS goes into v from u, or v was already finished). So in the **reversed** list, u comes before v. A node that is still \"in progress\" when you reach it again means a cycle.",
      },
      {
        kind: "code",
        title: "A build order",
        body: "Write `build_order(n, deps)`. Tasks are numbered `0` to `n - 1`; each `(a, b)` in `deps` means task `a` must finish before task `b`. Return a list with every task once, in an order that respects all the deps, or `[]` if no order exists. Any valid order passes.\n\nUse `collections.deque` for the queue: `list.pop(0)` shifts the whole list each time.",
        language: "python",
        starter: `from collections import deque

def build_order(n, deps):
    adj = [[] for _ in range(n)]
    indeg = [0] * n
    for a, b in deps:
        adj[a].append(b)
        indeg[b] += 1
    order = []
    # Kahn's algorithm: start from every task with in-degree 0
    # return the order, or [] if some task never gets free
    return None
`,
        solution: `from collections import deque

def build_order(n, deps):
    adj = [[] for _ in range(n)]
    indeg = [0] * n
    for a, b in deps:
        adj[a].append(b)
        indeg[b] += 1
    order = []
    queue = deque(i for i in range(n) if indeg[i] == 0)
    while queue:
        u = queue.popleft()
        order.append(u)
        for v in adj[u]:
            indeg[v] -= 1
            if indeg[v] == 0:
                queue.append(v)
    return order if len(order) == n else []
`,
        tests: [
          {
            id: "t1",
            description: "a valid order for a diamond",
            assertionCode: `_deps = [(0, 1), (0, 2), (1, 3), (2, 3)]\n_r = build_order(4, _deps)\nassert isinstance(_r, list), f"build_order should return a list, got {_r!r}"\nassert sorted(_r) == [0, 1, 2, 3], f"every task must appear exactly once, got {_r}"\n_pos = {t: i for i, t in enumerate(_r)}\nfor _a, _b in _deps:\n    assert _pos[_a] < _pos[_b], f"task {_a} must come before task {_b}, got {_r}"`,
          },
          { id: "t2", description: "a cycle means no order", assertionCode: `_r = build_order(4, [(0, 1), (1, 2), (2, 3), (3, 1)])\nassert _r == [], f"1 -> 2 -> 3 -> 1 is a cycle, so return [], got {_r}"` },
          { id: "t3", description: "no deps: every task, any order", assertionCode: `_r = build_order(3, [])\nassert isinstance(_r, list) and sorted(_r) == [0, 1, 2], f"with no deps all 3 tasks still appear, got {_r}"` },
          {
            id: "t4",
            description: "a longer chain given backwards",
            assertionCode: `_deps = [(i + 1, i) for i in range(999)]\n_r = build_order(1000, _deps)\nassert _r == list(range(999, -1, -1)), "task i+1 must come before task i, so the only order is 999, 998, ..., 0"`,
          },
        ],
        hints: ["`queue = deque(i for i in range(n) if indeg[i] == 0)`, then loop `while queue:` with `queue.popleft()`.", "At the end, return `order` only if `len(order) == n`; otherwise there was a cycle."],
      },
      {
        kind: "code",
        title: "When is everything done?",
        body: "Now each task takes time: `durations[i]` hours. A task starts as soon as **all** its prerequisites have finished, and any number of tasks can run at once. Write `finish_time(durations, deps)`: the hour when the last task finishes. The deps form a DAG (no cycles).\n\nWalk the tasks in topological order, and give each task the **latest** finishing time among its prerequisites as its start. This is the longest path through a DAG, which is easy here and very hard on graphs with cycles.\n\n" +
          py(`
finish_time([3, 2, 4, 1], [(0, 1), (0, 2), (1, 3), (2, 3)])
# 0 ends at 3; 1 ends at 5; 2 ends at 7; 3 starts at 7 and ends at 8 -> 8
`),
        language: "python",
        starter: `from collections import deque

def finish_time(durations, deps):
    # walk the tasks in topological order; start[v] = latest end of v's prerequisites
    return None
`,
        solution: `from collections import deque

def finish_time(durations, deps):
    n = len(durations)
    adj = [[] for _ in range(n)]
    indeg = [0] * n
    for a, b in deps:
        adj[a].append(b)
        indeg[b] += 1
    start = [0] * n
    queue = deque(i for i in range(n) if indeg[i] == 0)
    total = 0
    while queue:
        u = queue.popleft()
        end = start[u] + durations[u]
        total = max(total, end)
        for v in adj[u]:
            start[v] = max(start[v], end)
            indeg[v] -= 1
            if indeg[v] == 0:
                queue.append(v)
    return total
`,
        tests: [
          { id: "t1", description: "the diamond from the example", assertionCode: `_r = finish_time([3, 2, 4, 1], [(0, 1), (0, 2), (1, 3), (2, 3)])\nassert _r == 8, f"task 3 waits for the slower branch (0 then 2, ending at 7), so 8; got {_r}"` },
          { id: "t2", description: "independent tasks run side by side", assertionCode: `_r = finish_time([5, 1, 2], [])\nassert _r == 5, f"with no deps everything runs at once: the longest task decides, 5; got {_r}"` },
          { id: "t3", description: "no tasks at all", assertionCode: `_r = finish_time([], [])\nassert _r == 0, f"no tasks finish at hour 0, got {_r}"` },
          { id: "t4", description: "a task with two prerequisites", assertionCode: `_r = finish_time([2, 3, 1, 4, 2], [(0, 2), (1, 2), (2, 3), (1, 4)])\nassert _r == 8, f"task 2 starts at 3 (after task 1), ends at 4; task 3 ends at 8. Got {_r}"` },
        ],
        hints: ["Keep `start[v]`: the latest end time of any prerequisite seen so far. When you pop `u`, its end is `start[u] + durations[u]`.", "The answer is the largest end time of any task, not the end time of the last task popped."],
      },
      {
        kind: "recap",
        points: [
          "A **topological order** puts every `u → v` with u first; it exists exactly when the graph has **no cycle**.",
          "**Kahn's algorithm**: queue the in-degree-0 nodes, pop, lower your targets' in-degrees, queue the ones that hit 0. O(V + E).",
          "If the order is shorter than V, there's a cycle: that's the \"can every task be done?\" check.",
          "DFS alternative: record nodes as they finish, then reverse.",
          "Need the smallest order alphabetically? Swap the queue for a min-heap.",
          "Longest path, earliest finish times and counting paths are easy DP in topological order.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 3. Union-find ───────────────────────────────
  {
    id: "fnd-iv-graphs-3-union-find",
    title: "Union-find: merging groups fast",
    summary: "A parent array, find with path compression, union by size, and spotting the link that closes a loop.",
    level: "Intermediate",
    minutes: 12,
    xp: 70,
    steps: [
      {
        kind: "explain",
        title: "Who is in my group?",
        body: "**Union-find** (also called a **disjoint set union**, DSU) keeps track of groups that only ever **merge**. It answers two questions very fast:\n\n- `find(x)`: which group is x in? (It returns the group's **root**, one member that stands for the whole group.)\n- `union(a, b)`: merge the groups of a and b.\n\nEach group is a small tree stored in a `parent` list: `parent[x]` is x's parent, and a root is its own parent. Two tricks keep the trees flat:\n\n- **Union by size:** hang the smaller tree under the root of the bigger one.\n- **Path compression:** while `find` walks up, point nodes closer to the root.\n\n" +
          py(`
parent = list(range(n)); size = [1] * n

def find(x):
    while parent[x] != x:
        parent[x] = parent[parent[x]]   # skip a level as we go
        x = parent[x]
    return x

def union(a, b):
    ra, rb = find(a), find(b)
    if ra == rb:
        return False                    # already in the same group
    if size[ra] < size[rb]:
        ra, rb = rb, ra
    parent[rb] = ra
    size[ra] += size[rb]
    return True
`) +
          "\n\nWith both tricks, each operation costs **O(α(n))** on average, where α grows so slowly it is below 5 for any n you will meet. Signal words: *links arrive one by one, are these two connected yet?, merge accounts, equal-to constraints (a == b)*, and Kruskal's spanning tree (a later lesson).",
      },
      {
        kind: "question",
        title: "Watch the trees merge",
        body: "Six items start alone. The array shows `parent[i]`; the forest shows the same thing as trees. On a tie in size, the first argument's root stays on top. Tap what each question asks for.",
        widget: {
          type: "iv-trace",
          props: {
            title: "Union by size, with path compression",
            frames: [
              { array: [0, 1, 2, 3, 4, 5], tree: { nodes: forest([0, 1, 2, 3, 4, 5]) }, code: DSU_CODE, vars: { groups: 6 }, note: "Every item is its own root: `parent[i] == i`." },
              { array: [0, 0, 2, 2, 4, 5], tree: { nodes: forest([0, 0, 2, 2, 4, 5]), active: ["0", "2"] }, highlight: [1, 3], line: 10, vars: { groups: 4 }, note: "`union(0, 1)` hangs 1 under 0, and `union(2, 3)` hangs 3 under 2." },
              { tree: { active: ["3", "1"] }, line: 7, note: "`union(3, 1)`: find(3) is 2 and find(1) is 0. Both trees have size 2, so the tie rule applies.", pick: { prompt: "Which root ends up on top of the merged tree?", answer: "2", on: "tree" } },
              { array: [2, 0, 2, 2, 4, 5], tree: { nodes: forest([2, 0, 2, 2, 4, 5]), active: ["2"] }, highlight: [0], line: 10, vars: { groups: 3 }, note: "`parent[0] = 2`. Item 1 is now two steps from the root: 1 → 0 → 2." },
              { array: [2, 2, 2, 2, 4, 5], tree: { nodes: forest([2, 2, 2, 2, 4, 5]), active: ["1"] }, highlight: [1], line: 3, note: "`find(1)` walks 1 → 0 → 2 and, on the way, sets `parent[1] = parent[0] = 2`. Next time, 1 is one step away." },
              { array: [2, 2, 2, 2, 4, 4], tree: { nodes: forest([2, 2, 2, 2, 4, 4]), active: ["4"] }, highlight: [5], line: 10, vars: { groups: 2 }, note: "`union(4, 5)` hangs 5 under 4." },
              { tree: { active: ["5", "0"] }, line: 9, note: "`union(5, 0)`: find(5) is 4 (size 2) and find(0) is 2 (size 4).", pick: { prompt: "Union by size: which index becomes the parent of the other root?", answer: 2, on: "array" } },
              { array: [2, 2, 2, 2, 2, 4], tree: { nodes: forest([2, 2, 2, 2, 2, 4]), active: ["2"] }, highlight: [4], line: 10, vars: { groups: 1 }, note: "`parent[4] = 2`: the small tree goes under the big one, so the tallest path is still only 2 steps." },
            ],
          },
        },
        question: { type: "widget", goal: { picked: true }, prompt: "Answer both picks.", hint: "Read the code: on a tie nothing is swapped, and otherwise the bigger tree's root stays on top." },
        explanation: "Hanging the smaller tree under the bigger root means a node only gets deeper when its group at least doubles, so no path is longer than log₂ n. Path compression then flattens whatever `find` walks over.",
      },
      {
        kind: "question",
        title: "Why size matters",
        body: "Without union by size, what can go wrong if you always do `parent[ra] = rb`?",
        question: {
          type: "choice",
          options: ["find can return the wrong root", "Groups can split apart again", "union stops merging after n calls", "The trees can become long chains"],
          answer: 3,
          feedback: {
            0: "The answers stay correct either way; only the speed changes.",
            1: "Nothing in union-find ever splits a group.",
            2: "There's no such limit; it simply gets slower.",
          },
          hint: "Imagine `union(0, 1)`, `union(1, 2)`, `union(2, 3)`, ... with the old root always hung below.",
        },
        explanation: "Hanging the bigger tree under the smaller one can build a chain of length n, so `find` becomes O(n). Union by size (or by rank) caps the height at log₂ n, and path compression flattens it further.",
      },
      {
        kind: "question",
        title: "Read a parent array",
        body: "A union-find over 7 items has `parent = [0, 0, 1, 3, 3, 5, 0]`. How many groups are there?",
        question: { type: "number", answer: 3, hint: "A root is an item whose parent is itself. Each group has exactly one root." },
        explanation: "The roots are 0, 3 and 5 (`parent[i] == i`), so there are **3** groups: {0, 1, 2, 6}, {3, 4} and {5}.",
      },
      {
        kind: "question",
        title: "Know its limits",
        body: "Which task is union-find **not** good at?",
        question: {
          type: "choice",
          options: ["Removing a link and splitting a group", "Telling whether two nodes are connected", "Counting the groups as links are added", "Finding the first link that closes a loop"],
          answer: 0,
          feedback: {
            1: "That's exactly `find(a) == find(b)`.",
            2: "Start with n groups and subtract one each time `union` merges two.",
            3: "A link whose ends already have the same root closes a loop.",
          },
          hint: "Union-find has a `union`. Does it have the opposite?",
        },
        explanation: "Union-find only merges. If links are removed, either process the events **backwards** (removals become additions) or use a different tool. That reverse trick is a common interview twist.",
      },
      {
        kind: "code",
        title: "The cable that makes a loop",
        body: "Technicians lay cables between `n` offices one at a time, in the order given. Write `first_loop_cable(n, cables)`: return the **index** of the first cable whose two offices were already connected (directly or through others), or `-1` if no cable ever closes a loop. A cable from an office to itself counts as a loop.\n\nOne test lays 20,000 cables, so walking the graph for every cable is too slow: use union-find.",
        language: "python",
        starter: `def first_loop_cable(n, cables):
    parent = list(range(n))

    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    # for each cable: same root already? that's the answer. Otherwise merge.
    # return -1 if no cable closes a loop
    return None
`,
        solution: `def first_loop_cable(n, cables):
    parent = list(range(n))
    size = [1] * n

    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    for i, (a, b) in enumerate(cables):
        ra, rb = find(a), find(b)
        if ra == rb:
            return i
        if size[ra] < size[rb]:
            ra, rb = rb, ra
        parent[rb] = ra
        size[ra] += size[rb]
    return -1
`,
        tests: [
          { id: "t1", description: "a loop through other offices", assertionCode: `_r = first_loop_cable(5, [(0, 1), (1, 2), (3, 4), (2, 0), (1, 3)])\nassert _r == 3, f"cable 3 joins 2 and 0, already linked through 1: expected 3, got {_r}"` },
          { id: "t2", description: "no loop", assertionCode: `_r = first_loop_cable(4, [(0, 1), (2, 3), (1, 2)])\nassert _r == -1, f"these 3 cables form a tree, so -1; got {_r}"` },
          { id: "t3", description: "a self-loop and a doubled cable", assertionCode: `_r = first_loop_cable(3, [(1, 1)])\nassert _r == 0, f"a cable from office 1 to itself closes a loop at once: 0, got {_r}"\n_r = first_loop_cable(3, [(0, 2), (2, 0)])\nassert _r == 1, f"the second cable between 0 and 2 closes a loop: 1, got {_r}"` },
          { id: "t4", description: "20,000 cables", assertionCode: `_n = 20000\n_c = [(i, i + 1) for i in range(_n - 1)] + [(0, _n - 1)]\n_r = first_loop_cable(_n, _c)\nassert _r == _n - 1, f"the last cable closes the long chain into a ring: expected {_n - 1}, got {_r}"` },
        ],
        hints: ["For cable `i = (a, b)`: if `find(a) == find(b)`, return `i`; otherwise merge the two roots.", "Without union by size the chain test can still pass thanks to path compression, but add it: it is two lines."],
      },
      {
        kind: "code",
        title: "Groups after every link",
        body: "Write `groups_after_each(n, links)`: start with `n` separate people and add the friendships in `links` one by one. Return a list with the number of groups **after each link**.\n\n" +
          py(`
groups_after_each(4, [(0, 1), (2, 3), (1, 0), (1, 2)])   # [3, 2, 2, 1]
`),
        language: "python",
        starter: `def groups_after_each(n, links):
    parent = list(range(n))

    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    out = []
    # after each link, append the number of groups
    return None
`,
        solution: `def groups_after_each(n, links):
    parent = list(range(n))

    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    out = []
    groups = n
    for a, b in links:
        ra, rb = find(a), find(b)
        if ra != rb:
            parent[ra] = rb
            groups -= 1
        out.append(groups)
    return out
`,
        tests: [
          { id: "t1", description: "the example", assertionCode: `_r = groups_after_each(4, [(0, 1), (2, 3), (1, 0), (1, 2)])\nassert _r == [3, 2, 2, 1], f"expected [3, 2, 2, 1], got {_r}"` },
          { id: "t2", description: "repeats and self-links don't merge anything", assertionCode: `_r = groups_after_each(5, [(0, 1), (2, 3), (1, 0), (1, 2), (4, 4), (3, 4)])\nassert _r == [4, 3, 3, 2, 2, 1], f"a link inside one group leaves the count alone: expected [4, 3, 3, 2, 2, 1], got {_r}"` },
          { id: "t3", description: "no links", assertionCode: `_r = groups_after_each(3, [])\nassert _r == [], f"no links means an empty list, got {_r}"` },
        ],
        hints: ["Keep a running `groups = n` and subtract 1 only when the two roots differ.", "A link whose ends already share a root changes nothing."],
      },
      {
        kind: "recap",
        points: [
          "**Union-find** keeps groups that only merge: `find(x)` gives the root, `union(a, b)` merges.",
          "**Union by size** keeps trees at most log₂ n tall; **path compression** flattens them while finding.",
          "Together: about O(α(n)) per operation, effectively constant.",
          "A link whose ends already share a root **closes a loop**.",
          "Group count: start at n, subtract one per successful union.",
          "It can't split groups: for removals, replay the events backwards.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 4. Shortest paths ───────────────────────────────
  {
    id: "fnd-iv-graphs-4-shortest-path",
    title: "Shortest paths: Dijkstra, Bellman-Ford, 0-1 BFS",
    summary: "Choosing the right shortest-path algorithm from the weights, Dijkstra with a heap, and catching negative loops.",
    level: "Advanced",
    minutes: 15,
    xp: 80,
    steps: [
      {
        kind: "explain",
        title: "Pick by the weights",
        body: "\"Cheapest\", \"fastest\", \"fewest steps\", \"minimum cost to reach\": these are **shortest path** problems. Which algorithm to use depends on the edge weights:\n\n| Edge weights | Algorithm | Time |\n| --- | --- | --- |\n| None (every step costs 1) | BFS | O(V + E) |\n| Only 0 or 1 | 0-1 BFS (a deque) | O(V + E) |\n| Any weight ≥ 0 | Dijkstra (a min-heap) | O((V + E) log V) |\n| Some negative | Bellman-Ford | O(V × E) |\n\n**Dijkstra** keeps a heap of `(distance, node)` pairs. It always takes out the closest node not yet settled. Because no weight is negative, nothing found later can be cheaper, so that node's distance is final. It then **relaxes** each edge: if going through this node is cheaper than the best known distance to a neighbour, update it and push the new pair.\n\nPython's `heapq` has no \"decrease key\", so the same node can be in the heap twice. When you pop a pair whose distance is bigger than the best you know, it is **stale**: skip it.",
      },
      {
        kind: "question",
        title: "Run Dijkstra",
        body: "Two-way roads with travel times, starting at S. The heap is shown smallest first, as `distance:node`. At each stop, tap the node that gets settled next.",
        widget: {
          type: "iv-trace",
          props: {
            title: "Dijkstra from S",
            frames: [
              { graph: { ...DIJ_GRAPH, active: ["S"], activeEdges: [["S", "A"], ["S", "B"]] }, code: DIJ_CODE, line: 8, stacks: [{ label: "heap", items: ["1:B", "4:A"], kind: "heap" }], vars: { S: 0, A: 4, B: 1, C: "∞", D: "∞", E: "∞" }, note: "Pop S (0). Relax its roads: A gets 4, B gets 1." },
              { graph: { done: ["S"] }, line: 3, note: "Which pair is on top of the heap?", pick: { prompt: "Which node is settled next?", answer: "B" } },
              { graph: { done: ["S"], active: ["B"], activeEdges: [["B", "A"], ["B", "C"], ["B", "D"]] }, line: 7, stacks: [{ label: "heap", items: ["3:A", "4:A", "6:C", "9:D"], kind: "heap" }], vars: { S: 0, A: 3, B: 1, C: 6, D: 9, E: "∞" }, note: "Pop B (1). Through B, A costs 1 + 2 = 3, better than 4. C gets 6, D gets 9. The old `4:A` stays in the heap." },
              { graph: { done: ["S", "B"], active: ["A"], activeEdges: [["A", "C"]] }, line: 7, stacks: [{ label: "heap", items: ["4:A", "4:C", "6:C", "9:D"], kind: "heap" }], vars: { S: 0, A: 3, B: 1, C: 4, D: 9, E: "∞" }, note: "Pop A (3). Through A, C costs 3 + 1 = 4, better than 6." },
              { graph: { done: ["S", "B", "A"] }, line: 4, note: "The top is `4:A`, but A is settled at 3: that pair is stale.", pick: { prompt: "Skip the stale pair. Which node is settled next?", answer: "C" } },
              { graph: { done: ["S", "B", "A"], active: ["C"], activeEdges: [["C", "D"], ["C", "E"]] }, line: 7, stacks: [{ label: "heap", items: ["6:C", "7:D", "9:D", "10:E"], kind: "heap" }], vars: { S: 0, A: 3, B: 1, C: 4, D: 7, E: 10 }, note: "Pop C (4). D improves to 4 + 3 = 7; E gets 10." },
              { graph: { done: ["S", "B", "A", "C"], active: ["D"], activeEdges: [["D", "E"]] }, line: 7, stacks: [{ label: "heap", items: ["8:E", "9:D", "10:E"], kind: "heap" }], vars: { S: 0, A: 3, B: 1, C: 4, D: 7, E: 8 }, note: "`6:C` is stale. Pop D (7): E improves to 8." },
              { graph: { done: ["S", "B", "A", "C", "D", "E"] }, line: 2, stacks: [{ label: "heap", items: [], kind: "heap" }], note: "Pop E (8); the rest are stale. Final times: **S 0, A 3, B 1, C 4, D 7, E 8**." },
            ],
          },
        },
        question: { type: "widget", goal: { picked: true }, prompt: "Answer both picks.", hint: "The heap always gives the smallest distance first, but a pair whose node is already settled is skipped." },
        explanation: "Dijkstra settles nodes in order of distance: S, B, A, C, D, E. Each node is final the moment it is popped, because every other route would have to leave from a node at least as far away.",
      },
      {
        kind: "question",
        title: "A negative road",
        body: "Why can Dijkstra give the wrong answer when one edge has a negative weight?",
        question: {
          type: "choice",
          options: ["Python's heap can't hold negative numbers", "It may visit a node twice", "A settled node could later get cheaper", "It loops forever on any negative edge"],
          answer: 2,
          feedback: {
            0: "`heapq` handles negative numbers fine.",
            1: "Visiting twice isn't the problem; trusting the first result is.",
            3: "It stops; it just may stop with a wrong distance.",
          },
          hint: "What does Dijkstra assume about a node the moment it pops it?",
        },
        explanation: "Dijkstra treats a popped node as final. With a negative edge, a route found later (going further, then down the negative edge) could be cheaper. Use **Bellman-Ford** instead.",
      },
      {
        kind: "explain",
        title: "Bellman-Ford and 0-1 BFS",
        body: "**Bellman-Ford** simply relaxes **every** edge, over and over. A shortest path uses at most V − 1 edges, so V − 1 rounds are enough. If a V-th round still improves something, there is a **negative cycle**: a loop you could go round forever, getting cheaper each time.\n\n" +
          py(`
dist = [INF] * n; dist[start] = 0
for _ in range(n - 1):
    for u, v, w in edges:
        if dist[u] != INF and dist[u] + w < dist[v]:
            dist[v] = dist[u] + w
# one more pass: any improvement means a reachable negative cycle
`) +
          "\n\n**0-1 BFS** is for weights that are only 0 or 1 (\"free move\" or \"costs one\", like walking through an open door versus breaking a wall). Use a `deque`: a 0-edge puts the neighbour at the **front**, a 1-edge at the **back**. The deque stays sorted by distance, like Dijkstra's heap, but each step is O(1).",
      },
      {
        kind: "question",
        title: "Free moves and paid moves",
        body: "In a grid of coloured tiles, stepping onto a tile of the **same colour** is free and stepping onto a **different colour** costs 1. You want the cheapest route between two corners. What's the best fit?",
        question: {
          type: "choice",
          options: ["Plain BFS, counting steps", "Bellman-Ford over all tiles", "0-1 BFS with a deque", "Union-find on the colours"],
          answer: 2,
          feedback: {
            0: "BFS counts steps, but here some steps are free: the fewest steps isn't the cheapest route.",
            1: "It works, but O(V × E) is far slower than needed, and there are no negative weights.",
            3: "Union-find tells you which tiles connect, not what a route costs.",
          },
          hint: "Look at the possible costs of one move.",
        },
        explanation: "Every edge costs 0 or 1, which is exactly the case **0-1 BFS** handles in O(V + E). Dijkstra would also be correct, with an extra log factor.",
      },
      {
        kind: "question",
        title: "How many rounds?",
        body: "Bellman-Ford runs on a graph with 6 nodes and no negative cycle. How many rounds of relaxing every edge are guaranteed to be enough?",
        question: { type: "number", answer: 5, hint: "How many edges can a shortest path use at most, if it never repeats a node?" },
        explanation: "A shortest path without repeated nodes has at most V − 1 = **5** edges, and each round fixes at least one more edge of it. That's also why a 6th round that still improves something proves a negative cycle.",
      },
      {
        kind: "code",
        title: "Dijkstra with a heap",
        body: "Write `travel_times(n, roads, start)`. `roads` holds one-way roads `(u, v, minutes)` with minutes ≥ 0; there can be several roads between the same two places. Return a list with the fewest minutes from `start` to each place `0 … n - 1`, or `-1` where a place can't be reached.\n\nThe last test has 3,000 places and 15,000 roads: an O(V²) version (scan every place for the closest one) is too slow, so use `heapq`.",
        language: "python",
        starter: `import heapq

def travel_times(n, roads, start):
    adj = [[] for _ in range(n)]
    for u, v, w in roads:
        adj[u].append((v, w))
    dist = [-1] * n
    dist[start] = 0
    # heap of (minutes, place); skip stale entries
    return dist
`,
        solution: `import heapq

def travel_times(n, roads, start):
    adj = [[] for _ in range(n)]
    for u, v, w in roads:
        adj[u].append((v, w))
    INF = float("inf")
    best = [INF] * n
    best[start] = 0
    heap = [(0, start)]
    while heap:
        d, u = heapq.heappop(heap)
        if d > best[u]:
            continue
        for v, w in adj[u]:
            if d + w < best[v]:
                best[v] = d + w
                heapq.heappush(heap, (d + w, v))
    return [d if d < INF else -1 for d in best]
`,
        tests: [
          { id: "t1", description: "a detour can be quicker", assertionCode: `_r = travel_times(5, [(0, 1, 4), (0, 2, 1), (2, 1, 2), (1, 3, 1), (2, 3, 5)], 0)\nassert _r == [0, 3, 1, 4, -1], f"0 -> 2 -> 1 (3 min) beats 0 -> 1 (4 min); place 4 is unreachable. Expected [0, 3, 1, 4, -1], got {_r}"` },
          { id: "t2", description: "more roads isn't slower", assertionCode: `_r = travel_times(4, [(0, 3, 10), (0, 1, 1), (1, 2, 1), (2, 3, 1), (0, 1, 7)], 0)\nassert _r == [0, 1, 2, 3], f"three short roads (3 min) beat one long one (10 min), and the cheaper of two parallel roads counts. Got {_r}"` },
          { id: "t3", description: "one-way roads", assertionCode: `_r = travel_times(3, [(1, 0, 2), (0, 2, 5)], 0)\nassert _r == [0, -1, 5], f"the road 1 -> 0 can't be driven backwards: expected [0, -1, 5], got {_r}"` },
          {
            id: "t4",
            description: "3,000 places, 15,000 roads",
            assertionCode: `import random
_rng = random.Random(7)
_n = 3000
_roads = [(i, i + 1, _rng.randint(1, 100)) for i in range(_n - 1)]
_roads += [(_rng.randrange(_n), _rng.randrange(_n), _rng.randint(1, 1000)) for _ in range(12000)]
_r = travel_times(_n, _roads, 0)
assert len(_r) == _n and _r[1500] == 813 and _r[_n - 1] == 838 and sum(_r) == 1869883, "wrong distances on the big map (expected place 1500 at 813 min and place 2999 at 838 min)"`,
          },
        ],
        hints: ["Start with `heap = [(0, start)]`. Pop `(d, u)`; if `d` is bigger than the best known for `u`, skip it.", "For each road `(v, w)` out of `u`: if `d + w` beats the best for `v`, store it and push `(d + w, v)`."],
      },
      {
        kind: "code",
        title: "Fees, rebates and a money loop",
        body: "A delivery network charges a fee on each one-way hop `(u, v, cost)`. Some hops pay you a **rebate** instead, so `cost` can be negative. Write `cheapest_costs(n, hops, start)` with Bellman-Ford:\n\n- return a list of the cheapest total cost from `start` to each place, with `None` for places you can't reach;\n- but if a loop with a negative total can be reached from `start`, return `None` instead of a list (you could earn money forever).\n\nA negative loop that `start` can't reach doesn't matter.",
        language: "python",
        starter: `def cheapest_costs(n, hops, start):
    INF = float("inf")
    dist = [INF] * n
    dist[start] = 0
    # relax every hop, n - 1 rounds; then one more pass to catch a money loop
    return []
`,
        solution: `def cheapest_costs(n, hops, start):
    INF = float("inf")
    dist = [INF] * n
    dist[start] = 0
    for _ in range(n - 1):
        changed = False
        for u, v, w in hops:
            if dist[u] != INF and dist[u] + w < dist[v]:
                dist[v] = dist[u] + w
                changed = True
        if not changed:
            break
    for u, v, w in hops:
        if dist[u] != INF and dist[u] + w < dist[v]:
            return None
    return [d if d != INF else None for d in dist]
`,
        tests: [
          { id: "t1", description: "a rebate makes the longer route cheaper", assertionCode: `_r = cheapest_costs(4, [(1, 3, 2), (2, 1, -3), (0, 2, 5), (0, 1, 4)], 0)\nassert _r == [0, 2, 5, 4], f"0 -> 2 -> 1 costs 5 - 3 = 2, so 3 costs 4. Expected [0, 2, 5, 4], got {_r}"` },
          { id: "t2", description: "a reachable money loop", assertionCode: `_r = cheapest_costs(3, [(0, 1, 1), (1, 2, -2), (2, 1, 1)], 0)\nassert _r is None, f"1 -> 2 -> 1 totals -1 and is reachable from 0, so return None; got {_r}"` },
          { id: "t3", description: "an unreachable money loop is ignored", assertionCode: `_r = cheapest_costs(4, [(0, 1, 2), (2, 3, -5), (3, 2, 1)], 0)\nassert _r == [0, 2, None, None], f"the loop 2 <-> 3 can't be reached from 0: expected [0, 2, None, None], got {_r}"` },
          { id: "t4", description: "a chain listed backwards needs many rounds", assertionCode: `_hops = [(i, i + 1, -1) for i in range(5)][::-1]\n_r = cheapest_costs(6, _hops, 0)\nassert _r == [0, -1, -2, -3, -4, -5], f"each round only pushes the cost one hop further: expected [0, -1, -2, -3, -4, -5], got {_r}"` },
        ],
        hints: ["Wrap the relaxing loop in `for _ in range(n - 1):`.", "Afterwards, run one more pass: if any hop still improves a distance, return None."],
      },
      {
        kind: "recap",
        points: [
          "Choose by the weights: none → BFS, 0/1 → 0-1 BFS, non-negative → **Dijkstra**, negative → **Bellman-Ford**.",
          "Dijkstra: pop the closest unsettled node from a min-heap, relax its edges, skip **stale** heap entries. O((V + E) log V).",
          "Negative edges break Dijkstra: a settled node could get cheaper later.",
          "Bellman-Ford: V − 1 rounds of relaxing every edge; an improvement in round V means a **negative cycle**. O(V × E).",
          "0-1 BFS: a deque, 0-edges to the front, 1-edges to the back. O(V + E).",
        ],
      },
    ],
  },
];
