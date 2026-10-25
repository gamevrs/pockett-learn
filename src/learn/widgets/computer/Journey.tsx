"use client";

import React, { useState } from "react";
import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import type { WidgetProps } from "@/learn/widget";
import { Btn, Icon } from "./ui";

export interface JourneyStage {
  /** Icon key from ICONS in ./ui (cpu, ram, storage, keyboard, firmware, kernel, app, interrupt, power…). */
  icon: string;
  title: string;
  text: string;
  /** Short tag on the right, e.g. "hardware", "≈ 1 ms". */
  tag?: string;
}

export interface JourneyProps {
  stages: JourneyStage[];
  /** Hide the titles of stages not reached yet. Default true. */
  hideAhead?: boolean;
}

export interface JourneyState {
  pos: number;
  atEnd: boolean;
}

/** Step through a chain of events (a key press, a boot) one stage at a time. */
export function Journey({ props, onChange }: WidgetProps<JourneyProps>) {
  const stages = props.stages ?? [];
  const hide = props.hideAhead ?? true;
  const [pos, setPos] = useState(1);
  const go = (p: number) => {
    const np = Math.max(1, Math.min(stages.length, p));
    setPos(np);
    onChange?.({ pos: np, atEnd: np === stages.length } satisfies JourneyState);
  };

  return (
    <div className="w-full">
      <ol className="relative grid gap-1">
        {stages.map((s, i) => {
          const n = i + 1;
          const now = n === pos;
          const done = n < pos;
          const ahead = n > pos;
          return (
            <li key={i} className="relative flex gap-3">
              {i < stages.length - 1 && <span className={`absolute left-[19px] top-10 h-[calc(100%-1.75rem)] w-0.5 ${done ? "bg-[var(--brand)]/60" : "bg-line"}`} aria-hidden />}
              <button
                type="button"
                onClick={() => !ahead && go(n)}
                disabled={ahead}
                aria-label={`Stage ${n}${ahead ? "" : `: ${s.title}`}`}
                className={`relative z-[1] grid h-10 w-10 shrink-0 place-items-center rounded-full border transition-colors ${
                  now ? "border-transparent bg-primary text-primary-ink shadow-[0_0_0_4px_var(--brand-soft)]" : done ? "border-[var(--brand)]/50 bg-tint text-brand" : "border-line bg-surface-2 text-ink-3"
                }`}
              >
                <Icon name={s.icon} className="h-[18px] w-[18px]" />
              </button>
              <div className={`min-w-0 flex-1 pb-2 ${now ? "rounded-xl border border-[var(--brand)]/40 bg-tint px-3 py-2" : "pt-2.5"}`}>
                <div className="flex items-baseline gap-2">
                  <span className={`font-mono text-[11px] ${now ? "text-brand" : "text-ink-3"}`}>{n}</span>
                  <p className={`text-[0.92rem] font-semibold ${ahead ? "text-ink-3" : "text-ink"}`}>{ahead && hide ? "…" : s.title}</p>
                  {s.tag && !(ahead && hide) && <span className="chip ml-auto shrink-0">{s.tag}</span>}
                </div>
                {now && <p className="mt-1 text-[0.88rem] leading-relaxed text-ink-2">{s.text}</p>}
              </div>
            </li>
          );
        })}
      </ol>
      <div className="mt-3 flex items-center justify-center gap-2">
        <Btn onClick={() => go(pos - 1)} disabled={pos <= 1} label="Back">
          <ChevronLeft className="h-4 w-4" /> Back
        </Btn>
        {pos < stages.length ? (
          <Btn primary onClick={() => go(pos + 1)}>
            Next <ChevronRight className="h-4 w-4" />
          </Btn>
        ) : (
          <Btn onClick={() => go(1)}>
            <RotateCcw className="h-4 w-4" /> From the start
          </Btn>
        )}
      </div>
    </div>
  );
}

/** goal: { atEnd: true } or { pos: n }. */
export function checkJourney(state: unknown, goal: Record<string, unknown>) {
  const s = state as JourneyState | undefined;
  if (!s) return false;
  if (goal.atEnd === true) return s.atEnd;
  if (typeof goal.pos === "number") return s.pos === goal.pos;
  return false;
}
