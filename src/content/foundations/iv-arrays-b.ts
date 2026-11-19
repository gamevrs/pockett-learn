import type { ConceptLesson } from "../../learn/types.ts";

/** Fenced Python block for lesson prose. */
const py = (code: string) => "~~~python\n" + code.trim() + "\n~~~";
/** Fenced plain-text block (diagrams, tables). */
const txt = (code: string) => "~~~text\n" + code.replace(/^\n+|\s+$/g, "") + "\n~~~";

const SQUARES_CODE = ["a = 0", "while 2 * a * a <= n:", "    b = isqrt(n - a * a)", "    if b * b == n - a * a: found.append((a, b))", "    a += 1"];

const ROBOT_CODE = ["DIRS = [(0, 1), (1, 0), (0, -1), (-1, 0)]  # N E S W", "for c in commands:", "    if c == 'F': x, y = x + DIRS[d][0], y + DIRS[d][1]", "    elif c == 'R': d = (d + 1) % 4", "    elif c == 'L': d = (d - 1) % 4"];
const FIELD = [
  ["·", "·", "·", "·"],
  ["·", "·", "·", "·"],
  ["·", "·", "·", "·"],
  ["·", "·", "·", "·"],
];

const SPIRAL = [
  [1, 2, 3, 4],
  [5, 6, 7, 8],
  [9, 10, 11, 12],
];
const SPIRAL_CODE = ["top, bottom, left, right = 0, rows - 1, 0, cols - 1", "while top <= bottom and left <= right:", "    walk top row left→right;    top += 1", "    walk right column down;     right -= 1", "    if top <= bottom: walk bottom row right→left; bottom -= 1", "    if left <= right: walk left column up;        left += 1"];
type Tone = "active" | "done" | "path" | "wall";
const at = (cells: [number, number][], tone: Tone) => cells.map(([r, c]) => ({ r, c, tone }));

const PREFIX_CODE = ["count = {0: 1}", "p = total = 0", "for x in nums:", "    p += x", "    total += count.get(p - k, 0)", "    count[p] = count.get(p, 0) + 1"];
const KNUMS = [1, 2, -1, 2, 1];

