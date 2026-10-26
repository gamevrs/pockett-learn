import type { ProgramHandle } from "@/engine/program";
import { BASE_ITEMS, EMPTY_VALUES, FIELDS, FUZZ_TEXT, FUZZ_TYPES, MAX_INPUT, type Item, type Values } from "./data";

/**
 * The form's brain, kept outside React. It owns what the shopper typed and asks the learner's
 * functions about it. The component subscribes with useSyncExternalStore, so the learner's code is
 * only ever called from event handlers and timers, never during a render.
 *
 * Every answer arrives wrapped in a Res: either the learner's value, or the reason there is none
 * (feature still locked, nothing run yet, function not defined, the function crashed, or it
 * returned the wrong kind of thing). The UI turns each of those into something sensible.
 */

// ───────────────────────── results ─────────────────────────

export type Res<T> =
  | { s: "locked" }
  | { s: "idle" }
  | { s: "missing"; fn: string }
  | { s: "error"; fn: string; message: string }
  | { s: "bad"; fn: string; note: string }
  | { s: "ok"; value: T; ms: number };

const LOCKED = { s: "locked" } as const;
const IDLE = { s: "idle" } as const;

export const isOk = <T>(r: Res<T>): r is Extract<Res<T>, { s: "ok" }> => r.s === "ok";

export interface RuleRow {
  id: string;
  message: string;
  ok: boolean;
}

export interface AttemptError {
  name: string;
  message: string;
  field: string;
  code: string;
  chain: string[];
}

export type Attempt<T> = { ok: true; value: T } | { ok: false; error: AttemptError };

export interface Stats {
  started: number;
  finished: number;
  failed: number;
}

export interface Today {
  year: number;
  month: number;
}

// ───────────────────────── guards ─────────────────────────

type Guard<T> = (v: unknown) => v is T;
const anything = (v: unknown): v is unknown => v !== Symbol.for("never");
const isStr: Guard<string> = (v): v is string => typeof v === "string";
const isBool: Guard<boolean> = (v): v is boolean => typeof v === "boolean";
const isNum: Guard<number> = (v): v is number => typeof v === "number" && Number.isFinite(v);
const isRec = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const isStrArr: Guard<string[]> = (v): v is string[] => Array.isArray(v) && v.every((x) => typeof x === "string");
const isStrOrNull: Guard<string | null> = (v): v is string | null => typeof v === "string" || v === null;
const isStrOrUndef: Guard<string | undefined> = (v): v is string | undefined => typeof v === "string" || v === undefined || v === null;
const isStrRec: Guard<Record<string, string>> = (v): v is Record<string, string> => isRec(v) && Object.values(v).every((x) => typeof x === "string");
const isNumRec: Guard<Record<string, number>> = (v): v is Record<string, number> => isRec(v) && Object.values(v).every((x) => typeof x === "number");
const isRuleRows: Guard<RuleRow[]> = (v): v is RuleRow[] =>
  Array.isArray(v) && v.every((r) => isRec(r) && typeof r.id === "string" && typeof r.message === "string" && typeof r.ok === "boolean");
const isPwRules: Guard<{ id: string; label: string; ok: boolean }[]> = (v): v is { id: string; label: string; ok: boolean }[] =>
  Array.isArray(v) && v.every((r) => isRec(r) && typeof r.id === "string" && typeof r.label === "string" && typeof r.ok === "boolean");
