"use client";

import React, { useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { RULES, SERIES, SPC_SIGMA_NM, SPC_TARGET_NM, firstByRule, firstViolation, nm, violationsAt } from "./spc-model";
import { Btn, Note, Readout, Toy } from "./ui";

// ───────────────────────────── semi-spc: a Shewhart control chart and the Western Electric rules ─────────────────────────────

export interface SpcProps {
  series?: "spike" | "drift";
  /** Flag rule violations live, and list the four rules. When false, nothing is flagged until the line is stopped. */
  showRules?: boolean;
}

export interface SpcState {
  series: "spike" | "drift";
  /** Lots drawn so far. */
  shown: number;
  /** Lot at which the learner stopped the line (1-based), null until they do. */
  stoppedAt: number | null;
  /** First lot, in the whole series, that completes any rule; null if none does. */
  firstViolation: number | null;
}

const X0 = 46;
const X1 = 346;
const STEP = (X1 - X0) / 29;
const px = (lot: number) => X0 + (lot - 1) * STEP;
const py = (z: number) => 102 - z * 22;
const nmText = (z: number) => nm(z).toFixed(1);

export function Spc({ props, onChange }: WidgetProps<SpcProps>) {
  const series = props.series === "drift" ? "drift" : "spike";
  const z = SERIES[series];
  const first = firstViolation(z);
  const per = violationsAt(z);
  const byRule = firstByRule(z);
  const [shown, setShown] = useState(0);
  const [stopped, setStopped] = useState<number | null>(null);
  const live = !!props.showRules;
  const reveal = stopped != null;
  const showFlags = live || reveal;

  const report = (n: number, s: number | null) => onChange?.({ series, shown: n, stoppedAt: s, firstViolation: first } satisfies SpcState);

  const lastFlag = shown > 0 && per[shown - 1].length > 0 ? per[shown - 1] : null;
  const seen = z.slice(0, shown);
  const path = seen.map((v, i) => `${i ? "L" : "M"}${px(i + 1).toFixed(1)} ${py(Math.max(-4, Math.min(4, v))).toFixed(1)}`).join(" ");
  const broken = per.map((r, i) => ({ lot: i + 1, rules: r })).filter((x) => x.lot <= shown && x.rules.length > 0);

  let verdict = "";
  if (stopped != null) {
    if (first == null) verdict = "Nothing ever broke a rule in this series, so stopping was a false alarm.";
    else if (stopped === first) verdict = `Right call: lot ${first} was the first to break a rule, and you stopped there.`;
    else if (stopped < first) verdict = `Too early: no rule had broken by lot ${stopped}. The first violation is lot ${first}. Stopping on noise costs a line's output for nothing.`;
    else verdict = `Late: the first rule broke at lot ${first}. You let ${stopped - first} more lot${stopped - first === 1 ? "" : "s"} run through a process that had already shifted.`;
  }

  return (
    <div className="w-full" data-widget>
      <div className="flex flex-wrap justify-center gap-2">
        <Btn
          primary
          disabled={reveal || shown >= z.length}
          onClick={() => {
            const n = shown + 1;
            setShown(n);
            report(n, stopped);
          }}
        >
          Next lot
        </Btn>
        <Btn
          disabled={reveal || shown === 0}
          onClick={() => {
            setStopped(shown);
            report(shown, shown);
          }}
        >
          Stop the line
        </Btn>
        <Btn
          onClick={() => {
            setShown(0);
            setStopped(null);
            report(0, null);
          }}
        >
          Start over
        </Btn>
      </div>

      <div className="mt-3 flex justify-center">
        <svg
          viewBox="0 0 360 228"
          className="block h-auto w-full max-w-[28rem]"
          role="img"
          aria-label={`Control chart of a critical dimension, target ${SPC_TARGET_NM} nanometres, limits ${nmText(-3)} to ${nmText(3)}. ${shown} of ${z.length} lots shown${reveal ? `; line stopped at lot ${stopped}` : ""}.`}
        >
          {[-3, -2, -1, 0, 1, 2, 3].map((k) => (
            <g key={k}>
              <line
                x1={X0 - 6}
                x2={X1 + 6}
                y1={py(k)}
                y2={py(k)}
                stroke={Math.abs(k) === 3 ? "var(--bad)" : k === 0 ? "var(--ink-3)" : "var(--line-strong)"}
                strokeWidth={Math.abs(k) === 3 || k === 0 ? 1.5 : 1}
                strokeDasharray={Math.abs(k) === 1 || Math.abs(k) === 2 ? "4 4" : undefined}
              />
              <text x={X0 - 10} y={py(k) + 5} textAnchor="end" fontSize={14} fill="var(--ink-2)">
                {k === 0 ? "CL" : `${k > 0 ? "+" : "−"}${Math.abs(k)}σ`}
              </text>
            </g>
          ))}
          {[1, 5, 10, 15, 20, 25, 30].filter((t) => t <= z.length).map((t) => (
            <text key={t} x={px(t)} y={212} textAnchor="middle" fontSize={14} fill="var(--ink-2)">
              {t}
            </text>
          ))}
          <text x={X1 + 6} y={226} textAnchor="end" fontSize={14} fill="var(--ink-2)">
            lot →
          </text>
          {shown === 0 && (
            <text x={(X0 + X1) / 2} y={py(0) - 8} textAnchor="middle" fontSize={14} fill="var(--ink)">
              Press “Next lot”
            </text>
          )}
          {shown > 1 && <path d={path} fill="none" stroke="var(--ink-3)" strokeWidth={1.5} />}
          {seen.map((v, i) => {
            const lot = i + 1;
            const x = px(lot);
            const y = py(Math.max(-4, Math.min(4, v)));
            const hit = showFlags && per[i].length > 0;
            return (
              <g key={lot}>
                <circle cx={x} cy={y} r={4} fill={hit ? "var(--bad)" : "var(--brand)"} stroke="var(--surface)" strokeWidth={1} />
                {hit && (
                  <text x={x} y={y + (v >= 0 ? -9 : 20)} textAnchor={x > X1 - 18 ? "end" : "middle"} fontSize={14} fontWeight={700} fill="var(--ink)">
                    {`R${per[i].join("+")}`}
                  </text>
                )}
              </g>
            );
          })}
          {stopped != null && stopped > 0 && (
            <line x1={px(stopped)} x2={px(stopped)} y1={10} y2={196} stroke="var(--ink)" strokeWidth={1.5} strokeDasharray="2 3" />
          )}
        </svg>
      </div>
      <p className="mt-1 text-center text-xs text-ink-3">
        Centre line {SPC_TARGET_NM.toFixed(1)} nm · σ = {SPC_SIGMA_NM} nm · limits {nmText(-3)} to {nmText(3)} nm
      </p>

      <div className="mt-3 flex flex-wrap justify-center gap-2">
        <Readout label="Lots shown" value={`${shown} / ${z.length}`} />
        {shown > 0 && <Readout label={`Lot ${shown}`} value={`${nm(z[shown - 1]).toFixed(2)} nm`} />}
        {reveal && <Readout label="Stopped at lot" value={stopped} accent />}
      </div>

      {live && (
        <ul className="mx-auto mt-3 max-w-md list-none space-y-1 p-0 text-sm text-ink-2">
          {RULES.map((r) => (
            <li key={r.id}>
              <span className="font-mono font-semibold text-ink">R{r.id}</span> {r.text}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3">
        {reveal ? (
          <Note tone="accent">
            {verdict}
            {broken.length > 0
              ? ` Rules that broke so far: ${broken.map((b) => `lot ${b.lot} (rule ${b.rules.join(" and ")})`).join(", ")}.`
              : " No rule had broken yet among the lots shown."}
            {first != null && byRule[4] === first && series === "drift" ? " The drift tripped the 8-in-a-row rule long before any point crossed the 3σ limit." : ""}
          </Note>
        ) : live && lastFlag ? (
          <Note tone="accent">{`Lot ${shown} completes rule ${lastFlag.join(" and ")}: the process has probably shifted. Stop the line?`}</Note>
        ) : (
          <Note>
            {shown === 0
              ? "Lots arrive one at a time. Watch for a point or a pattern that random noise is unlikely to make, then stop the line."
              : live
                ? "Within the limits and no rule broken so far: keep running."
                : "Does this look like noise, or has something changed? Stop the line when you think a rule has been broken."}
          </Note>
        )}
      </div>
      <Toy>
        Hardcoded illustrative data. Real fabs chart many parameters per tool and chamber, with limits taken from the process&apos;s own history rather than a fixed target.
      </Toy>
    </div>
  );
}

/** goal: { series (exact), stopAtFirst: true → stoppedAt equals the first lot that breaks any rule } */
export function checkSpc(state: unknown, goal: Record<string, unknown>) {
  const s = state as SpcState | undefined;
  if (!s) return false;
  if (typeof goal.series === "string" && s.series !== goal.series) return false;
  if (goal.stopAtFirst === true && (s.stoppedAt == null || s.firstViolation == null || s.stoppedAt !== s.firstViolation)) return false;
  return true;
}
