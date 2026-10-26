import type { ProgramHandle } from "@/engine/program";

/**
 * Schema Studio: reading the learner's database.
 *
 * The SQL runtime hands every scene plain data: `tables` (columns with keys, foreign keys, indexes,
 * triggers, the stored CREATE text), `results` (every result set the file produced) and `log` (the
 * statement diary, including statements marked `-- expect error` and how they were refused).
 * Panels pick "their" result by the COLUMNS it returns, so exploratory queries never scramble them.
 * Everything is read defensively.
 */

export type Cell = unknown;

export interface ResultSet {
  sql: string;
  columns: string[];
  rows: Cell[][];
}

export interface ColumnInfo {
  name: string;
  type: string;
  notNull: boolean;
  dflt: string | null;
  pk: number;
  generated: boolean;
}

export interface ForeignKey {
  table: string;
  from: string[];
  to: string[];
  onUpdate: string;
  onDelete: string;
}

export interface IndexInfo {
  name: string;
  unique: boolean;
  origin: string;
  partial: boolean;
  columns: string[];
  sql: string | null;
}

export interface TableInfo {
  name: string;
  kind: "table" | "view";
  sql: string;
  columns: ColumnInfo[];
  rowCount: number;
  foreignKeys: ForeignKey[];
  indexes: IndexInfo[];
  triggers: { name: string; sql: string }[];
}

export interface LogEntry {
  line: number;
  verb: string;
  sql: string;
  changes: number;
  side: number;
  error?: string;
  expected?: boolean;
}

/** The workshop's two relics, created by the hidden setup: never part of the learner's ER diagram. */
export const RELICS = new Set(["legacy_sheet", "door_log"]);

const str = (v: unknown, fallback = ""): string => (typeof v === "string" ? v : fallback);
const num = (v: unknown, fallback = 0): number => (typeof v === "number" && Number.isFinite(v) ? v : fallback);
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === "object" ? (v as Record<string, unknown>) : {});

export function readResults(program: ProgramHandle | null): ResultSet[] {
  if (!program) return [];
  return program.list<unknown>("results").flatMap((raw) => {
    const r = obj(raw);
    const columns = arr(r.columns).map((c) => String(c));
    if (columns.length === 0) return [];
    return [{ sql: str(r.sql), columns, rows: arr(r.rows).filter((row): row is Cell[] => Array.isArray(row)) }];
  });
}

export function readTables(program: ProgramHandle | null): TableInfo[] {
  if (!program) return [];
  return program.list<unknown>("tables").flatMap((raw) => {
    const t = obj(raw);
    if (typeof t.name !== "string") return [];
    return [
      {
        name: t.name,
        kind: t.kind === "view" ? "view" : "table",
        sql: str(t.sql),
        rowCount: num(t.rowCount),
        columns: arr(t.columns).map((c) => {
          const col = obj(c);
          return { name: str(col.name, "?"), type: str(col.type), notNull: col.notNull === true, dflt: typeof col.dflt === "string" ? col.dflt : null, pk: num(col.pk), generated: col.generated === true };
        }),
        foreignKeys: arr(t.foreignKeys).map((f) => {
          const fk = obj(f);
          return { table: str(fk.table), from: arr(fk.from).map(String), to: arr(fk.to).map(String), onUpdate: str(fk.onUpdate, "NO ACTION"), onDelete: str(fk.onDelete, "NO ACTION") };
        }),
        indexes: arr(t.indexes).map((i) => {
          const ix = obj(i);
          return { name: str(ix.name), unique: ix.unique === true, origin: str(ix.origin, "c"), partial: ix.partial === true, columns: arr(ix.columns).map(String), sql: typeof ix.sql === "string" ? ix.sql : null };
        }),
        triggers: arr(t.triggers).map((g) => ({ name: str(obj(g).name), sql: str(obj(g).sql) })),
      },
    ];
  });
}

