/**
 * Authoring helpers for the Pebble Beach course (ai-first-steps).
 *
 *  - `py` is String.raw: Python source and Python test code go through it untouched.
 *  - `md` is String.raw too, plus `\`` becomes a plain backtick, so lesson prose can contain inline code.
 *
 * Neither tag may contain a bare backtick or the two characters `${`.
 *
 * Test code convention: every temporary a test creates starts with an underscore. Tests share one
 * namespace with the learner's program (and with each other), so `_got`, `_tiny`, ... can never
 * overwrite a learner variable such as `K` or `train_set`.
 *
 * The data blocks below are PROVIDED code: each one is pasted into a lesson's starter and solution.
 * Keep them in sync with src/scenes/ai-first-steps/demo.ts (the demo program's twin of this data).
 */
export const py = String.raw;

export function md(strings: TemplateStringsArray, ...values: unknown[]): string {
  return String.raw(strings, ...values).replace(/\\`/g, "`");
}

export const KINDS_AND_PEBBLES = py`KINDS = ["skipper", "roller", "sparkler"]

# 40 pebbles Pip measured on the beach. A person checked every kind.
PEBBLES = [
    {"flat": 6, "shine": 2, "kind": "skipper"},
    {"flat": 1, "shine": 2, "kind": "roller"},
    {"flat": 1, "shine": 8, "kind": "sparkler"},
    {"flat": 7, "shine": 1, "kind": "skipper"},
    {"flat": 2, "shine": 1, "kind": "roller"},
    {"flat": 3, "shine": 7, "kind": "sparkler"},
    {"flat": 8, "shine": 3, "kind": "skipper"},
    {"flat": 3, "shine": 3, "kind": "roller"},
    {"flat": 5, "shine": 9, "kind": "sparkler"},
    {"flat": 9, "shine": 2, "kind": "skipper"},
    {"flat": 2, "shine": 4, "kind": "roller"},
    {"flat": 7, "shine": 8, "kind": "sparkler"},
    {"flat": 7, "shine": 4, "kind": "skipper"},
    {"flat": 1, "shine": 5, "kind": "roller"},
    {"flat": 9, "shine": 7, "kind": "sparkler"},
    {"flat": 8, "shine": 1, "kind": "skipper"},
    {"flat": 4, "shine": 2, "kind": "roller"},
    {"flat": 2, "shine": 6, "kind": "sparkler"},
    {"flat": 6, "shine": 4, "kind": "skipper"},
    {"flat": 3, "shine": 1, "kind": "roller"},
    {"flat": 4, "shine": 8, "kind": "sparkler"},
    {"flat": 9, "shine": 4, "kind": "skipper"},
    {"flat": 2, "shine": 3, "kind": "roller"},
    {"flat": 6, "shine": 6, "kind": "sparkler"},
    {"flat": 7, "shine": 2, "kind": "skipper"},
    {"flat": 4, "shine": 4, "kind": "roller"},
    {"flat": 8, "shine": 9, "kind": "sparkler"},
    {"flat": 8, "shine": 5, "kind": "skipper"},
    {"flat": 1, "shine": 3, "kind": "roller"},
    {"flat": 5, "shine": 7, "kind": "sparkler"},
    {"flat": 6, "shine": 3, "kind": "skipper"},
    {"flat": 3, "shine": 5, "kind": "roller"},
    {"flat": 9, "shine": 9, "kind": "sparkler"},
    {"flat": 9, "shine": 1, "kind": "skipper"},
    {"flat": 2, "shine": 2, "kind": "roller"},
    {"flat": 1, "shine": 6, "kind": "sparkler"},
    {"flat": 5, "shine": 4, "kind": "skipper"},
    {"flat": 5, "shine": 1, "kind": "roller"},
    {"flat": 7, "shine": 6, "kind": "sparkler"},
    {"flat": 4, "shine": 3, "kind": "skipper"},
]`;

export const BASKET_BLOCK = py`# A basket of 12 fresh pebbles. We know the true kind of each one, but Pip has never seen them.
BASKET = [
    {"flat": 3, "shine": 4, "kind": "roller"},
    {"flat": 1, "shine": 1, "kind": "roller"},
    {"flat": 2, "shine": 5, "kind": "roller"},
    {"flat": 4, "shine": 5, "kind": "roller"},
    {"flat": 9, "shine": 3, "kind": "skipper"},
    {"flat": 6, "shine": 1, "kind": "skipper"},
    {"flat": 8, "shine": 4, "kind": "skipper"},
    {"flat": 7, "shine": 3, "kind": "skipper"},
    {"flat": 2, "shine": 7, "kind": "sparkler"},
    {"flat": 6, "shine": 8, "kind": "sparkler"},
    {"flat": 8, "shine": 8, "kind": "sparkler"},
    {"flat": 4, "shine": 6, "kind": "sparkler"},
]`;

export const RNG_BLOCK = py`class Rng:
    """A dice machine. The same seed always gives the same rolls."""

    def __init__(self, seed):
        self.state = seed % 4294967296

    def below(self, n):
        """Roll a whole number from 0 up to n - 1."""
        self.state = (self.state * 1664525 + 1013904223) % 4294967296
        return int(self.state / 4294967296 * n)`;

export const COVE_BLOCK = py`# Pip scooped these 18 pebbles from the rocky north cove.
COVE = [
    {"flat": 1, "shine": 1, "kind": "roller"},
    {"flat": 2, "shine": 2, "kind": "roller"},
    {"flat": 3, "shine": 2, "kind": "roller"},
    {"flat": 1, "shine": 4, "kind": "roller"},
    {"flat": 2, "shine": 5, "kind": "roller"},
    {"flat": 3, "shine": 4, "kind": "roller"},
    {"flat": 4, "shine": 1, "kind": "roller"},
    {"flat": 1, "shine": 3, "kind": "roller"},
    {"flat": 2, "shine": 3, "kind": "roller"},
    {"flat": 5, "shine": 2, "kind": "roller"},
    {"flat": 3, "shine": 3, "kind": "roller"},
    {"flat": 1, "shine": 2, "kind": "roller"},
    {"flat": 2, "shine": 1, "kind": "roller"},
    {"flat": 4, "shine": 4, "kind": "roller"},
    {"flat": 7, "shine": 2, "kind": "skipper"},
    {"flat": 8, "shine": 4, "kind": "skipper"},
    {"flat": 9, "shine": 3, "kind": "skipper"},
    {"flat": 6, "shine": 7, "kind": "sparkler"},
]`;

export const EXTRA_BLOCK = py`# Pip then walked to the sandy south shore and scooped these 11 as well.
EXTRA = [
    {"flat": 6, "shine": 5, "kind": "skipper"},
    {"flat": 9, "shine": 5, "kind": "skipper"},
    {"flat": 8, "shine": 2, "kind": "skipper"},
    {"flat": 7, "shine": 5, "kind": "skipper"},
    {"flat": 5, "shine": 5, "kind": "skipper"},
    {"flat": 3, "shine": 9, "kind": "sparkler"},
    {"flat": 5, "shine": 8, "kind": "sparkler"},
    {"flat": 7, "shine": 7, "kind": "sparkler"},
    {"flat": 1, "shine": 9, "kind": "sparkler"},
    {"flat": 6, "shine": 9, "kind": "sparkler"},
    {"flat": 2, "shine": 8, "kind": "sparkler"},
]`;

