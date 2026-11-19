import type { ConceptLesson } from "../../learn/types.ts";

/** Fenced Python block for lesson prose. */
const py = (code: string) => "~~~python\n" + code.trim() + "\n~~~";
/** Fenced plain-text block (diagrams, tables). */
const txt = (code: string) => "~~~text\n" + code.replace(/^\n+|\s+$/g, "") + "\n~~~";
/** Paragraphs joined with blank lines. */
const P = (...paras: string[]) => paras.join("\n\n");

/**
 * Hidden setup for the binary-tree code steps: a `Node` class, `build(values)` from a level-order list with `None`
 * gaps, and `to_list(root)` back again. Shown to the learner as TREE_HELP.
 */
export const TREE_SETUP = `from collections import deque

class Node:
    def __init__(self, val, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

    def __repr__(self):
        return f"Node({self.val!r})"

def build(values):
    if not values or values[0] is None:
        return None
    root = Node(values[0])
    queue = deque([root])
    i = 1
    while queue and i < len(values):
        node = queue.popleft()
        if i < len(values) and values[i] is not None:
            node.left = Node(values[i])
            queue.append(node.left)
        i += 1
        if i < len(values) and values[i] is not None:
            node.right = Node(values[i])
            queue.append(node.right)
        i += 1
    return root

def to_list(root):
    out, queue = [], deque([root])
    while queue:
        node = queue.popleft()
        if node is None:
            out.append(None)
        else:
            out.append(node.val)
            queue.append(node.left)
            queue.append(node.right)
    while out and out[-1] is None:
        out.pop()
    return out
`;

/** What the learner is told about TREE_SETUP. */
export const TREE_HELP =
  "`Node(val, left=None, right=None)`, `build(values)` and `to_list(root)` are loaded for you. Trees are written level by level, left to right, with `None` for a missing child:\n\n" +
  py(`
root = build([1, 2, 3, None, 4])   # 1 has children 2 and 3; 2 has only a right child, 4
root.left.right.val                # 4
to_list(root)                      # [1, 2, 3, None, 4]
`);

// ── shared trace data ──
const ORG_TREE = [
  { id: "0", label: "0" },
  { id: "1", label: "1", parent: "0" },
  { id: "2", label: "2", parent: "0" },
  { id: "3", label: "3", parent: "1" },
  { id: "4", label: "4", parent: "1" },
  { id: "5", label: "5", parent: "2" },
  { id: "6", label: "6", parent: "4" },
];
const ABC_TREE = [
  { id: "A", label: "A" },
  { id: "B", label: "B", parent: "A", side: "L" as const },
  { id: "C", label: "C", parent: "A", side: "R" as const },
  { id: "D", label: "D", parent: "B", side: "L" as const },
  { id: "E", label: "E", parent: "B", side: "R" as const },
  { id: "F", label: "F", parent: "C", side: "R" as const },
];
const PRE_CODE = ["def pre(node):", "    if node is None: return", "    out.append(node.val)", "    pre(node.left)", "    pre(node.right)"];
const HEIGHT_TREE = [
  { id: "A", label: "A" },
  { id: "B", label: "B", parent: "A", side: "L" as const },
  { id: "C", label: "C", parent: "A", side: "R" as const },
  { id: "D", label: "D", parent: "B", side: "L" as const },
  { id: "E", label: "E", parent: "B", side: "R" as const },
  { id: "F", label: "F", parent: "C", side: "R" as const },
  { id: "G", label: "G", parent: "E", side: "L" as const },
];
const HEIGHT_CODE = ["def height(node):", "    if node is None: return 0", "    left = height(node.left)", "    right = height(node.right)", "    return 1 + max(left, right)"];
const FULL7 = [
  { id: "A", label: "A" },
  { id: "B", label: "B", parent: "A", side: "L" as const },
  { id: "C", label: "C", parent: "A", side: "R" as const },
  { id: "D", label: "D", parent: "B", side: "L" as const },
  { id: "E", label: "E", parent: "B", side: "R" as const },
  { id: "F", label: "F", parent: "C", side: "L" as const },
  { id: "G", label: "G", parent: "C", side: "R" as const },
];
const STACK_CODE = ["stack = [root]", "while stack:", "    node = stack.pop()", "    visit(node)", "    if node.right: stack.append(node.right)", "    if node.left: stack.append(node.left)"];
const BFS_TREE = [
  { id: "1", label: "1" },
  { id: "2", label: "2", parent: "1", side: "L" as const },
  { id: "3", label: "3", parent: "1", side: "R" as const },
  { id: "4", label: "4", parent: "2", side: "L" as const },
  { id: "5", label: "5", parent: "2", side: "R" as const },
  { id: "6", label: "6", parent: "3", side: "R" as const },
  { id: "7", label: "7", parent: "6", side: "L" as const },
];
const LEVEL_CODE = ["queue = deque([root])", "while queue:", "    level = []", "    for _ in range(len(queue)):", "        node = queue.popleft()", "        level.append(node.val)", "        add node.left, node.right if present", "    levels.append(level)"];

