import type { Chapter } from "@/engine/types";
import { md, py } from "./util.ts";

/**
 * Chapter 3: Growth. Gradient checking, the training loop, mini-batches with shuffling, and the
 * confusion matrix with a look at the mistakes.
 *
 * Names this chapter adds that later chapters rely on: buggy_loss_and_grads, relative_error,
 * numeric_partial, gradient_check, check_error, check_rows, bug_error, predict_labels, accuracy,
 * train_full, params_full, history_full, epoch_batches, train_batches, params_batch,
 * history_batch, batch_study, confusion_matrix, recall_by_digit, top_confusions, wrong_indices,
 * preds_batch, cm, confusion, recalls, worst_pairs, wrong, mistake_pixels, mistake_truth,
 * mistake_guess. Lessons 13 to 16 call predict_labels, accuracy, epoch_batches, loss_and_grads
 * and confusion_matrix.
 */

export const chapter3: Chapter = {
  id: "growth",
  title: "Growth: training for real",
  blurb: "Check your gradients, then train in loops, in batches, and look at the mistakes.",
  lessons: [
    // ───────────────────────── 9 ─────────────────────────
    {
      id: "ai-neural-9-gradient-check",
      title: "Gradient checking: catch your own bugs",
      minutes: 28,
      xp: 120,
      concepts: ["finite differences", "centred difference", "relative error", "gradient checking", "debugging backprop"],
      learn: md`### The bug that does not crash

Backprop is a lot of matrix algebra, and most of its bugs are kind: a wrong transpose gives \`ValueError: operands could not be broadcast together with shapes (24,10) (100,)\` and you fix it in a minute. The bugs that cost you a week are the quiet ones: a missing minus sign, a \`/ n\` in the wrong place, a gradient with exactly the right shape and exactly the wrong size. Nothing crashes. The loss still goes down, only slower than it should, and you start blaming the learning rate, the data and the seed.

**Gradient checking** is the cure. It asks the loss function, which you already trust, whether your gradient is telling the truth.

### What a gradient claims

The gradient entry for one weight says: "nudge this weight up by a tiny amount and the loss will change by about that amount times me." We can test that claim directly, with no calculus at all, using two forward passes:

~~~text
numeric slope = ( loss(w + eps) - loss(w - eps) ) / (2 * eps)
~~~

This is the **centred difference**: measure the loss a hair above the weight and a hair below it, then divide the rise by the width of the gap. If your analytic gradient (the one backprop produces) agrees with this number, the formula is right. If they disagree, one of them is wrong, and the numeric one is far too simple to be the culprit.

### Why centred, and why not a smaller eps

Try the one-sided and the centred versions on f(x) = x^3 at x = 1, where the true slope is 3, using eps = 0.1:

~~~text
one-sided:  (1.1^3 - 1^3) / 0.1           = 3.31   (off by 0.31)
centred:    (1.1^3 - 0.9^3) / (2 * 0.1)   = 3.01   (off by 0.01)
~~~

The one-sided estimate leans to one side of the curve, and its error shrinks in step with eps. In the centred one the lean from above and the lean from below cancel, so what is left shrinks with eps squared: ten times smaller eps, a hundred times smaller error.

So why not take eps = 1e-12 and be done? Because floating-point numbers keep about 16 digits, and a nudge that small barely registers. Try it:

~~~python
print((1.0 + 1e-12) - 1.0)    # 1.000088900582341e-12
~~~

You asked for a 1e-12 nudge and got back a number that is wrong in the fifth digit. That is rounding noise, and dividing it by 2e-12 blows it up into a nonsense slope. Too big an eps gives a biased slope, too small drowns in rounding. \`1e-5\` sits in the comfortable middle: for a loss around 2 you keep roughly ten trustworthy digits.

### One entry at a time

To nudge one weight you change one number inside the real weight array, call the loss, change it the other way, call the loss again, and then **put it back**:

~~~python
old = array[index]
array[index] = old + eps
up = loss_fn()
array[index] = old - eps
down = loss_fn()
array[index] = old
~~~

\`loss_fn\` is a function with no inputs that recomputes the loss from whatever the arrays hold right now, which is why changing the array in place is enough. For a toy loss it looks like this:

~~~python
w = np.array([3.0, 5.0])
numeric_partial(lambda: w[0] ** 2 + 3 * w[1], w, (0,))    # 6.0, because the slope of w0*w0 is 2*w0
~~~

### How many entries, and how close is close

Our network has 2,674 numbers. Checking all of them would take 5,348 forward passes: fine here, painfully slow for a big net. So we check a few random entries from **each** of W1, b1, W2 and b2, on a small batch of 16 pictures. Every array gets its own picks because a bug usually lives in one of them, and the table of rows then tells you which.

\`gradient_check\` returns \`(worst_error, rows)\`, where each row is \`[name, analytic, numeric]\`. Eyeball a row from the reference run:

~~~text
["W1", -0.0033451565, -0.0033451565]     (they agree to about nine digits)
~~~

To turn "agree" into one number we use the **relative error**: the gap divided by the size of the two numbers, \`abs(a - b) / max(1e-6, abs(a) + abs(b))\`. Relative, because a gap of 0.00005 is nothing next to a gradient of 5 and a disaster next to a gradient of 0.0001. The \`max(1e-6, ...)\` floor matters too: many first-layer weights belong to pixels that are blank in all 16 pictures, their gradient is exactly 0.0 and so is the numeric slope, and without the floor you would divide 0 by 0 and meet \`ZeroDivisionError: float division by zero\`.

Rough reading of the result in float64:

~~~text
below 1e-7     excellent
below 1e-5     fine
around 1e-3    suspicious: look at the rows
above 1e-2     a bug
~~~

A correct backprop here scores about 7e-9.

### The trap, and the corners

The starter gives you \`buggy_loss_and_grads\`, a backprop that looks plausible: someone scaled the first layer's gradient by the batch size, mixing up where the \`/ n\` belongs. Its loss is fine, only the W1 gradient is 16 times too big on a 16-picture batch. The relative error of every non-zero W1 entry is then \`15g / 17g = 0.88\`, whatever g is, while b1, W2 and b2 still agree. Training with it would "work", just with first-layer steps 16 times too long. The check not only notices, it points at W1.

One honest caveat: ReLU has a corner at zero. If a hidden unit's input is within eps of 0, the nudge straddles the corner and the numeric slope averages two different slopes, while backprop picks one. A single odd entry among many perfect ones is probably a corner: run again with another seed. A whole array that is off is a bug.

Finally, gradient checking is slow on purpose. Run it when you change the backprop code, then turn it off. Never leave it inside the training loop.

### Common mistakes

- Forgetting to put the entry back: every later check then measures a slightly different network and the errors drift.
- Passing the loss instead of the function: \`numeric_partial(loss_and_grads(params, X, y)[0], ...)\` hands over a number and fails with \`TypeError: 'float' object is not callable\`. Wrap it: \`lambda: loss_and_grads(params, X, y)[0]\`.
- Indexing a 2-D array with a single number: \`W1[3]\` is a whole row, not one weight. Use a full tuple such as \`(3, 17)\`.
- Dividing by the analytic gradient alone, which divides by zero for blank pixels.
- Using the full training set: the check works the same on 16 pictures, 75 times faster.`,
      mission: md`Before the greenhouse waters for sixty seasons straight, a careful gardener tests the hose. A gradient that is secretly wrong would not stop the plants growing, it would just stunt them, and you would never know why.

Build the measuring stick: nudge a weight up and down, compare the real change in loss with what your backprop promised, and run it on a deliberately broken backprop to see what a caught bug looks like. When this passes, the **Gradient check** panel opens with every checked weight as a pair of bars, your backprop beside the measured slope.`,
      tasks: [
        "relative_error(a, b): abs(a - b) / max(1e-6, abs(a) + abs(b))",
        "numeric_partial(loss_fn, array, index, eps=1e-5): the centred-difference slope of loss_fn() for entry index of array; put the entry back before you return",
        "gradient_check(params, X, y, picks, seed, grad_fn=loss_and_grads): for each of W1, b1, W2, b2 (in that order) pick `picks` random entries; return (worst_error, rows) where each row is [name, analytic, numeric]",
        "check_error, check_rows = gradient_check(params, X_train[:16], y_train[:16], 4, 1)",
        "bug_error: the worst error of the same check run with buggy_loss_and_grads as grad_fn",
      ],
      starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 9: ask the loss itself whether your gradients are right.


def buggy_loss_and_grads(params, X, y):
    """PROVIDED, leave it as it is. It looks like loss_and_grads but contains one deliberate bug.
    Your gradient check should catch it and say which array is off."""
    loss, grads = loss_and_grads(params, X, y)
    grads["W1"] = grads["W1"] * len(X)
    return loss, grads


def relative_error(a, b):
    """How far apart a and b are, relative to their size: abs(a - b) / max(1e-6, abs(a) + abs(b))."""
    ...


def numeric_partial(loss_fn, array, index, eps=1e-5):
    """Centred difference: the loss with array[index] nudged up by eps, minus the loss with it nudged
    down by eps, divided by 2 * eps. loss_fn takes no arguments. Put the entry back before returning."""
    ...


def gradient_check(params, X, y, picks, seed, grad_fn=loss_and_grads):
    """Compare grad_fn's gradients with numeric ones for random entries.
    rng = np.random.RandomState(seed). For name in ("W1", "b1", "W2", "b2") draw picks entries: one
    rng.randint(0, size) per axis of that array, as a tuple index. The analytic value comes from
    grad_fn, the numeric one from numeric_partial with the real loss.
    Return (worst_error, rows) with rows = [[name, analytic, numeric], ...] (plain floats)."""
    ...


# Check the real backprop, then the buggy one, on 16 pictures with 4 picks per array.
check_error, check_rows = 1.0, []
bug_error = 0.0`,
      solutionAdd: py`def buggy_loss_and_grads(params, X, y):
    """PROVIDED, leave it as it is. It looks like loss_and_grads but contains one deliberate bug.
    Your gradient check should catch it and say which array is off."""
    loss, grads = loss_and_grads(params, X, y)
    grads["W1"] = grads["W1"] * len(X)
    return loss, grads


def relative_error(a, b):
    """How far apart a and b are, relative to their size (the 1e-6 floor avoids 0 / 0)."""
    return abs(a - b) / max(1e-6, abs(a) + abs(b))


def numeric_partial(loss_fn, array, index, eps=1e-5):
    """Centred difference of loss_fn() with respect to array[index]."""
    old = array[index]
    array[index] = old + eps
    up = loss_fn()
    array[index] = old - eps
    down = loss_fn()
    array[index] = old  # always put the entry back
    return (up - down) / (2.0 * eps)


def gradient_check(params, X, y, picks, seed, grad_fn=loss_and_grads):
    """Compare grad_fn's gradients with numeric ones for a few random entries of every array."""
    rng = np.random.RandomState(seed)
    _, grads = grad_fn(params, X, y)
    rows, worst = [], 0.0
    for name in ("W1", "b1", "W2", "b2"):
        array = params[name]
        for _ in range(picks):
            index = tuple(int(rng.randint(0, size)) for size in array.shape)
            numeric = numeric_partial(lambda: loss_and_grads(params, X, y)[0], array, index)
            analytic = float(grads[name][index])
            worst = max(worst, relative_error(analytic, numeric))
            rows.append([name, analytic, numeric])
    return worst, rows


check_error, check_rows = gradient_check(params, X_train[:16], y_train[:16], 4, 1)
bug_error, _ = gradient_check(params, X_train[:16], y_train[:16], 4, 1, buggy_loss_and_grads)`,
      explanation:
        "relative_error turns a gap into a fraction of the numbers' size, and the 1e-6 floor keeps two zero gradients from dividing 0 by 0. numeric_partial is the centred difference: it nudges one entry up, measures the loss, nudges it down, measures again, restores the original value and divides the difference by 2 * eps, so the one-sided lean cancels. gradient_check draws a few random entries from each array with a seeded generator, takes the analytic value from grad_fn (the code under suspicion) and the numeric value from the real loss, and reports the worst relative error plus every row. On the real backprop the worst error is around 1e-8, so the formulas are right. On buggy_loss_and_grads every non-zero W1 entry is off by 15/17 = 0.88, which shows up as a huge error in exactly the W1 rows.",
      hints: [
        { id: "h1", title: "The two small functions", content: "relative_error: return abs(a - b) / max(1e-6, abs(a) + abs(b)). numeric_partial: old = array[index]; set array[index] = old + eps; up = loss_fn(); set array[index] = old - eps; down = loss_fn(); set array[index] = old; return (up - down) / (2.0 * eps)." },
        { id: "h2", title: "The shape of gradient_check", content: "Start with rng = np.random.RandomState(seed) and _, grads = grad_fn(params, X, y). Loop over the four names; for each, repeat picks times: index = tuple(int(rng.randint(0, size)) for size in array.shape). numeric = numeric_partial(lambda: loss_and_grads(params, X, y)[0], array, index), analytic = float(grads[name][index]). Append [name, analytic, numeric] to rows and keep the maximum relative_error as worst." },
        { id: "h3", title: "The two published results", content: "check_error, check_rows = gradient_check(params, X_train[:16], y_train[:16], 4, 1). For the broken one pass buggy_loss_and_grads as the last argument and keep the first result: bug_error, _ = gradient_check(params, X_train[:16], y_train[:16], 4, 1, buggy_loss_and_grads)." },
      ],
      tests: [
        {
          id: "t1",
          description: "numeric_partial measures a slope with the centred difference and puts the entry back",
          assertionCode: py`
assert callable(numeric_partial), "numeric_partial should be a function"
_a = np.array([3.0, 5.0])
_got = numeric_partial(lambda: float(_a[0] ** 2 + 3.0 * _a[1]), _a, (0,))
assert _got is not None, "numeric_partial returned None; it should return the slope as a number (is the return line missing?)"
assert isinstance(_got, (int, float, np.floating)), f"numeric_partial should return a number but it returned a {type(_got).__name__}"
assert abs(float(_got) - 6.0) < 1e-6, f"for w0*w0 + 3*w1 at w0 = 3 the slope with respect to w0 is 6, but numeric_partial returned {float(_got)!r}"
assert np.allclose(_a, [3.0, 5.0], atol=1e-12), f"numeric_partial must put the entry back when it is done: the array started as [3.0, 5.0] and is now {_a.tolist()!r}"
_m = np.array([[1.0, 2.0], [3.0, 4.0]])
_got = numeric_partial(lambda: float((_m ** 2).sum()), _m, (1, 0))
assert abs(float(_got) - 6.0) < 1e-6, f"for the sum of squares of a 2 x 2 array the slope of the entry (1, 0), which is 3, should be 6, but numeric_partial returned {float(_got)!r}"
assert np.allclose(_m, [[1.0, 2.0], [3.0, 4.0]], atol=1e-12), "numeric_partial must leave a 2-D array exactly as it found it"
_c = np.array([1.0])
_got = float(numeric_partial(lambda: float(_c[0] ** 3), _c, (0,), 0.1))
assert abs(_got - 3.01) < 1e-9, f"with eps = 0.1 the centred difference of x**3 at x = 1 is (1.1**3 - 0.9**3) / 0.2 = 3.01, but numeric_partial returned {_got!r}: use (loss at +eps minus loss at -eps) / (2 * eps)"
`,
        },
        {
          id: "t2",
          description: "relative_error is symmetric, zero for equal numbers and safe when both are zero",
          assertionCode: py`
assert callable(relative_error), "relative_error should be a function"
_got = relative_error(3.0, 2.0)
assert _got is not None, "relative_error returned None; it should return the relative gap as a number"
assert abs(float(_got) - 0.2) < 1e-9, f"relative_error(3.0, 2.0) should be |3 - 2| / (3 + 2) = 0.2 but it returned {_got!r}"
assert abs(float(relative_error(2.0, 3.0)) - float(_got)) < 1e-12, "relative_error should not care about the order of its arguments"
assert abs(float(relative_error(5.0, 5.0))) < 1e-12, "two equal numbers should have a relative error of 0"
try:
    _zero = relative_error(0.0, 0.0)
except ZeroDivisionError:
    assert False, "relative_error(0.0, 0.0) divided by zero: divide by max(1e-6, abs(a) + abs(b)) so two zero gradients count as a perfect match"
assert abs(float(_zero)) < 1e-9, f"two gradients of exactly 0 agree perfectly, but relative_error(0.0, 0.0) returned {_zero!r}"
assert float(relative_error(1e-9, 3e-9)) < 0.01, "two gradients that are both tiny should not be called a big disagreement (use max(1e-6, abs(a) + abs(b)) in the denominator)"
assert abs(float(relative_error(1.0, 0.0)) - 1.0) < 1e-9, "relative_error(1.0, 0.0) should be 1.0"
`,
        },
        {
          id: "t3",
          description: "gradient_check passes the real backprop, flags buggy_loss_and_grads and leaves the weights alone",
          assertionCode: py`
assert callable(gradient_check), "gradient_check should be a function"
_net = init_params(N_IN, N_HIDDEN, N_OUT, 3)
_keep = {_k: _v.copy() for _k, _v in _net.items()}
_out = gradient_check(_net, X_train[:16], y_train[:16], 4, 1)
assert _out is not None, "gradient_check returned None; it should return (worst_error, rows)"
assert isinstance(_out, tuple) and len(_out) == 2, "gradient_check should return a pair: (worst_error, rows)"
_worst, _rows = _out
assert isinstance(_rows, list) and len(_rows) == 16, f"with 4 picks for each of the four arrays there should be 16 rows, but there are {len(_rows) if isinstance(_rows, list) else _rows!r}"
assert [_r[0] for _r in _rows] == ["W1"] * 4 + ["b1"] * 4 + ["W2"] * 4 + ["b2"] * 4, "rows should go W1, b1, W2, b2 with 4 rows each, every row written [name, analytic, numeric]"
assert all(len(_r) == 3 and isinstance(_r[1], float) and isinstance(_r[2], float) for _r in _rows), "each row should be [name, analytic, numeric] with the two values as plain floats"
assert all(np.array_equal(_net[_k], _keep[_k]) for _k in _net), "gradient_check changed the weights it was given: numeric_partial must put every entry back"
assert float(_worst) < 1e-4, f"on the real backprop the worst relative error should be tiny (under 1e-4) but it is {float(_worst):.4g}; compare the analytic value from grad_fn with the numeric slope of the real loss"
assert abs(float(_worst) - max(relative_error(_r[1], _r[2]) for _r in _rows)) < 1e-12, "worst_error should be the largest relative_error among the rows"
_few = gradient_check(_net, X_train[:16], y_train[:16], 2, 5)
assert len(_few[1]) == 8, f"with 2 picks per array there should be 8 rows, but there are {len(_few[1])}"
_bad = gradient_check(_net, X_train[:16], y_train[:16], 4, 1, buggy_loss_and_grads)
assert float(_bad[0]) > 0.1, f"the broken backprop should be flagged with a large error (over 0.1), but gradient_check reported {float(_bad[0]):.4g}: the analytic value has to come from grad_fn"
_worst_row = max(_bad[1], key=lambda _r: relative_error(_r[1], _r[2]))
assert _worst_row[0] == "W1", f"the bug is in the first layer's gradient, so the worst row should be a W1 row, but it is a {_worst_row[0]} row"
`,
        },
        {
          id: "t4",
          description: "check_error, check_rows and bug_error are the published results of the two checks",
          assertionCode: py`
assert isinstance(check_error, float), f"check_error should be a float but it is a {type(check_error).__name__}"
assert check_error < 1e-4, f"check_error should be tiny (under 1e-4) for a correct backprop but it is {check_error!r}: set it from gradient_check(params, X_train[:16], y_train[:16], 4, 1)"
assert isinstance(check_rows, list) and len(check_rows) == 16, f"check_rows should be the 16 rows of that check, but it has {len(check_rows) if isinstance(check_rows, list) else 'no'} rows"
assert all(isinstance(_r, list) and len(_r) == 3 for _r in check_rows) and check_rows[0][0] == "W1" and check_rows[-1][0] == "b2", "each row should be [name, analytic, numeric] and the rows should run from W1 to b2"
assert isinstance(bug_error, float), f"bug_error should be a float but it is a {type(bug_error).__name__}"
assert bug_error > 0.1, f"bug_error should be large (over 0.1) because buggy_loss_and_grads is wrong, but it is {bug_error!r}: run the same check with buggy_loss_and_grads as the last argument"
_fresh = init_params(N_IN, N_HIDDEN, N_OUT, 3)
_again = gradient_check(_fresh, X_train[:16], y_train[:16], 4, 1, buggy_loss_and_grads)[0]
assert abs(bug_error - float(_again)) < 1e-6, f"bug_error ({bug_error!r}) should come from the same check as in the task (16 pictures, 4 picks, seed 1), which gives {float(_again)!r}"
`,
        },
      ],
      unlocks: ["gn-check"],
      checks: [
        {
          prompt: "Use the centred difference with eps = 0.1 to estimate the slope of f(x) = x^3 at x = 2, i.e. (f(2.1) - f(1.9)) / 0.2. What do you get? (The exact slope is 12.)",
          question: { type: "number", answer: 12.01, tolerance: 0.001 },
          explanation: "2.1^3 = 9.261 and 1.9^3 = 6.859, so the difference is 2.402 and 2.402 / 0.2 = 12.01. The centred estimate is off by only 0.01 even with a fat eps of 0.1; a one-sided estimate would be off by about 0.6.",
        },
        {
          prompt: "A gradient check on fresh backprop code prints relative errors around 1e-8 for b1, W2 and b2, but around 0.9 for every non-zero W1 row. What is the best conclusion?",
          question: {
            type: "choice",
            options: [
              "The gradient code for the first layer is wrong; the other three are fine",
              "The learning rate is too high",
              "eps should be much smaller",
              "The whole network is wrong and must be rewritten",
            ],
            answer: 0,
            feedback: {
              1: "The learning rate does not appear anywhere in a gradient check; it only compares two ways of computing the same slope.",
              2: "A smaller eps would only add rounding noise, and it would not make three arrays perfect and one terrible.",
              3: "Three of the four arrays agree to eight digits, so most of the code is right. The check tells you where to look.",
            },
          },
          explanation: "The check reports per array, and only W1 disagrees. That points straight at the lines that build the first layer's gradient (for example a stray scale factor or a missing / n), which is exactly where buggy_loss_and_grads hides its bug.",
        },
      ],
    },

    // ───────────────────────── 10 ─────────────────────────
    {
      id: "ai-neural-10-training-loop",
      title: "The training loop: watering for 60 seasons",
      minutes: 30,
      xp: 130,
      concepts: ["epochs", "learning rate", "training loop", "in-place updates", "train vs held-out accuracy"],
      learn: md`### From one step to a loop

You now own \`loss_and_grads\`: one number that says how wrong the network is, and for every weight the direction that makes it more wrong. Training is just "ask, nudge, repeat":

~~~text
repeat for each epoch:
    loss, grads = loss_and_grads(params, X, y)
    for every array: params[name] -= lr * grads[name]
~~~

We subtract because the gradient points uphill and we want to go down. One pass over all the training pictures is an **epoch**. Today every epoch uses all 1,200 pictures for one single update; lesson 11 changes that.

### The learning rate, on a one-weight garden

You met the learning rate \`lr\` in Orchard Vision. Here is the whole story with one weight: minimise f(w) = (w - 3)^2, whose slope is 2(w - 3), starting at w = 0.

~~~text
lr = 0.25:  0 -> 1.5 -> 2.25 -> 2.625 -> ...      the distance to 3 halves every step
lr = 1.0:   0 -> 6 -> 0 -> 6 -> 0 -> ...          jumps clean over the valley forever
lr = 1.1:   0 -> 6.6 -> -1.32 -> 8.18 -> ...      every jump is longer than the last: it explodes
lr = 0.01:  0 -> 0.06 -> 0.119 -> ...             correct, but it crawls
~~~

In this toy the distance to the valley is multiplied by \`1 - 2 * lr\` each step, so anything above 1 diverges. In the network no such clean number exists (the safe range depends on how curved the loss is), which is why you learn to read the loss curve instead.

### Reading the loss curve

\`train_full\` returns a history: lists with one entry per epoch. Plot the loss and you can diagnose a run at a glance:

- **It starts near 2.3.** A network that guesses uniformly over 10 digits has loss ln 10 = 2.30. A random one lands a little off that (our reference run starts at 2.46). A first loss of 40 or \`nan\` means something earlier is broken: the initialisation, a missing shift in softmax, a wrong label array.
- **It falls smoothly, then flattens.** Healthy. The early epochs are steep because every weight is far from where it should be.
- **It zig-zags or climbs.** Learning rate too high. Small bumps are fine; a curve that shoots up by whole units, or turns into \`nan\`, is not.
- **It barely moves from 2.3.** Learning rate too small, or the gradients are zero (remember the all-zeros network of lesson 6).

### Two accuracies, one rule

Besides the loss we record \`train_acc\` (how many of the pictures it learns from it gets right) and \`eval_acc\` (how many of a set of pictures it has never learned from). Right now the second set is \`X_test\`. In the reference run the final numbers are about 0.92 and 0.90: the network does a little better on what it has seen, which is normal.

The rule is: **watch the held-out curve, never decide with it.** If you stop at the epoch where the test curve looks best, or pick the learning rate that scores best on it, the test set has quietly become part of your training process and the number it reports is flattering. For now we only watch. Lesson 15 builds the proper separate set for making choices.

### In place, or the caller never sees it

\`predict_labels\` is the argmax of the output scores for every row (softmax is unnecessary for that: the biggest score is also the biggest probability). \`accuracy\` is the fraction of labels it gets right.

The update line \`params[name] -= lr * grads[name]\` changes the array that the dict holds, so when \`train_full\` returns, the \`params\` you passed in are already trained and the function only needs to return the history. The failing version builds something new instead:

~~~python
def broken(params, grads, lr):
    params = {k: params[k] - lr * grads[k] for k in params}   # a NEW dict; the caller never sees it
~~~

Nothing crashes. The loss is computed from the old weights, again and again, and never improves. Two related facts you will need later: \`old = params\` is not a copy (both names point at the same dict), and a real copy of the arrays needs \`.copy()\`.

### Common mistakes

- \`params = params - lr * grads\` fails with \`TypeError: unsupported operand type(s) for -: 'dict' and 'dict'\`: params and grads are dicts of arrays, so update them array by array.
- Adding instead of subtracting: the loss climbs from 2.4 towards \`nan\` instead of falling.
- Training the same \`params\` twice: the second run starts from the already trained weights, so its first epoch looks suspiciously good. Build a fresh \`init_params(...)\` for every experiment.
- \`logits.argmax()\` without \`axis=1\` gives one number for the whole table, not one per picture.
- Mixing up when things are measured: here the loss belongs to the weights before the update, the accuracies to the weights after it.`,
      mission: md`The seeds are in, the roots are mapped and the hose is tested. Time to water: sixty seasons, one update per season, with a clipboard recording how the greenhouse is doing.

Write the tools that score a network, write the loop that grows it, train a fresh He-initialised net and keep the history. When this passes, the **Growth curves** panel draws the loss and both accuracies per epoch, and the network on stage switches to the weights you just trained.`,
      tasks: [
        "predict_labels(params, X): for each row the digit with the largest output score (an array of ints)",
        "accuracy(params, X, y): the fraction of rows predicted correctly, as a plain float",
        "train_full(params, X, y, lr, epochs, X_eval, y_eval): each epoch get loss and grads, update every array of params in place, and record loss (before the update), train_acc and eval_acc (after it); return the history dict with those three keys",
        "params_full: a fresh init_params(N_IN, N_HIDDEN, N_OUT, 3), trained for 60 epochs at lr 0.5 on X_train, y_train and watched on X_test, y_test; history_full is the history it returns",
        "net_view = params_to_lists(params_full) so the stage draws the trained weights",
      ],
      starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 10: the training loop.


def predict_labels(params, X):
    """For every row of X, the digit with the largest output score. Returns an array of whole numbers."""
    ...


def accuracy(params, X, y):
    """The fraction of rows of X whose predicted digit equals y (a plain float between 0 and 1)."""
    ...


def train_full(params, X, y, lr, epochs, X_eval, y_eval):
    """Train params IN PLACE with plain gradient descent on all of X every epoch. Return a history
    dict with three lists, one entry per epoch: "loss" (measured before that epoch's update),
    "train_acc" and "eval_acc" (measured after it, on X, y and on X_eval, y_eval)."""
    ...


params_full = None    # a fresh init_params(N_IN, N_HIDDEN, N_OUT, 3), trained for 60 epochs at lr 0.5
history_full = None   # the history that train_full returned for it
# Once params_full is trained, show it on the stage:
# net_view = params_to_lists(params_full)`,
      solutionAdd: py`def predict_labels(params, X):
    """For every row of X, the digit with the largest output score."""
    return forward(X, params)[2].argmax(axis=1)


def accuracy(params, X, y):
    """The fraction of rows of X whose predicted digit equals y."""
    return float((predict_labels(params, X) == y).mean())


def train_full(params, X, y, lr, epochs, X_eval, y_eval):
    """Plain gradient descent on all of X every epoch; params is updated in place."""
    history = {"loss": [], "train_acc": [], "eval_acc": []}
    for _ in range(epochs):
        loss, grads = loss_and_grads(params, X, y)
        for name in params:
            params[name] -= lr * grads[name]
        history["loss"].append(loss)
        history["train_acc"].append(accuracy(params, X, y))
        history["eval_acc"].append(accuracy(params, X_eval, y_eval))
    return history


params_full = init_params(N_IN, N_HIDDEN, N_OUT, 3)
history_full = train_full(params_full, X_train, y_train, 0.5, 60, X_test, y_test)
net_view = params_to_lists(params_full)`,
      explanation:
        "predict_labels takes the largest output score per row, which is also the largest probability, so softmax is not needed; axis=1 gives one answer per picture. accuracy compares those answers with the labels. train_full asks loss_and_grads for the loss and gradients, subtracts lr times each gradient from its array with -=, which edits the arrays inside the dict you passed so the caller's params are trained when the function returns, and records the loss of the weights it just measured plus the two accuracies after the step. Starting from a fresh He net, 60 epochs at lr 0.5 take the loss from about 2.5 down to about 0.37 and the accuracy on pictures it never trained on to about 0.90.",
      hints: [
        { id: "h1", title: "Predict and score", content: "predict_labels: return forward(X, params)[2].argmax(axis=1). accuracy: return float((predict_labels(params, X) == y).mean())." },
        { id: "h2", title: "The loop body", content: "history = {\"loss\": [], \"train_acc\": [], \"eval_acc\": []}. Inside for _ in range(epochs): loss, grads = loss_and_grads(params, X, y); then for name in params: params[name] -= lr * grads[name]. Append loss, then accuracy(params, X, y) and accuracy(params, X_eval, y_eval). Return history at the end." },
        { id: "h3", title: "Train the real net", content: "params_full = init_params(N_IN, N_HIDDEN, N_OUT, 3), then history_full = train_full(params_full, X_train, y_train, 0.5, 60, X_test, y_test), then net_view = params_to_lists(params_full)." },
      ],
      tests: [
        {
          id: "t1",
          description: "predict_labels picks the largest score and accuracy counts the right ones",
          assertionCode: py`
assert callable(predict_labels) and callable(accuracy), "predict_labels and accuracy should be functions"
_net = {"W1": np.eye(3), "b1": np.zeros(3), "W2": np.eye(3), "b2": np.zeros(3)}
_X = np.array([[0.9, 0.1, 0.0], [0.0, 0.2, 0.7], [0.3, 0.3, 0.4], [0.1, 0.8, 0.05]])
_got = predict_labels(_net, _X)
assert _got is not None, "predict_labels returned None; it should return one digit per row"
assert np.asarray(_got).shape == (4,), f"predict_labels should return one prediction per row (4 of them) but the shape is {np.asarray(_got).shape}: use argmax(axis=1)"
assert np.asarray(_got).tolist() == [0, 2, 2, 1], f"for this tiny network the largest score per row is at positions [0, 2, 2, 1], but predict_labels returned {np.asarray(_got).tolist()}"
_acc = accuracy(_net, _X, np.array([0, 2, 1, 1]))
assert _acc is not None, "accuracy returned None; it should return the fraction that is right"
assert abs(float(_acc) - 0.75) < 1e-12, f"3 of the 4 predictions are right, so accuracy should be 0.75 but it is {_acc!r}"
assert isinstance(_acc, float), f"accuracy should return a plain float but returned a {type(_acc).__name__}"
assert abs(float(accuracy(_net, _X, np.array([0, 2, 2, 1]))) - 1.0) < 1e-12, "when every prediction is right the accuracy should be 1.0"
`,
        },
        {
          id: "t2",
          description: "train_full records one loss and two accuracies per epoch",
          assertionCode: py`
assert callable(train_full), "train_full should be a function"
_Xs, _ys = X_train[:40], y_train[:40]
_net = init_params(N_IN, 8, N_OUT, 2)
_start = {_k: _v.copy() for _k, _v in _net.items()}
_first = loss_and_grads(_start, _Xs, _ys)[0]
_h = train_full(_net, _Xs, _ys, 0.5, 3, X_test[:20], y_test[:20])
assert _h is not None, "train_full returned None; it should return the history dict (is the return line missing?)"
assert isinstance(_h, dict), f"train_full should return a dict but returned a {type(_h).__name__}"
for _key in ("loss", "train_acc", "eval_acc"):
    assert _key in _h, f"the history is missing the key {_key!r}; it should have loss, train_acc and eval_acc"
    assert len(_h[_key]) == 3, f"after 3 epochs {_key!r} should hold 3 numbers but holds {len(_h[_key])}"
assert abs(float(_h["loss"][0]) - _first) < 1e-9, f"the loss recorded for epoch 1 should be the loss of the starting weights ({_first:.4f}), measured before the first update, but it is {float(_h['loss'][0]):.4f}"
assert float(_h["loss"][2]) < float(_h["loss"][0]), "after 3 updates on the same 40 pictures the loss should be lower than at the start"
assert all(0.0 <= float(_v) <= 1.0 for _v in _h["train_acc"] + _h["eval_acc"]), "the accuracies are fractions between 0 and 1"
`,
        },
        {
          id: "t3",
          description: "train_full updates the weights it is given, in place",
          assertionCode: py`
_Xs, _ys = X_train[:40], y_train[:40]
_net = init_params(N_IN, 8, N_OUT, 2)
_start = {_k: _v.copy() for _k, _v in _net.items()}
_h = train_full(_net, _Xs, _ys, 0.5, 3, X_test[:20], y_test[:20])
assert _h is not None, "train_full returned None; it should return the history dict"
for _k in ("W1", "b1", "W2", "b2"):
    assert not np.allclose(_net[_k], _start[_k]), f"after training, {_k} is unchanged: train_full has to update the arrays of the params it was given in place (params[name] -= lr * grads[name]), not build new ones"
_h2 = train_full(_net, _Xs, _ys, 0.5, 1, X_test[:20], y_test[:20])
assert float(_h2["loss"][0]) < float(_h["loss"][0]), "calling train_full again should carry on from the trained weights, so its first loss should be lower than the first loss of the earlier call"
`,
        },
        {
          id: "t4",
          description: "params_full and history_full hold a trained network and its 60-epoch history",
          assertionCode: py`
assert params_full is not None and history_full is not None, "params_full and history_full are still empty: train a fresh init_params(N_IN, N_HIDDEN, N_OUT, 3) with train_full and keep both"
assert isinstance(params_full, dict) and set(params_full) == {"W1", "b1", "W2", "b2"}, "params_full should be the params dict with the keys W1, b1, W2 and b2"
assert params_full["W1"].shape == (100, 24) and params_full["W2"].shape == (24, 10), "params_full should be the 100 -> 24 -> 10 network"
assert isinstance(history_full, dict) and all(_k in history_full for _k in ("loss", "train_acc", "eval_acc")), "history_full should be the dict that train_full returned"
assert len(history_full["loss"]) == 60, f"history_full should cover 60 epochs but its loss list has {len(history_full['loss'])} entries"
assert float(history_full["loss"][0]) > 2.0, f"the first loss of an untrained network should be near 2.3 but it is {float(history_full['loss'][0]):.3f}: start from a fresh init_params net"
assert float(history_full["loss"][-1]) < 0.5, f"after 60 epochs at lr 0.5 the loss should be below 0.5 but it is {float(history_full['loss'][-1]):.3f}"
assert float(history_full["train_acc"][-1]) > 0.9 and float(history_full["eval_acc"][-1]) > 0.85, "a trained network should read over 90% of the training pictures and over 85% of the test pictures"
assert abs(accuracy(params_full, X_test, y_test) - float(history_full["eval_acc"][-1])) < 1e-12, "history_full should be the history of params_full: its last test accuracy does not match the network you kept"
assert isinstance(net_view, dict) and isinstance(net_view.get("W1"), list) and np.allclose(np.array(net_view["W1"]), params_full["W1"]), "net_view should be params_to_lists(params_full) so the stage draws the trained weights"
`,
        },
      ],
      unlocks: ["gn-training"],
      checks: [
        {
          prompt: "Gradient descent on f(w) = (w - 3)^2 has the slope 2(w - 3). Starting at w = 0 with a learning rate of 0.25, what is w after two updates?",
          question: { type: "number", answer: 2.25 },
          explanation: "The slope at w = 0 is -6, so the first update gives 0 - 0.25 * (-6) = 1.5. The slope at 1.5 is -3, so the second update gives 1.5 - 0.25 * (-3) = 2.25. The distance to the valley halves each time.",
        },
        {
          prompt: "Put one epoch of the training loop in order.",
          question: {
            type: "order",
            items: [
              "Ask loss_and_grads for the loss and the gradients",
              "Subtract lr times each gradient from its weights, in place",
              "Record the loss and the two accuracies for this epoch",
              "Go round again for the next epoch",
            ],
          },
          explanation: "The gradient has to be measured before it is used, and the weights change before the accuracies are recorded, so the accuracies describe the weights after the step. Then the whole thing repeats.",
        },
      ],
    },

    // ───────────────────────── 11 ─────────────────────────
    {
      id: "ai-neural-11-mini-batches",
      title: "Mini-batches: many small steps",
      minutes: 30,
      xp: 135,
      concepts: ["mini-batch", "shuffling", "stochastic gradient descent", "batch size", "updates per epoch"],
      learn: md`### One careful step or many quick ones

Full-batch training is careful: every update uses an average over all 1,200 pictures, so the gradient is a precise compass needle. But it spends a whole pass over the data to take one step.

The alternative is to cut the shuffled pictures into **mini-batches**, say 64 at a time, and take a step after each. That gives 19 updates per epoch instead of one. The gradient from 64 pictures is only an estimate of the gradient from all 1,200, like polling 64 people instead of surveying the whole town: right on average and a little jittery. While the network is still far from good, any roughly-downhill step is worth taking, and 19 rough steps beat one perfect one.

The reference run shows it. Same net, same learning rate (0.3), two epochs each, different batch sizes:

~~~text
batch size   updates   loss after 2 epochs   test accuracy
   600           4           2.29                 0.21
   150          16           2.02                 0.47
    30          80           0.79                 0.83
~~~

The number of **updates**, not the number of epochs, is what counts.

### Shuffle, then slice

A mini-batch must be a fair sample. Our glyphs come in random order, but suppose they were sorted by digit: the first batches would be all zeros, then all ones. The network would swing to "everything is a 0", then to "everything is a 1", forgetting the previous digit each time. So before every epoch we shuffle, and we reshuffle each epoch so the batches differ every time and the noise averages out.

The mechanics fit in four lines. A shuffled list of indices comes from \`rng.permutation(n)\`; slicing cuts it into chunks:

~~~python
order = np.array([7, 2, 9, 0, 5, 1, 8, 3, 6, 4])      # what rng.permutation(10) might give
chunks = [order[s:s + 4] for s in range(0, 10, 4)]    # [7 2 9 0], [5 1 8 3], [6 4]
~~~

The last chunk is shorter when the batch size does not divide the count: 1,200 pictures in batches of 64 make 18 full batches and one of 48, so 19 updates. Keep that last batch (the loss is an average, so a smaller batch is no problem) and never pad it. In general you get \`ceil(n / batch_size)\` updates per epoch. To use a chunk you index both arrays with the same indices, \`X[idx], y[idx]\`, which keeps every picture next to its label.

### The generator lives outside the epoch loop

\`rng = np.random.RandomState(seed)\` is created **once**, before the epochs, and passed into \`epoch_batches\`. Each call to \`rng.permutation\` then continues the random stream and gives a different shuffle, while the whole run stays reproducible from the seed. If you create the generator inside the epoch loop, every epoch starts from the same seed and gets the identical shuffle: "shuffled" once and then frozen.

### How big a batch?

- **Small batches (8 to 32):** many noisy updates. The noise can even help the network shake out of a bad spot. The price is wasted hardware: a matrix multiply on 8 rows takes almost as long as on 64, so each update does little work.
- **Large batches (500 and up):** accurate gradients, but few updates per epoch. They usually want a bigger learning rate to make progress, and they need more memory.
- **In between (32 to 256):** where most networks live. We use 64.

Noise and learning rate pull on each other: the noisier the gradient, the smaller the safe learning rate.

### What to record

\`train_batches\` returns the same history as \`train_full\` plus \`updates\`, the total number of parameter updates made. The loss recorded for an epoch is the average of the losses of its batches; they were measured while the weights were still moving, so it reads slightly pessimistic compared with a loss measured at the end of the epoch. The accuracies are measured at the end of each epoch.

Compare with lesson 10. The full-batch run took 60 epochs to reach about 0.90 test accuracy; with mini-batches the reference gets about 0.89 in 8 epochs (it touches 0.92 along the way). That is 152 cheap updates against 60, but the number that matters at scale is the passes over the data: 8 instead of 60.

### Common mistakes

- Shuffling X and y separately, for instance \`X = rng.permutation(X)\`: the pictures no longer match their labels. Shuffle indices once and use them for both.
- Creating \`RandomState(seed)\` inside the epoch loop (see above).
- Taking \`n\` from the wrong array and meeting \`IndexError: index 1263 is out of bounds for axis 0 with size 1200\`.
- Recording only the last batch's loss for the epoch: it jumps around. Average the batches.
- Counting \`updates\` once per epoch instead of once per batch.`,
      mission: md`Watering the whole bed in one go means waiting a full season for every drop of feedback. A gardener works the bed in rows instead: water a few, look, adjust, move on.

Write the shuffler, write the mini-batch trainer, and run the same garden with three different row sizes to see the trade-off in numbers. When this passes, the **Batch sizes** panel shows the same data fed in small, medium and large mouthfuls, and the stage switches to the new network.`,
      tasks: [
        "epoch_batches(n, batch_size, rng): order = rng.permutation(n), then a list of chunks of at most batch_size indices; the last chunk may be smaller",
        "train_batches(params, X, y, lr, epochs, batch_size, seed, X_eval, y_eval): in place, one RandomState(seed) for the whole run, one update per mini-batch; history has loss (the mean of the epoch's batch losses), train_acc, eval_acc and updates (the total count)",
        "params_batch, history_batch: a fresh init_params(N_IN, N_HIDDEN, N_OUT, 3) trained at lr 0.3 for 8 epochs, batch size 64, seed 4, watched on X_test, y_test",
        "batch_study: for batch sizes 600, 150 and 30 train a fresh net (seed 3) for 2 epochs at lr 0.3 (seed 4) and store {\"updates\", \"loss\" (last epoch), \"accuracy\" (last eval_acc)} under the size written as a string",
        "net_view = params_to_lists(params_batch)",
      ],
      starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 11: mini-batches and shuffling.


def epoch_batches(n, batch_size, rng):
    """Shuffle the numbers 0 .. n-1 with rng.permutation(n) and cut them into chunks of at most
    batch_size. Return a list of index arrays. The last chunk may be shorter."""
    ...


def train_batches(params, X, y, lr, epochs, batch_size, seed, X_eval, y_eval):
    """Like train_full, but one update per mini-batch. Create rng = np.random.RandomState(seed) once.
    Return {"loss": [...], "train_acc": [...], "eval_acc": [...], "updates": total_update_count};
    each epoch's loss is the mean of that epoch's batch losses."""
    ...


params_batch = None    # a fresh init_params(N_IN, N_HIDDEN, N_OUT, 3): lr 0.3, 8 epochs, batch 64, seed 4
history_batch = None
batch_study = {}       # "600", "150", "30" -> {"updates": ..., "loss": ..., "accuracy": ...}
# Once params_batch is trained, show it on the stage:
# net_view = params_to_lists(params_batch)`,
      solutionAdd: py`def epoch_batches(n, batch_size, rng):
    """A fresh shuffle of 0 .. n-1, cut into chunks of at most batch_size indices."""
    order = rng.permutation(n)
    return [order[s:s + batch_size] for s in range(0, n, batch_size)]


def train_batches(params, X, y, lr, epochs, batch_size, seed, X_eval, y_eval):
    """Mini-batch gradient descent: one update per batch, a new shuffle every epoch."""
    rng = np.random.RandomState(seed)
    history = {"loss": [], "train_acc": [], "eval_acc": [], "updates": 0}
    for _ in range(epochs):
        losses = []
        for idx in epoch_batches(len(X), batch_size, rng):
            loss, grads = loss_and_grads(params, X[idx], y[idx])
            for name in params:
                params[name] -= lr * grads[name]
            losses.append(loss)
            history["updates"] += 1
        history["loss"].append(float(np.mean(losses)))
        history["train_acc"].append(accuracy(params, X, y))
        history["eval_acc"].append(accuracy(params, X_eval, y_eval))
    return history


params_batch = init_params(N_IN, N_HIDDEN, N_OUT, 3)
history_batch = train_batches(params_batch, X_train, y_train, 0.3, 8, 64, 4, X_test, y_test)
batch_study = {}
for size in (600, 150, 30):
    trial = init_params(N_IN, N_HIDDEN, N_OUT, 3)
    run = train_batches(trial, X_train, y_train, 0.3, 2, size, 4, X_test, y_test)
    batch_study[str(size)] = {"updates": run["updates"], "loss": run["loss"][-1], "accuracy": run["eval_acc"][-1]}
net_view = params_to_lists(params_batch)`,
      explanation:
        "epoch_batches asks the generator for a fresh permutation of the indices and slices it into chunks, so every index appears exactly once per epoch and the final chunk is simply shorter. train_batches creates the generator once, which makes the run reproducible while every epoch still gets a different shuffle. For each chunk it indexes X and y with the same indices, takes one gradient step in place and counts the update; the epoch's loss is the average over its batches. With 1,200 pictures and batches of 64 that is 19 updates per epoch, 152 in 8 epochs, and the net reaches about 0.89 test accuracy in an eighth of the passes full-batch training needed. batch_study shows the same effect in numbers: in two epochs 80 small updates teach far more than 4 big ones.",
      hints: [
        { id: "h1", title: "Shuffle and slice", content: "order = rng.permutation(n); return [order[s:s + batch_size] for s in range(0, n, batch_size)]. The slice at the end simply stops at n, so the last chunk is shorter on its own." },
        { id: "h2", title: "The trainer", content: "Make rng = np.random.RandomState(seed) before the epoch loop. For each epoch: losses = []; for idx in epoch_batches(len(X), batch_size, rng): loss, grads = loss_and_grads(params, X[idx], y[idx]); update every array with -= lr * grads[name]; losses.append(loss); history[\"updates\"] += 1. After the batches append float(np.mean(losses)) and the two accuracies." },
        { id: "h3", title: "The study loop", content: "batch_study = {}; for size in (600, 150, 30): trial = init_params(N_IN, N_HIDDEN, N_OUT, 3); run = train_batches(trial, X_train, y_train, 0.3, 2, size, 4, X_test, y_test); batch_study[str(size)] = {\"updates\": run[\"updates\"], \"loss\": run[\"loss\"][-1], \"accuracy\": run[\"eval_acc\"][-1]}." },
      ],
      tests: [
        {
          id: "t1",
          description: "epoch_batches shuffles every index into chunks exactly once",
          assertionCode: py`
assert callable(epoch_batches), "epoch_batches should be a function"
_rng = np.random.RandomState(0)
_chunks = epoch_batches(10, 4, _rng)
assert _chunks is not None, "epoch_batches returned None; it should return a list of index chunks"
assert isinstance(_chunks, (list, tuple)), f"epoch_batches should return a list of chunks but returned a {type(_chunks).__name__}"
assert [len(_c) for _c in _chunks] == [4, 4, 2], f"10 indices in chunks of 4 should give chunk sizes [4, 4, 2] but gave {[len(_c) for _c in _chunks]}: keep the shorter last chunk"
_flat = np.concatenate([np.asarray(_c) for _c in _chunks])
assert sorted(_flat.tolist()) == list(range(10)), f"every index from 0 to 9 should appear exactly once, but the chunks hold {_flat.tolist()}"
assert _flat.tolist() != list(range(10)), "the indices came back in their original order: shuffle them with rng.permutation(n)"
_again = np.concatenate([np.asarray(_c) for _c in epoch_batches(10, 4, np.random.RandomState(0))])
assert _again.tolist() == _flat.tolist(), "the same seed must give the same shuffle"
_second = np.concatenate([np.asarray(_c) for _c in epoch_batches(10, 4, _rng)])
assert _second.tolist() != _flat.tolist(), "calling epoch_batches again with the same generator should give a new shuffle: use the rng you are given instead of making a new one"
_one = epoch_batches(8, 100, np.random.RandomState(1))
assert len(_one) == 1 and len(_one[0]) == 8, f"a batch size bigger than n should give one chunk with all 8 indices but gave chunk sizes {[len(_c) for _c in _one]}"
`,
        },
        {
          id: "t2",
          description: "train_batches takes one in-place step per mini-batch, counts the updates and averages the batch losses",
          assertionCode: py`
assert callable(train_batches), "train_batches should be a function"
_Xs, _ys = X_train[:40], y_train[:40]
_net = init_params(N_IN, 8, N_OUT, 2)
_start = {_k: _v.copy() for _k, _v in _net.items()}
_h = train_batches(_net, _Xs, _ys, 0.3, 2, 16, 5, X_test[:20], y_test[:20])
assert _h is not None, "train_batches returned None; it should return the history dict (is the return line missing?)"
assert isinstance(_h, dict), f"train_batches should return a dict but returned a {type(_h).__name__}"
for _key in ("loss", "train_acc", "eval_acc", "updates"):
    assert _key in _h, f"the history is missing the key {_key!r}; it should have loss, train_acc, eval_acc and updates"
for _key in ("loss", "train_acc", "eval_acc"):
    assert len(_h[_key]) == 2, f"after 2 epochs {_key!r} should hold 2 numbers but holds {len(_h[_key])}"
assert _h["updates"] == 6, f"40 pictures in batches of 16 make 3 batches per epoch, so 2 epochs are 6 updates, but updates is {_h['updates']!r}"
for _k in ("W1", "b1", "W2", "b2"):
    assert not np.allclose(_net[_k], _start[_k]), f"{_k} did not change: train_batches has to update the params it was given in place"
_ref = {_k: _v.copy() for _k, _v in _start.items()}
_ref_rng = np.random.RandomState(5)
_ref_loss = []
for _epoch in range(2):
    _batch_losses = []
    for _idx in epoch_batches(40, 16, _ref_rng):
        _l, _g = loss_and_grads(_ref, _Xs[_idx], _ys[_idx])
        for _k in _ref:
            _ref[_k] -= 0.3 * _g[_k]
        _batch_losses.append(_l)
    _ref_loss.append(float(np.mean(_batch_losses)))
assert np.allclose(_h["loss"], _ref_loss, atol=1e-9), f"each epoch's loss should be the average of that epoch's batch losses, expected {[round(_v, 4) for _v in _ref_loss]} but got {[round(float(_v), 4) for _v in _h['loss']]}"
assert all(np.allclose(_net[_k], _ref[_k], atol=1e-9) for _k in _net), "the trained weights differ from a hand-written loop with one RandomState(seed) for the whole run: create the generator once, before the epochs, and take one gradient step per batch"
`,
        },
        {
          id: "t3",
          description: "train_batches is reproducible and, with one batch, matches train_full",
          assertionCode: py`
_Xs, _ys = X_train[:40], y_train[:40]
_a = init_params(N_IN, 8, N_OUT, 2)
_b = {_k: _v.copy() for _k, _v in _a.items()}
_c = {_k: _v.copy() for _k, _v in _a.items()}
_ha = train_batches(_a, _Xs, _ys, 0.3, 2, 16, 5, X_test[:20], y_test[:20])
_hb = train_batches(_b, _Xs, _ys, 0.3, 2, 16, 5, X_test[:20], y_test[:20])
assert _ha is not None and _hb is not None, "train_batches returned None; it should return the history dict"
assert np.allclose(_ha["loss"], _hb["loss"], atol=1e-12) and all(np.allclose(_a[_k], _b[_k], atol=1e-12) for _k in _a), "two runs with the same seed and the same starting weights should give identical results: create RandomState(seed) once at the start of train_batches"
_d = {_k: _v.copy() for _k, _v in _c.items()}
_hc = train_batches(_c, _Xs, _ys, 0.3, 2, 40, 5, X_test[:20], y_test[:20])
_hd = train_full(_d, _Xs, _ys, 0.3, 2, X_test[:20], y_test[:20])
assert np.allclose(_hc["loss"], _hd["loss"], atol=1e-8), "with a batch size equal to the number of pictures there is one batch per epoch, so train_batches should record the same losses as train_full"
assert all(np.allclose(_c[_k], _d[_k], atol=1e-8) for _k in _c), "with one batch per epoch the trained weights should match train_full's"
`,
        },
        {
          id: "t4",
          description: "params_batch, history_batch and batch_study show that more updates train faster",
          assertionCode: py`
assert params_batch is not None and history_batch is not None, "params_batch and history_batch are still empty: train a fresh init_params(N_IN, N_HIDDEN, N_OUT, 3) with train_batches (lr 0.3, 8 epochs, batch 64, seed 4)"
assert isinstance(params_batch, dict) and set(params_batch) == {"W1", "b1", "W2", "b2"}, "params_batch should be the params dict with the keys W1, b1, W2 and b2"
assert len(history_batch["loss"]) == 8, f"history_batch should cover 8 epochs but its loss list has {len(history_batch['loss'])} entries"
assert history_batch["updates"] == 152, f"1200 pictures in batches of 64 make 19 batches per epoch, so 8 epochs are 152 updates, but history_batch['updates'] is {history_batch['updates']!r}"
assert float(history_batch["loss"][-1]) < float(history_batch["loss"][0]) and float(history_batch["loss"][-1]) < 0.5, "the mini-batch loss should fall clearly and end below 0.5"
assert abs(accuracy(params_batch, X_test, y_test) - float(history_batch["eval_acc"][-1])) < 1e-12 and float(history_batch["eval_acc"][-1]) > 0.85, "history_batch should be the history of params_batch, and a trained network should read over 85% of the test pictures"
assert isinstance(batch_study, dict) and set(batch_study) == {"600", "150", "30"}, f"batch_study should have the three keys '600', '150' and '30' (the sizes written as text) but has {sorted(batch_study) if isinstance(batch_study, dict) else batch_study!r}"
assert [batch_study[_s].get("updates") for _s in ("600", "150", "30")] == [4, 16, 80], "in 2 epochs, batch sizes 600, 150 and 30 make 4, 16 and 80 updates (2, 8 and 40 batches per epoch)"
assert all(set(batch_study[_s]) == {"updates", "loss", "accuracy"} for _s in batch_study), "each batch_study entry should have the keys updates, loss and accuracy"
assert batch_study["30"]["loss"] < batch_study["600"]["loss"] and batch_study["30"]["accuracy"] > batch_study["600"]["accuracy"], "the smallest batches make the most updates, so after 2 epochs they should have the lowest loss and the best accuracy"
assert isinstance(net_view, dict) and np.allclose(np.array(net_view["W1"]), params_batch["W1"]), "net_view should be params_to_lists(params_batch) so the stage draws the new network"
`,
        },
      ],
      unlocks: ["gn-batches"],
      checks: [
        {
          prompt: "There are 1,200 training pictures and the batch size is 64. How many updates does one epoch make (the last, smaller batch counts)?",
          question: { type: "number", answer: 19 },
          explanation: "1200 / 64 = 18.75, so 18 full batches plus one batch of 48: 19 updates. In general it is ceil(n / batch_size).",
        },
        {
          prompt: "A trainer builds rng = np.random.RandomState(seed) at the top of every epoch and then calls rng.permutation(n). What goes wrong?",
          question: {
            type: "choice",
            options: [
              "Every epoch gets exactly the same shuffle, so the batches never change",
              "The batches overlap and some pictures are used twice per epoch",
              "The last batch is dropped",
              "Nothing: it is the correct way to shuffle each epoch",
            ],
            answer: 0,
            feedback: {
              1: "A permutation always contains each index exactly once, whatever generator makes it. The problem is that the generator restarts.",
              2: "The batches are cut from the permutation by slicing; the generator has no say in how they are cut.",
              3: "Nothing here changes how the permutation is sliced, so the last batch is untouched.",
            },
          },
          explanation: "A generator restarted from the same seed repeats the same stream, so every epoch draws the same permutation. Create the generator once, outside the epoch loop, and each call continues the stream with a new shuffle while the run stays reproducible.",
        },
      ],
    },

    // ───────────────────────── 12 ─────────────────────────
    {
      id: "ai-neural-12-confusion",
      title: "Reading mistakes: the confusion matrix",
      minutes: 28,
      xp: 140,
      concepts: ["accuracy", "confusion matrix", "per-class recall", "error analysis", "np.add.at"],
      learn: md`### 92 percent of what?

The mini-batch network reads about 89% of the test glyphs correctly. Which 11% does it miss? Spread evenly over the ten digits, or one digit completely lost? Accuracy is a single number that hides ten different stories, and the next fix depends on which story is true.

The **confusion matrix** tells it. It is a 10 x 10 table of counts: **rows are the true digit, columns are the digit the network said.** The diagonal holds the correct answers, and every off-diagonal cell is one specific kind of mistake. Here is a tiny three-digit example you can check by hand:

~~~text
truth   = 0 0 1 1 1 2 2 2 2
guessed = 0 1 1 1 2 2 2 0 2

              guessed
              0  1  2
truth 0    [  1  1  0 ]
truth 1    [  0  2  1 ]
truth 2    [  1  0  3 ]
~~~

Read it row by row: of the two real 0s, one was called 0 and one was called 1. Row sums (2, 3, 4) say how many of each digit exist; they add up to the 9 samples. The diagonal adds to 6, so accuracy is 6 / 9. Column sums say how often the network *said* each digit. Swap rows and columns by mistake and you will read the table backwards.

### Building it with np.add.at

A loop is the honest way: \`counts[t, g] += 1\` for each pair. The vectorised version looks identical and is wrong:

~~~python
c = np.zeros(3, dtype=int)
c[[1, 1, 1]] += 1
print(c)    # [0 1 0]  and not [0 3 0]
~~~

NumPy reads the three slots, adds one to each copy and writes them back, so a repeated index only lands once. \`np.add.at(c, [1, 1, 1], 1)\` really adds once per occurrence and gives \`[0 3 0]\`. For the matrix it is \`np.add.at(counts, (y_true, y_pred), 1)\` with \`counts = np.zeros((k, k), dtype=int)\`. A quick safety net: the grand total must equal the number of samples.

### Per-digit recall

Divide each diagonal entry by its row sum and you get the **recall** of that digit: of the real 5s, what fraction did the network find? For the example, recall is 0.5, 0.67 and 0.75. A digit that never occurs has a row sum of 0, so guard it with \`np.maximum(row_sums, 1)\`; unguarded you get \`RuntimeWarning: invalid value encountered in divide\` and a \`nan\`. Return a plain list, because the stage reads lists.

### The biggest mistakes first

\`top_confusions(counts, how_many)\` answers "which wrong pairs happen most?":

1. Make a **copy** and zero its diagonal (never edit the caller's matrix).
2. Flatten it and sort positions by count, biggest first: \`np.argsort(-flat, kind="stable")\`. Stable means ties keep their reading order, so the answer is the same on every machine.
3. Turn a flat position back into a cell: row \`i // k\`, column \`i % k\`. In a 3 x 3 table flat position 5 is row 1, column 2.
4. Keep only cells with a count above zero, and report \`[truth, guess, count]\` with plain Python ints.

### Mistakes are data

\`wrong_indices(y_true, y_pred)\` is just \`np.where(y_true != y_pred)[0]\`: the positions of every wrong answer. With them you can pull up the actual pictures, which the stage draws with the true and the guessed digit. Look at each mistake and ask three questions:

- **Is the label wrong?** Then the network may be right and the data is the problem.
- **Is the picture honestly ambiguous?** If a person would hesitate, so can a network.
- **Is it a real failure?** The picture is clear and the network still misses it. That is where more data, more training or a better model pay off.

In the reference run the weakest row is the 5s (recall about 0.51), and the commonest single mistake is a 5 read as an 8 (12 of the 37 fives), which makes sense: close the loop of a 5 with a stray stroke and it turns into an 8. A number like that tells you what to collect or inspect next.

### Look, but do not tune

There is a trap. Now that you can see the test mistakes, it is tempting to tweak the network until the 5s improve. Every tweak made because of what you saw in the test set leaks a little of it into the model, and the final number stops being an honest estimate. Use the matrix to diagnose. Decisions (learning rate, when to stop, how big a net) belong to a separate validation set, which lesson 15 builds.

### Common mistakes

- Swapping the arguments: \`confusion_matrix(y_pred, y_true)\` transposes the table, and "recall" turns into something else. Sanity check: row sums must equal the true class counts.
- \`counts[y_true, y_pred] += 1\` instead of \`np.add.at\`: the total comes out smaller than the number of samples.
- Passing probabilities or floats as predictions: \`IndexError: arrays used as indices must be of integer (or boolean) type\`. Pass the predicted digits.
- Forgetting to zero the diagonal in \`top_confusions\`, so the "worst confusion" is the digit the network gets right most often.
- Sorting with \`[::-1]\` to get descending order: it reverses the tie order too. Negate the counts instead.`,
      mission: md`The harvest is in. Before the gardener decides what to change, she walks the rows: which beds are thriving, which are patchy, and what exactly went wrong in the patchy ones.

Count every kind of mistake the mini-batch network makes, rank the digits by how often they are found, list the worst pairs and collect the first twelve wrongly read glyphs. When this passes, the **Confusion matrix** panel opens: a ten by ten heat map of the counts, the per-digit recall and the actual mistakes with their true and guessed digit.`,
      tasks: [
        "confusion_matrix(y_true, y_pred, k=N_OUT): a k x k integer array, rows are the true digit and columns the guessed digit, built with np.add.at",
        "recall_by_digit(counts): a list with diagonal / row sum for each digit (0.0 for a digit that has no samples)",
        "top_confusions(counts, how_many): the biggest wrong pairs as [truth, guess, count] lists of plain ints, biggest first, never on the diagonal, never zero, ties in reading order, without changing counts",
        "wrong_indices(y_true, y_pred): the positions where they differ",
        "On the test set: preds_batch = predict_labels(params_batch, X_test), then cm, confusion (cm.tolist()), recalls, worst_pairs (top 5), wrong, and the first 12 mistakes as mistake_pixels, mistake_truth, mistake_guess (all .tolist())",
      ],
      starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 12: which digits get mistaken for which?


def confusion_matrix(y_true, y_pred, k=N_OUT):
    """A k x k table of whole numbers: counts[t, g] says how many samples of true digit t were
    guessed as g. Use np.add.at so repeated pairs are all counted."""
    ...


def recall_by_digit(counts):
    """For each digit, the diagonal entry divided by its row sum, as a plain list.
    A digit with no samples gets 0.0."""
    ...


def top_confusions(counts, how_many):
    """The most frequent wrong pairs: a list of [truth, guess, count] (plain ints), biggest first.
    Skip the diagonal and zero counts, break ties in reading order, and do not change counts."""
    ...


def wrong_indices(y_true, y_pred):
    """The positions where the guess differs from the truth."""
    ...


# Now read the mini-batch network's test mistakes. Replace the placeholders.
preds_batch = None                                # predict_labels(params_batch, X_test)
cm = None                                         # the confusion matrix of y_test vs preds_batch
confusion = []                                    # cm as a list of lists
recalls = []                                      # recall_by_digit(cm)
worst_pairs = []                                  # the 5 biggest wrong pairs
wrong = None                                      # wrong_indices(y_test, preds_batch)
mistake_pixels, mistake_truth, mistake_guess = [], [], []   # the first 12 mistakes as lists`,
      solutionAdd: py`def confusion_matrix(y_true, y_pred, k=N_OUT):
    """counts[t, g]: how many samples of true digit t were guessed as g."""
    counts = np.zeros((k, k), dtype=int)
    np.add.at(counts, (y_true, y_pred), 1)  # add.at counts repeated pairs; counts[...] += 1 would not
    return counts


def recall_by_digit(counts):
    """Diagonal over row sum for every digit (0.0 when a digit never occurs)."""
    return (np.diag(counts) / np.maximum(counts.sum(axis=1), 1)).tolist()


def top_confusions(counts, how_many):
    """The biggest wrong pairs as [truth, guess, count], biggest first, ties in reading order."""
    off = counts.copy()
    np.fill_diagonal(off, 0)
    order = np.argsort(-off.ravel(), kind="stable")[:how_many]
    return [[int(i // off.shape[1]), int(i % off.shape[1]), int(off.ravel()[i])] for i in order if off.ravel()[i] > 0]


def wrong_indices(y_true, y_pred):
    """Positions where the guess is not the truth."""
    return np.where(y_true != y_pred)[0]


preds_batch = predict_labels(params_batch, X_test)
cm = confusion_matrix(y_test, preds_batch)
confusion = cm.tolist()
recalls = recall_by_digit(cm)
worst_pairs = top_confusions(cm, 5)
wrong = wrong_indices(y_test, preds_batch)
mistake_pixels = X_test[wrong[:12]].tolist()
mistake_truth = y_test[wrong[:12]].tolist()
mistake_guess = preds_batch[wrong[:12]].tolist()`,
      explanation:
        "confusion_matrix starts from a k x k table of integer zeros and uses np.add.at, which adds once per occurrence, so a pair that appears many times is counted many times; rows are the truth and columns the guess, so the diagonal is the correct answers. recall_by_digit divides the diagonal by the row sums (with a floor of 1 so an absent digit gives 0.0, not nan). top_confusions works on a copy with the diagonal zeroed, sorts the flattened counts with a stable descending sort, converts positions back to (row, column) with // and %, and keeps only positive counts. wrong_indices is a boolean comparison turned into positions, and indexing the test arrays with its first twelve entries collects the pictures, truths and guesses the stage shows.",
      hints: [
        { id: "h1", title: "Counting pairs", content: "counts = np.zeros((k, k), dtype=int); np.add.at(counts, (y_true, y_pred), 1); return counts. recall_by_digit: return (np.diag(counts) / np.maximum(counts.sum(axis=1), 1)).tolist()." },
        { id: "h2", title: "Ranking the mistakes", content: "In top_confusions: off = counts.copy(); np.fill_diagonal(off, 0); flat = off.ravel(); order = np.argsort(-flat, kind=\"stable\")[:how_many]. Each i becomes [int(i // k), int(i % k), int(flat[i])] with k = off.shape[1]; skip entries where flat[i] is 0. wrong_indices: return np.where(y_true != y_pred)[0]." },
        { id: "h3", title: "The test-set results", content: "preds_batch = predict_labels(params_batch, X_test); cm = confusion_matrix(y_test, preds_batch); confusion = cm.tolist(); recalls = recall_by_digit(cm); worst_pairs = top_confusions(cm, 5); wrong = wrong_indices(y_test, preds_batch); mistake_pixels = X_test[wrong[:12]].tolist(); mistake_truth = y_test[wrong[:12]].tolist(); mistake_guess = preds_batch[wrong[:12]].tolist()." },
      ],
      tests: [
        {
          id: "t1",
          description: "confusion_matrix counts every (truth, guess) pair, repeats included",
          assertionCode: py`
assert callable(confusion_matrix), "confusion_matrix should be a function"
_t = np.array([0, 0, 1, 1, 1, 2, 2, 2, 2])
_p = np.array([0, 1, 1, 1, 2, 2, 2, 0, 2])
_got = confusion_matrix(_t, _p, 3)
assert _got is not None, "confusion_matrix returned None; it should return the table of counts"
assert isinstance(_got, np.ndarray) and _got.shape == (3, 3), f"for 3 digits the table should be a 3 x 3 array but it is {getattr(_got, 'shape', type(_got).__name__)}"
assert np.issubdtype(_got.dtype, np.integer), "the counts should be whole numbers: start from np.zeros((k, k), dtype=int)"
assert int(_got.sum()) == 9, f"every one of the 9 samples should be counted once, but the table adds up to {int(_got.sum())}: when the same (truth, guess) pair repeats, use np.add.at so every occurrence counts"
assert _got.tolist() == [[1, 1, 0], [0, 2, 1], [1, 0, 3]], f"rows are the true digit and columns the guess; expected [[1, 1, 0], [0, 2, 1], [1, 0, 3]] but got {_got.tolist()}"
_full = confusion_matrix(np.array([0, 9, 9]), np.array([0, 9, 8]))
assert _full.shape == (10, 10) and int(_full[9, 9]) == 1 and int(_full[9, 8]) == 1 and int(_full[0, 0]) == 1, "with the default k the table should be 10 x 10 with one count in each of (0, 0), (9, 9) and (9, 8)"
`,
        },
        {
          id: "t2",
          description: "recall_by_digit and top_confusions read the table correctly",
          assertionCode: py`
assert callable(recall_by_digit) and callable(top_confusions), "recall_by_digit and top_confusions should be functions"
_c = np.array([[1, 1, 0], [0, 2, 1], [1, 0, 3]])
_rec = recall_by_digit(_c)
assert _rec is not None, "recall_by_digit returned None; it should return a list of recalls"
assert isinstance(_rec, list) and len(_rec) == 3, f"recall_by_digit should return a plain list with one number per digit (3 here) but returned {type(_rec).__name__}"
assert np.allclose(_rec, [0.5, 2 / 3, 0.75]), f"recalls should be diagonal / row sum = [0.5, 0.667, 0.75] but got {_rec}"
_gap = recall_by_digit(np.array([[2, 0, 0], [1, 3, 0], [0, 0, 0]]))
assert np.all(np.isfinite(_gap)) and abs(_gap[2]) < 1e-12, f"a digit with no samples should have a recall of 0.0 (not nan), but the list is {_gap}"
_big = np.array([[5, 3, 0], [1, 4, 3], [3, 0, 6]])
_top = top_confusions(_big, 3)
assert _top is not None, "top_confusions returned None; it should return a list of [truth, guess, count]"
assert _top == [[0, 1, 3], [1, 2, 3], [2, 0, 3]], f"the three biggest wrong pairs, ties in reading order, are [[0, 1, 3], [1, 2, 3], [2, 0, 3]] but top_confusions returned {_top}"
assert all(type(_v) is int for _row in _top for _v in _row), "every number in top_confusions should be a plain Python int (wrap them in int(...))"
_all = top_confusions(_big, 10)
assert _all == [[0, 1, 3], [1, 2, 3], [2, 0, 3], [1, 0, 1]], f"asking for more pairs than exist should return only the wrong pairs with a count above zero, [[0, 1, 3], [1, 2, 3], [2, 0, 3], [1, 0, 1]], but got {_all}"
assert int(_big[0, 0]) == 5 and int(_big[1, 1]) == 4 and int(_big[2, 2]) == 6, "top_confusions must not change the matrix it is given: zero the diagonal on a copy"
`,
        },
        {
          id: "t3",
          description: "wrong_indices finds the positions of the mistakes",
          assertionCode: py`
assert callable(wrong_indices), "wrong_indices should be a function"
_got = wrong_indices(np.array([3, 1, 4, 1, 5]), np.array([3, 2, 4, 0, 5]))
assert _got is not None, "wrong_indices returned None; it should return the positions of the wrong answers"
assert np.asarray(_got).tolist() == [1, 3], f"the guesses at positions 1 and 3 are wrong, so wrong_indices should give [1, 3] but gave {np.asarray(_got).tolist()}"
_none = wrong_indices(np.array([2, 2]), np.array([2, 2]))
assert len(_none) == 0, "when every guess is right there are no wrong positions, so the result should be empty"
`,
        },
        {
          id: "t4",
          description: "the matrix, recalls and mistakes of the mini-batch network are published",
          assertionCode: py`
assert preds_batch is not None and cm is not None and wrong is not None, "preds_batch, cm and wrong are still empty: predict on X_test with params_batch, then build the matrix and the wrong positions"
assert np.array_equal(np.asarray(preds_batch), predict_labels(params_batch, X_test)), "preds_batch should be predict_labels(params_batch, X_test)"
assert np.asarray(cm).shape == (10, 10) and int(np.asarray(cm).sum()) == len(y_test), f"cm should be a 10 x 10 table that counts all {len(y_test)} test glyphs once"
assert np.array_equal(np.asarray(cm).sum(axis=1), np.bincount(y_test, minlength=10)), "the rows of cm are the true digits, so each row should add up to how many test glyphs show that digit (rows and columns may be swapped)"
assert abs(float(np.trace(np.asarray(cm))) / len(y_test) - accuracy(params_batch, X_test, y_test)) < 1e-12, "the diagonal of cm divided by the number of samples should equal the accuracy"
assert isinstance(confusion, list) and confusion == np.asarray(cm).tolist(), "confusion should be cm as a plain list of lists (cm.tolist())"
assert isinstance(recalls, list) and len(recalls) == 10 and np.allclose(recalls, np.diag(np.asarray(cm)) / np.asarray(cm).sum(axis=1)), "recalls should hold one recall per digit: the diagonal of cm over its row sums"
assert isinstance(worst_pairs, list) and 1 <= len(worst_pairs) <= 5 and all(len(_r) == 3 and _r[0] != _r[1] for _r in worst_pairs), "worst_pairs should be up to 5 [truth, guess, count] triples, none on the diagonal"
assert [_r[2] for _r in worst_pairs] == sorted([_r[2] for _r in worst_pairs], reverse=True) and worst_pairs[0][2] == max(int(_v) for _i, _row in enumerate(np.asarray(cm).tolist()) for _j, _v in enumerate(_row) if _i != _j), "worst_pairs should start with the most frequent mistake"
assert np.array_equal(np.asarray(wrong), np.where(y_test != preds_batch)[0]), "wrong should be the positions where the guess differs from the truth"
assert isinstance(mistake_pixels, list) and len(mistake_pixels) == 12 and len(mistake_pixels[0]) == 100, "mistake_pixels should be a list of the first 12 wrongly read glyphs, 100 numbers each (.tolist())"
assert np.allclose(mistake_pixels[0], X_test[wrong[0]]), "mistake_pixels[0] should be the picture of the first mistake"
assert mistake_truth == y_test[wrong[:12]].tolist() and mistake_guess == preds_batch[wrong[:12]].tolist(), "mistake_truth and mistake_guess should hold the true and the guessed digit of the first 12 mistakes, as lists"
assert all(_a != _b for _a, _b in zip(mistake_truth, mistake_guess)), "every mistake should have a guess that differs from the truth"
`,
        },
      ],
      unlocks: ["gn-confusion"],
      checks: [
        {
          prompt: "In the confusion matrix of the test set, the cell in row 5, column 8 holds the number 12. What does it say?",
          question: {
            type: "choice",
            options: [
              "Twelve pictures of a true 5 were read as an 8",
              "Twelve pictures of a true 8 were read as a 5",
              "The network is 12% accurate on the digit 5",
              "There are twelve 5s and twelve 8s in the test set",
            ],
            answer: 0,
            feedback: {
              1: "That would be row 8, column 5. Rows are the true digit and columns are the guess.",
              2: "A cell is a count of pictures, not a percentage, and accuracy for a digit lives on the diagonal.",
              3: "The cell only counts the pictures that were a 5 and got called an 8.",
            },
          },
          explanation: "Row = truth, column = guess. Row 5, column 8 counts the true 5s that the network called 8. The cell for 8s that were called 5 is row 8, column 5, a different number.",
        },
        {
          prompt: "A 3-digit confusion matrix has the rows [5, 3, 0], [1, 4, 3] and [3, 0, 6]. What is the accuracy, as a fraction between 0 and 1?",
          question: { type: "number", answer: 0.6, tolerance: 0.001 },
          explanation: "The diagonal holds 5 + 4 + 6 = 15 correct answers and the whole table adds up to 8 + 8 + 9 = 25 samples, so the accuracy is 15 / 25 = 0.6.",
        },
      ],
    },
  ],
};
