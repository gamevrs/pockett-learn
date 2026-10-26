/**
 * Cargo Control: the crates. Pure data and helpers (no DOM, no React), so the scene, the demo
 * program and any test can share them.
 *
 * Every well-formed container ID below carries a correct ISO 6346 check digit.
 */

export interface Crate {
  /** Unique within one scene run. */
  id: number;
  /** Short caption shown under the crate, e.g. "overweight". */
  label: string;
  /** The manifest text exactly as it arrives at the gate. */
  raw: string;
  kind: "stream" | "chaos" | "own";
}

export type RawCrate = Pick<Crate, "label" | "raw">;

// ───────────────────────── the daily stream ─────────────────────────

interface Manifest {
  container_id: string;
  owner: string;
  contact: string;
  weight_kg: unknown;
  category: string;
  pieces: number;
  route: { origin: string; destination: string };
  customs?: { cleared: boolean };
}

function manifest(over: Partial<Manifest> = {}): Manifest {
  return {
    container_id: "CSQU3054383",
    owner: "Northwind Freight",
    contact: "dock@northwind.example",
    weight_kg: 18250.5,
    category: "general",
    pieces: 40,
    route: { origin: "Hamburg", destination: "Rotterdam" },
    customs: { cleared: true },
    ...over,
  };
}

function without<T extends object>(obj: T, key: keyof T): Partial<T> {
  const copy = { ...obj };
  delete copy[key];
  return copy;
}

const json = (v: unknown) => JSON.stringify(v);

/** A mixed shift at the gate: good crates, policy holds and every flavour of broken manifest. */
export const STREAM: RawCrate[] = [
  { label: "clean", raw: json(manifest()) },
  { label: "overweight", raw: json(manifest({ container_id: "MSKU3395635", owner: "Maersk Line", contact: "ops@maersk.example", weight_kg: 31200, pieces: 12 })) },
  { label: "no weight", raw: json(without(manifest({ container_id: "TGHU1581761", owner: "Textile Group" }), "weight_kg")) },
  { label: "weight is text", raw: json(manifest({ container_id: "HLXU4140023", owner: "Hapag Haulage", contact: "dispatch@hapag.example", weight_kg: "heavy" })) },
  { label: "refrigerated", raw: json(manifest({ container_id: "OOLU6825541", owner: "Orient Cold Chain", contact: "cold@oocl.example", weight_kg: 12400, category: "refrigerated", pieces: 220, route: { origin: "Busan", destination: "Antwerp" } })) },
  {
    label: "trailing comma",
    raw: `{
  "container_id": "HAPU0987029",
  "owner": "Harbour Lines",
  "weight_kg": 14200,
}`,
  },
  { label: "customs hold", raw: json(manifest({ container_id: "ZIMU0506317", owner: "Zim Shipping", contact: "gate@zim.example", weight_kg: 9800, customs: { cleared: false } })) },
  { label: "typo in ID", raw: json(manifest({ container_id: "CSQU3054384", owner: "Coastal Supply" })) },
  { label: "bulk", raw: json(manifest({ container_id: "MAEU0759545", owner: "Maersk Bulk", contact: "bulk@maersk.example", weight_kg: 22800, category: "bulk", pieces: 1 })) },
  { label: "negative weight", raw: json(manifest({ container_id: "CMAU8611680", owner: "CMA Logistics", contact: "ops@cma.example", weight_kg: -50 })) },
  { label: "single quotes", raw: `{'container_id': 'ONEU3834528', 'owner': 'Orchid Line', 'weight_kg': 9100}` },
  { label: "bad email, bad category", raw: json(manifest({ container_id: "EGHU5619135", owner: "Evergreen", contact: "not-an-email", category: "toys", weight_kg: 7300 })) },
  { label: "no customs form", raw: json(without(manifest({ container_id: "YMLU6110971", owner: "Yellow Mast", contact: "ops@yml.example", weight_kg: 11800 }), "customs")) },
  { label: "not an object", raw: `["MSKU3395635", 12000]` },
  { label: "hazardous", raw: json(manifest({ container_id: "TGHU1581761", owner: "Chemline", contact: "safety@chemline.example", weight_kg: 8100, category: "hazardous", pieces: 60, route: { origin: "Antwerp", destination: "Hamburg" } })) },
  { label: "weight is null", raw: json(manifest({ container_id: "HLXU4140023", owner: "Hapag Haulage", weight_kg: null })) },
  {
    label: "cut off mid-line",
    raw: `{
  "container_id": "YMLU6110971",
  "owner": "Yellow Mast Lines",
  "contact": "ops@yml.exa`,
  },
  { label: "text weight", raw: json(manifest({ container_id: "CSQU3054383", owner: "Northwind Freight", weight_kg: " 940 ", pieces: 3 })) },
  { label: "zero pieces", raw: json(manifest({ container_id: "MSKU3395635", owner: "Maersk Line", contact: "ops@maersk.example", weight_kg: 5000, pieces: 0 })) },
  { label: "clean", raw: json(manifest({ container_id: "ZIMU0506317", owner: "Zim Shipping", contact: "gate@zim.example", weight_kg: 15400, pieces: 28, route: { origin: "Gdansk", destination: "Felixstowe" } })) },
];

