"use client";

import React, { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { OnMount, BeforeMount } from "@monaco-editor/react";
import { useTheme } from "@/lib/theme/ThemeProvider";
import { YOUR_TURN_MARKER } from "@/engine/types";
import { INTERPOLATION_LANGUAGES, ensureInterpolationGrammar } from "./monaco-interpolation";
import { registerEditorTools, setModelContext } from "./monaco-tools";
import { detectMac } from "@/lib/ui/platform";

function EditorLoading() {
  return (
    <div className="grid h-full place-items-center bg-[#0b0c0a] font-mono text-xs text-white/50">
      <span className="animate-pulse">loading editor…</span>
    </div>
  );
}

const Editor = dynamic(() => import("@monaco-editor/react"), { ssr: false, loading: EditorLoading });

/** Languages whose interpolation-aware tokenizer is registered (it must be before a model of that language exists). */
const grammarReady = new Set<string>();

interface CodeEditorProps {
  /** Monaco language id. */
  language?: string;
  value: string;
  onChange: (value: string) => void;
  onRun: () => void;
  onSubmit: () => void;
  /** 1-based line of a Python error to underline */
  errorLine: number | null;
  errorMessage?: string;
  /** Changes when a new lesson opens, so the editor scrolls to the YOUR TURN marker */
  revealKey: string;
  /** Extra text the editor's completions should know about but that is not in the file, e.g. the SQL schema a project sets up. */
  context?: string;
}

type EditorInstance = Parameters<OnMount>[0];
type MonacoInstance = Parameters<OnMount>[1];

const beforeMount: BeforeMount = (monaco) => {
  registerEditorTools(monaco);
  defineThemes(monaco);
};

const defineThemes: BeforeMount = (monaco) => {
  monaco.editor.defineTheme("pockett-dark", {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "comment", foreground: "8a8a8a", fontStyle: "italic" },
      { token: "keyword", foreground: "c5ee8a" },
      { token: "string", foreground: "fcd34d" },
      { token: "number", foreground: "ffb86b" },
      // names (see monaco-identifiers.ts): every kind has its own calm colour, none of them magenta.
      // lime = keywords, yellow = strings, orange = numbers, then:
      { token: "variable", foreground: "8db4e0" }, // soft blue: total, price, car_name
      { token: "variable.parameter", foreground: "d9c2a6", fontStyle: "italic" }, // sand
      { token: "variable.language", foreground: "9fb4cf", fontStyle: "italic" }, // self / cls
      { token: "function", foreground: "5eead4" }, // teal: move(), WriteLine()
      { token: "type", foreground: "7fd4ff" }, // sky: Car, Vec, Dictionary
      { token: "constant", foreground: "ff9e8a" }, // coral: MAX_SPEED
      { token: "predefined", foreground: "a5b4fc" }, // periwinkle: print, len, Console, fmt, std, println!
      // VS Dark ships language-specific SQL colours (pure red strings, magenta functions); use ours
      { token: "keyword.sql", foreground: "c5ee8a" },
      { token: "string.sql", foreground: "fcd34d" },
      { token: "predefined.sql", foreground: "a5b4fc" },
      { token: "operator.sql", foreground: "d4d4d4" },
      { token: "operator", foreground: "d4d4d4" },
      { token: "delimiter", foreground: "a3a3a3" },
      { token: "regexp", foreground: "fcd34d" },
      // string interpolation (see monaco-interpolation.ts): braces and fixed placeholders in the
      // lime accent (ACCENT 500), format specs a quiet sage; the expression inside keeps the normal code colours
      { token: "string.interpolation.delimiter", foreground: "abd373" },
      { token: "string.format.placeholder", foreground: "abd373" },
      { token: "string.format.spec", foreground: "9db1a3" },
    ],
    colors: {
      "editor.background": "#0a0a0a",
      "editorLineNumber.foreground": "#4d4d4d",
      "editorLineNumber.activeForeground": "#bdbdbd",
      "editor.lineHighlightBackground": "#141414",
      "editorCursor.foreground": "#c5ee8a",
      "editor.selectionBackground": "#4b741166",
    },
  });
  monaco.editor.defineTheme("pockett-light", {
    base: "vs",
    inherit: true,
    rules: [
      // comment and number were #8a8a8a / #c2570c, which fall under 4.5:1 on white and on the line highlight
      { token: "comment", foreground: "6b6b6b", fontStyle: "italic" },
      { token: "keyword", foreground: "4b7411" },
      { token: "string", foreground: "b45309" },
      { token: "number", foreground: "b3500a" },
      { token: "variable", foreground: "2f5f9e" },
      { token: "variable.parameter", foreground: "8a5a2b", fontStyle: "italic" },
      { token: "variable.language", foreground: "52627a", fontStyle: "italic" },
      { token: "function", foreground: "0f766e" },
      { token: "type", foreground: "0e7490" },
      { token: "constant", foreground: "b42318" },
      { token: "predefined", foreground: "4f46e5" },
      { token: "keyword.sql", foreground: "4b7411" },
      { token: "string.sql", foreground: "b45309" },
      { token: "predefined.sql", foreground: "4f46e5" },
      { token: "operator.sql", foreground: "404040" },
      { token: "operator", foreground: "404040" },
      { token: "delimiter", foreground: "525252" },
      { token: "string.interpolation.delimiter", foreground: "3f6212" },
      { token: "string.format.placeholder", foreground: "3f6212" },
      { token: "string.format.spec", foreground: "5f6f45" },
    ],
    colors: {
      "editor.background": "#ffffff",
      "editor.lineHighlightBackground": "#f6f5f1",
      "editorLineNumber.foreground": "#b5b3ab",
      "editorCursor.foreground": "#4b7411",
      "editor.selectionBackground": "#c5ee8a80",
      // VS Light's second bracket-pair colour (#319331) is only 3.9:1 on white
      "editorBracketHighlight.foreground2": "#2b7a2b",
    },
  });
};

