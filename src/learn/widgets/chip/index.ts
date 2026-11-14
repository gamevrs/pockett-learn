import type { WidgetRegistry } from "@/learn/widget";
import { VerilogSim, checkVerilog } from "./VerilogSim";
import { Testbench, checkTestbench } from "./Testbench";

/**
 * Widgets for the "Designing chips: from RTL to tape-out" module. Every key MUST be prefixed "chip-" so it stays unique
 * across the per-module registries.
 *
 * The validator finds widget types with a regex over this file, so register each one in exactly this
 * literal form (one per line, no computed keys, spreads or shorthand):
 *
 *   "chip-name": { Component: Name, check: checkName },
 */
export const CHIP_WIDGETS: WidgetRegistry = {
  "chip-verilog": { Component: VerilogSim, check: checkVerilog },
  "chip-testbench": { Component: Testbench, check: checkTestbench },
};
