import type { Chapter } from "@/engine/types";
import { md, py, RNG_BLOCK } from "./util.ts";

/**
 * Chapter 3: Honest testing. Hide some pebbles with a seeded shuffle, score on pebbles Pip never studied,
 * see a pure memoriser fail on new pebbles, and compare different values of k.
 */

export const chapter3: Chapter = {
  id: "testing",
  title: "Honest testing",
  blurb: "Hide some pebbles, mark Pip fairly, and catch it memorising.",
  lessons: [
    // ───────────────────────── 8 ─────────────────────────
    {
      id: "ai-first-steps-8-split",
      title: "Hide some pebbles: train and test",
      minutes: 26,
      xp: 110,
      concepts: ["training set", "test set", "seed", "shuffle", "slicing"],
      learn: md`### Don't mark a test you handed the answers to

Imagine a teacher who gives you 40 practice questions, then sets the exam using the very same 40. Everyone would get full marks, and nobody could tell who really understood the subject.

A fair teacher keeps some questions hidden. Pip needs the same fairness. We split the 40 labelled pebbles into two piles:

- the **training set**: the pebbles Pip is allowed to study (to find neighbours in),
- the **test set**: pebbles locked away. Pip only sees them for the exam, and the score on them is the score we trust.

### Shuffle first

If the pile is in some kind of order, chopping off the last ten might take just one kind. So we shuffle first, like shuffling a pack of cards. For that we need a dice machine.

### A dice machine you can repeat

Computers do not really roll dice. They use a recipe that makes numbers that look random. A *seeded* recipe starts from a starting number, the **seed**, and the same seed always gives the same rolls. That is perfect for learning, because your results will match the checks every time.

The class \`Rng\` below is provided for you. You do not need to read how it works; you only use \`rng.below(n)\`, which rolls a whole number from 0 up to n - 1.

~~~python
dice = Rng(1)
print(dice.below(6), dice.below(6), dice.below(6))
again = Rng(1)
print(again.below(6), again.below(6), again.below(6))
~~~

~~~text
1 2 3
1 2 3
~~~

### How to shuffle with a dice machine

Walk from the last position back to position 1. At each position \`i\`, roll a number \`j\` from 0 to \`i\` and swap the item at \`i\` with the item at \`j\`. Everything after \`i\` is then finished.

New pieces of Python for it:

- \`list(items)\` makes a copy, so your shuffle does not change the original list.
- \`range(3, 0, -1)\` counts down: 3, 2, 1. The three numbers are start, stop (not included) and step.
- \`a, b = b, a\` swaps two things.

~~~python
def shuffled(items, rng):
    items = list(items)
    for i in range(len(items) - 1, 0, -1):
        j = rng.below(i + 1)
        items[i], items[j] = items[j], items[i]
    return items

print(shuffled(["a", "b", "c", "d"], Rng(1)))
~~~

Trace with \`Rng(1)\`. The rolls are \`below(4)\` = 0, \`below(3)\` = 1, \`below(2)\` = 1.

- i = 3, j = 0: swap the items at 3 and 0, so \`a b c d\` becomes \`d b c a\`.
- i = 2, j = 1: swap the items at 2 and 1, so it becomes \`d c b a\`.
- i = 1, j = 1: swapping an item with itself changes nothing.

~~~text
['d', 'c', 'b', 'a']
~~~

### Cut the pile in two

Slicing again: \`items[:10]\` is the first ten, and \`items[10:]\` is everything from position 10 onwards.

~~~python
def split_data(items, test_count):
    return items[test_count:], items[:test_count]

train_set, test_set = split_data([1, 2, 3, 4, 5], 2)
print(train_set, test_set)
~~~

~~~text
[3, 4, 5] [1, 2]
~~~

A function that returns two things with a comma hands them back as a pair, and \`train_set, test_set = ...\` catches them in two names.`,
      mission: md`Time to hide pebbles. Shuffle \`PEBBLES\` with the dice machine seeded by \`SEED = 13\`, then lock away the first 10 as the test set. The other 30 become the training set.

When this lesson passes, the **Hidden pebbles** card appears and the map draws the test pebbles as hollow dots.`,
      tasks: [
        "shuffled(items, rng): return a shuffled copy; leave the original list alone",
        "split_data(items, test_count): return (train, test), where test is the first test_count items",
        "SEED = 13, mixed = shuffled(PEBBLES, Rng(SEED))",
        "train_set, test_set = split_data(mixed, 10)",
      ],
      starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 8: hide some pebbles.
#
# The dice machine is PROVIDED. You only need rng.below(n).

` + RNG_BLOCK + py`


def shuffled(items, rng):
    """Return a shuffled COPY of items. Do not change the original list."""
    ...


def split_data(items, test_count):
    """Return (train, test): test is the first test_count items, train is the rest."""
    ...


SEED = 0  # change this to 13
mixed = []  # PEBBLES, shuffled with Rng(SEED)
train_set, test_set = [], []  # 30 to study, 10 hidden`,
      solutionAdd: RNG_BLOCK + py`


def shuffled(items, rng):
    items = list(items)
    for i in range(len(items) - 1, 0, -1):
        j = rng.below(i + 1)
        items[i], items[j] = items[j], items[i]
    return items


def split_data(items, test_count):
    return items[test_count:], items[:test_count]


SEED = 13
mixed = shuffled(PEBBLES, Rng(SEED))
train_set, test_set = split_data(mixed, 10)`,
      explanation:
        "shuffled works from the end of the list, swapping each position with a randomly chosen earlier-or-same position. Because the Rng is seeded, SEED = 13 gives the same shuffle every time. split_data slices the shuffled list: the first 10 become the hidden test set and the remaining 30 become the training set. The two piles never share a pebble.",
      hints: [
        { id: "h1", title: "Copy first", content: "Start shuffled with items = list(items) so the caller's list is untouched. Then loop: for i in range(len(items) - 1, 0, -1)." },
        { id: "h2", title: "The swap", content: "j = rng.below(i + 1), then items[i], items[j] = items[j], items[i]. Return items at the end." },
        { id: "h3", title: "Splitting", content: "split_data returns items[test_count:], items[:test_count]. Then SEED = 13, mixed = shuffled(PEBBLES, Rng(SEED)) and train_set, test_set = split_data(mixed, 10)." },
      ],
      tests: [
        {
          id: "t1",
          description: "shuffled follows the dice machine, step by step",
          assertionCode: py`
_got = shuffled(["a", "b", "c", "d"], Rng(1))
assert _got == ["d", "c", "b", "a"], f"With Rng(1) the shuffle of ['a', 'b', 'c', 'd'] should be ['d', 'c', 'b', 'a'] (see the trace in the lesson) but shuffled gave {_got!r}"
`,
        },
        {
          id: "t2",
          description: "shuffled leaves the original list alone",
          assertionCode: py`
_orig = ["a", "b", "c", "d"]
shuffled(_orig, Rng(1))
assert _orig == ["a", "b", "c", "d"], "shuffled changed the list you gave it. Start with items = list(items) to work on a copy"
`,
        },
        {
          id: "t3",
          description: "split_data cuts the list in two",
          assertionCode: py`
_got = split_data([1, 2, 3, 4, 5], 2)
assert _got == ([3, 4, 5], [1, 2]), f"split_data([1, 2, 3, 4, 5], 2) should give ([3, 4, 5], [1, 2]) (train first, then test) but gave {_got!r}"
`,
        },
        {
          id: "t4",
          description: "SEED is 13 and mixed is a shuffle of all 40 pebbles",
          assertionCode: py`
assert SEED == 13, f"SEED should be 13 but is {SEED!r}"
assert len(mixed) == 40, f"mixed should hold all 40 pebbles but has {len(mixed)}"
assert mixed != PEBBLES, "mixed should be in a different order from PEBBLES. Did you shuffle it?"
assert sorted(str(p) for p in mixed) == sorted(str(p) for p in PEBBLES), "mixed should hold exactly the same pebbles as PEBBLES, just reordered"
assert PEBBLES[0] == {"flat": 6, "shine": 2, "kind": "skipper"}, "PEBBLES itself must stay unchanged: shuffle a copy"
`,
        },
        {
          id: "t5",
          description: "30 pebbles to study, 10 hidden, no pebble in both",
          assertionCode: py`
assert len(train_set) == 30 and len(test_set) == 10, f"There should be 30 training and 10 test pebbles, but train_set has {len(train_set)} and test_set has {len(test_set)}"
assert test_set == mixed[:10] and train_set == mixed[10:], "test_set should be the first 10 of mixed and train_set the rest"
assert test_set[0] == {"flat": 9, "shine": 4, "kind": "skipper"}, f"With SEED = 13 the first hidden pebble should be the skipper at (9, 4) but it is {test_set[0]!r}. Check the seed and your shuffle."
`,
        },
      ],
      unlocks: ["pb-split"],
      checks: [
        {
          prompt: "Why do we hide a test set from Pip while it studies?",
          question: {
            type: "choice",
            options: [
              "So the score on it shows how Pip does on pebbles it has never seen",
              "Because Python cannot hold 40 pebbles at once",
              "To make training faster",
              "To remove the hard pebbles",
            ],
            answer: 0,
          },
          explanation: "It is the exam with questions the student has not seen. Only then does the score say anything about real life.",
        },
        {
          prompt: "What does `Rng(13)` give you if you run the program twice?",
          question: { type: "choice", options: ["The same rolls both times", "Different rolls each time", "An error", "Only zeros"], answer: 0 },
          explanation: "A seeded dice machine repeats exactly. That is why your results match the checks every time.",
        },
      ],
    },

    // ───────────────────────── 9 ─────────────────────────
    {
      id: "ai-first-steps-9-honest",
      title: "An honest score",
      minutes: 22,
      xp: 100,
      concepts: ["train accuracy", "test accuracy", "generalising"],
      learn: md`### Two scores for one guesser

Now Pip can be marked in two ways:

- on the **training pebbles**, the ones it studied. This is like marking a quiz right after showing the answers.
- on the **test pebbles**, the hidden ones. This is the exam.

Only the exam score tells you whether Pip can handle the real world. Doing well on pebbles it has never seen is called **generalising**, and it is the whole point of machine learning.

### Why the study score is flattering

When we ask Pip about a pebble that is *in* the training pile, its nearest neighbour is that very pebble, at distance 0. It simply finds itself and copies its own label, so the training score is almost always very high. It tells you little.

### One helper does both jobs

You already have the pieces. A \`score\` function is just them glued together:

~~~python
def score(train, check, k):
    guesses = guess_all(train, check, k)
    return accuracy(guesses, labels_of(check))
~~~

\`train\` are the examples Pip may look at, \`check\` are the pebbles to mark. For the study score, both are the training pile. For the exam score, \`check\` is the hidden test pile.

Trace for a tiny case with k = 1: the examples are a roller at (1, 1) and a sparkler at (9, 9). The check pebbles are (2, 2) roller, (8, 8) sparkler and (1, 2) sparkler. Guesses: roller, sparkler, roller. Against the truths roller, sparkler, sparkler that is 2 right of 3, so the score is 67.`,
      mission: md`Mark Pip twice, with 3 neighbours (\`K\`): once on the pebbles it studied, once on the hidden test pebbles. Print both lines so you can see them in the Console.

When this lesson passes, the **Honest score** card appears, with the study score and the exam score side by side.`,
      tasks: [
        "score(train, check, k): the accuracy of the vote-guess on the pebbles in check, learning from train",
        "train_accuracy: score(train_set, train_set, K)",
        "test_accuracy: score(train_set, test_set, K)",
        "Run and read the two printed lines",
      ],
      starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 9: an honest score.


def score(train, check, k):
    """Accuracy of the vote-guess on the pebbles in check, using train as the examples."""
    ...


train_accuracy = None  # marked on the pebbles it studied
test_accuracy = None  # marked on the hidden pebbles

print("Marked on the pebbles it studied:", train_accuracy, "percent")
print("Marked on the hidden pebbles:", test_accuracy, "percent")`,
      solutionAdd: py`def score(train, check, k):
    guesses = guess_all(train, check, k)
    return accuracy(guesses, labels_of(check))


train_accuracy = score(train_set, train_set, K)
test_accuracy = score(train_set, test_set, K)

print("Marked on the pebbles it studied:", train_accuracy, "percent")
print("Marked on the hidden pebbles:", test_accuracy, "percent")`,
      explanation:
        "score glues guess_all and accuracy together. On the pebbles it studied Pip scores 100, because every one of them finds itself as a nearest neighbour. On the 10 hidden pebbles it scores 90: nine right and one wrong. The 90 is the number to believe.",
      hints: [
        { id: "h1", title: "score", content: "Two lines: guesses = guess_all(train, check, k), then return accuracy(guesses, labels_of(check))." },
        { id: "h2", title: "Study score", content: "Both the examples and the pebbles being marked are the training pile: train_accuracy = score(train_set, train_set, K)." },
        { id: "h3", title: "Exam score", content: "The examples are the training pile but the pebbles being marked are the hidden ones: test_accuracy = score(train_set, test_set, K)." },
      ],
      tests: [
        {
          id: "t1",
          description: "score marks the check pebbles using the training examples",
          assertionCode: py`
_train = [{"flat": 1, "shine": 1, "kind": "roller"}, {"flat": 9, "shine": 9, "kind": "sparkler"}]
_check = [
    {"flat": 2, "shine": 2, "kind": "roller"},
    {"flat": 8, "shine": 8, "kind": "sparkler"},
    {"flat": 1, "shine": 2, "kind": "sparkler"},
]
_got = score(_train, _check, 1)
assert _got == 67, f"2 of the 3 check pebbles are guessed right (the last one is guessed roller but is a sparkler), so score should be 67 but it returned {_got!r}"
`,
        },
        {
          id: "t2",
          description: "train_accuracy is the score on the pebbles Pip studied",
          assertionCode: py`
assert train_accuracy == 100, f"Marked on the training pile itself, every pebble finds itself as a neighbour, so train_accuracy should be 100 but it is {train_accuracy!r}"
`,
        },
        {
          id: "t3",
          description: "test_accuracy is the score on the hidden pebbles",
          assertionCode: py`
assert test_accuracy == 90, f"On the 10 hidden pebbles Pip should get 9 right (90 percent) but test_accuracy is {test_accuracy!r}. Learn from train_set and mark test_set."
`,
        },
        {
          id: "t4",
          description: "the Console shows both scores",
          assertionCode: py`
assert "100" in __stdout__ and "90" in __stdout__, "The Console should show both scores, 100 and 90. Run your code and read the two printed lines."
`,
        },
      ],
      unlocks: ["pb-scores"],
      checks: [
        {
          prompt: "Which score should you trust to say how Pip does on brand-new pebbles?",
          question: { type: "choice", options: ["The score on the pebbles it studied", "The score on the hidden test pebbles", "Both are equally trustworthy", "Neither"], answer: 1 },
          explanation: "The hidden pebbles are the only ones Pip could not have copied from. They stand in for the real world.",
        },
        {
          prompt: "Why is the study score almost always very high for nearest-neighbour guessing?",
          question: {
            type: "choice",
            options: [
              "Each studied pebble is its own nearest neighbour, at distance 0",
              "Studied pebbles are easier to measure",
              "Python adds bonus points",
              "k is always 100",
            ],
            answer: 0,
          },
          explanation: "A pebble in the training pile finds itself and copies its own label.",
        },
      ],
    },

    // ───────────────────────── 10 ─────────────────────────
    {
      id: "ai-first-steps-10-memorise",
      title: "Memorising is not learning",
      minutes: 24,
      xp: 110,
      concepts: ["overfitting", "memorising", "tuple keys"],
      learn: md`### The pupil who memorised last year's test

A pupil gets last year's exam paper with all the answers. They memorise it word for word. Give them that same paper and they score 100. Give them this year's paper, with different questions, and they are lost, because they never understood anything.

A model that does great on the examples it studied but badly on new ones has the same problem. We say it **overfits**: it fits the examples it studied too closely, accidents and all, so it does worse on new things.

You can see the extreme case by building a memoriser on purpose.

### A memoriser in Python

A memoriser is a lookup book. For each pebble it studied it writes down "clues -> kind". To guess, it looks the clues up. If the clues are not in the book, it has no idea.

A dictionary can use a pair as its key, written with round brackets. A pair is a *tuple*, like the \`(distance, position)\` pairs you made earlier:

~~~python
book = {}
book[(6, 2)] = "skipper"
print(book.get((6, 2), "no idea"))
print(book.get((7, 7), "no idea"))
~~~

~~~text
skipper
no idea
~~~

\`book.get(key, "no idea")\` opens the box for \`key\` if it exists, otherwise it hands back \`"no idea"\`.

### Your two functions

~~~python
def memorise(examples):
    book = {}
    for example in examples:
        book[(example["flat"], example["shine"])] = example["kind"]
    return book
~~~

\`recall_all(book, check)\` makes a list with one answer per pebble in \`check\`: the book's answer for its clues, or \`"no idea"\`.

### What to expect

On the pebbles it studied, the memoriser looks every one up and is right every time. On a hidden pebble, whose exact pair of clues is not in the book, it says "no idea". It has memorised without learning anything about *what makes a skipper a skipper*.`,
      mission: md`Build the memoriser, train it on \`train_set\`, and mark it twice: on the pebbles it studied and on the hidden test pebbles. Then compare its exam score with the nearest-neighbour exam score from the last lesson.

When this lesson passes, the **Memoriser** card appears and puts the two models' exam scores side by side.`,
      tasks: [
        "memorise(examples): return a dictionary from (flat, shine) to kind",
        "recall_all(book, check): the book's answer for each pebble, or \"no idea\" when it is not in the book",
        "book = memorise(train_set)",
        "memo_train_accuracy and memo_test_accuracy: the memoriser's accuracy on train_set and on test_set",
      ],
      starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 10: memorising is not learning.


def memorise(examples):
    """Return a dictionary whose keys are (flat, shine) pairs and whose values are the kinds."""
    ...


def recall_all(book, check):
    """For each pebble in check: the book's answer for its (flat, shine), or "no idea"."""
    ...


book = {}  # memorise(train_set)
memo_train_accuracy = None  # on the pebbles it studied
memo_test_accuracy = None  # on the hidden pebbles

print("Memoriser, studied pebbles:", memo_train_accuracy, "percent")
print("Memoriser, hidden pebbles:", memo_test_accuracy, "percent")`,
      solutionAdd: py`def memorise(examples):
    book = {}
    for example in examples:
        book[(example["flat"], example["shine"])] = example["kind"]
    return book


def recall_all(book, check):
    answers = []
    for pebble in check:
        answers.append(book.get((pebble["flat"], pebble["shine"]), "no idea"))
    return answers


book = memorise(train_set)
memo_train_accuracy = accuracy(recall_all(book, train_set), labels_of(train_set))
memo_test_accuracy = accuracy(recall_all(book, test_set), labels_of(test_set))

print("Memoriser, studied pebbles:", memo_train_accuracy, "percent")
print("Memoriser, hidden pebbles:", memo_test_accuracy, "percent")`,
      explanation:
        "The memoriser stores one entry per studied pebble. Asked about a studied pebble it answers perfectly (100), but none of the hidden pebbles has exactly the same pair of clues as a studied one, so it answers no idea for all ten and scores 0. Nearest neighbour is far better on hidden pebbles (90) because it handles pebbles that are merely similar, not identical. That ability to cope with new cases is what we want from learning.",
      hints: [
        { id: "h1", title: "memorise", content: 'book = {} then for each example: book[(example["flat"], example["shine"])] = example["kind"]. Return book.' },
        { id: "h2", title: "recall_all", content: 'For each pebble, append book.get((pebble["flat"], pebble["shine"]), "no idea") to a list and return the list.' },
        { id: "h3", title: "Scores", content: "Reuse accuracy and labels_of: accuracy(recall_all(book, train_set), labels_of(train_set)), and the same with test_set." },
      ],
      tests: [
        {
          id: "t1",
          description: "memorise stores each pebble's kind under its (flat, shine) pair",
          assertionCode: py`
_got = memorise([{"flat": 6, "shine": 2, "kind": "skipper"}, {"flat": 1, "shine": 8, "kind": "sparkler"}])
assert _got == {(6, 2): "skipper", (1, 8): "sparkler"}, f"memorise should give {{(6, 2): 'skipper', (1, 8): 'sparkler'}} but gave {_got!r}"
`,
        },
        {
          id: "t2",
          description: "recall_all answers from the book, or says no idea",
          assertionCode: py`
_book = {(6, 2): "skipper"}
_got = recall_all(_book, [{"flat": 6, "shine": 2}, {"flat": 7, "shine": 7}])
assert _got == ["skipper", "no idea"], f"recall_all should give ['skipper', 'no idea'] but gave {_got!r}"
`,
        },
        {
          id: "t3",
          description: "the memoriser is perfect on pebbles it studied",
          assertionCode: py`
assert len(book) == 30, f"book should hold one entry for each of the 30 training pebbles but has {len(book)}. Did you set book = memorise(train_set)?"
assert memo_train_accuracy == 100, f"On the pebbles it studied the memoriser should be right every time (100) but memo_train_accuracy is {memo_train_accuracy!r}"
`,
        },
        {
          id: "t4",
          description: "the memoriser is lost on hidden pebbles",
          assertionCode: py`
assert memo_test_accuracy == 0, f"No hidden pebble has exactly the same clues as a studied one, so the memoriser says 'no idea' for all of them and scores 0, but memo_test_accuracy is {memo_test_accuracy!r}"
assert memo_test_accuracy < test_accuracy, "nearest neighbour (test_accuracy) should beat the memoriser on hidden pebbles"
`,
        },
      ],
      unlocks: ["pb-memory"],
      checks: [
        {
          prompt: "A model scores 100 on the pebbles it studied and 30 on new pebbles. What do we say about it?",
          question: { type: "choice", options: ["It overfits", "It is perfect", "It is lazy", "It is too short"], answer: 0 },
          explanation: "Overfitting is a big gap between the score on studied examples (very high) and the score on new ones (much lower).",
        },
        {
          prompt: "What does `book.get((7, 7), \"no idea\")` return when `(7, 7)` is not in `book`?",
          question: { type: "text", answer: ["no idea", "\"no idea\"", "'no idea'"] },
          explanation: "`.get` hands back its second argument when the key is missing, instead of crashing.",
        },
      ],
    },

    // ───────────────────────── 11 ─────────────────────────
    {
      id: "ai-first-steps-11-how-many",
      title: "How many neighbours is best?",
      minutes: 24,
      xp: 110,
      concepts: ["choosing k", "too jumpy", "too blurry", "tables of results"],
      learn: md`### Not too jumpy, not too blurry

The number of neighbours, **k**, is a setting that you choose. It changes how the model behaves:

- **k too small** (like 1): the model trusts one pebble completely. If that pebble is odd, the guess is odd. The model is jumpy and nearly memorises.
- **k too large**: the model asks so many neighbours that faraway pebbles outvote the nearby ones, and it blurs the differences between kinds.

Somewhere in between is a good value. Instead of guessing, you can *try* several values and look at the results in a table.

### A list of results

Each result can be a small dictionary, and the table is a list of them:

~~~python
table = [
    {"k": 1, "train": 100, "test": 80},
    {"k": 3, "train": 100, "test": 90},
]
for row in table:
    print("k =", row["k"], "studied", row["train"], "hidden", row["test"])
~~~

~~~text
k = 1 studied 100 hidden 80
k = 3 studied 100 hidden 90
~~~

### Picking the best

Walk down the table and keep the row with the best hidden score, using the same "best so far" trick as before. Use \`>\` (strictly better), so when two rows tie the earlier row wins. The rows are ordered from small k to large k, so a tie picks the smaller k, which is the simpler model.

~~~python
def pick_best_k(table):
    best = table[0]
    for row in table:
        if row["test"] > best["test"]:
            best = row
    return best["k"]
~~~

### A word of honesty

Choosing k by looking at the hidden pebbles means they are no longer completely hidden: you peeked at them to decide. For a tiny comparison of four values the harm is small, and later we will check Pip on a brand-new basket. Real projects keep a third pile just for the final exam.`,
      mission: md`Try four different values of k, \`[1, 3, 5, 7]\`, and build the table of study scores and hidden scores. Print it, then pick the best k.

When this lesson passes, the **How many neighbours?** card appears with a pair of bars for each k.`,
      tasks: [
        "try_ks(train, check, ks): a list of dictionaries {\"k\": k, \"train\": score on train, \"test\": score on check}",
        "fit_table: try_ks(train_set, test_set, [1, 3, 5, 7])",
        "pick_best_k(table): the k of the row with the best hidden (\"test\") score; the earlier row wins a tie",
        "best_k: pick_best_k(fit_table)",
      ],
      starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 11: how many neighbours is best?


def try_ks(train, check, ks):
    """For each k in ks: {"k": k, "train": score on train, "test": score on check}."""
    ...


def pick_best_k(table):
    """The k of the row with the best hidden score. A tie goes to the earlier row."""
    ...


fit_table = []  # try_ks(train_set, test_set, [1, 3, 5, 7])
best_k = None

for row in fit_table:
    print("k =", row["k"], "studied", row["train"], "hidden", row["test"])
print("Best k:", best_k)`,
      solutionAdd: py`def try_ks(train, check, ks):
    table = []
    for k in ks:
        table.append({"k": k, "train": score(train, train, k), "test": score(train, check, k)})
    return table


def pick_best_k(table):
    best = table[0]
    for row in table:
        if row["test"] > best["test"]:
            best = row
    return best["k"]


fit_table = try_ks(train_set, test_set, [1, 3, 5, 7])
best_k = pick_best_k(fit_table)

for row in fit_table:
    print("k =", row["k"], "studied", row["train"], "hidden", row["test"])
print("Best k:", best_k)`,
      explanation:
        "try_ks scores each k twice, on the studied pebbles and on the hidden ones. With k = 1 Pip scores 100 on studied pebbles but only 80 on hidden ones (a jumpy, nearly-memorising model that trusts the odd skipper that looks like a roller). With k = 3 the hidden score rises to 90 and stays there for 5 and 7, while the studied score slowly falls. The first k to reach the best hidden score is 3, and it is the simplest good choice.",
      hints: [
        { id: "h1", title: "try_ks", content: 'table = [] then for each k: table.append({"k": k, "train": score(train, train, k), "test": score(train, check, k)}). Return table.' },
        { id: "h2", title: "pick_best_k", content: 'best = table[0], then for row in table: if row["test"] > best["test"]: best = row. Return best["k"].' },
        { id: "h3", title: "Using them", content: "fit_table = try_ks(train_set, test_set, [1, 3, 5, 7]) and best_k = pick_best_k(fit_table)." },
      ],
      tests: [
        {
          id: "t1",
          description: "try_ks builds one row per k",
          assertionCode: py`
_train = [{"flat": 1, "shine": 1, "kind": "roller"}, {"flat": 9, "shine": 9, "kind": "sparkler"}]
_check = [{"flat": 2, "shine": 2, "kind": "roller"}, {"flat": 8, "shine": 8, "kind": "sparkler"}]
_got = try_ks(_train, _check, [1, 2])
assert isinstance(_got, list) and len(_got) == 2, f"try_ks should give one row per k, but gave {_got!r}"
assert _got[0] == {"k": 1, "train": 100, "test": 100}, f"The row for k = 1 should be {{'k': 1, 'train': 100, 'test': 100}} but is {_got[0]!r}"
`,
        },
        {
          id: "t2",
          description: "pick_best_k takes the best hidden score; the earlier row wins a tie",
          assertionCode: py`
_rows = [{"k": 1, "train": 100, "test": 70}, {"k": 3, "train": 95, "test": 90}, {"k": 5, "train": 90, "test": 90}]
assert pick_best_k(_rows) == 3, "k = 3 and k = 5 both have the best hidden score (90). The earlier row, k = 3, should win the tie (use > not >=)"
assert pick_best_k([{"k": 7, "train": 80, "test": 50}]) == 7, "with a single row, that row's k is the answer"
`,
        },
        {
          id: "t3",
          description: "fit_table scores k = 1, 3, 5 and 7",
          assertionCode: py`
assert [r["k"] for r in fit_table] == [1, 3, 5, 7], f"fit_table should have rows for k = 1, 3, 5, 7 but has {[r['k'] for r in fit_table]!r}"
assert [r["test"] for r in fit_table] == [80, 90, 90, 90], f"The hidden scores for k = 1, 3, 5, 7 should be 80, 90, 90, 90 but are {[r['test'] for r in fit_table]!r}"
assert [r["train"] for r in fit_table] == [100, 100, 97, 93], f"The studied scores for k = 1, 3, 5, 7 should be 100, 100, 97, 93 but are {[r['train'] for r in fit_table]!r}"
`,
        },
        {
          id: "t4",
          description: "best_k is the winner",
          assertionCode: py`
assert best_k == 3, f"best_k should be 3 (the first k with the best hidden score) but it is {best_k!r}"
`,
        },
      ],
      unlocks: ["pb-fit"],
      checks: [
        {
          prompt: "With k = 1, what does the model trust?",
          question: { type: "choice", options: ["Only the single nearest example", "The whole dataset equally", "The three nearest examples", "Nothing"], answer: 0 },
          explanation: "k = 1 copies the nearest example's label, odd or not.",
        },
        {
          prompt: "Why is it a little unfair to pick k by looking at the hidden pebbles' score?",
          question: {
            type: "choice",
            options: [
              "Because we peeked at them to make a decision, so they are no longer fully hidden",
              "Because hidden pebbles are heavier",
              "Because k must always be 1",
              "It is not unfair at all",
            ],
            answer: 0,
          },
          explanation: "The more we tune using the exam, the less the exam score means. Serious projects keep one more untouched pile for the final check.",
        },
      ],
    },
  ],
};
