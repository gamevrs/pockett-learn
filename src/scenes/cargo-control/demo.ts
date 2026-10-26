import { createStaticProgram, type ProgramHandle } from "@/engine/program";

/**
 * A JavaScript stand-in for a finished Cargo Bay program (the reference solution, ported), so
 * the landing page can run the depot without loading Python. It implements exactly the functions
 * the scene calls once every lesson is passed.
 */

const MAX_GROSS_KG = 30480;
const IMPOSSIBLE_KG = 40000;
const CATEGORIES = ["general", "refrigerated", "hazardous", "bulk"];

type Rec = Record<string, unknown>;
const isRec = (v: unknown): v is Rec => !!v && typeof v === "object" && !Array.isArray(v);
const pyType = (v: unknown) => (v === null ? "NoneType" : Array.isArray(v) ? "list" : typeof v === "string" ? "str" : typeof v === "boolean" ? "bool" : typeof v === "number" ? (Number.isInteger(v) ? "int" : "float") : "dict");

interface Failure {
  error: string;
  message: string;
  disposition: "REJECT" | "QUARANTINE";
  field?: string;
  crateId?: unknown;
  line?: number;
  column?: number;
  problems?: { field: string; message: string }[];
  chain?: string[];
}

const fail = (f: Failure): never => {
  throw f;
};
const isFailure = (e: unknown): e is Failure => !!e && typeof e === "object" && "disposition" in e;

const crateIdOf = (m: unknown) => (isRec(m) ? m.container_id ?? null : null);

function checkStructure(m: unknown) {
  if (!isRec(m)) fail({ error: "MalformedManifestError", message: `manifest must be an object, got ${pyType(m)}`, disposition: "REJECT" });
  const man = m as Rec;
  const id = crateIdOf(man);
  for (const field of ["container_id", "weight_kg"]) {
    if (!(field in man)) fail({ error: "MissingFieldError", message: `missing field: ${field}`, disposition: "REJECT", field, crateId: id });
  }
  const w = man.weight_kg;
  if (typeof w !== "number") fail({ error: "InvalidWeightError", message: `weight_kg must be a number, got ${pyType(w)}`, disposition: "REJECT", field: "weight_kg", crateId: id });
  if (!Number.isFinite(w as number) || (w as number) <= 0 || (w as number) > IMPOSSIBLE_KG) {
    fail({ error: "InvalidWeightError", message: `impossible weight: ${w}`, disposition: "REJECT", field: "weight_kg", crateId: id });
  }
}

function checkWeightLimit(m: Rec) {
  if ((m.weight_kg as number) > MAX_GROSS_KG) {
    fail({ error: "OverweightError", message: `${m.weight_kg} kg is over the ${MAX_GROSS_KG} kg limit`, disposition: "QUARANTINE", field: "weight_kg", crateId: crateIdOf(m) });
  }
}

function checkCustoms(m: Rec) {
  const c = m.customs;
  if (!(isRec(c) && c.cleared === true)) fail({ error: "CustomsHoldError", message: "customs has not cleared this crate", disposition: "QUARANTINE", field: "customs", crateId: crateIdOf(m) });
}

function triage(m: unknown) {
  try {
    checkStructure(m);
    checkWeightLimit(m as Rec);
    checkCustoms(m as Rec);
  } catch (e) {
    if (!isFailure(e)) throw e;
    return { decision: e.disposition, error: e.error, reason: e.message, field: e.field ?? null, crate_id: e.crateId ?? null };
  }
  return { decision: "LOAD", error: null, reason: "all clear", field: null, crate_id: crateIdOf(m) };
}

function weightReport(m: unknown) {
  const chain: string[] = [];
  const id = crateIdOf(m);
  if (!isRec(m)) {
    chain.push(`MalformedManifestError: manifest must be an object, got ${pyType(m)}`, "TypeError: indices must be integers or slices");
  } else if (!("weight_kg" in m)) {
    chain.push("MissingFieldError: missing field: weight_kg", "KeyError: 'weight_kg'");
  } else {
    const raw = m.weight_kg;
    const n = typeof raw === "number" ? raw : typeof raw === "string" && raw.trim() !== "" ? Number(raw) : NaN;
    if (typeof raw !== "number" && typeof raw !== "string") {
      chain.push(`InvalidWeightError: cannot read a weight from ${JSON.stringify(raw)}`, "TypeError: float() argument must be a string or a real number");
    } else if (Number.isNaN(n) && typeof raw === "string") {
      chain.push(`InvalidWeightError: cannot read a weight from '${raw}'`, `ValueError: could not convert string to float: '${raw}'`);
    } else if (!Number.isFinite(n) || n <= 0) {
      chain.push(`InvalidWeightError: impossible weight: ${n}`);
    } else return { ok: true, weight: n, chain: [] as string[], crate: id };
  }
  return { ok: false, weight: null, chain };
}

