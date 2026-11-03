/**
 * Art Studio: plain-JS twins of the reference Python solution (used by the demo program on the
 * landing page) plus the small helpers the scene needs to read whatever the learner's code returns.
 *
 * Python's round() rounds halves to the nearest EVEN number, so pyRound does the same; the ports
 * then match the Python bit for bit. Keep the Rng in sync with RNG_CLASS in
 * src/content/projects/art-studio/util.ts.
 */

export type RGB = [number, number, number];
export type Grid = RGB[][];

export function pyRound(x: number): number {
  const f = Math.floor(x);
  const diff = x - f;
  if (diff < 0.5) return f;
  if (diff > 0.5) return f + 1;
  return f % 2 === 0 ? f : f + 1;
}

const clamp255 = (n: number) => Math.max(0, Math.min(255, Math.round(n)));

/** Reads a colour the learner's code produced: [r, g, b] numbers or a "#rrggbb" string. */
export function toColour(v: unknown): RGB | null {
  if (Array.isArray(v) && v.length === 3 && v.every((n) => typeof n === "number" && Number.isFinite(n))) {
    return [clamp255(v[0] as number), clamp255(v[1] as number), clamp255(v[2] as number)];
  }
  if (typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v)) {
    return [parseInt(v.slice(1, 3), 16), parseInt(v.slice(3, 5), 16), parseInt(v.slice(5, 7), 16)];
  }
  return null;
}

/** Reads a grid of colours, capped so a runaway program cannot flood the page. */
export function toGrid(v: unknown, cap = 40): Grid | null {
  if (!Array.isArray(v) || v.length === 0 || v.length > cap) return null;
  const out: Grid = [];
  for (const row of v) {
    if (!Array.isArray(row) || row.length === 0 || row.length > cap) return null;
    const r: RGB[] = [];
    for (const cell of row) r.push(toColour(cell) ?? [90, 90, 96]);
    out.push(r);
  }
  const width = out[0].length;
  return out.every((r) => r.length === width) ? out : null;
}

export function toColourList(v: unknown): RGB[] {
  return Array.isArray(v) ? v.map(toColour).filter((c): c is RGB => c !== null) : [];
}

export function cssColour(c: RGB): string {
  return `rgb(${c[0]} ${c[1]} ${c[2]})`;
}

export function hexOf(c: RGB): string {
  return "#" + c.map((n) => n.toString(16).padStart(2, "0")).join("");
}

/** Black or white, whichever reads better on this colour. */
export function inkOn(c: RGB): string {
  return (c[0] * 299 + c[1] * 587 + c[2] * 114) / 1000 > 140 ? "#111" : "#fff";
}

// ───────────────────────── the shop's defaults ─────────────────────────

export const SHELF: RGB[] = [
  [240, 90, 60],
  [30, 70, 130],
  [250, 215, 80],
  [25, 25, 30],
  [242, 238, 225],
];
export const SHELF_NAMES = ["poppy", "navy", "saffron", "charcoal", "paper"];
export const PALETTE: Record<string, RGB> = {
  poppy: [240, 90, 60],
  navy: [30, 70, 130],
  saffron: [250, 215, 80],
  charcoal: [25, 25, 30],
  paper: [242, 238, 225],
  plum: [142, 68, 173],
};

// ───────────────────────── ports of the reference solution ─────────────────────────

