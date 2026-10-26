import { gradeProgram, preloadPython, runProgram } from "../python/host";
import type { Runtime } from "./types";

/** Python via Pyodide, on the main thread so scene hooks can be called synchronously. */
export const pythonRuntime: Runtime = {
  language: "python",
  preload: preloadPython,
  run: (source, options) => runProgram(source, options?.onStatus, options?.packages),
  grade: (source, tests, options) => gradeProgram(source, tests, options?.onStatus, options?.packages),
};
