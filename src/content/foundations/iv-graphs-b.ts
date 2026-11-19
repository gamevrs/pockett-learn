import type { ConceptLesson } from "../../learn/types.ts";

/** Fenced Python block for lesson prose. */
const py = (code: string) => "~~~python\n" + code.trim() + "\n~~~";
/** Fenced plain-text block (diagrams, tables). */
const txt = (code: string) => "~~~text\n" + code.replace(/^\n+|\s+$/g, "") + "\n~~~";

// ── shared trace data ──
const KRUSKAL_GRAPH = {
  nodes: [
    { id: "A", x: 8, y: 50 },
    { id: "B", x: 32, y: 12 },
    { id: "C", x: 32, y: 88 },
    { id: "D", x: 64, y: 12 },
    { id: "E", x: 64, y: 88 },
    { id: "F", x: 92, y: 50 },
  ],
  edges: [
    ["A", "B", 4],
    ["A", "C", 2],
    ["B", "C", 1],
    ["B", "D", 5],
    ["C", "D", 8],
    ["C", "E", 10],
    ["D", "E", 2],
    ["D", "F", 6],
    ["E", "F", 3],
  ] as [string, string, number][],
};
const KRUSKAL_EDGES = ["BC 1", "AC 2", "DE 2", "EF 3", "AB 4", "BD 5", "DF 6", "CD 8", "CE 10"];
const KRUSKAL_CODE = [
  "for w, a, b in sorted(edges):",
  "    if find(a) != find(b):",
  "        union(a, b); total += w",
  "    # else: a and b are already joined, skip",
];

const SCC_NODES = [
  { id: "A", x: 8, y: 30 },
  { id: "B", x: 36, y: 10 },
  { id: "C", x: 22, y: 86 },
  { id: "D", x: 62, y: 30 },
  { id: "E", x: 70, y: 86 },
  { id: "F", x: 94, y: 50 },
];
const SCC_EDGES: [string, string][] = [
  ["A", "B"],
  ["B", "C"],
  ["C", "A"],
  ["B", "D"],
  ["D", "E"],
  ["E", "D"],
  ["E", "F"],
];
const SCC_CODE = [
  "order = []                      # pass 1: finishing order",
  "for s in nodes: dfs1(s)         # append u after its neighbours",
  "flip every edge",
  "for s in reversed(order):       # pass 2",
  "    if s has no group: dfs2(s)  # everything it reaches is one SCC",
];

const BRIDGE_GRAPH = {
  nodes: [
    { id: "A", x: 8, y: 18 },
    { id: "B", x: 8, y: 82 },
    { id: "C", x: 32, y: 50 },
    { id: "D", x: 56, y: 50 },
    { id: "E", x: 76, y: 14 },
    { id: "F", x: 76, y: 86 },
    { id: "G", x: 96, y: 60 },
  ],
  edges: [
    ["A", "B"],
    ["A", "C"],
    ["B", "C"],
    ["C", "D"],
    ["D", "E"],
    ["D", "F"],
    ["E", "F"],
    ["F", "G"],
  ] as [string, string][],
};
const BRIDGE_CODE = [
  "tin[u] = low[u] = timer; timer += 1",
  "for v in adj[u]:",
  "    if v is u's parent: continue",
  "    if visited(v): low[u] = min(low[u], tin[v])   # back edge",
  "    else:",
  "        dfs(v, parent=u)",
  "        low[u] = min(low[u], low[v])",
  "        if low[v] > tin[u]: bridge (u, v)",
  "        if low[v] >= tin[u] and u is not the root: u is a cut point",
];

const EULER_GRAPH = {
  nodes: [
    { id: "P", x: 8, y: 80 },
    { id: "Q", x: 44, y: 80 },
    { id: "R", x: 26, y: 14 },
    { id: "S", x: 74, y: 16 },
    { id: "T", x: 94, y: 80 },
  ],
  edges: [
    ["P", "Q"],
    ["Q", "S"],
    ["Q", "R"],
    ["R", "P"],
    ["S", "T"],
    ["T", "Q"],
  ] as [string, string][],
  directed: true,
};
const EULER_CODE = [
  "stack = [start]; path = []",
  "while stack:",
  "    u = stack[-1]",
  "    if adj[u]:                       # an unused edge left",
  "        stack.append(adj[u].pop())",
  "    else:                            # stuck: u is finished",
  "        path.append(stack.pop())",
  "return path[::-1]",
];

