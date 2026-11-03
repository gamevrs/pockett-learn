import type { Chapter } from "@/engine/types";
import { BASKET_BLOCK, md, py } from "./util.ts";

/**
 * Chapter 2: Guess from neighbours. The nearest example (k = 1), the closest few, a vote among them,
 * and accuracy as a plain percentage, with a lazy guesser as the yardstick.
 */

export const chapter2: Chapter = {
  id: "neighbours",
  title: "Guess from neighbours",
  blurb: "Copy the nearest example, then let a few neighbours vote.",
  lessons: [
    // ───────────────────────── 4 ─────────────────────────
    {
      id: "ai-first-steps-4-nearest",
      title: "Copy the nearest pebble",
      minutes: 24,
      xp: 90,
      concepts: ["model", "nearest neighbour", "finding the smallest"],
      learn: md`### The new kid asks the closest neighbour

Imagine you move to a new street and want to know which shop is best for ice cream. A good plan is to ask the person who lives closest to you, because they are likely to like the same things.

Pip can use the same plan for pebbles. To guess the kind of a new pebble: look through all the labelled examples, find the one with the **smallest distance** (the most alike), and copy its label.

This guessing machine has a name. A **model** is whatever turns clues into a guess, built from examples. Think of a child who has looked at lots of flash cards and now says a name for a picture they have never seen. This particular model is called *nearest neighbour*.

### Finding the smallest number

Before comparing pebbles, here is the trick for finding the smallest number in a list. Keep a "best so far" and replace it whenever you meet something smaller:

~~~python
gaps = [7, 3, 5]
smallest = gaps[0]
for gap in gaps:
    if gap < smallest:
        smallest = gap
print(smallest)
~~~

Trace: \`smallest\` starts as 7. Look at 7: is 7 < 7? No. Look at 3: is 3 < 7? Yes, so \`smallest\` becomes 3. Look at 5: is 5 < 3? No. The screen shows:

~~~text
3
~~~

### Do it with pebbles

Now keep the *whole example* that is closest, not just the number. You reuse the \`distance\` function from the last lesson:

~~~python
def nearest(examples, pebble):
    best = examples[0]
    best_gap = distance(pebble, best)
    for example in examples:
        gap = distance(pebble, example)
        if gap < best_gap:
            best = example
            best_gap = gap
    return best

tiny = [
    {"flat": 9, "shine": 1, "kind": "skipper"},
    {"flat": 2, "shine": 2, "kind": "roller"},
]
print(nearest(tiny, {"flat": 3, "shine": 3}))
~~~

Trace: the distance from (3, 3) to the skipper is 6 + 2 = 8, and to the roller it is 1 + 1 = 2. The roller is closer, so it wins. The screen shows:

~~~text
{'flat': 2, 'shine': 2, 'kind': 'roller'}
~~~

Notice \`<\`, not \`<=\`. If two examples are equally close, the one that comes **earlier in the list** stays the winner. That makes Pip's answers the same every time.

### From the nearest example to a guess

The guess is just the label of that nearest example: \`label(nearest(examples, pebble))\`.`,
      mission: md`Remember the mystery pebble that fooled the hand-written rule? Pip's new model will have a go.

Write \`nearest\` and \`guess_nearest\`, then ask them about the mystery pebble using the full dataset. If the guess equals \`truth\`, you have beaten the hand-written rule.

When this lesson passes, the **Nearest neighbour** line appears on the map, joining the mystery pebble to the example it copied.`,
      tasks: [
        "nearest(examples, pebble): return the whole example (a dictionary) with the smallest distance to the pebble; on a tie keep the earlier one",
        "guess_nearest(examples, pebble): return the label of that nearest example",
        "nn_pebble: the nearest example to mystery in PEBBLES",
        "nn_guess: the model's guess for mystery",
      ],
      starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 4: copy the nearest pebble.


def nearest(examples, pebble):
    """Return the example (the whole dictionary) closest to pebble. A tie goes to the earlier one."""
    ...


def guess_nearest(examples, pebble):
    """The label of the nearest example."""
    ...


nn_pebble = None  # the example nearest to mystery
nn_guess = None  # the model's guess for mystery`,
      solutionAdd: py`def nearest(examples, pebble):
    best = examples[0]
    best_gap = distance(pebble, best)
    for example in examples:
        gap = distance(pebble, example)
        if gap < best_gap:
            best = example
            best_gap = gap
    return best


def guess_nearest(examples, pebble):
    return label(nearest(examples, pebble))


nn_pebble = nearest(PEBBLES, mystery)
nn_guess = guess_nearest(PEBBLES, mystery)`,
      explanation:
        "nearest keeps a best-so-far, exactly like the smallest-number loop, but it stores the whole example next to its gap. The closest example to the mystery pebble (flat 8, shine 7) is a sparkler at (9, 7), only 1 step away, so the model says sparkler, which matches the truth. The hand-written rule got this one wrong.",
      hints: [
        { id: "h1", title: "Start somewhere", content: "Begin with best = examples[0] and best_gap = distance(pebble, best). Then loop over the examples." },
        { id: "h2", title: "The update", content: "Inside the loop: gap = distance(pebble, example). if gap < best_gap: set best = example and best_gap = gap. Use <, not <=, so ties keep the earlier example." },
        { id: "h3", title: "The guess", content: "guess_nearest is one line: return label(nearest(examples, pebble)). Then nn_pebble = nearest(PEBBLES, mystery) and nn_guess = guess_nearest(PEBBLES, mystery)." },
      ],
      tests: [
        {
          id: "t1",
          description: "nearest returns the closest example",
          assertionCode: py`
_tiny = [
    {"flat": 9, "shine": 1, "kind": "skipper"},
    {"flat": 2, "shine": 2, "kind": "roller"},
]
_got = nearest(_tiny, {"flat": 3, "shine": 3})
assert _got == {"flat": 2, "shine": 2, "kind": "roller"}, f"The roller at (2, 2) is 2 steps from (3, 3) and the skipper is 8, so the roller should win, but nearest returned {_got!r}. Return the whole example, not just its distance."
`,
        },
        {
          id: "t2",
          description: "on a tie the earlier example wins",
          assertionCode: py`
_tie = [
    {"flat": 1, "shine": 1, "kind": "roller"},
    {"flat": 3, "shine": 3, "kind": "skipper"},
]
_got = nearest(_tie, {"flat": 2, "shine": 2})
assert _got["kind"] == "roller", "Both examples are 2 steps away. A tie goes to the one that comes first in the list: use < (not <=) when you compare gaps"
`,
        },
        {
          id: "t3",
          description: "guess_nearest returns the label",
          assertionCode: py`
_tiny = [
    {"flat": 9, "shine": 1, "kind": "skipper"},
    {"flat": 2, "shine": 2, "kind": "roller"},
]
assert guess_nearest(_tiny, {"flat": 8, "shine": 2}) == "skipper", "A pebble at (8, 2) is nearest the skipper at (9, 1), so guess_nearest should say 'skipper'"
assert guess_nearest(_tiny, {"flat": 3, "shine": 3}) == "roller", "A pebble at (3, 3) is nearest the roller at (2, 2), so guess_nearest should say 'roller'"
`,
        },
        {
          id: "t4",
          description: "nn_pebble is the example nearest to the mystery pebble",
          assertionCode: py`
assert nn_pebble == {"flat": 9, "shine": 7, "kind": "sparkler"}, f"The closest example to mystery (8, 7) is the sparkler at (9, 7), but nn_pebble is {nn_pebble!r}"
`,
        },
        {
          id: "t5",
          description: "nn_guess beats the hand-written rule",
          assertionCode: py`
assert nn_guess == truth, f"nn_guess should be {truth!r} (the label of the nearest example) but it is {nn_guess!r}"
`,
        },
      ],
      unlocks: ["pb-nearest"],
      checks: [
        {
          prompt: "Two examples are exactly the same distance from a new pebble. With `if gap < best_gap`, which one does `nearest` keep?",
          question: { type: "choice", options: ["The one that comes earlier in the list", "The one that comes later in the list", "Neither, it crashes", "Both"], answer: 0 },
          explanation: "The later one is not strictly smaller (`<`), so it does not replace the best. The earlier example stays.",
        },
        {
          prompt: "In your own words, what is a **model**? Pick the best answer.",
          question: {
            type: "choice",
            options: [
              "A guessing machine built from examples",
              "A plastic copy of a pebble",
              "A list of rules a person wrote by hand",
              "A kind of Python variable",
            ],
            answer: 0,
          },
          explanation: "A model takes clues in and gives a guess out, and it was built from labelled examples instead of hand-written rules.",
        },
      ],
    },

    // ───────────────────────── 5 ─────────────────────────
    {
      id: "ai-first-steps-5-closest-few",
      title: "Find the closest few",
      minutes: 24,
      xp: 90,
      concepts: ["k nearest", "sorted()", "slicing", "tuples"],
      learn: md`### One neighbour can be odd

What if the closest example happens to be strange, like a skipper that looks very round? If Pip copies just that one, it will be fooled. A wiser plan is to look at the **closest few** pebbles (we call that number **k**) and decide together.

First step: find the k closest, in order, nearest first.

### Three tools

**A pair with a position.** To sort the examples by distance we need to remember where each one was in the list. A pair of values written with round brackets, like \`(8, 0)\`, is called a **tuple**. We store \`(distance, position)\`.

**Sorting.** \`sorted(some_list)\` gives a new list in order, smallest first. When the items are pairs it sorts by the first number, and if two firsts are equal, by the second number. That second number is the position, so ties go to the earlier example, just like last time.

**Slicing.** \`items[:2]\` means "the first 2 items". \`items[:k]\` is the first k.

~~~python
print(sorted([(8, 0), (2, 1), (2, 3), (5, 2)]))
print(["a", "b", "c", "d"][:2])
~~~

~~~text
[(2, 1), (2, 3), (5, 2), (8, 0)]
['a', 'b']
~~~

One more small tool: \`for gap, i in pairs:\` walks through a list of pairs and unpacks each pair into two names.

### Putting it together

~~~python
def neighbours(examples, pebble, k):
    pairs = []
    for i in range(len(examples)):
        pairs.append((distance(pebble, examples[i]), i))
    pairs = sorted(pairs)
    found = []
    for gap, i in pairs[:k]:
        found.append(examples[i])
    return found
~~~

\`range(len(examples))\` counts 0, 1, 2, ... one number per example, so \`i\` is each example's position. Trace with two examples, a skipper at (9, 1) and a roller at (2, 2), asking about the pebble (3, 3) with k = 1: the pairs are \`(8, 0)\` and \`(2, 1)\`. After sorting they are \`[(2, 1), (8, 0)]\`. The first 1 of them is \`(2, 1)\`, so \`found\` holds \`examples[1]\`, the roller.

\`found\` is the pebble's neighbours, nearest first.`,
      mission: md`Write \`neighbours\` and use it to find the three examples closest to the mystery pebble.

When this lesson passes, the **Closest three** ring appears on the map around those neighbours, numbered 1, 2, 3 from nearest to farthest.`,
      tasks: [
        "neighbours(examples, pebble, k): return the k closest examples, nearest first (a tie goes to the earlier example)",
        "near3: the 3 neighbours of mystery in PEBBLES",
      ],
      starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 5: find the closest few.


def neighbours(examples, pebble, k):
    """Return the k examples closest to pebble, nearest first."""
    ...


near3 = []  # the 3 neighbours of mystery`,
      solutionAdd: py`def neighbours(examples, pebble, k):
    pairs = []
    for i in range(len(examples)):
        pairs.append((distance(pebble, examples[i]), i))
    pairs = sorted(pairs)
    found = []
    for gap, i in pairs[:k]:
        found.append(examples[i])
    return found


near3 = neighbours(PEBBLES, mystery, 3)`,
      explanation:
        "Each example becomes a pair (distance, position). Sorting the pairs puts the nearest first, with ties going to the earlier position. Slicing with [:k] keeps the first k, and the last loop turns those positions back into the examples themselves. The three closest to the mystery pebble are all sparklers.",
      hints: [
        { id: "h1", title: "Build the pairs", content: "pairs = [] then for i in range(len(examples)): pairs.append((distance(pebble, examples[i]), i)). Note the double brackets: append takes ONE thing, and that thing is a pair." },
        { id: "h2", title: "Sort and cut", content: "pairs = sorted(pairs) puts the nearest first. pairs[:k] keeps the first k of them." },
        { id: "h3", title: "Turn positions back into examples", content: "found = [] then for gap, i in pairs[:k]: found.append(examples[i]). Return found. Finally near3 = neighbours(PEBBLES, mystery, 3)." },
      ],
      tests: [
        {
          id: "t1",
          description: "neighbours returns the k closest, nearest first",
          assertionCode: py`
_ex = [
    {"flat": 9, "shine": 1, "kind": "skipper"},
    {"flat": 2, "shine": 2, "kind": "roller"},
    {"flat": 3, "shine": 4, "kind": "roller"},
    {"flat": 8, "shine": 8, "kind": "sparkler"},
]
_got = neighbours(_ex, {"flat": 3, "shine": 3}, 2)
assert [n["kind"] for n in _got] == ["roller", "roller"] and _got[0] == _ex[2] and _got[1] == _ex[1], f"For the pebble (3, 3) the nearest two are (3, 4) then (2, 2). neighbours returned {_got!r}"
assert len(neighbours(_ex, {"flat": 3, "shine": 3}, 3)) == 3, "k = 3 should give exactly 3 neighbours"
assert neighbours(_ex, {"flat": 3, "shine": 3}, 3)[2] == _ex[0], "the third nearest should be the skipper at (9, 1) (8 steps away) and not the sparkler at (8, 8) (10 steps away)"
`,
        },
        {
          id: "t2",
          description: "k = 1 gives just the nearest example, and ties keep list order",
          assertionCode: py`
_ex = [
    {"flat": 1, "shine": 1, "kind": "roller"},
    {"flat": 3, "shine": 3, "kind": "skipper"},
]
_got = neighbours(_ex, {"flat": 2, "shine": 2}, 2)
assert _got == [_ex[0], _ex[1]], f"Both examples are 2 steps away, so they should stay in list order, but neighbours returned {_got!r}"
assert neighbours(_ex, {"flat": 2, "shine": 2}, 1) == [_ex[0]], "k = 1 should return a list holding just one example"
`,
        },
        {
          id: "t3",
          description: "neighbours does not change the examples list",
          assertionCode: py`
_ex = [{"flat": 9, "shine": 1, "kind": "skipper"}, {"flat": 2, "shine": 2, "kind": "roller"}]
_before = [dict(e) for e in _ex]
neighbours(_ex, {"flat": 3, "shine": 3}, 1)
assert _ex == _before, "neighbours should leave the examples list as it was: sort a separate list of pairs instead"
`,
        },
        {
          id: "t4",
          description: "near3 holds the three closest examples to the mystery pebble",
          assertionCode: py`
assert isinstance(near3, list) and len(near3) == 3, f"near3 should be a list of 3 neighbours, but it is {near3!r}"
assert near3[0] == nn_pebble, "the first neighbour should be the same pebble as nn_pebble (the nearest)"
assert [n["kind"] for n in near3] == ["sparkler", "sparkler", "sparkler"], f"The three closest examples to the mystery pebble are all sparklers, but near3 has kinds {[n['kind'] for n in near3]!r}"
`,
        },
      ],
      unlocks: ["pb-neighbours"],
      checks: [
        {
          prompt: "What does `[10, 20, 30, 40][:3]` give?",
          question: { type: "choice", options: ["[10, 20, 30]", "[20, 30, 40]", "[30]", "[10, 20, 30, 40]"], answer: 0 },
          explanation: "`[:3]` means the first three items.",
        },
        {
          prompt: "Why do we store `(distance, position)` pairs instead of only the distances?",
          question: {
            type: "choice",
            options: [
              "So that after sorting we still know which example each distance belonged to",
              "Because sorted() cannot sort single numbers",
              "To make the program slower",
              "Because pairs use less memory",
            ],
            answer: 0,
          },
          explanation: "Sorting moves the pairs around. The position travels with its distance, so we can find the right example afterwards.",
        },
      ],
    },

    // ───────────────────────── 6 ─────────────────────────
    {
      id: "ai-first-steps-6-vote",
      title: "Let the neighbours vote",
      minutes: 24,
      xp: 100,
      concepts: ["voting", "k", "tie-break", "tally"],
      learn: md`### Ask three friends

Not sure which film to watch? Ask three friends. If two say "the funny one" and one says "the scary one", you pick the funny one. The majority wins.

Pip can do the same with its k closest neighbours: each neighbour casts one vote for its own label, and the label with the most votes is the guess. This is the **k-nearest-neighbours** idea, usually shortened to *k-NN*. The number **k** is how many neighbours get a vote. With k = 1 you get the copy-the-nearest model from last time.

### Step one: count the votes

You already counted kinds with a dictionary. A **tally** is the same thing for a list of neighbours:

~~~python
def tally(found):
    counts = {}
    for neighbour in found:
        name = neighbour["kind"]
        counts[name] = counts.get(name, 0) + 1
    return counts
~~~

### Step two: pick the winner

Neighbours arrive nearest first, so we can settle ties in a fair, simple way: **the nearest neighbour's kind wins a tie**. Start with the nearest neighbour's kind as "best" and replace it only when another kind has *strictly more* votes:

~~~python
def winner(found):
    counts = tally(found)
    best = found[0]["kind"]
    for neighbour in found:
        name = neighbour["kind"]
        if counts[name] > counts[best]:
            best = name
    return best
~~~

Trace with neighbours whose kinds are skipper, sparkler, sparkler. The tally is skipper 1, sparkler 2. \`best\` starts as "skipper". Looking at the skipper: is 1 > 1? No. Looking at the first sparkler: is 2 > 1? Yes, so \`best\` becomes "sparkler". The second sparkler: is 2 > 2? No. The winner is \`"sparkler"\`.

With two neighbours that disagree, say a roller then a skipper, each has 1 vote. Nothing is *strictly more* than the nearest one's count, so the roller (the nearest) wins.

### The whole model in one line

~~~python
def guess_by_vote(examples, pebble, k):
    return winner(neighbours(examples, pebble, k))
~~~`,
      mission: md`Meet a tricky pebble: \`tricky\`, with \`flat\` 8 and \`shine\` 6, sitting right on the border between skippers and sparklers. A person checked that it is really a sparkler. Copying only the nearest example is risky here. Let the neighbours vote instead.

Write \`tally\`, \`winner\` and \`guess_by_vote\`, set \`K\` to 3, and compare what 1 neighbour says with what 3 neighbours say.

When this lesson passes, the **Vote** card appears and the map circles the tricky pebble's neighbours.`,
      tasks: [
        "tally(found): count the votes for each kind in a list of neighbours",
        "winner(found): the kind with the most votes; a tie goes to the nearest neighbour's kind",
        "guess_by_vote(examples, pebble, k): the winner among the k nearest neighbours",
        "K = 3, then tricky_near, tricky_votes, tricky_guess (with K) and tricky_k1 (with 1 neighbour)",
      ],
      starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 6: let the neighbours vote.

# A tricky pebble on the border. A person checked: it is a sparkler.
tricky = {"flat": 8, "shine": 6}
tricky_truth = "sparkler"


def tally(found):
    """Count the votes: {"sparkler": 2, "skipper": 1}."""
    ...


def winner(found):
    """The kind with the most votes. On a tie, the nearest neighbour's kind wins."""
    ...


def guess_by_vote(examples, pebble, k):
    """The winner among the k nearest neighbours."""
    ...


K = 0  # how many neighbours vote: change this to 3
tricky_near = []  # the K neighbours of tricky
tricky_votes = {}  # the tally of those neighbours
tricky_guess = None  # the vote with K neighbours
tricky_k1 = None  # the vote with only 1 neighbour`,
      solutionAdd: py`# A tricky pebble on the border. A person checked: it is a sparkler.
tricky = {"flat": 8, "shine": 6}
tricky_truth = "sparkler"


def tally(found):
    counts = {}
    for neighbour in found:
        name = neighbour["kind"]
        counts[name] = counts.get(name, 0) + 1
    return counts


def winner(found):
    counts = tally(found)
    best = found[0]["kind"]
    for neighbour in found:
        name = neighbour["kind"]
        if counts[name] > counts[best]:
            best = name
    return best


def guess_by_vote(examples, pebble, k):
    return winner(neighbours(examples, pebble, k))


K = 3
tricky_near = neighbours(PEBBLES, tricky, K)
tricky_votes = tally(tricky_near)
tricky_guess = guess_by_vote(PEBBLES, tricky, K)
tricky_k1 = guess_by_vote(PEBBLES, tricky, 1)`,
      explanation:
        "tally counts the votes, winner keeps the nearest neighbour's kind unless another kind has strictly more votes, and guess_by_vote joins the neighbours and the vote. For the tricky pebble the single nearest example is a skipper (a tie in distance, settled by list order), but of the three closest, two are sparklers, so the vote says sparkler. One odd neighbour was outvoted.",
      hints: [
        { id: "h1", title: "tally", content: 'counts = {} then for each neighbour: name = neighbour["kind"], counts[name] = counts.get(name, 0) + 1. Return counts.' },
        { id: "h2", title: "winner", content: 'Start with best = found[0]["kind"] (the nearest). For each neighbour, if counts[name] > counts[best], then best = name. Return best.' },
        { id: "h3", title: "Using the model", content: "guess_by_vote returns winner(neighbours(examples, pebble, k)). Set K = 3, then tricky_near = neighbours(PEBBLES, tricky, K) and so on." },
      ],
      tests: [
        {
          id: "t1",
          description: "tally counts the votes",
          assertionCode: py`
_found = [{"kind": "skipper"}, {"kind": "sparkler"}, {"kind": "sparkler"}]
_got = tally(_found)
assert _got == {"skipper": 1, "sparkler": 2}, f"tally should give {{'skipper': 1, 'sparkler': 2}} but gave {_got!r}"
`,
        },
        {
          id: "t2",
          description: "winner picks the most votes, and the nearest kind wins a tie",
          assertionCode: py`
assert winner([{"kind": "skipper"}, {"kind": "sparkler"}, {"kind": "sparkler"}]) == "sparkler", "two sparklers beat one skipper"
assert winner([{"kind": "roller"}, {"kind": "skipper"}]) == "roller", "1 vote each: the nearest neighbour (the first in the list) should win the tie"
assert winner([{"kind": "roller"}, {"kind": "skipper"}, {"kind": "sparkler"}]) == "roller", "1 vote each for three kinds: the nearest neighbour's kind, roller, should win"
assert winner([{"kind": "skipper"}]) == "skipper", "a single neighbour just gets its own kind"
`,
        },
        {
          id: "t3",
          description: "guess_by_vote asks the k nearest neighbours",
          assertionCode: py`
assert guess_by_vote(PEBBLES, tricky, 1) == "skipper", "With 1 neighbour, the nearest example to the tricky pebble (8, 6) is the skipper at (8, 5). Is guess_by_vote using k?"
assert guess_by_vote(PEBBLES, tricky, 3) == "sparkler", "With 3 neighbours the vote is 2 sparklers to 1 skipper, so the guess should be sparkler"
`,
        },
        {
          id: "t4",
          description: "K is 3 and the tricky pebble's neighbours are recorded",
          assertionCode: py`
assert K == 3, f"K should be 3, but it is {K!r}"
assert isinstance(tricky_near, list) and len(tricky_near) == 3, f"tricky_near should hold 3 neighbours but is {tricky_near!r}"
assert tricky_near == neighbours(PEBBLES, tricky, 3), "tricky_near should be neighbours(PEBBLES, tricky, K)"
assert tricky_votes == {"skipper": 1, "sparkler": 2}, f"tricky_votes should be {{'skipper': 1, 'sparkler': 2}} but is {tricky_votes!r}"
`,
        },
        {
          id: "t5",
          description: "1 neighbour is fooled, 3 neighbours get it right",
          assertionCode: py`
assert tricky_k1 == "skipper", f"With a single neighbour the guess is 'skipper' but tricky_k1 is {tricky_k1!r}"
assert tricky_guess == tricky_truth, f"With K neighbours voting the guess should be {tricky_truth!r} but tricky_guess is {tricky_guess!r}"
`,
        },
      ],
      unlocks: ["pb-vote"],
      checks: [
        {
          prompt: "Five neighbours vote: 3 skippers, 1 roller, 1 sparkler. What is the guess?",
          question: { type: "choice", options: ["skipper", "roller", "sparkler", "a tie"], answer: 0 },
          explanation: "The kind with the most votes wins: 3 beats 1 and 1.",
        },
        {
          prompt: "When k is 1, how many neighbours vote?",
          question: { type: "number", answer: 1 },
          explanation: "Just the nearest one, so the vote is simply that example's label.",
        },
      ],
    },

    // ───────────────────────── 7 ─────────────────────────
    {
      id: "ai-first-steps-7-accuracy",
      title: "How often is Pip right?",
      minutes: 25,
      xp: 100,
      concepts: ["accuracy", "percentage", "baseline", "round()"],
      learn: md`### A score for the guesser

So far you checked Pip one pebble at a time. To compare ideas fairly we need one number that says how good a guesser is. The usual one is **accuracy**: the share of guesses that are right, as a percentage.

Think of a spelling test. If you spell 9 of 12 words right, you got 9 out of 12, which is 75 out of 100: **75 percent**. The formula is 100 times the number right, divided by the number of questions.

In Python, \`/\` divides and gives a decimal, and \`round()\` turns a decimal into the nearest whole number:

~~~python
print(100 * 9 / 12)
print(round(100 * 9 / 12))
print(round(100 * 4 / 12))
~~~

~~~text
75.0
75
33
~~~

### Check a whole basket

To find the accuracy you need two lists of the same length: the guesses Pip made, and the true kinds. Then count the places where they match:

~~~python
guesses = ["roller", "skipper", "skipper", "sparkler"]
truths  = ["roller", "skipper", "roller", "sparkler"]
~~~

Compare position by position: right, right, wrong, right. That is 3 of 4 right, so 75.

Three small helpers get you there. \`labels_of\` collects the true kinds. \`guess_all\` collects Pip's guess for every pebble in a list. \`accuracy\` counts the matches:

~~~python
def accuracy(guesses, truths):
    right = 0
    for i in range(len(truths)):
        if guesses[i] == truths[i]:
            right += 1
    return round(100 * right / len(truths))
~~~

(\`right += 1\` is a short way to write \`right = right + 1\`.)

### Is 100 good? Compare with a lazy guesser

A number is only meaningful next to something. Imagine a lazy guesser that says "roller" for every single pebble without looking. In a basket with equal numbers of the three kinds it will be right about a third of the time. If Pip cannot beat the lazy guesser, it has learned nothing. A lazy guesser like this is called a **baseline**.

A quick way to make 12 copies of one word is list multiplication:

~~~python
print(["roller"] * 3)
~~~

~~~text
['roller', 'roller', 'roller']
~~~`,
      mission: md`A basket of 12 fresh pebbles has arrived. Pip has never seen them, but a person has checked every kind, so you can mark Pip's guesses. The basket is already in your file as \`BASKET\`.

Write the three helpers, then find the accuracy of Pip (using \`PEBBLES\` as its examples and 3 neighbours) and of the lazy "roller" guesser.

When this lesson passes, the **Accuracy meter** appears with Pip's score next to the lazy guesser's.`,
      tasks: [
        "labels_of(examples): the list of true kinds",
        "guess_all(train, check, k): the vote-guess for every pebble in check, using train as the examples",
        "accuracy(guesses, truths): the percentage right, rounded to a whole number",
        "basket_accuracy: Pip's accuracy on BASKET using PEBBLES and 3 neighbours; lazy_accuracy: the accuracy when guessing \"roller\" 12 times",
      ],
      starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 7: how often is Pip right?

` + BASKET_BLOCK + py`


def labels_of(examples):
    """The true kinds, as a list, in the same order."""
    ...


def guess_all(train, check, k):
    """Pip's vote-guess for every pebble in check. The examples to learn from are train."""
    ...


def accuracy(guesses, truths):
    """The percentage of guesses that match the truth, rounded to a whole number."""
    ...


basket_accuracy = None  # Pip's accuracy on BASKET (learn from PEBBLES, k = 3)
lazy_accuracy = None  # accuracy if you always guess "roller"`,
      solutionAdd: BASKET_BLOCK + py`


def labels_of(examples):
    names = []
    for example in examples:
        names.append(label(example))
    return names


def guess_all(train, check, k):
    guesses = []
    for pebble in check:
        guesses.append(guess_by_vote(train, pebble, k))
    return guesses


def accuracy(guesses, truths):
    right = 0
    for i in range(len(truths)):
        if guesses[i] == truths[i]:
            right += 1
    return round(100 * right / len(truths))


basket_accuracy = accuracy(guess_all(PEBBLES, BASKET, 3), labels_of(BASKET))
lazy_accuracy = accuracy(["roller"] * len(BASKET), labels_of(BASKET))`,
      explanation:
        "accuracy is the number of matching positions as a percentage. Pip gets all 12 basket pebbles right (100), while the lazy guesser who always says roller is right for only the 4 rollers (33). A score of 100 beats a baseline of 33 by a mile, so Pip really has learned something. Be careful though: this was an easy basket, and the next chapter is about testing more honestly.",
      hints: [
        { id: "h1", title: "labels_of and guess_all", content: "Both start with an empty list, loop over the pebbles, append one thing per pebble (label(example), or guess_by_vote(train, pebble, k)) and return the list." },
        { id: "h2", title: "accuracy", content: "Count the matches with right = 0 and right += 1 inside a loop over range(len(truths)). The answer is round(100 * right / len(truths))." },
        { id: "h3", title: "Using them", content: 'basket_accuracy = accuracy(guess_all(PEBBLES, BASKET, 3), labels_of(BASKET)) and lazy_accuracy = accuracy(["roller"] * len(BASKET), labels_of(BASKET)).' },
      ],
      tests: [
        {
          id: "t1",
          description: "labels_of lists the true kinds in order",
          assertionCode: py`
_got = labels_of([{"flat": 1, "shine": 8, "kind": "sparkler"}, {"flat": 7, "shine": 1, "kind": "skipper"}])
assert _got == ["sparkler", "skipper"], f"labels_of should give ['sparkler', 'skipper'] but gave {_got!r}"
assert labels_of([]) == [], "no pebbles means an empty list of labels"
`,
        },
        {
          id: "t2",
          description: "guess_all makes one guess per pebble",
          assertionCode: py`
_got = guess_all(PEBBLES, [{"flat": 9, "shine": 2}, {"flat": 1, "shine": 1}, {"flat": 4, "shine": 9}], 3)
assert _got == ["skipper", "roller", "sparkler"], f"A flat dull pebble, a round dull pebble and a shiny pebble should be guessed skipper, roller, sparkler but guess_all gave {_got!r}"
assert len(guess_all(PEBBLES, BASKET, 3)) == 12, "guess_all should give one guess per pebble in check"
`,
        },
        {
          id: "t3",
          description: "accuracy is the percentage of matching guesses",
          assertionCode: py`
assert accuracy(["roller", "skipper", "skipper", "sparkler"], ["roller", "skipper", "roller", "sparkler"]) == 75, "3 of 4 right is 75 percent"
assert accuracy(["a", "b"], ["a", "b"]) == 100, "all right is 100 percent"
assert accuracy(["a", "a"], ["b", "b"]) == 0, "none right is 0 percent"
assert accuracy(["a", "b", "c"], ["a", "b", "x"]) == 67, "2 of 3 right is 66.67, which rounds to 67"
`,
        },
        {
          id: "t4",
          description: "basket_accuracy and lazy_accuracy compare Pip with a lazy guesser",
          assertionCode: py`
assert basket_accuracy == 100, f"Pip should get all 12 basket pebbles right (100) but basket_accuracy is {basket_accuracy!r}"
assert lazy_accuracy == 33, f"Guessing 'roller' every time is right for 4 of 12 pebbles, 33 percent, but lazy_accuracy is {lazy_accuracy!r}"
`,
        },
      ],
      unlocks: ["pb-accuracy"],
      checks: [
        {
          prompt: "A guesser gets 18 out of 24 right. What is its accuracy in percent?",
          question: { type: "number", answer: 75 },
          explanation: "100 × 18 ÷ 24 = 75.",
        },
        {
          prompt: "Why compare Pip with a lazy guesser that always says the same thing?",
          question: {
            type: "choice",
            options: [
              "To see whether Pip is any better than doing nothing clever",
              "Because lazy guessers are always 0 percent",
              "To make Pip's score smaller",
              "Because Python requires a baseline",
            ],
            answer: 0,
          },
          explanation: "A score only means something next to a yardstick. If Pip cannot beat the lazy guesser, it has learned nothing.",
        },
      ],
    },
  ],
};
