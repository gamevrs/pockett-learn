import type { Chapter } from "@/engine/types";
import { md, py } from "./util.ts";

/**
 * Chapter 1: Mix the inks. Colours as tuples, functions with default and keyword arguments,
 * returning several values, and format specs.
 *
 * Names this chapter adds: ink, r, g, b, tint, shade, brightness, swatches, extremes, darkest, lightest,
 * hex_code, label.
 */
export const chapter1: Chapter = {
  id: "inks",
  title: "Mix the inks",
  blurb: "A colour is three numbers. Bundle them, blend them, and print them as hex codes.",
  lessons: [
    // ───────────────────────── 1 ─────────────────────────
    {
      id: "art-studio-1-first-ink",
      title: "Pour the first ink",
      minutes: 10,
      xp: 60,
      concepts: ["tuples", "indexing", "unpacking"],
      learn: md`### One colour, three numbers

The Lantern Lane Print Shop makes posters one ink at a time. Before it can print anything, the shop needs a way to write a colour down.

A screen makes any colour by mixing three lights: **red**, **green** and **blue**. Each light is a number from 0 (off) to 255 (full power). So a colour is exactly three numbers that always travel together. Python has a container made for that: the **tuple**.

~~~python
poppy = (230, 57, 70)
print(poppy)
~~~

The screen shows:

~~~text
(230, 57, 70)
~~~

A tuple is written with round brackets and commas. It looks like a list, and you read it like a list: positions start at 0.

~~~python
print(poppy[0])     # 230  (the red light)
print(poppy[2])     # 70   (the blue light)
~~~

### Unpacking: three names in one line

Instead of asking for each position, you can hand out all three numbers at once. Put three names on the left of \`=\`:

~~~python
red, green, blue = poppy
print(green)        # 57
print(red, blue)    # 230 70
~~~

Python matches them in order: first name gets the first number, and so on. You need exactly as many names as there are items, or Python complains.

### Why a tuple and not a list?

A list can be changed after you make it. A tuple cannot. That is a feature: a colour recipe should not get altered by accident halfway through printing a poster.

~~~python
poppy[0] = 10
~~~

~~~text
TypeError: 'tuple' object does not support item assignment
~~~

That red text is Python saying "I will not change a tuple". To get a different colour, you make a new tuple.

### Quick reminder of the workspace

You met this screen in Turbo Garage. Type in the editor. **Run** runs your code from the top and shows what you \`print\` in the Console tab. **Submit** checks your work against the Checks list. A red error is a hint: read its last line. Lines with \`...\` in the starter mean "fill this in".`,
      mission: `The shop's first job is a market-night poster, and every poster starts with one ink.

Write down your own ink colour as a tuple, then unpack it into three named lights and print them. A swatch of your colour appears on the press-room bench.`,
      tasks: [
        "ink: a tuple of three whole numbers, each from 0 to 255",
        "Unpack ink into three names: r, g, b",
        "Print the three numbers on one line with print(r, g, b)",
      ],
      starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 1: pour the first ink.
ink = ...        # three numbers in round brackets, e.g. (240, 90, 60)

# Next, unpack ink into r, g, b (one line), then print(r, g, b)
`,
      solutionAdd: py`ink = (240, 90, 60)
r, g, b = ink
print(r, g, b)`,
      explanation:
        "A tuple bundles values that belong together. Unpacking (r, g, b = ink) gives each value its own name, in order. Because a tuple cannot change, it is a safe way to store a colour.",
      hints: [
        { id: "h1", title: "Making a tuple", content: "Round brackets with commas: ink = (240, 90, 60). Each number must be from 0 to 255." },
        { id: "h2", title: "Unpacking", content: "Three names on the left, the tuple on the right: r, g, b = ink" },
        { id: "h3", title: "Printing", content: "print(r, g, b) prints the three numbers on one line with spaces between them." },
      ],
      tests: [
        { id: "t1", description: "ink is a tuple of 3 whole numbers", assertionCode: py`assert isinstance(ink, tuple), "ink must be a tuple: round brackets, like (240, 90, 60)"
assert len(ink) == 3, "ink needs exactly 3 numbers (red, green, blue)"
assert all(type(_v) is int for _v in ink), "Each number in ink must be a whole number"` },
        { id: "t2", description: "Each light is between 0 and 255", assertionCode: py`assert all(0 <= _v <= 255 for _v in ink), "Each number in ink must be from 0 to 255"` },
        { id: "t3", description: "r, g, b come from unpacking ink", assertionCode: py`assert (r, g, b) == ink, "Unpack ink into three names: r, g, b = ink"` },
        { id: "t4", description: "Prints r, g, b on one line", assertionCode: py`assert f"{r} {g} {b}" in __stdout__, "Print the three numbers with print(r, g, b)"` },
      ],
      unlocks: ["as-swatch"],
      checks: [
        {
          prompt: "Which line makes a colour that Python will refuse to change later?",
          question: { type: "choice", options: ["`c = [10, 20, 30]`", "`c = (10, 20, 30)`", "`c = {10, 20, 30}`"], answer: 1 },
          explanation: "Round brackets make a tuple, and tuples cannot be changed once made. Square brackets make a list, which can.",
        },
        {
          prompt: "After `a, b, c = (4, 5, 6)`, what is `b`?",
          question: { type: "number", answer: 5 },
          explanation: "Unpacking matches names to values in order: a is 4, b is 5, c is 6.",
        },
      ],
    },

    // ───────────────────────── 2 ─────────────────────────
    {
      id: "art-studio-2-tints",
      title: "Lighter, darker: default arguments",
      minutes: 14,
      xp: 80,
      concepts: ["default arguments", "keyword arguments", "returning a tuple"],
      learn: md`### Blending towards another colour

A print shop never has just one version of an ink. A poster needs the ink itself, a pale version for backgrounds and a deep version for shadows. You will write one function that makes all of them.

To lighten a colour you slide each light part of the way towards white (255). To darken, slide towards black (0). "Part of the way" is a number from 0 to 1: **0.5** is halfway, **1.0** is all the way. For one light:

~~~text
new = value + (target - value) * amount
~~~

Halfway from 100 to 200 is \`100 + (200 - 100) * 0.5 = 150\`.

### Default arguments

Most of the time you want a gentle tint, and typing the amount every time is tiresome. Give a parameter a **default value** with \`=\` in the \`def\` line. If the caller leaves it out, Python uses the default.

~~~python
def frame(text, mark="*", count=3):
    return mark * count + " " + text + " " + mark * count

print(frame("OPEN"))
print(frame("OPEN", "#"))
~~~

~~~text
*** OPEN ***
### OPEN ###
~~~

Parameters without a default come first. Ones with a default come after.

### Keyword arguments

When a function has several optional parameters, name the one you mean in the call: \`name=value\`. Then you can skip the others and the order stops mattering.

~~~python
print(frame("OPEN", count=1))
print(frame("OPEN", count=2, mark="~"))
~~~

~~~text
* OPEN *
~~ OPEN ~~
~~~

A function that returns a tuple is just \`return (a, b, c)\`. You will write \`tint\` that way: it gets a colour tuple in and hands a new colour tuple back.

The \`round()\` function turns a decimal into the nearest whole number. A colour's lights must be whole numbers.`,
      mission: `The poster needs a pale background and a dark shadow made from the same ink.

Write \`tint(colour, amount=0.25, target=(255, 255, 255))\`: it slides each light of the colour part of the way towards the target and returns a new colour tuple of whole numbers. Then make a dark \`shade\` of your ink by naming the arguments you want to change.`,
      tasks: [
        "def tint(colour, amount=0.25, target=(255, 255, 255)) returning a new (r, g, b) tuple of whole numbers",
        "Each light: round(value + (target_value - value) * amount)",
        "shade = tint(ink, amount=0.5, target=(0, 0, 0)), a half-dark version of your ink",
      ],
      starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 2: lighter and darker versions of an ink.
def tint(colour, amount=0.25, target=(255, 255, 255)):
    # unpack colour and target, blend each light, and return a tuple
    ...

shade = ...      # tint(ink, ...) using keyword arguments to aim at black (0, 0, 0)
`,
      solutionAdd: py`def tint(colour, amount=0.25, target=(255, 255, 255)):
    r, g, b = colour
    tr, tg, tb = target
    return (
        round(r + (tr - r) * amount),
        round(g + (tg - g) * amount),
        round(b + (tb - b) * amount),
    )

shade = tint(ink, amount=0.5, target=(0, 0, 0))`,
      explanation:
        "Defaults make the common call short, and keyword arguments let you change just the parts you care about. tint(ink) lightens by a quarter; tint(ink, amount=0.5, target=(0, 0, 0)) darkens by half.",
      hints: [
        { id: "h1", title: "Unpack first", content: "r, g, b = colour and tr, tg, tb = target give you six plain numbers to work with." },
        { id: "h2", title: "One light", content: "round(r + (tr - r) * amount) is the new red. Do the same for green and blue." },
        { id: "h3", title: "Return and call", content: "return (new_r, new_g, new_b). Then: shade = tint(ink, amount=0.5, target=(0, 0, 0))" },
      ],
      tests: [
        { id: "t1", description: "Default tint lightens by a quarter", assertionCode: py`_t = tint((100, 100, 100))
assert _t == (139, 139, 139), f"tint((100, 100, 100)) should be (139, 139, 139) (a quarter of the way to white), got {_t}"` },
        { id: "t2", description: "amount changes how far it moves", assertionCode: py`assert tint((0, 0, 0), 1.0) == (255, 255, 255), "amount=1.0 should go all the way to the target"
assert tint((10, 20, 30), 0) == (10, 20, 30), "amount=0 should leave the colour unchanged"` },
        { id: "t3", description: "target can be named", assertionCode: py`_t = tint((100, 100, 100), target=(0, 0, 0))
assert _t == (75, 75, 75), f"tint((100, 100, 100), target=(0, 0, 0)) should be (75, 75, 75), got {_t}"` },
        { id: "t4", description: "Returns a tuple of whole numbers", assertionCode: py`_t = tint((200, 10, 90), 0.5)
assert isinstance(_t, tuple) and len(_t) == 3, "tint must return a tuple of 3 numbers"
assert all(type(_v) is int for _v in _t), "Each light must be a whole number: wrap the sum in round()"` },
        { id: "t5", description: "shade is a half-dark ink", assertionCode: py`assert shade == tint(ink, 0.5, (0, 0, 0)), "shade should be tint(ink, amount=0.5, target=(0, 0, 0))"` },
      ],
      unlocks: ["as-tints"],
      checks: [
        {
          prompt: "For `def greet(name, shout=False):`, which call is allowed?",
          question: { type: "choice", options: ["`greet()`", "`greet(\"Ada\")`", "`greet(shout=True)`"], answer: 1 },
          explanation: "`name` has no default, so you must give it. `shout` has a default, so you may leave it out.",
        },
        {
          prompt: "With `def frame(text, mark=\"*\", count=3)`, what does `frame(\"Hi\", count=1)` return?",
          question: { type: "text", answer: ["* Hi *"] },
          explanation: "`count=1` changes only the count. `mark` keeps its default `*`, so the result is `* Hi *`.",
        },
      ],
    },

    // ───────────────────────── 3 ─────────────────────────
    {
      id: "art-studio-3-extremes",
      title: "Darkest and lightest: two answers at once",
      minutes: 14,
      xp: 80,
      concepts: ["returning several values", "tuple unpacking", "brightness"],
      learn: md`### A question with two answers

On the ink shelf the printer always asks the same thing: "Which ink is darkest and which is lightest?" Both answers come from one pass over the shelf, so it would be silly to walk the shelf twice.

A function can \`return\` more than one value. Separate them with commas. Python packs them into a tuple, and the caller unpacks them, exactly like lesson 1.

~~~python
def low_high(numbers):
    low = numbers[0]
    high = numbers[0]
    for n in numbers:
        if n < low:
            low = n
        if n > high:
            high = n
    return low, high

smallest, biggest = low_high([4, 9, 2, 7])
print(smallest, biggest)
~~~

~~~text
2 9
~~~

Trace: low and high start at 4. 9 beats high. 2 beats low. 7 changes nothing. Without unpacking you get the whole tuple:

~~~python
both = low_high([4, 9, 2, 7])
print(both)        # (2, 9)
~~~

### How bright is a colour?

To compare inks you need one number for "how bright". The simplest is the average of the three lights: add them and divide by 3. The function \`round()\` makes it a whole number.

~~~python
def brightness(colour):
    r, g, b = colour
    return round((r + g + b) / 3)

print(brightness((255, 255, 255)))   # 255
print(brightness((30, 60, 90)))      # 60
~~~

A bigger number means a lighter colour.`,
      mission: `The shop's shelf holds five inks (given in your starter). Write \`brightness(colour)\`, then \`extremes(colours)\`, which returns the darkest ink and the lightest ink as two values.

Unpack the answer into \`darkest\` and \`lightest\`. Both appear on the bench.`,
      tasks: [
        "def brightness(colour): the average of the three lights, rounded to a whole number",
        "def extremes(colours): loop through the list and return darkest, lightest (two values)",
        "darkest, lightest = extremes(swatches)",
      ],
      starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 3: find the darkest and lightest ink on the shelf.
swatches = [(240, 90, 60), (30, 70, 130), (250, 215, 80), (25, 25, 30), (242, 238, 225)]

def brightness(colour):
    # the average of the three lights, rounded
    ...

def extremes(colours):
    # loop through colours; keep the darkest and lightest seen so far; return both
    ...

darkest, lightest = ..., ...      # unpack the answer of extremes(swatches)
`,
      solutionAdd: py`swatches = [(240, 90, 60), (30, 70, 130), (250, 215, 80), (25, 25, 30), (242, 238, 225)]

def brightness(colour):
    r, g, b = colour
    return round((r + g + b) / 3)

def extremes(colours):
    darkest = colours[0]
    lightest = colours[0]
    for colour in colours:
        if brightness(colour) < brightness(darkest):
            darkest = colour
        if brightness(colour) > brightness(lightest):
            lightest = colour
    return darkest, lightest

darkest, lightest = extremes(swatches)`,
      explanation:
        "return a, b really returns one tuple (a, b). The caller unpacks it into two names. extremes walks the shelf once, remembering the best candidates for darkest and lightest as it goes.",
      hints: [
        { id: "h1", title: "brightness", content: "r, g, b = colour, then return round((r + g + b) / 3)." },
        { id: "h2", title: "extremes", content: "Start with darkest = colours[0] and lightest = colours[0]. In the loop, replace darkest when brightness(colour) < brightness(darkest), and lightest when it is greater." },
        { id: "h3", title: "Two values", content: "End the function with: return darkest, lightest. Then: darkest, lightest = extremes(swatches)" },
      ],
      tests: [
        { id: "t1", description: "brightness averages the lights", assertionCode: py`assert brightness((255, 255, 255)) == 255, "brightness((255, 255, 255)) should be 255"
assert brightness((30, 60, 90)) == 60, "brightness((30, 60, 90)) should be 60 (the average)"
assert type(brightness((10, 10, 11))) is int, "brightness should return a whole number: use round()"` },
        { id: "t2", description: "extremes returns two values", assertionCode: py`_e = extremes([(10, 10, 10), (200, 200, 200), (90, 90, 90)])
assert isinstance(_e, tuple) and len(_e) == 2, "extremes should return two values: return darkest, lightest"
assert _e == ((10, 10, 10), (200, 200, 200)), f"extremes should give the darkest then the lightest, got {_e}"` },
        { id: "t3", description: "Works when the order is shuffled", assertionCode: py`_e = extremes([(200, 200, 200), (90, 90, 90), (10, 10, 10)])
assert _e == ((10, 10, 10), (200, 200, 200)), f"The darkest and lightest can be anywhere in the list, got {_e}"` },
        { id: "t4", description: "darkest and lightest unpack the shelf", assertionCode: py`assert darkest == (25, 25, 30), f"darkest should be (25, 25, 30), got {darkest}"
assert lightest == (242, 238, 225), f"lightest should be (242, 238, 225), got {lightest}"` },
      ],
      unlocks: ["as-extremes"],
      checks: [
        {
          prompt: "What does `def f(): return 1, 2` actually return?",
          question: { type: "choice", options: ["Two separate values at once", "One tuple: `(1, 2)`", "A list: `[1, 2]`"], answer: 1 },
          explanation: "Commas build a tuple, so a function can only ever return one thing. That one thing just happens to hold two values, and unpacking splits it again.",
        },
      ],
    },

    // ───────────────────────── 4 ─────────────────────────
    {
      id: "art-studio-4-hex",
      title: "Hex codes and tidy columns",
      minutes: 14,
      xp: 80,
      concepts: ["f-string format specs", "width and alignment", "hex"],
      learn: md`### Why print colours as codes?

Every ink tin in the shop has a label. The label has to be short and tidy so that a whole shelf of labels lines up in neat columns. On the web a colour is written as a **hex code** like \`#e63946\`: the red, green and blue lights, two characters each. Hex counts in sixteens, using the digits 0 to 9 and then the letters a to f, so a light of 0 to 255 always fits in two characters (\`00\` to \`ff\`).

### Format specs

You already know f-strings: \`f"{name}"\` drops a value into text. After a colon inside the braces you can add a **format spec** that says how to show it:

- a number is the minimum **width**: spaces are added to fill it
- \`<\` left-aligns, \`>\` right-aligns, \`^\` centres
- \`0\` before the width fills with zeros instead of spaces
- \`x\` shows a whole number in hex (lowercase)

~~~python
n = 7
word = "ab"
print(f"[{n:3}]")       # [  7]
print(f"[{n:<3}]")      # [7  ]
print(f"[{n:^3}]")      # [ 7 ]
print(f"[{word:>5}]")   # [   ab]
print(f"[{n:03}]")      # [007]
print(f"[{255:x}]")     # [ff]
print(f"[{10:02x}]")    # [0a]
~~~

Numbers line up to the right by default and text to the left, until you choose with \`<\`, \`>\` or \`^\`. \`02x\` means "hex, at least 2 characters, padded with zeros", which is exactly what a colour light needs.

Putting it together for one colour:

~~~python
red, green, blue = (230, 57, 70)
print(f"#{red:02x}{green:02x}{blue:02x}")     # #e63946
~~~

The \`#\` outside the braces is just a normal character.`,
      mission: `Every tin needs a label. Write \`hex_code(colour)\`, which returns the hex string for a colour, and \`label(name, colour)\`, which returns the name padded to 10 characters on the left followed by the hex code, so labels line up in a column.

The bench's label rack fills with your formatting.`,
      tasks: [
        "def hex_code(colour): return text like \"#f05a3c\" (two hex characters per light, zero-padded)",
        "def label(name, colour): the name left-aligned in width 10, then the hex code",
        "Print label(\"ink\", ink) so you can see it",
      ],
      starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 4: label the tins.
def hex_code(colour):
    # unpack the colour, then f"#{...:02x}..." for each light
    ...

def label(name, colour):
    # f"{name:<10}" pads the name to 10 characters; then add the hex code
    ...

# print(label("ink", ink))
`,
      solutionAdd: py`def hex_code(colour):
    r, g, b = colour
    return f"#{r:02x}{g:02x}{b:02x}"

def label(name, colour):
    return f"{name:<10}{hex_code(colour)}"

print(label("ink", ink))`,
      explanation:
        "02x means hex, two characters wide, padded with zeros. <10 means left-align in a field of width 10. Together they turn colours into labels that line up.",
      hints: [
        { id: "h1", title: "Unpack first", content: "r, g, b = colour gives you three whole numbers to format." },
        { id: "h2", title: "One light", content: "{r:02x} shows r in hex with two characters. The whole string is f\"#{r:02x}{g:02x}{b:02x}\"" },
        { id: "h3", title: "Label", content: "return f\"{name:<10}{hex_code(colour)}\" pads name to 10 characters then adds the code." },
      ],
      tests: [
        { id: "t1", description: "hex_code writes #rrggbb", assertionCode: py`assert hex_code((255, 0, 128)) == "#ff0080", f"hex_code((255, 0, 128)) should be '#ff0080', got {hex_code((255, 0, 128))!r}"` },
        { id: "t2", description: "Small lights are zero-padded", assertionCode: py`assert hex_code((1, 10, 15)) == "#010a0f", f"Each light needs two characters: expected '#010a0f', got {hex_code((1, 10, 15))!r}"` },
        { id: "t3", description: "label pads the name to 10", assertionCode: py`assert label("ink", (0, 0, 0)) == "ink       #000000", f"label('ink', (0, 0, 0)) should be 'ink' padded to 10 characters, then #000000, got {label('ink', (0, 0, 0))!r}"` },
        { id: "t4", description: "Prints the label for ink", assertionCode: py`_s = label("ink", ink)
assert isinstance(_s, str) and _s in __stdout__, 'Print label("ink", ink)'` },
      ],
      unlocks: ["as-hex"],
      checks: [
        {
          prompt: "What does `f\"{5:03}\"` produce?",
          question: { type: "text", answer: ["005"] },
          explanation: "`03` means a width of 3, padded with zeros, so 5 becomes `005`.",
        },
        {
          prompt: "Which spec centres text in a field of width 9?",
          question: { type: "choice", options: ["`:<9`", "`:>9`", "`:^9`"], answer: 2 },
          explanation: "`<` is left, `>` is right and `^` is centre.",
        },
      ],
    },
  ],
};
