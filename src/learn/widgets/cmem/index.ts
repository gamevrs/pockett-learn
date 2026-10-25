import type { WidgetRegistry } from "@/learn/widget";
import { checkMemoryMap, MemoryMap } from "./MemoryMap";
import { checkPointer, PointerPlayground } from "./Pointer";
import { ArrayMem, checkArrayMem } from "./ArrayMem";
import { checkStringWalk, StringWalk } from "./StringWalk";
import { checkCTrace, CTrace } from "./CTrace";
import { checkPipeline, Pipeline } from "./Pipeline";
import { checkOverflow, Overflow } from "./Overflow";

/** Widgets for the "C and memory" module. Keys are prefixed with "cmem-" to stay unique. */
export const CMEM_WIDGETS: WidgetRegistry = {
  "cmem-memory": { Component: MemoryMap, check: checkMemoryMap },
  "cmem-pointer": { Component: PointerPlayground, check: checkPointer },
  "cmem-array": { Component: ArrayMem, check: checkArrayMem },
  "cmem-string": { Component: StringWalk, check: checkStringWalk },
  "cmem-trace": { Component: CTrace, check: checkCTrace },
  "cmem-pipeline": { Component: Pipeline, check: checkPipeline },
  "cmem-overflow": { Component: Overflow, check: checkOverflow },
};
