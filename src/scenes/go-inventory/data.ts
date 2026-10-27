import type { ProgramHandle } from "@/engine/program";
import { readAny } from "../go-basics/data";

/**
 * What the Cairn Depot ledger board reads from the learner's Go program. A compiled program can't
 * be called back, so the board works from the values the program printed with `scene("key", value)`
 * (each one an `@scene {json}` line) plus its plain output. Every value may be missing or the wrong
 * type: the readers below return `undefined` instead of guessing and never throw.
 *
 * Pure module (no React). Field names of decoded Go structs are matched case-insensitively
 * (a Go struct without tags is sent as `SKU`, `Qty`, ...).
 */

export { readAny } from "../go-basics/data";
export { adviceFor, fmtNum, outputLines, parseDiagnostics, plural, runtimeAdvice } from "../go-basics/data";
export type { BuildError } from "../go-basics/data";

// ───────────────────────── safe readers ─────────────────────────

type Rec = Record<string, unknown>;
const isRec = (v: unknown): v is Rec => !!v && typeof v === "object" && !Array.isArray(v);
const num = (v: unknown): number | undefined => (typeof v === "number" && Number.isFinite(v) ? v : undefined);
const str = (v: unknown): string | undefined => (typeof v === "string" ? v : undefined);
const bool = (v: unknown): boolean | undefined => (typeof v === "boolean" ? v : undefined);
const arr = (v: unknown): unknown[] | undefined => (Array.isArray(v) ? v : undefined);
const strList = (v: unknown): string[] | undefined => arr(v)?.map((x) => (typeof x === "string" ? x : x === null || x === undefined ? "" : String(x)));
const numList = (v: unknown): number[] | undefined => arr(v)?.flatMap((x) => (num(x) === undefined ? [] : [x as number]));

function field(o: Rec, name: string): unknown {
  if (name in o) return o[name];
  const want = name.toLowerCase();
  for (const k of Object.keys(o)) if (k.toLowerCase() === want) return o[k];
  return undefined;
}

function rows<T>(v: unknown, f: (r: Rec) => T): T[] | undefined {
  return arr(v)?.flatMap((r): T[] => (isRec(r) ? [f(r)] : []));
}

// ───────────────────────── the model ─────────────────────────

export interface ShelfRow {
  sku: string;
  name: string;
  qty: number | undefined;
  bin: string;
}

export interface LaneRow {
  line: number | undefined;
  kind: string;
  sku: string;
  qty: number | undefined;
  handler: string;
  ok: boolean | undefined;
  error: string | undefined;
}

export interface InboxRow {
  line: number | undefined;
  kind: string | undefined;
  sku: string | undefined;
  text: string | undefined;
  cls: string;
  badge: string | undefined;
  message: string;
  chain: string[] | undefined;
}

export interface QtyRow {
  input: string;
  type: string;
  qty: number | undefined;
  ok: boolean | undefined;
}

export interface VerbRow {
  verb: string;
  value: string;
  out: string;
}

export interface TypedRow {
  line: number | undefined;
  sku: string | undefined;
  badge: string;
  want: number | undefined;
  have: number | undefined;
  shortBy: number | undefined;
  isShort: boolean | undefined;
  message: string;
}

export interface DecodedRow {
  index: number | undefined;
  sku: string;
  name: string;
  bin: string;
  hasQty: boolean | undefined;
  qty: number | undefined;
}

export interface FailedRow {
  index: number | undefined;
  field: string;
  message: string;
}

export interface ProblemRow {
  index: number | undefined;
  sku: string;
  fields: string[];
  messages: string[];
}

export interface SkuRow {
  value: string;
  ok: boolean;
  parts: [string, string][];
}

export interface TestRow {
  name: string;
  pass: boolean;
  msg: string;
}

export interface BuildErr {
  type: string;
  message: string;
  line: number | null;
}

