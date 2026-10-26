"use client";

import React, { useState } from "react";
import { ShieldAlert, ShieldCheck } from "lucide-react";
import type { WidgetProps } from "@/learn/widget";
import { Caption, Mono, Note, Pill, Segmented, Tag } from "./ui";

/**
 * "Data that became code." The same mistake in two places. In SQL mode, a school-library lookup
 * glues a typed shelf name into its query string. In HTML mode, a comment box glues a typed comment
 * into a page. Type or tap an example, then flip the fix on: parameters for SQL, escaping for HTML.
 * The results are a small mock engine, not a real database or browser, but they follow the rules.
 */

type Kind = "sql" | "html";

const BOOKS = [
  { title: "Moths of the Valley", shelf: "Science", hidden: false },
  { title: "How Bicycles Balance", shelf: "Science", hidden: false },
  { title: "The Bridge at Harrow", shelf: "History", hidden: false },
  { title: "Marcher's Run", shelf: "Fiction", hidden: false },
  { title: "Staff pay scales 2026", shelf: "Staff", hidden: true },
  { title: "Unreleased exam: Year 11 maths", shelf: "Staff", hidden: true },
];

const SQL_EXAMPLES = ["Science", "O'Brien's picks", "' OR '1'='1", "' OR 1=1 --", "x'; DROP TABLE books; --"];
const HTML_EXAMPLES = ["Lovely book!", "<b>so good</b>", "<img src=x onerror=steal()>", "<script>steal(document.cookie)</script>"];

interface SqlResult {
  query: string;
  params?: string;
  kind: "rows" | "error" | "drop";
  rows: typeof BOOKS;
  note: string;
  harmed: boolean;
}

function runSql(input: string, safe: boolean): SqlResult {
  if (safe) {
    const rows = BOOKS.filter((b) => !b.hidden && b.shelf.toLowerCase() === input.trim().toLowerCase());
    return {
      query: "SELECT title FROM books\nWHERE shelf = ? AND hidden = 0",
      params: JSON.stringify(input),
      kind: "rows",
      rows,
      harmed: false,
      note: rows.length ? "The text is passed separately from the query, so it can only ever be a value." : "No shelf has exactly that name, so nothing is found. The text was treated as a shelf name, however strange it looked.",
    };
  }
  const query = `SELECT title FROM books\nWHERE shelf = '${input}' AND hidden = 0`;
  const hasQuote = input.includes("'");
  if (!hasQuote) {
    const rows = BOOKS.filter((b) => !b.hidden && b.shelf.toLowerCase() === input.trim().toLowerCase());
    return { query, kind: "rows", rows, harmed: false, note: rows.length ? "Works as intended." : "No such shelf." };
  }
  const drop = /;\s*drop\s+table/i.test(input);
  const taut = /'\s*or\s+('?\w+'?)\s*=\s*'?\1'?/i.test(input) || /'\s*or\s+1\s*=\s*1/i.test(input) || /'\s*or\s+true/i.test(input);
  const comment = /--/.test(input);
  if (drop) {
    return {
      query,
      kind: "drop",
      rows: [],
      harmed: true,
      note: "The text after the quote became a second statement. Many database drivers refuse to run two statements in one call, but never count on that: other attacks need only one.",
    };
  }
  if (taut && comment) {
    return { query, kind: "rows", rows: BOOKS, harmed: true, note: "The quote closed the value early, OR 1=1 made the condition always true, and -- commented out the hidden = 0 check. Staff-only titles are in the answer." };
  }
  if (taut) {
    return { query, kind: "rows", rows: BOOKS.filter((b) => !b.hidden), harmed: true, note: "The condition is always true, so every shelf comes back. (AND binds tighter than OR, so the hidden = 0 check still applied here. A comment would remove it.)" };
  }
  return { query, kind: "error", rows: [], harmed: false, note: "The apostrophe ended the value early and left a dangling quote: syntax error, a broken page for an innocent visitor. The same flaw an attacker uses is already hurting honest users." };
}

