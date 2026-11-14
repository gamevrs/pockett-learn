import type { WidgetRegistry } from "@/learn/widget";
import { VerilogSim, checkVerilog } from "./VerilogSim";
import { Testbench, checkTestbench } from "./Testbench";
import { Place, checkPlacement } from "./Place";
import { Cts, checkCts } from "./Cts";
import { Coverage, checkCoverage } from "./Coverage";
import { Scan, checkScan } from "./Scan";
import { Crossover, checkCrossover } from "./Crossover";
import { Flow, checkFlow } from "./Flow";
import { HwSw, checkHwSw } from "./HwSw";
import { Synth, checkSynth } from "./Synth";
import { Sta, checkSta } from "./Sta";
import { Power, checkPower } from "./Power";

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
  "chip-place": { Component: Place, check: checkPlacement },
  "chip-cts": { Component: Cts, check: checkCts },
  "chip-coverage": { Component: Coverage, check: checkCoverage },
  "chip-scan": { Component: Scan, check: checkScan },
  "chip-crossover": { Component: Crossover, check: checkCrossover },
  "chip-flow": { Component: Flow, check: checkFlow },
  "chip-hwsw": { Component: HwSw, check: checkHwSw },
  "chip-synth": { Component: Synth, check: checkSynth },
  "chip-sta": { Component: Sta, check: checkSta },
  "chip-power": { Component: Power, check: checkPower },
};