export interface Board {
  shelves: { items?: ShelfRow[]; taken?: number; short?: number; copyLoopQty?: number; lowSKUs?: string[] };
  lane: { rows?: LaneRow[]; retired?: number };
  probe: { kinds?: string[]; notes?: string[]; qty?: QtyRow[]; plainNil?: boolean; typedNil?: boolean };
  compose: {
    ropeJson?: Rec;
    radioJson?: Rec;
    ropeQty?: number;
    calls?: number;
    failed?: number;
    auditHasNote?: boolean;
    labels?: string[];
  };
  printout: { table?: string[]; verbs?: VerbRow[] };
  inbox: { rows?: InboxRow[]; directEq?: boolean; viaIs?: boolean; chainLen?: number };
  typed: { rows?: TypedRow[] };
  index: { valueMapBAT?: number; sliceBAT?: number; ptrMapRAD?: number; sliceRAD?: number; byQty?: string[]; keys?: string[]; found?: boolean; missingPtrNil?: boolean };
  helpers: {
    skus?: string[];
    lowSKUs?: string[];
    totalUnits?: number;
    totalMetres?: number;
    floatSum?: number;
    biggest?: string;
    types?: Record<string, string>;
  };
  ledger: { keys?: string[]; len?: number; radioQty?: number; foundMissing?: boolean; type?: string; undoOrder?: number[]; undoEmptyOK?: boolean };
  importer: { depot?: string; decoded?: DecodedRow[]; failed?: FailedRow[]; echo?: string };
  validation: { checked?: number; valid?: number; total?: number; problems?: ProblemRow[]; joinNil?: boolean; joinIs?: boolean; joinText?: string };
  sku: { skus?: SkuRow[]; bins?: SkuRow[]; found?: string[]; masked?: string };
  log: { lines?: number; movements?: number; moveLines?: number[]; rejected?: InboxRow[] };
  tests: { rows?: TestRow[]; gate?: TestRow[] };
  close: {
    opening?: number;
    received?: number;
    returned?: number;
    issued?: number;
    retired?: number;
    closing?: number;
    balanced?: boolean;
    applied?: number;
    rejected?: number;
    calls?: number;
    failed?: number;
  };
  error: BuildErr | null;
}

/** The keys shown on the "Scene data" tab, in lesson order. */
export const SCENE_KEYS = [
  "shelves", "taken", "short", "copyLoopQty", "lowSKUs",
  "lane", "laneStock", "retired",
  "kinds", "notes", "qtyProbe", "nilGotcha",
  "compose", "labels",
  "tableLines", "verbRows",
  "inbox", "errCompare",
  "errTypes",
  "indexView",
  "helpers",
  "ledgerView",
  "importDepot", "importDecoded", "importFailed", "importEcho",
  "validation",
  "skuStrip", "binStrip", "skuFound", "skuMasked",
  "logRead",
  "tests",
  "gateTests", "closeout",
] as const;

// ───────────────────────── row readers ─────────────────────────

const shelfRow = (r: Rec): ShelfRow => ({ sku: str(field(r, "sku")) ?? "?", name: str(field(r, "name")) ?? "", qty: num(field(r, "qty")), bin: str(field(r, "bin")) ?? "" });

const laneRow = (r: Rec): LaneRow => ({
  line: num(field(r, "line")),
  kind: str(field(r, "kind")) ?? "?",
  sku: str(field(r, "sku")) ?? "?",
  qty: num(field(r, "qty")),
  handler: str(field(r, "handler")) ?? "?",
  ok: bool(field(r, "ok")),
  error: str(field(r, "error")),
});

const inboxRow = (r: Rec): InboxRow => ({
  line: num(field(r, "line")),
  kind: str(field(r, "kind")),
  sku: str(field(r, "sku")),
  text: str(field(r, "text")),
  cls: str(field(r, "class")) ?? "other",
  badge: str(field(r, "badge")),
  message: str(field(r, "message")) ?? "",
  chain: strList(field(r, "chain")),
});

function testRows(v: unknown): TestRow[] | undefined {
  if (!isRec(v)) return undefined;
  return rows(field(v, "results"), (r) => ({ name: str(field(r, "name")) ?? "?", pass: bool(field(r, "pass")) === true, msg: str(field(r, "msg")) ?? "" }));
}

function skuRows(v: unknown, partKeys: string[]): SkuRow[] | undefined {
  return rows(v, (r) => {
    const ok = bool(field(r, "ok")) === true;
    return {
      value: str(field(r, "value")) ?? "",
      ok,
      // the parts of a rejected code are zero values, so only a valid code shows them
      parts: ok
        ? partKeys.flatMap((k): [string, string][] => {
            const x = field(r, k);
            return x === undefined || x === null || x === "" ? [] : [[k, String(x)]];
          })
        : [],
    };
  });
}

