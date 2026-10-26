import { createStaticProgram, type ProgramHandle } from "@/engine/program";

/**
 * A TypeScript stand-in for a finished Form Forge program (the reference solution, ported), so the
 * landing page can run the checkout form without loading the JavaScript sandbox. It implements
 * every function the scene calls once all fourteen lessons are passed. To re-verify it, run the
 * same inputs through this and through the course solution in the real engine and compare.
 */

type Rec = Record<string, unknown>;

// ── lesson 1-3: arrays and objects ──

const requiredFields = (fields: Rec[]) => fields.filter((f) => f.required === true).map((f) => f.name);
const findField = (fields: Rec[], name: string) => fields.find((f) => f.name === name);
const hasType = (fields: Rec[], type: string) => fields.some((f) => f.type === type);
const allFilled = (names: string[], values: Rec | undefined) =>
  names.every((n) => {
    const v = values?.[n];
    return typeof v === "string" && v.trim() !== "";
  });
const lastRequired = (fields: Rec[]) => requiredFields(fields).at(-1);

interface Line {
  sku: string;
  name: string;
  priceCents: number;
  qty: number;
  addOns?: { sku: string; priceCents: number }[];
}

const orderTotal = (items: Line[]) =>
  items.reduce((total, { priceCents, qty, addOns = [] }) => total + (priceCents + addOns.reduce((s, a) => s + a.priceCents, 0)) * qty, 0);
const sortByPrice = (items: Line[]) => [...items].sort((a, b) => b.priceCents - a.priceCents || a.name.localeCompare(b.name));
const allSkus = (items: Line[]) => [...new Set(items.flatMap((i) => [i.sku, ...(i.addOns ?? []).map((a) => a.sku)]))];
const countByType = (fields: Rec[]) =>
  fields.reduce<Record<string, number>>((counts, { type }) => {
    const key = String(type);
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});

const luhnCheck = (digits: unknown) => {
  if (typeof digits !== "string" || digits === "") return false;
  if ([...digits].some((ch) => ch < "0" || ch > "9")) return false;
  const total = [...digits]
    .reverse()
    .map(Number)
    .map((d, i) => (i % 2 === 0 ? d : d * 2 > 9 ? d * 2 - 9 : d * 2))
    .reduce((s, d) => s + d, 0);
  return total % 10 === 0;
};

const DEFAULTS: Record<string, string> = {
  fullName: "",
  email: "",
  username: "",
  password: "",
  confirm: "",
  phone: "",
  address: "",
  city: "",
  postcode: "",
  country: "US",
  note: "",
  cardNumber: "",
  expiry: "",
  cvc: "",
};

const summarize = ({ fullName = "Anonymous", email = "no email", address }: { fullName?: string; email?: string; address?: { city?: string } | null } = {}) =>
  `${fullName} <${email}> · ${address?.city ?? "unknown city"}`;
const withDefaults = (values: Rec | undefined, defaults: Rec = DEFAULTS) =>
  Object.fromEntries(Object.entries(defaults).map(([key, fallback]) => [key, values?.[key] ?? fallback]));
const compact = (values: Rec | undefined) =>
  Object.fromEntries(Object.entries(values ?? {}).filter(([, v]) => v !== null && v !== undefined && !(typeof v === "string" && v.trim() === "")));
const withoutSecrets = (values: Rec) => {
  const { password, confirm, cvc, cardNumber, ...safe } = values;
  void password;
  void confirm;
  void cvc;
  void cardNumber;
  return safe;
};

// ── lesson 4: strings ──

const cleanText = (value: unknown) => String(value ?? "").normalize("NFC").trim().split(/\s+/).join(" ");
const titleCase = (text: unknown) =>
  cleanText(text)
    .split(" ")
    .map((word) => {
      const [first = "", ...rest] = word;
      return first.toUpperCase() + rest.join("").toLowerCase();
    })
    .join(" ");
