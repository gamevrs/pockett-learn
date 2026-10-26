import { createStaticProgram, type ProgramHandle } from "@/engine/program";
import { DEMO_STDOUT, DEMO_VARS } from "./demo-data";

/**
 * What the finished Halyard Port program prints (see demo-data.ts), so the landing page can show
 * the port board without calling the code runner.
 */
export function csharpLinqDemoProgram(): ProgramHandle {
  return createStaticProgram({ stdout: DEMO_STDOUT, vars: DEMO_VARS });
}