export function readBoard(p: ProgramHandle | null): Board {
  const g = (k: string): unknown => (p ? readAny(p, k) : undefined);
  const nil = g("nilGotcha");
  const cmp = g("compose");
  const audit = isRec(cmp) ? field(cmp, "audit") : undefined;
  const ec = g("errCompare");
  const ix = g("indexView");
  const hp = g("helpers");
  const lv = g("ledgerView");
  const vd = g("validation");
  const lr = g("logRead");
  const co = g("closeout");
  const coAudit = isRec(co) ? field(co, "audit") : undefined;
  const err = g("build_error");

  return {
    shelves: { items: rows(g("shelves"), shelfRow), taken: num(g("taken")), short: num(g("short")), copyLoopQty: num(g("copyLoopQty")), lowSKUs: strList(g("lowSKUs")) },
    lane: { rows: rows(g("lane"), laneRow), retired: num(g("retired")) },
    probe: {
      kinds: strList(g("kinds")),
      notes: strList(g("notes")),
      qty: rows(g("qtyProbe"), (r) => ({ input: str(field(r, "in")) ?? "", type: str(field(r, "type")) ?? "", qty: num(field(r, "qty")), ok: bool(field(r, "ok")) })),
      plainNil: isRec(nil) ? bool(field(nil, "plainNilIsNil")) : undefined,
      typedNil: isRec(nil) ? bool(field(nil, "typedNilIsNil")) : undefined,
    },
    compose: {
      ropeJson: isRec(cmp) && isRec(field(cmp, "rope")) ? (field(cmp, "rope") as Rec) : undefined,
      radioJson: isRec(cmp) && isRec(field(cmp, "radio")) ? (field(cmp, "radio") as Rec) : undefined,
      ropeQty: isRec(cmp) ? num(field(cmp, "ropeQty")) : undefined,
      calls: isRec(audit) ? num(field(audit, "calls")) : undefined,
      failed: isRec(audit) ? num(field(audit, "failed")) : undefined,
      auditHasNote: isRec(cmp) ? bool(field(cmp, "auditHasNote")) : undefined,
      labels: strList(g("labels")),
    },
    printout: {
      table: strList(g("tableLines")),
      verbs: rows(g("verbRows"), (r) => ({ verb: str(field(r, "verb")) ?? "", value: str(field(r, "value")) ?? "", out: str(field(r, "out")) ?? "" })),
    },
    inbox: {
      rows: rows(g("inbox"), inboxRow),
      directEq: isRec(ec) ? bool(field(ec, "directEq")) : undefined,
      viaIs: isRec(ec) ? bool(field(ec, "viaIs")) : undefined,
      chainLen: isRec(ec) ? num(field(ec, "chainLen")) : undefined,
    },
    typed: {
      rows: rows(g("errTypes"), (r) => ({
        line: num(field(r, "line")),
        sku: str(field(r, "sku")),
        badge: str(field(r, "badge")) ?? "error",
        want: num(field(r, "want")),
        have: num(field(r, "have")),
        shortBy: num(field(r, "shortBy")),
        isShort: bool(field(r, "isShort")),
        message: str(field(r, "message")) ?? "",
      })),
    },
    index: isRec(ix)
      ? {
          valueMapBAT: num(field(ix, "valueMapBAT")),
          sliceBAT: num(field(ix, "sliceBAT")),
          ptrMapRAD: num(field(ix, "ptrMapRAD")),
          sliceRAD: num(field(ix, "sliceRAD")),
          byQty: strList(field(ix, "byQty")),
          keys: strList(field(ix, "keys")),
          found: bool(field(ix, "found")),
          missingPtrNil: bool(field(ix, "missingPtrNil")),
        }
      : {},
    helpers: isRec(hp)
      ? {
          skus: strList(field(hp, "skus")),
          lowSKUs: strList(field(hp, "lowSKUs")),
          totalUnits: num(field(hp, "totalUnits")),
          totalMetres: num(field(hp, "totalMetres")),
          floatSum: num(field(hp, "floatSum")),
          biggest: str(field(hp, "biggest")),
          types: isRec(field(hp, "types"))
            ? Object.fromEntries(Object.entries(field(hp, "types") as Rec).flatMap(([k, v]): [string, string][] => (typeof v === "string" ? [[k, v]] : [])))
            : undefined,
        }
      : {},
    ledger: isRec(lv)
      ? {
          keys: strList(field(lv, "keys")),
          len: num(field(lv, "len")),
          radioQty: num(field(lv, "radioQty")),
          foundMissing: bool(field(lv, "foundMissing")),
          type: str(field(lv, "type")),
          undoOrder: numList(field(lv, "undoOrder")),
          undoEmptyOK: bool(field(lv, "undoEmptyOK")),
        }
      : {},
    importer: {
      depot: str(g("importDepot")),
      decoded: rows(g("importDecoded"), (r) => ({
        index: num(field(r, "index")),
        sku: str(field(r, "sku")) ?? "?",
        name: str(field(r, "name")) ?? "",
        bin: str(field(r, "bin")) ?? "",
        hasQty: bool(field(r, "hasQty")),
        qty: num(field(r, "qty")),
      })),
      failed: rows(g("importFailed"), (r) => ({ index: num(field(r, "index")), field: str(field(r, "field")) ?? "", message: str(field(r, "message")) ?? "" })),
      echo: str(g("importEcho")),
    },
    validation: isRec(vd)
      ? {
          checked: num(field(vd, "checked")),
          valid: num(field(vd, "valid")),
          total: num(field(vd, "total")),
          problems: rows(field(vd, "problems"), (r) => ({ index: num(field(r, "index")), sku: str(field(r, "sku")) ?? "", fields: strList(field(r, "fields")) ?? [], messages: strList(field(r, "messages")) ?? [] })),
          joinNil: bool(field(vd, "joinNil")),
          joinIs: bool(field(vd, "joinIs")),
          joinText: str(field(vd, "joinText")),
        }
      : {},
    sku: {
      skus: skuRows(g("skuStrip"), ["cat", "num", "rev"]),
      bins: skuRows(g("binStrip"), ["aisle", "shelf", "slot"]),
      found: strList(g("skuFound")),
      masked: str(g("skuMasked")),
    },
    log: isRec(lr)
      ? { lines: num(field(lr, "lines")), movements: num(field(lr, "movements")), moveLines: numList(field(lr, "moveLines")), rejected: rows(field(lr, "rejected"), inboxRow) }
      : {},
    tests: { rows: testRows(g("tests")), gate: testRows(g("gateTests")) },
    close: isRec(co)
      ? {
          opening: num(field(co, "opening")),
          received: num(field(co, "received")),
          returned: num(field(co, "returned")),
          issued: num(field(co, "issued")),
          retired: num(field(co, "retired")),
          closing: num(field(co, "closing")),
          balanced: bool(field(co, "balanced")),
          applied: num(field(co, "applied")),
          rejected: num(field(co, "rejected")),
          calls: isRec(coAudit) ? num(field(coAudit, "calls")) : undefined,
          failed: isRec(coAudit) ? num(field(coAudit, "failed")) : undefined,
        }
      : {},
    error: isRec(err) ? { type: str(err.type) ?? "Error", message: str(err.message) ?? "", line: num(err.line) ?? null } : null,
  };
}

