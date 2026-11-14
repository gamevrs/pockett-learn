"use client";

import React, { useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { Caption, Note, Toy } from "../semi/ui";
import { FLOW_STAGES, checkFlow, stageById, type FlowState, type FlowStage, type Side } from "./flowmap.ts";

// ───────────── chip-flow: the design-flow map, from spec to fab ─────────────

export interface FlowProps {
  /** Stage ids to ring (e.g. the ones a lesson step is about). */
  highlight?: string[];
  /** "explore" (default): tap stages for their cards. "loops": also list every feedback loop and mark stages that can send you back. */
  mode?: "explore" | "loops";
  /** Where the fab card sends the learner (the Semiconductors module). Without it the card names the module in plain text. */
  fabHref?: string;
  title?: string;
}

export { checkFlow };

const GROUPS: { side: Side; label: string; blurb: string }[] = [
  { side: "front", label: "Front end", blurb: "What the chip does (logic)" },
  { side: "back", label: "Back end", blurb: "How it is physically built (layout)" },
  { side: "fab", label: "Manufacturing", blurb: "Made by the foundry" },
];

const SIDE_LABEL: Record<Side, string> = { front: "Front end", back: "Back end", fab: "Fab (foundry)" };

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[5.2rem_1fr] gap-x-2 gap-y-0.5 border-t border-line pt-2 first:border-t-0 first:pt-0 max-[400px]:grid-cols-1">
      <Caption className="pt-0.5">{label}</Caption>
      <div className="text-[0.92rem] leading-snug text-ink">{children}</div>
    </div>
  );
}

function StageCard({ stage, mode, fabHref, onGo }: { stage: FlowStage; mode: "explore" | "loops"; fabHref?: string; onGo: (id: string) => void }) {
  return (
    <section aria-label={`${stage.name}: details`} className="rounded-xl border border-[var(--brand)]/50 bg-tint p-3">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <h4 className="text-base font-bold text-ink">{stage.name}</h4>
        <span className="rounded-full border border-line bg-surface px-2.5 py-0.5 text-xs font-medium text-ink-2">{SIDE_LABEL[stage.side]}</span>
      </div>
      <p className="mt-1 text-[0.92rem] leading-snug text-ink-2">{stage.what}</p>
      <div className="mt-2.5 flex flex-col gap-2 rounded-lg bg-surface p-2.5">
        <Row label="Goes in">{stage.input}</Row>
        <Row label="Comes out">{stage.output}</Row>
        <Row label="Done by">{stage.who}</Row>
        <Row label="Example tools">{stage.tools}</Row>
        {stage.loops.length > 0 && (
          <Row label={mode === "loops" ? "Loops back" : "If it fails"}>
            <ul className="flex flex-col gap-1.5">
              {stage.loops.map((l) => (
                <li key={l.to + l.why}>
                  <button
                    type="button"
                    onClick={() => onGo(l.to)}
                    className="mr-1.5 inline-flex min-h-10 items-center rounded-full border border-line bg-surface-2 px-3 text-sm font-semibold text-ink hover:border-[var(--line-strong)]"
                    aria-label={`Back to ${stageById(l.to)?.name ?? l.to}`}
                  >
                    {"↩ "}
                    {stageById(l.to)?.short ?? l.to}
                  </button>
                  <span className="text-ink-2">{l.why}</span>
                </li>
              ))}
            </ul>
          </Row>
        )}
        {stage.id === "fab" && (
          <Row label="Learn more">
            {fabHref ? (
              <a href={fabHref} className="font-semibold text-brand underline underline-offset-2">
                See the Semiconductors module: the fab process loop
              </a>
            ) : (
              <span>
                See the <span className="font-semibold">Semiconductors module</span>, the fab process loop.
              </span>
            )}
          </Row>
        )}
      </div>
    </section>
  );
}

