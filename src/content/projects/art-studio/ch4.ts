import type { Chapter } from "@/engine/types";
import { RNG_CLASS, md, py } from "./util.ts";

/**
 * Chapter 4: Generate and ship. Comprehensions (and when to use a loop), sorting with key=, a seeded
 * Rng, try/except ValueError, importing from the standard library and a short documenting habit.
 *
 * Names this chapter adds: lighter_palette, bright_names, pastel, darkest_first, lightest_first,
 * pair_brightness, ranked_names, ranking, Rng, random_poster, seed_poster, parse_colour, parse_size,
 * math, radial_grid, poster_summary, final_poster, report.
 */
export const chapter4: Chapter = {
  id: "ship",
  title: "Generate and ship",
  blurb: "Write shorter code, rank the inks, add seeded chance, survive bad input, and finish the poster.",
  lessons: [
    // ───────────────────────── 13 ─────────────────────────
    {
      id: "art-studio-13-comprehensions",
      title: "One-line lists: comprehensions",
      minutes: 16,
      xp: 90,
      concepts: ["list comprehension", "dict comprehension", "if filter", "when to use a loop"],
      learn: md`### The same loop, written over and over

Look at the loops you have written: make an empty list, loop, maybe test something, append. That shape is so common that Python has a short form for it, the **comprehension**.

A loop:

~~~python
doubled = []
for n in [1, 2, 3, 4]:
    doubled.append(n * 2)
print(doubled)        # [2, 4, 6, 8]
~~~

The same thing as a comprehension. Read it as "n times 2, for each n in the list":

~~~python
doubled = [n * 2 for n in [1, 2, 3, 4]]
~~~

Add \`if\` at the end to keep only some items:

~~~python
big = [n for n in [1, 2, 3, 4] if n > 2]
print(big)            # [3, 4]
~~~

### Dictionaries too

Use curly brackets and a \`key: value\` pair at the front:

~~~python
lengths = {word: len(word) for word in ["ink", "paper"]}
print(lengths)        # {'ink': 3, 'paper': 5}
~~~

To transform every value of a dictionary, loop over \`.items()\`:

~~~python
prices = {"stamp": 3, "poster": 12}
dearer = {item: price + 1 for item, price in prices.items()}
print(dearer)         # {'stamp': 4, 'poster': 13}
~~~

### When is a comprehension clearer than a loop?

Short is not always clear. A good rule:

- **Use a comprehension** when each result is one simple expression, and you are building a new list or dictionary from an old one (maybe with one \`if\`). It reads like a sentence.
- **Use a loop** when you do several steps per item, build nested structures (like \`make_grid\`), change something as you go, or need \`break\`. Squashing those into one line makes people re-read it three times.

If you cannot read the one-liner aloud as a sentence, write the loop.`,
      mission: `Shrink two of your loops into comprehensions.

Write \`lighter_palette(colours, amount=0.3)\`, which returns a new dictionary with every ink lightened by \`tint\` (a dictionary comprehension). Write \`bright_names(colours, limit=128)\`, which returns the names of inks at or above the limit (a list comprehension with \`if\`). Then make a \`pastel\` palette.`,
      tasks: [
        "def lighter_palette(colours, amount=0.3): a dictionary comprehension using tint(colour, amount)",
        "def bright_names(colours, limit=128): a list comprehension of the names whose brightness is at least limit",
        "pastel = lighter_palette(palette)",
      ],
      starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 13: shorter code.
def lighter_palette(colours, amount=0.3):
    # {name: tint(colour, amount) for ...} over colours.items()
    ...

def bright_names(colours, limit=128):
    # [name for ... if brightness(colour) >= limit]
    ...

pastel = ...      # the palette, lightened
`,
      solutionAdd: py`def lighter_palette(colours, amount=0.3):
    return {name: tint(colour, amount) for name, colour in colours.items()}

def bright_names(colours, limit=128):
    return [name for name, colour in colours.items() if brightness(colour) >= limit]

pastel = lighter_palette(palette)`,
      explanation:
        "A comprehension packs 'make a new collection from an old one' into one expression. These two are simple enough to read aloud: 'name to its tinted colour, for each pair' and 'name, for each pair that is bright enough'.",
      hints: [
        { id: "h1", title: "Dictionary comprehension", content: "return {name: tint(colour, amount) for name, colour in colours.items()}" },
        { id: "h2", title: "List with if", content: "return [name for name, colour in colours.items() if brightness(colour) >= limit]" },
        { id: "h3", title: "Pastel", content: "pastel = lighter_palette(palette)" },
      ],
      tests: [
        { id: "t1", description: "lighter_palette returns a lightened dictionary", assertionCode: py`_p = {"a": (0, 0, 0), "b": (100, 100, 100)}
_got = lighter_palette(_p, 1.0)
assert _got == {"a": (255, 255, 255), "b": (255, 255, 255)}, f"With amount=1.0 every ink should be white, got {_got}"
assert lighter_palette(_p, 0) == _p, "With amount=0 nothing should change"
assert _p == {"a": (0, 0, 0), "b": (100, 100, 100)}, "lighter_palette must return a new dictionary, not change the old one"` },
        { id: "t2", description: "bright_names filters by brightness", assertionCode: py`_p = {"dim": (10, 10, 10), "mid": (128, 128, 128), "lit": (250, 250, 250)}
assert bright_names(_p) == ["mid", "lit"], f"bright_names should keep brightness 128 and up, got {bright_names(_p)}"
assert bright_names(_p, 200) == ["lit"], f"With limit 200 only 'lit' passes, got {bright_names(_p, 200)}"` },
        { id: "t3", description: "pastel is the lightened palette", assertionCode: py`assert pastel == lighter_palette(palette), "pastel should be lighter_palette(palette)"
assert len(pastel) == len(palette), "pastel should have the same inks as palette"` },
      ],
      unlocks: ["as-pastel"],
      checks: [
        {
          prompt: "Which job is best left as a normal loop instead of a comprehension?",
          question: {
            type: "choice",
            options: [
              "Squaring every number in a list",
              "Keeping only the names that start with a vowel",
              "Building a grid, row by row, with a fresh list for each row and a few steps per cell",
            ],
            answer: 2,
          },
          explanation: "Nested building with several steps becomes hard to read as a one-liner. The first two are single simple expressions, which comprehensions handle well.",
        },
        {
          prompt: "What is `[n for n in [5, 1, 8] if n > 4]`?",
          question: { type: "text", answer: ["[5, 8]"] },
          explanation: "Only items passing the `if` are kept, in their original order: 5 and 8.",
        },
      ],
    },

    // ───────────────────────── 14 ─────────────────────────
    {
      id: "art-studio-14-sorting",
      title: "Rank the inks: sorting with key",
      minutes: 15,
      xp: 90,
      concepts: ["sorted", "key=", "reverse", "sorting dictionary items"],
      learn: md`### Which tin goes on the top shelf?

The shop wants its tins in order from darkest to lightest, so the right one is easy to spot. Putting things in order is **sorting**, and Python does it with \`sorted()\`.

~~~python
words = ["pear", "fig", "banana"]
print(sorted(words))        # ['banana', 'fig', 'pear']
print(words)                # ['pear', 'fig', 'banana']  (unchanged)
~~~

\`sorted\` returns a **new** list and leaves the original alone. Strings sort alphabetically, numbers by size. \`reverse=True\` flips the order.

### Sorting by something else: key=

Sorting colour tuples directly orders them by their red light first, which is not what the shop wants. \`key=\` says "sort by this instead". You give it a **function**. Python calls it on each item, gets a number back, and orders the items by those numbers.

~~~python
print(sorted(words, key=len))                  # ['fig', 'pear', 'banana']
print(sorted(words, key=len, reverse=True))    # ['banana', 'pear', 'fig']
~~~

Notice \`key=len\`: no round brackets. You are handing over the function itself, not calling it. Python does the calling.

Your own functions work the same way. \`sorted(swatches, key=brightness)\` puts the dimmest colour first.

### Sorting dictionary entries

\`prices.items()\` gives (name, price) pairs. To sort pairs by price, write a small function that takes one pair and returns what to sort by:

~~~python
prices = {"stamp": 3, "poster": 12, "mug": 8}

def price_of(pair):
    item, price = pair
    return price

ordered = sorted(prices.items(), key=price_of)
print(ordered)        # [('stamp', 3), ('mug', 8), ('poster', 12)]
~~~

Items with an equal key keep their original order.`,
      mission: `Rank the shop's inks.

Write \`darkest_first(colours)\` and \`lightest_first(colours)\` for lists of colours. Then rank the palette: \`pair_brightness(pair)\` takes one (name, colour) pair and returns its brightness, and \`ranked_names(colours)\` returns the names from darkest to lightest.`,
      tasks: [
        "def darkest_first(colours) and def lightest_first(colours), both using sorted with key=brightness",
        "def pair_brightness(pair): unpack the pair and return the colour's brightness",
        "def ranked_names(colours): sort colours.items() by pair_brightness, then return just the names",
        "ranking = ranked_names(palette)",
      ],
      starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 14: rank the inks.
def darkest_first(colours):
    ...

def lightest_first(colours):
    ...

def pair_brightness(pair):
    # pair is (name, colour)
    ...

def ranked_names(colours):
    # sort colours.items() by pair_brightness, then return only the names
    ...

ranking = ...      # the palette's names, darkest first
`,
      solutionAdd: py`def darkest_first(colours):
    return sorted(colours, key=brightness)

def lightest_first(colours):
    return sorted(colours, key=brightness, reverse=True)

def pair_brightness(pair):
    name, colour = pair
    return brightness(colour)

def ranked_names(colours):
    ordered = sorted(colours.items(), key=pair_brightness)
    return [name for name, colour in ordered]

ranking = ranked_names(palette)`,
      explanation:
        "key= takes a function (no brackets) and sorts by what it returns. For dictionaries you sort the .items() pairs with a small function that picks the number to sort by.",
      hints: [
        { id: "h1", title: "Lists of colours", content: "return sorted(colours, key=brightness). Add reverse=True for lightest first." },
        { id: "h2", title: "pair_brightness", content: "name, colour = pair, then return brightness(colour)." },
        { id: "h3", title: "ranked_names", content: "ordered = sorted(colours.items(), key=pair_brightness), then [name for name, colour in ordered]" },
      ],
      tests: [
        { id: "t1", description: "darkest_first orders by brightness", assertionCode: py`_c = [(200, 200, 200), (10, 10, 10), (100, 100, 100)]
assert darkest_first(_c) == [(10, 10, 10), (100, 100, 100), (200, 200, 200)], f"darkest_first should put the dimmest first, got {darkest_first(_c)}"
assert _c == [(200, 200, 200), (10, 10, 10), (100, 100, 100)], "sorted() makes a new list: the original should be unchanged"` },
        { id: "t2", description: "lightest_first reverses it", assertionCode: py`_c = [(200, 200, 200), (10, 10, 10), (100, 100, 100)]
assert lightest_first(_c) == [(200, 200, 200), (100, 100, 100), (10, 10, 10)], f"lightest_first should put the brightest first, got {lightest_first(_c)}"` },
        { id: "t3", description: "pair_brightness reads one pair", assertionCode: py`assert pair_brightness(("x", (30, 60, 90))) == 60, "pair_brightness(('x', (30, 60, 90))) should be 60"` },
        { id: "t4", description: "ranked_names returns names, darkest first", assertionCode: py`_p = {"b": (200, 0, 0), "a": (0, 0, 30), "c": (255, 255, 255)}
assert ranked_names(_p) == ["a", "b", "c"], f"ranked_names should give ['a', 'b', 'c'], got {ranked_names(_p)}"` },
        { id: "t5", description: "ranking is the palette ranked", assertionCode: py`assert ranking == ranked_names(palette), "ranking should be ranked_names(palette)"` },
      ],
      unlocks: ["as-ranking"],
      checks: [
        {
          prompt: "What is `sorted([3, 1, 2], reverse=True)`?",
          question: { type: "text", answer: ["[3, 2, 1]"] },
          explanation: "`reverse=True` puts the biggest first.",
        },
        {
          prompt: "Which one hands Python the function itself, as `key=` needs?",
          question: { type: "choice", options: ["`key=brightness`", "`key=brightness()`"], answer: 0 },
          explanation: "Round brackets would call the function right now. Without them you pass the function, and `sorted` calls it once per item.",
        },
      ],
    },

    // ───────────────────────── 15 ─────────────────────────
    {
      id: "art-studio-15-seeded-random",
      title: "A dash of chance: seeded randomness",
      minutes: 18,
      xp: 100,
      concepts: ["seed", "pseudo-random", "reproducible output", "using a provided class"],
      learn: md`### Art with surprises, but repeatable

A generative poster fills cells with colours picked by chance, so every poster is different. But a printer who loves one design needs to print it again tomorrow, exactly the same. So the chance has to be *repeatable*.

A computer's "random" numbers are made by a formula. Start the formula from the same starting number, the **seed**, and it produces the same sequence every time. That is called pseudo-random: it looks like chance, but it is a recipe you can replay. Pick a different seed and you get a different poster.

### The shop's generator

Your starter contains a small ready-made generator called \`Rng\`. Python also ships a \`random\` module, but this one is written in plain sight so you can see there is no magic, and it gives the same numbers on every computer.

A **class** is a blueprint for a thing that remembers something between uses (you met one in Turbo Garage). Here you only *use* it: \`Rng(7)\` makes a generator starting from seed 7, and you ask it for numbers with its methods:

- \`rng.uniform()\` gives a decimal from 0 up to (not including) 1
- \`rng.below(n)\` gives a whole number from 0 to n - 1
- \`rng.pick(items)\` gives one item from a list

~~~python
rng = Rng(7)
print([rng.below(6) for _ in range(5)])
~~~

~~~text
[1, 5, 3, 5, 0]
~~~

Start over with the same seed and the same five numbers come back. A different seed gives a different run:

~~~python
rng = Rng(7)                                 # start over from seed 7
print([rng.below(6) for _ in range(5)])      # [1, 5, 3, 5, 0] again
rng = Rng(8)
print([rng.below(6) for _ in range(5)])      # [1, 0, 1, 5, 4]
~~~

(\`_\` is just a name for "I do not need this loop counter".)

The generator remembers where it is. Each call moves it along, so asking twice gives two different numbers, but a new \`Rng(7)\` goes back to the start.

### Going further (optional)

Python's own \`random\` module works the same way, if you create a private generator with a seed: \`import random\` then \`gen = random.Random(7)\`, and \`gen.randrange(6)\`. The plain \`random.random()\` shares one hidden generator for the whole program, which makes results hard to repeat in tests. Writing \`Rng\` yourself, as AI courses do, avoids that.`,
      mission: `Write \`random_poster(rows, cols, colours, seed)\`. It creates \`Rng(seed)\` and fills a grid row by row, left to right, with \`rng.pick(colours)\` for each cell. The same seed must always give the same poster.

Then print one run for seed 2024 from your shelf.`,
      tasks: [
        "def random_poster(rows, cols, colours, seed): rng = Rng(seed), then nested loops with rng.pick(colours)",
        "seed_poster = random_poster(6, 8, swatches, 2024)",
      ],
      starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 15: seeded chance.
# Provided: the shop's generator. Use it; you do not need to change it.
${RNG_CLASS}

def random_poster(rows, cols, colours, seed):
    # rng = Rng(seed); build the grid row by row, left to right, using rng.pick(colours)
    ...

seed_poster = ...      # 6 rows, 8 columns, from swatches, seed 2024
`,
      solutionAdd: py`${RNG_CLASS}

def random_poster(rows, cols, colours, seed):
    rng = Rng(seed)
    grid = []
    for row in range(rows):
        new_row = []
        for col in range(cols):
            new_row.append(rng.pick(colours))
        grid.append(new_row)
    return grid

seed_poster = random_poster(6, 8, swatches, 2024)`,
      explanation:
        "The seed fixes the whole sequence, so random_poster(6, 8, colours, 2024) is the same poster every time. The order cells are filled in matters, because each pick moves the generator along.",
      hints: [
        { id: "h1", title: "Start the generator", content: "rng = Rng(seed) at the top of random_poster. Make it once, not once per cell." },
        { id: "h2", title: "Fill row by row", content: "Same nested loops as make_grid, but append rng.pick(colours) instead of a fixed fill." },
        { id: "h3", title: "The call", content: "seed_poster = random_poster(6, 8, swatches, 2024)" },
      ],
      tests: [
        { id: "t1", description: "Same seed gives the same poster", assertionCode: py`_a = random_poster(4, 5, ["x", "y", "z"], 99)
_b = random_poster(4, 5, ["x", "y", "z"], 99)
assert isinstance(_a, list) and len(_a) == 4, "random_poster should return a grid (a list of rows)"
assert _a == _b, "The same seed must always give the same poster: create Rng(seed) inside the function"` },
        { id: "t2", description: "A different seed gives a different poster", assertionCode: py`_a = random_poster(6, 6, ["x", "y", "z"], 1)
_b = random_poster(6, 6, ["x", "y", "z"], 2)
assert _a != _b, "Different seeds should give different posters"` },
        { id: "t3", description: "Right size and only the given colours", assertionCode: py`_g = random_poster(3, 7, ["x", "y"], 5)
assert isinstance(_g, list) and len(_g) == 3 and all(len(_r) == 7 for _r in _g), "random_poster(3, 7, ...) should be 3 rows of 7 cells"
assert all(_cell in ("x", "y") for _r in _g for _cell in _r), "Every cell should be one of the given colours"` },
        { id: "t4", description: "Cells are filled row by row, left to right", assertionCode: py`_rng = Rng(11)
_want = [[_rng.pick(["x", "y", "z"]) for _c in range(4)] for _r in range(3)]
assert random_poster(3, 4, ["x", "y", "z"], 11) == _want, "Fill the grid row by row, left to right, taking one rng.pick(colours) per cell"` },
        { id: "t5", description: "seed_poster uses seed 2024", assertionCode: py`assert seed_poster == random_poster(6, 8, swatches, 2024), "seed_poster should be random_poster(6, 8, swatches, 2024)"` },
      ],
      unlocks: ["as-seed"],
      checks: [
        {
          prompt: "You run `Rng(5)` twice and ask each for three numbers. How do the two sets of numbers compare?",
          question: { type: "choice", options: ["Always identical", "Different every time", "Identical only on Mondays"], answer: 0 },
          explanation: "The seed fixes the whole sequence. That repeatability is exactly why the shop can reprint a poster.",
        },
      ],
    },

    // ───────────────────────── 16 ─────────────────────────
    {
      id: "art-studio-16-try-except",
      title: "When the order form is wrong: try and except",
      minutes: 18,
      xp: 100,
      concepts: ["exception", "ValueError", "try / except", "validating input"],
      learn: md`### Customers type strange things

A customer types their colour into the order form: \`"240, 90, 60"\`. Another types \`"red"\`. Another types \`"300,0,0"\`. A program that crashes on the second one is no use to the shop.

### What is an exception?

When Python is asked to do something it cannot do, it does not guess. It stops and raises an **exception**: a named kind of problem with a message. You have seen the red text.

~~~python
number = int("twelve")
~~~

~~~text
ValueError: invalid literal for int() with base 10: 'twelve'
~~~

\`ValueError\` is the kind: "the value you gave is the wrong sort of value for this". Unpacking into the wrong number of names raises one too: \`a, b, c = [1, 2]\` gives \`ValueError: not enough values to unpack\`.

An exception stops the program, unless the code *catches* it.

### try and except

Put the risky lines under \`try:\`. If a \`ValueError\` happens in there, Python jumps straight to the \`except ValueError:\` block. If nothing goes wrong, the \`except\` part is skipped.

~~~python
def to_number(text):
    try:
        return int(text)
    except ValueError:
        return 0

print(to_number("12"))        # 12
print(to_number("twelve"))    # 0
~~~

Rules of thumb:

- Keep the \`try\` block small: only the lines that might fail.
- Name the kind you expect (\`except ValueError\`). Catching everything would hide real mistakes.
- Decide what the fallback is. Here it is \`0\`; for a colour it could be \`None\`, which means "no value".

Not every bad input raises an exception. \`"300,0,0"\` converts to numbers just fine, but 300 is not a valid light. Check that with a normal \`if\`.

### Splitting on a character

\`text.split(",")\` cuts on commas instead of spaces: \`"240, 90, 60".split(",")\` gives \`['240', ' 90', ' 60']\`. \`int(" 90")\` ignores the spaces and gives 90.`,
      mission: `Make the order form safe.

Write \`parse_colour(text)\`: given \`"240, 90, 60"\` it returns \`(240, 90, 60)\`. If the text is not three whole numbers, or any is outside 0 to 255, it returns \`None\`. Write \`parse_size(text, fallback=(8, 8))\` for sizes like \`"6x8"\` (rows x columns) which returns the fallback for anything invalid or smaller than 1.

Neither may ever crash.`,
      tasks: [
        "def parse_colour(text): try to split on commas and convert to three ints; return None on ValueError or out-of-range",
        "def parse_size(text, fallback=(8, 8)): split on \"x\", convert two ints; the fallback on ValueError or a size below 1",
        "Print parse_colour(\"240, 90, 60\") and parse_colour(\"red\")",
      ],
      starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 16: survive bad input.
def parse_colour(text):
    # "240, 90, 60" -> (240, 90, 60); anything wrong -> None
    ...

def parse_size(text, fallback=(8, 8)):
    # "6x8" -> (6, 8); anything wrong -> fallback
    ...

# print(parse_colour("240, 90, 60"))
# print(parse_colour("red"))
`,
      solutionAdd: py`def parse_colour(text):
    try:
        r, g, b = [int(part) for part in text.split(",")]
    except ValueError:
        return None
    for light in (r, g, b):
        if light < 0 or light > 255:
            return None
    return (r, g, b)

def parse_size(text, fallback=(8, 8)):
    try:
        rows, cols = [int(part) for part in text.lower().split("x")]
    except ValueError:
        return fallback
    if rows < 1 or cols < 1:
        return fallback
    return (rows, cols)

print(parse_colour("240, 90, 60"))
print(parse_colour("red"))`,
      explanation:
        "int() raises ValueError for non-numbers and unpacking raises it for the wrong count, so one except ValueError catches both. Out-of-range numbers are not exceptions, so an ordinary if handles them.",
      hints: [
        { id: "h1", title: "The risky line", content: "r, g, b = [int(part) for part in text.split(\",\")] can raise ValueError twice over: a part is not a number, or there are not exactly three parts." },
        { id: "h2", title: "Catching it", content: "Put that line under try: and write except ValueError: return None. Keep the range check outside the try." },
        { id: "h3", title: "Range", content: "After the try/except: if any light is below 0 or above 255, return None; otherwise return (r, g, b)." },
      ],
      tests: [
        { id: "t1", description: "parse_colour reads a good colour", assertionCode: py`assert parse_colour("240, 90, 60") == (240, 90, 60), f"parse_colour('240, 90, 60') should be (240, 90, 60), got {parse_colour('240, 90, 60')}"
assert parse_colour("0,0,255") == (0, 0, 255), "Spaces are optional"` },
        { id: "t2", description: "Bad text gives None, never a crash", assertionCode: py`for _bad in ["red", "", "1,2", "1,2,3,4", "a,b,c", "1.5,2,3"]:
    assert parse_colour(_bad) is None, f"parse_colour({_bad!r}) should be None"` },
        { id: "t3", description: "Out-of-range lights give None", assertionCode: py`assert parse_colour("300,0,0") is None, "300 is not a valid light: return None"
assert parse_colour("-5,0,0") is None, "-5 is not a valid light: return None"` },
        { id: "t4", description: "parse_size reads rows x columns", assertionCode: py`assert parse_size("6x8") == (6, 8), f"parse_size('6x8') should be (6, 8), got {parse_size('6x8')}"
assert parse_size("12X4") == (12, 4), "Capital X should work too"` },
        { id: "t5", description: "parse_size falls back safely", assertionCode: py`for _bad in ["", "6", "axb", "0x5", "5x-1"]:
    assert parse_size(_bad) == (8, 8), f"parse_size({_bad!r}) should give the fallback (8, 8)"
assert parse_size("zz", (3, 3)) == (3, 3), "A fallback you pass in should be used"` },
        { id: "t6", description: "Prints both results", assertionCode: py`assert "(240, 90, 60)" in __stdout__, 'Print parse_colour("240, 90, 60")'
assert "None" in __stdout__, 'Print parse_colour("red"), which is None'` },
      ],
      unlocks: ["as-proof"],
      checks: [
        {
          prompt: "Which kind of exception does `int(\"abc\")` raise?",
          question: { type: "text", answer: ["ValueError", "value error"] },
          explanation: "The text is the wrong sort of value to become a whole number, so Python raises `ValueError`.",
        },
        {
          prompt: "Why do we write `except ValueError:` instead of a bare `except:` that catches everything?",
          question: {
            type: "choice",
            options: ["It runs faster", "A bare except would also hide genuine mistakes, like a typo in a name", "Python requires a name"],
            answer: 1,
          },
          explanation: "Catching only what you expect keeps real bugs visible instead of silently swallowing them.",
        },
      ],
    },

    // ───────────────────────── 17 ─────────────────────────
    {
      id: "art-studio-17-ship-it",
      title: "Ship it: import and tidy up",
      minutes: 18,
      xp: 120,
      concepts: ["import math", "standard library", "docstrings", "naming"],
      learn: md`### A toolbox that comes with Python

For the grand finale the shop wants a poster of rings spreading out from the middle, like a ripple. To place a cell you need its distance from the centre. Pythagoras answers that, and the answer is a standard job, so someone already wrote it.

Python comes with a **standard library**: ready-made modules (toolboxes) you open with \`import\`. The \`math\` module has maths tools.

~~~python
import math

print(math.sqrt(16))        # 4.0
print(math.floor(2.7))      # 2   (round down)
print(math.hypot(3, 4))     # 5.0 (straight-line distance across 3 and 4)
print(math.pi)              # 3.141592653589793
~~~

After \`import math\`, every tool is called with the module name, a dot, then the tool: \`math.hypot(...)\`. The dot keeps the toolbox's names separate from yours. You can also bring in one tool by name, \`from math import hypot\`, and then write just \`hypot(3, 4)\`.

Imports normally sit at the very top of a file. Your file grows by appending new code at the bottom, so this lesson puts the import just above its function. That works fine in Python.

### Rings from the middle

The middle of a grid with \`rows\` rows is at row \`(rows - 1) / 2\` (the same for columns). A cell's distance from there is \`math.hypot(row - centre_row, col - centre_col)\`. Cells with the same \`math.floor\` of the distance form a ring, and \`ring % len(colours)\` picks that ring's colour.

### Leave notes for the next person

A **docstring** is a string written as the very first line inside a function. Python keeps it, so tools and people can read what the function is for.

~~~python
def stamp(text, n):
    """The first n characters of text."""
    return text[:n]

print(stamp.__doc__)      # The first n characters of text.
~~~

Good habits that cost nothing:

- **Name for meaning**: function names say what they do (\`parse_colour\`), variables say what they hold (\`final_poster\`). \`x\` and \`data2\` tell the next reader nothing.
- **Docstring says what and why**, in one line. The code already shows how.
- **Small functions** that do one job, like the ones you have built all project.`,
      mission: `The finale. Write \`radial_grid(rows, cols, colours)\`, which fills a grid with rings: the colour of each cell is \`colours[ring]\`, where \`ring\` is \`math.floor\` of its distance from the middle, \`% len(colours)\`.

Write \`poster_summary(grid)\`, which returns a dictionary with the keys \`"rows"\`, \`"cols"\` and \`"inks"\`. Both functions need a docstring. Make \`final_poster\` from your palette, print a summary line, and the poster is ready for the press.`,
      tasks: [
        "import math, then def radial_grid(rows, cols, colours) with a docstring, using math.hypot and math.floor",
        "def poster_summary(grid) with a docstring, returning {\"rows\": ..., \"cols\": ..., \"inks\": ...}",
        "final_poster = radial_grid(11, 15, list(palette.values())) and report = poster_summary(final_poster)",
        "Print one line: f\"{report['rows']}x{report['cols']} poster, {report['inks']} inks\"",
      ],
      starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 17: the finale.
import math

def radial_grid(rows, cols, colours):
    # add a docstring as the first line, then build rings from the middle
    ...

def poster_summary(grid):
    # add a docstring; return {"rows": ..., "cols": ..., "inks": ...}
    ...

final_poster = ...      # radial_grid(11, 15, list(palette.values()))
report = ...            # poster_summary(final_poster)
# print one line: 11x15 poster, N inks
`,
      solutionAdd: py`import math

def radial_grid(rows, cols, colours):
    """Concentric rings of colour, spreading out from the middle of the poster."""
    centre_row = (rows - 1) / 2
    centre_col = (cols - 1) / 2
    grid = []
    for row in range(rows):
        new_row = []
        for col in range(cols):
            distance = math.hypot(row - centre_row, col - centre_col)
            ring = math.floor(distance) % len(colours)
            new_row.append(colours[ring])
        grid.append(new_row)
    return grid

def poster_summary(grid):
    """Facts about a poster: how many rows and columns, and how many different inks."""
    return {"rows": len(grid), "cols": len(grid[0]), "inks": len(unique_colours(grid))}

final_poster = radial_grid(11, 15, list(palette.values()))
report = poster_summary(final_poster)
print(f"{report['rows']}x{report['cols']} poster, {report['inks']} inks")`,
      explanation:
        "import math opens the standard library's maths toolbox; math.hypot finds distance and math.floor rounds down, so equal-distance cells share a ring. Docstrings record what a function is for, right where the next reader will look.",
      hints: [
        { id: "h1", title: "The centre", content: "centre_row = (rows - 1) / 2 and centre_col = (cols - 1) / 2" },
        { id: "h2", title: "The ring", content: "distance = math.hypot(row - centre_row, col - centre_col), then ring = math.floor(distance) % len(colours). The cell is colours[ring]." },
        { id: "h3", title: "Docstring", content: "A triple-quoted sentence on the line right after the def line: \"\"\"What this function does.\"\"\"" },
      ],
      tests: [
        { id: "t1", description: "radial_grid draws rings", assertionCode: py`_got = radial_grid(3, 3, ["a", "b"])
assert _got == [["b", "b", "b"], ["b", "a", "b"], ["b", "b", "b"]], f"radial_grid(3, 3, ['a', 'b']) should have 'a' in the middle only, got {_got}"` },
        { id: "t2", description: "Rings wrap around the colour list", assertionCode: py`_got = radial_grid(1, 7, ["a", "b", "c"])
assert _got == [["a", "c", "b", "a", "b", "c", "a"]], f"A 1 by 7 strip should start from the middle with the first colour and wrap around, got {_got}"` },
        { id: "t3", description: "poster_summary reports size and inks", assertionCode: py`_s = poster_summary([["a", "b"], ["b", "b"], ["a", "a"]])
assert _s == {"rows": 3, "cols": 2, "inks": 2}, f"poster_summary should give rows, cols and inks, got {_s}"` },
        { id: "t4", description: "Both functions have docstrings", assertionCode: py`assert radial_grid.__doc__ and len(radial_grid.__doc__.strip()) >= 10, "Add a docstring to radial_grid: a sentence in triple quotes on the first line inside it"
assert poster_summary.__doc__ and len(poster_summary.__doc__.strip()) >= 10, "Add a docstring to poster_summary"` },
        { id: "t5", description: "final_poster and report are built", assertionCode: py`assert final_poster == radial_grid(11, 15, list(palette.values())), "final_poster should be radial_grid(11, 15, list(palette.values()))"
assert report == poster_summary(final_poster), "report should be poster_summary(final_poster)"` },
        { id: "t6", description: "Prints the summary line", assertionCode: py`_line = f"{report['rows']}x{report['cols']} poster, {report['inks']} inks"
assert __stdout__.strip().splitlines()[-1] == _line, "The last line printed should look like: 11x15 poster, 6 inks"` },
      ],
      unlocks: ["as-radial"],
      checks: [
        {
          prompt: "After `import math`, which line correctly finds the floor of 2.7?",
          question: { type: "choice", options: ["`floor(2.7)`", "`math.floor(2.7)`", "`import floor(2.7)`"], answer: 1 },
          explanation: "A module's tools are used with the module name and a dot. Plain `floor` would only work after `from math import floor`.",
        },
        {
          prompt: "Where does a docstring go?",
          question: {
            type: "choice",
            options: ["As the first line inside the function, right after the `def` line", "On the last line of the file", "After the `return`"],
            answer: 0,
          },
          explanation: "Python only treats a string as a docstring when it is the first statement in the function.",
        },
      ],
    },
  ],
};
