/**
 * Pure chunking and toy retrieval for the chunking playground. A small bike-shop handbook is
 * split three ways (fixed word windows, whole sentences, by section), and a plain word-overlap
 * score stands in for the retriever, so the *chunking* is what you are really testing.
 */

export const SECTIONS = [
  {
    title: "Returns",
    text: "Customers may return a new bike within 30 days of purchase for a full refund, provided it has not been ridden outdoors. Custom-built frames are excluded from this rule and can only be exchanged. Accessories can be returned within 14 days if the packaging is unopened.",
  },
  {
    title: "Warranty",
    text: "Every frame carries a five-year warranty against cracks and weld failures. The warranty covers the original owner only. Tyres, chains and brake pads are wear items and are not covered.",
  },
  {
    title: "Servicing",
    text: "A basic service takes two working days and costs 45 pounds. Bikes left for more than 30 days after the service is finished are moved to storage, and a storage fee of 2 pounds a day applies.",
  },
];

export interface Word {
  w: string;
  sentence: number;
  section: number;
}

export function wordsOf(): Word[] {
  const out: Word[] = [];
  let s = 0;
  SECTIONS.forEach((sec, si) => {
    for (const sentence of sec.text.split(/(?<=\.)\s+/)) {
      for (const w of sentence.split(/\s+/)) out.push({ w, sentence: s, section: si });
      s++;
    }
  });
  return out;
}

export const WORDS = wordsOf();

export interface Question {
  id: string;
  text: string;
  /** the answer lives in these sentences (inclusive indexes into the whole handbook) */
  from: number;
  to: number;
  /** Why this one is tricky. */
  note: string;
}

export const QUESTIONS: Question[] = [
  { id: "q1", text: "Can I return a custom-built frame for a refund?", from: 0, to: 1, note: "The rule and its exception sit in two neighbouring sentences." },
  { id: "q2", text: "How long is the frame warranty, and who is covered?", from: 3, to: 4, note: "Two sentences again: the length, then who it covers." },
  { id: "q3", text: "How much is the storage fee after a service?", from: 7, to: 7, note: "One sentence, at the very end." },
];

export type ChunkMode = "fixed" | "sentence" | "section";

export interface Chunk {
  /** word index range, end exclusive */
  start: number;
  end: number;
  /** the section a chunk starts in, used as metadata */
  section: number;
  /** how many leading words repeat the previous chunk */
  shared: number;
}

export function chunk(mode: ChunkMode, size: number, overlap: number): Chunk[] {
  const out: Chunk[] = [];
  if (mode === "fixed") {
    const step = Math.max(1, size - overlap);
    for (let s = 0; s < WORDS.length; s += step) {
      const e = Math.min(WORDS.length, s + size);
      out.push({ start: s, end: e, section: WORDS[s].section, shared: out.length ? Math.max(0, out[out.length - 1].end - s) : 0 });
      if (e === WORDS.length) break;
    }
    return out;
  }
  // sentence-aware: pack whole sentences up to `size` words, optionally within one section
  const sentences: { start: number; end: number; section: number }[] = [];
  WORDS.forEach((w, i) => {
    const last = sentences[sentences.length - 1];
    if (last && WORDS[last.start].sentence === w.sentence) last.end = i + 1;
    else sentences.push({ start: i, end: i + 1, section: w.section });
  });
  const n = sentences.length;
  let i = 0;
  let carriedIn = 0;
  while (i < n) {
    let j = i;
    let words = 0;
    while (j < n && (j === i || (words + (sentences[j].end - sentences[j].start) <= size && (mode !== "section" || sentences[j].section === sentences[i].section)))) {
      words += sentences[j].end - sentences[j].start;
      j++;
    }
    out.push({ start: sentences[i].start, end: sentences[j - 1].end, section: sentences[i].section, shared: carriedIn });
    // step back over whole sentences that fit inside the overlap budget, so the next chunk repeats them
    let back = 0;
    let carried = 0;
    if (mode === "sentence" && overlap > 0 && j < n) {
      while (j - back - 1 > i) {
        const len = sentences[j - back - 1].end - sentences[j - back - 1].start;
        if (carried + len > overlap) break;
        carried += len;
        back++;
      }
    }
    carriedIn = carried;
    i = j - back;
  }
  return out;
}

const STOP = new Set("a an the and or of to in on is are was were be can i do does how what who when why for it its my me at as by with from this that there not".split(" "));
const stem = (w: string) => w.replace(/(ing|ed|s)$/, "");
export const tokens = (t: string) =>
  t
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .split(/[\s-]+/)
    .filter((w) => w && !STOP.has(w))
    .map(stem);

export function chunkText(c: Chunk, withTitle: boolean): string {
  const body = WORDS.slice(c.start, c.end)
    .map((w) => w.w)
    .join(" ");
  return withTitle ? `${SECTIONS[c.section].title}. ${body}` : body;
}

export interface Retrieval {
  best: number;
  score: number;
  intact: boolean;
}

export function retrieve(chunks: Chunk[], q: Question, withTitle: boolean): Retrieval {
  const qt = new Set(tokens(q.text));
  let best = 0;
  let bestScore = -1;
  let bestLen = Infinity;
  chunks.forEach((c, i) => {
    const have = new Set(tokens(chunkText(c, withTitle)));
    const score = [...qt].filter((t) => have.has(t)).length;
    const len = c.end - c.start;
    if (score > bestScore || (score === bestScore && len < bestLen)) {
      best = i;
      bestScore = score;
      bestLen = len;
    }
  });
  const c = chunks[best];
  const startW = WORDS.findIndex((w) => w.sentence === q.from);
  let endW = startW;
  WORDS.forEach((w, i) => {
    if (w.sentence <= q.to) endW = i + 1;
  });
  return { best, score: bestScore, intact: c.start <= startW && c.end >= endW };
}
