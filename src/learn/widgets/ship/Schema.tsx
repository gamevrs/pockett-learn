"use client";

import React, { useState } from "react";
import { CheckCircle2, Database, RotateCcw, StepForward, XCircle } from "lucide-react";
import type { WidgetProps } from "@/learn/widget";
import { Caption, Note, Segmented, useReport } from "./kit";

/**
 * Renaming a column while the app is being deployed. During a rolling deploy two versions of the
 * app run at once against one database, so a schema change that only suits one of them breaks the
 * other. Three plans: rename first, deploy first, or expand then contract in small safe steps.
 * Each step shows the table and the app versions that are running, and ticks or crosses each one.
 */

type Plan = "migrate-first" | "app-first" | "expand";
type AppId = "A" | "B" | "C" | "D";

interface Schema {
  due: boolean;
  ret: boolean;
  filled: boolean;
}
interface Frame {
  title: string;
  text: string;
  schema: Schema;
  fleet: AppId[];
}

const APPS: Record<AppId, { name: string; does: string; needs: (s: Schema) => string | null }> = {
  A: { name: "v1", does: "reads and writes due_date", needs: (s) => (s.due ? null : "due_date is gone") },
  B: { name: "v2", does: "writes both columns, reads due_date", needs: (s) => (!s.ret ? "return_by does not exist yet" : !s.due ? "due_date is gone" : null) },
  C: { name: "v3", does: "writes both columns, reads return_by", needs: (s) => (!s.ret ? "return_by does not exist yet" : !s.due ? "due_date is gone" : !s.filled ? "old rows have no return_by" : null) },
  D: { name: "v4", does: "reads and writes return_by only", needs: (s) => (!s.ret ? "return_by does not exist yet" : !s.filled ? "old rows have no return_by" : null) },
};

const S0: Schema = { due: true, ret: false, filled: false };
const FRAMES: Record<Plan, Frame[]> = {
  "migrate-first": [
    { title: "Start", text: "Library loans store the return date in due_date. Version 1 of the app is the only one running.", schema: S0, fleet: ["A"] },
    { title: "Run the rename migration", text: "ALTER TABLE loans RENAME COLUMN due_date TO return_by. The database changes in an instant; the running app does not.", schema: { due: false, ret: true, filled: true }, fleet: ["A"] },
    { title: "Roll out the new app", text: "Instances are replaced a few at a time, so for a while old and new run side by side.", schema: { due: false, ret: true, filled: true }, fleet: ["A", "D"] },
    { title: "Rollout finishes", text: "Only the new version remains. The damage happened in the middle.", schema: { due: false, ret: true, filled: true }, fleet: ["D"] },
  ],
  "app-first": [
    { title: "Start", text: "Library loans store the return date in due_date. Version 1 of the app is the only one running.", schema: S0, fleet: ["A"] },
    { title: "Roll out the new app first", text: "The new version expects return_by, which the database does not have yet.", schema: S0, fleet: ["A", "D"] },
    { title: "Now run the rename", text: "The migration finally runs, and fixes the new instances by breaking the old ones that are still serving.", schema: { due: false, ret: true, filled: true }, fleet: ["A", "D"] },
    { title: "Rollout finishes", text: "Only the new version remains. Again the damage happened in the middle.", schema: { due: false, ret: true, filled: true }, fleet: ["D"] },
  ],
  expand: [
    { title: "Start", text: "Library loans store the return date in due_date. Version 1 of the app is the only one running.", schema: S0, fleet: ["A"] },
    { title: "Expand: add the new column", text: "Add return_by, empty and optional. Version 1 never mentions it, so nothing changes for it.", schema: { due: true, ret: true, filled: false }, fleet: ["A"] },
    { title: "Deploy v2: write both", text: "v2 saves every new loan into both columns but still reads the old one. During the rollout v1 and v2 coexist happily.", schema: { due: true, ret: true, filled: false }, fleet: ["A", "B"] },
    { title: "Backfill the old rows", text: "A background job copies due_date into return_by for every existing loan, in small batches.", schema: { due: true, ret: true, filled: true }, fleet: ["B"] },
    { title: "Deploy v3: read the new column", text: "Both columns are complete now, so v3 can read return_by. v2 and v3 still agree on the data.", schema: { due: true, ret: true, filled: true }, fleet: ["B", "C"] },
    { title: "Deploy v4: stop using the old column", text: "No running version needs due_date any more.", schema: { due: true, ret: true, filled: true }, fleet: ["C", "D"] },
    { title: "Contract: drop due_date", text: "Only now, with nothing left that reads or writes it, is the old column removed.", schema: { due: false, ret: true, filled: true }, fleet: ["D"] },
  ],
};