const isItems: Guard<Item[]> = (v): v is Item[] => Array.isArray(v) && v.every((r) => isRec(r) && typeof r.sku === "string" && typeof r.priceCents === "number");
const isStats: Guard<Stats> = (v): v is Stats => isRec(v) && isNum(v.started) && isNum(v.finished) && isNum(v.failed);
const isAttempt = <T>(inner: Guard<T>): Guard<Attempt<T>> => (v): v is Attempt<T> => {
  if (!isRec(v) || typeof v.ok !== "boolean") return false;
  if (v.ok) return inner(v.value);
  return isRec(v.error) && typeof v.error.message === "string" && typeof v.error.code === "string";
};
const isExpiry: Guard<{ month: number; year: number }> = (v): v is { month: number; year: number } => isRec(v) && isNum(v.month) && isNum(v.year);
const isExpiryOrNull: Guard<{ month: number; year: number } | null> = (v): v is { month: number; year: number } | null => v === null || isExpiry(v);
const isSubmit = (v: unknown): v is SubmitOutcome => isRec(v) && typeof v.ok === "boolean" && isNum(v.status);
const isServer = (v: unknown): v is ServerOutcome => isRec(v) && isNum(v.status);

const RESERVED = ["admin", "root", "support", "staff", "c++"];

function mapRes<T, U>(r: Res<T>, f: (v: T) => U): Res<U> {
  return r.s === "ok" ? { s: "ok", value: f(r.value), ms: r.ms } : r;
}

function expiryLabel(v: { month: number; year: number }): string {
  return v.month >= 1 && v.month <= 12 ? `${MONTHS[v.month - 1]} ${v.year}` : `${v.month}/${v.year}`;
}

export function describe(v: unknown): string {
  if (v === undefined) return "undefined (is there a return?)";
  if (v === null) return "null";
  if (Array.isArray(v)) return "an array";
  if (typeof v === "object") return "an object";
  return `${typeof v === "string" ? "text" : typeof v} ${typeof v === "string" ? JSON.stringify(v.slice(0, 20)) : String(v)}`;
}

function trimError(message: string): string {
  const one = message.replace(/\s+/g, " ").trim();
  return one.length > 160 ? `${one.slice(0, 157)}…` : one;
}

// ───────────────────────── views ─────────────────────────

export interface FormatView {
  fn: string;
  lesson: number;
  res: Res<string | null>;
}

export interface CheckView {
  fn: string;
  label: string;
  lesson: number;
  res: Res<boolean>;
}

export interface FieldView {
  formats: FormatView[];
  checks: CheckView[];
  rules: Res<RuleRow[]>;
  /** Keys ("fn" or "rule:id") whose answer flipped because of the latest keystroke. */
  changed: string[];
}

export interface Analysis {
  required: Res<string[]>;
  ready: Res<boolean>;
  lastRequired: Res<string | undefined>;
  typeCounts: Res<Record<string, number>>;
  spec: Res<unknown>;
  sorted: Res<Item[]>;
  total: Res<number>;
  totalText: Res<string>;
  skus: Res<string[]>;
  compact: Res<Values>;
  summary: Res<string>;
  safe: Res<Values>;
  fields: Record<string, FieldView>;
  pwRules: Res<{ id: string; label: string; ok: boolean }[]>;
  pwScore: Res<number>;
  stats: Res<Stats>;
  /** checkExpiry() on the expiry box: data, never a crash. */
  expiry: Res<Attempt<{ month: number; year: number }>>;
  payload: Res<string>;
  problems: Res<Record<string, string[]>>;
  escaped: Res<string>;
  sanitized: Res<Values>;
}

export interface DraftState {
  text: string;
  res: Res<Attempt<Values>> | null;
}

export interface ServerOutcome {
  status: number;
  errors?: Record<string, string[]>;
  total?: { cents: number; currency: string };
}

export interface ServerState {
  text: string;
  /** True once the shopper has typed in the box, so live payload updates stop overwriting it. */
  edited: boolean;
  res: Res<ServerOutcome> | null;
  /** The customer name from the request, shown as text and as escapeHtml() makes it. */
  echo: { raw: string; escaped: Res<string> } | null;
}

export interface SubmitOutcome {
  ok: boolean;
  status: number;
  stage?: string;
  errors?: Record<string, string[]>;
  total?: { cents: number; currency: string };
  body?: string;
}

