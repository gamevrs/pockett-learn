"use client";

import React, { useState } from "react";
import { Play, ShieldAlert, ShieldCheck } from "lucide-react";
import type { WidgetProps } from "@/learn/widget";
import { Mono, Note, Readout, Segmented, Tag, Toggle } from "./ui";

/**
 * One database, many clinics. You are logged in as Elm Street Clinic. Eight queries from the
 * codebase run against shared tables; some quietly return, count or change other clinics' rows.
 * "classify" asks you to sort the safe from the leaky; "rls" lets the database enforce the tenant
 * rule itself (row-level security) and shows the same eight queries with it on and off.
 */

type T = "E" | "H" | "N";
const TENANT_NAME: Record<T, string> = { E: "Elm Street Clinic", H: "Harbour Dental", N: "Northgate Physio" };

interface Row {
  text: string;
  tenant: T;
}
interface Q {
  id: string;
  sql: string;
  /** Rows when the query is run with no database-level protection. */
  rows: Row[];
  /** Rows when row-level security hides other tenants. */
  safeRows: Row[];
  leaky: boolean;
  why: string;
  empty?: string;
}

const QUERIES: Q[] = [
  {
    id: "q1",
    sql: "SELECT name FROM patients\nWHERE name LIKE 'Sam%';",
    rows: [
      { text: "Sam Okoro", tenant: "E" },
      { text: "Samira Rahal", tenant: "H" },
      { text: "Sam Whitlock", tenant: "N" },
    ],
    safeRows: [{ text: "Sam Okoro", tenant: "E" }],
    leaky: true,
    why: "Searches every clinic's patients. The tenant was never mentioned.",
  },
  {
    id: "q2",
    sql: "SELECT name FROM patients\nWHERE tenant_id = :tenant\n  AND name LIKE 'Sam%';",
    rows: [{ text: "Sam Okoro", tenant: "E" }],
    safeRows: [{ text: "Sam Okoro", tenant: "E" }],
    leaky: false,
    why: "Scoped to the caller's tenant, which comes from their login.",
  },
  {
    id: "q3",
    sql: "SELECT amount, patient_name FROM invoices\nWHERE id = 5521;",
    rows: [{ text: "Invoice 5521 · £84.00 · Zoe Harding", tenant: "H" }],
    safeRows: [],
    leaky: true,
    empty: "No rows. The invoice exists, but not for you.",
    why: "Looking up by id alone is the cross-tenant version of the IDOR bug: ids are not secrets, and this one belongs to Harbour Dental.",
  },
  {
    id: "q4",
    sql: "UPDATE appointments\nSET status = 'cancelled'\nWHERE id = 90;",
    rows: [{ text: "1 row updated: appointment 90, Northgate Physio", tenant: "N" }],
    safeRows: [],
    leaky: true,
    empty: "0 rows updated.",
    why: "A write with no tenant condition lets one clinic cancel another's bookings.",
  },
  {
    id: "q5",
    sql: "SELECT count(*) FROM patients;",
    rows: [{ text: "count = 41, across all three clinics", tenant: "N" }],
    safeRows: [{ text: "count = 12", tenant: "E" }],
    leaky: true,
    why: "Totals leak too: you have just learned how big every competitor's patient list is, and your dashboard shows the wrong number.",
  },
  {
    id: "q6",
    sql: "SELECT p.name, i.amount\nFROM invoices i\nJOIN patients p\n  ON p.id = i.patient_id\n AND p.tenant_id = i.tenant_id\nWHERE i.tenant_id = :tenant;",
    rows: [
      { text: "Sam Okoro · £62.00", tenant: "E" },
      { text: "Ines Duarte · £40.00", tenant: "E" },
    ],
    safeRows: [
      { text: "Sam Okoro · £62.00", tenant: "E" },
      { text: "Ines Duarte · £40.00", tenant: "E" },
    ],
    leaky: false,
    why: "Both tables are tied to the same tenant, in the join and in the filter.",
  },
  {
    id: "q7",
    sql: "SELECT p.name, i.amount\nFROM invoices i\nJOIN patients p ON p.id = i.patient_id\nWHERE i.tenant_id = :tenant;",
    rows: [
      { text: "Sam Okoro · £62.00", tenant: "E" },
      { text: "Zoe Harding · £62.00", tenant: "H" },
      { text: "Ines Duarte · £40.00", tenant: "E" },
    ],
    safeRows: [
      { text: "Sam Okoro · £62.00", tenant: "E" },
      { text: "Ines Duarte · £40.00", tenant: "E" },
    ],
    leaky: true,
    why: "Each clinic numbers its patients from 1, so patient 7 matches in several tenants. Only invoices were filtered, and the join pulls in another clinic's patient names.",
  },
  {
    id: "q8",
    sql: "UPDATE appointments\nSET status = 'cancelled'\nWHERE id = 90\n  AND tenant_id = :tenant;",
    rows: [],
    safeRows: [],
    leaky: false,
    empty: "0 rows updated: appointment 90 is not in your clinic.",
    why: "The tenant condition makes a foreign id behave as if it did not exist.",
  },
];

