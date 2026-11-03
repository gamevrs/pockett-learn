import type { Chapter } from "@/engine/types";
import { KINDS_AND_PEBBLES, md, py } from "./util.ts";

/**
 * Chapter 1: Rules or examples? Pip meets the beach, writes a rule by hand and watches it fail, then
 * switches to labelled examples, features, labels and a simple measure of "how alike".
 */

export const chapter1: Chapter = {
  id: "rules",
  title: "Rules or examples?",
  blurb: "Write a rule by hand, watch it fail, then let examples do the teaching.",
  lessons: [
    // ───────────────────────── 1 ─────────────────────────
    {
      id: "ai-first-steps-1-rules",
      title: "A rule you write by hand",
      minutes: 22,
      xp: 70,
      concepts: ["rule", "if / else", "dictionary", "machine learning"],
      learn: md`### Meet Pip

Every morning the tide drops thousands of pebbles on the beach. A little robot called **Pip** has to put each one in the right bucket:

- a **skipper** is flat and smooth, great for skimming over the water,
- a **roller** is round and plain, good for rolling and not much else,
- a **sparkler** is shiny and glittery.

Pip has two sensors. Each one gives a whole number from 1 to 9:

- \`flat\`: 1 means round like a marble, 9 means thin like a coin.
- \`shine\`: 1 means dull like a biscuit, 9 means glittery like foil.

### One pebble in Python

You met dictionaries in Turbo Garage: a dictionary is a set of labelled boxes. One measured pebble is a dictionary with a box for each sensor:

~~~python
pebble = {"flat": 8, "shine": 2}
print(pebble["flat"])    # opens the box called "flat"
~~~

The screen shows:

~~~text
8
~~~

### A rule is an instruction that always answers the same way

A **rule** says "if you see this, answer that". Here is one rule Pip could follow. A pebble that is flat enough is a skipper, anything else is a roller:

~~~python
def hand_rule(pebble):
    if pebble["flat"] >= 6:
        return "skipper"
    return "roller"

print(hand_rule({"flat": 8, "shine": 2}))
print(hand_rule({"flat": 2, "shine": 3}))
~~~

Trace, step by step. The first pebble has \`flat\` 8. The test \`8 >= 6\` is true, so the function returns \`"skipper"\` and stops. The second pebble has \`flat\` 2. The test \`2 >= 6\` is false, so Python skips to the last line and returns \`"roller"\`. The screen shows:

~~~text
skipper
roller
~~~

(\`>=\` means "greater than or equal to", so a pebble with \`flat\` exactly 6 is also a skipper.)

### Rules only know what you thought of

Look again at \`hand_rule\`. It knows two buckets, and it never heard of sparklers. Show it a glittery pebble and it can only say "skipper" or "roller", and both are wrong. You could add another rule for shiny pebbles, then another for odd shapes, and the pile of rules keeps growing. Every surprise needs a person to notice it and write a new rule.

Imagine teaching a small child to sort the pebbles by telling them rules. Now imagine showing them a hundred pebbles, each with the right bucket named, and letting them work out the pattern on their own. That second way is what this whole course is about.

**Machine learning** means exactly that: instead of writing the rules yourself, you show the computer many **examples** where the right answer is already known, and it finds a way to guess the answer for new things. In this course you will build that, with plain Python and no special tools.

### How the screen works (same as Turbo Garage)

Type in the editor. **Run** runs your code and the **Console** tab shows what you \`print\`. **Submit** checks your work: the **Checks** tab lists each check and whether it passes. Red text is an *error*, which is a hint, not a punishment: read the last line, it says what went wrong and on which line.`,
      mission: md`Pip's first idea is the rule above. Your job is to write it, and then catch it making a mistake.

Fill in \`hand_rule\`. Then look at the new pebble \`mystery\`: its clues say \`flat\` 8 and \`shine\` 7, and a person has checked that it is really a **sparkler**. Ask your rule what it thinks and write down whether the rule was right.

When this lesson passes, the **Rule board** appears and shows the rule's guess against the truth.`,
      tasks: [
        "hand_rule(pebble): return \"skipper\" when pebble[\"flat\"] is 6 or more, otherwise \"roller\"",
        "hand_guess: what hand_rule says about the mystery pebble",
        "hand_correct: True if hand_guess equals truth, otherwise False",
        "Run it and read the sentence in the Console",
      ],
      starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 1: a rule written by hand.
#
# Pip's first rule: a pebble with flat 6 or more is a "skipper".
# Any other pebble is a "roller".


def hand_rule(pebble):
    """Return "skipper" or "roller" for one pebble (a dictionary)."""
    ...


# A new pebble that Pip has never met.
mystery = {"flat": 8, "shine": 7}
truth = "sparkler"  # what it REALLY is: a person checked

hand_guess = None  # what hand_rule says about the mystery pebble
hand_correct = None  # True if the rule was right, False if it was wrong

print("The rule says", hand_guess, "but the truth is", truth)`,
      solutionAdd: py`def hand_rule(pebble):
    if pebble["flat"] >= 6:
        return "skipper"
    return "roller"


# A new pebble that Pip has never met.
mystery = {"flat": 8, "shine": 7}
truth = "sparkler"  # what it REALLY is: a person checked

hand_guess = hand_rule(mystery)
hand_correct = hand_guess == truth

print("The rule says", hand_guess, "but the truth is", truth)`,
      explanation:
        "hand_rule follows one fixed instruction: flat pebbles are skippers, the rest are rollers. The mystery pebble is flat (8) so the rule says skipper, but it is really a sparkler. The rule never knew sparklers exist, so it could not get this right. That gap is the reason we will teach Pip with examples instead.",
      hints: [
        { id: "h1", title: "The shape of the function", content: 'Use an if: if pebble["flat"] >= 6: return "skipper". Put the second return, "roller", on a line after the if block (not indented inside it).' },
        { id: "h2", title: "Asking the rule", content: "Call your function with the mystery pebble and keep the answer: hand_guess = hand_rule(mystery)." },
        { id: "h3", title: "Was it right?", content: "== asks whether two things are equal and gives True or False. hand_correct = hand_guess == truth" },
      ],
      tests: [
        {
          id: "t1",
          description: "hand_rule says skipper for a flat pebble",
          assertionCode: py`
_got = hand_rule({"flat": 8, "shine": 2})
assert _got == "skipper", f'A pebble with flat 8 should be a "skipper", but hand_rule returned {_got!r}'
assert hand_rule({"flat": 6, "shine": 1}) == "skipper", 'flat exactly 6 counts as flat enough: use >= 6, not > 6'
`,
        },
        {
          id: "t2",
          description: "hand_rule says roller for a round pebble",
          assertionCode: py`
_got = hand_rule({"flat": 2, "shine": 3})
assert _got == "roller", f'A pebble with flat 2 should be a "roller", but hand_rule returned {_got!r}'
assert hand_rule({"flat": 5, "shine": 9}) == "roller", 'flat 5 is below 6, so the answer is "roller"'
`,
        },
        {
          id: "t3",
          description: "hand_guess is what the rule says about the mystery pebble",
          assertionCode: py`
assert hand_guess == hand_rule(mystery), "hand_guess should be hand_rule(mystery). Did you replace the None?"
assert hand_guess == "skipper", f'The mystery pebble has flat 8, so the rule should say "skipper", but hand_guess is {hand_guess!r}'
`,
        },
        {
          id: "t4",
          description: "hand_correct records that the rule was wrong",
          assertionCode: py`
assert hand_correct is False, f"The rule said {hand_guess!r} but the truth is {truth!r}, so hand_correct should be False. Try: hand_correct = hand_guess == truth"
`,
        },
      ],
      unlocks: ["pb-rule"],
      checks: [
        {
          prompt: "Why did the hand-written rule get the mystery pebble wrong?",
          question: {
            type: "choice",
            options: [
              "The computer made an arithmetic mistake",
              "The rule only knew about skippers and rollers, so it could not say sparkler",
              "Python cannot compare numbers",
              "The mystery pebble was too heavy",
            ],
            answer: 1,
          },
          explanation: "A rule only knows what its author thought of. Nobody wrote a rule for sparklers, so the rule could only pick one of its two buckets.",
        },
        {
          prompt: "In machine learning, what do we give the computer instead of hand-written rules?",
          question: {
            type: "choice",
            options: ["A longer list of if statements", "Many examples where the right answer is already known", "Faster hardware", "A bigger screen"],
            answer: 1,
          },
          explanation: "We show it examples with the answers filled in, and it works out how to guess for new things.",
        },
      ],
    },

    // ───────────────────────── 2 ─────────────────────────
    {
      id: "ai-first-steps-2-examples",
      title: "Labelled examples",
      minutes: 24,
      xp: 80,
      concepts: ["feature", "label", "dataset", "counting with a dictionary"],
      learn: md`### Flash cards for a robot

When you learn the names of animals, someone shows you a picture and says "that is a zebra". A flash card has the picture on the front and the answer on the back.

Pip learns from flash cards too. One **labelled example** is one pebble that was measured *and* has its true kind written next to it:

~~~python
{"flat": 6, "shine": 2, "kind": "skipper"}
~~~

Two new words, both easy:

- A **feature** is one measurement the robot is allowed to look at, like a clue on the front of the card. Here the features are \`flat\` and \`shine\`.
- The **label** is the answer on the back of the card: the \`kind\`. It is the thing we want Pip to be able to guess later.

A pile of labelled examples is called a **dataset**. In Python it is just a list of dictionaries, one dictionary per pebble. The lesson gives you 40 of them in a list called \`PEBBLES\`. The first one is \`PEBBLES[0]\`: lists count from 0, so the first is number 0, the second is number 1, and \`len(PEBBLES)\` is how many there are.

### Two small helpers

It is handy to have one function that pulls out the features and one that pulls out the label, so the rest of the program never has to guess which boxes to open:

~~~python
def features(pebble):
    return [pebble["flat"], pebble["shine"]]

def label(pebble):
    return pebble["kind"]

card = {"flat": 6, "shine": 2, "kind": "skipper"}
print(features(card))
print(label(card))
~~~

The screen shows:

~~~text
[6, 2]
skipper
~~~

The label is *not* in the features. If the answer were in the clues, Pip would just read it and learn nothing. That would be cheating.

### Counting kinds

Before learning from a dataset, it pays to look at it. How many of each kind do we have? We count with a dictionary and the \`.get\` method. \`counts.get("skipper", 0)\` opens the box called "skipper", but if there is no such box yet it hands back the second thing you gave it (here 0) instead of crashing.

~~~python
counts = {}
for name in ["skipper", "roller", "skipper"]:
    counts[name] = counts.get(name, 0) + 1
print(counts)
~~~

Trace: the first \`"skipper"\` has no box yet, so \`.get\` gives 0 and the box becomes 0 + 1 = 1. \`"roller"\` gets a box with 1. The second \`"skipper"\` finds 1 and makes it 2. The screen shows:

~~~text
{'skipper': 2, 'roller': 1}
~~~`,
      mission: md`The 40 labelled pebbles are already in your file (read them if you like: each line is one flash card). Teach your program to read them: write \`features\`, \`label\` and \`count_kinds\`, then use them on the real data.

When this lesson passes, the **Beach map** appears: every pebble becomes a dot at the place its two clues say, coloured by its label.`,
      tasks: [
        "features(pebble): return [flat, shine] as a list, and nothing else",
        "label(pebble): return the kind",
        "count_kinds(examples): return a dictionary that counts each kind",
        "kind_counts: count_kinds applied to PEBBLES; first_features: the features of the first pebble",
      ],
      starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 2: labelled examples.
#
# The beach data is PROVIDED below: 40 pebbles, each one with its true kind.

` + KINDS_AND_PEBBLES + py`


def features(pebble):
    """The clues Pip may look at: [flat, shine]. The kind is NOT a clue."""
    ...


def label(pebble):
    """The answer we want Pip to learn: the kind."""
    ...


def count_kinds(examples):
    """How many pebbles of each kind? Return something like {"skipper": 3, "roller": 2}."""
    ...


kind_counts = {}  # replace with count_kinds(PEBBLES)
first_features = []  # replace with the features of the first pebble`,
      solutionAdd: KINDS_AND_PEBBLES + py`


def features(pebble):
    return [pebble["flat"], pebble["shine"]]


def label(pebble):
    return pebble["kind"]


def count_kinds(examples):
    counts = {}
    for example in examples:
        name = label(example)
        counts[name] = counts.get(name, 0) + 1
    return counts


kind_counts = count_kinds(PEBBLES)
first_features = features(PEBBLES[0])`,
      explanation:
        "features() opens the two clue boxes and leaves the kind out, label() opens the answer box, and count_kinds() is the same tally you traced above, run over every pebble. The dataset has 14 skippers, 13 rollers and 13 sparklers: a fairly even mix, which is good news for learning.",
      hints: [
        { id: "h1", title: "features", content: 'Return a list with the two clue boxes: [pebble["flat"], pebble["shine"]]. Leave out pebble["kind"].' },
        { id: "h2", title: "count_kinds", content: "Start with counts = {}. For every example: name = label(example), then counts[name] = counts.get(name, 0) + 1. After the loop, return counts." },
        { id: "h3", title: "Using them", content: "kind_counts = count_kinds(PEBBLES) and first_features = features(PEBBLES[0])." },
      ],
      tests: [
        {
          id: "t1",
          description: "features returns [flat, shine] and leaves the kind out",
          assertionCode: py`
_got = features({"flat": 6, "shine": 2, "kind": "skipper"})
assert isinstance(_got, list), f"features should return a list, but it returned {_got!r}"
assert _got == [6, 2], f"features should return [flat, shine] = [6, 2] for this pebble, but returned {_got!r}"
assert "skipper" not in _got, "the kind is the answer, not a clue. Leave it out of features()"
`,
        },
        {
          id: "t2",
          description: "label returns the kind",
          assertionCode: py`
assert label({"flat": 1, "shine": 8, "kind": "sparkler"}) == "sparkler", "label(pebble) should return the pebble's kind"
assert label({"kind": "roller"}) == "roller", "label(pebble) should simply read pebble['kind']"
`,
        },
        {
          id: "t3",
          description: "count_kinds counts each kind (and copes with an empty list)",
          assertionCode: py`
_tiny = [{"kind": "roller"}, {"kind": "skipper"}, {"kind": "roller"}, {"kind": "sparkler"}, {"kind": "roller"}]
_got = count_kinds(_tiny)
assert _got == {"roller": 3, "skipper": 1, "sparkler": 1}, f"count_kinds should give {{'roller': 3, 'skipper': 1, 'sparkler': 1}} but gave {_got!r}"
assert count_kinds([]) == {}, "an empty list has nothing to count, so the answer is {}"
`,
        },
        {
          id: "t4",
          description: "kind_counts counts the real pebbles",
          assertionCode: py`
assert kind_counts == {"skipper": 14, "roller": 13, "sparkler": 13}, f"kind_counts should be {{'skipper': 14, 'roller': 13, 'sparkler': 13}} but is {kind_counts!r}. Did you replace the placeholder with count_kinds(PEBBLES)?"
`,
        },
        {
          id: "t5",
          description: "first_features describes the first pebble",
          assertionCode: py`
assert first_features == [6, 2], f"The first pebble has flat 6 and shine 2, so first_features should be [6, 2] but is {first_features!r}"
`,
        },
      ],
      unlocks: ["pb-beach"],
      checks: [
        {
          prompt: "In a labelled pebble, which part is the **label**?",
          question: { type: "choice", options: ["`flat`", "`shine`", "`kind`", "the number of pebbles"], answer: 2 },
          explanation: "The label is the answer on the back of the flash card: the kind. `flat` and `shine` are the features, the clues Pip looks at.",
        },
        {
          prompt: "Why do we keep the label out of `features(pebble)`?",
          question: {
            type: "choice",
            options: [
              "Because Python cannot put words in a list",
              "Because if the answer is among the clues, Pip just reads it and learns nothing",
              "Because the label is always a number",
              "Because lists must have exactly two items",
            ],
            answer: 1,
          },
          explanation: "It would be cheating, like writing the answer on the front of the flash card. Pip would look perfect on these cards and be lost on any new pebble.",
        },
      ],
    },

    // ───────────────────────── 3 ─────────────────────────
    {
      id: "ai-first-steps-3-alike",
      title: "How alike are two pebbles?",
      minutes: 22,
      xp: 80,
      concepts: ["distance", "abs()", "feature space"],
      learn: md`### Guess by who it looks like

How would you guess what kind of pebble a new one is? You would probably think "which pebbles I already know does this one look most like?". Pip can do the same, but it needs a number that says **how alike** two pebbles are.

### Put pebbles on a map

Draw a map where going right means flatter and going up means shinier. Each pebble becomes a dot at the place its two clues say. A pebble with \`flat\` 8 and \`shine\` 7 sits far right and high up. A pebble with \`flat\` 6 and \`shine\` 2 sits a little left of it and much lower.

Two pebbles with similar clues sit close together on the map. Different pebbles sit far apart. So "how alike" becomes "how far apart on the map".

### Counting steps

The easiest way to measure is to count steps along the grid, like walking city blocks: first the steps across, then the steps up or down.

From (flat 8, shine 7) to (flat 6, shine 2):

- across: 8 to 6 is 2 steps,
- up/down: 7 to 2 is 5 steps,
- together: 2 + 5 = **7** steps.

We only want the *size* of each gap, never a minus sign: walking 2 steps left costs the same as 2 steps right. Python has a function for that, \`abs()\`, the *absolute value*. It throws away the minus sign:

~~~python
print(abs(8 - 6))
print(abs(6 - 8))
~~~

~~~text
2
2
~~~

Now the whole measurement as a function:

~~~python
def distance(a, b):
    return abs(a["flat"] - b["flat"]) + abs(a["shine"] - b["shine"])

print(distance({"flat": 8, "shine": 7}, {"flat": 6, "shine": 2}))
~~~

The screen shows:

~~~text
7
~~~

Some facts worth remembering:

- A pebble is at distance **0** from one with identical clues.
- It does not matter which pebble you name first: \`distance(a, b)\` is the same as \`distance(b, a)\`.
- A **smaller** distance means **more alike**.`,
      mission: md`Teach Pip to measure how alike two pebbles are by counting steps.

Write \`distance(a, b)\` and use it to compare the mystery pebble with two pebbles from the dataset: the very first one and the ninth one (\`PEBBLES[8]\`, counting from 0).

When this lesson passes, the **Step counter** appears on the map and draws the steps between the mystery pebble and those two pebbles.`,
      tasks: [
        "distance(a, b): the steps across for flat plus the steps up or down for shine, each made positive with abs()",
        "to_first: the distance from mystery to PEBBLES[0]",
        "to_other: the distance from mystery to PEBBLES[8]",
      ],
      starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 3: how alike are two pebbles?
#
# Count the steps across (flat) and the steps up or down (shine).


def distance(a, b):
    """Steps between two pebbles: the gap in flat plus the gap in shine."""
    ...


to_first = None  # distance from mystery to PEBBLES[0]
to_other = None  # distance from mystery to PEBBLES[8]`,
      solutionAdd: py`def distance(a, b):
    return abs(a["flat"] - b["flat"]) + abs(a["shine"] - b["shine"])


to_first = distance(mystery, PEBBLES[0])
to_other = distance(mystery, PEBBLES[8])`,
      explanation:
        "distance adds the size of the flat gap to the size of the shine gap. The mystery pebble (flat 8, shine 7) is 7 steps from the first pebble (flat 6, shine 2) and 5 steps from the ninth (flat 5, shine 9), so the ninth is the more alike of the two.",
      hints: [
        { id: "h1", title: "One gap", content: 'The gap in flat is abs(a["flat"] - b["flat"]).' },
        { id: "h2", title: "Two gaps", content: 'Add the shine gap in the same way: abs(a["flat"] - b["flat"]) + abs(a["shine"] - b["shine"]). Return the total.' },
        { id: "h3", title: "Using it", content: "to_first = distance(mystery, PEBBLES[0]) and to_other = distance(mystery, PEBBLES[8])." },
      ],
      tests: [
        {
          id: "t1",
          description: "distance counts steps across plus steps up or down",
          assertionCode: py`
_got = distance({"flat": 8, "shine": 7}, {"flat": 6, "shine": 2})
assert _got == 7, f"From (flat 8, shine 7) to (flat 6, shine 2) that is 2 steps across and 5 steps up, so 7, but distance returned {_got!r}"
`,
        },
        {
          id: "t2",
          description: "distance is never negative and does not depend on the order",
          assertionCode: py`
_a = {"flat": 1, "shine": 9}
_b = {"flat": 4, "shine": 3}
assert distance(_a, _b) == 9, f"(1, 9) to (4, 3) is 3 + 6 = 9 steps, but distance returned {distance(_a, _b)!r}. Use abs() so each gap is positive."
assert distance(_b, _a) == 9, "distance(b, a) should equal distance(a, b)"
`,
        },
        {
          id: "t3",
          description: "two identical pebbles are 0 steps apart",
          assertionCode: py`
assert distance({"flat": 5, "shine": 5}, {"flat": 5, "shine": 5, "kind": "roller"}) == 0, "identical clues should be 0 steps apart (the kind is not a clue)"
`,
        },
        {
          id: "t4",
          description: "to_first and to_other measure the mystery pebble",
          assertionCode: py`
assert to_first == 7, f"to_first should be the distance from mystery (8, 7) to PEBBLES[0] (6, 2), which is 7, but it is {to_first!r}"
assert to_other == 5, f"to_other should be the distance from mystery (8, 7) to PEBBLES[8] (5, 9), which is 5, but it is {to_other!r}"
`,
        },
      ],
      unlocks: ["pb-distance"],
      checks: [
        {
          prompt: "What is the distance between a pebble with flat 3, shine 4 and another with flat 5, shine 9?",
          question: { type: "number", answer: 7 },
          explanation: "Across: 3 to 5 is 2 steps. Up: 4 to 9 is 5 steps. 2 + 5 = 7.",
        },
        {
          prompt: "A **smaller** distance between two pebbles means they are...",
          question: { type: "choice", options: ["more alike", "less alike", "the same kind, always", "heavier"], answer: 0 },
          explanation: "Close on the map means similar clues. Distance 0 means identical clues.",
        },
      ],
    },
  ],
};
