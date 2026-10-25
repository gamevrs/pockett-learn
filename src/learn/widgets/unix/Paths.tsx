"use client";

import React, { useMemo, useState } from "react";
import { ArrowRight, CircleAlert, File, Folder } from "lucide-react";
import type { WidgetProps } from "@/learn/widget";
import { createShell, displayPath, parentOf, type FileSpec, type Fs } from "./shell";
import { treeRows, TreeView, type RowMark } from "./Tree";

export interface PathsProps {
  /** The tree: { "~/photos/cat.jpg": "", "~/projects/": null, "/etc/hostname": "" }. Parents are added. */
  files?: FileSpec;
  user?: string;
  /** Where "you are" (relative paths start here). Default: home. */
  cwd?: string;
  /** Show a field to type a path into. Default true. */
  input?: boolean;
  /** Tap a file or folder to see its absolute and relative path. */
  explore?: boolean;
  /** Text already in the field. */
  start?: string;
  placeholder?: string;
}

export interface PathsState {
  input: string;
  /** Absolute path the input leads to, or null when it leads nowhere. */
  resolved: string | null;
  kind: "file" | "dir" | null;
  absolute: boolean;
  picked: string | null;
  home: string;
}

interface Step {
  seg: string;
  path: string;
  note: string;
}

/** Follow a typed path one piece at a time, the way the kernel does. */
function follow(fs: Fs, cwd: string, home: string, raw: string): { steps: Step[]; final: string | null; error: string | null } {
  const text = raw.trim();
  if (!text) return { steps: [], final: null, error: null };
  let cur: string;
  let rest: string;
  const steps: Step[] = [];
  if (text.startsWith("/")) {
    cur = "/";
    rest = text.slice(1);
    steps.push({ seg: "/", path: "/", note: "start at the root" });
  } else if (text === "~" || text.startsWith("~/")) {
    cur = home;
    rest = text.slice(2);
    steps.push({ seg: "~", path: home, note: "start at home" });
  } else {
    cur = cwd;
    rest = text;
    steps.push({ seg: "", path: cwd, note: "start where you are" });
  }
  for (const seg of rest.split("/").filter(Boolean)) {
    const here = fs[cur];
    if (here?.kind !== "dir") return { steps, final: null, error: `${displayName(cur)} is a file, so there is nothing inside it` };
    if (seg === ".") {
      steps.push({ seg, path: cur, note: "stay here" });
      continue;
    }
    if (seg === "..") {
      cur = parentOf(cur);
      steps.push({ seg, path: cur, note: "up one level" });
      continue;
    }
    const next = cur === "/" ? "/" + seg : `${cur}/${seg}`;
    if (!fs[next]) return { steps, final: null, error: `there is no “${seg}” in ${cur}` };
    cur = next;
    steps.push({ seg, path: cur, note: fs[cur].kind === "dir" ? "into the folder" : "the file" });
  }
  return { steps, final: cur, error: null };
}

const displayName = (p: string) => (p === "/" ? "/" : p.slice(p.lastIndexOf("/") + 1));

/** Shortest relative path from one directory to a target. */
function relative(from: string, to: string): string {
  const a = from.split("/").filter(Boolean);
  const b = to.split("/").filter(Boolean);
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  const up = a.slice(i).map(() => "..");
  const parts = [...up, ...b.slice(i)];
  return parts.length ? parts.join("/") : ".";
}

