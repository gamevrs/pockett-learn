/**
 * The dish's raw feed, plus a JavaScript port of the finished Python decoder.
 *
 * The port serves two jobs: it is the static stand-in the landing page runs
 * (demo.ts) and the scene's "ground truth" for telemetry that has to exist before the learner has
 * written the matching code (for example the numbers a readout is formatted from).
 * Pure functions, no DOM, no React.
 */
import { PAYLOADS } from "./payloads.ts";

export const STAMP_LEN = 20;
export const NOISE = "~^ \t\r\n";
const BASE_MS = Date.UTC(2087, 2, 14, 2, 17, 45);

export type Kind = "ok" | "corrupt" | "garbled";

export function stampAt(n: number): string {
  return new Date(BASE_MS + n * 3000).toISOString().slice(0, 19) + "Z";
}

/** The n-th transmission of the (endlessly repeating) feed, with its logger stamp. */
export function transmissionAt(n: number): { raw: string; kind: Kind } {
  const p = PAYLOADS[((n % PAYLOADS.length) + PAYLOADS.length) % PAYLOADS.length];
  return { raw: stampAt(n) + p.payload, kind: p.kind };
}

/** Sum of character codes mod 256 as two upper-case hex digits (what the dish's checksum means). */
export function checksumOf(message: string): string {
  let total = 0;
  for (const ch of message) total += ch.codePointAt(0) ?? 0;
  return (total % 256).toString(16).toUpperCase().padStart(2, "0");
}

/** A line typed by a visitor: given a stamp, and a checksum if they left it out. */
export function composeTransmission(n: number, text: string): string {
  let body = text.trim();
  if (!body) return stampAt(n) + "  ~^~ ###  ##  ~^~";
  if (!/#[0-9a-f]{2}\s*$/i.test(body)) {
    const quoted = /"(.*)"/.exec(body);
    if (quoted) body = `${body} #${checksumOf(quoted[1])}`;
  }
  return `${stampAt(n)}  ~^~ ${body} ~^~`;
}

/** A transmission whose message was damaged after the checksum was computed. */
export function corruptTransmission(n: number): string {
  let k = n * 7 + 3;
  while (transmissionAt(k).kind !== "ok") k++;
  const base = transmissionAt(k).raw;
  const m = /"(.*?)"/.exec(base);
  if (!m || !m[1]) return stampAt(n) + base.slice(STAMP_LEN);
  const message = m[1];
  const i = Math.floor(message.length / 2);
  const damaged = message.slice(0, i) + "X" + message.slice(i + 1);
  return stampAt(n) + base.slice(STAMP_LEN).replace(`"${message}"`, `"${damaged}"`);
}

export function jamTransmission(n: number): string {
  return stampAt(n) + "  ^^  x7#q!!  0x00 0x00  ??  ~~ ";
}

// ───────────────────────── JS port of the decoder ─────────────────────────

export interface Ref {
  stamp: string;
  call: string;
  freq: string;
  az: string;
  el: string;
  snr: string;
  message: string;
  checksum: string;
}

export const LINE_RE =
  /^\s*([a-z]{2}-\d{3})\s*@\s*([\d.]+)\s*mhz\s+az=([\d.]+)\s+el=([+-]?[\d.]+)\s+snr=([+-]?[\d.]+)\s*db\s+"(.*?)"\s+#([0-9a-f]{2})\s*$/i;

export function scrub(raw: string): string {
  const payload = raw.slice(STAMP_LEN);
  let a = 0;
  let b = payload.length;
  while (a < b && NOISE.includes(payload[a])) a++;
  while (b > a && NOISE.includes(payload[b - 1])) b--;
  return payload.slice(a, b).split(/\s+/).filter(Boolean).join(" ");
}

export function margins(raw: string): [number, number] {
  const payload = raw.slice(STAMP_LEN);
  let left = 0;
  while (left < payload.length && NOISE.includes(payload[left])) left++;
  let right = 0;
  while (right < payload.length && NOISE.includes(payload[payload.length - 1 - right])) right++;
  return [left, right];
}

export function parseLine(raw: string): Ref | null {
  const m = LINE_RE.exec(scrub(raw));
  if (!m) return null;
  return { stamp: raw.slice(0, STAMP_LEN), call: m[1], freq: m[2], az: m[3], el: m[4], snr: m[5], message: m[6], checksum: m[7] };
}

