import type { ProgramHandle } from "@/engine/program";

/**
 * One crate at the scanner: call the learner's functions, in the order of the course, and turn
 * whatever they return (or however they fail) into plain display data.
 *
 * Rules this file follows:
 *  - a function is called only when its lesson's feature is unlocked AND the program defines it;
 *  - nothing the learner returns is trusted: None, the wrong type or a missing key all degrade to
 *    a calm "waiting" row instead of throwing;
 *  - a hook that raises is a *crash*: we record the real error type and message from Python.
 */

export type Decision = "LOAD" | "QUARANTINE" | "REJECT";
export type Outcome = Decision | "HELD" | "UNSORTED" | "CRASH";
export type RowState = "locked" | "waiting" | "ok" | "warn" | "bad" | "crash" | "skip";
export type RowId = "read" | "weigh" | "check" | "route" | "dock" | "receipt" | "final";

export interface Row {
  id: RowId;
  title: string;
  /** The lesson that first brings this row to life. */
  lesson: number;
  /** The learner function currently powering the row (the latest version unlocked). */
  fn: string;
  state: RowState;
  text: string;
  tags: string[];
  /** The receipt document, for the receipt row. */
  receipt?: string;
}

export interface Flag {
  field: string;
  text: string;
}

export interface Crash {
  fn: string;
  type: string;
  message: string;
}

export interface Inspection {
  raw: string;
  /** False when the text could not be turned into a manifest at all. */
  readable: boolean;
  rows: Row[];
  outcome: Outcome;
  reasons: string[];
  /** The depot error that stopped this crate, for the tally. */
  errorType: string | null;
  crashes: Crash[];
  /** Fields to light up in the manifest viewer. */
  flags: Flag[];
  /** Where the parser gave up (1-based), when the learner's reader reported it. */
  parseAt: { line: number; column: number } | null;
  readMessage: string | null;
  logLines: string[] | null;
  baysHeld: number | null;
  audit: { crate: string; status: string }[];
}

const FEATURE: Record<RowId, string> = {
  read: "cc-gate",
  weigh: "cc-gate",
  check: "cc-fields",
  route: "cc-routing",
  dock: "cc-docks",
  receipt: "cc-receipt",
  final: "cc-chaos",
};

const TITLE: Record<RowId, string> = {
  read: "Read",
  weigh: "Weigh",
  check: "Validate",
  route: "Route",
  dock: "Dock",
  receipt: "Receipt",
  final: "Pipeline",
};

const LESSON: Record<RowId, number> = { read: 1, weigh: 1, check: 10, route: 4, dock: 6, receipt: 9, final: 14 };

export const ROW_ORDER: RowId[] = ["read", "weigh", "check", "route", "dock", "receipt", "final"];

/** Every stage as a locked placeholder, for the blueprint state before any code has run. */
export function blueprintRows(): Row[] {
  return ROW_ORDER.map((id) => ({ id, title: TITLE[id], lesson: LESSON[id], fn: "", state: "locked" as RowState, text: "", tags: [] }));
}

// ───────────────────────── tolerant readers ─────────────────────────

const isRec = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const rec = (v: unknown): Record<string, unknown> | null => (isRec(v) ? v : null);
const str = (v: unknown): string | null => (typeof v === "string" ? v : null);
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

const clip = (s: string, n = 96) => (s.length > n ? s.slice(0, n - 1) + "…" : s);
const kg = (n: number) => `${Number.isInteger(n) ? n : Number(n.toFixed(2))} kg`;
const typeName = (s: string) => s.split(":")[0].trim();

function problemsOf(v: unknown): Flag[] {
  return arr(v).flatMap((p) => {
    const r = rec(p);
    if (!r) return [];
    const field = str(r.field) ?? "?";
    return [{ field, text: `${field} ${str(r.message) ?? ""}`.trim() }];
  });
}

