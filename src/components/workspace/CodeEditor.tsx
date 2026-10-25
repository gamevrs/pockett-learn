"use client";

import React, { useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import type { OnMount, BeforeMount } from "@monaco-editor/react";
import { useTheme } from "@/lib/theme/ThemeProvider";
import { YOUR_TURN_MARKER } from "@/engine/types";

const Editor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full place-items-center bg-[#0b0c0a] font-mono text-xs text-white/50">
      <span className="animate-pulse">loading editor…</span>
    </div>
  ),
});

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  onRun: () => void;
  onSubmit: () => void;
  /** 1-based line of a Python error to underline */
  errorLine: number | null;
  errorMessage?: string;
  /** Changes when a new lesson opens, so the editor scrolls to the YOUR TURN marker */
  revealKey: string;
}

type EditorInstance = Parameters<OnMount>[0];
type MonacoInstance = Parameters<OnMount>[1];

const defineThemes: BeforeMount = (monaco) => {
  monaco.editor.defineTheme("pockett-dark", {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "comment", foreground: "7a8099", fontStyle: "italic" },
      { token: "keyword", foreground: "a3e635" },
      { token: "string", foreground: "fcd34d" },
      { token: "number", foreground: "ffb86b" },
    ],
    colors: {
      "editor.background": "#0b0c0a",
      "editorLineNumber.foreground": "#4c5046",
      "editorLineNumber.activeForeground": "#b7bcae",
      "editor.lineHighlightBackground": "#151713",
      "editorCursor.foreground": "#a3e635",
      "editor.selectionBackground": "#3f621280",
    },
  });
  monaco.editor.defineTheme("pockett-light", {
    base: "vs",
    inherit: true,
    rules: [
      { token: "comment", foreground: "8a8a98", fontStyle: "italic" },
      { token: "keyword", foreground: "4d7c0f" },
      { token: "string", foreground: "b45309" },
      { token: "number", foreground: "c2570c" },
    ],
    colors: {
      "editor.background": "#fffdf8",
      "editor.lineHighlightBackground": "#f6f2e8",
      "editorLineNumber.foreground": "#b5b1a5",
    },
  });
};

export function CodeEditor({ value, onChange, onRun, onSubmit, errorLine, errorMessage, revealKey }: CodeEditorProps) {
  const { theme } = useTheme();
  const editorRef = useRef<EditorInstance | null>(null);
  const monacoRef = useRef<MonacoInstance | null>(null);
  const onRunRef = useRef(onRun);
  const onSubmitRef = useRef(onSubmit);

  useEffect(() => {
    onRunRef.current = onRun;
    onSubmitRef.current = onSubmit;
  });

  const reveal = () => {
    const editor = editorRef.current;
    const model = editor?.getModel();
    if (!editor || !model) return;
    const lines = model.getLinesContent();
    let target = lines.length;
    for (let i = lines.length - 1; i >= 0; i--) {
      if (lines[i].includes(YOUR_TURN_MARKER)) {
        target = i + 1;
        break;
      }
    }
    editor.revealLineNearTop(Math.max(1, target - 1));
  };

  const handleMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => onRunRef.current());
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.Enter, () => onSubmitRef.current());
    reveal();
  };

  useEffect(() => {
    // jump to the learner's next task whenever a new lesson opens
    const t = setTimeout(reveal, 60);
    return () => clearTimeout(t);
  }, [revealKey]);

  useEffect(() => {
    const monaco = monacoRef.current;
    const model = editorRef.current?.getModel();
    if (!monaco || !model) return;
    if (!errorLine || errorLine > model.getLineCount()) {
      monaco.editor.setModelMarkers(model, "pockett", []);
      return;
    }
    monaco.editor.setModelMarkers(model, "pockett", [
      {
        severity: monaco.MarkerSeverity.Error,
        message: errorMessage ?? "Error",
        startLineNumber: errorLine,
        endLineNumber: errorLine,
        startColumn: 1,
        endColumn: model.getLineMaxColumn(errorLine),
      },
    ]);
  }, [errorLine, errorMessage]);

  return (
    <Editor
      height="100%"
      language="python"
      value={value}
      onChange={(v) => onChange(v ?? "")}
      beforeMount={defineThemes}
      onMount={handleMount}
      theme={theme === "dark" ? "pockett-dark" : "pockett-light"}
      options={{
        minimap: { enabled: false },
        fontSize: 14,
        fontFamily: "var(--font-geist-mono), ui-monospace, Menlo, Consolas, monospace",
        fontLigatures: true,
        lineNumbers: "on",
        scrollBeyondLastLine: false,
        automaticLayout: true,
        tabSize: 4,
        insertSpaces: true,
        cursorBlinking: "smooth",
        cursorSmoothCaretAnimation: "on",
        renderLineHighlight: "line",
        overviewRulerBorder: false,
        padding: { top: 12, bottom: 12 },
        smoothScrolling: true,
        wordWrap: "on",
        quickSuggestions: false,
        suggestOnTriggerCharacters: false,
      }}
    />
  );
}
