/**
 * The Signal Lab radio console, as a plain (non-React) store.
 *
 * It owns the incoming stream and every call into the learner's program. All hook calls happen
 * here, from timers and event handlers, never during React rendering (a failing hook updates
 * `program.lastError`, which other components subscribe to). The React scene subscribes with
 * useSyncExternalStore and only draws the immutable `View` snapshots this store publishes.
 *
 * Everything read from the learner's program is treated as untrusted: wrong types, missing keys
 * and nulls all degrade to "nothing to show", never to an exception.
 */
import type { ProgramHandle } from "@/engine/program";
import { composeTransmission, corruptTransmission, jamTransmission, scrub as refScrub, transmissionAt } from "./feed.ts";

export const MAX_LINES = 48;
const CONSOLE_ROWS = 10;
const SEED_LINES = 9;

// ───────────────────────── view types ─────────────────────────

export interface ConsoleRow {
  id: number;
  raw: string;
  stamp: { date: string; time: string } | null;
  clean: string | null;
  margins: [number, number] | null;
}
export interface DecodeRow {
  id: number;
  call: string;
  message: string;
  checksum: string;
  beacon: boolean | null;
  tag: string | null;
}
export interface ReadoutRow {
  id: number;
  text: string | null;
  hz: string | null;
  pretty: string | null;
  sum: string | null;
  claimed: string | null;
}
export interface ScanRow {
  id: number;
  clean: string;
  numbers: string[];
  stampOk: boolean | null;
  callOk: boolean | null;
  chkOk: boolean | null;
}
export interface FieldRow {
  id: number;
  clean: string;
  fields: Record<string, string> | null;
  message: string;
  kind: string | null;
  spans: [number, number][];
}
export interface ReleaseRow {
  id: number;
  clean: string;
  released: string | null;
}
export interface RecordsRow {
  id: number;
  raw: string;
  parsed: Record<string, string> | null;
}
export interface AlertRow {
  id: number;
  level: "bad" | "corrupt";
  reason: string;
  stamp: string;
  excerpt: string;
}
export interface SearchHit {
  id: number;
  text: string;
  start: number;
  end: number;
}
export interface SearchView {
  query: string;
  state: "idle" | "ok" | "invalid";
  hits: SearchHit[];
  scanned: number;
}
export interface SkyPoint {
  call: string;
  az: number;
  el: number;
  snr: number;
}
export interface RankRow {
  call: string;
  snr: number;
  message: string;
  stamp: string;
}
export interface Leaderboard {
  senders: [string, number][];
  avg: Record<string, number>;
  words: [string, number][];
}
export interface ReportView {
  text: string;
  total: number;
  decoded: number;
  malformed: number;
  corrupt: number;
}

export interface View {
  running: boolean;
  received: number;
  rows: ConsoleRow[];
  decode: DecodeRow[];
  readout: ReadoutRow[];
  scan: ScanRow[];
  fields: FieldRow[];
  release: ReleaseRow[];
  records: RecordsRow[];
  search: SearchView | null;
  alerts: AlertRow[];
  alertTotal: number;
  sky: SkyPoint[] | null;
  rank: RankRow[] | null;
  board: Leaderboard | null;
  report: ReportView | null;
  /** feature id -> the learner function that feature still needs */
  missing: Record<string, string>;
  minSnr: number;
  query: string;
}

export const EMPTY_VIEW: View = {
  running: true,
  received: 0,
  rows: [],
  decode: [],
  readout: [],
  scan: [],
  fields: [],
  release: [],
  records: [],
  search: null,
  alerts: [],
  alertTotal: 0,
  sky: null,
  rank: null,
  board: null,
  report: null,
  missing: {},
  minSnr: 0,
  query: "",
};

// ───────────────────────── sanitising helpers ─────────────────────────

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => !!v && typeof v === "object" && !Array.isArray(v);
const asStr = (v: unknown): string | null => (typeof v === "string" ? v : null);
const asNum = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const asBool = (v: unknown): boolean | null => (typeof v === "boolean" ? v : null);

function strDict(v: unknown): Record<string, string> | null {
  if (!isObj(v)) return null;
  const out: Record<string, string> = {};
  for (const [k, val] of Object.entries(v)) if (typeof val === "string") out[k] = val;
  return out;
}

