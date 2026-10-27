import type { Chapter } from "@/engine/types";
import { md, py } from "./util.ts";

/**
 * Chapter 4: Pruning. Training well: overfitting and weight decay, learning-rate schedules and
 * momentum, validation sets with early stopping and hyperparameter picking, and the finished reader.
 *
 * Names this chapter adds (all others come from chapters 1 to 3 and must not be reused):
 *   SMALL_N, DECAYED, smudge_labels, X_small, y_small, params_free, params_decay, l2_penalty,
 *   add_weight_decay, train_decayed, history_free, history_decay, gap_free, gap_decay, weight_size,
 *   step_decay, exp_decay, warmup, momentum_step, train_scheduled, SCHEDULES, lr_curves,
 *   schedule_study, history_sched, X_fit, X_val, y_fit, y_val, mean_loss, train_stopping,
 *   pick_learning_rate, best_lr, lr_scores, params_stop, history_stop, stop_info, train_recogniser,
 *   final_params, history_final, predict, report, final_confusion.
 */

export const chapter4: Chapter = {
  id: "pruning",
  title: "Pruning: training well",
  blurb: "Overfitting, regularisation, learning-rate seasons, early stopping and the finished reader.",
  lessons: [
    // ───────────────────────── 13 ─────────────────────────
    {
      id: "ai-neural-13-overfit",
      title: "Overfitting and weight decay",
      minutes: 30,
      xp: 140,
      concepts: ["overfitting", "train/test gap", "label noise", "L2 penalty", "weight decay"],
      learn: md`### The curve that splits

Since lesson 10 you have watched two numbers climb together: accuracy on the glyphs the net trains on, and accuracy on glyphs it has never seen. Today they come apart. A reader that scores 94% on its study pile and 78% on fresh pages is partly not reading, it is **memorising** the pile. That is **overfitting**, and the distance between the two numbers is the **gap**:

~~~text
gap = train accuracy - held-out accuracy
~~~

A healthy net has a small gap. A big gap means the net learned things about *those particular pictures* that are not true of digits in general.

### Why a network can memorise

Count the knobs. A net with 32 hidden units that reads 100 pixels has \`100 * 32 + 32 + 32 * 10 + 10 = 3562\` parameters. The small seed bed in this lesson holds only 150 pictures, about 24 knobs per picture. With that much freedom the net can afford to give individual pictures their own private corner of the map.

Memorising needs a reason, and the most common reason is **noise in the labels**. In the small bed, 22 of the 150 labels were written down wrongly by a tired label-writer: a clean 4 is marked 9, a clear 1 is marked 6. No pattern of ink explains those labels, so the only way to get them right is to remember each picture one by one. A net with no restraint will do exactly that, and you pay for it on every new picture, because the bends it makes around the wrong ones spill over onto their neighbours. Other causes of overfitting are a tiny dataset, a model with far more knobs than data, and training for a very long time.

### Big weights make sharp bends

What does memorising look like inside the net? A hidden unit computes \`relu(x . w + b)\`. Take two pictures that differ by one pixel, 0.50 against 0.55:

~~~text
weight w = 1   ->  outputs 0.50 and 0.55   (a gap of 0.05: gentle)
weight w = 40  ->  outputs 20.0 and 22.0   (a gap of 2.00: a cliff)
~~~

To give two near-identical pictures *different* answers, some weights have to be huge. Small weights can only draw gentle, smooth functions where similar inputs get similar outputs, which is exactly the behaviour we want for pictures we have not seen. So the cure is to make big weights **expensive**.

### The L2 penalty

Add a charge to the loss:

~~~text
total = data_loss + 0.5 * lam * (every weight squared, added up)
~~~

\`lam\` (the Greek letter lambda, spelled short because \`lambda\` is a Python keyword) says how expensive weights are. Worked example: a layer holding the weights 3 and -4, with \`lam = 0.1\`. The squares are 9 and 16, which add up to 25, so the penalty is \`0.5 * 0.1 * 25 = 1.25\`. Squaring means one huge weight costs far more than several small ones.

Only the weight matrices are charged, never the biases. A bias slides a unit's threshold left or right but does not make the function steeper, so charging it would drag thresholds towards zero for no benefit. In the code that is the tuple \`DECAYED = ("W1", "W2")\`.

### From penalty to code: weight decay

The slope of \`0.5 * lam * w * w\` is \`lam * w\`. So the penalty adds \`lam * W\` to the gradient of each weight matrix, and the usual update \`w -= lr * (g + lam * w)\` can be rearranged:

~~~text
w = (1 - lr * lam) * w  -  lr * g
~~~

First every weight **shrinks** by a small fraction (with \`lr = 0.5\` and \`lam = 0.015\` that is 0.75% per step), then the normal step is taken. That is why the same idea is called **weight decay**: every weight keeps leaking a little, and only the roots that the data keeps topping up survive. Pruning, greenhouse style. For plain gradient descent the L2 penalty and weight decay are exactly the same thing (fancier optimisers make them differ slightly, which is why libraries offer both).

One bookkeeping choice: \`history["loss"]\` stays the plain cross-entropy, and the penalty goes into its own list, \`history["penalty"]\`. That way a run with \`lam = 0.015\` and a run with \`lam = 0\` have losses you can compare.

### How big should lam be?

There is a trade-off, and you can see all of it in one table. These are the final numbers of the 32-unit net on the noisy small bed after 60 epochs of \`lr = 0.5\` (train accuracy is measured against the smudged labels; the test column peeks at the test set only to draw this picture, lesson 15 shows the honest way to choose):

~~~text
lam      train   test   length of W1
0        0.94    0.79    9.7    fits the noisy labels as far as it can
0.005    0.93    0.80    8.6
0.015    0.90    0.82    7.0    train falls a little, test rises a little: the gap narrows
0.03     0.86    0.81    5.3
0.06     0.77    0.72    3.4    too strict: it can no longer fit the real pattern
0.1      0.55    0.51    2.1
0.3      0.13    0.09    0.0    every root pruned: it knows nothing
~~~

Too small and you have not changed much; too large and the net **underfits**, it is too constrained to learn the digits. The best \`lam\` sits between.

Be realistic about the size of the win. The two dependable effects are that the **gap narrows** and the **weights get shorter**. Held-out accuracy usually improves too, but only by a few points here (about 0.79 to 0.82 with our seed), and how much depends on the seed and on \`lam\`. Weight decay is one cure for overfitting, not a miracle; early stopping, in lesson 15, is the other great one.

### Common mistakes

- **Charging the biases.** Looping over every key of \`params\` also decays \`b1\` and \`b2\`. Loop over \`DECAYED\` only.
- **Returning only some gradients.** If \`add_weight_decay\` builds its answer from \`DECAYED\` alone, the update loop later stops with \`KeyError: 'b1'\`. Return all four gradients; the biases just pass through.
- **Adding the penalty to the reported loss but not to the gradients.** The numbers on screen change and the weights do not. The gradient is what trains.
- **Trying only one lam.** Always compare at least a "none" run and a "some" run, as this lesson does.
- **Reading the gap off one noisy epoch.** Look at the last epoch of a settled run, not epoch 3.`,
      mission: md`The greenhouse has a small seed bed: only 150 glyphs, and 22 of their labels were written wrongly by a tired label-writer. A generous net with 32 hidden units (far more than the 24 you have used so far) is planted in it twice. One copy grows with no restraint, the other with weight decay.

Write the penalty, the decayed gradient and a training loop that records both. When this passes, the **Overfitting gap** panel lights up: the train and test curves of both beds, and how thick their roots grew.`,
      tasks: [
        "l2_penalty(params, lam): 0.5 * lam * the sum of squares of W1 and W2 only",
        "add_weight_decay(grads, params, lam): a new gradient dict with lam * W added to the W1 and W2 gradients",
        "train_decayed(...): full-batch training whose history has loss, penalty, train_acc and eval_acc",
        "history_free (lam 0.0) and history_decay (lam 0.015): 60 epochs each, lr 0.5, on the noisy small bed",
        "gap_free and gap_decay: final train accuracy minus final held-out accuracy of each run",
        "weight_size: the length of W1 (the square root of its sum of squares) for params_free and params_decay",
      ],
      starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 13: overfitting and weight decay.
#
# PROVIDED: the small seed bed. Its labels were copied by a tired label-writer:
# 22 of the 150 labels are wrong. smudge_labels() does the spoiling (seeded, so
# every learner gets the same wrong labels).
SMALL_N = 150
DECAYED = ("W1", "W2")  # only weights are penalised, never the biases


def smudge_labels(y, how_many, seed):
    """Return a copy of y in which how_many labels were changed to a different digit."""
    rng = np.random.RandomState(seed)
    spoiled = y.copy()
    picked = rng.choice(len(y), how_many, replace=False)
    spoiled[picked] = (spoiled[picked] + rng.randint(1, 10, how_many)) % 10
    return spoiled


X_small, y_small = X_train[:SMALL_N], smudge_labels(y_train[:SMALL_N], 22, 9)
params_free = init_params(N_IN, 32, N_OUT, 3)   # two identical 32-unit nets...
params_decay = init_params(N_IN, 32, N_OUT, 3)  # ...to be trained differently


def l2_penalty(params, lam):
    """0.5 * lam * (sum of squares of every weight in the DECAYED arrays). Biases are not charged."""
    ...


def add_weight_decay(grads, params, lam):
    """Return a NEW dict with the same four keys as grads. For W1 and W2 add lam * the weights;
    the biases' gradients come back unchanged."""
    ...


def train_decayed(params, X, y, lr, epochs, lam, X_eval, y_eval):
    """Full-batch gradient descent with weight decay, updating params in place.
    Each epoch: get (loss, grads) from loss_and_grads, add the decay, step every array,
    then record into the history dict:
      "loss"      the plain cross-entropy from loss_and_grads (no penalty)
      "penalty"   l2_penalty(params, lam) measured AFTER the update
      "train_acc" accuracy on X, y after the update
      "eval_acc"  accuracy on X_eval, y_eval after the update
    Return the history."""
    ...


# Grow both beds, then measure. Replace the placeholders:
history_free = {}    # train_decayed on params_free with lam 0.0 (60 epochs, lr 0.5, evaluate on X_test, y_test)
history_decay = {}   # the same on params_decay with lam 0.015
gap_free = 0.0       # final train_acc minus final eval_acc of history_free
gap_decay = 0.0      # the same for history_decay
weight_size = {}     # {"free": ..., "decay": ...} the length of W1: float(np.sqrt((W1 ** 2).sum()))`,
      solutionAdd: py`SMALL_N = 150  # the small bed: only 150 seedlings to learn from
DECAYED = ("W1", "W2")  # only weights are penalised, never the biases


def smudge_labels(y, how_many, seed):
    """Return a copy of y in which how_many labels were changed to a different digit."""
    rng = np.random.RandomState(seed)
    spoiled = y.copy()
    picked = rng.choice(len(y), how_many, replace=False)
    spoiled[picked] = (spoiled[picked] + rng.randint(1, 10, how_many)) % 10
    return spoiled


X_small, y_small = X_train[:SMALL_N], smudge_labels(y_train[:SMALL_N], 22, 9)
params_free = init_params(N_IN, 32, N_OUT, 3)
params_decay = init_params(N_IN, 32, N_OUT, 3)


def l2_penalty(params, lam):
    """0.5 * lam * (sum of squares of every weight); the biases are not charged."""
    return 0.5 * lam * float(sum((params[name] ** 2).sum() for name in DECAYED))


def add_weight_decay(grads, params, lam):
    """Gradients plus lam * W for the weight matrices; biases pass through unchanged."""
    return {name: grads[name] + (lam * params[name] if name in DECAYED else 0.0) for name in grads}


def train_decayed(params, X, y, lr, epochs, lam, X_eval, y_eval):
    history = {"loss": [], "train_acc": [], "eval_acc": [], "penalty": []}
    for _ in range(epochs):
        loss, grads = loss_and_grads(params, X, y)
        grads = add_weight_decay(grads, params, lam)
        for name in params:
            params[name] -= lr * grads[name]
        history["loss"].append(loss)
        history["penalty"].append(l2_penalty(params, lam))
        history["train_acc"].append(accuracy(params, X, y))
        history["eval_acc"].append(accuracy(params, X_eval, y_eval))
    return history


history_free = train_decayed(params_free, X_small, y_small, 0.5, 60, 0.0, X_test, y_test)
history_decay = train_decayed(params_decay, X_small, y_small, 0.5, 60, 0.015, X_test, y_test)
gap_free = history_free["train_acc"][-1] - history_free["eval_acc"][-1]
gap_decay = history_decay["train_acc"][-1] - history_decay["eval_acc"][-1]
weight_size = {"free": float(np.sqrt((params_free["W1"] ** 2).sum())), "decay": float(np.sqrt((params_decay["W1"] ** 2).sum()))}`,
      explanation:
        "l2_penalty squares only the DECAYED arrays and scales by 0.5 * lam, which is exactly the thing whose slope is lam * W. add_weight_decay therefore adds lam * W to the W1 and W2 gradients and leaves the biases alone, but it still returns all four keys so the update loop works. train_decayed is the lesson-10 loop with one extra line (the decay) and a separate penalty history. With lam = 0 it is plain gradient descent and bends itself around the noisy labels (train accuracy about 0.94 against held-out 0.79, a large gap); with lam = 0.015 every weight leaks a little each step, the roots the data does not need shrink, and the gap narrows while W1 ends up clearly shorter and held-out accuracy gains a few points. How big those gains are depends on the seed and on lam.",
      hints: [
        { id: "h1", title: "The penalty", content: "Loop over DECAYED, not over every key: sum((params[name] ** 2).sum() for name in DECAYED). Multiply by 0.5 * lam and wrap the sum in float() so the answer is a plain number. Check by hand: W = [3, -4] with lam 0.1 should give 1.25." },
        { id: "h2", title: "The decayed gradients", content: "Build a dict with every key of grads: {name: grads[name] + (lam * params[name] if name in DECAYED else 0.0) for name in grads}. Returning only W1 and W2 would crash the update loop with KeyError: 'b1'." },
        { id: "h3", title: "The loop and the runs", content: "train_decayed is train_full from lesson 10 with one extra line after loss_and_grads: grads = add_weight_decay(grads, params, lam). Append l2_penalty(params, lam) after the update. Then history_free = train_decayed(params_free, X_small, y_small, 0.5, 150, 0.0, X_test, y_test), and the same with params_decay and 0.03." },
      ],
      tests: [
        {
          id: "t1",
          description: "l2_penalty charges half of lam times the squared weights, and never the biases",
          assertionCode: py`
_p = {"W1": np.array([[1.0, 2.0], [3.0, 0.0]]), "b1": np.array([9.0, 9.0]), "W2": np.array([[1.0], [-1.0]]), "b2": np.array([9.0])}
_got = l2_penalty(_p, 0.5)
assert isinstance(_got, (int, float, np.number)), f"l2_penalty should return one number, but it returned {_got!r}"
assert abs(float(_got) - 4.0) < 1e-9, f"the weights 1, 2, 3, 0 and 1, -1 have squares that add up to 16, so with lam = 0.5 the penalty should be 0.5 * 0.5 * 16 = 4.0 (the biases are never charged), but l2_penalty returned {float(_got)}"
assert abs(float(l2_penalty(_p, 0.0))) < 1e-12, "with lam = 0 there should be no charge at all"
assert abs(float(l2_penalty(_p, 1.0)) - 8.0) < 1e-9, "doubling lam should double the penalty (lam = 1.0 should give 8.0 here)"
`,
        },
        {
          id: "t2",
          description: "add_weight_decay adds lam times the weights to the weight gradients only",
          assertionCode: py`
_g = {"W1": np.zeros((2, 2)), "b1": np.ones(2), "W2": np.zeros((2, 1)), "b2": np.ones(1)}
_p = {"W1": np.array([[1.0, 2.0], [3.0, 4.0]]), "b1": np.array([5.0, 5.0]), "W2": np.array([[1.0], [-1.0]]), "b2": np.array([7.0])}
_keep = {_k: _v.copy() for _k, _v in _p.items()}
_got = add_weight_decay({_k: _v.copy() for _k, _v in _g.items()}, _p, 0.1)
assert isinstance(_got, dict), f"add_weight_decay should return a dict of gradients (one per array), but it returned {_got!r}"
for _k in _g:
    assert _k in _got, f"the result has no gradient for '{_k}'. Return a gradient for all four arrays, including the biases (they simply stay as they were)"
    assert np.shape(_got[_k]) == _g[_k].shape, f"the gradient for '{_k}' should keep its shape {_g[_k].shape} but has shape {np.shape(_got[_k])}"
assert np.allclose(_got["W1"], 0.1 * _p["W1"]), f"W1's gradient should gain lam * W1 = {(0.1 * _p['W1']).tolist()}, but it is {np.asarray(_got['W1']).tolist()}"
assert np.allclose(_got["W2"], 0.1 * _p["W2"]), "W2's gradient should gain lam * W2"
assert np.allclose(_got["b1"], 1.0) and np.allclose(_got["b2"], 1.0), "biases are not decayed: the gradients for b1 and b2 must come back unchanged"
assert all(np.array_equal(_p[_k], _keep[_k]) for _k in _p), "add_weight_decay should only build new gradients; it must not change the weights themselves"
_zero = add_weight_decay({_k: _v.copy() for _k, _v in _g.items()}, _p, 0.0)
assert np.allclose(_zero["W1"], 0.0) and np.allclose(_zero["b1"], 1.0), "with lam = 0 the gradients should come back unchanged"
`,
        },
        {
          id: "t3",
          description: "train_decayed is plain gradient descent at lam 0, shrinks the weights at lam > 0, and records the penalty separately",
          assertionCode: py`
_X, _y, _Xe, _ye = X_train[:40], y_train[:40], X_test[:40], y_test[:40]
_pa = init_params(N_IN, 8, N_OUT, 1)
_ha = train_decayed(_pa, _X, _y, 0.5, 3, 0.0, _Xe, _ye)
assert isinstance(_ha, dict), f"train_decayed should return the history dict, but it returned {_ha!r}"
for _key in ("loss", "penalty", "train_acc", "eval_acc"):
    assert _key in _ha, f"the history needs a '{_key}' list with one number per epoch"
    assert isinstance(_ha[_key], list) and len(_ha[_key]) == 3, f"history['{_key}'] should be a list with one entry per epoch (3 here), but it is {_ha[_key]!r}"
_pc = init_params(N_IN, 8, N_OUT, 1)
for _i in range(3):
    _l, _g = loss_and_grads(_pc, _X, _y)
    for _k in _pc:
        _pc[_k] -= 0.5 * _g[_k]
assert all(np.allclose(_pa[_k], _pc[_k], atol=1e-9) for _k in _pc), "with lam = 0, train_decayed should be plain gradient descent that updates params in place (just like train_full), but the weights ended up different"
assert abs(_ha["loss"][0] - loss_and_grads(init_params(N_IN, 8, N_OUT, 1), _X, _y)[0]) < 1e-9, "history['loss'] should be the plain cross-entropy of the epoch (measured before the update), without the penalty"
assert all(abs(_v) < 1e-12 for _v in _ha["penalty"]), "with lam = 0 every penalty entry should be 0"
_pb = init_params(N_IN, 8, N_OUT, 1)
_hb = train_decayed(_pb, _X, _y, 0.5, 3, 1.0, _Xe, _ye)
assert abs(_hb["loss"][0] - _ha["loss"][0]) < 1e-9, "the 'loss' entry must not include the penalty, so epoch 1 should match the lam = 0 run"
assert np.linalg.norm(_pb["W1"]) < np.linalg.norm(_pa["W1"]), "with a large lam the weights should end up shorter than without decay. Did you add the decay to the gradients before the update?"
assert abs(_hb["penalty"][-1] - l2_penalty(_pb, 1.0)) < 1e-9, "history['penalty'] should hold l2_penalty(params, lam) measured after each epoch's update"
`,
        },
        {
          id: "t4",
          description: "the free bed memorises (big gap), the decayed bed does not, and its weights are smaller",
          assertionCode: py`
for _name, _h in (("history_free", history_free), ("history_decay", history_decay)):
    assert isinstance(_h, dict) and isinstance(_h.get("loss"), list) and len(_h["loss"]) == 60, f"{_name} should be the history of a 60-epoch run of train_decayed. Replace the placeholder with the call (see the task list)"
assert abs(accuracy(params_free, X_small, y_small) - history_free["train_acc"][-1]) < 1e-12, "history_free should come from training params_free (the net itself changes in place)"
assert abs(accuracy(params_decay, X_small, y_small) - history_decay["train_acc"][-1]) < 1e-12, "history_decay should come from training params_decay"
assert all(abs(_v) < 1e-12 for _v in history_free["penalty"]), "history_free should be the run with lam = 0.0, but its penalty is not zero"
assert abs(history_decay["penalty"][-1] - l2_penalty(params_decay, 0.015)) < 1e-9, "history_decay should be the run with lam = 0.015"
assert isinstance(gap_free, (int, float, np.number)) and isinstance(gap_decay, (int, float, np.number)), "gap_free and gap_decay should be single numbers"
_gf = history_free["train_acc"][-1] - history_free["eval_acc"][-1]
_gd = history_decay["train_acc"][-1] - history_decay["eval_acc"][-1]
assert abs(gap_free - _gf) < 1e-9, f"gap_free should be the last train_acc minus the last eval_acc of history_free ({_gf:.3f}), but it is {gap_free!r}"
assert abs(gap_decay - _gd) < 1e-9, f"gap_decay should be the last train_acc minus the last eval_acc of history_decay ({_gd:.3f}), but it is {gap_decay!r}"
assert gap_free > 0.12, f"the unrestrained net should bend itself around the noisy bed and show a gap over 0.12, but gap_free is {gap_free:.3f}"
assert gap_decay < gap_free, f"weight decay should shrink the gap, but gap_decay ({gap_decay:.3f}) is not below gap_free ({gap_free:.3f})"
assert isinstance(weight_size, dict) and set(weight_size) == {"free", "decay"}, "weight_size should be a dict with the keys 'free' and 'decay'"
assert abs(weight_size["free"] - float(np.sqrt((params_free["W1"] ** 2).sum()))) < 1e-9 and abs(weight_size["decay"] - float(np.sqrt((params_decay["W1"] ** 2).sum()))) < 1e-9, "weight_size should hold float(np.sqrt((W1 ** 2).sum())) for params_free and params_decay"
assert weight_size["decay"] < weight_size["free"], "the decayed net's W1 should be shorter than the free net's"
`,
        },
      ],
      unlocks: ["gn-overfit"],
      checks: [
        {
          prompt: "Why does a very large weight make it easier to overfit?",
          question: {
            type: "choice",
            options: [
              "A large weight lets a tiny change in the input swing the output a lot, so the function can bend sharply around single pictures",
              "Large weights make the loss smaller on the test set",
              "NumPy cannot store weights bigger than 10",
              "Large weights make the net train faster, and fast training always overfits",
            ],
            answer: 0,
          },
          explanation: "Output = weight * input, so a large weight multiplies small differences into big ones. That sharpness is what lets the net carve out a private corner for a mislabelled picture. Small weights force smooth, gentle functions.",
        },
        {
          prompt: "A layer's weights are 3 and -4, and lam is 0.1. What is the L2 penalty 0.5 * lam * (sum of squares)?",
          question: { type: "number", answer: 1.25, tolerance: 0.001 },
          explanation: "The squares are 9 and 16, which add up to 25. Then 0.5 * 0.1 * 25 = 1.25.",
        },
        {
          prompt: "With lr = 0.5 and lam = 0.04, by what fraction does every weight shrink in each step, before the data's gradient is applied? (Give it as a decimal, 0.01 would mean 1%.)",
          question: { type: "number", answer: 0.02, tolerance: 0.0005 },
          explanation: "The update is w = (1 - lr * lam) * w - lr * g. The shrink factor is lr * lam = 0.5 * 0.04 = 0.02, so every weight loses 2% of its size each step.",
        },
      ],
    },

    // ───────────────────────── 14 ─────────────────────────
    {
      id: "ai-neural-14-schedule",
      title: "Learning-rate seasons and momentum",
      minutes: 30,
      xp: 145,
      concepts: ["learning-rate schedule", "step decay", "exponential decay", "warm-up", "momentum"],
      learn: md`### One rate for every season is a compromise

So far the learning rate has been a single number. But the right step size changes during training. At the start you are far from any good valley and want long strides. Near the bottom you want short, careful ones, or you keep hopping over the best spot.

The smallest picture of this is a loss shaped like \`w * w\`. Its slope is \`2 * w\`, so one gradient step gives \`w = w - lr * 2 * w = (1 - 2 * lr) * w\`:

~~~text
lr = 0.1   factor  0.8    w: 1.0, 0.8, 0.64, 0.51 ...   creeping into the valley
lr = 0.45  factor  0.1    w: 1.0, 0.1, 0.01 ...         almost straight down
lr = 1.0   factor -1.0    w: 1.0, -1.0, 1.0, -1.0 ...   hopping across forever
~~~

Mini-batches add a second reason. Every batch gradient is a noisy estimate (lesson 11), so with a fixed rate the weights keep getting kicked around the valley floor by that noise. A smaller rate means smaller kicks. So we shrink the rate as training goes on.

### A schedule is just a function of the epoch

A **learning-rate schedule** is a function that answers "what rate should epoch \`e\` use?". Three classics, each a one-liner:

~~~python
def step_decay(lr0, epoch, drop=0.5, every=3):
    return lr0 * drop ** (epoch // every)      # halve every 3 epochs
~~~

\`epoch // every\` is whole-number division: \`0 // 3\`, \`1 // 3\` and \`2 // 3\` are all 0, and \`3 // 3\` is 1. So the exponent stays 0 for three epochs (the rate stays flat), then steps up by one each time the epoch count crosses a multiple of 3. With \`lr0 = 0.4\` you get the staircase 0.4, 0.4, 0.4, 0.2, 0.2, 0.2, 0.1, 0.1.

**Exponential decay** shrinks a little every epoch instead: \`lr0 * rate ** epoch\`. With \`rate = 0.85\` and \`lr0 = 0.4\`: 0.4, 0.34, 0.289, 0.246, ... a smooth slide with no sudden cliff.

**Warm-up** goes the other way at the very start: begin with a small rate and ramp up linearly to \`lr0\`. With \`warm_epochs = 3\` and \`lr0 = 0.4\` the first epochs use 0.133, 0.267, 0.4 and then stay at 0.4. Why start gently? At the beginning the weights are random, the gradients are large and erratic, and a few huge steps can fling the net somewhere awful (a hidden unit pushed so negative that its ReLU is dead for every picture, for instance). The effect is mild on our small net, but on deep nets and big batches it is the difference between training and exploding, which is why you will meet warm-up everywhere.

The schedule is passed to the training loop as a **function** (functions are values in Python, you can hand them around like numbers). The loop asks \`schedule(epoch)\` once per epoch and records the answer in \`history["lr"]\`, so you can plot the seasons later. Because each schedule needs a different set of settings, we wrap them in tiny \`lambda\` functions that remember their settings: \`lambda e: step_decay(0.4, e)\` means "given an epoch \`e\`, compute step_decay with lr0 0.4".

### Momentum: the rolling ball

Plain gradient descent has no memory: each step looks only at the slope under your feet right now. **Momentum** lets the update remember where it has been heading, like a ball rolling downhill that builds speed. Keep one extra array per parameter, the **velocity**:

~~~text
velocity = mu * velocity - lr * gradient
param    = param + velocity
~~~

\`mu\` (0.9 is common) says how much of the old velocity survives each step. Watch it build up when the gradient is a constant 1 with \`lr = 0.1\` and \`mu = 0.9\`:

~~~text
step 1: velocity = 0.9 * 0     - 0.1 = -0.100
step 2: velocity = 0.9 * -0.1  - 0.1 = -0.190
step 3: velocity = 0.9 * -0.19 - 0.1 = -0.271
step 4:                                -0.344
 ...  heading for -0.1 / (1 - 0.9) = -1.0
~~~

In a direction where the gradient keeps pointing the same way, the step grows until it is about \`1 / (1 - mu)\`, ten times larger for \`mu = 0.9\`. Where the gradient flips sign every step (zig-zagging across a narrow valley) the old velocity and the new gradient cancel, so the zig-zag is damped. With \`mu = 0\` the formula collapses to ordinary gradient descent, which is a handy test.

Two rules: the velocity dict **persists across batches and epochs** (it is created once, as zeros, at the start of a training run) and it is updated **in place** (or returned) so the loop sees it. And because momentum multiplies the effective step, it often wants a smaller or equal \`lr\`, not a bigger one.

### The seasons study

We run five fair trials: same starting weights (He, seed 3), same batch order (seed 4), 6 epochs, batches of 64, and change one thing at a time: a constant 0.3; step decay from 0.4; exponential decay from 0.4; warm-up to 0.4; and step decay with momentum 0.9. What you will see in the last-epoch loss and test accuracy:

~~~text
constant      loss 0.36   acc 0.922
step          loss 0.34   acc 0.915
exp           loss 0.37   acc 0.908
warmup        loss 0.35   acc 0.905
step+momentum loss 0.13   acc 0.920
~~~

Be careful reading it. With 400 test pictures one picture is 0.25 percentage points, so 0.922 versus 0.905 is only about seven pictures, which is noise: after six epochs the four plain schedules are indistinguishable by accuracy. The loss column tells a clearer story: momentum has trained far further in the same 6 epochs. (And remember, the test set is only being *watched* here; lesson 15 gives you the proper place to choose a schedule.)

### Common mistakes

- **Starting the velocity as an empty dict.** \`velocity[name]\` then fails with \`KeyError: 'W1'\`. Create it with \`np.zeros_like\` for every parameter before the first step.
- **Resetting the velocity every batch.** Then there is no memory and momentum does nothing. The velocity is created once per training run.
- **Rebinding instead of updating.** Writing \`velocity = {...}\` inside \`momentum_step\` changes a local name, and the caller's velocity never changes.
- **An off-by-one in warm-up.** Epoch 0 must already use a non-zero rate: \`(epoch + 1) / warm_epochs\`, not \`epoch / warm_epochs\`.
- **Cranking \`lr\` up because momentum "feels slow" at first.** With \`mu = 0.9\` a rate of 50 sends the loss to 20 and up instead of down. Momentum already makes the steps bigger.`,
      mission: md`Gardeners do not water the same amount all year: more in the growing season, less when the plant settles. Your training loop needs seasons too. You will write three ways to shape the learning rate over the epochs, a momentum update that lets the roots keep their direction, and a training loop that takes any schedule as an argument.

Then you will run the five-way study. When this passes, the **Learning-rate seasons** panel lights up: each schedule drawn as a curve, and how each trial ended.`,
      tasks: [
        "step_decay(lr0, epoch, drop, every), exp_decay(lr0, epoch, rate) and warmup(lr0, epoch, warm_epochs)",
        "momentum_step(params, velocity, grads, lr, mu): update velocity and params in place",
        "train_scheduled(...): mini-batch training that asks schedule(epoch) for the rate and records history['lr']",
        "lr_curves: for every schedule in SCHEDULES (provided) the rates of epochs 0 to 5 as a list",
        "schedule_study: loss and test accuracy of a trial per schedule, plus one more entry, 'step + momentum' (mu 0.9)",
        "history_sched: the full history of that last, momentum trial",
      ],
      starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 14: learning-rate seasons and momentum.


def step_decay(lr0, epoch, drop=0.5, every=3):
    """lr0 * drop ** (epoch // every): the rate stays flat for 'every' epochs, then drops."""
    ...


def exp_decay(lr0, epoch, rate=0.85):
    """lr0 * rate ** epoch: a smooth slide down."""
    ...


def warmup(lr0, epoch, warm_epochs=3):
    """A linear ramp that reaches lr0 at the last warm-up epoch and stays there.
    Epoch 0 must already be above zero: lr0 * (epoch + 1) / warm_epochs, capped at lr0."""
    ...


def momentum_step(params, velocity, grads, lr, mu):
    """For every name: velocity[name] = mu * velocity[name] - lr * grads[name], then add the
    velocity to params[name]. Both dicts are updated IN PLACE; nothing is returned."""
    ...


def train_scheduled(params, X, y, schedule, epochs, batch_size, seed, mu, X_eval, y_eval):
    """Mini-batch training (use epoch_batches) with momentum.
    - schedule is a FUNCTION: lr = schedule(epoch), asked once at the start of each epoch.
    - velocity starts as zeros (np.zeros_like of every parameter) once per call.
    - each batch: loss_and_grads, then momentum_step.
    Return a history dict with lists "loss" (mean batch loss of the epoch), "train_acc",
    "eval_acc" and "lr" (the rate used in each epoch)."""
    ...


# PROVIDED: four named schedules. Each is a small function of the epoch that remembers its settings.
SCHEDULES = {
    "constant": lambda e: 0.3,
    "step": lambda e: step_decay(0.4, e),
    "exp": lambda e: exp_decay(0.4, e),
    "warmup": lambda e: warmup(0.4, e),
}

# Now the study. Replace the placeholders:
lr_curves = {}        # {name: [fn(e) for e in range(6)]} for every schedule in SCHEDULES
schedule_study = {}   # {name: {"loss": last-epoch loss, "accuracy": last-epoch eval_acc}}
history_sched = {}    # the history of the 'step + momentum' trial
#
# Plan for schedule_study: for each name, fn in SCHEDULES.items(): make a fresh net with
#   trial = init_params(N_IN, N_HIDDEN, N_OUT, 3)
# train it with train_scheduled(trial, X_train, y_train, fn, 6, 64, 4, 0.0, X_test, y_test),
# and store the last loss and eval_acc. Then do one more trial with SCHEDULES["step"] and
# mu = 0.9, store it as "step + momentum", and keep its history in history_sched.`,
      solutionAdd: py`def step_decay(lr0, epoch, drop=0.5, every=3):
    """lr0 * drop ** (epoch // every): flat for 'every' epochs, then a drop."""
    return lr0 * drop ** (epoch // every)


def exp_decay(lr0, epoch, rate=0.85):
    """lr0 * rate ** epoch: a smooth slide down."""
    return lr0 * rate ** epoch


def warmup(lr0, epoch, warm_epochs=3):
    """A linear ramp that reaches lr0 at the last warm-up epoch, then stays there."""
    return lr0 * min(1.0, (epoch + 1) / warm_epochs)


def momentum_step(params, velocity, grads, lr, mu):
    """Roll the ball: the velocity remembers the direction, the parameters follow it."""
    for name in params:
        velocity[name] = mu * velocity[name] - lr * grads[name]
        params[name] += velocity[name]


def train_scheduled(params, X, y, schedule, epochs, batch_size, seed, mu, X_eval, y_eval):
    rng = np.random.RandomState(seed)
    velocity = {name: np.zeros_like(value) for name, value in params.items()}
    history = {"loss": [], "train_acc": [], "eval_acc": [], "lr": []}
    for epoch in range(epochs):
        lr = schedule(epoch)
        losses = []
        for idx in epoch_batches(len(X), batch_size, rng):
            loss, grads = loss_and_grads(params, X[idx], y[idx])
            momentum_step(params, velocity, grads, lr, mu)
            losses.append(loss)
        history["loss"].append(float(np.mean(losses)))
        history["train_acc"].append(accuracy(params, X, y))
        history["eval_acc"].append(accuracy(params, X_eval, y_eval))
        history["lr"].append(lr)
    return history


SCHEDULES = {
    "constant": lambda e: 0.3,
    "step": lambda e: step_decay(0.4, e),
    "exp": lambda e: exp_decay(0.4, e),
    "warmup": lambda e: warmup(0.4, e),
}
lr_curves = {name: [fn(e) for e in range(6)] for name, fn in SCHEDULES.items()}
schedule_study = {}
for name, fn in SCHEDULES.items():
    trial = init_params(N_IN, N_HIDDEN, N_OUT, 3)
    run = train_scheduled(trial, X_train, y_train, fn, 6, 64, 4, 0.0, X_test, y_test)
    schedule_study[name] = {"loss": run["loss"][-1], "accuracy": run["eval_acc"][-1]}
trial = init_params(N_IN, N_HIDDEN, N_OUT, 3)
run = train_scheduled(trial, X_train, y_train, SCHEDULES["step"], 6, 64, 4, 0.9, X_test, y_test)
schedule_study["step + momentum"] = {"loss": run["loss"][-1], "accuracy": run["eval_acc"][-1]}
history_sched = run`,
      explanation:
        "The three schedules are one-line formulas of the epoch: // makes step decay a staircase, ** makes exponential decay a slide, and min(1.0, (epoch + 1) / warm_epochs) makes warm-up a ramp that is already above zero at epoch 0. momentum_step keeps one velocity array per parameter, blends the old velocity with the new gradient, and moves the parameters by the velocity; with mu = 0 it is exactly plain gradient descent. train_scheduled is the mini-batch loop from lesson 11 with two changes: the rate comes from schedule(epoch) and the update goes through momentum_step with a velocity that is created once and then lives for the whole run. The study keeps everything else equal (same init, same batch order, same epochs) so any difference comes from the schedule or the momentum, and momentum with step decay trains much further in the same six epochs.",
      hints: [
        { id: "h1", title: "Schedules", content: "step_decay: lr0 * drop ** (epoch // every). exp_decay: lr0 * rate ** epoch. warmup: lr0 * min(1.0, (epoch + 1) / warm_epochs). Check by hand: step_decay(0.4, 3) is 0.2 and warmup(0.4, 0, 4) is 0.1." },
        { id: "h2", title: "Momentum step", content: "Loop for name in params: velocity[name] = mu * velocity[name] - lr * grads[name], then params[name] += velocity[name]. Updating the dict entries (not building new dicts) is what makes the caller see the change." },
        { id: "h3", title: "The loop and the study", content: "train_scheduled: rng = np.random.RandomState(seed); velocity = {name: np.zeros_like(v) for name, v in params.items()}; per epoch lr = schedule(epoch), then for idx in epoch_batches(len(X), batch_size, rng) compute loss_and_grads on X[idx], y[idx] and call momentum_step. For the study, loop over SCHEDULES.items() with a fresh init_params(N_IN, N_HIDDEN, N_OUT, 3) each time." },
      ],
      tests: [
        {
          id: "t1",
          description: "step_decay, exp_decay and warmup give the exact rates for each epoch",
          assertionCode: py`
def _close(_got, _want, _label):
    assert isinstance(_got, (int, float, np.number)), f"{_label} should return a number, but it returned {_got!r}"
    assert abs(float(_got) - _want) < 1e-9, f"{_label} should be {_want} but it returned {float(_got)}"

_close(step_decay(0.4, 0), 0.4, "step_decay(0.4, 0)")
_close(step_decay(0.4, 2), 0.4, "step_decay(0.4, 2) (still in the first three epochs)")
_close(step_decay(0.4, 3), 0.2, "step_decay(0.4, 3)")
_close(step_decay(0.4, 7), 0.1, "step_decay(0.4, 7)")
_close(step_decay(1.0, 4, 0.1, 2), 0.01, "step_decay(1.0, 4, 0.1, 2)")
_close(exp_decay(0.4, 0), 0.4, "exp_decay(0.4, 0)")
_close(exp_decay(1.0, 2, 0.5), 0.25, "exp_decay(1.0, 2, 0.5)")
_close(exp_decay(1.0, 1), 0.85, "exp_decay(1.0, 1) with the default rate")
_close(warmup(0.4, 0, 4), 0.1, "warmup(0.4, 0, 4) (epoch 0 must already be above zero)")
_close(warmup(0.4, 1, 4), 0.2, "warmup(0.4, 1, 4)")
_close(warmup(0.4, 3, 4), 0.4, "warmup(0.4, 3, 4) (the last warm-up epoch reaches lr0)")
_close(warmup(0.4, 9, 4), 0.4, "warmup(0.4, 9, 4) (after warm-up the rate stays at lr0)")
_close(warmup(0.3, 0), 0.1, "warmup(0.3, 0) with the default of 3 warm-up epochs")
`,
        },
        {
          id: "t2",
          description: "momentum_step is plain gradient descent at mu 0 and builds up speed on a steady gradient",
          assertionCode: py`
_p = {"w": np.array([1.0, 2.0]), "m": np.array([[1.0, 1.0], [1.0, 1.0]])}
_v = {"w": np.zeros(2), "m": np.zeros((2, 2))}
_g = {"w": np.array([0.5, -1.0]), "m": np.full((2, 2), 2.0)}
momentum_step(_p, _v, _g, 0.1, 0.0)
assert np.allclose(_p["w"], [0.95, 2.1]), f"with mu = 0 a momentum step is plain gradient descent, so w should become [0.95, 2.1], but it is {np.asarray(_p['w']).tolist()}. Update params in place"
assert np.allclose(_p["m"], 0.8), "every array in params must be updated, including 2-D ones (expected 0.8 everywhere in 'm')"
assert np.allclose(_v["w"], [-0.05, 0.1]), f"velocity should hold the step just taken (mu * old velocity - lr * grad = [-0.05, 0.1]), but velocity['w'] is {np.asarray(_v['w']).tolist()}. Update the velocity dict in place"
_p = {"w": np.array([0.0])}
_v = {"w": np.zeros(1)}
_g = {"w": np.array([1.0])}
for _i in range(3):
    momentum_step(_p, _v, _g, 0.1, 0.9)
assert np.allclose(_v["w"], [-0.271]), f"after three steps on a gradient of 1 (lr 0.1, mu 0.9) the velocity should be -0.271 (-0.1, -0.19, -0.271), but it is {np.asarray(_v['w']).tolist()}"
assert np.allclose(_p["w"], [-0.561]), f"the parameter should have moved -0.1 - 0.19 - 0.271 = -0.561, but it is {np.asarray(_p['w']).tolist()}"
`,
        },
        {
          id: "t3",
          description: "train_scheduled follows the schedule, equals plain descent at mu 0, and carries the velocity across steps",
          assertionCode: py`
_X, _y, _Xe, _ye = X_train[:40], y_train[:40], X_test[:40], y_test[:40]
_sched = lambda e: 0.1 * (e + 1)
_pa = init_params(N_IN, 8, N_OUT, 1)
_ha = train_scheduled(_pa, _X, _y, _sched, 3, 40, 2, 0.0, _Xe, _ye)
assert isinstance(_ha, dict), f"train_scheduled should return the history dict, but it returned {_ha!r}"
for _key in ("loss", "train_acc", "eval_acc", "lr"):
    assert _key in _ha, f"the history needs a '{_key}' list with one number per epoch"
    assert isinstance(_ha[_key], list) and len(_ha[_key]) == 3, f"history['{_key}'] should be a list with one entry per epoch (3 here), but it is {_ha[_key]!r}"
assert np.allclose(_ha["lr"], [0.1, 0.2, 0.3]), f"history['lr'] should record schedule(epoch) for each epoch, [0.1, 0.2, 0.3] here, but it is {_ha['lr']!r}"
_pc = init_params(N_IN, 8, N_OUT, 1)
for _e in range(3):
    _l, _g = loss_and_grads(_pc, _X, _y)
    for _k in _pc:
        _pc[_k] -= _sched(_e) * _g[_k]
assert all(np.allclose(_pa[_k], _pc[_k], atol=1e-8) for _k in _pc), "with mu = 0 and one batch per epoch the weights should match plain gradient descent using that epoch's scheduled rate, but they differ"
_pm = init_params(N_IN, 8, N_OUT, 1)
_vel = {_k: np.zeros_like(_v) for _k, _v in _pm.items()}
for _e in range(3):
    _l, _g = loss_and_grads(_pm, _X, _y)
    for _k in _pm:
        _vel[_k] = 0.9 * _vel[_k] - _sched(_e) * _g[_k]
        _pm[_k] += _vel[_k]
_pd = init_params(N_IN, 8, N_OUT, 1)
train_scheduled(_pd, _X, _y, _sched, 3, 40, 2, 0.9, _Xe, _ye)
assert all(np.allclose(_pd[_k], _pm[_k], atol=1e-8) for _k in _pm), "with mu = 0.9 the velocity must carry over from step to step: create it once (zeros) before the epochs, not inside the loop"
`,
        },
        {
          id: "t4",
          description: "the study draws every schedule, runs five trials, and momentum trains furthest",
          assertionCode: py`
assert isinstance(lr_curves, dict) and set(lr_curves) == set(SCHEDULES), f"lr_curves should have one list per schedule in SCHEDULES ({sorted(SCHEDULES)}), but it is {lr_curves!r}"
for _name, _fn in SCHEDULES.items():
    assert isinstance(lr_curves[_name], list) and len(lr_curves[_name]) == 6, f"lr_curves['{_name}'] should list the rates of epochs 0 to 5 (6 numbers)"
    assert np.allclose(lr_curves[_name], [_fn(_e) for _e in range(6)]), f"lr_curves['{_name}'] should be [fn(e) for e in range(6)]"
assert abs(lr_curves["step"][3] - 0.2) < 1e-9 and abs(lr_curves["warmup"][0] - 0.4 / 3) < 1e-9, "the step curve should halve at epoch 3 and the warm-up curve should start at 0.4 / 3, so check your three schedule functions"
_names = {"constant", "step", "exp", "warmup", "step + momentum"}
assert isinstance(schedule_study, dict) and set(schedule_study) == _names, f"schedule_study should have exactly the five entries {sorted(_names)}, but it has {sorted(schedule_study) if isinstance(schedule_study, dict) else schedule_study!r}"
for _name in _names:
    _e = schedule_study[_name]
    assert isinstance(_e, dict) and "loss" in _e and "accuracy" in _e, f"schedule_study['{_name}'] should be a dict with 'loss' and 'accuracy'"
    assert 0.0 <= float(_e["accuracy"]) <= 1.0 and float(_e["loss"]) > 0.0, f"schedule_study['{_name}'] has impossible numbers: {_e!r}"
assert schedule_study["step + momentum"]["loss"] < schedule_study["constant"]["loss"], "momentum with step decay should end with a lower loss than the constant-rate trial. Is mu = 0.9 in the last trial?"
assert isinstance(history_sched, dict) and len(history_sched.get("loss", [])) == 6, "history_sched should be the history of the 'step + momentum' trial (6 epochs)"
assert np.allclose(history_sched["lr"], lr_curves["step"]), "the momentum trial uses the step schedule, so history_sched['lr'] should equal lr_curves['step']"
assert abs(history_sched["loss"][-1] - schedule_study["step + momentum"]["loss"]) < 1e-12, "schedule_study['step + momentum']['loss'] should be the last loss of history_sched"
`,
        },
      ],
      unlocks: ["gn-schedule"],
      checks: [
        {
          prompt: "With the defaults (drop 0.5, every 3 epochs), what does step_decay(0.4, 7) return?",
          question: { type: "number", answer: 0.1, tolerance: 0.0001 },
          explanation: "7 // 3 is 2, so the rate has been halved twice: 0.4 * 0.5 ** 2 = 0.1.",
        },
        {
          prompt: "Why do we usually shrink the learning rate as training goes on?",
          question: {
            type: "choice",
            options: [
              "Early on big steps make fast progress; near the bottom big steps keep hopping over the best spot and the batch noise keeps shaking the weights",
              "Because gradients get larger late in training and must be cancelled",
              "To make the loss number look smaller on the plot",
              "NumPy slows down when the learning rate stays large",
            ],
            answer: 0,
          },
          explanation: "A large rate is good for the long trip downhill and bad for settling. Shrinking it lets the weights come to rest instead of bouncing around the valley floor.",
        },
        {
          prompt: "Momentum with mu = 0.9 and a gradient that never changes: roughly how many times bigger than a plain gradient step does each step become after many iterations?",
          question: { type: "number", answer: 10, tolerance: 0.5 },
          explanation: "The velocity settles where velocity = 0.9 * velocity - lr * grad, which gives velocity = -lr * grad / (1 - 0.9) = ten plain steps.",
        },
      ],
    },

    // ───────────────────────── 15 ─────────────────────────
    {
      id: "ai-neural-15-validation",
      title: "Validation, early stopping and picking settings",
      minutes: 35,
      xp: 150,
      concepts: ["validation set", "early stopping", "patience", "hyperparameters", "data leakage"],
      learn: md`### Three piles, three jobs

For five lessons we have been peeking. We watched the held-out curve, noticed a setting that made it go up, and kept that setting. It feels harmless, but every time you choose something *because the test number improved*, a little of the test set leaks into your decisions. Do it often enough and the test accuracy stops being an honest measurement: it has become part of the training. It is like a teacher who rewrites the final exam after seeing how the class did on the practice test.

The cure is three piles of glyphs with three separate jobs:

~~~text
fit         adjusts the parameters (weights and biases) by gradient descent
validation  chooses the hyperparameters and decides when to stop
test        opened ONCE, at the very end, to report the honest score
~~~

**Parameters** are the numbers training learns (\`W1\`, \`b1\`, \`W2\`, \`b2\`). **Hyperparameters** are the settings you choose beforehand: the learning rate, \`lam\`, the batch size, the number of hidden units, how many epochs. We already own a test pile of 400. Now we carve a validation pile of 240 out of the 1200 training glyphs and keep 960 to fit on. Same \`split_glyphs\` as lesson 1, a different seed.

### Early stopping

The training loss falls almost forever. The validation loss behaves differently: it falls, flattens, and on a net that is overfitting it turns upward again. **Early stopping** means: train, check the validation loss after every epoch, and keep the weights from the epoch where it was lowest.

Validation loss is bumpy (it is measured on only 240 pictures), so one bad epoch must not end training. **Patience** is how many epochs in a row without a new best you tolerate before giving up. With \`patience = 3\`:

~~~text
epoch:     0     1     2     3     4     5
val loss:  1.20  0.80  0.62  0.64  0.63  0.66
new best:  yes   yes   yes   no    no    no   -> three misses in a row: stop at epoch 5
best epoch = 2, stopped epoch = 5 (epoch numbers start at 0)
~~~

A fair warning about our own data: the glyphs are clean and plentiful, so our validation loss mostly *flattens* instead of climbing (the best epoch lands around 10 and patience 3 ends the run at 13). The stop is a safety net here. On a net that memorises noise, like the free bed of lesson 13, the same rule is what saves you.

Here is the subtle part. At epoch 5 the weights are *not* the good ones; the good ones were three epochs ago. So whenever there is a new best, take a **copy** of the weights, and when training ends, put that copy back. The word "copy" matters:

~~~python
a = np.array([1.0, 2.0])
keep = a          # not a copy: two names for ONE array
a -= 1.0          # training updates arrays in place
keep              # array([0., 1.])  the "saved" weights changed too
~~~

Training updates arrays in place with \`-=\`, so \`best = params\` or even \`best = dict(params)\` (a new dict holding the *same* arrays) quietly follows the weights as they move. You need \`{name: value.copy() for name, value in params.items()}\`. And to restore, assign back into the caller's own dict (\`params[name] = best[name]\`): returning a different dict would leave the caller holding the last-epoch weights.

### Picking a learning rate on the validation pile

To choose a hyperparameter, try candidates, train a fresh net with each, and score each on the validation pile. Two details make the comparison fair: every trial starts from the same initial weights and uses the same batch order, so the only difference is the setting.

Candidates for a rate should be spaced on a **log scale** (0.05, 0.2, 0.8, 2.0: each about four times the last, give or take), because a learning rate acts multiplicatively. 0.30 against 0.31 is invisible; 0.03 against 0.3 is a different world. To save time each trial is short (a few epochs), which finds the rate that learns fastest early. That is not always the one that ends best, but it is a sound first pick, and a good reason to treat the result as "good enough" rather than "perfect". In our run it looks like this:

~~~text
lr 0.05   val accuracy 0.11   (chance: barely moved in 3 epochs)
lr 0.2    val accuracy 0.42
lr 0.8    val accuracy 0.67   <- the winner
lr 2.0    val accuracy 0.41   (too hot: the loss zig-zags)
~~~

### How much to trust a validation score

A validation accuracy is itself an estimate. For an accuracy \`p\` measured on \`n\` pictures the standard error is about \`sqrt(p * (1 - p) / n)\`. With \`p = 0.9\` and \`n = 240\` that is \`sqrt(0.09 / 240) = 0.019\`: two points of wobble. Gaps of 0.67 against 0.42 mean something; a gap of 0.01 does not, and picking the "best" of many close candidates slowly overfits the validation pile itself. Keep the number of candidates modest.

### Common mistakes

- **Choosing with the test set.** If a decision was made while looking at test accuracy, that score is no longer honest. Use validation.
- **Mixing up the return order of \`split_glyphs\`.** It returns \`X_a, X_b, y_a, y_b\`. Writing \`X_fit, y_fit, X_val, y_val = ...\` puts pixels into the label names and breaks much later with \`IndexError: arrays used as indices must be of integer or boolean type\`.
- **Saving the best weights without copying.** The "restored" weights are just the last ones. Test it: after a stop, the validation loss of the returned net must equal the best validation loss in the history.
- **Looking up \`lr_scores[0.8]\`.** The keys are strings (\`str(lr)\`, so they stay JSON-friendly): use \`lr_scores["0.8"]\`, or you get \`KeyError: 0.8\`.
- **Patience of 0 or 1.** Validation loss is noisy; the run stops on the first wobble. Try 3 to 5.`,
      mission: md`Until now the greenhouse has judged every plant by the test bed, which has made the test bed a little less honest each time. Today you build a proper nursery for decisions: a validation bed that only chooses, and a training loop that notices when growth has stopped paying off, keeps the best plant and walks away.

You will also let the validation bed pick the learning rate. When this passes, the **Early stopping** panel lights up: the validation curve, the epoch you should have stopped at, and the rate that won.`,
      tasks: [
        "X_fit, X_val, y_fit, y_val = split_glyphs(X_train, y_train, 240, 5)",
        "mean_loss(params, X, y): the mean cross-entropy of the net on any set",
        "train_stopping(...): mini-batch training with a validation loss, patience, a copy of the best weights, and a restore at the end",
        "pick_learning_rate(candidates, X, y, X_val, y_val, epochs, seed): return (best_lr, scores) with string keys",
        "best_lr, lr_scores from the candidates 0.05, 0.2, 0.8 and 2.0 (3 epochs each, seed 4)",
        "params_stop, history_stop (best_lr, batch 128, up to 20 epochs, patience 3, seed 4), stop_info and net_view",
      ],
      starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 15: validation, early stopping and picking settings.

# Carve a validation pile out of the training glyphs. Replace the placeholders:
X_fit, X_val, y_fit, y_val = None, None, None, None   # split_glyphs(X_train, y_train, 240, 5): mind the return order!


def mean_loss(params, X, y):
    """The mean cross-entropy of the net on X, y (no training involved)."""
    ...


def train_stopping(params, X, y, X_val, y_val, lr, batch_size, max_epochs, patience, seed):
    """Mini-batch gradient descent (use epoch_batches) that stops early.
    After every epoch measure the validation loss with mean_loss(params, X_val, y_val).
    - On a new best: remember the loss, the epoch number (starting at 0) and a COPY of the weights.
      Reset the count of epochs without improvement.
    - Otherwise add one to that count; when it reaches 'patience', stop.
    - At the end put the best weights back INTO params (params[name] = ...).
    Return a history dict with lists "loss" (mean batch loss), "train_acc", "eval_acc"
    (accuracy on X_val, y_val) and "val_loss", plus the numbers "best_epoch" and "stopped_epoch"
    (the last epoch that ran)."""
    ...


def pick_learning_rate(candidates, X, y, X_val, y_val, epochs, seed):
    """Try every candidate rate on a FRESH init_params(N_IN, N_HIDDEN, N_OUT, 3) net:
    train_stopping(trial, X, y, X_val, y_val, lr, 128, epochs, epochs, seed) (patience = epochs so it
    simply runs, then restores its best epoch), and score it with accuracy on X_val, y_val.
    Return (best_lr, scores) where scores maps str(lr) -> that accuracy."""
    ...


# The choices and the stopped run. Replace the placeholders:
best_lr, lr_scores = 0.0, {}   # pick_learning_rate([0.05, 0.2, 0.8, 2.0], X_fit, y_fit, X_val, y_val, 3, 4)
params_stop = None             # a fresh init_params(N_IN, N_HIDDEN, N_OUT, 3) net, trained by the next line
history_stop = {}              # train_stopping(params_stop, X_fit, y_fit, X_val, y_val, best_lr, 128, 20, 3, 4)
stop_info = {}                 # {"best_epoch": ..., "stopped_epoch": ...} read from history_stop
# Finish with net_view = params_to_lists(params_stop) so the stage can draw the stopped net.`,
      solutionAdd: py`X_fit, X_val, y_fit, y_val = split_glyphs(X_train, y_train, 240, 5)


def mean_loss(params, X, y):
    """The mean cross-entropy of the net on X, y."""
    return cross_entropy(softmax(forward(X, params)[2]), y)


def train_stopping(params, X, y, X_val, y_val, lr, batch_size, max_epochs, patience, seed):
    rng = np.random.RandomState(seed)
    history = {"loss": [], "train_acc": [], "eval_acc": [], "val_loss": []}
    best = {"loss": 1e9, "epoch": 0, "params": {k: v.copy() for k, v in params.items()}}
    waited = 0
    for epoch in range(max_epochs):
        losses = []
        for idx in epoch_batches(len(X), batch_size, rng):
            loss, grads = loss_and_grads(params, X[idx], y[idx])
            for name in params:
                params[name] -= lr * grads[name]
            losses.append(loss)
        val_loss = mean_loss(params, X_val, y_val)
        history["loss"].append(float(np.mean(losses)))
        history["val_loss"].append(val_loss)
        history["train_acc"].append(accuracy(params, X, y))
        history["eval_acc"].append(accuracy(params, X_val, y_val))
        if val_loss < best["loss"]:
            # a new best: keep a COPY, because training keeps changing these arrays in place
            best = {"loss": val_loss, "epoch": epoch, "params": {k: v.copy() for k, v in params.items()}}
            waited = 0
        else:
            waited += 1
            if waited >= patience:
                break
    for name in params:
        params[name] = best["params"][name]  # put the best weights back into the caller's dict
    history["best_epoch"] = best["epoch"]
    history["stopped_epoch"] = epoch
    return history


def pick_learning_rate(candidates, X, y, X_val, y_val, epochs, seed):
    scores = {}
    for lr in candidates:
        trial = init_params(N_IN, N_HIDDEN, N_OUT, 3)
        train_stopping(trial, X, y, X_val, y_val, lr, 128, epochs, epochs, seed)
        scores[str(lr)] = accuracy(trial, X_val, y_val)
    best_lr = max(candidates, key=lambda lr: scores[str(lr)])
    return best_lr, scores


best_lr, lr_scores = pick_learning_rate([0.05, 0.2, 0.8, 2.0], X_fit, y_fit, X_val, y_val, 3, 4)
params_stop = init_params(N_IN, N_HIDDEN, N_OUT, 3)
history_stop = train_stopping(params_stop, X_fit, y_fit, X_val, y_val, best_lr, 128, 20, 3, 4)
stop_info = {"best_epoch": history_stop["best_epoch"], "stopped_epoch": history_stop["stopped_epoch"]}
net_view = params_to_lists(params_stop)`,
      explanation:
        "split_glyphs gives the 960 fit and 240 validation glyphs (the 400 test glyphs are never touched). mean_loss is softmax plus cross-entropy on any set. train_stopping is the mini-batch loop plus bookkeeping: after each epoch it measures the validation loss, and on a new best it stores a COPY of every array (training edits arrays in place, so an uncopied 'best' would drift along with the weights). The counter of epochs without improvement ends training at the patience limit, and the final loop writes the best weights back into the caller's dict. pick_learning_rate trains a fresh, identically initialised net per candidate and scores it on the validation pile, with string keys so the scores stay JSON-friendly. The chosen rate then trains the stopped net, and stop_info records where the best epoch and the stop landed.",
      hints: [
        { id: "h1", title: "Split and loss", content: "The order is X_fit, X_val, y_fit, y_val = split_glyphs(X_train, y_train, 240, 5). mean_loss is cross_entropy(softmax(forward(X, params)[2]), y): forward returns (Z1, H, Z2) and the scores are the last one." },
        { id: "h2", title: "Best weights and patience", content: "Keep best = {'loss': ..., 'epoch': ..., 'params': {k: v.copy() for k, v in params.items()}} and a counter 'waited'. When val_loss < best['loss'], store a new best and set waited = 0; otherwise waited += 1 and break once waited >= patience. After the loop, for name in params: params[name] = best['params'][name]." },
        { id: "h3", title: "Picking the rate", content: "For each lr in candidates: trial = init_params(N_IN, N_HIDDEN, N_OUT, 3); train_stopping(trial, X, y, X_val, y_val, lr, 128, epochs, epochs, seed); scores[str(lr)] = accuracy(trial, X_val, y_val). Return max(candidates, key=lambda lr: scores[str(lr)]) and scores. Then run it with 4 epochs and seed 4." },
      ],
      tests: [
        {
          id: "t1",
          description: "the glyphs are split into 960 for fitting and 240 for validation, and the test glyphs stay untouched",
          assertionCode: py`
for _name, _val in (("X_fit", X_fit), ("X_val", X_val), ("y_fit", y_fit), ("y_val", y_val)):
    assert isinstance(_val, np.ndarray), f"{_name} should be a NumPy array. Fill it in with split_glyphs(X_train, y_train, 240, 5)"
assert X_fit.shape == (960, 100) and X_val.shape == (240, 100), f"X_fit should have shape (960, 100) and X_val (240, 100), but they have {X_fit.shape} and {X_val.shape}. split_glyphs returns X_a, X_b, y_a, y_b in that order"
assert y_fit.shape == (960,) and y_val.shape == (240,), f"y_fit should have shape (960,) and y_val (240,), but they have {y_fit.shape} and {y_val.shape}"
_a, _b, _c, _d = split_glyphs(X_train, y_train, 240, 5)
assert np.array_equal(X_fit, _a) and np.array_equal(X_val, _b) and np.array_equal(y_fit, _c) and np.array_equal(y_val, _d), "use split_glyphs(X_train, y_train, 240, 5) so the split is the same one everybody gets"
_seen = {_r.tobytes() for _r in X_fit} | {_r.tobytes() for _r in X_val}
assert not any(_r.tobytes() in _seen for _r in X_test), "none of the test glyphs may appear in the fit or validation piles. Split X_train, not X_all"
`,
        },
        {
          id: "t2",
          description: "mean_loss measures a net on any set, and train_stopping stops after its patience and restores the best epoch",
          assertionCode: py`
_zero = init_params(N_IN, 8, N_OUT, 1, "zeros")
_got = mean_loss(_zero, X_train[:20], y_train[:20])
assert isinstance(_got, (int, float, np.number)), f"mean_loss should return one number, but it returned {_got!r}"
assert abs(float(_got) - np.log(10)) < 1e-6, f"a net with all-zero weights guesses 10 digits equally, so its loss should be ln 10 = 2.3026, but mean_loss returned {float(_got):.4f}"
_he = init_params(N_IN, 8, N_OUT, 2)
assert abs(mean_loss(_he, X_train[:30], y_train[:30]) - cross_entropy(softmax(forward(X_train[:30], _he)[2]), y_train[:30])) < 1e-9, "mean_loss should be cross_entropy(softmax(scores), y) for the net's scores"
_Xf, _yf, _Xv, _yv = X_train[:64], y_train[:64], X_train[64:124], y_train[64:124]
_p = init_params(N_IN, 8, N_OUT, 1)
_h = train_stopping(_p, _Xf, _yf, _Xv, _yv, 3.0, 32, 12, 2, 3)
assert isinstance(_h, dict), f"train_stopping should return the history dict, but it returned {_h!r}"
for _key in ("loss", "train_acc", "eval_acc", "val_loss", "best_epoch", "stopped_epoch"):
    assert _key in _h, f"the history needs a '{_key}' entry"
_n = len(_h["val_loss"])
assert _n >= 1 and len(_h["loss"]) == _n and len(_h["train_acc"]) == _n and len(_h["eval_acc"]) == _n, "history['loss'], 'train_acc', 'eval_acc' and 'val_loss' should each get one entry per epoch that ran"
assert _h["stopped_epoch"] == _n - 1, f"stopped_epoch should be the last epoch that ran ({_n - 1}), but it is {_h['stopped_epoch']}"
assert 0 <= _h["best_epoch"] <= _h["stopped_epoch"], "best_epoch must be an epoch that ran (counting from 0)"
assert _h["best_epoch"] == int(np.argmin(_h["val_loss"])), f"best_epoch should be the epoch with the lowest validation loss ({int(np.argmin(_h['val_loss']))}), but it is {_h['best_epoch']}"
assert _h["stopped_epoch"] < 11 and _h["stopped_epoch"] - _h["best_epoch"] == 2, f"with patience 2 this run should stop two epochs after its best one, long before the 12 epochs are used up. best_epoch is {_h['best_epoch']} and stopped_epoch is {_h['stopped_epoch']}"
assert abs(mean_loss(_p, _Xv, _yv) - min(_h["val_loss"])) < 1e-9, "after stopping, params should hold the BEST epoch's weights (validation loss = the lowest in history['val_loss']). Keep a copy of the weights at every new best and put it back into params at the end"
_p2 = init_params(N_IN, 8, N_OUT, 1)
_h2 = train_stopping(_p2, _Xf, _yf, _Xv, _yv, 0.3, 32, 5, 50, 3)
assert len(_h2["val_loss"]) == 5 and _h2["stopped_epoch"] == 4, "with a huge patience the run should use all max_epochs (5 here)"
`,
        },
        {
          id: "t3",
          description: "pick_learning_rate scores each candidate on the validation set and returns the best",
          assertionCode: py`
_cands = [0.00001, 0.4]
_got = pick_learning_rate(_cands, X_train[:300], y_train[:300], X_train[300:420], y_train[300:420], 3, 4)
assert isinstance(_got, tuple) and len(_got) == 2, f"pick_learning_rate should return (best_lr, scores), but it returned {_got!r}"
_best, _scores = _got
assert isinstance(_scores, dict) and set(_scores) == {str(_c) for _c in _cands}, f"scores should have one entry per candidate with string keys {[str(_c) for _c in _cands]}, but it is {_scores!r}. Use str(lr) as the key"
assert all(isinstance(_s, (int, float, np.number)) and 0.0 <= float(_s) <= 1.0 for _s in _scores.values()), f"every score should be a validation accuracy between 0 and 1, but they are {_scores!r}"
assert _best in _cands, f"best_lr should be one of the candidates, but it is {_best!r}"
assert float(_scores[str(_best)]) == max(float(_s) for _s in _scores.values()), "best_lr should be the candidate with the highest validation accuracy"
assert _best == 0.4, f"a rate of 0.00001 hardly moves the weights in 3 epochs, so 0.4 should win, but pick_learning_rate chose {_best!r} (scores {_scores!r})"
`,
        },
        {
          id: "t4",
          description: "the chosen rate, the stopped run and net_view all agree with each other",
          assertionCode: py`
assert best_lr in [0.05, 0.2, 0.8, 2.0], f"best_lr should be one of the candidates [0.05, 0.2, 0.8, 2.0], but it is {best_lr!r}. Fill it in with pick_learning_rate(...)"
assert isinstance(lr_scores, dict) and set(lr_scores) == {"0.05", "0.2", "0.8", "2.0"}, f"lr_scores should have the four string keys '0.05', '0.2', '0.8', '2.0', but it is {lr_scores!r}"
assert float(lr_scores[str(best_lr)]) == max(float(_s) for _s in lr_scores.values()), "best_lr should be the candidate with the highest score in lr_scores"
assert isinstance(params_stop, dict) and set(params_stop) == {"W1", "b1", "W2", "b2"}, "params_stop should be a fresh network (init_params(N_IN, N_HIDDEN, N_OUT, 3)) trained by train_stopping"
assert isinstance(history_stop, dict) and len(history_stop.get("val_loss", [])) >= 1, "history_stop should be the history returned by train_stopping (the call is in the task list)"
assert history_stop["stopped_epoch"] == len(history_stop["val_loss"]) - 1 and len(history_stop["val_loss"]) <= 20, "history_stop should come from a run of at most 20 epochs"
assert abs(mean_loss(params_stop, X_val, y_val) - min(history_stop["val_loss"])) < 1e-9, "params_stop should hold the best epoch's weights: its validation loss must equal the lowest one in history_stop['val_loss']"
assert stop_info == {"best_epoch": history_stop["best_epoch"], "stopped_epoch": history_stop["stopped_epoch"]}, f"stop_info should be {{'best_epoch': ..., 'stopped_epoch': ...}} read from history_stop, but it is {stop_info!r}"
assert isinstance(net_view, dict) and set(net_view) == {"W1", "b1", "W2", "b2"}, "net_view should be params_to_lists(params_stop)"
assert np.shape(net_view["W1"]) == (100, 24) and np.shape(net_view["b1"]) == (24,) and np.shape(net_view["W2"]) == (24, 10) and np.shape(net_view["b2"]) == (10,), "net_view has the wrong shapes. Build it from params_stop (a 100-24-10 net)"
assert all(np.allclose(net_view[_k], params_stop[_k]) for _k in params_stop), "net_view should describe the stopped net: net_view = params_to_lists(params_stop)"
`,
        },
      ],
      unlocks: ["gn-validation"],
      checks: [
        {
          prompt: "Which pile should decide the learning rate and the stopping epoch?",
          question: { type: "choice", options: ["The validation pile", "The test pile", "The fit pile", "Whichever one gives the best number"], answer: 0 },
          explanation: "The fit pile trains the weights, the validation pile makes the decisions, and the test pile is opened once at the end. Choosing on the test pile quietly turns it into a second validation pile and spoils the honest score.",
        },
        {
          prompt: "A model scores 0.90 on 100 validation pictures. Using sqrt(p * (1 - p) / n), what is the standard error of that accuracy?",
          question: { type: "number", answer: 0.03, tolerance: 0.001 },
          explanation: "sqrt(0.9 * 0.1 / 100) = sqrt(0.0009) = 0.03: three points of wobble. With only 100 pictures, two settings that differ by one or two points cannot really be told apart.",
        },
        {
          prompt: "Why does train_stopping store the best weights with .copy() instead of just best = params?",
          question: {
            type: "choice",
            options: [
              "Training changes the arrays in place, so an uncopied 'best' would silently follow the weights to their latest, worse values",
              "Copies are faster to compute than references",
              "NumPy forbids two names for one dict",
              "Without copying, the validation loss cannot be computed",
            ],
            answer: 0,
          },
          explanation: "params[name] -= ... edits the very array that best points to if you did not copy it. The copy is a frozen photograph of the weights at the best epoch.",
        },
      ],
    },

    // ───────────────────────── 16 ─────────────────────────
    {
      id: "ai-neural-16-reader",
      title: "The finished reader: train, report, predict",
      minutes: 35,
      xp: 160,
      concepts: ["training pipeline", "honest evaluation", "predict function", "distribution shift", "next steps"],
      learn: md`### Assembling the pieces

Every part of the reader now exists. Put them in order and you have the whole recipe:

1. **Data** (lesson 1): glyphs scaled to 0 to 1, split into fit, validation and test.
2. **A net** with **He initialisation** (lesson 6), so the signal neither dies nor explodes.
3. **Forward pass**, **softmax** and **cross-entropy** (lessons 4 and 5) to turn pixels into a loss.
4. **Backprop** (lessons 7 and 8), checked once against finite differences (lesson 9).
5. **Mini-batch descent** on shuffled batches (lesson 11).
6. A **learning rate** picked on validation data and **early stopping** with patience (lesson 15).

Wrap steps 2 to 6 into one function, \`train_recogniser(X, y, X_val, y_val, lr, seed)\`, which returns the trained \`params\` and the history. One function means one place to change a setting, and a single \`seed\` makes the whole run repeatable: the seed drives both the initial weights and the order of the batches. Run it again with another seed and your accuracy moves by a point or so. That wobble is real, so never celebrate a difference in the third decimal.

### The honest number

The 400 test glyphs have been waiting since lesson 1. Now you open them, **once**, and write down what you see. Our reader scores about 0.94, which is 94% right on pictures it has never been near. With 400 pictures the standard error is \`sqrt(0.94 * 0.06 / 400) = 0.012\`, so say "about 94%, give or take 1.2 points", not just "94%". Because early stopping and a different seed move the number, expect your own run to land within a point or two of that.

A good report holds what someone would need to judge and repeat the result: the test accuracy, the validation accuracy (it is allowed to be a little higher, because early stopping chose the epoch on it), how many epochs ran, which epoch was best, and the learning rate. We count epochs from 1 in the report because people do (the history counts from 0), so \`epochs = stopped_epoch + 1\`. A confusion matrix from lesson 12 recomputed for the finished net shows *which* digits still fail.

If the number disappoints, resist the urge to tweak and re-measure. Every tweak made after looking at the test score spends a little of its honesty. Go back and improve the model using validation data. If you must go on tuning after having peeked, treat the test score as used up, and collect fresh data for the next honest one.

### predict: the door of the program

A trained net is only useful if something can ask it a question. The draw pad on the stage will send your program a plain list of 100 numbers between 0 and 1, one per pixel, row by row, and expects ten probabilities back. That is the whole interface:

~~~python
def predict(pixels):
    x = np.array(pixels, dtype=float).reshape(1, -1)   # a batch of ONE picture
    return softmax(forward(x, final_params)[2])[0].tolist()
~~~

Three details carry the weight:

- **A batch of one.** Everything in your net expects a table with one picture per row. \`reshape(1, -1)\` turns a flat list of 100 into shape \`(1, 100)\`. Skip it and \`softmax\` meets a one-dimensional array and stops with \`AxisError: axis 1 is out of bounds for array of dimension 1\`.
- **Plain Python out.** \`[0]\` takes the only row and \`.tolist()\` turns the NumPy array into an ordinary list of floats, which anything can read.
- **A list or an array in.** \`np.array(pixels, dtype=float)\` accepts both, so you can test with a row of \`X_test\` straight away.

### Reading what predict says

The output is ten probabilities that always add up to 1, such as \`[0.01, 0.93, 0.00, ...]\`: the biggest entry (\`argmax\`) is the guess, and its size is the net's confidence. Two cautions. First, softmax **must** hand out 100% among the ten digits, because there is no "none of these" option. Scribble a squiggle and one digit still wins. Second, the confidence is usually a bit overconfident: 0.93 does not mean right 93 times in 100.

### Why your own drawing may confuse it

Every training glyph was drawn the same way: 10 by 10 pixels, centred give or take a pixel, tilted within about 14 degrees, drawn with a pen roughly one to two pixels wide. A drawing from the pad can be thicker, off to one side, smaller or sharper. The net has simply never seen such pictures. That mismatch between the training data and the data it meets later has a name, **distribution shift**, and it is the usual reason a model that scores 93% in the lab disappoints in the field. If the pad guesses badly, draw big, centred and with a medium pen first, before you blame the code. Real fixes are to add varied training examples (shifting, tilting and thickening glyphs on purpose is called data augmentation) or to centre and scale each drawing before predicting.

### Where next

You built every wheel by hand: initialisation, backprop, the training loop, regularisation, schedules, stopping. Libraries such as PyTorch do all of it for you, and now you know what each knob does. Natural next steps are **convolutional layers** (they reuse the same small weight patch at every position of the picture, a much better fit for images), **dropout** as another regulariser, and adaptive optimisers such as **Adam**, which are momentum plus per-weight step sizes.

### Common mistakes

- **Training on \`X_train\` but validating on \`X_val\`.** The validation pictures are inside \`X_train\`, so the net has studied them and the validation loss is flattering. Fit on \`X_fit\`.
- **Forgetting \`reshape(1, -1)\`** in \`predict\` (see the \`AxisError\` above).
- **Returning a NumPy array from \`predict\`.** The pad needs a plain list; end with \`.tolist()\`.
- **Re-tuning after reading the test accuracy.** See "The honest number".
- **Counting epochs from 0 in the report.** Both numbers should be one more than the history's.`,
      mission: md`The seedlings have grown into a reader. Time to harvest. You will wrap the whole recipe into one function, train the final reader on the fit pile with the learning rate the validation pile chose, and write the report you would hand to someone else, with the test score measured honestly once.

Then you give the reader a voice: \`predict(pixels)\` takes the 100 numbers the draw pad sends and returns ten probabilities. When this passes, the **Draw pad** lights up on the stage: draw a digit and your own program reads it.`,
      tasks: [
        "train_recogniser(X, y, X_val, y_val, lr, seed): He init, then train_stopping with batch 128, up to 20 epochs, patience 3; return (params, history)",
        "final_params, history_final = train_recogniser(X_fit, y_fit, X_val, y_val, best_lr, 8)",
        "predict(pixels): a list of 100 numbers in, a plain list of 10 probabilities out (final_params, softmax)",
        "report: a dict with test_accuracy, val_accuracy, epochs, best_epoch (both counted from 1) and learning_rate",
        "final_confusion (the confusion matrix of the finished reader on the test set, as a list of lists) and net_view",
        "print one line, 'Test accuracy:' followed by the number",
      ],
      starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 16: the finished reader.


def train_recogniser(X, y, X_val, y_val, lr, seed):
    """The whole recipe in one call: a He-initialised net (hidden size N_HIDDEN, init seed = seed),
    trained with train_stopping(params, X, y, X_val, y_val, lr, 128, 20, 3, seed).
    Return (params, history)."""
    ...


# Train the final reader on the FIT pile (not on X_train: the validation pictures live in there).
final_params, history_final = None, {}   # train_recogniser(X_fit, y_fit, X_val, y_val, best_lr, 8)


def predict(pixels):
    """pixels: a list (or array) of 100 numbers between 0 and 1, row by row.
    Return a plain Python list of 10 probabilities that add up to 1, using final_params."""
    ...


# The honest report, with the test accuracy measured once. Replace the placeholders:
report = {}           # keys: test_accuracy, val_accuracy, epochs, best_epoch, learning_rate
final_confusion = []  # confusion_matrix of y_test against the reader's labels, as a list of lists
# Then: net_view = params_to_lists(final_params), and print("Test accuracy:", report["test_accuracy"])`,
      solutionAdd: py`def train_recogniser(X, y, X_val, y_val, lr, seed):
    """Everything in one call: He init, mini-batches, early stopping on the validation loss."""
    params = init_params(N_IN, N_HIDDEN, N_OUT, seed)
    history = train_stopping(params, X, y, X_val, y_val, lr, 128, 20, 3, seed)
    return params, history


final_params, history_final = train_recogniser(X_fit, y_fit, X_val, y_val, best_lr, 8)


def predict(pixels):
    """100 pixel values (0 to 1) in, ten probabilities out. This is what the draw pad calls."""
    x = np.array(pixels, dtype=float).reshape(1, -1)  # a batch of one picture
    return softmax(forward(x, final_params)[2])[0].tolist()


report = {
    "test_accuracy": accuracy(final_params, X_test, y_test),
    "val_accuracy": accuracy(final_params, X_val, y_val),
    "epochs": history_final["stopped_epoch"] + 1,
    "best_epoch": history_final["best_epoch"] + 1,
    "learning_rate": best_lr,
}
final_confusion = confusion_matrix(y_test, predict_labels(final_params, X_test)).tolist()
net_view = params_to_lists(final_params)
print("Test accuracy:", report["test_accuracy"])`,
      explanation:
        "train_recogniser packages the recipe so one call (and one seed) reproduces the whole run: He init from the seed, then the early-stopping loop that restores the best epoch. The final net is trained on the fit pile only, so the validation pile stays a fair judge and the test pile stays unseen until the report. predict adds the batch axis with reshape(1, -1), runs the forward pass and softmax, takes the single row and converts it to a plain list so the draw pad can read it. report is measured once: test and validation accuracy of the restored net, epochs and best epoch counted from 1, and the chosen rate. final_confusion reuses the lesson-12 matrix for the finished reader.",
      hints: [
        { id: "h1", title: "The training function", content: "params = init_params(N_IN, N_HIDDEN, N_OUT, seed); history = train_stopping(params, X, y, X_val, y_val, lr, 128, 20, 3, seed); return params, history. Remember train_stopping edits params in place and restores the best epoch for you." },
        { id: "h2", title: "predict", content: "x = np.array(pixels, dtype=float).reshape(1, -1) makes a batch of one. Then softmax(forward(x, final_params)[2]) has shape (1, 10); take [0] and finish with .tolist(). Without the reshape you get AxisError: axis 1 is out of bounds for array of dimension 1." },
        { id: "h3", title: "The report", content: "test_accuracy = accuracy(final_params, X_test, y_test), val_accuracy = accuracy(final_params, X_val, y_val), epochs = history_final['stopped_epoch'] + 1, best_epoch = history_final['best_epoch'] + 1, learning_rate = best_lr. final_confusion = confusion_matrix(y_test, predict_labels(final_params, X_test)).tolist(). Finish with net_view = params_to_lists(final_params) and the print line." },
      ],
      tests: [
        {
          id: "t1",
          description: "train_recogniser trains a 100-24-10 net with early stopping, repeatably",
          assertionCode: py`
_Xf, _yf, _Xv, _yv = X_train[:64], y_train[:64], X_train[64:124], y_train[64:124]
_got = train_recogniser(_Xf, _yf, _Xv, _yv, 0.4, 1)
assert isinstance(_got, tuple) and len(_got) == 2, f"train_recogniser should return (params, history), but it returned {_got!r}"
_p, _h = _got
assert isinstance(_p, dict) and set(_p) == {"W1", "b1", "W2", "b2"}, "the first thing returned should be the params dict with W1, b1, W2 and b2"
assert _p["W1"].shape == (100, 24) and _p["b1"].shape == (24,) and _p["W2"].shape == (24, 10) and _p["b2"].shape == (10,), f"the net should be 100 -> 24 -> 10, but the shapes are {[_p[_k].shape for _k in ('W1', 'b1', 'W2', 'b2')]}"
assert isinstance(_h, dict) and "val_loss" in _h and "best_epoch" in _h and "stopped_epoch" in _h, "the second thing returned should be the history from train_stopping (with val_loss, best_epoch and stopped_epoch)"
assert abs(mean_loss(_p, _Xv, _yv) - min(_h["val_loss"])) < 1e-9, "the returned net should hold the best epoch's weights (its validation loss equals the lowest in history['val_loss'])"
assert min(_h["val_loss"]) < _h["val_loss"][0] and min(_h["val_loss"]) < np.log(10), "the net did not learn anything: check that train_stopping got the right learning rate and data"
_p2, _h2 = train_recogniser(_Xf, _yf, _Xv, _yv, 0.4, 1)
assert all(np.allclose(_p[_k], _p2[_k]) for _k in _p), "the same seed should give exactly the same trained net"
_p3, _h3 = train_recogniser(_Xf, _yf, _Xv, _yv, 0.4, 2)
assert not np.allclose(_p["W1"], _p3["W1"]), "a different seed should start from different weights, but the nets came out identical. Pass the seed to init_params"
`,
        },
        {
          id: "t2",
          description: "predict turns a list or an array of 100 pixels into ten probabilities and reads most test glyphs correctly",
          assertionCode: py`
_row = X_test[0]
try:
    _out = predict(_row.tolist())
except Exception as _err:
    assert False, f"predict stopped with an error when given a list of 100 numbers ({_err}). Remember it needs a batch of one picture: reshape(1, -1)"
assert isinstance(_out, list), f"predict should return a plain Python list of 10 probabilities, but it returned {'None' if _out is None else 'something else (' + type(_out).__name__ + ')'}. End with .tolist()"
assert len(_out) == 10, f"predict should return 10 probabilities (one per digit), but the list has {len(_out)} entries"
assert all(isinstance(_v, float) and _v >= 0.0 for _v in _out), "every probability should be a plain float that is not negative"
assert abs(sum(_out) - 1.0) < 1e-6, f"the ten probabilities should add up to 1, but they add up to {sum(_out):.4f}"
try:
    _arr = predict(_row)
except Exception as _err:
    assert False, f"predict stopped with an error when given a NumPy array ({_err}). It should accept a list or an array"
assert isinstance(_arr, list) and len(_arr) == 10 and abs(sum(_arr) - 1.0) < 1e-6, "predict should accept a NumPy array as well as a list"
_want = softmax(forward(X_test[:1], final_params)[2])[0]
assert np.allclose(_out, _want, atol=1e-9), "predict should use final_params: softmax(forward(batch of one, final_params)[2]) for the pixels it is given"
_right = sum(int(np.argmax(predict(X_test[_i].tolist())) == y_test[_i]) for _i in range(20))
assert _right >= 17, f"the finished reader should name at least 17 of the first 20 test glyphs correctly, but predict got only {_right}. Is predict using final_params?"
`,
        },
        {
          id: "t3",
          description: "the final reader was trained on the fit pile and its report is measured honestly",
          assertionCode: py`
assert isinstance(final_params, dict) and set(final_params) == {"W1", "b1", "W2", "b2"}, "final_params should be the trained params dict. Fill it in with train_recogniser(...)"
assert isinstance(history_final, dict) and len(history_final.get("val_loss", [])) >= 1, "history_final should be the history returned by train_recogniser"
assert len(X_fit) == 960 and len(X_val) == 240, "train the final reader on X_fit (960 glyphs) and validate on X_val (240); the test glyphs are only for the report"
assert abs(mean_loss(final_params, X_val, y_val) - min(history_final["val_loss"])) < 1e-9, "final_params should be the best-epoch weights chosen on the validation pile (train_recogniser with X_fit and X_val)"
assert isinstance(report, dict) and set(report) == {"test_accuracy", "val_accuracy", "epochs", "best_epoch", "learning_rate"}, f"report should have exactly the keys test_accuracy, val_accuracy, epochs, best_epoch and learning_rate, but it is {report!r}"
_test = float((np.argmax(forward(X_test, final_params)[2], axis=1) == y_test).mean())
_val = float((np.argmax(forward(X_val, final_params)[2], axis=1) == y_val).mean())
assert abs(report["test_accuracy"] - _test) < 1e-9, f"report['test_accuracy'] should be the accuracy of final_params on the 400 test glyphs ({_test:.4f}), but it is {report['test_accuracy']!r}"
assert abs(report["val_accuracy"] - _val) < 1e-9, f"report['val_accuracy'] should be the accuracy of final_params on the validation glyphs ({_val:.4f}), but it is {report['val_accuracy']!r}"
assert report["test_accuracy"] >= 0.9, f"the finished reader should reach at least 0.90 on the test glyphs, but it scored {report['test_accuracy']:.3f}"
assert report["epochs"] == history_final["stopped_epoch"] + 1 and report["best_epoch"] == history_final["best_epoch"] + 1, "report counts epochs from 1: epochs = stopped_epoch + 1 and best_epoch = best_epoch + 1"
assert report["learning_rate"] == best_lr, "report['learning_rate'] should be the learning rate the validation pile picked (best_lr)"
assert all(type(report[_k]) in (int, float) for _k in report), "report should hold plain Python numbers (accuracy() already returns a float; use int/float for the rest)"
`,
        },
        {
          id: "t4",
          description: "final_confusion, net_view and the printed line describe the finished reader",
          assertionCode: py`
assert isinstance(final_confusion, list) and len(final_confusion) == 10 and all(isinstance(_r, list) and len(_r) == 10 for _r in final_confusion), "final_confusion should be a 10 x 10 list of lists (use .tolist())"
assert sum(sum(_r) for _r in final_confusion) == 400, f"final_confusion should count all 400 test glyphs, but its entries add up to {sum(sum(_r) for _r in final_confusion)}"
_trace = sum(final_confusion[_i][_i] for _i in range(10))
assert abs(_trace / 400 - report["test_accuracy"]) < 1e-9, "the diagonal of final_confusion divided by 400 should equal report['test_accuracy']"
assert isinstance(net_view, dict) and set(net_view) == {"W1", "b1", "W2", "b2"}, "net_view should be params_to_lists(final_params)"
assert np.shape(net_view["W1"]) == (100, 24) and np.shape(net_view["W2"]) == (24, 10) and np.shape(net_view["b1"]) == (24,) and np.shape(net_view["b2"]) == (10,), "net_view has the wrong shapes. Build it from final_params"
assert all(np.allclose(net_view[_k], final_params[_k]) for _k in final_params), "net_view should describe the finished reader: net_view = params_to_lists(final_params)"
import re as _re
assert "Test accuracy" in __stdout__, "print one line that starts with 'Test accuracy:' followed by the number, for example print('Test accuracy:', report['test_accuracy'])"
_nums = _re.findall(r"[0-9]*\.?[0-9]+", __stdout__.split("Test accuracy")[-1])
assert _nums, "the printed line should show the test accuracy number after 'Test accuracy:'"
_shown = float(_nums[0])
assert abs(_shown - report["test_accuracy"]) < 0.001 or abs(_shown - 100 * report["test_accuracy"]) < 0.1, f"the printed number ({_shown}) should be the test accuracy ({report['test_accuracy']:.3f}) as a fraction or a percentage"
`,
        },
      ],
      unlocks: ["gn-pad"],
      checks: [
        {
          prompt: "predict returns ten probabilities. What do they always add up to?",
          question: { type: "number", answer: 1 },
          explanation: "Softmax turns the ten scores into a distribution, so the entries are positive and sum to 1. That is also why scribbles get a confident-looking answer: the net has no way to say 'none of the above'.",
        },
        {
          prompt: "The net scores 93% in your report, but it misreads digits drawn very thick and far off-centre on the pad. What is the most likely reason?",
          question: {
            type: "choice",
            options: [
              "The pad's drawings come from a different distribution than the training glyphs (thickness, position), so the net has never seen anything like them",
              "The softmax function stops working above 90% accuracy",
              "The test set was too small",
              "predict forgot to call .tolist()",
            ],
            answer: 0,
          },
          explanation: "Accuracy is only guaranteed on data that looks like what the net was trained and tested on. Different thickness or position is distribution shift. Augmenting the training data or centring and scaling the drawing before predicting helps.",
        },
        {
          prompt: "After seeing a disappointing test accuracy, what is the honest next step?",
          question: {
            type: "choice",
            options: [
              "Improve the model using validation results, and treat the test score you have seen as used up",
              "Change settings until the test score goes up, then report that number",
              "Add the test glyphs to the training pile and report accuracy on them",
              "Delete the report and run print() again",
            ],
            answer: 0,
          },
          explanation: "Every tweak made while looking at the test score bends the model to the test set, and the final number stops being honest. Tune on validation data; if you have already peeked, get fresh data for the next real measurement.",
        },
      ],
    },
  ],
};
