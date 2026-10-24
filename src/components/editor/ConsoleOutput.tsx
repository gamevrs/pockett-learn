"use client";

import React from "react";
import { Terminal, Trash2, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { sound } from "@/lib/sound/sound";

interface ConsoleOutputProps {
  stdout: string;
  stderr: string;
  executionTimeMs?: number;
  isRunning?: boolean;
  statusText?: string;
  onClear?: () => void;
  className?: string;
}

export function ConsoleOutput({
  stdout,
  stderr,
  executionTimeMs,
  isRunning,
  statusText,
  onClear,
  className = "",
}: ConsoleOutputProps) {
  const handleClear = () => {
    sound.playClick();
    onClear?.();
  };

  const hasContent = stdout || stderr || statusText;

  return (
    <div
      className={`flex flex-col bg-slate-900 border border-slate-300 rounded-xl overflow-hidden font-mono text-xs shadow-xs ${className}`}
    >
      {/* Console Header */}
      <div className="h-9 bg-slate-800 border-b border-slate-700/80 px-4 flex items-center justify-between text-slate-300 select-none">
        <div className="flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-blue-400" />
          <span className="font-semibold text-white">Execution Console</span>
          {isRunning && (
            <span className="flex items-center gap-1.5 text-[10px] text-amber-300 bg-amber-900/40 px-2 py-0.5 rounded border border-amber-600/40">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
              Running in WebAssembly...
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {executionTimeMs !== undefined && executionTimeMs > 0 && (
            <span className="flex items-center gap-1 text-[11px] text-slate-400">
              <Clock className="w-3 h-3" />
              {executionTimeMs}ms
            </span>
          )}
          {onClear && hasContent && (
            <button
              onClick={handleClear}
              title="Clear terminal output"
              className="text-slate-400 hover:text-white transition-colors p-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Terminal Body */}
      <div className="p-3.5 min-h-[120px] max-h-[220px] overflow-y-auto leading-relaxed space-y-1 select-text">
        {isRunning && statusText && (
          <div className="text-amber-300 italic flex items-center gap-2">
            <span className="animate-spin">⠋</span> {statusText}
          </div>
        )}

        {!hasContent && !isRunning && (
          <div className="text-slate-500 italic py-3 text-center font-sans">
            Click &quot;Run&quot; or &quot;Submit Assignment&quot; to inspect output.
          </div>
        )}

        {stdout && (
          <div className="text-emerald-300 whitespace-pre-wrap font-mono">
            {stdout}
          </div>
        )}

        {stderr && (
          <div className="text-rose-300 bg-rose-950/40 border border-rose-800/60 rounded p-2.5 mt-2 whitespace-pre-wrap font-mono">
            <div className="flex items-center gap-1.5 font-bold mb-1 text-rose-300">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>Traceback (Execution Error)</span>
            </div>
            {stderr}
          </div>
        )}
      </div>
    </div>
  );
}