export interface TenantLabProps {
  /** "classify": sort queries into safe and leaky. "rls": toggle row-level security. */
  mode?: "classify" | "rls";
}

export interface TenantLabState {
  mode: "classify" | "rls";
  rls: boolean;
  ran: number;
  /** In rls mode: queries run so far that still leaked. In classify mode: wrong labels. */
  leaks: number;
  allCorrect: boolean;
  labelled: number;
}

export function TenantLab({ props, onChange, revealed, status }: WidgetProps<TenantLabProps>) {
  const mode = props.mode ?? "classify";
  const [labels, setLabels] = useState<Record<string, "safe" | "leaky">>({});
  const [ran, setRan] = useState<string[]>([]);
  const [rls, setRls] = useState(false);

  const summarize = (lb: Record<string, "safe" | "leaky">, r: string[], on: boolean): TenantLabState => {
    const wrong = QUERIES.filter((q) => lb[q.id] !== undefined && lb[q.id] !== (q.leaky ? "leaky" : "safe")).length;
    const leaks = mode === "rls" ? QUERIES.filter((q) => r.includes(q.id) && q.leaky && !on).length : wrong;
    return { mode, rls: on, ran: r.length, leaks, allCorrect: Object.keys(lb).length === QUERIES.length && wrong === 0, labelled: Object.keys(lb).length };
  };
  const run = (id: string) => {
    if (revealed) return;
    const r = ran.includes(id) ? ran : [...ran, id];
    setRan(r);
    onChange?.(summarize(labels, r, rls));
  };
  const runAll = () => {
    if (revealed) return;
    const r = QUERIES.map((q) => q.id);
    setRan(r);
    onChange?.(summarize(labels, r, rls));
  };
  const label = (id: string, v: "safe" | "leaky") => {
    if (revealed) return;
    const lb = { ...labels, [id]: v };
    setLabels(lb);
    onChange?.(summarize(lb, ran, rls));
  };
  const flipRls = () => {
    if (revealed) return;
    setRls(!rls);
    onChange?.(summarize(labels, ran, !rls));
  };

  const showAnswers = status === "revealed";
  const leakCount = QUERIES.filter((q) => ran.includes(q.id) && q.leaky && !rls).length;

  return (
    <div className="w-full max-w-2xl">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 py-1 text-xs text-ink-2">
          signed in to <span className="font-semibold text-ink">{TENANT_NAME.E}</span>
        </span>
        <div className="flex flex-wrap gap-2">
          {mode === "rls" && (
            <Toggle on={rls} disabled={revealed} onClick={flipRls}>
              Row-level security
            </Toggle>
          )}
          <button type="button" className="btn !h-10" onClick={runAll} disabled={revealed}>
            <Play className="h-4 w-4" /> Run all
          </button>
        </div>
      </div>
      {mode === "rls" && (
        <Mono className="mt-2 text-[11.5px]">
          {rls ? "CREATE POLICY tenant_only ON patients, invoices, appointments\n  USING (tenant_id = current_setting('app.tenant')::int);" : "no database policy: every query sees every clinic's rows"}
        </Mono>
      )}

      <ul className="mt-3 grid gap-2">
        {QUERIES.map((q, qi) => {
          const has = ran.includes(q.id);
          const rows = rls ? q.safeRows : q.rows;
          const leaked = rows.some((r) => r.tenant !== "E");
          const lab = labels[q.id];
          const labWrong = (showAnswers || status === "wrong") && lab !== undefined && lab !== (q.leaky ? "leaky" : "safe");
          return (
            <li key={q.id} className={`rounded-xl border bg-surface p-2.5 ${labWrong ? "border-[var(--bad)]/60" : "border-line"}`}>
              <div className="flex items-start justify-between gap-2">
                <p className="font-mono text-[11px] text-ink-3">query {qi + 1}</p>
                <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
                  {mode === "classify" && (
                    <Segmented<"safe" | "leaky" | "none">
                      label={`Is query ${qi + 1} safe?`}
                      value={lab ?? "none"}
                      disabled={revealed}
                      options={[
                        { id: "safe", label: "Safe" },
                        { id: "leaky", label: "Leaks" },
                      ]}
                      onChange={(v) => v !== "none" && label(q.id, v)}
                    />
                  )}
                  <button type="button" className="btn !h-10 !px-3" onClick={() => run(q.id)} disabled={revealed} aria-label={`Run query ${qi + 1}`}>
                    <Play className="h-4 w-4" /> Run
                  </button>
                </div>
              </div>
              <Mono className="mt-1.5 whitespace-pre-wrap text-[11.5px]">{q.sql}</Mono>
              {has && (
                <div className="pop-in mt-2 rounded-lg border border-line bg-surface-2 p-2">
                  {rows.length === 0 ? (
                    <p className="text-[13px] text-ink-2">{q.empty ?? "No rows."}</p>
                  ) : (
                    <ul className="grid gap-1">
                      {rows.map((r) => (
                        <li key={r.text} className="flex flex-wrap items-center justify-between gap-2 text-[13px]">
                          <span className="text-ink">{r.text}</span>
                          {q.id === "q5" && !rls ? <Tag tone="bad">all clinics</Tag> : <Tag tone={r.tenant === "E" ? "good" : "bad"}>{TENANT_NAME[r.tenant]}</Tag>}
                        </li>
                      ))}
                    </ul>
                  )}
                  <p className="mt-1.5 flex items-start gap-1.5 text-[12.5px] leading-snug text-ink-2">
                    {leaked ? <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-bad" /> : <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-good" />}
                    {leaked ? q.why : q.leaky && rls ? "The policy hid the other clinics' rows, even though this query forgot to ask." : q.why}
                  </p>
                </div>
              )}
              {(showAnswers || (revealed && mode === "classify")) && mode === "classify" && !has && <p className="mt-1.5 text-[12.5px] leading-snug text-ink-2">{q.leaky ? "Leaks. " : "Safe. "}{q.why}</p>}
            </li>
          );
        })}
      </ul>

      <div className="mt-3 flex flex-wrap gap-2">
        <Readout label="Queries run" value={`${ran.length}/${QUERIES.length}`} />
        {mode === "rls" ? <Readout label="Still leaking" value={rls ? 0 : leakCount} accent={rls && ran.length === QUERIES.length} /> : <Readout label="Labelled" value={`${Object.keys(labels).length}/${QUERIES.length}`} />}
      </div>
      {mode === "rls" && rls && ran.length === QUERIES.length && (
        <Note tone="good" className="pop-in mt-2">
          Every query is now confined to Elm Street, including the ones that forgot to ask. Keep the filter in your code anyway: two locks are better than one.
        </Note>
      )}
    </div>
  );
}

export function checkTenantLab(state: unknown, goal: Record<string, unknown>) {
  const st = state as TenantLabState | undefined;
  if (!st) return false;
  if (goal.allCorrect === true && !st.allCorrect) return false;
  if (typeof goal.rls === "boolean" && st.rls !== goal.rls) return false;
  if (goal.ranAll === true && st.ran < QUERIES.length) return false;
  if (goal.leaks === 0 && st.leaks !== 0) return false;
  return true;
}