const digitsOnly = (value: unknown) => [...String(value ?? "")].filter((ch) => ch >= "0" && ch <= "9").join("");
const chunk = (text: string, size: number) => Array.from({ length: Math.ceil(text.length / size) }, (_, i) => text.slice(i * size, (i + 1) * size));
const formatCardNumber = (value: unknown) => chunk(digitsOnly(value).slice(0, 19), 4).join(" ");
const maskCard = (value: unknown) => {
  const digits = digitsOnly(value);
  if (digits.length <= 4) return "•".repeat(digits.length);
  return "•••• ".repeat(Math.ceil((digits.length - 4) / 4)) + digits.slice(-4);
};
const formatMoney = (cents: unknown) => {
  if (typeof cents !== "number" || !Number.isFinite(cents)) return "$0.00";
  const sign = cents < 0 ? "-" : "";
  const whole = Math.abs(Math.round(cents));
  return `${sign}$${Math.floor(whole / 100).toLocaleString("en-US")}.${String(whole % 100).padStart(2, "0")}`;
};

// ── lessons 5-7: regular expressions ──

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const USERNAME_RE = /^[a-z][a-z0-9_-]{2,19}$/i;
const CVC_RE = /^\d{3,4}$/;
const isEmail = (v: unknown) => typeof v === "string" && v.length <= 254 && EMAIL_RE.test(v);
const isUsername = (v: unknown) => typeof v === "string" && USERNAME_RE.test(v);
const isCvc = (v: unknown) => typeof v === "string" && CVC_RE.test(v);
const isCardNumber = (v: unknown) => {
  if (typeof v !== "string" || !/^[\d -]+$/.test(v)) return false;
  const digits = digitsOnly(v);
  return /^\d{13,19}$/.test(digits) && luhnCheck(digits);
};

const PHONE_RE = new RegExp(String.raw`^(?<area>\d{3})(?<exchange>\d{3})(?<line>\d{4})$`);
const formatPhone = (raw: unknown) => {
  let digits = digitsOnly(raw);
  if (digits.length === 11 && digits.startsWith("1")) digits = digits.slice(1);
  if (!PHONE_RE.test(digits)) return null;
  return digits.replace(PHONE_RE, "($<area>) $<exchange>-$<line>");
};

const POSTCODE_RULES: Record<string, { pattern: RegExp; format: (g: Record<string, string>) => string }> = {
  US: { pattern: new RegExp(String.raw`^(?<zip>\d{5})(?:[-\s]?(?<plus4>\d{4}))?$`), format: ({ zip, plus4 }) => (plus4 ? `${zip}-${plus4}` : zip) },
  GB: { pattern: new RegExp(String.raw`^(?<outward>[A-Z]{1,2}\d[A-Z\d]?)\s*(?<inward>\d[A-Z]{2})$`, "i"), format: ({ outward, inward }) => `${outward} ${inward}`.toUpperCase() },
  CA: { pattern: new RegExp(String.raw`^(?<fsa>[A-Z]\d[A-Z])\s*(?<ldu>\d[A-Z]\d)$`, "i"), format: ({ fsa, ldu }) => `${fsa} ${ldu}`.toUpperCase() },
};
const normalizePostcode = (country: unknown, raw: unknown) => {
  if (!Object.hasOwn(POSTCODE_RULES, country as string)) return null;
  const { pattern, format } = POSTCODE_RULES[country as string];
  const match = pattern.exec(cleanText(raw));
  return match ? format(match.groups as Record<string, string>) : null;
};

const EXPIRY_RE = new RegExp(String.raw`^(?<month>0?[1-9]|1[0-2])\s*[/-]\s*(?<year>\d{4}|\d{2})$`);
const parseExpiry = (text: unknown) => {
  const match = EXPIRY_RE.exec(cleanText(text));
  if (!match?.groups) return null;
  const month = Number(match.groups.month);
  const year = Number(match.groups.year);
  return { month, year: year < 100 ? 2000 + year : year };
};

const CARD_RUN_RE = /\b(?:\d[ -]?){12,18}\d\b/g;
const redactCards = (text: unknown) => String(text ?? "").replace(CARD_RUN_RE, (run) => `[card ending ${digitsOnly(run).slice(-4)}]`);

