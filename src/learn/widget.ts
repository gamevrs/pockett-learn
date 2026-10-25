import type React from "react";

/**
 * Contract for an interactive widget inside a concept lesson.
 *
 * Widgets are self-contained client components drawn on a light/dark-aware card (they use the
 * page theme tokens: bg-surface, text-ink, border-line, bg-primary for the accent…). Keep them
 * small, touch-friendly (≥ 40px targets) and responsive from 320px wide. No external assets.
 */
export interface WidgetProps<P = Record<string, unknown>> {
  /** Static configuration from the lesson data (WidgetSpec.props). */
  props: P;
  /** Report the current state whenever it changes; "widget" goal questions check it. */
  onChange?: (state: unknown) => void;
  /** True once the step's question is answered: a widget may reveal extra detail or lock itself. */
  revealed?: boolean;
  /**
   * The step's answer state: "correct", "wrong" (the learner can still change things), or
   * "revealed" (they gave up; a widget may draw the solution). "idle" before checking.
   */
  status?: "idle" | "correct" | "wrong" | "revealed";
  /** For "widget" goal questions: the target, so a widget can show it once revealed. */
  goal?: Record<string, unknown>;
}

export interface WidgetDef {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Component: React.ComponentType<WidgetProps<any>>;
  /** For "widget" goal questions: does this state satisfy the goal from the lesson data? */
  check?: (state: unknown, goal: Record<string, unknown>) => boolean;
}

export type WidgetRegistry = Record<string, WidgetDef>;
