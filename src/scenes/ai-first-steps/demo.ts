import { createStaticProgram, type ProgramHandle } from "@/engine/program";
import { DEMO_STDOUT, DEMO_VARS } from "./demo-data.ts";

/**
 * The finished Pebble Beach program as plain data: the frozen variables of the reference solution
 * (see scripts/gen-demo-ai-first-steps.mjs), so the landing page and the project hub can run the whole
 * lab without loading Python.
 */
export function aiFirstStepsDemoProgram(): ProgramHandle {
  return createStaticProgram({ stdout: DEMO_STDOUT, vars: DEMO_VARS });
}