export interface FuzzRow {
  fn: string;
  lesson: number;
  calls: number;
  crashes: number;
  slow: number;
  maxMs: number;
  crashOn: string | null;
  crashMessage: string | null;
  slowOn: string | null;
}

export interface FuzzState {
  running: boolean;
  done: number;
  total: number;
  calls: number;
  crashes: number;
  slow: number;
  rows: FuzzRow[];
}

export interface Snapshot {
  values: Values;
  touched: string[];
  focus: string | null;
  qty: Record<string, number>;
  /** Counts keystrokes, so the UI can replay the "rule fired" flash. */
  tick: number;
  /** How long the last full pass over the learner's functions took (ms). */
  ms: number;
  calls: number;
  live: boolean;
  a: Analysis;
  draft: DraftState;
  server: ServerState;
  submit: Res<SubmitOutcome> | null;
  fuzz: FuzzState | null;
}

// ───────────────────────── hooks ─────────────────────────

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const now = () => (typeof performance !== "undefined" ? performance.now() : Date.now());

class Hooks {
  calls = 0;
  constructor(
    private program: ProgramHandle | null,
    private unlocked: ReadonlySet<string>,
  ) {}

  /** Calls one learner function if its feature is unlocked, and judges the answer. */
  call<T>(feature: string, fn: string, args: unknown[], guard: Guard<T>): Res<T> {
    if (!this.unlocked.has(feature)) return LOCKED;
    const p = this.program;
    if (!p) return IDLE;
    if (!p.hasHook(fn)) return { s: "missing", fn };
    const t0 = now();
    this.calls++;
    const value = p.call<unknown>(fn, ...args);
    const ms = now() - t0;
    if (p.lastError) return { s: "error", fn, message: trimError(p.lastError) };
    if (!guard(value)) return { s: "bad", fn, note: `returned ${describe(value)}` };
    return { s: "ok", value, ms };
  }

  /** Like call, but never gated: used by the fuzzer, which reports instead of judging. */
  raw(fn: string, args: unknown[]): { ran: false } | { ran: true; ms: number; error: string | null } {
    const p = this.program;
    if (!p || !p.hasHook(fn)) return { ran: false };
    const t0 = now();
    this.calls++;
    p.call<unknown>(fn, ...args);
    return { ran: true, ms: now() - t0, error: p.lastError ? trimError(p.lastError) : null };
  }
}

const blankAnalysis = (): Analysis => ({
  required: LOCKED,
  ready: LOCKED,
  lastRequired: LOCKED,
  typeCounts: LOCKED,
  spec: LOCKED,
  sorted: LOCKED,
  total: LOCKED,
  totalText: LOCKED,
  skus: LOCKED,
  compact: LOCKED,
  summary: LOCKED,
  safe: LOCKED,
  fields: {},
  pwRules: LOCKED,
  pwScore: LOCKED,
  stats: LOCKED,
  expiry: LOCKED,
  payload: LOCKED,
  problems: LOCKED,
  escaped: LOCKED,
  sanitized: LOCKED,
});

// ───────────────────────── the sim ─────────────────────────

const GOOD_DRAFT = '{\n  "fullName": "Ada Lovelace",\n  "email": "ada@example.com",\n  "city": "London",\n  "postcode": "SW1A 1AA",\n  "country": "GB"\n}';
export const DRAFT_PRESETS: { label: string; text: string }[] = [
  { label: "Good draft", text: GOOD_DRAFT },
  { label: "Old draft", text: '{"fullName": "Grace Hopper", "postcode": 2134, "phone": 5550100123, "city": "Boston", "country": "US"}' },
  { label: "Broken JSON", text: '{"fullName": "Ada", "email": "ada@example.com",}' },
  { label: "Wrong shape", text: '["not", "a", "draft"]' },
  { label: "Hostile keys", text: '{"__proto__": {"admin": true}, "isAdmin": true, "email": "a@b.co", "city": {"nested": "object"}}' },
];