const RESERVED = ["admin", "root", "support", "staff", "c++"];
const COMMON_PASSWORDS = new Set(["password", "password1", "password123", "123456", "12345678", "qwerty", "letmein", "iloveyou", "welcome1", "admin123"]);
const PASSWORD_RULES = [
  { id: "length", label: "At least 10 characters", pattern: new RegExp(String.raw`^(?=[\s\S]{10,}$)`, "u") },
  { id: "lower", label: "A lowercase letter", pattern: new RegExp(String.raw`^(?=[\s\S]*\p{Ll})`, "u") },
  { id: "upper", label: "An uppercase letter", pattern: new RegExp(String.raw`^(?=[\s\S]*\p{Lu})`, "u") },
  { id: "digit", label: "A number", pattern: new RegExp(String.raw`^(?=[\s\S]*\p{Nd})`, "u") },
  { id: "symbol", label: "A symbol or punctuation mark", pattern: new RegExp(String.raw`^(?=[\s\S]*[^\p{L}\p{N}\s])`, "u") },
];
const passwordRules = (password: unknown) => {
  const text = String(password ?? "");
  return PASSWORD_RULES.map(({ id, label, pattern }) => ({ id, label, ok: pattern.test(text) }));
};
const passwordScore = (password: unknown) => {
  const text = String(password ?? "");
  if (text === "") return 0;
  if (COMMON_PASSWORDS.has(text.toLowerCase())) return 0;
  const rules = passwordRules(text);
  let score = rules.filter((r) => r.ok).length - 1;
  if (/(.)\1{2,}/u.test(text)) score -= 1;
  if (!rules.find((r) => r.id === "length")?.ok) score = Math.min(score, 1);
  if ([...text].length >= 16) score += 1;
  return Math.min(4, Math.max(0, score));
};
const escapeRegExp = (text: unknown) => String(text).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const containsBanned = (text: unknown, words: unknown) => {
  const alternatives = ((words as unknown[]) ?? []).map((w) => escapeRegExp(String(w).trim())).filter(Boolean);
  if (alternatives.length === 0) return false;
  const pattern = new RegExp(String.raw`(?<![\p{L}\p{N}])(?:${alternatives.join("|")})(?![\p{L}\p{N}])`, "iu");
  return pattern.test(String(text ?? ""));
};

// ── lessons 8-10: errors and JSON ──

class ValidationError extends Error {
  field: string;
  code: string;
  constructor(message: string, { field = "", code = "invalid", cause }: { field?: string; code?: string; cause?: unknown } = {}) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = "ValidationError";
    this.field = field;
    this.code = code;
  }
}

function errorChain(error: unknown): string[] {
  const chain: string[] = [];
  let current: unknown = error;
  while (current !== undefined && chain.length < 10) {
    if (current instanceof Error) {
      chain.push(`${current.name}: ${current.message}`);
      current = current.cause;
    } else {
      chain.push(String(current));
      break;
    }
  }
  return chain;
}

interface Today {
  year: number;
  month: number;
}
interface Context {
  today: Today;
}

function assertExpiry(text: unknown, today: Today) {
  const expiry = parseExpiry(text);
  if (!expiry) throw new ValidationError("Use the format MM/YY, like 08/28", { field: "expiry", code: "format" });
  const expired = expiry.year < today.year || (expiry.year === today.year && expiry.month < today.month);
  if (expired) throw new ValidationError(`This card expired in ${String(expiry.month).padStart(2, "0")}/${expiry.year}`, { field: "expiry", code: "expired" });
  return expiry;
}

const attempts = { started: 0, finished: 0, failed: 0 };
function attempt<T>(task: () => T) {
  attempts.started++;
  try {
    return { ok: true as const, value: task() };
  } catch (error) {
    if (!(error instanceof ValidationError)) throw error;
    attempts.failed++;
    return { ok: false as const, error: { name: error.name, message: error.message, field: error.field, code: error.code, chain: errorChain(error) } };
  } finally {
    attempts.finished++;
  }
}
const attemptStats = () => ({ ...attempts });
const checkExpiry = (text: unknown, today: Today) => attempt(() => assertExpiry(text, today));