export interface Rec {
  ok: true;
  stamp: string;
  call: string;
  freq: number;
  az: number;
  el: number;
  snr: number;
  message: string;
  valid: boolean;
}
export interface Failure {
  ok: false;
  error: string;
  raw: string;
}

function toNumber(text: string, name: string, low: number, high: number): number {
  const value = Number(text);
  if (text === "" || Number.isNaN(value)) throw new Error(`${name} is not a number: '${text}'`);
  if (!(value >= low && value <= high)) throw new Error(`${name} out of range: ${value}`);
  return value;
}

export function parseRecord(raw: string): Rec | Failure {
  const f = parseLine(raw);
  if (!f) return { ok: false, error: "unreadable line", raw };
  try {
    const rec: Rec = {
      ok: true,
      stamp: f.stamp,
      call: f.call.toUpperCase(),
      freq: toNumber(f.freq, "freq", 100, 20000),
      az: toNumber(f.az, "az", 0, 360),
      el: toNumber(f.el, "el", -90, 90),
      snr: toNumber(f.snr, "snr", -60, 90),
      message: f.message,
      valid: false,
    };
    rec.valid = checksumOf(rec.message) === f.checksum.toUpperCase();
    return rec;
  } catch (err) {
    return { ok: false, error: (err as Error).message, raw };
  }
}

export const good = (records: (Rec | Failure)[]): Rec[] => records.filter((r): r is Rec => r.ok && r.valid);

const round1 = (x: number) => Math.round(x * 10) / 10;

export function skyPoints(records: (Rec | Failure)[], minSnr = 0) {
  return good(records)
    .filter((r) => r.snr >= minSnr)
    .map((r) => ({ call: r.call, az: r.az, el: r.el, snr: r.snr }));
}

export function strongest(records: (Rec | Failure)[], n = 5): Rec[] {
  return [...good(records)].sort((a, b) => b.snr - a.snr).slice(0, n);
}

export function topSenders(records: (Rec | Failure)[], n = 3): [string, number][] {
  const counts = new Map<string, number>();
  for (const r of good(records)) counts.set(r.call, (counts.get(r.call) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);
}

export function averageSnr(records: (Rec | Failure)[]): Record<string, number> {
  const groups = new Map<string, number[]>();
  for (const r of good(records)) groups.set(r.call, [...(groups.get(r.call) ?? []), r.snr]);
  const out: Record<string, number> = {};
  for (const [call, snrs] of groups) out[call] = round1(snrs.reduce((a, b) => a + b, 0) / snrs.length);
  return out;
}

const STOP_WORDS = new Set(["a", "an", "the", "on", "of", "to", "and", "is", "in"]);

export function hotWords(records: (Rec | Failure)[], n = 5): [string, number][] {
  const counts = new Map<string, number>();
  for (const r of good(records)) {
    for (const w of r.message.toLowerCase().match(/[a-z]+/g) ?? []) {
      if (!STOP_WORDS.has(w)) counts.set(w, (counts.get(w) ?? 0) + 1);
    }
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);
}

export interface Summary {
  total: number;
  decoded: number;
  malformed: number;
  corrupt: number;
  stations: number;
  top_sender: string | null;
  loudest: string | null;
  mean_snr: number;
}

export function summarize(lines: string[]): Summary {
  const records = lines.map(parseRecord);
  const decoded = good(records);
  const malformed = records.filter((r) => !r.ok).length;
  const top = topSenders(records, 1);
  const best = [...decoded].sort((a, b) => b.snr - a.snr)[0];
  return {
    total: records.length,
    decoded: decoded.length,
    malformed,
    corrupt: records.length - decoded.length - malformed,
    stations: new Set(decoded.map((r) => r.call)).size,
    top_sender: top[0]?.[0] ?? null,
    loudest: best?.call ?? null,
    mean_snr: decoded.length ? round1(decoded.reduce((a, r) => a + r.snr, 0) / decoded.length) : 0,
  };
}

export function formatReport(s: Summary): string {
  const rate = s.total ? s.decoded / s.total : 0;
  const text = ` SIGNAL LAB REPORT `;
  const pad = 34 - text.length;
  const left = Math.floor(pad / 2);
  const rows: [string, string | number][] = [
    ["lines", s.total],
    ["decoded", `${s.decoded} (${(rate * 100).toFixed(1)}%)`],
    ["malformed", s.malformed],
    ["corrupt", s.corrupt],
    ["stations", s.stations],
    ["top sender", s.top_sender ?? "-"],
    ["loudest", s.loudest ?? "-"],
    ["mean SNR", `${s.mean_snr >= 0 ? "+" : ""}${s.mean_snr.toFixed(1)} dB`],
  ];
  return [
    "=".repeat(left) + text + "=".repeat(pad - left),
    ...rows.map(([label, value]) => `${String(label).padEnd(11)}: ${value}`),
  ].join("\n");
}

export function readout(call: string, freq: number, snr: number): string {
  const s = (snr >= 0 ? "+" : "-") + Math.abs(snr).toFixed(1);
  return call.padEnd(8) + freq.toFixed(3).padStart(10) + " MHz" + s.padStart(8) + " dB";
}

export function hzText(freq: number): string {
  return `${Math.round(freq * 1_000_000).toLocaleString("en-US")} Hz`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export function prettyStamp(stamp: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}:\d{2}:\d{2})Z$/.exec(stamp);
  if (!m) return stamp;
  return `${m[3]} ${MONTHS[Number(m[2]) - 1] ?? "???"} ${m[1]}, ${m[4]} UTC`;
}

