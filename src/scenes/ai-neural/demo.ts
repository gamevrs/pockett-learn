import { createStaticProgram, type ProgramHandle } from "@/engine/program";
import { DEMO_STDOUT, DEMO_VARS } from "./demo-data.ts";
import { forwardPass, readNet } from "./data.ts";

/**
 * The finished Glyph Greenhouse program as plain data: the frozen variables of the reference solution
 * (see scripts/gen-demo-ai-neural.mjs) plus a predict() rebuilt from its trained weights, so the landing
 * page and the project hub can run the whole greenhouse without loading Python.
 */
export function glyphGreenhouseDemoProgram(): ProgramHandle {
  const net = readNet(DEMO_VARS.net_view);
  return createStaticProgram({
    stdout: DEMO_STDOUT,
    vars: DEMO_VARS,
    hooks: {
      predict: (pixels: unknown) => {
        if (!net || !Array.isArray(pixels)) return null;
        return forwardPass(net, pixels.map((v) => (typeof v === "number" ? v : 0))).probs;
      },
    },
  });
}
