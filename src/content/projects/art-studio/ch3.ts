import type { Chapter } from "@/engine/types";
import { md, py } from "./util.ts";

/**
 * Chapter 3: Words and palettes. String slicing, cleaning/splitting/joining text, dictionaries as
 * palettes (get, in) and looping over dictionaries.
 *
 * Names this chapter adds: poster_title, stamp, tail, mirror, short_title, edition, raw_title,
 * clean_title, hashtag, banner, headline, tag, palette, colour_for, has_colour, colour_names,
 * palette_lines, dark_names, average_brightness.
 */
export const chapter3: Chapter = {
  id: "words",
  title: "Words and palettes",
  blurb: "Cut, clean and centre the poster's text, then keep every ink in a named palette.",
  lessons: [
    // ───────────────────────── 9 ─────────────────────────
    {
      id: "art-studio-9-slicing",
      title: "Cut a title with slices",
      minutes: 14,
      xp: 80,
      concepts: ["string indexing", "slicing", "negative positions", "step"],
      learn: md`### Why cut text?

A poster title is long, but the corner stamp only has room for seven letters. And a screen-printing plate is mirrored, so the shop needs text written backwards. Both jobs mean taking part of a string.

A string is a row of characters, and like a list or tuple each one has a position starting at 0.

~~~python
text = "market"
print(text[0])        # m
print(text[5])        # t
print(text[-1])       # t   (-1 counts from the end)
~~~

### Slices

A **slice** takes a piece. Write \`[start:stop]\`: it starts at \`start\` and stops just before \`stop\`. The stop position itself is not included.

~~~python
print(text[1:4])      # ark
print(text[:3])       # mar   (leave out start: begin at 0)
print(text[3:])       # ket   (leave out stop: go to the end)
print(text[-2:])      # et    (the last two characters)
~~~

For \`"market"\` the positions are m=0, a=1, r=2, k=3, e=4, t=5. So \`[1:4]\` takes positions 1, 2 and 3: \`ark\`.

A third number is the **step**. A step of -1 walks backwards, so \`[::-1]\` reverses a whole string:

~~~python
print(text[::-1])     # tekram
print(text[::2])      # mre   (every second character)
~~~

A slice never crashes when you ask for too much: \`"ink"[:10]\` is just \`"ink"\`. Strings cannot be changed in place either, so a slice always makes a new string and the original stays as it was.`,
      mission: `The corner of the poster has a small stamp, and the printing plate is a mirror image.

Give the poster a title, then write three slice helpers: \`stamp(text, n)\` for the first n characters, \`tail(text, n)\` for the last n, and \`mirror(text)\` for the reversed text. Use them on your title.`,
      tasks: [
        "poster_title: a string of at least 12 characters, e.g. \"Lantern Night Market\"",
        "def stamp(text, n), def tail(text, n), def mirror(text), each a single slice",
        "short_title = stamp(poster_title, 7) and edition = tail(poster_title, 6)",
      ],
      starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 9: slice the title.
poster_title = ...      # e.g. "Lantern Night Market"

def stamp(text, n):
    # the first n characters
    ...

def tail(text, n):
    # the last n characters
    ...

def mirror(text):
    # the text backwards
    ...

short_title = ...      # the first 7 characters of poster_title
edition = ...          # the last 6 characters of poster_title
`,
      solutionAdd: py`poster_title = "Lantern Night Market"

def stamp(text, n):
    return text[:n]

def tail(text, n):
    return text[-n:]

def mirror(text):
    return text[::-1]

short_title = stamp(poster_title, 7)
edition = tail(poster_title, 6)`,
      explanation:
        "text[:n] keeps the first n characters, text[-n:] the last n, and text[::-1] walks the whole string backwards. A slice makes a new string; the original is untouched.",
      hints: [
        { id: "h1", title: "stamp", content: "return text[:n] takes everything before position n." },
        { id: "h2", title: "tail", content: "return text[-n:] starts n characters from the end and runs to the end." },
        { id: "h3", title: "mirror", content: "return text[::-1]. The step of -1 reads the text backwards." },
      ],
      tests: [
        { id: "t1", description: "poster_title is a long enough string", assertionCode: py`assert isinstance(poster_title, str) and len(poster_title) >= 12, "poster_title should be a string of at least 12 characters"` },
        { id: "t2", description: "stamp takes the first characters", assertionCode: py`assert stamp("market", 3) == "mar", f"stamp('market', 3) should be 'mar', got {stamp('market', 3)!r}"
assert stamp("ink", 10) == "ink", "stamp with a big n should just give the whole text"` },
        { id: "t3", description: "tail takes the last characters", assertionCode: py`assert tail("market", 2) == "et", f"tail('market', 2) should be 'et', got {tail('market', 2)!r}"` },
        { id: "t4", description: "mirror reverses text", assertionCode: py`assert mirror("market") == "tekram", f"mirror('market') should be 'tekram', got {mirror('market')!r}"` },
        { id: "t5", description: "short_title and edition use your helpers", assertionCode: py`assert short_title == poster_title[:7], "short_title should be the first 7 characters of poster_title"
assert edition == poster_title[-6:], "edition should be the last 6 characters of poster_title"` },
      ],
      unlocks: ["as-slices"],
      checks: [
        {
          prompt: "What is `\"printing\"[2:5]`?",
          question: { type: "text", answer: ["int"] },
          explanation: "Positions: p=0, r=1, i=2, n=3, t=4, i=5. A slice from 2 up to (not including) 5 is `int`.",
        },
        {
          prompt: "What does `\"abc\"[::-1]` give?",
          question: { type: "text", answer: ["cba"] },
          explanation: "A step of -1 walks the string backwards.",
        },
      ],
    },

    // ───────────────────────── 10 ─────────────────────────
    {
      id: "art-studio-10-clean-text",
      title: "Tidy text: strip, replace, split, join",
      minutes: 16,
      xp: 90,
      concepts: ["strip", "replace", "upper", "split", "join", "center"],
      learn: md`### Text arrives messy

The shop's order form was typed by hand. A customer's title comes with stray spaces, a trailing newline and underscores where spaces should be: \`"  lantern_night_market \n"\`. Before it can go on a poster it needs cleaning. Strings come with built-in tools called **methods**, written with a dot after the string: \`text.strip()\`.

Every method gives back a **new** string. The original never changes.

~~~python
raw = "  night_market \n"
a = raw.strip()            # "night_market"      (spaces and newline gone from both ends)
b = a.replace("_", " ")    # "night market"      (every _ becomes a space)
c = b.upper()              # "NIGHT MARKET"      (capital letters)
print(c)
~~~

~~~text
NIGHT MARKET
~~~

\`.lower()\` does the opposite of \`.upper()\`. Because each method returns a string, you can chain them: \`raw.strip().replace("_", " ").upper()\` does all three in one line, left to right.

### split and join

\`.split()\` cuts a string into a list of words, using spaces as the cuts. \`"sep".join(words)\` glues a list of words together with \`sep\` between them. It is called on the glue, not on the list.

~~~python
words = "NIGHT MARKET".split()
print(words)                 # ['NIGHT', 'MARKET']
print("-".join(words))       # NIGHT-MARKET
print("".join(words))        # NIGHTMARKET
~~~

Joining with \`""\` (nothing) simply sticks the words together.

### center: a banner in one call

\`text.center(width, fill)\` pads both sides of the text with the fill character until it is \`width\` characters wide. It is the same job as \`:^\` in lesson 4.

~~~python
print("HI".center(8, "="))   # ===HI===
~~~`,
      mission: `The order form for the market poster is in your starter. Clean it up.

Write \`clean_title(raw)\`: strip it, turn underscores into spaces and make it uppercase. Write \`hashtag(title)\`: a \`#\` followed by the lowercase words stuck together. Write \`banner(text, width=30)\`: the text with a space on each side, centred in \`=\` characters. Then print the banner for your cleaned title.`,
      tasks: [
        "def clean_title(raw): strip, replace \"_\" with \" \", then upper",
        "def hashtag(title): \"#\" + the lowercase words joined with nothing between",
        "def banner(text, width=30): f\" {text} \" centred with \"=\"",
        "headline = clean_title(raw_title), tag = hashtag(headline), then print(banner(headline, 32))",
      ],
      starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 10: clean up the order form.
raw_title = "  lantern_night_market \n"

def clean_title(raw):
    # strip, replace "_" with " ", upper
    ...

def hashtag(title):
    # "#" + lowercase words with nothing between them
    ...

def banner(text, width=30):
    # " text " centred in "=" characters
    ...

headline = ...      # the cleaned raw_title
tag = ...           # hashtag(headline)
# print(banner(headline, 32))
`,
      solutionAdd: py`raw_title = "  lantern_night_market \n"

def clean_title(raw):
    return raw.strip().replace("_", " ").upper()

def hashtag(title):
    return "#" + "".join(title.lower().split())

def banner(text, width=30):
    return f" {text} ".center(width, "=")

headline = clean_title(raw_title)
tag = hashtag(headline)
print(banner(headline, 32))`,
      explanation:
        "Methods return new strings, so they chain. split turns text into words, join glues words back with whatever you choose, and center pads both sides to a width.",
      hints: [
        { id: "h1", title: "clean_title", content: "return raw.strip().replace(\"_\", \" \").upper()" },
        { id: "h2", title: "hashtag", content: "title.lower().split() makes a list of lowercase words. \"\".join(that) glues them. Put \"#\" in front." },
        { id: "h3", title: "banner", content: "return f\" {text} \".center(width, \"=\") adds a space on each side, then fills the rest with =." },
      ],
      tests: [
        { id: "t1", description: "clean_title tidies messy text", assertionCode: py`assert clean_title("  night_market \n") == "NIGHT MARKET", f"clean_title should give 'NIGHT MARKET', got {clean_title('  night_market ')!r}"` },
        { id: "t2", description: "hashtag glues lowercase words", assertionCode: py`assert hashtag("NIGHT MARKET") == "#nightmarket", f"hashtag('NIGHT MARKET') should be '#nightmarket', got {hashtag('NIGHT MARKET')!r}"` },
        { id: "t3", description: "banner centres in = characters", assertionCode: py`assert banner("HI", 8) == "== HI ==", f"banner('HI', 8) should be '== HI ==', got {banner('HI', 8)!r}"
assert len(banner("poster")) == 30, "banner's default width should be 30"` },
        { id: "t4", description: "headline and tag are made from raw_title", assertionCode: py`assert headline == "LANTERN NIGHT MARKET", f"headline should be 'LANTERN NIGHT MARKET', got {headline!r}"
assert tag == "#lanternnightmarket", f"tag should be '#lanternnightmarket', got {tag!r}"` },
        { id: "t5", description: "Prints the banner", assertionCode: py`assert __stdout__.strip().splitlines()[-1] == banner(headline, 32), "The last line printed should be print(banner(headline, 32))"` },
      ],
      unlocks: ["as-banner"],
      checks: [
        {
          prompt: "What does `\" a b \".strip()` return?",
          question: { type: "text", answer: ["a b"] },
          explanation: "`strip()` removes spaces from both ends only. The space inside stays.",
        },
        {
          prompt: "What does `\"-\".join([\"a\", \"b\", \"c\"])` return?",
          question: { type: "text", answer: ["a-b-c"] },
          explanation: "`join` is called on the glue string and puts it between the items.",
        },
      ],
    },

    // ───────────────────────── 11 ─────────────────────────
    {
      id: "art-studio-11-palette",
      title: "A palette of named inks",
      minutes: 15,
      xp: 90,
      concepts: ["dictionary lookup", "get with a default", "in", "adding keys"],
      learn: md`### Remember inks by name

A shelf of five inks in a list is awkward: "give me ink number 3" means counting. Printers say "the poppy red". You already know a container that looks things up by a name instead of a position: the **dictionary**. Each entry pairs a **key** (the name) with a **value** (the colour).

~~~python
prices = {"stamp": 3, "poster": 12}
print(prices["poster"])        # 12
~~~

Asking for a key that is not there is an error:

~~~python
print(prices["sticker"])
~~~

~~~text
KeyError: 'sticker'
~~~

### get: a safe lookup

\`prices.get(key, default)\` returns the value if the key exists, and your default if it does not. No crash.

~~~python
print(prices.get("poster", 0))     # 12
print(prices.get("mug", 0))        # 0
~~~

### in: is the key there?

\`key in prices\` is \`True\` or \`False\`. It looks at keys, not values.

~~~python
print("mug" in prices)             # False
print("stamp" in prices)           # True
~~~

### Adding and changing

Assign to a key to add it. If it already exists, its value is replaced.

~~~python
prices["mug"] = 8
prices["poster"] = 14
print(prices)         # {'stamp': 3, 'poster': 14, 'mug': 8}
~~~

Dictionaries keep the order that keys were added.`,
      mission: `The shelf is getting crowded, so give every ink a name. Build the shop's \`palette\` dictionary from the five inks in your swatches, then add a sixth, plum.

Write \`colour_for(name, fallback)\`, which looks an ink up safely, and \`has_colour(name)\`, which says whether the palette has it.`,
      tasks: [
        "palette: poppy (240, 90, 60), navy (30, 70, 130), saffron (250, 215, 80), charcoal (25, 25, 30), paper (242, 238, 225)",
        "Add \"plum\" with (142, 68, 173) by assigning to palette[\"plum\"]",
        "def colour_for(name, fallback=(128, 128, 128)) using .get, and def has_colour(name) using in",
      ],
      starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 11: a palette of named inks.
palette = ...      # {"poppy": (240, 90, 60), ...} with the five inks from the task list

# Now add plum: palette["plum"] = ...

def colour_for(name, fallback=(128, 128, 128)):
    # look the name up; use fallback if it is missing
    ...

def has_colour(name):
    # True if the palette has this name
    ...
`,
      solutionAdd: py`palette = {
    "poppy": (240, 90, 60),
    "navy": (30, 70, 130),
    "saffron": (250, 215, 80),
    "charcoal": (25, 25, 30),
    "paper": (242, 238, 225),
}
palette["plum"] = (142, 68, 173)

def colour_for(name, fallback=(128, 128, 128)):
    return palette.get(name, fallback)

def has_colour(name):
    return name in palette`,
      explanation:
        "A dictionary maps names to colours. palette[name] crashes on a missing key, palette.get(name, fallback) does not, and name in palette checks first.",
      hints: [
        { id: "h1", title: "Entries", content: "Each entry is \"name\": (r, g, b), separated by commas inside curly brackets." },
        { id: "h2", title: "Adding", content: "palette[\"plum\"] = (142, 68, 173) adds a new key." },
        { id: "h3", title: "Lookups", content: "colour_for: return palette.get(name, fallback). has_colour: return name in palette." },
      ],
      tests: [
        { id: "t1", description: "palette has the five inks plus plum", assertionCode: py`assert isinstance(palette, dict), "palette should be a dictionary: curly brackets with name: colour pairs"
assert palette.get("poppy") == (240, 90, 60), "poppy should be (240, 90, 60)"
assert palette.get("navy") == (30, 70, 130), "navy should be (30, 70, 130)"
assert palette.get("saffron") == (250, 215, 80), "saffron should be (250, 215, 80)"
assert palette.get("charcoal") == (25, 25, 30), "charcoal should be (25, 25, 30)"
assert palette.get("paper") == (242, 238, 225), "paper should be (242, 238, 225)"` },
        { id: "t2", description: "plum was added", assertionCode: py`assert palette.get("plum") == (142, 68, 173), "Add plum: palette[\"plum\"] = (142, 68, 173)"
assert len(palette) == 6, "palette should have 6 inks"` },
        { id: "t3", description: "colour_for returns a colour or the fallback", assertionCode: py`assert colour_for("navy") == (30, 70, 130), "colour_for('navy') should be the navy tuple"
assert colour_for("neon") == (128, 128, 128), "A missing name should give the default fallback (128, 128, 128)"
assert colour_for("neon", (1, 2, 3)) == (1, 2, 3), "A fallback you pass in should be used"` },
        { id: "t4", description: "has_colour checks the keys", assertionCode: py`assert has_colour("plum") is True, "has_colour('plum') should be True"
assert has_colour("neon") is False, "has_colour('neon') should be False"` },
      ],
      unlocks: ["as-palette"],
      checks: [
        {
          prompt: "For `d = {\"a\": 1}`, what does `d.get(\"b\", 0)` return?",
          question: { type: "number", answer: 0 },
          explanation: "`b` is not a key, so `get` returns the default you gave it instead of crashing.",
        },
        {
          prompt: "Does `1 in {\"a\": 1}` check the keys or the values?",
          question: { type: "choice", options: ["Keys", "Values"], answer: 0 },
          explanation: "`in` on a dictionary looks at keys. Here the only key is `a`, so the answer is `False`.",
        },
      ],
    },

    // ───────────────────────── 12 ─────────────────────────
    {
      id: "art-studio-12-dict-loops",
      title: "Walk the palette: keys, values, items",
      minutes: 16,
      xp: 90,
      concepts: ["for over a dict", "keys()", "values()", "items()"],
      learn: md`### Reports need every ink

At the end of the day the printer wants a tin-by-tin report: every name next to its hex code, which inks are dark, the average brightness. That means visiting every entry of the palette.

There are three ways to loop over a dictionary, depending on what you need.

~~~python
prices = {"stamp": 3, "poster": 12, "mug": 8}

for item in prices:                  # the keys (same as prices.keys())
    print(item)
~~~

~~~text
stamp
poster
mug
~~~

~~~python
for price in prices.values():        # just the values
    print(price)                     # 3, 12, 8 on separate lines

for item, price in prices.items():   # key and value together
    print(item, price)
~~~

~~~text
stamp 3
poster 12
mug 8
~~~

\`.items()\` hands out one (key, value) pair per round, and the loop unpacks it into two names, like \`zip\` did. Use \`.keys()\` or the plain dictionary when you need names, \`.values()\` when you only need the colours, and \`.items()\` when you need both.

\`list(prices.keys())\` turns the keys into a real list: \`['stamp', 'poster', 'mug']\`.

### A pattern you will use a lot

Collect the entries that pass a test:

~~~python
cheap = []
for item, price in prices.items():
    if price < 10:
        cheap.append(item)
print(cheap)         # ['stamp', 'mug']
~~~`,
      mission: `Write the day-end report. \`palette_lines(colours)\` returns one \`label\` line per ink (name and hex). \`dark_names(colours, limit=100)\` returns the names of inks whose brightness is below the limit. \`average_brightness(colours)\` returns the average brightness of all the inks, rounded.

Print the report lines and keep the list of names.`,
      tasks: [
        "def palette_lines(colours): use .items() and your label() function",
        "def dark_names(colours, limit=100): names whose brightness(colour) is below limit",
        "def average_brightness(colours): use .values(); add the brightness of each colour, divide by how many, round",
        "colour_names = list(palette.keys()), then print each line of palette_lines(palette)",
      ],
      starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 12: the day-end report.
def palette_lines(colours):
    # one label(name, colour) per entry; return the list of lines
    ...

def dark_names(colours, limit=100):
    # names whose brightness is below limit
    ...

def average_brightness(colours):
    # the average brightness of all the colours, rounded
    ...

colour_names = ...     # the palette's names as a list

# Print every line of palette_lines(palette), one per line.
`,
      solutionAdd: py`def palette_lines(colours):
    lines = []
    for name, colour in colours.items():
        lines.append(label(name, colour))
    return lines

def dark_names(colours, limit=100):
    names = []
    for name, colour in colours.items():
        if brightness(colour) < limit:
            names.append(name)
    return names

def average_brightness(colours):
    total = 0
    for colour in colours.values():
        total += brightness(colour)
    return round(total / len(colours))

colour_names = list(palette.keys())

for line in palette_lines(palette):
    print(line)`,
      explanation:
        ".items() gives the name and the colour together, .values() only the colours, and iterating the dictionary itself (or .keys()) just the names.",
      hints: [
        { id: "h1", title: "palette_lines", content: "lines = [] then for name, colour in colours.items(): lines.append(label(name, colour)). Return lines." },
        { id: "h2", title: "dark_names", content: "Same loop, but only append name when brightness(colour) < limit." },
        { id: "h3", title: "average", content: "total = 0, then for colour in colours.values(): total += brightness(colour). return round(total / len(colours))" },
      ],
      tests: [
        { id: "t1", description: "palette_lines gives one label per ink", assertionCode: py`_l = palette_lines({"a": (0, 0, 0), "b": (255, 255, 255)})
assert _l == ["a         #000000", "b         #ffffff"], f"palette_lines should give label() lines, got {_l}"` },
        { id: "t2", description: "dark_names respects the limit", assertionCode: py`_d = {"dim": (10, 10, 10), "mid": (100, 100, 100), "lit": (250, 250, 250)}
assert dark_names(_d) == ["dim"], f"With the default limit 100, only 'dim' is dark, got {dark_names(_d)}"
assert dark_names(_d, 200) == ["dim", "mid"], f"With limit 200, 'dim' and 'mid' are dark, got {dark_names(_d, 200)}"` },
        { id: "t3", description: "average_brightness averages the inks", assertionCode: py`assert average_brightness({"a": (0, 0, 0), "b": (90, 90, 90)}) == 45, "average_brightness of brightness 0 and 90 should be 45"` },
        { id: "t4", description: "colour_names lists the palette's names", assertionCode: py`assert colour_names == list(palette), "colour_names should be list(palette.keys())"` },
        { id: "t5", description: "Prints the report", assertionCode: py`_lines = palette_lines(palette)
assert isinstance(_lines, list) and len(_lines) == len(palette), "palette_lines(palette) should return one line per ink"
for _line in _lines:
    assert _line in __stdout__, "Print every line of palette_lines(palette)"` },
      ],
      unlocks: ["as-report"],
      checks: [
        {
          prompt: "Which loop gives you both the name and the colour of each palette entry?",
          question: {
            type: "choice",
            options: ["`for x in palette:`", "`for x in palette.values():`", "`for name, colour in palette.items():`"],
            answer: 2,
          },
          explanation: "`.items()` yields (key, value) pairs, and the loop unpacks each pair into two names.",
        },
      ],
    },
  ],
};