export function Flow({ props, onChange }: WidgetProps<FlowProps>) {
  const mode = props.mode ?? "explore";
  const highlight = props.highlight ?? [];
  const [st, setSt] = useState<FlowState>({ visited: [] });

  const pick = (id: string) => {
    const next: FlowState = { visited: st.visited.includes(id) ? st.visited : [...st.visited, id], selected: id };
    setSt(next);
    onChange?.(next);
  };

  const sel = st.selected ? stageById(st.selected) : undefined;
  const looped = FLOW_STAGES.filter((s) => s.loops.length > 0);

  return (
    <div className="w-full" data-widget>
      {props.title && <Caption className="mb-1.5">{props.title}</Caption>}
      <p className="mb-2 text-[0.88rem] leading-snug text-ink-2">
        Tap a stage to see what goes in, what comes out and who does it. {st.visited.length} of {FLOW_STAGES.length} seen.
      </p>
      <ol className="flex flex-col gap-3" aria-label="Chip design flow, in order">
        {GROUPS.map((g) => {
          const stages = FLOW_STAGES.filter((s) => s.side === g.side);
          return (
            <li key={g.side} className="rounded-xl border border-line bg-surface-2 p-2.5">
              <p className="mb-1.5 text-sm text-ink">
                <span className="font-bold">{g.label}</span> <span className="text-ink-3">{g.blurb}</span>
              </p>
              <ol className="flex flex-wrap items-center gap-x-1 gap-y-1.5">
                {stages.map((s, i) => {
                  const idx = FLOW_STAGES.indexOf(s) + 1;
                  const on = st.selected === s.id;
                  const seen = st.visited.includes(s.id);
                  const ring = highlight.includes(s.id);
                  return (
                    <li key={s.id} className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => pick(s.id)}
                        aria-pressed={on}
                        aria-label={`${idx}. ${s.name}${seen ? ", seen" : ""}${mode === "loops" && s.loops.length ? ", can loop back" : ""}`}
                        className={`inline-flex min-h-10 items-center gap-1.5 rounded-full border px-3 text-sm font-medium transition-colors ${
                          on ? "border-transparent bg-primary text-primary-ink" : "border-line bg-surface text-ink hover:border-[var(--line-strong)]"
                        } ${ring && !on ? "ring-2 ring-[var(--brand)] ring-offset-1 ring-offset-[var(--surface-2)]" : ""}`}
                      >
                        <span className={`font-mono text-xs ${on ? "" : "text-ink-3"}`}>{idx}</span>
                        <span>{s.short}</span>
                        {seen && !on && <span aria-hidden className="text-xs text-brand">{"✓"}</span>}
                        {mode === "loops" && s.loops.length > 0 && <span aria-hidden className="text-xs">{"↩"}</span>}
                      </button>
                      {i < stages.length - 1 && (
                        <span aria-hidden className="text-ink-3">
                          {"→"}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ol>
            </li>
          );
        })}
      </ol>
      <p className="mt-1 text-center text-xs text-ink-3">{"Front end → back end → fab. Read left to right, then down."}</p>

      <div className="mt-3">
        {sel ? <StageCard stage={sel} mode={mode} fabHref={props.fabHref} onGo={pick} /> : <Note>Pick any stage above.</Note>}
      </div>

      {mode === "loops" && (
        <div className="mt-3 rounded-xl border border-line bg-surface p-2.5">
          <Caption className="mb-1.5">Where a failure sends you back</Caption>
          <ul className="flex flex-col gap-1.5">
            {looped.flatMap((s) =>
              s.loops.map((l) => (
                <li key={s.id + l.to}>
                  <button
                    type="button"
                    onClick={() => pick(s.id)}
                    className="min-h-10 w-full rounded-lg border border-line bg-surface-2 px-3 py-1.5 text-left text-[0.88rem] leading-snug text-ink hover:border-[var(--line-strong)]"
                  >
                    <span className="font-semibold">{s.short}</span>
                    {" ↩ "}
                    <span className="font-semibold">{stageById(l.to)?.short}</span>
                    <span className="text-ink-2">: {l.why}</span>
                  </button>
                </li>
              )),
            )}
          </ul>
          <p className="mt-2 text-xs text-ink-3">The earlier a bug is found, the cheaper it is to fix: that is why loops that reach back to RTL are worth avoiding.</p>
        </div>
      )}
      <Toy>Simplified map: real projects overlap these stages, repeat them many times, and add steps such as power analysis, test insertion and formal checks.</Toy>
    </div>
  );
}
