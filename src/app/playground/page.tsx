"use client";

import React, { useState } from "react";
import { Play, Sparkles, Terminal, Code2, Trash2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { CodeEditor } from "@/components/editor/CodeEditor";
import { ConsoleOutput } from "@/components/editor/ConsoleOutput";
import { executePythonCode } from "@/lib/pyodide/runner";
import { sound } from "@/lib/sound/sound";
import { AdBanner } from "@/components/ads/AdBanner";

const PRESET_SCRIPTS: { label: string; code: string }[] = [
  {
    label: "Artemis Mission Control Suite (mission_control.py)",
    code: `# ==========================================================
# ARTEMIS MISSION CONTROL SUITE (mission_control.py)
# Ground truth capstone project inspired by Data with Baraa
# ==========================================================

class ArtemisMissionControl:
    def __init__(self, mission_name="ARTEMIS II", commander="Wiseman"):
        self.mission_name = mission_name
        self.commander = commander
        self.telemetry = {
            "CABIN_PRESSURE_PSI": 14.7,
            "OXYGEN_PURITY_PCT": 99.2,
            "MAIN_BUS_VOLTAGE_V": 28.4,
            "VELOCITY_KM_S": 10.92,
            "DIST_TO_MOON_KM": 384400.0,
        }
        self.passcode = "MC-ARTEMIS2026"
        self.authenticated = False

    def authenticate(self, key):
        clean_key = key.strip()
        if clean_key == self.passcode:
            self.authenticated = True
            print(f"[AUTH] Access granted for Flight Director / Commander {self.commander}")
            return True
        print("[AUTH] REJECTED: Invalid security clearance key.")
        return False

    def display_banner(self):
        print("=" * 60)
        print(f"       NASA ARTEMIS MISSION CONTROL TERMINAL v3.12")
        print(f"       MISSION: {self.mission_name} | COMMANDER: {self.commander}")
        print("=" * 60)

    def run_subsystem_diagnostics(self):
        print("\\n--- INITIATING SUBSYSTEM DIAGNOSTICS SWEEP ---")
        for system, value in self.telemetry.items():
            status = "NOMINAL"
            if "PRESSURE" in system and (value < 13.0 or value > 16.0):
                status = "WARNING"
            print(f"  [+] {system:<24}: {value:>10} --> [{status}]")
        print("--- ALL 5 CRITICAL SUBSYSTEMS REPORTING ONLINE ---\\n")

    def execute_burn_calculation(self, burn_duration_s=120.0):
        print(f"Calculating trans-lunar injection burn ({burn_duration_s}s)...")
        delta_v = round(burn_duration_s * 9.81 * 0.45, 2)
        print(f"Projected Delta-V: {delta_v} m/s")
        print("Trajectory solution verified. Flight Computer Ready for Execution.")

# Run demonstration
mc = ArtemisMissionControl()
mc.display_banner()
mc.authenticate("MC-ARTEMIS2026")
mc.run_subsystem_diagnostics()
mc.execute_burn_calculation(180)
`,
  },
  {
    label: "Monte Carlo Pi Estimation",
    code: `# Monte Carlo Pi Estimation Simulation
import random
import math

def estimate_pi(num_samples: int) -> float:
    inside_circle = 0
    for _ in range(num_samples):
        x = random.random()
        y = random.random()
        if x**2 + y**2 <= 1.0:
            inside_circle += 1
    return 4.0 * inside_circle / num_samples

samples = 250_000
approx_pi = estimate_pi(samples)
print(f"Computed Pi with {samples:,} random samples: {approx_pi:.6f}")
print(f"Official math.pi:                        {math.pi:.6f}")
print(f"Absolute Error:                          {abs(approx_pi - math.pi):.6f}")
`,
  },
  {
    label: "Recursive Fibonacci with Memoization",
    code: `# Memoized Fibonacci sequence generator
from functools import lru_cache

@lru_cache(maxsize=128)
def fib(n: int) -> int:
    if n <= 1:
        return n
    return fib(n - 1) + fib(n - 2)

print("Calculating Fibonacci sequence up to n=30:")
for i in range(12):
    print(f"F({i:02d}) = {fib(i)}")

print(f"\\nF(30) = {fib(30):,}")
print(f"Cache statistics: {fib.cache_info()}")
`,
  },
];

export default function PlaygroundPage() {
  const [code, setCode] = useState<string>(PRESET_SCRIPTS[0].code);
  const [stdout, setStdout] = useState<string>("");
  const [stderr, setStderr] = useState<string>("");
  const [executionTimeMs, setExecutionTimeMs] = useState<number>(0);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [statusText, setStatusText] = useState<string>("");

  const handleRun = async () => {
    sound.playClick();
    setIsRunning(true);
    setStatusText("Compiling Python in WebAssembly...");

    try {
      const res = await executePythonCode(code, [], (status) =>
        setStatusText(status)
      );
      setStdout(res.stdout);
      setStderr(res.stderr);
      setExecutionTimeMs(res.executionTimeMs);
      if (res.stderr) {
        sound.playError();
      } else {
        sound.playSuccess();
      }
    } catch (err: any) {
      setStderr(err?.message || String(err));
      sound.playError();
    } finally {
      setIsRunning(false);
      setStatusText("");
    }
  };

  const handleSelectPreset = (presetCode: string) => {
    sound.playClick();
    setCode(presetCode);
    setStdout("");
    setStderr("");
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0b0f19] text-slate-800 dark:text-slate-100 flex flex-col transition-colors duration-150">
      {/* Top Banner / Breadcrumb */}
      <div className="h-14 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 sm:px-6 flex items-center justify-between gap-4 shadow-2xs">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            onClick={() => sound.playClick()}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-[#0056d2] dark:hover:text-blue-400 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Home</span>
          </Link>
          <span className="text-slate-300 dark:text-slate-700">/</span>
          <div className="flex items-center gap-2">
            <Code2 className="w-4 h-4 text-[#0056d2] dark:text-blue-400" />
            <h1 className="text-sm font-bold text-slate-900 dark:text-white">
              Interactive Python 3 Sandbox on pockett.ai
            </h1>
          </div>
        </div>

        {/* Run Button */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleRun}
            disabled={isRunning}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-[#0056d2] hover:bg-[#0041b8] disabled:opacity-50 text-white text-xs font-bold transition-all shadow-xs"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>{isRunning ? "Executing..." : "Run Sandbox"}</span>
          </button>
        </div>
      </div>

      {/* Preset Pills */}
      <div className="px-4 sm:px-6 py-2.5 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 overflow-x-auto text-xs">
        <span className="text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[11px] shrink-0">
          Load Presets:
        </span>
        {PRESET_SCRIPTS.map((preset) => (
          <button
            key={preset.label}
            onClick={() => handleSelectPreset(preset.code)}
            className="shrink-0 px-3 py-1 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:text-[#0056d2] dark:hover:text-blue-400 hover:border-[#0056d2] dark:hover:border-blue-400 transition-colors font-medium shadow-2xs"
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Main IDE Layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 p-3 sm:p-4 overflow-hidden">
        {/* Editor */}
        <div className="lg:col-span-7 h-[500px] lg:h-[calc(100vh-14rem)]">
          <CodeEditor
            value={code}
            onChange={setCode}
            language="python"
            onReset={() => setCode(PRESET_SCRIPTS[0].code)}
          />
        </div>

        {/* Terminal and Sponsor slot */}
        <div className="lg:col-span-5 flex flex-col gap-3">
          <ConsoleOutput
            stdout={stdout}
            stderr={stderr}
            executionTimeMs={executionTimeMs}
            isRunning={isRunning}
            statusText={statusText}
            onClear={() => {
              setStdout("");
              setStderr("");
            }}
            className="flex-1 min-h-[300px]"
          />

          {/* AdSense Placement */}
          <AdBanner slotType="rectangle" />
        </div>
      </div>
    </div>
  );
}