export const ivArraysLessonsB: ConceptLesson[] = [
  // ─────────────────────────────── 5. Enumeration ───────────────────────────────
  {
    id: "fnd-iv-arrays-5-enumeration",
    title: "Enumeration: try everything, cleverly",
    summary: "Count the search space first, then list candidates so that one variable is computed, not looped.",
    minutes: 10,
    xp: 70,
    level: "Intermediate",
    steps: [
      {
        kind: "explain",
        title: "Brute force, on purpose",
        body: "**Enumeration** means listing every candidate answer systematically and testing each one. It is the right answer more often than people expect, as long as you **count the candidates first**. Python manages roughly 10⁷ simple steps a second, so:\n\n" +
          txt(`
candidates           count for this size        fine?
all pairs            n = 3,000  -> 4.5 million   yes
all subsets          n = 20     -> 1 million     yes
all subsets          n = 40     -> 10^12         no
minutes in a day     1,440                       always
`) +
          "\nThree ways to make enumeration smarter:\n\n- **Compute one variable instead of looping it.** For a² + b² = n, loop over `a` and *calculate* `b`, instead of a second loop.\n- **Use symmetry.** If `(a, b)` and `(b, a)` are the same answer, only try `a ≤ b`.\n- **Enumerate the answers, not the inputs.** There are only 1,440 times of day; checking all of them is easier than reasoning about digits.\n\n**How to spot it:** small bounds in the constraints (n ≤ 20, values ≤ 1,000), *count the ways*, *all times*, *how many pairs*.",
      },
      {
        kind: "question",
        title: "Two squares that make 50",
        body: "Find every `a ≤ b` with a² + b² = 50. Because `a ≤ b`, a² is at most half of 50, so `a` only runs from 0 to 5, and `b` is computed with an integer square root. Which `a` works next?",
        widget: {
          type: "iv-trace",
          props: {
            title: "Loop a, compute b",
            frames: [
              { array: [0, 1, 2, 3, 4, 5], pointers: { a: 0 }, highlight: [0], code: SQUARES_CODE, line: 3, vars: { "n - a²": 50, b: 7, found: "[]" }, note: "a = 0: 50 isn't a square (7² = 49)." },
              { pointers: { a: 1 }, highlight: [1], line: 4, vars: { "n - a²": 49, b: 7, found: "[(1, 7)]" }, note: "a = 1: 49 = 7². Found **(1, 7)**." },
              { pointers: { a: 2 }, done: [0, 1], line: 2, vars: { "n - a²": 46, b: 6, found: "[(1, 7)]" }, note: "a = 2: 46 isn't a square.", pick: { prompt: "Which value of a gives the next answer?", answer: 5 } },
              { pointers: { a: 5 }, highlight: [5], done: [0, 1, 2, 3, 4], line: 4, vars: { "n - a²": 25, b: 5, found: "[(1, 7), (5, 5)]" }, note: "a = 3 leaves 41 and a = 4 leaves 34, neither a square. a = 5 leaves 25 = 5²: **(5, 5)**. Six tries instead of 50 × 50." },
            ],
          },
        },
        question: { type: "widget", goal: { picked: true }, prompt: "Answer the pick.", hint: "For each remaining a, check whether 50 − a² is a perfect square: 41, 34, 25." },
        explanation: "Only a = 1 and a = 5 leave a perfect square. Looping one variable and computing the other turns O(n) pairs into O(√n) tries.",
      },
      {
        kind: "question",
        title: "Size the search",
        body: "A digital clock shows `hh:mm` from `00:00` to `23:59`. How many different times can it show?",
        question: { type: "number", answer: 1440, unit: "times", hint: "Multiply the number of hours by the number of minutes in each hour." },
        explanation: "24 × 60 = **1,440**. Any question about clock times can just check all of them.",
      },
      {
        kind: "question",
        title: "When is every subset fine?",
        body: "A problem asks you to choose some of n items (any subset) to hit a target. Which bound on n tells you that trying every subset is fast enough?",
        question: {
          type: "choice",
          options: ["n ≤ 100,000", "n ≤ 1,000", "n ≤ 20", "Any n: computers are fast"],
          answer: 2,
          feedback: { 0: "2¹⁰⁰⁰⁰⁰ subsets would never finish.", 1: "2¹⁰⁰⁰ is far more than the atoms in the universe.", 3: "Each extra item doubles the number of subsets." },
          hint: "There are 2ⁿ subsets. Which n keeps 2ⁿ near a million?",
        },
        explanation: "2²⁰ is about a million, which is quick. Every extra item doubles the count, so at n = 40 you face 10¹². Constraints like n ≤ 20 are a deliberate signal that exponential enumeration (or a bitmask) is intended.",
      },
      {
        kind: "code",
        title: "Sums of two squares",
        body: "Write `two_squares(n)`: every pair `(a, b)` of whole numbers with `0 ≤ a ≤ b` and `a*a + b*b == n`, as a list of tuples in increasing `a`. n can be as big as 10¹⁰, so loop over `a` only, and get `b` with `math.isqrt` (exact for big integers, unlike `math.sqrt`, which rounds through a float).",
        language: "python",
        starter: `from math import isqrt

def two_squares(n):
    found = []
    # loop a while 2*a*a <= n, compute b, check it
    pass
`,
        solution: `from math import isqrt

def two_squares(n):
    found = []
    a = 0
    while 2 * a * a <= n:
        b = isqrt(n - a * a)
        if b * b == n - a * a:
            found.append((a, b))
        a += 1
    return found
`,
        tests: [
          { id: "t1", description: "50 = 1² + 7² = 5² + 5²", assertionCode: `_r = two_squares(50)\nassert _r == [(1, 7), (5, 5)], f"expected [(1, 7), (5, 5)], got {_r}"` },
          { id: "t2", description: "Zero is allowed", assertionCode: `_r = two_squares(25)\nassert _r == [(0, 5), (3, 4)], f"expected [(0, 5), (3, 4)], got {_r}"\n_r = two_squares(0)\nassert _r == [(0, 0)], f"0 = 0² + 0²: expected [(0, 0)], got {_r}"` },
          { id: "t3", description: "No answer, and three answers", assertionCode: `_r = two_squares(3)\nassert _r == [], f"3 is not a sum of two squares: expected [], got {_r}"\n_r = two_squares(325)\nassert _r == [(1, 18), (6, 17), (10, 15)], f"expected [(1, 18), (6, 17), (10, 15)], got {_r}"` },
          { id: "t4", description: "n = 10¹⁰ + 1 needs one loop", assertionCode: `_r = two_squares(10**10 + 1)\nassert _r == [(1, 100000), (19801, 98020), (48320, 87551), (64700, 76249)], f"expected 4 pairs starting with (1, 100000), got {_r[:5] if _r else _r}"` },
        ],
        hints: ["Stop when `2 * a * a > n`: past that point a would be bigger than b.", "`b = isqrt(n - a * a)` is the integer square root; keep the pair only if `b * b == n - a * a`."],
      },
      {
        kind: "code",
        title: "Clock digit sums",
        body: "Write `times_with_sum(s)`: how many times from `00:00` to `23:59` have four digits that add up to `s`? For example, `01:00` and `10:00` both have digit sum 1. Just check all 1,440.",
        language: "python",
        starter: `def times_with_sum(s):
    # for every hour and minute, add up the four digits of f"{h:02d}{m:02d}"
    pass
`,
        solution: `def times_with_sum(s):
    count = 0
    for h in range(24):
        for m in range(60):
            digits = f"{h:02d}{m:02d}"
            if sum(int(d) for d in digits) == s:
                count += 1
    return count
`,
        tests: [
          { id: "t1", description: "Sum 1", assertionCode: `_r = times_with_sum(1)\nassert _r == 4, f"00:01, 00:10, 01:00 and 10:00: expected 4, got {_r}"` },
          { id: "t2", description: "The extremes", assertionCode: `_r = times_with_sum(0)\nassert _r == 1, f"only 00:00 has sum 0: expected 1, got {_r}"\n_r = times_with_sum(24)\nassert _r == 1, f"only 19:59 has sum 24: expected 1, got {_r}"` },
          { id: "t3", description: "A sum no time reaches", assertionCode: `_r = times_with_sum(25)\nassert _r == 0, f"no time has digit sum 25: expected 0, got {_r}"` },
          { id: "t4", description: "The most common sum", assertionCode: `_r = times_with_sum(12)\nassert _r == 125, f"expected 125 times with digit sum 12, got {_r}. Hours stop at 23 and minutes at 59"` },
        ],
        hints: ["Two loops, `for h in range(24)` and `for m in range(60)`, cover every time.", "`f\"{h:02d}{m:02d}\"` gives the four digits as text, zero-padded."],
      },
      {
        kind: "recap",
        points: [
          "**Enumeration** is fine when you've counted the candidates: about 10⁷ simple steps a second in Python.",
          "Loop one variable and **compute** the other: a² + b² = n takes O(√n), not O(n).",
          "Use symmetry (`a ≤ b`) to halve the work and avoid duplicate answers.",
          "Sometimes the answer space is tiny (1,440 times of day): enumerate answers, not inputs.",
          "n ≤ 20 in the constraints usually means \"try all 2ⁿ subsets\"; use `math.isqrt` for exact square roots.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 6. Simulation ───────────────────────────────
  {
    id: "fnd-iv-arrays-6-simulation",
    title: "Simulation: follow the rules, then skip ahead",
    summary: "Model the state exactly, use direction vectors, and find the cycle when steps run into billions.",
    minutes: 11,
    xp: 70,
    level: "Intermediate",
    steps: [
      {
        kind: "explain",
        title: "Do exactly what it says",
        body: "A **simulation** problem describes a process (a robot, a game, a queue of customers) and asks what happens. There is no trick at first: model the **state** in a few variables and apply the rules one step at a time, exactly as written.\n\nTwo tools make it tidy:\n\n- **Direction vectors.** Keep the four headings in a list and the current heading as an index. Turning right is `d = (d + 1) % 4`, left is `d = (d - 1) % 4` (Python's `%` keeps it in 0–3).\n- **Cycles.** If the step count is huge (10⁹ rounds), the state usually repeats. Find the period, jump over whole cycles with arithmetic, and simulate only the remainder.\n\n" +
          py(`
DIRS = [(0, 1), (1, 0), (0, -1), (-1, 0)]   # north, east, south, west
x, y, d = 0, 0, 0                            # start at the origin, facing north
`) +
          "\n**How to spot it:** *robot*, *game*, *after each round*, *repeat k times*, *what is the state after*.\n\n**Pitfalls:** mixing up (row, column) with (x, y); turning the wrong way; updating a board in place when the rule needs the *old* values (copy first).",
      },
      {
        kind: "question",
        title: "Follow the robot",
        body: "The robot starts in the bottom-left square facing north (up) and runs `FFRFFRF`: `F` moves one square, `R` turns right. Step through and predict where the last `F` lands.",
        widget: {
          type: "iv-trace",
          props: {
            title: "Commands FFRFFRF",
            frames: [
              { grid: FIELD, cells: at([[3, 0]], "active"), code: ROBOT_CODE, line: 1, vars: { cmd: "start", x: 0, y: 0, facing: "N" }, note: "Start at the origin, bottom left, facing north." },
              { cells: [...at([[3, 0], [2, 0]], "path"), ...at([[1, 0]], "active")], line: 3, vars: { cmd: "F F", x: 0, y: 2, facing: "N" }, note: "Two steps north." },
              { cells: [...at([[3, 0], [2, 0], [1, 0]], "path"), ...at([[1, 1]], "active")], line: 3, vars: { cmd: "R F", x: 1, y: 2, facing: "E" }, note: "Turn right to face east, then one step." },
              { cells: [...at([[3, 0], [2, 0], [1, 0], [1, 1]], "path"), ...at([[1, 2]], "active")], line: 3, vars: { cmd: "F", x: 2, y: 2, facing: "E" }, note: "Another step east." },
              { cells: [...at([[3, 0], [2, 0], [1, 0], [1, 1]], "path"), ...at([[1, 2]], "active")], line: 4, vars: { cmd: "R", x: 2, y: 2, facing: "S" }, note: "Turn right again: east becomes south.", pick: { prompt: "Which square does the final F reach?", answer: "2,2" } },
              { cells: [...at([[3, 0], [2, 0], [1, 0], [1, 1], [1, 2]], "path"), ...at([[2, 2]], "active")], line: 3, vars: { cmd: "F", x: 2, y: 1, facing: "S" }, note: "One step south: the robot ends at **(2, 1)**." },
            ],
          },
        },
        question: { type: "widget", goal: { picked: true }, prompt: "Answer the pick.", hint: "Facing south means moving down the picture by one square." },
        explanation: "After the second right turn the robot faces south, so `F` moves it down one square to x = 2, y = 1. Note that the grid's row grows downwards while y grows upwards: decide on one convention and convert carefully.",
      },
      {
        kind: "question",
        title: "Which way now?",
        body: "`DIRS` lists north, east, south, west. The robot faces west (`d = 3`) and turns **right** with `d = (d + 1) % 4`. Which way does it face?",
        question: { type: "choice", options: ["South", "North", "East", "West"], answer: 1, feedback: { 0: "That's a left turn from west.", 2: "That's a half turn." }, hint: "Work out (3 + 1) % 4, then look that index up in the list." },
        explanation: "(3 + 1) % 4 = 0, which is **north**. The `% 4` wraps the index round, so you never need an `if` for the last direction.",
      },
      {
        kind: "explain",
        title: "Skipping a billion rounds",
        body: "Now repeat the whole command string m times, with m up to 10¹². Simulating every round is far too slow. The trick is the **heading**: each pass turns the robot by the same amount, so after **4 passes** it faces north again. From then on, every block of 4 passes moves it by the same vector.\n\n" +
          txt(`
commands "FR", one pass: step north, turn right
pass 1: (0, 1) facing E      pass 3: (1, 0) facing W
pass 2: (1, 1) facing S      pass 4: (0, 0) facing N   <- back to the start state
`) +
          "\nSo for m passes: simulate 4 passes to get the 4-pass shift `(X, Y)`, multiply it by `m // 4`, then simulate the remaining `m % 4` passes from there. That's at most 8 passes of work whatever m is.\n\nThis is the general shape: **find when the state repeats, jump whole cycles, simulate the leftover**.",
      },
      {
        kind: "question",
        title: "Back where it started",
        body: "The robot repeats `FRR` (step, then turn right twice) from the origin facing north. After how many passes is it back at the origin, facing north?",
        question: { type: "number", answer: 2, unit: "passes", hint: "After one pass, where is it and which way does it face? Do one more pass." },
        explanation: "Pass 1 ends at (0, 1) facing south; pass 2 steps back to (0, 0) and turns to face north. So the period is **2**. Four passes always works as a period, but the real one can be shorter.",
      },
      {
        kind: "code",
        title: "Where does it end?",
        body: "Write `robot_end(commands)`: the robot starts at `(0, 0)` facing north. `F` moves one step forward, `L` and `R` turn 90° left and right, anything else is ignored. Return the final `(x, y)`, where east is +x and north is +y.",
        language: "python",
        starter: `DIRS = [(0, 1), (1, 0), (0, -1), (-1, 0)]   # N E S W

def robot_end(commands):
    x, y, d = 0, 0, 0
    # apply each command
    pass
`,
        solution: `DIRS = [(0, 1), (1, 0), (0, -1), (-1, 0)]   # N E S W

def robot_end(commands):
    x, y, d = 0, 0, 0
    for c in commands:
        if c == "F":
            x, y = x + DIRS[d][0], y + DIRS[d][1]
        elif c == "R":
            d = (d + 1) % 4
        elif c == "L":
            d = (d - 1) % 4
    return (x, y)
`,
        tests: [
          { id: "t1", description: "The traced route", assertionCode: `_r = robot_end("FFRFFRF")\nassert _r is not None and tuple(_r) == (2, 1), f"expected (2, 1), got {_r}"` },
          { id: "t2", description: "Turning left", assertionCode: `_r = robot_end("LLFF")\nassert _r is not None and tuple(_r) == (0, -2), f"two lefts face south: expected (0, -2), got {_r}"\n_r = robot_end("LF")\nassert tuple(_r) == (-1, 0), f"one left faces west: expected (-1, 0), got {_r}"` },
          { id: "t3", description: "A square brings it home", assertionCode: `_r = robot_end("RFRFRFRF")\nassert _r is not None and tuple(_r) == (0, 0), f"four sides of a square: expected (0, 0), got {_r}"\n_r = robot_end("")\nassert tuple(_r) == (0, 0), f"no commands: expected (0, 0), got {_r}"` },
          { id: "t4", description: "Unknown letters are ignored", assertionCode: `_r = robot_end("FxF?RF")\nassert _r is not None and tuple(_r) == (1, 2), f"only F, L and R count: expected (1, 2), got {_r}"` },
        ],
        hints: ["For `F`, add `DIRS[d]` to the position; for `R` and `L`, change only `d`.", "`d = (d - 1) % 4` turns left: in Python, `(0 - 1) % 4` is 3, which is west."],
      },
      {
        kind: "code",
        title: "A trillion passes",
        body: "Write `robot_after(commands, passes)`: the position after running the whole command string `passes` times in a row (same rules, start at the origin facing north). `passes` can be 10¹². Simulate 4 passes to find the 4-pass shift, multiply, then simulate the leftover `passes % 4`.",
        language: "python",
        starter: `DIRS = [(0, 1), (1, 0), (0, -1), (-1, 0)]   # N E S W

def run(commands, x, y, d):
    for c in commands:
        if c == "F":
            x, y = x + DIRS[d][0], y + DIRS[d][1]
        elif c == "R":
            d = (d + 1) % 4
        elif c == "L":
            d = (d - 1) % 4
    return x, y, d

def robot_after(commands, passes):
    # 4 passes always bring the heading back to north
    pass
`,
        solution: `DIRS = [(0, 1), (1, 0), (0, -1), (-1, 0)]   # N E S W

def run(commands, x, y, d):
    for c in commands:
        if c == "F":
            x, y = x + DIRS[d][0], y + DIRS[d][1]
        elif c == "R":
            d = (d + 1) % 4
        elif c == "L":
            d = (d - 1) % 4
    return x, y, d

def robot_after(commands, passes):
    x, y, d = 0, 0, 0
    for _ in range(4):
        x, y, d = run(commands, x, y, d)
    q, r = divmod(passes, 4)
    x, y, d = q * x, q * y, 0
    for _ in range(r):
        x, y, d = run(commands, x, y, d)
    return (x, y)
`,
        tests: [
          { id: "t1", description: "FR comes home every 4 passes", assertionCode: `_r = robot_after("FR", 4)\nassert _r is not None and tuple(_r) == (0, 0), f"expected (0, 0), got {_r}"\n_r = robot_after("FR", 5)\nassert tuple(_r) == (0, 1), f"one pass after coming home: expected (0, 1), got {_r}"` },
          { id: "t2", description: "Few passes", assertionCode: `_r = robot_after("FRR", 3)\nassert _r is not None and tuple(_r) == (0, 1), f"expected (0, 1), got {_r}"\n_r = robot_after("FFRF", 0)\nassert tuple(_r) == (0, 0), f"zero passes: expected (0, 0), got {_r}"` },
          { id: "t3", description: "Straight ahead a trillion times", assertionCode: `_r = robot_after("F", 10**12)\nassert _r is not None and tuple(_r) == (0, 10**12), f"expected (0, 10**12), got {_r}"` },
          { id: "t4", description: "Leftover passes", assertionCode: `_r = robot_after("FFRFF", 10**9 + 2)\nassert _r is not None and tuple(_r) == (4, 0), f"10**9 + 2 passes = whole cycles + 2: expected (4, 0), got {_r}"` },
          { id: "t5", description: "No net turn at all", assertionCode: `_r = robot_after("FFLFRF", 10**12 + 3)\nassert _r is not None and tuple(_r) == (-(10**12 + 3), 3 * (10**12 + 3)), f"each pass moves (-1, 3): got {_r}"` },
        ],
        hints: ["Run 4 passes from the start with `run` to get the shift `(x, y)` for one block of 4.", "`q, r = divmod(passes, 4)`: start from `(q * x, q * y)` facing north, then run the command string `r` more times."],
      },
      {
        kind: "recap",
        points: [
          "**Simulation**: model the state in a few variables and apply the rules exactly; most bugs are off-by-one or a mixed-up axis.",
          "Keep headings in a list; turn with `(d ± 1) % 4`.",
          "Huge step counts mean a **cycle**: find the period, jump whole cycles with arithmetic, simulate the remainder.",
          "For a repeated command string, the heading repeats after at most 4 passes.",
          "When every cell updates at once, compute the new board from a copy of the old one.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 7. Matrix ───────────────────────────────
  {
    id: "fnd-iv-arrays-7-matrix",
    title: "Matrices: rows, columns and spirals",
    summary: "Index grids safely, rotate them, walk diagonals and peel a grid in spiral order.",
    minutes: 12,
    xp: 80,
    level: "Advanced",
    steps: [
      {
        kind: "explain",
        title: "A grid is a list of rows",
        body: "A **matrix** (grid, board, image) is a list of rows: `grid[r][c]` is row `r`, column `c`, with `rows = len(grid)` and `cols = len(grid[0])` (check the grid isn't empty first).\n\nHandy facts:\n\n- **Neighbours:** loop over `(dr, dc)` in `[(-1, 0), (1, 0), (0, -1), (0, 1)]` and keep `0 <= r + dr < rows and 0 <= c + dc < cols`.\n- **Diagonals:** along a down-right diagonal `r - c` stays the same; along an anti-diagonal `r + c` does. Use it as a dict key to group cells.\n- **Transpose:** `t[c][r] = grid[r][c]`, or `[list(col) for col in zip(*grid)]`.\n- **Rotate 90° clockwise:** reverse the order of the rows, then transpose. A rows × cols grid becomes cols × rows.\n\n" +
          txt(`
1 2 3     reverse rows    4 5 6     transpose    4 1
4 5 6     ----------->    1 2 3     -------->    5 2
                                                 6 3
`) +
          "\n**How to spot it:** *grid*, *board*, *image*, *rotate*, *spiral*, *diagonal*, *neighbouring cells*.\n\n**Pitfalls:** `[[0] * cols] * rows` makes every row the **same** list; non-square grids; a single row or column.",
      },
      {
        kind: "question",
        title: "Peel it in a spiral",
        body: "A spiral walk keeps four boundaries (`top`, `bottom`, `left`, `right`) and shrinks one after each side it walks. Step through a 3 × 4 grid and answer the picks.",
        widget: {
          type: "iv-trace",
          props: {
            title: "Spiral order with shrinking boundaries",
            frames: [
              { grid: SPIRAL, cells: at([[0, 0], [0, 1], [0, 2], [0, 3]], "path"), code: SPIRAL_CODE, line: 3, vars: { top: 1, bottom: 2, left: 0, right: 3, out: "1 2 3 4" }, note: "Walk the top row, then move `top` down." },
              { cells: [...at([[0, 0], [0, 1], [0, 2], [0, 3]], "done"), ...at([[1, 3], [2, 3]], "path")], line: 4, vars: { top: 1, bottom: 2, left: 0, right: 2, out: "1 2 3 4 8 12" }, note: "Down the right column (rows `top` to `bottom`), then move `right` in." },
              { cells: at([[0, 0], [0, 1], [0, 2], [0, 3], [1, 3], [2, 3]], "done"), line: 5, note: "Next is the bottom row, from `right` back to `left`.", pick: { prompt: "Which square comes right after 12?", answer: "2,2" } },
              { cells: [...at([[0, 0], [0, 1], [0, 2], [0, 3], [1, 3], [2, 3]], "done"), ...at([[2, 2], [2, 1], [2, 0]], "path")], line: 5, vars: { top: 1, bottom: 1, left: 0, right: 2, out: "1 2 3 4 8 12 11 10 9" }, note: "11, 10, 9; then `bottom` moves up to 1." },
              { cells: at([[0, 0], [0, 1], [0, 2], [0, 3], [1, 3], [2, 3], [2, 2], [2, 1], [2, 0]], "done"), line: 6, note: "Now up the left column, rows `bottom` to `top`.", pick: { prompt: "Which square comes right after 9?", answer: "1,0" } },
              { cells: [...at([[0, 0], [0, 1], [0, 2], [0, 3], [1, 3], [2, 3], [2, 2], [2, 1], [2, 0]], "done"), ...at([[1, 0]], "path")], line: 6, vars: { top: 1, bottom: 1, left: 1, right: 2, out: "… 9 5" }, note: "Only 5, since `top` = `bottom` = 1. Then `left` moves in." },
              { cells: [...at([[0, 0], [0, 1], [0, 2], [0, 3], [1, 3], [2, 3], [2, 2], [2, 1], [2, 0], [1, 0]], "done"), ...at([[1, 1], [1, 2]], "path")], line: 3, vars: { top: 2, bottom: 1, left: 2, right: 1, out: "1 2 3 4 8 12 11 10 9 5 6 7" }, note: "The last lap is the single row 6, 7. Then `top > bottom` and the loop ends. Every cell once: O(rows × cols)." },
            ],
          },
        },
        question: { type: "widget", goal: { picked: true }, prompt: "Answer both picks.", hint: "After a side is walked its boundary moves in, so the next side starts one square away from the corner you just used." },
        explanation: "The order is 1 2 3 4 8 12 11 10 9 5 6 7. The two `if` checks matter on the last lap: without them, a single remaining row or column would be walked twice, forwards and backwards.",
      },
      {
        kind: "question",
        title: "The shared row",
        body: "What does this print?\n\n" + py(`
grid = [[0] * 3] * 2
grid[0][0] = 1
print(grid)
`),
        question: {
          type: "choice",
          options: ["`[[1, 0, 0], [0, 0, 0]]`", "`[[1, 0, 0], [1, 0, 0]]`", "`[[1, 1, 1], [0, 0, 0]]`", "An error: lists can't be multiplied"],
          answer: 1,
          feedback: { 0: "That's what you'd get from `[[0] * 3 for _ in range(2)]`.", 2: "Only one cell of the row was set." },
          hint: "`* 2` copies the reference to the inner list, not the list itself.",
        },
        explanation: "`[row] * 2` puts the **same** row object in both places, so changing one changes \"both\". Build grids with a comprehension: `[[0] * cols for _ in range(rows)]` makes a fresh row each time.",
      },
      {
        kind: "question",
        title: "Along the diagonal",
        body: "In a 5 × 5 grid, how many cells lie on the same down-right diagonal as `(1, 3)` (row 1, column 3), counting `(1, 3)` itself?",
        question: { type: "number", answer: 3, unit: "cells", hint: "On a down-right diagonal, r − c stays the same. Here r − c = −2: list the cells inside the grid." },
        explanation: "r − c = −2 gives (0, 2), (1, 3) and (2, 4); the next one, (3, 5), is off the grid. So **3**. Grouping cells by `r - c` (or `r + c` for anti-diagonals) is how queen-attack and diagonal-sort problems are solved.",
      },
      {
        kind: "code",
        title: "Rotate a picture",
        body: "Write `rotate_clockwise(grid)`: return a **new** grid turned 90° clockwise, without changing `grid`. A rows × cols grid becomes cols × rows. An empty grid `[]` stays `[]`.\n\n" +
          py(`
rotate_clockwise([[1, 2, 3],
                  [4, 5, 6]])    # [[4, 1], [5, 2], [6, 3]]
`),
        language: "python",
        starter: `def rotate_clockwise(grid):
    # reverse the rows, then transpose: new[c][r] comes from the reversed grid
    pass
`,
        solution: `def rotate_clockwise(grid):
    return [list(col) for col in zip(*grid[::-1])]
`,
        tests: [
          { id: "t1", description: "A 2 × 3 grid becomes 3 × 2", assertionCode: `_g = [[1, 2, 3], [4, 5, 6]]\n_r = rotate_clockwise(_g)\nassert _r == [[4, 1], [5, 2], [6, 3]], f"expected [[4, 1], [5, 2], [6, 3]], got {_r}"\nassert _g == [[1, 2, 3], [4, 5, 6]], "don't change the original grid"` },
          { id: "t2", description: "A square grid", assertionCode: `_r = rotate_clockwise([[1, 2, 3], [4, 5, 6], [7, 8, 9]])\nassert _r == [[7, 4, 1], [8, 5, 2], [9, 6, 3]], f"expected [[7, 4, 1], [8, 5, 2], [9, 6, 3]], got {_r}"` },
          { id: "t3", description: "One row and one column", assertionCode: `_r = rotate_clockwise([[1, 2, 3]])\nassert _r == [[1], [2], [3]], f"one row becomes one column: expected [[1], [2], [3]], got {_r}"\n_r = rotate_clockwise([[1], [2]])\nassert _r == [[2, 1]], f"one column becomes one row, bottom first: expected [[2, 1]], got {_r}"` },
          { id: "t4", description: "Four turns is a full circle; empty stays empty", assertionCode: `_g = [[1, 2], [3, 4], [5, 6]]\n_r = _g\nfor _ in range(4):\n    _r = rotate_clockwise(_r)\nassert _r == _g, f"four rotations should give the grid back, got {_r}"\nassert rotate_clockwise([]) == [], "an empty grid stays []"` },
        ],
        hints: ["`grid[::-1]` reverses the order of the rows without changing them.", "`zip(*rows)` gives the columns as tuples; turn each into a list."],
      },
      {
        kind: "code",
        title: "Spiral order",
        body: "Write `spiral(grid)`: every value in clockwise spiral order, starting top-left, as a list. Use the four shrinking boundaries from the trace, and guard the last lap so a single row or column isn't walked twice.",
        language: "python",
        starter: `def spiral(grid):
    out = []
    if not grid:
        return out
    top, bottom, left, right = 0, len(grid) - 1, 0, len(grid[0]) - 1
    # walk top row, right column, bottom row, left column; shrink each boundary
    pass
`,
        solution: `def spiral(grid):
    out = []
    if not grid:
        return out
    top, bottom, left, right = 0, len(grid) - 1, 0, len(grid[0]) - 1
    while top <= bottom and left <= right:
        for c in range(left, right + 1):
            out.append(grid[top][c])
        top += 1
        for r in range(top, bottom + 1):
            out.append(grid[r][right])
        right -= 1
        if top <= bottom:
            for c in range(right, left - 1, -1):
                out.append(grid[bottom][c])
            bottom -= 1
        if left <= right:
            for r in range(bottom, top - 1, -1):
                out.append(grid[r][left])
            left += 1
    return out
`,
        tests: [
          { id: "t1", description: "The traced 3 × 4 grid", assertionCode: `_r = spiral([[1, 2, 3, 4], [5, 6, 7, 8], [9, 10, 11, 12]])\nassert _r == [1, 2, 3, 4, 8, 12, 11, 10, 9, 5, 6, 7], f"expected [1, 2, 3, 4, 8, 12, 11, 10, 9, 5, 6, 7], got {_r}"` },
          { id: "t2", description: "A single row or column", assertionCode: `_r = spiral([[1, 2, 3]])\nassert _r == [1, 2, 3], f"one row: expected [1, 2, 3], got {_r}. Is the last lap walked twice?"\n_r = spiral([[1], [2], [3]])\nassert _r == [1, 2, 3], f"one column: expected [1, 2, 3], got {_r}"` },
          { id: "t3", description: "A 4 × 4 grid", assertionCode: `_g = [[1, 2, 3, 4], [12, 13, 14, 5], [11, 16, 15, 6], [10, 9, 8, 7]]\n_r = spiral(_g)\nassert _r == list(range(1, 17)), f"expected 1..16 in order, got {_r}"` },
          { id: "t4", description: "Tall grid, and an empty one", assertionCode: `_r = spiral([[1, 2], [3, 4], [5, 6]])\nassert _r == [1, 2, 4, 6, 5, 3], f"expected [1, 2, 4, 6, 5, 3], got {_r}"\nassert spiral([]) == [], "an empty grid gives []"` },
        ],
        hints: ["Inside `while top <= bottom and left <= right`, walk the top row and move `top` down, then the right column and move `right` left.", "Walk the bottom row only `if top <= bottom`, and the left column only `if left <= right`."],
      },
      {
        kind: "recap",
        points: [
          "`grid[r][c]`: `rows = len(grid)`, `cols = len(grid[0])`; check bounds with `0 <= r < rows and 0 <= c < cols`.",
          "Build grids with `[[0] * cols for _ in range(rows)]`, never `[[0] * cols] * rows`.",
          "`r - c` is constant on a down-right diagonal, `r + c` on an anti-diagonal.",
          "Rotate clockwise = reverse the rows, then transpose: `[list(c) for c in zip(*grid[::-1])]`.",
          "Spirals: four boundaries that shrink, with guards on the last lap. Every cell once, O(rows × cols).",
        ],
      },
    ],
  },

  // ─────────────────────────────── 8. Prefix Sum ───────────────────────────────
  {
    id: "fnd-iv-arrays-8-prefix-sum",
    title: "Prefix sums: any range total in O(1)",
    summary: "Running totals answer range queries instantly, and with a dict they count subarrays that hit a target.",
    minutes: 12,
    xp: 80,
    level: "Advanced",
    steps: [
      {
        kind: "explain",
        title: "Running totals",
        body: "A **prefix sum** array stores running totals: `p[0] = 0` and `p[i + 1] = p[i] + nums[i]`, so `p[i]` is the sum of the first i items. Then the sum of any slice is one subtraction:\n\n" +
          txt(`
nums       3  -1   4   2  -2   5
p       0  3   2   6   8   6  11
sum(nums[l..r]) = p[r + 1] - p[l]      e.g. nums[1..4] = p[5] - p[1] = 6 - 3 = 3
`) +
          "\nBuilding `p` is O(n); after that each range query is O(1), so q queries cost O(n + q) instead of O(n × q).\n\nThe deeper use: a slice `l..r` sums to `k` exactly when `p[r + 1] - p[l] == k`, that is, when an **earlier** prefix equals `p[r + 1] - k`. Keep a dict that counts the prefixes seen so far and you can count all such slices in one pass. It works with **negative** numbers, where a sliding window does not.\n\n**How to spot it:** *many range-sum queries*, *subarray sums to k*, *equal number of 0s and 1s* (turn 0 into −1, look for sum 0), *divisible by k* (store `p % k`). The same idea works in 2-D with inclusion–exclusion.",
      },
      {
        kind: "question",
        title: "Count slices that hit 3",
        body: "Count the slices of `[1, 2, -1, 2, 1]` that sum to `k = 3`. At each item, `p` is the running total and `count` remembers how many earlier prefixes had each value. `count[p - k]` is how many slices end here. Answer the pick.",
        widget: {
          type: "iv-trace",
          props: {
            title: "Prefix counts, k = 3",
            frames: [
              { array: KNUMS, code: PREFIX_CODE, line: 1, vars: { p: 0, "p - k": "-", total: 0, count: "{0: 1}" }, note: "The empty prefix (sum 0) is there before we start, so slices that begin at index 0 can be counted." },
              { pointers: { j: 0 }, highlight: [0], line: 5, vars: { p: 1, "p - k": -2, total: 0, count: "{0: 1, 1: 1}" }, note: "p = 1. No earlier prefix is −2." },
              { pointers: { j: 1 }, highlight: [0, 1], range: [0, 1], line: 5, vars: { p: 3, "p - k": 0, total: 1, count: "{0: 1, 1: 1, 3: 1}" }, note: "p = 3, and the empty prefix 0 is in `count`: the slice `[1, 2]` from index 0." },
              { pointers: { j: 2 }, highlight: [2], line: 5, vars: { p: 2, "p - k": -1, total: 1, count: "{0: 1, 1: 1, 3: 1, 2: 1}" }, note: "p = 2. Nothing is −1." },
              { pointers: { j: 3 }, highlight: [3], line: 5, vars: { p: 4, "p - k": 1, total: 1, count: "{0: 1, 1: 1, 3: 1, 2: 1}" }, note: "p = 4 needs an earlier prefix of 1. The prefix after index 0 is 1.", pick: { prompt: "So a slice ending here sums to 3. Tap the index where that slice starts.", answer: 1 } },
              { pointers: { j: 3 }, highlight: [1, 2, 3], range: [1, 3], line: 5, vars: { p: 4, "p - k": 1, total: 2, count: "{0: 1, 1: 1, 3: 1, 2: 1, 4: 1}" }, note: "`[2, -1, 2]` = 3. Total 2." },
              { pointers: { j: 4 }, highlight: [3, 4], range: [3, 4], done: [0, 1, 2], line: 5, vars: { p: 5, "p - k": 2, total: 3, count: "{…, 4: 1, 5: 1}" }, note: "p = 5 needs 2, the prefix after index 2: the slice `[2, 1]`. **3** slices, one pass." },
            ],
          },
        },
        question: { type: "widget", goal: { picked: true }, prompt: "Answer the pick.", hint: "The earlier prefix of 1 ends at index 0, so the slice starts just after it." },
        explanation: "p − k = 1 matches the prefix that ends at index 0, so the slice runs from index 1 to index 3: 2 − 1 + 2 = 3. Each item does one lookup and one update: O(n) time, O(n) memory.",
      },
      {
        kind: "question",
        title: "One subtraction",
        body: "For `nums = [3, -1, 4, 2, -2, 5]` the prefix array is `p = [0, 3, 2, 6, 8, 6, 11]`. Find the sum of `nums[2..5]` (indexes 2 to 5 inclusive).",
        question: { type: "number", answer: 9, hint: "Use p[r + 1] − p[l] with l = 2 and r = 5." },
        explanation: "p[6] − p[2] = 11 − 2 = **9**, which matches 4 + 2 − 2 + 5.",
      },
      {
        kind: "question",
        title: "Why start with {0: 1}?",
        body: "In the counting loop, `count` starts as `{0: 1}` instead of `{}`. What would be missed without it?",
        question: {
          type: "choice",
          options: ["Slices that contain a negative number", "Slices of length one", "Slices that start at index 0", "Slices that end at the last index"],
          answer: 2,
          feedback: { 0: "Negatives are handled by the prefix arithmetic itself.", 1: "A length-one slice from the middle is found through the prefix just before it.", 3: "The last index is processed like every other." },
          hint: "A slice from index 0 to r has sum p[r + 1] − p[0]. Which prefix is p[0]?",
        },
        explanation: "A slice that starts at index 0 subtracts p[0] = 0, the empty prefix. Seeding `{0: 1}` puts that prefix in the table; without it, `[1, 2]` in the trace would be missed.",
      },
      {
        kind: "code",
        title: "Range totals",
        body: "A shop has daily takings `nums` and a list of `queries`, each a pair `(l, r)` of day indexes, inclusive. Write `range_totals(nums, queries)`: the list of totals, one per query. There can be 50,000 queries over 100,000 days, so build a prefix array once.",
        language: "python",
        starter: `def range_totals(nums, queries):
    p = [0]
    # build the prefix array, then answer each query with one subtraction
    pass
`,
        solution: `def range_totals(nums, queries):
    p = [0]
    for x in nums:
        p.append(p[-1] + x)
    return [p[r + 1] - p[l] for l, r in queries]
`,
        tests: [
          { id: "t1", description: "A few queries", assertionCode: `_r = range_totals([3, -1, 4, 2, -2, 5], [(1, 4), (0, 0), (2, 5), (0, 5)])\nassert _r == [3, 3, 9, 11], f"expected [3, 3, 9, 11], got {_r}"` },
          { id: "t2", description: "One day, and no queries", assertionCode: `_r = range_totals([7], [(0, 0)])\nassert _r == [7], f"expected [7], got {_r}"\n_r = range_totals([1, 2], [])\nassert _r == [], f"no queries: expected [], got {_r}"` },
          { id: "t3", description: "Negative takings", assertionCode: `_r = range_totals([-5, -5, 10], [(0, 1), (0, 2), (1, 2)])\nassert _r == [-10, 0, 5], f"expected [-10, 0, 5], got {_r}"` },
          { id: "t4", description: "50,000 wide queries", assertionCode: `_n = list(range(100000))\n_q = [(i, 99999 - i) for i in range(50000)]\n_r = range_totals(_n, _q)\n_want = [(l + r) * (r - l + 1) // 2 for l, r in _q]\nassert _r == _want, "wrong totals on the big input" if _r is not None and len(_r) == len(_want) else f"expected {len(_want)} totals, got {None if _r is None else len(_r)}"` },
        ],
        hints: ["Append `p[-1] + x` for each day, so `p` has one more entry than `nums`.", "Each query `(l, r)` is `p[r + 1] - p[l]`."],
      },
      {
        kind: "code",
        title: "Count slices that hit k",
        body: "Write `count_exact(nums, k)`: how many contiguous slices (at least one item) sum to exactly `k`. Numbers can be negative or zero, so a sliding window won't work. Up to 30,000 numbers: one pass with a dict of prefix counts.",
        language: "python",
        starter: `def count_exact(nums, k):
    count = {0: 1}   # prefix sum -> how many times seen
    p = total = 0
    # for each x: update p, add count[p - k], then record p
    pass
`,
        solution: `def count_exact(nums, k):
    count = {0: 1}
    p = total = 0
    for x in nums:
        p += x
        total += count.get(p - k, 0)
        count[p] = count.get(p, 0) + 1
    return total
`,
        tests: [
          { id: "t1", description: "The traced example", assertionCode: `_r = count_exact([1, 2, -1, 2, 1], 3)\nassert _r == 3, f"[1, 2], [2, -1, 2] and [2, 1]: expected 3, got {_r}"` },
          { id: "t2", description: "Zeros make many slices", assertionCode: `_r = count_exact([0, 0, 0], 0)\nassert _r == 6, f"every one of the 6 slices sums to 0: expected 6, got {_r}"` },
          { id: "t3", description: "Negatives cancel out", assertionCode: `_r = count_exact([-2, 2, -2, 2], 0)\nassert _r == 4, f"expected 4 slices summing to 0, got {_r}"\n_r = count_exact([], 5)\nassert _r == 0, f"an empty list has no slices: expected 0, got {_r}"` },
          { id: "t4", description: "Negative target", assertionCode: `_r = count_exact([3, -4, 1, -1], -1)\nassert _r == 3, f"[3, -4], [-1] and [3, -4, 1, -1]: expected 3, got {_r}"` },
          { id: "t5", description: "30,000 numbers in one pass", assertionCode: `_r = count_exact([1] * 30000, 100)\nassert _r == 29901, f"every window of 100 ones: expected 29901, got {_r}"` },
        ],
        hints: ["Look up `count.get(p - k, 0)` **before** recording the current `p`, or a slice of zero items could be counted when k = 0.", "Record the prefix with `count[p] = count.get(p, 0) + 1`."],
      },
      {
        kind: "recap",
        points: [
          "**Prefix sums**: `p[0] = 0`, `p[i + 1] = p[i] + nums[i]`; the slice `l..r` sums to `p[r + 1] - p[l]`.",
          "Build once in O(n), answer each range query in O(1).",
          "Slices summing to k: count earlier prefixes equal to `p - k` in a dict seeded with `{0: 1}`. O(n), and it handles negatives.",
          "Variants: store `p % k` for divisibility, map 0 to −1 for balanced 0/1 slices, use 2-D prefixes for rectangle sums.",
          "Look up before you record the current prefix, so a slice is never empty.",
        ],
      },
    ],
  },
];
