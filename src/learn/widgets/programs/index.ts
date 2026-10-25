import type { WidgetRegistry } from "@/learn/widget";
import { checkTrace, Trace } from "./Trace";
import { checkEvaluate, Evaluate } from "./Evaluate";
import { checkTruthTable, TruthTable } from "./TruthTable";
import { checkLoop, Loop } from "./Loop";
import { checkListIndex, ListIndex } from "./ListIndex";
import { checkTypeSort, TypeSort } from "./TypeSort";
import { checkDivide, Divide } from "./Divide";

/** Module 2 widgets: how programs run. */
export const PROGRAMS_WIDGETS: WidgetRegistry = {
  trace: { Component: Trace, check: checkTrace },
  evaluate: { Component: Evaluate, check: checkEvaluate },
  "truth-table": { Component: TruthTable, check: checkTruthTable },
  loop: { Component: Loop, check: checkLoop },
  "list-index": { Component: ListIndex, check: checkListIndex },
  "type-sort": { Component: TypeSort, check: checkTypeSort },
  divide: { Component: Divide, check: checkDivide },
};
