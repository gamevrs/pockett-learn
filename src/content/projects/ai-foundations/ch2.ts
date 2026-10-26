import type { Chapter } from "@/engine/types";
import { md, py } from "./util.ts";

/**
 * Chapter 2: Learning by example. Distance and the nearest neighbour, k-nearest neighbours with a
 * vote, an honest train/test split, and the confusion matrix with precision and recall.
 *
 * Names this chapter adds that later chapters rely on: scale_one, classify_1nn, K, memory_X,
 * memory_y, classify, votes, SEED, train_idx, test_idx, X_train, X_test, y_train, y_test, Xtr, Xte,
 * predict_all, accuracy, LABELS, confusion_matrix.
 */

export const chapter2: Chapter = {
  id: "neighbours",
  title: "Learning by example",
  blurb: "Sort a mystery fruit by asking which known fruit it resembles, then test that honestly.",
  lessons: [
    // ───────────────────────── 5 ─────────────────────────
    {
      id: "ai-foundations-5-distance",
      title: "Distance and the nearest neighbour",
      minutes: 20,
      xp: 100,
      concepts: ["Euclidean distance", "similarity", "nearest neighbour", "argmin", "lazy learning"],
      learn: md`### Similar fruit look alike

You are handed a mystery fruit. You have a tray of fruit whose kinds you already know. A very human strategy: find the fruit in the tray that looks most like the mystery one, and guess the same kind. That is the whole idea of the **nearest neighbour** classifier.

For a machine, "looks like" has to be a number: a **distance**. Small distance means similar.

### Distance in one, two and many dimensions

On a number line the distance between 3 and 7 is \`|3 - 7| = 4\`. On a flat map, Pythagoras gives the straight-line distance:

~~~text
from (0, 0) to (3, 4):  sqrt(3*3 + 4*4) = sqrt(25) = 5
~~~

The same recipe works for any number of features. This is the **Euclidean distance**:

1. Subtract the two feature lists, feature by feature.
2. Square each difference.
3. Add them up.
4. Take the square root.

~~~python
import numpy as np

a = np.array([0.0, 0.0, 0.0, 0.0])
b = np.array([1.0, 2.0, 2.0, 4.0])
np.sqrt(((a - b) ** 2).sum())     # sqrt(1 + 4 + 4 + 16) = sqrt(25) = 5.0
~~~

Four features means a four-dimensional space. You cannot picture it, but the formula does not care.

### Many distances at once

To find the nearest neighbour you need the distance from the mystery fruit to **every** known fruit. NumPy does it in one expression, because subtracting a single row from a whole table broadcasts:

~~~python
distances = np.sqrt(((X - q) ** 2).sum(axis=1))    # X: (240, 4), q: (4,)  ->  (240,)
~~~

\`axis=1\` adds up each row's four squared differences, leaving one distance per known fruit. Then \`np.argmin(distances)\` returns the **index** of the smallest one, and \`y[index]\` is the neighbour's label.

### Scale first!

Last lesson's work now pays off. Distances add up differences across features, so they must be measured on the same scale. The mystery fruit's raw measurements must be scaled with the **same** centre and spread that were learned from the data: that is what \`scale_one\` will do.

### A lazy learner

Notice there is no training step. The nearest-neighbour method simply **memorises** the labelled fruit and does all its work at prediction time. That makes it easy to understand and surprisingly strong, but each prediction has to compare against every stored row.

### Common mistakes

- **Forgetting to scale the query.** The tray is z-scored but the mystery fruit is in raw grams, so the weight alone decides everything.
- **Mixing up \`axis=0\` and \`axis=1\`** in the distance sum. You want one distance per known fruit.
- Believing you need the \`sqrt\` to find the nearest. You do not: squaring is order-preserving, so the smallest squared distance is also the smallest distance. We keep it because it gives distances real units.`,
      mission: md`A fruit with no label just rolled off the belt. Time for your machine's first real decision.

Write the distance maths, then \`classify_1nn(features)\`: scale the mystery fruit, find the closest fruit in the scaled batch, and return its kind. When this passes, the **Nearest neighbour** map appears: every spot on it is coloured by what your function would answer if a fruit with those measurements arrived.`,
      tasks: [
        "distance(a, b): the Euclidean distance between two feature lists, as a plain float",
        "distances_to(X, q): the distance from q to every row of X, as an array",
        "nearest_index(X, q): the row number of the closest row, as an int",
        "scale_one(features): scale one raw fruit with the scaler_mean and scaler_std you learned",
        "classify_1nn(features): the kind of the nearest fruit in X_scaled (a string)",
      ],
      starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 5: distance and the nearest neighbour.


def distance(a, b):
    """Euclidean distance between two feature lists. Return a plain float."""
    ...


def distances_to(X, q):
    """Distance from the single fruit q to every row of X: one number per row."""
    ...


def nearest_index(X, q):
    """The row number (an int) of the row of X closest to q."""
    ...


def scale_one(features):
    """Scale ONE raw fruit [weight, diameter, hue, sugar] with the scaler you learned in lesson 4."""
    ...


def classify_1nn(features):
    """Scale the fruit, find its nearest neighbour in X_scaled, return that neighbour's kind (a str)."""
    ...`,
      solutionAdd: py`def distance(a, b):
    a = np.asarray(a, dtype=float)
    b = np.asarray(b, dtype=float)
    return float(np.sqrt(((a - b) ** 2).sum()))


def distances_to(X, q):
    return np.sqrt(((X - q) ** 2).sum(axis=1))


def nearest_index(X, q):
    return int(np.argmin(distances_to(X, q)))


def scale_one(features):
    return apply_scaler(np.array(features, dtype=float), scaler_mean, scaler_std)


def classify_1nn(features):
    q = scale_one(features)
    return str(y[nearest_index(X_scaled, q)])`,
      explanation:
        "distance squares the feature gaps, adds them and takes the root. distances_to does the same for every row at once: X - q broadcasts, axis=1 adds up each row. nearest_index is argmin of those distances. scale_one reuses lesson 4's apply_scaler on a single row, with the numbers learned from the batch. classify_1nn then just looks up the label of the closest scaled fruit. The model is the data itself.",
      hints: [
        { id: "h1", title: "Distance", content: "Turn both lists into float arrays (np.asarray(a, dtype=float)), then float(np.sqrt(((a - b) ** 2).sum())). For (0,0) and (3,4) the answer is 5.0." },
        { id: "h2", title: "Many at once", content: "np.sqrt(((X - q) ** 2).sum(axis=1)) gives one distance per row. For the index of the smallest, int(np.argmin(...))." },
        { id: "h3", title: "Classify", content: "scale_one is apply_scaler(np.array(features, dtype=float), scaler_mean, scaler_std). classify_1nn: q = scale_one(features); return str(y[nearest_index(X_scaled, q)])." },
      ],
      tests: [
        {
          id: "t1",
          description: "distance is the straight-line distance, in any number of dimensions",
          assertionCode: py`
_d = distance([0, 0], [3, 4])
assert abs(_d - 5.0) < 1e-9, f"distance([0, 0], [3, 4]) should be 5.0 but is {_d!r}"
assert type(_d) is float, f"return a plain float (wrap the result in float()), not {type(_d).__name__}"
assert abs(distance([0, 0, 0, 0], [1, 2, 2, 4]) - 5.0) < 1e-9, "distance([0,0,0,0], [1,2,2,4]) should be sqrt(1+4+4+16) = 5.0"
assert distance([2.5, 1], [2.5, 1]) == 0.0, "a point is zero distance from itself"
assert abs(distance([1, 2], [4, 6]) - distance([4, 6], [1, 2])) < 1e-12, "distance should be symmetric"
`,
        },
        {
          id: "t2",
          description: "distances_to measures from one point to every row",
          assertionCode: py`
_xt = np.array([[0.0, 0.0], [3.0, 4.0], [6.0, 8.0]])
_got = np.asarray(distances_to(_xt, np.array([0.0, 0.0])), dtype=float)
assert _got.shape == (3,), f"distances_to should give one distance per row, shape (3,), but the shape is {_got.shape}. Sum over axis=1"
assert np.allclose(_got, [0.0, 5.0, 10.0]), f"expected [0, 5, 10] but got {_got.tolist()!r}"
`,
        },
        {
          id: "t3",
          description: "nearest_index returns the row number of the closest row",
          assertionCode: py`
_xt = np.array([[0.0, 0.0], [3.0, 4.0], [6.0, 8.0]])
_i = nearest_index(_xt, np.array([3.2, 3.9]))
assert _i == 1, f"the nearest row to (3.2, 3.9) is row 1 but nearest_index returned {_i!r}"
assert type(_i) is int, f"return a plain int (wrap it in int()), not {type(_i).__name__}"
assert nearest_index(_xt, np.array([100.0, 100.0])) == 2, "the nearest row to (100, 100) is the last row, 2"
`,
        },
        {
          id: "t4",
          description: "scale_one z-scores a single raw fruit with the learned scaler",
          assertionCode: py`
_raw = [182.4, 74.0, 38, 13.1]
_got = np.asarray(scale_one(_raw), dtype=float)
_want = (np.array(_raw) - np.asarray(scaler_mean)) / np.asarray(scaler_std)
assert _got.shape == (4,), f"scale_one should return 4 numbers but the shape is {_got.shape}"
assert np.allclose(_got, _want), f"scale_one should return (x - scaler_mean) / scaler_std = {_want.tolist()!r} but returned {_got.tolist()!r}"
`,
        },
        {
          id: "t5",
          description: "classify_1nn gives every known fruit its own kind, and recognises a new plum",
          assertionCode: py`
for _f, _k in zip(X_list[::15], y_list[::15]):
    _g = classify_1nn(_f)
    assert _g == _k, f"a fruit that is already in the tray is its own nearest neighbour: classify_1nn({_f!r}) should be {_k!r} but gave {_g!r}"
assert type(classify_1nn(X_list[0])) is str, "return a plain str (wrap the label in str())"
assert classify_1nn([66.0, 50.0, 250, 13.0]) == "plum", "a small purple fruit should be a plum"
assert classify_1nn([66.0, 50.0, 250, 13.0]) != "apple", "a small purple fruit is not an apple"
`,
        },
      ],
      unlocks: ["oa-neighbour"],
      checks: [
        {
          prompt: "What is the Euclidean distance between the points (1, 2) and (4, 6)?",
          question: { type: "number", answer: 5 },
          explanation: "The gaps are 3 and 4, and sqrt(3*3 + 4*4) = sqrt(25) = 5.",
        },
        {
          prompt: "A fruit that is already in the stored tray is used as the query. What does the nearest neighbour method return?",
          question: {
            type: "choice",
            options: ["Itself, at distance 0", "The next closest different fruit", "An error", "A random fruit"],
            answer: 0,
          },
          explanation: "Every fruit is at distance 0 from itself, so unless you leave it out it is always its own nearest neighbour. Remember this when we measure accuracy later.",
        },
        {
          prompt: "Why does a nearest-neighbour model need no training step?",
          question: {
            type: "choice",
            options: [
              "It just stores the labelled examples and compares against them when asked",
              "It guesses randomly",
              "Distance is always zero",
              "NumPy trains it automatically",
            ],
            answer: 0,
          },
          explanation: "The stored data is the model. The price is paid at prediction time: each new fruit must be compared with every stored one.",
        },
      ],
    },

    // ───────────────────────── 6 ─────────────────────────
    {
      id: "ai-foundations-6-knn",
      title: "k-nearest neighbours: let the neighbours vote",
      minutes: 24,
      xp: 110,
      concepts: ["k-NN", "majority vote", "choosing k", "argsort", "tie-breaking"],
      learn: md`### One neighbour can be a fluke

If a single odd fruit sits in the wrong neighbourhood (a small pear with an apple-ish colour) then every mystery fruit that lands near it gets the wrong answer. Asking one neighbour makes the machine jumpy.

Asking **several** is steadier. The **k-nearest neighbours** classifier (k-NN) finds the \`k\` closest known fruit and lets them **vote**; the most common kind wins.

~~~text
k = 5, the five nearest labels are: pear, apple, pear, pear, apple
votes:  pear 3, apple 2   ->   answer: pear
~~~

### Finding the k closest

Sorting the distances gives the order of nearness. \`np.argsort\` does not return the sorted values but the **indices** that would sort them, which is exactly what you need to look labels up:

~~~python
d = np.array([5.0, 1.0, 3.0, 2.0])
np.argsort(d)            # array([1, 3, 2, 0])  index 1 is closest, then 3, 2, 0
np.argsort(d)[:2]        # the two closest: array([1, 3])
~~~

Always pass \`kind="stable"\`. When two fruit are exactly the same distance away, a stable sort keeps their original order, so the answer never changes from run to run or between NumPy versions.

### Counting votes

A dictionary tally does the job, the same pattern you used to count fruit by kind:

~~~python
counts = {}
for name in ["pear", "apple", "pear"]:
    counts[name] = counts.get(name, 0) + 1
# {"pear": 2, "apple": 1}
max(counts, key=counts.get)       # "pear": the key with the biggest value
~~~

Ties are possible with three kinds (2 pears, 2 apples, 1 plum). Our rule: the label that **reached the vote first**, meaning the one belonging to the nearer fruit, wins. If your tally inserts labels nearest-first, \`max\` returns the first of equal winners, which is exactly that.

### Choosing k

- **k = 1** follows every wiggle in the data, including noise. Its answers are jumpy.
- A **medium k** smooths out the noise, so one fluke gets outvoted.
- A **huge k** votes with most of the dataset, so everything becomes the most common kind.

With two classes, an odd \`k\` avoids ties. In a later lesson you will pick \`k\` with evidence instead of guessing; for now we use \`K = 5\`.

### The model's memory

We will keep the stored fruit in two global names, \`memory_X\` (scaled features) and \`memory_y\` (labels). The scene and your later code read from them, so when we change what the machine remembers in the next lesson, \`classify\` follows automatically.

### Common mistakes

- Taking the \`k\` *largest* distances instead of the smallest.
- Forgetting that \`np.argsort\` returns positions, then using them on the wrong array.
- Voting on distances instead of labels.
- Passing the raw fruit to the classifier instead of scaling it first.`,
      mission: md`One neighbour was too easily fooled. Give your machine a panel of five voters.

Build the k-NN pieces (the k closest, the vote tally, the winner), glue them into \`classify(features)\` for a raw fruit, and add \`votes(features)\` so the scene can show how the vote went. When this passes, the **Voting regions** switch on: the map redraws with your voting rule and each fruit on the belt shows its tally.`,
      tasks: [
        "k_nearest_indices(X, q, k): the row numbers of the k closest rows, nearest first, as a plain list (use a stable argsort)",
        "vote_counts(labels): a dict from label to number of votes, filled nearest-first",
        "majority(labels): the label with the most votes (ties go to the nearer fruit)",
        "knn_classify(X, y, q, k): vote among the k nearest rows of X",
        "K = 5, and memory_X, memory_y = X_scaled, y; then classify(features) and votes(features) for a raw fruit",
      ],
      starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 6: k-nearest neighbours.


def k_nearest_indices(X, q, k):
    """Row numbers of the k rows of X closest to q, nearest first, as a plain list of ints.
    Hint: np.argsort(..., kind="stable")[:k].tolist()"""
    ...


def vote_counts(labels):
    """Count the votes: vote_counts(["pear", "apple", "pear"]) -> {"pear": 2, "apple": 1}.
    Use str(name) for the keys and insert labels in the order given."""
    ...


def majority(labels):
    """The winning label. On a tie, the label that appeared first (the nearer fruit) wins."""
    ...


def knn_classify(X, y, q, k):
    """The kind that wins the vote among the k rows of X nearest to q."""
    ...


K = 5                                # how many neighbours vote
memory_X, memory_y = None, None      # what the machine remembers: the scaled fruit and their kinds


def classify(features):
    """Raw fruit in, kind out: scale it, then let the K nearest remembered fruit vote."""
    ...


def votes(features):
    """The vote tally for a raw fruit, e.g. {"apple": 4, "pear": 1}."""
    ...`,
      solutionAdd: py`def k_nearest_indices(X, q, k):
    return np.argsort(distances_to(X, q), kind="stable")[:k].tolist()


def vote_counts(labels):
    counts = {}
    for name in labels:
        counts[str(name)] = counts.get(str(name), 0) + 1
    return counts


def majority(labels):
    counts = vote_counts(labels)
    return max(counts, key=counts.get)


def knn_classify(X, y, q, k):
    nearest = k_nearest_indices(X, q, k)
    return majority(y[nearest])


K = 5
memory_X, memory_y = X_scaled, y


def classify(features):
    return knn_classify(memory_X, memory_y, scale_one(features), K)


def votes(features):
    nearest = k_nearest_indices(memory_X, scale_one(features), K)
    return vote_counts(memory_y[nearest])`,
      explanation:
        "argsort with kind='stable' orders the rows by distance without losing ties' original order; slicing the first k gives the neighbours. vote_counts is the dictionary tally from lesson 1, and majority returns the key with the most votes. Because labels arrive nearest-first and dicts keep insertion order, max() resolves ties in favour of the nearer fruit. classify and votes scale the raw fruit and then read the model's memory, so changing memory_X later changes the classifier without rewriting it.",
      hints: [
        { id: "h1", title: "The k nearest", content: 'np.argsort(distances_to(X, q), kind="stable")[:k].tolist() gives the closest rows, nearest first, as ordinary ints.' },
        { id: "h2", title: "Votes and winner", content: "counts[str(name)] = counts.get(str(name), 0) + 1 for each label. The winner is max(counts, key=counts.get); max returns the first of equal winners, which is the nearer fruit's label." },
        { id: "h3", title: "Glue it together", content: "knn_classify: nearest = k_nearest_indices(X, q, k); return majority(y[nearest]). classify: knn_classify(memory_X, memory_y, scale_one(features), K). votes: vote_counts(memory_y[nearest]) using the same neighbours." },
      ],
      tests: [
        {
          id: "t1",
          description: "k_nearest_indices returns the closest rows, nearest first",
          assertionCode: py`
_xt = np.array([[0.0], [1.0], [5.0], [2.0]])
_got = k_nearest_indices(_xt, np.array([0.2]), 2)
assert isinstance(_got, list), f"return a plain list (use .tolist()), not {type(_got).__name__}"
assert _got == [0, 1], f"the two closest rows to 0.2 are rows 0 and 1, nearest first, but got {_got!r}"
assert k_nearest_indices(_xt, np.array([1.9]), 3) == [3, 1, 0], "for 1.9 the order of nearness is row 3 (2.0), row 1 (1.0), row 0 (0.0)"
assert k_nearest_indices(_xt, np.array([4.0]), 1) == [2], "with k=1 you get a list with just the single nearest row"
`,
        },
        {
          id: "t2",
          description: "vote_counts tallies the labels",
          assertionCode: py`
_got = vote_counts(["pear", "apple", "pear"])
assert _got == {"pear": 2, "apple": 1}, f"vote_counts(['pear', 'apple', 'pear']) should be {{'pear': 2, 'apple': 1}} but is {_got!r}"
assert vote_counts(np.array(["plum", "plum"])) == {"plum": 2}, "it should also work on a NumPy array of labels (use str(name) for the keys)"
assert vote_counts([]) == {}, "no voters, no votes"
`,
        },
        {
          id: "t3",
          description: "majority picks the most common label, and the nearer fruit wins ties",
          assertionCode: py`
assert majority(["pear", "apple", "pear", "pear", "apple"]) == "pear", "3 pears beat 2 apples"
assert majority(["apple", "plum", "plum"]) == "plum", "the biggest tally wins even if it did not come first"
assert majority(["pear", "apple"]) == "pear", "on a tie the label of the nearer fruit (listed first) wins"
assert majority(["apple", "pear", "pear", "apple"]) == "apple", "2 apples vs 2 pears: the first-listed (nearest) label, apple, wins"
assert type(majority(np.array(["plum"]))) is str, "return a plain str, not a NumPy string"
`,
        },
        {
          id: "t4",
          description: "knn_classify lets the k nearest rows vote",
          assertionCode: py`
_xt = np.array([[0.0, 0.0], [0.1, 0.0], [0.0, 0.1], [5.0, 5.0], [5.1, 5.0]])
_yt = np.array(["a", "a", "a", "b", "b"])
assert knn_classify(_xt, _yt, np.array([0.05, 0.05]), 3) == "a", "all three nearest points are 'a'"
assert knn_classify(_xt, _yt, np.array([4.9, 4.9]), 1) == "b", "the single nearest point is 'b'"
assert knn_classify(_xt, _yt, np.array([2.0, 2.0]), 5) == "a", "with k=5 everybody votes: 3 'a' beat 2 'b'"
`,
        },
        {
          id: "t5",
          description: "K and memory are set up",
          assertionCode: py`
assert isinstance(K, int) and K >= 1, f"K should be a whole number of neighbours, such as 5, but is {K!r}"
assert memory_X is not None and np.asarray(memory_X).shape == (240, 4), "memory_X should be the scaled fruit: X_scaled, shape (240, 4)"
assert memory_y is not None and np.asarray(memory_y).shape == (240,), "memory_y should be the kinds: y, shape (240,)"
`,
        },
        {
          id: "t6",
          description: "classify and votes work on raw fruit",
          assertionCode: py`
_plum = [66.0, 50.0, 250, 13.0]
_k = classify(_plum)
assert _k == "plum", f"a small purple fruit should be classified as a plum but classify returned {_k!r}"
assert type(_k) is str, "classify should return a plain str"
_v = votes(_plum)
assert isinstance(_v, dict) and sum(_v.values()) == K, f"votes should be a dict whose counts add up to K={K} but is {_v!r}"
assert max(_v, key=_v.get) == _k, "the winner of votes() should be what classify() answers"
assert set(votes(X_list[0])) <= {"apple", "pear", "plum"}, "vote keys should be fruit kinds"
`,
        },
      ],
      unlocks: ["oa-knn"],
      checks: [
        {
          prompt: "The 5 nearest labels are `[pear, apple, pear, pear, apple]`. What does 5-NN answer?",
          question: { type: "choice", options: ["pear", "apple", "plum", "it is a tie"], answer: 0 },
          explanation: "Pear gets 3 votes and apple 2, so pear wins.",
        },
        {
          prompt: "What happens to the answer when `k` equals the number of stored fruit?",
          question: {
            type: "choice",
            options: [
              "Every query gets the most common kind in the whole dataset",
              "Every query gets its exact nearest neighbour",
              "It crashes",
              "Accuracy becomes perfect",
            ],
            answer: 0,
          },
          explanation: "Everybody votes every time, so distance stops mattering. The model has smoothed itself into saying the majority kind for everything.",
        },
        {
          prompt: "What does `np.argsort(d)[:3]` return?",
          question: {
            type: "choice",
            options: [
              "The positions of the 3 smallest values",
              "The 3 smallest values",
              "The 3 largest values",
              "The first 3 values in their original order",
            ],
            answer: 0,
          },
          explanation: "argsort returns positions (indices), not values. You then use those positions to look up labels in another array.",
        },
      ],
    },

    // ───────────────────────── 7 ─────────────────────────
    {
      id: "ai-foundations-7-split",
      title: "Train/test split: never grade on the homework",
      minutes: 26,
      xp: 120,
      concepts: ["train/test split", "seeded shuffle", "accuracy", "generalisation", "data leakage"],
      learn: md`### Why 100% is suspicious

How good is your classifier? The obvious test is to ask it about every fruit in the batch and count the right answers. But look at what happens: every fruit in the batch is *already in the memory*, so with k = 1 it finds itself at distance 0 and scores a perfect 100%. That says nothing about fruit it has never met, which is the only thing that matters on the day the belt starts running.

It is the difference between a student who has memorised last year's exam and one who understands the subject. To tell them apart you need an exam with questions they have not seen.

### Hold some fruit back

Split the dataset into two parts before the machine learns anything:

- The **training set** (here 75%): the only fruit the machine may remember or learn from.
- The **test set** (here 25%): hidden away. The machine meets it exactly once, at the end, to give an honest score.

Never let test fruit influence anything: not the memory, not the scaler, not the choice of settings. If it does, the score is no longer an honest estimate. This mistake has a name, **data leakage**.

### Shuffle first (and keep it repeatable)

Look at the order of our fruit: 110 apples, then 80 pears, then 50 plums. If you simply took the last 25% as the test set, it would be all plums and the machine would never have seen one. So shuffle the row numbers first.

Shuffling should be random but **repeatable**, so your results are the same every run and a friend can reproduce them. A **seed** starts a random number generator in a known state: the same seed always gives the same shuffle. The sensor rig already contains one, \`Rng(seed)\`, with a method \`below(n)\` that returns a whole number from 0 to n-1.

The classic algorithm is the **Fisher-Yates shuffle**:

~~~python
order = list(range(n))
for i in range(n - 1, 0, -1):          # walk from the end to the start
    j = rng.below(i + 1)               # pick a position from 0..i
    order[i], order[j] = order[j], order[i]   # swap
~~~

### Accuracy

The simplest score is **accuracy**: the fraction of answers that are right.

~~~text
accuracy = correct answers / all answers      e.g. 53 / 60 = 0.883
~~~

### Two gotchas about scaling

1. Learn the scaler from the **training** rows only, then apply it to both parts. If the test set helps compute the mean, the test has leaked.
2. The model's memory is now only the training fruit: \`memory_X, memory_y = Xtr, y_train\`.

Comparing **training accuracy** (fruit that are in memory, so each one finds itself) with **test accuracy** (genuinely unseen fruit) shows how well the machine generalises. A big gap is a warning sign you will study properly in a later lesson.

### Common mistakes

- Evaluating on the training set and reporting it as "the accuracy".
- Splitting without shuffling sorted data.
- Fitting the scaler before splitting (the test fruit would help set the scale).
- Forgetting that the split must be applied to \`X\` **and** \`y\` with the same indices, so every fruit keeps its own label.`,
      mission: md`Your classifier looks smart, but so far it has only been quizzed on fruit it can look up. Time for a fair exam.

Write the shuffle, the split and the accuracy score, then retrain the machine on 180 fruit and test it on the 60 it never saw. When this passes, the **Train / test split** panel opens: hollow rings mark the held-back fruit on the map, with training and test accuracy side by side.`,
      tasks: [
        "shuffled_indices(n, seed): the numbers 0..n-1 in a seeded random order (Fisher-Yates with Rng)",
        "split_indices(n, test_fraction, seed): (train_idx, test_idx) as two lists",
        "accuracy(y_true, y_pred): the fraction of predictions that match, as a float",
        "Split with SEED = 11 and 25% for testing, then build X_train, X_test, y_train and y_test",
        "Refit the scaler on the training fruit only, build Xtr and Xte, and make that the model's memory",
        "predict_all(Xq, k=None) plus train_accuracy and test_accuracy",
      ],
      starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 7: split the data and test honestly.

SEED = 11   # any whole number works; keeping it fixed makes the results repeatable


def shuffled_indices(n, seed):
    """The numbers 0..n-1 in a seeded random order. Use Rng(seed) and the Fisher-Yates shuffle."""
    ...


def split_indices(n, test_fraction, seed):
    """Return (train_idx, test_idx). The first round(n * test_fraction) shuffled numbers are the test set."""
    ...


def accuracy(y_true, y_pred):
    """The fraction of predictions that equal the true answer (a float from 0 to 1)."""
    ...


# Split the 240 fruit: 75 percent to learn from, 25 percent held back. Replace the placeholders:
train_idx, test_idx = [], []
X_train, X_test = None, None
y_train, y_test = None, None

# Learn the scale from the TRAINING fruit only, then scale both parts:
scaler_mean, scaler_std = None, None
Xtr, Xte = None, None

# From now on the machine only remembers the training fruit:
memory_X, memory_y = None, None


def predict_all(Xq, k=None):
    """Predict a kind for every (already scaled) row of Xq using the memory. k defaults to K."""
    ...


train_accuracy = 0.0
test_accuracy = 0.0`,
      solutionAdd: py`SEED = 11


def shuffled_indices(n, seed):
    rng = Rng(seed)
    order = list(range(n))
    for i in range(n - 1, 0, -1):
        j = rng.below(i + 1)
        order[i], order[j] = order[j], order[i]
    return order


def split_indices(n, test_fraction, seed):
    order = shuffled_indices(n, seed)
    n_test = round(n * test_fraction)
    return order[n_test:], order[:n_test]


def accuracy(y_true, y_pred):
    hits = sum(1 for actual, guess in zip(y_true, y_pred) if actual == guess)
    return hits / len(y_true)


train_idx, test_idx = split_indices(len(X), 0.25, SEED)
X_train, X_test = X[train_idx], X[test_idx]
y_train, y_test = y[train_idx], y[test_idx]

scaler_mean, scaler_std = fit_scaler(X_train)
Xtr = apply_scaler(X_train, scaler_mean, scaler_std)
Xte = apply_scaler(X_test, scaler_mean, scaler_std)

memory_X, memory_y = Xtr, y_train


def predict_all(Xq, k=None):
    k = K if k is None else k
    return [knn_classify(memory_X, memory_y, q, k) for q in Xq]


train_accuracy = accuracy(y_train, predict_all(Xtr))
test_accuracy = accuracy(y_test, predict_all(Xte))`,
      explanation:
        "Fisher-Yates walks from the end, swapping each position with a random earlier one, which gives every ordering equal chance; the seeded Rng makes it repeatable. split_indices slices that shuffled list into test and train. Indexing X[train_idx] picks those rows, and using the same index lists for y keeps every fruit paired with its label. The scaler is fitted on training fruit only, so the test fruit cannot leak into the scale. Training accuracy is flattering (each remembered fruit finds itself), while test accuracy is the honest one.",
      hints: [
        { id: "h1", title: "The shuffle", content: "rng = Rng(seed); order = list(range(n)); then for i in range(n - 1, 0, -1): j = rng.below(i + 1); swap order[i] and order[j]. Return order." },
        { id: "h2", title: "Split and score", content: "n_test = round(n * test_fraction); return order[n_test:], order[:n_test] (train, test). accuracy: sum(1 for a, g in zip(y_true, y_pred) if a == g) / len(y_true)." },
        { id: "h3", title: "Wire it up", content: "train_idx, test_idx = split_indices(len(X), 0.25, SEED); X_train, X_test = X[train_idx], X[test_idx] (same for y). Fit the scaler on X_train, apply it to both. memory_X, memory_y = Xtr, y_train. predict_all: [knn_classify(memory_X, memory_y, q, k) for q in Xq]." },
      ],
      tests: [
        {
          id: "t1",
          description: "shuffled_indices is a repeatable permutation",
          assertionCode: py`
_a = shuffled_indices(20, 5)
assert sorted(_a) == list(range(20)), f"the result must contain each number from 0 to 19 exactly once but is {_a!r}"
assert _a == shuffled_indices(20, 5), "the same seed must give the same shuffle every time"
assert _a != shuffled_indices(20, 6), "a different seed should give a different shuffle"
assert _a != list(range(20)), "the numbers should actually be shuffled, not left in order"
assert shuffled_indices(1, 3) == [0] and shuffled_indices(0, 3) == [], "tiny inputs should work"
`,
        },
        {
          id: "t2",
          description: "split_indices separates train from test without overlap",
          assertionCode: py`
_tr, _te = split_indices(100, 0.25, 7)
assert len(_tr) == 75 and len(_te) == 25, f"100 items with a 0.25 test fraction should split 75 / 25 but got {len(_tr)} / {len(_te)}"
assert set(_tr).isdisjoint(_te), "no item may be in both the training and the test set"
assert sorted(list(_tr) + list(_te)) == list(range(100)), "every item should be in exactly one of the two sets"
assert (list(_tr), list(_te)) == tuple(list(_p) for _p in split_indices(100, 0.25, 7)), "the same seed should give the same split"
`,
        },
        {
          id: "t3",
          description: "accuracy is the fraction of matching answers",
          assertionCode: py`
_a = accuracy(["a", "b", "b", "a"], ["a", "b", "a", "a"])
assert abs(_a - 0.75) < 1e-9, f"3 of 4 answers match, so accuracy should be 0.75 but is {_a!r}"
assert accuracy([1, 1, 0], [1, 0, 0]) == 2 / 3, "accuracy([1, 1, 0], [1, 0, 0]) should be 2/3"
assert accuracy(np.array(["x", "y"]), ["x", "y"]) == 1.0, "it should work with NumPy arrays too"
assert type(accuracy(["a"], ["a"])) is float, "accuracy should be a float, such as 1.0"
`,
        },
        {
          id: "t4",
          description: "the 240 fruit are split 180 / 60 with labels kept in step",
          assertionCode: py`
assert len(train_idx) == 180 and len(test_idx) == 60, f"expected 180 training and 60 test fruit but got {len(train_idx)} and {len(test_idx)}"
assert set(train_idx).isdisjoint(test_idx), "a fruit must not be in both sets"
assert np.asarray(X_train).shape == (180, 4) and np.asarray(X_test).shape == (60, 4), "X_train should be (180, 4) and X_test (60, 4)"
assert np.asarray(y_train).shape == (180,) and np.asarray(y_test).shape == (60,), "y_train should have 180 labels and y_test 60"
assert np.array_equal(X_train, X[train_idx]) and np.array_equal(y_test, y[test_idx]), "X and y must be sliced with the same index lists so every fruit keeps its own label"
assert len(set(y_test.tolist())) == 3, "the test set should contain all three kinds. Did you shuffle before splitting?"
`,
        },
        {
          id: "t5",
          description: "the scaler is learned from the training fruit only",
          assertionCode: py`
assert np.allclose(np.asarray(scaler_mean, dtype=float), X_train.mean(axis=0)), "scaler_mean must come from X_train alone (the test fruit must not leak into the scale)"
assert np.allclose(np.asarray(scaler_std, dtype=float), X_train.std(axis=0)), "scaler_std must come from X_train alone"
assert np.allclose(np.asarray(Xtr).mean(axis=0), 0.0, atol=1e-9), "Xtr (scaled training fruit) should have mean 0 in every column"
assert np.asarray(Xte).shape == (60, 4), "Xte should be the scaled test fruit, shape (60, 4)"
assert np.array_equal(np.asarray(memory_X), np.asarray(Xtr)) and np.array_equal(np.asarray(memory_y), np.asarray(y_train)), "the machine should remember only the training fruit: memory_X, memory_y = Xtr, y_train"
`,
        },
        {
          id: "t6",
          description: "predict_all, train_accuracy and test_accuracy tell the honest story",
          assertionCode: py`
_p = predict_all(Xte)
assert len(_p) == 60 and set(_p) <= {"apple", "pear", "plum"}, "predict_all should return one kind per row"
assert abs(test_accuracy - accuracy(y_test, _p)) < 1e-9, "test_accuracy should be accuracy(y_test, predict_all(Xte))"
assert abs(train_accuracy - accuracy(y_train, predict_all(Xtr))) < 1e-9, "train_accuracy should be accuracy(y_train, predict_all(Xtr))"
assert 0.7 < test_accuracy <= 1.0, f"a working classifier should get most of the test fruit right, but test_accuracy is {test_accuracy!r}"
assert len(predict_all(Xte, k=1)) == 60, "predict_all should accept a k"
assert accuracy(y_train, predict_all(Xtr, k=1)) == 1.0, "with k=1 every remembered fruit finds itself, so training accuracy is a perfect 1.0"
`,
        },
      ],
      unlocks: ["oa-split"],
      checks: [
        {
          prompt: "Why is accuracy measured on the training fruit misleading for a nearest-neighbour model?",
          question: {
            type: "choice",
            options: [
              "Each fruit is in the memory, so it finds itself as its own neighbour",
              "Training fruit are always mislabelled",
              "Accuracy can only be computed on test data by definition",
              "The scaler changes the labels",
            ],
            answer: 0,
          },
          explanation: "A fruit that is already stored matches itself at distance 0, so training accuracy flatters the model. Only unseen fruit show how well it generalises.",
        },
        {
          prompt: "The fruit file lists 110 apples, then 80 pears, then 50 plums. What goes wrong if you use the **last** 60 rows as a test set without shuffling?",
          question: {
            type: "choice",
            options: [
              "The test set would be almost all pears and plums, not a fair sample",
              "Nothing, order never matters",
              "The test set would be empty",
              "The scaler would crash",
            ],
            answer: 0,
          },
          explanation: "Sorted data makes a lopsided test set. Shuffling first gives each part a fair mix of all three kinds.",
        },
        {
          prompt: "A model scores 98% on its training fruit and 71% on its test fruit. What does the gap suggest?",
          question: {
            type: "choice",
            options: [
              "It memorised the training fruit and generalises poorly",
              "It is a great model",
              "The test set is too easy",
              "The seed is wrong",
            ],
            answer: 0,
          },
          explanation: "A big train-test gap is the classic sign of overfitting: the model fits the examples it saw better than the world it will meet.",
        },
      ],
    },

    // ───────────────────────── 8 ─────────────────────────
    {
      id: "ai-foundations-8-confusion",
      title: "The confusion matrix, precision and recall",
      minutes: 24,
      xp: 120,
      concepts: ["confusion matrix", "precision", "recall", "class imbalance", "baseline"],
      learn: md`### Accuracy hides the details

Your machine scores 88% on the test fruit. Is that good? Which fruit does it get wrong? Is it equally bad at everything, or terrible at one kind? A single number cannot say.

It can also mislead badly. Imagine a rotten-fruit detector where only 5 fruit in 100 are rotten. A "model" that says *"fine"* for every fruit scores **95% accuracy** and catches **zero** rotten fruit. When one class is rare (**class imbalance**), accuracy alone is a trap.

### The confusion matrix

A **confusion matrix** counts every combination of *what the fruit really was* (rows) and *what the machine said* (columns):

~~~text
              said apple   said pear   said plum
real apple        25           0           0
real pear          7          15           0
real plum          0           0          13
~~~

The diagonal holds the correct answers. Everything off the diagonal is a mistake, and its position tells you the *kind* of mistake: here seven real pears were called apples, and no apple was ever called a pear.

### Precision and recall

Two questions you can ask about a kind, say *apple*:

- **Precision**: of the fruit the machine **called** apples, how many really were? It is the diagonal cell divided by its **column** total: 25 / (25 + 7) = 0.78.
- **Recall**: of the fruit that **really were** apples, how many did the machine find? The diagonal cell divided by its **row** total: 25 / 25 = 1.0.

Think of a fishing net. Recall asks "how many of the fish in the lake did I catch?". Precision asks "of everything in the net, how much is actually fish?". A huge net catches every fish (perfect recall) and lots of boots (poor precision). Good models balance the two, and which matters more depends on the job.

### The lazy baseline

Always compare your model to the silliest sensible alternative: **always predict the most common kind**. If apples are 42% of the test set, a model must beat 42% to be worth anything. In an imbalanced problem the baseline can be shockingly high.

### Dividing by zero

If a kind is never predicted, its column total is 0 and precision is undefined. We return \`0.0\` in that case instead of crashing.

### Common mistakes

- Swapping rows and columns. Convention here: **rows are the truth**, columns are the prediction.
- Mixing up the two denominators: precision divides by the column, recall by the row.
- Celebrating accuracy without checking the baseline or the rare class.`,
      mission: md`88% right sounds fine, but a sorting line cares *which* fruit get mixed up: selling pears as apples costs the farm real money.

Count every right and wrong answer in a confusion matrix, turn it into precision and recall for each kind, and compare against the lazy baseline. When this passes, the **Confusion matrix** panel opens, a heat-grid built from your counts with a precision/recall bar for every kind.`,
      tasks: [
        'confusion_matrix(y_true, y_pred, labels): a list of rows; rows are the real kind, columns the predicted kind, in the order of labels',
        "precision(matrix, i) and recall(matrix, i) for the kind at position i (return 0.0 instead of dividing by zero)",
        "majority_baseline(y_true): accuracy of always guessing the most common label",
        "LABELS = [\"apple\", \"pear\", \"plum\"], then confusion, precision_by_kind, recall_by_kind and majority_accuracy for the test set",
      ],
      starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 8: which mistakes does the machine make?

LABELS = ["apple", "pear", "plum"]


def confusion_matrix(y_true, y_pred, labels):
    """matrix[i][j] = how many fruit really of kind labels[i] were predicted as labels[j]."""
    ...


def precision(matrix, i):
    """Of everything predicted as kind i, the fraction that really was kind i. (column i)
    Return 0.0 if nothing was predicted as kind i."""
    ...


def recall(matrix, i):
    """Of everything that really was kind i, the fraction the machine found. (row i)
    Return 0.0 if there was no fruit of kind i."""
    ...


def majority_baseline(y_true):
    """Accuracy of the lazy model that always answers the most common label."""
    ...


# Score the model on the 60 test fruit. Replace the placeholders:
test_predictions = []
confusion = []
precision_by_kind = {}
recall_by_kind = {}
majority_accuracy = 0.0`,
      solutionAdd: py`LABELS = ["apple", "pear", "plum"]


def confusion_matrix(y_true, y_pred, labels):
    index = {name: i for i, name in enumerate(labels)}
    matrix = [[0] * len(labels) for _ in labels]
    for actual, guess in zip(y_true, y_pred):
        matrix[index[str(actual)]][index[str(guess)]] += 1
    return matrix


def precision(matrix, i):
    column_total = sum(row[i] for row in matrix)
    return matrix[i][i] / column_total if column_total else 0.0


def recall(matrix, i):
    row_total = sum(matrix[i])
    return matrix[i][i] / row_total if row_total else 0.0


def majority_baseline(y_true):
    return max(vote_counts(y_true).values()) / len(y_true)


test_predictions = predict_all(Xte)
confusion = confusion_matrix(y_test, test_predictions, LABELS)
precision_by_kind = {name: precision(confusion, i) for i, name in enumerate(LABELS)}
recall_by_kind = {name: recall(confusion, i) for i, name in enumerate(LABELS)}
majority_accuracy = majority_baseline(y_test)`,
      explanation:
        "The matrix starts as a grid of zeros. For each (real, guessed) pair we add one to the cell at row=real, column=guessed, using a dict from label to position. Precision reads one column (matrix[i][i] over the sum of column i) and recall reads one row. Both guard against an empty column or row. The baseline reuses vote_counts: whichever label has the most test fruit, divided by the total, is what a lazy 'always say that' model scores.",
      hints: [
        { id: "h1", title: "Build the grid", content: "index = {name: i for i, name in enumerate(labels)}; matrix = [[0] * len(labels) for _ in labels]; then for each (actual, guess): matrix[index[str(actual)]][index[str(guess)]] += 1." },
        { id: "h2", title: "Column versus row", content: "Precision: matrix[i][i] / sum(row[i] for row in matrix). Recall: matrix[i][i] / sum(matrix[i]). Use an 'if total else 0.0' to avoid dividing by zero." },
        { id: "h3", title: "The test numbers", content: "test_predictions = predict_all(Xte); confusion = confusion_matrix(y_test, test_predictions, LABELS); then precision_by_kind = {name: precision(confusion, i) for i, name in enumerate(LABELS)}. The baseline: max(vote_counts(y_true).values()) / len(y_true)." },
      ],
      tests: [
        {
          id: "t1",
          description: "confusion_matrix counts real versus predicted",
          assertionCode: py`
_got = confusion_matrix(["a", "a", "b", "b", "b"], ["a", "b", "b", "b", "a"], ["a", "b"])
assert _got == [[1, 1], [1, 2]], f"expected [[1, 1], [1, 2]] (rows = real kind, columns = predicted kind) but got {_got!r}"
_got = confusion_matrix(np.array(["x", "y", "x"]), ["x", "y", "x"], ["x", "y", "z"])
assert _got == [[2, 0, 0], [0, 1, 0], [0, 0, 0]], f"labels that never appear still get a row and column of zeros, but got {_got!r}"
assert all(type(_c) is int for _row in _got for _c in _row), "the counts should be plain ints"
`,
        },
        {
          id: "t2",
          description: "precision looks down a column",
          assertionCode: py`
_m = [[1, 1], [1, 2]]
assert abs(precision(_m, 0) - 0.5) < 1e-9, f"precision of kind 0 is 1 / (1 + 1) = 0.5 but is {precision(_m, 0)!r}"
assert abs(precision(_m, 1) - 2 / 3) < 1e-9, f"precision of kind 1 is 2 / (1 + 2) but is {precision(_m, 1)!r}"
assert precision([[0, 0], [0, 2]], 0) == 0.0, "nothing was predicted as kind 0, so return 0.0 instead of dividing by zero"
`,
        },
        {
          id: "t3",
          description: "recall looks along a row",
          assertionCode: py`
_m = [[1, 1], [1, 2]]
assert abs(recall(_m, 0) - 0.5) < 1e-9, f"recall of kind 0 is 1 / (1 + 1) = 0.5 but is {recall(_m, 0)!r}"
assert abs(recall(_m, 1) - 2 / 3) < 1e-9, f"recall of kind 1 is 2 / (1 + 2) but is {recall(_m, 1)!r}"
assert recall([[0, 0], [1, 1]], 0) == 0.0, "there was no fruit of kind 0, so return 0.0 instead of dividing by zero"
assert abs(recall([[25, 0, 0], [7, 15, 0], [0, 0, 13]], 1) - 15 / 22) < 1e-9, "recall of the pears in the example table is 15 / 22"
`,
        },
        {
          id: "t4",
          description: "majority_baseline is the score of always guessing the commonest kind",
          assertionCode: py`
_y = ["fine"] * 95 + ["rotten"] * 5
assert abs(majority_baseline(_y) - 0.95) < 1e-9, f"always saying 'fine' is right 95 times out of 100 but majority_baseline gave {majority_baseline(_y)!r}"
assert abs(majority_baseline(np.array(["a", "b", "a", "b", "b"])) - 0.6) < 1e-9, "3 of 5 labels are 'b', so the baseline is 0.6"
`,
        },
        {
          id: "t5",
          description: "the test-set confusion matrix is built from real predictions",
          assertionCode: py`
assert LABELS == ["apple", "pear", "plum"], "LABELS should be ['apple', 'pear', 'plum'], in that order"
assert len(test_predictions) == 60, "test_predictions should hold one prediction per test fruit (60)"
assert confusion == confusion_matrix(y_test, predict_all(Xte), LABELS), "confusion should be confusion_matrix(y_test, test_predictions, LABELS)"
assert sum(sum(_row) for _row in confusion) == 60, "the 3x3 matrix should count all 60 test fruit"
assert sum(confusion[_i][_i] for _i in range(3)) == round(test_accuracy * 60), "the diagonal total divided by 60 should be your test_accuracy"
`,
        },
        {
          id: "t6",
          description: "precision_by_kind, recall_by_kind and majority_accuracy are filled in",
          assertionCode: py`
assert set(precision_by_kind) == set(LABELS) and set(recall_by_kind) == set(LABELS), "both dicts need one entry per kind"
for _i, _name in enumerate(LABELS):
    assert abs(precision_by_kind[_name] - precision(confusion, _i)) < 1e-9, f"precision_by_kind[{_name!r}] should be precision(confusion, {_i})"
    assert abs(recall_by_kind[_name] - recall(confusion, _i)) < 1e-9, f"recall_by_kind[{_name!r}] should be recall(confusion, {_i})"
assert abs(majority_accuracy - majority_baseline(y_test)) < 1e-9, "majority_accuracy should be majority_baseline(y_test)"
assert test_accuracy > majority_accuracy, "your model should beat the lazy baseline of always guessing the commonest kind"
`,
        },
      ],
      unlocks: ["oa-confusion"],
      checks: [
        {
          prompt: "A detector marks every fruit \"fine\". Only 5 of 100 are rotten. What is its accuracy, and how many rotten fruit does it find?",
          question: {
            type: "choice",
            options: ["95% accuracy, 0 rotten found", "5% accuracy, 5 rotten found", "100% accuracy, all found", "50% accuracy, 0 found"],
            answer: 0,
          },
          explanation: "It is right on all 95 fine fruit, so accuracy is 95%, yet it never finds a rotten one. On imbalanced data accuracy hides failure, which is why recall matters.",
        },
        {
          prompt: "In a confusion matrix with the real kind on the rows, which total do you divide by to get **recall**?",
          question: { type: "choice", options: ["The row total", "The column total", "The grand total", "The diagonal total"], answer: 0 },
          explanation: "Recall asks 'of the fruit that really were this kind, how many did we find?', and the real fruit of a kind are the row. Precision divides by the column.",
        },
        {
          prompt: "The matrix says 7 real pears were called apples. Which two scores does that hurt?",
          question: {
            type: "choice",
            options: ["Apple precision and pear recall", "Apple recall and pear precision", "Plum precision and plum recall", "Only overall accuracy"],
            answer: 0,
          },
          explanation: "Those 7 are extra wrong fruit in the 'called apple' column (lower apple precision) and missed fruit in the 'real pear' row (lower pear recall).",
        },
      ],
    },
  ],
};