export const tint = (c: RGB, amount = 0.25, target: RGB = [255, 255, 255]): RGB => [
  pyRound(c[0] + (target[0] - c[0]) * amount),
  pyRound(c[1] + (target[1] - c[1]) * amount),
  pyRound(c[2] + (target[2] - c[2]) * amount),
];
export const brightness = (c: RGB) => pyRound((c[0] + c[1] + c[2]) / 3);
export const extremes = (cs: RGB[]): [RGB, RGB] => {
  let dark = cs[0];
  let light = cs[0];
  for (const c of cs) {
    if (brightness(c) < brightness(dark)) dark = c;
    if (brightness(c) > brightness(light)) light = c;
  }
  return [dark, light];
};
export const hexCode = (c: RGB) => hexOf(c);
export const label = (name: string, c: RGB) => name.padEnd(10) + hexCode(c);
export const makeGrid = <T,>(rows: number, cols: number, fill: T): T[][] => Array.from({ length: rows }, () => Array.from({ length: cols }, () => fill));
export const checker = (rows: number, cols: number, a: RGB, b: RGB): Grid => {
  const g = makeGrid(rows, cols, a);
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if ((r + c) % 2 === 1) g[r][c] = b;
  return g;
};
export const uniqueColours = (g: Grid): RGB[] => {
  const seen = new Map<string, RGB>();
  for (const row of g) for (const cell of row) seen.set(cell.join(","), cell);
  return [...seen.values()];
};
export const rowLabels = (names: string[]) => names.map((n, i) => `${i + 1}. ${n}`);
export const legend = (names: string[], cs: RGB[]) => names.slice(0, cs.length).map((n, i) => `${n}: ${hexCode(cs[i])}`);
export const stamp = (t: string, n: number) => t.slice(0, n);
export const tail = (t: string, n: number) => (n <= 0 ? t : t.slice(-n));
export const mirror = (t: string) => [...t].reverse().join("");
export const cleanTitle = (raw: string) => raw.trim().replaceAll("_", " ").toUpperCase();
export const hashtag = (t: string) => "#" + t.toLowerCase().split(/\s+/).filter(Boolean).join("");
export const banner = (text: string, width = 30) => {
  const s = ` ${text} `;
  const pad = Math.max(0, width - s.length);
  // Python's str.center puts the extra fill on the left when the padding is odd and width is odd.
  const left = Math.floor(pad / 2) + (pad & width & 1);
  return "=".repeat(left) + s + "=".repeat(pad - left);
};
export const colourFor = (p: Record<string, RGB>, name: string, fallback: RGB = [128, 128, 128]) => p[name] ?? fallback;
export const paletteLines = (p: Record<string, RGB>) => Object.entries(p).map(([n, c]) => label(n, c));
export const darkNames = (p: Record<string, RGB>, limit = 100) => Object.entries(p).filter(([, c]) => brightness(c) < limit).map(([n]) => n);
export const averageBrightness = (p: Record<string, RGB>) => {
  const v = Object.values(p);
  return pyRound(v.reduce((s, c) => s + brightness(c), 0) / v.length);
};
export const lighterPalette = (p: Record<string, RGB>, amount = 0.3) => Object.fromEntries(Object.entries(p).map(([n, c]) => [n, tint(c, amount)])) as Record<string, RGB>;
export const rankedNames = (p: Record<string, RGB>) =>
  Object.entries(p)
    .map((e, i) => ({ e, i }))
    .sort((a, b) => brightness(a.e[1]) - brightness(b.e[1]) || a.i - b.i)
    .map((x) => x.e[0]);
export const darkestFirst = (cs: RGB[]) =>
  cs
    .map((c, i) => ({ c, i }))
    .sort((a, b) => brightness(a.c) - brightness(b.c) || a.i - b.i)
    .map((x) => x.c);

export class Rng {
  state: number;
  constructor(seed: number) {
    this.state = ((seed % 4294967296) + 4294967296) % 4294967296;
  }
  uniform() {
    this.state = (this.state * 1664525 + 1013904223) % 4294967296;
    return this.state / 4294967296;
  }
  below(n: number) {
    return Math.floor(this.uniform() * n);
  }
  pick<T>(items: T[]): T {
    return items[this.below(items.length)];
  }
}
export const randomPoster = (rows: number, cols: number, cs: RGB[], seed: number): Grid => {
  const rng = new Rng(seed);
  const g: Grid = [];
  for (let r = 0; r < rows; r++) {
    const row: RGB[] = [];
    for (let c = 0; c < cols; c++) row.push(rng.pick(cs));
    g.push(row);
  }
  return g;
};
export const parseColour = (text: string): RGB | null => {
  const parts = text.split(",");
  if (parts.length !== 3) return null;
  const nums = parts.map((p) => (/^\s*[+-]?\d+\s*$/.test(p) ? parseInt(p, 10) : NaN));
  if (nums.some((n) => Number.isNaN(n) || n < 0 || n > 255)) return null;
  return nums as RGB;
};
export const parseSize = (text: string, fallback: [number, number] = [8, 8]): [number, number] => {
  const parts = text.toLowerCase().split("x");
  if (parts.length !== 2) return fallback;
  const nums = parts.map((p) => (/^\s*[+-]?\d+\s*$/.test(p) ? parseInt(p, 10) : NaN));
  if (nums.some((n) => Number.isNaN(n) || n < 1)) return fallback;
  return [nums[0], nums[1]];
};
export const radialGrid = (rows: number, cols: number, cs: RGB[]): Grid => {
  const cr = (rows - 1) / 2;
  const cc = (cols - 1) / 2;
  const g: Grid = [];
  for (let r = 0; r < rows; r++) {
    const row: RGB[] = [];
    for (let c = 0; c < cols; c++) row.push(cs[Math.floor(Math.hypot(r - cr, c - cc)) % cs.length]);
    g.push(row);
  }
  return g;
};
export const posterSummary = (g: Grid) => ({ rows: g.length, cols: g[0].length, inks: uniqueColours(g).length });