// ── reading ──

function lineColumn(raw: string, pos: number) {
  const before = raw.slice(0, pos);
  const line = before.split("\n").length;
  return { line, column: pos - before.lastIndexOf("\n") };
}

function safeRead(text: unknown) {
  const bad = (error: string, message: string, line: number | null = null, column: number | null = null) => ({ ok: false, manifest: null, error, message, line, column });
  if (typeof text !== "string") return bad("MalformedManifestError", `manifest text expected, got ${pyType(text)}`);
  try {
    const data: unknown = JSON.parse(text);
    if (!isRec(data)) return bad("MalformedManifestError", `manifest must be a JSON object, got ${pyType(data)}`);
    return { ok: true, manifest: data, error: null, message: null, line: null, column: null };
  } catch (err) {
    const m = /position (\d+)/.exec(String((err as Error).message));
    const at = m ? lineColumn(text, Number(m[1])) : { line: 1, column: 1 };
    return bad("InvalidJSONError", `Invalid JSON (line ${at.line}, column ${at.column})`, at.line, at.column);
  }
}

// ── validation ──

const SCHEMA = {
  container_id: { type: "string", required: true, pattern: "[A-Z]{3}[UJZ][0-9]{7}", check: "iso6346" },
  owner: { type: "string", required: true, min_length: 1 },
  contact: { type: "string", required: true, pattern: "[^@\\s]+@[^@\\s]+\\.[^@\\s]+" },
  weight_kg: { type: "number", required: true, min: 1, max: 40000 },
  category: { type: "string", required: true, enum: CATEGORIES },
  pieces: { type: "integer", required: true, min: 1 },
  route: {
    type: "object",
    fields: {
      origin: { type: "string", required: true, min_length: 1 },
      destination: { type: "string", required: true, min_length: 1 },
    },
  },
  customs: { type: "object", fields: { cleared: { type: "boolean" } } },
};

const LETTERS: Record<string, number> = {};
{
  let n = 10;
  for (const ch of "ABCDEFGHIJKLMNOPQRSTUVWXYZ") {
    if (n % 11 === 0) n++;
    LETTERS[ch] = n++;
  }
}
function validContainer(v: unknown): boolean {
  if (typeof v !== "string" || !/^[A-Z]{3}[UJZ][0-9]{7}$/.test(v)) return false;
  let total = 0;
  for (let i = 0; i < 10; i++) total += (/[A-Z]/.test(v[i]) ? LETTERS[v[i]] : Number(v[i])) * 2 ** i;
  return (total % 11) % 10 === Number(v[10]);
}

const TYPES: Record<string, (v: unknown) => boolean> = {
  string: (v) => typeof v === "string",
  number: (v) => typeof v === "number" && Number.isFinite(v),
  integer: (v) => typeof v === "number" && Number.isInteger(v),
  boolean: (v) => typeof v === "boolean",
  object: isRec,
  array: Array.isArray,
};

interface Rule {
  type?: string;
  required?: boolean;
  min?: number;
  max?: number;
  min_length?: number;
  enum?: string[];
  pattern?: string;
  check?: string;
  fields?: Record<string, Rule>;
}

function validate(data: unknown, schema: Record<string, Rule>, path = ""): { field: string; message: string }[] {
  if (!isRec(data)) return [{ field: path.replace(/\.$/, "") || "(root)", message: `must be an object, got ${pyType(data)}` }];
  const out: { field: string; message: string }[] = [];
  for (const [name, rules] of Object.entries(schema)) {
    const where = path + name;
    const value = data[name];
    if (value === null || value === undefined) {
      if (rules.required) out.push({ field: where, message: "is required" });
      continue;
    }
    if (rules.type && !(TYPES[rules.type]?.(value) ?? false)) {
      out.push({ field: where, message: `must be of type ${rules.type}` });
      continue;
    }
    if (rules.min !== undefined && typeof value === "number" && value < rules.min) out.push({ field: where, message: `must be at least ${rules.min}` });
    if (rules.max !== undefined && typeof value === "number" && value > rules.max) out.push({ field: where, message: `must be at most ${rules.max}` });
    if (rules.min_length !== undefined && typeof value === "string" && value.trim().length < rules.min_length) out.push({ field: where, message: `must have at least ${rules.min_length} characters` });
    if (rules.enum && !rules.enum.includes(value as string)) out.push({ field: where, message: `must be one of: ${rules.enum.join(", ")}` });
    if (rules.pattern && !(typeof value === "string" && new RegExp(`^(?:${rules.pattern})$`).test(value))) out.push({ field: where, message: "has the wrong format" });
    if (rules.check === "iso6346" && !validContainer(value)) out.push({ field: where, message: "failed the iso6346 check" });
    if (rules.fields) out.push(...validate(value, rules.fields, where + "."));
  }
  return out;
}