/** Just enough of Monaco's suggest controller to hear which item is about to be inserted (an internal contribution, so every use is guarded). */
interface SuggestControllerLike {
  widget?: { value?: { getFocusedItem(): { item: SuggestItemLike } | undefined } };
  cancelSuggestWidget?: () => void;
  onWillInsertSuggestItem?: (listener: (e: { item: SuggestItemLike }) => void) => { dispose(): void };
}
interface SuggestItemLike {
  completion: { kind: number; label: string | { label: string }; detail?: string };
  resolve?: (token: unknown) => Promise<void>;
}

/**
 * JavaScript completions come from Monaco's own TypeScript service, whose items insert only the name. After a
 * function or method is accepted, add "()" and put the caret inside when it takes arguments, after when it takes none.
 * The own-language providers (monaco-tools.ts) do this themselves with snippets.
 */
function addCallParens(editor: EditorInstance, monaco: MonacoInstance) {
  try {
    const controller = editor.getContribution("editor.contrib.suggestController") as SuggestControllerLike | null;
    // "smart" Enter still accepts a fuzzy match for a finished word: `import math` became `import match`. Only accept
    // on Enter when the item starts with what was typed, and never expand a snippet that is already typed in full
    // (C# `try`, `else`, `do` end a line); otherwise close the list and let Enter be a new line.
    editor.onKeyDown((e) => {
      try {
        if (e.keyCode !== monaco.KeyCode.Enter || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
        const item = controller?.widget?.value?.getFocusedItem()?.item;
        const model = editor.getModel();
        const pos = editor.getPosition();
        if (!item || !model || !pos) return;
        const typed = model.getWordUntilPosition(pos).word;
        const word = typed.toLowerCase();
        const label = typeof item.completion.label === "string" ? item.completion.label : item.completion.label.label;
        const exactSnippet = item.completion.kind === monaco.languages.CompletionItemKind.Snippet && label.toLowerCase() === word;
        const complete = !!typed && label === typed; // the word is already typed in full (`self.battery`): Enter ends the line, it must not add `()` or pick a neighbour
        if (word && (!label.toLowerCase().startsWith(word) || exactSnippet || complete)) controller?.cancelSuggestWidget?.(); // Tab expands a snippet, Enter stays a new line
      } catch {
        /* leave Enter to Monaco */
      }
    });
    controller?.onWillInsertSuggestItem?.(({ item }) => {
      const model = editor.getModel();
      const kind = item.completion.kind;
      if (!model || model.getLanguageId() !== "javascript") return;
      if (kind !== monaco.languages.CompletionItemKind.Function && kind !== monaco.languages.CompletionItemKind.Method) return;
      const label = typeof item.completion.label === "string" ? item.completion.label : item.completion.label.label;
      if (!/^[A-Za-z_$][\w$]*$/.test(label)) return;
      // the insertion happens right after this event; look at the editor once it has settled
      setTimeout(async () => {
        try {
          try {
            await item.resolve?.(monaco.CancellationToken.None); // fills in the signature
          } catch {
            /* no signature: the caret goes inside the parentheses */
          }
          const pos = editor.getPosition();
          if (!pos || editor.getModel() !== model) return;
          const text = model.getLineContent(pos.lineNumber);
          if (!text.slice(0, pos.column - 1).endsWith(label) || /^\s*\(/.test(text.slice(pos.column - 1))) return;
          const detail = item.completion.detail ?? "";
          const noArgs = new RegExp(String.raw`(?:^|[^\w$])` + label.replace(/\$/g, String.raw`\$`) + String.raw`\s*(?:<[^(]*>)?\(\s*\)`).test(detail);
          const caret = new monaco.Selection(pos.lineNumber, pos.column + (noArgs ? 2 : 1), pos.lineNumber, pos.column + (noArgs ? 2 : 1));
          editor.executeEdits("pockett-call-parens", [{ range: new monaco.Range(pos.lineNumber, pos.column, pos.lineNumber, pos.column), text: "()" }], [caret]);
          if (!noArgs) editor.trigger("pockett", "editor.action.triggerParameterHints", null);
        } catch {
          /* never let a convenience break editing */
        }
      }, 0);
    });
  } catch {
    /* a Monaco build without this contribution: completions simply insert the name */
  }
}

/** Languages whose blocks are closed by a bracket the editor inserts for you (not Python or SQL). */
const BRACE_LANGUAGES = new Set(["go", "rust", "cpp", "c", "csharp", "java", "javascript", "typescript"]);

/** Counts one kind of bracket in a source text, ignoring comments, string and character literals (good enough for a balance check). */
function countBrackets(text: string, open: string, close: string): { opens: number; closes: number } {
  let opens = 0;
  let closes = 0;
  let inBlock = false;
  for (const line of text.split("\n")) {
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (inBlock) {
        if (c === "*" && line[i + 1] === "/") {
          inBlock = false;
          i++;
        }
      } else if (c === "/" && line[i + 1] === "/") break;
      else if (c === "/" && line[i + 1] === "*") {
        inBlock = true;
        i++;
      } else if (c === '"' || c === "`") {
        let j = i + 1;
        while (j < line.length && line[j] !== c) j += line[j] === "\\" && c === '"' ? 2 : 1;
        if (j >= line.length) break;
        i = j;
      } else if (c === "'") {
        const m = /^'(\\.|[^\\'])'/.exec(line.slice(i));
        if (m) i += m[0].length - 1;
      } else if (c === open) opens++;
      else if (c === close) closes++;
    }
  }
  return { opens, closes };
}

