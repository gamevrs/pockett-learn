import type { ProgramHandle } from "@/engine/program";
import { garageDemoProgram } from "./garage/demo";
import { launchDemoProgram } from "./launch/demo";
import { beatlabDemoProgram } from "./beatlab/demo";
import { sqldeskDemoProgram } from "./sqldesk/demo";
import { signalLabDemoProgram } from "./signal-lab/demo";
import { cargoControlDemoProgram } from "./cargo-control/demo";
import { storeApiDemoProgram } from "./store-api/demo";
import { smartHomeDemoProgram } from "./smart-home/demo";

/** Scripted stand-ins for a finished learner program, keyed by project slug. Used on the landing page. */
export const DEMO_PROGRAMS: Record<string, () => ProgramHandle> = {
  garage: garageDemoProgram,
  launch: launchDemoProgram,
  beatlab: beatlabDemoProgram,
  "pit-wall": sqldeskDemoProgram,
  "signal-lab": signalLabDemoProgram,
  "cargo-control": cargoControlDemoProgram,
  "store-api": storeApiDemoProgram,
  "smart-home": smartHomeDemoProgram,
};
