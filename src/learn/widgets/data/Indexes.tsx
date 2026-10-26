"use client";

import React, { useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { Caption, Note, Readout, fmt } from "../dsa/ui";
import { Choice } from "./ui";

/**
 * "Which index would help this query?" A million-row `tickets` table, one query at a time, and a
 * menu of candidate indexes. The widget works out how many index entries SQLite would walk and
 * how many table rows it would then fetch, using the real rules: an index is used from its
 * *leftmost* column; it stops at the first column the query does not pin down (a range column is
 * the last one that can narrow the search); an expression index only helps the same expression;
 * a partial index only helps queries that imply its WHERE clause; a covering index never visits
 * the table.
 */

const N = 1_000_000;

/** How many distinct values each column has (the open-status share is handled by `frac`). */
const DISTINCT: Record<string, number> = { venue: 20, show_date: 365, status: 4, section: 40, price: 200, "lower(email)": 900_000, email: 1_000_000 };

interface Query {
  sql: string;
  /** Columns tested with = */
  eq: string[];
  /** Column tested with a range, and what share of rows the range keeps. */
  range?: { col: string; frac: number };
  /** Columns the query returns ("*" = every column). */
  select: string[];
  /** Rows the query returns. */
  rows: number;
  /** Hint shown under the query. */
  hint: string;
}

interface Candidate {
  id: string;
  /** CREATE INDEX text */
  sql: string;
  cols: string[];
  /** Partial index: only rows with this column = value. `frac` = share of the table it covers. */
  where?: { col: string; frac: number };
}

interface Scenario {
  id: string;
  title: string;
  query: Query;
  candidates: Candidate[];
}

export const SCENARIOS: Scenario[] = [
  {
    id: "prefix",
    title: "Leftmost column",
    query: {
      sql: "SELECT * FROM tickets\nWHERE show_date = '2027-03-12'",
      eq: ["show_date"],
      select: ["*"],
      rows: Math.round(N / 365),
      hint: "Only the date is pinned down. Which composite index can start from it?",
    },
    candidates: [
      { id: "venue", sql: "CREATE INDEX i1 ON tickets (venue)", cols: ["venue"] },
      { id: "venue_date", sql: "CREATE INDEX i2 ON tickets (venue, show_date)", cols: ["venue", "show_date"] },
      { id: "date_venue", sql: "CREATE INDEX i3 ON tickets (show_date, venue)", cols: ["show_date", "venue"] },
      { id: "status", sql: "CREATE INDEX i4 ON tickets (status)", cols: ["status"] },
    ],
  },
  {
    id: "range",
    title: "Equality, then range",
    query: {
      sql: "SELECT * FROM tickets\nWHERE venue = 'Hall A'\n  AND show_date BETWEEN '2027-03-01' AND '2027-03-07'",
      eq: ["venue"],
      range: { col: "show_date", frac: 7 / 365 },
      select: ["*"],
      rows: Math.round((N / 20) * (7 / 365)),
      hint: "One column is tested with =, the other with a range. Order matters.",
    },
    candidates: [
      { id: "venue", sql: "CREATE INDEX i1 ON tickets (venue)", cols: ["venue"] },
      { id: "date", sql: "CREATE INDEX i2 ON tickets (show_date)", cols: ["show_date"] },
      { id: "venue_date", sql: "CREATE INDEX i3 ON tickets (venue, show_date)", cols: ["venue", "show_date"] },
      { id: "date_venue", sql: "CREATE INDEX i4 ON tickets (show_date, venue)", cols: ["show_date", "venue"] },
    ],
  },
  {
    id: "partial",
    title: "Partial index",
    query: {
      sql: "SELECT * FROM tickets\nWHERE status = 'open'\n  AND show_date = '2027-03-12'",
      eq: ["status", "show_date"],
      select: ["*"],
      rows: Math.round((N * 0.02) / 365),
      hint: "Only 2% of tickets are 'open' at any time; everything else is sold or held.",
    },
    candidates: [
      { id: "status", sql: "CREATE INDEX i1 ON tickets (status)", cols: ["status"] },
      { id: "date", sql: "CREATE INDEX i2 ON tickets (show_date)", cols: ["show_date"] },
      { id: "date_status", sql: "CREATE INDEX i3 ON tickets (show_date, status)", cols: ["show_date", "status"] },
      { id: "partial", sql: "CREATE INDEX i4 ON tickets (show_date)\n  WHERE status = 'open'", cols: ["show_date"], where: { col: "status", frac: 0.02 } },
    ],
  },
  {
    id: "expr",
    title: "Expression index",
    query: {
      sql: "SELECT * FROM tickets\nWHERE lower(email) = 'ana@example.com'",
      eq: ["lower(email)"],
      select: ["*"],
      rows: 1,
      hint: "The query wraps the column in a function.",
    },
    candidates: [
      { id: "email", sql: "CREATE INDEX i1 ON tickets (email)", cols: ["email"] },
      { id: "lower", sql: "CREATE INDEX i2 ON tickets (lower(email))", cols: ["lower(email)"] },
      { id: "venue", sql: "CREATE INDEX i3 ON tickets (venue)", cols: ["venue"] },
    ],
  },
  {
    id: "covering",
    title: "Covering index",
    query: {
      sql: "SELECT show_date, price FROM tickets\nWHERE venue = 'Hall A'",
      eq: ["venue"],
      select: ["show_date", "price"],
      rows: N / 20,
      hint: "The query only wants two columns. Can the index hold all of them?",
    },
    candidates: [
      { id: "venue", sql: "CREATE INDEX i1 ON tickets (venue)", cols: ["venue"] },
      { id: "venue_date", sql: "CREATE INDEX i2 ON tickets (venue, show_date)", cols: ["venue", "show_date"] },
      { id: "venue_date_price", sql: "CREATE INDEX i3 ON tickets (venue, show_date, price)", cols: ["venue", "show_date", "price"] },
    ],
  },
];

export interface IndexesProps {
  /** Which scenario to show, or leave out to offer all of them. */
  scenario?: string;
}

export interface IndexesState {
  scenario: string;
  index: string;
  kind: "scan" | "seek" | "covering";
  entries: number;
  fetches: number;
  work: number;
  /** Candidate ids that would be used by the query at all. */
  usable: boolean;
}

export interface Outcome {
  kind: "scan" | "seek" | "covering";
  entries: number;
  fetches: number;
  work: number;
  prefix: number;
  size: number;
  plan: string;
  why: string;
}

export function evaluate(q: Query, c: Candidate | null): Outcome {
  const scan: Outcome = { kind: "scan", entries: 0, fetches: N, work: N, prefix: 0, size: 0, plan: "SCAN tickets", why: "No index can start from what the query pins down, so every row is read." };
  if (!c) return scan;
  // a partial index is only usable when the query contains its condition
  if (c.where && !q.eq.includes(c.where.col)) return { ...scan, size: N * c.where.frac, why: `This index only holds rows with ${c.where.col} = 'open', but the query doesn't ask for them.` };
  let frac = 1;
  let prefix = 0;
  const used: string[] = [];
  for (const col of c.cols) {
    if (q.eq.includes(col)) {
      frac /= DISTINCT[col] ?? 1;
      prefix += 1;
      used.push(`${col}=?`);
    } else if (q.range && q.range.col === col) {
      frac *= q.range.frac;
      prefix += 1;
      used.push(`${col}>? AND ${col}<?`);
      break;
    } else break;
  }
  const size = c.where ? N * c.where.frac : N;
  if (prefix === 0) {
    const first = c.cols[0];
    const fn = q.eq.find((e) => e.includes("(") && e.includes(first));
    return {
      ...scan,
      size,
      why: fn
        ? `The index is sorted by ${first}, but the query asks about ${fn}, a different value. The database can't search a sorted list for something computed from it.`
        : `The query says nothing about ${first}, the index's first column, so the index can't be entered. (An index is sorted by its first column first.)`,
    };
  }
  const entries = Math.max(1, Math.round(size * frac));
  const needed = new Set([...q.select.filter((s) => s !== "*"), ...q.eq, ...(q.range ? [q.range.col] : [])]);
  const covering = !q.select.includes("*") && [...needed].every((col) => c.cols.includes(col));
  const fetches = covering ? 0 : entries;
  return {
    kind: covering ? "covering" : "seek",
    entries,
    fetches,
    work: entries + fetches,
    prefix,
    size,
    plan: `SEARCH tickets USING ${covering ? "COVERING " : ""}INDEX ${c.sql.split(" ")[2]} (${used.join(" AND ")})`,
    why:
      prefix < c.cols.length && !covering
        ? `The index narrows on its first ${prefix} ${prefix === 1 ? "column" : "columns"}; the rest of the query is checked on the rows fetched from the table.`
        : covering
          ? "Everything the query needs is inside the index, so the table is never touched."
          : "The index narrows the search to a small slice, then the matching rows are fetched.",
  };
}

export function Indexes({ props, onChange, revealed }: WidgetProps<IndexesProps>) {
  const list = props.scenario ? SCENARIOS.filter((s) => s.id === props.scenario) : SCENARIOS;
  const [sid, setSid] = useState(list[0].id);
  const [pick, setPick] = useState("none");
  const sc = list.find((s) => s.id === sid) ?? list[0];
  const cand = sc.candidates.find((c) => c.id === pick) ?? null;
  const out = evaluate(sc.query, cand);

  const report = (s: Scenario, id: string) => {
    const c = s.candidates.find((x) => x.id === id) ?? null;
    const o = evaluate(s.query, c);
    onChange?.({ scenario: s.id, index: id, kind: o.kind, entries: o.entries, fetches: o.fetches, work: o.work, usable: o.kind !== "scan" } satisfies IndexesState);
  };
  const choose = (id: string) => {
    if (revealed) return;
    setPick(id);
    report(sc, id);
  };
  const switchScenario = (id: string) => {
    const s = list.find((x) => x.id === id)!;
    setSid(id);
    setPick("none");
    report(s, "none");
  };

  const pct = Math.min(100, Math.max(1.5, (out.work / N) * 100));
  const tone = out.kind === "scan" ? "bad" : "good";

  return (
    <div className="w-full min-w-0">
      {list.length > 1 && (
        <div className="mb-3">
          <Choice label="Query" value={sid} onChange={switchScenario} options={list.map((s) => ({ id: s.id, label: s.title }))} />
        </div>
      )}
      <Caption>The query · 1,000,000 rows</Caption>
      <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-xl border border-white/10 bg-[#0a0a0a] px-3 py-2.5 font-mono text-[12.5px] leading-[1.6] text-[#e5e5e5]">{sc.query.sql}</pre>
      <p className="mt-1.5 text-sm text-ink-3">{sc.query.hint}</p>

      <Caption className="mt-4">Create one index</Caption>
      <div className="grid gap-1.5" role="radiogroup" aria-label="Index to create">
        {[{ id: "none", sql: "No index", cols: [] } as Candidate, ...sc.candidates].map((c) => (
          <button
            key={c.id}
            type="button"
            role="radio"
            aria-checked={pick === c.id}
            disabled={revealed}
            onClick={() => choose(c.id)}
            className={`min-h-10 rounded-lg border px-3 py-1.5 text-left font-mono text-[12px] leading-snug transition-colors disabled:cursor-default ${
              pick === c.id ? "border-[var(--brand)] bg-tint text-ink" : "border-line bg-surface text-ink-2 hover:border-[var(--line-strong)]"
            }`}
          >
            <span className="whitespace-pre-wrap">{c.sql}</span>
          </button>
        ))}
      </div>

      <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-surface-2 ring-1 ring-inset ring-[var(--line)]" aria-hidden>
        <div className={`h-full rounded-full transition-all duration-300 ${out.kind === "scan" ? "bg-[var(--bad)]" : "bg-primary"}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Readout label="Index entries read" value={out.kind === "scan" ? "—" : fmt(out.entries)} />
        <Readout label={out.kind === "scan" ? "Table rows scanned" : "Table rows fetched"} value={fmt(out.fetches)} accent={out.kind !== "scan"} />
        {cand && out.size > 0 && <Readout label="Index holds" value={`${fmt(out.size)} entries`} />}
      </div>
      <p className="mt-3 font-mono text-[12px] text-ink-2">{out.plan}</p>
      <Note tone={tone}>{out.why}</Note>
    </div>
  );
}

export function checkIndexes(state: unknown, goal: Record<string, unknown>) {
  const s = state as IndexesState | undefined;
  if (!s) return false;
  if (typeof goal.index === "string" && s.index !== goal.index) return false;
  if (typeof goal.kind === "string" && s.kind !== goal.kind) return false;
  if (typeof goal.workMax === "number" && s.work > goal.workMax) return false;
  if (typeof goal.scenario === "string" && s.scenario !== goal.scenario) return false;
  return true;
}
