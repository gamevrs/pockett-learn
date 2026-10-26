import { createStaticProgram, type ProgramHandle } from "@/engine/program";
import { buildReferenceProgram } from "./port.ts";

/**
 * The finished Orchard Vision program, written in plain TypeScript (a port of the reference Python
 * solution) so the landing page can run the whole lab without loading Python.
 */
export function aiFoundationsDemoProgram(): ProgramHandle {
  const { vars, hooks } = buildReferenceProgram();
  const report = vars.report as { accuracy: number; test_size: number };
  return createStaticProgram({
    stdout: `Orchard Vision online: ${Math.round(report.accuracy * 100)} percent right on ${report.test_size} unseen fruit\n`,
    vars,
    hooks,
  });
}
