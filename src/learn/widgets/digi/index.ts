import type { WidgetRegistry } from "@/learn/widget";
import { Bounce, checkBounce } from "./Bounce";
import { CmosGate, checkCmosGate } from "./CmosGate";
import { FsmPlay, checkFsm } from "./Fsm";
import { Inverter, checkInverter } from "./Inverter";
import { Latch, checkLatch } from "./Latch";
import { Meta, Mtbf, checkMeta, checkMtbf } from "./Meta";
import { MuxPlay, checkMux } from "./Mux";
import { NandNet, checkNandNet } from "./NandNet";
import { Seq, checkSeq } from "./Seq";
import { Timing, checkTiming } from "./Timing";

/**
 * Widgets for the "Digital logic from transistors" module. Every key MUST be prefixed "digi-" so it stays unique
 * across the per-module registries.
 *
 * The validator finds widget types with a regex over this file, so register each one in exactly this
 * literal form (one per line, no computed keys, spreads or shorthand):
 *
 *   "digi-name": { Component: Name, check: checkName },
 */
export const DIGI_WIDGETS: WidgetRegistry = {
  "digi-inverter": { Component: Inverter, check: checkInverter },
  "digi-cmos-gate": { Component: CmosGate, check: checkCmosGate },
  "digi-nand-net": { Component: NandNet, check: checkNandNet },
  "digi-mux": { Component: MuxPlay, check: checkMux },
  "digi-latch": { Component: Latch, check: checkLatch },
  "digi-seq": { Component: Seq, check: checkSeq },
  "digi-fsm": { Component: FsmPlay, check: checkFsm },
  "digi-timing": { Component: Timing, check: checkTiming },
  "digi-meta": { Component: Meta, check: checkMeta },
  "digi-mtbf": { Component: Mtbf, check: checkMtbf },
  "digi-bounce": { Component: Bounce, check: checkBounce },
};