export function splitMessage(clean: string) {
  const q1 = clean.indexOf('"');
  const head = q1 === -1 ? clean : clean.slice(0, q1);
  const rest = q1 === -1 ? "" : clean.slice(q1 + 1);
  const q2 = rest.lastIndexOf('"');
  const message = q2 === -1 ? "" : rest.slice(0, q2);
  const tail = q2 === -1 ? "" : rest.slice(q2 + 1);
  return { call: head.split("@")[0].trim().toUpperCase(), message, checksum: tail.trim().replace(/^#+/, "").toUpperCase() };
}

export function firstTag(message: string): string | null {
  const start = message.indexOf("[");
  if (start === -1) return null;
  const end = message.indexOf("]", start);
  return end === -1 ? null : message.slice(start + 1, end);
}

export const validCall = (t: string) => /^[A-Za-z]{2}-\d{3}$/.test(t);
export const findNumbers = (t: string) => t.match(/[+-]?\d+\.?\d*/g) ?? [];
export const startsWithStamp = (t: string) => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z/.test(t);
export const hasChecksum = (t: string) => /#[0-9A-Fa-f]{2}\s*$/.test(t);

export function parseFields(clean: string) {
  const m = /([a-z]{2}-\d{3})\s*@\s*(\d+(?:\.\d+)?)\s*mhz\s+az=([\d.]+)\s+el=([+-]?[\d.]+)\s+snr=([+-]?[\d.]+)\s*db/i.exec(clean);
  if (!m) return null;
  return { call: m[1], freq: m[2], az: m[3], el: m[4], snr: m[5] };
}

export function messageKind(message: string): string {
  const m = /^(beacon|pulse|telemetry|handoff)\b/i.exec(message);
  return m ? m[1].toLowerCase() : "other";
}

export function tagSpans(message: string): [number, number][] {
  return [...message.matchAll(/\[\w+\]/g)].map((m) => [m.index ?? 0, (m.index ?? 0) + m[0].length]);
}

export const redactCallsigns = (t: string) => t.replace(/\b([A-Za-z]{2})-\d{3}\b/g, "$1-***");
const UNITS: Record<string, string> = { mhz: "MHz", db: "dB" };
export const tidyUnits = (t: string) => t.replace(/(\d+(?:\.\d+)?)\s*(mhz|db)\b/gi, (_m, n: string, u: string) => `${n} ${UNITS[u.toLowerCase()]}`);

export const MAX_PATTERN = 80;
export function search(lines: string[], query: string): { index: number; start: number; end: number }[] | null {
  const q = query.trim();
  if (!q) return [];
  if (q.length > MAX_PATTERN) return null;
  let re: RegExp | null = null;
  if (/[.^$*+?{}[\]\\|()]/.test(q)) {
    try {
      re = new RegExp(q, "i");
    } catch {
      return null;
    }
  }
  const hits: { index: number; start: number; end: number }[] = [];
  lines.forEach((line, index) => {
    let span: [number, number] | null = null;
    if (re) {
      const m = re.exec(line);
      if (m) span = [m.index, m.index + m[0].length];
    } else {
      const s = line.toLowerCase().indexOf(q.toLowerCase());
      if (s !== -1) span = [s, s + q.length];
    }
    if (span) hits.push({ index, start: span[0], end: span[1] });
  });
  return hits;
}
