/**
 * Authoring helpers for the Art Studio course.
 *
 *  - `py` is String.raw: Python source and Python test code go through it untouched.
 *  - `md` is String.raw too, plus `\`` becomes a plain backtick, so lesson prose can contain
 *    inline code without escaping tricks.
 *
 * Neither tag may contain a bare backtick or the two characters `${`.
 *
 * Test code convention: every temporary a test creates starts with an underscore, because tests share
 * one namespace with the learner's program.
 */
export const py = String.raw;

export function md(strings: TemplateStringsArray, ...values: unknown[]): string {
  return String.raw(strings, ...values).replace(/\`/g, "`");
}

/** The provided seeded random number generator (lesson 15). Keep in sync with src/scenes/art-studio/studio.ts. */
export const RNG_CLASS = py`class Rng:
    """A tiny seeded random number generator: the same seed always gives the same numbers."""

    def __init__(self, seed):
        self.state = seed % 4294967296

    def uniform(self):
        """A number from 0 up to (but not including) 1."""
        self.state = (self.state * 1664525 + 1013904223) % 4294967296
        return self.state / 4294967296

    def below(self, n):
        """A whole number from 0 up to n - 1."""
        return int(self.uniform() * n)

    def pick(self, items):
        """One item from a list, chosen by the generator."""
        return items[self.below(len(items))]`;