const DECISIONS: Decision[] = ["LOAD", "QUARANTINE", "REJECT"];
const asDecision = (v: unknown): Decision | null => {
  const s = typeof v === "string" ? v.toUpperCase() : "";
  return (DECISIONS as string[]).includes(s) ? (s as Decision) : null;
};
const decisionState = (d: Decision): RowState => (d === "LOAD" ? "ok" : d === "QUARANTINE" ? "warn" : "bad");

// ───────────────────────── the inspection ─────────────────────────

export function inspect(program: ProgramHandle, unlocked: ReadonlySet<string>, raw: string): Inspection {
  const crashes: Crash[] = [];
  const flags: Flag[] = [];
  const addFlag = (f: Flag) => {
    if (!flags.some((x) => x.field === f.field && x.text === f.text)) flags.push(f);
  };
  const can = (feature: string, fn: string) => unlocked.has(feature) && program.hasHook(fn);

  /** Calls a learner function. `undefined` means it raised (and has been recorded as a crash). */
  const call = <T,>(fn: string, ...args: unknown[]): T | undefined => {
    let value: T | undefined;
    try {
      value = program.call<T>(fn, ...args);
    } catch (err) {
      value = undefined;
      crashes.push({ fn, type: "Error", message: String((err as Error)?.message ?? err) });
      return undefined;
    }
    if (value === undefined) {
      const msg = program.lastError ?? `${fn}() failed`;
      const m = /^\S+\(\)\s+([\w.]+):\s*([\s\S]*)$/.exec(msg);
      crashes.push({ fn, type: m?.[1] ?? "Error", message: m?.[2] ?? msg });
    }
    return value;
  };

  const rows = new Map<RowId, Row>();
  for (const id of ROW_ORDER) {
    rows.set(id, { id, title: TITLE[id], lesson: LESSON[id], fn: "", state: unlocked.has(FEATURE[id]) ? "waiting" : "locked", text: "", tags: [] });
  }
  const row = (id: RowId) => rows.get(id)!;
  const crashRow = (r: Row, fn: string) => {
    const c = [...crashes].reverse().find((x) => x.fn === fn);
    r.state = "crash";
    r.text = clip(`${c?.type ?? "Error"}: ${c?.message ?? "crashed"}`);
  };
  const waiting = (r: Row, fn: string, why = "returned nothing usable yet") => {
    r.fn = `${fn}()`;
    r.state = "waiting";
    r.text = `${fn}() ${why}`;
  };

  // ── Read ──
  let manifest: unknown = undefined;
  let readMessage: string | null = null;
  let parseAt: Inspection["parseAt"] = null;
  let readError: string | null = null;
  {
    const r = row("read");
    if (unlocked.has("cc-reader")) {
      r.lesson = 8;
      if (!program.hasHook("safe_read")) waiting(r, "safe_read", "is not defined yet");
      else {
        r.fn = "safe_read()";
        const out = call<unknown>("safe_read", raw);
        const res = rec(out);
        if (out === undefined) crashRow(r, "safe_read");
        else if (!res) waiting(r, "safe_read");
        else if (res.ok === true) {
          manifest = res.manifest;
          r.state = "ok";
          r.text = isRec(manifest) ? `JSON object · ${Object.keys(manifest).length} fields` : "parsed";
        } else {
          readError = str(res.error) ?? "InvalidJSONError";
          readMessage = str(res.message) ?? "could not read this text";
          const line = num(res.line);
          const column = num(res.column);
          if (line !== null && column !== null) parseAt = { line, column };
          r.state = "bad";
          r.text = readError;
          r.tags = [clip(readMessage, 70)];
        }
      }
    } else if (unlocked.has("cc-gate")) {
      r.fn = "scanner";
      try {
        manifest = JSON.parse(raw);
        const kind = Array.isArray(manifest) ? "a list" : manifest === null ? "null" : typeof manifest === "object" ? "" : typeof manifest;
        r.state = kind ? "warn" : "ok";
        r.text = kind ? `valid JSON, but ${kind}, not an object` : `JSON object · ${Object.keys(manifest as object).length} fields`;
      } catch (err) {
        manifest = undefined;
        readMessage = "the built-in scanner cannot parse this text";
        r.state = "bad";
        r.text = "not valid JSON";
        r.tags = [clip(String((err as Error)?.message ?? "parse error"), 70), "lesson 8 gives you a reader"];
      }
    }
  }
  const readable = manifest !== undefined;

  // ── Weigh ── (latest unlocked version that the program defines)
  let weighError: string | null = null;
  {
    const r = row("weigh");
    const versions: [string, string, number][] = [
      ["cc-trace", "weight_report", 5],
      ["cc-tally", "weigh_crate", 3],
      ["cc-scale", "safe_weight", 2],
      ["cc-gate", "crate_weight", 1],
    ];
    const unlockedVersions = versions.filter(([f]) => unlocked.has(f));
    const pick = unlockedVersions.find(([, fn]) => program.hasHook(fn)) ?? unlockedVersions[unlockedVersions.length - 1];
    if (pick && r.state !== "locked") {
      const [, fn] = pick;
      if (!program.hasHook(fn)) waiting(r, fn, "is not defined yet");
      else {
        r.fn = `${fn}()`;
        if (!readable) {
          r.state = "skip";
          r.text = "nothing to weigh: the manifest is unreadable";
        } else {
          const out = call<unknown>(fn, manifest);
          if (out === undefined) crashRow(r, fn);
          else if (fn === "crate_weight" || fn === "safe_weight") {
            const w = num(out);
            if (w !== null) {
              r.state = "ok";
              r.text = kg(w);
            } else if (out === null && fn === "safe_weight") {
              r.state = "warn";
              r.text = "unreadable weight (None)";
            } else waiting(r, fn);
          } else {
            const o = rec(out);
            if (!o) waiting(r, fn);
            else if (fn === "weigh_crate") {
              const w = num(o.weight);
              if (o.ok === true && w !== null) {
                r.state = "ok";
                r.text = kg(w);
              } else {
                weighError = str(o.error) ?? "Error";
                r.state = "bad";
                r.text = clip(`${weighError}: ${str(o.detail) ?? ""}`);
              }
            } else {
              const chain = arr(o.chain).filter((c): c is string => typeof c === "string");
              const w = num(o.weight);
              if (o.ok === true && w !== null) {
                r.state = "ok";
                r.text = kg(w);
              } else {
                weighError = chain[0] ? typeName(chain[0]) : "Error";
                r.state = "bad";
                r.text = clip(chain[0] ?? "weighing failed");
                r.tags = chain.length > 1 ? [chain.map(typeName).join("  ←  ")] : [];
              }
            }
          }
        }
      }
    }
  }
  // a crash on a missing key tells us which field to light up
  for (const c of crashes) {
    const m = /^'?([\w]+)'?$/.exec(c.message.trim());
    if (c.type === "KeyError" && m) addFlag({ field: m[1], text: `${m[1]} is missing` });
  }

  // ── Validate ── (schema > formats > fields)
  let checkProblems: Flag[] | null = null;
  {
    const r = row("check");
    if (r.state !== "locked") {
      r.lesson = 10;
      if (!readable) {
        r.fn = "validate_manifest()";
        r.state = "skip";
        r.text = "nothing to validate";
      } else if (can("cc-schema", "validate")) {
        r.lesson = 12;
        r.fn = "validate(…, SCHEMA)";
        const out = call<unknown>("validate", manifest, program.dict("SCHEMA"));
        if (out === undefined) crashRow(r, "validate");
        else if (!Array.isArray(out)) waiting(r, "validate");
        else checkProblems = problemsOf(out);
      } else {
        const parts: string[] = [];
        const acc = { crashed: null as string | null, any: false, found: [] as Flag[] };
        const run = (fn: string) => {
          if (!program.hasHook(fn)) return;
          const out = call<unknown>(fn, manifest);
          if (out === undefined) acc.crashed = fn;
          else if (Array.isArray(out)) {
            acc.any = true;
            acc.found.push(...problemsOf(out));
          }
        };
        if (unlocked.has("cc-fields")) {
          parts.push("validate_manifest()");
          run("validate_manifest");
        }
        if (unlocked.has("cc-formats")) {
          r.lesson = 11;
          parts.push("format_problems()");
          run("format_problems");
        }
        r.fn = parts.join(" + ") || "validate_manifest()";
        if (acc.crashed) crashRow(r, acc.crashed);
        else if (!acc.any) waiting(r, parts[0]?.replace("()", "") ?? "validate_manifest", "is not defined yet");
        else checkProblems = acc.found;
      }
      if (checkProblems) {
        for (const f of checkProblems) addFlag(f);
        r.state = checkProblems.length === 0 ? "ok" : "bad";
        r.text = checkProblems.length === 0 ? "all fields pass" : `${checkProblems.length} problem${checkProblems.length === 1 ? "" : "s"} found at once`;
        r.tags = checkProblems.slice(0, 5).map((p) => clip(p.text, 52));
        if (checkProblems.length > 5) r.tags.push(`+${checkProblems.length - 5} more`);
      }
    }
  }

  // ── Route ──
  let routeDecision: Decision | null = null;
  let routeReason = "";
  let routeError: string | null = null;
  {
    const r = row("route");
    if (r.state !== "locked") {
      if (!program.hasHook("triage")) waiting(r, "triage", "is not defined yet");
      else {
        r.fn = "triage()";
        if (!readable) {
          r.state = "skip";
          r.text = "nothing to route: the manifest is unreadable";
        } else {
          const out = call<unknown>("triage", manifest);
          const o = rec(out);
          const d = o ? asDecision(o.decision) : null;
          if (out === undefined) crashRow(r, "triage");
          else if (!o || !d) waiting(r, "triage");
          else {
            routeDecision = d;
            routeReason = str(o.reason) ?? "";
            routeError = str(o.error);
            r.state = decisionState(d);
            r.text = clip(`${d}${routeReason ? " · " + routeReason : ""}`);
            if (routeError) r.tags = [routeError];
            const field = str(o.field);
            if (field && d !== "LOAD") addFlag({ field, text: `${field}: ${routeReason}` });
          }
        }
      }
    }
  }

  // ── Dock ──
  let baysHeld: number | null = null;
  let audit: Inspection["audit"] = [];
  {
    const r = row("dock");
    if (r.state !== "locked") {
      r.lesson = 6;
      const fn = can("cc-audit", "handle_crate") ? "handle_crate" : "dock";
      if (!program.hasHook(fn)) waiting(r, fn, "is not defined yet");
      else {
        r.fn = `${fn}()`;
        if (fn === "handle_crate") r.lesson = 7;
        if (!readable) {
          r.state = "skip";
          r.text = "no crate to dock";
        } else {
          const out = call<unknown>(fn, manifest);
          const o = rec(out);
          if (out === undefined) crashRow(r, fn);
          else if (!o) waiting(r, fn);
          else {
            const bay = num(o.bay);
            const bayText = bay !== null ? `Bay ${bay}` : "Bay ?";
            if (fn === "dock") {
              const loaded = o.loaded === true;
              r.state = loaded ? "ok" : "warn";
              r.text = loaded ? `${bayText} · loaded` : `${bayText} · ${str(o.error) ?? "not loaded"}`;
            } else {
              const status = str(o.audit) ?? "?";
              r.state = status === "closed" ? "ok" : "warn";
              r.text = `${bayText} · audit ${status}`;
            }
          }
        }
      }
      if (unlocked.has("cc-docks") && program.hasHook("bays_open")) {
        const n = call<unknown>("bays_open");
        baysHeld = num(n);
      }
      if (unlocked.has("cc-audit") && program.hasHook("recent_audit")) {
        audit = arr(call<unknown>("recent_audit", 4)).flatMap((e) => {
          const o = rec(e);
          return o ? [{ crate: str(o.crate_id) ?? "?", status: str(o.status) ?? "?" }] : [];
        });
      }
    }
  }

  // ── Receipt ──
  {
    const r = row("receipt");
    if (r.state !== "locked") {
      if (!program.hasHook("stamp")) waiting(r, "stamp", "is not defined yet");
      else {
        r.fn = "stamp()";
        if (!readable) {
          r.state = "skip";
          r.text = "nothing to stamp";
        } else {
          const out = call<unknown>("stamp", manifest);
          if (out === undefined) crashRow(r, "stamp");
          else if (typeof out !== "string") waiting(r, "stamp", "should return JSON text");
          else {
            r.state = "ok";
            r.text = "receipt.json";
            r.receipt = out.length > 1600 ? out.slice(0, 1600) + "\n…" : out;
          }
        }
      }
    }
  }

  // ── Pipeline (lesson 14) ──
  let finalDecision: Decision | null = null;
  let finalReasons: string[] = [];
  let finalError: string | null = null;
  let finalCrashed = false;
  {
    const r = row("final");
    if (r.state !== "locked") {
      if (!program.hasHook("process_manifest")) waiting(r, "process_manifest", "is not defined yet");
      else {
        r.fn = "process_manifest()";
        const out = call<unknown>("process_manifest", raw);
        const o = rec(out);
        const d = o ? asDecision(o.decision) : null;
        if (out === undefined) {
          finalCrashed = true;
          crashRow(r, "process_manifest");
        } else if (!o || !d) waiting(r, "process_manifest");
        else {
          finalDecision = d;
          finalReasons = arr(o.reasons).filter((x): x is string => typeof x === "string");
          finalError = str(o.error);
          r.state = decisionState(d);
          r.text = clip(`${d}${finalError ? " · " + finalError : ""}`);
          r.tags = finalReasons.slice(0, 3).map((x) => clip(x, 52));
          for (const f of problemsOf(o.problems)) addFlag(f);
          const line = num(o.line);
          const column = num(o.column);
          if (line !== null && column !== null) parseAt = { line, column };
        }
      }
    }
  }

  // ── Ops log ──
  let logLines: string[] | null = null;
  if (can("cc-oplog", "log_lines")) {
    const out = call<unknown>("log_lines", 8);
    if (Array.isArray(out)) logLines = out.filter((x): x is string => typeof x === "string").map((x) => x.split("\n")[0]);
  }

  // ── Verdict: the latest source the learner has built ──
  let outcome: Outcome;
  let reasons: string[] = [];
  let errorType: string | null = null;
  if (finalDecision) {
    outcome = finalDecision;
    reasons = finalReasons;
    errorType = finalError;
  } else if (finalCrashed) {
    outcome = "CRASH";
  } else if (routeDecision) {
    outcome = routeDecision;
    reasons = routeDecision === "LOAD" ? [] : [routeReason].filter(Boolean);
    errorType = routeError;
  } else {
    outcome = readable ? "UNSORTED" : "HELD";
    reasons = !readable && readMessage ? [clip(readMessage, 80)] : [];
  }
  if (outcome !== "LOAD" && !errorType) errorType = weighError ?? readError ?? (checkProblems && checkProblems.length > 0 ? "ValidationError" : null);
  if (outcome === "LOAD") errorType = null;

  return {
    raw,
    readable,
    rows: ROW_ORDER.map((id) => row(id)),
    outcome,
    reasons,
    errorType,
    crashes,
    flags,
    parseAt,
    readMessage,
    logLines,
    baysHeld,
    audit,
  };
}
