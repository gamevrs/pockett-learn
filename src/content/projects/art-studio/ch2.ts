import type { Chapter } from "@/engine/types";
import { md, py } from "./util.ts";

/**
 * Chapter 2: Lay the grid. A poster is a list of rows of colours: indexing grid[row][col], building
 * grids with nested loops, sets of unique colours, enumerate and zip.
 *
 * Names this chapter adds: sky, sun, grass, poster, rows, cols, corner, make_grid, checker, unique_colours,
 * inks_used, ink_count, row_labels, legend, shelf_names, shelf_legend.
 */
export const chapter2: Chapter = {
  id: "grid",
  title: "Lay the grid",
  blurb: "A poster is rows of coloured cells. Build one, paint it with loops and count its inks.",
  lessons: [
    // ───────────────────────── 5 ─────────────────────────
    {
      id: "art-studio-5-grid",
      title: "A poster is a grid",
      minutes: 14,
      xp: 80,
      concepts: ["list of lists", "grid[row][col]", "len of rows and columns"],
      learn: md`### Why a grid?

A screen-printed poster is made of small coloured cells, like tiles on a floor. To store a poster you need cells in rows, and rows stacked on top of each other. A list can hold anything, including other lists, so a **list of lists** is the answer: each inner list is one row.

~~~python
board = [
    ["a", "b", "c"],
    ["d", "e", "f"],
]
~~~

\`board\` has 2 rows and each row has 3 cells.

### Two numbers to find one cell

First pick the row, then pick the cell in that row. Positions still start at 0.

~~~python
print(board[0])        # ['a', 'b', 'c']
print(board[1][2])     # f
print(board[0][0])     # a
~~~

\`board[1]\` is the second row, \`['d', 'e', 'f']\`. Then \`[2]\` picks the third item of that row, \`f\`. Say it as "row 1, column 2".

~~~python
print(len(board))      # 2   (how many rows)
print(len(board[0]))   # 3   (how many cells in the first row)
~~~

\`-1\` counts from the end, so \`board[-1][-1]\` is the very last cell, \`f\`.

Each cell can hold anything. For a poster, each cell holds a colour tuple.`,
      mission: `Time to lay out the real market-night poster: 3 rows high and 4 columns wide. Your starter gives you three colours.

Fill the top row with sky, except for a sun in column 2. The middle row is all sky. The bottom row is all grass. Then read the size and one corner cell back out of the grid.`,
      tasks: [
        "poster: a list of 3 rows, each with 4 cells",
        "Top row: sky, sky, sun, sky. Middle row: all sky. Bottom row: all grass",
        "rows = len(poster) and cols = len(poster[0])",
        "corner = the bottom-right cell, read with two sets of square brackets",
      ],
      starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 5: lay out the poster grid.
sky = (70, 130, 200)
sun = (250, 210, 70)
grass = (60, 160, 90)

poster = ...      # a list of 3 rows (each a list of 4 colours)

rows = ...        # how many rows
cols = ...        # how many cells in a row
corner = ...      # the bottom-right cell: poster[row][col]
`,
      solutionAdd: py`sky = (70, 130, 200)
sun = (250, 210, 70)
grass = (60, 160, 90)

poster = [
    [sky, sky, sun, sky],
    [sky, sky, sky, sky],
    [grass, grass, grass, grass],
]

rows = len(poster)
cols = len(poster[0])
corner = poster[2][3]`,
      explanation:
        "A grid is a list whose items are lists. poster[row][col] reads one cell: the first brackets choose the row, the second choose the cell inside it. len(poster) counts rows, len(poster[0]) counts columns.",
      hints: [
        { id: "h1", title: "Shape", content: "An outer list with three inner lists: poster = [ [..four..], [..four..], [..four..] ]" },
        { id: "h2", title: "The sun", content: "Top row: [sky, sky, sun, sky] puts the sun in column 2 (positions start at 0)." },
        { id: "h3", title: "Reading back", content: "rows = len(poster), cols = len(poster[0]), corner = poster[2][3] (or poster[-1][-1])." },
      ],
      tests: [
        { id: "t1", description: "poster has 3 rows of 4 cells", assertionCode: py`assert isinstance(poster, list) and len(poster) == 3, "poster should be a list of 3 rows"
assert all(isinstance(_row, list) and len(_row) == 4 for _row in poster), "Each row should be a list of 4 cells"` },
        { id: "t2", description: "The sun is at row 0, column 2", assertionCode: py`assert poster[0] == [sky, sky, sun, sky], "Top row should be sky, sky, sun, sky"` },
        { id: "t3", description: "Middle row is sky, bottom row is grass", assertionCode: py`assert poster[1] == [sky] * 4, "Middle row should be all sky"
assert poster[2] == [grass] * 4, "Bottom row should be all grass"` },
        { id: "t4", description: "rows, cols and corner are read from the grid", assertionCode: py`assert rows == 3 and cols == 4, "rows should be 3 and cols should be 4 (use len)"
assert corner == grass, "corner should be the bottom-right cell, which is grass"` },
      ],
      unlocks: ["as-poster"],
      checks: [
        {
          prompt: "For `board = [[1, 2, 3], [4, 5, 6]]`, what is `board[1][0]`?",
          question: { type: "number", answer: 4 },
          explanation: "`board[1]` is the second row, `[4, 5, 6]`. Its first item (position 0) is 4.",
        },
        {
          prompt: "In `grid[2][5]`, which number picks the row?",
          question: { type: "choice", options: ["2", "5"], answer: 0 },
          explanation: "The first brackets always pick the row, the second pick the cell inside that row.",
        },
      ],
    },

    // ───────────────────────── 6 ─────────────────────────
    {
      id: "art-studio-6-nested-loops",
      title: "Paint with nested loops",
      minutes: 16,
      xp: 90,
      concepts: ["nested loops", "building a grid", "% remainder"],
      learn: md`### Writing every cell by hand does not scale

Your 3 by 4 poster took twelve cells. A real poster might be 20 by 30: 600 cells. Nobody types that. A loop does one thing many times, so a loop inside a loop can visit every row and every cell.

~~~python
for row in range(2):
    for col in range(3):
        print(row, col)
~~~

~~~text
0 0
0 1
0 2
1 0
1 1
1 2
~~~

The outer loop picks a row. The inner loop then runs all the way through its columns before the outer loop moves on. 2 rows times 3 columns is 6 lines.

### Building an empty grid

Start with an empty list of rows. For each row, make an empty list, fill it with cells, then add it.

~~~python
grid = []
for row in range(2):
    new_row = []
    for col in range(3):
        new_row.append(0)
    grid.append(new_row)
print(grid)          # [[0, 0, 0], [0, 0, 0]]
~~~

Make a fresh \`new_row\` for each row, inside the outer loop. Then change one cell by position:

~~~python
grid[1][2] = 9
print(grid)          # [[0, 0, 0], [0, 0, 9]]
~~~

### The remainder: % for alternating patterns

\`a % b\` is what is left over after dividing a by b. \`7 % 2\` is 1, \`6 % 2\` is 0. With 2 it just tells you odd (1) from even (0), over and over, which is exactly what a chessboard does. For a cell at \`row\` and \`col\`, \`(row + col) % 2\` flips every step along a row and every step down a column.

~~~python
for row in range(3):
    print(row, row % 2)      # 0 0   1 1   2 0
~~~`,
      mission: `Posters come in any size, so write functions that take the size as a parameter.

Write \`make_grid(rows, cols, fill)\`, which returns a fresh grid with every cell set to \`fill\`. Then write \`checker(rows, cols, a, b)\`, which starts from a grid of \`a\` and paints \`b\` wherever \`(row + col) % 2 == 1\`, giving a chessboard with \`a\` in the top-left corner.`,
      tasks: [
        "def make_grid(rows, cols, fill): nested loops build and return the grid",
        "def checker(rows, cols, a, b): use make_grid, then switch cells where (row + col) % 2 == 1 to b",
        "pattern = checker(6, 8, ink, shade)",
      ],
      starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 6: paint any size of poster.
def make_grid(rows, cols, fill):
    # build a list of rows; each row is a fresh list of cols cells
    ...

def checker(rows, cols, a, b):
    # start from make_grid(rows, cols, a), then loop over every cell
    ...

pattern = ...      # a 6 by 8 checkerboard of ink and shade
`,
      solutionAdd: py`def make_grid(rows, cols, fill):
    grid = []
    for row in range(rows):
        new_row = []
        for col in range(cols):
            new_row.append(fill)
        grid.append(new_row)
    return grid

def checker(rows, cols, a, b):
    grid = make_grid(rows, cols, a)
    for row in range(rows):
        for col in range(cols):
            if (row + col) % 2 == 1:
                grid[row][col] = b
    return grid

pattern = checker(6, 8, ink, shade)`,
      explanation:
        "Nested loops visit every (row, col) pair. make_grid builds each row fresh. checker changes cells in place with grid[row][col] = b whenever (row + col) is odd.",
      hints: [
        { id: "h1", title: "make_grid", content: "grid = [], then for row in range(rows): new_row = [], for col in range(cols): new_row.append(fill), then grid.append(new_row). Finish with return grid." },
        { id: "h2", title: "checker", content: "grid = make_grid(rows, cols, a). Loop over row and col, and if (row + col) % 2 == 1: grid[row][col] = b." },
        { id: "h3", title: "The call", content: "pattern = checker(6, 8, ink, shade)" },
      ],
      tests: [
        { id: "t1", description: "make_grid has the right shape", assertionCode: py`_g = make_grid(2, 3, 0)
assert _g == [[0, 0, 0], [0, 0, 0]], f"make_grid(2, 3, 0) should be [[0, 0, 0], [0, 0, 0]], got {_g}"` },
        { id: "t2", description: "Rows are separate lists", assertionCode: py`_g = make_grid(2, 2, 0)
_g[0][0] = 5
assert _g[1][0] == 0, "Changing one cell must not change another row: build a fresh row inside the outer loop"` },
        { id: "t3", description: "checker alternates a and b", assertionCode: py`_c = checker(2, 3, "a", "b")
assert _c == [["a", "b", "a"], ["b", "a", "b"]], f"checker(2, 3, 'a', 'b') should start with a in the corner, got {_c}"` },
        { id: "t4", description: "pattern is a 6 by 8 checker of ink and shade", assertionCode: py`assert pattern == checker(6, 8, ink, shade), "pattern should be checker(6, 8, ink, shade)"
assert len(pattern) == 6 and len(pattern[0]) == 8, "pattern should be 6 rows of 8 cells"` },
      ],
      unlocks: ["as-patterns"],
      checks: [
        {
          prompt: "How many times does `print` run?\n\n```python\nfor a in range(3):\n    for b in range(4):\n        print(a, b)\n```",
          question: { type: "number", answer: 12 },
          explanation: "The inner loop runs 4 times for each of the 3 outer repeats: 3 times 4 is 12.",
        },
        {
          prompt: "What is `9 % 4`?",
          question: { type: "number", answer: 1 },
          explanation: "9 divided by 4 is 2 with 1 left over, and `%` gives the leftover.",
        },
      ],
    },

    // ───────────────────────── 7 ─────────────────────────
    {
      id: "art-studio-7-sets",
      title: "Count the inks: sets",
      minutes: 12,
      xp: 80,
      concepts: ["set", "add", "unique values", "hashable tuples"],
      learn: md`### Counting different inks, not cells

The print shop pays for every ink it loads into the press. A poster with 600 cells might only use 4 different inks, and the printer needs the number 4, not 600. You want each colour counted once.

A **set** is a collection that keeps each value only once and does not care about order. Add a value that is already there and nothing happens.

~~~python
seen = set()
seen.add(4)
seen.add(9)
seen.add(4)
print(len(seen))     # 2
print(4 in seen)     # True
print(7 in seen)     # False
~~~

\`set()\` makes an empty set. \`.add(x)\` puts a value in. \`len\` counts the members, and \`in\` checks membership. A set also builds straight from a list:

~~~python
print(len(set([1, 1, 2, 2, 2, 3])))    # 3
~~~

Sets print in no promised order, so rely on \`len\` and \`in\`, not on which item comes first.

### Colours fit in a set

A set can only hold values that never change, because it has to recognise them later. Tuples never change, so colour tuples are fine. A list can change, so Python refuses it:

~~~python
s = set()
s.add([1, 2])
~~~

~~~text
TypeError: unhashable type: 'list'
~~~

That is one more reason colours are tuples. The same idea works for a whole poster: loop over every row, then over every cell, and \`.add\` each one.`,
      mission: `Write \`unique_colours(grid)\`, which returns the set of different colours used in a grid. Use it to count the inks in the poster, and write \`ink_count(grid)\`, which returns just the number.

The poster's ink tally appears on the bench.`,
      tasks: [
        "def unique_colours(grid): loop over rows and cells and add each one to a set; return the set",
        "def ink_count(grid): the number of different colours",
        "inks_used = unique_colours(poster) and print(ink_count(poster))",
      ],
      starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 7: how many different inks does a poster use?
def unique_colours(grid):
    # found = set(); add every cell of every row; return found
    ...

def ink_count(grid):
    # how many different colours are in the grid?
    ...

inks_used = ...      # the set of colours in poster
# print(ink_count(poster))
`,
      solutionAdd: py`def unique_colours(grid):
    found = set()
    for row in grid:
        for cell in row:
            found.add(cell)
    return found

def ink_count(grid):
    return len(unique_colours(grid))

inks_used = unique_colours(poster)
print(ink_count(poster))`,
      explanation:
        "A set stores each value once, so adding every cell leaves exactly the different colours. Tuples can go into sets because they cannot change.",
      hints: [
        { id: "h1", title: "Start empty", content: "found = set() at the top of unique_colours." },
        { id: "h2", title: "Visit every cell", content: "for row in grid: for cell in row: found.add(cell). Then return found." },
        { id: "h3", title: "Count", content: "ink_count can be: return len(unique_colours(grid)). The poster uses 3 inks." },
      ],
      tests: [
        { id: "t1", description: "unique_colours returns a set", assertionCode: py`_u = unique_colours([[(1, 1, 1), (1, 1, 1)], [(2, 2, 2), (1, 1, 1)]])
assert isinstance(_u, set), "unique_colours should return a set"
assert _u == {(1, 1, 1), (2, 2, 2)}, f"Expected two different colours, got {_u}"` },
        { id: "t2", description: "ink_count counts different colours", assertionCode: py`assert ink_count(checker(3, 3, "a", "b")) == 2, "A two-colour checkerboard uses 2 inks"
assert ink_count(make_grid(2, 2, "x")) == 1, "A one-colour grid uses 1 ink"` },
        { id: "t3", description: "inks_used holds the poster's colours", assertionCode: py`assert inks_used == {sky, sun, grass}, "inks_used should be unique_colours(poster): sky, sun and grass"` },
        { id: "t4", description: "Prints the poster's ink count", assertionCode: py`assert __stdout__.strip().splitlines()[-1].strip() == "3", "The last line printed should be ink_count(poster), which is 3"` },
      ],
      unlocks: ["as-inks"],
      checks: [
        {
          prompt: "What is `len({2, 2, 5, 5, 5})`?",
          question: { type: "number", answer: 2 },
          explanation: "A set keeps each value once, so it holds just 2 and 5.",
        },
        {
          prompt: "Why can a colour tuple go into a set but a colour list cannot?",
          question: {
            type: "choice",
            options: ["Tuples are shorter", "A tuple can never change, so the set can recognise it later", "Lists cannot hold numbers"],
            answer: 1,
          },
          explanation: "A set needs values that stay the same. Lists can be changed, so Python refuses them with an \"unhashable\" error.",
        },
      ],
    },

    // ───────────────────────── 8 ─────────────────────────
    {
      id: "art-studio-8-enumerate-zip",
      title: "Numbering and pairing: enumerate and zip",
      minutes: 14,
      xp: 80,
      concepts: ["enumerate", "zip", "looping two lists together"],
      learn: md`### Two small problems on every shelf

The printer needs a numbered list ("1. poppy, 2. navy") so a helper can shout which tin to fetch. And the printer needs each ink name matched to its colour. Both are loops that need two things at once.

### enumerate: the item and its number

\`enumerate(names)\` hands you a position and the item together. The position starts at 0; add \`start=1\` to count like people do. You met it in Turbo Garage. Here it builds a numbered list:

~~~python
names = ["sky", "sun"]
lines = []
for number, name in enumerate(names, start=1):
    lines.append(f"{number}. {name}")
print(lines)
~~~

~~~text
['1. sky', '2. sun']
~~~

### zip: walk two lists side by side

\`zip(a, b)\` pairs the first item of \`a\` with the first of \`b\`, the second with the second, and so on. A \`for\` loop can unpack each pair straight into two names:

~~~python
names = ["sky", "sun"]
codes = ["#4682c8", "#fad246"]
for name, code in zip(names, codes):
    print(name, code)
~~~

~~~text
sky #4682c8
sun #fad246
~~~

If one list is shorter, \`zip\` stops when the shortest runs out. That also means the lists must be in the same order: the first name belongs to the first code.`,
      mission: `Write \`row_labels(names)\`, which returns a list of numbered labels starting at 1, and \`legend(names, colours)\`, which pairs names with colours and returns lines like \`"poppy: #f05a3c"\` using your \`hex_code\`.

Then name the five inks on the shelf and build the legend.`,
      tasks: [
        "def row_labels(names): enumerate with start=1, giving lines like \"1. sky\"",
        "def legend(names, colours): zip names and colours, giving lines like \"sky: #4682c8\"",
        "shelf_names = [\"poppy\", \"navy\", \"saffron\", \"charcoal\", \"paper\"] and shelf_legend = legend(shelf_names, swatches)",
      ],
      starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 8: number the tins and match names to colours.
def row_labels(names):
    # return a list of "1. name", "2. name", ...
    ...

def legend(names, colours):
    # return a list of "name: #hexcode" lines, one per pair
    ...

shelf_names = ...     # five names, in the same order as swatches
shelf_legend = ...    # legend(shelf_names, swatches)
`,
      solutionAdd: py`def row_labels(names):
    labels = []
    for number, name in enumerate(names, start=1):
        labels.append(f"{number}. {name}")
    return labels

def legend(names, colours):
    lines = []
    for name, colour in zip(names, colours):
        lines.append(f"{name}: {hex_code(colour)}")
    return lines

shelf_names = ["poppy", "navy", "saffron", "charcoal", "paper"]
shelf_legend = legend(shelf_names, swatches)`,
      explanation:
        "enumerate gives a position with each item; zip pairs two lists item by item. Both let a single for loop work with two values at once.",
      hints: [
        { id: "h1", title: "enumerate", content: "for number, name in enumerate(names, start=1): labels.append(f\"{number}. {name}\")" },
        { id: "h2", title: "zip", content: "for name, colour in zip(names, colours): lines.append(f\"{name}: {hex_code(colour)}\")" },
        { id: "h3", title: "Order matters", content: "swatches is ordered poppy red, navy, saffron yellow, charcoal, paper, so use the names in that order." },
      ],
      tests: [
        { id: "t1", description: "row_labels numbers from 1", assertionCode: py`assert row_labels(["a", "b"]) == ["1. a", "2. b"], f"row_labels(['a', 'b']) should be ['1. a', '2. b'], got {row_labels(['a', 'b'])}"
assert row_labels([]) == [], "row_labels([]) should be an empty list"` },
        { id: "t2", description: "legend pairs names with hex codes", assertionCode: py`_l = legend(["x", "y"], [(0, 0, 0), (255, 255, 255)])
assert _l == ["x: #000000", "y: #ffffff"], f"legend should give ['x: #000000', 'y: #ffffff'], got {_l}"` },
        { id: "t3", description: "shelf_names has five names", assertionCode: py`assert isinstance(shelf_names, list) and len(shelf_names) == 5, "shelf_names should be a list of 5 names"
assert all(isinstance(_n, str) and _n for _n in shelf_names), "Each name should be a non-empty string"` },
        { id: "t4", description: "shelf_legend is legend(shelf_names, swatches)", assertionCode: py`assert shelf_legend == legend(shelf_names, swatches), "shelf_legend should be legend(shelf_names, swatches)"
assert len(shelf_legend) == 5, "shelf_legend should have 5 lines"` },
      ],
      unlocks: ["as-legend"],
      checks: [
        {
          prompt: "What does `list(zip([1, 2, 3], [\"a\", \"b\"]))` give?",
          question: {
            type: "choice",
            options: ["`[(1, 'a'), (2, 'b'), (3, None)]`", "`[(1, 'a'), (2, 'b')]`", "An error"],
            answer: 1,
          },
          explanation: "`zip` stops at the shortest list, so the unmatched 3 is dropped.",
        },
      ],
    },
  ],
};