/** Lessons 1 to 5 of "Trees, heaps and tries". */
export const ivTreesLessonsA: ConceptLesson[] = [
  // ─────────────────────────────── 1. Trees ───────────────────────────────
  {
    id: "fnd-iv-trees-1-tree",
    title: "Trees: words, shapes and storage",
    summary: "Roots, leaves, depth and height, n − 1 edges, and turning a parent list into a tree you can walk.",
    minutes: 10,
    xp: 60,
    level: "Beginner",
    steps: [
      {
        kind: "explain",
        title: "A hierarchy with no loops",
        body: P(
          "A **tree** is a set of nodes joined by edges, with one **root** at the top, where every other node has exactly one **parent**. Folders on a disk, an org chart, the parts of a web page: all trees. (See *Data structures and algorithms* for a first look.)",
          "- A node's **children** are the nodes directly below it; a node with no children is a **leaf**.\n- The **depth** of a node is how many edges it is below the root (the root has depth 0).\n- The **height** of the tree is the depth of its deepest node.\n- A node and everything below it is a **subtree**.",
          "Two facts that solve many interview questions: a tree with **n nodes has exactly n − 1 edges** (one per node except the root), and there is **exactly one path** between any two nodes. Add one more edge and you get a cycle; take one away and it falls into two pieces.",
          "Interviews often hand you a tree as a **parent list**: `parents[i]` is the parent of node i, and `-1` marks the root. To walk it from the top, build **child lists** first, in one O(n) pass:",
          py(`
children = [[] for _ in parents]
for i, p in enumerate(parents):
    if p == -1:
        root = i
    else:
        children[p].append(i)
`),
          "**How to spot it:** *hierarchy*, *manager*, *folder*, *each X has one parent*, *n nodes and n − 1 edges*.",
        ),
      },
      {
        kind: "question",
        title: "An org chart",
        body: "`parents = [-1, 0, 0, 1, 1, 2, 4]` describes a small company: person 0 is the boss. Step through and answer the picks.",
        widget: {
          type: "iv-trace",
          props: {
            title: "From a parent list to levels",
            frames: [
              { array: [-1, 0, 0, 1, 1, 2, 4], tree: { nodes: ORG_TREE, active: ["0"] }, note: "`parents[i]` is the manager of person `i`. Index 0 holds `-1`: person 0 is the root." },
              { highlight: [3, 4], tree: { active: ["3", "4"] }, vars: { "children[1]": "3 4", "children[2]": "5", "children[4]": "6" }, note: "One pass builds the child lists: `parents[3]` and `parents[4]` are 1, so 1 has children 3 and 4." },
              { tree: { active: ["1", "2"], done: ["0"] }, vars: { depth: 1 }, note: "Walk down a level at a time. Depth 1: 1 and 2." },
              { tree: { active: ["3", "4", "5"], done: ["0", "1", "2"] }, vars: { depth: 2 }, note: "Depth 2: 3, 4 and 5. Two of them are leaves.", pick: { prompt: "Tap the only node at depth 3.", answer: "6" } },
              { tree: { active: ["6"], done: ["0", "1", "2", "3", "4", "5"] }, vars: { depth: 3 }, note: "Depth 3: just 6. Nothing is below it, so the **height** is 3." },
              { tree: { active: ["1", "2"] }, vars: { "size(1)": "?", "size(2)": "?" }, note: "The root has two children. Each one leads a team: itself and everyone below.", pick: { prompt: "Which child of the root has the bigger team?", answer: "1" } },
              { tree: { active: ["1", "3", "4", "6"] }, vars: { "size(1)": 4, "size(2)": 2 }, note: "1 leads 4 people (1, 3, 4, 6); 2 leads 2 (2, 5). 7 nodes, 6 edges." },
            ],
          },
        },
        question: { type: "widget", goal: { picked: true }, prompt: "Answer both picks.", hint: "Depth counts edges down from the root; a team is a node plus everything below it." },
        explanation: "The parent list turned into child lists in one pass, and walking level by level gave depths and the height (3). Subtree sizes add up from the leaves.",
      },
      {
        kind: "question",
        title: "Count the edges",
        body: "A family tree has **50** people, each linked only to their one parent (except the founder). How many links are there?",
        question: { type: "number", answer: 49, hint: "Every person except the root has exactly one link going up.", unit: "links" },
        explanation: "One upward edge per node except the root: **49**. Any connected structure with n nodes and n − 1 edges and no cycle is a tree, which is a quick check in graph problems.",
      },
      {
        kind: "question",
        title: "Depth and height",
        body: "In the org chart above, which statement is right?",
        question: {
          type: "choice",
          options: [
            "Node 6 has height 3 and the tree has depth 3.",
            "Node 6 has depth 3, and the tree's height is 3.",
            "Node 0 has depth 3, since it is above 3 levels.",
            "Every leaf has the same depth, 3.",
          ],
          answer: 1,
          feedback: { 0: "Depth belongs to a node (edges from the root); height belongs to a tree or subtree.", 3: "Leaves 3 and 5 have depth 2; only 6 has depth 3." },
          hint: "Depth is measured from the root down to a node. Height is measured from a node down to its deepest leaf.",
        },
        explanation: "**Depth** is a node's distance from the root (6 is at depth 3). **Height** is the distance from a node down to its deepest leaf; the tree's height is the root's height, 3.",
      },
      {
        kind: "question",
        title: "Is it a tree?",
        body: "Five nodes A to E. Which set of edges forms a tree?",
        question: {
          type: "choice",
          options: [
            "A–B, B–C, C–A, D–E",
            "A–B, B–C, C–D, D–E, E–A",
            "A–B, A–C, B–C, D–E",
            "A–B, A–C, C–D, C–E",
          ],
          answer: 3,
          feedback: { 0: "A–B–C–A is a cycle, and D–E is cut off from the rest.", 1: "Five edges on five nodes always makes a cycle.", 2: "A, B, C form a cycle and D–E is a separate piece." },
          hint: "A tree on 5 nodes has exactly 4 edges, no cycle, and everything is connected.",
        },
        explanation: "A–B, A–C, C–D, C–E has 4 edges, reaches every node, and has no cycle: a tree with A at the top. Every other option has a cycle or a disconnected piece.",
      },
      {
        kind: "code",
        title: "How tall is the company?",
        body: P(
          "Write `height(parents)`: the depth of the deepest person, where `parents[i]` is the manager of person `i` and the boss has `-1` (not always at index 0). One person alone gives 0.",
          "Build child lists, then walk down **level by level** with a loop. The last test is a chain of 5,000 people, too deep for plain recursion in Python (the default limit is about 1,000 calls).",
        ),
        language: "python",
        starter: `def height(parents):
    children = [[] for _ in parents]
    root = None
    # 1. fill children and find the root
    # 2. walk down level by level, counting levels
    pass
`,
        solution: `def height(parents):
    children = [[] for _ in parents]
    root = None
    for i, p in enumerate(parents):
        if p == -1:
            root = i
        else:
            children[p].append(i)
    depth, level = -1, [root]
    while level:
        depth += 1
        level = [c for node in level for c in children[node]]
    return depth
`,
        tests: [
          { id: "t1", description: "the org chart", assertionCode: `_r = height([-1, 0, 0, 1, 1, 2, 4])
assert _r == 3, f"expected 3 (0 -> 1 -> 4 -> 6), got {_r}"` },
          { id: "t2", description: "one person, and a root that is not at index 0", assertionCode: `_r = height([-1])
assert _r == 0, f"one person alone has height 0, got {_r}"
_r = height([2, 2, -1, 0])
assert _r == 2, f"the boss is person 2; 2 -> 0 -> 3 gives 2, got {_r}"` },
          { id: "t3", description: "a wide, flat company", assertionCode: `_r = height([-1] + [0] * 999)
assert _r == 1, f"everyone reports to the boss: height 1, got {_r}"` },
          { id: "t4", description: "a chain of 5,000", assertionCode: `_r = height([-1] + list(range(4999)))
assert _r == 4999, f"a chain of 5,000 people has height 4999, got {_r}"` },
        ],
        hints: ["`children[p].append(i)` for every `i` whose parent `p` is not -1; the `i` with -1 is the root.", "Start with `level = [root]`; replace it with all the children of its nodes until it is empty, counting the rounds."],
      },
      {
        kind: "code",
        title: "Team sizes",
        body: P(
          "Write `team_sizes(parents)`: a list where entry `i` is the number of people in person `i`'s team, counting `i` and everyone below them.",
          py(`
team_sizes([-1, 0, 0, 1, 1, 2, 4])   # [7, 4, 2, 1, 2, 1, 1]
`),
          "A loop-only way: list the nodes top-down (level by level), then go through that list **backwards**, adding each node's size to its parent's. A node is always handled before its parent that way.",
        ),
        language: "python",
        starter: `def team_sizes(parents):
    n = len(parents)
    size = [1] * n
    # list the nodes top-down, then walk that order backwards
    pass
`,
        solution: `def team_sizes(parents):
    n = len(parents)
    children = [[] for _ in parents]
    root = None
    for i, p in enumerate(parents):
        if p == -1:
            root = i
        else:
            children[p].append(i)
    order = [root]
    for node in order:
        order.extend(children[node])
    size = [1] * n
    for node in reversed(order):
        if parents[node] != -1:
            size[parents[node]] += size[node]
    return size
`,
        tests: [
          { id: "t1", description: "the org chart", assertionCode: `_r = team_sizes([-1, 0, 0, 1, 1, 2, 4])
assert _r == [7, 4, 2, 1, 2, 1, 1], f"expected [7, 4, 2, 1, 2, 1, 1], got {_r}"` },
          { id: "t2", description: "one person, and the root elsewhere", assertionCode: `_r = team_sizes([-1])
assert _r == [1], f"expected [1], got {_r}"
_r = team_sizes([2, 2, -1, 0])
assert _r == [2, 1, 4, 1], f"expected [2, 1, 4, 1], got {_r}"` },
          { id: "t3", description: "a chain of 5,000", assertionCode: `_r = team_sizes([-1] + list(range(4999)))
assert isinstance(_r, list) and _r[:3] == [5000, 4999, 4998] and _r[-1] == 1, f"in a chain, person i leads 5000 - i people; got {None if _r is None else _r[:3]}..."` },
        ],
        hints: ["Build child lists, then `order = [root]` and `for node in order: order.extend(children[node])` lists everyone top-down.", "Walk `reversed(order)` and add `size[node]` to `size[parents[node]]`."],
      },
      {
        kind: "recap",
        points: [
          "A **tree**: one root, every other node has one parent, no cycles. n nodes, **n − 1 edges**, one path between any two nodes.",
          "**Depth** is a node's distance from the root; **height** is the distance down to the deepest leaf.",
          "A parent list becomes child lists in one O(n) pass; then walk level by level or in a top-down order.",
          "Deep chains break Python recursion (about 1,000 calls): use a loop when depth can be large.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 2. Binary trees ───────────────────────────────
  {
    id: "fnd-iv-trees-2-binary-tree",
    title: "Binary trees and the three walks",
    summary: "Nodes with a left and a right child, level-order lists, and pre-, in- and post-order traversal.",
    minutes: 11,
    xp: 60,
    level: "Beginner",
    steps: [
      {
        kind: "explain",
        title: "Left and right",
        body: P(
          "In a **binary tree** each node has at most two children, called **left** and **right**. In Python a node is a small object:",
          py(`
class Node:
    def __init__(self, val, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right
`),
          "Tests and problem statements usually write a tree as a **level-order list**: row by row, left to right, with `None` for a missing child. `[1, 2, 3, None, 4]` is 1 with children 2 and 3, where 2 has only a right child, 4.",
          "There are three classic **depth-first** walks. They differ only in *when* the node itself is recorded:",
          "- **Pre-order**: node, then left subtree, then right. (Copying a tree, writing it out.)\n- **In-order**: left, node, right. (On a binary search tree this gives sorted order.)\n- **Post-order**: left, right, node. (Children before parents: sizes, heights, deleting.)",
          "Each visits every node once: **O(n)** time, and **O(h)** memory for the call stack, where h is the height.",
          "A **perfect** tree has every level full: with height h it has 2^(h+1) − 1 nodes. A **complete** tree fills every level except possibly the last, which fills from the left (that is how heaps are shaped).",
        ),
      },
      {
        kind: "question",
        title: "Pre-order, step by step",
        body: "Step through a pre-order walk and answer the picks.",
        widget: {
          type: "iv-trace",
          props: {
            title: "Pre-order: node, left, right",
            frames: [
              { tree: { nodes: ABC_TREE, active: ["A"] }, code: PRE_CODE, line: 3, stacks: [{ label: "call stack", items: ["pre(A)"] }], vars: { out: "A" }, note: "Record A, then go left." },
              { tree: { active: ["B"], done: ["A"] }, line: 3, stacks: [{ label: "call stack", items: ["pre(A)", "pre(B)"] }], vars: { out: "A B" }, note: "Record B. Next: B's left subtree.", pick: { prompt: "Which node is recorded next?", answer: "D" } },
              { tree: { active: ["D"], done: ["A", "B"] }, line: 3, stacks: [{ label: "call stack", items: ["pre(A)", "pre(B)", "pre(D)"] }], vars: { out: "A B D" }, note: "D is a leaf: both its calls return at once." },
              { tree: { active: ["E"], done: ["A", "B", "D"] }, line: 5, stacks: [{ label: "call stack", items: ["pre(A)", "pre(B)", "pre(E)"] }], vars: { out: "A B D E" }, note: "Back in B, its right child: E." },
              { tree: { done: ["A", "B", "D", "E"] }, line: 5, stacks: [{ label: "call stack", items: ["pre(A)"] }], vars: { out: "A B D E" }, note: "B's whole subtree is finished; back in A.", pick: { prompt: "Which node is recorded next?", answer: "C" } },
              { tree: { active: ["C"], done: ["A", "B", "D", "E"] }, line: 3, stacks: [{ label: "call stack", items: ["pre(A)", "pre(C)"] }], vars: { out: "A B D E C" }, note: "Record C. Its left child is missing, so straight to the right." },
              { tree: { done: ["A", "B", "C", "D", "E", "F"] }, line: 3, stacks: [{ label: "call stack", items: [] }], vars: { out: "A B D E C F" }, note: "Pre-order: **A B D E C F**. In-order would be D B E A C F, post-order D E B F C A." },
            ],
          },
        },
        question: { type: "widget", goal: { picked: true }, prompt: "Answer both picks.", hint: "Pre-order finishes everything under the left child before it touches the right child." },
        explanation: "The call stack holds the path from the root to the current node, so memory is O(h). Every node is recorded once: O(n).",
      },
      {
        kind: "question",
        title: "In-order",
        body: "Same tree: A has children B (left) and C (right); B has D and E; C has only a right child, F. Put the nodes in **in-order** (left, node, right).",
        question: { type: "order", items: ["D", "B", "E", "A", "C", "F"], hint: "Everything in A's left subtree comes before A, and everything in its right subtree after it." },
        explanation: "In B's subtree: D, B, E. Then A. Then C's subtree: C has no left child, so C, then F. **D B E A C F**.",
      },
      {
        kind: "question",
        title: "Which walk?",
        body: "You want every folder's total size: each folder's own files plus all its subfolders. Which order must the walk visit the nodes in?",
        question: {
          type: "choice",
          options: ["Pre-order: a folder before its subfolders", "In-order: left subfolder, folder, right", "Post-order: subfolders before the folder", "Any order gives the same totals"],
          answer: 2,
          feedback: { 0: "When you reach a folder first, its subfolders' totals are not known yet.", 3: "A parent's total needs its children's totals first." },
          hint: "A folder's total depends on its children's totals. Which order has those ready?",
        },
        explanation: "**Post-order** finishes all children before their parent, so their totals are ready. Most *compute something about each subtree* questions are post-order.",
      },
      {
        kind: "question",
        title: "A full tree",
        body: "A **perfect** binary tree has every level completely full. If its height is 3 (four levels), how many nodes does it have?",
        question: { type: "number", answer: 15, hint: "Levels hold 1, 2, 4, 8 … nodes.", unit: "nodes" },
        explanation: "1 + 2 + 4 + 8 = **15** = 2⁴ − 1. The last level holds about half of all the nodes, which matters for breadth-first search's memory.",
      },
      {
        kind: "code",
        title: "All three walks",
        body: P(
          "Write `walks(root)`: return a tuple of three lists of values, `(pre, ino, post)`, for the pre-, in- and post-order walks.",
          TREE_HELP,
        ),
        language: "python",
        setup: TREE_SETUP,
        starter: `def walks(root):
    pre, ino, post = [], [], []

    def visit(node):
        # record node.val in pre, ino and post at the right moments
        pass

    visit(root)
    return pre, ino, post
`,
        solution: `def walks(root):
    pre, ino, post = [], [], []

    def visit(node):
        if node is None:
            return
        pre.append(node.val)
        visit(node.left)
        ino.append(node.val)
        visit(node.right)
        post.append(node.val)

    visit(root)
    return pre, ino, post
`,
        tests: [
          { id: "t1", description: "the traced tree", assertionCode: `_r = walks(build(["A", "B", "C", "D", "E", None, "F"]))
assert _r == (list("ABDECF"), list("DBEACF"), list("DEBFCA")), f"expected pre ABDECF, in DBEACF, post DEBFCA; got {_r}"` },
          { id: "t2", description: "a lopsided tree, and an empty one", assertionCode: `_r = walks(build([1, None, 2, 3]))
assert _r == ([1, 2, 3], [1, 3, 2], [3, 2, 1]), f"1 has only a right child 2, which has a left child 3; got {_r}"
_r = walks(None)
assert _r == ([], [], []), f"an empty tree gives three empty lists, got {_r}"` },
          { id: "t3", description: "a single node", assertionCode: `_r = walks(build([7]))
assert _r == ([7], [7], [7]), f"one node gives [7] three times, got {_r}"` },
        ],
        hints: ["Return straight away when `node is None`.", "`pre.append` before both calls, `ino.append` between them, `post.append` after them."],
      },
      {
        kind: "code",
        title: "The view in the mirror",
        body: P(
          "Write `mirror(root)`: swap the left and right child of **every** node, in place, and return the root.",
          py(`
to_list(mirror(build([1, 2, 3, 4, 5, None, 6])))   # [1, 3, 2, 6, None, 5, 4]
`),
          TREE_HELP,
        ),
        language: "python",
        setup: TREE_SETUP,
        starter: `def mirror(root):
    # swap the children, then mirror each subtree
    return root
`,
        solution: `def mirror(root):
    if root is None:
        return None
    root.left, root.right = mirror(root.right), mirror(root.left)
    return root
`,
        tests: [
          { id: "t1", description: "the example", assertionCode: `_r = to_list(mirror(build([1, 2, 3, 4, 5, None, 6])))
assert _r == [1, 3, 2, 6, None, 5, 4], f"expected [1, 3, 2, 6, None, 5, 4], got {_r}"` },
          { id: "t2", description: "every level, not just the root", assertionCode: `_r = to_list(mirror(build([1, 2, None, 3, None, 4])))
assert _r == [1, None, 2, None, 3, None, 4], f"a chain of left children becomes a chain of right children; got {_r}"` },
          { id: "t3", description: "empty and single trees", assertionCode: `_r = mirror(None)
assert _r is None, f"mirror(None) should be None, got {_r}"
_r = to_list(mirror(build([1, 2])))
assert _r == [1, None, 2], f"expected [1, None, 2], got {_r}"` },
        ],
        hints: ["An empty tree is its own mirror: return None.", "`root.left, root.right = mirror(root.right), mirror(root.left)` does the swap and the recursion at once."],
      },
      {
        kind: "recap",
        points: [
          "A **binary tree** node has a `left` and a `right` child; tests write trees as **level-order lists** with `None` gaps.",
          "**Pre-order** (node, left, right), **in-order** (left, node, right), **post-order** (left, right, node): O(n) time, O(h) stack.",
          "Post-order is the walk for *compute something from the children*; in-order gives a BST's sorted order.",
          "A **perfect** tree of height h has 2^(h+1) − 1 nodes; about half are on the last level.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 3. Recursion ───────────────────────────────
  {
    id: "fnd-iv-trees-3-recursion",
    title: "Recursion on trees",
    summary: "A base case, trust the calls, combine on the way up; return two things at once; a global best.",
    minutes: 12,
    xp: 70,
    level: "Intermediate",
    steps: [
      {
        kind: "explain",
        title: "A tree is a node and two smaller trees",
        body: P(
          "Almost every binary-tree question has the same recursive shape. A tree is either empty, or a node with a left tree and a right tree. So write the answer for the empty tree (the **base case**), then **trust** that the call on each child already returns the right answer for that child, and **combine**.",
          py(`
def height(node):            # number of nodes on the longest path down
    if node is None:
        return 0             # base case
    return 1 + max(height(node.left), height(node.right))
`),
          "Each node is handled once: **O(n)** time. The call stack holds one frame per level: **O(h)** memory, log n for a balanced tree but n for a chain. Python stops at about 1,000 nested calls.",
          "Three patterns cover most questions:",
          "- **Return a value up**: height, size, sum, *is it a mirror?*.\n- **Return two things up**: *(height, balanced?)*, so one walk does both jobs instead of recomputing heights.\n- **A global best**: each call returns what its parent needs (a height) but also updates a best answer that may not pass through the root (the longest path).",
          "**How to spot it:** any question about *every subtree*, *the whole tree*, *max/min/sum over a tree*, *balanced*, *same tree*, *longest path*.",
        ),
      },
      {
        kind: "question",
        title: "Who returns first?",
        body: "Step through `height` and answer the picks. Calls on missing children return 0 at once and are not shown.",
        widget: {
          type: "iv-trace",
          props: {
            title: "height(A), post-order",
            frames: [
              { tree: { nodes: HEIGHT_TREE, active: ["A"] }, code: HEIGHT_CODE, line: 3, stacks: [{ label: "call stack", items: ["height(A)"] }], vars: {}, note: "A needs both children's heights before it can answer." },
              { tree: { active: ["B"] }, line: 3, stacks: [{ label: "call stack", items: ["height(A)", "height(B)"] }], note: "B asks its left child first.", pick: { prompt: "Which call returns a number first?", answer: "D" } },
              { tree: { active: ["D"] }, line: 5, stacks: [{ label: "call stack", items: ["height(A)", "height(B)", "height(D)"] }], vars: { D: 1 }, note: "D's children are missing (0 and 0), so D returns `1 + 0 = 1`." },
              { tree: { active: ["E"], done: ["D", "G"] }, line: 5, stacks: [{ label: "call stack", items: ["height(A)", "height(B)", "height(E)"] }], vars: { D: 1, G: 1, E: 2 }, note: "E calls G (a leaf, 1) and its empty right side (0): E returns 2." },
              { tree: { done: ["D", "E", "G"] }, line: 5, stacks: [{ label: "call stack", items: ["height(A)", "height(B)"] }], note: "E has returned.", pick: { prompt: "Which call finishes next?", answer: "B" } },
              { tree: { active: ["B"], done: ["D", "E", "G"] }, line: 5, vars: { D: 1, G: 1, E: 2, B: 3 }, note: "B: `1 + max(1, 2) = 3`." },
              { tree: { active: ["C"], done: ["B", "D", "E", "F", "G"] }, line: 5, stacks: [{ label: "call stack", items: ["height(A)", "height(C)"] }], vars: { D: 1, G: 1, E: 2, B: 3, F: 1, C: 2 }, note: "On the right, F returns 1, so C returns 2." },
              { tree: { done: ["A", "B", "C", "D", "E", "F", "G"] }, line: 5, stacks: [{ label: "call stack", items: [] }], vars: { D: 1, G: 1, E: 2, B: 3, F: 1, C: 2, A: 4 }, note: "A: `1 + max(3, 2) =` **4**. Every node returned exactly once." },
            ],
          },
        },
        question: { type: "widget", goal: { picked: true }, prompt: "Answer both picks.", hint: "A call can only return after both of its children's calls have returned." },
        explanation: "The answers come back **bottom-up** (post-order): leaves first, the root last. The deepest the stack got was 4 calls: the height.",
      },
      {
        kind: "question",
        title: "How deep is the stack?",
        body: "A perfect binary tree has 1,023 nodes (10 full levels). Running `height` on it, about how many **node** calls are on the call stack at the deepest moment?",
        question: { type: "number", answer: 10, tolerance: 1, hint: "The stack holds one call per level on the path from the root to the current node.", unit: "calls" },
        explanation: "One frame per level: **10** (11 counting the call on an empty child). Memory is O(h) = O(log n) here, but a 1,023-node chain would need 1,023 frames and hit Python's limit.",
      },
      {
        kind: "question",
        title: "The slow balance check",
        body: "A tree is **balanced** if at every node the two subtree heights differ by at most 1. A first try calls `height(node.left)` and `height(node.right)` at every node, then recurses into both children. What does that cost on a long, thin tree (almost a chain)?",
        question: {
          type: "choice",
          options: ["O(n²): heights are recomputed at every level", "O(n): every node is visited once", "O(log n): the tree is halved each time", "O(n log n): like merge sort"],
          answer: 0,
          hint: "On a chain, `height` at the top walks n nodes, the next walks n − 1, and so on.",
        },
        explanation: "On a chain the height calls cost n + (n − 1) + … = **O(n²)**. Returning *(height, balanced)* together, or −1 for *not balanced*, does it in one O(n) walk.",
      },
      {
        kind: "question",
        title: "The longest path",
        body: "The **diameter** of a tree is the number of edges on the longest path between any two nodes. Why can't you just add the left and right heights at the root?",
        question: {
          type: "choice",
          options: [
            "Because heights count nodes, not edges.",
            "Because the root is always part of the path.",
            "The longest path may not pass through the root.",
            "Because the diameter is always an even number.",
          ],
          answer: 2,
          feedback: { 0: "That is an off-by-something detail; the real problem is where the path is." },
          hint: "Picture a root with one huge, bushy left subtree and no right child.",
        },
        explanation: "The longest path can bend at any node, deep inside one subtree. So every call computes `left + right` for its own node, updates a **global best**, and returns its height to its parent.",
      },
      {
        kind: "code",
        title: "Is it balanced?",
        body: P(
          "Write `is_balanced(root)`: True if at **every** node the heights of the left and right subtrees differ by at most 1. An empty tree is balanced. Do it in one walk: return a height, or `-1` to mean *not balanced*.",
          TREE_HELP,
        ),
        language: "python",
        setup: TREE_SETUP,
        starter: `def is_balanced(root):
    def check(node):
        # return the height of node, or -1 if any subtree is unbalanced
        pass

    return check(root) != -1
`,
        solution: `def is_balanced(root):
    def check(node):
        if node is None:
            return 0
        left = check(node.left)
        if left == -1:
            return -1
        right = check(node.right)
        if right == -1 or abs(left - right) > 1:
            return -1
        return 1 + max(left, right)

    return check(root) != -1
`,
        tests: [
          { id: "t1", description: "a balanced tree and a lopsided one", assertionCode: `_r = is_balanced(build([1, 2, 3, 4, 5, None, 6]))
assert _r is True, f"expected True, got {_r}"
_r = is_balanced(build([1, 2, 3, 4, 5, None, None, 6]))
assert _r is False, f"the left side is 3 deep and the right side 1: expected False, got {_r}"` },
          { id: "t2", description: "unbalanced deep inside, though the root looks fine", assertionCode: `_r = is_balanced(build([1, 2, 3, 4, None, None, 5, 6, None, None, 7]))
assert _r is False, f"node 2 has a left height of 2 and a right height of 0, so expected False; got {_r}. Check every node, not just the root"` },
          { id: "t3", description: "short chains are not balanced", assertionCode: `_r = is_balanced(build([1, 2, None, 3]))
assert _r is False, f"a chain of three left children: expected False, got {_r}"
_r = is_balanced(build([1, None, 2, None, 3]))
assert _r is False, f"a chain of three right children: expected False, got {_r}"` },
          { id: "t4", description: "small trees", assertionCode: `_r = is_balanced(build([1, 2, None, None, 3]))
assert _r is False, f"node 2 has a right child but 1 has no right child at all: expected False, got {_r}"
_r = is_balanced(None)
assert _r is True, f"an empty tree is balanced, got {_r}"
_r = is_balanced(build([1, 2]))
assert _r is True, f"heights 1 and 0 differ by 1: balanced, got {_r}"` },
        ],
        hints: ["`check(None)` is 0. If either child's check is -1, return -1.", "If `abs(left - right) > 1` return -1, otherwise `1 + max(left, right)`."],
      },
      {
        kind: "code",
        title: "The longest cable run",
        body: P(
          "Rooms in a building are wired as a binary tree. Write `longest_cable(root)`: the number of edges on the longest path between any two rooms. An empty tree or one room gives 0.",
          "Keep a best answer outside the helper. The helper returns a node's height; at each node, the path that bends there is `left height + right height` edges.",
          TREE_HELP,
        ),
        language: "python",
        setup: TREE_SETUP,
        starter: `def longest_cable(root):
    best = 0

    def depth(node):
        nonlocal best
        # return the height of node in nodes; update best with left + right
        pass

    depth(root)
    return best
`,
        solution: `def longest_cable(root):
    best = 0

    def depth(node):
        nonlocal best
        if node is None:
            return 0
        left = depth(node.left)
        right = depth(node.right)
        best = max(best, left + right)
        return 1 + max(left, right)

    depth(root)
    return best
`,
        tests: [
          { id: "t1", description: "a small tree", assertionCode: `_r = longest_cable(build([1, 2, 3, 4, 5]))
assert _r == 3, f"4 -> 2 -> 1 -> 3 has 3 edges, got {_r}"` },
          { id: "t2", description: "the longest path avoids the root", assertionCode: `_r = longest_cable(build([1, 2, None, 3, 4, 5, None, None, 6, 7, None, None, 8]))
assert _r == 6, f"7 -> 5 -> 3 -> 2 -> 4 -> 6 -> 8 has 6 edges and skips the root; got {_r}"` },
          { id: "t3", description: "a chain", assertionCode: `_r = longest_cable(build([1, 2, None, 3, None, 4]))
assert _r == 3, f"a chain of 4 rooms has 3 edges, got {_r}"` },
          { id: "t4", description: "one room, and none", assertionCode: `_r = longest_cable(build([1, 2]))
assert _r == 1, f"two rooms have one cable between them, got {_r}"
_r = longest_cable(None)
assert _r == 0, f"no rooms gives 0, got {_r}"` },
        ],
        hints: ["`depth(None)` is 0; otherwise get `left` and `right`, update `best = max(best, left + right)`.", "Return `1 + max(left, right)` so the parent gets this node's height."],
      },
      {
        kind: "recap",
        points: [
          "Tree recursion: **base case** for `None`, **trust** the calls on the children, **combine**. O(n) time, O(h) stack.",
          "Answers come back bottom-up (post-order).",
          "Return two things at once (a height, or −1 for *unbalanced*) to avoid an O(n²) recompute.",
          "When the best answer can sit anywhere, keep a **global best** and return what the parent needs.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 4. Depth-first search ───────────────────────────────
  {
    id: "fnd-iv-trees-4-dfs",
    title: "Depth-first search: paths and ancestors",
    summary: "Go deep first with a stack, carry state down a path, backtrack, and find the lowest common ancestor.",
    minutes: 12,
    xp: 70,
    level: "Intermediate",
    steps: [
      {
        kind: "explain",
        title: "Down one branch to the end",
        body: P(
          "**Depth-first search** (DFS) follows one branch all the way down before trying the next. The three walks from the binary-trees lesson are all DFS. You can write it with recursion, or with your own **stack** when the tree may be deep:",
          py(`
stack = [root]
while stack:
    node = stack.pop()
    visit(node)
    if node.right: stack.append(node.right)   # pushed first, popped last
    if node.left: stack.append(node.left)
`),
          "Many path questions **carry state down**: the running sum so far, or the path itself. With a shared `path` list you **append** before going down and **pop** after coming back up. That undo step is called **backtracking**.",
          "The other big pattern **sends answers up**: *is the value I want somewhere below me?* The **lowest common ancestor** (LCA) of two nodes is the deepest node that has both below it (a node counts as below itself). A node where one target is found on the left and the other on the right is exactly that node.",
          "Time is **O(n)**; memory O(h) for the stack. Collecting every root-to-leaf path costs more, up to O(n · h) for the output itself.",
          "**How to spot it:** *root-to-leaf*, *path with total*, *ancestor*, *does any path …*, *all paths*, *subtree contains*.",
        ),
      },
      {
        kind: "question",
        title: "A stack instead of recursion",
        body: "Step through the stack version on a full tree of seven nodes. At each stop, tap the node that is popped next.",
        widget: {
          type: "iv-trace",
          props: {
            title: "DFS with an explicit stack",
            frames: [
              { tree: { nodes: FULL7, active: ["A"] }, code: STACK_CODE, line: 3, stacks: [{ label: "stack", items: ["A"] }], vars: { visited: "" }, note: "Start with the root on the stack." },
              { tree: { done: ["A"] }, line: 6, stacks: [{ label: "stack", items: ["C", "B"] }], vars: { visited: "A" }, note: "Pop A, visit it, push C then B. B is on top.", pick: { prompt: "Which node is popped next?", answer: "B" } },
              { tree: { active: ["B"], done: ["A"] }, line: 6, stacks: [{ label: "stack", items: ["C", "E", "D"] }], vars: { visited: "A B" }, note: "Pop B, push E then D." },
              { tree: { done: ["A", "B"] }, line: 3, note: "The stack is C, E, D (D on top).", pick: { prompt: "And next?", answer: "D" } },
              { tree: { active: ["E"], done: ["A", "B", "D"] }, line: 4, stacks: [{ label: "stack", items: ["C"] }], vars: { visited: "A B D E" }, note: "D and E are leaves, popped one after the other." },
              { tree: { done: ["A", "B", "D", "E"] }, line: 3, note: "Only C is left.", pick: { prompt: "Which node is visited right after C?", answer: "F" } },
              { tree: { done: ["A", "B", "C", "D", "E", "F", "G"] }, line: 4, stacks: [{ label: "stack", items: [] }], vars: { visited: "A B D E C F G" }, note: "C pushes G then F; F pops first. Order: **A B D E C F G**, the same as recursive pre-order." },
            ],
          },
        },
        question: { type: "widget", goal: { picked: true }, prompt: "Answer the three picks.", hint: "A stack is last in, first out: the child pushed last is popped first." },
        explanation: "The stack plays the role of the call stack. It never holds more than about one node per level plus their waiting siblings, so memory stays O(h).",
      },
      {
        kind: "question",
        title: "Why push the right child first?",
        body: "In the stack version, why is `node.right` pushed before `node.left`?",
        question: {
          type: "choice",
          options: [
            "Right children are always bigger, so they go first.",
            "So the left child is on top and is popped first.",
            "To stop the stack from growing too large.",
            "It does not matter; either way gives pre-order.",
          ],
          answer: 1,
          feedback: { 3: "Swap them and you get node, right, left: a mirrored pre-order." },
          hint: "Which of two pushed items comes off a stack first?",
        },
        explanation: "The last item pushed is the first popped. Pushing right then left puts the **left** child on top, so the walk goes node, left subtree, right subtree: pre-order.",
      },
      {
        kind: "question",
        title: "Paths that add up",
        body: P(
          "How many **root-to-leaf** paths in this tree add up to exactly **12**?",
          txt(`
        5
      /   \\
     3     6
    / \\   /
   4   2 1
`),
        ),
        question: { type: "number", answer: 2, hint: "There are three leaves; add up the values from the root to each one.", unit: "paths" },
        explanation: "5 + 3 + 4 = 12, 5 + 3 + 2 = 10, 5 + 6 + 1 = 12: **2** paths. A path must end at a **leaf**, so 5 + 6 = 11 does not count as a path at all.",
      },
      {
        kind: "question",
        title: "The lowest common ancestor",
        body: "In the full tree A (children B, C), B (children D, E), C (children F, G), what is the lowest common ancestor of **D** and **B**?",
        question: {
          type: "choice",
          options: ["A, the root", "D", "E, D's sibling", "B"],
          answer: 3,
          feedback: { 0: "A is a common ancestor, but not the lowest one." },
          hint: "A node counts as an ancestor of itself.",
        },
        explanation: "D is below B, and B is below itself, so the deepest node above both is **B**. The recursive check returns B as soon as it reaches it, without looking further down.",
      },
      {
        kind: "code",
        title: "Trails with a given length",
        body: P(
          "Each node of a trail map holds a distance. Write `paths_with_total(root, target)`: every **root-to-leaf** path whose values add up to `target`, as lists of values, left paths before right paths.",
          "Values can be negative, so do not stop early when a sum passes the target. Use one shared `path` list: append on the way down, pop on the way back.",
          TREE_HELP,
        ),
        language: "python",
        setup: TREE_SETUP,
        starter: `def paths_with_total(root, target):
    out, path = [], []

    def dfs(node, remaining):
        # append node.val, record a copy at a leaf with remaining == 0, recurse, pop
        pass

    dfs(root, target)
    return out
`,
        solution: `def paths_with_total(root, target):
    out, path = [], []

    def dfs(node, remaining):
        if node is None:
            return
        path.append(node.val)
        remaining -= node.val
        if node.left is None and node.right is None and remaining == 0:
            out.append(list(path))
        dfs(node.left, remaining)
        dfs(node.right, remaining)
        path.pop()

    dfs(root, target)
    return out
`,
        tests: [
          { id: "t1", description: "the pictured tree", assertionCode: `_r = paths_with_total(build([5, 3, 6, 4, 2, 1]), 12)
assert _r == [[5, 3, 4], [5, 6, 1]], f"expected [[5, 3, 4], [5, 6, 1]], got {_r}"` },
          { id: "t2", description: "negative values", assertionCode: `_r = paths_with_total(build([1, -2, 3, 4, None, -1, 5]), 3)
assert _r == [[1, -2, 4], [1, 3, -1]], f"expected [[1, -2, 4], [1, 3, -1]], got {_r}: do not stop when the sum goes past the target"` },
          { id: "t3", description: "a path must end at a leaf", assertionCode: `_r = paths_with_total(build([2, 3, None, 4]), 5)
assert _r == [], f"2 + 3 = 5, but 3 is not a leaf; expected [], got {_r}"
_r = paths_with_total(build([2, 3, None, 4]), 9)
assert _r == [[2, 3, 4]], f"expected [[2, 3, 4]], got {_r}"` },
          { id: "t4", description: "empty and single trees", assertionCode: `_r = paths_with_total(build([7]), 7)
assert _r == [[7]], f"expected [[7]], got {_r}"
_r = paths_with_total(None, 0)
assert _r == [], f"an empty tree has no paths, got {_r}"` },
        ],
        hints: ["At a leaf (no left, no right) with `remaining == 0`, append `list(path)`: a copy, since `path` keeps changing.", "Call `dfs` on both children with the new `remaining`, then `path.pop()` to undo your append."],
      },
      {
        kind: "code",
        title: "The shared ancestor",
        body: P(
          "Write `lowest_common_ancestor(root, a, b)`: the **value** of the deepest node that has both `a` and `b` below it (or is one of them). All values are distinct and both are in the tree. The tree is *not* a search tree, so look in both subtrees.",
          TREE_HELP,
        ),
        language: "python",
        setup: TREE_SETUP,
        starter: `def lowest_common_ancestor(root, a, b):
    def find(node):
        # return the node if it is a or b, or the LCA found below, or None
        pass

    found = find(root)
    return found.val if found else None
`,
        solution: `def lowest_common_ancestor(root, a, b):
    def find(node):
        if node is None or node.val in (a, b):
            return node
        left = find(node.left)
        right = find(node.right)
        if left and right:
            return node
        return left or right

    found = find(root)
    return found.val if found else None
`,
        tests: [
          { id: "t1", description: "in different subtrees", assertionCode: `_t = build([8, 3, 9, 6, 1, 7, 2, None, None, 4, 5])
_r = lowest_common_ancestor(_t, 4, 5)
assert _r == 1, f"4 and 5 are both children of 1, got {_r}"
_r = lowest_common_ancestor(_t, 5, 7)
assert _r == 8, f"5 is on the left of the root and 7 on the right, so expected 8, got {_r}"` },
          { id: "t2", description: "one is an ancestor of the other", assertionCode: `_t = build([8, 3, 9, 6, 1, 7, 2, None, None, 4, 5])
_r = lowest_common_ancestor(_t, 1, 4)
assert _r == 1, f"1 is above 4, so the answer is 1 itself; got {_r}"
_r = lowest_common_ancestor(_t, 8, 2)
assert _r == 8, f"expected 8, got {_r}"` },
          { id: "t3", description: "deeper in one branch", assertionCode: `_t = build([8, 3, 9, 6, 1, 7, 2, None, None, 4, 5])
_r = lowest_common_ancestor(_t, 6, 4)
assert _r == 3, f"6 and 4 meet at 3, got {_r}"` },
        ],
        hints: ["If the node is `None` or is `a` or `b`, return it.", "Search both children. If both answers are not None, this node is the LCA; otherwise pass up whichever one is not None."],
      },
      {
        kind: "recap",
        points: [
          "**DFS** goes deep first: recursion, or a stack where you push the right child before the left.",
          "Carry state **down** (a running sum, a path) and **backtrack** by popping what you appended.",
          "Send answers **up**: the LCA is the node where both targets are found on different sides, or a target itself.",
          "Spot it: *root-to-leaf*, *path sum*, *ancestor*, *all paths*. Pitfalls: stopping early with negative values, forgetting to copy the path.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 5. Breadth-first search ───────────────────────────────
  {
    id: "fnd-iv-trees-5-bfs",
    title: "Breadth-first search: level by level",
    summary: "A queue, one level per round, and the questions that are about rows: level lists, side views, nearest leaf.",
    minutes: 11,
    xp: 70,
    level: "Intermediate",
    steps: [
      {
        kind: "explain",
        title: "One row at a time",
        body: P(
          "**Breadth-first search** (BFS) visits the tree row by row: the root, then all nodes at depth 1, then depth 2. It uses a **queue**: take a node from the front, add its children to the back. (Graphs work the same way; see *Data structures and algorithms*.)",
          "To know where each level ends, read the queue's length at the start of a round and take exactly that many nodes:",
          py(`
from collections import deque
queue, levels = deque([root]), []
while queue:
    level = []
    for _ in range(len(queue)):      # just this level
        node = queue.popleft()
        level.append(node.val)
        if node.left: queue.append(node.left)
        if node.right: queue.append(node.right)
    levels.append(level)
`),
          "Use `collections.deque`: `popleft()` is O(1), while `list.pop(0)` shifts every item and is O(n). BFS is **O(n)** time; memory is the widest level, up to about n/2 for a full tree.",
          "**How to spot it:** *level*, *row by row*, *seen from the side*, *zigzag*, *closest*, *minimum depth*, *fewest steps*. BFS finds the **shallowest** answer first, so it can stop early.",
        ),
      },
      {
        kind: "question",
        title: "The queue at work",
        body: "Step through BFS and answer the picks.",
        widget: {
          type: "iv-trace",
          props: {
            title: "Level order with a queue",
            frames: [
              { tree: { nodes: BFS_TREE, active: ["1"] }, code: LEVEL_CODE, line: 1, stacks: [{ label: "queue", items: [1], kind: "queue" }], vars: { levels: "" }, note: "The queue starts with the root." },
              { tree: { done: ["1"] }, line: 8, stacks: [{ label: "queue", items: [2, 3], kind: "queue" }], vars: { levels: "[1]" }, note: "Level 0 is just 1. Its children 2 and 3 wait in the queue.", pick: { prompt: "Which node leaves the queue next?", answer: "2" } },
              { tree: { active: ["2"], done: ["1"] }, line: 7, stacks: [{ label: "queue", items: [3, 4, 5], kind: "queue" }], note: "2 leaves; 4 and 5 join the back. 3 is still ahead of them." },
              { tree: { active: ["3"], done: ["1", "2"] }, line: 8, stacks: [{ label: "queue", items: [4, 5, 6], kind: "queue" }], vars: { levels: "[1] [2, 3]" }, note: "3 leaves and adds 6. Level 1 is done: [2, 3]." },
              { tree: { done: ["1", "2", "3"] }, line: 4, note: "Level 2 is whatever is in the queue now.", pick: { prompt: "Which node is the last one of level 2?", answer: "6" } },
              { tree: { active: ["4", "5", "6"], done: ["1", "2", "3"] }, line: 8, stacks: [{ label: "queue", items: [7], kind: "queue" }], vars: { levels: "[1] [2, 3] [4, 5, 6]" }, note: "Three nodes leave; only 6 has a child, 7." },
              { tree: { done: ["1", "2", "3", "4", "5", "6", "7"] }, line: 8, stacks: [{ label: "queue", items: [], kind: "queue" }], vars: { levels: "[1] [2, 3] [4, 5, 6] [7]" }, note: "Done. The last node of each level is what you see from the right: **1, 3, 6, 7**." },
            ],
          },
        },
        question: { type: "widget", goal: { picked: true }, prompt: "Answer both picks.", hint: "A queue is first in, first out, and each round takes exactly the nodes that were in the queue when it began." },
        explanation: "Reading `len(queue)` at the start of a round splits the stream of nodes into levels. The view from the right is the last node of each level.",
      },
      {
        kind: "question",
        title: "The nearest leaf",
        body: "You want the depth of the **shallowest** leaf in a huge tree whose left side is a million levels deep and whose right child is a leaf. Which search is better, and why?",
        question: {
          type: "choice",
          options: [
            "BFS: it stops at the first leaf it meets.",
            "DFS: it is always faster than BFS.",
            "DFS: it uses less memory, so it is quicker.",
            "Either: both must visit every node anyway.",
          ],
          answer: 0,
          feedback: { 3: "BFS can stop the moment it sees a leaf, since every later node is at least as deep." },
          hint: "Which search reaches all depth-1 nodes before any depth-2 node?",
        },
        explanation: "BFS sees depth 1 before anything deeper, so it finds the right-hand leaf after a couple of steps and stops. DFS, going left first, could walk a million levels before coming back.",
      },
      {
        kind: "question",
        title: "How full can the queue get?",
        body: "BFS takes one node out at a time and adds its children. On a perfect tree of **15** nodes (four levels), find the largest number of nodes in the queue at any moment.",
        question: { type: "number", answer: 8, hint: "Look at the moment the last node of the third level has just been taken out and its children added.", unit: "nodes" },
        explanation: "When the last of the 4 third-level nodes leaves, all **8** leaves are waiting. In a full tree the last level is about half of all nodes, so BFS memory is O(n) in the worst case, while DFS needs only O(h).",
      },
      {
        kind: "question",
        title: "The right queue",
        body: "Why use `collections.deque` instead of a list with `pop(0)` for the queue?",
        question: {
          type: "choice",
          options: [
            "A list cannot hold tree nodes at all.",
            "`pop(0)` removes from the wrong end.",
            "`popleft()` is O(1); `pop(0)` is O(n).",
            "A deque keeps the nodes in sorted order.",
          ],
          answer: 2,
          hint: "What has to happen to every other item in a list when the first one is removed?",
        },
        explanation: "Removing a list's first item shifts all the others left: O(n) each time, O(n²) over a whole BFS. A deque removes from either end in **O(1)**.",
      },
      {
        kind: "code",
        title: "Row by row",
        body: P(
          "Write `levels(root)`: a list of lists, one per depth, values left to right. An empty tree gives `[]`.",
          TREE_HELP,
        ),
        language: "python",
        setup: TREE_SETUP,
        starter: `from collections import deque

def levels(root):
    # take len(queue) nodes per round
    pass
`,
        solution: `from collections import deque

def levels(root):
    if root is None:
        return []
    out, queue = [], deque([root])
    while queue:
        row = []
        for _ in range(len(queue)):
            node = queue.popleft()
            row.append(node.val)
            if node.left:
                queue.append(node.left)
            if node.right:
                queue.append(node.right)
        out.append(row)
    return out
`,
        tests: [
          { id: "t1", description: "the traced tree", assertionCode: `_r = levels(build([1, 2, 3, 4, 5, None, 6, None, None, None, None, 7]))
assert _r == [[1], [2, 3], [4, 5, 6], [7]], f"expected [[1], [2, 3], [4, 5, 6], [7]], got {_r}"` },
          { id: "t2", description: "empty and single trees", assertionCode: `_r = levels(None)
assert _r == [], f"expected [], got {_r}"
_r = levels(build([9]))
assert _r == [[9]], f"expected [[9]], got {_r}"` },
          { id: "t3", description: "gaps in the middle of a row", assertionCode: `_r = levels(build([1, 2, 3, None, 4, 5]))
assert _r == [[1], [2, 3], [4, 5]], f"expected [[1], [2, 3], [4, 5]], got {_r}"` },
        ],
        hints: ["Start with `deque([root])` (unless the root is None).", "Each round: `for _ in range(len(queue))`, pop from the left, record the value, push the children."],
      },
      {
        kind: "code",
        title: "The view from the right",
        body: P(
          "Standing to the right of the tree you see one node per level: the rightmost one. Write `right_view(root)`: those values from top to bottom. A deeper left branch still shows when nothing on its right is as deep.",
          TREE_HELP,
        ),
        language: "python",
        setup: TREE_SETUP,
        starter: `from collections import deque

def right_view(root):
    # BFS by levels; keep the last value of each level
    pass
`,
        solution: `from collections import deque

def right_view(root):
    if root is None:
        return []
    out, queue = [], deque([root])
    while queue:
        for i in range(len(queue)):
            node = queue.popleft()
            if node.left:
                queue.append(node.left)
            if node.right:
                queue.append(node.right)
        out.append(node.val)
    return out
`,
        tests: [
          { id: "t1", description: "the traced tree", assertionCode: `_r = right_view(build([1, 2, 3, 4, 5, None, 6, None, None, None, None, 7]))
assert _r == [1, 3, 6, 7], f"expected [1, 3, 6, 7], got {_r}"` },
          { id: "t2", description: "a deeper left branch shows through", assertionCode: `_r = right_view(build([1, 2, 3, 4]))
assert _r == [1, 3, 4], f"nothing on the right is at depth 2, so 4 shows; expected [1, 3, 4], got {_r}"` },
          { id: "t3", description: "empty, single, and a left chain", assertionCode: `_r = right_view(None)
assert _r == [], f"expected [], got {_r}"
_r = right_view(build([1, 2, None, 3]))
assert _r == [1, 2, 3], f"expected [1, 2, 3], got {_r}"` },
        ],
        hints: ["Do the level-by-level BFS from the previous step.", "After each round, the last node you popped is the rightmost of that level."],
      },
      {
        kind: "recap",
        points: [
          "**BFS** visits row by row with a queue; reading `len(queue)` at the start of a round gives you one level.",
          "Use `deque.popleft()` (O(1)), never `list.pop(0)` (O(n)).",
          "BFS finds the **shallowest** answer first and can stop early; its memory is the widest level, up to n/2.",
          "Spot it: *level*, *row*, *side view*, *zigzag*, *closest*, *minimum depth*.",
        ],
      },
    ],
  },
];
