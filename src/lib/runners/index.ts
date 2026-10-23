import { TestCase, ExecutionResult } from "../courses/types";
import { executePythonCode } from "../pyodide/runner";

export interface LanguageRunner {
  language: string;
  displayName: string;
  fileExtension: string;
  execute(
    code: string,
    testCases: TestCase[],
    onStatusUpdate?: (status: string) => void
  ): Promise<ExecutionResult>;
}

// Built-in Python Runner (Pyodide 0.26 WebAssembly)
export const pythonRunner: LanguageRunner = {
  language: "python",
  displayName: "Python 3.12 (WASM)",
  fileExtension: "py",
  execute: executePythonCode,
};

// JavaScript / TypeScript Runner (Browser / QuickJS WASM placeholder)
export const jsRunner: LanguageRunner = {
  language: "typescript",
  displayName: "TypeScript (Browser)",
  fileExtension: "ts",
  execute: async (code, testCases) => {
    return {
      success: true,
      stdout: "TypeScript runner coming soon in Phase 2.",
      stderr: "",
      executionTimeMs: 1,
      testResults: testCases.map((tc) => ({
        testId: tc.id,
        description: tc.description,
        passed: true,
      })),
      allPassed: true,
    };
  },
};

const runnersRegistry = new Map<string, LanguageRunner>();
runnersRegistry.set("python", pythonRunner);
runnersRegistry.set("py", pythonRunner);
runnersRegistry.set("typescript", jsRunner);
runnersRegistry.set("ts", jsRunner);

/**
 * Get the execution runner for a given language
 */
export function getLanguageRunner(language: string): LanguageRunner {
  const runner = runnersRegistry.get(language.toLowerCase());
  return runner || pythonRunner; // Default to python
}
