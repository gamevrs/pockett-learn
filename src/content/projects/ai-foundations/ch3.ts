import type { Chapter } from "@/engine/types";
import { md, py } from "./util.ts";

/**
 * Chapter 3: Learning with numbers. A line as a model and the mean squared error, gradient descent
 * from scratch, many features in matrix form, and logistic regression for ripeness.
 *
 * Names this chapter adds that later chapters rely on: WEIGHT_UNIT, price_train, price_test,
 * x_train, x_test, line_predict, mse, add_bias, predict_linear, train_linear, Ztr, Zte,
 * price_weights, price_for, sigmoid, log_loss, train_logistic, SUGAR, ripe_train, ripe_test, Str,
 * Ste, ripe_weights, ripe_probability, p_test.
 */

export const chapter3: Chapter = {
  id: "models",
  title: "Learning with numbers",
  blurb: "Fit a price line, let gradient descent find it, then predict ripeness with probabilities.",
  lessons: [
    // ───────────────────────── 9 ─────────────────────────
    {
      id: "ai-foundations-9-line",
      title: "A line as a model: predicting price",
      minutes: 24,
      xp: 120,
      concepts: ["regression", "linear model", "slope and intercept", "mean squared error", "brute-force search"],
      learn: md`### From categories to numbers

So far the answer was a **category** (apple, pear, plum): that is **classification**. Now the farm wants a **price** for each fruit, which is a *number* that can be anything in a range. Predicting a number is called **regression**.

Plot weight (across) against price (up) and the fruit form a loose upward-sloping cloud: heavier fruit cost more. The simplest model that captures this is a straight line.

### A line has two knobs

~~~text
price = w * weight + b
~~~

- \`w\` is the **slope** (or *weight* in machine-learning speak): how many dollars each extra unit of weight adds.
- \`b\` is the **intercept** (the *bias*): the price when the weight is zero, where the line starts.

Those two numbers are the model's **parameters**. Learning means finding good values for them.

To keep the numbers friendly we measure weight in **hundreds of grams** (\`weight / 100\`), so a 250 g fruit has \`x = 2.5\`. With \`w = 0.25\` and \`b = 0.50\` that fruit is predicted to cost \`0.25 * 2.5 + 0.50 = 1.125\`.

### How wrong is a line?

For one fruit, the **error** is prediction minus truth. To score a whole line we average the errors, but plain errors cancel out (+0.2 and -0.2 average to zero, which looks perfect). So we **square** each error first and then average. That is the **mean squared error** (MSE):

~~~text
fruit   x    truth  prediction  error   squared
  1    1.0   0.80     0.75      -0.05   0.0025
  2    2.0   1.10     1.00      -0.10   0.0100
  3    3.0   1.40     1.25      -0.15   0.0225
MSE = (0.0025 + 0.0100 + 0.0225) / 3 = 0.0117
~~~

Squaring has two nice side effects: every error counts as positive, and one big miss hurts far more than several small ones. A lower MSE means a better line. A perfect line has MSE 0.

### Searching for the best line

Where do good values of \`w\` and \`b\` come from? The most direct idea: try lots of combinations and keep the one with the lowest MSE.

~~~python
for w in [0.00, 0.05, 0.10, ...]:
    for b in [0.00, 0.05, 0.10, ...]:
        error = mse(prices, w * x + b)
~~~

This **brute-force search** works fine for two knobs. But a model with 10 knobs and 20 values each needs 20^10 (ten trillion) tries. We need a smarter search, and that is the next lesson.

### The honest way: fit on training, score on test

Everything from the last chapter still applies. We fit the line on the **training** fruit and judge it on the **test** fruit. Here \`x_train\` and \`price_train\` are the weights (in hundreds of grams) and prices of the 180 training fruit.

### Common mistakes

- Averaging raw errors instead of squared errors.
- Forgetting to divide the weight by \`WEIGHT_UNIT\` before predicting.
- Mixing up the order of the arguments to \`mse\`: the order does not change the number, but a consistent order keeps your code readable.`,
      mission: md`The farm wants to price each fruit as it is sorted, and the rule of thumb is "heavier costs more". Turn that hunch into a model: a straight line from weight to price.

Write the line, write the score, and let the computer try a few hundred lines to find the best one. When this passes, the **Price line** panel appears: the training fruit as dots, your line through them and a drop-line from every dot showing its error.`,
      tasks: [
        "line_predict(x, w, b): the line's prediction w * x + b (it must work on a single number or a whole array)",
        "mse(y_true, y_pred): the mean squared error as a plain float",
        "search_line(x, t): try w from 0 to 0.60 and b from 0 to 1.00 in steps of 0.05 and return (best_w, best_b, best_error)",
        "WEIGHT_UNIT = 100, then x_train, x_test (weights in hundreds of grams) and price_train, price_test",
        "line_w, line_b, search_mse from search_line on the training fruit",
      ],
      starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 9: a straight line from weight to price.

WEIGHT_UNIT = 100.0   # we measure weight in hundreds of grams to keep the numbers friendly

# The prices to learn from, and the weights as hundreds of grams. Replace the placeholders:
price_train, price_test = None, None   # prices[train_idx] and prices[test_idx]
x_train, x_test = None, None           # the weight column of X_train / X_test divided by WEIGHT_UNIT


def line_predict(x, w, b):
    """The line's prediction: w * x + b."""
    ...


def mse(y_true, y_pred):
    """Mean squared error as a plain float: the average of (prediction - truth) squared."""
    ...


def search_line(x, t):
    """Brute force: for w in 0, 0.05, ... 0.60 and b in 0, 0.05, ... 1.00 find the pair with the
    lowest mse. Return (best_w, best_b, best_error), rounding w and b to 2 decimals."""
    ...


line_w, line_b, search_mse = 0.0, 0.0, 0.0   # the best line on the training fruit`,
      solutionAdd: py`WEIGHT_UNIT = 100.0

price_train = prices[train_idx]
price_test = prices[test_idx]
x_train = X_train[:, 0] / WEIGHT_UNIT
x_test = X_test[:, 0] / WEIGHT_UNIT


def line_predict(x, w, b):
    return w * x + b


def mse(y_true, y_pred):
    errors = np.asarray(y_pred, dtype=float) - np.asarray(y_true, dtype=float)
    return float((errors ** 2).mean())


def search_line(x, t):
    best_w, best_b, best_error = 0.0, 0.0, None
    for step_w in range(13):
        for step_b in range(21):
            w = step_w * 0.05
            b = step_b * 0.05
            error = mse(t, line_predict(x, w, b))
            if best_error is None or error < best_error:
                best_w, best_b, best_error = round(w, 2), round(b, 2), error
    return best_w, best_b, best_error


line_w, line_b, search_mse = search_line(x_train, price_train)`,
      explanation:
        "line_predict is the whole model, and because it only uses * and + it works on one number or on an entire array. mse subtracts, squares and averages, and float() hands back a plain number. search_line walks a grid of (w, b) pairs, scoring each with mse, and remembers the lowest. It finds a line close to the best possible, but notice how many times mse is called: 13 x 21 = 273 for just two parameters. That cost explodes with more parameters, which is why we need gradient descent next.",
      hints: [
        { id: "h1", title: "Prediction and error", content: "line_predict: return w * x + b. mse: errors = np.asarray(y_pred, dtype=float) - np.asarray(y_true, dtype=float); return float((errors ** 2).mean())." },
        { id: "h2", title: "The search loops", content: "Nested loops: for step_w in range(13): for step_b in range(21): w = step_w * 0.05; b = step_b * 0.05. Score each pair with mse(t, line_predict(x, w, b)) and keep the smallest (start with best_error = None)." },
        { id: "h3", title: "Data columns", content: "x_train = X_train[:, 0] / WEIGHT_UNIT (column 0 is the weight), price_train = prices[train_idx], and the same for the test fruit. Then line_w, line_b, search_mse = search_line(x_train, price_train)." },
      ],
      tests: [
        {
          id: "t1",
          description: "line_predict evaluates w * x + b for numbers and arrays",
          assertionCode: py`
assert abs(line_predict(2.5, 0.25, 0.5) - 1.125) < 1e-9, f"line_predict(2.5, 0.25, 0.5) should be 1.125 but is {line_predict(2.5, 0.25, 0.5)!r}"
_got = np.asarray(line_predict(np.array([1.0, 2.0, 3.0]), 0.5, 1.0), dtype=float)
assert np.allclose(_got, [1.5, 2.0, 2.5]), f"it should work on a whole array at once: expected [1.5, 2.0, 2.5] but got {_got.tolist()!r}"
`,
        },
        {
          id: "t2",
          description: "mse averages the squared errors",
          assertionCode: py`
assert mse([1, 2, 3], [1, 2, 3]) == 0.0, "a perfect prediction has an error of 0"
assert abs(mse([0, 0], [1, 3]) - 5.0) < 1e-9, f"mse([0, 0], [1, 3]) is (1 + 9) / 2 = 5.0 but is {mse([0, 0], [1, 3])!r}"
assert abs(mse(np.array([0.8, 1.1, 1.4]), np.array([0.75, 1.0, 1.25])) - 0.011666666) < 1e-6, "the fruit example from the lesson has an MSE of about 0.0117"
assert abs(mse([2, 4], [4, 2]) - mse([4, 2], [2, 4])) < 1e-12, "swapping the arguments does not change an MSE"
assert type(mse([1.0], [2.0])) is float, "return a plain float"
`,
        },
        {
          id: "t3",
          description: "search_line finds a perfect line when there is one",
          assertionCode: py`
_x = np.array([0.0, 1.0, 2.0, 3.0])
_got = search_line(_x, 0.5 * _x + 1.0)
assert isinstance(_got, tuple) and len(_got) == 3, "search_line should return (best_w, best_b, best_error)"
assert abs(_got[0] - 0.5) < 1e-9 and abs(_got[1] - 1.0) < 1e-9, f"the data lie exactly on price = 0.5 * x + 1.0 so search_line should find w=0.5 and b=1.0 but found w={_got[0]!r}, b={_got[1]!r}"
assert _got[2] < 1e-9, "a perfect line has an error of 0"
`,
        },
        {
          id: "t4",
          description: "the weights are in hundreds of grams and lined up with the prices",
          assertionCode: py`
assert WEIGHT_UNIT == 100, "WEIGHT_UNIT should be 100 (we measure weight in hundreds of grams)"
assert np.asarray(x_train).shape == (180,) and np.asarray(x_test).shape == (60,), "x_train should have 180 weights and x_test 60"
assert abs(float(x_train[0]) * WEIGHT_UNIT - float(X_train[0, 0])) < 1e-6, "x_train should be the weight column divided by WEIGHT_UNIT"
assert np.array_equal(np.asarray(price_train), prices[train_idx]) and np.array_equal(np.asarray(price_test), prices[test_idx]), "price_train / price_test should be prices[train_idx] / prices[test_idx]"
`,
        },
        {
          id: "t5",
          description: "line_w, line_b and search_mse describe the best line on the training fruit",
          assertionCode: py`
assert 0.0 <= line_w <= 0.6 and 0.0 <= line_b <= 1.0, f"the search covers w in 0..0.6 and b in 0..1.0 but found w={line_w!r}, b={line_b!r}"
assert line_w > 0.1, f"heavier fruit cost more, so the slope should be clearly positive but line_w is {line_w!r}"
assert abs(search_mse - mse(price_train, line_predict(x_train, line_w, line_b))) < 1e-9, "search_mse should be the training MSE of your line"
assert search_mse < float(np.asarray(price_train).var()) * 0.5, "a real line should explain well over half of the price variation (its MSE should be well below the variance of the prices)"
`,
        },
      ],
      unlocks: ["oa-line"],
      checks: [
        {
          prompt: "A line has slope w = 0.25 and intercept b = 0.50. What price does it predict for x = 2 (that is, 200 g)?",
          question: { type: "number", answer: 1 },
          explanation: "0.25 * 2 + 0.50 = 1.00.",
        },
        {
          prompt: "Why do we square the errors before averaging them?",
          question: {
            type: "choice",
            options: [
              "So positive and negative errors cannot cancel out, and big misses count extra",
              "Squaring makes the numbers smaller",
              "NumPy can only add positive numbers",
              "It makes the line steeper",
            ],
            answer: 0,
          },
          explanation: "Plain errors of +0.2 and -0.2 average to zero, which would look perfect. Squared, both count as 0.04, and a miss of 1.0 counts 100 times as much as a miss of 0.1.",
        },
        {
          prompt: "Why is brute-force search a bad plan for a model with 10 parameters?",
          question: {
            type: "choice",
            options: [
              "The number of combinations to try grows explosively with every extra parameter",
              "Brute force cannot find the best answer even for two parameters",
              "MSE cannot be computed for 10 parameters",
              "Parameters must be whole numbers",
            ],
            answer: 0,
          },
          explanation: "With 20 candidate values per knob, one knob needs 20 tries, two need 400, and ten need 20^10, about ten trillion. We need a method that follows a direction instead of trying everything.",
        },
      ],
    },

    // ───────────────────────── 10 ─────────────────────────
    {
      id: "ai-foundations-10-descent",
      title: "Gradient descent from scratch",
      minutes: 30,
      xp: 140,
      concepts: ["gradient", "learning rate", "epochs", "loss curve", "divergence"],
      learn: md`### Walking downhill in the fog

Picture the MSE as a landscape: the two knobs \`w\` and \`b\` are your position on the map, and the height is the error. The best line is the lowest valley. You cannot see the whole map, but you can feel the **slope** under your feet. So: step a little in the downhill direction, feel the slope again, step again. That is **gradient descent**, the engine behind nearly all modern machine learning.

### The slope, in two formulas

The slope of the error with respect to each knob is called the **gradient**. Calculus gives it for the MSE of a line (you do not have to derive it, only to trust and use it):

~~~text
error  = prediction - truth                      for each fruit
dw     = average of (2 * error * x)              how the loss changes if w grows
db     = average of (2 * error)                  how the loss changes if b grows
~~~

If \`dw\` is positive, increasing \`w\` makes things worse, so we should decrease it. That gives the update rule:

~~~text
w = w - learning_rate * dw
b = b - learning_rate * db
~~~

### One step by hand

One fruit: x = 1, truth t = 3. Start with w = 0, b = 0.

- prediction 0, error = 0 - 3 = -3
- dw = 2 * (-3) * 1 = -6, db = 2 * (-3) = -6
- with learning rate 0.1: w = 0 - 0.1 * (-6) = 0.6, b = 0.6
- new prediction 0.6 * 1 + 0.6 = 1.2, error -1.8. Closer already!

Repeat, and the prediction creeps towards 3.

### The learning rate: the step size

The **learning rate** decides how big each step is.

- **Too small**: you creep downhill and need thousands of steps.
- **Just right**: a smooth descent that settles at the bottom.
- **Too big**: you overshoot the valley, land higher on the other side, and each step makes it worse. The loss **diverges**, growing instead of shrinking.

One full pass of updates is an **epoch** (here every epoch uses all the training fruit). We train for a fixed number of epochs.

### The loss curve

Record the loss after each epoch and plot it: that is the **loss curve**. It is the most useful picture in machine learning. A healthy curve drops fast and then flattens. A curve that wobbles up and down says the learning rate is too big; one that barely moves says it is too small, or training is already finished.

Recording the history as a list of small dicts (\`{"epoch": 1, "loss": 0.03, "w": 0.2, "b": 0.1}\`) lets you replay the whole journey later, which is exactly what the scene does.

### Common mistakes

- Using \`+\` instead of \`-\` in the update, so the line climbs the hill.
- Forgetting the factor 2, which just changes the effective learning rate but confuses checks.
- Updating \`w\` and then computing \`db\` from the *new* \`w\`. Compute both gradients first, then update both.
- A learning rate so big that the loss turns into \`inf\` or \`nan\`.`,
      mission: md`Trying 273 lines was fine for two knobs, but your next model has five, and the one after that will have thousands. You need a search that follows the slope.

Write the gradient and the training loop, record the loss at every step, and rediscover the price line by walking downhill. When this passes, the **Gradient descent** panel opens: a loss curve that falls as you scrub through your training run, and the line sweeping into place.`,
      tasks: [
        "gradient(x, t, w, b): return (dw, db) for the MSE of the line, as two plain floats",
        "train_line(x, t, lr, epochs): start at w = 0, b = 0, step downhill each epoch and return (w, b, history)",
        'history is a list with one dict per epoch: {"epoch": 1, "loss": ..., "w": ..., "b": ...}',
        "line_w, line_b, fit_history = train_line(x_train, price_train, 0.1, 150), then loss_history (a list of the losses) and line_test_mse",
      ],
      starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 10: gradient descent. Walk downhill instead of trying every line.


def gradient(x, t, w, b):
    """The slope of the MSE: return (dw, db) as plain floats.
    error = prediction - truth;  dw = mean(2 * error * x);  db = mean(2 * error)"""
    ...


def train_line(x, t, lr, epochs):
    """Start from w = 0, b = 0. Each epoch: compute the gradient, update w and b, then record
    {"epoch": n, "loss": mse after the update, "w": w, "b": b}. Return (w, b, history)."""
    ...


# Train on the training fruit: learning rate 0.1 for 150 epochs. Replace the placeholders:
line_w, line_b, fit_history = 0.0, 0.0, []
loss_history = []       # just the "loss" of each epoch, as a list
line_test_mse = 0.0     # how wrong is the final line on the TEST fruit?`,
      solutionAdd: py`def gradient(x, t, w, b):
    errors = line_predict(x, w, b) - t
    return float((2 * errors * x).mean()), float((2 * errors).mean())


def train_line(x, t, lr, epochs):
    w, b = 0.0, 0.0
    history = []
    for epoch in range(epochs):
        dw, db = gradient(x, t, w, b)
        w -= lr * dw
        b -= lr * db
        history.append({"epoch": epoch + 1, "loss": mse(t, line_predict(x, w, b)), "w": w, "b": b})
    return w, b, history


line_w, line_b, fit_history = train_line(x_train, price_train, 0.1, 150)
loss_history = [step["loss"] for step in fit_history]
line_test_mse = mse(price_test, line_predict(x_test, line_w, line_b))`,
      explanation:
        "gradient reuses line_predict to get each fruit's error, then averages 2*error*x for the slope in w and 2*error for the slope in b. train_line repeats the downhill step: both gradients are computed from the current w and b before either is updated, and every epoch's loss, w and b are saved so the whole journey can be replayed. With a learning rate of 0.1 the loss falls quickly and flattens near the same line the brute-force search found, but it needed 150 cheap steps instead of 273 blind guesses, and the cost barely grows with more knobs.",
      hints: [
        { id: "h1", title: "The gradient", content: "errors = line_predict(x, w, b) - t. Then dw = float((2 * errors * x).mean()) and db = float((2 * errors).mean()). Return dw, db." },
        { id: "h2", title: "The loop", content: "w, b = 0.0, 0.0; history = []. In each epoch: dw, db = gradient(x, t, w, b); w -= lr * dw; b -= lr * db; then history.append({...}) with mse(t, line_predict(x, w, b)). Return w, b, history." },
        { id: "h3", title: "Using it", content: 'line_w, line_b, fit_history = train_line(x_train, price_train, 0.1, 150); loss_history = [step["loss"] for step in fit_history]; line_test_mse = mse(price_test, line_predict(x_test, line_w, line_b)).' },
      ],
      tests: [
        {
          id: "t1",
          description: "gradient points uphill (and is zero at a perfect fit)",
          assertionCode: py`
_x = np.array([1.0, 2.0])
_t = np.array([3.0, 5.0])
_dw, _db = gradient(_x, _t, 0.0, 0.0)
assert abs(_dw - (-13.0)) < 1e-9 and abs(_db - (-8.0)) < 1e-9, f"errors are [-3, -5], so dw = mean(2*e*x) = -13 and db = mean(2*e) = -8, but got ({_dw!r}, {_db!r})"
_dw, _db = gradient(_x, _t, 2.0, 1.0)
assert abs(_dw) < 1e-9 and abs(_db) < 1e-9, "at the perfect line y = 2x + 1 both slopes are 0"
assert type(_dw) is float and type(_db) is float, "return plain floats"
`,
        },
        {
          id: "t2",
          description: "train_line walks to the right line",
          assertionCode: py`
_x = np.array([0.0, 1.0, 2.0, 3.0])
_w, _b, _hist = train_line(_x, 1.0 + 2.0 * _x, 0.1, 500)
assert abs(_w - 2.0) < 0.05 and abs(_b - 1.0) < 0.05, f"the data lie on y = 2x + 1; gradient descent should end close to w=2, b=1 but got w={_w:.3f}, b={_b:.3f}"
assert len(_hist) == 500, f"history should have one entry per epoch (500) but has {len(_hist)}"
`,
        },
        {
          id: "t3",
          description: "the history records epoch, loss, w and b, and the loss falls",
          assertionCode: py`
_x = np.array([0.0, 1.0, 2.0, 3.0])
_w, _b, _hist = train_line(_x, 1.0 + 2.0 * _x, 0.1, 100)
assert isinstance(_hist[0], dict) and set(_hist[0]) == {"epoch", "loss", "w", "b"}, f"each history entry should be a dict with the keys epoch, loss, w and b but is {_hist[0]!r}"
assert _hist[0]["epoch"] == 1 and _hist[-1]["epoch"] == 100, "epochs should be numbered from 1"
assert _hist[-1]["loss"] < _hist[0]["loss"] / 10, "after 100 epochs the loss should be far lower than after the first"
assert abs(_hist[-1]["w"] - _w) < 1e-12 and abs(_hist[-1]["b"] - _b) < 1e-12, "the last history entry should hold the final w and b"
`,
        },
        {
          id: "t4",
          description: "a learning rate that is too big makes the loss grow",
          assertionCode: py`
_x = np.array([0.0, 1.0, 2.0, 3.0])
_w, _b, _hist = train_line(_x, 1.0 + 2.0 * _x, 1.0, 30)
assert _hist[-1]["loss"] > _hist[0]["loss"], "with a learning rate of 1.0 the steps overshoot, so the loss should grow. Check that you subtract lr * gradient"
`,
        },
        {
          id: "t5",
          description: "the trained price line fits the training fruit",
          assertionCode: py`
assert len(fit_history) == 150, f"fit_history should have 150 entries (one per epoch) but has {len(fit_history)}"
assert loss_history == [_s["loss"] for _s in fit_history], "loss_history should be the list of the losses in fit_history"
assert loss_history[-1] < loss_history[0], "the loss should fall during training"
_slope, _icept = np.polyfit(np.asarray(x_train, dtype=float), np.asarray(price_train, dtype=float), 1)
assert abs(line_w - _slope) < 0.03 and abs(line_b - _icept) < 0.05, f"gradient descent should land near the best possible line (w={_slope:.3f}, b={_icept:.3f}) but ended at w={line_w:.3f}, b={line_b:.3f}"
`,
        },
        {
          id: "t6",
          description: "line_test_mse scores the line on fruit it never trained on",
          assertionCode: py`
assert abs(line_test_mse - mse(price_test, line_predict(x_test, line_w, line_b))) < 1e-9, "line_test_mse should be the MSE of your line on x_test / price_test"
assert 0 < line_test_mse < 0.05, f"line_test_mse looks off: {line_test_mse!r}"
`,
        },
      ],
      unlocks: ["oa-descent"],
      checks: [
        {
          prompt: "At the current `w`, `dw` is positive. What should the update do to `w`?",
          question: { type: "choice", options: ["Decrease it", "Increase it", "Leave it alone", "Set it to zero"], answer: 0 },
          explanation: "A positive slope means the loss rises as w rises, so we walk the other way. The update subtracts the gradient: w = w - lr * dw.",
        },
        {
          prompt: "You train with a huge learning rate and the loss gets bigger every epoch. What is happening?",
          question: {
            type: "choice",
            options: [
              "The steps overshoot the valley, so each one lands higher (divergence)",
              "The model has already found the best line",
              "The data are too small",
              "The loss is in different units",
            ],
            answer: 0,
          },
          explanation: "A step that is too long jumps right across the valley and up the other side. Lower the learning rate.",
        },
        {
          prompt: "What does one **epoch** mean in our training loop?",
          question: {
            type: "choice",
            options: [
              "One full update of the parameters using all the training fruit",
              "One fruit going past the camera",
              "One test of the final model",
              "One line of Python",
            ],
            answer: 0,
          },
          explanation: "An epoch is one pass over the training data. We run many epochs, each nudging the parameters a little further downhill.",
        },
      ],
    },

    // ───────────────────────── 11 ─────────────────────────
    {
      id: "ai-foundations-11-matrix",
      title: "Many features at once: dot products and matrices",
      minutes: 28,
      xp: 140,
      concepts: ["multiple regression", "dot product", "matrix form", "bias trick", "feature weights"],
      learn: md`### Price depends on more than weight

Weight explains much of the price, but sugar matters too: sweeter fruit sell for more. With several features the model becomes a **weighted sum**:

~~~text
price = w1 * weight + w2 * diameter + w3 * hue + w4 * sugar + b
~~~

Each feature gets its own **weight** (a knob). A large positive weight says "this feature pushes the price up strongly"; near zero says "it hardly matters".

### The dot product

Multiply two equal-length lists element by element and add the results: that is the **dot product**.

~~~text
[2, 3] . [1.0, 0.5]  =  2*1.0 + 3*0.5  =  3.5
~~~

A weighted sum is exactly a dot product of the weights with the feature values. In NumPy it is the \`@\` operator (or \`np.dot\`).

### Doing every fruit at once: matrix form

\`@\` also multiplies a table by a list of weights, giving one prediction per row:

~~~python
Zb @ weights        # (180, 5) @ (5,) -> (180,)  one price per training fruit
~~~

No loop over fruit. The shape rule to remember: the **last** dimension of the left side must match the length of the right side.

### The bias trick

The intercept \`b\` is annoying: it is the one knob with no feature attached. A neat trick gives it one: add a column of **ones** to the table, so \`b\` becomes just another weight, multiplied by a feature that is always 1.

~~~python
def add_bias(Z):
    return np.column_stack([Z, np.ones(len(Z))])    # (180, 4) -> (180, 5)
~~~

Now the model is simply \`predictions = Zb @ weights\`, and the last weight is the intercept.

### Gradient descent in matrix form

The same recipe as before, but for all weights at once. The vector of gradients is:

~~~text
errors   = Zb @ weights - t
gradient = 2 * (Zb.T @ errors) / number_of_fruit
weights  = weights - lr * gradient
~~~

\`Zb.T\` is the table flipped on its side (rows become columns), so \`Zb.T @ errors\` adds up, for each feature, "how much did the errors correlate with this feature?". It is the earlier \`mean(2 * error * x)\` for every feature in one line.

### Why we scale first

With every feature z-scored (lesson 4), one learning rate suits all the weights, and gradient descent behaves. Raw grams next to raw Brix would force a tiny learning rate for one and a big one for the other. Scaling is not just for distances.

### Reading the weights

After training you can *read* the model: on scaled features, the weight of each column says how many dollars one standard deviation of that feature is worth. It is a first taste of **interpretability**, knowing why a model answers as it does.

### Common mistakes

- Forgetting the column of ones, so the model cannot shift up or down.
- Shape errors from mixing up \`(n,)\` and \`(n, 1)\`. Print \`.shape\` when \`@\` complains.
- Using unscaled features, then wondering why training explodes or crawls.
- Predicting for a new fruit without scaling and adding the 1 for the bias.`,
      mission: md`A price from weight alone is rough. Your sensors measure four things, so let the model use all of them, with the same gradient descent you already wrote, just in matrix form.

Build the bias trick, the vectorised trainer and a \`price_for(features)\` function for raw fruit. When this passes, the **Price model** panel opens: predicted against actual price for the test fruit, with a bar for what each feature is worth.`,
      tasks: [
        "add_bias(Z): return Z with an extra column of ones appended",
        "predict_linear(Zb, weights): one prediction per row, using @ (accept a plain list of weights)",
        "train_linear(Zb, t, lr, epochs): vectorised gradient descent from all-zero weights; return (weights as a plain list, history as a list of losses)",
        "Ztr, Zte (the scaled training / test fruit with the bias column), then price_weights, price_loss_history, price_train_mse, price_test_mse (lr 0.1, 400 epochs)",
        "price_for(features): the predicted price of one raw fruit",
      ],
      starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 11: price from all four measurements, in matrix form.


def add_bias(Z):
    """Append a column of ones: (n, d) -> (n, d + 1). np.column_stack helps."""
    ...


def predict_linear(Zb, weights):
    """One prediction per row: Zb @ weights."""
    ...


def train_linear(Zb, t, lr, epochs):
    """Gradient descent from all-zero weights.
    Each epoch: errors = predictions - t;  weights = weights - lr * 2 * (Zb.T @ errors) / len(t).
    Record the mean squared error of that epoch's errors. Return (weights.tolist(), history)."""
    ...


# Add the bias column to the scaled fruit, then train. Replace the placeholders:
Ztr, Zte = None, None
price_weights, price_loss_history = [], []     # lr 0.1, 400 epochs on Ztr / price_train
price_train_mse, price_test_mse = 0.0, 0.0


def price_for(features):
    """The predicted price (a float) of one RAW fruit [weight, diameter, hue, sugar]:
    scale it, append the 1 for the bias, and take the dot product with price_weights."""
    ...`,
      solutionAdd: py`def add_bias(Z):
    return np.column_stack([Z, np.ones(len(Z))])


def predict_linear(Zb, weights):
    return Zb @ np.asarray(weights)


def train_linear(Zb, t, lr, epochs):
    weights = np.zeros(Zb.shape[1])
    history = []
    for epoch in range(epochs):
        errors = predict_linear(Zb, weights) - t
        weights = weights - lr * 2 * (Zb.T @ errors) / len(t)
        history.append(float((errors ** 2).mean()))
    return weights.tolist(), history


Ztr = add_bias(Xtr)
Zte = add_bias(Xte)
price_weights, price_loss_history = train_linear(Ztr, price_train, 0.1, 400)
price_train_mse = mse(price_train, predict_linear(Ztr, price_weights))
price_test_mse = mse(price_test, predict_linear(Zte, price_weights))


def price_for(features):
    z = np.append(scale_one(features), 1.0)
    return float(z @ np.asarray(price_weights))`,
      explanation:
        "add_bias glues a column of ones onto the table so the intercept becomes just another weight. predict_linear is one matrix-vector product. train_linear is lesson 10's loop with every weight updated at once: Zb.T @ errors is the per-feature version of mean(error * x). price_for repeats the whole chain for a single raw fruit: scale it with the learned scaler, append the 1, and dot with the weights. The test MSE is far lower than the one-feature line's, so sugar and the other measurements carry real information.",
      hints: [
        { id: "h1", title: "Bias and prediction", content: "add_bias: np.column_stack([Z, np.ones(len(Z))]). predict_linear: Zb @ np.asarray(weights) (the asarray lets a plain list of weights work too)." },
        { id: "h2", title: "The training loop", content: "weights = np.zeros(Zb.shape[1]). Each epoch: errors = predict_linear(Zb, weights) - t; weights = weights - lr * 2 * (Zb.T @ errors) / len(t); history.append(float((errors ** 2).mean())). Return weights.tolist(), history." },
        { id: "h3", title: "One raw fruit", content: "z = np.append(scale_one(features), 1.0) adds the bias 1 to the scaled fruit. Then return float(z @ np.asarray(price_weights))." },
      ],
      tests: [
        {
          id: "t1",
          description: "add_bias appends a column of ones",
          assertionCode: py`
_got = np.asarray(add_bias(np.array([[1.0, 2.0], [3.0, 4.0]])), dtype=float)
assert _got.shape == (2, 3), f"add_bias should turn a (2, 2) table into (2, 3) but the shape is {_got.shape}"
assert np.allclose(_got, [[1, 2, 1], [3, 4, 1]]), f"expected [[1, 2, 1], [3, 4, 1]] but got {_got.tolist()!r}"
`,
        },
        {
          id: "t2",
          description: "predict_linear is a matrix-vector product",
          assertionCode: py`
_zb = np.array([[1.0, 0.0, 1.0], [0.0, 1.0, 1.0]])
_got = np.asarray(predict_linear(_zb, [2.0, 3.0, 1.0]), dtype=float)
assert _got.shape == (2,), f"one prediction per row: shape (2,) but got {_got.shape}"
assert np.allclose(_got, [3.0, 4.0]), f"expected [3.0, 4.0] but got {_got.tolist()!r}"
`,
        },
        {
          id: "t3",
          description: "train_linear recovers the weights of a known formula",
          assertionCode: py`
_z = np.array([[0.0, 0.0], [1.0, 0.0], [0.0, 1.0], [1.0, 1.0], [2.0, 1.0], [1.0, 2.0]])
_t = 2.0 * _z[:, 0] + 3.0 * _z[:, 1] + 1.0
_w, _h = train_linear(add_bias(_z), _t, 0.1, 800)
assert isinstance(_w, list) and len(_w) == 3, "return the weights as a plain list of 3 numbers (weights.tolist())"
assert np.allclose(_w, [2.0, 3.0, 1.0], atol=0.05), f"the data follow 2*a + 3*b + 1, so the weights should end near [2, 3, 1] but are {[round(_v, 3) for _v in _w]!r}"
assert isinstance(_h, list) and len(_h) == 800 and _h[-1] < _h[0] / 100, "history should hold one loss per epoch and the loss should fall a lot"
`,
        },
        {
          id: "t4",
          description: "the scaled train and test tables have the bias column",
          assertionCode: py`
assert np.asarray(Ztr).shape == (180, 5) and np.asarray(Zte).shape == (60, 5), "Ztr should be (180, 5) and Zte (60, 5): the four scaled features plus a column of ones"
assert np.allclose(np.asarray(Ztr)[:, -1], 1.0) and np.allclose(np.asarray(Zte)[:, -1], 1.0), "the last column should be all ones"
assert np.allclose(np.asarray(Ztr)[:, :4], Xtr), "the first four columns should be the scaled training fruit, Xtr"
`,
        },
        {
          id: "t5",
          description: "the trained price model beats the one-feature line",
          assertionCode: py`
assert isinstance(price_weights, list) and len(price_weights) == 5, "price_weights should be a plain list of 5 numbers (four features plus the bias)"
assert len(price_loss_history) == 400 and price_loss_history[-1] < price_loss_history[0], "price_loss_history should have 400 losses and the loss should fall"
assert abs(price_train_mse - mse(price_train, predict_linear(Ztr, price_weights))) < 1e-9, "price_train_mse is the MSE on the training fruit"
assert abs(price_test_mse - mse(price_test, predict_linear(Zte, price_weights))) < 1e-9, "price_test_mse is the MSE on the test fruit"
assert price_test_mse < line_test_mse, f"using all four measurements should beat the weight-only line ({line_test_mse:.4f}) but price_test_mse is {price_test_mse:.4f}"
assert price_weights[0] > 0 and price_weights[3] > 0, "heavier and sweeter fruit should cost more: the weight and sugar weights should be positive"
`,
        },
        {
          id: "t6",
          description: "price_for prices a raw fruit",
          assertionCode: py`
_f = X_test[0].tolist()
_i = float(predict_linear(Zte, price_weights)[0])
_got = price_for(_f)
assert type(_got) is float, f"price_for should return a plain float but returned {type(_got).__name__}"
assert abs(_got - _i) < 1e-9, f"price_for should agree with predict_linear on the same fruit ({_i:.4f}) but gave {_got:.4f}. Scale the fruit, then add the 1"
assert price_for([250.0, 75.0, 60, 12.0]) > price_for([100.0, 55.0, 60, 12.0]), "a bigger fruit should cost more than a small one"
assert 0.1 < price_for([170.0, 72.0, 50, 12.0]) < 3.0, "the price of a typical fruit should be around a dollar"
`,
        },
      ],
      unlocks: ["oa-price"],
      checks: [
        {
          prompt: "What is the dot product of `[2, 3]` and `[1, 4]`?",
          question: { type: "number", answer: 14 },
          explanation: "2*1 + 3*4 = 2 + 12 = 14.",
        },
        {
          prompt: "Why do we add a column of ones to the table?",
          question: {
            type: "choice",
            options: [
              "So the intercept becomes just another weight",
              "To make the table square",
              "To count the fruit",
              "Because NumPy needs one extra column",
            ],
            answer: 0,
          },
          explanation: "The intercept is multiplied by a feature that is always 1, so the same matrix product and gradient formulas cover it automatically.",
        },
        {
          prompt: "`Zb` has shape `(180, 5)` and `weights` has length 5. What is the shape of `Zb @ weights`?",
          question: { type: "choice", options: ["`(180,)`", "`(5,)`", "`(180, 5)`", "`(5, 180)`"], answer: 0 },
          explanation: "The shared dimension of size 5 is used up by the multiplication, leaving one number for each of the 180 rows.",
        },
      ],
    },

    // ───────────────────────── 12 ─────────────────────────
    {
      id: "ai-foundations-12-logistic",
      title: "Logistic regression: probabilities and ripeness",
      minutes: 30,
      xp: 150,
      concepts: ["classification", "sigmoid", "probability", "log loss", "logistic regression"],
      learn: md`### A yes/no question

Is this fruit ripe? The answer is 0 or 1, not a free-floating number, so a plain line is a poor fit: it happily predicts -0.4 or 1.7. We want a model whose output is a **probability**, always between 0 and 1.

### The sigmoid squashes any number into 0..1

Compute a score exactly as before (a weighted sum), then pass it through the **sigmoid** function:

~~~text
sigmoid(s) = 1 / (1 + e^(-s))
~~~

~~~text
s = -4   ->  0.02     very unlikely
s = -2   ->  0.12
s =  0   ->  0.50     a coin flip
s =  2   ->  0.88
s =  4   ->  0.98     very likely
~~~

Big negative scores become probabilities near 0, big positive scores near 1, and 0 sits exactly in the middle, giving an S-shaped curve. This model is called **logistic regression** (a classifier, despite the name).

~~~text
probability of ripe = sigmoid(w * scaled_sugar + b)
~~~

In NumPy, \`np.exp(x)\` is e^x. Clipping the score to the range -30..30 first keeps \`np.exp\` from overflowing on extreme values.

### A new loss: log loss

Squared error is awkward for probabilities. Instead we use **log loss** (also called cross-entropy). For one fruit with true answer \`t\` (0 or 1) and predicted probability \`p\`:

~~~text
loss = -( t * ln(p) + (1 - t) * ln(1 - p) )
~~~

Only one of the two terms is active. A ripe fruit (t = 1) costs \`-ln(p)\`:

~~~text
p = 0.90  ->  0.105    confident and right: tiny loss
p = 0.50  ->  0.693    unsure
p = 0.01  ->  4.605    confident and WRONG: huge loss
~~~

The loss is gentle on honest uncertainty and brutal on confident mistakes. That is exactly the behaviour we want from a probability. An untrained model that says 0.5 for everything scores \`ln 2 = 0.693\`.

To keep \`ln(0)\` from blowing up, clip probabilities to a tiny margin such as 1e-9.

### Training is almost identical

Here is the pleasant surprise: with sigmoid and log loss, the gradient simplifies to the same shape as before:

~~~text
errors   = probabilities - truth             (p - t for each fruit)
gradient = Zb.T @ errors / number_of_fruit
weights  = weights - lr * gradient
~~~

The only changes from the last lesson are the sigmoid in the prediction and no factor of 2.

### From probability to decision

A probability is not yet an answer. The simplest rule says "ripe if p is at least 0.5". Next lesson you will see that 0.5 is a choice, not a law.

### Common mistakes

- Using \`np.log(0)\`: always clip probabilities.
- Feeding the score to the loss without the sigmoid.
- Calling a result ripe because \`p\` is high, then forgetting which class \`p\` describes. Here \`p\` is always the probability of **ripe**.
- Forgetting to scale the sugar value with the learned scaler before predicting.`,
      mission: md`Buyers pay a premium for ripe fruit, and the sugar probe is your best clue. Teach the machine to turn a sugar reading into the **probability that the fruit is ripe**.

Write the sigmoid, the log loss and a logistic trainer, then fit sugar to ripeness. When this passes, the **Ripeness model** panel opens: the fruit as dots at 0 and 1, your S-curve through them, and the loss falling as it learns.`,
      tasks: [
        "sigmoid(t): 1 / (1 + e^-t) for numbers or arrays (clip t to -30..30 first)",
        "log_loss(t, p): the average log loss (clip p to 1e-9..1-1e-9), as a plain float",
        "train_logistic(Zb, t, lr, epochs): gradient descent from zero weights; return (weights as a list, history of log losses)",
        "SUGAR = 3, ripe_train / ripe_test, the bias-added sugar columns Str and Ste, then ripe_weights and ripe_loss_history (lr 0.5, 300 epochs)",
        "ripe_probability(sugar) for one raw sugar reading, p_test for the test fruit, and ripe_accuracy at a 0.5 cut-off",
      ],
      starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 12: logistic regression. Is the fruit ripe?


def sigmoid(t):
    """1 / (1 + e^-t). Clip t to the range -30..30 first so np.exp cannot overflow."""
    ...


def log_loss(t, p):
    """Average log loss. t holds the true 0/1 answers, p the predicted probabilities of ripe.
    Clip p to 1e-9 .. 1 - 1e-9 first. Return a plain float."""
    ...


def train_logistic(Zb, t, lr, epochs):
    """From all-zero weights. Each epoch: p = sigmoid(Zb @ weights);
    weights = weights - lr * (Zb.T @ (p - t)) / len(t). Record log_loss(t, p) before each update.
    Return (weights.tolist(), history)."""
    ...


SUGAR = 3   # the sugar column
ripe_train, ripe_test = None, None   # ripe_flags[train_idx] and ripe_flags[test_idx]
Str, Ste = None, None                # only the scaled sugar column of Xtr / Xte, with the bias column added
ripe_weights, ripe_loss_history = [], []    # lr 0.5, 300 epochs


def ripe_probability(sugar):
    """Probability (a float) that a fruit with this RAW sugar reading is ripe:
    scale it with the sugar entries of the scaler, then sigmoid(w * z + b)."""
    ...


p_test = None           # probability of ripe for every test fruit
ripe_accuracy = 0.0     # accuracy on the test fruit when "ripe" means p_test >= 0.5`,
      solutionAdd: py`def sigmoid(t):
    return 1.0 / (1.0 + np.exp(-np.clip(t, -30, 30)))


def log_loss(t, p):
    p = np.clip(p, 1e-9, 1 - 1e-9)
    return float(-(t * np.log(p) + (1 - t) * np.log(1 - p)).mean())


def train_logistic(Zb, t, lr, epochs):
    weights = np.zeros(Zb.shape[1])
    history = []
    for epoch in range(epochs):
        p = sigmoid(Zb @ weights)
        weights = weights - lr * (Zb.T @ (p - t)) / len(t)
        history.append(log_loss(t, p))
    return weights.tolist(), history


SUGAR = 3
ripe_train = ripe_flags[train_idx]
ripe_test = ripe_flags[test_idx]
Str = add_bias(Xtr[:, [SUGAR]])
Ste = add_bias(Xte[:, [SUGAR]])
ripe_weights, ripe_loss_history = train_logistic(Str, ripe_train, 0.5, 300)


def ripe_probability(sugar):
    z = (sugar - scaler_mean[SUGAR]) / scaler_std[SUGAR]
    return float(sigmoid(ripe_weights[0] * z + ripe_weights[1]))


p_test = sigmoid(Ste @ np.asarray(ripe_weights))
ripe_accuracy = accuracy(ripe_test, (p_test >= 0.5).astype(int))`,
      explanation:
        "The sigmoid turns any score into a probability, and clipping keeps np.exp safe. log_loss punishes confident mistakes and clips p so np.log never sees 0. The trainer is lesson 11's loop with two changes: the prediction goes through sigmoid, and the gradient is Zb.T @ (p - t) (no factor 2). We train on the single scaled sugar column (plus the bias), so the model has two weights: one slope on sugar, and one offset. ripe_probability repeats that chain for a raw sugar reading. Comparing p to 0.5 turns probabilities into yes/no answers for the accuracy score.",
      hints: [
        { id: "h1", title: "Sigmoid and loss", content: "sigmoid: 1.0 / (1.0 + np.exp(-np.clip(t, -30, 30))). log_loss: p = np.clip(p, 1e-9, 1 - 1e-9); return float(-(t * np.log(p) + (1 - t) * np.log(1 - p)).mean())." },
        { id: "h2", title: "The trainer", content: "weights = np.zeros(Zb.shape[1]); each epoch: p = sigmoid(Zb @ weights); history.append(log_loss(t, p)); weights = weights - lr * (Zb.T @ (p - t)) / len(t). Return weights.tolist(), history." },
        { id: "h3", title: "Just the sugar column", content: "Str = add_bias(Xtr[:, [SUGAR]]) keeps the column as a 2-D table. For one raw reading: z = (sugar - scaler_mean[SUGAR]) / scaler_std[SUGAR]; return float(sigmoid(ripe_weights[0] * z + ripe_weights[1])). p_test = sigmoid(Ste @ np.asarray(ripe_weights))." },
      ],
      tests: [
        {
          id: "t1",
          description: "sigmoid squashes scores into 0..1",
          assertionCode: py`
assert abs(float(sigmoid(0.0)) - 0.5) < 1e-12, "sigmoid(0) should be exactly 0.5"
assert abs(float(sigmoid(2.0)) - 0.8807971) < 1e-6 and abs(float(sigmoid(-2.0)) - 0.1192029) < 1e-6, "sigmoid(2) is about 0.881 and sigmoid(-2) about 0.119"
_big = np.asarray(sigmoid(np.array([-1000.0, 1000.0])), dtype=float)
assert np.all(np.isfinite(_big)) and _big[0] < 1e-9 and _big[1] > 1 - 1e-9, "extreme scores must give probabilities near 0 and 1 without nan or overflow (clip first)"
_s = np.asarray(sigmoid(np.array([-1.0, 0.0, 1.0])), dtype=float)
assert _s[0] < _s[1] < _s[2], "sigmoid should increase with the score"
`,
        },
        {
          id: "t2",
          description: "log_loss punishes confident mistakes",
          assertionCode: py`
_t = np.array([1.0, 0.0])
assert abs(log_loss(_t, np.array([0.9, 0.1])) - 0.1053605) < 1e-5, f"log_loss([1, 0], [0.9, 0.1]) should be -ln(0.9) = 0.1054 but is {log_loss(_t, np.array([0.9, 0.1]))!r}"
assert abs(log_loss(np.array([1.0]), np.array([0.5])) - 0.6931472) < 1e-6, "an unsure p = 0.5 costs ln 2 = 0.693"
assert abs(log_loss(np.array([1.0]), np.array([0.01])) - 4.6051702) < 1e-5, "a confident wrong answer costs a lot: -ln(0.01) = 4.605"
assert np.isfinite(log_loss(np.array([1.0]), np.array([0.0]))), "clip p so that a probability of exactly 0 does not give infinity"
assert type(log_loss(_t, np.array([0.9, 0.1]))) is float, "return a plain float"
`,
        },
        {
          id: "t3",
          description: "train_logistic learns to separate two groups",
          assertionCode: py`
_s = np.array([[-2.0], [-1.0], [1.0], [2.0]])
_t = np.array([0.0, 0.0, 1.0, 1.0])
_w, _h = train_logistic(add_bias(_s), _t, 0.5, 300)
assert isinstance(_w, list) and len(_w) == 2, "return the weights as a plain list (one slope and one bias)"
assert _w[0] > 0.5, f"low scores are 0 and high scores are 1, so the slope should be clearly positive but is {_w[0]!r}"
_p = np.asarray(sigmoid(add_bias(_s) @ np.asarray(_w)), dtype=float)
assert _p[0] < 0.5 and _p[1] < 0.5 and _p[2] > 0.5 and _p[3] > 0.5, f"the probabilities should be below 0.5 for the first two and above 0.5 for the last two but are {_p.round(3).tolist()!r}"
assert abs(_h[0] - 0.6931472) < 1e-6, f"with all-zero weights every probability is 0.5, so the first loss is ln 2 = 0.693 but is {_h[0]!r}"
assert _h[-1] < _h[0] and len(_h) == 300, "one loss per epoch, and it should fall"
`,
        },
        {
          id: "t4",
          description: "the sugar-only training tables are set up",
          assertionCode: py`
assert SUGAR == 3, "SUGAR is the index of the sugar column: 3"
assert np.array_equal(np.asarray(ripe_train), ripe_flags[train_idx]) and np.array_equal(np.asarray(ripe_test), ripe_flags[test_idx]), "ripe_train / ripe_test should be ripe_flags[train_idx] / ripe_flags[test_idx]"
assert np.asarray(Str).shape == (180, 2) and np.asarray(Ste).shape == (60, 2), "Str should be (180, 2) and Ste (60, 2): the scaled sugar column plus a column of ones"
assert np.allclose(np.asarray(Str)[:, 0], Xtr[:, 3]) and np.allclose(np.asarray(Str)[:, 1], 1.0), "the first column should be the scaled sugar (Xtr[:, 3]) and the second all ones"
`,
        },
        {
          id: "t5",
          description: "the ripeness model learned that sweeter means riper",
          assertionCode: py`
assert isinstance(ripe_weights, list) and len(ripe_weights) == 2, "ripe_weights should be a plain list of 2 numbers"
assert ripe_weights[0] > 0.5, f"sweeter fruit are riper, so the sugar weight should be clearly positive but is {ripe_weights[0]!r}"
assert len(ripe_loss_history) == 300 and ripe_loss_history[-1] < ripe_loss_history[0], "ripe_loss_history should have 300 losses and the loss should fall"
assert abs(ripe_loss_history[0] - 0.6931472) < 1e-6, "training starts from p = 0.5 everywhere, so the first loss should be ln 2"
`,
        },
        {
          id: "t6",
          description: "ripe_probability, p_test and ripe_accuracy work together",
          assertionCode: py`
assert ripe_probability(18.0) > 0.9, f"a very sweet fruit (18 Brix) should almost surely be ripe but p = {ripe_probability(18.0):.3f}"
assert ripe_probability(6.0) < 0.1, f"a sour fruit (6 Brix) should almost surely be unripe but p = {ripe_probability(6.0):.3f}"
assert ripe_probability(8.0) < ripe_probability(12.0) < ripe_probability(16.0), "probability should rise with sugar"
assert type(ripe_probability(12.0)) is float and 0.0 < ripe_probability(12.0) < 1.0, "return a plain float strictly between 0 and 1"
assert np.asarray(p_test).shape == (60,), "p_test should hold one probability per test fruit"
assert np.allclose(np.asarray(p_test), [ripe_probability(_s) for _s in X_test[:, SUGAR]]), "p_test should agree with ripe_probability on the same fruit"
assert abs(ripe_accuracy - accuracy(ripe_test, (np.asarray(p_test) >= 0.5).astype(int))) < 1e-9, "ripe_accuracy compares (p_test >= 0.5) with ripe_test"
assert ripe_accuracy > 0.7, f"sugar should tell ripe from unripe much better than chance but ripe_accuracy is {ripe_accuracy!r}"
`,
        },
      ],
      unlocks: ["oa-ripeness"],
      checks: [
        {
          prompt: "What does `sigmoid(0)` equal?",
          question: { type: "number", answer: 0.5 },
          explanation: "A score of zero means no evidence either way, and the sigmoid maps it to exactly one half.",
        },
        {
          prompt: "For a fruit that really is ripe, which prediction costs the **most** log loss?",
          question: { type: "choice", options: ["p = 0.99", "p = 0.60", "p = 0.50", "p = 0.01"], answer: 3 },
          explanation: "-ln(0.01) = 4.6, far worse than -ln(0.5) = 0.69. Log loss hates being confidently wrong.",
        },
        {
          prompt: "Why do we call `np.clip` on the probabilities inside `log_loss`?",
          question: {
            type: "choice",
            options: [
              "So np.log never sees exactly 0 or 1, which would give infinity",
              "To make the loss bigger",
              "To turn probabilities into percentages",
              "Because sigmoid can return negative numbers",
            ],
            answer: 0,
          },
          explanation: "ln(0) is minus infinity and would poison the loss (and every average it joins). Clipping to a tiny margin keeps everything finite.",
        },
      ],
    },
  ],
};