const PLANS: { id: Plan; label: string }[] = [
  { id: "migrate-first", label: "Rename, then deploy" },
  { id: "app-first", label: "Deploy, then rename" },
  { id: "expand", label: "Expand and contract" },
];

export interface SchemaState {
  plan: Plan;
  step: number;
  finished: boolean;
  broke: boolean;
}

function problems(f: Frame) {
  return f.fleet.map((id) => ({ id, why: APPS[id].needs(f.schema) }));
}

export function Schema({ props, onChange, revealed }: WidgetProps<{ plan?: Plan }>) {
  const [plan, setPlan] = useState<Plan>(props.plan ?? "migrate-first");
  const [at, setAt] = useState(0);
  const frames = FRAMES[plan];
  const i = Math.min(at, frames.length - 1);
  const f = frames[i];
  const broke = frames.slice(0, i + 1).some((x) => problems(x).some((p) => p.why));
  const finished = i === frames.length - 1;
  useReport(onChange, { plan, step: i, finished, broke } satisfies SchemaState, `${plan}|${i}|${broke}`);

  const now = problems(f);
  const col = (name: string, present: boolean, note: string) => (
    <div className={`min-w-0 flex-1 rounded-lg border px-2.5 py-2 ${present ? "border-line bg-surface" : "border-dashed border-[var(--line-strong)] bg-surface-2/60 opacity-70"}`}>
      <p className={`truncate font-mono text-[12px] font-semibold ${present ? "text-ink" : "text-ink-3 line-through"}`}>{name}</p>
      <p className="text-[11px] text-ink-3">{present ? note : "not there"}</p>
    </div>
  );

  return (
    <div className="w-full max-w-2xl">
      <div className="flex justify-center">
        <Segmented
          label="Migration plan"
          value={plan}
          disabled={revealed}
          onChange={(p) => {
            setPlan(p);
            setAt(0);
          }}
          options={PLANS}
        />
      </div>

      <div className="mt-3 rounded-xl border border-line bg-surface-2 p-3">
        <Caption className="flex items-center gap-1.5">
          <Database className="h-3.5 w-3.5" /> table: loans
        </Caption>
        <div className="mt-2 flex gap-2">
          {col("due_date", f.schema.due, "has every value")}
          {col("return_by", f.schema.ret, f.schema.filled ? "has every value" : "empty for old rows")}
        </div>
        <Caption className="mt-3">Running app versions (all sharing that table)</Caption>
        <ul className="mt-2 grid gap-1.5">
          {now.map((p) => (
            <li key={p.id} className={`flex items-start gap-2 rounded-lg border px-2.5 py-1.5 ${p.why ? "border-[var(--bad)]/50 bg-[var(--bad)]/[0.07]" : "border-line bg-surface"}`}>
              {p.why ? <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-bad" /> : <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-good" />}
              <span className="min-w-0 text-[12.5px] text-ink">
                <span className="font-mono font-semibold">{APPS[p.id].name}</span> <span className="text-ink-2">{APPS[p.id].does}</span>
                {p.why && <span className="block text-bad">fails: {p.why}</span>}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-3 rounded-xl border border-line bg-surface p-3" aria-live="polite">
        <p className="text-sm font-semibold text-ink">
          <span className="mr-1.5 font-mono text-xs text-ink-3">
            {i + 1}/{frames.length}
          </span>
          {f.title}
        </p>
        <p className="mt-1 text-[13px] leading-snug text-ink-2">{f.text}</p>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button type="button" className="btn btn-primary !h-10" onClick={() => setAt(i + 1)} disabled={revealed || finished}>
          <StepForward className="h-4 w-4" /> Next step
        </button>
        <button type="button" className="btn !h-10" onClick={() => setAt(0)} disabled={revealed || i === 0}>
          <RotateCcw className="h-4 w-4" /> Replay
        </button>
      </div>
      {finished && (
        <Note tone={broke ? "bad" : "good"} className="pop-in mt-2">
          {broke ? "Users saw errors while two versions disagreed with the database. The final state is fine, but the middle was not." : "At every step, every running version worked. No one saw an error, and each step could be rolled back."}
        </Note>
      )}
    </div>
  );
}

/** goal: { plan?, finished: true, broke: false } */
export function checkSchema(state: unknown, goal: Record<string, unknown>) {
  const s = state as SchemaState | undefined;
  if (!s) return false;
  if (typeof goal.plan === "string" && s.plan !== goal.plan) return false;
  if (goal.finished === true && !s.finished) return false;
  if (typeof goal.broke === "boolean" && s.broke !== goal.broke) return false;
  return ["plan", "finished", "broke"].some((k) => k in goal);
}