export function readLog(program: ProgramHandle | null): LogEntry[] {
  if (!program) return [];
  return program.list<unknown>("log").flatMap((raw) => {
    const e = obj(raw);
    if (typeof e.verb !== "string") return [];
    return [
      {
        line: num(e.line),
        verb: e.verb.toUpperCase(),
        sql: str(e.sql),
        changes: num(e.changes),
        side: num(e.side),
        error: typeof e.error === "string" ? e.error : undefined,
        expected: e.expected === true ? true : undefined,
      },
    ];
  });
}

// ───────────────────────── small helpers ─────────────────────────

export const plural = (n: number, word: string) => `${n.toLocaleString("en-US")} ${word}${n === 1 ? "" : "s"}`;

export function fmt(v: Cell): string {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "number") return Number.isInteger(v) ? String(v) : String(Math.round(v * 100) / 100);
  return String(v);
}

export const isNum = (v: Cell): v is number => typeof v === "number" && Number.isFinite(v);

/** SQL without comments, whitespace squeezed. */
export function flat(sql: string): string {
  return sql.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/--[^\n]*/g, " ").replace(/\s+/g, " ").trim();
}

export function clip(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

export function hasCols(rs: ResultSet, cols: string[]): boolean {
  return cols.every((c) => rs.columns.includes(c));
}

export function lastWith(results: ResultSet[], cols: string[], re?: RegExp): ResultSet | null {
  for (let i = results.length - 1; i >= 0; i--) {
    const r = results[i];
    if (hasCols(r, cols) && (!re || re.test(flat(r.sql).toLowerCase()))) return r;
  }
  return null;
}

export function cellOf(rs: ResultSet, row: Cell[], col: string): Cell {
  return row[rs.columns.indexOf(col)];
}

// ───────────────────────── features ─────────────────────────

export const FEATURES = [
  "ss-sketch",
  "ss-tables",
  "ss-firewall",
  "ss-keys",
  "ss-checks",
  "ss-links",
  "ss-refactor",
  "ss-junction",
  "ss-plan",
  "ss-smart-indexes",
  "ss-views",
  "ss-audit",
  "ss-tx",
  "ss-upsert",
  "ss-json",
  "ss-migrations",
  "ss-bookings",
] as const;

export type FeatureId = (typeof FEATURES)[number];

export const FEATURE_LESSON: Record<FeatureId, number> = {
  "ss-sketch": 1,
  "ss-tables": 2,
  "ss-firewall": 2,
  "ss-keys": 3,
  "ss-checks": 4,
  "ss-links": 5,
  "ss-refactor": 6,
  "ss-junction": 7,
  "ss-plan": 8,
  "ss-smart-indexes": 9,
  "ss-views": 10,
  "ss-audit": 11,
  "ss-tx": 12,
  "ss-upsert": 13,
  "ss-json": 14,
  "ss-migrations": 15,
  "ss-bookings": 16,
};

export interface Flags {
  sketch: boolean;
  tables: boolean;
  keys: boolean;
  checks: boolean;
  links: boolean;
  junction: boolean;
  smart: boolean;
  audit: boolean;
}

export function flagsOf(unlocked: ReadonlySet<string>, program: ProgramHandle | null): Flags {
  const on = (id: FeatureId) => !!program && unlocked.has(id);
  return { sketch: on("ss-sketch"), tables: on("ss-tables"), keys: on("ss-keys"), checks: on("ss-checks"), links: on("ss-links"), junction: on("ss-junction"), smart: on("ss-smart-indexes"), audit: on("ss-audit") };
}

// ───────────────────────── ER graph ─────────────────────────

export interface SketchLink {
  a: string;
  b: string;
  cardinality: string;
}

export function readSketch(results: ResultSet[]): SketchLink[] {
  const rs = lastWith(results, ["a", "b", "cardinality"]);
  if (!rs) return [];
  return rs.rows.flatMap((row) => {
    const a = cellOf(rs, row, "a");
    const b = cellOf(rs, row, "b");
    const c = cellOf(rs, row, "cardinality");
    if (typeof a !== "string" || typeof b !== "string" || typeof c !== "string") return [];
    return [{ a: a.trim().toLowerCase(), b: b.trim().toLowerCase(), cardinality: c.trim().toUpperCase() }];
  });
}

export interface Entity {
  name: string;
  table: TableInfo | null;
  depth: number;
  /** Order inside its layer. */
  order: number;
}

export interface Edge {
  /** The "one" side (parent). */
  parent: string;
  child: string;
  parentCol?: string;
  childCol?: string;
  action?: string;
  kind: "fk" | "sketch";
  /** "1:N" or "N:M" */
  cardinality: string;
  junction?: boolean;
}

export interface Graph {
  entities: Entity[];
  layers: Entity[][];
  /** Tables with no links to anything: drawn in a row below the diagram. */
  standalone: Entity[];
  edges: Edge[];
}

export function isJunction(t: TableInfo): boolean {
  const pk = t.columns.filter((c) => c.pk > 0).map((c) => c.name);
  if (pk.length < 2) return false;
  const fkCols = new Set(t.foreignKeys.flatMap((f) => f.from));
  return pk.every((c) => fkCols.has(c));
}

export function buildGraph(allTables: TableInfo[], sketch: SketchLink[], flags: Flags): Graph {
  const real = new Map<string, TableInfo>();
  if (flags.tables) for (const t of allTables) if (t.kind === "table" && !RELICS.has(t.name)) real.set(t.name, t);

  const names = new Set<string>(real.keys());
  if (flags.sketch) {
    for (const s of sketch) {
      names.add(s.a);
      names.add(s.b);
    }
  }

  const edges: Edge[] = [];
  for (const t of real.values()) {
    for (const fk of t.foreignKeys) {
      if (!real.has(fk.table) || fk.table === t.name) continue;
      edges.push({ parent: fk.table, child: t.name, parentCol: fk.to[0] || undefined, childCol: fk.from[0], action: fk.onDelete, kind: "fk", cardinality: "1:N", junction: isJunction(t) });
    }
  }
  if (flags.sketch) {
    for (const s of sketch) {
      if (s.a === s.b) continue;
      edges.push({ parent: s.a, child: s.b, kind: "sketch", cardinality: s.cardinality === "N:M" ? "N:M" : "1:N" });
    }
  }

  // depth = longest chain of parents (1:N only), so parents sit left of children
  const parents = new Map<string, Set<string>>();
  const touched = new Set<string>();
  for (const e of edges) {
    touched.add(e.parent);
    touched.add(e.child);
    if (e.cardinality === "N:M") continue;
    if (!parents.has(e.child)) parents.set(e.child, new Set());
    parents.get(e.child)!.add(e.parent);
  }
  const depth = new Map<string, number>();
  for (const n of names) depth.set(n, 0);
  for (let pass = 0; pass < names.size + 1; pass++) {
    let changed = false;
    for (const [child, ps] of parents) {
      const want = Math.min(6, 1 + Math.max(...[...ps].map((p) => depth.get(p) ?? 0)));
      if ((depth.get(child) ?? 0) < want) {
        depth.set(child, want);
        changed = true;
      }
    }
    if (!changed) break;
  }

  const entities: Entity[] = [...names].sort().map((name) => ({ name, table: real.get(name) ?? null, depth: depth.get(name) ?? 0, order: 0 }));
  const standalone = entities.filter((e) => !touched.has(e.name));
  const linked = entities.filter((e) => touched.has(e.name));
  const maxDepth = linked.reduce((m, e) => Math.max(m, e.depth), 0);
  const layers: Entity[][] = [];
  for (let d = 0; d <= maxDepth; d++) {
    const layer = linked.filter((e) => e.depth === d);
    if (d === 0) layer.sort((x, y) => childCount(edges, y.name) - childCount(edges, x.name) || x.name.localeCompare(y.name));
    else {
      const prev = layers[d - 1] ?? [];
      const rank = (n: string) => {
        const idx = [...(parents.get(n) ?? [])].map((p) => layers.flat().findIndex((e) => e.name === p)).filter((i) => i >= 0);
        return idx.length ? Math.min(...idx) : prev.length;
      };
      layer.sort((x, y) => rank(x.name) - rank(y.name) || x.name.localeCompare(y.name));
    }
    layer.forEach((e, i) => (e.order = i));
    layers.push(layer);
  }
  return { entities, layers: layers.filter((l) => l.length > 0), standalone, edges };
}

function childCount(edges: Edge[], name: string): number {
  return edges.filter((e) => e.parent === name).length;
}

/** Estimated card height, only used to balance sub-columns (real heights come from the DOM). */
export function estHeight(e: Entity, mode: "full" | "mini"): number {
  if (mode === "mini") return 30;
  return e.table ? 34 + e.table.columns.length * 15 + 14 : 34;
}

// ───────────────────────── constraints ─────────────────────────

export interface CheckInfo {
  name?: string;
  expr: string;
}

/** CHECK constraints found in a CREATE statement, with the CONSTRAINT name when it has one. */
export function parseChecks(sql: string): CheckInfo[] {
  const out: CheckInfo[] = [];
  const re = /\bCHECK\s*\(/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(sql))) {
    let depth = 1;
    let i = m.index + m[0].length;
    const start = i;
    while (i < sql.length && depth > 0) {
      if (sql[i] === "(") depth++;
      else if (sql[i] === ")") depth--;
      i++;
    }
    const expr = sql.slice(start, i - 1).replace(/\s+/g, " ").trim();
    const before = sql.slice(Math.max(0, m.index - 60), m.index);
    const nm = /CONSTRAINT\s+["`]?(\w+)["`]?\s*$/i.exec(before);
    out.push({ name: nm?.[1], expr });
  }
  return out;
}

export type RefusalKind = "NOT NULL" | "UNIQUE" | "CHECK" | "FOREIGN KEY" | "TYPE" | "RULE";

export interface Refusal {
  kind: RefusalKind;
  detail: string;
}

export function classifyRefusal(message: string): Refusal {
  let m: RegExpExecArray | null;
  if ((m = /^NOT NULL constraint failed:\s*(.*)$/i.exec(message))) return { kind: "NOT NULL", detail: m[1] };
  if ((m = /^UNIQUE constraint failed:\s*(.*)$/i.exec(message))) return { kind: "UNIQUE", detail: m[1] };
  if ((m = /^CHECK constraint failed:\s*(.*)$/i.exec(message))) return { kind: "CHECK", detail: m[1] };
  if (/^FOREIGN KEY constraint failed/i.test(message)) return { kind: "FOREIGN KEY", detail: "a row it points at is missing, or is still needed" };
  if ((m = /^cannot store (.*)$/i.exec(message))) return { kind: "TYPE", detail: m[1] };
  return { kind: "RULE", detail: message };
}

// ───────────────────────── query plans ─────────────────────────

export interface PlanLine {
  op: "SCAN" | "SEARCH" | "OTHER";
  table: string;
  index: string | null;
  covering: boolean;
  cond: string;
  raw: string;
}

export interface Plan {
  index: number;
  statement: string;
  key: string;
  lines: PlanLine[];
}

export function parsePlanLine(raw: string): PlanLine {
  const m = /^(SCAN|SEARCH)\s+(\S+)\s*(.*)$/i.exec(raw.trim());
  if (!m) return { op: "OTHER", table: "", index: null, covering: false, cond: "", raw };
  const rest = m[3];
  const ix = /USING\s+(COVERING\s+)?INDEX\s+(\S+)\s*(?:\((.*)\))?/i.exec(rest);
  return { op: m[1].toUpperCase() as "SCAN" | "SEARCH", table: m[2], index: ix ? ix[2] : null, covering: !!ix?.[1], cond: ix?.[3] ?? "", raw };
}

export function readPlans(results: ResultSet[]): Plan[] {
  return results.flatMap((rs, index) => {
    if (!hasCols(rs, ["id", "parent", "detail"])) return [];
    const statement = flat(rs.sql).replace(/^explain\s+query\s+plan\s*/i, "");
    return [{ index, statement, key: statement.toLowerCase(), lines: rs.rows.map((r) => parsePlanLine(String(cellOf(rs, r, "detail")))) }];
  });
}

/** The most recent statement whose plan went from a SCAN to a SEARCH (the index paying off). */
export function findFlip(plans: Plan[]): { before: Plan; after: Plan } | null {
  for (let i = plans.length - 1; i >= 0; i--) {
    const after = plans[i];
    if (!after.lines.some((l) => l.op === "SEARCH")) continue;
    for (let j = i - 1; j >= 0; j--) {
      const before = plans[j];
      if (before.key === after.key && before.lines.some((l) => l.op === "SCAN") && !before.lines.some((l) => l.op === "SEARCH")) return { before, after };
    }
  }
  return null;
}

// ───────────────────────── transactions ─────────────────────────

export interface TxStep {
  kind: "stmt" | "refused" | "savepoint" | "rollback-to" | "release";
  label: string;
  rows: number;
  error?: string;
  undone: boolean;
  savepoint?: string;
}

export interface Tx {
  steps: TxStep[];
  end: "commit" | "rollback" | "open";
  /** Rows kept (commit) or undone (rollback). */
  rows: number;
  statements: number;
  /** The log entries inside, for other panels. */
  entries: LogEntry[];
}

export function stepLabel(e: LogEntry): string {
  const s = flat(e.sql);
  let m: RegExpExecArray | null;
  if ((m = /^(INSERT(?:\s+OR\s+\w+)?\s+INTO|REPLACE\s+INTO)\s+["`]?(\w+)/i.exec(s))) return `INSERT ${m[2]}`;
  if ((m = /^UPDATE\s+(?:OR\s+\w+\s+)?["`]?(\w+)/i.exec(s))) return `UPDATE ${m[1]}`;
  if ((m = /^DELETE\s+FROM\s+["`]?(\w+)/i.exec(s))) return `DELETE ${m[1]}`;
  if ((m = /^(CREATE|DROP|ALTER)\s+(?:UNIQUE\s+)?(TABLE|VIEW|INDEX|TRIGGER)\s+(?:IF\s+(?:NOT\s+)?EXISTS\s+)?["`]?(\w+)/i.exec(s))) return `${m[1].toUpperCase()} ${m[2].toLowerCase()} ${m[3]}`;
  return clip(s, 40);
}

export function readTransactions(log: LogEntry[]): Tx[] {
  const txs: Tx[] = [];
  let cur: Tx | null = null;
  const marks: { name: string; at: number }[] = [];
  const live = (t: Tx) => t.steps.filter((s) => (s.kind === "stmt") && !s.undone);
  const finish = (end: "commit" | "rollback") => {
    if (!cur) return;
    cur.end = end;
    const counted = live(cur);
    cur.rows = counted.reduce((n, s) => n + s.rows, 0);
    cur.statements = counted.length;
    txs.push(cur);
    cur = null;
    marks.length = 0;
  };
  for (const e of log) {
    const text = flat(e.sql);
    if (e.verb === "BEGIN" && !e.error) {
      if (cur) finish("rollback");
      cur = { steps: [], end: "open", rows: 0, statements: 0, entries: [] };
      continue;
    }
    if (!cur) continue;
    if (e.verb === "COMMIT" || e.verb === "END") {
      finish("commit");
      continue;
    }
    if (e.verb === "ROLLBACK") {
      const to = /^rollback\s+(?:transaction\s+)?to\s+(?:savepoint\s+)?["`]?(\w+)/i.exec(text);
      if (to) {
        const mark = [...marks].reverse().find((k) => k.name === to[1]);
        let undone = 0;
        if (mark) {
          for (let i = mark.at; i < cur.steps.length; i++) {
            const s = cur.steps[i];
            if (s.kind === "stmt" && !s.undone) {
              s.undone = true;
              undone += s.rows;
            }
          }
        }
        cur.steps.push({ kind: "rollback-to", label: `ROLLBACK TO ${to[1]}`, rows: undone, undone: false, savepoint: to[1] });
        continue;
      }
      // a plain ROLLBACK: everything still standing is undone
      const counted = live(cur);
      const rows = counted.reduce((n, s) => n + s.rows, 0);
      cur.end = "rollback";
      cur.rows = rows;
      cur.statements = counted.length;
      txs.push(cur);
      cur = null;
      marks.length = 0;
      continue;
    }
    cur.entries.push(e);
    if (e.verb === "SAVEPOINT") {
      const nm = /^savepoint\s+["`]?(\w+)/i.exec(text)?.[1] ?? "";
      marks.push({ name: nm, at: cur.steps.length });
      cur.steps.push({ kind: "savepoint", label: `SAVEPOINT ${nm}`, rows: 0, undone: false, savepoint: nm });
      continue;
    }
    if (e.verb === "RELEASE") {
      const nm = /^release\s+(?:savepoint\s+)?["`]?(\w+)/i.exec(text)?.[1] ?? "";
      cur.steps.push({ kind: "release", label: `RELEASE ${nm}`, rows: 0, undone: false, savepoint: nm });
      continue;
    }
    if (e.error) {
      cur.steps.push({ kind: "refused", label: stepLabel(e), rows: 0, error: e.error, undone: false });
      continue;
    }
    cur.steps.push({ kind: "stmt", label: stepLabel(e), rows: e.changes + e.side, undone: false });
  }
  if (cur) {
    const open: Tx = cur;
    const counted = live(open);
    open.rows = counted.reduce((n, s) => n + s.rows, 0);
    open.statements = counted.length;
    txs.push(open);
  }
  return txs;
}

// ───────────────────────── migrations ─────────────────────────

export type Phase = "baseline" | "expand" | "backfill" | "switch" | "contract" | "other";

export function phaseOf(name: string, version: number): Phase {
  const n = name.toLowerCase();
  if (/baseline|initial|base\b/.test(n) || version === 1) return "baseline";
  if (/expand|add_|create_/.test(n)) return "expand";
  if (/backfill|copy|dual/.test(n)) return "backfill";
  if (/read|switch|view|cutover/.test(n)) return "switch";
  if (/contract|drop|remove|cleanup/.test(n)) return "contract";
  return "other";
}

export interface MigrationNode {
  version: number;
  name: string;
  phase: Phase;
  rolledBack?: boolean;
}

export function readMigrations(results: ResultSet[], txs: Tx[]): MigrationNode[] {
  const rs = lastWith(results, ["version", "name"]);
  const nodes: MigrationNode[] = [];
  if (rs) {
    for (const row of rs.rows) {
      const v = cellOf(rs, row, "version");
      const n = cellOf(rs, row, "name");
      if (isNum(v) && typeof n === "string") nodes.push({ version: v, name: n, phase: phaseOf(n, v) });
    }
  }
  for (const tx of txs) {
    if (tx.end !== "rollback") continue;
    for (const e of tx.entries) {
      const m = /insert\s+into\s+schema_migrations[^)]*\)\s*values\s*\(\s*(\d+)\s*,\s*'([^']+)'/i.exec(flat(e.sql));
      if (m && !e.error && !nodes.some((x) => x.version === Number(m[1]) && !x.rolledBack)) nodes.push({ version: Number(m[1]), name: m[2], phase: phaseOf(m[2], Number(m[1])), rolledBack: true });
    }
  }
  return nodes.sort((x, y) => x.version - y.version);
}

// ───────────────────────── triggers ─────────────────────────

export function describeTrigger(sql: string, fallbackName: string): { name: string; when: string } {
  const s = flat(sql);
  const m = /^CREATE\s+(?:TEMP\s+)?TRIGGER\s+(?:IF\s+NOT\s+EXISTS\s+)?["`]?(\w+)["`]?\s+(BEFORE|AFTER|INSTEAD\s+OF)?\s*(INSERT|UPDATE(?:\s+OF\s+[\w,\s]+?)?|DELETE)\s+ON\s+["`]?(\w+)/i.exec(s);
  if (!m) return { name: fallbackName, when: "" };
  return { name: m[1], when: `${(m[2] ?? "AFTER").toUpperCase()} ${m[3].toUpperCase().replace(/\s+/g, " ")} ON ${m[4]}` };
}
