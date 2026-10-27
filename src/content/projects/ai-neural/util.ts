/**
 * Authoring helpers for the Glyph Greenhouse course.
 *
 *  - `py` is String.raw: Python source and Python test code go through it untouched.
 *  - `md` is String.raw too, plus `\`` becomes a plain backtick, so lesson prose can contain
 *    inline code without escaping tricks.
 *
 * Neither tag may contain a bare backtick or the two characters `${`.
 *
 * Test code convention: every temporary a test creates starts with an underscore. Tests share one
 * namespace with the learner's program (and with each other), so `_x`, `_got`, ... can never
 * overwrite a learner variable such as `params`, `X_train` or `history_full`.
 */
export const py = String.raw;

export function md(strings: TemplateStringsArray, ...values: unknown[]): string {
  return String.raw(strings, ...values).replace(/\\`/g, "`");
}

/**
 * The provided glyph generator: hand-designed pen strokes for the digits 0 to 9, drawn onto a small
 * grid with seeded wobble, tilt, size, shift, thickness and noise. It is part of lesson 1's starter
 * AND solution so the learner's file contains it from the start, and every picture in the course is
 * reproducible from its seed. The dataset is original: nothing here is a published digit set.
 *
 * Keep it in sync with scripts/gen-demo-ai-neural.mjs (which snapshots the finished program for the
 * landing page) and with the reference program in the scratchpad: any change here changes every
 * number in the course.
 */
export const GLYPH_KIT = py`import numpy as np

SIZE = 10  # every picture is SIZE x SIZE pixels


def arc(cx, cy, rx, ry, start, stop, steps):
    """Points along an ellipse arc (angles in degrees, y grows downwards)."""
    angles = np.radians(np.linspace(start, stop, steps))
    return [(cx + rx * np.cos(a), cy + ry * np.sin(a)) for a in angles]


# Hand-designed pen strokes on a unit square (x to the right, y downwards).
# Each digit is a list of strokes, each stroke a list of (x, y) points joined by straight lines.
STROKES = {
    0: [arc(0.5, 0.5, 0.26, 0.38, 0, 360, 13)],
    1: [[(0.36, 0.3), (0.52, 0.12), (0.52, 0.9)]],
    2: [arc(0.5, 0.32, 0.27, 0.21, 190, 400, 8) + [(0.24, 0.88), (0.78, 0.88)]],
    3: [arc(0.48, 0.3, 0.26, 0.19, 200, 450, 7), arc(0.48, 0.69, 0.3, 0.21, 270, 520, 8)],
    4: [[(0.66, 0.9), (0.66, 0.1), (0.2, 0.64), (0.84, 0.64)]],
    5: [[(0.74, 0.12), (0.34, 0.12), (0.31, 0.46)] + arc(0.47, 0.65, 0.3, 0.24, -105, 150, 8)],
    6: [[(0.68, 0.1), (0.45, 0.2), (0.31, 0.45), (0.29, 0.68)], arc(0.5, 0.68, 0.22, 0.2, 0, 360, 11)],
    7: [[(0.2, 0.14), (0.8, 0.14), (0.42, 0.9)]],
    8: [arc(0.5, 0.3, 0.2, 0.18, 0, 360, 10), arc(0.5, 0.69, 0.25, 0.21, 0, 360, 11)],
    9: [arc(0.5, 0.32, 0.23, 0.2, 0, 360, 10), [(0.73, 0.32), (0.7, 0.62), (0.4, 0.9)]],
}


def make_glyphs(count, seed):
    """Draw count handwritten-looking digits. Returns (images, labels):
    images has shape (count, SIZE, SIZE) with whole numbers 0 (blank paper) to 255 (full ink),
    labels has shape (count,) with the digit each picture shows. Same seed, same pictures."""
    rng = np.random.RandomState(seed)
    labels = rng.permutation(np.arange(count) % 10)
    centres = (np.arange(SIZE) + 0.5) / SIZE
    gx, gy = np.meshgrid(centres, centres)
    pixels = np.stack([gx.ravel(), gy.ravel()], axis=1)  # the centre of every pixel
    ink = np.zeros((count, SIZE * SIZE))
    for digit in range(10):
        rows = np.where(labels == digit)[0]
        m = len(rows)
        points, first, second = [], [], []
        for stroke in STROKES[digit]:
            base = len(points)
            points.extend(stroke)
            first.extend(range(base, base + len(stroke) - 1))
            second.extend(range(base + 1, base + len(stroke)))
        # every writer wobbles each point a little, then tilts, scales, slants and shifts the whole digit
        pts = np.array(points)[None, :, :] + rng.normal(0, 0.034, (m, len(points), 2))
        tilt = rng.uniform(-0.25, 0.25, m)
        size = rng.uniform(0.8, 1.0, m)
        slant = rng.uniform(-0.18, 0.18, m)
        cos, sin = np.cos(tilt) * size, np.sin(tilt) * size
        turn = np.stack([np.stack([cos, -sin + slant], 1), np.stack([sin, cos], 1)], 1)
        shift = rng.uniform(-0.07, 0.07, (m, 1, 2))
        pts = (pts - 0.5) @ turn.transpose(0, 2, 1) + 0.5 + shift
        # distance from every pixel centre to the nearest pen segment, then soft ink around it
        p0 = pts[:, first][:, :, None, :]
        p1 = pts[:, second][:, :, None, :]
        d = p1 - p0
        t = np.clip(((pixels[None, None] - p0) * d).sum(-1) / ((d * d).sum(-1) + 1e-9), 0, 1)
        dist = np.sqrt(((pixels[None, None] - (p0 + t[..., None] * d)) ** 2).sum(-1)).min(axis=1)
        half = rng.uniform(0.045, 0.085, (m, 1))  # pen thickness
        ink[rows] = np.clip((half - dist) / 0.06 + 0.5, 0, 1) * rng.uniform(0.7, 1.0, (m, 1))
    ink = ink + rng.normal(0, 0.16, ink.shape)  # paper grain
    images = (np.clip(ink, 0, 1) * 255).round().astype(np.uint8)
    return images.reshape(count, SIZE, SIZE), labels`;
