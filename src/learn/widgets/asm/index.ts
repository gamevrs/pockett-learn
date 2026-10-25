import type { WidgetRegistry } from "@/learn/widget";
import { AsmCpu, checkCpu } from "./Cpu";
import { AsmEncode, checkEncode } from "./Encode";
import { AsmFlags, checkFlags } from "./Flags";

/** Widgets for the "Assembly: talking to the CPU" module. Keys are prefixed with "asm-" to stay unique. */
export const ASM_WIDGETS: WidgetRegistry = {
  "asm-cpu": { Component: AsmCpu, check: checkCpu },
  "asm-encode": { Component: AsmEncode, check: checkEncode },
  "asm-flags": { Component: AsmFlags, check: checkFlags },
};