const EMPTY_STATS: FuzzState = { running: false, done: 0, total: 0, calls: 0, crashes: 0, slow: 0, rows: [] };

export class FormSim {
  private listeners = new Set<() => void>();
  private snap: Snapshot;
  private program: ProgramHandle | null = null;
  private unlocked: ReadonlySet<string> = new Set();
  private disposed = false;
  private fuzzTimer: ReturnType<typeof setTimeout> | null = null;
  private previous = new Map<string, boolean>();

  constructor() {
    this.snap = {
      values: { ...EMPTY_VALUES },
      touched: [],
      focus: null,
      qty: Object.fromEntries(BASE_ITEMS.map((i) => [i.sku, i.qty])),
      tick: 0,
      ms: 0,
      calls: 0,
      live: false,
      a: blankAnalysis(),
      draft: { text: GOOD_DRAFT, res: null },
      server: { text: "", edited: false, res: null, echo: null },
      submit: null,
      fuzz: null,
    };
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = () => this.snap;

  dispose() {
    this.disposed = true;
    if (this.fuzzTimer) clearTimeout(this.fuzzTimer);
    this.fuzzTimer = null;
  }

  /** (Re)connects to the learner's program. Typed values survive a re-run. */
  attach(program: ProgramHandle | null, unlocked: ReadonlySet<string>) {
    this.disposed = false;
    this.program = program;
    this.unlocked = unlocked;
    this.previous.clear();
    this.refresh({ submit: null, fuzz: null, draft: { ...this.snap.draft, res: null }, server: { ...this.snap.server, res: null, echo: null } });
  }

  // ── what the shopper does ──

  setValue(name: string, value: string) {
    if (!Object.hasOwn(EMPTY_VALUES, name)) return;
    const values = { ...this.snap.values, [name]: value.slice(0, MAX_INPUT) };
    this.refresh({ values, tick: this.snap.tick + 1, submit: null });
  }

  fill(values: Values) {
    this.previous.clear();
    this.refresh({ values: { ...EMPTY_VALUES, ...values }, touched: Object.keys(values), tick: this.snap.tick + 1, submit: null });
  }

  reset() {
    this.previous.clear();
    this.refresh({ values: { ...EMPTY_VALUES }, touched: [], submit: null, tick: this.snap.tick + 1 });
  }

  setFocus(name: string | null) {
    if (this.snap.focus === name) return;
    this.refresh({ focus: name });
  }

  touch(name: string) {
    if (this.snap.touched.includes(name)) return;
    this.refresh({ touched: [...this.snap.touched, name] });
  }

  touchAll() {
    this.refresh({ touched: FIELDS.map((f) => f.name) });
  }

  setQty(sku: string, qty: number) {
    this.refresh({ qty: { ...this.snap.qty, [sku]: Math.max(1, Math.min(9, qty)) } });
  }

  // ── draft restore (lesson 9) ──

  setDraftText(text: string) {
    this.publish({ draft: { text: text.slice(0, MAX_INPUT), res: this.snap.draft.res } });
  }

  runDraft(text = this.snap.draft.text) {
    const hooks = this.hooks();
    const res = hooks.call("ff-draft", "loadDraft", [text], isAttempt(isStrRec));
    this.publish({ draft: { text, res }, calls: this.snap.calls + hooks.calls });
  }

  /** Copies a successfully loaded draft into the form. */
  applyDraft() {
    const res = this.snap.draft.res;
    if (res?.s === "ok" && res.value.ok) this.fill({ ...EMPTY_VALUES, ...res.value.value });
  }

  // ── server checkpoint (lesson 13) ──

  setServerText(text: string) {
    this.publish({ server: { ...this.snap.server, text: text.slice(0, 20000), edited: true } });
  }

  /** Re-seeds the request box from the current form (what the browser would really send). */
  resetServerText() {
    const payload = this.snap.a.payload;
    this.publish({ server: { text: payload.s === "ok" ? payload.value : "", edited: false, res: null, echo: null } });
  }

  sendToServer(text = this.snap.server.text) {
    const hooks = this.hooks();
    const res = hooks.call("ff-secure", "handleSubmit", [text, { today: this.today() }], isServer);
    let echo: ServerState["echo"] = null;
    try {
      const body: unknown = JSON.parse(text);
      const name = isRec(body) && isRec(body.customer) ? body.customer.fullName : undefined;
      if (typeof name === "string" && name !== "") echo = { raw: name.slice(0, 200), escaped: hooks.call("ff-secure", "escapeHtml", [name.slice(0, 200)], isStr) };
    } catch {
      // not JSON: handleSubmit has already answered 400
    }
    this.publish({ server: { ...this.snap.server, text, res, echo }, calls: this.snap.calls + hooks.calls });
  }

  // ── submit (lesson 14) ──

  submit() {
    const hooks = this.hooks();
    this.touchAll();
    const items = this.items();
    const res = hooks.call("ff-schema", "submitForm", [this.snap.values, items, new Date().toISOString(), { today: this.today() }], isSubmit);
    this.publish({ submit: res, calls: this.snap.calls + hooks.calls, touched: FIELDS.map((f) => f.name) });
  }

  // ── fuzz it ──

  fuzz() {
    if (!this.program || this.snap.fuzz?.running) return;
    if (this.fuzzTimer) clearTimeout(this.fuzzTimer);
    const hooks = this.hooks();
    const ctx = { today: this.today(), items: this.items(), nowIso: new Date().toISOString() };
    const tasks: { input: string; fn: string; lesson: number; args: unknown[] }[] = [];
    for (const call of FUZZ_CALLS) {
      if (!this.unlocked.has(call.feature)) continue;
      for (const input of FUZZ_TEXT) tasks.push({ input: input.label, fn: call.fn, lesson: call.lesson, args: call.args(input.text, ctx) });
      for (const odd of FUZZ_TYPES) tasks.push({ input: odd.label, fn: call.fn, lesson: call.lesson, args: call.args(odd.make(), ctx) });
    }
    const rows = new Map<string, FuzzRow>();
    let index = 0;
    let calls = 0;
    let crashes = 0;
    let slow = 0;
    const startedAt = now();
    this.publish({ fuzz: { ...EMPTY_STATS, running: true, total: tasks.length } });

    const step = () => {
      if (this.disposed) return;
      const stopAt = now() + 40;
      while (index < tasks.length && now() < stopAt && now() - startedAt < 12000) {
        const task = tasks[index++];
        const out = hooks.raw(task.fn, task.args);
        if (!out.ran) continue;
        calls++;
        let row = rows.get(task.fn);
        if (!row) {
          row = { fn: task.fn, lesson: task.lesson, calls: 0, crashes: 0, slow: 0, maxMs: 0, crashOn: null, crashMessage: null, slowOn: null };
          rows.set(task.fn, row);
        }
        row.calls++;
        if (out.ms > row.maxMs) row.maxMs = out.ms;
        if (out.error) {
          row.crashes++;
          crashes++;
          if (!row.crashOn) {
            row.crashOn = task.input;
            row.crashMessage = out.error;
          }
        } else if (out.ms > 25) {
          row.slow++;
          slow++;
          if (!row.slowOn) row.slowOn = task.input;
        }
      }
      const finished = index >= tasks.length || now() - startedAt >= 12000;
      const sorted = [...rows.values()].sort((a, b) => b.crashes - a.crashes || b.slow - a.slow || b.maxMs - a.maxMs);
      this.publish({ fuzz: { running: !finished, done: index, total: tasks.length, calls, crashes, slow, rows: sorted } });
      if (finished) {
        this.fuzzTimer = null;
        this.refresh({});
        return;
      }
      this.fuzzTimer = setTimeout(step, 0);
    };
    this.fuzzTimer = setTimeout(step, 0);
  }

  // ── internals ──

  private today(): Today {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() + 1 };
  }

