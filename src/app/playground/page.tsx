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
    label: "Dataclass Microservice Architecture",
    code: `from dataclasses import dataclass, field
from typing import List, Dict
import time

@dataclass
class MicroserviceNode:
    node_id: str
    ip_address: str
    active_connections: int = 0
    services: List[str] = field(default_factory=list)

    def route_request(self, service: str) -> bool:
        if service in self.services:
            self.active_connections += 1
            print(f"[{self.node_id}] Routing traffic to {service}. Current connections: {self.active_connections}")
            return True
        return False

# Initialize cluster
cluster = [
    MicroserviceNode("node-us-east-1", "10.0.1.5", services=["auth", "billing"]),
    MicroserviceNode("node-us-west-2", "10.0.2.8", services=["ai-inference", "search"]),
]

for node in cluster:
    print(f"Initialized cluster node {node.node_id} with services: {node.services}")

cluster[0].route_request("auth")
cluster[1].route_request("ai-inference")
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

print("Calculating Fibonacci sequence up to n=40:")
for i in range(15):
    print(f"F({i:02d}) = {fib(i)}")

print(f"\\nF(40) = {fib(40):,}")
print(f"Cache stats: {fib.cache_info()}")
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
    setStatusText("Executing Python in WebAssembly...");

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
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col">
      {/* Top Banner / Breadcrumb */}
      <div className="h-14 border-b border-slate-800 bg-[#0a0d14] px-4 sm:px-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            onClick={() => sound.playClick()}
            className="flex items-center gap-1.5 text-xs font-mono text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Home</span>
          </Link>
          <span className="text-slate-700">/</span>
          <div className="flex items-center gap-2">
            <Code2 className="w-4 h-4 text-emerald-400" />
            <h1 className="text-sm font-bold font-mono text-white">
              Python 3 WebAssembly Sandbox
            </h1>
          </div>
        </div>

        {/* Run Button */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleRun}
            disabled={isRunning}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 text-xs font-mono font-bold uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(16,231,117,0.3)] hover:scale-102"
          >
            <Play className="w-4 h-4 fill-slate-950" />
            <span>{isRunning ? "Running..." : "Run Sandbox"}</span>
          </button>
        </div>
      </div>

      {/* Preset Pills */}
      <div className="px-4 sm:px-6 py-2.5 bg-[#090b10] border-b border-slate-800/80 flex items-center gap-2 overflow-x-auto text-xs font-mono">
        <span className="text-slate-500 uppercase tracking-wider text-[11px] shrink-0">
          Load Templates:
        </span>
        {PRESET_SCRIPTS.map((preset) => (
          <button
            key={preset.label}
            onClick={() => handleSelectPreset(preset.code)}
            className="shrink-0 px-3 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-emerald-400 hover:border-emerald-500/40 transition-colors"
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
