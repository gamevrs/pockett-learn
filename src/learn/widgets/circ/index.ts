import type { WidgetRegistry } from "@/learn/widget";
import { Capacity, checkCapacity } from "./Capacity";
import { Divider, checkDivider } from "./Divider";
import { Fuse, checkFuse } from "./Fuse";
import { Kirchhoff, checkKirchhoff } from "./Kirchhoff";
import { Multimeter, checkMultimeter } from "./Multimeter";
import { Network, checkNetwork } from "./Network";
import { Ohm, checkOhm } from "./Ohm";
import { Power, checkPower } from "./Power";
import { Source, checkSource } from "./Source";
import { Nets, Symbols, checkNets, checkSymbols } from "./Symbols";
import { Water, checkWater } from "./Water";

/**
 * Widgets for the "Electronics from zero: circuits" module. Every key MUST be prefixed "circ-" so it stays unique
 * across the per-module registries.
 *
 * The validator finds widget types with a regex over this file, so register each one in exactly this
 * literal form (one per line, no computed keys, spreads or shorthand):
 *
 *   "circ-name": { Component: Name, check: checkName },
 */
export const CIRC_WIDGETS: WidgetRegistry = {
  "circ-water": { Component: Water, check: checkWater },
  "circ-ohm": { Component: Ohm, check: checkOhm },
  "circ-power": { Component: Power, check: checkPower },
  "circ-capacity": { Component: Capacity, check: checkCapacity },
  "circ-network": { Component: Network, check: checkNetwork },
  "circ-kirchhoff": { Component: Kirchhoff, check: checkKirchhoff },
  "circ-divider": { Component: Divider, check: checkDivider },
  "circ-symbols": { Component: Symbols, check: checkSymbols },
  "circ-nets": { Component: Nets, check: checkNets },
  "circ-multimeter": { Component: Multimeter, check: checkMultimeter },
  "circ-source": { Component: Source, check: checkSource },
  "circ-fuse": { Component: Fuse, check: checkFuse },
};
