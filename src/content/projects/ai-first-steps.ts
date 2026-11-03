import type { Project } from "@/engine/types";
import { chapter1 } from "./ai-first-steps/ch1.ts";
import { chapter2 } from "./ai-first-steps/ch2.ts";
import { chapter3 } from "./ai-first-steps/ch3.ts";
import { chapter4 } from "./ai-first-steps/ch4.ts";

/**
 * Pebble Beach: the gentle first project of the AI & Machine Learning track. A beach robot called Pip
 * sorts pebbles into skippers, rollers and sparklers. The learner builds, in plain Python (no NumPy, no
 * maths beyond counting steps), a nearest-neighbour guesser: labelled examples, features, a measure of
 * "how alike", neighbours that vote, accuracy as a percentage, a hand-made train/test split, overfitting
 * as memorising, lopsided data, a confusion table and a learn / test / guess pipeline.
 *
 * The scene (src/scenes/ai-first-steps) reads these names back, each only once its lesson is passed:
 *   mystery, truth, hand_guess, hand_correct, PEBBLES, KINDS, kind_counts, first_features, to_first,
 *   to_other, nn_pebble, nn_guess, near3, tricky, tricky_truth, tricky_near, tricky_votes,
 *   tricky_guess, tricky_k1, K, BASKET, basket_accuracy, lazy_accuracy, train_set, test_set,
 *   train_accuracy, test_accuracy, memo_train_accuracy, memo_test_accuracy, fit_table, best_k,
 *   COVE, cove_counts, cove_roller_share, cove_accuracy, combined_counts, fair_counts, fair_accuracy,
 *   confusion_table, table_right, report
 */
export const aiFirstSteps: Project = {
  slug: "ai-first-steps",
  track: "ai",
  title: "Pebble Beach",
  tagline: "Teach a beach robot to sort pebbles from examples instead of rules.",
  pitch:
    "Pip the robot sorts the pebbles the tide leaves behind: skippers, rollers and sparklers. First you write a rule by hand and watch it fail. Then you teach Pip the other way, by example: labelled pebbles, a way to measure how alike two pebbles are, neighbours that vote, a score for how often Pip is right, and a fair exam on pebbles it never studied. You catch Pip memorising, spot a lopsided scoop of data and fix it, read a table of its mistakes, and finish by joining learn, test and guess into one small pipeline. Plain Python only: no packages, no hard maths.",
  emoji: "🪨",
  difficulty: "Beginner",
  hours: 6,
  sceneId: "ai-first-steps",
  prerequisites: ["garage"],
  accent: { from: "#38bdf8", to: "#a78bfa" },
  controls: ["Hover a pebble to read its clues", "Watch the neighbours light up", "See the hidden test pebbles drawn hollow"],
  skills: [
    "learning from examples",
    "features & labels",
    "distance",
    "nearest neighbours",
    "voting",
    "accuracy",
    "train / test split",
    "overfitting",
    "biased data",
    "confusion table",
  ],
  features: [
    { id: "pb-rule", title: "Rule board", blurb: "A rule you wrote by hand, and the mystery pebble it gets wrong.", emoji: "📏" },
    { id: "pb-beach", title: "Beach map", blurb: "Every labelled pebble becomes a dot, placed by its two clues.", emoji: "🗺️" },
    { id: "pb-distance", title: "Step counter", blurb: "Count the steps across and up between two pebbles.", emoji: "👣" },
    { id: "pb-nearest", title: "Nearest pebble", blurb: "A line from the new pebble to the example it copies.", emoji: "🎯" },
    { id: "pb-neighbours", title: "Closest three", blurb: "The three nearest examples, ringed and numbered.", emoji: "🔢" },
    { id: "pb-vote", title: "Vote", blurb: "Neighbours vote, and one odd neighbour is outvoted.", emoji: "🗳️" },
    { id: "pb-accuracy", title: "Accuracy meter", blurb: "How often Pip is right, beside a lazy guesser.", emoji: "📈" },
    { id: "pb-split", title: "Hidden pebbles", blurb: "Training pebbles filled in, test pebbles hollow.", emoji: "🫥" },
    { id: "pb-scores", title: "Honest score", blurb: "The studied score and the exam score side by side.", emoji: "⚖️" },
    { id: "pb-memory", title: "Memoriser", blurb: "A model that learns by heart, and what happens to it.", emoji: "📓" },
    { id: "pb-fit", title: "How many neighbours?", blurb: "Study and exam scores for each k.", emoji: "🎚️" },
    { id: "pb-bias", title: "Lopsided sample", blurb: "A scoop with too many rollers, and what it costs.", emoji: "🪣" },
    { id: "pb-fair", title: "A fair pile", blurb: "Collect what is missing, keep the mix even, score again.", emoji: "🧺" },
    { id: "pb-table", title: "Confusion table", blurb: "Which kinds get mixed up with which.", emoji: "🧮" },
    { id: "pb-pipeline", title: "Pipeline", blurb: "Learn, test, guess: your whole program in three steps.", emoji: "🔁" },
  ],
  chapters: [chapter1, chapter2, chapter3, chapter4],
};
