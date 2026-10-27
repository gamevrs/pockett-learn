import type { Chapter } from "@/engine/types";
import { md, py } from "./util.ts";

/**
 * Chapter 2: Roots. Score the network (softmax + cross-entropy), start it sensibly (initialisation),
 * and learn how blame flows backwards: backprop by hand for one neuron, then vectorised for the
 * two-layer network. The solutions follow the reference program (master_body.py L5..L8) exactly.
 */

export const chapter2: Chapter = {
  id: "roots",
  title: "Roots: loss and gradients",
  blurb: "Score the network, start it sensibly, and learn how blame flows backwards.",
  lessons: [
    // ───────────────────────── 5 ─────────────────────────
    {
      id: "ai-neural-5-softmax",
      title: "Softmax and cross-entropy",
      minutes: 24,
      xp: 110,
      concepts: ["logits", "softmax", "numerical stability", "cross-entropy", "one-hot"],
      learn: md`### Ten scores are not an answer

The last layer of your network hands back ten numbers per picture, one for each digit. People call them **logits**. For the first test glyph, the untrained demo network from lesson 4 gives something like:

~~~text
[-0.29  0.00  0.01 -0.01 -0.17 -0.10  0.44 -0.18  0.05 -0.27]
~~~

The biggest score (the 0.44 in slot 6) is the network's pick, but these numbers are awkward: some are negative, they do not add up to anything in particular, and they do not say how *sure* the network is. To train it we need to talk about probabilities: ten chances that are never negative and share a total of exactly 1.

The function that does this is **softmax**. You met its two-class cousin in Orchard Vision: the sigmoid squashes one score into a number between 0 and 1. Softmax squashes a whole row of scores into a row of chances.

### The recipe

1. Apply \`np.exp\` to every score. The results are always positive, and a bigger score gives a bigger result.
2. Divide each result by the total of its row, so the row adds up to 1.

~~~python
Z = np.array([[2.0, 1.0, 0.0]])
e = np.exp(Z)                          # [[7.389, 2.718, 1.0]]
e / e.sum(axis=1, keepdims=True)       # [[0.665, 0.245, 0.090]]
~~~

Notice what \`exp\` does: a gap of 1 between two scores multiplies the odds by e (about 2.7). Scores are really "log-odds", which is where the name logit comes from.

### The overflow trap

A confident network can produce a score of 1000. Watch what \`exp\` makes of it:

~~~python
np.exp(1000)     # RuntimeWarning: overflow encountered in exp   ->   inf
~~~

\`inf\` divided by \`inf\` is \`nan\` (with \`RuntimeWarning: invalid value encountered in divide\`), and one \`nan\` poisons every number that touches it, including every weight on the next update. The fix is a neat piece of arithmetic: **adding the same number to every score in a row changes nothing**, because \`exp(z - c)\` is \`exp(z) / exp(c)\` and the \`exp(c)\` cancels between the top and the bottom of the fraction. So subtract each row's largest score first:

~~~python
[1000, 1001, 1002]  ->  [-2, -1, 0]      # same probabilities: [0.090, 0.245, 0.665]
~~~

Now the biggest exponent is \`exp(0) = 1\`, so nothing can overflow, and tiny results simply round down to 0.0, which is harmless.

### Rows, axes and keepdims

\`Z\` has shape \`(n, 10)\`: one row per picture. \`Z.max(axis=1)\` takes the maximum along each row and returns shape \`(n,)\`, one number per picture. To subtract it from \`Z\` you need it as a column of shape \`(n, 1)\`, which is what \`keepdims=True\` gives you. Without it:

~~~text
ValueError: operands could not be broadcast together with shapes (8,10) (8,)
~~~

There is a sneakier version. With exactly 10 pictures, the shapes \`(10, 10)\` and \`(10,)\` *do* broadcast, so no error appears, but each column gets the wrong number subtracted. Always keep the dimension.

### Scoring the probabilities: cross-entropy

Say the picture shows a 3 and the network gives the digit 3 a probability of \`p\`. We want a loss that is 0 when \`p = 1\`, grows as \`p\` shrinks, and explodes when the network is confidently wrong. That is \`-ln(p)\`:

~~~text
p on the true digit:   1.0    0.9    0.5    0.25   0.1    0.01
loss  -ln(p):          0.00   0.105  0.693  1.386  2.303  4.605
~~~

Average it over all pictures and you have the **cross-entropy loss**. A network that knows nothing gives every digit 0.1, so its loss is \`-ln(0.1) = ln 10 = 2.3026\`. That number is your reference point: a brand-new network should start near it, a loss of 0.0 on the first step means a bug, and a loss of 40 means the starting scores are far too wild.

To pick the probability of the *true* digit out of each row, use two index lists at once:

~~~python
probs = np.array([[0.7, 0.2, 0.1],
                  [0.1, 0.8, 0.1]])
y = np.array([0, 1])
probs[np.arange(2), y]        # [0.7, 0.8]: row 0 column 0, row 1 column 1
~~~

If a probability is exactly 0, \`np.log(0)\` gives \`-inf\` (with \`RuntimeWarning: divide by zero encountered in log\`). Add a tiny \`1e-12\` inside the log. A true digit with probability 0 then costs about 27.6: huge, but finite.

### One-hot labels

The label 3 can also be written as ten numbers with a single 1.0 in slot 3: \`[0, 0, 0, 1, 0, 0, 0, 0, 0, 0]\`. A whole batch of labels becomes a table the same shape as the probabilities, which makes the next lessons' maths line up. Build it by starting from zeros and setting one entry per row: \`out[np.arange(n), y] = 1.0\`.

### Plain numbers for the stage

The greenhouse stage reads your results as plain numbers and lists. Turn arrays into lists with \`.tolist()\` and NumPy scalars into floats with \`float(...)\`, as you did in lesson 1.

### Common mistakes

- **Skipping the max subtraction.** It works on small examples and then fails with \`nan\` the first time a score is large.
- **Wrong axis.** \`axis=1\` is "along each row". \`axis=0\` normalises each digit across pictures, and the rows no longer add up to 1.
- **Taking the log of the whole probability table** instead of only the true digit's entry.
- **Passing one-hot labels as \`y\`.** In this course \`y\` is a list of whole numbers 0 to 9.
- **Changing \`Z\` in place** with \`Z -= ...\`: the caller's scores silently change.`,
      mission: md`A seedling needs a verdict before it can grow. Right now your network speaks in raw scores; the greenhouse keeper wants ten chances that add up to 1, and one honest number that says how wrong the guess was.

Build softmax, one-hot labels and the cross-entropy loss, then ask the untrained demo network from lesson 4 how wrong it is. It should land near ln 10. When this passes, the **Softmax and loss** panel lights up with the ten probabilities for the first test glyph.`,
      tasks: [
        "softmax(Z): row-wise probabilities, stable even for scores like 1000",
        "one_hot(y, k): one row per label with a 1.0 in the label's column",
        "cross_entropy(probs, y): the mean of -ln(probability of the true digit), with 1e-12 added inside the log",
        "chance_loss: the cross-entropy of demo_params on X_test and y_test",
        "start_probs: the ten probabilities demo_params gives the first test picture, as a plain list",
      ],
      starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 5: softmax and cross-entropy.
#
# The last layer of your network gives ten raw scores per picture (logits).
# Turn them into probabilities, then score those probabilities with the
# loss that classifiers are trained on.


def softmax(Z):
    """Row-wise softmax: every row of scores becomes ten probabilities that add up to 1.
    It must stay finite even for scores like 1000."""
    ...


def one_hot(y, k=N_OUT):
    """Labels [2, 0] with k=3 become [[0, 0, 1], [1, 0, 0]]:
    one row per label, a 1.0 in that label's column, zeros elsewhere."""
    ...


def cross_entropy(probs, y):
    """The average over all rows of -ln(probability given to the TRUE digit)."""
    ...


# The untrained demo network from lesson 4 knows nothing. How wrong is it?
chance_loss = 0.0  # cross_entropy of demo_params on X_test / y_test
start_probs = []   # its ten probabilities for the first test picture, as a plain list`,
      solutionAdd: py`def softmax(Z):
    # subtracting each row's maximum changes no probability but stops exp() from overflowing
    e = np.exp(Z - Z.max(axis=1, keepdims=True))
    return e / e.sum(axis=1, keepdims=True)


def one_hot(y, k=N_OUT):
    out = np.zeros((len(y), k))
    out[np.arange(len(y)), y] = 1.0
    return out


def cross_entropy(probs, y):
    # probs[row, true digit] for every row, then -ln, then the mean
    return float(-np.log(probs[np.arange(len(y)), y] + 1e-12).mean())


chance_loss = cross_entropy(softmax(forward(X_test, demo_params)[2]), y_test)
start_probs = softmax(forward(X_test[:1], demo_params)[2])[0].tolist()`,
      explanation:
        "Softmax exponentiates the scores and divides by the row total. Subtracting the row maximum first is free (the shift cancels) and keeps exp from overflowing, and keepdims=True keeps the maximum as a column so it broadcasts across its row. one_hot builds a table of zeros and writes a single 1.0 per row with two index lists. cross_entropy picks each row's probability for the true digit with probs[np.arange(n), y], takes -ln, and averages; the 1e-12 turns a probability of exactly 0 into a large but finite cost. A network that knows nothing gives every digit about 0.1, so chance_loss lands near ln 10 = 2.30, the number every fresh classifier should start close to.",
      hints: [
        { id: "h1", title: "Stable softmax", content: "Z.max(axis=1, keepdims=True) is each row's biggest score as a column. Compute e = np.exp(Z - that), then divide e by e.sum(axis=1, keepdims=True). Leave out keepdims and the shapes will not line up." },
        { id: "h2", title: "One-hot and the loss", content: "For one_hot start from np.zeros((len(y), k)) and set out[np.arange(len(y)), y] = 1.0. For cross_entropy use the same two-index trick on probs to get one number per row, take np.log of (that + 1e-12), negate, and take the mean. Wrap the answer in float()." },
        { id: "h3", title: "The two published values", content: "The scores come from forward(X_test, demo_params)[2] (the third thing forward returns). chance_loss = cross_entropy(softmax(those scores), y_test). For start_probs use only the first picture, X_test[:1], take row [0] of the softmax and end with .tolist()." },
      ],
      tests: [
        {
          id: "t1",
          description: "softmax turns each row of scores into probabilities, even for scores like 1000",
          assertionCode: py`
_Z = np.array([[2.0, 1.0, 0.0], [0.0, 0.0, 0.0]])
_got = softmax(_Z)
assert _got is not None, "softmax should return the table of probabilities, but it returned None. Did you finish with a return line?"
assert isinstance(_got, np.ndarray) and _got.shape == (2, 3), f"softmax of a 2 x 3 table of scores should be a 2 x 3 array of probabilities, but it returned {_got!r}"
assert np.allclose(_got.sum(axis=1), 1.0), f"every row of probabilities should add up to 1, but the row totals are {_got.sum(axis=1).tolist()}"
assert np.allclose(_got[0], [0.66524, 0.24473, 0.09003], atol=1e-4), f"the scores [2, 1, 0] should become about [0.665, 0.245, 0.090], but softmax gave {np.round(_got[0], 3).tolist()}"
assert np.allclose(_got[1], 1.0 / 3.0), "three equal scores should share the probability equally, [0.333, 0.333, 0.333]"
_big = np.array([[1000.0, 1001.0, 1002.0], [-1000.0, -1001.0, -1002.0]])
_before = _big.copy()
with np.errstate(all="ignore"):
    _huge = softmax(_big)
assert _huge is not None and np.all(np.isfinite(_huge)), "softmax gave nan or inf for scores like 1000. Subtract each row's biggest score before calling np.exp"
assert np.allclose(_huge[0], [0.09003, 0.24473, 0.66524], atol=1e-4), f"the scores [1000, 1001, 1002] should give the same probabilities as [0, 1, 2], about [0.090, 0.245, 0.665], but softmax gave {np.round(_huge[0], 3).tolist()}"
assert np.allclose(_huge[1], [0.66524, 0.24473, 0.09003], atol=1e-4), f"the scores [-1000, -1001, -1002] should give about [0.665, 0.245, 0.090], but softmax gave {np.round(_huge[1], 3).tolist()}"
assert np.array_equal(_big, _before), "softmax changed the table of scores it was given. Build a new array instead of changing Z"
`,
        },
        {
          id: "t2",
          description: "one_hot writes a single 1.0 per row, in the label's column",
          assertionCode: py`
_got = one_hot(np.array([2, 0, 1]), 3)
assert _got is not None, "one_hot should return a table, but it returned None. Did you finish with a return line?"
_got = np.asarray(_got)
assert _got.shape == (3, 3), f"one_hot of 3 labels with k=3 should have shape (3, 3), but its shape is {_got.shape}"
assert np.allclose(_got, [[0, 0, 1], [1, 0, 0], [0, 1, 0]]), f"one_hot([2, 0, 1], 3) should be [[0, 0, 1], [1, 0, 0], [0, 1, 0]], but it gave {_got.tolist()}"
_digits = np.array([9, 0, 4, 4])
_many = np.asarray(one_hot(_digits))
assert _many.shape == (4, 10), f"with the default k the table should have 10 columns, so shape (4, 10), but its shape is {_many.shape}"
assert np.allclose(_many.sum(axis=1), 1.0) and np.array_equal(_many.argmax(axis=1), _digits), "each row should hold exactly one 1.0, sitting in the column of that row's label"
`,
        },
        {
          id: "t3",
          description: "cross_entropy averages -ln of the probability given to the true digit",
          assertionCode: py`
_p = np.array([[0.5, 0.5], [0.25, 0.75]])
_got = cross_entropy(_p, np.array([0, 1]))
assert _got is not None, "cross_entropy should return the loss, but it returned None. Did you finish with a return line?"
assert np.ndim(_got) == 0, "cross_entropy should return ONE number, the average over all pictures, not a list or a table"
assert abs(float(_got) - 0.49041) < 1e-3, f"the true digits got probabilities 0.5 and 0.75, so the loss should be (-ln 0.5 - ln 0.75) / 2 = 0.490, but cross_entropy returned {float(_got):.3f}"
_flat = cross_entropy(np.full((4, 10), 0.1), np.array([0, 3, 5, 9]))
assert abs(float(_flat) - np.log(10)) < 1e-6, f"giving every digit probability 0.1 should cost ln 10 = 2.3026, but cross_entropy returned {float(_flat):.4f}"
_sure = cross_entropy(np.array([[1.0, 0.0], [0.0, 1.0]]), np.array([0, 1]))
assert abs(float(_sure)) < 1e-6, f"a network that is certain and right should have a loss of about 0, but cross_entropy returned {float(_sure):.4f}"
with np.errstate(all="ignore"):
    _wrong = cross_entropy(np.array([[1.0, 0.0]]), np.array([1]))
assert np.isfinite(_wrong) and float(_wrong) > 20, "a probability of exactly 0 on the true digit should cost a lot (about 27.6) but not infinity. Add 1e-12 inside the log"
`,
        },
        {
          id: "t4",
          description: "chance_loss is near ln 10 and start_probs is a plain list of ten probabilities",
          assertionCode: py`
assert isinstance(chance_loss, float) and 2.2 <= chance_loss <= 2.5, f"chance_loss should be about 2.3 (ln 10), the loss of the untrained demo network, but it is {chance_loss!r}"
_want = cross_entropy(softmax(forward(X_test, demo_params)[2]), y_test)
assert _want is not None, "cross_entropy returned None, so chance_loss cannot be checked yet"
assert abs(chance_loss - float(_want)) < 1e-6, "chance_loss should be the cross-entropy of demo_params on ALL of X_test with the labels y_test"
assert isinstance(start_probs, list) and len(start_probs) == 10, f"start_probs should be a plain list of 10 probabilities (end with .tolist()), but it is {start_probs!r}"
assert abs(sum(start_probs) - 1.0) < 1e-6, f"the ten probabilities should add up to 1, but they add up to {sum(start_probs):.4f}"
_row = softmax(forward(X_test[:1], demo_params)[2])
assert _row is not None and np.allclose(start_probs, _row[0]), "start_probs should be the softmax of demo_params's scores for the FIRST test picture, X_test[:1]"
`,
        },
      ],
      unlocks: ["gn-softmax"],
      checks: [
        {
          prompt: "A network gives the true digit a probability of 0.25. What is the cross-entropy loss for that picture? (Use the natural logarithm: loss = -ln(p).)",
          question: { type: "number", answer: 1.386, tolerance: 0.01 },
          explanation: "-ln(0.25) = ln 4 = 1.386. A coin-flip-sure guess (0.5) would cost 0.693 and a guess of 0.1 costs 2.303, so the loss climbs quickly as the true digit is given less and less of the probability.",
        },
        {
          prompt: "Why do we subtract each row's largest score before calling `np.exp` in softmax?",
          question: {
            type: "choice",
            options: [
              "The probabilities come out the same, but exp can no longer overflow to inf",
              "It makes the probabilities add up to 1",
              "It makes the biggest score win",
              "It removes negative scores",
            ],
            answer: 0,
            feedback: {
              1: "Dividing by the row total is what makes the probabilities add up to 1. The subtraction does something else.",
              2: "The biggest score already wins before the shift. The shift keeps all the probabilities exactly as they were.",
              3: "Shifting by the maximum actually makes every score zero or negative. The point is the size of the numbers going into exp.",
            },
          },
          explanation: "exp(z - c) = exp(z) / exp(c), and the exp(c) cancels between the numerator and the denominator, so the probabilities do not change. After the shift the largest exponent is exp(0) = 1, so nothing overflows.",
        },
      ],
    },

    // ───────────────────────── 6 ─────────────────────────
    {
      id: "ai-neural-6-init",
      title: "Seed weights: initialisation",
      minutes: 26,
      xp: 115,
      concepts: ["initialisation", "symmetry breaking", "He and Xavier scales", "seeded random numbers", "signal variance"],
      learn: md`### The first numbers matter

Training nudges weights downhill, but it has to start somewhere, and some starting points can never learn at all. Choosing them is a small decision with a big effect, so it gets its own lesson.

### Why not all zeros?

Zero feels like the neutral choice. Picture two hidden sprouts with identical weights. They compute identical outputs, so they receive identical blame, so they are updated by identical amounts. They stay twins forever, and a hidden layer of 24 twins is really a hidden layer of one. This is the **symmetry** problem.

With ReLU, all zeros is even worse. Every weight is 0, so every \`Z1\` is 0, and \`relu(0)\` is 0, so the hidden activations are all 0. The gradient for \`W2\` is built from those activations (zero), and the blame sent back to the hidden layer travels through \`W2\` (zero). Nothing in the weights moves. Only \`b2\` learns, which amounts to discovering how common each digit is.

The cure for symmetry is **randomness**: give every weight a different random starting value and the sprouts differ from the first step. Biases can start at zero, because the weights have already broken the tie.

### Seeded random numbers

Random does not mean unpredictable here. \`np.random.RandomState(seed)\` makes a generator whose stream of numbers is completely determined by the seed:

~~~python
rng = np.random.RandomState(3)
rng.randn(2, 3)        # six bell-curve numbers (mean 0, spread 1): same six every time
~~~

Same seed, same weights, same training run, which is what makes your results reproducible and lets a test recompute them. Create the generator **once** at the top of the function and draw \`W1\` first and \`W2\` second from it. If you make a fresh \`RandomState(seed)\` for each matrix, both draw the same first numbers and the layers become correlated. (Avoid \`np.random.randn\` without a generator: its hidden shared state ruins reproducibility.) \`randn\` takes the sizes as separate arguments: \`rng.randn(100, 24)\`. Passing a tuple gives \`TypeError: 'tuple' object cannot be interpreted as an integer\`.

### How big should random be?

\`randn\` has spread 1. Multiply by a **scale** to choose the spread of your weights, and watch what happens to the signal passing through the layers.

- **Too tiny** (scale 0.01): a hidden unit adds up 100 small products, so the hidden activations have a spread of only about 0.019, and after the second layer the ten scores differ by about 0.001. Softmax gives every digit about 0.1, the loss sits at 2.303, and the gradients are tiny too, because they are built from those tiny activations. In a deeper net the signal shrinks again at every layer until nothing is left.
- **Too big** (scale 1): the hidden spread is about 1.9 and the ten scores spread by around 8 or 9. Softmax becomes almost one-hot, so the network starts out *confidently wrong* and the loss is in the teens. Overconfident numbers are hard to train from.

The goal is a layer that passes a signal on at about the size it received.

### The rule behind He and Xavier

A hidden unit adds up \`n_in\` products of an input and a weight. If the weights have spread \`s\` and the average squared input is \`q\`, the total has a variance of about \`n_in * q * s^2\`. To keep the output about as lively as the input, \`s^2\` should be about \`1 / n_in\`.

ReLU then switches off every negative value, which cuts the average squared activation roughly in half. Doubling the variance pays that back:

- **He initialisation** (made for ReLU): spread \`sqrt(2 / fan_in)\`, where \`fan_in\` is the number of inputs feeding the layer. For \`W1\` that is 100, giving 0.141. For \`W2\` it is 24, giving 0.289.
- **Xavier (Glorot) initialisation**: spread \`sqrt(2 / (fan_in + fan_out))\`. It compromises between keeping the forward signal steady and keeping the backward gradient steady. For \`W1\` that is \`sqrt(2 / 124) = 0.127\`; for \`W2\`, \`sqrt(2 / 34) = 0.243\`. It was designed for symmetric activations like tanh and works fine here too.

You will write all four schemes: \`zeros\`, \`tiny\` (scale 0.01 everywhere), \`xavier\` and \`he\`.

### Measuring the signal

Rules are easier to believe when you can see them. \`signal_report(params, X)\` runs real pictures forward through a network and reports three numbers: the spread (\`.std()\`) of the hidden activations \`H\`, the spread of the output scores, and how many hidden units are genuinely **different**. The last one counts distinct columns of \`Z1\`:

~~~python
np.unique(np.round(Z1, 9), axis=1).shape[1]
~~~

Rounding hides floating-point dust, and \`np.unique(..., axis=1)\` keeps one copy of each distinct column. Twins collapse to one; zeros give exactly 1. Wrap the numbers in \`float(...)\` and \`int(...)\` so the stage can show them.

If you swap \`n_in\` and \`n_hidden\` anywhere you will meet the shape complaint again: \`ValueError: matmul: Input operand 1 has a mismatch in its core dimension 0, with gufunc signature (n?,k),(k,m?)->(n?,m?) (size 100 is different from 24)\`. \`W1\` must be \`(n_in, n_hidden)\`: rows for the inputs, columns for the sprouts.

### Common mistakes

- **Using \`fan_out\` for He.** He uses only the number of inputs: \`sqrt(2 / n_in)\` for \`W1\`, \`sqrt(2 / n_hidden)\` for \`W2\`.
- **Two generators** with the same seed for \`W1\` and \`W2\`.
- **Scaling the biases** or making them random. Zero is fine and keeps the signal numbers easy to read.
- **Forgetting the draw order**: \`W1\` first, then \`W2\`. The test recomputes your weights, so reversing them fails.`,
      mission: md`Every sprout in the greenhouse starts from a seed, and a bad seed bed is a quiet disaster: a bed of identical twins that never differ, or a signal that fades to nothing. You will write the planting function with four ways of choosing starting weights and a small instrument that measures what each one does to the signal.

When this passes, the **Seed weights** panel lights up with the report for all four schemes, and the stage draws your new He-initialised network (seed 3), the one you will grow for the rest of the course.`,
      tasks: [
        "init_params(n_in, n_hidden, n_out, seed, scheme): a dict of W1, b1, W2, b2. Draw W1 then W2 from one RandomState(seed); biases start at zero. Schemes: zeros, tiny (0.01), xavier, he",
        "signal_report(params, X): a dict with hidden_std, logit_std (floats) and distinct_units (an int)",
        "init_report: signal_report for each scheme in SCHEMES (seed 3) on X_train",
        "params: the He-initialised network with seed 3, the one you will train",
        "net_view: params_to_lists(params), so the stage draws your new network",
      ],
      starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 6: seed weights. Where should learning start?

SCHEMES = ["zeros", "tiny", "xavier", "he"]  # provided


def init_params(n_in, n_hidden, n_out, seed, scheme="he"):
    """Fresh parameters as a dict {"W1", "b1", "W2", "b2"}.
    W1 has shape (n_in, n_hidden), W2 has shape (n_hidden, n_out), biases start at zero.
    Draw W1 first and then W2 from ONE np.random.RandomState(seed) with randn, times a scale:
      zeros:  scale 0 for both        tiny:  0.01 for both
      xavier: sqrt(2 / (fan_in + fan_out)) for each layer
      he:     sqrt(2 / fan_in) for each layer"""
    ...


def signal_report(params, X):
    """Run X forward and return a dict:
      "hidden_std":     float, the spread (.std()) of the hidden activations H
      "logit_std":      float, the spread of the output scores
      "distinct_units": int, how many different columns Z1 has (twins count once)"""
    ...


init_report = {}  # signal_report of each scheme in SCHEMES: seed 3, measured on X_train
params = {}       # the network we will grow: He scheme, seed 3
net_view = {}     # params_to_lists(params), so the stage draws your new network`,
      solutionAdd: py`SCHEMES = ["zeros", "tiny", "xavier", "he"]


def init_params(n_in, n_hidden, n_out, seed, scheme="he"):
    rng = np.random.RandomState(seed)  # ONE generator: W1 is drawn first, then W2
    if scheme == "zeros":
        s1, s2 = 0.0, 0.0
    elif scheme == "tiny":
        s1, s2 = 0.01, 0.01
    elif scheme == "xavier":
        s1, s2 = np.sqrt(2.0 / (n_in + n_hidden)), np.sqrt(2.0 / (n_hidden + n_out))
    else:  # "he": keep the signal steady through ReLU
        s1, s2 = np.sqrt(2.0 / n_in), np.sqrt(2.0 / n_hidden)
    return {
        "W1": rng.randn(n_in, n_hidden) * s1,
        "b1": np.zeros(n_hidden),
        "W2": rng.randn(n_hidden, n_out) * s2,
        "b2": np.zeros(n_out),
    }


def signal_report(params, X):
    Z1, H, Z2 = forward(X, params)
    # twins have identical columns in Z1, and np.unique keeps one copy of each
    distinct = np.unique(np.round(Z1, 9), axis=1).shape[1]
    return {"hidden_std": float(H.std()), "logit_std": float(Z2.std()), "distinct_units": int(distinct)}


init_report = {s: signal_report(init_params(N_IN, N_HIDDEN, N_OUT, 3, s), X_train) for s in SCHEMES}
params = init_params(N_IN, N_HIDDEN, N_OUT, 3, "he")
net_view = params_to_lists(params)`,
      explanation:
        "init_params makes one RandomState and draws W1 and then W2 from it, multiplying standard bell-curve numbers by a per-layer scale: 0 for zeros, 0.01 for tiny, sqrt(2 / (fan_in + fan_out)) for Xavier and sqrt(2 / fan_in) for He. Biases stay zero because the random weights already break the symmetry. signal_report pushes real pictures through forward and measures the spread of H and of the output scores, and np.unique on the rounded columns of Z1 counts how many hidden units are genuinely different: 1 for zeros (all twins), 24 for the random schemes. The report shows the point of the lesson: tiny weights make the signal fade (hidden spread about 0.02, scores about 0.001), while He and Xavier keep it lively (hidden spread about 0.24 to 0.26, scores about 0.4 to 0.5).",
      hints: [
        { id: "h1", title: "One generator, two matrices", content: "Start with rng = np.random.RandomState(seed). Pick the two scales with an if / elif chain on scheme, then build W1 = rng.randn(n_in, n_hidden) * s1 and W2 = rng.randn(n_hidden, n_out) * s2 (in that order), plus b1 = np.zeros(n_hidden) and b2 = np.zeros(n_out)." },
        { id: "h2", title: "The signal report", content: "Z1, H, Z2 = forward(X, params). hidden_std is float(H.std()), logit_std is float(Z2.std()), and distinct_units is int(np.unique(np.round(Z1, 9), axis=1).shape[1])." },
        { id: "h3", title: "The published values", content: "init_report = {s: signal_report(init_params(N_IN, N_HIDDEN, N_OUT, 3, s), X_train) for s in SCHEMES}. params = init_params(N_IN, N_HIDDEN, N_OUT, 3, 'he'). net_view = params_to_lists(params)." },
      ],
      tests: [
        {
          id: "t1",
          description: "init_params returns W1, b1, W2, b2 with the right shapes and zero biases for every scheme",
          assertionCode: py`
for _s in ["zeros", "tiny", "xavier", "he"]:
    _p = init_params(6, 4, 3, 0, _s)
    assert isinstance(_p, dict) and set(_p) == {"W1", "b1", "W2", "b2"}, f"init_params(6, 4, 3, 0, '{_s}') should return a dict with the keys W1, b1, W2, b2, but it returned {_p!r}"
    _shapes = {k: tuple(np.shape(v)) for k, v in _p.items()}
    assert _shapes == {"W1": (6, 4), "b1": (4,), "W2": (4, 3), "b2": (3,)}, f"with n_in=6, n_hidden=4, n_out=3 the shapes should be W1 (6, 4), b1 (4,), W2 (4, 3), b2 (3,), but they are {_shapes}"
    assert not np.any(_p["b1"]) and not np.any(_p["b2"]), "the biases should start at zero"
_default = init_params(8, 5, 3, 1)
_he = init_params(8, 5, 3, 1, "he")
assert isinstance(_default, dict) and np.allclose(_default["W1"], _he["W1"]), "when no scheme is given, init_params should use the 'he' scheme"
`,
        },
        {
          id: "t2",
          description: "each scheme has the right spread, and the same seed always gives the same weights",
          assertionCode: py`
_z = init_params(100, 24, 10, 3, "zeros")
assert isinstance(_z, dict) and not np.any(_z["W1"]) and not np.any(_z["W2"]), "the 'zeros' scheme should make every weight exactly 0"
_t = init_params(100, 24, 10, 3, "tiny")
assert abs(float(_t["W1"].std()) - 0.01) < 0.002 and abs(float(_t["W2"].std()) - 0.01) < 0.002, "the 'tiny' scheme should use weights with a spread of about 0.01 in both layers"
_x = init_params(100, 24, 10, 3, "xavier")
assert abs(float(_x["W1"].std()) - np.sqrt(2 / 124)) < 0.15 * np.sqrt(2 / 124), f"Xavier W1 should have a spread near sqrt(2 / (100 + 24)) = {np.sqrt(2 / 124):.3f}, but its spread is {float(_x['W1'].std()):.3f}"
assert abs(float(_x["W2"].std()) - np.sqrt(2 / 34)) < 0.15 * np.sqrt(2 / 34), f"Xavier W2 should have a spread near sqrt(2 / (24 + 10)) = {np.sqrt(2 / 34):.3f}, but its spread is {float(_x['W2'].std()):.3f}"
_a = init_params(100, 24, 10, 3, "he")
assert abs(float(_a["W1"].std()) - np.sqrt(2 / 100)) < 0.1 * np.sqrt(2 / 100), f"He W1 should have a spread near sqrt(2 / 100) = {np.sqrt(2 / 100):.3f}, but its spread is {float(_a['W1'].std()):.3f}"
assert abs(float(_a["W2"].std()) - np.sqrt(2 / 24)) < 0.15 * np.sqrt(2 / 24), f"He W2 should have a spread near sqrt(2 / 24) = {np.sqrt(2 / 24):.3f}, but its spread is {float(_a['W2'].std()):.3f}"
_b = init_params(100, 24, 10, 3, "he")
_c = init_params(100, 24, 10, 4, "he")
assert np.array_equal(_a["W1"], _b["W1"]) and np.array_equal(_a["W2"], _b["W2"]), "the same seed should give exactly the same weights every time"
assert not np.allclose(_a["W1"], _c["W1"]), "a different seed should give different weights"
_rng = np.random.RandomState(3)
_w1 = _rng.randn(100, 24) * np.sqrt(2.0 / 100)
_w2 = _rng.randn(24, 10) * np.sqrt(2.0 / 24)
assert np.allclose(_a["W1"], _w1) and np.allclose(_a["W2"], _w2), "draw the weights from ONE np.random.RandomState(seed): W1 = randn(n_in, n_hidden) first, then W2 = randn(n_hidden, n_out), each times its own scale"
`,
        },
        {
          id: "t3",
          description: "signal_report measures the spread of the hidden units and scores, and counts distinct units",
          assertionCode: py`
_X = np.array([[1.0, 1.0], [1.0, -1.0]])
_twins = {"W1": np.array([[1.0, 1.0], [2.0, 2.0]]), "b1": np.zeros(2), "W2": np.eye(2), "b2": np.zeros(2)}
_got = signal_report(_twins, _X)
assert isinstance(_got, dict) and set(_got) == {"hidden_std", "logit_std", "distinct_units"}, f"signal_report should return a dict with the keys hidden_std, logit_std and distinct_units, but it returned {_got!r}"
assert abs(_got["hidden_std"] - 1.5) < 1e-6, f"for this tiny network the hidden activations are 3, 3, 0, 0, whose spread is 1.5, but hidden_std is {_got['hidden_std']!r}"
assert abs(_got["logit_std"] - 1.5) < 1e-6, f"for this tiny network the output scores are 3, 3, 0, 0 as well, so logit_std should be 1.5, but it is {_got['logit_std']!r}"
assert _got["distinct_units"] == 1, f"both hidden units have identical weights, so there is only 1 distinct unit, but distinct_units is {_got['distinct_units']!r}"
_apart = {"W1": np.eye(2), "b1": np.zeros(2), "W2": np.eye(2), "b2": np.zeros(2)}
_got2 = signal_report(_apart, _X)
assert abs(_got2["hidden_std"] - 0.4330127) < 1e-5, f"here the hidden activations are 1, 1, 1, 0 (spread 0.433), but hidden_std is {_got2['hidden_std']!r}"
assert _got2["distinct_units"] == 2, f"these two hidden units behave differently, so distinct_units should be 2, but it is {_got2['distinct_units']!r}"
assert type(_got["hidden_std"]) is float and type(_got["logit_std"]) is float, "hidden_std and logit_std should be plain floats: wrap them in float(...)"
assert type(_got["distinct_units"]) is int, "distinct_units should be a plain whole number: wrap it in int(...)"
`,
        },
        {
          id: "t4",
          description: "init_report compares the four schemes, params is the He network (seed 3), and net_view shows it",
          assertionCode: py`
assert isinstance(init_report, dict) and set(init_report) == set(SCHEMES), f"init_report should have one entry for each scheme in SCHEMES, but its keys are {list(init_report) if isinstance(init_report, dict) else init_report!r}"
assert init_report["zeros"]["distinct_units"] == 1, "with all-zero weights every hidden unit is a twin, so distinct_units for 'zeros' should be 1"
assert init_report["he"]["distinct_units"] == 24, "with random weights all 24 hidden units should differ, so distinct_units for 'he' should be 24"
assert abs(init_report["zeros"]["hidden_std"]) < 1e-12 and abs(init_report["zeros"]["logit_std"]) < 1e-12, "all-zero weights send no signal at all, so both spreads for 'zeros' should be 0"
assert init_report["tiny"]["hidden_std"] < init_report["he"]["hidden_std"], "tiny weights should leave a weaker hidden signal than He weights (hidden_std tiny < he)"
assert init_report["tiny"]["logit_std"] < init_report["he"]["logit_std"], "tiny weights should leave weaker output scores than He weights"
for _s in SCHEMES:
    _want = signal_report(init_params(N_IN, N_HIDDEN, N_OUT, 3, _s), X_train)
    assert _want is not None and isinstance(init_report[_s], dict), f"init_report['{_s}'] should be a dict made by signal_report"
    for _k in _want:
        assert abs(init_report[_s][_k] - _want[_k]) < 1e-9, f"init_report['{_s}']['{_k}'] should be {_want[_k]!r} (seed 3, measured on X_train), but it is {init_report[_s].get(_k)!r}"
_ref = init_params(N_IN, N_HIDDEN, N_OUT, 3, "he")
assert isinstance(params, dict) and set(params) == {"W1", "b1", "W2", "b2"}, "params should be the dict made by init_params(N_IN, N_HIDDEN, N_OUT, 3, 'he')"
assert all(np.allclose(params[_k], _ref[_k]) for _k in _ref), "params should be init_params(N_IN, N_HIDDEN, N_OUT, 3, 'he'): He scheme and seed 3"
assert isinstance(net_view, dict) and set(net_view) == {"W1", "b1", "W2", "b2"} and isinstance(net_view["W1"], list), "net_view should be params_to_lists(params): a dict of plain lists"
assert net_view == params_to_lists(params), "net_view should describe the new params, so use params_to_lists(params)"
`,
        },
      ],
      unlocks: ["gn-init"],
      checks: [
        {
          prompt: "Why does a network whose weights all start at exactly 0 fail to learn properly, even when the training code is perfect?",
          question: {
            type: "choice",
            options: [
              "Every hidden unit stays an identical twin of the others (and with ReLU the hidden layer is all zeros, so almost nothing moves)",
              "Zero is not a valid number to multiply by",
              "The loss would be exactly 0",
              "NumPy cannot store zeros in float arrays",
            ],
            answer: 0,
            feedback: {
              1: "Multiplying by zero is fine. The trouble is what happens to the updates: identical weights get identical updates.",
              2: "The loss is not 0: the network still guesses, and that guess has a cost. The problem is that it cannot improve.",
              3: "Zeros are perfectly valid float values. The problem is symmetry between the units.",
            },
          },
          explanation: "Identical weights give identical outputs, identical blame and identical updates, so the units never become different. With ReLU it is worse: relu(0) = 0, so the gradients for both layers are zero apart from the bias of the last layer.",
        },
        {
          prompt: "A layer takes 50 inputs and uses He initialisation. What spread (standard deviation) should its weights have?",
          question: { type: "number", answer: 0.2, tolerance: 0.003 },
          explanation: "He uses sqrt(2 / fan_in) = sqrt(2 / 50) = sqrt(0.04) = 0.2. The factor 2 pays back the half of the signal that ReLU switches off.",
        },
      ],
    },

    // ───────────────────────── 7 ─────────────────────────
    {
      id: "ai-neural-7-chain",
      title: "Backprop by hand: one neuron",
      minutes: 32,
      xp: 130,
      concepts: ["chain rule", "computation graph", "local derivatives", "gradient of a neuron", "gradient descent step"],
      learn: md`### The question backprop answers

After a forward pass you have one number, the loss. For every weight you want one more number: *if I nudge this weight up a hair, does the loss rise or fall, and how fast?* That slope is the weight's **gradient**, and gradient descent (Orchard Vision) subtracts a small multiple of it.

On a line fit you had two parameters, so you could nudge each one and measure. Layer 1 of your network has 2,400 weights; nudging each one separately would cost 2,400 extra forward passes for every single step. **Backpropagation** produces every slope for roughly the price of one extra pass, using nothing more than the chain rule from school. This lesson does it for a single neuron, by hand, so you can see every factor. Lesson 8 repeats it for whole layers.

### The neuron as a chain of small steps

Write the neuron's work as a chain, one tiny function per arrow:

~~~text
x, w, b   ->   z = w . x + b   ->   a = sigmoid(z)   ->   loss = (a - t)^2
~~~

\`x\` is one picture (100 pixels), \`t\` is the target: 1.0 if the picture is a one, 0.0 if not. Squared error keeps this lesson's arithmetic small; the network proper will use cross-entropy.

Every arrow has a **local slope**: how much its output moves when its input moves.

- loss = (a - t)^2, so the slope with respect to \`a\` is \`2 * (a - t)\`. We call it \`dloss_da\`.
- a = sigmoid(z), so the slope with respect to \`z\` is \`a * (1 - a)\`. This is the \`d_sigmoid\` of lesson 3, written with the \`a\` we already have. We call it \`da_dz\`.
- z = w . x + b, so the slope with respect to \`w_i\` is \`x_i\`, and with respect to \`b\` it is 1.

### The chain rule: multiply along the path

How much does the loss care about \`w_i\`? Think of gears. Turning \`w_i\` by 1 turns \`z\` by \`x_i\`; turning \`z\` by 1 turns \`a\` by \`da_dz\`; turning \`a\` by 1 turns the loss by \`dloss_da\`. The total effect is the **product** of the slopes along the path:

~~~text
dloss_dw_i = dloss_da * da_dz * x_i
~~~

Give the first two factors a name, \`dz = dloss_da * da_dz\` ("how much the loss cares about z"). Then the whole gradient is just \`dw = dz * x\` and \`db = dz\`. Rule of thumb: **multiply along a path, add across paths**. If a value feeds into several places, you add up the effect of each route. Today there is one route; in lesson 8 each hidden unit feeds ten outputs, and the adding will matter.

### A worked example with tiny numbers

Take \`x = [1, 2]\`, \`w = [0.5, -0.25]\`, \`b = 0.1\` and target \`t = 1\`:

~~~text
z        = 0.5*1 + (-0.25)*2 + 0.1 = 0.1
a        = sigmoid(0.1)            = 0.525
loss     = (0.525 - 1)^2           = 0.226
dloss_da = 2 * (0.525 - 1)         = -0.950
da_dz    = 0.525 * (1 - 0.525)     = 0.249
dz       = -0.950 * 0.249          = -0.237
dw       = dz * [1, 2]             = [-0.237, -0.474]
db       = dz                      = -0.237
~~~

Read the signs. A negative gradient means "raising this weight lowers the loss", and gradient descent does \`w - lr * dw\`, which raises it. That is sensible: the target was 1 but the neuron said 0.525, so it wants a larger output, and with positive inputs larger weights give that. The second weight gets *twice* the blame of the first because its input was twice as big. A weight is blamed in proportion to the input it saw: if a pixel is 0 (blank paper), its weight gets zero gradient from that picture, whatever else happens.

One step with \`lr = 0.5\` moves the weights to about \`[0.618, -0.013]\` and the bias to 0.218. The new \`z\` is 0.811, \`a\` is 0.692, and the loss has fallen from 0.226 to about 0.095.

### A whole batch at once

With a table \`X\` of shape \`(n, 100)\` and targets \`t\` of shape \`(n,)\`, the same chain runs for every picture at once, and the gradients are averaged because the loss is a mean:

~~~python
a  = sigmoid(X @ w + b)             # n outputs
dz = 2 * (a - t) * a * (1 - a)      # n numbers: the chain, vectorised
dw = X.T @ dz / len(X)              # (100, n) @ (n,) -> (100,)
db = dz.mean()
~~~

\`X.T @ dz\` computes, for each pixel, the sum over pictures of "pixel value times how much that picture cares". Forget the \`.T\` and NumPy objects:

~~~text
ValueError: matmul: Input operand 1 has a mismatch in its core dimension 0, with gufunc signature (n?,k),(k,m?)->(n?,m?) (size 1200 is different from 100)
~~~

### Why such a big learning rate?

\`a * (1 - a)\` is never more than 0.25, and squared error multiplies in more small factors, so these gradients are small and a learning rate of 3.0 is reasonable here. There is also a trap hiding in the chain: when the neuron is confidently *wrong* (say \`a\` is 0.99 but \`t\` is 0), \`a * (1 - a)\` is nearly 0, so the gradient almost vanishes exactly when the neuron most needs to change. Softmax with cross-entropy, coming in lesson 8, avoids this.

### Teaching a neuron to spot ones

Zero starting weights are fine for a *single* neuron: there is no twin to be identical to, and the gradient uses the pixels \`x\`, not the weights. Train from zeros against the target "is this a one?" and look at the learned weights as a 10 by 10 picture: bright where ink says "one", dark where ink says "not a one". Use \`.tolist()\` for the picture and plain floats for the loss list, so the stage can draw them.

### Common mistakes

- **Dropping a factor.** Leaving out \`da_dz\` gives the gradient for a different function, and training still "kind of" works, which hides the bug. Lesson 9 builds a proper detector for this.
- **Wrong sign on the update.** Descent is \`w - lr * dw\`.
- **Using \`z\` where \`a\` belongs** in \`a * (1 - a)\`.
- **Forgetting to divide by \`n\`**, which scales every gradient by the batch size.
- **Updating with \`w -= ...\`** inside a helper: that edits the caller's array in place.`,
      mission: md`One sprout, one question: *is this glyph a one?* Before the greenhouse can grow a whole network, you will make a single neuron learn by working out its gradient yourself, link by link: where the blame starts, how it is multiplied along the chain, and how it ends up on each pixel's weight.

When this passes, the **Chain rule graph** lights up: the neuron's computation graph for a real "1" picture, values flowing forward, blame flowing back, and the weights your neuron learned drawn as a picture.`,
      tasks: [
        "neuron_forward(x, w, b): return (z, a) as plain floats, with a = sigmoid(z)",
        "chain_terms(x, w, b, t): a dict with z, a, loss (a - t squared), dloss_da and da_dz",
        "neuron_gradients(X, t, w, b): the batch-averaged (dw, db) for squared error, using the chain by hand",
        "train_neuron(X, t, w, b, lr, steps): repeat the step and return (w, b, losses)",
        "chain_report, is_one, then train from zeros (lr 3.0, 60 steps) into neuron_w, neuron_b, neuron_losses and neuron_image (10 x 10 list)",
      ],
      starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 7: backpropagation for one sigmoid neuron, chain rule by hand.
# Loss for one picture: (a - t) ** 2, where a = sigmoid(x . w + b) and t is the target.
# Use sigmoid from lesson 3.


def neuron_forward(x, w, b):
    """For one picture x (a vector): return (z, a) as plain floats,
    z = x . w + b and a = sigmoid(z)."""
    ...


def chain_terms(x, w, b, t):
    """Every piece of the chain for one picture and target t, as a dict with the keys:
      "z", "a", "loss" (= (a - t) ** 2), "dloss_da" (= 2 * (a - t)), "da_dz" (= a * (1 - a))"""
    ...


def neuron_gradients(X, t, w, b):
    """Gradients of the MEAN squared error over the whole batch X (n x pixels), targets t (n,).
    Return (dw, db): dw has the shape of w, db is a single number."""
    ...


def train_neuron(X, t, w, b, lr, steps):
    """Repeat 'compute gradients, then step downhill' for the given number of steps.
    Return (w, b, losses): the trained weights and bias, and the mean squared error after every step."""
    ...


one_idx = int(np.where(y_train == 1)[0][0])  # the first "1" in the training set (provided)

chain_report = {}                 # chain_terms for X_train[one_idx] with stem_w, STEM_BIAS and target 1.0
is_one = np.zeros(len(y_train))   # the target: 1.0 where the digit is 1, otherwise 0.0
neuron_w, neuron_b, neuron_losses = np.zeros(N_IN), 0.0, []  # train from zeros: lr 3.0, 60 steps
neuron_image = []                 # neuron_w as a 10 x 10 list`,
      solutionAdd: py`def neuron_forward(x, w, b):
    z = float(np.dot(x, w) + b)
    return z, float(sigmoid(z))


def chain_terms(x, w, b, t):
    z, a = neuron_forward(x, w, b)
    return {
        "z": z,
        "a": a,
        "loss": (a - t) ** 2,
        "dloss_da": 2.0 * (a - t),   # how the loss reacts to a
        "da_dz": a * (1.0 - a),      # how a reacts to z (the sigmoid's slope)
    }


def neuron_gradients(X, t, w, b):
    a = sigmoid(X @ w + b)
    dz = 2.0 * (a - t) * a * (1.0 - a)   # dloss_da * da_dz, for every picture at once
    return X.T @ dz / len(X), float(dz.mean())  # dz_dw is the pixel value x, dz_db is 1


def train_neuron(X, t, w, b, lr, steps):
    losses = []
    for _ in range(steps):
        dw, db = neuron_gradients(X, t, w, b)
        w = w - lr * dw
        b = b - lr * db
        losses.append(float(((sigmoid(X @ w + b) - t) ** 2).mean()))
    return w, b, losses


one_idx = int(np.where(y_train == 1)[0][0])  # the first "1" in the training set (provided)

chain_report = chain_terms(X_train[one_idx], stem_w, STEM_BIAS, 1.0)
is_one = (y_train == 1).astype(float)
neuron_w, neuron_b, neuron_losses = train_neuron(X_train, is_one, np.zeros(N_IN), 0.0, 3.0, 60)
neuron_image = neuron_w.reshape(SIZE, SIZE).tolist()`,
      explanation:
        "The forward pass is z = x . w + b then a = sigmoid(z). The chain rule says the loss's sensitivity to z is dloss_da * da_dz = 2(a - t) * a(1 - a), and since z is a sum of w_i * x_i, the weight w_i inherits that sensitivity multiplied by its input x_i, while the bias inherits it unchanged. Over a batch, X.T @ dz sums x_i * dz over the pictures and dividing by n gives the mean. train_neuron simply repeats gradient, subtract lr times gradient, and records the loss. Starting from zero weights works for one neuron because the pixels, not the weights, drive the first gradient. The learned neuron_image lights up where ink means 'one'.",
      hints: [
        { id: "h1", title: "Forward and the chain pieces", content: "z = float(np.dot(x, w) + b) and a = float(sigmoid(z)); return them as (z, a). chain_terms calls neuron_forward, then fills the dict: loss (a - t) ** 2, dloss_da 2 * (a - t), da_dz a * (1 - a)." },
        { id: "h2", title: "The batch gradient", content: "a = sigmoid(X @ w + b), then dz = 2 * (a - t) * a * (1 - a), one number per picture. dw = X.T @ dz / len(X) has the shape of w, and db = float(dz.mean()). Return them as a pair (dw, db)." },
        { id: "h3", title: "Training and the published values", content: "In train_neuron loop steps times: get dw, db; w = w - lr * dw; b = b - lr * db; then append float(((sigmoid(X @ w + b) - t) ** 2).mean()). Then chain_report = chain_terms(X_train[one_idx], stem_w, STEM_BIAS, 1.0), is_one = (y_train == 1).astype(float), and neuron_image = neuron_w.reshape(SIZE, SIZE).tolist()." },
      ],
      tests: [
        {
          id: "t1",
          description: "neuron_forward and chain_terms give the right z, a, loss and local slopes on a hand example",
          assertionCode: py`
_x = np.array([1.0, 2.0])
_w = np.array([0.5, -0.25])
_got = neuron_forward(_x, _w, 0.1)
assert isinstance(_got, tuple) and len(_got) == 2, f"neuron_forward should return the pair (z, a), but it returned {_got!r}"
assert abs(_got[0] - 0.1) < 1e-9, f"for x=[1, 2], w=[0.5, -0.25], b=0.1 the sum z should be 0.5 - 0.5 + 0.1 = 0.1, but it is {_got[0]!r}"
assert abs(_got[1] - 0.52498) < 1e-4, f"a should be sigmoid(0.1) = 0.525, but it is {_got[1]!r}"
_t = chain_terms(_x, _w, 0.1, 1.0)
assert isinstance(_t, dict) and set(_t) == {"z", "a", "loss", "dloss_da", "da_dz"}, f"chain_terms should return a dict with the keys z, a, loss, dloss_da, da_dz, but it returned {_t!r}"
assert abs(_t["loss"] - 0.22564) < 1e-4, f"with target 1 the loss (a - t) squared should be 0.2256, but it is {_t['loss']!r}"
assert abs(_t["dloss_da"] - (-0.95004)) < 1e-4, f"dloss_da is 2 * (a - t) = -0.950, but it is {_t['dloss_da']!r}"
assert abs(_t["da_dz"] - 0.24938) < 1e-4, f"da_dz is a * (1 - a) = 0.249, but it is {_t['da_dz']!r}"
_u = chain_terms(_x, _w, 0.1, 0.0)
assert abs(_u["loss"] - 0.27560) < 1e-4 and abs(_u["dloss_da"] - 1.04996) < 1e-4, f"with target 0 the loss should be 0.2756 and dloss_da +1.050, but they are {_u['loss']!r} and {_u['dloss_da']!r}"
`,
        },
        {
          id: "t2",
          description: "neuron_gradients agrees with a slope measured by nudging each weight",
          assertionCode: py`
_rng = np.random.RandomState(2)
_X = _rng.randn(6, 3)
_t = np.array([1.0, 0.0, 1.0, 1.0, 0.0, 0.0])
_w = _rng.randn(3) * 0.5
_b = 0.2
_got = neuron_gradients(_X, _t, _w, _b)
assert isinstance(_got, tuple) and len(_got) == 2, f"neuron_gradients should return the pair (dw, db), but it returned {_got!r}"
_dw, _db = _got
assert np.shape(_dw) == (3,), f"dw should have the same shape as w, (3,), but its shape is {np.shape(_dw)}"
assert np.ndim(_db) == 0, "db should be a single number (the average of dz over the batch)"
def _mse(w, b):
    return float(((1.0 / (1.0 + np.exp(-(_X @ w + b))) - _t) ** 2).mean())
for _i in range(3):
    _step = np.zeros(3)
    _step[_i] = 1e-6
    _slope = (_mse(_w + _step, _b) - _mse(_w - _step, _b)) / 2e-6
    assert abs(float(_dw[_i]) - _slope) < 1e-6, f"the loss changes by {_slope:.6f} per unit of weight {_i}, but your dw[{_i}] is {float(_dw[_i]):.6f}"
_slope_b = (_mse(_w, _b + 1e-6) - _mse(_w, _b - 1e-6)) / 2e-6
assert abs(float(_db) - _slope_b) < 1e-6, f"the loss changes by {_slope_b:.6f} per unit of bias, but your db is {float(_db):.6f}"
`,
        },
        {
          id: "t3",
          description: "train_neuron lowers the loss and learns which side the 1s are on",
          assertionCode: py`
_rng = np.random.RandomState(0)
_X = np.vstack([_rng.randn(20, 2) + 2.0, _rng.randn(20, 2) - 2.0])
_t = np.concatenate([np.ones(20), np.zeros(20)])
_got = train_neuron(_X, _t, np.zeros(2), 0.0, 2.0, 40)
assert isinstance(_got, tuple) and len(_got) == 3, f"train_neuron should return (w, b, losses), but it returned {_got!r}"
_w, _b, _losses = _got
assert len(_losses) == 40, f"losses should hold one number per step (40), but it has {len(_losses)}"
assert _losses[-1] < _losses[0], f"the loss should go down while training, but it went from {_losses[0]:.3f} to {_losses[-1]:.3f}"
assert _losses[-1] < 0.05, f"after 40 steps on this easy data the loss should be below 0.05, but it is {_losses[-1]:.3f}"
assert np.shape(_w) == (2,) and float(_w[0]) > 0 and float(_w[1]) > 0, "both coordinates are bigger for the 1s, so both trained weights should be positive"
`,
        },
        {
          id: "t4",
          description: "chain_report, is_one and the trained neuron (neuron_w, neuron_b, neuron_losses, neuron_image) match the lesson",
          assertionCode: py`
_want = chain_terms(X_train[one_idx], stem_w, STEM_BIAS, 1.0)
assert isinstance(chain_report, dict) and chain_report and _want is not None and set(chain_report) == set(_want), "chain_report should be chain_terms(X_train[one_idx], stem_w, STEM_BIAS, 1.0)"
for _k in _want:
    assert abs(chain_report[_k] - _want[_k]) < 1e-9, f"chain_report['{_k}'] should be {_want[_k]!r}, but it is {chain_report[_k]!r}"
assert np.shape(is_one) == (len(y_train),) and np.array_equal(is_one, (y_train == 1).astype(float)), "is_one should be 1.0 for every training picture of a one and 0.0 for all the others"
assert isinstance(neuron_losses, list) and len(neuron_losses) == 60, f"neuron_losses should hold one loss per step, 60 in all, but it is {neuron_losses!r}"
assert type(neuron_losses[0]) is float, "the losses should be plain floats: wrap each one in float(...)"
assert neuron_losses[-1] < neuron_losses[0] and neuron_losses[-1] < 0.05, f"the loss should fall and end below 0.05, but it went from {neuron_losses[0]:.3f} to {neuron_losses[-1]:.3f}"
_trained = train_neuron(X_train, is_one, np.zeros(N_IN), 0.0, 3.0, 60)
assert isinstance(_trained, tuple) and len(_trained) == 3, "train_neuron should return (w, b, losses), so neuron_w and neuron_b cannot be checked yet"
_w2, _b2, _l2 = _trained
assert np.allclose(neuron_w, _w2) and abs(neuron_b - _b2) < 1e-9, "neuron_w and neuron_b should come from train_neuron(X_train, is_one, np.zeros(N_IN), 0.0, 3.0, 60)"
assert isinstance(neuron_image, list) and len(neuron_image) == SIZE and all(len(_r) == SIZE for _r in neuron_image), "neuron_image should be a 10 x 10 list (neuron_w.reshape(SIZE, SIZE).tolist())"
assert np.allclose(neuron_image, np.asarray(neuron_w).reshape(SIZE, SIZE)), "neuron_image should show neuron_w laid out row by row on the 10 x 10 grid"
_a = sigmoid(X_train @ neuron_w + neuron_b)
assert float(_a[y_train == 1].mean()) > 0.5 and float(_a[y_train != 1].mean()) < 0.15, "the trained neuron should answer high for pictures of a one and low for the others"
`,
        },
      ],
      unlocks: ["gn-chain"],
      checks: [
        {
          prompt: "A neuron outputs `a = 0.8` for a picture whose target is 1. What is `da_dz = a * (1 - a)` at that point?",
          question: { type: "number", answer: 0.16, tolerance: 0.001 },
          explanation: "0.8 * 0.2 = 0.16. The sigmoid is steepest at a = 0.5 (slope 0.25) and flattens out as a nears 0 or 1, which is why a very confident neuron learns slowly from a squared-error loss.",
        },
        {
          prompt: "One picture has a pixel `x_i = 0` (blank paper). What does that picture contribute to the gradient of `w_i`?",
          question: {
            type: "choice",
            options: [
              "Nothing: the gradient of w_i is dz * x_i, which is 0",
              "The full dz, because the neuron still made an error",
              "A negative amount, to punish the blank pixel",
              "It depends on the other weights",
            ],
            answer: 0,
            feedback: {
              1: "dz is the blame for the whole sum z, but each weight only gets the share that went through its own input: dz * x_i.",
              2: "Nothing punishes a blank pixel. Its weight simply never touched the answer for this picture.",
              3: "The weight's own share is dz * x_i. The other weights are already included in dz.",
            },
          },
          explanation: "z = w . x + b, so the slope of z with respect to w_i is exactly x_i. A weight can only be blamed for the input it actually saw; with x_i = 0 it contributed nothing to this picture's answer.",
        },
      ],
    },

    // ───────────────────────── 8 ─────────────────────────
    {
      id: "ai-neural-8-backprop",
      title: "Backprop for the whole net",
      minutes: 35,
      xp: 150,
      concepts: ["backpropagation", "matrix gradients", "softmax + cross-entropy gradient", "ReLU slope", "shape checking"],
      learn: md`### From one neuron to a network

In lesson 7 the blame had one road to walk. Your network has a few more steps in it:

~~~text
forward:  X -> Z1 = X@W1 + b1 -> H = relu(Z1) -> Z2 = H@W2 + b2 -> probs = softmax(Z2) -> loss
backward:  dZ2  ->  dH, dZ1 -> and, at each stop, the gradient for that layer's own W and b
~~~

Backprop walks this list **backwards**. At each stop it answers two questions: *how should this layer's own weights change?* and *what blame do I hand to the layer before?*

### The shape rule

One habit will save you hours: **the gradient of a thing has the same shape as the thing.** \`dW1\` is \`(100, 24)\`, \`db1\` is \`(24,)\`, \`dZ2\` is \`(n, 10)\`. When you are unsure where a transpose goes, choose the arrangement that makes the shapes come out right. It is not a proof, but it is almost always the answer.

### Step 1: the end of the chain

For one picture with true digit \`y\`, the loss is \`-ln(p_y)\`, which is \`-z_y + ln(sum of e^z_j)\`. Take the slope with respect to the score \`z_k\`: the first term contributes \`-1\` if \`k\` is the true digit (else 0), and the second contributes \`e^z_k / sum\`, which is just \`p_k\`. So

~~~text
dloss/dz_k  =  p_k  -  (1 if k is the true digit, else 0)
~~~

All the awkward softmax derivatives cancel. In words: *every wrong digit is pushed down by exactly the probability it stole, and the right digit is pushed up by the probability it is missing.* For probabilities \`[0.7, 0.2, 0.1]\` and true digit 0, the blame is \`[-0.3, +0.2, +0.1]\`. It always adds up to 0. In code that is \`probs - one_hot(y)\`, and since the loss is a mean over \`n\` pictures, divide by \`n\`:

~~~python
dZ2 = (probs - one_hot(y, 10)) / n          # shape (n, 10), like Z2
~~~

### Step 2: the output layer's own weights

\`Z2 = H @ W2 + b2\` is lesson 7's neuron for all 10 outputs and all pictures at once:

~~~python
dW2 = H.T @ dZ2             # (24, n) @ (n, 10) -> (24, 10): the shape of W2
db2 = dZ2.sum(axis=0)       # (10,)
~~~

Why a sum for the bias? Going forward, \`b2\` was *broadcast*: added to every picture's row. Going backward, a value that was copied to many places collects the blame from all of them, so we add. (It is the "add across paths" rule again.)

### Step 3: hand the blame to the hidden layer

Each hidden unit feeds all ten outputs. Its blame is the sum, over those ten outputs, of the output's blame times the weight joining them:

~~~python
dH = dZ2 @ W2.T             # (n, 10) @ (10, 24) -> (n, 24)
~~~

Then the blame passes through the ReLU. Its slope is 1 where \`Z1 > 0\` and 0 elsewhere (\`d_relu\` from lesson 3), so a sprout that was switched off for a picture receives none of the blame for it:

~~~python
dZ1 = dH * d_relu(Z1)       # element by element, still (n, 24)
~~~

### Step 4: the first layer

Same pattern as step 2, with \`X\` in place of \`H\`: \`dW1 = X.T @ dZ1\` has shape \`(100, 24)\` and \`db1 = dZ1.sum(axis=0)\` has shape \`(24,)\`. Put the four steps in one function, \`loss_and_grads(params, X, y)\`, which runs the forward pass and returns the loss together with a dict of gradients under the same keys as \`params\`. Because \`dZ2\` already contains the division by \`n\`, nothing else needs dividing.

### When the shapes complain

Missing a transpose in step 2 gives:

~~~text
ValueError: matmul: Input operand 1 has a mismatch in its core dimension 0, with gufunc signature (n?,k),(k,m?)->(n?,m?) (size 64 is different from 24)
~~~

Reading it: operand 1 (\`dZ2\`) has 64 rows (the batch), but \`H\` has 24 columns, so there is nothing to multiply across. Writing \`dZ2 @ W2\` instead of \`dZ2 @ W2.T\` gives the same kind of message with \`(size 24 is different from 10)\`. In both cases the fix is to ask which dimension should disappear in the multiplication.

### Reading the gradient sizes

\`grad_norms\` records the overall size of each gradient on the first 64 pictures. Expect numbers of order 0.1 to 1. A \`nan\`, a size of a million, or exact zeros everywhere mean something upstream broke. These numbers are a smoke alarm, not proof: lesson 9 builds the proper test.

### Common mistakes

- **Forgetting the \`/ n\`** in \`output_gradient\`: every gradient is 64 times too big, training still runs, and it blows up with a normal learning rate.
- **Wrong transposes** on \`H.T @ dZ2\` or \`dZ2 @ W2.T\`.
- **A bias gradient without \`.sum(axis=0)\`**: it has shape \`(n, 10)\` instead of \`(10,)\`.
- **Skipping the ReLU slope**: the hidden gradient becomes too large and trains badly.
- **Changing \`params\` inside \`loss_and_grads\`**: it should only read them.`,
      mission: md`The roots reach down. You have a score for the whole garden (the loss); now you will send blame backwards through every layer so each of the 2,400 first-layer weights and 240 output weights learns exactly how it contributed.

Write the four backward steps, assemble them into \`loss_and_grads\`, and measure the gradients of your fresh He-initialised network on the first 64 pictures. When this passes, the **Gradient flow** panel lights up, showing how large the gradient is for every weight matrix and bias.`,
      tasks: [
        "output_gradient(probs, y): (probs - one_hot) / n, the blame on the ten scores",
        "layer2_grads(H, dZ2): return (dW2, db2) for the output layer",
        "hidden_gradient(dZ2, W2, Z1): the blame on Z1, through W2.T and then the ReLU slope",
        "loss_and_grads(params, X, y): return (loss, grads) with grads under the same keys as params",
        "first_loss, first_grads on the first 64 training pictures, and grad_norms: each gradient's overall size as a float",
      ],
      starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 8: backpropagation for the whole two-layer network.
# Reminder of the forward pass (lesson 4):
#   Z1 = X @ W1 + b1,  H = relu(Z1),  Z2 = H @ W2 + b2,  probs = softmax(Z2)
# A gradient always has the same shape as the thing it belongs to.


def output_gradient(probs, y):
    """The blame on the ten scores Z2: (probs - one_hot(y)) divided by the number of pictures.
    Shape (n, 10)."""
    ...


def layer2_grads(H, dZ2):
    """Gradients of the output layer's own parameters. Return (dW2, db2):
    dW2 has the shape of W2, db2 the shape of b2."""
    ...


def hidden_gradient(dZ2, W2, Z1):
    """Send the blame back to the hidden layer: through W2, then through the ReLU slope.
    Returns dZ1, shape (n, hidden units)."""
    ...


def loss_and_grads(params, X, y):
    """Forward pass, then backward pass. Return (loss, grads): grads is a dict with the same
    keys as params ("W1", "b1", "W2", "b2"), each the same shape as its parameter."""
    ...


first_loss, first_grads = 0.0, {}  # loss_and_grads of params on the first 64 training pictures
grad_norms = {}                     # for each key: the size of that gradient, np.linalg.norm, as a float`,
      solutionAdd: py`def output_gradient(probs, y):
    # softmax + cross-entropy collapse to "what we said minus what was true"
    return (probs - one_hot(y, probs.shape[1])) / len(y)


def layer2_grads(H, dZ2):
    # the same rule as a single neuron, for all outputs at once; the bias was broadcast, so it sums
    return H.T @ dZ2, dZ2.sum(axis=0)


def hidden_gradient(dZ2, W2, Z1):
    # blame travels back along the same weights it came forward on, then the ReLU gate
    return (dZ2 @ W2.T) * d_relu(Z1)


def loss_and_grads(params, X, y):
    Z1, H, Z2 = forward(X, params)
    probs = softmax(Z2)
    dZ2 = output_gradient(probs, y)
    dW2, db2 = layer2_grads(H, dZ2)
    dZ1 = hidden_gradient(dZ2, params["W2"], Z1)
    grads = {"W1": X.T @ dZ1, "b1": dZ1.sum(axis=0), "W2": dW2, "b2": db2}
    return cross_entropy(probs, y), grads


first_loss, first_grads = loss_and_grads(params, X_train[:64], y_train[:64])
grad_norms = {name: float(np.linalg.norm(g)) for name, g in first_grads.items()}`,
      explanation:
        "The backward pass mirrors the forward pass. Softmax with cross-entropy leaves a clean (probs - one_hot) / n on the scores. The output layer's weight gradient is H.T @ dZ2 and its bias gradient is dZ2 summed over pictures. The blame reaches the hidden layer through W2.T and is then multiplied element by element with the ReLU slope, so switched-off units receive nothing. The first layer repeats the output-layer rule with X in place of H. Every gradient has the shape of its parameter, which is the quickest way to catch a misplaced transpose. grad_norms boils each gradient down to one float the stage can show; for this He-initialised network they sit between roughly 0.1 and 0.8.",
      hints: [
        { id: "h1", title: "The end of the chain and the output layer", content: "output_gradient is (probs - one_hot(y, probs.shape[1])) / len(y). layer2_grads returns two things: H.T @ dZ2 (shape of W2) and dZ2.sum(axis=0) (shape of b2)." },
        { id: "h2", title: "Back through W2 and the ReLU", content: "The blame on the hidden units is dZ2 @ W2.T, shape (n, hidden). Multiply that element by element with d_relu(Z1) (written with a plain *, not @) to get dZ1." },
        { id: "h3", title: "Putting it together", content: "In loss_and_grads: Z1, H, Z2 = forward(X, params); probs = softmax(Z2); dZ2 = output_gradient(probs, y); get dW2, db2 and dZ1 from your helpers (W2 is params['W2']); then grads = {'W1': X.T @ dZ1, 'b1': dZ1.sum(axis=0), 'W2': dW2, 'b2': db2}. Return cross_entropy(probs, y), grads." },
      ],
      tests: [
        {
          id: "t1",
          description: "output_gradient is (probs - one_hot) / n: each row adds up to zero",
          assertionCode: py`
_p = np.array([[0.7, 0.2, 0.1], [0.1, 0.8, 0.1], [0.3, 0.3, 0.4]])
_y = np.array([0, 1, 2])
_got = output_gradient(_p, _y)
assert _got is not None, "output_gradient should return the table of blame, but it returned None. Did you finish with a return line?"
_got = np.asarray(_got)
assert _got.shape == (3, 3), f"output_gradient should have the same shape as probs, (3, 3), but its shape is {_got.shape}"
_want = [[-0.1, 0.066667, 0.033333], [0.033333, -0.066667, 0.033333], [0.1, 0.1, -0.2]]
assert np.allclose(_got, _want, atol=1e-5), f"for these 3 pictures the blame should be (probs - one_hot) / 3, starting [-0.1, 0.067, 0.033], but you got {np.round(_got, 3).tolist()}"
assert np.allclose(_got.sum(axis=1), 0.0, atol=1e-9), "each row of blame should add up to 0: the true digit is pushed up by exactly what the wrong ones are pushed down"
`,
        },
        {
          id: "t2",
          description: "layer2_grads and hidden_gradient give the right values and shapes on a 3-picture example",
          assertionCode: py`
_dZ2 = np.array([[-0.1, 0.066667, 0.033333], [0.033333, -0.066667, 0.033333], [0.1, 0.1, -0.2]])
_H = np.array([[1.0, 0.0], [0.0, 2.0], [1.0, 1.0]])
_got = layer2_grads(_H, _dZ2)
assert isinstance(_got, tuple) and len(_got) == 2, f"layer2_grads should return the pair (dW2, db2), but it returned {_got!r}"
_dW2, _db2 = _got
assert np.shape(_dW2) == (2, 3), f"dW2 should have the shape of W2, (2, 3) for 2 hidden units and 3 outputs, but its shape is {np.shape(_dW2)}"
assert np.shape(_db2) == (3,), f"db2 should have the shape of b2, (3,), but its shape is {np.shape(_db2)}"
assert np.allclose(_dW2, [[0.0, 0.166667, -0.166667], [0.166667, -0.033333, -0.133333]], atol=1e-4), f"dW2 should be H.T @ dZ2 = [[0, 0.167, -0.167], [0.167, -0.033, -0.133]], but you got {np.round(_dW2, 3).tolist()}"
assert np.allclose(_db2, [0.033333, 0.1, -0.133333], atol=1e-4), f"db2 should add dZ2 up over the pictures, [0.033, 0.1, -0.133], but you got {np.round(_db2, 3).tolist()}"
_W2 = np.array([[1.0, 0.0, -1.0], [0.5, 1.0, 0.0]])
_Z1 = np.array([[1.0, -1.0], [2.0, 3.0], [-0.5, 0.5]])
_dZ1 = hidden_gradient(_dZ2, _W2, _Z1)
assert _dZ1 is not None, "hidden_gradient should return the blame on Z1, but it returned None. Did you finish with a return line?"
_dZ1 = np.asarray(_dZ1)
assert _dZ1.shape == (3, 2), f"hidden_gradient should have the shape of Z1, (3, 2), but its shape is {_dZ1.shape}"
assert np.allclose(_dZ1, [[-0.133333, 0.0], [0.0, -0.05], [0.0, 0.15]], atol=1e-4), f"hidden_gradient should be (dZ2 @ W2.T) times the ReLU slope, [[-0.133, 0], [0, -0.05], [0, 0.15]], but you got {np.round(_dZ1, 3).tolist()}"
`,
        },
        {
          id: "t3",
          description: "loss_and_grads matches the loss and the slopes measured by nudging every weight of a tiny network",
          assertionCode: py`
_rng = np.random.RandomState(7)
_P = {"W1": _rng.randn(4, 3) * 0.6, "b1": _rng.randn(3) * 0.3, "W2": _rng.randn(3, 3) * 0.6, "b2": _rng.randn(3) * 0.3}
_X = _rng.randn(5, 4)
_y = np.array([0, 2, 1, 1, 0])
_got = loss_and_grads(_P, _X, _y)
assert isinstance(_got, tuple) and len(_got) == 2, f"loss_and_grads should return the pair (loss, grads), but it returned {_got!r}"
_loss, _g = _got
def _plain_loss(P):
    _z1 = _X @ P["W1"] + P["b1"]
    _z2 = np.maximum(0.0, _z1) @ P["W2"] + P["b2"]
    _z2 = _z2 - _z2.max(axis=1, keepdims=True)
    _pr = np.exp(_z2)
    _pr = _pr / _pr.sum(axis=1, keepdims=True)
    return float(-np.log(_pr[np.arange(len(_y)), _y]).mean())
assert abs(float(_loss) - _plain_loss(_P)) < 1e-9, f"the loss should be the mean cross-entropy, {_plain_loss(_P):.4f} here, but loss_and_grads returned {float(_loss):.4f}"
assert isinstance(_g, dict) and set(_g) == set(_P), f"grads should have the same keys as params (W1, b1, W2, b2), but it is {_g!r}"
for _name in _P:
    assert np.shape(_g[_name]) == _P[_name].shape, f"grads['{_name}'] should have the shape of params['{_name}'], {_P[_name].shape}, but its shape is {np.shape(_g[_name])}"
for _name in _P:
    for _idx in np.ndindex(*_P[_name].shape):
        _up = {k: v.copy() for k, v in _P.items()}
        _down = {k: v.copy() for k, v in _P.items()}
        _up[_name][_idx] += 1e-6
        _down[_name][_idx] -= 1e-6
        _slope = (_plain_loss(_up) - _plain_loss(_down)) / 2e-6
        assert abs(float(_g[_name][_idx]) - _slope) < 1e-6, f"the loss changes by {_slope:.6f} per unit of {_name}{list(_idx)}, but your gradient there is {float(_g[_name][_idx]):.6f}"
`,
        },
        {
          id: "t4",
          description: "first_loss, first_grads and grad_norms describe the first 64 training pictures",
          assertionCode: py`
_pair = loss_and_grads(params, X_train[:64], y_train[:64])
assert isinstance(_pair, tuple) and len(_pair) == 2, "loss_and_grads should return the pair (loss, grads), so first_loss and first_grads cannot be checked yet"
_want_loss, _want_g = _pair
assert isinstance(first_loss, float) and abs(first_loss - float(_want_loss)) < 1e-9, f"first_loss should be the loss of params on the first 64 training pictures ({float(_want_loss):.3f}), but it is {first_loss!r}"
assert isinstance(first_grads, dict) and set(first_grads) == {"W1", "b1", "W2", "b2"}, f"first_grads should be the gradients dict from loss_and_grads, but it is {first_grads!r}"
for _name in _want_g:
    assert np.shape(first_grads[_name]) == params[_name].shape and np.allclose(first_grads[_name], _want_g[_name]), f"first_grads['{_name}'] should be the gradient of params['{_name}'] on X_train[:64], y_train[:64]"
assert isinstance(grad_norms, dict) and set(grad_norms) == {"W1", "b1", "W2", "b2"}, f"grad_norms should have one entry per gradient (W1, b1, W2, b2), but it is {grad_norms!r}"
for _name in _want_g:
    assert type(grad_norms[_name]) is float, f"grad_norms['{_name}'] should be a plain float: wrap np.linalg.norm(...) in float(...)"
    assert abs(grad_norms[_name] - float(np.linalg.norm(_want_g[_name]))) < 1e-9, f"grad_norms['{_name}'] should be the size np.linalg.norm of that gradient ({float(np.linalg.norm(_want_g[_name])):.3f}), but it is {grad_norms[_name]!r}"
`,
        },
      ],
      unlocks: ["gn-grads"],
      checks: [
        {
          prompt: "A batch of 64 pictures gives `H` of shape (64, 24) and `dZ2` of shape (64, 10). What shape does `H.T @ dZ2` have?",
          question: {
            type: "choice",
            options: ["(24, 10)", "(64, 64)", "(10, 24)", "(64, 10)"],
            answer: 0,
            feedback: {
              1: "H.T has shape (24, 64), so the 64 pictures disappear in the multiplication. What is left is 24 and 10.",
              2: "The result has the shape of the thing it is the gradient of: W2, which maps 24 hidden units to 10 outputs.",
              3: "That is the shape of dZ2 itself. The pictures are summed away by the matrix product.",
            },
          },
          explanation: "(24, 64) @ (64, 10) gives (24, 10), exactly the shape of W2. The 64 in the middle is the sum over pictures: each weight collects the blame from every picture in the batch.",
        },
        {
          prompt: "One picture has probabilities `[0.7, 0.2, 0.1]` and the true digit is 0. With a batch of just this one picture (n = 1), what is `output_gradient` for the score of digit 0?",
          question: { type: "number", answer: -0.3, tolerance: 0.001 },
          explanation: "p - 1 = 0.7 - 1 = -0.3. The negative sign says: raise the true digit's score. The other two entries, +0.2 and +0.1, say lower those scores, and all three add up to zero.",
        },
      ],
    },
  ],
};