/**
 * Typing `{` and Enter leaves the editor's own `}` on the line below the caret. A learner who then types the `}` they
 * think is missing used to end up with a second one, and the extras piled up at the end of the file. When a closing
 * bracket is typed on an otherwise empty line, the same bracket starts the next line and the file already has enough of
 * them, step over that one instead: the empty line goes away and the caret lands just after the existing bracket.
 */
function stepOverClosers(editor: EditorInstance, monaco: MonacoInstance) {
  const pairs: Record<string, string> = { "}": "{", ")": "(", "]": "[" };
  editor.onKeyDown((e) => {
    try {
      const key = e.browserEvent.key;
      const open = pairs[key];
      if (!open || e.ctrlKey || e.metaKey || e.altKey) return;
      const model = editor.getModel();
      const selections = editor.getSelections();
      if (!model || !BRACE_LANGUAGES.has(model.getLanguageId()) || !selections || selections.length !== 1 || !selections[0].isEmpty()) return;
      const { lineNumber, column } = selections[0].getPosition();
      const line = model.getLineContent(lineNumber);
      if (line.trim() !== "" || column !== line.length + 1 || lineNumber >= model.getLineCount()) return;
      const next = model.getLineContent(lineNumber + 1);
      const lead = next.length - next.trimStart().length;
      if (next[lead] !== key) return;
      const { opens, closes } = countBrackets(model.getValue(), open, key);
      if (closes < opens) return; // this bracket is really missing
      e.preventDefault();
      e.stopPropagation();
      editor.pushUndoStop();
      const caret = new monaco.Selection(lineNumber, lead + 2, lineNumber, lead + 2);
      editor.executeEdits("pockett-step-over", [{ range: new monaco.Range(lineNumber, 1, lineNumber + 1, 1), text: "" }], [caret]);
      editor.pushUndoStop();
    } catch {
      /* leave the key to Monaco */
    }
  });
}