function pairList(v: unknown): [string, number][] {
  if (!Array.isArray(v)) return [];
  const out: [string, number][] = [];
  for (const item of v) {
    if (Array.isArray(item) && typeof item[0] === "string" && typeof item[1] === "number") out.push([item[0], item[1]]);
  }
  return out;
}

function spanList(v: unknown): [number, number][] {
  if (!Array.isArray(v)) return [];
  const out: [number, number][] = [];
  for (const item of v) {
    if (Array.isArray(item) && typeof item[0] === "number" && typeof item[1] === "number") out.push([item[0], item[1]]);
  }
  return out;
}

const MISS = Symbol("failed");

/** Fields of a good record the console needs; anything off-shape makes the record unusable. */
function toRank(v: unknown): RankRow | null {
  if (!isObj(v)) return null;
  const call = asStr(v.call);
  const snr = asNum(v.snr);
  if (call === null || snr === null) return null;
  return { call, snr, message: asStr(v.message) ?? "", stamp: asStr(v.stamp) ?? "" };
}

// ───────────────────────── the store ─────────────────────────

interface Line {
  id: number;
  raw: string;
}

export class Lab {
  private listeners = new Set<() => void>();
  private snapshot: View = EMPTY_VIEW;
  private program: ProgramHandle | null = null;
  private unlocked: ReadonlySet<string> = new Set();
  private lines: Line[] = [];
  private nextId = 0;
  private cursor = 0;
  private running = true;
  private visible = true;
  private query = "";
  private minSnr = 0;
  private cache = new Map<string, unknown>();
  private reassert: (() => void) | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private demoStep = 0;

  constructor() {
    for (let i = 0; i < SEED_LINES; i++) this.push(transmissionAt(this.cursor++).raw);
    this.snapshot = this.build();
  }

  // ----- external-store plumbing -----
  subscribe = (cb: () => void) => {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  };
  getSnapshot = () => this.snapshot;
  getServerSnapshot = () => EMPTY_VIEW;
  private emit() {
    this.snapshot = this.build();
    this.listeners.forEach((l) => l());
  }

  // ----- inputs from the scene -----
  configure(program: ProgramHandle | null, unlocked: ReadonlySet<string>) {
    if (program === this.program && unlocked === this.unlocked) return;
    if (program !== this.program) this.cache.clear();
    this.program = program;
    this.unlocked = unlocked;
    this.emit();
  }

