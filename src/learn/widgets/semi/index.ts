import type { WidgetRegistry } from "@/learn/widget";
import { Bands, checkBands } from "./Bands";
import { Dope, checkDope } from "./Dope";
import { Fab, checkFab } from "./Fab";
import { Litho, checkLitho } from "./Litho";
import { Mosfet, checkMosfet } from "./Mosfet";
import { Pack, TestFlow, checkPack, checkTestFlow } from "./Package";
import { Pn, checkPn } from "./Pn";
import { Dennard, Gates, Leak, Moore, checkDennard, checkGates, checkLeak, checkMoore } from "./Scaling";
import { Ingot, Iso, checkIso } from "./Wafer";
import { Chiplet, Yield, checkChiplet, checkYield } from "./Yield";

/**
 * Widgets for the "Semiconductors: physics to fab" module. Every key MUST be prefixed "semi-" so it stays unique
 * across the per-module registries.
 *
 * The validator finds widget types with a regex over this file, so register each one in exactly this
 * literal form (one per line, no computed keys, spreads or shorthand):
 *
 *   "semi-name": { Component: Name, check: checkName },
 */
export const SEMI_WIDGETS: WidgetRegistry = {
  "semi-bands": { Component: Bands, check: checkBands },
  "semi-dope": { Component: Dope, check: checkDope },
  "semi-pn": { Component: Pn, check: checkPn },
  "semi-mosfet": { Component: Mosfet, check: checkMosfet },
  "semi-moore": { Component: Moore, check: checkMoore },
  "semi-dennard": { Component: Dennard, check: checkDennard },
  "semi-leak": { Component: Leak, check: checkLeak },
  "semi-gates": { Component: Gates, check: checkGates },
  "semi-ingot": { Component: Ingot },
  "semi-iso": { Component: Iso, check: checkIso },
  "semi-fab": { Component: Fab, check: checkFab },
  "semi-litho": { Component: Litho, check: checkLitho },
  "semi-yield": { Component: Yield, check: checkYield },
  "semi-chiplet": { Component: Chiplet, check: checkChiplet },
  "semi-pack": { Component: Pack, check: checkPack },
  "semi-test": { Component: TestFlow, check: checkTestFlow },
};
