import type { Chapter } from "@/engine/types";
import { GLYPH_KIT, md, py } from "./util.ts";

/**
 * Chapter 1: Seeds. The glyph data (generated, flattened, normalised, split), one neuron and its
 * yes/no decision, activation functions (and why a bend is needed), and a layer as a matrix multiply.
 * The solutions follow the reference program (master_body.py L1..L4) exactly.
 */

export const chapter1: Chapter = {
  id: "seeds",
  title: "Seeds: data and the first neuron",
  blurb: "Draw the digits, then grow a neuron, an activation and a whole layer.",
  lessons: [
    // ───────────────────────── 1 ─────────────────────────
    {
      id: "ai-neural-1-glyphs",
      title: "Sowing the data: glyphs",
      minutes: 26,
      xp: 100,
      concepts: ["image arrays", "flattening", "normalisation", "train/test split", "seeded randomness"],
      learn: md`### A greenhouse needs seeds

In Orchard Vision a table of numbers described each piece of fruit. Now the input is a **picture**, and a picture is just a grid of numbers too. Each digit in this course is drawn on a 10 by 10 grid. Every cell, called a **pixel**, holds a whole number from 0 (blank paper) to 255 (full ink).

The pictures come from a generator that is provided at the top of your file, so everyone grows the same garden. It is original to pockett, not a published dataset. For each digit from 0 to 9 it holds a few hand-designed pen strokes. To draw one picture it:

1. wobbles every point of the strokes a little (a shaky hand),
2. tilts, shrinks, slants and shifts the whole digit,
3. picks a pen thickness and a pen darkness,
4. paints soft ink around the strokes and sprinkles noise on the paper.

Your job in this lesson is not to write that generator, but to learn to *look at its output* like a machine-learning engineer. You do not need to read all of it yet. What matters is its promise: \`make_glyphs(count, seed)\` always returns the same \`count\` pictures for the same \`seed\`.

~~~python
images, labels = make_glyphs(1600, 7)
images.shape      # (1600, 10, 10)   1600 pictures, 10 rows, 10 columns
images.dtype      # uint8            whole numbers 0 to 255
labels.shape      # (1600,)          the digit each picture shows
~~~

### Looking before modelling

Always look at your data before you train on it. A tiny function can print a picture with characters instead of pixels. Choose one character per ink level from a short ramp and index it with the pixel value:

~~~python
RAMP = " .:*#"          # blank ... dark
RAMP[0 // 52]           # " "  (pixel 0)
RAMP[255 // 52]         # "#"  (pixel 255)
~~~

Dividing by 52 turns 0 to 255 into the five ramp positions 0 to 4. Print each character twice so the picture is not squashed, and a handwritten 3 appears in your output.

### Flatten and normalise

A neural network layer (lesson 4) takes a **row of numbers** per sample, not a grid. Flattening unrolls each 10 by 10 picture into 100 numbers, row after row. \`images.reshape(len(images), -1)\` does it: the \`-1\` means "work out this size yourself" (100).

The second step is **normalising**. You scaled fruit measurements with a mean and a spread in Orchard Vision. Pixels already live on a fixed scale, so dividing by 255 is enough, and puts every input between 0.0 and 1.0. Small, similar-sized inputs keep the maths in the next lessons well behaved.

Watch out for the integer type. The pixels are \`uint8\`, which holds only 0 to 255 and silently wraps around when it overflows:

~~~python
np.array([200], dtype=np.uint8) * 2     # array([144], dtype=uint8)   not 400!
~~~

Dividing by 255 returns floats, so the damage cannot happen *after* that step. Never do arithmetic on the raw pixels before it.

### Train and test, again

You learned the rule in Orchard Vision: never grade a model on pictures it studied. The split here works the same way, but this time with NumPy and a seeded generator:

~~~python
order = np.random.RandomState(seed).permutation(len(X))   # a shuffled list of row numbers
test, train = order[:n_test], order[n_test:]
~~~

Indexing with a list of row numbers (\`X[train]\`) picks those rows in that order. The **same** \`order\` must pick the rows of \`X\` and of \`y\`, or pictures and labels fall out of step, which is the most damaging bug in this chapter because nothing crashes. The seed makes the shuffle reproducible: run it again and the same 400 pictures are held back.

### Plain numbers for the stage

The greenhouse stage reads your results as plain Python numbers and lists, not NumPy arrays. \`array.tolist()\` converts an array to nested lists. You will do this at the end of most lessons: it is how your code talks to the panels.

### Common mistakes

- **Doing maths on uint8 pixels** before dividing, so values wrap around.
- **Shuffling X and y separately.** Compute the order once and use it for both.
- **Forgetting that \`reshape\` needs the sample count.** \`images.reshape(-1)\` flattens everything into one long row of 160000 numbers.
- **Counting with a loop of \`labels == d\`** and forgetting a digit that appears zero times. \`np.bincount(labels, minlength=10)\` always returns ten counts.
- **Using the test pictures to make decisions.** Today you only look at them.`,
      mission: md`Welcome to the Glyph Greenhouse. The pockett gardeners found a strange crate of seeds: not plants, but ten pen strokes for each digit from 0 to 9, plus a machine that wobbles them into handwriting. Your first season is about the soil: draw the glyphs, look at them, flatten and scale them, count them, and hold some back for the final exam.

The generator is provided; you read the pictures. When this passes, the **Glyph bed** lights up with thirty-six test glyphs and a count of how many you have of each digit.`,
      tasks: [
        "draw_glyph(image): turn a 10 x 10 picture into 10 lines of text using RAMP, each character printed twice",
        "flatten_images(images): shape (n, 10, 10) of whole numbers 0-255 into (n, 100) of floats between 0 and 1",
        "count_digits(labels): a plain list of ten counts, one per digit 0-9",
        "split_glyphs(X, y, n_test, seed): shuffle with RandomState(seed), return X_train, X_test, y_train, y_test",
        "After the functions: fill in X_all, digit_counts, the four split arrays (400 held back, seed 11), and the first 36 test pictures as gallery / gallery_labels",
      ],
      starterAdd:
        py`# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 1: sowing the data.
#
# The glyph generator below is PROVIDED. You do not need to understand it
# yet. All you need to know is its promise: make_glyphs(count, seed) draws
# count handwritten-looking digits (images of shape (count, 10, 10) with
# whole numbers 0-255, and labels 0-9) and the same seed always draws the
# same pictures.

` +
        GLYPH_KIT +
        py`


images, labels = make_glyphs(1600, 7)  # provided: everybody grows the same 1600 glyphs

RAMP = " .:*#"  # ink levels, blank to dark. pixel // 52 picks the character


def draw_glyph(image):
    """Return 10 strings, one per row of the picture. Each pixel becomes the RAMP
    character at index pixel // 52, written twice so the digit is not squashed."""
    ...


def flatten_images(images):
    """(n, 10, 10) whole numbers 0-255  ->  (n, 100) floats between 0.0 and 1.0."""
    ...


def count_digits(labels):
    """How many pictures of each digit? A plain list of ten counts: [count of 0, count of 1, ...]."""
    ...


def split_glyphs(X, y, n_test, seed):
    """Shuffle with np.random.RandomState(seed).permutation(len(X)). The first n_test rows
    of the shuffled order are the test set. Return X_train, X_test, y_train, y_test."""
    ...


# Now use your functions on the real glyphs. Replace these placeholders:
X_all = None
digit_counts = []
X_train, X_test, y_train, y_test = None, None, None, None
gallery, gallery_labels = [], []  # the first 36 TEST pictures (as lists) and their labels`,
      solutionAdd:
        GLYPH_KIT +
        py`


images, labels = make_glyphs(1600, 7)  # provided: everybody grows the same 1600 glyphs

RAMP = " .:*#"  # ink levels, blank to dark. pixel // 52 picks the character


def draw_glyph(image):
    return ["".join(RAMP[int(v) // 52] * 2 for v in row) for row in image]


def flatten_images(images):
    # reshape to one row per picture, then divide: the division turns the uint8 pixels into floats
    return images.reshape(len(images), -1) / 255.0


def count_digits(labels):
    return np.bincount(labels, minlength=10).tolist()


def split_glyphs(X, y, n_test, seed):
    order = np.random.RandomState(seed).permutation(len(X))
    test, train = order[:n_test], order[n_test:]
    return X[train], X[test], y[train], y[test]


X_all = flatten_images(images)
digit_counts = count_digits(labels)
X_train, X_test, y_train, y_test = split_glyphs(X_all, labels, 400, 11)
gallery = X_test[:36].tolist()
gallery_labels = y_test[:36].tolist()`,
      explanation:
        "draw_glyph looks up each pixel's ink level in RAMP (pixel // 52 maps 0-255 onto the five characters) and doubles it. flatten_images reshapes to one row per picture and divides by 255, which also turns the whole numbers into floats. count_digits uses np.bincount with minlength=10 so a digit that never appears still gets a 0. split_glyphs builds ONE shuffled order and uses it for both X and y, so pictures and labels stay together. The last block applies them to the 1600 real glyphs and turns the first 36 test pictures into plain lists for the stage with .tolist().",
      hints: [
        { id: "h1", title: "Drawing and flattening", content: 'For draw_glyph, build one string per row: "".join(RAMP[int(v) // 52] * 2 for v in row), and collect the ten strings in a list. For flatten_images use images.reshape(len(images), -1) / 255.0: reshape first, then divide.' },
        { id: "h2", title: "Counting and splitting", content: "np.bincount(labels, minlength=10) counts each digit; end with .tolist() so the answer is a plain list. For the split compute order = np.random.RandomState(seed).permutation(len(X)) once, then test = order[:n_test] and train = order[n_test:]. Return X[train], X[test], y[train], y[test]." },
        { id: "h3", title: "The real data", content: "X_all = flatten_images(images) and digit_counts = count_digits(labels). The split is X_train, X_test, y_train, y_test = split_glyphs(X_all, labels, 400, 11). The gallery is the first 36 TEST pictures: X_test[:36].tolist() and y_test[:36].tolist()." },
      ],
      tests: [
        {
          id: "t1",
          description: "draw_glyph turns a picture into rows of text using the ink ramp",
          assertionCode: py`
_pic = np.array([[0, 60, 120], [180, 255, 51]], dtype=np.uint8)
_got = draw_glyph(_pic)
assert _got is not None, "draw_glyph should return the list of text rows, but it returned None. Did you finish with a return line?"
assert isinstance(_got, list) and len(_got) == 2, f"a picture with 2 rows should give a list of 2 strings, but draw_glyph returned {_got!r}"
assert _got[0] == "  ..::", f"the row [0, 60, 120] should become the text '  ..::' (blank, dot, colon, each written twice), but draw_glyph gave {_got[0]!r}"
assert _got[1] == "**##  ", f"the row [180, 255, 51] should become the text '**##  ', but draw_glyph gave {_got[1]!r}"
_real = draw_glyph(images[0])
assert len(_real) == 10 and all(len(_row) == 20 for _row in _real), "a real 10 x 10 glyph should become 10 lines of 20 characters"
`,
        },
        {
          id: "t2",
          description: "flatten_images gives one row of 100 floats between 0 and 1 per picture",
          assertionCode: py`
_got = flatten_images(images[:5])
assert _got is not None, "flatten_images should return the table, but it returned None. Did you finish with a return line?"
assert isinstance(_got, np.ndarray) and _got.shape == (5, 100), f"5 pictures should flatten to shape (5, 100), but flatten_images returned shape {getattr(_got, 'shape', None)}"
assert _got.dtype.kind == "f", "the flattened pixels should be floats (divide by 255.0), not whole numbers"
assert float(_got.min()) >= 0.0 and float(_got.max()) <= 1.0, "after dividing by 255 every pixel should lie between 0.0 and 1.0"
assert np.allclose(_got[2], images[2].ravel() / 255.0), "each row should be one picture read row after row and divided by 255"
_copy = images[:5].copy()
flatten_images(_copy)
assert np.array_equal(_copy, images[:5]), "flatten_images changed the pictures it was given. Build a new array instead"
`,
        },
        {
          id: "t3",
          description: "count_digits returns ten counts, including digits that never appear",
          assertionCode: py`
_got = count_digits(np.array([0, 0, 3, 9]))
assert _got is not None, "count_digits should return the list of counts, but it returned None. Did you finish with a return line?"
assert isinstance(_got, list), f"count_digits should return a plain list (end with .tolist()), but it returned a {type(_got).__name__}"
assert _got == [2, 0, 0, 1, 0, 0, 0, 0, 0, 1], f"for the labels [0, 0, 3, 9] the ten counts should be [2, 0, 0, 1, 0, 0, 0, 0, 0, 1], but count_digits gave {_got!r}"
_all = count_digits(np.array([5, 5, 5]))
assert len(_all) == 10 and _all[5] == 3, "there should always be ten counts, one per digit, even when most digits are missing. Try minlength=10"
`,
        },
        {
          id: "t4",
          description: "split_glyphs shuffles with the seed and keeps pictures and labels together",
          assertionCode: py`
_X = np.arange(40).reshape(20, 2)
_y = np.arange(20)
_got = split_glyphs(_X, _y, 6, 3)
assert _got is not None, "split_glyphs should return four arrays, but it returned None. Did you finish with a return line?"
assert len(_got) == 4, "split_glyphs should return four things: X_train, X_test, y_train, y_test"
_xa, _xb, _ya, _yb = _got
assert len(_xa) == 14 and len(_xb) == 6 and len(_ya) == 14 and len(_yb) == 6, f"holding back 6 of 20 should leave 14 for training and 6 for testing, but the sizes are {len(_xa)}/{len(_xb)} and {len(_ya)}/{len(_yb)}"
assert np.array_equal(_xa[:, 0] // 2, _ya) and np.array_equal(_xb[:, 0] // 2, _yb), "after the split, row k of X no longer matches label k. Use the SAME shuffled order for X and y"
assert sorted(_ya.tolist() + _yb.tolist()) == list(range(20)), "every picture should land in exactly one of the two sets: none missing, none twice"
_again = split_glyphs(_X, _y, 6, 3)
assert np.array_equal(_again[3], _yb), "the same seed should hold back the same pictures every time. Build the generator with np.random.RandomState(seed)"
_other = split_glyphs(_X, _y, 6, 4)
assert not np.array_equal(_other[3], _yb), "a different seed should hold back different pictures"
assert not np.array_equal(_yb, np.arange(6)) and not np.array_equal(_yb, np.arange(14, 20)), "the rows were not shuffled. Take the test rows from np.random.RandomState(seed).permutation(len(X))"
`,
        },
        {
          id: "t5",
          description: "the real glyphs are flattened, counted, split 1200 / 400 and the first 36 test pictures are published",
          assertionCode: py`
assert X_all is not None and getattr(X_all, "shape", None) == (1600, 100), f"X_all should hold all 1600 pictures flattened, shape (1600, 100), but it is {getattr(X_all, 'shape', X_all)!r}"
assert digit_counts == [160] * 10, f"every digit appears 160 times in the 1600 glyphs, so digit_counts should be [160, 160, ...], but it is {digit_counts!r}"
assert X_train is not None and X_train.shape == (1200, 100) and X_test.shape == (400, 100), f"the split should leave 1200 pictures for training and 400 for testing, but the shapes are {getattr(X_train, 'shape', None)} and {getattr(X_test, 'shape', None)}"
assert y_train.shape == (1200,) and y_test.shape == (400,), "y_train should hold 1200 labels and y_test 400"
_want = split_glyphs(X_all, labels, 400, 11)
assert _want is not None and np.array_equal(_want[1], X_test) and np.array_equal(_want[2], y_train), "the split should be split_glyphs(X_all, labels, 400, 11): 400 test pictures, seed 11"
assert isinstance(gallery, list) and len(gallery) == 36 and isinstance(gallery[0], list) and len(gallery[0]) == 100, "gallery should be a plain list of the first 36 test pictures, each a list of 100 numbers (use X_test[:36].tolist())"
assert gallery_labels == y_test[:36].tolist(), "gallery_labels should be the labels of those 36 test pictures, as a plain list (y_test[:36].tolist())"
`,
        },
      ],
      unlocks: ["gn-glyphs"],
      checks: [
        {
          prompt: "A flattened glyph is a row of how many numbers? (The glyphs are 10 pixels wide and 10 pixels tall.)",
          question: { type: "number", answer: 100, tolerance: 0 },
          explanation: "10 rows of 10 pixels is 100 numbers per picture. That is why the first layer of the network in lesson 4 will have 100 inputs.",
        },
        {
          prompt: "Why must the SAME shuffled order be used for X and for y when you split the data?",
          question: {
            type: "choice",
            options: [
              "So that every picture stays paired with its own label",
              "So that the test set is bigger than the training set",
              "So that the pixels are normalised",
              "So that the digits are counted correctly",
            ],
            answer: 0,
            feedback: {
              1: "The size of the test set comes from n_test, not from the shuffle.",
              2: "Normalising is the division by 255. The shuffle only decides which rows go where.",
              3: "Counting is a separate step. The shuffle is about keeping rows aligned.",
            },
          },
          explanation: "If X and y were shuffled by different orders, row 5 of X would show one digit while y[5] named another. Nothing crashes, but the network would train on lies.",
        },
      ],
    },

    // ───────────────────────── 2 ─────────────────────────
    {
      id: "ai-neural-2-neuron",
      title: "One neuron: weights, bias and a decision",
      minutes: 26,
      xp: 105,
      concepts: ["weights", "bias", "weighted sum", "perceptron", "decision threshold"],
      learn: md`### The smallest decision-maker

Every neural network, however huge, is built from one tiny part. A **neuron** takes some numbers in, multiplies each by its own **weight**, adds up the products, adds a **bias**, and reports the total.

~~~text
score = x1*w1 + x2*w2 + ... + x100*w100 + b
~~~

In NumPy that is one line: \`np.dot(x, w) + b\`. You have met this exact sum before: it is the line \`w * x + b\` and the many-feature version from Orchard Vision. A **perceptron** adds a hard decision on top: if the score is above zero the neuron *fires* (answers 1); otherwise it stays quiet (answers 0).

~~~python
x = np.array([1.0, 0.0, 2.0])
w = np.array([0.5, -1.0, 0.25])
b = -0.75
np.dot(x, w) + b      # 1*0.5 + 0*(-1) + 2*0.25 - 0.75 = 0.25   -> fires
~~~

### What the weights mean

Each weight is a vote about one input. A **positive** weight says "this pixel having ink makes me more likely to fire". A **negative** weight says the opposite. A **zero** weight ignores that pixel. The size of the weight says how loud the vote is.

Because our input is a picture, the 100 weights can be arranged back into a 10 by 10 grid and *drawn*. Doing so shows exactly what the neuron is looking for. Let us design a neuron that spots the digit **1**. A 1 is a vertical stem near the middle of the picture, with empty paper on both sides. So:

- columns 4 and 5 (the middle): weight +1, ink there is evidence for a 1,
- columns 0 to 2 and 7 to 9 (the sides): weight -1, ink there is evidence against,
- columns 3 and 6: weight 0, borderline.

### The bias is the neuron's mood

The bias \`b\` shifts the whole score. A very negative bias makes the neuron hard to please, so it fires only when the evidence is strong. A positive bias makes it trigger-happy. Setting the bias is choosing where the line between yes and no sits.

~~~text
score > 0   -> fire (1)      the evidence beats the bias
score <= 0  -> quiet (0)     including exactly 0
~~~

Choosing the bias is a trade-off you will meet again and again: a neuron that fires for every 1 (but also for many 7s) is as bad as one that never fires. You will tune it by looking at **firing rates**: for each digit, what fraction of its pictures make the neuron fire?

### Doing many pictures at once

A loop over 1200 pictures works but is slow. Because \`X\` has one row per picture, \`X @ w + b\` computes all the scores at once, a vector with one score per picture. Comparing it with 0 gives a True/False array, and \`fired[y == d].mean()\` is the fraction of digit-\`d\` pictures that fired.

### What one neuron can and cannot do

One neuron draws a single straight cut through the 100-dimensional space of pictures. It can answer *one* yes-or-no question about linear evidence, which already catches a lot of 1s. It cannot answer "which of ten digits?" and it cannot learn tricks like XOR (lesson 3). The rest of the course is about wiring many neurons together and letting them *learn* their own weights, so you never have to design a stem detector by hand.

### Common mistakes

- **Using \`*\` instead of \`np.dot\`.** \`x * w\` multiplies pair by pair and returns 100 numbers; you need their sum.
- **Mismatched lengths.** \`np.dot\` of 100 numbers with 10 gives \`ValueError: shapes (100,) and (10,) not aligned: 100 (dim 0) != 10 (dim 0)\`. Flatten the picture first.
- **Returning a NumPy scalar** where a plain float is expected. Wrap the answer in \`float(...)\`.
- **\`>= 0\` instead of \`> 0\`.** The decision is strict: a score of exactly 0 does not fire.
- **Forgetting to restrict to one digit** when computing a firing rate, so you average over everything.`,
      mission: md`The first sprout pushes through the soil. The gardeners want something small and checkable: a single neuron that answers one question, "is this glyph a 1?".

You will write the weighted sum and the yes/no decision, build a hand-designed stem detector, and measure how often it fires for each digit. When this passes, the **One neuron** panel shows the detector's weights as a picture, red where ink counts against the 1 and green where it counts for it, plus a bar for each digit.`,
      tasks: [
        "neuron_sum(x, w, b): the weighted sum of the inputs plus the bias, as a plain float",
        "neuron_fires(x, w, b): 1 if the score is above 0, otherwise 0",
        "stem_weights(): 100 weights for a '1' detector: +1 in columns 4-5, -1 in columns 0-2 and 7-9, 0 elsewhere",
        "fire_rates(X, y, w, b): for each digit 0-9, the fraction of its pictures that make the neuron fire",
        "Pick a STEM_BIAS, then fill in stem_w, stem_rates and stem_image (the weights as a 10 x 10 list of lists)",
      ],
      starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 2: one neuron.
#
# A neuron adds up (input x weight) for every input, adds a bias, and the
# perceptron fires when the total is above zero.


def neuron_sum(x, w, b):
    """The weighted sum: x[0]*w[0] + x[1]*w[1] + ... + b, as a plain float."""
    ...


def neuron_fires(x, w, b):
    """1 if the weighted sum is above zero, otherwise 0 (exactly zero does not fire)."""
    ...


def stem_weights():
    """100 weights (a flat array) for a detector of the digit 1. Build a 10 x 10 grid of zeros,
    then: columns 4 and 5 get +1.0, columns 0, 1, 2 and 7, 8, 9 get -1.0. Return grid.ravel()."""
    ...


def fire_rates(X, y, w, b):
    """For each digit 0-9, the fraction of its pictures (rows of X whose label in y is that digit)
    for which the neuron fires. Returns a list of ten plain floats."""
    ...


STEM_BIAS = 0.0  # how hard to please? Try values between -4 and 0 and look at the firing rates.

# Now build the detector and measure it on the training pictures. Replace these placeholders:
stem_w = None
stem_rates = []
stem_image = []  # the weights as a 10 x 10 list of lists (reshape, then .tolist())`,
      solutionAdd: py`def neuron_sum(x, w, b):
    return float(np.dot(x, w) + b)


def neuron_fires(x, w, b):
    return 1 if neuron_sum(x, w, b) > 0 else 0


def stem_weights():
    grid = np.zeros((SIZE, SIZE))
    grid[:, 4:6] = 1.0   # ink in the middle columns is evidence FOR a 1
    grid[:, :3] = -1.0   # ink on the left side is evidence against
    grid[:, 7:] = -1.0   # ... and so is ink on the right side
    return grid.ravel()


def fire_rates(X, y, w, b):
    fired = (X @ w + b) > 0   # one True/False per picture
    return [float(fired[y == d].mean()) for d in range(10)]


stem_w = stem_weights()
STEM_BIAS = -2.0
stem_rates = fire_rates(X_train, y_train, stem_w, STEM_BIAS)
stem_image = stem_w.reshape(SIZE, SIZE).tolist()`,
      explanation:
        "neuron_sum is np.dot(x, w) plus the bias, wrapped in float so it is a plain number. neuron_fires turns it into a hard yes/no with a strict > 0. stem_weights fills a 10 x 10 grid: +1 in the middle columns where a 1's stem lives, -1 on the sides where it should be empty, then flattens it to 100 weights. fire_rates computes all scores at once with X @ w + b, compares with 0, and averages the True/False values within each digit. A bias of -2 makes the neuron picky enough that most 1s fire (about 84 percent) while most other digits do not.",
      hints: [
        { id: "h1", title: "The sum and the decision", content: "neuron_sum is float(np.dot(x, w) + b). neuron_fires calls it and returns 1 if the result is greater than 0, otherwise 0." },
        { id: "h2", title: "Stem weights", content: "grid = np.zeros((SIZE, SIZE)); grid[:, 4:6] = 1.0 sets columns 4 and 5 in every row. grid[:, :3] = -1.0 sets columns 0-2 and grid[:, 7:] = -1.0 sets columns 7-9. Return grid.ravel() to get 100 weights." },
        { id: "h3", title: "Firing rates", content: "fired = (X @ w + b) > 0 gives one True/False per picture. For one digit d, fired[y == d].mean() is the fraction that fired. Collect it for d in range(10) into a list of floats. Try STEM_BIAS = -2.0 first: about 84 percent of the 1s should fire." },
      ],
      tests: [
        {
          id: "t1",
          description: "neuron_sum returns the weighted sum plus the bias as a plain float",
          assertionCode: py`
_got = neuron_sum(np.array([1.0, 2.0, 3.0]), np.array([0.5, -1.0, 2.0]), 0.25)
assert _got is not None, "neuron_sum should return the score, but it returned None. Did you finish with a return line?"
assert isinstance(_got, float), f"neuron_sum should return a plain float, but it returned a {type(_got).__name__}. Wrap the answer in float(...)"
assert abs(_got - 4.75) < 1e-9, f"1*0.5 + 2*(-1) + 3*2 + 0.25 = 4.75, but neuron_sum returned {_got}"
_zero = neuron_sum(np.zeros(5), np.ones(5), -1.5)
assert abs(_zero - (-1.5)) < 1e-9, "with all-zero inputs the score is just the bias, -1.5"
`,
        },
        {
          id: "t2",
          description: "neuron_fires says 1 only when the score is strictly above zero",
          assertionCode: py`
_x = np.array([1.0, 1.0])
_w = np.array([1.0, 1.0])
_hot = neuron_fires(_x, _w, -1.0)
assert _hot is not None, "neuron_fires should return 1 or 0, but it returned None. Did you finish with a return line?"
assert _hot == 1 and neuron_fires(_x, _w, 0.0) == 1, "a score of 2.0 or 1.0 is above zero, so the neuron should fire (1)"
assert neuron_fires(_x, _w, -2.0) == 0, "a score of exactly 0 does not fire: the decision is score > 0, not score >= 0"
assert neuron_fires(_x, _w, -3.0) == 0, "a score of -1.0 is below zero, so the neuron should stay quiet (0)"
`,
        },
        {
          id: "t3",
          description: "stem_weights puts +1 in the middle columns and -1 on the sides",
          assertionCode: py`
_got = stem_weights()
assert _got is not None, "stem_weights should return the 100 weights, but it returned None. Did you finish with a return line?"
_got = np.asarray(_got)
assert _got.shape == (100,), f"stem_weights should return a flat array of 100 weights, but its shape is {_got.shape}. Finish with .ravel()"
_grid = _got.reshape(10, 10)
assert np.all(_grid[:, 4:6] == 1.0), "columns 4 and 5 (the middle) should have weight +1.0 in every row"
assert np.all(_grid[:, :3] == -1.0) and np.all(_grid[:, 7:] == -1.0), "columns 0-2 and 7-9 (the sides) should have weight -1.0 in every row"
assert np.all(_grid[:, 3] == 0.0) and np.all(_grid[:, 6] == 0.0), "columns 3 and 6 should stay at 0.0"
`,
        },
        {
          id: "t4",
          description: "fire_rates gives each digit's fraction of pictures that fire",
          assertionCode: py`
_X = np.arange(10, dtype=float).reshape(10, 1)
_y = np.arange(10)
_got = fire_rates(_X, _y, np.array([1.0]), -4.5)
assert _got is not None, "fire_rates should return the list of ten rates, but it returned None. Did you finish with a return line?"
assert isinstance(_got, list) and len(_got) == 10, f"fire_rates should return a list of 10 rates, one per digit, but it returned {_got!r}"
assert [round(float(_v), 6) for _v in _got] == [0.0] * 5 + [1.0] * 5, f"with scores 0-4.5 ... 9-4.5 the digits 0-4 stay quiet and 5-9 fire, so the rates should be [0, 0, 0, 0, 0, 1, 1, 1, 1, 1], but fire_rates gave {_got!r}"
_X2 = np.array([[1.0], [3.0], [1.0], [3.0]] + [[0.0]] * 8)
_y2 = np.array([0, 0, 1, 1, 2, 3, 4, 5, 6, 7, 8, 9])
_half = fire_rates(_X2, _y2, np.array([1.0]), -2.0)
assert abs(_half[0] - 0.5) < 1e-9 and abs(_half[1] - 0.5) < 1e-9, f"digits 0 and 1 each have one picture that fires and one that does not, so their rates should be 0.5, but fire_rates gave {_half[:2]!r}"
`,
        },
        {
          id: "t5",
          description: "the detector fires for most 1s and rarely for the other digits",
          assertionCode: py`
assert stem_w is not None and np.allclose(stem_w, stem_weights()), "stem_w should be the weights returned by stem_weights()"
assert isinstance(STEM_BIAS, float), "STEM_BIAS should be a number you chose (try -2.0)"
assert isinstance(stem_rates, list) and len(stem_rates) == 10, f"stem_rates should be a list of ten firing rates, but it is {stem_rates!r}"
_want = fire_rates(X_train, y_train, stem_w, STEM_BIAS)
assert _want is not None and np.allclose(stem_rates, _want), "stem_rates should be fire_rates(X_train, y_train, stem_w, STEM_BIAS)"
assert stem_rates[1] >= 0.75, f"the neuron should fire for at least 75 percent of the 1s, but it fires for {stem_rates[1] * 100:.0f} percent. Make STEM_BIAS less negative"
_others = [_r for _i, _r in enumerate(stem_rates) if _i != 1]
assert sum(_others) / 9 <= 0.2, f"on average the neuron should fire for no more than 20 percent of the other digits, but it fires for {sum(_others) / 9 * 100:.0f} percent. Make STEM_BIAS more negative"
assert isinstance(stem_image, list) and len(stem_image) == 10 and len(stem_image[0]) == 10, "stem_image should be the weights as a 10 x 10 list of lists (stem_w.reshape(10, 10).tolist())"
assert np.allclose(np.array(stem_image).ravel(), stem_w), "stem_image should hold the same weights as stem_w, in the same order"
`,
        },
      ],
      unlocks: ["gn-neuron"],
      checks: [
        {
          prompt: "A neuron has weights [2, -1, 0.5], bias -1 and inputs [1, 3, 2]. What is its weighted sum?",
          question: { type: "number", answer: -1, tolerance: 0.001 },
          explanation: "1*2 + 3*(-1) + 2*0.5 - 1 = 2 - 3 + 1 - 1 = -1. The score is below zero, so a perceptron would stay quiet.",
        },
        {
          prompt: "You make the bias of a '1' detector much more negative. What happens to its firing rates?",
          question: {
            type: "choice",
            options: [
              "It fires less often: for 1s and for every other digit",
              "It fires more often for every digit",
              "Only the rate for 1s changes",
              "Nothing changes: only the weights matter",
            ],
            answer: 0,
            feedback: {
              1: "A more negative bias is subtracted from every score, so fewer scores stay above zero.",
              2: "The bias is added to every picture's score alike, so every digit's rate changes.",
              3: "The bias moves the score of every picture, so it changes who crosses zero.",
            },
          },
          explanation: "The bias is added to every picture's score. Making it more negative pushes all scores down, so fewer cross zero. That cuts false alarms on the other digits but also misses more real 1s.",
        },
      ],
    },

    // ───────────────────────── 3 ─────────────────────────
    {
      id: "ai-neural-3-activations",
      title: "Activations: bending the line",
      minutes: 28,
      xp: 110,
      concepts: ["activation functions", "sigmoid", "tanh", "ReLU", "derivatives", "non-linearity"],
      learn: md`### Why the hard yes/no is not enough

The perceptron's decision is a cliff: 0.001 below the threshold means 0, 0.001 above means 1. To *learn* a weight we need to ask "if I nudge this weight, does the output change a little?" and a cliff answers "no change, no change, no change, JUMP". We want a smooth bend instead. The function a neuron applies to its score is called its **activation function**. You will write three.

### Sigmoid, tanh, ReLU

~~~text
sigmoid(z) = 1 / (1 + e^-z)            squashes into (0, 1)
tanh(z)    = (e^z - e^-z)/(e^z + e^-z)   squashes into (-1, 1), centred on 0
relu(z)    = max(0, z)                 zero for negatives, a straight line for positives
~~~

You met the sigmoid in Orchard Vision as the maths of logistic regression. ReLU ("rectified linear unit") looks too simple to matter but it is the workhorse of modern networks: cheap to compute, and it does not flatten out for positive scores.

All three work **element by element**, so one function call handles a single number, a vector or a whole table. For ReLU you need \`np.maximum(0.0, z)\`, which compares each element with 0. (\`np.max(0, z)\` is something else, a reduction along an axis, and fails with \`TypeError: only integer scalar arrays can be converted to a scalar index\`.)

### Slopes: the derivative of each

Training in the coming lessons asks "how much does the output move when the score moves?". That is the **derivative** of the activation, written \`d_sigmoid\`, \`d_tanh\`, \`d_relu\` in your code:

~~~text
sigmoid'(z) = sigmoid(z) * (1 - sigmoid(z))     at most 0.25 (at z = 0)
tanh'(z)    = 1 - tanh(z)^2                    at most 1 (at z = 0)
relu'(z)    = 1 if z > 0 else 0
~~~

Notice what these tell you. The sigmoid and tanh slopes shrink toward 0 when the score is large in either direction: the neuron is **saturated** and barely learns, which is called a vanishing gradient. The ReLU slope is exactly 1 for every positive score, so it passes the gradient along unchanged, but it is exactly 0 for negatives. A ReLU unit that is negative for every picture has a gradient of 0 forever and never recovers: a "dead" unit. (At exactly z = 0 the slope is undefined; the convention here is 0, which \`(z > 0).astype(float)\` gives.)

### Why a network needs a bend at all

Here is the reason activations exist, not just the smoothness. Stack two layers **without** an activation:

~~~python
out = (x @ Wa + ba) @ Wb + bb
~~~

Multiplying out gives \`x @ (Wa @ Wb) + (ba @ Wb + bb)\`: the same shape of formula as ONE layer, with weights \`Wa @ Wb\` and bias \`ba @ Wb + bb\`. However many linear layers you stack, they collapse into one, and one layer can only draw a straight cut. You will write \`merge_linear\` to prove it.

### XOR: the puzzle one line cannot solve

Inputs (a, b) are 0 or 1. The **XOR** answer is 1 when exactly one of them is 1:

~~~text
a b  xor
0 0   0
0 1   1
1 0   1
1 1   0
~~~

Plot the four points: the two 1s sit on one diagonal and the two 0s on the other. No straight line separates them. But a single bend does. Take two hidden neurons that both look at \`a + b\`, give one of them a bias of -1, pass both through ReLU, and subtract twice the second from the first:

~~~text
h1 = relu(a + b)        h2 = relu(a + b - 1)        out = h1 - 2*h2
(1, 1): h1 = 2, h2 = 1  ->  out = 0        (0, 1): h1 = 1, h2 = 0  ->  out = 1
~~~

The ReLU bend is what lets the second neuron switch on only when both inputs are 1. That is the whole power of hidden layers in miniature.

### Making a table for the stage

The Activation lab draws your curves. \`curve_table(z)\` builds a dictionary of plain lists: the inputs \`z\`, the three activations and the three slopes. \`.tolist()\` makes each array stage-ready.

### Common mistakes

- **Using Python's \`math.exp\` or \`max\`** on arrays: they only handle single numbers.
- **\`RuntimeWarning: overflow encountered in exp\`** from \`sigmoid(-1000)\`: harmless here, the result is a clean 0.0.
- **Wrong tanh slope**: it is \`1 - tanh(z)**2\`, with the square.
- **Forgetting that \`d_relu\` must return floats** (\`.astype(float)\`), because later lessons multiply it into gradients.`,
      mission: md`A neuron with a cliff cannot be taught. The gardeners replace the hard yes/no with smooth bends, then discover why they matter: without one, a whole forest of layers is secretly a single stick.

Write the three activations and their slopes, prove that stacked linear layers collapse, and use ReLU bends to solve the XOR puzzle. When this passes, the **Activation lab** opens: your three curves with their slopes, and the XOR table.`,
      tasks: [
        "sigmoid, tanh_act and relu, plus d_sigmoid, d_tanh and d_relu: each works element by element on numbers or arrays",
        "merge_linear(Wa, ba, Wb, bb): the single weights and bias equal to two linear layers in a row",
        "Set XOR_W1, XOR_B1, XOR_W2 and write xor_net(x) so it answers 0, 1, 1, 0 for the four inputs",
        "curve_table(z): a dict of plain lists with keys z, sigmoid, tanh, relu, d_sigmoid, d_tanh, d_relu",
        "Fill in curves (z from -6 to 6 in 49 steps) and xor_table (rows [a, b, output])",
      ],
      starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 3: activations.
#
# All of these work element by element, so a single call handles a number,
# a vector or a whole table of scores.


def sigmoid(z):
    """1 / (1 + e^-z): squashes any number into (0, 1)."""
    ...


def d_sigmoid(z):
    """The slope of sigmoid: sigmoid(z) * (1 - sigmoid(z))."""
    ...


def tanh_act(z):
    """tanh squashes into (-1, 1). NumPy has np.tanh."""
    ...


def d_tanh(z):
    """The slope of tanh: 1 - tanh(z) ** 2."""
    ...


def relu(z):
    """0 for negative scores, z itself for positive ones. Use np.maximum, not np.max."""
    ...


def d_relu(z):
    """The slope of relu: 1.0 where z > 0, otherwise 0.0 (as floats)."""
    ...


def merge_linear(Wa, ba, Wb, bb):
    """Two linear layers in a row, x @ Wa + ba and then @ Wb + bb, equal ONE layer.
    Return that one layer's (W, b)."""
    ...


# The XOR puzzle: two hidden ReLU neurons and one output.
# Hint from the lesson: h1 = relu(a + b), h2 = relu(a + b - 1), out = h1 - 2 * h2.
XOR_W1 = np.zeros((2, 2))  # input -> hidden, shape (2, 2)
XOR_B1 = np.zeros(2)       # hidden biases
XOR_W2 = np.zeros(2)       # hidden -> output, shape (2,)


def xor_net(x):
    """x is [a, b]. Run it through the hidden ReLU layer and the output, return a plain float."""
    ...


def curve_table(z):
    """z is an array. Return a dict of plain lists (use .tolist()) with the keys
    "z", "sigmoid", "tanh", "relu", "d_sigmoid", "d_tanh", "d_relu"."""
    ...


# Fill these in for the stage. Replace the placeholders:
curves = {}      # curve_table of 49 evenly spaced numbers from -6 to 6 (np.linspace)
xor_table = []   # four rows [a, b, xor_net([a, b])] for a, b in (0, 0), (0, 1), (1, 0), (1, 1)`,
      solutionAdd: py`def sigmoid(z):
    return 1.0 / (1.0 + np.exp(-z))


def d_sigmoid(z):
    s = sigmoid(z)
    return s * (1.0 - s)


def tanh_act(z):
    return np.tanh(z)


def d_tanh(z):
    return 1.0 - np.tanh(z) ** 2


def relu(z):
    return np.maximum(0.0, z)


def d_relu(z):
    return (z > 0).astype(float)


def merge_linear(Wa, ba, Wb, bb):
    # (x @ Wa + ba) @ Wb + bb  =  x @ (Wa @ Wb) + (ba @ Wb + bb)
    return Wa @ Wb, ba @ Wb + bb


XOR_W1 = np.array([[1.0, 1.0], [1.0, 1.0]])  # both hidden neurons look at a + b
XOR_B1 = np.array([0.0, -1.0])                # the second one only wakes up above 1
XOR_W2 = np.array([1.0, -2.0])


def xor_net(x):
    return float(relu(np.array(x, dtype=float) @ XOR_W1 + XOR_B1) @ XOR_W2)


def curve_table(z):
    return {
        "z": z.tolist(),
        "sigmoid": sigmoid(z).tolist(),
        "tanh": tanh_act(z).tolist(),
        "relu": relu(z).tolist(),
        "d_sigmoid": d_sigmoid(z).tolist(),
        "d_tanh": d_tanh(z).tolist(),
        "d_relu": d_relu(z).tolist(),
    }


curves = curve_table(np.linspace(-6, 6, 49))
xor_table = [[a, b, xor_net([a, b])] for a in (0, 1) for b in (0, 1)]`,
      explanation:
        "The activations are one-liners that work element by element: sigmoid squashes with 1/(1+e^-z), tanh is np.tanh, relu is np.maximum(0, z). Their slopes follow from calculus: sigmoid*(1-sigmoid), 1-tanh^2, and 1 where z>0 for ReLU. merge_linear is just associativity of matrix multiplication, which proves that stacked linear layers collapse into one. For XOR, both hidden units see a+b; the second has a bias of -1 so it only switches on for (1, 1), and the output subtracts twice its activation to cancel the first unit there. curve_table converts every array to a plain list so the stage can read it.",
      hints: [
        { id: "h1", title: "The six one-liners", content: "sigmoid: 1.0 / (1.0 + np.exp(-z)). d_sigmoid: compute s = sigmoid(z) and return s * (1.0 - s). tanh_act is np.tanh(z) and d_tanh is 1.0 - np.tanh(z) ** 2. relu is np.maximum(0.0, z) and d_relu is (z > 0).astype(float)." },
        { id: "h2", title: "Merging and XOR", content: "Multiplying out (x @ Wa + ba) @ Wb + bb gives x @ (Wa @ Wb) + (ba @ Wb + bb). For XOR use XOR_W1 = [[1, 1], [1, 1]], XOR_B1 = [0, -1], XOR_W2 = [1, -2]; xor_net computes relu(x @ XOR_W1 + XOR_B1) @ XOR_W2, wrapped in float()." },
        { id: "h3", title: "Tables for the stage", content: 'curve_table returns {"z": z.tolist(), "sigmoid": sigmoid(z).tolist(), ...} with all seven keys. Then curves = curve_table(np.linspace(-6, 6, 49)) and xor_table = [[a, b, xor_net([a, b])] for a in (0, 1) for b in (0, 1)].' },
      ],
      tests: [
        {
          id: "t1",
          description: "sigmoid and its slope squash numbers into (0, 1)",
          assertionCode: py`
_z = np.array([-2.0, 0.0, 2.0])
with np.errstate(all="ignore"):
    _got = sigmoid(_z)
    _slope = d_sigmoid(_z)
assert _got is not None, "sigmoid should return the squashed numbers, but it returned None. Did you finish with a return line?"
assert np.allclose(_got, [0.11920, 0.5, 0.88080], atol=1e-4), f"sigmoid([-2, 0, 2]) should be about [0.119, 0.5, 0.881], but it returned {np.round(_got, 3).tolist()}"
assert abs(float(sigmoid(0.0)) - 0.5) < 1e-12, "sigmoid(0) should be exactly 0.5 and should also work on a single number"
assert _slope is not None, "d_sigmoid should return the slopes, but it returned None. Did you finish with a return line?"
assert np.allclose(_slope, [0.10499, 0.25, 0.10499], atol=1e-4), f"the sigmoid slope at [-2, 0, 2] should be about [0.105, 0.25, 0.105], but d_sigmoid returned {np.round(_slope, 3).tolist()}"
with np.errstate(all="ignore"):
    _far = sigmoid(np.array([-1000.0, 1000.0]))
assert np.allclose(_far, [0.0, 1.0]), "very large scores should saturate to 0.0 and 1.0, not nan"
`,
        },
        {
          id: "t2",
          description: "tanh and ReLU and their slopes work element by element",
          assertionCode: py`
_z = np.array([-2.0, 0.0, 1.5])
_t = tanh_act(_z)
assert _t is not None, "tanh_act should return the squashed numbers, but it returned None. Did you finish with a return line?"
assert np.allclose(_t, np.tanh(_z)), f"tanh_act([-2, 0, 1.5]) should be about [-0.964, 0, 0.905], but it returned {np.round(_t, 3).tolist()}"
_dt = d_tanh(_z)
assert _dt is not None and np.allclose(_dt, 1.0 - np.tanh(_z) ** 2), f"the tanh slope is 1 - tanh(z) squared: about [0.071, 1, 0.181], but d_tanh returned {None if _dt is None else np.round(_dt, 3).tolist()}"
_r = relu(np.array([[-3.0, 0.0, 4.0], [2.0, -0.5, 0.5]]))
assert _r is not None, "relu should return the result, but it returned None. Did you finish with a return line?"
assert np.allclose(_r, [[0, 0, 4], [2, 0, 0.5]]), f"relu should turn negatives into 0 and keep positives, but it returned {np.asarray(_r).tolist()}"
_dr = d_relu(np.array([-3.0, 0.0, 4.0]))
assert _dr is not None, "d_relu should return the slopes, but it returned None. Did you finish with a return line?"
assert np.asarray(_dr).dtype.kind == "f" and np.allclose(_dr, [0.0, 0.0, 1.0]), f"the ReLU slope is 1.0 for z > 0 and 0.0 otherwise (as floats), but d_relu returned {np.asarray(_dr).tolist()}"
`,
        },
        {
          id: "t3",
          description: "merge_linear collapses two linear layers into one",
          assertionCode: py`
_r = np.random.RandomState(0)
_Wa, _ba = _r.randn(4, 3), _r.randn(3)
_Wb, _bb = _r.randn(3, 2), _r.randn(2)
_x = _r.randn(5, 4)
_got = merge_linear(_Wa, _ba, _Wb, _bb)
assert _got is not None, "merge_linear should return a pair (W, b), but it returned None. Did you finish with a return line?"
assert len(_got) == 2, "merge_linear should return two things: the merged weights W and the merged bias b"
_W, _b = _got
assert np.shape(_W) == (4, 2) and np.shape(_b) == (2,), f"the merged layer should take 4 inputs to 2 outputs, so W has shape (4, 2) and b shape (2,), but they are {np.shape(_W)} and {np.shape(_b)}"
assert np.allclose(_x @ _W + _b, (_x @ _Wa + _ba) @ _Wb + _bb), "one layer with the merged W and b should give exactly the same answers as the two layers in a row. Check the order: Wa @ Wb, and ba @ Wb + bb"
`,
        },
        {
          id: "t4",
          description: "xor_net answers 0, 1, 1, 0 using a hidden ReLU layer",
          assertionCode: py`
_cases = [([0, 0], 0.0), ([0, 1], 1.0), ([1, 0], 1.0), ([1, 1], 0.0)]
for _inp, _want in _cases:
    _got = xor_net(_inp)
    assert _got is not None, "xor_net should return a number, but it returned None. Did you finish with a return line?"
    assert isinstance(_got, float), f"xor_net should return a plain float, but it returned a {type(_got).__name__}. Wrap the answer in float(...)"
    assert abs(_got - _want) < 1e-6, f"xor_net({_inp}) should be {_want:.0f} (XOR is 1 when exactly one input is 1), but it returned {_got:.3f}. Set XOR_W1, XOR_B1 and XOR_W2 so the second hidden unit only wakes up for (1, 1)"
assert np.shape(XOR_W1) == (2, 2) and np.shape(XOR_B1) == (2,) and np.shape(XOR_W2) == (2,), "XOR_W1 should have shape (2, 2), XOR_B1 shape (2,) and XOR_W2 shape (2,)"
`,
        },
        {
          id: "t5",
          description: "curve_table, curves and xor_table are plain lists for the stage",
          assertionCode: py`
_zz = np.linspace(-1, 1, 5)
_got = curve_table(_zz)
assert isinstance(_got, dict), f"curve_table should return a dict, but it returned {_got!r}"
for _key in ("z", "sigmoid", "tanh", "relu", "d_sigmoid", "d_tanh", "d_relu"):
    assert _key in _got, f"curve_table is missing the key {_key!r}"
    assert isinstance(_got[_key], list) and len(_got[_key]) == 5, f"curve_table[{_key!r}] should be a plain list of 5 numbers (use .tolist()), but it is {_got[_key]!r}"
assert np.allclose(_got["tanh"], np.tanh(_zz)) and np.allclose(_got["relu"], [0, 0, 0, 0.5, 1.0]), "the tanh and relu lists should hold those functions applied to z"
assert np.allclose(_got["d_sigmoid"], sigmoid(_zz) * (1 - sigmoid(_zz))), "the d_sigmoid list should hold the sigmoid slope at every z"
assert isinstance(curves, dict) and len(curves.get("z", [])) == 49, "curves should be curve_table(np.linspace(-6, 6, 49)): a dict whose lists have 49 entries"
assert abs(curves["z"][0] + 6.0) < 1e-9 and abs(curves["z"][-1] - 6.0) < 1e-9, "curves['z'] should run from -6 to 6"
assert isinstance(xor_table, list) and len(xor_table) == 4, "xor_table should have four rows, one per input pair"
assert [[_r[0], _r[1], round(_r[2])] for _r in xor_table] == [[0, 0, 0], [0, 1, 1], [1, 0, 1], [1, 1, 0]], f"xor_table should be rows [a, b, xor_net([a, b])] for (0,0), (0,1), (1,0), (1,1), but it is {xor_table!r}"
`,
        },
      ],
      unlocks: ["gn-activations"],
      checks: [
        {
          prompt: "What is the largest value the slope of the sigmoid ever reaches? (It happens at z = 0.)",
          question: { type: "number", answer: 0.25, tolerance: 0.001 },
          explanation: "sigmoid(0) = 0.5, so the slope is 0.5 * (1 - 0.5) = 0.25. Passing a gradient back through five sigmoid layers can shrink it by 0.25 five times, to about a thousandth: the vanishing-gradient problem that made ReLU popular.",
        },
        {
          prompt: "Why can't you build XOR by stacking linear layers with no activation between them?",
          question: {
            type: "choice",
            options: [
              "They collapse into one linear layer, which can only draw a straight cut",
              "The weights would all be zero",
              "Matrix multiplication cannot be repeated",
              "XOR needs three inputs",
            ],
            answer: 0,
            feedback: {
              1: "The weights can be anything. The problem is what the layers add up to, not their size.",
              2: "You can multiply as many matrices as you like. That is exactly why they merge into one.",
              3: "XOR has two inputs. The trouble is that no straight line separates its 1s from its 0s.",
            },
          },
          explanation: "(x @ Wa + ba) @ Wb + bb is x @ (Wa @ Wb) + (ba @ Wb + bb): one linear layer. A bend between the layers, like ReLU, is what stops the collapse and gives hidden layers their power.",
        },
      ],
    },

    // ───────────────────────── 4 ─────────────────────────
    {
      id: "ai-neural-4-layers",
      title: "Layers as matrix multiplies",
      minutes: 30,
      xp: 115,
      concepts: ["matrix multiplication", "shapes", "broadcasting", "batch forward pass", "parameters"],
      learn: md`### From one neuron to a layer

A layer is a crowd of neurons that all look at the same inputs. Lining their weight vectors up as the **columns** of a table gives a weight matrix \`W\`. One matrix multiplication then runs every neuron on every picture at once.

~~~text
X  (n pictures, 100 inputs)       W  (100 inputs, 24 neurons)       b  (24,)
X @ W  ->  (n, 24)               one score per picture per neuron
~~~

The rule that makes everything in this course work: **for \`A @ B\`, the inner sizes must match and they vanish**. \`(n, 100) @ (100, 24)\` is fine and gives \`(n, 24)\`. The outer sizes remain. Say the shapes out loud before you write a line and most bugs disappear.

### The bias is added to every row

\`X @ W\` has shape \`(n, 24)\` but the bias \`b\` has shape \`(24,)\`: one number per neuron, not per picture. NumPy's **broadcasting** lines the shapes up from the right: the bias is treated as a row and added to every picture's row. No loop, no copying.

~~~python
scores = X @ W + b       # (n, 24) + (24,)  ->  (n, 24)
~~~

When the sizes do not match, NumPy says so, and it is worth recognising the messages:

~~~text
ValueError: matmul: Input operand 1 has a mismatch in its core dimension 0, ... (size 24 is different from 100)
ValueError: operands could not be broadcast together with shapes (8,10) (24,)
~~~

The first one means you multiplied matrices whose inner sizes differ (usually a swapped weight matrix). The second means you added a bias of the wrong length.

### Two layers: the whole network

Our reader is two layers with a ReLU between them (this is why lesson 3 came first):

~~~text
Z1 = X  @ W1 + b1      (n, 24)    scores of the 24 hidden sprouts
H  = relu(Z1)          (n, 24)    their activations
Z2 = H  @ W2 + b2      (n, 10)    one score per digit
~~~

\`Z2\` holds the **logits**, ten raw scores per picture. Next lesson turns them into probabilities. This one-way trip from pixels to scores is called the **forward pass**. We keep \`Z1\` as well as \`H\` because backpropagation (lessons 7 and 8) needs it.

### Parameters in a dictionary

Four arrays define the network: \`W1\` (100, 24), \`b1\` (24,), \`W2\` (24, 10), \`b2\` (10,). Keep them in one dictionary, \`params\`. Functions take \`params\` and return results, and gradients will later come back in a dictionary with the same keys. That is 100*24 + 24 + 24*10 + 10 = **2674** numbers to learn.

For now the weights are small random numbers from a seeded generator (lesson 6 explains how big they should be). \`rng.randn(100, 24)\` makes a table of bell-curve numbers; times 0.1 makes them small. Draw \`W1\` before \`W2\` from the *same* generator.

### Handing the weights to the stage

The Network panel draws your weights. Arrays cannot cross to the stage, so \`params_to_lists\` converts each array in the dictionary with \`.tolist()\`, and you publish the result as \`net_view\`. Keep that name: later lessons overwrite it with better trained weights and the picture improves.

### Common mistakes

- **Swapping the weight shape**: \`(24, 100)\` instead of \`(100, 24)\`. If you think of "weights for each neuron" as rows, remember the matrix needs them as columns.
- **Forgetting the bias** or giving it the wrong length.
- **Applying ReLU to the final scores.** The output layer stays linear; softmax comes next.
- **Looping over pictures** with a Python \`for\`. One \`@\` handles the whole batch.
- **Modifying the inputs.** Build new arrays; never write into \`X\` or the parameters.`,
      mission: md`Time to plant a whole bed. One neuron is a sprout; a layer is a row of them, all reading the same picture, and two layers make a tiny forest that turns a glyph into ten scores.

Write the layer function and the two-layer forward pass, plant the starting weights, and push eight test glyphs through. When this passes, **The network** appears on the stage: 100 pixels, 24 hidden sprouts and 10 outputs, joined by weight-coloured edges that light up for the glyph you pick.`,
      tasks: [
        "Set N_IN, N_HIDDEN, N_OUT to 100, 24 and 10",
        "dense(X, W, b): one layer, X @ W + b",
        "forward(X, params): return Z1, H, Z2 for a whole batch (ReLU between the layers, none after)",
        "params_to_lists(params): the same dict with every array turned into a plain list",
        "Build demo_params from RandomState(5): W1 and W2 are randn times 0.1, the biases are zeros. Then fill in Z1_demo / H_demo / logits_demo for X_test[:8], shape_report and net_view",
      ],
      starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 4: layers as matrix multiplies.
#
# The network: 100 pixels -> 24 hidden ReLU neurons -> 10 output scores.
# Parameters live in a dict: "W1" (100, 24), "b1" (24,), "W2" (24, 10), "b2" (10,).

N_IN, N_HIDDEN, N_OUT = 0, 0, 0  # replace: the number of inputs, hidden neurons and outputs


def dense(X, W, b):
    """One layer for a whole batch: X @ W + b. X is (n, inputs), W is (inputs, neurons), b is (neurons,)."""
    ...


def forward(X, params):
    """The forward pass for a whole batch. Return three arrays (Z1, H, Z2):
    Z1 = dense(X, W1, b1), H = relu(Z1), Z2 = dense(H, W2, b2)."""
    ...


def params_to_lists(params):
    """The same dict, but each array replaced by a plain nested list (.tolist()) for the stage."""
    ...


# Starting weights: small random numbers. Draw W1 first, then W2, from the SAME generator.
demo_rng = np.random.RandomState(5)
demo_params = {}  # "W1": randn(N_IN, N_HIDDEN) * 0.1, "b1": zeros, "W2": randn(N_HIDDEN, N_OUT) * 0.1, "b2": zeros

# Push eight test glyphs through, then publish the results. Replace the placeholders:
Z1_demo, H_demo, logits_demo = None, None, None  # forward(X_test[:8], demo_params)
shape_report = {}  # each parameter's name -> its shape as a list, e.g. {"W1": [100, 24], ...}
net_view = {}      # params_to_lists(demo_params)`,
      solutionAdd: py`N_IN, N_HIDDEN, N_OUT = SIZE * SIZE, 24, 10


def dense(X, W, b):
    return X @ W + b   # (n, inputs) @ (inputs, neurons) + (neurons,)  ->  (n, neurons)


def forward(X, params):
    Z1 = dense(X, params["W1"], params["b1"])
    H = relu(Z1)
    Z2 = dense(H, params["W2"], params["b2"])
    return Z1, H, Z2


def params_to_lists(params):
    return {name: value.tolist() for name, value in params.items()}


demo_rng = np.random.RandomState(5)
demo_params = {
    "W1": demo_rng.randn(N_IN, N_HIDDEN) * 0.1,
    "b1": np.zeros(N_HIDDEN),
    "W2": demo_rng.randn(N_HIDDEN, N_OUT) * 0.1,
    "b2": np.zeros(N_OUT),
}
Z1_demo, H_demo, logits_demo = forward(X_test[:8], demo_params)
shape_report = {name: list(value.shape) for name, value in demo_params.items()}
net_view = params_to_lists(demo_params)`,
      explanation:
        "dense is a single line: the matrix product runs every neuron on every picture, and broadcasting adds the bias row to each row of scores. forward stacks two of them with ReLU in between and returns Z1 and H as well as the final scores, because backpropagation will need them. params_to_lists converts each array with .tolist() so the stage can draw the weights. demo_params draws W1 then W2 from one seeded generator, scaled by 0.1, with zero biases; the forward pass on eight test glyphs gives 8 x 24 hidden scores and 8 x 10 logits.",
      hints: [
        { id: "h1", title: "One layer, two layers", content: 'dense is just X @ W + b. In forward, write Z1 = dense(X, params["W1"], params["b1"]), then H = relu(Z1), then Z2 = dense(H, params["W2"], params["b2"]), and return Z1, H, Z2.' },
        { id: "h2", title: "Starting weights", content: 'Set N_IN, N_HIDDEN, N_OUT = SIZE * SIZE, 24, 10 (SIZE is 10). Then demo_params = {"W1": demo_rng.randn(N_IN, N_HIDDEN) * 0.1, "b1": np.zeros(N_HIDDEN), "W2": demo_rng.randn(N_HIDDEN, N_OUT) * 0.1, "b2": np.zeros(N_OUT)}. Keep W1 before W2 so the draws happen in that order.' },
        { id: "h3", title: "Publishing", content: "params_to_lists is {name: value.tolist() for name, value in params.items()}. Then Z1_demo, H_demo, logits_demo = forward(X_test[:8], demo_params); shape_report = {name: list(value.shape) for name, value in demo_params.items()}; net_view = params_to_lists(demo_params)." },
      ],
      tests: [
        {
          id: "t1",
          description: "the network sizes are 100, 24 and 10, and dense is X @ W + b with the bias on every row",
          assertionCode: py`
assert (N_IN, N_HIDDEN, N_OUT) == (100, 24, 10), f"N_IN, N_HIDDEN, N_OUT should be 100, 24 and 10 (pixels, hidden neurons, digits), but they are {(N_IN, N_HIDDEN, N_OUT)}"
_X = np.array([[1.0, 2.0], [3.0, 4.0], [0.0, 1.0]])
_W = np.array([[1.0, 0.0, -1.0], [0.5, 2.0, 1.0]])
_b = np.array([10.0, 20.0, 30.0])
_got = dense(_X, _W, _b)
assert _got is not None, "dense should return the layer's scores, but it returned None. Did you finish with a return line?"
_got = np.asarray(_got)
assert _got.shape == (3, 3), f"3 pictures through a layer of 3 neurons should give shape (3, 3), but dense returned shape {_got.shape}"
assert np.allclose(_got, [[12.0, 24.0, 31.0], [15.0, 28.0, 31.0], [10.5, 22.0, 31.0]]), f"dense(X, W, b) should be X @ W + b with the bias added to EVERY row, but it returned {_got.tolist()}"
`,
        },
        {
          id: "t2",
          description: "forward runs a batch through both layers with ReLU in between",
          assertionCode: py`
_p = {
    "W1": np.array([[1.0, -1.0], [0.0, 2.0]]),
    "b1": np.array([0.0, -5.0]),
    "W2": np.array([[1.0, 2.0, 3.0], [4.0, 5.0, 6.0]]),
    "b2": np.array([0.5, 0.0, -1.0]),
}
_X = np.array([[1.0, 2.0], [0.0, 0.0]])
_got = forward(_X, _p)
assert _got is not None, "forward should return three arrays (Z1, H, Z2), but it returned None. Did you finish with a return line?"
assert len(_got) == 3, "forward should return three things: Z1, H and Z2"
_Z1, _H, _Z2 = [np.asarray(_a) for _a in _got]
assert _Z1.shape == (2, 2) and _H.shape == (2, 2) and _Z2.shape == (2, 3), f"for 2 inputs, 2 hidden neurons and 3 outputs the shapes should be (2, 2), (2, 2) and (2, 3), but they are {_Z1.shape}, {_H.shape}, {_Z2.shape}"
assert np.allclose(_Z1, [[1.0, -2.0], [0.0, -5.0]]), f"Z1 = X @ W1 + b1 should be [[1, -2], [0, -5]], but it is {_Z1.tolist()}"
assert np.allclose(_H, [[1.0, 0.0], [0.0, 0.0]]), f"H should be relu(Z1), with the negatives turned into 0: [[1, 0], [0, 0]], but it is {_H.tolist()}"
assert np.allclose(_Z2, [[1.5, 2.0, 2.0], [0.5, 0.0, -1.0]]), f"Z2 = H @ W2 + b2 should be [[1.5, 2, 2], [0.5, 0, -1]], but it is {_Z2.tolist()}. The output layer has no ReLU"
_before = _p["W1"].copy()
forward(_X, _p)
assert np.array_equal(_p["W1"], _before), "forward changed the parameters it was given. It should only read them"
`,
        },
        {
          id: "t3",
          description: "params_to_lists turns every array into a plain list",
          assertionCode: py`
import json as _json
_p = {"W1": np.array([[1.0, 2.0], [3.0, 4.0]]), "b1": np.array([0.5, -0.5])}
_got = params_to_lists(_p)
assert _got is not None, "params_to_lists should return a dict, but it returned None. Did you finish with a return line?"
assert isinstance(_got, dict) and set(_got) == {"W1", "b1"}, f"params_to_lists should return a dict with the same keys, but it returned {_got!r}"
assert _got["W1"] == [[1.0, 2.0], [3.0, 4.0]] and _got["b1"] == [0.5, -0.5], f"each array should become a plain nested list (use .tolist()), but the result was {_got!r}"
assert isinstance(_got["W1"], list), "the weights should be a plain list, not a NumPy array"
_json.dumps(_got)
`,
        },
        {
          id: "t4",
          description: "demo_params are small random weights from RandomState(5), with zero biases",
          assertionCode: py`
assert isinstance(demo_params, dict) and set(demo_params) == {"W1", "b1", "W2", "b2"}, f"demo_params should be a dict with the keys W1, b1, W2, b2, but it is {demo_params!r}"
assert demo_params["W1"].shape == (100, 24) and demo_params["b1"].shape == (24,), f"W1 should have shape (100, 24) and b1 shape (24,), but they are {demo_params['W1'].shape} and {demo_params['b1'].shape}"
assert demo_params["W2"].shape == (24, 10) and demo_params["b2"].shape == (10,), f"W2 should have shape (24, 10) and b2 shape (10,), but they are {demo_params['W2'].shape} and {demo_params['b2'].shape}"
assert not demo_params["b1"].any() and not demo_params["b2"].any(), "the biases should start at zero"
_r = np.random.RandomState(5)
_w1 = _r.randn(100, 24) * 0.1
_w2 = _r.randn(24, 10) * 0.1
assert np.allclose(demo_params["W1"], _w1), "W1 should be np.random.RandomState(5).randn(100, 24) * 0.1: drawn FIRST from the generator, and times 0.1"
assert np.allclose(demo_params["W2"], _w2), "W2 should be drawn SECOND from the same generator: demo_rng.randn(24, 10) * 0.1"
`,
        },
        {
          id: "t5",
          description: "the demo forward pass, shape report and net_view are published",
          assertionCode: py`
_a, _b, _c = forward(X_test[:8], demo_params)
assert Z1_demo is not None and np.shape(Z1_demo) == (8, 24), f"Z1_demo should have shape (8, 24), one row per test glyph, but it is {np.shape(Z1_demo)}"
assert np.allclose(Z1_demo, _a) and np.allclose(H_demo, _b) and np.allclose(logits_demo, _c), "Z1_demo, H_demo and logits_demo should be forward(X_test[:8], demo_params)"
assert np.shape(logits_demo) == (8, 10) and float(np.min(H_demo)) >= 0.0, "logits_demo should be (8, 10) and H_demo (the ReLU output) should have no negative numbers"
assert shape_report == {"W1": [100, 24], "b1": [24], "W2": [24, 10], "b2": [10]}, f"shape_report should map each parameter name to its shape as a list, e.g. {{'W1': [100, 24], ...}}, but it is {shape_report!r}"
assert isinstance(net_view, dict) and set(net_view) == {"W1", "b1", "W2", "b2"}, "net_view should be params_to_lists(demo_params), a dict with the four keys"
assert isinstance(net_view["W1"], list) and len(net_view["W1"]) == 100 and len(net_view["W1"][0]) == 24, "net_view['W1'] should be a nested list with 100 rows of 24 numbers"
`,
        },
      ],
      unlocks: ["gn-network"],
      checks: [
        {
          prompt: "How many numbers does this network have to learn in total? (W1 is 100 x 24, b1 has 24, W2 is 24 x 10, b2 has 10.) Type the total.",
          question: { type: "number", answer: 2674, tolerance: 0 },
          explanation: "100*24 = 2400, plus 24, plus 24*10 = 240, plus 10: 2674. Every one of them gets a gradient in lessons 7 and 8.",
        },
        {
          prompt: "A batch X has shape (32, 100) and W1 has shape (100, 24). What shape is X @ W1?",
          question: {
            type: "choice",
            options: ["(32, 24)", "(100, 100)", "(32, 100)", "(24, 32)"],
            answer: 0,
            feedback: {
              1: "The 100s are the inner sizes: they must match, and then they disappear.",
              2: "100 is the inner size and vanishes. The layer's 24 neurons remain.",
              3: "The batch size comes first: one row per picture.",
            },
          },
          explanation: "For A @ B the inner sizes (100 and 100) match and disappear; the outer sizes remain: 32 pictures by 24 hidden scores.",
        },
      ],
    },
  ],
};
