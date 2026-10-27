import type { Project } from "@/engine/types";
import { chapter1 } from "./ai-neural/ch1.ts";
import { chapter2 } from "./ai-neural/ch2.ts";
import { chapter3 } from "./ai-neural/ch3.ts";
import { chapter4 } from "./ai-neural/ch4.ts";

/**
 * Glyph Greenhouse: the Intermediate project of the AI & Machine Learning track. The learner grows a
 * neural network from scratch in NumPy, one idea per lesson, and teaches it to read hand-drawn
 * digits. The pictures come from an original, procedurally drawn glyph set (see ai-neural/util.ts),
 * so the data is reproducible from a seed.
 *
 * The scene (src/scenes/ai-neural) reads these names back, each only once its lesson is passed:
 *   gallery, gallery_labels, digit_counts, stem_image, stem_rates, curves, xor_table, net_view,
 *   shape_report, chance_loss, start_probs, init_report, chain_report, neuron_losses, neuron_image,
 *   grad_norms, check_rows, check_error, bug_error, history_full, history_batch, batch_study,
 *   confusion, recalls, worst_pairs, mistake_pixels, mistake_truth, mistake_guess, history_free,
 *   history_decay, gap_free, gap_decay, weight_size, lr_curves, schedule_study, history_sched,
 *   lr_scores, best_lr, history_stop, stop_info, history_final, report, final_confusion, predict
 */
export const aiNeural: Project = {
  slug: "ai-neural",
  track: "ai",
  packages: ["numpy"],
  title: "Glyph Greenhouse",
  tagline: "Grow a neural network from scratch in NumPy and teach it to read hand-drawn digits.",
  pitch:
    "A greenhouse where numbers sprout. You start with a seed: ten hand-designed pen strokes that a generator wobbles into hundreds of handwritten-looking digits. Then you grow a brain for them, one NumPy function at a time: a single neuron, activations, layers as matrix multiplies, softmax and cross-entropy, careful seed weights, backpropagation by hand, a gradient check that catches your own bugs, mini-batch training, a confusion matrix, regularisation, learning-rate seasons and early stopping. A live stage draws the network with weight-coloured edges, the loss and accuracy curves, the digits it gets wrong, and a pad where you draw a digit and your own predict() reads it.",
  emoji: "🌱",
  difficulty: "Intermediate",
  hours: 8,
  sceneId: "ai-neural",
  prerequisites: ["ai-foundations"],
  accent: { from: "#4ade80", to: "#22d3ee" },
  controls: ["Pick a sample to light up the network", "Switch the activation function", "Scrub the learning-rate seasons", "Draw a digit on the pad"],
  skills: [
    "neurons & activations",
    "forward pass",
    "softmax & cross-entropy",
    "weight initialisation",
    "backpropagation",
    "gradient checking",
    "mini-batches",
    "confusion matrix",
    "regularisation",
    "learning-rate schedules",
    "early stopping",
  ],
  features: [
    { id: "gn-glyphs", title: "Glyph bed", blurb: "A bed of freshly drawn digits, counted by kind and ready to train on.", emoji: "🔢" },
    { id: "gn-neuron", title: "One neuron", blurb: "A single stem-detecting neuron: its weights as a picture and how often it fires for each digit.", emoji: "🌱" },
    { id: "gn-activations", title: "Activation lab", blurb: "Sigmoid, tanh and ReLU with their slopes, and the XOR puzzle only a bend can solve.", emoji: "📈" },
    { id: "gn-network", title: "The network", blurb: "Pixels, hidden units and outputs drawn as a network, with weight-coloured edges and live activations.", emoji: "🕸️" },
    { id: "gn-softmax", title: "Softmax & loss", blurb: "Ten scores become ten probabilities, and cross-entropy says how wrong they are.", emoji: "🎚️" },
    { id: "gn-init", title: "Seed weights", blurb: "How different starting weights change the signal that travels through the net.", emoji: "🌰" },
    { id: "gn-chain", title: "Chain rule graph", blurb: "A neuron's computation graph, with values flowing forward and blame flowing back.", emoji: "⛓️" },
    { id: "gn-grads", title: "Gradient flow", blurb: "How large the gradient is for every weight matrix and bias.", emoji: "🌊" },
    { id: "gn-check", title: "Gradient check", blurb: "Your backprop against finite differences, entry by entry, plus a deliberately broken one.", emoji: "🔬" },
    { id: "gn-training", title: "Growth curves", blurb: "Loss and accuracy per epoch as the whole network trains.", emoji: "📉" },
    { id: "gn-batches", title: "Batch sizes", blurb: "The same data fed in small, medium and large mouthfuls.", emoji: "🧺" },
    { id: "gn-confusion", title: "Confusion matrix", blurb: "Ten by ten: which digits get mistaken for which, and the actual mistakes.", emoji: "🧩" },
    { id: "gn-overfit", title: "Overfitting gap", blurb: "Training and test accuracy pulling apart, and weight decay pulling them together.", emoji: "✂️" },
    { id: "gn-schedule", title: "Learning-rate seasons", blurb: "Step, exponential and warm-up schedules plotted, and what momentum adds.", emoji: "🌦️" },
    { id: "gn-validation", title: "Early stopping", blurb: "A validation split to choose with, and the epoch where training should have stopped.", emoji: "⏱️" },
    { id: "gn-pad", title: "Draw pad", blurb: "Draw a digit and your predict() reads it live.", emoji: "✍️" },
  ],
  chapters: [chapter1, chapter2, chapter3, chapter4],
};