// ── receipts, audit, log ──

function sorted(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(sorted);
  if (isRec(v)) return Object.fromEntries(Object.keys(v).sort().map((k) => [k, sorted(v[k])]));
  return v;
}

export function cargoControlDemoProgram(): ProgramHandle {
  let bays = 0;
  const audit: { crate_id: unknown; status: string; decision: string | null; sealed: boolean }[] = [];
  const log: string[] = [];
  const write = (level: string, text: string) => {
    log.push(`${level} depot.gate: ${text}`);
    if (log.length > 200) log.shift();
  };

  const processManifest = (text: unknown) => {
    let crateId: unknown = null;
    let problems: { field: string; message: string }[] = [];
    let line: number | null = null;
    let column: number | null = null;
    let verdict: { decision: string; reasons: string[]; error: string | null };
    const read = safeRead(text);
    if (!read.ok) {
      verdict = { decision: "REJECT", reasons: [String(read.message)], error: read.error };
      line = read.line;
      column = read.column;
    } else {
      const man = read.manifest as Rec;
      crateId = crateIdOf(man);
      problems = validate(man, SCHEMA as Record<string, Rule>);
      if (problems.length > 0) {
        verdict = { decision: "REJECT", reasons: problems.map((p) => `${p.field} ${p.message}`), error: "ValidationError" };
      } else {
        const reasons: string[] = [];
        let error: string | null = null;
        for (const check of [checkWeightLimit, checkCustoms]) {
          try {
            check(man);
          } catch (e) {
            if (!isFailure(e)) throw e;
            reasons.push(e.message);
            error = error ?? e.error;
          }
        }
        verdict = reasons.length > 0 ? { decision: "QUARANTINE", reasons, error } : { decision: "LOAD", reasons: [], error: null };
      }
    }
    const summary = verdict.reasons.join("; ");
    if (verdict.decision === "LOAD") write("INFO", `crate ${crateId} -> LOAD`);
    else if (verdict.decision === "QUARANTINE") write("WARNING", `crate ${crateId} -> QUARANTINE: ${summary}`);
    else write("ERROR", `crate ${crateId} -> REJECT: ${summary}`);
    return { ...verdict, crate_id: crateId, problems, line, column };
  };

  return createStaticProgram({
    vars: { SCHEMA },
    hooks: {
      triage,
      weight_report: weightReport,
      safe_read: safeRead,
      validate: ((data: unknown, schema: Record<string, Rule>) => validate(data, schema)) as never,
      process_manifest: processManifest,
      bays_open: () => bays,
      handle_crate: ((m: unknown) => {
        const id = crateIdOf(m);
        const entry = { crate_id: id, status: "open", decision: null as string | null, sealed: false };
        audit.push(entry);
        bays++;
        const verdict = triage(m);
        entry.decision = verdict.decision;
        entry.status = "closed";
        entry.sealed = true;
        bays--;
        return { crate_id: id, decision: verdict.decision, reason: verdict.reason, bay: (audit.length % 4) + 1, audit: entry.status };
      }) as never,
      recent_audit: ((n = 6) => audit.slice(-n)) as never,
      stamp: ((m: unknown) => {
        const v = triage(m);
        const w = isRec(m) && typeof m.weight_kg === "number" && Number.isFinite(m.weight_kg) ? m.weight_kg : null;
        return JSON.stringify(sorted({ crate_id: v.crate_id, decision: v.decision, reasons: [v.reason], received: new Date().toISOString().slice(0, 10), weight_kg: w }), null, 2);
      }) as never,
      log_lines: ((n = 8) => log.slice(-n)) as never,
    },
  });
}
