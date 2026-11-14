import type { WidgetRegistry } from "@/learn/widget";

// --- lessons 1–4 (analog-a) imports ---
import { RcScope, checkRcScope } from "./RcScope";
import { LedBench, checkLedBench } from "./LedBench";
import { RlBench, checkRlBench } from "./RlBench";
import { AcLab, checkAcLab } from "./AcLab";

// --- lessons 5–7 (analog-b) imports ---
import { Reactance, checkReactance } from "./Reactance";
import { Filter, checkFilter } from "./Filter";
import { Psu, checkPsu } from "./Psu";
import { Regulator, checkRegulator } from "./Regulator";
import { TransistorSwitch, checkTransistorSwitch } from "./TransistorSwitch";

// --- lessons 8–10 (analog-c) imports ---
import { AmpStage, checkAmp } from "./AmpStage";
import { OpAmpLab, checkOpAmp } from "./OpAmpLab";
import { AdcSampler, checkAdc } from "./AdcSampler";

/**
 * Widgets for the "Components in action: capacitors to op-amps" module. Every key MUST be prefixed "analog-" so it stays unique
 * across the per-module registries.
 *
 * The validator finds widget types with a regex over this file, so register each one in exactly this
 * literal form (one per line, no computed keys, spreads or shorthand):
 *
 *   "analog-name": { Component: Name, check: checkName },
 */
export const ANALOG_WIDGETS: WidgetRegistry = {
  // --- lessons 1–4 (analog-a) ---
  "analog-rc": { Component: RcScope, check: checkRcScope },
  "analog-led": { Component: LedBench, check: checkLedBench },
  "analog-rl": { Component: RlBench, check: checkRlBench },
  "analog-ac": { Component: AcLab, check: checkAcLab },

  // --- lessons 5–7 (analog-b) ---
  "analog-reactance": { Component: Reactance, check: checkReactance },
  "analog-filter": { Component: Filter, check: checkFilter },
  "analog-psu": { Component: Psu, check: checkPsu },
  "analog-regulator": { Component: Regulator, check: checkRegulator },
  "analog-switch": { Component: TransistorSwitch, check: checkTransistorSwitch },

  // --- lessons 8–10 (analog-c) ---
  "analog-amp": { Component: AmpStage, check: checkAmp },
  "analog-opamp": { Component: OpAmpLab, check: checkOpAmp },
  "analog-adc": { Component: AdcSampler, check: checkAdc },
};
