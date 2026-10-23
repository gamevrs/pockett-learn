"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import { Copy, RotateCcw, Check, Sparkles } from "lucide-react";
import { sound } from "@/lib/sound/sound";

// Dynamically import Monaco Editor to avoid SSR errors
const Editor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-[#0d1017] text-slate-500 font-mono text-xs">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
        <span>Initializing Monaco Editor...</span>
      </div>
    </div>
  ),
});

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  onReset?: () => void;
  language?: string;
  readOnly?: boolean;
  className?: string;
}

export function CodeEditor({
  value,
  onChange,
  onReset,
  language = "python",
  readOnly = false,
  className = "",
}: CodeEditorProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    sound.playClick();
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    if (onReset) {
      sound.playClick();
      onReset();
    }
  };

  return (
    <div
      className={`flex flex-col h-full bg-[#0d1017] border border-slate-800 rounded-xl overflow-hidden shadow-2xl relative ${className}`}
    >
      {/* Editor Header */}
      <div className="h-10 bg-[#090b10] border-b border-slate-800/80 px-4 flex items-center justify-between text-xs text-slate-400 select-none">
        <div className="flex items-center gap-2 font-mono">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block" />
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block" />
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
          <span className="ml-2 font-semibold text-slate-300">
            solution.{language === "python" ? "py" : language}
          </span>
          <span className="text-[10px] text-emerald-400/80 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 uppercase">
            Active Workspace
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {onReset && (
            <button
              onClick={handleReset}
              title="Reset to starter code"
              className="flex items-center gap-1 px-2 py-1 rounded text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors text-[11px] font-mono"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset</span>
            </button>
          )}

          <button
            onClick={handleCopy}
            title="Copy code"
            className="flex items-center gap-1 px-2 py-1 rounded text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors text-[11px] font-mono"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 hidden sm:inline">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Editor Area */}
      <div className="flex-1 w-full min-h-[300px] relative">
        <Editor
          height="100%"
          language={language}
          value={value}
          onChange={(val) => onChange(val || "")}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            fontFamily: "var(--font-geist-mono), ui-monospace, Menlo, Monaco, monospace",
            lineNumbers: "on",
            roundedSelection: true,
            scrollBeyondLastLine: false,
            readOnly,
            automaticLayout: true,
            tabSize: 4,
            insertSpaces: true,
            cursorBlinking: "smooth",
            cursorSmoothCaretAnimation: "on",
            renderLineHighlight: "all",
            overviewRulerBorder: false,
            padding: { top: 12, bottom: 12 },
          }}
        />
      </div>
    </div>
  );
}
