import type { Project } from "@/engine/types";
import { chapter1 } from "./ai-foundations/ch1.ts";
import { chapter2 } from "./ai-foundations/ch2.ts";
import { chapter3 } from "./ai-foundations/ch3.ts";
import { chapter4 } from "./ai-foundations/ch4.ts";

/**
 * Orchard Vision: the first project of the AI & Machine Learning track. The learner builds the
 * brain of a fruit-sorting machine in one growing Python file (with NumPy): data, statistics,
 * scaling, k-nearest neighbours, honest evaluation, linear and logistic models trained by gradient
 * descent, and a finished sorting pipeline.
 *
 * The learner's file reads the sensors with a provided rig (see ai-foundations/util.ts) and the
 * scene (src/scenes/ai-foundations) reads these names back, each only once its lesson is passed:
 *   rows, features, label, stats, n_rows, n_features, column_means, column_stds, X_list,
 *   scaled_sample, scaled_means, scaled_stds, classify_1nn, classify, votes, K, SEED, train_idx,
 *   test_idx, train_accuracy, test_accuracy, LABELS, confusion, precision_by_kind, recall_by_kind,
 *   majority_accuracy, line_w, line_b, WEIGHT_UNIT, search_mse, loss_history, fit_history,
 *   line_test_mse, price_for, price_weights, price_train_mse, price_test_mse, ripe_probability,
 *   ripe_weights, ripe_loss_history, ripe_accuracy, is_ripe, RIPE_THRESHOLD, threshold_table,
 *   fit_curve, best_k, engineer, baseline_accuracy, engineered_accuracy, sort_fruit,
 *   classify_many, report, fresh_report
 */
export const aiFoundations: Project = {
  slug: "ai-foundations",
  track: "ai",
  packages: ["numpy"],
  title: "Orchard Vision",
  tagline: "Teach a fruit-sorting machine to see, sort and price with real machine learning.",
  pitch:
    "Build the brain of a smart fruit-sorting machine. Sensors measure every apple, pear and plum that rolls past: weight, size, colour, sugar. Lesson by lesson you turn those numbers into a working learner: you clean and scale the data, teach it to recognise fruit by its nearest neighbours, test it honestly, fit a price line with gradient descent, and predict ripeness with logistic regression. A live lab shows decision regions, loss curves and a confusion matrix redrawing themselves from your code.",
  emoji: "🍐",
  difficulty: "Beginner",
  hours: 6,
  sceneId: "ai-foundations",
  prerequisites: ["garage"],
  accent: { from: "#ff6b9d", to: "#8b5cf6" },
  controls: ["Switch the plot axes", "Drag the decision threshold", "Replay the training run", "Watch the belt sort each fruit"],
  skills: [
    "datasets",
    "NumPy",
    "normalisation",
    "k-nearest neighbours",
    "train / test split",
    "precision & recall",
    "gradient descent",
    "regression",
    "logistic regression",
    "overfitting",
    "feature engineering",
  ],
  features: [
    { id: "oa-belt", title: "Sorting belt", blurb: "Fruit roll past the scanner and your code reads each one's features and label.", emoji: "🍎" },
    { id: "oa-stats", title: "Fruit statistics", blurb: "Range bars built from the means, extremes and spreads you computed by hand.", emoji: "📊" },
    { id: "oa-matrix", title: "Feature matrix", blurb: "The whole batch as a NumPy table, with its shape and column means.", emoji: "🧮" },
    { id: "oa-scale", title: "Normaliser", blurb: "Every feature squeezed onto one fair scale.", emoji: "⚖️" },
    { id: "oa-neighbour", title: "Nearest neighbour", blurb: "A map of feature space coloured by the closest known fruit.", emoji: "🧭" },
    { id: "oa-knn", title: "Voting regions", blurb: "Several neighbours vote, and the regions smooth out.", emoji: "🗳️" },
    { id: "oa-split", title: "Train / test split", blurb: "Fruit held back for an honest exam, with train and test accuracy side by side.", emoji: "✂️" },
    { id: "oa-confusion", title: "Confusion matrix", blurb: "Exactly which kinds get mixed up, with precision and recall.", emoji: "🎯" },
    { id: "oa-line", title: "Price line", blurb: "A straight line through weight and price, scored by its error.", emoji: "📈" },
    { id: "oa-descent", title: "Gradient descent", blurb: "Watch the line improve step by step as the loss falls.", emoji: "⛰️" },
    { id: "oa-price", title: "Price model", blurb: "Predicted against actual price using every measurement at once.", emoji: "💲" },
    { id: "oa-ripeness", title: "Ripeness model", blurb: "A sigmoid curve turns sugar into a ripeness probability.", emoji: "🌡️" },
    { id: "oa-threshold", title: "Decision threshold", blurb: "Slide the cut-off and watch precision trade against recall.", emoji: "🎚️" },
    { id: "oa-fit", title: "Under- and overfitting", blurb: "Training and honest accuracy plotted against how many neighbours vote.", emoji: "🧩" },
    { id: "oa-features", title: "Feature lab", blurb: "New features you invented, and the accuracy they bought.", emoji: "🧪" },
    { id: "oa-sorter", title: "Auto-sorter", blurb: "The full pipeline sorts, ripeness-checks and prices every fruit.", emoji: "🤖" },
  ],
  chapters: [chapter1, chapter2, chapter3, chapter4],
};
