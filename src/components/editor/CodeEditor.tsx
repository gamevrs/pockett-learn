"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import { Copy, RotateCcw, Check, FileCode } from "lucide-react";
import { sound } from "@/lib/sound/sound";
import { useTheme } from "@/lib/theme/ThemeProvider";

const Editor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-slate-900 text-slate-400 font-mono text-xs">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-[#0056d2] animate-ping" />
        <span>Initializing Code Editor...</span>
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
  const { theme } = useTheme();
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

  const isDark = theme === "dark";

  return (
    <div
      className={`flex flex-col h-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs relative transition-colors ${className}`}
    >
      {/* Editor Header */}
      <div className="h-10 bg-slate-50 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-700/80 px-4 flex items-center justify-between text-xs text-slate-600 dark:text-slate-300 select-none">
        <div className="flex items-center gap-2">
          <FileCode className="w-4 h-4 text-[#0056d2] dark:text-blue-400" />
          <span className="font-semibold text-slate-800 dark:text-white font-mono text-xs">
            solution.{language === "python" ? "py" : language}
          </span>
          <span className="text-[10px] text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/60 px-2 py-0.5 rounded font-medium border border-blue-200 dark:border-blue-800">
            Active Workspace
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {onReset && (
            <button
              onClick={handleReset}
              title="Reset code template"
              className="flex items-center gap-1 px-2.5 py-1 rounded text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-xs font-medium"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset</span>
            </button>
          )}

          <button
            onClick={handleCopy}
            title="Copy code"
            className="flex items-center gap-1 px-2.5 py-1 rounded text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-xs font-medium"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="text-emerald-600 dark:text-emerald-400 hidden sm:inline">Copied</span>
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
          theme={isDark ? "vs-dark" : "light"}
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