/** A few ready-made manifests for the "send your own" box. */
export const SAMPLE_OWN: { label: string; raw: string }[] = [
  { label: "Clean crate", raw: JSON.stringify(manifest(), null, 2) },
  { label: "Overweight", raw: JSON.stringify(manifest({ weight_kg: 33333 }), null, 2) },
  { label: "Broken JSON", raw: `{\n  "container_id": "CSQU3054383",\n  "weight_kg": 18250.5\n  "owner": "Northwind"\n}` },
];

// ───────────────────────── chaos ─────────────────────────

/** Small deterministic generator, so a chaos run is reproducible for a given seed. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const JUNK: unknown[] = [null, true, false, [], {}, "x", "", "  ", 0, -1, 1e308, [1, 2, 3], { a: 1 }, "NaN", "12,5", 9007199254740993];
const FIELDS = ["container_id", "owner", "contact", "weight_kg", "category", "pieces", "route", "customs"] as const;

/** Hand-made nasties that exercise parser and recursion limits as well as the validators. */
const NASTY: RawCrate[] = [
  { label: "empty text", raw: "" },
  { label: "just {", raw: "{" },
  { label: "null", raw: "null" },
  { label: "a number", raw: "42" },
  { label: "a string", raw: `"CSQU3054383"` },
  { label: "empty object", raw: "{}" },
  { label: "empty list", raw: "[]" },
  { label: "NaN weight", raw: `{"container_id": "CSQU3054383", "owner": "N", "contact": "a@b.example", "weight_kg": NaN, "category": "bulk", "pieces": 1}` },
  { label: "1e999 weight", raw: `{"container_id": "CSQU3054383", "owner": "N", "contact": "a@b.example", "weight_kg": 1e999, "category": "bulk", "pieces": 1}` },
  { label: "400-digit weight", raw: `{"container_id": "CSQU3054383", "owner": "N", "contact": "a@b.example", "weight_kg": 1${"0".repeat(400)}, "category": "bulk", "pieces": 1}` },
  { label: "5000-digit weight", raw: `{"weight_kg": ${"9".repeat(5000)}}` },
  { label: "HTML error page", raw: "<html><body>502 Bad Gateway</body></html>" },
  { label: "control characters", raw: "\u0000\u0001\u0002" },
  { label: "20000 open brackets", raw: "[".repeat(20000) },
  { label: "200 nested objects", raw: `${'{"a": '.repeat(200)}1${"}".repeat(200)}` },
  { label: "100 kB of x", raw: "x".repeat(100000) },
  { label: "emoji owner", raw: json(manifest({ owner: "\u{1F4E6}\u{1F4E6}", container_id: "‮CSQU3054383" })) },
  { label: "customs is a list", raw: json(manifest({ customs: [] as unknown as { cleared: boolean } })) },
  { label: "weight is a list", raw: json(manifest({ weight_kg: [[[]]] })) },
];

function mutate(rand: () => number): RawCrate {
  const pick = <T>(list: readonly T[]) => list[Math.floor(rand() * list.length)];
  const good = manifest({ container_id: pick(["CSQU3054383", "MSKU3395635", "TGHU1581761", "ZIMU0506317", "OOLU6825541"]) });
  const kind = Math.floor(rand() * 5);
  if (kind === 0) {
    const field = pick(FIELDS);
    return { label: `dropped ${field}`, raw: json(without(good, field)) };
  }
  if (kind === 1) {
    const field = pick(FIELDS);
    const value = pick(JUNK);
    return { label: `${field} = ${JSON.stringify(value) ?? "?"}`.slice(0, 34), raw: json({ ...good, [field]: value }) };
  }
  if (kind === 2) {
    const text = json(good);
    const cut = 8 + Math.floor(rand() * (text.length - 12));
    return { label: "cut off", raw: text.slice(0, cut) };
  }
  if (kind === 3) {
    const text = json(good);
    const at = 1 + Math.floor(rand() * (text.length - 2));
    return { label: "corrupted byte", raw: text.slice(0, at) + pick(["}", ",", "'", "]", "\\", ":"]) + text.slice(at + 1) };
  }
  return { label: "shuffled types", raw: json(Object.fromEntries(FIELDS.map((f) => [f, pick(JUNK)]))) };
}