type HtmlOutcome = "plain" | "markup" | "script";
function runHtml(input: string, safe: boolean): { html: string; outcome: HtmlOutcome; note: string; harmed: boolean } {
  const escaped = input.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  if (safe) {
    return { html: `<p class="comment">${escaped}</p>`, outcome: "plain", harmed: false, note: "The browser shows the characters exactly as typed. Angle brackets are just text, so no script can start." };
  }
  const script = /<\s*script|on\w+\s*=|javascript:/i.test(input);
  const markup = /<\s*\/?\s*[a-z][^>]*>/i.test(input);
  const html = `<p class="comment">${input}</p>`;
  if (script) return { html, outcome: "script", harmed: true, note: "The browser parses the text as markup and runs the script on the clinic's own page, with the visitor's login. It can read what they can read and act as them." };
  if (markup) return { html, outcome: "markup", harmed: false, note: "The text became real markup. This one only makes text bold, but it proves the page can be rewritten by whoever types. The next comment could be a script." };
  return { html, outcome: "plain", harmed: false, note: "Plain words come out fine. The flaw only shows when someone types something clever." };
}

export interface InjectLabProps {
  kind?: Kind;
  /** Start with the fix on. */
  safe?: boolean;
  input?: string;
  /** Show the fix switch. Default true. */
  fixToggle?: boolean;
}

export interface InjectLabState {
  kind: Kind;
  safe: boolean;
  input: string;
  /** An attack changed what the page did. */
  harmed: boolean;
  /** The input looked like an attack and was neutralised. */
  blocked: boolean;
  outcome: string;
}

function summarize(kind: Kind, safe: boolean, input: string): InjectLabState {
  if (kind === "sql") {
    const unsafe = runSql(input, false);
    const shown = runSql(input, safe);
    const attack = unsafe.harmed;
    return { kind, safe, input, harmed: shown.harmed, blocked: attack && safe, outcome: shown.kind === "rows" ? (shown.rows.some((r) => r.hidden) ? "hidden" : shown.rows.length ? "rows" : "none") : shown.kind };
  }
  const unsafe = runHtml(input, false);
  const shown = runHtml(input, safe);
  return { kind, safe, input, harmed: shown.harmed, blocked: unsafe.harmed && safe, outcome: shown.outcome };
}