  private items(): Item[] {
    return BASE_ITEMS.map((i) => ({ ...i, qty: this.snap.qty[i.sku] ?? i.qty, addOns: i.addOns.map((a) => ({ ...a })) }));
  }

  private hooks() {
    return new Hooks(this.program, this.unlocked);
  }

  private refresh(patch: Partial<Snapshot>) {
    const base = { ...this.snap, ...patch };
    const t0 = now();
    const hooks = this.hooks();
    const a = this.analyze(hooks, base);
    const ms = now() - t0;
    // keep the server request box in step with the form until the shopper starts editing it
    let server = base.server;
    if (!server.edited) {
      const text = a.payload.s === "ok" ? a.payload.value : "";
      if (text !== server.text) server = { ...server, text };
    }
    this.publish({ ...patch, a, ms, calls: hooks.calls, live: !!this.program, server });
  }

  private publish(patch: Partial<Snapshot>) {
    this.snap = { ...this.snap, ...patch };
    this.listeners.forEach((l) => l());
  }

  private analyze(h: Hooks, s: Snapshot): Analysis {
    const a = blankAnalysis();
    const values = s.values;
    const today = this.today();
    const ctx = { today };
    const items = this.items();
    const focus = s.focus;

    a.required = h.call("ff-form", "requiredFields", [FIELDS], isStrArr);
    a.ready = isOk(a.required) ? h.call("ff-form", "allFilled", [a.required.value, values], isBool) : (a.required as Res<boolean>);
    a.lastRequired = h.call("ff-form", "lastRequired", [FIELDS], isStrOrUndef);
    a.spec = focus ? h.call("ff-form", "findField", [FIELDS, focus], anything) : LOCKED;
    a.typeCounts = h.call("ff-order", "countByType", [FIELDS], isNumRec);

    a.sorted = h.call("ff-order", "sortByPrice", [items], isItems);
    a.total = h.call("ff-order", "orderTotal", [items], isNum);
    a.skus = h.call("ff-order", "allSkus", [items], isStrArr);
    a.totalText = isOk(a.total) ? h.call("ff-clean", "formatMoney", [a.total.value], isStr) : LOCKED;

    const name = values.fullName;
    a.compact = h.call("ff-state", "compact", [values], isStrRec);
    a.summary = h.call("ff-state", "summarize", [{ fullName: name || undefined, email: values.email || undefined, address: { city: values.city || undefined } }], isStr);
    a.safe = h.call("ff-state", "withoutSecrets", [values], isStrRec);

    a.pwRules = h.call("ff-password", "passwordRules", [values.password], isPwRules);
    a.pwScore = h.call("ff-password", "passwordScore", [values.password], isNum);
    a.stats = h.call("ff-errors", "attemptStats", [], isStats);
    a.expiry = h.call("ff-errors", "checkExpiry", [values.expiry, today], isAttempt(isExpiry));
    a.payload = h.call("ff-payload", "buildPayload", [values, items, new Date().toISOString()], isStr);
    a.problems = h.call("ff-rules", "validateAll", [values, undefined, ctx], (v): v is Record<string, string[]> => isRec(v) && Object.values(v).every(isStrArr));
    a.escaped = h.call("ff-secure", "escapeHtml", [values.note || values.fullName], isStr);
    a.sanitized = h.call("ff-secure", "sanitizeValues", [values], isStrRec);

    for (const f of FIELDS) {
      const v = values[f.name];
      const view: FieldView = { formats: [], checks: [], rules: LOCKED, changed: [] };
      const fmt = <T,>(fn: string, feature: string, lesson: number, args: unknown[], guard: Guard<T>, show: (r: T) => string | null) => {
        view.formats.push({ fn, lesson, res: mapRes(h.call(feature, fn, args, guard), show) });
      };
      const chk = <T,>(fn: string, label: string, feature: string, lesson: number, args: unknown[], guard: Guard<T>, pick: (r: T) => boolean) => {
        view.checks.push({ fn, label, lesson, res: mapRes(h.call(feature, fn, args, guard), pick) });
      };
      const same = (r: string | null) => r;

      switch (f.name) {
        case "fullName":
        case "address":
          fmt("cleanText", "ff-clean", 4, [v], isStr, same);
          break;
        case "city":
          fmt("titleCase", "ff-clean", 4, [v], isStr, same);
          break;
        case "email":
          chk("isEmail", "is an email shape", "ff-patterns", 5, [v], isBool, (r) => r);
          break;
        case "username":
          chk("isUsername", "3-20 letters, digits, _ -", "ff-patterns", 5, [v], isBool, (r) => r);
          chk("containsBanned", "not a reserved word", "ff-password", 7, [v, RESERVED], isBool, (r) => !r);
          break;
        case "phone":
          fmt("formatPhone", "ff-format", 6, [v], isStrOrNull, same);
          break;
        case "postcode":
          fmt("normalizePostcode", "ff-format", 6, [values.country, v], isStrOrNull, same);
          break;
        case "note":
          fmt("redactCards", "ff-format", 6, [v], isStr, same);
          break;
        case "cardNumber":
          chk("isCardNumber", "digits, 13-19 long", "ff-patterns", 5, [v], isBool, (r) => r);
          chk("luhnCheck", "passes the Luhn check", "ff-order", 2, [v.replace(/\D/g, "")], isBool, (r) => r);
          fmt("formatCardNumber", "ff-clean", 4, [v], isStr, same);
          fmt("maskCard", "ff-clean", 4, [v], isStr, same);
          break;
        case "expiry":
          fmt("parseExpiry", "ff-format", 6, [v], isExpiryOrNull, (r) => (r === null ? null : expiryLabel(r)));
          view.checks.push({ fn: "checkExpiry", label: "not expired", lesson: 8, res: mapRes(a.expiry, (r) => r.ok) });
          break;
        case "cvc":
          chk("isCvc", "3 or 4 digits", "ff-patterns", 5, [v], isBool, (r) => r);
          break;
      }

      view.rules = h.call("ff-rules", "checkField", [f.name, values, ctx], isRuleRows);
      view.changed = this.diff(f.name, view);
      a.fields[f.name] = view;
    }

    return a;
  }

