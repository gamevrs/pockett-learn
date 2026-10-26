"use client";

import React, { useEffect, useRef, useState } from "react";
import { Check, CornerDownLeft, FolderTree, Play, RotateCcw, SquareTerminal, Target } from "lucide-react";
import type { WidgetProps } from "@/learn/widget";
import { InlineProse } from "@/components/ui/Prose";
import {
  BASE_TIME,
  complete,
  createShell,
  displayPath,
  finishForeground,
  interrupt,
  run,
  shellState,
  suspend,
  type FileSpec,
  type ProcSpec,
  type RunResult,
  type Seg,
  type Shell,
  type TerminalState,
} from "./shell";
import { checkTerminal } from "./goals";
import { treeRows, TreeView } from "./Tree";

export interface TerminalProps {
  /** Starting files: { "~/notes.txt": "hello\n", "~/projects/": null, "~/run.sh": { content, mode: "755" } }. */
  files?: FileSpec;
  /** Starting directory (default: home). */
  cwd?: string;
  user?: string;
  host?: string;
  /** The user's groups; the first is their main group. */
  groups?: string[];
  env?: Record<string, string>;
  /** Extra processes to show in ps (and to kill). */
  procs?: ProcSpec[];
  /** Only these commands may be typed at the prompt (help, clear and history always work). */
  commands?: string[];
  /** Commands already in the history (reachable with the up arrow). */
  history?: string[];
  /** Commands run before the learner starts; shown in the scrollback. */
  preRun?: string[];
  /** One line telling the learner what to do. Mini-markdown. */
  task?: string;
  /** Tap-to-type command chips. */
  suggest?: string[];
  /** Shown (and runnable) once the learner gives up. */
  solution?: string[];
  /** Show a live file tree under the terminal, rooted here ("~" when true). */
  tree?: boolean | string;
  /** Include hidden files in the tree. */
  treeHidden?: boolean;
  /** Scrollback height in px (default 260). */
  height?: number;
}

type Line =
  | { kind: "cmd"; user: string; host: string; path: string; root: boolean; text: string; tail?: string }
  | { kind: "out"; segs: Seg[] }
  | { kind: "queued"; text: string };

interface Model {
  sh: Shell;
  lines: Line[];
  snap: TerminalState;
  changed: string[];
}

/** Wall-clock time; only ever read from event handlers and timers. */
const clock = () => Date.now();

const promptOf = (sh: Shell, text: string, tail?: string): Line => ({
  kind: "cmd",
  user: sh.user,
  host: sh.host,
  path: displayPath(sh, sh.cwd),
  root: sh.user === "root",
  text,
  tail,
});

/** Paths that appeared or changed between two shells (for the tree highlight). */
function diffPaths(a: Shell, b: Shell): string[] {
  const out: string[] = [];
  for (const [p, e] of Object.entries(b.fs)) {
    const o = a.fs[p];
    if (!o || o.content !== e.content || o.mode !== e.mode || o.kind !== e.kind) out.push(p);
  }
  return out;
}

/** Run lines one after another until one blocks (a foreground sleep). */
function runLines(start: Shell, lines: string[], now: number): { sh: Shell; out: Line[]; left: string[]; cleared: boolean } {
  let sh = start;
  let out: Line[] = [];
  let cleared = false;
  let i = 0;
  for (; i < lines.length && !sh.fg; i++) {
    const before = sh;
    const r: RunResult = run(sh, lines[i], now);
    sh = r.shell;
    if (r.clear) {
      out = [];
      cleared = true;
    } else out.push(promptOf(before, lines[i]));
    if (r.out.length) out.push({ kind: "out", segs: r.out });
  }
  return { sh, out, left: lines.slice(i), cleared };
}

