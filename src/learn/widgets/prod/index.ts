import type { WidgetRegistry } from "@/learn/widget";
import { Architecture, checkArchitecture } from "./Architecture";
import { Battery, checkBattery } from "./Battery";
import { Bringup, checkBringup } from "./Bringup";
import { Cert, checkCert } from "./Cert";
import { Detective, checkDetective } from "./Detective";
import { Ota, Pareto, checkOta, checkPareto } from "./Field";
import { Fsm, Layers, checkFsm, checkLayers } from "./Firmware";
import { Requirements, checkRequirements } from "./Requirements";
import { Risk, checkRisk } from "./Risk";
import { Stages, checkStages } from "./Stages";
import { Pyramid, TestFlow, checkPyramid, checkTestFlow } from "./Testing";

/**
 * Widgets for the "Building real products" module. Every key MUST be prefixed "prod-" so it stays unique
 * across the per-module registries.
 *
 * The validator finds widget types with a regex over this file, so register each one in exactly this
 * literal form (one per line, no computed keys, spreads or shorthand):
 *
 *   "prod-name": { Component: Name, check: checkName },
 */
export const PROD_WIDGETS: WidgetRegistry = {
  "prod-requirements": { Component: Requirements, check: checkRequirements },
  "prod-battery": { Component: Battery, check: checkBattery },
  "prod-architecture": { Component: Architecture, check: checkArchitecture },
  "prod-stages": { Component: Stages, check: checkStages },
  "prod-risk": { Component: Risk, check: checkRisk },
  "prod-layers": { Component: Layers, check: checkLayers },
  "prod-fsm": { Component: Fsm, check: checkFsm },
  "prod-bringup": { Component: Bringup, check: checkBringup },
  "prod-detective": { Component: Detective, check: checkDetective },
  "prod-pyramid": { Component: Pyramid, check: checkPyramid },
  "prod-testflow": { Component: TestFlow, check: checkTestFlow },
  "prod-cert": { Component: Cert, check: checkCert },
  "prod-ota": { Component: Ota, check: checkOta },
  "prod-pareto": { Component: Pareto, check: checkPareto },
};
