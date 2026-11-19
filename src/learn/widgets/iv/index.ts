import type { WidgetRegistry } from "@/learn/widget";
import { checkTrace, Trace } from "./Trace";

/** Widgets for the interview-practice part. Keys are prefixed with "iv-" to stay unique. */
export const IV_WIDGETS: WidgetRegistry = {
  "iv-trace": { Component: Trace, check: checkTrace },
};