export function InjectLab({ props, onChange, revealed }: WidgetProps<InjectLabProps>) {
  const kind = props.kind ?? "sql";
  const [safe, setSafe] = useState(props.safe ?? false);
  const [input, setInput] = useState(props.input ?? (kind === "sql" ? "Science" : "Lovely book!"));
  const examples = kind === "sql" ? SQL_EXAMPLES : HTML_EXAMPLES;

  const update = (s: boolean, i: string) => {
    setSafe(s);
    setInput(i);
    onChange?.(summarize(kind, s, i));
  };

  const sql = kind === "sql" ? runSql(input, safe) : null;
  const html = kind === "html" ? runHtml(input, safe) : null;
  const harmed = sql?.harmed ?? html?.harmed ?? false;
  const fixLabels: [string, string] = kind === "sql" ? ["Glue into the query", "Pass as a parameter"] : ["Insert as HTML", "Escape as text"];

  return (
    <div className="w-full max-w-2xl">
      {(props.fixToggle ?? true) && (
        <div className="mb-3 flex justify-center">
          <Segmented
            label="How the text is used"
            value={safe ? "safe" : "raw"}
            disabled={revealed}
            options={[
              { id: "raw", label: fixLabels[0] },
              { id: "safe", label: fixLabels[1] },
            ]}
            onChange={(v) => !revealed && update(v === "safe", input)}
          />
        </div>
      )}

      <label className="block">
        <Caption className="mb-1">{kind === "sql" ? "Library catalogue: type a shelf name" : "Book page: write a comment"}</Caption>
        <input
          type="text"
          value={input}
          disabled={revealed}
          onChange={(e) => update(safe, e.target.value)}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          className="h-11 w-full rounded-lg border border-line bg-surface px-3 font-mono text-[13px] text-ink outline-none focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)] disabled:opacity-70"
        />
      </label>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {examples.map((e) => (
          <Pill key={e} on={e === input} onClick={() => !revealed && update(safe, e)} disabled={revealed} className="!min-h-9 !px-2.5 font-mono text-[12px]">
            {e}
          </Pill>
        ))}
      </div>

      {sql && (
        <div className="mt-3 grid gap-2">
          <div>
            <Caption className="mb-1">{safe ? "Query and parameters, sent separately" : "The query the program builds"}</Caption>
            <Mono className="whitespace-pre-wrap">{sql.query}</Mono>
            {safe && sql.params && <Mono className="mt-1.5">params = [{sql.params}]</Mono>}
          </div>
          <div className={`rounded-xl border bg-surface p-3 ${sql.harmed ? "border-[var(--bad)]/60" : sql.kind === "error" ? "border-[#d9a21b]/60" : "border-line"}`} aria-live="polite">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Caption>Result</Caption>
              {sql.kind === "drop" ? <Tag tone="bad">books table gone</Tag> : sql.kind === "error" ? <Tag tone="warn">500 error</Tag> : <Tag tone={sql.harmed ? "bad" : "good"}>{sql.rows.length} row{sql.rows.length === 1 ? "" : "s"}</Tag>}
            </div>
            {sql.rows.length > 0 && (
              <ul className="mt-2 grid gap-1">
                {sql.rows.map((b) => (
                  <li key={b.title} className={`flex items-center justify-between gap-2 rounded-md border px-2.5 py-1 text-[13px] ${b.hidden ? "border-[var(--bad)]/55 bg-[var(--bad)]/[0.07] text-ink" : "border-line text-ink-2"}`}>
                    <span>{b.title}</span>
                    {b.hidden && <Tag tone="bad">staff only</Tag>}
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-2 text-[13px] leading-snug text-ink-2">{sql.note}</p>
          </div>
        </div>
      )}

      {html && (
        <div className="mt-3 grid gap-2">
          <div>
            <Caption className="mb-1">The page the server builds</Caption>
            <Mono className="whitespace-pre-wrap">{html.html}</Mono>
          </div>
          <div className={`rounded-xl border bg-surface p-3 ${html.harmed ? "border-[var(--bad)]/60" : "border-line"}`} aria-live="polite">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Caption>What the visitor&apos;s browser does</Caption>
              <Tag tone={html.outcome === "script" ? "bad" : html.outcome === "markup" ? "warn" : "good"}>
                {html.outcome === "script" ? "script runs" : html.outcome === "markup" ? "markup obeyed" : "shown as text"}
              </Tag>
            </div>
            <p className="mt-2 text-[13px] leading-snug text-ink-2">{html.note}</p>
          </div>
        </div>
      )}

      {safe && summarize(kind, safe, input).blocked && (
        <Note tone="good" className="pop-in mt-2">
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 shrink-0 text-good" /> That input is an attack against the glued version, and it does nothing here.
          </span>
        </Note>
      )}
      {!safe && harmed && (
        <Note tone="bad" className="pop-in mt-2">
          <span className="inline-flex items-center gap-1.5">
            <ShieldAlert className="h-4 w-4 shrink-0 text-bad" /> Typed text just changed what the program does.
          </span>
        </Note>
      )}
    </div>
  );
}

export function checkInjectLab(state: unknown, goal: Record<string, unknown>) {
  const st = state as InjectLabState | undefined;
  if (!st) return false;
  if (typeof goal.kind === "string" && st.kind !== goal.kind) return false;
  if (typeof goal.safe === "boolean" && st.safe !== goal.safe) return false;
  if (goal.harmed === true && !st.harmed) return false;
  if (goal.blocked === true && !st.blocked) return false;
  if (typeof goal.outcome === "string" && st.outcome !== goal.outcome) return false;
  return true;
}
