import type { WidgetRegistry } from "@/learn/widget";
import { Addr, CacheSim, checkAddr, checkCacheSim } from "./CacheView";
import { Cell, RowBuf, checkCell, checkRowBuf } from "./Dram";
import { Amat, Curve, Pipe, checkAmat, checkCurve, checkPipe } from "./Latency";
import { Litmus, Race, checkLitmus, checkRace } from "./Litmus";
import { FalseShare, Mesi, checkFalseShare, checkMesi } from "./Mesi";
import { Roofline, checkRoofline } from "./Roofline";
import { Frag, Struct, checkFrag, checkStruct } from "./Struct";
import { PageTable, Swap, Tlb, checkPageTable, checkSwap, checkTlb } from "./Vm";
import { Layout, Walk, checkLayout, checkWalk } from "./Walk";

/**
 * Widgets for the "Memory: from bytes to the hierarchy" module. Every key MUST be prefixed "memsys-" so it stays unique
 * across the per-module registries.
 *
 * The validator finds widget types with a regex over this file, so register each one in exactly this
 * literal form (one per line, no computed keys, spreads or shorthand):
 *
 *   "memsys-name": { Component: Name, check: checkName },
 */
export const MEMSYS_WIDGETS: WidgetRegistry = {
  "memsys-cell": { Component: Cell, check: checkCell },
  "memsys-rowbuf": { Component: RowBuf, check: checkRowBuf },
  "memsys-amat": { Component: Amat, check: checkAmat },
  "memsys-pipe": { Component: Pipe, check: checkPipe },
  "memsys-curve": { Component: Curve, check: checkCurve },
  "memsys-walk": { Component: Walk, check: checkWalk },
  "memsys-layout": { Component: Layout, check: checkLayout },
  "memsys-addr": { Component: Addr, check: checkAddr },
  "memsys-cache": { Component: CacheSim, check: checkCacheSim },
  "memsys-struct": { Component: Struct, check: checkStruct },
  "memsys-frag": { Component: Frag, check: checkFrag },
  "memsys-pagetable": { Component: PageTable, check: checkPageTable },
  "memsys-tlb": { Component: Tlb, check: checkTlb },
  "memsys-swap": { Component: Swap, check: checkSwap },
  "memsys-mesi": { Component: Mesi, check: checkMesi },
  "memsys-falseshare": { Component: FalseShare, check: checkFalseShare },
  "memsys-litmus": { Component: Litmus, check: checkLitmus },
  "memsys-race": { Component: Race, check: checkRace },
  "memsys-roofline": { Component: Roofline, check: checkRoofline },
};