function readJson(text: unknown, reviver?: (key: string, value: unknown) => unknown) {
  if (typeof text !== "string") throw new ValidationError("Expected JSON text", { code: "type" });
  try {
    return JSON.parse(text, reviver);
  } catch (error) {
    if (error instanceof SyntaxError) throw new ValidationError("That text is not valid JSON", { code: "json", cause: error });
    throw error;
  }
}
const parseJson = (text: unknown) => attempt(() => readJson(text));
const draftReviver = (key: string, value: unknown) => {
  if (key === "postcode" && typeof value === "number") return String(value).padStart(5, "0");
  if (key === "phone" && typeof value === "number") return String(value);
  return value;
};
const loadDraft = (text: unknown) =>
  attempt(() => {
    const data = readJson(text, draftReviver);
    if (data === null || typeof data !== "object" || Array.isArray(data)) throw new ValidationError("A saved draft must be a JSON object", { code: "shape" });
    return Object.fromEntries(
      Object.keys(DEFAULTS)
        .filter((key) => Object.hasOwn(data as object, key) && typeof (data as Rec)[key] === "string")
        .map((key) => [key, (data as Rec)[key]]),
    );
  });

const SECRET_KEYS = new Set(["password", "confirm", "cvc", "cardNumber"]);
class Money {
  cents: number;
  constructor(cents: number) {
    this.cents = cents;
  }
  toJSON() {
    return { cents: this.cents, currency: "USD" };
  }
}
function serialize(value: unknown, indent = 2) {
  const text = JSON.stringify(
    value,
    (key, item) => {
      if (SECRET_KEYS.has(key)) return undefined;
      if (item === "") return undefined;
      if (typeof item === "number" && !Number.isFinite(item)) return undefined;
      if (typeof item === "bigint") return item.toString();
      return item;
    },
    indent,
  );
  return text ?? "null";
}
const orderLines = (items: Line[]) => items.flatMap(({ sku, qty, addOns = [] }) => [{ sku, qty }, ...addOns.map((a) => ({ sku: a.sku, qty }))]);
function buildPayload(values: Rec, items: Line[], submittedAt: unknown) {
  const v = withDefaults(values) as Record<string, string>;
  const submitted = new Date(submittedAt as string);
  if (Number.isNaN(submitted.getTime())) throw new ValidationError("submittedAt must be a valid date", { field: "submittedAt", code: "date" });
  return serialize({
    customer: { fullName: cleanText(v.fullName), email: cleanText(v.email).toLowerCase(), username: cleanText(v.username), phone: formatPhone(v.phone) ?? undefined },
    shipping: {
      address: cleanText(v.address),
      city: titleCase(v.city),
      postcode: normalizePostcode(v.country, v.postcode) ?? cleanText(v.postcode),
      country: v.country,
      note: redactCards(cleanText(v.note)),
    },
    payment: { cardLast4: digitsOnly(v.cardNumber).slice(-4), expiry: parseExpiry(v.expiry) ?? undefined },
    order: { items: orderLines(items), total: new Money(orderTotal(items)) },
    submittedAt: submitted,
  });
}

// ── lessons 11-14: validation ──

interface Rule {
  id: string;
  message: string;
  test: (value: unknown, values: Rec, context: Context) => boolean;
}
const currentMonth = (): Today => {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
};

