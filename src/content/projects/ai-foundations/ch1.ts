import type { Chapter } from "@/engine/types";
import { md, py, SENSOR_RIG } from "./util.ts";

/**
 * Chapter 1: Meet the data. What learning from data means, summary statistics by hand, NumPy arrays
 * and normalisation. Everything later builds on `rows`, `X`, `y` and the scaler from this chapter.
 */

export const chapter1: Chapter = {
  id: "data",
  title: "Meet the data",
  blurb: "Turn raw fruit measurements into clean numbers a machine can learn from.",
  lessons: [
    // ───────────────────────── 1 ─────────────────────────
    {
      id: "ai-foundations-1-data",
      title: "What does learning from data mean?",
      minutes: 16,
      xp: 80,
      concepts: ["machine learning", "dataset", "features", "labels", "supervised learning"],
      learn: md`### Rules versus examples

A normal program is a list of rules **you** wrote. To sort fruit you might write:

~~~python
if weight < 100:
    kind = "plum"
else:
    kind = "apple"
~~~

That works until a small apple shows up, or a heavy plum, or a pear that looks like an apple. Every exception needs another rule, and soon nobody can say what the program really does.

**Machine learning** flips the job around. Instead of writing the rules, you show the computer many **examples** where the right answer is already known, and it works out a rule that fits them. You supply data; the program finds the pattern.

### A dataset is a table

One fruit goes past the camera and the sensors measure it. That single measured fruit is one **row** (also called an *example* or *sample*):

~~~python
row = {"weight": 182.4, "diameter": 74.0, "hue": 38, "sugar": 13.1, "kind": "apple"}
~~~

A whole batch is a list of rows, which is a **dataset**. Picture it as a spreadsheet where each line is a fruit:

~~~text
weight  diameter  hue  sugar  kind
 182.4      74.0   38   13.1  apple
 211.0      66.5   71   10.9  pear
  64.8      49.0  262   14.6  plum
~~~

### Features and labels

The columns split into two groups:

- **Features** are what the machine is allowed to look at: here the weight, diameter, hue and sugar. They are the *inputs*, usually written \`X\`.
- The **label** (or *target*) is the answer we want it to predict: here the \`kind\`. It is the *output*, usually written \`y\`.

Learning from rows that already contain the right answer is called **supervised learning**: the labels are the supervisor. The recipe has three words you will meet all course long:

1. **Train**: let the machine study rows where the label is known.
2. **Predict**: hand it a *new* fruit's features and ask for the label.
3. **Generalise**: do well on fruit it has *never seen*. This is the real goal. A machine that only remembers its training rows is a notebook, not a sorter.

### Why a fixed feature order matters

A model sees numbers in positions, not names. If \`weight\` is the first number for one fruit and the second for another, everything breaks silently. So we write one small function, \`features(row)\`, that always returns the same measurements in the same order, and use it everywhere.

~~~python
FEATURE_NAMES = ["weight", "diameter", "hue", "sugar"]
[row[name] for name in FEATURE_NAMES]    # [182.4, 74.0, 38, 13.1]
~~~

### Common mistakes

- **Putting the label in the features.** If \`kind\` is an input, the machine just reads the answer and learns nothing. This is called *leakage*, and it makes a model look brilliant right up to the day it meets real data.
- **Changing the feature order** between rows or between training and prediction.
- **Mutating the data** while looping over it. Build new lists instead.`,
      mission: md`The Orchard Vision sorting machine has a camera, a scale, a colour meter and a sugar probe, but no brain yet. For the next sixteen lessons you will build that brain, one idea at a time, using nothing but Python and, soon, NumPy.

The sensors are already wired up: \`read_sensors()\` returns a batch of 240 measured fruit. Your job in this first lesson is to read it like a data scientist: pick the features, pick the label, count what you have and split the table into \`X\` and \`y\`. When this lesson passes, the **Sorting belt** switches on and your \`features()\` and \`label()\` read every fruit that rolls past.`,
      tasks: [
        "features(row): return the four measurements [weight, diameter, hue, sugar] in that order",
        "label(row): return the kind of fruit",
        "count_by_label(rows): return a dict that counts the fruit of each kind",
        "split_xy(rows): return (X, y), a list of feature lists and a list of labels",
        "After the functions, fill in kind_counts, X_list and y_list from the real rows",
      ],
      starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 1: what does learning from data mean?
#
# The orchard's sensor rig is PROVIDED below. You do not need to read it yet:
# all you need to know is that read_sensors() measures a batch of fruit and
# returns one dict per fruit, like
#   {"weight": 182.4, "diameter": 74.0, "hue": 38, "sugar": 13.1,
#    "kind": "apple", "ripe": 1, "price": 0.93}

` + SENSOR_RIG + py`


rows = read_sensors()  # 240 measured fruit, one dict each


def features(row):
    """The measurements the machine may look at, in a fixed order:
    [weight, diameter, hue, sugar]. The kind is NOT a feature."""
    ...


def label(row):
    """The answer we want the machine to learn: the kind of fruit."""
    ...


def count_by_label(rows):
    """How many fruit of each kind? Return a dict like {"apple": 3, "pear": 1}."""
    ...


def split_xy(rows):
    """Return (X, y): X is a list of feature lists, y the list of labels."""
    ...


# Now run your functions on the real data. Replace these placeholders:
kind_counts = {}
X_list, y_list = [], []`,
      solutionAdd: SENSOR_RIG + py`


rows = read_sensors()  # 240 measured fruit, one dict each


def features(row):
    return [row[name] for name in FEATURE_NAMES]


def label(row):
    return row["kind"]


def count_by_label(rows):
    counts = {}
    for row in rows:
        kind = label(row)
        counts[kind] = counts.get(kind, 0) + 1
    return counts


def split_xy(rows):
    return [features(row) for row in rows], [label(row) for row in rows]


kind_counts = count_by_label(rows)
X_list, y_list = split_xy(rows)`,
      explanation:
        "features() builds the input vector from FEATURE_NAMES so the order can never drift, and label() reads the one column we want to predict. count_by_label is a classic dictionary tally: .get(kind, 0) + 1 starts a new kind at zero. split_xy applies the two functions to every row, giving the X and y that every learning algorithm in this course expects. Keeping the label out of X is what makes the later tests honest.",
      hints: [
        { id: "h1", title: "Reading a dict", content: 'row["weight"] reads one measurement. features() can be a list of four such reads, or a list comprehension over FEATURE_NAMES: [row[name] for name in FEATURE_NAMES]. Do not include row["kind"].' },
        { id: "h2", title: "Counting with a dict", content: 'Start with counts = {}. For each row, counts[kind] = counts.get(kind, 0) + 1. Return counts at the end. An empty list should give {}.' },
        { id: "h3", title: "Building X and y", content: "Return two comprehensions as a pair: [features(row) for row in rows], [label(row) for row in rows]. Then call your functions: kind_counts = count_by_label(rows) and X_list, y_list = split_xy(rows)." },
      ],
      tests: [
        {
          id: "t1",
          description: "features returns the four measurements in order, without the label",
          assertionCode: py`
_row = {"weight": 182.4, "diameter": 74.0, "hue": 38, "sugar": 13.1, "kind": "apple", "ripe": 1, "price": 0.93}
_got = features(_row)
assert isinstance(_got, list), f"features should return a list, but it returned {_got!r}"
assert _got == [182.4, 74.0, 38, 13.1], f"features should return [weight, diameter, hue, sugar] = [182.4, 74.0, 38, 13.1] but returned {_got!r}"
assert "apple" not in _got, "the kind is the answer, not a feature. Leave it out of features()"
`,
        },
        {
          id: "t2",
          description: "label returns the kind",
          assertionCode: py`
assert label({"weight": 205.0, "diameter": 66.0, "hue": 70, "sugar": 11.0, "kind": "pear"}) == "pear", "label(row) should return the row's kind"
assert label({"kind": "plum"}) == "plum", "label(row) should simply read row['kind']"
`,
        },
        {
          id: "t3",
          description: "count_by_label counts each kind (and copes with an empty list)",
          assertionCode: py`
_tiny = [{"kind": "apple"}, {"kind": "pear"}, {"kind": "apple"}, {"kind": "plum"}, {"kind": "apple"}]
_got = count_by_label(_tiny)
assert _got == {"apple": 3, "pear": 1, "plum": 1}, f"count_by_label should give {{'apple': 3, 'pear': 1, 'plum': 1}} but gave {_got!r}"
assert count_by_label([]) == {}, "an empty list has nothing to count, so the answer is {}"
`,
        },
        {
          id: "t4",
          description: "split_xy returns matching lists X and y",
          assertionCode: py`
_tiny = [
    {"weight": 180.0, "diameter": 72.0, "hue": 40, "sugar": 13.0, "kind": "apple"},
    {"weight": 70.0, "diameter": 50.0, "hue": 250, "sugar": 14.0, "kind": "plum"},
]
_got = split_xy(_tiny)
assert isinstance(_got, tuple) and len(_got) == 2, "split_xy should return two things: (X, y)"
_x, _y = _got
assert _x == [[180.0, 72.0, 40, 13.0], [70.0, 50.0, 250, 14.0]], f"X should hold one feature list per fruit, but is {_x!r}"
assert _y == ["apple", "plum"], f"y should hold one label per fruit, but is {_y!r}"
`,
        },
        {
          id: "t5",
          description: "kind_counts, X_list and y_list come from the real 240 rows",
          assertionCode: py`
assert kind_counts == count_by_label(rows), "kind_counts should be count_by_label(rows)"
assert sum(kind_counts.values()) == 240 and len(kind_counts) == 3, f"There should be 240 fruit in 3 kinds, but kind_counts is {kind_counts!r}"
assert len(X_list) == 240 and len(y_list) == 240, "X_list and y_list should each have one entry per fruit (240). Did you replace the placeholders with split_xy(rows)?"
assert X_list[0] == features(rows[0]) and y_list[0] == label(rows[0]), "the first entries should describe the first fruit"
`,
        },
      ],
      unlocks: ["oa-belt"],
      checks: [
        {
          prompt: "In the fruit table, which column is the **label**?",
          question: { type: "choice", options: ["`weight`", "`hue`", "`kind`", "the row number"], answer: 2 },
          explanation: "The label is the answer we want to predict. Weight, diameter, hue and sugar are the *features* the machine looks at; `kind` is what it must learn to say.",
        },
        {
          prompt: "A batch has 240 fruit and each has 4 features. How many feature numbers does `X` hold in total?",
          question: { type: "number", answer: 960 },
          explanation: "240 rows times 4 features is 960 numbers. Soon you will see this as a table of shape `(240, 4)`.",
        },
        {
          prompt: "Why must `kind` stay out of the features?",
          question: {
            type: "choice",
            options: [
              "It would hand the machine the answer, so it would learn nothing useful",
              "Text cannot be stored in a list",
              "Python is slower with strings",
              "Features must be sorted alphabetically",
            ],
            answer: 0,
          },
          explanation: "Giving the model the answer is called leakage. The model would look perfect on this data and fail on any new fruit where the kind is not yet known.",
        },
      ],
    },

    // ───────────────────────── 2 ─────────────────────────
    {
      id: "ai-foundations-2-stats",
      title: "Summary statistics by hand",
      minutes: 20,
      xp: 90,
      concepts: ["mean", "median", "minimum and maximum", "standard deviation", "dict comprehensions"],
      learn: md`### Before any model, look at the data

Thousands of rows are impossible to read, so we squeeze a column down to a few numbers that describe it. These are **summary statistics**, and a good data scientist always computes them first. They show what is normal, what is odd, and whether the numbers even make sense (a fruit that weighs 4 kg is probably a sensor glitch).

### The mean: the balance point

The **mean** adds everything up and divides by how many there are:

~~~python
weights = [150, 160, 170, 180, 190]
sum(weights) / len(weights)      # 850 / 5 = 170.0
~~~

Imagine the weights as equal blocks along a ruler. The mean is the spot where the ruler balances.

### The median: the middle value

Sort the values and take the one in the middle. With an even count, average the two middle ones.

~~~python
sorted([5, 1, 9])         # [1, 5, 9]  -> median 5
sorted([4, 1, 9, 6])      # [1, 4, 6, 9] -> median (4 + 6) / 2 = 5.0
~~~

Why bother with two kinds of "typical"? Because the mean is dragged around by extreme values and the median is not. Weights \`[150, 160, 170, 180, 5000]\` have a mean of 1132 but a median of 170. If one broken reading can ruin a statistic, the median is the safer choice.

### Spread: how far do values stray?

Two batches can share a mean and still be very different. One batch has apples between 168 and 172 g, the other between 100 and 240 g. The **standard deviation** (std) measures this spread:

1. Find the mean.
2. For each value, take its difference from the mean (its *deviation*) and **square** it. Squaring makes every deviation positive, and punishes big ones more.
3. Average those squares (this is the *variance*).
4. Take the square root, to get back to the original units.

A tiny worked example with \`[150, 160, 170, 180, 190]\` (mean 170):

~~~text
value  deviation  squared
  150        -20      400
  160        -10      100
  170          0        0
  180         10      100
  190         20      400
~~~

The squares add up to 1000. Divide by 5 values to get a variance of 200, then take the square root: std ≈ **14.14 g**. Roughly, "a typical fruit sits about 14 g from the average".

(There is a second version that divides by \`n - 1\` instead of \`n\`; it is for estimating a bigger population from a small sample. We describe the whole batch we have, so we divide by \`n\`. NumPy does the same by default.)

### Why this matters for machine learning

Statistics tell you whether a difference is *big*. A 20 g gap between two fruit means a lot when weights vary by 5 g, and nothing at all when they vary by 80 g. In a few lessons you will use exactly this idea to put every feature on a fair scale.

### Common mistakes

- Dividing the sum by the wrong count, or forgetting the \`**0.5\` at the end of std.
- Calling \`sorted(values)\` and expecting \`values\` itself to change. \`sorted\` returns a new list.
- Forgetting that the median of an even-length list needs two middle values.`,
      mission: md`Before the machine learns anything it needs to know what a normal fruit looks like. You will write the toolkit every analyst writes first: mean, median, standard deviation and a one-call \`describe\`, then summarise all four measurements across the whole batch.

When this passes, the **Fruit statistics** panel lights up with a range bar per measurement, built from the numbers you computed.`,
      tasks: [
        "column(rows, name): the list of one measurement across all rows",
        "mean(values) and median(values), written without NumPy",
        "std(values): the population standard deviation, using the four steps above",
        "describe(values): a dict with mean, min, max and std",
        "stats: a dict that maps each name in FEATURE_NAMES to describe(column(rows, name))",
      ],
      starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 2: summary statistics by hand. No NumPy yet.


def column(rows, name):
    """One measurement from every row: column(rows, "weight") -> [182.4, 211.0, ...]"""
    ...


def mean(values):
    """The sum divided by how many values there are."""
    ...


def median(values):
    """The middle value of the sorted list (average the two middle ones if the count is even)."""
    ...


def std(values):
    """Population standard deviation: the square root of the average squared distance from the mean."""
    ...


def describe(values):
    """{"mean": ..., "min": ..., "max": ..., "std": ...}"""
    ...


# One summary per measurement. Replace the placeholder:
stats = {}`,
      solutionAdd: py`def column(rows, name):
    return [row[name] for row in rows]


def mean(values):
    return sum(values) / len(values)


def median(values):
    ordered = sorted(values)
    middle = len(ordered) // 2
    if len(ordered) % 2:
        return ordered[middle]
    return (ordered[middle - 1] + ordered[middle]) / 2


def std(values):
    centre = mean(values)
    return (sum((v - centre) ** 2 for v in values) / len(values)) ** 0.5


def describe(values):
    return {"mean": mean(values), "min": min(values), "max": max(values), "std": std(values)}


stats = {name: describe(column(rows, name)) for name in FEATURE_NAMES}`,
      explanation:
        "mean is one line, but it is the base for std: the variance averages the squared distances from the mean, and the square root brings the units back to grams. median sorts first, then picks the middle index; an even count averages the two neighbours. describe packages the four numbers so the same call works for every column, which is why stats can be a one-line dict comprehension over FEATURE_NAMES.",
      hints: [
        { id: "h1", title: "Mean and median", content: "mean: sum(values) / len(values). median: ordered = sorted(values); middle = len(ordered) // 2. An odd count returns ordered[middle]; an even count returns (ordered[middle - 1] + ordered[middle]) / 2." },
        { id: "h2", title: "Standard deviation", content: "centre = mean(values); total = sum((v - centre) ** 2 for v in values); return (total / len(values)) ** 0.5. Check it on [150, 160, 170, 180, 190]: you should get about 14.14." },
        { id: "h3", title: "Putting it together", content: 'describe returns {"mean": mean(values), "min": min(values), "max": max(values), "std": std(values)}. Then stats = {name: describe(column(rows, name)) for name in FEATURE_NAMES}.' },
      ],
      tests: [
        {
          id: "t1",
          description: "column pulls one measurement from every row",
          assertionCode: py`
_tiny = [{"weight": 10, "hue": 1}, {"weight": 20, "hue": 2}, {"weight": 30, "hue": 3}]
assert column(_tiny, "weight") == [10, 20, 30], f"column(rows, 'weight') should be [10, 20, 30] but is {column(_tiny, 'weight')!r}"
assert column(_tiny, "hue") == [1, 2, 3], "column should work for any name"
assert len(column(rows, "sugar")) == 240, "column(rows, 'sugar') should have one value per fruit"
`,
        },
        {
          id: "t2",
          description: "mean adds up and divides",
          assertionCode: py`
assert abs(mean([1, 2, 3, 4]) - 2.5) < 1e-9, f"mean([1, 2, 3, 4]) should be 2.5 but is {mean([1, 2, 3, 4])!r}"
assert abs(mean([150, 160, 170, 180, 190]) - 170) < 1e-9, "mean([150, 160, 170, 180, 190]) should be 170"
assert abs(mean([7]) - 7) < 1e-9, "the mean of a single value is that value"
`,
        },
        {
          id: "t3",
          description: "median is the middle of the sorted values",
          assertionCode: py`
_mixed = [9, 1, 5]
assert median(_mixed) == 5, f"median([9, 1, 5]) should be 5 (sort first!) but is {median(_mixed)!r}"
assert median([4, 1, 9, 6]) == 5.0, f"for an even count, average the two middle values: median([4, 1, 9, 6]) should be 5.0 but is {median([4, 1, 9, 6])!r}"
assert median([150, 160, 170, 180, 5000]) == 170, "an extreme value should not move the median"
assert _mixed == [9, 1, 5], "do not change the list you were given: use sorted(), not .sort()"
`,
        },
        {
          id: "t4",
          description: "std measures how far values stray from the mean",
          assertionCode: py`
assert abs(std([150, 160, 170, 180, 190]) - 14.1421356) < 1e-4, f"std([150, 160, 170, 180, 190]) should be about 14.142 but is {std([150, 160, 170, 180, 190])!r}"
assert abs(std([2, 4, 4, 4, 5, 5, 7, 9]) - 2.0) < 1e-9, f"std([2, 4, 4, 4, 5, 5, 7, 9]) should be exactly 2.0 but is {std([2, 4, 4, 4, 5, 5, 7, 9])!r}"
assert std([5, 5, 5, 5]) == 0, "values that are all equal have no spread"
`,
        },
        {
          id: "t5",
          description: "describe returns the four summary numbers",
          assertionCode: py`
_d = describe([2, 4, 4, 4, 5, 5, 7, 9])
assert isinstance(_d, dict), "describe should return a dict"
assert set(_d) == {"mean", "min", "max", "std"}, f"describe should have the keys mean, min, max and std, but has {sorted(_d)!r}"
assert abs(_d["mean"] - 5) < 1e-9 and _d["min"] == 2 and _d["max"] == 9 and abs(_d["std"] - 2) < 1e-9, f"wrong numbers: {_d!r}"
`,
        },
        {
          id: "t6",
          description: "stats summarises all four measurements of the real batch",
          assertionCode: py`
assert set(stats) == set(FEATURE_NAMES), f"stats should have one entry per feature name {FEATURE_NAMES!r}, but has {sorted(stats)!r}"
for _name in FEATURE_NAMES:
    _vals = [r[_name] for r in rows]
    assert abs(stats[_name]["mean"] - sum(_vals) / len(_vals)) < 1e-9, f"stats[{_name!r}]['mean'] is wrong"
    assert stats[_name]["min"] == min(_vals) and stats[_name]["max"] == max(_vals), f"stats[{_name!r}] has the wrong min or max"
    assert stats[_name]["std"] > 0, f"stats[{_name!r}]['std'] should be positive"
`,
        },
      ],
      unlocks: ["oa-stats"],
      checks: [
        {
          prompt: "What is the mean of `[4, 8, 12]`?",
          question: { type: "number", answer: 8 },
          explanation: "4 + 8 + 12 = 24, and 24 / 3 = 8.",
        },
        {
          prompt: "Two batches both average 100 g. Batch A has a std of 2 g and batch B a std of 30 g. Which batch is more uniform?",
          question: { type: "choice", options: ["Batch A", "Batch B", "They are identical because the means match"], answer: 0 },
          explanation: "A small std means the values hug the mean. Batch A's fruit are all about the same size; batch B's range from tiny to huge.",
        },
        {
          prompt: "A faulty sensor reports one fruit at 5000 g. Which summary changes the least?",
          question: { type: "choice", options: ["mean", "median", "max", "std"], answer: 1 },
          explanation: "The median only cares about the middle position, so one wild value barely moves it. The mean, the max and the std all react strongly.",
        },
      ],
    },

    // ───────────────────────── 3 ─────────────────────────
    {
      id: "ai-foundations-3-numpy",
      title: "NumPy arrays and vectorised maths",
      minutes: 24,
      xp: 100,
      concepts: ["NumPy arrays", "shape", "axis", "vectorised operations", "boolean masks"],
      learn: md`### Why NumPy?

Python lists are flexible, but doing maths on them means writing loops. **NumPy** adds a new type, the **array**, that stores numbers compactly and does maths on *all of them at once*, with no loop in your code. It is the foundation of almost every machine learning library, so we introduce it gently.

~~~python
import numpy as np

weights = np.array([150.0, 160.0, 170.0])
weights * 2            # array([300., 320., 340.])
weights + 10           # array([160., 170., 180.])
weights.mean()         # 160.0
~~~

An operation that applies to every element in one go is called **vectorised**. It is shorter to write, easier to read, and far faster than a Python loop.

### Rows, columns and shape

A list of feature lists becomes a 2D array: a table. Its **shape** says how many rows and columns:

~~~python
X = np.array([[182.4, 74.0, 38, 13.1],
              [211.0, 66.5, 71, 10.9],
              [ 64.8, 49.0, 262, 14.6]])
X.shape        # (3, 4)   three fruit, four features
X[0]           # the first row (one fruit)
X[:, 1]        # the second column (the diameter of every fruit)
X[1, 3]        # row 1, column 3: the sugar of the second fruit, 10.9
~~~

\`X[:, 1]\` reads as "all rows, column 1". The colon means *everything along that direction*. Shape is the first thing to print when something goes wrong: most beginner errors are a shape that is not what you thought.

### \`axis\`: which direction to collapse

Statistics on a table need a direction. \`axis=0\` collapses the **rows**, giving one number per **column**. \`axis=1\` collapses the columns, giving one number per row.

~~~python
X.mean(axis=0)   # one mean per feature -> shape (4,)
X.mean(axis=1)   # one mean per fruit   -> shape (3,)
X.std(axis=0)    # one spread per feature
~~~

A good memory trick: the axis you name is the one that *disappears*. A \`(240, 4)\` array averaged over \`axis=0\` loses its 240 and becomes \`(4,)\`.

### Boolean masks

Comparing an array to a value gives an array of True/False, and that can be used to pick rows:

~~~python
y = np.array(["apple", "pear", "apple"])
y == "apple"             # array([ True, False,  True])
X[y == "apple"]          # only the apple rows
X[y == "apple", 0]       # the weights of the apples
X[y == "apple", 0].mean()
~~~

### Broadcasting, in one line

\`X - X.mean(axis=0)\` subtracts a shape-\`(4,)\` row of means from every row of a \`(240, 4)\` table. NumPy stretches ("broadcasts") the small array across the big one. You will use this to normalise in the next lesson.

### Plain numbers out

NumPy values have their own types (\`np.float64\`, \`np.int64\`). They behave like numbers, but when you store results to be shown elsewhere it is cleaner to hand out ordinary Python values: \`float(x)\`, \`int(n)\`, or \`array.tolist()\` for a whole array.

### Common mistakes

- Reading \`X[1]\` as the second *column*. A single index picks a **row**; use \`X[:, 1]\` for a column.
- Mixing up \`axis=0\` and \`axis=1\`. Check the result's shape.
- Building an array from ragged lists (rows of different lengths). Every row needs the same number of features.`,
      mission: md`The statistics you wrote by hand work, but a model will crunch tens of thousands of numbers. Time to move the whole dataset into NumPy: one array for the features, one for the labels, and one each for the two extra targets you will predict later (the ripeness flag and the price).

When this passes, the **Feature matrix** panel appears: a heatmap of your \`X\`, labelled with its shape and the column means you computed with \`axis=0\`.`,
      tasks: [
        "import numpy as np, then build X (a float array, shape (240, 4)) and y (a string array, shape (240,)) from X_list and y_list",
        "Build prices and ripe_flags arrays from the rows' price and ripe values",
        "n_rows, n_features = X.shape, then column_means and column_stds as plain Python lists (use axis=0 and .tolist())",
        "mean_by_kind(X, y, column_index): a dict kind -> mean of that column for that kind, using a boolean mask",
        "mean_weight_by_kind: your function applied to the weight column (index 0)",
      ],
      starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 3: NumPy arrays. Same data, new container.
import numpy as np

# Build the arrays. Replace the placeholders (None):
X = None            # shape (240, 4), floats, from X_list
y = None            # shape (240,), the kind of each fruit
prices = None       # shape (240,), each fruit's price
ripe_flags = None   # shape (240,), 1 if the fruit is ripe, else 0

n_rows, n_features = 0, 0   # unpack X.shape
column_means = []           # X.mean(axis=0) as a plain list
column_stds = []            # X.std(axis=0) as a plain list


def mean_by_kind(X, y, column_index):
    """{"apple": mean of that column over apples, "pear": ..., "plum": ...}
    Use a boolean mask such as y == kind. Return plain floats and string keys."""
    ...


mean_weight_by_kind = {}    # mean_by_kind on the weight column`,
      solutionAdd: py`import numpy as np

X = np.array(X_list, dtype=float)
y = np.array(y_list)
prices = np.array([row["price"] for row in rows])
ripe_flags = np.array([row["ripe"] for row in rows])

n_rows, n_features = X.shape
column_means = X.mean(axis=0).tolist()
column_stds = X.std(axis=0).tolist()


def mean_by_kind(X, y, column_index):
    result = {}
    for kind in np.unique(y):
        result[str(kind)] = float(X[y == kind, column_index].mean())
    return result


mean_weight_by_kind = mean_by_kind(X, y, 0)`,
      explanation:
        "np.array(X_list, dtype=float) turns the list of lists into a (240, 4) table; y keeps the strings. X.shape unpacks straight into two names. mean(axis=0) averages down each column, and .tolist() gives plain Python floats that are easy to display and compare. The boolean mask y == kind selects the rows of one kind, and X[mask, column_index] then picks one column of just those rows.",
      hints: [
        { id: "h1", title: "Build the arrays", content: 'X = np.array(X_list, dtype=float) and y = np.array(y_list). For the targets: prices = np.array([row["price"] for row in rows]), and the same idea for "ripe".' },
        { id: "h2", title: "Shape and axis", content: "n_rows, n_features = X.shape. Column statistics collapse the rows, so use axis=0: column_means = X.mean(axis=0).tolist() and column_stds = X.std(axis=0).tolist()." },
        { id: "h3", title: "The mask", content: "for kind in np.unique(y): X[y == kind, column_index] is that column for just that kind. Call .mean(), wrap it in float(), and store it under str(kind)." },
      ],
      tests: [
        {
          id: "t1",
          description: "X is a (240, 4) float array and y a (240,) array of kinds",
          assertionCode: py`
assert isinstance(X, np.ndarray), "X should be a NumPy array. Use np.array(X_list, dtype=float)"
assert X.shape == (240, 4), f"X should have shape (240, 4) but has shape {X.shape}"
assert X.dtype.kind == "f", f"X should hold floats (dtype=float) but holds {X.dtype}"
assert float(X[0, 0]) == rows[0]["weight"] and float(X[-1, 3]) == rows[-1]["sugar"], "X should hold the measurements in the order weight, diameter, hue, sugar"
assert isinstance(y, np.ndarray) and y.shape == (240,), "y should be a NumPy array of shape (240,)"
assert y[0] == "apple" and y[-1] == "plum", "y should keep the kinds in the same order as the rows"
`,
        },
        {
          id: "t2",
          description: "prices and ripe_flags are arrays that line up with the rows",
          assertionCode: py`
assert isinstance(prices, np.ndarray) and prices.shape == (240,), "prices should be a NumPy array of shape (240,)"
assert isinstance(ripe_flags, np.ndarray) and ripe_flags.shape == (240,), "ripe_flags should be a NumPy array of shape (240,)"
assert float(prices[5]) == rows[5]["price"] and int(ripe_flags[5]) == rows[5]["ripe"], "the entries should follow the row order"
assert set(ripe_flags.tolist()) <= {0, 1}, "ripe_flags should only contain 0 and 1"
`,
        },
        {
          id: "t3",
          description: "n_rows and n_features come from X.shape",
          assertionCode: py`
assert n_rows == 240 and n_features == 4, f"n_rows, n_features should be 240, 4 but are {n_rows}, {n_features}"
`,
        },
        {
          id: "t4",
          description: "column_means and column_stds are plain lists that match your hand-made statistics",
          assertionCode: py`
assert isinstance(column_means, list) and len(column_means) == 4, "column_means should be a plain list of 4 numbers (use .tolist())"
assert isinstance(column_stds, list) and len(column_stds) == 4, "column_stds should be a plain list of 4 numbers (use .tolist())"
for _i, _name in enumerate(FEATURE_NAMES):
    assert abs(column_means[_i] - stats[_name]["mean"]) < 1e-6, f"the {_name} mean from NumPy ({column_means[_i]!r}) should equal the mean you computed by hand ({stats[_name]['mean']!r}). Did you use axis=0?"
    assert abs(column_stds[_i] - stats[_name]["std"]) < 1e-6, f"the {_name} std from NumPy should equal your std() for that column"
`,
        },
        {
          id: "t5",
          description: "mean_by_kind averages one column per kind using a mask",
          assertionCode: py`
_xt = np.array([[1, 10], [3, 20], [5, 30], [7, 40]], dtype=float)
_yt = np.array(["a", "b", "a", "b"])
_got = mean_by_kind(_xt, _yt, 0)
assert _got == {"a": 3.0, "b": 5.0}, f"mean_by_kind(..., 0) should be {{'a': 3.0, 'b': 5.0}} but is {_got!r}"
_got = mean_by_kind(_xt, _yt, 1)
assert _got == {"a": 20.0, "b": 30.0}, f"mean_by_kind(..., 1) should be {{'a': 20.0, 'b': 30.0}} but is {_got!r}"
assert all(type(_k) is str and type(_v) is float for _k, _v in _got.items()), "return plain str keys and float values (use str(kind) and float(...))"
`,
        },
        {
          id: "t6",
          description: "mean_weight_by_kind shows plums are the light ones",
          assertionCode: py`
assert set(mean_weight_by_kind) == {"apple", "pear", "plum"}, f"mean_weight_by_kind should have the three kinds but has {sorted(mean_weight_by_kind)!r}"
_m = mean_weight_by_kind
assert _m["plum"] < _m["apple"] < _m["pear"], f"on average plums are lightest and pears heaviest, but got {_m!r}"
assert abs(_m["apple"] - sum(r["weight"] for r in rows if r["kind"] == "apple") / 110) < 1e-6, "the apple mean does not match the data"
`,
        },
      ],
      unlocks: ["oa-matrix"],
      checks: [
        {
          prompt: "`X` has shape `(240, 4)`. What shape does `X.mean(axis=0)` have?",
          question: { type: "choice", options: ["`(4,)`", "`(240,)`", "`(240, 4)`", "`(1, 1)`"], answer: 0 },
          explanation: "The axis you name disappears. Averaging over `axis=0` collapses the 240 rows into one row of 4 column means.",
        },
        {
          prompt: "Which expression gives the diameter (the second column) of every fruit?",
          question: { type: "choice", options: ["`X[1]`", "`X[:, 1]`", "`X[1, :]`", "`X[:, 2]`"], answer: 1 },
          explanation: "`X[:, 1]` means all rows, column 1. Counting starts at 0, so column 1 is the second feature. `X[1]` would be the second *row*.",
        },
        {
          prompt: "What does `X[y == \"plum\"]` return?",
          question: {
            type: "choice",
            options: ["Only the rows whose label is plum", "The plum column", "A single True or False", "The number of plums"],
            answer: 0,
          },
          explanation: "`y == \"plum\"` is an array of True/False, one per fruit. Using it inside `X[...]` keeps just the rows marked True.",
        },
      ],
    },

    // ───────────────────────── 4 ─────────────────────────
    {
      id: "ai-foundations-4-scale",
      title: "Normalisation: putting features on one scale",
      minutes: 20,
      xp: 100,
      concepts: ["z-score", "min-max scaling", "standard deviation", "fit vs apply", "broadcasting"],
      learn: md`### Different units, different shouting

Look at one apple and one pear:

~~~text
         weight  diameter  hue  sugar
apple       170        72   50     13
pear        210        70   60     11
~~~

The raw differences are 40 g, 2 mm, 10 degrees and 2 Brix. Any method that measures "how different are these two fruit?" by adding up those gaps would hear almost nothing except the weight, because weight is measured in big numbers. Yet a 2-degree-Brix sugar gap might matter more than 40 g.

The size of a number depends on the **unit**, and units are arbitrary. Weigh in kilograms and the weight gap shrinks to 0.04. The fix is to put every feature on a common scale before comparing.

### Z-scores: how many standard deviations from average?

The most common fix subtracts the mean and divides by the standard deviation:

~~~text
z = (x - mean) / std
~~~

A z-score of 0 means "exactly average", +1 means "one standard deviation above", -2 means "two below". Worked example: the weights have mean 170 g and std 20 g, so a 190 g fruit has z = (190 - 170) / 20 = **1**. After this, every feature is measured in the same unit, "standard deviations", and has mean 0 and std 1.

With NumPy the whole table is one line, thanks to broadcasting:

~~~python
mean = X.mean(axis=0)          # shape (4,)
std = X.std(axis=0)            # shape (4,)
Z = (X - mean) / std           # shape (240, 4), every column standardised
~~~

### Min-max scaling: squeeze into 0 to 1

The other popular choice maps the smallest value to 0 and the largest to 1:

~~~text
scaled = (x - min) / (max - min)
~~~

It keeps the shape of the data, but one extreme value squashes everything else into a thin band. Z-scores cope better with outliers, so we use them as our default.

### Fit once, apply anywhere

Here is the rule that trips people up. The mean and std are **learned from data**: that is the *fit* step. Applying them to a table is the *apply* step. Later, when a brand-new fruit rolls in, you must scale it with the **same mean and std** you learned before, not with numbers computed from that one fruit (whose "std" would be zero!). That is why we split the work into two functions: \`fit_scaler\` returns the numbers, \`apply_scaler\` uses them anywhere.

### A column that never changes

If every value in a column is the same, its std is 0 and dividing by it gives \`nan\`. A tidy scaler swaps a zero spread for 1, which leaves that column at all zeros. NumPy has a handy helper: \`np.where(condition, if_true, if_false)\`.

### Common mistakes

- **Forgetting the new fruit needs the old numbers.** Never compute mean and std from the thing you are about to predict.
- Scaling \`y\` as if it were a feature. Labels are answers, not measurements.
- Dividing by a zero spread and letting \`nan\` creep through every later calculation.`,
      mission: md`The belt's camera reads weight in grams and hue in degrees, and the sugar probe reads small numbers. Left alone, the loud features would drown out the quiet ones in every comparison the machine makes next.

Write the normaliser: one function to learn the scale, one to apply it, and a min-max variant. Then scale the whole batch. When this passes, the **Normaliser** panel shows each feature before and after, all squeezed onto one comparable axis.`,
      tasks: [
        "fit_scaler(X): return (centre, spread), the column means and standard deviations (replace a zero spread with 1.0)",
        "apply_scaler(X, centre, spread): return (X - centre) / spread",
        "min_max_scale(X): scale every column to the range 0 to 1 (a constant column becomes all zeros)",
        "scaler_mean, scaler_std = fit_scaler(X), then X_scaled = apply_scaler(X, scaler_mean, scaler_std)",
        "scaled_sample, scaled_means and scaled_stds as plain rounded lists (see the starter)",
      ],
      starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 4: normalisation. Put every feature on the same scale.


def fit_scaler(X):
    """Learn the scale: return (centre, spread) = (column means, column standard deviations).
    If a column's spread is 0, use 1.0 for it so we never divide by zero."""
    ...


def apply_scaler(X, centre, spread):
    """z-scores: (X - centre) / spread. Works on a table or on a single row."""
    ...


def min_max_scale(X):
    """Scale each column to 0..1: (X - low) / (high - low). A constant column becomes all zeros."""
    ...


# Fit on the whole batch for now, then scale it. Replace the placeholders:
scaler_mean, scaler_std = None, None
X_scaled = None
scaled_sample = []   # every 20th scaled row, rounded to 3 places, as a list: X_scaled[::20].round(3).tolist()
scaled_means = []    # the column means of X_scaled, rounded to 6 places, as a list
scaled_stds = []     # the column stds of X_scaled, rounded to 6 places, as a list`,
      solutionAdd: py`def fit_scaler(X):
    centre = X.mean(axis=0)
    spread = X.std(axis=0)
    spread = np.where(spread == 0, 1.0, spread)
    return centre, spread


def apply_scaler(X, centre, spread):
    return (X - centre) / spread


def min_max_scale(X):
    low = X.min(axis=0)
    high = X.max(axis=0)
    return (X - low) / np.where(high == low, 1.0, high - low)


scaler_mean, scaler_std = fit_scaler(X)
X_scaled = apply_scaler(X, scaler_mean, scaler_std)
scaled_sample = X_scaled[::20].round(3).tolist()
scaled_means = X_scaled.mean(axis=0).round(6).tolist()
scaled_stds = X_scaled.std(axis=0).round(6).tolist()`,
      explanation:
        "fit_scaler measures the centre and spread of each column and guards against a zero spread with np.where. apply_scaler is plain broadcasting: subtract the length-4 centre from every row, divide by the length-4 spread. Because the two steps are separate, the same learned numbers can later scale a single new fruit. Min-max scaling uses the column low and high instead. After z-scoring, every column has mean 0 and std 1, so no feature shouts louder than another.",
      hints: [
        { id: "h1", title: "Fit", content: "centre = X.mean(axis=0); spread = X.std(axis=0). To avoid zeros: spread = np.where(spread == 0, 1.0, spread). Return centre, spread." },
        { id: "h2", title: "Apply", content: "(X - centre) / spread. Broadcasting stretches the length-4 arrays across every row, and it also works when X is a single row of 4 numbers." },
        { id: "h3", title: "Min-max and the variables", content: "low = X.min(axis=0); high = X.max(axis=0); return (X - low) / np.where(high == low, 1.0, high - low). Then scaler_mean, scaler_std = fit_scaler(X); X_scaled = apply_scaler(X, scaler_mean, scaler_std)." },
      ],
      tests: [
        {
          id: "t1",
          description: "fit_scaler returns the column means and standard deviations",
          assertionCode: py`
_xt = np.array([[1.0, 10.0], [3.0, 30.0]])
_got = fit_scaler(_xt)
assert isinstance(_got, tuple) and len(_got) == 2, "fit_scaler should return two things: (centre, spread)"
_centre, _spread = np.asarray(_got[0], dtype=float), np.asarray(_got[1], dtype=float)
assert np.allclose(_centre, [2.0, 20.0]), f"the centres should be the column means [2, 20] but are {_centre.tolist()!r}"
assert np.allclose(_spread, [1.0, 10.0]), f"the spreads should be the column standard deviations [1, 10] but are {_spread.tolist()!r}"
`,
        },
        {
          id: "t2",
          description: "a column that never changes gets a spread of 1, not 0",
          assertionCode: py`
_xt = np.array([[5.0, 1.0], [5.0, 3.0]])
_centre, _spread = fit_scaler(_xt)
assert float(np.asarray(_spread)[0]) == 1.0, "a constant column has std 0. Replace it with 1.0 so we never divide by zero (np.where helps)"
_z = np.asarray(apply_scaler(_xt, _centre, _spread), dtype=float)
assert np.all(np.isfinite(_z)), "scaling a constant column must not produce nan or inf"
`,
        },
        {
          id: "t3",
          description: "apply_scaler turns values into z-scores, for a table or a single row",
          assertionCode: py`
_xt = np.array([[1.0, 10.0], [3.0, 30.0]])
_z = np.asarray(apply_scaler(_xt, np.array([2.0, 20.0]), np.array([1.0, 10.0])), dtype=float)
assert np.allclose(_z, [[-1.0, -1.0], [1.0, 1.0]]), f"expected [[-1, -1], [1, 1]] but got {_z.tolist()!r}"
_one = np.asarray(apply_scaler(np.array([190.0, 70.0]), np.array([170.0, 70.0]), np.array([20.0, 5.0])), dtype=float)
assert np.allclose(_one, [1.0, 0.0]), f"a single row should work too: expected [1, 0] but got {_one.tolist()!r}"
`,
        },
        {
          id: "t4",
          description: "min_max_scale squeezes each column into 0..1",
          assertionCode: py`
_xt = np.array([[1.0, 10.0, 7.0], [3.0, 30.0, 7.0], [2.0, 20.0, 7.0]])
_s = np.asarray(min_max_scale(_xt), dtype=float)
assert np.allclose(_s[:, 0], [0.0, 1.0, 0.5]), f"column 0 should scale to [0, 1, 0.5] but is {_s[:, 0].tolist()!r}"
assert np.allclose(_s[:, 1], [0.0, 1.0, 0.5]), f"column 1 should scale to [0, 1, 0.5] but is {_s[:, 1].tolist()!r}"
assert np.allclose(_s[:, 2], 0.0), "a constant column should become all zeros, not nan"
`,
        },
        {
          id: "t5",
          description: "X_scaled has mean 0 and std 1 in every column",
          assertionCode: py`
assert isinstance(X_scaled, np.ndarray) and X_scaled.shape == (240, 4), "X_scaled should be a (240, 4) NumPy array"
assert np.allclose(X_scaled.mean(axis=0), 0.0, atol=1e-9), "every scaled column should have mean 0"
assert np.allclose(X_scaled.std(axis=0), 1.0, atol=1e-9), "every scaled column should have std 1"
assert np.allclose(np.asarray(scaler_mean, dtype=float), column_means) and np.allclose(np.asarray(scaler_std, dtype=float), column_stds), "scaler_mean and scaler_std should be the column means and stds"
`,
        },
        {
          id: "t6",
          description: "scaled_sample, scaled_means and scaled_stds are plain rounded lists",
          assertionCode: py`
assert isinstance(scaled_sample, list) and len(scaled_sample) == 12 and len(scaled_sample[0]) == 4, "scaled_sample should be a list of 12 rows with 4 numbers each: X_scaled[::20].round(3).tolist()"
assert abs(scaled_sample[1][0] - round(float(X_scaled[20, 0]), 3)) < 1e-9, "scaled_sample should hold every 20th scaled row"
assert isinstance(scaled_means, list) and len(scaled_means) == 4 and all(abs(_m) < 1e-5 for _m in scaled_means), "scaled_means should be 4 values close to 0"
assert isinstance(scaled_stds, list) and len(scaled_stds) == 4 and all(abs(_s - 1) < 1e-5 for _s in scaled_stds), "scaled_stds should be 4 values close to 1"
`,
        },
      ],
      unlocks: ["oa-scale"],
      checks: [
        {
          prompt: "Weights have mean 170 g and std 20 g. What is the z-score of a 190 g fruit?",
          question: { type: "number", answer: 1 },
          explanation: "z = (190 - 170) / 20 = 1: the fruit is one standard deviation heavier than average.",
        },
        {
          prompt: "Why scale features before measuring how close two fruit are?",
          question: {
            type: "choice",
            options: [
              "Otherwise features with big numbers (like weight in grams) would drown out the others",
              "NumPy refuses to subtract unscaled numbers",
              "It makes the labels more accurate",
              "Scaling removes the need for training data",
            ],
            answer: 0,
          },
          explanation: "Distance adds up differences across features. Without scaling, grams outvote millimetres and degrees purely because of their units.",
        },
        {
          prompt: "A new fruit arrives. Which mean and std do you use to scale it?",
          question: {
            type: "choice",
            options: ["The ones learned earlier from the batch", "The new fruit's own mean and std", "Always 0 and 1", "Whatever is largest"],
            answer: 0,
          },
          explanation: "The scale is learned once and re-used. A single fruit has no spread of its own (its std would be 0), and its z-scores would mean nothing compared with the rest.",
        },
      ],
    },
  ],
};
