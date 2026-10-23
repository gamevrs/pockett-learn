import { TestCase, TestResult, ExecutionResult } from "../courses/types";

// Declare Pyodide window interface
declare global {
  interface Window {
    loadPyodide?: (config: { indexURL: string }) => Promise<any>;
    __pyodideInstance?: any;
    __pyodideLoadingPromise?: Promise<any>;
  }
}

let pyodideInstance: any = null;
let isLoadingPyodide = false;

export async function getPyodide(
  onProgress?: (message: string) => void
): Promise<any> {
  if (typeof window === "undefined") {
    throw new Error("Pyodide can only run in the browser");
  }

  if (window.__pyodideInstance) {
    return window.__pyodideInstance;
  }

  if (window.__pyodideLoadingPromise) {
    return window.__pyodideLoadingPromise;
  }

  window.__pyodideLoadingPromise = (async () => {
    onProgress?.("Loading WebAssembly Python Kernel...");

    // Dynamically inject Pyodide script tag if not present
    if (!window.loadPyodide) {
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js";
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () =>
          reject(new Error("Failed to load Pyodide runtime script from CDN"));
        document.head.appendChild(script);
      });
    }

    onProgress?.("Compiling Python 3.12 WebAssembly...");
    const pyodide = await window.loadPyodide!({
      indexURL: "https://cdn.jsdelivr.net/pyodide/v0.26.4/full/",
    });

    window.__pyodideInstance = pyodide;
    pyodideInstance = pyodide;
    onProgress?.("Python Kernel Ready!");
    return pyodide;
  })();

  return window.__pyodideLoadingPromise;
}

export async function executePythonCode(
  code: string,
  testCases: TestCase[] = [],
  onStatusUpdate?: (status: string) => void
): Promise<ExecutionResult> {
  const startTime = performance.now();
  let stdoutOutput = "";
  let stderrOutput = "";

  try {
    onStatusUpdate?.("Initializing Python runtime...");
    const py = await getPyodide(onStatusUpdate);

    // Setup stdout and stderr capture buffers
    py.setStdout({
      batched: (msg: string) => {
        stdoutOutput += (stdoutOutput ? "\n" : "") + msg;
      },
    });

    py.setStderr({
      batched: (msg: string) => {
        stderrOutput += (stderrOutput ? "\n" : "") + msg;
      },
    });

    onStatusUpdate?.("Executing code...");
    // Create clean isolated namespace for execution
    const globals = py.toPy({});

    // Run user code
    await py.runPythonAsync(code, { globals });

    onStatusUpdate?.("Running test assertions...");
    const testResults: TestResult[] = [];

    // Evaluate each test case in the same globals environment
    for (const test of testCases) {
      try {
        // Expose stdout output inside Python globals for tests that verify print statements
        globals.set("__stdout__", stdoutOutput);

        // Run the assertion
        await py.runPythonAsync(test.assertionCode, { globals });
        testResults.push({
          testId: test.id,
          description: test.description,
          passed: true,
        });
      } catch (err: any) {
        let errorMsg = err?.message || String(err);
        // Clean up Pyodide trace noise
        if (errorMsg.includes("AssertionError: ")) {
          errorMsg = errorMsg.split("AssertionError: ")[1]?.split("\n")[0] || "Assertion failed";
        } else if (errorMsg.includes("NameError: ")) {
          errorMsg = errorMsg.split("NameError: ")[1]?.split("\n")[0] || errorMsg;
        }

        testResults.push({
          testId: test.id,
          description: test.description,
          passed: false,
          error: errorMsg,
        });
      }
    }

    const duration = Math.round(performance.now() - startTime);
    const allPassed =
      testCases.length > 0
        ? testResults.every((t) => t.passed)
        : true;

    return {
      success: true,
      stdout: stdoutOutput,
      stderr: stderrOutput,
      executionTimeMs: duration,
      testResults,
      allPassed,
    };
  } catch (err: any) {
    const duration = Math.round(performance.now() - startTime);
    const errorMsg = err?.message || String(err);

    return {
      success: false,
      stdout: stdoutOutput,
      stderr: (stderrOutput ? stderrOutput + "\n" : "") + errorMsg,
      executionTimeMs: duration,
      testResults: testCases.map((tc) => ({
        testId: tc.id,
        description: tc.description,
        passed: false,
        error: "Execution halted by runtime error",
      })),
      allPassed: false,
    };
  }
}