/** `count` nasty crates: some hand-made, the rest random mutations of a good manifest. */
export function chaosBatch(seed: number, count: number): RawCrate[] {
  const rand = mulberry32(seed);
  const out: RawCrate[] = [];
  const nasty = [...NASTY];
  for (let i = 0; i < count; i++) {
    if (i % 3 === 0 && nasty.length > 0) out.push(nasty.splice(Math.floor(rand() * nasty.length), 1)[0]);
    else out.push(mutate(rand));
  }
  return out;
}

// ───────────────────────── display helpers ─────────────────────────

/** Largest manifest text we try to lay out; anything longer is shown clipped. */
const PRETTY_LIMIT = 4000;
const CLIP = 480;

/** Re-indents valid JSON without touching its tokens (so numbers print exactly as sent). */
function indentJson(raw: string): string | null {
  let out = "";
  let depth = 0;
  let i = 0;
  const pad = (d: number) => "  ".repeat(d);
  while (i < raw.length) {
    const c = raw[i];
    if (c === '"') {
      let j = i + 1;
      while (j < raw.length && raw[j] !== '"') j += raw[j] === "\\" ? 2 : 1;
      out += raw.slice(i, j + 1);
      i = j + 1;
      continue;
    }
    if (c === "{" || c === "[") {
      let k = i + 1;
      while (k < raw.length && /\s/.test(raw[k])) k++;
      const closer = c === "{" ? "}" : "]";
      if (raw[k] === closer) {
        out += c + closer;
        i = k + 1;
        continue;
      }
      depth++;
      if (depth > 24) return null;
      out += c + "\n" + pad(depth);
    } else if (c === "}" || c === "]") {
      depth--;
      out += "\n" + pad(depth) + c;
    } else if (c === ",") out += ",\n" + pad(depth);
    else if (c === ":") out += ": ";
    else if (!/\s/.test(c)) out += c;
    i++;
  }
  return out;
}

export interface ManifestView {
  lines: string[];
  /** True when the text parsed as JSON and was re-indented. */
  pretty: boolean;
  /** True when the text was longer than what we show. */
  clipped: boolean;
  chars: number;
}

/** How a manifest is laid out in the viewer: pretty-printed when valid, as-sent when not. */
export function viewManifest(raw: string): ManifestView {
  const chars = raw.length;
  let text = raw;
  let pretty = false;
  if (chars <= PRETTY_LIMIT) {
    try {
      JSON.parse(raw);
      const indented = indentJson(raw);
      if (indented !== null) {
        text = indented;
        pretty = true;
      }
    } catch {
      /* not JSON: show as sent */
    }
  }
  const clipped = text.length > CLIP;
  if (clipped) text = text.slice(0, CLIP);
  const lines = text.split("\n").slice(0, 16);
  return { lines, pretty, clipped: clipped || text.split("\n").length > 16, chars };
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Index of the line holding the key at `path` (e.g. ["route", "origin"]); the deepest hit, or -1. */
export function findKeyLine(lines: string[], path: string[]): number {
  let found = -1;
  let from = 0;
  for (let depth = 0; depth < path.length; depth++) {
    const re = new RegExp(`^${" ".repeat(2 * (depth + 1))}"${escapeRe(path[depth])}"\\s*:`);
    let hit = -1;
    for (let i = from; i < lines.length; i++) {
      if (re.test(lines[i])) {
        hit = i;
        break;
      }
    }
    if (hit < 0) return depth === path.length - 1 ? -1 : found;
    found = hit;
    from = hit + 1;
  }
  return found;
}

export const shortId = (v: unknown): string => {
  if (typeof v !== "string" || v.length === 0) return "?";
  return v.length > 11 ? v.slice(0, 10) + "…" : v;
};
