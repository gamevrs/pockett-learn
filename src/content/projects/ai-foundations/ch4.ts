import type { Chapter } from "@/engine/types";
import { md, py } from "./util.ts";

/**
 * Chapter 4: Trust your model. Decision thresholds, under- and overfitting, feature engineering
 * and the finished sorting pipeline.
 *
 * Names this chapter adds: decide, precision_recall_at, best_threshold, p_train, RIPE_THRESHOLD,
 * threshold_table, is_ripe, neighbour_order, knn_accuracy, K_VALUES, fit_curve, best_k (and a new
 * K), BANDS, colour_band, one_hot, engineer, X_eng, test_accuracy_with, baseline_accuracy,
 * engineered_accuracy, evaluate_pipeline, sort_fruit, classify_many, report, fresh_report.
 */

export const chapter4: Chapter = {
  id: "trust",
  title: "Trust your model",
  blurb: "Choose thresholds on purpose, spot over- and underfitting, invent better features and ship the pipeline.",
  lessons: [
    // ───────────────────────── 13 ─────────────────────────
    {
      id: "ai-foundations-13-threshold",
      title: "Decision thresholds: precision against recall",
      minutes: 22,
      xp: 130,
      concepts: ["decision threshold", "false positives", "false negatives", "precision-recall trade-off", "tuning without peeking"],
      learn: md`### A probability is not yet a decision

Your ripeness model says "p = 0.62". The belt has to choose a crate: premium (ripe) or standard. Somewhere there is a **threshold**: ripe if \`p >= threshold\`.

We used 0.5 last lesson because it feels natural, but 0.5 is a **choice**, not a law of nature. The right threshold depends on what each kind of mistake costs.

### Two kinds of mistake

- A **false positive**: unripe fruit sent to the premium crate. Customers bite into a sour pear and stop buying.
- A **false negative**: ripe fruit sent to the standard crate. The farm loses some money on a good fruit.

Those are not equally bad. If sour premium fruit is the expensive mistake, we want the premium crate to be *pure*. We can get that by raising the threshold so only the most confident fruit qualify.

### Moving the threshold moves precision and recall

Using the words from lesson 8, for the class "ripe":

- **Precision**: of the fruit sent to premium, how many were ripe? (purity of the crate)
- **Recall**: of all the ripe fruit, how many made it into premium? (how much good fruit we kept)

Counting with a threshold \`t\`:

~~~text
guess "ripe" when p >= t
tp  = guessed ripe and really ripe
fp  = guessed ripe but really unripe
fn  = guessed unripe but really ripe
precision = tp / (tp + fp)         recall = tp / (tp + fn)
~~~

Raise \`t\`: fewer fruit qualify, the survivors are more reliably ripe (precision goes up) but more good fruit are left behind (recall goes down). Lower \`t\`: the reverse. You cannot improve both for free, so you pick a point on the trade-off that suits the business.

A worked example. Probabilities for six fruit and the truth (1 = ripe):

~~~text
p      0.93  0.81  0.72  0.62  0.41  0.22
truth     1     1     1     0     0     0
t = 0.5: guess ripe for the first four -> tp 3, fp 1, fn 0 -> precision 0.75, recall 1.0
t = 0.7: guess ripe for the first three -> tp 3, fp 0, fn 0 -> precision 1.0,  recall 1.0
~~~

### Choosing a threshold without cheating

A sensible rule from the grocer: "keep **at least 85%** of the ripe fruit, but make the premium crate as pure as you can". So: try thresholds from 0.05 to 0.95 in steps of 0.05, ignore those with recall below the minimum, and pick the one with the best precision.

Which fruit do we try them on? **Not the test set.** Choosing a threshold by looking at the test results is just a gentler version of leakage: the exam would then have helped write the rules. So tune on the **training** fruit's probabilities, then report on the test fruit with the threshold frozen.

### Zero divisions again

If no fruit passes the threshold, \`tp + fp\` is 0. We return \`0.0\` for precision instead of crashing.

### Common mistakes

- Treating 0.5 as sacred.
- Tuning the threshold on the test set and then reporting the test score as if it were honest.
- Comparing \`p > t\` vs \`p >= t\` inconsistently. We use \`>=\`.
- Forgetting that a lower threshold means *more* positive guesses.`,
      mission: md`The grocer has a rule: the premium crate must be pure, but at least 85% of the ripe fruit must make it in. 0.5 is just a guess at where to put the cut-off.

Count the right and wrong calls at any threshold, search for the best cut-off that keeps the recall promise, and let the belt route fruit to the crates with it. When this passes, the **Decision threshold** panel opens: a precision/recall curve with a draggable cut-off marker.`,
      tasks: [
        "decide(prob, threshold): True when prob >= threshold (a real bool)",
        "precision_recall_at(probs, t_true, threshold): return (precision, recall) as floats, 0.0 if a denominator is 0",
        "best_threshold(probs, t_true, min_recall): try 0.05, 0.10 ... 0.95 and return the one with the best precision among those with recall >= min_recall",
        "p_train (probabilities for the training fruit), then RIPE_THRESHOLD = best_threshold(p_train, ripe_train, 0.85)",
        "threshold_table: for thresholds 0.1 to 0.9 on the TEST fruit, a list of {\"threshold\", \"precision\", \"recall\"}",
        "is_ripe(sugar): True when the ripeness probability reaches RIPE_THRESHOLD",
      ],
      starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 13: choose the cut-off on purpose.


def decide(prob, threshold):
    """True (a real bool) when the probability reaches the threshold."""
    ...


def precision_recall_at(probs, t_true, threshold):
    """Guess "ripe" when prob >= threshold. Return (precision, recall) as floats.
    precision = tp / (tp + fp), recall = tp / (tp + fn); use 0.0 if a denominator is 0."""
    ...


def best_threshold(probs, t_true, min_recall):
    """Try thresholds 0.05, 0.10, ... 0.95. Among those whose recall is at least min_recall,
    return the one with the highest precision (the first one if there is a tie).
    If none qualifies, return 0.05."""
    ...


# Tune on the TRAINING fruit, never on the test fruit. Replace the placeholders:
p_train = None
RIPE_THRESHOLD = 0.5

# Report the trade-off on the test fruit for thresholds 0.1, 0.2, ... 0.9:
threshold_table = []     # [{"threshold": 0.1, "precision": ..., "recall": ...}, ...]


def is_ripe(sugar):
    """True when a fruit with this RAW sugar reading reaches the ripeness threshold."""
    ...`,
      solutionAdd: py`def decide(prob, threshold):
    return bool(prob >= threshold)


def precision_recall_at(probs, t_true, threshold):
    tp = fp = fn = 0
    for prob, actual in zip(probs, t_true):
        guess = prob >= threshold
        if guess and actual:
            tp += 1
        elif guess:
            fp += 1
        elif actual:
            fn += 1
    precision_value = tp / (tp + fp) if tp + fp else 0.0
    recall_value = tp / (tp + fn) if tp + fn else 0.0
    return precision_value, recall_value


def best_threshold(probs, t_true, min_recall):
    best, best_precision = 0.05, -1.0
    for step in range(1, 20):
        threshold = step * 0.05
        p, r = precision_recall_at(probs, t_true, threshold)
        if r >= min_recall and p > best_precision:
            best, best_precision = round(threshold, 2), p
    return best


p_train = sigmoid(Str @ np.asarray(ripe_weights))
RIPE_THRESHOLD = best_threshold(p_train, ripe_train, 0.85)

threshold_table = []
for step in range(1, 10):
    threshold = step / 10
    p, r = precision_recall_at(p_test, ripe_test, threshold)
    threshold_table.append({"threshold": threshold, "precision": p, "recall": r})


def is_ripe(sugar):
    return decide(ripe_probability(sugar), RIPE_THRESHOLD)`,
      explanation:
        "decide wraps the comparison in bool() so it is a real True/False rather than a NumPy bool. precision_recall_at tallies true positives, false positives and false negatives for one cut-off. best_threshold walks the 19 candidate cut-offs, skips those that break the recall promise and keeps the first with the highest precision. Crucially it is run on p_train: the cut-off is tuned on training fruit and then frozen. The table on the test fruit shows the trade-off honestly, and is_ripe puts the chosen cut-off to work on one sugar reading.",
      hints: [
        { id: "h1", title: "Counting", content: "Loop over zip(probs, t_true). guess = prob >= threshold. If guess and actual: tp += 1; elif guess: fp += 1; elif actual: fn += 1. Then precision = tp / (tp + fp) if tp + fp else 0.0, and the same idea for recall." },
        { id: "h2", title: "Searching", content: "for step in range(1, 20): threshold = step * 0.05; compute (p, r); if r >= min_recall and p > best_precision, remember it (store round(threshold, 2)). Start with best, best_precision = 0.05, -1.0." },
        { id: "h3", title: "Training versus test", content: "p_train = sigmoid(Str @ np.asarray(ripe_weights)) and RIPE_THRESHOLD = best_threshold(p_train, ripe_train, 0.85). For the table use p_test and ripe_test with step / 10 for thresholds 0.1 to 0.9. is_ripe: decide(ripe_probability(sugar), RIPE_THRESHOLD)." },
      ],
      tests: [
        {
          id: "t1",
          description: "decide compares with >= and returns a real bool",
          assertionCode: py`
assert decide(0.7, 0.5) is True, "0.7 reaches a threshold of 0.5"
assert decide(0.3, 0.5) is False, "0.3 does not reach a threshold of 0.5"
assert decide(0.5, 0.5) is True, "the threshold itself counts (use >=)"
assert decide(np.float64(0.9), 0.5) is True, "wrap the comparison in bool() so NumPy values give a real True/False"
`,
        },
        {
          id: "t2",
          description: "precision_recall_at counts true and false positives",
          assertionCode: py`
_p = np.array([0.9, 0.8, 0.4, 0.3])
_t = np.array([1, 0, 1, 0])
_got = precision_recall_at(_p, _t, 0.5)
assert isinstance(_got, tuple) and len(_got) == 2, "return a pair (precision, recall)"
assert abs(_got[0] - 0.5) < 1e-9 and abs(_got[1] - 0.5) < 1e-9, f"at 0.5: tp=1, fp=1, fn=1 so precision and recall are both 0.5 but got {_got!r}"
_got = precision_recall_at(_p, _t, 0.0)
assert abs(_got[0] - 0.5) < 1e-9 and abs(_got[1] - 1.0) < 1e-9, f"guessing 'ripe' for everything: precision 2/4 and recall 1.0, but got {_got!r}"
assert precision_recall_at(_p, _t, 0.95) == (0.0, 0.0), "when nothing passes the threshold return (0.0, 0.0) instead of dividing by zero"
assert all(type(_v) is float for _v in precision_recall_at(_p, _t, 0.5)), "return plain floats"
`,
        },
        {
          id: "t3",
          description: "best_threshold finds a pure cut-off that keeps enough recall",
          assertionCode: py`
_p = np.array([0.93, 0.81, 0.72, 0.62, 0.41, 0.22])
_t = np.array([1, 1, 1, 0, 0, 0])
_b = best_threshold(_p, _t, 1.0)
assert 0.05 <= _b <= 0.95 and abs(_b * 20 - round(_b * 20)) < 1e-6, f"the threshold should be one of 0.05, 0.10, ... 0.95 but is {_b!r}"
_pr = precision_recall_at(_p, _t, _b)
assert _pr[1] >= 1.0 and _pr[0] == 1.0, f"to keep every ripe fruit with a pure crate, a cut-off between 0.65 and 0.70 works. Yours ({_b!r}) gives precision {_pr[0]:.2f} and recall {_pr[1]:.2f}"
_b = best_threshold(_p, _t, 0.3)
_pr = precision_recall_at(_p, _t, _b)
assert _pr[1] >= 0.3 and _pr[0] == 1.0, f"with a recall promise of 0.3, a perfectly pure crate is possible but yours ({_b!r}) gives precision {_pr[0]:.2f}, recall {_pr[1]:.2f}"
_lo = best_threshold(np.array([0.9, 0.2]), np.array([1, 1]), 1.0)
assert _lo <= 0.2, f"to keep BOTH ripe fruit the cut-off must be at most 0.2 but best_threshold returned {_lo!r}"
`,
        },
        {
          id: "t4",
          description: "RIPE_THRESHOLD is tuned on the training fruit",
          assertionCode: py`
assert np.asarray(p_train).shape == (180,), "p_train should hold one probability per training fruit (180)"
assert np.allclose(np.asarray(p_train), sigmoid(Str @ np.asarray(ripe_weights))), "p_train should be the ripeness probability of every training fruit: sigmoid(Str @ ripe_weights)"
assert RIPE_THRESHOLD == best_threshold(p_train, ripe_train, 0.85), "RIPE_THRESHOLD should be best_threshold(p_train, ripe_train, 0.85): tune on the training fruit"
assert precision_recall_at(p_train, ripe_train, RIPE_THRESHOLD)[1] >= 0.85, "at your threshold at least 85% of the ripe training fruit must be kept"
`,
        },
        {
          id: "t5",
          description: "threshold_table reports the trade-off on the test fruit",
          assertionCode: py`
assert isinstance(threshold_table, list) and len(threshold_table) == 9, "threshold_table should have 9 rows, for thresholds 0.1 to 0.9"
for _i, _row in enumerate(threshold_table):
    assert set(_row) == {"threshold", "precision", "recall"}, f"each row needs the keys threshold, precision and recall but has {sorted(_row)!r}"
    assert abs(_row["threshold"] - (_i + 1) / 10) < 1e-9, "the thresholds should run 0.1, 0.2, ... 0.9 in order"
    _p, _r = precision_recall_at(p_test, ripe_test, _row["threshold"])
    assert abs(_row["precision"] - _p) < 1e-9 and abs(_row["recall"] - _r) < 1e-9, f"row {_i} should hold the test-set precision and recall at threshold {_row['threshold']}"
assert threshold_table[0]["recall"] >= threshold_table[-1]["recall"], "raising the threshold should not increase recall"
`,
        },
        {
          id: "t6",
          description: "is_ripe applies the chosen cut-off to a sugar reading",
          assertionCode: py`
assert is_ripe(18.0) is True, "a very sweet fruit should be called ripe"
assert is_ripe(5.0) is False, "a very sour fruit should not"
for _s in [7.0, 9.5, 11.0, 12.5, 14.0, 16.0]:
    assert is_ripe(_s) == (ripe_probability(_s) >= RIPE_THRESHOLD), f"is_ripe({_s}) should compare ripe_probability({_s}) with RIPE_THRESHOLD"
`,
        },
      ],
      unlocks: ["oa-threshold"],
      checks: [
        {
          prompt: "You raise the ripeness threshold from 0.5 to 0.8. What usually happens?",
          question: {
            type: "choice",
            options: [
              "Precision rises and recall falls",
              "Both precision and recall rise",
              "Recall rises and precision falls",
              "Nothing changes",
            ],
            answer: 0,
          },
          explanation: "A stricter cut-off lets only the most confident fruit through. The premium crate gets purer (precision up) but more good fruit are left out (recall down).",
        },
        {
          prompt: "Which is a **false positive** for the premium crate?",
          question: {
            type: "choice",
            options: [
              "An unripe fruit sent to the premium crate",
              "A ripe fruit sent to the standard crate",
              "A ripe fruit sent to premium",
              "An unripe fruit sent to standard",
            ],
            answer: 0,
          },
          explanation: "Positive means 'we said ripe'. A false positive is said-ripe but actually unripe. Ripe fruit sent to standard is a false negative.",
        },
        {
          prompt: "Why do we choose the threshold using the **training** fruit's probabilities?",
          question: {
            type: "choice",
            options: [
              "Choosing it on the test fruit would let the exam influence the model, so the test score would be too optimistic",
              "The test fruit have no probabilities",
              "Training fruit always give better thresholds",
              "NumPy cannot read the test set",
            ],
            answer: 0,
          },
          explanation: "Anything that is tuned by looking at the test set stops being an honest test. The test fruit should be touched only once, at the very end.",
        },
      ],
    },

    // ───────────────────────── 14 ─────────────────────────
    {
      id: "ai-foundations-14-fit",
      title: "Overfitting and underfitting: choosing k",
      minutes: 26,
      xp: 140,
      concepts: ["overfitting", "underfitting", "model complexity", "validation", "broadcasting"],
      learn: md`### Too simple, too fussy

Every model has a dial for how **flexible** it is. For k-nearest neighbours the dial is \`k\`:

- **k = 1**: the model bends to match every single training fruit, noise and all. It is very flexible.
- **k = 180** (all the training fruit): everyone votes every time, so it just says the most common kind. It cannot bend at all.

Two failure modes come out of that:

- **Overfitting**: the model memorises quirks of the training set instead of learning the pattern. Training accuracy is excellent, but accuracy on new fruit is noticeably worse. (k = 1 scores a perfect 100% on training fruit, because each one finds itself.)
- **Underfitting**: the model is too rigid to capture the pattern at all. It is poor on training fruit *and* new fruit alike.

The goal sits in between: flexible enough to learn the real pattern, restrained enough to ignore the noise.

### The fit curve

Compute accuracy for many values of \`k\`, on training and on held-out fruit, and put them side by side:

~~~text
  k    train   held-out
  1    1.00     0.86      big gap: overfitting
  3    0.96     0.91
  9    0.94     0.89
 25    0.86     0.85
 90    0.68     0.61      both low: underfitting
180    0.47     0.45
~~~

Look for the gap between the two columns and for where the held-out column peaks.

### Don't pick k with the test set

If we choose \`k\` by looking at test accuracy, the test set has helped build the model, so it can no longer promise how the model will do on truly new fruit. The standard fix is a separate **validation** score. Here is a neat nearest-neighbour trick that needs no extra split: when you score a *training* fruit, **skip itself** as a neighbour. Every training fruit then asks the other 179 for their opinion, which is an honest "unseen" test (this is called *leave-one-out* validation). We pick \`k\` with that, and keep the test set for the final report.

### Computing it fast: sort once, reuse for every k

Trying 9 values of \`k\` by calling the classifier 9 times for every fruit would be slow. But the neighbours of a fruit do not depend on \`k\`: only how many of them we count does. So sort the neighbours **once**, then for each \`k\` take the first \`k\` of the sorted list.

To get the sorted neighbour list for many fruit at once, use broadcasting with an extra axis:

~~~python
gaps = queries[:, None, :] - reference[None, :, :]       # (n_q, n_ref, 4)
distances = np.sqrt((gaps ** 2).sum(axis=2))            # (n_q, n_ref)
order = np.argsort(distances, axis=1, kind="stable")    # row i: reference rows nearest-first
~~~

\`[:, None, :]\` inserts a new axis of size 1, so every query is subtracted from every reference row. For training fruit scored against themselves, column 0 of \`order\` is the fruit itself (distance 0); dropping it with \`order[:, 1:]\` gives the leave-one-out version.

### Common mistakes

- Reading a high training accuracy as proof of quality.
- Choosing k from the test score.
- Forgetting to drop the fruit itself when validating on training fruit.
- Mixing up axes in the broadcast and getting a table of the wrong shape (print \`.shape\`!).`,
      mission: md`Your machine uses 5 voters because 5 sounded fine. Is that the best number? Is the machine memorising, or truly learning?

Sort every fruit's neighbours once, score the classifier for nine different values of \`k\` on training, validation and test fruit, and pick the best \`k\` without peeking at the exam. When this passes, the **Under- and overfitting** panel opens: the three accuracy curves against \`k\`, with the gap shaded and your chosen \`k\` marked.`,
      tasks: [
        "neighbour_order(queries, reference): for each query row, the reference row numbers sorted nearest-first (a 2-D array; broadcasting and a stable argsort)",
        "knn_accuracy(order, ref_labels, true_labels, k): classify each query by majority vote of its first k neighbours and return the accuracy",
        "K_VALUES = [1, 3, 5, 9, 15, 25, 45, 90, 180], train_order = neighbour_order(Xtr, Xtr), test_order = neighbour_order(Xte, Xtr)",
        "fit_curve: for each k a dict {\"k\", \"train\", \"val\", \"test\"}; val is the leave-one-out accuracy (drop column 0 of train_order)",
        "best_k: the k with the highest val (the smaller k wins ties), then K = best_k",
      ],
      starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 14: is the model memorising or learning? Choose k with evidence.


def neighbour_order(queries, reference):
    """For every row of queries, the row numbers of reference sorted nearest-first.
    Hint: gaps = queries[:, None, :] - reference[None, :, :] has shape (n_q, n_ref, features)."""
    ...


def knn_accuracy(order, ref_labels, true_labels, k):
    """Classify each query by majority vote of the labels of its first k neighbours
    (ref_labels[row[:k]] for each row of order). Return the accuracy against true_labels."""
    ...


K_VALUES = [1, 3, 5, 9, 15, 25, 45, 90, 180]

# Sort the neighbours ONCE. Replace the placeholders:
train_order = None    # the training fruit against the training fruit
test_order = None     # the test fruit against the training fruit

fit_curve = []        # one dict per k: {"k": 1, "train": ..., "val": ..., "test": ...}
best_k = 5
K = best_k            # the classifier now uses the k you picked`,
      solutionAdd: py`def neighbour_order(queries, reference):
    gaps = queries[:, None, :] - reference[None, :, :]
    return np.argsort(np.sqrt((gaps ** 2).sum(axis=2)), axis=1, kind="stable")


def knn_accuracy(order, ref_labels, true_labels, k):
    guesses = [majority(ref_labels[row[:k]]) for row in order]
    return accuracy(true_labels, guesses)


K_VALUES = [1, 3, 5, 9, 15, 25, 45, 90, 180]
train_order = neighbour_order(Xtr, Xtr)
test_order = neighbour_order(Xte, Xtr)

fit_curve = []
for k in K_VALUES:
    fit_curve.append({
        "k": k,
        "train": knn_accuracy(train_order, y_train, y_train, k),
        "val": knn_accuracy(train_order[:, 1:], y_train, y_train, k),
        "test": knn_accuracy(test_order, y_train, y_test, k),
    })
best_k = max(fit_curve, key=lambda row: (row["val"], -row["k"]))["k"]
K = best_k`,
      explanation:
        "The extra axes in queries[:, None, :] - reference[None, :, :] subtract every reference row from every query, giving a (queries, references, features) cube; summing over axis 2 collapses the features into distances. One stable argsort per row gives the neighbours nearest-first, and every k just reads a different prefix of that list. For training fruit the first neighbour is the fruit itself, so 'train' is flattering (k=1 is always perfect) while dropping column 0 gives an honest leave-one-out 'val'. best_k maximises val, and the key (val, -k) prefers the smaller k on a tie. Test accuracy was never used to choose.",
      hints: [
        { id: "h1", title: "All the distances", content: "gaps = queries[:, None, :] - reference[None, :, :] then distances = np.sqrt((gaps ** 2).sum(axis=2)). Return np.argsort(distances, axis=1, kind=\"stable\")." },
        { id: "h2", title: "Reusing the order", content: "For each row of order, row[:k] are the k nearest reference rows. guesses = [majority(ref_labels[row[:k]]) for row in order], then accuracy(true_labels, guesses)." },
        { id: "h3", title: "Validation and the winner", content: "val uses train_order[:, 1:] (drop the fruit itself) with y_train for both label arguments. best_k = max(fit_curve, key=lambda row: (row[\"val\"], -row[\"k\"]))[\"k\"] picks the best val, preferring smaller k on ties. Finally K = best_k." },
      ],
      tests: [
        {
          id: "t1",
          description: "neighbour_order sorts the reference rows nearest-first for every query",
          assertionCode: py`
_got = np.asarray(neighbour_order(np.array([[0.0], [10.0]]), np.array([[1.0], [9.0], [2.0]])))
assert _got.shape == (2, 3), f"one sorted list of 3 reference rows per query: shape (2, 3) but got {_got.shape}"
assert _got.tolist() == [[0, 2, 1], [1, 2, 0]], f"for the query 0 the order is rows 0, 2, 1 and for the query 10 it is 1, 2, 0, but got {_got.tolist()!r}"
_two = np.asarray(neighbour_order(np.array([[0.0, 0.0]]), np.array([[3.0, 4.0], [0.0, 1.0]])))
assert _two.tolist() == [[1, 0]], "it should work with several features: the point (0, 1) is nearer to (0, 0) than (3, 4)"
`,
        },
        {
          id: "t2",
          description: "knn_accuracy votes among the first k neighbours",
          assertionCode: py`
_ref = np.array(["a", "a", "b"])
_order = np.array([[2, 0, 1]])
assert knn_accuracy(_order, _ref, ["a"], 1) == 0.0, "with k=1 the nearest neighbour is row 2, labelled 'b', so the answer 'b' is wrong"
assert knn_accuracy(_order, _ref, ["a"], 3) == 1.0, "with k=3 the vote is b, a, a, so 'a' wins and the answer is right"
_order2 = np.array([[0, 1], [1, 0]])
assert abs(knn_accuracy(_order2, np.array(["a", "b"]), ["a", "a"], 1) - 0.5) < 1e-9, "the first query is right and the second wrong: accuracy 0.5"
assert knn_accuracy(_order2, np.array(["a", "b"]), ["a", "b"], 1) == 1.0, "both right: accuracy 1.0"
`,
        },
        {
          id: "t3",
          description: "the neighbour lists for the real fruit are computed once",
          assertionCode: py`
assert np.asarray(train_order).shape == (180, 180), f"train_order should be (180, 180) but is {np.asarray(train_order).shape}"
assert np.asarray(test_order).shape == (60, 180), f"test_order should be (60, 180) but is {np.asarray(test_order).shape}"
assert np.array_equal(np.asarray(train_order)[:, 0], np.arange(180)), "every training fruit's nearest neighbour among the training fruit is itself, so column 0 of train_order is 0, 1, 2, ..."
assert K_VALUES == [1, 3, 5, 9, 15, 25, 45, 90, 180], "K_VALUES should be [1, 3, 5, 9, 15, 25, 45, 90, 180]"
`,
        },
        {
          id: "t4",
          description: "fit_curve holds train, validation and test accuracy for every k",
          assertionCode: py`
assert isinstance(fit_curve, list) and len(fit_curve) == 9, "fit_curve needs one dict per value in K_VALUES (9)"
assert [_r["k"] for _r in fit_curve] == K_VALUES, "fit_curve should follow the order of K_VALUES"
for _r in fit_curve:
    assert set(_r) == {"k", "train", "val", "test"}, f"each row needs the keys k, train, val and test but has {sorted(_r)!r}"
_by = {_r["k"]: _r for _r in fit_curve}
assert _by[1]["train"] == 1.0, "with k=1 every training fruit finds itself, so training accuracy is a perfect 1.0"
assert _by[1]["val"] < _by[1]["train"], "leave-one-out accuracy skips the fruit itself, so it must be lower than the flattering training accuracy at k=1"
assert abs(_by[5]["test"] - knn_accuracy(test_order, y_train, y_test, 5)) < 1e-9, "test accuracy at k=5 should be knn_accuracy(test_order, y_train, y_test, 5)"
assert abs(_by[5]["val"] - knn_accuracy(np.asarray(train_order)[:, 1:], y_train, y_train, 5)) < 1e-9, "val should use train_order[:, 1:] (the fruit itself dropped)"
assert _by[180]["test"] < 0.6 and _by[180]["train"] < 0.6, "with k=180 everybody votes, so the model just says the commonest kind and underfits badly"
`,
        },
        {
          id: "t5",
          description: "best_k comes from validation accuracy, and K follows",
          assertionCode: py`
_top = max(_r["val"] for _r in fit_curve)
_want = min(_r["k"] for _r in fit_curve if _r["val"] == _top)
assert best_k == _want, f"best_k should be the k with the highest val accuracy (smaller k on a tie), which is {_want} but yours is {best_k!r}"
assert K == best_k, "set K = best_k so classify() uses the chosen number of neighbours"
assert best_k in K_VALUES, "best_k must be one of the values in K_VALUES"
`,
        },
      ],
      unlocks: ["oa-fit"],
      checks: [
        {
          prompt: "A model has 99% training accuracy and 72% test accuracy. What is the likely diagnosis?",
          question: { type: "choice", options: ["Overfitting", "Underfitting", "A perfect model", "Too much test data"], answer: 0 },
          explanation: "A big gap between training and test accuracy means the model memorised the training set instead of learning a pattern that carries over.",
        },
        {
          prompt: "With `k` equal to the number of training fruit, a k-NN model...",
          question: {
            type: "choice",
            options: [
              "answers with the most common kind every time (underfitting)",
              "answers with perfect accuracy",
              "memorises every fruit (overfitting)",
              "refuses to answer",
            ],
            answer: 0,
          },
          explanation: "Every training fruit votes on every query, so the answer never changes. The model is too rigid to see any pattern.",
        },
        {
          prompt: "Why does the validation score skip each training fruit's own entry in its neighbour list?",
          question: {
            type: "choice",
            options: [
              "Otherwise each fruit would vote for itself and the score would be unrealistically good",
              "To make the arrays smaller",
              "Because the nearest fruit is always wrong",
              "To save memory",
            ],
            answer: 0,
          },
          explanation: "A fruit is always its own nearest neighbour. Dropping that column makes each training fruit behave like a new fruit, which is what a fair validation needs.",
        },
      ],
    },

    // ───────────────────────── 15 ─────────────────────────
    {
      id: "ai-foundations-15-features",
      title: "Feature engineering: better inputs beat bigger models",
      minutes: 24,
      xp: 140,
      concepts: ["feature engineering", "ratios", "one-hot encoding", "domain knowledge", "measuring improvement"],
      learn: md`### Garbage in, insight out

A model can only use what you show it. Often the cheapest way to improve it is not a fancier algorithm but a **better input**: a feature that makes the pattern easy to see. Inventing such features is **feature engineering**, and it is where knowing your subject pays off.

Think about apples and pears. They have similar diameters and similar weights, so the raw numbers overlap. But a pear is a *dense* fruit and an apple is airy: for the same size, a pear is heavier. The useful fact lives in the **relationship** between two measurements, not in either one alone.

### Ratios: capture "heavy for its size"

Weight grows with the volume of the fruit, and volume grows like diameter cubed. So

~~~text
density = weight / diameter^3 * 10000
~~~

is roughly constant within a kind and different between kinds. Worked example: a 160 g fruit of 40 mm diameter has density \`160 / 40^3 * 10000 = 160 / 64000 * 10000 = 25\`. Show the model this number and it no longer has to work the relationship out by itself.

### Categories: one-hot encoding

A **category** such as a colour band ("warm", "green", "purple") is a word, not a number, and a model that does maths cannot digest words. Numbering them 0, 1, 2 would sneak in a false order (is purple "twice" green?).

**One-hot encoding** gives each category its own 0/1 column, with exactly one column switched on:

~~~text
band     warm  green  purple
warm        1      0       0
green       0      1       0
purple      0      0       1
~~~

We turn the hue (an angle in degrees) into a band: below 35 is "warm", 35 up to 150 is "green", 150 and up is "purple".

### The pipeline stays honest

Feature engineering must follow the same rules as everything else:

1. A new feature may only use the fruit's **own measurements**, never its label (that would be leakage).
2. Scale **after** engineering, with a scaler learned from the training fruit only (the helper below does it for you).
3. **Measure** the result. A clever feature that does not improve held-out accuracy is just noise. Add features one idea at a time and keep what helps.

### Common mistakes

- Using the label (or something computed from it) to build a feature.
- Adding dozens of features and hoping. More columns means more noise and a bigger risk of overfitting.
- Engineering features on the whole dataset using statistics from the test fruit.
- Forgetting that every new fruit must pass through exactly the same \`engineer\` function before prediction.`,
      mission: md`The raw measurements make pears and apples hard to tell apart: they overlap in size and colour. But a farmer would say a pear "feels heavy for its size". Teach the machine that intuition.

Invent a density ratio and one-hot colour bands, build the engineered table, then score k-NN on the same train/test split with and without the new features. When this passes, the **Feature lab** opens: accuracy before and after, and the density of every kind laid out on one strip.`,
      tasks: [
        "colour_band(hue): \"warm\" below 35, \"green\" from 35 to below 150, otherwise \"purple\"",
        "one_hot(value, categories): a list of 1.0 and 0.0 floats, one per category",
        "engineer(features): the four raw features, then density (weight / diameter cubed * 10000), then the three one-hot band columns (BANDS = [\"warm\", \"green\", \"purple\"])",
        "X_eng: the engineered table for every fruit, shape (240, 8)",
        "test_accuracy_with(F, k): fit a scaler on F[train_idx], vote with k neighbours and return the test accuracy",
        "baseline_accuracy (raw X) and engineered_accuracy (X_eng), both with k = K",
      ],
      starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 15: feature engineering. Show the model what a farmer sees.

BANDS = ["warm", "green", "purple"]


def colour_band(hue):
    """"warm" below 35 degrees, "green" from 35 up to (not including) 150, otherwise "purple"."""
    ...


def one_hot(value, categories):
    """one_hot("green", ["warm", "green", "purple"]) -> [0.0, 1.0, 0.0]"""
    ...


def engineer(features):
    """Raw [weight, diameter, hue, sugar] in. Out: those four numbers, then
    density = weight / (diameter * diameter * diameter) * 10000, then the three one-hot band columns."""
    ...


X_eng = None     # engineer() applied to every fruit in X_list: a float array of shape (240, 8)


def test_accuracy_with(F, k):
    """k-NN test accuracy using feature table F (one row per fruit, like X or X_eng).
    Fit the scaler on F[train_idx] only, scale F[train_idx] and F[test_idx], vote among the k
    nearest training fruit for every test fruit, and compare with y_test."""
    ...


baseline_accuracy = 0.0      # raw X with k = K
engineered_accuracy = 0.0    # X_eng with k = K`,
      solutionAdd: py`BANDS = ["warm", "green", "purple"]


def colour_band(hue):
    if hue < 35:
        return "warm"
    if hue < 150:
        return "green"
    return "purple"


def one_hot(value, categories):
    return [1.0 if value == category else 0.0 for category in categories]


def engineer(features):
    weight, diameter, hue, sugar = features
    density = weight / (diameter * diameter * diameter) * 10000
    return [weight, diameter, hue, sugar, density] + one_hot(colour_band(hue), BANDS)


X_eng = np.array([engineer(f) for f in X_list], dtype=float)


def test_accuracy_with(F, k):
    centre, spread = fit_scaler(F[train_idx])
    A = apply_scaler(F[train_idx], centre, spread)
    B = apply_scaler(F[test_idx], centre, spread)
    guesses = [knn_classify(A, y_train, q, k) for q in B]
    return accuracy(y_test, guesses)


baseline_accuracy = test_accuracy_with(X, K)
engineered_accuracy = test_accuracy_with(X_eng, K)`,
      explanation:
        "colour_band turns an angle into a named group and one_hot turns that name into 0/1 columns, so a model that only understands numbers can use it. engineer returns the original four features plus the density ratio and the three band columns, always in the same order. test_accuracy_with repeats lesson 7's honest recipe for any feature table: scaler learned on training rows only, then k-NN votes. Running it on X and on X_eng with the same split and the same k makes the comparison fair, so any difference comes from the features alone.",
      hints: [
        { id: "h1", title: "Bands and one-hot", content: 'colour_band: if hue < 35 return "warm"; if hue < 150 return "green"; otherwise return "purple". one_hot: [1.0 if value == category else 0.0 for category in categories].' },
        { id: "h2", title: "engineer", content: "weight, diameter, hue, sugar = features. density = weight / (diameter * diameter * diameter) * 10000. Return [weight, diameter, hue, sugar, density] + one_hot(colour_band(hue), BANDS) (8 numbers). X_eng = np.array([engineer(f) for f in X_list], dtype=float)." },
        { id: "h3", title: "The fair comparison", content: "Inside test_accuracy_with: centre, spread = fit_scaler(F[train_idx]); A = apply_scaler(F[train_idx], centre, spread); B = apply_scaler(F[test_idx], centre, spread); then guesses = [knn_classify(A, y_train, q, k) for q in B] and return accuracy(y_test, guesses)." },
      ],
      tests: [
        {
          id: "t1",
          description: "colour_band names the hue ranges",
          assertionCode: py`
assert colour_band(10) == "warm" and colour_band(34) == "warm", "hues below 35 are 'warm'"
assert colour_band(35) == "green" and colour_band(90) == "green" and colour_band(149) == "green", "hues from 35 up to 149 are 'green'"
assert colour_band(150) == "purple" and colour_band(300) == "purple", "hues from 150 up are 'purple'"
assert BANDS == ["warm", "green", "purple"], "BANDS should be ['warm', 'green', 'purple']"
`,
        },
        {
          id: "t2",
          description: "one_hot switches on exactly one column",
          assertionCode: py`
assert one_hot("green", ["warm", "green", "purple"]) == [0.0, 1.0, 0.0], f"expected [0.0, 1.0, 0.0] but got {one_hot('green', ['warm', 'green', 'purple'])!r}"
assert one_hot("a", ["a", "b"]) == [1.0, 0.0], "the first category should give [1.0, 0.0]"
assert one_hot("zzz", ["a", "b"]) == [0.0, 0.0], "an unknown category switches nothing on"
`,
        },
        {
          id: "t3",
          description: "engineer adds a density ratio and the band columns",
          assertionCode: py`
_e = engineer([160.0, 40.0, 100, 12.0])
assert isinstance(_e, list) and len(_e) == 8, f"engineer should return 8 numbers (4 raw + density + 3 band columns) but returned {_e!r}"
assert _e[:4] == [160.0, 40.0, 100, 12.0], "the first four numbers should be the raw features, unchanged"
assert abs(_e[4] - 25.0) < 1e-9, f"density = 160 / 40^3 * 10000 = 25 but is {_e[4]!r}"
assert _e[5:] == [0.0, 1.0, 0.0], f"a hue of 100 is 'green', so the band columns should be [0, 1, 0] but are {_e[5:]!r}"
assert engineer([100.0, 50.0, 250, 13.0])[5:] == [0.0, 0.0, 1.0] and engineer([100.0, 50.0, 10, 13.0])[5:] == [1.0, 0.0, 0.0], "purple and warm bands should switch on the last and first column"
`,
        },
        {
          id: "t4",
          description: "X_eng is the engineered table for all 240 fruit",
          assertionCode: py`
assert isinstance(X_eng, np.ndarray) and X_eng.shape == (240, 8), f"X_eng should be a (240, 8) array but is {getattr(X_eng, 'shape', None)}"
assert np.allclose(X_eng[:, :4], X), "the first four columns should be the raw features"
assert np.allclose(X_eng[:, 5:].sum(axis=1), 1.0), "exactly one band column should be on for every fruit"
assert np.allclose(X_eng[7], engineer(X_list[7])), "row 7 should be engineer(X_list[7])"
`,
        },
        {
          id: "t5",
          description: "test_accuracy_with is an honest k-NN score for any feature table",
          assertionCode: py`
_a = test_accuracy_with(X, 5)
assert 0.0 <= _a <= 1.0 and type(_a) is float, f"test_accuracy_with should return an accuracy between 0 and 1, but returned {_a!r}"
assert abs(_a - accuracy(y_test, predict_all(Xte, k=5))) < 1e-9, f"on the raw table it must match the lesson 7 pipeline (fit scaler on training fruit only): expected {accuracy(y_test, predict_all(Xte, k=5)):.4f} but got {_a:.4f}"
`,
        },
        {
          id: "t6",
          description: "the engineered features improve the held-out accuracy",
          assertionCode: py`
assert abs(baseline_accuracy - test_accuracy_with(X, K)) < 1e-9, "baseline_accuracy should be test_accuracy_with(X, K)"
assert abs(engineered_accuracy - test_accuracy_with(X_eng, K)) < 1e-9, "engineered_accuracy should be test_accuracy_with(X_eng, K)"
assert engineered_accuracy >= baseline_accuracy, f"inventing density and the colour bands should help the nearest-neighbour vote (baseline {baseline_accuracy:.3f} -> engineered {engineered_accuracy:.3f}). Check your density formula and the band columns"
`,
        },
      ],
      unlocks: ["oa-features"],
      checks: [
        {
          prompt: "A fruit weighs 200 g and is 50 mm across. What is `weight / diameter^3 * 10000`?",
          question: { type: "number", answer: 16 },
          explanation: "50^3 = 125000, and 200 / 125000 * 10000 = 16. Pears score higher than apples on this ratio, which is why the feature separates them.",
        },
        {
          prompt: "Why one-hot encode a colour band instead of numbering it 0, 1, 2?",
          question: {
            type: "choice",
            options: [
              "Numbers would invent an order and spacing between categories that does not exist",
              "Strings are not allowed in NumPy",
              "One-hot columns are always faster",
              "Numbering never works",
            ],
            answer: 0,
          },
          explanation: "With 0, 1, 2 the model would think 'purple' is twice 'green' and that 'warm' is closer to 'green' than to 'purple'. One column per category treats them as equals.",
        },
        {
          prompt: "Which feature would be **leakage**?",
          question: {
            type: "choice",
            options: [
              "A column that is 1 when the fruit's label is 'pear'",
              "weight divided by diameter cubed",
              "A one-hot colour band",
              "Sugar multiplied by 2",
            ],
            answer: 0,
          },
          explanation: "Anything built from the label hands the answer to the model. Honest features come only from measurements available when the fruit arrives, before anyone knows its kind.",
        },
      ],
    },

    // ───────────────────────── 16 ─────────────────────────
    {
      id: "ai-foundations-16-pipeline",
      title: "Capstone: the sorting pipeline",
      minutes: 28,
      xp: 170,
      concepts: ["ML pipeline", "reproducibility", "batch prediction", "end-to-end evaluation", "neural networks preview"],
      learn: md`### From experiments to a machine you can run

You have all the parts. A real machine learning system strings them into a **pipeline** that always runs in the same order:

~~~text
1. split     hold the test fruit back (seeded shuffle)
2. normalise learn the scale from the training fruit, apply it to both parts
3. train     remember the training fruit (k-NN) / fit the weights (regression)
4. evaluate  accuracy and the confusion matrix on the test fruit
5. predict   sort brand-new fruit with the same scaler and model
~~~

Writing the whole thing as **one function** that takes data and a seed is a professional habit. You can rerun it on any batch, with any seed, and get a number you can compare. Reproducibility is what turns "it seemed to work" into evidence.

### A new day, a new batch

Today's model was built from one batch of 240 fruit. Tomorrow the farm delivers a **fresh** batch. If the pipeline still scores well on it, you have a model that survives contact with reality; if not, something about the data has drifted and it is time to investigate. We will call \`read_sensors(seed=99)\` to simulate a new day.

### Decisions in a single call

The belt does not run three models separately. For each fruit it needs everything at once: the kind, whether it is ripe and what to charge. A single \`sort_fruit(features)\` that returns a dict with all of it keeps the rest of the system simple.

### Predicting many fruit together

Hundreds of fruit per second call for a **batch** version. You already have the pieces: scale a whole table in one step, build the neighbour order with broadcasting, then vote. A batch function like \`classify_many\` is much faster than calling \`classify\` in a loop, and it must give *exactly* the same answers.

### What you built, and what is next

Look back at the toolbox: data tables, NumPy, scaling, k-NN, honest splits, confusion matrices, a line and then a plane trained by gradient descent, logistic regression, thresholds, over- and underfitting, engineered features. That is the foundation of practical machine learning.

Here is the bridge to **neural networks**. Your ripeness model computes \`sigmoid(weights . features + bias)\`. That is one **neuron**. A neural network is many of those wired in layers, where the outputs of one layer become the inputs of the next, trained with the same idea you used here: measure a loss, follow its gradient downhill. The extra step, **backpropagation**, just applies the chain rule so the gradient can flow back through every layer. The network then learns its own features instead of relying on hand-made ones like density. That is where this track goes next.

### Common mistakes

- Letting any step see the test fruit before the final evaluation.
- Re-fitting the scaler on each new batch you predict, instead of re-using the one from training.
- Reporting a single lucky split. Re-run with several seeds before you trust a number.
- Different code paths for batch and single predictions that quietly disagree.`,
      mission: md`The belt is ready. Make the final hand-over: one reusable pipeline function that you can test on any batch, and a single call that decides everything about a fruit.

Wire up \`evaluate_pipeline\`, check it on a brand-new batch of fruit, then add \`sort_fruit\` and a fast batch classifier. When this passes, the **Auto-sorter** takes over the belt: every fruit gets its kind, ripeness and price from your code, and the map is drawn by your batch classifier.`,
      tasks: [
        "evaluate_pipeline(batch, seed, k): the whole pipeline on a list of fruit dicts (features, split, scale on training only, k-NN vote) returning {\"accuracy\", \"confusion\", \"train_size\", \"test_size\"}",
        "report = evaluate_pipeline(rows, SEED, K) and fresh_report = evaluate_pipeline(read_sensors(seed=99), SEED, K)",
        "sort_fruit(features): a dict {\"kind\", \"ripe_probability\", \"ripe\", \"price\"} for one raw fruit",
        "classify_many(feature_rows): the kind for every raw fruit in a list, in one go (must match classify)",
        "print a one-line summary that includes your accuracy as a whole-number percentage",
      ],
      starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 16: the finished sorting pipeline. normalise -> train -> evaluate -> predict.


def evaluate_pipeline(batch, seed, k):
    """Run the whole pipeline on a list of fruit dicts (like rows):
      1. X and y from features(row) and label(row)
      2. split_indices(len(X), 0.25, seed)
      3. fit_scaler on the TRAINING rows only; scale both parts
      4. k-NN vote for every test fruit
    Return {"accuracy": ..., "confusion": ..., "train_size": ..., "test_size": ...}."""
    ...


report = {}          # the pipeline on today's batch (rows) with SEED and K
fresh_report = {}    # the same pipeline on a brand-new batch: read_sensors(seed=99)


def sort_fruit(features):
    """Everything the belt needs to know about one raw fruit:
    {"kind": ..., "ripe_probability": ..., "ripe": True/False, "price": ...}.
    Sugar is features[SUGAR]; "ripe" uses RIPE_THRESHOLD."""
    ...


def classify_many(feature_rows):
    """The kind of every fruit in a list of raw [weight, diameter, hue, sugar] lists, in one go:
    scale them all, build neighbour_order(queries, memory_X), then majority-vote the first K of each row."""
    ...


# Announce that the machine is ready, e.g. "Orchard Vision online: 90 percent right on 60 unseen fruit"
`,
      solutionAdd: py`def evaluate_pipeline(batch, seed, k):
    Xb = np.array([features(row) for row in batch], dtype=float)
    yb = np.array([label(row) for row in batch])
    train, test = split_indices(len(Xb), 0.25, seed)
    centre, spread = fit_scaler(Xb[train])
    A = apply_scaler(Xb[train], centre, spread)
    B = apply_scaler(Xb[test], centre, spread)
    guesses = [knn_classify(A, yb[train], q, k) for q in B]
    return {
        "accuracy": accuracy(yb[test], guesses),
        "confusion": confusion_matrix(yb[test], guesses, LABELS),
        "train_size": len(train),
        "test_size": len(test),
    }


report = evaluate_pipeline(rows, SEED, K)
fresh_report = evaluate_pipeline(read_sensors(seed=99), SEED, K)


def sort_fruit(features):
    p = ripe_probability(features[SUGAR])
    return {"kind": classify(features), "ripe_probability": p, "ripe": decide(p, RIPE_THRESHOLD), "price": price_for(features)}


def classify_many(feature_rows):
    Q = apply_scaler(np.array(feature_rows, dtype=float), scaler_mean, scaler_std)
    order = neighbour_order(Q, memory_X)
    return [majority(memory_y[row[:K]]) for row in order]


print("Orchard Vision online:", round(report["accuracy"] * 100), "percent right on", report["test_size"], "unseen fruit")`,
      explanation:
        "evaluate_pipeline is every step of this course in one reusable function: features, a seeded split, a scaler learned from training rows only, then a k-NN vote scored on the held-out rows. Running it on a fresh batch checks that the result was not a one-batch fluke. sort_fruit combines three of your models behind one call, and classify_many does the same job as classify for a whole list by reusing neighbour_order, so it must (and does) agree with the one-at-a-time version. Printing the accuracy as a percentage gives the machine a status line.",
      hints: [
        { id: "h1", title: "One function, every step", content: "Build Xb and yb from the batch with features(row) and label(row). train, test = split_indices(len(Xb), 0.25, seed). Fit the scaler on Xb[train], apply to both parts, vote with knn_classify, and return the four-key dict (use confusion_matrix(..., LABELS))." },
        { id: "h2", title: "sort_fruit", content: 'p = ripe_probability(features[SUGAR]); return {"kind": classify(features), "ripe_probability": p, "ripe": decide(p, RIPE_THRESHOLD), "price": price_for(features)}.' },
        { id: "h3", title: "Batch classification", content: "Q = apply_scaler(np.array(feature_rows, dtype=float), scaler_mean, scaler_std); order = neighbour_order(Q, memory_X); then [majority(memory_y[row[:K]]) for row in order]. Print with print(\"Orchard Vision online:\", round(report[\"accuracy\"] * 100), \"percent right on\", report[\"test_size\"], \"unseen fruit\")." },
      ],
      tests: [
        {
          id: "t1",
          description: "evaluate_pipeline runs the whole pipeline on a batch",
          assertionCode: py`
_r = evaluate_pipeline(rows, SEED, K)
assert isinstance(_r, dict) and set(_r) == {"accuracy", "confusion", "train_size", "test_size"}, f"evaluate_pipeline should return a dict with the keys accuracy, confusion, train_size and test_size but returned {_r!r}"
assert _r["train_size"] == 180 and _r["test_size"] == 60, f"240 fruit with a 25 percent test fraction split into 180 / 60 but got {_r['train_size']} / {_r['test_size']}"
assert sum(sum(_row) for _row in _r["confusion"]) == 60, "the confusion matrix should count all 60 test fruit"
assert 0.7 < _r["accuracy"] <= 1.0, f"the pipeline should classify most test fruit correctly but accuracy is {_r['accuracy']!r}"
assert abs(_r["accuracy"] - sum(_r["confusion"][_i][_i] for _i in range(3)) / 60) < 1e-9, "accuracy should equal the diagonal of the confusion matrix over the test size"
assert evaluate_pipeline(rows, SEED, K) == _r, "the same batch, seed and k must always give the same result"
`,
        },
        {
          id: "t2",
          description: "evaluate_pipeline works on any batch size and does not use globals from training",
          assertionCode: py`
_small = evaluate_pipeline(rows[::2], 3, 3)
assert _small["train_size"] + _small["test_size"] == 120 and _small["test_size"] == 30, f"120 fruit should split 90 / 30 but got {_small['train_size']} / {_small['test_size']}"
assert _small["accuracy"] > 0.6, "even on half the data the pipeline should beat guessing"
_other = evaluate_pipeline(rows, 5, K)
assert _other["test_size"] == 60, "any seed should still give a 180 / 60 split"
`,
        },
        {
          id: "t3",
          description: "report and fresh_report come from the pipeline",
          assertionCode: py`
assert report == evaluate_pipeline(rows, SEED, K), "report should be evaluate_pipeline(rows, SEED, K)"
assert fresh_report == evaluate_pipeline(read_sensors(seed=99), SEED, K), "fresh_report should be evaluate_pipeline(read_sensors(seed=99), SEED, K)"
assert fresh_report["accuracy"] > 0.7, f"the model should also work on a brand-new batch but fresh_report accuracy is {fresh_report['accuracy']!r}"
`,
        },
        {
          id: "t4",
          description: "sort_fruit decides kind, ripeness and price in one call",
          assertionCode: py`
_f = [172.0, 72.0, 50, 15.5]
_s = sort_fruit(_f)
assert isinstance(_s, dict) and set(_s) == {"kind", "ripe_probability", "ripe", "price"}, f"sort_fruit should return a dict with the keys kind, ripe_probability, ripe and price but returned {_s!r}"
assert _s["kind"] == classify(_f), "kind should be what classify() says"
assert abs(_s["ripe_probability"] - ripe_probability(15.5)) < 1e-12, "ripe_probability should come from the ripeness model, using the sugar reading features[SUGAR]"
assert _s["ripe"] is (ripe_probability(15.5) >= RIPE_THRESHOLD), "ripe should be a real bool: whether the probability reaches RIPE_THRESHOLD"
assert abs(_s["price"] - price_for(_f)) < 1e-12 and type(_s["price"]) is float, "price should be price_for(features), a plain float"
assert sort_fruit([66.0, 50.0, 250, 13.0])["kind"] == "plum", "a small purple fruit is a plum"
`,
        },
        {
          id: "t5",
          description: "classify_many agrees with classify on every fruit",
          assertionCode: py`
_batch = X_list[::7]
_got = classify_many(_batch)
assert isinstance(_got, list) and len(_got) == len(_batch), f"classify_many should return one kind per fruit ({len(_batch)}) but returned {len(_got)}"
assert _got == [classify(_f) for _f in _batch], "classify_many must give exactly the same answers as classify, one fruit at a time"
assert all(type(_k) is str for _k in _got), "return plain str kinds"
assert classify_many([[66.0, 50.0, 250, 13.0]]) == ["plum"], "it should also work for a list of just one fruit"
`,
        },
        {
          id: "t6",
          description: "the program announces its accuracy",
          assertionCode: py`
assert __stdout__.strip() != "", "print a status line, for example print('Orchard Vision online:', round(report['accuracy'] * 100), 'percent right on', report['test_size'], 'unseen fruit')"
assert str(round(report["accuracy"] * 100)) in __stdout__, f"the printed line should include your accuracy as a whole-number percentage ({round(report['accuracy'] * 100)}) but the output was {__stdout__!r}"
`,
        },
      ],
      unlocks: ["oa-sorter"],
      checks: [
        {
          prompt: "Why is it important that `evaluate_pipeline` takes the seed as an argument?",
          question: {
            type: "choice",
            options: [
              "So results can be reproduced exactly and compared across runs and batches",
              "To make training faster",
              "Python requires every function to take a seed",
              "To hide the test set",
            ],
            answer: 0,
          },
          explanation: "A seeded pipeline always produces the same split and the same score for the same inputs, so you can compare changes fairly and a colleague can repeat your result.",
        },
        {
          prompt: "A new batch arrives. How should you scale it before predicting?",
          question: {
            type: "choice",
            options: [
              "With the mean and std learned from the training fruit",
              "With the batch's own mean and std",
              "Not at all",
              "With the test set's mean and std",
            ],
            answer: 0,
          },
          explanation: "The model learned what a typical value looks like from the training fruit, so every new fruit must be translated into those same units.",
        },
        {
          prompt: "Your ripeness model computes `sigmoid(w * sugar + b)`. In neural-network language, what is that?",
          question: {
            type: "choice",
            options: ["A single neuron", "A whole network with many layers", "A loss function", "A data set"],
            answer: 0,
          },
          explanation: "A weighted sum passed through an activation function is a neuron. A neural network stacks many of them in layers and trains all the weights with gradient descent.",
        },
      ],
    },
  ],
};