export function CodeEditor({ value, onChange, onRun, onSubmit, errorLine, errorMessage, revealKey, context, language = "python" }: CodeEditorProps) {
  const { theme } = useTheme();
  const editorRef = useRef<EditorInstance | null>(null);
  const monacoRef = useRef<MonacoInstance | null>(null);
  const onRunRef = useRef(onRun);
  const onSubmitRef = useRef(onSubmit);

  useEffect(() => {
    onRunRef.current = onRun;
    onSubmitRef.current = onSubmit;
  });

  // The editor owns its text while the learner types. Feeding it `value` on every keystroke made a slow render
  // (heavy 3D scene beside it) write an older text back over newer keystrokes: characters vanished and accepted
  // suggestions were undone. So `value` only seeds the editor, and later changes are applied only when they did
  // not come from the editor itself (Reset lesson, switching language).
  const [initialValue] = useState(value);
  const knownValue = useRef(value);
  /**
   * Everything the editor reported through onChange in the last few seconds. A value coming back down that is one
   * of these is an old snapshot of the learner's own typing (a lagging render, a draft saved a moment ago, a cloud
   * pull): the editor already moved past it, so writing it into the model would erase newer keystrokes.
   */
  const recentlyTyped = useRef<{ text: string; at: number }[]>([]);
  const handleChange = (v: string | undefined) => {
    const text = v ?? "";
    knownValue.current = text;
    const now = performance.now();
    recentlyTyped.current = [...recentlyTyped.current.filter((h) => now - h.at < 5000), { text, at: now }].slice(-400);
    onChange(text);
  };
  useEffect(() => {
    const now = performance.now();
    if (recentlyTyped.current.some((h) => h.text === value && now - h.at < 5000)) return;
    recentlyTyped.current = [];
    knownValue.current = value;
    const editor = editorRef.current;
    const model = editor?.getModel();
    if (!editor || !model || model.getValue() === value) return;
    editor.pushUndoStop();
    editor.executeEdits("pockett-external", [{ range: model.getFullModelRange(), text: value, forceMoveMarkers: true }]);
    editor.pushUndoStop();
  }, [value]);

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
    // an open suggestion list must never swallow Run / Submit: close it, then run
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      editor.trigger("pockett", "hideSuggestWidget", null);
      onRunRef.current();
    });
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.Enter, () => {
      editor.trigger("pockett", "hideSuggestWidget", null);
      onSubmitRef.current();
    });
    if (detectMac()) {
      // the page also runs on Ctrl+Enter on a Mac (muscle memory from other platforms): close the list for that chord too
      editor.addCommand(monaco.KeyMod.WinCtrl | monaco.KeyCode.Enter, () => {
        editor.trigger("pockett", "hideSuggestWidget", null);
        onRunRef.current();
      });
      editor.addCommand(monaco.KeyMod.WinCtrl | monaco.KeyMod.Shift | monaco.KeyCode.Enter, () => {
        editor.trigger("pockett", "hideSuggestWidget", null);
        onSubmitRef.current();
      });
    }
    addCallParens(editor, monaco);
    stepOverClosers(editor, monaco);
    const model = editor.getModel();
    if (model) {
      model.setEOL(monaco.editor.EndOfLineSequence.LF); // typed newlines were CRLF on Windows, mixed with the LF starters
      setModelContext(model, contextRef.current);
      if (model.getValue() !== knownValue.current) model.setValue(knownValue.current); // remounted (language switch) after the seed went stale
    }
    reveal();
  };

  const contextRef = useRef(context);
  useEffect(() => {
    contextRef.current = context;
    const model = editorRef.current?.getModel();
    if (model) setModelContext(model, context);
  }, [context]);

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

  // Register the interpolation-aware tokenizer for this language before Monaco creates its first model of it.
  const [, bumpReady] = useState(0);
  const isReady = grammarReady.has(language) || !INTERPOLATION_LANGUAGES.includes(language);
  useEffect(() => {
    if (isReady) return;
    let live = true;
    void import("@monaco-editor/react")
      .then(({ loader }) => loader.init())
      .then((monaco) => ensureInterpolationGrammar(monaco, language))
      .catch(() => {
        /* offline or blocked: fall back to Monaco's stock highlighting */
      })
      .then(() => {
        grammarReady.add(language);
        if (live) bumpReady((n) => n + 1);
      });
    return () => {
      live = false;
    };
  }, [language, isReady]);

  if (!isReady) return <EditorLoading />;

  return (
    <Editor
      height="100%"
      language={language}
      defaultValue={initialValue}
      onChange={handleChange}
      beforeMount={beforeMount}
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
        // ── smart editing: suggestions while typing, parameter hints, hover docs, auto-closing, guides ──
        quickSuggestions: { other: "on", comments: "off", strings: "off" },
        quickSuggestionsDelay: 30,
        suggestOnTriggerCharacters: true,
        wordBasedSuggestions: "allDocuments",
        tabCompletion: "on",
        acceptSuggestionOnEnter: "smart",
        acceptSuggestionOnCommitCharacter: true,
        snippetSuggestions: "inline",
        suggestSelection: "first",
        suggest: { preview: true, showWords: true, showSnippets: true, showKeywords: true, showFunctions: true, showVariables: true, showClasses: true, showModules: true, showFields: true, showMethods: true, localityBonus: true, insertMode: "replace" },
        parameterHints: { enabled: true, cycle: true },
        hover: { enabled: "on", delay: 250, sticky: true },
        autoClosingBrackets: "languageDefined",
        autoClosingQuotes: "languageDefined",
        autoClosingDelete: "auto",
        autoIndent: "full",
        autoSurround: "languageDefined",
        formatOnPaste: false,
        bracketPairColorization: { enabled: true },
        guides: { bracketPairs: true, indentation: true },
        matchBrackets: "always",
        occurrencesHighlight: "singleFile",
        renameOnType: false,
        multiCursorModifier: "alt",
        stickyScroll: { enabled: true },
        folding: true,
        // suggestion / hover popups must not be clipped by the card the editor sits in
        fixedOverflowWidgets: true,
      }}
    />
  );
}