const required = (message = "This field is required"): Rule => ({ id: "required", message, test: (v) => cleanText(v) !== "" });
const maxLength = (n: number, message = `Use at most ${n} characters`): Rule => ({ id: "maxLength", message, test: (v) => [...cleanText(v)].length <= n });
const matches = (pattern: RegExp, message: string, id = "format"): Rule => {
  const safe = new RegExp(pattern.source, pattern.flags.replace(/[gy]/g, ""));
  return { id, message, test: (v) => safe.test(cleanText(v)) };
};
const oneOf = (options: unknown[], message = "Choose one of the listed options"): Rule => ({ id: "oneOf", message, test: (v) => options.includes(v) });
const sameAs = (otherName: string, message = "The two values do not match"): Rule => ({ id: "sameAs", message, test: (v, values) => v === values?.[otherName] });
const optional = (rule: Rule): Rule => ({ ...rule, test: (v, values, context) => cleanText(v) === "" || rule.test(v, values, context) });
const isPresent = (v: unknown) => cleanText(v) !== "";

const FIELD_RULES: Record<string, Rule[]> = {
  fullName: [
    { id: "required", message: "Enter your full name", test: isPresent },
    { id: "length", message: "Use between 2 and 80 characters", test: (v) => [...cleanText(v)].length >= 2 && [...cleanText(v)].length <= 80 },
  ],
  email: [
    required("Enter your email address"),
    maxLength(254, "That email address is too long"),
    optional(matches(EMAIL_RE, "That doesn't look like an email address")),
  ],
  username: [
    required("Choose a username"),
    optional(matches(USERNAME_RE, "Use 3-20 letters, numbers, _ or -, starting with a letter")),
    optional({ id: "reserved", message: "That username is reserved", test: (v) => !containsBanned(v, RESERVED) }),
  ],
  password: [
    { id: "required", message: "Choose a password", test: (v) => String(v) !== "" },
    ...PASSWORD_RULES.map((r) => ({ id: r.id, message: r.label, test: (v: unknown) => r.pattern.test(String(v)) })),
  ],
  phone: [{ id: "format", message: "Use a 10-digit phone number", test: (v) => !isPresent(v) || formatPhone(v) !== null }],
  address: [
    { id: "required", message: "Enter your street address", test: isPresent },
    { id: "length", message: "Keep the address under 120 characters", test: (v) => [...cleanText(v)].length <= 120 },
  ],
  city: [{ id: "required", message: "Enter your city", test: isPresent }],
  postcode: [
    { id: "required", message: "Enter your postcode", test: isPresent },
    { id: "format", message: "That postcode doesn't match the country", test: (v, values) => normalizePostcode(values.country, v) !== null },
  ],
  cardNumber: [
    { id: "required", message: "Enter your card number", test: isPresent },
    { id: "format", message: "Enter a valid card number", test: (v) => isCardNumber(cleanText(v)) },
  ],
  expiry: [
    { id: "required", message: "Enter the expiry date", test: isPresent },
    { id: "format", message: "Use the format MM/YY", test: (v) => parseExpiry(v) !== null },
    {
      id: "expired",
      message: "This card has expired",
      test: (v, _values, context) => {
        const result = checkExpiry(v, context.today);
        return result.ok || result.error.code !== "expired";
      },
    },
  ],
  cvc: [
    { id: "required", message: "Enter the security code", test: isPresent },
    { id: "format", message: "Use 3 or 4 digits", test: (v) => isCvc(cleanText(v)) },
  ],
  confirm: [required("Re-enter your password"), sameAs("password", "The passwords don't match")],
  country: [oneOf(["US", "GB", "CA"], "Choose US, GB or CA")],
  note: [maxLength(200, "Keep the note under 200 characters")],
};

function checkField(name: unknown, values: Rec | undefined, context: Context = { today: currentMonth() }) {
  const rules = Object.hasOwn(FIELD_RULES, name as string) ? FIELD_RULES[name as string] : [];
  const value = values?.[name as string] ?? "";
  return rules.map(({ id, message, test }) => ({ id, message, ok: Boolean(test(value, values ?? {}, context)) }));
}
const fieldErrors = (name: unknown, values: Rec | undefined, context?: Context) =>
  checkField(name, values, context)
    .filter((r) => !r.ok)
    .map((r) => r.message);