function init(p: TerminalProps): Model {
  const sh0 = createShell({ files: p.files, cwd: p.cwd, user: p.user, host: p.host, groups: p.groups, env: p.env, procs: p.procs, commands: p.commands, history: p.history });
  if (!p.preRun?.length) return { sh: sh0, lines: [], snap: shellState(sh0, BASE_TIME), changed: [] };
  // pre-run with the fixed clock so the server and the browser draw the same thing
  const r = runLines({ ...sh0, allowed: null }, p.preRun, BASE_TIME);
  const sh = { ...r.sh, allowed: sh0.allowed, typed: 0, fg: null };
  return { sh, lines: r.out, snap: shellState(sh, BASE_TIME), changed: [] };
}

const TONE: Record<string, string> = {
  dir: "font-semibold text-[#7dd3fc]",
  exec: "font-semibold text-[#c5ee8a]",
  match: "font-semibold text-[#fcd34d]",
  path: "text-[#7dd3fc]",
  err: "text-[#fca5a5]",
  dim: "text-white/45",
};

function Prompt({ line }: { line: Extract<Line, { kind: "cmd" }> }) {
  return (
    <>
      <span className="font-semibold text-[#c5ee8a]">
        {line.user}@{line.host}
      </span>
      <span className="text-white/70">:</span>
      <span className="font-semibold text-[#7dd3fc]">{line.path}</span>
      <span className="text-white/70">{line.root ? "# " : "$ "}</span>
    </>
  );
}

const KEYS: { label: string; aria: string; act: string }[] = [
  { label: "Tab", aria: "Tab: complete", act: "tab" },
  { label: "↑", aria: "Previous command", act: "up" },
  { label: "↓", aria: "Next command", act: "down" },
  { label: "^C", aria: "Control C: interrupt", act: "ctrlc" },
  { label: "^Z", aria: "Control Z: pause", act: "ctrlz" },
  { label: "|", aria: "Pipe", act: "|" },
  { label: "~", aria: "Tilde", act: "~" },
  { label: "/", aria: "Slash", act: "/" },
  { label: "-", aria: "Dash", act: "-" },
  { label: ">", aria: "Greater than", act: ">" },
  { label: "&", aria: "Ampersand", act: "&" },
];

