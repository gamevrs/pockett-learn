"use client";

import { useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { Btn, Note, Readout, ToyNote } from "./ui";
import { BUCKETS, FILE_CARDS, scoreSort, type Bucket } from "./fab";

export type FabFilesProps = Record<string, never>;

export interface FabFilesState {
  assigned: Record<string, Bucket>;
  correct: number;
  total: number;
  checked: boolean;
}

const SHORT: Record<Bucket, string> = { fab: "Fab", assembly: "Assembly", none: "Not sent" };

export function FabFiles({ onChange, revealed, status }: WidgetProps<FabFilesProps>) {
  const [assigned, setAssigned] = useState<Record<string, Bucket>>({});
  const [checked, setChecked] = useState(false);
  const locked = Boolean(revealed);
  const total = FILE_CARDS.length;
  const done = Object.keys(assigned).length;
  const correct = scoreSort(assigned);

  const emit = (a: Record<string, Bucket>, c: boolean) => {
    onChange?.({ assigned: a, correct: scoreSort(a), total, checked: c } satisfies FabFilesState);
  };
  const assign = (id: string, b: Bucket) => {
    if (locked) return;
    const next = { ...assigned, [id]: b };
    setAssigned(next);
    setChecked(false);
    emit(next, false);
  };
  const check = () => {
    setChecked(true);
    emit(assigned, true);
  };
  const reset = () => {
    setAssigned({});
    setChecked(false);
    emit({}, false);
  };
  const showAnswers = checked || status === "revealed";

  return (
    <div className="w-full">
      <p className="text-[0.88rem] text-ink-2">
        For each file, pick where it goes. <b>Fab</b> = the bare-board manufacturer. <b>Assembly</b> = whoever places and solders the parts. <b>Not sent</b> = keep it, or nobody needs it.
      </p>
      <ul className="mt-3 flex flex-col gap-2">
        {FILE_CARDS.map((c) => {
          const mine = assigned[c.id];
          const ok = mine === c.bucket;
          return (
            <li key={c.id} className={`rounded-xl border p-2.5 ${showAnswers && mine ? (ok ? "border-[var(--brand)]/60 bg-tint" : "border-[var(--bad)]/60 bg-surface") : "border-line bg-surface"}`}>
              <p className="text-[0.92rem] font-semibold leading-snug text-ink">{c.name}</p>
              <p className="text-[0.8rem] leading-snug text-ink-3">{c.what}</p>
              <div role="radiogroup" aria-label={`Where does ${c.name} go?`} className="mt-1.5 flex flex-wrap gap-1.5">
                {BUCKETS.map((b) => {
                  const on = mine === b.id;
                  return (
                    <button
                      key={b.id}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      aria-label={`${b.label} for ${c.name}`}
                      disabled={locked}
                      onClick={() => assign(c.id, b.id)}
                      className={`min-h-10 min-w-10 flex-auto rounded-full border px-3 text-[0.8rem] font-medium transition-colors disabled:cursor-not-allowed ${
                        on ? "border-transparent bg-primary text-primary-ink" : "border-line bg-surface-2 text-ink-2 hover:border-[var(--line-strong)]"
                      }`}
                    >
                      {SHORT[b.id]}
                    </button>
                  );
                })}
              </div>
              {showAnswers && (
                <p className="mt-1.5 text-[0.8rem] leading-snug text-ink-2">
                  <b className={mine && ok ? "text-ink" : "text-[var(--bad)]"}>{!mine ? "Not sorted yet." : ok ? "Correct." : "Not quite."}</b> Goes to <b>{BUCKETS.find((b) => b.id === c.bucket)!.label}</b>. {c.why}
                </p>
              )}
            </li>
          );
        })}
      </ul>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        <Btn primary onClick={check} disabled={locked || done === 0}>
          Check my sort
        </Btn>
        <Btn onClick={reset} disabled={locked || done === 0}>
          Reset
        </Btn>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        <Readout label="Sorted" value={`${done}/${total}`} />
        {checked && <Readout label="Correct" value={`${correct}/${total}`} accent />}
      </div>
      <div className="mt-3">
        <Note tone={checked && correct === total ? "accent" : "plain"}>
          {!checked ? "Sort the files, then press Check my sort to see which are right and why." : correct === total ? "Every file is in the right bucket." : `${total - correct} to fix. Change the red cards and check again.`}
        </Note>
      </div>
      <ToyNote>Simplified: fabs and assemblers differ. Always read your chosen fab&apos;s file guide before ordering.</ToyNote>
    </div>
  );
}

/** goal: { allCorrect, minCorrect } (both need the sort to have been checked) */
export function checkFabFiles(state: unknown, goal: Record<string, unknown>) {
  const s = state as FabFilesState | undefined;
  if (!s || !s.checked) return false;
  if (goal.allCorrect === true && s.correct !== s.total) return false;
  if (typeof goal.minCorrect === "number" && s.correct < goal.minCorrect) return false;
  return true;
}