// ───────────────────────── small helpers ─────────────────────────

/** Sentinel names for the short classes the lessons use. */
export const SENTINEL_OF: Record<string, string> = {
  short: "ErrShort",
  "unknown-sku": "ErrUnknownSKU",
  "unknown-kind": "ErrUnknownKind",
  sku: "ErrBadSKU",
  kind: "ErrBadKind",
  qty: "ErrBadQty",
  fields: "ErrFields",
  bin: "ErrBadBin",
};

/** "main.Receiver" -> { pointer: false, name: "Receiver" }, "*main.Retirer" -> { pointer: true, name: "Retirer" } */
export function typeName(t: string): { pointer: boolean; name: string } {
  const pointer = t.startsWith("*");
  const bare = pointer ? t.slice(1) : t;
  const dot = bare.indexOf(".");
  return { pointer, name: dot >= 0 ? bare.slice(dot + 1) : bare };
}

/** Bin code to its aisle letter ("A1-03" -> "A"), "?" when it does not look like one. */
export const aisleOf = (bin: string): string => (/^[A-Za-z]/.test(bin) ? bin[0].toUpperCase() : "?");

/** Splits "Suite/case" test names into their suite and case. */
export function splitTestName(name: string): { suite: string; test: string } {
  const at = name.indexOf("/");
  return at < 0 ? { suite: "tests", test: name } : { suite: name.slice(0, at), test: name.slice(at + 1) };
}