  /** Which of this field's answers flipped since the previous keystroke (for the "fired" flash). */
  private diff(field: string, view: FieldView): string[] {
    const changed: string[] = [];
    const note = (key: string, ok: boolean) => {
      const id = `${field}:${key}`;
      const before = this.previous.get(id);
      if (before !== undefined && before !== ok) changed.push(key);
      this.previous.set(id, ok);
    };
    for (const c of view.checks) if (c.res.s === "ok") note(c.fn, c.res.value);
    for (const f of view.formats) if (f.res.s === "ok") note(f.fn, f.res.value !== null);
    if (view.rules.s === "ok") for (const r of view.rules.value) note(`rule:${r.id}`, r.ok);
    return changed;
  }
}

// ───────────────────────── fuzz targets ─────────────────────────

interface FuzzCtx {
  today: Today;
  items: Item[];
  nowIso: string;
}

interface FuzzCall {
  fn: string;
  feature: string;
  lesson: number;
  args: (x: unknown, c: FuzzCtx) => unknown[];
}

const allFields = (x: unknown): Record<string, unknown> => Object.fromEntries(Object.keys(EMPTY_VALUES).map((k) => [k, x]));

/** Every function a scene feature calls, with arguments built around one hostile value. */
const FUZZ_CALLS: FuzzCall[] = [
  { fn: "allFilled", feature: "ff-form", lesson: 1, args: (x) => [["email", "fullName"], allFields(x)] },
  { fn: "luhnCheck", feature: "ff-order", lesson: 2, args: (x) => [x] },
  { fn: "summarize", feature: "ff-state", lesson: 3, args: (x) => [{ fullName: x, email: x, address: x }] },
  { fn: "withDefaults", feature: "ff-state", lesson: 3, args: (x) => [allFields(x)] },
  { fn: "compact", feature: "ff-state", lesson: 3, args: (x) => [allFields(x)] },
  { fn: "withoutSecrets", feature: "ff-state", lesson: 3, args: (x) => [allFields(x)] },
  { fn: "cleanText", feature: "ff-clean", lesson: 4, args: (x) => [x] },
  { fn: "titleCase", feature: "ff-clean", lesson: 4, args: (x) => [x] },
  { fn: "digitsOnly", feature: "ff-clean", lesson: 4, args: (x) => [x] },
  { fn: "formatCardNumber", feature: "ff-clean", lesson: 4, args: (x) => [x] },
  { fn: "maskCard", feature: "ff-clean", lesson: 4, args: (x) => [x] },
  { fn: "formatMoney", feature: "ff-clean", lesson: 4, args: (x) => [x] },
  { fn: "isEmail", feature: "ff-patterns", lesson: 5, args: (x) => [x] },
  { fn: "isUsername", feature: "ff-patterns", lesson: 5, args: (x) => [x] },
  { fn: "isCvc", feature: "ff-patterns", lesson: 5, args: (x) => [x] },
  { fn: "isCardNumber", feature: "ff-patterns", lesson: 5, args: (x) => [x] },
  { fn: "formatPhone", feature: "ff-format", lesson: 6, args: (x) => [x] },
  { fn: "normalizePostcode", feature: "ff-format", lesson: 6, args: (x) => [x, x] },
  { fn: "parseExpiry", feature: "ff-format", lesson: 6, args: (x) => [x] },
  { fn: "redactCards", feature: "ff-format", lesson: 6, args: (x) => [x] },
  { fn: "passwordRules", feature: "ff-password", lesson: 7, args: (x) => [x] },
  { fn: "passwordScore", feature: "ff-password", lesson: 7, args: (x) => [x] },
  { fn: "escapeRegExp", feature: "ff-password", lesson: 7, args: (x) => [x] },
  { fn: "containsBanned", feature: "ff-password", lesson: 7, args: (x) => [x, ["admin", "root", "c++", x]] },
  { fn: "checkExpiry", feature: "ff-errors", lesson: 8, args: (x, c) => [x, c.today] },
  { fn: "parseJson", feature: "ff-draft", lesson: 9, args: (x) => [x] },
  { fn: "loadDraft", feature: "ff-draft", lesson: 9, args: (x) => [x] },
  { fn: "buildPayload", feature: "ff-payload", lesson: 10, args: (x, c) => [allFields(x), c.items, c.nowIso] },
  ...["email", "password", "postcode", "expiry"].map((name) => ({ fn: "checkField", feature: "ff-rules", lesson: 11, args: (x: unknown, c: FuzzCtx) => [name, allFields(x), { today: c.today }] })),
  { fn: "validateAll", feature: "ff-rules", lesson: 11, args: (x, c) => [allFields(x), undefined, { today: c.today }] },
  { fn: "escapeHtml", feature: "ff-secure", lesson: 13, args: (x) => [x] },
  { fn: "sanitizeValues", feature: "ff-secure", lesson: 13, args: (x) => [allFields(x)] },
  { fn: "handleSubmit", feature: "ff-secure", lesson: 13, args: (x, c) => [x, { today: c.today }] },
  { fn: "validateForm", feature: "ff-schema", lesson: 14, args: (x, c) => [allFields(x), undefined, { today: c.today }] },
  { fn: "submitForm", feature: "ff-schema", lesson: 14, args: (x, c) => [allFields(x), c.items, c.nowIso, { today: c.today }] },
];