/** A folder tree you navigate by typing paths: each piece of the path lights up as it's followed. */
export function Paths({ props, onChange, status, goal }: WidgetProps<PathsProps>) {
  const { fs, home, cwd } = useMemo(() => {
    const sh = createShell({ files: props.files, user: props.user, cwd: props.cwd });
    // keep only what the lesson asked for (plus the folders above it), not the whole system
    const paths = Object.keys(props.files ?? {}).map((k) => (k.startsWith("~") ? sh.home + k.slice(1) : k.startsWith("/") ? k : `${sh.home}/${k}`).replace(/\/$/, ""));
    const anchors = [...paths, sh.home, sh.cwd];
    const small: Fs = {};
    for (const [p, e] of Object.entries(sh.fs)) {
      const kept = p === "/" || anchors.some((q) => q === p || q.startsWith(p + "/")) || paths.some((q) => p.startsWith(q + "/"));
      if (kept) small[p] = e;
    }
    return { fs: small, home: sh.home, cwd: sh.cwd };
  }, [props.files, props.user, props.cwd]);

  const [input, setInput] = useState(props.start ?? "");
  const [picked, setPicked] = useState<string | null>(null);
  const showInput = props.input ?? true;
  const res = follow(fs, cwd, home, input);

  const report = (nextInput: string, nextPicked: string | null) => {
    const r = follow(fs, cwd, home, nextInput);
    onChange?.({
      input: nextInput,
      resolved: r.final,
      kind: r.final ? fs[r.final].kind : null,
      absolute: nextInput.trim().startsWith("/"),
      picked: nextPicked,
      home,
    } satisfies PathsState);
  };

  // when the learner gives up, light up the goal's path
  const revealPath = status === "revealed" && typeof goal?.path === "string" ? goal.path.replace(/^~(?=\/|$)/, home) : null;

  const marks: Record<string, RowMark> = {};
  const steps: Record<string, number[]> = {};
  if (revealPath) marks[revealPath] = "target";
  else {
    res.steps.forEach((s, i) => {
      if (i > 0) (steps[s.path] ??= []).push(i);
      marks[s.path] = "trail";
    });
    if (res.final) marks[res.final] = "target";
  }
  const rows = treeRows(fs, "/", { hidden: true });

  return (
    <div className="w-full min-w-0">
      {showInput && (
        <div>
          <label className="flex items-center gap-2 rounded-xl border border-line bg-surface px-3 focus-within:border-[var(--brand)] focus-within:shadow-[0_0_0_3px_var(--brand-soft)]">
            <span className="shrink-0 text-xs font-medium text-ink-3">Path</span>
            <input
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                report(e.target.value, picked);
              }}
              placeholder={props.placeholder ?? "type a path, e.g. /home"}
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
              autoComplete="off"
              className="h-11 min-w-0 flex-1 bg-transparent font-mono text-[16px] text-ink outline-none placeholder:text-ink-3 sm:text-[14px]"
            />
          </label>
          <div className="mt-2 flex min-h-8 flex-wrap items-center gap-1 text-xs" aria-live="polite">
            {res.steps.map((s, i) => (
              <React.Fragment key={i}>
                {i > 0 && <ArrowRight className="h-3 w-3 shrink-0 text-ink-3" aria-hidden />}
                <span className="inline-flex items-center gap-1 rounded-full border border-line bg-surface px-2 py-0.5">
                  {i > 0 && <span className="grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[9.5px] font-semibold text-primary-ink">{i}</span>}
                  <span className="font-mono text-ink">{i === 0 ? displayPath({ home }, s.path) : s.seg}</span>
                  <span className="text-ink-3">{s.note}</span>
                </span>
              </React.Fragment>
            ))}
            {res.error && (
              <span className="inline-flex items-center gap-1 rounded-full border border-bad/30 bg-bad/10 px-2 py-0.5 text-bad">
                <CircleAlert className="h-3 w-3" aria-hidden /> {res.error}
              </span>
            )}
            {!input.trim() && <span className="text-ink-3">Start with / (the root), ~ (home), or a name in the folder you’re in.</span>}
          </div>
        </div>
      )}

      <div className="mt-2 rounded-xl border border-line bg-surface-2/60 p-2 sm:p-3">
        <TreeView
          rows={rows}
          rootLabel="/"
          cwd={cwd}
          home={home}
          marks={marks}
          steps={steps}
          picked={picked}
          onPick={
            props.explore
              ? (p) => {
                  setPicked(p);
                  report(input, p);
                }
              : undefined
          }
        />
      </div>

      {res.final && showInput && (
        <p className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-ink-3">Leads to</span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--brand)]/45 bg-tint px-2.5 py-1 font-mono text-[13px] text-ink">
            {fs[res.final].kind === "dir" ? <Folder className="h-3.5 w-3.5 text-brand" /> : <File className="h-3.5 w-3.5 text-ink-3" />}
            {res.final}
          </span>
          <span className="text-xs text-ink-3">({input.trim().startsWith("/") ? "absolute" : "relative"} path, a {fs[res.final].kind === "dir" ? "directory" : "file"})</span>
        </p>
      )}

      {props.explore && picked && (
        <div className="mt-3 grid gap-1.5 rounded-xl border border-line bg-surface p-3 text-sm sm:grid-cols-[auto_1fr] sm:gap-x-3">
          <span className="text-ink-3">Absolute path</span>
          <span className="font-mono text-ink [overflow-wrap:anywhere]">{picked}</span>
          <span className="text-ink-3">From where you are</span>
          <span className="font-mono text-ink [overflow-wrap:anywhere]">{relative(cwd, picked)}</span>
        </div>
      )}
      {props.explore && !picked && <p className="mt-3 text-center text-xs text-ink-3">Tap any file or folder to see its path.</p>}
    </div>
  );
}

/** goal: { path } (where the typed path must lead; ~ allowed), { absolute: true|false }, { uses: ".." }, { picked }. */
export function checkPaths(state: unknown, goal: Record<string, unknown>) {
  const s = state as PathsState | undefined;
  if (!s) return false;
  if (typeof goal.path === "string") {
    const want = goal.path.length > 1 ? goal.path.replace(/\/$/, "") : goal.path;
    if (!s.resolved || s.resolved !== want.replace(/^~(?=\/|$)/, s.home)) return false;
  }
  if (typeof goal.absolute === "boolean" && s.absolute !== goal.absolute) return false;
  if (typeof goal.uses === "string" && !s.input.includes(goal.uses)) return false;
  if (typeof goal.avoid === "string" && s.input.includes(goal.avoid)) return false;
  if (typeof goal.picked === "string" && s.picked !== goal.picked) return false;
  return ["path", "absolute", "uses", "picked"].some((k) => k in goal);
}
