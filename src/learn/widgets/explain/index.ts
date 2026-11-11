import type { WidgetRegistry } from "@/learn/widget";
import { LlmExplainer } from "./LlmExplainer";
import { DecompileExplainer } from "./DecompileExplainer";

/** Motion explainers: step-through animated explanations on the shared Explainer player. Keys are prefixed with "ex-". */
export const EXPLAIN_WIDGETS: WidgetRegistry = {
  "ex-llm": { Component: LlmExplainer },
  "ex-decompile": { Component: DecompileExplainer },
};