  start(periodMs: number) {
    this.stop();
    this.timer = setInterval(() => this.tick(), periodMs);
  }
  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }
  setVisible(v: boolean) {
    this.visible = v;
  }
  setRunning(v: boolean) {
    this.running = v;
    this.emit();
  }
  setQuery(q: string) {
    this.query = q.slice(0, 120);
    this.reassert = null;
    this.snapshot = { ...this.snapshot, query: this.query, search: this.buildSearch(this.missingNow()) };
    this.flush();
    this.listeners.forEach((l) => l());
  }
  setMinSnr(v: number) {
    this.minSnr = v;
    this.emit();
  }
  transmit(text: string) {
    this.push(composeTransmission(this.cursorStamp(), text));
    this.emit();
  }
  jam() {
    this.push(jamTransmission(this.cursorStamp()));
    this.emit();
  }
  corrupt() {
    this.push(corruptTransmission(this.cursorStamp()));
    this.emit();
  }
  /** Landing-page mode: type a few searches by itself. */
  demoQuery() {
    const queries = ["beacon", "[a-z]{2}-\\d{3}", "relay|ping", "\\[urgent\\]", ""];
    this.setQuery(queries[this.demoStep++ % queries.length]);
  }

  /** Re-raise the last failing hook so its error message is the one left on screen. */
  private flush() {
    const again = this.reassert as (() => void) | null;
    again?.();
  }

  private cursorStamp() {
    return this.nextId;
  }

  private tick() {
    if (!this.running || !this.visible) return;
    this.push(transmissionAt(this.cursor++).raw);
    this.emit();
  }

  private push(raw: string) {
    this.lines.push({ id: this.nextId++, raw });
    if (this.lines.length > MAX_LINES) this.lines.shift();
    if (this.cache.size > 2400) {
      const live = new Set(this.lines.map((l) => l.raw));
      for (const key of [...this.cache.keys()]) if (!live.has(key.slice(key.indexOf("|") + 1))) this.cache.delete(key);
    }
  }

  // ----- calling the learner's code -----
  private on(id: string) {
    return !!this.program && this.unlocked.has(id);
  }
  private has(name: string) {
    return !!this.program && this.program.hasHook(name);
  }
  private call(name: string, ...args: unknown[]): unknown {
    const p = this.program;
    if (!p || !p.hasHook(name)) return MISS;
    const v = p.call<unknown>(name, ...args);
    if (v === undefined) {
      this.reassert = () => void p.call(name, ...args);
      return MISS;
    }
    return v;
  }
  /** Per-line memo: a hook runs once per (feature, raw line) for the life of a program. */
  private memo<T>(feature: string, raw: string, fn: () => unknown, pick: (v: unknown) => T | null): T | null {
    const key = `${feature}|${raw}`;
    let v: unknown;
    if (this.cache.has(key)) v = this.cache.get(key);
    else {
      v = fn();
      this.cache.set(key, v);
    }
    return v === MISS ? null : pick(v);
  }
  private cleanOf(raw: string): string {
    if (this.has("scrub")) {
      const got = this.memo("scrub", raw, () => this.call("scrub", raw), asStr);
      if (got !== null) return got;
    }
    return refScrub(raw);
  }
  private record(raw: string): Obj | null {
    return this.memo("record", raw, () => this.call("parse_record", raw), (v) => (isObj(v) ? v : null));
  }

  private missingNow(): Record<string, string> {
    const need: [string, string[]][] = [
      ["sl-stream", ["read_stamp"]],
      ["sl-scrub", ["scrub"]],
      ["sl-decode", ["split_message"]],
      ["sl-readout", ["checksum", "readout"]],
      ["sl-scanner", ["find_numbers"]],
      ["sl-fields", ["parse_fields"]],
      ["sl-release", ["redact_callsigns", "tidy_units"]],
      ["sl-records", ["parse_line"]],
      ["sl-search", ["search"]],
      ["sl-alerts", ["parse_record"]],
      ["sl-skymap", ["sky_points", "parse_record"]],
      ["sl-ranking", ["strongest", "parse_record"]],
      ["sl-leaderboard", ["top_senders", "parse_record"]],
      ["sl-report", ["summarize", "format_report"]],
    ];
    const out: Record<string, string> = {};
    if (!this.program) return out;
    for (const [feature, hooks] of need) {
      if (!this.unlocked.has(feature)) continue;
      const missing = hooks.find((h) => !this.program!.hasHook(h));
      if (missing) out[feature] = missing;
    }
    return out;
  }

  // ----- building the view -----
  private build(): View {
    this.reassert = null;
    const missing = this.missingNow();
    const ready = (feature: string) => this.on(feature) && !(feature in missing);
    const last = (n: number) => this.lines.slice(-n);

    const rows: ConsoleRow[] = last(CONSOLE_ROWS).map(({ id, raw }) => {
      let stamp: ConsoleRow["stamp"] = null;
      let clean: string | null = null;
      let margins: [number, number] | null = null;
      if (ready("sl-stream")) {
        const s = this.memo("stamp", raw, () => this.call("read_stamp", raw), (v) => {
          if (!isObj(v)) return null;
          const date = asStr(v.date);
          const time = asStr(v.time);
          return date !== null && time !== null ? { date, time } : null;
        });
        stamp = s;
      }
      if (ready("sl-scrub")) {
        clean = this.memo("scrub", raw, () => this.call("scrub", raw), asStr);
        if (this.has("margins")) {
          margins = this.memo("margins", raw, () => this.call("margins", raw), (v) => {
            if (!Array.isArray(v)) return null;
            const l = asNum(v[0]);
            const r = asNum(v[1]);
            const len = Math.max(0, raw.length - 20);
            return l !== null && r !== null && l >= 0 && r >= 0 && Number.isInteger(l) && Number.isInteger(r) && l + r <= len ? ([l, r] as [number, number]) : null;
          });
        }
      }
      return { id, raw, stamp, clean, margins };
    });

    const decode: DecodeRow[] = ready("sl-decode")
      ? last(5).flatMap(({ id, raw }) => {
          const clean = this.cleanOf(raw);
          const d = this.memo("decode", raw, () => this.call("split_message", clean), strDict);
          if (!d) return [];
          const message = d.message ?? "";
          return [
            {
              id,
              call: d.call ?? "",
              message,
              checksum: d.checksum ?? "",
              beacon: this.has("is_beacon") ? this.memo("beacon", raw, () => this.call("is_beacon", message), asBool) : null,
              tag: this.has("first_tag") ? this.memo("tag", raw, () => this.call("first_tag", message), asStr) : null,
            },
          ];
        })
      : [];

    const readout: ReadoutRow[] = ready("sl-readout")
      ? last(5).map(({ id, raw }) => {
          const ref = this.truth(raw);
          if (!ref) return { id, text: null, hz: null, pretty: null, sum: null, claimed: null };
          const text = this.memo("readout", raw, () => this.call("readout", ref.call, ref.freq, ref.snr), asStr);
          const hz = this.has("hz_text") ? this.memo("hz", raw, () => this.call("hz_text", ref.freq), asStr) : null;
          const pretty = this.has("pretty_stamp") ? this.memo("pretty", raw, () => this.call("pretty_stamp", raw.slice(0, 20)), asStr) : null;
          const sum = this.memo("checksum", raw, () => this.call("checksum", ref.message), asStr);
          return { id, text, hz, pretty, sum, claimed: ref.claimed };
        })
      : [];

    const scan: ScanRow[] = ready("sl-scanner")
      ? last(4).map(({ id, raw }) => {
          const clean = this.cleanOf(raw);
          const ref = this.truth(raw);
          const numbers = this.memo("numbers", raw, () => this.call("find_numbers", clean), (v) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : null)) ?? [];
          return {
            id,
            clean,
            numbers,
            stampOk: this.has("starts_with_stamp") ? this.memo("stampok", raw, () => this.call("starts_with_stamp", raw), asBool) : null,
            callOk: this.has("valid_call") && ref ? this.memo("callok", raw, () => this.call("valid_call", ref.call), asBool) : null,
            chkOk: this.has("has_checksum") ? this.memo("chkok", raw, () => this.call("has_checksum", clean), asBool) : null,
          };
        })
      : [];

    const fields: FieldRow[] = ready("sl-fields")
      ? last(3).map(({ id, raw }) => {
          const clean = this.cleanOf(raw);
          const f = this.memo("fields", raw, () => this.call("parse_fields", clean), strDict);
          const ref = this.truth(raw);
          const message = ref?.message ?? "";
          const kind = f && message && this.has("message_kind") ? this.memo("kind", raw, () => this.call("message_kind", message), asStr) : null;
          const spans = f && message && this.has("tag_spans") ? (this.memo("spans", raw, () => this.call("tag_spans", message), spanList) ?? []) : [];
          return { id, clean, fields: f, message, kind, spans };
        })
      : [];

    const release: ReleaseRow[] = ready("sl-release")
      ? last(3).map(({ id, raw }) => {
          const clean = this.cleanOf(raw);
          const released = this.memo("release", raw, () => {
            const a = this.call("redact_callsigns", clean);
            if (a === MISS || typeof a !== "string") return MISS;
            return this.call("tidy_units", a);
          }, asStr);
          return { id, clean, released };
        })
      : [];

    const records: RecordsRow[] = ready("sl-records")
      ? last(8).map(({ id, raw }) => ({ id, raw, parsed: this.memo("line", raw, () => this.call("parse_line", raw), strDict) }))
      : [];

    // aggregates over everything on the wire
    const needRecords = ready("sl-alerts") || ready("sl-skymap") || ready("sl-ranking") || ready("sl-leaderboard");
    const recs: Obj[] = [];
    const alertsAll: AlertRow[] = [];
    if (needRecords) {
      for (const { id, raw } of this.lines) {
        const r = this.record(raw);
        if (!r) continue;
        recs.push(r);
        if (r.ok === false) {
          alertsAll.push({ id, level: "bad", reason: asStr(r.error) ?? "unreadable line", stamp: raw.slice(11, 19), excerpt: this.cleanOf(raw) || raw.slice(20).trim() });
        } else if (r.ok === true && r.valid === false) {
          alertsAll.push({ id, level: "corrupt", reason: "checksum mismatch", stamp: raw.slice(11, 19), excerpt: this.cleanOf(raw) });
        }
      }
    }
    const alerts = alertsAll.slice(-8).reverse();

    let sky: SkyPoint[] | null = null;
    if (ready("sl-skymap")) {
      const v = this.call("sky_points", recs, this.minSnr);
      sky = Array.isArray(v)
        ? v.flatMap((p) => {
            if (!isObj(p)) return [];
            const call = asStr(p.call);
            const az = asNum(p.az);
            const el = asNum(p.el);
            const snr = asNum(p.snr);
            return call !== null && az !== null && el !== null && snr !== null ? [{ call, az, el, snr }] : [];
          })
        : [];
    }

    let rank: RankRow[] | null = null;
    if (ready("sl-ranking")) {
      const v = this.call("strongest", recs, 6);
      rank = Array.isArray(v) ? v.flatMap((r) => toRank(r) ?? []) : [];
    }

    let board: Leaderboard | null = null;
    if (ready("sl-leaderboard")) {
      const senders = pairList(this.call("top_senders", recs, 5));
      const avgRaw = this.has("average_snr") ? this.call("average_snr", recs) : MISS;
      const avg: Record<string, number> = {};
      if (isObj(avgRaw)) for (const [k, val] of Object.entries(avgRaw)) if (typeof val === "number") avg[k] = val;
      const words = this.has("hot_words") ? pairList(this.call("hot_words", recs, 6)) : [];
      board = { senders, avg, words };
    }

    let report: ReportView | null = null;
    if (ready("sl-report")) {
      const raws = this.lines.map((l) => l.raw);
      const summary = this.call("summarize", raws);
      const text = summary !== MISS ? this.call("format_report", summary) : MISS;
      if (typeof text === "string" && isObj(summary)) {
        report = {
          text,
          total: asNum(summary.total) ?? 0,
          decoded: asNum(summary.decoded) ?? 0,
          malformed: asNum(summary.malformed) ?? 0,
          corrupt: asNum(summary.corrupt) ?? 0,
        };
      } else report = { text: "", total: 0, decoded: 0, malformed: 0, corrupt: 0 };
    }

    const view: View = {
      running: this.running,
      received: this.nextId,
      rows,
      decode,
      readout,
      scan,
      fields,
      release,
      records,
      search: this.buildSearch(missing),
      alerts,
      alertTotal: alertsAll.length,
      sky,
      rank,
      board,
      report,
      missing,
      minSnr: this.minSnr,
      query: this.query,
    };
    // keep a failing hook's message on screen: a later success would otherwise clear it
    this.flush();
    return view;
  }

  private buildSearch(missing: Record<string, string>): SearchView | null {
    if (!this.on("sl-search") || "sl-search" in missing) return null;
    const lines = this.lines.map((l) => ({ id: l.id, text: this.cleanOf(l.raw) }));
    if (!this.query.trim()) return { query: this.query, state: "idle", hits: [], scanned: lines.length };
    const v = this.call("search", lines.map((l) => l.text), this.query);
    if (v === MISS || !Array.isArray(v)) return { query: this.query, state: "invalid", hits: [], scanned: lines.length };
    const hits: SearchHit[] = [];
    for (const h of v) {
      if (!isObj(h)) continue;
      const index = asNum(h.index);
      const start = asNum(h.start);
      const end = asNum(h.end);
      if (index === null || !Number.isInteger(index) || index < 0 || index >= lines.length) continue;
      const text = lines[index].text;
      const s = start !== null ? Math.max(0, Math.min(text.length, Math.floor(start))) : 0;
      const e = end !== null ? Math.max(s, Math.min(text.length, Math.floor(end))) : s;
      hits.push({ id: lines[index].id, text, start: s, end: e });
    }
    return { query: this.query, state: "ok", hits, scanned: lines.length };
  }

  /** The dish's own telemetry: numbers a readout is formatted from, available before the learner can parse. */
  private truth(raw: string): { call: string; freq: number; snr: number; message: string; claimed: string } | null {
    const t = this.truthCache.get(raw);
    if (t !== undefined) return t;
    const m = /"(.*)"/.exec(raw);
    const call = /([a-z]{2}-\d{3})/i.exec(raw);
    const freq = /@\s*([\d.]+)\s*mhz/i.exec(raw);
    const snr = /snr=([+-]?[\d.]+)/i.exec(raw);
    const claimed = /#([0-9a-f]{2})\s*(?:[~^\s]*)$/i.exec(raw);
    const f = freq ? Number(freq[1]) : NaN;
    const s = snr ? Number(snr[1]) : NaN;
    const out = m && call && claimed && Number.isFinite(f) && Number.isFinite(s) ? { call: call[1].toUpperCase(), freq: f, snr: s, message: m[1], claimed: claimed[1].toUpperCase() } : null;
    if (this.truthCache.size > 400) this.truthCache.clear();
    this.truthCache.set(raw, out);
    return out;
  }
  private truthCache = new Map<string, ReturnType<Lab["truth"]>>();
}
