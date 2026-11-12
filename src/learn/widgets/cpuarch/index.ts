import type { WidgetRegistry } from "@/learn/widget";
import { Adder, checkAdder } from "./Adder";
import { Amdahl, checkAmdahl } from "./Amdahl";
import { Branch, checkBranch } from "./Branch";
import { Cpi, checkCpi } from "./Cpi";
import { Datapath, checkDatapath } from "./Datapath";
import { Ooo, checkOoo } from "./Ooo";
import { Pipeline, checkPipeline } from "./Pipeline";
import { Counters, Flame, checkCounters, checkFlame } from "./Profile";
import { Simd, checkSimd } from "./Simd";

/**
 * Widgets for the "How a CPU runs your code" module. Every key MUST be prefixed "cpuarch-" so it stays unique
 * across the per-module registries.
 *
 * The validator finds widget types with a regex over this file, so register each one in exactly this
 * literal form (one per line, no computed keys, spreads or shorthand):
 *
 *   "cpuarch-name": { Component: Name, check: checkName },
 */
export const CPUARCH_WIDGETS: WidgetRegistry = {
  "cpuarch-adder": { Component: Adder, check: checkAdder },
  "cpuarch-datapath": { Component: Datapath, check: checkDatapath },
  "cpuarch-cpi": { Component: Cpi, check: checkCpi },
  "cpuarch-pipeline": { Component: Pipeline, check: checkPipeline },
  "cpuarch-branch": { Component: Branch, check: checkBranch },
  "cpuarch-ooo": { Component: Ooo, check: checkOoo },
  "cpuarch-amdahl": { Component: Amdahl, check: checkAmdahl },
  "cpuarch-simd": { Component: Simd, check: checkSimd },
  "cpuarch-counters": { Component: Counters, check: checkCounters },
  "cpuarch-flame": { Component: Flame, check: checkFlame },
};
