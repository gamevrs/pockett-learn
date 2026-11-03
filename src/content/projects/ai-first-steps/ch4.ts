import type { Chapter } from "@/engine/types";
import { COVE_BLOCK, EXTRA_BLOCK, md, py } from "./util.ts";

/**
 * Chapter 4: Fair data, the whole pipeline. A lopsided sample, fixing it, a confusion table built by hand,
 * and the learn / test / guess pipeline as three small functions.
 */

export const chapter4: Chapter = {
  id: "pipeline",
  title: "Fair data, whole pipeline",
  blurb: "Catch a lopsided sample, read your mistakes, and join it all together.",
  lessons: [
    // ───────────────────────── 12 ─────────────────────────
    {
      id: "ai-first-steps-12-lopsided",
      title: "A lopsided sample",
      minutes: 24,
      xp: 110,
      concepts: ["bias in data", "sample", "share of a kind"],
      learn: md`### Asking only the ice-cream shop

Suppose you want to know the favourite food of everyone in town, but you only ask people standing in the ice-cream shop. You will learn that most people love ice cream. The answer says more about where you asked than about the town.

When the examples you collect are not a fair picture of the real world, we say the data is **biased**. A model learns whatever its examples show it, so a lopsided sample teaches lopsided guesses, even when the code is perfectly correct.

### What can go wrong in data

- **Lopsided samples:** one kind is over-represented (many rollers, few sparklers).
- **Mistakes:** a typo in a measurement, a sensor that stuck at 9, or an example with the wrong label. Pip would learn the mistake as if it were truth.
- **Missing places:** nobody collected from some part of the beach.

You cannot see these problems by staring at the code. You have to look at the data. The simplest look is the one you already know: count the kinds, and turn the counts into shares.

A *share* of a group is its part of the whole, as a percentage:

~~~python
print(round(100 * 14 / 18))
~~~

~~~text
78
~~~

### Pip's mistake

This morning Pip only visited the rocky north cove, where waves have rounded most stones, and scooped 18 pebbles into a list named \`COVE\`. A person checked each kind. The list is in your file. Is it a fair picture of the whole beach?

You will count the kinds, work out the share of rollers, and then test a Pip that learned only from this lopsided scoop on the basket of 12 fresh pebbles from lesson 7. You know the fair Pip scored \`basket_accuracy\` on the same basket.`,
      mission: md`Investigate the cove scoop. Count its kinds with the \`count_kinds\` you wrote in lesson 2, find the percentage that are rollers, then let a Pip that studied only \`COVE\` (with \`K\` neighbours) guess the basket.

When this lesson passes, the **Lopsided sample** card appears with the cove's kinds as a bar, and the accuracy it costs.`,
      tasks: [
        "cove_counts: count_kinds applied to COVE",
        "cove_roller_share: the percentage of COVE that are rollers, rounded to a whole number",
        "cove_accuracy: the accuracy on BASKET when the examples are COVE and the number of neighbours is K",
        "Run it and compare cove_accuracy with basket_accuracy",
      ],
      starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 12: a lopsided sample.
#
# Pip's scoop from the rocky north cove is PROVIDED below.

` + COVE_BLOCK + py`

cove_counts = {}  # how many of each kind are in COVE?
cove_roller_share = None  # percent of COVE that are rollers
cove_accuracy = None  # Pip learns from COVE only, and guesses BASKET (K neighbours)

print("Cove kinds:", cove_counts)
print("Rollers in the cove:", cove_roller_share, "percent")
print("Pip trained on the cove scores", cove_accuracy, "on the basket, against", basket_accuracy, "when trained on the whole beach")`,
      solutionAdd: COVE_BLOCK + py`

cove_counts = count_kinds(COVE)
cove_roller_share = round(100 * cove_counts["roller"] / len(COVE))
cove_accuracy = score(COVE, BASKET, K)

print("Cove kinds:", cove_counts)
print("Rollers in the cove:", cove_roller_share, "percent")
print("Pip trained on the cove scores", cove_accuracy, "on the basket, against", basket_accuracy, "when trained on the whole beach")`,
      explanation:
        "Counting shows the problem straight away: 14 of the 18 cove pebbles (78 percent) are rollers, only 3 are skippers and a single one is a sparkler. A Pip trained on that scoop rarely meets a sparkler to compare with, so on the fair basket it scores only 67 instead of 100. The code was fine; the data was lopsided.",
      hints: [
        { id: "h1", title: "Count", content: "You already wrote count_kinds. cove_counts = count_kinds(COVE)." },
        { id: "h2", title: "Share", content: 'The rollers are cove_counts["roller"]. Share = round(100 * cove_counts["roller"] / len(COVE)).' },
        { id: "h3", title: "Accuracy", content: "score(train, check, k) already does it: the examples are COVE, the pebbles to mark are BASKET, and k is K." },
      ],
      tests: [
        {
          id: "t1",
          description: "cove_counts shows the lopsided mix",
          assertionCode: py`
assert cove_counts == {"roller": 14, "skipper": 3, "sparkler": 1}, f"cove_counts should be {{'roller': 14, 'skipper': 3, 'sparkler': 1}} but is {cove_counts!r}. Did you use count_kinds(COVE)?"
`,
        },
        {
          id: "t2",
          description: "cove_roller_share is the percentage of rollers",
          assertionCode: py`
assert cove_roller_share == 78, f"14 of 18 pebbles are rollers, which is 77.8 percent and rounds to 78, but cove_roller_share is {cove_roller_share!r}"
`,
        },
        {
          id: "t3",
          description: "a Pip trained on the cove does worse on the fair basket",
          assertionCode: py`
assert cove_accuracy == 67, f"Trained on COVE (K = 3) Pip should get 8 of the 12 basket pebbles right, 67 percent, but cove_accuracy is {cove_accuracy!r}"
assert cove_accuracy < basket_accuracy, "the lopsided scoop should do worse than learning from the whole beach"
`,
        },
        {
          id: "t4",
          description: "the Console shows the comparison",
          assertionCode: py`
assert "78 percent" in __stdout__ and "67" in __stdout__, "Run your code: the Console should show the 78 percent of rollers and the cove score of 67."
`,
        },
      ],
      unlocks: ["pb-bias"],
      checks: [
        {
          prompt: "What do we call data that is not a fair picture of the real world?",
          question: { type: "text", answer: ["biased", "bias"] },
          explanation: "Biased (or lopsided) data teaches a model a lopsided view, however good the code is.",
        },
        {
          prompt: "Pip learned only from the cove, where 78 percent of pebbles are rollers. Which mistake is it most likely to make?",
          question: {
            type: "choice",
            options: [
              "Calling sparklers and skippers rollers",
              "Calling every roller a sparkler",
              "Refusing to answer",
              "Guessing numbers instead of kinds",
            ],
            answer: 0,
          },
          explanation: "Most of the neighbours it can find are rollers, so rollers outvote the rarer kinds.",
        },
      ],
    },

    // ───────────────────────── 13 ─────────────────────────
    {
      id: "ai-first-steps-13-fair",
      title: "Fix the pile",
      minutes: 24,
      xp: 110,
      concepts: ["collecting more data", "quota", "joining lists"],
      learn: md`### Two fixes for a lopsided pile

1. **Collect what is missing.** Pip walks to the sandy south shore and scoops more skippers and sparklers. The new scoop is in your file as \`EXTRA\`.
2. **Don't let one kind drown the rest.** Even after collecting, rollers are still the biggest group. We can set a **quota**: keep at most a fixed number of each kind and ignore the extras.

The first fix is about the real world. The second one is a tidy-up in code. Trimming alone could not have rescued the cove, which had only one sparkler: you cannot keep what you never collected.

### Joining two lists

Use \`+\` to glue lists together into a new list:

~~~python
print([1, 2] + [3, 4, 5])
~~~

~~~text
[1, 2, 3, 4, 5]
~~~

### A quota in code

~~~python
def balanced(examples, per_kind):
    kept = []
    seen = {}
    for example in examples:
        name = label(example)
        if seen.get(name, 0) < per_kind:
            kept.append(example)
            seen[name] = seen.get(name, 0) + 1
    return kept
~~~

\`seen\` counts how many of each kind we have kept so far. A pebble is kept only while its kind is still under the quota. Trace with the kinds roller, roller, skipper, roller and a quota of 2: the first roller is kept (seen 1), the second is kept (seen 2), the skipper is kept (seen 1), and the third roller is skipped because 2 is not less than 2.

~~~python
pile = [{"kind": "roller"}, {"kind": "roller"}, {"kind": "skipper"}, {"kind": "roller"}]
print(balanced(pile, 2))
~~~

~~~text
[{'kind': 'roller'}, {'kind': 'roller'}, {'kind': 'skipper'}]
~~~`,
      mission: md`Join the cove scoop and the south shore scoop. Count the kinds of the joined pile, then set a quota of 7 per kind to make a fair pile, and let Pip learn from it. Does it do better on the basket than the cove-only Pip?

When this lesson passes, the **A fair pile** card appears and shows the before and after.`,
      tasks: [
        "combined = COVE + EXTRA, then combined_counts: count_kinds of it",
        "balanced(examples, per_kind): keep at most per_kind of each kind, in list order",
        "fair_pile = balanced(combined, 7), then fair_counts: count_kinds of it",
        "fair_accuracy: the accuracy on BASKET when the examples are fair_pile (K neighbours)",
      ],
      starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 13: fix the pile.
#
# Pip's second scoop is PROVIDED below.

` + EXTRA_BLOCK + py`


def balanced(examples, per_kind):
    """Keep at most per_kind pebbles of each kind, in list order."""
    ...


combined = []  # COVE and EXTRA joined
combined_counts = {}
fair_pile = []  # balanced(combined, 7)
fair_counts = {}
fair_accuracy = None  # Pip learns from fair_pile and guesses BASKET (K neighbours)

print("Joined pile:", combined_counts)
print("Fair pile:", fair_counts)
print("Cove only:", cove_accuracy, "- fair pile:", fair_accuracy)`,
      solutionAdd: EXTRA_BLOCK + py`


def balanced(examples, per_kind):
    kept = []
    seen = {}
    for example in examples:
        name = label(example)
        if seen.get(name, 0) < per_kind:
            kept.append(example)
            seen[name] = seen.get(name, 0) + 1
    return kept


combined = COVE + EXTRA
combined_counts = count_kinds(combined)
fair_pile = balanced(combined, 7)
fair_counts = count_kinds(fair_pile)
fair_accuracy = score(fair_pile, BASKET, K)

print("Joined pile:", combined_counts)
print("Fair pile:", fair_counts)
print("Cove only:", cove_accuracy, "- fair pile:", fair_accuracy)`,
      explanation:
        "Joining the scoops gives 14 rollers, 8 skippers and 7 sparklers. The quota of 7 trims the rollers and one skipper so every kind has the same say: 7 each. Learning from that pile lifts Pip's basket score from 67 to 92. The fix was two-fold: go and collect the missing kinds, then keep the mix even.",
      hints: [
        { id: "h1", title: "Joining", content: "combined = COVE + EXTRA. Then combined_counts = count_kinds(combined)." },
        { id: "h2", title: "balanced", content: "Keep a list kept = [] and a dictionary seen = {}. Keep an example when seen.get(name, 0) < per_kind, and then add 1 to seen[name]." },
        { id: "h3", title: "The fair Pip", content: "fair_pile = balanced(combined, 7), fair_counts = count_kinds(fair_pile), and fair_accuracy = score(fair_pile, BASKET, K)." },
      ],
      tests: [
        {
          id: "t1",
          description: "balanced keeps at most per_kind of each kind",
          assertionCode: py`
_pile = [{"kind": "roller"}, {"kind": "roller"}, {"kind": "skipper"}, {"kind": "roller"}]
_got = balanced(_pile, 2)
assert _got == [{"kind": "roller"}, {"kind": "roller"}, {"kind": "skipper"}], f"With a quota of 2 the third roller should be left out, giving two rollers then the skipper, but balanced gave {_got!r}"
assert balanced([], 3) == [], "an empty pile stays empty"
`,
        },
        {
          id: "t2",
          description: "combined joins both scoops",
          assertionCode: py`
assert len(combined) == 29, f"COVE has 18 pebbles and EXTRA has 11, so combined should have 29 but has {len(combined)}"
assert combined_counts == {"roller": 14, "skipper": 8, "sparkler": 7}, f"combined_counts should be {{'roller': 14, 'skipper': 8, 'sparkler': 7}} but is {combined_counts!r}"
`,
        },
        {
          id: "t3",
          description: "fair_pile has the same number of every kind",
          assertionCode: py`
assert fair_counts == {"roller": 7, "skipper": 7, "sparkler": 7}, f"With a quota of 7, each kind should appear 7 times, but fair_counts is {fair_counts!r}"
assert len(fair_pile) == 21, f"fair_pile should hold 21 pebbles but holds {len(fair_pile)}"
`,
        },
        {
          id: "t4",
          description: "learning from the fair pile beats learning from the cove",
          assertionCode: py`
assert fair_accuracy == 92, f"Learning from the fair pile Pip should get 11 of 12 basket pebbles right, 92 percent, but fair_accuracy is {fair_accuracy!r}"
assert fair_accuracy > cove_accuracy, "the fair pile should beat the cove-only pile"
`,
        },
      ],
      unlocks: ["pb-fair"],
      checks: [
        {
          prompt: "A pile has 20 rollers, 2 skippers and 1 sparkler. Which fix helps most?",
          question: {
            type: "choice",
            options: [
              "Collect more skippers and sparklers, then keep the mix even",
              "Throw away all the skippers and sparklers",
              "Use a bigger k",
              "Print the data twice",
            ],
            answer: 0,
          },
          explanation: "You cannot learn a kind you hardly ever saw. Go and collect more of the rare kinds, and then stop one kind from drowning the others.",
        },
        {
          prompt: "What is `[1, 2] + [3]`?",
          question: { type: "text", answer: ["[1, 2, 3]", "[1,2,3]"] },
          explanation: "`+` joins two lists into a new list.",
        },
      ],
    },

    // ───────────────────────── 14 ─────────────────────────
    {
      id: "ai-first-steps-14-table",
      title: "Which mistakes? A confusion table",
      minutes: 26,
      xp: 120,
      concepts: ["confusion table", "nested dictionary", "mistakes by kind"],
      learn: md`### Accuracy hides the story

"90 percent right" says how many mistakes there were, but not *which* mistakes. Did Pip mix up skippers with rollers, or sparklers with skippers? To improve a model you need to know. A **confusion table** shows it.

It is a grid. Each **row** is a true kind. Each **column** is what Pip guessed. The number in a cell counts the pebbles with that true kind that got that guess. The cells where the row and the column match, the **diagonal**, are the correct answers. Everything off the diagonal is a mistake.

Tiny example: three pebbles whose true kinds are roller, skipper and roller, and Pip guessed roller, skipper, skipper:

| true / guessed | skipper | roller | sparkler |
| --- | --- | --- | --- |
| skipper | 1 | 0 | 0 |
| roller | 1 | 1 | 0 |
| sparkler | 0 | 0 | 0 |

Reading the roller row: of two true rollers, one was guessed roller (right) and one was guessed skipper (a mistake).

### A table inside a table

In Python, one row of the grid is a dictionary of counts, and the whole grid is a dictionary of those rows: a **nested dictionary**. \`table["roller"]["skipper"]\` first opens the roller row, then the skipper box inside it.

Start with every cell at 0. \`KINDS\` is in your file:

~~~python
def blank_table():
    table = {}
    for truth in KINDS:
        table[truth] = {}
        for guess in KINDS:
            table[truth][guess] = 0
    return table
~~~

Then add 1 to the right cell for each pebble. \`+= 1\` works on a dictionary box too:

~~~python
def confusion(guesses, truths):
    table = blank_table()
    for i in range(len(truths)):
        table[truths[i]][guesses[i]] += 1
    return table
~~~

Trace the first tiny pebble: its truth is roller and its guess is roller, so \`table["roller"]["roller"]\` goes from 0 to 1. The third pebble has truth roller and guess skipper, so \`table["roller"]["skipper"]\` goes from 0 to 1.

Printing a dictionary row by row, with its name first:

~~~python
for truth in table:
    print(truth, table[truth])
~~~

Looping over a dictionary goes through its keys.`,
      mission: md`Make the confusion table for Pip's exam on the hidden test pebbles (learning from \`train_set\`, with \`K\` neighbours) and find out which kind it mixed up. Then add up the diagonal and check that it agrees with the accuracy from lesson 9.

When this lesson passes, the **Confusion table** appears, with the diagonal shaded.`,
      tasks: [
        "blank_table(): a dictionary of dictionaries with a 0 for every (true kind, guessed kind) pair in KINDS",
        "confusion(guesses, truths): add 1 to table[truth][guess] for each pebble",
        "confusion_table: the table for the guesses on test_set, learning from train_set (K neighbours)",
        "table_right: the sum of the diagonal (cells where the true kind equals the guess)",
      ],
      starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 14: which mistakes?


def blank_table():
    """A dictionary of dictionaries with a 0 for every (true kind, guessed kind) pair."""
    ...


def confusion(guesses, truths):
    """The confusion table: table[true kind][guessed kind] counts the pebbles."""
    ...


confusion_table = {}  # the table for Pip's exam on test_set
table_right = None  # add up the diagonal: the pebbles that were guessed right

for truth in confusion_table:
    print(truth, confusion_table[truth])`,
      solutionAdd: py`def blank_table():
    table = {}
    for truth in KINDS:
        table[truth] = {}
        for guess in KINDS:
            table[truth][guess] = 0
    return table


def confusion(guesses, truths):
    table = blank_table()
    for i in range(len(truths)):
        table[truths[i]][guesses[i]] += 1
    return table


confusion_table = confusion(guess_all(train_set, test_set, K), labels_of(test_set))
table_right = 0
for name in KINDS:
    table_right += confusion_table[name][name]

for truth in confusion_table:
    print(truth, confusion_table[truth])`,
      explanation:
        "blank_table makes the empty grid, confusion fills it in, and the diagonal holds the right answers. On the hidden pebbles Pip got 4 skippers, 3 rollers and 2 sparklers right (9 in all, which matches the 90 percent), and made one mistake: a skipper that it called a roller. That is the odd skipper from the dataset that looks very round, so the one mistake has a clear reason.",
      hints: [
        { id: "h1", title: "blank_table", content: "Two loops. For each truth: table[truth] = {} and then for each guess in KINDS: table[truth][guess] = 0." },
        { id: "h2", title: "confusion", content: "table = blank_table(), then for i in range(len(truths)): table[truths[i]][guesses[i]] += 1. Return table." },
        { id: "h3", title: "The diagonal", content: "Start with table_right = 0 and loop for name in KINDS: table_right += confusion_table[name][name]. The guesses come from guess_all(train_set, test_set, K) and the truths from labels_of(test_set)." },
      ],
      tests: [
        {
          id: "t1",
          description: "blank_table has a 0 for every pair",
          assertionCode: py`
_got = blank_table()
assert isinstance(_got, dict) and set(_got.keys()) == {"skipper", "roller", "sparkler"}, f"blank_table should have one row per kind, but it is {_got!r}"
assert all(set(_got[_t].keys()) == {"skipper", "roller", "sparkler"} and all(_v == 0 for _v in _got[_t].values()) for _t in _got), f"every row should have a 0 for each guessed kind, but blank_table gave {_got!r}"
`,
        },
        {
          id: "t2",
          description: "confusion counts true kind against guessed kind",
          assertionCode: py`
_got = confusion(["roller", "skipper", "skipper"], ["roller", "skipper", "roller"])
assert _got["roller"]["roller"] == 1 and _got["roller"]["skipper"] == 1, f"One true roller was guessed roller and one was guessed skipper, so the roller row should be roller 1, skipper 1, but it is {_got['roller']!r}"
assert _got["skipper"]["skipper"] == 1 and _got["sparkler"]["sparkler"] == 0, "one true skipper was guessed skipper, and no sparklers appeared"
assert sum(sum(_row.values()) for _row in _got.values()) == 3, "three pebbles should add up to 3 across the whole table"
`,
        },
        {
          id: "t3",
          description: "confusion_table is Pip's exam on the hidden pebbles",
          assertionCode: py`
assert confusion_table == {
    "skipper": {"skipper": 4, "roller": 1, "sparkler": 0},
    "roller": {"skipper": 0, "roller": 3, "sparkler": 0},
    "sparkler": {"skipper": 0, "roller": 0, "sparkler": 2},
}, f"confusion_table should show 4 skippers right, 1 skipper called a roller, 3 rollers right and 2 sparklers right, but it is {confusion_table!r}"
`,
        },
        {
          id: "t4",
          description: "the diagonal agrees with the accuracy, and the rows are printed",
          assertionCode: py`
assert table_right == 9, f"The diagonal should add up to 9 pebbles guessed right, but table_right is {table_right!r}"
assert round(100 * table_right / len(test_set)) == test_accuracy, "the diagonal total as a percentage should equal test_accuracy"
assert "skipper {'skipper': 4, 'roller': 1, 'sparkler': 0}" in __stdout__, "Run your code: the Console should print each row of the table, starting with the skipper row"
`,
        },
      ],
      unlocks: ["pb-table"],
      checks: [
        {
          prompt: "In a confusion table, where are the **correct** guesses?",
          question: { type: "choice", options: ["On the diagonal, where row and column are the same kind", "In the first row only", "In the last column only", "Nowhere, tables only show mistakes"], answer: 0 },
          explanation: "A cell where the true kind equals the guessed kind is a correct answer. Everything off the diagonal is a mistake.",
        },
        {
          prompt: "In the table above, how many true skippers were guessed to be rollers?",
          question: { type: "number", answer: 1 },
          explanation: "Row skipper, column roller holds 1: the odd round-looking skipper.",
        },
      ],
    },

    // ───────────────────────── 15 ─────────────────────────
    {
      id: "ai-first-steps-15-pipeline",
      title: "Learn, test, guess",
      minutes: 28,
      xp: 150,
      concepts: ["pipeline", "learn / test / guess", "functions that call functions"],
      learn: md`### The three steps of every learner

Think of a school pupil. They **learn** from their lessons. They **test** themselves with a quiz to see how well it went. Then, in real life, they **guess** an answer to a question nobody has told them.

Every machine learning program, big or small, has the same three steps:

1. **learn**: build the model from the training examples,
2. **test**: score the model on pebbles it did not study,
3. **guess**: use the model on a brand-new pebble.

You have written the pieces. Now you give the three steps their names, so the whole program reads like a story.

### The model, kept in a box

A model needs to remember what it learned. For nearest neighbours that is just the examples and the value of k, so a dictionary does the job:

~~~python
def learn(examples, k):
    return {"examples": examples, "k": k}
~~~

(Nearest neighbours learn in the laziest possible way: they just keep the examples. Other models, in later courses, do real work at this step.)

### Test and guess use the model

~~~python
def test(model, check):
    guesses = guess_all(model["examples"], check, model["k"])
    return accuracy(guesses, labels_of(check))

def guess(model, pebble):
    return guess_by_vote(model["examples"], pebble, model["k"])
~~~

Run the pipeline:

~~~python
model = learn(train_set, 3)
print(test(model, test_set))
print(guess(model, mystery))
~~~

~~~text
90
sparkler
~~~

### Going further (optional)

Pip used two clues and one simple model. Real systems use hundreds of clues and models that do real work in the learning step. Nothing in this course needs that yet. When you are ready for more, the AI path continues with Orchard Vision, which brings in NumPy and models that tune themselves. The ideas you met here (labelled examples, distance, train and test, overfitting, bias) all come with you.`,
      mission: md`Close the loop. Write \`learn\`, \`test\` and \`guess\`, build the final model with the best k from lesson 11, and put its results in a \`report\`: the best k, its exam score on the hidden pebbles, its score on the fresh basket, and its guess about the mystery pebble.

When this lesson passes, the **Pipeline** card lights up: learn, test, guess, with your numbers.`,
      tasks: [
        "learn(examples, k): return a model, a dictionary holding the examples and k",
        "test(model, check): the accuracy of the model on check",
        "guess(model, pebble): the model's vote-guess for one pebble",
        "model = learn(train_set, best_k), then report with the keys k, test_score, basket_score and mystery_guess",
      ],
      starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 15: learn, test, guess.


def learn(examples, k):
    """Build the model. Keep the examples and k in a dictionary."""
    ...


def test(model, check):
    """The accuracy of the model on the pebbles in check."""
    ...


def guess(model, pebble):
    """The model's vote-guess for one pebble."""
    ...


model = None  # learn from train_set with best_k neighbours
report = {}  # keys: k, test_score, basket_score, mystery_guess

print("Final report:", report)`,
      solutionAdd: py`def learn(examples, k):
    return {"examples": examples, "k": k}


def test(model, check):
    guesses = guess_all(model["examples"], check, model["k"])
    return accuracy(guesses, labels_of(check))


def guess(model, pebble):
    return guess_by_vote(model["examples"], pebble, model["k"])


model = learn(train_set, best_k)
report = {
    "k": best_k,
    "test_score": test(model, test_set),
    "basket_score": test(model, BASKET),
    "mystery_guess": guess(model, mystery),
}

print("Final report:", report)`,
      explanation:
        "learn keeps the examples and k, test marks the model on any list of pebbles, and guess answers about one pebble. Chained together they make the whole pipeline: learn from the 30 studied pebbles, score 90 on the 10 hidden ones, 100 on the fresh basket, and correctly name the mystery pebble a sparkler, which the hand-written rule from lesson 1 could not do.",
      hints: [
        { id: "h1", title: "learn", content: 'Return a dictionary: {"examples": examples, "k": k}.' },
        { id: "h2", title: "test and guess", content: 'Both read the model\'s boxes: model["examples"] and model["k"]. test is accuracy(guess_all(...), labels_of(check)); guess is guess_by_vote(...).' },
        { id: "h3", title: "The report", content: 'model = learn(train_set, best_k), then a dictionary with "k": best_k, "test_score": test(model, test_set), "basket_score": test(model, BASKET), "mystery_guess": guess(model, mystery).' },
      ],
      tests: [
        {
          id: "t1",
          description: "learn keeps the examples and k",
          assertionCode: py`
_m = learn([{"flat": 1, "shine": 1, "kind": "roller"}], 5)
assert isinstance(_m, dict), f"learn should return a dictionary, but returned {_m!r}"
assert _m.get("k") == 5 and _m.get("examples") == [{"flat": 1, "shine": 1, "kind": "roller"}], f"The model should hold the examples under 'examples' and k under 'k', but it is {_m!r}"
`,
        },
        {
          id: "t2",
          description: "test marks a model on the pebbles in check",
          assertionCode: py`
_m = {"examples": [{"flat": 1, "shine": 1, "kind": "roller"}, {"flat": 9, "shine": 9, "kind": "sparkler"}], "k": 1}
_check = [{"flat": 2, "shine": 2, "kind": "roller"}, {"flat": 8, "shine": 8, "kind": "sparkler"}, {"flat": 1, "shine": 2, "kind": "sparkler"}]
assert test(_m, _check) == 67, f"2 of the 3 check pebbles are guessed right, so test should return 67 but returned {test(_m, _check)!r}"
`,
        },
        {
          id: "t3",
          description: "guess answers about a single pebble",
          assertionCode: py`
_m = {"examples": [{"flat": 1, "shine": 1, "kind": "roller"}, {"flat": 9, "shine": 9, "kind": "sparkler"}], "k": 1}
assert guess(_m, {"flat": 8, "shine": 9}) == "sparkler", "A pebble at (8, 9) is nearest the sparkler at (9, 9), so guess should return 'sparkler'"
assert guess(_m, {"flat": 2, "shine": 1}) == "roller", "A pebble at (2, 1) is nearest the roller at (1, 1), so guess should return 'roller'"
`,
        },
        {
          id: "t4",
          description: "the model and the report are built from the training pile",
          assertionCode: py`
assert isinstance(model, dict) and model.get("k") == best_k and model.get("examples") == train_set, "model should be learn(train_set, best_k)"
assert isinstance(report, dict) and set(report.keys()) == {"k", "test_score", "basket_score", "mystery_guess"}, f"report should have exactly the keys k, test_score, basket_score and mystery_guess but is {report!r}"
`,
        },
        {
          id: "t5",
          description: "the report holds the final results",
          assertionCode: py`
assert report["k"] == 3, f"report['k'] should be the best k, 3, but is {report['k']!r}"
assert report["test_score"] == 90, f"report['test_score'] should be 90 but is {report['test_score']!r}"
assert report["basket_score"] == 100, f"report['basket_score'] should be 100 but is {report['basket_score']!r}"
assert report["mystery_guess"] == "sparkler", f"report['mystery_guess'] should be 'sparkler' but is {report['mystery_guess']!r}"
`,
        },
      ],
      unlocks: ["pb-pipeline"],
      checks: [
        {
          prompt: "Put the three steps in order: **guess** on a new pebble, **learn** from examples, **test** on hidden pebbles.",
          question: { type: "order", items: ["learn from examples", "test on hidden pebbles", "guess on a new pebble"] },
          explanation: "First learn, then test to find out how good it is, and only then trust it to guess on its own.",
        },
        {
          prompt: "In this course, what does `learn` actually do for the nearest-neighbour model?",
          question: {
            type: "choice",
            options: [
              "It just keeps the examples and the value of k",
              "It runs a huge calculation to tune thousands of numbers",
              "It deletes the training pebbles",
              "It prints the report",
            ],
            answer: 0,
          },
          explanation: "Nearest neighbours are a lazy learner: all the work happens when you ask for a guess. Other models do real work in the learning step.",
        },
      ],
    },
  ],
};
