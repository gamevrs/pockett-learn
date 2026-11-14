import type { WidgetRegistry } from "@/learn/widget";
import { Bounce, Critical, Z0, checkBounce, checkCritical, checkZ0 } from "./TLine";
import { Crosstalk, checkCrosstalk } from "./Crosstalk";
import { Datasheet, checkDatasheet } from "./Datasheet";
import { Decap, checkDecap } from "./Decap";
import { Emc, checkEmc } from "./Emc";
import { Erc, checkErc } from "./Erc";
import { FabFiles, checkFabFiles } from "./FabFiles";
import { Packages, checkPackages } from "./Packages";
import { Reflow, checkReflow } from "./Reflow";
import { Resistor, Smd, checkResistor, checkSmd } from "./Resistor";
import { ReturnPath, checkReturnPath } from "./ReturnPath";
import { Route, checkRoute } from "./Route";
import { Stackup, checkStackup } from "./Stackup";
import { TraceWidth, checkTraceWidth } from "./TraceWidth";

/**
 * Widgets for the "Components and PCB design" module. Every key MUST be prefixed "pcb-" so it stays unique
 * across the per-module registries.
 *
 * The validator finds widget types with a regex over this file, so register each one in exactly this
 * literal form (one per line, no computed keys, spreads or shorthand):
 *
 *   "pcb-name": { Component: Name, check: checkName },
 */
export const PCB_WIDGETS: WidgetRegistry = {
  "pcb-resistor": { Component: Resistor, check: checkResistor },
  "pcb-smd": { Component: Smd, check: checkSmd },
  "pcb-packages": { Component: Packages, check: checkPackages },
  "pcb-datasheet": { Component: Datasheet, check: checkDatasheet },
  "pcb-erc": { Component: Erc, check: checkErc },
  "pcb-stackup": { Component: Stackup, check: checkStackup },
  "pcb-tracewidth": { Component: TraceWidth, check: checkTraceWidth },
  "pcb-route": { Component: Route, check: checkRoute },
  "pcb-returnpath": { Component: ReturnPath, check: checkReturnPath },
  "pcb-decap": { Component: Decap, check: checkDecap },
  "pcb-critical": { Component: Critical, check: checkCritical },
  "pcb-bounce": { Component: Bounce, check: checkBounce },
  "pcb-z0": { Component: Z0, check: checkZ0 },
  "pcb-crosstalk": { Component: Crosstalk, check: checkCrosstalk },
  "pcb-emc": { Component: Emc, check: checkEmc },
  "pcb-fabfiles": { Component: FabFiles, check: checkFabFiles },
  "pcb-reflow": { Component: Reflow, check: checkReflow },
};
