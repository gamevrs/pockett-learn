/**
 * Authoring helpers for the Orchard Vision course.
 *
 *  - `py` is String.raw: Python source and Python test code go through it untouched.
 *  - `md` is String.raw too, plus `\`` becomes a plain backtick, so lesson prose can contain
 *    inline code without escaping tricks.
 *
 * Neither tag may contain a bare backtick or the two characters `${`.
 *
 * Test code convention: every temporary a test creates starts with an underscore. Tests share one
 * namespace with the learner's program (and with each other), so `_rows`, `_got`, ... can never
 * overwrite a learner variable such as `X`, `K` or `rows`.
 */
export const py = String.raw;

export function md(strings: TemplateStringsArray, ...values: unknown[]): string {
  return String.raw(strings, ...values).replace(/\\`/g, "`");
}

/**
 * The provided sensor rig: a seeded random number generator and the orchard's measuring machine.
 * It is part of lesson 1's starter AND solution so the learner's file contains it from the start.
 * Keep it in sync with src/scenes/ai-foundations/port.ts (the demo program's twin of this code).
 */
export const SENSOR_RIG = py`FEATURE_NAMES = ["weight", "diameter", "hue", "sugar"]


class Rng:
    """A tiny seeded random number generator: the same seed always gives the same numbers."""

    def __init__(self, seed):
        self.state = seed % 4294967296

    def uniform(self):
        """A number between 0 and 1."""
        self.state = (self.state * 1664525 + 1013904223) % 4294967296
        return self.state / 4294967296

    def normal(self, mean, spread):
        """A bell-curve number: usually near the mean, rarely far from it."""
        total = self.uniform() + self.uniform() + self.uniform() + self.uniform()
        return mean + spread * (total - 2.0) * 1.732

    def below(self, n):
        """A whole number from 0 up to n - 1."""
        return int(self.uniform() * n)


# kind: (how many, diameter in mm, density, hue in degrees, hue spread, sugar shift)
ORCHARD = {
    "apple": (110, 72.0, 4.4e-4, 55.0, 30.0, 0.0),
    "pear": (80, 70.0, 6.4e-4, 62.0, 28.0, -2.0),
    "plum": (50, 52.0, 5.6e-4, 235.0, 55.0, 2.0),
}


def read_sensors(seed=2024):
    """Measure a batch of fruit. Returns one dict per fruit."""
    rng = Rng(seed)
    batch = []
    for kind, (count, diameter, density, hue, hue_spread, shift) in ORCHARD.items():
        for _ in range(count):
            ripe = 1 if rng.uniform() < 0.6 else 0
            width = rng.normal(diameter, 7.0)
            weight = density * width * width * width * rng.normal(1.0, 0.16)
            colour = rng.normal(hue, hue_spread) + (-6 if ripe else 6) * (kind != "plum")
            sugar = rng.normal(12.0 + shift + (2.2 if ripe else -2.2), 1.5)
            price = 0.05 + 0.0028 * weight + 0.03 * sugar + rng.normal(0.0, 0.06)
            batch.append({
                "weight": round(weight, 1),
                "diameter": round(width, 1),
                "hue": round(min(max(colour, 0.0), 359.0)),
                "sugar": round(sugar, 1),
                "kind": kind,
                "ripe": ripe,
                "price": round(price, 2),
            })
    return batch`;