/** Lessons 5 to 8 of "Graphs": spanning trees, strongly connected components, bridges, Eulerian paths. */
export const ivGraphsLessonsB: ConceptLesson[] = [
  // ─────────────────────────────── 5. Minimum spanning tree ───────────────────────────────
  {
    id: "fnd-iv-graphs-5-spanning-tree",
    title: "Minimum spanning trees: Kruskal and Prim",
    summary: "Connecting everything for the least total cost: the cut property, Kruskal with union-find, and Prim with a heap.",
    level: "Advanced",
    minutes: 13,
    xp: 80,
    steps: [
      {
        kind: "explain",
        title: "Connect everyone, pay the least",
        body: "A **spanning tree** of a connected graph keeps all V nodes and exactly V − 1 of the edges, with no loop. The **minimum spanning tree** (MST) is the one with the smallest total weight.\n\nSignal words: *connect all the towns / servers / houses for the least total cost*, *cheapest network*, *every point must be reachable*. Note the word **total**: an MST minimises the sum, not any one route.\n\nWhy greedy works, the **cut property**: split the nodes into two sides any way you like. The cheapest edge crossing between the sides is safe to use; some MST contains it.\n\n**Kruskal's algorithm** applies that over and over:\n\n1. Sort the edges by weight.\n2. Take each edge in turn, **unless** its two ends are already connected (that would make a loop). Union-find answers that in near O(1).\n3. Stop after V − 1 edges.\n\nThe sort dominates: **O(E log E)**.",
      },
      {
        kind: "question",
        title: "Run Kruskal",
        body: "The list holds the edges sorted by weight (ties keep their order). Step through and tap what each question asks for.",
        widget: {
          type: "iv-trace",
          props: {
            title: "Kruskal's algorithm",
            frames: [
              { array: KRUSKAL_EDGES, graph: { ...KRUSKAL_GRAPH }, code: KRUSKAL_CODE, line: 1, vars: { groups: "A | B | C | D | E | F", total: 0 }, note: "Every town starts alone. Sorted, the cheapest edge is BC." },
              { highlight: [0], graph: { activeEdges: [["B", "C"]], active: ["B", "C"] }, line: 3, vars: { groups: "A | BC | D | E | F", total: 1 }, note: "B and C are in different groups: take **BC 1**." },
              { highlight: [1], done: [0], graph: { activeEdges: [["B", "C"], ["A", "C"]], active: ["A", "C"] }, line: 3, vars: { groups: "ABC | D | E | F", total: 3 }, note: "Take **AC 2**." },
              { highlight: [2], done: [0, 1], graph: { activeEdges: [["B", "C"], ["A", "C"], ["D", "E"]], active: ["D", "E"] }, line: 3, vars: { groups: "ABC | DE | F", total: 5 }, note: "Take **DE 2**." },
              { highlight: [3], done: [0, 1, 2], graph: { activeEdges: [["B", "C"], ["A", "C"], ["D", "E"], ["E", "F"]], active: ["E", "F"] }, line: 3, vars: { groups: "ABC | DEF", total: 8 }, note: "Take **EF 3**. Two groups are left." },
              { done: [0, 1, 2, 3], graph: { activeEdges: [["B", "C"], ["A", "C"], ["D", "E"], ["E", "F"]] }, line: 2, note: "Keep going down the list.", pick: { prompt: "Which edge is the first one Kruskal **skips**?", answer: 4 } },
              { highlight: [4], done: [0, 1, 2, 3], graph: { activeEdges: [["B", "C"], ["A", "C"], ["D", "E"], ["E", "F"]], active: ["A", "B"] }, line: 4, note: "AB 4: A and B are both in group ABC already, so it would close the loop A-B-C. Skip." },
              { done: [0, 1, 2, 3, 4], graph: { activeEdges: [["B", "C"], ["A", "C"], ["D", "E"], ["E", "F"]] }, line: 2, note: "4 edges taken; 6 towns need 5.", pick: { prompt: "Which edge joins the last two groups?", answer: 5 } },
              { done: [0, 1, 2, 3, 4, 5], graph: { activeEdges: [["B", "C"], ["A", "C"], ["D", "E"], ["E", "F"], ["B", "D"]], done: ["A", "B", "C", "D", "E", "F"] }, line: 3, vars: { groups: "ABCDEF", total: 13 }, note: "**BD 5** joins ABC and DEF. Five edges: done, total **13**. DF, CD and CE would all close loops." },
            ],
          },
        },
        question: { type: "widget", goal: { picked: true }, prompt: "Answer both picks.", hint: "An edge is skipped when both its ends are already in the same group." },
        explanation: "Kruskal takes the cheapest edge that doesn't close a loop, every time. Each such edge is the cheapest one crossing between its two groups, so the cut property says it's safe.",
      },
      {
        kind: "question",
        title: "Your turn",
        body: "Four villages and the price of a road between each pair:\n\n" +
          txt(`
P-Q 3    P-R 1    Q-R 3
Q-S 2    R-S 4    P-S 5
`) +
          "\nFind the total price of the cheapest road network that connects all four.",
        question: { type: "number", answer: 6, hint: "Sort the roads by price and take each one unless it joins two villages that are already connected." },
        explanation: "Take P-R (1) and Q-S (2). Then a 3 (P-Q or Q-R, either joins {P, R} with {Q, S}). Three roads for four villages: 1 + 2 + 3 = **6**. Two different MSTs exist here because of the tie, but they cost the same.",
      },
      {
        kind: "explain",
        title: "Prim grows one tree",
        body: "**Prim's algorithm** grows a single tree from any start node. It keeps a min-heap of edges leaving the tree and always adds the cheapest one that reaches a node **not yet in** the tree:\n\n" +
          py(`
def prim(n, adj):                       # adj[u] = [(v, w), ...]
    in_tree = [False] * n
    heap = [(0, 0)]                     # (cost to attach, node)
    total = 0
    while heap:
        w, u = heapq.heappop(heap)
        if in_tree[u]:
            continue                    # already attached more cheaply
        in_tree[u] = True
        total += w
        for v, wv in adj[u]:
            if not in_tree[v]:
                heapq.heappush(heap, (wv, v))
    return total if all(in_tree) else -1
`) +
          "\n\nWith a heap it is **O(E log V)**. For a **dense** graph (an edge between almost every pair, E ≈ V²), Prim with a plain array (\"cheapest attach cost so far\" per node, scanned each round) is **O(V²)** and beats both heap versions.",
      },
      {
        kind: "question",
        title: "Dense or sparse",
        body: "You must wire up 2,000 sensors, and the cable price between **every pair** is known (about 2 million edges). Which approach is fastest?",
        question: {
          type: "choice",
          options: ["Kruskal: sort all 2 million edges first", "Prim with an array scan, O(V²)", "Dijkstra from sensor 0", "BFS from sensor 0"],
          answer: 1,
          feedback: {
            0: "Kruskal works, but sorting 2 million edges (E log E) costs about ten times more than V² = 4 million steps.",
            2: "Dijkstra minimises each route from one source, not the total cable.",
            3: "BFS ignores the prices.",
          },
          hint: "Compare V² with E log E when E is about V².",
        },
        explanation: "With E ≈ V², array-based **Prim** does V rounds of an O(V) scan: about 4 million steps. Kruskal must sort 2 million edges, roughly 2,000,000 × 21 comparisons. On sparse graphs Kruskal and heap-Prim are both fine.",
      },
      {
        kind: "question",
        title: "Not a route planner",
        body: "In an MST, is the path between two nodes always their shortest path in the original graph?",
        question: {
          type: "choice",
          options: ["Yes, an MST holds every shortest path", "Only when all weights are different", "No, it minimises the total, not each route", "Only for the two ends of the cheapest edge"],
          answer: 2,
          feedback: {
            0: "Picture a triangle with sides 2, 2 and 3: the MST drops the 3, so those two ends now travel 4.",
            1: "Distinct weights make the MST unique, but routes inside it can still be long.",
            3: "Even that edge's ends can be joined by the edge itself, but other pairs can travel far.",
          },
          hint: "Try a triangle with sides 2, 2 and 3.",
        },
        explanation: "The MST of that triangle keeps the two 2s, so the ends of the 3-edge are now 4 apart. For routes, use a **shortest path** algorithm; for the cheapest total network, use an MST.",
      },
      {
        kind: "code",
        title: "The cheapest network",
        body: "Write `cheapest_network(n, offers)`: `n` towns (`0` to `n - 1`) and a list of cable offers `(a, b, price)`. Return the lowest total price that connects every town, or `-1` if the offers can't connect them all. One town needs no cable (price 0).\n\nUse Kruskal: sort the offers by price, and use union-find to skip offers that would close a loop.",
        language: "python",
        starter: `def cheapest_network(n, offers):
    parent = list(range(n))

    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    total = 0
    used = 0
    # sort by price, take an offer only if it joins two different groups
    return total
`,
        solution: `def cheapest_network(n, offers):
    parent = list(range(n))

    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    total = 0
    used = 0
    for a, b, price in sorted(offers, key=lambda o: o[2]):
        ra, rb = find(a), find(b)
        if ra != rb:
            parent[ra] = rb
            total += price
            used += 1
    return total if used == n - 1 else -1
`,
        tests: [
          { id: "t1", description: "a small map", assertionCode: `_r = cheapest_network(5, [(0, 1, 4), (0, 2, 1), (1, 2, 2), (1, 3, 5), (2, 3, 8), (3, 4, 3)])\nassert _r == 11, f"take 0-2 (1), 1-2 (2), 3-4 (3), 1-3 (5): expected 11, got {_r}"` },
          { id: "t2", description: "towns that can't all be joined", assertionCode: `_r = cheapest_network(4, [(0, 1, 1), (2, 3, 1)])\nassert _r == -1, f"no offer links {{0, 1}} with {{2, 3}}, so -1; got {_r}"` },
          { id: "t3", description: "one town, and two offers for the same pair", assertionCode: `_r = cheapest_network(1, [])\nassert _r == 0, f"a single town needs no cable: 0, got {_r}"\n_r = cheapest_network(3, [(0, 1, 9), (0, 1, 2), (1, 2, 3)])\nassert _r == 5, f"use the cheaper 0-1 offer (2) and 1-2 (3): 5, got {_r}"` },
          { id: "t4", description: "the cheapest edges can make a loop", assertionCode: `_r = cheapest_network(4, [(0, 1, 1), (1, 2, 1), (2, 0, 1), (2, 3, 7)])\nassert _r == 9, f"only two of the three 1-cables can be used, then 2-3 (7): expected 9, got {_r}"` },
        ],
        hints: ["`for a, b, price in sorted(offers, key=lambda o: o[2]):` then merge when `find(a) != find(b)`.", "Count the cables you take: all towns are joined exactly when you used n − 1 of them."],
      },
      {
        kind: "recap",
        points: [
          "An **MST** connects all V nodes with V − 1 edges and the least **total** weight.",
          "**Cut property**: the cheapest edge across any split is safe; that's why greedy works.",
          "**Kruskal**: sort edges, take each unless union-find says it closes a loop. O(E log E).",
          "**Prim**: grow one tree, always attach the cheapest outside node. O(E log V) with a heap, O(V²) with an array for dense graphs.",
          "Fewer than V − 1 edges taken means the graph wasn't connected.",
          "An MST is not a shortest-path tree.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 6. Strongly connected components ───────────────────────────────
  {
    id: "fnd-iv-graphs-6-strongly-connected",
    title: "Strongly connected components",
    summary: "Groups where everyone reaches everyone along one-way edges, Kosaraju's two passes, Tarjan's low-links, and the graph of components.",
    level: "Advanced",
    minutes: 14,
    xp: 80,
    steps: [
      {
        kind: "explain",
        title: "Reach each other, both ways",
        body: "In a directed graph, two nodes are **strongly connected** when each can reach the other along the arrows. A **strongly connected component** (SCC) is a largest group where every pair is strongly connected. Every node is in exactly one SCC (possibly alone).\n\nShrink each SCC to a single node and you get the **condensation**: it is always a **DAG**, because a cycle between two SCCs would make them one SCC. That's the real power: any directed graph becomes a DAG of components, and DAG tricks (topological order, DP) apply.\n\nSignal words: *one-way roads, can everyone reach everyone?, mutual reachability, circular dependencies, groups of accounts that pay each other*, and 2-SAT (logic puzzles of \"a or b\" clauses).",
      },
      {
        kind: "explain",
        title: "Kosaraju's two passes",
        body: "**Kosaraju's algorithm**:\n\n1. Run DFS over the whole graph and record each node when it **finishes**.\n2. **Reverse** every edge.\n3. Go through the nodes in **reverse finishing order**. Each node without a group starts a DFS on the reversed graph; everything that DFS reaches (and isn't grouped yet) is one SCC.\n\nWhy it works: the node that finishes last lies in a \"source\" component (no arrows come into it from other components). After reversing, the arrows that used to leave that component now point into it, so the second DFS can't escape: it collects exactly that SCC. Remove it and repeat.\n\nBoth passes are O(V + E). **Tarjan's algorithm** does it in one DFS with a stack and **low-link** values (the smallest discovery time reachable from a node's subtree); a node whose low-link equals its own discovery time is the root of an SCC. Kosaraju is easier to get right in an interview; know that Tarjan exists.",
      },
      {
        kind: "question",
        title: "Run Kosaraju",
        body: "DFS starts at A and takes arrows in alphabetical order. Step through both passes and tap what each question asks for.",
        widget: {
          type: "iv-trace",
          props: {
            title: "Kosaraju's algorithm",
            frames: [
              { graph: { nodes: SCC_NODES, edges: SCC_EDGES, directed: true, active: ["A", "B", "C"], activeEdges: [["A", "B"], ["B", "C"]] }, code: SCC_CODE, line: 2, stacks: [{ label: "finished", items: [] }], note: "Pass 1: DFS walks A → B → C. C's only arrow goes back to A, which is still open.", pick: { prompt: "Which node finishes first?", answer: "C" } },
              { graph: { active: ["A", "B", "D", "E", "F"], done: ["C"], activeEdges: [["B", "D"], ["D", "E"], ["E", "F"]] }, line: 2, stacks: [{ label: "finished", items: ["C", "F"] }], note: "C finishes. Back at B, DFS goes B → D → E → F. F has no arrows, so it finishes." },
              { graph: { done: ["A", "B", "C", "D", "E", "F"] }, line: 2, stacks: [{ label: "finished", items: ["C", "F", "E", "D", "B", "A"] }], note: "E, D, B and A finish in turn. The last to finish is on top: **A**." },
              { graph: { edges: SCC_EDGES.map(([a, b]) => [b, a] as [string, string]) }, line: 3, note: "Pass 2 uses the reversed graph and the finishing order from the top down: A, B, D, E, F, C.", pick: { prompt: "Which node does pass 2 start from?", answer: "A" } },
              { graph: { active: ["A", "B", "C"], activeEdges: [["A", "C"], ["C", "B"], ["B", "A"]] }, line: 5, vars: { "group 1": "A B C" }, note: "From A on the reversed graph: A → C → B → back to A. The old arrow B → D now points D → B, so it can't be followed from B. Group 1 is **{A, B, C}**." },
              { graph: { done: ["A", "B", "C"] }, line: 4, note: "Next in the order is B: already grouped.", pick: { prompt: "Which node starts group 2?", answer: "D" } },
              { graph: { done: ["A", "B", "C"], active: ["D", "E"], activeEdges: [["D", "E"], ["E", "D"]] }, line: 5, vars: { "group 1": "A B C", "group 2": "D E" }, note: "From D: D → E (reversed E → D) and D → B (grouped, ignored). Group 2 is **{D, E}**." },
              { graph: { done: ["A", "B", "C", "D", "E", "F"] }, line: 5, vars: { "group 1": "A B C", "group 2": "D E", "group 3": "F" }, note: "E is grouped. F's only reversed arrow goes to E, already grouped: **{F}** alone. C is grouped. **3 SCCs**." },
            ],
          },
        },
        question: { type: "widget", goal: { picked: true }, prompt: "Answer all three picks.", hint: "A node finishes when all its arrows have been explored; pass 2 goes through the finishing list from the last one finished." },
        explanation: "Pass 1 found the order; pass 2 on the reversed graph peeled off one SCC per start node: {A, B, C}, {D, E}, {F}. The condensation is the DAG ABC → DE → F.",
      },
      {
        kind: "question",
        title: "Count them",
        body: "A one-way road map has the roads 1→2, 2→3, 3→1, 3→4, 4→5, 5→6, 6→4, 6→7 and 7→7 (a loop back to itself). How many strongly connected components are there?",
        question: { type: "number", answer: 3, hint: "Find the cycles. A node on no cycle with anyone else is a component on its own." },
        explanation: "{1, 2, 3} is a cycle, {4, 5, 6} is a cycle, and 7 is alone (its self-loop doesn't join it to anyone). That's **3**. You can go from the first group to the second, but never back.",
      },
      {
        kind: "question",
        title: "The graph of components",
        body: "What is always true of the condensation (each SCC shrunk to one node)?",
        question: {
          type: "choice",
          options: ["It is a tree", "It has no cycles: it is a DAG", "It has exactly one source node", "It is strongly connected"],
          answer: 1,
          feedback: {
            0: "A component can have arrows to several others and from several others; it doesn't have to be a tree.",
            2: "Two unrelated components are both sources.",
            3: "Only if the whole graph is one SCC.",
          },
          hint: "If two components could reach each other, what would they be?",
        },
        explanation: "A cycle through several components would make all of them mutually reachable, so they'd be one SCC. The condensation is therefore a **DAG**, and you can topologically sort it.",
      },
      {
        kind: "code",
        title: "Find the components",
        body: "Write `scc_groups(n, edges)`: `n` nodes, one-way `edges` `(a, b)`. Return the strongly connected components as a list of lists (any order; the tests sort them).\n\nOne test is a single loop of 3,000 nodes, deeper than Python's recursion limit, so write both DFS passes with explicit stacks. A pass-1 stack can hold `(node, index of the next neighbour to try)`: the node finishes when that index runs off the end of its list.",
        language: "python",
        starter: `def scc_groups(n, edges):
    adj = [[] for _ in range(n)]
    radj = [[] for _ in range(n)]
    for a, b in edges:
        adj[a].append(b)
        radj[b].append(a)
    groups = []
    # pass 1: finishing order on adj; pass 2: reversed finishing order on radj
    return groups
`,
        solution: `def scc_groups(n, edges):
    adj = [[] for _ in range(n)]
    radj = [[] for _ in range(n)]
    for a, b in edges:
        adj[a].append(b)
        radj[b].append(a)
    seen = [False] * n
    order = []
    for s in range(n):
        if seen[s]:
            continue
        seen[s] = True
        stack = [(s, 0)]
        while stack:
            u, i = stack.pop()
            if i < len(adj[u]):
                stack.append((u, i + 1))
                v = adj[u][i]
                if not seen[v]:
                    seen[v] = True
                    stack.append((v, 0))
            else:
                order.append(u)
    group = [-1] * n
    groups = []
    for s in reversed(order):
        if group[s] != -1:
            continue
        group[s] = len(groups)
        members = [s]
        stack = [s]
        while stack:
            u = stack.pop()
            for v in radj[u]:
                if group[v] == -1:
                    group[v] = len(groups)
                    members.append(v)
                    stack.append(v)
        groups.append(members)
    return groups
`,
        tests: [
          { id: "t1", description: "two loops and two loners", assertionCode: `_r = scc_groups(8, [(0, 1), (1, 2), (2, 0), (2, 3), (3, 4), (4, 5), (5, 3), (6, 7), (5, 6)])\n_s = sorted(sorted(g) for g in _r)\nassert _s == [[0, 1, 2], [3, 4, 5], [6], [7]], f"expected [[0, 1, 2], [3, 4, 5], [6], [7]], got {_s}"` },
          { id: "t2", description: "a DAG: every node alone", assertionCode: `_r = scc_groups(5, [(0, 1), (1, 2), (0, 2), (3, 4)])\n_s = sorted(sorted(g) for g in _r)\nassert _s == [[0], [1], [2], [3], [4]], f"with no cycles every node is its own SCC, got {_s}"` },
          { id: "t3", description: "a two-way pair", assertionCode: `_r = scc_groups(3, [(0, 0), (0, 1), (1, 0), (1, 2)])\n_s = sorted(sorted(g) for g in _r)\nassert _s == [[0, 1], [2]], f"0 and 1 reach each other; 2 can't get back: expected [[0, 1], [2]], got {_s}"` },
          { id: "t4", description: "one loop of 3,000 nodes", assertionCode: `_n = 3000\n_r = scc_groups(_n, [(i, (i + 1) % _n) for i in range(_n)])\nassert len(_r) == 1 and sorted(_r[0]) == list(range(_n)), f"a single big loop is one SCC, got {len(_r)} groups"` },
        ],
        hints: ["Pass 1: pop `(u, i)`; if `u` has a neighbour number `i`, push `(u, i + 1)` back and then the unseen neighbour as `(v, 0)`. Otherwise `u` is finished: append it to `order`.", "Pass 2: for `s` in `reversed(order)` without a group, walk `radj` from `s` with a plain stack and collect everything not yet grouped."],
      },
      {
        kind: "code",
        title: "Roads to add",
        body: "A town's roads are all one-way. The council wants every junction to reach every other one. Write `roads_to_add(n, roads)`: the smallest number of new one-way roads that makes the whole map strongly connected.\n\nThe known result: shrink the SCCs. Count the components with **no** arrow coming in from another component (sources) and those with **no** arrow going out (sinks). The answer is the larger of the two counts, or 0 if there is only one component.\n\nA helper `scc_groups(n, edges)` (from the last step) is already in the starter.",
        language: "python",
        starter: `def scc_groups(n, edges):
    adj = [[] for _ in range(n)]
    radj = [[] for _ in range(n)]
    for a, b in edges:
        adj[a].append(b)
        radj[b].append(a)
    seen = [False] * n
    order = []
    for s in range(n):
        if seen[s]:
            continue
        seen[s] = True
        stack = [(s, 0)]
        while stack:
            u, i = stack.pop()
            if i < len(adj[u]):
                stack.append((u, i + 1))
                v = adj[u][i]
                if not seen[v]:
                    seen[v] = True
                    stack.append((v, 0))
            else:
                order.append(u)
    group = [-1] * n
    groups = []
    for s in reversed(order):
        if group[s] != -1:
            continue
        group[s] = len(groups)
        members = [s]
        stack = [s]
        while stack:
            u = stack.pop()
            for v in radj[u]:
                if group[v] == -1:
                    group[v] = len(groups)
                    members.append(v)
                    stack.append(v)
        groups.append(members)
    return groups


def roads_to_add(n, roads):
    groups = scc_groups(n, roads)
    # count the components with nothing coming in and with nothing going out
    return None
`,
        solution: `def scc_groups(n, edges):
    adj = [[] for _ in range(n)]
    radj = [[] for _ in range(n)]
    for a, b in edges:
        adj[a].append(b)
        radj[b].append(a)
    seen = [False] * n
    order = []
    for s in range(n):
        if seen[s]:
            continue
        seen[s] = True
        stack = [(s, 0)]
        while stack:
            u, i = stack.pop()
            if i < len(adj[u]):
                stack.append((u, i + 1))
                v = adj[u][i]
                if not seen[v]:
                    seen[v] = True
                    stack.append((v, 0))
            else:
                order.append(u)
    group = [-1] * n
    groups = []
    for s in reversed(order):
        if group[s] != -1:
            continue
        group[s] = len(groups)
        members = [s]
        stack = [s]
        while stack:
            u = stack.pop()
            for v in radj[u]:
                if group[v] == -1:
                    group[v] = len(groups)
                    members.append(v)
                    stack.append(v)
        groups.append(members)
    return groups


def roads_to_add(n, roads):
    groups = scc_groups(n, roads)
    if len(groups) <= 1:
        return 0
    comp = [0] * n
    for i, g in enumerate(groups):
        for v in g:
            comp[v] = i
    has_in = [False] * len(groups)
    has_out = [False] * len(groups)
    for a, b in roads:
        if comp[a] != comp[b]:
            has_out[comp[a]] = True
            has_in[comp[b]] = True
    return max(has_in.count(False), has_out.count(False))
`,
        tests: [
          { id: "t1", description: "a one-way chain needs one road back", assertionCode: `_r = roads_to_add(3, [(0, 1), (1, 2)])\nassert _r == 1, f"adding 2 -> 0 closes the chain into a loop: expected 1, got {_r}"` },
          { id: "t2", description: "already strongly connected", assertionCode: `_r = roads_to_add(4, [(0, 1), (1, 2), (2, 3), (3, 0)])\nassert _r == 0, f"a loop through every junction needs nothing: 0, got {_r}"\n_r = roads_to_add(1, [])\nassert _r == 0, f"a single junction needs nothing: 0, got {_r}"` },
          { id: "t3", description: "junctions with no roads", assertionCode: `_r = roads_to_add(3, [])\nassert _r == 3, f"3 isolated junctions need a loop of 3 roads, got {_r}"` },
          { id: "t4", description: "sources and sinks", assertionCode: `_r = roads_to_add(6, [(0, 1), (1, 0), (1, 2), (2, 3), (3, 2), (4, 5)])\nassert _r == 2, f"components {{0,1}} and {{4}} have nothing coming in, {{2,3}} and {{5}} nothing going out: expected 2, got {_r}"` },
        ],
        hints: ["Give each node its component number, then look at every road whose ends are in different components.", "Mark `has_out[comp[a]]` and `has_in[comp[b]]` for those roads; count the components missing each."],
      },
      {
        kind: "recap",
        points: [
          "An **SCC** is a largest group where everyone reaches everyone along the arrows.",
          "Shrinking SCCs gives the **condensation**, always a DAG.",
          "**Kosaraju**: DFS for finishing order, reverse the edges, DFS again in reverse finishing order. O(V + E).",
          "**Tarjan**: one DFS with discovery times, low-links and a stack.",
          "Write deep DFS with explicit stacks in Python.",
          "Making a graph strongly connected takes max(sources, sinks) new edges in the condensation.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 7. Bridges and articulation points ───────────────────────────────
  {
    id: "fnd-iv-graphs-7-bridges",
    title: "Bridges and articulation points",
    summary: "Single points of failure in a network: DFS discovery times, low-links, and the two rules that find every weak link in O(V + E).",
    level: "Professional",
    minutes: 15,
    xp: 90,
    steps: [
      {
        kind: "explain",
        title: "Single points of failure",
        body: "In an undirected graph:\n\n- a **bridge** is an edge whose removal disconnects the graph (splits a component in two);\n- an **articulation point** (cut vertex) is a node whose removal does the same.\n\nA graph with no articulation point is **biconnected**: every pair of nodes has two routes that share no middle node. The **biconnected components** are the largest such pieces, and they meet at articulation points.\n\nSignal words: *critical link, single point of failure, which cables can't be cut, which server must never go down, still connected if any one road closes?*\n\nThe brute force removes each edge and recounts components: O(E × (V + E)). One DFS does it in **O(V + E)**.",
      },
      {
        kind: "explain",
        title: "Discovery times and low-links",
        body: "Run a DFS and number the nodes in the order you first reach them: `tin[u]`, the **discovery time**. The edges DFS walks along form a tree; every other edge is a **back edge** to a node already on the current path (in an undirected DFS there are no other kinds).\n\n`low[u]` is the smallest `tin` you can reach from u's subtree using **at most one back edge**. It says how far up the tree u's subtree can \"climb\" without using the edge to its parent.\n\nFor a tree edge from parent u to child v:\n\n- **Bridge** when `low[v] > tin[u]`: nothing below v can climb to u or above, so this edge is the only way out.\n- **Articulation point** (u is not the root) when `low[v] >= tin[u]`: nothing below v can climb *above* u, so removing u cuts v's subtree off.\n- **The root** is an articulation point only when it has **two or more** DFS children.\n\n**Pitfall:** skip the edge you came in on by its **edge id**, not by \"is it my parent?\". Two parallel cables between the same pair are not a bridge, and skipping by parent would miss the second cable.",
      },
      {
        kind: "question",
        title: "Find the weak links",
        body: "DFS from A, trying neighbours in alphabetical order. The table shows `tin / low` for each node. Tap what each question asks for.",
        widget: {
          type: "iv-trace",
          props: {
            title: "tin and low",
            frames: [
              { graph: { ...BRIDGE_GRAPH, active: ["A", "B", "C"], activeEdges: [["A", "B"], ["B", "C"]] }, code: BRIDGE_CODE, line: 4, vars: { A: "0 / 0", B: "1 / 1", C: "2 / 2" }, note: "DFS goes A → B → C. Now C looks at its neighbours A, B and D. B is its parent.", pick: { prompt: "Tap the neighbour C reaches by a **back edge**.", answer: "A" } },
              { graph: { active: ["C", "D", "E", "F"], done: ["A", "B"], activeEdges: [["C", "D"], ["D", "E"], ["E", "F"]] }, line: 6, vars: { A: "0 / 0", B: "1 / 1", C: "2 / 0", D: "3 / 3", E: "4 / 4", F: "5 / 5" }, note: "The back edge C–A sets `low[C] = 0`. DFS continues C → D → E → F." },
              { graph: { active: ["F", "G"], done: ["A", "B", "C", "D", "E"], activeEdges: [["F", "D"], ["F", "G"]] }, line: 4, vars: { A: "0 / 0", B: "1 / 1", C: "2 / 0", D: "3 / 3", E: "4 / 4", F: "5 / 3", G: "6 / 6" }, note: "F sees D, already visited: a back edge, so `low[F] = 3`. Then F → G. G has nothing new; `low[G]` stays 6." },
              { graph: { active: ["F", "G"], done: ["A", "B", "C", "D", "E"] }, line: 8, note: "Back at F: `low[G] = 6 > tin[F] = 5`, so **F–G is a bridge**.", pick: { prompt: "The same test makes one node an articulation point. Tap it.", answer: "F" } },
              { graph: { active: ["D", "E"], done: ["A", "B", "C", "F", "G"], activeEdges: [["F", "G"]] }, line: 9, vars: { A: "0 / 0", B: "1 / 1", C: "2 / 0", D: "3 / 3", E: "4 / 3", F: "5 / 3", G: "6 / 6" }, note: "F is a cut point. Back at E: `low[E] = 3`. Back at D: `low[E] = 3` is not > 3 (no bridge), but it is ≥ `tin[D] = 3`: **D is a cut point**." },
              { graph: { active: ["C", "D"], done: ["A", "B", "E", "F", "G"], activeEdges: [["C", "D"], ["F", "G"]] }, line: 8, note: "Back at C: `low[D] = 3 > tin[C] = 2`: **C–D is a bridge**, and C is a cut point." },
              { graph: { done: ["A", "B", "C", "D", "E", "F", "G"], activeEdges: [["C", "D"], ["F", "G"]] }, line: 9, note: "B and A finish. A is the root with one DFS child (B), so it is not a cut point. Bridges: **C–D, F–G**. Cut points: **C, D, F**." },
            ],
          },
        },
        question: { type: "widget", goal: { picked: true }, prompt: "Answer both picks.", hint: "A back edge goes to an already visited node that isn't the parent; a cut point is the parent end of a child that can't climb above it." },
        explanation: "The triangles A-B-C and D-E-F can each survive losing one link, because their nodes can climb around. The edges joining them, and the nodes holding them, are the weak spots.",
      },
      {
        kind: "question",
        title: "Strict or not?",
        body: "For a tree edge u → v, the bridge rule is `low[v] > tin[u]`, but the articulation rule is `low[v] >= tin[u]`. What does `low[v] == tin[u]` mean?",
        question: {
          type: "choice",
          options: ["Its subtree has a back edge to u", "v's subtree can climb above u", "v is a leaf", "The DFS has a bug"],
          answer: 0,
          feedback: {
            1: "Climbing above u would make `low[v]` smaller than `tin[u]`.",
            2: "A leaf with no back edge has `low[v] == tin[v]`, which is bigger than `tin[u]`.",
            3: "It's a normal case, and it's exactly why the two rules differ.",
          },
          hint: "Which node has discovery time `tin[u]`?",
        },
        explanation: "The subtree reaches u by another edge, so the edge u–v is **not** a bridge (there's a second way). But it can't get past u, so removing **u** still cuts it off: u is an articulation point.",
      },
      {
        kind: "question",
        title: "The root is special",
        body: "Why does the DFS root need its own rule (two or more DFS children)?",
        question: {
          type: "choice",
          options: ["The root's low value is always 0", "The root has no parent edge to skip", "Nothing can climb above the root", "The root is visited twice"],
          answer: 2,
          feedback: {
            0: "True, but that's a consequence. The question is why the ≥ rule breaks.",
            1: "That changes nothing about the test itself.",
            3: "Each node is discovered once.",
          },
          hint: "Check `low[v] >= tin[root]` with `tin[root] = 0`. When is it false?",
        },
        explanation: "`tin[root]` is 0, so `low[v] >= 0` always holds and every root would look like a cut point. Instead: if the root has two DFS children, they can only be connected through the root (otherwise DFS would have reached the second from the first). One child means removing the root leaves the rest connected.",
      },
      {
        kind: "code",
        title: "Critical cables",
        body: "Write `find_bridges(n, links)`: return every bridge as a tuple `(a, b)` with `a < b` (any order; the tests sort them). `links` may contain the **same pair twice**: two cables, neither of which is a bridge.\n\nGive each link an id (its index) and skip only the link you came in on. One test is a chain of 5,000 nodes, so use an explicit stack: push `(node, id of the link used to get here, next neighbour index)`, and when a node is done, update its parent's `low` and test the bridge rule.",
        language: "python",
        starter: `def find_bridges(n, links):
    adj = [[] for _ in range(n)]
    for i, (a, b) in enumerate(links):
        adj[a].append((b, i))
        adj[b].append((a, i))
    tin = [-1] * n
    low = [0] * n
    bridges = []
    # DFS from every unvisited node, with an explicit stack
    return None
`,
        solution: `def find_bridges(n, links):
    adj = [[] for _ in range(n)]
    for i, (a, b) in enumerate(links):
        adj[a].append((b, i))
        adj[b].append((a, i))
    tin = [-1] * n
    low = [0] * n
    bridges = []
    timer = 0
    for s in range(n):
        if tin[s] != -1:
            continue
        tin[s] = low[s] = timer
        timer += 1
        stack = [(s, -1, 0)]
        while stack:
            u, came, i = stack.pop()
            if i < len(adj[u]):
                stack.append((u, came, i + 1))
                v, eid = adj[u][i]
                if eid == came:
                    continue
                if tin[v] == -1:
                    tin[v] = low[v] = timer
                    timer += 1
                    stack.append((v, eid, 0))
                else:
                    low[u] = min(low[u], tin[v])
            elif stack:
                p = stack[-1][0]
                low[p] = min(low[p], low[u])
                if low[u] > tin[p]:
                    a, b = links[came]
                    bridges.append((min(a, b), max(a, b)))
    return bridges
`,
        tests: [
          { id: "t1", description: "two loops joined by one cable", assertionCode: `_r = find_bridges(6, [(0, 1), (1, 2), (2, 0), (2, 3), (3, 4), (4, 5), (5, 3)])\nassert isinstance(_r, list), f"find_bridges should return a list of (a, b) tuples, got {_r!r}"\n_s = sorted(tuple(sorted(e)) for e in _r)\nassert _s == [(2, 3)], f"only 2-3 joins the two triangles: expected [(2, 3)], got {_s}"` },
          { id: "t2", description: "a loop has no bridge", assertionCode: `_r = find_bridges(4, [(0, 1), (1, 2), (2, 3), (3, 0)])\nassert isinstance(_r, list), f"find_bridges should return a list of (a, b) tuples, got {_r!r}"\nassert sorted(_r) == [], f"every cable in a loop has a way around: expected [], got {sorted(_r)}"` },
          { id: "t3", description: "a doubled cable is not a bridge", assertionCode: `_r = find_bridges(3, [(0, 1), (0, 1), (1, 2)])\nassert isinstance(_r, list), f"find_bridges should return a list of (a, b) tuples, got {_r!r}"\n_s = sorted(tuple(sorted(e)) for e in _r)\nassert _s == [(1, 2)], f"0-1 has two cables, so only 1-2 is a bridge; got {_s}. Skip the link id you came in on, not the parent node."` },
          { id: "t4", description: "separate pieces", assertionCode: `_r = find_bridges(5, [(0, 1), (2, 3), (3, 4), (4, 2)])\nassert isinstance(_r, list), f"find_bridges should return a list of (a, b) tuples, got {_r!r}"\n_s = sorted(tuple(sorted(e)) for e in _r)\nassert _s == [(0, 1)], f"0-1 is a bridge in its own piece; the triangle 2-3-4 has none. Got {_s}"` },
          { id: "t5", description: "a chain of 5,000 nodes", assertionCode: `_n = 5000\n_r = find_bridges(_n, [(i, i + 1) for i in range(_n - 1)])\nassert isinstance(_r, list), f"find_bridges should return a list of (a, b) tuples, got {_r!r}"\nassert len(_r) == _n - 1, f"every link of a chain is a bridge: expected {_n - 1}, got {len(_r)}"` },
        ],
        hints: ["Pop `(u, came, i)`. If `u` has a neighbour `i`, push `(u, came, i + 1)` back, skip the link if its id is `came`, and either discover `v` or use it as a back edge.", "When `u` runs out of neighbours, its parent is the node now on top of the stack: lower the parent's `low` and check `low[u] > tin[parent]`."],
      },
      {
        kind: "code",
        title: "Servers that must not fail",
        body: "Write `cut_points(n, links)`: every articulation point, sorted. Remember the root rule: the DFS root is a cut point only with two or more DFS children. (No link joins a node to itself here.)",
        language: "python",
        starter: `def cut_points(n, links):
    adj = [[] for _ in range(n)]
    for a, b in links:
        adj[a].append(b)
        adj[b].append(a)
    # one DFS with tin and low; remember the root rule
    return None
`,
        solution: `def cut_points(n, links):
    adj = [[] for _ in range(n)]
    for a, b in links:
        adj[a].append(b)
        adj[b].append(a)
    tin = [-1] * n
    low = [0] * n
    cut = set()
    timer = 0
    for s in range(n):
        if tin[s] != -1:
            continue
        tin[s] = low[s] = timer
        timer += 1
        children = 0
        stack = [(s, -1, 0)]
        while stack:
            u, parent, i = stack.pop()
            if i < len(adj[u]):
                stack.append((u, parent, i + 1))
                v = adj[u][i]
                if v == parent:
                    continue
                if tin[v] == -1:
                    tin[v] = low[v] = timer
                    timer += 1
                    if u == s:
                        children += 1
                    stack.append((v, u, 0))
                else:
                    low[u] = min(low[u], tin[v])
            elif parent != -1:
                low[parent] = min(low[parent], low[u])
                if parent != s and low[u] >= tin[parent]:
                    cut.add(parent)
        if children >= 2:
            cut.add(s)
    return sorted(cut)
`,
        tests: [
          { id: "t1", description: "a star", assertionCode: `_r = cut_points(5, [(0, 1), (0, 2), (0, 3), (0, 4)])\nassert isinstance(_r, list), f"cut_points should return a sorted list, got {_r!r}"\nassert sorted(_r) == [0], f"only the centre holds the star together: expected [0], got {sorted(_r)}"` },
          { id: "t2", description: "a loop has none", assertionCode: `_r = cut_points(5, [(0, 1), (1, 2), (2, 3), (3, 4), (4, 0)])\nassert isinstance(_r, list), f"cut_points should return a sorted list, got {_r!r}"\nassert sorted(_r) == [], f"any one node of a loop can go and the rest stay linked: expected [], got {sorted(_r)}"` },
          { id: "t3", description: "the bow tie: a root with two children", assertionCode: `_r = cut_points(5, [(0, 1), (1, 2), (2, 0), (0, 3), (3, 4), (4, 0)])\nassert isinstance(_r, list), f"cut_points should return a sorted list, got {_r!r}"\nassert sorted(_r) == [0], f"two triangles share node 0, which is the DFS root here: expected [0], got {sorted(_r)}"` },
          { id: "t4", description: "the traced network", assertionCode: `_r = cut_points(7, [(0, 1), (0, 2), (1, 2), (2, 3), (3, 4), (3, 5), (4, 5), (5, 6)])\nassert isinstance(_r, list), f"cut_points should return a sorted list, got {_r!r}"\nassert sorted(_r) == [2, 3, 5], f"expected [2, 3, 5] (C, D and F in the trace), got {sorted(_r)}"` },
        ],
        hints: ["Track the parent node on the stack. When `u` finishes, update `low[parent]` and apply `low[u] >= tin[parent]` unless the parent is the root.", "Count the root's children as you discover them; add the root at the end if it has two or more."],
      },
      {
        kind: "recap",
        points: [
          "A **bridge** is an edge, an **articulation point** a node, whose removal disconnects the graph.",
          "One DFS: `tin[u]` = discovery time, `low[u]` = smallest `tin` reachable from u's subtree with one back edge.",
          "Tree edge u → v: **bridge** if `low[v] > tin[u]`; u is a **cut point** if `low[v] >= tin[u]` (not the root).",
          "The **root** is a cut point only with two or more DFS children.",
          "Skip the incoming edge by **id**, so parallel edges are handled.",
          "O(V + E), versus O(E × (V + E)) for removing each edge and recounting.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 8. Eulerian paths and circuits ───────────────────────────────
  {
    id: "fnd-iv-graphs-8-eulerian",
    title: "Eulerian paths: every edge once",
    summary: "The degree rules for drawing a figure in one stroke, Hierholzer's algorithm, and building a route that uses every leg exactly once.",
    level: "Professional",
    minutes: 14,
    xp: 90,
    steps: [
      {
        kind: "explain",
        title: "One stroke, every edge",
        body: "An **Eulerian path** uses every **edge** exactly once (nodes may repeat). An **Eulerian circuit** is one that ends where it started. (Don't confuse it with a Hamiltonian path, which visits every *node* once: that one is NP-hard.)\n\nWhether one exists is just counting degrees. Ignore nodes with no edges; the rest must be connected. Then:\n\n| Graph | Circuit exists when | Path exists when |\n| --- | --- | --- |\n| Undirected | every degree is even | 0 or 2 nodes have odd degree (start at one, end at the other) |\n| Directed | in-degree = out-degree everywhere | also allowed: one start with out − in = 1 and one end with in − out = 1 |\n\nWhy: every time the walk passes through a node it uses one edge in and one out. Only the start and the end can be left with an odd one.\n\nA connected drawing with 2k odd nodes (k ≥ 1) needs exactly **k** strokes.\n\nSignal words: *use every ticket / domino / road exactly once, draw without lifting the pen, a route that sweeps every street*, and building a string where every short code appears once (de Bruijn sequences).",
      },
      {
        kind: "question",
        title: "Can you walk it?",
        body: "A connected park has five path junctions with degrees 2, 3, 4, 3 and 2. Can you walk every path exactly once?",
        question: {
          type: "choice",
          options: ["Yes, from any junction, ending where you began", "No, because a junction has an odd degree", "Yes, starting at one of the two degree-3 junctions", "No, because the degrees add up to an odd number"],
          answer: 2,
          feedback: {
            0: "That would be a circuit, which needs every degree to be even.",
            1: "Up to two odd junctions are fine for a path: they become the start and the end.",
            3: "2 + 3 + 4 + 3 + 2 = 14, which is even (it always is: twice the edges).",
          },
          hint: "Count the junctions with an odd degree.",
        },
        explanation: "Exactly two junctions are odd, so an Eulerian **path** exists, from one degree-3 junction to the other. No circuit, because a circuit needs every degree even.",
      },
      {
        kind: "question",
        title: "How many strokes?",
        body: "A connected line drawing has 6 points where an odd number of lines meet. How many separate pen strokes does it take, at least, to draw every line exactly once?",
        question: { type: "number", answer: 3, hint: "Each stroke has two ends, and every odd point must be the end of some stroke." },
        explanation: "Every odd point must be the start or end of a stroke, and each stroke has two ends: 6 / 2 = **3**. Adding 2 imaginary edges between pairs of odd points would make one stroke possible, and cutting them again splits it into 3.",
      },
      {
        kind: "explain",
        title: "Hierholzer's algorithm",
        body: "Knowing a path exists isn't the same as finding one. A greedy walk can get stuck back at the start with edges still unused elsewhere. **Hierholzer's algorithm** fixes that by **splicing in detours**, and the stack version does it automatically:\n\n" +
          py(`
stack = [start]; path = []
while stack:
    u = stack[-1]
    if adj[u]:                       # an unused edge left
        stack.append(adj[u].pop())   # walk it (and use it up)
    else:                            # stuck: u is finished
        path.append(stack.pop())
return path[::-1]
`) +
          "\n\nWhen the walk is stuck, it backs up along the stack, writing finished nodes to `path`, until it reaches a node with an unused edge; from there it walks a detour. Reversing `path` gives the route. Each edge is pushed and popped once: **O(E)**.\n\nStart at the node with out − in = 1 if there is one (or an odd node, undirected); otherwise anywhere with an edge. At the end, check `len(path) == E + 1`: if not, the edges weren't connected.",
      },
      {
        kind: "question",
        title: "Splice in a detour",
        body: "Hierholzer on a directed graph from P. Each node takes the **last** unused arrow in its list; Q's list is [S, R], so Q → R goes first. Tap what each question asks for.",
        widget: {
          type: "iv-trace",
          props: {
            title: "Hierholzer's algorithm",
            frames: [
              { graph: { ...EULER_GRAPH, active: ["P", "Q", "R"], activeEdges: [["P", "Q"], ["Q", "R"], ["R", "P"]] }, code: EULER_CODE, line: 5, stacks: [{ label: "stack", items: ["P", "Q", "R", "P"] }, { label: "path", items: [] }], note: "The walk goes P → Q → R → P. P has no arrows left, but Q → S, S → T and T → Q are still unused." },
              { line: 7, stacks: [{ label: "stack", items: ["P", "Q", "R"] }, { label: "path", items: ["P"] }], graph: { done: ["P"], activeEdges: [["P", "Q"], ["Q", "R"], ["R", "P"]] }, note: "P is stuck: pop it onto the path. The walk backs up along the stack.", pick: { prompt: "Which node on the stack still has an unused arrow?", answer: "Q" } },
              { line: 5, stacks: [{ label: "stack", items: ["P", "Q", "S", "T", "Q"] }, { label: "path", items: ["P", "R"] }], graph: { active: ["Q", "S", "T"], done: ["P", "R"], activeEdges: [["Q", "S"], ["S", "T"], ["T", "Q"]] }, note: "R is stuck too, so it goes on the path. Q still has Q → S: the detour Q → S → T → Q runs." },
              { line: 7, stacks: [{ label: "stack", items: [] }, { label: "path", items: ["P", "R", "Q", "T", "S", "Q", "P"] }], graph: { done: ["P", "Q", "R", "S", "T"] }, note: "Now every arrow is used. Q, T, S, Q and P are popped onto the path in turn.", pick: { prompt: "Reversed, the path is the route. Which node comes **second** in the route?", answer: "Q" } },
              { line: 8, graph: { done: ["P", "Q", "R", "S", "T"], activeEdges: [["P", "Q"], ["Q", "S"], ["S", "T"], ["T", "Q"], ["Q", "R"], ["R", "P"]] }, note: "Route: **P Q S T Q R P**. The detour through S and T was spliced in at Q, and all 6 arrows are used once." },
            ],
          },
        },
        question: { type: "widget", goal: { picked: true }, prompt: "Answer both picks.", hint: "Nodes are written to the path as they get stuck, so the path is the route backwards." },
        explanation: "The first loop P Q R P got stuck early. Backing up found Q with spare arrows, walked the detour, and the reversed path came out as one route with the detour in the middle.",
      },
      {
        kind: "code",
        title: "One stroke?",
        body: "Write `can_trace(n, lines)`: `n` points and undirected `lines` `(a, b)`. Return True if you can draw every line exactly once without lifting the pen. Points with no lines don't matter. A line from a point to itself adds 2 to its degree.",
        language: "python",
        starter: `def can_trace(n, lines):
    deg = [0] * n
    for a, b in lines:
        deg[a] += 1
        deg[b] += 1
    # the degree rule, and every point with a line must be connected
    return None
`,
        solution: `def can_trace(n, lines):
    deg = [0] * n
    adj = [[] for _ in range(n)]
    for a, b in lines:
        deg[a] += 1
        deg[b] += 1
        adj[a].append(b)
        adj[b].append(a)
    odd = sum(d % 2 for d in deg)
    if odd not in (0, 2):
        return False
    start = next((v for v in range(n) if deg[v] > 0), None)
    if start is None:
        return True
    seen = {start}
    stack = [start]
    while stack:
        u = stack.pop()
        for v in adj[u]:
            if v not in seen:
                seen.add(v)
                stack.append(v)
    return all(deg[v] == 0 or v in seen for v in range(n))
`,
        tests: [
          { id: "t1", description: "a triangle with a tail", assertionCode: `_r = can_trace(4, [(0, 1), (1, 2), (2, 0), (2, 3)])\nassert _r is True, f"two odd points (2 and 3): start at one, end at the other. Expected True, got {_r}"` },
          { id: "t2", description: "two separate triangles", assertionCode: `_r = can_trace(6, [(0, 1), (1, 2), (2, 0), (3, 4), (4, 5), (5, 3)])\nassert _r is False, f"all degrees are even, but the triangles aren't connected: expected False, got {_r}"` },
          { id: "t3", description: "four odd points", assertionCode: `_r = can_trace(5, [(0, 1), (0, 2), (0, 3), (0, 4)])\nassert _r is False, f"the four tips are odd, which needs two strokes: expected False, got {_r}"` },
          { id: "t4", description: "lonely points and empty drawings", assertionCode: `_r = can_trace(5, [(0, 1), (1, 2), (2, 0)])\nassert _r is True, f"points 3 and 4 have no lines and don't matter: expected True, got {_r}"\n_r = can_trace(3, [])\nassert _r is True, f"nothing to draw is trivially fine: expected True, got {_r}"` },
        ],
        hints: ["The degree rule is right but not enough: the points that have lines must all be connected.", "Walk from any point with a line, then check that every point with a line was reached."],
      },
      {
        kind: "code",
        title: "Every leg once",
        body: "A courier has a list of one-way delivery legs `(from, to)` between named stops. Write `courier_route(legs)`: a list of stops that drives every leg exactly once (each step from one stop to the next must be one of the legs), or `[]` if that's impossible. If several routes work, return any. An empty list of legs gives `[]`.\n\nUse Hierholzer with a stack. Pick the start by the degree rule, and check the route's length at the end. One test has 6,000 legs, so don't recurse.",
        language: "python",
        starter: `from collections import defaultdict

def courier_route(legs):
    out = defaultdict(list)
    for a, b in legs:
        out[a].append(b)
    # check the out - in balance, pick the start, then run Hierholzer with a stack
    return None
`,
        solution: `from collections import defaultdict

def courier_route(legs):
    if not legs:
        return []
    out = defaultdict(list)
    diff = defaultdict(int)
    for a, b in legs:
        out[a].append(b)
        diff[a] += 1
        diff[b] -= 1
    starts = [v for v, d in diff.items() if d == 1]
    ends = [v for v, d in diff.items() if d == -1]
    if any(abs(d) > 1 for d in diff.values()) or len(starts) > 1 or len(starts) != len(ends):
        return []
    start = starts[0] if starts else legs[0][0]
    stack = [start]
    path = []
    while stack:
        u = stack[-1]
        if out[u]:
            stack.append(out[u].pop())
        else:
            path.append(stack.pop())
    path.reverse()
    return path if len(path) == len(legs) + 1 else []
`,
        tests: [
          {
            id: "t1",
            description: "a loop and a tail",
            assertionCode: `from collections import Counter\n_legs = [("mill", "dock"), ("dock", "farm"), ("farm", "mill"), ("mill", "inn")]\n_r = courier_route(_legs)\nassert isinstance(_r, list) and len(_r) == 5, f"4 legs need a route of 5 stops, got {_r}"\nassert Counter(zip(_r, _r[1:])) == Counter(_legs), f"the route must drive each leg exactly once, got {_r}"\nassert _r[0] == "mill" and _r[-1] == "inn", f"mill has one more leg out than in, so start there; inn is the end. Got {_r}"`,
          },
          {
            id: "t2",
            description: "a detour must be spliced in",
            assertionCode: `from collections import Counter\n_legs = [("P", "Q"), ("Q", "S"), ("Q", "R"), ("R", "P"), ("S", "T"), ("T", "Q")]\n_r = courier_route(_legs)\nassert isinstance(_r, list) and len(_r) == 7 and Counter(zip(_r, _r[1:])) == Counter(_legs), f"every one of the 6 legs once, as 7 stops; got {_r}. A plain greedy walk gets stuck at P."`,
          },
          { id: "t3", description: "impossible plans", assertionCode: `_r = courier_route([("a", "b"), ("a", "c")])\nassert _r == [], f"two legs leave a and none come back: no single route, expected [], got {_r}"\n_r = courier_route([("a", "b"), ("b", "a"), ("c", "d"), ("d", "c")])\nassert _r == [], f"the degrees balance, but the two loops aren't connected: expected [], got {_r}"\n_r = courier_route([])\nassert _r == [], f"no legs gives [], got {_r}"` },
          {
            id: "t4",
            description: "6,000 legs",
            assertionCode: `from collections import Counter\n_legs = [(f"s{i}", f"s{(i + 1) % 3000}") for i in range(3000)] + [(f"s{i}", f"s{(i + 7) % 3000}") for i in range(0, 3000, 7)]\n_legs += [(f"s{(i + 7) % 3000}", f"s{i}") for i in range(0, 3000, 7)]\n_r = courier_route(_legs)\nassert isinstance(_r, list) and len(_r) == len(_legs) + 1 and Counter(zip(_r, _r[1:])) == Counter(_legs), "the big plan has a route through every leg once, and yours doesn't drive each leg exactly once"`,
          },
        ],
        hints: ["For each stop, track out − in. A valid plan has every difference 0, or exactly one +1 (the start) and one −1 (the end).", "Run the stack loop from the start; if the reversed path has fewer than `len(legs) + 1` stops, some legs were unreachable: return []."],
      },
      {
        kind: "recap",
        points: [
          "**Eulerian path**: every edge once. Circuit: and back to the start. (Hamiltonian is every *node* once, and much harder.)",
          "Undirected: connected (ignoring bare nodes) with 0 odd nodes for a circuit, or 2 for a path.",
          "Directed: in = out everywhere, or one start with out − in = 1 and one end with in − out = 1.",
          "2k odd nodes need k strokes.",
          "**Hierholzer**: walk with a stack, write nodes to the path when stuck, reverse at the end. O(E).",
          "Check `len(path) == E + 1` to catch edges in a separate piece.",
        ],
      },
    ],
  },
];