/** A Unix terminal with an in-memory file system: prompt, history, completion, pipes, jobs and permissions. */
export function Terminal({ props, onChange, status, goal }: WidgetProps<TerminalProps>) {
  const [model, setModel] = useState<Model>(() => init(props));
  const [input, setInput] = useState("");
  const [hist, setHist] = useState<{ idx: number | null; draft: string }>({ idx: null, draft: "" });
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queue = useRef<string[]>([]);
  const { sh, lines, snap } = model;
  const blocked = Boolean(sh.fg);

  useEffect(() => {
    const el = bodyRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines, input]);

  useEffect(() => {
    // focus the prompt on desktop so the learner can type straight away (not on phones: no surprise keyboard)
    if (window.matchMedia?.("(pointer: fine)").matches) inputRef.current?.focus({ preventScroll: true });
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  /** When the foreground command's time is up, finish it and run anything typed meanwhile. */
  const schedule = (fgShell: Shell, now: number) => {
    const until = fgShell.fg?.until ?? now;
    timer.current = setTimeout(() => {
      timer.current = null;
      const t = clock();
      const r = finishForeground(fgShell, t);
      const extra: Line[] = r.out.length ? [{ kind: "out", segs: r.out }] : [];
      const more = runLines(r.shell, queue.current, t);
      queue.current = more.left;
      const snapNext = shellState(more.sh, t);
      setModel((m) => ({
        sh: more.sh,
        lines: more.cleared
          ? more.out
          : [...m.lines.filter((l) => l.kind !== "queued"), ...extra, ...more.out, ...more.left.map((text) => ({ kind: "queued" as const, text }))],
        snap: snapNext,
        changed: diffPaths(fgShell, more.sh),
      }));
      onChange?.(snapNext);
      if (more.sh.fg) schedule(more.sh, t);
    }, Math.max(0, until - now));
  };

  const commit = (next: Model, now: number) => {
    setModel(next);
    onChange?.(next.snap);
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    if (next.sh.fg) schedule(next.sh, now);
  };

  const exec = (text: string) => {
    const now = clock();
    const r = runLines(sh, [text], now);
    const next: Model = {
      sh: r.sh,
      lines: r.cleared ? r.out : [...lines, ...r.out],
      snap: shellState(r.sh, now),
      changed: diffPaths(sh, r.sh),
    };
    commit(next, now);
  };

  const submit = () => {
    if (blocked) {
      // type-ahead: the line runs once the foreground command finishes
      queue.current = [...queue.current, input];
      setModel((m) => ({ ...m, lines: [...m.lines, { kind: "queued", text: input }] }));
      setInput("");
      return;
    }
    const text = input;
    setInput("");
    setHist({ idx: null, draft: "" });
    exec(text);
  };

  const ctrlC = () => {
    const now = clock();
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    queue.current = [];
    const r = interrupt(sh, now);
    const linesNext: Line[] = blocked
      ? [...lines.filter((l) => l.kind !== "queued"), { kind: "out", segs: r.out }]
      : [...lines, promptOf(sh, input, "^C"), ...(r.out.length > 1 ? [{ kind: "out" as const, segs: r.out.slice(1) }] : [])];
    setInput("");
    commit({ sh: r.shell, lines: linesNext, snap: shellState(r.shell, now), changed: [] }, now);
  };

  const ctrlZ = () => {
    if (!blocked) return;
    const now = clock();
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    queue.current = [];
    const r = suspend(sh, now);
    commit({ sh: r.shell, lines: [...lines.filter((l) => l.kind !== "queued"), { kind: "out", segs: r.out }], snap: shellState(r.shell, now), changed: [] }, now);
  };

  const historyMove = (dir: -1 | 1) => {
    const h = sh.history;
    if (!h.length) return;
    if (dir === -1) {
      const idx = hist.idx === null ? h.length - 1 : Math.max(0, hist.idx - 1);
      setHist({ idx, draft: hist.idx === null ? input : hist.draft });
      setInput(h[idx]);
    } else {
      if (hist.idx === null) return;
      const idx = hist.idx + 1;
      if (idx >= h.length) {
        setHist({ idx: null, draft: "" });
        setInput(hist.draft);
      } else {
        setHist({ ...hist, idx });
        setInput(h[idx]);
      }
    }
  };

  const tab = () => {
    if (blocked) return;
    const r = complete(sh, input);
    if (r.options.length) {
      setModel((m) => ({ ...m, lines: [...m.lines, promptOf(sh, input), { kind: "out", segs: [{ text: r.options.join("  ") + "\n" }] }] }));
    } else setInput(r.line);
  };

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      submit();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      historyMove(-1);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      historyMove(1);
    } else if (e.key === "Tab" && (input.trim() !== "" || blocked)) {
      e.preventDefault();
      tab();
    } else if (e.ctrlKey && !e.altKey && !e.metaKey) {
      const k = e.key.toLowerCase();
      const el = e.currentTarget;
      if (k === "c" && el.selectionStart === el.selectionEnd) {
        e.preventDefault();
        ctrlC();
      } else if (k === "z") {
        e.preventDefault();
        ctrlZ();
      } else if (k === "l") {
        e.preventDefault();
        setModel((m) => ({ ...m, lines: [] }));
      } else if (k === "u") {
        e.preventDefault();
        setInput("");
      }
    }
  };

  const insert = (txt: string) => {
    const el = inputRef.current;
    const at = el?.selectionStart ?? input.length;
    const end = el?.selectionEnd ?? input.length;
    const next = input.slice(0, at) + txt + input.slice(end);
    setInput(next);
    requestAnimationFrame(() => {
      el?.focus({ preventScroll: true });
      el?.setSelectionRange(at + txt.length, at + txt.length);
    });
  };

  const key = (act: string) => {
    if (act === "tab") tab();
    else if (act === "up") historyMove(-1);
    else if (act === "down") historyMove(1);
    else if (act === "ctrlc") ctrlC();
    else if (act === "ctrlz") ctrlZ();
    else insert(act);
  };

  const reset = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    queue.current = [];
    const m = init(props);
    setModel(m);
    setInput("");
    setHist({ idx: null, draft: "" });
    onChange?.(m.snap);
    inputRef.current?.focus({ preventScroll: true });
  };

  const runSolution = () => {
    if (!props.solution?.length || blocked) return;
    const now = clock();
    const r = runLines(sh, props.solution, now);
    queue.current = r.left;
    commit({ sh: r.sh, lines: r.cleared ? r.out : [...lines, ...r.out], snap: shellState(r.sh, now), changed: diffPaths(sh, r.sh) }, now);
  };

  const met = goal ? checkTerminal(snap, goal) : false;
  const treeRoot = props.tree ? (props.tree === true || props.tree === "~" ? sh.home : props.tree) : null;
  const rows = treeRoot ? treeRows(sh.fs, treeRoot, { hidden: props.treeHidden, skip: ["/usr", "/dev", "/proc"] }) : [];
  const marks = Object.fromEntries(model.changed.filter((p) => rows.some((r) => r.path === p)).map((p) => [p, "changed" as const]));
  const title = `${sh.user}@${sh.host}: ${displayPath(sh, sh.cwd)}`;

  return (
    <div className="w-full min-w-0">
      {props.task && (
        <div className={`mb-3 flex items-start gap-2.5 rounded-xl border px-3 py-2.5 text-sm transition-colors ${met || status === "correct" ? "border-[var(--brand)]/45 bg-tint" : "border-line bg-surface-2"}`}>
          <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full ${met || status === "correct" ? "bg-primary text-primary-ink" : "text-ink-3"}`}>
            {met || status === "correct" ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : <Target className="h-4 w-4" />}
          </span>
          <div className="min-w-0 flex-1 text-ink-2 [&_code]:text-[0.92em]">
            <InlineProse text={props.task} />
            {met && status !== "correct" && <span className="ml-1.5 font-medium text-brand">Done. Press Check.</span>}
          </div>
        </div>
      )}

      <div
        className={`overflow-hidden rounded-xl border bg-[#0a0a0a] text-[#e5e5e5] transition-colors ${focused ? "border-[#c5ee8a]/45" : "border-white/10"}`}
        onMouseUp={() => {
          if (!window.getSelection()?.toString()) inputRef.current?.focus({ preventScroll: true });
        }}
      >
        <div className="flex h-9 items-center gap-2 border-b border-white/10 pl-3 pr-1.5 font-mono text-[11px] text-white/55">
          <SquareTerminal className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span className="min-w-0 flex-1 truncate">{title}</span>
          {blocked && <span className="shrink-0 rounded-full border border-white/15 px-2 py-0.5 text-[10px] text-white/60">running · Ctrl+C stops it</span>}
          <button
            type="button"
            onClick={reset}
            className="flex h-7 shrink-0 items-center gap-1 rounded-full px-2 text-white/55 hover:bg-white/10 hover:text-white"
            title="Reset the terminal"
            aria-label="Reset the terminal"
          >
            <RotateCcw className="h-3 w-3" /> <span className="hidden sm:inline">Reset</span>
          </button>
        </div>

        <div
          ref={bodyRef}
          className="overflow-auto px-3 py-2.5 font-mono text-[12.5px] leading-[1.6] sm:text-[13px]"
          style={{ height: props.height ?? 260 }}
          role="log"
          aria-live="polite"
          aria-label="Terminal output"
        >
          {lines.map((l, i) =>
            l.kind === "cmd" ? (
              <div key={i} className="whitespace-pre-wrap [overflow-wrap:anywhere]">
                <Prompt line={l} />
                <span>{l.text}</span>
                {l.tail && <span className="text-white/60">{l.tail}</span>}
              </div>
            ) : l.kind === "queued" ? (
              <div key={i} className="whitespace-pre-wrap text-white/50 [overflow-wrap:anywhere]">
                {l.text}
              </div>
            ) : (
              // column-aligned output (ls -l, ps, uniq -c) keeps its shape and scrolls; everything else wraps
              <div key={i} className={l.segs.some((sg) => / {2,}\S/.test(sg.text)) ? "w-max min-w-full whitespace-pre" : "whitespace-pre-wrap [overflow-wrap:anywhere]"}>
                {l.segs.map((s, j) => (
                  <span key={j} className={s.tone ? TONE[s.tone] : undefined}>
                    {s.text.replace(/\n$/, j === l.segs.length - 1 ? "" : "\n")}
                  </span>
                ))}
              </div>
            ),
          )}
          <label className="flex items-baseline">
            <span className="sr-only">Command</span>
            {!blocked && (
              <span className="shrink-0 whitespace-pre">
                <Prompt line={promptOf(sh, "") as Extract<Line, { kind: "cmd" }>} />
              </span>
            )}
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKey}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
              autoComplete="off"
              enterKeyHint="send"
              placeholder={lines.length === 0 && !blocked ? "type a command, then press Enter" : undefined}
              className="min-w-0 flex-1 bg-transparent p-0 font-mono text-[16px] text-[#f5f5f5] caret-[#c5ee8a] outline-none placeholder:text-white/30 sm:text-[13px]"
            />
          </label>
        </div>

        <div className="hidden gap-1 overflow-x-auto border-t border-white/10 px-2 py-1.5 pointer-coarse:flex">
          {KEYS.map((k) => (
            <button
              key={k.label}
              type="button"
              aria-label={k.aria}
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => key(k.act)}
              className="h-10 min-w-10 shrink-0 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 font-mono text-[13px] text-white/80 active:bg-white/15"
            >
              {k.label}
            </button>
          ))}
          <button
            type="button"
            aria-label="Enter: run the command"
            onPointerDown={(e) => e.preventDefault()}
            onClick={submit}
            className="ml-auto flex h-10 min-w-12 shrink-0 items-center justify-center rounded-lg bg-[#c5ee8a] px-3 text-[#0a0a0a]"
          >
            <CornerDownLeft className="h-4 w-4" />
          </button>
        </div>
      </div>

      {props.suggest && props.suggest.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs text-ink-3">Try</span>
          {props.suggest.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                setInput(s);
                requestAnimationFrame(() => {
                  inputRef.current?.focus({ preventScroll: true });
                  inputRef.current?.setSelectionRange(s.length, s.length);
                });
              }}
              className="min-h-10 rounded-full border border-line bg-surface px-3.5 font-mono text-[12.5px] text-ink hover:border-[var(--line-strong)] hover:bg-surface-2"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {treeRoot && rows.length > 0 && (
        <div className="mt-3 rounded-xl border border-line bg-surface-2/60 px-3 py-2.5">
          <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-ink-3">
            <FolderTree className="h-3.5 w-3.5" aria-hidden /> Files, updated as you type commands
          </p>
          <TreeView rows={rows} rootLabel={displayPath(sh, treeRoot) === "~" ? `~ (${treeRoot})` : treeRoot} cwd={sh.cwd} marks={marks} dense />
        </div>
      )}

      {status === "revealed" && props.solution && props.solution.length > 0 && (
        <div className="mt-3 rounded-xl border border-line bg-surface p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-medium text-ink-3">One way to do it</p>
            <button type="button" className="btn btn-sm" onClick={runSolution} disabled={blocked}>
              <Play className="h-3 w-3" fill="currentColor" /> Run it
            </button>
          </div>
          <pre className="mt-2 overflow-x-auto font-mono text-[12.5px] leading-relaxed text-ink">
            {props.solution.map((s) => `$ ${s}`).join("\n")}
          </pre>
        </div>
      )}
    </div>
  );
}

export { checkTerminal };