const validateAll = (values: Rec | undefined, names: string[] = Object.keys(FIELD_RULES), context?: Context) =>
  Object.fromEntries(names.map((name) => [name, fieldErrors(name, values, context)]).filter(([, m]) => (m as string[]).length > 0));

// lesson 13: the server
const CATALOG: Record<string, number> = { "KB-01": 8900, "MS-07": 2950, "CB-12": 1200, "WR-02": 1500 };
const HTML_ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const escapeHtml = (text: unknown) => String(text ?? "").replace(/[&<>"']/g, (ch) => HTML_ESCAPES[ch]);
const INVISIBLE_RE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u200b-\u200d\u2060\ufeff\u202a-\u202e\u2066-\u2069]/g;
const sanitizeValues = (values: Rec | undefined) =>
  Object.fromEntries(
    Object.entries(withDefaults(values)).map(([key, value]) => {
      if (typeof value !== "string") return [key, DEFAULTS[key]];
      if (key === "password" || key === "confirm") return [key, value];
      return [key, [...cleanText(value.replace(INVISIBLE_RE, ""))].slice(0, 200).join("")];
    }),
  );
const CLIENT_FIELDS = ["fullName", "email", "username", "phone", "address", "city", "postcode", "country", "note"];

function checkLines(order: Rec | undefined) {
  const lines = order?.items;
  if (!Array.isArray(lines) || lines.length === 0) return { problems: ["Add at least one item"], total: null as number | null };
  if (lines.length > 50) return { problems: ["Too many order lines"], total: null };
  const problems: string[] = [];
  let total = 0;
  for (const line of lines as Rec[]) {
    const known = Object.hasOwn(CATALOG, line?.sku as string);
    const qty = line?.qty;
    const qtyOk = Number.isInteger(qty) && (qty as number) >= 1 && (qty as number) <= 99;
    if (!known) problems.push(`Unknown item: ${escapeHtml(String(line?.sku).slice(0, 30))}`);
    else if (!qtyOk) problems.push(`Bad quantity for ${String(line.sku)}`);
    else total += CATALOG[line.sku as string] * (qty as number);
  }
  if (problems.length === 0 && (order?.total as Rec | undefined)?.cents !== total) problems.push("The total does not match the items");
  return { problems, total };
}

function handleSubmit(bodyText: unknown, context: Context = { today: currentMonth() }) {
  const parsed = parseJson(bodyText);
  if (!parsed.ok) return { status: 400, errors: { body: [parsed.error.message] } };
  const body = parsed.value;
  if (body === null || typeof body !== "object" || Array.isArray(body)) return { status: 400, errors: { body: ["The request body must be a JSON object"] } };
  const { customer, shipping, payment, order } = body as Rec;
  const c = customer as Rec | undefined;
  const s = shipping as Rec | undefined;
  const p = payment as Rec | undefined;
  const flat = sanitizeValues({
    fullName: c?.fullName,
    email: c?.email,
    username: c?.username,
    phone: c?.phone,
    address: s?.address,
    city: s?.city,
    postcode: s?.postcode,
    country: s?.country,
    note: s?.note,
  });
  const errors: Record<string, string[]> = validateAll(flat, CLIENT_FIELDS, context);
  if (!/^\d{4}$/.test(String(p?.cardLast4))) errors.payment = ["cardLast4 must be four digits"];
  const exp = p?.expiry as Rec | undefined;
  const expiry = checkExpiry(`${exp?.month}/${exp?.year}`, context.today);
  if (!expiry.ok) errors.expiry = [expiry.error.message];
  const { problems, total } = checkLines(order as Rec | undefined);
  if (problems.length > 0) errors.order = problems;
  if (Object.keys(errors).length > 0) return { status: 422, errors };
  return { status: 201, total: { cents: total, currency: "USD" } };
}

// lesson 14: the schema
interface FieldSpec {
  normalize?: (value: unknown, all: Rec) => unknown;
  when?: (values: Rec) => boolean;
  rules: Rule[];
}
const SCHEMA: Record<string, FieldSpec> = {
  fullName: { normalize: cleanText, rules: FIELD_RULES.fullName },
  email: { normalize: (v) => cleanText(v).toLowerCase(), rules: FIELD_RULES.email },
  username: { normalize: cleanText, rules: FIELD_RULES.username },
  password: { rules: FIELD_RULES.password },
  confirm: { rules: FIELD_RULES.confirm },
  phone: { normalize: (v) => formatPhone(v) ?? cleanText(v), rules: FIELD_RULES.phone },
  address: { normalize: cleanText, rules: FIELD_RULES.address },
  city: { normalize: titleCase, rules: FIELD_RULES.city },
  postcode: { normalize: (v, all) => normalizePostcode(all.country, v) ?? cleanText(v), rules: FIELD_RULES.postcode },
  country: { rules: FIELD_RULES.country },
  note: { normalize: (v) => redactCards(cleanText(v)), rules: FIELD_RULES.note },
  cardNumber: { normalize: (v) => (/^[\d -]+$/.test(cleanText(v)) ? formatCardNumber(v) : cleanText(v)), rules: FIELD_RULES.cardNumber },
  expiry: { normalize: cleanText, rules: FIELD_RULES.expiry },
  cvc: { normalize: cleanText, rules: FIELD_RULES.cvc },
};

function validateForm(values: Rec | undefined | null, schema: Record<string, FieldSpec> = SCHEMA, context: Context = { today: currentMonth() }) {
  const source: Rec = (values ?? {}) as Rec;
  const normalized: Rec = {};
  for (const [name, field] of Object.entries(schema)) {
    const raw = source[name] ?? "";
    normalized[name] = field.normalize ? field.normalize(raw, source) : raw;
  }
  const errors: Record<string, string[]> = {};
  for (const [name, field] of Object.entries(schema)) {
    if (field.when && !field.when(normalized)) continue;
    const messages = field.rules.filter((rule) => !rule.test(normalized[name], normalized, context)).map((rule) => rule.message);
    if (messages.length > 0) errors[name] = messages;
  }
  return { valid: Object.keys(errors).length === 0, errors, values: normalized };
}

const contextFor = (submittedAt: unknown): Context => {
  const date = new Date(submittedAt as string);
  return { today: { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 } };
};
function submitForm(values: Rec, items: Line[], submittedAt: unknown, context: Context = contextFor(submittedAt)) {
  const checked = validateForm(values, SCHEMA, context);
  if (!checked.valid) return { ok: false, status: 422, stage: "client", errors: checked.errors };
  const built = attempt(() => buildPayload(checked.values, items, submittedAt));
  if (!built.ok) return { ok: false, status: 400, stage: "client", errors: { submittedAt: [built.error.message] } };
  const response = handleSubmit(built.value, context);
  return { ok: response.status === 201, stage: "server", ...response, body: built.value };
}

/** Every hook the scene (or the fuzzer) can call, with the names the learner uses. */
export const FORM_FORGE_HOOKS = {
  requiredFields,
  findField,
  hasType,
  allFilled,
  lastRequired,
  orderTotal,
  sortByPrice,
  allSkus,
  countByType,
  luhnCheck,
  summarize,
  withDefaults,
  compact,
  withoutSecrets,
  cleanText,
  titleCase,
  digitsOnly,
  formatCardNumber,
  maskCard,
  formatMoney,
  isEmail,
  isUsername,
  isCvc,
  isCardNumber,
  formatPhone,
  normalizePostcode,
  parseExpiry,
  redactCards,
  passwordRules,
  passwordScore,
  escapeRegExp,
  containsBanned,
  checkExpiry,
  attemptStats,
  parseJson,
  loadDraft,
  buildPayload,
  checkField,
  fieldErrors,
  validateAll,
  escapeHtml,
  sanitizeValues,
  handleSubmit,
  validateForm,
  submitForm,
};

export function formForgeDemoProgram(): ProgramHandle {
  return createStaticProgram({ hooks: FORM_FORGE_HOOKS as unknown as Record<string, (...args: never[]) => unknown> });
}
